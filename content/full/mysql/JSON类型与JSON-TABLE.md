---
order: 106
title: 'JSON类型与JSON-TABLE'
module: mysql
category: database
difficulty: intermediate
description: 'MySQL JSON 数据类型详解：JSON 存储、查询函数、JSON_TABLE 将 JSON 转为关系表、虚拟列与索引优化。'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/主从复制延迟原因与解决
  - mysql/分库分表策略
  - mysql/事务与锁机制
  - mysql/配置与运维
prerequisites:
  - mysql/语法速查
---

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
