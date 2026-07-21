---
order: 102
title: CompletableFuture异步编排
module: java
category: dev-lang
difficulty: advanced
description: 'Java CompletableFuture 异步编排的形式语义、CompletionStage 接口代数、Completion 栈内部结构、Java 9 API 增强、Project Loom 与虚拟线程场景下的演进路径'
author: fanquanpp
updated: '2026-07-20'
lastReviewed: 2026-07-20
reviewer: FANDEX Content Engineering Team
related:
  - java/并发编程详解
  - java/ThreadLocal内存泄漏
  - java/集合框架详解
  - java/反射与动态代理
  - java/Lambda与函数式编程
prerequisites:
  - java/概述与开发环境
  - java/Lambda与函数式编程
  - java/并发编程详解
  - java/集合框架详解
tags:
  - java
  - completable-future
  - completion-stage
  - async-programming
  - fork-join-pool
  - reactor
  - rxjava
  - virtual-threads
  - structured-concurrency
  - jep-444
  - jep-453
  - concurrency
learningObjectives:
  - '复述 CompletableFuture 的双接口实现（Future + CompletionStage）以及 JDK 1.8 引入历史，列举其相对于 Future.get() 阻塞模型的核心改进点'
  - '解释 CompletionStage 接口的代数性质（结合律、合成律、异常传播律），理解 thenApply / thenCompose / thenCombine 在范畴论中的对应关系（Functor / Monad / Applicative）'
  - '运用 CompletableFuture 实现并行任务编排（allOf / anyOf / thenCombine）、超时控制（orTimeout / completeOnTimeout）、异常恢复（exceptionally / handle / whenComplete）等生产级模式'
  - '分析 CompletableFuture 内部的 Completion 链表结构、Signaller 同步机制、ForkJoinPool.commonPool() 调度策略，识别 Async vs Sync 变体的执行语义差异'
  - '评估 CompletableFuture 与 Project Reactor、RxJava、Kotlin Coroutines、Go goroutine+channel 在异步编程模型上的设计哲学差异，针对不同场景选择最合适的异步抽象'
  - '设计一个生产级 API 聚合框架，融合 CompletableFuture 并行编排、超时降级、熔断重试、Context 传递，并评估在虚拟线程（JEP 444）与结构化并发（JEP 453）下的迁移路径'
exercises:
  - id: ex-cf-01
    type: fill-blank
    cognitiveLevel: remember
    question: "CompletableFuture 同时实现了 Future 与 ____ 两个接口，前者提供阻塞式结果查询，后者提供回调式组合原语。"
    hint: "回顾 1.1 节双接口设计"
    answer: "CompletionStage"
    blankCount: 1
    answers:
      - "CompletionStage"
    caseSensitive: false
    difficulty: 1
    explanation: "CompletableFuture 实现 Future 提供向后兼容（get/isDone/cancel），实现 CompletionStage 提供异步组合能力（thenApply/thenCompose/exceptionally）。两个接口分离了'被动等待'与'主动组合'两种语义。"
    estimatedTime: 1
  - id: ex-cf-02
    type: fill-blank
    cognitiveLevel: understand
    question: "在 CompletableFuture 中，thenApply 与 thenCompose 的关系类似于 Stream 中 map 与 ____ 的关系：前者对值进行同步转换，后者对嵌套的 CompletableFuture 进行扁平化。"
    hint: "参考 2.2 节 Monad 性质"
    answer: "flatMap"
    blankCount: 1
    answers:
      - "flatMap"
    caseSensitive: false
    difficulty: 2
    explanation: "thenApply 接收 Function<T,R>，若 R 本身是 CompletableFuture 会得到 CompletableFuture<CompletableFuture<R>>；thenCompose 接收 Function<T,CompletionStage<R>>，自动扁平化为 CompletableFuture<R>，等价于 Monad 的 bind 操作，对应 Stream.flatMap。"
    estimatedTime: 2
  - id: ex-cf-03
    type: choice
    cognitiveLevel: apply
    question: "下列哪种写法可以同时启动 3 个异步任务并等待全部完成后收集结果？"
    options:
      - "future1.thenCombine(future2, ...).thenCombine(future3, ...)"
      - "CompletableFuture.allOf(future1, future2, future3).thenApply(v -> List.of(future1.join(), future2.join(), future3.join()))"
      - "CompletableFuture.anyOf(future1, future2, future3).thenApply(...)"
      - "future1.thenApplyBoth(future2, (a, b) -> ...).thenApplyBoth(future3, ...)"
    correctIndex: 1
    answer: "B"
    multiple: false
    difficulty: 2
    explanation: "allOf 返回 CompletableFuture<Void>，仅表示全部完成不携带结果；需在其后通过 thenApply 调用每个子 future 的 join()（此时已确保完成，不会阻塞）收集结果。anyOf 是任一完成；thenCombine 仅支持两个任务；thenApplyBoth 不存在（应为 thenCombine）。"
    estimatedTime: 2
  - id: ex-cf-04
    type: choice
    cognitiveLevel: analyze
    question: "关于 CompletableFuture 的 Async 变体（如 thenApplyAsync）与同步变体（thenApply），下列哪项描述最准确？"
    options:
      - "thenApply 总是在调用线程执行，thenApplyAsync 总是在 ForkJoinPool.commonPool() 执行"
      - "thenApply 在前一个阶段已完成时于调用线程同步执行，否则由完成该阶段的线程异步执行；thenApplyAsync 始终提交到 Executor 执行"
      - "Async 变体仅是性能优化，行为完全等价于同步变体"
      - "thenApplyAsync 默认使用调用线程的 ThreadLocal 上下文"
    correctIndex: 1
    answer: "B"
    multiple: false
    difficulty: 4
    explanation: "thenApply 的执行线程取决于时机：若前阶段已完成，则当前线程同步执行；若未完成，则由触发完成的线程执行（可能是 commonPool 工作线程）。这种不确定性是常见陷阱。thenApplyAsync 始终提交到 Executor（默认 commonPool），行为可预测但有线程切换开销。Async 变体并非纯优化，是语义差异。"
    estimatedTime: 3
  - id: ex-cf-05
    type: code-fix
    cognitiveLevel: apply
    question: "下列代码尝试并行调用三个 API 并聚合结果，但 allOf 之后调用 future.get() 可能阻塞。请修复："
    buggyCode: |
      CompletableFuture<User> userFuture = userService.findById(userId);
      CompletableFuture<Order> orderFuture = orderService.findByUser(userId);
      CompletableFuture<Credit> creditFuture = creditService.findByUser(userId);

      CompletableFuture.allOf(userFuture, orderFuture, creditFuture).join();
      // 此时手动 get 各 future 风险：若某个 future 异常完成，get() 会抛 ExecutionException
      User user = userFuture.get();
      Order order = orderFuture.get();
      Credit credit = creditFuture.get();
      return new UserProfile(user, order, credit);
    language: java
    fixedCode: |
      CompletableFuture<User> userFuture = userService.findById(userId);
      CompletableFuture<Order> orderFuture = orderService.findByUser(userId);
      CompletableFuture<Credit> creditFuture = creditService.findByUser(userId);

      // allOf 完成后，每个子 future 必已完成（正常或异常），join 不会阻塞
      // 异常完成的 future 调用 join 会抛 CompletionException（Unchecked），便于统一捕获
      CompletableFuture.allOf(userFuture, orderFuture, creditFuture).join();
      try {
          User user = userFuture.join();
          Order order = orderFuture.join();
          Credit credit = creditFuture.join();
          return new UserProfile(user, order, credit);
      } catch (CompletionException ex) {
          // 统一解包 CompletionException → 原始异常
          throw new UserProfileLoadException("Failed to load profile", ex.getCause());
      }
    errorDescription: "原代码使用 get() 会抛受检异常 ExecutionException 强制 try-catch，且语义在 allOf 之后调用 get 仍可能阻塞（语义模糊）。改用 join()（无阻塞风险 + Unchecked 异常）更符合 CompletableFuture 风格，并集中捕获 CompletionException。"
    answer: "将 userFuture.get() / orderFuture.get() / creditFuture.get() 改为 join()，并用 try-catch 捕获 CompletionException 解包出原始异常后封装为业务异常 UserProfileLoadException。allOf().join() 后所有子 future 必已完成，join() 不会阻塞且抛运行时异常便于函数式风格。"
    difficulty: 3
    explanation: "allOf().join() 后所有子 future 必已完成（normal/exceptional），后续 join() 不会阻塞。get() 抛 ExecutionException（受检）需 try-catch；join() 抛 CompletionException（运行时）便于函数式风格。生产实践中应统一解包 CompletionException 取出 cause 再封装业务异常。"
    estimatedTime: 5
  - id: ex-cf-06
    type: code-fix
    cognitiveLevel: analyze
    question: "下列代码尝试实现超时降级，但若原 future 永不完成，orTimeout 后 future 会异常完成，调用方仍得到异常。请修复使超时后返回默认值："
    buggyCode: |
      CompletableFuture<String> fetchUserData(long userId) {
          CompletableFuture<String> future = apiClient.fetchUser(userId);
          // 想在 500ms 后超时，但实际上 orTimeout 异常完成时调用方拿到 TimeoutException
          return future.orTimeout(500, TimeUnit.MILLISECONDS);
      }
    language: java
    fixedCode: |
      CompletableFuture<String> fetchUserData(long userId) {
          CompletableFuture<String> future = apiClient.fetchUser(userId);
          return future.orTimeout(500, TimeUnit.MILLISECONDS)
                        .exceptionally(ex -> {
                            if (ex instanceof TimeoutException) {
                                log.warn("User fetch timed out, returning fallback: {}", userId);
                                return "{\"id\":" + userId + ",\"cached\":true}";
                            }
                            throw new CompletionException(ex);  // 其他异常不降级
                        });
      }
    errorDescription: "orTimeout 仅将 future 标记为异常完成（TimeoutException），不提供默认值。要实现降级必须链接 exceptionally 将 TimeoutException 转为默认值；非超时异常不应被降级吞掉。"
    answer: "在 future.orTimeout(500, TimeUnit.MILLISECONDS) 后链接 .exceptionally(ex -> { if (ex instanceof TimeoutException) 返回降级默认值; else throw new CompletionException(ex); })。仅对 TimeoutException 降级返回缓存/默认值，其他异常重新抛出避免被吞。等价简洁写法可用 completeOnTimeout(fallback, 500, MS)。"
    difficulty: 4
    explanation: "Java 9 引入 orTimeout（超时异常完成）与 completeOnTimeout（超时填默认值）两种语义。completeOnTimeout(fallback, ...) 等价于 orTimeout + exceptionally(return fallback)，但更简洁；本例展示 exceptionally 路径以演示异常分支判断。注意：exceptionally 应判断异常类型，仅对 TimeoutException 降级，否则会掩盖真实故障。"
    estimatedTime: 6
  - id: ex-cf-07
    type: open-ended
    cognitiveLevel: create
    question: "请设计一个 API 聚合网关，要求：(1) 并行调用 5 个下游微服务（用户/订单/库存/支付/物流）；(2) 每个调用独立超时 200ms，整体超时 800ms；(3) 任一下游失败时降级返回缓存数据；(4) 全部失败时返回兜底响应；(5) 在虚拟线程（JEP 444）环境下，是否应改用结构化并发（JEP 453）？请给出关键代码与权衡分析。"
    keyPoints:
      - "并行编排：CompletableFuture.supplyAsync 启动 5 个任务，each.orTimeout(200, MS)"
      - "整体超时：CompletableFuture.allOf(...).orTimeout(800, MS)，外加 completeOnTimeout 兜底"
      - "降级策略：每个 future 链 exceptionally(ex -> cache.get(key))，区分超时与异常类型"
      - "兜底：allOf 完成后再 exceptionally，若所有降级都失败则返回 fallbackResponse"
      - "上下文传递：使用 TransmittableThreadLocal 或 Reactor Context 传递 traceId/userId"
      - "虚拟线程权衡：JEP 444 下可用同步阻塞代码替代异步编排，可读性更高但 CompletableFuture 仍是有效抽象"
      - "结构化并发：JEP 453 的 StructuredTaskScope.ShutdownOnFailure 提供原生失败传播，但仍在 Preview"
      - "迁移路径：JDK 21 LTS 用 CompletableFuture；JDK 24+ GA 后逐步迁移到 StructuredTaskScope"
    answer: |
      关键实现：
      1. 用 CompletableFuture.supplyAsync 启动 5 个下游调用，每个独立 .orTimeout(200, MS) 并链 .exceptionally(ex -> cache.get(key)) 实现降级；
      2. 用 CompletableFuture.allOf(...).orTimeout(800, MS) 控制整体超时，再用 .completeOnTimeout(fallbackResponse, 800, MS) 兜底；
      3. allOf 完成后用 thenApply 聚合 5 个子 future 的 join() 结果；
      4. 上下文用 TransmittableThreadLocal 传递 traceId/userId（虚拟线程场景同样适用）。
      权衡分析：JEP 444 虚拟线程下可用同步阻塞代码 + try-with-resources 达到类似吞吐，可读性更高；但 CompletableFuture 仍是结果编排的有效抽象。JEP 453 结构化并发（StructuredTaskScope.ShutdownOnFailure）提供原生失败传播与作用域边界，但 JDK 21 仍为 Preview。建议：JDK 21 LTS 用 CompletableFuture，JDK 24+ GA 后新代码优先 StructuredTaskScope，老代码保持 CompletableFuture 渐进迁移。
    difficulty: 5
    minWords: 300
    estimatedTime: 25
  - id: ex-cf-08
    type: open-ended
    cognitiveLevel: evaluate
    question: "JEP 444（Virtual Threads）官方说明指出：'When code running in a virtual thread blocks, the virtual thread is suspended, freeing its carrier thread to execute other virtual threads.' 这是否意味着 CompletableFuture 在虚拟线程时代将被淘汰？请评估：(1) CompletableFuture 在虚拟线程场景下的角色变化；(2) 与结构化并发（JEP 453）的关系；(3) 在 JDK 21 LTS 与未来 LTS 版本中的迁移策略。"
    keyPoints:
      - "CompletableFuture 不会淘汰：它仍是异步结果的抽象载体，区别在于'如何执行'异步任务"
      - "虚拟线程降低了'必须用 CompletableFuture 避免线程阻塞'的压力——可用同步代码 + 虚拟线程达到类似吞吐"
      - "CompletableFuture + 虚拟线程执行器（Executors.newVirtualThreadPerTaskExecutor()）可保留组合原语同时享受虚拟线程的轻量调度"
      - "结构化并发 JEP 453 解决了 CompletableFuture 的子任务生命周期管理缺失问题（取消传播、错误传播）"
      - "CompletableFuture 的局限性：无内置取消传播（cancel 仅本阶段）、无作用域边界、异常不自动传播到兄弟任务"
      - "迁移策略：JDK 21 LTS 仍以 CompletableFuture 为主，新增场景评估 StructuredTaskScope.preview()；JDK 25+ GA 后新代码优先 StructuredTaskScope，老代码保持 CompletableFuture"
      - "评估：CompletableFuture 是抽象层（结果编排），虚拟线程是执行层（线程调度），二者正交可组合"
    answer: |
      (1) 角色变化：CompletableFuture 在虚拟线程时代不会淘汰，仍是异步结果的抽象载体。虚拟线程降低了"必须用 CompletableFuture 避免线程阻塞"的压力——可用同步阻塞代码 + 虚拟线程达到类似吞吐；但 CompletableFuture 的组合原语（thenApply/thenCompose/exceptionally）仍是复杂结果编排的有效工具，可与 Executors.newVirtualThreadPerTaskExecutor() 配合保留组合能力同时享受虚拟线程的轻量调度。
      (2) 与结构化并发的关系：JEP 453 的 StructuredTaskScope 解决了 CompletableFuture 的子任务生命周期管理缺失问题——原生支持取消传播、错误传播、作用域边界；CompletableFuture 的局限是 cancel 仅本阶段、无作用域边界、异常不自动传播到兄弟任务。两者互补：CompletableFuture 是结果编排抽象，StructuredTaskScope 是生命周期管理抽象。
      (3) 迁移策略：JDK 21 LTS 仍以 CompletableFuture 为主，新增场景评估 StructuredTaskScope（Preview）；JDK 25+ GA 后新代码优先 StructuredTaskScope，老代码保持 CompletableFuture 渐进迁移。CompletableFuture 与虚拟线程正交可组合，无需急于重写。
    difficulty: 5
    minWords: 250
    estimatedTime: 20
