---
order: 450
title: 类型转换语法速查手册
module: 'sql'
category: 数据库
difficulty: beginner
description: 类型转换 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## CAST 标准转换

**基本写法：CAST 函数**
`CAST(<表达式> AS <目标类型>)`

```sql
-- 字符串转数值
SELECT CAST('123.45' AS DECIMAL(10,2)) AS price;
-- 数值转字符串
SELECT CAST(20240101 AS CHAR(8)) AS date_str;
-- 字符串转日期
SELECT CAST('2024-03-15' AS DATE) AS order_date;
```

**基本写法：CAST 常见目标类型**
`CAST(<表达式> AS <类型> [(<精度>[,<标度>])])`

```sql
-- 常用目标类型转换
SELECT
  CAST(3.14159 AS DECIMAL(5,2))     AS rounded,   -- 3.14
  CAST(100 AS CHAR(10))             AS str_val,   -- '100'
  CAST('2024-03-15 10:30:00' AS DATETIME) AS dt,  -- 日期时间
  CAST(1 AS BOOLEAN)                AS flag;      -- true（PG/MySQL8）
```

---

## CONVERT 函数

**基本写法：CONVERT 类型转换**
`CONVERT(<表达式>, <目标类型>)`

```sql
-- SQL Server 风格 CONVERT
SELECT CONVERT(VARCHAR(10), GETDATE(), 120) AS date_str;
-- MySQL 风格 CONVERT
SELECT CONVERT('2024-03-15', DATE) AS order_date;
```

**基本写法：CONVERT 字符集转换（MySQL）**
`CONVERT(<表达式> USING <字符集名>)`

```sql
-- 字符集转换
SELECT CONVERT('中文' USING utf8mb4) AS utf8_text;
SELECT CONVERT(name USING utf8mb4) FROM users;
```

---

## 隐式转换

**基本写法：运算中隐式转换**
`<数值列> <算术运算符> <字符串数值>`

```sql
-- 字符串与数值运算时自动转换
SELECT '100' + 50 AS result;          -- 150
SELECT order_id + 0 FROM orders;      -- 字符串 ID 转数值
SELECT '2024-03-15' + INTERVAL 1 DAY; -- 字符串日期参与运算
```

**基本写法：比较时隐式转换**
`WHERE <数值列> = '<字符串数值>'`

```sql
-- 比较时字符串自动转数值（不推荐，可能导致索引失效）
SELECT * FROM products WHERE price = '99.9';
-- 推荐显式转换以利用索引
SELECT * FROM products WHERE price = CAST('99.9' AS DECIMAL(10,2));
```

---

## 专用转换函数

**基本写法：TO_NUMBER 字符串转数值（Oracle/PG）**
`TO_NUMBER(<字符串> [, <格式>])`

```sql
-- 带格式字符串转数值
SELECT TO_NUMBER('1,234.56', '9,999.99') AS amount;
-- PostgreSQL 简化用法
SELECT TO_NUMBER('123.45', '999.99') AS price;
```

**基本写法：TO_CHAR 数值/日期转字符串**
`TO_CHAR(<数值或日期> [, <格式>])`

```sql
-- 日期格式化为字符串
SELECT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS today;
-- 数值格式化
SELECT TO_CHAR(12345.678, '999,999.99') AS formatted;
```

**基本写法：TO_DATE 字符串转日期**
`TO_DATE(<字符串> [, <格式>])`

```sql
-- 字符串解析为日期
SELECT TO_DATE('2024-03-15', 'YYYY-MM-DD') AS order_date;
SELECT TO_DATE('15/03/2024', 'DD/MM/YYYY') AS eu_date;
```

---

## NULL 与安全转换

**基本写法：COALESCE 处理转换后 NULL**
`COALESCE(CAST(<表达式> AS <类型>), <默认值>)`

```sql
-- 转换失败时返回默认值
SELECT
  user_id,
  COALESCE(CAST(score_text AS INT), 0) AS score
FROM user_scores;
```

**基本写法：TRY_CAST 安全转换（SQL Server/PG14+）**
`TRY_CAST(<表达式> AS <目标类型>)`

```sql
-- 转换失败返回 NULL 而非报错
SELECT
  TRY_CAST('abc' AS INT) AS num1,    -- NULL
  TRY_CAST('123' AS INT) AS num2;    -- 123
```

**基本写法：NULLIF 避免除零**
`NULLIF(<表达式>, 0)`

```sql
-- 分母为 0 时返回 NULL 避免报错
SELECT
  total_amount / NULLIF(item_count, 0) AS avg_price
FROM orders;
```

---

## 数组与 JSON 转换

**基本写法：数组转字符串（PostgreSQL）**
`<数组列>::text` 或 `ARRAY_TO_STRING(<数组>, <分隔符>)`

```sql
-- 数组拼接为字符串
SELECT ARRAY_TO_STRING(ARRAY['a','b','c'], ',') AS joined; -- 'a,b,c'
-- 字符串转数组
SELECT STRING_TO_ARRAY('a,b,c', ',') AS arr;               -- {a,b,c}
```

**基本写法：JSON 与文本互转**
`<表达式>::jsonb` 或 `CAST(<表达式> AS JSON)`

```sql
-- 文本转 JSONB（PostgreSQL）
SELECT '{"name":"张三"}'::jsonb AS data;
-- JSON 提取为文本
SELECT data->>'name' AS name FROM users WHERE id = 1;
-- MySQL JSON 转文本
SELECT CAST(JSON_EXTRACT(config, '$.name') AS CHAR) AS name;
```
