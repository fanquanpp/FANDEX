---
order: 104
title: 'Redis-Cluster哈希槽'
module: redis
category: database
difficulty: advanced
description: 'Redis Cluster 哈希槽机制详解：CRC16 校验、16384 槽位分配、槽迁移、重定向与集群伸缩。'
author: fanquanpp
updated: '2026-06-14'
related:
  - redis/主从复制缓冲区
  - redis/哨兵选举
  - redis/管道与事务原子性
  - redis/Lua脚本原子执行
prerequisites:
  - redis/概述与核心数据结构
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
1. 槽位数量适中:
   - 65536 槽: 节点间 Gossip 消息过大（每个槽1bit → 8KB）
   - 16384 槽: 消息大小约 2KB，网络开销可接受

2. 集群规模:
   - 16384 槽支持最多 16384 个主节点
   - 实际推荐不超过 1000 个节点

3. 槽位压缩:
   - 每个节点只需 16384 bit = 2KB 表示槽位分配
```

### 1.3 哈希标签

使用 `{}` 将键的哈希计算限制在大括号内的部分：

```redis
# 不使用标签：不同键可能分布在不同节点
SET user:{1001}:name "Alice"   → CRC16("user:{1001}:name") % 16384
SET user:{1001}:email "a@b"   → CRC16("user:{1001}:email") % 16384

# 使用标签：相同标签的键在同一槽
SET user:{1001}:name "Alice"  → CRC16("1001") % 16384 = slot_A
SET user:{1001}:email "a@b"   → CRC16("1001") % 16384 = slot_A
# 两个键在同一节点，支持 MULTI/EXEC
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

### 3.3 MOVED vs ASK

| 重定向 | 含义         | 持续性         | 客户端行为                   |
| ------ | ------------ | -------------- | ---------------------------- |
| MOVED  | 槽已永久迁移 | 更新本地槽映射 | 后续请求直接发到新节点       |
| ASK    | 槽正在迁移   | 临时性         | 仅本次请求重定向，不更新映射 |

## 4. 槽迁移

### 4.1 迁移流程

```
1. 在目标节点声明接收槽
   CLUSTER SETSLOT <slot> IMPORTING <source_node_id>

2. 在源节点声明迁出槽
   CLUSTER SETSLOT <slot> MIGRATING <target_node_id>

3. 逐个迁移键
   CLUSTER GETKEYSINSLOT <slot> <count>
   MIGRATE <target_host> <target_port> <key> 0 5000

4. 完成迁移，通知集群
   CLUSTER SETSLOT <slot> NODE <target_node_id>
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
1. 节点间 PING/PONG（Gossip 协议）
2. 超过 cluster-node-timeout 无响应 → 标记 PFAIL（疑似故障）
3. 多数主节点标记 PFAIL → 标记 FAIL（确认故障）
4. 从节点发起选举
```

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
