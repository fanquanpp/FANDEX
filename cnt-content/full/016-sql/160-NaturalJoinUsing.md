---
order: 160
title: 自然连接与 USING
module: 'sql'
category: 数据库
difficulty: intermediate
description: NATURAL JOIN 与 USING 子句：同名列等值连接的简写语法、与 ON 的语义差异、方言支持与三大陷阱。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'sql/140-MultiTableQuery'
  - 'sql/070-GROUPBYGroupingSet'
  - 'sql/150-JoinQuery'
  - 'sql/170-SelfJoin'
  - 'sql/180-SemiAntiJoin'
prerequisites:
  - 'sql/150-JoinQuery'
---

## 1. 一句话入门

`ON` 子句要求你逐列写出连接条件；当两张表的连接列**恰好同名**时，SQL 提供了两种简写：

- **NATURAL JOIN**：自动用两表**所有**同名列做等值连接，结果中同名列只保留一份。
- **USING (col, ...)**：只把**指定的**同名列用于连接，结果中这些列同样合并为一份。

两者都是 SQL:92 标准语法，但语义上是"隐式契约"——表结构一变，连接条件就跟着变，因此生产代码里要多加小心。

## 2. 准备练习数据

```sql
CREATE TABLE departments (
    dept_id   INT PRIMARY KEY,
    dept_name VARCHAR(100)
);

CREATE TABLE employees (
    emp_id  INT PRIMARY KEY,
    name    VARCHAR(100),
    dept_id INT
);

INSERT INTO departments VALUES (1, '研发'), (2, '销售'), (3, '人事');
INSERT INTO employees VALUES
    (101, '张三', 1),
    (102, '李四', 2),
    (103, '王五', NULL);   -- 没有部门
```

## 3. NATURAL JOIN：自动同名连接

### 3.1 基本语义

```sql
SELECT * FROM employees NATURAL JOIN departments;
```

两表唯一的同名列是 `dept_id`，所以等价于：

```sql
SELECT e.emp_id, e.name, e.dept_id, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.dept_id;
```

预期结果（注意 `dept_id` 只出现一次，王五因 `dept_id` 为 NULL 被内连接过滤掉）：

```
emp_id | name | dept_id | dept_name
101    | 张三 | 1       | 研发
102    | 李四 | 2       | 销售
```

### 3.2 多个同名列：全部参与连接

若两表共有 `dept_id` 和 `region` 两列，NATURAL JOIN 等价于：

```sql
SELECT e.dept_id, e.region, e.name, d.dept_name
FROM employees e
INNER JOIN departments d
    ON e.dept_id = d.dept_id AND e.region = d.region;
```

这既是便利也是风险：你未必意识到"所有"同名列都成了连接条件。

### 3.3 三大陷阱

```sql
-- 陷阱1：加列改变语义
-- 之后有人执行：ALTER TABLE departments ADD COLUMN name VARCHAR(100);
-- NATURAL JOIN 立刻变成按 (dept_id, name) 双列连接，
-- 而"研发部"的 name 与员工姓名几乎不可能相同 → 查询悄悄返回空集

-- 陷阱2：隐式行为难追踪
SELECT * FROM a NATURAL JOIN b NATURAL JOIN c;
-- 需要逐表检查全部同名列才能确定真实连接条件

-- 陷阱3：NULL 永远不相等
-- dept_id 为 NULL 的行（如王五）在任何等值连接（含 NATURAL JOIN）中都不匹配
-- 想保留它请用 NATURAL LEFT JOIN
```

> **最佳实践**：生产代码避免 NATURAL JOIN，改用显式 `JOIN ... ON`，让连接条件随表结构演进保持稳定。

## 4. USING：指定同名列的简写

### 4.1 基本语义

```sql
SELECT * FROM employees
JOIN departments USING (dept_id);
```

与 NATURAL JOIN 的区别：只使用**你点名**的列做连接，其余同名列不参与。

### 4.2 USING 与 ON 的区别

| 特性     | ON 子句                    | USING 子句              |
| -------- | -------------------------- | ----------------------- |
| 列指定   | 可使用不同名列             | 只能使用同名列          |
| 条件类型 | 任意条件（不等值也可）     | 仅等值条件              |
| 结果列   | 两表同名列各保留一份       | 被指定的同名列合并一份  |
| 限定符   | 结果列可用表别名限定       | 合并列不可再加表别名    |

