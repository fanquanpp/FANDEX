---
order: 280
title: 分区裁剪与分区连接
module: 'postgresql'
category: 数据库
difficulty: advanced
description: PostgreSQL分区裁剪与分区连接：计划时/运行时裁剪、初始裁剪、partitionwise join与聚合
author: fanquanpp
updated: '2026-09-12'
related:
  - 'postgresql/250-QueryOptimization'
  - 'postgresql/270-PartitionedTable'
  - 'postgresql/240-IndexQueryOptimization'
  - 'postgresql/260-ParallelQuery'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
  - 'postgresql/270-PartitionedTable'
---

## 1. 为什么分区表"快"取决于裁剪

分区表本身并不让查询变快——把 100 个分区全扫一遍与扫描一张大表
差不多，甚至因计划更复杂而更慢。分区表的价值在于：**查询只碰
真正包含目标数据的少数分区**，这个"跳过无关分区"的过程叫
分区裁剪（Partition Pruning，也叫分区消除）。

类比：一本按年份分册的百科全书，查 2019 年的事件只需抽出
"2019 卷"——前提是你得先从书名判断出该抽哪一卷；如果查询条件
藏在书页中间（比如函数包着分区列），图书管理员就只能翻遍所有分册。

```sql
-- 本篇示例沿用此表: 按月范围分区的订单表
CREATE TABLE orders (
    id           BIGSERIAL,
    user_id      BIGINT,
    order_date   DATE NOT NULL,
    amount       NUMERIC(10,2)
) PARTITION BY RANGE (order_date);

CREATE TABLE orders_2026_01 PARTITION OF orders
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE orders_2026_02 PARTITION OF orders
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE orders_2026_03 PARTITION OF orders
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE orders_2026_04 PARTITION OF orders
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
```

## 2. 分区裁剪的三个时机

### 2.1 计划时裁剪（Plan-time Pruning）

条件是常量或稳定表达式，规划器在生成计划阶段就能确定要扫哪些分区：

```sql
EXPLAIN SELECT * FROM orders WHERE order_date = '2026-02-10';
--                        QUERY PLAN
-- ------------------------------------------------------------------
--  Seq Scan on orders_2026_02  (cost=0.00..35.50 rows=2 width=40)
--    Filter: (order_date = '2026-02-10'::date)
-- 注意: 计划里直接只出现 orders_2026_02 一个分区, 其他分区完全不存在
```

范围条件同理：

```sql
EXPLAIN SELECT * FROM orders
WHERE order_date >= '2026-02-01' AND order_date < '2026-04-01';
-- Append
--   -> Seq Scan on orders_2026_02
--   -> Seq Scan on orders_2026_03     <-- 只扫 2、3 月两个分区
```

### 2.2 运行时裁剪（Runtime / Executor-time Pruning）

条件是参数（PREPARE、prepared statement、参数化视图等）时，
计划阶段不知道值，执行时用实际参数裁剪。此时计划会列出所有分区，
再在执行时逐个标记"删除"：

```sql
PREPARE get_orders(DATE) AS
  SELECT * FROM orders WHERE order_date = $1;

EXPLAIN EXECUTE get_orders('2026-03-15');
--                        QUERY PLAN
-- ------------------------------------------------------------------
--  Append (actual rows=3 loops=1)
--    Subplans Removed: 3          <-- 关键指标: 3 个分区被运行时裁剪掉
--    ->  Seq Scan on orders_2026_01 (never executed)
--    ->  Seq Scan on orders_2026_02 (never executed)
--    ->  Seq Scan on orders_2026_03 (actual rows=3 loops=1)
--    ->  Seq Scan on orders_2026_04 (never executed)
-- (never executed) 表示该分支被裁剪, 一次都没跑
```

### 2.3 初始裁剪（Initial Pruning）

并行查询等场景下，执行器在初始化 Gather 节点前就完成一轮裁剪，
避免把无关分区的计划结构发给 Worker。

## 3. 裁剪失效的常见原因

