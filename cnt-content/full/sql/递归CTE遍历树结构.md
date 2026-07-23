---
order: 101
title: 递归CTE遍历树结构
module: sql
category: database
difficulty: advanced
description: '递归 CTE 遍历树形与图结构：组织架构层级查询、评论回复树构建、路径枚举与环检测。'
author: fanquanpp
updated: '2026-06-14'
related:
  - sql/多版本并发控制
  - sql/窗口函数框架
  - sql/乐观锁与悲观锁
  - sql/常见SQL反模式
prerequisites:
  - sql/概述与标准
---

## 1. 递归 CTE 基础

### 1.1 递归 CTE 语法结构

递归 CTE（Common Table Expression）由**锚点成员**和**递归成员**通过 `UNION ALL` 连接：

```sql
WITH RECURSIVE cte_name AS (
    -- 锚点查询：非递归的初始行集
    SELECT ...
    FROM ...
    WHERE ...

    UNION ALL

    -- 递归查询：引用 cte_name 自身
    SELECT ...
    FROM cte_name
    JOIN ... ON ...
    WHERE ...
)
SELECT * FROM cte_name;
```

**执行流程**：

```
1. 执行锚点查询，得到初始结果集 R0
2. 用 R0 作为输入执行递归查询，得到 R1
3. 用 R1 作为输入执行递归查询，得到 R2
4. 重复直到递归查询返回空集
5. 最终结果 = R0 ∪ R1 ∪ R2 ∪ ...
```

### 1.2 递归深度限制

```sql
-- MySQL 默认限制 1000 层
SET cte_max_recursion_depth = 10000;

-- PostgreSQL 默认无限制，但可设置
SET max_recursion_depth = 10000;
```

## 2. 组织架构层级查询

### 2.1 自引用表设计

```sql
CREATE TABLE employees (
    emp_id      INT PRIMARY KEY,
    emp_name    VARCHAR(50),
    manager_id  INT,           -- 上级经理ID，顶级为 NULL
    dept_name   VARCHAR(50),
    FOREIGN KEY (manager_id) REFERENCES employees(emp_id)
);

-- 示例数据
INSERT INTO employees VALUES
(1, 'CEO', NULL, 'Executive'),
(2, 'CTO', 1, 'Technology'),
(3, 'CFO', 1, 'Finance'),
(4, 'VP Eng', 2, 'Technology'),
(5, 'VP Finance', 3, 'Finance'),
(6, 'Dev Lead', 4, 'Technology'),
(7, 'Dev Senior', 6, 'Technology');
```

### 2.2 自顶向下遍历：查询某人的所有下属

```sql
WITH RECURSIVE subordinates AS (
    -- 锚点：从指定员工开始
    SELECT emp_id, emp_name, manager_id, 0 AS level, CAST(emp_name AS CHAR(500)) AS path
    FROM employees
    WHERE emp_id = 1  -- 从 CEO 开始

    UNION ALL

    -- 递归：查找下一级下属
    SELECT
        e.emp_id,
        e.emp_name,
        e.manager_id,
        s.level + 1,
        CONCAT(s.path, ' → ', e.emp_name)
    FROM employees e
    INNER JOIN subordinates s ON e.manager_id = s.emp_id
)
SELECT emp_id, emp_name, level, path
FROM subordinates
ORDER BY level, emp_id;
```

输出：

```
emp_id | emp_name   | level | path
-------|------------|-------|---------------------------
1      | CEO        | 0     | CEO
2      | CTO        | 1     | CEO → CTO
3      | CFO        | 1     | CEO → CFO
4      | VP Eng     | 2     | CEO → CTO → VP Eng
5      | VP Finance | 2     | CEO → CFO → VP Finance
6      | Dev Lead   | 3     | CEO → CTO → VP Eng → Dev Lead
7      | Dev Senior | 4     | CEO → CTO → VP Eng → Dev Lead → Dev Senior
```

### 2.3 自底向上遍历：查询某人的所有上级

```sql
WITH RECURSIVE managers AS (
    -- 锚点：从指定员工开始
    SELECT emp_id, emp_name, manager_id, 0 AS level
    FROM employees
    WHERE emp_id = 7  -- 从 Dev Senior 开始

    UNION ALL

    -- 递归：向上查找经理
    SELECT
        e.emp_id,
        e.emp_name,
        e.manager_id,
        m.level + 1
    FROM employees e
    INNER JOIN managers m ON e.emp_id = m.manager_id
)
SELECT emp_id, emp_name, level
FROM managers
ORDER BY level DESC;
```

### 2.4 计算每人的下属人数

```sql
WITH RECURSIVE sub_tree AS (
    SELECT emp_id, emp_name, manager_id
    FROM employees
    WHERE manager_id IS NULL  -- 顶级

    UNION ALL

    SELECT e.emp_id, e.emp_name, e.manager_id
    FROM employees e
    INNER JOIN sub_tree s ON e.manager_id = s.emp_id
)
SELECT
    s.emp_id,
    s.emp_name,
    COUNT(child.emp_id) AS direct_reports,
    (SELECT COUNT(*) FROM sub_tree st WHERE st.manager_id = s.emp_id) AS total_reports
FROM sub_tree s
LEFT JOIN employees child ON child.manager_id = s.emp_id
GROUP BY s.emp_id, s.emp_name;
```

## 3. 评论回复树

### 3.1 邻接表模型

```sql
CREATE TABLE comments (
    comment_id  INT PRIMARY KEY AUTO_INCREMENT,
    post_id     INT NOT NULL,
    parent_id   INT,           -- 父评论ID，顶级评论为 NULL
    user_id     INT NOT NULL,
    content     TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES comments(comment_id)
);
```

