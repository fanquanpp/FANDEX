---
order: 80
title: 生成列
module: 'postgresql'
category: 数据库
difficulty: intermediate
description: 以声浪播客平台的三个派生值需求为线，讲清生成列的心智模型：写时计算的 STORED 与读时计算的 VIRTUAL（PostgreSQL 18），表达式规则、索引与逻辑复制的边界，以及与触发器、视图的选型对比。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'postgresql/130-ViewMaterializedView'
  - 'postgresql/230-CoveringIndexPartialIndex'
  - 'postgresql/380-TriggerEventTrigger'
  - 'postgresql/540-PostgreSQL18NewFeatures'
prerequisites:
  - 'postgresql/010-OverviewInstallConfig'
---

## 场景：三处"由别的列算出来"的值

"声浪"播客平台上有一批字段，值永远由别的列决定：

| 需求 | 派生规则 |
| ---- | -------- |
| 单集总时长 | 各片段时长求和，**写进行里**，列表页直接读 |
| 全名/规范化标题 | `first_name || ' ' || last_name` 这类廉价拼接，只在详情页偶发地读 |
| 订单小计 | `price * quantity`，读写都频繁，还要建索引做范围过滤 |

这类值的共同点：**它是派生的（derived），不该允许任何人写它**。允许写的后果不需要举例——应用 A 写了 100，应用 B 按自己的公式写了 113，审计时没人说得清哪个对。

把派生值放进数据库的第一反应通常是触发器：`BEFORE INSERT/UPDATE` 里算好写回。生成列（Generated Column）是这件事的声明式版本——**在表定义里写一次公式，数据库保证每行的值都按公式维护，任何人都插不进、改不了**：

```sql
-- PostgreSQL 12+：STORED 生成列，值在写入时计算并存进磁盘
CREATE TABLE episode_segments (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  episode_id    BIGINT NOT NULL,
  duration_sec  INT NOT NULL,
  title_text    TEXT NOT NULL,
  search_title  TEXT GENERATED ALWAYS AS (lower(title_text)) STORED
);

INSERT INTO episode_segments (episode_id, duration_sec, title_text)
VALUES (1, 300, 'Hello World');

-- 试图手写派生值，直接被拒：
-- INSERT INTO episode_segments (..., search_title) VALUES (..., 'x')
-- ERROR: cannot insert a non-DEFAULT value into column "search_title"
-- UPDATE 同理，只有 DEFAULT 关键字可以指给它
```

生成列与列默认值（DEFAULT）是两个东西，别混：

| | DEFAULT | 生成列 |
| --- | --- | --- |
| 计算时机 | 仅在插入缺省时算一次 | 每次行变化都重算 |
| 能否被覆盖 | 能（显式给值即可） | 不能，只有 DEFAULT 可给 |
| 公式能否引用同行的其他列 | 不能 | 能（这正是它的存在意义） |
| 能否用易变函数（now()、random()） | 能 | 不能（见下文 IMMUTABLE） |

## 一、STORED：写时计算，像自动维护的物化视图

STORED 生成列在 INSERT / UPDATE 时计算，结果**像普通列一样存在磁盘上**。官方文档的类比很准：STORED 生成列之于表，就是物化视图之于查询——值被物化，但由数据库自动维护，不需要你手动 REFRESH。

```sql
CREATE TABLE episodes (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        TEXT NOT NULL,
  title_search TEXT GENERATED ALWAYS AS (lower(title)) STORED,
  play_count   BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_ep_title_search ON episodes (title_search);
-- 生成列上建索引完全合法，还能挂 UNIQUE / CHECK 约束
```

代价与收益都来自"物化"：

- 读快（就是普通列），可索引、可约束、可出现在任意查询里；
- 写慢一点、占存储：每次改动基列，公式都要重算并落盘；
- **宽表 + 高频更新**的表要掂量：为一个读得少的派生值让所有写多付一份。

## 二、VIRTUAL：读时计算，像内联进表的小视图

PostgreSQL 18 引入 VIRTUAL 生成列，并**把它设为省略关键字时的默认值**——也就是说 PG 18 里 `GENERATED ALWAYS AS (...)` 不写 STORED，得到的是虚拟列；想要旧行为必须显式写 STORED。PG 17 及以前没有虚拟列，`STORED` 关键字是强制项（这是老资料和现文档冲突最常见的地方）。

