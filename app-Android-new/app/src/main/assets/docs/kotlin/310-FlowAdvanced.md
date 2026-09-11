---
order: 310
title: Flow 进阶：操作符组合、冷热流转换与背压实战
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: 系统梳理 Flow 的中间与末端操作符、冷热流转换（stateIn/sharedIn）、背压策略与组合模式，附完整可运行示例与常见陷阱。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'kotlin/290-FlowReactiveStream'
  - 'kotlin/300-FlowColdSharedState'
  - 'kotlin/230-CoroutineBasics'
prerequisites:
  - 'kotlin/230-CoroutineBasics'
  - 'kotlin/290-FlowReactiveStream'
---

## 概述

本文是 Flow 的进阶速成：在掌握"Flow 是冷的异步序列"之后，重点解决三个工程问题——**如何用操作符组合出复杂的数据管线**、**冷流如何安全地共享为热流**、**生产快于消费时如何背压**。所有示例均可在 Kotlin Playground（需添加 `kotlinx-coroutines` 依赖）或本地 `main` 函数中直接运行。

## 快速上手：一条完整的 Flow 管线

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

fun main() = runBlocking {
    // 创建 -> 转换 -> 过滤 -> 收集，一条管线完成
    (1..5).asFlow()
        .map { it * 10 }                 // 每个元素乘 10
        .filter { it % 20 != 0 }         // 过滤掉 20 的倍数
        .onEach { println("发射: $it") } // 副作用观察
        .collect { println("收集: $it") }
}
// 预期输出（顺序执行，冷流逐元素流经管线）：
// 发射: 10
// 收集: 10
// 发射: 30
// 收集: 30
// 发射: 50
// 收集: 50
```

要点：中间操作符（`map`/`filter`/`onEach`）只是**构建**了新的 Flow，不做任何计算；直到末端操作符 `collect` 被调用，冷流才真正开始逐元素执行——这就是"冷流"的含义：每个收集者触发一次独立、完整的执行。

## 详细用法

### 创建：从集合、区间到自定义流

```kotlin
flowOf(1, 2, 3)                 // 固定值
listOf("a", "b").asFlow()       // 集合转 Flow
(1..10).asFlow()                // 区间转 Flow
flow {                          // 自定义：手动 emit
    for (i in 1..3) emit(i)
}
channelFlow {                   // 需要并发发送时（内部有 Channel 支撑）
    launch { send("from-1") }
    send("main")
}
```

陷阱：`flow { ... }` 构建器内**只能从同一个协程** `emit`（`emit` 不是线程安全的），需要多协程并发发射时用 `channelFlow` 或 `callbackFlow`。

### 中间操作符：变换、过滤与节流

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

suspend fun main() = coroutineScope {
    val nums = (1..5).asFlow()

    // transform：一个输入可发射任意多个输出，比 map 更通用
    nums.transform { emit(it); emit(it * 10) }
        .collect { print("$it ") }          // 1 10 2 20 3 30 4 40 5 50
    println()

    // take：取前 N 个后取消上游（上游会收到取消信号）
    nums.take(2).collect { print("$it ") }  // 1 2
    println()

    // distinctUntilChanged：相邻重复去重
    flowOf(1, 1, 2, 2, 2, 3).distinctUntilChanged()
        .collect { print("$it ") }          // 1 2 3
    println()

    // debounce：防抖，只有间隔超过阈值的新值才保留（适合搜索框输入）
    // sample：采样，固定周期取最新值（适合高频进度更新）
}
```

### 末端操作符：collect 之外的选择

`collect` 是最通用的末端操作符，但很多场景有更直接的替代：

