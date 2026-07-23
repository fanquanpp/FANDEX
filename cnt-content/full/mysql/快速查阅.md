---
order: 130
tags:
  - mysql
  - database
difficulty: intermediate
title: 'MySQL 快速查阅'
module: mysql
category: 'MySQL Reference'
description: '常用 SQL 语句、函数与配置参数速查。'
author: Anonymous
related:
  - mysql/事务与锁机制
  - mysql/配置与运维
  - mysql/控制器与应用
  - mysql/SQL注入基础与检测
prerequisites:
  - mysql/语法速查
---

## 1. 数据库操作

### 创建数据库

```sql
 CREATE DATABASE dbname;
 CREATE DATABASE IF NOT EXISTS dbname;
```

### 创建数据库（指定字符集）

```sql
 CREATE DATABASE dbname
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
 -
 CREATE DATABASE ecommerce
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 修改数据库字符集

```sql
 ALTER DATABASE dbname
  CHARACTER SET gbk
  COLLATE gbk_chinese_ci;
```

### 查看数据库

```sql
 SHOW DATABASES;
 SHOW CREATE DATABASE dbname;
 -
 SELECT table_schema AS '数据库',
  SUM(data_length + index_length) / 1024 / 1024 AS '大小(MB)'
 from information_schema.tables
 GROUP BY table_schema;
```

### 使用数据库

```sql
 use dbname;
```

### 删除数据库

```sql
 DROP DATABASE dbname;
 DROP DATABASE IF EXISTS dbname;
```

---

## 2. 表操作

### 创建表

```sql
 CREATE TABLE tablename (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  age INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 )
 -
 CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  email VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱',
  password VARCHAR(255) NOT NULL COMMENT '密码',
  age TINYINT UNSIGNED COMMENT '年龄',
  status TINYINT DEFAULT 1 COMMENT '状态: 0禁用, 1启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
 )
```

### 查看表

```sql
 SHOW TABLES;
 DESC tablename;
 SHOW COLUMNS FROM tablename;
 SHOW CREATE TABLE tablename;
 -
 SELECT table_name AS '表名',
  data_length / 1024 / 1024 AS '数据大小(MB)',
  index_length / 1024 / 1024 AS '索引大小(MB)'
 from information_schema.tables
 WHERE table_schema = DATABASE();
```

### 修改表结构

```sql
 -
 ALTER TABLE tablename ADD COLUMN colname type;
 ALTER TABLE tablename ADD COLUMN colname type AFTER another_col;
 -
 ALTER TABLE tablename MODIFY COLUMN colname new_type;
 ALTER TABLE tablename CHANGE COLUMN oldname newname new_type;
 -
 ALTER TABLE tablename DROP COLUMN colname;
 -
 ALTER TABLE oldname RENAME TO newname;
 -
 ALTER TABLE users ADD COLUMN phone VARCHAR(20) AFTER email;
 ALTER TABLE users MODIFY COLUMN age SMALLINT UNSIGNED;
 ALTER TABLE users CHANGE COLUMN phone mobile VARCHAR(20);
 ALTER TABLE users DROP COLUMN age;
```

### 删除表

```sql
 DROP TABLE tablename;
 DROP TABLE IF EXISTS tablename;
```

### 清空表

```sql
 TRUNCATE TABLE tablename;
```

### 复制表

```sql
 -
 CREATE TABLE newtable LIKE oldtable;
 -
 CREATE TABLE newtable AS SELECT * FROM oldtable;
 -
 CREATE TABLE active_users AS SELECT * FROM users WHERE status = 1;
