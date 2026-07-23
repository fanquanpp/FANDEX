# 聚合函数

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## COUNT 统计

**单行写法：统计所有行（包括 NULL）**
`SELECT COUNT(*) FROM <表名>;`
```sql
-- 统计员工总数
SELECT COUNT(*) FROM employees;
```

**单行写法：统计非 NULL 行数**
`SELECT COUNT(<列>) FROM <表名>;`
```sql
-- 统计有手机号的员工数
SELECT COUNT(phone) FROM employees;
```

**单行写法：统计去重后的行数**
`SELECT COUNT(DISTINCT <列>) FROM <表名>;`
```sql
-- 统计不同部门的数量
SELECT COUNT(DISTINCT department) FROM employees;
```

---

## SUM 求和

**单行写法：求和（自动忽略 NULL）**
`SELECT SUM(<列>) AS <别名> FROM <表名>;`
```sql
-- 计算所有员工薪资总和
SELECT SUM(salary) AS total_salary FROM employees;
```

**单行写法：去重后求和**
`SELECT SUM(DISTINCT <列>) FROM <表名>;`
```sql
-- 去重后计算薪资总和
SELECT SUM(DISTINCT salary) FROM employees;
```

---

## AVG 平均值

**单行写法：平均值（自动忽略 NULL）**
`SELECT AVG(<列>) AS <别名> FROM <表名>;`
```sql
-- 计算员工平均薪资
SELECT AVG(salary) AS avg_salary FROM employees;
```

**单行写法：去重后求平均**
`SELECT AVG(DISTINCT <列>) FROM <表名>;`
```sql
-- 去重后计算平均薪资
SELECT AVG(DISTINCT salary) FROM employees;
```

---

## MAX / MIN 最值

**单行写法：最大值与最小值**
`SELECT MAX(<列>) AS <别名 1>, MIN(<列>) AS <别名 2> FROM <表名>;`
```sql
-- 查询最高薪资和最低薪资
SELECT MAX(salary) AS max_salary, MIN(salary) AS min_salary
FROM employees;
```

**单行写法：日期最值**
`SELECT MAX(<日期列>) AS <别名 1>, MIN(<日期列>) AS <别名 2> FROM <表名>;`
```sql
-- 查询最新入职日期和最早入职日期
SELECT MAX(hire_date) AS latest_hire, MIN(hire_date) AS earliest_hire
FROM employees;
```

---

## GROUP BY 分组

**换行写法：按单列分组聚合**
`SELECT <分组列>, <聚合函数> FROM <表名> GROUP BY <分组列>;`
```sql
-- 按部门分组统计员工数和平均薪资
SELECT department, COUNT(*) AS emp_count, AVG(salary) AS avg_salary
FROM employees
GROUP BY department;
```

**换行写法：按多列分组聚合**
`SELECT <列 1>, <列 2>, <聚合函数> FROM <表名> GROUP BY <列 1>, <列 2>;`
```sql
-- 按部门和职位分组统计
SELECT department, job_title, COUNT(*) AS cnt, AVG(salary) AS avg_salary
FROM employees
GROUP BY department, job_title;
```

**换行写法：GROUP BY 与 ORDER BY**
`SELECT <列>, <聚合函数> FROM <表名> GROUP BY <列> ORDER BY <聚合函数> DESC;`
```sql
-- 按部门分组并按平均薪资降序排列
SELECT department, AVG(salary) AS avg_salary
FROM employees
GROUP BY department
ORDER BY avg_salary DESC;
```

---

## HAVING 分组过滤

**换行写法：分组后过滤**
`HAVING <分组条件>;`
```sql
-- 查询员工数大于 5 且平均薪资大于 50000 的部门
SELECT department, COUNT(*) AS emp_count, AVG(salary) AS avg_salary
FROM employees
GROUP BY department
HAVING COUNT(*) > 5 AND AVG(salary) > 50000;
```

**换行写法：WHERE 与 HAVING 区别**
`WHERE <行条件> ... GROUP BY ... HAVING <组条件>;`
```sql
-- 先过滤 2024 年后入职的员工，再按部门分组过滤
SELECT department, COUNT(*) AS cnt
FROM employees
WHERE hire_date >= '2024-01-01'
GROUP BY department
HAVING COUNT(*) > 3;
```

