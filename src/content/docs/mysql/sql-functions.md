---
order: 60
tags:
  - 'mysql'
  - 'database'
difficulty: 'intermediate'
title: 'SQL 函数与高级查询'
module: 'mysql'
category: 'MySQL Basics'
description: '聚合函数、窗口函数、子查询与公用表表达式。'
author: 'Anonymous'
---

## 目录

1. [内置函数详解](#内置函数详解)
2. [子查询详解](#子查询详解)
3. [多表查询详解](#多表查询详解)
4. [最佳实践](#最佳实践)
5. [常见问题与解决方案](#常见问题与解决方案)
6. [总结](#总结)

---

## 1. 内置函数详解

### 1.1 字符串函数

| 函数        | 说明         | 示例                               |
| :---------- | :----------- | :--------------------------------- |
| CONCAT      | 连接字符串   | CONCAT('Hello', ' ', 'World')      |
| CONCAT_WS   | 带分隔符连接 | CONCAT_WS('-', '2024', '01', '01') |
| LENGTH      | 字节长度     | LENGTH('你好') = 6                 |
| CHAR_LENGTH | 字符长度     | CHAR_LENGTH('你好') = 2            |
| SUBSTRING   | 截取字符串   | SUBSTRING('Hello', 1, 3) = 'Hel'   |
| LEFT/RIGHT  | 从左/右截取  | LEFT('Hello', 2) = 'He'            |
| TRIM        | 去除首尾空格 | TRIM(' Hello ')                    |
| LOWER/UPPER | 转小/大写    | LOWER('HELLO')                     |
| REPLACE     | 替换字符串   | REPLACE('Hello', 'l', 'w')         |
| REVERSE     | 反转字符串   | REVERSE('Hello')                   |
| LPAD/RPAD   | 左/右填充    | LPAD('5', 3, '0') = '005'          |
| INSTR       | 查找子串位置 | INSTR('Hello', 'll') = 3           |

**字符串函数示例**：

```sql
 SELECT
  username,
  CONCAT(username, ' (', email, ')') AS user_info,
  LENGTH(username) AS name_bytes,
  CHAR_LENGTH(username) AS name_chars,
  LOWER(email) AS email_lower,
  UPPER(username) AS name_upper,
  SUBSTRING(phone, 1, 3) AS phone_prefix
 from users;
 True-- 拼接地址
 SELECT CONCAT_WS('', province, city, district, detail_address) AS full_address FROM addresses;
```

### 1.2 日期时间函数

| 函数               | 说明         | 示例                                           |
| :----------------- | :----------- | :--------------------------------------------- |
| NOW                | 当前日期时间 | NOW() = '2024-01-15 10:30:00'                  |
| CURDATE            | 当前日期     | CURDATE() = '2024-01-15'                       |
| CURTIME            | 当前时间     | CURTIME() = '10:30:00'                         |
| DATE               | 提取日期部分 | DATE('2024-01-15 10:30:00')                    |
| TIME               | 提取时间部分 | TIME('2024-01-15 10:30:00')                    |
| YEAR/MONTH/DAY     | 提取年月日   | YEAR(NOW()) = 2024                             |
| HOUR/MINUTE/SECOND | 提取时分秒   | HOUR(NOW()) = 10                               |
| DATE_FORMAT        | 格式化日期   | DATE_FORMAT(NOW(), '%Y-%m-%d')                 |
| DATE_ADD/DATE_SUB  | 日期加减     | DATE_ADD(NOW(), INTERVAL 1 DAY)                |
| DATEDIFF           | 日期差       | DATEDIFF('2024-01-15', '2024-01-01')           |
| TIMESTAMPDIFF      | 时间差       | TIMESTAMPDIFF(DAY, '2024-01-01', '2024-01-15') |
| DAYOFWEEK          | 星期几       | DAYOFWEEK(NOW()) = 2 (周一=2)                  |
| LAST_DAY           | 月份最后一天 | LAST_DAY('2024-01-15')                         |

**日期函数示例**：

```sql
 True-- 日期计算
 SELECT
  NOW() AS now,
  CURDATE() AS today,
  DATE_ADD(NOW(), INTERVAL 7 DAY) AS next_week,
  DATE_SUB(NOW(), INTERVAL 1 MONTH) AS last_month,
  DATE_FORMAT(NOW(), '%Y年%m月%d日 %H:%i:%s') AS formatted;
 True-- 日期差计算
 SELECT
  username,
  DATEDIFF(NOW(), created_at) AS days_since_join,
  TIMESTAMPDIFF(YEAR, created_at, NOW()) AS years_since_join
 from users;
 True-- 格式化生日
 SELECT
  username,
  DATE_FORMAT(birthday, '%Y年%m月%d日') AS birthday_formatted,
  TIMESTAMPDIFF(YEAR, birthday, NOW()) AS age
 from users;
```

### 1.3 数值函数

| 函数         | 说明     | 示例                         |
| :----------- | :------- | :--------------------------- |
| ABS          | 绝对值   | ABS(-10) = 10                |
| ROUND        | 四舍五入 | ROUND(3.14159, 2) = 3.14     |
| CEIL/CEILING | 向上取整 | CEIL(3.1) = 4                |
| FLOOR        | 向下取整 | FLOOR(3.9) = 3               |
| MOD          | 取模     | MOD(10, 3) = 1               |
| POW/POWER    | 幂运算   | POW(2, 3) = 8                |
| SQRT         | 平方根   | SQRT(16) = 4                 |
| RAND         | 随机数   | RAND() = 0.123...            |
| TRUNCATE     | 截断     | TRUNCATE(3.14159, 3) = 3.141 |
| SIGN         | 符号     | SIGN(-10) = -1               |

**数值函数示例**：

```sql
 True-- 基本计算
 SELECT
  price,
  ROUND(price, 2) AS rounded,
  CEIL(price) AS ceil_price,
  FLOOR(price) AS floor_price,
  ABS(price - 100) AS price_diff
 from products;
 True-- 随机数据
 SELECT * FROM users ORDER BY RAND() LIMIT 5; -- 随机取5条
 UPDATE users SET verification_code = FLOOR(RAND() * 900000 + 100000) WHERE status = 0;
```

### 1.4 条件函数

| 函数   | 说明       | 示例                           |
| :----- | :--------- | :----------------------------- |
| IF     | 条件判断   | IF(age > 18, '成人', '未成年') |
| IFNULL | NULL 替换  | IFNULL(email, '未填写')        |
| NULLIF | NULL 条件  | NULLIF(a, b)                   |
| CASE   | 多条件判断 | CASE WHEN ... THEN ... END     |

**条件函数示例**：

```sql
 True-- IF 函数
 SELECT
  username,
  age,
  IF(age >= 18, '成人', '未成年') AS age_desc,
  IF(status = 1, '正常', '禁用') AS status_desc
 from users;
 True-- IFNULL 函数
 SELECT
  username,
  IFNULL(email, '未填写') AS email,
  IFNULL(phone, IFNULL(telephone, '无')) AS contact
 from users;
 True-- CASE WHEN 函数
 SELECT
  username,
  age,
  CASE
  WHEN age < 18 THEN '未成年'
  WHEN age < 30 THEN '青年'
  WHEN age < 60 THEN '中年'
  ELSE '老年'
  END AS age_group,
  CASE status
  WHEN 1 THEN '正常'
  WHEN 2 THEN '冻结'
  WHEN 0 THEN '禁用'
  ELSE '未知'
  END AS status_desc
 from users;
 True-- 复杂 CASE
 SELECT
  SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS active_count,
  SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS inactive_count,
  SUM(CASE WHEN gender = '男' THEN 1 ELSE 0 END) AS male_count,
  SUM(CASE WHEN gender = '女' THEN 1 ELSE 0 END) AS female_count
 from users;
```

### 1.5 其他常用函数

```sql
 True-- 格式化和类型转换
 SELECT
  CAST(price AS CHAR) AS price_str,
  CONVERT(price, DECIMAL(10,2)) AS price_dec,
  FORMAT(price, 2) AS price_formatted -- 千位分隔符
 from products;
 True-- 加密函数（单向）
 SELECT
  MD5('password') AS md5_hash,
  SHA1('password') AS sha1_hash,
  SHA2('password', 256) AS sha256_hash
 from users;
 True-- UUID
 SELECT UUID() AS uuid;
 True-- 用户变量
 SET @total = 0;
 SELECT @total := @total + price FROM products;
```

## 2. 子查询详解

子查询是嵌套在另一个查询中的查询，可以用于 WHERE、FROM、SELECT 等子句。

### 2.1 子查询类型

#### 2.1.1 按位置分类

| 类型              | 说明                | 示例                      |
| :---------------- | :------------------ | :------------------------ |
| WHERE 子句子查询  | 在 WHERE 条件中使用 | `WHERE id IN (SELECT...)` |
| FROM 子句子查询   | 作为临时表          | `FROM (SELECT...) AS t`   |
| SELECT 子句子查询 | 作为列              | `SELECT (SELECT...)`      |

#### 2.1.2 按返回结果分类

| 类型       | 返回值   | 示例                                     |
| :--------- | :------- | :--------------------------------------- |
| 标量子查询 | 单个值   | `SELECT * WHERE age = (SELECT MAX(age))` |
| 列子查询   | 一列值   | `WHERE id IN (SELECT user_id...)`        |
| 行子查询   | 一行值   | `WHERE (id, name) = (SELECT...)`         |
| 表子查询   | 多行多列 | `FROM (SELECT...) AS t`                  |

### 2.2 标量子查询

```sql
 True-- 查询年龄最大的用户
 SELECT * FROM users WHERE age = (SELECT MAX(age) FROM users);
 True-- 查询高于平均年龄的用户
 SELECT * FROM users WHERE age > (SELECT AVG(age) FROM users);
 True-- 查询最新注册的用户
 SELECT * FROM users WHERE created_at = (SELECT MAX(created_at) FROM users);
 True-- 更新语句中使用子查询
 UPDATE users SET age = (SELECT MAX(age) FROM users) + 1 WHERE id = 1;
```

### 2.3 列子查询 (IN/ANY/ALL)

```sql
 True-- IN 子查询
 SELECT * FROM users WHERE id IN (SELECT user_id FROM vip_users);
 True-- NOT IN 子查询
 SELECT * FROM users WHERE id NOT IN (SELECT user_id FROM blocked_users);
 True-- ANY 子查询（满足任一即可）
 SELECT * FROM products WHERE price > ANY (SELECT price FROM products WHERE category_id = 1);
 True-- ALL 子查询（需满足所有）
 SELECT * FROM products WHERE price > ALL (SELECT price FROM products WHERE status = 0);
 True-- EXISTS 子查询
 SELECT * FROM users u WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
 True-- NOT EXISTS 子查询
 SELECT * FROM users u WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
```

### 2.4 FROM 子句子查询

```sql
 True-- 作为临时表
 SELECT * FROM (SELECT * FROM users WHERE status = 1) AS active_users;
 True-- 带聚合的子查询
 SELECT * FROM (
  SELECT
  status,
  COUNT(*) AS count,
  AVG(age) AS avg_age
  FROM users
  GROUP BY status
 True) AS stats WHERE avg_age > 25;
 True-- 多表连接子查询
 SELECT * FROM (
  SELECT u.*, COUNT(o.id) AS order_count
  FROM users u
  LEFT JOIN orders o ON u.id = o.user_id
  GROUP BY u.id
 True) AS user_orders WHERE order_count > 0;
```

### 2.5 SELECT 子句子查询

```sql
 True-- 查询每个用户的订单数量
 SELECT
  u.id,
  u.username,
  (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS order_count
 from users u;
 True-- 查询每个用户的最新订单时间
 SELECT
  u.id,
  u.username,
  (SELECT MAX(created_at) FROM orders WHERE user_id = u.id) AS last_order_time
 from users u;
 True-- 相关子查询
 SELECT
  u.username,
  (SELECT COUNT(*) FROM orders WHERE user_id = u.id AND status = 1) AS active_orders
 from users u;
```

### 2.6 子查询实战

```sql
 True-- 查询购买过商品A和商品B的用户
 SELECT DISTINCT user_id FROM order_items WHERE product_id = 'A'
 AND user_id IN (SELECT user_id FROM order_items WHERE product_id = 'B');
 True-- 查询销售额高于平均销售额的商品
 SELECT * FROM products
 WHERE id IN (
  SELECT product_id FROM order_items
  GROUP BY product_id
  HAVING SUM(price * quantity) > (SELECT AVG(total) FROM (SELECT SUM(price * quantity) AS total FROM order_items GROUP BY product_id) AS avg_total)
 True);
 True-- 查询各部门工资最高的员工
 SELECT * FROM employees e
 WHERE (dept_id, salary) IN (
  SELECT dept_id, MAX(salary) FROM employees GROUP BY dept_id
 True);
```

## 3. 多表查询详解

### 3.1 连接类型

```
 表A 表B
 True┌───┐ ┌───┐
 │ 1 │ ──┐─── │ A │
 │ 2 │ ──┼─── │ B │
 │ 3 │ ──┼─── │ C │
 │ 4 │ ──┘ │ │
 └───┘ └───┘
 内连接 (INNER JOIN): 1, 2, 3 (只有两边都有的)
 左连接 (LEFT JOIN): 1, 2, 3, 4 (A全部 + B匹配的)
 右连接 (RIGHT JOIN): 1, 2, 3, A, B, C (B全部 + A匹配的)
 全连接 (FULL JOIN): 1, 2, 3, 4, A, B, C (两边全部)
```

### 3.2 内连接 (INNER JOIN)

```sql
 True-- 基本语法
 SELECT u.username, o.order_no, o.total_amount
 from users u
 inNER JOIN orders o ON u.id = o.user_id;
 True-- 多个表连接
 SELECT u.username, o.order_no, p.product_name, oi.quantity
 from users u
 inNER JOIN orders o ON u.id = o.user_id
 inNER JOIN order_items oi ON o.id = oi.order_id
 inNER JOIN products p ON oi.product_id = p.id;
 True-- USING 简化（列名相同时）
 SELECT u.username, o.order_no
 from users u
 inNER JOIN orders o USING (user_id);
```

### 3.3 外连接 (LEFT/RIGHT JOIN)

```sql
 True-- 左连接：返回左表所有记录
 SELECT u.username, o.order_no, o.total_amount
 from users u
 LEFT JOIN orders o ON u.id = o.user_id;
 True-- 结果：所有用户，即使没有订单的用户也会显示
 True-- 右连接：返回右表所有记录
 SELECT u.username, o.order_no
 from users u
 RIGHT JOIN orders o ON u.id = o.user_id;
 True-- 结果：所有订单，即使没有对应用户的订单也会显示
 True-- 左连接实战：统计每个用户的订单数量
 SELECT u.username, COUNT(o.id) AS order_count
 from users u
 LEFT JOIN orders o ON u.id = o.user_id
 GROUP BY u.id, u.username;
 True-- 左连接实战：查询未购买过商品的用户
 SELECT u.*
 from users u
 LEFT JOIN orders o ON u.id = o.user_id
 WHERE o.id IS NULL;
 True-- 右连接实战：查询没有被分配的员工
 SELECT e.*
 from employees e
 RIGHT JOIN departments d ON e.dept_id = d.id
 WHERE e.id IS NULL;
```

### 3.4 自连接 (SELF JOIN)

```sql
 True-- 查询与某员工在同一部门的其他员工
 SELECT e1.name AS employee, e2.name AS colleague, d.name AS dept
 from employees e1
 JOIN employees e2 ON e1.dept_id = e2.dept_id AND e1.id != e2.id
 JOIN departments d ON e1.dept_id = d.id
 WHERE e1.name = '张三';
 True-- 自连接实战：与翔云公司在同一城市的供应商
 SELECT s1.Supplier_name, s1.Address, s2.Supplier_name AS 同城市供应商
 from supplier_info s1
 inNER JOIN supplier_info s2 ON s1.Address = s2.Address
 WHERE s1.Supplier_name = '翔云公司' AND s1.Supplier_id <> s2.Supplier_id;
 True-- 自连接实战：查询所有上级领导
 SELECT e.name AS employee, m.name AS manager
 from employees e
 LEFT JOIN employees m ON e.manager_id = m.id;
```

### 3.5 全连接 (FULL OUTER JOIN)

MySQL 不直接支持 FULL OUTER JOIN，可使用 UNION 实现：

```sql
 True-- 使用 UNION 实现全连接
 SELECT u.username, o.order_no
 from users u
 LEFT JOIN orders o ON u.id = o.user_id
 UNION
 SELECT u.username, o.order_no
 from users u
 RIGHT JOIN orders o ON u.id = o.user_id;
```

### 3.6 交叉连接 (CROSS JOIN)

```sql
 True-- 交叉连接（笛卡尔积）
 SELECT u.username, p.product_name
 from users u
 CROSS JOIN products p;
 True-- 结果：每个用户与每个商品的组合
 True-- 实际应用场景：生成时间表、组合枚举值等
 SELECT
  DATE_ADD('2024-01-01', INTERVAL n DAY) AS date
 from (SELECT 0 AS n UNION SELECT 1 UNION SELECT 2...) AS numbers;
```

### 3.7 多表连接实战

```sql
 True-- 列出员工姓名、销售订单编号、客户名称
 SELECT e.Employees_name, s.Sales_id, c.Customer_name
 from employees_info e
 inNER JOIN sales_info s ON e.Employees_id = s.Employees_id
 inNER JOIN customer_info c ON s.Customer_id = c.Customer_id;
 True-- 统计各销售员ID的销售业绩
 SELECT e.Employees_id, e.Employees_name,
  SUM(sl.Sales_price * sl.Sales_Number) AS 销售总业绩
 from employees_info e
 inNER JOIN sales_info s ON e.Employees_id = s.Employees_id
 inNER JOIN sales_list sl ON s.Sales_id = sl.Sales_id
 GROUP BY e.Employees_id, e.Employees_name
 ORDER BY 销售总业绩 DESC;
 True-- 查询客户购买的商品名称和购买数量
 SELECT c.Customer_name, m.Commodity_name, SUM(sl.Sales_Number) AS 购买数量
 from customer_info c
 inNER JOIN sales_info s ON c.Customer_id = s.Customer_id
 inNER JOIN sales_list sl ON s.Sales_id = sl.Sales_id
 inNER JOIN commodity_info m ON sl.Commodity_id = m.Commodity_id
 GROUP BY c.Customer_name, m.Commodity_name;
 True-- 完整订单信息查询
 SELECT e.Employees_name, s.Sales_id, c.Customer_name,
  m.Commodity_name, s.Sales_time, sl.Sales_Number
 from employees_info e
 inNER JOIN sales_info s ON e.Employees_id = s.Employees_id
 inNER JOIN customer_info c ON s.Customer_id = c.Customer_id
 inNER JOIN sales_list sl ON s.Sales_id = sl.Sales_id
 inNER JOIN commodity_info m ON sl.Commodity_id = m.Commodity_id;
```

## 4. 最佳实践

### 4.1 SQL 编写规范

1. **使用大写关键字**：提高可读性

```sql
 -- 推荐
 SELECT id, username, email FROM users WHERE status = 1;
 -- 不推荐
 select id, username, email from users where status = 1;
```

2. **使用缩进和对齐**：使代码结构清晰

```sql
 SELECT
 u.id,
 u.username,
 o.order_no,
 o.total_amount
 FROM users u
 INNER JOIN orders o ON u.id = o.user_id
 WHERE o.status = 1
 ORDER BY o.created_at DESC;
```

3. **添加注释**：解释复杂逻辑

```sql
 -- 查询活跃用户（30天内有登录）
 SELECT * FROM users
 WHERE last_login_time > DATE_SUB(NOW(), INTERVAL 30 DAY);
```

4. **避免 SELECT \***：只选择需要的列

```sql
 -- 推荐
 SELECT id, username, email FROM users;
 -- 不推荐
 SELECT * FROM users;
```

5. **使用有意义别名**：提高可读性

```sql
 -- 推荐
 SELECT u.username, o.order_no FROM users u INNER JOIN orders o ON u.id = o.user_id;
 -- 不推荐
 SELECT a.username, b.order_no FROM users a INNER JOIN orders b ON a.id = b.user_id;
```

### 4.2 性能优化

1. **使用索引**：为常用查询列创建索引
2. **避免 SELECT \***：减少网络传输
3. **使用 LIMIT**：限制返回行数
4. **避免在 WHERE 中使用函数**：导致索引失效
5. **合理使用 JOIN**：避免过多表连接
6. **优化 GROUP BY**：确保有适当的索引
7. **使用 EXPLAIN**：分析查询计划

### 4.3 安全实践

1. **参数化查询**：防止 SQL 注入
2. **最小权限原则**：为用户分配最小必要权限
3. **加密敏感数据**：密码、身份证号等
4. **输入验证**：验证和过滤用户输入
5. **定期备份**：确保数据安全

## 5. 常见问题与解决方案

### 5.1 SQL 注入

**问题**：恶意用户通过输入特殊字符来修改 SQL 语句
**解决方案**：

- 使用参数化查询/预编译语句
- 对输入进行验证和过滤
- 使用存储过程封装数据访问

### 5.2 索引失效

**问题**：查询没有使用索引，导致性能下降
**原因**：

- 在 WHERE 子句中使用函数
- 使用 != 或 <> 操作符
- 使用 LIKE '%...' 模式
- 数据类型不匹配
  **解决方案**：
- 避免在索引列上使用函数
- 使用 EXPLAIN 分析查询
- 创建合适的索引

### 5.3 死锁

**问题**：多个事务相互等待对方释放资源
**解决方案**：

- 保持事务简短
- 按相同顺序访问表
- 使用适当的隔离级别
- 避免长时间锁定资源

## 6. 总结

本章节详细介绍了 SQL 的高级特性，包括：

1. **内置函数**：字符串、日期、数值、条件函数
2. **子查询**：嵌套查询的各种用法
3. **多表查询**：内连接、外连接、自连接
4. **最佳实践**：SQL 编写规范、性能优化、安全实践
5. **常见问题**：SQL 注入、索引失效、死锁

---

### 更新日志 (Changelog)

- 2026-05-27: 拆分为独立文件，添加元数据，版本升级至 v4.0.0
- 2026-04-30: 大幅细化内容，添加内置函数详解、子查询、多表查询、最佳实践等
- 2026-04-05: 整合 SQL 基础语法知识
