---
order: 430
title: Kotlin 协程测试
module: 'kotlin'
category: 后端技术
difficulty: beginner
description: runTest 虚拟时间、TestDispatcher、MainDispatcherRule 与 Turbine 测 Flow 的完整协程测试方法。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：协程可测试性，属于 Kotlin 测试域中的「异步代码测试」分支，依赖 `kotlinx-coroutines-test` 与 Turbine 两个工具库。
- **解决什么问题**：被测代码里满是 `delay`、挂起函数、`Dispatchers.Main` 切换和 Flow 异步发射，用普通 JUnit 测试会真实等待几百毫秒甚至超时失败、出现「时快时慢」的竞态断言。
- **什么时候用到**：给 suspend 函数写单元测试；给带防抖、轮询、超时重试逻辑的代码验证时间行为；给 ViewModel 断言 `Loading -> Success` 状态序列；给 Flow 断言发射顺序与异常。

前置阅读：[Kotlin 测试与最佳实践](/kotlin/380-KotlinTestBestPractice)（JUnit 5 / Kotest / MockK 基础）；取消与超时语义见[协程取消与超时](/kotlin/235-KotlinCoroutineCancellationTimeout)。

## 1. 心智模型：虚拟时钟替代真实时钟

普通测试的时钟是墙钟：`delay(1000)` 真等 1 秒。`runTest` 换成**虚拟时钟**——`delay` 不再睡觉，只是把「虚拟时间」快进到下一个待处理任务的时刻。

```kotlin
@Test
fun `should fetch data asynchronously`() = runTest {
    // runTest 替代 runBlocking：自动跳过 delay，测试体结束后
    // 还会检查没有泄漏的子协程（有泄漏会报 UncompletedCoroutinesError）
    val result = fetchData()
    assertEquals("data", result)
}
```

逐行看这段承接自测试实践篇的代码：

- `= runTest { ... }`：函数体即测试体。`runTest` 的返回类型是 `TestResult`，JUnit 5 能识别它作为测试主体，所以测试函数可以写成表达式体。换成 `runBlocking` 也能跑，但 `delay(1000)` 会真等 1 秒——100 个这样的测试就是白等 100 秒。
- 易错点：`runTest` 会在测试结束时**等待所有子协程完成**。如果被测代码 `launch` 了一个无限循环（比如 `while(true) { delay(1000) }`），测试会挂住直到默认 60 秒超时。此时要么手动 `job.cancel()`，要么把后台协程放进 `backgroundScope`（见第 2 节）。

**工程场景（Android 搜索防抖）**：输入框每敲一个字取消上一次请求、延迟 300ms 才发真实请求。真实时钟下验证「连续输入只发一次请求」要等 300ms 且极易抖动；虚拟时间下 `advanceTimeBy(299)` 断言没发、`advanceTimeBy(1)` 断言发了，毫秒级精度且零等待。完整练习见文末动手实践。

## 2. 虚拟时间控制：advanceTimeBy 与 runCurrent

`runTest` 默认用 `StandardTestDispatcher`，launch 出去的协程**不会立即执行**，要靠你推进：

```kotlin
@Test
fun `should advance time`() = runTest {
    var result = ""
    backgroundScope.launch {          // 放进 backgroundScope：测试结束不要求它完成
        delay(1000)
        result = "done"
    }

    assertEquals("", result)
    advanceTimeBy(1000)               // 推进虚拟时钟 1000ms，期间到点的 delay 全部触发
    assertEquals("done", result)
}

@Test
fun `should run pending tasks`() = runTest {
    var executed = false
    launch {
        executed = true
    }
    assertFalse(executed)             // StandardTestDispatcher 下 launch 只是入队，还没跑
    runCurrent()                      // 只执行「已到时刻」的任务，不推进时钟
    assertTrue(executed)
}
```

逐段解释与易错点：

- `backgroundScope.launch`：`runTest` 的普通子协程会被测试结束前的「清场」等待；放进 `backgroundScope` 的协程会被自动取消，不参与清场。**换成普通 `launch` 且协程永不结束，测试就卡死**——这是协程测试第一大坑。
- `advanceTimeBy(1000)`：把虚拟时钟拨到 `+1000ms`，途中所有到期的 `delay` 按到期顺序执行。注意它是「快进到某时刻」而不是「睡 1000ms」：连续调用两次 `advanceTimeBy(500)` 与一次 `advanceTimeBy(1000)` 效果相同。
- `runCurrent()`：只执行当前虚拟时刻已就绪的任务。与 `advanceTimeBy(0)` 的区别是后者没有副作用、前者语义更清晰；需要「精确停在两个时刻之间」检查中间状态时用它。
- 易错点：`advanceUnconditionally()` 不存在，别与旧 API `pauseDispatcher` 混淆——`pauseDispatcher` 在 1.7 后已废弃，新代码只用 `advanceTimeBy` / `runCurrent`。

