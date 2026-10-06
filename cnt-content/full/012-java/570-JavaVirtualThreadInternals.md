---
order: 510
title: 虚拟线程内幕：载体线程、Continuation 与卸载机制
module: 'java'
category: 后端技术
difficulty: advanced
description: 虚拟线程的 JVM 层实现参考：ForkJoinPool 载体调度、Continuation 挂载/卸载、完整卸载触发点清单、内存与吞吐估算、结构化并发完成策略全表与 JEP 演进时间线。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'java/550-JavaVirtualThread'
  - 'java/530-ThreadLocalMemoryLeak'
  - 'java/650-JavaIONIO'
prerequisites:
  - 'java/550-JavaVirtualThread'
---

> 定位说明：本篇为参考层文档，从 [Java 与虚拟线程](/java/550-JavaVirtualThread) 拆分而来，收录其调度机制、Continuation 原理、JEP 演进与对比分析等深水区内容。只关心"怎么用"的读者不需要读这篇。

## 前置知识

- [Java 与虚拟线程](/java/550-JavaVirtualThread)：会创建虚拟线程、知道 Pinning 与 Semaphore 限流，本文在其上展开"为什么"。

## 学习目标

- 说出 M:N 调度模型中载体线程的角色，以及默认调度器的配置方式；
- 解释 Continuation 的挂载（mount）/卸载（unmount）过程，列出会触发卸载的 API；
- 用内存与吞吐两个估算模型量化虚拟线程的收益边界；
- 掌握 Pinning 的三类成因、检测手段与版本分界；
- 查阅结构化并发各完成策略（Joiner）与旧 API（ShutdownOnFailure）的迁移对照。

## 1. M:N 调度与载体线程

平台线程是 1:1 模型（一个 Java 线程对应一个 OS 线程）；虚拟线程是 M:N 模型：M 个虚拟线程被调度到 N 个载体线程（carrier thread）上分时执行，M 远大于 N。

- 载体线程就是普通平台线程，由一个 `ForkJoinPool`（work-stealing 模式）提供，默认并行度等于 `Runtime.getRuntime().availableProcessors()`；
- 应用代码 **不能替换** 这个调度器，只能通过系统属性调并行度：

```bash
# 正式属性名（JDK 21+）
java -Djdk.virtualThreadScheduler.parallelism=16 -jar app.jar
# 旧文档里常见的 jdk.virtualThreadParallelism 是早期属性名，以正式名为准
```

- 虚拟线程无法设置优先级（固定 `NORM_PRIORITY`），`Thread.setPriority` 对它无效——调度公平性由 ForkJoinPool 的 work-stealing 保证。

## 2. Continuation：栈帧在堆上搬家

Continuation（延续）是"计算剩余部分"的封装。虚拟线程阻塞与恢复的完整流程：

**卸载（unmount）**——虚拟线程遇到阻塞点时：

1. JVM 检测到阻塞调用（如 `socket.read()`）即将真正阻塞 OS 资源；
2. 调用 `Continuation.yield()`：遍历当前栈帧，把局部变量、操作数栈、返回地址保存到堆上的 Continuation 对象；
3. yield 通过抛出内部 `YieldException` 完成栈展开，载体线程捕获后回到调度循环，取下一个虚拟线程。

**挂载（mount）**——阻塞结束（I/O 就绪、sleep 到点、锁可用）时：

1. 调度器从就绪队列取出该虚拟线程，选一个空闲载体线程；
2. `Continuation.run()` 把堆上的栈帧恢复到载体线程栈；
3. 从 `yield` 的下一指令继续执行，业务代码毫无感知。

由此推出两条内存结论：

- 虚拟线程栈初始约 1KB，按需增长（数百 KB 已属罕见），存在堆上而非 OS 栈；
- 载体线程栈始终只有 N 份。估算：百万平台线程约需 10^6 × 1MB = 1TB 栈空间（物理不可能）；百万虚拟线程约 10^6 × 1KB + N × 1MB ≈ 1GB 量级。

