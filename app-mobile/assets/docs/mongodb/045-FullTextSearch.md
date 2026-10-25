---
order: 50
title: 全文检索
module: 'mongodb'
category: 数据库
difficulty: beginner
description: text 索引的建立与限制、$text 查询与相关性评分、与正则查询的性能取舍、Atlas Search 边界
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：MongoDB 全文检索——text 索引、$text 查询运算符、相关性评分排序，以及与正则/前缀查询的性能对比。
- 解决什么问题："在文章标题和正文里搜关键词"这类需求——正则查询只能全表扫描，text 索引给它配上倒排索引；还要让结果按"相关程度"而不是插入顺序排。
- 什么时候用到：博客文章搜索、商品名模糊搜、工单关键词检索；以及评估"要不要上专门的搜索引擎"。
- 衔接：《索引与查询性能》第 5 节的特殊索引（partial/TTL）与本篇同属特殊索引家族；更大规模/更复杂的搜索需求走 Atlas Search（本篇末节带过）。

## 前置知识

- 《索引与查询性能》：explain 判读（COLLSCAN/IXSCAN/TEXT）与索引代价；
- 《CRUD》：find 查询运算符的基本用法。

## 学习目标

- 会建 text 索引并用 $text 检索，理解分词、大小写与停用词的默认行为；
- 会用 $meta: "textScore" 拿相关性分数并按它排序；
- 能说清 text 索引的两条硬限制（每集合一个、复合索引中的键位规则）与正则查询的性能差异；
- 知道 Atlas Search 与自建 text index 的能力边界，会做"够用就好"的选型。

## 1. 场景：文章搜索的两条路

博客平台要加"文章搜索"。文章集合 4 万条，标题与正文都要搜。两条路先各跑一次：

```javascript
use blog
// 准备数据（示意）
db.articles.insertMany([
  { title: "MongoDB 索引原理", body: "复合索引的 ESR 法则……", views: 1200 },
  { title: "redis 持久化漫谈", body: "RDB 与 AOF 的取舍……", views: 800 },
])

// 路线 A：正则模糊搜（先跑这个，看 explain）
db.articles.find({ title: /mongo/i })
db.articles.find({ title: /mongo/i }).explain("executionStats")
// winningPlan: COLLSCAN —— 4 万条全扫，毫秒级起步、十万条秒级

// 路线 B：建 text 索引再搜
db.articles.createIndex({ title: "text", body: "text" })
db.articles.find({ $text: { $search: "mongo 索引" } }).explain("executionStats")
// winningPlan: TEXT_MATCH —— 倒排索引直接命中
```

**讲解：**

1. 正则 `/mongo/i` 前缀不锚定（不以 `^` 开头）且大小写不敏感，索引用不上，必然 COLLSCAN——它在"数据量小、偶发查询"时可以接受，在"核心功能"位置就是事故预定。
2. text 索引是倒排索引：建索引时把文本**分词**（默认英文按空格与标点、去停用词、词干化），每个词映射到包含它的文档。查询时 `$search` 的关键词同样分词后查倒排表——这就是它与正则的本质差别：正则扫文档，text 查词表。
3. `$search: "mongo 索引"` 里多个词是 **OR 语义**（含任一词即命中），想 AND 语义用引号包短语：`$search: "\"复合索引\""`。
4. explain 的 winningPlan 出现 TEXT_MATCH/TEXT_STAGE 即走了 text 索引；COLLSCAN 说明索引没建对或查询没写对（比如集合里有 text 索引但查询字段不在索引里）。

## 2. 相关性评分：$meta 把"有多匹配"变成数字

```javascript
db.articles.find(
  { $text: { $search: "mongo 索引" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })
```

**讲解：**

1. `$meta: "textScore"` 在投影里给每条结果附加相关性分数（命中词数、词的稀有度等参与计算），再在 sort 里按分数排——这就是"按相关程度排序"的最小实现，搜索引擎的结果排序原型。
2. 分数只在带 $text 的查询里存在，别处引用会报错；它是无界的经验值，只能用来排序或展示，不要拿去做业务阈值判断。
3. 短语搜索（引号包起来的词组）与排除（词前加 `-`）都参与评分：`$search: "\"索引原理\" -redis"` 表示必须含"索引原理"短语且不含 redis。

