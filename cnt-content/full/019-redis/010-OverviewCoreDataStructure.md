---
order: 10
title: 概述与核心数据结构
module: 'redis'
category: 数据库
difficulty: beginner
description: Redis 8 上手第一课：从报名工具的真实需求认识五种核心结构（String/Hash/List/Set/ZSet），动手跑通、理解内存键值模型的取舍，并给出全模块学习路径。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'redis/020-KeyManagement'
  - 'redis/030-HashCommand'
  - 'redis/040-ListTypeAndCommands'
  - 'redis/042-SetTypeAndSetOperations'
  - 'redis/150-RDBSnapshotPersistence'
  - 'redis/160-AOFLogPersistence'
prerequisites: []
---

## 知识点地图

- **知识类别**：入门与总览——Redis 的内存键值模型、五种核心数据结构（String/Hash/List/Set/ZSet）、性能来源与全模块导航。
- **解决什么问题**：第一次接触 Redis 时「它是什么、为什么快、我该用哪种结构」三个问题；建立「访问模式决定结构选型」的心智模型。
- **什么时候用到**：学 Redis 的第一篇；给新业务选结构前的速查（第 5 节选型表）；向别人解释 Redis 时的一页纸大纲。

## 1. 从一个周末球局工具开始

假设你要给公司同事做一个「周末球局报名」小工具，需求很朴素：

| 需求                                   | 直觉做法（关系库思维）   | Redis 的做法            |
| :------------------------------------- | :----------------------- | :---------------------- |
| 记一个人报名信息（姓名/电话/备注）     | users 表插一行           | Hash：一个键一个对象    |
| 报名顺序列表，先报先得                 | 自增 id 排序查询         | List：LPUSH 进队        |
| 「张三报过名没有」的高频判断           | SELECT ... WHERE         | Set：SISMEMBER O(1)     |
| 积分榜，随时查前 10 名                 | ORDER BY score LIMIT 10  | ZSet：ZRANGE 毫秒级     |
| 报名成功计数器（防超员）               | UPDATE counter 行锁      | String：INCR 原子自增   |

这张表就是 Redis 的世界观：**不是「存数据进表」，而是「把每个访问模式
映射到一种现成的内存结构」**。结构选对了，你的代码里就没有锁、没有
LIMIT、没有 JOIN——一条命令完成一次高频操作。

本文目标：把这张表里的五种结构逐一跑通，理解为什么 Redis 能做到微秒级，
最后给你一张全模块的导航图。

> 选型前先了解版本与许可现状（信息截至 2026-09，最新版本以 redis.io/downloads 为准）。

- 版本：Redis 8.0 于 2025-05 GA，此后 8.x 快速迭代（8.2、8.4、8.8 等均已发布）。8.0 引入了巨大的性能与功能跃迁，是当前升级的首选目标。
- 许可：8.0 起为 RSALv2 / SSPLv1 / AGPLv3 三许可可选（AGPLv3 为 2025-05 新增的 OSI 开源许可选项）；7.4 及之前仅有 RSALv2/SSPLv1（源可用许可），2024-03 的许可收紧催生了 Valkey 分叉（Linux Foundation 托管的 BSD 开源项目，API 兼容 Redis，一句了解即可，本文不展开）。
- 形态：Redis 8 起，原 Redis Stack 的能力（JSON、时间序列、概率结构、查询引擎等）已并入 Redis Open Source 内核，Redis Stack 独立发行版停止更新（官方于 2025-09-15 停止 6.2/7.2/7.4 版本补丁），新项目直接用 Redis 8+。
- 配套工具：Redis Insight 图形化客户端、redis-cli 命令行。

## 2. 动手：十分钟搭好环境

```bash
# 用 Docker 起 Redis 8（生产请加密码与持久化配置，这里先跑通）
docker run -d --name redis8 -p 6379:6379 redis:8

# 进入命令行
docker exec -it redis8 redis-cli
127.0.0.1:6379> PING
PONG                          # 连通性确认
```

不装 Docker 也可以去 redis.io 下载安装包，或直接用 Redis Insight
（图形界面自带教程终端）。后文所有命令都可以照着敲，`>` 后是输入，
`#` 后是返回或解释。

## 3. 五种结构逐个跑通

### 3.1 String：不只是字符串，还是计数器