references:
  - type: book
    authors:
      - Goetz, Brian
      - Peierls, Tim
      - Bloch, Joshua
      - Bowbeer, Joseph
      - Holmes, David
      - Lea, Doug
    year: 2006
    title: "Java Concurrency in Practice"
    venue: "Addison-Wesley Professional"
    isbn: "978-0321349601"
  - type: book
    authors:
      - Bloch, Joshua
    year: 2018
    title: "Effective Java (3rd ed.)"
    venue: "Addison-Wesley Professional"
    isbn: "978-0134685991"
  - type: technical-report
    authors:
      - Lea, Doug
    year: 2014
    title: "The java.util.concurrent Synchronization Framework: CompletableFuture and CompletionStage"
    venue: "State University of New York at Oswego, Technical Report"
    url: "http://gee.cs.oswego.edu/dl/jsr166/dist/docs/java/util/concurrent/CompletableFuture.html"
  - type: standard
    authors:
      - Manson, Jeremy
      - Pugh, Bill
      - Adve, Sarita V.
    year: 2005
    title: "JSR 133: Java Memory Model and Thread Specification"
    venue: "Java Community Process"
    url: "https://jcp.org/en/jsr/detail?id=133"
  - type: documentation
    authors:
      - OpenJDK Team
    year: 2024
    title: "JEP 444: Virtual Threads"
    venue: "OpenJDK Official Project"
    url: "https://openjdk.org/jeps/444"
  - type: documentation
    authors:
      - OpenJDK Team
    year: 2024
    title: "JEP 453: Structured Concurrency (Preview)"
    venue: "OpenJDK Official Project"
    url: "https://openjdk.org/jeps/453"
  - type: documentation
    authors:
      - Oracle Corporation
    year: 2024
    title: "Java SE 21 API Specification: CompletableFuture"
    venue: "Oracle Official Documentation"
    url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html"
  - type: documentation
    authors:
      - Oracle Corporation
    year: 2024
    title: "Java SE 21 API Specification: CompletionStage"
    venue: "Oracle Official Documentation"
    url: "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletionStage.html"
  - type: book
    authors:
      - Wampler, Dean
    year: 2021
    title: "Reactive Design Patterns"
    venue: "Manning Publications"
    isbn: "978-1617291808"
  - type: conference
    authors:
      - Liskov, Barbara
      - Shrira, Liuba
    year: 1988
    title: "Promises: Linguistic Support for Efficient Asynchronous Procedure Calls in Distributed Systems"
    venue: "Proceedings of the ACM SIGPLAN 1988 Conference on Programming Language Design and Implementation (PLDI)"
    pages: "260-267"
    doi: "10.1145/53990.54016"
  - type: conference
    authors:
      - Friedman, Daniel P.
      - Wise, David S.
    year: 1976
    title: "The Impact of Applicative Programming on Concurrent Computation"
    venue: "Proceedings of the 1976 Conference on Parallel Processing"
    pages: "230-235"
  - type: journal
    authors:
      - Sutter, Herb
    year: 2005
    title: "The Free Lunch Is Over: A Fundamental Turn Toward Concurrency in Software"
    venue: "Dr. Dobb's Journal"
    volume: 30
    issue: 1
    pages: "202-210"
  - type: documentation
    authors:
      - Project Reactor Team
    year: 2024
    title: "Project Reactor Reference: Mono and Flux"
    venue: "VMware Official Documentation"
    url: "https://projectreactor.io/docs/core/release/reference/"
  - type: documentation
    authors:
      - ReactiveX Team
    year: 2024
    title: "ReactiveX Documentation: Observable and Flowable"
    venue: "ReactiveX Official Documentation"
    url: "http://reactivex.io/documentation/observable.html"
  - type: standard
    authors:
      - ISO/IEC
    year: 2023
    title: "ISO/IEC 14882:2023 Information technology — Programming languages — C++"
    venue: "International Organization for Standardization"
etymology:
  - term: "可完成未来（CompletableFuture）"
    english: "CompletableFuture"
    origin: "Java 8（2014）由 Doug Lea 在 JSR-166 维护版本中引入，'Completable' 强调该 Future 可被外部主动 complete()（区别于 FutureTask 仅由内部任务完成）；其设计受 Scala Promise/Future、C# Task、JavaScript Promise 启发，是 Java 对'回调地狱'问题的标准回应。"
  - term: "完成阶段（CompletionStage）"
    english: "CompletionStage"
    origin: "由 Java 8 同步引入的接口，将异步任务的'组合原语'抽象为独立的接口契约。'Stage' 暗示任务在 DAG（有向无环图）中的节点地位；'Completion' 强调触发依赖的语义事件。Reactor 的 Mono/Flux、RxJava 的 Observable 在 API 设计上均受其影响。"
  - term: "Promise（承诺）"
    english: "Promise"
    origin: "由 Barbara Liskov 和 Liuba Shrira 在 1988 年论文《Promises: Linguistic Support for Efficient Asynchronous Procedure Calls in Distributed Systems》中首次提出，原用于 Argus 分布式语言；JavaScript ES6（2015）、Scala 2.10、C++ std::future/promise 均沿用此概念。CompletableFuture 即 Java 版的 Promise。"
  - term: "异步（Asynchronous）"
    english: "Asynchronous"
    origin: "源自希腊语 a-（不）+ syn（一起）+ chronos（时间），字面义'不同时'。计算机领域最早出现于 1960 年代硬件中断模型；软件层面由 Erlang（1986）、Node.js（2009）等推广为'非阻塞 IO + 回调'范式。Java 在 NIO（2002）与 CompletableFuture（2014）中正式支持。"
  - term: "虚拟线程（Virtual Thread）"
    english: "Virtual Thread"
    origin: "由 JEP 444（JDK 21 LTS，2023）正式发布，原型为 Project Loom（2018 启动）；'virtual' 借自操作系统虚拟内存概念——'用户态调度、按需挂载'。与 Go goroutine、Kotlin coroutine、Erlang process 同属'轻量级线程'家族，但 JVM 实现保留了 Thread API 兼容性。"
  - term: "结构化并发（Structured Concurrency）"
    english: "Structured Concurrency"
    origin: "由 Martin Sústrik 在 2016 年博客提出，Nathaniel J. Smith 在 Python trio 库中系统化（2017）；Java 在 JEP 453（JDK 21 Preview）借鉴该思想。'Structured' 借自 Dijkstra 1968 年《Go To Statement Considered Harmful》倡导的结构化编程——并发任务应有明确的进入/退出边界，子任务生命周期不能逃逸父作用域。"
---

## 引言：从"阻塞等待"到"组合式异步"

Java 在 1.0（1996）就提供了 `Thread` 与 `Runnable`，但异步编程的演化历经四个阶段才达到今天的形态：

1. **Thread + Runnable（1996）**：原始线程模型，无结果返回，需手动同步；
2. **Future（2004，Java 5）**：JSR-166 引入 `Future` 接口，提供 `get()` 阻塞式结果查询，但无法回调、无法组合；
3. **CompletableFuture（2014，Java 8）**：JSR-166 维护版本引入 `CompletableFuture` 与 `CompletionStage`，将异步任务建模为可组合的"未来值"；
4. **Virtual Threads + Structured Concurrency（2023，Java 21）**：JEP 444 + JEP 453 重新审视异步模型，提供"轻量级线程 + 作用域任务"范式。

Doug Lea 在 `java.util.concurrent` 包的 Javadoc 中明确指出：

> "A Future represents the result of an asynchronous computation... However, Future alone is insufficient for effective asynchronous programming: it cannot be manually completed, cannot be combined with other Futures, and cannot react to completion without blocking."
>
> —— Doug Lea, java.util.concurrent.CompletableFuture

`CompletableFuture` 的核心贡献是把"未来值"从被动等待的对象，升级为可主动 `complete()`、可链式组合、可异常恢复的 **DAG 节点**。它实现了两个接口：

- `Future<T>`：提供 `get()` / `isDone()` / `cancel()` 阻塞式语义（向后兼容）；
- `CompletionStage<T>`：提供 `thenApply` / `thenCompose` / `exceptionally` 等组合原语。

本模块以 MIT 6.5840 Distributed Systems、Stanford CS149 Parallel Computing 与 CMU 15-440 Distributed Systems 的标准，系统讲解：

1. **CompletableFuture 的双接口设计**：Future 与 CompletionStage 的职责分离；
2. **CompletionStage 的代数性质**：结合律、合成律、异常传播律，与 Functor/Monad/Applicative 的对应；
3. **内部数据结构**：Completion 单链表、Signaller 同步器、ForkJoinPool 调度策略；
4. **Java 9 API 增强**：orTimeout、completeOnTimeout、delayedExecutor、newIncompleteFuture；
5. **生产级模式**：超时降级、熔断重试、Context 传递、并行编排；
6. **虚拟线程场景的演进**：JEP 444 / JEP 453 与 CompletableFuture 的关系；
7. **对比分析**：Reactor / RxJava / Kotlin Coroutines / Go goroutine。

## 1. 历史动机与技术演进

### 1.1 时间线

| 年份 | 事件 | 主要贡献者 |
| ---- | ---- | ---------- |
| 1976 | Friedman 与 Wise 提出 Promise 概念原型 | Daniel P. Friedman, David S. Wise |
| 1988 | Liskov 与 Shrira 在 Argus 中系统化 Promise | Barbara Liskov, Liuba Shrira |
| 1996 | Java 1.0 发布 Thread / Runnable | Sun Microsystems |
| 2002 | Java NIO 引入非阻塞 IO | JSR 51 |
| 2004 | Java 5（JSR-166）引入 Future / FutureTask / ExecutorService | Doug Lea, JSR-166 Expert Group |
| 2007 | Scala 2.7 引入 Future / Promise | Philipp Haller |
| 2009 | Node.js 推广 Promise 风格异步 IO | Ryan Dahl |
| 2011 | C# 5.0 引入 async/await 与 Task | Microsoft, Mads Torgersen |
| 2013 | RxJava 1.0 发布，引入 Reactive Streams | Netflix, Ben Christensen |
| 2014 | Java 8 引入 CompletableFuture / CompletionStage | Doug Lea, Brian Goetz |
| 2017 | Project Reactor 3.0 随 Spring 5 发布 | Stephane Maldini |
| 2018 | Project Loom 原型启动，提出 Virtual Thread | Ron Pressler, Alan Bateman |
| 2019 | Java 9 引入 orTimeout / completeOnTimeout / delayedExecutor | Doug Lea |
| 2021 | JDK 17 LTS 发布，CompletableFuture API 稳定 | OpenJDK |
| 2023 | JEP 444 Virtual Threads GA / JEP 453 Structured Concurrency Preview | Ron Pressler, Alan Bateman |
| 2024 | JDK 23 / 24 持续推进 Structured Concurrency 第三轮 Preview | OpenJDK |
| 2025 | JDK 25 EA 计划 Structured Concurrency 接近 GA | OpenJDK |

### 1.2 设计动机：Future 的四个致命缺陷

`Future`（Java 5）作为异步结果的首次抽象，存在四个被广泛诟病的缺陷。Doug Lea 在设计 `CompletableFuture` 时将其作为反面教材：

**缺陷一：`get()` 阻塞调用线程**

```java
Future<String> future = executor.submit(() -> fetchFromRemote());
String result = future.get();  // 阻塞！调用线程被挂起
```

`get()` 是阻塞操作，调用线程在结果就绪前无法做其他工作。若想并行 3 个任务，必须分别提交到不同线程，主线程再依次 `get()`——本质是"伪并行"。

**缺陷二：无法手动 `complete()`**

`FutureTask` 的 `set()` / `setException()` 是 `protected` 方法，外部无法主动完成一个 Future。这导致：无法实现缓存命中即完成、无法实现超时手动降级、无法测试桩件。

