---
order: 470
title: 查询重写与参数化
module: 'sql'
category: 数据库
difficulty: advanced
description: 单一主题：查询重写（SELECT *、子查询改 JOIN、深分页、EXISTS 替代 IN）、参数化查询与计划缓存、统计信息——先改写、再验证的闭环
author: fanquanpp
updated: '2026-10-07'
related:
  - 'sql/430-ExecutionPlan'
  - 'sql/435-SQLPartitionedTable'
  - 'sql/420-Index'
  - 'sql/460-SQLAntipattern'
prerequisites:
  - 'sql/430-ExecutionPlan'
---

## 知识点地图

- **知识类别**：SQL 性能 / 查询重写与执行侧配合（本篇只讲这一件事）。
- **解决什么问题**：同一条业务查询，写法不同性能差十倍——这不是玄学，是"优化器看得懂的形状"不同。本篇给出一套可复制的改写手法，以及验证改写是否生效的方法。
- **什么时候用到**：慢查询榜单上的语句排队等着改；接手"能跑但慢"的老系统；评审新人 SQL。
- **边界声明**：本篇是 2016 年旧版"性能优化大杂烩"的收窄重写。原篇中的其他主题已各自归位：执行计划解读见[执行计划](/sql/430-ExecutionPlan)；索引策略与失效场景见[索引](/sql/420-Index)；分区表见[分区表](/sql/435-SQLPartitionedTable)；物化视图见[视图与物化视图](/sql/115-SQLViews)；MySQL 服务端配置（缓冲池/连接数）见 [MySQL 性能调优](/mysql/850-MySQLConfigOps)；PG 服务端参数见[PG 系统架构](/postgresql/160-SystemArchitecture)。

## 心智模型：改写的三条原理

所有本篇手法都能归结到三条：

1. **让数据早点变少**：过滤、投影、去重越早发生，后续每一步越便宜；
2. **让优化器看得懂**：它不会优化"语义含糊"的写法（相关子查询、函数包裹的列）；
3. **让重复劳动可缓存**：同一形状的语句只解析/规划一次。

每条改写都按"假设 → 改写 → EXPLAIN 验证"闭环执行（验证方法见[执行计划](/sql/430-ExecutionPlan)）。

## 改写一：SELECT * 的真实代价

```sql
-- 反模式
SELECT * FROM users WHERE id = 1;
-- 问题清单：
-- 1. 网络与内存：拉回 30 列只用 3 列
-- 2. 覆盖索引失效：索引只含部分列，* 强制回表
-- 3. 脆弱性：表加列后，INSERT INTO t2 SELECT * 这类语句悄悄变型
-- 4. 视图与 ORM 的隐式契约：列序变化对依赖位置取值的代码是灾难

-- 改写
SELECT name, email FROM users WHERE id = 1;
```

例外：确实要全列且列数少的小表（配置表）、`EXISTS (SELECT 1 ...)` 里的投影无所谓。纪律是**默认列名，例外才 ***。

## 改写二：子查询与 JOIN 的互转

```sql
-- 相关子查询：外表每行执行一次内层
SELECT u.name,
  (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
FROM users u;

-- 改写：先聚合再连接（内层一次算完）
SELECT u.name, COALESCE(o.cnt, 0) AS order_count
FROM users u
LEFT JOIN (SELECT user_id, COUNT(*) AS cnt FROM orders GROUP BY user_id) o
  ON u.id = o.user_id;
```

两个方向都要会：老优化器（MySQL 5.x 时代）把 IN 子查询退化成相关执行时，改 JOIN 救命；现代优化器（MySQL 8.0 有子查询物化/半连接优化、PG 一直有）常常**自己**把两种写法优化成同一个计划——**改写前先 EXPLAIN 对比，别凭 2010 年的经验盲改**（版本差异的完整讨论见[执行计划](/sql/430-ExecutionPlan)与 MySQL 子查询优化专篇）。

半连接场景（只判断存在性）的选型细节在[半连接与反半连接](/sql/180-SemiAntiJoin)专篇，这里只记结论：NOT IN 一律换 NOT EXISTS（NULL 语义差异，见[子查询](/sql/190-Subquery)的 NULL 三值逻辑）。

## 改写三：深分页

```sql
-- 反模式：OFFSET 100 万 = 先扫完并丢掉 100 万行
SELECT * FROM orders ORDER BY id LIMIT 10 OFFSET 1000000;

-- 改写 A：游标分页（Keyset）——上一页末尾的 id 当书签
SELECT * FROM orders WHERE id > 1000000 ORDER BY id LIMIT 10;

-- 改写 B：无法用书签时，延迟关联——先在索引里翻页，再回表
SELECT o.* FROM orders o
JOIN (SELECT id FROM orders ORDER BY id LIMIT 10 OFFSET 1000000) t
  ON o.id = t.id;
```

