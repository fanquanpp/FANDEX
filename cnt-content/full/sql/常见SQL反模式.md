---
order: 103
title: 常见SQL反模式
module: sql
category: database
difficulty: intermediate
description: 'SQL 开发中的常见反模式：存储 CSV 列、滥用枚举、预优化、隐式类型转换等，以及对应的正确实践。'
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/递归CTE遍历树结构
  - sql/乐观锁与悲观锁
prerequisites:
  - sql/概述与标准
---

## 1. 存储 CSV 列

### 1.1 反模式描述

将多个值以逗号分隔存储在单个列中：

```sql
-- 反模式
CREATE TABLE products (
    id       INT PRIMARY KEY,
    name     VARCHAR(100),
    tag_ids  VARCHAR(255)  -- "1,3,7,12" ← 灾难！
);
```

### 1.2 问题分析

| 问题               | 示例                                |
| ------------------ | ----------------------------------- |
| 无法保证引用完整性 | `tag_ids` 中的值无法建立外键        |
| 无法使用索引       | `WHERE tag_ids LIKE '%3%'` 全表扫描 |
| 查询困难           | 查找包含标签3的产品需要 LIKE 或正则 |
| 聚合困难           | 统计每个标签的产品数需要字符串拆分  |
| 更新困难           | 删除某个标签需要字符串操作          |
| 顺序依赖           | "1,3" ≠ "3,1" 但语义相同            |

```sql
-- 查找包含标签3的产品：性能极差且可能误匹配
SELECT * FROM products WHERE tag_ids LIKE '%3%';
-- 误匹配: "13,27" 中的 3

-- 稍好但仍差
SELECT * FROM products WHERE CONCAT(',', tag_ids, ',') LIKE '%,3,%';
```

### 1.3 正确方案：关联表

```sql
-- 正确：多对多关联表
CREATE TABLE products (
    id   INT PRIMARY KEY,
    name VARCHAR(100)
);

CREATE TABLE tags (
    id   INT PRIMARY KEY,
    name VARCHAR(50)
);

CREATE TABLE product_tags (
    product_id INT,
    tag_id     INT,
    PRIMARY KEY (product_id, tag_id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id)
);

-- 查找包含标签3的产品：索引高效
SELECT p.* FROM products p
JOIN product_tags pt ON p.id = pt.product_id
WHERE pt.tag_id = 3;

-- 统计每个标签的产品数
SELECT tag_id, COUNT(*) AS product_count
FROM product_tags
GROUP BY tag_id;
```

### 1.4 何时可以存储 CSV

极少数场景下 CSV 列是合理的：

- **纯展示数据**：仅存储不查询，如日志快照
- **JSON 替代**：数据库不支持 JSON 类型时的妥协
- **只读归档**：数据不再变更

## 2. 滥用枚举列

### 2.1 反模式描述

```sql
-- 反模式：用 ENUM 表示状态
CREATE TABLE orders (
    id     INT PRIMARY KEY,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled')
);
```

### 2.2 ENUM 的问题

| 问题                 | 说明                                                        |
| -------------------- | ----------------------------------------------------------- |
| 新增值需 ALTER TABLE | `ALTER TABLE orders MODIFY status ENUM(...)` — 大表可能锁表 |
| 值顺序固定           | 枚举值按定义顺序存储为整数，修改顺序危险                    |
| 可移植性差           | 非 MySQL 数据库不支持 ENUM                                  |
| 值与索引混淆         | `status = 1` 可能匹配 'processing' 而非 'pending'           |
| 不支持 i18n          | 枚举值直接存储在 DDL 中                                     |

```sql
-- 危险：隐式类型转换
INSERT INTO orders (id, status) VALUES (1, 2);  -- 插入 'processing' 而非 'pending'
SELECT * FROM orders WHERE status = 1;           -- 返回 'processing' 的行
```

### 2.3 正确方案：查找表

```sql
-- 正确：使用查找表
CREATE TABLE order_statuses (
    id   INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

INSERT INTO order_statuses VALUES
(1, 'pending', '订单已创建'),
(2, 'processing', '订单处理中'),
(3, 'shipped', '已发货'),
(4, 'delivered', '已送达'),
(5, 'cancelled', '已取消');

CREATE TABLE orders (
    id        INT PRIMARY KEY,
    status_id INT NOT NULL DEFAULT 1,
    FOREIGN KEY (status_id) REFERENCES order_statuses(id)
);

-- 新增状态只需 INSERT，无需 ALTER TABLE
INSERT INTO order_statuses VALUES (6, 'refunded', '已退款');
```

### 2.4 小型枚举的例外

当枚举值**极其稳定**且**数量极少**时，ENUM 是可接受的：

```sql
-- 可接受：性别（几乎不会变）
gender ENUM('male', 'female', 'other')

-- 可接受：布尔类型（MySQL 8.0 前）
is_active ENUM('Y', 'N')
```

## 3. 预优化

### 3.1 反模式描述

在没有性能问题之前就进行优化，导致：

- 代码复杂度增加
- 维护成本上升
- 优化方向可能错误
- 过早引入分库分表等复杂架构

### 3.2 常见预优化错误

