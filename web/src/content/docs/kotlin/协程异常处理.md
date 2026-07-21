---
order: 107
title: 协程异常处理
module: kotlin
category: 'dev-lang'
difficulty: advanced
description: 'Kotlin 协程异常处理深度解析：CoroutineExceptionHandler、SupervisorJob、structured concurrency 异常传播机制的形式化定义、字节码实现与企业级工程实践。'
author: fanquanpp
updated: '2026-07-21'
related:
  - kotlin/扩展函数的编译原理
  - kotlin/作用域函数区别
  - kotlin/Kotlin跨平台
  - kotlin/协程调度器与上下文
  - kotlin/Flow冷流与SharedFlow和StateFlow
prerequisites:
  - kotlin/概述与环境配置
  - kotlin/协程调度器与上下文
---

# 协程异常处理（Coroutine Exception Handling）

> 本文档对标 MIT 6.005、Stanford CS193P、CMU 15-410 教学水准，系统讲解 Kotlin 协程异常处理机制从设计哲学到 JVM 字节码实现的完整链路。内容覆盖 Kotlin 1.3 至 2.0 的演进，包括结构化异常传播、Job 层级、SupervisorJob、CoroutineExceptionHandler、try/catch 限制等核心主题，配套企业级生产代码、跨语言对比、形式化推导与习题解析。

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

- 复述 Kotlin 协程异常处理的两大原则：异常默认会向上传播到父协程；`launch` 的异常无法被外层 `try/catch` 捕获。
- 列举结构化并发的核心 API：`Job`、`SupervisorJob`、`supervisorScope`、`coroutineScope`、`CoroutineExceptionHandler`。
- 背诵 `SupervisorJob` 与普通 `Job` 的语义差异：`SupervisorJob` 的子协程失败不会传播到父，也不会取消兄弟协程。
- 记忆 `CoroutineExceptionHandler` 是 `CoroutineContext` 的元素，仅对未捕获的异常生效，且仅对根协程（root coroutine）的 `launch` 生效。
- 列举 `async` 与 `launch` 的异常语义差异：`async` 的异常在 `await()` 时才被抛出，未 `await` 的 `async` 异常会被父协程处理。
- 复述取消异常（CancellationException）的特殊地位：它是协程取消的"正常信号"，不应被捕获并吞掉。
- 列举异常传播的三个层级：子协程 → 父协程 → 根协程 → `CoroutineExceptionHandler` → Thread.UncaughtExceptionHandler。

### 1.2 Understand（理解）

- 用自己的语言解释"结构化异常传播"（Structured Exception Propagation）的语义含义：协程的异常处理与协程层级结构绑定，而非调用栈。
- 解释为什么 `try { launch { throw } } catch (e) {}` 无法捕获异常：`launch` 是"fire-and-forget"，异常发生在另一个调用栈。
- 描述 `SupervisorJob` 的设计意图：用于"独立子任务"场景，如多个独立网络请求，一个失败不应影响其他。
- 阐述 `coroutineScope` 与 `supervisorScope` 的差异：前者任意子失败则全部取消，后者子失败相互隔离。
- 解释 `async` 的异常为何"延迟"到 `await`：`Deferred` 是"未来值的容器"，异常被封装在 `Deferred` 中。
- 理解取消语义：`CancellationException` 是协作式取消的信号，捕获它而不重新抛出会破坏结构化并发。
- 解释 `CoroutineExceptionHandler` 在 Android 中的"最后防线"角色：用于崩溃日志上报，不能用于恢复 UI。

### 1.3 Apply（应用）

- 在 ViewModel 中正确使用 `viewModelScope.launch` 配合 `try/catch` 包裹子协程，避免崩溃。
- 在并行的多个独立任务中使用 `supervisorScope`，确保一个失败不影响其他。
- 使用 `CoroutineExceptionHandler` 实现全局崩溃日志上报。
- 在 `async` 链中正确使用 `await`，并用 `try/catch` 捕获异常。
- 使用 `runCatching` 与 `Result` 类型替代 `try/catch`，实现函数式异常处理。
- 在 Spring Boot 服务端使用 `CoroutineExceptionHandler` 与 `ControllerAdvice` 集成。
- 自定义 `CoroutineContext` 元素，将 MDC（Mapped Diagnostic Context）与协程绑定，便于异常日志追踪。

### 1.4 Analyze（分析）

- 反编译协程字节码，分析 `Job.cancel()` 与 `Job.cancelAndJoin()` 的差异。
- 对比同一业务逻辑在"回调"、"Promise/Future"、"RxJava"、"协程"四种方案下的异常处理复杂度。
- 分析 `kotlinx.coroutines` 源码中 `ChildHandleNode`、`ParentJob`、`ChildJob` 的协作关系。
- 解构 `SupervisorJobImpl` 与 `JobImpl` 的源码差异：`childCancelled` 方法的不同实现。
- 分析 `async` 在 `coroutineScope` 与 `supervisorScope` 中的不同行为：前者异常会取消父，后者不会。

### 1.5 Evaluate（评价）

- 评价 Kotlin 选择"结构化异常传播"而非"基于调用栈的传播"的设计权衡。
- 评价 `SupervisorJob` 默认不传递异常到父的设计优劣：避免了"一个失败全军覆没"，但要求开发者显式管理。
- 评价 `CoroutineExceptionHandler` 仅对 `launch` 根协程生效的设计：是否过于受限？
- 评价 `async` 异常延迟到 `await` 的语义：在哪些场景下会引发"未 await 的 async 静默失败"？
- 评价 `CancellationException` 的特殊地位：它是不是"滥用异常机制实现控制流"？
- 评价结构化并发对传统 `try/catch` 的影响：是否削弱了"显式优于隐式"的原则？

### 1.6 Create（创造）

- 设计并实现一个自定义的"重试协程构建器"：`retryLaunch(times = 3) { ... }`，自动在异常时重试。
- 设计一个跨平台的异常处理框架：统一 Android、iOS、JVM 的协程异常上报接口。
- 实现一个"异常聚合器"：收集多个子协程的异常，统一处理（类似 `Promise.allSettled`）。
- 撰写一份团队协程异常处理规范：何时用 `try/catch`、何时用 `SupervisorJob`、何时用 `CoroutineExceptionHandler`。
- 设计一个基于 `Flow` 的异常重试机制：`flow { }.retryWhen { cause, attempt -> ... }`。

---

## 2. 历史动机与发展脉络

### 2.1 问题背景：异步异常的复杂性

异步编程中的异常处理长期是一个棘手问题。在传统的回调和 Future 模式中，异常的传播路径不清晰，容易导致"未处理异常"或"异常被吞掉"。

核心痛点包括：

1. **回调地狱中的异常**：嵌套回调中，异常难以向上传播，需要手动传递 `error` 参数。
2. **Future 的异常丢失**：`Future` 如果没有被 `get()`，异常会被静默吞掉。
3. **线程的未捕获异常**：`Thread` 的未捕获异常会触发 `UncaughtExceptionHandler`，但难以恢复。
4. **取消的复杂性**：异步任务的取消需要协作式检查，异常与取消信号容易混淆。

Kotlin 协程的设计目标：

- **结构化异常传播**：异常处理与协程层级绑定，而非调用栈。
- **取消即异常**：取消通过 `CancellationException` 传递，统一异常与取消的语义。
- **显式控制**：开发者可以选择"传播"或"隔离"异常，通过 `SupervisorJob` 显式声明。
- **零开销**：异常处理不引入额外开销，复用 JVM 的异常机制。

### 2.2 学术背景：CSP 与结构化并发

结构化并发的理论基础来自 Hoare 的 CSP（Communicating Sequential Processes, 1978）与最近的结构化并发提案（Structured Concurrency, 2016）：

- **CSP**：进程间通信通过通道进行，强调"显式通信优于共享内存"。
- **结构化并发**：所有并发任务必须在一个明确的作用域内启动，作用域结束前所有任务必须完成或取消。
- **异常传播的层级性**：子任务的异常应传播到父任务，由父决定如何处理。

Kotlin 协程采用这一思想，将异常处理与 `Job` 层级绑定，形成"结构化异常传播"机制。

### 2.3 Kotlin 1.1（2017）：协程实验性阶段

Kotlin 1.1 引入协程作为实验性特性，异常处理机制较为原始：

```kotlin
// Kotlin 1.1
launch {
    try {
        // 异步操作
    } catch (e: Exception) {
        // 必须手动捕获
    }
}
```

此时 `SupervisorJob` 与 `CoroutineExceptionHandler` 尚未稳定，开发者主要依赖 `try/catch`。

### 2.4 Kotlin 1.3（2018 年 10 月）：协程 GA

Kotlin 1.3 将协程提升为稳定状态（GA），同时引入了完整的异常处理 API：

1. **`SupervisorJob`**：用于隔离子协程的异常。
2. **`CoroutineExceptionHandler`**：作为 `CoroutineContext` 的元素，用于全局异常处理。
3. **`supervisorScope` / `coroutineScope`**：作用域构建器，分别对应隔离与传播语义。
4. **`CancellationException`**：正式成为取消信号的载体。

### 2.5 Kotlin 1.4-1.5（2020-2021）：异常处理优化

Kotlin 1.4-1.5 期间，异常处理有以下优化：

1. **`finally` 与 `catch` 的语义明确化**：`finally` 中调用挂起函数需要 `withContext(NonCancellable)`。
2. **`runCatching` 引入**：Kotlin 1.4 标准库引入 `runCatching` 函数，提供函数式异常处理。
3. **`Flow` 的异常处理**：`Flow.catch`、`Flow.retry`、`Flow.retryWhen` 等 API 稳定。
4. **`CoroutineExceptionHandler` 在 KMP 中的支持**：在 JS、Native 平台行为一致。

### 2.6 Kotlin 1.6-1.7（2021-2022）：诊断与调试改进

