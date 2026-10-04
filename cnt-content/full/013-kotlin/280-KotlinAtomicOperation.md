---
order: 300
title: Kotlin 与原子操作
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: 从竞态条件出发掌握原子变量：kotlinx.atomicfu 与标准库 kotlin.concurrent.atomics 两套 API、CAS 原理、无锁结构与常见陷阱。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'kotlin/270-KotlinConcurrencySafety'
  - 'kotlin/250-CoroutineDispatcherContext'
  - 'kotlin/400-KotlinBenchmark'
  - 'kotlin/350-KotlinIO'
prerequisites:
  - 'kotlin/270-KotlinConcurrencySafety'
---

## 概述

原子操作（Atomic Operation）是不可被中断的操作。在多线程环境中，多个线程可能同时读写同一个变量，导致数据竞争和不确定的结果。原子操作通过硬件级别的指令（如 CAS，Compare-And-Swap）保证操作的原子性，不需要加锁就能实现线程安全。

Kotlin/JVM 生态有两条主流路径：

1. **`kotlinx.atomicfu`**：多平台原子库，通过编译器插件在编译期把原子变量转换为 JVM 的 `AtomicInteger`、`AtomicReference` 等（或 Native/JS 的对应实现），运行时零额外包装开销，也是协程库内部的基础设施。
2. **`kotlin.concurrent.atomics`（标准库）**：Kotlin 2.1.20 起引入的跨平台原子类型（`AtomicInt`、`AtomicLong`、`AtomicBoolean`、`AtomicReference`、`AtomicArray` 等），JVM 上直接委托 `java.util.concurrent.atomic` 对应类；发布初期为实验性 API（需 `@OptIn(ExperimentalAtomicApi::class)`），后续版本逐步稳定，定位是长期取代 atomicfu 的多平台原子类型。

## 基础概念

- **原子变量**：所有读写与"读-改-写"操作都不可分割的变量
- **CAS（Compare-And-Swap）**：先比较当前值是否等于预期值，相等则更新为新值，整个过程不可中断；失败则返回 false，通常配合自旋重试
- **lock-free**：无锁编程，通过原子操作而非锁来实现并发安全，线程不会被阻塞
- **竞态条件（Race Condition）**：多个线程交错执行"读-改-写"导致的更新丢失——原子变量解决的核心问题

## 快速上手：先看清问题

不用原子变量的经典错误——复合操作不是原子的：

```kotlin
class BrokenCounter {
    var count = 0  // 普通变量，非线程安全

    fun increment() {
        count = count + 1  // 读 -> 加 1 -> 写回，三步可能被其他线程插入
    }
}

fun main() {
    val counter = BrokenCounter()
    val threads = (1..10).map {
        Thread { repeat(1000) { counter.increment() } }
    }
    threads.forEach { it.start() }
    threads.forEach { it.join() }
    println("期望 10000，实际: ${counter.count}")  // 输出不稳定，常见 6000~9999
}
```

`count = count + 1` 是"读-改-写"三步复合操作，两个线程同时读到同一个旧值就会丢失一次更新。换成原子变量即可修复：

```kotlin
import java.util.concurrent.atomic.AtomicInteger

class Counter {
    private val count = AtomicInteger(0)

    fun increment(): Int = count.incrementAndGet()

    fun get(): Int = count.get()
}

fun main() {
    val counter = Counter()
    val threads = (1..10).map {
        Thread { repeat(1000) { counter.increment() } }
    }
    threads.forEach { it.start() }
    threads.forEach { it.join() }
    println("最终计数: ${counter.get()}")  // 一定是 10000
}
// 预期输出：最终计数: 10000
```

## 详细用法

### kotlinx.atomicfu：多平台首选

```kotlin
// build.gradle.kts
plugins {
    kotlin("jvm") version "2.2.0"
    id("org.jetbrains.kotlinx.atomicfu") version "0.27.0"  // 版本随时间更新，查官方仓库
}

dependencies {
    implementation("org.jetbrains.kotlinx:atomicfu:0.27.0")
}
```

