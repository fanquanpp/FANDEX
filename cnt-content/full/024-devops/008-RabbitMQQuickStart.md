---
order: 80
title: RabbitMQ 快速上手
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: 交换机、队列、绑定与路由键模型，工作队列、手动确认与限流的基本用法。
author: fanquanpp
updated: '2026-08-03'
related:
  - 'devops/006-MessageQueueOverview'
  - 'devops/009-ReliableMessagingPatterns'
  - 'python/035-PythonMessageQueue'
prerequisites:
  - 'devops/006-MessageQueueOverview'
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

## 5. 动手试试

1. 起两个 `receive.py`，连发 10 条消息，观察带/不带 `prefetch_count=1` 的分发差异。
2. 把回调里的 `basic_ack` 注释掉再重启消费者，观察消息是否被重新投递。
3. 改用 `topic` 交换机：`logs.info`、`logs.error` 两条路由键分别路由到不同队列。

## 6. 一句话记住

> RabbitMQ 的模型是"交换机 → 队列 → 消费者"三段式；手动 ack + prefetch=1 是可靠任务队列的标准姿势。
