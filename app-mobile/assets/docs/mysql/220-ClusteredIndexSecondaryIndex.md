---
order: 240
title: 聚簇索引与二级索引：InnoDB 里表就是一棵 B+ 树
module: 'mysql'
category: 数据库
difficulty: advanced
description: 以外卖骑手调度系统的订单表为练习场，理解"InnoDB 表本身就是聚簇索引"这件事：主键怎么选、二级索引为什么只存主键、回表的代价从哪来，并用覆盖索引与延迟关联把慢查询救回来。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'mysql/230-CompositeIndexLeftmostPrefixPrinciple'
  - 'mysql/250-IndexConditionPushdown'
  - 'mysql/320-EXPLAINDetailed'
  - 'mysql/410-InnoDBSystemArchitecture'
prerequisites:
  - 'mysql/070-MySQLDataTypeConstraint'
---

## 1. 场景：订单表 5000 万行，骑手端列表超时了

外卖平台"蜂驰送"的调度后台，骑手端要拉"我今日的订单"：

```sql
SELECT * FROM orders WHERE rider_id = 88152 ORDER BY created_at DESC;
```

订单表 5000 万行，这条查询偶尔 20 毫秒，偶尔 4 秒。DBA 看了一眼表结构，问了你一个问题："你知道 InnoDB 里，**表本身**长什么样吗？"

这篇就用这张订单表，把 InnoDB 索引体系的根——聚簇索引与二级索引——一次讲清。后面章节的联合索引、覆盖索引、索引失效，全是这两棵树的衍生品。

### 1.1 练习场数据

```sql
CREATE TABLE orders (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rider_id   BIGINT NOT NULL,          -- 接单骑手
  city_code  CHAR(4)   NOT NULL,       -- 城市编码，如 0100
  status     TINYINT   NOT NULL,       -- 1 待接单 2 配送中 3 已送达 4 已取消
  fee        DECIMAL(6,2) NOT NULL,    -- 配送费
  created_at DATETIME  NOT NULL,
  KEY idx_rider (rider_id),
  KEY idx_city_status_created (city_code, status, created_at)
) ENGINE=InnoDB;

-- 造点能跑的数据（真实业务千万行，逻辑一致）
INSERT INTO orders (rider_id, city_code, status, fee, created_at)
SELECT
  88152,
  '0100',
  1 + (n % 4),
  3.50 + (n % 7),
  '2026-09-20 08:00:00' + INTERVAL n MINUTE
FROM (WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n < 200) SELECT n FROM seq) t;
```

少量数据看不出性能差别，所以本篇一半的结论靠 `EXPLAIN` 读"计划"，另一半靠推理"如果是一亿行会怎样"。`EXPLAIN` 的逐列读法在[EXPLAIN 详解](/mysql/320-EXPLAINDetailed)，这里只看 `type` 和 `Extra` 两列。

## 2. 聚簇索引：表本身就是一棵 B+ 树

### 2.1 InnoDB 没有独立的"数据区"

别的存储引擎常见"索引归索引、数据归数据"两层结构；InnoDB 不是。**整张表的数据行就存放在主键 B+ 树的叶子节点里**——这棵树叫聚簇索引（clustered index）。主键查找不需要"先查索引再取数据"两步，因为索引的叶子就是数据：

```
聚簇索引（主键树）：
              [30 | 60]                       内部节点：只放主键 + 指针
             /    |    \
      [10|20|30][40|50|60][70|80|90]          叶子节点：完整行数据，按主键有序
         ↓          ↓          ↓
      [行1][行2][行3] → [行4][行5][行6] → ...  叶子间双向链表，支持范围扫描
```

由此推出 InnoDB 的两条铁律：

- **每张表有且只有一棵聚簇索引**（数据只能按一种顺序物理组织）；
- **按主键访问是最快的路径**（一次 B+ 树查找直达行）。

### 2.2 没定义主键怎么办：InnoDB 替你选

按以下优先级确定聚簇索引：

1. 显式定义的 `PRIMARY KEY`；
2. 没有 PK 时，第一个"所有列都 NOT NULL"的 `UNIQUE` 索引；
3. 都没有，InnoDB 生成一个隐藏列 `ROW_ID`（6 字节单调递增）当聚簇键。

第三种情况要警惕：隐藏主键你看不见、用不了，所有二级索引都只能挂在它上面，而且**全局分配、插入竞争更激烈**。结论：**每张表都显式定义主键**，别把选择权交给引擎。

### 2.3 主键选自增还是 UUID

| 特性       | 自增 BIGINT        | 随机 UUID（v4）        |
| ---------- | ------------------ | ---------------------- |
| 插入位置   | 永远追加到最右叶子 | 落点随机               |
| 页分裂     | 极少               | 频繁                   |
| 碎片与空间 | 紧凑               | 碎片多、页利用率低     |
| 键长度     | 8 字节             | 16 字节（文本形式 36） |
| 全局唯一   | 否（单表唯一）     | 是                     |
| 可预测性   | 可被推测           | 不可推测               |

