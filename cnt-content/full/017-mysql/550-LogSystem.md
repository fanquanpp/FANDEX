---
order: 550
title: 日志系统
module: 'mysql'
category: 数据库
difficulty: intermediate
description: MySQL日志系统：错误日志、通用查询日志、慢查询日志的配置、查看与运维
author: fanquanpp
updated: '2026-09-12'
related:
  - 'mysql/500-RedoLog'
  - 'mysql/510-UndoLog'
  - 'mysql/560-LogicalBackup'
  - 'mysql/570-PhysicalBackup'
prerequisites:
  - 'mysql/160-View'
---

## 1. MySQL 日志体系

| 日志类型     | 用途               | 默认状态 |
| ------------ | ------------------ | -------- |
| 错误日志     | 启动/运行/关闭错误 | 开启     |
| 通用查询日志 | 所有SQL语句        | 关闭     |
| 慢查询日志   | 慢SQL语句          | 关闭     |
| 二进制日志   | 复制与恢复         | 关闭     |
| 中继日志     | 从库复制           | 从库开启 |

## 2. 错误日志

```sql
-- 查看错误日志位置
SHOW VARIABLES LIKE 'log_error';

-- 配置
SET GLOBAL log_error = '/var/log/mysql/error.log';
SET GLOBAL log_error_verbosity = 3;  -- 1=ERROR, 2=ERROR+WARNING, 3=ERROR+WARNING+NOTE

-- 查看错误日志
-- Linux: tail -f /var/log/mysql/error.log
-- MySQL 8.0:
SHOW VARIABLES LIKE 'log_error';
```

## 3. 通用查询日志

```sql
-- 记录所有SQL语句（性能影响大，通常关闭）
SET GLOBAL general_log = ON;
SET GLOBAL general_log_file = '/var/log/mysql/general.log';

-- 查看状态
SHOW VARIABLES LIKE 'general_log%';
```

## 4. 慢查询日志

