# MySQL SQL 数据操作与查询

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 插入数据

**单行写法：指定列插入单行**
`INSERT INTO <表名> (<列名>[, <列名>...]) VALUES (<值>[, <值>...])`
```sql
-- 指定列插入单行数据
INSERT INTO users (id, username, email, password, age)
VALUES (1, '张三', 'zhangsan@example.com', 'encrypted_pass', 25);
```

**单行写法：省略自增列插入**
`INSERT INTO <表名> (<非自增列>[, ...]) VALUES (<值>[, ...])`
```sql
-- 省略自增主键列插入数据
INSERT INTO users (username, email, password, age)
VALUES ('张三', 'zhangsan@example.com', 'encrypted_pass', 25);
```

**换行写法：SET 语法插入**
`INSERT INTO <表名> SET <列名> = <值>[, <列名> = <值>...]`
```sql
-- 使用 SET 形式插入数据
INSERT INTO users SET
  username = '李四',
  email = 'lisi@example.com',
  password = 'encrypted_pass',
  age = 30;
```

**换行写法：批量插入多行**
`INSERT INTO <表名> (<列名>) VALUES (<值1>), (<值2>)[, ...]`
```sql
-- 批量插入多行数据
INSERT INTO users (username, email, password, age) VALUES
('王五', 'wangwu@example.com', 'pass1', 28),
('赵六', 'zhaoliu@example.com', 'pass2', 32),
('钱七', 'qianqi@example.com', 'pass3', 27);
```

**换行写法：插入查询结果**
`INSERT INTO <表名> (<列名>) SELECT <列名> FROM <源表> [WHERE <条件>]`
```sql
-- 从旧表迁移符合条件的数据
INSERT INTO users (username, email, password, age)
SELECT username, email, password, age FROM old_users WHERE status = 1;
```

**换行写法：插入或更新**
`INSERT INTO <表名> (<列名>) VALUES (<值>) ON DUPLICATE KEY UPDATE <列名> = <值>`
```sql
-- 主键冲突时更新指定字段
INSERT INTO users (id, username, email) VALUES (1, '张三', 'new@example.com')
ON DUPLICATE KEY UPDATE email = 'new@example.com', updated_at = NOW();
```

**单行写法：忽略冲突插入**
`INSERT IGNORE INTO <表名> (<列名>) VALUES (<值>)`
```sql
-- 主键冲突时跳过插入
INSERT IGNORE INTO users (username, email) VALUES ('张三', 'test@example.com');
```

**单行写法：替换插入**
`REPLACE INTO <表名> (<列名>) VALUES (<值>)`
```sql
-- 主键冲突时删除原行再插入
REPLACE INTO users (id, username, email) VALUES (1, '张三', 'new@example.com');
```

**单行写法：获取自增 ID**
`SELECT LAST_INSERT_ID();`
```sql
-- 插入后获取自增主键值
SELECT LAST_INSERT_ID();
```

---

## 更新数据

**单行写法：更新单列**
`UPDATE <表名> SET <列名> = <值> WHERE <条件>`
```sql
-- 更新指定行的单列
UPDATE users SET age = 26 WHERE id = 1;
```

**单行写法：基于原值更新**
`UPDATE <表名> SET <列名> = <列名> <运算符> <值> WHERE <条件>`
```sql
-- 基于原值进行累加更新
UPDATE users SET age = age + 1 WHERE age < 30;
```

**换行写法：多列更新**
`UPDATE <表名> SET <列名> = <值>[, <列名> = <值>...] WHERE <条件>`
```sql
-- 同时更新多个字段
UPDATE users
SET age = 27, email = 'new@example.com', updated_at = NOW()
WHERE id = 1;
```

**换行写法：JOIN 关联更新**
`UPDATE <表1> [AS <别名>] JOIN <表2> [AS <别名>] ON <条件> SET <列名> = <值>`
```sql
-- 关联其他表更新数据
UPDATE users u
JOIN user_profiles p ON u.id = p.user_id
SET u.avatar = p.avatar_url, u.status = p.status
WHERE u.id = 1;
```

