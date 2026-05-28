---
order: 130
tags:
  - 'mysql'
  - 'database'
  - 'math'
difficulty: 'intermediate'
title: 'MySQL 快速查阅'
module: 'mysql'
category: 'MySQL Reference'
description: '常用 SQL 语句、函数与配置参数速查。'
author: 'Anonymous'
---

## 目录

1. [数据库操作](#数据库操作)
2. [表操作](#表操作)
3. [数据类型](#数据类型)
4. [约束类型](#约束类型)
5. [数据操作](#数据操作)
6. [数据查询](#数据查询)
7. [索引操作](#索引操作)
8. [用户与权限](#用户与权限)
9. [事务管理](#事务管理)
10. [常用函数](#常用函数)

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
 True-- 示例：创建电商数据库
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
 True-- 查看数据库大小
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
 True);
 True-- 示例：创建用户表
 CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  email VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱',
  password VARCHAR(255) NOT NULL COMMENT '密码',
  age TINYINT UNSIGNED COMMENT '年龄',
  status TINYINT DEFAULT 1 COMMENT '状态: 0禁用, 1启用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
 True) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
```

### 查看表

```sql
 SHOW TABLES;
 DESC tablename;
 SHOW COLUMNS FROM tablename;
 SHOW CREATE TABLE tablename;
 True-- 查看表大小
 SELECT table_name AS '表名',
  data_length / 1024 / 1024 AS '数据大小(MB)',
  index_length / 1024 / 1024 AS '索引大小(MB)'
 from information_schema.tables
 WHERE table_schema = DATABASE();
```

### 修改表结构

```sql
 True-- 添加列
 ALTER TABLE tablename ADD COLUMN colname type;
 ALTER TABLE tablename ADD COLUMN colname type AFTER another_col;
 True-- 修改列
 ALTER TABLE tablename MODIFY COLUMN colname new_type;
 ALTER TABLE tablename CHANGE COLUMN oldname newname new_type;
 True-- 删除列
 ALTER TABLE tablename DROP COLUMN colname;
 True-- 重命名表
 ALTER TABLE oldname RENAME TO newname;
 True-- 示例：修改用户表
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
 True-- 复制结构
 CREATE TABLE newtable LIKE oldtable;
 True-- 复制结构和数据
 CREATE TABLE newtable AS SELECT * FROM oldtable;
 True-- 复制部分数据
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
 True);
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
 True-- 单行插入
 inSERT INTO table(col1, col2) VALUES(val1, val2);
 True-- 多行插入
 inSERT INTO table(col1, col2) VALUES
  (v1, v2),
  (v3, v4),
  (v5, v6);
 True-- 插入或更新
 inSERT INTO table(cols) VALUES(vals)
 ON DUPLICATE KEY UPDATE col = new_val;
 True-- 替换插入
 replace INTO table(cols) VALUES(vals);
 True-- 示例：插入用户数据
 inSERT INTO users(username, email, password)
 VALUES ('zhangsan', 'zhang@example.com', '123456');
 True-- 示例：批量插入用户
 inSERT INTO users(username, email, password) VALUES
  ('lisi', 'li@example.com', '654321'),
  ('wangwu', 'wang@example.com', 'abc123'),
  ('zhaoliu', 'zhao@example.com', 'xyz789');
 True-- 示例：插入或更新（根据唯一键）
 inSERT INTO users(id, username, email)
 VALUES (1, 'zhangsan_new', 'zhang_new@example.com')
 ON DUPLICATE KEY UPDATE username = VALUES(username), email = VALUES(email);
```

### 更新数据

```sql
 UPDATE table SET col = val WHERE condition;
 UPDATE table SET col1 = val1, col2 = val2 WHERE condition;
 True-- 示例：更新用户状态
 UPDATE users SET status = 0 WHERE id = 1;
 True-- 示例：批量更新
 UPDATE users SET status = 1 WHERE created_at > '2024-01-01';
 True-- 示例：根据另一表更新
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
 True-- 示例：删除指定用户
 delete FROM users WHERE id = 1;
 True-- 示例：删除过期数据
 delete FROM logs WHERE created_at < '2024-01-01';
 True-- 示例：多表删除
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
 True-- 示例：查询活跃用户
 SELECT id, username, email FROM users WHERE status = 1;
 True-- 示例：查询用户数量
 SELECT COUNT(*) AS user_count FROM users;
```

### 条件查询

```sql
 True-- 比较运算
 SELECT * FROM table WHERE col = value;
 SELECT * FROM table WHERE col > value;
 SELECT * FROM table WHERE col != value;
 True-- 逻辑运算
 SELECT * FROM table WHERE col1 = v1 AND col2 = v2;
 SELECT * FROM table WHERE col1 = v1 OR col2 = v2;
 SELECT * FROM table WHERE NOT col = value;
 True-- 范围查询
 SELECT * FROM table WHERE col BETWEEN val1 AND val2;
 SELECT * FROM table WHERE col IN (val1, val2, val3);
 True-- 模糊查询
 SELECT * FROM table WHERE col LIKE '%pattern%';
 SELECT * FROM table WHERE col LIKE 'pattern%';
 SELECT * FROM table WHERE col LIKE '_pattern';
 True-- 空值判断
 SELECT * FROM table WHERE col IS NULL;
 SELECT * FROM table WHERE col IS NOT NULL;
 True-- 示例：查询年龄在18-30之间的用户
 SELECT * FROM users WHERE age BETWEEN 18 AND 30;
 True-- 示例：查询特定城市的用户
 SELECT * FROM users WHERE city IN ('北京', '上海', '广州');
 True-- 示例：模糊搜索用户名
 SELECT * FROM users WHERE username LIKE '%zhang%';
 True-- 示例：查询未填写手机号的用户
 SELECT * FROM users WHERE phone IS NULL;
```

### 排序与分页

```sql
 True-- 排序
 SELECT * FROM table ORDER BY col ASC;
 SELECT * FROM table ORDER BY col DESC;
 SELECT * FROM table ORDER BY col1 ASC, col2 DESC;
 True-- 分页
 SELECT * FROM table LIMIT 10;
 SELECT * FROM table LIMIT 10 OFFSET 20;
 SELECT * FROM table LIMIT 20, 10;
 True-- 示例：按创建时间倒序查询用户
 SELECT * FROM users ORDER BY created_at DESC;
 True-- 示例：分页查询（第3页，每页10条）
 SELECT * FROM users ORDER BY created_at DESC LIMIT 20, 10;
```

### 分组查询

```sql
 True-- 基本分组
 SELECT col, COUNT(*) FROM table GROUP BY col;
 True-- 分组过滤
 SELECT col, AVG(price) FROM table
 GROUP BY col
 HAVING AVG(price) > 100;
 True-- 示例：统计每个城市的用户数
 SELECT city, COUNT(*) AS user_count
 from users
 GROUP BY city
 ORDER BY user_count DESC;
 True-- 示例：统计每月注册用户数
 SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
  COUNT(*) AS register_count
 from users
 GROUP BY month
 ORDER BY month;
 True-- 示例：统计订单金额大于1000的用户
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
 True-- 示例：统计订单数据
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
 True-- 内连接
 SELECT * FROM a INNER JOIN b ON a.id = b.id;
 True-- 左连接
 SELECT * FROM a LEFT JOIN b ON a.id = b.id;
 True-- 右连接
 SELECT * FROM a RIGHT JOIN b ON a.id = b.id;
 True-- 全连接（MySQL需用UNION模拟）
 SELECT * FROM a LEFT JOIN b ON a.id = b.id
 UNION
 SELECT * FROM a RIGHT JOIN b ON a.id = b.id;
 True-- 自连接
 SELECT e1.name, e2.name AS manager
 from employees e1
 JOIN employees e2 ON e1.manager_id = e2.id;
 True-- 示例：查询订单及用户信息
 SELECT o.id, o.amount, o.created_at,
  u.username, u.email
 from orders o
 JOIN users u ON o.user_id = u.id
 WHERE o.created_at > '2024-01-01';
 True-- 示例：查询所有用户及其订单（包括无订单用户）
 SELECT u.username, COUNT(o.id) AS order_count
 from users u
 LEFT JOIN orders o ON u.id = o.user_id
 GROUP BY u.id;
```

---

## 7. 索引操作

### 创建索引

```sql
 True-- 普通索引
 CREATE INDEX idx_name ON table(col);
 True-- 唯一索引
 CREATE UNIQUE INDEX idx_name ON table(col);
 True-- 复合索引
 CREATE INDEX idx_name ON table(col1, col2);
 True-- 全文索引
 ALTER TABLE table ADD FULLTEXT INDEX ft_idx(col);
 True-- 示例：为用户表创建索引
 CREATE INDEX idx_users_email ON users(email);
 CREATE INDEX idx_users_status ON users(status);
 CREATE INDEX idx_users_created_at ON users(created_at);
 CREATE UNIQUE INDEX idx_users_username ON users(username);
 True-- 示例：创建复合索引
 CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
```

### 查看索引

```sql
 SHOW INDEX FROM table;
 True-- 查看表的索引情况
 SELECT index_name, column_name
 from information_schema.statistics
 WHERE table_schema = DATABASE() AND table_name = 'users';
```

### 删除索引

```sql
 DROP INDEX idx_name ON table;
 True-- 示例：删除索引
 DROP INDEX idx_users_email ON users;
```

---

## 8. 用户与权限

### 用户管理

```sql
 True-- 创建用户
 CREATE USER 'username'@'localhost' IDENTIFIED BY 'password';
 CREATE USER 'username'@'%' IDENTIFIED BY 'password'; -- 允许远程
 True-- 修改密码
 ALTER USER 'username'@'localhost' IDENTIFIED BY 'new_password';
 True-- 删除用户
 DROP USER 'username'@'localhost';
 True-- 查看用户
 SELECT user, host FROM mysql.user;
 True-- 示例：创建只读用户
 CREATE USER 'readonly'@'%' IDENTIFIED BY 'read123';
 True-- 示例：创建管理员用户
 CREATE USER 'admin'@'localhost' IDENTIFIED BY 'admin123';
```

### 权限管理

```sql
 True-- 授予权限
 GRANT ALL PRIVILEGES ON dbname.* TO 'username'@'localhost';
 GRANT SELECT, INSERT, UPDATE ON dbname.table TO 'username'@'localhost';
 True-- 撤销权限
 REVOKE ALL PRIVILEGES ON dbname.* FROM 'username'@'localhost';
 True-- 查看权限
 SHOW GRANTS FOR 'username'@'localhost';
 True-- 刷新权限
 FLUSH PRIVILEGES;
 True-- 示例：授予只读权限
 GRANT SELECT ON ecommerce.* TO 'readonly'@'%';
 True-- 示例：授予读写权限
 GRANT SELECT, INSERT, UPDATE, DELETE ON ecommerce.* TO 'appuser'@'%';
 True-- 示例：授予管理员权限
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
 True-- 开始事务
 START TRANSACTION;
 True-- 或
 BEGIN;
 True-- 提交事务
 commit;
 True-- 回滚事务
 ROLLBACK;
 True-- 设置保存点
 SAVEPOINT savepoint_name;
 True-- 回滚到保存点
 ROLLBACK TO SAVEPOINT savepoint_name;
 True-- 示例：转账事务
 BEGIN;
 UPDATE accounts SET balance = balance - 100 WHERE id = 1;
 UPDATE accounts SET balance = balance + 100 WHERE id = 2;
 commit;
 True-- 示例：带保存点的事务
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
 True-- 查看当前隔离级别
 SELECT @@transaction_isolation;
 True-- 设置隔离级别
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
 True-- 示例：格式化用户全名
 SELECT CONCAT(last_name, ' ', first_name) AS full_name FROM users;
 True-- 示例：截取邮箱域名
 SELECT SUBSTRING(email, INSTR(email, '@') + 1) AS domain FROM users;
 True-- 示例：生成用户名
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
 True-- 示例：查询本月注册用户
 SELECT * FROM users WHERE DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m');
 True-- 示例：计算用户年龄
 SELECT TIMESTAMPDIFF(YEAR, birthday, CURDATE()) AS age FROM users;
 True-- 示例：获取本周一日期
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
 True-- 示例：计算平均评分并保留1位小数
 SELECT ROUND(AVG(rating), 1) AS avg_rating FROM products;
 True-- 示例：生成随机验证码
 SELECT FLOOR(RAND() * 9000 + 1000) AS captcha;
 True-- 示例：计算商品折扣后价格
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
 True-- 示例：根据状态显示文本
 SELECT id, username, IF(status = 1, '活跃', '禁用') AS status_text FROM users;
 True-- 示例：显示用户等级
 SELECT
  username,
  CASE
  WHEN points >= 1000 THEN 'VIP'
  WHEN points >= 500 THEN '高级会员'
  ELSE '普通会员'
  END AS level
 from users;
 True-- 示例：处理空值
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