**缺陷三：无法组合多个 Future**

```java
Future<User> userFuture = ...;
Future<Order> orderFuture = ...;
// 想等两个都完成后合并？必须手动 get() 再处理
Future<UserProfile> profileFuture = executor.submit(() -> {
    User u = userFuture.get();    // 阻塞
    Order o = orderFuture.get();  // 阻塞
    return new UserProfile(u, o);
});
```

这种"在另一个线程里阻塞等待"的模式浪费线程资源，且代码丑陋。

**缺陷四：无法回调式响应完成**

`Future` 不提供 `onComplete` 回调，调用方要么轮询 `isDone()`，要么阻塞 `get()`。在事件驱动架构中，这是不可接受的。

### 1.3 设计哲学：从"被动等待"到"主动组合"

`CompletableFuture` 通过三个核心设计决策回应上述缺陷：

**决策一：双接口分离职责**

```java
public class CompletableFuture<T> implements Future<T>, CompletionStage<T> { ... }
```

`Future` 接口保留 `get/isDone/cancel` 用于与遗留代码（`ExecutorService.submit`）互操作；`CompletionStage` 接口提供 50+ 个组合方法。这种"接口分离 + 具体类融合"是 Java API 设计的常见模式。

**决策二：公有 `complete()` / `completeExceptionally()`**

```java
public boolean complete(T value);
public boolean completeExceptionally(Throwable ex);
public boolean cancel(boolean mayInterruptIfRunning);
```

允许外部主动完成 future，这是构建缓存、超时降级、测试桩件的基础。`cancel()` 在 CompletableFuture 中语义为"异常完成（CancellationException）"，不会真正中断执行线程——这是与 `FutureTask.cancel()` 的关键差异。

**决策三：链式组合与异常传播**

```java
future.thenApply(this::transform)
      .thenCompose(this::nextStage)
      .exceptionally(this::recover)
      .whenComplete(this::log);
```

每个 `CompletionStage` 方法返回新的 `CompletableFuture`，构成 DAG。异常沿 DAG 自动传播，直到被 `exceptionally` / `handle` 捕获。这是范畴论中 Monad 的核心性质在工程中的体现。

### 1.4 Project Loom 的范式冲击

JEP 444（Virtual Threads）官方说明指出：

> "Virtual threads dramatically increase the number of concurrently-running tasks... Server applications can scale to millions of concurrent tasks with high throughput."

虚拟线程让"每个请求一个线程"重新成为可行的模型——线程不再是稀缺资源。这意味着：

- **阻塞 IO 不再是性能瓶颈**：虚拟线程阻塞时仅挂起栈帧，carrier thread 仍可执行其他虚拟线程；
- **CompletableFuture 的"避免阻塞"动机减弱**：可直接用同步代码 + 虚拟线程达到类似吞吐；
- **结构化并发（JEP 453）补足组合语义**：`StructuredTaskScope` 提供原生取消传播与作用域边界。

但 CompletableFuture 并不会被淘汰，原因详见第 11 章。

## 2. 形式化定义

### 2.1 CompletableFuture 的代数语义

定义 `CompletableFuture<T>` 为值空间 $V_T = T \cup \{\bot_e \mid e \in \text{Throwable}\} \cup \{\text{pending}\}$，其中 $\bot_e$ 表示异常完成的值，$\text{pending}$ 表示未完成状态。

**完成状态机**：

$$
\text{state}(f) = \begin{cases}
\text{Pending} & \text{初始状态} \\
\text{Completed}(t) & \text{complete}(t) \text{ 成功} \\
\text{Failed}(e) & \text{completeExceptionally}(e) \text{ 或 } \text{cancel}() \\
\end{cases}
$$

状态转换是**单调的**：一旦进入 Completed 或 Failed，不可回退，且后续的 `complete/completeExceptionally` 调用返回 `false`。

### 2.2 CompletionStage 的范畴论性质

`CompletionStage<T>` 可视为函数式编程中的 **Monad**，其满足三条代数律：

**左单位律（Left Identity）**：

$$
\text{supplyAsync}(() \to t) \cdot \text{thenCompose}(f) \equiv f(t)
$$

即"创建一个已完成的 future 后立即 thenCompose"等价于"直接应用 f"。

**右单位律（Right Identity）**：

$$
\text{cf.thenCompose}(t \to \text{CompletableFuture.completedFuture}(t)) \equiv \text{cf}
$$

即"thenCompose 一个返回原值的 CompletableFuture"是恒等操作。

**结合律（Associativity）**：

$$
\text{cf.thenCompose}(f).\text{thenCompose}(g) \equiv \text{cf.thenCompose}(t \to f(t).\text{thenCompose}(g))
$$

即链式 thenCompose 的求值顺序不影响最终结果。

**Functor 性质（thenApply）**：

thenApply 对应 Functor 的 `map` 操作，满足：

$$
\text{cf.thenApply}(\text{id}) \equiv \text{cf} \quad \text{(identity)}
$$

$$
\text{cf.thenApply}(f).\text{thenApply}(g) \equiv \text{cf.thenApply}(f \circ g) \quad \text{(composition)}
$$

**Applicative 性质（thenCombine）**：

thenCombine 对应 Applicative 的 `<*>` 操作，可将两个独立 future 的值合并：

$$
\text{cf}_1.\text{thenCombine}(\text{cf}_2, f) = f(\text{cf}_1.\text{value}, \text{cf}_2.\text{value})
$$

满足 Applicative 的同态律与交换律。

### 2.3 内部数据结构

```java
public class CompletableFuture<T> implements Future<T>, CompletionStage<T> {
    // 结果字段：volatile 保证可见性
    volatile Object result;       // null 表示未完成；否则是 T 或 AltResult(Throwable)
    
    // 依赖链：栈结构（LIFO），存放等待本 future 完成的回调
    volatile Completion stack;     // 链表头节点
    
    // 内部 Completion 抽象类（栈节点）
    abstract static class Completion extends ForkJoinTask<Void>
            implements Runnable, AsynchronousCompletionTask {
        volatile Completion next;  // 链表 next 指针
        
        abstract CompletableFuture<?> tryFire(int mode);
        abstract boolean isLive();
    }
    
    // 常见子类：UniApply / UniAccept / UniRun / UniCompose / UniCombine / UniException / UniHandle / UniWhenComplete
    // 命名约定：Uni* = 单输入；Bi* = 双输入；Or* = 任一完成；And* = 全部完成
    
    static final class UniApply<T,V> extends UniCompletion<T,V> {
        Function<? super T,? extends V> fn;
    }
    
    static final class UniCompose<T,V> extends UniCompletion<T,V> {
        Function<? super T,? extends CompletionStage<V>> fn;
    }
    
    // Signaller：用于 thenApply 等同步等待
    static final class Signaller extends Completion
            implements CompletionStage<?> {
        final ForkJoinPool pool;
        // ...
    }
}
```

**关键设计点**：

1. **result 字段**：volatile 修饰，保证完成时的内存可见性。null 表示未完成，非 null 表示已完成（包含正常值 T 或包装异常的 AltResult）。
2. **stack 字段**：依赖链，存放等待本 future 完成的回调。采用 Treiber Stack（无锁 LIFO）实现，避免 CAS 竞争。
3. **Completion 抽象类**：每个依赖（如 thenApply 注册的回调）被封装为一个 Completion 节点，挂在 stack 上。
4. **tryFire 方法**：当 future 完成时，遍历 stack，依次 tryFire 每个节点，触发下游计算。

### 2.4 完成传播的 EBNF

```
completion_event ::= "complete" "(" value ")" 
                   | "completeExceptionally" "(" throwable ")"
                   | "cancel" "(" boolean ")"

propagation ::= 
    when (state == Pending) {
        state := Completed(value) | Failed(throwable);
        for each (node in stack) {
            node.tryFire(mode);  // SYNC 或 ASYNC
            pop node from stack;
        }
    }

tryFire ::= 
    if (this.isLive()) {
        result = compute(fn, source.value);
        if (result != null) {
            this.complete(result);
        }
    }
```

`mode` 参数决定执行方式：`SYNC`（在完成线程直接执行）、`ASYNC`（提交到 Executor）、`NESTED`（嵌套执行避免栈溢出）。

## 3. 理论推导

### 3.1 Async vs Sync 变体的执行语义

CompletableFuture 的每个组合方法都有三个变体：

| 变体 | 方法名 | 执行线程 | 应用场景 |
| ---- | ---- | ---- | ---- |
| 同步 | `thenApply(fn)` | 不确定（见下文） | 计算开销小、线程不敏感 |
| 异步默认池 | `thenApplyAsync(fn)` | ForkJoinPool.commonPool() | 计算开销中等、需并行 |
| 异步显式池 | `thenApplyAsync(fn, executor)` | 指定 Executor | 需隔离线程池（IO/CPU 分离） |

**同步变体的执行线程不确定性**：

`thenApply(fn)` 的执行线程取决于"前一个阶段在何时完成"：

1. 若调用 `thenApply` 时前阶段**已完成**：在**调用线程**同步执行 fn；
2. 若前阶段**未完成**：在**完成前阶段的线程**执行 fn（可能是 commonPool 工作线程、调用 complete() 的线程等）。

这种不确定性是 CompletableFuture 最常见的陷阱之一。例如：

```java
CompletableFuture<Integer> cf = CompletableFuture.supplyAsync(() -> 1);
// 当前线程：main
cf.thenApply(x -> {
    log("apply1");  // 可能 main，可能 commonPool worker
    return x + 1;
});
```

**形式化证明**（执行线程不确定性）：

设 $T_0$ 为调用 thenApply 的时刻，$T_1$ 为前阶段完成的时刻，$T_e$ 为 fn 执行的时刻。

- 若 $T_0 \geq T_1$：thenApply 在 $T_0$ 检测到 result 非空，**立即同步执行**，$T_e = T_0$，执行线程 = 调用线程。
- 若 $T_0 < T_1$：thenApply 创建 Completion 节点压入 stack，**注册回调**。当 $T_1$ 时刻前阶段完成，遍历 stack 触发 tryFire，$T_e = T_1$，执行线程 = 完成线程。

**生产建议**：

- IO 操作、阻塞调用 → **必须用 Async 变体**，避免在 commonPool 工作线程阻塞；
- 简单转换（getter、字段映射）→ 同步变体可接受；
- 涉及 ThreadLocal → 同步变体可能丢上下文，需用 Async + TransmittableThreadLocal。

### 3.2 ForkJoinPool.commonPool() 的并行度

CompletableFuture 默认使用 `ForkJoinPool.commonPool()` 作为 Executor。其并行度计算公式：

$$
\text{parallelism} = \min(\text{availableProcessors} - 1, \text{property}(\text{java.util.concurrent.ForkJoinPool.common.parallelism}))
$$

**关键约束**：

- 并行度 = CPU 核数 - 1（保留 1 个核给 main 线程与 GC）；
- 该池是**所有** CompletableFuture 共享的（除非显式传 Executor）；
- **不应在 commonPool 任务中执行阻塞 IO**，否则会"饿死"其他 CompletableFuture。

**形式化推导**（吞吐量上限）：

设任务有 $W$ 比例的 CPU 工作 + $1-W$ 比例的 IO 阻塞，CPU 核数为 $N$。则 commonPool 的最大有效并行任务数为：

$$
\text{maxTasks} \approx \frac{N-1}{W} = \frac{N-1}{1 - \text{IO\_ratio}}
$$

若 IO 占 90%（$W=0.1$），8 核机器最多支持 $\frac{7}{0.1} = 70$ 个并发 CompletableFuture。这是为何生产环境**必须显式指定 IO 专用 Executor** 的根本原因。

### 3.3 异常传播的 DAG 路径

CompletableFuture 的异常沿 DAG 自动传播，其语义可用如下规则描述：

**传播规则**：

设节点 $A \xrightarrow{\text{thenApply}} B \xrightarrow{\text{thenApply}} C$，若 $A$ 异常完成（state = Failed(e)）：

1. B 的 tryFire 检测到 source（A）的 result 是 AltResult(e)，**不执行 fn**，直接将 e 传递给 B 的 result；
2. B 进入 Failed(e) 状态，触发 C 的 tryFire；
3. C 同样跳过 fn，传递 e；
4. 直到链上某个节点用 `exceptionally` / `handle` / `whenComplete` 捕获异常，传播停止。

**形式化表示**：

$$
\text{state}(B) = \begin{cases}
\text{Completed}(f(a)) & \text{if } \text{state}(A) = \text{Completed}(a) \\
\text{Failed}(e) & \text{if } \text{state}(A) = \text{Failed}(e)
\end{cases}
$$

**exceptionally 的恢复语义**：

```java
cf.exceptionally(ex -> fallback);
```

等价于：

