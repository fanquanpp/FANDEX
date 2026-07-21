---
order: 93
title: 性能调优与安全
module: mysql
category: MySQL
difficulty: advanced
description: MySQL性能调优：缓冲池配置、慢查询分析、performance_schema、安全认证、角色管理、在线DDL与XA事务
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/复制与高可用
  - mysql/不可见索引
  - mysql/函数索引
  - mysql/存储过程与函数
prerequisites:
  - mysql/语法速查
---

## 1. 缓冲池配置与优化

### 1.1 Buffer Pool 大小规划

Buffer Pool 是 InnoDB 最重要的内存区域，缓存数据页和索引页，直接影响查询性能。

```sql
-- 查看当前 Buffer Pool 大小
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';

-- 设置 Buffer Pool 大小（建议物理内存的 60%-80%）
-- 专用数据库服务器（16GB 内存）
SET GLOBAL innodb_buffer_pool_size = 10737418240;  -- 10GB

-- 动态调整（MySQL 5.7+ 支持在线调整）
-- 调整以 chunk 为单位，chunk 大小 = innodb_buffer_pool_chunk_size
SHOW VARIABLES LIKE 'innodb_buffer_pool_chunk_size';  -- 默认128MB

-- 查看 Buffer Pool 实例数
SHOW VARIABLES LIKE 'innodb_buffer_pool_instances';
-- 建议：Buffer Pool >= 1GB 时，每个实例管理 1GB
SET GLOBAL innodb_buffer_pool_instances = 8;
```

### 1.2 Buffer Pool 预热与转储

```sql
-- 启用 Buffer Pool 转储（关闭时保存热点页列表）
SET GLOBAL innodb_buffer_pool_dump_at_shutdown = ON;  -- 默认ON

-- 启动时自动加载热点页
SET GLOBAL innodb_buffer_pool_load_at_startup = ON;   -- 默认ON

-- 手动转储/加载 Buffer Pool
SET GLOBAL innodb_buffer_pool_dump_now = ON;
SET GLOBAL innodb_buffer_pool_load_now = ON;

-- 查看转储/加载进度
SHOW STATUS LIKE 'Innodb_buffer_pool_dump_status';
SHOW STATUS LIKE 'Innodb_buffer_pool_load_status';
```

### 1.3 Buffer Pool 命中率监控

```sql
-- 计算命中率
SELECT
    Variable_name, Variable_value
FROM performance_schema.global_status
WHERE Variable_name IN (
    'Innodb_buffer_pool_read_requests',
    'Innodb_buffer_pool_reads'
);

-- 命中率 = 1 - Innodb_buffer_pool_reads / Innodb_buffer_pool_read_requests
-- 目标：> 99%
-- 低于 95% 需要增大 Buffer Pool 或优化查询

-- 查看各表的缓冲使用情况
SELECT
    OBJECT_SCHEMA AS db,
    OBJECT_NAME AS table_name,
    COUNT(*) AS pages_cached,
    SUM(IF(DATA_SIZE > 0, 1, 0)) AS pages_with_data
FROM performance_schema.innodb_buffer_page
GROUP BY OBJECT_SCHEMA, OBJECT_NAME
ORDER BY pages_cached DESC
LIMIT 20;
```

## 2. 日志文件与刷新策略

### 2.1 Redo Log 配置

```sql
-- 查看 redo log 配置
SHOW VARIABLES LIKE 'innodb_log%';

-- MySQL 8.0.30+ 动态调整 redo log 容量
ALTER INSTANCE SET GLOBAL innodb_redo_log_capacity = 4294967296;  -- 4GB

-- redo log 容量建议：
-- 写密集型：每秒写入量的 1-2 小时容量
-- 一般场景：1-2GB 足够

-- 查看 redo log 使用情况
SHOW VARIABLES LIKE 'innodb_redo_log_capacity';

-- 监控 redo log 刷新频率
SHOW GLOBAL STATUS LIKE 'Innodb_os_log_written';
-- 两次采样差值 / 时间间隔 = 每秒写入量
```