```

---

## 3. 数据类型

### 字符型

- CHAR(n) - 定长字符串，最多255字符
- VARCHAR(n) - 变长字符串，最多65535字符
- TEXT - 长文本，最多65535字符
- MEDIUMTEXT - 中等文本，最多16MB
- LONGTEXT - 超长文本，最多4GB
- ENUM - 枚举类型
- SET - 集合类型
- BLOB - 二进制大对象

### 数值型

- TINYINT - 微整数 (-128~127)
- SMALLINT - 小整数 (-32768~32767)
- MEDIUMINT - 中等整数
- INT - 整数 (-21亿~21亿)
- BIGINT - 大整数
- FLOAT - 单精度浮点
- DOUBLE - 双精度浮点
- DECIMAL(M,D) - 定点数

### 日期时间型

- DATE - 日期 (YYYY-MM-DD)
- TIME - 时间 (HH:MM:SS)
- DATETIME - 日期时间
- TIMESTAMP - 时间戳
- YEAR - 年份

---

## 4. 约束类型

### 常用约束

```sql
 CREATE TABLE tablename (
  id INT PRIMARY KEY AUTO_INCREMENT, -- 主键 + 自增
  name VARCHAR(50) NOT NULL, -- 非空
  email VARCHAR(100) UNIQUE, -- 唯一
  status TINYINT DEFAULT 1, -- 默认值
  age INT CHECK (age > 0), -- 检查约束
  user_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id) -- 外键
 )
```

### 外键约束选项

```sql
 forEIGN KEY (col) REFERENCES parent_table(col)
  ON DELETE CASCADE -- 级联删除
  ON UPDATE CASCADE -- 级联更新
  ON DELETE SET NULL -- 删除时设为NULL
  ON DELETE RESTRICT -- 限制删除
```

---

## 5. 数据操作

### 插入数据

```sql
 -
 inSERT INTO table(col1, col2) VALUES(val1, val2);
 -
 inSERT INTO table(col1, col2) VALUES
  (v1, v2),
  (v3, v4),
  (v5, v6);
 -
 inSERT INTO table(cols) VALUES(vals)
 ON DUPLICATE KEY UPDATE col = new_val;
 -
 replace INTO table(cols) VALUES(vals);
 -
 inSERT INTO users(username, email, password)
 VALUES ('zhangsan', 'zhang@example.com', '123456');
 -
 inSERT INTO users(username, email, password) VALUES
  ('lisi', 'li@example.com', '654321'),
  ('wangwu', 'wang@example.com', 'abc123'),
  ('zhaoliu', 'zhao@example.com', 'xyz789');
 -
 inSERT INTO users(id, username, email)
 VALUES (1, 'zhangsan_new', 'zhang_new@example.com')
 ON DUPLICATE KEY UPDATE username = VALUES(username), email = VALUES(email);
```

### 更新数据

```sql
 UPDATE table SET col = val WHERE condition;
 UPDATE table SET col1 = val1, col2 = val2 WHERE condition;
 -
 UPDATE users SET status = 0 WHERE id = 1;
 -
 UPDATE users SET status = 1 WHERE created_at > '2024-01-01';
 -
 UPDATE orders o
 JOIN users u ON o.user_id = u.id
 SET o.user_name = u.username
 WHERE o.user_name IS NULL;
```

### 删除数据

```sql
 delete FROM table WHERE condition; -- 按条件删除
 delete FROM table; -- 删除所有行
 TRUNCATE TABLE table; -- 清空表（重置自增ID）
 -
 delete FROM users WHERE id = 1;
 -
 delete FROM logs WHERE created_at < '2024-01-01';
 -
 delete o FROM orders o
 JOIN users u ON o.user_id = u.id
 WHERE u.status = 0;
```

---

## 6. 数据查询

### 基础查询

```sql
 SELECT * FROM table;
 SELECT col1, col2 FROM table;
 SELECT col1 AS alias FROM table;
 SELECT DISTINCT col FROM table;
 -
 SELECT id, username, email FROM users WHERE status = 1;
 -
 SELECT COUNT(*) AS user_count FROM users;
