---
order: 460
title: "线程池实战：别再一个请求开一个线程"
module: 'java'
category: 后端技术
difficulty: advanced
description: "以「每个请求 new 一个线程，高峰期直接 OOM」引入，逐个讲透 ThreadPoolExecutor 七参数、四种拒绝策略对照实验、execute 与 submit 吞异常差异的真实事故，并预告虚拟线程，附无界队列堆积实测与 RejectedExecutionException 调试实录。"
author: fanquanpp
updated: '2026-10-11'
related:
  - 'java/480-MultithreadingBasics'
  - 'java/490-JucConcurrencyTools'
  - 'java/510-ConcurrencyDetailed'
  - 'java/550-JavaVirtualThread'
prerequisites:
  - 'java/490-JucConcurrencyTools'
---

## 前置知识

- 已完成 [JUC 并发工具](/java/490-JucConcurrencyTools)：用过 AtomicInteger 与 BlockingQueue——线程池内部的工作队列就是它；
- 了解 [多线程入门](/java/480-MultithreadingBasics) 的 start/join 即可，直接 new Thread 的写法本文会给出替代品。还没读过前两篇也能跟，涉及的概念都会回链。

## 学习目标

读完本文你将能够：

1. 说出 new Thread 每请求一线程在高峰期的死法，并用线程池复用线程解决；
2. 逐个解释 ThreadPoolExecutor 七参数的分工，预测一批任务在池里的完整流转；
3. 用实验区分四种拒绝策略的行为，并按业务为服务挑一种；
4. 解释 execute 与 submit 对任务异常的吞噬差异，并复现「异常静默消失」的事故现场；
5. 写出两阶段优雅关闭，知道虚拟线程在什么前提下改写本文规则。

预计 60 到 90 分钟。

## 1. 你现在要解决什么问题

你写了个图片压缩服务，第一版很直白：一个请求进来，new 一个线程去压缩。

测试环境一切正常。上线当天流量涌入，每个请求的线程还没干完活，新请求的线程已经排着队创建——线程不是免费的，每条要分配约 1MB 栈内存，还要参与操作系统调度。几千个线程同时活着，内存先爆（OOM），CPU 随后被线程切换拖垮，整个进程宕机。**创建销毁的固定开销加上无上限的并发数，是裸线程在服务端的死刑理由**。

解法是让线程像员工一样常驻：任务来了从「池」里领线程，干完归还，忙不过来先排队。这就是线程池。

## 2. 最小可运行示例

```java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PoolReuse {
    public static void main(String[] args) {
        ExecutorService pool = Executors.newFixedThreadPool(3);
        for (int i = 1; i <= 6; i++) {
            int id = i;
            pool.execute(() -> {
                System.out.println("请求" + id + " 由 "
                        + Thread.currentThread().getName() + " 处理");
                try { Thread.sleep(300); } catch (InterruptedException e) { }
            });
        }
        pool.shutdown();
    }
}
```

预期输出：

```text
请求1 由 pool-1-thread-1 处理
请求2 由 pool-1-thread-2 处理
请求3 由 pool-1-thread-3 处理
请求4 由 pool-1-thread-3 处理
请求5 由 pool-1-thread-1 处理
请求6 由 pool-1-thread-2 处理
```

6 个请求只有 3 个线程，thread-3 干完请求 4 又回头干——**线程被复用了**。但 newFixedThreadPool 教学友好、生产危险，为什么，第 4 节实测。

## 3. 核心概念：七参数各管一段

生产代码直接构造 ThreadPoolExecutor，七个参数一个都不能含糊：

```java
ThreadPoolExecutor pool = new ThreadPoolExecutor(
        2,                                // corePoolSize 常驻线程数
        4,                                // maximumPoolSize 线程数上限
        60L, TimeUnit.SECONDS,            // 非核心线程空闲 60 秒后回收
        new ArrayBlockingQueue<>(100),    // workQueue 排队的任务
        r -> new Thread(r, "order-pool"), // threadFactory 起名用
        new ThreadPoolExecutor.AbortPolicy()); // handler 拒绝策略
```

任务提交时按固定顺序流转：

```mermaid
flowchart LR
    T[任务提交] --> A[线程数小于 core? 开新线程]
    A -- 否 --> B[队列没满? 入队等待]
    B -- 否 --> C[线程数小于 maximum? 开新线程]
    C -- 否 --> D[执行拒绝策略]
```

三个最容易被理解错的点：

