---
order: 340
title: Kotlin 与协程 Channel
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: 协程间通信原语 Channel 的容量语义、多生产者多消费者、管道模式、select 多路与常见陷阱。
author: fanquanpp
updated: '2026-10-05'
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

## 底层原理：一张「谁在挂起」矩阵读懂全部容量语义

Channel 的所有行为都能从一张矩阵推出：给定容量与两侧的就绪状态，唯一的问题是
**哪一侧挂起**。Rendezvous 的「会合」语义是理解一切的锚点——容量为 0 意味着
缓冲区不存在，`send` 必须等一个接收者把手伸出来才完成投递，数据从不落地：

| 容量 | 有数据且缓冲未满时 send | 缓冲已满时 send | 无数据时 receive |
| --- | --- | --- | --- |
| Rendezvous（0） | 等待接收者到来（挂起） | 同左（没有缓冲可满） | 挂起，等 send |
| `Buffered(n)` | 立即入缓冲，不挂起 | 挂起，等缓冲腾出位置 | 缓冲有货立即取，无货挂起 |
| `CONFLATED` | 覆盖旧值，不挂起 | 不存在（容量恒 1） | 取走保留的最新值 |
| `UNLIMITED` | 立即入缓冲，不挂起 | 不存在（不会满） | 同 Buffered |

把这张矩阵与第 4 条陷阱连读：**生产者协程异常取消时，通道以异常关闭**——receive
端抛出同一个异常，`for` 循环随之结束。这是「通道把发送端的生命周期状态同步给
接收端」的设计：`close()` 是干净的结束信号，异常关闭是故障的传播信号，两者在
接收端的表现不同（`ClosedSendChannelException` vs 原始异常）。

实现层面只需知道一点：kotlinx.coroutines 1.7 起通道内部换成新的无锁缓冲算法
（`BufferedChannel`），替代了旧的链表实现；对使用者的语义（容量矩阵、单投递、
关闭协议）完全不变——这也是「背压语义与实现解耦」的好例子。

## 面试题思路：三个高频考法

1. 「Channel 和 BlockingQueue 的区别？」——表面答「挂起代替阻塞」（不占线程，
   挂起的协程可以恢复）；加分点是补上结构化并发：通道的生命周期与协程作用域绑定，
   生产者取消时接收端能感知（异常关闭），而 BlockingQueue 的两端要自己约定毒丸
   对象或超时。
2. 「容量参数怎么选？给一个任务分发系统设计通道。」——用「谁在挂起」矩阵答：
   任务提交方不能被拖慢、任务可丢弃选 CONFLATED；任务必须全处理、worker 数固定，
   选有界缓冲（容量决定峰值排队量与内存上限）；绝不选 UNLIMITED（内存不可控）。
   追问「如何优雅停机」：先 join 全部生产者，再 `close()`，worker 的 `for` 循环
   自然结束——与陷阱 1、2 呼应。
3. 「select 相比逐个 tryReceive 好在哪？」——tryReceive 是忙轮询（空转浪费 CPU、
   有延迟），select 是挂起等待（零开销等到任一通道就绪，与事件循环统一调度）。
   能补充 `onTimeout`/`onSend` 子句组合出「等消息或等超时」的复合等待是加分项。

## 动手实验

1. **挂起矩阵验证**：创建 Rendezvous 通道，先 `send` 后启动接收协程，用时间戳打印
   send 的返回时刻——验证「无接收者时 send 挂起」；换成 `Channel<Int>(4)` 重复，
   观察 send 立即返回；把缓冲改成 4 并连发 5 个，观察第 5 个才挂起。
2. **异常关闭实验**：在生产者协程里 `throw` 一个异常，观察接收方 `for` 循环的
   行为（异常传播、程序退出）；再改用 `runCatching` 包住 send，验证通道如何改为
   正常 close。
3. **fan-out 负载均衡观察**：一个生产者快速发 20 个任务，3 个消费者各带
   `delay(300)` 处理，打印「消费者 id 与任务序号」，验证每个任务只被处理一次且
   分摊大致均匀。
