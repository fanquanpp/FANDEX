---
order: 80
title: Java与响应式编程
module: java
category: Java
difficulty: advanced
description: Reactive Streams 规范、Project Reactor、Spring WebFlux 与响应式系统设计的系统性深度剖析
author: fanquanpp
updated: '2026-07-21'
related:
  - java/Java与安全
  - java/Java与WebAssembly
  - java/方法详解
  - java/Java与虚拟线程
  - java/Java函数式编程
  - java/SpringBoot数据访问
prerequisites:
  - java/概述与开发环境
  - java/Java函数式编程
  - java/并发编程基础
tags:
  - Java
  - Reactive
  - ReactiveStreams
  - ProjectReactor
  - WebFlux
  - RxJava
  - Backpressure
  - RSocket
---

# Java 响应式编程深度指南

> 响应式编程（Reactive Programming, RP）是一种基于异步数据流与变化传播的编程范式。在 Java 生态中，它从 2010 年代初的 RxJava 1.x 起步，经 Reactive Streams 规范（2015）的标准化，到 Project Reactor 与 Spring WebFlux 的工业化落地，最终在云原生时代与虚拟线程、GraalVM Native Image 等技术深度融合，形成了完整的响应式系统栈。本文将以"为什么需要响应式"为切入点，以 Reactive Streams 规范为理论骨架，以 Project Reactor 为主要实现载体，以 Spring WebFlux 为工程落地，系统性地剖析响应式编程的语义、机制、陷阱与最佳实践，让读者既能编写出正确的响应式代码，也能判断何时该用响应式、何时该用命令式。

---

## 1. 学习目标（基于 Bloom 分类法）

本节以 Bloom 教育目标分类法（Anderson 2001 修订版）为框架，对学习目标进行显式分级。

### 1.1 认知层级目标

| 层级（Level） | 行为动词 | 具体学习目标 |
|--------------|---------|-------------|
| 记忆（Remember） | 列举、识别、定义 | 列举 Reactive Streams 的 4 个核心接口，识别 Mono 与 Flux 的语义差异，定义背压（Backpressure） |
| 理解（Understand） | 解释、归纳、对比 | 解释响应式流的推拉混合模型，对比 Cold 与 Hot Publisher，归纳 Schedulers 的线程调度策略 |
| 应用（Apply） | 实现、使用、演示 | 使用 Reactor 操作符组合数据流，使用 WebFlux 实现非阻塞 REST API，演示背压控制策略 |
| 分析（Analyze） | 分解、辨别、推断 | 分解 flatMap 与 concatMap 的并发语义，推断 subscribeOn 与 publishOn 的线程切换链路，辨别响应式栈与命令式栈的调试差异 |
| 评价（Evaluate） | 评判、论证、批判 | 评判响应式编程的适用场景边界，论证虚拟线程是否会取代响应式，批判过度使用操作符导致代码可读性下降 |
| 创造（Create） | 设计、构建、重构 | 设计基于 R2DBC + WebFlux 的全栈响应式微服务，构建自定义 Operator 与 Hooks，重构命令式代码为响应式风格 |

### 1.2 学习成果自检清单

完成本章学习后，读者应能独立完成以下任务：

1. 在不查阅文档的前提下，写出 Reactive Streams 的 4 个核心接口签名。
2. 用一句话向同事解释背压如何解决生产者快于消费者的问题。
3. 在白板上画出 `Flux.range(1, 10).publishOn(Schedulers.boundedElastic()).map(...).subscribeOn(Schedulers.parallel())` 的线程切换时序。
4. 实现一个支持背压的自定义 `Publisher`，能用 `request(n)` 控制发射速率。
5. 对比 WebFlux 与传统 Spring MVC 在线程模型、吞吐量、调试体验上的差异。
6. 设计一个响应式微服务的错误处理策略，包含重试、降级、熔断三层。

### 1.3 前置知识地图

```
Java 基础
    │
    ├── 并发编程（Thread、Executor、Future）
    ├── 函数式编程（Lambda、Stream、Optional）
    └── 异步编程（CompletableFuture、NIO）
            │
            ▼
Reactive Streams 规范（本章基础）
    │
    ├── Publisher / Subscriber / Subscription / Processor
    ├── 推拉混合模型（Push + Pull）
    └── 背压协议（request(n)）
            │
            ▼
Java 响应式编程（本章）
    │
    ├── 实现层：RxJava 3、Project Reactor 3、Mutiny
    ├── 操作符层：map、filter、flatMap、merge、zip、combineLatest
    ├── 调度层：Schedulers（parallel、boundedElastic、single、elastic）
    ├── Web 层：Spring WebFlux、Reactor Netty、RSocket
    ├── 数据层：R2DBC、Reactive MongoDB、Reactive Redis
    └── 工程实践：调试、测试、错误处理、监控、与虚拟线程对比
```

### 1.4 章节阅读建议

- **零基础读者**：建议按顺序阅读第 2-5 节，配合第 5 节代码示例上机实操，先理解"流"的概念再学习操作符。
- **有命令式 Java 经验的工程师**：可跳过第 2 节基础部分，直接阅读第 3 节 Reactive Streams 规范、第 4 节 Reactor 内部机制、第 7 节反模式。
- **架构师**：重点关注第 6 节对比分析、第 8 节工程实践与第 9 节案例研究，特别是响应式与虚拟线程的选型决策。

---

## 2. 历史动机与演化

### 2.1 响应式编程的诞生背景

响应式编程的根源可以追溯到 1960 年代的 **数据流编程**（Dataflow Programming）与 **函数响应式编程**（Functional Reactive Programming, FRP）。Conal Elliott 在 1997 年的 Fran（Functional Reactive Animation）论文中首次系统化提出 FRP，用于建模连续时间与离散事件的混合系统。

但现代"响应式编程"的工业化起点是 2009 年微软的 Erik Meijer 团队推出的 **Rx.NET**（Reactive Extensions for .NET）。Rx.NET 的核心创新是将"异步事件流"抽象为可组合的 `IObservable<T>`，使其能像集合一样被 `map`、`filter`、`merge` 操作。这一抽象彻底改变了异步编程的表达方式。

### 2.2 Java 响应式生态的演化

| 年份 | 里程碑 | 说明 |
|------|--------|------|
| 2010 | RxJava 1.x 启动 | Netflix 从 .NET 移植 Rx，用于流媒体平台的高并发场景 |
| 2013 | RxJava 1.0 发布 | 成为 Java 生态第一个工业化响应式库 |
| 2015 | Reactive Streams 1.0 | Netflix、Pivotal、Lightbend 等联合制定规范（RS规范） |
| 2016 | Project Reactor 2.0 | Pivotal 推出与 RS 规范原生兼容的响应式库 |
| 2017 | Spring Framework 5 | 引入 WebFlux，全面拥抱 Reactor |
| 2018 | RxJava 3.0 | 重构 API，完全兼容 RS 规范，与 Reactor 形成双雄格局 |
| 2019 | R2DBC 0.8 | 响应式数据库连接规范发布 |
| 2020 | Spring Boot 2.4 | 响应式栈成熟，支持 R2DBC、Reactive Redis、Reactive MongoDB |
| 2021 | Project Loom 早期访问 | 虚拟线程预览，挑战响应式编程的"轻量并发"价值 |
| 2023 | Java 21 GA | 虚拟线程正式发布，引发"虚拟线程 vs 响应式"大讨论 |
| 2024 | Reactor 3.6 / RxJava 3.1.x | 持续演进，与虚拟线程、GraalVM 深度集成 |

### 2.3 Reactive Streams 规范的诞生

2013-2015 年间，Java 生态出现了多个响应式库（RxJava 1.x、Reactor 1.x、Akka Streams），但它们的 API 互不兼容。一个使用 RxJava 的库无法直接被 Reactor 用户使用，需要适配层。这导致响应式生态碎片化，难以形成统一的工具链。

2015 年 4 月，来自 Netflix、Pivotal、Lightbend、Twitter 等公司的工程师联合发布了 **Reactive Streams 规范**（RS规范，规范号 RS-1.0）。该规范定义了 4 个核心接口与一套非阻塞背压协议，目标是让不同实现之间能互操作：

```
Publisher<T>      // 数据生产者
    │
    │ subscribe(Subscriber)
    ▼
Subscriber<T>     // 数据消费者
    │
    │ onSubscribe(Subscription)
    │ onNext(T) × N
    │ onError(Throwable) | onComplete()
    ▼
Subscription      // 订阅关系（控制背压）
    │
    │ request(long n)
    │ cancel()
    ▼
Processor<T, R>   // 既是 Publisher 又是 Subscriber（中间操作符）
```

RS 规范的关键贡献：

1. **标准化**：所有实现共享同一套接口，可通过 `Publisher` 通用类型互操作。
2. **背压强制**：规范第 3 条要求 `Subscriber` 必须通过 `request(n)` 主动请求，`Publisher` 不得在 `request` 之前发送数据。
3. **线程安全**：规范规定了 `onNext`、`onError`、`onComplete` 的串行调用语义，无需外部同步。
4. **JDK 标准化**：Java 9 将 RS 规范的 4 个接口搬入 `java.util.concurrent.Flow` 类，成为 JDK 标准。

### 2.4 设计哲学：异步非阻塞与可组合性

响应式编程的设计哲学可概括为：

- **异步非阻塞**：所有 I/O 操作（HTTP、DB、文件）均非阻塞，线程不等待结果，而是注册回调，由事件循环（Event Loop）在结果就绪时唤醒。
- **声明式组合**：通过操作符（map、filter、flatMap、merge、zip）将多个异步操作组合成数据流管道，避免回调地狱。
- **背压传播**：消费速率反向传播给生产者，避免生产者压垮消费者。
- **资源高效**：少量线程（通常等于 CPU 核心数）服务大量并发请求，避免线程上下文切换开销。

这一哲学的核心动机是 **I/O 密集型场景下的资源效率**。传统命令式 Java 使用"一个请求一个线程"（Thread-per-Request）模型，每个阻塞 I/O 都让线程睡眠，造成线程资源浪费。响应式通过事件循环 + 非阻塞 I/O，用少量线程服务海量并发，显著提升吞吐量。

> **历史轶事**：Netflix 在 2013 年将 Rx.NET 移植到 Java 时，主要动机是解决流媒体平台的 API 网关问题。传统 Servlet 容器（Tomcat）的线程模型无法支撑 Netflix 每秒数十万的 API 调用，RxJava 让 Netflix 用 200 个线程服务了 10 万并发，性能提升 10 倍以上。这一案例直接推动了 RS 规范的诞生。

