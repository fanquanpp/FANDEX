---
order: 70
tags:
  - mysql
  - database
difficulty: intermediate
title: 多表联查详解
module: mysql
category: 'MySQL Advanced'
description: 内连接、外连接、交叉连接与自连接。
author: Anonymous
related:
  - mysql/事务隔离级别底层实现
  - mysql/MVCC原理
  - mysql/锁分类
  - mysql/死锁检测与处理
prerequisites:
  - mysql/语法速查
---

## 1. 联查基础概念

### 1.1 什么是多表联查

多表联查是指通过一定的条件将两个或多个表的数据关联在一起，从而获取更丰富的信息。

```sql
 -
 SELECT 列列表
 from 表1
 JOIN 表2 ON 连接条件
 JOIN 表3 ON 连接条件
 WHERE 过滤条件;
```

### 1.2 联查的必要性

| 场景             | 单表查询     | 多表联查 |
| ---------------- | ------------ | -------- |
| 获取单一实体信息 | [x] 适用     | [ ] 冗余 |
| 获取关联实体信息 | [ ] 无法完成 | [x] 适用 |
| 数据完整性       | 有限         | 完整     |

### 1.3 关系数据库中的表关系

- **一对一关系**：如用户表和用户详情表
- **一对多关系**：如部门表和员工表
- **多对多关系**：如学生表和课程表（需中间表）

---

## 2. 联查类型详解

### 2.1 INNER JOIN（内连接）

**定义**：只返回两个表中匹配连接条件的行。
**Venn 图表示**：两个集合的交集

```
 表A 表B INNER JOIN
 ┌
 │ 1 │ │ A │ │ 1, A │
 │ 2 │────│ B │ │ 2, B │
 │ 3 │────│ C │ │ 3, C │
 │ 4 │ │ │ └───────┘
 └───────┘ └───────┘
```

**语法**：

```sql
 SELECT *
 from table1
 inNER JOIN table2 ON table1.id = table2.id;
 -
 SELECT *
 from table1
 JOIN table2 ON table1.id = table2.id;
```

**示例**：

```sql
 -
 SELECT e.emp_name, d.dept_name
 from employees e
 inNER JOIN departments d ON e.dept_id = d.dept_id;
```

### 2.2 LEFT JOIN（左外连接）

**定义**：返回左表的所有行，以及右表中匹配的行；右表不匹配的部分用 NULL 填充。
**Venn 图表示**：左集合全部 + 交集部分

```
 表A 表B LEFT JOIN
 ┌
 │ 1 │────│ A │ │ 1 │ A │
 │ 2 │────│ B │ │ 2 │ B │
 │ 3 │────│ C │ │ 3 │ C │
 │ 4 │ │ │ │ 4 │NULL │
 └───────┘ └───────┘ └───────┴─────┘
```

**语法**：

```sql
 SELECT *
 from table1
 LEFT JOIN table2 ON table1.id = table2.id;
```

**示例**：

```sql
 -
 SELECT d.dept_name, e.emp_name
 from departments d
 LEFT JOIN employees e ON d.dept_id = e.dept_id;
```

### 2.3 RIGHT JOIN（右外连接）

**定义**：返回右表的所有行，以及左表中匹配的行；左表不匹配的部分用 NULL 填充。
**Venn 图表示**：右集合全部 + 交集部分

```
 表A 表B RIGHT JOIN
 ┌
 │ 1 │────│ A │ │ 1 │ A │
 │ 2 │────│ B │ │ 2 │ B │
 │ │ │ C │ │NULL │ C │
 │ │ │ D │ │NULL │ D │
 └───────┘ └───────┘ └─────┴───────┘
```

**语法**：

```sql
 SELECT *
 from table1
 RIGHT JOIN table2 ON table1.id = table2.id;
```

**示例**：

```sql
 -
 SELECT o.order_id, u.username
 from users u
 RIGHT JOIN orders o ON u.id = o.user_id;
```

