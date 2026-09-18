---
order: 510
title: 数据加密存储：磁盘级与字段级的两层防线
module: 'postgresql'
category: 数据库
difficulty: advanced
description: 静态数据加密的两层方案：文件系统与磁盘级加密（LUKS/云盘加密/TDE 现状）、pgcrypto 字段级加密实战、密钥管理原则与"加密了为什么还被脱库"的反思。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'postgresql/480-SSLEncryptionConnection'
  - 'postgresql/490-RoleBasedPermissionManagement'
  - 'postgresql/500-RowLevelSecurity'
  - 'cybersecurity/020-SecurityModelFramework'
prerequisites:
  - 'postgresql/480-SSLEncryptionConnection'
  - 'postgresql/490-RoleBasedPermissionManagement'
---

## 前置知识

- 传输加密的边界（[SSL/TLS 加密连接](/postgresql/480-SSLEncryptionConnection)）——本篇解决的是"数据落盘之后"的问题；
- 权限体系基础（[角色与权限管理](/postgresql/490-RoleBasedPermissionManagement)）。

## 威胁模型先行：加密防的是谁

静态数据加密（encryption at rest）的威胁模型要刻清楚，否则容易做成"心理安慰工程"：

- **能防**：磁盘或备份文件被物理拿走（机房硬盘退役、备份介质丢失、虚拟机磁盘文件被复制）；
- **不能防**：拿到了数据库账号的攻击者——数据在 SQL 层是明文可见的（除非做字段级加密，本篇第二节）。

所以完整的防线是三层叠加：**传输加密**（防路上被偷）→ **磁盘加密**（防盘被偷）→ **字段级加密与权限**（防进来的人偷）。本篇讲后两层。

## 第一层：磁盘级加密（透明加密）

原理：在文件系统/块设备层整盘加密，PostgreSQL 完全无感知，读写时由内核或存储层自动加解密。三种落地方式：

```bash
# 方式一：LUKS 块设备加密（自建机房标准做法）
cryptsetup luksFormat /dev/sdb1          # 初始化加密分区
cryptsetup luksOpen /dev/sdb1 pgdata     # 解锁挂载
mkfs.ext4 /dev/mapper/pgdata
# 数据目录放在解密后的卷上，数据库行为零改动

# 方式二：云盘加密（云上默认选项）
# 阿里云/AWS 等创建云盘时勾选加密（KMS 托管密钥），
# 性能损耗通常在个位数百分比，是云上的最低成本方案
```

方式三是内核级的 TDE（透明数据加密）。现状要点：**PostgreSQL 社区版至今没有官方 TDE**，这是它与企业版数据库（Oracle、SQL Server）的著名差距之一；生态里靠"挂载层加密（如上两种）+ 外部密钥管理"组合补位，或选用提供 TDE 的商业发行版。

磁盘级加密的关键不在加密算法，而在**密钥管理**：

1. 解密密钥不能与密文放同一台机器（LUKS 的密钥文件放独立介质或人工输入）；
2. 云上使用 KMS 时配置密钥轮换与最小权限（谁能调 KMS 解密接口，比加密算法本身更值得审查）；
3. 备份介质同步考虑：加密盘上的数据备份到别处时，备份链路也要加密（`pg_basebackup` 落盘加密或备份存储侧加密）。

## 第二层：pgcrypto 字段级加密

身份证号、银行卡号、医疗信息这类"高敏字段"，即使磁盘加密也不够——DBA、SQL 注入者拿到账号就能 `SELECT` 看到明文。字段级加密把密文直接存进列里，**只有持有密钥的调用方能在 SQL 层还原**。

```sql
-- 启用扩展
CREATE EXTENSION pgcrypto;

-- 建表：敏感列存密文（bytea）
CREATE TABLE patients (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  id_card_enc bytea NOT NULL        -- 身份证号，密文存储
);

-- 写入：pgp_sym_encrypt（对称加密，带口令）
INSERT INTO patients (name, id_card_enc) VALUES
  ('张三', pgp_sym_encrypt('110101199001011234', current_setting('app.enc_key')));

-- 读取：解密
SELECT name,
       pgp_sym_decrypt(id_card_enc, current_setting('app.enc_key')) AS id_card
FROM patients WHERE id = 1;
```

