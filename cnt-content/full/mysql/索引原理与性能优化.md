---
order: 100
tags:
  - mysql
  - performance
  - database
difficulty: advanced
title: 索引原理与性能优化
module: mysql
category: 'MySQL Advanced'
description: 索引结构、覆盖索引、最左前缀与查询调优。
author: Anonymous
related:
  - mysql/存储过程与函数
  - mysql/MVCC快照读与当前读
  - mysql/触发器与事件
  - mysql/Redo与Undo与Binlog写入时机
prerequisites:
  - mysql/语法速查
---

## 1. 索引原理 (Index Mechanism)

### 1.1 什么是索引

索引是帮助数据库高效获取数据的数据结构，它可以大大减少数据库在查询过程中需要扫描的数据量，从而提高查询性能。

### 1.2 B+ 树索引原理

MySQL (InnoDB) 默认使用的索引结构是 B+ 树，它是一种平衡树结构，具有以下特点：

- **非叶子节点**：仅存储键值，不存储数据
- **叶子节点**：存储键值和对应的数据（聚簇索引）或主键值（非聚簇索引）
- **双向链表**：叶子节点之间通过双向链表相连，适合范围查询
- **高度平衡**：树的高度较低，通常为 3-4 层，查询效率高

### 1.3 B+ 树 vs B 树

- **B 树**：非叶子节点也存储数据，节点大小固定，范围查询需要回溯
- **B+ 树**：只有叶子节点存储数据，叶子节点通过链表相连，范围查询更高效

## 2. 索引分类 (Classification)

### 2.1 按功能分类

- **主键索引 (Primary Key)**：唯一且非空，InnoDB 会自动为表创建聚簇索引
- **唯一索引 (Unique)**：唯一但可为空，确保列值唯一性
- **普通索引 (Normal)**：加快查询速度，无唯一性约束
- **组合索引 (Composite)**：多个字段组成的索引，遵循最左前缀法则
- **全文索引 (Fulltext)**：用于全文搜索，支持关键词匹配
- **空间索引 (Spatial)**：用于地理空间数据类型

### 2.2 按物理存储分类

- **聚簇索引 (Clustered Index)**：数据与索引存储在一起，叶子节点存储完整的行数据
- **非聚簇索引 (Non-Clustered Index)**：数据与索引分开存储，叶子节点存储主键值

## 3. 聚簇索引 vs. 非聚簇索引 (Clustered vs Non-Clustered)

### 3.1 聚簇索引

- **特点**：数据与主键索引存储在一起，叶子节点即为行数据
- **优势**：查询效率高，特别是通过主键查询时
- **劣势**：插入速度较慢，因为需要维护索引顺序
- **适用场景**：主键查询频繁的表

### 3.2 非聚簇索引

- **特点**：叶子节点存储的是主键值，需要通过主键值回表查询完整数据
- **优势**：插入速度较快，索引维护成本低
- **劣势**：查询时可能需要回表，性能略差
- **适用场景**：插入频繁的表

### 3.3 回表查询

当使用非聚簇索引查询时，MySQL 会先通过索引找到主键值，然后再通过主键索引找到完整的行数据，这个过程称为回表查询。

## 4. 索引的创建与管理

### 4.1 创建索引

#### 4.1.1 创建表时创建索引

```sql
 -
 CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(50),
  email VARCHAR(100) UNIQUE,
  age INT,
  INDEX idx_age (age),
  INDEX idx_name_age (name, age)
 )
```

#### 4.1.2 为现有表添加索引

```sql
 -
 CREATE INDEX idx_age ON users(age);
 -
 CREATE UNIQUE INDEX idx_email ON users(email);
 -
 CREATE INDEX idx_name_age ON users(name, age);
 -
 CREATE FULLTEXT INDEX idx_content ON articles(content);
```

### 4.2 修改索引

```sql
 -
 ALTER TABLE users RENAME INDEX idx_age TO idx_user_age;
```

### 4.3 删除索引

```sql
 -
 DROP INDEX idx_age ON users;
 -
 ALTER TABLE users DROP INDEX idx_age;
```

### 4.4 查看索引

```sql
 -
 SHOW INDEX FROM users;
 -
 SELECT * FROM INFORMATION_SCHEMA.STATISTICS WHERE table_schema = 'database_name' AND table_name = 'users';
```

## 5. 查询优化 (Optimization)

### 5.1 `EXPLAIN` 执行计划详解

#### 5.1.1 基本用法

```sql
 EXPLAIN SELECT * FROM users WHERE age > 18;
```

#### 5.1.2 执行计划字段含义

