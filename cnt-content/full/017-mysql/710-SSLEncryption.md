---
order: 710
title: SSL/TLS 加密连接：证书到强制加密
module: 'mysql'
category: 数据库
difficulty: intermediate
description: MySQL 传输加密完整落地：自动生成证书机制、ssl-mode 六档语义、账号级 REQUIRE 强制、性能验证方法，与 PostgreSQL 同类方案的对照。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mysql/690-AccountPermissionManagement'
  - 'mysql/720-DataEncryption'
  - 'mysql/730-FirewallPlugin'
  - 'postgresql/480-SSLEncryptionConnection'
prerequisites:
  - 'mysql/690-AccountPermissionManagement'
  - 'cs-fundamentals/330-HTTPSHandshake'
---

## 前置知识

- TLS 握手与证书链原理（[HTTPS 握手](/cs-fundamentals/330-HTTPSHandshake)）；
- MySQL 账号体系（[账号与权限管理](/mysql/690-AccountPermissionManagement)）——MySQL 的加密策略是**账号级**的，与权限体系天然交织。

## 威胁模型：为什么默认连接不可接受

MySQL 默认 TCP 连接**明文传输**：查询语句、结果集、乃至认证握手后的数据全部裸奔，同网段抓包即可尽收眼底。传输加密解决"路上被窃听/篡改"，它的边界同样要刻清——不解决"磁盘被拿走"（[数据加密](/mysql/720-DataEncryption)）与"账号被盗用"（权限与防火墙）。

好消息：**MySQL 8.0 起服务器首次启动会自动生成一套自签证书**（存于数据目录 `*.pem` 文件），客户端默认 `ssl-mode=PREFERRED`——多数新装环境其实已经在加密。但"自动生成 + PREFERRED"只是及格线：自签证书不防中间人，PREFERRED 允许降级。生产要求的是**可信证书 + 强制加密 + 身份校验**。

## 服务端配置

```ini
# my.cnf —— 手动指定证书（向企业 CA 或云证书服务签发后）
[mysqld]
ssl-ca   = /etc/mysql/ssl/ca.pem           # CA 证书（验证客户端证书时必需）
ssl-cert = /etc/mysql/ssl/server-cert.pem
ssl-key  = /etc/mysql/ssl/server-key.pem
require_secure_transport = ON              # 服务器级强制：拒绝一切非加密连接
```

三条要点：

1. **私钥权限**：`server-key.pem` 必须仅 mysql 用户可读（chmod 600/400），权限过宽 mysqld 直接拒绝启动——与 PostgreSQL 的同名脾气一致；
2. `require_secure_transport = ON` 是**全局兜底开关**，开启后所有非加密连接一律拒绝（含本机 TCP；Unix socket 不受影响）；
3. 自动生成的自签证书可用于内网加密，但 `VERIFY_*` 级别的身份校验需要可信 CA——两者解决的是不同问题。

## 账号级强制：REQUIRE 子句

MySQL 的独门设计是**把加密要求做进账号定义**，实现"同一台服务器，不同账号不同强度"：

```sql
-- 必须加密（但不校验证书）
CREATE USER 'app_rw'@'%' IDENTIFIED BY '***' REQUIRE SSL;

-- 必须加密且持有效客户端证书（双向认证 mTLS）
CREATE USER 'dba_console'@'%' IDENTIFIED BY '***' REQUIRE X509;

-- 更细的组合：指定证书subject/issuer
CREATE USER 'svc'@'10.0.%' IDENTIFIED BY '***'
  REQUIRE SUBJECT '/CN=svc-pod' AND ISSUER '/CN=Corp-CA';

-- 收紧已有账号
ALTER USER 'legacy_user'@'%' REQUIRE SSL;
```

`REQUIRE SSL` 与全局 `require_secure_transport` 的关系是"且"的关系：账号要求叠加在服务器策略之上。运维常用姿势：全局开关先不开，逐账号上 REQUIRE，全部迁移完成后再打开全局兜底——灰度而不一刀切。

## 客户端 ssl-mode 六档

与 PostgreSQL 的 sslmode 几乎一一对应，语义通用（[PostgreSQL 同类篇](/postgresql/480-SSLEncryptionConnection)可交叉印证）：

| --ssl-mode | 加密 | 校验 CA | 校验主机名 | 生产定位 |
| --- | --- | --- | --- | --- |
| DISABLED | 否 | - | - | 本机调试 |
| PREFERRED（默认） | 尽量 | 否 | 否 | 兜底，不防中间人 |
| REQUIRED | 是 | 否 | 否 | 内网可接受的最低线 |
| VERIFY_CA | 是 | 是 | 否 | 防假 CA |
| VERIFY_IDENTITY | 是 | 是 | 是 | 公网标准答案 |
| （REQUIRE X509 账号） | 是 + 双向 | 是 | 由账号定义 | 高敏账号 |

