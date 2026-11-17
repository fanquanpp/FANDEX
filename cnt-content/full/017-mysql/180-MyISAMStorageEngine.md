---
order: 210
title: MyISAM 存储引擎
module: 'mysql'
category: 数据库
difficulty: intermediate
description: MySQL MyISAM存储引擎：非事务表级锁、静态/动态行格式、全文索引、修复与适用场景
author: fanquanpp
updated: '2026-11-17'
related:
  - 'mysql/070-MySQLDataTypeConstraint'
  - 'mysql/090-SQLDataDefinitionAdvanced'
  - 'mysql/110-SQLDataOperationQuery'
  - 'mysql/190-MemoryStorageEngine'
prerequisites:
  - 'mysql/160-View'
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

```mermaid
flowchart TD
    T0["MyISAM 表的物理组成："]
    T1["table_name.MYD   — 数据文件（MYData）"]
    T2["table_name.MYI   — 索引文件（MYIndex）"]
    T3["table_name.sdi   — 序列化数据字典（8.0+；此前是 .frm）"]
    T0 --> T1
    T0 --> T2
    T0 --> T3
```

> 版本注：8.0 起 `.frm` 被数据字典取代，MyISAM 表的结构信息改存为 `.sdi` 文件（也可只存数据字典里、落盘可选）。老资料里"三件套 frm/MYD/MYI"的说法要更新。

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

## 教学自检（先遮住代码自己写，再对照）

遮码自检法：先只读题干，自己写/自己答，再展开参考答案对照。

1. 概念自问：MyISAM 的 `COUNT(*)` 为什么"极快"，InnoDB 为什么做不到？

参考答案（先自己答，再对照）：MyISAM 维护了每张表的精确行数元数据，无 WHERE 的 COUNT(*) 直接读它，O(1)；InnoDB 的行数要按 MVCC 快照算——同一时刻不同事务看到的行数都可能不同（有未提交的插入/删除），不存在一个全局精确的"当前行数"，只能索引扫描实数。带 WHERE 的 COUNT(*) 两家都要老老实实扫。

2. 概念自问：崩溃恢复一栏，MyISAM "需要手动修复"、InnoDB "自动恢复"，根子上差的是什么机制？

参考答案（先自己答，再对照）：InnoDB 有 redo log + 崩溃恢复流程，重启时重放日志把数据页恢复到一致状态；MyISAM 没有 WAL 机制，宕机时数据文件与索引文件可能不一致，只能 CHECK TABLE 发现问题、REPAIR TABLE 修复（以丢数据为代价换结构一致）。"写日志"这一层是事务型引擎与非事务型引擎的分水岭。

3. 判断题：8.0 之后 MyISAM 被官方废弃，新建表会报错？

参考答案（先自己答，再对照）：不会。MyISAM 至今仍是受支持的引擎（`SHOW ENGINES` 可见，8.0/8.4/9.x 均可 ENGINE=MyISAM 建表），只是 InnoDB 从 5.5 起一直是默认引擎、官方推荐全面转向 InnoDB。真正的历史节点是：5.5 默认引擎换为 InnoDB、8.0 移除 MyISAM 的分区支持（8.0 前建的分区 MyISAM 表在新版本不可用）。

4. 概念自问：什么场景今天还真的会选 MyISAM？

参考答案（先自己答，再对照）：极少，且有更优替代——只读归档数据可用压缩 MyISAM（myisampack，省 40-70% 空间、只读），或 InnoDB + 页压缩；"COUNT(*) 快"的需求可由计数表/Redis 兜底。判断标准：任何需要事务、崩溃安全、行级锁的场景都直接排除 MyISAM；新项目选它需要给出"为什么 InnoDB 不行"的明确论证，而不是习惯。

## 引擎查看

**基本写法：查看服务器支持的引擎**
`SHOW ENGINES;`

```sql
-- 查看所有存储引擎及默认引擎
SHOW ENGINES;
```

**基本写法：查看当前默认引擎**
`SHOW VARIABLES LIKE 'default_storage_engine';`

