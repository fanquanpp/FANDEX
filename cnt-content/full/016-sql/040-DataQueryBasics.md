---
order: 40
title: 数据查询基础
module: 'sql'
category: 数据库
difficulty: beginner
description: SELECT 语句、WHERE 条件、排序、分页、去重、别名、表达式与聚合函数
author: fanquanpp
updated: '2026-09-13'
related:
  - 'sql/020-OverviewStandard'
  - 'sql/140-MultiTableQuery'
  - 'sql/120-DML'
prerequisites: []
---

## 学习目标

本文是「SQL」模块的第 4 篇，难度定位为入门。重点内容：SELECT 语句、WHERE 条件、排序、分页、去重、别名、表达式与聚合函数

主要章节：

- 0. 五分钟上手：五条最常用的查询（先读这里）
- WHERE 条件
- LIKE 模式匹配
- ORDER BY 排序
- LIMIT / OFFSET 分页
- DISTINCT 去重
- ……共 15 个章节

## 0. 五分钟上手：五条最常用的查询（先读这里）

假设有一张 `users` 表，前五次查询覆盖日常 90% 的需求：

**① 查询指定的几列**

```sql
SELECT name, age FROM users;
```

**讲解：** `SELECT` 后列出要看的列，用逗号分隔；只查需要的列能减少数据传输量。`SELECT *` 查全部列，方便但数据量大时慎用。

**② 只查满足条件的行**

```sql
SELECT * FROM users WHERE age > 18;
```

**讲解：** `WHERE` 是行级过滤器，只有满足条件的行才会返回；比较符包括 `>`、`<`、`>=`、`<=`、`=`、`<>`。

**③ 排序**

```sql
SELECT * FROM users ORDER BY age DESC;
```

**讲解：** `ORDER BY` 按指定列排序，`DESC` 表示从大到小（降序），`ASC` 表示从小到大（升序，默认）。多列排序用逗号分隔，如 `ORDER BY age DESC, name ASC`。

**④ 限制条数**

```sql
SELECT * FROM users LIMIT 5;
```

**讲解：** `LIMIT 5` 只返回前 5 行，常用于分页与预览；配合 `ORDER BY` 才能得到“前几名”的稳定结果。

**⑤ 统计数量**

```sql
SELECT COUNT(*) FROM users;
```

**讲解：** `COUNT(*)` 统计总行数，返回一个数字；`COUNT(列名)` 只统计该列非 `NULL` 的行。

**动手试试：** 在练习环境（如 SQLite）建一张 `users(id, name, age)` 表并插入几行数据，依次执行上面五条查询；再试着组合：`SELECT name FROM users WHERE age > 18 ORDER BY age DESC LIMIT 3`——你能说出它的含义吗？（答案：查询年龄大于 18 的用户名，按年龄从大到小排，只取前 3 个。）

下面各节会逐一展开 `WHERE`、`ORDER BY`、`LIMIT` 与聚合函数的细节。

## WHERE 条件

**单行写法：AND 组合条件**
`WHERE <条件 1> AND <条件 2>;`
```sql
-- 查询 IT 部门且薪资大于 80000 的员工
SELECT * FROM employees WHERE department = 'IT' AND salary > 80000;
```

**单行写法：OR 组合条件**
`WHERE <条件 1> OR <条件 2>;`
```sql
-- 查询 IT 或 HR 部门的员工
SELECT * FROM employees WHERE department = 'IT' OR department = 'HR';
```

**单行写法：NOT 取反条件**
`WHERE NOT <条件>;`
```sql
-- 查询非 IT 部门的员工
SELECT * FROM employees WHERE NOT department = 'IT';
```

**换行写法：括号组合条件**
`WHERE (<条件 1> OR <条件 2>) AND <条件 3>;`
```sql
-- 查询 IT 或 HR 部门且薪资大于 50000 的员工
SELECT * FROM employees
WHERE (department = 'IT' OR department = 'HR') AND salary > 50000;
```

---

## LIKE 模式匹配

**单行写法：前缀匹配**
`WHERE <列> LIKE '<前缀>%';`
```sql
-- 查询姓"张"的用户
SELECT * FROM users WHERE name LIKE '张%';
```

**单行写法：后缀匹配**
`WHERE <列> LIKE '%<后缀>';`
```sql
-- 查询 Gmail 邮箱用户
SELECT * FROM users WHERE email LIKE '%@gmail.com';
```