原理对照：A 是 O(log n) 的索引定位，B 把"翻页"限制在窄索引上、回表只有 10 行。A 要求排序键单调且无洞（删除会导致跳行），B 通用但仍是 O(offset) 索引扫描——十万页以上还是要业务侧改成"下一页"交互。

## 改写四：UNION 的去重开销

```sql
-- UNION = 去重（内部排序/哈希），UNION ALL = 直接拼接
SELECT name FROM customers WHERE region = 'North'
UNION
SELECT name FROM suppliers WHERE region = 'North';

-- 两源本就无重复（customer 与 supplier 是不同表）时：
SELECT name FROM customers WHERE region = 'North'
UNION ALL
SELECT name FROM suppliers WHERE region = 'North';
```

判据一句话：**需要去重才用 UNION**；仅仅合并列表用 UNION ALL。去重的正确场景（同一表的两段查询可能重叠）里，UNION 的开销是买语义的钱。

## 改写五：EXISTS 替代 IN（大数据量）

```sql
-- IN 子查询可能物化整个结果集
SELECT * FROM orders
WHERE customer_id IN (SELECT id FROM customers WHERE vip = true);

-- EXISTS 短路：找到第一行匹配就停
SELECT * FROM orders o
WHERE EXISTS (SELECT 1 FROM customers c
              WHERE c.id = o.customer_id AND c.vip = true);
```

现代优化器多数会把两者优化成同一半连接计划，但物化版结果集巨大时（子查询返回百万行）EXISTS 的短路优势仍在。完整对比（包括谁该在谁该在外）见[半连接](/sql/180-SemiAntiJoin) §4。

## 改写六：批量写入替代逐条

```sql
-- 逐条 INSERT：每条一次网络往返 + 一次事务
INSERT INTO users (name, email) VALUES ('Alice', 'a@test.com');
INSERT INTO users (name, email) VALUES ('Bob', 'b@test.com');

-- 批量：一条语句完成
INSERT INTO users (name, email) VALUES
  ('Alice', 'a@test.com'),
  ('Bob', 'b@test.com');

-- UPSERT（避免先查后插的竞态）
-- MySQL：
INSERT INTO counters (id, cnt) VALUES (1, 1)
  ON DUPLICATE KEY UPDATE cnt = cnt + 1;
-- PostgreSQL：
INSERT INTO counters (id, cnt) VALUES (1, 1)
  ON CONFLICT (id) DO UPDATE SET cnt = counters.cnt + 1;
```

两种 UPSERT 方言的完整行为差异（冲突目标、RETURNING 支持）见[UPSERT 与 MERGE](/sql/310-UpsertAndMerge)；批量导入的进阶手法（LOAD DATA、COPY）见 [DML](/sql/120-DML)。

## 参数化查询：安全与性能一箭双雕

```sql
-- 拼接：SQL 注入 + 每次完整解析
-- cursor.execute(f"SELECT * FROM users WHERE name = '{user_name}'")   -- 危险

-- 参数化：值走通道、语句走缓存
cursor.execute("SELECT * FROM users WHERE name = %s", (user_name,))

-- 数据库侧的等价物（了解原理用，生产走驱动参数化）：
-- PostgreSQL 扩展协议 / PREPARE
PREPARE get_user(TEXT) AS SELECT * FROM users WHERE name = $1;
EXECUTE get_user('Alice');

-- MySQL
PREPARE stmt FROM 'SELECT * FROM users WHERE name = ?';
SET @name = 'Alice';
EXECUTE stmt USING @name;
DEALLOCATE PREPARE stmt;
```

三重收益：注入免疫（值永远不被解析成 SQL）、**计划缓存**（同形状语句只解析规划一次，高频接口的固定收益）、带宽（重复的只是参数）。与连接池的交互坑（事务级池化下 prepared statement 失效）见 [PG 连接池篇](/postgresql/165-ConnectionPoolingPgBouncer)。

## 缓存的层次：数据库不是缓存层

顺着参数化往上看一层——"让重复查询变快"还有两级：

- **MySQL 查询缓存（历史）**：`SELECT SQL_CACHE ...` 曾把"语句+结果"整体缓存，但任何一行变更就整表失效，高并发下锁竞争严重——**MySQL 8.0 已彻底移除**，旧资料里的 SQL_CACHE/`query_cache_*` 参数在新版本直接报错，见到即可确认资料过时；
- **应用层缓存**：不变的配置、热点读模型放 Redis/进程内缓存，缓存穿透/击穿/雪崩的完整治理见 [Redis 缓存策略](/redis/125-CachePatternsAndDbConsistency)；数据库侧的正确姿势是把"减少重复查询"留给上面两级，自己专心做好计划缓存与缓冲池。