密钥传递用 `current_setting('app.enc_key')` 意味着密钥由应用通过连接参数注入（`options='-c app.enc_key=xxx'`），不出现在 SQL 文本与日志里——**密钥永远不该写死在 SQL、代码仓库或数据库配置文件中**。

`pgp_sym_encrypt` 内部是 PGP 标准实现（口令派生密钥 + 会话密钥加密数据），比裸调 `encrypt`（固定密钥直接加密）安全得多——同一明文每次加密产生不同密文，`WHERE` 等值匹配需要加密后比较或引入确定性派生（详见常见困惑）。

### 加密列的代价清单（动手前必读）

字段级加密不是免费的，逐条确认再决定：

1. **索引与查询退化**：密文列无法直接走 B+ 树语义，`WHERE 解密(列) = 明文` 会让全表解密扫一遍；
2. **模糊匹配基本报废**：`LIKE '%xx%'` 在密文上无从谈起；
3. **应用复杂度**：ORM 层要挂加密/解密钩子，调试时肉眼看到的是乱码；
4. **密钥轮换工程**：换密钥意味着全表重加密，要设计版本标记列。

因此务实策略是**最小化加密面**：只加密确需防护的少数列，配合视图把解密逻辑收敛到一处：

```sql
-- 用视图收敛解密逻辑：授权角色查视图，普通角色只能看掩码
CREATE VIEW patients_masked AS
SELECT id, name, '***' AS id_card FROM patients;

CREATE VIEW patients_full AS
SELECT id, name, pgp_sym_decrypt(id_card_enc, current_setting('app.enc_key')) AS id_card
FROM patients;

GRANT SELECT ON patients_masked TO app_readonly;
GRANT SELECT ON patients_full TO app_sensitive;   -- 极小权限集
```

## 动手环节：体验两层防线

```bash
# 磁盘层（有虚拟机条件时）
# 1. 用 LUKS 加密一块盘并挂载数据目录，重启数据库验证无感知
# 2. 关键验证：把数据目录文件拷到未加密盘，无法读出任何可识别内容
#    strings /mnt/plain/base/16384/24600 | head   -- 输出全是乱码
```

```sql
-- 字段层（任何环境可跑）
CREATE EXTENSION pgcrypto;
CREATE TABLE enc_demo (id int, secret bytea);
INSERT INTO enc_demo VALUES (1, pgp_sym_encrypt('机密数据', 'key123'));

-- 同一明文两次加密结果不同（语义安全性的直观证据）
SELECT pgp_sym_encrypt('机密数据', 'key123') = pgp_sym_encrypt('机密数据', 'key123') AS same;
-- f —— 密文不同但都能正确解密

SELECT pgp_sym_decrypt(secret, 'key123') FROM enc_demo WHERE id = 1;  -- 明文
SELECT pgp_sym_decrypt(secret, 'wrong')  FROM enc_demo WHERE id = 1;  -- 报错：密钥错误
```

## 常见困惑

**"磁盘加密了，为什么还被脱库？"**——因为攻击者走的是 SQL 接口而非磁盘。磁盘加密防"搬硬盘"，防不了"有账号的坏人"。看到"数据库已加密还泄露"的新闻，先查泄露通道是不是应用层——这也说明字段级加密与权限治理不可省。

**"加密列怎么建索引查询？"**——三条路：查询前先解密再比对（小表可接受）；哈希辅助列（存 `hmac(id_card, key)` 并索引，支持等值、不支持模糊）；业务上改为存掩码列加独立索引字段。模糊搜索需求与字段加密天生冲突，架构阶段就要想清楚。

**"pgcrypto 的密钥放哪最安全？"**——演进路线：应用配置中心 → KMS 动态获取（推荐）→ HSM 硬件。原则是"密钥与密文分离、密钥可轮换、访问留痕"。把密钥存在数据库自己里等于把家门钥匙挂在门上。

## 检验清单

- 能说出三层防线（传输/磁盘/字段）各自的威胁模型与边界；
- 知道磁盘级加密的三种落地与 PostgreSQL 无官方 TDE 的现状；
- 用 pgcrypto 完成过"加密写入、解密读取、错误密钥报错、同明文不同密文"四个验证；
- 能列出字段级加密的四项代价，并说出"最小化加密面 + 视图收敛"的务实策略。

## 下一步

加密解决"偷看"，权限解决"越权"：继续[行级安全 RLS](/postgresql/500-RowLevelSecurity)，把"谁能看哪些行"交给数据库本身。
