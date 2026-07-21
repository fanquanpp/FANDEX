---
order: 58
title: 索引提示与强制索引
module: mysql
category: MySQL
difficulty: intermediate
description: 'MySQL索引提示：USE INDEX、FORCE INDEX、IGNORE INDEX的语法、场景与注意事项'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/全文索引
  - mysql/前缀索引
  - mysql/索引统计信息与直方图
  - mysql/SQL函数与高级查询
prerequisites:
  - mysql/语法速查
---

## 1. 索引提示概述

MySQL 提供索引提示（Index Hints）来影响优化器的索引选择。

## 2. 三种索引提示

### 2.1 USE INDEX

```sql
-- 建议优化器使用指定索引（优化器可能忽略）
SELECT * FROM employees USE INDEX (idx_dept) WHERE dept_id = 5;

-- 建议多个索引
SELECT * FROM employees USE INDEX (idx_dept, idx_name)
WHERE dept_id = 5 AND name = 'Alice';
```

### 2.2 FORCE INDEX

```sql
-- 强制使用指定索引（优化器必须使用）
SELECT * FROM employees FORCE INDEX (idx_dept) WHERE dept_id = 5;

-- 强制主键索引
SELECT * FROM employees FORCE INDEX (PRIMARY) WHERE id > 100;
```

### 2.3 IGNORE INDEX

```sql
-- 忽略指定索引
SELECT * FROM employees IGNORE INDEX (idx_dept) WHERE dept_id = 5;
-- 优化器不会考虑 idx_dept
```

## 3. 索引提示的作用范围

```sql
-- FOR JOIN：仅影响 JOIN 查找
SELECT * FROM employees e USE INDEX FOR JOIN (idx_dept)
JOIN departments d ON e.dept_id = d.id;

-- FOR ORDER BY：仅影响排序
SELECT * FROM employees USE INDEX FOR ORDER BY (idx_salary)
ORDER BY salary DESC;

-- FOR GROUP BY：仅影响分组
SELECT dept_id, COUNT(*) USE INDEX FOR GROUP BY (idx_dept)
FROM employees GROUP BY dept_id;
```

## 4. 使用场景

```sql
-- 场景1：优化器选择了错误的索引
-- 数据分布变化导致统计信息不准确
SELECT * FROM orders FORCE INDEX (idx_created_at)
WHERE created_at > '2026-01-01';

-- 场景2：避免全表扫描
SELECT * FROM large_table FORCE INDEX (idx_status)
WHERE status = 'rare_value';

-- 场景3：调试和性能对比
-- 对比不同索引的性能
SELECT * FROM t USE INDEX (idx_a) WHERE a = 1;
SELECT * FROM t USE INDEX (idx_b) WHERE a = 1;
```

## 5. 注意事项

```sql
-- 索引提示是临时方案，应优先解决根本问题
-- 1. 更新统计信息：ANALYZE TABLE
-- 2. 优化查询语句
-- 3. 调整索引设计

-- 索引提示在表结构变更后可能失效
-- 定期审查使用索引提示的查询
```
