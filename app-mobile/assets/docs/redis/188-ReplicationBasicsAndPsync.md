---
order: 240
title: 主从复制基础与同步机制
module: 'redis'
category: 数据库
difficulty: beginner
description: Redis 主从复制正篇：REPLICAOF 搭建、全量同步与部分同步（PSYNC）流程、级联复制、读写分离与一致性、复制状态查询与故障排查。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'redis/200-ReplicationBuffer'
  - 'redis/190-DisklessReplication'
  - 'redis/210-SentinelElection'
prerequisites:
  - 'redis/010-OverviewCoreDataStructure'
---

## 知识点地图

- **知识类别**：高可用基础——主从复制（replication）机制：搭建、同步流程、拓扑形态、运维排查。
- **解决什么问题**：单实例宕机数据全丢、读QPS 单机封顶。主从复制让从库持有主库的数据副本（读扩展 + 故障转移的数据基础），PSYNC 让断线重连的从库不必每次都拖一次全量 RDB。
- **什么时候用到**：任何上生产前的 Redis 都该有至少一个从库；读多写少的应用用读写分离扩读；哨兵（redis/210）与集群（redis/220）都建立在复制之上——先懂复制，再懂高可用。

前置：持久化的 RDB 流程（redis/150-RDBSnapshotPersistence）——全量同步复用同一套 BGSAVE 机制；本文与《主从复制缓冲区》（redis/200-ReplicationBuffer）分工：**本文讲复制机制本身（怎么同步、怎么运维），200 篇讲同步背后的缓冲区体系（repl_backlog、输出缓冲区怎么配）**。

## 1. 主从搭建：REPLICAOF

（搬移自原《主从复制缓冲区》速查系列的主从配置小节，扩写讲解。）

### 1.1 基本写法：REPLICAOF 设置从库

`REPLICAOF <host> <port>`

```redis
-- Redis 5.0+ 用 REPLICAOF（替代旧版 SLAVEOF）
REPLICAOF 192.168.1.10 6379

-- 取消从库身份，升级为主库
REPLICAOF NO ONE

-- 旧版写法（仍兼容但建议用 REPLICAOF）
SLAVEOF 192.168.1.10 6379
SLAVEOF NO ONE
```

为什么命令改了名而行为没变：SLAVE 一词在 5.0 起被 REPLICA 全面替代（API 与文档口径统一），旧命令保留别名是为了兼容存量脚本。新代码与配置一律用 REPLICAOF，别再混用——混用的代价是监控口径分裂（有的字段仍叫 slave0，这是历史包袱，见第 6 节）。

### 1.2 配置文件持久化

```conf
# redis.conf 主从配置
replicaof 192.168.1.10 6379
masterauth <主库密码>          -- 主库有密码时设置
replica-auth-password <密码>   -- Redis 7.0+ 推荐写法

# 只读从库（默认 yes）
replica-read-only yes

# 复制缓冲区大小（应对断线重连）——属缓冲区调优，详解见 redis/200
repl-backlog-size 256mb
repl-backlog-ttl 3600
```

逐项讲解：

- `masterauth` 是从库连主库的口令；`replica-auth-password`（7.0+）是 ACL 体系下主库验证从库的口令，两者方向相反、配错任何一个都会让复制连不上且报错藏在日志里；
- `replica-read-only yes` 保持默认：从库可写是数据分叉的源头，一旦从库被写入，主从数据从此不一致且无法自动修复；
- `repl-backlog-size` 虽在主从配置段里，但它是**缓冲区参数**，估算公式与调优见 redis/200 第 5 节——本文不重复展开。

### 1.3 动态切换与升级演练

```redis
# 运行中把从库提升为主（哨兵自动做，人工演练时手敲）
REPLICAOF NO ONE

# 把一个已有数据的主库降为另一台的从库（会清空本地数据！）
REPLICAOF 192.168.1.10 6379
```

**易错点**：对有数据、无持久化保护的实例执行 `REPLICAOF <别人>`，本地数据会被全量同步清空——演练故障转移时先确认实例的 RDB/AOF 状态，或干脆用一次性实例。

## 2. 全量同步流程

（搬移自原《主从复制缓冲区》第 4 节，事实全部保留，表述与 200 篇缓冲区视角去重。）

### 2.1 触发条件

- 从库首次连接主库；
- 从库发送的 runid 不匹配（主库重启过，runid 变了）；
- 从库请求的 offset 已被 backlog 覆盖（断线太久，缓冲区装不下这段时间的写入，见 redis/200 第 2 节）。

### 2.2 全量同步步骤

```
1. 从库发送 PSYNC ? -1（请求全量同步）
2. 主库执行 BGSAVE 生成 RDB
3. 主库将 RDB 发送给从库
4. 主库同时将新写入命令存入 replication buffer
5. 从库接收 RDB 后清空数据并加载
6. 主库发送 replication buffer 中的增量命令
7. 从库执行增量命令，数据一致
```

