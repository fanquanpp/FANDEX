# MySQL SQL 数据定义与高级对象

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 数据库操作

**单行写法：创建数据库**
`CREATE DATABASE <库名>`
```sql
-- 创建数据库
CREATE DATABASE mydb;
```

**换行写法：创建数据库并指定字符集**
`CREATE DATABASE <库名> CHARACTER SET <字符集> COLLATE <排序规则>`
```sql
-- 创建数据库并指定字符集与排序规则
CREATE DATABASE mydb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

**换行写法：不存在时创建数据库**
`CREATE DATABASE IF NOT EXISTS <库名> [CHARACTER SET <字符集>] [COLLATE <排序规则>]`
```sql
-- 数据库不存在时才创建
CREATE DATABASE IF NOT EXISTS mydb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

**单行写法：查看所有数据库**
`SHOW DATABASES`
```sql
-- 查看所有数据库
SHOW DATABASES;
```

**单行写法：查看建库语句**
`SHOW CREATE DATABASE <库名>`
```sql
-- 查看数据库的建库语句
SHOW CREATE DATABASE mydb;
```

**单行写法：查看当前数据库**
`SELECT DATABASE()`
```sql
-- 查看当前使用的数据库
SELECT DATABASE();
```

**单行写法：选择数据库**
`USE <库名>`
```sql
-- 切换到指定数据库
USE mydb;
```

**单行写法：删除数据库**
`DROP DATABASE <库名>`
```sql
-- 删除数据库
DROP DATABASE mydb;
```

**单行写法：存在时删除数据库**
`DROP DATABASE IF EXISTS <库名>`
```sql
-- 数据库存在时才删除
DROP DATABASE IF EXISTS mydb;
```

