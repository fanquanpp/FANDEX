# Kotlin 协程基础速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 协程基础

**基本写法：launch 启动协程**
`GlobalScope.launch { <body> }`
```kotlin
// 启动新协程（不阻塞当前线程）
GlobalScope.launch {
    delay(1000);
    println("Hello, Coroutines!");
}
```

**基本写法：runBlocking 阻塞启动**
`runBlocking { <body> }`
```kotlin
// 阻塞当前线程直到协程完成
runBlocking {
    delay(1000);
    println("Hello, Coroutines!");
}
```

**基本写法：async 启动异步任务**
`async { <body> }`
```kotlin
// 启动异步任务并返回 Deferred
val deferred = async {
    delay(1000);
    42;
}
```

**基本写法：await 等待结果**
`<deferred>.await()`
```kotlin
// 等待异步任务完成并获取结果
val result = deferred.await();
```

**基本写法：awaitAll 等待多个任务**
`awaitAll(<deferred1>, <deferred2>)`
```kotlin
// 等待多个异步任务完成
val d1 = async { 1 };
val d2 = async { 2 };
val results = awaitAll(d1, d2);
```

---

## 作用域构建器

**基本写法：coroutineScope 协程作用域**
`coroutineScope { <body> }`
```kotlin
// 创建协程作用域，等待所有子协程完成
coroutineScope {
    launch {
        delay(1000);
        println("Task 1");
    }
    launch {
        delay(500);
        println("Task 2");
    }
}
```

**基本写法：supervisorScope 监督作用域**
`supervisorScope { <body> }`
```kotlin
// 子协程异常不会取消其他子协程
supervisorScope {
    launch {
        delay(100);
        throw Exception("Failed");
    }
    launch {
        delay(200);
        println("Still running");
    }
}
```

**基本写法：withContext 切换上下文**
`withContext(<dispatcher>) { <body> }`
```kotlin
// 切换协程上下文
suspend fun fetchData(): String = withContext(Dispatchers.IO) {
    networkRequest();
}
```

---

## 调度器

**基本写法：Dispatchers.Main 主线程**
`launch(Dispatchers.Main) { <body> }`
```kotlin
// 在主线程执行（UI 操作）
launch(Dispatchers.Main) {
    updateUI();
}
```

**基本写法：Dispatchers.IO IO 线程**
`launch(Dispatchers.IO) { <body> }`
```kotlin
// 在 IO 线程执行（网络、文件操作）
launch(Dispatchers.IO) {
    val data = readFile();
}
```

**基本写法：Dispatchers.Default 默认线程**
`launch(Dispatchers.Default) { <body> }`
```kotlin
// 在默认线程执行（CPU 密集型）
launch(Dispatchers.Default) {
    val result = heavyComputation();
}
```

**基本写法：Dispatchers.Unconfined 不限制**
`launch(Dispatchers.Unconfined) { <body> }`
```kotlin
// 不限制线程
launch(Dispatchers.Unconfined) {
    println("Running in ${Thread.currentThread().name}");
}
```

---

## 挂起函数

**基本写法：suspend 挂起函数**
`suspend fun <name>(<params>): <ReturnType>`
```kotlin
// 挂起函数，可在协程中调用
suspend fun fetchData(): String {
    delay(1000);
    return "Data";
}
```

**基本写法：挂起函数调用网络请求**
`suspend fun <name>(<params>): <ReturnType> = withContext(Dispatchers.IO) { <body> }`
```kotlin
// 挂起函数执行网络请求
suspend fun fetchUser(id: String): User = withContext(Dispatchers.IO) {
    api.getUser(id);
}
```

**基本写法：delay 延迟**
`delay(<milliseconds>)`
```kotlin
// 延迟指定毫秒（不阻塞线程）
delay(1000);
```

---

## Job 控制

