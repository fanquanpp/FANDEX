---
order: 6
title: 窗口函数
module: sql
category: SQL
difficulty: advanced
description: 'OVER 子句、PARTITION BY、排名函数、偏移函数、帧定义与累计计算'
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/数据操作
  - sql/数据定义
  - sql/高级查询
  - sql/性能优化
prerequisites: []
---

# 窗口函数

## 概述

窗口函数（Window Functions）是 SQL:2003 引入的强大特性，它能在不折叠行的情况下执行跨行计算。与聚合函数不同，窗口函数不会将结果分组为单行，而是为每一行返回一个基于"窗口"的计算值。

```sql
-- 聚合函数：每组返回一行
SELECT department, AVG(salary) FROM employees GROUP BY department;

-- 窗口函数：每行都返回，包含组内计算结果
SELECT
  name,
  department,
  salary,
  AVG(salary) OVER(PARTITION BY department) AS dept_avg
FROM employees;
```

### 语法结构

```sql
函数名() OVER(
  [PARTITION BY 分组列]
  [ORDER BY 排序列]
  [帧定义]
)
```

## OVER 子句

`OVER` 是窗口函数的标志，定义了函数的"窗口"范围：

```sql
-- 无参数 OVER：整个表作为窗口
SELECT name, salary, AVG(salary) OVER() AS overall_avg
FROM employees;

-- OVER() 等价于聚合子查询
SELECT name, salary,
  (SELECT AVG(salary) FROM employees) AS overall_avg
FROM employees;
```

## PARTITION BY 分区

`PARTITION BY` 将数据按指定列分区，每个分区独立计算：

```sql
-- 按部门分区计算平均薪资
SELECT
  name,
  department,
  salary,
  AVG(salary) OVER(PARTITION BY department) AS dept_avg,
  salary - AVG(salary) OVER(PARTITION BY department) AS diff_from_avg
FROM employees;

-- 多列分区
SELECT
  order_id,
  customer_id,
  order_date,
  amount,
  SUM(amount) OVER(PARTITION BY customer_id, DATE_TRUNC('month', order_date)) AS monthly_total
FROM orders;

-- 多个窗口函数
SELECT
  name,
  department,
  salary,
  AVG(salary) OVER(PARTITION BY department) AS dept_avg,
  MAX(salary) OVER(PARTITION BY department) AS dept_max,
  MIN(salary) OVER() AS global_min
FROM employees;
```

### 窗口定义复用（WINDOW 子句）

```sql
SELECT
  name,
  department,
  salary,
  AVG(salary) OVER w AS dept_avg,
  MAX(salary) OVER w AS dept_max,
  RANK() OVER w AS dept_rank
FROM employees
WINDOW w AS (PARTITION BY department ORDER BY salary DESC);
```

## ORDER BY 与排名函数

### ROW_NUMBER

为每行分配唯一的连续序号，从 1 开始：

```sql
-- 全局排名
SELECT name, salary, ROW_NUMBER() OVER(ORDER BY salary DESC) AS rn
FROM employees;

-- 分区排名
SELECT
  name,
  department,
  salary,
  ROW_NUMBER() OVER(PARTITION BY department ORDER BY salary DESC) AS dept_rank
FROM employees;

-- Top N per group：每个部门薪资前 3 名
WITH ranked AS (
  SELECT *,
    ROW_NUMBER() OVER(PARTITION BY department ORDER BY salary DESC) AS rn
  FROM employees
)
SELECT * FROM ranked WHERE rn <= 3;

-- 去重：保留每组最新记录
WITH ranked AS (
  SELECT *,
    ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM user_actions
)
SELECT * FROM ranked WHERE rn = 1;
```

### RANK 与 DENSE_RANK

```sql
-- RANK: 同值同排名，跳号
-- DENSE_RANK: 同值同排名，不跳号
-- ROW_NUMBER: 同值不同排名，不跳号

SELECT
  name,
  score,
  ROW_NUMBER() OVER(ORDER BY score DESC) AS rn,
  RANK()       OVER(ORDER BY score DESC) AS rnk,
  DENSE_RANK() OVER(ORDER BY score DESC) AS drnk
FROM students;

-- 结果示例:
-- name    score  rn  rnk  drnk
-- Alice   95     1   1    1
-- Bob     95     2   1    1
-- Charlie 90     3   3    2
-- Diana   85     4   4    3
-- Eve     85     5   4    3
-- Frank   80     6   6    4
```

### NTILE

将行分为 N 个桶：

```sql
-- 将员工按薪资分为 4 个等级
SELECT
  name,
  salary,
  NTILE(4) OVER(ORDER BY salary DESC) AS quartile
FROM employees;

-- 用途: A/B 测试分组、分位数计算
```

