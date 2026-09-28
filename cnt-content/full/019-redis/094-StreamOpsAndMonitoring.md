---
order: 90
title: Redis Stream 运维与监控：修剪、观测与故障排查
module: 'redis'
category: 数据库
difficulty: advanced
description: Redis Stream 运维全链：MAXLEN/MINID 修剪策略、XINFO 流与组观测、内存与阻塞诊断、集群注意事项、ACL 权限与慢查询/大 key 故障排查清单。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'redis/090-Stream'
  - 'redis/092-StreamConsumerGroups'
prerequisites:
  - 'redis/090-Stream'
---

> 定位说明：本篇为进阶参考书（参考层），面向已完成本模块主线的读者；入门请先走学习路径前序阶段。定位标准见 docs/standards/reference-layer.md（仓库）。

## 前置知识

- [Redis Stream 核心篇](/redis/090-Stream)：数据模型、基础命令与性能量级；
- [Redis Stream 消费者组篇](/redis/092-StreamConsumerGroups)：本篇的积压、PEL 相关排查大量引用消费者组机制，lag、PEL 等概念在那边定义。

## 学习目标

读完本篇，你将能够：

- 为"保留最近 N 条 / 最近一段时间"两类需求选择 MAXLEN 或 MINID，并说清精确修剪与近似修剪的延迟差异；
- 用 XINFO STREAM/GROUPS/CONSUMERS 读出积压、消费滞后（lag）与消费者健康状态；
- 用 MEMORY USAGE、SLOWLOG 与监控脚本定位 Stream 的内存与阻塞问题；
- 在 Redis Cluster 里用 Hash Tag 规避跨槽限制，并评估故障转移对消息的影响；
- 为消息队列场景选对 AOF/fsync 配置，说清不同 fsync 策略的丢失窗口；
- 按第 8 章的清单排查消息丢失、积压、消费者宕机、慢查询与大 key 问题。


## 第 1 章 修剪与积压治理

Stream 在内存里，不修剪就一定涨。本章回答四个问题：怎么删（XTRIM）、删多准（精确 vs 近似）、怎么自动删（XADD 内联修剪）、积压发生时怎么监控与告警。

### 1.1 XTRIM：修剪 Stream

#### 1.1.1 语法

```redis
XTRIM key <MAXLEN|MINID> [=|~] threshold [LIMIT count]
```

#### 1.1.2 参数说明

| 参数 | 说明 | 必填 |
|------|------|------|
| key | Stream 键名 | 是 |
| MAXLEN | 按数量修剪：保留最新的 threshold 条 | 是（与 MINID 二选一） |
| MINID | 按 ID 修剪：删除 ID 小于 threshold 的消息 | 是（与 MAXLEN 二选一） |
| = | 精确修剪 | 否 |
| ~ | 近似修剪 | 否 |
| threshold | 修剪阈值 | 是 |
| LIMIT count | 最多删除的条数 | 否 |

#### 1.1.3 返回值

返回被删除的消息数（整数）。

#### 1.1.4 示例代码

```redis
// 示例 1：按数量精确修剪
// 修剪 mystream，保留最新的 1000 条消息
XTRIM mystream MAXLEN 1000
// 精确修剪，确保 Stream 长度恰好为 1000
// 如果当前长度 > 1000，删除最旧的 (length-1000) 条

// 示例 2：按数量近似修剪
// 近似修剪，保留约 1000 条消息
XTRIM mystream MAXLEN ~ 1000
// ~ 近似修剪，可能保留略多于 1000 条
// 性能更好，因为可以整节点删除

// 示例 3：按 ID 修剪
// 删除 ID 小于 1718334000000-0 的消息
XTRIM mystream MINID 1718334000000-0
// 适用于按时间清理旧消息的场景

// 示例 4：按 ID 近似修剪
XTRIM mystream MINID ~ 1718334000000-0
// 近似修剪，可能保留少量 ID 小于阈值的消息

// 示例 5：限制删除数量
// 修剪但最多只删除 100 条
XTRIM mystream MAXLEN ~ 1000 LIMIT 100
// LIMIT 100 防止单次修剪阻塞时间过长
// 需要多次调用才能完成完整修剪
```

#### 1.1.5 内部执行流程

```text
// XTRIM 命令内部执行流程
//
// 1. 查找 Stream 对象
//
// 2. 确定修剪策略
//    a. MAXLEN：计算需要保留的 threshold 条消息，删除其余
//    b. MINID：删除所有 ID < threshold 的消息
//
// 3. 精确修剪（=）
//    a. 从 Radix Tree 头部开始遍历
//    b. 对每个 listpack 节点：
//       - 检查其中的消息是否需要删除
//       - 逐条标记为删除（墓碑）
//       - 如果节点内所有消息都被删除，从 Radix Tree 中移除该节点
//    c. 更新 stream.length
//
// 4. 近似修剪（~）
//    a. 从 Radix Tree 头部开始遍历
//    b. 对每个 listpack 节点：
//       - 如果该节点中所有消息都满足删除条件，整节点删除
//       - 如果部分满足，跳过该节点（不逐条删除）
//    c. 近似修剪只删除整个 listpack 节点，不精确到单条消息
//    d. 因此可能保留少量应删除的消息（在部分满足条件的节点中）
//
// 5. 处理 LIMIT
//    a. 如果指定 LIMIT，删除达到 LIMIT 后停止
//
// 6. 更新 stream.first_id
//    a. 如果删除了头部消息，更新 first_id 为新的第一条消息
//
// 7. 返回删除的消息数
```

### 1.2 精确修剪与近似修剪

```text
// 精确修剪（= 或无修饰符）
//
// 逐条检查 listpack 中的消息
// 确保 Stream 长度恰好为阈值
// 时间复杂度较高（O(N)，N 为删除的消息数）
// 适用于需要严格长度控制的场景
//
// 示例：
// Stream: [1, 2, 3, ..., 1500]  (1500 条)
// XTRIM MAXLEN 1000
// 结果: [501, 502, ..., 1500]  (恰好 1000 条)
//
//
// 近似修剪（~）
//
// 只删除整个 listpack 节点
// 不精确到单条消息
// 时间复杂度较低（O(M)，M 为删除的节点数，M << N）
// 可能保留少量应删除的消息
//
// 示例：
// Stream: [1, 2, ..., 1500]  (1500 条，存储在 15 个 listpack 节点中，每节点 100 条)
// XTRIM MAXLEN ~ 1000
// 删除前 5 个节点（500 条），保留后 10 个节点（1000 条）
// 结果: [501, 502, ..., 1500]  (恰好 1000 条，此例恰好精确)
//
// 但如果阈值不是节点大小的整数倍：
// XTRIM MAXLEN ~ 950
// 删除前 5 个节点（500 条），第 6 个节点部分消息应删除但不删
// 结果: [501, 502, ..., 1500]  (1000 条，略多于 950)
```

### 1.3 策略选择：MAXLEN 还是 MINID

- MAXLEN：按数量保留最新的 N 条。适合环形缓冲区、只关心最新消息、内存预算明确的场景；
- MINID：删除 ID 小于阈值的所有消息。ID 的毫秒段就是消息时间，MINID 天然适合"保留最近 1 小时 / 1 天"这类按时间清理的需求；
- 两者都支持在 XADD 中内联（见 1.4 节），生产环境建议一律带 ~ 近似修剪。

