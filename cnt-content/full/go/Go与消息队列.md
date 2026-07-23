---
order: 67
title: Go与消息队列
module: go
category: Go
difficulty: intermediate
description: Kafka与NATS
author: fanquanpp
updated: '2026-06-14'
related:
  - go/Go与数据库
  - go/Go与Redis
  - go/Go与测试
  - go/Go与Fuzzing
prerequisites:
  - go/概述与环境配置
---

## 概述

消息队列是一种进程间通信机制，用于在不同服务之间异步传递消息。在微服务架构中，消息队列扮演着"邮局"的角色：发送方把消息投递出去，不需要知道谁会接收；接收方按自己的节奏取走消息处理。这种解耦方式让系统更灵活、更可靠。

Go 语言天生适合消息队列场景，因为 goroutine 和 channel 本身就是并发通信的原语。Go 社区提供了多种消息队列客户端，其中 Kafka 和 NATS 是最常用的两种。

## 基础概念

在深入代码之前，需要理解几个核心概念：

- **Producer（生产者）**：负责创建消息并发送到队列的应用程序。
- **Consumer（消费者）**：从队列中读取消息并进行处理的应用程序。
- **Broker**：消息队列的服务端，负责接收、存储和分发消息。
- **Topic**：消息的分类标签，生产者向指定 Topic 发送消息，消费者订阅 Topic 接收消息。
- **Partition（分区）**：Kafka 中的概念，一个 Topic 可以分成多个分区，实现并行处理。
- **Consumer Group（消费者组）**：Kafka 中的概念，同一组内的消费者共同分担一个 Topic 的消息，每条消息只会被组内一个消费者处理。

Kafka 适合高吞吐量、持久化存储的场景，NATS 则更轻量，适合低延迟的实时通信。

## 快速上手：NATS

NATS 是一个轻量级、高性能的消息队列系统，非常适合入门学习。首先安装 NATS 服务器和 Go 客户端：

```bash
# 安装 NATS 服务器
go install github.com/nats-io/nats-server/v2@latest

# 启动服务器（默认端口 4222）
nats-server

# 安装 Go 客户端
go get github.com/nats-io/nats.go
```

最简单的发布-订阅示例：

```go
package main

import (
    "fmt"
    "log"
    "github.com/nats-io/nats.go"
)

func main() {
    // 连接到 NATS 服务器
    nc, err := nats.Connect("nats://localhost:4222")
    if err != nil {
        log.Fatal(err)
    }
    defer nc.Close()

    // 订阅消息：指定主题，收到消息时触发回调
    sub, err := nc.Subscribe("greeting", func(msg *nats.Msg) {
        fmt.Printf("收到消息: %s\n", string(msg.Data))
    })
    if err != nil {
        log.Fatal(err)
    }
    defer sub.Unsubscribe()

    // 发布消息：向指定主题发送消息
    err = nc.Publish("greeting", []byte("你好，NATS！"))
    if err != nil {
        log.Fatal(err)
    }

    // 等待消息处理完成
    select {}
}
```

## 详细用法

### NATS 核心功能

#### 1. 请求-回复模式

除了发布-订阅，NATS 还支持请求-回复模式，类似 HTTP 但是异步的：

```go
// 服务端：监听请求并回复
nc.Subscribe("service.add", func(msg *nats.Msg) {
    // 解析请求，计算结果，回复
    result := "42"
    msg.Respond([]byte(result))
})

// 客户端：发送请求并等待回复
reply, err := nc.Request("service.add", []byte("1+1"), 2*time.Second)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("回复: %s\n", string(reply.Data))
```

#### 2. 队列订阅（负载均衡）

多个消费者使用相同的队列组名，消息只会被其中一个消费者处理：

```go
// 多个实例使用相同的队列组名
nc.QueueSubscribe("tasks", "worker-group", func(msg *nats.Msg) {
    fmt.Printf("处理任务: %s\n", string(msg.Data))
})
```

#### 3. JetStream 持久化

NATS JetStream 提供了消息持久化、重放、确认等高级功能：

