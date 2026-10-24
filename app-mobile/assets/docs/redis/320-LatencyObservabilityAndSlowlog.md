---
order: 390
title: 延迟观测与慢查询诊断
module: 'redis'
category: 数据库
difficulty: beginner
description: SLOWLOG 慢查询日志逐字段解读、LATENCY 事件时间线、INFO 关键指标与 redis-cli --bigkeys/--hotkeys 巡检，附大促巡检、KEYS 事故复盘、热 key 兜底三个场景。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Redis 的延迟观测体系——SLOWLOG（慢查询日志）、LATENCY 框架（延迟事件与时间线）、INFO 统计指标、redis-cli 内建巡检工具（--bigkeys/--hotkeys/--latency）。
- **解决什么问题**：把「接口慢了」定位到「哪条命令、哪个键、哪类事件」；在大促前用一份固定巡检清单把风险提前暴露；区分「命令本身慢」与「被别的事拖慢」这两种完全不同的问题。
- **什么时候用到**：线上接口 P99 抖动排查、大促/活动前巡检、容量评审前的数据摸底、卡顿事故复盘与整改验收。

前置：会基本 redis-cli 操作；了解 Redis 单线程执行模型（同一时刻只有一条命令真正在跑，所以「慢」会传染）。

## 1. 心智模型：Redis 没有「慢」，只有「互相拖累」

Redis 的命令执行是单线程的（网络 I/O 在 6.0+ 可多线程，命令执行仍是单线程），因此观测延迟问题等价于回答一个问题：**那一秒，单线程在忙什么**。

答案只有三类，对应三套观测工具：

```
1. 某条命令执行本身就慢       → SLOWLOG（命令级，日志）
2. 命令执行被系统事件阻塞     → LATENCY 框架（事件级，时间线）
3. 命令执行正常但流量/资源异常 → INFO 指标（统计级，数值）
```

排查顺序也按这个来：先看 SLOWLOG 有没有「凶手命令」，没有再看 LATENCY 时间线有没有 fork/AOF/交换类事件，最后对照 INFO 的资源指标。三套工具互补，任何一套单独看都可能漏判。

## 2. SLOWLOG：慢查询日志

（本节内容承接自原《缓存策略与高级特性》慢查询日志一节，全部保留并扩写。）

### 2.1 配置

```ini
# redis.conf
slowlog-log-slower-than 10000    # 超过 10ms 记录（微秒）
slowlog-max-len 128              # 最多记录 128 条

# 设为 0: 记录所有命令
# 设为 -1: 禁用慢查询日志
```

单位是最容易踩的坑：**微秒**。10000 微秒 = 10 毫秒。想看 1ms 以上的命令就写 1000——排查抖动时把阈值临时降到 1000，平时回到 10000 控制日志量。运行时调整：`CONFIG SET slowlog-log-slower-than 1000`，即时生效不必重启。

`slowlog-max-len` 是环形缓冲：写满后新条目挤掉最老的。128 条偏小，生产建议 1024——SLOWLOG 存内存，一条记录几百字节，1024 条不过几十万字节。

### 2.2 查看慢查询

```bash
# 查看慢查询日志
SLOWLOG GET 10
# 返回:
# 1) 1) (integer) 12              # 日志 ID
#    2) (integer) 1704067200       # 时间戳
#    3) (integer) 15000            # 执行时间(微秒)
#    4) 1) "KEYS"                  # 命令
#       2) "*"
#    5) "192.168.1.100:52341"      # 客户端地址
#    6) ""                         # 客户端名称

# 慢查询数量
SLOWLOG LEN

# 重置慢查询
SLOWLOG RESET
```

逐字段解读与使用方式：

- **ID**：单调递增。两次 `SLOWLOG GET` 之间 ID 走了 200，说明这期间发生了 200 条慢命令——比数返回条数更能反映总量。
- **时间戳**：秒级。对齐应用侧告警时间点（如 14:32:00 的 P99 飙升），看同一秒的慢命令。
- **执行时间**：**只含命令执行耗时，不含排队与网络**。这一条是理解 SLOWLOG 的钥匙——如果 SLOWLOG 干净但线上就是慢，问题在「命令之外」（见第 3 节 LATENCY）。
- **命令与参数**：完整 argv。看到 `KEYS *` 就是凶手直接抓现行。
- **客户端地址**：定位到哪个服务实例发的。配合 `CLIENT LIST` 可以进一步找到具体连接。
- **客户端名称**：默认空。**强烈建议**每个服务实例启动时执行 `CLIENT SETNAME <服务名:实例号>`，没有它，多服务共用 Redis 时你只能看到 IP（NAT 环境下还是共享出口 IP，完全没法定位）。

