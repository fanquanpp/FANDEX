---
order: 50
tags:
  - mysql
  - database
difficulty: intermediate
title: 'SQL 数据操作与查询'
module: mysql
category: 'MySQL Basics'
description: 'INSERT/UPDATE/DELETE、SELECT 基础与条件查询。'
author: Anonymous
related:
  - mysql/SQL数据定义与高级对象
  - mysql/MyISAM存储引擎
  - mysql/Memory存储引擎
  - mysql/NDB集群
prerequisites:
  - mysql/语法速查
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
 -
 inSERT INTO users (id, username, email, password, age)
 VALUES (1, '张三', 'zhangsan@example.com', 'encrypted_pass', 25);
 -
 inSERT INTO users (username, email, password, age)
 VALUES ('张三', 'zhangsan@example.com', 'encrypted_pass', 25);
 -
 inSERT INTO users SET
  username = '李四',
  email = 'lisi@example.com',
  password = 'encrypted_pass',
  age = 30;
```

#### 2.1.2 批量插入

```sql
 -
 inSERT INTO users (username, email, password, age) VALUES
 ('王五', 'wangwu@example.com', 'pass1', 28),
 ('赵六', 'zhaoliu@example.com', 'pass2', 32),
 ('钱七', 'qianqi@example.com', 'pass3', 27);
 -
 inSERT INTO users (username, email) VALUES
 ('孙八', 'sunba@example.com'),
 ('周九', 'zhoujiu@example.com');
```

#### 2.1.3 插入查询结果

```sql
 -
 inSERT INTO users (username, email, password, age)
 SELECT username, email, password, age FROM old_users WHERE status = 1;
 -
 inSERT IGNORE INTO users (username, email)
 SELECT username, email FROM temp_users;
```

#### 2.1.4 INSERT 高级用法

```sql
 -
 inSERT INTO users (id, username, email) VALUES (1, '张三', 'new_email@example.com')
 ON DUPLICATE KEY UPDATE email = 'new_email@example.com', updated_at = NOW();
 -
 inSERT IGNORE INTO users (username, email) VALUES ('张三', 'test@example.com');
 -
 replace INTO users (id, username, email) VALUES (1, '张三', 'new_email@example.com');
 -
 inSERT INTO users (username, email) VALUES ('测试', 'test@example.com');
 SELECT LAST_INSERT_ID();
```

### 2.2 更新数据详解

#### 2.2.1 基本 UPDATE

```sql
 -
 UPDATE users SET age = 26 WHERE id = 1;
 -
 UPDATE users SET age = age + 1 WHERE age < 30;
 -
 UPDATE users
 SET age = 27, email = 'new_email@example.com', updated_at = NOW()
 WHERE id = 1;
```

#### 2.2.2 UPDATE 高级用法

```sql
 -
 UPDATE users u
 JOIN user_profiles p ON u.id = p.user_id
 SET u.avatar = p.avatar_url, u.status = p.status
 WHERE u.id = 1;
 -
 UPDATE users
 SET balance = (SELECT SUM(amount) FROM orders WHERE user_id = users.id)
 WHERE id = 1;
 -
 UPDATE users SET last_login_time = NOW() WHERE last_login_time IS NULL;
 -
 START TRANSACTION;
 UPDATE accounts SET balance = balance - 100 WHERE id = 1;
 UPDATE accounts SET balance = balance + 100 WHERE id = 2;
 commit;
```

#### 2.2.3 UPDATE 实战示例

```sql
 -
 UPDATE employees_info SET Employees_name = '王西' WHERE Employees_id = 'xz100101';
 -
 UPDATE employees_info SET Post_id = 'xs1001' WHERE Employees_id = 'xs100103';
 -
 UPDATE customer_info
 SET Customer_name = '柳甜', Customer_Birth = NULL, Telephone = '13879008942'
 WHERE Customer_name = '柳田';
 -
 UPDATE sales_list SET Sales_Number = Sales_Number + 5 WHERE Sales_Number < 10;
 -
 UPDATE orders SET status = 3, shipped_at = NOW() WHERE status = 2 AND shipped_at IS NULL;
```

### 2.3 删除数据详解

#### 2.3.1 基本 DELETE

```sql
 -
 delete FROM users WHERE id = 1;
 -
 delete FROM users WHERE status = 0 AND created_at < '2024-01-01';
 -
 delete FROM users;
 -
 delete FROM users ORDER BY created_at DESC LIMIT 10;
```

#### 2.3.2 DELETE 高级用法

```sql
 -
 delete u FROM users u
 JOIN inactive_users i ON u.email = i.email
 WHERE u.status = 0;
 -
 delete FROM users WHERE id IN (SELECT user_id FROM old_users WHERE created_at < '2023-01-01');
 -
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
 -
 delete FROM mark WHERE studentno = 'xx100104' AND courseno = 'kc1002';
 -
 delete FROM orders WHERE status = 5 AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
 -
 delete FROM logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 3 MONTH);
