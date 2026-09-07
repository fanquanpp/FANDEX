---
order: 70
title: Kafka 快速上手
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: 主题、分区、消费组的核心模型，Docker Compose 起集群，命令行收发消息与分区键。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'devops/006-MessageQueueOverview'
  - 'devops/009-ReliableMessagingPatterns'
  - 'go/029-GoMessageQueue'
prerequisites:
  - 'devops/006-MessageQueueOverview'
---

## 0. 一句话理解

> Kafka 把消息写进"主题"里，主题拆成多个"分区"并行存储；同一条 key 的消息永远进同一分区，所以分区内有序。

## 1. 用 Docker Compose 启动

```yaml
# docker-compose.yml
services:
  kafka:
    image: apache/kafka:4.0
    ports:
      - "9092:9092"
```

```bash
docker compose up -d
docker exec -it kafka-kafka-1 /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --create --topic orders --partitions 3
```

**讲解：**

1. `apache/kafka:4.0` 是官方镜像（Kafka 4.x 为 2025 起的当前主线）。
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

## 5. 动手试试

1. 创建 `user-events` 主题（3 分区），用同一个 key 发 5 条消息，观察它们是否总进同一分区。
2. 起两个同组消费者，发 6 条消息，观察消息如何被两个消费者平分。
3. 停止消费者再启动（不删 group），发新消息，确认不会重复消费旧消息。

## 6. 一句话记住

> Kafka 的消息存在分区里：key 决定分区、分区决定顺序、消费组决定并行；消息保留可重放，是它与传统队列最大的不同。