Kotlin 1.6-1.7 改进了协程异常的诊断：

1. **更好的异常堆栈**：协程的异常堆栈包含"协程名"与"创建位置"。
2. **`CoroutineStack` 预览**：调试器能展示协程的"逻辑调用栈"，而非 JVM 调用栈。
3. **`DebugProbes`**：用于在运行时探查所有活跃协程的状态。

### 2.7 Kotlin 1.8-1.9（2023 年）：与 Virtual Threads 集成

Kotlin 1.8-1.9 与 JVM 21 的 Virtual Threads 集成，异常处理有以下变化：

1. **Virtual Thread 的未捕获异常**：与平台线程行为一致，触发 `Thread.UncaughtExceptionHandler`。
2. **`Dispatchers.IO` 与 Virtual Threads 互操作**：异常传播路径不变。
3. **结构化并发与 Loom 的对比**：Loom 的 `StructuredTaskScope` 与 Kotlin 的 `coroutineScope` 概念相似。

### 2.8 Kotlin 2.0（2024 年 5 月）：K2 与异常处理

Kotlin 2.0 的 K2 编译器对异常处理进行了优化：

1. **异常堆栈优化**：K2 生成的异常堆栈更精简，过滤掉内联函数的中间帧。
2. **`Continuation` 复用**：K2 能更好地复用 `Continuation` 对象，减少异常堆栈的"膨胀"。
3. **结构化并发改进**：更严格的 `CoroutineScope` 检查，避免异常在错误的作用域被处理。

### 2.9 JetBrains 的设计哲学

JetBrains 在设计协程异常处理时遵循了以下哲学：

1. **结构化优先**：异常处理与协程层级绑定，而非调用栈。
2. **显式优于隐式**：`SupervisorJob` 与 `coroutineScope` 显式声明异常策略。
3. **取消即异常**：`CancellationException` 统一了取消与异常的语义。
4. **可观测性**：`CoroutineExceptionHandler` 提供"最后防线"的可观测点。
5. **零开销**：异常处理复用 JVM 机制，不引入额外开销。
6. **平台无关**：异常处理在 JVM、JS、Native、Wasm 行为一致。

### 2.10 时间线总览

```
2017  Kotlin 1.1 — 协程实验性，仅 try/catch
2018  Kotlin 1.3 — SupervisorJob、CoroutineExceptionHandler GA
2020  Kotlin 1.4 — runCatching 引入，Flow 异常处理 API 稳定
2022  Kotlin 1.7 — 异常堆栈改进，DebugProbes 完善
2023  Kotlin 1.9 — Virtual Threads 集成，异常处理路径不变
2024  Kotlin 2.0 — K2 优化异常堆栈，结构化并发更严格
```

---

## 3. 形式化定义

### 3.1 协程异常传播的形式化

设协程层级结构为一个有向树 $T = (V, E)$，其中：

- $V$ 是协程集合（每个协程对应一个 `Job`）。
- $E$ 是父子关系，$(p, c) \in E$ 表示 $c$ 是 $p$ 的子协程。
- 根协程 $r \in V$ 满足 $\nexists p : (p, r) \in E$。

异常传播函数 $\text{Propagate}: V \times \text{Throwable} \to \text{Action}$ 定义为：

$$
\text{Propagate}(c, e) = \begin{cases}
\text{HandleAtRoot}(r, e) & \text{if } \text{Job}(c) \text{ is SupervisorJob} \\
\text{CancelParentAndPropagate}(p, e) & \text{otherwise}
\end{cases}
$$

其中 $p = \text{Parent}(c)$。

### 3.2 Job 的层级关系

`Job` 的层级关系形式化定义如下：

$$
\text{JobTree} ::= \text{Node}(\text{Job}, [\text{JobTree}])
$$

每个 `Job` 有零个或多个子 `Job`，关系通过 `ChildHandle` 维护：

$$
\text{Parent}(c) = p \iff \text{ChildHandle}(c).\text{parent} = p
$$

### 3.3 SupervisorJob 的语义

`SupervisorJob` 的核心区别在于 `childCancelled` 方法：

$$
\text{childCancelled} : \text{Job} \times \text{Child} \to \text{Boolean}
$$

对于普通 `Job`：

$$
\text{childCancelled}_{\text{Job}}(p, c) = \text{true} \quad \text{(取消父与所有兄弟)}
$$

对于 `SupervisorJob`：

$$
\text{childCancelled}_{\text{Supervisor}}(p, c) = \text{false} \quad \text{(不取消父与兄弟)}
$$

### 3.4 CoroutineExceptionHandler 的触发条件

`CoroutineExceptionHandler` 仅在以下条件全部满足时触发：

$$
\text{Trigger}(\text{CEH}, e) \iff \text{IsRoot}(c) \land \text{IsLaunch}(c) \land \text{NotCaught}(e)
$$

其中：

- $\text{IsRoot}(c)$：$c$ 是根协程（没有父或父是 `SupervisorJob`）。
- $\text{IsLaunch}(c)$：$c$ 通过 `launch` 启动（非 `async`）。
- $\text{NotCaught}(e)$：异常未被 `try/catch` 捕获。

### 3.5 取消异常的特殊地位

`CancellationException` 在异常传播中被特殊处理：

$$
\text{HandleCancellation}(c, e) = \begin{cases}
\text{Ignore}(e) & \text{if } e : \text{CancellationException} \\
\text{Propagate}(c, e) & \text{otherwise}
\end{cases}
$$

即：取消异常不会触发父协程的取消（因为父可能已经主动取消子）。

### 3.6 async 的异常语义

`async` 启动的协程，异常被封装在 `Deferred` 中：

$$
\text{Deferred}\langle T \rangle ::= \text{Pending} \mid \text{Resolved}(T) \mid \text{Rejected}(\text{Throwable})
$$

`await()` 的行为：

$$
\text{await}(d) = \begin{cases}
v & \text{if } d = \text{Resolved}(v) \\
\text{throw } e & \text{if } d = \text{Rejected}(e) \\
\text{suspend} & \text{if } d = \text{Pending}
\end{cases}
$$

### 3.7 结构化并发的异常语义

`coroutineScope` 与 `supervisorScope` 的异常语义：

$$
\text{coroutineScope}(\text{block}) : \text{throws } e \iff \exists c \in \text{Children}, \text{Failed}(c, e)
$$

$$
\text{supervisorScope}(\text{block}) : \text{throws } e \iff \text{Failed}(\text{scope}, e) \lor \text{Failed}(\text{block}, e)
$$

即：`coroutineScope` 任意子失败即抛出；`supervisorScope` 仅自身或显式抛出时失败。

### 3.8 JVM 字节码层面的异常处理

在 JVM 字节码层面，协程的异常处理通过 `try-catch` 表实现：

```
方法: launch$lambda$coroutine
异常表:
  from  to  target type
     0  20    21  java/lang/Exception
    21  30    31  kotlinx/coroutines/CancellationException
    31  50    51  java/lang/Throwable
```

`CancellationException` 被单独捕获并重新抛出，确保取消语义不被破坏。

---

## 4. 理论推导与原理解析

### 4.1 异常传播的代数模型

考虑以下协程层级：

```kotlin
val scope = CoroutineScope(Job())
scope.launch {           // p1
    launch { throw E1 }  // c1
    launch { delay(1000) } // c2
}
```

异常传播过程：

1. `c1` 抛出 `E1`。
2. `c1` 的 `Job` 标记为 `Cancelling`，触发 `parent.childCancelled(c1)`。
3. `p1` 是普通 `Job`，`childCancelled` 返回 `true`，`p1` 进入 `Cancelling`。
4. `p1` 取消所有子协程（`c2` 被取消，抛出 `CancellationException`）。
5. `p1` 进入 `Cancelled`，异常 `E1` 被传递到 `p1` 的父（`scope` 的 `Job`）。
6. `scope` 的 `Job` 是根，触发 `CompletionException` 或 `CoroutineExceptionHandler`。

形式化地：

$$
\text{Propagate}(\text{c1}, \text{E1}) \to \text{Cancel}(\text{p1}) \to \text{Cancel}(\text{c2}) \to \text{HandleAtRoot}(\text{scope}, \text{E1})
$$

### 4.2 SupervisorJob 的隔离性证明

考虑：

```kotlin
val scope = CoroutineScope(SupervisorJob())
scope.launch {           // p1
    launch { throw E1 }  // c1
    launch { delay(1000); println("c2 runs") } // c2
}
```

传播过程：

1. `c1` 抛出 `E1`。
2. `c1` 触发 `parent.childCancelled(c1)`。
3. `p1` 的 `Job` 是 `SupervisorJobImpl`（继承自 `SupervisorJob`），`childCancelled` 返回 `false`。
4. `p1` 不进入 `Cancelling`，`c2` 不受影响。
5. `c1` 的异常被传递到 `p1` 的 `CoroutineExceptionHandler`（如果有）或继续向上。

形式化地：

$$
\text{Propagate}_{\text{Supervisor}}(\text{c1}, \text{E1}) \to \text{HandleAtRoot}(\text{p1}, \text{E1}) \quad \text{(c2 不受影响)}
$$

### 4.3 try/catch 无法捕获 launch 异常的原因

考虑：

```kotlin
try {
    scope.launch {
        throw E1
    }
} catch (e: Throwable) {
    println("Caught")
}
```

`try/catch` 无法捕获 `E1` 的原因：

1. `launch` 立即返回一个 `Job`，不等待协程体执行。
2. 协程体在另一个调用栈（调度器线程）执行，`throw` 发生在新调用栈。
3. `try/catch` 只能捕获当前调用栈的异常，无法跨线程。

形式化地：

$$
\text{try} \{ \text{launch} \{ \text{throw} \} \} \neq \text{catch}(\text{throw})
$$

因为 `launch` 的语义是 $\text{launch}(f) = \text{schedule}(f) \land \text{return Job}$，异常发生在 `schedule` 之后。