三个时间控制函数对照：

| 函数 | 时钟 | 用途 |
| --- | --- | --- |
| `runCurrent()` | 不推进 | 检查「此刻」状态 |
| `advanceTimeBy(ms)` | 推进 ms | 触发期间到期的 delay |
| `advanceUntilIdle()` | 推进到无任务 | 一把跑完所有排队任务 |

## 3. TestDispatcher 的两种选择

`StandardTestDispatcher` 与 `UnconfinedTestDispatcher` 决定 launch 的协程何时真正开始跑：

```kotlin
@Test
fun `standard vs unconfined`() = runTest {
    var standard = false
    var unconfined = false

    launch(StandardTestDispatcher(testScheduler)) { standard = true }
    launch(UnconfinedTestDispatcher(testScheduler)) { unconfined = true }

    assertFalse(standard)    // 入队未执行：可控但要多推一把
    assertTrue(unconfined)   // 立即在当前线程执行到第一个挂起点

    runCurrent()
    assertTrue(standard)
}
```

- `StandardTestDispatcher`（`runTest` 默认）：行为可预测，所有协程排队执行，配 `advanceTimeBy` / `runCurrent` 精确控制。**默认选它**。
- `UnconfinedTestDispatcher`：launch 立即执行直到第一个挂起点。适合「只关心最终结果、不想手动推进」的简单用例；代价是丢失了执行顺序的可控性，断言「还没发生」类状态时会翻车。
- 两者共享同一个 `testScheduler`（虚拟时钟），混用时时间控制仍然统一——传 `testScheduler` 参数是为了显式表达这一点。

## 4. MainDispatcherRule：替换 Dispatchers.Main

`Dispatchers.Main` 依赖 Android 主线程 Looper，JVM 单元测试环境里没有它，任何 `viewModelScope.launch { ... }` 都会抛 `IllegalStateException: Module with the Main dispatcher had failed to initialize`。标准解法是 JUnit Rule 在每个测试前后替换/复原 Main：

```kotlin
// MainDispatcherRule — 替换 Main 调度器（Android 官方仓库 codelab 同款写法）
class MainDispatcherRule : TestWatcher() {
    val testDispatcher = StandardTestDispatcher()

    override fun starting(description: Description) {
        Dispatchers.setMain(testDispatcher)   // 每个测试开始前：Main 指向测试调度器
    }

    override fun finished(description: Description) {
        Dispatchers.resetMain()               // 结束后复原，避免污染同进程的下一个测试
    }
}
```

逐段解释：

- 继承 `TestWatcher` 而不是实现 `TestRule` 接口：`TestWatcher` 只暴露 `starting` / `finished` 两个钩子，恰好覆盖「前替换、后复原」的需求，代码更短。换成实现 `TestRule` 的 `apply(base, description)` 写法功能等价，但要自己处理语句包装，容易忘 `base.evaluate()`。
- `Dispatchers.setMain(...)`：全局副作用，**必须在 `finished` 里 `resetMain()`**，否则同一次 Gradle 测试进程里后续不加载此 Rule 的测试类会拿到被替换的 Main。易错点：`resetMain` 之前若还有协程在 `testDispatcher` 上排队，协程会泄漏报错——必要时先 `testDispatcher.scheduler.advanceUntilIdle()`。
- 使用方式：测试类里加 `@get:Rule val mainDispatcherRule = MainDispatcherRule()`。`@get:Rule` 是 Kotlin 访问器的注解目标——JUnit 通过 getter 找 Rule，直接标在属性上的 `@Rule` 在 Kotlin 里不生效，这是 Kotlin + JUnit 4 风格 Rule 的经典易错点。

**工程场景**：Android 官方 architecture-samples 仓库中，所有直接或间接使用 `viewModelScope` 的 ViewModel 测试都挂这条 Rule；不挂的报错信息晦涩（init 异常藏在第一次 `launch` 处），新人排查半天，其实只需一行注解。

## 5. 断言 ViewModel 状态序列

状态型 ViewModel 的核心可测行为是「状态按序迁移」：

