---
order: 3
title: 集群与高可用
module: redis
category: Redis
difficulty: advanced
description: '主从复制、哨兵模式自动故障转移、Redis Cluster无中心分片、集群代理、Redis Flex混合存储、Redis for AI套件。'
author: fanquanpp
updated: '2026-06-14'
related:
  - redis/概述与核心数据结构
  - redis/持久化与模块
  - redis/缓存策略与高级特性
  - redis/语法速查
prerequisites: []
---

## 1. 主从复制

### 1.1 全量同步

```
全量同步流程:
  从节点 ──PSYNC ? -1──→ 主节点
  主节点 ──+FULLRESYNC runid offset──→ 从节点
  主节点 ──RDB 数据──→ 从节点
  主节点 ──积压缓冲区数据──→ 从节点
  从节点加载 RDB → 数据一致

触发条件:
  - 从节点首次连接
  - 从节点断开过久，offset 已不在积压缓冲区
```

### 1.2 增量同步

```
增量同步流程:
  从节点 ──PSYNC runid offset──→ 主节点
  主节点检查 offset 是否在 repl_backlog 中
    是 → 主节点 ──差异数据──→ 从节点（增量同步）
    否 → 执行全量同步

配置参数:
  repl-backlog-size 256mb       # 积压缓冲区大小
  repl-backlog-ttl 3600         # 无从节点时保留时间
```

### 1.3 主从配置

```bash
# 从节点配置
redis-server --replicaof 192.168.1.10 6379

# 或在 redis.conf 中
replicaof 192.168.1.10 6379
masterauth "MasterPass123"       # 主节点密码

# 只读模式（默认开启）
replica-read-only yes

# 复制相关配置
repl-diskless-sync yes           # 无盘复制
repl-ping-replica-period 10      # 心跳间隔
repl-timeout 60                  # 超时时间
replica-serve-stale-data yes     # 断开后是否继续响应
replica-priority 100             # 哨兵选举优先级
```

### 1.4 复制状态监控

```bash
# 主节点查看从节点
INFO replication
# # Replication
# role:master
# connected_slaves:2
# slave0:ip=192.168.1.11,port=6379,state=online,offset=1234567,lag=0
# slave1:ip=192.168.1.12,port=6379,state=online,offset=1234560,lag=1

# 从节点查看状态
INFO replication
# # Replication
# role:slave
# master_host:192.168.1.10
# master_link_status:up
# master_sync_in_progress:0
# slave_read_only:1
```

## 2. 哨兵模式（Sentinel）

### 2.1 Sentinel 架构

```
         ┌── Sentinel 1 ──┐
         │                 │
主节点 ←─┼── Sentinel 2 ──┼─→ 从节点1
         │                 │
         └── Sentinel 3 ──┘─→ 从节点2

Sentinel 职责:
1. 监控: 检测主从节点是否正常
2. 通知: 通知管理员或其他应用
3. 自动故障转移: 主节点故障时提升从节点
4. 配置提供者: 客户端从 Sentinel 获取主节点地址
```

### 2.2 Sentinel 配置

```ini
# sentinel.conf
port 26379
sentinel monitor mymaster 192.168.1.10 6379 2
# mymaster: 主节点名称
# 192.168.1.10 6379: 主节点地址
# 2: 至少2个 Sentinel 同意才进行故障转移

sentinel auth-pass mymaster MasterPass123
sentinel down-after-milliseconds mymaster 30000     # 30秒无响应判定主观下线
sentinel failover-timeout mymaster 180000            # 故障转移超时
sentinel parallel-syncs mymaster 1                   # 同时同步的从节点数
```

### 2.3 故障转移流程

```
1. 主观下线(SDOWN): 单个 Sentinel 认为主节点不可用
2. 客观下线(ODOWN): 超过 quorum 个 Sentinel 认为主节点不可用
3. Sentinel 选举 Leader（Raft 协议）
4. Leader 执行故障转移:
   a. 选择新主节点:
      - 排除断线的从节点
      - 优先 replica-priority 最小的
      - 优先复制偏移量最大的（数据最新）
      - 优先 runid 最小的
   b. 对新主节点执行 SLAVEOF NO ONE
   c. 对其他从节点执行 SLAVEOF 新主节点
   d. 更新 Sentinel 配置
5. 客户端连接新主节点
```

