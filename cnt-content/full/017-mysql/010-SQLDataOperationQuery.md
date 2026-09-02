---
order: 100
title: SQL 数据操作与查询
module: 'mysql'
category: 数据库
difficulty: intermediate
description: INSERT/UPDATE/DELETE、SELECT 基础与条件查询。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'mysql/008-SQLDataDefinitionAdvanced'
  - 'mysql/009-MyISAMStorageEngine'
  - 'mysql/011-MemoryStorageEngine'
prerequisites:
  - 'mysql/089-View'
---

## 1. SQL 概述

### 1.1 SQL 是什么

SQL（Structured Query Language，结构化查询语言）是一种用于管理关系型数据库的标准编程语言。SQL 由 IBM 在 1970 年代开发，后来成为 ANSI（美国国家标准协会）和 ISO（国际标准化组织）的标准。

### 1.2 SQL 语句分类

| 分类    | 全称                         | 说明                             | 典型语句               |
| :------ | :--------------------------- | :------------------------------- | :--------------------- |
| **DDL** | Data Definition Language     | 数据定义语言，用于定义数据库对象 | CREATE、ALTER、DROP    |
| **DML** | Data Manipulation Language   | 数据操作语言，用于操作数据       | INSERT、UPDATE、DELETE |
| **DQL** | Data Query Language          | 数据查询语言，用于查询数据       | SELECT                 |
| **DCL** | Data Control Language        | 数据控制语言，用于控制权限       | GRANT、REVOKE          |
| **TCL** | Transaction Control Language | 事务控制语言，用于管理事务       | COMMIT、ROLLBACK       |

### 1.3 SQL 基本规则

- SQL 语句以分号 `;` 结尾
- SQL 不区分大小写（但习惯上关键字大写）
- 字符串值使用单引号 `' '` 包裹
- 注释使用 `--` 或 `/* */`

## 2. DML (数据操作语言) - Data Manipulation Language

DML 用于插入、更新、删除数据。

### 2.1 插入数据详解

#### 2.1.1 基本 INSERT

```sql
 inSERT INTO users (id, username, email, password, age)
 VALUES (1, '张三', 'zhangsan@example.com', 'encrypted_pass', 25);
 inSERT INTO users (username, email, password, age)
 VALUES ('张三', 'zhangsan@example.com', 'encrypted_pass', 25);
 inSERT INTO users SET
  username = '李四',
  email = 'lisi@example.com',
  password = 'encrypted_pass',
  age = 30;
```

#### 2.1.2 批量插入

```sql
 inSERT INTO users (username, email, password, age) VALUES
 ('王五', 'wangwu@example.com', 'pass1', 28),
 ('赵六', 'zhaoliu@example.com', 'pass2', 32),
 ('钱七', 'qianqi@example.com', 'pass3', 27);
 inSERT INTO users (username, email) VALUES
 ('孙八', 'sunba@example.com'),
 ('周九', 'zhoujiu@example.com');
```

#### 2.1.3 插入查询结果

```sql
 inSERT INTO users (username, email, password, age)
 SELECT username, email, password, age FROM old_users WHERE status = 1;
 inSERT IGNORE INTO users (username, email)
 SELECT username, email FROM temp_users;
```

#### 2.1.4 INSERT 高级用法

```sql
 inSERT INTO users (id, username, email) VALUES (1, '张三', 'new_email@example.com')
 ON DUPLICATE KEY UPDATE email = 'new_email@example.com', updated_at = NOW();
 inSERT IGNORE INTO users (username, email) VALUES ('张三', 'test@example.com');
 replace INTO users (id, username, email) VALUES (1, '张三', 'new_email@example.com');
 inSERT INTO users (username, email) VALUES ('测试', 'test@example.com');
 SELECT LAST_INSERT_ID();
```

### 2.2 更新数据详解

#### 2.2.1 基本 UPDATE

```sql
 UPDATE users SET age = 26 WHERE id = 1;
 UPDATE users SET age = age + 1 WHERE age < 30;
 UPDATE users
 SET age = 27, email = 'new_email@example.com', updated_at = NOW()
 WHERE id = 1;
```