### 2.2 刷盘策略

```sql
-- Redo Log 刷盘策略（最关键参数之一）
-- 0: 每秒刷盘（可能丢失1秒数据，性能最好）
-- 1: 每次事务提交刷盘（最安全，默认，性能最差）
-- 2: 每次提交写入OS缓存，每秒fsync（折中方案）
SET GLOBAL innodb_flush_log_at_trx_commit = 1;  -- 生产环境推荐1

-- 数据页刷盘策略
-- 0: 脏页由后台线程定期刷新
-- 1: 每次事务提交刷新脏页（最安全但性能极差）
-- 2: 每次提交写入OS缓存，由OS决定何时fsync
SET GLOBAL innodb_flush_method = 'O_DIRECT';  -- Linux推荐，绕过OS缓存

-- IO 容量配置
SET GLOBAL innodb_io_capacity = 10000;          -- SSD 环境
SET GLOBAL innodb_io_capacity_max = 20000;       -- 最大刷新速率
SET GLOBAL innodb_flush_sync = OFF;              -- 避免 checkpoint 影响查询
```

## 3. 慢查询日志分析

### 3.1 慢查询日志配置

```sql
-- 启用慢查询日志
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1;            -- 超过1秒记录（默认10秒）
SET GLOBAL log_queries_not_using_indexes = ON;  -- 记录未使用索引的查询
SET GLOBAL min_examined_row_limit = 100;   -- 至少扫描100行才记录

-- 慢查询日志输出位置
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
-- 或写入表（方便查询分析）
SET GLOBAL log_output = 'TABLE';

-- 查看慢查询日志表
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;

-- 查看慢查询配置
SHOW VARIABLES LIKE 'slow_query%';
SHOW VARIABLES LIKE 'long_query_time';
```

### 3.2 mysqldumpslow 分析工具

```bash
# 按查询时间排序，显示前10条
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log

# 按查询次数排序
mysqldumpslow -s c -t 10 /var/log/mysql/slow.log

# 按平均查询时间排序
mysqldumpslow -s at -t 10 /var/log/mysql/slow.log

# 按锁定时间排序
mysqldumpslow -s l -t 10 /var/log/mysql/slow.log

# 按返回记录数排序
mysqldumpslow -s r -t 10 /var/log/mysql/slow.log

# 常用参数：
# -s: 排序方式 (t=时间, c=次数, l=锁时间, r=返回记录, at=平均时间)
# -t: 显示前N条
# -g: 匹配模式（类似grep）
mysqldumpslow -s t -t 5 -g 'SELECT' /var/log/mysql/slow.log
```

### 3.3 慢查询优化案例

```sql
-- 案例1：全表扫描 → 添加索引
-- 慢查询：
SELECT * FROM orders WHERE customer_id = 1001;
-- EXPLAIN: type=ALL, rows=1000000

-- 优化：
CREATE INDEX idx_customer ON orders(customer_id);
-- EXPLAIN: type=ref, rows=50

-- 案例2：索引列使用函数 → 函数索引
-- 慢查询：
SELECT * FROM users WHERE YEAR(created_at) = 2024;
-- EXPLAIN: type=ALL

-- 优化：
CREATE INDEX idx_year ON users ((YEAR(created_at)));
-- 或改写查询：
SELECT * FROM users
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';

-- 案例3：OR 条件导致索引失效 → UNION 优化
-- 慢查询：
SELECT * FROM orders WHERE customer_id = 1001 OR status = 'urgent';

-- 优化：
SELECT * FROM orders WHERE customer_id = 1001
UNION
SELECT * FROM orders WHERE status = 'urgent' AND customer_id != 1001;
```

## 4. Performance Schema

### 4.1 启用与配置

