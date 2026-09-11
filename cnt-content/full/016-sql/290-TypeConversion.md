---
order: 290
title: 类型转换
module: 'sql'
category: 数据库
difficulty: beginner
description: CAST/CONVERT 显式转换、各数据库隐式转换规则差异、安全转换与索引失效陷阱，附方言对照表。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'sql/090-DataType'
  - 'sql/050-FilterCondition'
  - 'sql/440-PerformanceOptimization'
prerequisites:
  - 'sql/090-DataType'
---

## 1. 一句话入门

类型转换分两种：**显式转换**由你指明目标类型（`CAST`），**隐式转换**由数据库自动完成
（字符串与数字比较、运算时）。显式转换是可移植、可预期的；隐式转换的规则因数据库而异，
是"索引失效"和"查询结果意外"两大类事故的常见根源。

## 2. CAST：标准写法

`CAST(expr AS 目标类型)` 是 SQL 标准语法，PostgreSQL、MySQL、SQL Server、SQLite 全部支持：

```sql
SELECT
  CAST('123.45' AS DECIMAL(10,2)) AS price,          -- 123.45
  CAST(3.14159 AS DECIMAL(5,2))   AS rounded,        -- 3.14（四舍五入）
  CAST(20240101 AS CHAR)          AS date_str,       -- '20240101'（MySQL/SQL Server）
  CAST('2024-03-15' AS DATE)      AS order_date;     -- 2024-03-15
```

PostgreSQL 额外提供 `::` 简写（仅 PostgreSQL 可用，但比 CAST 短得多）：

```sql
-- PostgreSQL 专属
SELECT
  '123.45'::numeric(10,2) AS price,
  20240101::text          AS date_str,
  '2024-03-15'::date      AS order_date;
```

方言注意：目标类型名单各库不同。MySQL 的 CAST 只接受
`BINARY/CHAR/DATE/DATETIME/DECIMAL/DOUBLE/FLOAT/JSON/NCHAR/REAL/SIGNED/UNSIGNED/TIME`；
**MySQL 的 CAST 不接受 BOOLEAN**，`CAST(1 AS BOOLEAN)` 会直接报语法错误
（布尔在 MySQL 里就是 `TINYINT(1)` 别名，无需转换）。PostgreSQL 支持
`CAST(1 AS BOOLEAN)`（结果 `true`）。

## 3. CONVERT：两种相反的参数顺序

`CONVERT` 不是标准语法，而且两个主流数据库的**参数顺序正好相反**，迁移时极易踩坑：

```sql
-- SQL Server：目标类型在前，可选第三个 style 参数
SELECT CONVERT(VARCHAR(10), GETDATE(), 120) AS date_str;   -- '2026-09-08'

-- MySQL：表达式在前
SELECT CONVERT('2024-03-15', DATE) AS order_date;

-- MySQL 特有：USING 转字符集
SELECT CONVERT('中文' USING utf8mb4) AS utf8_text;
```

| 数据库     | CONVERT 形式                          |
| ---------- | ------------------------------------- |
| SQL Server | `CONVERT(目标类型, 表达式 [, style])` |
| MySQL      | `CONVERT(表达式, 目标类型)`           |
| PostgreSQL | 无 CONVERT（用 `CAST` / `::`）        |
| SQLite     | 无 CONVERT（仅 `CAST`）               |

## 4. 日期格式化与解析（TO_* 家族）

`TO_CHAR / TO_DATE / TO_NUMBER` 是 Oracle 语法，PostgreSQL 兼容了同名函数
（格式串与 Oracle 大体一致但不完全相同）。MySQL 用自己的函数族，SQLite 依赖
字符串函数与修饰符。

```sql
-- PostgreSQL / Oracle
SELECT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')    AS today;      -- '2026-09-08'
SELECT TO_CHAR(12345.678, '999,999.99')       AS formatted;  -- ' 12,345.68'
SELECT TO_DATE('15/03/2024', 'DD/MM/YYYY')    AS eu_date;    -- 2024-03-15
SELECT TO_NUMBER('1,234.56', '9,999.99')      AS amount;     -- 1234.56

-- MySQL 等价写法
SELECT DATE_FORMAT(NOW(), '%Y-%m-%d')         AS today;
SELECT STR_TO_DATE('15/03/2024', '%d/%m/%Y')  AS eu_date;
SELECT CAST('123.45' AS DECIMAL(10,2))        AS amount;     -- 没有 TO_NUMBER
```

## 5. 隐式转换：方便但危险

### 5.1 各库规则速览

