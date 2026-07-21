---
order: 53
title: 聚簇索引与二级索引
module: mysql
category: MySQL
difficulty: advanced
description: 'MySQL InnoDB聚簇索引与二级索引：B+树结构、回表查询、覆盖索引与索引优化策略'
author: fanquanpp
updated: '2026-06-14'
related:
  - mysql/Memory存储引擎
  - mysql/NDB集群
  - mysql/联合索引与最左前缀原则
  - mysql/索引下推
prerequisites:
  - mysql/语法速查
---

## 1. 聚簇索引

### 1.1 概念

聚簇索引将数据行与主键索引存储在同一棵 B+树中，叶子节点直接包含完整的行数据。InnoDB 每张表只有一个聚簇索引。

```
聚簇索引 B+树结构：
            [30|60]
           /   |    \
    [10|20|30] [40|50|60] [70|80|90]
        ↓         ↓         ↓
    → [行1][行2][行3] → [行4][行5][行6] → [行7][行8][行9] →
        叶子节点（包含完整行数据）
```

### 1.2 聚簇索引的选择

InnoDB 按以下优先级选择聚簇索引：

1. 显式定义的 PRIMARY KEY
2. 第一个 NOT NULL 的 UNIQUE KEY
3. 系统自动生成的隐藏 ROW_ID（6字节）

```sql
-- 推荐使用自增主键
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,  -- 聚簇索引
    name VARCHAR(100),
    email VARCHAR(200) UNIQUE
);

-- 避免使用 UUID 作为主键
-- UUID 无序，插入导致页分裂，索引碎片化
```

### 1.3 自增主键 vs UUID 主键

| 特性       | 自增主键 | UUID 主键             |
| ---------- | -------- | --------------------- |
| 插入顺序   | 顺序追加 | 随机插入              |
| 页分裂     | 极少     | 频繁                  |
| 索引碎片   | 少       | 多                    |
| 空间利用率 | 高       | 低（36字节 vs 8字节） |
| 全局唯一   | 否       | 是                    |
| 安全性     | 可预测   | 不可预测              |

## 2. 二级索引

### 2.1 概念

二级索引（非聚簇索引）的叶子节点存储主键值而非行数据。通过二级索引查找行数据需要两步：先查二级索引获取主键，再查聚簇索引获取行数据。

```
二级索引 B+树结构：
            [M|S]
           /     \
    [A|D|M]      [S|Z]
      ↓            ↓
    → [1][3][5] → [7][9] →
      叶子节点（存储主键值）
```

### 2.2 回表查询

```sql
-- 二级索引：idx_employees_name (name)
SELECT * FROM employees WHERE name = 'Alice';

-- 执行过程：
-- 1. 在 name 索引 B+树中查找 'Alice'，获取主键 id = 5
-- 2. 在聚簇索引 B+树中查找 id = 5，获取完整行数据
-- 这就是"回表"操作
```

### 2.3 回表的代价

```sql
-- 如果查询返回大量行，回表代价很高
-- 假设 name 索引选择性低，返回 10000 行
SELECT * FROM employees WHERE name = 'Alice';  -- 10000次回表

-- 优化器可能选择全表扫描而非索引 + 回表
-- 当回表代价 > 全表扫描代价时
```

## 3. 覆盖索引

### 3.1 概念

覆盖索引是指索引包含了查询所需的所有列，无需回表。

```sql
-- 创建覆盖索引
CREATE INDEX idx_employees_dept_name_salary
ON employees(dept_id, name, salary);

-- 覆盖索引查询：不需要回表
SELECT name, salary FROM employees WHERE dept_id = 5;
-- EXPLAIN 中 Extra: Using index

-- 非覆盖索引查询：需要回表
SELECT name, salary, email FROM employees WHERE dept_id = 5;
-- email 不在索引中，需要回表
```

### 3.2 覆盖索引优化场景

```sql
-- 场景1：避免回表
-- 无覆盖索引
SELECT user_id, COUNT(*) FROM orders GROUP BY user_id;
-- 需要回表获取 user_id

-- 有覆盖索引
CREATE INDEX idx_orders_user_id ON orders(user_id);
SELECT user_id, COUNT(*) FROM orders GROUP BY user_id;
-- Using index，无需回表

-- 场景2：分页查询优化
SELECT id, title FROM articles ORDER BY created_at DESC LIMIT 10000, 10;
-- 使用覆盖索引避免大量回表
CREATE INDEX idx_articles_created_id_title ON articles(created_at DESC, id, title);
```

## 4. 索引下推（ICP）

### 4.1 概念

索引条件下推（Index Condition Pushdown，ICP）将 WHERE 条件中可以在索引上评估的部分下推到存储引擎层，减少回表次数。

```sql
-- 索引 (name, age)
SELECT * FROM employees WHERE name LIKE '张%' AND age > 30;

-- 无 ICP：
-- 1. 存储引擎通过 name LIKE '张%' 找到所有主键
-- 2. 回表获取完整行
-- 3. Server 层评估 age > 30

-- 有 ICP：
-- 1. 存储引擎通过 name LIKE '张%' 找到索引项
-- 2. 在索引中直接评估 age > 30（age 在索引中）
-- 3. 只对满足条件的行回表
-- 减少回表次数！
```

### 4.2 ICP 开启

```sql
-- 默认开启
SET optimizer_switch = 'index_condition_pushdown=on';

-- EXPLAIN 中 Extra: Using index condition
```

## 5. 索引优化策略

### 5.1 减少回表

```sql
-- 方法1：使用覆盖索引
CREATE INDEX idx_cover ON employees(dept_id, name, salary);
SELECT name, salary FROM employees WHERE dept_id = 5;

-- 方法2：延迟关联
-- 先通过二级索引获取主键，再通过主键获取行
SELECT e.* FROM employees e
JOIN (
    SELECT id FROM employees WHERE name LIKE '张%' LIMIT 10000, 10
) tmp ON e.id = tmp.id;
```

### 5.2 避免不必要的列

```sql
-- 不推荐：SELECT *
SELECT * FROM employees WHERE dept_id = 5;

-- 推荐：只查需要的列
SELECT name, salary FROM employees WHERE dept_id = 5;
-- 可能命中覆盖索引
```
