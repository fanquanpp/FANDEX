---
order: 410
title: "并发设计：可见性、死锁与 AQS 的直觉"
module: 'java'
category: 后端技术
difficulty: advanced
description: "以「while 循环停不下来、程序却没有任何报错」引入，讲 happens-before 直觉、volatile 最小实验、死锁四条件与 jstack 抓捕实录、AQS 的 state 加队列模型、ReentrantLock 选型表与读写锁适用场景。"
author: fanquanpp
updated: '2026-09-28'
related:
  - 'java/480-MultithreadingBasics'
  - 'java/490-ConcurrencyBasics'
  - 'java/500-JUCConcurrency'
  - 'java/610-JVMMemoryModel'
prerequisites:
  - 'java/500-JUCConcurrency'
---

## 前置知识

- 已完成 [线程池实战](/java/500-JUCConcurrency)：会用线程池与拒绝策略，好奇这些工具「凭什么正确」；
- [多线程入门](/java/480-MultithreadingBasics) 的 synchronized 修复与 [JUC 并发工具](/java/490-ConcurrencyBasics) 的 CAS 实验是本文反复引用的地基。还没读也没关系，关键结论都会就地重讲。

## 学习目标

读完本文你将能够：

1. 复现「标志位停不下来」的可见性事故，用 volatile 修复，并说出它保证什么、不保证什么；
2. 用 happens-before 的直觉判断「线程 A 的写入，线程 B 能不能看见」；
3. 现场制造死锁，用 jstack 抓到 "Found one Java-level deadlock"，并按四条件给出预防手段；
4. 用「一个 state 加一条排队队伍」的模型理解 ReentrantLock、Semaphore、CountDownLatch 的共性；
5. 拿到新需求时，按选型表在 synchronized、ReentrantLock、读写锁之间做决定。

预计 60 到 90 分钟。

## 1. 你现在要解决什么问题

前三篇学「怎么用」，本篇回答两件更根本的事：**并发 Bug 为什么发生**，以及**这些工具共同的设计骨架是什么**。先看一个最安静的 Bug——不崩溃、不报错，程序就是不听话：

```java
public class StopFlag {
    static boolean running = true;

    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> {
            while (running) {
                // 空转，等别人把 running 改成 false
            }
            System.out.println("worker 看到了停止信号");
        });
        worker.start();
        Thread.sleep(200);
        running = false;
        worker.join(1000);
        System.out.println(worker.isAlive() ? "worker 还在空转" : "worker 已退出");
    }
}
```

真实运行输出：

```text
worker 还在空转
```

而且程序永不退出，只能强杀。main 明明把 running 改成了 false，worker 却像失明一样空转。这不是玄学：为了速度，**每个线程可以把变量抄进自己的寄存器与缓存**，JIT 甚至可能把循环里的读优化成「只读一次」。main 改的是自己的副本，worker 根本不看主内存。

## 2. 核心概念一：happens-before 直觉版

什么时候一个线程的写对另一个线程可见？Java 内存模型（JMM）用 happens-before 回答：**操作 a happens-before 操作 b，则 a 的结果对 b 可见**。不必背八条规则，日常能救命的是这五条直觉：

| 场景 | 直觉表述 |
| --- | --- |
| volatile 写与后续读 | 写 volatile 变量后，后续读它的人能看到之前的一切写入 |
| 解锁与加锁 | 释放锁前的写入，对下一个拿到同一把锁的人可见 |
| start 与任务 | start() 之前的一切写入，新线程全部看得见 |
| join 与后续 | 线程干完活（join 返回）后的代码，看得见它全部写入 |
| 传递 | 可见性可以顺着链条传递 |

回看第 1 节的事故：main 的写和 worker 的读之间**没有任何一条规则**成立，JMM 就不保证可见。修复只要补一条：

```java
static volatile boolean running = true;   // 补上 volatile
```

再次运行，输出恢复：

```text
worker 看到了停止信号
worker 已退出
```

volatile 的语义是「写穿透到主内存，读不再用旧副本」，顺便禁止相关重排序。但记住边界：**只保证可见，不保证原子**——`volatile int count` 上的 count++ 照样丢更新，修计数请回 [JUC 并发工具](/java/490-ConcurrencyBasics) 的 CAS。规范条文深挖见 [JVM 内存模型](/java/610-JVMMemoryModel)。

## 3. 核心概念二：死锁与现场抓捕

