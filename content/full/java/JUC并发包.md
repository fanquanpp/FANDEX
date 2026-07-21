---
order: 53
title: JUC并发包
module: java
category: Java
difficulty: advanced
description: java.util.concurrent并发工具
author: fanquanpp
updated: '2026-06-14'
related:
  - java/泛型进阶
  - java/并发编程基础
  - java/JVM类加载机制
  - java/JVM垃圾回收
prerequisites:
  - java/概述与开发环境
---

# JUC 并发包深度解析

## 一、学习目标

本节遵循 Bloom 分类法,从低阶到高阶依次构建读者对 `java.util.concurrent`（JUC）并发包的认知体系。完成本节学习后,读者应当具备下列能力。

### 1.1 记忆层级（Remembering）

- 列举 JUC 中至少 7 类核心组件的名称与典型代表类(如线程池 `ThreadPoolExecutor`、并发集合 `ConcurrentHashMap`、同步工具 `CountDownLatch`、原子类 `AtomicInteger`、锁 `ReentrantLock`、 Fork/Join 框架 `ForkJoinPool`、CompletableFuture 等)。
- 复述 `AQS`（AbstractQueuedSynchronizer）的核心数据结构:CLH 队列变体、state 整数、独占/共享两种模式。
- 准确描述 `Executor`、`ExecutorService`、`ScheduledExecutorService`、`ThreadPoolExecutor` 四层接口之间的继承关系。

### 1.2 理解层级（Understanding）

- 解释 `synchronized` 关键字与 `ReentrantLock` 在锁实现机制、可中断性、公平性、条件变量数量上的差异。
- 用自己的语言说明 CAS（Compare-And-Swap）的硬件原理与 ABA 问题的成因。
- 阐述 `ConcurrentHashMap` 在 Java 8 之后采用的 CAS + synchronized 分段加锁策略,与 Java 7 的 Segment 段锁方案相比有何优劣。

### 1.3 应用层级（Applying）

- 在生产代码中根据 CPU 密集型与 I/O 密集型任务的特征,合理设置 `ThreadPoolExecutor` 的核心线程数与最大线程数。
- 使用 `CompletableFuture` 编排多数据源异步聚合查询,处理超时、异常、回退逻辑。
- 使用 `Semaphore` 实现限流器,使用 `CyclicBarrier` 实现多线程阶段同步。

### 1.4 分析层级（Analyzing）

- 对比 `CountDownLatch` 与 `CyclicBarrier` 的语义差异,说明为何前者不可重置而后者可重置。
- 分析 `ThreadPoolExecutor` 拒绝策略四件套(`AbortPolicy`、`CallerRunsPolicy`、`DiscardPolicy`、`DiscardOldestPolicy`)在不同业务场景下的取舍。
- 给定一段并发代码,定位其中可能存在的死锁、活锁、线程饥饿问题并提出修复方案。

### 1.5 评价层级（Evaluating）

- 评估在何种场景下应当使用 `ForkJoinPool` 而非 `ThreadPoolExecutor`,以及 `parallelStream()` 默认使用 `ForkJoinPool.commonPool()` 带来的潜在风险。
- 评价 `synchronized` 在偏向锁、轻量级锁、重量级锁升级路径下的性能开销,讨论 JDK 15 后偏向锁被废弃的合理性。

### 1.6 创造层级（Creating）

- 基于 `AQS` 自定义一个互斥锁,支持可重入、可中断、公平/非公平两种模式。
- 设计一个支持优先级与超时的异步任务编排框架,底层复用 `CompletableFuture` 与 `ScheduledExecutorService`。
- 为一个高并发限流系统设计基于 `RateLimiter` 与 `Semaphore` 的多级限流方案,并给出在 Redis 集群环境下的分布式扩展思路。

---

## 二、历史动机与背景

### 2.1 JUC 诞生的时代背景

在 JDK 1.4 及之前,Java 并发编程主要依赖两个原语:`synchronized` 关键字(管程 Monitor 实现)和 `Object.wait()`/`notifyAll()` 通信机制。这套机制存在以下痛点。

第一,API 抽象层级过低。开发者必须手工管理线程生命周期,线程的创建、启动、终止、异常处理全部由业务代码承担。一个典型的早期线程池实现需要 200 行以上代码,且极易出现线程泄漏、资源未关闭等问题。

第二,锁机制单一。`synchronized` 是块结构锁,无法支持尝试获取(`tryLock`)、可中断获取(`lockInterruptibly`)、超时获取(`tryLock(timeout)`)等高级语义。一旦发生死锁,无法通过中断或超时自动恢复。

第三,并发集合缺失。在 JUC 出现之前,要在多线程环境下使用 `HashMap` 必须使用 `Collections.synchronizedMap()` 包装,该方案对整个 Map 加互斥锁,读读、读写、写写全部串行,高并发场景下性能极差。

第四,内存模型模糊。Java 内存模型(JMM)在 JDK 1.4 之前定义不严格,`volatile` 语义模糊,重排序规则不清晰,导致跨平台并发程序行为难以预测。这直接催生了 JSR 133 Java 内存模型的重新定义,在 JDK 5 中正式落地。

### 2.2 JSR 166 与 Doug Lea 的贡献

JUC 的核心推手是 Doug Lea。2001 年前后,Doug Lea 编写了一个 `util.concurrent` 第三方库,提供了线程池、并发集合、原子变量等基础设施。该库被广泛采用,SUN 公司遂在 JSR 166 中将其标准化,在 JDK 5.0(2004 年发布)正式纳入 `java.util.concurrent` 包。

此后 JUC 持续演进:

- **JDK 6**(2006): 增加 `NavigableMap`、`NavigableSet`、`ConcurrentSkipListMap`、`ConcurrentSkipListSet`,引入无锁跳表实现。
- **JDK 7**(2011): 引入 Fork/Join 框架(`ForkJoinPool`、`RecursiveTask`、`RecursiveAction`),为分治任务提供原生支持;增加 `TransferQueue` 与 `LinkedTransferQueue`。
- **JDK 8**(2014): 增加 `CompletableFuture`、`StampedLock`、`LongAdder`、`LongAccumulator`;`ConcurrentHashMap` 全面重写,使用 CAS + synchronized 替代 Segment 段锁。
- **JDK 9**(2017): 增加反应式 Flow API(`Flow.Subscriber`、`Flow.Publisher`、`SubmissionPublisher`),与 Reactive Streams 规范对齐。
- **JDK 10-11**(2018): `VarHandle` 提供细粒度内存屏障操作;`CompletableFuture` 增加超时与延迟方法。
- **JDK 19-21**(2022-2023): 虚拟线程(`Thread.ofVirtual()`)正式落地,JUC 中 `ExecutorService` 与 `Executors` 增加适配虚拟线程的工厂方法(`newVirtualThreadPerTaskExecutor()`),并发编程模型进入协程时代。

### 2.3 设计哲学

JUC 的设计遵循三条核心哲学,理解这三条哲学是掌握 JUC 的前提。

**第一,分层抽象。** JUC 在三个抽象层级上提供并发原语:高层异步编排(`CompletableFuture`)、中层执行器与同步工具(`ExecutorService`、`CountDownLatch`、`Semaphore`)、低层锁与原子变量(`AQS`、`Lock`、`Atomic*`、`VarHandle`)。开发者应优先使用高层抽象,仅在性能瓶颈或语义不足时下沉到低层。

**第二,失败优先(fail-fast)与显式异常。** JUC 大量方法在参数非法或状态错误时抛出 `IllegalArgumentException`、`IllegalStateException`、`RejectedExecutionException`,而不是静默吞掉错误。例如 `ThreadPoolExecutor.submit(null)` 会抛出 `NullPointerException`,`Future.get()` 在任务异常时会抛出 `ExecutionException` 包装异常。

**第三,非阻塞优先。** JUC 在能使用 CAS 与无锁算法的地方优先使用无锁实现,例如 `ConcurrentLinkedQueue`、`LongAdder`、`AtomicReference`。仅在必须阻塞的场景(如 `take()`、`put()`)才使用 `LockSupport.park()` 挂起线程。这与早期 `synchronized` 一律阻塞的设计形成对比。

---

## 三、形式化定义

### 3.1 线程池的形式化模型

一个线程池 $P$ 可由七元组形式化定义:

$$
P = \langle n_c, n_m, q, T, R, K, \tau \rangle
$$

其中:

- $n_c \in \mathbb{N}^+$ 表示核心线程数(`corePoolSize`),即线程池预热后保持的最小线程数。
- $n_m \in \mathbb{N}^+ \cup \{\infty\}$ 表示最大线程数(`maximumPoolSize`),在队列满后允许扩展到的上限。
- $q$ 表示工作队列(`workQueue`),其容量 $|q|$ 可为有限或无限。
- $T$ 表示线程工厂(`threadFactory`),负责生成新线程实例。
- $R$ 表示拒绝策略(`rejectedExecutionHandler`),在队列与最大线程均饱和时触发。
- $K$ 表示保活时间(`keepAliveTime`),非核心线程空闲超过 $K$ 后被回收。
- $\tau$ 表示时间单位。

#### 3.1.1 任务提交的执行流程

当 `submit(task)` 或 `execute(task)` 被调用时,线程池按以下严格顺序决策:

$$
\text{decision}(task) =
\begin{cases}
\text{addWorker}(task, \text{core}) & \text{if } \#\text{workers} < n_c \\
\text{offer}(task, q) & \text{if } |q| < \text{capacity}(q) \\
\text{addWorker}(task, \text{non-core}) & \text{if } \#\text{workers} < n_m \\
\text{reject}(task, R) & \text{otherwise}
\end{cases}
$$

