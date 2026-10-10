---
order: 880
title: MySQL 配置与运维
module: 'mysql'
category: 数据库
difficulty: intermediate
description: 参数调优、日志管理、备份恢复与监控。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'mysql/810-JSONTypeJSONTable'
  - 'mysql/460-TransactionLockMechanism'
  - 'mysql/890-MySQLQuickLookup'
  - 'mysql/900-AppLayerDbAccessPatterns'
prerequisites:
  - 'mysql/160-View'
---

## 知识点地图

- **知识类别**：MySQL 的「配置与运维」主线——参数调优（配置文件与内存参数）、日志管理、备份策略、监控与定期维护。本篇是运维模板文：给「接手一台服务器该配什么、日常该看什么、周期该做什么」一套可抄的底稿。**分工边界**：`sql_mode` 与系统变量的三层作用域（GLOBAL/SESSION/PERSIST）已由专篇 [服务器 SQL 模式与系统变量](/mysql/855-ServerSqlModeAndVariables) 承载，本篇不写第二份；Buffer Pool 的内存参数与命中率监控在本篇「Buffer Pool 内存专题」一节；事件与锁的可观测（谁在干什么）见 [系统库与可观测](/mysql/335-ObservabilitySystemSchemas)。
- **解决什么问题**：新环境交付时参数从哪抄；上线后「连接数涨、临时表落盘、排序溢出」这些渐进恶化的指标去哪看、调哪个参数；周期性的备份与维护任务怎么脚本化。
- **什么时候用到**：服务器交付与容量变更时；季度巡检时；出事后复盘「当初该配什么」。执行计划的归因（为什么慢）见 [EXPLAIN 详解](/mysql/320-EXPLAINDetailed)，本篇管「环境层面的账」。

## 前置知识

建议先阅读以下内容再进入本文：

- [视图语法速查手册](/mysql/160-View)

## 1. 基本操作 (Basic Ops)

### 1.1 数据库操作详解

#### 1.1.1 创建数据库

```sql
 SHOW DATABASES;
 CREATE DATABASE mydb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
 CREATE DATABASE IF NOT EXISTS mydb;
 CREATE DATABASE mydb;
 DROP DATABASE IF EXISTS mydb;
 use mydb;
 SELECT DATABASE();
 SHOW CREATE DATABASE mydb;
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
 CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  email VARCHAR(100) NOT NULL COMMENT '邮箱',
  password VARCHAR(255) NOT NULL COMMENT '密码（加密存储）',
  age INT UNSIGNED COMMENT '年龄',
  status TINYINT DEFAULT 1 COMMENT '状态：1-正常，0-禁用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
 )
 DESCRIBE users;
 SHOW COLUMNS FROM users;
 SHOW CREATE TABLE users;
 SHOW TABLES;
 SHOW TABLE STATUS FROM mydb;
```

#### 1.2.2 修改表结构

```sql
 ALTER TABLE users ADD COLUMN phone VARCHAR(20) AFTER email;
 ALTER TABLE users ADD COLUMN last_login DATETIME AFTER updated_at;
 ALTER TABLE users MODIFY COLUMN age INT UNSIGNED NOT NULL DEFAULT 0;
 ALTER TABLE users CHANGE COLUMN username user_name VARCHAR(50) NOT NULL;
 ALTER TABLE users DROP COLUMN phone;
 ALTER TABLE users ADD INDEX idx_email (email);
 ALTER TABLE users ADD UNIQUE INDEX idx_username (username);
 ALTER TABLE orders ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id);
 ALTER TABLE users RENAME TO customers;
 RENAME TABLE users TO customers, orders TO purchase_orders;
 DROP TABLE IF EXISTS users;
 TRUNCATE TABLE users;
```

#### 1.2.3 表结构设计示例

```sql
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
 )
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
 )
```

### 1.3 数据操作详解

#### 1.3.1 插入数据

```sql
 INSERT INTO users (username, email, password, age) VALUES ('张三', 'zhangsan@example.com', 'encrypted_pass', 25);
 INSERT INTO users (username, email) VALUES ('李四', 'lisi@example.com');
 INSERT INTO users (username, email, password, age) VALUES
 ('王五', 'wangwu@example.com', 'pass1', 30),
 ('赵六', 'zhaoliu@example.com', 'pass2', 28),
 ('钱七', 'qianqi@example.com', 'pass3', 35);
 INSERT INTO users (username, email, age)
 SELECT username, email, age FROM old_users WHERE status = 1;
 INSERT INTO users SET username='孙八', email='sunba@example.com', age=27;
 INSERT INTO users (id, username, email) VALUES (1, '张三', 'new_email@example.com')
 ON DUPLICATE KEY UPDATE email='new_email@example.com', updated_at=NOW();
 replace INTO users (id, username, email) VALUES (1, '张三', 'new_email@example.com');
 SELECT LAST_INSERT_ID();
```

