---
order: 440
title: SQL EXCEPT / INTERSECT 集合操作语法速查手册
module: 'sql'
category: 数据库
difficulty: beginner
description: SQL EXCEPT / INTERSECT 集合操作语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## 基本集合操作

**基本写法：UNION 并集**
`<查询1> UNION [ALL] <查询2>`
```sql
-- UNION 去重，UNION ALL 保留重复（更快）
SELECT name FROM teachers
UNION
SELECT name FROM students;

-- UNION ALL 不去重，性能更优
SELECT '2024' AS year, month, income FROM income_2024
UNION ALL
SELECT '2025' AS year, month, income FROM income_2025;
```

---

**基本写法：INTERSECT 交集**
`<查询1> INTERSECT [ALL] <查询2>`
```sql
-- 返回两个查询结果中都存在的行
-- 找出同时选修了数学和物理的学生
SELECT student_id FROM scores WHERE subject = '数学'
INTERSECT
SELECT student_id FROM scores WHERE subject = '物理';

-- INTERSECT ALL 保留重复行（SQL 标准，PostgreSQL 支持）
SELECT tag FROM article_tags WHERE article_id = 1
INTERSECT ALL
SELECT tag FROM article_tags WHERE article_id = 2;
```

---

**基本写法：EXCEPT 差集**
`<查询1> EXCEPT [ALL] <查询2>`
```sql
-- 返回在查询1中但不在查询2中的行
-- 找出未下单的用户
SELECT id FROM users
EXCEPT
SELECT user_id FROM orders;

-- MySQL 不支持 EXCEPT，用 NOT IN 或 LEFT JOIN 替代
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM orders);

-- LEFT JOIN 替代
SELECT u.id FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.user_id IS NULL;
```

---

## 三集合组合

**基本写法：链式集合操作**
`<查询1> UNION <查询2> UNION <查询3>`
```sql
-- 多个查询组合，注意优先级
SELECT '员工' AS type, name FROM employees
UNION
SELECT '客户' AS type, name FROM customers
UNION
SELECT '供应商' AS type, name FROM suppliers
ORDER BY type, name;
```

---

**基本写法：括号控制优先级**
`(<查询1> UNION <查询2>) INTERSECT <查询3>`
```sql
-- 括号改变执行顺序（PostgreSQL/Oracle 支持，MySQL 8.0+ 支持）
(SELECT city FROM customers WHERE country = 'US'
 UNION
 SELECT city FROM suppliers WHERE country = 'US')
INTERSECT
SELECT city FROM offices WHERE country = 'US';
```

---

## 集合操作规则

**基本写法：列数与类型对齐**
`SELECT <同数量同类型列> ... UNION ...`
```sql
-- 规则：列数相同、类型兼容、顺序对应
-- 第一个查询决定列名
SELECT product_id, product_name, 'active' AS status
FROM products WHERE active = 1
UNION
SELECT product_id, product_name, 'discontinued' AS status
FROM products WHERE active = 0
ORDER BY product_id;
```

---

## 集合操作与 NULL

**基本写法：NULL 处理**
`SELECT ... UNION ... -- NULL 被视为相等`
```sql
-- 集合操作中 NULL 视为相等（与 WHERE 不同）
-- INTERSECT 会匹配 NULL
SELECT NULL AS val UNION SELECT NULL;  -- 返回 1 行 NULL
SELECT NULL INTERSECT SELECT NULL;     -- 返回 1 行 NULL

-- 注意：EXCEPT 中 NULL 也参与匹配
SELECT 1 WHERE 1 IN (SELECT NULL);     -- 无结果
SELECT 1 EXCEPT SELECT NULL;            -- 返回 1
```

---

## 实战场景

**基本写法：找差集（未完成 vs 已完成）**
`SELECT ... EXCEPT SELECT ...`
```sql
-- 找出有库存但从未售出的商品
SELECT product_id FROM inventory
EXCEPT
SELECT DISTINCT product_id FROM order_items;

-- MySQL 替代
SELECT i.product_id FROM inventory i
WHERE NOT EXISTS (
  SELECT 1 FROM order_items o WHERE o.product_id = i.product_id
);
```

---

**基本写法：对称差集（A XOR B）**
`(A EXCEPT B) UNION (B EXCEPT A)`
```sql
-- 对称差集：只在 A 或只在 B，不在两者交集
(SELECT id FROM table_a
 EXCEPT
 SELECT id FROM table_b)
UNION
(SELECT id FROM table_b
 EXCEPT
 SELECT id FROM table_a);
```

---

## ORDER BY 与 LIMIT

**基本写法：结果排序与限制**
`<集合操作> ORDER BY <列> [LIMIT <n>]`
```sql
-- ORDER BY 必须在最后，作用于整体结果
-- 列名用第一个查询的列名
SELECT name, score FROM team_a
UNION ALL
SELECT name, score FROM team_b
ORDER BY score DESC
LIMIT 10;

-- 对单个子查询限制需用括号（部分数据库支持）
(SELECT name FROM t1 ORDER BY score DESC LIMIT 5)
UNION
(SELECT name FROM t2 ORDER BY score DESC LIMIT 5);
```