4. **CONFLATED 覆盖实验**：CONFLATED 通道连发 3 个值后再 receive 一次，确认只
   拿到最后一个；再 send 一次并 receive，验证通道仍可用（区别于关闭）。

## 小练习（先自己做，再展开参考实现）

**练习 1：带优雅停机的 worker 池**。实现 `fun CoroutineScope.workers(n: Int,
tasks: ReceiveChannel<String>)`：启动 n 个消费者分摊任务，并在所有任务消费完后
自动结束。再在 main 里造 3 个生产者、每个发 5 条任务，验证全部处理完后 main 正常
退出（不挂起、不漏任务）。

提示：生产者先 `join` 再 `close`；消费者用 `for (t in tasks)`。

参考实现：

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

fun CoroutineScope.workers(n: Int, tasks: ReceiveChannel<String>) = List(n) { id ->
    launch {
        for (t in tasks) {          // close 后自然结束，无需异常处理
            println("worker$id 处理 $t")
            delay(100)              // 模拟耗时
        }
    }
}

fun main() = runBlocking {
    val tasks = Channel<String>()

    val producers = List(3) { p ->
        launch {
            repeat(5) { i -> tasks.send("p$p-t$i") }
        }
    }
    producers.joinAll()             // 先等全部生产者发完
    tasks.close()                   // 再由「聚合者」关闭——陷阱 1、2 的标准解法

    val w = workers(2, tasks)
    w.joinAll()
    println("全部任务处理完成")
}
```

自检问题：如果把 `tasks.close()` 挪到 `joinAll()` 之前会发生什么？（答：先完成的
生产者关闭通道后，仍在发送的其他生产者抛 `ClosedSendChannelException`——
「聚合者最后关闭」是多生产者场景的铁律。）

**练习 2：用 select 实现「取任务或停机」**。给 worker 加一个 `stopChannel`：
平时从 `tasks` 取任务；`stopChannel` 一有信号（或关闭）就退出。用 `select` 实现，
不允许忙轮询。

参考实现：

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*
import kotlinx.coroutines.selects.*

fun CoroutineScope.worker(tasks: ReceiveChannel<String>, stop: ReceiveChannel<Unit>) =
    launch {
        while (true) {
            val job = select<String?> {
                tasks.onReceive { it }
                // onReceiveCatching 同时覆盖两种停机形态：
                // 收到信号（result 成功）或 stop 通道被关闭（result 失败），都返回 null
                stop.onReceiveCatching { null }
            } ?: break
            println("处理 $job")
        }
        println("worker 退出")
    }
// 语义注意：stop 关闭后该子句永远就绪，select 在多个就绪子句间的选择不保证公平，
// 已停止的 worker 可能比缓冲中的任务先退出——对「停机即放弃剩余任务」的语义
// 这通常正是想要的；若要「处理完积压再停」，需要额外的排水阶段。
```

**挑战题（不给参考实现）**：把「管道模式」扩成带并发度的版本：中间阶段不再是
单个协程，而是 m 个协程并发消费上一级通道、向下一级发送结果。要求：main 能在
有限时间内正常退出、每个输入恰好产生一个输出。写完自查：你关闭中间通道的位置
在哪里？m 个协程谁负责关闭？（提示：上一级通道关闭后，m 个中间协程各自结束，
需要用 `Job` 聚合它们再关闭下一级。）

## 小结

- Channel 是协程间的**热、单投递**管道；容量决定背压行为（Rendezvous/Buffered/CONFLATED/UNLIMITED）。
- 惯用法：`for (x in channel)` 迭代接收、`produce` 构建生产者、`close()` 表示发送结束。
- 多生产者汇入（fan-in）+ 多消费者分摊（fan-out）构成任务队列模式；`select` 提供多路复用。
- 广播场景不用 Channel，用 SharedFlow；状态场景用 StateFlow。
- 深入容量实现与 BroadcastChannel 演进史见 [Channel 与 BroadcastChannel](/kotlin/330-ChannelBroadcastChannel)；事件总线等实战见 [Kotlin 与 WebSocket](/kotlin/510-KotlinWebSocket)。