#### 2.2.2 UPDATE 高级用法

```sql
 UPDATE users u
 JOIN user_profiles p ON u.id = p.user_id
 SET u.avatar = p.avatar_url, u.status = p.status
 WHERE u.id = 1;
 UPDATE users
 SET balance = (SELECT SUM(amount) FROM orders WHERE user_id = users.id)
 WHERE id = 1;
 UPDATE users SET last_login_time = NOW() WHERE last_login_time IS NULL;
 START TRANSACTION;
 UPDATE accounts SET balance = balance - 100 WHERE id = 1;
 UPDATE accounts SET balance = balance + 100 WHERE id = 2;
 commit;
```

#### 2.2.3 UPDATE 实战示例

```sql
 UPDATE employees_info SET Employees_name = '王西' WHERE Employees_id = 'xz100101';
 UPDATE employees_info SET Post_id = 'xs1001' WHERE Employees_id = 'xs100103';
 UPDATE customer_info
 SET Customer_name = '柳甜', Customer_Birth = NULL, Telephone = '13879008942'
 WHERE Customer_name = '柳田';
 UPDATE sales_list SET Sales_Number = Sales_Number + 5 WHERE Sales_Number < 10;
 UPDATE orders SET status = 3, shipped_at = NOW() WHERE status = 2 AND shipped_at IS NULL;
```

### 2.3 删除数据详解

#### 2.3.1 基本 DELETE

```sql
 delete FROM users WHERE id = 1;
 delete FROM users WHERE status = 0 AND created_at < '2024-01-01';
 delete FROM users;
 delete FROM users ORDER BY created_at DESC LIMIT 10;
```

#### 2.3.2 DELETE 高级用法

```sql
 delete u FROM users u
 JOIN inactive_users i ON u.email = i.email
 WHERE u.status = 0;
 delete FROM users WHERE id IN (SELECT user_id FROM old_users WHERE created_at < '2023-01-01');
 delete FROM users WHERE id = 1; -- 订单表中的相关记录会自动删除
```

#### 2.3.3 DELETE 与 TRUNCATE 区别

| 特性   | DELETE             | TRUNCATE             |
| :----- | :----------------- | :------------------- |
| 速度   | 慢（一行一行删除） | 快（直接删除数据页） |
| 事务   | 记录日志，可回滚   | 不记录日志，不可回滚 |
| 自增ID | 不会重置           | 重置为 1             |
| WHERE  | 支持               | 不支持               |
| 触发器 | 触发 DELETE 触发器 | 不触发               |

#### 2.3.4 DELETE 实战示例

```sql
 delete FROM mark WHERE studentno = 'xx100104' AND courseno = 'kc1002';
 delete FROM orders WHERE status = 5 AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
 delete FROM logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 3 MONTH);
```

### 2.4 数据操作最佳实践

```sql
 SELECT * FROM users WHERE id = 1 FOR UPDATE;
 START TRANSACTION;
 UPDATE users SET status = 0 WHERE last_login_time < '2023-01-01';
 UPDATE stats SET inactive_users = inactive_users + 1;
 commit;
 EXPLAIN UPDATE users SET status = 0 WHERE last_login_time < '2023-01-01';
 delete FROM logs WHERE created_at < '2023-01-01' LIMIT 1000;
```

## 3. DQL (数据查询语言) - Data Query Language

DQL 是最重要的 SQL 部分，用于从数据库中查询数据。

### 3.1 基础查询详解

#### 3.1.1 SELECT 基础语法

```sql
 SELECT * FROM users;
 SELECT id, username, email FROM users;
 SELECT username, price, quantity, price * quantity AS total FROM order_items;
 SELECT
  id AS user_id,
  username AS name,
  email AS "邮箱地址"
 from users;
 SELECT
  username,
  price,
  quantity,
  price * quantity AS subtotal,
  price * quantity * 0.1 AS tax
 from order_items;
 SELECT DISTINCT status FROM users;
 SELECT DISTINCT province, city FROM addresses;
```

#### 3.1.2 列类型转换