```sql
-- 查看 Performance Schema 是否启用
SHOW VARIABLES LIKE 'performance_schema';

-- 启用（需重启）
-- my.cnf: performance_schema=ON

-- 查看可用的事件类型
SELECT * FROM performance_schema.setup_instruments
WHERE NAME LIKE 'statement/%' LIMIT 10;

-- 启用/禁用特定监控项
UPDATE performance_schema.setup_instruments
SET ENABLED = 'YES', TIMED = 'YES'
WHERE NAME LIKE 'statement/%';

UPDATE performance_schema.setup_consumers
SET ENABLED = 'YES'
WHERE NAME IN ('events_waits_current', 'events_statements_current');
```

### 4.2 语句分析

```sql
-- 查看执行时间最长的 SQL
SELECT
    DIGEST_TEXT AS query,
    COUNT_STAR AS exec_count,
    ROUND(SUM_TIMER_WAIT / 1000000000000, 3) AS total_time_sec,
    ROUND(AVG_TIMER_WAIT / 1000000000, 3) AS avg_time_ms,
    ROUND(MAX_TIMER_WAIT / 1000000000, 3) AS max_time_ms,
    SUM_ROWS_EXAMINED AS total_rows_examined,
    SUM_ROWS_SENT AS total_rows_sent
FROM performance_schema.events_statements_summary_by_digest
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;

-- 查看全表扫描的 SQL
SELECT
    DIGEST_TEXT AS query,
    COUNT_STAR AS exec_count,
    SUM_NO_INDEX_USED AS no_index_count,
    SUM_NO_GOOD_INDEX_USED AS no_good_index_count
FROM performance_schema.events_statements_summary_by_digest
WHERE SUM_NO_INDEX_USED > 0
ORDER BY SUM_NO_INDEX_USED DESC
LIMIT 10;
```

### 4.3 等待事件分析

```sql
-- 查看最耗时的等待事件
SELECT
    EVENT_NAME,
    COUNT_STAR AS wait_count,
    ROUND(SUM_TIMER_WAIT / 1000000000, 3) AS total_time_ms,
    ROUND(AVG_TIMER_WAIT / 1000000, 3) AS avg_time_us
FROM performance_schema.events_waits_summary_global_by_event_name
WHERE COUNT_STAR > 0
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 10;

-- 查看文件 I/O 等待
SELECT
    EVENT_NAME,
    COUNT_READ, COUNT_WRITE,
    ROUND(SUM_TIMER_READ / 1000000000, 3) AS read_time_ms,
    ROUND(SUM_TIMER_WRITE / 1000000000, 3) AS write_time_ms
FROM performance_schema.file_summary_by_event_name
WHERE COUNT_READ > 0 OR COUNT_WRITE > 0
ORDER BY SUM_TIMER_READ + SUM_TIMER_WRITE DESC
LIMIT 10;
```

## 5. Sys Schema

### 5.1 Sys Schema 概述

Sys Schema 基于 Performance Schema 和 Information Schema 提供更友好的视图，简化性能分析。

```sql
-- 查看最耗时的 SQL（按总时间）
SELECT * FROM sys.statements_with_runtimes_in_95th_percentile\G

-- 查看全表扫描的 SQL
SELECT * FROM sys.statements_with_full_table_scans\G

-- 查看使用临时表的 SQL
SELECT * FROM sys.statements_with_temp_tables\G

-- 查看 Buffer Pool 各表使用情况
SELECT * FROM sys.innodb_buffer_stats_by_table
ORDER BY pages DESC LIMIT 10;

-- 查看各表等待情况
SELECT * FROM sys.io_global_by_file_by_bytes
ORDER BY total DESC LIMIT 10;
```

### 5.2 常用 Sys Schema 视图

