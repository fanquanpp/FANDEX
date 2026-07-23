# 过滤条件

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## WHERE 基本语法

**换行写法：WHERE 子句过滤行**
`SELECT <select_list> FROM <table_source> WHERE <search_condition>;`
```sql
-- 使用 WHERE 子句过滤满足条件的行
SELECT select_list
FROM table_source
WHERE search_condition;
```

---

## 比较运算符

**单行写法：等于比较**
`WHERE <列> = <值>;`
```sql
-- 查询年龄等于 25 的记录
SELECT * FROM users WHERE age = 25;
```

**单行写法：不等于比较**
`WHERE <列> <> <值>;`
```sql
-- 查询状态不为 closed 的订单
SELECT * FROM orders WHERE status <> 'closed';
```

**单行写法：小于比较**
`WHERE <列> < <值>;`
```sql
-- 查询价格小于 100 的商品
SELECT * FROM products WHERE price < 100;
```

**单行写法：大于比较**
`WHERE <列> > <值>;`
```sql
-- 查询薪资大于 50000 的员工
SELECT * FROM employees WHERE salary > 50000;
```

**单行写法：小于等于比较**
`WHERE <列> <= <值>;`
```sql
-- 查询库存小于等于 0 的商品
SELECT * FROM products WHERE quantity <= 0;
```

**单行写法：大于等于比较**
`WHERE <列> >= <值>;`
```sql
-- 查询成绩大于等于 60 的记录
SELECT * FROM exams WHERE score >= 60;
```

---

## 安全等于运算符

**单行写法：MySQL NULL 安全等于**
`WHERE <列> <=> <值>;`
```sql
-- 查询手机号为 NULL 的用户（等价于 IS NULL）
SELECT * FROM users WHERE phone <=> NULL;
```

**单行写法：IS DISTINCT FROM**
`WHERE <列> IS DISTINCT FROM <值>;`
```sql
-- 查询手机号不为 NULL 的用户（等价于 IS NOT NULL）
SELECT * FROM users WHERE phone IS DISTINCT FROM NULL;
```

**单行写法：IS NOT DISTINCT FROM**
`WHERE <列> IS NOT DISTINCT FROM <值>;`
```sql
-- 查询手机号为 NULL 的用户（等价于 IS NULL）
SELECT * FROM users WHERE phone IS NOT DISTINCT FROM NULL;
```

---

## 逻辑运算符

**单行写法：AND 组合条件**
`WHERE <条件 1> AND <条件 2>;`
```sql
-- 查询部门 ID 为 5 且薪资大于 50000 的员工
SELECT * FROM employees
WHERE dept_id = 5 AND salary > 50000;
```

**单行写法：OR 组合条件**
`WHERE <条件 1> OR <条件 2>;`
```sql
-- 查询部门 ID 为 5 或 10 的员工
SELECT * FROM employees
WHERE dept_id = 5 OR dept_id = 10;
```

**单行写法：NOT 取反条件**
`WHERE NOT (<条件>);`
```sql
-- 查询部门 ID 不为 5 且不为 10 的员工
SELECT * FROM employees
WHERE NOT (dept_id = 5 OR dept_id = 10);
```

**换行写法：运算符优先级（AND 优先于 OR）**
`WHERE <条件 1> OR <条件 2> AND <条件 3>;`
```sql
-- AND 优先于 OR，等价于 category = 'A' OR (category = 'B' AND price > 100)
SELECT * FROM products
WHERE category = 'A' OR category = 'B' AND price > 100;
```

**换行写法：括号改变优先级**
`WHERE (<条件 1> OR <条件 2>) AND <条件 3>;`
```sql
-- 使用括号改变优先级
SELECT * FROM products
WHERE (category = 'A' OR category = 'B') AND price > 100;
```

---

## IN 运算符

**单行写法：离散值匹配**
`WHERE <列> IN (<值 1>, <值 2>, ...);`
```sql
-- 查询状态为待处理、处理中、已发货的订单
SELECT * FROM orders
WHERE status IN ('pending', 'processing', 'shipped');
```

**单行写法：排除离散值**
`WHERE <列> NOT IN (<值 1>, <值 2>, ...);`
```sql
-- 查询状态不为已取消、已退货的订单
SELECT * FROM orders
WHERE status NOT IN ('cancelled', 'returned');
```

**换行写法：子查询中的 IN**
`WHERE <列> IN (SELECT ...);`
```sql
-- 查询 VIP 等级大于等于 3 的用户的订单
SELECT * FROM orders
WHERE user_id IN (
    SELECT id FROM users WHERE vip_level >= 3
);
```

---

## BETWEEN 运算符

