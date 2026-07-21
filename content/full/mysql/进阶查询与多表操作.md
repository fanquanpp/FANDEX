---
order: 80
tags:
  - mysql
  - database
difficulty: advanced
title: 进阶查询与多表操作
module: mysql
category: 'MySQL Basics'
description: 复杂查询优化、分组聚合与结果集处理。
author: Anonymous
related:
  - mysql/基于时间点恢复
  - mysql/主从复制
  - mysql/全局事务标识
  - mysql/并行复制
prerequisites:
  - mysql/语法速查
---

## 1. 多表联查 (Joins)

### 1.1 基本联查类型

#### 1.1.1 联查类型总览

| 联查类型       | 描述     | 返回结果                          |
| -------------- | -------- | --------------------------------- |
| **INNER JOIN** | 内连接   | 只返回两表匹配的行                |
| **LEFT JOIN**  | 左外连接 | 返回左表所有行，右表不匹配补 NULL |
| **RIGHT JOIN** | 右外连接 | 返回右表所有行，左表不匹配补 NULL |
| **FULL JOIN**  | 全外连接 | 返回两表所有行，不匹配的补 NULL   |

#### 1.1.2 联查类型详解

##### INNER JOIN（内连接）

**作用**：只返回两个表中匹配条件的行。
**语法**：

```sql
 SELECT *
 from table1
 inNER JOIN table2
  ON table1.id = table2.id;
```

**图解**：

```
 表A 表B 结果
 ┌
 │ 1 │ ────── │ A │ │ 1 │
 │ 2 │ ────── │ B │ │ 2 │
 │ 3 │ ────── │ C │ │ 3 │
 │ 4 │ │ │ └───┘
 └───┘ └───┘
```

**特点**：只有两边都匹配的数据才会出现在结果中。

---

##### LEFT JOIN（左外连接）

**作用**：返回左表的所有行，以及右表中匹配的行；右表不匹配的部分用 NULL 填充。
**语法**：

```sql
 SELECT *
 from table1
 LEFT JOIN table2
  ON table1.id = table2.id;
```

**图解**：

```
 表A 表B 结果
 ┌
 │ 1 │ ────── │ A │ │ 1 │ A │
 │ 2 │ ────── │ B │ │ 2 │ B │
 │ 3 │ ────── │ C │ │ 3 │ C │
 │ 4 │ │ │ │ 4 │ NULL│
 └───┘ └───┘ └───┴─────┘
```

**特点**：左表的数据全部保留，右表没有匹配的用 NULL 填充。

---

##### RIGHT JOIN（右外连接）

**作用**：返回右表的所有行，以及左表中匹配的行；左表不匹配的部分用 NULL 填充。
**语法**：

```sql
 SELECT *
 from table1
 RIGHT JOIN table2
  ON table1.id = table2.id;
```

**图解**：

```
 表A 表B 结果
 ┌
 │ 1 │ ────── │ A │ │ 1 │ A │
 │ 2 │ ────── │ B │ │ 2 │ B │
 │ │ │ C │ │ NULL│ C │
 │ │ │ D │ │ NULL│ D │
 └───┘ └───┘ └─────┴───┘
```

**特点**：右表的数据全部保留，左表没有匹配的用 NULL 填充。

---

##### FULL JOIN（全外连接）

**作用**：返回两个表的所有行，不匹配的部分用 NULL 填充。
**注意**：MySQL 不直接支持 FULL JOIN，需要通过 `UNION` 模拟。
**语法**：

```sql
 -
 SELECT *
 from table1
 LEFT JOIN table2
  ON table1.id = table2.id
 UNION
 SELECT *
 from table1
 RIGHT JOIN table2
  ON table1.id = table2.id;
```

**图解**：

```
 表A 表B 结果
 ┌
 │ 1 │ ────── │ A │ │ 1 │ A │
 │ 2 │ ────── │ B │ │ 2 │ B │
 │ 3 │ │ C │ │ 3 │ NULL│
 │ │ │ D │ │ NULL│ C │
 └───┘ └───┘ │ NULL│ D │
  └─────┴─────┘
```

**特点**：两个表的数据全部保留，没有匹配的用 NULL 填充。

### 1.2 联查示例

**示例表结构**:

```sql
 -
 CREATE TABLE departments (
  dept_id INT PRIMARY KEY,
  dept_name VARCHAR(50) NOT NULL
 )
 -
 CREATE TABLE employees (
  emp_id INT PRIMARY KEY,
  emp_name VARCHAR(50) NOT NULL,
  dept_id INT,
  salary DECIMAL(10, 2),
  hire_date DATE,
  FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
 )
 -
 inSERT INTO departments VALUES (1, '技术部'), (2, '市场部'), (3, '财务部');
 inSERT INTO employees VALUES
 (1, '张三', 1, 8000, '2020-01-01'),
 (2, '李四', 1, 9000, '2020-02-01'),
 (3, '王五', 2, 7000, '2020-03-01'),
 (4, '赵六', 2, 6000, '2020-04-01'),
 (5, '钱七', 3, 10000, '2020-05-01');
```

**INNER JOIN 示例**:

```sql
 -
 SELECT e.emp_id, e.emp_name, d.dept_name, e.salary
 from employees e
 inNER JOIN departments d ON e.dept_id = d.dept_id;
 -
 -
 -
 -
 -
 -
 -
```

**LEFT JOIN 示例**:

```sql
 -
 SELECT d.dept_id, d.dept_name, e.emp_name, e.salary
 from departments d
 LEFT JOIN employees e ON d.dept_id = e.dept_id;
 -
 -
 -
 -
 -
 -
 -
```

**RIGHT JOIN 示例**:

```sql
 -
 SELECT e.emp_id, e.emp_name, d.dept_name, e.salary
 from departments d
 RIGHT JOIN employees e ON d.dept_id = e.dept_id;
 -
 -
 -
 -
 -
 -
 -
```

**FULL JOIN 模拟**:

```sql
 -
 SELECT d.dept_id, d.dept_name, e.emp_name, e.salary
 from departments d
 LEFT JOIN employees e ON d.dept_id = e.dept_id
 UNION
 SELECT d.dept_id, d.dept_name, e.emp_name, e.salary
 from departments d
 RIGHT JOIN employees e ON d.dept_id = e.dept_id;
```

### 1.3 多表联查实战（商品管理系统）

以下示例基于商品管理系统数据库，包含完整的多表联查实战场景：

```sql
 -
 -
 -
 -
 -
 -
```

**实战示例1：查询员工及其销售订单**

```sql
 SELECT
  e.Employees_id,
  e.Employees_name,
  s.Sales_id,
  s.Sales_time,
  s.Customer_id
 from employees_info e
 inNER JOIN sales_info s
  ON e.Employees_id = s.Employees_id;
```

**实战示例2：查询员工销售订单详情（含客户信息）**

```sql
 SELECT
  e.Employees_name,
  s.Sales_id,
  c.Customer_name,
  c.Telephone,
  s.Sales_time
 from employees_info e
 inNER JOIN sales_info s
  ON e.Employees_id = s.Employees_id
 inNER JOIN customer_info c
  ON s.Customer_id = c.Customer_id;
```

**实战示例3：查询完整订单信息（五表联查）**

```sql
 SELECT
  e.Employees_name AS 员工姓名,
  s.Sales_id AS 订单编号,
  c.Customer_name AS 客户姓名,
  m.Commodity_name AS 商品名称,
  sl.Sales_price AS 销售单价,
  sl.Sales_Number AS 销售数量,
  sl.Sales_price * sl.Sales_Number AS 小计金额,
  s.Sales_time AS 销售时间
 from employees_info e
 inNER JOIN sales_info s
  ON e.Employees_id = s.Employees_id
 inNER JOIN customer_info c
  ON s.Customer_id = c.Customer_id
 inNER JOIN sales_list sl
  ON s.Sales_id = sl.Sales_id
 inNER JOIN commodity_info m
  ON sl.Commodity_id = m.Commodity_id
 ORDER BY s.Sales_time DESC;
```

**实战示例4：统计各销售员的销售业绩**

```sql
 SELECT
  e.Employees_name AS 销售员,
  COUNT(DISTINCT s.Sales_id) AS 订单数,
  SUM(sl.Sales_Number) AS 销售总量,
  SUM(sl.Sales_price * sl.Sales_Number) AS 销售总业绩
 from employees_info e
 inNER JOIN sales_info s
  ON e.Employees_id = s.Employees_id
 inNER JOIN sales_list sl
  ON s.Sales_id = sl.Sales_id
 GROUP BY e.Employees_id, e.Employees_name
 ORDER BY 销售总业绩 DESC;
```

**实战示例5：查询客户购买的商品明细**