**单行写法：包含匹配**
`WHERE <列> LIKE '%<关键字>%';`
```sql
-- 查询名字包含"华"的用户
SELECT * FROM users WHERE name LIKE '%华%';
```

**单行写法：单字符匹配**
`WHERE <列> LIKE '<前缀>_<后缀>';`
```sql
-- 查询 138 开头 1234 结尾的 11 位手机号
SELECT * FROM users WHERE phone LIKE '138____1234';
```

**单行写法：排除模式**
`WHERE <列> NOT LIKE '<模式>';`
```sql
-- 查询名字不以 admin 开头的用户
SELECT * FROM users WHERE name NOT LIKE 'admin%';
```

---

### NULL 处理

NULL 是 SQL 中的特殊值，表示"未知"或"不存在"，需要特别对待：

```sql
--  错误：NULL 不能用 = 比较
SELECT * FROM users WHERE phone = NULL;      -- 返回 0 行

--  正确：使用 IS NULL
SELECT * FROM users WHERE phone IS NULL;     -- 没有 phone 的用户
SELECT * FROM users WHERE phone IS NOT NULL; -- 有 phone 的用户

-- NULL 与三值逻辑
-- NULL = NULL  → UNKNOWN（不是 TRUE）
-- NULL <> 1    → UNKNOWN（不是 TRUE）
-- NULL + 1     → NULL
-- NULL AND TRUE → UNKNOWN
-- NULL OR TRUE  → TRUE

-- COALESCE: 返回第一个非 NULL 值
SELECT name, COALESCE(phone, '未填写') AS phone_display FROM users;

-- NULLIF: 如果相等则返回 NULL
SELECT NULLIF(score, 0) AS safe_score FROM results; -- 避免除以零
```

## ORDER BY 排序

```sql
-- 升序（默认）
SELECT * FROM employees ORDER BY salary ASC;

-- 降序
SELECT * FROM employees ORDER BY salary DESC;

-- 多列排序（优先级从左到右）
SELECT * FROM employees ORDER BY department ASC, salary DESC;

-- 按表达式排序
SELECT * FROM products ORDER BY price * discount DESC;

-- 按列序号排序（不推荐，可读性差）
SELECT name, salary FROM employees ORDER BY 2 DESC;

-- NULL 值排序位置
-- PostgreSQL: NULLS FIRST / NULLS LAST
SELECT * FROM employees ORDER BY bonus DESC NULLS LAST;

-- MySQL: NULL 被视为最小值（ASC 在前，DESC 在后）
-- SQL Server: NULL 被视为最小值
-- Oracle: ASC 时 NULL 在后，DESC 时 NULL 在前
```

## LIMIT / OFFSET 分页

```sql
-- MySQL / PostgreSQL / SQLite
SELECT * FROM employees ORDER BY id LIMIT 10;           -- 前 10 条
SELECT * FROM employees ORDER BY id LIMIT 10 OFFSET 20; -- 第 21-30 条

-- SQL Server (2012+)
SELECT * FROM employees
ORDER BY id
OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;

-- Oracle (12c+)
SELECT * FROM employees
ORDER BY id
OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;

-- 计算总页数的技巧（窗口函数）
SELECT *, COUNT(*) OVER() AS total_count
FROM employees
ORDER BY id
LIMIT 10;
```

## DISTINCT 去重

```sql
-- 单列去重
SELECT DISTINCT department FROM employees;

-- 多列组合去重
SELECT DISTINCT department, job_title FROM employees;

-- DISTINCT 与 NULL：所有 NULL 值被视为相同
SELECT DISTINCT middle_name FROM users;

-- COUNT DISTINCT：统计不同值的数量
SELECT COUNT(DISTINCT department) AS dept_count FROM employees;

-- PostgreSQL: 对多列去重计数
SELECT COUNT(DISTINCT (department, job_title)) FROM employees;

-- MySQL: 使用子查询
SELECT COUNT(*) FROM (
  SELECT DISTINCT department, job_title FROM employees
) AS t;
```

## 别名