吞吐估算（I/O 密集）：设单任务 CPU 时间 `Tcpu`、等待时间 `Tio`、载体线程 N 个。虚拟线程的吞吐上限约为 `N / Tcpu`（载体线程几乎总在干 CPU 活），与等待时间无关；平台线程池吞吐约为 `线程数 / (Tcpu + Tio)`。例：N=8、Tcpu=1ms、Tio=100ms，虚拟线程理论吞吐约 8000 QPS 量级，而 200 线程池约 2000 QPS 且内存开销大得多——差距来自"等待时是否占着线程"。

## 3. 完整卸载触发点清单

JDK 21 起以下阻塞 API 均已适配自动卸载，业务代码零修改：

| 类别 | API |
| ---- | ---- |
| 网络 I/O | `Socket` 读写、`ServerSocket.accept`、`SocketChannel`（阻塞模式）读写 |
| HTTP | `HttpClient.send`（同步方法） |
| 睡眠与等待 | `Thread.sleep`、`Object.wait`、`Condition.await`、`LockSupport.park` |
| 并发工具 | `BlockingQueue.put/take`、`Semaphore.acquire`、`CountDownLatch.await`、`Future.get`、`CompletableFuture.join` |
| 锁 | `ReentrantLock.lock`（等锁时）、`Condition.await` |

两类例外（**不会**卸载）：

1. **文件 I/O**：`Files.readAllBytes` 等阻塞文件操作不做 Continuation 适配（磁盘 I/O 相对快且难以非阻塞化）。JVM 的补救是"补偿"机制：通过 ForkJoinPool 的 `ManagedBlocker` 临时提高并行度，避免载体线程饿死。大文件高并发读写仍建议单独的平台线程池或 `AsynchronousFileChannel`；
2. **Pinning 场景**（见下一节）。

## 4. Pinning 全解：成因、版本分界与检测

| 成因 | 受影响版本 | 内部原因 |
| ---- | ---------- | -------- |
| `synchronized` 块内阻塞、`Object.wait()` | JDK 21-23 | ObjectMonitor 的 enter/wait 依赖 OS 互斥量，monitor 持有者记录在载体线程上，无法随虚拟线程卸载。JDK 24（JEP 491）重写后不再发生 |
| native 方法内阻塞 | 所有版本 | native 栈帧在 C 栈上，JVM 无法拷贝 |
| JNI 调用内阻塞 | 所有版本 | 同上 |

检测工具箱：

```bash
# 1. 系统属性打印 Pinning 堆栈（仅 JDK 21-23 有效；JDK 24 起随 JEP 491 移除）
java -Djdk.tracePinnedThreads=full -jar app.jar

# 2. JFR 事件（所有版本，生产推荐）
java -XX:StartFlightRecording=filename=vt.jfr,settings=profile -jar app.jar
jfr print --events jdk.VirtualThreadPinned vt.jfr
# 相关事件还有 jdk.VirtualThreadStart / jdk.VirtualThreadEnd / jdk.VirtualThreadSubmitFailed

# 3. JSON 线程转储（含虚拟线程，字段里有 pinned 标记）
jcmd <pid> Thread.dump_to_file -format=json dump.json
cat dump.json | jq '.threadDump[] | select(.pinned == true)'
```

工程纪律：跨版本团队统一"`synchronized` 内不做阻塞 I/O，需要则换 `ReentrantLock`"；保护纯内存短临界区的 `synchronized` 不必替换。调试时注意 IntelliJ IDEA 2024.1+ 已支持在调试器中查看虚拟线程。

## 5. 结构化并发：完成策略全表与旧 API 迁移

`StructuredTaskScope` 自 JDK 21 预览（JEP 453）起迭代：453 -> 462 -> 480 -> 499 -> 505 -> 525（截至 JDK 26 仍为预览）。**JDK 25（JEP 505）重设计了 API**：构造函数方式（`new StructuredTaskScope.ShutdownOnFailure()` 等）被静态工厂 `StructuredTaskScope.open(...)` + `Joiner` 取代，旧 API 已移除。

