---
order: 550
title: Go 与消息队列：邮件服务挂了，注册也不能挂
module: 'go'
category: 后端技术
difficulty: intermediate
description: 以"SMTP 超时拖垮注册接口"为主线学 NATS 与 Kafka：发布订阅、队列组负载均衡、JetStream 持久化、偏移量与手动提交、幂等消费与优雅关闭、客户端选型（CGO 之坑），附坑点、自检与练习。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'go/340-GoDatabase'
  - 'go/550-GoRedis'
  - 'go/350-GoTest'
  - 'go/430-GoSignalHandling'
prerequisites:
  - 'go/020-GoOverviewEnvSetup'
---

## 真实场景：SMTP 一超时，注册接口跟着雪崩

注册接口的代码长这样：写库成功后同步调 `sendWelcomeEmail()`，而 SMTP 服务最近不稳定，一超时就 10 秒。结果：用户注册要等邮件服务——邮件是"锦上添花"，却成了注册的故障域。SMTP 彻底宕机的时段，注册成功率跟着归零。

问题不在邮件服务，在调用方式：邮件是**可以延迟完成的副作用**，却被做成了**必须当场完成的依赖**。消息队列就是解开这个耦合的工具：注册服务把"用户已注册"这件事发出去就返回，邮件服务按自己的节奏取走处理。发件方不需要知道谁接收、收件方挂了也不影响发件方。

Go 社区两大常用选项：NATS 轻量低延迟，适合入门与实时通信；Kafka 高吞吐、持久化、可回放，适合大规模数据管道。先从 NATS 跑通概念，再上 Kafka。

## 动手第一步：NATS 发布订阅，十行跑通

```bash
go install github.com/nats-io/nats-server/v2@latest
nats-server            # 默认监听 4222
go get github.com/nats-io/nats.go
```

```go
package main

import (
    "fmt"
    "log"

    "github.com/nats-io/nats.go"
)

func main() {
    nc, err := nats.Connect("nats://localhost:4222")
    if err != nil {
        log.Fatal(err)
    }
    defer nc.Close()

    // 订阅：收到消息触发回调
    sub, err := nc.Subscribe("user.registered", func(msg *nats.Msg) {
        fmt.Printf("邮件服务收到: %s\n", string(msg.Data))
    })
    if err != nil {
        log.Fatal(err)
    }
    defer sub.Unsubscribe()

    // 发布：发完即走，不等任何订阅者
    if err := nc.Publish("user.registered", []byte(`{"email":"user@example.com"}`)); err != nil {
        log.Fatal(err)
    }

    select {} // 演示程序：保持进程存活等回调
}
```

预期输出：

```text
邮件服务收到: {"email":"user@example.com"}
```

注册服务只需那一行 `Publish`——与邮件服务的代码零耦合。NATS 核心模式还有两件武器：

```go
// 请求-回复：像 HTTP 但异步，Request 自带超时
nc.Subscribe("service.add", func(msg *nats.Msg) {
    msg.Respond([]byte("42"))
})
reply, err := nc.Request("service.add", []byte("1+1"), 2*time.Second)

// 队列订阅：多个实例共用一个队列组名，消息只被组内一个消费者处理
nc.QueueSubscribe("tasks", "worker-group", handler)
```

队列订阅是"负载均衡"语义，普通 Subscribe 是"广播"语义——多实例部署时选错语义，会把一封邮件发三遍。

## 动手第二步：JetStream——NATS 加上持久化

NATS 核心模式不存消息：订阅者不在线就错过。要"发出去的事不丢"，用 JetStream：

```go
js, err := nc.JetStream()

// 创建流：类似 Kafka 的 Topic，带保留策略
_, err = js.AddStream(&nats.StreamConfig{
    Name:      "ORDERS",
    Subjects:  []string{"orders.*"},
    Retention: nats.LimitsPolicy,
})

// 发布持久化消息
js.Publish("orders.new", []byte(`{"id":"123"}`))

// 持久化订阅：处理完必须 Ack，不 Ack 会在重投策略下重新送达
sub, _ := js.Subscribe("orders.*", func(msg *nats.Msg) {
    if err := handle(msg.Data); err != nil {
        return // 不 Ack，等待重投
    }
    msg.Ack()
}, nats.Durable("order-processor"))
```

`Ack` 机制把"至少一次送达"的责任链补全了：服务重启后从上次确认的位置继续消费，消息不再因为消费者离线而丢失。

## 动手第三步：Kafka 生产者与消费者

Kafka 的概念映射：Topic 是分类，Partition 是 Topic 内的并行通道，Consumer Group 内成员分摊分区（每条消息组内只处理一次）。Go 客户端选型先想清楚：confluent-kafka-go 依赖系统库 librdkafka（CGO），交叉编译与容器镜像麻烦；纯 Go 的 `github.com/IBM/sarama` 与 `github.com/twmb/franz-go` 无此负担，新项目可优先 franz-go。本节以 confluent-kafka-go 演示，概念各客户端通用：

```go
// 生产者：Produce 只是入队，结果异步到达 Events 通道
p, err := kafka.NewProducer(&kafka.ConfigMap{
    "bootstrap.servers": "localhost:9092",
    "acks":              "all", // 等 ISR 副本全部落盘才算成功，防 broker 宕机丢消息
})
defer p.Close()

go func() {
    for e := range p.Events() {
        if msg, ok := e.(*kafka.Message); ok && msg.TopicPartition.Error != nil {
            log.Printf("发送失败: %v", msg.TopicPartition.Error) // 这里接重试/告警
        }
    }
}()

topic := "orders"
p.Produce(&kafka.Message{
    TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: kafka.PartitionAny},
    Value:          []byte(`{"id":"123"}`),
}, nil)

p.Flush(15 * 1000) // 退出前把队列发完
```

