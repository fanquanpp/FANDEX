---
order: 790
title: 事件调度器语法速查手册
module: 'mysql'
category: 数据库
difficulty: beginner
description: 事件调度器 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## 调度器开关

**基本写法：查看事件调度器状态**
`SHOW VARIABLES LIKE 'event_scheduler';`

```sql
-- 查看事件调度器是否开启
SHOW VARIABLES LIKE 'event_scheduler';
-- 输出: event_scheduler | ON / OFF
```

**基本写法：开启事件调度器**
`SET GLOBAL event_scheduler = ON;`

```sql
-- 全局开启事件调度器（运行时生效，重启失效）
SET GLOBAL event_scheduler = ON;
```

**基本写法：配置文件持久开启**
`event_scheduler = ON`

```ini
# my.cnf 中配置，重启后持久生效
[mysqld]
event_scheduler = ON
```

---

## 创建事件

**基本写法：一次性事件**
`CREATE EVENT <事件名> ON SCHEDULE AT <时间点> DO <SQL 语句>;`

```sql
-- 在指定时间执行一次
CREATE EVENT e_clean_logs
ON SCHEDULE AT '2024-12-31 23:59:59'
DO DELETE FROM logs WHERE created_at < NOW() - INTERVAL 30 DAY;
```

**基本写法：当前时间延迟执行**
`CREATE EVENT <事件名> ON SCHEDULE AT CURRENT_TIMESTAMP + INTERVAL <数值> <单位> DO <SQL>;`

```sql
-- 1 小时后执行一次
CREATE EVENT e_notify
ON SCHEDULE AT CURRENT_TIMESTAMP + INTERVAL 1 HOUR
DO UPDATE users SET notified = 1 WHERE last_login < NOW() - INTERVAL 7 DAY;
```

**基本写法：周期事件**
`CREATE EVENT <事件名> ON SCHEDULE EVERY <数值> <单位> DO <SQL 语句>;`

```sql
-- 每天执行一次清理
CREATE EVENT e_daily_clean
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO CALL sp_clean_expired();
```

**基本写法：指定起止时间的周期事件**
`CREATE EVENT <事件名> ON SCHEDULE EVERY <间隔> STARTS <开始> ENDS <结束> DO <SQL>;`

```sql
-- 每小时执行，限定起止时间
CREATE EVENT e_hourly_stat
ON SCHEDULE EVERY 1 HOUR
STARTS '2024-01-01 00:00:00'
ENDS '2024-12-31 23:59:59'
DO CALL sp_calc_hourly_stats();
```

**基本写法：复合语句事件**
`CREATE EVENT <事件名> ON SCHEDULE <调度> DO BEGIN <语句1>; <语句2>; END`

```sql
-- 执行多条语句需用 BEGIN...END 包裹并重置分隔符
DELIMITER //
CREATE EVENT e_multi ON SCHEDULE EVERY 1 DAY
DO BEGIN
  DELETE FROM logs WHERE created_at < NOW() - INTERVAL 30 DAY;
  UPDATE stats SET count = 0 WHERE stat_date = CURDATE();
END //
DELIMITER ;
```

---

## 事件管理

**基本写法：查看事件**
`SHOW EVENTS [FROM <数据库名>] [LIKE '<模式>'];`

```sql
-- 查看当前库所有事件
SHOW EVENTS;
-- 查看指定库事件
SHOW EVENTS FROM mydb LIKE 'e_%';
```

**基本写法：查看事件定义**
`SHOW CREATE EVENT <事件名>;`

```sql
-- 查看事件创建语句
SHOW CREATE EVENT e_daily_clean\G
```

**基本写法：查看事件元数据**
`SELECT * FROM information_schema.EVENTS WHERE event_name = '<事件名>';`

```sql
-- 查询事件状态与调度信息
SELECT event_name, last_executed, status, interval_value, interval_field
FROM information_schema.EVENTS
WHERE event_schema = 'mydb';
```

---

## 修改与删除

**基本写法：禁用/启用事件**
`ALTER EVENT <事件名> {DISABLE|ENABLE};`

```sql
-- 临时禁用事件
ALTER EVENT e_daily_clean DISABLE;
-- 重新启用
ALTER EVENT e_daily_clean ENABLE;
```

**基本写法：修改事件调度**
`ALTER EVENT <事件名> ON SCHEDULE <新调度> DO <SQL>;`

```sql
-- 修改执行周期为每周一次
ALTER EVENT e_daily_clean
ON SCHEDULE EVERY 1 WEEK STARTS CURRENT_TIMESTAMP
DO CALL sp_clean_expired();
```

**基本写法：重命名事件**
`ALTER EVENT <旧事件名> RENAME TO <新事件名>;`

```sql
-- 重命名事件
ALTER EVENT e_daily_clean RENAME TO e_weekly_clean;
```

**基本写法：删除事件**
`DROP EVENT [IF EXISTS] <事件名>;`

```sql
-- 安全删除事件
DROP EVENT IF EXISTS e_weekly_clean;
```
