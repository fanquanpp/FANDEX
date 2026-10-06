---
order: 140
title: 发布订阅与客户端缓存
module: 'redis'
category: 数据库
difficulty: beginner
description: Pub/Sub 与 Sharded Pub/Sub 的消息模型、键空间通知、RESP3 push 消息与 CLIENT TRACKING 客户端缓存，附配置热更新、订单推送、本地缓存失效三个工程场景。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Redis 的两类「主动推送」机制——发布订阅（Pub/Sub，含 Redis 7 的 Sharded Pub/Sub）与客户端缓存（Client-side Caching），外加配合键空间通知的命令子集。
- **解决什么问题**：让「数据变了」这件事从轮询变成推送；让多个进程/服务实例之间不用引一个独立消息中间件就能低延迟广播事件；让应用侧本地缓存不用自己搭失效协议就能跟随 Redis 数据变化。
- **什么时候用到**：配置热更新广播、订单/状态变更实时通知、缓存失效联动；反过来，需要「离线可达、可回溯、可确认」的消息投递时不要用 Pub/Sub，那是 Stream（redis/090-Stream）的领地。

前置：会使用 redis-cli 基础命令（redis/010-OverviewCoreDataStructure）；了解 Stream 的存在即可，不需要先读完 Stream 三部曲。

## 1. 心智模型：Pub/Sub 是「广播喇叭」不是「信箱」

一句话模型：**发布者对着频道喊话，订阅者竖着耳朵听，Redis 不留底稿**。

- 频道（channel）只是一个名字，不需要预先创建；
- 没有订阅者时消息直接丢弃，没有订阅者「上线后补收」这回事；
- Redis 既不持久化消息，也不维护「谁收到了没有」的回执。

这就是它与 Stream 的本质区别：

| 维度     | Pub/Sub            | Stream                          |
| :------- | :----------------- | :------------------------------ |
| 离线消费者 | 收不到（消息已丢） | Consumer Group 会保留待消费条目 |
| 送达保证 | 无（fire-and-forget） | 可 ACK、可 Pending 重投         |
| 回溯     | 不能               | 按 ID 范围回溯历史              |
| 延迟     | 微秒级，最低       | 毫秒级，依然很低                |
| 适用     | 实时通知、广播、联动失效 | 任务队列、事件溯源、可靠投递 |

为什么这个模型反而快？因为 Redis 收到 `PUBLISH` 后只做「查订阅表、写连接」两步，不落盘不排队。代价是**可靠性 entirely 交给调用方设计**——下面 1.2 的例子会展示「喇叭 + 信箱」组合拳的写法。

## 2. 基础命令：SUBSCRIBE / PUBLISH / PSUBSCRIBE

（本节内容承接自原《缓存策略与高级特性》发布订阅一节，全部保留并扩写讲解。）

```bash
# 订阅频道
SUBSCRIBE channel:notifications channel:alerts

# 模式订阅
PSUBSCRIBE channel:*          # 订阅所有 channel: 开头的频道

# 发布消息
PUBLISH channel:notifications "New order received"
PUBLISH channel:alerts "Server CPU > 90%"

# 取消订阅
UNSUBSCRIBE channel:notifications
PUNSUBSCRIBE channel:*
```

逐条拆解：

- `SUBSCRIBE` 一次可以订阅多个频道（可变参数）。执行后**当前连接进入订阅态**：在 redis-cli 里你会发现提示符「卡住」了，只能收消息或继续 SUBSCRIBE/UNSUBSCRIBE/PSUBSCRIBE/PING/QUIT——发 `SET` 之类的普通命令会报错。**易错点**：把「订阅连接」和「业务连接」混用同一个客户端对象，第一条 `SET` 就炸。主流客户端库（redis-py、Jedis、Lettuce）都要求 Pub/Sub 用独立连接或独立 API 对象。
- `PSUBSCRIBE channel:*` 是模式订阅，支持 glob 通配。它比精确订阅多一层「逐频道匹配」开销，消息量大时是 CPU 消耗点；能枚举的频道优先用精确 `SUBSCRIBE`。
- `PUBLISH` 的返回值是**收到消息的订阅者数量**。返回 0 不代表失败，只代表此刻没人听——这正是「不留底稿」语义的直接体现。**易错点**：很多人拿返回值当「发送成功」的确认，用它做可靠投递判断是误用。

