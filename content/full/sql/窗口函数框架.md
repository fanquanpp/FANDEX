---
order: 100
title: 窗口函数框架
module: sql
category: database
difficulty: advanced
description: 'SQL 窗口函数框架详解：ROWS BETWEEN 与 RANGE BETWEEN 窗口帧定义、滑动窗口计算、累计聚合与排名函数的底层机制。'
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/锁机制
  - sql/多版本并发控制
  - sql/递归CTE遍历树结构
  - sql/乐观锁与悲观锁
prerequisites:
  - sql/概述与标准
---

## 1. 窗口函数基础架构

### 1.1 窗口函数执行模型

窗口函数（Window Function）在 SQL 标准中称为**OLAP 函数**，其核心思想是在不改变结果集行数的前提下，为每一行计算一个基于"窗口"的聚合值。执行时机位于 `WHERE`、`GROUP BY`、`HAVING` 之后，`ORDER BY` 之前。

```sql
-- 窗口函数完整语法
function_name([expr]) OVER (
    [PARTITION BY partition_expr]
    [ORDER BY sort_expr [ASC|DESC] [NULLS {FIRST|LAST}]]
    [frame_clause]
)
```

**逻辑执行顺序**：

```
FROM → WHERE → GROUP BY → HAVING → 窗口函数 → ORDER BY → LIMIT
```

### 1.2 窗口函数分类

| 类别     | 函数                                                              | 特点              |
| -------- | ----------------------------------------------------------------- | ----------------- |
| 排名函数 | `ROW_NUMBER`, `RANK`, `DENSE_RANK`, `NTILE`                       | 需要 ORDER BY     |
| 偏移函数 | `LAG`, `LEAD`, `FIRST_VALUE`, `LAST_VALUE`, `NTH_VALUE`           | 访问同行/跨行数据 |
| 聚合函数 | `SUM`, `AVG`, `COUNT`, `MIN`, `MAX`                               | 支持 frame_clause |
| 分布函数 | `PERCENT_RANK`, `CUME_DIST`, `PERCENTILE_CONT`, `PERCENTILE_DISC` | 统计分布          |
| 取值函数 | `FIRST_VALUE`, `LAST_VALUE`, `NTH_VALUE`                          | 窗口帧内取值      |

> **关键区别**：排名函数和偏移函数的窗口帧默认为 `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`，而聚合函数的默认帧取决于是否指定 ORDER BY。

## 2. 窗口帧（Frame）详解

### 2.1 Frame 子句语法

```sql
{ROWS | RANGE | GROUPS} BETWEEN frame_start AND frame_end

-- frame_start / frame_end 可选值：
-- UNBOUNDED PRECEDING  | UNBOUNDED FOLLOWING
-- CURRENT ROW
-- <expr> PRECEDING     | <expr> FOLLOWING
```

### 2.2 ROWS BETWEEN：物理行偏移

`ROWS` 基于**物理行号**定义窗口帧，与排序后的实际行位置对应。

```sql
-- 累计求和：从分区首行到当前行
SUM(amount) OVER (
    PARTITION BY dept_id
    ORDER BY order_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
)

-- 滑动平均：当前行及前后各1行（3行窗口）
AVG(price) OVER (
    ORDER BY trade_time
    ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
)

-- 近5行移动平均
AVG(close_price) OVER (
    ORDER BY trade_date
    ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
)
```

**ROWS 窗口帧示意**（3 行滑动窗口）：

```
行号:  1    2    3    4    5    6    7
值:   10   20   30   40   50   60   70

行3的窗口: [10, 20, 30] → AVG = 20
行4的窗口: [20, 30, 40] → AVG = 30
行5的窗口: [30, 40, 50] → AVG = 40
```

### 2.3 RANGE BETWEEN：逻辑值偏移

`RANGE` 基于**ORDER BY 表达式的逻辑值**定义窗口帧，所有排序值相同的行属于同一个帧。

```sql
-- 同一天的所有记录视为同一帧
SUM(amount) OVER (
    ORDER BY order_date
    RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
)

-- 当前日期前后7天的范围
SUM(daily_revenue) OVER (
    ORDER BY order_date
    RANGE BETWEEN INTERVAL 7 DAY PRECEDING AND INTERVAL 7 DAY FOLLOWING
)

-- 数值范围：当前值 ± 100
COUNT(*) OVER (
    ORDER BY score
    RANGE BETWEEN 100 PRECEDING AND 100 FOLLOWING
)
```

**ROWS vs RANGE 的核心差异**：

```
排序值:  100  100  200  300  300  300  400
行号:     1    2    3    4    5    6    7

ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW:
  行1: [行1]           → SUM含1行
  行2: [行1,行2]       → SUM含2行
  行3: [行1,行2,行3]   → SUM含3行

RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW:
  行1: [行1,行2]       → 值100的行全部包含
  行2: [行1,行2]       → 同上
  行3: [行1,行2,行3]   → SUM含3行
  行4: [行1..行6]      → 值300的行全部包含
```

### 2.4 GROUPS BETWEEN：组级偏移

`GROUPS` 是 SQL:2011 标准引入，以**相同排序值的组**为单位进行偏移：

```sql
-- 当前组及前2组
SUM(amount) OVER (
    ORDER BY order_date
    GROUPS BETWEEN 2 PRECEDING AND CURRENT ROW
)
```

当排序值存在大量重复时，`GROUPS` 比 `ROWS` 更直观，比 `RANGE` 更灵活。

## 3. 窗口帧默认行为与陷阱

### 3.1 默认帧规则

| 场景                       | 默认帧                                                     |
| -------------------------- | ---------------------------------------------------------- |
| 有 ORDER BY，排名/偏移函数 | `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`        |
| 有 ORDER BY，聚合函数      | `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`        |
| 无 ORDER BY，聚合函数      | `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` |