```bash
# 存取
SET player:1001:name "张三"
GET player:1001:name            # "张三"

# 原子计数：场地容量 20 人，每报名一次 +1
SET court:seats 0
INCR court:seats                # 1
INCR court:seats                # 2
INCRBY court:seats 3            # 5
```

为什么不用「GET 出来加 1 再 SET 回去」？两个请求同时 GET 会拿到同一个
旧值，互相覆盖（丢失更新）。INCR 是单条命令，Redis 保证原子执行，
天然并发安全——这是你第一次尝到「命令级原子性」的甜头。

String 的底层是 Redis 自己实现的 SDS（简单动态字符串），O(1) 取长度、
二进制安全，细节见《字符串 SDS 结构》（redis/260-StringSDSStructure）。

### 3.2 Hash：一个键存一个对象

```bash
# 报名信息：键是对象名，字段是属性
HSET player:1001 name "张三" phone "13800000000" level "B"
HGET player:1001 name               # "张三"
HINCRBY player:1001 games 1         # 参与场次 +1（字段级原子自增）
HGETALL player:1001                 # 取回全部字段
```

对比 String 存 JSON：改一个字段要「取回-反序列化-改-序列化-写回」，
并发下会互相覆盖；Hash 让你只动一个字段。什么时候仍然用 String 存
JSON？对象总是整存整取、没有字段级并发修改时，JSON 反而更省事。

### 3.3 List：有序、可重复、两端进出

```bash
# 报名顺序：先到先排
LPUSH signup:order "player:1003"
LPUSH signup:order "player:1001" "player:1002"
LRANGE signup:order 0 2             # 看前 3 个报名者
LLEN signup:order                   # 3

# 候补队列消费：右端出队
RPOP signup:order                   # "player:1003"（最早报名的先出）
```

List 一体两面：当队列（LPUSH+RPOP / BRPOP 阻塞版）、当栈（同端进出）、
当定长时间线（LPUSH+LTRIM 只留最新 N 条）。命令全集与队列/栈套路见
《List 类型与常用命令》（redis/040-ListTypeAndCommands）。

### 3.4 Set：无序去重 + O(1) 成员判断

```bash
SADD signup:set "player:1001" "player:1002"
SADD signup:set "player:1001"       # 返回 0：已经报过名，自动去重
SISMEMBER signup:set "player:1001"  # 1：高频判断不查全量
SCARD signup:set                    # 报名人数
SADD court:b "player:1002" "player:1005"
SINTER signup:set court:b           # 两场都报的人（交集）
```

「重复报名」这类业务规则，用 Set 的去重返回值一行代码就挡住了。交集、
并集、差集还能回答「共同关注」「推荐好友」类问题，命令全集见
《Set 集合类型与集合运算》（redis/042-SetTypeAndSetOperations）。

### 3.5 ZSet：带分数的排行榜

```bash
ZADD ranking 1800 "player:1001" 1650 "player:1002" 1900 "player:1003"
ZREVRANGE ranking 0 2 WITHSCORES    # 前 3 名（按分数降序）
ZREVRANK ranking "player:1001"      # 1：第 2 名（从 0 数）
ZINCRBY ranking 50 "player:1001"    # 打完一局加分，排名实时变化
ZRANGEBYSCORE ranking (1800 +inf    # 分数严格高于 1800 的成员
```

ZSet 是 Redis 的招牌结构：插入、更新、按名次取区间都是 O(logN)，
「排行榜」「延时队列」「滑动窗口限流」都靠它。底层是跳表 + 哈希表的
组合，为什么两个结构都要，见《跳表与有序集合》（redis/270-SkipListAndSortedSet）。

## 4. 为什么快：内存 + 单线程事件循环

理解两条设计前提，后面的很多「怪脾气」都能解释通：

1. **数据在内存**。磁盘数据库的毫秒级延迟主要是寻道与页缓存开销；
   内存访问比它快几个数量级，Redis 把「全部数据放内存」作为前提，
   持久化只做兜底（见 150/160 篇）。
2. **命令执行单线程**。所有命令排队进入一个事件循环顺序执行，单条
   命令天然原子，没有锁竞争。代价是：**任何慢命令都会拖住所有请求**——
   这解释了为什么 KEYS、大集合 SMEMBERS、超大 offset 的 SETBIT 是
   生产事故高发区（见第 6 节）。

Redis 8 时代这两条依然成立，只是外延扩展了：网络 I/O 可以多线程
（io-threads），命令执行仍是单线程；8.0 对 I/O 线程实现做了重写，
多核机器上吞吐提升明显。完整清单见《Redis 8 新特性》（redis/310-RedisNewFeatures8）。

