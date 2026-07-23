# 窗口函数

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 基本语法

**换行写法：OVER 子句定义窗口框架**
`<窗口函数>() OVER ([PARTITION BY <列>] [ORDER BY <列>] [frame_clause])`
```sql
-- 使用 OVER 子句定义窗口
SELECT
  column1,
  column2,
  window_function() OVER (
    PARTITION BY partition_column
    ORDER BY sort_column
  ) AS alias
FROM table_name;
```

---

## ROW_NUMBER 行号

**换行写法：全局行号**
`ROW_NUMBER() OVER (ORDER BY <列>)`
```sql
-- 按薪资降序生成全局行号
SELECT
  name,
  salary,
  ROW_NUMBER() OVER (ORDER BY salary DESC) AS row_num
FROM employees;
```

**换行写法：分部门行号**
`ROW_NUMBER() OVER (PARTITION BY <列> ORDER BY <列>)`
```sql
-- 按部门分组后按薪资降序生成行号
SELECT
  name,
  department,
  salary,
  ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank
FROM employees;
```

---

## RANK 排名

**换行写法：允许并列跳号排名**
`RANK() OVER (ORDER BY <列>)`
```sql
-- 按薪资降序排名（允许并列，跳号：1, 2, 2, 4, 5）
SELECT
  name,
  salary,
  RANK() OVER (ORDER BY salary DESC) AS rank_num
FROM employees;
```

---

## DENSE_RANK 密集排名

**换行写法：允许并列不跳号排名**
`DENSE_RANK() OVER (ORDER BY <列>)`
```sql
-- 按薪资降序密集排名（允许并列，不跳号：1, 2, 2, 3, 4）
SELECT
  name,
  salary,
  DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rank_num
FROM employees;
```

---

## NTILE 分桶

**换行写法：将数据分为 N 个桶**
`NTILE(<N>) OVER (ORDER BY <列>)`
```sql
-- 按薪资降序分为 4 个桶（四分位数）
SELECT
  name,
  salary,
  NTILE(4) OVER (ORDER BY salary DESC) AS quartile
FROM employees;
```

---

## SUM OVER 累计求和

**换行写法：全局累计求和**
`SUM(<列>) OVER (ORDER BY <列>)`
```sql
-- 按日期累计求和
SELECT
  order_date,
  amount,
  SUM(amount) OVER (ORDER BY order_date) AS running_total
FROM orders;
```

**换行写法：分组累计求和**
`SUM(<列>) OVER (PARTITION BY <列> ORDER BY <列>)`
```sql
-- 按部门分组后按入职日期累计求和
SELECT
  department,
  name,
  salary,
  SUM(salary) OVER (PARTITION BY department ORDER BY hire_date) AS dept_running_total
FROM employees;
```

---

## AVG OVER 移动平均

**换行写法：3 天移动平均**
`AVG(<列>) OVER (ORDER BY <列> ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)`
```sql
-- 计算 3 天移动平均价格
SELECT
  date,
  price,
  AVG(price) OVER (
    ORDER BY date
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  ) AS moving_avg_3day
FROM stock_prices;
```

---

## LAG 偏移函数

**换行写法：访问前 1 行的值**
`LAG(<列>, 1) OVER (ORDER BY <列>)`
```sql
-- 查询前一天的价格及价格变化
SELECT
  date,
  price,
  LAG(price, 1) OVER (ORDER BY date) AS prev_price,
  price - LAG(price, 1) OVER (ORDER BY date) AS price_change
FROM stock_prices;
```

**换行写法：指定偏移量和默认值**
`LAG(<列>, <offset>, <default>) OVER (ORDER BY <列>)`
```sql
-- 查询 7 天前的价格，无值时返回 0
SELECT
  date,
  price,
  LAG(price, 7, 0) OVER (ORDER BY date) AS price_7_days_ago
FROM stock_prices;
```

---

## LEAD 偏移函数

**换行写法：访问后 1 行的值**
`LEAD(<列>, 1) OVER (ORDER BY <列>)`
```sql
-- 查询后一天的价格
SELECT
  date,
  price,
  LEAD(price, 1) OVER (ORDER BY date) AS next_price
FROM stock_prices;
```

---

## FIRST_VALUE / LAST_VALUE

**换行写法：窗口首值**
`FIRST_VALUE(<列>) OVER (PARTITION BY <列> ORDER BY <列>)`
```sql
-- 查询每个部门薪资最高的员工
SELECT
  name,
  department,
  salary,
  FIRST_VALUE(name) OVER (PARTITION BY department ORDER BY salary DESC) AS highest_paid
FROM employees;
```

**换行写法：窗口尾值**
`LAST_VALUE(<列>) OVER (PARTITION BY <列> ORDER BY <列> ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)`
```sql
-- 查询每个部门薪资最低的员工
SELECT
  name,
  department,
  salary,
  LAST_VALUE(name) OVER (
    PARTITION BY department
    ORDER BY salary DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS lowest_paid
FROM employees;
```

---

## CUME_DIST 累积分布

**换行写法：累积分布（0 到 1）**
`CUME_DIST() OVER (ORDER BY <列>)`
```sql
-- 计算薪资的累积分布
SELECT
  name,
  salary,
  CUME_DIST() OVER (ORDER BY salary) AS cume_dist
FROM employees;
```

---

## PERCENT_RANK 百分位排名

**换行写法：百分位排名（0 到 1）**
`PERCENT_RANK() OVER (ORDER BY <列>)`
```sql
-- 计算薪资的百分位排名
SELECT
  name,
  salary,
  PERCENT_RANK() OVER (ORDER BY salary) AS percent_rank
FROM employees;
```

---

## ROWS BETWEEN 行范围

**换行写法：从第一行到当前行**
`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`
```sql
-- 累计求和（从第一行到当前行）
SUM(amount) OVER (
  ORDER BY date
  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
)
```

**换行写法：前 2 行到后 2 行**
`ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING`
```sql
-- 计算 5 天移动平均（前 2 行到后 2 行）
AVG(price) OVER (
  ORDER BY date
  ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING
)
```

---

## RANGE BETWEEN 值范围

**换行写法：按逻辑值范围累计求和**
`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`
```sql
-- 同一薪资值的行被视为一组进行累计求和
SELECT
  name,
  salary,
  SUM(salary) OVER (
    ORDER BY salary
    RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_total
FROM employees;
```

---

## NTH_VALUE

**换行写法：窗口第 N 行的值**
`NTH_VALUE(<列>, <N>) OVER (...)`
```sql
-- 查询每个部门薪资第 3 高的员工
SELECT
  name,
  department,
  salary,
  NTH_VALUE(salary, 3) OVER (
    PARTITION BY department
    ORDER BY salary DESC
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS third_highest
FROM employees;
```

---

## Top-N 查询

**换行写法：ROW_NUMBER 实现 Top-N**
`ROW_NUMBER() OVER (PARTITION BY <列> ORDER BY <列>)`
```sql
-- 查询每个部门薪资前 3 名
SELECT * FROM (
  SELECT
    name,
    department,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
  FROM employees
) ranked
WHERE rn <= 3;
```

---

## 去重

**换行写法：DISTINCT 与窗口函数去重**
`SELECT DISTINCT ... FROM (SELECT ... ROW_NUMBER() OVER (...))`
```sql
-- 去重保留每个用户的最新记录
SELECT DISTINCT user_id, latest_action
FROM (
  SELECT
    user_id,
    action AS latest_action,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS rn
  FROM user_actions
) t
WHERE rn = 1;
```
