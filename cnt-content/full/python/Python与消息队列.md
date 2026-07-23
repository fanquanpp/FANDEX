---
order: 76
title: Python与消息队列
module: python
category: Python
difficulty: intermediate
description: RabbitMQ与Kafka
author: fanquanpp
updated: '2026-06-14'
related:
  - python/Python与配置管理
  - python/装饰器
  - python/Python与gRPC
  - python/Python与WebSocket
prerequisites:
  - python/语法速查
---

## 什么是消息队列

消息队列是一种进程间通信方式。发送方把消息放入队列，接收方从队列中取出消息处理。发送方和接收方不需要同时在线，也不需要知道对方是谁，它们只需要关心消息本身。

消息队列解决的核心问题是"解耦"和"削峰"。解耦是指生产者和消费者互不依赖，可以独立开发和部署。削峰是指当瞬时请求量很大时，消息先在队列中排队，消费者按自己的速度处理，不会因为流量突增而崩溃。

## 基础概念

### 生产者、消费者与队列

- 生产者（Producer）：发送消息的程序
- 消费者（Consumer）：接收消息的程序
- 队列（Queue）：存储消息的缓冲区

### RabbitMQ 与 Kafka 的区别

RabbitMQ 是传统的消息代理，支持复杂的路由规则、消息确认、优先级队列等。适合任务分发、事件通知等场景。

Kafka 是分布式流处理平台，以高吞吐量著称，消息持久化到磁盘。适合日志收集、数据流处理、事件溯源等场景。

### Exchange 与路由（RabbitMQ）

RabbitMQ 中生产者不直接发送消息到队列，而是发送到 Exchange（交换机），由 Exchange 根据路由规则将消息投递到一个或多个队列。常见的 Exchange 类型有：

- Direct：精确匹配路由键
- Fanout：广播到所有绑定队列
- Topic：通配符匹配路由键

### Topic 与分区（Kafka）

Kafka 中消息按 Topic 分类，每个 Topic 可以分成多个 Partition（分区），分区是并行处理的基本单位。消息在分区中按顺序存储，每条消息有一个偏移量（Offset）。

## 快速上手

### 安装客户端库

```bash
# RabbitMQ 客户端
pip install pika

# Kafka 客户端
pip install kafka-python
```

### RabbitMQ 最简示例

先确保 RabbitMQ 服务已启动（可用 Docker 快速启动）：

```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

发送消息：

```python
# rabbitmq_send.py - 发送消息
import pika

# 连接到 RabbitMQ 服务器
connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

# 声明一个队列（如果不存在会自动创建）
channel.queue_declare(queue='hello')

# 发送消息
channel.basic_publish(
    exchange='',
    routing_key='hello',      # 队列名称
    body='Hello, RabbitMQ!'   # 消息内容
)

print("消息已发送")
connection.close()
```

接收消息：

```python
# rabbitmq_receive.py - 接收消息
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

# 声明队列（确保队列存在）
channel.queue_declare(queue='hello')

def callback(ch, method, properties, body):
    """消息处理回调函数"""
    print(f"收到消息: {body.decode()}")

# 订阅队列，设置消息处理回调
channel.basic_consume(
    queue='hello',
    on_message_callback=callback,
    auto_ack=True  # 自动确认
)

print("等待消息中，按 Ctrl+C 退出")
channel.start_consuming()
```

### Kafka 最简示例

先启动 Kafka 服务（需要先启动 Zookeeper）：

```bash
docker run -d --name zookeeper -p 2181:2181 wurstmeister/zookeeper
docker run -d --name kafka -p 9092:9092 \
  -e KAFKA_ZOOKEEPER_CONNECT=host.docker.internal:2181 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  wurstmeister/kafka
```

生产者：

```python
# kafka_producer.py - Kafka 生产者
from kafka import KafkaProducer

# 创建生产者
producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
    value_serializer=lambda v: v.encode('utf-8')  # 字符串编码
)

# 发送消息
producer.send('my-topic', 'Hello, Kafka!')
producer.flush()  # 确保消息已发送

print("消息已发送")
producer.close()
```

消费者：

```python
# kafka_consumer.py - Kafka 消费者
from kafka import KafkaConsumer

# 创建消费者
consumer = KafkaConsumer(
    'my-topic',
    bootstrap_servers='localhost:9092',
    group_id='my-group',         # 消费者组
    auto_offset_reset='earliest' # 从最早的消息开始消费
)

# 持续消费消息
for message in consumer:
    print(f"收到消息: {message.value.decode('utf-8')}")
    print(f"  分区: {message.partition}, 偏移量: {message.offset}")
