---
order: 190
title: Memory 存储引擎：内存表的能力与陷阱
module: 'mysql'
category: 数据库
difficulty: intermediate
description: Memory 引擎全景：纯内存存储与重启即失的交换律、哈希索引与 B+ 树的选择、表级锁的并发含义、以及 8.0 临时表改用 TempTable 后的真实定位。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mysql/180-MyISAMStorageEngine'
  - 'mysql/210-IndexManagement'
  - 'mysql/220-ClusteredIndexSecondaryIndex'
  - 'mysql/380-GroupByOrderByOptimization'
prerequisites:
  - 'mysql/180-MyISAMStorageEngine'
  - 'mysql/070-MySQLDataTypeConstraint'
---

## 前置知识

- 存储引擎的概念与 InnoDB 基线（[MyISAM 引擎](/mysql/180-MyISAMStorageEngine)、[InnoDB 架构](/mysql/410-InnoDBSystemArchitecture)）——Memory 的每条特性都值得和 InnoDB 对照着记。

## 问题引入：一张"活不过重启"的表

某些数据天生就是临时的：登录会话映射、全国行政区划码表、爬虫的去重指纹集合。它们丢失无妨、重建廉价，却要求极低的访问延迟。**Memory 引擎**为这类数据而生：表结构与索引常驻内存，数据行也在内存——读写不碰磁盘，速度是所有引擎的天花板。

交换条件写在它的灵魂条款里：**服务器重启，数据全部蒸发**（表定义还在 .frm 里，行数据没了）。所以 Memory 表的第一设计原则是：数据必须可由廉价来源重建（启动时从文件/别的表灌回来），或本来就是 disposable 的。

## 核心特性表（与 InnoDB 对照着记）

| 特性 | Memory | InnoDB（对照） |
| --- | --- | --- |
| 数据位置 | 全内存 | 磁盘为主，内存缓冲 |
| 持久性 | 无（重启即空） | 事务持久化 |
| 锁粒度 | **表级锁** | 行级锁 |
| 事务 | 不支持 | 完整 ACID |
| 默认索引 | **哈希索引** | B+ 树 |
| 行大小上限 | 约 32KB（不含 BLOB/TEXT，且不支持这两类） | 65KB 级 |
| 容量上限 | `max_heap_table_size`（默认约 16MB！） | 磁盘容量 |

两张表之间有三个"反直觉"值得展开：

**反直觉一：哈希索引是默认，但多数人该显式换 B+ 树**。哈希索引只支持等值匹配（O(1) 定位），范围查询、排序、最左前缀全部无能为力（原理见哈希结构：键的存储位置由哈希值决定，天然无序）。查码表用等值没问题；一旦有 `BETWEEN` 或 `ORDER BY`，必须显式声明：

```sql
CREATE TABLE lookup (
  id INT PRIMARY KEY,                     -- 主键默认 HASH
  code VARCHAR(10),
  name VARCHAR(100),
  INDEX idx_code USING BTREE (code)       -- 显式换 B+ 树
) ENGINE = MEMORY;
```

**反直觉二：表级锁让"高并发读写"幻想破灭**。一个写事务锁全表，并发写吞吐随连接数增长不升反降。Memory 适合"读多写少"或"单写者"的负载，把它当并发缓存服务器用是常见误用。

**反直觉三：容量上限经常踩坑**。`max_heap_table_size` 默认约 16MB，超出后报"table is full"——新手第一反应是磁盘满了，其实是这个参数。调大它（全局）或建表时按需设置即可。

## 内部临时表的真相：8.0 之后别再认领

老资料说"MySQL 内部临时表用 Memory 引擎"——这在 8.0 已经过时：内部临时表（GROUP BY/DISTINCT/UNION 的中间结果，见 [分组排序优化](/mysql/380-GroupByOrderByOptimization)）改用 **TempTable 引擎**（内存为主、可溢盘），与用户级 Memory 引擎是两回事。所以"Memory 引擎的坑会影响我的排序性能"这类推理已不成立；反过来，想借"内部临时表"给 Memory 引擎续命的期待也落空了。

## 动手环节：亲眼见证"重启即空"

```sql
-- 1. 建表与容量参数
SET GLOBAL max_heap_table_size = 64 * 1024 * 1024;
CREATE TABLE mem_demo (
  id INT PRIMARY KEY,
  code VARCHAR(10),
  name VARCHAR(50),
  INDEX idx_code USING BTREE (code)
) ENGINE = MEMORY;

-- 2. 写入与等值查询（哈希主键的舒适区）
INSERT INTO mem_demo VALUES (1, 'CN', '中国'), (2, 'US', '美国'), (3, 'JP', '日本');
SELECT * FROM mem_demo WHERE id = 2;                 -- 极快
SELECT * FROM mem_demo WHERE code BETWEEN 'A' AND 'M'; -- B+ 树索引负责范围

-- 3. 范围查询暴露哈希主键的短板（对照实验）
EXPLAIN SELECT * FROM mem_demo WHERE id > 1;
-- type=ALL：主键是 HASH，范围条件只能全表扫！

-- 4. 容量上限实验（把参数调小后灌数据）
SET GLOBAL max_heap_table_size = 1048576;   -- 1MB
CREATE TABLE mem_full (id INT PRIMARY KEY, payload VARCHAR(100)) ENGINE = MEMORY;
INSERT INTO mem_full
SELECT n, repeat('x', 100)
FROM (WITH RECURSIVE t(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM t WHERE n < 100000)
      SELECT n FROM t) s;
-- ERROR 1114: The table 'mem_full' is full —— 参数即天花板
```

第 3 步值得多看一眼：`WHERE id > 1` 走全表扫描的元凶不是优化器，是哈希索引"天生无序"——这是 Memory 表索引选型的核心课程。

## 适用清单（照着抄不踩坑）

适合：会话/Token 映射表、行政区划等可重建码表、单元测试的临时夹具、MapReduce 式任务的内存暂存。

不适合（及替代方案）：需要重启存活的"内存缓存"→ InnoDB + 合理缓冲池或外部 Redis；高并发写入 → 行级锁的 InnoDB；超过几十 MB 的数据 → 先算容量账再考虑。

## 常见困惑

**"有 Redis 了，Memory 表还有意义吗？"**——仍有生态位：同进程内零网络开销、可 JOIN、事务边界内一致（尽管无事务，单语句原子）。跨服务的共享缓存用 Redis；单库内部的小型查找表用 Memory 表更顺路。

**"MEMORY 表会被主从复制吗？"**——复制的是 binlog 语句，从库的 Memory 表会执行同样的 INSERT，但**从库重启后同样清空**，且不会自动重灌——主从内存表内容从此分叉。规范：复制拓扑里避免用 Memory 表存状态性数据。

## 检验清单

- 能默写 Memory 与 InnoDB 的七行对照表，并说出"重启即空"的应对纪律；
- 理解哈希索引的等值优势与范围/排序/前缀三大无能力，会显式切 B+ 树；
- 知道表级锁的并发含义与 `max_heap_table_size` 的默认值陷阱；
- 完成"重启即空"与"容量 full 报错"两个实验（重启实验可在本地库安全做）；
- 能解释 8.0 内部临时表与 Memory 引擎已无关系。

## 下一步

存储引擎谱系的另一个极端是分布式：进入 [NDB Cluster](/mysql/200-NDBCluster)，看 MySQL 把"共享 nothing 集群"做进引擎层的方案。