```sql
-- 查看冗余索引
SELECT * FROM sys.schema_redundant_indexes\G

-- 查看未使用的索引
SELECT * FROM sys.schema_unused_indexes;

-- 查看索引使用统计
SELECT * FROM sys.schema_index_statistics
ORDER BY rows_selected DESC LIMIT 10;

-- 查看会话连接信息
SELECT * FROM sys.session
WHERE command != 'Daemon'
ORDER BY current_statement_latency DESC;

-- 查看内存使用
SELECT * FROM sys.memory_global_by_current_bytes
ORDER BY current_alloc DESC LIMIT 10;

-- 查看进程列表（增强版）
SELECT conn_id, user, db, command, current_statement,
       statement_latency, lock_latency
FROM sys.session
WHERE command = 'Query'
ORDER BY statement_latency DESC;
```

## 6. 索引优化提示

### 6.1 USE INDEX / FORCE INDEX / IGNORE INDEX

```sql
-- USE INDEX：建议优化器使用指定索引（优化器可能忽略）
SELECT * FROM orders USE INDEX (idx_customer_date)
WHERE customer_id = 1001 AND order_date >= '2024-01-01';

-- FORCE INDEX：强制使用指定索引
SELECT * FROM orders FORCE INDEX (idx_customer_date)
WHERE customer_id = 1001;

-- IGNORE INDEX：忽略指定索引
SELECT * FROM orders IGNORE INDEX (idx_status)
WHERE customer_id = 1001 OR status = 'shipped';

-- 多索引选择
SELECT * FROM orders USE INDEX (idx_customer, idx_date)
WHERE customer_id = 1001 OR order_date >= '2024-01-01';
```

### 6.2 优化器开关

```sql
-- 查看优化器开关
SHOW VARIABLES LIKE 'optimizer_switch';

-- 禁用索引合并
SET SESSION optimizer_switch = 'index_merge=off';

-- 启用 MRR (Multi-Range Read)
SET SESSION optimizer_switch = 'mrr=on,mrr_cost_based=off';

-- 启用 ICP (Index Condition Pushdown)
SET SESSION optimizer_switch = 'index_condition_pushdown=on';

-- 启用 BKA (Batched Key Access)
SET SESSION optimizer_switch = 'batched_key_access=on';
```

## 7. 安全机制

### 7.1 caching_sha2_password 认证

MySQL 8.0+ 默认使用 `caching_sha2_password` 认证插件，比旧的 `mysql_native_password` 更安全。

```sql
-- 查看用户认证方式
SELECT user, host, plugin FROM mysql.user;

-- 创建使用 caching_sha2_password 的用户
CREATE USER 'app_user'@'%' IDENTIFIED WITH caching_sha2_password BY 'StrongP@ss123!';

-- 修改已有用户的认证方式
ALTER USER 'old_user'@'%' IDENTIFIED WITH caching_sha2_password BY 'NewP@ss456!';

-- 连接时需要 SSL 或 RSA 公钥
-- JDBC 连接参数：allowPublicKeyRetrieval=true&useSSL=true

-- 兼容旧客户端（不推荐用于生产）
ALTER USER 'legacy_user'@'%' IDENTIFIED WITH mysql_native_password BY 'password';
```

### 7.2 角色管理

```sql
-- 创建角色
CREATE ROLE 'app_read', 'app_write', 'app_admin';

-- 为角色授权
GRANT SELECT ON app_db.* TO 'app_read';
GRANT SELECT, INSERT, UPDATE ON app_db.* TO 'app_write';
GRANT ALL ON app_db.* TO 'app_admin';

-- 创建用户并赋予角色
CREATE USER 'reader'@'%' IDENTIFIED BY 'ReaderP@ss1!';
CREATE USER 'writer'@'%' IDENTIFIED BY 'WriterP@ss1!';
CREATE USER 'admin_user'@'%' IDENTIFIED BY 'AdminP@ss1!';

GRANT 'app_read' TO 'reader'@'%';
GRANT 'app_write' TO 'writer'@'%';
GRANT 'app_admin' TO 'admin_user'@'%';

-- 用户激活角色
SET ROLE 'app_read';

-- 设置默认角色（登录时自动激活）
ALTER USER 'reader'@'%' DEFAULT ROLE 'app_read';
ALTER USER 'writer'@'%' DEFAULT ROLE 'app_write';

-- 查看角色授权
SHOW GRANTS FOR 'reader'@'%';
SHOW GRANTS FOR 'reader'@'%' USING 'app_read';

-- 撤销角色
REVOKE 'app_write' FROM 'writer'@'%';

-- 删除角色
DROP ROLE 'app_admin';
```