```go
// 创建 JetStream 上下文
js, err := nc.JetStream()
if err != nil {
    log.Fatal(err)
}

// 创建流（类似 Kafka 的 Topic）
js.AddStream(&nats.StreamConfig{
    Name:     "ORDERS",
    Subjects: []string{"orders.*"},
    Retention: nats.LimitsPolicy,
})

// 发布持久化消息
js.Publish("orders.new", []byte(`{"id": "123", "item": "书"}`))

// 持久化订阅：消费消息后需要确认
sub, _ := js.Subscribe("orders.*", func(msg *nats.Msg) {
    fmt.Printf("处理订单: %s\n", string(msg.Data))
    msg.Ack() // 确认消息已处理
}, nats.Durable("order-processor"))
```

### Kafka 核心功能

Kafka 是分布式流处理平台，适合大规模数据处理场景。Go 社区常用的客户端是 confluent-kafka-go。

#### 1. 安装与初始化

```bash
# 安装 confluent-kafka-go（需要系统安装 librdkafka）
go get github.com/confluentinc/confluent-kafka-go/v2/kafka
```

#### 2. 生产者

```go
package main

import (
    "fmt"
    "log"
    "github.com/confluentinc/confluent-kafka-go/v2/kafka"
)

func main() {
    // 创建生产者
    p, err := kafka.NewProducer(&kafka.ConfigMap{
        "bootstrap.servers": "localhost:9092",
    })
    if err != nil {
        log.Fatal(err)
    }
    defer p.Close()

    // 启动一个 goroutine 来处理发送结果
    go func() {
        for e := range p.Events() {
            switch ev := e.(type) {
            case *kafka.Message:
                if ev.TopicPartition.Error != nil {
                    fmt.Printf("发送失败: %v\n", ev.TopicPartition.Error)
                } else {
                    fmt.Printf("发送成功: %s [%d]\n",
                        *ev.TopicPartition.Topic,
                        ev.TopicPartition.Partition)
                }
            }
        }
    }()

    // 发送消息
    topic := "test-topic"
    for i := 0; i < 10; i++ {
        msg := fmt.Sprintf("消息 #%d", i)
        p.Produce(&kafka.Message{
            TopicPartition: kafka.TopicPartition{
                Topic:     &topic,
                Partition: kafka.PartitionAny,
            },
            Value: []byte(msg),
        }, nil)
    }

    // 等待所有消息发送完成
    p.Flush(15 * 1000)
}
```

#### 3. 消费者

```go
package main

import (
    "fmt"
    "log"
    "github.com/confluentinc/confluent-kafka-go/v2/kafka"
)

func main() {
    // 创建消费者
    c, err := kafka.NewConsumer(&kafka.ConfigMap{
        "bootstrap.servers": "localhost:9092",
        "group.id":          "my-group",
        "auto.offset.reset": "earliest", // 从最早的消息开始消费
    })
    if err != nil {
        log.Fatal(err)
    }
    defer c.Close()

    // 订阅主题
    c.SubscribeTopics([]string{"test-topic"}, nil)

    // 消费消息循环
    for {
        msg, err := c.ReadMessage(-1) // 阻塞等待
        if err == nil {
            fmt.Printf("收到消息: %s (分区=%d, 偏移=%d)\n",
                string(msg.Value), msg.TopicPartition.Partition, msg.TopicPartition.Offset)
        } else {
            fmt.Printf("消费错误: %v\n", err)
        }
    }
}
```

#### 4. 手动提交偏移量

默认情况下消费者自动提交偏移量，但手动提交可以确保消息处理完成后才确认：

```go
c, _ := kafka.NewConsumer(&kafka.ConfigMap{
    "bootstrap.servers": "localhost:9092",
    "group.id":          "my-group",
    "enable.auto.commit": false, // 禁用自动提交
})

for {
    msg, err := c.ReadMessage(-1)
    if err == nil {
        // 处理消息
        processMessage(msg)

        // 处理完成后手动提交
        _, err := c.CommitMessage(msg)
        if err != nil {
            log.Printf("提交失败: %v\n", err)
        }
    }
}
```

## 常见场景

### 场景一：异步任务处理

用户注册后发送欢迎邮件，不需要同步等待邮件发送完成：

