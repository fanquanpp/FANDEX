---
order: 100
title: 向量集
module: 'redis'
category: 数据库
difficulty: advanced
description: Redis 8 Vector Set 向量集：VADD/VSIM 全命令实操、HNSW 与量化调参（Q8/BIN/M/EF）、属性 FILTER 过滤与 AI 嵌入检索场景。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'redis/310-RedisNewFeatures8'
  - 'redis/010-OverviewCoreDataStructure'
  - 'redis/070-GeoSpatial'
  - 'redis/270-SkipListAndSortedSet'
prerequisites:
  - 'redis/010-OverviewCoreDataStructure'
  - 'redis/270-SkipListAndSortedSet'
---

## 1. 学习目标与前置知识

- 前置：用过 ZSet（ZADD/ZRANGE），知道「嵌入向量（embedding）」是文本或
  图片经模型转成的浮点数组即可。
- 学完本篇你将能：
  1. 用 VADD/VSIM 完成向量入库与相似检索；
  2. 用属性（attributes）+ FILTER 做带条件的向量搜索；
  3. 用 Q8/BIN 量化与 M/EF 参数权衡内存、速度与召回率；
  4. 判断 Vector Set 与查询引擎向量检索、pgvector 的适用边界。

## 2. 是什么：ZSet 的「向量版」

Vector Set 是 Redis 8.0（beta）新增的数据结构，把 ZSet 的思想推广到
高维空间：

| ZSet | Vector Set |
| :--- | :--- |
| member 成员 | element 元素（同样是一个字符串名） |
| score 分数（一维，可排序） | 向量（几十到几千维，可比相似度） |
| ZADD 按分数入表 | VADD 建 HNSW 图 |
| ZRANGE 取排名区间 | VSIM 取最相似的 K 个 |

- 相似度默认按**余弦相似度**（越接近 1 越相似），底层索引是 HNSW——
  可以类比为「一座多层跳表式的高速公路网：高层是跨度大的快速路，
  底层连着每个元素的细密街道，查询从快速路一路下到街道」，从而把
  暴力两两比对 O(N) 降到近似 O(logN)。
- 与 ZSet 一样是**单键**数据结构，天然继承 RDB/AOF 持久化、主从复制
  与 Redis 的微秒级访问延迟；数据在内存中。

## 3. 快速上手：一次完整会话

以下示例可在 redis-cli（Redis 8+）中直接运行，`>` 后为命令，`#` 为返回或注释：

```bash
# 添加元素：VADD key VALUES <维度> <v1> ... <vn> <元素名>
> VADD points VALUES 2 1.0 1.0 pt:A
(integer) 1
> VADD points VALUES 2 0.9 0.9 pt:B
(integer) 1
> VADD points VALUES 2 0.1 0.9 pt:C
(integer) 1

# 重复添加同名元素会更新其向量，返回 0（未新增）
> VADD points VALUES 2 0.8 0.8 pt:A
(integer) 0

# 元素数与维度
> VCARD points
(integer) 3
> VDIM points
(integer) 2

# 按向量查最相似的 3 个（KNN）
> VSIM points VALUES 2 0.95 0.95 COUNT 3
1) "pt:A"
2) "pt:B"
3) "pt:C"

# 按已有元素查相似（ELE），带相似度分数
> VSIM points ELE pt:A WITHSCORES COUNT 3
1) "pt:A"
2) "1"
3) "pt:B"
4) "0.8535534143447876"
5) "pt:C"
6) "0.5"

# 取回某个元素的向量（注意：返回的是量化后的存储值）
> VEMB points pt:A
1) "0.9999999403953552"
2) "0.9999999403953552"

# 成员判断与随机取样
> VISMEMBER points pt:A          # 8.2 引入
(integer) 1
> VRANDMEMBER points 2
1) "pt:C"
2) "pt:B"

# 删除元素
> VREM points pt:C
(integer) 1
```

注意 VEMB 的返回值不等于你写入的 `1.0`——默认量化有轻微精度损失，
这是特性不是 bug（见第 5 节）。

## 4. 属性与条件过滤

每个元素可以挂一段 JSON 属性（类比 ZSet 成员旁再挂一张名片）：

```bash
# 两种写法：VADD 内联 SETATTR，或独立 VSETATTR
> VADD points VALUES 2 1.0 1.0 pt:A SETATTR '{"size":"large","price":18.99}'
(integer) 1
> VSETATTR points pt:B '{"size":"large","price":25.00}'
(integer) 1

# 读取属性；写入空字符串即删除
> VGETATTR points pt:A
"{\"size\":\"large\",\"price\":18.99}"

# 过滤检索：FILTER 接 JSON 路径表达式（注意 shell 里用单引号包住）
> VSIM points VALUES 2 1.0 1.0 FILTER '.size == "large"'
1) "pt:A"
2) "pt:B"

# 组合条件（&& 与 ||）
> VSIM points ELE pt:A FILTER '.size == "large" && .price > 20.00'
1) "pt:B"

# WITHATTRIBS：检索结果连同属性一起返回
> VSIM points ELE pt:A WITHATTRIBS COUNT 2
1) "pt:A"
2) "{\"size\":\"large\",\"price\":18.99}"
```

FILTER 在向量搜索的候选集上做**精确**判断，不满足条件的元素被剔除；
若过滤后剩余元素不足 COUNT，返回数就少于 COUNT（与部分数据库的
「预过滤后补位」不同，不要指望它自动放宽）。

## 5. 量化与调参：内存、速度、召回率的三角权衡