### 1.4 自动修剪

除了手动执行 XTRIM，还可以在 XADD 时自动修剪：

```redis
// 每次追加消息时自动修剪
XADD mystream MAXLEN 1000 * field1 value1
// 追加消息后，如果长度超过 1000，自动修剪

// 近似自动修剪
XADD mystream MAXLEN ~ 1000 * field1 value1
// 追加消息后，近似修剪到约 1000 条

// 按 ID 自动修剪
XADD mystream MINID 1718334000000-0 * field1 value1
// 追加消息后，删除 ID 小于指定值的旧消息
```

自动修剪的优点：

- 无需额外的定时任务
- 修剪与写入同步，避免积压
- 近似修剪模式下性能影响小

自动修剪的缺点：

- 每次写入都有修剪开销（虽然小）
- 精确修剪模式下可能影响写入性能
- 不够灵活，无法根据负载动态调整

### 1.5 积压监控指标

消息积压（Backlog）是指 Stream 中未被消费或未确认的消息堆积。积压监控是 Stream 运维的关键环节。

#### 1.5.1 监控指标

```text
// Stream 积压监控的关键指标
//
// 1. Stream 长度（XLEN）
//    XLEN mystream
//    表示 Stream 中的消息总数
//    增长过快可能表示生产者速度远超消费者
//
// 2. 消费者组待确认消息数（XPENDING 摘要）
//    XPENDING mystream mygroup
//    返回：[pending_count, min_id, max_id, [[consumer, count], ...]]
//    pending_count 过大可能表示消费者处理速度跟不上
//
// 3. 消费者组消费延迟
//    比较 stream.last_id 与 group.last_delivered_id
//    差值越大，消费延迟越严重
//
// 4. 消息空闲时间分布
//    XPENDING mystream mygroup - + 100 IDLE 60000
//    返回空闲超过 60 秒的待确认消息
//    数量过多可能表示消费者故障
//
// 5. 消费者活跃度
//    XINFO CONSUMERS mystream mygroup
//    查看每个消费者的 idle 和 inactive 时间
//    idle 过长可能表示消费者卡死
```
监控脚本与 Prometheus 告警见第 3 章，此处不重复贴代码。

### 1.6 积压告警

#### 1.6.1 告警阈值建议

| 指标 | 告警阈值 | 严重告警阈值 | 说明 |
|------|---------|------------|------|
| PEL 大小 | > 1000 | > 5000 | 待确认消息过多 |
| 消息空闲时间 | > 60s | > 300s | 消费者可能故障 |
| 消费延迟 | > 100 条 | > 1000 条 | 消费速度跟不上 |
| Stream 长度 | > 100000 | > 1000000 | 可能未配置修剪 |
| 消费者数 | < 预期 | 0 | 消费者全部下线 |

#### 1.6.2 告警处理流程

```text
// 积压告警处理流程
//
// 1. PEL 积压告警
//    a. 检查消费者是否存活：XINFO CONSUMERS
//    b. 检查消费者是否卡死：查看 idle 时间
//    c. 增加消费者数量：启动更多消费者实例
//    d. 检查消息处理逻辑是否有性能瓶颈
//
// 2. 消息空闲告警
//    a. 检查持有该消息的消费者状态
//    b. 如果消费者已宕机，执行 XAUTOCLAIM 重新分配
//    c. 如果消费者卡死，重启消费者
//    d. 检查是否为毒丸消息（delivery_count 过高）
//
// 3. 消费延迟告警
//    a. 检查生产者速率是否突增
//    b. 增加消费者数量
//    c. 优化消费者处理逻辑（批量处理、异步化）
//    d. 考虑使用多消费者组分流
//
// 4. Stream 长度告警
//    a. 检查是否配置了 MAXLEN/MINID 修剪
//    b. 执行紧急 XTRIM 修剪
//    c. 在 XADD 中添加自动修剪
```

---

## 第 2 章 XINFO：流与消费者组观测

XINFO 是 Stream 观测的入口：整条流的规模、每个消费者组的滞后、每个消费者的健康。XPENDING 的输出解读在[消费者组篇](/redis/092-StreamConsumerGroups)第 3 章，本篇不重复。

### 2.1 XINFO：查看信息

#### 2.1.1 语法

XINFO 包含多个子命令：

```redis
XINFO STREAM key [FULL [COUNT count]]
XINFO GROUPS key
XINFO CONSUMERS key groupname
```

#### 2.1.2 参数说明

| 子命令 | 参数 | 说明 |
|--------|------|------|
| STREAM | key | 查看 Stream 的整体信息 |
| STREAM | key FULL | 查看完整信息（含消息内容） |
| STREAM | key FULL COUNT count | 限制 FULL 模式返回的消息数 |
| GROUPS | key | 查看所有消费者组信息 |
| CONSUMERS | key groupname | 查看指定组的消费者信息 |

#### 2.1.3 返回值

**XINFO STREAM** 返回 Stream 的元信息：

- length：消息总数
- radix-tree-keys：Radix Tree 的 key 节点数
- radix-tree-nodes：Radix Tree 的总节点数
- groups：消费者组数量
- last-generated-id：最后生成的消息 ID
- first-entry：第一条消息
- last-entry：最后一条消息

**XINFO GROUPS** 返回每个消费者组的信息：

- name：组名
- consumers：消费者数量
- pending：待确认消息数
- last-delivered-id：最后投递的消息 ID

**XINFO CONSUMERS** 返回每个消费者的信息：

- name：消费者名称
- pending：该消费者的待确认消息数
- idle：空闲时间（毫秒）
- inactive：不活跃时间（毫秒）

#### 2.1.4 示例代码

```redis
// 示例 1：查看 Stream 基本信息
XINFO STREAM mystream
// 返回 Stream 的长度、Radix Tree 节点数、组数等

// 示例 2：查看 Stream 完整信息
XINFO STREAM mystream FULL
// FULL 模式返回完整的消息列表与消费者组详情
// 包括所有消息的内容、所有组的 PEL 等

// 示例 3：限制 FULL 模式返回数量
XINFO STREAM mystream FULL COUNT 10
// 只返回前 10 条消息

// 示例 4：查看所有消费者组
XINFO GROUPS mystream
// 返回每个组的名称、消费者数、待确认消息数、最后投递 ID

// 示例 5：查看组内消费者
XINFO CONSUMERS mystream mygroup
// 返回每个消费者的名称、待确认消息数、空闲时间
```

#### 2.1.5 内部执行流程

```text
// XINFO STREAM 命令内部执行流程
//
// 1. 查找 Stream 对象
//
// 2. 收集 Stream 元信息
//    a. length: stream.length
//    b. radix-tree-keys: rax->numele（Radix Tree 的 key 节点数）
//    c. radix-tree-nodes: rax->numnodes（Radix Tree 总节点数）
//    d. groups: stream.cgroups->numele
//    e. last-generated-id: stream.last_id
//    f. first-entry: 遍历 Radix Tree 获取第一条非删除消息
//    g. last-entry: 遍历 Radix Tree 获取最后一条非删除消息
//
// 3. 如果指定 FULL：
//    a. 遍历所有消息，返回完整内容
//    b. 遍历所有消费者组，返回完整 PEL
//    c. COUNT 限制返回的消息数
//
// 4. 格式化返回
```

