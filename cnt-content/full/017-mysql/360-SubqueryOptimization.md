---
order: 360
title: 子查询优化：半连接与改写艺术
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL 子查询的优化器内幕：半连接四种策略、物化机制、IN 与 EXISTS 的真相、关联子查询的窗口函数与 JOIN 改写法。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mysql/370-DerivedTableOptimization'
  - 'mysql/380-GroupByOrderByOptimization'
  - 'mysql/390-JOINAlgorithm'
  - 'mysql/340-SlowQueryLog'
prerequisites:
  - 'mysql/150-AdvancedQueryMultiTableOperation'
  - 'mysql/320-EXPLAINDetailed'
---

## 前置知识

- 多表查询与子查询语法（[高级查询](/mysql/150-AdvancedQueryMultiTableOperation)）；
- 会读 EXPLAIN 的 select_type 与 Extra（[EXPLAIN 详解](/mysql/320-EXPLAINDetailed)）——本篇的结论都要靠它验证。

## 问题引入：一句"看起来没问题"的慢查询

```sql
SELECT * FROM orders
WHERE user_id IN (SELECT id FROM users WHERE vip = 1);
```

老一代 MySQL（5.5 时代）执行这句的方式令人窒息：对外层每一行订单，**重新执行一遍**子查询判断 user_id 在不在 VIP 列表里——订单表 100 万行就是 100 万次子查询。这正是"子查询慢"名声的来源。

MySQL 5.6 起引入**半连接（semi-join）优化**族，8.0 已高度成熟：优化器会把上面的语句改写成类似 JOIN 的执行方式。今天你需要的不再是"怕子查询"，而是**看懂优化器选了哪种策略、知道它什么时候失灵、失灵时怎么改写**。

## 半连接：四种策略

`IN` 子查询（只关心"存在与否"，不取子查询的值）在满足条件时会被转成半连接——"外表的行在内表有匹配就保留，且**每个外表行只保留一次**"。优化器从四种策略里选成本最低的：

| 策略 | 思路 | 适用 |
| --- | --- | --- |
| FirstMatch | 对外表每行，在内表找到第一个匹配就收工 | 内表匹配概率高 |
| LooseScan | 沿内表索引扫描并跳过重复值 | 内表连接列上有索引 |
| Materialize（物化） | 子查询结果去重后物化成临时表，再与外表连接 | 子查询结果集小 |
| DuplicateWeedout | 正常连接，用临时表记住已输出的外表行号去重 | 通用兜底 |

观察策略选择：

```sql
EXPLAIN FORMAT=JSON
SELECT * FROM orders
WHERE user_id IN (SELECT id FROM users WHERE vip = 1)\G
-- 在 JSON 输出里搜 semi-join / chosen=true，
-- 或直接看传统 EXPLAIN 的 Extra：FirstMatch / LooseScan / Materialize / Start temporary
```

半连接的生效前提（失灵场景）：子查询在外层 SELECT 列表或 OR 条件里、含 UNION、聚合、`GROUP BY/HAVING`、`LIMIT`——这些形态下优化器放弃改写，退回"逐行执行"老路。**写子查询时保持"简单 IN + 无杂质"的形态，就是给优化器让路。**

## IN 还是 EXISTS：别再背口诀了

老教程说"小表驱动用 IN、大表驱动用 EXISTS"——这条经验在 8.0 时代已经过时：

```sql
-- 写法一：IN
SELECT * FROM orders
WHERE user_id IN (SELECT id FROM users WHERE vip = 1);

-- 写法二：EXISTS（关联子查询）
SELECT * FROM orders o
WHERE EXISTS (SELECT 1 FROM users u
              WHERE u.id = o.user_id AND u.vip = 1);
```

8.0 优化器会把两种写法转换为**相同的半连接计划**（EXISTS 不满足半连接条件时才退化为关联执行）。所以口诀更新为：**优先写 IN 的简单形态，写完看 EXPLAIN 确认策略；两者计划一致时选可读性高的**。真正要避开的是第三种——

## 关联子查询：真正的性能黑洞

```sql
-- 慢：对每行员工执行一次 AVG 计算（select_type: DEPENDENT SUBQUERY）
SELECT * FROM employees e
WHERE salary > (SELECT AVG(salary) FROM employees
                WHERE dept_id = e.dept_id);
```

`WHERE` 里引用了外层列（`e.dept_id`）的子查询是**关联子查询**，半连接不适用（它要的不是"存在与否"而是具体值），MySQL 8.0.14 起虽能做"派生条件传递"等缓解，本质上仍是每行执行。**看到 select_type 出现 DEPENDENT SUBQUERY 就该动手改写**，两种姿势：