#### 1.3.2 查询数据

```sql
 SELECT * FROM users;
 SELECT id, username, email FROM users;
 SELECT id AS user_id, username AS name FROM users;
 SELECT DISTINCT status FROM users;
 SELECT COUNT(DISTINCT status) FROM users;
 SELECT * FROM users LIMIT 10;
 SELECT * FROM users LIMIT 10 OFFSET 20;
 SELECT * FROM users LIMIT 20, 10;
 SELECT username, price, quantity, price * quantity AS total FROM order_items;
 SELECT * FROM users WHERE age > 25 AND status = 1;
 SELECT * FROM users WHERE age BETWEEN 20 AND 30;
 SELECT * FROM users WHERE username LIKE '张%';
 SELECT * FROM users WHERE email IN ('a@example.com', 'b@example.com');
 SELECT * FROM users ORDER BY created_at DESC;
 SELECT * FROM users ORDER BY age ASC, created_at DESC;
 SELECT status, COUNT(*) AS count FROM users GROUP BY status;
 SELECT status, AVG(age) AS avg_age FROM users GROUP BY status HAVING AVG(age) > 25;
 SELECT u.username, o.order_no, o.total_amount
 from users u
 INNER JOIN orders o ON u.id = o.user_id
 WHERE o.status = 2;
```

#### 1.3.3 更新数据

```sql
 UPDATE users SET age = 26 WHERE id = 1;
 UPDATE users SET age = age + 1 WHERE age < 30;
 UPDATE users SET age = 27, email = 'new_email@example.com', updated_at = NOW() WHERE id = 1;
 UPDATE users SET status = 0 WHERE created_at < '2024-01-01';
 START TRANSACTION;
 UPDATE accounts SET balance = balance - 100 WHERE id = 1;
 UPDATE accounts SET balance = balance + 100 WHERE id = 2;
 commit;
 SELECT * FROM users WHERE id = 1 FOR UPDATE;
 UPDATE users SET age = 26 WHERE id = 1;
```

#### 1.3.4 删除数据

```sql
 delete FROM users WHERE id = 1;
 delete FROM users WHERE status = 0 AND created_at < '2024-01-01';
 delete FROM users;
 TRUNCATE TABLE users;
 DROP TABLE IF EXISTS users;
 delete FROM orders WHERE user_id = 1;
 ALTER TABLE orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
 SELECT * FROM users WHERE id = 1;
 delete FROM users WHERE id = 1;
```

### 1.4 用户与权限详解

#### 1.4.1 用户管理

```sql
 CREATE USER 'newuser'@'localhost' IDENTIFIED BY 'password';
 CREATE USER 'newuser'@'%' IDENTIFIED BY 'password'; -- 允许远程连接
 CREATE USER 'newuser'@'192.168.1.%' IDENTIFIED BY 'password'; -- 允许特定网段
 ALTER USER 'newuser'@'localhost' IDENTIFIED BY 'new_password';
 SET PASSWORD FOR 'newuser'@'localhost' = 'new_password';
 DROP USER 'newuser'@'localhost';
 SELECT user, host FROM mysql.user;
 SHOW GRANTS FOR 'newuser'@'localhost';
 RENAME USER 'olduser'@'localhost' TO 'newuser'@'localhost';
```

#### 1.4.2 权限管理

```sql
 GRANT ALL PRIVILEGES ON mydb.* TO 'newuser'@'localhost';
 FLUSH PRIVILEGES;
 GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'newuser'@'localhost';
 GRANT ALL PRIVILEGES ON *.* TO 'admin'@'localhost';
 GRANT CREATE USER ON *.* TO 'admin'@'localhost';
 GRANT RELOAD ON *.* TO 'admin'@'localhost';
 GRANT BACKUP ADMIN ON *.* TO 'admin'@'localhost';
 GRANT SELECT, INSERT ON mydb.orders TO 'newuser'@'localhost';
 GRANT EXECUTE ON PROCEDURE mydb.sp_name TO 'newuser'@'localhost';
 REVOKE ALL PRIVILEGES ON mydb.* FROM 'newuser'@'localhost';
 REVOKE DELETE ON mydb.* FROM 'newuser'@'localhost';
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
 SET GLOBAL max_connections = 500;
 SET GLOBAL wait_timeout = 600;
 SET GLOBAL interactive_timeout = 600;
 SHOW STATUS LIKE 'Threads_connected';
 SHOW VARIABLES LIKE 'max_connections';
```

