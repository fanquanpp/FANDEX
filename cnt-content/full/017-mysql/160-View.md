---
order: 160
title: 视图：虚拟表与权限的守门人
module: 'mysql'
category: 数据库
difficulty: beginner
description: MySQL 视图从零到工程化：创建替换与列别名、CHECK OPTION 的写入守卫、DEFINER/INVOKER 安全上下文、视图的四类适用场景与性能边界。
author: fanquanpp
updated: '2026-09-19'
related:
  - 'mysql/150-AdvancedQueryMultiTableOperation'
  - 'mysql/690-AccountPermissionManagement'
  - 'mysql/220-ClusteredIndexSecondaryIndex'
  - 'postgresql/140-UpdatableView'
prerequisites:
  - 'mysql/140-MultiTableJoinDetailed'
  - 'mysql/120-DQL'
---

## 问题引入：一句 SQL 没人想写第二遍

报表里有句三表 JOIN 的统计 SQL，三十多行，全组人人都复制粘贴过——直到某天表结构加了一列，三十个副本要改三十处。**视图（View）**就是这句话的解药：把一段查询固化成一个"有名字的虚拟表"，之后像查真表一样 `SELECT * FROM 报表视图`。

第二动机是**权限收敛**：给外包账号只开 `v_user_public` 视图（脱敏后的手机号、隐藏的内部字段），底表权限一概不给——数据可见性从"表级"细化到"行与列级"，这是 [权限管理](/mysql/690-AccountPermissionManagement) 的标准配套。

先立最关键的心智模型：**视图不存数据**。每次查询视图，MySQL 都实时执行它的定义 SQL。它是"保存好的查询"，不是"保存好的结果"（要存结果用[物化思路](/mysql/380-GroupByOrderByOptimization)的汇总表）。

## 创建与使用

```sql
-- 基础创建：封装 JOIN + 过滤
CREATE VIEW v_active_orders AS
SELECT o.order_id, o.amount, o.created_at, u.user_name, u.phone
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'active';

-- 像查真表一样使用（语法完全一致）
SELECT user_name, amount FROM v_active_orders
WHERE created_at > '2026-09-01'
ORDER BY amount DESC;

-- 替换定义（省去 DROP 再建的权限与依赖麻烦）
CREATE OR REPLACE VIEW v_active_orders AS
SELECT o.order_id, o.amount, u.user_name
FROM orders o JOIN users u ON o.user_id = u.id
WHERE o.status = 'active';

-- 显式指定视图列名（对内暴露友好别名）
CREATE VIEW v_monthly_sales (月份, 销售额) AS
SELECT DATE_FORMAT(created_at, '%Y-%m'), SUM(amount)
FROM orders GROUP BY 月份;
```

语法细节三条：`CREATE OR REPLACE` 是日常首选（视图可以随时重定义，底层数据毫发无伤）；列别名在 GROUP BY 场景很有用；视图定义里**避免 `SELECT *`**——底表加列后视图会"长出"新列，依赖它的程序可能被意外字段砸中。

## 可更新视图与 CHECK OPTION

简单视图（单表、无聚合去重）可以直接 INSERT/UPDATE/DELETE，写入穿透到底表；配合 `WITH CHECK OPTION` 让"通过视图写入的行必须仍满足视图条件"：

```sql
CREATE VIEW v_active_users AS
SELECT * FROM users WHERE status = 'active'
WITH CHECK OPTION;

-- 想借视图塞进一条 status='inactive' 的数据？被拒：
-- ERROR 1369: CHECK OPTION failed 'mydb.v_active_users'
```

`LOCAL` 与 `CASCADED` 两个级别在视图套视图时生效：CASCADED（默认）连带检查所有底层视图的条件，LOCAL 只查本层。多级视图推荐保持默认的 CASCADED——守卫宁严勿松。可更新视图的完整规则与 PostgreSQ 的对照见 [PG 可更新视图](/postgresql/140-UpdatableView)（MySQL 复杂视图没有 INSTEAD OF 触发器，需用存储过程封装写入）。

## 安全上下文：DEFINER 与 INVOKER

视图还有一个常被忽略的安全维度——**以谁的身份执行底层查询**：

```sql
-- DEFINER（默认）：视图以"定义者"的权限访问底表
--   → 使用者只需视图的 SELECT 权限，即可经视图触达自己无权访问的底表
-- INVOKER：以"调用者"的权限执行
--   → 调用者必须对底表也有权限，否则报错

ALTER VIEW v_user_public
SQL SECURITY INVOKER
AS SELECT id, name, masked_phone FROM users;
```

