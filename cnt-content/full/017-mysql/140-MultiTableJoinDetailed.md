---
order: 130
title: 多表联查详解
module: 'mysql'
category: 数据库
difficulty: intermediate
description: 用充电桩运营数据掌握 MySQL 多表联查：内连接、外连接与 LEFT JOIN 找孤儿行、同城配对的自连接、三表联查与行数膨胀的根源。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'mysql/150-AdvancedQueryMultiTableOperation'
  - 'mysql/390-JOINAlgorithm'
  - 'sql/150-JoinQuery'
prerequisites:
  - 'mysql/120-DQL'
---

## 场景：运营数据散在三张表里

充电桩平台的表按职责拆开：站点表、设备表、充电订单表。运营想知道"每个站点的充电收入"，就必须把三张表拼起来——这正是关系数据库分表存储后每天要做的事。

```sql
CREATE TABLE stations (
  station_id INT PRIMARY KEY,
  name       VARCHAR(50) NOT NULL,
  city       VARCHAR(20) NOT NULL
);

CREATE TABLE chargers (
  charger_id INT PRIMARY KEY,
  station_id INT NOT NULL,
  power_kw   DECIMAL(5,1) NOT NULL,
  status     ENUM('online','offline','fault') NOT NULL,
  FOREIGN KEY (station_id) REFERENCES stations(station_id)
);

CREATE TABLE charge_sessions (
  session_id BIGINT PRIMARY KEY,
  charger_id INT NOT NULL,
  started_at DATETIME NOT NULL,
  kwh        DECIMAL(7,2) NOT NULL,
  amount     DECIMAL(8,2) NOT NULL,
  FOREIGN KEY (charger_id) REFERENCES chargers(charger_id)
);

INSERT INTO stations VALUES
(1, '滨江服务区站', '杭州'),
(2, '萧山机场站',   '杭州'),
(3, '虹桥枢纽站',   '上海');

INSERT INTO chargers VALUES
(11, 1, 120.0, 'online'),
(12, 1,  60.0, 'fault'),
(13, 2, 120.0, 'online'),
(14, 2, 180.0, 'offline'),
(15, 3, 240.0, 'online');

INSERT INTO charge_sessions VALUES
(9001, 11, '2026-09-01 08:15:00', 45.20, 67.80),
(9002, 11, '2026-09-01 14:40:00', 52.00, 78.00),
(9003, 13, '2026-09-02 10:05:00', 38.50, 57.75),
(9004, 15, '2026-09-02 16:20:00', 61.00, 91.50);
```

注意一个关键事实：**14 号桩（offline）从来没有产生过订单，3 号站虹桥只有一根桩且有订单，但假如没有订单的桩挂在没有订单的站呢**——外连接要解决的就是"不匹配的行去哪了"。

## 动手：四种连接逐一试

### INNER JOIN：只留两边都匹配的行

```sql
SELECT s.name AS station, c.charger_id, c.power_kw
FROM stations s
INNER JOIN chargers c ON c.station_id = s.station_id;
```

每个桩都挂在某个站下，五行全保留。`INNER` 可省略，写 `JOIN` 默认就是内连接。ON 后面是两表的关联条件，通常写"从表外键 = 主表主键"。

把第三张表接上，就是最常见的三表联查——按站点统计充电收入：

```sql
SELECT s.name, SUM(cs.amount) AS revenue, COUNT(cs.session_id) AS sessions
FROM stations s
JOIN chargers  c  ON c.station_id = s.station_id
JOIN charge_sessions cs ON cs.charger_id = c.charger_id
GROUP BY s.station_id, s.name
ORDER BY revenue DESC;
```

注意聚合的是 `COUNT(cs.session_id)` 而不是 `COUNT(*)`——原因在坑点二。

### LEFT JOIN：左表全保留，右边补 NULL

"哪些桩从未产生过订单？"内连接答不了——没订单的桩根本不会出现在结果里：

```sql
SELECT c.charger_id, c.status, cs.session_id
FROM chargers c
LEFT JOIN charge_sessions cs ON cs.charger_id = c.charger_id
WHERE cs.session_id IS NULL;          -- 右边没匹配上 => 14 号桩
```