---

## 3. 形式化定义

### 3.1 响应式流的形式化定义

响应式流是一个三元组 $(P, S, T)$，其中：

- $P$ 是 **Publisher**，即数据生产者，定义为：
  $$P: \text{Publisher}\langle T \rangle = \{ \text{subscribe}: (S: \text{Subscriber}\langle T \rangle) \to \text{void} \}$$
- $S$ 是 **Subscriber**，即数据消费者，定义为：
  $$S: \text{Subscriber}\langle T \rangle = \{ \text{onSubscribe}: \text{Subscription} \to \text{void}, \text{onNext}: T \to \text{void}, \text{onError}: \text{Throwable} \to \text{void}, \text{onComplete}: \text{void} \to \text{void} \}$$
- $T$ 是 **Subscription**，即订阅关系，定义为：
  $$T: \text{Subscription} = \{ \text{request}: \text{long} \to \text{void}, \text{cancel}: \text{void} \to \text{void} \}$$

### 3.2 背压协议的形式化定义

Reactive Streams 规范的背压协议可形式化为以下不变式：

$$\forall t: \text{count}(\text{onNext at } t) \leq \text{count}(\text{request before } t)$$

即：**任意时刻 `t`，`Publisher` 发送的数据量不超过 `Subscriber` 累计请求的数据量**。

这一定义的关键含义：

1. `Publisher` 不得在 `Subscriber` 调用 `request(n)` 之前发送任何 `onNext`。
2. `request(n)` 是累计的：`request(5)` 后再 `request(3)` 表示总共请求 8 个。
3. `request(Long.MAX_VALUE)` 表示"无背压"，即 `Publisher` 可任意发送。
4. 一旦 `onError` 或 `onComplete` 被调用，`Subscription` 终止，后续 `request` 无效。

### 3.3 Cold 与 Hot Publisher 的形式化区分

**Cold Publisher**（冷发布者）的语义：每个 `Subscriber` 都触发独立的数据生成过程。

$$\forall S_1, S_2: S_1 \neq S_2 \implies \text{stream}(P, S_1) \perp \text{stream}(P, S_2)$$

即两个不同订阅者得到的是独立的数据流（如 HTTP 请求：每个订阅者都发起一次新请求）。

**Hot Publisher**（热发布者）的语义：所有 `Subscriber` 共享同一个数据源，后加入的订阅者只能收到加入后的数据。

$$\forall S_1, S_2: \text{stream}(P, S_1) = \text{stream}(P, S_2) \text{ (after subscribe time)}$$

即所有订阅者共享同一数据流（如鼠标点击事件：后加入的订阅者只能收到后续点击）。

形式化判定：

$$\text{isCold}(P) \iff \forall S: \text{subscribe}(P, S) \text{ triggers data generation}$$
$$\text{isHot}(P) \iff \exists S: \text{subscribe}(P, S) \text{ does not trigger data generation}$$

### 3.4 操作符的代数性质

响应式操作符可视为数据流上的函数，满足以下代数性质：

1. **map 的函子律**（Functor Law）：
   - 恒等律：`map(x -> x) === identity`
   - 复合律：`map(f).map(g) === map(f.andThen(g))`

2. **flatMap 的单子律**（Monad Law）：
   - 左单位律：`flatMap(x -> just(x)) === identity`
   - 右单位律：`flatMap(x -> just(f(x))) === map(f)`
   - 结合律：`flatMap(f).flatMap(g) === flatMap(x -> f(x).flatMap(g))`

3. **filter 的选择律**：
   - `filter(p).filter(q) === filter(p.and(q))`

4. **merge 的交换律**：
   - `merge(a, b) === merge(b, a)`（不考虑顺序时）

这些代数性质是响应式编程可组合性的理论基础，使开发者能用统一的函数式思维处理异步流。

### 3.5 背压策略的形式化分类

当生产者速率高于消费者时，背压策略可分为 4 类：

1. **缓冲（Buffer）**：在 `Publisher` 端缓存溢出数据。
   $$\text{buffer}(P, n) = P \text{ with bounded queue of size } n$$

2. **丢弃（Drop）**：丢弃无法及时处理的数据。
   $$\text{drop}(P, n) = P \text{ dropping elements when queue full}$$

3. **最新（Latest）**：只保留最新一个数据。
   $$\text{latest}(P) = P \text{ keeping only the most recent element}$$

4. **错误（Error）**：抛出 `OverflowException`。
   $$\text{error}(P, n) = P \text{ throwing on overflow}$$

形式化选择依据：

$$\text{strategy}(P, C) = \begin{cases}
\text{buffer} & \text{if data loss unacceptable and memory allows} \\
\text{drop} & \text{if data loss tolerable and throughput critical} \\
\text{latest} & \text{if only latest state matters (e.g., UI updates)} \\
\text{error} & \text{if overflow indicates a bug}
\end{cases}$$

---

## 4. 理论推导：响应式流的内部机制

### 4.1 Reactive Streams 规范的 4 条核心规则

Reactive Streams 规范定义了 4 条核心规则，所有实现必须遵守：

**规则 1：`Subscriber` 必须通过 `request(n)` 主动请求**

`Publisher` 不得在 `onSubscribe` 之后立即发送数据，必须等待 `Subscriber` 调用 `request`。这避免了"生产者推送过快"的问题。

**规则 2：`onNext` 调用必须串行且非阻塞**

`onNext`、`onError`、`onComplete` 必须串行调用（不可并发），且不得阻塞。如果处理耗时，应在内部异步调度。

**规则 3：`request(n)` 与 `cancel()` 必须线程安全**

`Subscription.request` 与 `cancel` 可能被不同线程调用，实现必须保证线程安全（通常用 `AtomicLong` 或 `Volatile`）。

**规则 4：`Subscription` 必须支持 `cancel` 后无副作用**

`cancel` 后，`Publisher` 必须停止发送 `onNext`，并尽快释放资源（如关闭文件、释放网络连接）。

### 4.2 Reactor 的内部数据结构

Project Reactor 的 `Flux` 与 `Mono` 内部以 **链式操作符** 表示数据流。每个操作符是一个 `FluxOperator`，持有上游 `Publisher` 引用：

```
Flux.range(1, 10)
    .map(x -> x * 2)
    .filter(x -> x > 5)
    .subscribe(subscriber);

// 内部结构（简化）
FluxFilter(
    FluxMap(
        FluxRange(1, 10),
        x -> x * 2
    ),
    x -> x > 5
)
```

当 `subscribe` 被调用时，从下游向上游逐级调用 `subscribe`，最终在 `FluxRange` 处启动数据生成。每个操作符创建一个中间 `Subscriber`，连接上下游：

```
FluxRange → RangeSubscription → MapSubscriber → FilterSubscriber → 用户 Subscriber
                                  (map)          (filter)
```

这一设计的关键性质：

1. **惰性求值**：在 `subscribe` 之前，整个链条不执行任何操作。
2. **反向订阅**：`subscribe` 从下游向上游传播，数据从上游向下游流动。
3. **中间 Subscriber**：每个操作符既是上游的 `Subscriber`，又是下游的 `Publisher`。

### 4.3 背压的实现机制

Reactor 的背压通过 `Subscription.request(n)` 实现。以 `Flux.range` 为例：

```java
// 简化的 RangeSubscription
class RangeSubscription implements Subscription {
    final Subscriber<? super Integer> actual;
    final int end;
    int current = 0;
    AtomicLong requested = new AtomicLong(0);
    volatile boolean cancelled = false;

    public void request(long n) {
        if (n <= 0) {
            actual.onError(new IllegalArgumentException());
            return;
        }
        // 累加请求量（处理溢出）
        for (;;) {
            long r = requested.get();
            long u = r + n;
            if (u < 0) u = Long.MAX_VALUE; // 溢出处理
            if (requested.compareAndSet(r, u)) break;
        }
        drain(); // 触发数据发射
    }

    void drain() {
        for (;;) {
            long r = requested.get();
            long emitted = 0;
            while (emitted < r && current < end && !cancelled) {
                actual.onNext(current++);
                emitted++;
            }
            if (emitted > 0) {
                requested.addAndGet(-emitted); // 扣减已发射量
            }
            if (current >= end) {
                actual.onComplete();
                return;
            }
            if (emitted == 0) break; // 无请求量，退出
        }
    }
}
```

**关键机制**：

1. **AtomicLong 累加**：`requested` 用原子变量累加，支持多线程 `request`。
2. **drain 循环**：每次 `request` 触发 `drain`，循环发射数据直到请求量耗尽。
3. **CAS 扣减**：发射后通过 `addAndGet(-emitted)` 扣减请求量，避免超发。
4. **取消检查**：每次发射前检查 `cancelled`，及时停止。

### 4.4 操作符的并发语义

不同操作符有不同的并发语义：

| 操作符 | 并发性 | 顺序性 | 说明 |
|--------|--------|--------|------|
| `map` | 同步 | 顺序 | 一个输入对应一个输出 |
| `filter` | 同步 | 顺序 | 过滤后输出 |
| `flatMap` | 异步并发 | 无序 | 每个元素触发内部 Publisher，并发合并 |
| `concatMap` | 异步串行 | 顺序 | 内部 Publisher 顺序执行，前一个完成才下一个 |
| `switchMap` | 异步切换 | 最新 | 新元素到来时取消前一个内部 Publisher |
| `merge` | 异步并发 | 无序 | 合并多个 Publisher，无序输出 |
| `zip` | 异步并发 | 配对 | 等待所有 Publisher 各出一个，组合后输出 |
| `combineLatest` | 异步并发 | 最新 | 任一 Publisher 出新值时，组合所有最新值 |

**`flatMap` vs `concatMap` 的关键差异**：

```java
Flux.range(1, 3)
    .flatMap(i -> Flux.range(i * 10, 2).delayElements(Duration.ofMillis(10)))
    .subscribe(System.out::println);
// 输出顺序：可能 10, 11, 20, 21, 30, 31（顺序）
//          也可能 10, 20, 11, 30, 21, 31（交错）

Flux.range(1, 3)
    .concatMap(i -> Flux.range(i * 10, 2).delayElements(Duration.ofMillis(10)))
    .subscribe(System.out::println);
// 输出顺序：必然 10, 11, 20, 21, 30, 31（严格顺序）
```