### 2.3 常见慢查询原因

```
1. KEYS * — 全库扫描，生产禁用
2. 大 Key 操作 — DEL/GET 一个很大的值
3. 复杂聚合 — SORT、SUNION 等大集合操作
4. 全量获取 — HGETALL 大哈希、SMEMBERS 大集合
5. 短连接 — 频繁建立/断开连接
6. AOF fsync — always 模式下每条命令 fsync
7. 内存不足 — 频繁触发淘汰策略

优化建议:
- 使用 SCAN 替代 KEYS
- 拆分大 Key
- 使用 HSCAN/SSCAN 替代全量获取
- 使用 Pipeline 减少网络往返
- 监控 SLOWLOG 并告警
```

对每条原因补一句判别与修法：

1. **KEYS ***：代码检索 + 审计日志双管齐下；修复后用 `rename-command KEYS ""` 从协议层废掉（见 redis/315-SecurityAclAndTls 的最小权限清单）。
2. **大 Key**：先跑 `redis-cli --bigkeys` 摸底（见 4.1）；DEL 一个百万元素的 Hash 会同步释放内存阻塞主线程，用 `UNLINK`（异步删除）替代。
3. **复杂聚合**：SORT 的 BY/GET 组合在百万级上是 O(N log N)+O(M)；集合聚合改用 `*STORE` 落临时键 + 低峰消费（见 redis/040-ListSetCommands 的同款建议）。
4. **全量获取**：HGETALL/SMEMBERS/LRANGE 0 -1 三个惯犯，一律改 SCAN 类分批。
5. **短连接**：SLOWLOG 里看不到它本身，但 `INFO stats` 的 `total_connections_received` 每秒数百万就是证据；修法是连接池常驻（见 redis/305-RespProtocolAndClientConnections 的连接池参数一节）。
6. **AOF fsync**：`appendfsync always` 下每条写命令都等磁盘；改 everysec。注意它还会以另一种面目出现——AOF 重写 fork 时的写时复制放大。
7. **内存不足触发淘汰**：`INFO stats` 的 `evicted_keys` 持续增长即实锤；修法见 redis/130-MemoryEvictionPolicy。

## 3. LATENCY 框架：事件时间线

SLOWLOG 只看得到命令，看不到「系统级」的停顿来源。LATENCY 框架记录的是**事件**：fork、AOF fsync 阻塞、交换分区、过期密集删除、RDB 加载等。它的观测单位是「毫秒级以上的卡顿事件」而不是命令。

### 3.1 事件种类与阈值

```ini
# redis.conf（事件阈值，单位毫秒；超过才记录）
latency-monitor-threshold 100    # 默认 0（关闭），设为 100 表示只记 >100ms 的事件
```

常见事件及含义：

| 事件            | 触发原因                        | 典型修法                     |
| :-------------- | :------------------------------ | :--------------------------- |
| fork            | RDB/AOF 重写/复制 fork 子进程   | 降大页影响、错峰持久化       |
| aof-fsync-always| always 模式每命令 fsync         | 改 everysec                  |
| aof-write       | AOF 写盘排队（磁盘慢）          | 换高速盘、查磁盘负载         |
| expire-cycle    | 定期删除抽样耗时过长            | 分散 TTL、调 hz              |
| eviction-cycle  | 淘汰循环耗时过长                | 加内存、查淘汰策略命中率     |
| swap            | Redis 进程内存被换出到交换分区  | 关 swap 或保证充足物理内存   |

### 3.2 时间线三命令

```bash
LATENCY HISTORY fork
# 1) 1) (integer) 1704067200     # 事件发生时间戳
#    2) (integer) 187            # 该次事件耗时（毫秒）

LATENCY LATEST
# 1) 1) "fork"                  # 事件名
#    2) (integer) 1704067200    # 最近一次发生时间
#    3) (integer) 187           # 最近一次耗时
#    4) (integer) 210           # 历史最大耗时

LATENCY GRAPH fork
# 链接一段 ASCII 时间线图，快速看趋势
```