自增主键的插入永远是"在最右边叶子追加"，写满一页开新页，磁盘顺序写；随机 UUID 每次插入落点不可预测，写满的页中间也要硬塞，触发**页分裂**——把一页拆两半，两个半满页占原来一倍空间，缓存命中率同步下降。

但别急着把"UUID 不可用"写进规范——2026 年的主流答案是 **UUIDv7**（RFC 9562，2024 年发布）：时间戳在前，天然趋势递增，兼得全局唯一与顺序插入。MySQL 里落库用 `UUID_TO_BIN(uuid, 1)` 的交换标志把时间低位换到字节前端（针对 v1），v7 本身已按时间有序，直接 `UUID_TO_BIN(uuid)` 即可。分库分表、离线先生成 ID 的场景，UUIDv7 是当下标准答案；单库业务，自增 BIGINT 依然是最简单正确解。

### 2.4 主键必须短：每个二级索引都在复制它

这是第 2 节最重要的隐藏结论，放到[二级索引]讲完后再回头看就通了：**二级索引的每个叶子都存一份主键值**。主键从 8 字节换成 36 字节的 UUID 字符串，等于给每棵二级索引的每个条目加粗 28 字节——10 个二级索引就是 10 倍放大。主键宁短勿长。

## 3. 二级索引：另一棵树，叶子上只有主键

`idx_rider` 是一棵独立的 B+ 树，叶子节点存的不是行数据，而是**索引列 + 主键值**：

```
二级索引 idx_rider（按 rider_id 排序）：
              [78001 | 88152]
             /       |       \
   [76003|76088][77012|88001][88152|88152|90007]
         ↓             ↓            ↓
   → [id=12][id=57] → [id=3][id=41] → [id=7][id=19][id=88] →
     叶子：rider_id + 主键 id
```

### 3.1 回表：两棵树各查一次

```sql
SELECT * FROM orders WHERE rider_id = 88152;
```

执行过程分两步：

1. 在 `idx_rider` 树上找到所有 `rider_id = 88152` 的条目，取出主键 id（比如 7、19、88）；
2. 拿着这些 id 回到聚簇索引树，逐个查出完整行。

第二步就叫**回表**（table lookup / bookmark lookup）。命中 3 行就是 3 次聚簇索引查找；单行查询毫无压力。

### 3.2 回表的代价：行数一多，索引反而输给全表扫描

回表是"随机主键查找"，每次都可能撞上不同的数据页。当命中行数很多时：

```sql
-- 假设 city_code = '0100' 命中 800 万行
SELECT * FROM orders WHERE city_code = '0100';
```

800 万次回表 = 800 万次近似随机的页访问，比顺序读完整个聚簇索引还慢。优化器的成本模型会把这笔账算出来，**直接放弃二级索引改走全表扫描**——于是出现"这查询为什么不用索引"的经典现场。这不是优化器抽风，是回表贵过了扫表。

自检方法：`EXPLAIN` 里 `type=ALL` 但 `possible_keys` 列出了你的索引，多半就是这种情况。出路不是强扭索引（FORCE INDEX 常常更慢），而是把"要查的列"塞进索引，让它根本不用回表。

## 4. 覆盖索引：让查询在二级索引树上原地解决

如果查询要的列**全部**在二级索引里，第二步回表就整个消失：

```sql
-- 统计骑手今日单量：只要 rider_id 和行数
SELECT rider_id, COUNT(*) AS cnt
FROM orders
WHERE rider_id = 88152 AND created_at >= '2026-09-20'
GROUP BY rider_id;

EXPLAIN SELECT rider_id, COUNT(*) FROM orders WHERE rider_id = 88152;
-- Extra: Using index    ← 覆盖索引生效，零回表
```

为什么覆盖了？`idx_rider` 的叶子本来就是 `rider_id + 主键 id`，`COUNT(*)` 数条目、`rider_id` 就在条目里，整棵二级索引树自给自足。注意 `Using index` 这个 Extra 标记是"覆盖索引"的官方信号，别和 `Using index condition`（那是[索引条件下推 ICP](/mysql/250-IndexConditionPushdown)，另一回事）混淆。

把骑手查单改成覆盖形态：建 `idx_rider_created (rider_id, created_at)`，则"骑手 + 时间过滤 + 取单号/时间"全在索引里，原来 4 秒的列表降到 20 毫秒级——本篇开头场景的完整答案。

### 4.1 设计覆盖索引的三个手感

```sql
-- 1. WHERE 等值列放最前
CREATE INDEX idx_city_status_created (city_code, status, created_at);  -- 已建

-- 2. SELECT 里的列尽量都在索引中
SELECT status, COUNT(*) FROM orders
WHERE city_code = '0100' AND created_at >= '2026-09-20'
GROUP BY status;
-- city_code/status/created_at 都在 idx_city_status_created 里：Using index

-- 3. 别为覆盖索引无限加列：索引越宽，写入维护越贵、占用空间越大
--    覆盖索引是"为高频查询定制的窄视图"，不是 SELECT * 的解药
```

