---
order: 65
title: 集合操作
module: sql
category: SQL
difficulty: intermediate
description: SQL集合操作：UNION、INTERSECT、EXCEPT的语法、去重规则、排序限制与性能优化
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/递归CTE
  - sql/PIVOT与UNPIVOT
  - sql/数据控制语言
  - sql/事务控制语言
prerequisites:
  - sql/概述与标准
---

## 1. 集合操作概述

SQL 集合操作将多个查询的结果集合并为一个结果集，基于集合论中的并、交、差运算。

### 1.1 三种集合操作

| 操作 | 关键字            | 集合论对应 | 说明             |
| ---- | ----------------- | ---------- | ---------------- |
| 并集 | UNION / UNION ALL | $A \cup B$ | 合并两结果集     |
| 交集 | INTERSECT         | $A \cap B$ | 两结果集的公共行 |
| 差集 | EXCEPT / MINUS    | $A - B$    | 在A中不在B中的行 |

### 1.2 基本规则

- 两个查询的列数必须相同
- 对应列的数据类型必须兼容
- 结果集的列名由第一个查询决定

```sql
-- 列数必须匹配
SELECT id, name FROM table_a
UNION
SELECT id, name FROM table_b;  -- 正确

SELECT id, name FROM table_a
UNION
SELECT id FROM table_b;  -- 错误！列数不匹配
```

## 2. UNION

### 2.1 UNION vs UNION ALL

| 特性     | UNION              | UNION ALL      |
| -------- | ------------------ | -------------- |
| 去重     | 是                 | 否             |
| 性能     | 较慢（需排序去重） | 快（直接合并） |
| 结果保证 | 无重复行           | 可能有重复行   |

```sql
-- UNION：去重合并
SELECT city FROM customers
UNION
SELECT city FROM suppliers;
-- 每个城市只出现一次

-- UNION ALL：不去重合并
SELECT city FROM customers
UNION ALL
SELECT city FROM suppliers;
-- 同一城市可能出现多次
```

### 2.2 性能建议

```sql
-- 如果确定无重复或不需要去重，使用 UNION ALL
-- UNION 需要排序去重，等价于 UNION ALL + DISTINCT

-- 不需要去重时
SELECT 'customer' AS type, id, name FROM customers
UNION ALL
SELECT 'supplier' AS type, id, name FROM suppliers;

-- 需要去重时
SELECT product_id FROM inventory
UNION
SELECT product_id FROM backorder;
```

## 3. INTERSECT

### 3.1 基本用法

```sql
-- 交集：同时存在于两个结果集中的行
SELECT product_id FROM orders_2025
INTERSECT
SELECT product_id FROM orders_2026;
-- 两年都有订单的产品

-- INTERSECT ALL：保留重复行
SELECT product_id FROM orders_2025
INTERSECT ALL
SELECT product_id FROM orders_2026;
-- 如果某产品在两年各出现3次和2次，结果中出现2次（取较小值）
```

### 3.2 INTERSECT 的替代写法

```sql
-- MySQL 不支持 INTERSECT，使用 INNER JOIN 替代
SELECT DISTINCT a.product_id
FROM orders_2025 a
JOIN orders_2026 b ON a.product_id = b.product_id;

-- 使用 IN 子查询
SELECT DISTINCT product_id
FROM orders_2025
WHERE product_id IN (SELECT product_id FROM orders_2026);

-- 使用 EXISTS
SELECT DISTINCT a.product_id
FROM orders_2025 a
WHERE EXISTS (
    SELECT 1 FROM orders_2026 b WHERE b.product_id = a.product_id
);
```

## 4. EXCEPT

### 4.1 基本用法

```sql
-- 差集：在第一个结果集中但不在第二个结果集中的行
SELECT product_id FROM all_products
EXCEPT
SELECT product_id FROM discontinued_products;
-- 未停产的产品

-- EXCEPT ALL：保留重复计数
SELECT product_id FROM all_products
EXCEPT ALL
SELECT product_id FROM discontinued_products;
```

### 4.2 EXCEPT 的替代写法

```sql
-- MySQL 不支持 EXCEPT，使用 NOT EXISTS 替代
SELECT DISTINCT a.product_id
FROM all_products a
WHERE NOT EXISTS (
    SELECT 1 FROM discontinued_products b
    WHERE b.product_id = a.product_id
);

-- 使用 LEFT JOIN + IS NULL
SELECT DISTINCT a.product_id
FROM all_products a
LEFT JOIN discontinued_products b ON a.product_id = b.product_id
WHERE b.product_id IS NULL;

-- 使用 NOT IN（注意 NULL 陷阱）
SELECT DISTINCT product_id
FROM all_products
WHERE product_id NOT IN (
    SELECT product_id FROM discontinued_products
    WHERE product_id IS NOT NULL
);
```

### 4.3 EXCEPT 不对称性

```sql
-- EXCEPT 有方向性，A EXCEPT B ≠ B EXCEPT A
-- A EXCEPT B：在A中但不在B中
-- B EXCEPT A：在B中但不在A中

-- 对称差集（在A或B中但不同时在两者中）
(SELECT product_id FROM table_a
 EXCEPT
 SELECT product_id FROM table_b)
UNION ALL
(SELECT product_id FROM table_b
 EXCEPT
 SELECT product_id FROM table_a);
```

## 5. 集合操作的排序

### 5.1 ORDER BY 规则

```sql
-- ORDER BY 只能出现在最后一个查询之后
SELECT id, name FROM table_a
UNION ALL
SELECT id, name FROM table_b
ORDER BY id;  -- 对整个结果集排序

-- ORDER BY 作用于合并后的结果集
-- 列名/别名基于第一个查询

-- 错误：中间查询不能有 ORDER BY
SELECT id, name FROM table_a ORDER BY id  -- 错误！
UNION ALL
SELECT id, name FROM table_b;
```

### 5.2 为每个子查询排序

```sql
-- 使用括号和 LIMIT 实现子查询排序
(SELECT id, name FROM table_a ORDER BY id LIMIT 100)
UNION ALL
(SELECT id, name FROM table_b ORDER BY id LIMIT 100)
ORDER BY id;  -- 最终排序
```

## 6. 集合操作与 NULL

```sql
-- 集合操作中两个 NULL 被视为相同
SELECT NULL AS val
INTERSECT
SELECT NULL AS val;
-- 返回一行 NULL

-- 这与普通比较不同（NULL = NULL 为 UNKNOWN）
-- 集合操作使用 IS NOT DISTINCT FROM 语义
```

## 7. 性能优化

### 7.1 UNION ALL 优于 UNION

```sql
-- 优先使用 UNION ALL，除非确实需要去重
-- UNION 内部执行：UNION ALL + SORT UNIQUE

-- 不需要去重
SELECT * FROM logs_2026_01
UNION ALL
SELECT * FROM logs_2026_02;

-- 需要去重
SELECT DISTINCT user_id FROM logs_2026_01
UNION
SELECT DISTINCT user_id FROM logs_2026_02;
```

### 7.2 索引利用

```sql
-- 集合操作通常无法利用索引
-- 优化：将集合操作转为 JOIN
-- INTERSECT → INNER JOIN
-- EXCEPT → LEFT JOIN + IS NULL / NOT EXISTS
```

### 7.3 分区表优化

```sql
-- 按时间分区的表，UNION ALL 可利用分区裁剪
SELECT * FROM orders
WHERE order_date >= '2026-01-01' AND order_date < '2026-02-01'
UNION ALL
SELECT * FROM orders
WHERE order_date >= '2026-02-01' AND order_date < '2026-03-01';
```