```kotlin
import kotlinx.atomicfu.atomic

class AtomicIntDemo {
    private val value = atomic(0)

    fun demo() {
        val current = value.value          // 读取当前值（volatile 语义）
        value.value = 10                   // 设置新值

        value.incrementAndGet()            // 先加 1，再返回新值
        value.getAndIncrement()            // 先返回当前值，再加 1
        value.addAndGet(5)                 // 加 5，返回新值

        // CAS 操作：如果当前值等于预期值，则更新，返回是否成功
        value.compareAndSet(10, 20)
    }
}
```

原子引用与"读-改-写"循环的封装：

```kotlin
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update
import kotlinx.atomicfu.getAndUpdate

class AtomicRefDemo {
    private val state = atomic("INITIAL")

    fun demo() {
        state.compareAndSet("INITIAL", "RUNNING")
        state.update { it.lowercase() }              // 内部就是 CAS 自旋循环
        val oldValue = state.getAndUpdate { it.uppercase() }
        println("旧值: $oldValue, 新值: ${state.value}")
    }
}
```

### 标准库 kotlin.concurrent.atomics（Kotlin 2.1.20+）

```kotlin
// Kotlin 2.1.20 起提供，实验性 API 需要 opt-in
import kotlin.concurrent.atomics.*

@OptIn(ExperimentalAtomicApi::class)
class StdlibCounter {
    private val count = AtomicInt(0)

    fun increment() {
        count.incrementAndFetch()          // 对应 incrementAndGet
        // 其他成员：load() / store() / fetchAndAdd() / compareAndSet() / compareAndExchange()
    }

    fun get(): Int = count.load()
}

@OptIn(ExperimentalAtomicApi::class)
fun main() {
    val c = StdlibCounter()
    repeat(100) { c.increment() }
    println(c.get())  // 100
}
```

命名差异速记：atomicfu 的 `value` 属性对应标准库的 `load()`/`store()`，`incrementAndGet()` 对应 `incrementAndFetch()`。标准库方案的编译期开销为零（无插件），JVM 实现即 `java.util.concurrent.atomic` 的薄封装。

### 原子布尔：标志位与"只执行一次"

```kotlin
import kotlinx.atomicfu.atomic

class Service {
    private val running = atomic(false)

    fun start() {
        // 如果当前是 false，则设为 true（防止重复启动）
        if (running.compareAndSet(false, true)) {
            println("启动成功")
        } else {
            println("已经在运行中")
        }
    }

    fun stop() {
        running.value = false
    }

    fun isRunning(): Boolean = running.value
}

fun main() {
    val service = Service()
    service.start()  // 启动成功
    service.start()  // 已经在运行中
    service.stop()
}
```

### 原子引用更新不可变对象

```kotlin
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update

data class Config(val host: String, val port: Int, val timeout: Int)

class ConfigManager {
    // 原子引用持有不可变配置对象
    private val config = atomic(Config("localhost", 8080, 30000))

    fun getConfig(): Config = config.value

    // 原子更新配置：创建新对象替换旧对象，而不是修改旧对象内部状态
    fun updateHost(newHost: String) {
        config.update { it.copy(host = newHost) }
    }
}

fun main() {
    val manager = ConfigManager()
    manager.updateHost("example.com")
    println(manager.getConfig())
    // 预期输出: Config(host=example.com, port=9090, timeout=30000)
}
```

关键纪律：**原子引用里放不可变对象（data class + copy）**。如果直接修改对象内部字段，其他线程可能读到"改了一半"的对象，原子性就失效了。

## 常见场景

### CAS 自旋：限流器

