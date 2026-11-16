---
order: 690
title: 分区表
module: 'mysql'
category: 数据库
difficulty: advanced
description: MySQL分区表：RANGE、LIST、HASH、KEY分区的语法、管理、裁剪与性能优化
author: fanquanpp
updated: '2026-10-11'
related:
  - 'mysql/620-GroupReplication'
  - 'mysql/680-ShardingMiddleware'
  - 'mysql/690-AccountPermissionManagement'
prerequisites:
  - 'mysql/160-View'
---

## 1. 分区概述

分区将大表拆分为多个物理小表，对应用透明，用于提升查询性能和管理便利性。

版本与引擎边界（8.0+）：分区仅支持内置分区感知引擎——InnoDB（默认）与 NDB；MyISAM 的分区支持已在 8.0 移除，老库里的分区 MyISAM 表升级后不可用。分区的唯一键必须包含分区键（所有主键/唯一键列），这是建表报错的第一来源。

## 2. RANGE 分区

```sql
CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT,
    order_date DATE,
    amount DECIMAL(10,2),
    PRIMARY KEY (id, order_date)
) PARTITION BY RANGE (YEAR(order_date)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);

-- 添加分区
ALTER TABLE orders ADD PARTITION (PARTITION p2027 VALUES LESS THAN (2028));

-- 删除分区（数据也删除）
ALTER TABLE orders DROP PARTITION p2024;
```

## 3. LIST 分区

```sql
CREATE TABLE customers (
    id BIGINT AUTO_INCREMENT,
    region VARCHAR(20),
    name VARCHAR(100),
    PRIMARY KEY (id, region)
) PARTITION BY LIST COLUMNS (region) (
    PARTITION p_east VALUES IN ('华东', '华北'),
    PARTITION p_south VALUES IN ('华南', '西南'),
    PARTITION p_north VALUES IN ('东北', '西北')
);
```

## 4. HASH 分区

```sql
CREATE TABLE logs (
    id BIGINT AUTO_INCREMENT,
    created_at TIMESTAMP,
    message TEXT,
    PRIMARY KEY (id, created_at)
) PARTITION BY HASH (YEAR(created_at))
PARTITIONS 4;
```

## 5. KEY 分区

```sql
CREATE TABLE sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id BIGINT,
    data TEXT
) PARTITION BY KEY (session_id)
PARTITIONS 8;
```

## 教学自检（先遮住代码自己写，再对照）

遮码自检法：先只读题干，自己写/自己答，再展开参考答案对照。

1. 写出语句：orders 表按年份做 RANGE 分区，未来数据自动落入兜底分区。说出"兜底分区"为什么必不可少。

参考答案（先自己写，再对照）：

```sql
CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT,
  order_date DATE NOT NULL,
  amount DECIMAL(10,2),
  PRIMARY KEY (id, order_date)
) PARTITION BY RANGE (YEAR(order_date)) (
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION p2025 VALUES LESS THAN (2026),
  PARTITION p2026 VALUES LESS THAN (2027),
  PARTITION pmax  VALUES LESS THAN MAXVALUE
);
```

没有 MAXVALUE 兜底分区时，超出所有分区的值直接报错（ERROR 1526）——跨年脚本忘加新分区，新年第一笔订单就把写入打挂。兜底分区是"分区管理滞后"的保险。

2. 概念自问：分区裁剪的生效条件是什么？为什么"分区键不出现在 WHERE 里"时分区反而可能拖慢查询？

参考答案（先自己答，再对照）：裁剪要求 WHERE 能根据分区键推断目标分区——`order_date >= ...` 才能只扫 p2026；条件里没有分区键时，每个分区都要扫一遍（N 个分区 = N 次小全表扫，还要逐分区开文件），比不分区的单次全表扫更贵。分区不是"加个开关就变快"，它是"把大扫描切成小扫描"的机制，切错了维度（查询从不带分区键）就是纯开销。

3. 判断题：分区表的主键可以不含分区键，只要 id 是主键就行。

