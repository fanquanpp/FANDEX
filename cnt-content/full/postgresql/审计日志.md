---
order: 81
title: 审计日志
module: postgresql
category: PostgreSQL
difficulty: intermediate
description: PostgreSQL审计日志：pgAudit扩展、日志配置、审计策略与合规要求
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/行级安全策略
  - postgresql/数据加密存储
  - postgresql/序列与自增列
  - postgresql/生成列
prerequisites:
  - postgresql/概述与安装配置
---

## 1. pgAudit 扩展

```sql
CREATE EXTENSION pgaudit;
```

```ini
# postgresql.conf
shared_preload_libraries = 'pgaudit'

# 审计级别
pgaudit.log = 'all'           -- 所有操作
pgaudit.log = 'read,write'    -- 读写操作
pgaudit.log = 'ddl'           -- DDL操作
pgaudit.log = 'role'          -- 角色操作

# 审计日志格式
pgaudit.log_line_prefix = '%t [%p]: '
pgaudit.log_relation = on     -- 记录表名
```

## 2. 审计日志示例

```
2026-06-14 10:30:00 UTC [12345]: LOG:  AUDIT: SESSION,1,1,WRITE,INSERT,,,
    INSERT INTO employees (name, salary) VALUES ('Alice', 50000);,<none>
2026-06-14 10:30:01 UTC [12345]: LOG:  AUDIT: SESSION,1,2,READ,SELECT,,,
    SELECT * FROM employees WHERE dept_id = 5;,<none>
```

## 3. 对象级审计

```sql
-- 审计特定表
ALTER TABLE employees SET (pgaudit.log = 'read,write');

-- 审计特定角色
ALTER ROLE admin SET pgaudit.log = 'all';
```

## 4. 原生日志审计

```ini
# 不使用pgAudit时的替代方案
log_statement = 'all'          -- 记录所有SQL
log_statement = 'ddl'          -- 只记录DDL
log_statement = 'mod'          -- 记录DML+DDL
log_min_duration_statement = 0 -- 记录所有语句及执行时间
```