`SELECT *` 永远不可能被覆盖（除非表就一列），这就是"业务代码别写 `SELECT *`"在索引层面的最硬理由——少选一列，可能就少一次回表。

## 5. 延迟关联：覆盖索引管不了 SELECT * 的时候

分页查询是回表的重灾区：

```sql
-- 第 10001 页：跳过 10 万行取 10 行
SELECT * FROM orders
WHERE city_code = '0100'
ORDER BY created_at DESC
LIMIT 100000, 10;
```

天真的索引方案是建 `(city_code, created_at)` 然后指望它覆盖——但 SELECT * 要全部列，每页都得回表 10 次，浪费在**被跳过的 10 万行**上的回表才是大头。延迟关联把"找 id"和"取行"拆开：

```sql
SELECT o.*
FROM orders o
JOIN (
  SELECT id FROM orders
  WHERE city_code = '0100'
  ORDER BY created_at DESC
  LIMIT 100000, 10
) t ON o.id = t.id;
```

内层子查询只要 `id`，而二级索引叶子天生带主键，`(city_code, created_at)` 就是覆盖索引——**翻页全程只在索引树上滑行**；外层只对最终 10 行回表。深分页从"线性变慢"变成"恒定代价"，这就是第 40 篇提过的游标分页思想在 MySQL 里的落地方。

顺带修一个常见冗余：老代码里常见 `INDEX(created_at DESC, id, title)` 这类"把主键也写进去"的写法。二级索引自动携带主键，`(city_code, created_at)` 的实际条目就是 `(city_code, created_at, id)`，倒序扫描时 id 天然充当决胜列——显式再写 id 是白占地盘。

## 6. 隐藏主键的补刀：ICP 一眼带过

二级索引树上是 `(索引列, 主键)`，那 `WHERE name LIKE '张%' AND age > 30` 这种"第二列不在等值条件里"的场景，过滤发生在哪？答案：MySQL 5.6 起的索引条件下推把 `age` 的判断也推到引擎层、在索引条目上先过滤再回表。它和本篇的关系是同一棵树上的两件事，完整推演见[ICP 专题](/mysql/250-IndexConditionPushdown)。

## 7. 坑点清单与自检

1. **主键太长**：UUID 字符串当主键，所有二级索引跟着变胖。用自增 BIGINT 或 UUIDv7 二进制（`UUID_TO_BIN`）。
2. **表没主键**：InnoDB 塞隐藏 ROW_ID，二级索引全部挂在看不见的列上。建表必写 PRIMARY KEY。
3. **大结果集走不到索引**：不是索引失效，是回表成本输给了全表扫描。用覆盖索引救，而不是 FORCE INDEX 硬来。
4. **`Extra: Using index` 认不出来**：这是覆盖索引生效的标志；`Using index condition` 是 ICP，两回事。
5. **索引里显式带主键列**：二级索引自动含主键，写了纯属冗余。
6. **深分页 OFFSET**：翻到深处回表浪费爆炸，改延迟关联或游标分页。
7. **`SELECT *`**：断绝覆盖索引可能，还可能在表加列后拖垮下游。按需选列。

## 8. 练习

基于本文的 orders 表：

1. 写出"骑手 88152 在 2026-09-20 的已送达订单 id 列表"的 SQL，并用 EXPLAIN 验证它当前是否覆盖（提示：现索引下 SELECT id 能覆盖吗？）。
2. 为查询 `SELECT status, COUNT(*) FROM orders WHERE rider_id = ? GROUP BY status` 设计覆盖索引，并说明索引列顺序理由。
3. 手算延迟关联版本与直接 OFFSET 版本在 `LIMIT 199990, 10` 时各自的回表次数。
4. 用 EXPLAIN 观察第 1 题：给 `idx_rider` 扩成 `(rider_id, created_at)` 前后，Extra 各是什么？
5. （思考题）为什么 InnoDB 选择"叶子存主键"而不是"叶子存行地址"？提示：考虑页分裂发生时，行地址会怎样，二级索引要不要跟着改。

## 下一步

- [联合索引与最左前缀](/mysql/230-CompositeIndexLeftmostPrefixPrinciple)：本篇"覆盖索引列顺序手感"背后的完整规则。
- [索引条件下推 ICP](/mysql/250-IndexConditionPushdown)：第 6 节那句"推到引擎层"的展开。
- [EXPLAIN 逐列读懂](/mysql/320-EXPLAINDetailed)：type/Extra 的完整阶梯。
- [InnoDB 体系架构](/mysql/410-InnoDBSystemArchitecture)：B+ 树页、Buffer Pool 与变更缓冲如何托住这两棵树。
