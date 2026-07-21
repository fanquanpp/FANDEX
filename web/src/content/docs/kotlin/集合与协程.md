---
order: 15
title: 'Kotlin 集合与协程'
module: kotlin
category: Kotlin
difficulty: intermediate
description: 集合框架、序列、集合操作函数与协程基础。
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/类与对象
  - kotlin/泛型与类型系统
  - kotlin/协程进阶
  - kotlin/Kotlin多平台
prerequisites: []
---

## 1. 集合框架

Kotlin 集合框架分为**只读**和**可变**两大体系：

### 1.1 集合类型

| 类型 | 只读        | 可变               | 描述       |
| ---- | ----------- | ------------------ | ---------- |
| List | `List<T>`   | `MutableList<T>`   | 有序可重复 |
| Set  | `Set<T>`    | `MutableSet<T>`    | 无序不重复 |
| Map  | `Map<K, V>` | `MutableMap<K, V>` | 键值对     |

```kotlin
// 只读集合
val list: List<String> = listOf("a", "b", "c")
val set: Set<Int> = setOf(1, 2, 3)
val map: Map<String, Int> = mapOf("a" to 1, "b" to 2)

// 可变集合
val mutableList: MutableList<String> = mutableListOf("a", "b")
val mutableSet: MutableSet<Int> = mutableSetOf(1, 2)
val mutableMap: MutableMap<String, Int> = mutableMapOf("a" to 1)

// 只读视图
val readOnly: List<String> = mutableList.toList()  // 创建副本
val readOnlyView: List<String> = mutableList       // 仅类型约束，底层数据共享
```

### 1.2 List 操作

```kotlin
val list = listOf("apple", "banana", "cherry", "date")

// 访问元素
list[0]                  // "apple"
list.getOrNull(10)       // null（安全访问）
list.first()             // "apple"
list.last()              // "date"
list.firstOrNull { it.startsWith("b") }  // "banana"

// 子列表
list.subList(1, 3)       // ["banana", "cherry"]

// 查找
list.indexOf("cherry")   // 2
list.binarySearch("cherry")  // 二分查找（需排序）

// 切片
list.slice(1..2)         // ["banana", "cherry"]
list.slice(setOf(0, 3))  // ["apple", "date"]
```

### 1.3 Set 操作

```kotlin
val set1 = setOf(1, 2, 3, 4)
val set2 = setOf(3, 4, 5, 6)

// 集合运算
set1 union set2          // {1, 2, 3, 4, 5, 6} 并集
set1 intersect set2      // {3, 4} 交集
set1 subtract set2       // {1, 2} 差集

// 包含检查
set1.contains(3)         // true
3 in set1                // true
set1.containsAll(setOf(1, 2))  // true
```

### 1.4 Map 操作

```kotlin
val map = mapOf("a" to 1, "b" to 2, "c" to 3)

// 访问
map["a"]                 // 1
map.getValue("a")        // 1（不存在则抛异常）
map.getOrDefault("d", 0) // 0
map.getOrElse("d") { 0 } // 0

// 遍历
for ((key, value) in map) {
    println("$key = $value")
}

// 常用操作
map.keys                 // [a, b, c]
map.values               // [1, 2, 3]
map.entries              // [a=1, b=2, c=3]

// 可变 Map 操作
val mutableMap = mutableMapOf("a" to 1)
mutableMap["b"] = 2
mutableMap.putIfAbsent("c", 3)
mutableMap.remove("a")
mutableMap += "d" to 4
```

## 2. 序列（Sequence）

序列是惰性求值的集合，类似 Java Stream，但适用于所有平台：

### 2.1 创建序列

```kotlin
// 从集合创建
val seq = listOf(1, 2, 3).asSequence()

// 使用 generateSequence
val naturalNumbers = generateSequence(1) { it + 1 }
val first10 = naturalNumbers.take(10).toList()  // [1, 2, ..., 10]

// 使用 sequence 构建器
val fibonacci = sequence {
    var a = 0L
    var b = 1L
    while (true) {
        yield(a)
        val next = a + b
        a = b
        b = next
    }
}
fibonacci.take(10).toList()  // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

### 2.2 惰性求值 vs 及早求值

```kotlin
// List — 及早求值（每个操作都创建新集合）
val listResult = (1..1000)
    .map { println("map $it"); it * 2 }
    .filter { println("filter $it"); it > 10 }
    .first()