### 2.2 关键监控指标

Stream 的运维需要关注以下核心指标：

| 指标类别 | 指标名称 | 说明 | 告警阈值 |
|---------|---------|------|---------|
| 消息积压 | Stream 长度（XLEN） | Stream 中消息总数 | > 1,000,000 |
| 消费延迟 | PEL 大小（XPENDING） | 未确认消息数 | > 10,000 |
| 消费延迟 | 消息处理延迟 | 消息从写入到 ACK 的时间 | > 60s |
| 消费者健康 | 消费者在线数 | XINFO CONSUMERS 中的活跃消费者 | < 预期数量 |
| 消费者健康 | 消费者空闲时间 | 最后一次读取距今的时间 | > 300s |
| 内存占用 | Stream 内存估算 | approximated memory | > 阈值 |
| 吞吐量 | 写入 QPS | XADD 频率 | 根据业务 |
| 吞吐量 | 消费 QPS | XREADGROUP 频率 | 根据业务 |
| 错误率 | 处理失败率 | errors / processed | > 5% |

### 2.3 XINFO 命令详解

`XINFO` 命令是 Stream 监控的核心工具，提供三个子命令：

#### 2.3.1 XINFO STREAM

查看 Stream 整体信息：

```bash
# 查看 Stream 整体信息
127.0.0.1:6379> XINFO STREAM orders

# 返回结果示例：
# 1) "length"              - Stream 中消息总数
#    (integer) 15423
# 2) "radix-tree-keys"     - Radix Tree 中的 key 节点数
#    (integer) 52
# 3) "radix-tree-nodes"    - Radix Tree 中的总节点数
#    (integer) 103
# 4) "radix-tree-bytes"    - Radix Tree 占用字节数
#    (integer) 2548
# 5) "groups"              - 消费者组数量
#    (integer) 3
# 6) "last-generated-id"   - 最后生成的消息 ID
#    "1718334600000-15422"
# 7) "max-deleted-entry-id" - 已删除消息中的最大 ID
#    "1718334500000-1000"
# 8) "entries-added"       - 历史累计添加消息数
#    (integer) 15423
# 9) "first-entry"         - 第一条消息
#    1) "1718334000000-0"
#    2) 1) "order_id"
#       2) "uuid-001"
#       ...
# 10) "last-entry"         - 最后一条消息
#     1) "1718334600000-15422"
#     2) 1) "order_id"
#        2) "uuid-15423"
#        ...
```

#### 2.3.2 XINFO GROUPS

查看所有消费者组信息：

```bash
# 查看所有消费者组
127.0.0.1:6379> XINFO GROUPS orders

# 返回结果：
# 1)  1) "name"                    - 消费者组名
#     2) "inventory"
#     3) "consumers"               - 消费者数量
#     4) (integer) 3
#     5) "pending"                 - PEL 中的待确认消息数
#     6) (integer) 42
#     7) "last-delivered-id"       - 最后投递的消息 ID
#     8) "1718334600000-15420"
#     9) "entries-read"            - 已读取的消息数
#    10) (integer) 15421
#    11) "lag"                     - 滞后消息数（未投递的）
#    12) (integer) 2
#
# 2)  1) "name"
#     2) "payment"
#     ...
```

#### 2.3.3 XINFO CONSUMERS

查看消费者组内的消费者信息：

```bash
# 查看消费者组内的消费者
127.0.0.1:6379> XINFO CONSUMERS orders inventory

# 返回结果：
# 1)  1) "name"            - 消费者名
#     2) "worker-1"
#     3) "pending"         - 该消费者 PEL 中的消息数
#     4) (integer) 15
#     5) "idle"            - 空闲时间（毫秒）
#     6) (integer) 1200
#     7) "inactive"        - 不活跃时间（毫秒）
#     8) (integer) 0
#
# 2)  1) "name"
#     2) "worker-2"
#     ...
```

---

## 第 3 章 内存与阻塞诊断

诊断 Stream 的内存与阻塞，用数据说话：阻塞读取的唤醒成本、单条消息与整体规模的真实内存、一套可运行的监控脚本与 Prometheus 告警。

### 3.1 阻塞读取的唤醒延迟

XREAD/XREADGROUP 的 BLOCK 模式在无消息时的唤醒延迟：

| 场景 | 唤醒延迟 | 说明 |
|------|---------|------|
| 单客户端阻塞 | < 1ms | XADD 后立即唤醒 |
| 100 客户端阻塞 | 1-3ms | 唤醒多个客户端的额外开销 |
| 1000 客户端阻塞 | 5-15ms | 大量客户端唤醒的开销 |
| BLOCK 超时 | < 1ms | 超时后立即返回 nil |

### 3.2 内存占用分析

#### 3.2.1 单条消息的内存占用

| 消息结构 | 内存占用 | 说明 |
|---------|---------|------|
| Entry ID（Radix Tree key 摊销） | 3-5 字节 | 共享前缀后 |
| flags 标志位 | 1 字节 | SAMEFIELDS 等标志 |
| ms-delta + seq-delta | 3-6 字节 | 变长整数编码 |
| 3 个字段值（各 20 字节） | 60 字节 | 字段名复用 Master Entry |
| lp-count 等元数据 | 5 字节 | listpack 元数据 |
| 总计 | 72-77 字节 | 每条消息约 75 字节 |

#### 3.2.2 不同消息规模的内存占用

| 消息总数 | 消息大小 | 纯数据 | Stream 实际占用 | 元数据开销比 |
|---------|---------|--------|---------------|------------|
| 1 万 | 64 bytes | 0.6 MB | 0.8 MB | 33% |
| 10 万 | 64 bytes | 6 MB | 7.6 MB | 27% |
| 100 万 | 64 bytes | 60 MB | 75 MB | 25% |
| 1000 万 | 64 bytes | 600 MB | 760 MB | 27% |
| 100 万 | 256 bytes | 240 MB | 280 MB | 17% |
| 100 万 | 1024 bytes | 960 MB | 1050 MB | 9% |

从数据可见，消息越小，元数据开销占比越大。对于 64 字节的小消息，元数据开销约 25%；对于 1KB 的大消息，元数据开销降至 9%。

#### 3.2.3 消费者组的内存开销

每个消费者组的内存开销主要来自 PEL：

| PEL 大小 | 内存占用 | 说明 |
|---------|---------|------|
| 100 条 | 约 8 KB | 每条 NACK 约 80 字节 |
| 1000 条 | 约 80 KB | |
| 10000 条 | 约 800 KB | |
| 100000 条 | 约 8 MB | PEL 过大需警惕 |

### 3.3 监控脚本示例