**单行写法：修改数据库字符集**
`ALTER DATABASE <库名> CHARACTER SET <字符集> COLLATE <排序规则>`
```sql
-- 修改数据库的字符集与排序规则
ALTER DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 表操作

**换行写法：创建表**
`CREATE TABLE [IF NOT EXISTS] <表名> (<列定义>[, <表约束>...])`
```sql
-- 创建用户表并包含索引
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  email VARCHAR(100) NOT NULL COMMENT '邮箱',
  password VARCHAR(255) NOT NULL COMMENT '密码',
  phone VARCHAR(20) COMMENT '手机号',
  age INT UNSIGNED COMMENT '年龄',
  gender ENUM('男', '女', '保密') DEFAULT '保密' COMMENT '性别',
  status TINYINT DEFAULT 1 COMMENT '状态',
  balance DECIMAL(10,2) DEFAULT 0.00 COMMENT '账户余额',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_status (status)
);
```

**单行写法：查看表字段**
`DESC <表名>`
```sql
-- 查看表字段信息
DESC users;
```

**单行写法：查看列信息**
`SHOW COLUMNS FROM <表名>`
```sql
-- 查看表的列详细信息
SHOW COLUMNS FROM users;
```

**单行写法：查看建表语句**
`SHOW CREATE TABLE <表名>`
```sql
-- 查看表的建表语句
SHOW CREATE TABLE users;
```

**单行写法：查看所有表**
`SHOW TABLES`
```sql
-- 查看当前数据库的所有表
SHOW TABLES;
```

**单行写法：模糊查表**
`SHOW TABLES LIKE '<模式>'`
```sql
-- 模糊查询表名
SHOW TABLES LIKE '%user%';
```

**单行写法：添加列**
`ALTER TABLE <表名> ADD COLUMN <列定义> [AFTER <列名>]`
```sql
-- 在指定列后添加新列
ALTER TABLE users ADD COLUMN address VARCHAR(255) AFTER email;
```

**单行写法：修改列类型**
`ALTER TABLE <表名> MODIFY COLUMN <列名> <新类型> [<约束>]`
```sql
-- 修改列的定义
ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) NOT NULL;
```

**单行写法：重命名列**
`ALTER TABLE <表名> CHANGE COLUMN <旧列名> <新列名> <类型> [<约束>]`
```sql
-- 重命名列并保留类型
ALTER TABLE users CHANGE COLUMN phone telephone VARCHAR(20) NOT NULL;
```

**单行写法：删除列**
`ALTER TABLE <表名> DROP COLUMN <列名>`
```sql
-- 删除指定列
ALTER TABLE users DROP COLUMN address;
```

**单行写法：添加普通索引**
`ALTER TABLE <表名> ADD INDEX <索引名> (<列名>[, <列名>...])`
```sql
-- 添加普通索引
ALTER TABLE users ADD INDEX idx_age (age);
```

**单行写法：添加唯一索引**
`ALTER TABLE <表名> ADD UNIQUE INDEX <索引名> (<列名>[, <列名>...])`
```sql
-- 添加唯一索引
ALTER TABLE users ADD UNIQUE INDEX idx_phone (phone);
```

**单行写法：添加复合索引**
`ALTER TABLE <表名> ADD INDEX <索引名> (<列名1>, <列名2>[, ...])`
```sql
-- 添加复合索引
ALTER TABLE users ADD INDEX idx_age_gender (age, gender);
```

**单行写法：添加外键**
`ALTER TABLE <表名> ADD CONSTRAINT <约束名> FOREIGN KEY (<列名>) REFERENCES <父表>(<父列>)`
```sql
-- 添加外键约束
ALTER TABLE orders ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id);
```

**单行写法：删除外键**
`ALTER TABLE <表名> DROP FOREIGN KEY <约束名>`
```sql
-- 删除外键约束
ALTER TABLE orders DROP FOREIGN KEY fk_user_id;
```

**单行写法：重命名表**
`ALTER TABLE <旧表名> RENAME TO <新表名>`
```sql
-- 重命名表
ALTER TABLE users RENAME TO user_info;
```

**单行写法：多表重命名**
`RENAME TABLE <旧表名1> TO <新表名1>, <旧表名2> TO <新表名2>`
```sql
-- 同时重命名多个表
RENAME TABLE users TO user_info, orders TO order_info;
```

**单行写法：删除表**
`DROP TABLE <表名>`
```sql
-- 删除表
DROP TABLE users;
```

**单行写法：存在时删除表**
`DROP TABLE IF EXISTS <表名>`
```sql
-- 表存在时才删除
DROP TABLE IF EXISTS users;
```

**单行写法：删除多表**
`DROP TABLE IF EXISTS <表名1>, <表名2>[, ...]`
```sql
-- 同时删除多个表
DROP TABLE IF EXISTS users, orders, products;
```

**单行写法：清空表**
`TRUNCATE TABLE <表名>`
```sql
-- 清空表数据
TRUNCATE TABLE users;
```

**单行写法：仅复制表结构**
`CREATE TABLE <新表> LIKE <源表>`
```sql
-- 仅复制表结构不复制数据
CREATE TABLE users_copy LIKE users;
```

**单行写法：复制结构和数据**
`CREATE TABLE <新表> AS SELECT * FROM <源表>`
```sql
-- 复制表结构和全部数据
CREATE TABLE users_copy AS SELECT * FROM users;
```

**单行写法：复制部分数据**
`CREATE TABLE <新表> AS SELECT * FROM <源表> WHERE <条件>`
```sql
-- 复制表结构并复制符合条件的数据
CREATE TABLE users_copy AS SELECT * FROM users WHERE status = 1;
```

---

## 索引操作

**单行写法：创建普通索引**
`CREATE INDEX <索引名> ON <表名>(<列名>[, <列名>...])`
```sql
-- 创建单列普通索引
CREATE INDEX idx_username ON users(username);
```

**单行写法：创建复合索引**
`CREATE INDEX <索引名> ON <表名>(<列名1>, <列名2>[, ...])`
```sql
-- 创建多列复合索引
CREATE INDEX idx_name_status ON users(username, status);
```

**单行写法：创建唯一索引**
`CREATE UNIQUE INDEX <索引名> ON <表名>(<列名>[, <列名>...])`
```sql
-- 创建单列唯一索引
CREATE UNIQUE INDEX idx_email ON users(email);
```

**单行写法：创建复合唯一索引**
`CREATE UNIQUE INDEX <索引名> ON <表名>(<列名1>, <列名2>[, ...])`
```sql
-- 创建多列复合唯一索引
CREATE UNIQUE INDEX idx_order_product ON order_items(order_id, product_id);
```

**单行写法：创建前缀索引**
`CREATE INDEX <索引名> ON <表名>(<列名>(<长度>))`
```sql
-- 为长字符串创建前缀索引
CREATE INDEX idx_email_prefix ON users(email(10));
```

**单行写法：创建全文索引**
`ALTER TABLE <表名> ADD FULLTEXT INDEX <索引名> (<列名>[, <列名>...])`
```sql
-- 为文本列创建全文索引
ALTER TABLE articles ADD FULLTEXT INDEX ft_title_content (title, content);
```

**单行写法：查看表索引**
`SHOW INDEX FROM <表名>`
```sql
-- 查看表的索引信息
SHOW INDEX FROM users;
```

**单行写法：删除索引**
`DROP INDEX <索引名> ON <表名>`
```sql
-- 删除指定索引
DROP INDEX idx_username ON users;
```

**单行写法：删除主键**
`ALTER TABLE <表名> DROP PRIMARY KEY`
```sql
-- 删除主键索引
ALTER TABLE users DROP PRIMARY KEY;
```

---

## 约束

**换行写法：综合约束建表**
`CREATE TABLE <表名> (<列定义>, <约束定义>...)`
```sql
-- 创建包含多种约束的订单表
CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(32) NOT NULL UNIQUE COMMENT '订单编号',
  user_id INT NOT NULL COMMENT '用户ID',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '订单总额',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CHECK (total_amount >= 0),
  CHECK (status IN (1, 2, 3, 4, 5))
);
```

---

## 事务

**单行写法：开启事务**
`START TRANSACTION` / `BEGIN`
```sql
-- 开启事务
START TRANSACTION;
```

**换行写法：提交事务**
`COMMIT`
```sql
-- 提交事务并持久化变更
START TRANSACTION;
INSERT INTO users (username, email) VALUES ('张三', 'zhangsan@example.com');
UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
COMMIT;
```

**单行写法：回滚事务**
`ROLLBACK`
```sql
-- 回滚事务撤销变更
ROLLBACK;
```

**换行写法：使用保存点**
`SAVEPOINT <保存点名>` / `ROLLBACK TO <保存点名>`
```sql
-- 使用保存点部分回滚
START TRANSACTION;
INSERT INTO users (username) VALUES ('张三');
SAVEPOINT sp1;
INSERT INTO users (username) VALUES ('李四');
ROLLBACK TO sp1;
COMMIT;
```

**单行写法：查看隔离级别**
`SELECT @@transaction_isolation`
```sql
-- 查看当前事务隔离级别
SELECT @@transaction_isolation;
```

**单行写法：设置会话隔离级别**
`SET SESSION TRANSACTION ISOLATION LEVEL <级别>`
```sql
-- 设置会话隔离级别为读已提交
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

