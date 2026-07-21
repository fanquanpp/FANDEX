---
order: 42
title: Kotlin与协程Channel
module: kotlin
category: Kotlin
difficulty: intermediate
description: Channel热数据流
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/协程基础
  - kotlin/Flow冷流与SharedFlow和StateFlow
  - kotlin/协程调度器与上下文
  - kotlin/Kotlin与WebSocket
prerequisites:
  - kotlin/概述与环境配置
---

## 概述

Channel 是 Kotlin 协程中用于协程之间传递数据的并发原语。与 Flow 的冷流不同，Channel 是热通道：发送方发送的数据会立刻传递给接收方，如果没有接收方，发送方会挂起等待。Channel 类似于阻塞队列（BlockingQueue），但所有操作都是非阻塞的挂起函数。

Channel 适用于生产者-消费者模式、协程间通信、事件总线等场景。

## 基础概念

- **Channel**：协程间传递数据的管道，支持多个发送方和接收方
- **SendChannel**：发送端的接口，提供 send 和 trySend 方法
- **ReceiveChannel**：接收端的接口，提供 receive 和 tryReceive 方法
- **Buffer**：Channel 的缓冲区大小，决定了发送方何时挂起
- **Rendezvous**：默认模式，缓冲区为 0，发送方和接收方必须"会合"才能完成传输

## 快速上手

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

fun main() = runBlocking {
    // 创建一个 Channel
    val channel = Channel<String>()

    // 启动发送协程
    launch {
        channel.send("消息1")
        channel.send("消息2")
        channel.send("消息3")
        channel.close()  // 关闭通道，表示不再发送
    }

    // 接收所有消息
    for (msg in channel) {
        println("收到: $msg")
    }
    println("通道已关闭")
}
```

## 详细用法

### Channel 的不同类型

```kotlin
import kotlinx.coroutines.channels.*

fun channelTypes() = runBlocking {
    // 1. RendezvousChannel（默认）：缓冲区为0，发送和接收必须同时就绪
    val rendezvous = Channel<Int>()  // 等价于 Channel<Int>(0)

    // 2. UnlimitedChannel：缓冲区无限大，send 永远不会挂起
    val unlimited = Channel<Int>(Channel.UNLIMITED)

    // 3. BufferedChannel：指定缓冲区大小
    val buffered = Channel<Int>(10)  // 缓冲区大小为10

    // 4. ConflatedChannel：只保留最新值，旧值会被覆盖
    val conflated = Channel<Int>(Channel.CONFLATED)

    // 演示 ConflatedChannel
    launch {
        conflated.send(1)
        conflated.send(2)
        conflated.send(3)  // 只有3会被保留
    }
    delay(100)
    println(conflated.tryReceive().getOrNull())  // 3
}
```

### 发送和接收

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

fun sendReceiveDemo() = runBlocking {
    val channel = Channel<Int>()

    launch {
        // send：挂起函数，缓冲区满时挂起
        channel.send(1)
        channel.send(2)
        channel.send(3)
        channel.close()
    }

    // receive：挂起函数，没有数据时挂起
    println(channel.receive())  // 1
    println(channel.receive())  // 2
    println(channel.receive())  // 3

    // tryReceive：非挂起函数，立即返回结果
    val result = channel.tryReceive()
    println(result.isClosed)  // true（通道已关闭）

    // 使用 for 循环接收
    val channel2 = Channel<String>()
    launch {
        channel2.send("A")
        channel2.send("B")
        channel2.close()
    }
    for (item in channel2) {
        println(item)
    }
}
```

### produce 和 consumeEach

Kotlin 提供了便捷的构建器来创建生产者协程：

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

fun produceDemo() = runBlocking {
    // produce：创建一个生产者协程，返回 ReceiveChannel
    val numbers = produce {
        for (i in 1..5) {
            send(i)
        }
    }

    // consumeEach：消费所有接收到的元素
    numbers.consumeEach { num ->
        println("收到: $num")
    }
}

// 带过滤的生产者
fun CoroutineScope.produceEvens() = produce {
    for (i in 1..10) {
        if (i % 2 == 0) send(i)
    }
}

fun main() = runBlocking {
    val evens = produceEvens()
    evens.consumeEach { println(it) }
    // 输出: 2, 4, 6, 8, 10
}
```

### 管道模式

多个 Channel 可以串联形成管道：

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

fun CoroutineScope.squareNumbers(channel: ReceiveChannel<Int>) = produce {
    for (x in channel) {
        send(x * x)
    }
}

fun main() = runBlocking {
    val numbers = produceNumbers()
    val squares = squareNumbers(numbers)

    // 只取前5个结果
    repeat(5) {
        println(squares.receive())
    }
    println("完成")

    // 取消所有协程
    coroutineContext.cancelChildren()
}
```

### 多个协程共享 Channel

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