### 7.3 密码策略与过期

```sql
-- 查看密码策略
SHOW VARIABLES LIKE 'validate_password%';
-- validate_password.policy: 0=LOW, 1=MEDIUM, 2=STRONG
-- validate_password.length: 最小密码长度
-- validate_password.mixed_case_count: 大小写字母数
-- validate_password.number_count: 数字数
-- validate_password.special_char_count: 特殊字符数

-- 设置密码策略
SET GLOBAL validate_password.policy = 1;    -- MEDIUM
SET GLOBAL validate_password.length = 12;

-- 设置密码过期
CREATE USER 'temp_user'@'%' IDENTIFIED BY 'TempP@ss1!' PASSWORD EXPIRE INTERVAL 90 DAY;
ALTER USER 'app_user'@'%' PASSWORD EXPIRE INTERVAL 180 DAY;

-- 立即过期（强制用户下次登录修改密码）
ALTER USER 'app_user'@'%' PASSWORD EXPIRE;

-- 永不过期
ALTER USER 'system_user'@'%' PASSWORD EXPIRE NEVER;

-- 修改密码
ALTER USER 'app_user'@'%' IDENTIFIED BY 'NewStrongP@ss2!';
```

### 7.4 账户锁

```sql
-- 创建时锁定账户
CREATE USER 'locked_user'@'%' IDENTIFIED BY 'P@ss123!' ACCOUNT LOCK;

-- 锁定已有账户
ALTER USER 'suspicious_user'@'%' ACCOUNT LOCK;

-- 解锁账户
ALTER USER 'locked_user'@'%' ACCOUNT UNLOCK;

-- 查看账户锁定状态
SELECT user, host, account_locked FROM mysql.user;

-- 登录失败锁定（MySQL 8.0+）
CREATE USER 'app_user'@'%' IDENTIFIED BY 'P@ss123!'
FAILED_LOGIN_ATTEMPTS 3
PASSWORD_LOCK_TIME 1;  -- 失败3次后锁定1天

ALTER USER 'app_user'@'%'
FAILED_LOGIN_ATTEMPTS 5
PASSWORD_LOCK_TIME UNBOUNDED;  -- 永久锁定，需管理员解锁
```

### 7.5 SSL 加密连接

```sql
-- 查看 SSL 配置
SHOW VARIABLES LIKE '%ssl%';

-- 强制用户使用 SSL 连接
CREATE USER 'secure_user'@'%' IDENTIFIED BY 'P@ss123!' REQUIRE SSL;

-- 要求客户端提供有效证书
CREATE USER 'cert_user'@'%' IDENTIFIED BY 'P@ss123!' REQUIRE X509;

-- 指定证书颁发者
ALTER USER 'cert_user'@'%' REQUIRE ISSUER '/C=CN/ST=Beijing/O=MyOrg/CN=MyCA';

-- 指定证书主题
ALTER USER 'cert_user'@'%' REQUIRE SUBJECT '/C=CN/ST=Beijing/O=MyOrg/CN=app_user';

-- 查看 SSL 连接状态
SELECT * FROM performance_schema.threads
WHERE CONNECTION_TYPE = 'SSL/TLS';

-- 查看当前连接的 SSL 信息
STATUS;
-- 或
SHOW SESSION STATUS LIKE 'Ssl%';
```

### 7.6 防火墙插件

