---
order: 390
title: RabbitMQ 快速上手
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: 交换机、队列、绑定与路由键模型，工作队列、手动确认与限流的基本用法。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'devops/370-MessageQueueOverview'
  - 'devops/400-ReliableMessagingPatterns'
  - 'python/850-PythonMessageQueue'
prerequisites:
  - 'devops/370-MessageQueueOverview'
---

## 0. 一句话理解

> RabbitMQ 的核心是"交换机决定消息进哪个队列"：生产者只发给交换机，交换机按路由键把消息送进绑定的队列，消费者从队列取。

## 1. 启动与后台

```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:4-management
```

**讲解：**

1. `5672` 是 AMQP 协议端口（应用连接），`15672` 是管理后台（浏览器访问，默认账号 `guest/guest`）。
2. `rabbitmq:4-management` 镜像自带管理插件；RabbitMQ 4.x 为当前主线。
3. 管理后台可以直观看到交换机、队列、消息积压情况，入门阶段多看看。

## 2. 交换机类型

| 类型 | 路由规则 | 场景 |
| --- | --- | --- |
| direct 直连 | 路由键完全相等 | 按级别路由（info/error） |
| fanout 广播 | 发给所有绑定队列 | 广播通知 |
| topic 主题 | 通配符匹配（`*` 一段、`#` 多段） | 灵活分类路由 |
| headers 头匹配 | 按消息头匹配 | 少见 |

## 3. Python 收发示例

```bash
pip install pika
```

```python
# send.py
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters("localhost"))
channel = connection.channel()

channel.exchange_declare(exchange="logs", exchange_type="fanout")
channel.queue_declare(queue="log-queue")
channel.queue_bind(exchange="logs", queue="log-queue")

channel.basic_publish(
    exchange="logs",
    routing_key="",
    body="Hello RabbitMQ".encode()
)

print("已发送")
connection.close()
```

```python
# receive.py
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters("localhost"))
channel = connection.channel()

channel.exchange_declare(exchange="logs", exchange_type="fanout")
channel.queue_declare(queue="log-queue")
channel.queue_bind(exchange="logs", queue="log-queue")


def callback(ch, method, properties, body):
    print("收到：", body.decode())
    ch.basic_ack(delivery_tag=method.delivery_tag)


channel.basic_consume(queue="log-queue", on_message_callback=callback)
print("等待消息……")
channel.start_consuming()
```

**讲解：**

1. `exchange_declare` 声明交换机（fanout 广播），`queue_declare` 声明队列，`queue_bind` 把两者绑定。
2. 生产者 `basic_publish` 只指定交换机与消息体，不关心队列。
3. 消费者 `basic_consume` 注册回调；`basic_ack` 手动确认"这条我处理完了"。
4. **手动确认是关键**：处理成功才 ack，消费者崩溃时消息会重新投递，避免消息丢失。

## 4. 工作队列与公平分发

```python
channel.basic_qos(prefetch_count=1)
```

**讲解：**

1. 多个消费者订阅同一队列时，RabbitMQ 默认轮询分发；`prefetch_count=1` 表示"一次最多拿 1 条，处理完再拿"。
2. 这样慢消费者不会被塞满任务，快消费者不会空闲——实现"能者多劳"。
3. 不设置 QoS 时，如果某条消息处理很久，其他消息仍会继续派发给该消费者，造成堆积不均。

## 5. 持久化：重启不丢消息的三件事

RabbitMQ 默认把消息放内存，Broker 重启全没。要"重启不丢"必须三件事同时做：

```python
# 1. 交换机持久化
channel.exchange_declare(exchange="logs", exchange_type="fanout", durable=True)
# 2. 队列持久化
channel.queue_declare(queue="log-queue", durable=True)
# 3. 消息持久化（delivery_mode=2）
channel.basic_publish(
    exchange="logs",
    routing_key="",
    body=b"Hello",
    properties=pika.BasicProperties(delivery_mode=2),
)
```

**任缺一件都会丢**：最常见的坑是"队列 durable=True 但消息没设 delivery_mode=2"，
重启后队列还在、消息没了。

## 6. 死信队列：失败消息的"停尸房"

```python
# 声明业务队列时挂上死信交换机
channel.queue_declare(
    queue="orders",
    durable=True,
    arguments={
        "x-dead-letter-exchange": "orders-dlx",
        "x-message-ttl": 60000,  # 可选：60 秒未消费即转死信
    },
)
```

三条进入死信的路径：消费端 `basic_reject`/`basic_nack` 且 `requeue=False`、
消息 TTL 到期、队列超长（`x-max-length`）。死信队列配合监控告警，
是"失败消息有人管"的兜底机制——详细的重试分级设计见可靠消息模式篇。

## 7. 管理后台速查

浏览器打开 `http://localhost:15672`（guest/guest），入门期五个页面轮流看：

| 页面 | 看什么 |
| :--- | :--- |
| Overview | 集群消息速率（publish/deliver/ack 折线） |
| Connections | 连接与 channel 数，排查连接泄漏 |
| Queues | 队列 Ready/Unacked 深度，点进去可手工取消息、看消费者 |
| Exchanges | 交换机列表与绑定关系 |
| Admin | 用户与虚拟主机（vhost）权限 |

排障动作示范：页面 Queues 里点开某队列 -> Get Messages 手工取一条看内容，
是本地调试"消息到底长什么样"的最快路径。

## 8. 连接、信道与常见陷阱

| 概念 | 建议 | 为什么 |
| :--- | :--- | :--- |
| Connection | 进程级少量复用 | TCP 建连昂贵，官方不建议每任务一连 |
| Channel | 每线程一个 | Channel 非线程安全，混用会串帧 |
| 心跳 | 保持默认 60s | 关心跳会被 Broker 判死回收连接 |

常见陷阱：

1. **自动 ack（默认）丢消息**：回调一崩消息已"确认"，必须显式手动 ack。
2. **prefetch 无限大**：消费者内存被打爆、消息分布不均，任务队列一律 `prefetch_count` 限流。
3. **queue_declare 参数不一致**：同一名字的队列两次声明参数不同（如 durable 不同）
   会报 `PRECONDITION_FAILED`，重构时改参数必须换新队列名或先删除旧队列。
4. **镜像队列的执念**：RabbitMQ 4.x 已移除经典镜像队列，高可用用 **Quorum 队列**
   （基于 Raft，`x-queue-type: quorum`）——网上旧教程的 `x-ha-policy` 已失效。

## 9. 动手试试

1. 起两个 `receive.py`，连发 10 条消息，观察带/不带 `prefetch_count=1` 的分发差异。
2. 把回调里的 `basic_ack` 注释掉再重启消费者，观察消息是否被重新投递。
3. 改用 `topic` 交换机：`logs.info`、`logs.error` 两条路由键分别路由到不同队列。
4. 按"三件事"配置持久化，`docker restart rabbitmq` 后验证消息还在。
5. 给 `orders` 队列挂死信交换机，用 `basic_nack(requeue=False)` 把一条消息送进 DLQ。

## 10. 一句话记住

> RabbitMQ 的模型是"交换机 → 队列 → 消费者"三段式；可靠三件套是手动 ack +
> prefetch 限流 + 全链路持久化；4.x 的高可用靠 Quorum 队列，失败消息进死信队列兜底。
