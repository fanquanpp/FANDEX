---
order: 81
title: Kotlin与并发安全
module: kotlin
category: Kotlin
difficulty: advanced
description: 'Kotlin 并发安全深度解析：共享可变状态、数据竞争、Mutex、原子操作、CAS、Actor 模型、Channel、线程限制、Volatile、StateFlow 的形式化定义、字节码实现与企业级工程实践。对标 MIT 6.005、Stanford CS110、CMU 15-440 教学水准。'
author: fanquanpp
updated: '2026-07-21'
related:
  - kotlin/Kotlin与正则
  - kotlin/Kotlin与时间
  - kotlin/Kotlin与WebSocket
  - kotlin/Kotlin与安全
  - kotlin/协程基础
  - kotlin/协程调度器与上下文
  - kotlin/Channel与BroadcastChannel
  - kotlin/Flow冷流与SharedFlow和StateFlow
prerequisites:
  - kotlin/概述与环境配置
  - kotlin/协程基础
---

# Kotlin 与并发安全（Concurrency Safety in Depth）

> 本文档对标 MIT 6.005 Software Construction、Stanford CS110 Principles of Computer Systems、CMU 15-440 Distributed Systems、UC Berkeley CS162 Operating Systems 等海外名校课程的教学水准，系统讲解 Kotlin 在协程与多线程环境下的并发安全（Concurrency Safety）机制，从"为什么需要并发安全"出发，逐层深入到内存模型（Memory Model）、原子操作（Atomic Operations）、互斥锁（Mutex）、CAS（Compare-And-Swap）、Actor 模型（Actor Model）、Channel、线程限制（Thread Confinement）、`@Volatile` 等核心主题。本文不假设读者熟悉 Java Memory Model 或 Go 内存模型，所有概念均由浅入深、从形式化定义到字节码实现逐层展开。完成本文学习后，读者将能够独立设计线程安全的 Kotlin 协程代码、识别与修复数据竞争（Data Race）、选择合适的并发原语并理解其在 JVM 与 Native 平台的运行时行为差异。

## 目录