一个 redis-cli 的完整收发会话，两个终端对着跑：

```bash
# 终端 A（订阅端）
127.0.0.1:6379> SUBSCRIBE channel:alerts
1) "subscribe"            # 消息类型：订阅确认
2) "channel:alerts"       # 频道名
3) (integer) 1            # 本连接当前订阅的频道数
1) "message"              # 消息类型：真消息
2) "channel:alerts"
3) "Server CPU > 90%"

# 终端 B（发布端）
127.0.0.1:6379> PUBLISH channel:alerts "Server CPU > 90%"
(integer) 1
```

三种消息类型要分清：`subscribe`（订阅确认）、`message`（普通消息）、后续会遇到的 `pmessage`（模式订阅收到的消息）。写解析代码时按第一个元素分发。

## 3. 特点与边界

（承接自原《缓存策略与高级特性》，逐条扩写。）

```
优点:
  - 实时推送，延迟极低
  - 支持模式匹配
  - 简单易用

缺点:
  - 不持久化（离线客户端收不到消息）
  - 无 ACK 机制（不保证送达）
  - 消息堆积影响性能
  - 不支持消费组

适用场景:
  - 实时通知
  - 配置变更广播
  - 聊天室
  - 不适合: 消息队列（用 Stream 代替）
```

「消息堆积影响性能」值得展开，因为它反直觉：Pub/Sub 没有堆积区，但**有输出缓冲区**。如果订阅者读得慢（网络卡、处理阻塞），Redis 会把该连接待发的消息攒进 client output buffer；攒到 `client-output-buffer-limit pubsub` 的硬限制（默认 32MB）或持续超软限制（默认 8MB 持续 60 秒），Redis 会**直接断开这个订阅者**。也就是说：不是消息丢了，是订阅者被踢了。订阅端必须快速消费（通常收下消息就转发，别在回调里做重活）。

「不支持消费组」意味着横向扩容订阅者时注意：**所有订阅者都会收到同一份消息**（广播语义），如果两个实例订阅同一频道各处理一遍，业务就重复了。要做「一条消息只处理一次」的多消费者，要么用 Stream 的 Consumer Group，要么在消息里带业务幂等键。4.x 之前很多教程用「每个实例订阅带实例 ID 的频道」来轮换，复杂且脆弱——直接上 Stream 更省心。

## 4. 键空间通知：让「键的变更」变成消息

（承接自原《缓存策略与高级特性》，全部保留。）

```ini
# redis.conf
notify-keyspace-events ExK$g$
# E: 键事件通知
# x: 过期事件
# K: 键空间通知
# $: String 命令
# g: 通用命令（DEL/EXPIRE等）
# A: 所有事件（等同 $gshzxeK）
```

```bash
# 订阅键事件
SUBSCRIBE __keyevent@0__:expired      # 过期事件
SUBSCRIBE __keyevent@0__:del          # 删除事件
SUBSCRIBE __keyspace@0__:mykey        # mykey 的所有事件
```

配置字符串是最容易写错的地方，逐字母说明：

- 该值是一组**能力开关的并集**，写成什么就开什么；默认为空（功能关闭）。想在运行时开：`CONFIG SET notify-keyspace-events Ex`。
- `K`（Keyspace）与 `E`（Keyevent）是两类**频道命名空间**：`K` 推到 `__keyspace@<db>__:<key>`（频道名里是键，消息里是事件——适合「盯某个键的所有动静」）；`E` 推到 `__keyevent@<db>__:<event>`（频道名里是事件，消息里是键——适合「盯某类事件，如所有过期」）。**两个都不配则什么都不发**，这是最常见的配置翻车点。
- `x` 过期、`e` 逐出（evicted）、`g` 通用命令（DEL/EXPIRE/RENAME…）、`$` String 命令、`l` List、`s` Set、`h` Hash、`z` ZSet、`t` Stream、`d` 模块、`m` 键未命中、`A` 全部（含上述所有别名）。
- `@0` 是数据库编号。用 `SELECT` 分库的部署注意订阅对应 db 的频道。

