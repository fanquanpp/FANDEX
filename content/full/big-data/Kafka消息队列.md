---
order: 17
title: Kafka消息队列
module: 'big-data'
category: data
difficulty: intermediate
description: 'Kafka架构设计、Producer/Consumer模型、分区策略、Offset管理与Exactly-Once语义。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'big-data/Hive数据仓库'
  - 'big-data/HBase列族数据库'
  - 'big-data/Flink流处理'
  - 'big-data/数据湖'
prerequisites: []
---

## 1. Kafka架构设计

Kafka 是一个**分布式、高吞吐、持久化**的消息队列系统，广泛应用于实时数据管道和流处理场景。

### 1.1 核心架构

```
┌─────────────────────────────────────────────────────┐
│                    ZooKeeper / KRaft                 │
│              元数据管理 / Controller选举              │
└─────────────────────────────────────────────────────┘
         │                    │
    ┌────┴────┐          ┌───┴────┐
    ▼         ▼          ▼        ▼
┌────────┐┌────────┐┌────────┐┌────────┐
│Broker 0││Broker 1││Broker 2││Broker 3│
│P0-L    ││P0-F    ││P1-L    ││P1-F    │
│P2-F    ││P2-L    ││P3-L    ││P3-F    │
└────────┘└────────┘└────────┘└────────┘
    ▲         ▲          ▲        ▲
    │         │          │        │
┌───┴───┐┌───┴───┐  ┌───┴───┐┌──┴────┐
│Prod-1 ││Prod-2 │  │Cons-1 ││Cons-2 │
└───────┘└───────┘  └───────┘└───────┘
```

### 1.2 核心概念

| 概念               | 说明                                     |
| :----------------- | :--------------------------------------- |
| **Broker**         | Kafka服务节点，负责消息存储和转发        |
| **Topic**          | 消息的逻辑分类                           |
| **Partition**      | Topic的物理分片，有序、不可变日志        |
| **Offset**         | 消息在Partition中的唯一位置标识          |
| **Replica**        | Partition的副本，分为Leader和Follower    |
| **Consumer Group** | 消费者组，组内消费者共同消费Topic        |
| **ISR**            | In-Sync Replicas，与Leader同步的副本集合 |

### 1.3 Topic与Partition

```
Topic: orders
├── Partition 0: [msg0, msg1, msg2, ...]  Offset: 0, 1, 2, ...
├── Partition 1: [msg0, msg1, msg2, ...]  Offset: 0, 1, 2, ...
├── Partition 2: [msg0, msg1, msg2, ...]  Offset: 0, 1, 2, ...
└── Partition 3: [msg0, msg1, msg2, ...]  Offset: 0, 1, 2, ...
```

- 每个Partition是一个**有序、不可变、追加写**的日志
- Partition数量决定**最大并行度**
- 消息在Partition内有序，跨Partition无序

## 2. Producer生产者

### 2.1 发送模式

```java
// 同步发送
RecordMetadata metadata = producer.send(record).get();

// 异步发送
producer.send(record, (metadata, exception) -> {
    if (exception != null) {
        // 处理发送失败
    }
});

// 发送并忘记
producer.send(record);
```

### 2.2 分区策略

| 策略     | 说明                        | 适用场景              |
| :------- | :-------------------------- | :-------------------- |
| 指定分区 | `record.partition()`        | 精确控制              |
| Key哈希  | `hash(key) % numPartitions` | 保证相同Key到同一分区 |
| 轮询     | Round Robin                 | 均匀分布              |
| 自定义   | 实现 `Partitioner` 接口     | 业务定制              |

$$\text{partition} = \text{hash}(\text{key}) \bmod N$$

### 2.3 ACK确认机制

| acks值 | 说明        | 可靠性 | 延迟 |
| :----- | :---------- | :----- | :--- |
| 0      | 不等待确认  | 最低   | 最低 |
| 1      | Leader确认  | 中等   | 中等 |
| all    | 所有ISR确认 | 最高   | 最高 |

### 2.4 幂等生产者

```java
props.put("enable.idempotence", "true");
// 自动设置:
// acks = all
// retries = Integer.MAX_VALUE
// max.in.flight.requests.per.connection <= 5
```

幂等性保证：**单Partition内**消息不重复（通过Producer ID + Sequence Number去重）。

## 3. Consumer消费者

### 3.1 消费者组

```
Topic: orders (4 Partitions)

Consumer Group A:
  Consumer-1 ← Partition 0, Partition 1
  Consumer-2 ← Partition 2, Partition 3

Consumer Group B:
  Consumer-3 ← Partition 0, Partition 2
  Consumer-4 ← Partition 1
  Consumer-5 ← Partition 3
```

**核心规则**：

- 同一Consumer Group内，一个Partition只能被一个Consumer消费
- 不同Consumer Group之间互不影响
- Consumer数量 > Partition数量时，多余Consumer空闲

### 3.2 Offset管理