- **队列优先于扩容**。任务先排队，队列满了才创建第 core+1 个线程。所以 newFixedThreadPool 传的是无界队列，任务永远排得下，maximumPoolSize 形同虚设；
- **keepAliveTime 只裁非核心线程**，常驻的 core 个不会被回收；
- **threadFactory 不是摆设**。线程名 pool-1-thread-1 出了事在日志里根本没法定位，生产必须起业务名。

## 4. 实验：四种拒绝策略

把池拧到最小（core 1、maximum 2、队列容量 1），第 4 个任务就会撞上拒绝策略，正好观察：

```java
ThreadPoolExecutor pool = new ThreadPoolExecutor(
        1, 2, 10, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(1),
        new ThreadPoolExecutor.AbortPolicy());

for (int i = 1; i <= 4; i++) {
    int id = i;
    try {
        pool.execute(() -> {
            try { Thread.sleep(300); } catch (InterruptedException e) { }
            System.out.println("任务" + id + " 由 "
                    + Thread.currentThread().getName() + " 执行");
        });
        System.out.println("任务" + id + " 已接受");
    } catch (RejectedExecutionException e) {
        System.out.println("任务" + id + " 被拒绝: " + e.getClass().getSimpleName());
    }
}
pool.shutdown();
```

某次真实运行：

```text
任务1 已接受
任务2 已接受
任务3 已接受
任务4 被拒绝: RejectedExecutionException
任务1 由 pool-1-thread-1 执行
任务3 由 pool-1-thread-2 执行
任务2 由 pool-1-thread-1 执行
```

对上第 3 节的流转图：任务 1 占核心线程，任务 2 进队列，任务 3 触发扩容到 maximum，任务 4 走到拒绝策略。四种策略的行为：

| 策略 | 行为 | 适用 |
| --- | --- | --- |
| AbortPolicy（默认） | 抛 RejectedExecutionException | 不能丢任务，让调用方感知并处理 |
| CallerRunsPolicy | 提交者自己干 | 天然限流：提交变慢，池子喘过气 |
| DiscardPolicy | 悄悄丢弃 | 允许丢的任务（如打点日志） |
| DiscardOldestPolicy | 丢队列里最老的再重试 | 只在乎最新数据（如行情快照） |

把上面代码换成 CallerRunsPolicy 再跑，注意这一行：`任务4 由 main 执行`——main 被抓来干活了，这就是反压。

## 5. 真实事故：execute 与 submit 的异常吞噬

一个订单系统的定时任务每天夜里跑，某天起偶发失败，日志却干干净净。排查半天，问题出在提交方式上：

```java
pool.execute(() -> { throw new IllegalStateException("execute 提交的任务炸了"); });
pool.submit(() -> { throw new IllegalStateException("submit 提交的任务炸了"); });
```

运行后的完整输出（节选）：

```text
Exception in thread "pool-1-thread-1" java.lang.IllegalStateException: execute 提交的任务炸了
	at SwallowedTask.lambda$main$0(SwallowedTask.java:9)
	at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1090)
main 正常结束
```

execute 那条炸了，JVM 打印了未捕获异常；**submit 那条悄无声息**——它把任务包进 Future，异常被存起来等你来取，你不取它就烂在 Future 里。补上取的动作：

```java
Future<?> f = pool.submit(() -> {
    throw new IllegalStateException("订单金额为负");
});
Thread.sleep(200);
System.out.println("没人发现异常，程序看起来一切正常");
f.get();
```

真实输出：

```text
没人发现异常，程序看起来一切正常
Exception in thread "main" java.util.concurrent.ExecutionException: java.lang.IllegalStateException: 订单金额为负
```

事故定性：用 submit 却不消费 Future，等于给异常上了封条。三条整改路：改用 execute；坚持 submit 就必须 get() 并处理 ExecutionException；或给线程工厂挂 UncaughtExceptionHandler。凡「任务静默消失」的工单，先查这里。

## 6. 优雅关闭

池不会自己结束。标准三步走：`shutdown()` 停止收新任务、干完存货；`awaitTermination(60, SECONDS)` 限时等待；超时 `shutdownNow()` 中断在跑的任务并返回没开工的任务列表。

## 7. 实际场景与参数起点

- CPU 密集（压缩、计算）：线程数取核数加 1，多了只是添乱；
- IO 密集（调下游、查库）：线程可以远多于核数，因为大部分时间在等，起点核数乘 4，压测定稿；
- 队列必须有界、线程必须有名字、拒绝策略不许选 Discard 系——除非你真的丢得起。

