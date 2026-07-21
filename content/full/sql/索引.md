---
order: 68
title: 索引
module: sql
category: SQL
difficulty: advanced
description: SQL索引体系：B+树索引、哈希索引、全文索引、空间索引的原理、结构与适用场景
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/数据控制语言
  - sql/事务控制语言
  - sql/执行计划
  - sql/事务ACID特性
prerequisites:
  - sql/概述与标准
---

## 1. 索引概述

索引是数据库中用于加速数据检索的数据结构，类似于书籍的目录。合理的索引设计是数据库性能优化的核心。

### 1.1 索引的代价

| 代价       | 说明                                |
| ---------- | ----------------------------------- |
| 存储空间   | 索引占用额外磁盘空间                |
| 写入开销   | INSERT/UPDATE/DELETE 需同步维护索引 |
| 优化器开销 | 索引越多，执行计划选择越复杂        |

### 1.2 索引分类

| 分类维度 | 类型                                   |
| -------- | -------------------------------------- |
| 数据结构 | B+树、哈希、全文、空间                 |
| 逻辑功能 | 主键索引、唯一索引、普通索引、复合索引 |
| 物理存储 | 聚簇索引、非聚簇索引（二级索引）       |
| 列数     | 单列索引、复合索引                     |

## 2. B+树索引

### 2.1 B+树结构

B+树是数据库最常用的索引结构，所有数据存储在叶子节点，非叶子节点只存储键值和指针。

```
                    [30|60]
                   /   |    \
          [10|20|30] [40|50|60] [70|80|90]
              ↓         ↓         ↓
          → [1..30] → [31..60] → [61..90] →
              叶子节点（双向链表）
```

**B+树特性**：

- **平衡性**：所有叶子节点在同一层级，查找时间复杂度 $O(\log n)$
- **有序性**：叶子节点按键值排序，支持范围查询和排序
- **链表连接**：叶子节点通过双向链表连接，范围扫描高效

### 2.2 B+树查找过程

```sql
-- 查找 id = 42
-- 1. 从根节点开始，42 在 30 和 60 之间，进入中间子节点
-- 2. 在中间节点，42 在 40 和 50 之间，进入对应叶子节点
-- 3. 在叶子节点中找到 42，返回对应行指针

SELECT * FROM employees WHERE id = 42;
```

### 2.3 B+树适用场景

```sql
-- 等值查询
SELECT * FROM users WHERE email = 'test@example.com';

-- 范围查询
SELECT * FROM orders WHERE created_at BETWEEN '2026-01-01' AND '2026-06-30';

-- 排序
SELECT * FROM employees ORDER BY salary DESC LIMIT 10;

-- 最左前缀匹配
-- 索引 (dept_id, salary)
SELECT * FROM employees WHERE dept_id = 5;                    -- 使用索引
SELECT * FROM employees WHERE dept_id = 5 AND salary > 50000; -- 使用索引
SELECT * FROM employees WHERE salary > 50000;                  -- 不使用索引
```

### 2.4 B+树的阶与高度

$$
\text{高度} = \lceil \log_f(\frac{n}{f}) \rceil
$$

其中 $f$ 为 B+树的扇出（fanout），$n$ 为行数。

| 行数        | 扇出=100 | 扇出=500 |
| ----------- | -------- | -------- |
| 10,000      | 1        | 1        |
| 1,000,000   | 2        | 2        |
| 100,000,000 | 3        | 3        |

> 3层 B+树（扇出500）可索引约 1.25 亿行，只需 3 次 I/O。

## 3. 哈希索引

### 3.1 结构与原理

哈希索引使用哈希函数将键值映射到桶（bucket），只支持等值查询。

```
hash(key) → bucket → [row1, row2, ...]
```

### 3.2 哈希索引特性

| 特性     | 说明                            |
| -------- | ------------------------------- |
| 查询速度 | $O(1)$ 等值查找                 |
| 范围查询 | 不支持                          |
| 排序     | 不支持                          |
| 哈希冲突 | 需要处理（链地址法/开放寻址法） |
| 适用场景 | 内存表、等值查找                |

