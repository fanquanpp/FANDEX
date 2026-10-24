---
order: 110
title: 连接管理与 PgBouncer
module: 'postgresql'
category: 数据库
difficulty: beginner
description: 每连接一进程的代价、max_connections 与内存估算、pg_stat_activity 观察、PgBouncer 三种池化模式与事务级池化的坑
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：PostgreSQL 服务器管理 / 客户端连接（官方文档 Chapter 20 Client Connections 的运维延伸）。
- **解决什么问题**：应用报 `FATAL: sorry, too many clients already`、数据库内存吃紧、每秒新建连接拖垮 CPU——这些全是"连接"这个资源没管好。
- **什么时候用到**：微服务多实例部署、突发流量、K8s 弹性扩容把连接数翻倍时；调优 `max_connections` 之前；接入 PgBouncer 时。
- **前置阅读**：[系统架构](/postgresql/160-SystemArchitecture)（进程模型）。

## 心智模型：连接不是"免费"的

MySQL 的每个连接是一个线程（开销几百 KB）；PostgreSQL 的每个连接是一个**独立进程**，代价完全不同量级：

| 项 | 每连接成本（量级） | 说明 |
| --- | --- | --- |
| 进程内存 | 约 5-10 MB 起 | 本地内存区 + 各种缓存 |
| 元数据 | catalog 缓存、prepared statement 状态 | 每进程各自持一份 |
| 调度 | 活跃连接数 > CPU 核数后上下文切换开销陡增 | 数百活跃连接即恶化 |

由此得出两条硬结论：

1. **`max_connections` 不是越大越好**。它主要在估算内存上限：粗略公式 `shared_buffers + max_connections × work_mem × 平均每查询排序节点数` 要小于物理内存的 70% 左右。500 个连接 × 64MB work_mem 就是 32GB 的理论峰值——先算账再设值。
2. **大量"闲置但保持"的连接是应用架构病**。Web 应用里一个请求只用连接几毫秒，连接却整辈子挂着——池化就是为此而生。

## 工程场景：一次连接耗尽事故的完整复盘

某后台管理系统上线新版本后整站报 500，现象与处置过程值得整段记住：

```text
14:02  发布新版本（微服务从 4 实例扩到 12 实例，连接池 per-instance 上限 30 没改）
14:03  数据库连接数爬到 max_connections=300，新连接被拒
14:05  应用日志刷 FATAL: sorry, too many clients already；运维想登 psql 排查——连不上
14:06  用 postgres 保留超级用户从本机登录（superuser_reserved_connections=3 救命）
14:08  pg_stat_activity 显示 270 个连接 state=idle，application_name 指向新版本服务
14:10  临时把 max_connections 调到 500 重载配置，站恢复
14:30  把应用连接池上限改成 20、接入 PgBouncer，回滚 max_connections
```

事故里有两个知识点：**保留连接**（`superuser_reserved_connections` 默认 3，是留给管理员的应急通道）与**扩容时连接数的乘法效应**（实例数 × 每实例池上限直接顶到库的 max_connections）。事后修复是接入池化——下面展开。

## 观察工具：pg_stat_activity

连接诊断的第一张表：

```sql
-- 连接总览：按状态分组
SELECT state, COUNT(*) FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;
-- active=正在执行, idle=连接空闲(在池里等着), idle in transaction=开事务不干活(危险)
```

`idle in transaction` 是最需要盯的状态：事务开着不提交，锁不放、VACUUM 推进被阻塞（后果见[VACUUM 机制](/postgresql/210-VACUUMMechanism)）。揪出元凶：

```sql
SELECT pid, usename, application_name, client_addr,
       now() - xact_start AS xact_age,   -- 事务已开了多久
       left(query, 60) AS last_query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
ORDER BY xact_age DESC;

-- 兜底处置：超过 10 分钟的空闲事务直接断开（先沟通再动手）
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND now() - xact_start > interval '10 minutes';
```