```

### 条件查询

```sql
 -
 SELECT * FROM table WHERE col = value;
 SELECT * FROM table WHERE col > value;
 SELECT * FROM table WHERE col != value;
 -
 SELECT * FROM table WHERE col1 = v1 AND col2 = v2;
 SELECT * FROM table WHERE col1 = v1 OR col2 = v2;
 SELECT * FROM table WHERE NOT col = value;
 -
 SELECT * FROM table WHERE col BETWEEN val1 AND val2;
 SELECT * FROM table WHERE col IN (val1, val2, val3);
 -
 SELECT * FROM table WHERE col LIKE '%pattern%';
 SELECT * FROM table WHERE col LIKE 'pattern%';
 SELECT * FROM table WHERE col LIKE '_pattern';
 -
 SELECT * FROM table WHERE col IS NULL;
 SELECT * FROM table WHERE col IS NOT NULL;
 -
 SELECT * FROM users WHERE age BETWEEN 18 AND 30;
 -
 SELECT * FROM users WHERE city IN ('北京', '上海', '广州');
 -
 SELECT * FROM users WHERE username LIKE '%zhang%';
 -
 SELECT * FROM users WHERE phone IS NULL;
```

### 排序与分页

```sql
 -
 SELECT * FROM table ORDER BY col ASC;
 SELECT * FROM table ORDER BY col DESC;
 SELECT * FROM table ORDER BY col1 ASC, col2 DESC;
 -
 SELECT * FROM table LIMIT 10;
 SELECT * FROM table LIMIT 10 OFFSET 20;
 SELECT * FROM table LIMIT 20, 10;
 -
 SELECT * FROM users ORDER BY created_at DESC;
 -
 SELECT * FROM users ORDER BY created_at DESC LIMIT 20, 10;
```

### 分组查询

```sql
 -
 SELECT col, COUNT(*) FROM table GROUP BY col;
 -
 SELECT col, AVG(price) FROM table
 GROUP BY col
 HAVING AVG(price) > 100;
 -
 SELECT city, COUNT(*) AS user_count
 from users
 GROUP BY city
 ORDER BY user_count DESC;
 -
 SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
  COUNT(*) AS register_count
 from users
 GROUP BY month
 ORDER BY month;
 -
 SELECT user_id, SUM(amount) AS total_amount
 from orders
 GROUP BY user_id
 HAVING total_amount > 1000;
```

### 聚合函数

```sql
 SELECT
  COUNT(*) AS total, -- 统计行数
  SUM(price) AS sum, -- 求和
  AVG(price) AS avg, -- 平均值
  MAX(price) AS max, -- 最大值
  MIN(price) AS min -- 最小值
 from table;
 -
 SELECT
  COUNT(*) AS order_count,
  SUM(amount) AS total_amount,
  AVG(amount) AS avg_amount,
  MAX(amount) AS max_amount,
  MIN(amount) AS min_amount
 from orders
 WHERE created_at BETWEEN '2024-01-01' AND '2024-01-31';
```

### 多表连接

```sql
 -
 SELECT * FROM a INNER JOIN b ON a.id = b.id;
 -
 SELECT * FROM a LEFT JOIN b ON a.id = b.id;
 -
 SELECT * FROM a RIGHT JOIN b ON a.id = b.id;
 -
 SELECT * FROM a LEFT JOIN b ON a.id = b.id
 UNION
 SELECT * FROM a RIGHT JOIN b ON a.id = b.id;
 -
 SELECT e1.name, e2.name AS manager
 from employees e1
 JOIN employees e2 ON e1.manager_id = e2.id;
 -
 SELECT o.id, o.amount, o.created_at,
  u.username, u.email
 from orders o
 JOIN users u ON o.user_id = u.id
 WHERE o.created_at > '2024-01-01';
 -
 SELECT u.username, COUNT(o.id) AS order_count
 from users u
 LEFT JOIN orders o ON u.id = o.user_id
 GROUP BY u.id;
```

---

## 7. 索引操作

### 创建索引

```sql
 -
 CREATE INDEX idx_name ON table(col);
 -
 CREATE UNIQUE INDEX idx_name ON table(col);
 -
 CREATE INDEX idx_name ON table(col1, col2);
 -
 ALTER TABLE table ADD FULLTEXT INDEX ft_idx(col);
 -
 CREATE INDEX idx_users_email ON users(email);
 CREATE INDEX idx_users_status ON users(status);
 CREATE INDEX idx_users_created_at ON users(created_at);
 CREATE UNIQUE INDEX idx_users_username ON users(username);
 -
 CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