| 策略         | 说明                                | 适用场景     |
| :----------- | :---------------------------------- | :----------- |
| 自动提交     | `enable.auto.commit=true`，定期提交 | 允许少量重复 |
| 手动同步提交 | `commitSync()`                      | 确保提交成功 |
| 手动异步提交 | `commitAsync()`                     | 高吞吐       |
| 组合提交     | 异步+同步                           | 生产推荐     |

```java
// 组合提交模式
try {
    while (true) {
        ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
        for (ConsumerRecord<String, String> record : records) {
            process(record);
        }
        consumer.commitAsync(); // 异步提交
    }
} finally {
    consumer.commitSync(); // 关闭前同步确保
    consumer.close();
}
```

### 3.3 Rebalance机制

**触发条件**：Consumer加入/离开Group、订阅Topic变化、Partition变化

**Rebalance流程（Consumer Protocol）**：

```
1. FindCoordinator → 找到Group Coordinator
2. JoinGroup → Consumer请求加入Group
3. SyncGroup → Leader分配Partition方案，广播给所有成员
4. Heartbeat → 维持组成员关系
```

**分区分配策略**：

| 策略              | 算法                    | 特点               |
| :---------------- | :---------------------- | :----------------- |
| Range             | 按Partition编号范围分配 | 可能不均匀         |
| RoundRobin        | 轮询分配                | 均匀               |
| Sticky            | 尽量保持原有分配        | 最小化迁移         |
| CooperativeSticky | 增量式Rebalance         | 避免Stop-The-World |

## 4. Kafka存储与复制

### 4.1 日志存储

```
Partition数据目录:
/kafka-logs/topic-0/
├── 00000000000000000000.log     ← 消息数据
├── 00000000000000000000.index   ← 偏移量索引
├── 00000000000000000000.timeindex ← 时间戳索引
├── 00000000000005367851.log
├── 00000000000005367851.index
└── 00000000000005367851.timeindex
```

- **Segment**：每个Partition分为多个Segment（默认1GB）
- **稀疏索引**：每4KB消息建立一条索引，平衡索引大小和查询效率
- **零拷贝**：使用 `sendfile()` 系统调用，数据直接从磁盘到网卡

### 4.2 副本与ISR

```
Partition 0:
  Leader: Broker-1 (ISR)
  Follower: Broker-2 (ISR)
  Follower: Broker-3 (不在ISR，落后太多)
```

**ISR机制**：

- ISR = 与Leader保持同步的副本集合
- Follower落后超过 `replica.lag.time.max.ms`（默认30秒）则移出ISR
- 当Leader宕机，从ISR中选举新Leader
- `min.insync.replicas`：最小ISR数量，与 `acks=all` 配合使用

**数据一致性保证**：

$$\text{可靠写入} \iff \text{acks=all} \land |\text{ISR}| \geq \text{min.insync.replicas}$$

## 5. Exactly-Once语义

### 5.1 三种语义

| 语义          | 说明     | 实现难度 |
| :------------ | :------- | :------- |
| At Most Once  | 可能丢失 | 简单     |
| At Least Once | 可能重复 | 中等     |
| Exactly Once  | 精确一次 | 复杂     |

### 5.2 Kafka事务

```java
// 生产者事务
producer.initTransactions();
try {
    producer.beginTransaction();
    producer.send(record1);
    producer.send(record2);
    producer.commitTransaction();
} catch (Exception e) {
    producer.abortTransaction();
}

// 消费-处理-生产 事务（Consume-Transform-Produce）
producer.sendOffsetsToTransaction(
    offsets, consumerGroupId);
```

### 5.3 Kafka Streams Exactly-Once

```java
props.put("processing.guarantee", "exactly_once_v2");
```

通过 **Changelog Topic** + **Transaction** 实现端到端Exactly-Once。

## 6. 性能调优

### 6.1 Producer调优

| 参数               | 建议       | 说明             |
| :----------------- | :--------- | :--------------- |
| `batch.size`       | 16KB~64KB  | 批量发送大小     |
| `linger.ms`        | 5~10ms     | 等待批量填充时间 |
| `buffer.memory`    | 32MB+      | 发送缓冲区       |
| `compression.type` | lz4/snappy | 压缩算法         |

### 6.2 Consumer调优

| 参数                | 建议  | 说明               |
| :------------------ | :---- | :----------------- |
| `fetch.min.bytes`   | 1MB   | 最小拉取字节数     |
| `fetch.max.wait.ms` | 500ms | 最大等待时间       |
| `max.poll.records`  | 500   | 单次拉取最大记录数 |

### 6.3 Broker调优

| 参数                  | 建议      | 说明         |
| :-------------------- | :-------- | :----------- |
| `num.io.threads`      | CPU核数   | IO线程数     |
| `num.network.threads` | CPU核数+1 | 网络线程数   |
| `log.segment.bytes`   | 1GB       | Segment大小  |
| `log.retention.hours` | 168(7天)  | 日志保留时间 |