逐步解释为什么必须这样走：BGSAVE 用 fork + 写时复制（COW），主库服务不中断地「拍快照」；发送 RDB 期间主库继续接写入，这批「快照之后的新命令」不能丢，靠每从库一个的 replication buffer 暂存（缓冲区的溢出风险与限制配置是 redis/200 第 3 节的主题）；从库加载 RDB 前先清空自己——主从是「主为准」的单向同步，从库的本地修改没有存活空间。

### 2.3 全量同步开销

```
BGSAVE: fork 子进程，COW 写时复制
RDB 传输: 网络带宽
从库加载: 阻塞服务（加载期间不可用）
增量缓冲: 内存占用
```

四项开销决定了全量同步是「要避免的路径」而不是「常规操作」：主库侧 COW 可能在写高峰放大内存峰值（fork 瞬间子进程共享页，随后双写），从库侧加载期间读不到数据。让重连尽量走部分同步，正是 repl_backlog 存在的意义——参数怎么配，见 redis/200。

### 2.4 无盘全量同步的入口

从 Redis 2.8.18 起支持无盘复制：主库不落 RDB 文件，fork 后直接把快照流式发给从库。磁盘慢、网络快的机器（云盘尤其典型）该开 `repl-diskless-sync yes`——完整机制与两种模式的取舍见《无盘复制》（redis/190-DisklessReplication）。

## 3. 部分同步与 PSYNC

（搬移自原速查系列的 PSYNC 小节并扩写；backlog 判定的数学细节在 redis/200 第 2 节，此处讲协议流程。）

`PSYNC <replicationid> <offset>`

```redis
-- 从库内部调用，通常无需手动执行
-- 首次同步：PSYNC ? -1  触发全量 RDB 同步
-- 断线重连：PSYNC <runid> <offset>  尝试部分重同步

-- 全量同步流程：
-- 1. 从库发送 PSYNC ? -1
-- 2. 主库 BGSAVE 生成 RDB 并发送
-- 3. 主库同时缓存写命令到 backlog
-- 4. RDB 发送完，主库发送缓存的写命令
-- 5. 后续主库写命令实时复制

-- 部分重同步条件：offset 在 backlog 范围内
```

协议流程展开：

1. 从库断线重连后发 `PSYNC <runid> <offset>`（offset 是它最后收到的全局偏移量）；
2. 主库判断：runid 匹配且 offset 仍在 repl_backlog 的有效范围内 → 回复 `+CONTINUE`，从 backlog 提取 `[offset, master_repl_offset]` 区间的命令补发给从库——这就是部分同步；
3. 否则回复 `+FULLRESYNC <runid> <offset>`，走第 2 节的全量流程。

offset 判断的具体算式与示例（`offset >= repl_backlog_first_byte_offset` 才可部分同步）见 redis/200 第 2.4 节——那道题的变量是 backlog 大小，也就是为什么断线时长与写入速度决定 backlog 容量。

**Redis 7 的多路复用优化一句话**：PSYNC2 从 4.0 起逐版加强（故障转移后从库可从新主的部分同步、级联链断裂后的续传），7.0 起共享复制流与多部分 PSYNC 进一步减少全量场景。版本差异以官方文档 replication 主题为准，本文只讲 5.0+ 稳定行为。

## 4. 级联复制

（搬移自原速查系列的级联复制小节。）

**基本写法：链式复制** `REPLICAOF <中间从库> <port>`

```redis
-- 一主多从的级联结构，减轻主库压力
-- master <- slave1 <- slave2
-- slave2 指向 slave1
REPLICAOF 192.168.1.11 6379   -- slave1 的地址

-- slave1 配置允许级联复制（默认允许）
-- replica-serve-stale-data yes
```

什么时候用级联：主库网卡是瓶颈（全量同步的 RDB 传输 × N 个从库都在主库出口）或跨机房分发（主库在本机房，级联从库向异地分发）时。代价是复制链路变长、延迟沿链累积、中间节点故障会切断下游——所以哨兵选主时偏好「离主近」的从库（offset 更大），级联链尾部的从库天然滞后。

## 5. 读写分离与一致性

（搬移自原速查系列的读写分离小节。）

**基本写法：WAIT 等待复制** `WAIT <numreplicas> <timeout毫秒>`

```redis
-- 等待 N 个从库确认写入，返回确认的从库数
SET key1 value1
WAIT 1 1000    -- 等待 1 个从库确认，最多等 1000ms

-- 注意：WAIT 只等待当前命令的复制，不保证持久化
-- 不影响后续命令，仅返回已确认从库数量
```

**只读从库配置** `CONFIG SET replica-read-only yes`

