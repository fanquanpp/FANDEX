---
order: 460
title: 分区表
module: 'sql'
category: 数据库
difficulty: beginner
description: 分区策略（范围/列表/哈希）、分区裁剪、分区维护与跨方言差异——日志表从 5000 万行瘦身到每查必中的完整过程
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：SQL 性能 / 大表治理（表结构设计维度）。
- **解决什么问题**：日志、流水、订单这类只增不减的表过亿后：索引变大查询变慢、删旧数据一次 DELETE 锁表半小时、统计信息更新慢。分区把一张逻辑大表**切成多个物理小表**，查询、删除、维护都以分区为单位。
- **什么时候用到**：时序数据的按月滚动删除；报表只查近期数据；想把冷数据放慢盘热数据放快盘（分区级表空间）。
- **前置阅读**：[执行计划](/sql/430-ExecutionPlan)、[索引](/sql/420-Index)。

## 心智模型：一张门面，多个仓库

```text
应用看到的：orders（一张逻辑表，SQL 照常写）
实际存放的：orders_2024q1 / orders_2024q2 / orders_default（多个物理分区）
路由规则：  插入按分区键算出落在哪个分区；查询按 WHERE 条件"裁剪"无关分区
```

三个反直觉要点先立住：

1. **分区不是免费的索引**。查询带不上分区键，优化器只能扫**全部分区**——比不分区更糟（多了分区路由开销）。分区的第一前提是"查询几乎总带分区键"。
2. **分区键受主键约束**。MySQL 要求分区键必须是每个唯一键（含主键）的组成部分；PG 的主键必须包含分区键。设计前先想清楚分区键能不能进主键。
3. **分区解决的是"数据治理"，不是单行查找**。等值点查索引就够了；分区带来的质变是 DROP 一个分区秒删千万行、以及裁剪后的扫描量骤减。

## 场景一：日志表按月范围分区（PostgreSQL）

需求：access_logs 半年 5000 万行，日常只查最近 3 个月，每季度清理 13 个月前的数据。

```sql
CREATE TABLE access_logs (
    id         BIGINT GENERATED ALWAYS AS IDENTITY,
    user_id    INTEGER,
    action     TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (id, created_at)            -- 主键必须包含分区键
) PARTITION BY RANGE (created_at);

-- 按月建分区
CREATE TABLE access_logs_2026_08 PARTITION OF access_logs
  FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE access_logs_2026_09 PARTITION OF access_logs
  FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE access_logs_2026_10 PARTITION OF access_logs
  FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

-- 默认分区：分区键不落任何已建分区时兜底（避免插入报错）
CREATE TABLE access_logs_default PARTITION OF access_logs DEFAULT;
```

逐段讲解：

- `PARTITION BY RANGE (created_at)` 在建表时声明分区方式与键，此后不可改——想换分区键只能重建表，**分区键是表级终身决定**；
- 主键 `(id, created_at)`：PG 要求主键包含分区键，否则报错。这也意味着"id 全局唯一"不再由主键保证——用 IDENTITY 保证生成唯一、跨分区再核对，这是分区表最常见的设计妥协；
- `DEFAULT` 分区是安全网：漏建未来月份分区时数据落这里而不是报错。代价是它参与每次裁剪判断、且建新分区时要扫描它——折中做法是**定时任务预建未来 3 个月分区**（pg_partman 或自写 cron），DEFAULT 只接真正的异常数据。

滚动清理与写入：

```sql
-- 写入照常，路由自动
INSERT INTO access_logs (user_id, action, created_at) VALUES (1, 'login', now());

-- 删除 13 个月前的数据：秒级（对比 DELETE：千万行删半小时还膨胀）
DROP TABLE access_logs_2025_08;

-- 或归档：把整个分区摘下来搬去历史库，主表无感
ALTER TABLE access_logs DETACH PARTITION access_logs_2025_08;
```

## 场景二：订单表按年份分区（MySQL 语法差异）

MySQL 的分区在建表语句内联声明，且**必须用函数包裹分区键**（YEAR()、TO_DAYS() 等）：

