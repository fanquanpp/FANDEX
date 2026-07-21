# 连接查询

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## INNER JOIN

**换行写法：内连接返回两表匹配行**
`FROM <左表> INNER JOIN <右表> ON <条件>`
```sql
-- 查询员工及其所属部门名称
SELECT e.name, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.id;
```

**换行写法：省略 INNER 的内连接**
`FROM <左表> JOIN <右表> ON <条件>`
```sql
-- 省略 INNER 关键字的内连接
SELECT e.name, d.dept_name
FROM employees e
JOIN departments d ON e.dept_id = d.id;
```

**换行写法：非等值连接**
`FROM <左表> JOIN <右表> ON <非等值条件>`
```sql
-- 根据薪资范围匹配薪资等级
SELECT e.name, g.grade
FROM employees e
JOIN salary_grades g ON e.salary BETWEEN g.min_salary AND g.max_salary;
```

**换行写法：多表连接**
`FROM <表 1> JOIN <表 2> ON ... JOIN <表 3> ON ...`
```sql
-- 连接员工表、部门表和职位表
SELECT e.name, d.dept_name, j.job_title
FROM employees e
JOIN departments d ON e.dept_id = d.id
JOIN jobs j ON e.job_id = j.id
WHERE d.region = 'East';
```

---

## LEFT JOIN

**换行写法：左外连接返回左表全部行**
`FROM <左表> LEFT JOIN <右表> ON <条件>`
```sql
-- 查询所有部门及其员工（包括没有员工的部门）
SELECT d.dept_name, e.name
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id;
```

**换行写法：左连接查找无匹配行**
`FROM <左表> LEFT JOIN <右表> ON <条件> WHERE <右表>.<列> IS NULL`
```sql
-- 查找没有员工的部门
SELECT d.dept_name
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id
WHERE e.id IS NULL;
```

**换行写法：左连接统计含零值分组**
`FROM <左表> LEFT JOIN <右表> ON <条件> GROUP BY ...`
```sql
-- 统计每个部门的员工数（包括 0 人部门）
SELECT d.dept_name, COUNT(e.id) AS emp_count
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id
GROUP BY d.id, d.dept_name;
```

**换行写法：左连接右表过滤条件放 ON 子句**
`FROM <左表> LEFT JOIN <右表> ON <条件> AND <右表过滤>`
```sql
-- 查询所有部门及活跃状态的员工（右表过滤条件放 ON 子句）
SELECT d.dept_name, e.name
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id AND e.status = 'active';
```

---

## RIGHT JOIN

**换行写法：右外连接返回右表全部行**
`FROM <左表> RIGHT JOIN <右表> ON <条件>`
```sql
-- 查询所有部门及其员工（包括没有员工的部门）
SELECT e.name, d.dept_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.id;
```

---

## FULL JOIN

**换行写法：全外连接返回两表所有行**
`FROM <左表> FULL JOIN <右表> ON <条件>`
```sql
-- 返回员工和部门的所有行，不匹配时填 NULL
SELECT e.name, d.dept_name
FROM employees e
FULL JOIN departments d ON e.dept_id = d.id;
```

**换行写法：全外连接查找不匹配行**
`FROM <左表> FULL JOIN <右表> ON <条件> WHERE <左表>.<id> IS NULL OR <右表>.<id> IS NULL`
```sql
-- 查找两表不匹配的行
SELECT e.name, d.dept_name
FROM employees e
FULL JOIN departments d ON e.dept_id = d.id
WHERE e.id IS NULL OR d.id IS NULL;
```

**换行写法：MySQL 用 UNION ALL 模拟全外连接**
`LEFT JOIN ... UNION ALL RIGHT JOIN ... WHERE IS NULL`
```sql
-- MySQL 不支持 FULL JOIN，使用 UNION ALL 替代
SELECT e.name, d.dept_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id
UNION ALL
SELECT e.name, d.dept_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.id
WHERE e.id IS NULL;
```

---

## CROSS JOIN

**换行写法：显式交叉连接（笛卡尔积）**
`FROM <左表> CROSS JOIN <右表>`
```sql
-- 生成部门和职位的笛卡尔积
SELECT d.dept_name, j.job_title
FROM departments d
CROSS JOIN jobs j;
```

**换行写法：隐式交叉连接**
`FROM <表 1>, <表 2>`
```sql
-- 使用逗号分隔的隐式交叉连接
SELECT d.dept_name, j.job_title
FROM departments d, jobs j;
```

---

## 自连接

**换行写法：表与自身连接**
`FROM <表> AS <别名 1> JOIN <表> AS <别名 2> ON <条件>`
```sql
-- 查询员工及其经理
SELECT
  e.name AS employee,
  m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

**换行写法：自连接查找同组数据**
`FROM <表> AS <别名 1> JOIN <表> AS <别名 2> ON <条件>`
```sql
-- 查找同一部门中薪资相同的员工
SELECT a.name, b.name, a.salary
FROM employees a
JOIN employees b ON a.dept_id = b.dept_id AND a.salary = b.salary AND a.id < b.id;
```

---

## USING 子句

**换行写法：USING 指定同名列连接**
`FROM <左表> JOIN <右表> USING (<列>)`
```sql
-- 使用 USING 指定同名列连接
SELECT e.name, department_id
FROM employees e
JOIN departments d USING (department_id);
```

**换行写法：NATURAL JOIN 自动按同名列连接**
`FROM <左表> NATURAL JOIN <右表>`
```sql
-- 自动按同名列连接（不推荐，不可控）
SELECT * FROM employees NATURAL JOIN departments;
```