### 4.4 async 的异常延迟性

考虑：

```kotlin
val deferred = scope.async {
    throw E1
}
// 此时 E1 已被封装在 deferred 中
try {
    deferred.await()
} catch (e: Throwable) {
    println("Caught: $e")  // 这里才能捕获
}
```

`async` 的异常处理：

1. `async` 启动协程，返回 `Deferred`。
2. 协程体抛出 `E1`，`Deferred` 转为 `Rejected(E1)`。
3. `await()` 检查 `Deferred` 状态，如果是 `Rejected`，抛出 `E1`。
4. `await()` 在当前调用栈，可以被 `try/catch` 捕获。

形式化地：

$$
\text{async}(f) = \text{Deferred}(\text{schedule}(f))
$$

$$
\text{await}(\text{Deferred}(\text{Rejected}(e))) = \text{throw } e
$$

### 4.5 CancellationException 的特殊处理

考虑：

```kotlin
scope.launch {
    try {
        delay(Long.MAX_VALUE)
    } catch (e: Exception) {
        // 会捕获 CancellationException!
        println("Caught: $e")
    }
}
```

如果父协程被取消，`delay` 会抛出 `CancellationException`。如果被 `catch (e: Exception)` 捕获而不重新抛出，会破坏结构化并发：

1. 父协程期望子协程响应取消。
2. 子协程吞掉 `CancellationException`，继续执行。
3. 父协程的 `join()` 永不返回（子协程未真正取消）。

形式化地：

$$
\text{catch}(\text{CancellationException}) \land \neg\text{rethrow} \implies \text{Deadlock}
$$

正确的做法：

```kotlin
scope.launch {
    try {
        delay(Long.MAX_VALUE)
    } catch (e: CancellationException) {
        println("Cancelled")
        throw e  // 必须重新抛出
    } catch (e: Exception) {
        println("Other error: $e")
    }
}
```

### 4.6 CoroutineExceptionHandler 的触发时机

`CoroutineExceptionHandler` 的触发条件：

1. 异常到达根协程（没有父 `Job`，或父是 `SupervisorJob`）。
2. 协程通过 `launch` 启动（非 `async`，因为 `async` 的异常被 `Deferred` 持有）。
3. 异常未被 `try/catch` 捕获。

形式化地：

$$
\text{Trigger}(\text{CEH}) \iff \text{IsRoot}(c) \land \text{IsLaunch}(c) \land \neg\text{Caught}(e)
$$

示例：

```kotlin
val handler = CoroutineExceptionHandler { _, e ->
    println("Caught by handler: $e")
}

val scope = CoroutineScope(SupervisorJob() + handler)
scope.launch {
    throw RuntimeException("boom")  // 被 handler 捕获
}
```

### 4.7 Job 状态机的形式化

`Job` 的状态转换：

$$
\text{State} ::= \text{New} \mid \text{Active} \mid \text{Completing} \mid \text{Cancelling} \mid \text{Cancelled} \mid \text{Completed}
$$

状态转换：

$$
\text{New} \xrightarrow{\text{start}} \text{Active} \xrightarrow{\text{complete}} \text{Completing} \xrightarrow{\text{children done}} \text{Completed}
$$

$$
\text{Active} \xrightarrow{\text{cancel/throw}} \text{Cancelling} \xrightarrow{\text{children cancelled}} \text{Cancelled}
$$

异常对状态的影响：

- `Active` 时抛异常 → `Cancelling` → `Cancelled`。
- `Completing` 时抛异常 → `Cancelling` → `Cancelled`。
- `Cancelling` 时抛异常 → 忽略（已经在取消中）。

### 4.8 异常处理的字节码分析

考虑：

```kotlin
suspend fun riskyOp(): String {
    throw RuntimeException("fail")
}

suspend fun caller(): String {
    return riskyOp()
}
```

反编译后的字节码（简化）：

```java
public static final Object caller(Continuation p1) {
    CallerSM sm = (CallerSM) p1;
    switch (sm.label) {
        case 0:
            sm.label = 1;
            Object result = riskyOp(sm);
            if (result == COROUTINE_SUSPENDED) return COROUTINE_SUSPENDED;
            return result;
        case 1:
            // 恢复点：如果 riskyOp 抛异常，这里会重新抛出
            Throwable e = sm.exception;
            if (e != null) throw e;
            return sm.result;
    }
}
```

异常通过 `Continuation` 的 `exception` 字段传递，恢复时重新抛出。

---

## 5. 代码示例

### 5.1 基础：异常默认传播

```bash
# 编译运行
kotlinc -cp kotlinx-coroutines-core.jar demo.kt -include-runtime -o demo
java -cp demo.jar: kotlinx-coroutines-core.jar DemoKt
```

```kotlin
// demo.kt
import kotlinx.coroutines.*

fun main() = runBlocking {
    val scope = CoroutineScope(Dispatchers.Default)
    
    // 默认：子协程异常会取消父与兄弟
    val job = scope.launch {
        // 子协程 1：会失败
        launch {
            delay(100)
            throw RuntimeException("child 1 fails")
        }
        // 子协程 2：会被取消
        launch {
            try {
                delay(1000)
                println("child 2 done")
            } catch (e: CancellationException) {
                println("child 2 cancelled: $e")
                throw e
            }
        }
    }
    
    job.join()
    println("parent done")
}
```

输出：

```
child 2 cancelled: StandaloneCoroutine was cancelled
parent done
Exception in thread "DefaultDispatcher-worker-2" java.lang.RuntimeException: child 1 fails
```

### 5.2 SupervisorJob：隔离子协程

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    
    val job = scope.launch {
        // 子协程 1：失败
        launch {
            delay(100)
            throw RuntimeException("child 1 fails")
        }
        // 子协程 2：不受影响
        launch {
            delay(500)
            println("child 2 done")
        }
    }
    
    job.join()
    println("parent done")
}
```

输出：

```
child 2 done
parent done
Exception in thread "DefaultDispatcher-worker-2" java.lang.RuntimeException: child 1 fails
```

### 5.3 supervisorScope：作用域内的隔离

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    try {
        supervisorScope {
            // 子协程 1：失败
            launch {
                delay(100)
                throw RuntimeException("A fails")
            }
            // 子协程 2：正常运行
            launch {
                delay(500)
                println("B runs")
            }
        }
    } catch (e: Exception) {
        println("Scope failed: $e")
    }
}
```

输出：

```
B runs
Scope failed: java.lang.RuntimeException: A fails
```

注意：`supervisorScope` 本身仍会抛出子协程的异常（最后一个），但不会取消兄弟协程。

### 5.4 coroutineScope：传播语义

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    try {
        coroutineScope {
            launch {
                delay(100)
                throw RuntimeException("A fails")
            }
            // 会被取消，因为 coroutineScope 是传播语义
            launch {
                delay(500)
                println("B runs")
            }
        }
    } catch (e: Exception) {
        println("Scope failed: $e")
    }
}
```

输出：

```
Scope failed: java.lang.RuntimeException: A fails
```

注意：`B runs` 不会被打印，因为 `coroutineScope` 是传播语义。

### 5.5 CoroutineExceptionHandler：全局兜底

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    val handler = CoroutineExceptionHandler { _, e ->
        println("Handler caught: $e")
    }
    
    val scope = CoroutineScope(SupervisorJob() + handler)
    
    // launch 的异常会被 handler 捕获
    scope.launch {
        delay(100)
        throw RuntimeException("launch error")
    }
    
    // async 的异常不会被 handler 捕获（封装在 Deferred）
    val deferred = scope.async {
        delay(200)
        throw RuntimeException("async error")
    }
    
    delay(500)
    
    // 显式 await 时才能捕获 async 的异常
    try {
        deferred.await()
    } catch (e: Exception) {
        println("Await caught: $e")
    }
}
```

输出：

```
Handler caught: java.lang.RuntimeException: launch error
Await caught: java.lang.RuntimeException: async error
```

### 5.6 try/catch 限制

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    val scope = CoroutineScope(Dispatchers.Default)
    
    // 无法捕获 launch 的异常
    try {
        scope.launch {
            delay(100)
            throw RuntimeException("launch error")
        }.join()
    } catch (e: Exception) {
        println("Won't catch: $e")
    }
    
    // 可以捕获 async + await 的异常
    try {
        scope.async {
            delay(100)
            throw RuntimeException("async error")
        }.await()
    } catch (e: Exception) {
        println("Caught: $e")
    }
}
```

输出：

```
Caught: java.lang.RuntimeException: async error
Exception in thread "DefaultDispatcher-worker-2" java.lang.RuntimeException: launch error
```

### 5.7 CancellationException 的正确处理

```kotlin
import kotlinx.coroutines.*

fun main() = runBlocking {
    val job = launch {
        try {
            repeat(100) { i ->
                println("Working $i")
                delay(100)
            }
        } catch (e: CancellationException) {
            println("Cancelled, cleaning up...")
            // 必须重新抛出，否则破坏结构化并发
            throw e
        } catch (e: Exception) {
            println("Other error: $e")
        } finally {
            // finally 中调用挂起函数需要 NonCancellable
            withContext(NonCancellable) {
                println("Cleaning up in finally")
                delay(50)
                println("Cleanup done")
            }
        }
    }
    
    delay(250)
    job.cancelAndJoin()
    println("Done")
}
```

输出：

```
Working 0
Working 1
Working 2
Cancelled, cleaning up...
Cleaning up in finally
Cleanup done
Done
```

### 5.8 runCatching：函数式异常处理

```kotlin
import kotlinx.coroutines.*

suspend fun riskyFetch(): String {
    delay(100)
    if (Math.random() < 0.5) throw RuntimeException("network error")
    return "data"
}

