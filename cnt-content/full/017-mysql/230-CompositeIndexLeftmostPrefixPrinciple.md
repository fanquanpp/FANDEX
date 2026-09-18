---
order: 230
title: 联合索引与最左前缀：B+ 树的排序魔法
module: 'mysql'
category: 数据库
difficulty: intermediate
description: 联合索引的完整推理：B+ 树多列排序结构、最左前缀匹配规则、范围列截断、ORDER BY 利用与索引列顺序设计法。
author: fanquanpp
updated: '2026-09-18'
related:
  - 'mysql/220-ClusteredIndexSecondaryIndex'
  - 'mysql/240-PrefixIndex'
  - 'mysql/250-IndexConditionPushdown'
  - 'mysql/310-IndexFailureScene'
prerequisites:
  - 'mysql/210-IndexManagement'
  - 'mysql/220-ClusteredIndexSecondaryIndex'
---

## 前置知识

- 二级索引的 B+ 树结构与回表（[聚簇索引与二级索引](/mysql/220-ClusteredIndexSecondaryIndex)）——联合索引就是把它的排序键从一列扩展到多列。

## 问题引入：三个单列索引不如一个联合索引

查询 `WHERE a = 1 AND b = 2`，新手常给 a、b 各建一个索引，期望"两个索引一起用"。现实是：MySQL 通常只挑其中一个索引定位，再对候选行逐行检查另一个条件——另一个索引基本白建。正确答案是建**联合索引 `(a, b)`**，一次定位同时命中两个条件。

要理解为什么，必须先看联合索引在 B+ 树里长什么样。

## 结构：多列排序就是"字典排序"

联合索引 `(a, b, c)` 的索引项按**字典序**排列：先比 a，a 相同比 b，b 相同比 c：

```text
索引项（a, b, c）在树中的物理顺序：
(1,1,1) (1,1,3) (1,2,2) (1,3,1) (2,1,5) (2,2,1) (3,1,2) ...
  ↑ a 有序
          ↑ a=1 内部 b 有序
                  ↑ a=1,b=1 内部 c 有序
```

这就是"电话簿"：先按姓氏排，同姓按名字排。**理解了字典序，最左前缀原则就是它的自然推论**——你能用姓氏快速定位，能用"姓+名"精确定位，但一本按姓氏组织的电话簿没法直接按名字查。

## 最左前缀匹配规则

以索引 `(a, b, c)` 为例，WHERE 条件的命中情况：

| WHERE 条件 | 命中列 | 原因 |
| --- | --- | --- |
| `a = 1` | a | 最左列可定位 |
| `a = 1 AND b = 2` | a, b | 连续前缀 |
| `a = 1 AND b = 2 AND c = 3` | a, b, c | 全前缀 |
| `b = 2` | 无 | 缺 a，树里 b 全局无序 |
| `a = 1 AND c = 3` | 仅 a | c 断层（b 缺席），c 只能逐行过滤 |
| `a = 1 AND b > 2 AND c = 3` | a, b | **范围列截断**：b 是范围，c 失去有序性 |
| `a = 1 AND b IN (2,3) AND c = 4` | a, b, c | IN 是多组等值，不算范围截断 |

三条精华规则：

1. **从最左列开始连续命中**，跳列即断；
2. **遇到范围（>、<、BETWEEN、LIKE 前缀）则其后列截断**——范围之后 B+ 树里不再有序（例外：`IN` 等值可继续）；
3. 断层与截断的列**仍参与过滤**（Server 层或 [ICP 索引下推](/mysql/250-IndexConditionPushdown)），只是不参与定位——"用不上索引"指的是不能用它的有序性，不是条件被忽略。

## ORDER BY：同一原理的第二次应用

排序寻找的也是有序性，所以 ORDER BY 同样受最左前缀管辖：

```sql
-- 索引 (a, b, c)
WHERE a = 1 ORDER BY b, c            -- 免排序：a 固定后 b,c 恰好有序
WHERE a = 1 AND b = 2 ORDER BY c     -- 免排序：前缀等值后 c 有序
WHERE a = 1 ORDER BY c               -- filesort：跳过 b，c 无序
ORDER BY b, c                        -- filesort：缺最左列 a
ORDER BY a DESC, b DESC, c DESC      -- 免排序：整体倒序也是有序
ORDER BY a ASC, b DESC               -- filesort：8.0 起可用降序索引救
```