```sql
 SELECT
  c.Customer_name AS 客户姓名,
  m.Commodity_name AS 商品名称,
  SUM(sl.Sales_Number) AS 购买数量,
  SUM(sl.Sales_price * sl.Sales_Number) AS 消费金额
 from customer_info c
 inNER JOIN sales_info s
  ON c.Customer_id = s.Customer_id
 inNER JOIN sales_list sl
  ON s.Sales_id = sl.Sales_id
 inNER JOIN commodity_info m
  ON sl.Commodity_id = m.Commodity_id
 GROUP BY c.Customer_id, c.Customer_name, m.Commodity_name
 ORDER BY c.Customer_name, 消费金额 DESC;
```

**实战示例6：自连接查询 - 查询同名员工**

```sql
 SELECT
  e1.Employees_name AS 姓名,
  e1.Employees_id AS 员工ID1,
  e2.Employees_id AS 员工ID2
 from employees_info e1
 inNER JOIN employees_info e2
  ON e1.Employees_name = e2.Employees_name
 WHERE e1.Employees_id < e2.Employees_id;
```

**实战示例7：自连接查询 - 同城市供应商**

```sql
 SELECT
  s1.Supplier_name AS 供应商1,
  s1.Address AS 城市,
  s2.Supplier_name AS 同城市供应商
 from supplier_info s1
 inNER JOIN supplier_info s2
  ON s1.Address = s2.Address
 WHERE s1.Supplier_id <> s2.Supplier_id
 ORDER BY s1.Address, s1.Supplier_name;
```

**外连接实战示例1：查询所有员工及他们的销售记录**

```sql
 SELECT
  e.Employees_name,
  s.Sales_id,
  s.Sales_time
 from employees_info e
 LEFT JOIN sales_info s
  ON e.Employees_id = s.Employees_id;
```

**外连接实战示例2：统计每种商品的销量（包含未销售的商品）**

```sql
 SELECT
  c.Commodity_name,
  IFNULL(SUM(sl.Sales_Number), 0) AS 销售数量
 from commodity_info c
 LEFT JOIN sales_list sl
  ON c.Commodity_id = sl.Commodity_id
 GROUP BY c.Commodity_id, c.Commodity_name
 ORDER BY 销售数量 DESC;
```

**外连接实战示例3：查询采购信息（包含没有采购的商品）**

```sql
 SELECT
  c.Commodity_name,
  pi.Purchase_id,
  pi.Purchase_time,
  pl.Purchase_Number,
  pl.Purchase_price,
  su.Supplier_name,
  e.Employees_name
 from commodity_info c
 LEFT JOIN purchase_list pl
  ON c.Commodity_id = pl.Commodity_id
 LEFT JOIN purchase_info pi
  ON pl.Purchase_id = pi.Purchase_id
 LEFT JOIN supplier_info su
  ON pi.Supplier_id = su.Supplier_id
 LEFT JOIN employees_info e
  ON pi.Employees_id = e.Employees_id;
```

**外连接实战示例4：查询有销售记录的员工**

```sql
 SELECT DISTINCT
  e.Employees_name
 from employees_info e
 RIGHT JOIN sales_info s
  ON e.Employees_id = s.Employees_id
 WHERE e.Employees_id IS NOT NULL;
```

### 1.4 其他连接类型

#### 1.4.1 交叉连接 (CROSS JOIN)

返回两个表的笛卡尔积：

```sql
 -
 SELECT * FROM table1 CROSS JOIN table2;
 -
 SELECT * FROM table1, table2;
 -
 SELECT d.dept_name, e.emp_name
 from departments d
 CROSS JOIN employees e;
```

#### 1.4.2 自然连接 (NATURAL JOIN)

自动根据相同列名进行连接：

```sql
 -
 SELECT * FROM employees NATURAL JOIN departments;
 -
 SELECT * FROM employees NATURAL LEFT JOIN departments;
 -
 SELECT * FROM employees NATURAL RIGHT JOIN departments;
```

#### 1.4.3 USING 子句

当两个表有相同列名时，可以使用 USING 简化连接：

```sql
 -
 SELECT e.emp_name, d.dept_name
 from employees e
 JOIN departments d USING (dept_id);
```

### 1.5 连接优先级与括号

```sql
 -
 SELECT *
 from employees e
 LEFT JOIN (
  departments d
  JOIN projects p ON d.dept_id = p.dept_id
 )
```

## 2. 分组统计 (Grouping)

### 2.1 基本分组

使用 `GROUP BY` 配合聚合函数进行分组统计：

```sql
 -
 SELECT dept_id, AVG(salary) as avg_salary
 from employees
 GROUP BY dept_id;
 -
 -
 -
 -
 -
```