```kotlin
import kotlinx.atomicfu.atomic

class RateLimiter(private val maxRequests: Int, private val windowMs: Long) {
    private val count = atomic(0)
    private val windowStart = atomic(System.currentTimeMillis())

    fun tryAcquire(): Boolean {
        while (true) {
            val now = System.currentTimeMillis()
            val start = windowStart.value
            // 时间窗口过期：CAS 竞争重置窗口（只有一个线程能成功）
            if (now - start >= windowMs) {
                if (!windowStart.compareAndSet(start, now)) continue  // 别人先重置了，重读
                count.value = 0
            }
            // CAS 自旋扣减配额
            while (true) {
                val current = count.value
                if (current >= maxRequests) return false
                if (count.compareAndSet(current, current + 1)) return true
            }
        }
    }
}

fun main() {
    val limiter = RateLimiter(maxRequests = 5, windowMs = 1000)
    repeat(8) {
        println("请求 $it: ${if (limiter.tryAcquire()) "通过" else "拒绝"}")
    }
    // 预期输出：请求 0-4 通过，请求 5-7 拒绝（同一时间窗口内）
}
```

注意 `compareAndSet(start, now)` 失败后 `continue` 重读的写法——CAS 的"预期值"必须来自**本轮循环内最新读到的值**，否则会引入竞态。

### 无锁栈（Treiber Stack）

```kotlin
import kotlinx.atomicfu.atomic

class LockFreeStack<T> {
    private val top = atomic<Node<T>?>(null)

    private class Node<T>(val value: T, val next: Node<T>?)

    fun push(value: T) {
        while (true) {
            val currentTop = top.value
            val newNode = Node(value, currentTop)
            if (top.compareAndSet(currentTop, newNode)) return
        }
    }

    fun pop(): T? {
        while (true) {
            val currentTop = top.value ?: return null
            if (top.compareAndSet(currentTop, currentTop.next)) {
                return currentTop.value
            }
        }
    }

    fun isEmpty(): Boolean = top.value == null
}

fun main() {
    val stack = LockFreeStack<Int>()
    stack.push(1); stack.push(2); stack.push(3)
    println(stack.pop())  // 3（后进先出）
    println(stack.pop())  // 2
}
```

### 与协程配合：并发计数

```kotlin
import kotlinx.atomicfu.atomic
import kotlinx.coroutines.*

class CoroutineCounter {
    private val count = atomic(0)

    suspend fun countConcurrently() = coroutineScope {
        val jobs = List(100) {
            launch(Dispatchers.Default) {
                repeat(1000) { count.incrementAndGet() }
            }
        }
        jobs.forEach { it.join() }
        println("最终计数: ${count.value}")  // 一定是 100000
    }
}

fun main() = runBlocking {
    CoroutineCounter().countConcurrently()
}
```

提示：协程内部大量状态共享时，优先考虑**不可变数据 + 通道/Actor 式消息传递**，原子变量适合"计数器、标志位、配置引用"这类简单共享状态。

## 注意事项与常见陷阱

1. **复合操作依然不是原子的**：`atomicInt.value = atomicInt.value + 1` 的读与写是两次独立操作，一样会丢更新。所有"读-改-写"必须走 `incrementAndGet`/`update`/显式 CAS 循环。
2. **CAS 循环不做耗时操作**：竞争激烈时自旋会空转浪费 CPU，临界区内不要做 IO；冲突概率高的场景改用 `Mutex` 或锁。
3. **atomicfu 的插件优化**：不添加编译器插件时 atomicfu 退化为普通包装实现（有额外开销），生产工程应按官方文档配置插件；标准库 `kotlin.concurrent.atomics` 则无此要求。
4. **ABA 问题**：值从 A 变 B 又变回 A 时 CAS 无法察觉。多数业务场景（计数、状态标志）无影响；无锁数据结构中可用版本号（如 `AtomicStampedReference` 思路）规避。
5. **`@Volatile` 只保证可见性**：`@Volatile var` 让读看到最新值，但不保证复合操作原子性——它不是原子变量的替代品。

## 底层原理：CAS 为什么「不阻塞」却安全

把 CAS 拆成一条 CPU 指令（x86 的 `lock cmpxchg`、ARM 的 `ldxr/stxr` 对）就懂了：
「比较 + 交换」在硬件层是一条不可分割的指令，中间不存在被其他线程插入的缝隙。
它的安全性完全建立在「先读、后试、失败重来」的自旋循环上：