### 2.4 FULL JOIN（全外连接）

**定义**：返回两个表的所有行，不匹配的部分用 NULL 填充。
**注意**：MySQL 不直接支持 FULL JOIN，需要通过 `UNION` 模拟。
**Venn 图表示**：两个集合的并集

```
 表A 表B FULL JOIN
 ┌
 │ 1 │────│ A │ │ 1 │ A │
 │ 2 │────│ B │ │ 2 │ B │
 │ 3 │ │ C │ │ 3 │NULL │
 │ │ │ D │ │NULL │ C │
 └───────┘ └───────┘ │NULL │ D │
  └─────┴─────┘
```

**语法**：

```sql
 -
 SELECT *
 from table1
 LEFT JOIN table2 ON table1.id = table2.id
 UNION
 SELECT *
 from table1
 RIGHT JOIN table2 ON table1.id = table2.id;
```

### 2.5 CROSS JOIN（交叉连接）

**定义**：返回两个表的笛卡尔积，即左表的每一行与右表的每一行组合。
**注意**：结果行数 = 左表行数 × 右表行数，通常需要配合 WHERE 条件过滤。
**语法**：

```sql
 -
 SELECT * FROM table1 CROSS JOIN table2;
 -
 SELECT * FROM table1, table2;
 -
 SELECT * FROM table1 CROSS JOIN table2 WHERE condition;
```

**示例**：

```sql
 -
 SELECT d.dept_name, e.emp_name
 from departments d
 CROSS JOIN employees e;
```

### 2.6 NATURAL JOIN（自然连接）

**定义**：自动根据相同列名进行连接，不需要指定连接条件。
**注意**：使用时要谨慎，确保列名相同且语义一致。
**语法**：

```sql
 -
 SELECT * FROM employees NATURAL JOIN departments;
 -
 SELECT * FROM employees NATURAL LEFT JOIN departments;
 -
 SELECT * FROM employees NATURAL RIGHT JOIN departments;
```

### 2.7 USING 子句

**定义**：当两个表有相同列名时，可以使用 USING 简化连接语法。
**语法**：

```sql
 SELECT e.emp_name, d.dept_name
 from employees e
 JOIN departments d USING (dept_id);
```

**等价于**：

```sql
 SELECT e.emp_name, d.dept_name
 from employees e
 JOIN departments d ON e.dept_id = d.dept_id;
```

---

## 3. 联查执行原理

### 3.1 联查执行顺序

```sql
 SELECT 列列表 -- 5. 选择列
 from 表1 -- 1. 加载表1
 JOIN 表2 ON 条件 -- 2. 联查表2
 JOIN 表3 ON 条件 -- 3. 联查表3
 WHERE 过滤条件 -- 4. 过滤行
 GROUP BY 分组列 -- 6. 分组
 HAVING 分组过滤 -- 7. 分组过滤
 ORDER BY 排序列 -- 8. 排序
 LIMIT 限制行数; -- 9. 限制结果
```

### 3.2 联查算法

#### 3.2.1 Nested Loop Join（嵌套循环连接）

**原理**：外层循环遍历驱动表，内层循环遍历被驱动表。
**适用场景**：小表驱动大表

```sql
 -
 EXPLAIN
 SELECT e.emp_name, d.dept_name
 from employees e
 JOIN departments d ON e.dept_id = d.dept_id;
```

**执行过程**：

1. 遍历 employees 表（驱动表）
2. 对于每个员工，查找对应的部门（被驱动表）
3. 如果 departments.dept_id 有索引，效率很高

#### 3.2.2 Hash Join（哈希连接）

**原理**：先将小表构建成哈希表，然后扫描大表进行哈希匹配。
**适用场景**：大表之间的连接，MySQL 8.0+ 支持

