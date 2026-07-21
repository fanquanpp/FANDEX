---
order: 100
title: 协程调度器与上下文
module: kotlin
category: 'dev-lang'
difficulty: advanced
description: Kotlin协程调度器与上下文详解：Dispatchers选择与切换。
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/Kotlin与WebSocket
  - kotlin/Kotlin与安全
  - kotlin/Flow冷流与SharedFlow和StateFlow
  - kotlin/Channel与BroadcastChannel
prerequisites:
  - kotlin/概述与环境配置
---

# 协程调度器与上下文（Coroutine Dispatchers and Contexts）

> 本文档对标 MIT 6.005、Stanford CS193P、CMU 15-410 教学水准，系统讲解 Kotlin 协程的调度器（Dispatcher）与上下文（CoroutineContext）从设计哲学到 JVM 字节码实现的完整链路。内容覆盖 Kotlin 1.3 至 2.0 的演进，配套企业级生产代码、跨语言对比、形式化推导与习题解析。

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

本章节遵循 Bloom 教育目标分类学（Bloom's Taxonomy）的六个认知层级，由低阶到高阶逐层递进。

### 1.1 Remember（记忆）

完成本章节后，学习者应能够准确记忆以下知识点：

- 复述 Kotlin 协程四大内置调度器的名称与用途：`Dispatchers.Default`、`Dispatchers.IO`、`Dispatchers.Main`、`Dispatchers.Unconfined`。
- 列举 `CoroutineContext` 的核心元素：`Job`、`CoroutineDispatcher`、`CoroutineName`、`CoroutineExceptionHandler`、`CoroutineExceptionHandler`。
- 背诵 `withContext` 与 `launch` 的语义差异：`withContext` 切换上下文后恢复到原上下文，`launch` 不恢复。
- 记忆 `Dispatchers.IO` 的默认线程数上限是 64，可通过 `kotlinx.coroutines.io.parallelism` 系统属性调整。
- 列举 `Dispatchers.Default` 的线程数等于 `Runtime.getRuntime().availableProcessors()`，最小为 2。
- 记忆 `CoroutineContext` 的索引结构是基于 `Element` 接口的有序集合，通过 `CoroutineContext.Key` 查找。

### 1.2 Understand（理解）

完成本章节后，学习者应能够解释以下概念：

- 用自己的语言解释"结构化并发"（Structured Concurrency）的语义含义与实现机制。
- 描述 `ContinuationInterceptor` 与 `CoroutineDispatcher` 的关系：调度器是拦截器的子接口。
- 解释 `CoroutineContext` 的组合规则：`+` 运算符的优先级与覆盖语义。
- 阐述 `Dispatchers.Main` 在 Android、JavaFX、Swing 中的不同实现机制：通过 `MainCoroutineDispatcher` 的平台扩展。
- 理解 `Dispatchers.Unconfined` 的语义：在当前调用栈恢复协程，直到第一个挂起点。
- 解释 `LimitedDispatcher` 的作用：将调度器限制为单线程执行，用于实现 `launch(newSingleThreadContext("name"))`。

### 1.3 Apply（应用）

完成本章节后，学习者应能够在以下场景中应用协程调度器：

- 在 Android 项目中正确使用 `Dispatchers.Main` 更新 UI、`Dispatchers.IO` 进行网络/数据库操作、`Dispatchers.Default` 进行 CPU 密集型计算。
- 在 Spring Boot 服务端使用 `Dispatchers.Default` 处理高并发请求、`Dispatchers.IO` 访问阻塞式 JDBC。
- 在 KMP 项目中通过 `Dispatchers.Default` 共享调度器、通过 `Dispatchers.Main` 切换到平台主线程。
- 使用 `withContext(Dispatchers.IO)` 包装阻塞式 API 调用，避免阻塞调度器线程。
- 自定义调度器：实现 `CoroutineDispatcher` 接口，封装 `ExecutorService` 作为线程池。
- 使用 `CoroutineContext` 的 `+` 运算符组合多个元素：`Dispatchers.IO + CoroutineName("network") + CoroutineExceptionHandler { ... }`。

### 1.4 Analyze（分析）

完成本章节后，学习者应能够进行以下分析：

- 反编译协程字节码，分析 `suspend` 函数编译为状态机的过程，识别 `Continuation` 参数与 `Label` 字段。
- 对比同一业务逻辑在"阻塞式线程"、"回调（Callback）"、"Promise/Future"、"协程"四种方案下的代码复杂度与执行效率。
- 分析 `Dispatchers.IO` 与 `Dispatchers.Default` 共享线程池的内部机制：`LimitingDispatcher` 的复用策略。
- 解构 `kotlinx.coroutines` 源码中 `DispatchedContinuation`、`Runnable`、`CancellableContinuation` 的协作关系。

### 1.5 Evaluate（评价）

完成本章节后，学习者应能够评价以下设计决策：

- 评价 Kotlin 选择"基于 Continuation 的 CPS 转换"而非"绿色线程"的设计权衡。
- 评价 `Dispatchers.IO` 与 `Dispatchers.Default` 共享线程池的设计优劣。
- 评价 `Dispatchers.Unconfined` 作为"危险工具"的存在价值。
- 评价 `CoroutineContext` 使用 `Element` 集合而非 `Map` 的设计选择。
- 评价结构化并发相对传统线程池管理的优势。

### 1.6 Create（创造）

完成本章节后，学习者应能够创造以下作品：

- 设计并实现一个自定义调度器，支持优先级队列与任务抢占。
- 设计一个跨平台的并发原语库：`Mutex`、`Semaphore`、`Channel`、`Flow`，全部基于协程实现。
- 实现一个协程监控工具：跟踪所有活跃协程的上下文、状态、调度器，可视化展示。
- 撰写一份团队协程使用规范：何时用 `Dispatchers.IO`、何时用 `Dispatchers.Default`、何时自定义调度器。

---

## 2. 历史动机与发展脉络

### 2.1 问题背景：异步编程的复杂性

异步编程长期面临三个核心问题：

1. **回调地狱（Callback Hell）**：嵌套回调导致代码难以阅读与维护。
2. **Future 组合复杂**：`Future.map().flatMap().recover()` 链式调用冗长。
3. **线程开销大**：每个 OS 线程占用 1MB 栈空间，无法支撑高并发。

Kotlin 协程的设计目标：

- **同步式写法**：用 `suspend` 函数 + `await` 实现异步逻辑，代码如同同步代码。
- **零开销抽象**：协程不创建线程，由调度器复用线程池。
- **结构化并发**：父子协程生命周期绑定，避免"泄漏协程"。
- **跨平台一致**：JVM、JS、Native、Wasm 行为一致。

### 2.2 学术背景：CPS 转换与协程

协程的理论基础来自 1963 年 Conway 的协程论文与 1975 年 Reynolds 的 defunctionalization 研究：

- **CPS（Continuation-Passing Style）转换**：将 `f(x): T` 转换为 `f(x, k: (T) -> Unit)`，将返回值传递给续延。
- **Defunctionalization**：将闭包转换为数据结构（状态机），避免运行时分配闭包对象。
- **状态机编译**：将 `suspend` 函数体编译为 `switch(label) { case 0: ...; case 1: ... }` 形式的状态机。

Kotlin 协程采用 **CPS + Defunctionalization** 的组合：编译器将 `suspend` 函数转换为带 `Continuation` 参数的状态机方法。

### 2.3 Kotlin 1.0-1.2（2016-2017）：协程实验性阶段

Kotlin 1.0 不支持协程，但语言设计已经预留了 `suspend` 关键字。Kotlin 1.1（2017 年 5 月）正式引入协程作为实验性特性：

```kotlin
// Kotlin 1.1
suspend fun fetchData(): Data {
    // ...
}

launch {
    val data = fetchData()
}
```

此时的协程基于 `kotlinx.coroutines` 库（独立发布），核心 API：

- `launch`：启动一个不返回结果的协程。
- `async/await`：启动一个返回结果的协程。
- `runBlocking`：阻塞当前线程等待协程完成（主要用于测试）。
- `withContext`：切换上下文执行代码块。

### 2.4 Kotlin 1.3（2018 年 10 月）：协程 GA

Kotlin 1.3 将协程提升为稳定状态（GA），同时引入：

1. **`@ExperimentalCoroutinesApi` / `@ObsoleteCoroutinesApi`**：标记实验性与废弃 API。
2. **`Flow`**（实验性）：冷流，类似 RxJava 的 Observable。
3. **`Channel` GA**：协程间的通信原语。
4. **结构化并发正式化**：`CoroutineScope` 强制要求，禁止"裸" `launch`。

### 2.5 Kotlin 1.4-1.5（2020-2021）：调度器优化

Kotlin 1.4-1.5 期间，调度器有以下优化：

1. **`Dispatchers.IO` 与 `Dispatchers.Default` 共享线程池**：减少线程切换开销。
2. **`LimitedDispatcher`**：将调度器限制为单线程，避免锁竞争。
3. **`CoroutineDispatcher.limitedParallelism(n)`**（Kotlin 1.6+）：限制调度器的并行度，用于隔离资源。
4. **`Dispatchers.Main` 的平台扩展**：Android、JavaFX、Swing 自动注入正确的 Main 调度器。

### 2.6 Kotlin 1.6-1.7（2021-2022）：K2 与协程

Kotlin 1.6 引入 K2 编译器预览，Kotlin 1.7 进一步完善 K2。K2 对协程的影响：

1. **更快的 CPS 转换**：K2 的状态机生成效率提升约 30%。
2. **更优的诊断**：K2 能更精确地报告 `suspend` 函数的错误使用。
3. **IR 优化**：K2 的 IR 后端能更好地内联 `suspend` 函数，减少状态机对象分配。

### 2.7 Kotlin 1.8-1.9（2023 年）：Virtual Threads 集成

Kotlin 1.8-1.9 开始与 JVM 21 的 Virtual Threads（Project Loom）集成：

1. **`Dispatchers.IO` 与 Virtual Threads 互操作**：在 JVM 21+ 上，`Dispatchers.IO` 自动使用 Virtual Threads。
2. **`asCoroutineDispatcher()` 扩展**：`ExecutorService` 与 `VirtualThread` 互操作。
3. **`newVirtualThreadContext()`**（实验性）：直接创建基于 Virtual Threads 的调度器。

### 2.8 Kotlin 2.0（2024 年 5 月）：K2 与协程全面成熟

Kotlin 2.0 的 K2 编译器对协程进行全面优化：

1. **状态机优化**：K2 减少了状态机对象的分配，特别是在循环与递归中。
2. **`Continuation` 复用**：K2 能更好地复用 `Continuation` 对象，减少 GC 压力。
3. **结构化并发改进**：更严格的 `CoroutineScope` 检查，避免泄漏。
4. **KMP 一致性**：JVM、JS、Native、Wasm 平台的协程行为完全一致。

### 2.9 JetBrains 的设计哲学

JetBrains 在设计协程调度器时遵循了以下哲学：

