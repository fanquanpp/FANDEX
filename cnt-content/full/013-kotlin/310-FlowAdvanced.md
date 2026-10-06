---
order: 340
title: Flow 进阶：操作符组合、冷热流转换与背压实战
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: 系统梳理 Flow 的中间与末端操作符、冷热流转换（stateIn/sharedIn）、背压策略与组合模式，附完整可运行示例与常见陷阱。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'kotlin/290-FlowReactiveStream'
  - 'kotlin/300-FlowColdSharedState'
  - 'kotlin/230-CoroutineBasics'
prerequisites:
  - 'kotlin/230-CoroutineBasics'
  - 'kotlin/290-FlowReactiveStream'
---

## 知识点地图

- **知识类别**：Flow 的操作符体系与执行语义——背压三件套（buffer/conflate/collectLatest）、多流组合（combine/zip/展平）、错误处理与流式生命周期。
- **解决什么问题**：生产快于消费时丢不丢值、丢哪些值；多条流怎么组合；上游失败怎么兜底——这些语义选择直接决定数据正确性。
- **什么时候用到**：任何收集 Flow 的场景；设计搜索防抖、状态合并、多源聚合；给流管线加重试与降级。

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

    // flattenConcat：顺序展平——前一个内部流收完才开始下一个
    nested.flattenConcat().collect { print("$it ") }  // 1 2 3 4（严格顺序）
}
```

`combine` 的关键语义：**它不是配对，而是"最新值快照"的组合**——收集开始时某个流还没发值，组合就暂不发生。`flattenConcat` 与 `flattenMerge` 的取舍同源：顺序性要求高（如按优先级消费任务流）用 `Concat`，吞吐优先（并发抓取多个源）用 `Merge`。

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

## 底层原理：flowOn、buffer、conflate 是同一个机制的三种配置

背压三件套与 `flowOn` 看似不相关，实现上却是同一个构件——**在发射方与收集方之间
插入一个带缓冲的 Channel**：

- `buffer(n)`：插入容量 n 的 Channel，发射协程往里放、收集协程从里取，两边从此
  并发——「总耗时约等于较慢一方」的数学来源就在这里；
- `conflate()`：等价于容量 1 且放满丢弃最旧值的 Channel——所以它的语义恰好是
  「永远留最新」；
- `flowOn(dispatcher)`：插入同样的 Channel，并规定**Channel 上游一侧**运行在指定
  调度器上，下游一侧保持收集者的上下文——这就是「flowOn 只影响上游」与
  「emit 的上下文保护能放行」的原理：`flow { emit }` 的上下文检查比较的是发射点与
  flowOn 指定点，不再与收集方绑定。

理解这一点后，三条经验法则不证自明：

1. `flowOn` 可以叠加，只有**最靠近源头**的那个生效（上游链每段按最近的一个执行）；
2. `buffer` 换不来「不丢数据」之外的东西，容量是权衡内存与并发的旋钮；
3. 背压策略调错了想改，只需要在管线里挪一个操作符的位置，不必重写源头。

collectLatest 是例外：它不用 Channel 缓冲，而是给每个新值**取消上一个还没跑完的
处理块**——「只关心最新结果」的语义来自协程取消，不是丢弃。

## 面试题思路：三个高频考法

1. 「StateFlow 和 SharedFlow 怎么选？」——按「要不要当前值」答：UI 状态选
   StateFlow（有 `value`、新订阅者必得当前值、相同值去重）；一次性事件（点击、
   导航）选 SharedFlow（可配 replay/extraBufferCapacity，不合并相同值）。追问
   「配置事件会不会被 replay 重放造成重复消费」时，能给出 replay=0 + 事件带 id
   去重的方案是加分线。
2. 「flowOn 为什么不能换成在 flow 里 withContext？」——考上下文保护机制：`emit`
  校验调用上下文与收集上下文一致，`withContext` 恰好破坏这一致性所以编译不过；
   `flowOn` 是官方给出的「改变上游上下文」的正规通道，实现上是插入 Channel 隔离
   两侧。
3. 「搜索框管线里 debounce、distinctUntilChanged、mapLatest 各解决什么问题？
   顺序能换吗？」——debounce 防抖（用户停手才查）、distinct 防重复查询、
   mapLatest 取消慢查询。三者两两正交，但 debounce 放在 distinct 之后能省一次
   计时器重置；mapLatest 若换成 flatMapLatest + collectLatest 也等价——能讲出
   「算子顺序影响的是时机与浪费，不是正确性」即可。

## 动手实验

1. **Channel 机制验证**：给 `events()` 分别接 `.buffer(0)`、`.buffer(3)`，用时间戳
   打印发射与收集时刻，观察「容量 0 退化为串行、容量 3 让发射提前跑完」——亲手
   验证背压三件套的 Channel 原理。
2. **flowOn 叠加实验**：在管线里放两个 `flowOn`（一个 `Dispatchers.IO`，一个
   `Dispatchers.Default`），在源头与各中间操作符里打印线程名，确认只有靠近源头的
   生效；再把顺序对调，观察结果翻转。
3. **combine 触发次数实验**：让 `f1` 每 100ms 发一个、`f2` 每 250ms 发一个，各发
   10 个，数一数 `combine` 收集到的次数与 `zip` 的次数（预期：zip 恰好 10；
   combine 取决于时机，明显更多）。
4. **catch 边界实验**：在 `collect {}` 的 lambda 里手动 `throw`，验证第 1 条陷阱
   （异常不会被管线的 `catch` 捕获），再用 `try/catch` 包住 `collect` 修复。

## 小练习（先自己做，再展开参考实现）

**练习 1：给搜索管线补齐健壮性**。基于「常见场景」一节的 `search()`，新增两个
需求：(a) 查询变化时立即清空结果展示 loading（提示：`mapLatest` 前后分别处理）；
(b) 每个查询结果附带耗时统计。先写任务清单再动手。

提示：loading 可以用 `onStart { emit(Loading) }` 的密封类结果流承载。

参考实现：

```kotlin
sealed interface SearchResult {
    data object Loading : SearchResult
    data class Done(val items: List<String>, val costMs: Long) : SearchResult
    data class Failed(val msg: String) : SearchResult
}

