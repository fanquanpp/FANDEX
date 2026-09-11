---
order: 320
title: Kotlin 与协程 Channel
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: 协程间通信原语 Channel 的容量语义、多生产者多消费者、管道模式、select 多路与常见陷阱。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'kotlin/230-CoroutineBasics'
  - 'kotlin/300-FlowColdSharedState'
  - 'kotlin/250-CoroutineDispatcherContext'
  - 'kotlin/510-KotlinWebSocket'
prerequisites:
  - 'kotlin/230-CoroutineBasics'
---

## 概述

Channel 是 Kotlin 协程中用于协程之间传递数据的并发原语。与 Flow 的冷流不同，Channel 是热通道：发送方发送的数据会立刻传递给接收方，如果没有接收方，发送方会挂起等待。Channel 类似于阻塞队列（`BlockingQueue`），但所有操作都是非阻塞的挂起函数。

Channel 适用于生产者-消费者模式、协程间通信、任务分发等场景。

## 基础概念

- **Channel**：协程间传递数据的管道，支持多个发送方和接收方
- **SendChannel**：发送端的接口，提供 `send` 与 `trySend` 方法
- **ReceiveChannel**：接收端的接口，提供 `receive` 与 `tryReceive` 方法
- **Buffer**：Channel 的缓冲区大小，决定了发送方何时挂起
- **Rendezvous**：默认模式，缓冲区为 0，发送方和接收方必须"会合"才能完成传输

一个重要的语义约定：**Channel 中的每个值只能被一个接收者收到**（一次投递）。需要"广播"给所有接收者时，应使用 SharedFlow（BroadcastChannel 已废弃）。

## 快速上手

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

fun main() = runBlocking {
    // 创建一个 Channel（默认 Rendezvous：无缓冲）
    val channel = Channel<String>()

    // 启动发送协程
    launch {
        channel.send("消息1")
        channel.send("消息2")
        channel.send("消息3")
        channel.close()  // 关闭通道，表示不再发送
    }

    // 接收所有消息：迭代会在通道关闭后自动结束
    for (msg in channel) {
        println("收到: $msg")
    }
    println("通道已关闭")
}
// 预期输出：
// 收到: 消息1
// 收到: 消息2
// 收到: 消息3
// 通道已关闭
```

两个关键点：`close()` 之后的迭代会自然结束（不会永久挂起）；发送方向已关闭的通道 `send` 会抛出 `ClosedSendChannelException`。

## 详细用法

### Channel 的容量类型

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

fun main() = runBlocking {
    // 1. Rendezvous（默认）：缓冲区为 0，发送和接收必须同时就绪
    val rendezvous = Channel<Int>()  // 等价于 Channel<Int>(0)

    // 2. UNLIMITED：缓冲区无限大，send 永远不会因缓冲满而挂起
    val unlimited = Channel<Int>(Channel.UNLIMITED)

    // 3. Buffered：指定缓冲区大小，满时 send 挂起
    val buffered = Channel<Int>(10)  // 缓冲区大小为 10

    // 4. CONFLATED：只保留最新值，旧值会被覆盖
    val conflated = Channel<Int>(Channel.CONFLATED)

    launch {
        conflated.send(1)
        conflated.send(2)
        conflated.send(3)  // 只有 3 会被保留
    }
    delay(100)
    println(conflated.tryReceive().getOrNull())  // 3

    coroutineContext.cancelChildren()
}
// 预期输出：3
```

容量选择的直觉：**Rendezvous 提供最强的"背对背"同步**；有界缓冲适合吞吐优先；`CONFLATED` 只关心最新状态（如"最新配置"）；`UNLIMITED` 慎用——生产快于消费时会无限占用内存。

### 发送和接收

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

fun main() = runBlocking {
    val channel = Channel<Int>()

    launch {
        channel.send(1); channel.send(2); channel.send(3)
        channel.close()
    }

    // receive：挂起函数，没有数据时挂起，通道关闭且取空后抛 ClosedReceiveChannelException
    println(channel.receive())  // 1
    println(channel.receive())  // 2

    // tryReceive：非挂起，立即返回 ChannelResult（成功/失败/关闭原因）
    channel.receive()                          // 取走 3
    val result = channel.tryReceive()
    println(result.isSuccess)  // false（已空且关闭）
    println(result.isClosed)   // true（通道已关闭）

    coroutineContext.cancelChildren()
}
```

Kotlin 惯用 `for (x in channel)` 迭代替手动 `receive`：它把"关闭即结束"的语义处理得最干净，也不需要捕获异常。

### produce：便捷的生产者构建器

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

fun CoroutineScope.produceNumbers(): ReceiveChannel<Int> = produce {
    for (i in 1..5) send(i)
}

fun main() = runBlocking {
    produceNumbers().consumeEach { num -> println("收到: $num") }
}
// 预期输出：收到: 1 ... 收到: 5（各占一行）
```

`produce` 把"启动生产者协程 + 返回只读接收端"合并成一步，并纳入协程作用域管理；`consumeEach` 则在消费完成后消费（取消）该通道。注意 `produce` 必须在某个 `CoroutineScope` 内调用——这是结构化并发的要求。

### 管道模式

多个 Channel 可以串联形成流水线，每个阶段由独立协程驱动：

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

fun CoroutineScope.produceNumbers() = produce {
    var x = 1
    while (true) {
        send(x++)
        delay(100)
    }
}

fun CoroutineScope.squareNumbers(input: ReceiveChannel<Int>) = produce {
    for (x in input) send(x * x)
}

