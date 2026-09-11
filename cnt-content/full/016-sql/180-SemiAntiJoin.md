---
order: 180
title: 半连接与反半连接
module: 'sql'
category: 数据库
difficulty: advanced
description: SQL半连接与反半连接：EXISTS、NOT EXISTS、IN、NOT IN的语义、性能差异与优化策略
author: fanquanpp
updated: '2026-09-12'
related:
  - 'sql/160-NaturalJoinUsing'
  - 'sql/170-SelfJoin'
  - 'sql/200-LateralDerivedTable'
  - 'sql/190-Subquery'
prerequisites:
  - 'sql/020-OverviewStandard'
---

## 1. 半连接与反半连接概念

### 1.1 定义

- **半连接（Semi Join）**：返回左表中在右表存在匹配的行，只返回左表列，不关心右表有多少匹配
- **反半连接（Anti Semi Join）**：返回左表中在右表**不存在**匹配的行

### 1.2 SQL 语法映射

| 操作     | 语法1             | 语法2         |
| -------- | ----------------- | ------------- |
| 半连接   | EXISTS 子查询     | IN 子查询     |
| 反半连接 | NOT EXISTS 子查询 | NOT IN 子查询 |

## 2. EXISTS 与 NOT EXISTS

### 2.1 EXISTS 语法

```sql
-- EXISTS：检查子查询是否返回行
SELECT e.name, e.dept_id
FROM employees e
WHERE EXISTS (
    SELECT 1 FROM departments d
    WHERE d.id = e.dept_id AND d.region = 'East'
);
```

### 2.2 NOT EXISTS 语法

```sql
-- NOT EXISTS：检查子查询是否不返回任何行
SELECT d.dept_name
FROM departments d
WHERE NOT EXISTS (
    SELECT 1 FROM employees e
    WHERE e.dept_id = d.id
);
-- 查找没有员工的部门
```

### 2.3 EXISTS 的特点

- 子查询只需判断"是否存在"，找到第一条匹配即停止（短路求值）
- `SELECT 1` 和 `SELECT *` 性能相同，推荐 `SELECT 1` 表明意图
- 子查询与外查询相关（Correlated Subquery）

```sql
-- EXISTS 的短路特性
-- 一旦找到匹配行，子查询立即返回 TRUE
SELECT e.name
FROM employees e
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.user_id = e.id
    -- 找到第一个匹配即停止，不需要扫描所有订单
);
```

## 3. IN 与 NOT IN

### 3.1 IN 子查询

```sql
-- IN：左表列值在子查询结果集中
SELECT e.name, e.dept_id
FROM employees e
WHERE e.dept_id IN (
    SELECT id FROM departments WHERE region = 'East'
);
```

### 3.2 NOT IN 的 NULL 陷阱

```sql
-- NOT IN 遇到 NULL 的严重问题
SELECT e.name
FROM employees e
WHERE e.dept_id NOT IN (
    SELECT dept_id FROM departments WHERE region = 'East'
    -- 如果 dept_id 包含 NULL，结果为空集！
);

-- 原因分析：
-- NOT IN 等价于 dept_id <> v1 AND dept_id <> v2 AND ... AND dept_id <> NULL
-- dept_id <> NULL 结果为 UNKNOWN，整个条件为 FALSE

-- 解决方案1：排除 NULL
SELECT e.name
FROM employees e
WHERE e.dept_id NOT IN (
    SELECT dept_id FROM departments
    WHERE region = 'East' AND dept_id IS NOT NULL
);

-- 解决方案2：使用 NOT EXISTS（推荐）
SELECT e.name
FROM employees e
WHERE NOT EXISTS (
    SELECT 1 FROM departments d
    WHERE d.dept_id = e.dept_id AND d.region = 'East'
);
```

## 4. EXISTS vs IN 性能对比

### 4.1 执行原理差异

| 特性      | EXISTS                 | IN                       |
| --------- | ---------------------- | ------------------------ |
| 执行方式  | 对外查询每行执行子查询 | 先执行子查询，缓存结果集 |
| 适合场景  | 外表小、内表大         | 外表大、内表小           |
| NULL 处理 | 无 NULL 陷阱           | NOT IN 有 NULL 陷阱      |
| 索引利用  | 子查询表索引           | 子查询结果集缓存         |

### 4.2 优化器转换

现代优化器通常会将 EXISTS 和 IN 转换为相同的半连接执行计划：

