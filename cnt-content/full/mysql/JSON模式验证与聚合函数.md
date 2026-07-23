---
order: 92
title: JSON模式验证与聚合函数
module: mysql
category: MySQL
difficulty: advanced
description: 'MySQL JSON模式验证与JSON聚合函数：JSON_SCHEMA_VALID、JSON_ARRAYAGG、JSON_OBJECTAGG'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/MySQL9新特性与并行查询
  - mysql/VECTOR向量类型
  - mysql/复制与高可用
  - mysql/不可见索引
prerequisites:
  - mysql/语法速查
---

## 1. JSON 模式验证

### 1.1 JSON_SCHEMA_VALID

```sql
-- 定义 JSON Schema
SET @schema = '{
    "type": "object",
    "required": ["name", "age"],
    "properties": {
        "name": {"type": "string", "minLength": 1},
        "age": {"type": "integer", "minimum": 0},
        "email": {"type": "string", "format": "email"}
    }
}';

-- 验证 JSON 数据
SELECT JSON_SCHEMA_VALID(@schema, '{"name": "Alice", "age": 30}');
-- 返回 1（有效）

SELECT JSON_SCHEMA_VALID(@schema, '{"name": "Bob"}');
-- 返回 0（缺少 age）

-- 在 CHECK 约束中使用
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data JSON,
    CHECK (JSON_SCHEMA_VALID('{
        "type": "object",
        "required": ["name"],
        "properties": {"name": {"type": "string"}}
    }', data))
);
```

### 1.2 JSON_SCHEMA_VALIDATION_REPORT

```sql
-- 获取详细的验证报告
SELECT JSON_SCHEMA_VALIDATION_REPORT(@schema, '{"name": "Bob"}');
-- 返回验证失败的详细信息
```

## 2. JSON 聚合函数

### 2.1 JSON_ARRAYAGG

```sql
-- 将多行的值聚合为 JSON 数组
SELECT dept_id, JSON_ARRAYAGG(name) AS employee_names
FROM employees
GROUP BY dept_id;

-- 结果：
-- dept_id | employee_names
-- 1       | ["Alice", "Bob", "Charlie"]
-- 2       | ["David", "Eve"]
```

### 2.2 JSON_OBJECTAGG

```sql
-- 将键值对聚合为 JSON 对象
SELECT dept_id, JSON_OBJECTAGG(name, salary) AS salary_map
FROM employees
GROUP BY dept_id;

-- 结果：
-- dept_id | salary_map
-- 1       | {"Alice": 50000, "Bob": 60000, "Charlie": 55000}
```

## 3. JSON 表函数

### 3.1 JSON_TABLE

```sql
-- 将 JSON 数组展开为关系表
SELECT jt.*
FROM orders,
JSON_TABLE(items, '$[*]' COLUMNS (
    product_id INT PATH '$.product_id',
    quantity INT PATH '$.quantity',
    price DECIMAL(10,2) PATH '$.price'
)) AS jt;

-- 嵌套列
SELECT jt.name, jt.street, jt.city
FROM users,
JSON_TABLE(address, '$' COLUMNS (
    name VARCHAR(100) PATH '$.name',
    NESTED PATH '$.address' COLUMNS (
        street VARCHAR(200) PATH '$.street',
        city VARCHAR(100) PATH '$.city'
    )
)) AS jt;
```