**易错点**：过期通知的到达时刻是「惰性删除或定期删除真正执行」的时刻，不是 TTL 归零的精确瞬间。典型现象：一个 30 秒过期的键，过期通知可能晚到几十毫秒到几秒（取决于有没有访问触发惰性删除、定期删除抽样何时抽到它）。把过期通知当「精确定时器」用会翻车，容忍秒级误差的场景（清理临时文件、会话失效联动）才合适。

## 5. Sharded Pub/Sub：Redis 7 的 SPUBLISH / SSUBSCRIBE

普通 Pub/Sub 在 Cluster 里有个架构性的坑：**频道没有分片归属**，一条 `PUBLISH` 会被广播到集群所有节点，让每个节点都参与转发。规模一大，Pub/Sub 流量就变成集群总线上的「税」。

Redis 7.0 引入分片 Pub/Sub，把频道按槽位规则挂到具体节点上：

```bash
# 分片订阅（只能精确频道名，不支持模式订阅）
SSUBSCRIBE chat:room:42

# 分片发布
SPUBLISH chat:room:42 "hello"

# 取消订阅
SUNSUBSCRIBE chat:room:42
```

与普通 Pub/Sub 的三点差异：

1. **路由规则**：频道的归属槽 = `CRC16(channel) % 16384`，与键的槽位规则完全一致（见 redis/220-RedisClusterHashSlot）。消息只在该槽所在的分片内传播，不再全集群广播。
2. **不支持 `PSUBSCRIBE`**：分片订阅没有模式匹配版本，需要通配时只能枚举或回到普通 Pub/Sub。
3. **单机部署无差别**：没有 Cluster 时 SPUBLISH/SSUBSCRIBE 与 PUBLISH/SUBSCRIBE 行为一致，可以放心在代码里统一用 S 系列命令，为将来上集群省一次改造。

**易错点**：S 系列与普通系列互不相通——`SPUBLISH chat:42` 发的消息，`SUBSCRIBE chat:42` 的订阅者**收不到**，反之亦然。混用两套 API 是迁移期最常见的「为什么收不到消息」事故。

## 6. 客户端缓存：CLIENT TRACKING

（承接自原《缓存策略与高级特性》客户端缓存一节，全部保留。）

应用侧经常长这样：Redis 缓存之上还有一层进程内缓存（本地 Map / Caffeine），代价是**失效联动要自己搭**——以前的做法是订阅键空间通知自己实现协议。Redis 6.0 起把这件事内建成了服务端支持的协议：客户端缓存。

### 6.1 普通模式

```bash
# Redis 6.0+ 客户端缓存
# 1. 客户端开启 tracking
CLIENT TRACKING ON

# 2. 客户端读取键
GET user:1001        # Redis 记录客户端对此键感兴趣

# 3. 其他客户端修改键
SET user:1001 "new_value"   # Redis 发送失效消息给跟踪的客户端

# 4. 客户端收到失效消息，清除本地缓存
# -> invalidation message for key: user:1001
```

语义拆解：开启 tracking 后，**本连接 GET 过的键**会被服务端记进失效表；这些键被任何人修改/删除/淘汰时，Redis 主动推一条失效消息给本连接。注意推的是「键名」而不是「新值」——客户端收到后应该**删本地缓存、下次回源**，而不是试图从消息里拿新值。这个设计叫 invalidation（失效通知）而非 update（更新推送），因为多客户端并发写时推送「最新值」无法保证顺序一致，失效后回源是唯一正确语义。

### 6.2 广播模式