逐段解释：`xact_start` 是事务开始时刻，`state` 变化不影响它——`idle in transaction` 的事务依然占着快照；`pg_terminate_backend(pid)` 等价于"踢人"，被踢端报 `FATAL: terminating connection`。更系统的防法是给库设参数：`ALTER DATABASE app SET idle_in_transaction_session_timeout = '5min';`

## 动手：PgBouncer 三种池化模式

PgBouncer 是轻量连接池（单进程、无查询解析、C 写成、内存占用 MB 级）。核心是 `pool_mode` 决定"一个真实数据库连接同时服务几个客户端连接"：

```ini
;; pgbouncer.ini 核心段
[databases]
appdb = host=127.0.0.1 port=5432 dbname=app

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
pool_mode = transaction        ; 本篇主角
max_client_conn = 1000         ; 对上的门面容量
default_pool_size = 25         ; 对下真实连接数（每 user/db 组合）
```

| 模式 | 真实连接的归还时机 | 容量放大 | 兼容性 |
| --- | --- | --- | --- |
| session | 客户端断开才归还 | 1:1，几乎无放大 | 全兼容 |
| transaction | **每个事务提交/回滚就归还** | 1:几十，主力模式 | 有兼容坑，见下 |
| statement | 每条语句执行完归还 | 最大 | 多语句事务直接不可用 |

容量账：`max_client_conn=1000` 对上，`default_pool_size=25` 对下——1000 个客户端连接共享 25 个真实 PG 进程，连接进程内存从 1000×8MB=8GB 变成 25×8MB=200MB，这就是池化的全部意义。

### 事务级池化的坑：这四样会"串味"

transaction 模式下，同一个客户端的事务 A 和事务 B 可能落在**不同的真实连接**上，因此凡"绑定在单个连接上"的特性都会失效：

1. **prepared statement（最重要的坑）**：`PREPARE`/扩展协议的命名预编译语句绑定在某个真实连接上，下一个事务换连接就报 `prepared statement "x" does not exist`。Java JDBC（`prepareThreshold>0` 默认开）、.NET Npgsql 默认都用它——接入池时必须二选一：PgBouncer 1.21+ 配 `max_prepared_statements`（池内模拟）、或驱动端关掉命名 prepared（JDBC `prepareThreshold=0`）。
2. **会话级 GUC**：`SET work_mem = '64MB'` 之后下个事务可能换连接，设置丢失。改用角色/数据库级持久设置（`ALTER ROLE ... SET`），或 PgBouncer 1.19+ 的跟踪功能。
3. **LISTEN/NOTIFY**：会话级注册，transaction 模式不可用，走 [LISTEN/NOTIFY](/postgresql/360-ListenNotify) 的系统要留 session 池。
4. **临时表、游标 WITH HOLD**：跨事务存活，同样失效。

兼容性检查有一条硬纪律：**切换 pool_mode 前把应用对这四样的使用盘一遍**，拿不准就先上 session 模式（只省内存不放大容量），跑稳再评估 transaction。

## 实战场景：三个不同形态的接入

**形态一：单体 Spring Boot**。连接池在应用内（HikariCP），实例少（1-3 个）时够用，池上限 = `max_connections ÷ 实例数 - 余量`。这时不需要 PgBouncer——多加一层反而多一跳。

**形态二：K8s 里 50 个微服务实例**。50 实例 × 池上限 10 = 500 连接顶满。接 PgBouncer：每实例池上限降到 5，PgBouncer `pool_mode=transaction`，对下 30 个真实连接足够——吞吐瓶颈会先出现在 CPU 而不是连接数。

**形态三：Serverless/短连接脚本**。每请求新建连接（如 Lambda），每秒数百次新建。PG 每次新建要 fork 进程 + 认证 + 建缓存（几十毫秒），CPU 被打满。PgBouncer 是这类场景的救命药：客户端的"新建连接"变成池里的快速分配。

## 常见困惑