### 3.2 LAST_VALUE 的常见陷阱

```sql
-- 错误写法：LAST_VALUE 返回当前行而非窗口最后一行
LAST_VALUE(score) OVER (
    PARTITION BY class_id
    ORDER BY score
) -- 默认帧: RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW

-- 正确写法：
LAST_VALUE(score) OVER (
    PARTITION BY class_id
    ORDER BY score
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
```

### 3.3 去重与排名的选择

```sql
-- 需求：每个部门薪水最高的员工
-- 方案1：ROW_NUMBER（严格去重，只取1条）
SELECT * FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) AS rn
    FROM employees
) t WHERE rn = 1;

-- 方案2：RANK（并列第一全部返回）
SELECT * FROM (
    SELECT *, RANK() OVER (PARTITION BY dept ORDER BY salary DESC) AS rk
    FROM employees
) t WHERE rk = 1;

-- 方案3：DENSE_RANK（并列第一，排名不跳号）
-- RANK:   1, 1, 3, 4
-- DENSE_RANK: 1, 1, 2, 3
```

## 4. 高级应用模式

### 4.1 环比与同比计算

```sql
-- 环比增长率
SELECT
    month,
    revenue,
    LAG(revenue, 1) OVER (ORDER BY month) AS prev_month,
    ROUND(
        (revenue - LAG(revenue, 1) OVER (ORDER BY month))
        / LAG(revenue, 1) OVER (ORDER BY month) * 100, 2
    ) AS mom_growth_rate
FROM monthly_sales;

-- 同比增长率（去年同期）
SELECT
    month,
    revenue,
    LAG(revenue, 12) OVER (ORDER BY month) AS prev_year_month,
    ROUND(
        (revenue - LAG(revenue, 12) OVER (ORDER BY month))
        / LAG(revenue, 12) OVER (ORDER BY month) * 100, 2
    ) AS yoy_growth_rate
FROM monthly_sales;
```

### 4.2 连续登录天数

```sql
-- 经典问题：计算每个用户最大连续登录天数
WITH daily_login AS (
    SELECT DISTINCT user_id, login_date
    FROM user_login_log
),
grouped AS (
    SELECT
        user_id,
        login_date,
        -- 日期减去行号，连续日期会得到相同的分组值
        DATE_SUB(login_date, INTERVAL ROW_NUMBER() OVER (
            PARTITION BY user_id ORDER BY login_date
        ) DAY) AS grp
    FROM daily_login
)
SELECT
    user_id,
    COUNT(*) AS max_streak
FROM grouped
GROUP BY user_id, grp
ORDER BY max_streak DESC;
```

### 4.3 会话分割

```sql
-- 将用户行为按30分钟间隔分割为不同会话
WITH events_with_prev AS (
    SELECT
        user_id,
        event_time,
        LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) AS prev_time
    FROM user_events
),
session_marked AS (
    SELECT
        user_id,
        event_time,
        CASE
            WHEN prev_time IS NULL THEN 1
            WHEN TIMESTAMPDIFF(MINUTE, prev_time, event_time) > 30 THEN 1
            ELSE 0
        END AS is_new_session
    FROM events_with_prev
),
session_id AS (
    SELECT
        user_id,
        event_time,
        SUM(is_new_session) OVER (
            PARTITION BY user_id ORDER BY event_time
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS session_id
    FROM session_marked
)
SELECT user_id, session_id, MIN(event_time) AS session_start, MAX(event_time) AS session_end
FROM session_id
GROUP BY user_id, session_id;
```

### 4.4 中位数与百分位数

```sql
-- 使用 PERCENTILE_CONT 计算中位数
SELECT
    department,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) AS median_salary,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY salary) AS p25_salary,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY salary) AS p75_salary
FROM employees
GROUP BY department;

-- 使用窗口函数手动计算中位数
SELECT AVG(salary) AS median_salary
FROM (
    SELECT
        salary,
        ROW_NUMBER() OVER (ORDER BY salary) AS rn,
        COUNT(*) OVER () AS cnt
    FROM employees
) t
WHERE rn IN (FLOOR((cnt + 1) / 2.0), CEIL((cnt + 1) / 2.0));
```

## 5. 性能优化

### 5.1 窗口函数执行计划

窗口函数的执行通常涉及**排序**操作，当 `PARTITION BY` + `ORDER BY` 无法利用索引时，数据库需要全量排序：

```sql
-- 查看执行计划
EXPLAIN ANALYZE
SELECT
    *,
    SUM(amount) OVER (PARTITION BY user_id ORDER BY order_date)
FROM orders;

-- 优化：创建覆盖索引
CREATE INDEX idx_orders_user_date ON orders(user_id, order_date, amount);
```

### 5.2 多窗口合并

```sql
-- 不推荐：多次 OVER 子句
SELECT
    SUM(a) OVER (PARTITION BY x ORDER BY y) AS s1,
    AVG(b) OVER (PARTITION BY x ORDER BY y) AS s2,
    MAX(c) OVER (PARTITION BY x ORDER BY y) AS s3
FROM t;

-- 推荐：命名窗口复用
SELECT
    SUM(a) OVER w AS s1,
    AVG(b) OVER w AS s2,
    MAX(c) OVER w AS s3
FROM t
WINDOW w AS (PARTITION BY x ORDER BY y);
```

### 5.3 大数据量下的替代方案

当数据量极大时，窗口函数的排序开销可能不可接受，可考虑：

- **预聚合表**：将窗口计算结果物化为中间表
- **增量计算**：利用 `LAG` 仅计算增量部分
- **近似算法**：使用 `HyperLogLog` 等近似去重替代精确 `COUNT(DISTINCT)`