读法：`LATENCY LATEST` 是「现在还有什么在闹」；`LATENCY HISTORY <event>` 是「这个病历史上发作过几次、每次多久」；两者结合能回答「是老毛病还是新问题」。LATENCY 数据同样在内存里（默认保留最长约 1 小时的事件窗口），要留证据得及时捞进监控系统。

**易错点**：`latency-monitor-threshold` 默认 0 即关闭，很多实例线上什么也记不到不是「没卡顿」而是「没开表」。巡检基线至少设 100ms。

## 4. 巡检工具与 INFO 关键指标

### 4.1 redis-cli --bigkeys / --hotkeys

```bash
# 大 key 扫描：每种类型给出最大的一批键
redis-cli --bigkeys
# -------- summary -------
# Biggest string found 'product:desc:10086' has 1048576 bytes
# Biggest   list found 'queue:posts' has 312000 entries
# ...

# 热 key 扫描（需要 maxmemory-policy 为 LFU 系才准确）
redis-cli --hotkeys
# Biggest  string found 'flash:price:sku9' has 120 hits
```

两者原理与局限：

- `--bigkeys` 用 SCAN 遍历全库，对每个键取长度（STRLEN/LLEN/SCARD 等），**不读值本身**，因此对线上压力小但仍是一次全库扫描，低峰执行。它找的是「每个类型里最大的」，不是「所有超过阈值的」——要完整清单得自己写 SCAN + MEMORY USAGE 脚本。
- `--hotkeys` 依赖 LFU 计数器（redisObject 的 8 位对数计数器，见 redis/130-MemoryEvictionPolicy 的 LFU 一节），策略不是 allkeys-lfu/volatile-lfu 时会直接提示无法工作。
- 两者都只采样「键空间的分布」，真正的按内存排序要用 `MEMORY USAGE key` 逐键确认。

### 4.2 INFO 必看指标

```bash
INFO memory
# used_memory_human: 3.80G          ← 数据实际占用
# mem_fragmentation_ratio: 1.23     ← 物理内存 / used_memory，>1.5 碎片化严重
# mem_allocator: jemalloc-5.3.0

INFO stats
# evicted_keys: 82341               ← 因内存满被淘汰的键数，持续增长=内存不足
# total_connections_received: 9823  ← 累计新建连接数，秒级增长=短连接问题
# rejected_connections: 0           ← 被 maxclients 拒绝的连接数，>0 即事故

INFO commandstats
# cmdstat_get: calls=100000,usec=50000,usec_per_call=0.50
# cmdstat_keys: calls=3,usec=187000000,usec_per_call=62333333.33
#                       ↑ 单条 62 秒的 KEYS 藏在这里
```

`mem_fragmentation_ratio` 的判读：<1 表示使用了交换分区（swap，比 >1.5 更危险，立即处理）；1.0~1.5 正常；>1.5 碎片严重，考虑 `activedefrag yes` 或重启。`evicted_keys` 的正确用法不是看绝对值，是看**增速**——大促前打基线，活动中增速异常就是内存告急的前兆。

`INFO commandstats` 是被低估的宝藏：它给出每条命令的调用次数与平均耗时（`usec_per_call`），配合 `CONFIG RESETSTAT` 打窗口做「分钟级命令画像」，比 SLOWLOG 阈值法更能发现「单条不算慢但调用量爆炸」的问题。

## 5. 工程场景一：大促前巡检清单

需求：大促前 3 天对 Redis 集群做一次全面体检，输出「可发布/需整改」结论。

一份可直接执行的巡检脚本骨架（每条都能跑）：

```bash
#!/usr/bin/env bash
# redis-precheck.sh —— 每个节点执行，任何一行异常都记录整改项
r() { redis-cli -h "$1" "$2" ; }

# 1. 慢查询画像：近 24h 是否有 >10ms 命令
r "$1" "SLOWLOG GET 100" | head -60

# 2. 延迟事件：阈值开到 100ms 后看时间线
r "$1" "LATENCY LATEST"

# 3. 大 key 摸底（低峰执行）
redis-cli -h "$1" --bigkeys | tail -20

# 4. 内存与碎片
r "$1" "INFO memory" | grep -E "used_memory_human|mem_fragmentation_ratio"

# 5. 淘汰与连接
r "$1" "INFO stats" | grep -E "evicted_keys|rejected_connections|total_connections_received"

# 6. 命令画像：找异常热点
r "$1" "INFO commandstats" | sort -t= -k3 -rn | head -10
```

