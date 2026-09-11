---
order: 220
title: Redis Cluster 哈希槽
module: 'redis'
category: 数据库
difficulty: advanced
description: Redis Cluster 哈希槽机制详解：CRC16 校验、16384 槽位分配、槽迁移、重定向与集群伸缩。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'redis/200-ReplicationBuffer'
  - 'redis/210-SentinelElection'
  - 'redis/230-PipeTransactionAtomic'
  - 'redis/240-LuaScriptAtomicExecution'
prerequisites:
  - 'redis/010-OverviewCoreDataStructure'
---


## 1. 哈希槽原理

### 1.1 槽位设计

Redis Cluster 将数据分为 **16384 个哈希槽**（hash slot），每个键通过哈希算法映射到某个槽：

$$\text{slot} = \text{CRC16}(\text{key}) \bmod 16384$$

```
键 "user:1001" → CRC16 = 12567 → slot = 12567 % 16384 = 12567
键 "order:500" → CRC16 = 42890 → slot = 42890 % 16384 = 10122
```

### 1.2 为什么是 16384

```
1. 心跳包大小:
   - 节点间 Gossip PING 需要携带自己的槽位图（每槽 1 bit）
   - 16384 槽 → 2KB；65536 槽 → 8KB，心跳过于臃肿
   - 作者 antirez 的解释：正常规模集群心跳中槽位图占比不应过高

2. 集群规模:
   - 官方建议集群不超过约 1000 个主节点
   - 1000 节点 x 2KB 心跳 = 每 100ms 约 2MB 带宽，可接受

3. CRC16 输出 16 位，天然可对 16384（2^14）取模，分布均匀
```

任何键实际落在哪个槽可以用 `CLUSTER KEYSLOT` 验证：

```redis
CLUSTER KEYSLOT user:1001
# 返回: (integer) 12567   ← 槽号
```

### 1.3 哈希标签

只要键名中**含有 `{}`**，Redis 就只用大括号内的子串计算槽位（无论你是否
「有意」使用标签）。据此可以把需要多键操作的键强制放进同一槽：

```redis
# 无标签：整键参与 CRC16，两个键大概率落在不同节点
SET user:1001:name "Alice"   → CRC16("user:1001:name") % 16384 = slot_X
SET user:1002:name "Bob"     → CRC16("user:1002:name") % 16384 = slot_Y

# 有标签：只有 {1001} 参与哈希，两个键必然同槽、同节点
SET user:{1001}:name "Alice"  → CRC16("1001") % 16384 = slot_A
SET user:{1001}:email "a@b"   → CRC16("1001") % 16384 = slot_A
# 同槽键支持 MULTI/EXEC 事务与多键 Lua 脚本

# 陷阱：全部键共用一个标签会把流量压到单节点，失去分片意义；
# MSETCLUSTER 不存在，MSET 在集群下要求所有键同槽
```

## 2. 槽位分配

### 2.1 初始分配

```bash
# 创建集群，3主3从
redis-cli --cluster create \
  node1:6379 node2:6379 node3:6379 \
  node4:6379 node5:6379 node6:6379 \
  --cluster-replicas 1
```

默认均匀分配：

```
Node1: slot 0-5460     (5461个槽)
Node2: slot 5461-10922 (5462个槽)
Node3: slot 10923-16383 (5461个槽)
```

### 2.2 查看槽分配

```redis
CLUSTER NODES
# 输出:
# node1 ... master - 0-5460
# node2 ... master - 5461-10922
# node3 ... master - 10923-16383
# node4 ... slave node1
# node5 ... slave node2
# node6 ... slave node3

CLUSTER SLOTS
# 返回槽范围与节点映射
```

## 3. 请求路由

### 3.1 MOVED 重定向

客户端请求错误节点时，返回 MOVED：

```
客户端 → Node2: GET user:1001
Node2: MOVED 12567 10.0.0.1:6379  ← 槽12567在Node1

客户端 → Node1: GET user:1001
Node1: "Alice"  ← 成功
```

用 `redis-cli -c`（自动跟随重定向）观察完整过程：

```bash
redis-cli -c -p 6379
127.0.0.1:6379> SET user:1001 "Alice"
-> Redirected to slot [12567] located at 10.0.0.1:6379
OK
10.0.0.1:6379> get user:1001
"Alice"          # 此后客户端已记住该槽在 6379，不再重定向
```