## 3. 行为细节与硬限制

text 索引的默认行为与两条硬限制，是踩坑重灾区：

1. **默认大小写不敏感、去变音符、按英文停用词过滤**——中文没有空格分词，默认分词器对中文句子的切分粗糙（基本按标点/空格），"中文全文搜索"用 text 索引效果有限，这是它最常见的差评来源，也是选 Atlas Search 或外部搜索引擎的主要理由之一。
2. **一个集合只能有一个 text 索引**。第二次 createIndex 带 "text" 键直接报错——想同时搜标题与正文，在一个索引里写多个 text 键（如第 1 节那样），而不是建两个。
3. **复合索引里 text 键必须在非 text 键之后**：`{ category: 1, title: "text" }` 合法（先按 category 等值过滤、再在组内全文搜），`{ title: "text", category: 1 }` 报错。前缀等值键 + text 键是"分类内搜索"的标准姿势。
4. 权重可调：`createIndex({ title: "text", body: "text" }, { weights: { title: 10, body: 1 } })`——标题命中比正文命中更相关，评分时 title 命中贡献 10 倍。
5. `$caseSensitive: true` / `$diacriticSensitive: true` 可以在查询侧翻转默认的大小写/变音符不敏感行为，但会让索引利用变差——保持默认、接受它，是多数场景的正确答案。

## 4. 与正则、前缀查询的性能取舍

| 需求形态 | 推荐方案 | 理由 |
| --- | --- | --- |
| 前缀精确匹配（`^abc`，区分大小写） | 普通索引 + 锚定正则 | 锚定前缀正则能走普通 B 树索引，无需 text 索引 |
| 关键词模糊搜、多词、相关性排序 | text 索引 | 倒排索引 + 评分是它的本职 |
| 任意位置子串（`abc` 在中间） | text 索引或外部搜索 | 中缀正则必 COLLSCAN，数据量大了都撑不住 |
| 中文整句语义搜索 | Atlas Search / 外部引擎 | text 索引对中文分词支持弱 |

**讲解：** 判断链是"查询形态 -> 索引能力"：锚定前缀用普通索引（免费且快），词级搜索用 text 索引，超出两者（语义、拼音、纠错）就换工具。把 text 索引当万能模糊搜索是它最常被错用的方式——它搜的是"词"，不是"字符串片段"。

## 5. Atlas Search：能力边界一段带过

Atlas Search（MongoDB Atlas 平台内置，基于 Apache Lucene）是 text 索引之上的完整搜索引擎：自定义分词器（含中文/ICU）、模糊匹配（容错拼写）、高亮、聚合分面、同义词。它与 text 索引不是竞争关系而是替代关系——**当 text 索引的分词与排序能力成为瓶颈时再上**；自建 MongoDB（非 Atlas）对应方案是接入 Elasticsearch/OpenSearch 这类外部引擎。选型口径：数据 10 万条以内、词级检索、英文为主——text 索引够用；中文搜索、纠错、自动补全——直接上专门引擎，不要在 text 索引上硬凑。

## 6. 三个真实场景

**场景一：博客文章全文搜（教学标准场景）。** 4 万篇文章的集合上实测对比：`/mongo/i` 正则 explain 的 executionTimeMillis 约 40-80ms（COLLSCAN 全扫），建 text 索引后同关键词 TEXT_MATCH 约 1-3ms——量级差距来自"扫 4 万文档"与"查词表"的原理差别。评分排序让"标题命中"排前面（配 weights），这就是文章搜索 MVP 的全部。

**场景二：商品名模糊搜（真实工程形态）。** 电商后台运营按商品名搜商品（"无线 蓝牙 耳机"三个词任意命中即出）。用复合 text 索引 `{ status: 1, name: "text" }`：status 等值过滤"已上架"，name 全文搜——一次查询同时用上两种索引能力。踩过的坑：最初给 name 单独建 text 索引，想再加"按分类搜"时又要 text，撞上"每集合一个 text 索引"限制——解法就是把两个需求合并进同一个复合索引（text 键放最后）。