$$
\text{state}(\text{cf}') = \begin{cases}
\text{Completed}(v) & \text{if } \text{state}(\text{cf}) = \text{Completed}(v) \\
\text{Completed}(\text{fallback}) & \text{if } \text{state}(\text{cf}) = \text{Failed}(e)
\end{cases}
$$

exceptionally 将异常状态"恢复"为正常状态。注意：若 exceptionally 的 fallback 抛异常，新异常继续传播。

### 3.4 allOf / anyOf 的代数性质

**allOf（合取）**：

```java
CompletableFuture<Void> allOf(CompletableFuture<?>... cfs);
```

语义：所有输入完成（正常或异常）后完成。其代数性质：

- **任意一个异常**：allOf 立即异常完成（不等其他）；
- **全部正常完成**：allOf 正常完成（值为 null）；
- **不携带结果**：返回 `CompletableFuture<Void>`，需通过子 future 单独 get。

**anyOf（析取）**：

```java
CompletableFuture<Object> anyOf(CompletableFuture<?>... cfs);
```

语义：任一输入完成后完成。其代数性质：

- **第一个完成（正常或异常）**：anyOf 立即完成，值与异常与第一个完成的一致；
- **其他 future 不被取消**：仍在后台运行，但结果被忽略（这是常见陷阱——可能造成资源泄漏）。

**幂等性**：

allOf 与 anyOf 不影响输入 future 的状态，可重复调用：

$$
\text{allOf}(S) \cdot \text{allOf}(S) \equiv \text{allOf}(S)
$$

### 3.5 Java 9 API 增强的设计动机

Java 9 为 CompletableFuture 引入以下关键 API：

| API | 用途 | 设计动机 |
| ---- | ---- | ---- |
| `orTimeout(timeout, unit)` | 超时异常完成 | 解决"永不完成的 future"问题 |
| `completeOnTimeout(value, timeout, unit)` | 超时填默认值完成 | 等价于 orTimeout + exceptionally |
| `delayedExecutor(delay, unit, executor)` | 延迟执行的 Executor | 实现"延迟启动"任务 |
| `newIncompleteFuture()` | 创建同类型的空 future | 子类扩展点 |
| `copy()` | 创建副本 | 隔离 complete 调用 |
| `minimalCompletionStage()` | 创建仅 CompletionStage 的视图 | 防止外部 complete |
| `defaultExecutor()` | 获取默认 Executor | 子类覆盖默认池 |

**orTimeout 的实现机制**：

```java
public CompletableFuture<T> orTimeout(long timeout, TimeUnit unit) {
    if (unit == null) throw new NullPointerException();
    if (result == null) {
        // 用 Delayer（ScheduledThreadPoolExecutor）调度延迟任务
        Delayer d = new Delayer(new Timeout(this), timeout, unit);
        // 当本 future 完成时，取消 Delayer
        whenComplete(new Canceller(d));
    }
    return this;
}
```

内部使用 `ScheduledThreadPool`（Delayer）调度超时回调，并通过 whenComplete 注册 Canceller 在正常完成时取消超时任务。这种"延迟器 + 取消器"模式避免了为每个 orTimeout 创建独立线程。

## 4. 代码示例

### 4.1 创建 CompletableFuture

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class CreationDemo {

    // 1. 异步执行有返回值的任务（默认 commonPool）
    CompletableFuture<String> fetchUserName(Long userId) {
        return CompletableFuture.supplyAsync(() -> {
            return userDao.findById(userId).getName();
        });
    }

    // 2. 异步执行无返回值的任务
    CompletableFuture<Void> sendNotification(String email) {
        return CompletableFuture.runAsync(() -> {
            mailClient.send(email, "Welcome");
        });
    }

    // 3. 显式指定 Executor（IO 密集型应用必须）
    private final ExecutorService ioPool = 
        Executors.newFixedThreadPool(50, namedThreadFactory("io-pool"));
    
    CompletableFuture<User> fetchUserWithIoPool(Long userId) {
        return CompletableFuture.supplyAsync(() -> userDao.findById(userId), ioPool);
    }

    // 4. 已完成的 future（缓存命中场景）
    CompletableFuture<User> fetchUserWithCache(Long userId) {
        User cached = cache.get(userId);
        if (cached != null) {
            return CompletableFuture.completedFuture(cached);
        }
        return CompletableFuture.supplyAsync(() -> userDao.findById(userId), ioPool)
                                 .whenComplete((u, ex) -> {
                                     if (u != null) cache.put(userId, u);
                                 });
    }

    // 5. 失败的 future（默认值场景）
    CompletableFuture<String> fetchWithFallback(Long userId) {
        try {
            return CompletableFuture.completedFuture(doLocalQuery(userId));
        } catch (Exception e) {
            return CompletableFuture.failedFuture(e);  // Java 9+
        }
    }

    // 6. 手动 complete（事件驱动场景）
    CompletableFuture<Event> createPromiseStyle() {
        CompletableFuture<Event> future = new CompletableFuture<>();
        eventBus.subscribe(event -> {
            // 某个回调在事件到达时主动完成 future
            future.complete(event);
        });
        return future;
    }
}
```

### 4.2 串行编排：thenApply / thenAccept / thenRun / thenCompose

```java
public class SerialCompositionDemo {

    void demo() {
        // thenApply：转换值（Function<T, R>）
        CompletableFuture<Integer> cf1 = CompletableFuture
            .supplyAsync(() -> "42")
            .thenApply(Integer::parseInt)        // String -> Integer
            .thenApply(x -> x * 2)               // Integer -> Integer
            .thenApply(x -> x + 1);              // 链式转换

        // thenAccept：消费值（Consumer<T>），返回 CompletableFuture<Void>
        CompletableFuture<Void> cf2 = CompletableFuture
            .supplyAsync(() -> "hello")
            .thenAccept(s -> System.out.println("Got: " + s));

        // thenRun：仅执行动作（Runnable），不接收值
        CompletableFuture<Void> cf3 = CompletableFuture
            .supplyAsync(() -> "ignored")
            .thenRun(() -> System.out.println("Done"));

        // thenCompose：扁平化嵌套（Monad bind）
        // 错误示范：thenApply 会得到 CompletableFuture<CompletableFuture<Order>>
        // 正确示范：thenCompose 扁平化为 CompletableFuture<Order>
        CompletableFuture<Order> cf4 = CompletableFuture
            .supplyAsync(() -> userService.findUserIdByName("alice"))
            .thenCompose(userId -> orderService.findOrderByUserId(userId));
        
        // 链式调用实战：API 网关聚合
        CompletableFuture<UserProfile> profileFuture = CompletableFuture
            .supplyAsync(() -> userService.findByName("alice"), ioPool)
            .thenCompose(user -> {
                // 并行获取订单与积分
                CompletableFuture<Order> orderF = orderService.findByUserId(user.getId());
                CompletableFuture<Integer> pointsF = pointsService.findByUserId(user.getId());
                return orderF.thenCombine(pointsF, (order, points) -> 
                    new UserProfile(user, order, points));
            });
    }
}
```

### 4.3 组合编排：thenCombine / allOf / anyOf

```java
public class ParallelCompositionDemo {

    // thenCombine：合并两个独立 future
    CompletableFuture<String> combineTwo() {
        CompletableFuture<String> nameF = CompletableFuture.supplyAsync(() -> "Alice");
        CompletableFuture<Integer> ageF = CompletableFuture.supplyAsync(() -> 30);
        return nameF.thenCombine(ageF, (name, age) -> name + " is " + age);
    }

    // allOf：等待全部完成（不携带结果，需手动 join）
    CompletableFuture<List<Object>> allOf(List<CompletableFuture<?>> futures) {
        CompletableFuture<Void> allDone = CompletableFuture.allOf(
            futures.toArray(new CompletableFuture[0])
        );
        return allDone.thenApply(v -> 
            futures.stream().map(CompletableFuture::join).collect(toList())
        );
    }

    // anyOf：任一完成即返回（注意：其他 future 不被取消）
    CompletableFuture<Object> anyOf(CompletableFuture<?>... futures) {
        return CompletableFuture.anyOf(futures);
    }

    // 生产实战：API 聚合（5 个下游服务并行）
    CompletableFuture<ApiResponse> aggregateApi(Long userId) {
        CompletableFuture<User> userF = userService.findById(userId);
        CompletableFuture<List<Order>> ordersF = orderService.findByUserId(userId);
        CompletableFuture<Credit> creditF = creditService.findByUserId(userId);
        CompletableFuture<Inventory> invF = inventoryService.findByUserId(userId);
        CompletableFuture<Logistic> logF = logisticService.findByUserId(userId);

        return CompletableFuture.allOf(userF, ordersF, creditF, invF, logF)
            .thenApply(v -> {
                // 此时所有 future 已完成，join 不会阻塞
                return new ApiResponse(
                    userF.join(),
                    ordersF.join(),
                    creditF.join(),
                    invF.join(),
                    logF.join()
                );
            });
    }

    // 生产实战：冗余请求（任一成功即返回，类似 Redis 主从切换）
    CompletableFuture<String> redundantFetch(String key) {
        CompletableFuture<String> primary = CompletableFuture
            .supplyAsync(() -> redisPrimary.get(key), ioPool)
            .orTimeout(100, MILLISECONDS);
        
        CompletableFuture<String> secondary = CompletableFuture
            .supplyAsync(() -> redisSecondary.get(key), ioPool)
            .orTimeout(200, MILLISECONDS);
        
        return CompletableFuture.anyOf(primary, secondary)
            .thenApply(obj -> (String) obj)
            .orTimeout(300, MILLISECONDS);
    }
}
```

### 4.4 异常处理：exceptionally / handle / whenComplete

```java
public class ExceptionHandlingDemo {

    // exceptionally：仅处理异常，正常值透传
    CompletableFuture<String> withExceptionally() {
        return CompletableFuture
            .supplyAsync(() -> {
                if (Math.random() > 0.5) throw new RuntimeException("Random failure");
                return "success";
            })
            .exceptionally(ex -> {
                log.error("Failed: {}", ex.getMessage());
                return "fallback";
            });
    }

    // handle：同时处理正常与异常（BiFunction<T, Throwable, R>）
    CompletableFuture<String> withHandle() {
        return CompletableFuture
            .supplyAsync(() -> {
                if (Math.random() > 0.5) throw new RuntimeException("Random failure");
                return "success";
            })
            .handle((result, ex) -> {
                if (ex != null) {
                    return "fallback due to: " + ex.getMessage();
                }
                return result.toUpperCase();
            });
    }

    // whenComplete：副作用（BiConsumer<T, Throwable>），不改变值
    CompletableFuture<String> withWhenComplete() {
        return CompletableFuture
            .supplyAsync(() -> "data")
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    metrics.increment("fetch.failure");
                    log.error("Failed", ex);
                } else {
                    metrics.increment("fetch.success");
                    log.info("Got: {}", result);
                }
            });
    }

    // exceptionallyCompose：异常时返回新的 CompletionStage（Java 12+）
    CompletableFuture<String> withRetry() {
        return fetchWithRetry("https://api.example.com/data", 3);
    }

    private CompletableFuture<String> fetchWithRetry(String url, int maxRetries) {
        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> httpClient.get(url));
        for (int i = 0; i < maxRetries; i++) {
            future = future.exceptionallyCompose(ex -> {
                log.warn("Retry {} for {}: {}", i + 1, url, ex.getMessage());
                return CompletableFuture.supplyAsync(() -> httpClient.get(url));
            });
        }
        return future;
    }

    // 异常类型区分
    CompletableFuture<String> discriminatedRecovery() {
        return CompletableFuture
            .supplyAsync(() -> callRemote())
            .exceptionally(ex -> {
                Throwable cause = (ex instanceof CompletionException) ? ex.getCause() : ex;
                if (cause instanceof TimeoutException) {
                    return "timeout fallback";
                } else if (cause instanceof ConnectException) {
                    return "network fallback";
                } else if (cause instanceof HttpServerErrorException) {
                    return "server error fallback";
                }
                // 未知异常不降级，继续抛出
                throw new CompletionException(cause);
            });
    }
}
```

### 4.5 Java 9 API：超时与延迟

```java
import java.util.concurrent.TimeUnit;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

public class Java9ApiDemo {

    // orTimeout：超时异常完成
    CompletableFuture<String> fetchWithTimeout(String url) {
        return CompletableFuture
            .supplyAsync(() -> httpClient.get(url))
            .orTimeout(500, TimeUnit.MILLISECONDS)  // 500ms 后抛 TimeoutException
            .exceptionally(ex -> {
                if (ex instanceof TimeoutException) {
                    return "timeout default";
                }
                throw new CompletionException(ex);
            });
    }

    // completeOnTimeout：超时填默认值（等价于 orTimeout + exceptionally）
    CompletableFuture<String> fetchWithFallback(String url) {
        return CompletableFuture
            .supplyAsync(() -> httpClient.get(url))
            .completeOnTimeout("default value", 500, TimeUnit.MILLISECONDS);
    }

    // delayedExecutor：延迟启动任务
    CompletableFuture<String> scheduledFetch(String url) {
        Executor delayedExecutor = CompletableFuture.delayedExecutor(
            5, TimeUnit.SECONDS, ioPool
        );
        return CompletableFuture.supplyAsync(() -> httpClient.get(url), delayedExecutor);
    }

    // 实战：指数退避重试
    CompletableFuture<String> fetchWithBackoff(String url, int maxRetry) {
        CompletableFuture<String> future = CompletableFuture.supplyAsync(() -> httpClient.get(url));
        
        for (int i = 0; i < maxRetry; i++) {
            final int retryCount = i;
            long delay = (long) Math.pow(2, retryCount) * 100;  // 100ms, 200ms, 400ms...
            Executor delayExecutor = CompletableFuture.delayedExecutor(delay, TimeUnit.MILLISECONDS);
            
            future = future.exceptionallyCompose(ex -> 
                CompletableFuture.supplyAsync(() -> {
                        log.info("Retry {} after {}ms", retryCount + 1, delay);
                        return httpClient.get(url);
                    }, delayExecutor)
            );
        }
        return future;
    }

    // newIncompleteFuture：子类扩展点
    class RetryableCompletableFuture<T> extends CompletableFuture<T> {
        @Override
        public <U> CompletableFuture<U> newIncompleteFuture() {
            return new RetryableCompletableFuture<>();
        }
    }

    // copy：创建副本，隔离 complete 调用
    CompletableFuture<String> shareFutureSafely(CompletableFuture<String> source) {
        CompletableFuture<String> copy = source.copy();
        // 调用方可对 copy 调用 complete 而不影响 source
        return copy;
    }

    // minimalCompletionStage：仅暴露 CompletionStage，禁止 complete
    CompletionStage<String> readOnlyView(CompletableFuture<String> source) {
        return source.minimalCompletionStage();
    }
}
```

### 4.6 自定义 Executor：IO/CPU 分离

```java
import java.util.concurrent.*;

public class ExecutorIsolationDemo {

    // CPU 密集型任务：用 ForkJoinPool（工作窃取）
    private final ForkJoinPool cpuPool = new ForkJoinPool(
        Runtime.getRuntime().availableProcessors(),
        ForkJoinPool.defaultForkJoinWorkerThreadFactory,
        null, true
    );

    // IO 密集型任务：用 FixedThreadPool（线程数远超 CPU 核数）
    private final ExecutorService ioPool = Executors.newFixedThreadPool(
        200,
        new ThreadFactoryBuilder().setNameFormat("io-pool-%d").build()
    );