```

### 2.4 数据操作最佳实践

```sql
 -
 SELECT * FROM users WHERE id = 1 FOR UPDATE;
 -
 START TRANSACTION;
 UPDATE users SET status = 0 WHERE last_login_time < '2023-01-01';
 UPDATE stats SET inactive_users = inactive_users + 1;
 commit;
 -
 EXPLAIN UPDATE users SET status = 0 WHERE last_login_time < '2023-01-01';
 -
 delete FROM logs WHERE created_at < '2023-01-01' LIMIT 1000;
```

## 3. DQL (数据查询语言) - Data Query Language

DQL 是最重要的 SQL 部分，用于从数据库中查询数据。

### 3.1 基础查询详解

#### 3.1.1 SELECT 基础语法

```sql
 -
 SELECT * FROM users;
 -
 SELECT id, username, email FROM users;
 -
 SELECT username, price, quantity, price * quantity AS total FROM order_items;
 -
 SELECT
  id AS user_id,
  username AS name,
  email AS "邮箱地址"
 from users;
 -
 SELECT
  username,
  price,
  quantity,
  price * quantity AS subtotal,
  price * quantity * 0.1 AS tax
 from order_items;
 -
 SELECT DISTINCT status FROM users;
 SELECT DISTINCT province, city FROM addresses;
```

#### 3.1.2 列类型转换

```sql
 -
 SELECT CONCAT(username, ' (', email, ')') AS user_info FROM users;
 SELECT CONCAT_WS(' - ', province, city, district) AS full_address FROM addresses;
 -
 SELECT CAST(price AS CHAR) FROM products;
 SELECT CONVERT(price, CHAR) FROM products;
 SELECT DATE_FORMAT(created_at, '%Y年%m月%d日') AS formatted_date FROM users;
```

### 3.2 条件查询详解

#### 3.2.1 WHERE 子句

```sql
 -
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
 -
 SELECT * FROM users WHERE age > 25 AND status = 1;
 SELECT * FROM users WHERE age > 20 AND age < 30 AND gender = '男';
 -
 SELECT * FROM users WHERE status = 1 OR status = 2;
 SELECT * FROM users WHERE username = '张三' OR username = '李四';
 -
 SELECT * FROM users WHERE NOT status = 0;
 SELECT * FROM users WHERE NOT (age < 20 OR age > 30);
 -
 SELECT * FROM users
 WHERE (age > 25 AND status = 1) OR (age < 20 AND status = 2);
```

#### 3.2.3 范围查询

```sql
 -
 SELECT * FROM users WHERE age BETWEEN 20 AND 30;
 SELECT * FROM users WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31';
 -
 SELECT * FROM users WHERE age NOT BETWEEN 20 AND 30;
```

#### 3.2.4 IN 和 NOT IN

```sql
 -
 SELECT * FROM users WHERE status IN (1, 2, 3);
 SELECT * FROM users WHERE username IN ('张三', '李四', '王五');
 -
 SELECT * FROM users WHERE id IN (SELECT user_id FROM vip_users);
 -
 SELECT * FROM users WHERE status NOT IN (0, -1);
```

#### 3.2.5 LIKE 模糊查询

```sql
 -
 SELECT * FROM users WHERE username LIKE '张%'; -- 以张开头
 SELECT * FROM users WHERE username LIKE '%张%'; -- 包含张
 SELECT * FROM users WHERE username LIKE '%张'; -- 以张结尾
 -
 SELECT * FROM users WHERE username LIKE '张_'; -- 张后面一个字
 SELECT * FROM users WHERE username LIKE '__张'; -- 张前面两个字
 -
 SELECT * FROM users WHERE phone LIKE '138%'; -- 手机号以138开头
 SELECT * FROM users WHERE email LIKE '%@gmail.com'; -- Gmail邮箱
 -
 SELECT * FROM users WHERE username NOT LIKE '%admin%';
 -
 SELECT * FROM users WHERE username LIKE '%100%%' ESCAPE '%';
```

#### 3.2.6 NULL 值查询

```sql
 -
 SELECT * FROM users WHERE email IS NULL;
 SELECT * FROM users WHERE deleted_at IS NULL;
 -
 SELECT * FROM users WHERE email IS NOT NULL;
 -
 -
 -