```

### 查看索引

```sql
 SHOW INDEX FROM table;
 -
 SELECT index_name, column_name
 from information_schema.statistics
 WHERE table_schema = DATABASE() AND table_name = 'users';
```

### 删除索引

```sql
 DROP INDEX idx_name ON table;
 -
 DROP INDEX idx_users_email ON users;
```

---

## 8. 用户与权限

### 用户管理

```sql
 -
 CREATE USER 'username'@'localhost' IDENTIFIED BY 'password';
 CREATE USER 'username'@'%' IDENTIFIED BY 'password'; -- 允许远程
 -
 ALTER USER 'username'@'localhost' IDENTIFIED BY 'new_password';
 -
 DROP USER 'username'@'localhost';
 -
 SELECT user, host FROM mysql.user;
 -
 CREATE USER 'readonly'@'%' IDENTIFIED BY 'read123';
 -
 CREATE USER 'admin'@'localhost' IDENTIFIED BY 'admin123';
```

### 权限管理

```sql
 -
 GRANT ALL PRIVILEGES ON dbname.* TO 'username'@'localhost';
 GRANT SELECT, INSERT, UPDATE ON dbname.table TO 'username'@'localhost';
 -
 REVOKE ALL PRIVILEGES ON dbname.* FROM 'username'@'localhost';
 -
 SHOW GRANTS FOR 'username'@'localhost';
 -
 FLUSH PRIVILEGES;
 -
 GRANT SELECT ON ecommerce.* TO 'readonly'@'%';
 -
 GRANT SELECT, INSERT, UPDATE, DELETE ON ecommerce.* TO 'appuser'@'%';
 -
 GRANT ALL PRIVILEGES ON *.* TO 'admin'@'localhost' WITH GRANT OPTION;
```

### 常用权限

- ALL PRIVILEGES - 所有权限
- SELECT, INSERT, UPDATE, DELETE - 基本操作
- CREATE, DROP - 创建/删除
- GRANT OPTION - 授权权限
- ALTER - 修改表结构
- INDEX - 创建索引

---

## 9. 事务管理

### 基本操作

```sql
 -
 START TRANSACTION;
 -
 BEGIN;
 -
 commit;
 -
 ROLLBACK;
 -
 SAVEPOINT savepoint_name;
 -
 ROLLBACK TO SAVEPOINT savepoint_name;
 -
 BEGIN;
 UPDATE accounts SET balance = balance - 100 WHERE id = 1;
 UPDATE accounts SET balance = balance + 100 WHERE id = 2;
 commit;
 -
 BEGIN;
 inSERT INTO orders (...) VALUES (...);
 SAVEPOINT order_saved;
 inSERT INTO order_items (...) VALUES (...);
 if error THEN
  ROLLBACK TO order_saved;
 END IF;
 commit;
```

### 隔离级别

```sql
 -
 SELECT @@transaction_isolation;
 -
 SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
 SET GLOBAL TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

### 隔离级别说明

- READ UNCOMMITTED - 最低级别，可能读取未提交数据
- READ COMMITTED - 读取已提交数据
- REPEATABLE READ - 可重复读（MySQL默认）
- SERIALIZABLE - 最高级别，串行执行

---

## 10. 常用函数

### 字符串函数

```sql
 CONCAT('Hello', ' ', 'World') -- 拼接字符串
 SUBSTRING('Hello', 1, 3) -- 截取字符串
 LENGTH('Hello') -- 字节长度
 CHAR_LENGTH('你好') -- 字符长度
 LOWER('HELLO') -- 转小写
 UPPER('hello') -- 转大写
 TRIM(' hello ') -- 去除首尾空格
 replace('Hello', 'l', 'w') -- 替换字符串
 LEFT('Hello', 2) -- 取左边字符
 RIGHT('Hello', 2) -- 取右边字符
 inSTR('Hello', 'll') -- 查找位置
 -
 SELECT CONCAT(last_name, ' ', first_name) AS full_name FROM users;
 -
 SELECT SUBSTRING(email, INSTR(email, '@') + 1) AS domain FROM users;
 -
 SELECT LOWER(CONCAT(SUBSTRING(first_name, 1, 1), last_name)) AS username FROM users;
```