```sql
-- PostgreSQL 18
CREATE TABLE order_items (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  price    NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL,
  subtotal NUMERIC(12,2) GENERATED ALWAYS AS (price * quantity)   -- VIRTUAL（默认）
);

INSERT INTO order_items (price, quantity) VALUES (19.90, 3);
SELECT subtotal FROM order_items WHERE id = 1;   -- 59.70，此刻才计算
```

官方文档的类比：VIRTUAL 生成列之于表，就是视图之于查询——不占存储，每次读取时现算。由此，它和 STORED 的差异不是"快慢"那么笼统，而是一组明确的边界：

| | STORED | VIRTUAL |
| --- | --- | --- |
| 计算时机 | 写入时 | 读取时 |
| 占存储 | 占（每行一份） | 不占 |
| 公式可用的函数 | 任意 IMMUTABLE 函数 | **仅内置函数/类型**（经操作符、类型转换间接使用的自定义函数、自定义类型都不行） |
| 直接建索引 | 可以 | **不可以**（报错 indexes on virtual generated columns are not supported） |
| 逻辑复制 | PostgreSQL 18 起可发布（见下节） | 不可（无存储值可发） |
| 读写画像 | 读多写少、公式昂贵 | 写多读少、公式廉价 |

VIRTUAL 建索引的正确姿势是**绕过列、索引表达式本身**——虚拟列本质就是存了个表达式，给表达式建普通函数索引，planner 会把两者接上：

```sql
CREATE TABLE users (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  full_name  TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name)  -- VIRTUAL
);

-- 直接索引虚拟列：报错
-- CREATE INDEX ON users (full_name);
-- ERROR: indexes on virtual generated columns are not supported

-- 索引底层表达式：合法，且服务对 full_name 的查询
CREATE INDEX idx_users_full_name ON users ((first_name || ' ' || last_name));
SELECT * FROM users WHERE full_name = 'Ada Lovelace';   -- 能用上上面的函数索引
```

一个安全细节（PG 18 文档明确提示）：读虚拟列的值=执行它的表达式，如果表达式里有"会泄漏参数的函数"（非 leakproof，比如某些类型转换函数会把参数写进错误消息），行级安全（[RLS](/postgresql/500-RowLevelSecurity)）场景下可能借道泄漏被保护的数据。涉及 RLS 时优先用 STORED。

## 三、公式的边界：IMMUTABLE 与"只看本行"

两类生成列共享同一组表达式规则，全部来自"数据库要能**独立地、确定地**重算它"这一要求：

```sql
-- 1. 必须 IMMUTABLE：同样的输入永远得到同样的输出
full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED   -- 合法

-- 常见翻车：timestamptz 的取年
published_year INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM published_at)) STORED
-- published_at 是 timestamptz 时报错：函数不是 immutable
-- 原因：同一时刻在东京和上海是不同的"年"，结果依赖时区设置（STABLE）
-- 修正：把时区钉死在表达式里，或基列改用 timestamp（不带时区）
published_year INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM published_at AT TIME ZONE 'Asia/Shanghai')) STORED

-- 2. 不允许子查询、不允许引用本行之外的任何东西（tableoid 除外）
bad1 TEXT GENERATED ALWAYS AS ((SELECT name FROM shows WHERE id = show_id)) STORED  -- 报错
bad2 INT  GENERATED ALWAYS AS (random()) STORED                                     -- 报错（易变）

-- 3. 生成列不能引用另一个生成列（避免链式依赖与重算顺序问题）
```

理解这条边界的钥匙是 MVCC：行更新时数据库要**在写入的那一刻**确定行的新版本长什么样（STORED），或在读的那一刻重放公式（VIRTUAL）。公式一旦依赖"外部世界"（其他行、当前时间、随机数），同一行在不同时刻就会"是"不同的数据，MVCC 的快照语义与唯一约束都无从谈起。

顺带记两个使用限制：生成列不能做分区键；不能在 BEFORE 触发器里读它（它的值在 BEFORE 触发器跑完之后才确定——触发器里改了基列，公式要按改完的算）。

## 四、与相邻方案的关系：什么时候轮到生成列

派生值有四个候选实现，选择依据是"谁算、何时算、谁能改"：

