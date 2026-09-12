---
order: 50
title: 过滤条件
module: 'sql'
category: 数据库
difficulty: beginner
description: SQL过滤条件：比较运算符、IN、BETWEEN、LIKE、IS NULL的语法、模式匹配与性能优化
author: fanquanpp
updated: '2026-09-12'
related:
  - 'sql/100-Constraint'
  - 'sql/080-SelectExecutionOrder'
  - 'sql/060-AggregateFunction'
  - 'sql/070-GROUPBYGroupingSet'
prerequisites:
  - 'sql/020-OverviewStandard'
---
## 前置知识

建议先阅读以下内容再进入本文：

- [概述与标准](/sql/020-OverviewStandard)

## 1. WHERE 子句概述

WHERE 子句用于过滤 FROM/JOIN 结果集中的行，只保留满足条件的行。它是 SQL 查询中最基本也最重要的过滤机制。

```sql
SELECT select_list
FROM table_source
WHERE search_condition;
```

## 2. 比较运算符

### 2.1 基本比较运算符

| 运算符  | 含义     | 示例                       |
| ------- | -------- | -------------------------- |
| =       | 等于     | `WHERE age = 25`           |
| <> / != | 不等于   | `WHERE status <> 'closed'` |
| <       | 小于     | `WHERE price < 100`        |
| >       | 大于     | `WHERE salary > 50000`     |
| <=      | 小于等于 | `WHERE quantity <= 0`      |
| >=      | 大于等于 | `WHERE score >= 60`        |

### 2.2 比较运算符与 NULL

任何与 NULL 的比较结果都是 NULL（未知），而非 TRUE 或 FALSE：

```sql
-- 以下查询不会返回任何行
SELECT * FROM users WHERE phone = NULL;
SELECT * FROM users WHERE phone <> NULL;

-- 必须使用 IS NULL / IS NOT NULL
SELECT * FROM users WHERE phone IS NULL;
SELECT * FROM users WHERE phone IS NOT NULL;
```

### 2.3 安全等于运算符

```sql
-- MySQL 的 <=> 运算符（NULL 安全等于）
SELECT * FROM users WHERE phone <=> NULL;   -- 等价于 phone IS NULL
SELECT * FROM users WHERE phone <=> '123';  -- 等价于 phone = '123'

-- IS DISTINCT FROM（SQL 标准，NULL 安全的"不等于"）
SELECT * FROM users WHERE phone IS DISTINCT FROM NULL;  -- 等价于 phone IS NOT NULL
SELECT * FROM users WHERE phone IS NOT DISTINCT FROM NULL; -- 等价于 phone IS NULL
```

方言支持：PostgreSQL、SQLite（3.39+）原生支持 `IS [NOT] DISTINCT FROM`；
SQLite 更早就有等价的紧凑写法 `IS` / `IS NOT`（自身扩展）；MySQL 至今不支持
`IS DISTINCT FROM`，等价能力由 `<=>`（等价于 IS NOT DISTINCT FROM）承担；
SQL Server 两者都需用 `(a = b) OR (a IS NULL AND b IS NULL)` 之类的组合模拟。

## 3. 逻辑运算符

### 3.1 AND、OR、NOT

```sql
-- AND：所有条件都为 TRUE
SELECT * FROM employees
WHERE dept_id = 5 AND salary > 50000;

-- OR：任一条件为 TRUE
SELECT * FROM employees
WHERE dept_id = 5 OR dept_id = 10;

-- NOT：取反
SELECT * FROM employees
WHERE NOT (dept_id = 5 OR dept_id = 10);
```

### 3.2 运算符优先级

NOT > AND > OR，建议使用括号明确逻辑：

```sql
-- 以下两个查询含义不同
SELECT * FROM products
WHERE category = 'A' OR category = 'B' AND price > 100;
-- 等价于：category = 'A' OR (category = 'B' AND price > 100)

SELECT * FROM products
WHERE (category = 'A' OR category = 'B') AND price > 100;
-- 等价于：(category = 'A' OR category = 'B') AND price > 100
```

## 4. IN 运算符

### 4.1 基本用法

```sql
-- 离散值匹配
SELECT * FROM orders
WHERE status IN ('pending', 'processing', 'shipped');

-- 等价于
SELECT * FROM orders
WHERE status = 'pending' OR status = 'processing' OR status = 'shipped';

-- NOT IN
SELECT * FROM orders
WHERE status NOT IN ('cancelled', 'returned');
```