```text
读 current → 算 new → CAS(current, new)
   失败？说明 current 之后被人改过 → 重读再试
   成功？说明「读到的时刻」与「生效的时刻」之间值没变过 → 更新成立
```

两个推论值得写进直觉：

1. **CAS 保证的是「从读到写没人动过」，不保证「值没被改过又改回来」**——这就是
   陷阱 4 的 ABA 问题：CAS 只比较值，不比较历史。计数器场景无感，栈/队列这类
   「结构」场景就会出事（节点被弹出又被压回，top 指针看着没变，next 已经换了）。
2. **「不阻塞」不等于「无代价」**：高竞争下自旋线程反复失败重试，消耗的是 CPU
   周期与缓存一致性流量（CAS 失败会让缓存行在核间来回失效）；锁的等待线程则让出
   CPU。所以临界区小、冲突少选 CAS，临界区大或竞争激烈选锁——两条路没有绝对
   优劣，只有场景适配。

与协程的关系一句话：协程的挂起发生在「可挂起的等待」上（Mutex、Channel），而
CAS 自旋是**不可挂起**的忙等——在 Dispatchers.Default 上长时间自旋会占住共享
线程池的线程，这正是陷阱 2 在协程语境下的具体形态。

## 面试题思路：三个高频考法

1. 「@Volatile 和 AtomicInteger 的区别？」——答两层：`@Volatile` 只保证可见性
   与禁止指令重排（读一定看到最新写入），不保证复合操作原子性；
   `AtomicInteger` 在可见性之上用 CAS 保证「读-改-写」不可分割。追问「什么场景
   @Volatile 就够」：一个线程写、其他线程读的**单次写入**标志位（如 shutdown
   开关）。
2. 「CAS 有什么问题？」——标准三连：ABA、自旋开销、只能保证单个变量的原子性
   （多个变量联动需要 AtomicReference 包一个不可变对象，或上锁）。能顺着 ABA
   说出「版本号思路」（atomicfu 里可以用 `AtomicLong` 序号 + 引用一起放进不可变
   数据类）是加分线。
3. 「无锁一定比锁快吗？」——不一定：无竞争时 CAS 快（没有加锁开销），高竞争时
   自旋空转可能比锁的线程挂起更浪费；且无锁代码难以保证公平性（可能有线程长期
   抢不到）。结论是「按竞争度与临界区大小选型」，并强调基准测量（见
   [Kotlin 基准测试](/kotlin/400-KotlinBenchmark)）。

## 动手实验

1. **丢更新可视化**：跑「快速上手」的 `BrokenCounter`，把线程数从 10 调到 2、
   次数从 1000 调到 100000，记录丢失率变化；再用 `-XX:+PrintAssembly` 或
   JITWatch 级别的工具太重，退而求其次：在 `increment()` 里加一行
   `Thread.yield()` 放大交错概率，观察丢失率飙升——亲手验证「竞态是概率性事件」。
2. **CAS 循环显微镜**：给限流器的内层 CAS 循环加失败计数器，多线程压测时打印
   「CAS 尝试次数 / 成功次数」，直观看到竞争激烈时自旋的浪费。
3. **ABA 复现**：用 `AtomicReference<String>` 与两个线程编排：线程 1 读到 "A"
   后暂停；线程 2 把值改成 "B" 再改回 "A"；线程 1 恢复执行
   `compareAndSet("A", "C")`——CAS 成功，但它「以为没变过」的假设已经破产。
   思考：换成不可变版本号对象（`data class Versioned(val v: String, val rev: Int)`）
   后如何让这个 CAS 失败。
4. **两套 API 对照**：把 `CoroutineCounter` 分别用 atomicfu 与
   `kotlin.concurrent.atomics` 各写一遍，跑同样的并发测试，对比 API 命名与
   opt-in 要求，写三句选型备注。

## 小练习（先自己做，再展开参考实现）

