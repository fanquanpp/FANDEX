---
order: 220
title: 差集与交集：EXCEPT 与 INTERSECT
module: 'sql'
category: 数据库
difficulty: beginner
description: 用 EXCEPT 求"有 A 没 B"、用 INTERSECT 求"两个都有"，掌握集合操作的重复行语义、NULL 处理、方言差异与替代写法。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'sql/210-SetOperation'
  - 'sql/180-SemiAntiJoin'
  - 'sql/150-JoinQuery'
prerequisites:
  - 'sql/210-SetOperation'
---

## 1. 一句话入门

UNION 负责"合在一起"，本篇的两位主角则回答两类更高频的业务问题：

- **EXCEPT（差集）**：在 A 中但不在 B 中——"哪些用户注册了却从没下过单？"
- **INTERSECT（交集）**：在 A 中也在 B 中——"哪些客户去年和今年都下了单？"

两者都是 SQL:92 标准就有的集合操作，写法与 `UNION` 完全同构：

```sql
<查询 1>  EXCEPT     [ALL | DISTINCT]  <查询 2>
<查询 1>  INTERSECT  [ALL | DISTINCT]  <查询 2>
```

## 2. 准备练习数据

下面两张表贯穿全篇，可直接粘贴到 PostgreSQL / MySQL 8.0.31+ / SQLite 运行：

```sql
CREATE TABLE buyers_2025 (customer_id INT);
CREATE TABLE buyers_2026 (customer_id INT);

INSERT INTO buyers_2025 VALUES (1), (2), (3), (3);
INSERT INTO buyers_2026 VALUES (3), (3), (4), (5);
```

数据长这样（注意 3 在两边都有重复）：

```
buyers_2025: 1, 2, 3, 3        buyers_2026: 3, 3, 4, 5
```

## 3. INTERSECT：交集

### 3.1 基本语义

返回"两个结果集中都存在"的行，**默认去重**（等价于 `INTERSECT DISTINCT`）：

```sql
SELECT customer_id FROM buyers_2025
INTERSECT
SELECT customer_id FROM buyers_2026;
```

```
 customer_id
-------------
           3
(1 行)
```

只有 3 两边都出现过，所以结果只有一行；尽管 3 在两边各有两份，去重后也只保留一份。

### 3.2 INTERSECT ALL：保留重复

`INTERSECT ALL` 按"取较小份数"保留重复行：某值在左边出现 m 次、右边出现 n 次，结果中出现 `min(m, n)` 次。

```sql
SELECT customer_id FROM buyers_2025
INTERSECT ALL
SELECT customer_id FROM buyers_2026;
```

```
 customer_id
-------------
           3
           3
(2 行)          -- min(2, 2) = 2
```

## 4. EXCEPT：差集

### 4.1 基本语义

返回"在第一个结果集中、但不在第二个结果集中"的行，**默认去重**。差集有方向性：`A EXCEPT B` 与 `B EXCEPT A` 通常不是一回事。

```sql
SELECT customer_id FROM buyers_2025
EXCEPT
SELECT customer_id FROM buyers_2026;
```

```
 customer_id
-------------
           1
           2
(2 行)          -- 3 两边都有，被减掉了
```

反方向则完全不同：

```sql
SELECT customer_id FROM buyers_2026
EXCEPT
SELECT customer_id FROM buyers_2025;
```

```
 customer_id
-------------
           4
           5
(2 行)
```

### 4.2 EXCEPT ALL：按份数相减

`EXCEPT ALL` 做的是"多重集合减法"：某值左边有 m 份、右边有 n 份，结果保留 `max(m - n, 0)` 份。

```sql
SELECT customer_id FROM buyers_2025
EXCEPT ALL
SELECT customer_id FROM buyers_2026;
```

```
 customer_id
-------------
           1
           2
           3        -- 左边 2 份 - 右边 2 份 = 0？不：左边 3 有 2 份，右边 3 有 2 份
```

等一下——3 是 `max(2 - 2, 0) = 0` 份，所以实际输出只有 1 和 2。把右表改成只有一份 3 再看：

```sql
DELETE FROM buyers_2026 WHERE customer_id = 3 AND 3 = 3;
INSERT INTO buyers_2026 VALUES (3);   -- 现在右表只有 1 份 3

SELECT customer_id FROM buyers_2025
EXCEPT ALL
SELECT customer_id FROM buyers_2026;
```

```
 customer_id
-------------
           1
           2
           3        -- max(2 - 1, 0) = 1 份
(3 行)
```

> **EXCEPT 与去重的关系**：`A EXCEPT B` 等价于 `A EXCEPT ALL B` 再 `DISTINCT`。
> 如果业务在意"出现次数"，必须写 `EXCEPT ALL`。

## 5. 方言支持速查

| 数据库         | INTERSECT | EXCEPT | ALL 变体            | 备注                       |
| -------------- | --------- | ------ | ------------------- | -------------------------- |
| PostgreSQL     | 支持      | 支持   | 支持 ALL/DISTINCT   | 语义最完整的开源实现       |
| MySQL          | 8.0.31+   | 8.0.31+ | 8.0.31+ 支持 ALL   | 8.0.31（2022-10）之前完全没有 |
| MariaDB        | 10.3+     | 10.3+  | 支持 EXCEPT ALL 等  | 早于 MySQL 官方实现        |
| SQLite         | 支持      | 支持   | 不支持 ALL          | 默认即 DISTINCT            |
| SQL Server     | 支持      | 支持   | 不支持 ALL          | 语法与标准一致             |
| Oracle         | 支持      | 叫 MINUS | 不支持 ALL        | `MINUS` 是历史名称         |