### 2.4 Sentinel 客户端连接

```python
import redis
from redis.sentinel import Sentinel

# 连接 Sentinel
sentinel = Sentinel([
    ('192.168.1.10', 26379),
    ('192.168.1.11', 26379),
    ('192.168.1.12', 26379)
], socket_timeout=5)

# 获取主节点连接
master = sentinel.master_for('mymaster', password='MasterPass123')
master.set('key', 'value')

# 获取从节点连接（读操作）
slave = sentinel.slave_for('mymaster', password='MasterPass123')
value = slave.get('key')

# 发现主节点地址
master_addr = sentinel.discover_master('mymaster')
```

## 3. Redis Cluster

### 3.1 Cluster 架构

```
Redis Cluster: 无中心、分片集群

  节点A (0~5460)     节点B (5461~10922)    节点C (10923~16383)
  ┌──────────┐       ┌──────────┐          ┌──────────┐
  │ Master A │───────│ Master B │──────────│ Master C │
  │          │       │          │          │          │
  │ Slave A1 │       │ Slave B1 │          │ Slave C1 │
  └──────────┘       └──────────┘          └──────────┘

  分片规则: slot = CRC16(key) % 16384
  每个主节点负责一部分槽位
  Gossip 协议进行节点间通信
```

### 3.2 Cluster 配置

```ini
# redis.conf
cluster-enabled yes
cluster-config-file nodes-6379.conf
cluster-node-timeout 15000          # 节点超时（毫秒）
cluster-announce-ip 192.168.1.10    # 外部可达 IP
cluster-announce-port 6379
cluster-announce-bus-port 16379     # 集群总线端口

cluster-require-full-coverage yes   # 槽位不全覆盖时拒绝服务
cluster-migration-barrier 1         # 从节点迁移屏障
cluster-allow-reads-when-down no    # 集群下线时允许读
```

### 3.3 Cluster 创建

```bash
# 创建集群（6 节点: 3主3从）
redis-cli --cluster create \
  192.168.1.10:6379 192.168.1.11:6379 192.168.1.12:6379 \
  192.168.1.13:6379 192.168.1.14:6379 192.168.1.15:6379 \
  --cluster-replicas 1

# 查看集群信息
redis-cli cluster info
redis-cli cluster nodes

# 检查集群状态
redis-cli --cluster check 192.168.1.10:6379

# 添加主节点
redis-cli --cluster add-node 192.168.1.16:6379 192.168.1.10:6379

# 重新分配槽位
redis-cli --cluster reshard 192.168.1.10:6379

# 添加从节点
redis-cli --cluster add-node 192.168.1.17:6379 192.168.1.10:6379 \
  --cluster-slave --cluster-master-id <node_id>
```

### 3.4 跨槽事务

```bash
# 普通事务不支持跨槽
MULTI
SET key1 val1    # slot 9182
SET key2 val2    # slot 4998  ← 报错: CROSSSLOT

# 解决方案1: Hash Tag
SET {order}:1:name "Alice"    # 同一 hash tag → 同一槽
SET {order}:1:total 100       # 同一 hash tag → 同一槽
# Hash Tag: {} 内的内容参与 CRC16 计算

# 解决方案2: Lua 脚本（同样受限于同一节点）
# 解决方案3: 应用层分布式事务
```

### 3.5 Cluster 客户端

```python
from redis.cluster import RedisCluster

# 连接集群
rc = RedisCluster(
    host='192.168.1.10',
    port=6379,
    password='ClusterPass123',
    decode_responses=True
)

# 自动路由到正确节点
rc.set('user:1001', 'Alice')     # 自动路由到对应槽位
rc.get('user:1001')

# 批量操作（需同一槽或使用 Hash Tag）
rc.mset({'{order}:1:name': 'Alice', '{order}:1:total': '100'})

# 集群信息
rc.cluster_info()
rc.cluster_nodes()
```

