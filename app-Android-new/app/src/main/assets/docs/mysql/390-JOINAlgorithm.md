---
order: 390
title: JOIN 算法
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL JOIN算法：Nested Loop Join、Block Nested Loop、Hash Join的原理、适用场景与优化
author: fanquanpp
updated: '2026-09-12'
related:
  - 'mysql/370-DerivedTableOptimization'
  - 'mysql/380-GroupByOrderByOptimization'
  - 'mysql/420-TransactionIsolationImplementation'
  - 'mysql/430-MVCCPrinciple'
prerequisites:
  - 'mysql/160-View'
---

## 1. JOIN 算法概述

MySQL 支持多种 JOIN 算法，优化器根据表大小、索引和条件选择最优算法。

## 2. Nested Loop Join（NLJ）

### 2.1 原理

```
for each row in outer_table:
    for each row in inner_table:
        if match_condition:
            output combined row
```

```sql
-- 驱动表：departments，被驱动表：employees
SELECT * FROM departments d JOIN employees e ON d.id = e.dept_id;

-- 执行过程：
-- 1. 扫描 departments 表的每一行
-- 2. 对每行，使用 idx_employees_dept_id 索引查找 employees
-- 3. 如果有索引：Index Nested Loop Join
-- 4. 如果无索引：Block Nested Loop Join
```

### 2.2 Index Nested Loop Join

```sql
-- 被驱动表有索引时使用
-- 时间复杂度：O(M * log N)
-- M = 驱动表行数，N = 被驱动表行数

-- 确保 JOIN 列有索引
CREATE INDEX idx_employees_dept_id ON employees(dept_id);
```

## 3. Block Nested Loop Join（BNL，8.0.20 起已移除）

### 3.1 原理（历史机制）

```
1. 将驱动表的数据块读入 join_buffer
2. 扫描被驱动表，与 join_buffer 中的数据匹配
3. 减少被驱动表的扫描次数
```

> 注意：BNL 已在 MySQL 8.0.20 中彻底移除，无索引的等值连接由 Hash Join 接管，
> 非等值连接由带 join_buffer 的 Hash Join / 简单嵌套循环接管。以下内容仅用于
> 理解 8.0.20 之前版本的行为与 `join_buffer_size` 的作用。

```sql
-- 8.0.20 之前：被驱动表无索引时使用 BNL
-- join_buffer_size 控制缓冲区大小
SET join_buffer_size = 262144;  -- 256KB

-- EXPLAIN 中 Extra: Using join buffer (Block Nested Loop)
```

### 3.2 优化（同样适用于 Hash Join）

```sql
-- 8.0.20+：join_buffer_size 仍影响 Hash Join 与 BKA 的批处理大小
SET join_buffer_size = 8388608;  -- 8MB

-- 为 JOIN 列创建索引（转为 Index NLJ，仍是最优解）
CREATE INDEX idx_join_col ON table_name(join_col);

-- 小表做驱动表
-- 驱动表越小，join_buffer 效果越好
```

## 4. Hash Join

### 4.1 原理

MySQL 8.0.18 引入 Hash Join，替代无索引场景下的 BNL：

```
1. Build 阶段：扫描小表，构建哈希表
2. Probe 阶段：扫描大表，在哈希表中查找匹配
```

```sql
-- 等值连接无索引时自动使用
SELECT * FROM t1 JOIN t2 ON t1.col = t2.col;
-- Extra: Using join buffer (hash join)

-- Hash Join 优势：
-- 时间复杂度：O(M + N)，比 BNL 的 O(M * N) 好
-- 不需要索引
```

### 4.2 Hash Join 能力与限制

```sql
-- 8.0.18：仅支持等值连接（=, <=>）
-- 8.0.20 起：外连接、半连接、非等值连接也统一由 Hash Join 执行，
--            BNL 不再存在；非等值 Hash Join 退化为笛卡尔积式的分块比较
SELECT * FROM t1 JOIN t2 ON t1.col > t2.col;
-- Extra: Using join buffer (hash join)

-- 不支持索引的笛卡尔积（无 ON 条件）同样走 hash join 路径
```

## 5. JOIN 优化策略

```sql
-- 1. 确保 JOIN 列有索引
-- 2. 小表做驱动表
-- 3. 避免过多表连接（建议不超过5个）
-- 4. 使用 STRAIGHT_JOIN 控制连接顺序
SELECT /*+ STRAIGHT_JOIN */ *
FROM small_table s
JOIN large_table l ON s.id = l.small_id;

-- 5. 使用 BKA（Batched Key Access）
SET optimizer_switch = 'batched_key_access=on';
-- 将驱动表的行批量传递给被驱动表
```
## INNER JOIN 内连接

**换行写法：内连接查询**
`SELECT <列> FROM <表1> INNER JOIN <表2> ON <连接条件>;`
```sql
-- 查询用户及其订单
SELECT u.username, o.order_no, o.total_amount
FROM users u
INNER JOIN orders o ON u.id = o.user_id;
```

**换行写法：多表内连接**
`SELECT <列> FROM <表1> JOIN <表2> ON <条件> JOIN <表3> ON <条件>;`
```sql
-- 三表关联查询
SELECT u.username, o.order_no, p.product_name
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id;
```