```sql
-- 安装 MySQL Enterprise Firewall
INSTALL PLUGIN mysql_firewall SONAME 'mysql_firewall.so';
INSTALL PLUGIN mysql_firewall_users SONAME 'mysql_firewall.so';
INSTALL PLUGIN mysql_firewall_whitelist SONAME 'mysql_firewall.so';

-- 创建防火墙账户
CREATE USER 'fw_admin'@'localhost' IDENTIFIED BY 'FwP@ss123!';
GRANT ALL ON mysql_firewall.* TO 'fw_admin'@'localhost';

-- 注册应用用户的防火墙配置
CALL mysql.sp_set_firewall_mode('app_user@%', 'RECORDING');

-- 应用执行正常查询后，将模式切换为保护模式
CALL mysql.sp_set_firewall_mode('app_user@%', 'PROTECTING');

-- 查看防火墙规则
SELECT * FROM mysql.firewall_whitelist;

-- 查看防火墙拦截记录
SELECT * FROM mysql.firewall_users;
```

## 8. 在线 DDL

### 8.1 在线 DDL 算法

```sql
-- INPLACE：不拷贝全表数据，允许并发 DML（默认优先选择）
ALTER TABLE orders ADD COLUMN remark VARCHAR(200),
ALGORITHM=INPLACE, LOCK=NONE;

-- INSTANT：仅修改元数据，最快（MySQL 8.0.12+）
ALTER TABLE orders ADD COLUMN note VARCHAR(100),
ALGORITHM=INSTANT;

-- COPY：拷贝全表数据，期间锁表
ALTER TABLE orders MODIFY COLUMN amount DECIMAL(15,2),
ALGORITHM=COPY;

-- 查看支持的算法
ALTER TABLE orders ADD COLUMN test_col INT,
ALGORITHM=DEFAULT;  -- 自动选择最优算法
```

### 8.2 INSTANT DDL 支持的操作

```sql
-- 支持 INSTANT 的操作（MySQL 8.0.29+ 扩展）
ALTER TABLE orders ADD COLUMN new_col VARCHAR(50);           -- 添加列（末尾或任意位置）
ALTER TABLE orders DROP COLUMN old_col;                       -- 删除列
ALTER TABLE orders RENAME COLUMN old_name TO new_name;        -- 重命名列
ALTER TABLE orders MODIFY COLUMN status VARCHAR(30);          -- 修改列定义（部分情况）

-- 不支持 INSTANT，需 INPLACE
ALTER TABLE orders ADD INDEX idx_status (status);             -- 添加索引
ALTER TABLE orders DROP INDEX idx_status;                     -- 删除索引
ALTER TABLE orders CHANGE COLUMN old_col new_col INT;         -- 修改列名和类型

-- 监控 DDL 进度
SELECT * FROM performance_schema.setup_instruments
WHERE NAME LIKE 'stage/alter%';

ALTER TABLE large_table ADD COLUMN new_col INT,
ALGORITHM=INPLACE, LOCK=NONE;

-- 另一个会话查看进度
SELECT STAGE, STAGE_INFO, WORK_COMPLETED, WORK_ESTIMATED
FROM performance_schema.events_stages_current
WHERE EVENT_NAME LIKE 'stage/alter%';
```

## 9. 生成列与降序索引

### 9.1 生成列 (Generated Column)

```sql
-- 虚拟生成列：不占用存储空间，查询时计算
CREATE TABLE products (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    price DECIMAL(10, 2),
    discount_rate DECIMAL(3, 2),
    discounted_price DECIMAL(10, 2) AS (price * (1 - discount_rate)) VIRTUAL
);

-- 存储生成列：占用存储空间，插入/更新时计算
CREATE TABLE users (
    id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    full_name VARCHAR(101) AS (CONCAT(first_name, ' ', last_name)) STORED
);

-- 为生成列创建索引
CREATE INDEX idx_full_name ON users (full_name);

-- 使用生成列简化 JSON 查询
CREATE TABLE events (
    id INT PRIMARY KEY,
    payload JSON,
    event_type VARCHAR(50) AS (JSON_UNQUOTE(payload->'$.type')) STORED,
    event_time DATETIME AS (payload->>'$.timestamp') STORED
);

CREATE INDEX idx_event_type ON events (event_type);
SELECT * FROM events WHERE event_type = 'login';
-- 比直接查询 JSON 路径更高效
```