```sql
-- 改写一：窗口函数（8.0 首选，语义与原意完全一致）
SELECT * FROM (
  SELECT e.*, AVG(salary) OVER (PARTITION BY dept_id) AS dept_avg
  FROM employees e
) t
WHERE salary > dept_avg;

-- 改写二：派生表 JOIN（5.7 兼容）
SELECT e.*
FROM employees e
JOIN (SELECT dept_id, AVG(salary) AS avg_sal
      FROM employees GROUP BY dept_id) d
  ON e.dept_id = d.dept_id
WHERE e.salary > d.avg_sal;
```

两者都把"N 次聚合"压成"一次聚合"，复杂度从 O(N×M) 降到 O(N+M)。

## 动手环节：亲眼见证四种计划

```sql
-- 1. 造数据
CREATE TABLE users (id INT PRIMARY KEY, vip TINYINT);
CREATE TABLE orders (id INT PRIMARY KEY, user_id INT, amount DECIMAL(10,2),
  KEY idx_user (user_id));
INSERT INTO users SELECT n, n % 10 = 0 FROM (
  SELECT a.N + b.N*10 + c.N*100 n FROM
    (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
     UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
     UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
    (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
     UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
     UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b,
    (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
     UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
     UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) c) t;
INSERT INTO orders (id, user_id, amount)
SELECT n, n % 1000, n % 500 FROM
  (SELECT a.N + b.N*100 + c.N*10000 n FROM
    (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
     UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
     UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) a,
    (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
     UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
     UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) b,
    (SELECT 0 N UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
     UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
     UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) c) t;

-- 2. IN 子查询：观察半连接策略
EXPLAIN SELECT * FROM orders
WHERE user_id IN (SELECT id FROM users WHERE vip = 1);
-- 记录 select_type 与 Extra 里的策略名

-- 3. EXISTS 写法：对比计划是否一致
EXPLAIN SELECT * FROM orders o
WHERE EXISTS (SELECT 1 FROM users u
              WHERE u.id = o.user_id AND u.vip = 1);
-- 与第 2 步计划相同 → 口诀"选可读性"的实证

-- 4. 制造失灵：子查询加 LIMIT，半连接放弃
EXPLAIN SELECT * FROM orders
WHERE user_id IN (SELECT id FROM users WHERE vip = 1 LIMIT 100);
-- select_type 退化，观察 DEPENDENT 痕迹

-- 5. 关联子查询改写对比
EXPLAIN ANALYZE
SELECT count(*) FROM employees_dummy e   -- 可用 orders 表模拟：
WHERE amount > (SELECT AVG(amount) FROM orders o2 WHERE o2.user_id = e.user_id);
-- 与窗口函数改写版的 actual time 对比，差距通常是一个数量级
```

## 常见困惑

**"NOT IN 为什么经常出事？"**——两个独立深坑：子查询结果含 NULL 时 NOT IN 恒为空集（NULL 比较的三值逻辑）；大结果集下 NOT IN 走不了半连接（半连接只服务正向 IN），性能崩塌。规范：**否定存在性一律用 NOT EXISTS**，并保证关联列 NOT NULL。

**"物化临时表会进内存还是磁盘？"**——受 [临时表内存机制](/mysql/380-GroupByOrderByOptimization) 同源控制（内部临时表先内存后溢盘），物化子查询结果大时同样有溢盘代价，减小子查询 SELECT 列表（只选连接列）是立竿见影的瘦身法。

**"优化器提示能强制半连接吗？"**——可以：`SEMIJOIN`/`NO_SEMIJOIN` hint（如 `/*+ SEMIJOIN(@subq MATERIALIZATION) */`）按 query block 指定策略，属于与 [索引提示](/mysql/270-IndexHintForceIndex) 同级的最后手段，先看数据再动手。

## 检验清单

- 能说出半连接的语义（存在即保留且去重）与四种策略的思路；
- 知道五类让半连接失灵的子查询形态，并能在 EXPLAIN 里认出退化症状；
- 能用窗口函数或派生表 JOIN 改写关联子查询，并解释复杂度变化；
- 否定存在性场景条件反射使用 NOT EXISTS；
- 完成"IN vs EXISTS 计划一致性"与"LIMIT 失灵"两个验证实验。

## 下一步

子查询的另一大类藏在 FROM 里：进入 [派生表优化](/mysql/370-DerivedTableOptimization)，看 8.0 的合并与物化策略、LATERAL 的正确打开方式。