### 2.2 HAVING 子句

`HAVING` 用于对分组后的结果进行过滤，而 `WHERE` 是在分组前过滤：

```sql
 -
 SELECT dept_id, AVG(salary) as avg_salary
 from employees
 GROUP BY dept_id
 HAVING AVG(salary) > 7000;
 -
 -
 -
 -
```

### 2.3 多列分组

```sql
 -
 SELECT dept_id, YEAR(hire_date) as hire_year, AVG(salary) as avg_salary
 from employees
 GROUP BY dept_id, YEAR(hire_date);
```

### 2.4 常用聚合函数

| 聚合函数         | 描述         | 示例                                                  |
| ---------------- | ------------ | ----------------------------------------------------- |
| `COUNT()`        | 计算行数     | `COUNT(*)`、`COUNT(column)`、`COUNT(DISTINCT column)` |
| `SUM()`          | 计算数值总和 | `SUM(price)`、`SUM(quantity * price)`                 |
| `AVG()`          | 计算平均值   | `AVG(salary)`、`AVG(DISTINCT price)`                  |
| `MAX()`          | 计算最大值   | `MAX(price)`、`MAX(created_at)`                       |
| `MIN()`          | 计算最小值   | `MIN(price)`、`MIN(created_at)`                       |
| `GROUP_CONCAT()` | 拼接字符串   | `GROUP_CONCAT(name SEPARATOR ',')`                    |

```sql
 -
 SELECT
  COUNT(*) as total_employees,
  SUM(salary) as total_salary,
  AVG(salary) as avg_salary,
  MAX(salary) as max_salary,
  MIN(salary) as min_salary
 from employees;
```

### 2.5 ROLLUP 和 CUBE

#### 2.5.1 ROLLUP

生成小计和总计：

```sql
 -
 SELECT
  dept_id,
  YEAR(hire_date) as hire_year,
  COUNT(*) as employee_count
 from employees
 GROUP BY dept_id, YEAR(hire_date) WITH ROLLUP;
 -
 -
 -
 -
 -
 -
 -
 -
 -
```

#### 2.5.2 GROUPING SETS

灵活指定分组组合：

```sql
 -
 SELECT
  dept_id,
  YEAR(hire_date) as hire_year,
  COUNT(*) as employee_count
 from employees
 GROUP BY GROUPING SETS (
  (dept_id, YEAR(hire_date)), -- 部门+年份
  (dept_id), -- 仅部门
  () -- 总计
 )
```

### 2.6 GROUP_CONCAT 的高级用法

```sql
 -
 SELECT
  dept_id,
  GROUP_CONCAT(emp_name SEPARATOR ', ') as employees
 from employees
 GROUP BY dept_id;
 -
 -
 -
 -
 -
 -
 SELECT
  dept_id,
  GROUP_CONCAT(emp_name ORDER BY salary DESC SEPARATOR ', ') as employees
 from employees
 GROUP BY dept_id;
```

## 3. 子查询 (Subqueries)

### 3.1 标量子查询

返回单一值的子查询：

```sql
 -
 SELECT emp_name, salary
 from employees
 WHERE salary > (SELECT AVG(salary) FROM employees);
 -
 -
 -
 -
```

### 3.2 列子查询

返回一列值的子查询，通常配合 `IN`, `ANY`, `ALL` 使用：

```sql
 -
 SELECT emp_name, dept_id
 from employees
 WHERE dept_id IN (SELECT dept_id FROM departments WHERE dept_name IN ('技术部', '市场部'));
 -
 -
 -
 -
 -
 -
```

### 3.3 行子查询

返回一行多列的子查询：

```sql
 -
 SELECT emp_name, dept_id, salary
 from employees
 WHERE (dept_id, salary) = (SELECT dept_id, salary FROM employees WHERE emp_name = '张三');
```

### 3.4 表子查询

返回一个表的子查询，可以作为临时表使用：

```sql
 -
 SELECT e.emp_name, e.dept_id, e.salary
 from employees e
 JOIN (
  SELECT dept_id, MAX(salary) as max_salary
  FROM employees
  GROUP BY dept_id
 )
 -
 -
 -
 -
 -
```

### 3.5 相关子查询

子查询中使用了外部查询的列：

```sql
 -
 SELECT
  emp_name,
  dept_id,
  salary,
  (SELECT COUNT(*) + 1
  FROM employees e2
  WHERE e2.dept_id = e1.dept_id AND e2.salary > e1.salary) as rank
 from employees e1
 ORDER BY dept_id, rank;
 -
 -
 -
 -
 -
 -
 -
```

