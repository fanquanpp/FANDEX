---
order: 76
title: 日志系统
module: mysql
category: MySQL
difficulty: intermediate
description: MySQL日志系统：错误日志、通用查询日志、慢查询日志的配置、查看与运维
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/重做日志
  - mysql/撤销日志
  - mysql/逻辑备份
  - mysql/物理备份
prerequisites:
  - mysql/语法速查
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