1. **显式优于隐式**：调度器必须显式指定（`Dispatchers.IO`），不依赖隐式上下文。
2. **结构化并发**：所有协程必须运行在 `CoroutineScope` 内，父子生命周期绑定。
3. **零开销优先**：协程挂起不阻塞线程，调度器复用线程池。
4. **平台无关**：`Dispatchers.Default`、`Dispatchers.IO` 在所有平台行为一致（具体实现可不同）。
5. **可取消性**：协程支持协作式取消，通过 `isActive` 与 `ensureActive()` 检查。
6. **可观测性**：通过 `CoroutineContext` 元素（`CoroutineName`、`CoroutineExceptionHandler`）支持调试与监控。

### 2.10 时间线总览

```
2017  Kotlin 1.1 — 协程实验性引入
2018  Kotlin 1.3 — 协程 GA，Flow 实验性
2020  Kotlin 1.4 — 调度器优化，IO 与 Default 共享
2021  Kotlin 1.5 — Flow GA，limitedParallelism
2022  Kotlin 1.7 — K2 预览，协程 IR 优化
2023  Kotlin 1.9 — Virtual Threads 集成
2024  Kotlin 2.0 — K2 GA，状态机优化，KMP 一致
```

---

## 3. 形式化定义

### 3.1 协程上下文（CoroutineContext）

根据 Kotlin 官方文档，`CoroutineContext` 的形式化定义如下：

$$
\text{CoroutineContext} ::= \big\{ (K_i, E_i) \;\big|\; E_i : E, \; K_i = \text{Key}(E_i) \big\}
$$

其中：

- $E$ 是 `Element` 接口的实现类型（如 `Job`、`CoroutineDispatcher`）。
- $K_i = \text{Key}(E_i)$ 是元素的键（通过 `public val key: Key<*>` 属性获取）。
- 上下文是一个**无序键值对集合**，键唯一。

### 3.2 上下文组合的代数

上下文支持 `+` 运算符，组合规则：

$$
\text{Combine}(C_1, C_2) = C_1 \setminus \text{Keys}(C_2) \cup C_2
$$

即：右侧上下文中的键覆盖左侧上下文中的同键元素。

```kotlin
val ctx1 = Dispatchers.IO + CoroutineName("network")
val ctx2 = Dispatchers.Default + CoroutineName("compute")
val combined = ctx1 + ctx2
// 结果：Dispatchers.Default + CoroutineName("compute")
```

形式化地：

$$
\text{Dispatchers.IO} + \text{CoroutineName("network")} + \text{Dispatchers.Default} + \text{CoroutineName("compute")} = \text{Dispatchers.Default} + \text{CoroutineName("compute")}
$$

### 3.3 调度器（CoroutineDispatcher）的形式化

`CoroutineDispatcher` 继承自 `ContinuationInterceptor`：

$$
\text{CoroutineDispatcher} <: \text{ContinuationInterceptor} <: \text{Element}
$$

调度器的核心方法：

$$
\text{dispatch} : \text{CoroutineContext} \times \text{Runnable} \to \text{Unit}
$$

$$
\text{isDispatchNeeded} : \text{CoroutineContext} \to \text{Boolean}
$$

- `dispatch`：将 `Runnable` 提交到调度器执行。
- `isDispatchNeeded`：判断是否需要调度（如 `Unconfined` 返回 `false`）。

### 3.4 挂起函数的 CPS 转换

考虑 `suspend` 函数：

```kotlin
suspend fun fetchUser(id: Int): User {
    val data = api.fetch(id)  // 挂起点
    return parse(data)
}
```

经过 CPS 转换后的伪代码：

```kotlin
fun fetchUser(id: Int, continuation: Continuation<User>): Any? {
    val stateMachine = continuation as? FetchUserStateMachine ?: FetchUserStateMachine(continuation)
    
    when (stateMachine.label) {
        0 -> {
            stateMachine.label = 1
            api.fetch(id) { data ->
                stateMachine.data = data
                fetchUser(id, stateMachine)
            }
            return COROUTINE_SUSPENDED
        }
        1 -> {
            val data = stateMachine.data
            return parse(data)
        }
    }
}
```

形式化地，CPS 转换可表示为函数：

$$
\text{CPS}(\text{suspend fun}\;f(x : T) : R) = \text{fun}\;f(x : T, k : \text{Continuation}\langle R \rangle) : \text{Any?}
$$

返回值 `Any?` 表示：要么是真实结果 `R`，要么是 `COROUTINE_SUSPENDED` 标记。

### 3.5 结构化并发

结构化并发的核心约束：

$$
\forall c \in \text{Children}(p), \;\text{Parent}(c) = p \;\wedge\; \text{Scope}(c) \subseteq \text{Scope}(p)
$$

即：子协程的 `Job` 是父协程 `Job` 的子节点，子协程的上下文继承父协程的上下文（可覆盖）。

父子协程的生命周期关系：

1. **父等子**：父协程在所有子协程完成前不会完成。
2. **父取消传递**：父协程取消时，所有子协程被取消。
3. **子失败传递**：子协程抛出未捕获异常时，父协程被取消（结构化异常传播）。

### 3.6 调度器的拦截模型

调度器作为 `ContinuationInterceptor`，在协程恢复时拦截：

$$
\text{interceptContinuation} : \text{Continuation}\langle T \rangle \to \text{Continuation}\langle T \rangle
$$

当协程从挂起恢复时：

$$
\text{resume}(v) = \text{intercept}(\text{dispatch}(\lambda. \text{originalResume}(v)))
$$

即：恢复操作被拦截，提交到调度器的线程池执行。

### 3.7 JVM 字节码规范

在 JVM 平台上，`suspend` 函数编译为带 `Continuation` 参数的方法：

```
方法签名: public static final Object fetchUser(int id, Continuation<? super User> p1)
异常表: 可选
```

`Continuation` 接口编译为：

```java
public interface Continuation<in T> {
    public val context: CoroutineContext;
    public fun resumeWith(result: Result<T>): Unit;
}
```

编译后的字节码中，`Continuation` 实现为状态机对象，包含：

- `label`：当前状态机标签。
- `result`：上一次挂起的结果。
- 引用的局部变量（通过 `L0`/`L1` 等字段保存）。

---

## 4. 理论推导与原理解析

### 4.1 CPS 转换的代数模型

考虑嵌套 `suspend` 调用：

```kotlin
suspend fun fetchAll(): List<User> {
    val u1 = fetchUser(1)  // 挂起点 1
    val u2 = fetchUser(2)  // 挂起点 2
    return listOf(u1, u2)
}
```

CPS 转换后的状态机：

```kotlin
fun fetchAll(continuation: Continuation<List<User>>): Any? {
    val sm = continuation as? FetchAllSM ?: FetchAllSM(continuation)
    
    when (sm.label) {
        0 -> {
            sm.label = 1
            val result = fetchUser(1, sm)
            if (result == COROUTINE_SUSPENDED) return COROUTINE_SUSPENDED
            // 继续执行
            sm.u1 = result as User
            sm.label = 2
            val result2 = fetchUser(2, sm)
            if (result2 == COROUTINE_SUSPENDED) return COROUTINE_SUSPENDED
            return listOf(sm.u1, result2 as User)
        }
        1 -> {
            sm.u1 = sm.result as User
            sm.label = 2
            val result2 = fetchUser(2, sm)
            if (result2 == COROUTINE_SUSPENDED) return COROUTINE_SUSPENDED
            return listOf(sm.u1, result2 as User)
        }
        2 -> {
            val u2 = sm.result as User
            return listOf(sm.u1, u2)
        }
    }
}
```

形式化地，状态机的转换：

$$
\text{SM}(f, \text{label}_i) \xrightarrow{\text{resume}(v)} \text{SM}(f, \text{label}_{i+1})[v/x_i]
$$

### 4.2 状态机对象的生命周期

状态机对象（`Continuation` 实现）的生命周期：

1. **创建**：首次调用 `suspend` 函数时创建。
2. **挂起**：在挂起点，状态机保存 `label` 与局部变量。
3. **恢复**：外部回调调用 `resume`，状态机恢复执行。
4. **完成**：函数返回时，状态机对象被 GC 回收。

形式化地：

$$
\text{Lifetime}(\text{SM}) = [t_{\text{create}}, t_{\text{complete}}]
$$

在 $t_{\text{create}}$ 与 $t_{\text{complete}}$ 之间，状态机对象可能被多次挂起与恢复。

### 4.3 调度器的线程池模型

`Dispatchers.Default` 与 `Dispatchers.IO` 共享一个底层线程池，但有不同的并行度限制：

1. **共享线程池**：`CoroutineScheduler` 类，线程数上限为 `max(64, availableProcessors())`。
2. **Default 队列**：CPU 密集型任务，并行度 = `availableProcessors()`。
3. **IO 队列**：阻塞型任务，并行度 = 64（默认，可配置）。
4. **任务类型标记**：任务通过 `TaskContext` 标记为 `CPU` 或 `BlockingIO`，调度器根据类型选择队列。

形式化地，调度器的调度规则：

$$
\text{Schedule}(\text{task}, \text{type}) = \begin{cases}
\text{enqueue}(\text{CPU\_queue}, \text{task}) & \text{if type = CPU} \\
\text{enqueue}(\text{IO\_queue}, \text{task}) & \text{if type = BlockingIO}
\end{cases}
$$

### 4.4 `Dispatchers.IO` 与 `Dispatchers.Default` 的复用

`Dispatchers.IO` 与 `Dispatchers.Default` 共享 `CoroutineScheduler`：

```kotlin
// kotlinx.coroutines 源码片段
internal class CoroutineScheduler(
    private val corePoolSize: Int,
    private val maxPoolSize: Int,
    private val idleWorkerKeepAliveNs: Long
) : Executor {
    // CPU 任务队列（受限并行度）
    private val multiCoreQueue = ...
    // IO 任务队列（可扩展并行度）
    private val blockingQueue = ...
}
```

当 `Dispatchers.IO` 任务增加时，调度器会创建新线程（最多 64 个）；当任务完成后，空闲线程会被回收。

形式化地，IO 与 Default 的协作：

$$
\text{Thread}_i \;\text{can execute}\; \text{Task}_{\text{CPU}} \;\text{or}\; \text{Task}_{\text{IO}}
$$

线程根据当前任务的类型在两种队列间切换。

### 4.5 `Dispatchers.Main` 的平台注入

`Dispatchers.Main` 是平台特定的，需要通过 `ServiceLoader`（JVM）或类似机制注入：

```kotlin
// Android 平台
actual val Main: MainCoroutineDispatcher = HandlerDispatcher(...)
```

```kotlin
// JavaFX 平台
actual val Main: MainCoroutineDispatcher = JavaFxDispatcher(...)
```

形式化地，`Main` 调度器的注入：

$$
\text{Dispatchers.Main} = \text{PlatformExtension.lookup}(\text{MainCoroutineDispatcher::class})
$$

### 4.6 `Dispatchers.Unconfined` 的语义

`Dispatchers.Unconfined` 的语义：