```kotlin
import kotlinx.coroutines.flow.*

suspend fun main() {
    val nums = flowOf(1, 2, 3, 4)

    println(nums.toList())     // [1, 2, 3, 4]  收集为列表
    println(nums.first())      // 1             取第一个
    println(nums.first { it > 2 })  // 3        取第一个满足条件的
    println(nums.last())       // 4
    println(nums.count { it % 2 == 0 })  // 2  计数
    println(nums.fold(0) { acc, v -> acc + v })  // 10  带初值聚合
    println(nums.reduce { acc, v -> acc + v })   // 10  无初值聚合
    // single()：要求流恰好只有一个元素，否则抛异常
}
```

注意末端操作符都是 `suspend` 函数：它们会**挂起直到流完成**，因此同一个协程里两次 `collect` 是先后串行的，不会并发。

### 冷流转热流：stateIn 与 sharedIn

冷流每次 collect 都重新执行上游（如重新发起网络请求）；多收集者场景应共享为热流：

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

fun main() = runBlocking {
    val scope = CoroutineScope(Dispatchers.Default)

    // 冷流：每个收集者独立数一遍
    val cold: Flow<Int> = flow {
        var i = 0
        while (true) { emit(++i); delay(100) }
    }

    // stateIn：转为有"当前值"的 StateFlow，UI 状态首选
    val state: StateFlow<Int> = cold.stateIn(
        scope = scope,
        started = SharingStarted.WhileSubscribed(5000), // 无订阅 5 秒后停止上游
        initialValue = 0
    )

    // sharedIn：转为普通事件热流 SharedFlow
    val events: SharedFlow<Int> = cold.sharedIn(
        scope = scope,
        started = SharingStarted.Eagerly,
        replay = 1 // 新订阅者重放最近 1 个值
    )

    delay(350)
    println("当前状态: ${state.value}")  // 当前状态: 3
    scope.cancel()                        // 停止共享与上游
}
```

`WhileSubscribed(5000)` 是 Android ViewModel 场景的惯用策略：有订阅者才运行上游，订阅者全部离开后延迟 5 秒停止，兼顾刷新与省电。

### 背压：buffer、conflate 与 collectLatest

生产快于消费时，默认行为是**挂起发射方等消费方**（天然背压）。想改行为，三种选择：

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

fun events() = flow {
    for (i in 1..3) {
        emit(i)
        delay(100)          // 生产快：每 100ms 一个
    }
}

fun main() = runBlocking {
    // 1. buffer：发射与消费并发，中间缓冲 N 个值（总时长 ≈ max(生产, 消费)）
    val t1 = System.currentTimeMillis()
    events().buffer(2).collect {
        delay(300)          // 消费慢：每 300ms 处理一个
        print("$it@${(System.currentTimeMillis()-t1)/100}s ")
    }
    // 输出类似：1@0s 2@0s 3@1s —— 总耗时约 1 秒而非 1.2+0.9 秒
    println()

    // 2. conflate：消费跟不上就丢中间值，只处理最新
    events().conflate().collect {
        delay(300)
        print("$it ")
    }
    // 输出：1 3 （2 在处理 1 期间被跳过）
    println()

    // 3. collectLatest：新值到来取消上一个未完成的处理
    events().collectLatest {
        delay(300)          // 模拟耗时处理
        print("$it ")
    }
    // 输出：3 （1、2 的处理在完成前被取消）
}
```

选择口诀：**一个都不能丢用 `buffer`；只要最新状态用 `conflate`；只关心最新结果且处理可中断用 `collectLatest`**。

### 组合多个流：combine 与 zip

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