```bash
# 广播模式: 客户端订阅键前缀
CLIENT TRACKING ON BCAST PREFIX user: PREFIX session:

# 所有 user: 和 session: 前缀的键变更都会通知
# 不需要先 GET 才跟踪
# 适合: 客户端预先知道需要缓存哪些前缀
```

两种模式取舍：

| 模式 | 记录粒度 | 服务端内存 | 通知流量 | 适用 |
| :--- | :--- | :--- | :--- | :--- |
| 普通模式 | 每个客户端 × 每个 GET 过的键 | 较大（失效表逐键记录） | 精准，只有被改的键才通知 | 键空间大、单键访问集中 |
| 广播模式 | 每个前缀一份 | 小 | 大（前缀下任何键变化都通知所有 BCAST 订阅者） | 客户端明确知道要缓存的前缀集合 |

### 6.3 应用层实现

```python
import redis

r = redis.Redis()

# 使用 Redis 客户端缓存（需要支持 RESP3）
# 或使用应用层缓存 + 失效通知

class RedisCache:
    def __init__(self, redis_client):
        self.r = redis_client
        self.local_cache = {}

    def get(self, key):
        if key in self.local_cache:
            return self.local_cache[key]
        value = self.r.get(key)
        if value:
            self.local_cache[key] = value
        return value

    def invalidate(self, key):
        self.local_cache.pop(key, None)
```

这段骨架代码的两处讲究：`get` 命中本地缓存时**不发网络请求**，这是 L1 的意义；`invalidate` 只删不改——本地缓存的正确姿势永远是「删掉等下次回源」，直接改写本地值在并发下会出现「本地新、Redis 旧」的倒挂。若走协议化的 CLIENT TRACKING，`invalidate` 的调用时机由失效消息驱动（见 6.4 与第 8.3 节场景）。

### 6.4 RESP3 push 消息：失效通知长什么样

CLIENT TRACKING 的失效消息走的是 RESP 协议的 **push 类型**（RESP3 中的 `>` 类型；RESP2 下没有独立 push 类型，Redis 把失效消息投递到该连接的 `__redis__:invalidate` 特殊频道，需要客户端另用订阅语义接收——这也是老客户端库支持不佳的原因）。

RESP3 连接上，失效消息的线格式：

```
>3
$10
invalidate
*1
$9
user:1001
```

- 首行 `>3` 表示一条 push 消息、3 个元素；
- 第一个元素是消息类型名 `invalidate`；
- 第三个元素是失效键名数组——**数组而不是单值**，因为广播模式一次前缀变更可能合并失效多个键；数组为空时表示「你的所有键都失效了」（`FLUSHDB` 之类）。

给前端/业务代码的实操建议：redis-py 5+、Lettuce 6+、go-redis 9+ 都已支持 RESP3 与 push 消息，升级客户端版本比自建键空间通知方案省事得多。RESP2 老客户端退而求其次的等价做法就是订阅 `__redis__:invalidate` 频道，但该方案要求 `CLIENT TRACKING ON REDIRECT <client-id>` 转发语义，配置繁琐，能升级就升级。

## 7. 工程场景一：配置热更新广播

需求：多实例服务的限流阈值、功能开关存 Redis，改一处全体生效，秒级内。

方案 A（推送）：运维改配置键 + `PUBLISH` 一条「配置变了」通知，各实例收到后重读配置。

```python
import redis, json

r = redis.Redis(decode_responses=True)

def publish_config_change(config_key):
    # 1. 先写后发，顺序不能反：先发通知后写配置，订阅者会读到旧值
    r.set(config_key, json.dumps({"rate_limit": 200, "gray_users": ["u7"]}))
    r.publish("channel:config:changed", config_key)

# 订阅端（每个服务实例一个独立连接）
pubsub = r.pubsub()
pubsub.subscribe("channel:config:changed")
for msg in pubsub.listen():
    if msg["type"] == "message":
        key = msg["data"]
        new_cfg = json.loads(r.get(key))   # 通知里只带键名，回源读全量
        apply_config(new_cfg)
```