### 3.6 EXISTS 子查询

检查子查询是否返回任何行：

```sql
 -
 SELECT dept_id, dept_name
 from departments d
 WHERE EXISTS (
  SELECT 1 FROM employees e WHERE e.dept_id = d.dept_id
 )
 -
 SELECT dept_id, dept_name
 from departments d
 WHERE NOT EXISTS (
  SELECT 1 FROM employees e WHERE e.dept_id = d.dept_id
 )
 -
 SELECT dept_id, dept_name
 from departments d
 WHERE EXISTS (
  SELECT 1 FROM employees e
  WHERE e.dept_id = d.dept_id AND e.salary > 8000
 )
```

### 3.7 ANY/SOME 和 ALL

```sql
 -
 SELECT emp_name, salary
 from employees
 WHERE salary > ANY (
  SELECT AVG(salary) FROM employees GROUP BY dept_id
 )
 -
 SELECT emp_name, salary
 from employees
 WHERE salary > ALL (
  SELECT AVG(salary) FROM employees GROUP BY dept_id
 )
 -
 SELECT emp_name, salary
 from employees
 WHERE salary > SOME (
  SELECT AVG(salary) FROM employees GROUP BY dept_id
 )
```

### 3.8 子查询的性能考虑

```sql
 -
 SELECT e.emp_name, e.salary
 from employees e
 JOIN (SELECT AVG(salary) as avg_sal FROM employees) t
 WHERE e.salary > t.avg_sal;
 -
 SELECT emp_name, salary
 from employees e1
 WHERE salary > (SELECT AVG(salary) FROM employees e2 WHERE e2.dept_id = e1.dept_id);
```

## 4. 窗口函数 (Window Functions - MySQL 8.0+)

窗口函数允许在不分组的情况下进行聚合计算，为每行数据生成一个结果。

### 4.1 基本语法

```sql
 <窗口函数> OVER (
  [PARTITION BY <分区列>]
  [ORDER BY <排序列>]
  [ROWS/RANGE <窗口范围>]
 )
```

### 4.2 常用窗口函数

#### 4.2.1 排名函数

| 函数           | 描述                 | 相同值处理                     | 示例结果（假设两行值相同） |
| -------------- | -------------------- | ------------------------------ | -------------------------- |
| `ROW_NUMBER()` | 为每行分配唯一的序号 | 即使值相同也分配不同序号       | 1, 2                       |
| `RANK()`       | 相同值会有相同的排名 | 相同值排名相同，后续排名跳过   | 1, 1, 3（跳过2）           |
| `DENSE_RANK()` | 相同值会有相同的排名 | 相同值排名相同，后续排名不跳过 | 1, 1, 2                    |

**示例**:

```sql
 -
 SELECT
  emp_name,
  dept_id,
  salary,
  ROW_NUMBER() OVER (PARTITION BY dept_id ORDER BY salary DESC) as row_num,
  RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) as rank,
  DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) as dense_rank
 from employees;
 -
 -
 -
 -
 -
 -
 -
```

#### 4.2.2 聚合函数作为窗口函数

```sql
 -
 SELECT
  emp_name,
  dept_id,
  salary,
  SUM(salary) OVER (PARTITION BY dept_id ORDER BY salary) as cumulative_salary,
  AVG(salary) OVER (PARTITION BY dept_id) as dept_avg_salary,
  MAX(salary) OVER (PARTITION BY dept_id) as dept_max_salary
 from employees;
 -
 -
 -
 -
 -
 -
 -
```

#### 4.2.3 分析函数

| 函数            | 描述                   | 语法示例               | 说明                   |
| --------------- | ---------------------- | ---------------------- | ---------------------- |
| `LAG()`         | 获取前 N 行的值        | `LAG(salary, 1)`       | 获取上一行的 salary 值 |
| `LEAD()`        | 获取后 N 行的值        | `LEAD(salary, 2)`      | 获取下两行的 salary 值 |
| `FIRST_VALUE()` | 获取窗口内的第一个值   | `FIRST_VALUE(salary)`  | 获取分组内的第一个值   |
| `LAST_VALUE()`  | 获取窗口内的最后一个值 | `LAST_VALUE(salary)`   | 获取分组内的最后一个值 |
| `NTH_VALUE()`   | 获取窗口内第 N 个值    | `NTH_VALUE(salary, 3)` | 获取分组内的第三个值   |