- **`id`**: 查询的ID，用于标识不同的查询部分
- **`select_type`**: 查询类型（SIMPLE, PRIMARY, SUBQUERY, DERIVED, UNION, UNION RESULT）
- **`table`**: 表名
- **`partitions`**: 匹配的分区
- **`type`**: 访问类型（从快到慢）：
- `system`: 表只有一行数据
- `const`: 使用主键或唯一索引查询
- `eq_ref`: 多表连接时使用主键或唯一索引
- `ref`: 使用普通索引查询
- `range`: 范围查询
- `index`: 扫描整个索引
- `ALL`: 全表扫描
- **`possible_keys`**: 可能使用的索引
- **`key`**: 实际使用的索引
- **`key_len`**: 使用的索引长度
- **`ref`**: 索引引用的列或常量
- **`rows`**: 预计扫描的行数
- **`filtered`**: 过滤后的行数百分比
- **`Extra`**: 额外信息
- `Using index`: 使用覆盖索引
- `Using where`: 使用 WHERE 子句过滤
- `Using temporary`: 使用临时表
- `Using filesort`: 使用文件排序
- `Using join buffer`: 使用连接缓冲区

### 5.2 慢查询日志 (Slow Query Log)

#### 5.2.1 开启慢查询日志

```sql
 -
 SHOW VARIABLES LIKE '%slow_query%';
 -
 SET GLOBAL slow_query_log = 'ON';
 -
 SET GLOBAL long_query_time = 1;
 -
 SET GLOBAL slow_query_log_file = '/var/lib/mysql/slow-query.log';
 -
 SET GLOBAL log_queries_not_using_indexes = 'ON';
```

#### 5.2.2 分析慢查询日志

```bash
 -
 mysqldumpslow -s t /var/lib/mysql/slow-query.log
 -
 mysqldumpslow -s c /var/lib/mysql/slow-query.log
 -
 mysqldumpslow -s r /var/lib/mysql/slow-query.log
```

### 5.3 索引使用技巧

#### 5.3.1 最左前缀法则

对于组合索引 `(a, b, c)`，以下查询会使用索引：

- `WHERE a = 1`
- `WHERE a = 1 AND b = 2`
- `WHERE a = 1 AND b = 2 AND c = 3`
  以下查询不会使用索引：
- `WHERE b = 2`
- `WHERE c = 3`
- `WHERE b = 2 AND c = 3`

#### 5.3.2 索引失效的情况

- **使用函数**：`WHERE DATE(create_time) = '2023-01-01'`
- **类型转换**：`WHERE age = '18'`（字符串与数字比较）
- **使用 LIKE 前缀通配符**：`WHERE name LIKE '%John'`
- **使用 OR**：`WHERE age = 18 OR name = 'John'`（除非所有列都有索引）
- **使用 NOT IN**：`WHERE age NOT IN (18, 20)`
- **使用 != 或 <>**：`WHERE age != 18`
- **使用 IS NULL**：`WHERE age IS NULL`（除非索引包含 NULL 值）

#### 5.3.3 覆盖索引

当查询的列都包含在索引中时，MySQL 不需要回表查询，直接从索引中获取数据，提高查询效率。

```sql
 -
 -
 SELECT name, age FROM users WHERE name = 'John';
 -
 SELECT id, name, age FROM users WHERE name = 'John';
```

## 6. 性能优化策略

### 6.1 查询优化

- **避免 SELECT \***：只查询需要的列
- **使用 LIMIT**：限制返回行数
- **合理使用 JOIN**：避免过多的表连接
- **使用子查询或临时表**：对于复杂查询
- **优化 ORDER BY**：尽量使用索引排序
- **使用 GROUP BY**：注意分组字段的索引

### 6.2 索引优化

- **选择合适的索引类型**：根据查询场景选择
- **合理设计组合索引**：遵循最左前缀法则
- **定期重建索引**：避免索引碎片
- **删除不必要的索引**：减少维护成本
- **使用前缀索引**：对于长字符串列

### 6.3 表结构优化

- **选择合适的数据类型**：使用最小的必要数据类型
- **避免使用 NULL**：NULL 值会增加存储和查询成本
- **使用合适的字符集**：如 UTF-8mb4
- **分区表**：对于大表，使用分区提高查询效率
- **分表**：水平分表或垂直分表

### 6.4 服务器配置优化

- **调整缓冲池大小**：`innodb_buffer_pool_size`
- **调整查询缓存**：`query_cache_size`
- **调整连接数**：`max_connections`
- **调整日志配置**：`innodb_log_file_size`
- **调整排序缓冲区**：`sort_buffer_size`
- **调整临时表大小**：`tmp_table_size`

## 7. 实际案例分析

### 7.1 案例 1：慢查询优化

**问题**：执行以下查询时速度很慢

```sql
 SELECT * FROM orders WHERE create_time > '2023-01-01' AND status = 'completed';
```

**分析**：

1. 使用 EXPLAIN 查看执行计划
2. 发现 type 为 ALL，进行了全表扫描
3. 检查索引，发现 create_time 和 status 列都没有索引
   **解决方案**：
4. 创建组合索引

```sql
 CREATE INDEX idx_create_time_status ON orders(create_time, status);
```

1. 优化查询，只查询需要的列

```sql
 SELECT id, user_id, amount FROM orders WHERE create_time > '2023-01-01' AND status = 'completed';
```

### 7.2 案例 2：索引失效

**问题**：使用了索引但查询仍然很慢

