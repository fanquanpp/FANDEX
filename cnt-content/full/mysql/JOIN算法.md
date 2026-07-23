---
order: 67
title: JOIN算法
module: mysql
category: MySQL
difficulty: advanced
description: 'MySQL JOIN算法：Nested Loop Join、Block Nested Loop、Hash Join的原理、适用场景与优化'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/派生表优化
  - 'mysql/GROUP-BY与ORDER-BY优化'
  - mysql/事务隔离级别底层实现
  - mysql/MVCC原理
prerequisites:
  - mysql/语法速查
---

## 1. JOIN 算法概述

MySQL 支持多种 JOIN 算法，优化器根据表大小、索引和条件选择最优算法。

## 2. Nested Loop Join（NLJ）

### 2.1 原理

```
for each row in outer_table:
    for each row in inner_table:
        if match_condition:
            output combined row
```

```sql
-- 驱动表：departments，被驱动表：employees
SELECT * FROM departments d JOIN employees e ON d.id = e.dept_id;

-- 执行过程：
-- 1. 扫描 departments 表的每一行
-- 2. 对每行，使用 idx_employees_dept_id 索引查找 employees
-- 3. 如果有索引：Index Nested Loop Join
-- 4. 如果无索引：Block Nested Loop Join
```

### 2.2 Index Nested Loop Join

```sql
-- 被驱动表有索引时使用
-- 时间复杂度：O(M * log N)
-- M = 驱动表行数，N = 被驱动表行数

-- 确保 JOIN 列有索引
CREATE INDEX idx_employees_dept_id ON employees(dept_id);
```

## 3. Block Nested Loop Join（BNL）

### 3.1 原理

```
1. 将驱动表的数据块读入 join_buffer
2. 扫描被驱动表，与 join_buffer 中的数据匹配
3. 减少被驱动表的扫描次数
```

```sql
-- 被驱动表无索引时使用
-- join_buffer_size 控制缓冲区大小
SET join_buffer_size = 262144;  -- 256KB

-- EXPLAIN 中 Extra: Using join buffer (Block Nested Loop)
```

### 3.2 优化

```sql
-- 增大 join_buffer_size
SET join_buffer_size = 8388608;  -- 8MB

-- 为 JOIN 列创建索引（转为 Index NLJ）
CREATE INDEX idx_join_col ON table_name(join_col);

-- 小表做驱动表
-- 驱动表越小，join_buffer 效果越好
```

## 4. Hash Join

### 4.1 原理

MySQL 8.0.18 引入 Hash Join，替代无索引场景下的 BNL：

```
1. Build 阶段：扫描小表，构建哈希表
2. Probe 阶段：扫描大表，在哈希表中查找匹配
```

```sql
-- 等值连接无索引时自动使用
SELECT * FROM t1 JOIN t2 ON t1.col = t2.col;
-- Extra: Using join buffer (hash join)

-- Hash Join 优势：
-- 时间复杂度：O(M + N)，比 BNL 的 O(M * N) 好
-- 不需要索引
```

### 4.2 Hash Join 限制

```sql
-- 仅支持等值连接（=, <=>）
-- 不支持非等值连接（>, <, BETWEEN）

-- 非等值连接仍使用 BNL
SELECT * FROM t1 JOIN t2 ON t1.col > t2.col;
-- Extra: Using join buffer (Block Nested Loop)
```

## 5. JOIN 优化策略

```sql
-- 1. 确保 JOIN 列有索引
-- 2. 小表做驱动表
-- 3. 避免过多表连接（建议不超过5个）
-- 4. 使用 STRAIGHT_JOIN 控制连接顺序
SELECT /*+ STRAIGHT_JOIN */ *
FROM small_table s
JOIN large_table l ON s.id = l.small_id;

-- 5. 使用 BKA（Batched Key Access）
SET optimizer_switch = 'batched_key_access=on';
-- 将驱动表的行批量传递给被驱动表
```