```redis
-- 从库默认只读，禁止写入
CONFIG SET replica-read-only yes

-- 主从延迟导致读到旧数据的应对：
-- 1. 关键读走主库
-- 2. 使用 WAIT 等待复制
-- 3. 读从库后校验 offset
```

三种应对的适用面：「关键读走主库」零成本但牺牲读扩展；「WAIT 1 1000」给写后立即读的场景提供复制确认（写路径加最多 1 秒延迟，超时返回值小于预期要降级处理）；「读从库后校验 offset」客户端记录自己上次写入的偏移量，读时挑 offset 超过它的从库——实现成本最高但读路径无损。多数系统用第一种加白名单，少数强一致读（支付结果页）才值得上 WAIT。

## 6. 复制状态查询：日常操作

（搬移自原速查系列的复制状态查询小节——按校准口径，这组日常操作随复制机制正题归本文；其中 backlog 字段的详细解读见 redis/200。）

**基本写法：INFO replication**

```redis
-- 查看复制信息
INFO replication
-- 关键字段：
-- role:master|slave
-- connected_slaves: 从库数量
-- slave0:ip=...,port=...,state=online,offset=...,lag=0
-- master_repl_offset: 主库复制偏移量
-- repl_backlog_size / repl_backlog_first_byte_offset
```

**基本写法：ROLE 查看角色**

```redis
-- 返回当前节点角色信息
ROLE
-- 主库返回：master <offset> <从库列表>
-- 从库返回：slave <主IP> <主端口> <状态> <已复制偏移量>
```

两个命令的分工：`INFO replication` 是机器可解析的监控入口（lag 与 offset 差值是滞后的直接读数）；`ROLE` 是单节点角色的最小确认（故障演练后验证「谁现在是主」最快的一条命令）。注意 slave0 字段名是历史包袱（REPLICAOF 改名没改它），脚本里别按字段名猜版本。

## 7. 复制故障排查

（搬移自原速查系列的排查小节，补排查思路。）

**基本写法：排查复制中断** `INFO replication | LOG`

```redis
-- 1. 检查从库连接状态
INFO replication
-- state 不为 online 时检查网络/密码

-- 2. 检查 master_link_status
-- master_link_status:down 表示连接断开

-- 3. 检查复制偏移量差距
-- master_repl_offset - slave_repl_offset = 滞后字节数

-- 4. 查看日志
LOG GET 100

-- 5. 强制全量重同步
REPLICAOF NO ONE
REPLICAOF <master_ip> <master_port>
```

排查按「由外向内」走：state 不是 online → 先查网络连通（从库能否 telnet 主库端口）再查口令（masterauth 配错日志里会反复出现 AUTH 报错）；offset 差距持续增大 → 从库处理不过来（CPU 打满或执行了慢命令，redis/320 的慢日志定位）；第 5 步强制全量是最后手段——它会再次压垮主库出口带宽，且如果 backlog 配小了是根因，全量重同步后断线重连还是会退化成全量（根治在 redis/200 的 backlog 容量估算）。

## 8. 复制过滤与从库行为配置

（搬移自原速查系列的过滤小节。）

```conf
# redis.conf 配置
# 从库与主库断开后是否继续提供旧数据服务
replica-serve-stale-data yes

# 从库优先级（哨兵选主用，0=永不被选为主）
replica-priority 100

# 复制链路的非缓冲区调优参数
repl-ping-replica-period 10      # 从库向主库发 PING 的频率
repl-timeout 60                  # 复制各阶段（SYNC、PING）的超时
repl-disable-tcp-nodelay no      # yes 合并小包省带宽、增延迟
```

逐项讲清语义：

- `replica-serve-stale-data yes`：断连期间从库继续用旧数据应答。缓存场景 yes（旧数据比拒绝服务好），强一致场景 no（宁可不服务）；
- `replica-priority 0` 的用法：跨机房部署时把「灾备优先」的异地从库设为 0，哨兵就永远不在异地选主（机制见 redis/210 第 4 节）；
- `repl-disable-tcp-nodelay no` 默认关：小包立即发送，延迟优先；写命令碎片严重的场景开 yes 能省带宽，代价是亚秒级延迟——复制是异步的，这个参数只影响从库落后的毫秒数，不影响正确性；
- 真正的「选择性复制」（只同步部分键）在 Redis 7.0+ 已由 ACL 与应用侧键设计取代，旧版本的过滤思路不要再依赖。

## 9. 工程场景

### 9.1 场景一：电商大促前的读扩展

订单查询接口读 QPS 高峰 5 万，单主扛不住。方案：1 主 4 从读写分离，应用侧按「写后 3 秒内读主、其余读从」分流（等价于第 5 节的第一种应对加时间窗）。大促前的检查清单：4 个从库 `state` 全 online、offset 差距小于 1MB（`INFO replication` 的差值读数）、`replica-read-only yes` 全量确认——任何一个从库滞后超限就从读池摘除，宁可读池变小不可读到旧订单。