**换行写法：子查询更新**
`UPDATE <表名> SET <列名> = (SELECT <聚合> FROM <表> WHERE <条件>)`
```sql
-- 用子查询结果更新字段
UPDATE users
SET balance = (SELECT SUM(amount) FROM orders WHERE user_id = users.id)
WHERE id = 1;
```

---

## 删除数据

**单行写法：条件删除**
`DELETE FROM <表名> WHERE <条件>`
```sql
-- 删除符合条件的行
DELETE FROM users WHERE id = 1;
```

**单行写法：范围删除**
`DELETE FROM <表名> WHERE <条件1> AND <条件2>`
```sql
-- 删除符合多条件的行
DELETE FROM users WHERE status = 0 AND created_at < '2024-01-01';
```

**单行写法：排序后删除指定行数**
`DELETE FROM <表名> ORDER BY <列名> [ASC|DESC] LIMIT <行数>`
```sql
-- 按排序删除前 N 行
DELETE FROM users ORDER BY created_at DESC LIMIT 10;
```

**换行写法：JOIN 关联删除**
`DELETE <别名> FROM <表1> [AS <别名>] JOIN <表2> [AS <别名>] ON <条件> WHERE <条件>`
```sql
-- 关联其他表删除数据
DELETE u FROM users u
JOIN inactive_users i ON u.email = i.email
WHERE u.status = 0;
```

**换行写法：子查询删除**
`DELETE FROM <表名> WHERE <列名> IN (SELECT <列名> FROM <表> WHERE <条件>)`
```sql
-- 用子查询结果删除数据
DELETE FROM users WHERE id IN (SELECT user_id FROM old_users WHERE created_at < '2023-01-01');
```

**单行写法：清空表**
`TRUNCATE TABLE <表名>`
```sql
-- 清空表数据并重置自增值
TRUNCATE TABLE users;
```

---

## 基础查询

**单行写法：查询所有列**
`SELECT * FROM <表名>`
```sql
-- 查询表中所有字段
SELECT * FROM users;
```

**单行写法：查询指定列**
`SELECT <列名>[, <列名>...] FROM <表名>`
```sql
-- 查询指定列数据
SELECT id, username, email FROM users;
```

**单行写法：列别名**
`SELECT <列名> [AS] <别名>`
```sql
-- 使用别名查询字段
SELECT username AS name, email AS "邮箱地址" FROM users;
```

**单行写法：计算列别名**
`SELECT <表达式> AS <别名>`
```sql
-- 计算列并设置别名
SELECT price, quantity, price * quantity AS total FROM order_items;
```

**单行写法：单列去重**
`SELECT DISTINCT <列名> FROM <表名>`
```sql
-- 查询单列去重结果
SELECT DISTINCT status FROM users;
```

**单行写法：多列去重**
`SELECT DISTINCT <列名1>, <列名2>[, ...] FROM <表名>`
```sql
-- 查询多列组合去重结果
SELECT DISTINCT province, city FROM addresses;
```

---

## 条件查询

**单行写法：大于比较**
`WHERE <列名> > <值>`
```sql
-- 查询年龄大于 25 的用户
SELECT * FROM users WHERE age > 25;
```

**单行写法：大于等于比较**
`WHERE <列名> >= <值>`
```sql
-- 查询年龄大于等于 25 的用户
SELECT * FROM users WHERE age >= 25;
```

**单行写法：小于比较**
`WHERE <列名> < <值>`
```sql
-- 查询年龄小于 30 的用户
SELECT * FROM users WHERE age < 30;
```

**单行写法：不等于比较**
`WHERE <列名> <!=|<>> <值>`
```sql
-- 查询年龄不等于 25 的用户
SELECT * FROM users WHERE age != 25;
```