```sql
 SELECT CONCAT(username, ' (', email, ')') AS user_info FROM users;
 SELECT CONCAT_WS(' - ', province, city, district) AS full_address FROM addresses;
 SELECT CAST(price AS CHAR) FROM products;
 SELECT CONVERT(price, CHAR) FROM products;
 SELECT DATE_FORMAT(created_at, '%Y年%m月%d日') AS formatted_date FROM users;
```

### 3.2 条件查询详解

#### 3.2.1 WHERE 子句

```sql
 SELECT * FROM users WHERE age > 25;
 SELECT * FROM users WHERE age >= 25;
 SELECT * FROM users WHERE age < 30;
 SELECT * FROM users WHERE age <= 30;
 SELECT * FROM users WHERE age = 25;
 SELECT * FROM users WHERE age != 25;
 SELECT * FROM users WHERE age <> 25;
```

#### 3.2.2 逻辑运算符

```sql
 SELECT * FROM users WHERE age > 25 AND status = 1;
 SELECT * FROM users WHERE age > 20 AND age < 30 AND gender = '男';
 SELECT * FROM users WHERE status = 1 OR status = 2;
 SELECT * FROM users WHERE username = '张三' OR username = '李四';
 SELECT * FROM users WHERE NOT status = 0;
 SELECT * FROM users WHERE NOT (age < 20 OR age > 30);
 SELECT * FROM users
 WHERE (age > 25 AND status = 1) OR (age < 20 AND status = 2);
```

#### 3.2.3 范围查询

```sql
 SELECT * FROM users WHERE age BETWEEN 20 AND 30;
 SELECT * FROM users WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31';
 SELECT * FROM users WHERE age NOT BETWEEN 20 AND 30;
```

#### 3.2.4 IN 和 NOT IN

```sql
 SELECT * FROM users WHERE status IN (1, 2, 3);
 SELECT * FROM users WHERE username IN ('张三', '李四', '王五');
 SELECT * FROM users WHERE id IN (SELECT user_id FROM vip_users);
 SELECT * FROM users WHERE status NOT IN (0, -1);
```

#### 3.2.5 LIKE 模糊查询

```sql
 SELECT * FROM users WHERE username LIKE '张%'; -- 以张开头
 SELECT * FROM users WHERE username LIKE '%张%'; -- 包含张
 SELECT * FROM users WHERE username LIKE '%张'; -- 以张结尾
 SELECT * FROM users WHERE username LIKE '张_'; -- 张后面一个字
 SELECT * FROM users WHERE username LIKE '__张'; -- 张前面两个字
 SELECT * FROM users WHERE phone LIKE '138%'; -- 手机号以138开头
 SELECT * FROM users WHERE email LIKE '%@gmail.com'; -- Gmail邮箱
 SELECT * FROM users WHERE username NOT LIKE '%admin%';
 SELECT * FROM users WHERE username LIKE '%100%%' ESCAPE '%';
```

#### 3.2.6 NULL 值查询

```sql
 SELECT * FROM users WHERE email IS NULL;
 SELECT * FROM users WHERE deleted_at IS NULL;
 SELECT * FROM users WHERE email IS NOT NULL;
```

#### 3.2.7 条件查询实战

```sql
 SELECT * FROM employees_info WHERE Employees_sex = '女';
 SELECT * FROM employees_info WHERE Employees_sex = '女' AND Hiredate < '2015-01-01';
 SELECT *, YEAR(NOW()) - YEAR(Hiredate) AS 工龄
 from employees_info
 WHERE YEAR(NOW()) - YEAR(Hiredate) > 15;
 SELECT * FROM employees_info WHERE Post_id BETWEEN 'cg1001' AND 'hr1001';
 SELECT * FROM employees_info WHERE Post_id IN ('cg1001', 'hr1001');
 SELECT * FROM employees_info WHERE Employees_name LIKE '%王%';
 SELECT *, YEAR(NOW()) - YEAR(Customer_Birth) AS 年龄
 from customer_info
 WHERE YEAR(NOW()) - YEAR(Customer_Birth) > 30;
 SELECT * FROM customer_info WHERE Customer_Birth IS NULL;
```