```python
import redis
import time
import json

class StreamMonitor:
    """Stream 监控脚本
    
    设计目标：
    - 定期采集 Stream 关键指标
    - 检测积压、消费者离线等异常
    - 输出告警信息
    
    使用方式：
    monitor = StreamMonitor('redis://localhost:6379/0', 'orders')
    monitor.run()
    """
    
    # 告警阈值
    ALERT_THRESHOLDS = {
        'stream_length': 1000000,    # Stream 长度
        'pel_size': 10000,           # PEL 大小
        'consumer_idle': 300000,     # 消费者空闲（5分钟）
        'message_delay': 60000       # 消息延迟（1分钟）
    }
    
    def __init__(self, redis_url, stream_key):
        self.client = redis.Redis.from_url(redis_url, decode_responses=True)
        self.stream_key = stream_key
    
    def collect_metrics(self) -> dict:
        """采集 Stream 监控指标
        
        返回值：指标字典
        
        核心流程：
        1. XINFO STREAM 获取 Stream 整体信息
        2. XINFO GROUPS 获取所有消费者组信息
        3. 遍历消费者组，获取 XPENDING 与消费者详情
        4. 汇总所有指标
        """
        metrics = {
            'timestamp': time.time(),
            'stream': self.stream_key,
            'alerts': []
        }
        
        # 采集 Stream 整体信息
        stream_info = self.client.xinfo_stream(self.stream_key)
        metrics['length'] = stream_info.get('length', 0)
        metrics['groups'] = stream_info.get('groups', 0)
        metrics['last_generated_id'] = stream_info.get('last-generated-id')
        
        # 检查 Stream 长度告警
        if metrics['length'] > self.ALERT_THRESHOLDS['stream_length']:
            metrics['alerts'].append({
                'level': 'WARNING',
                'message': f"Stream 长度 {metrics['length']} 超过阈值"
            })
        
        # 采集消费者组信息
        groups = self.client.xinfo_groups(self.stream_key)
        metrics['group_details'] = []
        
        for group in groups:
            group_name = group['name']
            group_detail = {
                'name': group_name,
                'consumers': group['consumers'],
                'pending': group['pending'],
                'lag': group.get('lag', 0)
            }
            
            # 检查 PEL 大小告警
            if group['pending'] > self.ALERT_THRESHOLDS['pel_size']:
                metrics['alerts'].append({
                    'level': 'WARNING',
                    'message': f"组 {group_name} PEL 大小 {group['pending']} 超过阈值"
                })
            
            # 采集消费者详情
            consumers = self.client.xinfo_consumers(
                self.stream_key, group_name
            )
            group_detail['consumer_details'] = []
            
            for consumer in consumers:
                consumer_detail = {
                    'name': consumer['name'],
                    'pending': consumer['pending'],
                    'idle': consumer['idle']
                }
                
                # 检查消费者空闲告警
                if consumer['idle'] > self.ALERT_THRESHOLDS['consumer_idle']:
                    metrics['alerts'].append({
                        'level': 'WARNING',
                        'message': f"消费者 {consumer['name']} 空闲 {consumer['idle']/1000}s"
                    })
                
                group_detail['consumer_details'].append(consumer_detail)
            
            metrics['group_details'].append(group_detail)
        
        return metrics
    
    def run(self, interval=60):
        """运行监控循环
        
        输入参数：
        - interval: 采集间隔（秒）
        """
        while True:
            metrics = self.collect_metrics()
            print(json.dumps(metrics, indent=2, ensure_ascii=False))
            if metrics['alerts']:
                for alert in metrics['alerts']:
                    print(f"[{alert['level']}] {alert['message']}")
            time.sleep(interval)

# 使用示例
if __name__ == '__main__':
    monitor = StreamMonitor(
        'redis://localhost:6379/0',
        'orders'
    )
    monitor.run(interval=30)
```

### 3.4 Prometheus + Grafana 监控

生产环境通常使用 Prometheus 采集指标，Grafana 可视化：

```yaml
# redis_exporter 配置示例
# 用于采集 Redis Stream 指标并暴露给 Prometheus
scrape_configs:
  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']
    # redis_exporter 会采集 Stream 相关指标
```

```text
# PromQL 查询示例

# Stream 长度
redis_stream_length{stream="orders"}

# PEL 大小（待确认消息数）
redis_stream_group_pending{stream="orders",group="inventory"}

# 消费者数量
redis_stream_group_consumers{stream="orders",group="inventory"}

# 消费滞后
redis_stream_group_lag{stream="orders",group="inventory"}

# 告警规则示例
# alert: StreamBacklogTooLarge
# expr: redis_stream_length > 1000000
# for: 5m
# labels:
#   severity: warning
# annotations:
#   summary: "Stream {{ $labels.stream }} 积压过大"
#   description: "Stream 长度为 {{ $value }}，超过 100 万阈值"
```

---

## 第 4 章 集群环境下的 Stream

上集群之前先读这章：Stream 的槽位分配、Hash Tag、跨槽限制与故障转移对消息的影响。

### 4.1 Redis Cluster 中 Stream 的槽位分配

Redis Cluster 采用哈希槽（Hash Slot）机制将数据分布到多个节点。整个集群有 16384 个槽位（0-16383），每个 key 通过 CRC16 计算哈希值后对 16384 取模，确定所属槽位。

Stream 作为 Redis 的一种数据类型，其键名同样遵循哈希槽分配规则：

```text
// Stream 键的槽位计算
//
// 键名：mystream
// CRC16("mystream") % 16384 = 槽位号
//
// 键名: orders:stream
// CRC16("orders:stream") % 16384 = 槽位号
//
// 键名：{orders}:stream
// CRC16("orders") % 16384 = 槽位号（Hash Tag）
// 只有 {} 内的部分参与哈希计算
```

### 4.2 Hash Tag 的使用

在 Redis Cluster 中，如果多个 key 需要在同一节点上操作（如事务、Pipeline），可以使用 Hash Tag 强制它们分配到同一槽位。Hash Tag 是键名中 `{` 和 `}` 之间的部分，只有这部分参与哈希计算。

```redis
// Hash Tag 示例
//
// 键名：{orders}:stream 和 {orders}:group_info
// 都使用 "orders" 作为 Hash Tag
// CRC16("orders") % 16384 = 相同的槽位
// 两个 key 被分配到同一节点
//
// 应用场景：
// 1. 多 Stream 操作
//    XREAD COUNT 10 STREAMS {orders}:stream1 {orders}:stream2 > >
//    两个 Stream 必须在同一槽位才能用单条 XREAD 读取
//
// 2. Stream 与相关数据同节点
//    {user:1001}:events  (Stream)
//    {user:1001}:profile (Hash)
//    两者在同一节点，可使用事务保证原子性
```

### 4.3 跨槽限制

Redis Cluster 对 Stream 操作有以下跨槽限制：

#### 4.3.1 XREAD/XREADGROUP 的跨槽限制

```redis
// 合法：单 Stream 读取
XREAD COUNT 10 STREAMS mystream >
// 单个 key 不涉及跨槽问题

// 合法：多 Stream 使用 Hash Tag
XREAD COUNT 10 STREAMS {orders}:s1 {orders}:s2 > >
// 两个 key 在同一槽位，合法

// 非法：多 Stream 跨槽
XREAD COUNT 10 STREAMS stream1 stream2 > >
// 如果 stream1 和 stream2 不在同一槽位，报错：
// CROSSSLOT Keys in request don't hash to the same slot
```

#### 4.3.2 事务与 Lua 的跨槽限制

```redis
// 合法：事务中的 key 在同一槽位
MULTI
XADD {orders}:stream * field1 value1
XLEN {orders}:stream
EXEC

// 非法：事务中的 key 跨槽
MULTI
XADD stream1 * field1 value1
XADD stream2 * field1 value1
EXEC
// 报错：CROSSSLOT
```

