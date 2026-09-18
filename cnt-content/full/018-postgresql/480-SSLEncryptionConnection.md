---
order: 480
title: SSL/TLS 加密连接：从证书到强制加密
module: 'postgresql'
category: 数据库
difficulty: intermediate
description: PostgreSQL 传输加密完整落地：自签证书生成、服务端与客户端配置、pg_hba 强制策略、sslmode 六档语义与 cert 双向认证，含常见连接报错排查。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'postgresql/490-RoleBasedPermissionManagement'
  - 'postgresql/510-DataEncryptionStorage'
  - 'postgresql/500-RowLevelSecurity'
  - 'cs-fundamentals/330-HTTPSHandshake'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
  - 'cs-fundamentals/330-HTTPSHandshake'
---

## 前置知识

- PostgreSQL 基本安装与客户端连接（[安装与配置](/postgresql/010-OverviewInstallConfig)）；
- TLS 握手与证书链的工作原理（[HTTPS 握手](/cs-fundamentals/330-HTTPSHandshake)）——本篇不重复讲密码学，只讲 PostgreSQL 怎么用它们。

## 要解决的问题

数据库默认监听 TCP 后，所有查询、密码、业务数据都是**明文过网**。同一内网抓包即可看到一切，公网或跨机房链路更不可接受。传输层加密（SSL/TLS）解决的是**数据在网络上被窃听与篡改**的问题；注意它的边界——不解决"磁盘被拿走"（那是[存储加密](/postgresql/510-DataEncryptionStorage)）与"账号权限失控"（那是 RLS 与权限体系）的问题。

## 第一步：准备证书

生产环境应向企业 CA 或公有云证书服务签发服务器证书。自建实验环境可用 openssl 自签一张快速跑通：

```bash
# 自签 CA + 服务器证书（实验用；生产请走正规 CA 流程）
openssl req -new -x509 -days 365 -nodes -subj "/CN=test-ca" \
  -out root.crt -keyout root.key

openssl req -new -nodes -subj "/CN=db.example.com" \
  -keyout server.key -out server.csr

openssl x509 -req -days 365 -in server.csr \
  -CA root.crt -CAkey root.key -CAcreateserial -out server.crt

# 关键一步：私钥权限必须收紧，否则 PostgreSQL 直接拒绝启动
chmod 600 server.key
chown postgres:postgres server.key server.crt root.crt
```

`chmod 600 server.key` 不是可选项：PostgreSQL 对服务器私钥的权限检查极其严格，权限过宽是新手配置 SSL 失败的第一大原因。

## 第二步：服务端开启 SSL

```ini
# postgresql.conf
ssl = on
ssl_cert_file = '/etc/postgresql/server.crt'   # 服务器证书
ssl_key_file = '/etc/postgresql/server.key'    # 服务器私钥
ssl_ca_file = '/etc/postgresql/root.crt'       # 仅在需要验证客户端证书时配置
```

重启生效（`ssl` 是启动参数，不能只 reload），然后验证：

```sql
-- 已有连接的加密状态
SELECT usename, ssl, version, cipher FROM pg_stat_ssl WHERE pid = pg_backend_pid();
-- ssl = t 即加密生效
```

## 第三步：用 pg_hba.conf 控制加密策略

先纠正两个高频错误认识（原速查资料里就踩了）：

1. **pg_hba.conf 的注释符是 `#`，不是 SQL 的 `--`**——它是纯文本配置文件；
2. **密码认证方法 `md5` 已过时**：现代 PostgreSQL 默认 `scram-sha-256`（md5 挑战方式可被中间人降级，新部署一律用 scram）。

```conf
# pg_hba.conf —— 从上到下第一条命中生效，规则顺序即优先级

# 方案 A：允许加密与非加密并存（过渡期）
host    all  all  0.0.0.0/0  scram-sha-256
hostssl all  all  0.0.0.0/0  scram-sha-256   # 优先匹配加密连接

# 方案 B：强制加密（目标态）——只放行 hostssl，明文连接自然被拒
hostssl all  all  0.0.0.0/0  scram-sha-256

# 方案 C：双向认证（mTLS）——认证方法写 cert，客户端必须持有效证书
hostssl all  all  0.0.0.0/0  cert clientcert=verify-full
```

`hostssl` 关键字只匹配 SSL 连接；未加密连接找不到匹配行，直接被拒绝——这就是"强制加密"的实现方式，不需要额外开关。

