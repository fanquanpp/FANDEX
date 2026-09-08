---
order: 850
title: MySQL 索引管理
module: 'mysql'
category: 数据库
difficulty: beginner
description: MySQL 索引管理 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## 创建索引

**单行写法：创建普通索引**
`CREATE INDEX <索引名> ON <表名>(<列名>[, <列名>...]);`
```sql
-- 在 email 列上创建索引
CREATE INDEX idx_email ON users(email);
```

**单行写法：创建复合索引**
`CREATE INDEX <索引名> ON <表名>(<列1>, <列2>[, ...]);`
```sql
-- 创建多列复合索引
CREATE INDEX idx_status_created ON orders(status, created_at);
```

**单行写法：创建唯一索引**
`CREATE UNIQUE INDEX <索引名> ON <表名>(<列名>);`
```sql
-- 创建唯一索引
CREATE UNIQUE INDEX uk_email ON users(email);
```

**单行写法：创建前缀索引**
`CREATE INDEX <索引名> ON <表名>(<列名>(<长度>));`
```sql
-- 为长字符串列创建前缀索引
CREATE INDEX idx_name_prefix ON users(username(10));
```

**换行写法：创建全文索引**
`ALTER TABLE <表名> ADD FULLTEXT INDEX <索引名> (<列名>[, ...]);`
```sql
-- 为文章标题和内容创建全文索引
ALTER TABLE articles ADD FULLTEXT INDEX ft_content (title, content);
```

**换行写法：创建函数索引（8.0.13+）**
`CREATE INDEX <索引名> ON <表名>((<表达式>));`
```sql
-- 为列的小写形式创建函数索引
CREATE INDEX idx_lower_email ON users((LOWER(email)));
```

**换行写法：创建降序索引（8.0+）**
`CREATE INDEX <索引名> ON <表名>(<列> DESC);`
```sql
-- 创建降序索引优化倒序查询
CREATE INDEX idx_created_desc ON orders(created_at DESC);
```

---

## ALTER TABLE 管理索引

**单行写法：添加普通索引**
`ALTER TABLE <表名> ADD INDEX <索引名> (<列名>);`
```sql
-- 添加普通索引
ALTER TABLE users ADD INDEX idx_age (age);
```

**单行写法：添加唯一索引**
`ALTER TABLE <表名> ADD UNIQUE INDEX <索引名> (<列名>);`
```sql
-- 添加唯一索引
ALTER TABLE users ADD UNIQUE INDEX uk_phone (phone);
```

**单行写法：添加主键**
`ALTER TABLE <表名> ADD PRIMARY KEY (<列名>);`
```sql
-- 添加主键
ALTER TABLE users ADD PRIMARY KEY (id);
```

**单行写法：设置不可见索引（8.0+）**
`ALTER TABLE <表名> ALTER INDEX <索引名> INVISIBLE;`
```sql
-- 隐藏索引用于测试删除影响
ALTER TABLE users ALTER INDEX idx_age INVISIBLE;
```

**单行写法：恢复可见索引**
`ALTER TABLE <表名> ALTER INDEX <索引名> VISIBLE;`
```sql
-- 恢复索引可见
ALTER TABLE users ALTER INDEX idx_age VISIBLE;
```

---

## 查看索引

**单行写法：查看表索引**
`SHOW INDEX FROM <表名>;`
```sql
-- 查看 users 表的索引
SHOW INDEX FROM users;
```

**单行写法：查看表索引带库名**
`SHOW INDEX FROM <表名> FROM <库名>;`
```sql
-- 查看指定库的表索引
SHOW INDEX FROM users FROM mydb;
```

**单行写法：查看建表语句含索引**
`SHOW CREATE TABLE <表名>;`
```sql
-- 查看建表语句中包含的索引定义
SHOW CREATE TABLE users;
```

---

## 删除索引

**单行写法：DROP INDEX 删除**
`DROP INDEX <索引名> ON <表名>;`
```sql
-- 删除指定索引
DROP INDEX idx_email ON users;
```

**单行写法：ALTER 删除索引**
`ALTER TABLE <表名> DROP INDEX <索引名>;`
```sql
-- 通过 ALTER 删除索引
ALTER TABLE users DROP INDEX idx_age;
```

**单行写法：删除主键**
`ALTER TABLE <表名> DROP PRIMARY KEY;`
```sql
-- 删除主键索引
ALTER TABLE users DROP PRIMARY KEY;
```

**单行写法：删除全文索引**
`ALTER TABLE <表名> DROP INDEX <索引名>;`
```sql
-- 删除全文索引
ALTER TABLE articles DROP INDEX ft_content;
```

---

## 索引分析

**单行写法：查看执行计划**
`EXPLAIN SELECT <列> FROM <表名> WHERE <条件>;`
```sql
-- 查看查询执行计划
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
```

**单行写法：分析执行计划**
`EXPLAIN ANALYZE SELECT <列> FROM <表名> WHERE <条件>;`
```sql
-- 8.0.18+ 显示实际执行耗时
EXPLAIN ANALYZE SELECT * FROM users WHERE status = 1;
```

**单行写法：查看索引使用情况**
`SELECT * FROM sys.schema_index_statistics WHERE table_schema = '<库名>';`
```sql
-- 查看索引的读写统计
SELECT * FROM sys.schema_index_statistics
WHERE table_schema = 'mydb' AND table_name = 'users';
```

**单行写法：查看未使用的索引**
`SELECT * FROM sys.schema_unused_indexes WHERE object_schema = '<库名>';`
```sql
-- 查找从未被使用的索引
SELECT * FROM sys.schema_unused_indexes WHERE object_schema = 'mydb';
```

---

## 索引维护

**单行写法：分析表更新统计**
`ANALYZE TABLE <表名>;`
```sql
-- 重新分析表统计信息
ANALYZE TABLE users;
```

**单行写法：检查表**
`CHECK TABLE <表名>;`
```sql
-- 检查表是否有错误
CHECK TABLE users;
```

**单行写法：优化表**
`OPTIMIZE TABLE <表名>;`
```sql
-- 优化表回收空间
OPTIMIZE TABLE users;
```

**单行写法：在线添加索引**
`ALTER TABLE <表名> ADD INDEX <索引名> (<列>), ALGORITHM=INPLACE, LOCK=NONE;`
```sql
-- 在线添加索引不阻塞读写
ALTER TABLE users ADD INDEX idx_nickname (nickname), ALGORITHM=INPLACE, LOCK=NONE;
```

**单行写法：即时添加列索引（8.0.12+）**
`ALTER TABLE <表名> ADD INDEX <索引名> (<列>), ALGORITHM=INSTANT;`
```sql
-- 即时操作不影响数据
ALTER TABLE users ADD INDEX idx_status (status), ALGORITHM=INSTANT;
```

---

## 索引设计原则

**单行写法：复合索引最左前缀**
`CREATE INDEX <索引名> ON <表名>(<高频列>, <范围列>);`
```sql
-- 高频等值列在前，范围列在后
CREATE INDEX idx_status_age ON users(status, age);
```

**单行写法：覆盖索引避免回表**
`CREATE INDEX <索引名> ON <表名>(<列1>, <列2>);`
```sql
-- 索引包含查询所需所有列
CREATE INDEX idx_cover ON orders(user_id, status, total_amount);
```

**单行写法：使用 EXPLAIN 验证类型**
`EXPLAIN SELECT <列> FROM <表名> WHERE <条件>;`
```sql
-- 检查 type 列是否为 ref 或 eq_ref
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
```
