## 前置知识

- [Kotlin 泛型与类型系统](/kotlin/007-KotlinGenericTypeSystem)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 集合框架」的核心机制、典型用法与常见陷阱
- 掌握「2. 序列（Sequence）」的核心机制、典型用法与常见陷阱
- 掌握「3. 集合操作函数」的核心机制、典型用法与常见陷阱
- 掌握「4. 协程基础」的核心机制、典型用法与常见陷阱
- 掌握「5. Flow」的核心机制、典型用法与常见陷阱


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
## 聚合操作

**基本写法：sum 求和**
`<collection>.sum()`
```kotlin
// 求和
val sum = numbers.sum();
```

**基本写法：sumBy 条件求和**
`<collection>.sumOf { <selector> }`
```kotlin
// 按条件求和
val totalAge = people.sumOf { it.age };
```

**基本写法：maxOrNull 最大值**
`<collection>.maxOrNull()`
```kotlin
// 获取最大值（空集合返回 null）
val max = numbers.maxOrNull();
```

**基本写法：maxByOrNull 条件最大值**
`<collection>.maxByOrNull { <selector> }`
```kotlin
// 按条件获取最大元素
val oldest = people.maxByOrNull { it.age };
```

**基本写法：minOrNull 最小值**
`<collection>.minOrNull()`
```kotlin
// 获取最小值（空集合返回 null）
val min = numbers.minOrNull();
```

**基本写法：minByOrNull 条件最小值**
`<collection>.minByOrNull { <selector> }`
```kotlin
// 按条件获取最小元素
val youngest = people.minByOrNull { it.age };
```

**基本写法：average 平均值**
`<collection>.average()`
```kotlin
// 计算平均值
val avg = numbers.average();
```

**基本写法：count 计数**
`<collection>.count()`
```kotlin
// 计算元素数量
val count = numbers.count();
```

**基本写法：count 条件计数**
`<collection>.count { <predicate> }`
```kotlin
// 计算满足条件的元素数量
val count = numbers.count { it > 3 };
```

**基本写法：fold 累积**
`<collection>.fold(<initial>) { <acc>, <item> -> <body> }`
```kotlin
// 从左到右累积
val sum = numbers.fold(0) { acc, num -> acc + num };
```

**基本写法：reduce 累积**
`<collection>.reduce { <acc>, <item> -> <body> }`
```kotlin
// 从左到右累积（无初始值）
val sum = numbers.reduce { acc, num -> acc + num };
```

**基本写法：reduceOrNull 安全累积**
`<collection>.reduceOrNull { <acc>, <item> -> <body> }`
```kotlin
// 安全累积（空集合返回 null）
val sum = numbers.reduceOrNull { acc, num -> acc + num };
```

**基本写法：joinToString 连接字符串**
`<collection>.joinToString(<separator>)`
```kotlin
// 连接为字符串
val str = numbers.joinToString(", ");
```

**换行写法：joinToString 带前缀后缀**
`<collection>.joinToString(<separator>, <prefix>, <postfix>)`
```kotlin
// 连接为字符串带前缀后缀
val str = numbers.joinToString(
    separator = ", ",
    prefix = "[",
    postfix = "]"
);
```

---

## 判断操作

**基本写法：any 判断是否有元素**
`<collection>.any()`
```kotlin
// 判断集合是否有元素
val hasElements = numbers.any();
```

**基本写法：any 条件判断**
`<collection>.any { <predicate> }`
```kotlin
// 判断是否有满足条件的元素
val hasEven = numbers.any { it % 2 == 0 };
```

**基本写法：all 全部满足**
`<collection>.all { <predicate> }`
```kotlin
// 判断是否全部满足条件
val allPositive = numbers.all { it > 0 };
```

**基本写法：none 全不满足**
`<collection>.none { <predicate> }`
```kotlin
// 判断是否全不满足条件
val noneNegative = numbers.none { it < 0 };
```

**基本写法：contains 检查包含**
`<collection>.contains(<element>)`
```kotlin
// 检查是否包含元素
numbers.contains(5);
```

---

## 序列（Sequence）

**基本写法：asSequence 转换为序列**
`<collection>.asSequence()`
```kotlin
// 转换为序列（惰性求值）
val sequence = numbers.asSequence();
```

**基本写法：sequenceOf 创建序列**
`sequenceOf(<elements>)`
```kotlin
// 创建序列
val seq = sequenceOf(1, 2, 3);
```

**换行写法：generateSequence 生成序列**
`generateSequence(<seed>) { <next> }`
```kotlin
// 生成序列
val naturals = generateSequence(1) { it + 1 };
```

**换行写法：yield 构建序列**
`sequence { yield(<value>); yieldAll(<collection>) }`
```kotlin
// 使用 yield 构建序列
val seq = sequence {
    yield(1);
    yield(2);
    yieldAll(listOf(3, 4, 5));
}
```

