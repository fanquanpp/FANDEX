---
order: 270
title: Kotlin 协程取消与超时
module: 'kotlin'
category: 后端技术
difficulty: beginner
description: 协作式取消机制、cancelAndJoin、NonCancellable 清理与 withTimeout 超时的完整语义与工程用法。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：协程生命周期控制中的「取消」与「超时」，属于结构化并发的运行时语义分支。
- **解决什么问题**：用户离开页面、请求超时、任务作废时，如何让正在执行的协程体面停下来——既不能停不下来（泄漏与资源占用），也不能停在半途留下脏状态。
- **什么时候用到**：页面销毁取消网络请求；慢依赖兜底降级；轮询/倒计时任务的退出；finally 中释放数据库连接、锁、文件句柄。

前置：[协程基础](/kotlin/230-CoroutineBasics)的取消机制原理（§3.5）与异常语义见[协程异常处理](/kotlin/260-CoroutineExceptionHandling)。

## 1. 心智模型：取消是协作式的，不是强杀

协程取消**不是**杀线程。`job.cancel()` 只是把 Job 标记为「取消中」，协程体会在下一个**挂起点**（或显式检查点）抛出 `CancellationException` 退出。这决定了两条铁律：

1. **不挂起、不检查的代码块感知不到取消**——纯 CPU 循环会一直跑完；
2. **`CancellationException` 是正常退出路径，不能吞**——捕获所有 `Exception` 会把取消也吞掉，父协程以为任务还活着。

三个不同场景理解「为什么协作式是对的」：

- **场景 A（Android）**：用户离开搜索页，`viewModelScope` 自动取消在途请求。如果强杀线程，已写入一半的本地缓存会损坏；协作式取消让 finally 里的清理代码先跑完。
- **场景 B（Ktor 服务端）**：客户端断开连接，请求协程被取消，数据库事务在下一个挂起点回滚——半写事务不会提交。
- **场景 C（批处理 CLI）**：Ctrl+C 触发取消，导出任务在 finally 里关闭文件并写入「已处理到第 N 行」的断点。

## 2. 取消的基本机制

```kotlin
val job = scope.launch {
    repeat(1000) {
        // 检查取消状态
        ensureActive()  // 如果已取消，抛出 CancellationException
        println("Working $it")
        delay(100)      // delay 会自动检查取消
    }
}

delay(500)
job.cancel()           // 取消协程
job.join()             // 等待取消完成
// 或
job.cancelAndJoin()    // 取消并等待
```

逐段解释与易错点：

- `cancel()` 立即返回，**不等待**协程真正退出；`join()` 挂起直到协程结束（含清理）。删掉 `join()` 意味着下一行代码可能与还在清理的旧协程并发执行——测试里表现为偶发的「资源已被占用」。
- `delay` 每次被唤醒都检查取消标志，所以 `repeat` 里的循环每 100ms 自然获得一次取消机会。
- `ensureActive()` 在两个 delay 之间插入显式检查点：如果循环体改成纯 CPU 计算（`repeat(1000) { heavyCompute() }`），没有挂起点，取消要等整个循环结束——这正是第 4 节 CPU 密集场景的解法之一。
- 易错点：`cancel()` 之后调用 `job.invoke`（对 `Deferred` 是 `await()`）会抛异常；已取消的 Job 不可复用，重试应重新 `launch`。

## 3. 让清理代码在取消状态下也能挂起：NonCancellable

```kotlin
val job = scope.launch {
    try {
        repeat(1000) {
            println("Working $it")
            delay(100)
        }
    } finally {
        // 取消后仍需执行的清理代码
        withContext(NonCancellable) {
            delay(100)  // 在取消状态下也能 delay
            println("Cleanup completed")
        }
    }
}
```

逐段讲透「为什么必须包 NonCancellable」：

- 取消中的协程里，**任何挂起函数一进来就抛 `CancellationException`**。finally 里的 `close()` 如果是挂起函数（如事务提交、异步锁释放），不包 `NonCancellable` 会直接抛异常、清理半途而废。
- `withContext(NonCancellable)` 的语义是「换上一个不可取消的 Job，执行完再回来」。里面的 `delay(100)` 能正常挂起——它检查的是 `NonCancellable` 的 Job，不再理会外层的取消标志。
- 易错点：`NonCancellable` 只在**已取消的协程里**才有意义。在正常执行的协程里包 `NonCancellable` 会让这段代码无视外层 `withTimeout` 的超时取消——超时机制对它失效，这是「超时了但请求还挂着」的隐蔽来源。

三个不同场景：

1. **释放数据库连接**：`finally { withContext(NonCancellable) { connection.close() } }`。
2. **重入锁解锁**：`Mutex.withLock` 的 finally 释放路径由库内部处理，但自实现的信号量要自己包 NonCancellable。
3. **发送「任务中止」通知**：取消时给监控发最后一条消息，必须 NonCancellable 包住 `send`。