LEFT JOIN 的语义：左表每一行都保留；右表没有匹配行时，右表各列填 NULL。配一个 `WHERE 右表.主键 IS NULL` 就是标准的"找孤儿行"手法（反连接）。

方向反过来就是 RIGHT JOIN，语义相同。实际写 SQL 的惯例是**统一用 LEFT JOIN，把想全保留的表放左边**——RIGHT JOIN 读起来要换个方向思考，团队代码里少见。

### FULL OUTER JOIN：MySQL 没有，用 UNION 模拟

MySQL 不支持 FULL OUTER JOIN（PostgreSQL 原生支持）。想同时保留两侧未匹配行时，左右各查一遍再合并：

```sql
SELECT c.charger_id, cs.session_id
FROM chargers c LEFT JOIN charge_sessions cs ON cs.charger_id = c.charger_id
UNION
SELECT c.charger_id, cs.session_id
FROM chargers c RIGHT JOIN charge_sessions cs ON cs.charger_id = c.charger_id;
```

UNION 会去重（两侧都匹配上的行只留一份），这也正是模拟 FULL JOIN 需要它的原因。要保留重复行用 UNION ALL，但在这里会算重。

### 自连接：同一张表和自己拼

"同城有哪些站点，方便互相调拨运维？"站点表和自己连接，关联条件是城市相同、站点不同：

```sql
SELECT a.name AS station_a, b.name AS station_b, a.city
FROM stations a
JOIN stations b ON a.city = b.city AND a.station_id < b.station_id;
-- 结果：滨江服务区站 x 萧山机场站（杭州）
```

自连接的本质是给同一张表起两个别名，当成两张独立表用。`a.station_id < b.station_id` 让每对站点只出现一次（去掉 (A,B) 与 (B,A) 的镜像和 A=A 的自身配对）。经典同款：员工表里"员工-上级"配对，分类表里"子类-父类"配对。

### CROSS JOIN 与 USING

```sql
-- 笛卡尔积：3 站 x 3 时段 = 9 行，生成巡检排班矩阵的底表
SELECT s.name, t.slot
FROM stations s
CROSS JOIN (
    SELECT '06:00-14:00' AS slot
    UNION ALL SELECT '14:00-22:00' UNION ALL SELECT '22:00-06:00'
) t;

-- 两表同名列关联时，USING 是 ON 的简写（结果里同名列只出现一次）
SELECT s.name, c.power_kw
FROM stations s JOIN chargers c USING (station_id);
```

CROSS JOIN 常被拿来当"行生成器"用（本例的时段表就是这么拼的）。NATURAL JOIN 按全部同名列自动连接，列名一变就悄悄改语义，生产代码不要用。

## 为什么：行数膨胀是理解一切连接的地基

判断一条联查结果对不对，先算行数。 charger_sessions 与 chargers 是**多对一**：一个桩多笔订单。联查后行数 = 订单数（每笔订单恰好带出它桩和站的信息），这个方向安全。

反过来，**一对多方向的聚合**就是事故高发区：

```sql
-- 想算每个站有几根桩 + 几笔订单，直接联三表再 COUNT(*) 就错了：
-- 站 1 有 2 根桩，订单都挂在桩 11 上，联查后站 1 有 2 笔订单 x ... 行数被桩数放大
```

一对多联查的结果里，"一"侧的每一行会随"多"侧重复出现。所以：**COUNT 主表用 `COUNT(DISTINCT 主表.主键)` 或先聚合子表再 JOIN**；SUM 更危险，金额会被成倍放大。这是所有报表联查的第一自检项。

ON 与 WHERE 的执行时机差异也源于此：外连接的"补 NULL 行"发生在连接阶段，之后 WHERE 再过滤——把右表条件写进 WHERE 会把补出来的 NULL 行过滤掉，LEFT JOIN 退化成 INNER JOIN。这条链的完整推演在 [SELECT 执行顺序](/sql/080-SelectExecutionOrder)。

## 坑点与自检