**示例**:

```sql
 -
 SELECT
  emp_name,
  dept_id,
  salary,
  LAG(salary, 1) OVER (PARTITION BY dept_id ORDER BY salary) as prev_salary,
  salary - LAG(salary, 1) OVER (PARTITION BY dept_id ORDER BY salary) as salary_diff
 from employees;
 -
 -
 -
 -
 -
 -
 -
```

### 4.3 窗口范围

```sql
 -
 SELECT
  emp_name,
  dept_id,
  salary,
  SUM(salary) OVER (
  PARTITION BY dept_id
  ORDER BY salary
  ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
  ) as moving_sum
 from employees;
 -
 -
 -
 -
 -
 -
 -
```

### 4.4 其他常用窗口函数

#### 4.4.1 百分比排名函数

```sql
 -
 SELECT
  emp_name,
  dept_id,
  salary,
  PERCENT_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) as percent_rank
 from employees;
 -
 -
 -
 -
 -
 -
 -
 -
 SELECT
  emp_name,
  dept_id,
  salary,
  CUME_DIST() OVER (PARTITION BY dept_id ORDER BY salary) as cume_dist
 from employees;
```

#### 4.4.2 NTILE 函数

```sql
 -
 SELECT
  emp_name,
  dept_id,
  salary,
  NTILE(2) OVER (PARTITION BY dept_id ORDER BY salary DESC) as bucket
 from employees;
 -
 -
 -
 -
 -
 -
 -
```

#### 4.4.3 LAG 和 LEAD 的高级用法

```sql
 -
 SELECT
  emp_name,
  dept_id,
  salary,
  LAG(salary, 1, 0) OVER (PARTITION BY dept_id ORDER BY salary) as prev_salary,
  LEAD(salary, 1, 0) OVER (PARTITION BY dept_id ORDER BY salary) as next_salary
 from employees;
 -
 SELECT
  emp_name,
  dept_id,
  salary,
  ROUND((salary - LAG(salary) OVER (PARTITION BY dept_id ORDER BY salary))
  / LAG(salary) OVER (PARTITION BY dept_id ORDER BY salary) * 100, 2)
  as growth_rate
 from employees;
```

### 4.5 命名窗口

```sql
 -
 SELECT
  emp_name,
  dept_id,
  salary,
  ROW_NUMBER() OVER w as row_num,
  RANK() OVER w as rank,
  DENSE_RANK() OVER w as dense_rank,
  AVG(salary) OVER (PARTITION BY dept_id) as dept_avg
 from employees
 WINDOW w AS (PARTITION BY dept_id ORDER BY salary DESC);
```

## 5. 实际应用示例

### 5.1 复杂查询示例

```sql
 -
 SELECT
  emp_name,
  dept_name,
  salary,
  rank
 from (
  SELECT
  e.emp_name,
  d.dept_name,
  e.salary,
  ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) as rank
  FROM employees e
  JOIN departments d ON e.dept_id = d.dept_id
 )
 WHERE rank <= 2;
 -
 -
 -
 -
 -
 -
 -
```

### 5.2 内连接实战 (商品管理系统)

