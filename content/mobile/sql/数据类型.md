# 数据类型

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 整数类型

**单行写法：定义 TINYINT 列**
`<列名> TINYINT`
```sql
-- 定义 TINYINT 类型列（1 字节，-128 到 127）
CREATE TABLE products (id INT, stock TINYINT);
```

**单行写法：定义 SMALLINT 列**
`<列名> SMALLINT`
```sql
-- 定义 SMALLINT 类型列（2 字节，-32768 到 32767）
CREATE TABLE products (id INT, quantity SMALLINT);
```

**单行写法：定义 INT 列**
`<列名> INT`
```sql
-- 定义 INT 类型列（4 字节，-2147483648 到 2147483647）
CREATE TABLE users (id INT, age INT);
```

**单行写法：定义 BIGINT 列**
`<列名> BIGINT`
```sql
-- 定义 BIGINT 类型列（8 字节，大范围整数）
CREATE TABLE orders (id BIGINT, user_id BIGINT);
```

**单行写法：定义无符号整数**
`<列名> INT UNSIGNED`
```sql
-- 定义无符号 INT 列（MySQL，0 到 4294967295）
CREATE TABLE products (id INT UNSIGNED, price INT UNSIGNED);
```

---

## 定点数与浮点数

**单行写法：定义 DECIMAL 列**
`<列名> DECIMAL(<精度>, <标度>)`
```sql
-- 定义 DECIMAL 类型列（精确小数，推荐用于金额）
CREATE TABLE products (id INT, price DECIMAL(10, 2));
```

**单行写法：定义 NUMERIC 列**
`<列名> NUMERIC(<精度>, <标度>)`
```sql
-- 定义 NUMERIC 类型列（等价于 DECIMAL）
CREATE TABLE accounts (id INT, balance NUMERIC(15, 2));
```

**单行写法：定义 FLOAT 列**
`<列名> FLOAT`
```sql
-- 定义 FLOAT 类型列（单精度浮点数，4 字节）
CREATE TABLE sensors (id INT, temperature FLOAT);
```

**单行写法：定义 DOUBLE 列**
`<列名> DOUBLE`
```sql
-- 定义 DOUBLE 类型列（双精度浮点数，8 字节）
CREATE TABLE measurements (id INT, value DOUBLE);
```

**单行写法：定义 REAL 列**
`<列名> REAL`
```sql
-- 定义 REAL 类型列（单精度浮点数）
CREATE TABLE sensors (id INT, temperature REAL);
```

---

## 字符串类型

**单行写法：定义 CHAR 列**
`<列名> CHAR(<长度>)`
```sql
-- 定义 CHAR 类型列（固定长度字符串）
CREATE TABLE users (id INT, gender CHAR(1));
```

**单行写法：定义 VARCHAR 列**
`<列名> VARCHAR(<最大长度>)`
```sql
-- 定义 VARCHAR 类型列（可变长度字符串）
CREATE TABLE users (id INT, name VARCHAR(100));
```

**单行写法：定义 TEXT 列**
`<列名> TEXT`
```sql
-- 定义 TEXT 类型列（大文本数据）
CREATE TABLE articles (id INT, content TEXT);
```

**单行写法：定义 PostgreSQL TEXT 列**
`<列名> TEXT`
```sql
-- PostgreSQL 中 TEXT 无长度限制
CREATE TABLE articles (id INT, content TEXT);
```

---

## 日期时间类型

**单行写法：定义 DATE 列**
`<列名> DATE`
```sql
-- 定义 DATE 类型列（仅日期，YYYY-MM-DD）
CREATE TABLE users (id INT, birth_date DATE);
```

**单行写法：定义 TIME 列**
`<列名> TIME`
```sql
-- 定义 TIME 类型列（仅时间，HH:MM:SS）
CREATE TABLE events (id INT, start_time TIME);
```

**单行写法：定义 DATETIME 列**
`<列名> DATETIME`
```sql
-- 定义 DATETIME 类型列（日期时间，MySQL）
CREATE TABLE orders (id INT, created_at DATETIME);
```

**单行写法：定义 TIMESTAMP 列**
`<列名> TIMESTAMP`
```sql
-- 定义 TIMESTAMP 类型列（时间戳）
CREATE TABLE logs (id INT, log_time TIMESTAMP);
```

**单行写法：定义带时区的 TIMESTAMP 列**
`<列名> TIMESTAMP WITH TIME ZONE`
```sql
-- 定义带时区的 TIMESTAMP 列（PostgreSQL）
CREATE TABLE events (id INT, event_time TIMESTAMP WITH TIME ZONE);
```

---

## 布尔类型