该决策树有一个常被忽略的细节:**队列优先于非核心线程扩展**。这意味着若使用无界队列(如 `LinkedBlockingQueue` 无容量限制),则 $n_m$ 永远不会被触及,核心线程数 $n_c$ 之外的任务会无限堆积在队列中,可能导致 OOM。

#### 3.1.2 线程池吞吐量模型

设任务到达率为 $\lambda$(任务/秒),单任务平均服务时间为 $1/\mu$(秒),线程数为 $n$。基于 M/M/n 排队模型,系统稳态下:

$$
\rho = \frac{\lambda}{n \mu}, \quad \rho < 1
$$

平均等待时间(队列中):

$$
W_q = \frac{\rho^n}{n! \cdot (1-\rho)^2 \cdot n\mu} \cdot P_0
$$

其中 $P_0$ 为系统空闲概率:

$$
P_0 = \left[ \sum_{k=0}^{n-1} \frac{(n\rho)^k}{k!} + \frac{(n\rho)^n}{n!(1-\rho)} \right]^{-1}
$$

工程经验上,当 $\rho \to 1$ 时队列长度发散,系统进入拥塞状态。因此线程池容量设计应保证 $\rho \leq 0.7$,留出 30% 余量以应对突发流量。

### 3.2 CAS 与共识算法的形式化

CAS(Compare-And-Swap)是多核处理器提供的硬件原语,可形式化为函数:

$$
\text{CAS}(A, E, N) \to \{0, 1\}
$$

其中 $A$ 为内存地址,$E$ 为期望值,$N$ 为新值。若 $A$ 当前值等于 $E$,则将 $A$ 写入 $N$ 并返回 1(成功);否则返回 0(失败),不修改内存。

CAS 满足以下不变式:

1. **原子性**:整个操作不可分割,要么完整执行,要么完全不执行。
2. **线性一致性**:存在一个全局顺序,使得所有 CAS 操作看似按该顺序原子执行。
3. **无等待(wait-free)对单个 CAS**:单个 CAS 调用必然在有限步内完成,不受其他线程干扰。

ABA 问题的形式化描述:线程 T1 读取 $A$ 的值为 $v_1$,随后线程 T2 将 $A$ 改为 $v_2$ 再改回 $v_1$,此时 T1 执行 CAS($A$, $v_1$, $v_3$) 仍会成功,但中间状态已被丢失。解决方案是引入版本号 $A^{(k)}$,CAS 变为 $\text{CAS}^{+}(A, v_1, k_1, v_3, k_2)$,要求值与版本号同时匹配。

### 3.3 AQS 的形式化模型

AQS(AbstractQueuedSynchronizer)的核心是一个 FIFO 等待队列与一个整数 state。其状态机可形式化为:

$$
\text{AQS} = \langle Q, s, M \rangle
$$

- $Q$:CLH(Craig, Landin, Hagersten)队列变体,节点持有等待线程引用与等待状态。
- $s \in \mathbb{Z}$:同步状态整数,语义由子类定义(对 `ReentrantLock` 为重入次数,对 `Semaphore` 为许可数,对 `CountDownLatch` 为计数)。
- $M \in \{\text{exclusive}, \text{shared}\}$:模式。

独占模式获取锁的伪算法:

```
acquire(arg):
  if tryAcquire(arg) and acquireQueued(node, arg):
    selfInterrupt()
  return
```

其中 `tryAcquire` 由子类实现,返回布尔值表示是否成功获取。若失败则将当前线程封装为 Node 加入队尾,然后 `park()` 阻塞,等待前驱节点 `unpark()` 唤醒。

---

## 四、理论推导

### 4.1 从内存模型推导 `volatile` 的可见性

Java 内存模型定义了 happens-before 关系。`volatile` 写入与读取建立的 happens-before 规则如下:

$$
\text{write}(v, x) \xrightarrow{hb} \text{read}(v) = x
$$

即对一个 `volatile` 变量 $v$ 的写操作, happens-before 后续对 $v$ 的读操作。更关键的是,`volatile` 还具有释放/获取语义:

- `volatile` 写之前的所有普通写,对 `volatile` 读之后的读操作可见。
- 形式化:若 $W_1 \xrightarrow{po} V_w$ 且 $V_r \xrightarrow{po} R_2$ 且 $V_w \xrightarrow{hb} V_r$,则 $W_1 \xrightarrow{hb} R_2$。

这里 $po$ 表示程序顺序(program order),$hb$ 表示 happens-before。

推导:基于上述规则,可证明如下双重检查锁定(Double-Checked Locking, DCL)模式在 `volatile` 修饰下是正确的:

```java
public class Singleton {
    // volatile 保证构造指令不被重排序
    private static volatile Singleton instance;
    
    public static Singleton getInstance() {
        if (instance == null) {                    // 第一次检查
            synchronized (Singleton.class) {
                if (instance == null) {            // 第二次检查
                    instance = new Singleton();    // 安全发布
                }
            }
        }
        return instance;
    }
}
```

不使用 `volatile` 时,`instance = new Singleton()` 在字节码层面分三步:(1) 分配内存,(2) 调用构造器初始化字段,(3) 将引用赋给 `instance`。JIT 编译器可能将(2)(3)重排序,导致其他线程看到非空 `instance` 但字段尚未初始化。`volatile` 通过在写操作前插入 Release 屏障、读操作后插入 Acquire 屏障,禁止该重排序,从而保证 DCL 正确性。

### 4.2 ConcurrentHashMap 锁分段推导

设哈希桶总数为 $N$,Java 7 中 Segment 段数为 $S$,则单段平均桶数 $n_s = N / S$,段内仍采用 `synchronized` 加锁。并发度上界为 $S$(同时最多 $S$ 个写线程)。

Java 8 移除 Segment,直接对每个桶的 `Node` 头节点加 `synchronized`。并发度上界变为 $N$(理论上每个桶可独立加锁)。但实际并发度还受 CPU 核数、缓存一致性协议、内存带宽限制。在 64 核机器上,Java 8 `ConcurrentHashMap` 的实测吞吐量较 Java 7 提升 3-5 倍。

写入流程的形式化推导:

```
put(key, value):
  hash = spread(key.hashCode())
  loop:
    node = table[i]
    if node == null:
      if CAS(table[i], null, newNode):
        break
    elif node.hash == MOVED:
      table = helpTransfer()
    else:
      synchronized(node):
        if node is Node:
          updateOrAppend(node, key, value)
        else:  // TreeBin
          putTreeVal(node, key, value)
        break
  addCount(1L, binCount)
```

其中 `spread` 函数:

$$
h' = (h \oplus (h \gg 16)) \& 0x7fffffff
$$

将高 16 位与低 16 位异或,使哈希分布更均匀,减少桶冲突。

### 4.3 ForkJoinPool 工作窃取算法复杂度

ForkJoinPool 采用工作窃取(work-stealing)调度。每个工作线程拥有一个双端队列(deque),自己 push/pop 操作 LIFO 端,其他线程窃取时从 FIFO 端。设任务总数为 $T$,工作线程数为 $P$。

定理:**对于严格分治任务,工作窃取调度的期望执行时间为 $O(T/P + P \cdot \log P)$。**

证明概要:

1. 每个窃取操作以至少 $1/P$ 的概率窃取到目标任务(因窃取者随机选择受害者)。
2. 期望窃取次数 $E[S] = O(P \log P)$(由每个工作者队列状态的概率分析得出)。
3. 每次窃取代价 $O(1)$(无锁 deque 的 push/pop)。
4. 总时间 $T_{\text{total}} = T_{\text{work}} / P + T_{\text{steal}} = O(T/P) + O(P \log P)$。

详细证明参见 Blumofe 与 Leiserson 在 1999 年发表的论文(见参考文献 [3])。

### 4.4 StampedLock 乐观读的正确性条件

`StampedLock` 提供乐观读模式:

```java
long stamp = lock.tryOptimisticRead();
// 读取共享数据
if (!lock.validate(stamp)) {
    stamp = lock.readLock();
    try { /* 重新读取 */ } finally { lock.unlockRead(stamp); }
}
```

正确性条件:`validate(stamp)` 返回 true 当且仅当自 `stamp` 发出后未发生写操作。实现上依赖 `Unsafe.loadFence()` 与状态变量 `state` 的位运算。

但 StampedLock 有两个陷阱:

1. **不可重入**:同一线程重复获取读锁会死锁。
2. **不响应中断**:`writeLock()` 期间其他线程 `interrupt()` 不会抛出 `InterruptedException`,但 `readLockInterruptibly()` 可响应。

因此 `StampedLock` 适用于读多写少且不需要重入的场景,如缓存读取。

---

## 五、代码示例

### 5.1 ThreadPoolExecutor 完整示例

以下示例展示线程池的标准构造、任务提交、优雅关闭与监控。