### PERCENT_RANK 与 CUME_DIST

```sql
SELECT
  name,
  score,
  PERCENT_RANK() OVER(ORDER BY score) AS pct_rank,  -- (rank-1)/(total-1)
  CUME_DIST()     OVER(ORDER BY score) AS cume_dist  -- rank/total
FROM students;

-- PERCENT_RANK: 0 ~ 1，表示相对位置
-- CUME_DIST: 0 ~ 1，表示累积分布（小于等于当前值的比例）
```

## 偏移函数

### LEAD / LAG

访问当前行之前或之后的行数据：

```sql
-- LAG: 访问前 N 行
-- LEAD: 访问后 N 行
SELECT
  order_date,
  amount,
  LAG(amount) OVER(ORDER BY order_date) AS prev_amount,
  LEAD(amount) OVER(ORDER BY order_date) AS next_amount,
  amount - LAG(amount) OVER(ORDER BY order_date) AS diff
FROM daily_sales;

-- 指定偏移量和默认值
SELECT
  order_date,
  amount,
  LAG(amount, 7, 0) OVER(ORDER BY order_date) AS amount_7_days_ago
FROM daily_sales;

-- 计算环比增长率
SELECT
  month,
  revenue,
  LAG(revenue) OVER(ORDER BY month) AS prev_month,
  ROUND(
    (revenue - LAG(revenue) OVER(ORDER BY month)) * 100.0
    / NULLIF(LAG(revenue) OVER(ORDER BY month), 0),
    2
  ) AS growth_pct
FROM monthly_revenue;
```

### FIRST_VALUE / LAST_VALUE

```sql
-- FIRST_VALUE: 窗口内第一行的值
-- LAST_VALUE: 窗口内最后一行的值（注意帧定义！）
SELECT
  name,
  department,
  salary,
  FIRST_VALUE(salary) OVER(PARTITION BY department ORDER BY salary DESC) AS dept_max,
  LAST_VALUE(salary) OVER(
    PARTITION BY department ORDER BY salary DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS dept_min
FROM employees;

--  LAST_VALUE 的常见陷阱
-- 默认帧: ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
-- 所以 LAST_VALUE 默认返回当前行，不是窗口最后一行！
-- 必须显式指定 ROWS BETWEEN ... AND UNBOUNDED FOLLOWING

-- NTH_VALUE: 窗口内第 N 行的值
SELECT
  name,
  department,
  salary,
  NTH_VALUE(name, 2) OVER(PARTITION BY department ORDER BY salary DESC) AS second_highest
FROM employees;
```

## 帧定义（Frame Specification）

帧定义决定了窗口函数的计算范围。只有配合 `ORDER BY` 时帧才有意义。

### 帧语法

```sql
{ROWS | RANGE | GROUPS} BETWEEN 帧开始 AND 帧结束

-- 帧开始/结束选项:
-- UNBOUNDED PRECEDING  -- 窗口起点
-- N PRECEDING          -- 当前行之前 N 行
-- CURRENT ROW          -- 当前行
-- N FOLLOWING          -- 当前行之后 N 行
-- UNBOUNDED FOLLOWING  -- 窗口终点
```

### ROWS vs RANGE

```sql
-- ROWS: 基于物理行偏移
-- RANGE: 基于逻辑值偏移（ORDER BY 列的值）

-- 累计求和（ROWS）
SELECT
  order_date,
  amount,
  SUM(amount) OVER(
    ORDER BY order_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_total
FROM daily_sales;

-- RANGE: 同值的行一起计算
-- 如果同一天有多笔订单，RANGE 会将同一天的所有行一起包含
SELECT
  order_date,
  amount,
  SUM(amount) OVER(
    ORDER BY order_date
    RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_total
FROM daily_sales;

-- RANGE INTERVAL: 时间范围窗口（PostgreSQL）
SELECT
  order_date,
  amount,
  SUM(amount) OVER(
    ORDER BY order_date
    RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW
  ) AS rolling_7day_sum
FROM daily_sales;
```

### 常用帧模式

```sql
-- 1. 累计求和
SUM(col) OVER(ORDER BY sort_col ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)

-- 2. 滑动窗口（最近 N 行）
AVG(col) OVER(ORDER BY sort_col ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)  -- 7 行滑动平均

-- 3. 整个分区
SUM(col) OVER(PARTITION BY group_col)  -- 等价于不带 ORDER BY

-- 4. 前后各 N 行
AVG(col) OVER(ORDER BY sort_col ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING)
```

## 累计计算

### 累计求和

