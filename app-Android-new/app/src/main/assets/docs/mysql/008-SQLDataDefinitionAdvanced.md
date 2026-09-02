---
order: 80
title: SQL 数据定义与高级对象
module: 'mysql'
category: 数据库
difficulty: intermediate
description: CREATE/ALTER/DROP、视图、索引与存储过程。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'mysql/006-MySQLEnvSetup'
  - 'mysql/007-MySQLDataTypeConstraint'
  - 'mysql/009-MyISAMStorageEngine'
  - 'mysql/010-SQLDataOperationQuery'
prerequisites:
  - 'mysql/089-View'
---

## 1. DDL (数据定义语言) - Data Definition Language

DDL 用于创建、修改和删除数据库对象，包括数据库、表、索引、视图等。

> **新手必读：DDL 会自动提交，无法回滚**
> DDL 语句执行后立即生效，MySQL 会对其隐式提交，**不能像 DML 那样用 `ROLLBACK` 撤销**。
> 执行 `DROP` / `TRUNCATE` / `ALTER` 前务必再三确认作用对象与影响范围，删表、清表操作没有后悔药。

**DDL 核心命令一览**：

| 命令 | 作用 | 类比 | 可回滚 |
| --- | --- | --- | --- |
| `CREATE` | 创建数据库、表、索引、视图 | 平地起楼、画图纸 | 否 |
| `ALTER` | 修改表结构（加列、改类型、删列） | 给楼扩建或改装修 | 否 |
| `DROP` | 删除表/数据库，结构与数据一并消失 | 直接炸掉整栋楼 | 否 |
| `TRUNCATE` | 清空表数据但保留表结构，自增 ID 重置 | 扔光屋里东西、墙留着 | 否 |

### 1.1 数据库操作详解

#### 1.1.1 创建数据库

```sql
 CREATE DATABASE mydb;
 CREATE DATABASE mydb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
 CREATE DATABASE IF NOT EXISTS mydb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

#### 1.1.2 查看数据库

```sql
 SHOW DATABASES;
 SHOW CREATE DATABASE mydb;
 SELECT DATABASE();
```

#### 1.1.3 选择数据库

```sql
 use mydb;
```

#### 1.1.4 删除数据库

```sql
 DROP DATABASE mydb;
 DROP DATABASE IF EXISTS mydb;
```

#### 1.1.5 修改数据库

```sql
 ALTER DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 1.2 表操作详解

#### 1.2.1 创建表

```sql
 CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  email VARCHAR(100) NOT NULL COMMENT '邮箱',
  password VARCHAR(255) NOT NULL COMMENT '密码（加密存储）',
  phone VARCHAR(20) COMMENT '手机号',
  age INT UNSIGNED COMMENT '年龄',
  gender ENUM('男', '女', '保密') DEFAULT '保密' COMMENT '性别',
  avatar VARCHAR(255) COMMENT '头像URL',
  status TINYINT DEFAULT 1 COMMENT '状态：1-正常，0-禁用',
  balance DECIMAL(10,2) DEFAULT 0.00 COMMENT '账户余额',
  last_login_time DATETIME COMMENT '最后登录时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_status (status)
 )
```

#### 1.2.2 表结构设计原则

**设计要点**：

- 主键：每个表必须有主键，推荐使用自增 INT 或 BIGINT
- 字段命名：使用有意义的名称，采用小写下划线命名法
- 数据类型：选择合适的数据类型，避免浪费存储空间
- 索引设计：为常用查询条件的字段创建索引
- 注释：为重要字段添加注释说明
  **字段类型选择指南**：
  | 场景      | 推荐类型                  | 原因                     |
  | :-------- | :------------------------ | :----------------------- |
  | ID 主键   | INT/BIGINT AUTO_INCREMENT | 高效、自增、占用空间小   |
  | 状态标志  | TINYINT                   | 占用空间最小             |
  | 年龄      | TINYINT UNSIGNED          | 范围 0-255，足够存储年龄 |
  | 金额/价格 | DECIMAL(M,N)              | 精确存储，避免浮点误差   |
  | 手机号    | VARCHAR(20)               | 可能有+86等前缀          |
  | 文本描述  | VARCHAR/TEXT              | 根据长度选择             |
  | 日期时间  | DATETIME/TIMESTAMP        | 根据是否需要时区选择     |
  | UUID      | VARCHAR(36)               | 跨系统使用               |