    // 混合任务示例：CPU 计算 + IO 调用
    CompletableFuture<Result> mixedWorkflow() {
        return CompletableFuture
            // 阶段 1：IO 拉数据（用 ioPool）
            .supplyAsync(() -> {
                String data = httpClient.get("https://api/data");
                return data;
            }, ioPool)
            // 阶段 2：CPU 解析（用 cpuPool）
            .thenApplyAsync(data -> parseAndCompute(data), cpuPool)
            // 阶段 3：IO 写回（用 ioPool）
            .thenComposeAsync(result -> 
                CompletableFuture.supplyAsync(() -> {
                    database.save(result);
                    return result;
                }, ioPool)
            );
    }

    // 命名线程工厂（排查问题必备）
    static class ThreadFactoryBuilder {
        private String format = "pool-%d";
        public ThreadFactoryBuilder setNameFormat(String format) {
            this.format = format;
            return this;
        }
        public ThreadFactory build() {
            return new ThreadFactory() {
                private final AtomicInteger counter = new AtomicInteger(0);
                @Override
                public Thread newThread(Runnable r) {
                    Thread t = new Thread(r);
                    t.setName(String.format(format, counter.getAndIncrement()));
                    t.setDaemon(true);
                    return t;
                }
            };
        }
    }
}
```

### 4.7 与 Reactor / RxJava 互转

```java
import reactor.core.publisher.Mono;
import reactor.core.publisher.Flux;
import io.reactivex.Single;

public class ReactorInteropDemo {

    // CompletableFuture -> Mono
    Mono<String> toMono(CompletableFuture<String> cf) {
        return Mono.fromFuture(cf);
    }

    // Mono -> CompletableFuture
    CompletableFuture<String> fromMono(Mono<String> mono) {
        return mono.toFuture();
    }

    // CompletableFuture -> Single (RxJava)
    Single<String> toSingle(CompletableFuture<String> cf) {
        return Single.fromFuture(cf);
    }

    // 实战：在 Reactor 流中调用 CompletableFuture
    Mono<UserProfile> aggregateViaReactor(Long userId) {
        return Mono.fromFuture(() -> userService.findById(userId).toCompletableFuture())
            .flatMap(user -> {
                Mono<Order> orderMono = Mono.fromFuture(() -> orderService.findByUserId(user.getId()));
                Mono<Integer> pointsMono = Mono.fromFuture(() -> pointsService.findByUserId(user.getId()));
                return Mono.zip(orderMono, pointsMono, (order, points) -> new UserProfile(user, order, points));
            });
    }

    // 实战：在 CompletableFuture 中调用 Reactor API
    CompletableFuture<String> callReactorApi() {
        return webClient.get()
            .uri("/api/data")
            .retrieve()
            .bodyToMono(String.class)
            .toFuture();  // Reactor Mono -> CompletableFuture
    }
}
```

### 4.8 Context 传递：解决 ThreadLocal 丢失

```java
import com.alibaba.ttl.TransmittableThreadLocal;
import com.alibaba.ttl.threadpool.TtlExecutors;

public class ContextPropagationDemo {

    // 问题：CompletableFuture 切换线程后 ThreadLocal 丢失
    private final ThreadLocal<String> traceId = new ThreadLocal<>();
    
    void brokenContextPropagation() {
        traceId.set("trace-123");
        CompletableFuture
            .supplyAsync(() -> {
                // 这里 traceId.get() 返回 null！commonPool 线程无此 ThreadLocal
                log.info("trace={}", traceId.get());  // null
                return "data";
            });
    }

    // 方案 1：使用 TransmittableThreadLocal（阿里 TTL）
    private final TransmittableThreadLocal<String> traceIdTtl = new TransmittableThreadLocal<>();
    
    void fixedWithTtl() {
        traceIdTtl.set("trace-123");
        // 用 TtlExecutors.getTtlExecutor 包装 Executor
        Executor ttlExecutor = TtlExecutors.getTtlExecutor(ioPool);
        CompletableFuture
            .supplyAsync(() -> {
                log.info("trace={}", traceIdTtl.get());  // "trace-123"
                return "data";
            }, ttlExecutor);
    }

    // 方案 2：手动显式传递
    CompletableFuture<String> withExplicitContext(String traceId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                MDC.put("traceId", traceId);
                return doWork();
            } finally {
                MDC.remove("traceId");
            }
        });
    }

    // 方案 3：使用 Micrometer ContextPropagation（与 Reactor 兼容）
    // 在 application.yml 配置 context-propagation 后：
    // Hooks.enableAutomaticContextPropagation();
    // 此时 Mono.fromFuture 会自动传递 ContextView

    // 方案 4：JDK 21+ Scoped Values（Preview）
    // private static final ScopedValue<String> TRACE_ID = ScopedValue.newInstance();
    // ScopedValue.where(TRACE_ID, "trace-123").run(() -> {
    //     CompletableFuture.supplyAsync(() -> {
    //         // TRACE_ID.get() 在虚拟线程 + Scoped Values 下能正确传递
    //     }, virtualThreadExecutor);
    // });
}
```

### 4.9 虚拟线程执行器（JDK 21+）

```java
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.CompletableFuture;

public class VirtualThreadExecutorDemo {

    // JDK 21：每个任务一个虚拟线程
    private final ExecutorService virtualThreadExecutor = 
        Executors.newVirtualThreadPerTaskExecutor();

    // 虚拟线程 + CompletableFuture：保留组合原语 + 享受虚拟线程轻量调度
    CompletableFuture<UserProfile> fetchWithVirtualThreads(Long userId) {
        return CompletableFuture
            .supplyAsync(() -> {
                // 这里运行在虚拟线程上，阻塞 IO 不浪费 OS 线程
                return userService.findById(userId);
            }, virtualThreadExecutor)
            .thenComposeAsync(user -> {
                return CompletableFuture.supplyAsync(() -> {
                    // 阻塞调用 OK：虚拟线程阻塞时 carrier thread 释放
                    return orderService.findByUserId(user.getId());
                }, virtualThreadExecutor);
            }, virtualThreadExecutor);
    }

    // 对比：传统平台线程 vs 虚拟线程
    void benchmarkComparison() {
        // 平台线程池：200 线程上限，200 并发阻塞任务即饱和
        ExecutorService platformPool = Executors.newFixedThreadPool(200);
        
        // 虚拟线程池：无上限（受堆内存限制），可同时跑百万级阻塞任务
        ExecutorService virtualPool = Executors.newVirtualThreadPerTaskExecutor();
        
        // 在虚拟线程下，CompletableFuture 的"避免阻塞"优势减弱
        // 但其"组合原语"价值仍在（allOf / thenCombine / exceptionally）
    }

    // 虚拟线程下的"陷阱"：synchronized 阁联（pinning）
    void pinningIssue() {
        // 虚拟线程在 synchronized 块中阻塞时，carrier thread 无法释放（JDK 21 已部分修复）
        // 推荐改用 ReentrantLock（在虚拟线程下行为正确）
        Lock lock = new ReentrantLock();
        CompletableFuture.supplyAsync(() -> {
            lock.lock();
            try {
                return blockingIO();  // 虚拟线程可正常挂起
            } finally {
                lock.unlock();
            }
        }, virtualThreadExecutor);
    }
}
```

### 4.10 结构化并发（JEP 453 Preview）

```java
import java.util.concurrent.StructuredTaskScope;
import java.util.concurrent.StructuredTaskScope.ShutdownOnFailure;

public class StructuredConcurrencyDemo {

    // 传统 CompletableFuture：子任务生命周期不可控
    CompletableFuture<UserProfile> legacyFetch(Long userId) {
        CompletableFuture<User> userF = CompletableFuture.supplyAsync(() -> userService.findById(userId));
        CompletableFuture<Order> orderF = CompletableFuture.supplyAsync(() -> orderService.findByUserId(userId));
        // 问题：若 userF 失败，orderF 仍在后台运行（资源泄漏）
        // 问题：若主线程被中断，userF 与 orderF 不会被取消
        return userF.thenCombine(orderF, UserProfile::new);
    }

    // JEP 453 结构化并发：子任务生命周期与父作用域绑定
    UserProfile structuredFetch(Long userId) throws Exception {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            // 启动子任务：生命周期与 scope 绑定
            StructuredTaskScope.Subtask<User> userTask = 
                scope.fork(() -> userService.findById(userId));
            StructuredTaskScope.Subtask<Order> orderTask = 
                scope.fork(() -> orderService.findByUserId(userId));
            
            // 等待全部完成（或任一失败）
            scope.join();
            
            // 若任一失败，抛异常（自动取消其他子任务）
            scope.throwIfFailed();
            
            return new UserProfile(userTask.get(), orderTask.get());
        }
    }

    // ShutdownOnSuccess：任一成功即返回（用于冗余请求）
    String fastestMirror() throws Exception {
        try (var scope = new StructuredTaskScope.ShutdownOnSuccess<String>()) {
            scope.fork(() -> fetchFromMirror("mirror1"));
            scope.fork(() -> fetchFromMirror("mirror2"));
            scope.fork(() -> fetchFromMirror("mirror3"));
            scope.join();
            return scope.result();
        }
    }

    // 权衡：CompletableFuture vs StructuredTaskScope
    void migrationConsiderations() {
        // CompletableFuture 优势：
        //   1. JDK 8+ 通用，无 Preview 限制
        //   2. 丰富的组合原语（50+ 方法）
        //   3. 与 Reactor / RxJava 互操作成熟
        //   4. 异步回调语义清晰
        //
        // StructuredTaskScope 优势：
        //   1. 原生取消传播（无需手动 cancel）
        //   2. 作用域边界明确（try-with-resources）
        //   3. 错误传播自动（ShutdownOnFailure）
        //   4. 配合虚拟线程表现最佳
        //
        // 迁移策略：
        //   JDK 21 LTS：保留 CompletableFuture，新场景试点 StructuredTaskScope
        //   JDK 25+ GA：新代码优先 StructuredTaskScope，老代码保持 CompletableFuture
    }
}
```

## 5. 对比分析

### 5.1 CompletableFuture vs Future

| 维度 | Future（Java 5） | CompletableFuture（Java 8） |
| ---- | ---- | ---- |
| 阻塞模型 | get() 阻塞 | get() 阻塞 + 回调式组合 |
| 手动完成 | 不支持（FutureTask.set 为 protected） | 支持（complete / completeExceptionally） |
| 组合能力 | 无 | 50+ 组合方法 |
| 异常处理 | get() 抛 ExecutionException | exceptionally / handle / whenComplete |
| 取消语义 | cancel(true) 中断执行线程 | cancel() 仅标记 CancellationException |
| 回调机制 | 无 | thenApply / thenAccept / thenRun |
| 范畴论基础 | 无 | Monad / Functor / Applicative |
| 适用场景 | 遗留代码、简单异步 | 复杂编排、生产级异步 |

### 5.2 CompletableFuture vs Project Reactor (Mono/Flux)

| 维度 | CompletableFuture | Mono / Flux |
| ---- | ---- | ---- |
| 元素数量 | 0 或 1 | 0..N（Mono）/ 0..N（Flux） |
| 惰性求值 | 即时启动 | 订阅时启动（冷流） |
| 背压 | 不支持 | 支持（Reactive Streams） |
| 操作符数量 | ~50 | ~150 |
| 取消传播 | 仅本阶段 | 沿链向上传播 |
| 时间维度 | 难以表达（仅 orTimeout） | 丰富（interval / window / buffer） |
| 背压压力 | N/A | 流式处理必备 |
| 学习曲线 | 低 | 高 |
| 生态集成 | Java 原生 | Spring WebFlux / R2DBC / RSocket |
| 适用场景 | 一次性任务编排 | 流式数据、背压、事件驱动 |

### 5.3 CompletableFuture vs RxJava (Single/Observable)

| 维度 | CompletableFuture | RxJava Single | RxJava Observable |
| ---- | ---- | ---- | ---- |
| 元素模型 | 单值 | 单值或错误 | 0..N 值或错误 |
| 求值时机 | 即时 | 订阅时 | 订阅时 |
| 操作符 | ~50 | ~100 | ~200 |
| 线程模型 | Executor | Scheduler | Scheduler |
| 背压 | 不支持 | 不支持 | Flowable 支持 |
| 互操作 | Java 原生 | 需依赖 | 需依赖 |
| 适用场景 | Java 8 异步编排 | 单值异步 | 事件流、复杂流 |

### 5.4 CompletableFuture vs Kotlin Coroutines

| 维度 | CompletableFuture | Kotlin Coroutines |
| ---- | ---- | ---- |
| 编程模型 | 回调链（thenApply 链） | async/await（同步写法异步执行） |
| 控制流 | 链式 | 顺序结构化 |
| 可读性 | 中（链长时"回调地狱"） | 高（类似同步代码） |
| 异常处理 | exceptionally | try/catch |
| 取消传播 | 仅本阶段 | 协程作用域自动传播 |
| 类型系统 | CompletableFuture<T> | suspend CoroutineScheduler.() -> T |
| 跨语言 | Java 原生 | Kotlin/JVM 原生，Java 可调用 |
| 性能 | 中（每个阶段一个对象） | 高（状态机编译优化） |
| 调试 | 中（堆栈跨线程） | 高（协程调试器） |
| 学习曲线 | 低 | 中（需理解 suspend CPS 变换） |

### 5.5 CompletableFuture vs Go goroutine + channel

| 维度 | CompletableFuture | Go goroutine + channel |
| ---- | ---- | ---- |
| 并发单元 | CompletableFuture（任务） | goroutine（协程） |
| 通信机制 | 共享内存 + DAG 回调 | CSP 模型（channel） |
| 调度 | JVM 线程池 | Go runtime（M:N 调度） |
| 取消传播 | 仅本阶段 | context.Context 显式传播 |
| 错误处理 | exceptionally | 显式 error 返回值 |
| 范畴论基础 | Monad | 无（命令式） |
| 性能 | 中（对象创建开销） | 高（栈可增长） |
| 调试 | 中（跨线程堆栈） | 高（pprof / trace） |
| 学习曲线 | 低 | 中 |

### 5.6 CompletableFuture vs Rust async/await

| 维度 | CompletableFuture | Rust async/await |
| ---- | ---- | ---- |
| 编程模型 | 回调链 | async/await（零成本抽象） |
| 内存模型 | 堆分配（每阶段一个对象） | 栈分配（状态机编译） |
| 类型系统 | CompletableFuture<T> | impl Future<Output=T> |
| 执行模型 | Executor 驱动 | Runtime（tokio / async-std） |
| 取消传播 | 仅本阶段 | Drop 自动取消 |
| 错误处理 | exceptionally | Result<T, E> |
| 性能 | 中 | 极高（无 GC、无运行时） |
| 安全性 | 运行时错误 | 编译期保证（Send/Sync） |

## 6. 常见陷阱

### 6.1 陷阱一：在 commonPool 中执行阻塞 IO

```java
// 反例：commonPool 线程被阻塞，影响所有 CompletableFuture
CompletableFuture<String> fetch() {
    return CompletableFuture.supplyAsync(() -> {
        return blockingHttpCall();  // 阻塞 2 秒
    });  // 默认 commonPool，并行度 = CPU - 1
}