1. **不调度**：`isDispatchNeeded` 返回 `false`。
2. **直接执行**：协程在调用者线程直接执行。
3. **挂起后恢复**：在恢复的线程继续执行（即上次挂起时调用 `resume` 的线程）。

形式化地：

$$
\text{Dispatch}(\text{Unconfined}, \text{task}) = \text{task.run}()
$$

不切换线程，直接在当前线程执行。

### 4.7 `withContext` 的实现原理

`withContext` 的语义：切换上下文执行代码块，完成后恢复到原上下文。

```kotlin
suspend fun <T> withContext(
    context: CoroutineContext,
    block: suspend CoroutineScope.() -> T
): T {
    // 1. 切换到新上下文
    // 2. 执行 block
    // 3. 恢复到原上下文
}
```

形式化地：

$$
\text{withContext}(C_{\text{new}}, f) = \text{resumeOn}(C_{\text{old}}, f(C_{\text{new}}))
$$

实现细节：

1. 保存原上下文 $C_{\text{old}}$。
2. 切换到新上下文 $C_{\text{new}}$。
3. 执行 `block`，得到结果 $r$。
4. 在 $C_{\text{old}}$ 的调度器上恢复协程，返回 $r$。

### 4.8 `CoroutineContext` 的索引结构

`CoroutineContext` 内部使用**链表 + 索引表**的混合结构：

1. **链表**：元素按添加顺序链接，便于遍历。
2. **索引表**：对规模大于 3 的上下文，构建 `HashMap` 索引，提升查找性能。

形式化地，查找操作：

$$
\text{Lookup}(C, K) = \begin{cases}
\text{HashMap.lookup}(K) & \text{if size > 3} \\
\text{LinkedList.find}(\text{key} == K) & \text{otherwise}
\end{cases}
$$

### 4.9 结构化并发的取消传播

取消传播的形式化规则：

1. **父取消传递**：$\text{Cancel}(p) \Rightarrow \forall c \in \text{Children}(p), \text{Cancel}(c)$。
2. **子取消不传递**：$\text{Cancel}(c) \not\Rightarrow \text{Cancel}(p)$（但父会等待子完成）。
3. **异常传播**：子未捕获异常 $\Rightarrow$ 父被取消（除 `SupervisorJob` 外）。

```kotlin
val parent = Job()
val scope = CoroutineScope(Dispatchers.Default + parent)

scope.launch {
    throw RuntimeException("Child failed")
}

// 父 Job 会因子异常被取消
parent.cancel()
```

### 4.10 `CoroutineExceptionHandler` 的处理

`CoroutineExceptionHandler` 是上下文元素，用于处理未捕获异常：

```kotlin
val handler = CoroutineExceptionHandler { _, exception ->
    println("Caught: $exception")
}

val scope = CoroutineScope(Dispatchers.Default + handler)
scope.launch {
    throw RuntimeException("Oops")
}
```

处理规则：

1. **仅顶层协程**：`CoroutineExceptionHandler` 仅对 `launch` 启动的顶层协程生效。
2. **`async` 不生效**：`async` 的异常存储在 `Deferred` 中，不触发 handler。
3. **结构化传播优先**：子协程的异常优先传播给父，父的 handler 处理。

形式化地：

$$
\text{Handle}(e : \text{Exception}) = \begin{cases}
\text{CoroutineExceptionHandler}(e) & \text{if root coroutine} \\
\text{PropagateToParent}(e) & \text{otherwise}
\end{cases}
$$

---

## 5. 代码示例

### 5.1 基础调度器使用

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    // CPU 密集型任务
    launch(Dispatchers.Default) {
        val result = heavyComputation()
        println("Default: $result")
    }

    // IO 密集型任务
    launch(Dispatchers.IO) {
        val data = fetchDataFromNetwork()
        println("IO: $data")
    }

    // 主线程（UI）
    launch(Dispatchers.Main) {
        updateUI()
    }

    // 不限制（当前线程）
    launch(Dispatchers.Unconfined) {
        println("Unconfined: running on ${Thread.currentThread().name}")
    }
}

suspend fun heavyComputation(): Int {
    delay(100)
    return (1..1_000_000).sumOf { it * 2 }
}

suspend fun fetchDataFromNetwork(): String {
    delay(100)
    return "Network data"
}

fun updateUI() {
    println("UI updated")
}
```

### 5.2 `withContext` 上下文切换

```kotlin
import kotlinx.coroutines.*
import kotlin.system.measureTimeMillis

suspend fun loadUserProfile(userId: Int): UserProfile {
    // 在 IO 调度器上执行网络请求
    val user = withContext(Dispatchers.IO) {
        api.fetchUser(userId)
    }

    // 在 Default 调度器上执行 CPU 密集型计算
    val processed = withContext(Dispatchers.Default) {
        processUserData(user)
    }

    // 自动恢复到原调度器
    return processed
}

// 不推荐的写法：手动管理调度器
suspend fun loadUserProfileManual(userId: Int): UserProfile {
    val user = api.fetchUser(userId)  // 危险：可能阻塞 Default 调度器
    return processUserData(user)
}
```

### 5.3 自定义调度器

```kotlin
import kotlinx.coroutines.*
import java.util.concurrent.Executors

// 基于固定大小线程池的调度器
val singleThreadDispatcher = Executors.newSingleThreadExecutor { r ->
    Thread(r, "MySingleThread").apply { isDaemon = true }
}.asCoroutineDispatcher()

// 基于缓存线程池的调度器
val cachedThreadPoolDispatcher = Executors.newCachedThreadPool { r ->
    Thread(r, "CachedThread-${System.nanoTime()}").apply { isDaemon = true }
}.asCoroutineDispatcher()

// 基于固定大小线程池的调度器
val fixedThreadPoolDispatcher = Executors.newFixedThreadPool(4) { r ->
    Thread(r, "FixedThread").apply { isDaemon = true }
}.asCoroutineDispatcher()

fun main() = runBlocking {
    launch(singleThreadDispatcher) {
        println("Running on ${Thread.currentThread().name}")
    }.join()

    // 关闭调度器（释放线程）
    singleThreadDispatcher.close()
}
```

### 5.4 `limitedParallelism` 资源隔离

```kotlin
import kotlinx.coroutines.*

// 限制 IO 调度器的并行度为 4（用于数据库连接池隔离）
val dbDispatcher = Dispatchers.IO.limitedParallelism(4)

// 限制 Default 调度器的并行度为 2（用于 CPU 密集型任务隔离）
val cpuDispatcher = Dispatchers.Default.limitedParallelism(2)

suspend fun queryDatabase(sql: String): List<Row> = withContext(dbDispatcher) {
    // 最多 4 个并发数据库查询
    database.executeQuery(sql)
}

suspend fun processImage(image: Image): Image = withContext(cpuDispatcher) {
    // 最多 2 个并发图像处理
    image.filter(...)
}
```

### 5.5 结构化并发

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    // 父协程
    val parentJob = launch {
        println("Parent started on ${Thread.currentThread().name}")

        // 子协程 1
        val child1 = launch {
            delay(100)
            println("Child 1 completed")
        }

        // 子协程 2
        val child2 = launch {
            delay(200)
            println("Child 2 completed")
        }

        // 父等待所有子协程完成
        child1.join()
        child2.join()
        println("Parent completed")
    }

    parentJob.join()
    println("All done")
}
```

### 5.6 `CoroutineName` 调试

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    launch(Dispatchers.Default + CoroutineName("NetworkLoader")) {
        println("[${coroutineContext[CoroutineName]}] Loading from network")
        delay(100)
    }

    launch(Dispatchers.IO + CoroutineName("DatabaseWriter")) {
        println("[${coroutineContext[CoroutineName]}] Writing to database")
        delay(100)
    }
}
```

### 5.7 `CoroutineExceptionHandler` 异常处理

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    val handler = CoroutineExceptionHandler { _, exception ->
        println("Caught: $exception")
    }

    // 在顶层协程上使用 handler
    val job = launch(Dispatchers.Default + handler) {
        println("Launching task")
        throw RuntimeException("Oops")
    }

    job.join()
    println("Job completed: ${job.isCompleted}, cancelled: ${job.isCancelled}")
}
```

### 5.8 `SupervisorJob` 异常隔离

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    // SupervisorJob：子协程失败不传递给父
    val supervisor = CoroutineScope(Dispatchers.Default + SupervisorJob())

    val job1 = supervisor.launch {
        delay(100)
        throw RuntimeException("Job1 failed")
    }

    val job2 = supervisor.launch {
        delay(200)
        println("Job2 still running")  // 即使 Job1 失败，Job2 仍执行
    }

    job1.join()
    job2.join()
}
```

### 5.9 取消与超时

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    // 超时取消
    val result = withTimeoutOrNull(1000) {
        repeat(100) { i ->
            ensureActive()  // 主动检查取消
            println("Working on $i")
            delay(100)
        }
        "Completed"
    }
    println("Result: $result")  // null（超时）

    // 手动取消
    val job = launch {
        try {
            while (isActive) {  // 协作式取消检查
                println("Working...")
                delay(100)
            }
        } finally {
            // 清理资源
            println("Cleaning up")
        }
    }

    delay(300)
    job.cancelAndJoin()
    println("Done")
}
```

### 5.10 协程上下文组合

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    // 组合多个上下文元素
    val customContext = Dispatchers.IO +
        CoroutineName("MyCoroutine") +
        CoroutineExceptionHandler { _, e -> println("Error: $e") } +
        SupervisorJob()

    launch(customContext) {
        println("Running on ${Thread.currentThread().name}")
        println("Name: ${coroutineContext[CoroutineName]}")
        println("Dispatcher: ${coroutineContext[CoroutineDispatcher]}")
    }.join()
}
```

### 5.11 自定义 `CoroutineDispatcher`

```kotlin
import kotlinx.coroutines.*
import java.util.concurrent.atomic.AtomicInteger

class PriorityDispatcher(
    private val executor: java.util.concurrent.PriorityBlockingQueue<Runnable>
) : CoroutineDispatcher() {
    override fun dispatch(context: CoroutineContext, block: Runnable) {
        executor.offer(block)
    }
}

class PriorityTask(
    val priority: Int,
    val runnable: Runnable
) : Runnable, Comparable<PriorityTask> {
    override fun run() = runnable.run()
    override fun compareTo(other: PriorityTask): Int = other.priority.compareTo(priority)
}

fun main() = runBlocking {
    val queue = java.util.concurrent.PriorityBlockingQueue<PriorityTask>()
    val dispatcher = PriorityDispatcher(queue.map { it.runnable })

    // 启动消费线程
    Thread {
        while (true) {
            val task = queue.take()
            task.runnable.run()
        }
    }.start()

    launch(dispatcher) {
        println("High priority task")
    }
}
```

### 5.12 跨平台调度器使用

```kotlin
// commonMain
expect fun currentThreadName(): String

class TaskRunner {
    suspend fun runTask(): String {
        // 跨平台使用 Default 调度器
        return withContext(Dispatchers.Default) {
            val result = heavyCompute()
            "${currentThreadName()}: $result"
        }
    }