fun main() = runBlocking {
    val result: Result<String> = runCatching {
        riskyFetch()
    }
    
    result
        .onSuccess { println("Got: $it") }
        .onFailure { println("Failed: $it") }
    
    // 等价于
    val value = try {
        riskyFetch()
    } catch (e: Exception) {
        null
    }
    println("Value: $value")
}
```

### 5.9 自定义重试机制

```kotlin
import kotlinx.coroutines.*
import kotlin.coroutines.*

suspend fun <T> retry(
    times: Int = 3,
    initialDelay: Long = 100,
    factor: Double = 2.0,
    block: suspend () -> T
): T {
    var currentDelay = initialDelay
    repeat(times - 1) { attempt ->
        try {
            return block()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            println("Attempt ${attempt + 1} failed: $e, retrying in $currentDelay ms")
            delay(currentDelay)
            currentDelay = (currentDelay * factor).toLong()
        }
    }
    return block()  // 最后一次不 catch
}

fun main() = runBlocking {
    var count = 0
    val result = retry(times = 3) {
        count++
        println("Try $count")
        if (count < 3) throw RuntimeException("fail")
        "success"
    }
    println("Result: $result")
}
```

### 5.10 异常聚合器

```kotlin
import kotlinx.coroutines.*

data class ChildResult<T>(
    val index: Int,
    val value: T? = null,
    val error: Throwable? = null
) {
    val isSuccess: Boolean get() = error == null
}

suspend fun <T> gatherAll(
    vararg blocks: suspend () -> T
): List<ChildResult<T>> = coroutineScope {
    blocks.mapIndexed { index, block ->
        async {
            try {
                ChildResult(index, value = block())
            } catch (e: Throwable) {
                ChildResult(index, error = e)
            }
        }
    }.awaitAll()
}

fun main() = runBlocking {
    val results = gatherAll(
        { delay(100); "A" },
        { delay(100); throw RuntimeException("B failed") },
        { delay(100); "C" }
    )
    
    results.forEach { r ->
        if (r.isSuccess) {
            println("Task ${r.index}: ${r.value}")
        } else {
            println("Task ${r.index} failed: ${r.error?.message}")
        }
    }
}
```

### 5.11 Android ViewModel 中的异常处理

```kotlin
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.*

class UserViewModel : ViewModel() {
    private val exceptionHandler = CoroutineExceptionHandler { _, e ->
        // 上报到崩溃监控系统
        Crashlytics.logException(e)
    }
    
    fun loadUser(userId: String) {
        viewModelScope.launch(exceptionHandler) {
            try {
                val user = fetchUser(userId)
                _uiState.value = UiState.Success(user)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _uiState.value = UiState.Error(e.message ?: "Unknown error")
            }
        }
    }
    
    private suspend fun fetchUser(userId: String): User {
        return apiService.getUser(userId)
    }
}
```

### 5.12 Spring Boot 中的异常处理

```kotlin
import org.springframework.web.bind.annotation.*
import kotlinx.coroutines.*

@RestController
class UserController {
    @GetMapping("/users/{id}")
    suspend fun getUser(@PathVariable id: String): User {
        return try {
            userService.getUser(id)
        } catch (e: UserNotFoundException) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, e.message)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            throw ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Server error")
        }
    }
}
```

### 5.13 Flow 的异常处理

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

fun main() = runBlocking {
    flow {
        emit(1)
        emit(2)
        throw RuntimeException("flow error")
    }
    .catch { e ->
        println("Flow caught: $e")
        emit(-1)  // 提供回退值
    }
    .retryWhen { cause, attempt ->
        if (attempt < 3) {
            println("Retry attempt ${attempt + 1} due to $cause")
            delay(100)
            true
        } else {
            false
        }
    }
    .collect { value ->
        println("Received: $value")
    }
}
```

---

## 6. 对比分析

### 6.1 与 Java 异常处理的对比

| 维度 | Java (Future/Executor) | Kotlin 协程 |
|---|---|---|
| 异常传播 | 基于调用栈 | 基于协程层级 |
| Future.get() | 抛出 `ExecutionException` 包装 | `await()` 直接抛出原始异常 |
| 取消机制 | `Future.cancel(true)` 中断线程 | `Job.cancel()` 抛出 `CancellationException` |
| 全局兜底 | `Thread.UncaughtExceptionHandler` | `CoroutineExceptionHandler` |
| 结构化 | 无（独立 Future） | 有（Job 层级） |

### 6.2 与 RxJava 的对比

| 维度 | RxJava | Kotlin 协程 |
|---|---|---|
| 异常处理 | `onError` 回调 | `try/catch` + 结构化 |
| 错误传播 | 链式终止 | 向上传播到根 |
| 重试 | `retry(n)` 操作符 | `retryWhen` / 自定义 `retry` |
| 取消 | `Disposable.dispose()` | `Job.cancel()` |
| 全局兜底 | 无原生支持 | `CoroutineExceptionHandler` |

### 6.3 与 Project Reactor 的对比

| 维度 | Reactor | Kotlin 协程 |
|---|---|---|
| 异常类型 | `Throwable`（非 `Exception`） | `Throwable` |
| 错误回调 | `onErrorResume` | `try/catch` |
| 错误转换 | `onErrorMap` | 手动转换 |
| 超时 | `timeout(duration)` | `withTimeout(duration)` |
| 回退 | `onErrorReturn(default)` | `?: default` |

### 6.4 与 Swift async/await 的对比

| 维度 | Swift async/await | Kotlin 协程 |
|---|---|---|
| 错误模型 | `throws` 关键字 | 异常是一等值 |
| 传播 | 自动向上传播 | 显式 `try/catch` |
| 取消 | `Task.cancel()`，`CancellationError` | `Job.cancel()`，`CancellationException` |
| 结构化 | `TaskGroup` | `coroutineScope` |
| 并行隔离 | 无原生支持 | `supervisorScope` |
| 全局兜底 | 无 | `CoroutineExceptionHandler` |

### 6.5 与 Go goroutine 的对比

| 维度 | Go goroutine | Kotlin 协程 |
|---|---|---|
| 异常模型 | `panic`/`recover` | 异常 |
| 传播 | 不传播（panic 崩溃整个进程） | 结构化传播 |
| 错误值 | `error` 返回值 | `Result<T>` 或异常 |
| 取消 | `context.Cancel()` | `Job.cancel()` |
| 全局兜底 | 无 | `CoroutineExceptionHandler` |
| 结构化 | `context` 传递 | `coroutineScope` |

### 6.6 与 JavaScript Promise 的对比

| 维度 | JavaScript Promise | Kotlin 协程 |
|---|---|---|
| 错误传播 | 链式 `.catch()` | `try/catch` |
| 并行 | `Promise.all` / `Promise.allSettled` | `coroutineScope` / `supervisorScope` |
| 取消 | `AbortController` | `Job.cancel()` |
| 全局兜底 | `unhandledrejection` 事件 | `CoroutineExceptionHandler` |
| async/await | `try/catch` | `try/catch` |

### 6.7 跨语言对比总结

```
                  结构化异常    显式控制    取消语义    全局兜底
Kotlin 协程           ✓           ✓           ✓           ✓
RxJava                ✗           ✓           ✓           ✗
Swift async/await     ✓           ✗           ✓           ✗
Go goroutine          ✗           ✗           ✗           ✗
JavaScript Promise     ✗           ✓           △           △
Java Future           ✗           ✓           △           ✗
```

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱：try/catch 包裹 launch

**反模式**：

```kotlin
// 错误：try/catch 无法捕获 launch 的异常
try {
    scope.launch {
        throw RuntimeException("error")
    }
} catch (e: Exception) {
    println("Caught: $e")  // 永远不会执行
}
```

**正确做法**：

```kotlin
// 方式 1：在协程内部 try/catch
scope.launch {
    try {
        throw RuntimeException("error")
    } catch (e: Exception) {
        println("Caught: $e")
    }
}

// 方式 2：用 async + await
val deferred = scope.async { throw RuntimeException("error") }
try {
    deferred.await()
} catch (e: Exception) {
    println("Caught: $e")
}

// 方式 3：用 CoroutineExceptionHandler
val handler = CoroutineExceptionHandler { _, e ->
    println("Caught: $e")
}
scope.launch(handler) {
    throw RuntimeException("error")
}
```

### 7.2 陷阱：吞掉 CancellationException

**反模式**：

```kotlin
// 错误：吞掉 CancellationException 破坏结构化并发
scope.launch {
    try {
        delay(Long.MAX_VALUE)
    } catch (e: Exception) {
        println("Caught: $e")
        // 没有重新抛出！
    }
    // 继续执行，但父协程已经取消
}
```

**正确做法**：

```kotlin
scope.launch {
    try {
        delay(Long.MAX_VALUE)
    } catch (e: CancellationException) {
        println("Cancelled")
        throw e  // 必须重新抛出
    } catch (e: Exception) {
        println("Other: $e")
    }
}
```

### 7.3 陷阱：finally 中调用挂起函数

**反模式**：

```kotlin
// 错误：finally 中调用挂起函数会抛 CancellationException
scope.launch {
    try {
        delay(Long.MAX_VALUE)
    } finally {
        delay(100)  // 抛 CancellationException，无法执行
        println("Cleanup")  // 不会执行
    }
}
```

**正确做法**：

```kotlin
scope.launch {
    try {
        delay(Long.MAX_VALUE)
    } finally {
        withContext(NonCancellable) {
            delay(100)  // 在 NonCancellable 上下文中执行
            println("Cleanup")
        }
    }
}
```

### 7.4 陷阱：async 未 await 导致异常丢失

**反模式**：

```kotlin
// 错误：async 未 await，异常被吞掉（除非父是普通 Job）
scope.async {
    throw RuntimeException("error")  // 异常去哪了？
}
// 没有调用 await()
```

**说明**：

- 如果父是普通 `Job`：异常会传播到父，取消兄弟协程。
- 如果父是 `SupervisorJob`：异常被 `Deferred` 持有，永远不被处理（除非显式 await 或 GC 时打印）。