### 5.1 量化模式（首次 VADD 时确定，整键统一）

| 选项 | 含义 | 内存 | 召回率 |
| :--- | :--- | :--- | :--- |
| `Q8`（默认） | 有符号 int8 量化 | 约 float32 的 1/4 | 轻微下降，多数场景够用 |
| `BIN` | 二值量化（取符号位） | 最小，速度最快 | 明显下降，适合粗筛 |
| `NOQUANT` | 不量化，存 float32 | 最大 | 最准 |

```bash
> VADD pts2 VALUES 2 0.1 0.2 e1 NOQUANT    # 关键场景保留全精度
(integer) 1
> VADD pts3 VALUES 2 0.1 0.2 e1 BIN        # 亿级元素粗筛场景
(integer) 1
```

量化模式在**键的第一个 VADD** 时确定，之后同键元素必须一致。

### 5.2 图参数 M 与 EF

```bash
# M：每个节点的最大连接数（默认 16；第 0 层为 M*2）
> VADD points VALUES 8 0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 e1 M 32
(integer) 1

# EF 构建（默认 200）：建图找邻居的搜索力度，越大图质量越高、建越慢
> VADD points VALUES 8 0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 e2 EF 400
(integer) 1

# EF 检索：查询时的探索力度，越大越准越慢
> VSIM points ELE e1 EF 300 COUNT 10
```

经验法则：召回率不达标先调大检索 EF（零重建成本），还不够再调大
M/构建 EF（需要重建集合）。M=64 之类的大值仅用于极端精度要求，
内存代价见官方对 1024 字节/节点量级的估算。

### 5.3 降维与 FP32 二进制格式

```bash
# REDUCE：随机投影降维（如 1536 维压到 512 维），投影矩阵随键持久化
> VADD docs REDUCE 512 VALUES 1536 <1536个值> doc:1
(integer) 1
```

客户端 SDK 传 float32 二进制（FP32 blob）时必须使用**小端字节序**；
不确定平台字节序就用 `VALUES` 文本格式，可移植。

## 6. 其他命令

```bash
> VINFO points
# 返回量化类型、维度、元素数、HNSW 层数、最大节点层等信息

> VLINKS points pt:A
# 返回该元素在 HNSW 各层的邻居（调试图结构用）

> VRANGE points - + COUNT 10     # 8.4 引入：按元素名字典序返回
1) "pt:A"
2) "pt:B"
```

## 7. 应用场景与选型

### 7.1 典型场景

```bash
# 语义搜索：文档标题与正文嵌入入库，查询句嵌入后 VSIM
> VADD docs VALUES 1536 <embed("Redis 入门")> doc:1 SETATTR '{"title":"Redis 入门"}'
> VSIM docs VALUES 1536 <embed("怎么学 Redis")> COUNT 5 FILTER '.title != ""'

# 推荐系统：以用户最近交互的商品向量为锚点找相似商品
> VSIM products ELE product:8848 COUNT 10 FILTER '.stock > 0'
```

### 7.2 三种方案对比

| 维度 | Vector Set | 查询引擎向量检索（FT.*） | pgvector |
| :--- | :--- | :--- | :--- |
| 心智模型 | 单键结构，最像 ZSet | 二级索引，SQL 式混合查询 | 关系库扩展 |
| 混合条件过滤 | FILTER（JSON 属性） | 标签字段+向量联合索引，最强 | SQL WHERE |
| 延迟 | 微秒级 | 微秒~毫秒 | 毫秒级 |
| 容量 | 受内存限制 | 支持集群横向扩展 | 受磁盘限制 |
| 成熟度 | beta，API 可能变 | 较成熟 | 成熟 |
| 适用 | 实时推荐、轻量语义缓存 | 多条件复杂检索、十亿级 | 已有 PG、数据量大且容忍毫秒 |

类比失真提示：「Vector Set 像 ZSet」仅指使用方式与命令气质；ZSet 排序
是精确的，Vector Set 是近似最近邻，COUNT=10 不能保证是全局真正的 Top10。

## 8. 陷阱与调试

- **没有 VSEARCH/VSET/VGET/VDEL**：检索用 VSIM、删除用 VREM、取向量用
  VEMB。网上旧教程出现的 VSEARCH 一律是错的。
- **维度以首元素为准**：同键所有向量维度必须相同，VADD 维度不符直接报错。
- **VEMB 返回值「不对」**：那是量化后的存储值，不是 bug；需要精确值用
  NOQUANT 建键。
- **FILTER 语法**：JSON 路径以 `.` 开头，字符串比较要带双引号；
  CLI 中整个表达式建议用单引号包裹，避免 shell 吃掉引号。
- **beta 心态**：生产锁版本，关注 release notes；把重建集合（数据可从
  业务库重放）纳入预案。
- **内存先行估算**：元素数 x (维度 x 量化字节 + M x 2 x 8 字节指针)，
  上量前用 VINFO 验证。

## 9. 小结

- 初学者要点：VADD 入库、VSIM 查相似、VSETATTR 挂属性、VREM 删除；
  默认 Q8 量化 + 默认 M/EF 就能跑通大多数 demo。
- 进阶注意：量化与 M/EF 是「内存-速度-召回」三角；混合条件检索要评估
  查询引擎而非硬塞 FILTER；beta 状态意味着 API 变更风险与版本锁定策略。
- 下一步：《Redis 8 新特性》（redis/310-RedisNewFeatures8）了解查询引擎
  与 8.0 全景；《跳跃表与有序集合》（redis/270-SkipListAndSortedSet）
  对比 ZSet 的精确排序实现。