#### 1.2.3 查看表结构

```sql
 DESC users;
 SHOW COLUMNS FROM users;
 SHOW CREATE TABLE users;
 SHOW TABLES;
 SHOW TABLE STATUS FROM mydb;
 SHOW TABLES LIKE '%user%';
```

#### 1.2.4 修改表结构

```sql
 ALTER TABLE users ADD COLUMN address VARCHAR(255) AFTER email;
 ALTER TABLE users ADD COLUMN is_verified TINYINT DEFAULT 0 AFTER status;
 ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) NOT NULL;
 ALTER TABLE users CHANGE COLUMN phone telephone VARCHAR(20) NOT NULL;
 ALTER TABLE users DROP COLUMN address;
 ALTER TABLE users ADD INDEX idx_age (age);
 ALTER TABLE users ADD UNIQUE INDEX idx_phone (phone);
 ALTER TABLE users ADD INDEX idx_age_gender (age, gender);
 ALTER TABLE orders ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id);
 ALTER TABLE orders DROP FOREIGN KEY fk_user_id;
 ALTER TABLE users COMMENT '用户信息表';
 ALTER TABLE users RENAME TO user_info;
 RENAME TABLE users TO user_info, orders TO order_info;
```

#### 1.2.5 删除表

```sql
 DROP TABLE users;
 DROP TABLE IF EXISTS users;
 DROP TABLE IF EXISTS users, orders, products;
 TRUNCATE TABLE users;
```

#### 1.2.6 表复制

```sql
 CREATE TABLE users_copy LIKE users;
 CREATE TABLE users_copy AS SELECT * FROM users;
 CREATE TABLE users_copy AS SELECT id, username, email FROM users WHERE 1=0;
 CREATE TABLE users_copy AS SELECT * FROM users WHERE status = 1;
```

### 1.3 索引操作详解

#### 1.3.1 索引基础概念

索引是一种特殊的数据结构，用于加速数据检索。类似于书籍的目录，索引可以快速定位数据，减少查询时间。
**索引类型**：

| 类型     | 说明         | 示例                                   |
| :------- | :----------- | :------------------------------------- |
| 普通索引 | 最基本的索引 | `INDEX idx_name (name)`                |
| 唯一索引 | 索引值唯一   | `UNIQUE INDEX idx_email (email)`       |
| 主键索引 | 主键自动创建 | 主键列                                 |
| 复合索引 | 多列组合索引 | `INDEX idx_name_age (name, age)`       |
| 全文索引 | 文本搜索     | `FULLTEXT INDEX ft_content (content)`  |
| 空间索引 | 地理空间数据 | `SPATIAL INDEX sx_location (location)` |

#### 1.3.2 创建索引

```sql
 CREATE INDEX idx_username ON users(username);
 CREATE UNIQUE INDEX idx_email ON users(email);
 CREATE INDEX idx_name_status ON users(username, status);
 CREATE UNIQUE INDEX idx_order_product ON order_items(order_id, product_id);
 ALTER TABLE articles ADD FULLTEXT INDEX ft_title_content (title, content);
 CREATE INDEX idx_email_prefix ON users(email(10));
```

#### 1.3.3 查看索引

```sql
 SHOW INDEX FROM users;
 SHOW INDEX FROM users\G
 EXPLAIN SELECT * FROM users WHERE username = 'test';
```

#### 1.3.4 删除索引

```sql
 DROP INDEX idx_username ON users;
 ALTER TABLE users MODIFY id INT NOT NULL;
 ALTER TABLE users DROP PRIMARY KEY;
```

#### 1.3.5 索引设计原则

**适合创建索引的场景**：

- WHERE 子句中经常使用的列
- JOIN 操作中经常使用的列
- ORDER BY、GROUP BY 后面的列
- SELECT 中频繁查询的列
  **不适合创建索引的场景**：
- 列中数据重复度很高（如性别只有男/女）
- 表数据量很小
- 经常更新的列
- 不出现在 WHERE 子句中的列
  **复合索引最左前缀原则**：

```sql
 CREATE INDEX idx_status_created ON users(status, created_at);
 SELECT * FROM users WHERE status = 1;
 SELECT * FROM users WHERE status = 1 AND created_at > '2024-01-01';
 SELECT * FROM users WHERE created_at > '2024-01-01';
```