**单行写法：定义 BOOLEAN 列**
`<列名> BOOLEAN`
```sql
-- 定义 BOOLEAN 类型列（PostgreSQL）
CREATE TABLE users (id INT, is_active BOOLEAN);
```

**单行写法：MySQL 用 TINYINT 模拟 BOOLEAN**
`<列名> TINYINT(1)`
```sql
-- MySQL 用 TINYINT(1) 模拟布尔类型
CREATE TABLE users (id INT, is_active TINYINT(1));
```

---

## 二进制类型

**单行写法：定义 BLOB 列**
`<列名> BLOB`
```sql
-- 定义 BLOB 类型列（二进制大对象）
CREATE TABLE files (id INT, file_data BLOB);
```

**单行写法：定义 BYTEA 列**
`<列名> BYTEA`
```sql
-- 定义 BYTEA 类型列（PostgreSQL 二进制数据）
CREATE TABLE files (id INT, file_data BYTEA);
```

**单行写法：定义 VARBINARY 列**
`<列名> VARBINARY(<最大长度>)`
```sql
-- 定义 VARBINARY 类型列（可变长度二进制）
CREATE TABLE images (id INT, thumbnail VARBINARY(1024));
```

---

## JSON 类型

**单行写法：定义 JSON 列**
`<列名> JSON`
```sql
-- 定义 JSON 类型列（MySQL 5.7+/PostgreSQL）
CREATE TABLE users (id INT, preferences JSON);
```

**单行写法：定义 JSONB 列**
`<列名> JSONB`
```sql
-- 定义 JSONB 类型列（PostgreSQL，二进制 JSON，支持索引）
CREATE TABLE users (id INT, preferences JSONB);
```

---

## 枚举类型

**换行写法：PostgreSQL 创建枚举类型**
`CREATE TYPE <类型名> AS ENUM (<值 1>, <值 2>, ...)`
```sql
-- 创建订单状态枚举类型
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered');
```

**单行写法：使用枚举类型**
`<列名> <枚举类型名>`
```sql
-- 使用枚举类型定义列
CREATE TABLE orders (id INT, status order_status);
```

**单行写法：MySQL ENUM 类型**
`<列名> ENUM(<值 1>, <值 2>, ...)`
```sql
-- MySQL 直接在列定义中使用 ENUM
CREATE TABLE orders (id INT, status ENUM('pending', 'processing', 'shipped', 'delivered'));
```

---

## 数组类型

**单行写法：PostgreSQL 数组类型**
`<列名> <类型>[]`
```sql
-- 定义整数数组列
CREATE TABLE teams (id INT, member_ids INT[]);
```

**单行写法：定义字符串数组列**
`<列名> VARCHAR[]`
```sql
-- 定义字符串数组列
CREATE TABLE articles (id INT, tags VARCHAR[]);
```

---

## UUID 类型

**单行写法：定义 UUID 列**
`<列名> UUID`
```sql
-- 定义 UUID 类型列（PostgreSQL）
CREATE TABLE users (id UUID PRIMARY KEY, name VARCHAR(100));
```

**单行写法：定义默认 UUID 列**
`<列名> UUID DEFAULT gen_random_uuid()`
```sql
-- 定义默认生成 UUID 的列
CREATE TABLE users (id UUID DEFAULT gen_random_uuid() PRIMARY KEY, name VARCHAR(100));
```

---

## 自增类型

**单行写法：MySQL AUTO_INCREMENT**
`<列名> INT AUTO_INCREMENT PRIMARY KEY`
```sql
-- MySQL 自增主键
CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100));
```

**单行写法：PostgreSQL SERIAL**
`<列名> SERIAL PRIMARY KEY`
```sql
-- PostgreSQL 自增主键
CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(100));
```

**单行写法：PostgreSQL BIGSERIAL**
`<列名> BIGSERIAL PRIMARY KEY`
```sql
-- PostgreSQL 大范围自增主键
CREATE TABLE orders (id BIGSERIAL PRIMARY KEY, user_id BIGINT);
```

**单行写法：SQL Server IDENTITY**
`<列名> INT IDENTITY(1, 1) PRIMARY KEY`
```sql
-- SQL Server 自增主键
CREATE TABLE users (id INT IDENTITY(1, 1) PRIMARY KEY, name VARCHAR(100));
```

---

## 货币类型

**单行写法：定义 MONEY 列**
`<列名> MONEY`
```sql
-- 定义 MONEY 类型列（PostgreSQL）
CREATE TABLE products (id INT, price MONEY);
```

**单行写法：推荐用 DECIMAL 存储金额**
`<列名> DECIMAL(<精度>, 2)`
```sql
-- 推荐使用 DECIMAL 存储金额
CREATE TABLE products (id INT, price DECIMAL(10, 2));
```
