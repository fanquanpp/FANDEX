---
order: 160
title: 缓存读写模式与数据库一致性
module: 'redis'
category: 数据库
difficulty: beginner
description: Cache-Aside、Read/Write-Through、Write-Behind 三种缓存读写模式；先更新库还是先删缓存的完整推导、延迟双删、基于键空间通知与 Stream 的失效订阅。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'redis/120-CachePenetrationBreakdownAvalanche'
  - 'redis/115-PubSubAndClientCaching'
  - 'redis/090-Stream'
prerequisites:
  - 'redis/010-OverviewCoreDataStructure'
---

## 知识点地图

- **知识类别**：缓存使用模式——缓存与数据库之间的读写分工与一致性维护（Cache-Aside / Read-Through / Write-Through / Write-Behind）。
- **解决什么问题**：引入缓存后数据有了两个副本，「写的时候缓存怎么办」没有标准答案却处处是坑：先写库还是先删缓存、删了之后脏读窗口多长、要不要延迟双删、能不能订阅失效广播。本文把这些选择一次讲透。
- **什么时候用到**：任何「Redis 在数据库前面挡读」的架构——商品详情页、用户资料页、配置表缓存。写多读少或强一致诉求（库存扣减）要警惕缓存根本不该上。

前置：缓存三大异常（redis/120-CachePenetrationBreakdownAvalanche，管「缓存没接住」的防护）与发布订阅（redis/115-PubSubAndClientCaching，失效广播的机制基础）。两篇分工：**120 讲异常防护，125 讲读写模式与一致性**。

## 1. 心智模型：缓存与数据库的四种分工

缓存读写模式回答一个问题：**读和写，谁来碰缓存、谁来碰数据库**。四种模式一张表看清：

| 模式 | 写路径 | 读路径 | 一致性责任方 | 适用 |
| :--- | :--- | :--- | :--- | :--- |
| Cache-Aside（旁路缓存） | 写库 + 删缓存，应用自己做 | 先查缓存，MISS 回源并回填 | 应用代码 | 绝大多数场景 |
| Read-Through | 同上或由缓存层代理 | 缓存层自己回源 | 缓存组件 | 有缓存中间件时 |
| Write-Through | 写缓存层，缓存层同步写库 | 同 Read-Through | 缓存组件 | 写后读强一致 |
| Write-Behind（回写） | 写缓存层即返回，异步批量写库 | 同 Read-Through | 缓存组件 + 可靠队列 | 写密集可容忍丢失 |

Read-Through 与 Cache-Aside 的区别只在「回源谁来做」：Cache-Aside 是应用代码里写 `if miss then query db then set`；Read-Through 把这段逻辑下沉到缓存组件（如 @nestjs/cache-manager 配 Redis 适配器后的缓存层）。语义等价，工程上选哪个取决于团队有没有现成的缓存中间件——绝大多数团队直接写 Cache-Aside，因为代码可见、失效时机可控。

Write-Behind 是另一回事：它拿「可能丢数据」换写性能，Redis 本身不提供可靠的 write-behind（没有内置的「缓存变更落库」保障），生产上要用它就得自己搭队列（如 Stream 消费组，redis/090）做异步落库——这是整套模式里唯一「默认不推荐」的，除非你能回答「异步落库失败三次怎么办」。

## 2. Cache-Aside 的读写细节

### 2.1 读路径（没有争议的标准姿势）

```python
import json, redis

r = redis.Redis(decode_responses=True)

def get_product(pid: int):
    key = f"product:{pid}"
    cached = r.get(key)
    if cached:
        return json.loads(cached)             # 1. 命中直接返回

    data = db.query_product(pid)              # 2. MISS 回源数据库
    if data:
        r.setex(key, 3600, json.dumps(data))  # 3. 回填缓存（带 TTL！）
    return data
```

三步里唯一容易被省掉的是第 3 步的 TTL：**所有回填必须带 TTL**。没有 TTL 的缓存只能靠主动删失效，一次删除逻辑的疏漏就是一条永久脏数据；TTL 是脏读窗口的上限保证（哪怕写路径全错，最多脏一个 TTL 周期）。TTL 加随机抖动防集体过期（redis/120 第 4 节）。