## 4. CPU 密集型任务的取消

```kotlin
// CPU 密集型任务不会自动检查取消
scope.launch {
    var nextPrintTime = System.currentTimeMillis()
    var i = 0
    while (i < 1000000) {
        // 手动检查取消
        if (!isActive) break  // 或 ensureActive()
        i++
    }
}

// 使用 isActive 属性
scope.launch {
    while (isActive) {
        performWork()
    }
}
```

- `isActive` 是 `CoroutineScope` 的扩展属性，读取当前协程上下文里 Job 的活跃状态；`break` 是温和退出（正常走完 try/finally），`ensureActive()` 是抛异常退出（走 catch 路径）。两者都对，区别在于退出后异常处理代码是否需要执行。
- `yield()` 是第三种选择：检查取消**并且**让出调度机会，适合长循环里顺手给同调度器的其他协程喘息空间。代价是一次潜在的线程切换，热循环里别每圈都调。

**工程场景**：图片批处理服务把 1 万张图缩放。用户点「停止」后若循环里没有检查点，进程要跑完全部 1 万张才响应——线上表现为「取消了但 CPU 还满转几分钟」。修复就是循环条件改 `while (isActive)`。

## 5. 超时：withTimeout 与 withTimeoutOrNull

```kotlin
// withTimeout — 超时抛出 TimeoutCancellationException
try {
    withTimeout(3000L) {
        fetchData()  // 超过 3 秒抛出异常
    }
} catch (e: TimeoutCancellationException) {
    println("Request timed out")
}

// withTimeoutOrNull — 超时返回 null
val result = withTimeoutOrNull(3000L) {
    fetchData()
}
if (result == null) {
    println("Request timed out")
}
```

逐段解释与易错点：

- `TimeoutCancellationException` **是** `CancellationException` 的子类。这是全协程库最容易踩的坑：外层若有 `catch (e: CancellationException)` 的取消保护逻辑，超时异常会被当成「正常取消」吞掉，超时表现为静默无结果。捕获顺序上应先 `catch (e: TimeoutCancellationException)` 再处理普通取消。
- `withTimeoutOrNull` 把超时映射为 null，适合「失败就换备用方案」的兜底；但**它同时掩盖了业务侧的 null**——`fetchData()` 本身可能合法返回 null，调用方无法区分「超时」与「真没数据」。需要区分时用 `withTimeout` + 显式异常。
- 易错点：超时只对**块内的挂起点**生效。块内调用了一个「阻塞线程的假挂起函数」（内部 `Thread.sleep` 或同步 HTTP），超时无法打断它，`withTimeout(1000)` 实际等了 30 秒。修法是把阻塞调用移进 `Dispatchers.IO`（见[调度器与上下文](/kotlin/250-CoroutineDispatcherContext)）。

**工程场景（兜底降级）**：推荐页主接口 800ms 超时，超时就用缓存的兜底列表：

```kotlin
val recommendations = withTimeoutOrNull(800) {
    api.fetchRecommendations()
} ?: cache.lastKnownRecommendations   // 超时降级，页面照常渲染
```

## 6. 组合模式：重试 + 超时 + 取消

真实工程里三者总是同时出现。示例：带指数退避的重试，单次尝试限 2 秒，整体受外层取消控制：

```kotlin
suspend fun <T> retryWithTimeout(
    times: Int = 3,
    perAttemptTimeout: Long = 2000
): T {
    var attempt = 0
    while (true) {
        try {
            return withTimeoutOrNull(perAttemptTimeout) { doCall() }
                ?: throw TimeoutCancellationException("attempt $attempt timed out")
        } catch (e: CancellationException) {
            if (e is TimeoutCancellationException && attempt < times - 1) {
                attempt++
                delay(100L shl attempt)   // 200ms、400ms、800ms 指数退避
            } else {
                throw e                    // 真取消或重试耗尽：向上传播
            }
        }
    }
}
```

逐段解释与易错点：

- `?: throw TimeoutCancellationException(...)`：把 `withTimeoutOrNull` 的 null 显式转回异常，让重试逻辑能用同一套 catch 处理「业务失败」与「超时」。
- `else { throw e }` 分支是关键：**外部传入的真取消（用户离开）必须原样上抛**。漏写这个判断，用户取消会被重试逻辑当成失败继续重试——取消机制整个失效。这是本篇最核心的易错点。
- 更成熟的工程做法是把重试策略下沉到库（如 Resilience4j 的 Kotlin 扩展或自研 retry operator），业务代码只声明策略。

## 7. 速查：取消与超时

**基本写法：取消协程**
`<job>.cancel()`

```kotlin
// 取消协程
job.cancel()
```

**基本写法：取消并等待**
`<job>.cancelAndJoin()`

```kotlin
// 取消并阻塞等待完成
job.cancelAndJoin()
```

**基本写法：响应取消**
`if (!isActive) return`

```kotlin
// 协程内主动检查取消
if (!isActive) return
```