**基本写法：序列操作链**
`<sequence>.filter { <predicate> }.map { <transform> }.toList()`
```kotlin
// 序列操作链（惰性求值）
val result = numbers.asSequence()
    .filter { it > 2 }
    .map { it * 2 }
    .toList();
```

**基本写法：take 限制序列**
`<sequence>.take(<n>)`
```kotlin
// 限制序列元素数量
val first5 = naturals.take(5).toList();
```

---

## 集合转换

**基本写法：toSet 转换为 Set**
`<collection>.toSet()`
```kotlin
// 转换为 Set（去重）
val set = numbers.toSet();
```

**基本写法：toList 转换为 List**
`<collection>.toList()`
```kotlin
// 转换为 List
val list = set.toList();
```

**基本写法：toMap 转换为 Map**
`<list>.toMap()`
```kotlin
// Pair 列表转换为 Map
val map = listOf("a" to 1, "b" to 2).toMap();
```

**基本写法：toMutableList 转换为可变列表**
`<collection>.toMutableList()`
```kotlin
// 转换为可变列表
val mutable = numbers.toMutableList();
```

**基本写法：associate 转换为 Map**
`<collection>.associate { <transform> }`
```kotlin
// 转换为 Map
val map = people.associate { it.name to it.age };
```

**基本写法：associateBy 按 key 转换**
`<collection>.associateBy { <keySelector> }`
```kotlin
// 按 key 转换为 Map
val map = people.associateBy { it.name };
```

**基本写法：associateWith 按 value 转换**
`<collection>.associateWith { <valueSelector> }`
```kotlin
// 按 value 转换为 Map
val map = numbers.associateWith { it * 2 };
```

---

## 集合遍历

**基本写法：forEach 遍历**
`<collection>.forEach { <body> }`
```kotlin
// 遍历集合
numbers.forEach { println(it); }
```

**基本写法：forEachIndexed 带索引遍历**
`<collection>.forEachIndexed { <index>, <item> -> <body> }`
```kotlin
// 带索引遍历
numbers.forEachIndexed { index, value ->
    println("$index: $value");
}
```

**基本写法：for-in 遍历**
`for (<item> in <collection>) { <body> }`
```kotlin
// for-in 遍历
for (item in numbers) {
    println(item);
}
```

**基本写法：遍历 Map**
`for ((<key>, <value>) in <map>) { <body> }`
```kotlin
// 遍历 Map 键值对
for ((key, value) in map) {
    println("$key = $value");
}
```

**基本写法：遍历 List 索引**
`for (<index> in <list>.indices) { <body> }`
```kotlin
// 遍历 List 索引
for (i in numbers.indices) {
    println("Index $i: ${numbers[i]}");
}
```

**基本写法：iterator 迭代器**
`val <iterator> = <collection>.iterator(); while (<iterator>.hasNext()) { <body> }`
```kotlin
// 使用迭代器遍历
val iterator = numbers.iterator();
while (iterator.hasNext()) {
    println(iterator.next());
}
```

---

## 集合修改

**基本写法：add 添加元素**
`<mutableList>.add(<element>)`
```kotlin
// 添加元素到末尾
mutableList.add(4);
```

**基本写法：add 指定位置添加**
`<mutableList>.add(<index>, <element>)`
```kotlin
// 在指定位置添加元素
mutableList.add(0, 0);
```

**基本写法：addAll 添加多个元素**
`<mutableList>.addAll(<collection>)`
```kotlin
// 添加多个元素
mutableList.addAll(listOf(5, 6, 7));
```

**基本写法：remove 移除元素**
`<mutableList>.remove(<element>)`
```kotlin
// 移除指定元素
mutableList.remove(3);
```

**基本写法：removeAt 移除指定位置**
`<mutableList>.removeAt(<index>)`
```kotlin
// 移除指定位置的元素
mutableList.removeAt(0);
```

**基本写法：clear 清空集合**
`<mutableList>.clear()`
```kotlin
// 清空集合
mutableList.clear();
```

**基本写法：set 修改元素**
`<mutableList>[<index>] = <value>`
```kotlin
// 修改指定位置的元素
mutableList[0] = 10;
```

**基本写法：Map 修改**
`<mutableMap>[<key>] = <value>`
```kotlin
// 修改 Map 值
mutableMap["a"] = 10;
```

**基本写法：putIfAbsent 条件添加**
`<mutableMap>.putIfAbsent(<key>, <value>)`
```kotlin
// 键不存在时添加
mutableMap.putIfAbsent("c", 3);
```

**基本写法：remove 移除 Map 条目**
`<mutableMap>.remove(<key>)`
```kotlin
// 移除 Map 条目
mutableMap.remove("a");
```
## 协程基础

**基本写法：launch 启动协程**
`GlobalScope.launch { <代码> }`
```kotlin
// 启动新协程（不阻塞）
GlobalScope.launch {
    delay(1000)
    println("Hello")
}
```

---

**基本写法：async 异步返回**
`GlobalScope.async { <返回值> }`
```kotlin
// 异步计算结果
val deferred = GlobalScope.async {
    delay(1000)
    42
}
val result = deferred.await()
```

