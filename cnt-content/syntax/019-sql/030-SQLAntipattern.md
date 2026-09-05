# SQL 反模式 语法速查手册

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## SELECT * 滥用

**基本写法：避免 SELECT \***
`SELECT <明确列名> FROM <表>`
```sql
-- 反模式：SELECT * 性能差且不安全
-- SELECT * FROM employees;

-- 正确：明确指定列
SELECT id, name, dept_id FROM employees;

-- 使用覆盖索引时更需明确列
SELECT id, name FROM employees WHERE dept_id = 5;
```

---

## 不使用 LIMIT 的查询

**基本写法：查询必须限制行数**
`SELECT * FROM <表> LIMIT <数量>`
```sql
-- 反模式：可能返回百万行
-- SELECT * FROM large_table;

-- 正确：加 LIMIT 或分页
SELECT * FROM large_table LIMIT 100;
-- 分页
SELECT * FROM large_table LIMIT 100 OFFSET 200;
```

---

## 索引列使用函数

**基本写法：避免对索引列使用函数**
`WHERE <列> = <值>`
```sql
-- 反模式：函数导致索引失效
-- SELECT * FROM orders WHERE YEAR(create_time) = 2026;

-- 正确：范围查询使用索引
SELECT * FROM orders
WHERE create_time >= '2026-01-01'
  AND create_time < '2027-01-01';
```

---

**基本写法：避免隐式类型转换**
`WHERE <列> = <同类型值>`
```sql
-- 反模式：字符串列用数字查询（隐式转换，索引失效）
-- SELECT * FROM users WHERE phone = 13800138000;

-- 正确：用引号
SELECT * FROM users WHERE phone = '13800138000';
```

---

## 前导通配符

**基本写法：避免 LIKE 前导通配符**
`WHERE <列> LIKE '<前缀>%'`
```sql
-- 反模式：前导 % 导致全表扫描
-- SELECT * FROM users WHERE name LIKE '%abc';

-- 正确：前缀匹配可使用索引
SELECT * FROM users WHERE name LIKE 'abc%';

-- 需要全文搜索时用全文索引
-- MySQL
ALTER TABLE users ADD FULLTEXT INDEX ft_name(name);
SELECT * FROM users WHERE MATCH(name) AGAINST('abc');
```

---

## N+1 查询问题

**基本写法：使用 JOIN 替代循环查询**
`SELECT ... FROM <表1> JOIN <表2> ON <条件>`
```sql
-- 反模式：循环中逐条查询（N+1 查询）
-- 代码中：
-- for user in users:
--   SELECT * FROM orders WHERE user_id = user.id

-- 正确：一次性 JOIN 查询
SELECT u.name, o.order_id, o.amount
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.id IN (1, 2, 3, 4, 5);
```

---

**基本写法：使用 IN 批量查询**
`WHERE <列> IN (<值1>, <值2>, ...)`
```sql
-- 反模式：逐条查询
-- SELECT * FROM users WHERE id = 1;
-- SELECT * FROM users WHERE id = 2;
-- SELECT * FROM users WHERE id = 3;

-- 正确：批量查询
SELECT * FROM users WHERE id IN (1, 2, 3);
```

---

## 事务过大

**基本写法：事务应短小**
`-- 事务中只包含必要的数据库操作`
```sql
-- 反模式：事务中包含网络请求或大量计算
BEGIN;
SELECT * FROM accounts WHERE id = 1;
-- ... HTTP 请求外部服务（耗时 5 秒）
-- ... 大量计算
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;

-- 正确：先准备数据，事务中只做写操作
SELECT * FROM accounts WHERE id = 1;  -- 事务外
-- ... 外部请求和计算
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

---

## 过度使用子查询

**基本写法：用 JOIN 替代子查询**
`SELECT ... FROM <表1> JOIN <表2> ON <条件>`
```sql
-- 反模式：相关子查询性能差
-- SELECT name,
--   (SELECT dept_name FROM departments WHERE id = e.dept_id) AS dept
-- FROM employees e;