### 4.2 IN 与 NULL 的陷阱

```sql
-- NOT IN 遇到 NULL 的陷阱
SELECT * FROM products
WHERE category_id NOT IN (1, 2, NULL);
-- 等价于：category_id <> 1 AND category_id <> 2 AND category_id <> NULL
-- category_id <> NULL 结果为 NULL，整个条件为 NULL/FALSE
-- 结果：返回空集！

-- 解决方案：使用 NOT EXISTS
SELECT * FROM products p
WHERE NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.id = p.category_id AND c.id IN (1, 2)
);
```

### 4.3 子查询中的 IN

```sql
-- 子查询 IN
SELECT * FROM orders
WHERE user_id IN (
    SELECT id FROM users WHERE vip_level >= 3
);

-- 性能提示：大数据量时 NOT EXISTS 通常比 NOT IN 更高效
SELECT * FROM orders o
WHERE NOT EXISTS (
    SELECT 1 FROM cancelled_orders c WHERE c.order_id = o.id
);
```

## 5. BETWEEN 运算符

### 5.1 基本用法

```sql
-- 包含边界的范围查询
SELECT * FROM products
WHERE price BETWEEN 100 AND 500;
-- 等价于 price >= 100 AND price <= 500

-- NOT BETWEEN
SELECT * FROM products
WHERE price NOT BETWEEN 100 AND 500;

-- 日期范围
SELECT * FROM orders
WHERE created_at BETWEEN DATE '2026-01-01' AND DATE '2026-06-30';
```

### 5.2 BETWEEN 注意事项

```sql
-- BETWEEN 包含边界
SELECT * FROM products WHERE price BETWEEN 100 AND 500;
-- 包含 price = 100 和 price = 500

-- 时间戳 BETWEEN 的精度问题
SELECT * FROM logs
WHERE created_at BETWEEN '2026-06-14 00:00:00' AND '2026-06-14 23:59:59';
-- 可能遗漏 23:59:59.001 ~ 23:59:59.999 的记录

-- 推荐写法
SELECT * FROM logs
WHERE created_at >= '2026-06-14 00:00:00'
  AND created_at < '2026-06-15 00:00:00';
```

### 5.3 对称性

```sql
-- BETWEEN 要求下界 <= 上界
SELECT * FROM products WHERE price BETWEEN 500 AND 100;
-- 等价于 price >= 500 AND price <= 100，永远为 FALSE

-- SYMMETRIC 关键字（PostgreSQL）
SELECT * FROM products WHERE price BETWEEN SYMMETRIC 500 AND 100;
-- 自动交换边界，等价于 price BETWEEN 100 AND 500
```

## 6. LIKE 运算符

### 6.1 通配符

| 通配符 | 含义               | 示例    |
| ------ | ------------------ | ------- |
| %      | 零个或多个任意字符 | `'张%'` |
| \_     | 恰好一个任意字符   | `'张_'` |

```sql
-- 前缀匹配（可利用索引）
SELECT * FROM users WHERE name LIKE '张%';

-- 后缀匹配（无法利用普通索引）
SELECT * FROM users WHERE name LIKE '%明';

-- 包含匹配（无法利用普通索引）
SELECT * FROM users WHERE name LIKE '%华%';

-- 单字符匹配
SELECT * FROM users WHERE name LIKE '张_';  -- 张三、张四，不包括张三四
```

### 6.2 转义特殊字符

```sql
-- 查找包含 % 或 _ 的字符串
SELECT * FROM files WHERE filename LIKE '100\%' ESCAPE '\';   -- 匹配 "100%"
SELECT * FROM files WHERE filename LIKE 'report\_2026' ESCAPE '\';  -- 匹配 "report_2026"

-- 默认转义字符：PostgreSQL 与 MySQL 的 LIKE 都默认用 \（反斜杠）
-- 差别在字符串字面量层面：
-- MySQL 里 '100\%' 一个反斜杠即可传递给 LIKE
-- PostgreSQL（standard_conforming_strings 默认开）里 '\' 只是普通字符，
--   需要写 '100\\%' 或 E'100\\%' 才能把一个真实反斜杠交给 LIKE
-- 跨库稳妥做法：永远显式写 ESCAPE 并配合转义函数处理用户输入
```