### 1.4 约束详解

#### 1.4.1 约束类型

| 约束类型 | 说明             | 关键字         |
| :------- | :--------------- | :------------- |
| 主键约束 | 唯一标识每行记录 | PRIMARY KEY    |
| 唯一约束 | 字段值唯一       | UNIQUE         |
| 非空约束 | 字段值不能为空   | NOT NULL       |
| 默认约束 | 字段默认值       | DEFAULT        |
| 检查约束 | 字段值满足条件   | CHECK          |
| 外键约束 | 表之间关联       | FOREIGN KEY    |
| 自动增长 | 数值自动递增     | AUTO_INCREMENT |

#### 1.4.2 约束示例

```sql
 CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(32) NOT NULL UNIQUE COMMENT '订单编号',
  user_id INT NOT NULL COMMENT '用户ID',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '订单总额',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- 外键约束
  FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE RESTRICT -- 限制删除
  ON UPDATE CASCADE, -- 级联更新
  -- 检查约束
  CHECK (total_amount >= 0),
  CHECK (status IN (1, 2, 3, 4, 5))
 )
```

#### 1.4.3 外键约束行为

| 行为      | 说明                              |
| :-------- | :-------------------------------- |
| RESTRICT  | 阻止删除/更新有外键关联的记录     |
| CASCADE   | 级联删除/更新子表记录             |
| SET NULL  | 将子表外键设为 NULL               |
| NO ACTION | 拒绝删除/更新（与 RESTRICT 类似） |

## 2. 事务详解

### 2.1 事务概念

事务是指一组操作，这些操作要么全部成功，要么全部失败，是一个不可分割的工作单元。
**ACID 特性**：

- Atomicity（原子性）：事务是最小执行单元，不可分割
- Consistency（一致性）：事务执行前后，数据保持一致
- Isolation（隔离性）：并发执行的事务相互隔离
- Durability（持久性）：事务提交后，修改永久保存

### 2.2 事务基本语法

```sql
 START TRANSACTION;
 BEGIN;
 inSERT INTO users (username, email) VALUES ('张三', 'zhangsan@example.com');
 UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
 UPDATE accounts SET balance = balance + 100 WHERE user_id = 2;
 commit;
 ROLLBACK;
 START TRANSACTION;
 inSERT INTO users (username) VALUES ('张三');
 SAVEPOINT sp1;
 inSERT INTO users (username) VALUES ('李四');
 ROLLBACK TO sp1; -- 回滚到保存点
 commit;
```

### 2.3 事务隔离级别

| 隔离级别               | 脏读   | 不可重复读 | 幻读   |
| :--------------------- | :----- | :--------- | :----- |
| READ UNCOMMITTED       | 可能   | 可能       | 可能   |
| READ COMMITTED         | 不可能 | 可能       | 可能   |
| REPEATABLE READ (默认) | 不可能 | 不可能     | 可能   |
| SERIALIZABLE           | 不可能 | 不可能     | 不可能 |

```sql
 SELECT @@tx_isolation;
 SELECT @@transaction_isolation;
 SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
 SET GLOBAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

### 2.4 事务实战

```sql
 START TRANSACTION;
 UPDATE accounts SET balance = balance - 1000 WHERE user_id = 1;
 UPDATE accounts SET balance = balance + 1000 WHERE user_id = 2;
 SELECT balance FROM accounts WHERE user_id IN (1, 2);
 if (SELECT balance FROM accounts WHERE user_id = 1) < 0 THEN
  ROLLBACK;
 else
  COMMIT;
 END IF;
 START TRANSACTION;
 inSERT INTO orders (user_id, total_amount) VALUES (1, 500);
 SET @order_id = LAST_INSERT_ID();
 inSERT INTO order_items (order_id, product_id, quantity, price) VALUES
 (@order_id, 101, 2, 200),
 (@order_id, 102, 1, 100);
 UPDATE products SET stock = stock - 3 WHERE id IN (101, 102);
 commit;