## 4. 集群代理

```bash
# redis-cluster-proxy（实验性）
# 提供单入口访问 Redis Cluster

# 安装
git clone https://github.com/RedisLabs/redis-cluster-proxy.git
cd redis-cluster-proxy && make

# 启动代理
redis-cluster-proxy -p 7777 192.168.1.10:6379

# 客户端连接代理（像单机一样使用）
redis-cli -p 7777
SET key1 val1
MGET key1 key2 key3    # 代理自动处理跨槽
```

## 5. Redis Flex 混合存储引擎

### 5.1 架构

```
Redis Flex: SSD + DRAM 混合存储

  ┌──────────────────────────────┐
  │       DRAM（热数据）          │  ← 微秒级延迟
  │  热键、频繁访问的数据         │
  ├──────────────────────────────┤
  │       SSD（温/冷数据）        │  ← 亚毫秒级延迟
  │  不常访问的数据               │
  └──────────────────────────────┘

  自动分层: LRU 算法决定数据在 DRAM 还是 SSD
  成本降低约 80%，延迟 < 500μs
```

### 5.2 配置

```ini
# redis.conf (Redis Flex)
flex-enabled yes
flex-ssd-path /data/redis-ssd
flex-ssd-ratio 0.1              # DRAM:SSD = 1:10
flex-dram-max-memory 4gb        # DRAM 最大使用量
flex-ssd-max-storage 40gb       # SSD 最大使用量
flex-eviction-policy allkeys-lru
```

### 5.3 适用场景

| 场景     | 传统 Redis | Redis Flex |
| :------- | :--------- | :--------- |
| 数据量   | 受内存限制 | 可达 TB 级 |
| 成本     | 高         | 降低 80%   |
| 延迟     | < 100μs    | < 500μs    |
| 适用数据 | 热数据     | 全量数据   |
| 典型场景 | 缓存       | 数据库替代 |

## 6. Redis for AI 套件

### 6.1 向量库（Vector Set）

```bash
# 创建向量集合
VSET products:vec item1 0.1 0.2 ... 0.768
VSET products:vec item2 0.2 0.3 ... 0.768

# KNN 搜索
VSEARCH products:vec 0.1 0.15 ... 0.76 COUNT 10

# 带元数据过滤
VSET products:vec item1 0.1 0.2 ... 0.768 META category "electronics" price 299
VSEARCH products:vec 0.1 0.15 ... 0.76 COUNT 10 FILTER category == "electronics"
```

### 6.2 推理缓存

```bash
# LLM 推理缓存
# 缓存 prompt → response 映射
SET llm:cache:sha256:abc123 "response text here" EX 3600

# 语义缓存（基于向量相似度）
# 1. 将 prompt 转为向量
# 2. 在 Vector Set 中搜索相似 prompt
# 3. 相似度超过阈值则返回缓存结果
VSEARCH prompts:vec <prompt_vector> COUNT 1

# 命中缓存则直接返回，否则调用 LLM 并缓存结果
```

### 6.3 VSS 优化

```
向量相似度搜索(VSS)优化:

1. HNSW 参数调优:
   - M: 连接数（默认16，越大越精确但内存越大）
   - EF_CONSTRUCTION: 构建时搜索宽度（默认200）
   - EF_RUNTIME: 查询时搜索宽度（默认10）

2. 量化优化:
   - FP32 → FP16: 内存减半，精度损失极小
   - INT8 量化: 内存减至1/4，精度有损
   - PQ(Product Quantization): 压缩比更高

3. 分片策略:
   - 按向量 ID 哈希分片
   - 每个分片独立构建 HNSW 索引
   - 查询时并行搜索所有分片，合并结果

4. 批量操作:
   - 批量插入向量（减少索引更新开销）
   - 批量查询（pipeline）
```