```sql
-- 列别名
SELECT first_name AS 名, salary AS 薪资 FROM employees;
SELECT first_name 名, salary 薪资 FROM employees;  -- 省略 AS

-- 表别名
SELECT e.first_name, d.department_name
FROM employees e
JOIN departments d ON e.dept_id = d.id;

-- 别名在 ORDER BY 中可用
SELECT salary * 12 AS annual_salary
FROM employees
ORDER BY annual_salary DESC;

--  别名在 WHERE 中不可用（逻辑执行顺序原因）
--  错误
SELECT salary * 12 AS annual_salary
FROM employees
WHERE annual_salary > 100000;

--  正确
SELECT salary * 12 AS annual_salary
FROM employees
WHERE salary * 12 > 100000;

-- PostgreSQL / MySQL 扩展：HAVING 中可用别名
SELECT department, COUNT(*) AS cnt
FROM employees
GROUP BY department
HAVING cnt > 5;
```

### GROUP BY 分组

```sql
-- 基本分组
SELECT department, COUNT(*) AS emp_count, AVG(salary) AS avg_salary
FROM employees
GROUP BY department;

-- 多列分组
SELECT department, job_title, COUNT(*) AS cnt, AVG(salary) AS avg_salary
FROM employees
GROUP BY department, job_title;

-- GROUP BY 与 ORDER BY
SELECT department, AVG(salary) AS avg_salary
FROM employees
GROUP BY department
ORDER BY avg_salary DESC;

-- PostgreSQL: GROUP BY 别名
SELECT department AS dept, COUNT(*) AS cnt
FROM employees
GROUP BY dept;  -- MySQL、SQLite 同样支持；SQL Server、Oracle 不支持（请用原始表达式）
```

### HAVING 分组过滤

```sql
-- HAVING: 对分组后的结果进行过滤
SELECT department, COUNT(*) AS emp_count, AVG(salary) AS avg_salary
FROM employees
GROUP BY department
HAVING COUNT(*) > 5 AND AVG(salary) > 50000;

-- WHERE vs HAVING
-- WHERE: 分组前过滤（行级）
-- HAVING: 分组后过滤（组级）

-- 示例：先过滤 2024 年入职的员工，再按部门分组，最后筛选人数 > 3 的部门
SELECT department, COUNT(*) AS cnt
FROM employees
WHERE hire_date >= '2024-01-01'
GROUP BY department
HAVING COUNT(*) > 3;
```

## SELECT 语句

`SELECT` 是 SQL 中最常用的语句，用于从表中检索数据。其基本语法结构：

```sql
SELECT [DISTINCT] 列表达式 [, ...]
FROM 表名
[WHERE 条件]
[GROUP BY 分组列 [, ...]]
[HAVING 分组条件]
[ORDER BY 排序列 [ASC|DESC] [, ...]]
[LIMIT 数量 [OFFSET 偏移]];
```

### 基本查询

```sql
-- 查询所有列（生产环境慎用 *）
SELECT * FROM employees;

-- 查询指定列
SELECT first_name, last_name, salary FROM employees;

-- 计算列
SELECT first_name, salary, salary * 12 AS annual_salary FROM employees;
```

### SELECT 执行顺序

理解 SQL 的逻辑执行顺序对编写正确查询至关重要：

```
1. FROM        -- 确定数据源
2. WHERE       -- 行级过滤
3. GROUP BY    -- 分组
4. HAVING      -- 组级过滤
5. SELECT      -- 选择列 / 计算表达式
6. DISTINCT    -- 去重
7. ORDER BY    -- 排序
8. LIMIT       -- 限制行数
```

> **注意**：这是逻辑执行顺序，数据库引擎实际执行时可能根据优化器决策调整。

### 比较运算符

| 运算符      | 含义                  | 示例                          |
| ----------- | --------------------- | ----------------------------- |
| `=`         | 等于                  | `WHERE age = 25`              |
| `!=` / `<>` | 不等于                | `WHERE status != 'inactive'`  |
| `>` / `<`   | 大于 / 小于           | `WHERE salary > 50000`        |
| `>=` / `<=` | 大于等于 / 小于等于   | `WHERE age >= 18`             |
| `<=>`       | 安全等于（NULL 安全） | `WHERE col <=> NULL`（MySQL） |

### 逻辑运算符

```sql
-- AND: 两个条件同时满足
SELECT * FROM employees WHERE department = 'IT' AND salary > 80000;

-- OR: 任一条件满足
SELECT * FROM employees WHERE department = 'IT' OR department = 'HR';

-- NOT: 取反
SELECT * FROM employees WHERE NOT department = 'IT';

-- 组合使用（注意优先级：AND > OR）
SELECT * FROM employees
WHERE (department = 'IT' OR department = 'HR') AND salary > 50000;
```

### BETWEEN 和 IN

