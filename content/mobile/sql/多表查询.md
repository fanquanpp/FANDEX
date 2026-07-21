# 多表查询

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## INNER JOIN

**换行写法：基本内连接**
`FROM <表 1> INNER JOIN <表 2> ON <条件>`
```sql
-- 查询员工及其部门名称
SELECT e.name, d.department_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.id;
```

**换行写法：省略 INNER 的内连接**
`FROM <表 1> JOIN <表 2> ON <条件>`
```sql
-- 省略 INNER 关键字
SELECT e.name, d.department_name
FROM employees e
JOIN departments d ON e.dept_id = d.id;
```

**换行写法：多表连接**
`FROM <表 1> JOIN <表 2> ON ... JOIN <表 3> ON ...`
```sql
-- 连接订单、客户、订单项、商品四张表
SELECT o.order_id, c.name, p.product_name, oi.quantity
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id;
```

**换行写法：复合连接条件**
`FROM <表 1> JOIN <表 2> ON <条件 1> AND <条件 2>`
```sql
-- 使用复合条件连接员工和活跃部门
SELECT e.name, d.department_name
FROM employees e
JOIN departments d ON e.dept_id = d.id AND d.is_active = true;
```

---

## LEFT JOIN

**换行写法：左外连接返回左表全部行**
`FROM <表 1> LEFT JOIN <表 2> ON <条件>`
```sql
-- 查询所有员工及其部门（包括没有部门的员工）
SELECT e.name, d.department_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id;
```

**换行写法：左连接查找无匹配行**
`FROM <表 1> LEFT JOIN <表 2> ON <条件> WHERE <表 2>.<列> IS NULL`
```sql
-- 找出没有部门的员工
SELECT e.name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id
WHERE d.id IS NULL;
```

**换行写法：多层左连接**
`FROM <表 1> LEFT JOIN <表 2> ON ... LEFT JOIN <表 3> ON ...`
```sql
-- 链式左连接用户、订单、订单项、商品
SELECT
  u.name,
  o.order_id,
  p.product_name
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id;
```

---

## RIGHT JOIN

**换行写法：右外连接返回右表全部行**
`FROM <表 1> RIGHT JOIN <表 2> ON <条件>`
```sql
-- 查询所有部门及其员工（包括没有员工的部门）
SELECT e.name, d.department_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.id;
```

---

## FULL JOIN

**换行写法：全外连接返回两表所有行**
`FROM <表 1> FULL JOIN <表 2> ON <条件>`
```sql
-- 返回员工和部门的所有行
SELECT e.name, d.department_name
FROM employees e
FULL JOIN departments d ON e.dept_id = d.id;
```

**换行写法：全外连接查找不匹配行**
`FROM <表 1> FULL JOIN <表 2> ON <条件> WHERE <表 1>.<id> IS NULL OR <表 2>.<id> IS NULL`
```sql
-- 查找两表不匹配的行
SELECT e.name, d.department_name
FROM employees e
FULL JOIN departments d ON e.dept_id = d.id
WHERE e.id IS NULL OR d.id IS NULL;
```

**换行写法：MySQL 用 UNION 模拟全外连接**
`LEFT JOIN ... UNION RIGHT JOIN ...`
```sql
-- MySQL 不支持 FULL JOIN，用 UNION 模拟
SELECT e.name, d.department_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id
UNION
SELECT e.name, d.department_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.id;
```

---

## CROSS JOIN

**换行写法：显式交叉连接**
`FROM <表 1> CROSS JOIN <表 2>`
```sql
-- 生成部门和职级的笛卡尔积
SELECT d.department_name, j.job_level
FROM departments d
CROSS JOIN job_levels j;
```

**换行写法：隐式交叉连接**
`FROM <表 1>, <表 2>`
```sql
-- 使用逗号分隔的隐式交叉连接
SELECT d.department_name, j.job_level
FROM departments d, job_levels j;
```

---

## 自连接

**换行写法：员工与经理关系**
`FROM <表> AS <别名 1> LEFT JOIN <表> AS <别名 2> ON <条件>`
```sql
-- 查询员工及其经理
SELECT
  e.name AS employee,
  m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

**换行写法：组织层级查询（固定层级）**
`FROM <表> AS <别名 1> LEFT JOIN <表> AS <别名 2> ON ... LEFT JOIN <表> AS <别名 3> ON ...`
```sql
-- 查询三级组织层级
SELECT
  e3.name AS level3,
  e2.name AS level2,
  e1.name AS level1
FROM employees e1
LEFT JOIN employees e2 ON e2.manager_id = e1.id
LEFT JOIN employees e3 ON e3.manager_id = e2.id
WHERE e1.manager_id IS NULL;
```

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
-- 查询员工薪资与平均薪资的差值
SELECT
  name,
  salary,
  (SELECT AVG(salary) FROM employees) AS avg_salary,
  salary - (SELECT AVG(salary) FROM employees) AS diff
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

## EXISTS 与 IN

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

**换行写法：IN 检查值是否在子查询结果中**
`WHERE <列> IN (SELECT ...)`
```sql
-- 查询有薪资超过 100000 员工的部门
SELECT d.department_name
FROM departments d
WHERE d.id IN (
  SELECT dept_id FROM employees WHERE salary > 100000
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

## JOIN 性能建议

**换行写法：小表驱动大表**
`FROM <小表> JOIN <大表> ON ...`
```sql
-- 小表在左驱动大表
SELECT * FROM small_table s JOIN big_table b ON s.id = b.small_id;
```

**单行写法：连接列上建索引**
`CREATE INDEX <索引名> ON <表名>(<列>);`
```sql
-- 在订单表的 customer_id 上建索引
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
```

**换行写法：避免在 JOIN 条件上使用函数**
`FROM <表 1> JOIN <表 2> ON <表 1>.<列> = <表 2>.<列>`
```sql
-- 直接使用列值连接（推荐）
SELECT * FROM users u JOIN orders o ON u.email = o.email;
```