```sql
CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT,
  order_date DATE NOT NULL,
  amount DECIMAL(10,2),
  PRIMARY KEY (id, order_date)     -- 分区键必须进主键
)
PARTITION BY RANGE (YEAR(order_date)) (
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p2026 VALUES LESS THAN (2027),
  PARTITION pmax VALUES LESS THAN MAXVALUE    -- MySQL 的兜底分区叫 MAXVALUE
);

-- 滚动维护：加新分区（注意 MAXVALUE 分区要先 REORGANIZE 才能插入更晚年份）
ALTER TABLE orders REORGANIZE PARTITION pmax INTO (
  PARTITION p2027 VALUES LESS THAN (2028),
  PARTITION pmax VALUES LESS THAN MAXVALUE
);
ALTER TABLE orders DROP PARTITION p2024;   -- 删旧数据，同样秒级
```

与 PG 的差异清单：

| 维度 | PostgreSQL | MySQL (InnoDB) |
| --- | --- | --- |
| 声明方式 | `PARTITION BY` 单独子句，分区用 `CREATE TABLE ... PARTITION OF` 逐个建 | 建表语句内联 `(PARTITION ...)` 一次列全 |
| 分区键处理 | 裸列 | 常需包函数（YEAR/TO_DAYS） |
| 兜底分区 | `DEFAULT` 分区 | `MAXVALUE` 边界 |
| 加分区 | 直接 CREATE PARTITION OF | 新分区边界必须大于现有最大，含 MAXVALUE 时先 REORGANIZE |
| 子分区 | 支持多级 | 支持（RANGE/HASH 子分区） |

## 场景三：哈希分区打散热点（列表分区一并讲）

没有自然时间键、只想把大表切小降低单表统计与维护压力时，用哈希：

```sql
-- PG：8 个哈希桶
CREATE TABLE sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY,
    user_id INT,
    token TEXT
) PARTITION BY HASH (user_id);
CREATE TABLE sessions_p0 PARTITION OF sessions FOR VALUES WITH (MODULUS 8, REMAINDER 0);
-- ... p1 ~ p7 同理
```

哈希分区的特点：数据分布均匀（好），但**范围查询彻底无法裁剪**（查"最近一周"仍要扫全部桶）——它只服务等值键查询与维护摊薄。选择口诀：**有时间维度用 RANGE，有离散枚举（地区、租户档位）用 LIST，只求打散用 HASH**。LIST 的形状：

```sql
CREATE TABLE users_by_region PARTITION BY LIST (region);
CREATE TABLE users_asia PARTITION OF users_by_region
  FOR VALUES IN ('China', 'Japan', 'Korea');
CREATE TABLE users_europe PARTITION OF users_by_region
  FOR VALUES IN ('UK', 'France', 'Germany');
```

## 分区裁剪：验证"真的变快了"

裁剪（Pruning）是优化器按 WHERE 条件跳过分区的行为。**必须用执行计划验证**，否则你以为在用分区、实际全分区扫：

```sql
-- PG：EXPLAIN 只列出命中的分区
EXPLAIN SELECT * FROM access_logs
WHERE created_at >= '2026-10-01' AND created_at < '2026-11-01';
-- 期望：只出现 access_logs_2026_10，其余分区不在计划里

-- MySQL：EXPLAIN 的 partitions 列显示将访问的分区
EXPLAIN SELECT * FROM orders WHERE order_date >= '2026-01-01';
-- partitions 列：p2026,pmax
```

裁剪失效的三个典型：

1. **条件里包函数**：`WHERE YEAR(order_date) = 2026`（MySQL 建分区用了 YEAR，但查询侧这样写仍可能失效——直接写范围条件 `order_date >= '2026-01-01' AND order_date < '2027-01-01'`）；
2. **跨分区运算**：条件引用了另一张表的列（JOIN 条件）而非常量/参数——PG 的运行时裁剪支持参数化预编译语句，但复杂 JOIN 谓词推不动；
3. **类型不匹配**：分区键是 DATE、条件传字符串比较发生隐式转换（见[数据类型](/sql/090-DataType)的隐式转换坑）。

## 分区维护与二级索引

