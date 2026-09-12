---
order: 810
title: JSON 类型与 JSON_TABLE
module: 'mysql'
category: 数据库
difficulty: intermediate
description: MySQL JSON 数据类型详解：JSON 存储、查询函数、JSON_TABLE 将 JSON 转为关系表、虚拟列与索引优化。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'mysql/650-ReplicationDelayCauseSolution'
  - 'mysql/670-ShardingStrategy'
  - 'mysql/460-TransactionLockMechanism'
  - 'mysql/850-MySQLConfigOps'
prerequisites:
  - 'mysql/160-View'
---
## 前置知识

建议先阅读以下内容再进入本文：

- [视图语法速查手册](/mysql/160-View)

## 1. JSON 数据类型

### 1.1 JSON vs JSON 文本

```sql
-- JSON 类型（MySQL 5.7+）：自动校验、二进制存储、支持部分更新
CREATE TABLE users (
    id       INT PRIMARY KEY,
    profile  JSON          -- 原生 JSON 类型
);

-- JSON 文本（传统方式）：VARCHAR/TEXT 存储，无校验
CREATE TABLE users_old (
    id       INT PRIMARY KEY,
    profile  TEXT          -- 手动存储 JSON 字符串
);
```

| 特性     | JSON 类型            | TEXT 存储  |
| -------- | -------------------- | ---------- |
| 自动校验 | 插入时验证           | 无验证     |
| 存储格式 | 二进制（部分格式化） | 原始字符串 |
| 部分更新 | 支持（JSON_SET 等）  | 需整体替换 |
| 索引     | 虚拟列/函数索引      | 全文索引   |
| 空间开销 | 略大于原始文本       | 原始大小   |

### 1.2 JSON 插入与校验

```sql
-- 有效 JSON
INSERT INTO users VALUES (1, '{"name": "Alice", "age": 30, "tags": ["dev", "go"]}');

-- 无效 JSON → 报错
INSERT INTO users VALUES (2, '{name: Alice}');  -- 缺少引号
-- ERROR 3140 (22032): Invalid JSON text

-- JSON 数组
INSERT INTO users VALUES (3, '[1, 2, 3, "hello", null, true]');

-- 嵌套 JSON
INSERT INTO users VALUES (4, '{
    "name": "Bob",
    "address": {
        "city": "Beijing",
        "zip": "100000"
    },
    "orders": [
        {"id": 1, "amount": 99.9},
        {"id": 2, "amount": 199.9}
    ]
}');
```

## 2. JSON 查询函数

### 2.1 提取函数

```sql
-- JSON_EXTRACT: 提取值（返回 JSON 类型）
SELECT JSON_EXTRACT(profile, '$.name') FROM users WHERE id = 1;
-- "Alice"

-- -> 运算符（JSON_EXTRACT 的简写）
SELECT profile->'$.name' FROM users WHERE id = 1;
-- "Alice"

-- ->> 运算符（提取并取消引号）
SELECT profile->>'$.name' FROM users WHERE id = 1;
-- Alice

-- 提取嵌套值
SELECT profile->>'$.address.city' FROM users WHERE id = 4;
-- Beijing

-- 提取数组元素
SELECT profile->'$.orders[0].amount' FROM users WHERE id = 4;
-- 99.9

-- 提取数组所有元素
SELECT profile->'$.tags[*]' FROM users WHERE id = 1;
-- ["dev", "go"]
```

### 2.2 JSON_PATH 语法

```
$           根元素
.key        对象的 key
[num]       数组的第 num 个元素
[*]         数组所有元素
..          递归下降（MySQL 8.0+）
[last]      数组最后一个元素
[last-1]    数组倒数第二个元素
[to last]   从某位置到末尾
```

### 2.3 修改函数

```sql
-- JSON_SET: 设置值（存在则更新，不存在则创建）
UPDATE users SET profile = JSON_SET(profile, '$.age', 31) WHERE id = 1;

-- JSON_INSERT: 插入值（仅不存在时创建）
UPDATE users SET profile = JSON_INSERT(profile, '$.email', 'alice@example.com') WHERE id = 1;

-- JSON_REPLACE: 替换值（仅存在时更新）
UPDATE users SET profile = JSON_REPLACE(profile, '$.age', 32) WHERE id = 1;

-- JSON_REMOVE: 删除值
UPDATE users SET profile = JSON_REMOVE(profile, '$.tags') WHERE id = 1;

-- JSON_ARRAY_APPEND: 追加数组元素
UPDATE users SET profile = JSON_ARRAY_APPEND(profile, '$.tags', 'java') WHERE id = 1;

-- JSON_MERGE_PATCH: 合并（覆盖同 key）
UPDATE users SET profile = JSON_MERGE_PATCH(profile, '{"age": 33, "level": "senior"}') WHERE id = 1;
```

