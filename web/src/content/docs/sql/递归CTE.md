---
order: 63
title: 递归CTE
module: sql
category: SQL
difficulty: advanced
description: 'SQL递归公用表表达式：WITH RECURSIVE语法、层级遍历、图遍历、斐波那契数列与终止条件控制'
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/子查询
  - sql/公用表表达式
  - sql/PIVOT与UNPIVOT
  - sql/集合操作
prerequisites:
  - sql/概述与标准
---

## 1. 递归 CTE 概述

递归 CTE（Recursive CTE）允许查询引用自身，用于处理层级数据、树形结构和图遍历等递归问题。

### 1.1 基本语法

```sql
WITH RECURSIVE cte_name AS (
    -- 锚点查询（基础情况，非递归）
    SELECT ...

    UNION ALL

    -- 递归查询（引用自身）
    SELECT ... FROM cte_name WHERE ...
)
SELECT * FROM cte_name;
```

### 1.2 执行流程

```
1. 执行锚点查询，生成初始结果集 R0
2. 将 R0 作为输入，执行递归查询，生成 R1
3. 将 R1 作为输入，执行递归查询，生成 R2
4. 重复直到递归查询返回空结果集
5. 最终结果 = R0 ∪ R1 ∪ R2 ∪ ...
```

## 2. 层级数据遍历

### 2.1 组织架构树

```sql
CREATE TABLE employees (
    emp_id    SERIAL PRIMARY KEY,
    name      VARCHAR(100),
    manager_id INTEGER REFERENCES employees(emp_id)
);

-- 从顶级经理开始，向下遍历所有层级
WITH RECURSIVE org_tree AS (
    -- 锚点：顶级经理（无上级）
    SELECT emp_id, name, manager_id, 1 AS level, name::TEXT AS path
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- 递归：每个经理的下属
    SELECT e.emp_id, e.name, e.manager_id,
           ot.level + 1,
           ot.path || ' > ' || e.name
    FROM employees e
    JOIN org_tree ot ON e.manager_id = ot.emp_id
)
SELECT * FROM org_tree ORDER BY level, path;
```

**输出示例**：

| emp_id | name | manager_id | level | path             |
| ------ | ---- | ---------- | ----- | ---------------- |
| 1      | CEO  | NULL       | 1     | CEO              |
| 2      | CTO  | 1          | 2     | CEO > CTO        |
| 3      | CFO  | 1          | 2     | CEO > CFO        |
| 4      | Dev1 | 2          | 3     | CEO > CTO > Dev1 |

### 2.2 自底向上遍历

```sql
-- 从指定员工向上查找所有上级
WITH RECURSIVE manager_chain AS (
    -- 锚点：指定员工
    SELECT emp_id, name, manager_id, 0 AS distance
    FROM employees
    WHERE emp_id = 42

    UNION ALL

    -- 递归：向上查找上级
    SELECT e.emp_id, e.name, e.manager_id, mc.distance + 1
    FROM employees e
    JOIN manager_chain mc ON e.emp_id = mc.manager_id
)
SELECT * FROM manager_chain ORDER BY distance;
```

### 2.3 计算每个节点的子树大小

```sql
WITH RECURSIVE subtree AS (
    -- 锚点：每个员工自身
    SELECT emp_id AS root_id, emp_id
    FROM employees

    UNION ALL

    -- 递归：向下扩展子树
    SELECT s.root_id, e.emp_id
    FROM subtree s
    JOIN employees e ON e.manager_id = s.emp_id
)
SELECT root_id AS emp_id, COUNT(*) AS subtree_size
FROM subtree
GROUP BY root_id
ORDER BY subtree_size DESC;
```

## 3. 图遍历

### 3.1 最短路径

```sql
CREATE TABLE edges (
    from_node VARCHAR(10),
    to_node   VARCHAR(10),
    weight    INTEGER
);

-- BFS 查找最短路径
WITH RECURSIVE bfs AS (
    -- 锚点：起始节点
    SELECT
        from_node AS current,
        to_node AS next_node,
        weight AS total_weight,
        from_node::TEXT AS path,
        1 AS depth

    FROM edges
    WHERE from_node = 'A'

    UNION ALL

    -- 递归：扩展到下一层
    SELECT
        e.from_node,
        e.to_node,
        b.total_weight + e.weight,
        b.path || ' -> ' || e.to_node,
        b.depth + 1
    FROM edges e
    JOIN bfs b ON e.from_node = b.next_node
    WHERE b.path NOT LIKE '%' || e.to_node || '%'  -- 避免环路
)
SELECT path, total_weight, depth
FROM bfs
WHERE next_node = 'D'
ORDER BY total_weight
LIMIT 1;
```

### 3.2 航班路线搜索

