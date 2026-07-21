# 子查询

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 标量子查询

**换行写法：WHERE 中的标量子查询**
`WHERE <列> <运算符> (SELECT ...)`
```sql
-- 查询薪资高于平均值的员工
SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);
```

**换行写法：SELECT 中的标量子查询**
`SELECT <列>, (SELECT ...) AS <别名> FROM <表名>`
```sql
-- 查询员工薪资及公司平均薪资
SELECT
  name,
  salary,
  (SELECT AVG(salary) FROM employees) AS avg_salary
FROM employees;
```

---

## 列子查询

**换行写法：ANY 与子查询任一值比较**
`WHERE <列> <运算符> ANY (SELECT ...)`
```sql
-- 查询薪资高于部门 5 中任一员工的员工
SELECT name, salary FROM employees
WHERE salary > ANY (SELECT salary FROM employees WHERE dept_id = 5);
```

**换行写法：= ANY 等价于 IN**
`WHERE <列> = ANY (SELECT ...)`
```sql
-- 查询东部地区部门的员工
SELECT name, salary FROM employees
WHERE dept_id = ANY (SELECT id FROM departments WHERE region = 'East');
```

**换行写法：ALL 与子查询所有值比较**
`WHERE <列> <运算符> ALL (SELECT ...)`
```sql
-- 查询薪资高于部门 5 中所有员工的员工
SELECT name, salary FROM employees
WHERE salary > ALL (SELECT salary FROM employees WHERE dept_id = 5);
```

**换行写法：<> ALL 等价于 NOT IN**
`WHERE <列> <> ALL (SELECT ...)`
```sql
-- 查询不在东部地区部门的员工
SELECT name, salary FROM employees
WHERE dept_id <> ALL (SELECT id FROM departments WHERE region = 'East');
```

---

## 行子查询

**换行写法：行子查询返回单行多列**
`WHERE (<列 1>, <列 2>) = (SELECT ...)`
```sql
-- 查询部门 5 中薪资最高的员工
SELECT * FROM employees
WHERE (dept_id, salary) = (
  SELECT dept_id, MAX(salary)
  FROM employees
  GROUP BY dept_id
  HAVING dept_id = 5
);
```

**换行写法：多列 IN 子查询**
`WHERE (<列 1>, <列 2>) IN (SELECT ...)`
```sql
-- 查询每个客户最新订单
SELECT * FROM orders
WHERE (customer_id, order_date) IN (
  SELECT customer_id, MAX(order_date)
  FROM orders
  GROUP BY customer_id
);
```

---

## 表子查询

**换行写法：FROM 中的派生表**
`FROM (SELECT ...) AS <别名>`
```sql
-- 查询平均薪资大于 50000 的部门
SELECT dept_name, avg_salary
FROM (
  SELECT department AS dept_name, AVG(salary) AS avg_salary
  FROM employees
  GROUP BY department
) AS dept_stats
WHERE avg_salary > 50000;
```

---

## 相关子查询

**换行写法：相关子查询引用外层查询列**
`WHERE <列> = (SELECT ... FROM ... WHERE ... = <外层列>)`
```sql
-- 查询每个部门薪资最高的员工
SELECT name, department, salary
FROM employees e
WHERE salary = (
  SELECT MAX(salary)
  FROM employees e2
  WHERE e2.department = e.department
);
```

---

## EXISTS 与 NOT EXISTS

**换行写法：EXISTS 检查子查询是否返回行**
`WHERE EXISTS (SELECT 1 FROM ... WHERE ...)`
```sql
-- 查询有薪资超过 100000 员工的部门
SELECT d.department_name
FROM departments d
WHERE EXISTS (
  SELECT 1 FROM employees e
  WHERE e.dept_id = d.id AND e.salary > 100000
);
```

**换行写法：NOT EXISTS 避免 NULL 陷阱**
`WHERE NOT EXISTS (SELECT 1 FROM ... WHERE ...)`
```sql
-- 查询部门中没有薪资超过 100000 员工的部门
SELECT name FROM employees e
WHERE NOT EXISTS (
  SELECT 1 FROM employees e2
  WHERE e2.dept_id = e.dept_id AND e2.salary > 100000
);
```

---

## IN 与 NOT IN

**换行写法：IN 检查值在子查询结果中**
`WHERE <列> IN (SELECT ...)`
```sql
-- 查询有高薪员工的部门
SELECT d.department_name
FROM departments d
WHERE d.id IN (
  SELECT dept_id FROM employees WHERE salary > 100000
);
```

**换行写法：NOT IN 的 NULL 陷阱**
`WHERE <列> NOT IN (SELECT ...)`
```sql
-- NOT IN 如果子查询包含 NULL，整个查询返回空
SELECT name FROM employees
WHERE dept_id NOT IN (SELECT id FROM departments WHERE region = 'East');
```

**换行写法：NOT EXISTS 替代 NOT IN**
`WHERE NOT EXISTS (SELECT 1 FROM ... WHERE ...)`
```sql
-- 推荐使用 NOT EXISTS 替代 NOT IN
SELECT name FROM employees e
WHERE NOT EXISTS (
  SELECT 1 FROM departments d
  WHERE d.id = e.dept_id AND d.region = 'East'
);
```

---

## 子查询位置

**换行写法：SELECT 中的标量子查询**
`SELECT <列>, (SELECT ...) AS <别名>`
```sql
-- 查询员工薪资与平均薪资的差值
SELECT
  name,
  salary,
  (SELECT AVG(salary) FROM employees) AS avg_salary,
  salary - (SELECT AVG(salary) FROM employees) AS diff
FROM employees;
```

**换行写法：WHERE 中的子查询**
`WHERE <列> <运算符> (SELECT ...)`
```sql
-- 查询薪资高于平均值的员工
SELECT name, salary FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);
```

**换行写法：HAVING 中的子查询**
`HAVING <聚合> <运算符> (SELECT ...)`
```sql
-- 查询平均薪资高于公司平均薪资的部门
SELECT department, AVG(salary) AS avg_sal
FROM employees
GROUP BY department
HAVING AVG(salary) > (SELECT AVG(salary) FROM employees);
```

---

## 子查询与 JOIN 对比

**换行写法：子查询写法**
`WHERE <列> IN (SELECT ...)`
```sql
-- 使用子查询查询东部地区部门的员工
SELECT name
FROM employees
WHERE dept_id IN (SELECT id FROM departments WHERE region = 'East');
```

**换行写法：JOIN 写法（通常更高效）**
`FROM <表 1> JOIN <表 2> ON ...`
```sql
-- 使用 JOIN 改写子查询
SELECT e.name
FROM employees e
JOIN departments d ON e.dept_id = d.id
WHERE d.region = 'East';
```