**单行写法：AND 逻辑与**
`WHERE <条件1> AND <条件2>`
```sql
-- 查询同时满足多条件的用户
SELECT * FROM users WHERE age > 25 AND status = 1;
```

**单行写法：OR 逻辑或**
`WHERE <条件1> OR <条件2>`
```sql
-- 查询满足任一条件的用户
SELECT * FROM users WHERE status = 1 OR status = 2;
```

**单行写法：NOT 逻辑非**
`WHERE NOT <条件>`
```sql
-- 查询不满足条件的用户
SELECT * FROM users WHERE NOT status = 0;
```

**换行写法：括号组合条件**
`WHERE (<条件1> AND <条件2>) OR (<条件3> AND <条件4>)`
```sql
-- 使用括号组合复杂条件
SELECT * FROM users
WHERE (age > 25 AND status = 1) OR (age < 20 AND status = 2);
```

**单行写法：数值范围查询**
`WHERE <列名> [NOT] BETWEEN <起始> AND <结束>`
```sql
-- 查询年龄在 20 到 30 之间的用户
SELECT * FROM users WHERE age BETWEEN 20 AND 30;
```

**单行写法：日期范围查询**
`WHERE <日期列> BETWEEN '<起始日期>' AND '<结束日期>'`
```sql
-- 查询指定日期范围内的用户
SELECT * FROM users WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31';
```

**单行写法：IN 多值匹配**
`WHERE <列名> [NOT] IN (<值1>, <值2>[, ...])`
```sql
-- 查询状态为指定值的用户
SELECT * FROM users WHERE status IN (1, 2, 3);
```

**单行写法：IN 子查询**
`WHERE <列名> IN (SELECT <列名> FROM <表名>)`
```sql
-- 查询属于 VIP 用户表的用户
SELECT * FROM users WHERE id IN (SELECT user_id FROM vip_users);
```

**单行写法：前缀模糊查询**
`WHERE <列名> [NOT] LIKE '<前缀>%'`
```sql
-- 查询以指定字符开头的用户名
SELECT * FROM users WHERE username LIKE '张%';
```

**单行写法：包含模糊查询**
`WHERE <列名> LIKE '%<子串>%'`
```sql
-- 查询包含指定字符的用户名
SELECT * FROM users WHERE username LIKE '%张%';
```

**单行写法：单字符匹配模糊查询**
`WHERE <列名> LIKE '<前缀>_'`
```sql
-- 查询指定前缀加单字符的用户名
SELECT * FROM users WHERE username LIKE '张_';
```

**单行写法：指定转义符模糊查询**
`WHERE <列名> LIKE '<模式>' ESCAPE '<转义符>'`
```sql
-- 使用指定转义符查询包含百分号的数据
SELECT * FROM users WHERE username LIKE '%100\%%' ESCAPE '\';
```

**单行写法：查询空值**
`WHERE <列名> IS NULL`
```sql
-- 查询邮箱为空的用户
SELECT * FROM users WHERE email IS NULL;
```

**单行写法：查询非空值**
`WHERE <列名> IS NOT NULL`
```sql
-- 查询已删除的用户
SELECT * FROM users WHERE deleted_at IS NOT NULL;
```

---

## 排序与分页

**单行写法：升序排序**
`ORDER BY <列名> ASC`
```sql
-- 按年龄升序排序
SELECT * FROM users ORDER BY age ASC;
```

**单行写法：降序排序**
`ORDER BY <列名> DESC`
```sql
-- 按创建时间降序排序
SELECT * FROM users ORDER BY created_at DESC;
```

**单行写法：多列排序**
`ORDER BY <列名1> [ASC|DESC], <列名2> [ASC|DESC]`
```sql
-- 先按状态升序再按年龄降序排序
SELECT * FROM users ORDER BY status ASC, age DESC;
```

**单行写法：按列位置排序**
`ORDER BY <列位置序号>`
```sql
-- 按查询列的位置序号排序
SELECT id, username, email FROM users ORDER BY 3;
```

