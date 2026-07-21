---
order: 93
title: 不可见索引
module: mysql
category: MySQL
difficulty: intermediate
description: MySQL不可见索引：索引可见性控制、优化器忽略、安全删除索引与灰度验证
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/JSON模式验证与聚合函数
  - mysql/复制与高可用
  - mysql/性能调优与安全
  - mysql/函数索引
prerequisites:
  - mysql/语法速查
---

## 1. 不可见索引概述

不可见索引（Invisible Index）对优化器不可见，但仍然被维护（INSERT/UPDATE/DELETE 仍更新索引）。

## 2. 语法

```sql
-- 创建不可见索引
CREATE INDEX idx_name ON employees(name) INVISIBLE;

-- 修改索引可见性
ALTER TABLE employees ALTER INDEX idx_name INVISIBLE;
ALTER TABLE employees ALTER INDEX idx_name VISIBLE;

-- 查看索引可见性
SELECT index_name, is_visible
FROM information_schema.statistics
WHERE table_name = 'employees';
```

## 3. 使用场景

### 3.1 安全删除索引

```sql
-- 步骤1：将索引设为不可见
ALTER TABLE employees ALTER INDEX idx_old INVISIBLE;

-- 步骤2：观察一段时间，确认无性能问题
-- 如果出现问题，快速恢复
ALTER TABLE employees ALTER INDEX idx_old VISIBLE;

-- 步骤3：确认安全后删除
DROP INDEX idx_old ON employees;
```

### 3.2 灰度测试新索引

```sql
-- 创建不可见的新索引
CREATE INDEX idx_new ON employees(dept_id, salary) INVISIBLE;

-- 特定会话测试
SET SESSION optimizer_switch = 'use_invisible_indexes=on';
EXPLAIN SELECT * FROM employees WHERE dept_id = 5 ORDER BY salary;
-- 可以使用新索引

-- 其他会话不受影响
```

## 4. 注意事项

```sql
-- 不可见索引仍被维护，写入开销不变
-- 主键索引不能设为不可见
-- UNIQUE 约束索引设为不可见后，约束仍然生效
```
