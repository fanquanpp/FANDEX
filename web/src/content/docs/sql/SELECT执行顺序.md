---
order: 52
title: SELECT执行顺序
module: sql
category: SQL
difficulty: intermediate
description: 'SQL SELECT语句的逻辑执行顺序：FROM→JOIN→WHERE→GROUP BY→HAVING→SELECT→ORDER BY→LIMIT的完整解析'
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/数据类型
  - sql/约束
  - sql/过滤条件
  - sql/聚合函数
prerequisites:
  - sql/概述与标准
---

## 1. 执行顺序概述

SQL 是声明式语言，编写顺序与逻辑执行顺序不同。理解逻辑执行顺序是编写正确、高效查询的基础。

### 1.1 编写顺序 vs 执行顺序

**编写顺序**：

```sql
SELECT   -- 5. 选择列
FROM     -- 1. 数据源
JOIN     -- 2. 连接
WHERE    -- 3. 行过滤
GROUP BY -- 4. 分组
HAVING   -- 5. 分组过滤
ORDER BY -- 6. 排序
LIMIT    -- 7. 限制行数
```

**逻辑执行顺序**：

$$
\text{FROM} \rightarrow \text{JOIN} \rightarrow \text{WHERE} \rightarrow \text{GROUP BY} \rightarrow \text{HAVING} \rightarrow \text{SELECT} \rightarrow \text{DISTINCT} \rightarrow \text{ORDER BY} \rightarrow \text{LIMIT}
$$

### 1.2 为什么要理解执行顺序

1. **别名作用域**：SELECT 中定义的别名在 WHERE 中不可用，但在 ORDER BY 中可用
2. **聚合函数位置**：聚合函数只能出现在 SELECT、HAVING、ORDER BY 中
3. **性能优化**：尽早过滤数据减少后续处理量

## 2. 各阶段详解

### 2.1 FROM — 数据源确定

FROM 子句首先确定查询的数据源，生成虚拟表 VT1。

```sql
-- 单表
SELECT * FROM employees;

-- 子查询作为数据源
SELECT * FROM (
    SELECT dept_id, COUNT(*) AS cnt
    FROM employees
    GROUP BY dept_id
) AS dept_counts;
```

### 2.2 JOIN — 连接操作

按 JOIN 类型将多个表连接，生成虚拟表 VT2。

```
执行过程：
1. 交叉连接（笛卡尔积）：VT2 = VT1 × JOIN表
2. ON 过滤：保留满足 ON 条件的行
3. 外部行添加：
   - LEFT JOIN：添加左表未匹配行（右表列填 NULL）
   - RIGHT JOIN：添加右表未匹配行（左表列填 NULL）
   - FULL JOIN：添加两侧未匹配行
   - INNER JOIN：不添加
```

```sql
-- 多表连接按从左到右顺序执行
SELECT e.name, d.dept_name, j.job_title
FROM employees e
JOIN departments d ON e.dept_id = d.id        -- 先连接
JOIN jobs j ON e.job_id = j.id                 -- 再连接
```

### 2.3 WHERE — 行级过滤

对 VT2 中的每一行应用 WHERE 条件，保留满足条件的行生成 VT3。

```sql
-- WHERE 中不能使用聚合函数
-- 错误：
SELECT dept_id, COUNT(*) AS cnt
FROM employees
WHERE COUNT(*) > 5      -- 语法错误！
GROUP BY dept_id;

-- 正确：使用 HAVING
SELECT dept_id, COUNT(*) AS cnt
FROM employees
GROUP BY dept_id
HAVING COUNT(*) > 5;
```

**WHERE 中不能使用 SELECT 别名**：

```sql
-- 错误：WHERE 中不能引用 SELECT 别名
SELECT name, salary * 12 AS annual_salary
FROM employees
WHERE annual_salary > 100000;  -- 错误！

-- 正确：重复表达式
SELECT name, salary * 12 AS annual_salary
FROM employees
WHERE salary * 12 > 100000;
```

### 2.4 GROUP BY — 分组

按 GROUP BY 列对 VT3 分组，每组生成一行，得到虚拟表 VT4。

```sql
SELECT dept_id, COUNT(*) AS emp_count, AVG(salary) AS avg_salary
FROM employees
WHERE status = 'active'
GROUP BY dept_id;
```

**GROUP BY 规则**：

- SELECT 中的非聚合列必须出现在 GROUP BY 中
- GROUP BY 中可以使用 SELECT 别名（MySQL）或不使用（PostgreSQL/SQL Server）
- NULL 值被分到同一组

```sql
-- MySQL 允许 SELECT 别名在 GROUP BY 中
SELECT YEAR(created_at) AS yr, COUNT(*)
FROM orders
GROUP BY yr;  -- MySQL 可以，PostgreSQL 也可以

-- SQL 标准写法
SELECT YEAR(created_at) AS yr, COUNT(*)
FROM orders
GROUP BY YEAR(created_at);
```

### 2.5 HAVING — 分组过滤

对 VT4 中的分组应用 HAVING 条件，保留满足条件的分组生成 VT5。

