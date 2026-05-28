---
order: 40
tags:
  - 'mysql'
  - 'database'
difficulty: 'intermediate'
title: 'SQL 数据定义与高级对象'
module: 'mysql'
category: 'MySQL Basics'
description: 'CREATE/ALTER/DROP、视图、索引与存储过程。'
author: 'Anonymous'
---

## 目录

1. [DDL (数据定义语言)](#ddl-数据定义语言)
2. [事务详解](#事务详解)
3. [视图详解](#视图详解)
4. [存储过程详解](#存储过程详解)
5. [触发器详解](#触发器详解)

---

## 1. DDL (数据定义语言) - Data Definition Language

DDL 用于创建、修改和删除数据库对象，包括数据库、表、索引、视图等。

### 1.1 数据库操作详解

#### 1.1.1 创建数据库

```sql
 True-- 基本创建
 CREATE DATABASE mydb;
 True-- 创建数据库（指定字符集和校对规则）
 CREATE DATABASE mydb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
 True-- 如果不存在则创建（避免错误）
 CREATE DATABASE IF NOT EXISTS mydb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

#### 1.1.2 查看数据库

```sql
 True-- 查看所有数据库
 SHOW DATABASES;
 True-- 查看数据库创建信息
 SHOW CREATE DATABASE mydb;
 True-- 查看当前使用的数据库
 SELECT DATABASE();
```

#### 1.1.3 选择数据库

```sql
 use mydb;
```

#### 1.1.4 删除数据库

```sql
 True-- 删除数据库（谨慎使用）
 DROP DATABASE mydb;
 True-- 如果存在则删除
 DROP DATABASE IF EXISTS mydb;
```

#### 1.1.5 修改数据库

```sql
 True-- 修改数据库字符集
 ALTER DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 1.2 表操作详解

#### 1.2.1 创建表

```sql
 True-- 创建用户表（完整示例）
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
 True) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
```

#### 1.2.2 表结构设计原则

**设计要点**：

- 主键：每个表必须有主键，推荐使用自增 INT 或 BIGINT
- 字段命名：使用有意义的名称，采用小写下划线命名法
- 数据类型：选择合适的数据类型，避免浪费存储空间
- 索引设计：为常用查询条件的字段创建索引
- 注释：为重要字段添加注释说明
  **字段类型选择指南**：
  | 场景 | 推荐类型 | 原因 |
  | :--- | :--- | :--- |
  | ID 主键 | INT/BIGINT AUTO_INCREMENT | 高效、自增、占用空间小 |
  | 状态标志 | TINYINT | 占用空间最小 |
  | 年龄 | TINYINT UNSIGNED | 范围 0-255，足够存储年龄 |
  | 金额/价格 | DECIMAL(M,N) | 精确存储，避免浮点误差 |
  | 手机号 | VARCHAR(20) | 可能有+86等前缀 |
  | 文本描述 | VARCHAR/TEXT | 根据长度选择 |
  | 日期时间 | DATETIME/TIMESTAMP | 根据是否需要时区选择 |
  | UUID | VARCHAR(36) | 跨系统使用 |

#### 1.2.3 查看表结构

```sql
 True-- 查看表结构（DESCRIBE）
 DESC users;
 True-- 查看表结构（SHOW COLUMNS）
 SHOW COLUMNS FROM users;
 True-- 查看表的创建语句
 SHOW CREATE TABLE users;
 True-- 查看所有表
 SHOW TABLES;
 True-- 查看表状态
 SHOW TABLE STATUS FROM mydb;
 True-- 查看表是否存在
 SHOW TABLES LIKE '%user%';
```

#### 1.2.4 修改表结构

```sql
 True-- 添加新列
 ALTER TABLE users ADD COLUMN address VARCHAR(255) AFTER email;
 ALTER TABLE users ADD COLUMN is_verified TINYINT DEFAULT 0 AFTER status;
 True-- 修改列（类型、约束）
 ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) NOT NULL;
 True-- 修改列名和类型
 ALTER TABLE users CHANGE COLUMN phone telephone VARCHAR(20) NOT NULL;
 True-- 删除列
 ALTER TABLE users DROP COLUMN address;
 True-- 添加索引
 ALTER TABLE users ADD INDEX idx_age (age);
 ALTER TABLE users ADD UNIQUE INDEX idx_phone (phone);
 ALTER TABLE users ADD INDEX idx_age_gender (age, gender);
 True-- 添加外键
 ALTER TABLE orders ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id);
 True-- 删除外键
 ALTER TABLE orders DROP FOREIGN KEY fk_user_id;
 True-- 修改表注释
 ALTER TABLE users COMMENT '用户信息表';
 True-- 重命名表
 ALTER TABLE users RENAME TO user_info;
 RENAME TABLE users TO user_info, orders TO order_info;
```

#### 1.2.5 删除表

```sql
 True-- 删除表（删除表结构和所有数据）
 DROP TABLE users;
 True-- 如果表存在则删除
 DROP TABLE IF EXISTS users;
 True-- 删除多个表
 DROP TABLE IF EXISTS users, orders, products;
 True-- 清空表（保留表结构，重置自增ID）
 TRUNCATE TABLE users;
```

#### 1.2.6 表复制

```sql
 True-- 复制表结构（不复制数据）
 CREATE TABLE users_copy LIKE users;
 True-- 复制表结构和数据
 CREATE TABLE users_copy AS SELECT * FROM users;
 True-- 复制表结构（指定部分列）
 CREATE TABLE users_copy AS SELECT id, username, email FROM users WHERE 1=0;
 True-- 复制符合条件的数据
 CREATE TABLE users_copy AS SELECT * FROM users WHERE status = 1;
```

### 1.3 索引操作详解

#### 1.3.1 索引基础概念

索引是一种特殊的数据结构，用于加速数据检索。类似于书籍的目录，索引可以快速定位数据，减少查询时间。
**索引类型**：
| 类型 | 说明 | 示例 |
| :--- | :--- | :--- |
| 普通索引 | 最基本的索引 | `INDEX idx_name (name)` |
| 唯一索引 | 索引值唯一 | `UNIQUE INDEX idx_email (email)` |
| 主键索引 | 主键自动创建 | 主键列 |
| 复合索引 | 多列组合索引 | `INDEX idx_name_age (name, age)` |
| 全文索引 | 文本搜索 | `FULLTEXT INDEX ft_content (content)` |
| 空间索引 | 地理空间数据 | `SPATIAL INDEX sx_location (location)` |

#### 1.3.2 创建索引

```sql
 True-- 创建普通索引
 CREATE INDEX idx_username ON users(username);
 True-- 创建唯一索引
 CREATE UNIQUE INDEX idx_email ON users(email);
 True-- 创建复合索引
 CREATE INDEX idx_name_status ON users(username, status);
 True-- 创建复合唯一索引
 CREATE UNIQUE INDEX idx_order_product ON order_items(order_id, product_id);
 True-- 创建全文索引
 ALTER TABLE articles ADD FULLTEXT INDEX ft_title_content (title, content);
 True-- 创建前缀索引（适用于长字符串）
 CREATE INDEX idx_email_prefix ON users(email(10));
```

#### 1.3.3 查看索引

```sql
 True-- 查看表的所有索引
 SHOW INDEX FROM users;
 True-- 查看索引详细信息
 SHOW INDEX FROM users\G
 True-- 查看查询是否使用索引
 EXPLAIN SELECT * FROM users WHERE username = 'test';
```

#### 1.3.4 删除索引

```sql
 True-- 删除索引
 DROP INDEX idx_username ON users;
 True-- 删除主键索引（需要先删除自增属性）
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
 True-- 创建复合索引
 CREATE INDEX idx_status_created ON users(status, created_at);
 True-- 以下查询可以使用索引：
 SELECT * FROM users WHERE status = 1;
 SELECT * FROM users WHERE status = 1 AND created_at > '2024-01-01';
 True-- 以下查询无法使用索引：
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
 True);
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
 True-- 开始事务
 START TRANSACTION;
 True-- 或
 BEGIN;
 True-- 执行操作
 inSERT INTO users (username, email) VALUES ('张三', 'zhangsan@example.com');
 UPDATE accounts SET balance = balance - 100 WHERE user_id = 1;
 UPDATE accounts SET balance = balance + 100 WHERE user_id = 2;
 True-- 提交事务
 commit;
 True-- 或回滚事务
 ROLLBACK;
 True-- 设置保存点
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
 True-- 查看当前隔离级别
 SELECT @@tx_isolation;
 SELECT @@transaction_isolation;
 True-- 设置隔离级别（会话级别）
 SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
 True-- 设置隔离级别（全局级别）
 SET GLOBAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

### 2.4 事务实战

```sql
 True-- 转账事务
 START TRANSACTION;
 UPDATE accounts SET balance = balance - 1000 WHERE user_id = 1;
 UPDATE accounts SET balance = balance + 1000 WHERE user_id = 2;
 True-- 检查是否成功
 SELECT balance FROM accounts WHERE user_id IN (1, 2);
 True-- 如果余额为负则回滚
 if (SELECT balance FROM accounts WHERE user_id = 1) < 0 THEN
  ROLLBACK;
 else
  COMMIT;
 END IF;
 True-- 订单创建事务
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
 True-- 创建简单视图
 CREATE VIEW active_users AS
 SELECT id, username, email, status
 from users
 WHERE status = 1;
 True-- 创建复杂视图（多表连接）
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
 True-- 创建聚合视图
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
 True-- 查询视图（与表相同）
 SELECT * FROM active_users WHERE username LIKE '张%';
 True-- 视图与表连接
 SELECT v.username, v.order_count, o.order_no
 from user_stats v
 LEFT JOIN orders o ON v.id = o.user_id
 WHERE o.created_at > '2024-01-01';
 True-- 物化视图（通过表实现）
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
 True-- 修改视图
 CREATE OR REPLACE VIEW active_users AS
 SELECT id, username, email, status, created_at
 from users
 WHERE status = 1;
 True-- 删除视图
 DROP VIEW IF EXISTS active_users;
 True-- 查看视图定义
 SHOW CREATE VIEW order_details;
```

### 3.5 视图限制

```sql
 True-- 视图不能包含聚合函数（如 SUM、MAX）
 True-- 视图不能包含子查询（某些情况下）
 True-- 视图不能使用 LIMIT（某些 MySQL 版本）
 True-- 视图不能作为 UPDATE/DELETE 的目标（某些情况下）
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
 True-- 调用无参数存储过程
 CALL get_all_users();
 True-- 调用有输入参数存储过程
 CALL get_user_by_age(20, 30);
 True-- 调用有输出参数存储过程
 CALL count_users_by_status(@active, @inactive);
 SELECT @active AS active_users, @inactive AS inactive_users;
 True-- 调用有输入输出参数存储过程
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
 True-- INSERT 触发器
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
 True-- UPDATE 触发器
 CREATE TRIGGER after_order_update
 AFTER UPDATE ON orders
 for EACH ROW
 BEGIN
  IF OLD.status != NEW.status THEN
  INSERT INTO order_status_log (order_id, old_status, new_status, changed_at)
  VALUES (OLD.id, OLD.status, NEW.status, NOW());
  END IF;
 END //
 True-- DELETE 触发器
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

### 更新日志 (Changelog)

- 2026-05-27: 拆分为独立文件，添加元数据，版本升级至 v4.0.0
- 2026-04-30: 大幅细化内容，添加约束类型、索引设计原则、存储过程和触发器详解等
- 2026-04-05: 整合 SQL 基础语法知识
