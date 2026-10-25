---
order: 210
title: 子查询
module: 'sql'
category: 数据库
difficulty: intermediate
description: 用外卖调度平台的真实问题掌握子查询：标量与关联子查询、IN 的 NULL 陷阱、EXISTS 与半连接改写、关联子查询到窗口函数的性能迁移。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'sql/180-SemiAntiJoin'
  - 'sql/200-LateralDerivedTable'
  - 'sql/230-CTE'
prerequisites:
  - 'sql/020-OverviewStandard'
---

## 场景：骑手运营的四个问题

外卖调度平台的骑手组每天被问的问题几乎全是子查询的形状：

1. "这笔配送费算高吗？"——高不高要和**全城平均**比（标量子查询）；
2. "本周接过单的骑手名单"——名单来自另一张表（IN 子查询）；
3. "从没有超时记录的骑手"——反向排除（NOT EXISTS）；
4. "哪些订单比该骑手自己的历史均价高"——比较对象因行而异（关联子查询）。

建表跟做：

```sql
CREATE TABLE riders (
    id      INT PRIMARY KEY,
    name    VARCHAR(50) NOT NULL,
    city    VARCHAR(20) NOT NULL,
    is_active BOOLEAN   NOT NULL DEFAULT true
);

CREATE TABLE orders (
    id       BIGINT PRIMARY KEY,
    rider_id INT,                       -- 骑手，允许 NULL（平台调度单）
    status   VARCHAR(20) NOT NULL,      -- delivered / late / cancelled
    fee      NUMERIC(8,2) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

INSERT INTO riders VALUES
(1, '陈一', '杭州', true),
(2, '王二', '杭州', true),
(3, '张三', '上海', true);

INSERT INTO orders VALUES
(101, 1, 'delivered', 6.50, '2026-09-01 12:00:00'),
(102, 1, 'delivered', 8.00, '2026-09-02 12:10:00'),
(103, 2, 'late',      5.00, '2026-09-02 18:30:00'),
(104, 2, 'delivered', 9.00, '2026-09-03 12:00:00'),
(105, 3, 'delivered', 7.00, '2026-09-03 12:05:00'),
(106, NULL, 'cancelled', 4.00, '2026-09-03 12:20:00');
```

## 动手：四类子查询逐一实现

### 标量子查询：结果必须是一个格子

```sql
-- 全城平均配送费是单一数值，可以嵌进任何"需要一个值"的位置
SELECT id, fee,
       fee - (SELECT AVG(fee) FROM orders) AS diff_from_avg
FROM orders
WHERE fee > (SELECT AVG(fee) FROM orders);
```

标量子查询出现在 SELECT、WHERE、HAVING 里都合法，前提是**恰好返回一行一列**。返回多行会直接运行时报错：

```sql
-- orders 里一个骑手有多单，这行在 MySQL/PG 会报错（标量位置收到多行）
SELECT * FROM orders
WHERE fee = (SELECT fee FROM orders WHERE rider_id = 1);

-- 想比"最高那一单"，聚合保证单值
SELECT * FROM orders
WHERE fee = (SELECT MAX(fee) FROM orders WHERE rider_id = 1);
```

### IN：集合成员判断

```sql
-- 本周接过单的骑手
SELECT id, name FROM riders
WHERE id IN (
    SELECT rider_id FROM orders
    WHERE created_at >= '2026-08-31' AND created_at < '2026-09-07'
      AND rider_id IS NOT NULL
);
```

子查询返回多行单列，IN 判断外层值是否在其中。写法自然，但它有两个变体要小心，先记下：`NOT IN` 有 NULL 陷阱（下文坑点一），`IN (子查询)` 与 `EXISTS` 在大数据量下的表现由优化器决定（下文"为什么"）。

### EXISTS / NOT EXISTS：只问"有没有"，不取数据

```sql
-- 接过单的骑手（半连接语义）
SELECT r.id, r.name
FROM riders r
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.rider_id = r.id
      AND o.created_at >= '2026-08-31' AND o.created_at < '2026-09-07'
);

-- 从没有超时记录的骑手（反连接语义）
SELECT r.id, r.name
FROM riders r
WHERE NOT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.rider_id = r.id AND o.status = 'late'
);
```

EXISTS 关心的是子查询是否返回行，`SELECT 1` 是惯例——选什么列都无所谓。语义上 `EXISTS` 等价于半连接（semi join）、`NOT EXISTS` 等价于反连接（anti join），专门的语法与细节见[半连接与反连接](/sql/180-SemiAntiJoin)。

### 关联子查询：外层每行执行一次

问题 4 的比较对象是"该骑手自己的均价"，子查询里引用了外层的列：

```sql
SELECT o.id, o.rider_id, o.fee
FROM orders o
WHERE o.fee > (
    SELECT AVG(o2.fee)
    FROM orders o2
    WHERE o2.rider_id = o.rider_id     -- 引用外层：rider_id 变成参数
);
```

注意第 106 行 rider_id 为 NULL 的单子：`o2.rider_id = NULL` 永远不成立，子查询返回 NULL，`fee > NULL` 是 UNKNOWN，该行被静默排除——处理"可空关联列"时要想清楚这是不是预期。

## 为什么：子查询到底怎么执行

**非关联子查询**（不引用外层列）只需要算一次，优化器通常把它物化成一个临时结果，再拿外层去匹配，成本可控。

**关联子查询**的朴素执行模型是"外层多少行，子查询就跑多少遍"。orders 有 100 万行时，上面的查询要发起最多 100 万次子查找。好消息是现代优化器会自动改写：

- `IN (子查询)` 常被改写成**半连接**，与普通 JOIN 同等代价；
- 关联的 `AVG` 比较可以被改写成窗口函数或 JOIN 聚合。

