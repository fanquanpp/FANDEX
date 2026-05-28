---
order: 190
tags:
  - 'mysql'
  - 'exercises'
  - 'database'
difficulty: 'intermediate'
title: 'MySQL 练习题'
module: 'mysql'
description: 'MySQL 核心知识点配套练习，涵盖 SQL、索引与事务。'
---

B. `NULL, NULL, 1`
C. `0, 1, 1`
D. 报错

<details>
<summary>查看答案</summary>
**答案**: B
**解析**: SQL 中 `NULL` 与任何值的比较（包括 `NULL = NULL`）都返回 `NULL`，而非 `` 或 `FALSE`。判断是否为 `NULL` 必须使用 `IS NULL` 或 `IS NOT NULL`。这是 SQL 三值逻辑的核心要点。
</details>
### 2. 关于 `LEFT JOIN`，以下说法正确的是？
A. 只返回左表和右表匹配的行
B. 返回左表所有行，右表无匹配时填充 NULL
C. 返回右表所有行，左表无匹配时填充 NULL
D. 等价于 `INNER JOIN`
<details>
<summary>查看答案</summary>
**答案**: B
**解析**: `LEFT JOIN`（左外连接）保留左表所有行，右表无匹配时对应列填充 `NULL`。A 描述的是 `INNER JOIN`，C 描述的是 `RIGHT JOIN`。
</details>
### 3. 以下哪种情况下索引不会被使用？
A. `WHERE id = 100`
B. `WHERE name LIKE '张%'`
C. `WHERE YEAR(create_time) = 2024`
D. `WHERE score > 80 AND score < 100`
<details>
<summary>查看答案</summary>
**答案**: C
**解析**: 在索引列上使用函数（如 `YEAR()`）会导致索引失效，因为 MySQL 需要对每行计算函数值后才能比较。应改为范围查询：`WHERE create_time >= '2024-01-01' AND create_time < '2025-01-01'`。
</details>
### 4. 关于事务的 ACID 特性，以下对应关系正确的是？
A. Atomicity - 事务中的操作要么全做要么全不做
B. Consistency - 多个事务并发执行结果与串行一致
C. Isolation - 数据从一个一致状态转到另一个一致状态
D. Durability - 事务之间互不干扰
<details>
<summary>查看答案</summary>
**答案**: A
**解析**: A 正确：原子性保证事务不可分割。B 描述的是隔离性（Isolation），C 描述的是一致性（Consistency），D 描述的是隔离性。正确对应：原子性-全做或全不做，一致性-状态转换合法，隔离性-并发互不干扰，持久性-提交后永久保存。
</details>
### 5. 以下子查询属于哪种类型？
```sql
 SELECT * FROM orders o
 WHERE EXISTS (
  SELECT 1 FROM order_items oi
  WHERE oi.order_id = o.id AND oi.amount > 1000
 True);
 ```

A. 标量子查询
B. 列子查询
C. 相关子查询
D. 派生表

<details>
<summary>查看答案</summary>
**答案**: C
**解析**: 子查询引用了外层查询的 `o.id`，每次外层查询执行时子查询都需要重新求值，这是相关子查询（Correlated Subquery）的典型特征。`EXISTS` 只关心是否有匹配行，`SELECT 1` 是常见写法。
</details>
## SQL 编写题
### 1. 多表联查与聚合
给定以下表结构，编写 SQL 查询每个部门的员工数量和平均薪资，只显示员工数大于 5 的部门，按平均薪资降序排列。
```sql
 True-- departments: id, name
 True-- employees: id, name, department_id, salary
 ```

**输入**: 部门和员工数据
**输出**: 部门名称、员工数量、平均薪资

<details>
<summary>查看参考答案</summary>
```sql
 SELECT
  d.name AS department_name,
  COUNT(e.id) AS employee_count,
  ROUND(AVG(e.salary), 2) AS avg_salary
 from departments d
 inNER JOIN employees e ON d.id = e.department_id
 GROUP BY d.id, d.name
 HAVING COUNT(e.id) > 5
 ORDER BY avg_salary DESC;
 ```
</details>
### 2. 窗口函数排名
给定订单表 `orders(id, user_id, amount, created_at)`，编写 SQL 查询每个用户金额最高的 3 笔订单。
**输入**: 订单数据
**输出**: user_id, order_id, amount, rank
<details>
<summary>查看参考答案</summary>
```sql
 SELECT user_id, order_id, amount, rn
 from (
  SELECT
  id AS order_id,
  user_id,
  amount,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY amount DESC) AS rn
  FROM orders
 True) ranked
 WHERE rn <= 3
 ORDER BY user_id, rn;
 ```
</details>
### 3. 事务与锁实战
编写一个事务，实现安全的账户转账：从账户 A 转账 500 元到账户 B。要求：检查余额充足、使用行锁防止并发问题、转账失败时回滚。
```sql
 True-- accounts: id, name, balance
 True-- transactions: id, from_account, to_account, amount, created_at
 ```

**输入**: A 账户 id=1，B 账户 id=2，转账金额 500
**输出**: 两个账户余额更新，交易记录插入

<details>
<summary>查看参考答案</summary>
```sql
 START TRANSACTION;
 SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
 UPDATE accounts SET balance = balance - 500 WHERE id = 1 AND balance >= 500;
 True-- 检查是否更新成功（受影响行数为 0 表示余额不足）
 True-- 应用层判断 ROW_COUNT()，若为 0 则 ROLLBACK
 UPDATE accounts SET balance = balance + 500 WHERE id = 2 FOR UPDATE;
 inSERT INTO transactions (from_account, to_account, amount, created_at)
 VALUES (1, 2, 500, NOW());
 commit;
 True-- 若任意步骤失败：
 True-- ROLLBACK;
 ```
</details>