**正确做法**：

```kotlin
// 方式 1：显式 await
val deferred = scope.async { throw RuntimeException("error") }
deferred.await()  // 抛出异常

// 方式 2：用 launch 替代 async（如果不关心结果）
scope.launch { throw RuntimeException("error") }

// 方式 3：awaitAll
val deferreds = listOf(
    scope.async { task1() },
    scope.async { task2() }
)
deferreds.awaitAll()  // 任意一个失败即抛出
```

### 7.5 陷阱：SupervisorJob 滥用

**反模式**：

```kotlin
// 错误：所有协程都用 SupervisorJob，掩盖了真正的错误
val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
scope.launch {
    throw RuntimeException("critical error")  // 不会取消其他协程
}
scope.launch {
    throw RuntimeException("another error")  // 也不会被注意
}
```

**正确做法**：

```kotlin
// 仅在确实需要隔离的场景使用 SupervisorJob
val scope = CoroutineScope(Dispatchers.Default)

// 默认使用 coroutineScope，错误传播
scope.launch {
    coroutineScope {
        launch { /* 重要任务 */ }
        launch { /* 重要任务 */ }
    }
}

// 仅在独立任务场景使用 supervisorScope
scope.launch {
    supervisorScope {
        launch { /* 独立任务 */ }
        launch { /* 独立任务 */ }
    }
}
```

### 7.6 陷阱：CoroutineExceptionHandler 用于恢复

**反模式**：

```kotlin
// 错误：CoroutineExceptionHandler 用于"恢复"逻辑
val handler = CoroutineExceptionHandler { _, e ->
    // 这里无法恢复协程，只能记录
    println("Caught: $e")
    // 不能重新启动协程或返回值
}
scope.launch(handler) {
    val data = fetchData()  // 失败
    updateUI(data)  // 不会执行
}
```

**正确做法**：

```kotlin
// CoroutineExceptionHandler 仅用于"日志与上报"
val handler = CoroutineExceptionHandler { _, e ->
    Crashlytics.logException(e)
}

// 业务恢复用 try/catch
scope.launch(handler) {
    val data = try {
        fetchData()
    } catch (e: Exception) {
        fallbackData()
    }
    updateUI(data)
}
```

### 7.7 陷阱：catch Exception 而非 Throwable

**反模式**：

```kotlin
// 错误：catch Exception 会漏掉 OutOfMemoryError 等
scope.launch {
    try {
        riskyOp()
    } catch (e: Exception) {  // 漏掉 Error
        println("Caught: $e")
    }
}
```

**正确做法**：

```kotlin
// 通常捕获 Throwable，但要重新抛出 CancellationException
scope.launch {
    try {
        riskyOp()
    } catch (e: CancellationException) {
        throw e
    } catch (e: Throwable) {
        println("Caught: $e")
    }
}
```

### 7.8 陷阱：异常在错误的作用域处理

**反模式**：

```kotlin
// 错误：在 GlobalScope 中处理异常，作用域不正确
GlobalScope.launch {
    throw RuntimeException("error")  // 无人处理
}
```

**正确做法**：

```kotlin
// 使用合适生命周期的 scope
class MyActivity : AppCompatActivity() {
    private val handler = CoroutineExceptionHandler { _, e ->
        showError(e.message ?: "Error")
    }
    
    fun loadData() {
        lifecycleScope.launch(handler) {
            val data = fetchData()
            showData(data)
        }
    }
}
```

### 7.9 陷阱：过度使用 runCatching

**反模式**：

```kotlin
// 错误：所有协程都用 runCatching，掩盖错误
suspend fun loadUser(): Result<User> = runCatching {
    api.getUser()
}
```

**正确做法**：

```kotlin
// 仅在需要"成功/失败"语义时用 runCatching
suspend fun loadUser(): User {
    return api.getUser()  // 让异常自然传播
}

// 或显式返回 sealed class
sealed class LoadResult<out T> {
    data class Success<T>(val value: T) : LoadResult<T>()
    data class Failure(val error: Throwable) : LoadResult<Nothing>()
}

suspend fun loadUser(): LoadResult<User> = try {
    LoadResult.Success(api.getUser())
} catch (e: CancellationException) {
    throw e
} catch (e: Exception) {
    LoadResult.Failure(e)
}
```

### 7.10 陷阱：协程嵌套过深

**反模式**：

```kotlin
// 错误：嵌套协程，异常处理混乱
scope.launch {
    launch {
        launch {
            throw RuntimeException("deep error")
        }
    }
}
```

**正确做法**：

```kotlin
// 扁平化协程层级
scope.launch {
    supervisorScope {
        launch { /* task 1 */ }
        launch { /* task 2 */ }
    }
}
```

### 7.11 陷阱：忽略异常的堆栈重建

**反模式**：

```kotlin
// 错误：捕获后重新抛出，丢失原始堆栈
try {
    riskyOp()
} catch (e: Exception) {
    throw RuntimeException("Failed")  // 丢失原始堆栈
}
```

**正确做法**：

```kotlin
// 保留原始异常
try {
    riskyOp()
} catch (e: Exception) {
    throw RuntimeException("Failed", e)  // 保留 cause
}

// 或直接重新抛出
try {
    riskyOp()
} catch (e: Exception) {
    println("Logging: $e")
    throw e
}
```

### 7.12 陷阱：Flow 的 catch 位置

**反模式**：

```kotlin
// 错误：catch 在 map 之前，map 的异常不会被捕获
flow {
    emit(1)
    throw RuntimeException("emit error")
}
.map { it * 2 }  // 如果这里抛异常，不会被 catch
.catch { e -> println("Caught: $e") }
.collect { println(it) }
```

**正确做法**：

```kotlin
// catch 在最后，捕获所有上游异常
flow {
    emit(1)
    throw RuntimeException("emit error")
}
.map { it * 2 }
.catch { e -> println("Caught: $e") }
.collect { println(it) }

// 或者在 collect 中 try/catch
flow {
    emit(1)
    throw RuntimeException("emit error")
}
.map { it * 2 }
.collect(
    onEach = { println(it) },
    onCompletion = { /* 完成回调 */ }
).let { /* 注意 collect 本身不抛 */ }

// 显式处理
try {
    flow {
        emit(1)
        throw RuntimeException("emit error")
    }.map { it * 2 }
    .collect { println(it) }
} catch (e: Exception) {
    println("Caught: $e")
}
```

---

## 8. 工程实践

### 8.1 团队规范

建议在团队中制定以下规范：

1. **作用域选择**：
   - UI 相关：`viewModelScope` / `lifecycleScope`
   - 业务逻辑：自定义 `CoroutineScope` + `SupervisorJob`
   - 服务端：`Controller` 的 `suspend` 函数直接使用

2. **异常处理层级**：
   - 业务层：`try/catch` 处理可恢复异常
   - 全局层：`CoroutineExceptionHandler` 上报崩溃
   - 监控层：`Thread.UncaughtExceptionHandler` 兜底

3. **取消语义**：
   - 所有 `try/catch` 必须先捕获 `CancellationException` 并重新抛出
   - `finally` 中的挂起函数用 `withContext(NonCancellable)` 包裹

4. **错误模型**：
   - 业务错误用 `sealed class` 表达，不用异常
   - 系统错误用异常表达
   - `runCatching` 仅用于简单场景

### 8.2 监控与上报

```kotlin
// 自定义 CoroutineExceptionHandler，集成崩溃监控
class CrashReportingExceptionHandler(
    private val tracker: CrashTracker
) : CoroutineExceptionHandler {
    override val key = CoroutineExceptionHandler
    
    override fun handleException(context: CoroutineContext, exception: Throwable) {
        // 收集协程上下文信息
        val coroutineName = context[CoroutineName]?.name ?: "unnamed"
        val dispatcher = context[CoroutineDispatcher.Key]
        
        // 上报
        tracker.report(exception, mapOf(
            "coroutineName" to coroutineName,
            "dispatcher" to dispatcher?.toString(),
            "timestamp" to System.currentTimeMillis()
        ))
    }
}

// 全局使用
val appScope = CoroutineScope(
    SupervisorJob() + 
    Dispatchers.Default + 
    CrashReportingExceptionHandler(FirebaseCrashlytics.getInstance())
)
```

### 8.3 MDC 集成

```kotlin
import org.slf4j.MDC
import kotlinx.coroutines.*

// 自定义 CoroutineContext 元素，传递 MDC
class MdcContext(val mdc: Map<String, String>) : AbstractCoroutineContextElement(Key) {
    companion object Key : CoroutineContext.Key<MdcContext>
}

// 在协程启动时注入 MDC
suspend fun <T> withMdc(mdc: Map<String, String>, block: suspend () -> T): T {
    return withContext(MdcContext(mdc)) {
        // 恢复 MDC
        val previous = mdc.entries.associate { (k, v) -> k to MDC.get(k) }
        mdc.forEach { (k, v) -> MDC.put(k, v) }
        try {
            block()
        } finally {
            previous.forEach { (k, v) ->
                if (v == null) MDC.remove(k) else MDC.put(k, v)
            }
        }
    }
}

// 使用
suspend fun processRequest(requestId: String) = withMdc(
    mapOf("requestId" to requestId)
) {
    logger.info("Processing")  // 日志自动带上 requestId
    val data = fetchData()
    logger.info("Done")
    data
}
```

### 8.4 超时与取消

```kotlin
// 使用 withTimeout 实现超时
suspend fun fetchWithTimeout(url: String): String {
    return try {
        withTimeout(5000) {
            client.get(url)
        }
    } catch (e: TimeoutCancellationException) {
        // 注意：TimeoutCancellationException 是 CancellationException 的子类
        throw NetworkException("Timeout: $url")
    }
}

// 自定义可重试的 withTimeout
suspend fun <T> withTimeoutAndRetry(
    timeout: Long,
    retries: Int = 3,
    block: suspend () -> T
): T {
    repeat(retries) { attempt ->
        try {
            return withTimeout(timeout) { block() }
        } catch (e: TimeoutCancellationException) {
            if (attempt == retries - 1) throw e
            delay(100)
        }
    }
    error("unreachable")
}
```