`WHERE a = 1 AND b = 2 ORDER BY c` 是设计的黄金示范：等值条件把前缀"钉死"之后，剩余列的有序性被完整释放。**设计索引时把 WHERE 等值列放前面、范围列放中间、排序列放最后**，就是让这条魔法链最大化。

## 列顺序设计法：等值 → 范围 → 排序

给 `WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 20` 设计索引：

```sql
-- 分析：user_id、status 是等值定位；created_at 是排序
CREATE INDEX idx_user_status_time ON orders (user_id, status, created_at);
-- 命中：user_id + status 定位，created_at 免排序直接取前 20 行
-- EXPLAIN 里 Extra 出现 Backward index scan，无 filesort
```

两条进阶取舍：

- **区分度高的列尽量靠前**（等值列之间排序影响不大，但范围列例外——区分度高的范围列放前面能更快收窄）；
- **别为了每个查询都建联合索引**：`(a)` 能被 `(a, b)` 覆盖最左前缀，反之不行——新索引能"兼任"旧索引时删旧索引（删除流程用[不可见索引](/mysql/280-InvisibleIndex)验证）。

## 动手环节：五分钟验证全部规则

```sql
-- 1. 造数据
CREATE TABLE combo_demo (a INT, b INT, c INT, v VARCHAR(10));
INSERT INTO combo_demo
SELECT a.N, b.N, c.N, 'x'
FROM (SELECT 1 N UNION ALL SELECT 2 UNION ALL SELECT 3) a,
     (SELECT 1 N UNION ALL SELECT 2 UNION ALL SELECT 3) b,
     (SELECT 1 N UNION ALL SELECT 2 UNION ALL SELECT 3) c;
CREATE INDEX idx_abc ON combo_demo (a, b, c);

-- 2. 逐一验证匹配表（看 key 与 key_len）
EXPLAIN SELECT * FROM combo_demo WHERE a = 1 AND b = 2;      -- key_len 覆盖 a+b
EXPLAIN SELECT * FROM combo_demo WHERE b = 2;                -- key = NULL
EXPLAIN SELECT * FROM combo_demo WHERE a = 1 AND c = 3;      -- 只用 a

-- 3. 范围截断验证
EXPLAIN SELECT * FROM combo_demo WHERE a = 1 AND b > 1 AND c = 2;
-- key_len 只覆盖 a+b，c 被截断

-- 4. 排序验证（看 Extra 有无 filesort）
EXPLAIN SELECT * FROM combo_demo WHERE a = 1 ORDER BY b, c;  -- 无 filesort
EXPLAIN SELECT * FROM combo_demo WHERE a = 1 ORDER BY c;     -- Using filesort

-- 5. IN 不截断验证
EXPLAIN SELECT * FROM combo_demo WHERE a = 1 AND b IN (1,2) AND c = 3;
-- key_len 覆盖 a+b+c
```

`key_len` 是本实验的读数仪表：它的变化精确反映"哪几列真正参与了定位"。把五条逐一跑完，匹配表就从背诵变成了亲测。

## 常见困惑

**"为什么跳过最左列就完全用不上？"**——字典序的多级结构决定的：b 在整棵树中是"分段有序"（只在每个 a 段内有序），全局查找 b=2 等于要扫全部段，与全表扫描无异。反过来，`(b, a)` 索引可以服务 `b = 2`——不是"b 列不能建索引"，而是"这套排序不支持这种找法"。

**"最左前缀是模糊匹配吗？LIKE 怎么算？"**——`LIKE 'abc%'` 等价于范围条件 `>= 'abc' AND < 'abd'`，可以命中索引（但会触发范围截断规则）；`LIKE '%abc'` 无左边界，无法定位。

**"联合索引列数有上限吗？"**——技术上 16 列、总长度 3072 字节以内。实践上限由常识决定：每列都增大索引体积与写入成本，超过四五列通常说明设计有问题（回头检查是否该拆分查询场景）。

## 检验清单

- 能用"电话簿字典序"向别人解释最左前缀原则，并默写七行匹配表；
- 能说出范围截断与 IN 例外的机制；
- 会按"等值 → 范围 → 排序"设计列顺序，并用 key_len 与 filesort 验证；
- 理解联合索引对单列索引的"兼任"关系，以及删除旧索引的正确姿势。

## 下一步

定位解决了，剩下的是"减少回表"：[前缀索引](/mysql/240-PrefixIndex) 管长列瘦身，[索引条件下推](/mysql/250-IndexConditionPushdown) 管回表瘦身——两者与本篇共同构成索引设计的三大件。