```sql
 -
 SELECT /*+ HASH_JOIN(d) */
  e.emp_name, d.dept_name
 from employees e
 JOIN departments d ON e.dept_id = d.dept_id;
```

**执行过程**：

1. 将 departments 表构建成哈希表（key: dept_id, value: dept_name）
2. 扫描 employees 表，对每个 dept_id 进行哈希查找
3. 返回匹配的结果

#### 3.2.3 Merge Join（合并连接）

**原理**：先对两个表按连接列排序，然后并行扫描合并。
**适用场景**：连接列已排序或有索引
**执行过程**：

1. 对 employees 按 dept_id 排序
2. 对 departments 按 dept_id 排序
3. 并行扫描两个有序表，合并匹配行

### 3.3 驱动表选择

**规则**：

1. 小表作为驱动表，减少外层循环次数
2. 如果有 WHERE 条件过滤，优先选择过滤后结果集小的表
3. 查看执行计划中的 `type` 和 `rows` 字段判断

```sql
 -
 EXPLAIN ANALYZE
 SELECT e.emp_name, d.dept_name
 from employees e
 JOIN departments d ON e.dept_id = d.dept_id;
```

---

## 4. 联查实战场景

### 4.1 一对多关系联查

```sql
 -
 SELECT
  o.order_id,
  o.order_date,
  oi.product_name,
  oi.quantity,
  oi.price
 from orders o
 JOIN order_items oi ON o.order_id = oi.order_id
 WHERE o.order_date >= '2024-01-01';
```

### 4.2 多对多关系联查

```sql
 -
 SELECT
  s.student_name,
  c.course_name
 from students s
 JOIN student_course sc ON s.student_id = sc.student_id
 JOIN courses c ON sc.course_id = c.course_id
 WHERE c.course_name = '数学';
```

### 4.3 自连接

```sql
 -
 SELECT
  e.emp_name AS 员工,
  m.emp_name AS 上级
 from employees e
 LEFT JOIN employees m ON e.manager_id = m.emp_id;
 -
 with RECURSIVE emp_hierarchy AS (
  SELECT emp_id, emp_name, manager_id, 1 AS level
  FROM employees
  WHERE manager_id IS NULL
  UNION ALL
  SELECT e.emp_id, e.emp_name, e.manager_id, eh.level + 1
  FROM employees e
  JOIN emp_hierarchy eh ON e.manager_id = eh.emp_id
 )
 SELECT * FROM emp_hierarchy ORDER BY level, emp_id;
```

### 4.4 三表及以上联查

```sql
 -
 SELECT
  u.username,
  o.order_id,
  o.order_date,
  p.product_name,
  oi.quantity,
  oi.price
 from users u
 JOIN orders o ON u.id = o.user_id
 JOIN order_items oi ON o.order_id = oi.order_id
 JOIN products p ON oi.product_id = p.product_id
 WHERE o.order_date BETWEEN '2024-01-01' AND '2024-01-31';
```

### 4.5 条件联查

```sql
 -
 SELECT
  e.emp_name,
  d.dept_name,
  COUNT(o.order_id) AS order_count
 from employees e
 JOIN departments d ON e.dept_id = d.dept_id
 LEFT JOIN orders o ON e.emp_id = o.emp_id
 WHERE d.dept_name = '技术部'
  AND e.hire_date < '2020-01-01'
 GROUP BY e.emp_id, e.emp_name, d.dept_name
 HAVING COUNT(o.order_id) > 10;
```

---

## 5. 联查性能优化

### 5.1 索引优化

**原则**：确保连接列和 WHERE 条件列有索引

```sql
 -
 CREATE INDEX idx_employees_dept_id ON employees(dept_id);
 CREATE INDEX idx_orders_user_id ON orders(user_id);
 -
 CREATE INDEX idx_orders_user_date ON orders(user_id, order_date);
 -
 CREATE UNIQUE INDEX idx_users_email ON users(email);
```

### 5.2 减少数据量

