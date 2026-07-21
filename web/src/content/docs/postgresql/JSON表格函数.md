---
order: 64
title: 'JSON-TABLE'
module: postgresql
category: PostgreSQL
difficulty: advanced
description: 'PostgreSQL JSON_TABLE：标准化JSON处理、路径表达式、嵌套列与关系化输出'
author: fanquanpp
updated: '2026-06-14'
related:
  - postgresql/高级SQL
  - postgresql/MERGE语句增强
  - postgresql/全文检索
  - postgresql/地理空间对象
prerequisites:
  - postgresql/概述与安装配置
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