// 正例：显式指定 IO 专用 Executor
private final ExecutorService ioPool = Executors.newFixedThreadPool(100);

CompletableFuture<String> fetchFixed() {
    return CompletableFuture.supplyAsync(() -> {
        return blockingHttpCall();
    }, ioPool);
}
```

**根因**：ForkJoinPool.commonPool() 并行度 = CPU 核数 - 1，设计用于 CPU 密集型任务。若在此池执行阻塞 IO，工作线程被挂起，其他 CompletableFuture 因无工作线程而饥饿。

### 6.2 陷阱二：thenApply 的执行线程不确定性

```java
// 反例：thenApply 中读 ThreadLocal 可能丢失
CompletableFuture<String> fetch(Long userId) {
    traceId.set("trace-123");
    CompletableFuture<String> cf = CompletableFuture
        .supplyAsync(() -> userDao.findById(userId), ioPool)
        .thenApply(user -> {
            // traceId.get() 可能返回 null！
            // 因为此时可能由 ioPool 工作线程执行（前阶段未完成时）
            // 也可能由 main 线程执行（前阶段已完成时，竞态条件）
            log.info("trace={}", traceId.get());
            return user.getName();
        });
    return cf;
}
```

**修复**：使用 `thenApplyAsync` + 显式 Executor + TransmittableThreadLocal，或显式传递 context。

### 6.3 陷阱三：allOf 不携带结果

```java
// 反例：误以为 allOf 返回 List
CompletableFuture<List<Object>> allResults(CompletableFuture<?>... futures) {
    CompletableFuture<Void> allDone = CompletableFuture.allOf(futures);
    return allDone.thenApply(v -> {
        // v 是 null！allOf 不携带结果
        return Arrays.stream(futures)
            .map(f -> f.join())  // 必须手动 join 每个子 future
            .collect(toList());
    });
}
```

**根因**：allOf 的泛型是 `CompletableFuture<Void>`，因为输入 future 的类型可能不同（`CompletableFuture<User>`、`CompletableFuture<Order>` 混合），无法统一为某个 T。Java 设计选择返回 Void 而非 `CompletableFuture<List<?>>`。

### 6.4 陷阱四：anyOf 不取消其他 future

```java
// 反例：任一完成即返回，其他 future 在后台继续运行（资源泄漏）
CompletableFuture<Object> redundantFetch(
    CompletableFuture<String> primary,
    CompletableFuture<String> secondary) {
    
    return CompletableFuture.anyOf(primary, secondary)
        .thenApply(obj -> (String) obj);
    // 问题：若 primary 先完成，secondary 仍在后台运行
    // 可能浪费连接、占用线程、产生无用日志
}
```

**修复**：

```java
CompletableFuture<String> redundantFetchFixed(
    CompletableFuture<String> primary,
    CompletableFuture<String> secondary) {
    
    CompletableFuture<String> result = new CompletableFuture<>();
    
    // 任一完成时，取消另一个
    primary.whenComplete((v, ex) -> {
        if (ex != null) result.completeExceptionally(ex);
        else result.complete(v);
        secondary.cancel(true);  // 主动取消
    });
    secondary.whenComplete((v, ex) -> {
        if (ex != null && !result.isDone()) result.completeExceptionally(ex);
        else if (!result.isDone()) result.complete(v);
        primary.cancel(true);
    });
    
    return result;
}
```

### 6.5 陷阱五：exceptionally 吞掉所有异常

```java
// 反例：所有异常都降级，掩盖真实故障
CompletableFuture<String> fetch(String url) {
    return CompletableFuture
        .supplyAsync(() -> httpClient.get(url))
        .exceptionally(ex -> "default");  // 所有异常都返回 default
}

// 正例：仅对预期异常降级，其他继续抛
CompletableFuture<String> fetchFixed(String url) {
    return CompletableFuture
        .supplyAsync(() -> httpClient.get(url))
        .exceptionally(ex -> {
            Throwable cause = (ex instanceof CompletionException) ? ex.getCause() : ex;
            if (cause instanceof TimeoutException || cause instanceof ConnectException) {
                return "default";
            }
            // 未知异常不降级，继续抛
            throw new CompletionException(cause);
        });
}
```

### 6.6 陷阱六：CompletableFuture 链过长导致可读性下降

```java
// 反例：回调地狱的 CompletableFuture 版本
CompletableFuture<Result> workflow() {
    return CompletableFuture
        .supplyAsync(() -> fetchUser())
        .thenCompose(user -> CompletableFuture
            .supplyAsync(() -> fetchOrder(user))
            .thenCompose(order -> CompletableFuture
                .supplyAsync(() -> fetchPayment(order))
                .thenCompose(payment -> CompletableFuture
                    .supplyAsync(() -> fetchLogistic(payment))
                    .thenApply(logistic -> new Result(user, order, payment, logistic))
                )
            )
        );
}
```

**修复**：抽取方法，使用 thenCombine + allOf 扁平化

```java
CompletableFuture<Result> workflowFixed() {
    CompletableFuture<User> userF = CompletableFuture.supplyAsync(this::fetchUser);
    
    return userF.thenCompose(user -> {
        CompletableFuture<Order> orderF = CompletableFuture.supplyAsync(() -> fetchOrder(user));
        CompletableFuture<Payment> paymentF = orderF.thenComposeAsync(this::fetchPayment);
        CompletableFuture<Logistic> logisticF = paymentF.thenComposeAsync(this::fetchLogistic);
        
        return CompletableFuture.allOf(orderF, paymentF, logisticF)
            .thenApply(v -> new Result(user, orderF.join(), paymentF.join(), logisticF.join()));
    });
}
```

### 6.7 陷阱七：cancel 不会真正中断任务

```java
// 反例：误以为 cancel(true) 会中断执行线程
CompletableFuture<String> fetch() {
    CompletableFuture<String> cf = CompletableFuture.supplyAsync(() -> {
        try {
            Thread.sleep(10_000);  // 长时间阻塞
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return "interrupted";
        }
        return "done";
    });
    
    cf.cancel(true);  // 不会真正中断！
    // cf 现在是 CancellationException 异常完成
    // 但 supplyAsync 中的 Thread.sleep 仍在运行
    return cf;
}
```

**根因**：CompletableFuture 的 `cancel(mayInterruptIfRunning)` 仅将 future 标记为 `CancellationException` 异常完成，不会调用 `Thread.interrupt()`。这与 `FutureTask.cancel(true)` 的语义不同。

**修复**：用 `orTimeout` + 显式中断机制，或迁移到结构化并发（JEP 453）。

### 6.8 陷阱八：completeOnTimeout 与 exceptionally 组合的顺序敏感

```java
// 反例：completeOnTimeout 与 exceptionally 的顺序错误
CompletableFuture<String> fetch() {
    return CompletableFuture
        .supplyAsync(() -> httpClient.get(url))
        .exceptionally(ex -> "error fallback")     // 先 exceptionally
        .completeOnTimeout("timeout default", 500, MS);  // 再 completeOnTimeout
    // 问题：若 supplyAsync 抛异常，exceptionally 返回 "error fallback"
    //       completeOnTimeout 不会触发（因为 future 已完成）
    // 这是预期行为，但若顺序反了：
}

CompletableFuture<String> fetchWrongOrder() {
    return CompletableFuture
        .supplyAsync(() -> httpClient.get(url))
        .completeOnTimeout("timeout default", 500, MS)  // 先 completeOnTimeout
        .exceptionally(ex -> "error fallback");          // 再 exceptionally
    // 问题：超时返回 "timeout default" 后，exceptionally 不会触发
    //       真实异常被 completeOnTimeout 的默认值掩盖
}
```

**教训**：CompletableFuture 的链式调用顺序敏感，必须明确每一步的语义。

## 7. 工程实践

### 7.1 异步任务分层架构

```
┌──────────────────────────────────────────────────┐
│  API 层（Controller）                            │
│  - 接收请求，返回 CompletableFuture<Response>    │
├──────────────────────────────────────────────────┤
│  Service 层                                       │
│  - 业务编排：thenCompose / thenCombine / allOf   │
│  - 异常恢复：exceptionally / handle              │
│  - 超时控制：orTimeout / completeOnTimeout        │
├──────────────────────────────────────────────────┤
│  Client 层（HTTP / DB / Redis）                  │
│  - 异步调用：supplyAsync(阻塞调用, ioPool)        │
│  - 重试机制：exceptionallyCompose                 │
├──────────────────────────────────────────────────┤
│  Executor 层                                      │
│  - ioPool：IO 密集（200 线程）                    │
│  - cpuPool：CPU 密集（N-1 线程）                  │
│  - virtualThreadPool：JDK 21+ 虚拟线程           │
└──────────────────────────────────────────────────┘
```

### 7.2 命名约定与可读性

```java
// 命名规范
// - 返回 CompletableFuture 的方法：方法名 + Async（如 fetchUserAsync）
// - 区分同步版与异步版：fetchUser / fetchUserAsync
// - CompletableFuture 变量名：业务名 + F（如 userF, orderF）

class UserService {
    // 同步版
    User fetchUser(Long userId) { ... }
    
    // 异步版（默认 commonPool）
    CompletableFuture<User> fetchUserAsync(Long userId) { ... }
    
    // 异步版（显式 Executor）
    CompletableFuture<User> fetchUserAsync(Long userId, Executor executor) { ... }
}

// 链式调用规范：每个阶段换行，注释业务语义
CompletableFuture<UserProfile> loadProfile(Long userId) {
    return CompletableFuture
        // 阶段 1：拉取用户基础信息
        .supplyAsync(() -> userService.fetchUser(userId), ioPool)
        // 阶段 2：并行拉取订单与积分
        .thenCompose(user -> {
            CompletableFuture<List<Order>> ordersF = 
                CompletableFuture.supplyAsync(() -> orderService.findByUser(userId), ioPool);
            CompletableFuture<Integer> pointsF = 
                CompletableFuture.supplyAsync(() -> pointsService.findByUser(userId), ioPool);
            return ordersF.thenCombine(pointsF, (orders, points) -> 
                new UserProfile(user, orders, points));
        })
        // 阶段 3：异常恢复（仅超时降级）
        .exceptionally(ex -> {
            Throwable cause = unwrap(ex);
            if (cause instanceof TimeoutException) {
                return UserProfile.fallback(userId);
            }
            throw new CompletionException(cause);
        })
        // 阶段 4：监控埋点（不改变值）
        .whenComplete((profile, ex) -> {
            if (ex != null) metrics.increment("profile.load.failure");
            else metrics.increment("profile.load.success");
        });
}
```

### 7.3 监控与可观测性

```java
// 全局超时与监控包装器
class CompletableFutureMetrics {
    static <T> CompletableFuture<T> withMetrics(
        CompletableFuture<T> future, 
        String operationName,
        Duration timeout) {
        
        long start = System.nanoTime();
        
        return future
            .orTimeout(timeout.toMillis(), TimeUnit.MILLISECONDS)
            .whenComplete((result, ex) -> {
                long duration = System.nanoTime() - start;
                metrics.recordTimer(operationName + ".duration", duration, TimeUnit.NANOSECONDS);
                
                if (ex == null) {
                    metrics.increment(operationName + ".success");
                } else {
                    metrics.increment(operationName + ".failure");
                    Throwable cause = unwrap(ex);
                    if (cause instanceof TimeoutException) {
                        metrics.increment(operationName + ".timeout");
                    }
                }
            });
    }
    
    static Throwable unwrap(Throwable ex) {
        return (ex instanceof CompletionException && ex.getCause() != null) 
            ? ex.getCause() : ex;
    }
}

// 使用
CompletableFuture<User> userF = CompletableFutureMetrics.withMetrics(
    userService.fetchUserAsync(userId),
    "user.fetch",
    Duration.ofMillis(500)
);
```

### 7.4 CI/CD 集成

```yaml
# .github/workflows/async-test.yml
name: Async Integration Test
on: [push, pull_request]
jobs:
  async-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      - name: Run async unit tests
        run: mvn test -Dtest=CompletableFuture*Test
      - name: Run async integration tests
        run: mvn verify -Dtest=Async*IT -Dspring.profiles.active=test
      - name: Async benchmark (JMH)
        run: mvn package -Pbenchmarks && java -jar benchmarks/target/benchmarks.jar -wi 3 -i 5 -f 1
```

### 7.5 代码审查清单

| 检查项 | 通过条件 |
| ---- | ---- |
| Executor 选择 | IO 密集任务未使用 commonPool |
| 超时控制 | 所有外部调用有 orTimeout 或 completeOnTimeout |
| 异常处理 | exceptionally 区分异常类型，不吞掉未知异常 |
| Context 传递 | ThreadLocal 使用 TTL 或显式传递 |
| 取消传播 | anyOf 场景手动取消其他 future |
| 资源释放 | whenComplete 中关闭资源（连接、流） |
| 监控埋点 | 关键路径有 metrics + traceId |
| 测试覆盖 | 异常路径、超时路径、并发路径有单测 |

## 8. 案例研究

### 8.1 案例一：电商订单聚合 API

**场景**：用户查询订单详情页，需要并行调用 5 个微服务（用户/订单/商品/库存/物流），整体响应时间 ≤ 500ms。

```java
class OrderAggregateService {
    
