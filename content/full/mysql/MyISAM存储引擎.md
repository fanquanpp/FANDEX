---
order: 50
title: MyISAM存储引擎
module: mysql
category: MySQL
difficulty: intermediate
description: 'MySQL MyISAM存储引擎：非事务表级锁、静态/动态行格式、全文索引、修复与适用场景'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/数据类型与约束
  - mysql/SQL数据定义与高级对象
  - mysql/SQL数据操作与查询
  - mysql/Memory存储引擎
prerequisites:
  - mysql/语法速查
---

## 1. MyISAM 概述

MyISAM 是 MySQL 最早的默认存储引擎（5.5 之前），以简单高效著称，但不支持事务和行级锁。

### 1.1 核心特性

| 特性     | 说明                         |
| -------- | ---------------------------- |
| 事务支持 | 不支持                       |
| 锁粒度   | 表级锁                       |
| 外键     | 不支持                       |
| 崩溃恢复 | 需要手动修复（REPAIR TABLE） |
| 全文索引 | 支持                         |
| 空间索引 | 支持                         |
| 压缩表   | 支持（myisampack）           |
| MVCC     | 不支持                       |

### 1.2 存储文件

```
MyISAM 表由三个文件组成：
├── table_name.frm   — 表结构定义
├── table_name.MYD   — 数据文件（MYData）
└── table_name.MYI   — 索引文件（MYIndex）
```

## 2. 表级锁机制

### 2.1 锁类型

| 锁类型 | 说明                 |
| ------ | -------------------- |
| 读锁   | 共享锁，多个读可并发 |
| 写锁   | 排他锁，独占表       |

### 2.2 锁兼容性

|      | 读锁 | 写锁 |
| ---- | ---- | ---- |
| 读锁 |      |      |
| 写锁 |      |      |

```sql
-- 手动加锁
LOCK TABLES employees READ;     -- 读锁
LOCK TABLES employees WRITE;    -- 写锁
UNLOCK TABLES;                  -- 释放所有锁

-- MyISAM 写操作自动加写锁
INSERT INTO myisam_table VALUES (1, 'test');
-- 整个表被锁定，其他连接无法读写
```

### 2.3 并发插入

```sql
-- MyISAM 支持并发插入（CONCURRENT INSERT）
-- 条件：表没有空洞（未删除过行）或使用动态行格式

-- 设置并发插入
ALTER TABLE myisam_table CONCURRENT_INSERT = 1;  -- 默认
-- = 0：禁止并发插入
-- = 1：无空洞时允许
-- = 2：始终允许（在表末尾插入）
```

## 3. 行格式

### 3.1 静态行格式（FIXED）

```sql
-- 所有列使用定长类型时使用静态行格式
CREATE TABLE fixed_table (
    id    INT NOT NULL,
    name  CHAR(50) NOT NULL,
    age   SMALLINT NOT NULL
) ENGINE = MyISAM ROW_FORMAT = FIXED;

-- 特点：
-- - 每行长度固定，查找速度快
-- - 可直接计算行位置
-- - 空间利用率低
```

### 3.2 动态行格式（DYNAMIC）

```sql
-- 包含变长列时使用动态行格式
CREATE TABLE dynamic_table (
    id    INT NOT NULL,
    name  VARCHAR(200),
    bio   TEXT
) ENGINE = MyISAM ROW_FORMAT = DYNAMIC;

-- 特点：
-- - 行长度可变，空间利用率高
-- - 更新可能导致行碎片
-- - 需要定期 OPTIMIZE TABLE
```

### 3.3 压缩行格式（COMPRESSED）

```bash
# 使用 myisampack 压缩只读表
myisampack table_name

# 压缩后表只读，空间节省 40%-70%
```

## 4. 全文索引

```sql
-- MyISAM 原生支持全文索引
CREATE FULLTEXT INDEX idx_content ON articles(title, content);

SELECT * FROM articles
WHERE MATCH(title, content) AGAINST('MySQL 索引');

-- 布尔模式
SELECT * FROM articles
WHERE MATCH(title, content) AGAINST('+MySQL +索引 -优化' IN BOOLEAN MODE);
```

## 5. 崩溃恢复

```sql
-- 检查表
CHECK TABLE myisam_table;

-- 修复表
REPAIR TABLE myisam_table;
REPAIR TABLE myisam_table EXTENDED;  -- 更彻底的修复

-- 优化表（消除碎片）
OPTIMIZE TABLE myisam_table;
```

## 6. MyISAM vs InnoDB

| 特性      | MyISAM           | InnoDB         |
| --------- | ---------------- | -------------- |
| 事务      | 不支持           | 支持           |
| 锁粒度    | 表级锁           | 行级锁         |
| 外键      | 不支持           | 支持           |
| 崩溃恢复  | 手动修复         | 自动恢复       |
| MVCC      | 不支持           | 支持           |
| 全文索引  | 支持             | 5.6+ 支持      |
| COUNT(\*) | 极快（存储行数） | 需要扫描       |
| 适用场景  | 读密集、不需事务 | 通用、事务场景 |

## 7. 适用场景

```sql
-- 适合 MyISAM 的场景：
-- 1. 只读或读多写少的表
-- 2. 不需要事务的日志表
-- 3. 需要全文索引（MySQL 5.5 之前）
-- 4. COUNT(*) 频繁且不需要精确的统计

-- 不适合 MyISAM 的场景：
-- 1. 需要事务的 OLTP 系统
-- 2. 高并发写入
-- 3. 需要外键约束
-- 4. 对数据安全要求高
```