```kotlin
class MyViewModelTest {
    @Test
    fun `should emit loading then success`() = runTest {
        val repository = mockk<Repository>()
        coEvery { repository.fetchData() } returns Data("test")

        val viewModel = MyViewModel(repository)

        // 收集 StateFlow 的值：单独 launch 一个收集协程
        val states = mutableListOf<UiState>()
        val job = launch(StandardTestDispatcher()) {
            viewModel.state.toList(states)
        }

        viewModel.loadData()

        // 验证状态序列
        assertEquals(UiState.Loading, states[0])
        assertEquals(UiState.Success(Data("test")), states[1])

        job.cancel()
    }
}
```

逐段解释与易错点：

- `launch(StandardTestDispatcher()) { viewModel.state.toList(states) }`：StateFlow 只在「有人收集」时才把当前值与新值推进列表，必须先起收集协程。**易错点：忘了起收集协程，`states` 永远为空**；以及收集协程用 `UnconfinedTestDispatcher` 时首值立即收集、用 `StandardTestDispatcher` 时要 `runCurrent()` 一把才有首值，两写法断言时机不同。
- `job.cancel()`：`toList` 永不结束，不取消它会触发 `runTest` 的清场等待甚至超时。用 Turbine（下一节）就没有这个手工管理负担——这正是 Turbine 存在的理由。
- `UiState.Success(Data("test"))` 相等断言成立的前提是 `UiState` 是 data class；换成普通 class 会走引用比较而必败。易错点：状态类漏写 `data` 修饰，测试报错信息是 `expected: Success(data=test) but was: Success@1f2a` 这种难以直觉定位的形式。

**工程场景**：支付页 ViewModel 的状态机是 `Idle -> Loading -> Success/InsufficientBalance`。用状态序列断言而不是只断言终值，能抓住「跳过 Loading 直达 Success」的时序回归——终值断言测不出少了中间态。

## 6. Turbine：给 Flow 装上「逐个取件」的收件口

Turbine 把「收集 Flow + 逐个断言 + 自动清理」封装成一个 `test { }` 块：

```kotlin
import app.cash.turbine.test

class FlowTest {
    @Test
    fun `should emit values in order`() = runTest {
        val flow = flow {
            emit(1)
            emit(2)
            emit(3)
        }

        flow.test {
            assertEquals(1, awaitItem())
            assertEquals(2, awaitItem())
            assertEquals(3, awaitItem())
            awaitComplete()                // 断言流正常完结
        }
    }

    @Test
    fun `should handle errors`() = runTest {
        val flow = flow<Int> {
            emit(1)
            throw RuntimeException("Error")
        }

        flow.test {
            assertEquals(1, awaitItem())
            val error = awaitError()       // 断言流以异常收尾，并拿到异常对象
            assertEquals("Error", error.message)
        }
    }
}
```

逐段解释与易错点：

- `awaitItem()`：等待下一个发射值并返回。**多取会超时挂起**（默认外层 timeout 3 秒）——这是 Turbine 把「漏发射」变成显式失败的手段，比 `toList` 事后对比列表更能定位到第几个值出问题。
- `awaitComplete()` / `awaitError()`：二选一断言收尾方式。流既没完结也没报错时两者都超时，提示你被测流是持续型（如 StateFlow），应改用 `awaitItem()` 逐值断言或 `expectNoEvents()` 断言「不该有新值」。
- 易错点：`stateFlow.test { }` 的第一个 `awaitItem()` 是**当前值**（StateFlow 必有初值），新人才会以为是「等下一个变化」；要等变化应先 `awaitItem()` 吃掉当前值。
- 对比第 5 节手工 `toList` 写法：Turbine 不需要手动 `launch` 收集协程、不需要 `job.cancel()`、超时语义内置。团队新代码统一 Turbine，手工收集仅在不想引依赖的库里保留。

**工程场景**：聊天列表页订阅 `messages: Flow<List<Message>>`，用 Turbine 断言「断网重连后先发缓存列表再发合并列表」的两段式发射；用 `toList` 写同断言需要手工控制收集窗口，时序一紧就 flaky。

## 7. 速查：协程测试常用 API

**基本写法：runTest 测试协程**
`runTest { }`

```kotlin
// 协程测试运行器
@Test fun test() = runTest {
    val r = fetch()
    assertEquals("ok", r)
}
```

**基本写法：测试延迟跳过**
`runTest { delay(1000) }`

```kotlin
// 虚拟时间跳过延迟
runTest {
    delay(1000) // 不实际等待
    launch { }
}
```

**基本写法：Turbine 测试 Flow**
`<flow>.test { }`

