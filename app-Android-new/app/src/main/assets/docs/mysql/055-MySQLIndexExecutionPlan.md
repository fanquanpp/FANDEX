---
order: 550
title: MySQL 索引与执行计划
module: 'mysql'
category: 数据库
difficulty: intermediate
description: B+Tree 索引、EXPLAIN 分析与索引优化策略。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'mysql/053-InnoDBSystemArchitecture'
  - 'mysql/054-DataEncryption'
  - 'mysql/056-MySQL9NewFeaturesParallelQuery'
  - 'mysql/057-VectorType'
prerequisites:
  - 'mysql/089-View'
---

## 1. 索引是什么 (What is an Index)

索引是为了加速检索而构建的数据结构。对 InnoDB 来说，常见索引是 B+Tree。
索引带来的收益：

- 加速 `WHERE` 过滤、`JOIN`、`ORDER BY`、`GROUP BY`
  索引带来的成本：
- 写入变慢（INSERT/UPDATE/DELETE 需要维护索引）
- 占用更多空间
- 设计不当会让查询优化器选错计划或无法利用索引

## 2. InnoDB 索引要点 (InnoDB Basics)

### 2.1 聚簇索引与二级索引

- 主键索引（聚簇索引）：叶子节点存放整行数据
- 二级索引：叶子节点存放“索引列 + 主键值”
  因此：
- 用二级索引命中后，可能需要回表（根据主键再查一次聚簇索引）
- 覆盖索引可以避免回表（查询列都在索引里）

## 3. 组合索引与最左前缀 (Composite Index)

假设有索引 `(a, b, c)`：

- 能有效利用：`a`、`a,b`、`a,b,c` 的前缀过滤
- 不能跳过前缀：只用 `b` 或 `c` 往往无法走该索引
  实践建议：
- 把区分度更高、过滤更强的列放在前面（但也要结合排序/分组需求）
- 频繁按 `(tenant_id, created_at)` 查询，优先建立组合索引

## 4. 什么时候索引会失效 (When Index Isn’t Used)

常见原因：

- 对索引列做函数/表达式：`WHERE DATE(created_at) = ...`
- 隐式类型转换：字符串与数字混用导致无法利用索引
- 前缀缺失：组合索引没用到最左前缀
- `LIKE '%xxx'` 前置通配符无法利用普通 B+Tree 索引
- 返回行数过多：优化器认为全表扫描更便宜

## 5. EXPLAIN 怎么看 (How to Read EXPLAIN)

常用字段（MySQL 8）：

- `type`：访问类型（从好到差大致：`const`/`ref`/`range`/`index`/`ALL`）
- `key`：实际使用的索引
- `rows`：估算扫描行数
- `Extra`：额外信息（例如 `Using index`、`Using filesort`、`Using temporary`）
  示例：

```sql
 EXPLAIN
 SELECT id, email
 from user_account
 WHERE email = 'a@b.com';
```

解读目标：

- 是否使用了期望的索引（`key`）
- 扫描行数是否可控（`rows`）
- 是否出现 `Using filesort` / `Using temporary`（可能需要优化索引或 SQL）

## 6. 建索引的实用策略 (Practical Strategy)

- 先写出典型查询，再反推索引，而不是“先建一堆索引”
- 一张表的索引数量控制在合理范围，避免写放大
- 组合索引优先覆盖高频查询路径
- 长字符串字段用前缀索引需谨慎（会影响选择性与排序能力）
- 对时间范围查询：`(tenant_id, created_at)` 常见有效

## 7. 小结 (Summary)

- 索引是“以写换读”的典型优化手段
- 组合索引与最左前缀是 MySQL 索引设计的核心
- EXPLAIN 是验证索引是否生效的第一工具

---

## 索引创建

**单行写法：创建单列普通索引**
`CREATE INDEX <索引名> ON <表名>(<列名>)`
```sql
-- 为用户名列创建普通索引
CREATE INDEX idx_username ON users(username);
```

**单行写法：创建复合索引**
`CREATE INDEX <索引名> ON <表名>(<列名1>, <列名2>[, ...])`
```sql
-- 为用户名和状态列创建复合索引
CREATE INDEX idx_name_status ON users(username, status);
```

**单行写法：创建单列唯一索引**
`CREATE UNIQUE INDEX <索引名> ON <表名>(<列名>)`
```sql
-- 为邮箱列创建唯一索引
CREATE UNIQUE INDEX idx_email ON users(email);
```

**单行写法：创建复合唯一索引**
`CREATE UNIQUE INDEX <索引名> ON <表名>(<列名1>, <列名2>[, ...])`
```sql
-- 为订单 ID 和产品 ID 创建复合唯一索引
CREATE UNIQUE INDEX idx_order_product ON order_items(order_id, product_id);
```

**单行写法：创建前缀索引**
`CREATE INDEX <索引名> ON <表名>(<列名>(<长度>))`
```sql
-- 为长字符串邮箱列创建前缀索引
CREATE INDEX idx_email_prefix ON users(email(10));
```

**单行写法：创建全文索引**
`ALTER TABLE <表名> ADD FULLTEXT INDEX <索引名> (<列名>[, <列名>...])`
```sql
-- 为文章标题和内容创建全文索引
ALTER TABLE articles ADD FULLTEXT INDEX ft_title_content (title, content);
```