**基本写法：确保取消检查**
`currentCoroutineContext().ensureActive()`

```kotlin
// 显式抛出取消异常
currentCoroutineContext().ensureActive()
```

**基本写法：超时抛异常**
`withTimeout(<毫秒>) { }`

```kotlin
// 超时抛 TimeoutCancellationException
withTimeout(1000) { doWork() }
```

**基本写法：超时返回 null**
`withTimeoutOrNull(<毫秒>) { }`

```kotlin
// 超时返回 null 不抛异常
val r = withTimeoutOrNull(1000) { doWork() }
```

**基本写法：不可取消的清理**
`withContext(NonCancellable) { }`

```kotlin
// 取消状态下仍需挂起的清理代码
finally { withContext(NonCancellable) { cleanup() } }
```

## 动手实践

**任务 1**：实现「用户离开页面取消搜索请求且不更新 UI」。给 `SearchViewModel` 写 `fun onQuery(text: String)`：每次调用取消上一次在途搜索、发起新搜索；搜索完成前页面已销毁时，结果不得写入状态。用 [Kotlin 协程测试](/kotlin/395-KotlinCoroutineTesting)的虚拟时间验证。

提示：

1. 用 `var searchJob: Job? = null` 保存在途任务，新查询先 `searchJob?.cancel()`；
2. 取消后 `fetch` 里已 `delay` 一半的旧请求会被挂起点打断——验证 `uiState` 仍是初始值；
3. 用 MockK `coAnswers { delay(5000); ... }` 让请求慢到必然被取消。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```kotlin
class SearchViewModel(private val repo: Repo) : ViewModel() {
    private var searchJob: Job? = null
    private val _state = MutableStateFlow(SearchState.Idle)
    val state: StateFlow<SearchState> = _state.asStateFlow()

    fun onQuery(text: String) {
        searchJob?.cancel()                    // 取消上一次在途搜索
        searchJob = viewModelScope.launch {
            _state.value = SearchState.Loading
            val results = try {
                repo.search(text)              // 内部是挂起调用，可被取消
            } catch (e: CancellationException) {
                throw e                        // 取消必须重抛：不写状态、不吞异常
            }
            _state.value = SearchState.Results(results)
        }
    }
}
```

测试断言两点：快速连发两次查询后只有第二次的结果出现；`cancel` 后旧请求的 `coAnswers` 协程停在 `delay` 处不再恢复。易错点：在 `catch (e: CancellationException)` 里写 `_state.value = Error(...)` 会把页面销毁的取消也当成错误展示——这正是「离开页面还弹错误 toast」的经典线上 bug。

</details>

**任务 2**：给「慢依赖兜底」写生产代码与测试——`loadProfile()` 依次尝试主源（限 500ms）与备份源（限 500ms），两者都超时返回缓存；验证外层取消（调用方 `cancel`）时整个链立即停止、连缓存都不读。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```kotlin
suspend fun loadProfile(): Profile {
    val fresh = withTimeoutOrNull(500) { primary.load() }
        ?: withTimeoutOrNull(500) { backup.load() }
        ?: return cache.snapshot()          // 双超时走缓存
    return fresh
}
```

测试要点：`coAnswers { delay(10_000) }` 模拟两个源都慢，虚拟时间下总耗时 1000ms；外层取消用 `runTest { val j = launch { loadProfile() }; runCurrent(); j.cancelAndJoin() }`——若实现把取消吞进缓存读取，测试会因 `runTest` 清场发现泄漏协程而失败。

</details>

## 常见陷阱

1. **吞 CancellationException**：`catch (e: Exception)` 一把抓后不重抛，取消失效、`runTest` 报协程泄漏。
2. **finally 清理不包 NonCancellable**：取消路径上挂起清理函数直接抛异常，资源泄漏。
3. **CPU 循环无检查点**：`cancel()` 后任务继续跑完，表现为「取消了但还在烧 CPU」。
4. **阻塞调用让超时失效**：`withTimeout` 打不断 `Thread.sleep` 与同步 IO，超时形同虚设。
5. **超时后复用 Deferred**：已取消的 Job 不可重启，重试要重新 launch。

## 相关阅读

- 虚拟时间测取消与超时：[Kotlin 协程测试](/kotlin/395-KotlinCoroutineTesting)
- 异常与 SupervisorJob：[协程异常处理](/kotlin/260-CoroutineExceptionHandling)
- 调度器与阻塞桥接：[协程调度器与上下文](/kotlin/250-CoroutineDispatcherContext)
- 取消机制的形式化原理：[协程基础](/kotlin/230-CoroutineBasics) 3.5 节

## 参考与致谢

- Coroutines Guide - Cancellation and Timeout（kotlinlang.org，Apache-2.0）：https://kotlinlang.org/docs/cancellation-and-timeouts.html
- kotlinx.coroutines API（kotlinlang.org，Apache-2.0）：https://kotlinlang.org/api/kotlinx.coroutines/