### 4.4 故障转移对 Stream 的影响

Redis Cluster 采用主从复制与自动故障转移机制。当主节点故障时，对应的从节点会被提升为新的主节点。

#### 4.4.1 故障转移过程中的 Stream 状态

```text
// 故障转移对 Stream 的影响
//
// 1. 主节点故障
//    a. 主节点 M1 宕机，其负责的槽位不可用
//    b. 集群检测到 M1 故障（通常 15-30 秒）
//
// 2. 从节点提升
//    a. 对应的从节点 S1 被提升为新主节点
//    b. S1 接管 M1 的槽位
//
// 3. Stream 数据恢复
//    a. S1 上的 Stream 数据来自异步复制
//    b. 可能丢失部分最新消息（复制延迟内的消息）
//    c. PEL 状态也来自复制，可能丢失最新的 PEL 变更
//
// 4. 消费者重连
//    a. 消费者通过集群路由发现新主节点
//    b. 使用 MOVED/ASK 重定向到新节点
//    c. 继续消费操作
//
// 5. 数据一致性影响
//    a. Stream 消息：可能丢失故障前的部分最新消息
//    b. PEL 状态：可能丢失故障前的部分 PEL 变更
//    c. 消费进度：可能回退到较旧的位置
//    d. 重复消费：PEL 丢失可能导致已投递但未确认的消息
//       被重新投递（消费者可能重复处理）
```

#### 4.4.2 降低故障转移影响的策略

1. **启用 WAIT 命令**：在 XADD 后使用 WAIT 确保消息已复制到至少 N 个从节点

```redis
// 确保消息至少复制到 1 个从节点，超时 100ms
XADD mystream * field1 value1
WAIT 1 100
// 返回复制的从节点数，如果 < 1，说明复制未完成
```

2. **合理设置复制延迟监控**：监控主从复制延迟，延迟过大时告警

3. **消费者幂等性**：消费者必须实现幂等性，应对故障转移导致的重复消费

4. **多可用区部署**：将主从节点分布在不同可用区，降低同时故障风险

### 4.5 集群环境下的最佳实践

```text
// Redis Cluster 下 Stream 最佳实践
//
// 1. 键名设计
//    使用 Hash Tag 将相关 Stream 分配到同一槽位
//    {app1}:events, {app1}:alerts, {app1}:logs
//
// 2. 消费者组命名
//    消费者组名不影响槽位分配，可自由命名
//    但建议包含业务标识，便于管理
//
// 3. 客户端配置
//    使用支持集群的客户端（redis-py cluster, Lettuce, go-redis）
//    启用自动重连与拓扑刷新
//
// 4. 监控
//    监控每个节点的 Stream 数量与内存占用
//    监控集群状态与故障转移事件
//
// 5. 容量规划
//    Stream 数据在内存中，需评估总内存需求
//    考虑节点故障时的内存压力（接管槽位后）
```

---

---

## 第 5 章 性能基准与容量规划

本篇给运维要用的量级数据：本机基准（判断"慢"是不是异常）、与其他 MQ 的横向对比（判断选型）、容量规划表（判断内存预算）。完整的多维选型表见[核心篇](/redis/090-Stream)第 1 章。

### 5.1 吞吐量基准测试

以下基准测试数据基于典型硬件环境（Intel Xeon E5-2670, 64GB RAM, SSD, Redis 7.x 单节点），使用 redis-benchmark 工具测试。

#### 5.1.1 XADD 吞吐量

| 消息大小 | Pipeline=1 | Pipeline=10 | Pipeline=100 | 说明 |
|---------|-----------|-------------|-------------|------|
| 64 bytes | 85,000 ops/s | 450,000 ops/s | 850,000 ops/s | 小消息，高吞吐 |
| 256 bytes | 75,000 ops/s | 380,000 ops/s | 720,000 ops/s | 中等消息 |
| 1024 bytes | 55,000 ops/s | 250,000 ops/s | 480,000 ops/s | 大消息，吞吐下降 |
| 4096 bytes | 25,000 ops/s | 95,000 ops/s | 180,000 ops/s | 大消息，吞吐显著下降 |

#### 5.1.2 XREAD 吞吐量

| 读取方式 | Pipeline=1 | Pipeline=10 | 说明 |
|---------|-----------|-------------|------|
| XREAD COUNT 1 | 92,000 ops/s | 520,000 ops/s | 单条读取 |
| XREAD COUNT 10 | 45,000 ops/s | 380,000 ops/s | 批量读取（按批次计） |
| XREAD COUNT 100 | 8,000 ops/s | 75,000 ops/s | 大批量读取 |
| XREAD BLOCK 0 | 85,000 ops/s | - | 阻塞读取（有消息时） |

#### 5.1.3 消费者组操作吞吐量

| 操作 | 吞吐量 | 说明 |
|------|--------|------|
| XREADGROUP > COUNT 1 | 80,000 ops/s | 读取新消息并加入 PEL |
| XREADGROUP > COUNT 10 | 42,000 ops/s | 批量读取 |
| XACK (单条) | 95,000 ops/s | 确认消息 |
| XACK (10条批量) | 50,000 ops/s | 批量确认 |
| XCLAIM | 70,000 ops/s | 认领消息 |
| XAUTOCLAIM COUNT 100 | 15,000 ops/s | 自动认领（含 PEL 扫描） |

### 5.2 命令延迟分布

| 操作 | P50 | P95 | P99 | P999 | 说明 |
|------|-----|-----|-----|------|------|
| XADD | 0.15ms | 0.35ms | 0.65ms | 2.1ms | 追加消息 |
| XREAD | 0.12ms | 0.28ms | 0.55ms | 1.8ms | 读取消息 |
| XRANGE | 0.18ms | 0.45ms | 0.85ms | 3.2ms | 范围读取 |
| XLEN | 0.05ms | 0.12ms | 0.25ms | 0.8ms | 获取长度（O(1)） |
| XACK | 0.10ms | 0.25ms | 0.50ms | 1.5ms | 确认消息 |
| XTRIM (精确) | 5.2ms | 15.3ms | 28.7ms | 85ms | 修剪（逐条删除） |
| XTRIM (近似) | 0.8ms | 2.1ms | 4.5ms | 12ms | 修剪（整节点删除） |
| XDEL (单条) | 0.12ms | 0.30ms | 0.60ms | 2.0ms | 删除消息 |
| XPENDING (摘要) | 0.08ms | 0.20ms | 0.40ms | 1.2ms | PEL 摘要 |
| XINFO STREAM | 0.10ms | 0.25ms | 0.50ms | 1.5ms | Stream 信息 |

### 5.3 吞吐量对比

| 系统 | 单节点吞吐量 | 集群吞吐量 | 说明 |
|------|------------|-----------|------|
| Redis Stream | 85,000-150,000 msg/s | 500,000-1,000,000 msg/s | 内存存储，低延迟 |
| Kafka | 100,000-200,000 msg/s | 1,000,000-5,000,000+ msg/s | 磁盘顺序写，高吞吐 |
| RabbitMQ | 20,000-50,000 msg/s | 100,000-500,000 msg/s | Erlang VM，灵活路由 |
| RocketMQ | 50,000-100,000 msg/s | 500,000-2,000,000 msg/s | Java，金融级可靠 |
| Apache Pulsar | 100,000-300,000 msg/s | 1,000,000-5,000,000+ msg/s | 计算存储分离 |