### 9.2 降序索引

```sql
-- MySQL 8.0+ 真正支持降序索引
CREATE TABLE access_logs (
    id BIGINT PRIMARY KEY,
    user_id INT,
    access_time DATETIME,
    action VARCHAR(50),
    INDEX idx_user_time (user_id ASC, access_time DESC)
);

-- 降序索引优化 ORDER BY DESC 查询
SELECT * FROM access_logs
WHERE user_id = 1001
ORDER BY access_time DESC
LIMIT 50;
-- 使用 idx_user_time 索引，无需 filesort

-- 对比：如果索引是 (user_id, access_time ASC)
-- 上述查询需要反向扫描或 filesort

-- 多列混合排序
CREATE INDEX idx_region_date_amount ON sales (
    region ASC,
    sale_date DESC,
    amount DESC
);

SELECT * FROM sales
WHERE region = 'East'
ORDER BY sale_date DESC, amount DESC
LIMIT 100;
-- 完美匹配降序索引，避免排序
```

## 10. 原子 DDL

### 10.1 原子 DDL 特性

MySQL 8.0 引入原子 DDL，DDL 操作要么完全成功，要么完全回滚，不会留下残留的元数据或文件。

```sql
-- 原子 DDL 示例
CREATE TABLE test_table (
    id INT PRIMARY KEY,
    name VARCHAR(100)
);
-- 如果创建失败（如表已存在），不会留下任何残留

-- 原子 DROP TABLE
DROP TABLE IF EXISTS table1, table2, table3;
-- 要么全部删除，要么都不删除（不会出现删了 table1 但 table2 删除失败的情况）

-- 原子 ALTER TABLE
ALTER TABLE orders
ADD COLUMN new_col VARCHAR(50),
ADD INDEX idx_new_col (new_col);
-- 如果添加索引失败，添加列也会回滚

-- 查看原子 DDL 支持的存储引擎
SELECT ENGINE, SUPPORT FROM information_schema.ENGINES
WHERE ENGINE = 'InnoDB';
```

## 11. XA 分布式事务

### 11.1 XA 事务基础

XA 事务遵循两阶段提交协议（2PC），用于跨多个资源管理器（如多个数据库、消息队列）的分布式事务。

```sql
-- XA 事务语法
-- 阶段1：启动并执行事务
XA START 'txn_001';
UPDATE account_a SET balance = balance - 500 WHERE id = 1;
XA END 'txn_001';

-- 阶段2：准备提交
XA PREPARE 'txn_001';
-- 此时事务已准备好提交，但尚未提交
-- 即使系统崩溃，恢复后也可继续提交

-- 阶段3：提交或回滚
XA COMMIT 'txn_001';   -- 提交
-- 或
XA ROLLBACK 'txn_001'; -- 回滚
```

### 11.2 跨库 XA 事务

```sql
-- 应用层面协调跨库 XA 事务
-- 数据库A：
XA START 'transfer_001';
UPDATE db_a.accounts SET balance = balance - 500 WHERE user_id = 1;
XA END 'transfer_001';
XA PREPARE 'transfer_001';

-- 数据库B：
XA START 'transfer_001';
UPDATE db_b.accounts SET balance = balance + 500 WHERE user_id = 2;
XA END 'transfer_001';
XA PREPARE 'transfer_001';

-- 两个数据库都 PREPARE 成功后，分别提交
-- 数据库A：XA COMMIT 'transfer_001';
-- 数据库B：XA COMMIT 'transfer_001';

-- 如果任一数据库 PREPARE 失败，全部回滚
-- 数据库A：XA ROLLBACK 'transfer_001';
-- 数据库B：XA ROLLBACK 'transfer_001';
```