**基本写法：Job 取消**
`<job>.cancel()`
```kotlin
// 取消协程
val job = launch {
    repeat(1000) { i ->
        println(i);
        delay(500);
    }
}
delay(1300);
job.cancel();
```

**基本写法：Job 等待完成**
`<job>.join()`
```kotlin
// 等待协程完成
val job = launch { /* ... */ };
job.join();
```

**基本写法：cancelAndJoin 取消并等待**
`<job>.cancelAndJoin()`
```kotlin
// 取消并等待协程完成
job.cancelAndJoin();
```

**基本写法：isActive 检查活跃状态**
`if (isActive) { <body> }`
```kotlin
// 检查协程是否活跃
while (isActive) {
    println("Working...");
    delay(500);
}
```

**基本写法：ensureActive 确保活跃**
`ensureActive()`
```kotlin
// 确保协程活跃，否则抛出 CancellationException
ensureActive();
```

**基本写法：yield 让出执行权**
`yield()`
```kotlin
// 让出执行权给其他协程
yield();
```

---

## 超时控制

**基本写法：withTimeout 超时**
`withTimeout(<milliseconds>) { <body> }`
```kotlin
// 设置超时，超时抛出 TimeoutCancellationException
withTimeout(1000) {
    repeat(1000) { i ->
        println(i);
        delay(100);
    }
}
```

**基本写法：withTimeoutOrNull 安全超时**
`withTimeoutOrNull(<milliseconds>) { <body> }`
```kotlin
// 超时返回 null，不抛出异常
val result = withTimeoutOrNull(1000) {
    repeat(1000) { i ->
        println(i);
        delay(100);
    }
    "Done";
}
```

---

## Channel 通道

**基本写法：Channel 创建通道**
`Channel<<Type>>()`
```kotlin
// 创建通道
val channel = Channel<String>();
```

**基本写法：send 发送数据**
`<channel>.send(<value>)`
```kotlin
// 发送数据到通道
launch {
    channel.send("Hello");
}
```

**基本写法：receive 接收数据**
`<channel>.receive()`
```kotlin
// 从通道接收数据
val value = channel.receive();
```

**基本写法：close 关闭通道**
`<channel>.close()`
```kotlin
// 关闭通道
channel.close();
```

**基本写法：for 遍历通道**
`for (<item> in <channel>) { <body> }`
```kotlin
// 遍历通道接收数据
for (msg in channel) {
    println(msg);
}
```

**基本写法：produce 生产者**
`produce { send(<value>) }`
```kotlin
// 创建生产者协程
val producer = produce {
    for (i in 1..5) {
        send(i);
    }
}
```

---

## Flow 流

**基本写法：flow 创建流**
`flow { emit(<value>) }`
```kotlin
// 创建冷流
val flow = flow {
    for (i in 1..5) {
        emit(i);
    }
}
```

**基本写法：collect 收集流**
`<flow>.collect { <body> }`
```kotlin
// 收集流中的值
flow.collect { value ->
    println(value);
}
```

**基本写法：flowOf 创建流**
`flowOf(<values>)`
```kotlin
// 创建固定值的流
val flow = flowOf(1, 2, 3, 4, 5);
```

**基本写法：asFlow 集合转流**
`<collection>.asFlow()`
```kotlin
// 集合转换为流
val flow = listOf(1, 2, 3).asFlow();
```

**基本写法：map 转换流**
`<flow>.map { <transform> }`
```kotlin
// 转换流中的值
val doubled = flow.map { it * 2 };
```

**基本写法：filter 过滤流**
`<flow>.filter { <predicate> }`
```kotlin
// 过滤流中的值
val evens = flow.filter { it % 2 == 0 };
```

**基本写法：flowOn 切换调度器**
`<flow>.flowOn(<dispatcher>)`
```kotlin
// 切换流执行的调度器
val flow = flow { /* IO 操作 */ }.flowOn(Dispatchers.IO);
```