```sql
-- 查看默认存储引擎（MySQL 8.0+ 默认 InnoDB）
SHOW VARIABLES LIKE 'default_storage_engine';
```

**基本写法：查看表使用的引擎**
`SHOW TABLE STATUS FROM <数据库名> [LIKE '<表名>'];`

```sql
-- 查看 mydb 库所有表的引擎
SHOW TABLE STATUS FROM mydb;
-- 查看指定表引擎
SHOW TABLE STATUS FROM mydb LIKE 'users';
```

---

## 引擎指定与修改

**基本写法：建表时指定引擎**
`CREATE TABLE <表名> (...) ENGINE = <引擎名>;`

```sql
-- 创建 InnoDB 表（默认）
CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  amount DECIMAL(10,2)
) ENGINE = InnoDB;

-- 创建 MyISAM 表（只读分析场景）
CREATE TABLE logs (
  id BIGINT PRIMARY KEY,
  msg TEXT
) ENGINE = MyISAM;
```

**基本写法：修改表引擎**
`ALTER TABLE <表名> ENGINE = <新引擎>;`

```sql
-- 将 MyISAM 表转为 InnoDB（支持事务）
ALTER TABLE logs ENGINE = InnoDB;
```

---

## InnoDB 配置

**基本写法：查看 InnoDB 状态**
`SHOW ENGINE INNODB STATUS;`

```sql
-- 查看 InnoDB 内部状态（锁、死锁、缓冲池等）
SHOW ENGINE INNODB STATUS\G
```

**基本写法：查看 InnoDB 缓冲池状态**
`SELECT * FROM information_schema.INNODB_BUFFER_POOL_STATS;`

```sql
-- 查看缓冲池命中率与页信息
SELECT
  pool_id, pool_size, free_buffers, database_pages,
  hit_rate FROM information_schema.INNODB_BUFFER_POOL_STATS;
```

**基本写法：查看 InnoDB 数据字典**
`SELECT * FROM information_schema.INNODB_TABLES WHERE name LIKE '<库>/<表>';`

```sql
-- 查看 InnoDB 内部表元数据
SELECT * FROM information_schema.INNODB_TABLES WHERE name LIKE 'mydb/users';
```

---

## 引擎特性对比命令

**基本写法：查看表行格式与特性**
`SHOW TABLE STATUS FROM <库> LIKE '<表>'\G`

```sql
-- 查看 orders 表的行格式、数据长度、索引长度等
SHOW TABLE STATUS FROM mydb LIKE 'orders'\G
```

**基本写法：查看 InnoDB 页大小**
`SHOW VARIABLES LIKE 'innodb_page_size';`

```sql
-- 查看 InnoDB 页大小（默认 16K）
SHOW VARIABLES LIKE 'innodb_page_size';
```

---

## MyISAM 与 MEMORY 操作

**基本写法：MyISAM 表检查**
`CHECK TABLE <表名> [QUICK|FAST|MEDIUM|EXTENDED];`

```sql
-- 检查 MyISAM 表完整性
CHECK TABLE logs MEDIUM;
```

**基本写法：MyISAM 表修复**
`REPAIR TABLE <表名> [QUICK|EXTENDED];`

```sql
-- 修复损坏的 MyISAM 表
REPAIR TABLE logs EXTENDED;
```

**基本写法：优化表（回收空间）**
`OPTIMIZE TABLE <表名> [, <表2> ...];`

```sql
-- 优化表回收碎片空间（8.4 需 OPTIMIZE_LOCAL_TABLE 权限才可免 binlog）
OPTIMIZE TABLE users, orders;
```

**基本写法：MEMORY 引擎建表**
`CREATE TABLE <表名> (...) ENGINE = MEMORY [MAX_ROWS = <行数>];`

```sql
-- 创建内存表（数据不持久化，重启丢失）
CREATE TABLE session_cache (
  sid VARCHAR(64) PRIMARY KEY,
  data TEXT
) ENGINE = MEMORY MAX_ROWS = 10000;
```