```sql
-- 以下两个查询在大多数数据库中生成相同执行计划
SELECT * FROM orders o
WHERE EXISTS (SELECT 1 FROM customers c WHERE c.id = o.customer_id AND c.vip = true);

SELECT * FROM orders o
WHERE o.customer_id IN (SELECT id FROM customers WHERE vip = true);

-- 优化器可能统一转换为 Semi Join 或 Hash Semi Join
```

### 4.3 选择建议

```sql
-- 小外表 + 大内表：EXISTS 可能更优
SELECT * FROM small_table s
WHERE EXISTS (SELECT 1 FROM large_table l WHERE l.id = s.id);

-- 大外表 + 小内表：IN 可能更优
SELECT * FROM large_table l
WHERE l.id IN (SELECT id FROM small_table);

-- 实际中：让优化器决定，优先考虑 NOT EXISTS 避免 NULL 陷阱
```

## 5. 半连接的执行计划

### 5.1 半连接算法

| 算法             | 说明                                 |
| ---------------- | ------------------------------------ |
| Nested Loop Semi | 对外表每行，在内表查找第一个匹配     |
| Hash Semi Join   | 构建内表哈希表，外表探测             |
| Merge Semi Join  | 两表排序后归并，找到第一个匹配即停止 |

### 5.2 查看执行计划

```sql
-- PostgreSQL
EXPLAIN ANALYZE
SELECT * FROM orders o
WHERE EXISTS (SELECT 1 FROM customers c WHERE c.id = o.customer_id);

-- 查找执行计划中的 Semi Join 节点
-- -> Hash Semi Join
--    Hash Cond: (o.customer_id = c.id)
```

## 6. 反半连接的执行计划

### 6.1 反半连接算法

| 算法             | 说明                                   |
| ---------------- | -------------------------------------- |
| Nested Loop Anti | 对外表每行，在内表查找，找不到则输出   |
| Hash Anti Join   | 构建内表哈希表，外表探测，未命中则输出 |
| Merge Anti Join  | 排序归并，内表无匹配则输出外表行       |

### 6.2 LEFT JOIN + IS NULL 模式

```sql
-- 另一种反半连接写法
SELECT d.dept_name
FROM departments d
LEFT JOIN employees e ON d.id = e.dept_id
WHERE e.id IS NULL;

-- 等价于
SELECT d.dept_name
FROM departments d
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.dept_id = d.id);

-- 优化器可能将两者转换为相同的 Anti Join 执行计划
```

## 7. 高级应用

### 7.1 关联 EXISTS 实现分组过滤

```sql
-- 查找至少下过3个不同类别订单的用户
SELECT u.name
FROM users u
WHERE EXISTS (
    SELECT 1 FROM (
        SELECT category_id
        FROM orders o
        WHERE o.user_id = u.id
        GROUP BY category_id
        HAVING COUNT(*) >= 1
    ) sub
    HAVING COUNT(*) >= 3
);

-- 更简洁的写法
SELECT u.name
FROM users u
WHERE (
    SELECT COUNT(DISTINCT category_id)
    FROM orders o
    WHERE o.user_id = u.id
) >= 3;
```

### 7.2 双重 NOT EXISTS（关系除法）

```sql
-- 查找订购了所有产品的客户
SELECT c.name
FROM customers c
WHERE NOT EXISTS (
    -- 存在一个产品该客户没有订购
    SELECT 1 FROM products p
    WHERE NOT EXISTS (
        SELECT 1 FROM orders o
        WHERE o.customer_id = c.id AND o.product_id = p.id
    )
);
```
## 半连接（Semi Join）

**基本写法：IN 实现半连接**
`SELECT * FROM <表1> WHERE <列> IN (SELECT <列> FROM <表2>)`
```sql
-- 查找有订单的客户（半连接：只返回左表匹配行）
SELECT * FROM customers
WHERE id IN (SELECT customer_id FROM orders);
```

---

**基本写法：EXISTS 实现半连接**
`SELECT * FROM <表1> t1 WHERE EXISTS (SELECT 1 FROM <表2> t2 WHERE t2.<列> = t1.<列>)`
```sql
-- EXISTS 半连接：存在即返回
SELECT * FROM customers c
WHERE EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.id
);
```

---

**基本写法：ANY 实现半连接**
`SELECT * FROM <表1> WHERE <列> = ANY (SELECT <列> FROM <表2>)`
```sql
-- = ANY 等价于 IN
SELECT * FROM employees
WHERE dept_id = ANY (SELECT id FROM departments WHERE active = 1);
```

---

## 反连接（Anti Join）