### 2.4 查询与搜索函数

```sql
-- JSON_CONTAINS: 是否包含指定值
SELECT * FROM users WHERE JSON_CONTAINS(profile->'$.tags', '"dev"');

-- JSON_CONTAINS_PATH: 是否包含指定路径
SELECT * FROM users WHERE JSON_CONTAINS_PATH(profile, 'one', '$.email');

-- JSON_SEARCH: 搜索值返回路径
SELECT JSON_SEARCH(profile, 'one', 'Alice') FROM users;

-- JSON_KEYS: 获取所有 key
SELECT JSON_KEYS(profile) FROM users WHERE id = 1;

-- JSON_LENGTH: 获取长度
SELECT JSON_LENGTH(profile->'$.tags') FROM users WHERE id = 1;

-- JSON_TYPE: 获取类型
SELECT JSON_TYPE(profile->'$.name') FROM users WHERE id = 1;  -- STRING

-- JSON_VALID: 是否有效 JSON
SELECT JSON_VALID('{"a":1}');  -- 1
```

## 3. JSON_TABLE

### 3.1 基本语法

JSON_TABLE（MySQL 8.0+）将 JSON 数组展开为关系表：

```sql
JSON_TABLE(
    json_doc,
    path COLUMNS (
        column_definition
    )
) [AS] alias
```

### 3.2 展开对象数组

```sql
-- 订单表，items 为 JSON 数组
CREATE TABLE orders (
    id    INT PRIMARY KEY,
    items JSON
);

INSERT INTO orders VALUES (1, '[
    {"product_id": 101, "name": "iPhone", "qty": 2, "price": 7999},
    {"product_id": 102, "name": "AirPods", "qty": 1, "price": 1299},
    {"product_id": 103, "name": "Case", "qty": 3, "price": 199}
]');

-- 使用 JSON_TABLE 展开
SELECT
    o.id AS order_id,
    jt.product_id,
    jt.name,
    jt.qty,
    jt.price,
    jt.qty * jt.price AS subtotal
FROM orders o,
JSON_TABLE(
    o.items,
    '$[*]' COLUMNS (
        product_id INT PATH '$.product_id',
        name       VARCHAR(50) PATH '$.name',
        qty        INT PATH '$.qty',
        price      DECIMAL(10,2) PATH '$.price'
    )
) AS jt;
```

输出：

```
order_id | product_id | name    | qty | price | subtotal
---------|------------|---------|-----|-------|--------
1        | 101        | iPhone  | 2   | 7999  | 15998
1        | 102        | AirPods | 1   | 1299  | 1299
1        | 103        | Case    | 3   | 199   | 597
```

### 3.3 嵌套展开（NESTED PATH）

```sql
-- 嵌套 JSON 结构
INSERT INTO orders VALUES (2, '[
    {
        "product_id": 201,
        "name": "MacBook",
        "variants": [
            {"color": "Silver", "stock": 10},
            {"color": "Space Gray", "stock": 5}
        ]
    }
]');

SELECT
    o.id,
    jt.product_id,
    jt.name,
    nt.color,
    nt.stock
FROM orders o,
JSON_TABLE(
    o.items,
    '$[*]' COLUMNS (
        product_id INT PATH '$.product_id',
        name       VARCHAR(50) PATH '$.name',
        NESTED PATH '$.variants[*]' COLUMNS (
            color VARCHAR(20) PATH '$.color',
            stock INT PATH '$.stock'
        )
    )
) AS jt;
```

### 3.4 ORDINALITY 列

```sql
-- ORDINALITY 自动生成行号
SELECT
    jt.row_num,
    jt.name
FROM orders o,
JSON_TABLE(
    o.items,
    '$[*]' COLUMNS (
        row_num FOR ORDINALITY,
        name VARCHAR(50) PATH '$.name'
    )
) AS jt
WHERE o.id = 1;
```

