---
order: 60
title: Set 集合类型与集合运算
module: 'redis'
category: 数据库
difficulty: beginner
description: Redis Set：去重存储与 O(1) 成员判断、SINTER/SUNION/SDIFF 集合运算、SRANDMEMBER/SPOP 随机抽取，intset/listpack/hashtable 内部编码与转换阈值。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'redis/040-ListTypeAndCommands'
  - 'redis/050-NumberStats'
  - 'redis/010-OverviewCoreDataStructure'
prerequisites:
  - 'redis/010-OverviewCoreDataStructure'
---

## 知识点地图

- **知识类别**：核心数据类型——Set（无序集合）：去重、成员判断、集合运算、随机抽取。
- **解决什么问题**：「这批元素有没有重复的」「这个元素在不在里面」「两组元素有什么共同/不同」这三类问题，用哈希表或整数集合在 O(1)/O(N) 内回答，不需要应用层自己维护去重逻辑。
- **什么时候用到**：标签系统、共同关注/推荐好友、抽奖、UV 精确去重、权限去重存储——凡是「元素唯一性本身是数据的一部分」的场景。

前置：五种核心结构的定位（redis/010-OverviewCoreDataStructure）；Set 与 List 的取舍在 040 篇的第 3 节已有对比，本篇展开 Set 自己的命令面与内部实现。

## 1. 心智模型：数学课的集合，带 O(1) 查询

Set 就是数学意义上的集合：**无序、不重复**。Redis 的特别之处是把「判断一个元素在不在」做成了 O(1)（底层是哈希表），所以很多在应用层需要「查一遍列表」的逻辑，在 Redis 里变成一条命令。

三句话建立与相邻类型的边界：

- 对比 **List**（redis/040）：List 有序可重复，Set 无序去重——「报名顺序」用 List，「报名人名册」用 Set；
- 对比 **ZSet**（redis/270）：ZSet 是「带分数的 Set」，需要排序才上 ZSet，不需要分数就别为它付跳表的内存；
- 对比 **Hash**：Hash 是字段到值的映射，Set 只有「成员存在性」一个语义——Set 可以理解为「只有 key 没有 value 的 Hash」。

## 2. 基础命令面

### 2.1 增删查与计数

```bash
# 添加成员：返回实际新增的个数（重复的自动忽略）
SADD article:1001:tags "redis" "database" "redis" "backend"
# (integer) 3   ← "redis" 第二次添加被去重

# 判断成员：O(1)，这是 Set 最高频的价值命令
SISMEMBER article:1001:tags "redis"     # 1
SISMEMBER article:1001:tags "rust"      # 0

# 成员个数
SCARD article:1001:tags                 # 3

# 删除指定成员（不存在的不报错，返回 0）
SREM article:1001:tags "database"       # 1

# 取全部成员（大集合慎用，O(N)）
SMEMBERS article:1001:tags

# 随机查看成员（不删除）
SRANDMEMBER article:1001:tags 2         # 随机返回 2 个，可能重复

# 弹出成员（删除性）
SPOP article:1001:tags                  # 随机弹出 1 个并移除
```

逐项讲解易错点：

- `SADD` 的返回值是「新增了几个」而不是「现在有几个」——它天然告诉你这次写入是否触发了去重，业务上「重复报名检测」就靠这个返回值；
- `SMEMBERS` 是 O(N) 全量读，百万成员的集合一次拉回就是一次人为卡顿（redis/010 第 6 节坑点 3），大集合枚举用 `SSCAN` 游标分批；
- `SRANDMEMBER key n` 的 n 为正数返回「最多 n 个不重复成员」，n 为负数返回「恰好 |n| 个、可能重复」——语义不同，抽奖场景想要「可重复抽取」要用负数形式；
- `SPOP` 是删除性的，抽奖后把中奖者移出奖池靠它；只看不删用 `SRANDMEMBER`。

### 2.2 Set 的存在性检查还有批量版

```bash
# Redis 6.2+：一次判断多个成员，返回 0/1 数组
SMISMEMBER article:1001:tags "redis" "rust"    # 1) 1  2) 0

# 迁移成员：从源集合移除并加入目标集合（原子）
SMOVE article:1001:tags article:1002:tags "redis"
```