可见性出问题是「看不见」，死锁是「互相等」。四个必要条件凑齐才发生：**互斥**（资源一次一人）、**持有并等待**（攥着旧的要新的）、**不可剥夺**（不能抢）、**循环等待**（等成一个圈）。两个线程用相反顺序抢两把锁，就把四个条件凑齐了：

```java
public class DeadlockDemo {
    static final Object forkA = new Object();
    static final Object forkB = new Object();

    public static void main(String[] args) throws InterruptedException {
        Thread alice = new Thread(() -> {
            synchronized (forkA) {
                try { Thread.sleep(100); } catch (InterruptedException e) { }
                synchronized (forkB) {
                    System.out.println("alice 吃上了");
                }
            }
        }, "alice");

        Thread bob = new Thread(() -> {
            synchronized (forkB) {
                try { Thread.sleep(100); } catch (InterruptedException e) { }
                synchronized (forkA) {
                    System.out.println("bob 吃上了");
                }
            }
        }, "bob");

        alice.start();
        bob.start();
        alice.join();
        bob.join();
    }
}
```

程序卡死。用 jstack 抓现场（jps 找进程号）：

```bash
jps -l | grep DeadlockDemo
jstack 24796
```

jstack 输出末尾（节选，真实原文）：

```text
Found one Java-level deadlock:
=============================
"alice":
  waiting to lock monitor 0x000001d092553680 (object 0x000000071ba54710, a java.lang.Object),
  which is held by "bob"

"bob":
  waiting to lock monitor 0x000001d092553750 (object 0x000000071ba54700, a java.lang.Object),
  which is held by "alice"
```

JVM 自己能认出死锁，把等待链原样打印。生产上服务「不响应也不报错」，第一步就是 jstack 一发。

预防从四条件下手，最实用的是**破坏循环等待：全局锁顺序**——需要多把锁的地方都按同一顺序获取（如按对象 id 排序），alice 和 bob 都先拿 forkA，圈就成不了。次选 tryLock 加超时（见下一节），拿不到就放手重来。

## 4. 核心概念三：AQS 的概念模型

ReentrantLock、Semaphore、CountDownLatch、读写锁，风格各异，底层却是同一副骨架：AbstractQueuedSynchronizer（AQS）。概念上只有两样东西：

- **一个 int 型的 state**：含义由子类定义；
- **一条排队队伍**（CLH 队列的变体）：抢不到的线程排队挂起，前一个人释放时唤醒下一个。

| 同步器 | state 的含义 |
| --- | --- |
| ReentrantLock | 0 没人持有，大于 0 是重入次数 |
| Semaphore | 剩余许可数 |
| CountDownLatch | 还剩几个 countDown |
| ReentrantReadWriteLock | 高位记读锁，低位记写锁 |

用这个模型一眼看穿共性：acquire 就是「CAS 减 state，减不动就入队挂起」，release 就是「加回 state，唤醒队头」。490 篇的 CAS 是「不排队的乐观路线」，AQS 是「排队挂起的稳妥路线」，共享同一个原子操作底座。理解到这一层足够支撑选型与排查；想读源码，从 ReentrantLock 的 tryAcquire 入手。

## 5. 选型表：synchronized、ReentrantLock、读写锁

| 需求 | 选择 | 理由 |
| --- | --- | --- |
| 简单互斥，临界区短 | synchronized | 自动释放，不写 finally，性能早已不是短板 |
| 需要拿不到就放弃 | ReentrantLock.tryLock(timeout) | synchronized 做不到 |
| 等锁时能被中断 | ReentrantLock.lockInterruptibly | 死锁自救通道 |
| 读多写极少 | ReentrantReadWriteLock | 读读不互斥，吞吐翻倍 |
| 读写都猛 | ConcurrentHashMap / 分桶 | 锁竞争根本不该发生 |

tryLock 长这样：

```java
if (lock.tryLock(1, TimeUnit.SECONDS)) {
    try {
        doWork();
    } finally {
        lock.unlock();
    }
} else {
    System.out.println("1 秒没抢到，先干别的去");
}
```

读写锁适合「配置缓存」：几百个读线程查配置，偶尔一个写线程刷新。读锁人人可拿，写锁独占全场：

```java
private final ReentrantReadWriteLock rw = new ReentrantReadWriteLock();
private final Map<String, String> config = new HashMap<>();

String get(String key) {
    rw.readLock().lock();
    try { return config.get(key); } finally { rw.readLock().unlock(); }
}

void reload(Map<String, String> fresh) {
    rw.writeLock().lock();
    try { config.clear(); config.putAll(fresh); } finally { rw.writeLock().unlock(); }
}
```