**单行写法：范围查询（包含边界）**
`WHERE <列> BETWEEN <下界> AND <上界>;`
```sql
-- 查询价格在 100 到 500 之间的商品
SELECT * FROM products
WHERE price BETWEEN 100 AND 500;
```

**单行写法：排除范围**
`WHERE <列> NOT BETWEEN <下界> AND <上界>;`
```sql
-- 查询价格不在 100 到 500 之间的商品
SELECT * FROM products
WHERE price NOT BETWEEN 100 AND 500;
```

**单行写法：日期范围查询**
`WHERE <列> BETWEEN DATE '<开始>' AND DATE '<结束>';`
```sql
-- 查询 2026 年上半年的订单
SELECT * FROM orders
WHERE created_at BETWEEN DATE '2026-01-01' AND DATE '2026-06-30';
```

**换行写法：时间戳范围查询（避免精度问题）**
`WHERE <列> >= <开始> AND <列> < <结束>;`
```sql
-- 查询 2026-06-14 全天的日志（避免 BETWEEN 精度问题）
SELECT * FROM logs
WHERE created_at >= '2026-06-14 00:00:00'
  AND created_at < '2026-06-15 00:00:00';
```

---

## LIKE 运算符

**单行写法：前缀匹配**
`WHERE <列> LIKE '<前缀>%';`
```sql
-- 查询姓"张"的用户（可利用索引）
SELECT * FROM users WHERE name LIKE '张%';
```

**单行写法：后缀匹配**
`WHERE <列> LIKE '%<后缀>';`
```sql
-- 查询名字以"明"结尾的用户（无法利用普通索引）
SELECT * FROM users WHERE name LIKE '%明';
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
-- 查询"张三"、"张四"等两字姓名
SELECT * FROM users WHERE name LIKE '张_';
```

**单行写法：ESCAPE 转义特殊字符**
`WHERE <列> LIKE '<模式>' ESCAPE '<转义字符>';`
```sql
-- 查找文件名为"100%"的记录
SELECT * FROM files WHERE filename LIKE '100\%' ESCAPE '\';
```

---

## 正则表达式匹配

**单行写法：PostgreSQL 正则匹配**
`WHERE <列> ~ '<正则>';`
```sql
-- 查询姓张、三、四、五的用户
SELECT * FROM users WHERE name ~ '^张[三四五]$';
```

**单行写法：MySQL 正则匹配**
`WHERE <列> REGEXP '<正则>';`
```sql
-- 查询姓张、三、四、五的用户
SELECT * FROM users WHERE name REGEXP '^张[三四五]$';
```

**单行写法：SQL 标准模式匹配**
`WHERE <列> SIMILAR TO '<模式>';`
```sql
-- 查询姓张、三、四、五的用户
SELECT * FROM users WHERE name SIMILAR TO '张(三|四|五)';
```

---

## IS NULL / IS NOT NULL

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

**换行写法：多列 NULL 检查**
`WHERE <列 1> IS NULL AND <列 2> IS NOT NULL;`
```sql
-- 查询已付款但未发货的订单
SELECT * FROM orders
WHERE shipping_date IS NULL AND payment_date IS NOT NULL;
```

---

## NULL 相关函数

**单行写法：COALESCE 返回第一个非 NULL 参数**
`SELECT COALESCE(<列 1>, <列 2>, <默认值>) FROM <表名>;`
```sql
-- 查询用户联系方式，优先手机号，其次邮箱，最后显示 N/A
SELECT COALESCE(phone, email, 'N/A') AS contact FROM users;
```

**单行写法：NULLIF 相等返回 NULL**
`SELECT NULLIF(<列 1>, <列 2>) FROM <表名>;`
```sql
-- 查询成绩，为 0 时返回 NULL 避免除零
SELECT NULLIF(score, 0) AS safe_score FROM exams;
```

**单行写法：MySQL IFNULL**
`SELECT IFNULL(<列>, <默认值>) FROM <表名>;`
```sql
-- 查询用户手机号，未填写则显示 N/A
SELECT IFNULL(phone, 'N/A') FROM users;
```

---

## SARGable 条件

**单行写法：非 SARGable 条件（无法利用索引）**
`WHERE <函数>(<列>) = <值>;`
```sql
-- 对列使用函数导致无法利用索引
SELECT * FROM orders WHERE YEAR(created_at) = 2026;
```

**换行写法：SARGable 条件改写（可利用索引）**
`WHERE <列> >= <开始> AND <列> < <结束>;`
```sql
-- 改写为范围查询以利用索引
SELECT * FROM orders WHERE created_at >= '2026-01-01' AND created_at < '2027-01-01';
```
