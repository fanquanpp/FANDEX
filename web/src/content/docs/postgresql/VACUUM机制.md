---
order: 53
title: VACUUM机制
module: postgresql
category: PostgreSQL
difficulty: advanced
description: 'PostgreSQL VACUUM机制：自动清理、FREEZE、可见性映射与空间回收'
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/锁机制
  - postgresql/死锁检测与处理
  - postgresql/事务ID回卷预防
  - postgresql/索引类型
prerequisites:
  - postgresql/概述与安装配置
---

## 1. VACUUM 概述

PostgreSQL 的 MVCC 机制产生死行（dead tuples），VACUUM 负责清理这些死行，回收空间。

## 2. 普通 VACUUM

```sql
-- 标记死行空间为可重用（不回收磁盘空间）
VACUUM employees;

-- 分析并更新统计信息
VACUUM ANALYZE employees;

-- VACUUM FULL：重建表，回收磁盘空间（锁表）
VACUUM FULL employees;
```

## 3. 自动清理（Autovacuum）

```sql
-- 配置 autovacuum
ALTER SYSTEM SET autovacuum = ON;  -- 默认开启
ALTER SYSTEM SET autovacuum_max_workers = 4;
ALTER SYSTEM SET autovacuum_naptime = '1min';

-- 触发阈值
-- autovacuum_vacuum_scale_factor = 0.2（死行超过20%触发）
-- autovacuum_vacuum_threshold = 50（最少50行死行）

-- 按表配置
ALTER TABLE employees SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);
```

## 4. FREEZE 与事务ID回卷

```sql
-- 事务ID回卷预防
-- 当事务ID接近 2^31 时，需要 FREEZE

-- 手动 FREEZE
VACUUM FREEZE employees;

-- 配置
ALTER SYSTEM SET autovacuum_freeze_max_age = 200000000;
ALTER SYSTEM SET vacuum_freeze_min_age = 50000000;
ALTER SYSTEM SET vacuum_freeze_table_age = 150000000;
```

## 5. 可见性映射（Visibility Map）

```
每个数据页对应一个可见性映射位：
- all-visible：该页所有行对所有事务可见
- all-frozen：该页所有行已冻结

VACUUM 利用可见性映射跳过不需要清理的页
```

## 6. 监控

```sql
-- 查看表膨胀
SELECT schemaname, relname,
       n_live_tup, n_dead_tup,
       last_vacuum, last_autovacuum,
       last_analyze, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- 查看需要 VACUUM 的表
SELECT relname, age(relfrozenxid) AS xid_age
FROM pg_class
WHERE relfrozenxid IS NOT NULL
ORDER BY xid_age DESC;
```