`flatMap` 适合"并行处理，结果不关心顺序"的场景（如并发 HTTP 请求）；`concatMap` 适合"顺序处理，前一个完成才下一个"的场景（如顺序写数据库）。

### 4.5 Schedulers 的线程调度模型

Reactor 的 `Schedulers` 提供了多种线程池：

| Scheduler | 线程池 | 用途 |
|-----------|--------|------|
| `Schedulers.parallel()` | 固定大小（默认 CPU 核心数） | CPU 密集型任务 |
| `Schedulers.boundedElastic()` | 有界弹性（默认 10 * CPU 核心数，队列 100000） | 阻塞 I/O 任务 |
| `Schedulers.single()` | 单线程 | 串行任务 |
| `Schedulers.immediate()` | 当前线程 | 不切换 |
| `Schedulers.fromExecutor(executor)` | 自定义 | 复用现有线程池 |

**`publishOn` vs `subscribeOn` 的差异**：

```java
Flux.range(1, 3)
    .map(i -> {
        log("map1: " + i); // 在 subscribeOn 指定的线程
        return i * 2;
    })
    .publishOn(Schedulers.parallel())
    .map(i -> {
        log("map2: " + i); // 在 publishOn 指定的线程
        return i + 1;
    })
    .subscribeOn(Schedulers.boundedElastic())
    .subscribe(i -> log("subscribe: " + i)); // 在 publishOn 指定的线程
```

**关键规则**：

1. `subscribeOn` 决定 **订阅链** 的执行线程（即 `subscribe` 调用向上游传播的线程）。它只影响 **第一个** 数据生成点。
2. `publishOn` 决定 **下游** 操作符的执行线程。它切换线程，后续操作符在新线程执行，直到遇到下一个 `publishOn`。
3. 多个 `publishOn` 会多次切换线程，但 `subscribeOn` 只生效一次（最靠近上游的那个）。

时序图：

```
subscribe() 调用
    │
    │ 在 subscribeOn(boundedElastic) 指定的线程
    ▼
range(1, 3) 生成数据
    │
    │ 仍在 boundedElastic
    ▼
map1 (i * 2)
    │
    │ publishOn(parallel) 切换线程
    ▼
map2 (i + 1)
    │
    │ 仍在 parallel
    ▼
subscribe (消费)
```

### 4.6 错误处理机制

响应式流的错误处理通过 `onError` 信号传播。`onError` 是终止信号，一旦触发，流终止，后续 `onNext` 不会执行。

Reactor 提供了多种错误处理操作符：

```java
// 1. 错误时返回默认值
flux.onErrorReturn(defaultValue);

// 2. 错误时返回另一个流
flux.onErrorResume(e -> Flux.just(1, 2, 3));

// 3. 错误时重试（固定次数）
flux.retry(3);

// 4. 错误时重试（带条件）
flux.retryWhen(Retry.backoff(3, Duration.ofMillis(100)));

// 5. 错误时映射异常
flux.mapError(e -> new BusinessException(e.getMessage()));

// 6. 错误时执行副作用
flux.doOnError(e -> log.error("Error", e));
```

**`retryWhen` 的指数退避**：

```java
flux.retryWhen(
    Retry.backoff(3, Duration.ofMillis(100))   // 最多重试 3 次，初始间隔 100ms
        .maxBackoff(Duration.ofSeconds(1))     // 最大间隔 1s
        .jitter(0.5)                            // 抖动 50%（避免惊群）
        .onRetryExhaustedThrow((spec, signal) -> 
            signal.failure())                   // 重试耗尽后抛原始异常
);
```

### 4.7 Hot Publisher 的生命周期

`ConnectableFlux` 是 Reactor 的 Hot Publisher 基类，其生命周期：

```
未连接（No Subscriber）
    │
    │ connect() 或 autoConnect(n)
    ▼
已连接（开始生成数据）
    │
    │ Subscriber 加入 → 收到后续数据
    │ Subscriber 退出 → 不再收到数据
    │
    │ 数据完成或出错
    ▼
终止（所有 Subscriber 收到 onComplete/onError）
```

**关键变体**：

1. `publish().refCount(n)`：当有 `n` 个订阅者时自动连接，所有订阅者退出后断开。
2. `replay(n).refCount()`：缓存最近 `n` 个数据，新订阅者收到缓存后再收新数据。
3. `cache()`：缓存所有数据，新订阅者收到全部缓存（适合冷数据转热）。

### 4.8 Reactor Context 的传播

Reactor 的 `Context` 是一种"隐式参数"，沿订阅链向上传播（与变量作用域相反）：

```java
Flux.range(1, 3)
    .flatMap(i -> {
        return Mono.deferContextual(ctx -> {
            String userId = ctx.get("userId");
            return fetchData(userId, i);
        });
    })
    .contextWrite(Context.of("userId", "user-123"))
    .subscribe();
```

**关键特性**：

1. `Context` 从下游向上游传播（下游设置，上游读取）。
2. 上游无法覆盖下游设置的值，但可以新增。
3. `Context` 是不可变的，每次 `contextWrite` 返回新 `Context`。

这一机制解决了响应式代码无法通过方法参数传递 traceId、tenantId 等上下文的问题。

---

## 5. 代码示例：从入门到进阶的完整实战

### 5.1 示例 1：基础响应式流

```java
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public class BasicReactive {

    public static void main(String[] args) {
        // 创建 Flux（多个元素）
        Flux<Integer> numbers = Flux.range(1, 5);
        numbers.subscribe(
            n -> System.out.println("Received: " + n),
            e -> System.err.println("Error: " + e),
            () -> System.out.println("Complete")
        );

        // 创建 Mono（单个元素）
        Mono<String> greeting = Mono.just("Hello, Reactive World!");
        greeting.subscribe(s -> System.out.println(s));

        // 创建空 Mono
        Mono<Void> empty = Mono.empty();
        empty.subscribe(v -> {}, e -> {}, () -> System.out.println("Empty complete"));

        // 创建错误 Mono
        Mono<String> error = Mono.error(new RuntimeException("Oops"));
        error.subscribe(
            v -> {},
            e -> System.err.println("Caught: " + e.getMessage())
        );
    }
}
```

### 5.2 示例 2：常用操作符组合

```java
import reactor.core.publisher.Flux;
import java.time.Duration;

public class OperatorDemo {

    public static void main(String[] args) throws InterruptedException {
        // map + filter
        Flux.range(1, 10)
            .map(i -> i * i)
            .filter(i -> i > 20)
            .subscribe(System.out::println);

        // flatMap 并发处理
        Flux.range(1, 3)
            .flatMap(i -> Flux.range(i * 10, 2))
            .subscribe(System.out::println);

        // zip 配对组合
        Flux.zip(
            Flux.just("A", "B", "C"),
            Flux.just(1, 2, 3),
            (letter, num) -> letter + num
        ).subscribe(System.out::println);  // A1, B2, C3

        // merge 合并
        Flux.merge(
            Flux.just(1, 2).delayElements(Duration.ofMillis(100)),
            Flux.just(3, 4).delayElements(Duration.ofMillis(50))
        ).subscribe(System.out::println);  // 3, 4, 1, 2（按时间顺序）

        // 缓冲与窗口
        Flux.range(1, 10)
            .buffer(3)  // 每 3 个一组
            .subscribe(list -> System.out.println("Buffer: " + list));

        Flux.range(1, 10)
            .window(3)  // 每 3 个一个子流
            .subscribe(flux -> flux.collectList()
                .subscribe(list -> System.out.println("Window: " + list)));

        Thread.sleep(500);
    }
}
```

### 5.3 示例 3：背压控制

```java
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;
import java.time.Duration;

public class BackpressureDemo {

    public static void main(String[] args) throws InterruptedException {
        // 高速生产者 + 慢速消费者
        Flux.interval(Duration.ofMillis(10))  // 每 10ms 发一个
            .onBackpressureBuffer(100)         // 缓冲 100 个
            .publishOn(Schedulers.boundedElastic())
            .concatMap(i -> {
                try {
                    Thread.sleep(50);  // 模拟慢消费
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                return Flux.just(i);
            })
            .subscribe(i -> System.out.println("Processed: " + i));

        // 不同背压策略
        Flux.interval(Duration.ofMillis(10))
            .onBackpressureDrop(i -> System.out.println("Dropped: " + i))
            .publishOn(Schedulers.single())
            .concatMap(i -> slowProcess(i))
            .subscribe(i -> System.out.println("Kept: " + i));

        // latest 策略：只保留最新
        Flux.interval(Duration.ofMillis(10))
            .onBackpressureLatest()
            .publishOn(Schedulers.single())
            .concatMap(i -> slowProcess(i))
            .subscribe(i -> System.out.println("Latest: " + i));

        Thread.sleep(5000);
    }

    static Flux<Long> slowProcess(Long i) {
        try {
            Thread.sleep(50);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return Flux.just(i);
    }
}
```

### 5.4 示例 4：自定义 Publisher

```java
import org.reactivestreams.Publisher;
import org.reactivestreams.Subscriber;
import org.reactivestreams.Subscription;
import java.util.concurrent.atomic.AtomicLong;

public class ArrayPublisher<T> implements Publisher<T> {
    private final T[] array;

    public ArrayPublisher(T[] array) {
        this.array = array;
    }

    @Override
    public void subscribe(Subscriber<? super T> subscriber) {
        subscriber.onSubscribe(new ArraySubscription<>(subscriber, array));
    }

    static class ArraySubscription<T> implements Subscription {
        private final Subscriber<? super T> subscriber;
        private final T[] array;
        private int index = 0;
        private final AtomicLong requested = new AtomicLong(0);
        private volatile boolean cancelled = false;

        ArraySubscription(Subscriber<? super T> subscriber, T[] array) {
            this.subscriber = subscriber;
            this.array = array;
        }

        @Override
        public void request(long n) {
            if (n <= 0) {
                subscriber.onError(new IllegalArgumentException("non-positive request"));
                return;
            }
            // 累加请求量
            long current = requested.get();
            long updated = current + n;
            if (updated < 0) updated = Long.MAX_VALUE;
            requested.compareAndSet(current, updated);
            drain();
        }

        @Override
        public void cancel() {
            cancelled = true;
        }

        private void drain() {
            while (true) {
                long r = requested.get();
                long emitted = 0;
                while (emitted < r && index < array.length && !cancelled) {
                    subscriber.onNext(array[index++]);
                    emitted++;
                }
                if (emitted > 0) {
                    requested.addAndGet(-emitted);
                }
                if (index >= array.length && !cancelled) {
                    subscriber.onComplete();
                    return;
                }
                if (emitted == 0) break;
            }
        }
    }

    public static void main(String[] args) {
        Integer[] data = {1, 2, 3, 4, 5};
        new ArrayPublisher<>(data).subscribe(new Subscriber<Integer>() {
            private Subscription subscription;

            @Override
            public void onSubscribe(Subscription s) {
                this.subscription = s;
                s.request(2);  // 先请求 2 个
            }

            @Override
            public void onNext(Integer integer) {
                System.out.println("Got: " + integer);
                if (integer == 2) {
                    subscription.request(3);  // 再请求 3 个
                }
            }

            @Override
            public void onError(Throwable t) {
                System.err.println("Error: " + t);
            }

            @Override
            public void onComplete() {
                System.out.println("Done");
            }
        });
    }
}
```