### 9.2 场景二：跨机房容灾的级联链

主库在上海机房，深圳机房要求一份灾备副本。直连跨公网复制会受公网抖动影响（repl-timeout 频繁触发重连），方案改为「上海从库 → VPN 隧道 → 深圳级联从库」：深圳从库 `REPLICAOF` 指向上海从库，抖动时断的是级联链（主库无感），恢复后按 PSYNC 续传——只要 backlog（见 redis/200）能覆盖 VPN 抖动窗口，就不会触发全量。深圳从库设 `replica-priority 0`，保证哨兵不会把主切到异地。

### 9.3 场景三：主库误重启后的数据自愈验证

主库 OOM 被 systemd 拉起，runid 变了，4 个从库全部触发全量同步——RDB 同时打满主库出口，主库响应抖动。复盘改进两件事：一是从库错峰重连（`replica-priority` 不影响这个，靠应用侧重试退避），二是给从库配 `repl-diskless-sync`（redis/190）让主库免落盘。**教训**：runid 变化是全量同步的第三个触发条件（第 2.1 节），「主库重启」本身就是一次复制事件，容量规划要把「重启风暴」算进出口带宽。

## 10. 动手实践

**任务一**：本机起两个 Redis 实例（端口 6380、6381），6381 `REPLICAOF 127.0.0.1 6380`，在 6380 写入几个键后在两台分别执行 `ROLE` 与 `INFO replication`，把从库的 slave 字段、master_repl_offset 与从库 offset 记下来；再在 6381 尝试 `SET foo bar`，观察只读保护。

<details>
<summary>任务一参考观察</summary>

6380 的 ROLE 返回 `master` 与从库列表（ip=127.0.0.1 port=6381 state=online offset=...）；6381 返回 `slave` 与主库地址。写入 `SET foo bar` 时从库报 `(error) READONLY You can't write against a read only replica.`。自查：两边 offset 差值是多少？写一条命令后差值增加了多少字节？——差值增长就是复制延迟的最小观测单位。
</details>

**任务二**：观察部分同步与全量同步的切换。任务一的拓扑上，把主库 `repl-backlog-size` 设为最小（`CONFIG SET repl-backlog-size 16kb`），狂写数据把 backlog 冲掉后重启从库的复制连接（`REPLICAOF NO ONE` 后马上 `REPLICAOF 127.0.0.1 6380`），看主库日志判定走的是部分同步还是全量；再把 backlog 调大重试一次对比。

<details>
<summary>任务二参考观察</summary>

backlog 16kb 且持续写入时，重连后主库日志出现 `Full resync`（offset 已被覆盖）；backlog 足够大时同一操作看到 `Partial resynchronization ... (successfully)`。这正是 redis/200 第 5 节容量公式（写入速率 × 最大断线时长）的直观验证：backlog 装得下断线窗口的写入，重连就是廉价的。
</details>

**任务三**：做一次级联与延迟测量。在任务一拓扑上把第三个实例 6382 `REPLICAOF 127.0.0.1 6381`（级联到从库），在主库写一条时间戳键，分别轮询 6381 与 6382 读到该键的时刻，对比两段延迟；再断开 6381（模拟中间节点故障），观察 6382 的状态变化与恢复方式。

<details>
<summary>任务三参考观察</summary>

6382 的读延迟约等于「主到 6381」加「6381 到 6382」两段之和——延迟沿链累积。断开 6381 后 6382 的 master_link_status 变 down 且持续提供旧数据（replica-serve-stale-data 默认 yes）；6381 恢复复制后 6382 自动续上。结论：级联链的中间节点是可用性单点，跨机房容灾（9.2 场景）要为它准备哨兵或人工预案。
</details>

## 11. 下一步与延伸阅读

- 《主从复制缓冲区》（redis/200-ReplicationBuffer）：本文多次指向的缓冲区体系正篇（repl_backlog、输出缓冲区、容量估算）；
- 《无盘复制》（redis/190-DisklessReplication）：全量同步的免落盘形态；
- 《哨兵选举》（redis/210-SentinelElection）：复制之上的自动故障转移；
- 《Redis Cluster 哈希槽》（redis/220-RedisClusterHashSlot）：复制在分片集群内的形态。

## 参考与致谢

- Redis 官方文档 Replication：<https://redis.io/docs/latest/operate/oss_and_stack/management/replication/>（CC-BY-SA 4.0），REPLICAOF、PSYNC、级联复制与排查章节；
- 本篇正文为教学重写；原《主从复制缓冲区》第 4 节全量同步流程、第 5.2 节非缓冲区参数与速查系列的主从配置、复制状态查询、PSYNC、级联复制、读写分离、故障排查、复制过滤各节已整体搬移至本篇落位。