```

## 详细用法

### RabbitMQ 工作队列

工作队列用于在多个消费者之间分配任务：

```python
# rabbitmq_task.py - 发送任务
import pika
import time

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

# 声明持久化队列
channel.queue_declare(queue='tasks', durable=True)

# 发送多个任务
for i in range(10):
    message = f"任务 {i}"
    channel.basic_publish(
        exchange='',
        routing_key='tasks',
        body=message,
        properties=pika.BasicProperties(delivery_mode=2)  # 持久化消息
    )
    print(f"已发送: {message}")

connection.close()
```

```python
# rabbitmq_worker.py - 工作进程
import pika
import time

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

channel.queue_declare(queue='tasks', durable=True)

def callback(ch, method, properties, body):
    """处理任务"""
    print(f"开始处理: {body.decode()}")
    time.sleep(1)  # 模拟耗时操作
    print(f"处理完成: {body.decode()}")
    # 手动确认消息已处理
    ch.basic_ack(delivery_tag=method.delivery_tag)

# 每次只取一条消息（公平分发）
channel.basic_qos(prefetch_count=1)

channel.basic_consume(queue='tasks', on_message_callback=callback)

print("工作进程已启动，等待任务...")
channel.start_consuming()
```

### RabbitMQ 发布/订阅

使用 Fanout Exchange 广播消息给所有订阅者：

```python
# rabbitmq_publish.py - 发布消息
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

# 声明 fanout 类型的交换机
channel.exchange_declare(exchange='notifications', exchange_type='fanout')

# 发布消息（fanout 模式不需要 routing_key）
channel.basic_publish(exchange='notifications', routing_key='', body='系统维护通知')

print("通知已发布")
connection.close()
```

```python
# rabbitmq_subscribe.py - 订阅消息
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

channel.exchange_declare(exchange='notifications', exchange_type='fanout')

# 创建临时队列（断开连接后自动删除）
result = channel.queue_declare(queue='', exclusive=True)
queue_name = result.method.queue

# 将临时队列绑定到交换机
channel.queue_bind(exchange='notifications', queue=queue_name)

def callback(ch, method, properties, body):
    print(f"收到通知: {body.decode()}")

channel.basic_consume(queue=queue_name, on_message_callback=callback, auto_ack=True)

print("等待通知...")
channel.start_consuming()
```

### RabbitMQ 主题路由

使用 Topic Exchange 根据路由键的通配符匹配来分发消息：

```python
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

# 声明 topic 类型的交换机
channel.exchange_declare(exchange='logs', exchange_type='topic')

# 发送不同类型的日志
channel.basic_publish(exchange='logs', routing_key='sys.error', body='系统错误日志')
channel.basic_publish(exchange='logs', routing_key='sys.info', body='系统信息日志')
channel.basic_publish(exchange='logs', routing_key='app.error', body='应用错误日志')
channel.basic_publish(exchange='logs', routing_key='app.info', body='应用信息日志')

print("日志已发送")
connection.close()
```

```python
# 只接收所有 error 日志
channel.queue_bind(exchange='logs', queue=queue_name, routing_key='*.error')

# 接收 sys 下的所有日志
channel.queue_bind(exchange='logs', queue=queue_name, routing_key='sys.*')

# 接收所有日志
channel.queue_bind(exchange='logs', queue=queue_name, routing_key='#')
```

### Kafka 消费者组

消费者组是 Kafka 实现负载均衡的方式。同一个组内的消费者共同分担一个 Topic 的消息，每条消息只会被组内一个消费者处理：

```python
from kafka import KafkaConsumer

# 消费者 1
consumer1 = KafkaConsumer(
    'orders',
    bootstrap_servers='localhost:9092',
    group_id='order-processors',  # 同一个消费者组
    auto_offset_reset='earliest'
)

# 消费者 2（另一个进程）
consumer2 = KafkaConsumer(
    'orders',
    bootstrap_servers='localhost:9092',
    group_id='order-processors',  # 同一个消费者组
    auto_offset_reset='earliest'
)

# 两个消费者会各自处理一部分消息，不会重复
```

### Kafka 发送带键的消息

键（Key）用于控制消息分配到哪个分区，相同键的消息会进入同一个分区：

```python
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
    key_serializer=lambda k: k.encode('utf-8'),
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# 发送带键的消息（相同用户 ID 的订单进入同一分区，保证顺序）
producer.send('orders', key='user-123', value={'item': '笔记本', 'price': 5999})
producer.send('orders', key='user-456', value={'item': '手机', 'price': 3999})
producer.send('orders', key='user-123', value={'item': '鼠标', 'price': 199})