### 5.5 示例 5：Spring WebFlux REST API

```java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.annotation.Id;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.relational.core.mapping.Table;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@SpringBootApplication
@RestController
@RequestMapping("/api/users")
public class WebFluxApp {

    public static void main(String[] args) {
        SpringApplication.run(WebFluxApp.class, args);
    }

    @Table("users")
    static class User {
        @Id
        private Long id;
        private String name;
        private String email;

        public User() {}
        public User(String name, String email) {
            this.name = name;
            this.email = email;
        }
        // getter/setter 省略
    }

    interface UserRepository extends R2dbcRepository<User, Long> {
        Flux<User> findByNameContaining(String name);
    }

    private final UserRepository repository;

    public WebFluxApp(UserRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public Flux<User> list() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public Mono<User> getById(@PathVariable Long id) {
        return repository.findById(id)
            .switchIfEmpty(Mono.error(new NotFoundException("User not found")));
    }

    @GetMapping("/search")
    public Flux<User> search(@RequestParam String name) {
        return repository.findByNameContaining(name);
    }

    @PostMapping
    public Mono<User> create(@RequestBody User user) {
        return repository.save(user);
    }

    @PutMapping("/{id}")
    public Mono<User> update(@PathVariable Long id, @RequestBody User user) {
        return repository.findById(id)
            .flatMap(existing -> {
                existing.setName(user.getName());
                existing.setEmail(user.getEmail());
                return repository.save(existing);
            })
            .switchIfEmpty(Mono.error(new NotFoundException("User not found")));
    }

    @DeleteMapping("/{id}")
    public Mono<Void> delete(@PathVariable Long id) {
        return repository.deleteById(id);
    }

    // SSE（Server-Sent Events）流式推送
    @GetMapping(value = "/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<User> stream() {
        return repository.findAll()
            .delayElements(java.time.Duration.ofSeconds(1));
    }
}

class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
```

### 5.6 示例 6：错误处理与重试

```java
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;
import java.time.Duration;

public class ErrorHandlingDemo {

    public static void main(String[] args) throws InterruptedException {
        // 模拟外部 API 调用（可能失败）
        Mono<String> callApi(int attempt) {
            return Mono.fromCallable(() -> {
                if (attempt < 3) {
                    throw new RuntimeException("API failed");
                }
                return "Success at attempt " + attempt;
            });
        }

        // 重试 + 退避
        AtomicInteger counter = new AtomicInteger(0);
        Mono<String> withRetry = Mono.defer(() -> callApi(counter.incrementAndGet()))
            .retryWhen(Retry.backoff(5, Duration.ofMillis(100))
                .maxBackoff(Duration.ofSeconds(1))
                .doBeforeRetry(rs -> System.out.println("Retry #" + rs.totalRetries())))
            .onErrorResume(e -> Mono.just("Fallback after retries"));

        withRetry.subscribe(s -> System.out.println("Result: " + s));

        // 熔断器模式（用 Resilience4j）
        // 此处仅展示概念，实际需引入 resilience4j-reactor 依赖
        // CircuitBreaker circuitBreaker = CircuitBreaker.ofDefaults("backend");
        // Mono<String> withCircuitBreaker = Mono.fromCallable(() -> callApi())
        //     .transformDeferred(CircuitBreakerOperator.of(circuitBreaker));

        Thread.sleep(5000);
    }

    // 占位方法（实际应在类外定义）
    static Mono<String> callApi(int attempt) {
        if (attempt < 3) {
            return Mono.error(new RuntimeException("API failed"));
        }
        return Mono.just("Success at attempt " + attempt);
    }

    static class AtomicInteger {
        private int value = 0;
        int incrementAndGet() { return ++value; }
    }
}
```

### 5.7 示例 7：R2DBC 响应式数据库访问

```java
import io.r2dbc.spi.*;
import org.springframework.r2dbc.core.DatabaseClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import java.util.Map;

public class R2dbcDemo {

    private final DatabaseClient client;

    public R2dbcDemo(DatabaseClient client) {
        this.client = client;
    }

    // 查询所有
    public Flux<Map<String, Object>> findAll() {
        return client.sql("SELECT id, name, email FROM users")
            .fetch().all();
    }

    // 按 ID 查询
    public Mono<Map<String, Object>> findById(Long id) {
        return client.sql("SELECT id, name, email FROM users WHERE id = :id")
            .bind("id", id)
            .fetch().one();
    }

    // 插入
    public Mono<Long> insert(String name, String email) {
        return client.sql("INSERT INTO users(name, email) VALUES(:name, :email)")
            .bind("name", name)
            .bind("email", email)
            .filter((stmt, execute) -> stmt.returnGeneratedValues("id").execute())
            .fetch().first()
            .map(row -> (Long) row.get("id"));
    }

    // 事务
    public Mono<Void> transfer(Long from, Long to, BigDecimal amount) {
        return client.inTxn(handle -> {
            return handle.sql("UPDATE accounts SET balance = balance - :amount WHERE id = :from")
                .bind("amount", amount).bind("from", from).fetch().rowsUpdated()
                .then(handle.sql("UPDATE accounts SET balance = balance + :amount WHERE id = :to")
                    .bind("amount", amount).bind("to", to).fetch().rowsUpdated())
                .then();
        });
    }
}

import java.math.BigDecimal;
```

### 5.8 示例 8：Hot Publisher 与状态共享

```java
import reactor.core.publisher.ConnectableFlux;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;
import java.time.Duration;

public class HotPublisherDemo {

    public static void main(String[] args) throws InterruptedException {
        // Sinks.Many：现代的 Hot Publisher
        Sinks.Many<String> sink = Sinks.many().multicast().onBackpressureBuffer();

        Flux<String> hotFlux = sink.asFlux();

        // 第一个订阅者
        hotFlux.subscribe(s -> System.out.println("Subscriber 1: " + s));

        // 推送数据
        sink.tryEmitNext("Hello");
        sink.tryEmitNext("World");

        // 第二个订阅者（后加入，收不到之前的数据）
        hotFlux.subscribe(s -> System.out.println("Subscriber 2: " + s));

        sink.tryEmitNext("Reactive");
        sink.tryEmitComplete();

        // replay：缓存所有数据，新订阅者收到全部
        System.out.println("\n--- Replay ---");
        ConnectableFlux<Long> replay = Flux.interval(Duration.ofSeconds(1))
            .replay(3);  // 缓存最近 3 个

        replay.connect();
        Thread.sleep(2500);

        replay.subscribe(l -> System.out.println("Late subscriber: " + l));
        Thread.sleep(3000);
    }
}
```

### 5.9 示例 9：响应式调试

```java
import reactor.core.publisher.Flux;
import reactor.tools.agent.ReactorDebugAgent;

public class DebugDemo {

    public static void main(String[] args) {
        // 启用 Reactor Debug Agent（生产环境也能用，开销小）
        ReactorDebugAgent.init();

        // checkpoint：在关键节点标记，便于追踪
        Flux.range(1, 5)
            .map(i -> i * 2)
            .checkpoint("after-multiply")
            .filter(i -> i > 5)
            .checkpoint("after-filter")
            .flatMap(i -> {
                if (i == 8) {
                    throw new RuntimeException("Simulated error at i=8");
                }
                return Flux.just(i);
            })
            .checkpoint("after-flatMap")
            .subscribe(
                i -> System.out.println("Got: " + i),
                e -> {
                    System.err.println("Error: " + e);
                    // 异常栈会显示 checkpoint 标记
                    e.printStackTrace();
                }
            );

        // log 操作符：打印所有信号
        Flux.range(1, 3)
            .log("source")
            .map(i -> i * 10)
            .log("after-map")
            .subscribe();
    }
}
```

### 5.10 示例 10：响应式测试

```java
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;
import reactor.test.StepVerifier;
import java.time.Duration;

public class ReactiveTest {

    @Test
    public void testFlux() {
        Flux<Integer> flux = Flux.just(1, 2, 3)
            .map(i -> i * 10)
            .filter(i -> i > 5);

        StepVerifier.create(flux)
            .expectNext(10, 20, 30)
            .verifyComplete();
    }

    @Test
    public void testWithError() {
        Flux<Integer> flux = Flux.just(1, 2, 0)
            .map(i -> 10 / i)
            .onErrorReturn(-1);

        StepVerifier.create(flux)
            .expectNext(10, 5, -1)
            .verifyComplete();
    }

    @Test
    public void testWithVirtualTime() {
        // 虚拟时间：避免真实等待
        StepVerifier.withVirtualTime(() -> 
            Flux.interval(Duration.ofSeconds(1)).take(3)
        )
            .expectSubscription()
            .expectNoEvent(Duration.ofSeconds(1))
            .expectNext(0L)
            .thenAwait(Duration.ofSeconds(1))
            .expectNext(1L)
            .thenAwait(Duration.ofSeconds(1))
            .expectNext(2L)
            .verifyComplete();
    }

    @Test
    public void testConditional() {
        Flux<Integer> flux = Flux.range(1, 100)
            .filter(i -> i % 7 == 0)
            .take(3);

        StepVerifier.create(flux)
            .expectNext(7, 14, 21)
            .verifyComplete();
    }
}
```

---

## 6. 对比分析

### 6.1 响应式 vs 命令式（命令式 + CompletableFuture）