```sql
-- USING 合并列之后，不能再写 e.dept_id 或 d.dept_id
SELECT dept_id          -- 正确
FROM employees e
JOIN departments d USING (dept_id);

-- SELECT e.dept_id ... USING (dept_id)  -- 错误：合并列不能用别名限定
```

### 4.3 多列 USING 与链式连接

```sql
-- 多列
SELECT * FROM employees e
JOIN departments d USING (dept_id, region);

-- 多表链式连接，配合规范化的同名外键非常简洁
SELECT *
FROM orders o
JOIN order_items oi USING (order_id)
JOIN products p USING (product_id);
```

### 4.4 NATURAL / USING 的外连接变体

```sql
SELECT * FROM departments NATURAL LEFT JOIN employees;
-- 保留所有部门，无员工的部门填 NULL（含人事部，共 3 行）

SELECT * FROM employees NATURAL RIGHT JOIN departments;

SELECT * FROM employees NATURAL FULL JOIN departments;
-- 两表所有行都保留，不匹配侧填 NULL
```

方言注意：MySQL 不支持 `FULL [OUTER] JOIN`（自然连接变体同样不支持），需要用
"LEFT JOIN + UNION + RIGHT JOIN（排除重复）"模拟；SQLite 3.39.0 起才支持
RIGHT/FULL JOIN。参见第 6 节方言表。

## 5. 同族的连接写法

### 5.1 不等值连接（只能用 ON）

```sql
-- 按薪资区间匹配职级，USING/NATURAL 无法表达
SELECT e.name, e.salary, g.grade
FROM employees e
JOIN salary_grades g
  ON e.salary BETWEEN g.min_sal AND g.max_sal;
```

### 5.2 CROSS JOIN：笛卡尔积

```sql
-- 3 种颜色 x 4 种尺寸 = 12 行，无连接条件，天然不需要 ON/USING
SELECT * FROM colors CROSS JOIN sizes;
```

### 5.3 多表连接

```sql
SELECT e.name, d.dept_name, p.project_name
FROM employees e
JOIN departments d ON e.dept_id = d.dept_id
JOIN projects p ON e.emp_id = p.lead_id;
```

## 6. 方言差异速查

| 特性                  | PostgreSQL | MySQL          | SQLite     | SQL Server       |
| --------------------- | ---------- | -------------- | ---------- | ---------------- |
| NATURAL JOIN          | 支持       | 支持           | 支持       | **不支持**       |
| USING 子句            | 支持       | 支持           | 支持       | **不支持**       |
| FULL [OUTER] JOIN     | 支持       | **不支持**     | 3.39.0+    | 支持             |
| RIGHT/FULL + NATURAL  | 支持       | 不支持 FULL    | 3.39.0+    | 不支持 NATURAL   |

MySQL 模拟 FULL OUTER JOIN 的标准写法：

```sql
SELECT e.name, d.dept_name
FROM employees e LEFT JOIN departments d ON e.dept_id = d.dept_id
UNION
SELECT e.name, d.dept_name
FROM employees e RIGHT JOIN departments d ON e.dept_id = d.dept_id;
-- UNION 自带去重，恰好去掉两侧都匹配的重复行
```

## 7. 实践建议与小结

**何时可以用 USING**：外键列与主键列同名（规范命名如 `dept_id`）、连接条件简单、
表结构稳定。设计阶段统一外键命名能让 USING 发挥最大价值。

**何时应避免 NATURAL JOIN**：表可能被他人加列、多表连接、长期维护的生产代码。

小结：

- NATURAL JOIN = 全部同名列的等值连接 + 同名列合并；USING = 指定同名列的等值连接 + 合并。
- 合并列不能再用表别名限定；需要区分两侧值时退回 `ON`。
- 同名列参与连接是"隐式契约"，`ALTER TABLE ADD COLUMN` 会静默改变 NATURAL JOIN 语义。
- SQL Server 两样都不支持；MySQL 没有 FULL JOIN，用 UNION 模拟。
- 生产代码首选显式 `JOIN ... ON`：意图明确、可移植、抗结构变更。
