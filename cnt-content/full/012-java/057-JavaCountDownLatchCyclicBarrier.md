---
order: 570
title: Java 同步器 CountDownLatch/CyclicBarrier/Phaser 语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Java 同步器 CountDownLatch/CyclicBarrier/Phaser 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'java/052-JUCConcurrency'
  - 'java/053-ConcurrencyDetailed'
  - 'java/056-ExecutorForkJoinPool'
prerequisites:
  - 'java/050-MultithreadingBasics'
---

## 0. 本节阅读指引（先读这一节）

本篇是「CountDownLatch / CyclicBarrier / Phaser」语法速查手册，按需查阅。

零基础第一遍只读：概念对照、两个完整示例、CountDownLatch 与 CyclicBarrier 的速查段；Phaser、Exchanger 遇到再查。

前置：047 多线程基础。

## 概念对照：一个等几个，还是几个互相等

并发编程里最常出现两种"会合"需求：

- **发令枪（CountDownLatch）**：主线程说"你们三个都跑完了我再汇总"。它是**一次性的倒数器**——计数减到 0 后就作废，不能重置。类比：火箭发射倒计时，归零点火后这场发射就结束了。
- **集合点（CyclicBarrier）**：三个组员约定"都到齐了再一起进下一关"，进完一关还能再约下一关。它是**可循环的屏障**——人齐放行后计数自动复位，可以反复使用。类比：旅游团约定每个景点门口清点人数。

一句话区分：**一个线程等多个任务完成，用 CountDownLatch；多个线程互相等齐再继续，用 CyclicBarrier**。参与者数量还要动态增减、分阶段推进时，再上 Phaser。

## 完整示例一：CountDownLatch 等全部子任务完成

```java
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class LatchDemo {
    public static void main(String[] args) throws InterruptedException {
        int taskCount = 3;
        CountDownLatch latch = new CountDownLatch(taskCount);
        ExecutorService pool = Executors.newFixedThreadPool(taskCount);

        for (int i = 1; i <= taskCount; i++) {
            final int id = i;
            pool.submit(() -> {
                try {
                    Thread.sleep(100 * id);       // 模拟耗时不同的任务
                    System.out.println("任务 " + id + " 完成");
                } finally {
                    latch.countDown();            // 务必放 finally，异常也要减计数
                }
            });
        }

        latch.await(); // 计数未归零前一直阻塞（主线程在"等待发令枪"）
        System.out.println("全部完成，开始汇总");
        pool.shutdown();
    }
}
// 预期输出（前两行顺序固定，任务行之间按完成先后）：
// 任务 1 完成
// 任务 2 完成
// 任务 3 完成
// 全部完成，开始汇总
```

## 完整示例二：CyclicBarrier 分阶段会合

```java
import java.util.concurrent.BrokenBarrierException;
import java.util.concurrent.CyclicBarrier;

public class BarrierDemo {
    public static void main(String[] args) {
        // 3 名选手；第 2 个参数是全员到齐后由"最后一个到达的线程"执行的动作
        CyclicBarrier barrier = new CyclicBarrier(3,
                () -> System.out.println("-- 全员到齐，进入下一阶段 --"));

        for (int i = 1; i <= 3; i++) {
            final int id = i;
            new Thread(() -> {
                try {
                    for (int phase = 1; phase <= 2; phase++) {
                        Thread.sleep(50 * id);              // 各人速度不同
                        System.out.println("选手 " + id + " 完成阶段 " + phase);
                        barrier.await();                    // 等其他人到齐
                    }
                } catch (InterruptedException | BrokenBarrierException e) {
                    Thread.currentThread().interrupt();
                }
            }).start();
        }
    }
}
// 预期输出（顺序稳定，sleep 差距足够大）：
// 选手 1 完成阶段 1
// 选手 2 完成阶段 1
// 选手 3 完成阶段 1
// -- 全员到齐，进入下一阶段 --
// 选手 1 完成阶段 2
// 选手 2 完成阶段 2
// 选手 3 完成阶段 2
// -- 全员到齐，进入下一阶段 --
```

注意屏障"自动复位"：没有任何 reset 调用，第二阶段的 await 照样生效——这就是 Cyclic（循环）的含义。

## 常见陷阱

**陷阱一：countDown 没放进 finally。** 子任务抛异常导致计数永远减不到 0，主线程 `await()` 永久挂起。计数依赖"每个任务恰好减一次"的纪律，漏一次就是死等。

**陷阱二：不用超时版 await。** 生产代码建议 `latch.await(30, TimeUnit.SECONDS)`，超时返回 `false`，把"永久挂死"变成"可处理的降级分支"。