| 维度 | 命令式 + CompletableFuture | 响应式（Reactor） |
|------|---------------------------|------------------|
| 并发模型 | Thread-per-Request | Event Loop + 少量线程 |
| I/O 阻塞 | 阻塞（线程睡眠） | 非阻塞（注册回调） |
| 资源效率 | 低（每请求一线程，1MB 栈） | 高（少量线程，KB 级栈） |
| 吞吐量 | 中等（受线程池限制） | 高（事件循环） |
| 延迟 | 中等（上下文切换开销） | 低（无线程切换） |
| 代码可读性 | 高（顺序执行） | 低（链式调用 + 操作符） |
| 调试难度 | 易（栈跟踪清晰） | 难（异步调用栈不连续） |
| 背压支持 | 无 | 有（Reactive Streams） |
| 错误处理 | try-catch（局部） | onError 信号（流级别） |
| 学习曲线 | 平缓 | 陡峭 |
| 生态成熟度 | 极成熟（Servlet 30 年） | 成熟（Reactor 10 年） |
| 与虚拟线程配合 | 天然适配 | 兼容但价值下降 |

### 6.2 Reactor vs RxJava 3

| 维度 | Project Reactor 3 | RxJava 3 |
|------|------------------|----------|
| 主导方 | Pivotal/VMware | Netflix 社区 |
| Spring 集成 | 原生（WebFlux 默认） | 需适配 |
| API 风格 | `Flux`/`Mono` 双类型 | `Flowable`/`Observable`/`Single`/`Maybe`/`Completable` 多类型 |
| RS 规范兼容 | 完全原生 | 完全兼容 |
| Android 支持 | 弱（社区 adapter） | 强（主战场之一） |
| 操作符数量 | 中等（约 200） | 多（约 400） |
| 文档质量 | 高（官方参考文档详尽） | 高（Javadoc 极详尽） |
| 调试工具 | ReactorDebugAgent（生产可用） | RxJavaAssemblyTracking（较弱） |
| 性能 | 优秀 | 优秀 |
| 与 Java 9+ Flow 兼容 | 通过适配器 | 通过适配器 |

**选型建议**：

- Spring 生态优先选 Reactor（原生集成，零适配成本）。
- Android 或与 RxJava 1.x 遗留代码迁移选 RxJava 3。
- 新项目无历史包袱且用 Spring Boot 优先 Reactor。

### 6.3 响应式 vs 虚拟线程

Java 21 虚拟线程正式发布后，社区出现"虚拟线程将取代响应式"的讨论。关键对比：

| 维度 | 响应式 | 虚拟线程 |
|------|--------|----------|
| 编程模型 | 声明式（链式操作符） | 命令式（顺序代码） |
| 线程数量 | 固定少量（事件循环） | 海量（每请求一虚拟线程） |
| 阻塞 I/O | 不允许（破坏事件循环） | 允许（自动卸载载体线程） |
| 内存占用 | 极低（每订阅约 KB） | 低（每虚拟线程约 KB） |
| 代码可读性 | 低（操作符链） | 高（顺序） |
| 调试 | 难 | 易（栈跟踪正常） |
| 背压 | 内置 | 无（需手动） |
| 流式数据处理 | 强（天然流模型） | 弱（需 Stream API 辅助） |
| 与现有库兼容 | 需响应式驱动 | 天然兼容（同步库可直接用） |
| 适用场景 | I/O 密集型高并发、流式数据 | I/O 密集型高并发 |

**核心结论**：

1. 虚拟线程 **不会完全取代** 响应式，但会 **大幅压缩** 响应式的应用范围。
2. 虚拟线程适合"传统命令式代码 + 高并发"场景，开发者无需学习新范式。
3. 响应式适合"流式数据处理 + 背压 + 复杂组合"场景，如实时数据管道、SSE、WebSocket 流。
4. 新项目若仅需高并发 I/O，优先选虚拟线程（Spring Boot 3.2+ 已支持）；若需流式处理，仍选响应式。

### 6.4 WebFlux vs Spring MVC

| 维度 | Spring MVC | Spring WebFlux |
|------|-----------|----------------|
| 线程模型 | Servlet 容器（Tomcat 默认 200 线程） | Netty 事件循环（默认 CPU 核心数线程） |
| I/O 模型 | 阻塞（BIO/NIO 兼容） | 完全非阻塞 |
| 返回类型 | `ResponseEntity<T>` / `List<T>` | `Mono<T>` / `Flux<T>` |
| 数据库 | JDBC（阻塞） | R2DBC（非阻塞） |
| 吞吐量 | 中等 | 高（3-10 倍于 MVC） |
| 延迟 | 中等 | 低 |
| 生态 | 极成熟（30 年） | 成熟（7 年） |
| 调试 | 易 | 难 |
| 与虚拟线程 | Spring Boot 3.2+ 自动适配 | 不需要（已非阻塞） |

**关键建议**：

- 新项目若无强流式需求，**Spring MVC + 虚拟线程**（Spring Boot 3.2+）是更易维护的选择。
- 流式需求（SSE、WebSocket、实时推送）选 **WebFlux**。
- 已有 WebFlux 项目无需迁移到虚拟线程，两者可共存。

### 6.5 R2DBC vs JDBC

| 维度 | JDBC | R2DBC |
|------|------|-------|
| I/O 模型 | 阻塞 | 非阻塞 |
| API 风格 | 同步（`ResultSet.next()`） | 异步（`Publisher<Row>`） |
| 线程占用 | 每查询一线程 | 共享事件循环 |
| 驱动支持 | 所有数据库 | 主流数据库（PostgreSQL、MySQL、H2、MSSQL） |
| 事务 | 自动（`Connection.setAutoCommit`） | 显式（`begin`/`commit`/`rollback` 返回 `Publisher`） |
| 与虚拟线程配合 | 完美适配 | 不需要 |
| 成熟度 | 极成熟 | 成熟但相对年轻 |

**选型建议**：

- WebFlux 项目必须用 R2DBC（不能用 JDBC，会阻塞事件循环）。
- Spring MVC + 虚拟线程项目用 JDBC（性能等同 R2DBC，生态更成熟）。

---

## 7. 陷阱与反模式

### 7.1 反模式 1：在响应式链中调用阻塞代码

```java
// 反模式：在 Reactor 链中直接调用阻塞 I/O
Flux.range(1, 10)
    .map(i -> {
        try {
            Thread.sleep(100);  // 阻塞！破坏事件循环
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return i * 2;
    })
    .subscribe();

// 正确：用 boundedElastic 调度器包裹阻塞代码
Flux.range(1, 10)
    .publishOn(Schedulers.boundedElastic())
    .map(i -> {
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return i * 2;
    })
    .subscribe();
```

**原因**：响应式事件循环线程数量少（默认等于 CPU 核心数），任何阻塞都会拖慢整个事件循环，导致所有订阅者阻塞。

### 7.2 反模式 2：忽略背压

```java
// 反模式：使用 Sinks 无背压控制
Sinks.Many<Integer> sink = Sinks.many().multicast().onBackpressureBuffer();
// 消费者慢，生产者快，可能导致 OOM

// 正确：用 onBackpressureBuffer/Drop/Latest 显式处理
Sinks.Many<Integer> safeSink = Sinks.many().multicast()
    .onBackpressureBuffer(1000, /* buffer size */ 
        bufferOverflow -> System.err.println("Overflow!"));
```

### 7.3 反模式 3：错误处理缺失

```java
// 反模式：未处理 onError，异常被吞
Mono.just("hello")
    .map(s -> s.substring(0, 100))  // 可能越界
    .subscribe();  // 无错误处理，异常被 Reactor 内部吞掉

// 正确：subscribe 时提供 error handler
Mono.just("hello")
    .map(s -> s.substring(0, 100))
    .subscribe(
        s -> System.out.println(s),
        e -> System.err.println("Error: " + e)
    );

// 更好：用 onErrorReturn/onErrorResume 显式处理
Mono.just("hello")
    .map(s -> s.substring(0, 100))
    .onErrorReturn("default")
    .subscribe(System.out::println);
```

### 7.4 反模式 4：在 flatMap 中创建大量内部流

```java
// 反模式：flatMap 内部创建大量 Publisher，导致内存压力
Flux.range(1, 100000)
    .flatMap(i -> Flux.range(i, 100))  // 100000 * 100 = 10M 内部订阅
    .subscribe();

// 正确：用 flatMap 的 concurrency 参数限制并发
Flux.range(1, 100000)
    .flatMap(i -> Flux.range(i, 100), 256)  // 最多 256 个并发
    .subscribe();

// 或用 concatMap 串行处理
Flux.range(1, 100000)
    .concatMap(i -> Flux.range(i, 100))
    .subscribe();
```

### 7.5 反模式 5：滥用 subscribeOn

```java
// 反模式：多个 subscribeOn，误以为都生效
Flux.range(1, 10)
    .subscribeOn(Schedulers.parallel())
    .map(i -> i * 2)
    .subscribeOn(Schedulers.boundedElastic())  // 以为会切换线程
    .subscribe();
// 实际：只有最靠近上游的 subscribeOn 生效（即 parallel）

// 正确：理解 subscribeOn 只生效一次，用 publishOn 切换下游线程
Flux.range(1, 10)
    .subscribeOn(Schedulers.boundedElastic())  // 订阅线程
    .map(i -> i * 2)
    .publishOn(Schedulers.parallel())           // 下游切换到 parallel
    .subscribe();
```

### 7.6 反模式 6：Cold/Hot 混淆

```java
// 反模式：误以为 Hot Publisher 会缓存历史数据
Sinks.Many<String> sink = Sinks.many().multicast().onBackpressureBuffer();
Flux<String> hotFlux = sink.asFlux();

sink.tryEmitNext("Data 1");
sink.tryEmitNext("Data 2");

// 后加入的订阅者期望收到 Data 1 和 Data 2
hotFlux.subscribe(s -> System.out.println("Late: " + s));
// 实际：收不到 Data 1 和 Data 2，Hot Publisher 不缓存

// 正确：用 replay(n) 缓存历史数据
ConnectableFlux<String> replayFlux = sink.asFlux().replay(2);
replayFlux.connect();
// 现在新订阅者会收到最近 2 个数据
```

### 7.7 反模式 7：在非响应式代码中调用 subscribe

```java
// 反模式：在 Service 层调用 subscribe()，导致"fire-and-forget"且无法追踪错误
public void processOrder(Order order) {
    repository.save(order)
        .subscribe();  // 错误被吞，且与调用者脱钩
}

// 正确：返回 Mono，由调用者订阅
public Mono<Void> processOrder(Order order) {
    return repository.save(order)
        .doOnSuccess(v -> log.info("Saved"))
        .then();
}

// 正确：必要时用 block()（仅限非响应式调用方）
public void processOrderBlocking(Order order) {
    repository.save(order)
        .block();  // 阻塞等待，仅用于与命令式代码桥接
}
```

