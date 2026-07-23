---
order: 63
title: MERGE语句增强
module: postgresql
category: PostgreSQL
difficulty: advanced
description: 'PostgreSQL MERGE语句增强：UPSERT、RETURNING与条件操作'
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/分区裁剪与分区连接
  - postgresql/高级SQL
  - postgresql/JSON表格函数
  - postgresql/全文检索
prerequisites:
  - postgresql/概述与安装配置
---

## 1. MERGE 语法

```sql
MERGE INTO target_table t
USING source_table s
ON t.key = s.key
WHEN MATCHED THEN
    UPDATE SET col = s.col
WHEN NOT MATCHED THEN
    INSERT (key, col) VALUES (s.key, s.col);
```

## 2. 条件操作

```sql
MERGE INTO employees e
USING new_employees n
ON e.id = n.id
WHEN MATCHED AND e.salary < n.salary THEN
    UPDATE SET salary = n.salary, updated_at = NOW()
WHEN MATCHED AND e.salary >= n.salary THEN
    DO NOTHING
WHEN NOT MATCHED THEN
    INSERT (id, name, salary) VALUES (n.id, n.name, n.salary);
```

## 3. RETURNING

```sql
-- MERGE with RETURNING
MERGE INTO employees e
USING (SELECT * FROM staging) s
ON e.id = s.id
WHEN MATCHED THEN
    UPDATE SET salary = s.salary
WHEN NOT MATCHED THEN
    INSERT (id, name, salary) VALUES (s.id, s.name, s.salary)
RETURNING
    merge_action() AS action,
    id, name, salary;
-- action: 'INSERT' 或 'UPDATE'
```

## 4. UPSERT 替代

```sql
-- 简单 UPSERT 仍可用 INSERT ON CONFLICT
INSERT INTO employees (id, name, salary)
VALUES (1, 'Alice', 50000)
ON CONFLICT (id) DO UPDATE SET salary = EXCLUDED.salary;
```