### 5.4 延迟对比

| 系统 | P50 延迟 | P99 延迟 | 说明 |
|------|---------|---------|------|
| Redis Stream | 0.1-0.3ms | 0.5-2ms | 内存存储，最低延迟 |
| Kafka | 2-10ms | 10-50ms | 批量优化，延迟较高 |
| RabbitMQ | 0.5-2ms | 5-20ms | 中等延迟 |
| RocketMQ | 1-5ms | 10-30ms | 同步刷盘时延迟较高 |
| Apache Pulsar | 2-8ms | 10-40ms | 与 Kafka 类似 |

### 5.5 容量规划建议

| 消息量级 | 建议 Stream 数 | 消费者数 | MAXLEN | 内存预估 |
|---------|--------------|---------|--------|---------|
| 1万/天 | 1 | 2 | 10万 | 10MB |
| 10万/天 | 1-2 | 4 | 100万 | 100MB |
| 100万/天 | 2-5 | 8 | 500万 | 500MB-1GB |
| 1000万/天 | 5-10 | 16 | 1000万 | 1-5GB |

---

## 第 6 章 安全性与权限控制

### 6.1 Redis ACL 与 Stream

Redis 6.0 引入 ACL（Access Control List）机制，可对 Stream 命令进行细粒度权限控制。

#### 6.1.1 用户与权限管理

```bash
# 创建生产者用户，仅允许 XADD/XLEN
ACL SETUSER producer_user on >producer_password ~orders:* +xadd +xlen +xinfo

# 创建消费者用户，允许 XREADGROUP/XACK/XGROUP
ACL SETUSER consumer_user on >consumer_password ~orders:* +xreadgroup +xack +xgroup +xinfo +xpending

# 创建监控用户，仅允许 XINFO/XLEN/XPENDING
ACL SETUSER monitor_user on >monitor_password ~orders:* +xinfo +xlen +xpending

# 查看用户列表
ACL USERS

# 查看用户权限
ACL GETUSER producer_user
```

#### 6.1.2 权限设计原则

| 角色 | 允许命令 | 说明 |
|------|---------|------|
| producer | XADD, XLEN, XINFO STREAM | 仅生产消息 |
| consumer | XREADGROUP, XACK, XPENDING, XINFO | 消费与确认 |
| group_admin | XGROUP CREATE/DESTROY/CREATECONSUMER/DELCONSUMER | 管理消费者组 |
| monitor | XINFO, XLEN, XPENDING | 只读监控 |
| admin | 全部命令 | 完全管理权限 |

### 6.2 网络安全

#### 6.2.1 TLS 加密传输

```bash
# Redis 配置文件中启用 TLS
# redis.conf
port 0
tls-port 6379
tls-cert-file /path/to/redis.crt
tls-key-file /path/to/redis.key
tls-ca-cert-file /path/to/ca.crt
tls-auth-clients yes
```

#### 6.2.2 网络隔离

- 生产环境应将 Redis 部署在内网，不暴露公网
- 使用防火墙/安全组限制访问来源
- VPN/专线连接远程 Redis

### 6.3 数据安全

#### 6.3.1 敏感数据加密

Stream 中的消息内容为明文存储，敏感数据应在写入前加密：

```python
from cryptography.fernet import Fernet

class SecureStreamProducer:
    """安全 Stream 生产者：加密敏感字段
    
    设计要点：
    - 使用对称加密（AES）加密敏感字段
    - 密钥由 KMS 管理，不硬编码
    """
    
    def __init__(self, redis_url, encryption_key):
        self.client = redis.Redis.from_url(redis_url, decode_responses=True)
        self.cipher = Fernet(encryption_key)
    
    def add_message(self, stream_key, fields: dict, sensitive_fields: list):
        """添加消息，加密敏感字段
        
        输入参数：
        - stream_key: Stream 键名
        - fields: 消息字段
        - sensitive_fields: 需要加密的字段名列表
        """
        encrypted_fields = {}
        for k, v in fields.items():
            if k in sensitive_fields:
                # 加密敏感字段
                encrypted_fields[k] = self.cipher.encrypt(
                    str(v).encode()
                ).decode()
            else:
                encrypted_fields[k] = v
        self.client.xadd(stream_key, encrypted_fields)
```

#### 6.3.2 审计日志

通过 Redis 的 MONITOR 命令或 ACL LOG 记录关键操作：

```bash
# 查看 ACL 操作日志
ACL LOG

# 返回最近的 ACL 操作记录，包括：
# - 认证成功/失败
# - 权限拒绝事件
# - 命令执行记录
```


---

## 第 7 章 持久化与 fsync 策略

消费者组篇讲的是"投递不丢"，本篇回答它的前提：Redis 自己重启时数据还在不在。结论先行——消息队列场景建议 appendonly yes + appendfsync everysec；更高要求看 7.2 节的 fsync 取舍表。

### 7.1 与 RDB/AOF 持久化的关系

#### 7.1.1 RDB 持久化下的 Stream

RDB（Redis Database）是 Redis 的快照持久化机制。在 RDB 持久化下：

- Stream 的完整状态（包括消息、消费者组、PEL）会被序列化到 RDB 文件
- RDB 是某一时刻的完整快照，恢复时 Stream 状态恢复到快照时间点
- 快照之后的增量消息可能丢失

RDB 持久化的触发方式：

- `save` 配置：基于时间与变更数量的自动触发
- `BGSAVE` 命令：手动触发后台保存
- 主从复制中的全量同步

#### 7.1.2 AOF 持久化下的 Stream

AOF（Append-Only File）是 Redis 的日志持久化机制。在 AOF 持久化下：

- 每条写命令（XADD、XDEL、XGROUP、XACK 等）被追加到 AOF 文件
- 恢复时重放 AOF 文件中的命令，重建 Stream 状态
- AOF 的数据完整性取决于 appendfsync 配置

AOF 的三种 fsync 策略：

| 策略 | 说明 | 数据丢失风险 | 性能影响 |
|------|------|------------|---------|
| always | 每条命令都 fsync | 最多丢失 1 条命令 | 严重影响性能 |
| everysec | 每秒 fsync 一次 | 最多丢失 1 秒数据 | 轻微影响（推荐） |
| no | 由 OS 决定 fsync 时机 | 丢失上次 OS fsync 后的数据 | 无影响 |

#### 7.1.3 持久化配置建议

对于消息可靠性要求较高的场景：

```bash
# redis.conf 推荐配置

# 开启 AOF
appendonly yes

# 每秒 fsync（兼顾性能与可靠性）
appendfsync everysec

# AOF 重写触发条件
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# 同时保留 RDB 作为备份
save 900 1
save 300 10
save 60 10000

# 如果可靠性要求极高，考虑 appendfsync always
# 但需评估性能影响（吞吐量可能下降 10 倍以上）
```

### 7.2 FSYNC 策略详解

FSYNC 是操作系统层面的磁盘同步操作，将文件系统缓冲区的数据刷写到物理磁盘。Redis AOF 的 appendfsync 配置控制 fsync 的频率。

