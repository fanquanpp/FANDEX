---
order: 310
title: 索引失效场景
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL索引失效场景全解：函数操作、隐式转换、隐式字符集、LIKE前缀、OR条件、联合索引断裂、排序失效与函数索引解法
author: fanquanpp
updated: '2026-09-12'
related:
  - 'mysql/300-IndexStatsHistogram'
  - 'mysql/320-EXPLAINDetailed'
  - 'mysql/340-SlowQueryLog'
  - 'mysql/290-FunctionalIndex'
prerequisites:
  - 'mysql/230-CompositeIndexLeftmostPrefixPrinciple'
---

## 1. 为什么「写了索引列」也会失效

索引的本质是**有序的键序列**。一旦查询条件破坏了键的原样性（函数加工、类型变换、
字符集变换）或绕开了有序前缀（跳列、前缀模糊、全段范围），优化器就无法利用
B+ 树的有序性做快速定位，只能退化为扫描。判断失效的通用口诀：

> **列不能动、最左不能丢、范围之后全失效、OR 两侧都要有索引。**

## 2. 失效场景逐个击破

### 2.1 对索引列使用函数

```sql
-- 索引 (created_at)
-- 失效：对"列"套函数，B+ 树里存的是 created_at 的原值，不是 YEAR(created_at)
SELECT * FROM orders WHERE YEAR(created_at) = 2026;

-- 优化：把函数移到常量一侧，改写成范围
SELECT * FROM orders
WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';
```

例外：MySQL 8.0.13+ 的**函数索引**允许给表达式建索引（见 062 篇）：

```sql
CREATE INDEX idx_created_year ON orders ((YEAR(created_at)));
SELECT * FROM orders WHERE YEAR(created_at) = 2026;  -- 可走 idx_created_year
```

### 2.2 隐式类型转换

```sql
-- 索引 (phone VARCHAR(20))
-- 失效：字符串列与数字比较。MySQL 会把"列"转成数字（等价 CAST(phone AS DOUBLE)），
--       相当于对整列做函数运算 → 全表扫描
SELECT * FROM users WHERE phone = 13800138000;

-- 正确：与同类型常量比较
SELECT * FROM users WHERE phone = '13800138000';
```

注意方向性：**数字列与字符串常量比较**（`id = '123'`）不会失效——常量被转成数字，
列本身没被动过。

### 2.3 隐式字符集/排序规则转换（JOIN 场景高发）

```sql
-- users.name 是 utf8mb4_0900_ai_ci，orders.buyer_name 是 utf8mb3_general_ci
-- 两列比较时 MySQL 会给 utf8mb4 一侧的列加 CONVERT() → 该列索引失效
SELECT * FROM users u JOIN orders o ON u.name = o.buyer_name;

-- 排查：EXPLAIN 中被驱动表 type=ALL，且 Warning 里出现 CONVERT
-- 优化：统一两表的字符集与排序规则（改表或改列），或建同字符集的函数索引
```

### 2.4 LIKE 前缀通配符

```sql
-- 索引 (name)
SELECT * FROM users WHERE name LIKE '%张';   -- 失效：前缀未知，无法定位
SELECT * FROM users WHERE name LIKE '%张%';  -- 失效：同上

SELECT * FROM users WHERE name LIKE '张%';   -- 可用：等价范围 [张, 张+∞)
```

细节：`LIKE '%张%'` 若查询列全部在索引里（覆盖索引），
优化器可能选择 `type=index` 的**全索引扫描**代替全表扫描——走了索引但仍是全量扫描，
行数大时依然慢。海量模糊搜索应使用全文索引或外部搜索引擎。

### 2.5 OR 条件

```sql
-- 索引 (a), 索引 (b)
SELECT * FROM t WHERE a = 1 OR b = 2;
-- 两个条件各自有索引时，优化器可用 index_merge(union) 分别查再合并；
-- 任一条件无索引 → 整个 OR 退化为全表扫描

-- 改写 UNION 去重语义不变，且两侧可各自走索引：
SELECT * FROM t WHERE a = 1
UNION
SELECT * FROM t WHERE b = 2;

-- 若用 UNION ALL 手工去重，注意 NULL：a <> 1 会过滤掉 a IS NULL 的行，
-- 正确的"补集"写法是 (a <> 1 OR a IS NULL)
```

### 2.6 联合索引断裂（最左前缀原则）