fun main() = runBlocking {
    val channel = Channel<String>()

    // 多个发送方
    val senders = List(3) { senderId ->
        launch {
            repeat(3) {
                channel.send("发送方$senderId - 消息$it")
                delay(100)
            }
        }
    }

    // 多个接收方
    val receivers = List(2) { receiverId ->
        launch {
            for (msg in channel) {
                println("接收方$receiverId 收到: $msg")
            }
        }
    }

    // 等待所有发送完成
    senders.forEach { it.join() }
    channel.close()
    delay(500)
    coroutineContext.cancelChildren()
}
```

### BroadcastChannel（已废弃，使用 SharedFlow 替代）

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

// 现在推荐使用 SharedFlow 替代 BroadcastChannel
fun sharedFlowDemo() = runBlocking {
    // 创建 SharedFlow，类似广播
    val sharedFlow = MutableSharedFlow<String>()

    // 多个收集者
    val collector1 = launch {
        sharedFlow.collect { println("收集者1: $it") }
    }
    val collector2 = launch {
        sharedFlow.collect { println("收集者2: $it") }
    }

    delay(100)

    // 发送事件，所有收集者都会收到
    sharedFlow.emit("事件1")
    sharedFlow.emit("事件2")

    delay(100)
    collector1.cancel()
    collector2.cancel()
}
```

## 常见场景

### 生产者-消费者模式

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

fun main() = runBlocking {
    val channel = Channel<Order>()

    // 生产者：接收订单
    launch {
        repeat(10) { i ->
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

data class Order(val id: Int, val item: String)
```

### 事件总线

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

class EventBus {
    private val channel = Channel<Event>(Channel.UNLIMITED)

    // 发布事件
    suspend fun publish(event: Event) {
        channel.send(event)
    }

    // 订阅事件
    fun subscribe(): ReceiveChannel<Event> = channel

    // 关闭
    fun close() = channel.close()
}

data class Event(val type: String, val data: String)

fun main() = runBlocking {
    val bus = EventBus()

    // 订阅者
    launch {
        bus.subscribe().consumeEach { event ->
            println("收到事件: ${event.type} - ${event.data}")
        }
    }

    // 发布事件
    bus.publish(Event("click", "按钮A"))
    bus.publish(Event("scroll", "页面1"))
    delay(500)
    bus.close()
}
```

### 限流器

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

class RateLimiter(private val maxRequests: Int, private val windowMs: Long) {
    private val channel = Channel<Unit>(maxRequests)

    suspend fun acquire() {
        channel.send(Unit)
    }

    fun release() {
        channel.tryReceive()
    }
}

fun main() = runBlocking {
    val limiter = RateLimiter(3, 1000)

    val jobs = List(10) { i ->
        async {
            limiter.acquire()
            println("请求 $i 开始处理")
            delay(500)
            println("请求 $i 完成")
            limiter.release()
        }
    }
    jobs.awaitAll()
}
```

## 注意事项

- **Channel 是热的**：发送的数据如果没有接收者，发送方会挂起（除非有缓冲区）
- **必须关闭 Channel**：不关闭 Channel 会导致接收方永远等待，使用 `close()` 或取消协程
- **Channel 是有损的**：ConflatedChannel 会丢弃旧值，RendezvousChannel 在没有接收者时发送会挂起
- **异常处理**：Channel 的发送和接收都可能抛出异常，需要妥善处理
- **Channel vs Flow**：Channel 适合协程间通信，Flow 适合数据流的转换和收集。大多数场景优先使用 Flow

## 进阶用法

### select 表达式

select 可以同时等待多个 Channel 的结果：

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*
import kotlinx.coroutines.selects.select

fun main() = runBlocking {
    val channel1 = Channel<String>()
    val channel2 = Channel<String>()

    launch {
        delay(100)
        channel1.send("来自通道1")
    }
    launch {
        delay(50)
        channel2.send("来自通道2")
    }

    // select：哪个通道先有数据就处理哪个
    val result = select<String> {
        channel1.onReceive { it }
        channel2.onReceive { it }
    }
    println("最快收到: $result")  // 来自通道2

    channel1.cancel()
    channel2.cancel()
}
```

### Channel 与 Flow 互转

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*
import kotlinx.coroutines.flow.*

fun main() = runBlocking {
    // Channel 转 Flow
    val channel = Channel<Int>()
    val flow = channel.receiveAsFlow()

    launch {
        flow.collect { println("Flow收到: $it") }
    }

    channel.send(1)
    channel.send(2)
    channel.close()
    delay(100)

    // Flow 转 Channel
    val flow2 = flowOf(10, 20, 30)
    val channel2 = flow2.produceIn(this)

    channel2.consumeEach { println("Channel收到: $it") }
}
```

### Ticker Channel

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

fun main() = runBlocking {
    // 创建定时通道，每秒发送一次
    val ticker = ticker(1000)

    var count = 0
    for (tick in ticker) {
        println("第${++count}次触发: ${System.currentTimeMillis()}")
        if (count >= 5) break
    }
    ticker.cancel()
}
```