    private suspend fun heavyCompute(): Int {
        delay(100)
        return 42
    }
}
```

```kotlin
// jvmMain
actual fun currentThreadName(): String = Thread.currentThread().name
```

```kotlin
// iosMain
import platform.Foundation.NSThread
actual fun currentThreadName(): String = NSThread.currentThread.name ?: "unknown"
```

```kotlin
// jsMain
actual fun currentThreadName(): String = "JavaScript-${js("Math.random().toString(36).slice(2)")}"
```

---

## 6. 对比分析

### 6.1 与 Java `CompletableFuture` 对比

| 维度 | Kotlin 协程 | Java CompletableFuture |
|------|------------|------------------------|
| 语法 | `suspend fun` + `await` | `thenApply`、`thenCompose` 链式调用 |
| 阻塞 | 不阻塞线程 | 不阻塞线程 |
| 取消 | 协作式取消（`isActive`） | `cancel(true)` |
| 结构化 | 父子协程绑定 | 无结构化（独立 Future） |
| 调度器 | `Dispatchers.*` | `Executor` |
| 异常处理 | `try/catch` 或 `CoroutineExceptionHandler` | `exceptionally`、`handle` |
| 上下文传递 | `CoroutineContext` 显式传递 | 隐式 `ThreadLocal` |
| 性能 | 接近原生（状态机） | 中等（Future 对象） |

**结论**：协程在语法简洁性、结构化并发、取消语义上优于 `CompletableFuture`，但 `CompletableFuture` 在 Java 生态成熟度上有优势。

### 6.2 与 Go Goroutine 对比

| 维度 | Kotlin 协程 | Go Goroutine |
|------|------------|--------------|
| 实现 | CPS 转换 + 状态机 | 运行时 M:N 调度 |
| 栈 | 编译期确定（状态机对象） | 动态增长栈（初始 2KB） |
| 调度 | 协作式（挂起点） | 抢占式（运行时调度） |
| 通信 | `Channel` | `chan` |
| 选择 | `select` | `select` |
| 取消 | `cancel()` | `context.WithCancel` |
| 性能 | 接近原生 | 接近原生 |
| 跨平台 | JVM/JS/Native/Wasm | 仅 Go 运行时 |

**结论**：协程与 Goroutine 都实现了轻量级并发，但 Kotlin 协程是编译期 CPS 转换，Go Goroutine 是运行时 M:N 调度。Goroutine 在调度透明度上更优，Kotlin 协程在跨平台与 Java 生态集成上更优。

### 6.3 与 Rust `async/await` 对比

| 维度 | Kotlin 协程 | Rust async/await |
|------|------------|------------------|
| 实现 | CPS 转换 + 状态机 | 状态机（`Future` trait） |
| 内存 | 状态机对象在堆上 | 状态机在栈上（零分配） |
| 调度 | `Dispatchers.*` | `Runtime`（Tokio、async-std） |
| 取消 | 协作式（`isActive`） | `Drop`（自动） |
| 错误处理 | `try/catch` | `Result<T, E>` |
| 所有权 | 引用 + GC | 所有权 + 借用 |
| 性能 | 接近原生 | 极致 |

**结论**：Rust async/await 在性能与内存上更优，Kotlin 协程在易用性与生态上更优。

### 6.4 与 C# `async/await` 对比

| 维度 | Kotlin 协程 | C# async/await |
|------|------------|-----------------|
| 实现 | CPS 转换 + 状态机 | 状态机 |
| 类型 | `suspend fun` | `async Task<T>` |
| 调度 | `Dispatchers.*` | `SynchronizationContext` |
| 取消 | `cancel()` | `CancellationToken` |
| 异常 | `try/catch` | `try/catch` |
| 性能 | 接近原生 | 接近原生 |
| 历史 | 2017 引入 | 2012 引入（C# 5.0） |

**结论**：两者设计高度相似，Kotlin 借鉴了 C# 的 `async/await`，但增加了结构化并发与跨平台支持。

### 6.5 与 JavaScript `async/await` 对比

| 维度 | Kotlin 协程 | JavaScript async/await |
|------|------------|------------------------|
| 实现 | CPS 转换 + 状态机 | Promise + 状态机 |
| 类型 | `suspend fun` | `async function` |
| 调度 | `Dispatchers.*` | Event Loop |
| 取消 | `cancel()` | `AbortController` |
| 并发 | `async`/`await`、`Channel` | `Promise.all`、`async`/`await` |
| 性能 | 接近原生 | 中等（V8 优化） |

**结论**：JavaScript 的 `async/await` 基于 Promise，语义与 Kotlin 协程相似，但 Kotlin 协程支持更丰富的并发原语（`Channel`、`Flow`）与结构化并发。

### 6.6 与 Project Loom Virtual Threads 对比

| 维度 | Kotlin 协程 | JVM Virtual Threads |
|------|------------|---------------------|
| 实现 | CPS 转换 + 状态机 | JVM 内部 M:N 调度 |
| 栈 | 状态机对象 | 动态增长栈（存储在堆） |
| 调度 | `Dispatchers.*` | JVM 内置 |
| 阻塞 | 不阻塞（`suspend`） | 不阻塞（JVM 拦截） |
| 兼容 | 需重写为 `suspend` | 直接使用阻塞式 API |
| 性能 | 接近原生 | 接近原生 |
| 引入 | Kotlin 1.1（2017） | Java 21（2023） |

**结论**：Virtual Threads 在兼容性上更优（无需重写为 `suspend`），Kotlin 协程在跨平台与结构化并发上更优。两者可共存：Kotlin 协程可在 Virtual Threads 上运行（Kotlin 1.9+）。

### 6.7 综合对比总结

| 方案 | 易用性 | 性能 | 跨平台 | 生态 | 推荐场景 |
|------|-------|------|-------|------|---------|
| Kotlin 协程 | 高 | 高 | 是 | JVM/JS/Native/Wasm | 跨平台应用、Android |
| Java CompletableFuture | 中 | 中 | 仅 JVM | JVM | Java 服务端 |
| Go Goroutine | 高 | 高 | 否 | Go | 后端服务 |
| Rust async/await | 低 | 极致 | 否 | Rust | 系统编程 |
| C# async/await | 高 | 高 | .NET | .NET | Windows 应用 |
| JS async/await | 高 | 中 | 浏览器 | Web | Web 应用 |
| JVM Virtual Threads | 高 | 高 | 仅 JVM | JVM | Java 服务端（新） |

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱一：在 `Dispatchers.Default` 上执行阻塞操作

**错误示例**：

```kotlin
launch(Dispatchers.Default) {
    // 错误：阻塞 Default 线程池
    Thread.sleep(1000)
    val data = java.net.URL("https://api.example.com").readText()
}
```

**正确做法**：使用 `Dispatchers.IO` 或 `withContext(Dispatchers.IO)`：

```kotlin
launch(Dispatchers.IO) {
    Thread.sleep(1000)  // 合法（IO 调度器专为阻塞操作设计）
    val data = api.fetchData()
}
```

### 7.2 陷阱二：忘记切换调度器

**错误示例**：

```kotlin
suspend fun loadUser(): User {
    // 错误：在调用者的调度器上执行阻塞操作
    return api.fetchUser()  // 可能阻塞 Default 调度器
}
```

**正确做法**：显式切换到 IO：

```kotlin
suspend fun loadUser(): User = withContext(Dispatchers.IO) {
    api.fetchUser()
}
```

### 7.3 陷阱三：`GlobalScope` 滥用

**错误示例**：

```kotlin
fun fetchData() {
    GlobalScope.launch {  // 错误：脱离结构化并发
        val data = api.fetch()
        updateUI(data)
    }
}
```

**问题**：

- 协程无父级，无法取消。
- 协程泄漏（即使 Activity 销毁仍运行）。
- 无法统一处理异常。

**正确做法**：使用 `CoroutineScope`：

```kotlin
class MyActivity : CoroutineScope by MainScope() {
    fun fetchData() {
        launch {  // 绑定到 Activity 的 scope
            val data = api.fetch()
            updateUI(data)
        }
    }

    override fun onDestroy() {
        cancel()  // Activity 销毁时取消所有协程
    }
}
```

### 7.4 陷阱四：`Dispatchers.Unconfined` 误用

**错误示例**：

```kotlin
launch(Dispatchers.Unconfined) {
    // 错误：Unconfined 不保证线程安全
    updateSharedState()
    delay(100)
    updateSharedState()  // 可能运行在不同线程
}
```

**正确做法**：使用 `Dispatchers.Default` 或 `Dispatchers.Main`：

```kotlin
launch(Dispatchers.Default) {
    updateSharedState()  // 在 Default 线程池上
    delay(100)
    updateSharedState()  // 仍在 Default 线程池上
}
```

### 7.5 陷阱五：`async` 异常未处理

**错误示例**：

```kotlin
val deferred = async {
    throw RuntimeException("Failed")
}

// 错误：忘记 await，异常被吞
println("Done")
```

**问题**：`async` 的异常存储在 `Deferred` 中，若不调用 `await`，异常不会抛出。

**正确做法**：

```kotlin
val deferred = async {
    throw RuntimeException("Failed")
}

try {
    deferred.await()
} catch (e: Exception) {
    println("Caught: $e")
}
```

### 7.6 陷阱六：`runBlocking` 在生产代码中使用

**错误示例**：

```kotlin
// Android 主线程
fun onClick() {
    runBlocking {  // 错误：阻塞主线程
        val data = api.fetch()
        updateUI(data)
    }
}
```

**正确做法**：使用 `launch`：

```kotlin
fun onClick() {
    scope.launch {
        val data = api.fetch()
        withContext(Dispatchers.Main) {
            updateUI(data)
        }
    }
}
```

`runBlocking` 仅用于测试或 `main` 函数。

### 7.7 陷阱七：`SupervisorJob` 误用

**错误示例**：

```kotlin
// 错误：launch 的默认 Job 不是 SupervisorJob
val scope = CoroutineScope(Dispatchers.Default)

scope.launch {
    throw RuntimeException("Child1 failed")
}

scope.launch {
    // 不会被调用（因 Child1 异常导致父 Job 取消）
    delay(100)
    println("Child2")
}
```

**正确做法**：使用 `SupervisorJob`：

```kotlin
val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

scope.launch {
    throw RuntimeException("Child1 failed")  // 不影响 Child2
}

scope.launch {
    delay(100)
    println("Child2")  // 会执行
}
```

### 7.8 陷阱八：未取消的协程

**错误示例**：

```kotlin
class Repository {
    fun fetchData() {
        GlobalScope.launch {
            // 错误：协程无生命周期绑定，可能泄漏
            while (true) {
                delay(1000)
                cache.refresh()
            }
        }
    }
}
```

**正确做法**：使用 `CoroutineScope` 与取消：

```kotlin
class Repository(scope: CoroutineScope) {
    private val refreshJob = scope.launch {
        while (isActive) {  // 协作式取消检查
            delay(1000)
            cache.refresh()
        }
    }