**单行写法：设置全局隔离级别**
`SET GLOBAL TRANSACTION ISOLATION LEVEL <级别>`
```sql
-- 设置全局隔离级别为可序列化
SET GLOBAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

---

## 视图

**换行写法：创建简单视图**
`CREATE VIEW <视图名> AS <SELECT 语句>`
```sql
-- 创建只读视图
CREATE VIEW active_users AS
SELECT id, username, email, status
FROM users
WHERE status = 1;
```

**换行写法：创建多表视图**
`CREATE VIEW <视图名> AS <多表 JOIN 查询>`
```sql
-- 创建多表关联视图
CREATE VIEW order_details AS
SELECT
  o.id AS order_id,
  o.order_no,
  u.username,
  u.email,
  o.total_amount,
  o.status
FROM orders o
INNER JOIN users u ON o.user_id = u.id;
```

**单行写法：查询视图**
`SELECT <列名> FROM <视图名> [WHERE <条件>]`
```sql
-- 查询视图数据
SELECT * FROM active_users WHERE username LIKE '张%';
```

**换行写法：替换视图定义**
`CREATE OR REPLACE VIEW <视图名> AS <SELECT 语句>`
```sql
-- 替换已有视图的定义
CREATE OR REPLACE VIEW active_users AS
SELECT id, username, email, status, created_at
FROM users
WHERE status = 1;
```

**单行写法：删除视图**
`DROP VIEW [IF EXISTS] <视图名>`
```sql
-- 删除视图
DROP VIEW IF EXISTS active_users;
```

**单行写法：查看视图定义**
`SHOW CREATE VIEW <视图名>`
```sql
-- 查看视图的建语句
SHOW CREATE VIEW order_details;
```

---

## 存储过程

**换行写法：创建带 IN 参数的存储过程**
`CREATE PROCEDURE <过程名>(IN <参数名> <类型>[, ...]) BEGIN <过程体> END`
```sql
-- 创建带输入参数的存储过程
DELIMITER //
CREATE PROCEDURE get_user_by_age(IN min_age INT, IN max_age INT)
BEGIN
  SELECT * FROM users
  WHERE age BETWEEN min_age AND max_age
  ORDER BY age;
