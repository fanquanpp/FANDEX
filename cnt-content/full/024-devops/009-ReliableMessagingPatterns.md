---
order: 90
title: 可靠消息模式与生产实践
module: 'devops'
category: 云与基础设施
difficulty: advanced
description: 投递语义、死信队列、消费幂等、顺序保证与背压控制，把消息系统从"能通"做到"可靠"。
author: fanquanpp
updated: '2026-08-03'
related:
  - 'devops/007-KafkaQuickStart'
  - 'devops/008-RabbitMQQuickStart'
  - 'software-testing/041-EventDrivenArchitecture'
prerequisites:
  - 'devops/007-KafkaQuickStart'
  - 'devops/008-RabbitMQQuickStart'
---

## 0. 一句话理解

> 消息系统的可靠性 = 不丢（确认机制）+ 不重（消费幂等）+ 失败有去处（死信队列）+ 快慢有协调（背压）。

## 1. 不丢消息：三段确认

| 阶段 | 风险 | 对策 |
| --- | --- | --- |
| 生产者 → Broker | 网络闪断，消息没发出 | 发送确认（Kafka acks=all，RabbitMQ publisher confirms） |
| Broker 存储 | 服务器宕机丢数据 | 副本机制（Kafka 多副本、RabbitMQ 镜像/仲裁队列） |
| Broker → 消费者 | 消费者处理失败 | 手动确认：成功才 ack，失败重投 |

```python
# RabbitMQ 生产者确认（pika 示例片段）
channel.confirm_delivery()
if channel.basic_publish(...):
    print("Broker 已确认收到")
```

**讲解：**

1. `confirm_delivery()` 开启发布确认：`basic_publish` 返回成功代表 Broker 已持久化，而不是"发出去了"。
2. 消费者侧"先处理业务、后 ack"；如果先 ack 再处理，处理崩溃就会丢消息。
3. Kafka 生产端 `acks=all` 表示副本全部写入成功才确认，配合 `min.insync.replicas=2` 使用。

## 2. 消费幂等：重复无害

```python
# 幂等示例：用唯一键去重（Redis SETNX 或数据库唯一索引）
import redis

r = redis.Redis()
message_id = "order-1001-paid"

ok = r.set(message_id, "1", nx=True, ex=86400)
if ok:
    # 第一次处理
    process_payment(message_id)
else:
    # 重复消息，直接跳过
    print("重复消息，忽略")
```

**讲解：**

1. At-least-once 语义下消息可能重复投递，消费端必须"重复执行也安全"。
2. 用消息唯一 ID + 去重存储（Redis `SET NX` 或数据库唯一索引）是最常用的幂等方案。
3. 也可以设计业务天然幂等：如"把余额设置为 100"重复执行结果相同；而"余额 +10"就不幂等。

## 3. 死信队列：失败消息有去处

```text
业务队列 -> 重试 3 次仍失败 -> 死信队列（DLQ）
                                -> 人工/定时任务分析补偿
```

**讲解：**

1. 消息处理失败通常先重试（指数退避），超过次数后放入死信队列，而不是无限重试阻塞主队列。
2. 死信队列里的消息由监控告警 + 人工排查，修复后重新放回业务队列。
3. RabbitMQ 用 `x-dead-letter-exchange` 声明死信；Kafka 通常用独立的 `xxx-dlq` 主题。

## 4. 顺序保证

```text
必须有序：同一订单的事件（创建 -> 支付 -> 发货）
做法：Kafka 用 key=orderId 保证进同一分区；RabbitMQ 用单队列 + 单消费者
```

**讲解：**

1. 全局有序成本极高，99% 的场景只需要"业务键内有序"。
2. Kafka 一个分区一个消费者实例处理，顺序自然保证；分区数就是并行上限。
3. 顺序与吞吐是矛盾：要顺序就别把同一 key 的消息拆到多个分区。

## 5. 背压与消费能力

```text
生产速率 10 万/秒 > 消费速率 1 万/秒
=> 队列积压 -> 监控告警 -> 扩容消费者 / 优化消费逻辑 / 降级
```

**讲解：**

1. 消息积压（Lag）是首要监控指标：Kafka 看消费组 Lag，RabbitMQ 看队列 Ready 数量。
2. 扩容消费者前先确认瓶颈：数据库慢则加消费者也没用，先优化查询与批量处理。
3. 长期积压要考虑降级策略：丢弃非关键消息或合并批量处理，避免"雪崩式追债"。

## 6. 生产检查清单

- 生产者开启发送确认，失败有重试与告警；
- Broker 开启副本与持久化（Kafka `acks=all` + 副本数 3）；
- 消费者手动确认 + 重试 + 死信队列；
- 消费逻辑幂等，重复消息无害；
- 监控队列积压、消费 Lag、重试次数，配告警；
- 消息体带唯一 ID、时间戳与 schema 版本，便于追踪与演进。

## 7. 动手试试

1. 在 RabbitMQ 里搭"业务队列 + 死信队列"：让一条消息处理失败 3 次后进入 DLQ。
2. 用 Redis `SET NX` 实现一个消费去重器，连续投递同一 ID 两次，确认第二次被忽略。
3. 给 Kafka 消费组配一个积压告警：Lag 超过阈值时输出日志（可用命令行 `kafka-consumer-groups.sh --describe` 查看 Lag）。

## 8. 一句话记住

> 可靠 = 确认不丢 + 幂等不重 + DLQ 兜底 + Lag 监控；顺序只在业务键内保证，别拿全局有序换吞吐。