```bash
# 客户端连接与双向认证
mysql -h db.prod -u app_rw -p --ssl-mode=VERIFY_IDENTITY --ssl-ca=ca.pem

mysql -h db.prod -u dba_console -p \
  --ssl-mode=VERIFY_IDENTITY --ssl-ca=ca.pem \
  --ssl-cert=client-cert.pem --ssl-key=client-key.pem
```

应用连接串（JDBC 的 `sslMode=`、各语言驱动）语义相同。JDBC 还有一个高频坑：旧版本默认 `sslMode=PREFERRED` 且不校验证书，安全审计必查项——显式写 `sslMode=VERIFY_IDENTITY&tlsVersions=TLSv1.2,TLSv1.3`。

## 验证：加密是否真的在工作

```sql
-- 当前会话的加密状态（\s 的 SQL 版）
SHOW SESSION STATUS LIKE 'Ssl_cipher';
-- Ssl_cipher = TLS_AES_256_GCM_SHA384 即加密生效；空值 = 明文！

-- 全实例连接的加密分布
SELECT thread_id, user, host,
       connection_type          -- SSL/TCP 表示加密，TCP 表示明文
FROM performance_schema.threads
WHERE processlist_user IS NOT NULL;
```

`connection_type` 列是审计利器：一行 SQL 找出所有明文连接的来源主机，逐个治理。

## 动手环节：五分钟完成强制加密改造

```sql
-- 1. 查看当前证书与加密支持
SHOW VARIABLES LIKE 'have_ssl';         -- YES（8.0 起 have_ssl 被 have_openssl 取代视角，用下一条更通用）
SHOW STATUS LIKE 'Ssl_cipher';          -- 当前会话是否加密

-- 2. 建一个强制加密的实验账号
CREATE USER 'sec_test'@'%' IDENTIFIED BY 'Test123!' REQUIRE SSL;

-- 3. 明文连接被拒（关键验证）
-- mysql -h 127.0.0.1 -u sec_test -p --ssl-mode=DISABLED
-- 报错：Connections using insecure transport are prohibited

-- 4. 加密连接成功，并验证密码也是加密传输的
-- mysql -h 127.0.0.1 -u sec_test -p --ssl-mode=REQUIRED
SHOW SESSION STATUS LIKE 'Ssl_cipher';

-- 5. （可选）打开全局兜底后复测任意账号的明文连接
SET GLOBAL require_secure_transport = ON;
```

第 3 步的报错值得记录：这就是"账号级强制"生效的直接证据——同一台服务器，没 REQUIRE 的账号明文照进，sec_test 被拒。

## 常见困惑

**"开启 SSL 性能损失多大？"**——握手开销集中在建连阶段，长连接 + 连接池摊薄后可忽略；TLS 1.3 进一步把握手压到一次往返。真正的性能敏感点是超短连接高频场景（每查询一连接），那是连接池该解决的问题，不是拒绝加密的理由。

**"8.4 版本有什么变化要注意？"**——`sha256_password/auto_generate_certs` 等旧选项持续收敛，认证默认 `caching_sha2_password`（其完整认证本身依赖加密通道或 RSA 交换）。从 5.7 升级过来的老应用遇到"认证失败"先检查驱动版本与 ssl-mode——8.x 系列的认证与加密机制联动更紧。

**"和 [PostgreSQL 的 SSL](/postgresql/480-SSLEncryptionConnection) 学哪个？"**——概念完全互通（证书、CA、六档 sslmode、强制策略、mTLS），差异只在配置载体：PostgreSQL 用 pg_hba.conf 行级策略，MySQL 用账号级 REQUIRE 子句。学透一个，另一个是翻译题。

## 检验清单

- 能说出自动生成证书的机制与"及格线"（PREFERRED）的不足；
- 会用 REQUIRE SSL / REQUIRE X509 做账号级灰度强制，并理解与全局开关的叠加关系；
- 默写 ssl-mode 六档表，说清 REQUIRED 与 VERIFY_IDENTITY 的本质差异；
- 用 Ssl_cipher 与 performance_schema.threads 验证过加密生效与明文连接治理；
- 完成强制加密改造实验并记录那条拒绝报错。

## 下一步

传输加密之后是落盘加密：进入[数据加密](/mysql/720-DataEncryption)，覆盖 InnoDB TDE 表空间加密与密钥管理。