### 日期函数

```sql
 NOW() -- 当前日期时间
 CURDATE() -- 当前日期
 CURTIME() -- 当前时间
 YEAR(NOW()) -- 提取年份
 MONTH(NOW()) -- 提取月份
 DAY(NOW()) -- 提取日期
 HOUR(NOW()) -- 提取小时
 MINUTE(NOW()) -- 提取分钟
 SECOND(NOW()) -- 提取秒
 DATE_ADD(NOW(), INTERVAL 7 DAY) -- 日期加
 DATE_SUB(NOW(), INTERVAL 1 MONTH) -- 日期减
 DATEDIFF('2024-01-15', '2024-01-01') -- 日期差
 DATE_FORMAT(NOW(), '%Y-%m-%d') -- 格式化日期
 LAST_DAY(NOW()) -- 月份最后一天
 -
 SELECT * FROM users WHERE DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m');
 -
 SELECT TIMESTAMPDIFF(YEAR, birthday, CURDATE()) AS age FROM users;
 -
 SELECT DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AS monday;
```

### 数值函数

```sql
 ABS(-10) -- 绝对值
 ROUND(3.14159, 2) -- 四舍五入
 CEIL(3.1) -- 向上取整
 FLOOR(3.9) -- 向下取整
 MOD(10, 3) -- 取模
 POW(2, 3) -- 幂运算
 SQRT(16) -- 平方根
 RAND() -- 随机数
 TRUNCATE(3.14159, 3) -- 截断
 SIGN(-10) -- 符号
 -
 SELECT ROUND(AVG(rating), 1) AS avg_rating FROM products;
 -
 SELECT FLOOR(RAND() * 9000 + 1000) AS captcha;
 -
 SELECT price * 0.8 AS discounted_price FROM products;
```

### 条件函数

```sql
 if(age >= 18, '成人', '未成年') -- 条件判断
 ifNULL(email, '未填写') -- NULL替换
 NULLIF(a, b) -- 相等返回NULL
 case
  WHEN score >= 90 THEN '优秀'
  WHEN score >= 60 THEN '及格'
  ELSE '不及格'
 END -- 多条件判断
 -
 SELECT id, username, IF(status = 1, '活跃', '禁用') AS status_text FROM users;
 -
 SELECT
  username,
  CASE
  WHEN points >= 1000 THEN 'VIP'
  WHEN points >= 500 THEN '高级会员'
  ELSE '普通会员'
  END AS level
 from users;
 -
 SELECT name, IFNULL(phone, '未填写') AS phone FROM customers;
```

---

## 附录：常用命令

### 服务器管理

```bash
 # 启动服务
 systemctl start mysql # Linux
 net start MySQL # Windows
 # 停止服务
 systemctl stop mysql # Linux
 net stop MySQL # Windows
 # 重启服务
 systemctl restart mysql # Linux
 # 查看状态
 systemctl status mysql # Linux
 # 登录
 mysql -u username -p
 mysql -u username -p -h host -P port
```

### 备份与恢复

```bash
 # 备份数据库
 mysqldump -u username -p dbname > backup.sql
 # 备份多个数据库
 mysqldump -u username -p --databases db1 db2 > backup.sql
 # 备份所有数据库
 mysqldump -u username -p --all-databases > all_backup.sql
 # 恢复数据库
 mysql -u username -p dbname < backup.sql
 # 压缩备份
 mysqldump -u username -p dbname | gzip > backup.sql.gz
 # 恢复压缩备份
 gunzip < backup.sql.gz | mysql -u username -p dbname
```

### 查看系统信息

```sql
 SELECT VERSION(); -- 版本
 SELECT USER(); -- 当前用户
 SELECT DATABASE(); -- 当前数据库
 SHOW STATUS; -- 服务器状态
 SHOW VARIABLES; -- 配置变量
 SHOW PROCESSLIST; -- 进程列表
 SHOW VARIABLES LIKE 'slow_query%'; -- 慢查询状态
```

---

### 更新日志 (Changelog)

- 2026-04-30: 基于数据库常用指令.txt 创建快速查阅文档，使用文本+代码块格式