`SMISMEMBER` 的价值在一次网络往返判断 N 个成员（配合 Pipeline 前的时代它是唯一批量姿势）；`SMOVE` 的原子性保证了「取出 + 放入」不会因进程崩溃停在中间态——任务从「待办池」挪到「进行中池」就是标准用法。

## 3. 集合运算：SINTER/SUNION/SDIFF

### 3.1 三种运算与两种执行模式

```bash
SADD user:1001:follow "u2" "u3" "u4"
SADD user:1002:follow "u3" "u4" "u5"

# 交集：共同关注
SINTER user:1001:follow user:1002:follow        # u3 u4

# 并集：关注总池
SUNION user:1001:follow user:1002:follow        # u2 u3 u4 u5

# 差集：1001 关注了而 1002 没关注（方向性！）
SDIFF user:1001:follow user:1002:follow         # u2
SDIFF user:1002:follow user:1001:follow         # u5

# 运算结果存入新键（结果集可以直接再参与运算）
SINTERSTORE common:1001:1002 user:1001:follow user:1002:follow
```

`SINTER` 与 `SINTERSTORE` 的分工：前者算完直接返回（读请求）；后者把结果落成键（结果要复用、要过期、要再参与二次运算时）。结果集化是共同关注这类高频查询的标准优化——算一次存起来加 TTL，而不是每次访问都现算。

### 3.2 差集的方向陷阱

`SDIFF` 的语义是「第一个集合有、其余集合没有」——参数顺序就是语义，写反了返回的是完全不同的答案。这是 Set 运算里最常见的 bug 来源。三集合场景再确认一次：

```bash
# "关注了 A 和 B、但没关注 C 的用户" 类需求
SDIFF SINTER u:A u:B u:C
```

写成 `SINTER u:A u:B u:C` 得到的是「三个都关注的」，逻辑完全不同——**先想清楚要用交集还是差集，再核对参数方向**。

### 3.3 运算复杂度与阻塞风险

| 运算 | 复杂度 | 风险点 |
| :--- | :--- | :--- |
| SINTER | O(N×M)，N 是最小集合 | 大集合交集会阻塞单线程 |
| SUNION | O(N) 全量合并 | 结果集巨大时传输慢 |
| SDIFF | O(N) 遍历第一个集合 | 参数顺序陷阱 |

Redis 的命令执行是单线程（redis/010 第 4 节），千万成员的 `SINTER` 跑一次，全实例停顿百毫秒级。防护套路：大集合的运算结果用 `*STORE` 版本落键 + TTL 缓存（可用 `redis/120` 的随机 TTL 防雪崩），或改到从库执行只读运算。

## 4. 内部编码：intset、listpack 与 hashtable

### 4.1 三种编码与转换阈值

```bash
# 小整数集合用 intset（紧凑整数数组）
SADD small:set 1 2 3
OBJECT ENCODING small:set        # "intset"

# 混入字符串或超过阈值，转 hashtable
SADD small:set "apple"
OBJECT ENCODING small:set        # "hashtable"
```

三种编码的触发条件（以 redis.conf 默认值为准）：

| 编码 | 条件 | 配置项 |
| :--- | :--- | :--- |
| intset | 全部成员是整数且个数 ≤ 512 | `set-max-intset-entries 512` |
| listpack | 元素数 ≤ 128 且单个值长度 ≤ 64 字节（Redis 7.2+） | `set-max-listpack-entries 128` / `set-max-listpack-value 64` |
| hashtable | 其余情况 | — |

（Redis 7.2 起新增 listpack 编码承接「小而杂」的集合；7.2 之前小集合只有整数走 intset、其余直接 hashtable。以你的服务端版本文档为准。）

### 4.2 转换是单向的，且是性能悬崖

intset/listpack 省内存的代价是 O(N) 查找——正因为元素少才付得起；一旦超过阈值转成 hashtable，查找回到 O(1)，但**不会转回去**。三个推论：

1. 元素在阈值附近反复增删不会引起编码震荡（转了就稳在 hashtable），这是单向设计的善意；
2. 「明明都是整数却显示 hashtable」通常是有个成员混进了字符串（比如序列化框架把整数写成了字符串）——编码检查（`OBJECT ENCODING`）是定位内存异常的第一步；
3. 批量灌数时先加小整数后加字符串，会让集合中途转换一次——无所谓对错，但压测数据的编码状态要与生产一致，否则内存与延迟数据都对不上。