---

**基本写法：runBlocking 阻塞启动**
`runBlocking { <代码> }`
```kotlin
// 阻塞主线程启动协程
runBlocking {
    launch { println("Hello") }
}
```

---

**基本写法：suspend 挂起函数**
`suspend fun <函数名>(<参数>): <返回类型> { ... }`
```kotlin
// 声明挂起函数
suspend fun fetchData(): String {
    delay(1000)
    return "Data"
}
```

---

**基本写法：CoroutineScope 自定义作用域**
`CoroutineScope(<上下文>).launch { <代码> }`
```kotlin
// 创建作用域
val scope = CoroutineScope(Dispatchers.Main)
scope.launch { /* UI 操作 */ }
```

---

## 调度器

**基本写法：Dispatchers.Main 主线程**
`withContext(Dispatchers.Main) { <代码> }`
```kotlin
// 切换到主线程
withContext(Dispatchers.Main) {
    updateUI()
}
```

---

**基本写法：Dispatchers.IO IO 线程**
`withContext(Dispatchers.IO) { <代码> }`
```kotlin
// 切换到 IO 线程
withContext(Dispatchers.IO) {
    val data = readFromFile()
}
```

---

**基本写法：Dispatchers.Default 计算线程**
`withContext(Dispatchers.Default) { <代码> }`
```kotlin
// CPU 密集型任务
withContext(Dispatchers.Default) {
    val result = heavyCompute()
}
```

---

## Job 控制

**基本写法：cancel 取消**
`<job>.cancel();`
```kotlin
// 取消协程
val job = launch { repeat(100) { delay(100) } }
job.cancel()
```

---

**基本写法：join 等待完成**
`<job>.join();`
```kotlin
// 等待协程完成
job.join()
```

---

**基本写法：cancelAndJoin 取消并等待**
`<job>.cancelAndJoin();`
```kotlin
// 取消并等待完成
job.cancelAndJoin()
```

---

**基本写法：isActive 检查活跃**
`<coroutineScope>.isActive`
```kotlin
// 检查协程是否仍活跃
while (isActive) {
    // 执行工作
}
```

---

## Flow 流

**基本写法：flow 构建流**
`flow { <emit 调用> }`
```kotlin
// 创建 Flow
val flow = flow {
    for (i in 1..3) {
        emit(i)
    }
}
```

---

**基本写法：collect 收集**
`<flow>.collect { <处理> }`
```kotlin
// 收集 Flow 数据
flow.collect { value ->
    println(value)
}
```

---

**基本写法：map 转换**
`<flow>.map { <转换> }`
```kotlin
// 转换数据
flow.map { it * 2 }
```

---

**基本写法：filter 过滤**
`<flow>.filter { <条件> }`
```kotlin
// 过滤数据
flow.filter { it > 1 }
```

---

**基本写法：flatMapConcat 串联**
`<flow>.flatMapConcat { <新 Flow> }`
```kotlin
// 串联多个流
flow.flatMapConcat { value -> flowOf(value, value * 2) }
```

---

**基本写法：flowOf 固定流**
`flowOf(<元素1>, <元素2>);`
```kotlin
// 创建固定元素流
flowOf(1, 2, 3).collect { println(it) }
```

---

**基本写法：asFlow 集合转流**
`<集合>.asFlow()`
```kotlin
// List 转 Flow
listOf(1, 2, 3).asFlow().collect { println(it) }
```

---

## Channel 通道

**基本写法：Channel 创建**
`Channel<<类型>>()`
```kotlin
// 创建通道
val channel = Channel<Int>()
launch {
    channel.send(1)
}
val value = channel.receive()
```

---

**基本写法：produce 生产者**
`produce { <send 调用> }`
```kotlin
// 创建生产者
val producer = produce {
    for (i in 1..5) send(i)
}
producer.consumeEach { println(it) }
```

---

## 异常处理

**基本写法：try-catch 捕获异常**
`try { <代码> } catch (e: <异常类型>) { }`
```kotlin
// 捕获协程异常
try {
    deferred.await()
} catch (e: Exception) {
    println("Error: ${e.message}")
}
```

---

**基本写法：CoroutineExceptionHandler**
`CoroutineExceptionHandler { <ctx>, <throwable> -> }`
```kotlin
// 全局异常处理器
val handler = CoroutineExceptionHandler { _, e ->
    println("Caught: $e")
}
scope.launch(handler) { throw RuntimeException("fail") }
```

---

## 超时控制

**基本写法：withTimeout 超时**
`withTimeout(<毫秒>) { <代码> }`
```kotlin
// 设置超时
withTimeout(2000) {
    delay(3000) // 抛出 TimeoutCancellationException
}
```

---

**基本写法：withTimeoutOrNull 超时返回 null**
`withTimeoutOrNull(<毫秒>) { <代码> }`
```kotlin
// 超时返回 null
val result = withTimeoutOrNull(1000) {
    delay(2000)
    "Done"
}  // null
```
