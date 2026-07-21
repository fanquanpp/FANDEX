---
order: 51
title: 约束
module: sql
category: SQL
difficulty: intermediate
description: 'SQL约束机制：NOT NULL、UNIQUE、PRIMARY KEY、FOREIGN KEY、CHECK约束的语法、行为与最佳实践'
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/SQL实战与面试
  - sql/数据类型
  - sql/SELECT执行顺序
  - sql/过滤条件
prerequisites:
  - sql/概述与标准
---

## 1. 约束概述

约束（Constraint）是数据库强制执行的数据完整性规则，确保数据满足业务逻辑要求。约束在 DDL 层面保证数据质量，比应用层验证更可靠。

### 1.1 约束分类

| 类别     | 约束类型                         | 作用域 | 说明               |
| -------- | -------------------------------- | ------ | ------------------ |
| 列级约束 | NOT NULL, UNIQUE, CHECK, DEFAULT | 单列   | 附加在列定义中     |
| 表级约束 | PRIMARY KEY, FOREIGN KEY, UNIQUE | 多列   | 独立于列定义       |
| 域约束   | DOMAIN                           | 域     | 自定义数据类型约束 |

### 1.2 约束命名规范

```sql
-- 推荐命名规范：表名_列名_约束类型
CREATE TABLE orders (
    order_id    BIGINT,
    user_id     BIGINT,
    status      VARCHAR(20),

    CONSTRAINT pk_orders_order_id PRIMARY KEY (order_id),
    CONSTRAINT fk_orders_user_id FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT uk_orders_user_status UNIQUE (user_id, status),
    CONSTRAINT ck_orders_status CHECK (status IN ('pending', 'paid', 'shipped'))
);
```

## 2. NOT NULL 约束

### 2.1 基本语法

```sql
-- 列级定义
CREATE TABLE employees (
    emp_id  INTEGER NOT NULL,
    name    VARCHAR(100) NOT NULL,
    email   VARCHAR(200),           -- 允许 NULL
    phone   VARCHAR(20) NOT NULL
);

-- 添加 NOT NULL 约束
ALTER TABLE employees ALTER COLUMN email SET NOT NULL;

-- 移除 NOT NULL 约束
ALTER TABLE employees ALTER COLUMN email DROP NOT NULL;
```

### 2.2 NULL 的三值逻辑

SQL 中 NULL 表示"未知"，导致三值逻辑（Three-Valued Logic）：

| A     | B    | A = B | A <> B | A AND B | A OR B |
| ----- | ---- | ----- | ------ | ------- | ------ |
| TRUE  | NULL | NULL  | NULL   | NULL    | TRUE   |
| FALSE | NULL | NULL  | NULL   | FALSE   | NULL   |
| NULL  | NULL | NULL  | NULL   | NULL    | NULL   |

```sql
-- NULL 比较陷阱
SELECT * FROM users WHERE age = NULL;     -- 永远返回空集！
SELECT * FROM users WHERE age <> NULL;    -- 永远返回空集！
SELECT * FROM users WHERE age IS NULL;    -- 正确写法
SELECT * FROM users WHERE age IS NOT NULL; -- 正确写法
```

### 2.3 NULL 与聚合函数

```sql
-- COUNT 的差异
SELECT
    COUNT(*) AS total_rows,        -- 包含 NULL 行
    COUNT(age) AS non_null_age,    -- 排除 NULL
    AVG(age) AS avg_age            -- 自动忽略 NULL
FROM users;

-- COALESCE 处理 NULL
SELECT COALESCE(phone, 'N/A') AS phone_display FROM employees;
```

## 3. UNIQUE 约束

### 3.1 单列与复合唯一约束

```sql
CREATE TABLE accounts (
    id         BIGSERIAL PRIMARY KEY,
    username   VARCHAR(50) UNIQUE,              -- 单列唯一
    email      VARCHAR(200),
    phone      VARCHAR(20),

    CONSTRAINT uk_accounts_email_phone UNIQUE (email, phone)  -- 复合唯一
);
```

### 3.2 UNIQUE 与 NULL

- **SQL 标准**：UNIQUE 约束中，多个 NULL 被视为不同值（即允许存在多个 NULL）
- **MySQL InnoDB**：与 SQL 标准一致，允许多个 NULL
- **PostgreSQL**：与 SQL 标准一致，允许多个 NULL
- **SQL Server**：将 NULL 视为相同值，只允许一个 NULL

```sql
-- 以下在 PostgreSQL/MySQL 中合法，SQL Server 中违反约束
INSERT INTO accounts (id, username, email) VALUES (1, 'alice', NULL);
INSERT INTO accounts (id, username, email) VALUES (2, 'bob', NULL);  -- 允许
```

### 3.3 唯一约束与唯一索引

```sql
-- 唯一约束自动创建唯一索引
-- 以下两种方式等价：
ALTER TABLE accounts ADD CONSTRAINT uk_accounts_username UNIQUE (username);
CREATE UNIQUE INDEX uk_accounts_username ON accounts (username);

-- 部分唯一索引（PostgreSQL）：每个用户只能有一个活跃订阅
CREATE UNIQUE INDEX uk_active_subscription
ON subscriptions (user_id) WHERE status = 'active';
```

## 4. PRIMARY KEY 约束

### 4.1 主键特性

- **唯一性**：主键列值在表中唯一
- **非空性**：主键列不允许 NULL
- **不可变性**：主键值通常不应修改

```sql
-- 单列主键
CREATE TABLE departments (
    dept_id INTEGER PRIMARY KEY,
    name    VARCHAR(100) NOT NULL
);

-- 复合主键
CREATE TABLE enrollments (
    student_id INTEGER NOT NULL,
    course_id  INTEGER NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, course_id)
);
```