- **分区上的索引**：PG 在父表 `CREATE INDEX` 会自动传播到每个分区（PG 11+）；MySQL 分区表的索引是"每个分区各一份本地索引"（没有全局索引），跨分区查询各分区索引各扫各的——这是 MySQL 分区在"全局唯一性 + 全局索引"上的著名短板，跨分区唯一约束只能靠把唯一列并进分区键。
- **统计信息**：每个分区独立收集，新分区刚建完记得 ANALYZE，否则优化器对它的行数瞎猜。
- **监控默认分区**：DEFAULT/MAXVALUE 分区行数持续增长说明滚动任务坏了，要加告警。

## 动手实践：把日志表分区化

任务：

1. 建 access_logs 三张月分区 + DEFAULT 分区（用本篇 PG 语法）；
2. 造 1 万行跨两个月的数据，EXPLAIN 验证"查 9 月"只扫 9 月分区；
3. 故意写入一条"2027 年"的数据，确认落进 DEFAULT；再建 2027 分区，观察 DEFAULT 里那条数据**不会自动迁移**（这就是 DEFAULT 分区的坑）；
4. 演练滚动删除：DETACH 最早分区，确认主表查询不再包含它。

<details>
<summary>参考实现（先自己写再展开）</summary>

```sql
-- 1（本篇场景一的 DDL 原样执行）

-- 2
INSERT INTO access_logs (user_id, action, created_at)
SELECT g % 100, 'view',
       TIMESTAMP '2026-09-15' + (g || ' hours')::interval
FROM generate_series(1, 5000) g;   -- 9 月
INSERT INTO access_logs (user_id, action, created_at)
SELECT g % 100, 'view',
       TIMESTAMP '2026-10-15' + (g || ' hours')::interval
FROM generate_series(1, 5000) g;   -- 10 月

EXPLAIN SELECT * FROM access_logs
WHERE created_at >= '2026-09-01' AND created_at < '2026-10-01';
-- 计划里只有 access_logs_2026_09

-- 3
INSERT INTO access_logs (user_id, action, created_at)
VALUES (1, 'future', '2027-05-01');              -- 落 access_logs_default
SELECT tableoid::regclass, count(*) FROM access_logs GROUP BY 1;
CREATE TABLE access_logs_2027_05 PARTITION OF access_logs
  FOR VALUES FROM ('2027-05-01') TO ('2027-06-01');
-- 报错：updated partition constraint ... would be violated —— 建分区前要先清走 DEFAULT 里的数据

-- 4
ALTER TABLE access_logs DETACH PARTITION access_logs_2026_09;
SELECT count(*) FROM access_logs
WHERE created_at >= '2026-09-01' AND created_at < '2026-10-01';   -- 0 行
```

判读要点：任务 3 的报错正是 DEFAULT 分区最疼的坑——**建新分区前必须先把 DEFAULT 里落在该范围的数据移走**，滚动任务要包含这一步。
</details>

## 检验清单

- 能说出分区的三个反直觉要点（不是索引、主键约束、治理而非点查）；
- 能为给定业务选对 RANGE/LIST/HASH 并说明理由；
- 会用 EXPLAIN 验证裁剪生效，并说出三个失效场景；
- 知道 PG 与 MySQL 在声明方式、函数包裹、兜底分区上的差异；
- 能完整演练"预建分区 - 写入 - 验证裁剪 - 滚动删除"闭环，并处理 DEFAULT 分区残留。

## 下一步

- [PG 分区裁剪与分区连接](/postgresql/280-PartitionPruningPartitionJoin)：PG 侧裁剪的三个时机与分区级 JOIN；
- [执行计划](/sql/430-ExecutionPlan)：看懂计划里的分区扫描节点；
- [索引](/sql/420-Index)：分区之内，索引依然是主力。

## 参考与致谢

- MySQL 8.0 官方文档 Partitioning（GPLv2 文档许可）：<https://dev.mysql.com/doc/refman/8.0/en/partitioning.html>
- PostgreSQL 官方文档 Chapter 5.11 Table Partitioning（PostgreSQL Licence）：<https://www.postgresql.org/docs/current/ddl-partitioning.html>
- 本篇 PG/MySQL 分区段落素材迁移自旧篇 440-PerformanceOptimization.md 并重写扩充。