END //
DELIMITER ;
```

**换行写法：创建带 OUT 参数的存储过程**
`CREATE PROCEDURE <过程名>(OUT <参数名> <类型>[, ...]) BEGIN <过程体> END`
```sql
-- 创建带输出参数的存储过程
DELIMITER //
CREATE PROCEDURE count_users_by_status(OUT active_count INT, OUT inactive_count INT)
BEGIN
  SELECT COUNT(*) INTO active_count FROM users WHERE status = 1;
  SELECT COUNT(*) INTO inactive_count FROM users WHERE status = 0;
END //
DELIMITER ;
```

**单行写法：调用无参存储过程**
`CALL <过程名>()`
```sql
-- 调用无参存储过程
CALL get_all_users();
```

**单行写法：调用带 IN 参数的存储过程**
`CALL <过程名>(<参数值>[, ...])`
```sql
-- 调用带输入参数的存储过程
CALL get_user_by_age(20, 30);
```

**换行写法：调用带 OUT 参数的存储过程**
`CALL <过程名>(@<变量名>[, ...])`
```sql
-- 调用带输出参数的存储过程并查看结果
CALL count_users_by_status(@active, @inactive);
SELECT @active AS active_users, @inactive AS inactive_users;
```

**单行写法：删除存储过程**
`DROP PROCEDURE [IF EXISTS] <过程名>`
```sql
-- 删除存储过程
DROP PROCEDURE IF EXISTS get_user_by_age;
```

---

## 触发器

**换行写法：创建插入前触发器**
`CREATE TRIGGER <触发器名> BEFORE INSERT ON <表名> FOR EACH ROW BEGIN <触发体> END`
```sql
-- 插入前自动填充时间字段
DELIMITER //
CREATE TRIGGER before_user_insert
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
  SET NEW.created_at = NOW();
  SET NEW.updated_at = NOW();
  IF NEW.status IS NULL THEN
    SET NEW.status = 1;
  END IF;
END //
DELIMITER ;
```

**换行写法：创建更新后触发器**
`CREATE TRIGGER <触发器名> AFTER UPDATE ON <表名> FOR EACH ROW BEGIN <触发体> END`
```sql
-- 更新后记录状态变更日志
DELIMITER //
CREATE TRIGGER after_order_update
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO order_status_log (order_id, old_status, new_status, changed_at)
    VALUES (OLD.id, OLD.status, NEW.status, NOW());
  END IF;
END //
DELIMITER ;
```

**单行写法：删除触发器**
`DROP TRIGGER [IF EXISTS] <触发器名>`
```sql
-- 删除触发器
DROP TRIGGER IF EXISTS before_user_insert;
```
