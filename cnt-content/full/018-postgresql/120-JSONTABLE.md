---
order: 120
title: JSON_TABLE
module: 'postgresql'
category: 数据库
difficulty: advanced
description: PostgreSQL JSON_TABLE：标准化JSON处理、路径表达式、嵌套列与关系化输出
author: fanquanpp
updated: '2026-09-12'
related:
  - 'postgresql/080-AdvancedSQL'
  - 'postgresql/290-MERGEStatementEnhancement'
  - 'postgresql/300-FullTextSearch'
  - 'postgresql/310-GeoSpatialObject'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
---

## 1. JSON_TABLE 概述

JSON_TABLE 是 SQL:2016 标准函数，将 JSON 数据转换为关系表，PostgreSQL 17+ 支持。

## 2. 基本用法

```sql
-- 将 JSON 数组展开为行
SELECT jt.*
FROM api_logs,
JSON_TABLE(payload, '$.items[*]' COLUMNS (
    product_id INTEGER PATH '$.product_id',
    quantity INTEGER PATH '$.quantity',
    price NUMERIC PATH '$.price'
)) AS jt;
```

## 3. 嵌套列

```sql
-- 处理嵌套 JSON
SELECT jt.name, addr.street, addr.city
FROM users,
JSON_TABLE(data, '$' COLUMNS (
    name VARCHAR(100) PATH '$.name',
    NESTED PATH '$.address' COLUMNS (
        street VARCHAR(200) PATH '$.street',
        city VARCHAR(100) PATH '$.city',
        zip VARCHAR(20) PATH '$.zip'
    )
)) AS jt;
```

## 4. 错误处理

```sql
-- ERROR ON ERROR：遇到错误报错
-- EMPTY ON ERROR：遇到错误返回空
-- NULL ON ERROR：遇到错误返回 NULL（默认）

SELECT jt.*
FROM documents,
JSON_TABLE(data, '$.items[*]' COLUMNS (
    id INTEGER PATH '$.id' ERROR ON ERROR,
    name VARCHAR(100) PATH '$.name' NULL ON ERROR
)) AS jt;
```

## 5. 与 JSONB 操作符对比

```sql
-- JSONB 操作符方式
SELECT payload->>'name' AS name,
       payload->'address'->>'city' AS city
FROM users;

-- JSON_TABLE 方式（更适合复杂嵌套）
SELECT jt.name, jt.city
FROM users,
JSON_TABLE(payload, '$' COLUMNS (
    name VARCHAR(100) PATH '$.name',
    city VARCHAR(100) PATH '$.address.city'
)) AS jt;
```
## 创建与插入

**单行写法：创建 JSONB 列**
`<列名> JSONB`
```sql
-- 创建带 JSONB 列的表
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  attributes JSONB
);
```

**单行写法：插入 JSON 数据**
`INSERT INTO <表名> (<列>) VALUES ('<JSON字符串>'::jsonb);`
```sql
-- 插入 JSONB 数据
INSERT INTO products (name, attributes)
VALUES ('手机', '{"品牌": "Xiaomi", "价格": 2999, "颜色": "黑色"}'::jsonb);
```

**单行写法：使用 JSON 构造函数（PG17+）**
`INSERT INTO <表名> (<列>) VALUES (JSON_OBJECT('key', 'value'));`
```sql
-- 使用 SQL 标准 JSON 构造函数
INSERT INTO products (name, attributes)
VALUES ('手机', JSON_OBJECT('品牌', 'Xiaomi', '价格', 2999));
```

**单行写法：插入 JSON 数组**
`INSERT INTO <表名> (<列>) VALUES ('[1, 2, 3]'::jsonb);`
```sql
-- 插入 JSON 数组
INSERT INTO logs (tags) VALUES ('["redis", "mysql", "pg"]'::jsonb);
```

---

## 查询操作

**单行写法：使用 -> 获取 JSON 对象字段**
`SELECT <列>->'<键>' FROM <表名>;`
```sql
-- 获取 JSON 对象字段（返回 JSONB）
SELECT attributes->'品牌' AS brand FROM products;
```