```kotlin
// 使用 Turbine 测试 Flow
nums().test {
    assertEquals(1, awaitItem())
    awaitComplete()
}
```

**基本写法：推进虚拟时间**
`advanceTimeBy(<毫秒>)`

```kotlin
// 快进时钟触发到期的 delay
advanceTimeBy(300)
```

**基本写法：执行当前时刻任务**
`runCurrent()`

```kotlin
// 不推进时钟，只跑当前已就绪的任务
runCurrent()
```

**基本写法：替换 Main 调度器**
`Dispatchers.setMain(<testDispatcher>)`

```kotlin
// 通常封装成 MainDispatcherRule 使用
Dispatchers.setMain(StandardTestDispatcher())
```

## 动手实践

**任务**：实现并测试一个搜索防抖器。给 `fun search(queryFlow: Flow<String>): Flow<List<String>>` 加 300ms 防抖：查询流每次发射后等 300ms，期间有新查询则取消旧的；用 `map` 触发挂起的 `searchRepo(query)`。

提示：

1. 用 `debounce(300.milliseconds)` 一行即可实现，重点在**测试**怎么写；
2. 测试里用 `MutableSharedFlow<String>` 手动 `emit` 三次查询（"k"、"ko"、"kotlin"）；
3. 先 `advanceTimeBy(299)` + `runCurrent()` 断言还没有结果，再 `advanceTimeBy(1)` 断言只收到一次 `"kotlin"` 的结果；
4. repository 用 MockK `coEvery { searchRepo("kotlin") } returns listOf(...)` 打桩。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```kotlin
class SearchDebounceTest {
    @Test
    fun `rapid typing only triggers final query`() = runTest {
        val repo = mockk<SearchRepo>()
        coEvery { repo.searchRepo("kotlin") } returns listOf("kotlin doc")

        val queries = MutableSharedFlow<String>()
        val results = mutableListOf<List<String>>()
        val job = launch { queries.debounce(300).map { repo.searchRepo(it) }.toList(results) }
        runCurrent()  // 让收集协程先就位

        queries.emit("k")
        queries.emit("ko")
        queries.emit("kotlin")

        advanceTimeBy(299)
        runCurrent()
        assertEquals(emptyList(), results)   // 防抖窗口未到

        advanceTimeBy(1)                     // 跨过 300ms 边界
        runCurrent()
        assertEquals(listOf(listOf("kotlin doc")), results)  // 只发了一次

        job.cancel()
    }
}
```

易错点回顾：`MutableSharedFlow` 没有初值，收集协程就位前 emit 的值会丢——所以 emit 前先 `runCurrent()`；`advanceTimeBy` 是绝对时刻快进，299 + 1 两次调用等效于一次 300。

</details>

**任务 2**：给 `withTimeoutOrNull(1000) { fetchSlow() }` 写一个「超时走 null 分支」的测试。提示：`coEvery { fetchSlow() } coAnswers { delay(5000); ... }`，虚拟时间下测试整体毫秒级完成。

## 常见陷阱

1. **后台无限协程卡死测试**：`launch { while(true) { delay(1000) } }` 让 `runTest` 清场等待到超时。放 `backgroundScope` 或显式 cancel。
2. **在测试里捕获 CancellationException 吞掉**：与生产代码同一条铁律——取消异常必须重抛，否则虚拟时钟的取消机制失效。
3. **断言「还没发生」用了 UnconfinedTestDispatcher**：它立即执行，`assertFalse` 直接翻车；要断言中间态就用默认 Standard。
4. **Real 时间混入**：测试里调用 `Thread.sleep` 或 `System.currentTimeMillis` 绕开虚拟时钟，防抖测试又会变 flaky。一律用 `testScheduler.currentTime` 取虚拟时间。

## 相关阅读

- 取消与超时的生产语义：[协程取消与超时](/kotlin/235-KotlinCoroutineCancellationTimeout)
- 测试框架选型与 Mock：[Kotlin 测试与最佳实践](/kotlin/380-KotlinTestBestPractice)
- kotlin.test 基础断言：[Kotlin 与测试](/kotlin/390-KotlinTest)
- Flow 背压与操作符：[Flow 进阶](/kotlin/310-FlowAdvanced)

## 参考与致谢

- kotlinx-coroutines-test 官方文档与 API 参考（kotlinlang.org，Apache-2.0）：https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-test/
- Coroutines Guide - Testing（kotlinlang.org，Apache-2.0）：https://kotlinlang.org/docs/coroutines-and-channels.html
- Turbine（Cash App，Apache-2.0）：https://github.com/cashapp/turbine
