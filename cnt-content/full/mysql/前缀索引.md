---
order: 57
title: 前缀索引
module: mysql
category: MySQL
difficulty: intermediate
description: MySQL前缀索引：长字符串列的索引优化、选择性计算、适用场景与限制
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/索引下推
  - mysql/全文索引
  - mysql/索引提示与强制索引
  - mysql/索引统计信息与直方图
prerequisites:
  - mysql/语法速查
---

## 1. 前缀索引概述

前缀索引对字符串列的前 N 个字符建立索引，减少索引存储空间和维护开销。

```sql
-- 创建前缀索引
CREATE INDEX idx_email_prefix ON users(email(10));
CREATE INDEX idx_url_prefix ON web_pages(url(50));
```

## 2. 选择性计算

### 2.1 计算完整列选择性

```sql
-- 完整列的选择性
SELECT COUNT(DISTINCT email) / COUNT(*) AS selectivity FROM users;
-- 如 0.95
```

### 2.2 计算前缀选择性

```sql
-- 不同前缀长度的选择性
SELECT
    COUNT(DISTINCT LEFT(email, 5)) / COUNT(*) AS s5,
    COUNT(DISTINCT LEFT(email, 10)) / COUNT(*) AS s10,
    COUNT(DISTINCT LEFT(email, 15)) / COUNT(*) AS s15,
    COUNT(DISTINCT LEFT(email, 20)) / COUNT(*) AS s20
FROM users;

-- 选择使选择性接近完整列选择性的最小前缀长度
-- 如 s10 = 0.94 接近 0.95，选择前缀长度 10
```

## 3. 限制

```sql
-- 前缀索引不支持覆盖索引
-- 无法在 ORDER BY / GROUP BY 中使用
-- 无法用于等值比较的覆盖扫描

-- 示例：前缀索引无法覆盖
SELECT email FROM users WHERE email LIKE 'test%';
-- 即使 email(10) 索引包含前10个字符，也需要回表获取完整 email
```

## 4. 适用场景

```sql
-- 1. 长字符串列（URL、邮箱、路径）
CREATE INDEX idx_url_prefix ON pages(url(50));

-- 2. 空间敏感场景
-- 前缀索引占用空间远小于完整列索引

-- 3. 不需要覆盖索引的查询
SELECT id, name FROM users WHERE email LIKE 'test@%';
```
