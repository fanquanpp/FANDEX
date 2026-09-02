---
order: 90
title: Kotlin 协程进阶
module: 'kotlin'
category: 后端技术
difficulty: advanced
description: 协程异常处理、取消、超时、Flow 高级操作、StateFlow/SharedFlow 与 Select。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'kotlin/007-KotlinGenericTypeSystem'
  - 'kotlin/008-KotlinCollectionCoroutine'
  - 'kotlin/010-KotlinMultiplatform'
  - 'kotlin/011-KotlinDSLDomainSpecificLanguage'
prerequisites: []
---

## 前置知识

- [Kotlin 集合与协程](/kotlin/008-KotlinCollectionCoroutine)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 协程异常处理」的核心机制、典型用法与常见陷阱
- 掌握「2. SupervisorJob」的核心机制、典型用法与常见陷阱
- 掌握「3. 协程取消」的核心机制、典型用法与常见陷阱
- 掌握「4. 超时」的核心机制、典型用法与常见陷阱
- 掌握「5. Flow 高级操作」的核心机制、典型用法与常见陷阱


## 1. 协程异常处理

### 1.1 异常传播

协程异常的传播取决于构建器类型：

```kotlin
// launch — 异常立即传播到父协程
val job = scope.launch {
    throw Exception("Failed")  // 传播到 scope，取消所有子协程
}

// async — 异常在 await() 时才暴露
val deferred = scope.async {
    throw Exception("Failed")  // 异常暂存
}
deferred.await()  // 此处抛出异常
```

### 1.2 try-catch 处理

```kotlin
// launch 中 try-catch
try {
    scope.launch {
        throw Exception("Failed")
    }.join()
} catch (e: Exception) {
    println("Caught: $e")  // 可能捕获不到！
}

// 正确方式：在协程内部捕获
scope.launch {
    try {
        throw Exception("Failed")
    } catch (e: Exception) {
        println("Caught: $e")  // OK
    }
}

// async 中 try-catch
val deferred = scope.async {
    throw Exception("Failed")
}
try {
    deferred.await()
} catch (e: Exception) {
    println("Caught: $e")  // OK
}
```

### 1.3 CoroutineExceptionHandler

全局异常处理器，类似 Thread 的 UncaughtExceptionHandler：

```kotlin
val handler = CoroutineExceptionHandler { _, exception ->
    println("Caught by handler: $exception")
}

// 必须在根协程上安装
val job = scope.launch(handler) {
    throw Exception("Failed")  // 被 handler 捕获
}
```

> **注意**：`CoroutineExceptionHandler` 仅对 `launch` 生效，`async` 的异常在 `await()` 时抛出。

## 2. SupervisorJob

普通 `Job` 中，子协程失败会取消所有兄弟协程。`SupervisorJob` 中，子协程失败不影响其他子协程：

```kotlin
// 普通 Job — 一个失败全部取消
val scope1 = CoroutineScope(Job())
scope1.launch { delay(100); throw Exception("A failed") }
scope1.launch { delay(200); println("B completed") }  // 不会执行

// SupervisorJob — 一个失败不影响其他
val scope2 = CoroutineScope(SupervisorJob())
scope2.launch { delay(100); throw Exception("A failed") }
scope2.launch { delay(200); println("B completed") }  // 正常执行
```

### 2.1 supervisorScope

```kotlin
suspend fun parallelFetch() = supervisorScope {
    launch {
        throw Exception("Service A failed")
        // 不影响 Service B
    }
    launch {
        delay(100)
        println("Service B completed")
    }
}
```

### 2.2 ViewModel 中的 SupervisorJob

```kotlin
class MyViewModel : ViewModel() {
    // viewModelScope 默认使用 SupervisorJob + Dispatchers.Main
    fun loadData() {
        viewModelScope.launch {
            // 一个请求失败不影响其他
            val users = async { fetchUsers() }
            val orders = async { fetchOrders() }

            try {
                _uiState.value = Success(users.await())
            } catch (e: Exception) {
                _uiState.value = Error(e.message)
            }
        }
    }
}
```

## 3. 协程取消

### 3.1 取消机制

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

### 3.2 不可取消的代码块

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

### 3.3 CPU 密集型任务的取消

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

## 4. 超时

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