**场景三：工单关键词检索（与 TTL/历史归档的取舍）。** 客服工单系统要"按描述关键词搜近期工单"。工单集合按 TTL 索引保留 180 天（《索引与查询性能》第 5 节），text 索引与 TTL 共存无冲突；但历史工单在归档集合里不建 text 索引（省索引内存），"搜历史"走专门的归档检索服务。教训：全文索引的内存与构建成本不低，"哪些数据值得建"是容量决策，不是默认配置。

## 7. 动手实践

**任务一：正则与 text 的 explain 对决。** 在一个 1 万条以上的集合上分别执行锚定正则、非锚定正则与 $text 查询，各跑 explain("executionStats")，记录 winningPlan 与 executionTimeMillis，写出结论。提示：锚定正则 `^abc`（不带 i）应走 IXSCAN——这证明"正则"与"用不上索引"不能画等号，锚定与否才是分水岭。

**任务二：评分与权重实验。** 建 `{ title: "text", body: "text" }`（weights: title 10, body 1）的索引，插入两篇文档（一篇标题命中、一篇正文命中同一关键词），用 $meta 投影观察分数差异；再把 sort 去掉看默认排序是否变化。提示：text 查询不带排序时返回顺序不稳定——"反正分数在，拿来看"与"拿分数来排序"是两件事，必须显式 sort。

**任务三：复合 text 索引与键位限制。** 尝试建 `{ title: "text", category: 1 }`，观察报错；改成 `{ category: 1, title: "text" }` 建成功，然后执行 `find({ category: "phone", $text: { $search: "5g" } })` 验证"分类内搜索"。提示：第二次 createIndex 报错还有另一个可能来源——集合里已有别的 text 索引（每集合一个），用 `db.coll.getIndexes()` 先查清现状。

先自己操作，再对照参考实现：

<details>
<summary>任务一参考流程</summary>

```javascript
use shop
// 1 万条商品名
const docs = []
for (let i = 0; i < 10000; i++) {
  docs.push({ name: "item pro max " + i, desc: "bluetooth wireless" })
}
db.search_lab.drop()
db.search_lab.insertMany(docs)

// A. 锚定前缀正则：建普通索引后应走 IXSCAN
db.search_lab.createIndex({ name: 1 })
db.search_lab.find({ name: /^item pro/ }).explain("executionStats")
// winningPlan: FETCH + IXSCAN；totalKeysExamined 与 totalDocsExamined 都小

// B. 非锚定正则：COLLSCAN，全表扫
db.search_lab.find({ name: /pro max/ }).explain("executionStats")
// winningPlan: COLLSCAN；executionTimeMillis 明显更高

// C. text 索引
db.search_lab.createIndex({ name: "text", desc: "text" })
db.search_lab.find({ $text: { $search: "bluetooth" } }).explain("executionStats")
// winningPlan: TEXT_MATCH_...；毫秒内返回

// 结论模板：锚定正则走普通索引；非锚定正则全扫；词级检索走 text 索引。
// 把三组 executionTimeMillis 记进表格，数据量 x10 复测一次，观察差距如何拉大。
```

要点：a) A 组成立的前提是索引存在且正则锚定、大小写敏感——加 i 或去掉 ^ 都会退回 COLLSCAN；b) 三种查询形态对应三种索引能力，选型先看查询形态；c) explain 的 totalKeysExamined/totalDocsExamined 比耗时更本质（不受机器状态影响），报告里两个都写。
</details>

## 8. 一句话记住

> 锚定前缀用普通索引，词级搜索用 text 索引（每集合一个、text 键在复合索引最后），相关性排序靠 $meta: "textScore"；中文字义搜索、纠错补全这类需求 text 索引撑不住，那是 Atlas Search/外部引擎的活。

## 参考与致谢

- MongoDB Manual：Text Indexes 与 $text 运算符，来源：https://www.mongodb.com/docs/manual/core/index-text/ ，许可证 CC BY-NC-SA 3.0 US。本文索引行为、限制（每集合一个、复合键位）与 $meta 评分用法依据官方手册整理；场景数值为教学示例，以本机实测为准。