**单行写法：使用 ->> 获取文本值**
`SELECT <列>->>'<键>' FROM <表名>;`
```sql
-- 获取 JSON 字段文本值（返回 TEXT）
SELECT attributes->>'品牌' AS brand FROM products;
```

**单行写法：路径访问嵌套字段**
`SELECT <列>#>'{<路径1>, <路径2>}' FROM <表名>;`
```sql
-- 按路径获取嵌套 JSONB 值
SELECT attributes#>'{地址, 城市}' AS city FROM users;
```

**单行写法：路径访问文本**
`SELECT <列>#>>'{<路径1>, <路径2>}' FROM <表名>;`
```sql
-- 按路径获取嵌套字段文本值
SELECT attributes#>>'{地址, 城市}' AS city FROM users;
```

**单行写法：获取数组元素**
`SELECT <列>-><索引> FROM <表名>;`
```sql
-- 获取 JSON 数组指定索引元素
SELECT tags->0 AS first_tag FROM logs;
```

---

## 条件查询

**单行写法：按 JSON 字段过滤**
`SELECT * FROM <表名> WHERE <列>->>'<键>' = '<值>';`
```sql
-- 查询品牌为 Xiaomi 的商品
SELECT * FROM products WHERE attributes->>'品牌' = 'Xiaomi';
```

**单行写法：使用 @> 包含操作符**
`SELECT * FROM <表名> WHERE <列> @> '<JSON对象>';`
```sql
-- 查询包含指定键值对的记录
SELECT * FROM products WHERE attributes @> '{"品牌": "Xiaomi"}';
```

**单行写法：使用 ? 键存在判断**
`SELECT * FROM <表名> WHERE <列> ? '<键>';`
```sql
-- 查询存在指定键的记录
SELECT * FROM products WHERE attributes ? '价格';
```

**单行写法：使用 ?| 任一键存在**
`SELECT * FROM <表名> WHERE <列> ?| ARRAY['<键1>', '<键2>'];`
```sql
-- 查询存在任一键的记录
SELECT * FROM products WHERE attributes ?| ARRAY['价格', '库存'];
```

**单行写法：使用 ?& 所有关键存在**
`SELECT * FROM <表名> WHERE <列> ?& ARRAY['<键1>', '<键2>'];`
```sql
-- 查询同时存在多个键的记录
SELECT * FROM products WHERE attributes ?& ARRAY['价格', '库存'];
```

---

## 修改操作

**单行写法：合并 JSON 对象**
`SELECT <列> || '<JSON对象>' FROM <表名>;`
```sql
-- 合并两个 JSON 对象（后者覆盖前者）
UPDATE products SET attributes = attributes || '{"库存": 100}'::jsonb WHERE id = 1;
```

**单行写法：删除键**
`SELECT <列> - '<键>' FROM <表名>;`
```sql
-- 删除 JSON 对象指定键
UPDATE products SET attributes = attributes - '颜色' WHERE id = 1;
```

**单行写法：删除多个键**
`SELECT <列> - '<键1>' - '<键2>' FROM <表名>;`
```sql
-- 删除多个键
UPDATE products SET attributes = attributes - '颜色' - '库存' WHERE id = 1;
```

**单行写法：按路径删除**
`SELECT <列> #- '{<路径>}' FROM <表名>;`
```sql
-- 按路径删除嵌套字段
UPDATE users SET attributes = attributes #- '{地址, 城市}' WHERE id = 1;
```

**单行写法：更新指定路径值**
`SELECT jsonb_set(<列>, '{<路径>}', '<新值>');`
```sql
-- 更新嵌套字段值
UPDATE users SET attributes = jsonb_set(attributes, '{地址, 城市}', '"北京"'::jsonb) WHERE id = 1;
```