### 11.3 XA 事务恢复

```sql
-- 查看处于 PREPARE 状态的 XA 事务
XA RECOVER;

-- 输出示例：
-- +----------+-------------+--------------+-----------+
-- | formatID | gtrid_length | bqual_length | data      |
-- +----------+-------------+--------------+-----------+
-- |        1 |           9 |            0 | txn_001   |
-- +----------+-------------+--------------+-----------+

-- 崩溃恢复后提交悬空事务
XA COMMIT 'txn_001';

-- 或回滚悬空事务
XA ROLLBACK 'txn_001';

-- XA 事务监控
SELECT * FROM performance_schema.events_transactions_current
WHERE STATE = 'PREPARED';
```

### 11.4 XA 事务注意事项

```sql
-- XA 事务的限制
-- 1. 不支持嵌套事务
-- 2. PREPARE 后连接断开，事务会保持 PREPARED 状态
-- 3. 长时间 PREPARED 的事务会持有锁，阻塞其他事务

-- 查看长时间 PREPARED 的 XA 事务
XA RECOVER;
-- 检查 data 列中的事务ID，确认是否需要提交或回滚

-- 设置 XA 事务超时（应用层面控制）
-- 建议在应用层设置超时机制，避免事务长时间挂起

-- XA 与复制的兼容性
-- MySQL 5.7+ 支持在复制拓扑中使用 XA 事务
-- 但需要确保 gtid_mode=ON 且 enforce_gtid_consistency=ON
```

## 12. 综合调优检查清单

### 12.1 服务器级别调优

```sql
-- 1. Buffer Pool 命中率 > 99%
SELECT (1 - (SELECT Variable_value FROM performance_schema.global_status
    WHERE Variable_name = 'Innodb_buffer_pool_reads') /
    (SELECT Variable_value FROM performance_schema.global_status
    WHERE Variable_name = 'Innodb_buffer_pool_read_requests')) * 100
    AS buffer_pool_hit_rate;

-- 2. 连接数配置
SHOW VARIABLES LIKE 'max_connections';         -- 最大连接数
SHOW STATUS LIKE 'Threads_connected';           -- 当前连接数
SHOW STATUS LIKE 'Max_used_connections';        -- 历史最大连接数

-- 3. 临时表使用
SHOW STATUS LIKE 'Created_tmp%';
-- Created_tmp_disk_tables / Created_tmp_tables < 5%
-- 过高需增大 tmp_table_size 和 max_heap_table_size

-- 4. 排序效率
SHOW STATUS LIKE 'Sort%';
-- Sort_merge_passes 过高需增大 sort_buffer_size
SET GLOBAL sort_buffer_size = 4194304;  -- 4MB
```

### 12.2 查询级别调优

```sql
-- 1. 定期分析慢查询
SELECT * FROM sys.statements_with_runtimes_in_95th_percentile\G

-- 2. 检查冗余索引
SELECT * FROM sys.schema_redundant_indexes\G

-- 3. 检查未使用索引
SELECT * FROM sys.schema_unused_indexes;

-- 4. 更新表统计信息
ANALYZE TABLE orders, products, customers;

-- 5. 检查表碎片
SELECT TABLE_NAME, DATA_FREE / 1024 / 1024 AS fragment_mb
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'app_db' AND DATA_FREE > 0
ORDER BY DATA_FREE DESC;

-- 6. 优化碎片化表
ALTER TABLE orders ENGINE=InnoDB;  -- 重建表，消除碎片
OPTIMIZE TABLE orders;              -- 等价于 ALTER TABLE ... ENGINE=InnoDB
```