```sql
-- 错误1：过早添加索引
-- 每个索引都有写入开销，不要为"可能用到"的查询建索引
CREATE INDEX idx_xxx ON orders(col_a, col_b, col_c, col_d, col_e);  -- 5列联合索引

-- 错误2：过度反范式化
-- 为了避免 JOIN 而冗余存储，导致数据不一致
CREATE TABLE order_items (
    id          INT PRIMARY KEY,
    order_id    INT,
    product_id  INT,
    product_name VARCHAR(100),  -- 冗余！产品改名需同步更新
    unit_price  DECIMAL(10,2),  -- 冗余！价格变动需同步
    quantity    INT
);

-- 错误3：过早分库分表
-- 单表 100 万行就考虑分表，实际 MySQL 可轻松处理千万级
```

### 3.3 正确的优化流程

```
1. 先写正确的 SQL → 功能正确
2. 压测发现瓶颈 → 数据驱动
3. 针对性优化   → 最小改动
4. 验证优化效果 → 量化收益
```

```sql
-- 用 EXPLAIN 验证是否真的需要索引
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 100 AND created_at > '2026-01-01';

-- 只在确认需要时才添加索引
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);
```

### 3.4 优化优先级

| 优先级 | 优化手段       | 收益      |
| ------ | -------------- | --------- |
| 1      | 添加合适的索引 | 10x-1000x |
| 2      | 优化查询写法   | 2x-10x    |
| 3      | 表结构调整     | 2x-5x     |
| 4      | 缓存层         | 5x-100x   |
| 5      | 分库分表       | 按需扩展  |

## 4. 隐式类型转换

### 4.1 反模式描述

```sql
-- 表定义
CREATE TABLE users (
    id       INT PRIMARY KEY,
    phone    VARCHAR(20),
    age      INT
);

-- 反模式：字符串与数字比较
SELECT * FROM users WHERE phone = 13800138000;     -- VARCHAR vs INT
SELECT * FROM users WHERE id = '100';               -- INT vs VARCHAR
```

### 4.2 转换规则与陷阱

MySQL 的隐式转换规则：

1. **一方为数字**：将字符串转为数字比较
2. **双方为字符串**：按字符串比较
3. **数字与字符串列比较**：**列被转换**，索引失效！

```sql
-- phone 是 VARCHAR，与数字比较时 phone 列被转为数字
-- 索引失效！全表扫描！
SELECT * FROM users WHERE phone = 13800138000;
-- 等价于: WHERE CAST(phone AS DECIMAL) = 13800138000

-- 正确：使用字符串常量
SELECT * FROM users WHERE phone = '13800138000';
-- 索引有效

-- 另一个陷阱：字符串数字比较
SELECT '100' = 100;     -- 1 (true) — 字符串被转为数字
SELECT 'abc' = 0;       -- 1 (true) — 'abc' 转为 0！
SELECT '100a' = 100;    -- 1 (true) — '100a' 截断为 100
```

### 4.3 防范措施

```sql
-- 1. 始终使用与列类型匹配的常量类型
WHERE phone = '13800138000'   -- VARCHAR 列用字符串
WHERE id = 100                -- INT 列用数字

-- 2. 使用显式 CAST
WHERE CAST(phone AS CHAR) = '13800138000'

-- 3. 应用层参数化查询（ORM 通常自动处理）
-- Python: cursor.execute("SELECT * FROM users WHERE phone = %s", ('13800138000',))
```

## 5. 其他常见反模式

### 5.1 SELECT \*

```sql
-- 反模式：返回所有列
SELECT * FROM users WHERE id = 1;

-- 问题：
-- 1. 网络传输浪费（可能包含大 TEXT/BLOB 列）
-- 2. 无法利用覆盖索引
-- 3. 表结构变更时可能破坏应用
-- 4. 列顺序不确定

-- 正确：只查需要的列
SELECT id, name, email FROM users WHERE id = 1;
```

### 5.2 NULL 误用

```sql
-- 反模式：用 NULL 表示业务含义
CREATE TABLE users (
    id       INT PRIMARY KEY,
    spouse   VARCHAR(50)  -- NULL 表示未婚？还是未知？
);

-- NULL 的三值逻辑陷阱
SELECT * FROM users WHERE spouse != 'Alice';
-- 不包含 spouse IS NULL 的行！

-- 正确：使用 NOT NULL + 默认值或查找表
CREATE TABLE users (
    id          INT PRIMARY KEY,
    spouse      VARCHAR(50) NOT NULL DEFAULT '',
    marital_status VARCHAR(20) NOT NULL DEFAULT 'single'
);
```

### 5.3 无界查询

```sql
-- 反模式：无 LIMIT 的查询
SELECT * FROM orders WHERE user_id = 100;

-- 可能返回百万行，导致 OOM
-- 正确：始终加 LIMIT
SELECT * FROM orders WHERE user_id = 100 ORDER BY created_at DESC LIMIT 50;

-- 分页查询
SELECT * FROM orders WHERE user_id = 100
ORDER BY created_at DESC
LIMIT 20 OFFSET 40;  -- 第3页，每页20条

-- 深分页优化：游标分页
SELECT * FROM orders
WHERE user_id = 100 AND created_at < '2026-06-01 00:00:00'
ORDER BY created_at DESC
LIMIT 20;
```

### 5.4 在 WHERE 中使用函数

```sql
-- 反模式：列上使用函数，索引失效
SELECT * FROM orders WHERE DATE(created_at) = '2026-06-14';
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
SELECT * FROM products WHERE YEAR(created_at) = 2026;

-- 正确：使用范围查询或函数索引
SELECT * FROM orders
WHERE created_at >= '2026-06-14' AND created_at < '2026-06-15';

-- PostgreSQL 函数索引
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- MySQL 8.0+ 函数索引
CREATE INDEX idx_orders_date ON orders((DATE(created_at)));
```