### 3.3 排序与分页详解

#### 3.3.1 ORDER BY 排序

```sql
 SELECT * FROM users ORDER BY age ASC;
 SELECT * FROM users ORDER BY age; -- 默认升序
 SELECT * FROM users ORDER BY created_at DESC;
 SELECT * FROM users ORDER BY status ASC, age DESC;
 SELECT *, age * 365 AS days_alive FROM users ORDER BY days_alive DESC;
 SELECT *, price * quantity AS subtotal FROM order_items ORDER BY subtotal DESC;
 SELECT id, username, email FROM users ORDER BY 3; -- 按第3列排序
```

#### 3.3.2 LIMIT 分页

```sql
 SELECT * FROM users LIMIT 10;
 SELECT * FROM users LIMIT 10 OFFSET 10;
 SELECT * FROM users LIMIT 10, 10; -- 简写形式
 SELECT * FROM users ORDER BY id DESC LIMIT 5;
 SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 0;
 SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 10;
 SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 20;
 SELECT * FROM users LIMIT 1;
```

### 3.4 分组查询详解

#### 3.4.1 GROUP BY 基础

```sql
 SELECT status, COUNT(*) AS count FROM users GROUP BY status;
 SELECT province, city, COUNT(*) AS count FROM users GROUP BY province, city;
 SELECT status, AVG(age) AS avg_age FROM users GROUP BY status;
 SELECT status, SUM(balance) AS total_balance FROM users GROUP BY status;
```

#### 3.4.2 HAVING 子句

HAVING 用于过滤分组后的结果，WHERE 用于过滤分组前的记录。

```sql
 SELECT status, COUNT(*) AS count
 from users
 GROUP BY status
 HAVING count > 10;
 SELECT status, AVG(age) AS avg_age, COUNT(*) AS count
 from users
 WHERE age > 0 -- 先过滤
 GROUP BY status -- 再分组
 HAVING count > 5; -- 最后过滤分组结果
 SELECT status, COUNT(*) AS count, AVG(age) AS avg_age
 from users
 GROUP BY status
 HAVING count > 10 AND avg_age > 25;
```

#### 3.4.3 GROUP BY 实战

```sql
 SELECT COUNT(Customer_name) AS 人数, Customer_sex AS 性别
 from customer_info GROUP BY Customer_sex;
 SELECT Commodity_id, SUM(Sales_Number) AS 总数
 from sales_list GROUP BY Commodity_id;
 SELECT Commodity_id, AVG(Sales_price) AS 平均售价
 from sales_list
 GROUP BY Commodity_id
 HAVING AVG(Sales_price) > 1500;
 SELECT Commodity_id, SUM(Sales_Number) AS 总数量
 from sales_list
 GROUP BY Commodity_id
 HAVING SUM(Sales_Number) > 50;
```

#### 3.4.4 GROUP BY 注意事项

```sql
 SELECT status, COUNT(*) FROM users GROUP BY status;
 SELECT ANY_VALUE(id), status, COUNT(*) FROM users GROUP BY status;
```

### 3.5 聚合函数详解

#### 3.5.1 常用聚合函数

| 函数         | 说明       | 示例                                             |
| :----------- | :--------- | :----------------------------------------------- |
| COUNT        | 计数       | COUNT(\*)、COUNT(column)、COUNT(DISTINCT column) |
| SUM          | 求和       | SUM(price)、SUM(quantity)                        |
| AVG          | 平均值     | AVG(price)                                       |
| MAX          | 最大值     | MAX(price)、MAX(created_at)                      |
| MIN          | 最小值     | MIN(price)、MIN(created_at)                      |
| GROUP_CONCAT | 拼接字符串 | GROUP_CONCAT(username SEPARATOR ',')             |

#### 3.5.2 COUNT 用法

```sql
 SELECT COUNT(*) FROM users;
 SELECT COUNT(email) FROM users;
 SELECT COUNT(DISTINCT status) FROM users;
 SELECT COUNT(DISTINCT province, city) FROM users;
```

