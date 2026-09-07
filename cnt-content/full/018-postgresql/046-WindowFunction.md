---
order: 460
title: PostgreSQL 窗口函数
module: 'postgresql'
category: 数据库
difficulty: beginner
description: PostgreSQL 窗口函数 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## 排名函数

**换行写法：ROW_NUMBER 行号**
`ROW_NUMBER() OVER (PARTITION BY <列> ORDER BY <列> [ASC|DESC])`
```sql
-- 部门内按薪资生成行号
SELECT name, dept_id, salary,
  ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS row_num
FROM employees;
```

**换行写法：RANK 排名（带跳跃）**
`RANK() OVER (PARTITION BY <列> ORDER BY <列> [ASC|DESC])`
```sql
-- 部门内薪资排名（同值跳号）
SELECT name, dept_id, salary,
  RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rank
FROM employees;
```

**换行写法：DENSE_RANK 密集排名**
`DENSE_RANK() OVER (PARTITION BY <列> ORDER BY <列> [ASC|DESC])`
```sql
-- 部门内薪资密集排名（同值不跳号）
SELECT name, dept_id, salary,
  DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS dense_rank
FROM employees;
```

**换行写法：PERCENT_RANK 百分比排名**
`PERCENT_RANK() OVER (PARTITION BY <列> ORDER BY <列>)`
```sql
-- 计算百分比排名（0 到 1）
SELECT name, salary,
  PERCENT_RANK() OVER (ORDER BY salary DESC) AS pct_rank
FROM employees;
```

**换行写法：CUME_DIST 累积分布**
`CUME_DISTRIB() OVER (PARTITION BY <列> ORDER BY <列>)`
```sql
-- 计算累积分布比例
SELECT name, salary,
  CUME_DIST() OVER (ORDER BY salary ASC) AS cume_dist
FROM employees;
```

**换行写法：NTILE 分桶**
`NTILE(<桶数>) OVER (PARTITION BY <列> ORDER BY <列>)`
```sql
-- 将数据等分为 4 个桶
SELECT name, salary,
  NTILE(4) OVER (ORDER BY salary DESC) AS quartile
FROM employees;
```

---

## 偏移函数

**换行写法：LAG 访问前一行**
`LAG(<列>[, <偏移量>[, <默认值>]]) OVER (ORDER BY <列>)`
```sql
-- 计算环比变化
SELECT order_date, amount,
  amount - LAG(amount) OVER (ORDER BY order_date) AS day_over_day
FROM daily_sales;
```

**换行写法：LEAD 访问后一行**
`LEAD(<列>[, <偏移量>[, <默认值>]]) OVER (ORDER BY <列>)`
```sql
-- 访问下一行金额
SELECT order_date, amount,
  LEAD(amount) OVER (ORDER BY order_date) AS next_day_amount
FROM daily_sales;
```

**换行写法：FIRST_VALUE 第一行值**
`FIRST_VALUE(<列>) OVER (PARTITION BY <列> ORDER BY <列>)`
```sql
-- 获取每个部门最低薪资
SELECT name, dept_id, salary,
  FIRST_VALUE(salary) OVER (PARTITION BY dept_id ORDER BY salary ASC) AS min_salary
FROM employees;
```

**换行写法：LAST_VALUE 末尾值**
`LAST_VALUE(<列>) OVER (PARTITION BY <列> ORDER BY <列> ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)`
```sql
-- 获取每个部门最高薪资
SELECT name, dept_id, salary,
  LAST_VALUE(salary) OVER (
    PARTITION BY dept_id ORDER BY salary
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS max_salary
FROM employees;
```

**换行写法：NTH_VALUE 第 N 行值**
`NTH_VALUE(<列>, <N>) OVER (PARTITION BY <列> ORDER BY <列>)`
```sql
-- 获取部门内第 2 高薪资
SELECT name, dept_id, salary,
  NTH_VALUE(salary, 2) OVER (PARTITION BY dept_id ORDER BY salary DESC) AS second_salary
FROM employees;
```

---

## 聚合窗口函数

**换行写法：累计求和**
`SUM(<列>) OVER (ORDER BY <列> ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)`
```sql
-- 按日期累计求和
SELECT order_date, amount,
  SUM(amount) OVER (ORDER BY order_date) AS cumulative
FROM daily_sales;
```