自己能做的两个等价改写，读得懂执行计划前就值得掌握：

```sql
-- 改写 1：关联子查询 → 窗口函数（一遍扫描算出分组均值）
SELECT id, rider_id, fee
FROM (
    SELECT o.*,
           AVG(fee) OVER (PARTITION BY rider_id) AS rider_avg
    FROM orders o
) t
WHERE fee > rider_avg;

-- 改写 2：关联子查询 → 派生表 JOIN
SELECT o.*
FROM orders o
JOIN (SELECT rider_id, AVG(fee) AS avg_fee FROM orders GROUP BY rider_id) a
  ON o.rider_id = a.rider_id
WHERE o.fee > a.avg_fee;
```

判断标准很朴素：**先用关联子查询把语义写对，数据量上来后看执行计划决定要不要改写**（见[执行计划](/sql/430-ExecutionPlan)）。

## 坑点与自检

### 坑一：NOT IN 遇到 NULL 返回空集

```sql
-- 预期：找出没有订单的骑手
SELECT id FROM riders
WHERE id NOT IN (SELECT rider_id FROM orders);
```

orders 里有一行 `rider_id IS NULL`（第 106 行），于是整个查询返回 0 行。原理与[过滤条件](/sql/050-FilterCondition)里讲的一致：`x NOT IN (a, b, NULL)` 展开为 `x<>a AND x<>b AND x<>NULL`，最后一项是 UNKNOWN，AND 链整体永远不为 TRUE。**只要子查询结果含一个 NULL，NOT IN 全军覆没**。

三条出路，任选其一：

```sql
-- 出路 1：子查询排除 NULL（改动最小，但要记得做）
WHERE id NOT IN (SELECT rider_id FROM orders WHERE rider_id IS NOT NULL);

-- 出路 2：NOT EXISTS（推荐，语义清晰且不受 NULL 影响）
SELECT r.id FROM riders r
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.rider_id = r.id);

-- 出路 3：LEFT JOIN ... IS NULL（反连接的手工形态）
SELECT r.id FROM riders r
LEFT JOIN orders o ON o.rider_id = r.id
WHERE o.id IS NULL;
```

自检：**写 NOT IN 的瞬间停一下，确认子查询那列有无 NULL 或 NOT NULL 约束。**

### 坑二：ANY / ALL 是 IN 与极值的简写

```sql
-- 高于上海任意一单：等价于 > MIN(...)
SELECT * FROM orders
WHERE fee > ANY (SELECT fee FROM orders o JOIN riders r ON o.rider_id = r.id WHERE r.city = '上海');

-- 高于上海全部订单：等价于 > MAX(...)
SELECT * FROM orders
WHERE fee > ALL (SELECT fee FROM orders o JOIN riders r ON o.rider_id = r.id WHERE r.city = '上海');

-- = ANY 等价于 IN；<> ALL 在无 NULL 时等价于 NOT IN
```

ANY/ALL 写得出但可读性一般，团队代码里更常见等价的 `> MIN / > MAX` 或 `IN / NOT EXISTS`。看到别人写 ANY/ALL 时按这张等价表翻译即可。另外注意：`<> ALL (含 NULL 的列表)` 与 NOT IN 同病，同样返回空集。

### 坑三：FROM 里的子查询必须有别名

```sql
-- 报错：派生表需要别名
SELECT * FROM (
    SELECT r.city, MAX(o.fee) AS max_fee
    FROM orders o JOIN riders r ON o.rider_id = r.id
    GROUP BY r.city
);

-- 补上别名（各数据库均强制）
SELECT * FROM (
    SELECT r.city, MAX(o.fee) AS max_fee
    FROM orders o JOIN riders r ON o.rider_id = r.id
    GROUP BY r.city
) city_max;
```

派生表不能引用同一层 FROM 里其他表——需要"每行查一次子查询"时要用 LATERAL，见[横向连接与派生表](/sql/200-LateralDerivedTable)。嵌套层级深了以后，统一换成 CTE 更可读（见[CTE](/sql/230-CTE)）。

### 自检清单

- 标量位置（`>`、`=` 右边）的子查询，是否保证了单行单列？
- NOT IN 的子查询列，NULL 是否已排除或已换成 NOT EXISTS？
- 关联子查询是否只用于小结果集或语义必需处？大数据量场景是否考虑窗口函数/JOIN 改写？
- 派生表是否都起了别名？

## 练习

1. 查出配送费高于"本骑手所在城市均价"的订单（注意：比较基准从骑手均价换成城市均价，先想清楚关联条件挂在哪列）。
2. 用三种写法（NOT IN 排除 NULL、NOT EXISTS、LEFT JOIN）分别实现"没有 delivered 记录的骑手"，验证结果一致。
3. 把"每单 vs 骑手均价"的关联子查询改写成窗口函数版本，用 EXPLAIN（或 PG 的 EXPLAIN ANALYZE）对比两者计划差异。
4. 解释第 106 行（rider_id 为 NULL）在上面第 1 题的结果里为什么永远不会出现。
5. 用标量子查询给每个骑手加一列"该骑手累计单量"，再思考：这一列如果骑手有 10 万行订单，这条查询的关联子查询要执行多少次？怎么改写只扫一遍？

## 下一步

- EXISTS/NOT EXISTS 的连接视角展开在[半连接与反连接](/sql/180-SemiAntiJoin)；
- "每行查一次子查询"的正确姿势是 LATERAL，见[横向连接与派生表](/sql/200-LateralDerivedTable)；
- 多层嵌套的可读性解药是 CTE，见[CTE 通用表表达式](/sql/230-CTE)。
