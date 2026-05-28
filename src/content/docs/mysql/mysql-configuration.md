---
order: 120
tags:
  - 'mysql'
  - 'security'
  - 'database'
  - 'memory'
  - 'concurrency'
difficulty: 'intermediate'
title: 'MySQL 配置与运维'
module: 'mysql'
category: 'MySQL Basics'
description: '参数调优、日志管理、备份恢复与监控。'
author: 'Anonymous'
---

## 目录

1. [基本操作](#基本操作)
2. [性能优化建议](#性能优化建议)
3. [安全配置详解](#安全配置详解)
4. [常见问题与解决方案](#常见问题与解决方案)
5. [监控与维护](#监控与维护)

---

## 1. 基本操作 (Basic Ops)

### 1.1 数据库操作详解

#### 1.1.1 创建数据库

```sql
 True-- 查看所有数据库
 SHOW DATABASES;
 True-- 创建数据库（指定字符集和校对规则）
 CREATE DATABASE mydb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
 True-- 创建数据库（如果不存在）
 CREATE DATABASE IF NOT EXISTS mydb;
 True-- 创建数据库（简写）
 CREATE DATABASE mydb;
 True-- 删除数据库
 DROP DATABASE IF EXISTS mydb;
 True-- 使用数据库
 use mydb;
 True-- 查看当前数据库
 SELECT DATABASE();
 True-- 查看数据库创建语句
 SHOW CREATE DATABASE mydb;
 True-- 修改数据库字符集
 ALTER DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 1.1.2 字符集和排序规则详解

**常用字符集**：

- `utf8`（实际是 UTF-8 的 3 字节版本，不支持 emoji）
- `utf8mb4`（完整的 UTF-8，支持所有字符，包括 emoji）
- `latin1`（西欧字符集）
- `gbk`（中文扩展字符集）
  **常用排序规则**：
- `utf8mb4_unicode_ci`：基于 Unicode 排序规则，较为准确
- `utf8mb4_general_ci`：通用排序规则，性能较好
- `utf8mb4_0900_ai_ci`：MySQL 8.0 新增，更准确的排序
  **推荐配置**：

```sql
 CREATE DATABASE mydb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 1.2 表操作详解

#### 1.2.1 创建表

```sql
 True-- 创建用户表（包含多种约束）
 CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  email VARCHAR(100) NOT NULL COMMENT '邮箱',
  password VARCHAR(255) NOT NULL COMMENT '密码（加密存储）',
  age INT UNSIGNED COMMENT '年龄',
  status TINYINT DEFAULT 1 COMMENT '状态：1-正常，0-禁用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
 True) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
 True-- 查看表结构
 DESCRIBE users;
 SHOW COLUMNS FROM users;
 True-- 查看表创建语句
 SHOW CREATE TABLE users;
 True-- 查看所有表
 SHOW TABLES;
 True-- 查看表状态
 SHOW TABLE STATUS FROM mydb;
```

#### 1.2.2 修改表结构

```sql
 True-- 添加列
 ALTER TABLE users ADD COLUMN phone VARCHAR(20) AFTER email;
 ALTER TABLE users ADD COLUMN last_login DATETIME AFTER updated_at;
 True-- 修改列（类型、约束等）
 ALTER TABLE users MODIFY COLUMN age INT UNSIGNED NOT NULL DEFAULT 0;
 True-- 修改列名和类型
 ALTER TABLE users CHANGE COLUMN username user_name VARCHAR(50) NOT NULL;
 True-- 删除列
 ALTER TABLE users DROP COLUMN phone;
 True-- 添加索引
 ALTER TABLE users ADD INDEX idx_email (email);
 ALTER TABLE users ADD UNIQUE INDEX idx_username (username);
 True-- 添加外键
 ALTER TABLE orders ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id);
 True-- 重命名表
 ALTER TABLE users RENAME TO customers;
 RENAME TABLE users TO customers, orders TO purchase_orders;
 True-- 删除表
 DROP TABLE IF EXISTS users;
 True-- 清空表（重置自增ID）
 TRUNCATE TABLE users;
```

#### 1.2.3 表结构设计示例

```sql
 True-- 订单主表
 CREATE TABLE orders (
  order_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_no VARCHAR(32) NOT NULL UNIQUE COMMENT '订单编号',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '订单总额',
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '优惠金额',
  pay_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '实付金额',
  pay_type TINYINT COMMENT '支付方式：1-微信 2-支付宝 3-银行卡',
  status TINYINT NOT NULL DEFAULT 1 COMMENT '订单状态：1-待付款 2-已付款 3-已发货 4-已收货 5-已取消',
  order_time DATETIME NOT NULL COMMENT '下单时间',
  pay_time DATETIME COMMENT '支付时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_order_time (order_time),
  INDEX idx_status (status)
 True) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';
 True-- 订单明细表
 CREATE TABLE order_items (
  item_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL COMMENT '订单ID',
  product_id BIGINT NOT NULL COMMENT '商品ID',
  product_name VARCHAR(100) NOT NULL COMMENT '商品名称（冗余）',
  sku_id BIGINT COMMENT 'SKU ID',
  sku_name VARCHAR(100) COMMENT 'SKU名称（冗余）',
  price DECIMAL(10,2) NOT NULL COMMENT '商品单价',
  quantity INT NOT NULL DEFAULT 1 COMMENT '购买数量',
  subtotal DECIMAL(10,2) NOT NULL COMMENT '小计金额',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id),
  INDEX idx_product_id (product_id)
 True) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单明细表';
```

### 1.3 数据操作详解

#### 1.3.1 插入数据

```sql
 True-- 插入单条数据（所有字段）
 inSERT INTO users (username, email, password, age) VALUES ('张三', 'zhangsan@example.com', 'encrypted_pass', 25);
 True-- 插入单条数据（指定部分字段）
 inSERT INTO users (username, email) VALUES ('李四', 'lisi@example.com');
 True-- 插入多条数据
 inSERT INTO users (username, email, password, age) VALUES
 ('王五', 'wangwu@example.com', 'pass1', 30),
 ('赵六', 'zhaoliu@example.com', 'pass2', 28),
 ('钱七', 'qianqi@example.com', 'pass3', 35);
 True-- 插入查询结果
 inSERT INTO users (username, email, age)
 SELECT username, email, age FROM old_users WHERE status = 1;
 True-- 使用 SET 语法
 inSERT INTO users SET username='孙八', email='sunba@example.com', age=27;
 True-- 插入或更新（存在则更新，不存在则插入）
 inSERT INTO users (id, username, email) VALUES (1, '张三', 'new_email@example.com')
 ON DUPLICATE KEY UPDATE email='new_email@example.com', updated_at=NOW();
 True-- 替换插入
 replace INTO users (id, username, email) VALUES (1, '张三', 'new_email@example.com');
 True-- 查看最后插入的ID
 SELECT LAST_INSERT_ID();
```

#### 1.3.2 查询数据

```sql
 True-- 查询所有字段
 SELECT * FROM users;
 True-- 查询指定字段
 SELECT id, username, email FROM users;
 True-- 使用别名
 SELECT id AS user_id, username AS name FROM users;
 True-- 去重查询
 SELECT DISTINCT status FROM users;
 SELECT COUNT(DISTINCT status) FROM users;
 True-- 限制查询结果
 SELECT * FROM users LIMIT 10;
 SELECT * FROM users LIMIT 10 OFFSET 20;
 SELECT * FROM users LIMIT 20, 10;
 True-- 查询并计算
 SELECT username, price, quantity, price * quantity AS total FROM order_items;
 True-- 条件查询
 SELECT * FROM users WHERE age > 25 AND status = 1;
 SELECT * FROM users WHERE age BETWEEN 20 AND 30;
 SELECT * FROM users WHERE username LIKE '张%';
 SELECT * FROM users WHERE email IN ('a@example.com', 'b@example.com');
 True-- 排序查询
 SELECT * FROM users ORDER BY created_at DESC;
 SELECT * FROM users ORDER BY age ASC, created_at DESC;
 True-- 分组查询
 SELECT status, COUNT(*) AS count FROM users GROUP BY status;
 SELECT status, AVG(age) AS avg_age FROM users GROUP BY status HAVING AVG(age) > 25;
 True-- 连接查询
 SELECT u.username, o.order_no, o.total_amount
 from users u
 inNER JOIN orders o ON u.id = o.user_id
 WHERE o.status = 2;
```

#### 1.3.3 更新数据

```sql
 True-- 更新单条数据
 UPDATE users SET age = 26 WHERE id = 1;
 True-- 更新多条数据
 UPDATE users SET age = age + 1 WHERE age < 30;
 True-- 更新多个字段
 UPDATE users SET age = 27, email = 'new_email@example.com', updated_at = NOW() WHERE id = 1;
 True-- 更新查询结果
 UPDATE users SET status = 0 WHERE created_at < '2024-01-01';
 True-- 事务中的更新
 START TRANSACTION;
 UPDATE accounts SET balance = balance - 100 WHERE id = 1;
 UPDATE accounts SET balance = balance + 100 WHERE id = 2;
 commit;
 True-- 注意：更新前最好先查询确认
 SELECT * FROM users WHERE id = 1 FOR UPDATE;
 UPDATE users SET age = 26 WHERE id = 1;
```

#### 1.3.4 删除数据

```sql
 True-- 删除单条数据
 delete FROM users WHERE id = 1;
 True-- 删除多条数据
 delete FROM users WHERE status = 0 AND created_at < '2024-01-01';
 True-- 删除所有数据（谨慎使用）
 delete FROM users;
 True-- 清空表（重置自增ID，性能更快）
 TRUNCATE TABLE users;
 True-- 删除表
 DROP TABLE IF EXISTS users;
 True-- 级联删除
 delete FROM orders WHERE user_id = 1;
 True-- 或者设置外键级联删除
 ALTER TABLE orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
 True-- 删除前查询确认
 SELECT * FROM users WHERE id = 1;
 delete FROM users WHERE id = 1;
```

### 1.4 用户与权限详解

#### 1.4.1 用户管理

```sql
 True-- 创建用户
 CREATE USER 'newuser'@'localhost' IDENTIFIED BY 'password';
 CREATE USER 'newuser'@'%' IDENTIFIED BY 'password'; -- 允许远程连接
 CREATE USER 'newuser'@'192.168.1.%' IDENTIFIED BY 'password'; -- 允许特定网段
 True-- 修改用户密码
 ALTER USER 'newuser'@'localhost' IDENTIFIED BY 'new_password';
 True-- 使用 SET 修改密码
 SET PASSWORD FOR 'newuser'@'localhost' = 'new_password';
 True-- 删除用户
 DROP USER 'newuser'@'localhost';
 True-- 查看所有用户
 SELECT user, host FROM mysql.user;
 True-- 查看用户权限
 SHOW GRANTS FOR 'newuser'@'localhost';
 True-- 重命名用户
 RENAME USER 'olduser'@'localhost' TO 'newuser'@'localhost';
```

#### 1.4.2 权限管理

```sql
 True-- 授予所有权限
 GRANT ALL PRIVILEGES ON mydb.* TO 'newuser'@'localhost';
 FLUSH PRIVILEGES;
 True-- 授予特定权限
 GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'newuser'@'localhost';
 True-- 授予所有数据库的所有权限
 GRANT ALL PRIVILEGES ON *.* TO 'admin'@'localhost';
 True-- 授予管理权限
 GRANT CREATE USER ON *.* TO 'admin'@'localhost';
 GRANT RELOAD ON *.* TO 'admin'@'localhost';
 GRANT BACKUP ADMIN ON *.* TO 'admin'@'localhost';
 True-- 授予特定表的权限
 GRANT SELECT, INSERT ON mydb.orders TO 'newuser'@'localhost';
 True-- 授予存储过程执行权限
 GRANT EXECUTE ON PROCEDURE mydb.sp_name TO 'newuser'@'localhost';
 True-- 撤销权限
 REVOKE ALL PRIVILEGES ON mydb.* FROM 'newuser'@'localhost';
 REVOKE DELETE ON mydb.* FROM 'newuser'@'localhost';
 True-- 查看权限层级
 True-- 全局层级：*.*
 True-- 数据库层级：db_name.*
 True-- 表层级：db_name.table_name
 True-- 列层级：需要单独授予每一列的权限
 True-- 角色管理（MySQL 8.0+）
 CREATE ROLE 'app_read', 'app_write';
 GRANT SELECT ON mydb.* TO 'app_read';
 GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'app_write';
 GRANT 'app_read' TO 'user1'@'localhost';
 GRANT 'app_write' TO 'user2'@'localhost';
 SET DEFAULT ROLE 'app_read' FOR 'user1'@'localhost';
```

#### 1.4.3 权限层级说明

| 层级     | 范围                 | 授予语法                                          |
| :------- | :------------------- | :------------------------------------------------ |
| 全局     | 所有数据库的所有对象 | `GRANT ALL ON *.* TO user`                        |
| 数据库   | 指定数据库的所有表   | `GRANT ALL ON mydb.* TO user`                     |
| 表       | 指定表的所有列       | `GRANT ALL ON mydb.orders TO user`                |
| 列       | 指定列               | `GRANT SELECT(col1, col2) ON mydb.orders TO user` |
| 存储过程 | 存储过程和函数       | `GRANT EXECUTE ON PROCEDURE mydb.sp TO user`      |

## 2. 性能优化建议

### 2.1 服务器配置优化详解

#### 2.1.1 内存配置

| 参数                    | 推荐值                     | 说明              |
| :---------------------- | :------------------------- | :---------------- |
| innodb_buffer_pool_size | 服务器内存的 70-80%        | 缓存数据和索引    |
| key_buffer_size         | 内存的 10-20%（仅 MyISAM） | MyISAM 索引缓存   |
| query_cache_size        | 不推荐（MySQL 8.0 已移除） | 查询缓存          |
| tmp_table_size          | 64-256MB                   | 临时表大小        |
| max_heap_table_size     | 64-256MB                   | Memory 表最大大小 |

#### 2.1.2 连接配置

```sql
 True-- 最大连接数
 SET GLOBAL max_connections = 500;
 True-- 连接超时时间
 SET GLOBAL wait_timeout = 600;
 SET GLOBAL interactive_timeout = 600;
 True-- 查看当前连接数
 SHOW STATUS LIKE 'Threads_connected';
 SHOW VARIABLES LIKE 'max_connections';
```

#### 2.1.3 InnoDB 配置

```ini
 [mysqld]
 # InnoDB 配置
 innodb_buffer_pool_size=4G # 建议为服务器内存的 70%
 innodb_log_file_size=1G # 建议 256MB-1GB
 innodb_log_buffer_size=64M
 innodb_flush_log_at_trx_commit=1 # 1-最安全，2-性能好，0-最快但可能丢数据
 innodb_flush_method=O_DIRECT # Linux 下推荐，减少系统缓存
 innodb_file_per_table=1 # 每个表独立的表空间
 innodb_io_capacity=4000 # 根据磁盘 IO 能力设置
```

### 2.2 查询优化详解

#### 2.2.1 索引优化

```sql
 True-- 创建合适的索引
 CREATE INDEX idx_username ON users(username);
 CREATE INDEX idx_email_status ON users(email, status);
 True-- 复合索引设计原则
 True-- 1. 区分度高的列放前面
 True-- 2. 经常作为条件的列放前面
 True-- 3. 排序和分组的列应包含在索引中
 True-- 示例：为常用查询创建索引
 True-- 查询：WHERE status = 1 AND created_at > '2024-01-01' ORDER BY created_at
 CREATE INDEX idx_status_created ON users(status, created_at);
```

#### 2.2.2 SQL 语句优化

```sql
 True-- 优化前
 SELECT * FROM users WHERE YEAR(created_at) = 2024;
 True-- 优化后
 SELECT * FROM users WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';
 True-- 优化前（使用函数导致索引失效）
 SELECT * FROM orders WHERE MONTH(order_time) = 1;
 True-- 优化后（范围查询可以利用索引）
 SELECT * FROM orders WHERE order_time >= '2024-01-01' AND order_time < '2024-02-01';
 True-- 使用 EXPLAIN 分析查询
 EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
```

#### 2.2.3 慢查询优化示例

```sql
 True-- 开启慢查询日志
 SET GLOBAL slow_query_log = 'ON';
 SET GLOBAL long_query_time = 1;
 SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
 True-- 分析慢查询
 True-- 1. 查看慢查询
 SHOW FULL PROCESSLIST;
 True-- 2. 使用 EXPLAIN
 EXPLAIN SELECT u.username, o.total_amount
 from users u
 inNER JOIN orders o ON u.id = o.user_id
 WHERE o.created_at > '2024-01-01';
 True-- 3. 优化建议
 True-- - 添加合适的索引
 True-- - 避免 SELECT *
 True-- - 使用 LIMIT 限制结果集
 True-- - 优化分页查询
```

### 2.3 存储引擎选择详解

| 存储引擎    | 事务支持 | 锁粒度 | 外键支持 | 特点                   | 适用场景                         |
| :---------- | :------- | :----- | :------- | :--------------------- | :------------------------------- |
| **InnoDB**  | 是       | 行级   | 是       | 支持事务、行级锁、MVCC | 大多数场景，特别是需要事务的系统 |
| **MyISAM**  | 否       | 表级   | 否       | 全文索引、压缩表       | 读多写少、日志、静态网站         |
| **Memory**  | 否       | 表级   | 否       | 内存存储，速度极快     | 临时表、缓存、会话数据           |
| **Archive** | 否       | 表级   | 否       | 高压缩比               | 归档数据、日志                   |
| **CSV**     | 否       | 表级   | 否       | CSV 格式               | 数据交换                         |

### 2.4 分区表详解

```sql
 True-- 按日期范围分区
 CREATE TABLE sales (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  sale_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  region VARCHAR(50)
 True) PARTITION BY RANGE (YEAR(sale_date)) (
  PARTITION p2020 VALUES LESS THAN (2021),
  PARTITION p2021 VALUES LESS THAN (2022),
  PARTITION p2022 VALUES LESS THAN (2023),
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION pmax VALUES LESS THAN MAXVALUE
 True);
 True-- 按哈希分区
 CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(50)
 True) PARTITION BY HASH(id) PARTITIONS 8;
 True-- 按列表分区
 CREATE TABLE products (
  id INT PRIMARY KEY,
  category_id INT,
  name VARCHAR(50)
 True) PARTITION BY LIST (category_id) (
  PARTITION p_electronics VALUES IN (1, 2, 3),
  PARTITION p_clothing VALUES IN (4, 5, 6),
  PARTITION p_other VALUES IN (NULL)
 True);
```

## 3. 安全配置详解

### 3.1 基础安全配置

```sql
 True-- 设置强密码（至少8位，包含大小写字母、数字、特殊字符）
 ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewStrongPass@123';
 True-- 删除匿名用户
 delete FROM mysql.user WHERE User = '';
 True-- 禁止 root 用户远程登录
 delete FROM mysql.user WHERE User = 'root' AND Host != 'localhost';
 FLUSH PRIVILEGES;
 True-- 创建应用专用用户
 CREATE USER 'app_user'@'%' IDENTIFIED BY 'AppPass@2024';
 GRANT SELECT, INSERT, UPDATE, DELETE ON production_db.* TO 'app_user'@'%';
 FLUSH PRIVILEGES;
 True-- 限制用户只能从特定 IP 登录
 CREATE USER 'app_user'@'192.168.1.%' IDENTIFIED BY 'AppPass@2024';
 CREATE USER 'app_user'@'10.%.%.%' IDENTIFIED BY 'AppPass@2024';
```

### 3.2 SSL/TLS 配置

```sql
 True-- 检查 SSL 状态
 SHOW VARIABLES LIKE 'have_ssl';
 SHOW VARIABLES LIKE 'have_openssl';
 True-- 配置 SSL（需要在 my.cnf 中配置）
 True-- [mysqld]
 True-- ssl-ca=/path/to/ca.pem
 True-- ssl-cert=/path/to/server-cert.pem
 True-- ssl-key=/path/to/server-key.pem
 True-- 强制用户使用 SSL 连接
 ALTER USER 'root'@'localhost' REQUIRE SSL;
 True-- 查看用户是否使用 SSL
 SELECT user, host, ssl_type FROM mysql.user;
```

### 3.3 审计和监控

```sql
 True-- 开启审计日志（企业版）
 True-- 安装审计插件后配置
 True-- 查看用户连接历史
 SELECT * FROM mysql.general_log WHERE command_type='Connect' ORDER BY event_time DESC LIMIT 100;
 True-- 监控长时间运行的查询
 SELECT * FROM information_schema.processlist WHERE Command != 'Sleep' AND Time > 60;
 True-- 查看锁等待
 SELECT * FROM information_schema.innodb_lock_waits;
 True-- 查看事务
 SELECT * FROM information_schema.innodb_trx;
```

## 4. 常见问题与解决方案

### 4.1 连接问题

| 问题                             | 原因                               | 解决方案                           |
| :------------------------------- | :--------------------------------- | :--------------------------------- |
| **无法连接到 MySQL 服务器**      | 网络问题、防火墙、服务未启动       | 检查网络、防火墙、启动 MySQL 服务  |
| **连接被拒绝 (Access Denied)**   | 用户名/密码错误、IP 不在允许范围内 | 检查凭据、查看用户允许的 host      |
| **连接超时**                     | 网络延迟、服务器负载高             | 检查网络、服务器资源、优化查询     |
| **Too many connections**         | 连接数超过最大限制                 | 增加 max_connections、优化连接使用 |
| **Lost connection during query** | 查询返回数据过大、网络问题         | 增加 max_allowed_packet、优化查询  |

### 4.2 权限问题

| 问题             | 原因                  | 解决方案                              |
| :--------------- | :-------------------- | :------------------------------------ |
| **访问被拒绝**   | 权限不足、主机限制    | 检查用户权限、修改授权                |
| **无法创建用户** | 缺少 CREATE USER 权限 | 使用 root 用户或授予 CREATE USER 权限 |
| **权限不生效**   | 未刷新权限            | 执行 `FLUSH PRIVILEGES`               |
| **外键约束失败** | 关联数据不存在        | 先插入/更新主表数据，再操作从表       |

### 4.3 性能问题

| 问题             | 原因                                 | 解决方案                           |
| :--------------- | :----------------------------------- | :--------------------------------- |
| **查询速度慢**   | 缺少索引、SQL 写法不当、服务器配置低 | 添加索引、重写 SQL、提升服务器配置 |
| **服务器负载高** | 并发过高、复杂查询、资源不足         | 使用连接池、优化查询、增加资源     |
| **内存使用过高** | buffer_pool 过大、连接数过多         | 调整配置、限制连接数               |
| **磁盘 IO 高**   | 大量写入、缺少索引、缓冲池不足       | 优化索引、增加缓冲池、使用 SSD     |

### 4.4 数据问题

| 问题           | 原因                       | 解决方案                             |
| :------------- | :------------------------- | :----------------------------------- |
| **数据丢失**   | 误删除、硬件故障、事务回滚 | 使用备份恢复、启用 binlog 恢复       |
| **数据不一致** | 事务处理不当、外键约束错误 | 检查事务逻辑、修复外键约束           |
| **表损坏**     | 服务器异常关闭、磁盘故障   | 使用 `REPAIR TABLE` 修复或从备份恢复 |
| **字符集乱码** | 字符集不一致               | 统一使用 utf8mb4                     |

## 5. 监控与维护

### 5.1 常用监控命令

```sql
 True-- 查看服务器状态
 SHOW STATUS; -- 所有状态变量
 SHOW GLOBAL STATUS; -- 全局状态
 SHOW VARIABLES; -- 所有配置变量
 SHOW GLOBAL VARIABLES;
 True-- 关键指标
 SHOW STATUS LIKE 'Threads_connected'; -- 当前连接数
 SHOW STATUS LIKE 'Max_used_connections'; -- 历史最大连接数
 SHOW STATUS LIKE 'Slow_queries'; -- 慢查询数量
 SHOW STATUS LIKE 'Innodb_row_lock%'; -- 锁等待情况
 SHOW STATUS LIKE 'Com_select'; -- 查询次数
 SHOW STATUS LIKE 'Com_insert'; -- 插入次数
 SHOW STATUS LIKE 'Com_update'; -- 更新次数
 SHOW STATUS LIKE 'Com_delete'; -- 删除次数
 True-- 查看进程
 SHOW PROCESSLIST;
 SHOW FULL PROCESSLIST;
 True-- 查看 InnoDB 状态
 SHOW ENGINE INNODB STATUS;
 True-- 查看所有表状态
 SHOW TABLE STATUS FROM database_name;
 True-- 查看索引使用情况
 SHOW INDEX FROM table_name;
```

### 5.2 定期维护任务

```sql
 True-- 分析表（更新统计信息）
 ANALYZE TABLE users;
 True-- 检查表
 CHECK TABLE users;
 True-- 修复表
 REPAIR TABLE users;
 True-- 优化表（整理碎片）
 OPTIMIZE TABLE users;
 True-- 重新生成表统计
 ANALYZE TABLE users;
 True-- 清理二进制日志
 PURGE BINARY LOGS BEFORE '2024-01-01 00:00:00';
 PURGE BINARY LOGS TO 'mysql-bin.000010';
 True-- 查看表碎片
 SELECT TABLE_NAME, Data_free FROM information_schema.tables WHERE Data_free > 0;
```

### 5.3 备份策略

```bash
 #!/bin/bash
 # 每日备份脚本示例
 backUP_DIR="/backup/mysql"
 DATE=$(date +%Y%m%d)
 MYSQL_USER="backup_user"
 MYSQL_PASS="backup_password"
 # 创建备份目录
 mkdir -p $BACKUP_DIR
 # 备份所有数据库
 mysqldump -u$MYSQL_USER -p$MYSQL_PASS --all-databases --routines --triggers --events > $BACKUP_DIR/all_db_$DATE.sql
 # 压缩备份
 gzip $BACKUP_DIR/all_db_$DATE.sql
 # 删除 7 天前的备份
 find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
 # 备份完成
 echo "Backup completed: $DATE"
```

---

### 更新日志 (Changelog)

- 2026-05-27: 拆分为独立文件，添加元数据，版本升级至 v4.0.0
- 2026-04-30: 大幅细化内容，添加性能优化详细配置、安全配置、监控维护和常见问题解决方案等
- 2026-04-05: 扩写内容，增加详细的性能优化策略、安全配置、监控维护和常见问题解决方案