### 2.2 写路径：先更新库还是先删缓存（完整推导）

四种候选顺序，逐一推演并发场景（假设线程 A 写、线程 B 读）：

**候选一：先更新缓存，再更新库**。更新缓存成功、更新库失败——缓存里是数据库里不存在的值，且没有 TTL 语义补救（你写的值可能不带过期）。最差选项，直接排除。

**候选二：先更新库，再更新缓存**。两个写请求并发（A 先写库、B 后写库，但 B 先写缓存、A 后写缓存），最终缓存里是 A 的旧值、数据库里是 B 的新值——**写覆盖乱序**，脏到下次删除或过期。而且「更新缓存」把还没人读的数据也写进去了，浪费写路径。排除。

**候选三：先删缓存，再更新库**。删缓存后、更新库前，线程 B 读 MISS 回源读到**旧库值**并回填缓存——脏数据进了缓存，要等 TTL 过期。这是「先删后更」的原生缺陷，延迟双删（第 2.3 节）就是来补它的。

**候选四：先更新库，再删缓存（推荐）**。理论瑕疵只有一个：读请求 MISS 后回源拿到旧值，此时写请求完成更新库+删缓存，回填发生在删除**之后**——旧值进缓存。触发它需要同时满足「读时恰好 MISS」+「回源读比写库+删缓存还慢」，读库通常比写库快，概率极低；且 TTL 兜底把损失封顶。

结论表格：

| 顺序 | 并发缺陷 | 缺陷后果 | 结论 |
| :--- | :--- | :--- | :--- |
| 更新缓存再更库 | 写库失败留脏缓存 | 无 TTL 兜底难修复 | 排除 |
| 更库再更新缓存 | 写覆盖乱序 | 旧值覆盖新值 | 排除 |
| 删缓存再更库 | 回源读旧值回填 | 脏到 TTL 过期 | 弱于候选四 |
| **更库再删缓存** | 极低概率的回填竞态 | TTL 封顶 | **默认选它** |

「失效缓存」而不是「更新缓存」的理由再强调一遍：删除是幂等的（删几次都一样），更新不是；删除让下一次读自然回填最新值，更新则要求写路径维护「缓存值怎么算」的完整逻辑——列表缓存、聚合缓存这类「缓存值不是单行」的场景，更新根本写不出来。

### 2.3 延迟双删：给「先删后更」和偏执场景兜底

```python
def update_product(pid: int, payload: dict):
    r.delete(f"product:{pid}")               # 1. 先删缓存
    db.update_product(pid, payload)           # 2. 更新数据库
    time.sleep(0.5)                           # 3. 等待（异步更好）
    r.delete(f"product:{pid}")                # 4. 再删一次
```

第二删的原理：第一次删除后到更新库完成前，并发读可能把旧值回填进缓存；睡眠窗口（略大于一次读回源的耗时）过后再删一次，把可能回填的脏值清掉。工程化两点：

- sleep 阻塞写请求，生产用**异步延迟任务**做第二删（延迟队列、Stream 延迟消费，redis/090；或最简的 `SETNX + 过期 + 消费者`）；
- 窗口值拍脑袋定 0.5s~1s 起步，按你的读回源 P99 调。

什么时候值得上：用「先删缓存」语义（如初始化流程必须先清后写）、或主从库架构下读从库的回填窗口更长的场景。标准「先更库再删缓存」的读多写少场景，TTL 兜底就够了，双删是给高风险写路径的额外保险，不是默认配置。

### 2.4 删除失败怎么办：重试与订阅

「更库成功、删缓存失败」是候选四剩下的主要风险（Redis 闪断、网络抖动）。三级方案：

1. **同步重试 + 最终兜底**：删除失败记入本地重试队列，应用重启前再试；所有缓存都有 TTL，重试全失败时脏读也有上限；
2. **消息队列异步删**：删缓存动作发进队列（BullMQ/Kafka），消费失败自动重试——把「删除」变成至少一次的异步任务；
3. **订阅 binlog 派生失效**：数据库变更由 Canal/Debezium 之类捕获，下游统一删缓存——业务代码零侵入，代价是多一套 CDC 组件。