```sql
 SELECT * FROM users WHERE YEAR(birthday) = 1990;
```

**分析**：

1. 虽然 birthday 列有索引，但使用了 YEAR() 函数，导致索引失效
2. 执行计划显示 type 为 ALL，进行了全表扫描
   **解决方案**：
3. 重写查询，避免使用函数

```sql
 SELECT * FROM users WHERE birthday BETWEEN '1990-01-01' AND '1990-12-31';
```

1. 或者创建函数索引（MySQL 8.0+）

```sql
 CREATE INDEX idx_year_birthday ON users((YEAR(birthday)));
```

### 7.3 案例 3：组合索引优化

**问题**：有组合索引 `idx_name_age (name, age)`，但以下查询没有使用索引

```sql
 SELECT * FROM users WHERE age = 18;
```

**分析**：

1. 组合索引遵循最左前缀法则
2. 查询条件只使用了 age 列，没有使用 name 列，所以索引失效
   **解决方案**：
3. 创建单独的 age 索引

```sql
 CREATE INDEX idx_age ON users(age);
```

1. 或者调整查询，包含 name 列

```sql
 SELECT * FROM users WHERE name = 'John' AND age = 18;
```

## 8. 性能监控与工具

### 8.1 内置工具

- **SHOW STATUS**：查看服务器状态
- **SHOW VARIABLES**：查看服务器配置
- **SHOW PROCESSLIST**：查看当前连接和查询
- **INFORMATION_SCHEMA**：查询元数据
- **PERFORMANCE_SCHEMA**：性能监控

### 8.2 第三方工具

- **MySQL Workbench**：图形化管理工具
- **phpMyAdmin**：Web 管理工具
- **Percona Monitoring and Management (PMM)**：性能监控
- **MySQLTuner**：配置优化建议
- **pt-query-digest**：慢查询分析

## 9. 最佳实践

### 9.1 索引设计最佳实践

- **为常用查询创建索引**：分析查询模式
- **选择高选择性的列**：区分度高的列适合作为索引
- **控制索引数量**：每个表的索引数量不宜过多
- **定期维护索引**：使用 `OPTIMIZE TABLE` 重建索引
- **使用前缀索引**：对于长字符串列

### 9.2 查询优化最佳实践

- **避免全表扫描**：尽量使用索引
- **合理使用 JOIN**：控制连接表的数量
- **使用 EXPLAIN**：分析查询计划
- **优化子查询**：考虑使用 JOIN 替代子查询
- **使用 LIMIT**：限制返回行数

### 9.3 表结构设计最佳实践

- **选择合适的数据类型**：使用最小的必要数据类型
- **避免使用 TEXT/BLOB**：除非必要
- **使用 AUTO_INCREMENT**：主键使用自增整数
- **合理设计表结构**：避免过度规范化或反规范化

## 10. 常见问题与解决方案

### 10.1 索引不生效

**问题**：创建了索引但查询没有使用
**解决方案**：

- 检查查询条件是否符合索引使用规则
- 检查索引是否被正确创建
- 使用 EXPLAIN 分析执行计划
- 考虑重建索引

### 10.2 慢查询

**问题**：查询执行时间过长
**解决方案**：

- 开启慢查询日志
- 分析慢查询日志
- 创建合适的索引
- 优化查询语句
- 考虑表结构优化

### 10.3 索引膨胀

**问题**：索引占用空间过大
**解决方案**：

- 删除不必要的索引
- 优化索引设计
- 定期重建索引
- 考虑使用前缀索引

### 10.4 死锁

**问题**：并发操作时出现死锁
**解决方案**：

- 优化事务设计
- 减少事务持有时间
- 统一锁定顺序
- 使用合理的隔离级别

## 11. 总结

索引是 MySQL 性能优化的关键因素，正确使用索引可以显著提高查询效率。通过理解 B+ 树索引原理、掌握索引分类和使用方法、分析执行计划、优化慢查询，以及遵循最佳实践，可以有效地提升 MySQL 数据库的性能。

### 核心要点

- **索引原理**：B+ 树结构，聚簇索引与非聚簇索引
- **索引类型**：主键索引、唯一索引、普通索引、组合索引、全文索引
- **索引使用**：最左前缀法则，避免索引失效
- **查询优化**：使用 EXPLAIN 分析执行计划，优化慢查询
- **性能调优**：服务器配置优化，表结构优化

### 学习建议

- **实践**：通过实际操作熟悉索引的创建和使用
- **分析**：使用 EXPLAIN 分析查询计划
- **监控**：开启慢查询日志，监控数据库性能
- **优化**：根据实际情况调整索引和查询
- **持续学习**：关注 MySQL 的新特性和优化技巧

---

### 更新日志 (Changelog)

- 2026-04-05: 体系化整合 MySQL 索引与性能优化。
- 2026-05-03: 扩展内容，添加更详细的索引原理、创建与管理、执行计划详解、性能优化策略、实际案例分析、性能监控与工具、最佳实践和常见问题解决方案。