**不使用 -c** 时 redis-cli 只原样打印 `(error) MOVED 12567 10.0.0.1:6379`。
智能客户端（Lettuce/Jedis/go-redis 等）会像 -c 一样缓存「槽→节点」映射，
MOVED 后更新映射；这也是 Cluster 模式必须使用支持集群协议的客户端的原因。

### 3.2 ASK 重定向

槽迁移过程中的临时重定向：

```
迁移中: 槽 12567 从 Node1 迁移到 Node2

客户端 → Node1: GET user:1001
Node1: ASK 12567 10.0.0.2:6379  ← 临时重定向

客户端 → Node2: ASKING
客户端 → Node2: GET user:1001
Node2: "Alice"
```

关键细节：**目标节点默认拒绝「别人的槽」上的请求**，客户端必须先发
`ASKING`（打开一次性开关）才被放行；这个开关只对下一条命令生效，
正体现 ASK 的「仅本次」语义。

### 3.3 MOVED vs ASK

| 重定向 | 含义         | 持续性         | 客户端行为                   |
| ------ | ------------ | -------------- | ---------------------------- |
| MOVED  | 槽已永久迁移 | 更新本地槽映射 | 后续请求直接发到新节点       |
| ASK    | 槽正在迁移   | 临时性         | 仅本次请求重定向，不更新映射 |

## 4. 槽迁移

### 4.1 迁移流程

```
0. 前置：目标节点已加入集群（CLUSTER MEET），状态可以是「无槽」
1. 在目标节点声明接收槽
   CLUSTER SETSLOT <slot> IMPORTING <source_node_id>

2. 在源节点声明迁出槽
   CLUSTER SETSLOT <slot> MIGRATING <target_node_id>

3. 循环迁移槽内所有键（每次一批）
   CLUSTER GETKEYSINSLOT <slot> 100       # 拿最多100个键
   MIGRATE <target_host> <target_port> <key> 0 5000 [COPY] [REPLACE]
   直到 GETKEYSINSLOT 返回空数组

4. 广播归属（对源、目标都执行，集群经 Gossip 传播到全体节点）
   CLUSTER SETSLOT <slot> NODE <target_node_id>
```

**逐键 MIGRATE 是阻塞命令**：源节点在传输期间不处理其他请求，因此
每批键要小、迁大键前评估（MIGRATE 支持 KEYS 选项批量传键，6.0+）。
迁移期间该槽的读写不中断：键未走时源节点正常服务，已走则 ASK 切换。

### 4.1.1 手动迁移完整会话示例

```bash
# 假设把槽 3000 从节点A(6379) 迁到节点B(6380)，节点ID用 CLUSTER MYID 获取
redis-cli -p 6380 CLUSTER SETSLOT 3000 IMPORTING <A的node_id>
redis-cli -p 6379 CLUSTER SETSLOT 3000 MIGRATING <B的node_id>

redis-cli -p 6379 CLUSTER GETKEYSINSLOT 3000 100
# 返回: 1) "order:{tag}:1"  2) "order:{tag}:2"
redis-cli -p 6379 MIGRATE 127.0.0.1 6380 "order:{tag}:1" 0 5000 REPLACE
# 返回: OK
# ...（重复直到 GETKEYSINSLOT 为空）

redis-cli -p 6379 CLUSTER SETSLOT 3000 NODE <B的node_id>
redis-cli -p 6380 CLUSTER SETSLOT 3000 NODE <B的node_id>
# CLUSTER SLOTS / CLUSTER SHARDS 中槽3000已指向 6380
```

### 4.2 使用 redis-cli 迁移

```bash
# 将 Node1 的 1000 个槽迁移到 Node2
redis-cli --cluster reshard node1:6379 \
  --cluster-from <node1_id> \
  --cluster-to <node2_id> \
  --cluster-slots 1000 \
  --cluster-yes
```

### 4.3 迁移期间的数据访问

```
源节点检查键是否已迁移:
  - 键还在源节点 → 正常返回
  - 键已迁移到目标 → 返回 ASK

目标节点检查:
  - 收到 ASKING 后 → 查找键
  - 键在目标 → 返回
  - 键不在目标 → 返回 MOVED（回源节点查找）
```