```go
// 注册服务：发送消息到队列
nc.Publish("user.registered", []byte(`{"email": "user@example.com"}`))

// 邮件服务：订阅消息并发送邮件
nc.Subscribe("user.registered", func(msg *nats.Msg) {
    var user struct{ Email string }
    json.Unmarshal(msg.Data, &user)
    sendWelcomeEmail(user.Email)
})
```

### 场景二：日志收集

多个服务将日志发送到 Kafka，由专门的日志服务统一处理：

```go
// 各业务服务：发送日志
p.Produce(&kafka.Message{
    TopicPartition: kafka.TopicPartition{Topic: &logTopic},
    Value:          []byte(logEntry),
}, nil)

// 日志服务：消费并存储
c.SubscribeTopics([]string{"app-logs"}, nil)
```

### 场景三：事件驱动架构

订单创建后触发库存扣减、通知等多个下游服务：

```go
// 订单服务：发布事件
js.Publish("order.created", orderData)

// 库存服务：订阅事件
js.Subscribe("order.created", func(msg *nats.Msg) {
    deductStock(msg.Data)
    msg.Ack()
})

// 通知服务：也订阅同一个事件
js.Subscribe("order.created", func(msg *nats.Msg) {
    sendNotification(msg.Data)
    msg.Ack()
})
```

## 注意事项与常见错误

1. **消息丢失**：Kafka 生产者默认不等待确认，可能丢消息。设置 `acks=all` 确保所有副本确认后才返回成功。

2. **重复消费**：消费者可能因为崩溃重启而重复处理消息。业务逻辑需要保证幂等性，即同一条消息处理多次结果一致。

3. **消费者积压**：如果消费速度跟不上生产速度，消息会积压。可以增加消费者实例或优化处理逻辑。

4. **连接未关闭**：忘记关闭生产者或消费者连接会导致资源泄漏。务必使用 `defer p.Close()` 和 `defer c.Close()`。

5. **NATS 默认不持久化**：NATS 核心模式不存储消息，如果消费者不在线就会错过消息。需要持久化请使用 JetStream。

6. **CGO 依赖**：confluent-kafka-go 依赖 C 库 librdkafka，交叉编译比较麻烦。如果不想用 CGO，可以考虑纯 Go 实现的 sarama 或 kafka-go。

## 进阶用法

### 使用 kafka-go（纯 Go 实现）

kafka-go 不依赖 CGO，部署更简单：

```go
import "github.com/segmentio/kafka-go"

// 创建写入器
w := &kafka.Writer{
    Addr:  kafka.TCP("localhost:9092"),
    Topic: "test-topic",
}
defer w.Close()

// 写入消息
err := w.WriteMessages(context.Background(),
    kafka.Message{Value: []byte("你好")},
    kafka.Message{Value: []byte("世界")},
)

// 创建读取器
r := kafka.NewReader(kafka.ReaderConfig{
    Brokers:   []string{"localhost:9092"},
    Topic:     "test-topic",
    GroupID:   "my-group",
})
defer r.Close()

// 读取消息
for {
    msg, err := r.ReadMessage(context.Background())
    if err != nil {
        break
    }
    fmt.Printf("收到: %s\n", string(msg.Value))
}
```

### 消息序列化

生产环境中通常使用结构化数据格式而非纯字符串：

```go
// 使用 JSON 序列化
order := Order{ID: "123", Amount: 99.9}
data, _ := json.Marshal(order)
nc.Publish("orders", data)

// 消费时反序列化
nc.Subscribe("orders", func(msg *nats.Msg) {
    var order Order
    json.Unmarshal(msg.Data, &order)
    fmt.Printf("订单: %+v\n", order)
})
```

### 优雅关闭

消费者需要正确处理关闭信号，确保正在处理的消息完成后再退出：

```go
sigChan := make(chan os.Signal, 1)
signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

// 在单独的 goroutine 中消费
done := make(chan bool)
go func() {
    for {
        msg, err := c.ReadMessage(-1)
        if err != nil {
            break
        }
        processMessage(msg)
    }
    done <- true
}()

// 等待关闭信号
<-sigChan
fmt.Println("正在关闭消费者...")
c.Close()
<-done
```