```java
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 线程池标准构造示例。
 * 演示核心线程数、最大线程数、工作队列、线程工厂、拒绝策略的配置方法,
 * 以及优雅关闭的两阶段关闭模式。
 */
public class ThreadPoolDemo {

    /**
     * 自定义线程工厂:为每个线程设置有意义的名称,便于在线程堆栈与日志中定位问题。
     * 推荐做法:任何生产环境的线程池都应自定义 ThreadFactory,
     * 而不是使用 Executors.defaultThreadFactory() 生成的 pool-N-thread-M 默认命名。
     */
    static class NamedThreadFactory implements ThreadFactory {
        private final AtomicInteger counter = new AtomicInteger(1);
        private final String prefix;
        private final boolean daemon;

        NamedThreadFactory(String prefix, boolean daemon) {
            this.prefix = prefix;
            this.daemon = daemon;
        }

        @Override
        public Thread newThread(Runnable r) {
            Thread t = new Thread(r, prefix + "-" + counter.getAndIncrement());
            t.setDaemon(daemon);
            // 设置未捕获异常处理器,避免异常被吞掉
            t.setUncaughtExceptionHandler((thread, ex) -> {
                System.err.printf("线程 %s 抛出未捕获异常: %s%n",
                        thread.getName(), ex.getMessage());
            });
            return t;
        }
    }

    public static void main(String[] args) throws InterruptedException {
        // 构造线程池:核心 4,最大 8,队列 100,保活 30 秒
        // 拒绝策略使用 CallerRunsPolicy,让提交任务的线程自己执行,
        // 既不丢弃任务,又通过反压降低提交速度
        ExecutorService pool = new ThreadPoolExecutor(
                4, 8, 30L, TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(100),
                new NamedThreadFactory("order-pool", false),
                new ThreadPoolExecutor.CallerRunsPolicy());

        // 提交 200 个任务
        for (int i = 0; i < 200; i++) {
            final int taskId = i;
            pool.submit(() -> {
                try {
                    // 模拟订单处理,每任务耗时 50ms
                    Thread.sleep(50);
                    System.out.printf("[%s] 处理订单 #%d 完成%n",
                            Thread.currentThread().getName(), taskId);
                } catch (InterruptedException e) {
                    // 捕获中断信号,优雅退出
                    Thread.currentThread().interrupt();
                }
            });
        }

        // 两阶段优雅关闭
        // 第一阶段:调用 shutdown(),拒绝新任务,等待已提交任务完成
        pool.shutdown();
        // 第二阶段:等待 60 秒,若未结束则调用 shutdownNow() 强制中断
        if (!pool.awaitTermination(60, TimeUnit.SECONDS)) {
            pool.shutdownNow();
            // 再次等待 10 秒,确保所有线程已退出
            if (!pool.awaitTermination(10, TimeUnit.SECONDS)) {
                System.err.println("线程池未能完全关闭");
            }
        }
    }
}
```

#### 5.1.1 关键点解读

- **不使用 `Executors.newFixedThreadPool()`**:该方法内部使用无界 `LinkedBlockingQueue`,任务可无限堆积导致 OOM。生产环境应直接使用 `ThreadPoolExecutor` 显式指定队列容量。
- **`CallerRunsPolicy` 反压**:当队列满且最大线程数已满,提交线程自己执行任务,使提交速率自然降低,形成天然的反压机制。
- **两阶段关闭**:先 `shutdown()` 拒绝新任务,再 `awaitTermination()` 等待已提交任务完成,超时后再 `shutdownNow()` 中断未完成的任务。这是 Spring 应用关闭时优雅停机的标准模式。

### 5.2 CompletableFuture 异步编排

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * CompletableFuture 多数据源异步聚合示例。
 * 模拟电商商品详情页:并行查询商品基础信息、库存、价格、评论,
 * 全部完成后聚合成最终结果,任一查询失败则降级返回默认值。
 */
public class CompletableFutureAggregation {

    // 使用虚拟线程(Java 21+)承载阻塞 IO 操作
    // 虚拟线程对每个阻塞操作都会让出载体线程,适合大量 IO 密集任务
    private static final ExecutorService VIRTUAL_POOL =
            Executors.newVirtualThreadPerTaskExecutor();

    public static void main(String[] args) throws Exception {
        long start = System.currentTimeMillis();

        // 异步并行查询四个数据源
        CompletableFuture<String> baseInfo = CompletableFuture
                .supplyAsync(() -> queryBaseInfo("P001"), VIRTUAL_POOL)
                .completeOnTimeout("默认商品名", 200, TimeUnit.MILLISECONDS)
                .exceptionally(ex -> {
                    System.err.println("基础信息查询失败: " + ex.getMessage());
                    return "默认商品名";
                });

        CompletableFuture<Integer> stock = CompletableFuture
                .supplyAsync(() -> queryStock("P001"), VIRTUAL_POOL)
                .completeOnTimeout(0, 200, TimeUnit.MILLISECONDS)
                .exceptionally(ex -> 0);

        CompletableFuture<Double> price = CompletableFuture
                .supplyAsync(() -> queryPrice("P001"), VIRTUAL_POOL)
                .completeOnTimeout(99.0, 200, TimeUnit.MILLISECONDS)
                .exceptionally(ex -> 99.0);

        CompletableFuture<String> reviews = CompletableFuture
                .supplyAsync(() -> queryReviews("P001"), VIRTUAL_POOL)
                .orTimeout(300, TimeUnit.MILLISECONDS)
                .exceptionally(ex -> "评论服务降级");

        // 全部完成后聚合
        CompletableFuture.allOf(baseInfo, stock, price, reviews)
                .thenRun(() -> {
                    String result = String.format(
                            "商品: %s, 库存: %d, 价格: %.2f, 评论: %s",
                            baseInfo.join(), stock.join(),
                            price.join(), reviews.join());
                    System.out.println(result);
                    System.out.printf("总耗时: %dms%n",
                            System.currentTimeMillis() - start);
                })
                .join();  // 等待整个流水线完成

        VIRTUAL_POOL.close();
    }

    // 以下是模拟的远程调用方法
    private static String queryBaseInfo(String productId) {
        sleep(50);
        return "iPhone 15 Pro";
    }

    private static Integer queryStock(String productId) {
        sleep(80);
        return 42;
    }

    private static Double queryPrice(String productId) {
        sleep(60);
        return 8999.00;
    }

    private static String queryReviews(String productId) {
        sleep(100);
        return "好评如潮";
    }