#### 2.1.3 InnoDB 配置

```ini
 [mysqld]
 # InnoDB 配置
 innodb_buffer_pool_size=4G # 建议为服务器内存的 70%
 innodb_redo_log_capacity=1G # redo 总容量（8.0.30+，在线可调；innodb_log_file_size 已在 8.4 移除）
 innodb_log_buffer_size=64M
 innodb_flush_log_at_trx_commit=1 # 1-最安全，2-性能好，0-最快但可能丢数据
 innodb_flush_method=O_DIRECT # Linux 下推荐，减少系统缓存
 innodb_file_per_table=1 # 每个表独立的表空间
 innodb_io_capacity=4000 # 根据磁盘 IO 能力设置
```

### 2.2 查询优化详解

#### 2.2.1 索引优化

```sql
 CREATE INDEX idx_username ON users(username);
 CREATE INDEX idx_email_status ON users(email, status);
 CREATE INDEX idx_status_created ON users(status, created_at);
```

#### 2.2.2 SQL 语句优化

```sql
 SELECT * FROM users WHERE YEAR(created_at) = 2024;
 SELECT * FROM users WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';
 SELECT * FROM orders WHERE MONTH(order_time) = 1;
 SELECT * FROM orders WHERE order_time >= '2024-01-01' AND order_time < '2024-02-01';
 EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
```

#### 2.2.3 慢查询优化示例

```sql
 SET GLOBAL slow_query_log = 'ON';
 SET GLOBAL long_query_time = 1;
 SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
 SHOW FULL PROCESSLIST;
 EXPLAIN SELECT u.username, o.total_amount
 from users u
 INNER JOIN orders o ON u.id = o.user_id
 WHERE o.created_at > '2024-01-01';
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
 CREATE TABLE sales (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  sale_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  region VARCHAR(50)
 )
  PARTITION p2020 VALUES LESS THAN (2021),
  PARTITION p2021 VALUES LESS THAN (2022),
  PARTITION p2022 VALUES LESS THAN (2023),
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION pmax VALUES LESS THAN MAXVALUE
 )
 CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(50)
 )
 CREATE TABLE products (
  id INT PRIMARY KEY,
  category_id INT,
  name VARCHAR(50)
 )
  PARTITION p_electronics VALUES IN (1, 2, 3),
  PARTITION p_clothing VALUES IN (4, 5, 6),
  PARTITION p_other VALUES IN (NULL)
 )
```

## 3. 安全配置详解

### 3.1 基础安全配置

```sql
 ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewStrongPass@123';
 delete FROM mysql.user WHERE User = '';
 delete FROM mysql.user WHERE User = 'root' AND Host != 'localhost';
 FLUSH PRIVILEGES;
 CREATE USER 'app_user'@'%' IDENTIFIED BY 'AppPass@2024';
 GRANT SELECT, INSERT, UPDATE, DELETE ON production_db.* TO 'app_user'@'%';
 FLUSH PRIVILEGES;
 CREATE USER 'app_user'@'192.168.1.%' IDENTIFIED BY 'AppPass@2024';
 CREATE USER 'app_user'@'10.%.%.%' IDENTIFIED BY 'AppPass@2024';
```

### 3.2 SSL/TLS 配置

```sql
 SHOW VARIABLES LIKE 'have_ssl';
 SHOW VARIABLES LIKE 'have_openssl';
 ALTER USER 'root'@'localhost' REQUIRE SSL;
 SELECT user, host, ssl_type FROM mysql.user;
```

### 3.3 审计和监控

```sql
 SELECT * FROM mysql.general_log WHERE command_type='Connect' ORDER BY event_time DESC LIMIT 100;
 SELECT * FROM information_schema.processlist WHERE Command != 'Sleep' AND Time > 60;
 SELECT * FROM sys.innodb_lock_waits;   -- 锁等待（8.0 移除旧表 information_schema.INNODB_LOCK_WAITS）
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
 SHOW STATUS; -- 所有状态变量
 SHOW GLOBAL STATUS; -- 全局状态
 SHOW VARIABLES; -- 所有配置变量
 SHOW GLOBAL VARIABLES;
 SHOW STATUS LIKE 'Threads_connected'; -- 当前连接数
 SHOW STATUS LIKE 'Max_used_connections'; -- 历史最大连接数
 SHOW STATUS LIKE 'Slow_queries'; -- 慢查询数量
 SHOW STATUS LIKE 'Innodb_row_lock%'; -- 锁等待情况
 SHOW STATUS LIKE 'Com_select'; -- 查询次数
 SHOW STATUS LIKE 'Com_insert'; -- 插入次数
 SHOW STATUS LIKE 'Com_update'; -- 更新次数
 SHOW STATUS LIKE 'Com_delete'; -- 删除次数
 SHOW PROCESSLIST;
 SHOW FULL PROCESSLIST;
 SHOW ENGINE INNODB STATUS;
 SHOW TABLE STATUS FROM database_name;
 SHOW INDEX FROM table_name;
```

