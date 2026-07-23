# MySQL 索引与执行计划

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

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