```sql
CREATE TABLE flights (
    flight_id  VARCHAR(10),
    from_city  VARCHAR(50),
    to_city    VARCHAR(50),
    price      DECIMAL(10, 2)
);

-- 查找从北京到上海的所有路线（最多2次中转）
WITH RECURSIVE routes AS (
    -- 锚点：直飞航班
    SELECT
        from_city,
        to_city,
        price,
        from_city || ' -> ' || to_city AS route,
        1 AS stops
    FROM flights
    WHERE from_city = '北京'

    UNION ALL

    -- 递归：中转航班
    SELECT
        r.from_city,
        f.to_city,
        r.price + f.price,
        r.route || ' -> ' || f.to_city,
        r.stops + 1
    FROM routes r
    JOIN flights f ON r.to_city = f.from_city
    WHERE r.stops < 3  -- 最多2次中转
      AND r.route NOT LIKE '%' || f.to_city || '%'  -- 避免环路
)
SELECT route, price, stops
FROM routes
WHERE to_city = '上海'
ORDER BY price
LIMIT 5;
```

## 4. 数列生成

### 4.1 斐波那契数列

```sql
WITH RECURSIVE fib AS (
    -- 锚点：前两个数
    SELECT 1 AS n, 0 AS fib_n, 1 AS fib_n_plus_1

    UNION ALL

    -- 递归：下一个数
    SELECT n + 1, fib_n_plus_1, fib_n + fib_n_plus_1
    FROM fib
    WHERE n < 20
)
SELECT n, fib_n AS fibonacci_number FROM fib;
```

### 4.2 日期序列

```sql
-- 生成2026年所有日期
WITH RECURSIVE dates AS (
    SELECT DATE '2026-01-01' AS dt

    UNION ALL

    SELECT dt + INTERVAL '1 day'
    FROM dates
    WHERE dt < DATE '2026-12-31'
)
SELECT dt FROM dates;
```

### 4.3 数字序列

```sql
-- 生成1到1000的数字序列
WITH RECURSIVE nums AS (
    SELECT 1 AS n

    UNION ALL

    SELECT n + 1 FROM nums WHERE n < 1000
)
SELECT n FROM nums;
```

## 5. 终止条件与安全控制

### 5.1 终止条件

递归 CTE 在以下情况终止：

1. 递归查询返回空结果集
2. 达到数据库的递归深度限制

```sql
-- PostgreSQL：设置递归深度限制
SET max_recursion_depth = 100;  -- 默认无限制

-- MySQL：在查询中指定
WITH RECURSIVE cte AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM cte WHERE n < 1000  -- WHERE 条件控制终止
)
SELECT * FROM cte;

-- SQL Server：OPTION 提示
SELECT * FROM cte OPTION (MAXRECURSION 100);
```

### 5.2 防止无限递归

```sql
-- 方法1：深度限制
WITH RECURSIVE tree AS (
    SELECT id, parent_id, 1 AS depth
    FROM nodes WHERE parent_id IS NULL

    UNION ALL

    SELECT n.id, n.parent_id, t.depth + 1
    FROM nodes n JOIN tree t ON n.parent_id = t.id
    WHERE t.depth < 10  -- 限制最大深度
)

-- 方法2：路径去重（防止环路）
WITH RECURSIVE tree AS (
    SELECT id, parent_id, ARRAY[id] AS visited
    FROM nodes WHERE parent_id IS NULL

    UNION ALL

    SELECT n.id, n.parent_id, t.visited || n.id
    FROM nodes n JOIN tree t ON n.parent_id = t.id
    WHERE n.id <> ALL(t.visited)  -- 排除已访问节点
)
```

## 6. 性能优化

### 6.1 索引支持

```sql
-- 递归查询的连接列需要索引
CREATE INDEX idx_employees_manager_id ON employees(manager_id);

-- 递归查询通常使用 Nested Loop，索引至关重要
```

### 6.2 减少递归层数

```sql
-- 优化前：逐层递归
WITH RECURSIVE tree AS (...)

-- 优化后：使用物化路径或嵌套集模型
-- 物化路径：存储完整路径 "1/3/7/12"
-- 嵌套集：存储左值右值 (lft, rgt)
-- 这些非递归模型查询效率更高
```

### 6.3 递归 CTE vs 递归函数

| 特性     | 递归 CTE           | 递归函数     |
| -------- | ------------------ | ------------ |
| 语言     | 纯 SQL             | PL/pgSQL 等  |
| 灵活性   | 有限               | 高           |
| 调试     | 困难               | 较容易       |
| 性能     | 单次查询，减少往返 | 可能多次查询 |
| 适用场景 | 简单层级遍历       | 复杂递归逻辑 |