fun searchRobust(queryFlow: Flow<String>): Flow<SearchResult> =
    queryFlow
        .debounce(300)
        .distinctUntilChanged()
        .mapLatest { q ->
            val t0 = System.currentTimeMillis()
            val items = fakeRemoteSearch(q)
            SearchResult.Done(items, System.currentTimeMillis() - t0)
        }
        .onStart { emit(SearchResult.Loading) }
        .retryWhen { cause, attempt ->
            if (cause is java.io.IOException && attempt < 3) {
                delay(1000 * (attempt + 1)); true
            } else false
        }
        .catch { emit(SearchResult.Failed(it.message ?: "unknown")) }
```

自检问题：`onStart { emit(Loading) }` 为什么放在 `mapLatest` 之后而不是之前？
（答：放在前面会在**每次订阅**时发一次 loading，放后面则在每次上游开始发射前发
loading——本需求要的是「每次新查询开始」的时机，顺序就是语义。）

**练习 2：节流仪表盘**。实现 `fun <T> Flow<T>.sampleUntil(timeoutMs: Long):
Flow<T>`——高频值流中，每 timeoutMs 至多放行一个值（不足周期时保留最新）。
不允许直接用 `sample`，用 `conflate` + `delay` 组合实现，并写一条断言验证
10ms 间隔发 100 个值、timeout 50ms 时输出约 10 到 11 个。

提示：`conflate` 只留最新值，`collect { delay(timeout); emit(it) }` 天然节流。

参考实现：

```kotlin
fun <T> Flow<T>.sampleUntil(timeoutMs: Long): Flow<T> = flow {
    collect { value ->
        emit(value)               // 放行一个值
        delay(timeoutMs)          // 周期内本协程在 delay，收不下手
    }
}.conflate()
// conflate 的语义补完剩下的一半：delay 期间涌来的新值只会保留最新一个，
// delay 结束后 collect 恢复，拿到的正是「窗口内最新值」。
// 这就是标准库 sample() 的手工孪生版本——理解了它，sample 的语义不再神秘。
```

**挑战题（不给参考实现）**：把「定时刷新轮询」场景改造成「手动 + 自动双模式」：
用户下拉立即刷新（手动信号），同时后台每 30 秒自动刷新；两次刷新间隔不足 2 秒时
合并为一次。提示：手动信号是 `MutableSharedFlow`，自动信号是 ticker 流，
`merge` + `debounce`（或 `sample`）组合。写完自查：合并窗口里丢的是哪个信号，
用户会感知吗？

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