注意 ReentrantLock 系全要 try-finally 手动解锁，漏一次 unlock 就是一次必然的死锁。

## 6. 常见错误与调试实录

错误一：把可见性问题当性能问题调参。现象是「偶发读到旧值」或「循环停不下来」，日志一片干净。排查动作：找出被多线程读写、却没 volatile 也没锁的字段，逐个补 happens-before 关系。

错误二：死锁后盲目重启。重启丢现场，问题第二天准时报到。正确姿势是第 3 节的 jstack：输出直接点名谁锁着什么等着什么，照单修复锁顺序即可。

错误三：读写锁用在写多的场景。写锁一独占，堆着的读线程全被放行，表现为「刷新配置瞬间接口毛刺」。读多写少才配它。

## 7. 修改实验

1. 给 StopFlag 的空转循环体加一句 `System.out.print("")`，去掉 volatile 再跑——居然可能停下来了。想想为什么打印改变了 JIT 的优化决策（提示：方法调用让编译器不敢把读操作提出循环）；
2. 把 DeadlockDemo 里 bob 的两把锁顺序对调（先 forkA 后 forkB），验证程序能正常结束；
3. 给配置缓存加一个「读 100 万次、写 3 次」的计时对照：一次全程 synchronized，一次读写锁，跑出两条耗时。

## 8. 小练习

预测题（先写答案再运行）：`static volatile int count = 0;`，两个线程各 count++ 一万次，最终值一定是 20000 吗？换成 `AtomicInteger` 呢？自查：前者不保证，volatile 不含原子性，常见结果略小于 20000；后者恒为 20000。

挑战题（半小时）：写转账函数 transfer(from, to, amount)，两个账户对象各有一把锁。要求：任意线程以任意顺序转账都不死锁；每次转账后总额守恒。验收：并发跑十轮转账循环，程序总能自然退出且总余额不变。提示：破坏循环等待；展开：按账户的某个不可变键值（如 id）比较后排序加锁。

## 9. 与之前和之后的知识的关系

- 往前：[多线程入门](/java/480-MultithreadingBasics) 的竞态、[JUC 并发工具](/java/490-ConcurrencyBasics) 的 CAS、[线程池实战](/java/500-JUCConcurrency) 的池，本文把它们统一到两条主线：可见性靠 happens-before，互斥靠 state 加队列；
- 往后，并发四篇分工：**480 裸线程与 synchronized**、**490 不锁也能对**、**500 线程池**、**本文设计层**——知道工具为什么对，才能在工具失灵时自己诊断；
- 更远：JMM 规范全文见 [JVM 内存模型](/java/610-JVMMemoryModel)；不共享状态、改走异步编排是 [CompletableFuture](/java/520-CompletableFutureAsync) 的事；[ThreadLocal 内存泄漏](/java/530-ThreadLocalMemoryLeak) 则是「不共享，各存各的」路线的代价清单。

## 10. 官方文档

- JLS 第 17 章「线程与锁」（happens-before 的规范原文在 17.4）：https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html
- java.util.concurrent.locks 包总览（AQS 与各锁的关系）：https://docs.oracle.com/javase/21/docs/api/java.base/java/util/concurrent/locks/package-summary.html
- Oracle 官方死锁教程：https://docs.oracle.com/javase/tutorial/essential/concurrency/deadlock.html

## 11. 自我检查

- 能复现标志位失明实验，说出「线程的写要被别人看见，必须存在 happens-before 链」；
- 能画出两线程死锁的等待环，并对四条件各给一条破坏手段；
- 能用 state 语义表解释 CountDownLatch 和 Semaphore 是同一个骨架的两种用法；
- 拿到新需求，能按选型表说出选哪把锁、为什么。

## 本章总结

并发设计两条主线：可见性靠 happens-before 建链（volatile、锁、start/join 都是链），互斥靠「state 加排队」的 AQS 骨架。死锁是四条件凑齐的必然，jstack 一抓一个准，预防靠全局锁顺序。选型先 synchronized，特殊需求再上 ReentrantLock，读多写少配读写锁——工具层的心智负担，至此放下。

## 下一步

进入 [CompletableFuture 异步编排](/java/520-CompletableFutureAsync)：换一条不共享可变状态的路线，让任务以「提交与组合」协作；再往后的 [虚拟线程](/java/570-JavaVirtualThread) 会掀翻「线程很贵」这个前提。