判读基线（写入值班手册）：碎片率 1.0~1.5；evicted_keys 增速为 0；SLOWLOG 中无 KEYS/SORT；连接数日环比无翻倍；主从 `master_link_status:up` 且 lag=0（复制监控见 redis/200-ReplicationBuffer）。

巡检的价值在「基线」不在「绝对值」：活动前一周每天跑一遍存档，大促当天对照增量——绝对值 3.8GB 内存可能正常，环比上周翻倍就绝对不正常。

## 6. 工程场景二：一次 KEYS * 造成线上卡顿的复盘

背景：一个内部运营后台的「搜索用户」功能直接调了 `KEYS user:*`，数据量涨到 200 万键后，某天下午接口超时雪崩。时间线：

```
14:32:05  运营点击搜索 → KEYS user:* 执行
14:32:05  Redis 单线程被占满 ~6 秒（200 万键逐个比对）
14:32:05  所有其他命令排队，P99 从 2ms 飙到 6000ms
14:32:06  连接池耗尽（等待队列堆满，见 redis/305 的连接池参数一节）
14:32:07  上游服务线程池打满，整个链路超时
14:32:11  KEYS 返回 200 万行，运营端只显示前 20 条
```

复盘定位过程（还原第 1 节的三层顺序）：

1. 应用侧 P99 告警 → 先查 SLOWLOG：`SLOWLOG GET 5` 第一条就是 `KEYS user:*`，耗时 5,983,412 微秒，客户端名是空（教训：当时没配 CLIENT SETNAME，定位服务花了一小时）；
2. 交叉验证 `INFO commandstats`：`cmdstat_keys` 的 calls 只涨了 3 次，但 usec_per_call 达 62 秒级——「单条巨慢」特征；
3. LATENCY LATEST 无异常事件 → 排除 fork/swap，确认是纯命令问题。

整改清单（每条都落地了）：

- 代码修复：搜索改走 RediSearch FT.SEARCH（redis/280-ModuleSystem）；
- 协议兜底：`rename-command KEYS ""`，让 KEYS 在这个实例上根本不存在；
- 观测补课：所有实例 `latency-monitor-threshold 100`，SLOWLOG 阈值 1000 且 max-len 1024，CLIENT SETNAME 纳入服务启动模板；
- 流程补课：代码评审新增规则——Redis 命令白名单外的命令必须标注评审人。

## 7. 工程场景三：热 key 探测与本地缓存兜底

背景：秒杀活动，某个 sku 的价格键 `flash:price:sku9` 承接 8 万 QPS，单分片 Redis 打满 CPU。请求路由由槽位决定，单键永远落在一个分片上——加节点没用，这是 Cluster 的天然局限（见 redis/220-RedisClusterHashSlot）。

发现与确认：

```bash
redis-cli --hotkeys          # LFU 策略下直接看到 flash:price:sku9 访问计数最高
INFO commandstats            # cmdstat_get 的 calls 增速与业务 QPS 对得上
```

兜底方案（分层）：

```python
import random, time

def get_flash_price(sku):
    # L1：进程内缓存，只缓存 1~3 秒——牺牲秒级新鲜度换掉 99% 的 Redis 流量
    key = f"flash:price:{sku}"
    hit = l1.get(key)
    if hit is not None:
        return hit
    # L2：Redis
    val = r.get(key)
    ttl = random.randint(1, 3)          # 随机 TTL：防止所有实例同一瞬间集体过期
    l1.set(key, val, ttl)
    return val
```

设计要点逐条讲：本地缓存 TTL 只有 1~3 秒——秒杀价本来就是活动维度配置，秒级延迟可接受；**随机 TTL** 打散过期时刻，避免「同时回源」造成 Redis 尖峰（与 redis/120-CachePenetrationBreakdownAvalanche 里防雪崩的随机 TTL 同源同理）；兜底只对「读多改少」的键启用，强一致的库存扣减不走这条路径。