```

#### 3.2.7 条件查询实战

```sql
 -
 SELECT * FROM employees_info WHERE Employees_sex = '女';
 -
 SELECT * FROM employees_info WHERE Employees_sex = '女' AND Hiredate < '2015-01-01';
 -
 SELECT *, YEAR(NOW()) - YEAR(Hiredate) AS 工龄
 from employees_info
 WHERE YEAR(NOW()) - YEAR(Hiredate) > 15;
 -
 SELECT * FROM employees_info WHERE Post_id BETWEEN 'cg1001' AND 'hr1001';
 -
 SELECT * FROM employees_info WHERE Post_id IN ('cg1001', 'hr1001');
 -
 SELECT * FROM employees_info WHERE Employees_name LIKE '%王%';
 -
 SELECT *, YEAR(NOW()) - YEAR(Customer_Birth) AS 年龄
 from customer_info
 WHERE YEAR(NOW()) - YEAR(Customer_Birth) > 30;
 -
 SELECT * FROM customer_info WHERE Customer_Birth IS NULL;
```

### 3.3 排序与分页详解

#### 3.3.1 ORDER BY 排序

```sql
 -
 SELECT * FROM users ORDER BY age ASC;
 SELECT * FROM users ORDER BY age; -- 默认升序
 -
 SELECT * FROM users ORDER BY created_at DESC;
 -
 SELECT * FROM users ORDER BY status ASC, age DESC;
 -
 SELECT *, age * 365 AS days_alive FROM users ORDER BY days_alive DESC;
 -
 SELECT *, price * quantity AS subtotal FROM order_items ORDER BY subtotal DESC;
 -
 SELECT id, username, email FROM users ORDER BY 3; -- 按第3列排序
```

#### 3.3.2 LIMIT 分页

```sql
 -
 SELECT * FROM users LIMIT 10;
 -
 SELECT * FROM users LIMIT 10 OFFSET 10;
 SELECT * FROM users LIMIT 10, 10; -- 简写形式
 -
 SELECT * FROM users ORDER BY id DESC LIMIT 5;
 -
 -
 SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 0;
 -
 SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 10;
 -
 SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 20;
 -
 SELECT * FROM users LIMIT 1;
```

### 3.4 分组查询详解

#### 3.4.1 GROUP BY 基础

```sql
 -
 SELECT status, COUNT(*) AS count FROM users GROUP BY status;
 -
 SELECT province, city, COUNT(*) AS count FROM users GROUP BY province, city;
 -
 SELECT status, AVG(age) AS avg_age FROM users GROUP BY status;
 -
 SELECT status, SUM(balance) AS total_balance FROM users GROUP BY status;
```

#### 3.4.2 HAVING 子句

HAVING 用于过滤分组后的结果，WHERE 用于过滤分组前的记录。

```sql
 -
 SELECT status, COUNT(*) AS count
 from users
 GROUP BY status
 HAVING count > 10;
 -
 SELECT status, AVG(age) AS avg_age, COUNT(*) AS count
 from users
 WHERE age > 0 -- 先过滤
 GROUP BY status -- 再分组
 HAVING count > 5; -- 最后过滤分组结果
 -
 SELECT status, COUNT(*) AS count, AVG(age) AS avg_age
 from users
 GROUP BY status
 HAVING count > 10 AND avg_age > 25;
```

#### 3.4.3 GROUP BY 实战

```sql
 -
 SELECT COUNT(Customer_name) AS 人数, Customer_sex AS 性别
 from customer_info GROUP BY Customer_sex;
 -
 SELECT Commodity_id, SUM(Sales_Number) AS 总数
 from sales_list GROUP BY Commodity_id;
 -
 SELECT Commodity_id, AVG(Sales_price) AS 平均售价
 from sales_list
 GROUP BY Commodity_id
 HAVING AVG(Sales_price) > 1500;
 -
 SELECT Commodity_id, SUM(Sales_Number) AS 总数量
 from sales_list
 GROUP BY Commodity_id
 HAVING SUM(Sales_Number) > 50;
```

#### 3.4.4 GROUP BY 注意事项

```sql
 -
 -
 -
 -
 -
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
 -
 SELECT COUNT(*) FROM users;
 -
 SELECT COUNT(email) FROM users;
 -
 SELECT COUNT(DISTINCT status) FROM users;
 SELECT COUNT(DISTINCT province, city) FROM users;
```

#### 3.5.3 聚合函数综合示例

```sql
 -
 SELECT SUM(Purchase_price * Purchase_Number) AS 总成本 FROM purchase_list;
 -
 SELECT
  AVG(Purchase_Number) AS 平均采购数量,
  MAX(Purchase_Number) AS 最大采购数量,
  MIN(Purchase_Number) AS 最小采购数量
 from purchase_list;
 -
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

### 更新日志 (Changelog)

- 2026-05-27: 拆分为独立文件，添加元数据，版本升级至 v1.0.0
- 2026-04-30: 大幅细化内容，添加 DML/DQL 详解、聚合函数、实战示例等
- 2026-04-05: 整合 SQL 基础语法知识

## 延伸阅读

- [Pandas 数据操作](data-analysis/pandas)
