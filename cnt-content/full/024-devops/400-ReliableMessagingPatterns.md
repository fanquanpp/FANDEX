---
order: 430
title: 可靠消息模式与生产实践
module: 'devops'
category: 云与基础设施
difficulty: advanced
description: 投递语义、死信队列、消费幂等、顺序保证与背压控制，把消息系统从"能通"做到"可靠"。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'devops/380-KafkaQuickStart'
  - 'devops/390-RabbitMQQuickStart'
  - 'software-testing/410-EventDrivenArchitecture'
prerequisites:
  - 'devops/380-KafkaQuickStart'
  - 'devops/390-RabbitMQQuickStart'
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
4. Kafka 特有陷阱——**重平衡风暴**：消费者处理耗时超过 `max.poll.interval.ms`
   会被踢出组，触发重平衡、别人也要重投，全组反复抖动。对策：调大该参数、
   控制单次 poll 返回量（`max.poll.records`）、消费逻辑异步化。

## 6. 本地消息表：把"发消息"变成"写数据库"

第一节的发送确认解决"消息到没到 Broker"，但还有一个更隐蔽的坑：
**业务写库成功、发消息失败（或反之），两边永远对不齐**。
事务性发件箱（Transactional Outbox）/本地消息表是工程标准答案：

```text
同一本地事务里：
  BEGIN
    UPDATE orders SET status = 'paid' WHERE id = 1001;   -- 业务数据
    INSERT INTO outbox (id, topic, payload) VALUES (...); -- 待发消息
  COMMIT

后台中继进程（轮询或 CDC）：
  读取 outbox 未发送行 -> 发到 MQ -> 标记已发送
```

```python
# 中继进程最小骨架（轮询版）
while True:
    rows = db.query("SELECT * FROM outbox WHERE sent = false ORDER BY id LIMIT 100")
    for row in rows:
        producer.send(row.topic, row.payload).get()  # 等确认
        db.execute("UPDATE outbox SET sent = true WHERE id = %s", (row.id,))
    time.sleep(0.5)
```

要点：

1. 业务写库与"写消息"在同一个本地事务里，要么都成功要么都不成功——
   不依赖任何分布式事务组件。
2. 中继失败重发会导致**消息重复**，回到第 2 节：消费端幂等是整个体系的兜底。
3. 生产级实现常用 CDC（Debezium 监听 outbox 表 binlog）替代轮询，延迟更低。

## 7. 生产检查清单

- 生产者开启发送确认，失败有重试与告警；
- 跨库一致性场景用本地消息表，别赌"先发消息再写库"；
- Broker 开启副本与持久化（Kafka `acks=all` + 副本数 3 + `min.insync.replicas=2`）；
- 消费者手动确认 + 重试（指数退避）+ 死信队列；
- 消费逻辑幂等，重复消息无害；
- 监控队列积压、消费 Lag、重试次数、DLQ 深度，全部配告警；
- 消息体带唯一 ID、时间戳与 schema 版本，便于追踪与演进。

## 8. 实践：动手与自检

幂等去重实验（15 分钟）：把第 2 节的 Redis 去重器写成可运行脚本，连续投递同一消息 ID
两次，观察第二次被忽略；然后人为清掉 Redis 键再投一次，观察第三次「复活」。验收：能
回答「去重键的 TTL 设多长、依据是什么」。

提示（思路方向）：TTL 要覆盖「重复投递可能发生的最长时间窗」，通常取消息保留期或业务
可容忍的重放窗口。先自己写，再对照完整实现：

```python
import redis

r = redis.Redis()

def consume_once(message_id: str, process) -> bool:
    # NX：不存在才写入；EX：过期时间兜底，防止去重表无限膨胀
    ok = r.set(f"dedup:{message_id}", "1", nx=True, ex=86400)
    if not ok:
        return False          # 24 小时内见过，直接跳过
    process()                 # 真正的业务处理
    return True

# 第一次：True（处理）；第二次：False（忽略）
print(consume_once("order-1001-paid", lambda: print("处理订单")))
print(consume_once("order-1001-paid", lambda: print("处理订单")))
```