### 7.8 反模式 8：用 block() 在响应式链中

```java
// 反模式：在 WebFlux 控制器中调用 block()
@GetMapping("/users/{id}")
public User getUser(@PathVariable Long id) {
    return repository.findById(id).block();  // 阻塞事件循环！
}

// 正确：返回 Mono，由 WebFlux 框架订阅
@GetMapping("/users/{id}")
public Mono<User> getUser(@PathVariable Long id) {
    return repository.findById(id);
}
```

### 7.9 反模式 9：Context 滥用

```java
// 反模式：用 Context 传递业务参数（违反"上下文"语义）
Mono.deferContextual(ctx -> {
    Long userId = ctx.get("userId");  // 业务 ID 不应放 Context
    return fetchUser(userId);
})
.contextWrite(Context.of("userId", 123L));

// 正确：业务参数用方法参数，Context 只放 traceId/tenantId 等元数据
public Mono<User> fetchUser(Long userId) {
    return Mono.deferContextual(ctx -> {
        String traceId = ctx.getOrDefault("traceId", "unknown");
        log.info("[{}] Fetching user {}", traceId, userId);
        return repository.findById(userId);
    });
}
```

### 7.10 反模式 10：调试代码残留

```java
// 反模式：生产代码中残留 log() 操作符
Flux.range(1, 1000)
    .log("debug-1")  // 生产环境会打印大量日志
    .map(i -> i * 2)
    .log("debug-2")
    .subscribe();

// 正确：调试完移除 log()，或用条件日志
Flux.range(1, 1000)
    .map(i -> i * 2)
    .doOnNext(i -> {
        if (log.isDebugEnabled()) {
            log.debug("Processed: {}", i);
        }
    })
    .subscribe();
```

---

## 8. 工程实践

### 8.1 响应式微服务架构

典型的响应式微服务架构：

```
                     ┌─────────────────┐
                     │   API Gateway   │
                     │  (Spring Cloud  │
                     │   Gateway)      │
                     └────────┬────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │ Service A│    │ Service B│    │ Service C│
       │ WebFlux  │    │ WebFlux  │    │ WebFlux  │
       └────┬─────┘    └────┬─────┘    └────┬─────┘
            │               │               │
            ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │PostgreSQL│    │ MongoDB  │    │  Redis   │
       │  R2DBC   │    │ Reactive │    │ Reactive │
       └──────────┘    └──────────┘    └──────────┘
            │
            ▼
       ┌──────────┐
       │  Kafka   │
       │ Reactive │
       │ Kafka    │
       └──────────┘
```

**关键组件**：

- **API Gateway**：Spring Cloud Gateway（基于 WebFlux），统一鉴权、限流、路由。
- **Service 间通信**：WebClient（HTTP）、RSocket（二进制流）、Reactive Kafka（消息）。
- **数据库**：R2DBC（关系型）、Reactive MongoDB/Redis（NoSQL）。
- **监控**：Micrometer + Reactor 自带的 `Metrics` 操作符。

### 8.2 错误处理策略

分层错误处理策略：

```java
// 1. 操作符级别：重试 + 退避
Mono<Response> callExternal = webClient.get()
    .uri("/api/external")
    .retrieve()
    .bodyToMono(Response.class)
    .retryWhen(Retry.backoff(3, Duration.ofMillis(100))
        .maxBackoff(Duration.ofSeconds(1))
        .onRetryExhaustedThrow((spec, signal) -> 
            new ServiceException("External service unavailable")));

// 2. 服务级别：降级 + 熔断
public Mono<Response> fetchWithFallback(String id) {
    return circuitBreaker.execute(
        callExternal(id),
        throwable -> {
            log.warn("Fallback for id={}, error={}", id, throwable.getMessage());
            return cache.get(id)
                .switchIfEmpty(Mono.error(new ServiceException("No data available")));
        }
    );
}

// 3. 全局级别：WebFlux 异常处理
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ServiceException.class)
    public ResponseEntity<ErrorResponse> handleService(ServiceException e) {
        return ResponseEntity.status(503)
            .body(new ErrorResponse("SERVICE_UNAVAILABLE", e.getMessage()));
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NotFoundException e) {
        return ResponseEntity.status(404)
            .body(new ErrorResponse("NOT_FOUND", e.getMessage()));
    }
}
```

### 8.3 监控与可观测性

```java
// 使用 Micrometer 监控响应式流
Flux.range(1, 100)
    .name("order.processing")
    .tag("type", "batch")
    .metrics()  // 自动注册 Flux 名称与标签
    .map(i -> processOrder(i))
    .subscribe();

// 自定义指标
public Mono<Order> processOrderWithMetrics(Long id) {
    Timer.Sample sample = Timer.start(meterRegistry);
    return repository.findById(id)
        .doOnSuccess(o -> sample.stop(
            Timer.builder("order.process")
                .tag("result", "success")
                .register(meterRegistry)))
        .doOnError(e -> sample.stop(
            Timer.builder("order.process")
                .tag("result", "error")
                .register(meterRegistry)));
}
```

### 8.4 测试策略

```java
// 1. StepVerifier：精确验证流
StepVerifier.create(userService.findAll())
    .expectNextMatches(u -> u.getName().equals("Alice"))
    .expectNextMatches(u -> u.getName().equals("Bob"))
    .verifyComplete();

// 2. 虚拟时间：测试时间相关逻辑
StepVerifier.withVirtualTime(() -> 
    notificationService.scheduledNotifications())
    .expectSubscription()
    .expectNoEvent(Duration.ofMinutes(1))
    .thenAwait(Duration.ofMinutes(5))
    .expectNextCount(5)
    .verifyComplete();

// 3. TestPublisher：模拟上游异常
TestPublisher<String> testPublisher = TestPublisher.create();
StepVerifier.create(service.process(testPublisher))
    .then(() -> testPublisher.next("data1", "data2"))
    .expectNext("processed-data1", "processed-data2")
    .then(() -> testPublisher.error(new RuntimeException("upstream")))
    .verifyError(RuntimeException.class);
```

### 8.5 性能调优

```java
// 1. 合理设置缓冲区大小
Flux.range(1, 1000000)
    .onBackpressureBuffer(10000)  // 根据内存调整
    .subscribe();

// 2. flatMap 并发度
Flux.range(1, 1000)
    .flatMap(this::fetchUser, 32)  // 32 并发（默认 256）
    .subscribe();

// 3. 批量处理
Flux.range(1, 10000)
    .buffer(100)
    .flatMap(this::batchInsert)
    .subscribe();

// 4. 避免不必要的操作符
// 反模式
flux.map(i -> i).filter(i -> true).flatMap(Flux::just);
// 正确
flux;

// 5. 使用 connectable flux 共享计算
ConnectableFlux<Result> shared = expensiveQuery().publish();
shared.subscribe(consumer1);
shared.subscribe(consumer2);
shared.connect();  // 一次查询，两个消费者
```

### 8.6 与虚拟线程共存

Spring Boot 3.2+ 支持虚拟线程，与响应式可共存：

```yaml
# application.yml
spring:
  threads:
    virtual:
      enabled: true  # 启用虚拟线程（仅 Spring MVC 受益）
```

```java
// WebFlux 仍用响应式，但可调用阻塞代码（用 boundedElastic 调度到虚拟线程）
@Configuration
public class SchedulerConfig {
    @Bean
    public Scheduler virtualThreadScheduler() {
        return Schedulers.fromExecutor(
            Executors.newVirtualThreadPerTaskExecutor()
        );
    }
}

// 桥接响应式与阻塞库
public Mono<User> fetchUser(Long id) {
    return Mono.fromCallable(() -> jdbcRepository.findById(id))
        .subscribeOn(virtualThreadScheduler);  // 在虚拟线程上执行阻塞 JDBC
}
```

---

## 9. 案例研究：主流框架实践

### 9.1 案例研究 1：Spring WebFlux 的全栈响应式

Spring WebFlux 是 Spring 5+ 的响应式 Web 框架，全栈响应式包括：

```java
// 控制器
@RestController
@RequestMapping("/orders")
public class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @PostMapping
    public Mono<Order> create(@RequestBody OrderRequest req) {
        return orderService.createOrder(req);
    }

    @GetMapping("/{id}")
    public Mono<Order> get(@PathVariable Long id) {
        return orderService.getOrder(id);
    }

    // SSE：实时推送订单状态
    @GetMapping(value = "/{id}/status", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<OrderStatus> streamStatus(@PathVariable Long id) {
        return orderService.streamStatus(id);
    }
}

// Service
@Service
public class OrderService {
    private final OrderRepository orderRepo;
    private final InventoryClient inventoryClient;
    private final PaymentClient paymentClient;

    public Mono<Order> createOrder(OrderRequest req) {
        return orderRepo.save(req.toOrder())
            .flatMap(order -> inventoryClient.deduct(order.getProducts())
                .then(paymentClient.charge(order))
                .then(Mono.just(order)))
            .onErrorResume(e -> orderRepo.deleteById(req.getOrderId())
                .then(Mono.error(new OrderFailedException(e))));
    }
}

// Repository（R2DBC）
public interface OrderRepository extends R2dbcRepository<Order, Long> {
    @Query("SELECT * FROM orders WHERE user_id = :userId ORDER BY created_at DESC")
    Flux<Order> findByUser(Long userId);
}
```

**架构要点**：

- **零阻塞**：所有 I/O（HTTP、DB）均用响应式客户端，事件循环永不阻塞。
- **背压传播**：SSE 推送天然支持背压（客户端慢时自动减速）。
- **错误隔离**：每个步骤用 `onErrorResume` 兜底，避免级联失败。

### 9.2 案例研究 2：Reactive Kafka 消费者

```java
@Service
public class OrderEventConsumer {
    private final KafkaReceiver<String, OrderEvent> receiver;

    public OrderEventConsumer(ReceiverOptions<String, OrderEvent> options) {
        this.receiver = KafkaReceiver.create(options);
    }

    public Flux<OrderEvent> consume() {
        return receiver.receive()
            .flatMap(record -> {
                OrderEvent event = record.value();
                return processEvent(event)
                    .doOnSuccess(v -> record.receiverOffset().acknowledge())
                    .onErrorResume(e -> {
                        log.error("Failed to process event", e);
                        record.receiverOffset().acknowledge();  // 跳过失败消息
                        return Mono.empty();
                    });
            });
    }

    private Mono<Void> processEvent(OrderEvent event) {
        return orderService.applyEvent(event)
            .then();
    }
}

// 配置
@Bean
public ReceiverOptions<String, OrderEvent> kafkaOptions() {
    return ReceiverOptions.<String, OrderEvent>create()
        .subscription(Collections.singleton("order-events"))
        .withValueDeserializer(new JsonDeserializer<>(OrderEvent.class));
}
```