### 3.5 处理缺失值

```sql
-- DEFAULT ON ERROR / EMPTY
JSON_TABLE(
    o.items,
    '$[*]' COLUMNS (
        name VARCHAR(50) PATH '$.name',
        discount DECIMAL(5,2) PATH '$.discount' DEFAULT '0.00' ON EMPTY
    )
) AS jt
```

## 4. JSON 索引优化

### 4.1 虚拟列索引

```sql
-- 为 JSON 字段创建虚拟列 + 索引
ALTER TABLE users
ADD COLUMN name_virtual VARCHAR(50)
    GENERATED ALWAYS AS (JSON_UNQUOTE(profile->'$.name')) VIRTUAL,
ADD INDEX idx_name (name_virtual);

-- 查询走索引
SELECT * FROM users WHERE name_virtual = 'Alice';
```

### 4.2 函数索引（MySQL 8.0+）

```sql
-- 直接创建函数索引
ALTER TABLE users
ADD INDEX idx_json_name ((CAST(profile->>'$.name' AS CHAR(50))));
```

### 4.3 多值索引（MySQL 8.0.17+）

```sql
-- 为 JSON 数组创建多值索引
ALTER TABLE users
ADD INDEX idx_tags ((CAST(profile->'$.tags' AS CHAR(50) ARRAY)));

-- 使用 MEMBER OF 查询
SELECT * FROM users WHERE 'dev' MEMBER OF(profile->'$.tags');

-- 使用 JSON_OVERLAPS
SELECT * FROM users WHERE JSON_OVERLAPS(profile->'$.tags', '["dev", "java"]');
```
## JSON 数据类型

**换行写法：创建 JSON 类型列**
`CREATE TABLE <表名> (<列名> INT PRIMARY KEY, <JSON 列名> JSON)`
```sql
-- 创建包含原生 JSON 类型的表
CREATE TABLE users (
    id       INT PRIMARY KEY,
    profile  JSON
);
```

**单行写法：插入有效 JSON 对象**
`INSERT INTO <表名> VALUES (<值>, '<JSON 字符串>')`
```sql
-- 插入有效 JSON 对象数据
INSERT INTO users VALUES (1, '{"name": "Alice", "age": 30, "tags": ["dev", "go"]}');
```

**单行写法：插入 JSON 数组**
`INSERT INTO <表名> VALUES (<值>, '<JSON 数组>')`
```sql
-- 插入 JSON 数组数据
INSERT INTO users VALUES (3, '[1, 2, 3, "hello", null, true]');
```

**换行写法：插入嵌套 JSON**
`INSERT INTO <表名> VALUES (<值>, '<嵌套 JSON 字符串>')`
```sql
-- 插入嵌套结构的 JSON 数据
INSERT INTO users VALUES (4, '{
    "name": "Bob",
    "address": {
        "city": "Beijing",
        "zip": "100000"
    },
    "orders": [
        {"id": 1, "amount": 99.9},
        {"id": 2, "amount": 199.9}
    ]
}');
```

---

## JSON 提取函数

**单行写法：JSON_EXTRACT 提取值**
`JSON_EXTRACT(<JSON 列>, '<路径>')`
```sql
-- 提取 JSON 中的 name 字段值
SELECT JSON_EXTRACT(profile, '$.name') FROM users WHERE id = 1;
```

**单行写法：-> 运算符提取值**
`<JSON 列>->'<路径>'`
```sql
-- 使用 -> 运算符提取 name 字段
SELECT profile->'$.name' FROM users WHERE id = 1;
```

**单行写法：->> 运算符提取并取消引号**
`<JSON 列>->>'<路径>'`
```sql
-- 提取 name 字段并取消引号
SELECT profile->>'$.name' FROM users WHERE id = 1;
```

**单行写法：提取嵌套值**
`<JSON 列>->>'<嵌套路径>'`
```sql
-- 提取嵌套的 address.city 字段
SELECT profile->>'$.address.city' FROM users WHERE id = 4;
```

**单行写法：提取数组元素**
`<JSON 列>->'<数组路径>'`
```sql
-- 提取 orders 数组第一个元素的 amount
SELECT profile->'$.orders[0].amount' FROM users WHERE id = 4;
```