## 第四步：客户端 sslmode 六档

| sslmode | 加密 | 验证证书 | 验证主机名 | 适用 |
| --- | --- | --- | --- | --- |
| `disable` | 否 | - | - | 本机 socket、隔离内网（谨慎） |
| `allow` | 尽量不 | 否 | 否 | 调试 |
| `prefer`（默认） | 尽量是 | 否 | 否 | 兜底，**不防中间人** |
| `require` | 是 | 否 | 否 | 加密但无身份验证，内网可接受 |
| `verify-ca` | 是 | 是 | 否 | 防窃听与假 CA |
| `verify-full` | 是 | 是 | 是 | 生产标准答案 |

关键认知：**`require` 挡住了被动窃听，但挡不住中间人**——攻击者可以出示自己的证书。公网链路一律 `verify-full`：

```bash
psql "host=db.example.com dbname=mydb user=alice \
  sslmode=verify-full sslrootcert=/etc/ssl/root.crt"
```

双向认证（服务端也验证客户端）时追加客户端证书参数：

```bash
psql "host=db.example.com dbname=mydb user=alice \
  sslmode=verify-full sslrootcert=root.crt \
  sslcert=client.crt sslkey=client.key"
```

应用连接串（如 Node.js 的 pg、Python 的 psycopg）都接受同名 sslmode 参数，语义一致。

## 动手环节：十分钟跑通加密连接

```bash
# 1. 生成证书（见第一步），放入数据目录并修正权限
# 2. postgresql.conf 打开 ssl = on 并重启
# 3. 明文连接确认 ssl 状态
psql -h 127.0.0.1 -U postgres -c \
  "SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid();"
# ssl = t（本机回环默认 prefer）

# 4. 改 pg_hba.conf 只留 hostssl 行，reload
#    pg_ctl reload 或 SELECT pg_reload_conf();

# 5. 验证明文被拒
psql "host=127.0.0.1 sslmode=disable" -U postgres
# 报错：no pg_hba.conf entry for ... SSL off —— 强制生效

# 6. 验证 verify-full 对假主机名的拦截
psql "host=127.0.0.1 sslmode=verify-full sslrootcert=root.crt" -U postgres
# 报错：certificate contains "db.example.com" ... name mismatch —— 防中间人生效
```

第 6 步的报错值得留着截图：它就是 `require` 与 `verify-full` 的本质差异在你面前的具象化。

## 常见报错速查

| 报错关键词 | 根因 | 处理 |
| --- | --- | --- |
| `server.key ... permission denied / group/world access` | 私钥权限过宽 | `chmod 600` + 属主 postgres |
| `no pg_hba.conf entry ... SSL off` | 强制加密策略已生效，客户端未加密 | 客户端改用 hostssl 可达的 sslmode |
| `certificate verify failed` | 证书链不完整或过期 | 检查 ssl_ca_file 与证书有效期 |
| `hostname mismatch` | 证书 CN/SAN 与连接 host 不符 | verify-full 下签发时写对 SAN，或换正确主机名连接 |

## 常见困惑

**"开了 SSL 性能掉多少？"**——连接建立阶段（握手）开销明显，长查询阶段影响很小。实战做法：应用侧用连接池（PgBouncer 等）复用长连接，握手成本摊薄到可忽略；跨机房高延迟链路的加密开销远小于其带来的安全价值。

**"本机连接需要 SSL 吗？"**——Unix domain socket 不走网络，天然无需加密；本机 TCP 回环同理。把强制策略限定在 `hostssl` 的远程网段即可。

**"和 pgcrypto 加密函数什么关系？"**——pgcrypto 是"字段级加密"（数据落盘前加密），本篇是"传输加密"（数据在网路上加密）。纵深防御里两者常同时启用，但解决的是不同环节的问题。

## 检验清单

- 能生成自签证书链并说清 server.key 权限要求；
- 会用 `hostssl` + `cert`/`scram-sha-256` 实现强制加密与双向认证，并纠正过 pg_hba 注释符与 md5 认证两个误区；
- 能默写 sslmode 六档表格，并解释 require 与 verify-full 的本质差异；
- 完整跑通"强制加密 + 明文被拒 + 假主机名被拦"三段实验。

## 下一步

传输加密之后是静态数据：进入[数据加密存储](/postgresql/510-DataEncryptionStorage)，覆盖磁盘级、字段级两层方案。