```sql
-- BETWEEN: 范围查询（包含边界）
SELECT * FROM products WHERE price BETWEEN 100 AND 500;
-- 等价于: WHERE price >= 100 AND price <= 500

-- IN: 集合匹配
SELECT * FROM employees WHERE department IN ('IT', 'HR', 'Finance');

-- NOT IN: 排除集合
SELECT * FROM employees WHERE department NOT IN ('IT', 'HR');

-- 子查询形式的 IN
SELECT * FROM orders
WHERE customer_id IN (
  SELECT id FROM customers WHERE country = 'China'
);
```

### 分页性能优化

```sql
--  深分页性能差（OFFSET 需要跳过前面的行）
SELECT * FROM orders ORDER BY id LIMIT 10 OFFSET 1000000;

--  游标分页（Keyset Pagination）—— 利用索引
SELECT * FROM orders WHERE id > 1000000 ORDER BY id LIMIT 10;
```

## 表达式

### 算术表达式

```sql
SELECT product_name, price, quantity, price * quantity AS total
FROM order_items;

-- 运算符优先级：* / 高于 + -
SELECT price * quantity - discount AS final_amount FROM order_items;
```

### 条件表达式 CASE WHEN

```sql
-- 简单 CASE
SELECT
  department,
  CASE department
    WHEN 'IT' THEN '技术部'
    WHEN 'HR' THEN '人力资源部'
    WHEN 'Finance' THEN '财务部'
    ELSE '其他部门'
  END AS dept_name_cn
FROM employees;

-- 搜索 CASE（更灵活，推荐）
SELECT
  name,
  salary,
  CASE
    WHEN salary >= 100000 THEN '高薪'
    WHEN salary >= 60000 THEN '中薪'
    WHEN salary >= 30000 THEN '低薪'
    ELSE '实习'
  END AS salary_level
FROM employees;

-- CASE WHEN 在聚合中
SELECT
  COUNT(*) AS total,
  COUNT(CASE WHEN gender = 'M' THEN 1 END) AS male_count,
  COUNT(CASE WHEN gender = 'F' THEN 1 END) AS female_count,
  SUM(CASE WHEN salary > 50000 THEN salary ELSE 0 END) AS high_salary_total
FROM employees;

-- PostgreSQL 专用简化写法
SELECT
  COUNT(*) FILTER (WHERE gender = 'M') AS male_count,
  COUNT(*) FILTER (WHERE gender = 'F') AS female_count
FROM employees;
```

## 聚合函数

聚合函数对一组值进行计算，返回单个值。

### 基本聚合函数

| 函数         | 含义             | 示例                                 |
| ------------ | ---------------- | ------------------------------------ |
| `COUNT(*)`   | 统计行数         | `SELECT COUNT(*) FROM users`         |
| `COUNT(col)` | 统计非 NULL 值数 | `SELECT COUNT(phone) FROM users`     |
| `SUM(col)`   | 求和             | `SELECT SUM(amount) FROM orders`     |
| `AVG(col)`   | 平均值           | `SELECT AVG(salary) FROM employees`  |
| `MAX(col)`   | 最大值           | `SELECT MAX(price) FROM products`    |
| `MIN(col)`   | 最小值           | `SELECT MIN(created_at) FROM orders` |

### 聚合函数与 NULL

```sql
-- COUNT(*) 统计所有行，包括 NULL
-- COUNT(col) 忽略 NULL 值
SELECT
  COUNT(*) AS total_rows,
  COUNT(bonus) AS bonus_count,    -- 不统计 NULL
  AVG(bonus) AS avg_bonus         -- 忽略 NULL 计算
FROM employees;

-- 如果需要将 NULL 计入 AVG
SELECT AVG(COALESCE(bonus, 0)) AS avg_bonus_incl_null FROM employees;
```

### 常用统计模式

```sql
-- 1. 占比计算
SELECT
  department,
  COUNT(*) AS emp_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) AS pct
FROM employees
GROUP BY department;

-- 2. 累计统计
SELECT
  order_date,
  SUM(amount) AS daily_amount,
  SUM(SUM(amount)) OVER(ORDER BY order_date) AS cumulative_amount
FROM orders
GROUP BY order_date;

-- 3. 中位数（PostgreSQL）
SELECT PERCENTILE_CONT(0.5) WITHIN GROUP(ORDER BY salary) AS median_salary
FROM employees;

-- 4. 众数（PostgreSQL）
SELECT MODE() WITHIN GROUP(ORDER BY department) AS most_common_dept
FROM employees;

-- 5. 标准差与方差
SELECT
  STDDEV(salary) AS salary_stddev,    -- 样本标准差
  VARIANCE(salary) AS salary_variance  -- 样本方差
FROM employees;
```