### 4.3 编码差异对命令复杂度的影响

| 命令 | intset/listpack | hashtable |
| :--- | :--- | :--- |
| SISMEMBER | O(N) 线性扫 | O(1) |
| SCARD | O(1)（记长度） | O(1) |
| SRANDMEMBER | O(N) | O(1) 概率抽样 |

小集合的 O(N) 不是问题（N ≤ 512），这正是「小编码换大集合」的划算之处；要警惕的反而是「以为集合小、实际悄悄涨过阈值」的集合——监控上关注 `object encoding` 的分布变化比关注绝对值更早发现问题。

## 5. 工程场景

### 5.1 场景一：文章标签与共同关注

内容社区的每篇文章挂标签，用户的关注关系用两个 Set 维护：

```bash
# 文章标签：一篇多标签，标签天然去重
SADD article:1001:tags "redis" "database"

# 用户关注：follow 是我关注的、fans 是关注我的
SADD user:1001:follow "u7" "u8"
SADD user:1001:fans "u9"

# 共同关注：我和他关注的交集（个人主页「共同关注」模块）
# STORE 系列不支持 EX 参数，过期用 EXPIRE 单独设置
SINTERSTORE common:{me}:{him} user:1001:follow user:1002:follow
EXPIRE common:{me}:{him} 600

# 可能认识：他的关注减去我的关注（差集推荐）
SDIFF user:him:follow user:me:follow
```

逐段讲解：共同关注用 `SINTERSTORE` + `EXPIRE` 落结果集（600 秒缓存，命中前不需要重算交集）；键里的 `{me}:{him}` 是集群 Hash Tag（redis/220），保证同一对用户的结果集与源集合落同一槽位，跨槽运算在集群模式不可用——这是集群上用集合运算的**前置设计**，键设计错了运算直接报 `CROSSSLOT` 错。

### 5.2 场景二：抽奖去重与奖池管理

运营抽奖：10 万参与用户去重，分三轮抽 1 名一等奖（移出奖池）、10 名二等奖（可与他人重复的场景另说）：

```bash
# 报名期：SADD 返回值天然去重，SCARD 实时看报名人数
SADD lottery:2026:pool "u1001" "u1002"     # 第二次 SADD 同一人返回 0
SCARD lottery:2026:pool                     # 参与人数

# 开奖：SPOP 弹出即移除，天然防止重复中奖
SPOP lottery:2026:pool 1                    # 一等奖，此人已出池
SRANDMEMBER lottery:2026:pool -10           # 二等奖允许重复时的写法
```

`SPOP` 与 `SRANDMEMBER` 的选择就是抽奖规则本身：不放回抽样用 SPOP（一人只能中一次），放回抽样用负数 SRANDMEMBER。**易错点**：公平性依赖奖池成员的均匀性——如果报名入口按「邀请链接」批量灌入同一批 ID，Set 只去重不审计，防刷要靠上游限流（redis/120 第 5 节）。

### 5.3 场景三：UV 精确去重与 HyperLogLog 的选型

需求：统计每日独立访客。两条路线：

```bash
# 路线 A：Set 精确去重（可回溯「某用户来过没有」）
SADD uv:20261007 "user:1001"
SCARD uv:20261007                           # 精确 UV

# 路线 B：HyperLogLog 估算（固定 ~12KB，误差 0.81%）
PFADD uv:hll:20261007 "user:1001"
PFCOUNT uv:hll:20261007
```

选型判断表：

| 你的需求 | 选 Set | 选 HyperLogLog |
| :--- | :--- | :--- |
| 只看人数 | 可用但内存随 UV 线性涨 | 首选，常数内存 |
| 要回答「某用户来过吗」 | 首选（SISMEMBER） | 不可能，HLL 无成员语义 |
| 千万级 UV | 内存吃紧（数 GB） | 12KB 搞定 |
| 跨天合并 | SUNION 大集合运算 | PFMERGE 毫秒级 |