### 2.5 键空间通知与 Stream：Redis 侧的失效广播

Redis 自己也能在「键事件」发生时发通知（redis/115-PubSubAndClientCaching 是机制正篇，这里讲失效场景的用法）：

```bash
# 开启键过期事件通知（需服务端配置 notify-keyspace-events）
CONFIG SET notify-keyspace-events Ex

# 另一个进程订阅过期事件
SUBSCRIBE __keyevent@0__:expired
# 键 product:1001 过期时收到消息，可触发「预热刷新」等联动
```

适用面要摆正：键空间通知是**fire-and-forget**（发布订阅不落盘，订阅方掉线就错过），适合「尽力而为」的联动（过期预热、统计埋点）；不能当「变更必达」的失效总线用。需要可靠的事件流时用 Stream（redis/090）：写路径把「键已变更」XADD 进流，失效消费者用消费组保证不漏：

```bash
# 写路径：更库成功后发失效事件
XADD cache:invalidate * key "product:1001" action "del"
# 失效消费者（消费组，宕机恢复后从 last-delivered-id 继续）
XREADGROUP GROUP invalidators consumer-1 STREAMS cache:invalidate ">"
```

对比表：

| 机制 | 可靠性 | 适用 |
| :--- | :--- | :--- |
| keyspace notification | 尽力而为、不落盘 | 预热联动、监控埋点 |
| Stream 失效事件 | 消费组必达、可回溯 | 多实例缓存的一致失效 |
| CDC（binlog） | 最可靠、业务零侵入 | 多数据源写路径统一失效 |

## 3. 工程场景

### 3.1 场景一：商品详情页（读多写少的标准 Cache-Aside）

商品详情读 QPS 5 万、写 QPS 每分钟几十次。选型就是第 2 节的标准答案：读路径 Cache-Aside + TTL 1 小时 + 抖动；写路径「先更库再删缓存」，运营改价后调价接口顺手删 `product:{pid}`；跨实例的本地 L1 缓存（redis/120 第 4 节）变更时用 Stream 失效事件广播清 L1。**易错点**：详情页是聚合视图（商品 + 促销 + 库存），缓存键按「聚合结果」组织而不是按表——`product:{pid}:detail` 一次删除失效整个聚合，比按表拆三个键再拼装简单得多。

### 3.2 场景二：库存扣减——缓存该不该上的一致性判断

秒杀库存 1000 件，强一致诉求（不能超卖）。判断：库存的读写比不够「读多写少」（抢购期写密集）、且一致性要求是「错一次就是资损」——**这个场景缓存的正确用法不是缓存库存值，而是缓存「资格判定」**：

```bash
# 预扣资格：DECR 的返回值天然防超卖（负数即卖完），这是计数器不是缓存
DECR seckill:1001:stock          # 返回负数说明已售罄，回滚 +1 或直接拒绝

# 展示层缓存：剩余量展示允许 1 秒误差（软数据才缓存）
SETEX seckill:1001:view 1 "997"
```

「硬数据走原子命令，软数据才进缓存」是这类场景的分界线：库存的真实扣减用 DECR 原子性（redis/010 第 3.1 节）或 Lua（redis/240）保证，缓存只承载「大概还剩多少」的展示值。把库存值本身当缓存同步，就是在为「缓存与库的双写一致性」这个最难的问题自找麻烦。

### 3.3 场景三：配置表变更广播

风控规则、费率配置存在数据库，多个服务实例缓存了它，运营改配置后希望 30 秒内全网生效。方案：配置缓存 TTL 60s（保守兜底）+ Stream 失效事件（主动加速）：

```bash
# 配置变更接口：更库后发失效事件
XADD cache:invalidate * key "config:risk:rules" action "del"

# 各服务实例的消费组消费到事件后删除本地缓存
# 实例下次读取时回源新配置
```