**陷阱三：想重置 CountDownLatch。** 它不能重置。需要反复使用就换 CyclicBarrier，或重新 new 一个。

**陷阱四：barrier 参与者提前挂了。** 某线程异常退出后没到 `await()`，其余线程会一直等；屏障检测到有人超时/中断会把所有等待者以 `BrokenBarrierException` 放行，捕获后要决定重试（`reset()`）还是放弃。

**陷阱五：把 await 的返回值当"序号"用错。** `barrier.await()` 返回的是"我是第几个到达的"（0 起），可用于选举leader，但别当阶段号用（阶段号看 `getPhase()`）。

## CountDownLatch 一次性倒数

**基本写法：创建倒数器**
`new CountDownLatch(<计数>);`
```java
// 创建计数为 3 的倒数器
CountDownLatch latch = new CountDownLatch(3);
```

---

**基本写法：计数减一**
`<latch>.countDown();`
```java
// 计数减 1
latch.countDown();
```

---

**基本写法：等待计数归零**
`<latch>.await();`
```java
// 阻塞直到计数归零
latch.await();
```

---

**基本写法：超时等待**
`<latch>.await(<超时>, <单位>);`
```java
// 最多等待 5 秒
boolean ok = latch.await(5, TimeUnit.SECONDS);
```

---

**基本写法：获取剩余计数**
`<latch>.getCount();`
```java
// 查询当前剩余计数
long rest = latch.getCount();
```

---

## CyclicBarrier 可循环屏障

**基本写法：创建屏障**
`new CyclicBarrier(< parties >);`
```java
// 创建 3 个线程同步的屏障
CyclicBarrier barrier = new CyclicBarrier(3);
```

---

**基本写法：带动作的屏障**
`new CyclicBarrier(< parties >, <Runnable>);`
```java
// 所有线程到达后执行的动作
CyclicBarrier b = new CyclicBarrier(3, () -> System.out.println("all arrived"));
```

---

**基本写法：等待**
`<barrier>.await();`
```java
// 等待其他线程到达
barrier.await();
```

---

**基本写法：超时等待**
`<barrier>.await(<超时>, <单位>);`
```java
// 最多等待 10 秒
int idx = barrier.await(10, TimeUnit.SECONDS);
```

---

**基本写法：重置屏障**
`<barrier>.reset();`
```java
// 重置屏障以便复用
barrier.reset();
```

---

## Phaser 阶段同步器

**基本写法：创建 Phaser**
`new Phaser(< parties >);`
```java
// 创建包含 3 个参与者的 Phaser
Phaser phaser = new Phaser(3);
```

---

**基本写法：注册参与者**
`<phaser>.register();`
```java
// 动态注册一个参与者
phaser.register();
```

---

**基本写法：到达并等待**
`<phaser>.arriveAndAwaitAdvance();`
```java
// 到达当前阶段并等待其他人
int phase = phaser.arriveAndAwaitAdvance();
```

---

**基本写法：到达并注销**
`<phaser>.arriveAndDeregister();`
```java
// 到达并从后续阶段注销自己
phaser.arriveAndDeregister();
```

---

**基本写法：获取当前阶段**
`<phaser>.getPhase();`
```java
// 查询当前阶段编号
int phase = phaser.getPhase();
```

---

## Exchanger 交换器

**基本写法：创建交换器**
`new Exchanger<<类型>>();`
```java
// 创建字符串交换器
Exchanger<String> ex = new Exchanger<>();
```

---

**基本写法：交换数据**
`<exchanger>.exchange(<数据>);`
```java
// 与另一线程交换数据并返回对方的数据
String other = ex.exchange("mine");
```

---

**基本写法：超时交换**
`<exchanger>.exchange(<数据>, <超时>, <单位>);`
```java
// 最多等待 5 秒
String other = ex.exchange("mine", 5, TimeUnit.SECONDS);
```

## 小结

初学者记住三点：

> 1. 主线程等子任务全部完成，用 CountDownLatch；countDown 必须放 finally。
> 2. 多线程互相等齐、且要反复会合，用 CyclicBarrier；人齐自动进入下一轮。
> 3. 生产代码一律用超时版 await，防永久挂死。

进阶者还需注意：

- CountDownLatch 基于 AQS 共享模式，计数是 volatile 语义的；CyclicBarrier 基于 ReentrantLock + Condition，两者单次会合开销都低，但高频繁会合要评估吞吐。
- 参与者动态变化或需要分层推进时选 Phaser；两线程两两交换数据选 Exchanger。
- 与 `CompletableFuture.allOf`、`StructuredTaskScope.open()`（预览）对比：同步器是底层积木，编排需求优先考虑更高级的抽象（见 054、059）。