-- 正确：使用 JOIN
SELECT e.name, d.dept_name
FROM employees e
LEFT JOIN departments d ON d.id = e.dept_id;
```

---

## 缺少索引

**基本写法：WHERE 和 JOIN 条件列建索引**
`CREATE INDEX <索引名> ON <表>(<列>)`
```sql
-- 反模式：高频查询条件无索引
-- SELECT * FROM orders WHERE user_id = 100 AND status = 'paid';

-- 正确：创建复合索引
CREATE INDEX idx_user_status ON orders(user_id, status);
-- 遵循最左前缀原则
```

---

## 复合索引顺序错误

**基本写法：高选择性列放前面**
`CREATE INDEX <索引名> ON <表>(<高选择性列>, <低选择性列>)`
```sql
-- 反模式：低选择性列在前
-- CREATE INDEX idx_status_user ON orders(status, user_id);

-- 正确：高选择性列在前（user_id 区分度高）
CREATE INDEX idx_user_status ON orders(user_id, status);
```

---

## 存储 JSON 大对象

**基本写法：避免在 SQL 中存储大 JSON**
`-- 关系数据使用规范表结构`
```sql
-- 反模式：单列存储大量 JSON
-- CREATE TABLE config (id INT, data JSON);
-- INSERT INTO config VALUES (1, '{"a":1,"b":2,"c":3,...}');

-- 正确：拆分为关系表
CREATE TABLE config_items (
  config_id INT,
  key_name VARCHAR(100),
  value TEXT
);

-- 如果必须用 JSON，建函数索引（MySQL 5.7+）
ALTER TABLE config ADD COLUMN a INT
  GENERATED ALWAYS AS (JSON_EXTRACT(data, '$.a')) STORED;
CREATE INDEX idx_a ON config(a);
```

---

## 使用 COUNT(*) 判断是否存在

**基本写法：用 EXISTS 替代 COUNT(*)**
`SELECT EXISTS(SELECT 1 FROM <表> WHERE <条件>)`
```sql
-- 反模式：COUNT(*) 需要扫描所有匹配行
-- SELECT COUNT(*) FROM orders WHERE user_id = 1;

-- 正确：EXISTS 找到一行即返回
SELECT EXISTS(
  SELECT 1 FROM orders WHERE user_id = 1
);
```

---

## 日期存储为字符串

**基本写法：使用 DATE/TIMESTAMP 类型**
`CREATE TABLE <表> (<日期列> DATE)`
```sql
-- 反模式：用 VARCHAR 存日期
-- CREATE TABLE events (event_date VARCHAR(20));

-- 正确：使用原生日期类型
CREATE TABLE events (
  event_date DATE,
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 可用日期函数比较和计算
SELECT * FROM events WHERE event_date BETWEEN '2026-01-01' AND '2026-12-31';
```

---

## 忽略外键约束

**基本写法：声明外键保证数据完整性**
`FOREIGN KEY (<列>) REFERENCES <父表>(<列>)`
```sql
-- 反模式：应用层维护关系，可能产生孤儿数据
-- CREATE TABLE orders (id INT, user_id INT);  -- 无外键

-- 正确：数据库层约束
CREATE TABLE orders (
  id INT PRIMARY KEY,
  user_id INT,
  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);
```

---

## 过度使用 ORM 生成的 SQL

**基本写法：关键查询手写优化**
`-- ORM 适用于简单 CRUD，复杂查询需手写`
```sql
-- 反模式：ORM 生成的 N+1 查询或低效 SQL
-- ORM: user.orders.filter(status='paid')  -- 可能生成多条查询

-- 正确：复杂查询手写 SQL 或使用 ORM 的 JOIN 预加载
SELECT u.*, o.*
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE o.status = 'paid';
```

---

## 不使用 EXPLAIN 验证

**基本写法：上线前用 EXPLAIN 检查**
`EXPLAIN <关键查询>`
```sql
-- 反模式：直接上线未经执行计划检查的查询

-- 正确：检查执行计划
EXPLAIN SELECT * FROM orders
WHERE user_id = 100 AND status = 'paid';
-- 确认 type 不是 ALL（全表扫描）
-- 确认 key 使用了正确的索引
-- 确认 rows 不过大
```
