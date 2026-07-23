# PostgreSQL 分区表

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 范围分区

**换行写法：创建范围分区主表**
`CREATE TABLE <表名> (<列定义>) PARTITION BY RANGE (<列名>)`
```sql
-- 创建按日期范围分区的订单表
CREATE TABLE orders (
    id BIGSERIAL,
    order_date DATE NOT NULL,
    customer_id INT NOT NULL,
    amount DECIMAL(10, 2)
) PARTITION BY RANGE (order_date);
```

**换行写法：创建范围分区子表**
`CREATE TABLE <子表名> PARTITION OF <父表> FOR VALUES FROM (<起始>) TO (<结束>)`
```sql
-- 创建 2024 年 1 月的分区
CREATE TABLE orders_2024_01 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

**换行写法：创建多个范围分区子表**
`CREATE TABLE <子表名> PARTITION OF <父表> FOR VALUES FROM (<起始>) TO (<结束>)`
```sql
-- 创建 2024 年 2 月的分区
CREATE TABLE orders_2024_02 PARTITION OF orders
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

---

## 列表分区

**换行写法：创建列表分区主表**
`CREATE TABLE <表名> (<列定义>) PARTITION BY LIST (<列名>)`
```sql
-- 创建按地区列表分区的用户表
CREATE TABLE users (
    id BIGSERIAL,
    username VARCHAR(50),
    region VARCHAR(20)
) PARTITION BY LIST (region);
```

**换行写法：创建列表分区子表**
`CREATE TABLE <子表名> PARTITION OF <父表> FOR VALUES IN (<值>[, <值>...])`
```sql
-- 创建华北地区的分区
CREATE TABLE users_north PARTITION OF users
    FOR VALUES IN ('北京', '天津', '河北');
```

**换行写法：创建多个列表分区子表**
`CREATE TABLE <子表名> PARTITION OF <父表> FOR VALUES IN (<值>[, <值>...])`
```sql
-- 创建华南地区的分区
CREATE TABLE users_south PARTITION OF users
    FOR VALUES IN ('广东', '广西', '海南');
```

---

## 哈希分区

**换行写法：创建哈希分区主表**
`CREATE TABLE <表名> (<列定义>) PARTITION BY HASH (<列名>)`
```sql
-- 创建按用户 ID 哈希分区的用户表
CREATE TABLE users (
    id BIGSERIAL,
    username VARCHAR(50),
    email VARCHAR(100)
) PARTITION BY HASH (id);
```

**换行写法：创建哈希分区子表**
`CREATE TABLE <子表名> PARTITION OF <父表> FOR VALUES WITH (MODULUS <模数>, REMAINDER <余数>)`
```sql
-- 创建哈希余数为 0 的分区
CREATE TABLE users_0 PARTITION OF users
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
```

**换行写法：创建多个哈希分区子表**
`CREATE TABLE <子表名> PARTITION OF <父表> FOR VALUES WITH (MODULUS <模数>, REMAINDER <余数>)`
```sql
-- 创建哈希余数为 1 的分区
CREATE TABLE users_1 PARTITION OF users
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);
```

---

## 分区管理

**单行写法：查看分区表信息**
`SELECT <列名> FROM pg_inherits WHERE <条件>`
```sql
-- 查看分区表的子表
SELECT inhrelid::regclass AS child_table
FROM pg_inherits
WHERE inhparent = 'orders'::regclass;
```

**单行写法：查看分区表结构**
`SELECT <列名> FROM pg_partitioned_table WHERE <条件>`
```sql
-- 查看分区表的结构信息
SELECT partrelid::regclass AS table_name, partstrat AS strategy
FROM pg_partitioned_table;
```

**单行写法：分离分区**
`ALTER TABLE <父表> DETACH PARTITION <子表名>`
```sql
-- 分离分区使其成为独立表
ALTER TABLE orders DETACH PARTITION orders_2024_01;
```

**单行写法：附加分区**
`ALTER TABLE <父表> ATTACH PARTITION <子表名> FOR VALUES FROM (<起始>) TO (<结束>)`
```sql
-- 附加分区到父表
ALTER TABLE orders ATTACH PARTITION orders_2024_01
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

**单行写法：删除分区子表**
`DROP TABLE <子表名>`
```sql
-- 删除分区子表
DROP TABLE orders_2024_01;
```

**换行写法：创建默认分区**
`CREATE TABLE <子表名> PARTITION OF <父表> DEFAULT`
```sql
-- 创建默认分区存放不匹配的数据
CREATE TABLE users_default PARTITION OF users DEFAULT;
```

---

## 分区索引

**单行写法：在父表创建索引**
`CREATE INDEX <索引名> ON <表名>(<列名>)`
```sql
-- 在父表创建索引自动应用到所有分区
CREATE INDEX idx_orders_date ON orders(order_date);
```

**单行写法：在子表创建索引**
`CREATE INDEX <索引名> ON <子表名>(<列名>)`
```sql
-- 在单个分区子表创建索引
CREATE INDEX idx_orders_2024_01_date ON orders_2024_01(order_date);
```

---

## 分区裁剪

**单行写法：查询触发分区裁剪**
`SELECT * FROM <分区表> WHERE <分区列> <操作符> <值>`
```sql
-- 查询条件触发分区裁剪只扫描匹配分区
SELECT * FROM orders WHERE order_date = '2024-01-15';
```

**单行写法：范围查询触发分区裁剪**
`SELECT * FROM <分区表> WHERE <分区列> BETWEEN <值1> AND <值2>`
```sql
-- 范围查询触发分区裁剪
SELECT * FROM orders WHERE order_date BETWEEN '2024-01-01' AND '2024-01-31';
```

**单行写法：查看查询计划**
`EXPLAIN SELECT * FROM <分区表> WHERE <条件>`
```sql
-- 查看查询是否触发分区裁剪
EXPLAIN SELECT * FROM orders WHERE order_date = '2024-01-15';
```
