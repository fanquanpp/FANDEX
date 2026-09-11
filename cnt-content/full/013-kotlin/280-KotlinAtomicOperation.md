---
order: 280
title: Kotlin 与原子操作
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: 从竞态条件出发掌握原子变量：kotlinx.atomicfu 与标准库 kotlin.concurrent.atomics 两套 API、CAS 原理、无锁结构与常见陷阱。
author: fanquanpp
updated: '2026-09-12'
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

## 小结

- 竞态的根源是"读-改-写"复合操作被交错；修复手段是原子变量或锁，前者无阻塞、更轻。
- 两套 API：`kotlinx.atomicfu`（多平台、配合编译器插件零开销）与标准库 `kotlin.concurrent.atomics`（2.1.20 起实验性引入，长期方向）。
- 核心方法就三类：读/写（`value` 或 `load/store`）、自增加减（`incrementAndGet` 等）、CAS（`compareAndSet` + 自旋循环）。
- 无锁结构（限流器、Treiber 栈）是 CAS 循环的典型应用；原子引用必须指向不可变对象。
- 并发安全全景（内存模型、锁、不可变设计）见 [Kotlin 并发安全](/kotlin/270-KotlinConcurrencySafety)；性能验证用 [Kotlin 基准测试](/kotlin/400-KotlinBenchmark)。