**练习 1：原子对象池**。实现 `class IdPool(max: Int)`：`acquire(): Int?` 分发
0 到 max-1 的未占用 id，`release(id)` 归还。要求：多线程并发 acquire 不重复、
release 后 id 可再被分发；内部只用一个 `AtomicReference<Set<Int>>` 或一个
`AtomicLong` 位图（二选一，说明理由）。

提示：位图版用 `fetchOr`/`fetchAnd` 风格的自旋；引用版用 `update {}`。

参考实现（引用版）。先说一个常见错误动机：想用 `update {}` 一次搞定，然后「从
update 的返回值反推自己分到了哪个 id」——这条路在并发下不可靠：update 返回的是
**最终集合**，可能已经包含其他线程后来的分配，反推结果可能不是你成功占住的那个。
正确姿势是显式 CAS 自旋，让「选中的 id」与「写成功的那个集合」原子地绑定：

```kotlin
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.update

class IdPool(private val max: Int) {
    private val taken = atomic(emptySet<Int>())   // 原子引用持有不可变集合

    fun acquire(): Int? {
        while (true) {                             // CAS 自旋
            val busy = taken.value
            val free = (0 until max).firstOrNull { it !in busy } ?: return null
            if (taken.compareAndSet(busy, busy + free)) return free
        }
    }

    fun release(id: Int) {
        taken.update { it - id }
    }
}
```

自检问题：为什么 `update { it - id }` 的 release 不需要自旋循环？
（答：`update` 内部就是 CAS 自旋——「从集合里减一个元素」不需要先决定写什么，
重试自然收敛；acquire 则必须「决定写什么」与「写成功」原子地绑在一起，所以
要显式循环。）

**练习 2：竞态复现测试**。写一个 JUnit 测试 `test("concurrent increments are
not lost")`：100 线程 x 1000 次 `incrementAndGet`，断言结果恰好 100000；再写一个
「故意保留竞态」的对照测试（用普通 var），断言它**大概率失败**。思考：第二个
测试为什么不能作为回归测试稳定运行？

参考实现：

```kotlin
import java.util.concurrent.atomic.AtomicInteger
import kotlin.concurrent.thread
import kotlin.test.Test
import kotlin.test.assertEquals

class AtomicTest {
    @Test
    fun `concurrent increments are not lost`() {
        val counter = AtomicInteger(0)
        val threads = List(100) { thread { repeat(1000) { counter.incrementAndGet() } } }
        threads.forEach { it.join() }
        assertEquals(100_000, counter.get())
    }
}
```

对照测试的答案：竞态测试是**概率性失败**——CI 上可能偶发通过，不能作为「预期
失败」的回归用例；正确的用法是把它当作演示素材（本文快速上手一节的角色），
而不是断言工具。

**挑战题（不给参考实现）**：把 Treiber 栈扩成「带大小上限的有界栈」：
`push` 在满时返回 false、`pop` 在空时返回 null，全部用 CAS 自旋实现。写完自查：
你的「满」判断读的是哪个值？它和 CAS 用的值是否是同一轮读到的？（如果不是，
就引入了新的竞态窗口。）

## 小结

- 竞态的根源是"读-改-写"复合操作被交错；修复手段是原子变量或锁，前者无阻塞、更轻。
- 两套 API：`kotlinx.atomicfu`（多平台、配合编译器插件零开销）与标准库 `kotlin.concurrent.atomics`（2.1.20 起实验性引入，长期方向）。
- 核心方法就三类：读/写（`value` 或 `load/store`）、自增加减（`incrementAndGet` 等）、CAS（`compareAndSet` + 自旋循环）。
- 无锁结构（限流器、Treiber 栈）是 CAS 循环的典型应用；原子引用必须指向不可变对象。
- 并发安全全景（内存模型、锁、不可变设计）见 [Kotlin 并发安全](/kotlin/270-KotlinConcurrencySafety)；性能验证用 [Kotlin 基准测试](/kotlin/400-KotlinBenchmark)。