```sql
SELECT
  month,
  revenue,
  SUM(revenue) OVER(ORDER BY month) AS cumulative_revenue,
  SUM(revenue) OVER(ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cum_rev_explicit
FROM monthly_revenue;
```

### 累计计数

```sql
SELECT
  signup_date,
  COUNT(*) OVER(ORDER BY signup_date) AS cumulative_users
FROM (
  SELECT DATE(created_at) AS signup_date, COUNT(*) AS cnt
  FROM users
  GROUP BY DATE(created_at)
) t;
```

### 移动平均

```sql
-- 7 天移动平均
SELECT
  date,
  daily_sales,
  ROUND(AVG(daily_sales) OVER(
    ORDER BY date
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ), 2) AS ma_7day
FROM daily_sales;

-- 30 天移动平均
SELECT
  date,
  daily_sales,
  ROUND(AVG(daily_sales) OVER(
    ORDER BY date
    RANGE BETWEEN INTERVAL '29 days' PRECEDING AND CURRENT ROW
  ), 2) AS ma_30day
FROM daily_sales;
```

### 占比计算

```sql
-- 每行占分区总和的比例
SELECT
  department,
  salary,
  salary * 1.0 / SUM(salary) OVER(PARTITION BY department) AS pct_of_dept,
  salary * 1.0 / SUM(salary) OVER() AS pct_of_total
FROM employees;

-- 累计占比（帕累托分析）
SELECT
  product_name,
  revenue,
  SUM(revenue) OVER(ORDER BY revenue DESC) AS cumulative_revenue,
  SUM(revenue) OVER() AS total_revenue,
  ROUND(
    SUM(revenue) OVER(ORDER BY revenue DESC) * 100.0
    / SUM(revenue) OVER(),
    2
  ) AS cumulative_pct
FROM product_revenue
ORDER BY revenue DESC;
```

## 实战案例

### 连续登录天数

```sql
-- 核心思路: 登录日期 - ROW_NUMBER() = 分组标识
WITH daily_logins AS (
  SELECT DISTINCT user_id, DATE(login_time) AS login_date
  FROM user_logins
),
grouped AS (
  SELECT
    user_id,
    login_date,
    login_date - (ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY login_date))::INT AS grp
  FROM daily_logins
)
SELECT
  user_id,
  MIN(login_date) AS streak_start,
  MAX(login_date) AS streak_end,
  COUNT(*) AS streak_days
FROM grouped
GROUP BY user_id, grp
HAVING COUNT(*) >= 7  -- 至少连续 7 天
ORDER BY streak_days DESC;
```

### 同比/环比分析

```sql
WITH monthly AS (
  SELECT
    DATE_TRUNC('month', order_date) AS month,
    SUM(amount) AS revenue
  FROM orders
  GROUP BY month
)
SELECT
  month,
  revenue,
  -- 环比（上月）
  LAG(revenue, 1) OVER(ORDER BY month) AS prev_month,
  ROUND(
    (revenue - LAG(revenue, 1) OVER(ORDER BY month)) * 100.0
    / NULLIF(LAG(revenue, 1) OVER(ORDER BY month), 0), 2
  ) AS mom_growth,
  -- 同比（去年同月）
  LAG(revenue, 12) OVER(ORDER BY month) AS same_month_last_year,
  ROUND(
    (revenue - LAG(revenue, 12) OVER(ORDER BY month)) * 100.0
    / NULLIF(LAG(revenue, 12) OVER(ORDER BY month), 0), 2
  ) AS yoy_growth
FROM monthly;
```

### 去重取最新

```sql
-- 方法一：ROW_NUMBER（通用）
WITH ranked AS (
  SELECT *,
    ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY updated_at DESC) AS rn
  FROM user_profiles
)
SELECT * FROM ranked WHERE rn = 1;

-- 方法二：DISTINCT ON（PostgreSQL 专用，更简洁）
SELECT DISTINCT ON (user_id) *
FROM user_profiles
ORDER BY user_id, updated_at DESC;
```

## 小结

- 窗口函数是 SQL 最强大的分析工具，不折叠行即可执行跨行计算
- `ROW_NUMBER` 用于去重和 Top N，`RANK`/`DENSE_RANK` 用于排名
- `LAG`/`LEAD` 用于访问前后行，是计算环比/同比的基础
- `LAST_VALUE` 默认帧只到当前行，必须显式指定 `UNBOUNDED FOLLOWING`
- `ROWS` 基于物理行偏移，`RANGE` 基于逻辑值偏移，`RANGE INTERVAL` 适合时间窗口
- 累计求和、移动平均、占比计算是窗口函数的经典应用场景