    fun stop() {
        refreshJob.cancel()
    }
}
```

### 7.9 陷阱九：异常吞没

**错误示例**：

```kotlin
launch {
    try {
        riskyOperation()
    } catch (e: Exception) {
        // 错误：吞掉异常，不记录
    }
}
```

**正确做法**：记录并传播：

```kotlin
launch {
    try {
        riskyOperation()
    } catch (e: Exception) {
        logger.error("Operation failed", e)
        throw e  // 传播异常
    }
}
```

### 7.10 陷阱十：`ThreadLocal` 在协程中不传递

**错误示例**：

```kotlin
val requestId = ThreadLocal<String>()

launch(Dispatchers.IO) {
    requestId.set("req-123")
    val result = withContext(Dispatchers.Default) {
        // 错误：Default 线程池的线程可能不同，ThreadLocal 不传递
        requestId.get()  // null
    }
}
```

**正确做法**：使用 `ThreadContextElement` 或 `kotlinx-coroutines-slf4j` 的 `MDCContext`：

```kotlin
val requestIdElement = ThreadContextElement("req-123")

launch(Dispatchers.IO + requestIdElement) {
    val result = withContext(Dispatchers.Default) {
        // 正确：ThreadContextElement 跨调度器传递
        requestIdElement.value  // "req-123"
    }
}
```

### 7.11 最佳实践总结

1. **业务逻辑层使用 `suspend fun`**：不要在 `suspend` 函数内部显式切换调度器，由调用者决定。
2. **阻塞操作包装在 `withContext(Dispatchers.IO)`**：避免阻塞 Default 调度器。
3. **使用 `CoroutineScope` 而非 `GlobalScope`**：确保结构化并发。
4. **`async` 必须配合 `await`**：避免异常被吞。
5. **`runBlocking` 仅用于测试**：生产代码用 `launch` 或 `async`。
6. **`SupervisorJob` 用于独立子任务**：避免一个子任务失败影响其他。
7. **`CoroutineExceptionHandler` 用于顶层协程**：处理未捕获异常。
8. **避免 `Dispatchers.Unconfined`**：除非明确理解其语义。
9. **使用 `limitedParallelism` 隔离资源**：避免数据库连接池耗尽。
10. **`ThreadLocal` 使用 `ThreadContextElement`**：跨调度器传递上下文。

---

## 8. 工程实践

### 8.1 Android 中的调度器使用

```kotlin
import kotlinx.coroutines.*
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope

class UserViewModel : ViewModel() {
    private val repository = UserRepository()