```

## 3. 视图详解

### 3.1 视图概念

视图是基于 SQL 查询结果的虚拟表，可以简化复杂查询、保护数据安全。

### 3.2 创建视图

```sql
 CREATE VIEW active_users AS
 SELECT id, username, email, status
 from users
 WHERE status = 1;
 CREATE VIEW order_details AS
 SELECT
  o.id AS order_id,
  o.order_no,
  u.username,
  u.email,
  o.total_amount,
  o.status,
  o.created_at
 from orders o
 inNER JOIN users u ON o.user_id = u.id;
 CREATE VIEW user_stats AS
 SELECT
  u.id,
  u.username,
  COUNT(o.id) AS order_count,
  IFNULL(SUM(o.total_amount), 0) AS total_spent,
  MAX(o.created_at) AS last_order_time
 from users u
 LEFT JOIN orders o ON u.id = o.user_id
 GROUP BY u.id, u.username;
```

### 3.3 使用视图

```sql
 SELECT * FROM active_users WHERE username LIKE '张%';
 SELECT v.username, v.order_count, o.order_no
 from user_stats v
 LEFT JOIN orders o ON v.id = o.user_id
 WHERE o.created_at > '2024-01-01';
 CREATE TABLE monthly_sales AS
 SELECT
  DATE_FORMAT(created_at, '%Y-%m') AS month,
  COUNT(*) AS order_count,
  SUM(total_amount) AS total_amount
 from orders
 GROUP BY DATE_FORMAT(created_at, '%Y-%m');
```

### 3.4 修改和删除视图

```sql
 CREATE OR REPLACE VIEW active_users AS
 SELECT id, username, email, status, created_at
 from users
 WHERE status = 1;
 DROP VIEW IF EXISTS active_users;
 SHOW CREATE VIEW order_details;
```

### 3.5 视图限制

```sql
```

## 4. 存储过程详解

### 4.1 存储过程概念

存储过程是预编译的 SQL 代码块，可以接收参数、返回值，用于实现复杂的业务逻辑。

### 4.2 创建存储过程

```sql
 DELIMITER //
 CREATE PROCEDURE get_user_by_age(IN min_age INT, IN max_age INT)
 BEGIN
  SELECT * FROM users
  WHERE age BETWEEN min_age AND max_age
  ORDER BY age;
 END //
 CREATE PROCEDURE count_users_by_status(OUT active_count INT, OUT inactive_count INT)
 BEGIN
  SELECT COUNT(*) INTO active_count FROM users WHERE status = 1;
  SELECT COUNT(*) INTO inactive_count FROM users WHERE status = 0;
 END //
 CREATE PROCEDURE update_user_status(IN user_id INT, IN new_status INT)
 BEGIN
  UPDATE users SET status = new_status, updated_at = NOW() WHERE id = user_id;
 END //
 DELIMITER ;
```

### 4.3 调用存储过程

```sql
 CALL get_all_users();
 CALL get_user_by_age(20, 30);
 CALL count_users_by_status(@active, @inactive);
 SELECT @active AS active_users, @inactive AS inactive_users;
 SET @user_id = 1;
 CALL update_user_status(@user_id, 0);
```

### 4.4 删除存储过程

```sql
 DROP PROCEDURE IF EXISTS get_user_by_age;
```

## 5. 触发器详解

### 5.1 触发器概念

触发器是在表发生特定事件（INSERT、UPDATE、DELETE）时自动执行的代码块。

### 5.2 创建触发器

```sql
 DELIMITER //
 CREATE TRIGGER before_user_insert
 BEFORE INSERT ON users
 for EACH ROW
 BEGIN
  SET NEW.created_at = NOW();
  SET NEW.updated_at = NOW();
  IF NEW.status IS NULL THEN
  SET NEW.status = 1;
  END IF;
 END //
 CREATE TRIGGER after_order_update
 AFTER UPDATE ON orders
 for EACH ROW
 BEGIN
  IF OLD.status != NEW.status THEN
  INSERT INTO order_status_log (order_id, old_status, new_status, changed_at)
  VALUES (OLD.id, OLD.status, NEW.status, NOW());
  END IF;
 END //
 CREATE TRIGGER after_user_delete
 AFTER DELETE ON users
 for EACH ROW
 BEGIN
  INSERT INTO user_delete_log (user_id, username, deleted_at)
  VALUES (OLD.id, OLD.username, NOW());
 END //
 DELIMITER ;
```

### 5.3 删除触发器

```sql
 DROP TRIGGER IF EXISTS before_user_insert;
```

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
