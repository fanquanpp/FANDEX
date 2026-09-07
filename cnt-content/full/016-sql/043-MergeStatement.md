---
order: 430
title: SQL MERGE / UPSERT 语句语法速查手册
module: 'sql'
category: 数据库
difficulty: beginner
description: SQL MERGE / UPSERT 语句语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## MERGE 标准语法

**基本写法：SQL 标准 MERGE**
`MERGE INTO <目标表> USING <源> ON <条件> WHEN MATCHED THEN ... WHEN NOT MATCHED THEN ...`
```sql
-- SQL:2003 标准，PostgreSQL 15+/Oracle/SQL Server 支持
MERGE INTO target t
USING source s
ON t.id = s.id
WHEN MATCHED THEN
  UPDATE SET t.name = s.name, t.salary = s.salary
WHEN NOT MATCHED THEN
  INSERT (id, name, salary) VALUES (s.id, s.name, s.salary);
```

---

**基本写法：带条件分支**
`WHEN MATCHED AND <条件> THEN ...`
```sql
-- 仅更新满足额外条件的行
MERGE INTO products p
USING staging s
ON p.id = s.id
WHEN MATCHED AND s.price <> p.price THEN
  UPDATE SET p.price = s.price, p.updated_at = NOW()
WHEN MATCHED AND s.deleted = 1 THEN
  DELETE
WHEN NOT MATCHED THEN
  INSERT (id, name, price) VALUES (s.id, s.name, s.price);
```

---

## MySQL UPSERT

**基本写法：INSERT ... ON DUPLICATE KEY UPDATE**
`INSERT INTO <表> VALUES (...) ON DUPLICATE KEY UPDATE <列>=VALUES(<列>)`
```sql
-- MySQL 经典 UPSERT，依赖主键/唯一索引判断冲突
INSERT INTO users (id, name, email)
VALUES (1, 'Alice', 'a@x.com')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  email = VALUES(email),
  updated_at = NOW();

-- MySQL 8.0+ 可用别名引用行
INSERT INTO users (id, name) VALUES (1, 'Bob') AS new
ON DUPLICATE KEY UPDATE name = new.name;
```

---

**基本写法：INSERT IGNORE**
`INSERT IGNORE INTO <表> ...`
```sql
-- 冲突时忽略错误，不插入也不更新
INSERT IGNORE INTO users (id, name) VALUES (1, 'Alice');
-- 若 id=1 已存在，产生 warning 而非 error，跳过该行
```

---

**基本写法：REPLACE INTO**
`REPLACE INTO <表> VALUES (...)`
```sql
-- 冲突时先 DELETE 旧行再 INSERT 新行（注意触发器、自增ID变化）
REPLACE INTO users (id, name, email)
VALUES (1, 'Alice', 'new@x.com');
```

---

## PostgreSQL UPSERT

**基本写法：INSERT ... ON CONFLICT**
`INSERT INTO <表> VALUES (...) ON CONFLICT (<列>) DO UPDATE SET ...`
```sql
-- PostgreSQL 9.5+ 原生 UPSERT
INSERT INTO users (id, name, email)
VALUES (1, 'Alice', 'a@x.com')
ON CONFLICT (id)
DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  updated_at = NOW();

-- 冲突时什么都不做
INSERT INTO users (id, name) VALUES (1, 'Bob')
ON CONFLICT (id) DO NOTHING;
```

---

**基本写法：基于约束名冲突**
`ON CONFLICT ON CONSTRAINT <约束名> DO ...`
```sql
-- 指定约束名处理冲突
INSERT INTO users (id, email)
VALUES (1, 'a@x.com')
ON CONFLICT ON CONSTRAINT users_email_key
DO UPDATE SET email = EXCLUDED.email;
```

---

**基本写法：条件 UPSERT**
`ON CONFLICT DO UPDATE SET ... WHERE <条件>`
```sql
-- 仅在满足条件时更新
INSERT INTO inventory (product_id, qty)
VALUES (100, 50)
ON CONFLICT (product_id)
DO UPDATE SET qty = inventory.qty + EXCLUDED.qty
WHERE inventory.warehouse = 'A';
```

---

## SQL Server UPSERT

**基本写法：MERGE 语法**
`MERGE INTO <表> AS <别名> USING (VALUES ...) AS <源>(<列>) ON ...`
```sql
-- SQL Server 推荐 MERGE
MERGE INTO users AS t
USING (VALUES (1, 'Alice', 'a@x.com')) AS s(id, name, email)
ON t.id = s.id
WHEN MATCHED THEN
  UPDATE SET t.name = s.name, t.email = s.email
WHEN NOT MATCHED THEN
  INSERT (id, name, email) VALUES (s.id, s.name, s.email);
```

---

**基本写法：IF EXISTS 模式**
`IF EXISTS (SELECT ...) UPDATE ... ELSE INSERT ...`
```sql
-- 兼容性最好的写法
IF EXISTS (SELECT 1 FROM users WHERE id = 1)
  UPDATE users SET name = 'Alice' WHERE id = 1;
ELSE
  INSERT INTO users (id, name) VALUES (1, 'Alice');
```

---

## SQLite UPSERT

**基本写法：ON CONFLICT（SQLite 3.24+）**
`INSERT INTO <表> VALUES (...) ON CONFLICT(<列>) DO UPDATE SET ...`
```sql
-- SQLite 语法与 PostgreSQL 类似
INSERT INTO users (id, name, email)
VALUES (1, 'Alice', 'a@x.com')
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  email = excluded.email;
```

---

**基本写法：REPLACE（SQLite）**
`REPLACE INTO <表> VALUES (...)`
```sql
-- SQLite REPLACE 与 MySQL 一致，先删后插
REPLACE INTO users (id, name) VALUES (1, 'Alice');
```

---

## 批量 UPSERT

**基本写法：多行 UPSERT**
`INSERT INTO <表> VALUES (...),(...),(...) ON CONFLICT ...`
```sql
-- PostgreSQL 批量
INSERT INTO products (id, name, price)
VALUES
  (1, 'A1', 10.0),
  (2, 'A2', 20.0),
  (3, 'A3', 30.0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price;

-- MySQL 批量
INSERT INTO products (id, name, price)
VALUES (1, 'A1', 10.0), (2, 'A2', 20.0)
ON DUPLICATE KEY UPDATE
  name = VALUES(name), price = VALUES(price);
```