## 5. Flow 高级操作

### 5.1 背压处理

```kotlin
// buffer — 缓冲发射的值
flow {
    for (i in 1..100) {
        emit(i)  // 快速发射
    }
}.buffer(50)  // 缓冲 50 个值
 .collect { value ->
     delay(100)  // 慢速消费
     println(value)
 }

// conflate — 只保留最新值
flow {
    repeat(10) {
        emit(it)
        delay(50)
    }
}.conflate()
 .collect { value ->
     delay(200)  // 消费比生产慢
     println(value)  // 可能跳过一些值
 }

// collectLatest — 取消旧值的处理
flow {
    repeat(10) {
        emit(it)
        delay(50)
    }
}.collectLatest { value ->
    delay(200)
    println(value)  // 只有最后一个值会被完整处理
 }
```

### 5.2 组合 Flow

```kotlin
val flow1 = flowOf("A", "B", "C")
val flow2 = flowOf(1, 2, 3)

// zip — 一对一组合
flow1.zip(flow2) { letter, number -> "$letter$number" }
    .collect { println(it) }  // A1, B2, C3

// combine — 任一变化时重新组合
val timer = flow { emit(System.currentTimeMillis()) }
val settings = flowOf("dark", "light")

timer.combine(settings) { time, theme -> "Time: $time, Theme: $theme" }
    .collect { println(it) }

// flattenConcat — 顺序展平
val flows = flowOf(flowOf(1, 2), flowOf(3, 4))
flows.flattenConcat().collect { println(it) }  // 1, 2, 3, 4

// flattenMerge — 并发展平
flows.flattenMerge(concurrency = 2).collect { println(it) }
```

### 5.3 Flow 错误处理

```kotlin
// catch — 捕获上游异常
flow {
    emit(1)
    throw RuntimeException("Error")
}.catch { e ->
    println("Caught: $e")
    emit(-1)  // 发射替代值
}.collect { println(it) }  // 1, -1

// retry — 重试
flow {
    emit(apiCall())  // 可能失败
}.retry(3) { e ->
    println("Retry after: $e")
    delay(1000)
    true  // 返回 true 继续重试
}

// retryWhen — 条件重试
flow {
    emit(apiCall())
}.retryWhen { cause, attempt ->
    attempt < 3 && cause is IOException
}
```

## 6. StateFlow 与 SharedFlow

### 6.1 StateFlow

`StateFlow` 是状态持有者，始终有值，只发射最新值给新订阅者：

```kotlin
class ViewModel {
    // 私有可变状态
    private val _state = MutableStateFlow<UiState>(UiState.Loading)
    // 公开只读状态
    val state: StateFlow<UiState> = _state.asStateFlow()

    fun loadData() {
        viewModelScope.launch {
            _state.value = UiState.Loading
            try {
                val data = repository.fetch()
                _state.value = UiState.Success(data)
            } catch (e: Exception) {
                _state.value = UiState.Error(e.message)
            }
        }
    }
}

// 在 Compose 中收集
@Composable
fun Screen(viewModel: ViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    when (state) {
        is UiState.Loading -> CircularProgressIndicator()
        is UiState.Success -> Text((state as UiState.Success).data)
        is UiState.Error -> Text((state as UiState.Error).message)
    }
}
```

### 6.2 SharedFlow

`SharedFlow` 是热流，可向多个订阅者发射值：

```kotlin
class EventBus {
    private val _events = MutableSharedFlow<Event>(
        extraBufferCapacity = 64,
        onBufferOverflow = BufferOverflow.DROP_OLDEST
    )
    val events: SharedFlow<Event> = _events.asSharedFlow()

    suspend fun emit(event: Event) {
        _events.emit(event)
    }
}

// 订阅
scope.launch {
    eventBus.events.collect { event ->
        handleEvent(event)
    }
}
```

### 6.3 StateFlow vs SharedFlow

| 特性     | StateFlow        | SharedFlow         |
| -------- | ---------------- | ------------------ |
| 初始值   | 必须             | 可选               |
| 值缓存   | 只缓存最新值     | 可配置 replay 数量 |
| 值去重   | 相同值不重复发射 | 默认不去重         |
| 典型场景 | UI 状态管理      | 事件总线、广播     |

### 6.4 shareIn 与 stateIn