**换行写法：使用 USING 简化连接**
`SELECT <列> FROM <表1> JOIN <表2> USING (<同名列>);`
```sql
-- 两表同名列时使用 USING
SELECT * FROM users JOIN user_profiles USING (user_id);
```

---

## LEFT JOIN 左连接

**换行写法：左连接查询**
`SELECT <列> FROM <表1> LEFT JOIN <表2> ON <连接条件>;`
```sql
-- 查询所有用户及其订单（含无订单用户）
SELECT u.username, o.order_no
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;
```

**换行写法：左连接筛选无匹配记录**
`SELECT <列> FROM <表1> LEFT JOIN <表2> ON <条件> WHERE <表2.列> IS NULL;`
```sql
-- 查询没有订单的用户
SELECT u.username
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.id IS NULL;
```

---

## RIGHT JOIN 右连接

**换行写法：右连接查询**
`SELECT <列> FROM <表1> RIGHT JOIN <表2> ON <连接条件>;`
```sql
-- 查询所有订单及其用户（含无用户订单）
SELECT u.username, o.order_no
FROM users u
RIGHT JOIN orders o ON u.id = o.user_id;
```

---

## CROSS JOIN 交叉连接

**单行写法：笛卡尔积**
`SELECT * FROM <表1> CROSS JOIN <表2>;`
```sql
-- 生成两表的笛卡尔积
SELECT * FROM colors CROSS JOIN sizes;
```

**单行写法：逗号连接等价写法**
`SELECT * FROM <表1>, <表2>;`
```sql
-- 逗号分隔等价于 CROSS JOIN
SELECT * FROM colors, sizes;
```

---

## 自连接

**换行写法：员工与上级自连接**
`SELECT <别名1.列>, <别名2.列> FROM <表> <别名1> JOIN <表> <别名2> ON <条件>;`
```sql
-- 查询员工姓名及其直接上级
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

**换行写法：同级分类自连接**
`SELECT <别名1.列>, <别名2.列> FROM <表> <别名1> JOIN <表> <别名2> ON <条件>;`
```sql
-- 查询分类及其父分类名称
SELECT c.name AS category, p.name AS parent
FROM categories c
LEFT JOIN categories p ON c.parent_id = p.id;
```

---

## 自然连接与 USING

**换行写法：NATURAL JOIN 自然连接**
`SELECT * FROM <表1> NATURAL JOIN <表2>;`
```sql
-- 自动按同名列连接
SELECT * FROM users NATURAL JOIN user_profiles;
```

---

## 复合条件连接

**换行写法：多条件连接**
`SELECT <列> FROM <表1> JOIN <表2> ON <条件1> AND <条件2>;`
```sql
-- 多条件关联
SELECT u.username, o.order_no
FROM users u
JOIN orders o ON u.id = o.user_id AND o.status = 1;
```

**换行写法：连接加过滤条件**
`SELECT <列> FROM <表1> JOIN <表2> ON <条件> WHERE <过滤条件>;`
```sql
-- 连接后再过滤
SELECT u.username, o.order_no
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.status = 1 AND o.created_at > '2024-01-01';
```

---

## 聚合与连接

**换行写法：连接加分组聚合**
`SELECT <列>, <聚合函数> FROM <表1> JOIN <表2> ON <条件> GROUP BY <列>;`
```sql
-- 查询每个用户的订单总数和总金额
SELECT u.username, COUNT(o.id) AS order_count, IFNULL(SUM(o.total_amount), 0) AS total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username;
```

**换行写法：连接加 HAVING 过滤**
`SELECT <列>, <聚合> FROM <表1> JOIN <表2> ON <条件> GROUP BY <列> HAVING <条件>;`
```sql
-- 查询订单金额超过 1000 的用户
SELECT u.username, SUM(o.total_amount) AS total
FROM users u
JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username
HAVING total > 1000;
```

---

## 8.0+ 高级连接特性

**换行写法：NOWAIT 不等待锁**
`SELECT * FROM <表1> JOIN <表2> ON <条件> FOR UPDATE NOWAIT;`
```sql
-- 行被锁时立即报错不等待
SELECT * FROM users u JOIN orders o ON u.id = o.user_id FOR UPDATE NOWAIT;
```

**换行写法：SKIP LOCKED 跳过锁定行**
`SELECT * FROM <表1> JOIN <表2> ON <条件> FOR UPDATE SKIP LOCKED;`
```sql
-- 跳过被其他事务锁定的行
SELECT * FROM users u JOIN orders o ON u.id = o.user_id FOR UPDATE SKIP LOCKED;
```

**换行写法：LATERAL 派生表（8.0.14+）**
`SELECT * FROM <表1>, LATERAL (SELECT * FROM <表2> WHERE <条件> LIMIT <数量>) <别名>;`
```sql
-- 关联派生表查询每个用户最近 3 笔订单
SELECT u.username, o.order_no
FROM users u,
LATERAL (
  SELECT order_no, total_amount
  FROM orders
  WHERE user_id = u.id
  ORDER BY created_at DESC
  LIMIT 3
) o;
```