讨论点：这个实现有一个已知的「去重成功但业务处理崩溃」的空洞（键已写入、处理没做），
生产做法是「业务完成后再标记」或用数据库唯一索引在事务里一并写——想清楚这个洞在哪，
再看第 2 节第 3 条的天然幂等思路。

延迟重试队列实验（20 分钟）：用 RabbitMQ 搭「业务队列 → 失败进 TTL 队列 → 到期转回
业务队列」的重试环（重试队列挂死信交换机指向业务队列，TTL 设 10 秒），消费端对含
`fail` 字样的消息抛异常。验收：一条失败消息在 10 秒后被重新投递，`redelivered` 标记
为 True；连挂 3 次后进真正的 DLQ。

提示（思路方向）：TTL + 死信交换机就是延迟队列的低配实现。先自己搭，再对照队列声明：

```python
# 重试队列：TTL 10 秒，到期死信回 orders
channel.queue_declare(queue="orders-retry", arguments={
    "x-message-ttl": 10000,
    "x-dead-letter-exchange": "orders",        # 死信发回业务交换机
})
# 业务队列：失败死信进 orders-dlx（第 6 节），dlx 绑定 orders-retry
channel.queue_bind(exchange="orders-dlx", queue="orders-retry")
# 计数进 DLQ：消息头 x-death 里带 count，消费端读到 count >= 3 就不再 nack 回重试队列
```

Lag 告警脚本实验（15 分钟）：写一个轮询脚本，每 10 秒读一次 Kafka 消费组 Lag，超过
阈值（如 100）打印告警日志。验收：停掉消费者让积压涨起来，脚本能在两个轮询周期内报
警；恢复消费后告警消失。

提示：Lag 数字来自第 2 节的 describe 输出。参考骨架（Shell 即可）：

```bash
#!/bin/bash
while true; do
  lag=$(docker exec kafka-kafka-1 /opt/kafka/bin/kafka-consumer-groups.sh \
    --bootstrap-server localhost:9092 --describe --group demo-group \
    | awk 'NR>1 {sum+=$6} END {print sum+0}')
  if [ "$lag" -gt 100 ]; then
    echo "$(date +%T) ALERT lag=$lag"
  fi
  sleep 10
done
```

生产化提醒：脚本版适合体会原理，真实环境用 Prometheus kafka_exporter +
[监控告警](/devops/240-MonitorAndObservability)的规则来做。

本地消息表实验（30 分钟）：建 `orders` 与 `outbox` 两张表（同一 SQLite/MySQL 库），实现
「下单事务同时写两表 + 轮询中继发消息」；中继循环里在 `producer.send` 之后人为抛异常
一次，重启中继验证同一行被补发。验收：能指出补发导致的消息重复，以及它为什么无害
（第 2 节的幂等兜底）。

提示（思路方向）：关键点是「同一事务」四个字——outbox 行的存在本身就是「待发送」的
证据，中继崩在哪个环节都能从断点续传。先自己写，再对照中继的核心逻辑：

```python
while True:
    rows = db.query("SELECT * FROM outbox WHERE sent = false ORDER BY id LIMIT 100")
    for row in rows:
        producer.send(row.topic, row.payload).get()   # 等发送确认
        db.execute("UPDATE outbox SET sent = true WHERE id = %s", (row.id,))
        db.commit()
    time.sleep(0.5)
# 崩在 send 之后、UPDATE 之前：重启后该行 sent 仍为 false，消息被再发一次
# ——消费端按 message_id 幂等，重复无害
```

## 9. 一句话记住

> 可靠 = 确认不丢 + 幂等不重 + DLQ 兜底 + Lag 监控；跨系统一致用本地消息表，
> 顺序只在业务键内保证，别拿全局有序换吞吐。
