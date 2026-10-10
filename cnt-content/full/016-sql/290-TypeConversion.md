---
order: 310
title: 类型转换
module: 'sql'
category: 数据库
difficulty: beginner
description: CAST/CONVERT 显式转换、各数据库隐式转换规则差异、安全转换与索引失效陷阱，附方言对照表。
author: fanquanpp
updated: '2026-10-07'
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

## 8. 动手实验：亲眼看隐式转换杀死索引

「隐式转换导致索引失效」是面试与线上事故的双重高频点，值得亲手做一遍。准备数据
（MySQL 8.0）：

```sql
CREATE TABLE users (
    id    BIGINT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20) NOT NULL,
    KEY idx_phone (phone)
);
-- 批量造 10 万行（数字转字符串当电话号）
INSERT INTO users (phone)
SELECT LPAD(CAST(n AS CHAR), 11, '1') FROM
(SELECT ROW_NUMBER() OVER () AS n FROM information_schema.columns a,
 information_schema.columns b LIMIT 100000) t;
```

对照实验——两条只差一对引号的查询：

```sql
EXPLAIN SELECT * FROM users WHERE phone = 13800000000;
-- type: ALL，rows ≈ 全表 —— 隐式转换，索引被放弃

EXPLAIN SELECT * FROM users WHERE phone = '13800000000';
-- type: ref，rows = 1 —— 类型一致，走 idx_phone
```

观察点：第 5.2 节讲过机制（MySQL 对「字符串列 vs 数字」把**列**转成数字，对整列逐行
转换意味着索引顺序失效），这里要补的是判断直觉——**线上排查时先看 EXPLAIN 的 type 列**：
明明有索引却显示 ALL，第一怀疑对象就是条件两侧类型不一致。顺带验证方向性：

```sql
-- id 是 BIGINT 主键，传字符串：字面量按列类型解析，索引照常
EXPLAIN SELECT * FROM users WHERE id = '12345';
-- type: const —— 字符串 → 数字方向的安全转换
```

结论固化成规则：**数字列允许被字符串字面量匹配，字符串列绝不允许被数字字面量匹配**。
PostgreSQL 把危险方向直接变成报错，把安全方向照常执行——同一规则，两种执行策略。

第二个实验验证「转换失败时各库的行为差异」（第 6 节的现场版）：

```sql
SELECT CAST('abc' AS SIGNED);   -- MySQL：0 + warning（SELECT 表达式不报错）
SELECT CAST('abc' AS INTEGER);  -- PostgreSQL：直接报错 invalid input syntax
SELECT CAST('abc' AS INTEGER);  -- SQLite：0，静默
```

同样的脏数据（混入 'abc' 的 score_text 列），三个库给出三种行为：静默 0、当场报错、
静默 0。**数据清洗脚本在测试库跑通、在生产库跑挂或跑歪**，多数栽在这里。

## 9. 练习

排障题（10 分钟）：同事反馈「users 表查询突然变慢，EXPLAIN 显示全表扫描」，SQL 是
`SELECT * FROM users WHERE phone = 13800000000;`。给出三步排查动作和最终修复。验收：
能说出「为什么这个查询在开发库（SQLite）上没人发现」。

提示：SQLite 的亲和性规则会静默转换、小表全扫也快——类型问题往往在数据量大的生产库
才暴露。修复参考：

```sql
-- 第 1 步：EXPLAIN 确认 type=ALL
-- 第 2 步：检查列类型与条件字面量类型（SHOW CREATE TABLE users;）
-- 第 3 步：两侧统一为字符串
SELECT * FROM users WHERE phone = '13800000000';
-- 应用代码里同样修：占位符参数必须是 str，不要传 int
```

清洗题（20 分钟）：表 `import_rows(raw TEXT)` 里有 10 万行 mixed 数据，其中一部分是合法
整数、一部分是垃圾字符串。要求：把合法行转成数字写入 `clean(n INT)`，垃圾行单独导出。
验收：一条 SQL 完成合法行迁移（不用存储过程、不用循环）。

提示（思路方向）：PG 16+ 用 `pg_input_is_valid` 预检；PG 旧版与 MySQL 用正则预检
（第 6 节的两个模板）。先自己写，再对照：

```sql
-- PostgreSQL
INSERT INTO clean (n)
SELECT CAST(raw AS INT) FROM import_rows
WHERE pg_input_is_valid(raw, 'int');
-- 16 以下版本用正则：WHERE raw ~ '^\s*-?\d+\s*$'

-- 导出垃圾行（与上面条件取反）
SELECT raw FROM import_rows WHERE NOT pg_input_is_valid(raw, 'int');
```

方言题（10 分钟）：同一条 `SELECT CONVERT('2024-03-15', DATE);` 在 MySQL 正常、搬到
SQL Server 报错。解释原因并写出 SQL Server 的等价写法。验收：能不查资料说出两个 CONVERT
的参数顺序差异。

提示：第 3 节的表格。参考实现：

```sql
-- SQL Server：目标类型在前，表达式在后（与 MySQL 相反）
SELECT CONVERT(DATE, '2024-03-15', 23);    -- 23 即 yyyy-mm-dd 风格
-- 更稳的是标准语法，不依赖 CONVERT：
SELECT CAST('2024-03-15' AS DATE);
```

面试题（5 分钟）：面试官问「WHERE 条件里对索引列做 CAST 还能走索引吗？」回答要点：
函数作用于**列**则索引失效、作用于**常量/另一侧**则无碍；隐式转换是数据库替你套的 CAST，
方向错了同样失效。验收：能举出本文 phone 的正反两个例子。

提示：`WHERE CAST(phone AS UNSIGNED) = 138...` 与 `WHERE phone = 138...` 是同一件事
（都是把列转数字）；`WHERE created_at > CAST('2026-01-01' AS DATE)` 则 CAST 在常量侧，
索引不受影响。

## 10. 小结

- 优先 `CAST`（全库通用）；PostgreSQL 加用 `::`；注意 SQL Server 与 MySQL 的
  `CONVERT` 参数顺序相反。
- 隐式转换规则差异巨大：MySQL 宽松（转不动当 0）、PostgreSQL 严格（直接报错）、
  SQLite 亲和性（失败给 0）。
- 字符串列与数字比较是索引失效的经典来源，条件两侧务必类型一致。
- TRY_CAST 只有 SQL Server 有；PG 16+ 用 `pg_input_is_valid` 预检，MySQL 用
  REGEXP 预检。
- 转换会吞性能：能靠正确的表设计和类型选择避免的转换，就不要留给查询时。