```sql
SELECT dept_id, AVG(salary) AS avg_salary
FROM employees
GROUP BY dept_id
HAVING AVG(salary) > 50000;     -- 过滤分组

-- HAVING 可以使用聚合函数，WHERE 不可以
-- HAVING 中引用 SELECT 别名（部分数据库支持）
SELECT dept_id, AVG(salary) AS avg_salary
FROM employees
GROUP BY dept_id
HAVING avg_salary > 50000;      -- MySQL 支持，PostgreSQL 不支持
```

### 2.6 SELECT — 列选择与计算

从 VT5 中选择指定列，计算表达式，生成虚拟表 VT6。

```sql
SELECT
    dept_id,
    COUNT(*) AS emp_count,
    AVG(salary) AS avg_salary,
    RANK() OVER (ORDER BY AVG(salary) DESC) AS salary_rank
FROM employees
GROUP BY dept_id;
```

**SELECT 阶段的关键操作**：

1. **表达式计算**：算术运算、函数调用、CASE 表达式
2. **别名赋值**：AS 子句定义别名
3. **DISTINCT 去重**：去除重复行

### 2.7 DISTINCT — 去重

```sql
-- DISTINCT 在 SELECT 之后执行
SELECT DISTINCT dept_id
FROM employees;

-- DISTINCT 与 ORDER BY 结合
SELECT DISTINCT dept_id
FROM employees
ORDER BY dept_id;
```

### 2.8 ORDER BY — 排序

对 VT6 按 ORDER BY 指定的列排序，生成游标 VC1。

```sql
-- ORDER BY 可以使用 SELECT 别名
SELECT name, salary * 12 AS annual_salary
FROM employees
ORDER BY annual_salary DESC;    -- 正确！

-- ORDER BY 可以使用聚合函数
SELECT dept_id, AVG(salary) AS avg_salary
FROM employees
GROUP BY dept_id
ORDER BY AVG(salary) DESC;      -- 正确！

-- ORDER BY 可以使用列序号（不推荐）
SELECT dept_id, AVG(salary)
FROM employees
GROUP BY dept_id
ORDER BY 2 DESC;                -- 按第2列排序
```

### 2.9 LIMIT / OFFSET — 结果限制

从 VC1 中截取指定范围的行，返回最终结果。

```sql
-- SQL 标准
SELECT name, salary
FROM employees
ORDER BY salary DESC
FETCH FIRST 10 ROWS ONLY;

-- MySQL / PostgreSQL
SELECT name, salary
FROM employees
ORDER BY salary DESC
LIMIT 10 OFFSET 20;   -- 跳过20行，取10行（第3页，每页10条）
```

## 3. 完整执行顺序示例

```sql
SELECT
    d.dept_name,
    COUNT(e.id) AS emp_count,
    AVG(e.salary) AS avg_salary
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id AND e.status = 'active'
WHERE d.region = 'East'
GROUP BY d.id, d.dept_name
HAVING COUNT(e.id) > 5
ORDER BY avg_salary DESC
LIMIT 10;
```

**逐步执行**：

| 步骤 | 子句     | 操作                             |
| ---- | -------- | -------------------------------- |
| 1    | FROM     | 读取 departments 表              |
| 2    | JOIN     | LEFT JOIN employees，ON 条件匹配 |
| 3    | WHERE    | 过滤 region = 'East' 的部门      |
| 4    | GROUP BY | 按 (d.id, d.dept_name) 分组      |
| 5    | HAVING   | 过滤员工数 > 5 的分组            |
| 6    | SELECT   | 选择 dept_name, COUNT, AVG       |
| 7    | ORDER BY | 按 avg_salary 降序排序           |
| 8    | LIMIT    | 取前 10 行                       |

## 4. 常见陷阱与解决方案

### 4.1 别名作用域问题

```sql
-- 陷阱：WHERE 中使用 SELECT 别名
SELECT YEAR(created_at) AS yr, COUNT(*)
FROM orders
WHERE yr = 2026           -- 错误！yr 在 WHERE 中不可用
GROUP BY YEAR(created_at);

-- 解决方案1：重复表达式
SELECT YEAR(created_at) AS yr, COUNT(*)
FROM orders
WHERE YEAR(created_at) = 2026
GROUP BY YEAR(created_at);

-- 解决方案2：使用 CTE
WITH yearly_orders AS (
    SELECT *, YEAR(created_at) AS yr
    FROM orders
)
SELECT yr, COUNT(*)
FROM yearly_orders
WHERE yr = 2026
GROUP BY yr;
```

### 4.2 LEFT JOIN + WHERE 陷阱

```sql
-- 陷阱：WHERE 条件使 LEFT JOIN 退化为 INNER JOIN
SELECT d.dept_name, e.name
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id
WHERE e.status = 'active';   -- 过滤掉了没有员工的部门！

-- 正确：将条件移到 ON 子句
SELECT d.dept_name, e.name
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id AND e.status = 'active';
```

### 4.3 聚合与非聚合列混用

```sql
-- 陷阱：SELECT 中有非聚合列未出现在 GROUP BY 中
SELECT dept_id, name, AVG(salary)   -- name 未分组！
FROM employees
GROUP BY dept_id;

-- 解决方案1：将 name 加入 GROUP BY
SELECT dept_id, name, AVG(salary)
FROM employees
GROUP BY dept_id, name;

-- 解决方案2：使用聚合函数处理 name
SELECT dept_id, MAX(name) AS rep_name, AVG(salary)
FROM employees
GROUP BY dept_id;
```