**换行写法：移动平均**
`AVG(<列>) OVER (ORDER BY <列> ROWS BETWEEN <N> PRECEDING AND CURRENT ROW)`
```sql
-- 7 日移动平均
SELECT order_date, amount,
  AVG(amount) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg
FROM daily_sales;
```

**换行写法：分组累计求和**
`SUM(<列>) OVER (PARTITION BY <列> ORDER BY <列>)`
```sql
-- 每个用户订单金额累计
SELECT user_id, order_date, amount,
  SUM(amount) OVER (PARTITION BY user_id ORDER BY order_date) AS cumulative
FROM orders;
```

**换行写法：分组占比**
`SELECT <列>, <列> / SUM(<列>) OVER (PARTITION BY <列>) AS ratio`
```sql
-- 计算每个用户订单金额占该用户总金额的比例
SELECT user_id, order_no, amount,
  amount / SUM(amount) OVER (PARTITION BY user_id) AS ratio
FROM orders;
```

**换行写法：累计计数**
`COUNT(<列>) OVER (ORDER BY <列>)`
```sql
-- 按日期累计计数
SELECT order_date,
  COUNT(*) OVER (ORDER BY order_date) AS cumulative_count
FROM orders;
```

---

## 窗口范围控制

**换行写法：ROWS 范围**
`<函数>() OVER (ORDER BY <列> ROWS BETWEEN <起> AND <止>)`
```sql
-- 指定行范围窗口
SELECT order_date, amount,
  AVG(amount) OVER (
    ORDER BY order_date
    ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING
  ) AS window_avg
FROM daily_sales;
```

**换行写法：RANGE 范围**
`<函数>() OVER (ORDER BY <列> RANGE BETWEEN <起> AND <止>)`
```sql
-- 按值范围窗口
SELECT order_date, amount,
  SUM(amount) OVER (
    ORDER BY order_date
    RANGE BETWEEN INTERVAL '7' DAY PRECEDING AND CURRENT ROW
  ) AS weekly_sum
FROM daily_sales;
```

**换行写法：UNBOUNDED 无界限**
`<函数>() OVER (ORDER BY <列> ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)`
```sql
-- 整个分区作为窗口
SELECT name, salary,
  AVG(salary) OVER (
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS overall_avg
FROM employees;
```

---

## FILTER 条件聚合

**换行写法：FILTER 条件聚合**
`<聚合函数>(<列>) FILTER (WHERE <条件>) OVER (...)`
```sql
-- 条件聚合统计高收入人数
SELECT dept_id,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE salary > 50000) AS high_earners,
  AVG(salary) FILTER (WHERE gender = 'M') AS male_avg
FROM employees
GROUP BY dept_id;
```

**换行写法：FILTER 窗口函数组合**
`SUM(<列>) FILTER (WHERE <条件>) OVER (PARTITION BY <列>)`
```sql
-- 每个部门高薪累计
SELECT name, dept_id, salary,
  SUM(salary) FILTER (WHERE salary > 50000) OVER (PARTITION BY dept_id) AS high_salary_sum
FROM employees;
```

---

## 命名窗口

**换行写法：WINDOW 子句定义命名窗口**
`SELECT <列>, <函数>() OVER <窗口名> FROM <表> WINDOW <窗口名> AS (PARTITION BY <列> ORDER BY <列>)`
```sql
-- 复用窗口定义
SELECT name, dept_id, salary,
  RANK() OVER w AS rank,
  DENSE_RANK() OVER w AS dense_rank,
  ROW_NUMBER() OVER w AS row_num
FROM employees
WINDOW w AS (PARTITION BY dept_id ORDER BY salary DESC);
```

---

## 常见应用场景

**换行写法：取每组前 N 行**
`SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY <列> ORDER BY <列>) AS rn FROM <表>) WHERE rn <= <N>`
```sql
-- 取每个部门薪资前 3 的员工
SELECT * FROM (
  SELECT name, dept_id, salary,
    ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rn
  FROM employees
) ranked
WHERE rn <= 3;
```

**换行写法：去除重复行保留最新**
`SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY <列> ORDER BY <时间> DESC) AS rn FROM <表>) WHERE rn = 1`
```sql
-- 每个用户保留最新一条登录记录
SELECT * FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_time DESC) AS rn
  FROM user_logins
) latest
WHERE rn = 1;
```