#### 7.2.1 fsync 的性能影响

```text
// fsync 性能影响分析
//
// 测试环境：SSD 磁盘，典型 Linux 服务器
//
// appendfsync always:
//   - 每条命令都 fsync
//   - XADD 吞吐量：约 1,000-3,000 ops/s
//   - 延迟：每次 fsync 约 1-10ms
//   - 适用场景：金融级可靠性要求
//
// appendfsync everysec:
//   - 每秒 fsync 一次
//   - XADD 吞吐量：约 50,000-100,000 ops/s
//   - 延迟：无额外延迟（fsync 在后台线程）
//   - 适用场景：大多数业务场景（推荐）
//
// appendfsync no:
//   - 不主动 fsync，由 OS 决定
//   - XADD 吞吐量：约 80,000-150,000 ops/s
//   - 延迟：无额外延迟
//   - 适用场景：可容忍数据丢失的场景
```

#### 7.2.2 Stream 场景下的 fsync 选择

| 场景 | 推荐 fsync 策略 | 理由 |
|------|----------------|------|
| 金融交易 | always | 每条消息都不能丢失 |
| 订单处理 | everysec | 1 秒内的丢失可接受，性能优先 |
| 日志收集 | no / everysec | 少量日志丢失可接受 |
| 实时通知 | no | 通知丢失影响小，性能优先 |
| 事件溯源 | always | 事件不能丢失，重建需要完整日志 |

---

## 第 8 章 故障排查清单

按现象分的排查手册：消息丢失、消息积压、消费者宕机各一节，再补慢查询/大 key 场景与两个高频疑问。PEL 膨胀与毒消息的机制侧见[消费者组篇](/redis/092-StreamConsumerGroups)第 3 章。

### 8.1 消息丢失问题排查

#### 8.1.1 现象

消费者处理了消息但消息"丢失"：重启后发现部分消息未被处理，或业务数据与消息流不一致。

#### 8.1.2 排查步骤

```bash
// 消息丢失排查流程
//
// 1. 检查消息是否真正写入 Stream
//    XLEN stream_key
//    XRANGE stream_key - + COUNT 100
//
// 2. 检查消费者组的 last_delivered_id
//    XINFO GROUPS stream_key
//    若 last_delivered_id 落后于 Stream last_generated_id，说明消息未被投递
//
// 3. 检查 PEL 中是否有未确认的消息
//    XPENDING stream_key group_name
//    若 PEL 中有消息，说明消息已投递但未确认
//
// 4. 检查消费者是否在线
//    XINFO CONSUMERS stream_key group_name
//    若消费者 idle 时间过长，可能已宕机
//
// 5. 检查持久化配置
//    CONFIG GET save
//    CONFIG GET appendonly
//    若未开启持久化，Redis 重启后消息丢失
```

#### 8.1.3 常见原因与解决方案

| 原因 | 现象 | 解决方案 |
|------|------|---------|
| 未开启持久化 | Redis 重启后消息丢失 | 开启 AOF（appendonly yes）|
| 消费者处理失败未重投 | PEL 中消息堆积 | 实现 XCLAIM/XAUTOCLAIM 重投机制 |
| XACK 过早确认 | 处理失败但消息已确认 | 确保"处理成功后再 XACK" |
| XTRIM 修剪误删 | 历史消息被修剪 | 调整 MAXLEN/MINID 策略 |
| 时钟回拨导致 ID 异常 | 消息 ID 不单调 | 检查 NTP 配置，Redis 内部有保护 |

### 8.2 消息积压问题排查

#### 8.2.1 现象

Stream 长度持续增长，消费者组 lag 持续增大，消息处理延迟越来越高。

#### 8.2.2 排查步骤

```bash
# 1. 查看 Stream 长度
XLEN orders
# 若超过百万级，说明积压严重

# 2. 查看消费者组 lag
XINFO GROUPS orders
# 关注 lag 字段，若持续增长说明消费速度跟不上生产速度

# 3. 查看 PEL 大小
XPENDING orders inventory
# PEL 过大说明消费者处理速度慢或处理失败

# 4. 查看消费者状态
XINFO CONSUMERS orders inventory
# 关注 idle 时间与 pending 数量

# 5. 查看消费速率
# 通过 MONITOR 或慢日志分析 XREADGROUP 频率
```

#### 8.2.3 解决方案

| 方案 | 适用场景 | 操作 |
|------|---------|------|
| 增加消费者 | 消费处理慢 | 横向扩容消费者实例 |
| 优化处理逻辑 | 单条消息处理耗时 | 异步化、批量化处理 |
| 修剪历史消息 | 内存压力 | XTRIM MAXLEN/MINID |
| 限流生产者 | 生产速度过快 | 生产端限流降级 |
| 死信转移 | 毒消息反复失败 | XCLAIM 转移到死信 Stream |

### 8.3 消费者宕机恢复

#### 8.3.1 现象

某消费者实例宕机后，其 PEL 中的消息无人处理，导致部分业务停滞。

#### 8.3.2 恢复流程

```text
// 消费者宕机恢复流程
//
// 1. 检测消费者宕机
//    XINFO CONSUMERS stream group
//    若某消费者 idle 时间超过阈值（如 5 分钟），判定为宕机
//
// 2. 转移 PEL 中的消息
//    方式一：XCLAIM 手动转移指定消息
//    XCLAIM stream group new_consumer min_idle_time msg_id [msg_id...]
//
//    方式二：XAUTOCLAIM 自动批量转移
//    XAUTOCLAIM stream group new_consumer min_idle_time start [COUNT count]
//
// 3. 删除宕机消费者（可选）
//    XGROUP DELCONSUMER stream group dead_consumer
//    返回该消费者 PEL 中的消息数
//
// 4. 健康消费者重新处理转移的消息
```

#### 8.3.3 自动恢复脚本

```python
def recover_dead_consumers(client, stream_key, group_name, 
                            idle_threshold=300000):
    """自动恢复宕机消费者的消息
    
    输入参数：
    - client: Redis 客户端
    - stream_key: Stream 键名
    - group_name: 消费者组名
    - idle_threshold: 判定宕机的空闲阈值（毫秒）
    
    返回值：恢复的消息数
    
    核心流程：
    1. 遍历消费者列表
    2. 检测空闲时间超阈值的消费者
    3. XAUTOCLAIM 转移其 PEL 消息到活跃消费者
    4. 删除宕机消费者
    """
    recovered = 0
    consumers = client.xinfo_consumers(stream_key, group_name)
    
    for consumer in consumers:
        if consumer['idle'] > idle_threshold and consumer['pending'] > 0:
            # 宕机消费者，转移其消息
            next_id, claimed, deleted = client.xautoclaim(
                stream_key, group_name, 'recovery-worker',
                min_idle_time=idle_threshold,
                start_id='0-0',
                count=1000
            )
            recovered += len(claimed)
            
            # 删除宕机消费者
            client.xgroup_delconsumer(
                stream_key, group_name, consumer['name']
            )
            print(f"恢复消费者 {consumer['name']} 的 {len(claimed)} 条消息")
    
    return recovered
```

### 8.4 慢查询与大 key 场景

Stream 相关操作整体是 O(1) 或对数级别，但下面几类用法会把代价放大到与数据量成正比，是慢查询与大 key 的主要来源：

