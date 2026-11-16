---
order: 750
title: 数据加密：InnoDB TDE 与密钥管理
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL 静态数据加密：keyring 插件体系、表空间加密实操、redo/undo 与 binlog 的加密盲区、主密钥轮换、与 PostgreSQL TDE 现状的对照。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'mysql/710-SSLEncryption'
  - 'mysql/730-FirewallPlugin'
  - 'mysql/490-Binlog'
  - 'mysql/690-AccountPermissionManagement'
prerequisites:
  - 'mysql/710-SSLEncryption'
  - 'mysql/410-InnoDBSystemArchitecture'
---

## 前置知识

- 传输加密的边界（[SSL/TLS 加密连接](/mysql/710-SSLEncryption)）——本篇补"数据落盘之后"这层防线；
- InnoDB 存储结构（表空间/redo/undo 的关系，见 [InnoDB 体系结构](/mysql/410-InnoDBSystemArchitecture)）——TDE 加密的对象就是这些文件。

## 威胁模型：防"搬硬盘"，不防"有账号"

磁盘上有四类敏感文件：数据表空间（.ibd）、redo/undo 日志、binlog、备份文件。任何一种被物理带走（退役硬盘流入二手市场、备份 U 盘丢失、云盘快照被复制），数据即泄露。**静态加密（TDE，透明数据加密）**在 I/O 层对页数据自动加解密，对 SQL 层完全透明——数据库账号看到的数据不受影响。

与传输篇同样的边界声明：TDE 防的是"拿到文件的人"，防不了"拿到数据库账号的人"（那需要权限治理与防火墙，以及字段级加密，PostgreSQL 篇的[三层防线模型](/postgresql/510-DataEncryptionStorage)完全适用于 MySQL）。

## 第一步：keyring 密钥插件（TDE 的地基）

InnoDB TDE 采用两级密钥：**主加密密钥**（master key，存放在 keyring 插件管理的外部密钥库）加密各表空间密钥，表空间密钥再加密数据页——密钥与数据分离是安全架构的第一原则。

```ini
# my.cnf —— keyring 插件必须最早加载（early-plugin-load，不能用 INSTALL PLUGIN 方式）
[mysqld]
early-plugin-load = keyring_file.so
keyring_file_data = /var/lib/mysql-keyring/keyring
```

```sql
-- 确认插件已就位
SELECT PLUGIN_NAME, PLUGIN_STATUS FROM information_schema.PLUGINS
WHERE PLUGIN_NAME LIKE 'keyring%';
-- keyring_file  ACTIVE
```

keyring 实现的选型阶梯（由弱到强）：

| 实现 | 密钥存哪 | 定位 |
| --- | --- | --- |
| `keyring_file` | 本机普通文件 | 开发/测试——**密钥与数据同机，只防"顺走文件"不防"搬走整机"** |
| `keyring_encrypted_file` | 本机加密文件 | 小步增强，口令仍需离机保管 |
| `keyring_okv` | Oracle Key Vault | 企业级密钥管理平台 |
| `keyring_aws` / 云 KMS 系列 | AWS KMS/云 KMS | 云上标准答案，密钥永不落地 |

生产铁律：**密钥库与数据库分离部署**。keyring_file 的密钥文件和数据目录放在同一块盘上，等于把家门钥匙挂在门上——它存在的意义只是让开发环境能跑通 TDE 语法。

## 第二步：加密表空间

```sql
-- 新表直接声明加密
CREATE TABLE patients (
  id BIGINT PRIMARY KEY,
  id_card VARCHAR(20),
  diagnosis VARCHAR(200)
) ENCRYPTION = 'Y';

-- 存量表改造（在线 DDL，8.0 INPLACE 执行）
ALTER TABLE patients ENCRYPTION = 'Y';

-- 整个通用表空间加密（一揽子管住里面的所有表）
CREATE TABLESPACE secure_ts ADD DATAFILE 'secure_ts.ibd' ENCRYPTION = 'Y';
ALTER TABLE patients ENGINE=InnoDB, ALGORITHM=COPY TABLESPACE secure_ts;
```

验证加密真的落盘：直接翻文件应看不到明文——

```bash
# 找到表空间文件抽查明文特征（应在文件中搜不到敏感字符串）
strings /var/lib/mysql/mydb/patients.ibd | grep -c "张三"   # 0
```

## 第三步：堵住日志的加密盲区

表空间加密后，**redo/undo 与 binlog 里仍躺着明文数据**（每次修改都先写日志）——只加密表空间等于锁了大门开着侧门：

```sql
-- 加密 redo/undo（8.0.16 起支持；注意：REDO 加密变更需重启部分场景）
SET GLOBAL innodb_redo_log_encrypt = ON;
SET GLOBAL innodb_undo_log_encrypt = ON;
```

**binlog 是更隐蔽的盲区**：截至 8.4，社区版 binlog 原生加密仍不可用（binlog 加密属 MySQL 企业版能力），而 binlog 恰恰完整记录了每一行变更。务实对策：binlog 所在磁盘与备份产物纳入磁盘级加密（LUKS/云盘加密），或接受"binlog 保留期内同机保管"的风险评估结论——**加密方案设计必须画出"数据文件全景图"，逐个文件标注加密状态**，这是本篇最重要的方法论。

## 第四步：主密钥轮换

```sql
-- 轮换主加密密钥（旧表空间密钥用新主密钥重新加密，数据无需重写，秒级）
ALTER INSTANCE ROTATE INNODB MASTER KEY;
```