```sql
 -
 SELECT employees_info.Employees_name, post_info.Post_name
 from employees_info
 JOIN post_info ON employees_info.Post_id = post_info.Post_id;
 -
 SELECT commodity_info.Commodity_name, SUM(sales_list.Sales_Number) AS 销售数量
 from commodity_info
 JOIN sales_list ON commodity_info.Commodity_id = sales_list.Commodity_id
 GROUP BY commodity_info.Commodity_name;
 -
 SELECT employees_info.*, sales_info.*
 from employees_info
 inNER JOIN sales_info ON employees_info.Employees_id = sales_info.Employees_id;
 -
 SELECT employees_info.Employees_id, employees_info.Employees_name, employees_info.Employees_sex,
  sales_info.Sales_id, sales_info.Customer_id, sales_info.Sales_time
 from employees_info
 inNER JOIN sales_info ON employees_info.Employees_id = sales_info.Employees_id;
 -
 SELECT employees_info.Employees_id, employees_info.Employees_name, employees_info.Employees_sex,
  sales_info.Sales_id, sales_info.Customer_id, customer_info.Customer_name, sales_info.Sales_time
 from employees_info
 inNER JOIN sales_info ON employees_info.Employees_id = sales_info.Employees_id
 inNER JOIN customer_info ON sales_info.Customer_id = customer_info.Customer_id
 WHERE employees_info.Employees_name = '王小妮';
 -
 SELECT employees_info.Employees_id, employees_info.Employees_name, employees_info.Employees_sex,
  sales_info.Sales_id, sales_info.Customer_id, customer_info.Customer_name, sales_info.Sales_time
 from employees_info, sales_info, customer_info
 WHERE employees_info.Employees_id = sales_info.Employees_id
  AND sales_info.Customer_id = customer_info.Customer_id
  AND employees_info.Employees_name = '王小妮';
 -
 SELECT employees_info.Employees_id, employees_info.Employees_name,
  SUM(sales_list.Sales_price * sales_list.Sales_Number) AS 销售总业绩
 from employees_info
 inNER JOIN sales_info ON employees_info.Employees_id = sales_info.Employees_id
 inNER JOIN sales_list ON sales_info.Sales_id = sales_list.Sales_id
 GROUP BY employees_info.Employees_id, employees_info.Employees_name
 ORDER BY 销售总业绩 DESC;
 -
 SELECT customer_info.Customer_name, commodity_info.Commodity_name,
  SUM(sales_list.Sales_Number) AS 购买数量
 from customer_info
 inNER JOIN sales_info ON customer_info.Customer_id = sales_info.Customer_id
 inNER JOIN sales_list ON sales_info.Sales_id = sales_list.Sales_id
 inNER JOIN commodity_info ON sales_list.Commodity_id = commodity_info.Commodity_id
 GROUP BY customer_info.Customer_name, commodity_info.Commodity_name;
 -
 SELECT employees_info.Employees_name, sales_info.Sales_id, customer_info.Customer_name,
  commodity_info.Commodity_name, sales_info.Sales_time, sales_list.Sales_Number
 from employees_info
 inNER JOIN sales_info ON employees_info.Employees_id = sales_info.Employees_id
 inNER JOIN customer_info ON sales_info.Customer_id = customer_info.Customer_id
 inNER JOIN sales_list ON sales_info.Sales_id = sales_list.Sales_id
 inNER JOIN commodity_info ON sales_list.Commodity_id = commodity_info.Commodity_id;
 -
 SELECT s1.Supplier_name, s1.Address, s2.Supplier_name AS 同城市供应商
 from supplier_info s1
 inNER JOIN supplier_info s2 ON s1.Address = s2.Address
 WHERE s1.Supplier_name = '翔云公司' AND s1.Supplier_id <> s2.Supplier_id;
 -
 SELECT e1.Employees_name, e1.Employees_id, e2.Employees_id AS 同名员工ID
 from employees_info e1
 inNER JOIN employees_info e2 ON e1.Employees_name = e2.Employees_name
 WHERE e1.Employees_name = '王华' AND e1.Employees_id <> e2.Employees_id;
```

### 5.3 外连接实战 (商品管理系统)

```sql
 -
 SELECT Employees_name, b.*
 from employees_info a
 JOIN sales_info b ON a.Employees_id = b.Employees_id;
 -
 SELECT Employees_name, b.*
 from employees_info a
 LEFT JOIN sales_info b ON a.Employees_id = b.Employees_id;
 -
 SELECT Employees_name, b.*
 from sales_info b
 RIGHT JOIN employees_info a ON a.Employees_id = b.Employees_id;
 -
 SELECT Commodity_name, IFNULL(SUM(Sales_Number), 0) AS 销售数量
 from commodity_info a
 LEFT JOIN sales_list b ON a.Commodity_id = b.Commodity_id
 GROUP BY Commodity_name;
 -
 SELECT Commodity_name, Purchase_id, Purchase_time, Purchase_Number, Purchase_price,
  supplier_info.Supplier_name, employees_info.Employees_name
 from commodity_info a
 LEFT JOIN purchase_list b ON a.Commodity_id = b.Commodity_id
 LEFT JOIN purchase_info c ON b.Purchase_id = c.Purchase_id
 LEFT JOIN supplier_info ON c.Supplier_id = supplier_info.Supplier_id
 LEFT JOIN employees_info ON c.Employees_id = employees_info.Employees_id;
```

### 5.4 性能优化建议

1. **使用索引**: 确保联查的连接列和 WHERE 子句中的列有索引
2. **合理使用子查询**: 避免过于复杂的子查询，考虑使用 JOIN 替代
3. **限制返回数据**: 使用 LIMIT 限制返回行数
4. **避免 SELECT \***: 只选择需要的列
5. **使用 EXPLAIN**: 分析查询执行计划，找出性能瓶颈