## 统计信息：优化器的世界观

优化器不看数据看统计。统计过时，改写再好计划也错：

```sql
-- PostgreSQL：查看与手动刷新
SELECT attname, n_distinct, null_frac FROM pg_stats WHERE tablename = 'users';
ANALYZE users;                       -- 采样分析，不锁读写
ALTER TABLE users ALTER COLUMN email SET STATISTICS 500;   -- 倾斜列提高采样
ANALYZE users;

-- MySQL
ANALYZE TABLE users;
-- SQL Server
UPDATE STATISTICS users;

-- 行数估算 vs 精确行数
SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = 'users';  -- 瞬时
SELECT COUNT(*) FROM users;                                                  -- 精确但全扫
```

纪律：**大表批量导入/大删除之后 ANALYZE**；执行计划里估算行数与实际差一个量级，第一怀疑对象就是统计信息。深水区（代价参数、扩展统计、pg_stat_statements 巡检）见 [PG 查询优化](/postgresql/250-QueryOptimization)与 [PG 统计视图](/postgresql/255-MonitoringStatisticsViews)。

## 动手实践：一次可验证的改写闭环

任务：

1. 造 10 万行 orders，跑深分页 `LIMIT 10 OFFSET 90000` 记录耗时；
2. 改写为游标分页，复测；再用延迟关联改写 OFFSET 版，复测三者；
3. 故意给查询套上函数（`WHERE YEAR(order_date) = 2026`）观察索引失效，改回范围条件再验证；
4. 用参数化写法重跑同一条查询 100 次，对比拼接版（提示：应用脚本或两次 EXPLAIN ANALYZE 对比解析开销）。

<details>
<summary>参考实现（PostgreSQL，先自己写再展开）</summary>

```sql
-- 0. 造数
CREATE TABLE rw_orders AS
SELECT g AS id,
       (g % 500)::int AS customer_id,
       TIMESTAMP '2025-01-01' + (g || ' minutes')::interval AS order_date
FROM generate_series(1, 100000) g;

-- 1
EXPLAIN ANALYZE SELECT * FROM rw_orders ORDER BY id LIMIT 10 OFFSET 90000;
-- Offset 拖着全量排序走，万行级耗时毫秒，百万行级可见明显差距

-- 2
EXPLAIN ANALYZE SELECT * FROM rw_orders WHERE id > 90000 ORDER BY id LIMIT 10;
-- Index Only/Index Scan 直达，耗时骤降

-- 3
CREATE INDEX idx_rw_date ON rw_orders (order_date);
EXPLAIN SELECT * FROM rw_orders WHERE date_part('year', order_date) = 2026;
-- Seq Scan（函数包列，索引失效）
EXPLAIN SELECT * FROM rw_orders
WHERE order_date >= '2026-01-01' AND order_date < '2027-01-01';
-- Bitmap/Index Scan（范围条件走索引）
```

判读要点：三者耗时对比出来后，把结论写进你的团队 wiki——"深分页"不是一句口号，是三倍到百倍的实测差距。
</details>

## 检验清单

- 能说出 SELECT * 的四重代价与两个合法例外；
- 能解释子查询改 JOIN 的原理，并知道"先 EXPLAIN 再动手"的现代前提；
- 能对比游标分页与延迟关联的适用条件与缺陷；
- 知道 MySQL 查询缓存在 8.0 被移除、SQL_CACHE 见到即过时；
- 会做参数化并说出它与计划缓存、注入防护的关系；
- 能解释"批量导入/删除后要 ANALYZE"的原因。

## 下一步

- [执行计划](/sql/430-ExecutionPlan)：改写前后的验证工具；
- [SQL 反模式](/sql/460-SQLAntipattern)：本篇之外的写法黑名单；
- [分区表](/sql/435-SQLPartitionedTable)：单表改写救不了的大表治理。

## 参考与致谢

- MySQL 8.0 官方文档 Optimization（GPLv2 文档许可）：<https://dev.mysql.com/doc/refman/8.0/en/optimization.html>
- PostgreSQL 官方文档 Chapter 14 Performance Tips（PostgreSQL Licence）：<https://www.postgresql.org/docs/current/performance-tips.html>
- 本篇为旧版全景篇的收窄重写：原执行计划/索引/分区/物化视图/配置/慢查询各节已按文首"边界声明"迁移至对应专篇或判重归并，迁移明细见批次记录。