**关键设计**：

- **背压**：Reactive Kafka 的 `receive()` 返回 `Flux<ReceiverRecord>`，下游消费慢时自动暂停拉取。
- **手动提交 offset**：处理成功后才 `acknowledge()`，保证 at-least-once 语义。
- **错误隔离**：单条消息失败不影响后续消费，跳过并记录。

### 9.3 案例研究 3：RSocket 双向通信

```java
// 服务端
@Controller
public class RSocketServer {
    @MessageMapping("request-response")
    public Mono<String> handleRequestResponse(String request) {
        return Mono.just("Echo: " + request);
    }

    @MessageMapping("request-stream")
    public Flux<String> handleRequestStream(String request) {
        return Flux.interval(Duration.ofSeconds(1))
            .map(i -> request + " - " + i)
            .take(10);
    }

    @MessageMapping("channel")
    public Flux<String> handleChannel(Flux<String> requests) {
        return requests.map(r -> "Processed: " + r);
    }
}

// 客户端
@Service
public class RSocketClient {
    private final RSocketRequester requester;

    public RSocketClient(RSocketRequester.Builder builder) {
        this.requester = builder.tcp("localhost", 7000);
    }

    public Mono<String> requestResponse(String msg) {
        return requester.route("request-response")
            .data(msg)
            .retrieveMono(String.class);
    }

    public Flux<String> requestStream(String msg) {
        return requester.route("request-stream")
            .data(msg)
            .retrieveFlux(String.class);
    }
}
```

**RSocket 的 4 种交互模式**：

1. **request-response**：一问一答（HTTP-like）。
2. **request-stream**：一问多答（SSE-like）。
3. **fire-and-forget**：单向通知。
4. **channel**：双向流（WebSocket-like）。

RSocket 的优势：

- **多路复用**：单连接支持多请求，避免 HTTP/1.1 的队头阻塞。
- **背压**：基于 Reactive Streams，客户端可控制服务端推送速率。
- **二进制协议**：性能高于 HTTP/JSON。

### 9.4 案例研究 4：Reactive Redis 缓存

```java
@Configuration
public class RedisConfig {
    @Bean
    public ReactiveRedisTemplate<String, User> reactiveRedisTemplate(
            ReactiveRedisConnectionFactory factory) {
        return new ReactiveRedisTemplate<>(
            factory,
            RedisSerializationContext.<String, User>newBuilder()
                .key(StringRedisSerializer.UTF_8)
                .value(new Jackson2JsonRedisSerializer<>(User.class))
                .build()
        );
    }
}

@Service
public class UserCacheService {
    private final ReactiveRedisTemplate<String, User> redis;
    private final UserRepository userRepository;

    public Mono<User> getUser(Long id) {
        String key = "user:" + id;
        return redis.opsForValue().get(key)
            .switchIfEmpty(
                userRepository.findById(id)
                    .flatMap(user -> redis.opsForValue()
                        .set(key, user, Duration.ofMinutes(30))
                        .then(Mono.just(user)))
            );
    }

    public Mono<Void> invalidateUser(Long id) {
        return redis.delete("user:" + id).then();
    }
}
```

### 9.5 案例研究 5：响应式流式数据处理管道

```java
@Service
public class StreamProcessingPipeline {
    private final KafkaReceiver<String, SensorData> kafkaReceiver;
    private final WebClient webClient;
    private final ReactiveRedisTemplate<String, Aggregated> redis;

    public Flux<Alert> process() {
        return kafkaReceiver.receive()
            .map(ReceiverRecord::value)
            .filter(this::isValid)
            .window(Duration.ofSeconds(10))  // 10 秒窗口
            .flatMap(this::aggregate)
            .flatMap(this::enrich)
            .filter(this::isAnomaly)
            .flatMap(this::alert);
    }

    private Flux<Aggregated> aggregate(Flux<SensorData> window) {
        return window.collectList()
            .map(this::computeStats);
    }

    private Mono<EnrichedData> enrich(Aggregated agg) {
        return webClient.get()
            .uri("/metadata/{deviceId}", agg.getDeviceId())
            .retrieve()
            .bodyToMono(Metadata.class)
            .map(meta -> new EnrichedData(agg, meta))
            .onErrorResume(e -> Mono.just(new EnrichedData(agg, Metadata.empty())));
    }

    private boolean isAnomaly(EnrichedData data) {
        return data.getStats().getStddev() > data.getMetadata().getThreshold();
    }

    private Mono<Alert> alert(EnrichedData data) {
        Alert alert = new Alert(data);
        return redis.opsForList().leftPush("alerts", alert)
            .thenReturn(alert);
    }
}
```

---

## 10. 习题与思考题

### 10.1 基础题

1. 解释 Reactive Streams 规范的 4 条核心规则，并说明为什么需要这些规则。

2. 描述 `Flux` 与 `Mono` 的语义差异，并各举 3 个典型使用场景。

3. 实现一个自定义 `Publisher`，从 `Iterator` 读取数据并支持背压。

4. 解释 Cold Publisher 与 Hot Publisher 的区别，并各举 2 个例子。

5. 描述 `subscribeOn` 与 `publishOn` 的差异，并画出以下代码的线程切换时序：
   ```java
   Flux.range(1, 5)
       .map(i -> transform(i))
       .publishOn(Schedulers.parallel())
       .filter(i -> i > 0)
       .subscribeOn(Schedulers.boundedElastic())
       .subscribe();
   ```

### 10.2 进阶题

6. 实现一个带背压的 `BufferedPublisher`，当消费者慢时缓存最多 N 个数据，超出则丢弃最旧的。

7. 设计一个响应式重试策略：对网络错误重试 3 次（指数退避），对业务错误不重试。

8. 实现一个 `RateLimiter` Operator，限制下游每秒最多收到 N 个数据。

9. 用 Reactor 实现一个简单的"断路器"：当连续 5 次错误时，断开 30 秒，期间直接返回降级值。

10. 解释 `flatMap`、`concatMap`、`switchMap` 的并发语义差异，并给出各自适用的场景。

### 10.3 思考题

11. **虚拟线程会取代响应式编程吗？** 请从编程模型、性能、可维护性、生态 4 个维度论证你的观点。

12. **响应式编程的"回调地狱"问题**：虽然响应式避免了回调嵌套，但链式操作符是否也带来了"链式地狱"？如何缓解？

13. **响应式与事务**：传统事务基于 `ThreadLocal` 传递 Connection，响应式如何实现事务传播？请描述 R2DBC 的事务模型。

14. **响应式调试**：为什么响应式代码的栈跟踪经常不完整？Reactor 的 `ReactorDebugAgent` 如何解决这一问题？有什么代价？

15. **响应式 vs 命令式 + 虚拟线程**：如果你现在要设计一个高并发电商订单系统，你会选哪种？为什么？

### 10.4 实战题

16. 用 Spring WebFlux + R2DBC 实现一个简单的博客系统，包含文章 CRUD、评论流式推送（SSE）。

17. 用 Reactive Kafka 实现一个订单事件消费者，要求：
    - 至少一次（at-least-once）语义
    - 错误隔离（单条消息失败不影响整体）
    - 背压控制（消费慢时暂停拉取）

18. 用 RSocket 实现一个双向聊天室，服务端能向所有在线客户端广播消息。

19. 设计一个响应式数据管道：从 Kafka 读取传感器数据，每 10 秒窗口聚合统计，写入 Redis 与 PostgreSQL，并对异常数据生成告警。

20. **性能对比实验**：实现同一个 REST API（用户查询）的两个版本——Spring MVC + JDBC 和 Spring WebFlux + R2DBC，用 wrk 压测对比吞吐量、延迟、内存占用，并分析差异原因。

---

## 11. 参考文献

1. **Reactive Streams Specification**. "Reactive Streams v1.0.3". 2019. https://www.reactive-streams.org/

2. **Lightbend, Netflix, Pivotal**. "Reactive Streams Specification for the JVM". 2015.

3. **Elliott, Conal**. "Push-Pull Functional Reactive Programming". Haskell Symposium, 2009.

4. **Meijer, Erik**. "Your Mouse is a Database". ACM Queue, 2012.

5. **Project Reactor Documentation**. VMware. https://projectreactor.io/docs/core/release/reference/

6. **Spring WebFlux Reference**. VMware. https://docs.spring.io/spring-framework/reference/web/webflux.html

7. **RxJava 3 Wiki**. Netflix. https://github.com/ReactiveX/RxJava/wiki

8. **R2DBC Specification**. Pivotal. https://r2dbc.io/

9. **RSocket Protocol**. Netifi. https://rsocket.io/

10. **Okasaki, Chris**. "Purely Functional Data Structures". Cambridge University Press, 1999.（响应式流的不可变性理论基础）

11. **Bainomugisha, Englebert et al.** "A Survey on Reactive Programming". ACM Computing Surveys, 2013.

12. **Pressler, Philipp**. "Adding Context to Reactive Streams". Project Loom, 2020.（虚拟线程与响应式的关系讨论）

13. **Goetz, Brian**. "JEP 444: Virtual Threads". JDK 21, 2023.

14. **JDK 9 `java.util.concurrent.Flow`**. Oracle. https://docs.oracle.com/javase/9/docs/api/java/util/concurrent/Flow.html

15. **Reactor Debug Agent**. VMware. https://projectreactor.io/docs/core/release/reference/#debug-agent

---

## 12. 延伸阅读

### 12.1 学术论文

- Elliott, C., Hudak, P. "Functional Reactive Animation". ICFP 1997.
- Courtney, A. "Frappé: Functional Reactive Programming in Java". POPL 2003.
- Salvaneschi, G., Mezini, M. "Towards Reactive Programming for Object-Oriented Applications". ECOOP 2014.

### 12.2 书籍

- "Reactive Programming with RxJava". Tomasz Nurkiewicz, Ben Christensen. O'Reilly, 2016.
- "Reactive Spring". Greg L. Turnquist. O'Reilly, 2020.
- "Learning Reactive Programming with Java 8". Nickolay Tsvetinov. Packt, 2015.
- "Reactive Design Patterns". Roland Kuhn et al. Manning, 2016.
- "Reactive Messaging Patterns with the Actor Model". Vaughn Vernon. Addison-Wesley, 2015.