**基本写法：NOT IN 实现反连接**
`SELECT * FROM <表1> WHERE <列> NOT IN (SELECT <列> FROM <表2>)`
```sql
-- 查找没有订单的客户（反连接：只返回左表不匹配行）
SELECT * FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders);
```

---

**基本写法：NOT EXISTS 实现反连接**
`SELECT * FROM <表1> t1 WHERE NOT EXISTS (SELECT 1 FROM <表2> t2 WHERE t2.<列> = t1.<列>)`
```sql
-- NOT EXISTS 反连接：不存在才返回
SELECT * FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.id
);
```

---

**基本写法：LEFT JOIN + IS NULL 实现反连接**
`SELECT * FROM <表1> t1 LEFT JOIN <表2> t2 ON <条件> WHERE t2.<列> IS NULL`
```sql
-- 左连接反连接：连接结果为 NULL 的行
SELECT c.*
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;
```

---

## IN 与 EXISTS 对比

**基本写法：IN 适合子查询结果小**
`WHERE <列> IN (SELECT <列> FROM <表>)`
```sql
-- 子查询结果集较小时 IN 更快
SELECT * FROM orders
WHERE customer_id IN (SELECT id FROM customers WHERE vip = 1);
```

---

**基本写法：EXISTS 适合外查询表大**
`WHERE EXISTS (SELECT 1 FROM <表> WHERE <条件>)`
```sql
-- 外查询表大、子查询表小时 EXISTS 更快
SELECT * FROM large_orders lo
WHERE EXISTS (
  SELECT 1 FROM customers c
  WHERE c.id = lo.customer_id AND c.vip = 1
);
```

---

**基本写法：NOT IN 的 NULL 陷阱**
`-- NOT IN 子查询中有 NULL 时不返回任何行`
```sql
-- 危险：子查询含 NULL 时 NOT IN 返回空集
SELECT * FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders WHERE status IS NOT NULL);
-- 如果 orders.customer_id 有 NULL，整个查询返回空

-- 正确做法：排除 NULL
SELECT * FROM customers
WHERE id NOT IN (
  SELECT customer_id FROM orders WHERE customer_id IS NOT NULL
);
```

---

**基本写法：NOT EXISTS 不受 NULL 影响**
`WHERE NOT EXISTS (SELECT 1 FROM <表> WHERE <条件>)`
```sql
-- NOT EXISTS 不受 NULL 影响，更安全
SELECT * FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.id
);
```

---

## 半连接/反连接应用场景

**基本写法：查找已购买特定商品的用户**
`SELECT * FROM <表> WHERE <列> IN (SELECT <列> FROM <表> WHERE <条件>)`
```sql
-- 查找买过商品 A 的用户
SELECT * FROM users
WHERE id IN (
  SELECT user_id FROM orders
  WHERE product_id = (SELECT id FROM products WHERE name = '商品A')
);
```

---

**基本写法：查找未完成任务的项目**
`SELECT * FROM <表1> WHERE NOT EXISTS (SELECT 1 FROM <表2> WHERE <条件>)`
```sql
-- 查找没有已完成任务的项目
SELECT * FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM tasks t
  WHERE t.project_id = p.id AND t.status = 'done'
);
```

---

**基本写法：查找部门中所有员工都有奖金**
`SELECT * FROM <表1> t1 WHERE NOT EXISTS (SELECT 1 FROM <表2> t2 WHERE <条件1> AND <反向条件>)`
```sql
-- 查找所有员工都有奖金的部门
SELECT d.dept_name
FROM departments d
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  WHERE e.dept_id = d.id
  AND NOT EXISTS (
    SELECT 1 FROM bonuses b WHERE b.emp_id = e.id
  )
);
```

---

## 性能优化

**基本写法：半连接提示**
`-- MySQL 半连接优化参数`
```sql
-- 查看半连接策略
SHOW VARIABLES LIKE 'optimizer_switch';
-- 确保 semijoin=on

-- MySQL 半连接策略
-- FIRSTMATCH   匹配第一行即返回
-- LOOSESCAN    使用索引去重
-- MATERIALIZATION 物化子查询
-- DUPLICATEWEEDOUT 去重
```

---

**基本写法：使用 JOIN 替代半连接**
`SELECT DISTINCT t1.* FROM <表1> t1 JOIN <表2> t2 ON <条件>`
```sql
-- 用 JOIN + DISTINCT 替代 IN/EXISTS
SELECT DISTINCT c.*
FROM customers c
JOIN orders o ON o.customer_id = c.id;
```