参考答案（先自己答，再对照）：不行，这是硬性规则——分区表的每个唯一键（含主键）都必须包含分区键。原因：唯一性校验要在行所在分区内完成，若唯一键不含分区键，同一键值可能落到不同分区，全局唯一就无从判定。所以本项目主键是 (id, order_date) 的复合主键——这也是"分区与业务唯一性互相牵制"的典型体现，设计期就要想清楚。

4. 概念自问：分区与分库分表的边界在哪？"数据量大了就分区"错在哪？

参考答案（先自己答，再对照）：分区是单机内的物理切分（同一实例、同一引擎，解决管理性与裁剪扫描），分库分表是跨实例的数据分布（解决容量与写入吞吐）。分区不能突破单机 CPU/磁盘/内存上限——写入瓶颈、连接上限、备份时长都不因分区而改变。判据：管理性诉求（按月归档、快速删除历史数据 REMOVE/DROP PARTITION）用分区；容量与吞吐诉求用分片，两者经常是先后关系而不是替代关系。

## 6. 分区裁剪

```sql
-- 查询只扫描相关分区
SELECT * FROM orders WHERE order_date >= '2026-01-01';
-- 只扫描 p2026 分区

-- 查看分区裁剪
EXPLAIN PARTITIONS
SELECT * FROM orders WHERE order_date >= '2026-01-01';
-- partitions: p2026
```

## 7. 分区管理

```sql
-- 重建分区（消除碎片）
ALTER TABLE orders REBUILD PARTITION p2026;

-- 分析分区（更新统计信息）
ALTER TABLE orders ANALYZE PARTITION p2026;

-- 优化分区
ALTER TABLE orders OPTIMIZE PARTITION p2026;

-- 检查分区
ALTER TABLE orders CHECK PARTITION p2026;
```

## RANGE 分区

**基本写法：RANGE 分区建表**
`CREATE TABLE <表名> (...) PARTITION BY RANGE (<表达式>) (PARTITION <分区名> VALUES LESS THAN (<值>), ...)`

```sql
-- 按年份范围分区
CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  order_date DATE,
  amount DECIMAL(10,2)
)
PARTITION BY RANGE (YEAR(order_date)) (
  PARTITION p2022 VALUES LESS THAN (2023),
  PARTITION p2023 VALUES LESS THAN (2024),
  PARTITION p2024 VALUES LESS THAN (2025),
  PARTITION pmax VALUES LESS THAN MAXVALUE
);
```

**基本写法：RANGE COLUMNS 多列分区**
`PARTITION BY RANGE COLUMNS(<列1>, <列2>) (PARTITION <名> VALUES LESS THAN (<值1>, <值2>), ...)`

```sql
-- 按多列组合范围分区
CREATE TABLE sales (
  id BIGINT,
  region VARCHAR(20),
  sale_date DATE
)
PARTITION BY RANGE COLUMNS(region, sale_date) (
  PARTITION p_east_2024 VALUES LESS THAN ('EAST', '2025-01-01'),
  PARTITION p_west_2024 VALUES LESS THAN ('WEST', '2025-01-01'),
  PARTITION p_other VALUES LESS THAN (MAXVALUE, MAXVALUE)
);
```

---

## LIST 分区

**基本写法：LIST 分区建表**
`CREATE TABLE <表名> (...) PARTITION BY LIST (<表达式>) (PARTITION <分区名> VALUES IN (<值列表>), ...)`

```sql
-- 按地区枚举分区
CREATE TABLE customers (
  id BIGINT PRIMARY KEY,
  region_code INT
)
PARTITION BY LIST (region_code) (
  PARTITION p_north VALUES IN (1, 2, 3),
  PARTITION p_south VALUES IN (4, 5, 6),
  PARTITION p_east VALUES IN (7, 8),
  PARTITION p_west VALUES IN (9, 10)
);
```

**基本写法：LIST COLUMNS 多列分区**
`PARTITION BY LIST COLUMNS(<列>) (PARTITION <名> VALUES IN (<值列表>), ...)`

