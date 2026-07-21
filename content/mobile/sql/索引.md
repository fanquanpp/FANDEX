# 索引

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## CREATE INDEX

**单行写法：创建单列索引**
`CREATE INDEX <索引名> ON <表名>(<列>);`
```sql
-- 在用户表的 email 列上创建索引
CREATE INDEX idx_email ON users(email);
```

**单行写法：创建复合索引**
`CREATE INDEX <索引名> ON <表名>(<列 1>, <列 2>);`
```sql
-- 在用户表的姓和名列上创建复合索引
CREATE INDEX idx_name ON users(last_name, first_name);
```

**单行写法：创建唯一索引**
`CREATE UNIQUE INDEX <索引名> ON <表名>(<列>);`
```sql
-- 在用户表的 email 列上创建唯一索引
CREATE UNIQUE INDEX idx_unique_email ON users(email);
```

**单行写法：创建表时定义索引**
`INDEX <索引名> (<列>)`
```sql
-- 创建表时同时创建索引
CREATE TABLE users (
  id INT PRIMARY KEY,
  email VARCHAR(255),
  INDEX idx_email (email)
);
```

---

## DROP INDEX

**单行写法：删除索引**
`DROP INDEX <索引名> ON <表名>;`
```sql
-- 删除用户表上的索引
DROP INDEX idx_email ON users;
```

**单行写法：PostgreSQL 删除索引**
`DROP INDEX <索引名>;`
```sql
-- PostgreSQL 删除索引
DROP INDEX idx_email;
```

**单行写法：删除索引时判断是否存在**
`DROP INDEX IF EXISTS <索引名>;`
```sql
-- 仅在索引存在时删除
DROP INDEX IF EXISTS idx_email;
```

---

## 复合索引

**单行写法：创建复合索引**
`CREATE INDEX <索引名> ON <表名>(<列 1>, <列 2>, <列 3>);`
```sql
-- 创建三列复合索引
CREATE INDEX idx_dept_status_salary ON employees(dept_id, status, salary);
```

**单行写法：最左前缀匹配查询**
`WHERE <列 1> = <值> AND <列 2> = <值>`
```sql
-- 使用复合索引的前两列（可利用索引）
SELECT * FROM employees WHERE dept_id = 5 AND status = 'active';
```

**单行写法：跳过中间列无法利用索引**
`WHERE <列 1> = <值> AND <列 3> = <值>`
```sql
-- 跳过 status 列，仅 dept_id 可利用索引
SELECT * FROM employees WHERE dept_id = 5 AND salary > 50000;
```

---

## 覆盖索引

**换行写法：索引包含查询所需所有列**
`CREATE INDEX <索引名> ON <表名>(<列 1>, <列 2>, <列 3>)`
```sql
-- 创建覆盖索引，避免回表查询
CREATE INDEX idx_covering ON orders(user_id, status, amount);
```

**换行写法：覆盖索引查询**
`SELECT <索引列> FROM <表名> WHERE <索引列条件>`
```sql
-- 查询列都在索引中，无需回表
SELECT user_id, status, amount FROM orders WHERE user_id = 100;
```

---

## 函数索引

**单行写法：PostgreSQL 函数索引**
`CREATE INDEX <索引名> ON <表名>(<函数>(<列>));`
```sql
-- 在 email 列的小写形式上创建索引
CREATE INDEX idx_lower_email ON users(LOWER(email));
```

**单行写法：MySQL 函数索引**
`CREATE INDEX <索引名> ON <表名>((<表达式>));`
```sql
-- MySQL 8.0+ 函数索引
CREATE INDEX idx_lower_email ON users((LOWER(email)));
```

---

## 前缀索引

**单行写法：MySQL 前缀索引**
`CREATE INDEX <索引名> ON <表名>(<列>(<前缀长度>));`
```sql
-- 在 email 列前 10 个字符上创建索引
CREATE INDEX idx_email_prefix ON users(email(10));
```

---

## 全文索引

**单行写法：MySQL 全文索引**
`CREATE FULLTEXT INDEX <索引名> ON <表名>(<列>);`
```sql
-- 在文章内容列上创建全文索引
CREATE FULLTEXT INDEX idx_content ON articles(content);
```

**换行写法：创建表时定义全文索引**
`FULLTEXT INDEX <索引名> (<列>)`
```sql
-- 创建表时同时创建全文索引
CREATE TABLE articles (
  id INT PRIMARY KEY,
  title VARCHAR(200),
  content TEXT,
  FULLTEXT INDEX idx_content (content)
);
```

**单行写法：PostgreSQL GIN 索引**
`CREATE INDEX <索引名> ON <表名> USING GIN(to_tsvector(<配置>, <列>));`
```sql
-- 在文章内容列上创建 GIN 全文索引
CREATE INDEX idx_content ON articles USING GIN(to_tsvector('english', content));
```

---

## 空间索引

**单行写法：MySQL 空间索引**
`CREATE SPATIAL INDEX <索引名> ON <表名>(<列>);`
```sql
-- 在地理位置列上创建空间索引
CREATE SPATIAL INDEX idx_location ON stores(location);
```

---

## 索引查看

**单行写法：MySQL 查看索引**
`SHOW INDEX FROM <表名>;`
```sql
-- 查看用户表上的所有索引
SHOW INDEX FROM users;
```

**换行写法：PostgreSQL 查看索引**
`SELECT * FROM pg_indexes WHERE tablename = '<表名>';`
```sql
-- 查看用户表上的所有索引
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users';
```

**单行写法：SQL Server 查看索引**
`EXEC sp_helpindex '<表名>';`
```sql
-- 查看用户表上的所有索引
EXEC sp_helpindex 'users';
```

---

## 索引重建

**单行写法：MySQL 重建索引**
`ALTER TABLE <表名> REBUILD INDEX <索引名>;`
```sql
-- 重建用户表上的索引
ALTER TABLE users REBUILD INDEX idx_email;
```

**单行写法：PostgreSQL 重建索引**
`REINDEX INDEX <索引名>;`
```sql
-- 重建指定索引
REINDEX INDEX idx_email;
```

**单行写法：PostgreSQL 并发重建索引**
`REINDEX INDEX CONCURRENTLY <索引名>;`
```sql
-- 并发重建索引（不阻塞写入）
REINDEX INDEX CONCURRENTLY idx_email;
```

---

## 索引分析

**单行写法：MySQL 分析执行计划**
`EXPLAIN <SQL 语句>;`
```sql
-- 分析查询是否使用索引
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
```

**换行写法：PostgreSQL 分析执行计划**
`EXPLAIN ANALYZE <SQL 语句>;`
```sql
-- 分析查询执行计划并实际执行
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```