### 5.2 定期维护任务

```sql
 ANALYZE TABLE users;
 CHECK TABLE users;
 REPAIR TABLE users;
 OPTIMIZE TABLE users;
 ANALYZE TABLE users;
 PURGE BINARY LOGS BEFORE '2024-01-01 00:00:00';
 PURGE BINARY LOGS TO 'mysql-bin.000010';
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


## Buffer Pool 内存专题

Buffer Pool 是 InnoDB 最重要的内存区域，缓存数据页和索引页——内存参数的账要从它算起。

### 大小规划与在线调整

```sql
-- 查看当前大小与单位
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';

-- 专用数据库服务器建议物理内存的 60%-80%（16GB 内存配 10GB）
SET GLOBAL innodb_buffer_pool_size = 10737418240;   -- 10GB，5.7+ 在线调整

-- 调整以 chunk 为单位发生（默认 128MB）
SHOW VARIABLES LIKE 'innodb_buffer_pool_chunk_size';

-- 多实例降低内部争用：Buffer Pool >= 1GB 时按每实例约 1GB 分
SHOW VARIABLES LIKE 'innodb_buffer_pool_instances';
SET GLOBAL innodb_buffer_pool_instances = 8;
```

逐段解释规划逻辑：60%-80% 的上限来自「给操作系统页缓存与其他进程留余量」——内存被 OS 换出（swap）的代价远大于少几 GB 缓存；在线调整按 chunk 粒度进行（扩容是把新 chunk 挂进池），大调整建议低峰期做；`instances` 只在池大于 1GB 时有意义（小池多实例反而碎）。

### 预热与转储

```sql
-- 关闭时保存热点页清单，启动时自动加载（默认都开）
SHOW VARIABLES LIKE 'innodb_buffer_pool_dump_at_shutdown';
SHOW VARIABLES LIKE 'innodb_buffer_pool_load_at_startup';

-- 手动触发（重启演练、维护窗口后快速回温）
SET GLOBAL innodb_buffer_pool_dump_now = ON;
SET GLOBAL innodb_buffer_pool_load_now = ON;

-- 看进度
SHOW STATUS LIKE 'Innodb_buffer_pool_load_status';
```

为什么值得单独一节：冷启动的 Buffer Pool 命中率从零爬升，高峰期业务在「每查一次都是磁盘读」的状态下跑几分钟到几十分钟——转储/加载机制把热点页清单（默认每秒约 0.1% 的页）写盘，重启后直接恢复，是重启演练的标准配套。

### 命中率监控

```sql
-- 命中率 = 1 - Innodb_buffer_pool_reads / Innodb_buffer_pool_read_requests
SELECT
    ROUND((1 - (SELECT Variable_value + 0 FROM performance_schema.global_status
                WHERE Variable_name = 'Innodb_buffer_pool_reads') /
              (SELECT Variable_value + 0 FROM performance_schema.global_status
               WHERE Variable_name = 'Innodb_buffer_pool_read_requests')) * 100, 3)
    AS hit_rate_pct;

