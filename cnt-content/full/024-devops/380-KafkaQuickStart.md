---
order: 380
title: Kafka 快速上手
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: 主题、分区、消费组的核心模型，Docker Compose 起集群，命令行收发消息与分区键。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'devops/370-MessageQueueOverview'
  - 'devops/400-ReliableMessagingPatterns'
  - 'go/540-GoMessageQueue'
prerequisites:
  - 'devops/370-MessageQueueOverview'
---

## 0. 一句话理解

> Kafka 把消息写进"主题"里，主题拆成多个"分区"并行存储；同一条 key 的消息永远进同一分区，所以分区内有序。

## 1. 用 Docker Compose 启动

```yaml
# docker-compose.yml
services:
  kafka:
    image: apache/kafka:4.0 # 官方镜像，KRaft 模式（4.0 起已彻底移除 ZooKeeper）
    ports:
      - "9092:9092"
    environment:
      # 单机开发配置：宿主机与容器内各用一个监听地址
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
```

```bash
docker compose up -d
docker exec -it kafka-kafka-1 /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --create --topic orders --partitions 3
```

**讲解：**

1. `apache/kafka:4.0` 是官方镜像；Kafka 4.0（2025-03）起完全移除 ZooKeeper，
   元数据由 KRaft 协议自治——网上教程里的 `--zookeeper` 参数都已过时。
2. `--partitions 3` 为主题建 3 个分区：分区是并行度单位，分区越多吞吐越高。
3. `--bootstrap-server` 指定集群入口地址，命令行工具都靠它连接。

## 2. 命令行收发消息

```bash
# 启动生产者（输入一行，回车发送一条）
docker exec -it kafka-kafka-1 /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server localhost:9092 --topic orders

# 另开终端启动消费者
docker exec -it kafka-kafka-1 /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic orders --from-beginning
```

**讲解：**

1. 生产者输入 `{"orderId":1,"amount":99}` 回车即发送，消费者终端实时打印。
2. `--from-beginning` 表示从头消费所有历史消息——Kafka 的消息默认保留 7 天，可重放。
3. 生产代码使用官方客户端（Java/Go/Python 等），命令行为学习调试用。

## 3. 分区键与顺序

```text
消息 A（key=user-1） -> 分区 0
消息 B（key=user-1） -> 分区 0
消息 C（key=user-2） -> 分区 1
```

**讲解：**

1. 发送时带 key，Kafka 对 key 做哈希决定分区：**同一个 key 永远进同一分区**。
2. 分区内消息按写入顺序存储、消费组内同一分区的消息也按顺序投递给同一个消费者实例。
3. 因此"同一用户的订单事件必须有序"就用 `key=userId`；全局有序则需要单分区（牺牲吞吐）。

## 4. 消费组

```bash
docker exec -it kafka-kafka-1 /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic orders --group order-handler
```

**讲解：**

1. `--group order-handler` 声明消费组：组内多个消费者实例自动平分分区（3 分区最多 3 个实例并行）。
2. 消费组记录了"消费到哪个偏移量"：重启后从上次位置继续，不会从头再来（除非 `--from-beginning`）。
3. 组内一个实例挂了，其分区自动分配给组内其他实例——这是 Kafka 高可用的基础。

## 5. 运维视角的三个关键配置

```bash
# 查看主题详情（分区/副本/保留时间）
docker exec -it kafka-kafka-1 /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --describe --topic orders

# 查看消费组 Lag（积压量）——Kafka 运维第一指标
docker exec -it kafka-kafka-1 /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --describe --group order-handler
```

| 配置 | 默认 | 生产建议 |
| :--- | :--- | :--- |
| `retention.ms` | 7 天（604800000） | 按回放需求定，磁盘紧可缩短 |
| `min.insync.replicas` | 1 | 生产设 2（配合副本数 3 + acks=all 才不丢） |
| 分区数 | 建主题时指定 | 宁多勿少（分区只能增不能减），但要预留消费端处理能力 |

## 6. 用客户端代码收发（Python 示例）

```python
# producer.py
from confluent_kafka import Producer

p = Producer({"bootstrap.servers": "localhost:9092",
              "enable.idempotence": True})  # 幂等生产者：Broker 侧去重，防重试产生重复

def delivery(err, msg):
    print("发送失败" if err else f"已写入 {msg.topic()}[{msg.partition()}]@{msg.offset()}")

p.produce("orders", key="user-1", value=b'{"orderId":1}', on_delivery=delivery)
p.flush(10)  # 等待缓冲区消息全部发出
```

```python
# consumer.py
from confluent_kafka import Consumer

c = Consumer({"bootstrap.servers": "localhost:9092",
              "group.id": "order-handler",
              "auto.offset.reset": "earliest",       # 无位移记录时从头读
              "enable.auto.commit": False})          # 手动提交：处理完再记位移
c.subscribe(["orders"])

while True:
    msg = c.poll(1.0)
    if msg is None:
        continue
    if msg.error():
        continue  # 忽略 EOF 等事件
    print("处理:", msg.value().decode(), "key=", msg.key())
    c.commit(msg)  # 处理成功才提交位移；先提交后处理会丢消息
```

讲解：生产端幂等 + 消费端"处理后提交位移"是 Kafka 可靠语义的最小实现组合；
`key` 相同的消息进入同一分区，与第 3 节的顺序保证直接对应。

## 7. 常见陷阱

| 陷阱 | 现象 | 正确姿势 |
| :--- | :--- | :--- |
| 不带 key 生产 | 同一订单事件被轮询到不同分区，顺序全乱 | 有顺序诉求的消息必须带业务 key |
| 副本 1 + acks=1 上生产 | Broker 宕机丢消息 | 副本 3 + `min.insync.replicas=2` + `acks=all` |
| 消费组实例数 > 分区数 | 多出的实例空转 | 实例数 <= 分区数，或先加分区 |
| 重平衡风暴 | 消费者频繁抖动导致整组停摆 | 调 `max.poll.interval.ms`，避免消费逻辑超时 |
| 消息体塞大文件 | 页缓存失效、副本同步超时 | 消息传引用（对象存储 URL），别传内容 |
| 只监控 Broker 不管 Lag | 用户先于监控发现"数据没处理" | Lag 告警是 Kafka 监控的第一优先级 |

## 8. 动手试试

1. 创建 `user-events` 主题（3 分区），用同一个 key 发 5 条消息，观察它们是否总进同一分区。
2. 起两个同组消费者，发 6 条消息，观察消息如何被两个消费者平分。
3. 停止消费者再启动（不删 group），发新消息，确认不会重复消费旧消息。
4. 用 `kafka-consumer-groups.sh --describe` 读取 Lag，故意停掉消费者让它涨起来，
   再启动看它归零。

## 9. 一句话记住

> Kafka 的消息存在分区里：key 决定分区、分区决定顺序、消费组决定并行；消息保留可重放是它与传统队列最大的不同；生产可靠性的底线是 acks=all + 多副本。