默认的 DEFINER 模式正是"权限收敛"场景的原理：运营账号对 `users` 零权限，却可以从视图读到脱敏列。代价是 DEFINER 账号失效（删除/改密）会让视图全体失效，迁移库时要连带重建 definer。8.4 起设置他人为 DEFINER 需要额外的 `SET_ANY_DEFINER` 权限——安全持续收紧的信号。

## 维护与排障

```sql
SHOW CREATE VIEW v_active_orders\G                       -- 查看定义
SELECT * FROM information_schema.VIEWS
WHERE table_name = 'v_active_orders';                    -- 元数据（含 check_option）

ALTER VIEW v_active_orders AS SELECT ...;                -- 修改定义
DROP VIEW [IF EXISTS] v_active_orders;                   -- 删除（不影响底表）
```

高频故障一个：**底表改结构后视图报错或行为漂移**——视图定义里显式列出的列被删除/改名时会直接报错（这是显式列名的红利）；`SELECT *` 视图则静默变化。所以视图定义审查是表结构变更流程的必查项。

## 适用场景与边界

| 适合 | 不适合 |
| --- | --- |
| 固化复杂 JOIN 供多处复用 | 当作"结果缓存"（每次实时执行，无加速） |
| 权限收敛：行/列级脱敏出口 | 高频大表聚合（无索引物化，性能差） |
| 给不同团队提供稳定接口层 | 递归/超深嵌套视图（可读性灾难） |
| 配合 CHECK OPTION 守业务不变式 | 写入穿透的复杂视图（MySQL 无 INSTEAD OF） |

性能上要记住：**查询视图 = 查询它的定义 SQL**，优化器大多能合并展开（与[派生表合并](/mysql/370-DerivedTableOptimization)同机制），简单视图零开销；聚合视图每次全量计算，高频使用请改汇总表。

## 动手环节：从裸奔到守门

```sql
-- 1. 准备
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(50), phone VARCHAR(20), salary DECIMAL(10,2), status VARCHAR(10)
);
INSERT INTO users VALUES
  (1,'张三','13800000001',12000,'active'),
  (2,'李四','13800000002',9000,'active'),
  (3,'王五','13800000003',7000,'inactive');

-- 2. 脱敏视图：隐藏薪资、掩码手机号
CREATE VIEW v_user_public AS
SELECT id, name, CONCAT(LEFT(phone,3),'****',RIGHT(phone,4)) AS phone
FROM users WHERE status = 'active';

SELECT * FROM v_user_public;    -- 张三/李四，薪资不可见

-- 3. CHECK OPTION 守卫
CREATE OR REPLACE VIEW v_user_public AS
SELECT id, name, status FROM users WHERE status = 'active'
WITH CHECK OPTION;
INSERT INTO v_user_public (id, name, status) VALUES (4, '赵六', 'inactive');
-- ERROR 1369 —— 守卫生效

-- 4. 实时性验证：底表改动立刻反映到视图
UPDATE users SET salary = 20000 WHERE id = 1;
SELECT * FROM v_user_public;    -- 视图无缓存，一切即时
```

## 常见困惑

**"视图会让查询变慢吗？"**——简单视图不会（优化器合并展开后与手写 SQL 等价，可用 EXPLAIN 验证视图被展开）。聚合/去重视图每次实时计算，大表上是真实成本。**视图是复用与安全的工具，不是性能工具**——把它当性能手段用是方向性错误。

**"视图和临时表/汇总表怎么选？"**——要"定义复用与权限"选视图；要"算一次反复用"选汇总表（真实表 + 定时刷新或触发维护）。两者也常组合：汇总表管性能，视图管出口。

**"视图能嵌套几层？"**——语法上很深都行，实践超过两层就该拆——嵌套视图的性能与可维护性问题会乘法放大，排查时 `EXPLAIN` 展开的计划也难以阅读。

## 检验清单

- 能说出"视图不存数据、实时执行定义"的心智模型及其性能推论；
- 会用 CREATE OR REPLACE 维护视图，并理解显式列名对变更安全的红利；
- 会用 CHECK OPTION 守住行级不变式，能解释 DEFINER/INVOKER 的权限差异；
- 完成"脱敏视图 + CHECK OPTION + 实时性"三段实验。

## 下一步

视图之上的进阶派生手段是[生成列](/postgresql/150-GeneratedColumn)（PG）与 MySQL 的函数索引方案；权限收敛的完整体系则在 [账号与权限管理](/mysql/690-AccountPermissionManagement) 等你。