逐行讲为什么：**先 SET 后 PUBLISH**，反了就会出现「订阅者收到通知但 GET 到旧值」的竞态；通知消息只带键名不带值，订阅端统一回源，避免「消息体大 + 多次更新合并成多次全量推送」两个问题。`pubsub.listen()` 是生成器，内部就是循环 `GET` 响应，异常退出时要记得 `pubsub.close()` 释放连接。

方案 B（键空间通知，零侵入）：不写 PUBLISH，直接监听配置键的写事件。

```bash
CONFIG SET notify-keyspace-events "KE$"
# 订阅 __keyspace@0__:app:config —— 该键的任何 SET/DEL 都会产生事件
```

代价：键空间通知需要改服务器配置、且事件里没有「谁改的、改了什么」，审计能力弱。配置中心这类强一致需求，更稳妥的是方案 A + 版本号（配置键里带 version 字段，通知只通知「有新版本」）。

## 8. 工程场景二：订单状态实时推送

需求：订单状态从「已支付」到「已发货」的每次流转，前端页面要秒级刷新，不轮询。

架构：后端状态机流转时 `PUBLISH` 订单频道，WebSocket 网关层订阅并把消息桥接给对应在线用户。

```python
# 订单服务（状态变更处）
r.publish("channel:order:events", json.dumps({
    "order_id": "SO20241006001",
    "from": "PAID",
    "to": "SHIPPED",
    "at": 1728200000,
}))

# 推送网关（保持在线用户 -> WebSocket 连接的映射，伪代码）
# pubsub.subscribe("channel:order:events")
# on message: 找到该订单关联的在线会话，经 WebSocket 下发
```

设计要点：

- 消息体只带**状态变更事实**（from/to/at），不带完整订单——前端要详情就调一次读接口。广播消息保持小而稳定，是长连接系统的基本修养。
- 前端掉线怎么办？Pub/Sub 不补发。兜底是「重连后按订单 ID 拉一次当前状态」——推送只优化体验，正确性靠回源保证。这也是第 1 节心智模型的直接应用：喇叭负责「快」，信箱（读接口）负责「准」。
- 状态回退（to 比 from 还早）要靠业务侧校验，Pub/Sub 不保证顺序达到多订阅者时的严格有序（同一频道内 Redis 单线程写输出缓冲是有序的，但多频道、多连接交错消费无全局顺序）。

## 9. 工程场景三：本地缓存失效订阅（CLIENT TRACKING 落地）

需求：商品详情服务在进程内缓存热点商品（QPS 高到连 Redis 都想省掉），但商品价格改了必须 10 秒内生效。

用广播模式把失效联动外包给 Redis：

```bash
# 每个服务实例的 Redis 连接执行
CLIENT TRACKING ON BCAST PREFIX product: NOLOOP
```

```python
import redis

# resp3=True 让 redis-py 以 RESP3 协议连接，失效消息以 push 形式回调
r = redis.Redis(protocol=3, decode_responses=True)

local_cache = {}

def init_invalidation():
    # on_push 回调：收到 push 类型消息时触发（对应 6.4 的 invalidate 消息）
    r.on_push(lambda msg: handle_invalidate(msg))

def handle_invalidate(message):
    # message 形如 ['invalidate', ['product:1001', ...]]
    if message and message[0] == "invalidate":
        for key in message[1] or []:
            local_cache.pop(key, None)   # 只删不改，等下次回源

def get_product(pid):
    key = f"product:{pid}"
    if key in local_cache:
        return local_cache[key]
    val = r.get(key)              # GET 会经过 tracking 记录（BCAST 模式其实不依赖）
    if val:
        local_cache[key] = val
    return val
```

`NOLOOP` 的作用：本客户端**自己写**的键变化不再通知自己（自己刚写的值本地肯定是新的，通知了也是白失效一次）。多实例部署时，实例 A 写、实例 B 收到失效，正是想要的效果。