```sql
-- Oracle 用户请把 EXCEPT 换成 MINUS，其余不变
SELECT customer_id FROM buyers_2025
MINUS
SELECT customer_id FROM buyers_2026;
```

MySQL 8.0.31 起还按 SQL 标准实现了优先级：**INTERSECT 的结合优先级高于 UNION 和 EXCEPT**，`A UNION B INTERSECT C` 等价于 `A UNION (B INTERSECT C)`。

## 6. 旧版 MySQL / 通用替代写法

在 MySQL 8.0.31 之前或需要跨库兼容时，交集与差集有三种经典替身。它们的语义差异主要在**重复行**与 **NULL** 上。

### 6.1 交集替代

```sql
-- 写法一：INNER JOIN（可保留重复，看写法）
SELECT DISTINCT a.customer_id
FROM buyers_2025 a
JOIN buyers_2026 b ON a.customer_id = b.customer_id;

-- 写法二：IN 子查询
SELECT customer_id FROM buyers_2025
WHERE customer_id IN (SELECT customer_id FROM buyers_2026);

-- 写法三：EXISTS（大表时通常最优，命中索引即可短路返回）
SELECT a.customer_id FROM buyers_2025 a
WHERE EXISTS (SELECT 1 FROM buyers_2026 b WHERE b.customer_id = a.customer_id);
```

### 6.2 差集替代

```sql
-- 写法一：LEFT JOIN + IS NULL（反连接，可读性好）
SELECT a.customer_id
FROM buyers_2025 a
LEFT JOIN buyers_2026 b ON a.customer_id = b.customer_id
WHERE b.customer_id IS NULL;

-- 写法二：NOT EXISTS（NULL 安全，推荐）
SELECT a.customer_id FROM buyers_2025 a
WHERE NOT EXISTS (SELECT 1 FROM buyers_2026 b WHERE b.customer_id = a.customer_id);

-- 写法三：NOT IN（有 NULL 陷阱，见 8.2）
SELECT customer_id FROM buyers_2025
WHERE customer_id NOT IN (SELECT customer_id FROM buyers_2026);
```

> **EXCEPT 与 NOT EXISTS 的关键差异**：`EXCEPT` 按行值比较且把 NULL 当作相等；
> `NOT EXISTS` / `LEFT JOIN` 走"谓词判断"，同样能正确跳过 NULL。
> 唯独 `NOT IN` 在子查询结果含 NULL 时会整体返回空集——这是 8.2 节的头号陷阱。

## 7. 组合规则与排序

### 7.1 三条硬规则

1. 两侧查询的**列数必须相同**；
2. 对应列**类型可比较**（不必完全一致，但隐式转换可能吞索引）；
3. 结果的**列名取自第一个查询**。

```sql
SELECT customer_id, '2025' AS y FROM buyers_2025
UNION ALL
SELECT customer_id, '2026'    FROM buyers_2026;
-- 第二个查询里的 '2026' 没有别名，列名仍然叫 y
```

### 7.2 ORDER BY 只能写在最后

```sql
SELECT customer_id FROM buyers_2025
INTERSECT
SELECT customer_id FROM buyers_2026
ORDER BY customer_id;          -- 作用于整个交集结果，合法

-- 想先给单个子查询排序再 LIMIT，用括号包裹（PG/MySQL 支持）
(SELECT customer_id FROM buyers_2025 ORDER BY customer_id LIMIT 2)
EXCEPT
(SELECT customer_id FROM buyers_2026 ORDER BY customer_id LIMIT 2);
```

## 8. 常见陷阱

### 8.1 以为 EXCEPT ALL 是"去重版"

两者方向恰好相反：`EXCEPT`（DISTINCT）先按值归并再相减，`EXCEPT ALL` 才保留份数。做"对账/库存"这类在意次数的场景，误用 DISTINCT 版会悄悄少数据。

### 8.2 NOT IN 遇到 NULL 全军覆没

```sql
INSERT INTO buyers_2026 VALUES (NULL);

-- 意图：找 2025 买过、2026 没买的客户
SELECT customer_id FROM buyers_2025
WHERE customer_id NOT IN (SELECT customer_id FROM buyers_2026);
-- 结果：0 行！

-- 原因：NOT IN 展开为 x <> 1 AND x <> 2 ... AND x <> NULL
-- 任何值与 NULL 比较结果都是 UNKNOWN，整个 AND 链永远无法为 TRUE
```

三个修复方向：子查询里先 `WHERE customer_id IS NOT NULL`、改用 `NOT EXISTS`、
或直接用 `EXCEPT`（它把 NULL 视为相等，行为反而符合直觉）。

### 8.3 集合操作里 NULL 被视为相等

普通 `WHERE` 中 `NULL = NULL` 是 UNKNOWN，但集合操作按"整行值相同"判定：

```sql
SELECT NULL AS v
INTERSECT
SELECT NULL AS v;
-- 返回 1 行 NULL（不会被去重逻辑剔除）
```

### 8.4 列顺序有意义，列名没有

匹配按**位置**进行，不是按列名。`SELECT id, name` 对上 `SELECT name, id`，等于拿 id 跟 name 比，轻则空结果，重则静默错配。

## 9. 分层小结

- **入门**：EXCEPT 求差集、INTERSECT 求交集；默认去重，列数一致、按位置匹配、ORDER BY 放最后。
- **进阶**：ALL 变体控制重复行——`INTERSECT ALL` 取 `min(m, n)` 份，`EXCEPT ALL` 取 `max(m - n, 0)` 份；MySQL 8.0.31 起全家桶齐活，Oracle 用 MINUS。
- **实战**：旧版兼容优先 `NOT EXISTS`（NULL 安全）；`NOT IN` 先排除 NULL；在意出现次数的场景别用 DISTINCT 版。