轮换的工程意义：怀疑密钥泄露、合规周期（季度/年度）到期、DBA 离职等场景下，轮换让"曾经接触过密钥的人"失效。因为轮换只重加密各表空间的表空间密钥（页数据不动），代价极低——**建议固化为季度例行操作**，而不是事故后的临场发挥。

## 动手环节：十分钟跑通 TDE 全链路

```sql
-- 1. 确认 keyring（见上文 early-plugin-load 配置后）
SELECT PLUGIN_NAME, PLUGIN_STATUS FROM information_schema.PLUGINS
WHERE PLUGIN_NAME LIKE 'keyring%';

-- 2. 加密表 + 写入敏感数据
CREATE TABLE tde_demo (id INT PRIMARY KEY, secret VARCHAR(100)) ENCRYPTION = 'Y';
INSERT INTO tde_demo VALUES (1, 'TOP-SECRET-DATA');

-- 3. SQL 层一切如常（透明性验证）
SELECT * FROM tde_demo;   -- 明文可见——TDE 只管落盘，不管权限

-- 4. 文件层验证（shell 中执行）
-- strings /var/lib/mysql/mydb/tde_demo.ibd | grep TOP-SECRET
-- 输出为空：磁盘上是密文，SQL 层才解密

-- 5. 密钥轮换演练
ALTER INSTANCE ROTATE INNODB MASTER KEY;
SELECT * FROM tde_demo;   -- 轮换后读取如常（表空间密钥已用新主密钥重裹）
```

第 3 步与第 4 步的对照是 TDE 的灵魂：**同一份数据，账号视角明文、磁盘视角密文**——理解了这一点，就理解了它防谁不防谁。

## 常见困惑

**"TDE 性能损失多少？"**——官方与社区基准大致在个位数百分比（加解密走 AES-NI 硬件指令），IO 密集型负载更接近"可忽略"。相较泄露事故的代价，这是安全投资里性价比最高的一档；真正要评估的是 keyring 服务的可用性——它不可用，数据库重启都过不了，务必高可用部署。

**"和 PostgreSQL 比呢？"**——PostgreSQL 社区版至今没有官方 TDE（靠文件系统/云盘加密补位，见 [PG 数据加密](/postgresql/510-DataEncryptionStorage)）；MySQL 的表空间级 TDE 是社区版自带能力，但 binlog 加锁在企业版。两家各有盲区，全景图方法论比"谁更安全"的口舌之争有用。

**"字段也要加密吗？"**——分层回答：防搬硬盘，TDE 足够；防 DBA/注入者偷看特定列（身份证、卡号），TDE 无能为力（账号视角明文），需要应用层字段加密或 proxy 层改写——与 PG 篇的 pgcrypto 思路一致。

## 教学自检（先遮住代码自己写，再对照）

遮码自检法：先只读题干，自己写/自己答，再展开参考答案对照。

1. 概念自问：TDE 的两级密钥架构是什么？"主密钥轮换为什么是秒级"？

参考答案（先自己答，再对照）：表空间密钥（每个表空间一个，加密页数据）被主密钥加密后存在表空间头里；keyring 组件保管主密钥，主密钥不落盘。轮换主密钥只是"用新主密钥重新加密各表空间密钥"——每表空间一个头的改写，不涉及页数据重加密，所以秒级完成。真正的数据加密/解密发生在每次页读写时（内存里也是页级明文 + 密钥派生）。

2. 概念自问："TDE 防搬硬盘、不防有账号"——SQL 层验证这条边界的实验怎么做？

参考答案（先自己写，再对照）：加密表创建后两个视角对照：文件层用 `hexdump`/`strings` 直接看 .ibd 文件——看不到明文数据（密文）；SQL 层 `SELECT * FROM 加密表`——完整明文（服务进程内解密后返回）。结论：TDE 防的是"绕过服务进程拿走文件"（备份盘、旧硬盘、文件拷贝），拥有 SQL 权限的账号（含被注入的应用）看到的全是明文——列级敏感数据要应用层加密，这是两层不同的威胁模型。

3. 判断题：给表空间开了 TDE，磁盘上的数据就全部加密了。

参考答案（先自己答，再对照）：没有。redo/undo 表空间要单独开启加密（8.0.16+），binlog 加密是企业版能力（截至 8.4 社区版不可用），备份产物、慢日志、general log 也在明文世界——任何一条漏掉，攻击者从日志就能读出数据。方法论：画"数据文件全景图"，逐个文件标注加密状态，再谈"已加密"。

4. 概念自问：keyring 插件选型的阶梯是什么？丢了 keyring 数据会怎样？

参考答案（先自己答，再对照）：社区版 keyring_file（本地文件，最基础）→ 企业/云上的 keyring_okv/KMS 系（外部密钥管理）。阶梯的实质是"密钥与数据分离的物理距离"——file 插件与数据同机，搬走硬盘连密钥一起搬走，防护打折。keyring 数据丢失 = 主密钥丢失 = 所有加密表空间永久不可读——keyring 的备份与数据备份同等重要，这是启用 TDE 前就要设计好的一环。

## 检验清单

- 能说出两级密钥架构（主密钥/表空间密钥）与 keyring 选型阶梯；
- 完成加密表创建、SQL 层明文与文件层密文的对照验证；
- 能画出数据文件全景图并指出 redo/undo/binlog 三个加密盲区及对策；
- 会执行主密钥轮换并理解它为什么是秒级的；
- 能向别人解释"TDE 防搬硬盘、不防有账号"的边界。

## 下一步

加密管"偷看"，下一道防线管"越权操作"：进入[防火墙插件](/mysql/730-FirewallPlugin)，看 MySQL 如何用白名单拦截异常 SQL 与注入攻击。