### 6.3 正则表达式匹配

```sql
-- PostgreSQL: ~ （区分大小写）、~* （不区分）
SELECT * FROM users WHERE name ~ '^张[三四五]$';

-- MySQL: REGEXP / RLIKE
SELECT * FROM users WHERE name REGEXP '^张[三四五]$';

-- SQL 标准：SIMILAR TO（仅 PostgreSQL 等少数数据库实现，MySQL/SQLite 均不支持）
SELECT * FROM users WHERE name SIMILAR TO '张(三|四|五)';
```

## 7. IS NULL / IS NOT NULL

### 7.1 基本用法

```sql
-- 检查 NULL 值
SELECT * FROM users WHERE phone IS NULL;
SELECT * FROM users WHERE phone IS NOT NULL;

-- 多列 NULL 检查
SELECT * FROM orders
WHERE shipping_date IS NULL AND payment_date IS NOT NULL;
```

### 7.2 NULL 相关函数

```sql
-- COALESCE：返回第一个非 NULL 参数
SELECT COALESCE(phone, email, 'N/A') AS contact FROM users;

-- NULLIF：两参数相等返回 NULL，否则返回第一个
SELECT NULLIF(score, 0) AS safe_score FROM exams;  -- 避免除零

-- ISNULL / IFNULL（非标准）
SELECT ISNULL(phone, 'N/A') FROM users;           -- SQL Server
SELECT IFNULL(phone, 'N/A') FROM users;           -- MySQL
```

## 8. 组合条件与性能优化

### 8.1 可索引条件

| 条件类型             | 索引利用 | 说明                 |
| -------------------- | -------- | -------------------- |
| `col = value`        |          | 等值查询最有效       |
| `col IN (...)`       |          | 等价于多个等值查询   |
| `col BETWEEN`        |          | 范围扫描             |
| `col LIKE 'prefix%'` |          | 前缀匹配可用索引     |
| `col LIKE '%suffix'` |          | 后缀匹配无法用索引   |
| `col IS NULL`        |          | 大多数数据库支持     |
| `NOT col = value`    |          | 否定条件通常不用索引 |
| `col <> value`       |          | 不等于通常不用索引   |

### 8.2 SARGable 条件

SARGable（Search ARGument able）指能利用索引的条件：

```sql
-- 非 SARGable：对列使用函数
SELECT * FROM orders WHERE YEAR(created_at) = 2026;
SELECT * FROM users WHERE LOWER(email) = 'test@example.com';

-- SARGable：改写条件
SELECT * FROM orders WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';
SELECT * FROM users WHERE email = 'test@example.com' COLLATE utf8mb4_general_ci;
```

### 8.3 多条件查询优化

```sql
-- 将选择性高的条件放在前面（逻辑上无差别，但优化器可能受益）
SELECT * FROM orders
WHERE user_id = 42             -- 高选择性
  AND status = 'pending'       -- 低选择性
  AND created_at >= '2026-01-01';

-- 复合索引应遵循最左前缀原则
CREATE INDEX idx_orders_user_status_date
ON orders (user_id, status, created_at);
```
## WHERE 基本语法

**换行写法：WHERE 子句过滤行**
`SELECT <select_list> FROM <table_source> WHERE <search_condition>;`
```sql
-- 使用 WHERE 子句过滤满足条件的行
SELECT select_list
FROM table_source
WHERE search_condition;
```

---

## 比较运算符

**单行写法：等于比较**
`WHERE <列> = <值>;`
```sql
-- 查询年龄等于 25 的记录
SELECT * FROM users WHERE age = 25;
```

**单行写法：不等于比较**
`WHERE <列> <> <值>;`
```sql
-- 查询状态不为 closed 的订单
SELECT * FROM orders WHERE status <> 'closed';
```

**单行写法：小于比较**
`WHERE <列> < <值>;`
```sql
-- 查询价格小于 100 的商品
SELECT * FROM products WHERE price < 100;
```

**单行写法：大于比较**
`WHERE <列> > <值>;`
```sql
-- 查询薪资大于 50000 的员工
SELECT * FROM employees WHERE salary > 50000;
```

**单行写法：小于等于比较**
`WHERE <列> <= <值>;`
```sql
-- 查询库存小于等于 0 的商品
SELECT * FROM products WHERE quantity <= 0;
```