---

## GROUP_CONCAT 字符串聚合

**换行写法：MySQL 分组拼接字符串**
`GROUP_CONCAT([DISTINCT] <列> [ORDER BY <列>] SEPARATOR '<分隔符>')`
```sql
-- 按部门分组拼接员工姓名
SELECT
  department,
  GROUP_CONCAT(name SEPARATOR ', ') AS employees
FROM employees
GROUP BY department;
```

**换行写法：去重拼接**
`GROUP_CONCAT(DISTINCT <列> ORDER BY <列> SEPARATOR '<分隔符>')`
```sql
-- 按部门分组去重拼接职位
SELECT
  department,
  GROUP_CONCAT(DISTINCT job_title ORDER BY job_title SEPARATOR ', ') AS titles
FROM employees
GROUP BY department;
```

---

## STRING_AGG 字符串聚合

**换行写法：PostgreSQL/SQL Server 字符串聚合**
`STRING_AGG(<列>, '<分隔符>')`
```sql
-- 按部门分组拼接员工姓名
SELECT
  department,
  STRING_AGG(name, ', ') AS employees
FROM employees
GROUP BY department;
```

**换行写法：带排序的拼接**
`STRING_AGG(<列>, '<分隔符>' ORDER BY <列> DESC)`
```sql
-- 按部门分组按薪资降序拼接员工姓名
SELECT
  department,
  STRING_AGG(name, ', ' ORDER BY salary DESC) AS employees
FROM employees
GROUP BY department;
```

---

## 统计聚合函数

**单行写法：样本标准差**
`SELECT STDDEV(<列>) AS <别名> FROM <表名>;`
```sql
-- 计算薪资的样本标准差
SELECT STDDEV(salary) AS salary_std FROM employees;
```

**单行写法：总体标准差**
`SELECT STDDEV_POP(<列>) AS <别名> FROM <表名>;`
```sql
-- 计算薪资的总体标准差
SELECT STDDEV_POP(salary) AS salary_std_pop FROM employees;
```

**单行写法：样本方差**
`SELECT VARIANCE(<列>) AS <别名> FROM <表名>;`
```sql
-- 计算薪资的样本方差
SELECT VARIANCE(salary) AS salary_var FROM employees;
```

**单行写法：总体方差**
`SELECT VAR_POP(<列>) AS <别名> FROM <表名>;`
```sql
-- 计算薪资的总体方差
SELECT VAR_POP(salary) AS salary_var_pop FROM employees;
```

---

## 布尔聚合

**换行写法：PostgreSQL 布尔聚合**
`BOOL_AND(<表达式>) | BOOL_OR(<表达式>)`
```sql
-- 按部门统计是否全部高薪及是否存在超高薪
SELECT
  department,
  BOOL_AND(salary > 50000) AS all_high_paid,
  BOOL_OR(salary > 100000) AS any_high_paid
FROM employees
GROUP BY department;
```

**换行写法：MySQL 等价写法**
`MIN(<表达式>) | MAX(<表达式>)`
```sql
-- MySQL 使用 MIN/MAX 模拟 BOOL_AND/BOOL_OR
SELECT
  department,
  MIN(salary > 50000) AS all_high_paid,
  MAX(salary > 100000) AS any_high_paid
FROM employees
GROUP BY department;
```

---

## JSON 聚合

**换行写法：聚合为 JSON 数组**
`JSON_ARRAYAGG(<列|表达式>)`
```sql
-- 按部门分组将员工姓名聚合为 JSON 数组
SELECT
  department,
  JSON_ARRAYAGG(name) AS employee_names
FROM employees
GROUP BY department;
```

**换行写法：聚合为 JSON 对象**
`JSON_OBJECTAGG(<键列>, <值列>)`
```sql
-- 按部门分组将姓名和薪资聚合为 JSON 对象
SELECT
  department,
  JSON_OBJECTAGG(name, salary) AS name_salary_map
FROM employees
GROUP BY department;
```