## 5. 集群伸缩

### 5.1 扩容（添加节点）

```bash
# 1. 启动新节点
redis-server redis.conf  # cluster-enabled yes

# 2. 加入集群
redis-cli --cluster add-node new_node:6379 existing_node:6379

# 3. 迁移槽位
redis-cli --cluster reshard existing_node:6379

# 4. 添加从节点
redis-cli --cluster add-node new_slave:6379 existing_node:6379 \
  --cluster-slave --cluster-master-id <master_id>
```

### 5.2 缩容（移除节点）

```bash
# 1. 迁移槽位到其他节点
redis-cli --cluster reshard existing_node:6379

# 2. 移除节点
redis-cli --cluster del-node existing_node:6379 <node_id>
```

### 5.3 自动均衡

```bash
# 自动均衡所有节点的槽位分布
redis-cli --cluster rebalance node1:6379 \
  --cluster-threshold 1
```

## 6. 故障检测与恢复

### 6.1 故障检测

```
1. 节点间通过「集群总线」交换 PING/PONG（Gossip 协议）
   - 总线端口 = 服务端口 + 10000（如 6379 → 16379），需放行防火墙
2. 超过 cluster-node-timeout 无响应 → 标记 PFAIL（疑似故障）
3. 过半数主节点都标记 PFAIL → 升级 FAIL（确认故障）
4. 该主节点的从节点发起选举（基于 epoch 的多数投票）
```

PFAIL→FAIL 需要的是**主节点多数**，与 Sentinel 中「quorum 判定下线、
多数选 Leader」两层机制同源但更简化。故障检测与槽归属都以
`current_epoch/config_epoch` 较大者为准，避免脑裂后的配置回退。

### 6.2 从节点选举

```
1. 从节点发现主节点 FAIL
2. 从节点自增 current_epoch
3. 向其他主节点请求投票
4. 获得多数票的从节点晋升为主节点
5. 其他从节点开始复制新主节点
```

### 6.3 集群状态

```redis
CLUSTER INFO
# cluster_state:ok          ← 所有槽都已分配
# cluster_slots_assigned:16384
# cluster_slots_ok:16384
# cluster_known_nodes:6
# cluster_size:3            ← 3个主节点
```

`cluster_state:fail` 的最常见原因是**存在未分配槽**（如新节点加入后没
reshard、或迁移中断导致槽悬在 MIGRATING/IMPORTING），修复到位后状态
自动回到 ok。配置 `cluster-require-full-coverage no` 可让「部分槽无主」
时其余槽继续服务（默认 yes，整个集群拒绝查询）。

## 7. 多键操作的槽约束（高频踩坑）

| 操作 | 单槽内 | 跨槽 | 解法 |
| :--- | :--- | :--- | :--- |
| MULTI/EXEC 事务 | 可用 | 报 CROSSSLOT | 哈希标签收拢到同槽 |
| Lua 脚本多键 | 可用 | 报 CROSSSLOT | 同上 |
| MSET/MGET 多键 | 可用 | 报 CROSSSLOT | 拆批或哈希标签 |
| BLPOP 多个列表键 | 可用 | 报错 | 每节点单独消费 |
| SCAN / DBSIZE | 只看本节点 | 需遍历所有主节点 | 客户端循环各节点 SCAN |

```redis
# 跨槽报错示例
MSET a 1 b 2
# (error) CROSSSLOT Keys in request don't hash to the same slot

# 哈希标签解决：{app}:a 与 {app}:b 同槽
MSET {app}:a 1 {app}:b 2
# OK
```

## 8. 小结

- 初学者要点：键 → CRC16 mod 16384 → 槽 → 节点；用 redis-cli --cluster
  一条命令完成建群/扩缩容；客户端一律带 -c 或使用集群感知 SDK。
- 进阶注意：MOVED 更映射、ASK 只一次且要 ASKING；手动迁移四步缺一不可
  （IMPORTING/MIGRATING/逐键 MIGRATE/双侧 SETSLOT NODE）；多键操作靠
  哈希标签，但标签滥用会把集群退化成单机。
- 下一步：《哨兵选举》（redis/210-SentinelElection）对比主从架构与
  Cluster 架构的高可用差异；《管道与事务的原子性》
  （redis/230-PipeTransactionAtomic）了解同槽多键事务的用法。
