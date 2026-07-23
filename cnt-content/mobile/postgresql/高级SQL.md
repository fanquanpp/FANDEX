# PostgreSQL 高级 SQL

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 窗口函数

**换行写法：RANK 排名函数**
`RANK() OVER (PARTITION BY <列名> ORDER BY <列名> [ASC|DESC])`
```sql
-- 部门内薪资排名
SELECT name, dept_id, salary,
    RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rank
FROM employees;
```

**换行写法：DENSE_RANK 密集排名**
`DENSE_RANK() OVER (PARTITION BY <列名> ORDER BY <列名> [ASC|DESC])`
```sql
-- 部门内薪资密集排名
SELECT name, dept_id, salary,
    DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS dense_rank
FROM employees;
```

**换行写法：ROW_NUMBER 行号**
`ROW_NUMBER() OVER (PARTITION BY <列名> ORDER BY <列名> [ASC|DESC])`
```sql
-- 部门内按薪资生成行号
SELECT name, dept_id, salary,
    ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS row_num
FROM employees;
```

**换行写法：累计求和**
`SUM(<列名>) OVER (ORDER BY <列名>)`
```sql
-- 按日期累计求和
SELECT order_date, amount,
    SUM(amount) OVER (ORDER BY order_date) AS cumulative
FROM daily_sales;
```

**换行写法：移动平均**
`AVG(<列名>) OVER (ORDER BY <列名> ROWS BETWEEN <范围>)`
```sql
-- 7 日移动平均
SELECT order_date, amount,
    AVG(amount) OVER (ORDER BY order_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS moving_avg
FROM daily_sales;
```

**换行写法：LAG 访问前一行**
`LAG(<列名>[, <偏移量>[, <默认值>]]) OVER (ORDER BY <列名>)`
```sql
-- 计算环比变化
SELECT order_date, amount,
    amount - LAG(amount) OVER (ORDER BY order_date) AS day_over_day
FROM daily_sales;
```

**换行写法：LEAD 访问后一行**
`LEAD(<列名>[, <偏移量>[, <默认值>]]) OVER (ORDER BY <列名>)`
```sql
-- 访问下一行的金额
SELECT order_date, amount,
    LEAD(amount) OVER (ORDER BY ORDER_DATE) AS next_day_amount
FROM daily_sales;
```

**换行写法：FILTER 条件聚合**
`<聚合函数>(*) FILTER (WHERE <条件>)`
```sql
-- 条件聚合统计高收入人数
SELECT dept_id,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE salary > 50000) AS high_earners
FROM employees
GROUP BY dept_id;
```

---

## CTE 与递归 CTE

**换行写法：普通 CTE**
`WITH <CTE 名称> AS (<SELECT 语句>) SELECT ...`
```sql
-- 使用 CTE 简化复杂查询
WITH dept_stats AS (
    SELECT dept_id, AVG(salary) AS avg_salary
    FROM employees GROUP BY dept_id
)
SELECT e.name, e.salary, ds.avg_salary
FROM employees e JOIN dept_stats ds ON e.dept_id = ds.dept_id;
```

**换行写法：递归 CTE**
`WITH RECURSIVE <CTE 名称> AS (<基础查询> UNION ALL <递归查询>) SELECT ...`
```sql
-- 递归查询组织树
WITH RECURSIVE org_tree AS (
    SELECT emp_id, name, manager_id, 1 AS level
    FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.emp_id, e.name, e.manager_id, ot.level + 1
    FROM employees e JOIN org_tree ot ON e.manager_id = ot.emp_id
)
SELECT * FROM org_tree;
```

---

## 横向连接

**换行写法：LATERAL 横向连接**
`SELECT <列名> FROM <表1>, LATERAL (<子查询>) AS <别名>`
```sql
-- 每行执行子查询获取前 3 名
SELECT d.dept_name, top3.name, top3.salary
FROM departments d,
LATERAL (
    SELECT name, salary FROM employees
    WHERE dept_id = d.id
    ORDER BY salary DESC LIMIT 3
) top3;
```

---

## 分组集

**换行写法：ROLLUP 层次汇总**
`GROUP BY ROLLUP (<列名>[, <列名>...])`
```sql
-- 按部门和职位层次汇总薪资
SELECT dept_id, job_title, SUM(salary)
FROM employees
GROUP BY ROLLUP (dept_id, job_title);
```

**换行写法：CUBE 多维汇总**
`GROUP BY CUBE (<列名>[, <列名>...])`
```sql
-- 按部门和职位多维汇总薪资
SELECT dept_id, job_title, SUM(salary)
FROM employees
GROUP BY CUBE (dept_id, job_title);
```

**换行写法：GROUPING SETS 自定义分组集**
`GROUP BY GROUPING SETS ((<列组合1>), (<列组合2>), ...)`
```sql
-- 自定义分组集汇总薪资
SELECT dept_id, job_title, SUM(salary)
FROM employees
GROUP BY GROUPING SETS ((dept_id, job_title), (dept_id), ());
```