    private final ExecutorService ioPool = Executors.newFixedThreadPool(100);
    
    CompletableFuture<OrderDetail> loadOrderDetail(Long orderId) {
        // 阶段 1：拉取订单基础信息（依赖关系：后续调用都依赖订单的 userId/productId）
        CompletableFuture<Order> orderF = CompletableFuture
            .supplyAsync(() -> orderService.findById(orderId), ioPool)
            .orTimeout(200, TimeUnit.MILLISECONDS);
        
        // 阶段 2：基于订单信息并行拉取用户、商品、库存、物流
        CompletableFuture<OrderDetail> detailF = orderF.thenCompose(order -> {
            CompletableFuture<User> userF = CompletableFuture
                .supplyAsync(() -> userService.findById(order.getUserId()), ioPool)
                .orTimeout(200, TimeUnit.MILLISECONDS)
                .exceptionally(ex -> User.unknown());  // 用户信息失败降级
            
            CompletableFuture<Product> productF = CompletableFuture
                .supplyAsync(() -> productService.findById(order.getProductId()), ioPool)
                .orTimeout(200, TimeUnit.MILLISECONDS)
                .exceptionally(ex -> Product.unknown());
            
            CompletableFuture<Inventory> invF = CompletableFuture
                .supplyAsync(() -> inventoryService.findByProduct(order.getProductId()), ioPool)
                .orTimeout(200, TimeUnit.MILLISECONDS)
                .exceptionally(ex -> Inventory.unknown());
            
            CompletableFuture<Logistic> logF = CompletableFuture
                .supplyAsync(() -> logisticService.findByOrder(orderId), ioPool)
                .orTimeout(200, TimeUnit.MILLISECONDS)
                .exceptionally(ex -> Logistic.unknown());
            
            // 等待全部完成（即使部分降级）
            return CompletableFuture.allOf(userF, productF, invF, logF)
                .thenApply(v -> new OrderDetail(
                    order, 
                    userF.join(), 
                    productF.join(), 
                    invF.join(), 
                    logF.join()
                ));
        });
        
        // 阶段 3：整体超时与降级
        return detailF
            .orTimeout(500, TimeUnit.MILLISECONDS)
            .exceptionally(ex -> {
                Throwable cause = CompletableFutureMetrics.unwrap(ex);
                if (cause instanceof TimeoutException) {
                    metrics.increment("order.detail.timeout");
                    return OrderDetail.fallback(orderId);
                }
                metrics.increment("order.detail.error");
                throw new CompletionException(cause);
            })
            .whenComplete((detail, ex) -> {
                if (detail != null) {
                    metrics.increment("order.detail.success");
                }
            });
    }
}
```

**关键设计**：

1. **依赖关系建模**：订单是其他数据的"根"，必须先获取；用户/商品/库存/物流互相独立，可并行；
2. **分层超时**：单调用 200ms + 整体 500ms，留出 100ms 给聚合逻辑；
3. **降级策略**：非核心数据（用户/商品/库存/物流）失败时返回 unknown，不阻断主流程；
4. **核心数据**：订单本身不降级，失败则整体失败（exceptionally 重新抛出）；
5. **监控埋点**：区分超时与异常，便于优化瓶颈。

### 8.2 案例二：Spring @Async 与 CompletableFuture 的集成

```java
@Configuration
@EnableAsync
class AsyncConfig {
    
    @Bean("ioExecutor")
    public Executor ioExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(50);
        executor.setMaxPoolSize(200);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("io-exec-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}

@Service
class UserService {
    
    @Async("ioExecutor")
    public CompletableFuture<User> findById(Long userId) {
        // 此方法在 ioExecutor 线程中执行
        return CompletableFuture.completedFuture(userDao.findById(userId));
    }
}

@Controller
class UserController {
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private OrderService orderService;
    
    // Spring MVC 3.2+ 原生支持 CompletableFuture 返回值
    @GetMapping("/users/{id}/profile")
    public CompletableFuture<UserProfile> getProfile(@PathVariable Long id) {
        CompletableFuture<User> userF = userService.findById(id);
        CompletableFuture<List<Order>> ordersF = orderService.findByUserId(id);
        
        return userF.thenCombine(ordersF, UserProfile::new)
            .orTimeout(500, TimeUnit.MILLISECONDS)
            .exceptionally(ex -> UserProfile.fallback(id));
        // Spring MVC 自动检测 CompletableFuture 返回值，异步释放 Servlet 线程
        // 在 NIO 容器（如 Undertow）下可大幅提升吞吐
    }
}
```

**关键点**：

1. **Servlet 线程释放**：Spring MVC 检测到 `CompletableFuture` 返回值后立即释放 Servlet 线程，避免 worker 线程被 get() 阻塞；
2. **@Async 注意事项**：必须配合 `@EnableAsync`；自调用（this.method）不生效（AOP 限制）；异常默认被 `AsyncUncaughtExceptionHandler` 处理；
3. **线程池隔离**：不同业务用不同 @Bean 限定的 Executor，避免相互影响；
4. **NIO 容器配合**：Tomcat NIO / Undertow / Netty 才能完整释放线程（BIO 容器无效）。

### 8.3 案例三：gRPC 异步 Stub 与 CompletableFuture

```java
class GrpcUserService {
    
    private final UserServiceGrpc.UserServiceStub asyncStub;
    
    // gRPC 异步 Stub 返回 StreamObserver，需手动转换为 CompletableFuture
    CompletableFuture<User> findById(Long userId) {
        CompletableFuture<User> future = new CompletableFuture<>();
        
        asyncStub.findById(
            UserRequest.newBuilder().setUserId(userId).build(),
            new StreamObserver<UserResponse>() {
                @Override
                public void onNext(UserResponse value) {
                    future.complete(convert(value));
                }
                
                @Override
                public void onError(Throwable t) {
                    future.completeExceptionally(t);
                }
                
                @Override
                public void onCompleted() {
                    // 已在 onNext 完成
                }
            }
        );
        
        return future.orTimeout(500, TimeUnit.MILLISECONDS);
    }
    
    // 服务端流式调用：每次 onNext 产生一个值，用 List 收集
    CompletableFuture<List<Order>> findOrdersByUserId(Long userId) {
        CompletableFuture<List<Order>> future = new CompletableFuture<>();
        List<Order> orders = Collections.synchronizedList(new ArrayList<>());
        
        asyncStub.findOrdersByUserId(
            UserRequest.newBuilder().setUserId(userId).build(),
            new StreamObserver<OrderResponse>() {
                @Override
                public void onNext(OrderResponse value) {
                    orders.add(convert(value));
                }
                
                @Override
                public void onError(Throwable t) {
                    future.completeExceptionally(t);
                }
                
                @Override
                public void onCompleted() {
                    future.complete(orders);
                }
            }
        );
        
        return future.orTimeout(1, TimeUnit.SECONDS);
    }
}
```

**关键点**：

1. **手动桥接**：gRPC 异步 Stub 使用 StreamObserver 回调，需手动包装为 CompletableFuture；
2. **流式调用**：服务端流式调用可收集为 List，客户端流式调用需用 StreamObserver 收集请求；
3. **错误传播**：gRPC 的 StatusRuntimeException 自动通过 completeExceptionally 传播；
4. **超时控制**：gRPC 自带 deadline，但 CompletableFuture 层仍需 orTimeout 兜底。

### 8.4 案例四：CompletableFuture → Structured Concurrency 迁移

**场景**：JDK 21 项目，将传统 CompletableFuture 聚合迁移到结构化并发。

**迁移前**（CompletableFuture）：

```java
UserProfile loadProfile(Long userId) throws Exception {
    CompletableFuture<User> userF = userService.findByIdAsync(userId);
    CompletableFuture<Order> orderF = orderService.findByUserAsync(userId);
    CompletableFuture<Integer> pointsF = pointsService.findByUserAsync(userId);
    
    CompletableFuture.allOf(userF, orderF, pointsF).join();
    
    return new UserProfile(userF.join(), orderF.join(), pointsF.join());
}
```

**问题**：

1. 若 userF 失败，orderF 与 pointsF 仍在后台运行（资源泄漏）；
2. 主线程中断时，子任务不受影响；
3. 异常堆栈跨线程，调试困难。

**迁移后**（StructuredTaskScope，JDK 21 Preview）：

```java
UserProfile loadProfile(Long userId) throws Exception {
    try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
        StructuredTaskScope.Subtask<User> userTask = 
            scope.fork(() -> userService.findById(userId));
        StructuredTaskScope.Subtask<Order> orderTask = 
            scope.fork(() -> orderService.findByUser(userId));
        StructuredTaskScope.Subtask<Integer> pointsTask = 
            scope.fork(() -> pointsService.findByUser(userId));
        
        scope.join();              // 等待全部完成
        scope.throwIfFailed();     // 若任一失败，抛异常并取消其他
        
        return new UserProfile(
            userTask.get(), 
            orderTask.get(), 
            pointsTask.get()
        );
    }
    // try-with-resources 退出时，scope 自动关闭，所有未完成子任务被取消
}
```

**迁移收益**：

| 维度 | CompletableFuture | StructuredTaskScope |
| ---- | ---- | ---- |
| 失败传播 | 需手动 exceptionally | ShutdownOnFailure 自动 |
| 取消传播 | 需手动 cancel | try-with-resources 自动 |
| 子任务泄漏 | 可能 | 不可能（作用域约束） |
| 堆栈可读性 | 跨线程断裂 | 连续 |
| 代码可读性 | 链式回调 | 顺序结构化 |
| JDK 版本要求 | JDK 8+ | JDK 21+（Preview）/ JDK 24+ GA |

**迁移策略**：

- JDK 21 LTS：新代码试点 `StructuredTaskScope.preview()`，老代码保持 CompletableFuture；
- JDK 25+ GA：新代码优先 StructuredTaskScope；
- 长期：CompletableFuture 退居"组合原语"角色，不再承担"任务调度"职责。

## 9. 未来演进

### 9.1 Project Loom 路线图

| 版本 | 关键特性 | 状态 |
| ---- | ---- | ---- |
| JDK 19 | Virtual Threads (Preview) | JEP 425 |
| JDK 20 | Virtual Threads (Preview 2) | JEP 437 |
| JDK 21 (LTS) | Virtual Threads GA | JEP 444 |
| JDK 21 | Structured Concurrency (Preview) | JEP 453 |
| JDK 22 | Structured Concurrency (Preview 2) | JEP 462 |
| JDK 23 | Structured Concurrency (Preview 3) | JEP 480 |
| JDK 24 | Structured Concurrency (Fourth Preview) | JEP 499 |
| JDK 25 (LTS) | 预期 GA | 待定 |

### 9.2 CompletableFuture 在 Loom 时代的角色

**变化一：执行载体变化**

- **Pre-Loom**：CompletableFuture 默认使用 ForkJoinPool.commonPool()（平台线程），阻塞 IO 受限；
- **Post-Loom**：可显式指定 `Executors.newVirtualThreadPerTaskExecutor()`，每个任务跑在虚拟线程，阻塞 IO 不浪费 OS 线程。

**变化二：组合语义保留**

CompletableFuture 的核心价值是**组合原语**（thenApply / thenCompose / exceptionally / allOf / anyOf），这与执行载体无关。即使虚拟线程让"避免阻塞"动机减弱，组合原语仍是必要的。

**变化三：与 StructuredTaskScope 互补**

- CompletableFuture：擅长**结果编排**（多任务合并、转换、恢复）；
- StructuredTaskScope：擅长**生命周期管理**（取消传播、作用域边界）；
- 未来趋势：`StructuredTaskScope` 启动子任务，子任务内部用 CompletableFuture 做细粒度编排。

### 9.3 Scoped Values 对 ThreadLocal 的影响

JEP 446（Scoped Values）对 CompletableFuture 的影响：

- **Pre-Scoped Values**：CompletableFuture 跨线程传递 Context 需用 TransmittableThreadLocal，复杂且有泄漏风险；
- **Post-Scoped Values**：Scoped Values 在虚拟线程下自动传播，配合 StructuredTaskScope 使用，无需 TTL。

```java
// 未来模式（JDK 21+ Preview）
private static final ScopedValue<String> TRACE_ID = ScopedValue.newInstance();

void fetchWithScopedValues(Long userId) {
    ScopedValue.where(TRACE_ID, "trace-123").run(() -> {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            var userTask = scope.fork(() -> {
                String trace = TRACE_ID.get();  // 自动传递
                return userService.findById(userId);
            });
            scope.join();
            // ...
        }
    });
}
```

### 9.4 反应式编程的演化

Reactor / RxJava 在 Loom 时代面临重新定位：

- **Pre-Loom**：Reactive 是高并发 IO 的主流方案，因为平台线程昂贵；
- **Post-Loom**：虚拟线程让同步代码也能达到高吞吐，Reactive 的"避免阻塞"动机减弱；
- **演化趋势**：Reactive 退居"流式处理"场景（背压、事件流、时间窗口），编排场景被虚拟线程 + CompletableFuture 取代。

Spring 6+ 已支持"虚拟线程 + 同步代码"模式，未来 Spring WebFlux 与 Spring MVC 的边界将模糊。

## 10. 习题参考答案

### ex-cf-01

**答案**：`CompletionStage`

**解析**：CompletableFuture 同时实现 `Future<T>` 与 `CompletionStage<T>` 两个接口。Future 提供阻塞式语义（get / isDone / cancel），CompletionStage 提供回调式组合原语（thenApply / thenCompose / exceptionally）。这种"双接口融合"是 Java API 设计的常见模式，分离了"被动等待"与"主动组合"两种语义。

### ex-cf-02

**答案**：`flatMap`

**解析**：thenApply 接收 `Function<T, R>`，若 R 本身是 CompletableFuture 会得到 `CompletableFuture<CompletableFuture<R>>`（嵌套）。thenCompose 接收 `Function<T, CompletionStage<R>>`，自动扁平化为 `CompletableFuture<R>`，等价于 Monad 的 bind（>>=）操作，对应 Stream.flatMap、Optional.flatMap、Optional.map 的关系。

### ex-cf-03

**答案**：选项 2 - `CompletableFuture.allOf(...).thenApply(v -> List.of(future1.join(), future2.join(), future3.join()))`

**解析**：
- 选项 1：thenCombine 仅支持两个任务，三个任务需链式两次；
- 选项 2：正确，allOf 等待全部完成后调用 join() 不会阻塞（已确保完成），可安全收集结果；
- 选项 3：anyOf 是任一完成，不是全部；
- 选项 4：thenApplyBoth 方法不存在，正确名称是 thenCombine。

### ex-cf-04

**答案**：选项 2 - "thenApply 在前一个阶段已完成时于调用线程同步执行，否则由完成该阶段的线程异步执行；thenApplyAsync 始终提交到 Executor 执行"

**解析**：
- 选项 1 错误：thenApply 不一定在调用线程执行；
- 选项 2 正确：完整描述了执行线程的不确定性；
- 选项 3 错误：Async 变体是语义差异，不是纯优化；
- 选项 4 错误：Async 变体不会自动继承 ThreadLocal，反而可能丢失。

### ex-cf-05

**修复要点**：
1. allOf().join() 后，所有子 future 必已完成，调用 join() 不会阻塞；
2. 改用 join() 替代 get()，避免受检异常；
3. 集中捕获 CompletionException 并解包 cause；
4. 封装业务异常便于上层处理。

### ex-cf-06

**修复要点**：
1. orTimeout 仅将 future 标记为异常完成（TimeoutException），不提供默认值；
2. 用 exceptionally 链式捕获 TimeoutException 并返回降级值；
3. 非超时异常不应被降级吞掉，应继续抛出；
4. 或直接用 completeOnTimeout 简化（功能等价）。

### ex-cf-07

**参考答案要点**：

```java
class ApiGateway {
    private final ExecutorService ioPool = Executors.newFixedThreadPool(100);
    