为什么这比 7 节的键空间通知方案好：键空间通知是「收到事件后你自己决定怎么处理」，CLIENT TRACKING 是「协议层直接承诺失效语义」，且普通模式下服务端只给「真正 GET 过的键」发通知，流量精确。代价是客户端库必须支持 RESP3/推送消息，老栈升级不动时退回键空间通知方案。

## 10. 动手实践

任务一：验证「Pub/Sub 不留底稿」。先起订阅端 `SUBSCRIBE demo`，`PUBLISH demo msg1`；然后 `UNSUBSCRIBE`，再 `PUBLISH demo msg2`；重新 `SUBSCRIBE demo` 后确认只收到 msg3 及以后——msg2 永久丢失。

<details>
<summary>任务一参考验证与要点</summary>

第二次 PUBLISH 时返回 `(integer) 0`（无订阅者）；重新订阅后收不到 msg2。要点：PUBLISH 返回值就是「当前送达的订阅者数」，0 = 消息已蒸发。由此推导出工程结论：Pub/Sub 消息的生命周期不能跨越订阅者的断线窗口，可靠投递必须换 Stream 或「通知 + 回源」组合。
</details>

任务二：配置热更新实验。向 `app:config` 写入配置并 PUBLISH 通知，再故意把顺序反过来（先 PUBLISH 后 SET），在订阅端观察读到旧值的竞态；然后把方案改为「通知 + 版本号」消除竞态。

<details>
<summary>任务二参考实现</summary>

```python
# 版本号方案：配置键 app:config:v3，指针键 app:config:latest 存 "v3"
def publish_config(new_cfg, version):
    r.set(f"app:config:{version}", new_cfg)
    r.publish("channel:config:changed", version)

def on_change(version):
    cfg = r.get(f"app:config:{version}")  # 按版本读，永远是那次发布的确切内容
    apply_config(cfg)
```

竞态消除的原因：通知携带版本号，订阅者读的是「那一次发布对应的内容」，即使 SET 晚于 PUBLISH 到达订阅者，读到旧版本也只是「晚一拍更新」，不会把两次配置的半新半旧混在一起。
</details>

任务三：键空间通知实验。`CONFIG SET notify-keyspace-events Ex`，订阅 `__keyevent@0__:expired`，然后 `SET tmp:1 v EX 3`，等待并记录通知实际到达时刻与 3 秒到期时刻的差值，重复 10 次统计最大延迟。

<details>
<summary>任务三参考观察</summary>

典型结果：延迟从不到 100ms 到数秒不等，且「不访问该键」时延迟明显大于「频繁访问」。原因正是 4 节所述：通知在删除执行时发出，删除依赖定期抽样或惰性触发，不是 TTL 归零的墙钟时刻。工程结论：过期通知只能做「最终一致」的联动，不能当精确定时器。
</details>

## 11. 下一步与延伸阅读

- 《Redis Stream 核心篇》（redis/090-Stream）：需要可靠投递、消费组、回溯时的正确工具；
- 《管道、事务与原子性》（redis/230-PipeTransactionAtomic）：「通知 + 回源」中的读操作批量化；
- 《安全：ACL 访问控制与 TLS》（redis/315-SecurityAclAndTls）：Pub/Sub 频道也是 ACL 可管控的资源（`+@pubsub` 类别、`&channel` 模式）；
- 《客户端连接、RESP 协议与 CLIENT 命令》（redis/305-RespProtocolAndClientConnections）：output buffer 限制、CLIENT 命令排障与本篇的订阅者被踢问题衔接。

## 参考与致谢

- Redis 官方文档 Pub/Sub：<https://redis.io/docs/latest/develop/pubsub>（Redis Public Source License / CC-BY-SA 4.0 授权文档），Sharded Pub/Sub 与键空间通知章节；
- Redis 官方文档 Client-side caching：<https://redis.io/docs/latest/develop/clients/client-side-caching>（同上许可），RESP2/RESP3 失效消息格式与 BCAST/OPTIN/OPTOUT 选项说明；
- 本篇正文为教学重写，命令行为以官方文档为准。