百万 UV 的页面用 Set 存每日去重就是内存事故（redis/050-NumberStats 详述 HLL 原理）；但「会员当日是否已领券」必须用 Set——两种结构回答的是不同的问题，**先问「要不要回查成员」，再定结构**。

### 5.4 场景四：权限与白名单的去重存储

API 网关把每个接口的调用方白名单放 Set：`SADD api:quota:premium "svc:a" "svc:b"`，请求进来 `SISMEMBER` 一发判定 O(1)。相比在应用内存里维护 Set：多实例不用同步白名单变更（改 Redis 一处全实例生效）；相比关系库：判定路径少一次 DB 查询。变更审计用 `SMEMBERS` 导出对比，键加 `EXPIRE` 让白名单有「默认过期、需续期」的安全属性。

## 6. 动手实践

**任务一**：用 SADD 的返回值实现「重复报名检测」。写一段伪代码或直接在 redis-cli 里：模拟 3 个用户报名，其中 1 人报两次，打印每次 SADD 的返回值与最终 SCARD，回答「怎么在应用层知道第二个人重复报了名」。

<details>
<summary>任务一参考观察</summary>

三次 SADD 返回 1、1、0——返回 0 的那次就是重复报名。应用层拿到返回值 0 即可走「已报名」分支，无需先 SISMEMBER 再 SADD 两步（那会有并发窗口：两个请求同时 SISMEMBER 都返回 0，然后都 SADD——虽然 Set 最终仍去重，但业务上会产生两条「报名成功」响应）。结论：**先写后判**（SADD 看返回值）在并发下才是安全的，**先判后写**有竞态。
</details>

**任务二**：亲手触发编码转换。建一个集合灌入 100 个整数，`OBJECT ENCODING` 查看；继续灌到超过 `CONFIG GET set-max-intset-entries` 的阈值，再查编码；最后 `MEMORY USAGE` 对比 intset 阶段与 hashtable 阶段的内存差，记录倍数。

<details>
<summary>任务二参考观察</summary>

intset 阶段显示 "intset"，超阈值后显示 "hashtable"；100 个小整数的 intset 约几百字节，转 hashtable 后涨到数 KB（哈希表预分配 + 每成员的对象头），典型差距 5~10 倍。这解释了为什么编码阈值参数值得调优：你的成员是不是全整数、会不会长期停在小编码，直接决定这类键的内存账单。
</details>

**任务三**：给 5.3 节的 UV 场景写决策备忘。假设你要给公司博客统计「每日 UV + 每篇文章 UV + 某读者读过哪些文章」三个指标，逐个判断用 Set 还是 HLL，写出键名与对应命令，标注哪个指标组合会随数据量产生内存压力。

<details>
<summary>任务三参考设计</summary>

每日全站 UV：HLL（`PFADD uv:site:20261007`），量级大且只看数；每篇文章 UV：HLL（`PFADD uv:article:1001`，PFCOUNT 支持多键合并看全站去重）；读者读过哪些文章：Set（`SADD reader:1001:read a1001`），要回查成员且单读者阅读量有限（内存可控）。压力点在第三项乘以读者数——读者千万级时该 Set 集群要按 Hash Tag 或拆键控制单键大小，或改用「只保留 90 天」的过期策略控制总量。
</details>

## 7. 下一步与延伸阅读

- 《List 与常用命令》（redis/040-ListTypeAndCommands）：Set 的有序孪生兄弟，队列与时间线场景；
- 《计数统计与 HyperLogLog》（redis/050-NumberStats）：允许误差的 UV 场景正解，与 5.3 节选型表互为补充；
- 《跳表与有序集合》（redis/270-SkipListAndSortedSet）：需要按分数排序时把 Set 升级成 ZSet；
- 《缓存穿透击穿雪崩》（redis/120-CachePenetrationBreakdownAvalanche）：Set 结果集缓存的 TTL 抖动防护。

## 参考与致谢

- Redis 官方文档 Set 数据类型：<https://redis.io/docs/latest/develop/data-types/sets/>（CC-BY-SA 4.0），命令语义与编码说明；
- 本篇为按官方文档主题重建的教学文档；040 号文件曾指向的《Set 集合类型与集合运算》由本文恢复，related 引用随之复链。
