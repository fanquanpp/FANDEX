---
order: 520
title: 视图与物化视图语法速查手册
module: 'postgresql'
category: 数据库
difficulty: beginner
description: 视图与物化视图 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## 普通视图

**基本写法：创建视图**
`CREATE [OR REPLACE] VIEW <视图名> AS <SELECT 语句>;`

```sql
-- 创建用户概览视图
CREATE OR REPLACE VIEW v_user_summary AS
SELECT user_id, user_name, email, last_login
FROM users
WHERE status = 'active';
```

**基本写法：递归视图列名指定**
`CREATE VIEW <视图名> (<列1>, <列2>) AS <SELECT 语句>;`

```sql
-- 显式指定视图列名
CREATE VIEW v_orders (订单号, 客户, 金额) AS
SELECT order_id, customer_name, amount FROM orders;
```

**基本写法：可更新视图**
`CREATE VIEW <视图名> AS SELECT <列> FROM <表>;`

```sql
-- 简单视图可直接 INSERT/UPDATE/DELETE（需包含基表所有非空列）
CREATE VIEW v_active_users AS
SELECT id, name, email FROM users WHERE status = 'active';
-- 通过视图插入
INSERT INTO v_active_users (id, name, email) VALUES (100, '张三', 'z@e.com');
```

**基本写法：带安全屏障视图**
`CREATE VIEW <视图名> WITH (security_barrier) AS <SELECT>;`

```sql
-- 防止通过视图泄露 WHERE 条件数据（行安全增强）
CREATE VIEW v_user_data WITH (security_barrier) AS
SELECT id, name FROM users WHERE deleted_at IS NULL;
```

---

## 视图管理

**基本写法：查看视图定义**
`SELECT pg_get_viewdef('<视图名>'::regclass, true);`

```sql
-- 查看视图完整定义
SELECT pg_get_viewdef('v_user_summary'::regclass, true);
-- psql 元命令
\d+ v_user_summary
```

**基本写法：删除视图**
`DROP VIEW [IF EXISTS] <视图名> [, <视图2>] [CASCADE|RESTRICT];`

```sql
-- 安全删除视图
DROP VIEW IF EXISTS v_user_summary;
-- 级联删除依赖此视图的对象
DROP VIEW IF EXISTS v_orders CASCADE;
```

**基本写法：修改视图属主与模式**
`ALTER VIEW <视图名> OWNER TO <新属主>;`

```sql
-- 修改视图属主
ALTER VIEW v_user_summary OWNER TO app_user;
-- 修改视图所属模式
ALTER VIEW v_user_summary SET SCHEMA reporting;
```

---

## 物化视图创建

**基本写法：创建物化视图**
`CREATE MATERIALIZED VIEW <视图名> AS <SELECT 语句> [WITH [NO] DATA];`

```sql
-- 创建物化视图（预先计算并存储结果）
CREATE MATERIALIZED VIEW mv_daily_sales AS
SELECT date_trunc('day', order_time) AS day,
       SUM(amount) AS total,
       COUNT(*) AS order_count
FROM orders
GROUP BY 1;
-- 仅建结构不填充数据
CREATE MATERIALIZED VIEW mv_daily_sales AS
SELECT date_trunc('day', order_time), SUM(amount) FROM orders GROUP BY 1
WITH NO DATA;
```

**基本写法：指定存储参数与表空间**
`CREATE MATERIALIZED VIEW <视图名> WITH (<参数>) TABLESPACE <表空间> AS <SELECT>;`

```sql
-- 指定填充因子与表空间
CREATE MATERIALIZED VIEW mv_report WITH (fillfactor=80) TABLESPACE ssd
AS SELECT * FROM large_table WHERE year = 2024;
```

---

## 物化视图刷新

**基本写法：全量刷新**
`REFRESH MATERIALIZED VIEW <视图名>;`

```sql
-- 全量刷新（刷新期间阻塞查询）
REFRESH MATERIALIZED VIEW mv_daily_sales;
```

**基本写法：并发刷新（不阻塞）**
`REFRESH MATERIALIZED VIEW CONCURRENTLY <视图名>;`

```sql
-- 并发刷新（需物化视图有唯一索引）
CREATE UNIQUE INDEX idx_mv_daily_sales_day ON mv_daily_sales(day);
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales;
```

**基本写法：定时刷新物化视图**
`SELECT cron.schedule('<任务名>', '<cron 表达式>', 'REFRESH MATERIALIZED VIEW <视图>');`

```sql
-- 使用 pg_cron 扩展定时刷新（每小时）
SELECT cron.schedule('refresh_sales', '0 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales');
```

---

## 物化视图管理

**基本写法：查看物化视图信息**
`SELECT * FROM pg_matviews;`

```sql
-- 查看所有物化视图
SELECT matviewname, schemaname, ispopulated
FROM pg_matviews;
-- 查看是否已填充数据（ispopulated）
```

**基本写法：删除物化视图**
`DROP MATERIALIZED VIEW [IF EXISTS] <视图名> [CASCADE];`

```sql
-- 删除物化视图（数据与结构一起删除）
DROP MATERIALIZED VIEW IF EXISTS mv_daily_sales;
```

**基本写法：修改物化视图（受限）**
`ALTER MATERIALIZED VIEW <视图名> <选项>;`

```sql
-- 修改属主与存储参数（不能直接修改查询定义，需重建）
ALTER MATERIALIZED VIEW mv_daily_sales OWNER TO report_user;
ALTER MATERIALIZED VIEW mv_daily_sales SET (fillfactor = 90);
-- 重命名列
ALTER MATERIALIZED VIEW mv_daily_sales RENAME COLUMN total TO total_amount;
```

**基本写法：重建物化视图定义**
`DROP MATERIALIZED VIEW <旧视图>; CREATE MATERIALIZED VIEW <新视图> AS <新查询>;`

```sql
-- 修改查询定义需重建（推荐先建新视图再删旧）
CREATE MATERIALIZED VIEW mv_daily_sales_v2 AS
SELECT date_trunc('day', order_time), SUM(amount), MAX(amount)
FROM orders GROUP BY 1;
DROP MATERIALIZED VIEW mv_daily_sales;
ALTER MATERIALIZED VIEW mv_daily_sales_v2 RENAME TO mv_daily_sales;
```