```sql
-- 索引 (a, b, c)
SELECT * FROM t WHERE b = 2;             -- 失效：缺少最左列 a
SELECT * FROM t WHERE a = 1 AND c = 3;   -- 部分失效：只有 a 生效，c 断裂

-- 范围之后全失效：b 用了范围，c 无法继续走索引定位（仍可作为覆盖索引使用）
SELECT * FROM t WHERE a = 1 AND b > 10 AND c = 3;  -- key_len 只覆盖 (a, b)
```

### 2.7 不等与 NOT

```sql
-- 索引 (status)
SELECT * FROM orders WHERE status != 'cancelled';

-- != / NOT IN / <> 并非"必然失效"：优化器会改写为范围扫描
-- （status < 'cancelled' OR status > 'cancelled'），若排除后选择性好，仍走 range。
-- 只有当命中行占比很高时，全表扫描反而更便宜——这是成本决策，不是语法禁令。

-- 实务建议：状态类低基数列，正列举比取反更稳
SELECT * FROM orders WHERE status IN ('pending', 'processing', 'shipped');
```

### 2.8 IS NULL / IS NOT NULL

```sql
-- InnoDB 中 NULL 也是索引里的一个键值段：
SELECT * FROM users WHERE phone IS NULL;      -- 可走索引（ref）
SELECT * FROM users WHERE phone IS NOT NULL;  -- 可能走索引（range）

-- 能否走索引取决于优化器的成本估算：若 IS NOT NULL 命中 95% 的行，
-- 全表扫描更便宜，索引"看起来失效"是合理选择。不要迷信
-- "IS NOT NULL 不走索引"的老结论，用 EXPLAIN + 实际数据分布判断。
```

### 2.9 列参与算术运算

```sql
-- 索引 (salary)
SELECT * FROM employees WHERE salary * 12 > 100000;  -- 失效：列被加工

SELECT * FROM employees WHERE salary > 100000 / 12;  -- 可用：常量侧计算
```

### 2.10 排序失效（filesort）

```sql
-- 索引 (dept_id, created_at)
-- 两个排序方向不一致 → 索引顺序无法直接满足（8.0 前只能 filesort）
SELECT * FROM orders WHERE dept_id = 5 ORDER BY created_at ASC, amount DESC;

-- 方案1（8.0+）：降序索引
CREATE INDEX idx_dept_created_amount ON orders(dept_id, created_at ASC, amount DESC);

-- 方案2：统一排序方向，让索引顺序天然满足
SELECT * FROM orders WHERE dept_id = 5 ORDER BY created_at, amount;
```

## 3. 诊断三步法

```sql
-- 第 1 步：EXPLAIN 看形态
EXPLAIN SELECT * FROM orders WHERE YEAR(created_at) = 2026;
-- type: ALL, key: NULL → 没走索引

-- 第 2 步：EXPLAIN ANALYZE 看实测（8.0.18+）
EXPLAIN ANALYZE SELECT * FROM orders WHERE YEAR(created_at) = 2026;

-- 第 3 步：拿不准优化器为什么这么选，开 optimizer trace
SET optimizer_trace = 'enabled=on';
SELECT * FROM orders WHERE YEAR(created_at) = 2026;
SELECT * FROM information_schema.OPTIMIZER_TRACE\G
SET optimizer_trace = 'enabled=off';
```

## 4. 速查清单

| 场景                   | 结果               | 解法                            |
| ---------------------- | ------------------ | ------------------------------- |
| 列上套函数/表达式      | 失效               | 反写条件 / 8.0.13+ 函数索引     |
| 字符串列 = 数字        | 失效               | 常量与列同类型                  |
| JOIN 列字符集不一致    | 一侧失效           | 统一字符集与排序规则            |
| LIKE '%x' / '%x%'      | 失效               | 前缀匹配 / 全文索引 / 搜索引擎  |
| 联合索引缺最左列       | 失效               | 调整索引列序                    |
| 范围条件后的列         | 定位失效           | 索引列序把等值列放前、范围列放后 |
| != / NOT IN            | 视选择性而定       | 正列举 / 覆盖索引               |
| OR 任一侧无索引        | 全表扫描           | 补索引或改 UNION                |
| ORDER BY 方向混杂      | filesort           | 8.0 降序索引 / 统一方向         |

## 5. 小结

- 「索引失效」绝大多数是**列的值被加工**或**最左前缀被破坏**，少数是优化器的成本选择；
- 隐式转换的两个隐蔽来源——字符串比数字、JOIN 字符集不一致——是线上事故常客；
- 一切结论以 `EXPLAIN`（形态）+ `EXPLAIN ANALYZE`（实测）为准，不要背「某写法必失效」
  的教条：同一个写法在不同数据分布下可能走出完全不同的计划。