五种结构之外，Redis 8 还有更多「专用结构」：位图（签到/活跃）、
HyperLogLog（UV 估算）、GEO（附近的人）、Stream（消息队列）、
Vector Set（8.0 新增的向量相似检索）。它们的使用方式都在本文五种
基础的延长线上，遇到对应需求再去翻对应篇目即可。

## 5. 结构选型速查

| 你要做什么                        | 用什么  | 深入阅读                       |
| :-------------------------------- | :------ | :----------------------------- |
| 计数、限流、分布式锁的凭证        | String  | redis/260（底层）、redis/250   |
| 对象的字段级读写                  | Hash    | redis/030-HashCommand          |
| 队列、栈、最新动态                | List    | redis/040-ListTypeAndCommands  |
| 去重、成员判断、交并差            | Set     | redis/042-SetTypeAndSetOperations |
| 排行榜、延时任务                  | ZSet    | redis/270-SkipListAndSortedSet |
| 签到、日活、布尔矩阵              | Bitmap  | redis/060-BitMapRedis          |
| 亿级去重计数（允许 0.81% 误差）   | HLL     | redis/050-NumberStats          |
| 附近的人、门店搜索                | GEO     | redis/070-GeoSpatial           |
| 可靠消息流、事件溯源              | Stream  | redis/090-Stream               |
| 语义搜索、推荐召回（AI 场景）     | Vector Set | redis/100-VectorSet         |

## 6. 坑点与自检

新手前三周最容易踩的五个坑，每条都来自真实事故：

1. **KEYS 上生产**。`KEYS *` 全库扫描，百万键直接卡死所有请求。
   自检：代码里搜 KEYS，生产只允许 SCAN（见 redis/020-KeyManagement）。
2. **把雪花 ID 当 SETBIT 的 offset**。位图内存由最大 offset 决定，
   `SETBIT k 4000000000 1` 一条命令申请约 500MB。自检：offset 必须
   是稠密的小整数编号。
3. **HGETALL/SMEMBERS/LRANGE 0 -1 不看体量**。全是 O(N) 命令，
   百万级成员一次拉全量就是一次人为卡顿。自检：任何全量读先 LLEN/HLEN/SCARD。
4. **以为「设置了过期就一定按时消失」**。过期删除是惰性+定期抽样的
   组合，不是定时器；也别把它和「内存满了淘汰」混为一谈。
   自检：能说清过期（expiry）与淘汰（eviction）的区别（redis/020、redis/130）。
5. **在单线程面前跑长命令**。Lua 脚本里写百万次循环、删除百万成员的
   大键用 DEL 而不是 UNLINK，都会造成秒级不可用。自检：所有批量操作
   都有分批与超时预估。

## 7. 练习

1. 用 docker 起 Redis 8，把第 3 节五种结构的命令全部敲一遍，每一组
   记录「命令-返回值」，与本文对照。任何一个返回值对不上，先怀疑
   参数顺序。
2. 给球局工具补一个「防超员」逻辑：只用 INCR 与一个上限值 20，思考
   并发下会不会超？如果需要「满了不再增加」，INCR 返回值怎么用？
   （提示：INCR 返回自增后的值，超过 20 就 DECR 回去，或直接读返回值判断。）
3. 把 3.2 节的报名对象改成「String 存 JSON」，再体验一次改 level 字段
   的完整流程，对比 Hash 的差异，写两句话结论进你的笔记。

## 8. 下一步

本模块建议按这条主线推进：

- 数据结构与命令：020 Key 管理 → 030 Hash → 040 List → 042 Set →
  050 计数 → 060 位图 → 070 GEO → 090-094 Stream → 100 Vector Set；
- 生产三板斧：115 发布订阅 → 120 缓存三大问题 → 125 缓存读写模式 →
  130 内存淘汰；
- 持久化与高可用：150/160/170 持久化 → 185-220 代理/复制/哨兵/集群；
- 进阶：230-250 事务/Lua/Functions/分布式锁，260-280 底层结构与模块，
  305-320 协议/版本/安全/可观测，310 Redis 8 全景。

学完本篇你应该能回答：五种结构分别解决什么访问模式、Redis 为什么快、
慢命令为什么会拖垮整个实例。带着这三个答案进入下一篇《Key 管理与过期策略》。