**单行写法：取前 N 行**
`LIMIT <行数>`
```sql
-- 取前 10 行数据
SELECT * FROM users LIMIT 10;
```

**单行写法：分页查询**
`LIMIT <行数> OFFSET <偏移>`
```sql
-- 查询第 2 页数据（每页 10 行）
SELECT * FROM users LIMIT 10 OFFSET 10;
```

**单行写法：分页简写形式**
`LIMIT <偏移>, <行数>`
```sql
-- 使用简写形式分页查询
SELECT * FROM users LIMIT 10, 10;
```

**单行写法：排序后取前 N 行**
`SELECT * FROM <表名> ORDER BY <列名> [DESC] LIMIT <行数>`
```sql
-- 按降序排序后取前 5 行
SELECT * FROM users ORDER BY id DESC LIMIT 5;
```

---

## 分组查询

**换行写法：单列分组统计**
`SELECT <分组列>, <聚合函数>(<列名>) FROM <表名> GROUP BY <分组列>`
```sql
-- 按状态分组统计用户数量
SELECT status, COUNT(*) AS count FROM users GROUP BY status;
```

**换行写法：多列分组统计**
`SELECT <列名1>, <列名2>, <聚合函数>(<列名>) FROM <表名> GROUP BY <列名1>, <列名2>`
```sql
-- 按省份和城市分组统计用户数量
SELECT province, city, COUNT(*) AS count FROM users GROUP BY province, city;
```

**换行写法：分组求平均值**
`SELECT <分组列>, AVG(<列名>) FROM <表名> GROUP BY <分组列>`
```sql
-- 按状态分组求平均年龄
SELECT status, AVG(age) AS avg_age FROM users GROUP BY status;
```

**换行写法：分组过滤**
`SELECT <列名> FROM <表名> GROUP BY <列名> HAVING <过滤条件>`
```sql
-- 过滤分组结果只保留数量大于 10 的组
SELECT status, COUNT(*) AS count
FROM users
GROUP BY status
HAVING count > 10;
```

**换行写法：WHERE 与 HAVING 组合**
`SELECT <列名> FROM <表名> WHERE <条件> GROUP BY <列名> HAVING <过滤条件>`
```sql
-- 先过滤行再分组最后过滤分组
SELECT status, AVG(age) AS avg_age, COUNT(*) AS count
FROM users
WHERE age > 0
GROUP BY status
HAVING count > 5 AND avg_age > 25;
```

---

## 聚合函数

**单行写法：总行数计数**
`COUNT(*)`
```sql
-- 统计表的总行数
SELECT COUNT(*) FROM users;
```

**单行写法：非空计数**
`COUNT(<列名>)`
```sql
-- 统计邮箱非空的行数
SELECT COUNT(email) FROM users;
```

**单行写法：去重计数**
`COUNT(DISTINCT <列名>)`
```sql
-- 统计状态去重后的数量
SELECT COUNT(DISTINCT status) FROM users;
```

**单行写法：求和**
`SUM(<列名>)`
```sql
-- 统计所有用户余额总和
SELECT SUM(balance) AS total_balance FROM users;
```

**单行写法：求平均值**
`AVG(<列名>)`
```sql
-- 统计用户平均年龄
SELECT AVG(age) AS avg_age FROM users;
```

**单行写法：求最大值**
`MAX(<列名>)`
```sql
-- 查询商品最高价格
SELECT MAX(price) AS max_price FROM products;
```

**单行写法：求最小值**
`MIN(<列名>)`
```sql
-- 查询商品最低价格
SELECT MIN(price) AS min_price FROM products;
```

**换行写法：分组拼接字符串**
`GROUP_CONCAT(<列名> [SEPARATOR '<分隔符>'])`
```sql
-- 按状态分组拼接用户名
SELECT status, GROUP_CONCAT(username SEPARATOR ',') AS names
FROM users GROUP BY status;
```