| 方案 | 谁负责 | 何时算 | 防手写 | 适用 |
| --- | --- | --- | --- | --- |
| 应用层计算 | 各应用 | 请求时 | 否（多语言多副本，靠自觉） | 派生规则依赖外部服务/配置 |
| 触发器 | 数据库 | 写入时 | 强 | 公式需要跨行数据、过程逻辑 |
| 视图 | 数据库 | 每次查询 | 强（视图本身不可写） | 读者通过视图取数即可 |
| 生成列 | 数据库 | 写入(STORED)/读取(VIRTUAL) | 强（列级拒写） | 值必须"长在表上"：可索引、可约束、随行走 |

判断口诀：**值需要被索引/被约束/被所有查询直接引用 → 生成列；需要跨行或过程逻辑 → 触发器；只是查询时想顺便算一下 → 视图或表达式**。生成列与[表达式索引](/postgresql/230-CoveringIndexPartialIndex)之争也在此：单一查询模式用表达式索引（不占表存储），多查询共享同一派生值用生成列（写一次公式，处处可引用）。

## 动手环节：把三个需求落成三种选择

先在 PostgreSQL 17/18 开发库建最小表结构，逐题先写再对照参考实现。PG 17 的读者注意：第 1、3 题的结论一样，但第 2 题验证 VIRTUAL 默认值的行为在 17 上不存在，可跳过或仅读讲解。

### 任务一：订单小计要能按金额段过滤

需求：`order_items(price, quantity)`，业务常查"小计在 1000 元以上的行"，写入频繁。

提示：要索引 → 要物化；在 STORED 与"表达式索引"之间选一个并说明理由；用 EXPLAIN 验证。

<details>
<summary>参考实现与讲解</summary>

```sql
CREATE TABLE order_items (
  id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  price    NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL,
  subtotal NUMERIC(12,2) GENERATED ALWAYS AS (price * quantity) STORED
);

CREATE INDEX idx_oi_subtotal ON order_items (subtotal);

EXPLAIN SELECT * FROM order_items WHERE subtotal >= 1000;
-- 期望：Index Scan using idx_oi_subtotal
```

选 STORED 的理由：查询模式是"对派生值做范围过滤"，必须能建 B-tree；VIRTUAL 列不能直接建索引（PG 18 上会报错），即便绕道表达式索引，也更愿意让"被过滤的值"物化下来，读取路径最短。

</details>

### 任务二：体验 PG 18 的默认值反转

需求：验证"PG 18 里省略 STORED/VIRTUAL 得到 VIRTUAL"，并观察它与 STORED 在插入开销上的差异（`\d+` 表描述、插入 EXPLAIN ANALYZE）。

提示：同一公式建两张表，一张不写关键字、一张写 STORED；`\d+` 看 generation expression 与存储标记。

<details>
<summary>参考实现与讲解</summary>

```sql
CREATE TABLE gc_virtual  (price numeric, qty numeric,
  total numeric GENERATED ALWAYS AS (price * qty));            -- 不写关键字
CREATE TABLE gc_stored   (price numeric, qty numeric,
  total numeric GENERATED ALWAYS AS (price * qty) STORED);

\d+ gc_virtual    -- 总述里 total 标记为 virtual generated
\d+ gc_stored     -- 标记为 stored generated

-- 批量插入对比（1 万行）：
INSERT INTO gc_virtual (price, qty) SELECT random()*100, random()*100 FROM generate_series(1,10000);
INSERT INTO gc_stored  (price, qty) SELECT random()*100, random()*100 FROM generate_series(1,10000);
-- 写时计算的 gc_stored 略慢；反过来 SELECT total 时 gc_virtual 每次现算
```

讲解：这正是"写时代价 vs 读时代价"的实体演示。批写多读少的场景虚拟列更省；读多（尤其全表扫描后还要算）的报表场景 STORED 更稳。

</details>

### 任务三：把"规范化邮箱"做成列并保住唯一性

需求：用户表 email 输入可能带大写与空格，要求数据库里"规范化后的邮箱"不重复，且规范化值可被任意查询直接引用。

提示：规范化函数选 `lower(btrim(...))`（内置、IMMUTABLE）；"不重复"落到生成列上的 UNIQUE 索引；别忘了 NULL 的行为（多个 NULL 互不冲突，见[覆盖索引与部分索引](/postgresql/230-CoveringIndexPartialIndex)）。