#### 3.5.3 聚合函数综合示例

```sql
 SELECT SUM(Purchase_price * Purchase_Number) AS 总成本 FROM purchase_list;
 SELECT
  AVG(Purchase_Number) AS 平均采购数量,
  MAX(Purchase_Number) AS 最大采购数量,
  MIN(Purchase_Number) AS 最小采购数量
 from purchase_list;
 SELECT
  Purchase_id,
  SUM(Purchase_Number) AS 总量,
  AVG(Purchase_Number) AS 平均,
  MAX(Purchase_Number) AS 最大,
  MIN(Purchase_Number) AS 最小
 from purchase_list
 GROUP BY Purchase_id;
```

---

## 插入数据

**单行写法：指定列插入单行**
`INSERT INTO <表名> (<列名>[, <列名>...]) VALUES (<值>[, <值>...])`
```sql
-- 指定列插入单行数据
INSERT INTO users (id, username, email, password, age)
VALUES (1, '张三', 'zhangsan@example.com', 'encrypted_pass', 25);
```

**单行写法：省略自增列插入**
`INSERT INTO <表名> (<非自增列>[, ...]) VALUES (<值>[, ...])`
```sql
-- 省略自增主键列插入数据
INSERT INTO users (username, email, password, age)
VALUES ('张三', 'zhangsan@example.com', 'encrypted_pass', 25);
```

**换行写法：SET 语法插入**
`INSERT INTO <表名> SET <列名> = <值>[, <列名> = <值>...]`
```sql
-- 使用 SET 形式插入数据
INSERT INTO users SET
  username = '李四',
  email = 'lisi@example.com',
  password = 'encrypted_pass',
  age = 30;
```

**换行写法：批量插入多行**
`INSERT INTO <表名> (<列名>) VALUES (<值1>), (<值2>)[, ...]`
```sql
-- 批量插入多行数据
INSERT INTO users (username, email, password, age) VALUES
('王五', 'wangwu@example.com', 'pass1', 28),
('赵六', 'zhaoliu@example.com', 'pass2', 32),
('钱七', 'qianqi@example.com', 'pass3', 27);
```

**换行写法：插入查询结果**
`INSERT INTO <表名> (<列名>) SELECT <列名> FROM <源表> [WHERE <条件>]`
```sql
-- 从旧表迁移符合条件的数据
INSERT INTO users (username, email, password, age)
SELECT username, email, password, age FROM old_users WHERE status = 1;
```

**换行写法：插入或更新**
`INSERT INTO <表名> (<列名>) VALUES (<值>) ON DUPLICATE KEY UPDATE <列名> = <值>`
```sql
-- 主键冲突时更新指定字段
INSERT INTO users (id, username, email) VALUES (1, '张三', 'new@example.com')
ON DUPLICATE KEY UPDATE email = 'new@example.com', updated_at = NOW();
```

**单行写法：忽略冲突插入**
`INSERT IGNORE INTO <表名> (<列名>) VALUES (<值>)`
```sql
-- 主键冲突时跳过插入
INSERT IGNORE INTO users (username, email) VALUES ('张三', 'test@example.com');
```

**单行写法：替换插入**
`REPLACE INTO <表名> (<列名>) VALUES (<值>)`
```sql
-- 主键冲突时删除原行再插入
REPLACE INTO users (id, username, email) VALUES (1, '张三', 'new@example.com');
```

**单行写法：获取自增 ID**
`SELECT LAST_INSERT_ID();`
```sql
-- 插入后获取自增主键值
SELECT LAST_INSERT_ID();
```

---

## 更新数据

**单行写法：更新单列**
`UPDATE <表名> SET <列名> = <值> WHERE <条件>`
```sql
-- 更新指定行的单列
UPDATE users SET age = 26 WHERE id = 1;
```

**单行写法：基于原值更新**
`UPDATE <表名> SET <列名> = <列名> <运算符> <值> WHERE <条件>`
```sql
-- 基于原值进行累加更新
UPDATE users SET age = age + 1 WHERE age < 30;
```