### 12.3 在线资源

- Project Reactor 官方参考文档：https://projectreactor.io/docs/core/release/reference/
- Spring WebFlux 官方文档：https://docs.spring.io/spring-framework/reference/web/webflux.html
- Reactive Streams 规范：https://github.com/reactive-streams/reactive-streams-jvm
- R2DBC 规范：https://r2dbc.io/spec/0.9.1.RELEASE/
- RSocket 协议规范：https://github.com/rsocket/rsocket/blob/master/Protocol.md
- "Reactive Programming in Java" 教程（Baeldung）：https://www.baeldung.com/java-reactive-programming

### 12.4 相关 JEP（JDK Enhancement Proposal）

- JEP 411: Deprecate the Security Manager for Removal（影响响应式安全）
- JEP 444: Virtual Threads（与响应式的关键对比）
- JEP 453: Structured Concurrency（响应式并发替代方案）
- JEP 462: Structured Concurrency (Second Preview)
- JEP 467: Markdown Documentation Comments（不影响响应式，但 Java 演进参考）

### 12.5 社区与生态

- Project Reactor GitHub: https://github.com/reactor/reactor-core
- RxJava GitHub: https://github.com/ReactiveX/RxJava
- Reactive Streams JVM: https://github.com/reactive-streams/reactive-streams-jvm
- ReactiveX 社区（跨语言响应式）：http://reactivex.io/
- Spring Reactive 社区：https://spring.io/reactive

---

## 附录 A：Reactor 操作符速查表

### A.1 创建操作符

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `just(T...)` | 创建指定元素的 Flux | `Flux.just(1, 2, 3)` |
| `fromArray(T[])` | 从数组创建 | `Flux.fromArray(arr)` |
| `fromIterable(Iterable)` | 从集合创建 | `Flux.fromIterable(list)` |
| `fromStream(Stream)` | 从 Stream 创建 | `Flux.fromStream(stream)` |
| `range(int, int)` | 创建整数序列 | `Flux.range(1, 10)` |
| `interval(Duration)` | 按间隔发射 | `Flux.interval(Duration.ofSeconds(1))` |
| `empty()` | 空流 | `Flux.empty()` |
| `error(Throwable)` | 错误流 | `Flux.error(new RuntimeException())` |
| `never()` | 永不发射 | `Flux.never()` |
| `defer(Supplier)` | 延迟创建（每次订阅重新创建） | `Flux.defer(() -> Flux.just(System.currentTimeMillis()))` |
| `using(...)` | 资源管理（try-with-resources 风格） | 见官方文档 |

### A.2 变换操作符

| 操作符 | 说明 |
|--------|------|
| `map(Function)` | 一对一变换 |
| `flatMap(Function)` | 一对多（异步并发） |
| `concatMap(Function)` | 一对多（串行） |
| `switchMap(Function)` | 一对多（新值取消旧值） |
| `scan(BiFunction)` | 累加器（带中间结果） |
| `reduce(BiFunction)` | 累加器（只返回最终结果） |
| `buffer(int)` | 缓冲为 List |
| `window(int)` | 切分为子 Flux |
| `groupBy(Function)` | 按键分组 |
| `cast(Class)` | 类型转换 |
| `defaultIfEmpty(T)` | 空流默认值 |
| `switchIfEmpty(Publisher)` | 空流切换到另一个流 |

### A.3 过滤操作符

| 操作符 | 说明 |
|--------|------|
| `filter(Predicate)` | 过滤 |
| `take(long)` | 取前 N 个 |
| `takeLast(int)` | 取最后 N 个 |
| `takeUntil(Predicate)` | 取到满足条件为止 |
| `skip(long)` | 跳过前 N 个 |
| `skipLast(int)` | 跳过最后 N 个 |
| `distinct()` | 去重 |
| `distinctUntilChanged()` | 连续重复去重 |
| `elementAt(int)` | 取第 N 个 |
| `last()` | 取最后一个 |

### A.4 组合操作符

| 操作符 | 说明 |
|--------|------|
| `merge(Publisher...)` | 合并（无序） |
| `concat(Publisher...)` | 串联（顺序） |
| `zip(Publisher, BiFunction)` | 配对组合 |
| `combineLatest(Publisher, BiFunction)` | 用最新值组合 |
| `startWith(T...)` | 前置数据 |
| `concatWith(Publisher)` | 后接另一个流 |

### A.5 错误处理操作符

| 操作符 | 说明 |
|--------|------|
| `onErrorReturn(T)` | 错误时返回默认值 |
| `onErrorResume(Function)` | 错误时切换流 |
| `onErrorMap(Function)` | 错误时转换异常 |
| `retry(long)` | 重试 N 次 |
| `retryWhen(Retry)` | 重试（带策略） |
| `doOnError(Consumer)` | 错误时副作用 |

### A.6 调度操作符

| 操作符 | 说明 |
|--------|------|
| `publishOn(Scheduler)` | 切换下游线程 |
| `subscribeOn(Scheduler)` | 指定订阅线程 |
| `publishOn(Scheduler, int)` | 切换线程并指定预取量 |

### A.7 背压操作符

| 操作符 | 说明 |
|--------|------|
| `onBackpressureBuffer(int)` | 缓冲 |
| `onBackpressureDrop(Consumer)` | 丢弃 |
| `onBackpressureLatest()` | 保留最新 |
| `onBackpressureError()` | 抛出错误 |

---

## 附录 B：Reactive Streams 规范全文要点

### B.1 Publisher 接口

```java
public interface Publisher<T> {
    public void subscribe(Subscriber<? super T> s);
}
```

### B.2 Subscriber 接口

```java
public interface Subscriber<T> {
    public void onSubscribe(Subscription s);
    public void onNext(T t);
    public void onError(Throwable t);
    public void onComplete();
}
```

### B.3 Subscription 接口

```java
public interface Subscription {
    public void request(long n);
    public void cancel();
}
```

### B.4 Processor 接口

```java
public interface Processor<T, R> extends Subscriber<T>, Publisher<R> {
}
```

### B.5 关键规则（共 35 条，节选）

1. Publisher 调用 `subscribe` 时必须新建 Subscription，不可复用。
2. Subscriber 的 `onSubscribe` 必须最多被调用一次。
3. `request(n)` 中 n 必须 > 0，否则调用 `onError(new IllegalArgumentException)`。
4. `request` 与 `cancel` 必须线程安全。
5. `onNext` 调用次数不得超过累计 `request` 数量。
6. `onNext` 必须串行调用（不可并发）。
7. 一旦 `onError` 或 `onComplete` 被调用，后续 `onNext` 等不得再调用。
8. `cancel` 后，Publisher 应尽快停止调用 `onNext` 并释放资源。
9. `cancel` 必须是幂等的（多次调用无副作用）。

---

## 附录 C：响应式生态全景图

```
                     ┌──────────────────┐
                     │   Reactive Streams│
                     │   Specification   │
                     │  (JVM Standard)   │
                     └────────┬──────────┘
                              │
            ┌─────────────────┼──────────────────┐
            │                 │                  │
            ▼                 ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   Project    │  │   RxJava 3   │  │   Mutiny     │
    │   Reactor    │  │  (Netflix)   │  │ (Quarkus)    │
    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
           │                 │                  │
           ▼                 ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Spring       │  │  RxJava      │  │  Quarkus     │
    │ WebFlux      │  │  Android     │  │  Mutiny      │
    │ (VMware)     │  │  Bindings    │  │  Reactive    │
    └──────┬───────┘  └──────────────┘  └──────────────┘
           │
           ▼
    ┌──────────────────────────────────┐
    │      Reactive Drivers            │
    ├──────────────────────────────────┤
    │ R2DBC (PostgreSQL, MySQL, H2)    │
    │ Reactive MongoDB                 │
    │ Reactive Redis (Lettuce)         │
    │ Reactive Kafka                   │
    │ Reactive RabbitMQ                │
    │ WebClient (HTTP)                 │
    │ RSocket                          │
    │ Reactor Netty (TCP/UDP/HTTP)     │
    └──────────────────────────────────┘
```

---

## 结语

响应式编程是 Java 生态在云原生时代应对高并发 I/O 的关键技术之一。它通过 Reactive Streams 规范统一了异步流的接口，通过 Project Reactor 与 RxJava 提供了强大的操作符库，通过 Spring WebFlux 与 R2DBC 实现了全栈响应式。

响应式编程的核心价值在于 **资源效率** 与 **流式处理能力**：它用少量线程服务海量并发，用背压协议解决生产消费速率不匹配，用操作符组合简化异步代码。但其代价是 **学习曲线陡峭**、**调试困难**、**与命令式库桥接复杂**。

Java 21 虚拟线程的出现为"高并发 I/O"提供了另一种选择——保留命令式代码风格，由 JVM 自动卸载阻塞线程。这并不意味着响应式编程的终结：流式数据处理、复杂异步组合、跨服务背压传播等场景，响应式仍有不可替代的价值。

对于工程师而言，关键不在于"信仰"某种范式，而在于理解每种技术的适用边界：

- **命令式 + 虚拟线程**：适合 CRUD 服务、传统 Web 应用，开发者无需学习新范式。
- **响应式**：适合流式数据处理、实时推送、复杂数据管道，能用最少资源处理最多并发。
- **混合**：Spring Boot 3.2+ 支持两者共存，响应式服务可调用虚拟线程上的阻塞代码。

掌握响应式编程的真正价值，不在于"能用 Reactor 写代码"，而在于理解 **异步数据流** 这一抽象的普适性——它超越了 Java 生态，在 JavaScript（RxJS）、Kotlin（Coroutines + Flow）、Scala（Akka Streams）、.NET（System.Reactive）中都有对应实现。学懂响应式，等于掌握了一门跨语言的并发思维模型。

---

> **学习路径建议**：
>
> 1. **入门**：先理解 `Mono` 与 `Flux` 的基本语义，能编写简单的 `map`/`filter`/`flatMap` 链。
> 2. **进阶**：学习背压、Schedulers、错误处理，能编写生产级响应式代码。
> 3. **高级**：研究自定义操作符、Reactor 内部机制、Reactive Streams 规范。
> 4. **架构**：理解响应式微服务架构，能选型响应式 vs 命令式 + 虚拟线程。
> 5. **持续**：关注 Spring Boot 与 Reactor 的版本演进，特别是与虚拟线程、GraalVM 的集成。