// 输出：map 1, filter 2, map 2, filter 4, ... map 6, filter 12 → 返回 12
// 执行了 6 次 map + 6 次 filter

// Sequence — 惰性求值（逐元素处理管道）
val seqResult = (1..1000).asSequence()
    .map { println("map $it"); it * 2 }
    .filter { println("filter $it"); it > 10 }
    .first()
// 输出：map 1, filter 2, map 2, filter 4, map 3, filter 6, map 4, filter 8, map 5, filter 10, map 6, filter 12
// 同样找到 12，但只处理了必要的元素
```

> **何时使用 Sequence**：当集合较大且链式操作较多时，Sequence 可显著减少中间集合创建和计算量。

## 3. 集合操作函数

### 3.1 过滤与映射

```kotlin
val numbers = listOf(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

// 过滤
numbers.filter { it > 5 }              // [6, 7, 8, 9, 10]
numbers.filterNot { it > 5 }           // [1, 2, 3, 4, 5]
numbers.filterIndexed { i, v -> i > 3 && v > 5 }  // [6, 7, 8, 9, 10]
numbers.partition { it > 5 }           // ([6,7,8,9,10], [1,2,3,4,5])

// 映射
numbers.map { it * 2 }                 // [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]
numbers.mapIndexed { i, v -> "$i:$v" } // ["0:1", "1:2", ...]
numbers.mapNotNull { if (it > 5) it else null }  // [6, 7, 8, 9, 10]

// flatMap — 映射后展平
val words = listOf("Hello", "Kotlin")
words.flatMap { it.toList() }          // [H, e, l, l, o, K, o, t, l, i, n]
```

### 3.2 排序

```kotlin
val list = listOf(3, 1, 4, 1, 5, 9, 2, 6)

list.sorted()                          // [1, 1, 2, 3, 4, 5, 6, 9]
list.sortedDescending()                // [9, 6, 5, 4, 3, 2, 1, 1]
list.sortedBy { it % 3 }              // 按模 3 排序
list.sortedWith(compareBy({ it % 3 }, { it }))  // 多条件排序

// 原地排序（MutableList）
val mutable = mutableListOf(3, 1, 4, 1, 5)
mutable.sort()
```

### 3.3 聚合

```kotlin
val list = listOf(1, 2, 3, 4, 5)

list.sum()                             // 15
list.sumOf { it * 2 }                  // 30
list.average()                         // 3.0
list.count()                           // 5
list.count { it > 3 }                  // 2
list.minOrNull()                       // 1
list.maxOrNull()                       // 5
list.minByOrNull { it }                // 1

// reduce — 从左到右累积
list.reduce { acc, num -> acc + num }  // 15

// fold — 带初始值的累积
list.fold(0) { acc, num -> acc + num } // 15
list.fold(1) { acc, num -> acc * num } // 120

// groupBy — 分组
val words = listOf("a", "ab", "abc", "bc", "c")
words.groupBy { it.length }
// {1=[a, c], 2=[ab, bc], 3=[abc]}

// associate — 转换为 Map
list.associateBy { "key$it" }          // {key1=1, key2=2, ...}
list.associateWith { it * 10 }         // {1=10, 2=20, ...}
```

### 3.4 查找

```kotlin
val list = listOf(1, 2, 3, 4, 5)

list.find { it > 3 }                   // 4（第一个匹配）
list.findLast { it > 3 }               // 5（最后一个匹配）
list.first { it > 3 }                  // 4（不存在则抛异常）
list.any { it > 3 }                    // true
list.none { it > 10 }                  // true
list.all { it > 0 }                    // true
```

## 4. 协程基础

协程是 Kotlin 的轻量级线程，提供结构化并发的编程模型。

### 4.1 添加依赖

```kotlin
// build.gradle.kts
dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.1")
    // Android
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.1")
}
```

### 4.2 第一个协程

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {  // 桥接协程与阻塞世界
    launch {  // 启动新协程
        delay(1000L)  // 非阻塞等待
        println("World!")
    }
    println("Hello")
}
// 输出：Hello → (1秒后) World!
```