**策略**：

1. 使用 WHERE 条件提前过滤数据
2. 只选择需要的列，避免 SELECT \*
3. 使用 LIMIT 限制结果集

```sql
 -
 SELECT * FROM employees JOIN departments ON ...;
 -
 SELECT e.emp_name, d.dept_name
 from employees e
 JOIN departments d ON e.dept_id = d.dept_id
 WHERE e.status = 1
 LIMIT 100;
```

### 5.3 优化连接顺序

**原则**：小表驱动大表

```sql
 -
 EXPLAIN
 SELECT e.emp_name, o.order_id
 from employees e
 JOIN orders o ON e.emp_id = o.emp_id;
```

### 5.4 使用提示优化器

```sql
 -
 SELECT /*+ INDEX(e idx_employees_dept_id) */
  e.emp_name, d.dept_name
 from employees e
 JOIN departments d ON e.dept_id = d.dept_id;
 -
 SELECT /*+ HASH_JOIN(d) */
  e.emp_name, d.dept_name
 from employees e
 JOIN departments d ON e.dept_id = d.dept_id;
 -
 SELECT /*+ MERGE_JOIN(d) */
  e.emp_name, d.dept_name
 from employees e
 JOIN departments d ON e.dept_id = d.dept_id;
```

### 5.5 避免复杂子查询

**优化前**：

```sql
 SELECT emp_name
 from employees
 WHERE dept_id IN (SELECT dept_id FROM departments WHERE dept_name LIKE '%技术%');
```

**优化后**：

```sql
 SELECT e.emp_name
 from employees e
 JOIN departments d ON e.dept_id = d.dept_id
 WHERE d.dept_name LIKE '%技术%';
```

---

## 6. 常见问题与解决方案

### 6.1 重复数据问题

**问题**：联查后出现重复行
**原因**：一对多关系导致的笛卡尔积
**解决方案**：

```sql
 -
 SELECT DISTINCT e.emp_name
 from employees e
 JOIN orders o ON e.emp_id = o.emp_id;
 -
 SELECT e.emp_name
 from employees e
 JOIN orders o ON e.emp_id = o.emp_id
 GROUP BY e.emp_id, e.emp_name;
```

### 6.2 NULL 值处理

**问题**：外连接后出现 NULL 值
**解决方案**：

```sql
 -
 SELECT
  e.emp_name,
  COALESCE(d.dept_name, '无部门') AS dept_name
 from employees e
 LEFT JOIN departments d ON e.dept_id = d.dept_id;
 -
 SELECT
  e.emp_name,
  IFNULL(d.dept_name, '无部门') AS dept_name
 from employees e
 LEFT JOIN departments d ON e.dept_id = d.dept_id;
```

### 6.3 性能问题

**问题**：联查慢
**解决方案**：

1. 检查索引是否存在
2. 分析执行计划
3. 优化连接顺序
4. 减少返回数据量

```sql
 -
 EXPLAIN ANALYZE
 SELECT ...
 -
 SHOW INDEX FROM employees;
 -
 SHOW VARIABLES LIKE 'slow_query_log';
```

### 6.4 连接条件错误

**问题**：返回结果不符合预期
**常见错误**：

- 忘记写连接条件（导致笛卡尔积）
- 连接条件错误（导致错误匹配）
- 使用错误的连接类型
  **解决方案**：

```sql
 -
 SELECT * FROM employees, departments; -- 笛卡尔积
 -
 SELECT * FROM employees e JOIN departments d ON e.dept_id = d.dept_id;
 -
 SELECT * FROM employees e JOIN departments d ON e.emp_id = d.dept_id;
 -
 SELECT * FROM employees e JOIN departments d ON e.dept_id = d.dept_id;
```

---

### 更新日志 (Changelog)

- 2026-04-30: 创建多表联查详解文档，包含联查类型、执行原理、实战场景和优化策略