**单行写法：大于等于比较**
`WHERE <列> >= <值>;`
```sql
-- 查询成绩大于等于 60 的记录
SELECT * FROM exams WHERE score >= 60;
```

---

## 安全等于运算符

**单行写法：MySQL NULL 安全等于**
`WHERE <列> <=> <值>;`
```sql
-- 查询手机号为 NULL 的用户（等价于 IS NULL）
SELECT * FROM users WHERE phone <=> NULL;
```

**单行写法：IS DISTINCT FROM**
`WHERE <列> IS DISTINCT FROM <值>;`
```sql
-- 查询手机号不为 NULL 的用户（等价于 IS NOT NULL）
SELECT * FROM users WHERE phone IS DISTINCT FROM NULL;
```

**单行写法：IS NOT DISTINCT FROM**
`WHERE <列> IS NOT DISTINCT FROM <值>;`
```sql
-- 查询手机号为 NULL 的用户（等价于 IS NULL）
SELECT * FROM users WHERE phone IS NOT DISTINCT FROM NULL;
```

---

## 逻辑运算符

**单行写法：AND 组合条件**
`WHERE <条件 1> AND <条件 2>;`
```sql
-- 查询部门 ID 为 5 且薪资大于 50000 的员工
SELECT * FROM employees
WHERE dept_id = 5 AND salary > 50000;
```

**单行写法：OR 组合条件**
`WHERE <条件 1> OR <条件 2>;`
```sql
-- 查询部门 ID 为 5 或 10 的员工
SELECT * FROM employees
WHERE dept_id = 5 OR dept_id = 10;
```

**单行写法：NOT 取反条件**
`WHERE NOT (<条件>);`
```sql
-- 查询部门 ID 不为 5 且不为 10 的员工
SELECT * FROM employees
WHERE NOT (dept_id = 5 OR dept_id = 10);
```

**换行写法：运算符优先级（AND 优先于 OR）**
`WHERE <条件 1> OR <条件 2> AND <条件 3>;`
```sql
-- AND 优先于 OR，等价于 category = 'A' OR (category = 'B' AND price > 100)
SELECT * FROM products
WHERE category = 'A' OR category = 'B' AND price > 100;
```

**换行写法：括号改变优先级**
`WHERE (<条件 1> OR <条件 2>) AND <条件 3>;`
```sql
-- 使用括号改变优先级
SELECT * FROM products
WHERE (category = 'A' OR category = 'B') AND price > 100;
```

---

## IN 运算符

**单行写法：离散值匹配**
`WHERE <列> IN (<值 1>, <值 2>, ...);`
```sql
-- 查询状态为待处理、处理中、已发货的订单
SELECT * FROM orders
WHERE status IN ('pending', 'processing', 'shipped');
```

**单行写法：排除离散值**
`WHERE <列> NOT IN (<值 1>, <值 2>, ...);`
```sql
-- 查询状态不为已取消、已退货的订单
SELECT * FROM orders
WHERE status NOT IN ('cancelled', 'returned');
```

**换行写法：子查询中的 IN**
`WHERE <列> IN (SELECT ...);`
```sql
-- 查询 VIP 等级大于等于 3 的用户的订单
SELECT * FROM orders
WHERE user_id IN (
    SELECT id FROM users WHERE vip_level >= 3
);
```

---

## BETWEEN 运算符

**单行写法：范围查询（包含边界）**
`WHERE <列> BETWEEN <下界> AND <上界>;`
```sql
-- 查询价格在 100 到 500 之间的商品
SELECT * FROM products
WHERE price BETWEEN 100 AND 500;
```

**单行写法：排除范围**
`WHERE <列> NOT BETWEEN <下界> AND <上界>;`
```sql
-- 查询价格不在 100 到 500 之间的商品
SELECT * FROM products
WHERE price NOT BETWEEN 100 AND 500;
```

**单行写法：日期范围查询**
`WHERE <列> BETWEEN DATE '<开始>' AND DATE '<结束>';`
```sql
-- 查询 2026 年上半年的订单
SELECT * FROM orders
WHERE created_at BETWEEN DATE '2026-01-01' AND DATE '2026-06-30';
```