**换行写法：多列更新**
`UPDATE <表名> SET <列名> = <值>[, <列名> = <值>...] WHERE <条件>`
```sql
-- 同时更新多个字段
UPDATE users
SET age = 27, email = 'new@example.com', updated_at = NOW()
WHERE id = 1;
```

**换行写法：JOIN 关联更新**
`UPDATE <表1> [AS <别名>] JOIN <表2> [AS <别名>] ON <条件> SET <列名> = <值>`
```sql
-- 关联其他表更新数据
UPDATE users u
JOIN user_profiles p ON u.id = p.user_id
SET u.avatar = p.avatar_url, u.status = p.status
WHERE u.id = 1;
```

**换行写法：子查询更新**
`UPDATE <表名> SET <列名> = (SELECT <聚合> FROM <表> WHERE <条件>)`
```sql
-- 用子查询结果更新字段
UPDATE users
SET balance = (SELECT SUM(amount) FROM orders WHERE user_id = users.id)
WHERE id = 1;
```

---

## 删除数据

**单行写法：条件删除**
`DELETE FROM <表名> WHERE <条件>`
```sql
-- 删除符合条件的行
DELETE FROM users WHERE id = 1;
```

**单行写法：范围删除**
`DELETE FROM <表名> WHERE <条件1> AND <条件2>`
```sql
-- 删除符合多条件的行
DELETE FROM users WHERE status = 0 AND created_at < '2024-01-01';
```

**单行写法：排序后删除指定行数**
`DELETE FROM <表名> ORDER BY <列名> [ASC|DESC] LIMIT <行数>`
```sql
-- 按排序删除前 N 行
DELETE FROM users ORDER BY created_at DESC LIMIT 10;
```

**换行写法：JOIN 关联删除**
`DELETE <别名> FROM <表1> [AS <别名>] JOIN <表2> [AS <别名>] ON <条件> WHERE <条件>`
```sql
-- 关联其他表删除数据
DELETE u FROM users u
JOIN inactive_users i ON u.email = i.email
WHERE u.status = 0;
```

**换行写法：子查询删除**
`DELETE FROM <表名> WHERE <列名> IN (SELECT <列名> FROM <表> WHERE <条件>)`
```sql
-- 用子查询结果删除数据
DELETE FROM users WHERE id IN (SELECT user_id FROM old_users WHERE created_at < '2023-01-01');
```

**单行写法：清空表**
`TRUNCATE TABLE <表名>`
```sql
-- 清空表数据并重置自增值
TRUNCATE TABLE users;
```

---

## 基础查询

**单行写法：查询所有列**
`SELECT * FROM <表名>`
```sql
-- 查询表中所有字段
SELECT * FROM users;
```

**单行写法：查询指定列**
`SELECT <列名>[, <列名>...] FROM <表名>`
```sql
-- 查询指定列数据
SELECT id, username, email FROM users;
```

**单行写法：列别名**
`SELECT <列名> [AS] <别名>`
```sql
-- 使用别名查询字段
SELECT username AS name, email AS "邮箱地址" FROM users;
```

**单行写法：计算列别名**
`SELECT <表达式> AS <别名>`
```sql
-- 计算列并设置别名
SELECT price, quantity, price * quantity AS total FROM order_items;
```

**单行写法：单列去重**
`SELECT DISTINCT <列名> FROM <表名>`
```sql
-- 查询单列去重结果
SELECT DISTINCT status FROM users;
```

**单行写法：多列去重**
`SELECT DISTINCT <列名1>, <列名2>[, ...] FROM <表名>`
```sql
-- 查询多列组合去重结果
SELECT DISTINCT province, city FROM addresses;
```

---

## 条件查询

**单行写法：大于比较**
`WHERE <列名> > <值>`
```sql
-- 查询年龄大于 25 的用户
SELECT * FROM users WHERE age > 25;
```

**单行写法：大于等于比较**
`WHERE <列名> >= <值>`
```sql
-- 查询年龄大于等于 25 的用户
SELECT * FROM users WHERE age >= 25;
```

**单行写法：小于比较**
`WHERE <列名> < <值>`
```sql
-- 查询年龄小于 30 的用户
SELECT * FROM users WHERE age < 30;
```