```sql
-- 按字符串列分区
CREATE TABLE users (
  id BIGINT,
  country VARCHAR(10)
)
PARTITION BY LIST COLUMNS(country) (
  PARTITION p_cn VALUES IN ('CN', 'HK', 'TW'),
  PARTITION p_us VALUES IN ('US', 'CA'),
  PARTITION p_other VALUES IN ('UK', 'FR', 'DE')
);
```

---

## HASH 与 KEY 分区

**基本写法：HASH 分区**
`CREATE TABLE <表名> (...) PARTITION BY HASH(<表达式>) PARTITIONS <分区数>;`

```sql
-- 按用户 ID 哈希分 8 个区
CREATE TABLE user_logs (
  id BIGINT,
  user_id BIGINT,
  log_text TEXT
)
PARTITION BY HASH(user_id)
PARTITIONS 8;
```

**基本写法：LINEAR HASH 分区**
`PARTITION BY LINEAR HASH(<表达式>) PARTITIONS <分区数>;`

```sql
-- 线性哈希，增删分区更快但分布可能不均
CREATE TABLE t_logs (id BIGINT)
PARTITION BY LINEAR HASH(id)
PARTITIONS 16;
```

**基本写法：KEY 分区**
`PARTITION BY KEY(<列>) PARTITIONS <分区数>;`

```sql
-- KEY 分区由 MySQL 内部哈希，类似主键哈希
CREATE TABLE user_events (
  id BIGINT PRIMARY KEY,
  event VARCHAR(50)
)
PARTITION BY KEY()
PARTITIONS 4;
```

---

## 分区管理

**基本写法：添加分区**
`ALTER TABLE <表名> ADD PARTITION (PARTITION <分区名> VALUES LESS THAN (<值>));`

```sql
-- 为 RANGE 分区表添加新分区
ALTER TABLE orders
ADD PARTITION (
  PARTITION p2025 VALUES LESS THAN (2026)
);
```

**基本写法：删除分区**
`ALTER TABLE <表名> DROP PARTITION <分区名>;`

```sql
-- 删除分区（连同数据一起删除）
ALTER TABLE orders DROP PARTITION p2022;
```

**基本写法：重组分区**
`ALTER TABLE <表名> REORGANIZE PARTITION <分区名> INTO (PARTITION <新分区> ...);`

```sql
-- 将 p2024 拆分为 p2024_h1 和 p2024_h2
ALTER TABLE orders
REORGANIZE PARTITION p2024 INTO (
  PARTITION p2024_h1 VALUES LESS THAN ('2024-07-01'),
  PARTITION p2024_h2 VALUES LESS THAN (2025)
);
```

**基本写法：合并分区**
`ALTER TABLE <表名> REORGANIZE PARTITION <分区1>, <分区2> INTO (PARTITION <新分区> ...);`

```sql
-- 合并两个相邻分区
ALTER TABLE orders
REORGANIZE PARTITION p2024_h1, p2024_h2 INTO (
  PARTITION p2024 VALUES LESS THAN (2025)
);
```

---

## 分区维护

**基本写法：查看分区信息**
`SELECT * FROM information_schema.PARTITIONS WHERE table_name = '<表名>';`

```sql
-- 查看表分区、行数、数据长度
SELECT partition_name, partition_method, table_rows, data_length
FROM information_schema.PARTITIONS
WHERE table_name = 'orders';
```

**基本写法：检查分区**
`ALTER TABLE <表名> CHECK PARTITION <分区名>;`

```sql
-- 检查指定分区数据完整性
ALTER TABLE orders CHECK PARTITION p2024;
```

**基本写法：重建分区**
`ALTER TABLE <表名> REBUILD PARTITION <分区名>;`

```sql
-- 重建分区回收碎片
ALTER TABLE orders REBUILD PARTITION p2023;
```

**基本写法：分析分区**
`ALTER TABLE <表名> ANALYZE PARTITION <分区名>;`

```sql
-- 重新收集分区统计信息
ALTER TABLE orders ANALYZE PARTITION p2024;
```

**基本写法：移除分区（保留数据）**
`ALTER TABLE <表名> REMOVE PARTITIONING;`

```sql
-- 移除分区结构但保留数据为普通表
ALTER TABLE orders REMOVE PARTITIONING;
```