热 key 的另一路修法是「键复制打散」：`flash:price:sku9:0` ~ `:9` 十个副本键，读时随机挑一个，写时全写一遍，把流量摊到多个槽/分片。适合无法引入本地缓存的场景（如非 JVM 的短生命周期 worker），代价是写放大与副本一致性窗口。

## 8. 动手实践

任务一：构造一条慢命令并完整走一遍三层定位。开两个终端，A 执行 `SADD big:set $(seq 1 2000000)`（约 2 分钟），B 在 A 执行中反复跑 `LATENCY LATEST`、`SLOWLOG GET 1`、`INFO commandstats | grep cmdstat_sadd`，观察三层各自的呈现。

<details>
<summary>任务一参考观察</summary>

SLOWLOG 在命令完成后记录一条 2 秒级的 SADD；commandstats 的 usec_per_call 随每次执行被拉高；LATENCY LATEST 可能无事件（单条命令不触发事件阈值时）——正好演示「SLOWLOG 看命令、LATENCY 看系统事件」的分工。把 `latency-monitor-threshold` 设为 100 后 LATENCY 也会记到。生产上百万成员集合常见于标签/粉丝场景，修法是拆分片键或改用 *STORE。
</details>

任务二：给自己造一个 fork 事件。对 1GB 以上数据量的实例执行 `BGSAVE`，期间用 `LATENCY HISTORY fork` 观察 fork 耗时；然后用 `INFO memory | grep mem_fragmentation_ratio` 对比 BGSAVE 前后（写时复制会临时抬高内存）。

<details>
<summary>任务二参考观察</summary>

fork 耗时与实例内存正相关（1GB 约几十毫秒，10GB 可到数百毫秒——这解释了为什么大实例要无盘复制与错峰持久化，见 redis/150-RDBSnapshotPersistence 与 redis/190-DisklessReplication）。BGSAVE 期间持续写键会看到 used_memory 上涨（COW 页复制）。
</details>

任务三：写一个 20 行内的巡检脚本，输出本机的碎片率、evicted_keys 增速（两次采样相减）、SLOWLOG 最新 5 条的命令名，按「正常/告警」三档输出。

<details>
<summary>任务三参考骨架</summary>

```bash
#!/usr/bin/env bash
frag=$(redis-cli INFO memory | grep mem_fragmentation_ratio | cut -d: -f2 | tr -d '\r')
ev1=$(redis-cli INFO stats | grep evicted_keys | cut -d: -f2 | tr -d '\r'); sleep 60
ev2=$(redis-cli INFO stats | grep evicted_keys | cut -d: -f2 | tr -d '\r')
echo "fragmentation=$frag evicted_delta=$((ev2-ev1))/min"
redis-cli SLOWLOG GET 5 | grep -A1 "Command" | head -20
# 判读：frag >1.5 告警；evicted_delta >0 告警；SLOWLOG 出现 KEYS/SORT 告警
```

`tr -d '\r'` 不可省——INFO 输出是 CRLF 行尾，直接算术比较会静默失败，这是 shell 处理 redis-cli 输出的第一坑。
</details>

## 9. 下一步与延伸阅读

- 《客户端连接、RESP 协议与 CLIENT 命令》（redis/305-RespProtocolAndClientConnections）：连接池耗尽与 CLIENT 排障，补齐「命令之外」的延迟来源；
- 《内存淘汰策略》（redis/130-MemoryEvictionPolicy）：evicted_keys 与 hotkeys 背后的 LFU 机制；
- 《持久化三篇》（redis/150-RDBSnapshotPersistence、redis/160-AOFLogPersistence、redis/170-MixedPersistence）：fork 与 fsync 事件的完整原理。

## 参考与致谢

- Redis 官方文档 Latency monitoring：<https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency-monitor>（Redis Public Source License / CC-BY-SA 4.0 授权文档），LATENCY 框架事件分类与阈值配置；
- Redis 官方文档 Slowlog：<https://redis.io/docs/latest/commands/slowlog-get/>（同上许可），SLOWLOG 输出字段说明；
- 本篇正文为教学重写；原《缓存策略与高级特性》慢查询日志一节内容已整体搬移至本篇 2 节落位。