-- 哪些表占着缓存（缓存被谁挤占的答案）
SELECT OBJECT_SCHEMA AS db, OBJECT_NAME AS tbl, COUNT(*) AS pages_cached
FROM information_schema.INNODB_BUFFER_PAGE
GROUP BY OBJECT_SCHEMA, OBJECT_NAME
ORDER BY pages_cached DESC LIMIT 20;
```

读法纪律：命中率 > 99% 是健康基线，< 95% 先查「工作集是否大于池」（表清单看谁占页）再谈扩容；`INNODB_BUFFER_PAGE` 查询本身会扫描全部页元数据（大池上要锁内部结构，可能造成短暂卡顿）——**只在低峰期跑**，别在业务高峰对生产库做这个查询。

## 动手实践

练习一（预测题）：16GB 内存、专库专用的服务器，以下哪个 Buffer Pool 配置最合理？为什么？

```text
A. innodb_buffer_pool_size = 1G,   instances = 16
B. innodb_buffer_pool_size = 10G,  instances = 8
C. innodb_buffer_pool_size = 16G,  instances = 1
```

提示：给谁留内存？多实例的意义是什么？

<details>
<summary>参考实现</summary>

**B**。A 的 1G 太小（缓存工作集根本装不下）且 16 个实例分 1G 每个只有 64MB（实例数只有在池 >= 1GB 时才有正面意义）；C 把内存全吃光——操作系统页缓存（日志写入、文件系统元数据）与 mysqld 其他内存结构（每连接排序缓冲、临时表）没有余量，触发 swap 后性能断崖。B 按 60%-80% 上限取 10GB、按每实例约 1GB 配 8 实例，两条纪律都满足。
</details>

练习二（实战题）：写一个「内存参数总账」查询脚本：给定 max_connections 与 sort_buffer_size/join_buffer_size/tmp_table_size 的会话级配置，估算「满连接时这些每连接缓冲的理论最大内存占用」，加上 buffer_pool 与 global 级缓冲，给出总内存预算公式。说明为什么「每连接参数 x max_connections」是上界而不是实际值。

提示：sort_buffer_size 是「需要时才分配、用完释放」的会话缓冲；实际值取决于并发排序量。

<details>
<summary>参考实现</summary>

```sql
SELECT
  @@max_connections                                     AS max_conn,
  @@sort_buffer_size   / 1024 / 1024                    AS sort_mb_per_conn,
  @@join_buffer_size   / 1024 / 1024                    AS join_mb_per_conn,
  @@tmp_table_size     / 1024 / 1024                    AS tmp_mb_per_conn,
  @@innodb_buffer_pool_size / 1024 / 1024 / 1024        AS bp_gb;
```

预算公式：`总内存 = Buffer Pool + (sort_mb + join_mb + tmp_mb) x max_connections + 全局日志/结构缓冲 + OS 余量`。是上界的理由：sort/join buffer 是**按需惰性分配**的——只有真正执行排序/连接的会话在那一刻才分配，空闲连接不占；tmp_table_size 是内存临时表的单表上限而非预分配。所以真实占用远低于上界，但**容量规划必须按上界**——业务高峰 + 一条失控的批量查询同时触发满量分配时，OS 只看得到总账。这也是「调大每连接缓冲前先算 max_connections 的乘积」这条纪律的来源。
</details>

练习三（找错题）：这份巡检脚本有一处危险调用与一处口径问题，先找再修：

```bash
#!/bin/bash
# 每分钟巡检
mysql -e "SELECT OBJECT_SCHEMA, OBJECT_NAME, COUNT(*)
          FROM information_schema.INNODB_BUFFER_PAGE
          GROUP BY 1,2 ORDER BY 3 DESC LIMIT 20"
mysql -e "SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read%'" | awk '{...计算命中率...}'
```

提示：INNODB_BUFFER_PAGE 的查询对运行中的服务器做什么？

<details>
<summary>参考实现</summary>

```bash
#!/bin/bash
# 命中率：高频采集安全（只是读计数器）
mysql -e "SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_read%'"
# INNODB_BUFFER_PAGE：低峰期手动跑（它会扫描全部缓冲页元数据，大池上短暂持锁）
#   -> 从每分钟自动巡检改为：crontab 每周日凌晨一次 + 文档注明低峰约束
```

两处问题：其一，INNODB_BUFFER_PAGE 的 GROUP BY 全表聚合要遍历池内每一个页的元数据，大 Buffer Pool（数十 GB）上会造成可感知的停顿——官方文档明确警告生产环境勿频繁查询，放进每分钟巡检是自伤；其二，命中率口径：两次采样点之间服务若重启，累计计数器清零会使「后采样 - 前采样」出现负值——脚本要做采样对齐或对负值弃判。修复方向：高频部分只留计数器类（SHOW STATUS 便宜安全），重的结构扫描（INNODB_BUFFER_PAGE、DATA_FREE 大表扫描）降频到维护窗口。
</details>

## 自我检查

- 能给出专库服务器的 Buffer Pool 配置（大小比例 + 实例数）并说出两条规划纪律；
- 能解释缓冲池转储/加载在重启演练中的作用与默认开关状态；
- 能写出命中率公式并说出 < 95% 时的排查顺序（先看谁占页，再谈扩容）；
- 能算出「每连接缓冲 x max_connections」的内存上界并解释它为什么是上界；
- 能说出 sql_mode 与变量作用域的归属篇（855）并避免在本篇重复；
- 能区分「高频安全的计数器采集」与「低峰才能跑的结构扫描」两类巡检。