**基本写法：buffer 缓冲流**
`<flow>.buffer()`
```kotlin
// 缓冲流，提高并发性能
flow.buffer().collect { /* ... */ }
```

**基本写法：conflate 合并流**
`<flow>.conflate()`
```kotlin
// 合并流，只保留最新值
flow.conflate().collect { /* ... */ }
```

**基本写法：zip 合并流**
`<flow1>.zip(<flow2>) { <a>, <b> -> <transform> }`
```kotlin
// 合并两个流
val combined = flow1.zip(flow2) { a, b -> "$a-$b" };
```

**基本写法：combine 合并流**
`<flow1>.combine(<flow2>) { <a>, <b> -> <transform> }`
```kotlin
// 合并两个流，任一流发射时触发
val combined = flow1.combine(flow2) { a, b -> a + b };
```

**基本写法：flatMapConcat 顺序展平**
`<flow>.flatMapConcat { <transform> }`
```kotlin
// 顺序展平流
flow.flatMapConcat { flowOf(it, it * 2) };
```

**基本写法：flatMapMerge 并发展平**
`<flow>.flatMapMerge { <transform> }`
```kotlin
// 并发展平流
flow.flatMapMerge { flowOf(it, it * 2) };
```

**基本写法：catch 捕获异常**
`<flow>.catch { <body> }`
```kotlin
// 捕获流中的异常
flow.catch { e ->
    println("Error: $e");
}.collect { /* ... */ }
```

**基本写法：onCompletion 完成回调**
`<flow>.onCompletion { <body> }`
```kotlin
// 流完成时回调
flow.onCompletion {
    println("Completed");
}.collect { /* ... */ }
```

**基本写法：StateFlow 状态流**
`MutableStateFlow(<initial>)`
```kotlin
// 创建状态流
val state = MutableStateFlow(0);
```

**基本写法：SharedFlow 共享流**
`MutableSharedFlow<<Type>>()`
```kotlin
// 创建共享流
val shared = MutableSharedFlow<String>();
```

---

## 异常处理

**基本写法：try-catch 捕获异常**
`try { <body> } catch (e: <Exception>) { <body> }`
```kotlin
// 捕获协程中的异常
try {
    delay(1000);
} catch (e: CancellationException) {
    println("Cancelled");
}
```

**基本写法：CoroutineExceptionHandler 异常处理器**
`val <handler> = CoroutineExceptionHandler { <ctx>, <e> -> <body> }`
```kotlin
// 创建协程异常处理器
val handler = CoroutineExceptionHandler { _, e ->
    println("Caught: $e");
};
launch(handler) {
    throw RuntimeException("Error");
}
```

**基本写法：SupervisorJob 监督作业**
`launch(SupervisorJob()) { <body> }`
```kotlin
// 使用 SupervisorJob，子协程异常不影响其他子协程
val supervisor = SupervisorJob();
launch(supervisor) { /* ... */ }
```

---

## 并发工具

**基本写法：Mutex 互斥锁**
`val <mutex> = Mutex(); <mutex>.withLock { <body> }`
```kotlin
// 使用互斥锁保护共享资源
val mutex = Mutex();
var counter = 0;
launch {
    mutex.withLock {
        counter++;
    }
}
```

**基本写法：Semaphore 信号量**
`val <semaphore> = Semaphore(<permits>); <semaphore>.withPermit { <body> }`
```kotlin
// 使用信号量限制并发数
val semaphore = Semaphore(3);
launch {
    semaphore.withPermit {
        networkRequest();
    }
}
```

**换行写法：async 并发请求**
`coroutineScope { val <d1> = async { <body> }; val <d2> = async { <body> }; <d1>.await() + <d2>.await() }`
```kotlin
// 并发执行多个异步任务
suspend fun fetchAll(): Pair<String, Int> = coroutineScope {
    val name = async { fetchName() };
    val age = async { fetchAge() };
    name.await() to age.await();
}
```