### 5.5 复杂报表查询示例

```sql
 -
 SELECT
  DATE_FORMAT(s.sales_time, '%Y-%m') as month,
  d.dept_name,
  COUNT(DISTINCT s.sales_id) as order_count,
  SUM(sl.sales_price * sl.sales_number) as total_amount,
  AVG(sl.sales_price * sl.sales_number) as avg_order_amount,
  MAX(sl.sales_price * sl.sales_number) as max_order_amount
 from sales_info s
 JOIN sales_list sl ON s.sales_id = sl.sales_id
 JOIN employees_info e ON s.employees_id = e.employees_id
 JOIN departments d ON e.dept_id = d.dept_id
 GROUP BY month, d.dept_name
 ORDER BY month DESC, total_amount DESC;
 -
 SELECT
  c.customer_name,
  COUNT(DISTINCT s.sales_id) as order_count,
  SUM(sl.sales_number) as total_quantity,
  SUM(sl.sales_price * sl.sales_number) as total_spent,
  ROUND(SUM(sl.sales_price * sl.sales_number) / (SELECT SUM(sl2.sales_price * sl2.sales_number) FROM sales_list sl2) * 100, 2) as percentage
 from customer_info c
 JOIN sales_info s ON c.customer_id = s.customer_id
 JOIN sales_list sl ON s.sales_id = sl.sales_id
 GROUP BY c.customer_id, c.customer_name
 ORDER BY total_spent DESC
 LIMIT 10;
 -
 SELECT
  DATE_FORMAT(s.sales_time, '%Y-%m-%d') as date,
  ci.commodity_name,
  SUM(sl.sales_number) as daily_sales,
  SUM(sl.sales_price * sl.sales_number) as daily_revenue,
  LAG(SUM(sl.sales_number)) OVER (PARTITION BY ci.commodity_id ORDER BY DATE_FORMAT(s.sales_time, '%Y-%m-%d')) as prev_day_sales,
  ROUND((SUM(sl.sales_number) - LAG(SUM(sl.sales_number)) OVER (PARTITION BY ci.commodity_id ORDER BY DATE_FORMAT(s.sales_time, '%Y-%m-%d')))
  / LAG(SUM(sl.sales_number)) OVER (PARTITION BY ci.commodity_id ORDER BY DATE_FORMAT(s.sales_time, '%Y-%m-%d')) * 100, 2) as growth_rate
 from sales_info s
 JOIN sales_list sl ON s.sales_id = sl.sales_id
 JOIN commodity_info ci ON sl.commodity_id = ci.commodity_id
 WHERE s.sales_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
 GROUP BY date, ci.commodity_id, ci.commodity_name
 ORDER BY date, ci.commodity_name;
```

### 5.6 使用 CTE (Common Table Expressions)

```sql
 -
 with monthly_sales AS (
  SELECT
  DATE_FORMAT(sales_time, '%Y-%m') as month,
  SUM(sales_price * sales_number) as total_sales
  FROM sales_info s
  JOIN sales_list sl ON s.sales_id = sl.sales_id
  GROUP BY month
 )
 monthly_growth AS (
  SELECT
  month,
  total_sales,
  LAG(total_sales) OVER (ORDER BY month) as prev_month_sales,
  ROUND((total_sales - LAG(total_sales) OVER (ORDER BY month))
  / LAG(total_sales) OVER (ORDER BY month) * 100, 2) as growth_rate
  FROM monthly_sales
 )
 SELECT * FROM monthly_growth ORDER BY month DESC;
 -
 with RECURSIVE dept_hierarchy AS (
  SELECT
  dept_id,
  dept_name,
  parent_dept_id,
  1 as level
  FROM departments
  WHERE parent_dept_id IS NULL
  UNION ALL
  SELECT
  d.dept_id,
  d.dept_name,
  d.parent_dept_id,
  dh.level + 1 as level
  FROM departments d
  JOIN dept_hierarchy dh ON d.parent_dept_id = dh.dept_id
 )
 SELECT * FROM dept_hierarchy ORDER BY level, dept_id;
```

---

### 更新日志 (Changelog)

- 2026-04-05: 深入细化多表联查与窗口函数。
- 2026-04-05: 扩写内容，增加详细的联查示例、子查询用法和窗口函数示例。
- 2026-04-30: 补充交叉连接、自然连接、USING子句、ROLLUP、GROUPING SETS、EXISTS子查询、ANY/SOME/ALL、命名窗口、CTE等高级特性。