消费者与手动提交：

```go
c, err := kafka.NewConsumer(&kafka.ConfigMap{
    "bootstrap.servers":  "localhost:9092",
    "group.id":           "order-processor",
    "auto.offset.reset":  "earliest",        // 无偏移记录时从头消费
    "enable.auto.commit": false,             // 关闭自动提交，处理完再确认
})
defer c.Close()

c.SubscribeTopics([]string{"orders"}, nil)

for {
    msg, err := c.ReadMessage(-1) // 阻塞等待
    if err != nil {
        log.Printf("消费错误: %v", err)
        continue
    }
    if err := processMessage(msg); err != nil {
        log.Printf("处理失败: %v", err)
        continue // 不提交偏移，重启后会重新拿到这条
    }
    if _, err := c.CommitMessage(msg); err != nil {
        log.Printf("提交失败: %v", err)
    }
}
```

手动提交的语义值得咀嚼：先处理后提交，崩溃时最坏情况是"处理了但没提交"——重启后重复处理同一条。所以**消费端业务必须幂等**（同一条消息处理多次结果一致），比如用订单 ID 做去重键。反过来"先提交后处理"则可能丢消息。至少一次投递 + 幂等消费，是消息队列世界的基本姿势。

## 讲为什么：什么时候需要消息队列

三个信号同时出现才值得引入：

1. **时序解耦**——下游动作不需要立刻完成（发邮件、生成报表、刷缓存）；
2. **削峰**——瞬时流量（秒杀下单）超过下游处理能力，队列当缓冲池；
3. **广播**——一个事件多个团队消费（订单创建同时触发库存、通知、风控），发布方不该知道消费方名单。

第三个信号的实现形状：

```go
// 订单服务只管发布
js.Publish("order.created", orderData)

// 库存服务与通知服务各自订阅，互不知晓
js.Subscribe("order.created", func(msg *nats.Msg) {
    deductStock(msg.Data)
    msg.Ack()
})
```

日志收集是 Kafka 的经典主场：各服务往 `app-logs` Topic 写，专门的消费端落盘或转发，业务进程完全不感知日志系统的存在。反过来说，如果只是两个服务之间一问一答、要求拿到结果再继续，那是 RPC 的活——用 [Go 与 gRPC](/go/520-GoGRPC)，不要把队列当成请求-响应的替代品。

## 坑点与自检

**坑 1：生产者默认不等于可靠。** `acks=1` 时主副本落盘即确认，broker 宕机可能丢；关键数据 `acks=all`。Produce 返回成功只代表进了本地队列，真正的成败看 Events 通道。

**坑 2：消费不幂等。** 重复投递是常态不是异常（重试、rebalance、重启），靠"消息只来一次"写的代码上线必炸。

**坑 3：普通 Subscribe 用在多实例上。** 广播语义让每个实例都收到全量消息；要分摊用 QueueSubscribe（NATS）或 Consumer Group（Kafka）。

**坑 4：积压无人知晓。** 消费慢于生产时消息堆积，用户侧表现为"通知晚到两小时"。监控 lag（积压量）并告警，扩消费者实例或优化处理逻辑。

**坑 5：Ctrl+C 直接杀进程。** 正在处理的消息半途而废。消费者要接信号做优雅关闭：

```go
sigChan := make(chan os.Signal, 1)
signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
<-sigChan
fmt.Println("正在关闭消费者...")
c.Close() // 让当前消息处理完、提交偏移、离开消费组
```

**坑 6：CGO 之坑。** confluent-kafka-go 需要 librdkafka，alpine 镜像里装不上是常见翻车点；不想碰 CGO 用 sarama/franz-go/kafka-go（segmentio 的 kafka-go 用法最简：`kafka.Writer` 写、`kafka.NewReader` 读）。

自检——能不看文档回答这些吗：

1. 消息队列解决哪三类问题？哪类需求应该用 RPC 而不是队列？
2. NATS 普通 Subscribe 与 QueueSubscribe 的语义差异？
3. JetStream 与 NATS 核心模式的本质区别？Ack 在可靠性链条里承担什么？
4. `acks=all` 防的是什么？Produce 返回成功意味着什么？
5. 先处理后提交为什么必然导向幂等要求？至少一次、至多一次、恰好一次各对应什么组合？
6. 优雅关闭要完成哪几件事？

## 练习

1. 把开头的注册场景做成两个小程序：注册服务（收到 HTTP POST 后 Publish）与邮件服务（Subscribe 后打印），用 `curl` 触发注册；然后 kill 掉邮件服务再注册，重启邮件服务（改用 JetStream），观察消息是否补上——亲手体会核心模式与持久化模式的差别。
2. 写一个消费者，处理消息时以订单 ID 为键去重（内存 map 即可），然后故意让它崩溃重启（处理到第二条时 `os.Exit(1)`），验证不幂等的 `log.Println` 会重复打印、幂等版本不会。
3. 用 `kafka-go`（纯 Go）重写第三步的生产者与消费者，对比两套 API 的事件模型（channel 回调 vs context 同步），写一段不超过 200 字的选型笔记。

## 下一步

- 消息的序列化格式与兼容性：[Go 与 JSON](/go/330-GoJSON)；
- 队列的轻量替代与缓存场景：[Go 与 Redis](/go/550-GoRedis)；
- 消费端的可靠落库与事务：[Go 与数据库](/go/340-GoDatabase)；
- 优雅关闭的信号机制详解：[Go 信号处理](/go/430-GoSignalHandling)。