producer.flush()
producer.close()
```

## 常见场景

### 异步任务处理

用户注册后发送欢迎邮件，不需要等邮件发完才返回响应：

```python
import pika
import json

# Web 请求处理中：把任务放入队列
def register_user(username, email):
    # 保存用户到数据库...
    # 将发送邮件的任务放入队列
    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = connection.channel()
    channel.queue_declare(queue='email_tasks')
    channel.basic_publish(
        exchange='',
        routing_key='email_tasks',
        body=json.dumps({'type': 'welcome', 'email': email, 'username': username})
    )
    connection.close()
    return "注册成功"

# 邮件发送 Worker：从队列取出任务并发送
def email_worker():
    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = connection.channel()
    channel.queue_declare(queue='email_tasks')

    def callback(ch, method, properties, body):
        task = json.loads(body)
        # 发送邮件的逻辑
        print(f"发送{task['type']}邮件给 {task['email']}")
        ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_consume(queue='email_tasks', on_message_callback=callback)
    channel.start_consuming()
```

### 日志收集

使用 Kafka 收集多个服务的日志：

```python
# 各个服务中的日志生产者
from kafka import KafkaProducer
import json
import datetime

producer = KafkaProducer(
    bootstrap_servers='localhost:9092',
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

def log(level, service, message):
    """发送日志到 Kafka"""
    producer.send('app-logs', {
        'timestamp': datetime.datetime.now().isoformat(),
        'level': level,
        'service': service,
        'message': message
    })

# 使用
log('ERROR', 'payment-service', '支付超时')
log('INFO', 'user-service', '用户登录成功')
```

## 注意事项与常见错误

### 消息确认机制

RabbitMQ 中如果 auto_ack=True，消息一旦投递就从队列中删除。如果消费者处理失败，消息就丢失了。生产环境应该使用手动确认：

```python
# 关闭自动确认
channel.basic_consume(queue='tasks', on_message_callback=callback, auto_ack=False)

def callback(ch, method, properties, body):
    try:
        # 处理消息
        process_message(body)
        # 处理成功，确认消息
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception:
        # 处理失败，拒绝消息并重新入队
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
```

### 消息持久化

默认情况下 RabbitMQ 重启后消息会丢失。需要同时设置队列持久化和消息持久化：

```python
# 队列持久化
channel.queue_declare(queue='tasks', durable=True)

# 消息持久化
channel.basic_publish(
    exchange='',
    routing_key='tasks',
    body=message,
    properties=pika.BasicProperties(delivery_mode=2)  # 2 表示持久化
)
```

### Kafka 消费者偏移量

Kafka 消费者需要管理偏移量。如果 auto_offset_reset 设置不当，可能重复消费或丢失消息：

- earliest：从最早的消息开始消费（适合首次启动）
- latest：只消费启动后的新消息（默认值）

### 连接断开处理

消息队列的连接可能因为网络问题断开，生产环境需要处理重连：

```python
import pika

def create_connection():
    """创建带自动重连的连接"""
    while True:
        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters('localhost')
            )
            return connection
        except pika.exceptions.AMQPConnectionError:
            print("连接失败，5 秒后重试...")
            time.sleep(5)
```

## 进阶用法

### RabbitMQ 延迟消息

通过 TTL（存活时间）和死信队列实现延迟消息：

```python
import pika

connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

# 声明延迟队列（消息过期后转到目标队列）
channel.queue_declare(
    queue='delay_queue',
    arguments={
        'x-message-ttl': 60000,              # 消息存活 60 秒
        'x-dead-letter-exchange': '',         # 过期后转到默认交换机
        'x-dead-letter-routing-key': 'target' # 转到目标队列
    }
)

# 目标队列
channel.queue_declare(queue='target')

# 发送延迟消息（60 秒后才会出现在 target 队列）
channel.basic_publish(exchange='', routing_key='delay_queue', body='延迟消息')

connection.close()
```

### Kafka 批量消费

```python
from kafka import KafkaConsumer

consumer = KafkaConsumer(
    'events',
    bootstrap_servers='localhost:9092',
    group_id='batch-processor',
    auto_offset_reset='earliest'
)

batch = []
batch_size = 100

for message in consumer:
    batch.append(message.value.decode('utf-8'))

    if len(batch) >= batch_size:
        # 批量处理
        process_batch(batch)
        # 手动提交偏移量
        consumer.commit()
        batch = []
```