| 需求 | JDK 25/26 写法 | JDK 21-24 旧写法 |
| ---- | -------------- | ---------------- |
| 全部成功，任一失败取消其余 | `StructuredTaskScope.open()` | `new StructuredTaskScope.ShutdownOnFailure()` + `throwIfFailed()` |
| 竞速：任一成功取消其余，全败抛异常 | `open(Joiner.anySuccessfulOrThrow())` | `new StructuredTaskScope.ShutdownOnSuccess<T>()` + `result()` |
| 全部成功并收集结果 | `open(Joiner.allSuccessfulOrThrow())`，`join()` 后流式读取 subtask | 手工收集 |
| 只等全部结束，不关心成败 | `open(Joiner.awaitAll())` | `new StructuredTaskScope<Void>()` |

```java
// JDK 25/26 预览 API（需 --enable-preview）
try (var scope = StructuredTaskScope.open(Joiner.<String>anySuccessfulOrThrow())) {
    scope.fork(() -> queryPrimary(key));
    scope.fork(() -> queryReplica(key));
    return scope.join();     // 首个成功结果；全部失败抛 FailedException
}
```

要点：`fork` 的子任务自动继承当前 `ScopedValue` 绑定；`scope.join()` 之后才能 `subtask.get()`；父作用域取消会级联取消全部子任务（结构化的本义）。完成策略选错是常见事故源——"必须全部成功的业务"误用竞速策略，会导致部分任务被取消而静默丢失。

## 6. ScopedValue 与 ThreadLocal 的机制差异

| 维度 | ThreadLocal | ScopedValue（JDK 25 正式，JEP 506） |
| ---- | ----------- | ----------------------------------- |
| 可变性 | `set`/`get`/`remove`，可随意改 | 绑定后不可变（`where` 重新绑定生成新作用域） |
| 生命周期 | 线程存活期内一直有效，忘记 remove 即泄漏 | 限定在 `run`/`call` 作用域，退出自动失效 |
| 子任务继承 | `InheritableThreadLocal` 有复制时机陷阱 | 结构化并发 fork 的子任务自动继承，无复制竞态 |
| 内存模型 | 每线程一份 map，百万虚拟线程 × 大对象 = OOM | 绑定共享同一不可变对象，无逐线程复制 |
| 适用 | 线程池 + 可变上下文（如 MDC 仍依赖它） | 虚拟线程 + 一次性只读上下文 |

```java
static final ScopedValue<String> USER = ScopedValue.newInstance();

ScopedValue.where(USER, "u-1001")
           .where(LOCALE, "zh-CN")
           .call(() -> handleRequest());   // call 有返回值，run 无返回值
```

迁移注意：现有日志 MDC、事务同步器等基建仍深度绑定 ThreadLocal，虚拟线程下它们要么等框架适配，要么用"任务结束 finally remove"过渡。完整泄漏机理见 [ThreadLocal 内存泄漏](/java/530-ThreadLocalMemoryLeak)。

## 7. JEP 演进时间线

| 时间 | JDK | 事件 |
| ---- | --- | ---- |
| 2018 | - | Project Loom 立项（Ron Pressler），目标"轻量级线程 + 同步风格" |
| 2022-09 | 19 | JEP 425：虚拟线程首次预览 |
| 2023-03 | 20 | JEP 436：第二次预览 |
| 2023-09 | 21 (LTS) | JEP 444：**虚拟线程正式**；JEP 453：结构化并发首次预览 |
| 2023-11 | - | Spring Boot 3.2 提供 `spring.threads.virtual.enabled` 一键开关 |
| 2024-03 | 22 | JEP 462：结构化并发第二次预览 |
| 2024-09 | 23 | JEP 480 / 481：结构化并发、作用域值第三次预览 |
| 2025-03 | 24 | JEP 491：**synchronized 不再 Pinning（正式）**；JEP 499：结构化并发第四次预览 |
| 2025-09 | 25 (LTS) | JEP 506：**作用域值正式**；JEP 505：结构化并发第五次预览（open + Joiner 重设计） |
| 2026-03 | 26 | JEP 525：结构化并发第六次预览，仍未转正 |