### 8.5 Detekt 静态检查

```yaml
# detekt.yml
coroutines:
  active: true
  rules:
    - ForbiddenMethodCall:
        active: true
        methods:
          - 'kotlin.coroutines.cancellation.CancellationException'
    - GlobalCoroutineUsage:
        active: true
    - SuspendFunWithTryCatch:
        active: true
```

### 8.6 单元测试

```kotlin
import kotlinx.coroutines.test.*
import org.junit.Test

class MyViewModelTest {
    @Test
    fun `should handle network error`() = runTest {
        val viewModel = MyViewModel(fakeApiThatThrows())
        
        viewModel.loadUser("123")
        
        // 验证 UI 状态
        assertEquals(UiState.Error::class, viewModel.uiState.value::class)
    }
    
    @Test
    fun `should retry on failure`() = runTest {
        val api = FakeApi(listOf(
            { throw NetworkException() },
            { "success" }
        ))
        val viewModel = MyViewModel(api)
        
        viewModel.loadWithRetry("123")
        
        assertEquals("success", viewModel.data.value)
    }
    
    @Test
    fun `should cancel on timeout`() = runTest {
        val viewModel = MyViewModel(slowApi())
        
        assertFailsWith<TimeoutCancellationException> {
            withTimeout(100) {
                viewModel.loadSlow()
            }
        }
    }
}
```

### 8.7 调试技巧

```kotlin
// 启用调试模式
System.setProperty("kotlinx.coroutines.debug", "on")
System.setProperty("kotlinx.coroutines.debug.auto_install", "true")

// 使用 DebugProbes
import kotlinx.coroutines.debug.*

fun setupDebug() {
    DebugProbes.install()
    
    // 捕获所有未处理异常
    DebugProbes.onCoroutineCreated = { coroutine, context ->
        println("Created: $coroutine")
    }
    DebugProbes.onCoroutineCompleted = { coroutine, context, result ->
        println("Completed: $coroutine, result=$result")
    }
}

// 输出所有活跃协程
fun dumpCoroutines() {
    DebugProbes.printCoroutines()
}
```

### 8.8 性能考虑

异常处理的性能开销主要在异常抛出与堆栈收集：

1. **避免在热路径抛异常**：高频错误用 `Result` 或 `sealed class` 表达。
2. **缓存异常实例**：避免在循环中创建新异常。
3. **减少堆栈深度**：自定义异常可重写 `fillInStackTrace` 返回 `this`，禁用堆栈收集。

```kotlin
// 高性能异常（无堆栈）
class FastNetworkException(message: String) : RuntimeException(message) {
    override fun fillInStackTrace(): Throwable = this
}
```

---

## 9. 案例研究

### 9.1 案例：Android 图片加载库的异常处理

**场景**：实现一个图片加载库，支持内存缓存、磁盘缓存、网络加载。

**实现**：

```kotlin
class ImageLoader(
    private val memoryCache: MemoryCache,
    private val diskCache: DiskCache,
    private val network: NetworkClient
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    suspend fun load(url: String): Image {
        return try {
            // 内存缓存
            memoryCache.get(url)?.let { return it }
            
            // 磁盘缓存
            val disk = try {
                diskCache.get(url)
            } catch (e: IOException) {
                null  // 磁盘错误不致命
            }
            
            // 网络加载
            val image = if (disk != null) {
                disk
            } else {
                try {
                    network.fetchImage(url)
                } catch (e: NetworkException) {
                    throw ImageLoadException("Network failed: ${e.message}", e)
                }
            }
            
            // 写入缓存（异步，不阻塞）
            scope.launch {
                try {
                    memoryCache.put(url, image)
                    diskCache.put(url, image)
                } catch (e: Exception) {
                    if (e is CancellationException) throw e
                    // 缓存写入失败不影响加载
                }
            }
            
            image
        } catch (e: CancellationException) {
            throw e
        } catch (e: ImageLoadException) {
            throw e
        } catch (e: Exception) {
            throw ImageLoadException("Unknown error", e)
        }
    }
}
```

**设计要点**：
- `SupervisorJob`：缓存写入失败不影响加载流程。
- 分层异常处理：磁盘错误降级，网络错误转换。
- `CancellationException` 必须重新抛出。

### 9.2 案例：金融交易系统的补偿事务

**场景**：银行转账，需要支持失败时的补偿（回滚）。

**实现**：

```kotlin
class TransferService(
    private val accountService: AccountService,
    private val auditService: AuditService
) {
    suspend fun transfer(from: String, to: String, amount: Long): TransferResult {
        return supervisorScope {
            val deduction = async { accountService.deduct(from, amount) }
            val addition = async { accountService.add(to, amount) }
            
            try {
                val (d, a) = Pair(deduction.await(), addition.await())
                auditService.logSuccess(from, to, amount)
                TransferResult.Success(d, a)
            } catch (e: Exception) {
                if (e !is CancellationException) {
                    // 补偿事务
                    try {
                        compensation(from, to, amount)
                    } catch (ce: Exception) {
                        auditService.logFailure(from, to, amount, ce)
                    }
                }
                TransferResult.Failure(e)
            }
        }
    }
    
    private suspend fun compensation(from: String, to: String, amount: Long) {
        // 反向操作
        try {
            accountService.add(from, amount)
        } catch (e: Exception) {
            // 补偿失败，需人工介入
            throw CompensationFailedException(from, e)
        }
        try {
            accountService.deduct(to, amount)
        } catch (e: Exception) {
            // 补偿失败，需人工介入
            throw CompensationFailedException(to, e)
        }
    }
}
```

**设计要点**：
- `supervisorScope`：扣款与加款相互独立，一个失败不影响另一个。
- 补偿事务：失败时执行反向操作。
- 审计日志：无论成功失败都记录。

### 9.3 案例：实时聊天系统的消息分发

**场景**：聊天室，向所有在线用户分发消息，一个用户失败不影响其他。

**实现**：

```kotlin
class ChatRoom {
    private val users = ConcurrentHashMap<String, UserSession>()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    suspend fun broadcast(message: Message) {
        supervisorScope {
            users.values.forEach { session ->
                launch {
                    try {
                        session.send(message)
                    } catch (e: WebSocketException) {
                        logger.warn("Failed to send to ${session.userId}: ${e.message}")
                        // 不影响其他用户
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        logger.error("Unexpected error for ${session.userId}", e)
                    }
                }
            }
        }
    }
    
    suspend fun sendToUser(userId: String, message: Message): Boolean {
        val session = users[userId] ?: return false
        return try {
            withTimeout(5000) {
                session.send(message)
            }
            true
        } catch (e: TimeoutCancellationException) {
            logger.warn("Send timeout for $userId")
            users.remove(userId)
            false
        } catch (e: WebSocketException) {
            logger.warn("WebSocket error for $userId: ${e.message}")
            users.remove(userId)
            false
        }
    }
}
```

**设计要点**：
- `supervisorScope`：每个用户独立，一个失败不影响其他。
- 超时处理：`withTimeout` 防止慢速连接阻塞。
- 失败时移除会话：避免重复失败。

### 9.4 案例：KMP 项目中的统一异常处理

**场景**：跨平台（JVM、iOS、JS）的统一异常处理。

**实现**：

```kotlin
// commonMain
expect class PlatformExceptionReporter {
    fun report(throwable: Throwable, context: Map<String, String>)
}

class UnifiedExceptionHandler : CoroutineExceptionHandler {
    override val key = CoroutineExceptionHandler
    
    override fun handleException(context: CoroutineContext, exception: Throwable) {
        val reporter = PlatformExceptionReporter()
        val coroutineName = context[CoroutineName]?.name ?: "unnamed"
        
        reporter.report(exception, mapOf(
            "coroutineName" to coroutineName,
            "platform" to expectPlatformName()
        ))
    }
}

// androidMain
actual class PlatformExceptionReporter {
    actual fun report(throwable: Throwable, context: Map<String, String>) {
        FirebaseCrashlytics.getInstance().recordException(throwable)
        context.forEach { (k, v) ->
            FirebaseCrashlytics.getInstance().setCustomKey(k, v)
        }
    }
}

// iosMain
actual class PlatformExceptionReporter {
    actual fun report(throwable: Throwable, context: Map<String, String>) {
        // 上报到 Sentry iOS
        Sentry.captureException(throwable, context)
    }
}

// jsMain
actual class PlatformExceptionReporter {
    actual fun report(throwable: Throwable, context: Map<String, String>) {
        console.error(throwable.toString(), context)
        // 上报到 Sentry JS
    }
}
```

### 9.5 案例：SSE 长连接的异常恢复

**场景**：Server-Sent Events 长连接，断线自动重连。

**实现**：

```kotlin
class SseClient(private val url: String) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var currentJob: Job? = null
    
    fun start(onMessage: (String) -> Unit) {
        currentJob = scope.launch {
            while (isActive) {
                try {
                    connect(url).collect { event ->
                        onMessage(event)
                    }
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    logger.warn("SSE disconnected: ${e.message}, reconnecting in 1s")
                    delay(1000)
                }
            }
        }
    }
    
    fun stop() {
        currentJob?.cancel()
    }
    
    private fun connect(url: String): Flow<String> = flow {
        val client = HttpClient()
        client.get(url) { 
            header("Accept", "text/event-stream")
        }.bodyAsChannel().let { channel ->
            while (currentCoroutineContext().isActive) {
                val line = channel.readUTF8Line() ?: break
                if (line.startsWith("data: ")) {
                    emit(line.removePrefix("data: "))
                }
            }
        }
    }
}
```