### 4.3 suspend 函数

```kotlin
suspend fun fetchData(): String {
    delay(1000)  // 模拟网络请求
    return "Data from network"
}

suspend fun processAll() {
    val data = fetchData()  // 在协程中调用 suspend 函数
    println(data)
}
```

### 4.4 协程构建器

```kotlin
// launch — 启动协程，不返回结果（返回 Job）
val job: Job = scope.launch {
    delay(1000)
    println("Done")
}

// async — 启动协程，返回结果（返回 Deferred<T>）
val deferred: Deferred<Int> = scope.async {
    delay(1000)
    42
}
val result = deferred.await()  // 等待结果

// 并行执行
suspend fun fetchBoth(): Pair<String, String> = coroutineScope {
    val deferred1 = async { fetchUser() }
    val deferred2 = async { fetchOrders() }
    Pair(deferred1.await(), deferred2.await())
}
```

### 4.5 协程作用域

```kotlin
// coroutineScope — 等待所有子协程完成
suspend fun fetchAll() = coroutineScope {
    launch { fetchUser() }
    launch { fetchOrders() }
    // 两个 launch 都完成后才返回
}

// supervisorScope — 子协程失败不影响其他子协程
suspend fun fetchWithRecovery() = supervisorScope {
    launch {
        throw Exception("Failed")  // 不影响另一个
    }
    launch {
        delay(100)
        println("This still runs")
    }
}
```

### 4.6 调度器

```kotlin
// Dispatchers.Default — CPU 密集型任务
launch(Dispatchers.Default) {
    val result = heavyComputation()
}

// Dispatchers.IO — IO 密集型任务
launch(Dispatchers.IO) {
    val data = networkRequest()
}

// Dispatchers.Main — UI 线程（Android/Swing）
launch(Dispatchers.Main) {
    updateUI(result)
}

// withContext — 切换调度器
suspend fun fetchAndShow() {
    val data = withContext(Dispatchers.IO) {
        networkRequest()  // 在 IO 线程执行
    }
    showData(data)  // 回到原调度器
}
```

## 5. Flow

Flow 是 Kotlin 协程的响应式流 API，类似 RxJava 但基于协程：

### 5.1 创建 Flow

```kotlin
// flow 构建器
fun numbers(): Flow<Int> = flow {
    for (i in 1..5) {
        emit(i)  // 发射值
        delay(100)
    }
}

// flowOf
val flow = flowOf(1, 2, 3, 4, 5)

// 从集合转换
val listFlow = listOf(1, 2, 3).asFlow()

// channelFlow — 支持并发发射
fun mergedFlow(): Flow<Int> = channelFlow {
    launch { send(1) }
    launch { send(2) }
}
```

### 5.2 收集 Flow

```kotlin
// collect — 终端操作
numbers().collect { value ->
    println(value)
}

// toList — 转为列表
val list = numbers().toList()

// first / firstOrNull
val first = numbers().first()

// collectLatest — 只处理最新值
numbers().collectLatest { value ->
    delay(200)  // 模拟慢处理
    println(value)  // 只打印最后一个
}
```

### 5.3 Flow 操作符

```kotlin
numbers()
    .map { it * 2 }              // 变换
    .filter { it > 4 }           // 过滤
    .take(3)                     // 取前 3 个
    .drop(1)                     // 跳过第 1 个
    .distinctUntilChanged()      // 去重
    .onEach { println("Emit: $it") }  // 副作用
    .onStart { emit(0) }         // 开始前发射
    .onCompletion { println("Done") }  // 完成回调
    .catch { e -> emit(-1) }     // 错误处理
    .collect { println(it) }
```

## 6. Channel

Channel 是协程间通信的管道，类似 BlockingQueue：

```kotlin
val channel = Channel<Int>()

// 生产者
launch {
    for (i in 1..5) {
        channel.send(i)
    }
    channel.close()
}

// 消费者
launch {
    for (value in channel) {
        println(value)
    }
}

// produce — 便捷生产者
fun produceNumbers(): ReceiveChannel<Int> = GlobalScope.produce {
    for (i in 1..5) {
        send(i)
    }
}
```
