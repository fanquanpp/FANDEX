---
order: 52
title: 并发编程基础
module: java
category: Java
difficulty: intermediate
description: 线程、锁与并发工具
author: fanquanpp
updated: '2026-06-14'
related:
  - java/枚举与注解
  - java/泛型进阶
  - java/JUC并发包
  - java/JVM类加载机制
prerequisites:
  - java/概述与开发环境
---

## 学习目标

完成本文学习后,读者应能够在以下 Bloom 认知层级上达成对应目标:

- **记忆(Memory)**:复述 Java 线程的六种状态及其转换条件;列举 `synchronized` 与 `Lock` 的核心 API;说出 `volatile` 关键字的三大语义。
- **理解(Understand)**:解释 Java 内存模型(JMM)的主内存与工作内存抽象;阐述 happens-before 规则如何保证可见性;说明 wait/notify 机制为什么必须持有对象锁。
- **应用(Apply)**:使用 `Thread`、`Runnable`、`Callable` 三种方式创建线程;运用 `synchronized` 与 `ReentrantLock` 实现临界区互斥;通过 `CountDownLatch`、`CyclicBarrier`、`Semaphore` 协调多线程协作。
- **分析(Analyze)**:对比内置锁与显式锁在公平性、可中断性、条件变量数量上的差异;剖析死锁产生的四个必要条件并定位线程转储中的死锁链。
- **评价(Evaluate)**:判断给定并发场景应选择何种同步策略(乐观/悲观、粗粒度/细粒度);评估 `volatile` 是否足以替代锁;权衡线程池参数的合理取值。
- **创造(Create)**:设计基于生产者-消费者模式的并发流水线;实现自定义的同步工具(如线程安全的 LRU 缓存);编写可回归复现的并发测试用例。

## 历史动机与背景

### 单核时代的并发

1960 年代,多道程序设计(multiprogramming)在单核处理器上通过时间片轮转实现"并发"假象。操作系统通过中断驱动上下文切换,让多个程序在逻辑上"同时"推进。Java 在 1995 年诞生时即内置多线程支持,其 `java.lang.Thread` 类直接映射到操作系统的原生线程(1:1 模型)。

### 多核时代的挑战

2005 年前后,主频提升遭遇功耗墙(power wall),CPU 厂商转向多核架构。Herb Sutter 在 2005 年发表的《The Free Lunch Is Over》一文宣告"免费午餐"终结:开发者不能再依靠主频提升获得性能增长,必须通过并发编程榨取多核红利。这直接推动了 Java 5(2004)引入 `java.util.concurrent`(JUC)并发包,由 Doug Lea 主导设计。

### 并发错误的高昂代价

并发 bug 具有不可重现、难以诊断、生产环境才暴露三大特征。著名案例包括:

- **Therac-25 医疗辐射事故(1986)**:软件竞态条件导致患者接受超剂量辐射,造成多人死亡。
- **2003 年北美大停电**:竞态条件使告警系统失效,连锁反应导致 5500 万人断电。
- **Knight Capital 4.5 亿美元亏损(2012)**:部署过程中未激活的"死代码"被并发激活,45 分钟内亏损公司净资产。

这些教训说明:并发编程不是"能跑就行"的技能,而是需要严谨理论与工程纪律的专业领域。

### Java 并发的演进

| 版本 | 年份 | 关键特性 | 意义 |
| --- | --- | --- | --- |
| Java 1.0 | 1996 | `Thread`、`Runnable`、`synchronized`、`wait/notify` | 基础并发原语 |
| Java 1.5 | 2004 | JUC 包、`Lock`、`Atomic`、`ThreadPoolExecutor`、`ConcurrentHashMap` | 工业级并发工具 |
| Java 1.6 | 2006 | 偏向锁、轻量级锁、锁消除 | `synchronized` 性能优化 |
| Java 1.7 | 2011 | `ForkJoinPool`、`TransferQueue` | 分治并行 |
| Java 1.8 | 2014 | `CompletableFuture`、`StampedLock` | 异步编程与乐观读 |
| Java 9 | 2017 | `Flow` API(响应式)、`VarHandle` | 响应式标准与细粒度内存访问 |
| Java 19 | 2022 | 虚拟线程(预览) | 百万级轻量级并发 |
| Java 21 | 2023 | 虚拟线程正式版、序列集合 | 结构化并发落地 |

## 形式化定义

### 并发与并行的数学刻画

设 $T = \{t_1, t_2, \ldots, t_n\}$ 为线程集合,$I_k = [s_k, e_k)$ 为线程 $t_k$ 的执行时间区间。定义:

- **并发(Concurrency)**:$\exists i, j, i \neq j$,使得 $I_i \cap I_j \neq \emptyset$(区间重叠)。并发是逻辑上的同时性,可通过时间片分时实现。
- **并行(Parallelism)**:存在物理上独立的处理单元 $P = \{p_1, \ldots, p_m\}$,使得 $|P| \geq 2$ 且至少两个线程在不同处理单元上严格同时执行。并行是物理上的同时性。

形式化地,并行 $\Rightarrow$ 并发,但并发 $\not\Rightarrow$ 并行。

### 线程状态机

Java 线程状态可形式化为六元组有限状态机 $M = (S, \Sigma, \delta, s_0, F)$:

- 状态集 $S = \{\text{NEW}, \text{RUNNABLE}, \text{BLOCKED}, \text{WAITING}, \text{TIMED\_WAITING}, \text{TERMINATED}\}$
- 事件集 $\Sigma = \{\text{start}, \text{run, block, notify, wait, sleep, join, interrupt, complete, ...}\}$
- 初始状态 $s_0 = \text{NEW}$
- 终止状态 $F = \{\text{TERMINATED}\}$
- 转移函数 $\delta: S \times \Sigma \rightarrow S$

状态转移关系:

$$
\begin{aligned}
\delta(\text{NEW}, \text{start}) &= \text{RUNNABLE} \\
\delta(\text{RUNNABLE}, \text{block}) &= \text{BLOCKED} \\
\delta(\text{BLOCKED}, \text{acquire}) &= \text{RUNNABLE} \\
\delta(\text{RUNNABLE}, \text{wait}) &= \text{WAITING} \\
\delta(\text{WAITING}, \text{notify}) &= \text{BLOCKED} \\
\delta(\text{RUNNABLE}, \text{sleep}) &= \text{TIMED\_WAITING} \\
\delta(\text{TIMED\_WAITING}, \text{timeout}) &= \text{RUNNABLE} \\
\delta(\text{RUNNABLE}, \text{complete}) &= \text{TERMINATED}
\end{aligned}
$$

### Java 内存模型(JMM)

JMM 定义了线程与主内存之间的抽象关系。设 $M$ 为主内存,$W_i$ 为线程 $i$ 的工作内存,$V$ 为共享变量集合。JMM 规定:

$$
\forall v \in V, \forall i: \quad v \in M \xrightarrow{\text{read}} W_i \xrightarrow{\text{write}} v' \in M
$$

线程不能直接操作主内存,必须经过工作内存的 read-load-use-assign-store-write 六步操作序列。

### happens-before 关系

happens-before 是 JMM 的核心偏序关系 $\xrightarrow{hb}$,满足:

- **自反性**:$a \xrightarrow{hb} a$(单线程内程序顺序)
- **传递性**:若 $a \xrightarrow{hb} b$ 且 $b \xrightarrow{hb} c$,则 $a \xrightarrow{hb} c$
- **偏序性**:并非任意两操作都可比较

关键规则:

$$
\begin{aligned}
&\text{程序顺序规则}: \text{同一线程内 } a \text{ 先于 } b \Rightarrow a \xrightarrow{hb} b \\
&\text{监视器锁规则}: \text{unlock}(m) \xrightarrow{hb} \text{lock}(m) \\
&\text{volatile 规则}: \text{write}(v) \xrightarrow{hb} \text{read}(v) \\
&\text{线程启动规则}: \text{Thread.start()} \xrightarrow{hb} \text{run}() \\
&\text{线程终止规则}: \text{run}() \xrightarrow{hb} \text{Thread.join()}\text{ 返回} \\
&\text{传递性}: a \xrightarrow{hb} b \wedge b \xrightarrow{hb} c \Rightarrow a \xrightarrow{hb} c
\end{aligned}
$$

若 $a \xrightarrow{hb} b$,则 $a$ 的结果对 $b$ 可见,且 $a$ 的重排序不会破坏 $b$ 的语义。

### 临界区与互斥

临界区(critical section)是访问共享资源的代码片段。互斥(mutex)要求:

$$
\forall t_i, t_j \in T, i \neq j: \neg \text{InCrit}(t_i) \vee \neg \text{InCrit}(t_j)
$$

即任意时刻至多一个线程处于临界区。Java 通过 `synchronized` 关键字或 `Lock` 实现互斥。

### 线程安全的定义

Brian Goetz 在《Java Concurrency in Practice》中给出经典定义:一个类是线程安全的,当且仅当在多线程环境下被调用时,其行为仍然正确,无需调用方额外同步。形式化地:

$$
\text{ThreadSafe}(C) \iff \forall \text{schedule } \sigma: \text{Obs}(C, \sigma) = \text{Obs}(C, \sigma_{\text{seq}})
$$

其中 $\sigma$ 是任意线程调度,$\sigma_{\text{seq}}$ 是某个等价的顺序调度,Obs 表示可观察行为。

## 理论推导

### 可见性问题的根源

考虑以下经典示例:

```java
// 线程 A
while (!stop) {
    // do work
}

// 线程 B
stop = true;
```

在没有同步的情况下,线程 A 可能永远看不到 `stop` 变为 `true`。这是因为:

1. JIT 编译器可能将 `stop` 提升到寄存器,只读一次。
2. 线程 B 的写入可能停留在工作内存(寄存器或 CPU 缓存),未刷新到主内存。
3. 即使刷新,线程 A 的缓存行可能未失效。

`volatile` 关键字通过强制 read/write 直接穿透到主内存并触发缓存一致性协议(MESI)解决此问题。

### 指令重排序的数学表示

编译器、JIT、CPU 都可能重排指令以提高性能。重排序必须保持单线程语义(as-if-serial),但会破坏多线程语义。设原始指令序列为 $I = (i_1, i_2, \ldots, i_n)$,重排后为 $I' = (i_{\pi(1)}, i_{\pi(2)}, \ldots, i_{\pi(n)})$,其中 $\pi$ 是排列。as-if-serial 要求:

$$
\forall \text{single-thread input } x: \text{Result}(I, x) = \text{Result}(I', x)
$$

但多线程下,不同线程的重排序相互可见,可能导致数据竞争(data race)。

### happens-before 保证可见性的推导

定理:若 $a \xrightarrow{hb} b$,则 $a$ 的写入对 $b$ 可见。

证明思路:JMM 规定,一个操作的内存效果只有在满足 happens-before 链时才对后续操作可见。具体地:

1. $a$ 执行 write 操作,将值 $v$ 写入主内存或工作内存。
2. 通过 happens-before 链,$a$ 的 write 与 $b$ 的 read 之间建立了偏序关系。
3. JMM 保证 $b$ 读取到的值至少是 $a$ 写入的 $v$(可能还有更晚的写入)。

因此,通过 `volatile`、`synchronized`、`final` 等机制建立 happens-before 关系,是保证可见性的标准手段。

### 死锁的四个必要条件

Coffman 于 1971 年提出死锁的四个必要条件,全部满足才会发生死锁:

1. **互斥(Mutual Exclusion)**:资源同一时刻只能被一个线程占用。
2. **占有并等待(Hold and Wait)**:线程持有至少一个资源并等待获取新资源。
3. **不可剥夺(No Preemption)**:资源只能由持有者主动释放,不能被强制剥夺。
4. **循环等待(Circular Wait)**:存在线程等待链 $\{t_1 \to t_2 \to \ldots \to t_n \to t_1\}$。

破坏任一条件即可预防死锁。最常用的是破坏循环等待:为所有锁定义全局顺序,线程必须按顺序获取。

### Peterson 算法的正确性

Peterson 算法是两线程互斥的经典软件解法,其正确性可形式化证明:

```java
// 共享变量
volatile boolean[] flag = new boolean[2];
volatile int turn;

// 线程 i (i = 0 或 1, j = 1 - i)
void lock(int i) {
    int j = 1 - i;
    flag[i] = true;   // 声明想进入
    turn = j;          // 让对方先
    while (flag[j] && turn == j) {
        // 等待
    }
    // 临界区
}

void unlock(int i) {
    flag[i] = false;
}
```

正确性证明(互斥性):

反证法。假设两线程同时处于临界区。则两者都通过了 while 循环,意味着:

- 线程 0 通过:$\neg \text{flag}[1] \vee \text{turn} \neq 1$,即 $\text{turn} = 0$。
- 线程 1 通过:$\neg \text{flag}[0] \vee \text{turn} \neq 0$,即 $\text{turn} = 1$。

但 `turn` 是单一变量,不可能同时为 0 和 1,矛盾。故互斥成立。

注意:Java 中必须使用 `volatile` 防止重排序,否则算法失效。这体现了 JMM 对算法正确性的影响。

### Amdahl 定律与并发加速比

Amdahl 定律量化并行计算的加速上限。设程序中可并行部分占比为 $p$,处理器数为 $n$,则加速比:

$$
S(n) = \frac{1}{(1 - p) + \frac{p}{n}}
$$

当 $n \to \infty$ 时,$S \to \frac{1}{1 - p}$。即串行部分 $(1-p)$ 是加速比的硬上限。例如,若 20% 代码必须串行,则最大加速比为 $1/0.2 = 5$ 倍。

推论:优化并发程序时,应优先减少串行部分占比,而非单纯增加线程数。

## 代码示例

### 示例 1:线程创建的三种方式

```java
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.FutureTask;

/**
 * 演示 Java 创建线程的三种标准方式
 * 方式一:继承 Thread 类
 * 方式二:实现 Runnable 接口
 * 方式三:实现 Callable 接口(带返回值)
 */
public class ThreadCreationDemo {

    // 方式一:继承 Thread 类
    // 优点:简单直接;缺点:Java 单继承,无法再继承其他类
    static class MyThread extends Thread {
        @Override
        public void run() {
            System.out.println("方式一:继承 Thread - " + Thread.currentThread().getName());
        }
    }

    // 方式二:实现 Runnable 接口
    // 优点:可继承其他类,资源复用;推荐方式
    static class MyRunnable implements Runnable {
        @Override
        public void run() {
            System.out.println("方式二:实现 Runnable - " + Thread.currentThread().getName());
        }
    }

    // 方式三:实现 Callable 接口
    // 优点:有返回值且可抛出受检异常
    static class MyCallable implements Callable<String> {
        @Override
        public String call() throws Exception {
            Thread.sleep(100);
            return "方式三:Callable 返回结果 - " + Thread.currentThread().getName();
        }
    }

    public static void main(String[] args) throws ExecutionException, InterruptedException {
        // 方式一
        MyThread t1 = new MyThread();
        t1.start();

        // 方式二
        Thread t2 = new Thread(new MyRunnable());
        t2.start();

        // 方式三:需借助 FutureTask 包装
        FutureTask<String> futureTask = new FutureTask<>(new MyCallable());
        Thread t3 = new Thread(futureTask);
        t3.start();
        // get() 会阻塞直到任务完成
        String result = futureTask.get();
        System.out.println(result);

        // 方式四(Lambda 简化):函数式接口写法
        new Thread(() -> System.out.println("方式四:Lambda - " + Thread.currentThread().getName())).start();
    }
}
```

### 示例 2:synchronized 的三种用法

```java
/**
 * synchronized 关键字的三种使用方式及其锁粒度差异
 * 1. 同步实例方法:锁的是当前实例 this
 * 2. 同步静态方法:锁的是当前类的 Class 对象
 * 3. 同步代码块:锁的是指定对象,粒度最细
 */
public class SynchronizedDemo {

    private int count = 0;
    private final Object lock = new Object();

    // 方式一:同步实例方法,锁 this
    public synchronized void incrementMethod() {
        count++;
    }

    // 方式二:同步代码块,锁指定对象
    public void incrementBlock() {
        synchronized (lock) {
            count++;
        }
    }

    // 方式三:同步静态方法,锁 Class 对象
    public synchronized static void staticMethod() {
        // 类级别互斥,所有实例共享
    }

    // 细粒度优化:不同字段使用不同锁,减少竞争
    private int a = 0, b = 0;
    private final Object lockA = new Object();
    private final Object lockB = new Object();

    public void incA() {
        synchronized (lockA) { a++; }
    }

    public void incB() {
        synchronized (lockB) { b++; }
    }
}
```

### 示例 3:生产者-消费者模式

```java
import java.util.LinkedList;
import java.util.Queue;

/**
 * 经典生产者-消费者模式
 * 使用 wait/notify 实现线程间协作
 * 关键点:
 *   1. wait/notify 必须在 synchronized 块内调用
 *   2. 使用 while 循环检查条件(防止虚假唤醒)
 *   3. notifyAll 优于 notify(避免信号丢失)
 */
public class ProducerConsumerDemo {

    private static final int MAX_SIZE = 10;
    private final Queue<Integer> buffer = new LinkedList<>();

    // 生产者
    public synchronized void produce(int value) throws InterruptedException {
        // while 循环防止虚假唤醒(spurious wakeup)
        while (buffer.size() == MAX_SIZE) {
            // 缓冲区满,释放锁并等待
            wait();
        }
        buffer.offer(value);
        System.out.println("生产: " + value + ", 队列大小: " + buffer.size());
        // 唤醒所有等待的消费者
        notifyAll();
    }

    // 消费者
    public synchronized void consume() throws InterruptedException {
        while (buffer.isEmpty()) {
            // 缓冲区空,释放锁并等待
            wait();
        }
        int value = buffer.poll();
        System.out.println("消费: " + value + ", 队列大小: " + buffer.size());
        // 唤醒所有等待的生产者
        notifyAll();
    }

    public static void main(String[] args) {
        ProducerConsumerDemo demo = new ProducerConsumerDemo();

        // 启动生产者线程
        new Thread(() -> {
            for (int i = 0; i < 100; i++) {
                try {
                    demo.produce(i);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }).start();

        // 启动消费者线程
        new Thread(() -> {
            for (int i = 0; i < 100; i++) {
                try {
                    demo.consume();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }).start();
    }
}
```

### 示例 4:ReentrantLock 与 Condition

```java
import java.util.concurrent.locks.Condition;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

/**
 * 使用 ReentrantLock + Condition 实现生产者-消费者
 * 相比 wait/notify 的优势:
 *   1. 支持多个条件变量(队列非满、队列非空分开等待)
 *   2. 支持公平锁(按 FIFO 唤醒)
 *   3. 支持可中断、可超时、可尝试获取
 *   4. 必须在 finally 中释放锁
 */
public class LockConditionDemo {

    private final Lock lock = new ReentrantLock(true); // 公平锁
    private final Condition notFull = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();
    private final int[] buffer;
    private int count, putPtr, takePtr;

    public LockConditionDemo(int capacity) {
        this.buffer = new int[capacity];
    }

    public void put(int value) throws InterruptedException {
        lock.lock();
        try {
            while (count == buffer.length) {
                notFull.await(); // 队列满,在 notFull 条件上等待
            }
            buffer[putPtr] = value;
            if (++putPtr == buffer.length) putPtr = 0;
            count++;
            notEmpty.signal(); // 唤醒一个等待 notEmpty 的消费者
        } finally {
            lock.unlock(); // 必须在 finally 中释放
        }
    }

    public int take() throws InterruptedException {
        lock.lock();
        try {
            while (count == 0) {
                notEmpty.await();
            }
            int value = buffer[takePtr];
            if (++takePtr == buffer.length) takePtr = 0;
            count--;
            notFull.signal();
            return value;
        } finally {
            lock.unlock();
        }
    }
}
```

### 示例 5:volatile 保证可见性

```java
/**
 * volatile 关键字演示
 * 语义:
 *   1. 可见性:写入立即刷新到主内存,读取直接从主内存加载
 *   2. 有序性:禁止指令重排序(内存屏障)
 *   3. 不保证原子性:volatile++ 不是原子操作
 */
public class VolatileDemo {

    // 状态标志位,必须用 volatile
    private volatile boolean running = true;

    // 配置项,可能被其他线程更新
    private volatile String config = "default";

    public void stop() {
        running = false; // 写入 volatile 变量,触发内存屏障
    }

    public void worker() {
        // 如果不用 volatile,可能永远看不到 running 变为 false
        while (running) {
            // 执行工作
            doWork();
        }
        System.out.println("Worker 已停止");
    }

    private void doWork() {
        // 模拟工作
    }

    // 反例:volatile 不保证原子性
    private volatile int counter = 0;

    public void increment() {
        // counter++ 实际是三步:读、加、写
        // 多线程下仍会丢失更新,需要 AtomicInteger 或 synchronized
        counter++;
    }

    public static void main(String[] args) throws InterruptedException {
        VolatileDemo demo = new VolatileDemo();

        Thread worker = new Thread(demo::worker);
        worker.start();

        Thread.sleep(1000);
        demo.stop(); // 主线程修改 running,worker 能立即看到
        worker.join();
    }
}
```

### 示例 6:CountDownLatch 与 CyclicBarrier

```java
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.BrokenBarrierException;

/**
 * 倒计时门栓与循环屏障
 * CountDownLatch:一次性,等待 N 个事件完成
 * CyclicBarrier:可重用,等待 N 个线程都到达屏障点
 */
public class LatchBarrierDemo {

    // 场景一:主线程等待所有工作线程完成初始化
    static void countDownLatchExample() throws InterruptedException {
        final int N = 5;
        CountDownLatch readyLatch = new CountDownLatch(N);
        CountDownLatch startLatch = new CountDownLatch(1);

        for (int i = 0; i < N; i++) {
            final int workerId = i;
            new Thread(() -> {
                System.out.println("Worker " + workerId + " 准备就绪");
                readyLatch.countDown(); // 通知主线程
                try {
                    startLatch.await(); // 等待主线程发令
                    System.out.println("Worker " + workerId + " 开始工作");
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }).start();
        }

        readyLatch.await(); // 等待所有 worker 准备就绪
        System.out.println("所有 worker 已就绪,开始工作");
        startLatch.countDown(); // 发令
    }

    // 场景二:多线程分阶段计算,阶段间同步
    static void cyclicBarrierExample() {
        final int N = 3;
        // 所有线程到达屏障后执行的动作
        Runnable barrierAction = () -> System.out.println("=== 阶段完成,进入下一阶段 ===");

        CyclicBarrier barrier = new CyclicBarrier(N, barrierAction);

        for (int i = 0; i < N; i++) {
            final int phase = i;
            new Thread(() -> {
                try {
                    for (int p = 0; p < 3; p++) {
                        System.out.println("线程 " + phase + " 完成阶段 " + p);
                        barrier.await(); // 等待其他线程
                    }
                } catch (InterruptedException | BrokenBarrierException e) {
                    Thread.currentThread().interrupt();
                }
            }).start();
        }
    }
}
```

### 示例 7:线程池的使用

```java
import java.util.concurrent.*;

/**
 * 线程池的标准使用方式
 * 推荐:使用 ThreadPoolExecutor 显式构造,避免 Executors 工厂方法
 * 原因:Executors.newFixedThreadPool 使用无界队列,可能 OOM
 */
public class ThreadPoolDemo {

    public static void main(String[] args) {
        // 核心参数
        int corePoolSize = 4;      // 核心线程数
        int maxPoolSize = 16;      // 最大线程数
        long keepAliveTime = 60L;  // 空闲线程存活时间(秒)
        TimeUnit unit = TimeUnit.SECONDS;
        BlockingQueue<Runnable> workQueue = new ArrayBlockingQueue<>(100); // 有界队列
        ThreadFactory threadFactory = r -> {
            Thread t = new Thread(r);
            t.setName("custom-pool-" + t.getId());
            t.setUncaughtExceptionHandler((thread, ex) ->
                System.err.println("线程 " + thread.getName() + " 异常: " + ex));
            return t;
        };
        RejectedExecutionHandler handler = new ThreadPoolExecutor.CallerRunsPolicy();

        ThreadPoolExecutor executor = new ThreadPoolExecutor(
            corePoolSize, maxPoolSize, keepAliveTime, unit,
            workQueue, threadFactory, handler
        );

        // 提交任务
        for (int i = 0; i < 20; i++) {
            final int taskId = i;
            executor.submit(() -> {
                System.out.println("任务 " + taskId + " 由 " + Thread.currentThread().getName() + " 执行");
                try {
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        }

        // 优雅关闭
        executor.shutdown();
        try {
            if (!executor.awaitTermination(60, TimeUnit.SECONDS)) {
                executor.shutdownNow();
            }
        } catch (InterruptedException e) {
            executor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}
```

### 示例 8:死锁演示与诊断

```java
/**
 * 死锁演示与诊断
 * 运行后使用 jstack 或 jcmd 打印线程转储查看死锁
 */
public class DeadlockDemo {

    private static final Object lock1 = new Object();
    private static final Object lock2 = new Object();

    public static void main(String[] args) {
        // 线程 A:先锁 lock1,再请求 lock2
        new Thread(() -> {
            synchronized (lock1) {
                System.out.println("Thread-A 持有 lock1,请求 lock2");
                try { Thread.sleep(100); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                synchronized (lock2) {
                    System.out.println("Thread-A 获得两把锁");
                }
            }
        }, "Thread-A").start();

        // 线程 B:先锁 lock2,再请求 lock1 —— 循环等待
        new Thread(() -> {
            synchronized (lock2) {
                System.out.println("Thread-B 持有 lock2,请求 lock1");
                try { Thread.sleep(100); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                synchronized (lock1) {
                    System.out.println("Thread-B 获得两把锁");
                }
            }
        }, "Thread-B").start();

        // 诊断方法:
        // 1. jstack <pid> 查看 "Found one Java-level deadlock"
        // 2. jcmd <pid> Thread.print
        // 3. VisualVM 线程标签页
        // 4. Arthas thread -b 查找阻塞线程
    }
}
```

## 对比分析

### synchronized vs ReentrantLock

| 特性 | synchronized | ReentrantLock |
| --- | --- | --- |
| 语法 | 关键字,自动释放 | API,必须 finally 手动释放 |
| 公平性 | 非公平 | 可选公平/非公平 |
| 可中断 | 不可中断 | `lockInterruptibly()` 可中断 |
| 超时获取 | 不支持 | `tryLock(timeout)` 支持 |
| 条件变量 | 单个(wait/notify) | 多个 `Condition` |
| 锁状态查询 | 不支持 | `isLocked()`、`getHoldCount()` |
| 性能(JDK 6+) | 优化后接近 | 略优,差异不大 |
| 死锁检测 | 内置(jstack 可见) | 需工具辅助 |
| 适用场景 | 简单同步 | 高级功能需求 |

### 各种同步工具对比

| 工具 | 用途 | 一次性 | 关键方法 |
| --- | --- | --- | --- |
| `CountDownLatch` | 等待 N 个事件完成 | 是 | `countDown()`、`await()` |
| `CyclicBarrier` | N 个线程相互等待 | 否(可重用) | `await()` |
| `Semaphore` | 限制并发访问数 | 否 | `acquire()`、`release()` |
| `Phaser` | 多阶段同步 | 否 | `arrive()`、`awaitAdvance()` |
| `Exchanger` | 两线程交换数据 | 否 | `exchange()` |

### 线程创建方式对比

| 方式 | 返回值 | 异常 | 继承限制 | 推荐度 |
| --- | --- | --- | --- | --- |
| 继承 Thread | 无 | 不能抛受检异常 | 单继承 | 低 |
| 实现 Runnable | 无 | 不能抛受检异常 | 无 | 高 |
| 实现 Callable | 有 | 可抛受检异常 | 无 | 高 |
| Lambda | 无 | 不能抛受检异常 | 无 | 高(简短任务) |

### volatile vs synchronized

| 维度 | volatile | synchronized |
| --- | --- | --- |
| 可见性 | 保证 | 保证 |
| 原子性 | 不保证(单次读/写除外) | 保证 |
| 有序性 | 保证(禁止重排) | 保证 |
| 阻塞 | 不阻塞 | 可能阻塞 |
| 粒度 | 字段级 | 代码块/方法级 |
| 性能 | 低开销 | 较高开销 |
| 适用场景 | 状态标志、单次读写 | 复合操作、临界区 |

## 常见陷阱

### 陷阱 1:竞态条件(Race Condition)

```java
// 错误:count++ 不是原子操作
public class Counter {
    private int count = 0;
    public void increment() {
        count++; // 读-改-写三步,多线程下丢失更新
    }
}

// 正确方案一:synchronized
public synchronized void increment() { count++; }

// 正确方案二:AtomicInteger(无锁,性能更好)
private final AtomicInteger count = new AtomicInteger();
public void increment() { count.incrementAndGet(); }
```

### 陷阱 2:虚假唤醒(Spurious Wakeup)

```java
// 错误:使用 if 检查条件
synchronized (lock) {
    if (condition) {
        lock.wait(); // 可能在条件不满足时被唤醒
    }
}

// 正确:使用 while 循环
synchronized (lock) {
    while (condition) {
        lock.wait(); // 被唤醒后重新检查条件
    }
}
```

POSIX 标准允许 wait 在未被通知的情况下返回(虚假唤醒),Java 沿袭此行为,必须用 while 防御。

### 陷阱 3:锁对象不当

```java
// 错误一:使用 String 常量作为锁
synchronized ("lock") { ... } // 其他代码可能锁同一常量,造成意外阻塞

// 错误二:使用 Integer 缓存对象
Integer lock = Integer.valueOf(1);
synchronized (lock) { ... } // IntegerCache 使 -128~127 范围共享实例

// 错误三:使用可变字段
private Object lock = new Object();
public void method() {
    synchronized (lock) { ... }
    lock = new Object(); // 锁对象变了,失去互斥
}

// 正确:使用 final 专用锁对象
private final Object lock = new Object();
```

### 陷阱 4:在构造函数中启动线程(this 逃逸)

```java
// 错误:构造函数中启动线程,可能导致 this 逃逸
public class Widget {
    private int value;
    public Widget() {
        new Thread(() -> System.out.println(value)).start(); // value 可能还未初始化
        value = 42;
    }
}

// 正确:使用工厂方法或 init 方法
public class Widget {
    private int value;
    private Widget() {}
    public static Widget create() {
        Widget w = new Widget();
        w.value = 42;
        new Thread(() -> System.out.println(w.value)).start();
        return w;
    }
}
```

### 陷阱 5:notify 与 notifyAll 误用

```java
// 错误:使用 notify 可能唤醒错误的线程
synchronized (lock) {
    while (queue.isFull()) lock.wait();
    queue.add(item);
    lock.notify(); // 可能唤醒另一个生产者而非消费者,导致信号丢失
}

// 正确:使用 notifyAll 确保唤醒正确的线程
synchronized (lock) {
    while (queue.isFull()) lock.wait();
    queue.add(item);
    lock.notifyAll();
}

// 更优:使用 Condition 精确唤醒
notFull.signal(); // 只唤醒等待 notFull 的线程
```

### 陷阱 6:锁的重入性误判

```java
// synchronized 是可重入的
synchronized (lock) {
    synchronized (lock) { // 同一线程可再次获取,无死锁
        // ...
    }
}

// 但 ReentrantLock 也是可重入的
lock.lock();
lock.lock(); // 同一线程可再次获取,holdCount = 2
lock.unlock();
lock.unlock(); // 需要 unlock 两次
```

### 陷阱 7:volatile 的复合操作陷阱

```java
// volatile 不保证原子性
private volatile int count = 0;
public void increment() {
    count++; // 仍是读-改-写三步,不安全
}

// volatile 只保证单次读或单次写
private volatile boolean flag;
public void setFlag(boolean v) { flag = v; } // 安全
public boolean getFlag() { return flag; }    // 安全
```

### 陷阱 8:ThreadLocal 内存泄漏

```java
// ThreadLocal 底层是 ThreadLocalMap,key 是弱引用,value 是强引用
// 线程池中线程长期存活,ThreadLocal 不 remove 会导致 value 泄漏
ThreadLocal<byte[]> local = new ThreadLocal<>();
local.set(new byte[1024 * 1024]); // 1MB
// 使用后必须 remove
local.remove(); // 必须!
```

### 陷阱 9:异常导致锁不释放

```java
// 错误:ReentrantLock 未在 finally 释放
public void method() {
    lock.lock();
    riskyOperation(); // 抛异常,锁永远不释放
    lock.unlock();
}

// 正确:必须 try-finally
public void method() {
    lock.lock();
    try {
        riskyOperation();
    } finally {
        lock.unlock();
    }
}

// 注意:synchronized 会自动释放,即使抛异常
```

### 陷阱 10:ExecutorService 的 shutdown 顺序

```java
// 错误:立即关闭会丢失任务
executor.shutdownNow(); // 中断所有任务

// 正确:优雅关闭
executor.shutdown();              // 不接受新任务,执行完现有任务
if (!executor.awaitTermination(60, TimeUnit.SECONDS)) {
    executor.shutdownNow();       // 超时后强制关闭
}
```

## 工程实践

### 实践 1:合理配置线程池大小

线程池大小取决于任务类型:

- **CPU 密集型**:$N_{\text{threads}} = N_{\text{CPU}} + 1$
- **I/O 密集型**:$N_{\text{threads}} = N_{\text{CPU}} \times (1 + \frac{T_{\text{wait}}}{T_{\text{compute}}})$
- **混合型**:拆分为 CPU 密集和 I/O 密集两个线程池

```java
int cpuCores = Runtime.getRuntime().availableProcessors();
// CPU 密集型
int cpuPoolSize = cpuCores + 1;
// I/O 密集型(假设等待时间是计算的 2 倍)
int ioPoolSize = cpuCores * (1 + 2);
```

### 实践 2:使用并发集合替代同步集合

```java
// 避免:Collections.synchronizedXxx 性能差
Map<String, String> map = Collections.synchronizedMap(new HashMap<>());

// 推荐:ConcurrentHashMap 分段锁/CAS,读无锁,写细粒度
Map<String, String> concurrentMap = new ConcurrentHashMap<>();

// 避免:Vector、Hashtable 全表锁
// 推荐:CopyOnWriteArrayList(读多写少)、ConcurrentLinkedQueue
```

### 实践 3:不可变对象保证线程安全

```java
// 不可变对象天然线程安全
public final class ImmutablePoint {
    private final int x;
    private final int y;

    public ImmutablePoint(int x, int y) {
        this.x = x;
        this.y = y;
    }

    public int getX() { return x; }
    public int getY() { return y; }

    // 修改操作返回新对象
    public ImmutablePoint translate(int dx, int dy) {
        return new ImmutablePoint(x + dx, y + dy);
    }
}
```

### 实践 4:使用 CompletableFuture 进行异步编程

```java
import java.util.concurrent.CompletableFuture;

// 链式异步编程
CompletableFuture.supplyAsync(() -> {
    // 异步获取用户
    return userService.findById(userId);
})
.thenApply(user -> {
    // 转换
    return toUserDto(user);
})
.thenCompose(dto -> {
    // 组合另一个异步操作
    return enrichWithPermissions(dto);
})
.thenAcceptAsync(enriched -> {
    // 消费结果
    sendNotification(enriched);
})
.exceptionally(ex -> {
    // 异常处理
    log.error("异步流程失败", ex);
    return null;
});
```

### 实践 5:并发测试的编写

```java
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 并发测试:验证计数器在 100 个线程各递增 1000 次后值为 100000
 */
public class ConcurrencyTest {

    @Test
    void testConcurrentIncrement() throws InterruptedException {
        final int threadCount = 100;
        final int incrementsPerThread = 1000;
        AtomicInteger counter = new AtomicInteger();
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch end = new CountDownLatch(threadCount);

        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        for (int i = 0; i < threadCount; i++) {
            pool.submit(() -> {
                try {
                    start.await(); // 同时开始,增加竞争
                    for (int j = 0; j < incrementsPerThread; j++) {
                        counter.incrementAndGet();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    end.countDown();
                }
            });
        }

        start.countDown();
        assertTrue(end.await(10, TimeUnit.SECONDS));
        pool.shutdown();

        assertEquals(threadCount * incrementsPerThread, counter.get());
    }
}
```

### 实践 6:使用 ThreadLocal 传递上下文

```java
/**
 * 使用 ThreadLocal 在同一线程的调用链中传递请求上下文
 * 典型场景:链路追踪 traceId、用户会话、事务上下文
 * 注意:线程池环境下必须 clean,防止串号
 */
public class RequestContext {

    private static final ThreadLocal<String> traceId = new ThreadLocal<>();
    private static final ThreadLocal<Long> userId = new ThreadLocal<>();

    public static void setTraceId(String id) { traceId.set(id); }
    public static String getTraceId() { return traceId.get(); }
    public static void setUserId(Long id) { userId.set(id); }
    public static Long getUserId() { return userId.get(); }

    // 必须在请求结束时清理
    public static void clear() {
        traceId.remove();
        userId.remove();
    }
}

// 在 Filter/Interceptor 中使用
public class TraceFilter implements Filter {
    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        String tid = UUID.randomUUID().toString();
        RequestContext.setTraceId(tid);
        try {
            chain.doFilter(req, res);
        } finally {
            RequestContext.clear(); // 关键:线程池中线程复用,必须清理
        }
    }
}
```

## 案例研究

### 案例 1:线程安全的单例模式

单例模式在并发环境下有多种实现,各有优劣:

```java
// 方案一:双重检查锁定(DCL)—— 推荐使用 volatile
public class Singleton {
    // volatile 防止指令重排序(new 操作不是原子的)
    private static volatile Singleton instance;

    private Singleton() {
        // 防止反射攻击
        if (instance != null) {
            throw new IllegalStateException("已初始化");
        }
    }

    public static Singleton getInstance() {
        if (instance == null) {              // 第一次检查,无锁快速路径
            synchronized (Singleton.class) {
                if (instance == null) {      // 第二次检查,防止重复创建
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}

// 方案二:静态内部类(推荐)—— 利用类加载机制保证线程安全
public class Singleton {
    private Singleton() {}

    private static class Holder {
        private static final Singleton INSTANCE = new Singleton();
    }

    public static Singleton getInstance() {
        return Holder.INSTANCE; // 首次访问时触发类加载,JVM 保证线程安全
    }
}

// 方案三:枚举单例(Effective Java 推荐)—— 防反射、防序列化
public enum Singleton {
    INSTANCE;

    public void doSomething() {}
}
```

### 案例 2:线程安全的 LRU 缓存

```java
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;

/**
 * 线程安全的 LRU 缓存
 * 使用 ReentrantLock 保护 LinkedHashMap
 * 高并发场景可考虑分段锁或 Caffeine 等专业缓存库
 */
public class LRUCache<K, V> {

    private final int capacity;
    private final LinkedHashMap<K, V> cache;
    private final ReentrantLock lock = new ReentrantLock();

    public LRUCache(int capacity) {
        this.capacity = capacity;
        // accessOrder=true 表示按访问顺序排序
        this.cache = new LinkedHashMap<>(capacity, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
                return size() > capacity;
            }
        };
    }

    public V get(K key) {
        lock.lock();
        try {
            return cache.get(key);
        } finally {
            lock.unlock();
        }
    }

    public void put(K key, V value) {
        lock.lock();
        try {
            cache.put(key, value);
        } finally {
            lock.unlock();
        }
    }

    public int size() {
        lock.lock();
        try {
            return cache.size();
        } finally {
            lock.unlock();
        }
    }
}
```

### 案例 3:并发任务编排

```java
import java.util.concurrent.*;
import java.util.*;

/**
 * 场景:电商订单处理流水线
 * 步骤:1. 查询用户信息  2. 查询商品信息(并行)
 *       3. 校验库存     4. 计算价格  5. 生成订单
 */
public class OrderPipelineDemo {

    public Order createOrder(Long userId, List<Long> productIds) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(4);

        try {
            // 步骤 1 和 2 并行
            CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(
                () -> queryUser(userId), pool);

            CompletableFuture<List<Product>> productFuture = CompletableFuture.supplyAsync(
                () -> queryProducts(productIds), pool);

            // 等待两者完成
            CompletableFuture.allOf(userFuture, productFuture).join();

            User user = userFuture.get();
            List<Product> products = productFuture.get();

            // 步骤 3:校验库存
            checkStock(products);

            // 步骤 4:计算价格
            BigDecimal total = calculatePrice(products);

            // 步骤 5:生成订单
            return new Order(user, products, total);
        } finally {
            pool.shutdown();
        }
    }

    // 占位方法
    private User queryUser(Long id) { return new User(); }
    private List<Product> queryProducts(List<Long> ids) { return List.of(); }
    private void checkStock(List<Product> p) {}
    private BigDecimal calculatePrice(List<Product> p) { return BigDecimal.ZERO; }

    static class User {}
    static class Product {}
    static class Order {
        Order(User u, List<Product> p, BigDecimal t) {}
    }
}
```

### 案例 4:读写锁优化读多写少场景

```java
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * 读写锁:允许多个读线程并发,写线程独占
 * 适用于读多写少场景(如配置缓存)
 */
public class ReadWriteCache<K, V> {

    private final Map<K, V> map = new HashMap<>();
    private final ReadWriteLock rwLock = new ReentrantReadWriteLock();

    // 读操作:多线程并发读
    public V get(K key) {
        rwLock.readLock().lock();
        try {
            return map.get(key);
        } finally {
            rwLock.readLock().unlock();
        }
    }

    // 写操作:独占
    public void put(K key, V value) {
        rwLock.writeLock().lock();
        try {
            map.put(key, value);
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    // 缓存重载:写锁独占,所有读阻塞
    public void reload(Map<K, V> newData) {
        rwLock.writeLock().lock();
        try {
            map.clear();
            map.putAll(newData);
        } finally {
            rwLock.writeLock().unlock();
        }
    }
}
```

## 习题

### 基础题

**题 1**:下列代码在多线程环境下是否线程安全?若不安全,请给出修复方案。

```java
public class Counter {
    private int count = 0;
    public void increment() { count++; }
    public int get() { return count; }
}
```

**参考答案要点**:
不安全。`count++` 是读-改-写三步操作,非原子。修复方案:
1. 使用 `synchronized`: `public synchronized void increment()`
2. 使用 `AtomicInteger`: `private AtomicInteger count = new AtomicInteger();`
3. 使用 `ReentrantLock` 保护

**题 2**:解释 `volatile` 关键字为什么不能保证 `i++` 的原子性。

**参考答案要点**:
`volatile` 只保证可见性和有序性,不保证原子性。`i++` 实际上是:(1) 读取 i,(2) 加 1,(3) 写回 i。三个步骤之间可能被其他线程打断,造成丢失更新。`volatile` 保证每次读都从主内存读,每次写都立即刷新到主内存,但无法保证三步操作的原子性。要保证原子性需要 `synchronized`、`AtomicInteger` 或 `Lock`。

**题 3**:写出至少三种 Java 创建线程的方式,并说明各自的特点。

**参考答案要点**:
1. 继承 `Thread` 类,重写 `run()`:简单但单继承限制。
2. 实现 `Runnable` 接口:推荐,无继承限制,资源复用。
3. 实现 `Callable` 接口:有返回值,可抛出受检异常,需配合 `FutureTask`。
4. 使用 `ExecutorService.submit()`:线程池管理,推荐生产使用。
5. 使用 `CompletableFuture.supplyAsync()`:函数式异步编程。

### 进阶题

**题 4**:分析下列代码是否存在死锁风险,并解释原因。

```java
public void transfer(Account from, Account to, BigDecimal amount) {
    synchronized (from) {
        synchronized (to) {
            from.debit(amount);
            to.credit(amount);
        }
    }
}
```

**参考答案要点**:
存在死锁风险。若线程 A 调用 `transfer(acc1, acc2)`,线程 B 调用 `transfer(acc2, acc1)`,则 A 持有 acc1 等待 acc2,B 持有 acc2 等待 acc1,形成循环等待。修复:为所有账户定义全局唯一顺序(如按 hashCode 或 id 排序),总是先锁顺序小的账户:

```java
public void transfer(Account from, Account to, BigDecimal amount) {
    Account first = from.hashCode() < to.hashCode() ? from : to;
    Account second = from.hashCode() < to.hashCode() ? to : from;
    synchronized (first) {
        synchronized (second) {
            from.debit(amount);
            to.credit(amount);
        }
    }
}
```

**题 5**:为什么 `wait()` 和 `notify()` 必须在 `synchronized` 块内调用?

**参考答案要点**:
这是对象监视器(monitor)机制的硬性要求。`wait()` 的语义是:释放对象锁,并将线程加入该对象的等待集;`notify()` 的语义是:从等待集中移除一个线程并使其重新参与锁竞争。如果不持有锁就调用 `wait()`,无法释放锁,语义混乱;如果不持有锁就调用 `notify()`,可能唤醒一个根本不该被唤醒的线程。JVM 在运行时会检查当前线程是否持有对象锁,若否则抛出 `IllegalMonitorStateException`。

**题 6**:说明 `CountDownLatch` 与 `CyclicBarrier` 的核心区别,并各举一个适用场景。

**参考答案要点**:
- `CountDownLatch`:一次性,主线程等待 N 个工作线程完成。适用:服务启动时等待所有依赖服务就绪。
- `CyclicBarrier`:可重用,N 个线程相互等待到达屏障点后继续。适用:多线程分阶段计算,每阶段所有线程都完成后才进入下一阶段。

### 挑战题

**题 7**:使用 `ReentrantLock` 和 `Condition` 实现一个阻塞队列 `BlockingArrayQueue<T>`,支持 `put` 和 `take` 操作,容量有限。

**参考答案要点**:
参见"示例 4"的完整实现。核心要点:
1. 使用 `ReentrantLock` 作为主锁。
2. 创建两个 `Condition`:`notFull` 和 `notEmpty`。
3. `put` 时若满则 `notFull.await()`,放入后 `notEmpty.signal()`。
4. `take` 时若空则 `notEmpty.await()`,取出后 `notFull.signal()`。
5. 所有锁操作必须在 try-finally 中,确保 unlock。

**题 8**:设计一个线程安全的限流器(RateLimiter),限制每秒最多 N 个请求,使用令牌桶算法。

**参考答案要点**:
```java
public class TokenBucketRateLimiter {
    private final int capacity;
    private final long refillIntervalNanos;
    private final ReentrantLock lock = new ReentrantLock();
    private int tokens;
    private long lastRefillNanos;

    public TokenBucketRateLimiter(int permitsPerSecond) {
        this.capacity = permitsPerSecond;
        this.refillIntervalNanos = TimeUnit.SECONDS.toNanos(1) / permitsPerSecond;
        this.tokens = permitsPerSecond;
        this.lastRefillNanos = System.nanoTime();
    }

    public boolean tryAcquire() {
        lock.lock();
        try {
            refill();
            if (tokens > 0) {
                tokens--;
                return true;
            }
            return false;
        } finally {
            lock.unlock();
        }
    }

    private void refill() {
        long now = System.nanoTime();
        long elapsed = now - lastRefillNanos;
        int newTokens = (int) (elapsed / refillIntervalNanos);
        if (newTokens > 0) {
            tokens = Math.min(capacity, tokens + newTokens);
            lastRefillNanos += newTokens * refillIntervalNanos;
        }
    }
}
```

**题 9**:给定以下代码,请分析在 Java 内存模型下可能出现的所有问题,并给出修复方案。

```java
public class ConfigHolder {
    private Config config;
    private boolean ready;

    public void init(Config c) {
        config = c;
        ready = true;
    }

    public Config get() {
        if (ready) {
            return config;
        }
        return null;
    }
}
```

**参考答案要点**:
存在两类问题:
1. **可见性问题**:读者线程可能永远看不到 `ready` 变为 `true`,因为 JIT 可能将 `ready` 缓存到寄存器。即使看到 `ready=true`,由于指令重排,可能 `config` 还是 null(初始化未完成)。`init` 中 `config=c` 与 `ready=true` 可能被重排。
2. **有序性问题**:无 happens-before 关系保证 `config` 的初始化对读者可见。

修复方案:
```java
public class ConfigHolder {
    private volatile Config config;
    private volatile boolean ready;

    public void init(Config c) {
        config = c;        // volatile 写
        ready = true;      // volatile 写,前序操作(config 赋值)对后续可见
    }

    public Config get() {
        if (ready) {       // volatile 读
            return config; // volatile 读,看到 ready=true 则必然看到 config
        }
        return null;
    }
}
```
或更优:
```java
private final AtomicReference<Config> configRef = new AtomicReference<>();
public void init(Config c) { configRef.set(c); }
public Config get() { return configRef.get(); }
```

## 参考文献

1. Goetz, B., Peierls, T., Bloch, J., Bowbeer, J., Holmes, D., and Lea, D. 2006. *Java Concurrency in Practice*. Addison-Wesley Professional. ISBN: 978-0-321-34960-6.

2. Lea, D. 2000. *A Java fork/join framework*. In *Proceedings of the ACM 2000 Java Grande Conference* (JAVA '00), 36–43. DOI: [https://doi.org/10.1145/337449.337465](https://doi.org/10.1145/337449.337465)

3. Manson, J., Pugh, W., and Adve, S. V. 2005. *The Java memory model*. In *Proceedings of the 32nd ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages* (POPL '05), 378–391. DOI: [https://doi.org/10.1145/1040305.1040336](https://doi.org/10.1145/1040305.1040336)

4. Coffman, E. G., Elphick, M., and Shoshani, A. 1971. *System deadlocks*. *ACM Computing Surveys* 3, 2, 67–78. DOI: [https://doi.org/10.1145/356586.356588](https://doi.org/10.1145/356586.356588)

5. Herlihy, M. and Shavit, N. 2012. *The Art of Multiprocessor Programming* (2nd ed.). Morgan Kaufmann. ISBN: 978-0-12-397337-5.

6. Sutter, H. 2005. *The free lunch is over: A fundamental turn toward concurrency in software*. *Dr. Dobb's Journal* 30, 3, 202–210.

7. Peterson, G. L. 1981. *Myths about the mutual exclusion problem*. *Information Processing Letters* 12, 3, 115–116. DOI: [https://doi.org/10.1016/0020-0190(81)90106-X](https://doi.org/10.1016/0020-0190(81)90106-X)

8. Amdahl, G. M. 1967. *Validity of the single processor approach to achieving large scale computing capabilities*. In *Proceedings of the Spring Joint Computer Conference* (AFIPS '67), 483–485. DOI: [https://doi.org/10.1145/1465482.1465560](https://doi.org/10.1145/1465482.1465560)

9. Click, C. 2007. *Java theory and practice: Fixing the Java Memory Model, Part II*. IBM developerWorks.

10. Oracle Corporation. 2024. *Java Platform SE 21 API Specification: java.util.concurrent*. Retrieved from [https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html)

## 延伸阅读

### 并发理论进阶

- **《Java Concurrency in Practice》**:Brian Goetz 等著,Java 并发领域圣经,涵盖从基础到高级的全部主题。本文涉及的许多概念在该书中均有深入讨论。
- **《The Art of Multiprocessor Programming》**:Maurice Herlihy 与 Nir Shavit 合著,从理论角度讲解并发算法,包括无锁数据结构、共识算法、内存一致性模型。
- **JEP 444: Virtual Threads**:Java 21 正式引入虚拟线程,将并发编程推向百万级规模,是未来 Java 并发的发展方向。

### JMM 与编译器优化

- **JSR 133: Java Memory Model and Thread Specification**:JMM 的官方规范,定义了 happens-before、final 语义、volatile 语义等核心概念。
- **"Fixing the Java Memory Model"系列文章**:由 Jeremy Manson 和 William Pugh 撰写,讲解 JMM 设计动机与形式化定义。
- **"Memory Barriers: a Hardware View for Software Hackers"**:Paul McKenney 撰写,从硬件视角解释内存屏障的必要性。

### 工具与诊断

- **jstack / jcmd**:JDK 自带线程转储工具,可检测死锁、查看线程状态。
- **VisualVM**:图形化监控工具,线程标签页可实时观察线程状态。
- **Arthas**:阿里巴巴开源诊断工具,`thread -b` 查找阻塞源,`watch` 观察方法调用。
- **Java Flight Recorder (JFR)**:低开销事件记录器,适合生产环境长期采集。

### 并发设计模式

- **生产者-消费者**:解耦生产与消费,使用阻塞队列实现。
- **读者-写者**:读多写少场景使用读写锁。
- **Future/Promise**:异步编程基础,`CompletableFuture` 是 Java 实现。
- **Actor 模型**:Akka 框架实现,消息传递替代共享内存。
- **Software Transactional Memory (STM)**:Clojure 提供的并发模型,数据库事务思想应用于内存。

### 附录:JMM 速查表

| 需求 | 推荐机制 |
| --- | --- |
| 状态标志位 | `volatile boolean` |
| 计数器 | `AtomicInteger` / `LongAdder` |
| 临界区互斥 | `synchronized` 或 `ReentrantLock` |
| 线程间等待 | `CountDownLatch` / `CyclicBarrier` |
| 限制并发数 | `Semaphore` |
| 异步任务 | `CompletableFuture` |
| 线程安全集合 | `ConcurrentHashMap` / `CopyOnWriteArrayList` |
| 上下文传递 | `ThreadLocal`(注意清理) |
| 读多写少 | `ReentrantReadWriteLock` / `StampedLock` |
| 高并发计数 | `LongAdder`(优于 `AtomicLong`) |