**单行写法：提取数组所有元素**
`<JSON 列>->'<数组路径>[*]'`
```sql
-- 提取 tags 数组的所有元素
SELECT profile->'$.tags[*]' FROM users WHERE id = 1;
```

---

## JSON 修改函数

**单行写法：JSON_SET 设置值**
`JSON_SET(<JSON 列>, '<路径>', <值>[, '<路径>', <值>...])`
```sql
-- 设置 age 字段值（存在则更新不存在则创建）
UPDATE users SET profile = JSON_SET(profile, '$.age', 31) WHERE id = 1;
```

**单行写法：JSON_INSERT 插入值**
`JSON_INSERT(<JSON 列>, '<路径>', <值>)`
```sql
-- 插入 email 字段（仅不存在时创建）
UPDATE users SET profile = JSON_INSERT(profile, '$.email', 'alice@example.com') WHERE id = 1;
```

**单行写法：JSON_REPLACE 替换值**
`JSON_REPLACE(<JSON 列>, '<路径>', <值>)`
```sql
-- 替换 age 字段值（仅存在时更新）
UPDATE users SET profile = JSON_REPLACE(profile, '$.age', 32) WHERE id = 1;
```

**单行写法：JSON_REMOVE 删除值**
`JSON_REMOVE(<JSON 列>, '<路径>')`
```sql
-- 删除 tags 字段
UPDATE users SET profile = JSON_REMOVE(profile, '$.tags') WHERE id = 1;
```

**单行写法：JSON_ARRAY_APPEND 追加数组元素**
`JSON_ARRAY_APPEND(<JSON 列>, '<路径>', <值>)`
```sql
-- 向 tags 数组追加元素
UPDATE users SET profile = JSON_ARRAY_APPEND(profile, '$.tags', 'java') WHERE id = 1;
```

**单行写法：JSON_MERGE_PATCH 合并对象**
`JSON_MERGE_PATCH(<JSON 列>, '<JSON 对象>')`
```sql
-- 合并 JSON 对象（覆盖同 key）
UPDATE users SET profile = JSON_MERGE_PATCH(profile, '{"age": 33, "level": "senior"}') WHERE id = 1;
```

---

## JSON 查询与搜索函数

**单行写法：JSON_CONTAINS 判断包含值**
`JSON_CONTAINS(<JSON 列>, '<JSON 值>'[, '<路径>'])`
```sql
-- 判断 tags 数组是否包含 dev
SELECT * FROM users WHERE JSON_CONTAINS(profile->'$.tags', '"dev"');
```

**单行写法：JSON_CONTAINS_PATH 判断包含路径**
`JSON_CONTAINS_PATH(<JSON 列>, 'one|all', '<路径>'[, '<路径>'...])`
```sql
-- 判断是否包含 email 路径
SELECT * FROM users WHERE JSON_CONTAINS_PATH(profile, 'one', '$.email');
```

**单行写法：JSON_SEARCH 搜索值返回路径**
`JSON_SEARCH(<JSON 列>, 'one|all', '<值>')`
```sql
-- 搜索 Alice 值并返回路径
SELECT JSON_SEARCH(profile, 'one', 'Alice') FROM users;
```

**单行写法：JSON_KEYS 获取所有 key**
`JSON_KEYS(<JSON 列>[, '<路径>'])`
```sql
-- 获取 JSON 对象的所有 key
SELECT JSON_KEYS(profile) FROM users WHERE id = 1;
```

**单行写法：JSON_LENGTH 获取长度**
`JSON_LENGTH(<JSON 列>[, '<路径>'])`
```sql
-- 获取 tags 数组的长度
SELECT JSON_LENGTH(profile->'$.tags') FROM users WHERE id = 1;
```

**单行写法：JSON_TYPE 获取类型**
`JSON_TYPE(<JSON 值>)`
```sql
-- 获取 name 字段的数据类型
SELECT JSON_TYPE(profile->'$.name') FROM users WHERE id = 1;
```

**单行写法：JSON_VALID 判断有效性**
`JSON_VALID('<JSON 字符串>')`
```sql
-- 判断字符串是否为有效 JSON
SELECT JSON_VALID('{"a":1}');
```

---

## JSON_TABLE

