# 数据查询基础

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

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

## NULL 处理

**单行写法：检查 NULL 值**
`WHERE <列> IS NULL;`
```sql
-- 查询没有手机号的用户
SELECT * FROM users WHERE phone IS NULL;
```

**单行写法：检查非 NULL 值**
`WHERE <列> IS NOT NULL;`
```sql
-- 查询有手机号的用户
SELECT * FROM users WHERE phone IS NOT NULL;
```

**单行写法：COALESCE 返回第一个非 NULL 值**
`SELECT COALESCE(<列>, <默认值>) AS <别名> FROM <表名>;`
```sql
-- 查询用户手机号，未填写则显示"未填写"
SELECT name, COALESCE(phone, '未填写') AS phone_display FROM users;
```

**单行写法：NULLIF 相等返回 NULL**
`SELECT NULLIF(<列>, <值>) AS <别名> FROM <表名>;`
```sql
-- 查询成绩，为 0 时返回 NULL 避免除零
SELECT NULLIF(score, 0) AS safe_score FROM results;
```

---

## ORDER BY 排序

**单行写法：升序排序**
`ORDER BY <列> ASC;`
```sql
-- 按薪资升序排列员工
SELECT * FROM employees ORDER BY salary ASC;
```

**单行写法：降序排序**
`ORDER BY <列> DESC;`
```sql
-- 按薪资降序排列员工
SELECT * FROM employees ORDER BY salary DESC;
```

**换行写法：多列排序**
`ORDER BY <列 1> ASC, <列 2> DESC;`
```sql
-- 按部门升序、薪资降序排列员工
SELECT * FROM employees ORDER BY department ASC, salary DESC;
```

**单行写法：按表达式排序**
`ORDER BY <表达式> DESC;`
```sql
-- 按折扣后价格降序排列商品
SELECT * FROM products ORDER BY price * discount DESC;
```

---

## LIMIT / OFFSET 分页

**单行写法：限制返回行数**
`LIMIT <数量>;`
```sql
-- 查询前 10 条员工记录
SELECT * FROM employees ORDER BY id LIMIT 10;
```

**单行写法：偏移分页**
`LIMIT <数量> OFFSET <偏移>;`
```sql
-- 查询第 21 到 30 条员工记录
SELECT * FROM employees ORDER BY id LIMIT 10 OFFSET 20;
```

**换行写法：SQL Server 分页**
`OFFSET <偏移> ROWS FETCH NEXT <数量> ROWS ONLY;`
```sql
-- SQL Server 2012+ 分页查询
SELECT * FROM employees
ORDER BY id
OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;
```

**单行写法：游标分页（深分页优化）**
`WHERE <列> > <值> ORDER BY <列> LIMIT <数量>;`
```sql
-- 利用索引进行游标分页，避免 OFFSET 性能问题
SELECT * FROM orders WHERE id > 1000000 ORDER BY id LIMIT 10;
```

---

## DISTINCT 去重

**单行写法：单列去重**
`SELECT DISTINCT <列> FROM <表名>;`
```sql
-- 查询所有不重复的部门
SELECT DISTINCT department FROM employees;
```

**单行写法：多列组合去重**
`SELECT DISTINCT <列 1>, <列 2> FROM <表名>;`
```sql
-- 查询所有不重复的部门和职位组合
SELECT DISTINCT department, job_title FROM employees;
```

**单行写法：COUNT DISTINCT 统计**
`SELECT COUNT(DISTINCT <列>) AS <别名> FROM <表名>;`
```sql
-- 统计不同部门的数量
SELECT COUNT(DISTINCT department) AS dept_count FROM employees;
```

---

## 别名

**单行写法：列别名**
`SELECT <列> AS <别名> FROM <表名>;`
```sql
-- 为列设置中文别名
SELECT first_name AS 名, salary AS 薪资 FROM employees;
```

**单行写法：省略 AS 的列别名**
`SELECT <列> <别名> FROM <表名>;`
```sql
-- 省略 AS 关键字设置列别名
SELECT first_name 名, salary 薪资 FROM employees;
```

**换行写法：表别名**
`FROM <表名> AS <别名>`
```sql
-- 为表设置别名后进行连接查询
SELECT e.first_name, d.department_name
FROM employees e
JOIN departments d ON e.dept_id = d.id;
```

**换行写法：别名在 ORDER BY 中使用**
`SELECT <表达式> AS <别名> ... ORDER BY <别名> DESC;`
```sql
-- 计算年薪并按年薪降序排列
SELECT salary * 12 AS annual_salary
FROM employees
ORDER BY annual_salary DESC;
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
-- 按部门和职位分组统计员工数和平均薪资
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
-- 先过滤 2024 年后入职的员工，再按部门分组过滤人数大于 3 的部门
SELECT department, COUNT(*) AS cnt
FROM employees
WHERE hire_date >= '2024-01-01'
GROUP BY department
HAVING COUNT(*) > 3;
```
