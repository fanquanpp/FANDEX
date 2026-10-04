---
order: 410
title: RabbitMQ 快速上手
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: 交换机、队列、绑定与路由键模型，工作队列、手动确认与限流的基本用法。
author: fanquanpp
updated: '2026-10-05'
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

## 9. 实践：动手与自检

公平分发实验（10 分钟）：起两个 `receive.py`（一个回调里 `time.sleep(3)` 模拟慢消费者，
一个不加延时模拟快消费者），连发 10 条消息，分别在不带/带 `prefetch_count=1` 的配置下
观察两个终端的分发结果。验收：能说清两种配置下「慢消费者各拿到几条、为什么」。

提示（思路方向）：默认轮询分发不看处理速度，各拿 5 条；`prefetch_count=1` 下 RabbitMQ
只把「未确认数 < 1」的消息派给消费者，慢的拿到消息少。先自己改代码，再对照关键改动：

```python
# receive.py 关键行：basic_consume 之前加
channel.basic_qos(prefetch_count=1)
channel.basic_consume(queue="log-queue", on_message_callback=callback)
```

手动确认实验（10 分钟）：把回调里的 `basic_ack` 一行注释掉，重启消费者，观察消息到达
后队列状态（管理后台 Queues 页 Unacked 列）；再 `Ctrl+C` 停掉消费者。验收：能解释
Unacked 消息为何在消费者退出后变回 Ready，并回答「注释掉 ack 是更安全还是更危险」。

提示：注释 ack 后消息停在 Unacked，消费者退出（连接断开）Broker 判定未确认、重新排队
——所以「不 ack」不会立刻丢消息，但消息永远无法出队，等同于把队列变成只进不出的蓄水池；
正确姿势是处理成功后 ack（第 3 节），失败走 reject/nack 进死信（第 6 节）。

topic 路由实验（15 分钟）：建 `logs` 交换机（topic 类型），绑定两个队列：
`error-queue`（绑定键 `log.error`）与 `all-queue`（绑定键 `log.#`），分别发送路由键
`log.error`、`log.info` 各一条。验收：能预测每条消息到达哪个队列再动手验证；顺手回答
`*` 与 `#` 各匹配几段。

提示：`*` 恰好一段、`#` 零或多段，路由键按 `.` 分段。参考绑定代码：

```python
channel.exchange_declare(exchange="logs", exchange_type="topic")
channel.queue_declare(queue="error-queue")
channel.queue_declare(queue="all-queue")
channel.queue_bind(exchange="logs", queue="error-queue", routing_key="log.error")
channel.queue_bind(exchange="logs", queue="all-queue", routing_key="log.#")
# 发 log.info：只进 all-queue；发 log.error：两个队列都进
```

持久化实验（10 分钟）：按第 5 节「三件事」发一条持久化消息，再发一条不设
`delivery_mode=2` 的对照消息，`docker restart rabbitmq` 后用管理后台或重新消费验证。
验收：一条存活一条消失，且能指出对照消息丢在哪一环。

提示：队列还在（durable=True）但非持久化消息不落盘——这正是第 5 节强调「任缺一件都
丢」的实锤。验证命令：

```bash
docker restart rabbitmq
# 管理后台 Queues 页：log-queue 仍在，Ready 只有那条持久化消息
```

死信实验（15 分钟）：给业务队列挂死信交换机（第 6 节配置），消费者收到消息后执行
`basic_nack(delivery_tag, requeue=False)`。验收：消息出现在死信队列，管理后台能点开
看到 `reason: rejected`。

提示：死信交换机也要先声明并绑定死信队列。参考骨架：

```python
channel.exchange_declare(exchange="orders-dlx", exchange_type="fanout")
channel.queue_declare(queue="orders-dlq")
channel.queue_bind(exchange="orders-dlx", queue="orders-dlq")
channel.queue_declare(queue="orders", durable=True,
    arguments={"x-dead-letter-exchange": "orders-dlx"})
# 回调里：ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
```

## 10. 一句话记住

> RabbitMQ 的模型是"交换机 → 队列 → 消费者"三段式；可靠三件套是手动 ack +
> prefetch 限流 + 全链路持久化；4.x 的高可用靠 Quorum 队列，失败消息进死信队列兜底。