设计取舍备忘：Java 最终没有选 `async/await` 关键字方案（会带来"函数染色"，污染整个生态签名），也没有选 Kotlin 式 `suspend` 编译期 CPS 变换（与字节码工具链冲突），而是选择 JVM 层透明实现——25 年的同步库（JDBC、Jackson、OkHttp）因此零成本受益。代价是 JVM 实现复杂与 Pinning 这类"透明不完美"。

## 8. 横向对比：Kotlin 协程与 Go goroutine

| 维度 | Java 虚拟线程 | Kotlin 协程 | Go goroutine |
| ---- | -------------- | ----------- | -------------- |
| 实现层级 | JVM 内建 | 库 + 编译器（suspend CPS） | 语言运行时 |
| 函数染色 | 无 | 有（suspend 只能被 suspend 调用） | 无 |
| 初始栈 | 约 1KB（堆） | 状态机对象（无独立栈） | 约 2KB（连续栈） |
| 调度器 | ForkJoinPool（不可换） | CoroutineDispatcher（可换） | GMP 运行时 |
| 通道 | `BlockingQueue` | `Channel` / `Flow` | `chan` + `select` |
| 结构化并发 | StructuredTaskScope（预览） | coroutineScope（成熟） | 无内建（靠 errgroup） |
| 与 Java 互操作 | 天然 | suspend 需适配层 | 跨语言不适用 |

选型含义：Java 服务端团队几乎不必为了并发而引入 Kotlin 协程；但 Android/KMP 项目协程仍是既定标准，两套心智模型短期并存。

## 本篇小结

- 载体线程由不可替换的 ForkJoinPool 提供，默认并行度 = CPU 核数，`jdk.virtualThreadScheduler.parallelism` 可调；
- 阻塞即卸载：栈帧从载体线程栈搬到堆上的 Continuation，恢复时再搬回；
- 网络 I/O、sleep、锁等待、并发工具全部自动卸载；文件 I/O 靠补偿机制，不卸载；
- Pinning 三成因两类：monitor 类已被 JDK 24 JEP 491 消除，native/JNI 永远存在；检测靠 JFR `jdk.VirtualThreadPinned`；
- 结构化并发 JDK 25 起为 `open()` + `Joiner` 体系，旧 ShutdownOnFailure API 已移除；
- ScopedValue 与 ThreadLocal 的本质差异是"不可变作用域绑定"对"可变线程级 map"。

## 动手实践

1. **观察载体线程复用**：开 1000 个虚拟线程各 sleep 500ms，每个打印 `Thread.currentThread()`，统计出现过的 worker 编号数量。预期远小于 1000，约等于 CPU 核数附近。
2. **测量虚拟线程栈起点**：开 10 万个阻塞中的虚拟线程（`LockSupport.park` 挂起），用 `-Xmx` 递减法估算总内存占用，与第 2 节的 1KB 估算对照。
3. **迁移练习**：找一段 JDK 21 风格的 `new StructuredTaskScope.ShutdownOnFailure()` 代码（或照旧 API 语义自己写），按第 5 节对照表迁移到 `open()` + `Joiner`，在 `--enable-preview` 下跑通。

## 下一步

- [Java 与虚拟线程](/java/550-JavaVirtualThread)：用法主线与 Spring Boot 集成；
- [JVM 内存模型](/java/610-JVMRuntimeDataAreasAndObjectLayout)：理解 final 字段可见性与 Continuation 搬家的一致性保证；
- [Java IO 与 NIO](/java/650-JavaIONIO)：阻塞/非阻塞 I/O 在虚拟线程时代的分工。