1. [学习目标](#1-学习目标)
2. [历史动机与发展脉络](#2-历史动机与发展脉络)
3. [形式化定义](#3-形式化定义)
4. [理论推导与原理解析](#4-理论推导与原理解析)
5. [代码示例](#5-代码示例)
6. [对比分析](#6-对比分析)
7. [常见陷阱与最佳实践](#7-常见陷阱与最佳实践)
8. [工程实践](#8-工程实践)
9. [案例研究](#9-案例研究)
10. [习题](#10-习题)
11. [参考文献](#11-参考文献)
12. [延伸阅读](#12-延伸阅读)

---

## 1. 学习目标

本章节遵循 Bloom 教育目标分类学（Bloom's Taxonomy）的六个认知层级，由低阶到高阶逐层递进。Bloom 分类学由教育心理学家 Benjamin Bloom 于 1956 年提出，2001 年由 Anderson 与 Krathwohl 修订，是国际教育界普遍采用的认知能力分级框架。

### 1.1 Remember（记忆）

完成本章节后，学习者应能够准确记忆以下知识点：

- 复述并发（Concurrency）与并行（Parallelism）的本质差异：并发是"同时处理多个任务"，并行是"同时执行多个任务"。
- 列举共享可变状态（Shared Mutable State）导致数据竞争（Data Race）的三大要素：多个线程访问、至少一个线程写、无同步机制。
- 背诵 Kotlin 提供的五大类并发原语：`Mutex`、`@Volatile`、`Atomic*`（`AtomicInteger`、`AtomicReference` 等）、`Channel`、`StateFlow`。
- 记忆 Java Memory Model（JMM）的两个核心概念：happens-before 关系、内存可见性（Visibility）。
- 列举 `kotlinx.coroutines.sync` 包提供的原语：`Mutex`、`Semaphore`、`Channel`（位于 `kotlinx.coroutines.channels`）。
- 复述 CAS（Compare-And-Swap）操作的形式化语义：`CAS(addr, expected, new) := if *addr == expected then *addr = new; true else false`。
- 记忆 `@Volatile` 在 JVM 上的实现：通过 `volatile` 字段标志位实现，禁止编译器缓存到寄存器，保证每次读写直接访问主内存。
- 列举 Actor 模型的三大核心要素：Actor（行为者）、Mailbox（邮箱）、Message（消息）。
- 背诵线程限制（Thread Confinement）的两种形式：栈限制（Stack Confinement）与对象限制（Object Confinement）。
- 记忆 `Dispatchers.Main.immediate` 与 `Dispatchers.Main` 的差异：前者在已在主线程时同步执行，后者始终调度到事件队列。

### 1.2 Understand（理解）

- 用自己的语言解释"共享可变状态是并发问题的根源"：可变状态在多线程下需要同步机制保证一致性，否则会产生数据竞争。
- 解释 happens-before 关系的含义：如果事件 A happens-before 事件 B，那么 A 的结果对 B 可见，且 A 的执行顺序在 B 之前。
- 描述 JVM 内存模型的"主内存-工作内存"模型：每个线程有自己的工作内存（CPU 缓存或寄存器），主内存（Main Memory）是共享的。
- 阐述 `Mutex` 与 `synchronized` 的核心差异：`Mutex` 是协程友好的（可挂起而非阻塞线程），`synchronized` 是线程级的（阻塞线程）。
- 解释 `Mutex.withLock {}` 的语义：获取锁 → 执行临界区 → 释放锁（即使在异常情况下也释放）。
- 理解 CAS 操作的 ABA 问题：值从 A 变为 B 再变回 A 时，CAS 会误认为未变化，需要版本号解决。
- 描述 `Channel` 作为并发原语的本质：通过 CSP（Communicating Sequential Processes）模型，以消息传递替代共享内存。
- 解释 `StateFlow` 的线程安全机制：内部使用 `AtomicReference` + CAS 实现无锁更新，所有更新操作原子。
- 阐述 `@Volatile` 的局限性：保证可见性但不保证原子性，`i++` 在 `@Volatile` 下仍然不安全。
- 描述"不可变对象天生线程安全"的原理：不可变对象的所有字段在构造完成后不可修改，任何线程读取到的都是一致状态。

### 1.3 Apply（应用）

- 在协程代码中使用 `Mutex` 保护共享可变变量，正确处理异常释放锁。
- 使用 `AtomicInteger` 实现无锁计数器，避免 `synchronized` 的性能开销。
- 使用 `Channel` 在多个协程之间安全传递数据，替代共享可变状态。
- 使用 `StateFlow` 构建响应式状态管理，替代 `MutableSharedFlow` + `Mutex`。
- 使用 `@Volatile` 标志位实现协程取消信号（`isActive` 替代方案）。
- 使用 `Dispatchers.Default.limitedParallelism(1)` 实现协作式线程限制。
- 在 Kotlin/Native 中使用 `kotlinx.atomicfu` 跨平台原子操作库。
- 使用 `Semaphore` 限制并发请求数量（如限流器）。

### 1.4 Analyze（分析）

- 反编译 Kotlin 代码，分析 `Mutex.withLock` 在字节码中如何展开为 `try-finally` 释放锁。
- 对比 `synchronized(lock) { }` 与 `mutex.withLock { }` 的字节码差异：前者调用 `monitorenter`/`monitorexit`，后者调用 `Mutex.lock`/`Mutex.unlock`。
- 分析 `AtomicInteger.incrementAndGet` 的字节码实现：循环调用 `compareAndSwapInt` 直到成功。
- 解构 `StateFlow.value = newValue` 的内部实现：通过 `AtomicReference.compareAndSet` 循环更新。
- 分析 `Channel` 的缓冲区实现：基于 `BufferedChannel` 类，使用 `AtomicInt` 与 `AtomicReferenceArray` 实现无锁缓冲。
- 分析 `@Volatile` 在不同平台的实现差异：JVM 使用 `volatile` 关键字，JS 使用普通变量（单线程），Native 使用内存屏障。

### 1.5 Evaluate（评价）

- 评价 Kotlin 选择 `Mutex`（协程级）而非 `synchronized`（线程级）作为默认互斥原语的设计权衡。
- 评价 Actor 模型相对于共享内存并发的优势：避免数据竞争但增加消息传递开销。
- 评价 `@Volatile` 的设计：是"性能优化"还是"陷阱"？为什么不直接使用 `synchronized`？
- 评估 CAS 在高竞争场景下的表现：自旋开销可能高于阻塞锁，需要退避策略。
- 评价 `StateFlow` 默认的"conflation"（合并）策略：新订阅者只收到最新值，可能丢失中间状态。
- 评估"不可变数据结构 + 共享"策略相对于"可变 + 锁"策略的工程优劣。

### 1.6 Create（创造）

- 设计并实现一个完整的线程安全 LRU 缓存，使用 `Mutex` 保护内部链表与哈希表。
- 设计一个基于 Actor 模型的并发任务调度器，Actor 之间通过 `Channel` 通信。
- 实现一个无锁并发队列，使用 `AtomicReference` 与 CAS 操作，性能优于 `Mutex` 版本。
- 撰写一份团队并发规范：何时用 `Mutex`、何时用 `Atomic*`、何时用 `Channel`、何时用不可变数据。
- 设计一个并发限流器：基于 `Semaphore` 限制每秒最多 N 个请求，支持超时与取消。

---

## 2. 历史动机与发展脉络

### 2.1 问题背景：从单线程到多线程

早期计算机是单核单线程的，程序顺序执行，不存在并发问题。但随着硬件发展：

1. **多核 CPU 普及**（2005 年后）：Intel、AMD 推出双核、四核 CPU，单线程无法充分利用硬件。
2. **多线程应用普及**：Web 服务器需要同时处理数千个请求，桌面应用需要保持 UI 响应同时执行后台任务。
3. **并发编程兴起**：Java 5（2004）引入 `java.util.concurrent` 包，提供 `Executor`、`Atomic*`、`Lock` 等并发原语。

但多线程编程带来了一个根本性难题：**共享可变状态**（Shared Mutable State）。

### 2.2 共享可变状态的问题

考虑以下经典示例：

```java
// Java 代码
class Counter {
    private int count = 0;
    public void increment() { count++; }  // 非线程安全
    public int get() { return count; }
}
```

`count++` 看起来是原子操作，但实际上由三步组成：

1. 读取 `count` 到寄存器
2. 寄存器加 1
3. 写回 `count`

如果两个线程同时执行 `increment()`，可能发生：

```
Thread A: read count=0
Thread B: read count=0
Thread A: register=1
Thread B: register=1
Thread A: write count=1
Thread B: write count=1  // 期望结果是 2，实际是 1
```

这就是**数据竞争**（Data Race）：多个线程并发访问同一可变状态，且至少一个线程写，且没有同步机制保护。

### 2.3 Java Memory Model（JMM）

Java 1.0 没有正式的内存模型，导致各种"奇怪"的并发问题。Java 5（2004）通过 JSR-133 正式确立了 JMM：

1. **主内存与工作内存**：每个线程有自己的工作内存（CPU 缓存或寄存器），主内存是共享的。
2. **happens-before 关系**：定义操作的可见性与顺序性。
3. **volatile 语义**：保证可见性，禁止指令重排序。
4. **final 语义**：正确构造的 `final` 字段对所有线程可见。
5. **synchronized 语义**：同一锁的释放 happens-before 后续获取。

### 2.4 Java 并发原语

`java.util.concurrent`（JSR-166，由 Doug Lea 设计）提供了：

- **`Lock`** 接口：`ReentrantLock`、`ReadWriteLock`，比 `synchronized` 更灵活。
- **`Atomic*`** 类：`AtomicInteger`、`AtomicReference`，基于 CAS 实现。
- **`ConcurrentHashMap`**：分段锁实现的高并发哈希表。
- **`Executor`** 框架：线程池、`Future`、`CompletionService`。
- **`CountDownLatch`、`CyclicBarrier`、`Semaphore`**：同步辅助类。

### 2.5 Kotlin 的协程革命

Kotlin 1.3（2018）将协程稳定化，引入了"轻量级线程"概念：

- **协程 vs 线程**：协程挂起时不阻塞线程，由调度器（Dispatcher）决定何时恢复。
- **结构化并发**：协程作用域（`CoroutineScope`）自动管理子协程的生命周期。
- **suspend 函数**：通过 CPS 转换，编译器将异步代码编译为状态机。

但协程并未消除并发问题，反而引入了新挑战：

1. **协程在多线程调度器上运行**：`Dispatchers.Default` 使用线程池，协程可能在不同线程上恢复。
2. **协程间的共享状态**：多个协程可能访问同一可变状态，需要同步机制。
3. **协程挂起时的状态**：挂起点的状态需要保证一致性。

### 2.6 Kotlin 并发原语的发展

#### 2.6.1 Kotlin 1.0（2016）：基础 JVM 互操作

Kotlin 1.0 完全兼容 Java 并发原语：

```kotlin
private val lock = ReentrantLock()
private var count = 0

fun increment() {
    lock.lock()
    try {
        count++
    } finally {
        lock.unlock()
    }
}

// 或使用 synchronized
fun incrementSync() = synchronized(lock) { count++ }
```

#### 2.6.2 Kotlin 1.1（2017）：协程实验

协程作为实验特性引入，但缺少协程友好的并发原语：

- 协程中调用 `synchronized` 会阻塞线程，违背协程"不阻塞"的设计哲学。
- 需要一种"可挂起的锁"。

#### 2.6.3 Kotlin 1.3（2018）：协程稳定与 `Mutex`

Kotlin 1.3 将协程稳定化，同时 `kotlinx.coroutines` 库发布 1.0：

```kotlin
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

private val mutex = Mutex()
private var count = 0

suspend fun increment() {
    mutex.withLock {
        count++
    }
}
```

`Mutex` 是协程友好的互斥原语：

- **可挂起**：`lock()` 是 `suspend` 函数，挂起当前协程而非阻塞线程。
- **公平性**：可选的公平模式（FIFO）。
- **可取消**：挂起中的协程可被取消，自动释放锁等待。

#### 2.6.4 Kotlin 1.4（2020）：`limitedParallelism`

Kotlin 1.4 引入 `Dispatcher.limitedParallelism(n)`，限制调度器上的并发数：

```kotlin
val singleThreadDispatcher = Dispatchers.Default.limitedParallelism(1)

// 在单线程上下文中执行，无需锁
withContext(singleThreadDispatcher) {
    mutableState++
}
```

这为"线程限制"提供了原语支持。

#### 2.6.5 Kotlin 1.6（2021）：`kotlinx.atomicfu`

`kotlinx.atomicfu` 稳定，提供跨平台原子操作：

```kotlin
import kotlinx.atomicfu.atomic

private val count = atomic(0)

fun increment() {
    count.incrementAndGet()
}
```

支持 JVM、JS、Native 平台，是 KMP 项目的首选并发原语。

#### 2.6.6 Kotlin 1.7-1.9（2022-2023）：`@Volatile` 跨平台

Kotlin 1.9 将 `@Volatile` 扩展到 `commonMain`，可在 KMP 项目中使用：

```kotlin
// commonMain
@Volatile
private var flag: Boolean = false
```

#### 2.6.7 Kotlin 2.0（2024）：K2 与并发优化

Kotlin 2.0 的 K2 编译器对并发代码进行了优化：

1. **更精确的逃逸分析**：识别"不逃逸"的对象，减少同步开销。
2. **更智能的内联**：`Mutex.withLock` 等内联函数被更激进地内联，减少函数调用开销。
3. **Native 内存模型重设计**：Kotlin 2.0 的 Native 内存模型从"严格隔离"改为"松散共享"，性能提升约 2 倍。

### 2.7 Kotlin/Native 的特殊挑战

Kotlin/Native（编译为原生二进制）与 JVM 的并发模型不同：

1. **Kotlin 1.x 的严格隔离模型**：对象不能在线程间共享，必须显式"冻结"（freeze）。
2. **Kotlin 2.0 的新内存模型**：默认允许共享可变状态，与 JVM 行为对齐。
3. **性能权衡**：严格隔离模型避免数据竞争但增加序列化开销，新模型接近 JVM 但需要开发者注意同步。

### 2.8 时间线总览

```
1995  Java 1.0      — 内置 synchronized、volatile
2004  Java 5        — JSR-133 JMM、JSR-166 java.util.concurrent
2016  Kotlin 1.0    — 完全兼容 Java 并发原语
2017  Kotlin 1.1    — 协程实验，缺少协程友好的锁
2018  Kotlin 1.3    — 协程稳定，kotlinx.coroutines 1.0 引入 Mutex
2020  Kotlin 1.4    — limitedParallelism 原语
2021  Kotlin 1.6    — kotlinx.atomicfu 稳定
2023  Kotlin 1.9    — @Volatile 跨平台
2024  Kotlin 2.0    — K2 优化，Native 新内存模型
```

### 2.9 设计哲学

Kotlin 在并发安全方面的设计哲学：

1. **协程友好优先**：`Mutex` 等原语优先设计为可挂起，避免阻塞线程。
2. **多原语共存**：不强制单一并发模型，提供 Mutex、Atomic、Channel、Actor 等多种选择。
3. **跨平台一致性**：通过 `kotlinx.atomicfu` 等库统一 JVM、JS、Native 平台的并发 API。
4. **不可变优先**：通过 `data class` 的 `copy`、`val` 属性鼓励不可变设计。
5. **结构化并发**：`CoroutineScope` 自动管理协程生命周期，避免"逃逸协程"导致的资源泄漏。

---

## 3. 形式化定义

### 3.1 并发的形式化

并发系统可形式化为一个三元组：

$$
C = (T, S, \rightarrow)
$$

其中：

- $T$ 是线程/协程的集合。
- $S$ 是共享状态的集合。
- $\rightarrow \subseteq T \times S \times S$ 是状态转移关系，表示线程 $t \in T$ 将状态 $s_1$ 转换为 $s_2$。

**顺序执行**：如果任一时刻只有一个线程在执行，则 $C$ 是顺序系统。

**并发执行**：如果多个线程可以同时执行，则 $C$ 是并发系统。

**并行执行**：如果多个线程在物理上同时执行（多核 CPU），则 $C$ 是并行系统。

### 3.2 数据竞争的形式化

数据竞争（Data Race）的形式化定义：

$$
\text{DataRace}(t_1, t_2, x) \iff \begin{cases}
t_1 \neq t_2 \\
x \in S \\
\text{at least one of } t_1, t_2 \text{ writes } x \\
\neg \text{HB}(t_1, t_2) \land \neg \text{HB}(t_2, t_1)
\end{cases}
$$

其中 $\text{HB}$ 是 happens-before 关系。即：两个不同线程访问同一变量 $x$，至少一个是写，且它们之间没有 happens-before 关系，则发生数据竞争。

### 3.3 Happens-Before 关系

Happens-before 关系 $\text{HB}$ 是偏序关系（满足自反、反对称、传递），定义如下：

1. **程序顺序**：同一线程内的操作按代码顺序 happens-before。
2. **监视器锁**：`unlock(M)` happens-before 后续的 `lock(M)`。
3. **volatile 字段**：对 `volatile` 字段的写 happens-before 后续的读。
4. **线程启动**：`Thread.start()` happens-before 新线程的第一个操作。
5. **线程终止**：线程的所有操作 happens-before `Thread.join()` 返回。
6. **传递性**：如果 $\text{HB}(A, B)$ 且 $\text{HB}(B, C)$，则 $\text{HB}(A, C)$。
7. **协程挂起/恢复**：协程的挂起点前的操作 happens-before 恢复后的操作（由 `kotlinx.coroutines` 实现）。

形式化：

$$
\text{HB} = \text{PO} \cup \text{Monitor} \cup \text{Volatile} \cup \text{ThreadStart} \cup \text{ThreadJoin} \cup \text{CoroutineResume} \cup \text{Transitive}
$$

### 3.4 互斥锁的形式化

互斥锁（Mutex）的形式化定义为一个状态机：

$$
\text{Mutex} = (\{U, L\}, \{lock, unlock\}, \delta, U)
$$

其中：

- $\{U, L\}$ 是状态集合：$U$ 表示未锁定（Unlocked），$L$ 表示已锁定（Locked）。
- $\{lock, unlock\}$ 是操作集合。
- $\delta$ 是状态转移函数：

$$
\delta(U, lock) = L, \quad \delta(L, lock) = \text{block}, \quad \delta(L, unlock) = U, \quad \delta(U, unlock) = \text{error}
$$

- $U$ 是初始状态。

**临界区**（Critical Section）的形式化定义：

$$
\text{Critical Section} = \text{lock}(M); S; \text{unlock}(M)
$$

其中 $S$ 是需要互斥访问的代码段。

### 3.5 CAS 的形式化

CAS（Compare-And-Swap）的形式化定义：

$$
\text{CAS} : \text{Address} \times \text{Expected} \times \text{New} \to \text{Bool}
$$

$$
\text{CAS}(a, e, n) := \begin{cases}
*a \leftarrow n; \text{true} & \text{if } *a = e \\
\text{false} & \text{otherwise}
\end{cases}
$$

CAS 是原子操作，由 CPU 指令（如 x86 的 `CMPXCHG`）直接支持。

**基于 CAS 的自旋锁**：

$$
\text{SpinLock}(a) := \text{while } \neg \text{CAS}(a, 0, 1) \text{ do skip}
$$

**基于 CAS 的原子增量**：

$$
\text{AtomicIncrement}(a) := \text{do } \{ e := *a; n := e + 1 \} \text{ while } \neg \text{CAS}(a, e, n)
$$

### 3.6 ABA 问题

ABA 问题的形式化描述：

$$
\text{Thread A: } a = A \xrightarrow{read} \text{Thread B: } a = A \to B \to A \xrightarrow{write} \text{Thread A: } \text{CAS}(a, A, C) \text{ succeeds}
$$

线程 A 读取到值 A，线程 B 将值改为 B 再改回 A，线程 A 的 CAS 仍然成功，但中间状态 B 被忽略。

**解决方案**：使用版本号 $v$：

$$
\text{CAS2}(a, (A, v_1), (C, v_2)) := \begin{cases}
*a \leftarrow (C, v_2); \text{true} & \text{if } *a = (A, v_1) \\
\text{false} & \text{otherwise}
\end{cases}
$$

### 3.7 Actor 模型的形式化

Actor 模型（Hewitt, 1973）的形式化定义：

$$
\text{Actor} = (M, B, S)
$$

其中：

- $M$ 是邮箱（Mailbox），是一个 FIFO 队列。
- $B$ 是行为（Behavior），是处理消息的函数 $B : \text{Message} \times S \to S \times \text{Actions}$。
- $S$ 是内部状态（State）。

**Actor 通信规则**：

1. **唯一标识**：每个 Actor 有唯一地址。
2. **异步消息**：发送消息 $\text{send}(a, m)$ 是非阻塞的。
3. **顺序处理**：Actor 一次处理一个消息，新消息进入邮箱等待。
4. **状态隔离**：Actor 的内部状态对外不可见，只能通过消息交互。

**消息处理的形式化**：

$$
\text{Process}(a, m) := \text{let } (s', \text{actions}) = B(m, s) \text{ in } s \leftarrow s'; \text{execute}(\text{actions})
$$

### 3.8 Channel 的形式化

Channel 的形式化定义：

$$
\text{Channel}(T, n) = (Q, \text{cap}=n)
$$

其中 $T$ 是元素类型，$Q$ 是 FIFO 队列，$n$ 是容量。

**操作语义**：

$$
\text{send}(c, x) := \begin{cases}
\text{enqueue}(Q, x) & \text{if } |Q| < n \\
\text{suspend} & \text{otherwise}
\end{cases}
$$

$$
\text{receive}(c) := \begin{cases}
\text{dequeue}(Q) & \text{if } |Q| > 0 \\
\text{suspend} & \text{otherwise}
\end{cases}
$$

** rendezvous（无缓冲）Channel**：$n = 0$，发送与接收必须同时就绪。

### 3.9 线程限制的形式化

线程限制（Thread Confinement）的形式化：

$$
\text{Confine}(x, t) := \forall t' \neq t, \neg \text{Access}(t', x)
$$

即变量 $x$ 只能被线程 $t$ 访问，对其他线程不可见。线程限制天然保证线程安全，无需同步机制。

**栈限制**（Stack Confinement）：变量只存在于局部变量表，不逃逸出方法。

$$
\text{StackConfine}(x) := x \text{ is local variable} \land \neg \text{Escapes}(x)
$$

### 3.10 Volatile 的形式化

`@Volatile` 的形式化语义：

$$
\text{VolatileWrite}(x, v) := \text{StoreStore}(); x \leftarrow v; \text{StoreLoad}()
$$

$$
\text{VolatileRead}(x) := \text{LoadLoad}(); \text{LoadStore}(); \text{return } x
$$

其中 `StoreStore`、`StoreLoad`、`LoadLoad`、`LoadStore` 是内存屏障（Memory Barriers），禁止指令重排序。

**Volatile 保证**：

1. **可见性**：写操作立即对其他线程可见。
2. **顺序性**：禁止 volatile 读写与前后操作重排序。
3. **不保证原子性**：`x++` 仍然不安全（读-改-写不是原子的）。

### 3.11 StateFlow 的形式化

`StateFlow<T>` 是一个特殊的热流（Hot Flow），形式化为：

$$
\text{StateFlow}(T) = (\text{value} : T, \text{subscribers} : \text{Set<FlowCollector>})
$$

**更新语义**：

$$
\text{update}(f : T \to T) := \text{loop } \{ v := \text{value}; v' := f(v); \text{if CAS}(\text{value}, v, v') \text{ break} \}
$$

**订阅语义**：

$$
\text{collect}(c) := \text{emit } \text{value}; \text{loop } \{ \text{await change}; \text{emit } \text{value} \}
$$

StateFlow 保证：

1. **最后一次值可见**：新订阅者立即收到当前值。
2. **conflation**：如果更新速度超过消费速度，中间值被合并。
3. **线程安全**：所有操作基于 CAS，无需外部锁。

### 3.12 不可变对象的形式化

不可变对象（Immutable Object）的形式化：

$$
\text{Immutable}(O) := \forall t, \forall \text{fields } f \in O, \neg \text{Mutate}(t, f) \text{ after construction}
$$

即对象 $O$ 在构造完成后，所有字段不可修改。

**线程安全保证**：

$$
\text{Immutable}(O) \implies \text{ThreadSafe}(O)
$$

不可变对象天生线程安全，因为不存在"写"操作，不满足数据竞争的"至少一个写"条件。

### 3.13 并发安全的充分条件

并发安全的充分条件：

$$
\text{ThreadSafe}(S) \iff \forall t_1, t_2, x \in S, \neg \text{DataRace}(t_1, t_2, x)
$$

避免数据竞争的策略：

1. **不可变**：$S$ 全部不可变。
2. **线程限制**：每个 $x$ 只被一个线程访问。
3. **同步**：通过 Mutex、CAS 等机制建立 happens-before 关系。
4. **消息传递**：通过 Channel、Actor 替代共享内存。

---

## 4. 理论推导与原理解析

### 4.1 为什么 `count++` 不安全？

`count++` 在字节码层面是三步：

```
1. ILOAD count       ; 将 count 读入操作数栈
2. ICONST_1          ; 将常量 1 压入栈
3. IADD              ; 栈顶两数相加
4. ISTORE count      ; 将结果写回 count
```

这三步不是原子的，可能被打断。考虑两个线程同时执行：

```
Thread A: ILOAD count (读 count=0)
Thread B: ILOAD count (读 count=0)
Thread A: ICONST_1, IADD (1+0=1)
Thread B: ICONST_1, IADD (1+0=1)
Thread A: ISTORE count (写 count=1)
Thread B: ISTORE count (写 count=1, 应该是 2)
```

结果：count = 1，但应该是 2。

**解决方法**：

1. `synchronized`：将整个方法标记为同步。
2. `AtomicInteger`：使用 CAS 实现原子增量。
3. `Mutex.withLock`：在协程中使用可挂起的锁。

### 4.2 为什么 `@Volatile` 不能解决 `count++`？

`@Volatile` 保证可见性，但不保证原子性。即：

- **可见性**：线程 A 写入 `count`，线程 B 立即看到新值。
- **原子性**：`count++` 仍然是"读-改-写"三步，可能被打断。

形式化：

$$
\text{Volatile}(x) \implies \text{Visibility}(x) \land \neg \text{Atomicity}(\text{read-modify-write})
$$

`@Volatile` 适用于：

- **布尔标志位**：`@Volatile var cancelled = false`，写入后其他线程立即可见。
- **一次性初始化**：`@Volatile var initialized = false`，避免重排序。
- **双重检查锁定**：配合 `synchronized` 实现 lazy initialization。

不适用于：

- **复合操作**：`count++`、`check-then-act`（`if (x == 0) x = 1`）。
- **多变量一致性**：`x` 和 `y` 需要一起更新，`@Volatile` 不能保证两者同步。

### 4.3 Mutex 的实现原理

`kotlinx.coroutines.sync.Mutex` 的实现基于：

1. **CAS 自旋**：尝试用 CAS 将状态从 `UNLOCKED` 改为 `LOCKED`。
2. **挂起等待**：如果失败，将当前协程加入等待队列并挂起。
3. **唤醒**：锁释放时，从队列取出一个等待协程并唤醒。

简化实现：

```kotlin
class Mutex {
    private val state = atomic(0)  // 0=unlocked, 1=locked
    private val waitQueue = ConcurrentLinkedQueue<Continuation<Unit>>()

    suspend fun lock() {
        // 快速路径：CAS 尝试
        if (state.compareAndSet(0, 1)) return

        // 慢速路径：加入等待队列并挂起
        suspendCancellableCoroutine<Unit> { cont ->
            waitQueue.add(cont)
            // 可能此时锁被释放，再次尝试
            if (state.compareAndSet(0, 1)) {
                waitQueue.remove(cont)
                cont.resume(Unit)
            }
        }
    }

    fun unlock() {
        state.set(0)
        // 唤醒一个等待协程
        waitQueue.poll()?.resume(Unit)
    }
}
```

实际实现更复杂，需要处理：

- **公平性**：FIFO 或非公平。
- **可取消性**：挂起中的协程被取消时，需要从队列移除。
- **所有权**：记录持锁协程，便于调试与重入检测（默认不重入）。

### 4.4 AtomicInteger 的实现原理

`AtomicInteger` 在 JVM 上通过 `Unsafe.compareAndSwapInt` 实现：

```java
public class AtomicInteger {
    private volatile int value;

    public final int incrementAndGet() {
        int oldValue;
        do {
            oldValue = value;
        } while (!Unsafe.compareAndSwapInt(this, valueOffset, oldValue, oldValue + 1));
        return oldValue + 1;
    }
}
```

`Unsafe.compareAndSwapInt` 直接调用 JNI，最终调用 CPU 的 `CMPXCHG` 指令（x86）或 `LL/SC` 指令（ARM）。

**自旋的代价**：在高竞争下，CAS 自旋会浪费 CPU 周期。优化策略：

1. **退避（Backoff）**：失败后短暂等待（如指数退避）。
2. **自适应自旋**：JVM 根据历史成功率调整自旋次数。
3. **分段锁**：如 `ConcurrentHashMap`，将数据分片，每个分片独立加锁。

### 4.5 StateFlow 的线程安全

`StateFlow` 内部使用 `AtomicReference<T>` 存储值，更新操作基于 CAS：

```kotlin
public override var value: T
    get() = value ?: NULL
    set(value) {
        while (true) {
            val oldValue = this.value
            val newValue = value ?: NULL
            if (oldValue == newValue) return
            if (compareAndSet(oldValue, newValue)) return
        }
    }
```

**conflation（合并）语义**：

如果更新速度超过消费速度，中间值被合并。例如：

```
StateFlow 发出: 1, 2, 3, 4, 5
慢速消费者:     1, ..., 5 (跳过 2, 3, 4)
```

这适合 UI 状态：UI 只关心最新状态，不关心中间状态。

### 4.6 Channel 的无锁实现

`Channel` 的缓冲区基于 `BufferedChannel` 类，使用无锁数据结构：

```kotlin
class BufferedChannel<T>(val capacity: Int) {
    private val buffer = AtomicReferenceArray<T>(capacity)
    private val sendIndex = atomic(0L)
    private val receiveIndex = atomic(0L)

    suspend fun send(element: T) {
        while (true) {
            val index = sendIndex.getAndIncrement()
            if (index - receiveIndex.value < capacity) {
                buffer[index % capacity] = element
                return
            }
            // 缓冲区满，挂起
            suspendSend(element, index)
        }
    }

    suspend fun receive(): T {
        while (true) {
            val index = receiveIndex.getAndIncrement()
            val element = buffer[index % capacity]
            if (element != null) {
                buffer[index % capacity] = null
                return element
            }
            // 缓冲区空，挂起
            return suspendReceive(index)
        }
    }
}
```

实际实现更复杂，需要处理：

- **挂起与恢复**：使用 `select` 实现多路复用。
- **关闭**：`close()` 后所有挂起的发送者收到异常。
- **背压（Backpressure）**：缓冲区满时，发送者挂起，避免生产者过快。

### 4.7 为什么 Actor 模型避免数据竞争？

Actor 模型的核心是"消息传递替代共享内存"：

1. **状态隔离**：每个 Actor 的内部状态对外不可见。
2. **单线程处理**：Actor 一次只处理一个消息，新消息进入邮箱等待。
3. **无共享**：Actor 之间不直接访问对方状态，只能通过消息。

形式化：

$$
\text{Actor}(a) \implies \forall t_1, t_2, x \in \text{State}(a), \neg \text{Access}(t_1, x) \lor \neg \text{Access}(t_2, x)
$$

即：Actor 的状态不会被多个线程同时访问。

**Kotlin 实现**：通过 `Channel` + 单协程处理：

```kotlin
class CounterActor {
    private val channel = Channel<CounterMsg>(Channel.UNLIMITED)
    private var count = 0

    init {
        GlobalScope.launch {
            for (msg in channel) {
                when (msg) {
                    is Increment -> count++
                    is GetValue -> msg.reply.complete(count)
                }
            }
        }
    }

    suspend fun increment() = channel.send(Increment)
    suspend fun getValue(): Int = coroutineScope {
        val reply = CompletableDeferred<Int>()
        channel.send(GetValue(reply))
        reply.await()
    }
}
```

### 4.8 结构化并发与并发安全

结构化并发（Structured Concurrency）要求：

1. **作用域**：所有子协程必须在父协程的作用域内启动。
2. **生命周期**：父协程等待所有子协程完成才结束。
3. **取消传播**：父协程取消时，所有子协程被取消。

形式化：

$$
\text{Structured}(C) := \forall c' \in \text{Children}(c), \text{Scope}(c') = \text{Scope}(c) \land \text{Lifecycle}(c') \subseteq \text{Lifecycle}(c)
$$

**并发安全的好处**：

1. **避免泄漏**：作用域结束时，所有子协程被取消，避免"逃逸协程"。
2. **错误传播**：子协程抛出异常时，父协程被取消，所有兄弟协程也被取消。
3. **资源释放**：作用域结束时，所有锁、文件句柄等资源被释放。

### 4.9 Kotlin/Native 的内存模型

Kotlin 1.x 的 Native 内存模型是"严格隔离"：

1. **对象不可跨线程共享**：对象必须显式 `freeze` 才能"快照"到其他线程。
2. **冻结不可逆**：`freeze` 后的对象不可修改，所有字段递归冻结。
3. **性能开销**：频繁 `freeze` 大对象有性能开销。

Kotlin 2.0 的新内存模型：

1. **默认可共享**：对象可在线程间共享，与 JVM 行为对齐。
2. **需要同步**：可变共享状态需要显式同步（`@Volatile`、`Atomic*`）。
3. **性能提升**：避免 `freeze` 开销，性能接近 JVM。

### 4.10 并发安全等级

并发安全的等级（从弱到强）：

1. **不可变（Immutable）**：对象不可修改，天生线程安全。
2. **线程限制（Thread Confined）**：对象只被一个线程访问。
3. **共享只读（Shared Read-only）**：多个线程只读，无写操作。
4. **线程安全共享（Thread-safe Shared）**：通过同步机制保证一致性。
5. **共享可变（Shared Mutable）**：无同步机制，存在数据竞争（最不安全）。

设计建议：

- **优先不可变**：通过 `data class` + `copy` 实现不可变更新。
- **次优线程限制**：通过 `limitedParallelism(1)` 实现协程限制。
- **最后选共享+同步**：使用 `Mutex`、`Atomic*` 等原语。

---

## 5. 代码示例

### 5.1 非线程安全的计数器

```kotlin
import kotlinx.coroutines.*
import kotlin.system.measureTimeMillis

// 非线程安全的计数器
class UnsafeCounter {
    var count = 0
    fun increment() { count++ }  // 数据竞争！
}

fun main() = runBlocking {
    val counter = UnsafeCounter()
    val time = measureTimeMillis {
        val jobs = List(100) {
            launch(Dispatchers.Default) {
                repeat(1000) { counter.increment() }
            }
        }
        jobs.joinAll()
    }
    println("Final count: ${counter.count}, expected: 100000, time: ${time}ms")
    // 输出：Final count: 87324, expected: 100000 (数据竞争！)
}
```

### 5.2 使用 `synchronized` 修复

```kotlin
class SynchronizedCounter {
    private var count = 0
    private val lock = Any()

    fun increment() = synchronized(lock) {
        count++
    }

    fun get() = synchronized(lock) { count }
}
```

**问题**：`synchronized` 阻塞线程，在协程中调用会阻塞调度器线程，影响其他协程。

### 5.3 使用 `Mutex` 修复

```kotlin
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class MutexCounter {
    private var count = 0
    private val mutex = Mutex()

    suspend fun increment() {
        mutex.withLock {
            count++
        }
    }

    suspend fun get(): Int = mutex.withLock { count }
}

fun main() = runBlocking {
    val counter = MutexCounter()
    val time = measureTimeMillis {
        val jobs = List(100) {
            launch(Dispatchers.Default) {
                repeat(1000) { counter.increment() }
            }
        }
        jobs.joinAll()
    }
    println("Final count: ${counter.get()}, time: ${time}ms")
    // 输出：Final count: 100000 (正确)
}
```

### 5.4 使用 `AtomicInteger`

```kotlin
import java.util.concurrent.atomic.AtomicInteger

class AtomicCounter {
    private val count = AtomicInteger(0)

    fun increment() {
        count.incrementAndGet()
    }

    fun get() = count.get()
}
```

**优点**：无锁，性能高。
**缺点**：只能保护单个变量，复合操作仍需锁。

### 5.5 使用 `kotlinx.atomicfu`

```kotlin
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.atomic

class AtomicFuCounter {
    private val count = atomic(0)

    fun increment() {
        count.incrementAndGet()
    }

    fun get() = count.value
}
```

**优点**：跨平台（JVM、JS、Native），是 KMP 项目的首选。

### 5.6 使用 `Channel` 替代共享状态

```kotlin
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.*

class ChannelCounter {
    private val channel = Channel<Int>(Channel.UNLIMITED)
    private var count = 0

    init {
        GlobalScope.launch(Dispatchers.Default) {
            for (delta in channel) {
                count += delta
            }
        }
    }

    suspend fun increment() {
        channel.send(1)
    }

    // 获取值需要通过请求-响应模式
    suspend fun get(): Int = coroutineScope {
        val response = Channel<Int>()
        channel.send(-1)  // 特殊指令表示查询
        // 实际实现需要更复杂的协议
        response.receive()
    }
}
```

### 5.7 使用 `StateFlow`

```kotlin
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.*

class StateFlowCounter {
    private val _count = MutableStateFlow(0)
    val count: StateFlow<Int> = _count.asStateFlow()

    fun increment() {
        _count.update { it + 1 }
    }
}

fun main() = runBlocking {
    val counter = StateFlowCounter()
    val time = measureTimeMillis {
        val jobs = List(100) {
            launch(Dispatchers.Default) {
                repeat(1000) { counter.increment() }
            }
        }
        jobs.joinAll()
    }
    println("Final count: ${counter.count.value}, time: ${time}ms")
    // 输出：Final count: 100000 (正确)
}
```

### 5.8 Actor 模型实现

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

sealed class CounterMsg
object Increment : CounterMsg()
class GetValue(val reply: CompletableDeferred<Int>) : CounterMsg()

class CounterActor {
    private val channel = Channel<CounterMsg>(Channel.UNLIMITED)
    private var count = 0

    init {
        GlobalScope.launch(Dispatchers.Default) {
            for (msg in channel) {
                when (msg) {
                    is Increment -> count++
                    is GetValue -> msg.reply.complete(count)
                }
            }
        }
    }

    suspend fun increment() = channel.send(Increment)

    suspend fun getValue(): Int {
        val reply = CompletableDeferred<Int>()
        channel.send(GetValue(reply))
        return reply.await()
    }
}
```

### 5.9 线程限制

```kotlin
import kotlinx.coroutines.*

class ConfinedCounter {
    private var count = 0
    private val dispatcher = Dispatchers.Default.limitedParallelism(1)

    suspend fun increment() = withContext(dispatcher) {
        count++
    }

    suspend fun get() = withContext(dispatcher) { count }
}
```

**优点**：无需锁，性能接近普通变量访问。
**缺点**：所有访问必须通过 `withContext`，增加挂起开销。

### 5.10 双重检查锁定（DCL）

```kotlin
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class LazyInit {
    @Volatile
    private var instance: ExpensiveObject? = null
    private val mutex = Mutex()

    suspend fun getInstance(): ExpensiveObject {
        instance?.let { return it }  // 快速路径：无锁读

        return mutex.withLock {
            instance?.let { return it }  // 双重检查
            instance = ExpensiveObject()
            instance!!
        }
    }
}

class ExpensiveObject
```

### 5.11 不可变数据结构

```kotlin
// 不可变数据类
data class User(val id: String, val name: String, val email: String)

// 通过 copy 更新
val user = User("1", "Alice", "alice@example.com")
val updated = user.copy(name = "Alice Smith")

// 不可变集合
val immutableList = listOf(1, 2, 3)
val updatedList = immutableList + 4  // 新列表
```

不可变对象天生线程安全，无需同步机制。

### 5.12 读写锁（ReadWriteLock）

```kotlin
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class ReadWriteMap<K, V> {
    private val map = mutableMapOf<K, V>()
    private val rwLock = ReentrantReadWriteLock()

    fun get(key: K): V? {
        rwLock.readLock().lock()
        try {
            return map[key]
        } finally {
            rwLock.readLock().unlock()
        }
    }

    fun put(key: K, value: V) {
        rwLock.writeLock().lock()
        try {
            map[key] = value
        } finally {
            rwLock.writeLock().unlock()
        }
    }
}
```

**适用场景**：读多写少（如配置表、缓存）。

### 5.13 信号量（Semaphore）

```kotlin
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.*

class RateLimiter(private val maxConcurrency: Int) {
    private val semaphore = Semaphore(maxConcurrency)

    suspend fun <T> doWithLimit(block: suspend () -> T): T {
        return semaphore.withPermit {
            block()
        }
    }
}

// 使用：限制最多 10 个并发请求
val limiter = RateLimiter(10)
val results = listOf("url1", "url2", ...).map { url ->
    async {
        limiter.doWithLimit { fetchUrl(url) }
    }
}.awaitAll()
```

### 5.14 `@Volatile` 标志位

```kotlin
class CancellableTask {
    @Volatile
    private var cancelled = false

    fun cancel() {
        cancelled = true
    }

    suspend fun run() {
        while (!cancelled) {
            doWork()
            yield()  // 让出 CPU
        }
    }

    private suspend fun doWork() {
        // ...
    }
}
```

### 5.15 CAS 实现 Treiber Stack

```kotlin
import kotlinx.atomicfu.atomic

class TreiberStack<T> {
    private class Node<T>(val value: T, val next: Node<T>?)

    private val top = atomic<Node<T>?>(null)

    fun push(value: T) {
        while (true) {
            val currentTop = top.value
            val newTop = Node(value, currentTop)
            if (top.compareAndSet(currentTop, newTop)) return
        }
    }

    fun pop(): T? {
        while (true) {
            val currentTop = top.value ?: return null
            val next = currentTop.next
            if (top.compareAndSet(currentTop, next)) {
                return currentTop.value
            }
        }
    }
}
```

**优点**：无锁，高并发性能好。
**缺点**：高竞争下 CAS 自旋开销大。

---

## 6. 对比分析

### 6.1 Kotlin vs Java 并发原语对比

| 特性 | Java `synchronized` | Kotlin `Mutex` | `Atomic*` | `Channel` |
| --- | --- | --- | --- | --- |
| 阻塞方式 | 阻塞线程 | 挂起协程 | 无阻塞（自旋） | 挂起协程 |
| 适用场景 | 任意 JVM 代码 | 协程代码 | 单变量原子操作 | 协程间通信 |
| 可重入 | 是 | 否（默认） | N/A | N/A |
| 可取消 | 否 | 是 | 否 | 是 |
| 公平性 | 非公平 | 可选公平 | N/A | FIFO |
| 跨平台 | JVM only | JVM/JS/Native | JVM only | JVM/JS/Native |
| 性能 | 中 | 中 | 高 | 中 |

### 6.2 共享内存 vs 消息传递

| 特性 | 共享内存 + 锁 | 消息传递（Channel/Actor） |
| --- | --- | --- |
| 数据所有权 | 共享 | 私有 |
| 同步机制 | 显式锁 | 隐式（消息顺序） |
| 数据竞争风险 | 高 | 低 |
| 性能 | 高（无锁时） | 中（消息开销） |
| 调试难度 | 高（死锁、竞态） | 低（消息日志） |
| 适用场景 | 性能敏感 | 复杂业务逻辑 |

### 6.3 Kotlin vs Go 并发对比

| 特性 | Kotlin 协程 | Go Goroutine |
| --- | --- | --- |
| 并发原语 | 协程（用户态） | Goroutine（用户态） |
| 通信方式 | Channel、SharedFlow | Channel |
| 同步机制 | Mutex、Atomic | Mutex、Atomic |
| 调度器 | Dispatcher（可插拔） | Runtime（内置） |
| 结构化并发 | CoroutineScope | Context（1.x） |
| 跨平台 | JVM/JS/Native | 跨平台编译 |
| 性能 | 接近 Go | 优秀 |

### 6.4 Kotlin vs Rust 并发对比

| 特性 | Kotlin | Rust |
| --- | --- | --- |
| 内存安全 | GC | 所有权 + 借用 |
| 数据竞争 | 运行时检测（少） | 编译期拒绝 |
| 锁机制 | Mutex（运行时） | Mutex（编译期检查） |
| Send/Sync | 无 | 显式 trait |
| 学习曲线 | 中 | 陡 |
| 性能 | 中 | 高 |

### 6.5 Kotlin vs Scala 并发对比

| 特性 | Kotlin 协程 | Scala（Future/Akka） |
| --- | --- | --- |
| 并发模型 | CPS 转换 | Future（Monad）/ Actor |
| 语法 | `suspend fun` | `Future`/`async`/`await` |
| 性能 | 接近原生 | 中等 |
| 生态 | JVM/JS/Native | JVM |
| 学习曲线 | 中 | 高（Monad） |

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱 1：在协程中使用 `synchronized`

```kotlin
// 错误：synchronized 阻塞线程，影响其他协程
suspend fun wrongSync() {
    synchronized(lock) {
        delay(1000)  // 阻塞线程 1 秒！
    }
}

// 正确：使用 Mutex
suspend fun correctMutex() {
    mutex.withLock {
        delay(1000)  // 挂起协程，不阻塞线程
    }
}
```

### 7.2 陷阱 2：忘记释放锁

```kotlin
// 错误：异常时锁未释放
suspend fun wrongRelease() {
    mutex.lock()
    riskyOperation()  // 抛异常，锁泄漏
    mutex.unlock()
}

// 正确：使用 withLock
suspend fun correctRelease() {
    mutex.withLock {
        riskyOperation()  // 异常时 withLock 自动释放
    }
}
```

### 7.3 陷阱 3：`@Volatile` 误用

```kotlin
// 错误：@Volatile 不能保证 count++ 原子性
class WrongVolatile {
    @Volatile
    var count = 0

    fun increment() { count++ }  // 仍然不安全！
}

// 正确：使用 AtomicInteger
class CorrectAtomic {
    private val count = AtomicInteger(0)

    fun increment() { count.incrementAndGet() }
}
```

### 7.4 陷阱 4：复合操作非原子

```kotlin
// 错误：check-then-act 不是原子的
class WrongCheck {
    @Volatile
    private var initialized = false

    fun wrongInit() {
        if (!initialized) {  // Thread A 读到 false
            // Thread B 也读到 false，并发初始化！
            init()
            initialized = true
        }
    }
}

// 正确：使用 CAS 或 synchronized
class CorrectInit {
    private val initialized = atomic(false)

    fun correctInit() {
        if (initialized.compareAndSet(false, true)) {
            init()  // 只有一个线程执行
        }
    }
}
```

### 7.5 陷阱 5：死锁

```kotlin
// 错误：嵌套锁顺序不一致导致死锁
suspend fun deadlock() {
    coroutineScope {
        launch {
            mutexA.withLock {
                delay(100)
                mutexB.withLock { /* ... */ }  // 等待 B
            }
        }
        launch {
            mutexB.withLock {
                delay(100)
                mutexA.withLock { /* ... */ }  // 等待 A
            }
        }
    }
}

// 正确：统一锁顺序
suspend fun correctLock() {
    coroutineScope {
        launch {
            mutexA.withLock {
                mutexB.withLock { /* ... */ }  // 总是先 A 后 B
            }
        }
        launch {
            mutexA.withLock {
                mutexB.withLock { /* ... */ }  // 总是先 A 后 B
            }
        }
    }
}
```

### 7.6 陷阱 6：可变对象通过 Channel 传递

```kotlin
// 错误：可变对象在多协程间共享
data class MutableData(var value: Int = 0)

suspend fun wrongSharedMutable() {
    val channel = Channel<MutableData>()
    launch {
        val data = MutableData(0)
        repeat(100) {
            data.value = it
            channel.send(data)  // 发送同一对象引用
        }
    }
    launch {
        repeat(100) {
            val received = channel.receive()
            println(received.value)  // 可能读到错误的值
        }
    }
}

// 正确：发送不可变副本
data class ImmutableData(val value: Int)

suspend fun correctImmutable() {
    val channel = Channel<ImmutableData>()
    launch {
        repeat(100) {
            channel.send(ImmutableData(it))  // 新对象
        }
    }
}
```

### 7.7 陷阱 7：`StateFlow` 不能保护复杂状态

```kotlin
// 错误：StateFlow 只保护单个字段
class WrongStateFlow {
    private val _users = MutableStateFlow<List<User>>(emptyList())

    suspend fun addUser(user: User) {
        // 错误：read-modify-write 不是原子的
        _users.value = _users.value + user
    }
}

// 正确：使用 update
class CorrectStateFlow {
    private val _users = MutableStateFlow<List<User>>(emptyList())

    fun addUser(user: User) {
        _users.update { it + user }  // 基于 CAS，原子
    }
}
```

### 7.8 陷阱 8：`runBlocking` 滥用

```kotlin
// 错误：在协程中调用 runBlocking 会阻塞线程
suspend fun wrongRunBlocking() {
    runBlocking {
        delay(1000)  // 阻塞当前线程 1 秒
    }
}

// 正确：直接使用 suspend 函数
suspend fun correctSuspend() {
    delay(1000)  // 挂起协程
}
```

### 7.9 陷阱 9：`GlobalScope` 滥用

```kotlin
// 错误：GlobalScope 无法取消，容易泄漏
fun wrongGlobalScope() {
    GlobalScope.launch {
        while (true) {
            delay(1000)
            doWork()  // 永远执行
        }
    }
}

// 正确：使用结构化并发
fun correctStructured() = runBlocking {
    launch {
        while (isActive) {
            delay(1000)
            doWork()
        }
    }
}
```

### 7.10 陷阱 10：`async` 不 await

```kotlin
// 错误：async 启动后不 await，异常被吞
suspend fun wrongAsync() {
    coroutineScope {
        async {
            throw RuntimeException("Failed")  // 异常被吞
        }
        // 不 await，异常丢失
    }
}

// 正确：await 所有 async
suspend fun correctAsync() = coroutineScope {
    val deferred = async {
        throw RuntimeException("Failed")
    }
    try {
        deferred.await()  // 异常在此抛出
    } catch (e: Exception) {
        println("Caught: ${e.message}")
    }
}
```

### 7.11 陷阱 11：`launch` 替代 `async`

```kotlin
// 错误：launch 用于需要结果的场景，丢失返回值
suspend fun wrongLaunch() {
    val result = CoroutineScope(Dispatchers.Default).launch {
        computeResult()  // 返回值被丢弃
    }
    // 无法获取结果
}

// 正确：使用 async + await
suspend fun correctAsync() = coroutineScope {
    val deferred = async { computeResult() }
    val result = deferred.await()
    println(result)
}
```

### 7.12 陷阱 12：`Dispatchers.Default` 滥用

```kotlin
// 错误：所有协程都用 Default，可能导致调度器饱和
suspend fun wrongDispatcher() {
    coroutineScope {
        List(10000) {
            launch(Dispatchers.Default) {
                Thread.sleep(1000)  // 阻塞调度器线程
            }
        }.joinAll()
    }
}

// 正确：阻塞操作用 IO，CPU 密集用 Default
suspend fun correctDispatcher() {
    coroutineScope {
        List(10000) {
            launch(Dispatchers.IO) {
                delay(1000)  // 挂起，不阻塞线程
            }
        }.joinAll()
    }
}
```

### 7.13 陷阱 13：`Mutex` 不可重入

```kotlin
private val mutex = Mutex()

// 错误：再次 lock 会死锁
suspend fun recursiveLock() {
    mutex.withLock {
        mutex.withLock {  // 死锁！Mutex 不可重入
            // ...
        }
    }
}

// 解决：重构代码避免嵌套锁，或使用 ReentrantLock
```

### 7.14 陷阱 14：`AtomicReference` 复合操作

```kotlin
// 错误：多个字段的更新不是原子的
class WrongMultiField {
    private val state = AtomicReference(State(0, 0))

    fun wrongUpdate() {
        val current = state.get()
        state.set(State(current.a + 1, current.b))  // 中间状态可能被其他线程读到
    }
}

// 正确：使用 CAS 循环
class CorrectMultiField {
    private val state = atomic(State(0, 0))

    fun update() {
        state.update { it.copy(a = it.a + 1) }
    }
}

data class State(val a: Int, val b: Int)
```

### 7.15 陷阱 15：`lateinit var` 多线程

```kotlin
// 错误：lateinit var 多线程初始化不安全
class WrongLateinit {
    lateinit var service: Service

    fun wrongInit() {
        coroutineScope {
            launch { service = Service("a") }
            launch { service = Service("b") }  // 竞争！
        }
    }
}

// 正确：使用 lazy 或 AtomicReference
class CorrectLazy {
    val service by lazy { Service("default") }
}
```

---

## 8. 工程实践

### 8.1 线程安全 LRU 缓存

```kotlin
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class ThreadSafeLRUCache<K, V>(private val maxSize: Int) {
    private val mutex = Mutex()
    private val cache = LinkedHashMap<K, V>(16, 0.75f, true)

    suspend fun get(key: K): V? = mutex.withLock {
        cache.get(key)
    }

    suspend fun put(key: K, value: V) = mutex.withLock {
        if (cache.size >= maxSize) {
            val oldest = cache.keys.first()
            cache.remove(oldest)
        }
        cache.put(key, value)
    }

    suspend fun remove(key: K) = mutex.withLock {
        cache.remove(key)
    }

    suspend fun size(): Int = mutex.withLock { cache.size }
}
```

### 8.2 并发任务调度器（Actor 模型）

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*

sealed class SchedulerMsg
class Submit(val task: suspend () -> Unit) : SchedulerMsg()
object Shutdown : SchedulerMsg()

class SingleThreadScheduler {
    private val channel = Channel<SchedulerMsg>(Channel.UNLIMITED)
    private val job: Job

    init {
        job = GlobalScope.launch(Dispatchers.Default) {
            for (msg in channel) {
                when (msg) {
                    is Submit -> msg.task()
                    is Shutdown -> break
                }
            }
        }
    }

    fun submit(task: suspend () -> Unit) {
        channel.trySend(Submit(task))
    }

    fun shutdown() {
        channel.trySend(Shutdown)
    }

    suspend fun join() = job.join()
}
```

### 8.3 无锁并发队列（Michael-Scott 队列）

```kotlin
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.atomic

class MichaelScottQueue<T> {
    private class Node<T>(val value: T?, next: Node<T>? = null)

    private val head: AtomicRef<Node<T>>
    private val tail: AtomicRef<Node<T>>

    init {
        val dummy = Node<T>(null)
        head = atomic(dummy)
        tail = atomic(dummy)
    }

    fun enqueue(value: T) {
        val newNode = Node(value)
        while (true) {
            val currentTail = tail.value
            val next = currentTail.next?.value
            if (currentTail == tail.value) {
                if (next == null) {
                    if (currentTail.next.compareAndSet(null, newNode)) {
                        tail.compareAndSet(currentTail, newNode)
                        return
                    }
                } else {
                    tail.compareAndSet(currentTail, next)
                }
            }
        }
    }

    fun dequeue(): T? {
        while (true) {
            val currentHead = head.value
            val currentTail = tail.value
            val next = currentHead.next?.value
            if (currentHead == head.value) {
                if (currentHead == currentTail) {
                    if (next == null) return null
                    tail.compareAndSet(currentTail, next)
                } else {
                    val value = next?.value
                    if (head.compareAndSet(currentHead, next!!)) {
                        return value
                    }
                }
            }
        }
    }
}
```

### 8.4 并发限流器

```kotlin
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.*

class RateLimiter(private val permits: Int, private val timeoutMs: Long = 0) {
    private val semaphore = Semaphore(permits)

    suspend fun <T> execute(block: suspend () -> T): T {
        return if (timeoutMs > 0) {
            withTimeout(timeoutMs) {
                semaphore.withPermit { block() }
            }
        } else {
            semaphore.withPermit { block() }
        }
    }
}

// 使用：限制 API 调用并发数
val limiter = RateLimiter(10)
val results = urls.map { url ->
    async(Dispatchers.IO) {
        limiter.execute { fetchUrl(url) }
    }
}.awaitAll()
```

### 8.5 异步事件总线

```kotlin
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.*

class EventBus {
    private val events = MutableSharedFlow<Event>(extraBufferCapacity = 64)

    fun emit(event: Event) {
        events.tryEmit(event)
    }

    fun subscribe(): SharedFlow<Event> = events.asSharedFlow()
}

sealed class Event {
    data class UserLogin(val userId: String) : Event()
    data class UserLogout(val userId: String) : Event()
    data class MessageReceived(val from: String, val content: String) : Event()
}
```

### 8.6 双缓冲 Double Buffering

```kotlin
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.flow.*

class DoubleBuffer<T>(initial: T) {
    private val mutex = Mutex()
    private var current: T = initial
    private var next: T = initial

    val state: Flow<T> = flow {
        emit(current)
        while (true) {
            mutex.withLock {
                if (current != next) {
                    current = next
                    emit(current)
                }
            }
        }
    }

    fun update(new: T) {
        mutex.withLock {
            next = new
        }
    }
}
```

### 8.7 原子引用的状态机

```kotlin
import kotlinx.atomicfu.atomic

class StateMachine<S>(initial: S) {
    private val state = atomic(initial)

    fun transition(transition: (S) -> S): S {
        while (true) {
            val current = state.value
            val next = transition(current)
            if (state.compareAndSet(current, next)) {
                return next
            }
        }
    }

    fun get(): S = state.value
}

// 使用
sealed class ConnectionState {
    object Disconnected : ConnectionState()
    object Connecting : ConnectionState()
    object Connected : ConnectionState()
    data class Error(val msg: String) : ConnectionState()
}

val machine = StateMachine<ConnectionState>(ConnectionState.Disconnected)

fun connect() = machine.transition {
    when (it) {
        is ConnectionState.Disconnected -> ConnectionState.Connecting
        else -> it
    }
}
```

### 8.8 协程本地存储（ThreadLocal/CoroutineLocal）

```kotlin
import kotlinx.coroutines.*

val requestIdContext = CoroutineName("request-context")

class RequestContext(val requestId: String)

suspend fun withRequestContext(requestId: String, block: suspend () -> Unit) {
    withContext(CoroutineName("request-$requestId")) {
        block()
    }
}

// 或使用 ThreadLocal（仅 JVM）
val threadLocalRequest = ThreadLocal<String>()

suspend fun processRequest(requestId: String) {
    threadLocalRequest.set(requestId)
    try {
        // 在协程中使用
        doWork()
    } finally {
        threadLocalRequest.remove()
    }
}
```

### 8.9 响应式状态管理（MVI）

```kotlin
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.*

class MVIStore<S, I, E>(
    initialState: S,
    private val reducer: (S, I) -> S,
    private val effects: (I) -> List<E>
) {
    private val _state = MutableStateFlow(initialState)
    val state: StateFlow<S> = _state.asStateFlow()

    private val _effects = MutableSharedFlow<E>(extraBufferCapacity = 64)
    val effects: SharedFlow<E> = _effects.asSharedFlow()

    fun dispatch(intent: I) {
        _state.update { reducer(it, intent) }
        effects(intent).forEach { _effects.tryEmit(it) }
    }
}
```

### 8.10 并发安全的单例

```kotlin
// 错误：非线程安全
class UnsafeSingleton {
    companion object {
        private var instance: UnsafeSingleton? = null

        fun getInstance(): UnsafeSingleton {
            if (instance == null) {
                instance = UnsafeSingleton()  // 数据竞争
            }
            return instance!!
        }
    }
}

// 正确 1：使用 object 声明
object CorrectSingleton {
    fun doWork() { /* ... */ }
}

// 正确 2：使用 lazy
class LazySingleton private constructor() {
    companion object {
        val instance: LazySingleton by lazy { LazySingleton() }
    }
}

// 正确 3：DCL + @Volatile
class DCLSingleton private constructor() {
    companion object {
        @Volatile
        private var instance: DCLSingleton? = null

        fun getInstance(): DCLSingleton {
            return instance ?: synchronized(this) {
                instance ?: DCLSingleton().also { instance = it }
            }
        }
    }
}
```

---

## 9. 案例研究

### 9.1 案例研究 1：`kotlinx.coroutines.sync.Mutex`

**问题**：协程友好的互斥锁，可挂起而非阻塞。

**实现要点**：

1. **状态管理**：使用 `AtomicInt` 存储 `UNLOCKED`、`LOCKED`、`SUSPENDED` 三种状态。
2. **快速路径**：CAS 尝试从 `UNLOCKED` 到 `LOCKED`，成功则立即返回。
3. **慢速路径**：CAS 失败时，将协程加入等待队列并挂起。
4. **唤醒**：`unlock()` 时从队列取出一个等待协程并恢复。

**源码片段**（简化）：

```kotlin
public class Mutex {
    private val state = atomic(UNLOCKED)
    private val waiters = AtomicRef<Node?>(null)

    public suspend fun lock() {
        // 快速路径
        if (state.compareAndSet(UNLOCKED, LOCKED)) return

        // 慢速路径：加入等待队列
        val node = Node(currentCoroutine())
        waiters.update { node.also { it.next = it } }
        suspendCancellableCoroutine<Unit> { cont ->
            node.cont = cont
        }
    }

    public fun unlock() {
        val waiter = waiters.value
        if (waiter == null) {
            if (!state.compareAndSet(LOCKED, UNLOCKED)) {
                // 状态异常
            }
        } else {
            // 唤醒等待者
            waiter.cont?.resume(Unit)
        }
    }
}
```

**启示**：协程原语需要"快速路径 + 慢速路径"设计，快速路径使用无锁 CAS，慢速路径使用挂起。

### 9.2 案例研究 2：`StateFlow` 的无锁实现

**问题**：多个协程并发更新状态，需要原子性。

**实现**：

```kotlin
public class StateFlow<T>(initial: T) {
    @Volatile
    private var value: T = initial

    private val subscribers = AtomicLong(0)

    public fun update(transform: (T) -> T) {
        while (true) {
            val old = value
            val new = transform(old)
            if (old == new) return
            // CAS 更新
            if (compareAndSet(old, new)) return
        }
    }
}
```

**启示**：`StateFlow` 通过 CAS 实现无锁更新，比 `Mutex` 更高效。

### 9.3 案例研究 3：`Channel` 的无锁缓冲

**问题**：多生产者-多消费者的无锁队列。

**实现**：基于"环形缓冲 + 原子索引"：

```kotlin
class BufferedChannel<T>(val capacity: Int) {
    private val buffer = AtomicReferenceArray<T?>(capacity)
    private val sendIndex = AtomicLong(0)
    private val receiveIndex = AtomicLong(0)

    suspend fun send(element: T) {
        while (true) {
            val idx = sendIndex.getAndIncrement()
            if (idx - receiveIndex.get() < capacity) {
                buffer.set(idx % capacity, element)
                return
            }
            // 缓冲满，挂起
            suspendSend(element, idx)
        }
    }
}
```

**启示**：无锁数据结构的关键是"分离索引"，发送与接收独立计数。

### 9.4 案例研究 4：`ConcurrentHashMap`

**问题**：高并发哈希表。

**实现**：分段锁（Segmented Locks）：

```kotlin
class ConcurrentHashMap<K, V>(initialCapacity: Int = 16) {
    private val segments = Array(initialCapacity) { Segment<K, V>() }

    fun get(key: K): V? {
        return segmentFor(key).get(key)
    }

    fun put(key: K, value: V) {
        segmentFor(key).put(key, value)
    }

    private fun segmentFor(key: K) = segments[(key.hashCode() and 0x7FFFFFFF) % segments.size]
}

class Segment<K, V> {
    private val map = mutableMapOf<K, V>()

    fun get(key: K) = synchronized(this) { map[key] }

    fun put(key: K, value: V) = synchronized(this) { map.put(key, value) }
}
```

**启示**：通过分片减少锁粒度，提升并发性能。

### 9.5 案例研究 5：Actor 模型在 Android 中的应用

**问题**：UI 状态管理，避免 `Mutex` 与复杂同步。

**实现**：

```kotlin
class UiActor<S>(initial: S) {
    private val channel = Channel<Action<S>>(Channel.UNLIMITED)
    private var state: S = initial

    init {
        GlobalScope.launch(Dispatchers.Main) {
            for (action in channel) {
                state = action.reduce(state)
                action.onComplete?.invoke(state)
            }
        }
    }

    fun dispatch(action: Action<S>) {
        channel.trySend(action)
    }
}

class Action<S>(val reduce: (S) -> S, val onComplete: ((S) -> Unit)? = null)
```

**启示**：Actor 模型将状态隔离，简化并发代码。

### 9.6 案例研究 6：无锁链表

**问题**：并发链表，支持插入与删除。

**实现**：基于 Harris 的无锁链表算法：

```kotlin
class LockFreeLinkedList<T> {
    private class Node<T>(val value: T, next: Node<T>? = null) {
        val next = atomic(next)
        @Volatile
        var marked = false  // 逻辑删除标记
    }

    private val head = atomic<Node<T>?>(null)

    fun add(value: T) {
        while (true) {
            val current = head.value
            val newNode = Node(value, current)
            if (head.compareAndSet(current, newNode)) return
        }
    }

    fun remove(value: T): Boolean {
        while (true) {
            var prev: Node<T>? = null
            var curr = head.value
            while (curr != null && curr.value != value) {
                prev = curr
                curr = curr.next.value
            }
            if (curr == null) return false

            // 标记删除
            val next = curr.next.value
            if (!curr.next.compareAndSet(next, next?.also { it?.marked = true })) continue
            // 物理删除
            if (prev == null) {
                if (head.compareAndSet(curr, next)) return true
            } else {
                if (prev.next.compareAndSet(curr, next)) return true
            }
        }
    }
}
```

**启示**：无锁链表通过"标记删除 + 物理删除"两阶段处理 ABA 问题。

### 9.7 案例研究 7：`AtomicReference` 在 Spring 中的应用

**问题**：Spring 的 `AtomicReference` 用于配置管理。

```kotlin
class SpringConfigManager {
    private val config = AtomicReference<Map<String, String>>(emptyMap())

    fun updateConfig(newConfig: Map<String, String>) {
        config.set(newConfig)
    }

    fun getConfig(): Map<String, String> = config.get()
}
```

**启示**：`AtomicReference` 适合"整体替换"的场景。

### 9.8 案例研究 8：`Semaphore` 在限流中的应用

**问题**：限制 API 调用并发数。

```kotlin
class ApiGateway(private val maxConcurrent: Int) {
    private val semaphore = kotlinx.coroutines.sync.Semaphore(maxConcurrent)

    suspend fun callApi(url: String): String {
        return semaphore.withPermit {
            // 限流内执行
            httpClient.get(url)
        }
    }
}
```

**启示**：`Semaphore` 是限流的最佳选择，比 `Mutex` 更灵活（允许多个许可）。

### 9.9 案例研究 9：`@Volatile` 在双重检查锁定中的应用

**问题**：延迟初始化，避免每次访问都加锁。

```kotlin
class LazyService {
    @Volatile
    private var instance: ExpensiveResource? = null

    fun getInstance(): ExpensiveResource {
        return instance ?: synchronized(this) {
            instance ?: ExpensiveResource().also { instance = it }
        }
    }
}
```

**启示**：`@Volatile` + `synchronized` 是延迟初始化的经典模式。

### 9.10 案例研究 10：`kotlinx-atomicfu` 在 KMP 中的应用

**问题**：跨平台原子操作。

```kotlin
// commonMain
import kotlinx.atomicfu.atomic

expect class AtomicCounter {
    fun increment()
    fun get(): Int
}

// commonMain 实现
class AtomicCounterImpl {
    private val count = atomic(0)

    fun increment() {
        count.incrementAndGet()
    }

    fun get() = count.value
}
```

**启示**：`kotlinx-atomicfu` 是 KMP 项目首选的并发原语。

---

## 10. 习题

### 10.1 基础题

**习题 1**：什么是数据竞争？请给出形式化定义。

**答案**：数据竞争是两个或多个线程并发访问同一变量，至少一个是写操作，且它们之间没有 happens-before 关系。形式化：

$$
\text{DataRace}(t_1, t_2, x) \iff t_1 \neq t_2 \land x \in S \land (\text{write}(t_1, x) \lor \text{write}(t_2, x)) \land \neg \text{HB}(t_1, t_2) \land \neg \text{HB}(t_2, t_1)
$$

**习题 2**：`@Volatile` 能否解决 `count++` 的线程安全问题？为什么？

**答案**：不能。`@Volatile` 保证可见性，但不保证原子性。`count++` 是"读-改-写"三步，可能被打断。应该使用 `AtomicInteger.incrementAndGet()`。

### 10.2 型变题

**习题 3**：以下代码是否线程安全？为什么？

```kotlin
class Cache {
    private val map = ConcurrentHashMap<String, String>()

    fun putIfAbsent(key: String, value: String): String? {
        val existing = map[key]
        if (existing == null) {
            map[key] = value
        }
        return existing
    }
}
```

**答案**：不安全。`check-then-act`（`if (existing == null) map[key] = value`）不是原子的。应该使用 `ConcurrentHashMap.putIfAbsent(key, value)`。

### 10.3 星投影题

**习题 4**：实现一个线程安全的 `Lazy<T>`，要求：

1. 只初始化一次。
2. 多线程访问安全。
3. 性能优化（避免每次访问都加锁）。

**答案**：

```kotlin
class ThreadSafeLazy<T>(private val initializer: () -> T) : Lazy<T> {
    @Volatile
    private var _value: T? = null
    private var initialized = false
    private val lock = Any()

    override val value: T
        get() {
            if (initialized) return _value!!
            synchronized(lock) {
                if (initialized) return _value!!
                _value = initializer()
                initialized = true
                return _value!!
            }
        }

    override fun isInitialized() = initialized
}
```

### 10.4 reified 题

**习题 5**：实现一个线程安全的单例，要求：

1. 延迟初始化。
2. 多线程访问安全。
3. 不使用 `synchronized`。

**答案**：

```kotlin
class Singleton private constructor() {
    companion object {
        val instance: Singleton by lazy { Singleton() }
    }
}
```

`lazy` 默认使用 `LazyThreadSafetyMode.SYNCHRONIZED`，内部通过 DCL + `@Volatile` 实现。

### 10.5 综合题

**习题 6**：以下代码是否有数据竞争？如何修复？

```kotlin
class Counter {
    private var count = 0

    suspend fun increment() {
        count++
    }

    fun get() = count
}
```

**答案**：有数据竞争。多个协程并发调用 `increment()` 时，`count++` 不是原子的。

**修复 1**：使用 `Mutex`：

```kotlin
private val mutex = Mutex()

suspend fun increment() {
    mutex.withLock { count++ }
}
```

**修复 2**：使用 `AtomicInteger`：

```kotlin
private val count = AtomicInteger(0)

fun increment() {
    count.incrementAndGet()
}
```

**修复 3**：使用 `StateFlow`：

```kotlin
private val _count = MutableStateFlow(0)

fun increment() {
    _count.update { it + 1 }
}
```

### 10.7 设计题

**习题 7**：设计一个线程安全的对象池，要求：

1. 预分配 N 个对象。
2. 借出与归还操作线程安全。
3. 池耗尽时阻塞等待。

**答案**：

```kotlin
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.*

class ObjectPool<T>(private val factory: () -> T, initialSize: Int) {
    private val pool = Channel<T>(initialSize)

    init {
        repeat(initialSize) {
            pool.trySend(factory())
        }
    }

    suspend fun borrow(): T = pool.receive()

    suspend fun returnObject(obj: T) = pool.send(obj)
}

// 使用
val pool = ObjectPool({ DBConnection() }, 10)
val conn = pool.borrow()
try {
    conn.query("SELECT ...")
} finally {
    pool.returnObject(conn)
}
```

### 10.8 分析题

**习题 8**：分析以下代码的并发问题：

```kotlin
class BankAccount {
    private var balance = 0
    private val mutex = Mutex()

    suspend fun transfer(to: BankAccount, amount: Int) {
        mutex.withLock {
            to.mutex.withLock {
                balance -= amount
                to.balance += amount
            }
        }
    }
}
```

**答案**：存在死锁风险。如果 A 转账给 B，B 同时转账给 A，可能发生：

```
A: lock(A) → waiting for B
B: lock(B) → waiting for A
```

**修复**：统一锁顺序（按账户 ID 排序）：

```kotlin
suspend fun transfer(to: BankAccount, amount: Int) {
    val (first, second) = if (this.id < to.id) this to to else to to this
    first.mutex.withLock {
        second.mutex.withLock {
            // 转账
        }
    }
}
```

### 10.9 优化题

**习题 9**：以下代码性能问题在哪？如何优化？

```kotlin
class Counter {
    private val mutex = Mutex()
    private var count = 0

    suspend fun increment() {
        mutex.withLock { count++ }
    }

    suspend fun get(): Int = mutex.withLock { count }
}
```

**答案**：`get()` 使用锁影响性能。可以：

1. 使用 `AtomicInteger`：`count.incrementAndGet()`、`count.get()`。
2. 使用 `@Volatile`（仅读，但 `count++` 仍需锁）。
3. 使用 `StateFlow`：`_count.value`。

### 10.10 综合应用题

**习题 10**：设计一个并发任务执行器，要求：

1. 支持提交 `suspend () -> T` 任务。
2. 限制最大并发数。
3. 任务超时自动取消。
4. 结果通过回调返回。

**答案**：

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit

class ConcurrentExecutor(
    private val maxConcurrent: Int,
    private val timeoutMs: Long = 30_000
) {
    private val semaphore = Semaphore(maxConcurrent)
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    fun <T> submit(
        task: suspend () -> T,
        onSuccess: (T) -> Unit,
        onError: (Throwable) -> Unit
    ) {
        scope.launch {
            try {
                val result = withTimeout(timeoutMs) {
                    semaphore.withPermit { task() }
                }
                onSuccess(result)
            } catch (e: Exception) {
                onError(e)
            }
        }
    }

    fun shutdown() {
        scope.cancel()
    }
}
```

---

## 11. 参考文献

### 11.1 学术论文

1. **Hoare, C. A. R. (1978)**. "Communicating sequential processes". *Communications of the ACM*, 21(8), 666-677. CSP 模型，Channel 的理论基础。
2. **Hewitt, C., Bishop, P., & Steiger, R. (1973)**. "A universal modular actor formalism for artificial intelligence". *IJCAI*. Actor 模型。
3. **Herlihy, M. (1991)**. "Wait-free synchronization". *ACM TOPLAS*, 13(1), 124-149. 无锁数据结构基础。
4. **Michael, M. M., & Scott, M. L. (1996)**. "Simple, fast, and practical non-blocking and blocking concurrent queue algorithms". *PODC*. Michael-Scott 队列。
5. **Harris, D. C. (2001)**. "A pragmatic implementation of non-blocking linked-lists". *DISC*. 无锁链表。
6. **Lea, D. (2000)**. "A Java fork/join framework". *Java Grande*. Fork/Join 框架。
7. **Pugh, W. (2004)**. "The Java memory model is fatally flawed". *Concurrency and Practice*. JMM 问题分析。
8. **Manson, J., Pugh, W., & Adve, S. V. (2005)**. "The Java memory model". *POPL*. JSR-133 JMM 正式定义。

### 11.2 官方文档

9. **Kotlin Coroutines Documentation**. https://kotlinlang.org/docs/coroutines-overview.html
10. **kotlinx.coroutines GitHub**. https://github.com/Kotlin/kotlinx.coroutines
11. **kotlinx.atomicfu**. https://github.com/Kotlin/kotlinx.atomicfu
12. **Java Concurrency Tutorial**. https://docs.oracle.com/javase/tutorial/essential/concurrency/
13. **JSR-133: Java Memory Model and Thread Specification**. https://jcp.org/en/jsr/detail?id=133

### 11.3 经典教材

14. **Lea, D. (1999)**. *Concurrent Programming in Java: Design Principles and Patterns* (2nd ed.). Addison-Wesley. Java 并发编程圣经。
15. **Goetz, B., Peierls, T., Bloch, J., Bowbeer, J., Holmes, D., & Lea, D. (2006)**. *Java Concurrency in Practice*. Addison-Wesley. JCIP，必读经典。
16. **Herlihy, M., & Shavit, N. (2012)**. *The Art of Multiprocessor Programming*. MIT Press. 多核编程艺术。
17. **Tanenbaum, A. S., & Bos, H. (2014)**. *Modern Operating Systems* (4th ed.). Pearson. 现代操作系统。
18. **Silberschatz, A., Galvin, P. B., & Gagne, G. (2018)**. *Operating System Concepts* (10th ed.). Wiley. 操作系统概念。

### 11.4 在线资源

19. **KotlinConf talks on coroutines**. https://www.youtube.com/results?search_query=kotlinconf+coroutines
20. **Roman Elizarov's blog**. https://medium.com/@elizarov
21. **"Kotlin Coroutines — A Comprehensive Guide"**. https://github.com/Kotlin/kotlinx.coroutines/blob/master/docs/topics.md
22. **"Structured Concurrency"** by Roman Elizarov. https://medium.com/@elizarov/structured-concurrency-7c307c84d76b

---

## 12. 延伸阅读

### 12.1 高级并发理论

- **Linearizability**：Maurice Herlihy 与 Jeannette Wing 提出的并发对象正确性条件。
- **Sequential Consistency**：Leslie Lamport 提出的内存模型一致性。
- **Memory Consistency Models**：从 SC 到 TSO、PSO、Relaxed Memory Models。
- **Cache Coherence Protocols**：MESI、MOESI 协议。
- **Transaction Memory**：硬件事务内存（HTM）与软件事务内存（STM）。

### 12.2 Kotlin 并发的演进

- **Kotlin 2.0 Native Memory Model**：从严格隔离到松散共享的演进。
- **Coroutine Flow 的并发原语**：`Flow` 的并发操作符（`flatMapMerge`、`conflate`）。
- **KMP 并发一致性**：跨平台并发原语的设计挑战。

### 12.3 语言对比

- **Go**：Goroutine + Channel，原生支持 CSP 模型。
- **Rust**：所有权 + Send/Sync trait，编译期拒绝数据竞争。
- **Swift**：async/await + Actor，Apple 推崇的并发模型。
- **Scala**：Future + Cats Effect IO，函数式并发。
- **Erlang/Elixir**：Actor 模型的标杆。

### 12.4 工程实践深入

- **JUC（java.util.concurrent）源码**：`AQS`、`ConcurrentHashMap`、`ThreadPoolExecutor`。
- **Disruptor**：LMAX 的高性能无锁队列。
- **Akka**：Scala 的 Actor 框架。
- **Project Loom**：Java 的虚拟线程（Virtual Thread）。

### 12.5 形式化验证

- **TLA+**：Leslie Lamport 的形式化规约语言，用于验证并发算法。
- **Coq/Lean**：定理证明，用于证明无锁算法的正确性。
- **Spin/JPF**：模型检测，用于发现并发 bug。

### 12.6 未来方向

- **Async Rust**：Rust 的 async/await，零成本异步。
- **Coroutine-related proposals for C++**：C++20 协程。
- **Kotlin Continuations**：协程的 Continuation 机制深入。
- **Quasar/Pulsar**：Java 的协程库（轻量级线程）。

---

## 附录 A：并发原语速查表

| 原语 | 阻塞方式 | 跨平台 | 适用场景 | 性能 |
| --- | --- | --- | --- | --- |
| `synchronized` | 阻塞线程 | JVM only | 简单同步 | 中 |
| `Mutex` | 挂起协程 | JVM/JS/Native | 协程同步 | 中 |
| `AtomicInteger` | 无阻塞 | JVM only | 单变量原子 | 高 |
| `AtomicReference` | 无阻塞 | JVM only | 对象引用原子 | 高 |
| `kotlinx.atomicfu` | 无阻塞 | JVM/JS/Native | KMP 原子操作 | 高 |
| `@Volatile` | 无阻塞 | JVM/JS/Native | 可见性保证 | 高 |
| `Channel` | 挂起协程 | JVM/JS/Native | 协程通信 | 中 |
| `StateFlow` | 无阻塞 | JVM/JS/Native | 状态管理 | 高 |
| `Semaphore` | 挂起协程 | JVM/JS/Native | 并发限制 | 中 |

## 附录 B：happens-before 关系速查表

| 操作 A | 操作 B | HB 关系 |
| --- | --- | --- |
| `Thread.start()` | 新线程任意操作 | 是 |
| 线程最后一个操作 | `Thread.join()` 返回 | 是 |
| `synchronized` 块结束 | 后续 `synchronized` 块开始（同一锁） | 是 |
| `volatile` 字段写 | 后续 `volatile` 字段读 | 是 |
| `final` 字段构造完成 | 任意线程读该字段 | 是 |
| 协程挂起前的操作 | 协程恢复后的操作 | 是 |
| `Channel.send` 完成 | `Channel.receive` 开始 | 是 |
| `StateFlow.value =` | `StateFlow.collect` 收到 | 是 |

## 附录 C：常见错误代码与修复

| 错误代码 | 问题 | 修复 |
| --- | --- | --- |
| `count++` | 非原子 | `AtomicInteger.incrementAndGet()` |
| `synchronized(lock) { delay() }` | 阻塞线程 | `mutex.withLock { delay() }` |
| `mutex.lock(); ...; mutex.unlock()` | 异常时锁泄漏 | `mutex.withLock { ... }` |
| `@Volatile var flag` + `flag = !flag` | 复合操作非原子 | `AtomicBoolean.compareAndSet` |
| `GlobalScope.launch` | 无生命周期管理 | `coroutineScope { launch { } }` |
| `runBlocking { }` in coroutine | 阻塞线程 | 直接 `suspend` |
| `var mutableList = mutableListOf()` 共享 | 多线程修改 | `CopyOnWriteArrayList` 或 `Mutex` |

## 附录 D：性能对比

| 原语 | 100 万次操作耗时（ms） | 备注 |
| --- | --- | --- |
| `i++` | 5 | 非线程安全 |
| `AtomicInteger.incrementAndGet` | 80 | 无锁 |
| `synchronized(this) { i++ }` | 200 | 锁开销 |
| `Mutex.withLock { i++ }` | 300 | 协程挂起开销 |
| `var i = 0; copy` | 10 | 不可变 |

## 附录 E：调试技巧

1. **`-ea` 启用断言**：JVM 启用断言，检测 `Mutex` 的所有权错误。
2. **`kotlinx.coroutines.debug`**：开启调试模式，输出协程调用栈。
3. **Thread Dump**：使用 `jstack` 或 `kill -3` 捕获线程死锁。
4. **`@Volatile` 可视化**：使用 JMH（Java Microbenchmark Harness）测试可见性。
5. **`AtomicReference.toString()`**：调试时查看原子引用的当前值。
6. **`Mutex.isLocked`**：检查锁状态（注意：仅用于调试，不用于逻辑）。
7. **`Channel.isClosedForSend`**：检查 Channel 是否已关闭。
8. **`StateFlow.value`**：调试时查看当前状态值。

---

*本文档最后更新于 2026-07-21，对标 MIT 6.005、Stanford CS110、CMU 15-440 教学水准。*
