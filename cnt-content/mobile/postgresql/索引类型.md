# PostgreSQL 索引类型

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## B-Tree 索引

**单行写法：创建单列 B-Tree 索引**
`CREATE INDEX <索引名> ON <表名>(<列名>)`
```sql
-- 为用户名列创建 B-Tree 索引
CREATE INDEX idx_username ON users(username);
```

**单行写法：创建复合 B-Tree 索引**
`CREATE INDEX <索引名> ON <表名>(<列名1>, <列名2>[, ...])`
```sql
-- 为用户名和状态列创建复合索引
CREATE INDEX idx_name_status ON users(username, status);
```

**单行写法：创建唯一 B-Tree 索引**
`CREATE UNIQUE INDEX <索引名> ON <表名>(<列名>)`
```sql
-- 为邮箱列创建唯一索引
CREATE UNIQUE INDEX idx_email ON users(email);
```

---

## Hash 索引

**单行写法：创建 Hash 索引**
`CREATE INDEX <索引名> ON <表名> USING HASH (<列名>)`
```sql
-- 为用户 ID 创建 Hash 索引
CREATE INDEX idx_user_id_hash ON users USING HASH (user_id);
```

---

## GiST 索引

**单行写法：创建 GiST 索引**
`CREATE INDEX <索引名> ON <表名> USING GIST (<列名>)`
```sql
-- 为地理位置列创建 GiST 索引
CREATE INDEX idx_location ON places USING GIST (location);
```

**单行写法：创建 GiST 范围索引**
`CREATE INDEX <索引名> ON <表名> USING GIST (<范围列>)`
```sql
-- 为时间范围列创建 GiST 索引
CREATE INDEX idx_time_range ON schedules USING GIST (time_range);
```

---

## GIN 索引

**单行写法：创建 GIN 索引**
`CREATE INDEX <索引名> ON <表名> USING GIN (<列名>)`
```sql
-- 为 JSONB 列创建 GIN 索引
CREATE INDEX idx_tags ON articles USING GIN (tags);
```

**单行写法：创建 JSONB 路径 GIN 索引**
`CREATE INDEX <索引名> ON <表名> USING GIN (<列名> jsonb_path_ops)`
```sql
-- 为 JSONB 列创建路径操作符 GIN 索引
CREATE INDEX idx_profile ON users USING GIN (profile jsonb_path_ops);
```

**单行写法：创建数组 GIN 索引**
`CREATE INDEX <索引名> ON <表名> USING GIN (<数组列>)`
```sql
-- 为数组列创建 GIN 索引
CREATE INDEX idx_tags_array ON posts USING GIN (tags);
```

---

## BRIN 索引

**单行写法：创建 BRIN 索引**
`CREATE INDEX <索引名> ON <表名> USING BRIN (<列名>)`
```sql
-- 为时间戳列创建 BRIN 索引
CREATE INDEX idx_created ON logs USING BRIN (created_at);
```

**单行写法：指定 BRIN 块大小**
`CREATE INDEX <索引名> ON <表名> USING BRIN (<列名>) WITH (pages_per_range = <数量>)`
```sql
-- 指定 BRIN 块范围大小
CREATE INDEX idx_created ON logs USING BRIN (created_at) WITH (pages_per_range = 128);
```

---

## 部分索引

**换行写法：创建部分索引**
`CREATE INDEX <索引名> ON <表名>(<列名>) WHERE <条件>`
```sql
-- 仅为活跃用户创建索引
CREATE INDEX idx_active_users ON users(username) WHERE status = 1;
```

---

## 表达式索引

**换行写法：创建表达式索引**
`CREATE INDEX <索引名> ON <表名>(<表达式>)`
```sql
-- 为小写邮箱创建表达式索引
CREATE INDEX idx_email_lower ON users(LOWER(email));
```

**换行写法：创建函数表达式索引**
`CREATE INDEX <索引名> ON <表名>(<函数>(<列名>))`
```sql
-- 为日期提取创建表达式索引
CREATE INDEX idx_created_date ON orders(DATE(created_at));
```

---

## 索引管理

**单行写法：查看表索引**
`SELECT <列名> FROM pg_indexes WHERE <条件>`
```sql
-- 查看表的索引信息
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users';
```

**单行写法：查看索引大小**
`SELECT pg_size_pretty(pg_relation_size('<索引名>'))`
```sql
-- 查看索引占用空间
SELECT pg_size_pretty(pg_relation_size('idx_username'));
```

**单行写法：删除索引**
`DROP INDEX [IF EXISTS] <索引名>`
```sql
-- 删除索引
DROP INDEX IF EXISTS idx_username;
```

**单行写法：CONCURRENTLY 创建索引**
`CREATE INDEX CONCURRENTLY <索引名> ON <表名>(<列名>)`
```sql
-- 并发创建索引不阻塞写入
CREATE INDEX CONCURRENTLY idx_email ON users(email);
```

**单行写法：CONCURRENTLY 删除索引**
`DROP INDEX CONCURRENTLY <索引名>`
```sql
-- 并发删除索引不阻塞写入
DROP INDEX CONCURRENTLY idx_email;
```

**单行写法：重建索引**
`REINDEX INDEX <索引名>`
```sql
-- 重建索引
REINDEX INDEX idx_username;
```

**单行写法：重建表所有索引**
`REINDEX TABLE <表名>`
```sql
-- 重建表的所有索引
REINDEX TABLE users;
```

**单行写法：查看索引使用情况**
`SELECT <列名> FROM pg_stat_user_indexes WHERE <条件>`
```sql
-- 查看索引使用统计
SELECT indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE relname = 'users';
```