将冷流转为热流：

```kotlin
class Repository(private val api: Api) {
    // shareIn — 共享冷流
    val latestData: SharedFlow<Data> = api.observeData()
        .shareIn(
            scope = externalScope,
            started = SharingStarted.WhileSubscribed(5000),
            replay = 1
        )

    // stateIn — 转为状态流
    val config: StateFlow<Config> = api.observeConfig()
        .stateIn(
            scope = externalScope,
            started = SharingStarted.Eagerly,
            initialValue = Config.Default
        )
}
```

## 7. Channel 进阶

### 7.1 Channel 类型

```kotlin
// RENDEZVOUS — 默认，0 缓冲，发送者和接收者会合
val channel1 = Channel<Int>()  // Channel.RENDEZVOUS

// UNLIMITED — 无限缓冲
val channel2 = Channel<Int>(Channel.UNLIMITED)

// CONFLATED — 只保留最新值
val channel3 = Channel<Int>(Channel.CONFLATED)

// BUFFERED — 固定缓冲（默认 64）
val channel4 = Channel<Int>(Channel.BUFFERED)

// 自定义缓冲大小
val channel5 = Channel<Int>(capacity = 10, onBufferOverflow = BufferOverflow.SUSPEND)
```

### 7.2 Channel 与 Flow 互转

```kotlin
// Channel → Flow
val channel = Channel<Int>()
val flow: Flow<Int> = channel.receiveAsFlow()

// Flow → Channel
val flow = flowOf(1, 2, 3)
val channel: ReceiveChannel<Int> = flow.produceIn(scope)
```

## 8. Select 表达式

`select` 允许同时等待多个挂起操作，哪个先完成就处理哪个：

```kotlin
suspend fun selectFirst(): String = coroutineScope {
    val deferred1 = async { delay(100); "Fast" }
    val deferred2 = async { delay(200); "Slow" }

    select<String> {
        deferred1.onAwait { it }
        deferred2.onAwait { it }
    }
    // 返回 "Fast"
}

// Channel 中的 select
suspend fun receiveFromAny(
    channel1: ReceiveChannel<String>,
    channel2: ReceiveChannel<String>
): String = select<String> {
    channel1.onReceive { it }
    channel2.onReceive { it }
}
```

### 8.1 Select 实际应用

```kotlin
// 超时模式
suspend fun fetchWithTimeout(timeout: Long): String = coroutineScope {
    val deferred = async { fetchData() }
    select<String> {
        deferred.onAwait { it }
        onTimeout(timeout) { "Timeout" }
    }
}

// 优先级模式
suspend fun fetchWithFallback(
    primary: Deferred<String>,
    fallback: Deferred<String>
): String = select<String> {
    primary.onAwait { it }
    fallback.onAwait { it }
}
```
## Job 与 Deferred

**基本写法：启动协程获取 Job**
`val <变量> = scope.launch { }`
```kotlin
// 启动协程返回 Job
val job = scope.launch { doWork() }
```

---

**基本写法：async 返回 Deferred**
`val <变量> = scope.async { <表达式> }`
```kotlin
// async 启动并返回结果
val deferred = scope.async { compute() }
val r = deferred.await()
```

---

**基本写法：等待多个 Deferred**
`awaitAll(<deferred1>, <deferred2>)`
```kotlin
// 并发等待多个结果
val (a, b) = listOf(d1, d2).awaitAll().let { it[0] to it[1] }
```

---

## Job 生命周期

**基本写法：判断活跃**
`<job>.isActive`
```kotlin
// 判断协程是否活跃
if (job.isActive) { }
```

---

**基本写法：判断完成**
`<job>.isCompleted`
```kotlin
// 判断协程是否完成
if (job.isCompleted) { }
```

---

**基本写法：判断取消**
`<job>.isCancelled`
```kotlin
// 判断协程是否被取消
if (job.isCancelled) { }
```

---

## 取消协程

**基本写法：取消协程**
`<job>.cancel()`
```kotlin
// 取消协程
job.cancel()
```

---

**基本写法：取消并等待**
`<job>.cancelAndJoin()`
```kotlin
// 取消并阻塞等待完成
job.cancelAndJoin()
```

---

**基本写法：响应取消**
`if (!isActive) return`
```kotlin
// 协程内主动检查取消
if (!isActive) return
```