**设计要点**：
- `while (isActive)`：协作式取消。
- `delay(1000)`：指数退避可在此基础上实现。
- `CancellationException` 必须重新抛出。

### 9.6 案例：批量数据处理的重试

**场景**：从数据库批量读取数据，每条独立处理，失败的记录到失败列表。

**实现**：

```kotlin
class BatchProcessor(
    private val repository: Repository,
    private val processor: ItemProcessor
) {
    data class BatchResult(
        val processed: Int,
        val failed: List<Pair<Long, Exception>>
    )
    
    suspend fun processBatch(ids: List<Long>): BatchResult = supervisorScope {
        val failures = mutableListOf<Pair<Long, Exception>>()
        var processed = 0
        
        coroutineScope {
            ids.chunked(100).forEach { chunk ->
                launch {
                    chunk.forEach { id ->
                        try {
                            val item = repository.get(id)
                            processor.process(item)
                            processed++
                        } catch (e: CancellationException) {
                            throw e
                        } catch (e: Exception) {
                            synchronized(failures) {
                                failures.add(id to e)
                            }
                        }
                    }
                }
            }
        }
        
        BatchResult(processed, failures.toList())
    }
}
```

### 9.7 案例：Android Crashlytics 集成

```kotlin
class CrashlyticsExceptionHandler : CoroutineExceptionHandler {
    override val key = CoroutineExceptionHandler
    
    override fun handleException(context: CoroutineContext, exception: Throwable) {
        val coroutineName = context[CoroutineName]?.name ?: "unnamed"
        val dispatcher = context[CoroutineDispatcher]?.toString() ?: "unknown"
        
        // 上报到 Firebase Crashlytics
        FirebaseCrashlytics.getInstance().apply {
            setCustomKey("coroutine_name", coroutineName)
            setCustomKey("dispatcher", dispatcher)
            recordException(exception)
        }
    }
}

// Application 中初始化
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        
        val handler = CrashlyticsExceptionHandler()
        ProcessLifecycleOwner.get().lifecycleScope
            .launch(SupervisorJob() + handler) {
                // 应用全局协程
            }
    }
}
```

### 9.8 案例：单元测试中的异常断言

```kotlin
import kotlinx.coroutines.test.*
import org.junit.Test

class MyServiceTest {
    @Test
    fun `should propagate exception to caller`() = runTest {
        val service = MyService()
        
        // 验证异常被正确抛出
        val exception = assertFailsWith<NetworkException> {
            service.fetchData("invalid_url")
        }
        assertEquals("Invalid URL", exception.message)
    }
    
    @Test
    fun `should not fail siblings in supervisorScope`() = runTest {
        val service = MyService()
        var siblingCompleted = false
        
        supervisorScope {
            launch {
                try {
                    service.failingOp()
                } catch (e: Exception) {
                    if (e !is CancellationException) {
                        // 处理
                    }
                }
            }
            launch {
                delay(100)
                siblingCompleted = true
            }
        }
        
        assertTrue(siblingCompleted)
    }
    
    @Test
    fun `should cancel children when parent fails`() = runTest {
        var childCancelled = false
        
        try {
            coroutineScope {
                launch {
                    try {
                        delay(Long.MAX_VALUE)
                    } catch (e: CancellationException) {
                        childCancelled = true
                        throw e
                    }
                }
                launch {
                    delay(100)
                    throw RuntimeException("parent fails")
                }
            }
        } catch (e: Exception) {
            // 预期
        }
        
        assertTrue(childCancelled)
    }
}
```

---

## 10. 习题

### 10.1 基础题

**题目 1**：以下代码的输出是什么？

```kotlin
val scope = CoroutineScope(Dispatchers.Default)
scope.launch {
    launch { throw RuntimeException("A") }
    launch { delay(100); println("B") }
}
Thread.sleep(500)
```

<details>
<summary>答案</summary>

输出：

```
Exception in thread "DefaultDispatcher-worker-2" java.lang.RuntimeException: A
```

`B` 不会被打印，因为子协程 A 失败会取消兄弟协程 B。
</details>

**题目 2**：如何修改上述代码，使 `B` 能正常运行？

<details>
<summary>答案</summary>

```kotlin
val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
// 或
scope.launch {
    supervisorScope {
        launch { throw RuntimeException("A") }
        launch { delay(100); println("B") }
    }
}
```
</details>

**题目 3**：以下代码会输出什么？

```kotlin
try {
    scope.launch {
        throw RuntimeException("error")
    }.join()
} catch (e: Exception) {
    println("Caught: $e")
}
```

<details>
<summary>答案</summary>

`Caught` 不会被打印，因为 `launch` 的异常无法通过外层 `try/catch` 捕获。异常会传播到根协程，触发 `CoroutineExceptionHandler` 或 `Thread.UncaughtExceptionHandler`。
</details>

### 10.2 进阶题

**题目 4**：实现一个 `retryOnFailure` 协程构建器，支持自定义重试策略。

```kotlin
suspend fun <T> retryOnFailure(
    retries: Int = 3,
    delayMs: Long = 100,
    predicate: (Throwable) -> Boolean = { it !is CancellationException },
    block: suspend () -> T
): T {
    // TODO
}
```

<details>
<summary>答案</summary>

```kotlin
suspend fun <T> retryOnFailure(
    retries: Int = 3,
    delayMs: Long = 100,
    predicate: (Throwable) -> Boolean = { it !is CancellationException },
    block: suspend () -> T
): T {
    var lastError: Throwable? = null
    repeat(retries) {
        try {
            return block()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Throwable) {
            if (!predicate(e)) throw e
            lastError = e
            delay(delayMs)
        }
    }
    throw lastError ?: IllegalStateException("No attempt made")
}
```
</details>

**题目 5**：以下代码的输出是什么？

```kotlin
val handler = CoroutineExceptionHandler { _, e ->
    println("Handler: $e")
}

val scope = CoroutineScope(SupervisorJob() + handler)
val deferred = scope.async {
    delay(100)
    throw RuntimeException("async error")
}

scope.launch {
    delay(200)
    println("launch done")
}

Thread.sleep(500)
```

<details>
<summary>答案</summary>

输出：

```
launch done
```

`Handler` 不会被调用，因为 `async` 的异常被封装在 `Deferred` 中，不会触发 `CoroutineExceptionHandler`。需要显式 `await` 才能抛出异常。
</details>

### 10.3 应用题

**题目 6**：设计一个"并发请求聚合器"，对多个 API 并发请求，返回所有结果（成功的值与失败的异常）。

<details>
<summary>答案</summary>

```kotlin
sealed class ApiResult<out T> {
    data class Success<T>(val value: T) : ApiResult<T>()
    data class Failure(val error: Throwable) : ApiResult<Nothing>()
}

suspend fun <T> gatherAll(vararg blocks: suspend () -> T): List<ApiResult<T>> = coroutineScope {
    blocks.map { block ->
        async {
            try {
                ApiResult.Success(block())
            } catch (e: CancellationException) {
                throw e
            } catch (e: Throwable) {
                ApiResult.Failure(e)
            }
        }
    }.awaitAll()
}
```
</details>

**题目 7**：以下代码会输出什么？解释原因。

```kotlin
runBlocking {
    val job = launch {
        try {
            delay(Long.MAX_VALUE)
        } finally {
            println("Finally 1")
            delay(100)
            println("Finally 2")
        }
    }
    delay(100)
    job.cancel()
    job.join()
    println("Done")
}
```

<details>
<summary>答案</summary>

输出：

```
Finally 1
Done
```

`Finally 2` 不会被打印，因为 `delay(100)` 在 `finally` 中会抛出 `CancellationException`（协程正在取消），无法继续执行。要在 `finally` 中执行挂起函数，必须用 `withContext(NonCancellable)` 包裹。
</details>

### 10.4 分析题

**题目 8**：分析以下代码的执行流程，描述异常的传播路径。

```kotlin
val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

scope.launch {
    println("Parent start")
    coroutineScope {
        launch {
            delay(50)
            throw RuntimeException("Child 1 fails")
        }
        launch {
            delay(200)
            println("Child 2 done")
        }
    }
    println("Parent end")
}
```

<details>
<summary>答案</summary>

执行流程：
1. 父协程启动，打印 "Parent start"。
2. 进入 `coroutineScope`，启动两个子协程。
3. 50ms 后，Child 1 抛出异常。
4. `coroutineScope` 是传播语义，取消 Child 2。
5. Child 2 被取消，不打印 "Child 2 done"。
6. `coroutineScope` 抛出 Child 1 的异常。
7. 父协程的 `coroutineScope` 调用抛出，父协程进入 Cancelling。
8. "Parent end" 不会被打印。
9. 异常传播到 `SupervisorJob` 的根，被 `CoroutineExceptionHandler` 处理（如果有）或 `UncaughtExceptionHandler`。

注意：`SupervisorJob` 在最外层，不影响 `coroutineScope` 内的传播语义。
</details>

### 10.5 设计题

**题目 9**：设计一个支持"熔断器"模式的协程工具，在连续失败 N 次后熔断一段时间。

<details>
<summary>答案</summary>

```kotlin
class CircuitBreaker(
    private val failureThreshold: Int = 5,
    private val resetTimeoutMs: Long = 10000
) {
    private var failureCount = 0
    private var lastFailureTime: Long = 0
    private val mutex = Mutex()
    
    suspend fun <T> execute(block: suspend () -> T): T {
        mutex.withLock {
            if (failureCount >= failureThreshold) {
                val elapsed = System.currentTimeMillis() - lastFailureTime
                if (elapsed < resetTimeoutMs) {
                    throw CircuitOpenException("Circuit open, retry in ${resetTimeoutMs - elapsed}ms")
                }
                // 半开状态，尝试恢复
                failureCount = 0
            }
        }
        
        return try {
            val result = block()
            mutex.withLock { failureCount = 0 }
            result
        } catch (e: CancellationException) {
            throw e
        } catch (e: Throwable) {
            mutex.withLock {
                failureCount++
                lastFailureTime = System.currentTimeMillis()
            }
            throw e
        }
    }
}

class CircuitOpenException(message: String) : RuntimeException(message)
```
</details>