## 小结

- `SELECT` 是 SQL 查询的核心，理解逻辑执行顺序是编写正确查询的基础
- `WHERE` 用于行级过滤，`HAVING` 用于组级过滤
- `NULL` 需要使用 `IS NULL` / `IS NOT NULL` 判断，不能使用 `=`
- `CASE WHEN` 是 SQL 中的条件表达式，功能强大且通用
- 聚合函数自动忽略 `NULL`，`COUNT(*)` 除外
- 分页查询中，游标分页（Keyset Pagination）比 `OFFSET` 更高效
## SELECT 查询

**单行写法：查询所有列**
`SELECT * FROM <表名>;`
```sql
-- 查询员工表中的所有字段
SELECT * FROM employees;
```

**单行写法：查询指定列**
`SELECT <列名 1>, <列名 2> FROM <表名>;`
```sql
-- 查询员工表中的姓名和薪资字段
SELECT first_name, salary FROM employees;
```

**换行写法：查询多列并计算**
`SELECT <列名 1>, <列名 2>, <表达式> AS <别名> FROM <表名>;`
```sql
-- 查询姓名、薪资并计算年薪
SELECT
  first_name,
  salary,
  salary * 12 AS annual_salary
FROM employees;
```

---

## BETWEEN 范围查询

**单行写法：范围查询（包含边界）**
`WHERE <列> BETWEEN <下界> AND <上界>;`
```sql
-- 查询价格在 100 到 500 之间的商品
SELECT * FROM products WHERE price BETWEEN 100 AND 500;
```

**单行写法：排除范围**
`WHERE <列> NOT BETWEEN <下界> AND <上界>;`
```sql
-- 查询价格不在 100 到 500 之间的商品
SELECT * FROM products WHERE price NOT BETWEEN 100 AND 500;
```

---

## IN 集合匹配

**单行写法：集合匹配**
`WHERE <列> IN (<值 1>, <值 2>, ...);`
```sql
-- 查询 IT、HR、Finance 部门的员工
SELECT * FROM employees WHERE department IN ('IT', 'HR', 'Finance');
```

**单行写法：排除集合**
`WHERE <列> NOT IN (<值 1>, <值 2>, ...);`
```sql
-- 查询非 IT、HR 部门的员工
SELECT * FROM employees WHERE department NOT IN ('IT', 'HR');
```

**换行写法：子查询形式的 IN**
`WHERE <列> IN (SELECT ...);`
```sql
-- 查询来自中国的客户的订单
SELECT * FROM orders
WHERE customer_id IN (
  SELECT id FROM customers WHERE country = 'China'
);
```

---

## CASE WHEN 条件表达式

**换行写法：简单 CASE 等值匹配**
`CASE <列> WHEN <值> THEN <结果> [ELSE <结果>] END`
```sql
-- 将部门代码转换为中文名称
SELECT
  department,
  CASE department
    WHEN 'IT' THEN '技术部'
    WHEN 'HR' THEN '人力资源部'
    WHEN 'Finance' THEN '财务部'
    ELSE '其他部门'
  END AS dept_name_cn
FROM employees;
```

**换行写法：搜索 CASE 条件判断**
`CASE WHEN <条件> THEN <结果> [ELSE <结果>] END`
```sql
-- 根据薪资划分等级
SELECT
  name,
  salary,
  CASE
    WHEN salary >= 100000 THEN '高薪'
    WHEN salary >= 60000 THEN '中薪'
    WHEN salary >= 30000 THEN '低薪'
    ELSE '实习'
  END AS salary_level
FROM employees;
```

**换行写法：CASE WHEN 在聚合中使用**
`COUNT(CASE WHEN <条件> THEN 1 END) AS <别名>`
```sql
-- 统计男女员工数量及高薪总额
SELECT
  COUNT(*) AS total,
  COUNT(CASE WHEN gender = 'M' THEN 1 END) AS male_count,
  COUNT(CASE WHEN gender = 'F' THEN 1 END) AS female_count,
  SUM(CASE WHEN salary > 50000 THEN salary ELSE 0 END) AS high_salary_total
FROM employees;
```