**单行写法：不等于比较**
`WHERE <列名> <!=|<>> <值>`
```sql
-- 查询年龄不等于 25 的用户
SELECT * FROM users WHERE age != 25;
```

**单行写法：AND 逻辑与**
`WHERE <条件1> AND <条件2>`
```sql
-- 查询同时满足多条件的用户
SELECT * FROM users WHERE age > 25 AND status = 1;
```

**单行写法：OR 逻辑或**
`WHERE <条件1> OR <条件2>`
```sql
-- 查询满足任一条件的用户
SELECT * FROM users WHERE status = 1 OR status = 2;
```

**单行写法：NOT 逻辑非**
`WHERE NOT <条件>`
```sql
-- 查询不满足条件的用户
SELECT * FROM users WHERE NOT status = 0;
```

**换行写法：括号组合条件**
`WHERE (<条件1> AND <条件2>) OR (<条件3> AND <条件4>)`
```sql
-- 使用括号组合复杂条件
SELECT * FROM users
WHERE (age > 25 AND status = 1) OR (age < 20 AND status = 2);
```

**单行写法：数值范围查询**
`WHERE <列名> [NOT] BETWEEN <起始> AND <结束>`
```sql
-- 查询年龄在 20 到 30 之间的用户
SELECT * FROM users WHERE age BETWEEN 20 AND 30;
```

**单行写法：日期范围查询**
`WHERE <日期列> BETWEEN '<起始日期>' AND '<结束日期>'`
```sql
-- 查询指定日期范围内的用户
SELECT * FROM users WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31';
```

**单行写法：IN 多值匹配**
`WHERE <列名> [NOT] IN (<值1>, <值2>[, ...])`
```sql
-- 查询状态为指定值的用户
SELECT * FROM users WHERE status IN (1, 2, 3);
```

**单行写法：IN 子查询**
`WHERE <列名> IN (SELECT <列名> FROM <表名>)`
```sql
-- 查询属于 VIP 用户表的用户
SELECT * FROM users WHERE id IN (SELECT user_id FROM vip_users);
```

**单行写法：前缀模糊查询**
`WHERE <列名> [NOT] LIKE '<前缀>%'`
```sql
-- 查询以指定字符开头的用户名
SELECT * FROM users WHERE username LIKE '张%';
```

**单行写法：包含模糊查询**
`WHERE <列名> LIKE '%<子串>%'`
```sql
-- 查询包含指定字符的用户名
SELECT * FROM users WHERE username LIKE '%张%';
```

**单行写法：单字符匹配模糊查询**
`WHERE <列名> LIKE '<前缀>_'`
```sql
-- 查询指定前缀加单字符的用户名
SELECT * FROM users WHERE username LIKE '张_';
```

**单行写法：指定转义符模糊查询**
`WHERE <列名> LIKE '<模式>' ESCAPE '<转义符>'`
```sql
-- 使用指定转义符查询包含百分号的数据
SELECT * FROM users WHERE username LIKE '%100\%%' ESCAPE '\';
```

**单行写法：查询空值**
`WHERE <列名> IS NULL`
```sql
-- 查询邮箱为空的用户
SELECT * FROM users WHERE email IS NULL;
```

**单行写法：查询非空值**
`WHERE <列名> IS NOT NULL`
```sql
-- 查询已删除的用户
SELECT * FROM users WHERE deleted_at IS NOT NULL;
```

---

## 排序与分页

**单行写法：升序排序**
`ORDER BY <列名> ASC`
```sql
-- 按年龄升序排序
SELECT * FROM users ORDER BY age ASC;
```

**单行写法：降序排序**
`ORDER BY <列名> DESC`
```sql
-- 按创建时间降序排序
SELECT * FROM users ORDER BY created_at DESC;
```

**单行写法：多列排序**
`ORDER BY <列名1> [ASC|DESC], <列名2> [ASC|DESC]`
```sql
-- 先按状态升序再按年龄降序排序
SELECT * FROM users ORDER BY status ASC, age DESC;
```