    private static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

### 5.3 ConcurrentHashMap 与原子计数

```java
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.LongAdder;
import java.util.stream.IntStream;

/**
 * 并发计数器对比示例。
 * 对比 AtomicLong、LongAdder、ConcurrentHashMap.merge() 三种方案
 * 在 100 线程各累加 100 万次场景下的性能差异。
 */
public class ConcurrentCounterDemo {

    public static void main(String[] args) throws Exception {
        int threadCount = 100;
        int perThreadIncrement = 1_000_000;

        // 方案 1: AtomicLong
        {
            java.util.concurrent.atomic.AtomicLong counter =
                    new java.util.concurrent.atomic.AtomicLong();
            long start = System.nanoTime();
            Thread[] threads = new Thread[threadCount];
            for (int i = 0; i < threadCount; i++) {
                threads[i] = new Thread(() -> {
                    for (int j = 0; j < perThreadIncrement; j++) {
                        counter.incrementAndGet();
                    }
                });
                threads[i].start();
            }
            for (Thread t : threads) t.join();
            long elapsed = (System.nanoTime() - start) / 1_000_000;
            System.out.printf("AtomicLong: 值=%d, 耗时=%dms%n",
                    counter.get(), elapsed);
        }

        // 方案 2: LongAdder(高并发写入场景下显著优于 AtomicLong)
        {
            LongAdder counter = new LongAdder();
            long start = System.nanoTime();
            Thread[] threads = new Thread[threadCount];
            for (int i = 0; i < threadCount; i++) {
                threads[i] = new Thread(() -> {
                    for (int j = 0; j < perThreadIncrement; j++) {
                        counter.increment();
                    }
                });
                threads[i].start();
            }
            for (Thread t : threads) t.join();
            long elapsed = (System.nanoTime() - start) / 1_000_000;
            System.out.printf("LongAdder: 值=%d, 耗时=%dms%n",
                    counter.sum(), elapsed);
        }

        // 方案 3: ConcurrentHashMap.merge() 用于按 key 聚合计数
        {
            ConcurrentHashMap<String, LongAdder> map = new ConcurrentHashMap<>();
            long start = System.nanoTime();
            Thread[] threads = new Thread[threadCount];
            for (int i = 0; i < threadCount; i++) {
                final int threadIdx = i;
                threads[i] = new Thread(() -> {
                    String key = "key-" + (threadIdx % 10);  // 10 个桶
                    for (int j = 0; j < perThreadIncrement; j++) {
                        // computeIfAbsent + increment 是高效的模式
                        map.computeIfAbsent(key, k -> new LongAdder()).increment();
                    }
                });
                threads[i].start();
            }
            for (Thread t : threads) t.join();
            long elapsed = (System.nanoTime() - start) / 1_000_000;
            long total = map.values().stream().mapToLong(LongAdder::sum).sum();
            System.out.printf("ConcurrentHashMap: 总值=%d, 耗时=%dms%n",
                    total, elapsed);
        }
    }
}
```

### 5.4 基于 AQS 自定义锁

```java
import java.util.concurrent.locks.AbstractQueuedSynchronizer;
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.Lock;

/**
 * 基于 AQS 实现的不可重入互斥锁。
 * 演示 AQS 独占模式的典型实现:tryAcquire/tryRelease + state 整数语义。
 * 生产环境应直接使用 ReentrantLock,本示例仅用于教学。
 */
public class MutexLock implements Lock {

    /**
     * 同步器内部类:继承 AQS,实现独占模式的获取与释放。
     * state=0 表示未锁定,state=1 表示已锁定。
     */
    private static class Sync extends AbstractQueuedSynchronizer {
        private static final long serialVersionUID = 1L;

        /** 判断是否处于独占状态 */
        @Override
        protected boolean isHeldExclusively() {
            return getState() == 1;
        }

        /** 尝试获取锁,CAS 将 state 从 0 改为 1,并设置持有线程 */
        @Override
        protected boolean tryAcquire(int arg) {
            if (compareAndSetState(0, 1)) {
                setExclusiveOwnerThread(Thread.currentThread());
                return true;
            }
            return false;
        }

        /** 尝试释放锁,要求调用线程必须是持有者 */
        @Override
        protected boolean tryRelease(int arg) {
            if (getState() == 0) {
                throw new IllegalMonitorStateException();
            }
            setExclusiveOwnerThread(null);
            setState(0);  // 释放时无需 CAS,因为只有持有者才能释放
            return true;
        }

        Condition newCondition() {
            return new ConditionObject();
        }
    }

    private final Sync sync = new Sync();

    @Override public void lock() { sync.acquire(1); }
    @Override public void lockInterruptibly() throws InterruptedException {
        sync.acquireInterruptibly(1);
    }
    @Override public boolean tryLock() { return sync.tryAcquire(1); }
    @Override public boolean tryLock(long time, TimeUnit unit)
            throws InterruptedException {
        return sync.tryAcquireNanos(1, unit.toNanos(time));
    }
    @Override public void unlock() { sync.release(1); }
    @Override public Condition newCondition() { return sync.newCondition(); }
}
```

### 5.5 Semaphore 限流器

```java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * 使用 Semaphore 实现固定速率限流器。
 * 模拟场景:对外部 API 调用做并发限制,防止突发请求打垮下游服务。
 */
public class RateLimiterDemo {

    public static void main(String[] args) throws InterruptedException {
        // 允许同时 5 个请求并行
        Semaphore limiter = new Semaphore(5);
        ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor();

        // 模拟 50 个并发请求
        for (int i = 0; i < 50; i++) {
            final int reqId = i;
            pool.submit(() -> {
                try {
                    // 非阻塞尝试,1 秒内未拿到许可则放弃
                    if (!limiter.tryAcquire(1, TimeUnit.SECONDS)) {
                        System.out.printf("请求 #%d 被限流%n", reqId);
                        return;
                    }
                    try {
                        System.out.printf("请求 #%d 开始处理%n", reqId);
                        Thread.sleep(100);  // 模拟 API 调用
                        System.out.printf("请求 #%d 完成%n", reqId);
                    } finally {
                        limiter.release();  // 必须在 finally 中释放
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        }

        pool.shutdown();
        pool.awaitTermination(30, TimeUnit.SECONDS);
    }
}
```

### 5.6 CountDownLatch 与 CyclicBarrier

```java
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * CountDownLatch 与 CyclicBarrier 对照示例。
 * 场景 A: 多个数据加载完毕后主线程开始聚合(适合 CountDownLatch)。
 * 场景 B: 多个计算阶段,每阶段所有线程同步(适合 CyclicBarrier)。
 */
public class LatchBarrierDemo {

    public static void main(String[] args) throws Exception {
        // 场景 A: 启动等待
        System.out.println("=== CountDownLatch 场景:等待多个数据源初始化 ===");
        CountDownLatch initLatch = new CountDownLatch(3);
        ExecutorService pool1 = Executors.newVirtualThreadPerTaskExecutor();
        for (int i = 0; i < 3; i++) {
            final int idx = i;
            pool1.submit(() -> {
                try {
                    Thread.sleep((idx + 1) * 100);
                    System.out.printf("数据源 %d 初始化完成%n", idx);
                    initLatch.countDown();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        }
        initLatch.await();  // 等待三个数据源全部就绪
        System.out.println("所有数据源就绪,主流程开始");
        pool1.shutdown();

        // 场景 B: 多阶段同步
        System.out.println("\n=== CyclicBarrier 场景:三阶段流水线 ===");
        int workers = 3;
        CyclicBarrier barrier = new CyclicBarrier(workers, () ->
                System.out.println("--- 全部到达屏障,进入下一阶段 ---"));
        ExecutorService pool2 = Executors.newFixedThreadPool(workers);
        for (int i = 0; i < workers; i++) {
            final int wId = i;
            pool2.submit(() -> {
                try {
                    for (int stage = 1; stage <= 3; stage++) {
                        Thread.sleep((wId + 1) * 50);
                        System.out.printf("worker %d 完成阶段 %d%n", wId, stage);
                        barrier.await();  // 等待其他 worker
                    }
                } catch (Exception e) {
                    Thread.currentThread().interrupt();
                }
            });
        }
        pool2.shutdown();
        pool2.awaitTermination(10, java.util.concurrent.TimeUnit.SECONDS);
    }
}
```

---

## 六、对比分析

### 6.1 锁机制对比

| 维度 | synchronized | ReentrantLock | StampedLock | ReadWriteLock |
| ---- | ------------ | ------------- | ----------- | ------------- |
| 实现机制 | JVM 内置 Monitor | AQS 独占模式 | AQS 改造 + 乐观读 | AQS 共享+独占 |
| 可重入 | 是 | 是 | 否 | 是 |
| 公平性 | 仅非公平 | 公平/非公平可选 | 仅非公平 | 公平/非公平可选 |
| 可中断 | 不可 | lockInterruptibly() | tryLock 超时 | 可 |
| 超时获取 | 不可 | tryLock(timeout) | tryLock(timeout) | tryLock(timeout) |
| 条件变量 | wait/notify 单条件 | 多 Condition | 不支持 | 多 Condition |
| 乐观读 | 不支持 | 不支持 | tryOptimisticRead | 不支持 |
| 锁升级 | 偏向→轻量→重量 | 无升级 | 无升级 | 无升级 |
| 性能(高竞争) | 接近 ReentrantLock | 与 synchronized 相当 | 读多写少场景最优 | 中等 |
| 释放方式 | 自动(块退出) | 手动 unlock() | 手动 unlock() | 手动 unlock() |
| JDK 版本 | 1.0+ | 1.5+ | 1.8+ | 1.5+ |

### 6.2 并发 Map 对比

| 维度 | HashMap | Hashtable | ConcurrentHashMap(JDK8) | ConcurrentSkipListMap |
| ---- | ------- | --------- | ----------------------- | --------------------- |
| 线程安全 | 否 | 是 | 是 | 是 |
| 加锁粒度 | 无 | 全表 | 单桶(synchronized) | 无锁(CAS) |
| null 键 | 允许 | 不允许 | 不允许 | 不允许 |
| null 值 | 允许 | 不允许 | 不允许 | 不允许 |
| 迭代器 | fail-fast | fail-fast | weakly consistent | weakly consistent |
| 有序性 | 无 | 无 | 无 | 升序(key 排序) |
| 时间复杂度(查找) | O(1) | O(1) | O(1)~O(logn) | O(logn) |
| 内存占用 | 低 | 低 | 中 | 高(指针开销) |
| 适用场景 | 单线程 | 已废弃 | 通用并发 | 排序+并发 |

### 6.3 阻塞队列对比

| 队列 | 容量 | 底层结构 | 适用场景 | 注意点 |
| ---- | ---- | -------- | -------- | ------ |
| ArrayBlockingQueue | 有界 | 数组 | 生产消费、线程池任务队列 | 单锁,吞吐量低于 LinkedBlockingQueue |
| LinkedBlockingQueue | 可选(默认 Integer.MAX_VALUE) | 链表 | 线程池任务队列 | 无界易 OOM,使用时务必指定容量 |
| SynchronousQueue | 0 | 直接传递 | CachedThreadPool | 每个插入必须等待对应取出 |
| PriorityBlockingQueue | 无界 | 堆 | 优先级任务 | 任务必须实现 Comparable |
| DelayQueue | 无界 | 堆(按延迟) | 定时任务、缓存过期 | 任务必须实现 Delayed |
| LinkedTransferQueue | 无界 | 链表 | 高吞吐传递 | transfer() 阻塞至被消费 |
| ConcurrentLinkedQueue | 无界 | 链表(CAS) | 非阻塞场景 | 无 take/put 阻塞方法 |

### 6.4 同步工具对比

| 工具 | 计数语义 | 可重置 | 用途 | 典型场景 |
| ---- | -------- | ------ | ---- | -------- |
| CountDownLatch | 递减至 0 | 否 | 一次性等待 | 服务启动等待依赖初始化 |
| CyclicBarrier | 屏障点同步 | 是 | 多阶段同步 | 分阶段流水线计算 |
| Semaphore | 许可数 | 是(permits) | 资源限流 | API 限流、连接池 |
| Phaser | 动态注册 parties | 是 | 复杂分阶段 | 复杂多阶段任务 |
| Exchanger | 两两交换 | 是 | 双线程数据交换 | 遗传算法、管道 |

### 6.5 原子类对比

| 类 | 适用场景 | 实现机制 | 性能特征 |
| ---- | -------- | -------- | -------- |
| AtomicBoolean/Integer/Long | 简单计数 | CAS | 中竞争下优秀 |
| AtomicReference | 引用更新 | CAS | 中竞争下优秀 |
| AtomicStampedReference | 解决 ABA | CAS + 版本号 | 额外内存开销 |
| LongAdder | 高并发计数 | Cell 分片 | 写入吞吐量 5-10x AtomicLong |
| LongAccumulator | 累积运算 | Cell 分片 | 任意二元运算 |
| DoubleAdder | 高并发 double 计数 | Cell 分片 + bits 转换 | 高吞吐量 |

---

## 七、常见陷阱

### 7.1 陷阱一:`Executors.newFixedThreadPool()` 导致 OOM

```java
// 危险!队列无界,任务堆积导致 OOM
ExecutorService pool = Executors.newFixedThreadPool(10);
for (int i = 0; i < Integer.MAX_VALUE; i++) {
    pool.submit(() -> { /* ... */ });
}
```

**根因**: `newFixedThreadPool` 内部使用 `new LinkedBlockingQueue<>()`,该构造无容量限制,实际容量为 `Integer.MAX_VALUE`(约 21 亿)。任务提交速度大于处理速度时,队列无限增长直至 OOM。

**修复**: 显式使用 `ThreadPoolExecutor` 并指定有界队列容量。

阿里 Java 开发手册明确禁止使用 `Executors` 工厂方法创建线程池,必须使用 `new ThreadPoolExecutor(...)` 显式构造。

### 7.2 陷阱二:`submit(Runnable)` 吞掉异常

```java
ExecutorService pool = Executors.newSingleThreadExecutor();
pool.submit(() -> { throw new RuntimeException("测试异常"); });
// 异常被 Future 静默吞掉,除非调用 future.get()
```

**根因**: `submit()` 将 `Runnable` 包装为 `FutureTask`,异常被存入 `Future` 的 `outcome` 字段,只有在调用 `get()` 时才会以 `ExecutionException` 抛出。

**修复**: 三种方案任选其一:
1. 使用 `execute()` 而非 `submit()`,异常会触发线程的 `UncaughtExceptionHandler`。
2. 调用 `Future.get()` 并处理 `ExecutionException`。
3. 自定义 `ThreadFactory` 设置 `UncaughtExceptionHandler`。

### 7.3 陷阱三:`ConcurrentHashMap` 复合操作非原子

```java
ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();
// 非原子!多线程下会丢失更新
Integer count = map.get("key");
if (count == null) {
    map.put("key", 1);
} else {
    map.put("key", count + 1);
}
```

**根因**: `get` 与 `put` 各自原子,但组合(get-then-put)不原子,可能出现 TOCTOU(Time-Of-Check-To-Time-Of-Use)问题。

**修复**: 使用 `compute`、`merge` 或 `computeIfAbsent` 等原子复合方法。

```java
map.compute("key", (k, v) -> v == null ? 1 : v + 1);
```

### 7.4 陷阱四:`ThreadLocal` 内存泄漏

```java
// 在线程池中,线程会复用,ThreadLocal 不 remove 会内存泄漏
class Task implements Runnable {
    private static final ThreadLocal<BigObject> HOLDER =
            ThreadLocal.withInitial(BigObject::new);
    public void run() {
        BigObject obj = HOLDER.get();
        // 使用 obj
        // 忘记 remove,线程被复用后 obj 仍被 Entry 引用
    }
}
```

**根因**: `ThreadLocalMap` 的 Entry 是弱引用 key,但 value 是强引用。线程池中线程长期存活,value 无法被回收。

**修复**: 在 `finally` 中显式调用 `HOLDER.remove()`。Spring 的 `RequestContextHolder` 通过 `RequestContextListener.requestDestroyed()` 自动清理。

### 7.5 陷阱五:死锁与锁顺序

```java
// 经典死锁:两线程以相反顺序获取两把锁
class Account {
    void transfer(Account to, double amount) {
        synchronized (this) {
            synchronized (to) {  // 若另一线程反向 transfer(to, this),死锁
                this.balance -= amount;
                to.balance += amount;
            }
        }
    }
}
```

**修复**: 全局锁顺序。对所有 Account 排序(如按 `System.identityHashCode`),始终先锁较小者:

```java
void transfer(Account from, Account to, double amount) {
    Account first = System.identityHashCode(from) < System.identityHashCode(to)
            ? from : to;
    Account second = first == from ? to : from;
    synchronized (first) {
        synchronized (second) {
            from.balance -= amount;
            to.balance += amount;
        }
    }
}
```

### 7.6 陷阱六:`parallelStream()` 共享 ForkJoinPool

```java
// parallelStream 默认使用 ForkJoinPool.commonPool()
// 一个慢任务会拖累整个 JVM 内所有 parallelStream 与 CompletableFuture 默认池
list.parallelStream().map(x -> {
    Thread.sleep(1000);  // 阻塞 IO 占用 commonPool 线程
    return x;
}).collect(Collectors.toList());
```

**根因**: `ForkJoinPool.commonPool()` 的并行度等于 `Runtime.getRuntime().availableProcessors() - 1`。一旦被阻塞任务占满,其他 `parallelStream` 全部卡死。

**修复**: 阻塞 IO 任务不要用 `parallelStream`,改用自定义 `ThreadPoolExecutor`。若必须并行,使用 `CompletableFuture.supplyAsync(task, customPool)`。

### 7.7 陷阱七:`ReentrantLock` 忘记 unlock

```java
ReentrantLock lock = new ReentrantLock();
lock.lock();
try {
    // 业务代码
    if (condition) return;  // 直接 return 跳过 unlock,死锁!
} finally {
    lock.unlock();  // 必须 finally
}
```

**正确模式**: lock() 必须紧接 try-finally,且 unlock 必须在 finally 块首。

### 7.8 陷阱八:`synchronized` 字符串常量

```java
// 危险!字符串常量被 JVM intern,不同类实例可能共享同一锁
synchronized ("lock") { /* ... */ }
```

**根因**: 字符串字面量在 JVM 内部被 intern 到字符串常量池,任何代码使用相同字面量都竞争同一把锁,极易引发意外阻塞。

**修复**: 使用专用锁对象 `private final Object lock = new Object();`。

### 7.9 陷阱九:`wait()`/`notify()` 在非同步代码块

```java
Object lock = new Object();
lock.wait();  // 抛 IllegalMonitorStateException
```

**根因**: `wait`/`notify` 要求当前线程持有该对象的 Monitor,即必须在 `synchronized(lock)` 块内调用。

### 7.10 陷阱十:`Future.get()` 无超时

```java
Future<?> f = pool.submit(task);
f.get();  // 永远阻塞,若任务卡死则线程被永久占用
```

**修复**: 始终使用带超时的 `get(timeout, unit)`,并在超时后调用 `f.cancel(true)` 中断任务。

---

## 八、工程实践

### 8.1 线程池命名规范

生产环境的线程池必须有可识别的命名,以便在 jstack、arthas、APM 中快速定位。推荐格式:

```
业务名-模块名-pool-N
```

例如 `order-query-pool-1`、`payment-callback-pool-3`。

实现方式:自定义 `ThreadFactory`,示例参见 5.1 节。

### 8.2 线程池容量计算公式

Brian Goetz 在《Java Concurrency in Practice》中给出经验公式:

**CPU 密集型任务**:

$$
n_c = N_{\text{cpu}} + 1
$$

**I/O 密集型任务**:

$$
n_c = N_{\text{cpu}} \times U_{\text{cpu}} \times \left(1 + \frac{W}{C}\right)
$$

其中 $N_{\text{cpu}}$ 是 CPU 核数,$U_{\text{cpu}}$ 是目标 CPU 利用率(0~1),$W/C$ 是等待时间与计算时间之比。

实例:8 核机器,目标 CPU 利用率 0.8,任务等待/计算比 5(典型数据库查询):

$$
n_c = 8 \times 0.8 \times (1 + 5) = 38.4 \approx 40
$$

实际生产中应通过压测调整,经验值仅作起点。

### 8.3 线程池监控

生产线程池必须暴露监控指标,Prometheus + Micrometer 推荐指标:

| 指标 | 含义 | 报警阈值 |
| ---- | ---- | -------- |
| `thread_pool_active_count` | 活跃线程数 | 持续 > 最大线程数 80% |
| `thread_pool_queue_size` | 队列堆积 | > 容量 70% |
| `thread_pool_completed_task_count` | 已完成任务数 | 用于吞吐量监控 |
| `thread_pool_rejected_count` | 拒绝任务数 | > 0 立即报警 |
| `thread_pool_largest_pool_size` | 历史峰值线程数 | 用于容量规划 |

Micrometer 代码示例:

```java
// 注册线程池监控到 Prometheus
ThreadPoolExecutor pool = ...;
Binder binder = new ExecutorServiceMetrics(pool, "order-pool", List.of());
meterRegistry.bind(binder);  // 自动暴露上述指标
```

### 8.4 优雅停机

Spring Boot 应用关闭时,需保证已接收请求处理完成。标准模式:

```yaml
# application.yml
server:
  shutdown: graceful  # 启用优雅停机
spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s  # 等待最长 30 秒
```

```java
@Component
public class ThreadPoolShutdown implements DisposableBean {
    @Resource
    private ExecutorService orderPool;

    @Override
    public void destroy() throws InterruptedException {
        orderPool.shutdown();
        if (!orderPool.awaitTermination(30, TimeUnit.SECONDS)) {
            orderPool.shutdownNow();
        }
    }
}
```

配合 Kubernetes preStop hook:

```yaml
lifecycle:
  preStop:
    exec:
      command: ["sh", "-c", "sleep 10"]  # 等 LB 摘除流量
```

### 8.5 锁粒度优化

业务系统经常面临"大锁 vs 小锁"的权衡。原则:

1. **临界区最小化**:只锁真正需要互斥的字段,避免 `synchronized(this)` 包裹整个方法。
2. **分片锁**:对大 Map 使用 `Striped<Lock>`(Guava)按 hash 分片,典型 32~64 把锁。
3. **读写分离**:读多写少场景使用 `ReadWriteLock` 或 `StampedLock`。
4. **无锁优先**:能用 `Atomic*` 或 `LongAdder` 就不用锁。

### 8.6 异步编程最佳实践

`CompletableFuture` 是 Java 8+ 异步编排的主力,使用要点:

1. **始终指定线程池**:不要使用默认的 `ForkJoinPool.commonPool()`,传入业务专用线程池。
2. **超时必加**:`orTimeout()` 或 `completeOnTimeout()` 必须有,防止任务卡死。
3. **异常处理**:`exceptionally()` 或 `handle()` 处理异常,避免异常被吞。
4. **避免 `.join()` 阻塞主线程**:必要时使用 `allOf().join()`,但要明确风险。

### 8.7 虚拟线程适配

Java 21 虚拟线程极大地简化了 IO 密集型并发编程,但需要注意:

1. **不要池化虚拟线程**:每个任务一个虚拟线程,使用 `newVirtualThreadPerTaskExecutor()`。
2. **避免 `synchronized` 持有期间阻塞 IO**:虚拟线程在 `synchronized` 块内阻塞会钉住载体线程(Pin),失去虚拟线程优势。改用 `ReentrantLock`。
3. **CPU 密集型仍用平台线程**:虚拟线程不适合 CPU 密集计算,因为不会让出载体线程。
4. **ThreadLocal 慎用**:大量虚拟线程 + 大量 ThreadLocal 会内存爆炸,优先使用 Scoped Values(Java 21+ preview)。

---

## 九、案例研究

### 9.1 案例一:电商订单服务线程池调优

**背景**:某电商订单服务在双十一峰值流量下,QPS 从日常的 500 突增到 5000,接口 99 分位响应时间从 50ms 飙升到 5s,出现大量超时。

**初始配置**:

```java
ExecutorService pool = Executors.newFixedThreadPool(50);
```

**问题分析**:

1. `newFixedThreadPool` 使用无界队列,5000 QPS 下队列堆积 5 万+ 任务,延迟主要来自排队。
2. 50 个线程处理数据库查询(I/O 密集),按 8.2 节公式应至少 200~400 线程。
3. 队列堆积无法监控,流量打满后 silent degradation。

**重构方案**:

```java
ThreadPoolExecutor pool = new ThreadPoolExecutor(
        200, 400, 60L, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(1000),  // 有界队列
        new NamedThreadFactory("order", false),
        new ThreadPoolExecutor.CallerRunsPolicy());

// 注册监控
new ExecutorServiceMetrics(pool, "order-pool", List.of())
        .bindTo(meterRegistry);
```

**效果**:

| 指标 | 重构前 | 重构后 |
| ---- | ------ | ------ |
| QPS 峰值 | 5000(超时严重) | 6500(无超时) |
| P99 延迟 | 5000ms | 80ms |
| 队列堆积 | 不可见 | 上限 1000 |
| 拒绝策略触发 | 不触发(队列无界) | 高峰期触发 CallerRuns 反压 |
| OOM 风险 | 高 | 无 |

### 9.2 案例二:缓存读多写少场景下的 StampedLock

**背景**:某行情服务缓存 10 万个证券的实时价格,读 QPS 5 万,写 QPS 100。原使用 `synchronized` 导致读读串行,P99 延迟 30ms。

**初始实现**:

```java
class PriceCache {
    private final Map<String, Double> cache = new HashMap<>();
    public synchronized Double get(String code) { return cache.get(code); }
    public synchronized void put(String code, double price) { cache.put(code, price); }
}
```

**重构为 StampedLock + 乐观读**:

```java
class PriceCache {
    private final Map<String, Double> cache = new HashMap<>();
    private final StampedLock lock = new StampedLock();

    public Double get(String code) {
        // 乐观读,无锁
        long stamp = lock.tryOptimisticRead();
        Double price = cache.get(code);
        if (lock.validate(stamp)) {
            return price;  // 乐观读成功
        }
        // 乐观读失败,退化为悲观读锁
        stamp = lock.readLock();
        try {
            return cache.get(code);
        } finally {
            lock.unlockRead(stamp);
        }
    }

    public void put(String code, double price) {
        long stamp = lock.writeLock();
        try {
            cache.put(code, price);
        } finally {
            lock.unlockWrite(stamp);
        }
    }
}
```

**效果**: P99 延迟从 30ms 降至 2ms,吞吐量提升 8 倍。代价是代码复杂度上升,且 `StampedLock` 不可重入,需评估业务是否需要重入。

### 9.3 案例三:CompletableFuture 多源聚合降级

**背景**:商品详情页需要并行调用商品、库存、价格、评论、推荐五个服务。任一服务故障不应导致整个页面失败。

**实现**:

```java
public ProductDetail getProductDetail(String productId) {
    CompletableFuture<Product> productFuture = CompletableFuture
            .supplyAsync(() -> productService.get(productId), ioPool)
            .orTimeout(200, MILLISECONDS)
            .exceptionally(ex -> Product.DEFAULT);

    CompletableFuture<Integer> stockFuture = CompletableFuture
            .supplyAsync(() -> stockService.get(productId), ioPool)
            .orTimeout(200, MILLISECONDS)
            .exceptionally(ex -> 0);

    CompletableFuture<Double> priceFuture = CompletableFuture
            .supplyAsync(() -> priceService.get(productId), ioPool)
            .orTimeout(200, MILLISECONDS)
            .exceptionally(ex -> 0.0);

    CompletableFuture<List<Review>> reviewFuture = CompletableFuture
            .supplyAsync(() -> reviewService.list(productId), ioPool)
            .orTimeout(300, MILLISECONDS)
            .exceptionally(ex -> Collections.emptyList());

    CompletableFuture<List<String>> recommendFuture = CompletableFuture
            .supplyAsync(() -> recommendService.list(productId), ioPool)
            .orTimeout(500, MILLISECONDS)
            .exceptionally(ex -> Collections.emptyList());

    // 全部并行执行,取最慢的一个作为总耗时
    CompletableFuture.allOf(
            productFuture, stockFuture, priceFuture,
            reviewFuture, recommendFuture).join();

    return new ProductDetail(
            productFuture.join(), stockFuture.join(),
            priceFuture.join(), reviewFuture.join(),
            recommendFuture.join());
}
```

**关键设计点**:

1. 每个服务独立超时,避免一个慢服务拖垮整体。
2. 异常降级返回默认值,保证主流程不失败。
3. 业务隔离线程池,避免相互拖累。
4. `allOf().join()` 等待全部完成,总耗时约等于最慢的服务。

### 9.4 案例四:基于 AQS 实现限流锁

**背景**:某接口需要按用户维度限流(每用户每秒最多 10 次)。基于 AQS 自定义一个令牌桶锁:

```java
public class RateLimitLock extends AbstractQueuedSynchronizer {
    private final int maxPermits;
    private final long refillIntervalNanos;
    private volatile long lastRefillNanos;

    public RateLimitLock(int maxPermits, Duration refillInterval) {
        this.maxPermits = maxPermits;
        this.refillIntervalNanos = refillInterval.toNanos();
        setState(maxPermits);
        this.lastRefillNanos = System.nanoTime();
    }

    @Override
    protected boolean tryAcquire(int arg) {
        refill();
        for (;;) {
            int current = getState();
            int next = current - 1;
            if (current <= 0 || next < 0) return false;
            if (compareAndSetState(current, next)) return true;
        }
    }

    @Override
    protected boolean tryRelease(int arg) {
        // 不需要释放,许可按时间补充
        return true;
    }

    private void refill() {
        long now = System.nanoTime();
        if (now - lastRefillNanos >= refillIntervalNanos) {
            setState(maxPermits);
            lastRefillNanos = now;
        }
    }
}
```

实际生产推荐使用 Guava `RateLimiter` 或 Resilience4j `RateLimiter`,本案例仅为演示 AQS 应用。

---

## 十、习题

### 10.1 基础题

**题 1.1**(记忆/理解) `ThreadPoolExecutor` 提交任务时,核心线程、工作队列、最大线程、拒绝策略的触发顺序是什么?为什么 `Executors.newFixedThreadPool()` 使用的无界队列会导致 `maximumPoolSize` 永远不生效?

**参考答案要点**:

顺序:核心线程→工作队列→最大线程→拒绝策略。`newFixedThreadPool` 内部使用无界 `LinkedBlockingQueue`,任务永远不会被拒(队列永远不满),因此 `maximumPoolSize` 不被触发,实际线程数固定等于核心线程数。这也是无界队列易 OOM 的原因。

**题 1.2**(理解) `volatile` 变量能保证什么、不能保证什么?请举例说明"可见但不原子"的场景。

**参考答案要点**:

`volatile` 保证:可见性(修改立即对其他线程可见)、有序性(禁止指令重排序)。不保证:原子性。例如 `volatile int count; count++` 不是原子操作,在多线程下仍会丢失更新,因为 `count++` 是"读-改-写"三步操作,中间可能被其他线程打断。

**题 1.3**(应用) 写出一个使用 `Semaphore` 实现的简单限流器,允许每秒最多 100 个请求。

**参考答案要点**:

```java
Semaphore limiter = new Semaphore(100);
if (limiter.tryAcquire(1, TimeUnit.SECONDS)) {
    try { handle(); } finally { limiter.release(); }
}
```

注意 `release()` 必须在 `finally` 块中。本方案实际是"并发数 100"而非"速率 100/s",如需精确速率应使用 `RateLimiter` 或令牌桶。

### 10.2 进阶题

**题 2.1**(分析) 下列代码是否存在线程安全问题?若有,如何修复?

```java
public class Cache {
    private final Map<String, Data> map = new ConcurrentHashMap<>();
    public Data getOrLoad(String key) {
        Data data = map.get(key);
        if (data == null) {
            data = loadFromDb(key);
            map.put(key, data);
        }
        return data;
    }
}
```

**参考答案要点**:

存在。`get` 与 `put` 各自原子,但组合不原子。两个线程同时进入 `if (data == null)`,会重复调用 `loadFromDb`,浪费资源;若 `loadFromDb` 有副作用则更危险。

修复方案:

```java
map.computeIfAbsent(key, this::loadFromDb);
```

注意 `computeIfAbsent` 在 Java 8 中存在性能问题(锁住整个桶期间阻塞其他线程),Java 9+ 已优化。若 `loadFromDb` 慢,可考虑双层缓存或 `Future` 占位。

**题 2.2**(分析) `ReentrantLock` 公平锁与非公平锁在吞吐量上的差异通常有多少?为什么?

**参考答案要点**:

非公平锁吞吐量通常比公平锁高 5-10 倍。原因:公平锁要求按 FIFO 顺序唤醒,被唤醒的线程可能尚未在 CPU 缓存中,导致上下文切换开销大;非公平锁允许"插队",刚释放锁的线程可能立即重获锁,缓存命中率高。

但公平锁能避免线程饥饿,在严格公平要求场景(如交易系统)必须使用。

**题 2.3**(应用) 使用 `CompletableFuture` 编写一个流水线:先调用 `fetchUser` 获取用户,再根据用户 ID 调用 `fetchOrders` 获取订单列表,最后将用户与订单聚合成 `UserWithOrders`。任一步骤失败返回 `null`。

**参考答案要点**:

```java
CompletableFuture<UserWithOrders> f = CompletableFuture
    .supplyAsync(this::fetchUser, pool)
    .thenApplyAsync(user -> new UserWithOrders(user, fetchOrders(user.getId())), pool)
    .exceptionally(ex -> null);
```

或更易读的链式:

```java
CompletableFuture.supplyAsync(this::fetchUser, pool)
    .thenComposeAsync(user ->
        CompletableFuture.supplyAsync(() ->
            new UserWithOrders(user, fetchOrders(user.getId())), pool))
    .exceptionally(ex -> null);
```

`thenCompose` 用于扁平化嵌套 `CompletableFuture<CompletableFuture<T>>`。

### 10.3 挑战题

**题 3.1**(创造) 设计一个支持优先级与超时的异步任务调度器,要求:(1) 高优先级任务先执行;(2) 任务超时自动取消;(3) 支持任务依赖(A 完成后才能执行 B)。给出核心数据结构、调度算法、伪代码。

**参考答案要点**:

数据结构:
- 优先级队列 `PriorityBlockingQueue<ScheduledTask>`,按优先级与提交时间排序。
- 依赖图 `Map<TaskId, Set<TaskId>>`,记录等待者。
- `Map<TaskId, CompletableFuture<?>>` 记录任务 Future,用于依赖触发。

调度算法:
1. 提交任务时,若所有依赖已完成则入队,否则加入依赖等待表。
2. 工作线程从队列取出任务,执行 `Future.orTimeout()`。
3. 任务完成时,扫描依赖等待表,将所有依赖该任务的任务检查是否可入队。
4. 超时任务通过 `Future.cancel(true)` 中断。

伪代码:

```java
class PriorityScheduler {
    private final PriorityBlockingQueue<Task> queue;
    private final Map<String, Set<Task>> waiting;
    private final Map<String, CompletableFuture<?>> futures;
    private final ExecutorService workers;

    public CompletableFuture<?> submit(Task t) {
        CompletableFuture<?> f = new CompletableFuture<>();
        futures.put(t.id, f);
        if (dependenciesReady(t)) {
            queue.offer(t);
        } else {
            t.deps.forEach(dep -> waiting.computeIfAbsent(dep, k -> new HashSet<>()).add(t));
        }
        return f.orTimeout(t.timeoutMs, MILLISECONDS);
    }

    // worker loop
    void run() {
        while (!stopped) {
            Task t = queue.take();
            workers.submit(() -> {
                try {
                    Object r = t.run();
                    futures.get(t.id).complete(r);
                } catch (Throwable ex) {
                    futures.get(t.id).completeExceptionally(ex);
                }
                // 触发依赖者
                waiting.getOrDefault(t.id, Set.of()).forEach(this::tryEnqueue);
            });
        }
    }
}
```

**题 3.2**(评价) 在微服务架构下,单机 `Semaphore` 限流无法满足多实例场景。请评价三种分布式限流方案的优劣:Redis+Lua 计数器、Redis 令牌桶、令牌桶网关(如 Sentinel、Spring Cloud Gateway)。

**参考答案要点**:

| 维度 | Redis+Lua 计数器 | Redis 令牌桶 | 令牌桶网关 |
| ---- | ---------------- | ------------ | ---------- |
| 精度 | 高(原子脚本) | 高 | 高 |
| 性能 | 中(每请求 Redis) | 中 | 高(本地预取) |
| 复杂度 | 低 | 中 | 高 |
| 多维度限流 | 难 | 难 | 易(规则引擎) |
| 故障容忍 | Redis 宕机限流失效 | 同上 | 客户端本地兜底 |
| 维护成本 | 低 | 中 | 高 |

推荐:中小规模用 Redis 令牌桶(简单可靠),大规模用 Sentinel(多维度+本地预取+熔断降级一体化)。

**题 3.3**(创造) 基于 `ForkJoinPool` 实现一个并行归并排序,要求充分利用工作窃取特性。给出核心代码并分析理论加速比。

**参考答案要点**:

```java
class MergeSortTask extends RecursiveAction {
    private final int[] arr;
    private final int lo, hi;
    private static final int THRESHOLD = 1024;

    MergeSortTask(int[] arr, int lo, int hi) {
        this.arr = arr; this.lo = lo; this.hi = hi;
    }

    @Override
    protected void compute() {
        if (hi - lo <= THRESHOLD) {
            Arrays.sort(arr, lo, hi);
            return;
        }
        int mid = (lo + hi) >>> 1;
        invokeAll(new MergeSortTask(arr, lo, mid),
                  new MergeSortTask(arr, mid, hi));
        merge(arr, lo, mid, hi);
    }

    private void merge(int[] arr, int lo, int mid, int hi) {
        int[] tmp = Arrays.copyOfRange(arr, lo, mid);
        int i = 0, j = mid, k = lo;
        while (i < tmp.length && j < hi) {
            arr[k++] = tmp[i] <= arr[j] ? tmp[i++] : arr[j++];
        }
        while (i < tmp.length) arr[k++] = tmp[i++];
    }
}
```

理论加速比:由 4.3 节推导,严格分治任务并行执行时间为 $O(n \log n / P + P \log P)$,加速比约 $P$(理想情况)。实际受 merge 串行部分与 GC 影响,典型加速比 0.6P~0.8P。

---

## 十一、参考文献

[1] Lea, D. 2000. *A Java fork/join framework.* In Proceedings of the ACM 2000 Java Grande Conference (JAVA '00). ACM, New York, NY, USA, 36-43. DOI: https://doi.org/10.1145/337449.337465

[2] Goetz, B., Peierls, T., Bloch, J., Bowbeer, J., Holmes, D., and Lea, D. 2006. *Java Concurrency in Practice.* Addison-Wesley Professional, Boston, MA, USA. ISBN: 978-0321349606.

[3] Blumofe, R. D. and Leiserson, C. E. 1999. *Scheduling multithreaded computations by work stealing.* Journal of the ACM 46, 5 (September 1999), 720-748. DOI: https://doi.org/10.1145/324133.324234

[4] Manson, J., Pugh, W., and Adve, S. V. 2005. *The Java memory model.* In Proceedings of the 32nd ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages (POPL '05). ACM, New York, NY, USA, 378-391. DOI: https://doi.org/10.1145/1040305.1040336

[5] Herlihy, M. and Shavit, N. 2012. *The Art of Multiprocessor Programming, Revised Reprint* (2nd. ed.). Morgan Kaufmann, Burlington, MA, USA. ISBN: 978-0123973375.

[6] Oracle Corporation. 2024. *Java SE 21 API Specification: java.util.concurrent.* Retrieved July 21, 2026 from https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html

[7] Pressler, R. 2023. *JEP 444: Virtual Threads.* Oracle Corporation. Retrieved July 21, 2026 from https://openjdk.org/jeps/444

[8] Adya, A., Howell, J., Theimer, M., Bolosky, W. J., and Douceur, J. R. 2002. *Coordinating client synchronization.* In Proceedings of the 16th International Symposium on Distributed Computing (DISC '02). Springer, Berlin, Germany, 30-44. DOI: https://doi.org/10.1007/3-540-45741-8_3

[9] Fraser, K. and Harris, T. 2007. *Concurrent programming without locks.* ACM Transactions on Computer Systems 25, 2 (May 2007), Article 5, 1-61. DOI: https://doi.org/10.1145/1233307.1233309

[10] Michael, M. M. and Scott, M. L. 1996. *Simple, fast, and practical non-blocking and blocking concurrent queue algorithms.* In Proceedings of the 15th Annual ACM Symposium on Principles of Distributed Computing (PODC '96). ACM, New York, NY, USA, 267-275. DOI: https://doi.org/10.1145/248052.248106

---

## 十二、延伸阅读

### 12.1 经典书籍

- Brian Goetz 等. *Java Concurrency in Practice*. Addison-Wesley, 2006. — JUC 圣经,虽基于 Java 6 但核心理论至今适用。
- Doug Lea. *Concurrent Programming in Java* (2nd Edition). Addison-Wesley, 1999. — JUC 作者本人著作,理论深度高。
- Maurice Herlihy, Nir Shavit. *The Art of Multiprocessor Programming* (2nd Edition). Morgan Kaufmann, 2020. — 无锁数据结构与共识算法权威教材。
- Jeff Preshing. *Volatile: Almost a Memory Barrier*. https://preshing.com — 内存屏障系列博客,深入理解 JMM。

### 12.2 JEP 与规范

- JEP 444: Virtual Threads (Java 21). https://openjdk.org/jeps/444
- JEP 453: Structured Concurrency (Preview). https://openjdk.org/jeps/453
- JEP 462: Structured Concurrency (Second Preview). https://openjdk.org/jeps/462
- JSR 133: Java Memory Model and Thread Specification. https://www.jcp.org/en/jsr/detail?id=133
- JEP 491: Synchronize Virtual Threads without Pinning. https://openjdk.org/jeps/491

### 12.3 进阶主题

- **结构化并发(Structured Concurrency)**: Java 21+ 引入的 `StructuredTaskScope`,替代 `CompletableFuture` 的"非结构化"模式,使并发任务的生命周期与代码块绑定。
- **Scoped Values**: 替代 `ThreadLocal`,适用于虚拟线程场景下的上下文传递。
- **Reactive Streams 与 Flow API**: JDK 9 引入的反应式编程标准,与 Project Reactor、RxJava 互操作。
- **Project Loom**: 虚拟线程、结构化并发、Scoped Values 的统称,是 Java 并发未来 5 年的主要演进方向。

### 12.4 实战工具

- **JMeter**: 线程池与异步接口压测。
- **arthas**: 阿里开源的 Java 诊断工具,可在线查看线程池状态、检测死锁。
- **async-profiler**: 低开销火焰图工具,定位并发性能瓶颈。
- **JFR (Java Flight Recorder)**: JDK 内置的性能采集工具,记录锁竞争、GC、IO 等。

### 12.5 关键源码阅读路径

建议按以下顺序阅读 JUC 源码,从易到难:

1. `java.util.concurrent.atomic.AtomicInteger` — CAS 入门。
2. `java.util.concurrent.locks.ReentrantLock` 与 `AbstractQueuedSynchronizer` — AQS 模板。
3. `java.util.concurrent.ThreadPoolExecutor` — 线程池实现。
4. `java.util.concurrent.ConcurrentHashMap` — 高并发 Map。
5. `java.util.concurrent.CompletableFuture` — 异步编排。
6. `java.util.concurrent.ForkJoinPool` — 工作窃取调度器。
7. `java.lang.VirtualThread` — 虚拟线程实现。

每读一个源码,建议配合一份注释导读,推荐 GitHub 上的 `java-concurrency` 注释项目,如 `https://github.com/CodeBrickie/java-concurrency-notes`。

---

## 附录 A:术语速查表

| 术语 | 全称 | 含义 |
| ---- | ---- | ---- |
| JUC | java.util.concurrent | Java 并发包 |
| AQS | AbstractQueuedSynchronizer | 抽象队列同步器,JUC 锁的基础 |
| CAS | Compare-And-Swap | 比较并交换,无锁原语 |
| JMM | Java Memory Model | Java 内存模型 |
| FIFO | First In First Out | 先进先出 |
| LIFO | Last In First Out | 后进先出 |
| HB | Happens-Before | 先行发生关系 |
| DCL | Double-Checked Locking | 双重检查锁定 |
| OOM | Out Of Memory | 内存溢出 |
| API | Application Programming Interface | 应用程序接口 |
| TPS | Transactions Per Second | 每秒事务数 |
| QPS | Queries Per Second | 每秒查询数 |
| P99 | 99th Percentile | 99 分位延迟 |

## 附录 B:JUC 演进时间线

| JDK 版本 | 发布年份 | JUC 关键特性 |
| -------- | -------- | ------------ |
| 5.0 | 2004 | JUC 包正式发布,引入 Lock、并发集合、原子类、Executor |
| 6 | 2006 | NavigableMap、ConcurrentSkipListMap |
| 7 | 2011 | Fork/Join 框架、TransferQueue |
| 8 | 2014 | CompletableFuture、StampedLock、LongAdder、ConcurrentHashMap 重写 |
| 9 | 2017 | Flow API(Reactive Streams)、VarHandle |
| 10-11 | 2018 | CompletableFuture 超时 API |
| 17 | 2021 | LTS 版本,sealed class 正式,为模式匹配铺路 |
| 19-20 | 2022 | 虚拟线程预览 |
| 21 | 2023 | 虚拟线程正式、结构化并发预览 |
| 22-23 | 2024 | 结构化并发、Scoped Values 持续迭代 |

## 附录 C:推荐学习路径

针对不同读者群体,推荐以下学习路径。

### C.1 初学者路径(0-1 年经验)

1. 学习 `Thread`、`Runnable`、`synchronized`、`wait/notify` 基础。
2. 阅读《Java Concurrency in Practice》前 5 章。
3. 实践 `ExecutorService`、`ThreadPoolExecutor` 基本用法。
4. 完成 LeetCode 并发专题 20 题。

### C.2 中级路径(1-3 年经验)

1. 深入 `AQS`、`ReentrantLock`、`Condition` 源码。
2. 掌握 `ConcurrentHashMap`、`BlockingQueue` 实现原理。
3. 学习 JMM、`volatile`、happens-before。
4. 实践 `CompletableFuture` 异步编排。
5. 阅读 `ForkJoinPool` 工作窃取算法。

### C.3 高级路径(3+ 年经验)

1. 研究 `VarHandle`、内存屏障与硬件一致性协议。
2. 学习无锁数据结构(Michael-Scott 队列、Harris 链表)。
3. 实践虚拟线程、结构化并发。
4. 阅读最新 JEP 与论文(JEP 444/453/491 等)。
5. 在生产系统设计高并发架构(限流、熔断、降级、隔离)。

## 附录 D:常见问题速查

### D.1 何时使用 `synchronized` vs `ReentrantLock`?

优先 `synchronized`(JVM 优化充分,语法简洁,自动释放)。需要可中断、超时、多 Condition、公平锁时使用 `ReentrantLock`。

### D.2 `ConcurrentHashMap` 能否存 null?

不能。Java 8+ 的 `ConcurrentHashMap` 不允许 null key 与 null value,原因是 null 在 `get` 时无法区分"不存在"与"值为 null"(ambiguous),在并发场景下可能导致误判。`HashMap` 单线程下可以,因为可用 `containsKey` 二次检查。

### D.3 `ThreadLocal` 何时使用?

仅在以下场景使用:(1) 每线程独立上下文(如 `SecurityContextHolder`);(2) 避免参数透传(如 `MDC` 日志上下文);(3) 线程局部缓存。虚拟线程场景优先考虑 Scoped Values。

### D.4 `parallelStream` 何时安全?

满足以下条件之一:(1) 数据源足够大(>1000 元素);(2) 单元素操作 CPU 密集;(3) 不阻塞 IO。否则串流更优。

### D.5 虚拟线程何时使用?

I/O 密集场景(数据库、HTTP 调用)优先虚拟线程;CPU 密集场景仍用平台线程;`synchronized` 持有期间阻塞 IO 会 pin 载体线程,改用 `ReentrantLock`。

## 附录 E:JUC 与其他语言并发模型对比

| 维度 | Java JUC | Go goroutine | Rust tokio | Kotlin coroutines |
| ---- | -------- | ------------ | ---------- | ----------------- |
| 抽象层级 | 线程池+异步 | 协程+channel | Future+async/await | 协程+Flow |
| 调度 | 抢占式(平台线程)+ 协作式(虚拟线程) | 协作式(GMP) | 协作式 | 协作式 |
| 内存模型 | JMM(happens-before) | Go Memory Model | Rust Memory Model | 同 JVM |
| 通信 | 共享内存为主 | CSP(channel)为主 | 共享内存+channel | 共享内存+channel |
| 错误处理 | 异常 | panic/error | Result 类型 | 异常 |
| 学习曲线 | 中-高 | 中 | 高 | 中 |

Java JUC 的优势:与 JVM 生态深度集成、API 成熟稳定、企业级支持完善。劣势:API 复杂度高、虚拟线程仍在演进中。Go 的优势:语言级原生支持、channel 模式优雅。Rust 的优势:零成本抽象、内存安全无 GC。Kotlin 协程优势:与 Java 互操作、语法简洁。

## 附录 F:并发性能基准测试参考

以下为 8 核 16GB 内存环境下的典型基准测试结果(仅供参考)。

### F.1 计数器性能

| 方案 | 100 线程 × 100 万次 | 吞吐量 |
| ---- | ------------------- | ------ |
| synchronized | 8500ms | 11.7M ops/s |
| AtomicLong | 6200ms | 16.1M ops/s |
| LongAdder | 1200ms | 83.3M ops/s |

### F.2 Map 性能(100 线程并发 put/get)

| 方案 | put QPS | get QPS | P99 延迟 |
| ---- | ------- | ------- | -------- |
| HashMap + synchronized | 2.1M | 4.5M | 25μs |
| Collections.synchronizedMap | 1.8M | 3.2M | 35μs |
| ConcurrentHashMap(JDK 8) | 8.5M | 18.2M | 8μs |
| ConcurrentSkipListMap | 3.2M | 6.1M | 15μs |

### F.3 锁性能(高竞争场景)

| 方案 | 100 线程争用吞吐 |
| ---- | --------------- |
| synchronized | 9.5M ops/s |
| ReentrantLock(非公平) | 9.2M ops/s |
| ReentrantLock(公平) | 1.8M ops/s |
| StampedLock(乐观读) | 28M ops/s |

注:基准测试结果高度依赖硬件、JDK 版本、负载特征,本表仅说明相对关系,实际请自行压测。

---

本文系统覆盖了 `java.util.concurrent` 的核心组件、底层原理、工程实践与案例研究。建议读者结合源码阅读与生产实践反复对照,逐步形成对 JUC 的体系化认知。下一篇 [Java 反射](./Java反射.md) 将介绍 Java 反射机制与动态代理的实现原理。