一句话预告：线程「又贵又少」这个前提正在被改写。Java 21 的虚拟线程让「一个任务一个线程」重新可行（见 [Java 与虚拟线程](/java/550-JavaVirtualThread)），但理解了本文的池化与背压，你才知道虚拟线程替你省掉了什么。

## 8. 常见错误与调试实录

错误一：无界队列堆积。newFixedThreadPool 等价于 core=maximum 的池加无界队列，提交 1000 个任务实测：

```text
已提交 250 个, 线程数 2, 队列堆积 248
已提交 500 个, 线程数 2, 队列堆积 498
已提交 750 个, 线程数 2, 队列堆积 748
已提交 1000 个, 线程数 2, 队列堆积 998
```

线程数永远停在 2，任务全部淤在队列里。内存撑爆只是时间问题，而且响应延迟在暴涨前毫无征兆——这正是「生产禁用 Executors 工厂方法」这条军规的由来。

错误二：高峰期莫名抛异常。AbortPolicy 拒绝任务时抛出的就是第 4 节那个 RejectedExecutionException。看到它别一 catch 了之——池与队列已饱和，要么限流上游，要么调参；吞掉异常等于丢掉用户的请求。

错误三：忘了 shutdown 或误用 shutdownNow。前者进程退不干净；后者直接中断在跑的任务，half-done 的半成品文件就是这么来的。按第 6 节三步走。

## 9. 修改实验

1. 把第 4 节实验的拒绝策略依次换成 DiscardPolicy 与 DiscardOldestPolicy，观察输出里少了哪个任务号，两种策略丢的是不是同一个；
2. 把池参数改成 core=2、maximum=4、队列容量 2，先在纸上画出 8 个瞬时任务的接受与拒绝分布，再运行对照第 3 节的流转图；
3. 给第 2 节示例补两阶段关闭：shutdown 后 awaitTermination 5 秒，超时打印一行警告再 shutdownNow，验证 main 最后退出。

## 10. 小练习

预测题（先写答案再运行）：core=1、maximum=2、队列容量 2、AbortPolicy，连续提交 5 个任务，第几个被拒绝？此时池里有几个线程、队列里有几个任务？自查：第 5 个被拒绝；线程 2 个，队列满 2 个。

挑战题（半小时）：给图片压缩服务写线程池骨架。要求：有界队列容量 50；线程名 image-pool-N；拒绝策略 CallerRuns；两阶段关闭。验收：并发提交 200 个任务不抛异常不丢任务；main 不会比线程池先退出；jconsole 或任务管理器里线程数不超过 maximum。

## 11. 与之前和之后的知识的关系

- 往前：[多线程入门](/java/480-MultithreadingBasics) 的裸线程是本文要替掉的反面教材；[JUC 并发工具](/java/490-JucConcurrencyTools) 的 BlockingQueue 在池内就是 workQueue 的真身；
- 往后，并发四篇的分工：**480 裸线程与 synchronized**、**490 不锁也能对**、**本文线程池**，**[并发设计与 AQS](/java/510-ConcurrencyDetailed) 揭开这些工具共同的底层骨架**；
- 更远：[CompletableFuture](/java/520-CompletableFutureAsync) 在线程池之上做任务编排；[虚拟线程](/java/550-JavaVirtualThread) 换一种方式回答「线程太贵」。

## 12. 官方文档

- ThreadPoolExecutor API（七参数与流转顺序的权威描述）：https://docs.oracle.com/javase/21/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html
- ExecutorService（shutdown 系列语义）：https://docs.oracle.com/javase/21/docs/api/java.base/java/util/concurrent/ExecutorService.html
- 虚拟线程官方指南：https://docs.oracle.com/en/java/javase/21/core/virtual-threads.html

## 13. 自我检查

- 能对新人讲清「为什么不一个请求开一个线程」，两个理由起步；
- 给任意一个池配置，能画出 10 个任务的完整流向图；
- 四种拒绝策略能各配一个业务场景；
- 能完整复述 submit 吞异常事故的现场、根因与三条整改路。

## 本章总结

线程池用「复用 + 排队 + 上限 + 退出机制」把裸线程的无序并发变成可管理的容量问题：七参数决定任务流向，队列必须有界，拒绝策略是最后的安全网，submit 会吞异常、execute 不会。生产环境自己 new ThreadPoolExecutor，参数从任务类型出发、以压测收尾。

## 下一步

进入 [并发设计与 AQS](/java/510-ConcurrencyDetailed)：换上设计视角，回答可见性为什么出问题、死锁怎么现场抓捕，以及本文所有工具背后那个「state 加队列」的统一骨架。