**单行写法：按列位置排序**
`ORDER BY <列位置序号>`
```sql
-- 按查询列的位置序号排序
SELECT id, username, email FROM users ORDER BY 3;
```

**单行写法：取前 N 行**
`LIMIT <行数>`
```sql
-- 取前 10 行数据
SELECT * FROM users LIMIT 10;
```

**单行写法：分页查询**
`LIMIT <行数> OFFSET <偏移>`
```sql
-- 查询第 2 页数据（每页 10 行）
SELECT * FROM users LIMIT 10 OFFSET 10;
```

**单行写法：分页简写形式**
`LIMIT <偏移>, <行数>`
```sql
-- 使用简写形式分页查询
SELECT * FROM users LIMIT 10, 10;
```

**单行写法：排序后取前 N 行**
`SELECT * FROM <表名> ORDER BY <列名> [DESC] LIMIT <行数>`
```sql
-- 按降序排序后取前 5 行
SELECT * FROM users ORDER BY id DESC LIMIT 5;
```

---

## 分组查询

**换行写法：单列分组统计**
`SELECT <分组列>, <聚合函数>(<列名>) FROM <表名> GROUP BY <分组列>`
```sql
-- 按状态分组统计用户数量
SELECT status, COUNT(*) AS count FROM users GROUP BY status;
```

**换行写法：多列分组统计**
`SELECT <列名1>, <列名2>, <聚合函数>(<列名>) FROM <表名> GROUP BY <列名1>, <列名2>`
```sql
-- 按省份和城市分组统计用户数量
SELECT province, city, COUNT(*) AS count FROM users GROUP BY province, city;
```

**换行写法：分组求平均值**
`SELECT <分组列>, AVG(<列名>) FROM <表名> GROUP BY <分组列>`
```sql
-- 按状态分组求平均年龄
SELECT status, AVG(age) AS avg_age FROM users GROUP BY status;
```

**换行写法：分组过滤**
`SELECT <列名> FROM <表名> GROUP BY <列名> HAVING <过滤条件>`
```sql
-- 过滤分组结果只保留数量大于 10 的组
SELECT status, COUNT(*) AS count
FROM users
GROUP BY status
HAVING count > 10;
```

**换行写法：WHERE 与 HAVING 组合**
`SELECT <列名> FROM <表名> WHERE <条件> GROUP BY <列名> HAVING <过滤条件>`
```sql
-- 先过滤行再分组最后过滤分组
SELECT status, AVG(age) AS avg_age, COUNT(*) AS count
FROM users
WHERE age > 0
GROUP BY status
HAVING count > 5 AND avg_age > 25;
```

---

## 聚合函数

**单行写法：总行数计数**
`COUNT(*)`
```sql
-- 统计表的总行数
SELECT COUNT(*) FROM users;
```

**单行写法：非空计数**
`COUNT(<列名>)`
```sql
-- 统计邮箱非空的行数
SELECT COUNT(email) FROM users;
```

**单行写法：去重计数**
`COUNT(DISTINCT <列名>)`
```sql
-- 统计状态去重后的数量
SELECT COUNT(DISTINCT status) FROM users;
```

**单行写法：求和**
`SUM(<列名>)`
```sql
-- 统计所有用户余额总和
SELECT SUM(balance) AS total_balance FROM users;
```

**单行写法：求平均值**
`AVG(<列名>)`
```sql
-- 统计用户平均年龄
SELECT AVG(age) AS avg_age FROM users;
```

**单行写法：求最大值**
`MAX(<列名>)`
```sql
-- 查询商品最高价格
SELECT MAX(price) AS max_price FROM products;
```

**单行写法：求最小值**
`MIN(<列名>)`
```sql
-- 查询商品最低价格
SELECT MIN(price) AS min_price FROM products;
```

**换行写法：分组拼接字符串**
`GROUP_CONCAT(<列名> [SEPARATOR '<分隔符>'])`
```sql
-- 按状态分组拼接用户名
SELECT status, GROUP_CONCAT(username SEPARATOR ',') AS names
FROM users GROUP BY status;
```