```sql
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1;
SET GLOBAL log_queries_not_using_indexes = ON;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

## 5. 日志管理最佳实践

```sql
-- 1. 错误日志始终开启
-- 2. 通用查询日志仅在调试时开启
-- 3. 慢查询日志生产环境建议开启
-- 4. 使用 logrotate 管理日志文件大小
-- 5. 定期分析慢查询日志
```
## 系统变量查询

**基本写法：查看所有系统变量**
`SHOW VARIABLES [LIKE '<模式>'];`

```sql
-- 查看所有变量
SHOW VARIABLES;
-- 过滤查看 innodb 相关变量
SHOW VARIABLES LIKE 'innodb%';
```

**基本写法：查看单个变量**
`SHOW VARIABLES LIKE '<变量名>';`

```sql
-- 查看最大连接数
SHOW VARIABLES LIKE 'max_connections';
-- 查看默认存储引擎
SHOW VARIABLES LIKE 'default_storage_engine';
```

**基本写法：精确匹配变量**
`SELECT @@GLOBAL.<变量名>;` / `SELECT @@SESSION.<变量名>;`

```sql
-- 查看 GLOBAL 与 SESSION 作用域变量
SELECT @@GLOBAL.max_connections;
SELECT @@SESSION.autocommit;
-- 查看仅会话级变量
SELECT @@session.sql_mode;
```

**基本写法：information_schema 查询变量**
`SELECT * FROM performance_schema.global_variables WHERE variable_name LIKE '<模式>';`

```sql
-- 通过性能 schema 查询变量
SELECT variable_name, variable_value
FROM performance_schema.global_variables
WHERE variable_name LIKE 'innodb_buffer%';
```

---

## 系统变量设置

**基本写法：设置全局变量（运行时）**
`SET GLOBAL <变量名> = <值>;`

```sql
-- 动态调整最大连接数（重启失效）
SET GLOBAL max_connections = 500;
```

**基本写法：设置会话变量**
`SET SESSION <变量名> = <值>;`

```sql
-- 仅当前会话生效
SET SESSION sql_mode = 'STRICT_TRANS_TABLES';
SET autocommit = 0;
```

**基本写法：SET PERSIST 持久化（8.0+）**
`SET PERSIST <变量名> = <值>;`

```sql
-- 持久化到 mysqld-auto.cnf，重启仍生效
SET PERSIST max_connections = 500;
SET PERSIST_ONLY innodb_buffer_pool_size = 4294967296;  -- 仅重启生效
```

**基本写法：重置变量为默认值**
`SET PERSIST <变量名> = DEFAULT;`

```sql
-- 清除持久化配置恢复默认
SET PERSIST max_connections = DEFAULT;
```

---

## 状态查询

**基本写法：查看服务器状态**
`SHOW STATUS [LIKE '<模式>'];`

```sql
-- 查看所有状态变量
SHOW STATUS;
-- 查看连接相关状态
SHOW STATUS LIKE 'Threads%';
```

**基本写法：查看会话级状态**
`SHOW SESSION STATUS LIKE '<模式>';`

```sql
-- 仅查看当前会话状态
SHOW SESSION STATUS LIKE 'Bytes%';
```

**基本写法：查看全局状态**
`SHOW GLOBAL STATUS LIKE '<模式>';`

```sql
-- 查看全局累计状态
SHOW GLOBAL STATUS LIKE 'Uptime';
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool%';
```

**基本写法：性能 schema 查询状态**
`SELECT * FROM performance_schema.global_status WHERE variable_name LIKE '<模式>';`

```sql
-- 通过性能 schema 查询状态
SELECT variable_name, variable_value
FROM performance_schema.global_status
WHERE variable_name LIKE 'Threads_%';
```

---

## 常用监控查询

**基本写法：查看当前连接数**
`SHOW STATUS LIKE 'Threads_connected';`

```sql
-- 当前活跃连接数
SHOW STATUS LIKE 'Threads_connected';
-- 历史最大连接数
SHOW STATUS LIKE 'Max_used_connections';
```

**基本写法：查看缓冲池命中率**
`SHOW STATUS LIKE 'Innodb_buffer_pool_reads';`

```sql
-- 计算缓冲池命中率（reads 为磁盘读，read_requests 为总请求）
SHOW STATUS LIKE 'Innodb_buffer_pool_read_requests';
SHOW STATUS LIKE 'Innodb_buffer_pool_reads';
-- 命中率 = 1 - reads / read_requests
```

**基本写法：查看 QPS 与 TPS**
`SHOW STATUS LIKE 'Questions';`

```sql
-- Questions 为查询总数，Uptime 为运行秒数，QPS = Questions/Uptime
SHOW STATUS LIKE 'Questions';
SHOW STATUS LIKE 'Uptime';
-- Com_开头的为各命令执行次数
SHOW STATUS LIKE 'Com_select';
SHOW STATUS LIKE 'Com_insert';
```

---

## 字符集与时区

**基本写法：查看字符集变量**
`SHOW VARIABLES LIKE 'character_set%';`

```sql
-- 查看各环节字符集
SHOW VARIABLES LIKE 'character_set%';
-- 查看排序规则
SHOW VARIABLES LIKE 'collation%';
```

**基本写法：查看时区**
`SELECT @@global.time_zone, @@session.time_zone;`

```sql
-- 查看全局与会话时区
SELECT @@global.time_zone, @@session.time_zone;
-- 查看当前时间
SELECT NOW(), UTC_TIMESTAMP();
```

**基本写法：设置时区**
`SET GLOBAL time_zone = '<时区>';`

```sql
-- 设置全局时区
SET GLOBAL time_zone = '+08:00';
SET SESSION time_zone = '+08:00';
```

---

## 查看进程与锁

**基本写法：查看进程列表**
`SHOW PROCESSLIST;`

```sql
-- 查看当前所有连接与正在执行的 SQL
SHOW PROCESSLIST;
-- 完整查看（含完整 SQL 文本）
SHOW FULL PROCESSLIST;
```

**基本写法：查看 InnoDB 锁信息**
`SELECT * FROM performance_schema.data_locks;`

```sql
-- 8.0+ 通过 performance_schema 查看锁（替代旧版 information_schema.INNODB_LOCKS）
SELECT * FROM performance_schema.data_locks;
-- 查看锁等待
SELECT * FROM performance_schema.data_lock_waits;
```

**基本写法：查看 InnoDB 事务**
`SELECT * FROM information_schema.INNODB_TRX;`

```sql
-- 查看当前活跃事务
SELECT trx_id, trx_state, trx_started, trx_mysql_thread_id
FROM information_schema.INNODB_TRX;
```