fun main() = runBlocking {
    val numbers = produceNumbers()
    val squares = squareNumbers(numbers)

    repeat(5) { println(squares.receive()) }
    // 输出：1 4 9 16 25

    // 取消该协程的所有子协程，停止流水线
    coroutineContext.cancelChildren()
    println("完成")
}
```

### 多生产者与多消费者（fan-in / fan-out）

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

fun main() = runBlocking {
    val channel = Channel<String>()

    // 多个发送方（fan-in：多路汇入同一条通道）
    val senders = List(3) { senderId ->
        launch {
            repeat(2) {
                channel.send("生产者$senderId-消息$it")
                delay(100)
            }
        }
    }

    // 多个接收方（fan-out：多协程分摊消费，每个值只被一个接收者处理）
    val receivers = List(2) { receiverId ->
        launch {
            for (msg in channel) println("消费者$receiverId 处理: $msg")
        }
    }

    senders.forEach { it.join() }
    channel.close()      // 发送方全部结束后关闭通道
    receivers.forEach { it.join() }
    println("全部处理完成")
}
// 预期输出（消息归属消费者的具体次序不固定，但每条消息只出现一次）：
// 消费者0 处理: 生产者0-消息0
// 消费者1 处理: 生产者1-消息0
// ...
// 全部处理完成
```

这个"任务分发"模式是 Channel 最典型的服务端用法：N 个 worker 从同一条通道取任务，天然实现负载均衡。

### select：多路等待

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*
import kotlinx.coroutines.selects.*

fun main() = runBlocking {
    val a = Channel<Int>()
    val b = Channel<Int>()

    launch { delay(100); a.send(1) }
    launch { delay(50); b.send(2) }

    // select 挂起等待"任意一个"分支先就绪
    val winner = select {
        a.onReceive { "A 先到: $it" }
        b.onReceive { "B 先到: $it" }
    }
    println(winner)  // B 先到: 2

    coroutineContext.cancelChildren()
}
```

`select` 还能组合 `onSend`、`onTimeout` 等子句，是多路复用场景（如同时等待消息与超时）的标准工具。

## 常见场景

### 生产者-消费者模式

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

data class Order(val id: Int, val item: String)

fun main() = runBlocking {
    val channel = Channel<Order>(capacity = 8)  // 有界缓冲：下单快时先排队

    // 生产者：接收订单
    launch {
        repeat(5) { i ->
            val order = Order(id = i, item = "商品$i")
            channel.send(order)
            println("下单: $order")
            delay(200)
        }
        channel.close()
    }

    // 消费者：处理订单
    launch {
        for (order in channel) {
            println("处理: $order")
            delay(500)  // 处理比下单慢
        }
        println("所有订单处理完成")
    }
}
```

### select 实现带超时的接收

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*
import kotlinx.coroutines.selects.*
import kotlinx.coroutines.withTimeoutOrNull

fun main() = runBlocking {
    val channel = Channel<Int>()
    launch { delay(600); channel.send(42) }

    // 200ms 内没有消息就走超时分支
    val result = withTimeoutOrNull(200) {
        channel.receive()
    } ?: -1  // 超时返回 -1
    println("结果: $result")  // 结果: -1

    coroutineContext.cancelChildren()
}
```

## 常见陷阱

1. **忘记 `close()`**：接收方的 `for` 迭代会永久挂起。发送逻辑结束时务必关闭通道；用 `produce` 可以避免手工管理。
2. **向已关闭的通道 send**：抛 `ClosedSendChannelException`。多生产者场景应先 `join` 所有发送协程，再由"聚合者"关闭。
3. **把 Channel 当广播用**：每个值只被一个接收者拿到。要广播用 `MutableSharedFlow`（BroadcastChannel 自 kotlinx.coroutines 1.7 起已彻底移除）。
4. **异常导致通道静默关闭**：生产者协程异常取消时通道会以异常关闭，接收方 `receive` 抛出同样的异常；`for` 迭代则会在父作用域中传播取消——排查这类问题时应检查生产者协程的错误处理。
5. **在 `UNLIMITED` 通道上堆积**：消费速度长期低于生产速度时内存会持续增长，应改用有界缓冲 + 挂起背压，或 `CONFLATED` 丢弃旧值。

## Channel vs Flow：如何选择

| 维度 | Channel | Flow |
| ---- | ------- | ---- |
| 数据模型 | 热通道，值被投递一次即消费 | 默认冷流，每个收集者独立执行 |
| 多接收者 | 分摊（每个值只归一个接收者） | 各自独立收到完整流 |
| 无消费者时 | 有缓冲则暂存，Rendezvous 下 send 挂起 | 不执行（惰性） |
| 生命周期 | 需要 close 与取消管理 | 由结构化并发统一管理 |
| 典型场景 | 任务队列、worker 池、协程间消息 | 数据流变换、UI 状态、响应式管线 |

经验法则：**"传工作任务"用 Channel，"传播状态与事件流"用 Flow/SharedFlow**。

## 小结

- Channel 是协程间的**热、单投递**管道；容量决定背压行为（Rendezvous/Buffered/CONFLATED/UNLIMITED）。
- 惯用法：`for (x in channel)` 迭代接收、`produce` 构建生产者、`close()` 表示发送结束。
- 多生产者汇入（fan-in）+ 多消费者分摊（fan-out）构成任务队列模式；`select` 提供多路复用。
- 广播场景不用 Channel，用 SharedFlow；状态场景用 StateFlow。
- 深入容量实现与 BroadcastChannel 演进史见 [Channel 与 BroadcastChannel](/kotlin/330-ChannelBroadcastChannel)；事件总线等实战见 [Kotlin 与 WebSocket](/kotlin/510-KotlinWebSocket)。