---

**基本写法：确保取消检查**
`currentCoroutineContext().ensureActive()`
```kotlin
// 显式抛出取消异常
currentCoroutineContext().ensureActive()
```

---

## 超时控制

**基本写法：超时抛异常**
`withTimeout(<毫秒>) { }`
```kotlin
// 超时抛 TimeoutCancellationException
withTimeout(1000) { doWork() }
```

---

**基本写法：超时返回 null**
`withTimeoutOrNull(<毫秒>) { }`
```kotlin
// 超时返回 null 不抛异常
val r = withTimeoutOrNull(1000) { doWork() }
```

---

## 启动模式 CoroutineStart

**基本写法：默认立即调度**
`launch(start = CoroutineStart.DEFAULT) { }`
```kotlin
// 立即调度执行
launch(start = CoroutineStart.DEFAULT) { }
```

---

**基本写法：懒加载启动**
`launch(start = CoroutineStart.LAZY) { }`
```kotlin
// 调用 join 或 start 才执行
val job = scope.launch(start = CoroutineStart.LAZY) { }
job.start()
```

---

**基本写法：原子启动**
`launch(start = CoroutineStart.ATOMIC) { }`
```kotlin
// 不可在执行前取消
launch(start = CoroutineStart.ATOMIC) { }
```

---

**基本写法：不调度启动**
`launch(start = CoroutineStart.UNDISPATCHED) { }`
```kotlin
// 在当前线程执行直到第一个挂起点
launch(start = CoroutineStart.UNDISPATCHED) { }
```

---

## 协程作用域

**基本写法：创建作用域**
`CoroutineScope(<上下文>)`
```kotlin
// 创建独立作用域
val scope = CoroutineScope(Dispatchers.Default)
```

---

**基本写法：coroutineScope 子作用域**
`coroutineScope { }`
```kotlin
// 等待所有子协程完成
coroutineScope {
    launch { }
    launch { }
}
```

---

**基本写法：supervisorScope 容错**
`supervisorScope { }`
```kotlin
// 子协程异常不互相影响
supervisorScope {
    launch { }
    launch { }
}
```

---

## 挂起函数

**基本写法：定义挂起函数**
`suspend fun <方法名>() {}`
```kotlin
// 定义挂起函数
suspend fun fetch(): String {
    delay(100)
    return "data"
}
```

---

**基本写法：挂起函数调用**
`<挂起函数>()`
```kotlin
// 在协程中调用挂起函数
suspend fun work() { fetch() }
```

---

## 延迟与挂起

**基本写法：延迟**
`delay(<毫秒>)`
```kotlin
// 非阻塞延迟
delay(500)
```

---

**基本写法：按 Duration 延迟**
`delay(<时长>.<单位>)`
```kotlin
// 使用 Duration 字面量延迟
delay(500.milliseconds)
```

---

## 协程上下文操作

**基本写法：切换调度器**
`withContext(<dispatcher>) { }`
```kotlin
// 切换到 IO 调度器
withContext(Dispatchers.IO) { readFile() }
```

---

**基本写法：组合上下文元素**
`<job> + <dispatcher>`
```kotlin
// 组合 Job 与 Dispatcher
val ctx = Job() + Dispatchers.IO
```

---

## runBlocking 阻塞

**基本写法：阻塞启动协程**
`runBlocking { }`
```kotlin
// 阻塞主线程启动协程
runBlocking { doWork() }
```

---

**基本写法：带调度器**
`runBlocking(<dispatcher>) { }`
```kotlin
// 指定调度器阻塞
runBlocking(Dispatchers.Default) { }
```

---

## select 等待多路

**基本写法：select 多路复用**
`select<<返回类型>> { <分支> }`
```kotlin
// 等待首个就绪结果
val r = select<String> {
    deferred1.onAwait { "a" }
    deferred2.onAwait { "b" }
}
```

---

## SupervisorJob

**基本写法：创建 SupervisorJob**
`SupervisorJob()`
```kotlin
// 子协程失败不影响其他子协程
val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
```

---

## 协程命名

**基本写法：命名协程**
`CoroutineName("<名称>")`
```kotlin
// 为协程命名便于调试
launch(CoroutineName("worker")) { }
```