```sql
-- MySQL：宽松，字符串参与算术时自动转数字
SELECT '100' + 50 AS result;              -- 150
SELECT 'abc' + 1 AS result;               -- 1（'abc' 转不动按 0 处理，附 warning）

-- PostgreSQL：严格，强类型
SELECT '100' + 50 AS result;              -- 150（字面量 '100' 按上下文解析为整数）
-- 但若 score 是 varchar 列，score + 50 直接报错，不会静默转换

-- SQLite：亲和性（affinity）规则
SELECT '100' + 50 AS result;              -- 150
SELECT CAST('abc' AS INTEGER) AS result;  -- 0（转换失败不报错，给 0）
```

### 5.2 经典事故：隐式转换让索引失效

MySQL 中"列是字符串、比较值是数字"时，会把**整列**转成数字再比较，索引完全用不上：

```sql
-- phone 是 VARCHAR 且有索引
SELECT * FROM users WHERE phone = 13800000000;    -- 隐式转换，全表扫描
SELECT * FROM users WHERE phone = '13800000000';  -- 类型一致，走索引（正确写法）
```

PostgreSQL 更"硬"：`varchar_col = 5` 直接报错（根本不给你犯这个错的机会），
`int_col = '5'` 则安全——字面量会按列的类型解析，索引照常使用。

**结论**：比较条件的两侧保持类型一致，永远不要依赖隐式转换。

## 6. 安全转换：失败时怎么办

```sql
-- CAST 转不动字符串的默认行为
-- MySQL：SELECT CAST('abc' AS SIGNED); → 0 + warning（SELECT 表达式不报错）
--         （严格模式只管 INSERT/UPDATE，管不到 SELECT 表达式）
-- PostgreSQL：SELECT CAST('abc' AS INT);  → 报错
-- SQLite：    SELECT CAST('abc' AS INT);  → 0（宽松，不报错）
```

处理"可能转不动"的数据：

```sql
-- COALESCE 兜底：只处理 NULL，不能防止转换报错
SELECT user_id, COALESCE(CAST(score_text AS INT), 0) AS score
FROM user_scores;

-- TRY_CAST：SQL Server 2012+ 原生支持，失败返回 NULL 而非报错
SELECT
  TRY_CAST('abc' AS INT) AS num1,    -- NULL
  TRY_CAST('123' AS INT) AS num2;    -- 123
```

方言事实：**PostgreSQL 与 MySQL 都没有 TRY_CAST**。替代方案：

```sql
-- PostgreSQL 16+：先验证再转换（大多数类型可用）
SELECT *
FROM user_scores
WHERE pg_input_is_valid(score_text, 'int');   -- 只保留合法行

-- PostgreSQL 通用手法：正则预检
SELECT CAST(score_text AS INT)
FROM user_scores
WHERE score_text ~ '^\s*-?\d+\s*$';

-- MySQL 8.0+：REGEXP 预检
SELECT CAST(score_text AS SIGNED)
FROM user_scores
WHERE score_text REGEXP '^-?[0-9]+$';
```

```sql
-- NULLIF：防除零（除零不报错库会按错误处理）
SELECT total_amount / NULLIF(item_count, 0) AS avg_price
FROM orders;
-- item_count = 0 时返回 NULL 而不是报错
```

## 7. JSON 与数组转换

```sql
-- PostgreSQL：文本与 jsonb 互转，jsonb 可建索引
SELECT '{"name":"张三"}'::jsonb      AS data;
SELECT CAST('{"a":1}' AS JSON)       AS data;
SELECT data->>'name' AS name FROM users WHERE id = 1;   -- 提取为文本
SELECT ARRAY_TO_STRING(ARRAY['a','b','c'], ',') AS joined;  -- 'a,b,c'
SELECT STRING_TO_ARRAY('a,b,c', ',')            AS arr;     -- {a,b,c}

-- MySQL：JSON 类型与提取
SELECT CAST('{"a":1}' AS JSON)                        AS j;
SELECT CAST(JSON_EXTRACT(config, '$.name') AS CHAR)   AS name;
-- JSON_UNQUOTE(JSON_EXTRACT(...)) 更常用，或直接用 ->> 操作符
```

更多 JSON 细节见 [SQL 中的 JSON](/sql/300-SqlJson)。

## 8. 小结

- 优先 `CAST`（全库通用）；PostgreSQL 加用 `::`；注意 SQL Server 与 MySQL 的
  `CONVERT` 参数顺序相反。
- 隐式转换规则差异巨大：MySQL 宽松（转不动当 0）、PostgreSQL 严格（直接报错）、
  SQLite 亲和性（失败给 0）。
- 字符串列与数字比较是索引失效的经典来源，条件两侧务必类型一致。
- TRY_CAST 只有 SQL Server 有；PG 16+ 用 `pg_input_is_valid` 预检，MySQL 用
  REGEXP 预检。
- 转换会吞性能：能靠正确的表设计和类型选择避免的转换，就不要留给查询时。