**换行写法：时间戳范围查询（避免精度问题）**
`WHERE <列> >= <开始> AND <列> < <结束>;`
```sql
-- 查询 2026-06-14 全天的日志（避免 BETWEEN 精度问题）
SELECT * FROM logs
WHERE created_at >= '2026-06-14 00:00:00'
  AND created_at < '2026-06-15 00:00:00';
```

---

## LIKE 运算符

**单行写法：前缀匹配**
`WHERE <列> LIKE '<前缀>%';`
```sql
-- 查询姓"张"的用户（可利用索引）
SELECT * FROM users WHERE name LIKE '张%';
```

**单行写法：后缀匹配**
`WHERE <列> LIKE '%<后缀>';`
```sql
-- 查询名字以"明"结尾的用户（无法利用普通索引）
SELECT * FROM users WHERE name LIKE '%明';
```

**单行写法：包含匹配**
`WHERE <列> LIKE '%<关键字>%';`
```sql
-- 查询名字包含"华"的用户
SELECT * FROM users WHERE name LIKE '%华%';
```

**单行写法：单字符匹配**
`WHERE <列> LIKE '<前缀>_<后缀>';`
```sql
-- 查询"张三"、"张四"等两字姓名
SELECT * FROM users WHERE name LIKE '张_';
```

**单行写法：ESCAPE 转义特殊字符**
`WHERE <列> LIKE '<模式>' ESCAPE '<转义字符>';`
```sql
-- 查找文件名为"100%"的记录
SELECT * FROM files WHERE filename LIKE '100\%' ESCAPE '\';
```

---

## 正则表达式匹配

**单行写法：PostgreSQL 正则匹配**
`WHERE <列> ~ '<正则>';`
```sql
-- 查询姓张、三、四、五的用户
SELECT * FROM users WHERE name ~ '^张[三四五]$';
```

**单行写法：MySQL 正则匹配**
`WHERE <列> REGEXP '<正则>';`
```sql
-- 查询姓张、三、四、五的用户
SELECT * FROM users WHERE name REGEXP '^张[三四五]$';
```

**单行写法：SQL 标准模式匹配（PostgreSQL 支持，MySQL/SQLite 不支持）**
`WHERE <列> SIMILAR TO '<模式>';`
```sql
-- 查询姓张、三、四、五的用户
SELECT * FROM users WHERE name SIMILAR TO '张(三|四|五)';
```

---

## IS NULL / IS NOT NULL

**单行写法：检查 NULL 值**
`WHERE <列> IS NULL;`
```sql
-- 查询没有手机号的用户
SELECT * FROM users WHERE phone IS NULL;
```

**单行写法：检查非 NULL 值**
`WHERE <列> IS NOT NULL;`
```sql
-- 查询有手机号的用户
SELECT * FROM users WHERE phone IS NOT NULL;
```

**换行写法：多列 NULL 检查**
`WHERE <列 1> IS NULL AND <列 2> IS NOT NULL;`
```sql
-- 查询已付款但未发货的订单
SELECT * FROM orders
WHERE shipping_date IS NULL AND payment_date IS NOT NULL;
```

---

## NULL 相关函数

**单行写法：COALESCE 返回第一个非 NULL 参数**
`SELECT COALESCE(<列 1>, <列 2>, <默认值>) FROM <表名>;`
```sql
-- 查询用户联系方式，优先手机号，其次邮箱，最后显示 N/A
SELECT COALESCE(phone, email, 'N/A') AS contact FROM users;
```

**单行写法：NULLIF 相等返回 NULL**
`SELECT NULLIF(<列 1>, <列 2>) FROM <表名>;`
```sql
-- 查询成绩，为 0 时返回 NULL 避免除零
SELECT NULLIF(score, 0) AS safe_score FROM exams;
```

**单行写法：MySQL IFNULL**
`SELECT IFNULL(<列>, <默认值>) FROM <表名>;`
```sql
-- 查询用户手机号，未填写则显示 N/A
SELECT IFNULL(phone, 'N/A') FROM users;
```

---

## SARGable 条件

**单行写法：非 SARGable 条件（无法利用索引）**
`WHERE <函数>(<列>) = <值>;`
```sql
-- 对列使用函数导致无法利用索引
SELECT * FROM orders WHERE YEAR(created_at) = 2026;
```

**换行写法：SARGable 条件改写（可利用索引）**
`WHERE <列> >= <开始> AND <列> < <结束>;`
```sql
-- 改写为范围查询以利用索引
SELECT * FROM orders WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';
```