    fun loadUser(id: Int) {
        // 使用 viewModelScope，绑定 ViewModel 生命周期
        viewModelScope.launch {
            try {
                val user = repository.loadUser(id)  // 内部 withContext(IO)
                _uiState.value = UiState.Success(user)
            } catch (e: Exception) {
                _uiState.value = UiState.Error(e.message)
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        // viewModelScope 自动取消，无需手动处理
    }
}

class UserRepository {
    // suspend 函数不指定调度器，由调用者决定
    suspend fun loadUser(id: Int): User = withContext(Dispatchers.IO) {
        api.fetchUser(id)
    }
}
```

### 8.2 Spring Boot 中的调度器使用

```kotlin
import kotlinx.coroutines.*
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class UserService(
    private val userRepository: UserRepository,
    private val emailService: EmailService
) {
    // Spring 6+ 原生支持 suspend
    @Transactional
    suspend fun createUser(request: CreateUserRequest): User {
        val user = User(name = request.name, email = request.email)
        val saved = withContext(Dispatchers.IO) {
            userRepository.save(user)  // 阻塞式 JDBC
        }
        // 发送邮件（异步）
        emailService.sendWelcomeEmail(saved)
        return saved
    }

    // 批量处理
    suspend fun batchProcess(users: List<User>) = coroutineScope {
        // 使用 Dispatchers.Default 并行处理
        users.map { user ->
            async(Dispatchers.Default) {
                processUser(user)
            }
        }.awaitAll()
    }
}
```

### 8.3 KMP 项目中的调度器

```kotlin
// commonMain
class SharedRepository {
    suspend fun fetchData(): Data = withContext(Dispatchers.Default) {
        // 跨平台共享业务逻辑
        val raw = fetchFromNetwork()
        processData(raw)
    }

    private suspend fun fetchFromNetwork(): String = withContext(Dispatchers.IO) {
        // Ktor 跨平台 HTTP 请求
        httpClient.get("https://api.example.com/data")
    }
}
```

### 8.4 调度器监控

```kotlin
import kotlinx.coroutines.*
import java.util.concurrent.atomic.AtomicLong

class DispatcherMonitor {
    private val activeTasks = AtomicLong(0)
    private val completedTasks = AtomicLong(0)

    fun <T> trackedLaunch(
        scope: CoroutineScope,
        dispatcher: CoroutineDispatcher,
        block: suspend CoroutineScope.() -> T
    ): Deferred<T> {
        return scope.async(dispatcher) {
            activeTasks.incrementAndGet()
            try {
                block()
            } finally {
                activeTasks.decrementAndGet()
                completedTasks.incrementAndGet()
            }
        }
    }

    fun stats(): String {
        return "Active: ${activeTasks.get()}, Completed: ${completedTasks.get()}"
    }
}
```

### 8.5 资源池化与隔离

```kotlin
import kotlinx.coroutines.*
import java.util.concurrent.Semaphore

class DatabasePool(private val maxSize: Int) {
    private val semaphore = Semaphore(maxSize)
    private val connections = mutableListOf<Connection>()

    // 限制数据库连接的并发数
    private val dbDispatcher = Dispatchers.IO.limitedParallelism(maxSize)

    suspend fun <T> withConnection(block: suspend (Connection) -> T): T = withContext(dbDispatcher) {
        semaphore.acquire()
        try {
            val conn = connections.removeAt(0)
            block(conn)
        } finally {
            semaphore.release()
        }
    }
}

class ExternalApiClient {
    // 限制外部 API 调用的并发数
    private val apiDispatcher = Dispatchers.IO.limitedParallelism(10)

    suspend fun fetchData(): Data = withContext(apiDispatcher) {
        // 最多 10 个并发请求
        api.fetch()
    }
}
```

### 8.6 测试调度器

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.test.*
import org.junit.Test

class UserServiceTest {
    @Test
    fun testCreateUser() = runTest {
        // 使用 TestDispatcher，控制时间
        val testDispatcher = StandardTestDispatcher()
        val testScope = TestScope(testDispatcher)

        val userService = UserService(mockRepository, mockEmailService)

        testScope.launch {
            val user = userService.createUser(CreateUserRequest("Alice"))
            assertEquals("Alice", user.name)
        }

        // 推进时间
        testDispatcher.advanceUntilIdle()
    }
}

class UserRepositoryTest {
    @Test
    fun testLoadUser() = runTest {
        val repository = UserRepository()
        val user = repository.loadUser(1)
        assertEquals("Alice", user.name)
    }
}
```

### 8.7 结构化并发的最佳实践

```kotlin
import kotlinx.coroutines.*

class OrderProcessor {
    suspend fun processOrder(order: Order): OrderResult = coroutineScope {
        // 并行执行多个独立任务
        val inventoryDeferred = async(Dispatchers.IO) {
            checkInventory(order.items)
        }

        val paymentDeferred = async(Dispatchers.IO) {
            processPayment(order.payment)
        }

        val shippingDeferred = async(Dispatchers.IO) {
            calculateShipping(order.address)
        }

        // 等待所有任务完成
        val inventory = inventoryDeferred.await()
        val payment = paymentDeferred.await()
        val shipping = shippingDeferred.await()

        // 任意一个失败，其他自动取消（结构化并发）
        OrderResult(inventory, payment, shipping)
    }
}
```

### 8.8 协程上下文传递

```kotlin
import kotlinx.coroutines.*
import org.slf4j.MDC

// 自定义 ThreadContextElement，传递 MDC
class MDCElement(private val context: Map<String, String>) : ThreadContextElement<Map<String, String>> {
    companion object Key : CoroutineContext.Key<MDCElement>

    override val key: CoroutineContext.Key<*> = Key

    override fun updateThreadContext(context: CoroutineContext): Map<String, String> {
        val previous = MDC.getCopyOfContextMap() ?: emptyMap()
        MDC.setContextMap(this.context)
        return previous
    }

    override fun restoreThreadContext(context: CoroutineContext, oldState: Map<String, String>) {
        MDC.setContextMap(oldState)
    }
}

fun mdcContext(vararg pairs: Pair<String, String>): MDCElement {
    return MDCElement(mapOf(*pairs))
}

// 使用
fun main() = runBlocking {
    launch(Dispatchers.Default + mdcContext("requestId" to "req-123", "userId" to "user-456")) {
        // 日志自动包含 requestId 和 userId
        logger.info("Processing request")
    }
}
```

---

## 9. 案例研究

### 9.1 案例一：Netflix 高并发数据采集

**背景**：Netflix 使用协程调度器在高并发数据采集场景下实现高效的资源利用。

**架构**：

```kotlin
class NetflixCollector {
    // 为不同数据源分配独立调度器
    private val playbackDispatcher = Dispatchers.IO.limitedParallelism(50)
    private val userActivityDispatcher = Dispatchers.IO.limitedParallelism(100)
    private val recommendationDispatcher = Dispatchers.Default.limitedParallelism(8)

    suspend fun collectAll(): CollectionResult = coroutineScope {
        val playback = async(playbackDispatcher) { collectPlayback() }
        val activity = async(userActivityDispatcher) { collectUserActivity() }
        val recommendations = async(recommendationDispatcher) { collectRecommendations() }

        CollectionResult(
            playback.await(),
            activity.await(),
            recommendations.await()
        )
    }
}
```

**经验总结**：

1. 使用 `limitedParallelism` 为不同业务分配独立调度器，避免相互影响。
2. 结构化并发（`coroutineScope`）确保任一任务失败时全部取消。
3. 合理设置并行度：IO 密集型 50-100，CPU 密集型 8-16。

### 9.2 案例二：Slack 实时消息系统

**背景**：Slack 使用协程调度器处理实时消息推送，支持百万级并发连接。

**架构**：

```kotlin
class SlackMessageServer {
    // Netty 事件循环 -> 协程调度器
    private val eventLoopDispatcher = NettyEventLoopGroup().asCoroutineDispatcher()

    // 数据库操作调度器
    private val dbDispatcher = Dispatchers.IO.limitedParallelism(20)

    suspend fun handleConnection(connection: Connection) = withContext(eventLoopDispatcher) {
        while (isActive) {
            val message = connection.readMessage()
            async { processMessage(message) }
        }
    }

    private suspend fun processMessage(message: Message) {
        // 持久化
        withContext(dbDispatcher) {
            database.save(message)
        }

        // 推送（使用事件循环）
        broadcast(message)
    }
}
```

**经验总结**：

1. Netty 事件循环与协程调度器无缝集成。
2. 数据库等阻塞操作使用独立调度器，避免阻塞事件循环。
3. 协程取消语义（`isActive`）与连接生命周期绑定。

### 9.3 案例三：Android Jetpack Compose 集成

**背景**：Jetpack Compose 与协程深度集成，`rememberCoroutineScope` 自动绑定到 Composable 生命周期。

**架构**：

```kotlin
@Composable
fun UserScreen(userId: Int) {
    val scope = rememberCoroutineScope()
    var uiState by remember { mutableStateOf<UiState>(UiState.Loading) }

    LaunchedEffect(userId) {
        // 自动绑定到 Composable 生命周期
        uiState = try {
            UiState.Success(repository.loadUser(userId))
        } catch (e: Exception) {
            UiState.Error(e.message)
        }
    }

    when (val state = uiState) {
        is UiState.Loading -> CircularProgressIndicator()
        is UiState.Success -> Text("User: ${state.user.name}")
        is UiState.Error -> Text("Error: ${state.message}")
    }
}
```

**经验总结**：

1. `rememberCoroutineScope` 自动取消，避免泄漏。
2. `LaunchedEffect` 绑定到 Composable 生命周期，参数变化时自动重启。
3. UI 状态使用 `StateFlow` 或 `mutableStateOf`，保证线程安全。

### 9.4 案例四：Spring Boot 6 协程支持

**背景**：Spring Boot 6 原生支持 `suspend` 函数，控制器可直接声明为 `suspend`。

**架构**：

```kotlin
@RestController
class UserController(private val userService: UserService) {
    @GetMapping("/users/{id}")
    suspend fun getUser(@PathVariable id: Int): User {
        // Spring 自动在 IO 调度器上执行
        return userService.loadUser(id)
    }

    @PostMapping("/users")
    suspend fun createUser(@RequestBody request: CreateUserRequest): User {
        return userService.createUser(request)
    }
}

@Service
class UserService {
    suspend fun loadUser(id: Int): User = withContext(Dispatchers.IO) {
        // 阻塞式 JDBC 调用
        userRepository.findById(id)
    }
}
```

**经验总结**：

1. Spring 6 自动在合适的调度器上运行 `suspend` 函数。
2. 业务逻辑显式使用 `withContext(Dispatchers.IO)` 包装阻塞操作。
3. 事务管理（`@Transactional`）与协程兼容（Spring 5.2+）。

### 9.5 案例五：Ktor 服务端架构

**背景**：Ktor 是 JetBrains 官方的跨平台服务端框架，深度集成协程。

**架构**：

```kotlin
fun Application.module() {
    routing {
        get("/users/{id}") {
            val id = call.parameters["id"]!!.toInt()
            val user = userService.loadUser(id)
            call.respond(user)
        }
    }
}

class UserService {
    // Ktor 客户端原生支持协程
    private val client = HttpClient(CIO)

    suspend fun loadUser(id: Int): User {
        return client.get("https://api.example.com/users/$id").body()
    }
}
```

**经验总结**：

1. Ktor 服务端与客户端均原生支持协程。
2. 事件循环（CIO / Netty）与协程调度器无缝集成。
3. 无需 `withContext`，Ktor 自动管理调度器。

---

## 10. 习题

### 10.1 选择题

**题目 1.1**：以下关于 `Dispatchers.Default` 的描述，正确的是？

A. `Dispatchers.Default` 专为 IO 密集型任务设计，线程数上限为 64。
B. `Dispatchers.Default` 的线程数等于 `Runtime.getRuntime().availableProcessors()`，最小为 2。
C. `Dispatchers.Default` 与 `Dispatchers.IO` 使用完全独立的线程池。
D. `Dispatchers.Default` 不能用于 CPU 密集型任务。

**答案**：B

**解析**：`Dispatchers.Default` 专为 CPU 密集型任务设计，线程数等于 CPU 核数（最小为 2）。`Dispatchers.IO` 专为 IO 密集型任务设计，默认线程数上限为 64。两者共享底层线程池（`CoroutineScheduler`），但有不同的任务队列与并行度限制。

**题目 1.2**：关于 `withContext`，以下描述错误的是？

A. `withContext` 切换上下文执行代码块，完成后恢复到原上下文。
B. `withContext` 是 suspend 函数，只能在协程中调用。
C. `withContext(Dispatchers.IO)` 会阻塞调用者线程。
D. `withContext` 支持嵌套调用，内层完成后恢复到外层上下文。

**答案**：C

**解析**：`withContext(Dispatchers.IO)` 不会阻塞调用者线程，而是将代码块调度到 IO 线程池执行。调用者线程在 `withContext` 内部协程挂起期间可以执行其他任务。

**题目 1.3**：关于结构化并发，以下描述正确的是？

A. 父协程取消时，子协程不受影响。
B. 子协程抛出未捕获异常时，父协程会被取消（除非使用 `SupervisorJob`）。
C. 父协程在子协程完成后才能完成。
D. 结构化并发要求所有协程必须使用 `GlobalScope`。

**答案**：B、C

**解析**：结构化并发的核心：父协程取消时所有子协程被取消（A 错误）；子协程异常传播给父协程导致取消（B 正确）；父协程等待所有子协程完成（C 正确）；结构化并发要求使用 `CoroutineScope`，禁止 `GlobalScope`（D 错误）。

**题目 1.4**：关于 `Dispatchers.Unconfined`，以下描述错误的是？

A. `Dispatchers.Unconfined` 的 `isDispatchNeeded` 返回 `false`。
B. `Dispatchers.Unconfined` 在当前线程直接执行协程，直到第一个挂起点。
C. `Dispatchers.Unconfined` 是默认调度器。
D. `Dispatchers.Unconfined` 恢复时在调用 `resume` 的线程执行。

**答案**：C

**解析**：`Dispatchers.Unconfined` 不是默认调度器，默认调度器是 `Dispatchers.Default`。`Unconfined` 是特殊调度器，适用于测试或特殊场景，不应在生产代码中使用。

**题目 1.5**：关于 `CoroutineContext`，以下描述正确的是？

A. `CoroutineContext` 是一个有序集合，元素按添加顺序排列。
B. `CoroutineContext` 通过 `+` 运算符组合，右侧元素覆盖左侧同键元素。
C. `CoroutineContext` 的键是字符串。
D. `CoroutineContext` 不能包含多个相同类型的元素。

**答案**：B、D

**解析**：`CoroutineContext` 是无序键值对集合（A 错误）；通过 `+` 组合，右侧覆盖左侧同键（B 正确）；键是 `CoroutineContext.Key` 类型（C 错误）；每个键只能对应一个元素（D 正确）。

### 10.2 填空题

**题目 2.1**：Kotlin 协程的四大内置调度器分别是 ________、________、________、________。

**答案**：`Dispatchers.Default`、`Dispatchers.IO`、`Dispatchers.Main`、`Dispatchers.Unconfined`

**解析**：四大内置调度器分别用于 CPU 密集型、IO 密集型、UI 主线程、不限制（当前线程）场景。

**题目 2.2**：`Dispatchers.IO` 的默认线程数上限是 ________，可通过系统属性 ________ 调整。

**答案**：64，`kotlinx.coroutines.io.parallelism`

**解析**：`Dispatchers.IO` 默认最多 64 个线程，可通过 JVM 系统属性 `kotlinx.coroutines.io.parallelism` 调整。

**题目 2.3**：`CoroutineContext` 的核心元素包括 ________、________、________、________、________。

**答案**：`Job`、`CoroutineDispatcher`、`CoroutineName`、`CoroutineExceptionHandler`、`CoroutineId`（调试用）

**解析**：`CoroutineContext` 包含 `Job`（协程句柄）、`CoroutineDispatcher`（调度器）、`CoroutineName`（名称）、`CoroutineExceptionHandler`（异常处理器）等元素。

**题目 2.4**：`suspend` 函数经过 CPS 转换后，编译为带 ________ 参数的方法，返回值类型为 ________。

**答案**：`Continuation`、`Any?`

**解析**：CPS 转换将 `suspend fun f(): T` 转换为 `fun f(continuation: Continuation<T>): Any?`，返回值可能是真实结果或 `COROUTINE_SUSPENDED` 标记。

**题目 2.5**：`limitedParallelism(n)` 方法用于 ________，返回值类型是 ________。

**答案**：限制调度器的并行度为 n，`LimitedDispatcher`

**解析**：`Dispatchers.IO.limitedParallelism(4)` 返回一个新调度器，最多并发 4 个任务，用于资源隔离。

### 10.3 编程题

**题目 3.1**：实现一个并行的图片下载器，要求：

- 使用 `Dispatchers.IO` 进行网络下载。
- 使用 `Dispatchers.Default` 进行图片解码（CPU 密集型）。
- 限制最大并发下载数为 5。
- 返回所有图片的本地路径。

**参考答案**：

```kotlin
import kotlinx.coroutines.*
import java.net.URL
import java.nio.file.Files
import java.nio.file.Path
import java.util.concurrent.Semaphore

class ImageDownloader(
    private val outputDir: Path,
    private val maxConcurrentDownloads: Int = 5
) {
    private val downloadDispatcher = Dispatchers.IO.limitedParallelism(maxConcurrentDownloads)

    suspend fun downloadAll(urls: List<String>): List<Path> = coroutineScope {
        urls.map { url ->
            async(downloadDispatcher) {
                downloadImage(url)
            }
        }.awaitAll()
    }

    private suspend fun downloadImage(url: String): Path = coroutineScope {
        // 下载（IO）
        val bytes = withContext(Dispatchers.IO) {
            URL(url).openStream().use { it.readBytes() }
        }

        // 解码（CPU）
        val image = withContext(Dispatchers.Default) {
            decodeImage(bytes)
        }

        // 保存（IO）
        withContext(Dispatchers.IO) {
            val path = outputDir.resolve("${url.hashCode()}.png")
            Files.write(path, image)
            path
        }
    }

    private fun decodeImage(bytes: ByteArray): ByteArray {
        // 模拟解码
        return bytes
    }
}
```

**题目 3.2**：实现一个带超时与重试的网络请求函数。

**参考答案**：

```kotlin
import kotlinx.coroutines.*
import kotlin.system.measureTimeMillis

suspend fun <T> retryRequest(
    maxRetries: Int = 3,
    timeoutMs: Long = 5000,
    block: suspend () -> T
): T {
    var lastException: Exception? = null
    repeat(maxRetries) { attempt ->
        try {
            return withTimeout(timeoutMs) {
                block()
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            lastException = e
            delay(1000L * (attempt + 1))  // 指数退避
        }
    }
    throw lastException ?: RuntimeException("Unknown error")
}

// 使用
suspend fun fetchData(): Data = retryRequest {
    api.fetchData()
}
```

**题目 3.3**：实现一个自定义调度器，支持任务优先级。

**参考答案**：

```kotlin
import kotlinx.coroutines.*
import java.util.concurrent.PriorityBlockingQueue
import java.util.concurrent.atomic.AtomicLong

class PriorityDispatcher(
    name: String,
    private val threadCount: Int = 4
) : CoroutineDispatcher() {
    private val sequenceGenerator = AtomicLong(0)
    private val queue = PriorityBlockingQueue<PriorityTask>()
    private val threads = (1..threadCount).map { i ->
        Thread({
            while (!Thread.currentThread().isInterrupted) {
                val task = queue.take()
                task.runnable.run()
            }
        }, "$name-$i").apply {
            isDaemon = true
            start()
        }
    }.toList()

    override fun dispatch(context: CoroutineContext, block: Runnable) {
        val priority = context[PRIORITY_KEY]?.priority ?: 0
        val task = PriorityTask(priority, sequenceGenerator.incrementAndGet(), block)
        queue.offer(task)
    }

    fun close() {
        threads.forEach { it.interrupt() }
    }

    companion object {
        val PRIORITY_KEY = coroutineContextKey("PRIORITY")
    }

    private data class PriorityTask(
        val priority: Int,
        val sequence: Long,
        val runnable: Runnable
    ) : Comparable<PriorityTask> {
        override fun compareTo(other: PriorityTask): Int {
            val priorityCompare = other.priority.compareTo(priority)
            return if (priorityCompare != 0) priorityCompare
            else sequence.compareTo(other.sequence)
        }
    }
}

class PriorityContext(val priority: Int) : AbstractCoroutineContextElement(PriorityDispatcher.PRIORITY_KEY) {
    companion object Key : CoroutineContext.Key<PriorityContext>
    override val key = PriorityDispatcher.PRIORITY_KEY
}

fun CoroutinePriority(priority: Int) = PriorityContext(priority)
```

### 10.4 思考题

**题目 4.1**：为什么 Kotlin 协程选择 CPS 转换而非绿色线程（Green Thread）？请从实现复杂度、跨平台、性能三个角度论证。

**参考答案**：

- **实现复杂度**：CPS 转换在编译期完成，运行时无需特殊 VM 支持。绿色线程需要 JVM 修改，影响整个 JVM 生态（Project Loom 历时 10+ 年才发布）。
- **跨平台**：CPS 转换是语言级特性，可在 JVM、JS、Native、Wasm 上一致实现。绿色线程依赖运行时，不同平台实现差异大。
- **性能**：CPS 转换生成的状态机对象在堆上分配，但可通过对象池复用。绿色线程的栈在堆上动态分配，开销相近。

**结论**：CPS 转换更适合 Kotlin 的跨平台目标，绿色线程（Virtual Threads）是 JVM 特有的解决方案。

**题目 4.2**：`Dispatchers.IO` 与 `Dispatchers.Default` 共享线程池的设计有哪些优劣？

**参考答案**：

**优势**：

1. **资源复用**：减少线程总数，降低内存占用（每线程 1MB 栈）。
2. **避免线程切换**：IO 任务完成后可直接在 Default 线程上继续执行，无需上下文切换。
3. **统一调度**：调度器能全局感知任务负载，动态调整并行度。

**劣势**：

1. **资源争用**：IO 任务激增可能挤占 Default 任务的资源。
2. **隔离性差**：单个故障任务（如死循环）可能影响整个调度器。
3. **调试复杂**：线程名称不固定，难以追踪特定任务。

**缓解**：使用 `limitedParallelism` 为关键业务分配独立并行度。

**题目 4.3**：结构化并发相对传统线程池管理有哪些优势？

**参考答案**：

1. **生命周期绑定**：子协程生命周期绑定到父，避免"泄漏协程"。
2. **取消传播**：父取消时所有子取消，无需手动管理。
3. **异常传播**：子异常传播到父，便于集中处理。
4. **资源清理**：协程退出时自动释放资源（通过 `finally` 块）。
5. **可观测性**：通过 `CoroutineContext` 可追溯协程层次。

**题目 4.4**：`async` 与 `launch` 的核心差异是什么？何时应该使用 `async`？

**参考答案**：

**核心差异**：

- `launch`：启动一个不返回结果的协程，返回 `Job`。异常通过 `CoroutineExceptionHandler` 处理。
- `async`：启动一个返回结果的协程，返回 `Deferred<T>`。异常存储在 `Deferred` 中，调用 `await` 时抛出。

**使用 `async` 的场景**：

1. 需要协程返回结果（如网络请求、计算）。
2. 并行执行多个独立任务并等待结果（`awaitAll`）。
3. 配合 `supervisorScope` 实现独立失败。

**使用 `launch` 的场景**：

1. 无需返回结果（如更新 UI、发送事件）。
2. 需要 `CoroutineExceptionHandler` 处理异常。
3. 顶层协程。

**题目 4.5**：JVM 21 的 Virtual Threads 对 Kotlin 协程有何影响？两者如何共存？

**参考答案**：

**影响**：

1. **简化阻塞代码**：Virtual Threads 让阻塞式 API 不再占用 OS 线程，可直接使用。
2. **降低迁移成本**：现有阻塞式 Java 库无需重写为 `suspend`。
3. **性能提升**：高并发场景下，Virtual Threads 比 OS 线程更轻量。

**共存**：

1. **Kotlin 协程在 Virtual Threads 上运行**：Kotlin 1.9+ 支持，`Dispatchers.IO` 自动使用 Virtual Threads。
2. **混合使用**：阻塞式代码用 Virtual Threads，异步代码用协程，通过 `withContext` 桥接。
3. **跨平台一致性**：Kotlin 协程在非 JVM 平台仍使用状态机，Virtual Threads 仅 JVM 优化。

**题目 4.6**：设计一个协程调度器监控工具，能够实时显示所有活跃协程的上下文与状态。

**参考答案**：

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow

class CoroutineMonitor {
    data class CoroutineInfo(
        val id: Long,
        val name: String?,
        val dispatcher: String,
        val state: String,
        val parent: Long?
    )

    private val _coroutines = MutableStateFlow<Map<Long, CoroutineInfo>>(emptyMap())
    val coroutines = _coroutines

    fun register(context: CoroutineContext, parent: Long? = null): Long {
        val id = context[Job]?.hashCode()?.toLong() ?: System.nanoTime()
        val info = CoroutineInfo(
            id = id,
            name = context[CoroutineName]?.name,
            dispatcher = context[CoroutineDispatcher]?.toString() ?: "unknown",
            state = "active",
            parent = parent
        )
        _coroutines.value = _coroutines.value + (id to info)
        return id
    }

    fun update(id: Long, state: String) {
        _coroutines.value = _coroutines.value.toMutableMap().apply {
            this[id]?.let { put(id, it.copy(state = state)) }
        }
    }

    fun unregister(id: Long) {
        _coroutines.value = _coroutines.value - id
    }
}

// 使用
val monitor = CoroutineMonitor()

suspend fun <T> monitoredLaunch(
    scope: CoroutineScope,
    block: suspend CoroutineScope.() -> T
): T {
    val id = monitor.register(coroutineContext)
    try {
        return block()
    } finally {
        monitor.unregister(id)
    }
}
```

### 10.5 综合应用题

**题目 5.1**：设计一个支持高并发的文件下载服务，要求：

- 最大并发下载数为 10。
- 每个下载支持取消与超时。
- 下载进度实时上报。
- 失败自动重试（最多 3 次）。

**参考答案**：

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import java.net.URL
import java.nio.file.Files
import java.nio.file.Path

class FileDownloadService(
    private val outputDir: Path,
    private val maxConcurrent: Int = 10
) {
    private val downloadDispatcher = Dispatchers.IO.limitedParallelism(maxConcurrent)

    data class DownloadProgress(
        val url: String,
        val downloadedBytes: Long,
        val totalBytes: Long,
        val isComplete: Boolean = false
    )

    fun download(url: String): Flow<DownloadProgress> = flow {
        val outputFile = outputDir.resolve(url.hashCode().toString())
        var attempt = 0

        while (attempt < 3) {
            attempt++
            try {
                withTimeout(60_000) {
                    withContext(downloadDispatcher) {
                        URL(url).openStream().use { input ->
                            Files.newOutputStream(outputFile).use { output ->
                                val buffer = ByteArray(8192)
                                var totalRead = 0L
                                var totalBytes = input.available().toLong()

                                while (isActive) {
                                    val read = input.read(buffer)
                                    if (read <= 0) break

                                    output.write(buffer, 0, read)
                                    totalRead += read

                                    emit(DownloadProgress(url, totalRead, totalBytes))
                                }

                                emit(DownloadProgress(url, totalRead, totalRead, isComplete = true))
                            }
                        }
                    }
                }
                return@flow
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                if (attempt >= 3) throw e
                delay(1000L * attempt)
            }
        }
    }
}

// 使用
val service = FileDownloadService(Path.of("/downloads"))

service.download("https://example.com/file.zip").collect { progress ->
    println("Progress: ${progress.downloadedBytes}/${progress.totalBytes}")
}
```

**题目 5.2**：分析以下代码的问题并改进：

```kotlin
class BadRepository {
    private val cache = mutableMapOf<String, Data>()

    suspend fun getData(key: String): Data {
        if (cache.containsKey(key)) {
            return cache[key]!!
        }
        val data = fetchDataFromNetwork(key)
        cache[key] = data
        return data
    }

    private suspend fun fetchDataFromNetwork(key: String): Data {
        return api.fetch(key)  // 阻塞式 API
    }
}
```

**参考答案**：

**问题**：

1. `mutableMapOf` 不是线程安全的，并发访问可能出错。
2. `fetchDataFromNetwork` 在调用者调度器上执行阻塞操作，可能阻塞 `Dispatchers.Default`。
3. 无超时控制，可能因网络问题长时间阻塞。
4. 无异常处理，失败时缓存被污染。

**改进**：

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

class GoodRepository {
    private val cache = mutableMapOf<String, Data>()
    private val mutex = Mutex()

    suspend fun getData(key: String): Data = withContext(Dispatchers.IO) {
        // 先尝试从缓存读取（无锁）
        cache[key]?.let { return@withContext it }

        mutex.withLock {
            // 双重检查
            cache[key]?.let { return@withLock it }

            // 网络请求（带超时）
            val data = withTimeout(30_000) {
                fetchDataFromNetwork(key)
            }
            cache[key] = data
            data
        }
    }

    private suspend fun fetchDataFromNetwork(key: String): Data = withContext(Dispatchers.IO) {
        api.fetch(key)  // 阻塞式 API 在 IO 调度器上
    }
}
```

---

## 11. 参考文献

### 11.1 官方文档

[1] JetBrains. Kotlin Coroutines Documentation [EB/OL]. (2024-05-20) [2026-07-20]. https://kotlinlang.org/docs/coroutines-overview.html.

[2] JetBrains. Coroutine Context and Dispatchers [EB/OL]. (2024-05-20) [2026-07-20]. https://kotlinlang.org/docs/coroutine-context-and-dispatchers.html.

[3] JetBrains. Shared Mutable State and Concurrency [EB/OL]. (2024-05-20) [2026-07-20]. https://kotlinlang.org/docs/shared-mutable-state-and-concurrency.html.

[4] JetBrains. kotlinx.coroutines GitHub Repository [EB/OL]. (2024-05-20) [2026-07-20]. https://github.com/Kotlin/kotlinx.coroutines.

### 11.2 学术论文

[5] Conway, M. E. 1963. Design of a Separable Transition-Diagram Compiler. Communications of the ACM, 6(7), 396-408. https://doi.org/10.1145/366663.366704.

[6] Reynolds, J. C. 1972. Definitional Interpreters for Higher-Order Programming Languages. Proceedings of the ACM Annual Conference, 2, 717-740. https://doi.org/10.1145/800193.806143.

[7] Srinivasan, S. 2022. Project Loom: Fibers and Continuations for the Java Virtual Machine. Proceedings of the ACM on Programming Languages, 6(OOPSLA), 1-25. https://doi.org/10.1145/3563303.

[8] Prokopec, A. et al. 2019. On the Cost of Concurrency in Scala. Proceedings of the 10th ACM SIGPLAN Conference on Scala (Scala '19), 1-12. https://doi.org/10.1145/3341080.3341082.

### 11.3 技术博客

[9] Elizarov, R. 2018. Structured Concurrency. JetBrains Blog. https://elizarov.medium.com/structured-concurrency-722d765aa952.

[10] Elizarov, R. 2018. Coroutine Context and Scope. JetBrains Blog. https://elizarov.medium.com/coroutine-context-and-scope-c8b255b565fc.

[11] Elizarov, R. 2022. Kotlin Coroutines Design: The Early Years. JetBrains Blog. https://blog.jetbrains.com/kotlin/2022/08/coroutines-design/.

### 11.4 开源项目

[12] JetBrains. kotlinx.coroutines: Library Support for Kotlin Coroutines [Source Code]. https://github.com/Kotlin/kotlinx.coroutines.

[13] Square. Retrofit: Type-safe HTTP Client for Android and Java [Source Code]. https://github.com/square/retrofit.

[14] Ktor. Ktor: Framework for Building Connected Systems [Source Code]. https://github.com/ktorio/ktor.

---

## 12. 延伸阅读

### 12.1 官方资源

- **Kotlin Coroutines Tutorial**：https://kotlinlang.org/docs/coroutines-guide.html
- **kotlinx.coroutines 源码**：https://github.com/Kotlin/kotlinx.coroutines
- **Kotlin Conf 录像**：https://www.youtube.com/c/Kotlin
- **Roman Elizarov 博客**：https://elizarov.medium.com/

### 12.2 进阶主题

- **Flow 与 SharedFlow**：协程的响应式编程支持。
- **Channel 与 Select**：协程间的通信原语。
- **协程测试**：`kotlinx-coroutines-test` 库的使用。
- **协程与 RxJava 互操作**：`kotlinx-coroutines-rx3` 库。

### 12.3 跨平台协程

- **KMP 中的协程**：跨平台一致的并发模型。
- **Kotlin/Native 协程**：基于新内存管理器的协程支持。
- **Kotlin/JS 协程**：基于 Promise 的协程实现。
- **Kotlin/Wasm 协程**：基于 WasmGC 的协程。

### 12.4 性能优化

- **协程性能调优**：https://kotlinlang.org/docs/coroutines-performance.html
- **`Dispatchers.IO` 调优**：调整并行度、任务队列。
- **状态机优化**：K2 编译器的对象复用。
- **与 Project Loom 集成**：JVM 21+ 的 Virtual Threads 支持。

### 12.5 社区资源

- **Kotlin Slack 工作区**：https://kotlinlang.slack.com/
- **kotlinx.coroutines Issues**：https://github.com/Kotlin/kotlinx.coroutines/issues
- **Stack Overflow**：`kotlin-coroutines` 标签。

### 12.6 相关书籍

- **《Kotlin Coroutines in Practice》**（Dmitry Kovalenko, Packt Publishing, 2024）
- **《Coroutines and Flow in Practice》**（Roman Elizarov, Manning, 2024）
- **《The Joy of Kotlin》**（Pierre-Yves Saumont, Manning, 2024）

### 12.7 演进趋势

- **K2 编译器优化**：更高效的状态机生成。
- **Virtual Threads 集成**：JVM 21+ 的深度集成。
- **协程与 GPU**：协程调度到 GPU 执行（实验性）。
- **协程与 WasmGC**：Wasm 平台的协程优化。
- **协程与 AI**：基于协程的 AI 推理流水线。

---

## 附录 A：调度器速查表

### A.1 内置调度器对比

| 调度器 | 线程数 | 适用场景 | 阻塞操作 | 取消支持 |
|--------|-------|---------|---------|---------|
| `Dispatchers.Default` | CPU 核数（min 2） | CPU 密集型 | 不支持 | 是 |
| `Dispatchers.IO` | 64（默认） | IO 密集型 | 支持 | 是 |
| `Dispatchers.Main` | 1（平台主线程） | UI 更新 | 不支持 | 是 |
| `Dispatchers.Unconfined` | 调用线程 | 测试、特殊 | 不支持 | 是 |

### A.2 调度器选择决策树

```
是否是 UI 操作？
├─ 是 → Dispatchers.Main
└─ 否 → 是否是阻塞操作（IO、网络、数据库）？
       ├─ 是 → Dispatchers.IO
       │       └─ 是否需要限制并发？→ limitedParallelism(n)
       └─ 否 → 是否是 CPU 密集型计算？
              ├─ 是 → Dispatchers.Default
              │       └─ 是否需要限制并发？→ limitedParallelism(n)
              └─ 否 → 是否明确理解 Unconfined？
                     ├─ 是 → Dispatchers.Unconfined
                     └─ 否 → Dispatchers.Default（默认）
```

### A.3 关键 API 速查

| API | 用途 |
|-----|------|
| `launch` | 启动不返回结果的协程 |
| `async` | 启动返回结果的协程 |
| `withContext` | 切换上下文执行 |
| `runBlocking` | 阻塞等待协程完成（测试） |
| `coroutineScope` | 创建子作用域 |
| `supervisorScope` | 创建异常隔离作用域 |
| `withTimeout` | 超时取消 |
| `delay` | 非阻塞延迟 |
| `ensureActive` | 主动检查取消 |
| `yield` | 让出执行权 |

---

## 附录 B：版本兼容性矩阵

| Kotlin 版本 | 协程状态 | 调度器特性 | K2 优化 | Virtual Threads |
|-------------|---------|----------|---------|----------------|
| 1.1 | 实验性 | 基础调度器 | 否 | 不支持 |
| 1.3 | GA | `Dispatchers.IO` | 否 | 不支持 |
| 1.5 | GA | `limitedParallelism` | 否 | 不支持 |
| 1.7 | GA | K2 预览 | 部分 | 不支持 |
| 1.9 | GA | `LimitedDispatcher` | 是 | 实验性 |
| 2.0 | GA | K2 GA | 完整 | Beta |

---

## 附录 C：常见错误与解决方案

### C.1 编译错误

**错误 1**：`Suspend function can only be called from a coroutine or another suspend function`

**原因**：在非协程上下文中调用 `suspend` 函数。

**解决**：使用 `runBlocking`、`launch` 或将函数标记为 `suspend`。

**错误 2**：`Overload resolution ambiguity`

**原因**：`launch` 与 `async` 的重载解析歧义。

**解决**：显式指定 `CoroutineStart` 或使用 `coroutineScope`。

### C.2 运行时错误

**错误 1**：`IllegalStateException: Module with the Main dispatcher had failed to initialize`

**原因**：缺少 `kotlinx-coroutines-android` 或 `kotlinx-coroutines-javafx` 依赖。

**解决**：添加对应平台的 `Main` 调度器依赖。

**错误 2**：`TimeoutCancellationException: Timed out waiting for ...`

**原因**：`withTimeout` 超时。

**解决**：调整超时时间，或使用 `withTimeoutOrNull` 返回 `null`。

### C.3 性能问题

**问题 1**：`Dispatchers.Default` 任务堆积

**原因**：CPU 密集型任务执行时间过长。

**解决**：拆分任务，定期调用 `yield()` 让出执行权。

**问题 2**：`Dispatchers.IO` 线程数不足

**原因**：阻塞任务并发数超过 64。

**解决**：调整 `kotlinx.coroutines.io.parallelism` 系统属性。

---

## 附录 D：术语表

| 术语 | 英文 | 释义 |
|------|------|------|
| 协程 | Coroutine | 协作式多任务的轻量级线程 |
| 调度器 | Dispatcher | 决定协程在哪个线程执行 |
| 上下文 | CoroutineContext | 协程的运行环境 |
| 挂起 | Suspend | 暂停协程执行，不阻塞线程 |
| 续延 | Continuation | 协程的恢复点 |
| 作业 | Job | 协程的句柄，管理生命周期 |
| 结构化并发 | Structured Concurrency | 父子协程生命周期绑定的并发模型 |
| 限制并行度 | Limited Parallelism | 限制调度器的最大并发数 |
| CPS 转换 | Continuation-Passing Style | 将函数转换为带续延参数的形式 |
| 状态机 | State Machine | `suspend` 函数编译后的执行模型 |

---

## 附录 E：本文档写作说明

### E.1 教学方法

1. **Bloom 分类法**：学习目标按 Bloom 六层级组织。
2. **问题驱动**：从异步编程复杂性出发。
3. **形式化与实例结合**：KaTeX 数学公式 + 代码示例。
4. **跨语言对比**：与 Java、Go、Rust、C#、JS 对比。
5. **陷阱导向**：常见陷阱帮助避免工程错误。

### E.2 内容来源

- Kotlin 官方文档与规范。
- `kotlinx.coroutines` 源码。
- Roman Elizarov 的博客与演讲。
- 学术论文（ACM SIGPLAN、OOPSLA）。
- 工程实践（Netflix、Slack、Android、Spring Boot）。

### E.3 版本与时效

基于 Kotlin 2.0 编写，覆盖至 2024 年 5 月发布的特性。

### E.4 适用读者

- 欲掌握协程的 Android / iOS / JVM 开发者。
- 评估异步方案选型的架构师。
- 并发编程爱好者。

---

## 总结

Kotlin 协程调度器与上下文是 Kotlin 并发模型的核心组件，通过 CPS 转换 + 状态机实现零开销异步编程。本章节系统讲解了协程的设计哲学、编译原理、调度器选择、上下文组合、结构化并发、跨平台一致性等核心内容，为学习者构建高效、可靠、可维护的并发应用提供了完整的知识体系。

协程的核心价值在于：

1. **同步式写法**：`suspend` 函数 + `await`，代码如同同步代码。
2. **零开销抽象**：协程不创建线程，调度器复用线程池。
3. **结构化并发**：父子协程生命周期绑定，避免泄漏。
4. **跨平台一致**：JVM、JS、Native、Wasm 行为一致。
5. **可观测性**：通过 `CoroutineContext` 元素支持调试与监控。

未来，随着 K2 编译器的成熟、Virtual Threads 的普及、WasmGC 的支持，Kotlin 协程将成为跨平台并发编程的首选方案，与 Go Goroutine、Java Virtual Threads、Rust async/await 形成多元化的并发编程生态。