### 4.2 代理键 vs 自然键

| 方案   | 示例            | 优点                 | 缺点               |
| ------ | --------------- | -------------------- | ------------------ |
| 代理键 | 自增 ID / UUID  | 简单、不变、索引高效 | 额外列、无业务含义 |
| 自然键 | 身份证号 / ISBN | 有业务含义           | 可能变化、格式复杂 |

```sql
-- 代理键（推荐）
CREATE TABLE users (
    id    BIGSERIAL PRIMARY KEY,
    email VARCHAR(200) NOT NULL UNIQUE
);

-- UUID 代理键
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data JSONB
);
```

## 5. FOREIGN KEY 约束

### 5.1 外键定义

```sql
CREATE TABLE orders (
    order_id  BIGSERIAL PRIMARY KEY,
    user_id   BIGINT NOT NULL,
    status    VARCHAR(20) DEFAULT 'pending',

    CONSTRAINT fk_orders_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(id)
);

-- 自引用外键
CREATE TABLE categories (
    id        SERIAL PRIMARY KEY,
    name      VARCHAR(100) NOT NULL,
    parent_id INTEGER,
    CONSTRAINT fk_categories_parent
        FOREIGN KEY (parent_id) REFERENCES categories(id)
);
```

### 5.2 引用操作

当被引用行被删除或更新时，外键可定义级联行为：

| 操作        | 说明                           |
| ----------- | ------------------------------ |
| CASCADE     | 级联删除/更新引用行            |
| SET NULL    | 将引用列设为 NULL              |
| SET DEFAULT | 将引用列设为默认值             |
| RESTRICT    | 拒绝操作（立即检查）           |
| NO ACTION   | 拒绝操作（延迟检查，SQL 标准） |

```sql
CREATE TABLE order_items (
    item_id   BIGSERIAL PRIMARY KEY,
    order_id  BIGINT NOT NULL,
    product_id BIGINT NOT NULL,

    CONSTRAINT fk_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE           -- 删除订单时级联删除明细
        ON UPDATE CASCADE,

    CONSTRAINT fk_items_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT          -- 有引用时禁止删除产品
);
```

### 5.3 外键性能考量

```sql
-- 外键自动创建索引（部分数据库）
-- PostgreSQL/SQL Server：不自动创建索引
-- MySQL InnoDB：自动创建索引

-- 推荐手动为外键列创建索引
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

### 5.4 延迟约束检查

```sql
-- PostgreSQL：延迟约束到事务结束
INSERT INTO orders (order_id, user_id) VALUES (1, 999);  -- 引用不存在用户
INSERT INTO users (id, name) VALUES (999, 'new_user');    -- 补充用户
-- 需要延迟约束检查

SET CONSTRAINTS fk_orders_user_id DEFERRED;

BEGIN;
INSERT INTO orders (order_id, user_id) VALUES (1, 999);
INSERT INTO users (id, name) VALUES (999, 'new_user');
COMMIT;  -- 事务提交时检查约束
```

## 6. CHECK 约束

### 6.1 列级与表级 CHECK

```sql
CREATE TABLE products (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    price       DECIMAL(10, 2) CHECK (price > 0),           -- 列级
    discount    DECIMAL(5, 2) CHECK (discount >= 0 AND discount <= 100),
    stock       INTEGER CHECK (stock >= 0),

    -- 表级 CHECK：跨列条件
    CONSTRAINT ck_products_price_discount
        CHECK (price * (1 - discount / 100.0) > 0)
);
```

### 6.2 CHECK 约束的限制

- **不能包含子查询**：`CHECK (user_id IN (SELECT id FROM users))` 无效
- **不能包含聚合函数**：`CHECK (salary > AVG(salary))` 无效
- **不能引用其他行**：无法实现"本行值必须大于前一行"等约束
- **可为 NULL**：如果 CHECK 表达式求值为 NULL，约束视为通过

```sql
-- 注意：NULL 导致 CHECK 约束通过
INSERT INTO products (id, name, price) VALUES (1, 'test', NULL);
-- CHECK (price > 0) 对 NULL 求值为 UNKNOWN，约束通过！

-- 修正：同时添加 NOT NULL
price DECIMAL(10, 2) NOT NULL CHECK (price > 0)
```

## 7. DEFAULT 约束

```sql
CREATE TABLE audit_log (
    id         BIGSERIAL PRIMARY KEY,
    action     VARCHAR(50) NOT NULL,
    user_id    BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status     VARCHAR(20) DEFAULT 'pending'
);

-- 使用默认值插入
INSERT INTO audit_log (action, user_id) VALUES ('login', 42);
-- created_at 自动填充当前时间，status 自动填充 'pending'
```

## 8. 约束管理

### 8.1 查看约束信息

```sql
-- PostgreSQL
SELECT conname, contype, conrelid::regclass AS table_name
FROM pg_constraint
WHERE conrelid = 'orders'::regclass;

-- 信息模式（SQL 标准）
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'orders';
```

### 8.2 禁用与启用约束

```sql
-- PostgreSQL
ALTER TABLE orders DISABLE TRIGGER ALL;     -- 禁用所有触发器（含约束）
ALTER TABLE orders ENABLE TRIGGER ALL;      -- 重新启用

-- SQL Server
ALTER TABLE orders NOCHECK CONSTRAINT ALL;  -- 禁用约束检查
ALTER TABLE orders CHECK CONSTRAINT ALL;    -- 启用约束检查

-- MySQL（无直接禁用约束语法，需删除重建）
ALTER TABLE orders DROP FOREIGN KEY fk_orders_user_id;
-- ... 数据操作 ...
ALTER TABLE orders ADD CONSTRAINT fk_orders_user_id
    FOREIGN KEY (user_id) REFERENCES users(id);
```