    CompletableFuture<AggregatedResponse> aggregate(Long userId) {
        // 5 个下游调用，各自 200ms 超时 + 降级
        CompletableFuture<User> userF = withTimeoutAndFallback(
            userService.findById(userId), 200, User.fallback(userId));
        CompletableFuture<List<Order>> ordersF = withTimeoutAndFallback(
            orderService.findByUser(userId), 200, List.of());
        CompletableFuture<Inventory> invF = withTimeoutAndFallback(
            inventoryService.findByUser(userId), 200, Inventory.empty());
        CompletableFuture<Payment> payF = withTimeoutAndFallback(
            paymentService.findByUser(userId), 200, Payment.unknown());
        CompletableFuture<Logistic> logF = withTimeoutAndFallback(
            logisticService.findByUser(userId), 200, Logistic.unknown());
        
        // 整体超时 800ms + 兜底
        return CompletableFuture.allOf(userF, ordersF, invF, payF, logF)
            .thenApply(v -> new AggregatedResponse(
                userF.join(), ordersF.join(), invF.join(), payF.join(), logF.join()))
            .orTimeout(800, TimeUnit.MILLISECONDS)
            .exceptionally(ex -> AggregatedResponse.fallback(userId));
    }
    
    private <T> CompletableFuture<T> withTimeoutAndFallback(
        CompletableFuture<T> future, long timeoutMs, T fallback) {
        return future.orTimeout(timeoutMs, TimeUnit.MILLISECONDS)
            .exceptionally(ex -> {
                Throwable cause = CompletableFutureMetrics.unwrap(ex);
                if (cause instanceof TimeoutException || cause instanceof ConnectException) {
                    log.warn("Fallback for {}", future.getClass(), cause);
                    return fallback;
                }
                throw new CompletionException(cause);
            });
    }
}
```

**虚拟线程迁移权衡**：
- JDK 21 LTS：保留 CompletableFuture（生态成熟、Preview 风险低）；
- JDK 25+ GA：可试点 `StructuredTaskScope.ShutdownOnFailure` 获得原生取消传播；
- CompletableFuture 的组合原语（allOf / thenCombine）在两种模式下都有效，迁移成本低。

### ex-cf-08

**参考答案要点**：

1. **CompletableFuture 的角色变化**：
   - 不被淘汰：仍是"结果编排"的抽象层，与"执行调度"正交；
   - 执行层迁移：默认 Executor 从 commonPool 转向 `Executors.newVirtualThreadPerTaskExecutor()`；
   - "避免阻塞"动机减弱：虚拟线程让同步阻塞代码也能达到高吞吐；
   - 组合原语仍必要：allOf / thenCombine / exceptionally 等语义不变。

2. **与结构化并发的关系**：
   - 互补：CompletableFuture 擅长编排，StructuredTaskScope 擅长生命周期管理；
   - 叠加：`StructuredTaskScope.fork(() -> cf.join())` 可在结构化作用域内使用 CompletableFuture；
   - 未来趋势：StructuredTaskScope 启动子任务，子任务内部用 CompletableFuture 做细粒度组合。

3. **迁移策略**：
   - JDK 21 LTS：CompletableFuture 为主，新场景试点 `StructuredTaskScope.preview()`（加 `--enable-preview`）；
   - JDK 24+：Structured Concurrency 第三轮 Preview，新增 API 稳定；
   - JDK 25+ GA：新代码优先 StructuredTaskScope，老代码保持 CompletableFuture；
   - 长期：CompletableFuture 退居"组合原语"角色，不再承担"任务调度"职责。

## 11. 参考文献

本模块参考文献按 ACM Reference Format 列出，覆盖 Java 并发原典、Reactive 编程理论、Promise 起源论文与 OpenJDK 官方规范：

1. Goetz, B., Peierls, T., Bloch, J., Bowbeer, J., Holmes, D., and Lea, D. 2006. _Java Concurrency in Practice_. Addison-Wesley Professional. ISBN 978-0321349601.
2. Bloch, J. 2018. _Effective Java (3rd ed.)_. Addison-Wesley Professional. ISBN 978-0134685991.
3. Lea, D. 2014. _The java.util.concurrent Synchronization Framework: CompletableFuture and CompletionStage_. State University of New York at Oswego, Technical Report. http://gee.cs.oswego.edu/dl/jsr166/dist/docs/java/util/concurrent/CompletableFuture.html
4. Manson, J., Pugh, B., and Adve, S. V. 2005. _JSR 133: Java Memory Model and Thread Specification_. Java Community Process. https://jcp.org/en/jsr/detail?id=133
5. OpenJDK Team. 2024. _JEP 444: Virtual Threads_. OpenJDK Official Project. https://openjdk.org/jeps/444
6. OpenJDK Team. 2024. _JEP 453: Structured Concurrency (Preview)_. OpenJDK Official Project. https://openjdk.org/jeps/453
7. Oracle Corporation. 2024. _Java SE 21 API Specification: CompletableFuture_. Oracle Official Documentation. https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html
8. Oracle Corporation. 2024. _Java SE 21 API Specification: CompletionStage_. Oracle Official Documentation. https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletionStage.html
9. Wampler, D. 2021. _Reactive Design Patterns_. Manning Publications. ISBN 978-1617291808.
10. Liskov, B. and Shrira, L. 1988. _Promises: Linguistic Support for Efficient Asynchronous Procedure Calls in Distributed Systems_. In _Proceedings of the ACM SIGPLAN 1988 Conference on Programming Language Design and Implementation (PLDI)_, 260–267. DOI: 10.1145/53990.54016.
11. Friedman, D. P. and Wise, D. S. 1976. _The Impact of Applicative Programming on Concurrent Computation_. In _Proceedings of the 1976 Conference on Parallel Processing_, 230–235.
12. Sutter, H. 2005. _The Free Lunch Is Over: A Fundamental Turn Toward Concurrency in Software_. _Dr. Dobb's Journal_ 30, 1, 202–210.
13. Project Reactor Team. 2024. _Project Reactor Reference: Mono and Flux_. VMware Official Documentation. https://projectreactor.io/docs/core/release/reference/
14. ReactiveX Team. 2024. _ReactiveX Documentation: Observable and Flowable_. ReactiveX Official Documentation. http://reactivex.io/documentation/observable.html
15. ISO/IEC. 2023. _ISO/IEC 14882:2023 Information technology — Programming languages — C++_. International Organization for Standardization.

## 12. 延伸阅读

### 12.1 官方文档与规范

- **OpenJDK JEP 索引**：https://openjdk.org/jeps/0 —— 所有 JDK Enhancement Proposal；
- **JSR-166 维护页面**：http://gee.cs.oswego.edu/dl/jsr166/dist/ —— Doug Lea 维护的并发工具规范；
- **Java Concurrency Tutorial**（Oracle）：https://docs.oracle.com/javase/tutorial/essential/concurrency/ —— 官方并发教程；
- **Java 21 Release Notes**：https://jdk.java.net/21/release-notes —— 虚拟线程 GA 详情。

### 12.2 进阶书籍

- **《Java Concurrency in Practice》**（Brian Goetz 等）：Java 并发的"圣经"，2006 年出版但仍是必读；
- **《Reactive Design Patterns》**（Dean Wampler）：Reactive 编程模式系统化讲解；
- **《Modern Java in Action》**（Mario Fusco 等）：Java 8+ 新特性实战，含 CompletableFuture 章节；
- **《Programming Concurrency on the JVM》**（Venkat Subramaniam）：JVM 并发模型对比。

### 12.3 经典论文

- **Liskov & Shrira (1988)**："Promises: Linguistic Support for Efficient Asynchronous Procedure Calls in Distributed Systems" —— Promise 概念起源；
- **Friedman & Wise (1976)**："The Impact of Applicative Programming on Concurrent Computation" —— 函数式并发基础；
- **Sutter (2005)**："The Free Lunch Is Over" —— 多核时代并发编程宣言；
- **Pressler (2018)**："JEP 354: Fibers" —— Project Loom 设计文档（早期）。

### 12.4 开源项目与生态

- **Project Loom**：https://openjdk.org/projects/loom/ —— 虚拟线程与结构化并发孵化地；
- **Project Reactor**：https://projectreactor.io/ —— Spring 生态 Reactive 框架；
- **RxJava**：https://github.com/ReactiveX/RxJava —— Reactive Streams 实现；
- **Mutiny**：https://smallrye.io/smallrye-mutiny/ —— Quarkus 生态的 Reactive 库，API 风格独特；
- **Kotlin Coroutines**：https://kotlinlang.org/docs/coroutines-overview.html —— async/await 模型对照。

### 12.5 在线课程

- **MIT 6.5840 Distributed Systems**：https://pdos.csail.mit.edu/6.824/ —— 分布式系统（含 RPC 异步语义）；
- **Stanford CS149 Parallel Computing**：https://cs149.stanford.edu/ —— 并行计算基础；
- **CMU 15-440 Distributed Systems**：http://www.cs.cmu.edu/~dga/15-440/F12/ —— 分布式系统理论与工程；
- **Doug Lea's Course**：http://gee.cs.oswego.edu/dl/cpjsr166/ —— JSR-166 作者亲授并发课程。

### 12.6 社区博客与深入分析

- **Doug Lea 个人主页**：http://gee.cs.oswego.edu/ —— java.util.concurrent 作者；
- **Project Loom 邮件列表**：https://mail.openjdk.org/pipermail/loom-dev/ —— Loom 设计讨论；
- **Tagir Valeev 的 JVM 深度分析**：https://habr.com/en/users/tagirv/ —— CompletableFuture 内部实现剖析；
- **Nurkiewicz 的 CompletableFuture 系列**：https://www.nurkiewicz.com/ —— 实战经验总结。

### 12.7 工具与调试

- **Java Mission Control (JMC)**：https://www.oracle.com/java/technologies/jdk-mission-control.html —— JVM 异步任务监控；
- **Async-Profiler**：https://github.com/jvm-profiling-tools/async-profiler —— 异步栈采样；
- **Java Flight Recorder (JFR)**：https://openjdk.org/jeps/328 —— 内置事件记录；
- **IntelliJ IDEA CompletableFuture Debugger**：https://www.jetbrains.com/help/idea/debug-asynchronous-code.html —— 异步代码调试器。

### 12.8 相关 FANDEX 模块

- **java/并发编程详解**：Thread / Runnable / Lock / Condition 基础；
- **java/ThreadLocal内存泄漏**：CompletableFuture 跨线程 Context 传递的根源；
- **java/集合框架详解**：ConcurrentHashMap / BlockingQueue 与 CompletableFuture 的互操作；
- **java/反射与动态代理**：CompletableFuture 内部 Completion 节点的动态分发机制；
- **java/Lambda与函数式编程**：thenApply / thenCompose 的函数式接口基础。

---

## 结语

`CompletableFuture` 是 Java 异步编程的里程碑：它将"未来值"从被动等待的对象，升级为可组合、可恢复、可监控的 DAG 节点，并以范畴论（Monad/Functor/Applicative）为理论基础，提供了 50+ 个组合原语。

然而，CompletableFuture 并非终点。Project Loom 的虚拟线程（JEP 444）与结构化并发（JEP 453）正在重新定义 Java 异步编程范式：执行层从"避免阻塞"转向"轻量阻塞"，组合层从"回调链"转向"作用域任务"。但 CompletableFuture 的**组合原语**价值不变——它将继续作为"结果编排"层与"任务调度"层正交存在。

掌握 CompletableFuture，需理解三层知识：

1. **API 层**：50+ 个组合方法的语义与适用场景；
2. **内部层**：Completion 链表 / Signaller / ForkJoinPool 调度；
3. **演化层**：与 Reactor / Virtual Threads / Structured Concurrency 的关系。

建议学习路径：

1. 先掌握 4.1-4.5 的基础 API（创建、串行、并行、异常、超时）；
2. 再理解 2.2-2.3 的范畴论与内部数据结构；
3. 然后实践 7.1-7.5 的工程模式（分层、命名、监控、CI/CD、Code Review）；
4. 最后研究 8.1-8.4 的真实案例与 9.1-9.4 的未来演进；
5. 持续关注 Project Loom 邮件列表与 JEP 进展，跟踪 JDK 25 / 26 的 Structured Concurrency GA 进度。

FANDEX Content Engineering Team 持续维护本模块，每季度根据 JDK 新版本与社区最佳实践进行审阅更新。如发现内容疏漏或过时，请通过 GitHub Issues 反馈。