<details>
<summary>参考实现与讲解</summary>

```sql
CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email_raw     TEXT NOT NULL,
  email_norm    TEXT GENERATED ALWAYS AS (lower(btrim(email_raw))) STORED
);

CREATE UNIQUE INDEX uk_users_email_norm ON users (email_norm);

INSERT INTO users (email_raw) VALUES ('  Ada@Example.com ');
-- users.email_norm = 'ada@example.com'
INSERT INTO users (email_raw) VALUES ('ADA@example.com');   -- 报错：唯一约束
```

讲解：公式只需要内置函数（lower/btrim 都是 IMMUTABLE），STORED 让唯一索引、登录查询、展示引用都走同一物化值。若 PG 18 且规范化只用内置函数，也可先 VIRTUAL 再用表达式索引实现唯一性；但唯一约束语义最终仍要落在一个可判重的存储结构上，STORED 更直接。

</details>

## 坑点清单与自检

1. **老版本资料说"生成列必须写 STORED"，新版本说"省略就是 VIRTUAL"**：这是 PG 17 与 PG 18 的行为差异，不是谁写错了。升级大版本前 grep 一遍建表脚本里所有 `GENERATED ALWAYS AS`，逐个确认意图。
2. **timestamptz 上做日期提取报"not immutable"**：不是函数坏了，是结果依赖时区。修正姿势是把时区写进表达式（`AT TIME ZONE 'Asia/Shanghai'`）或基列改 timestamp。
3. **以为 VIRTUAL 也能建索引**：报错后才知道不支持。需求是索引时改 STORED，或索引底层表达式（planner 会接上）。
4. **BEFORE 触发器里读生成列**：直接报错或读到意外空值。生成列在 BEFORE 触发器之后求值；要读它用 AFTER 触发器。
5. **把生成列当 DEFAULT 用**：DEFAULT 只算一次、可被覆盖、不能引用其他列；生成列每行重算、拒写、必须引用本行列。语义差一个字，用途完全不同。
6. **逻辑复制预期落空**：PG 17 及以前，生成列被复制跳过，订阅端自己算；PG 18 起 STORED 值可发布（`publish_generated_columns` 选项或列清单），VIRTUAL 不可。跨版本复制方案见[逻辑与物理复制对比](/postgresql/440-LogicalPhysicalReplicationCompare)。

**自检清单**：STORED 和 VIRTUAL 各用一句"物化视图/视图"类比说出来了吗？IMMUTABLE 的判断标准是什么（同样的输入必得同样的输出，与时间、时区、随机无关）？为什么 VIRTUAL 不能直接建索引、绕行方案是什么？

## 面试视角

- **生成列 vs 触发器维护派生列**：声明式 vs 过程式。生成列公式受限（IMMUTABLE、仅本行）换来数据库代管的确定性；触发器灵活但把一致性责任交给代码正确性，且容易被"绕过触发器的批量导入"破坏。
- **PG 18 为什么把 VIRTUAL 设为默认**：向后兼容靠显式 STORED 保住；新表默认不占存储、写入零开销，把"要不要物化"变成显式决策。可以顺着聊"声明式数据库特性默认值的取舍"。
- **生成列上的 UNIQUE 能替代应用层校验吗**：能，且更强——约束在数据库层原子成立，应用层"先查后插"在并发下有窗口（与部分唯一索引替代先查后插同理）。
- **为什么表达式必须 IMMUTABLE**：MVCC 与约束要求行的内容在任何时刻被重算都一致；依赖时区/时间/随机的公式破坏该前提，索引与唯一性都会失去意义。

## 下一步

- [视图与物化视图](/postgresql/130-ViewMaterializedView)：VIRTUAL 的"视图"类比的正主，物化视图是 STORED 类比的正主；
- [触发器与事件触发器](/postgresql/380-TriggerEventTrigger)：生成列覆盖不了的过程逻辑；
- [覆盖索引与部分索引](/postgresql/230-CoveringIndexPartialIndex)：表达式索引与生成列之争的另一半；
- [PostgreSQL 18 新特性](/postgresql/540-PostgreSQL18NewFeatures)：VIRTUAL 生成列在版本特性中的位置。