配置类缓存的特殊性：写极少、读极多、生效延迟可容忍秒级——这是 Cache-Aside 最舒服的适用面，连双删都不需要（TTL 60s 就是生效延迟上界）。**易错点**：多级缓存（本地 L1 + Redis L2）时，Stream 事件必须两级都清——只删 Redis 不清本地，L1 的 60 秒旧配置还会被读；实例掉线期间错过的事件靠 L1 短 TTL 兜底，这正是「L1 TTL 要短」的原因（redis/120 第 4.3 节）。

## 4. 动手实践

**任务一**：并发复现「先删缓存再更库」的脏读窗口。起 Redis + 模拟慢数据库（sleep 0.3s 的查询函数），线程 A 走「删缓存 → 更库（sleep 0.3 模拟）」，期间线程 B 反复读；统计 B 读到旧值的次数。再换成「先更库再删缓存」重跑对比。

<details>
<summary>任务一参考观察</summary>

先删后更：B 在 A 删完缓存、更完库之前的每次读都是旧值，且回填动作让旧值在缓存里存活到 TTL；先更后删：只有「恰好 MISS 且回源比 A 的写+删还慢」的窄窗口会脏，常规读全程命中新值或旧值但很快被第二删纠正。自查：两种顺序的脏读窗口分别是多长？前者是「整个更新耗时」，后者是「回源与写+删的竞速差」——这就是推荐顺序的量化依据。
</details>

**任务二**：给任务一的写路径加延迟双删（异步版：用线程池延迟 1 秒执行第二次删除），重跑并发测试，统计先删后更方案的脏读次数是否归零；把延迟窗口调到 0.05s 再跑，观察窗口太小为什么抓不住回填。

<details>
<summary>任务二参考观察</summary>

1 秒窗口（大于回源耗时 0.3s）时第二删能把回填的脏值清掉，脏读归零；0.05s 窗口在 B 回源完成前就执行了第二删，回填发生在其后，脏值重新存活。结论：双删窗口必须**大于最慢一次读回源耗时**，拍太小等于没删——这是双删落地最常见的翻车点。
</details>

**任务三**：用 Stream 搭一个多实例失效广播的最小原型：两个「缓存实例」（两个 Python 进程各自持有一份内存字典缓存），变更方 XADD 失效事件，两个实例用同一消费组的两个 consumer 消费并各自清缓存。验证：改一次配置，两个实例的缓存都在下次读时回源新值；关掉一个实例 10 秒再启动，验证消费组从 last-delivered-id 续传不丢事件。

<details>
<summary>任务三参考设计</summary>

XGROUP CREATE cache:invalidate invalidators $ MKSTREAM 建组；两实例 XREADGROUP GROUP invalidators c1/c2 BLOCK 5000 STREAMS cache:invalidate ">"。掉线实例重启后续传靠消费组的 pending 列表：XACK 只在处理成功后调用，掉线期间分配给它的消息仍在其 PEL 里，重启后用 "0" 起始 ID 先认领 pending 再读新消息。自查：为什么这里不用 Pub/Sub？（redis/115——订阅方掉线期间的消息永久丢失，消费组的 PEL 才是必达语义。）
</details>

## 5. 下一步与延伸阅读

- 《缓存穿透击穿雪崩》（redis/120-CachePenetrationBreakdownAvalanche）：缓存「没接住」的三类异常防护，与本文「没对齐」的一致性维护互补；
- 《发布订阅与客户端缓存》（redis/115-PubSubAndClientCaching）：键空间通知与客户端缓存的机制正篇；
- 《Stream 入门》（redis/090-Stream）与《Stream 消费组》（redis/092-StreamConsumerGroups）：可靠失效事件流的载体；
- 《Lua 脚本原子执行》（redis/240-LuaScriptAtomicExecution）：库存这类「判定 + 扣减」原子诉求的进阶实现。

## 参考与致谢

- Redis 官方文档 Keyspace notifications：<https://redis.io/docs/latest/develop/use/keyspace-notifications/>（CC-BY-SA 4.0）；
- Redis 官方文档 Streams：<https://redis.io/docs/latest/develop/data-types/streams-tutorial/>（CC-BY-SA 4.0）；
- Cache-Aside/Through 模式的定义沿用业界通行表述（Martin Fowler《Patterns of Enterprise Application Architecture》中的 Cache-Aside 条目），正文推演与代码均为教学重写。