```sql
-- 1. 对分区列套函数: 无法推断落在哪个区间
EXPLAIN SELECT * FROM orders WHERE EXTRACT(YEAR FROM order_date) = 2026;
-- Append
--   -> Seq Scan on orders_2026_01 ...（全部四个分区都要扫, 裁剪失效）

-- 修正: 改写成对分区列直接比较的范围条件
WHERE order_date >= '2026-01-01' AND order_date < '2027-01-01'

-- 2. 跨类型比较（列是 date, 传入 text 未转换）

-- 3. 对分区列使用不稳定表达式: now() 本身是 stable, 计划时裁剪会退化为
--    运行时裁剪（仍有效）; 但 now() + 任意函数可能让两者都失效

-- 4. 隐式类型不匹配: date 列与 timestamp 比较, 确认发生的是范围推理而非全扫
```

核查清单：任何对分区表的慢查询，第一步都看 EXPLAIN 里
**出现了几个分区**、有没有 `Subplans Removed`，再谈索引。

## 4. 分区连接（Partitionwise Join）

两张表都按**相同的键、兼容的边界**分区，且按分区键连接时，
优化器可以把连接"下放"到逐对分区进行——每对分区各自连接，
再拼接结果。好处是内存占用小（每对的哈希表只装本分区数据）、
可并行性好。

```sql
-- 前提: 订单与支付按同样的 order_date 分区, 并按日期关联
SET enable_partitionwise_join = on;   -- 默认 off

EXPLAIN
SELECT o.id, p.paid_amount
FROM orders o JOIN payments p ON o.order_date = p.order_date AND o.id = p.order_id;
--                        QUERY PLAN
-- ------------------------------------------------------------------
--  Append
--    ->  Hash Join
--          ->  Seq Scan on orders_2026_01 o
--          ->  Hash
--                ->  Seq Scan on payments_2026_01 p   <-- 一月配一月
--    ->  Hash Join
--          ->  Seq Scan on orders_2026_02 o
--          ...
-- 每个月份的分区对单独连接, 而不是先 Append 全表再连接
```

要点与限制：

- 两侧分区键必须与连接条件完全对应（同样的表达式、同样的边界划分），
  一个是 RANGE 按月、另一个 RANGE 按季，就无法逐对配平。
- `enable_partitionwise_join` 默认关闭：逐分区计划意味着计划数成倍增长，
  小分区很多时规划耗时可能得不偿失。

## 5. 分区聚合（Partitionwise Aggregate）

```sql
SET enable_partitionwise_aggregate = on;   -- 默认 off

EXPLAIN
SELECT date_trunc('month', order_date) AS m, sum(amount)
FROM orders GROUP BY 1;
--                        QUERY PLAN
-- ------------------------------------------------------------------
--  Finalize GroupAggregate
--    ->  Gather
--          ->  Partial GroupAggregate         <-- 各分区先局部聚合
--                ->  Sort
--                      ->  Seq Scan on orders_2026_01
--                      ...
-- 当分组键天然落在分区内（按月分组 x 按月分区）时,
-- 每个分区的局部聚合结果就是最终答案, 合并阶段几乎零成本
```

## 6. 实战场景与陷阱

```sql
-- 场景: 报表系统按天查询, 但应用传参是 ISO 周字符串
-- 反例: WHERE to_char(order_date, 'IW') = '07'   -- 裁剪失效, 全分区扫描
-- 正例: 应用层换算成日期范围
WHERE order_date >= date '2026-02-16' AND order_date < date '2026-02-23'

-- 陷阱1: 分区过多（数千个）且没有裁剪条件 -> 计划时间暴涨数秒
--   对策: 分区粒度与查询谓词对齐; PG 17 起 default 分区路由等开销已优化,
--   但"先想清楚查询模式再选分区键"仍是第一原则

-- 陷阱2: 用 DETACH CONCURRENTLY 摘分区后忘记清理旧分区索引

-- 陷阱3: 以为有了分区就不需要索引: 裁剪把扫描范围从 12 个月缩到 1 个月,
--   但单分区内部仍需要普通索引
```

## 小结

- 初学者要点：分区表的价值靠裁剪兑现；WHERE 条件里直接写分区列
  （裸列比较、常量或参数），不要套函数；EXPLAIN 中分区越少越快，
  `Subplans Removed` 是运行时裁剪生效的标志。
- 进阶注意：partitionwise join/aggregate 要求两侧分区方案严格对齐且
  默认关闭，适合大表对大表的等值/范围连接；裁剪失效排查顺序是
  先看计划里的分区列表，再检查谓词写法与类型；分区数量膨胀会让
  计划时间成为新的瓶颈。