**单行写法：设置值不存在时才插入**
`SELECT jsonb_set(<列>, '{<路径>}', '<新值>', true);`
```sql
-- 仅当键不存在时插入新值
UPDATE products SET attributes = jsonb_set(attributes, '{折扣}', '"0.9"'::jsonb, true) WHERE id = 1;
```

---

## 聚合与展开

**单行写法：JSON 聚合**
`SELECT json_agg(<列>) FROM <表名>;`
```sql
-- 将多行数据聚合成 JSON 数组
SELECT json_agg(username) AS usernames FROM users;
```

**单行写法：JSONB 聚合**
`SELECT jsonb_agg(<列>) FROM <表名>;`
```sql
-- 将多行聚合成 JSONB 数组
SELECT jsonb_agg(row_to_json(u)) AS users FROM users u;
```

**单行写法：构建 JSON 对象**
`SELECT json_build_object('<键>', <值>[, ...]);`
```sql
-- 构建键值对 JSON 对象
SELECT json_build_object('id', id, 'name', username) FROM users;
```

**单行写法：行转 JSON 对象**
`SELECT row_to_json(<表别名>) FROM <表名> <别名>;`
```sql
-- 将整行转为 JSON 对象
SELECT row_to_json(u) FROM users u WHERE id = 1;
```

**换行写法：展开 JSON 数组**
`SELECT * FROM jsonb_array_elements(<列>) AS <别名>;`
```sql
-- 将 JSON 数组展开为多行
SELECT * FROM jsonb_array_elements('["a", "b", "c"]'::jsonb) AS elem;
```

**换行写法：展开 JSON 对象**
`SELECT * FROM jsonb_each(<列>) AS <别名>(键, 值);`
```sql
-- 将 JSON 对象展开为键值对多行
SELECT * FROM jsonb_each('{"a": 1, "b": 2}'::jsonb) AS x(key, value);
```

---

## 索引与性能

**单行写法：创建 GIN 索引**
`CREATE INDEX <索引名> ON <表名> USING GIN (<列>);`
```sql
-- 为 JSONB 列创建 GIN 索引
CREATE INDEX idx_products_attr ON products USING GIN (attributes);
```

**单行写法：创建表达式索引**
`CREATE INDEX <索引名> ON <表名> ((<列>->>'<键>'));`
```sql
-- 为 JSONB 某字段创建表达式索引
CREATE INDEX idx_products_brand ON products ((attributes->>'品牌'));
```

**单行写法：查看 JSONB 键**
`SELECT jsonb_object_keys(<列>) FROM <表名>;`
```sql
-- 获取 JSONB 对象所有键
SELECT jsonb_object_keys(attributes) FROM products WHERE id = 1;
```

---

## JSON_TABLE（PG17+）

**换行写法：JSON 数据转关系表**
`SELECT * FROM JSON_TABLE(<JSON>, '<路径>' COLUMNS (<列定义>));`
```sql
-- 将 JSON 数组转为关系表行
SELECT * FROM JSON_TABLE(
  '[{"name": "张三", "age": 25}, {"name": "李四", "age": 30}]'::jsonb,
  '$[*]' COLUMNS (
    name TEXT PATH '$.name',
    age INT PATH '$.age'
  )
);
```

**单行写法：JSON_EXISTS 判断路径存在**
`SELECT JSON_EXISTS(<JSON>, '<路径>');`
```sql
-- 判断 JSON 路径是否存在
SELECT JSON_EXISTS(attributes, '$.品牌') FROM products WHERE id = 1;
```

**单行写法：JSON_VALUE 提取标量**
`SELECT JSON_VALUE(<JSON>, '<路径>');`
```sql
-- 提取 JSON 标量值
SELECT JSON_VALUE(attributes, '$.价格') FROM products WHERE id = 1;
```

**单行写法：JSON_QUERY 提取对象**
`SELECT JSON_QUERY(<JSON>, '<路径>');`
```sql
-- 提取 JSON 对象或数组
SELECT JSON_QUERY(attributes, '$.地址') FROM users WHERE id = 1;
```