| 风险点 | 为什么慢 | 排查与缓解 |
|--------|---------|-----------|
| 无 COUNT 的 XRANGE/XREVRANGE 大范围读取 | 一次性遍历大量 listpack 节点并序列化 | 一律带 COUNT 分页（核心篇 3.4 节的分页示例） |
| XINFO STREAM FULL | 返回全量消息与所有组的 PEL | 用 FULL COUNT n 限制，或改用不带 FULL 的概要 |
| PEL 过大后的 XPENDING 详细扫描 | 遍历组级 PEL 的 Radix Tree | 先看 XPENDING 概览，控制 PEL 上限（消费者组篇 3.5 节） |
| 精确修剪（无 ~） | 逐条标记墓碑，见本章 1.2 节延迟对比 | 生产环境用 MAXLEN ~ / MINID ~ 近似修剪 |
| 单个 Stream 成为巨 key | 消息持续堆积、未配置修剪 | XLEN + MEMORY USAGE 评估，配合 MAXLEN/MINID 治理 |

通用排查入口：

```redis
# 慢日志：确认慢命令是否为 Stream 命令
SLOWLOG GET 10

# 评估单个 Stream 的内存占用
MEMORY USAGE orders

# 概要与规模：length 与 radix-tree-* 字段
XINFO STREAM orders
```

两条纪律：MONITOR 开销大，只适合短时间人工诊断；线上排障优先用 XINFO/XPENDING 这类概要命令，不要把消息整段拉回客户端数数。

### 8.5 修剪与有序性的两个高频疑问

- Q：XADD 的 MAXLEN 与 MINID 如何选择？A：MAXLEN N 保留最近 N 条，适合固定容量；MINID id 按 ID（即时间）修剪，适合按时间保留。加 ~ 近似修剪，性能更好、允许少量误差；
- Q：Stream 的消息有序保证范围？A：单个 Stream 内全局有序（按 Entry ID 递增）；Redis Cluster 下单个 Stream 只在一个节点上，天然有序；需要跨节点有序时，用 Hash Tag 把相关 Stream 路由到同一节点（第 4 章）。

---

## 第 9 章 Redis 7+ 与版本演进

Stream 的运维面在最近几个版本持续增强。排查问题时先确认服务器版本（`redis-cli INFO server` 中的 redis_version），避免用旧版本行为套新输出：

- Redis 6.2：新增 XAUTOCLAIM（自动认领空闲消息，见消费者组篇第 2 章）；XADD 支持 NOMKSTREAM；XPENDING 详细形式支持 IDLE 过滤；
- Redis 7.0：XINFO GROUPS 新增 entries-read 与 lag 字段（本章 2.3 节输出解读），"消费滞后多少条"从估算变成现成字段；XINFO CONSUMERS 新增 inactive 字段，区分"有连接但没读消息"与"彻底失联"；XGROUP 新增 CREATECONSUMER 子命令；XAUTOCLAIM 返回值增加第三段（已被 XDEL 的消息 ID 列表），PEL 里的墓碑清理有了原生出口；
- Redis 8.x：XREADGROUP 新增 CLAIM 参数，把"认领空闲消息"合并进读取调用，减少网络往返（见消费者组篇 2.2 与 3.4 节）。

只需要记住一条版本纪律：lag 与 inactive 字段在 7.0 之前的输出里不存在，监控脚本要做兼容判断。

---

## 第 10 章 反模式清单

五个典型反模式，每个都给错误写法与替代方案。其中 PEL 无限增长的完整处置见[消费者组篇](/redis/092-StreamConsumerGroups)第 3 章，此处只留索引。

### 10.1 用 Stream 实现延迟消息

```text
// 错误：Stream 不支持延迟消息
// 尝试通过定时 XADD 实现延迟：
//   1. 消息需要延迟 30 分钟处理
//   2. 30 分钟后 XADD 到 Stream
// 问题：需要额外的定时器服务，复杂度高
// 正确方案：使用 Redis 的 Sorted Set + 定时轮询，或使用 RocketMQ 原生延迟消息
```

### 10.2 用单个 Stream 承载所有业务

```text
// 错误：所有业务消息写入同一个 Stream
//   orders_stream: 订单消息、日志消息、通知消息、...
// 问题：
//   - 消费者需要过滤无关消息
//   - 不同业务的消息互相影响
//   - 无法独立控制各业务的修剪策略
// 正确方案：按业务划分 Stream
//   orders_stream, logs_stream, notify_stream, ...
```

### 10.3 消费者组不删除

```text
// 错误：创建消费者组后从不删除
// 问题：每个消费者组维护 last_delivered_id 与 PEL，占用内存
//   且影响 XTRIM 的修剪决策（min_cgroup_last_id）
// 正确方案：不再使用的消费者组应及时删除
//   XGROUP DESTROY stream group
```

### 10.4 在 Cluster 中跨槽操作

```text
// 错误：XADD 与 XREADGROUP 操作的 Stream 在不同槽
//   XADD orders:1 ...   // 槽 A
//   XREADGROUP group consumer STREAMS orders:2 ...  // 槽 B
// 问题：跨槽操作触发 MOVED 重定向，性能下降
// 正确方案：使用 Hash Tag 强制同槽
//   XADD {orders}:1 ...  // 槽由 {orders} 决定
//   XREADGROUP ... STREAMS {orders}:2 ...
```

---

## 第 11 章 命令速查与总结

### 11.1 修剪与观测命令速查

**基本写法：查看 Stream 信息**
`XINFO STREAM <key>`
```bash
# 查看 Stream 详细信息
XINFO STREAM mystream
```

**基本写法：按最大长度修剪 Stream**
`XTRIM <key> MAXLEN <count>`
```bash
# 按最大长度修剪Stream为10000条
XTRIM mystream MAXLEN 10000
```

**基本写法：按最小 ID 修剪 Stream**
`XTRIM <key> MINID <id>`
```bash
# 删除ID小于指定值的消息
XTRIM mystream MINID 1718334600000-0
```

**基本写法：查看所有消费者组**
`XINFO GROUPS <key>`
```bash
# 查看Stream的所有消费者组
XINFO GROUPS mystream
```

**基本写法：查看消费者组内消费者**
`XINFO CONSUMERS <key> <group>`
```bash
# 查看消费者组mygroup内的消费者
XINFO CONSUMERS mystream mygroup
```

### 11.2 总结

本篇覆盖 Stream 的运维闭环：修剪策略控制内存（第 1 章）、XINFO 观测（第 2 章）、内存与阻塞诊断（第 3 章）、集群与安全（第 4、6 章）、性能基准与容量规划（第 5 章）、持久化配置（第 7 章）、故障排查清单（第 8 章）。与另外两篇的分工：数据模型与基础命令见[核心篇](/redis/090-Stream)，消费者组机制见[消费者组篇](/redis/092-StreamConsumerGroups)。

建议把第 8 章的清单落成 runbook：每次线上 Stream 告警，按"XLEN → XINFO GROUPS（看 lag）→ XPENDING（看 PEL）→ XINFO CONSUMERS（看 idle）→ SLOWLOG / MEMORY USAGE"的顺序走一遍，绝大多数问题能在五分钟内定位。