### 3.2 构建评论树

```sql
WITH RECURSIVE comment_tree AS (
    -- 锚点：顶级评论
    SELECT
        comment_id,
        post_id,
        parent_id,
        user_id,
        content,
        created_at,
        0 AS depth,
        CAST(comment_id AS CHAR(1000)) AS path,
        CAST(LPAD(comment_id, 10, '0') AS CHAR(1000)) AS sort_path
    FROM comments
    WHERE post_id = 42 AND parent_id IS NULL

    UNION ALL

    -- 递归：子评论
    SELECT
        c.comment_id,
        c.post_id,
        c.parent_id,
        c.user_id,
        c.content,
        c.created_at,
        ct.depth + 1,
        CONCAT(ct.path, '.', c.comment_id),
        CONCAT(ct.sort_path, '.', LPAD(c.comment_id, 10, '0'))
    FROM comments c
    INNER JOIN comment_tree ct ON c.parent_id = ct.comment_id
)
SELECT
    comment_id,
    parent_id,
    content,
    depth,
    REPEAT('  ', depth) || content AS indented_content,
    path
FROM comment_tree
ORDER BY sort_path;
```

### 3.3 限制递归深度

```sql
-- 只获取2级评论（顶级 + 1层回复）
WITH RECURSIVE comment_tree AS (
    SELECT comment_id, parent_id, content, 0 AS depth
    FROM comments WHERE post_id = 42 AND parent_id IS NULL

    UNION ALL

    SELECT c.comment_id, c.parent_id, c.content, ct.depth + 1
    FROM comments c
    INNER JOIN comment_tree ct ON c.parent_id = ct.comment_id
    WHERE ct.depth < 1  -- 限制深度
)
SELECT * FROM comment_tree;
```

## 4. 环检测与防护

### 4.1 检测循环引用

```sql
WITH RECURSIVE org_path AS (
    SELECT
        emp_id,
        emp_name,
        manager_id,
        CAST(emp_id AS CHAR(1000)) AS visited_path,
        0 AS depth
    FROM employees
    WHERE emp_id = 1

    UNION ALL

    SELECT
        e.emp_id,
        e.emp_name,
        e.manager_id,
        CONCAT(o.visited_path, ',', e.emp_id),
        o.depth + 1
    FROM employees e
    INNER JOIN org_path o ON e.manager_id = o.emp_id
    -- 环检测：确保当前节点不在已访问路径中
    WHERE FIND_IN_SET(e.emp_id, o.visited_path) = 0
      AND o.depth < 20  -- 安全深度限制
)
SELECT * FROM org_path;
```

### 4.2 PostgreSQL 数组环检测

```sql
WITH RECURSIVE org_path AS (
    SELECT
        emp_id,
        emp_name,
        manager_id,
        ARRAY[emp_id] AS visited,
        0 AS depth
    FROM employees
    WHERE emp_id = 1

    UNION ALL

    SELECT
        e.emp_id,
        e.emp_name,
        e.manager_id,
        o.visited || e.emp_id,
        o.depth + 1
    FROM employees e
    INNER JOIN org_path o ON e.manager_id = o.emp_id
    WHERE e.emp_id <> ALL(o.visited)  -- 数组包含检测
      AND o.depth < 20
)
SELECT * FROM org_path;
```

## 5. 递归 CTE 与其他树模型对比

### 5.1 四种树存储模型

| 模型                         | 查询子树 | 插入     | 移动节点 | 空间 |
| ---------------------------- | -------- | -------- | -------- | ---- |
| 邻接表（Adjacency List）     | 递归 CTE | O(1)     | O(1)     | 优   |
| 路径枚举（Path Enumeration） | LIKE     | O(1)     | O(n)     | 中   |
| 嵌套集（Nested Set）         | BETWEEN  | O(n)     | O(n)     | 优   |
| 闭包表（Closure Table）      | JOIN     | O(depth) | O(n)     | 差   |

### 5.2 闭包表 + 递归 CTE

```sql
-- 闭包表：存储所有祖先-后代关系
CREATE TABLE tree_closure (
    ancestor_id   INT NOT NULL,
    descendant_id INT NOT NULL,
    depth         INT NOT NULL,
    PRIMARY KEY (ancestor_id, descendant_id),
    FOREIGN KEY (ancestor_id) REFERENCES employees(emp_id),
    FOREIGN KEY (descendant_id) REFERENCES employees(emp_id)
);

-- 查询子树：无需递归
SELECT e.*
FROM tree_closure tc
JOIN employees e ON e.emp_id = tc.descendant_id
WHERE tc.ancestor_id = 1;

-- 查询深度
SELECT depth FROM tree_closure
WHERE ancestor_id = 1 AND descendant_id = 7;
-- 结果: 4
```

### 5.3 递归 CTE 实现图遍历

```sql
-- 有向图最短路径
CREATE TABLE edges (
    from_node VARCHAR(10),
    to_node   VARCHAR(10),
    weight    INT
);

WITH RECURSIVE paths AS (
    SELECT
        from_node,
        to_node,
        weight,
        CAST(from_node || '→' || to_node AS VARCHAR(500)) AS path,
        weight AS total_weight
    FROM edges
    WHERE from_node = 'A'

    UNION ALL

    SELECT
        p.from_node,
        e.to_node,
        e.weight,
        p.path || '→' || e.to_node,
        p.total_weight + e.weight
    FROM paths p
    JOIN edges e ON p.to_node = e.from_node
    WHERE p.path NOT LIKE '%' || e.to_node || '%'  -- 避免环
)
SELECT path, total_weight
FROM paths
WHERE to_node = 'G'
ORDER BY total_weight
LIMIT 1;  -- 最短路径
```