**题目 10**：分析以下代码的潜在问题，并给出改进建议。

```kotlin
class UserRepository(private val api: UserApi) {
    private val scope = CoroutineScope(Dispatchers.IO)
    
    fun loadUsers(): Deferred<List<User>> = scope.async {
        api.getUsers()
    }
}
```

<details>
<summary>答案</summary>

问题：
1. `scope` 没有指定 `SupervisorJob`，一个 async 失败会影响其他。
2. 没有异常处理，未 await 的 async 异常会被吞掉。
3. `scope` 没有提供取消机制，可能泄漏。
4. 没有超时控制，可能永久阻塞。

改进：

```kotlin
class UserRepository(
    private val api: UserApi,
    private val timeoutMs: Long = 5000
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val handler = CoroutineExceptionHandler { _, e ->
        logger.error("Repository error", e)
    }
    
    suspend fun loadUsers(): List<User> {
        return withTimeout(timeoutMs) {
            try {
                api.getUsers()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                logger.error("Load users failed", e)
                throw e
            }
        }
    }
    
    fun shutdown() {
        scope.cancel()
    }
}
```
</details>

---

## 11. 参考文献

### 11.1 官方文档

1. JetBrains. "Coroutines exceptions handling." *Kotlin Coroutines Documentation*, 2024. https://kotlinlang.org/docs/coroutine-exceptions.html

2. JetBrains. "Coroutine exceptions and supervisions." *Kotlin Coroutines Design*, 2018. https://github.com/Kotlin/KEEP/blob/master/proposals/coroutines.md

3. JetBrains. "Structured concurrency." *Kotlin Coroutines Documentation*, 2024. https://kotlinlang.org/docs/coroutines-basics.html#structured-concurrency

### 11.2 学术论文

4. Hoare, C. A. R. "Communicating sequential processes." *Communications of the ACM* 21.8 (1978): 666-677.

5. Reynolds, John C. "Definitional interpreters for higher-order programming languages." *Higher-Order and Symbolic Computation* 11.4 (1998): 363-397.

6. Sussman, Gerald Jay, and Guy Lewis Steele Jr. "Scheme: An interpreter for extended lambda calculus." *MIT AI Memo* 349 (1975).

7. Appel, Andrew W. "Compiling with Continuations." *Cambridge University Press*, 1992.

8. Dijkstra, Edsger W. "Cooperating sequential processes." *Programming Languages: NATO Advanced Study Institute*, 1965.

### 11.3 Kotlin 提案与演进

9. Elizarov, Roman. "KEEP-154: Structured concurrency." *Kotlin Evolution and Enhancement Process*, 2018. https://github.com/Kotlin/KEEP/blob/master/proposals/structured-concurrency.md

10. Elizarov, Roman. "KEEP-155: Coroutine exceptions and supervision." *Kotlin Evolution and Enhancement Process*, 2018. https://github.com/Kotlin/KEEP/blob/master/proposals/coroutine-exception-handling.md

11. Elizarov, Roman. "Cancellation and timeouts." *Kotlin Coroutines Documentation*, 2024. https://kotlinlang.org/docs/cancellation-and-timeouts.html

### 11.4 Reactive Streams 与对比

12. Reactive Streams. "Reactive Streams Specification." *JVM Specification*, 2015. https://github.com/reactive-streams/reactive-streams-jvm

13. ReactiveX. "RxJava: Reactive Extensions for the JVM." *GitHub Documentation*, 2024. https://github.com/ReactiveX/RxJava

14. Pivotal Software. "Project Reactor Reference." *Spring Framework Documentation*, 2024. https://projectreactor.io/docs/core/release/reference/

### 11.5 跨语言参考

15. Swift Evolution. "SE-0296: Async/await." *Swift Evolution Proposals*, 2020. https://github.com/apple/swift-evolution/blob/main/proposals/0296-async-await.md

16. Swift Evolution. "SE-0306: Concurrency Interoperability with Objective-C." *Swift Evolution Proposals*, 2020.

17. Go Documentation. "Concurrency patterns." *Go Programming Language Documentation*, 2024. https://go.dev/blog/pipelines

18. ECMA International. "ECMAScript 2024: Promise.allSettled." *ECMA-262 Specification*, 2024.

### 11.6 工程实践

19. Google. "Android Kotlin Flow: Handle errors." *Android Developers Documentation*, 2024. https://developer.android.com/kotlin/flow#errors

20. Jetbrains. "Testing coroutines." *Kotlin Coroutines Testing Documentation*, 2024. https://kotlin.github.io/kotlinx.coroutines/kotlinx-coroutines-test/

### 11.7 字节码与实现

21. JetBrains. "Kotlin coroutines internals: Job state machine." *Kotlin Source Code*, 2024. https://github.com/JetBrains/kotlin/blob/master/libraries/stdlib/src/kotlin/coroutines/Job.kt

22. JetBrains. "kotlinx-coroutines-core: SupervisorJob implementation." *Coroutines Source Code*, 2024. https://github.com/Kotlin/kotlinx.coroutines/blob/master/kotlinx-coroutines-core/common/src/SupervisorKt.kt

### 11.8 KMP 与跨平台

23. JetBrains. "Kotlin Multiplatform: Coroutines." *KMP Documentation*, 2024. https://kotlinlang.org/docs/multiplatform.html

24. Touchlab. "KMP exception handling best practices." *Touchlab Blog*, 2024. https://touchlab.co/kmp-exception-handling

### 11.9 性能与基准

25. Elizarov, Roman. "Kotlin coroutines performance benchmarks." *Roman Elizarov Blog*, 2020. https://medium.com/@elizarov/coroutines-vs-threads-benchmarks-aa2f678f6f29

### 11.10 测试与调试

26. JetBrains. "DebugProbes API." *kotlinx-coroutines-debug Documentation*, 2024. https://github.com/Kotlin/kotlinx.coroutines/tree/master/kotlinx-coroutines-debug

---

## 12. 延伸阅读

### 12.1 进阶主题

- **Kotlin 2.0 K2 编译器对协程异常堆栈的优化**：理解 K2 如何减少异常堆栈的中间帧。
- **Virtual Threads (Loom) 与协程的异常互操作**：JVM 21 上异常处理路径的一致性。
- **KMP 中的异常处理一致性**：JS、Native 平台与 JVM 的差异。
- **Flow 的异常传播语义**：`Flow.catch` 与 `Flow.retry` 的实现原理。
- **结构化并发的未来**：Swift、Java、Python 的结构化并发提案对比。

### 12.2 相关项目

- **kotlinx.coroutines**：官方协程库源码，重点阅读 `Job.kt`、`SupervisorKt.kt`、`CoroutineExceptionHandler.kt`。
- **Arrow-kt**：函数式异常处理库，提供 `Either`、`Validated` 等替代异常的方案。
- **Kotlin Result**：标准库的 `Result<T>` 类型，函数式异常处理。
- **Spring Boot Coroutines**：Spring 对协程的支持，重点阅读 `ControllerAdvice` 与协程的集成。

### 12.3 相关书籍

- **《Kotlin in Action》**（Dmitry Jemerov, Svetlana Isakova）：第 11 章 协程。
- **《The Joy of Kotlin》**（Pierre-Yves Saumont）：第 9-11 章 异常处理与函数式错误。
- **《Functional Programming in Kotlin》**（Marco Vermeulen）：第 8 章 处理错误。
- **《Kotlin Coroutines Deep Dive》**（Roman Elizarov, Marcin Moskala）：协程异常处理的完整解析。

### 12.4 社区资源

- **Kotlin Slack**：`#coroutines` 频道，与 JetBrains 团队直接交流。
- **Kotlin Discussions**：https://discuss.kotlinlang.org/，协程异常处理讨论。
- **Stack Overflow**：`kotlin-coroutines` 标签，常见问题与解答。
- **GitHub Issues**：https://github.com/Kotlin/kotlinx.coroutines/issues，官方追踪与讨论。

### 12.5 实践项目

建议实践以下项目以巩固协程异常处理：

1. **实现一个完整的协程异常上报系统**：集成 Crashlytics、Sentry、Bugly 等多个后端。
2. **实现一个"断路器"模式**：基于协程的熔断与半开状态机。
3. **对比 RxJava 与协程的异常处理**：迁移一个 RxJava 项目到协程，对比异常处理代码。
4. **实现一个事务补偿框架**：基于 `supervisorScope` 的分布式事务补偿。
5. **实现一个 KMP 跨平台异常处理库**：统一 JVM、iOS、JS 的异常上报接口。

---

## 总结

Kotlin 协程的异常处理机制是其"结构化并发"理念的核心体现。通过将异常处理与 `Job` 层级绑定，Kotlin 实现了"异常自然传播、显式隔离可控"的设计目标。理解以下核心要点至关重要：

1. **异常默认向上传播**：子协程的未捕获异常会取消父协程与兄弟协程。
2. **SupervisorJob 显式隔离**：在需要"独立子任务"的场景使用，避免一个失败影响全部。
3. **CoroutineExceptionHandler 是最后防线**：仅对 `launch` 根协程生效，不能用于业务恢复。
4. **CancellationException 必须重新抛出**：吞掉它会破坏结构化并发，导致协程泄漏。
5. **try/catch 无法跨协程**：`launch` 的异常无法被外层 `try/catch` 捕获，需用 `async + await` 或在协程内部捕获。
6. **finally 中的挂起函数需要 NonCancellable**：否则会被取消异常中断。
7. **async 的异常延迟到 await**：未 await 的 async 异常会被吞掉，需小心处理。

掌握这些要点，开发者才能在生产环境中正确处理协程异常，构建可靠、可观测的异步系统。