```sql
-- PostgreSQL 哈希索引
CREATE INDEX idx_users_email_hash ON users USING HASH (email);

-- MySQL MEMORY 引擎默认使用哈希索引
CREATE TABLE session_cache (
    session_id VARCHAR(128),
    data TEXT,
    PRIMARY KEY (session_id)  -- 默认哈希索引
) ENGINE = MEMORY;

-- MySQL InnoDB 自适应哈希索引（自动）
-- InnoDB 自动为频繁访问的 B+树页创建哈希索引
SET GLOBAL innodb_adaptive_hash_index = ON;
```

### 3.3 哈希索引的局限

```sql
-- 不支持范围查询
SELECT * FROM users WHERE id > 100;  -- 哈希索引无效

-- 不支持排序
SELECT * FROM users ORDER BY id;  -- 哈希索引无效

-- 不支持最左前缀
-- 无法用于复合索引的部分匹配

-- 不支持模糊查询
SELECT * FROM users WHERE email LIKE 'test%';  -- 哈希索引无效
```

## 4. 全文索引

### 4.1 全文检索原理

全文索引基于**倒排索引**（Inverted Index）实现，将文档中的词映射到包含该词的文档列表。

```
词项      → 文档列表
"数据库"  → [doc1, doc3, doc5]
"索引"    → [doc1, doc2, doc4]
"优化"    → [doc2, doc3]
```

### 4.2 创建全文索引

```sql
-- PostgreSQL 全文索引
CREATE INDEX idx_articles_fts ON articles
USING GIN (to_tsvector('english', content));

-- 查询
SELECT * FROM articles
WHERE to_tsvector('english', content) @@ to_tsquery('english', 'database & index');

-- MySQL 全文索引
CREATE FULLTEXT INDEX idx_articles_content ON articles(content);

-- 查询
SELECT * FROM articles WHERE MATCH(content) AGAINST('database index' IN NATURAL LANGUAGE MODE);
SELECT * FROM articles WHERE MATCH(content) AGAINST('+database +index' IN BOOLEAN MODE);
```

### 4.3 全文索引处理流程

```
1. 分词（Tokenization）：将文本拆分为词项
2. 归一化（Normalization）：小写化、词干提取、停用词过滤
3. 构建倒排索引：词项 → 文档ID列表
4. 查询匹配：根据查询词项查找文档
5. 相关性排序：TF-IDF / BM25 算法
```

## 5. 空间索引

### 5.1 空间索引原理

空间索引使用 R-Tree 或其变体（如 R\*-Tree）组织空间数据，支持空间查询的高效过滤。

```
R-Tree 结构：
[MBR1] → [子MBR1.1, 子MBR1.2, ...]
[MBR2] → [子MBR2.1, 子MBR2.2, ...]
```

### 5.2 创建空间索引

```sql
-- PostgreSQL + PostGIS
CREATE INDEX idx_locations_geom ON locations USING GIST (geom);

-- MySQL 空间索引
CREATE SPATIAL INDEX idx_locations_geom ON locations(geom);

-- 空间查询
SELECT * FROM locations
WHERE ST_DWithin(geom, ST_MakePoint(116.4, 39.9)::geography, 3000);
```

## 6. 索引设计原则

### 6.1 何时创建索引

```sql
-- 适合创建索引的场景
-- 1. WHERE 条件中的列
-- 2. JOIN 连接列
-- 3. ORDER BY / GROUP BY 列
-- 4. DISTINCT 列
-- 5. 外键列

-- 不适合创建索引的场景
-- 1. 区分度低的列（如性别、状态）
-- 2. 频繁更新的列
-- 3. 小表（全表扫描更快）
-- 4. 查询很少使用的列
```

### 6.2 复合索引设计

```sql
-- 最左前缀原则
-- 索引 (a, b, c) 支持：
-- WHERE a = 1
-- WHERE a = 1 AND b = 2
-- WHERE a = 1 AND b = 2 AND c = 3
-- 不支持：
-- WHERE b = 2
-- WHERE c = 3

-- 等值条件在前，范围条件在后
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
-- 支持：WHERE user_id = 42 AND created_at > '2026-01-01'
```

### 6.3 覆盖索引

```sql
-- 覆盖索引：索引包含查询所需的所有列，无需回表
CREATE INDEX idx_employees_dept_name_salary
ON employees(dept_id, name, salary);

-- 以下查询只需扫描索引，不需要访问表数据
SELECT name, salary FROM employees WHERE dept_id = 5;
```
