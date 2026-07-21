---
order: 66
title: 'GROUP-BY与ORDER-BY优化'
module: mysql
category: MySQL
difficulty: advanced
description: 'MySQL GROUP BY与ORDER BY优化：松散索引扫描、紧凑索引扫描、临时表与filesort优化'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/子查询优化
  - mysql/派生表优化
  - mysql/JOIN算法
  - mysql/事务隔离级别底层实现
prerequisites:
  - mysql/语法速查
---

## 1. GROUP BY 优化

### 1.1 使用索引避免临时表

```sql
-- 索引 (dept_id, name)
-- GROUP BY 可以利用索引排序
SELECT dept_id, COUNT(*) FROM employees GROUP BY dept_id;
-- Extra: Using index

-- 无索引时需要临时表
-- Extra: Using temporary; Using filesort
```

### 1.2 松散索引扫描（Loose Index Scan）

```sql
-- 适用于：GROUP BY 列有索引，且 MIN/MAX 聚合
-- 索引 (dept_id, salary)
SELECT dept_id, MIN(salary) FROM employees GROUP BY dept_id;
-- Extra: Using index for group-by

-- 松散索引扫描跳过索引中不需要的条目
-- 只读取每个 dept_id 的第一条（MIN）或最后一条（MAX）
```

### 1.3 紧凑索引扫描

```sql
-- 索引 (dept_id, name)
-- WHERE 条件和 GROUP BY 一起使用索引
SELECT dept_id, COUNT(*) FROM employees
WHERE dept_id > 5
GROUP BY dept_id;
-- 扫描索引的 dept_id > 5 部分
```

## 2. ORDER BY 优化

### 2.1 使用索引排序

```sql
-- 索引 (dept_id, salary)
-- ORDER BY 与索引顺序一致
SELECT * FROM employees WHERE dept_id = 5 ORDER BY salary;
-- Extra: Using index condition（无需 filesort）

-- ORDER BY 与索引顺序不一致
SELECT * FROM employees ORDER BY salary;
-- Extra: Using filesort
```

### 2.2 filesort 算法

| 算法     | 说明                                   |
| -------- | -------------------------------------- |
| 双路排序 | 读取行指针和排序列，排序后回表获取数据 |
| 单路排序 | 读取所有需要的列到内存，排序后直接输出 |

```sql
-- 控制 filesort 缓冲区
SET max_length_for_sort_data = 4096;  -- 超过此值使用双路排序
SET sort_buffer_size = 262144;        -- 排序缓冲区大小
```

## 3. GROUP BY + ORDER BY 组合优化

```sql
-- 索引 (dept_id, created_at)
-- GROUP BY + ORDER BY 使用同一索引
SELECT dept_id, COUNT(*) AS cnt
FROM orders
GROUP BY dept_id
ORDER BY dept_id;
-- Extra: Using index

-- GROUP BY 和 ORDER BY 列不同
SELECT dept_id, COUNT(*) AS cnt
FROM orders
GROUP BY dept_id
ORDER BY cnt DESC;
-- Extra: Using temporary; Using filesort
-- 需要临时表 + 额外排序
```