**换行写法：JSON_TABLE 基本语法**
`JSON_TABLE(<JSON 文档>, <路径> COLUMNS (<列定义>) ) [AS] <别名>`
```sql
-- 将 JSON 数组展开为关系表
SELECT
    o.id AS order_id,
    jt.product_id,
    jt.name,
    jt.qty,
    jt.price,
    jt.qty * jt.price AS subtotal
FROM orders o,
JSON_TABLE(
    o.items,
    '$[*]' COLUMNS (
        product_id INT PATH '$.product_id',
        name       VARCHAR(50) PATH '$.name',
        qty        INT PATH '$.qty',
        price      DECIMAL(10,2) PATH '$.price'
    )
) AS jt;
```

**换行写法：NESTED PATH 嵌套展开**
`NESTED PATH '<路径>' COLUMNS (<列定义>)`
```sql
-- 嵌套 JSON 结构展开
SELECT
    o.id,
    jt.product_id,
    jt.name,
    nt.color,
    nt.stock
FROM orders o,
JSON_TABLE(
    o.items,
    '$[*]' COLUMNS (
        product_id INT PATH '$.product_id',
        name       VARCHAR(50) PATH '$.name',
        NESTED PATH '$.variants[*]' COLUMNS (
            color VARCHAR(20) PATH '$.color',
            stock INT PATH '$.stock'
        )
    )
) AS jt;
```

**换行写法：ORDINALITY 列生成行号**
`<列名> FOR ORDINALITY`
```sql
-- 自动生成行号
SELECT
    jt.row_num,
    jt.name
FROM orders o,
JSON_TABLE(
    o.items,
    '$[*]' COLUMNS (
        row_num FOR ORDINALITY,
        name VARCHAR(50) PATH '$.name'
    )
) AS jt
WHERE o.id = 1;
```

**换行写法：处理缺失值**
`<列名> <类型> PATH '<路径>' DEFAULT '<默认值>' ON EMPTY`
```sql
-- 缺失值使用默认值
SELECT * FROM orders o,
JSON_TABLE(
    o.items,
    '$[*]' COLUMNS (
        name VARCHAR(50) PATH '$.name',
        discount DECIMAL(5,2) PATH '$.discount' DEFAULT '0.00' ON EMPTY
    )
) AS jt;
```

---

## JSON 索引优化

**换行写法：虚拟列索引**
`ALTER TABLE <表名> ADD COLUMN <列名> <类型> GENERATED ALWAYS AS (<表达式>) VIRTUAL, ADD INDEX <索引名> (<列名>)`
```sql
-- 为 JSON 字段创建虚拟列加索引
ALTER TABLE users
ADD COLUMN name_virtual VARCHAR(50)
    GENERATED ALWAYS AS (JSON_UNQUOTE(profile->'$.name')) VIRTUAL,
ADD INDEX idx_name (name_virtual);
```

**单行写法：查询虚拟列索引**
`SELECT * FROM <表名> WHERE <虚拟列名> = <值>`
```sql
-- 查询走虚拟列索引
SELECT * FROM users WHERE name_virtual = 'Alice';
```

**换行写法：函数索引**
`ALTER TABLE <表名> ADD INDEX <索引名> ((<表达式>))`
```sql
-- 直接创建函数索引（MySQL 8.0+）
ALTER TABLE users
ADD INDEX idx_json_name ((CAST(profile->>'$.name' AS CHAR(50))));
```

**换行写法：多值索引**
`ALTER TABLE <表名> ADD INDEX <索引名> ((CAST(<JSON 列> AS <类型> ARRAY)))`
```sql
-- 为 JSON 数组创建多值索引（MySQL 8.0.17+）
ALTER TABLE users
ADD INDEX idx_tags ((CAST(profile->'$.tags' AS CHAR(50) ARRAY)));
```

**单行写法：MEMBER OF 查询**
`<值> MEMBER OF(<JSON 列>)`
```sql
-- 使用 MEMBER OF 查询数组包含值
SELECT * FROM users WHERE 'dev' MEMBER OF(profile->'$.tags');
```

**单行写法：JSON_OVERLAPS 查询**
`JSON_OVERLAPS(<JSON 列>, '<JSON 数组>')`
```sql
-- 使用 JSON_OVERLAPS 查询数组交集
SELECT * FROM users WHERE JSON_OVERLAPS(profile->'$.tags', '["dev", "java"]');
```