**"PgBouncer 和 HAProxy 是竞争关系吗？"**——不是。PgBouncer 管"连接复用"，HAProxy 管"路由到当前主库"（见[高可用](/postgresql/472-HAFailoverPatroni)），生产链路里两个都在：客户端 → PgBouncer → HAProxy → PG。

**"为什么调大 max_connections 不解决慢？"**——连接多了每个分到的 CPU 时间片更碎，吞吐不升反降。感觉"连接不够"时先问：`pg_stat_activity` 里 active 有几个？如果 active 只有 8 个而连接数 300，缺的不是连接数，是池化后的小连接数。

**"池的大小设多少？"**——经典起点公式 `核数 × 2 + 磁盘数`，再压测调整。20 核机器 40 个活跃连接往往比 400 个吞吐更高。

## 动手实践：在 Docker 里把事故复现一遍

任务：

1. 起 PG 容器，把 `max_connections` 改为 10，写个循环脚本开 15 个 `\sleep` 会话，观察第 11 个的报错；
2. 用保留账号登录，跑本篇的 pg_stat_activity 诊断 SQL；
3. 起 PgBouncer 容器，`pool_mode=transaction`，用 psql 验证 `PREPARE` 在两个事务间的行为；
4. （进阶）JDBC/Npgsql 任选一个，复现 prepared statement 报错，再用 `max_prepared_statements` 修复。

<details>
<summary>参考操作（先自己跑再展开）</summary>

```bash
# 1. 起 10 连接上限的 PG
docker run -d --name pg-cap -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_MAX_CONNECTIONS=10 postgres:17
docker exec -it pg-cap psql -U postgres -c "SHOW max_connections;"   -- 10

# 循环占用（另开 12 个终端或用 tmux）
for i in $(seq 1 12); do
  docker exec pg-cap psql -U postgres -c "SELECT pg_sleep(120);" &
done
# FATAL: sorry, too many clients already   -- 第 11/12 个报错

# 2. 保留账号本机登录诊断
docker exec -it pg-cap psql -U postgres -c \
  "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"

# 3. PgBouncer
docker run -d --name pgb -p 6432:6432 edoburu/pgbouncer
# 容器内配置 pgbouncer.ini（pool_mode=transaction, 指向 pg-cap）
psql -h 127.0.0.1 -p 6432 -U postgres appdb
-- PREPARE stmt(int) AS SELECT $1;
-- BEGIN; EXECUTE stmt(1); COMMIT;
-- BEGIN; EXECUTE stmt(2); COMMIT;
-- 第二个事务报 ERROR: prepared statement "stmt" does not exist
```

判读要点：步骤 3 的报错正是生产事故的同款；补 `max_prepared_statements = 100` 重启后同一脚本应通过。
</details>

## 检验清单

- 能算出给定 `max_connections` 与 `work_mem` 下的内存理论上限；
- 能用 pg_stat_activity 区分 idle / idle in transaction 并给出处置；
- 能背出 PgBouncer 三种模式与 transaction 模式的四个失效特性；
- 知道 prepared statement 报错与 PgBouncer 版本的关系（1.21+ 可配 `max_prepared_statements`）；
- 能说清保留连接与"管理员被锁在门外"的应急路径。

## 下一步

- [系统架构](/postgresql/160-SystemArchitecture)：进程模型与共享内存的完整地图；
- [高可用与自动故障转移](/postgresql/472-HAFailoverPatroni)：PgBouncer 在 HA 链路里的位置；
- [运行监控与统计视图](/postgresql/255-MonitoringStatisticsViews)：把本篇的观察 SQL 纳入日常巡检。

## 参考与致谢

- PostgreSQL 官方文档 Chapter 20 Client Connections、Chapter 24 Monitoring Database Activity（PostgreSQL Licence）：<https://www.postgresql.org/docs/current/>
- PgBouncer 官方文档 features / config 章节（ISC License）：<https://www.pgbouncer.org/config.html>
- 工程场景改编自通用生产事故复盘模板，参数行为已对照 PgBouncer 1.21+ 文档。