fun main() = runBlocking {
    val f1 = flowOf(1, 2, 3)
    val f2 = flowOf("A", "B")

    // combine：任一 upstream 发出新值，就用"双方最新值"组合
    f1.combine(f2) { n, s -> "$n$s" }.collect { print("$it ") }
    // 输出顺序取决于发射时机，典型为：1A 2A 2B 3B
    println()

    // zip：严格按位置配对，短流结束整体结束
    f1.zip(f2) { n, s -> "$n$s" }.collect { print("$it ") }
    // 输出：1A 2B （3 被丢弃）
    println()

    // flattenMerge：把"流的流"并发展平收集
    val nested: Flow<Flow<Int>> = flowOf(flowOf(1, 2), flowOf(3, 4))
    nested.flattenMerge().collect { print("$it ") }  // 1 2 3 4（并发时顺序不定）
}
```

`combine` 的关键语义：**它不是配对，而是"最新值快照"的组合**——收集开始时某个流还没发值，组合就暂不发生。

### 启动收集：launchIn 与作用域绑定

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

fun main() = runBlocking {
    val scope = CoroutineScope(Dispatchers.Default)

    flowOf(1, 2, 3)
        .onEach { println("收到: $it") }
        .launchIn(scope)          // 等价于 scope.launch { flow.collect { ... } }
        .join()                   // 等待收集完成

    scope.cancel()
}
```

`launchIn` 必须传入作用域，这个 API 设计"强迫"你思考收集协程的生命周期归属——这正是结构化并发在 Flow 上的体现。

## 常见场景

### 搜索框防抖 + 重试 + 错误兜底

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

fun search(queryFlow: Flow<String>): Flow<List<String>> =
    queryFlow
        .debounce(300)                      // 300ms 防抖
        .distinctUntilChanged()             // 内容没变不请求
        .mapLatest { q ->                   // 新查询取消旧查询
            fakeRemoteSearch(q)
        }
        .retryWhen { cause, attempt ->      // 指数退避重试
            if (cause is java.io.IOException && attempt < 3) {
                delay(1000 * (attempt + 1)); true
            } else false
        }
        .catch { emit(emptyList()) }        // 最终失败给兜底值

suspend fun fakeRemoteSearch(q: String): List<String> {
    delay(200)
    return listOf("$q-1", "$q-2")
}
```

### 定时刷新轮询

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

fun tickerFlow(intervalMs: Long) = flow {
    while (true) {
        emit(Unit)
        delay(intervalMs)
    }
}

fun priceFlow() = tickerFlow(1000).map { fetchPrice() }  // 每秒拉一次价格

suspend fun fetchPrice(): Double = 100.0 + (0..100).random() / 10.0
```

## 常见陷阱

1. **在 `flow { }` 里换线程**：`withContext(Dispatchers.IO) { emit(x) }` 编译报错（emit 有上下文保护）。正确做法是 `flowOn(Dispatchers.IO)`——只改变上游执行上下文，且可以多层叠加、以最靠近流源头的一个为准。
2. **`catch` 只捕获上游**：`catch` 只处理它**上游**抛出的异常，下游 `collect` 块内的异常不会进 `catch`。需要覆盖收集侧时用 `try/catch` 包住 `collect`。
3. **共享热流忘记传作用域生命周期**：`stateIn`/`sharedIn` 传入 `GlobalScope` 会让上游永不停止，泄漏协程；应传入与 UI/ViewModel 生命周期绑定的作用域。
4. **对热流重复 subscribe 期待独立执行**：SharedFlow/StateFlow 是共享的，所有收集者看到同一条数据；要独立执行请保持冷流。
5. **`combine` 误当 `zip` 用**：`combine` 是最新值组合、触发次数可能远多于预期；`zip` 是严格配对。混淆会导致事件数量对不上。

## 小结

- 中间操作符只构建管线，末端操作符（`collect`/`first`/`toList`...）才触发执行。
- 冷流转热流的正规姿势是 `stateIn`（状态）与 `sharedIn`（事件），并选择合适的 `SharingStarted` 策略。
- 背压三件套：`buffer`（不丢）、`conflate`（保最新）、`collectLatest`（取消旧处理）。
- `combine` 是最新值快照组合，`zip` 是位置配对；`catch` 只管上游，`flowOn` 只管上游上下文。
- 深入原理（冷流代数语义、SharedFlow 状态机、共享策略的形式化分析）见 [Flow 响应式流](/kotlin/290-FlowReactiveStream) 与 [Flow 冷流与共享状态](/kotlin/300-FlowColdSharedState)。