### 坑一：忘写连接条件，行数爆表

```sql
-- 逗号连接 = CROSS JOIN：5 桩 x 4 订单 = 20 行垃圾数据
SELECT * FROM chargers c, charge_sessions cs;
```

症状是结果行数远超预期、同值行大量重复。自检：**联查结果行数先于内容检查**，心里要有一个预期行数（多对一 = 多表行数；一对多 = 膨胀）。

### 坑二：LEFT JOIN 后的 COUNT

```sql
-- 想统计每个站的订单数，包括 0 单的站
SELECT s.name, COUNT(*) AS cnt          -- 错：0 单的站显示 1（一行全 NULL 的行）
FROM stations s
LEFT JOIN chargers c ON c.station_id = s.station_id
LEFT JOIN charge_sessions cs ON cs.charger_id = c.charger_id
GROUP BY s.station_id, s.name;

-- 正确：COUNT 带表名前缀的右表列，NULL 不计数
SELECT s.name, COUNT(cs.session_id) AS cnt;
```

自检：LEFT JOIN 之后写聚合，**全部用 `COUNT(右表.列)`，禁止 `COUNT(*)`**。

### 坑三：右表条件放错位置，LEFT JOIN 静默退化

```sql
-- 错误：只看 9 月订单，但写在 WHERE 里 => 从没在 9 月充过电的桩整行消失
SELECT c.charger_id, cs.session_id
FROM chargers c
LEFT JOIN charge_sessions cs ON cs.charger_id = c.charger_id
WHERE cs.started_at >= '2026-09-01';

-- 正确：时间条件属于"匹配规则"，写进 ON
SELECT c.charger_id, cs.session_id
FROM chargers c
LEFT JOIN charge_sessions cs
       ON cs.charger_id = c.charger_id
      AND cs.started_at >= '2026-09-01';
```

判别口诀：**这个条件筛的是"匹配什么"（进 ON）还是"留下什么"（进 WHERE）**。想保留左表全部行，右表条件一律进 ON。

### 坑四：连接条件写错列，不报错但数据错

ON `c.station_id = cs.charger_id` 这类"类型兼容但语义无关"的列相等不会报任何错，只会给出错误的匹配。防御手段：外键约束（建表时写好）、联查前先单表 SELECT 熟悉各表主键、结果抽查几行人工核对。

### 性能预览：这条 JOIN 打算怎么执行

连接快不快，取决于被驱动表关联列上有没有索引：

```sql
-- 给从表的关联列建索引（外键在 MySQL InnoDB 会自动建，手工删过就要补）
SHOW INDEX FROM chargers;
EXPLAIN SELECT ... ;   -- 见 mysql/320-EXPLAINDetailed
```

嵌套循环、哈希连接这些算法层面的展开见 [JOIN 算法](/mysql/390-JOINAlgorithm)。

## 练习

1. 查出"每个站点的桩数和订单数"，要求 0 单的站也出现且显示 0（提示：LEFT JOIN + COUNT 明细列）。
2. 查出从未产生订单的**站点**（而不是桩）。先想清楚：14 号桩会让它所在的站免于"孤儿"判定吗？
3. 用自连接找出"同站同功率"的桩对（提示：`a.charger_id < b.charger_id` 去重）。
4. 把三表收入统计改写成"先按桩聚合订单，再 JOIN 站点"的两段式，对比结果是否一致，并解释哪种写法在订单表巨大时更稳。
5. 构造一条 WHERE 让 LEFT JOIN 退化的查询，再用 EXPLAIN 观察 type 列从 ALL/ref 的变化，验证"退化是可以被观测的"。

## 下一步

- 联查之上做分组报表、窗口排名，进入[进阶查询与多表操作](/mysql/150-AdvancedQueryMultiTableOperation)；
- 连接的底层执行算法（NLJ、Hash Join）见 [JOIN 算法](/mysql/390-JOINAlgorithm)；
- 016 模块的通用版讲解在 [连接查询](/sql/150-JoinQuery)与[半连接与反连接](/sql/180-SemiAntiJoin)。