**单行写法：通过 ALTER TABLE 添加普通索引**
`ALTER TABLE <表名> ADD INDEX <索引名> (<列名>[, <列名>...])`
```sql
-- 通过 ALTER TABLE 添加普通索引
ALTER TABLE users ADD INDEX idx_age (age);
```

**单行写法：通过 ALTER TABLE 添加唯一索引**
`ALTER TABLE <表名> ADD UNIQUE INDEX <索引名> (<列名>[, <列名>...])`
```sql
-- 通过 ALTER TABLE 添加唯一索引
ALTER TABLE users ADD UNIQUE INDEX idx_phone (phone);
```

**单行写法：通过 ALTER TABLE 添加复合索引**
`ALTER TABLE <表名> ADD INDEX <索引名> (<列名1>, <列名2>[, ...])`
```sql
-- 通过 ALTER TABLE 添加复合索引
ALTER TABLE users ADD INDEX idx_age_gender (age, gender);
```

---

## 索引查看与删除

**单行写法：查看表索引**
`SHOW INDEX FROM <表名>`
```sql
-- 查看表的索引信息
SHOW INDEX FROM users;
```

**单行写法：竖向显示索引**
`SHOW INDEX FROM <表名>\G`
```sql
-- 竖向显示表索引信息
SHOW INDEX FROM users\G
```

**单行写法：删除索引**
`DROP INDEX <索引名> ON <表名>`
```sql
-- 删除指定索引
DROP INDEX idx_username ON users;
```

**单行写法：删除主键索引**
`ALTER TABLE <表名> DROP PRIMARY KEY`
```sql
-- 删除主键索引
ALTER TABLE users DROP PRIMARY KEY;
```

---

## 复合索引与最左前缀

**单行写法：创建复合索引**
`CREATE INDEX <索引名> ON <表名>(<列1>, <列2>, <列3>)`
```sql
-- 为状态和创建时间创建复合索引
CREATE INDEX idx_status_created ON users(status, created_at);
```

**单行写法：使用前缀列查询（能利用索引）**
`SELECT * FROM <表名> WHERE <前缀列> <操作符> <值>`
```sql
-- 使用复合索引的第一列查询能利用索引
SELECT * FROM users WHERE status = 1;
```

**单行写法：使用前缀列组合查询（能利用索引）**
`SELECT * FROM <表名> WHERE <前缀列1> <操作符> <值> AND <前缀列2> <操作符> <值>`
```sql
-- 使用复合索引的前两列查询能利用索引
SELECT * FROM users WHERE status = 1 AND created_at > '2024-01-01';
```

**单行写法：跳过前缀列查询（不能利用索引）**
`SELECT * FROM <表名> WHERE <非前缀列> <操作符> <值>`
```sql
-- 跳过第一列查询不能利用索引
SELECT * FROM users WHERE created_at > '2024-01-01';
```

---

## EXPLAIN 执行计划

**换行写法：查看 SELECT 执行计划**
`EXPLAIN <SELECT 语句>`
```sql
-- 查看查询的执行计划
EXPLAIN
SELECT id, email
FROM user_account
WHERE email = 'a@b.com';
```

**单行写法：查看 UPDATE 执行计划**
`EXPLAIN <UPDATE 语句>`
```sql
-- 查看更新语句的执行计划
EXPLAIN UPDATE users SET status = 0 WHERE last_login_time < '2023-01-01';
```

---

## 覆盖索引

**单行写法：使用覆盖索引避免回表**
`SELECT <索引列> FROM <表名> WHERE <索引列> <操作符> <值>`
```sql
-- 查询列都在索引中避免回表
SELECT id, email FROM users WHERE email = 'test@example.com';
```

---

## 索引失效场景

**单行写法：函数导致索引失效**
`WHERE <函数>(<列名>) <操作符> <值>`
```sql
-- 对索引列使用函数导致索引失效
SELECT * FROM users WHERE DATE(created_at) = '2024-01-01';
```

**单行写法：改写为范围查询利用索引**
`WHERE <列名> >= '<起始>' AND <列名> < '<结束>'`
```sql
-- 改写为范围查询以利用索引
SELECT * FROM users WHERE created_at >= '2024-01-01' AND created_at < '2024-01-02';
```

**单行写法：隐式类型转换导致索引失效**
`WHERE <列名> = <不同类型值>`
```sql
-- 字符串列与数字比较导致索引失效
SELECT * FROM users WHERE phone = 13800138000;
```

**单行写法：使用正确类型利用索引**
`WHERE <列名> = '<字符串值>'`
```sql
-- 使用字符串值以利用索引
SELECT * FROM users WHERE phone = '13800138000';
```

**单行写法：LIKE 前置通配符导致索引失效**
`WHERE <列名> LIKE '%<模式>'`
```sql
-- 前置通配符导致索引失效
SELECT * FROM users WHERE username LIKE '%张';
```

**单行写法：LIKE 后置通配符利用索引**
`WHERE <列名> LIKE '<前缀>%'`
```sql
-- 后置通配符能利用索引
SELECT * FROM users WHERE username LIKE '张%';
```
