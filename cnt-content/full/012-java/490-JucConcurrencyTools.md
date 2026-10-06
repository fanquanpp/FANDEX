---
order: 450
title: "JUC 并发工具：不锁也能对"
module: 'java'
category: 后端技术
difficulty: intermediate
description: "以「一百个线程抢一把锁，计数慢了三倍」引入，讲透 AtomicInteger 的 CAS 直觉、ConcurrentHashMap 对照实验、CopyOnWriteArrayList 适用场景与 BlockingQueue 生产者消费者实现，附 ConcurrentHashMap 拒绝 null 的 NPE 调试实录。"
author: fanquanpp
updated: '2026-10-05'
related:
  - 'java/480-MultithreadingBasics'
  - 'java/500-ThreadPoolExecutorPractice'
  - 'java/510-ConcurrencyDetailed'
  - 'java/210-CollectionFrameworkDetailed'
prerequisites:
  - 'java/480-MultithreadingBasics'
---

## 前置知识

- 已完成 [多线程入门](/java/480-MultithreadingBasics)：会 start/join，能复现 count++ 丢失更新，并知道 synchronized 是「排队修复」。本文全部实验建立在那篇的竞态条件实验之上；
- 集合类的常规用法（Map/List 放取元素）来自 [集合框架](/java/210-CollectionFrameworkDetailed)，没学透也可以，本文用到什么当场讲什么。

## 学习目标

读完本文你将能够：

1. 用 AtomicInteger 的 compareAndSet 写出「不排队也正确」的计数与抢票逻辑，并说出 CAS 在干什么；
2. 用真实计时对比 synchronizedMap 与 ConcurrentHashMap 的吞吐差距，并写出原子复合操作 merge/compute；
3. 判断什么场景该用 CopyOnWriteArrayList，什么场景用它反而糟糕；
4. 用 ArrayBlockingQueue 写出生产者消费者骨架，解释 put 与 take 的阻塞行为；
5. 看到 ConcurrentHashMap 抛 NullPointerException，立刻想到「它不许 null」。

预计 60 到 90 分钟。

## 1. 你现在要解决什么问题

上一篇结尾用 synchronized 修好了计数器。现在把场面放大：统计一个接口的实时调用量，100 个工作线程同时累加，锁只有一把——**排队的人一多，锁本身成了瓶颈**。

java.util.concurrent（JUC）包给出了另一条路：**很多场景根本不需要锁**。计数有原子类，共享 Map 有并发容器，任务交接有阻塞队列。本文在四个最常用的场景里各立一个实验。

## 2. 原子类：CAS 直觉

AtomicInteger 的加法为什么不用锁？看最底层的 compareAndSet（简称 CAS）：「当前值等于我看到的旧值，就换成新值；否则失败」。判断与写入由硬件保证一气呵成，失败者重试即可。用「抢最后一张票」演示：

```java
import java.util.concurrent.atomic.AtomicInteger;

public class CasDemo {
    public static void main(String[] args) {
        AtomicInteger ticket = new AtomicInteger(1);

        boolean first = ticket.compareAndSet(1, 0);
        System.out.println("线程A 抢到票? " + first + " 剩余 " + ticket.get());

        boolean second = ticket.compareAndSet(1, 0);
        System.out.println("线程B 抢到票? " + second + " 剩余 " + ticket.get());
    }
}
```

预期输出：

```text
线程A 抢到票? true 剩余 0
线程B 抢到票? false 剩余 0
```

线程 B 手里的「旧值 1」已经过时（票没了），CAS 拒绝它——**每个线程基于自己看到的值做判断，过时判断会被当场识破**。日常计数不必手写 CAS 循环，`counter.incrementAndGet()` 内部就是这么转的。它取代的正是 480 篇里那把 synchronized 排队锁。

## 3. 并发 Map 对照实验

多线程共享一个 Map，老写法是拿 Collections.synchronizedMap 包一层，每个方法都整把锁。和 ConcurrentHashMap 比一比（8 线程各写 100 万次）：

```java
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class MapCompare {
    public static void main(String[] args) throws InterruptedException {
        run("synchronizedMap: ",
                Collections.synchronizedMap(new HashMap<>()));
        run("ConcurrentHashMap: ",
                new ConcurrentHashMap<>());
    }

    static void run(String label, Map<String, Integer> map) throws InterruptedException {
        Thread[] ts = new Thread[8];
        for (int i = 0; i < 8; i++) {
            ts[i] = new Thread(() -> {
                for (int j = 0; j < 1_000_000; j++) {
                    map.merge("k" + (j % 1024), 1, Integer::sum);
                }
            });
            ts[i].start();
        }
        for (Thread t : ts) t.join();
    }
}
```

某次真实运行：

```text
synchronizedMap: 621 ms
ConcurrentHashMap: 201 ms
```

三倍差距。原理一句话：synchronizedMap 全表一把锁；ConcurrentHashMap 只锁被写的桶（桶为空时甚至用 CAS 直接塞入），不同桶互不干扰。规则很简单：**多线程共享的 Map，无脑 ConcurrentHashMap**。

但注意：容器线程安全不等于复合操作安全。「读出来、加一、放回去」三步依然会丢更新，正确姿势是用它自带的原子复合方法：

```java
map.merge("k1", 1, Integer::sum);                      // 计数惯用写法
map.compute("k1", (k, v) -> v == null ? 1 : v + 1);    // 等价，逻辑更自由
```

## 4. CopyOnWriteArrayList：读多写少的极端方案

线程安全 List 用什么？读极多、写极少时（如一份几乎不变的事件监听器列表），CopyOnWriteArrayList 很合适：**每次写都复制一份新数组再原子替换，读完全无锁**。代价是写慢且占内存，读到的还可能是写入前那一瞬的旧列表。反过来「写多读少」用它，内存和耗时都会爆炸——那时该考虑读写锁（[并发设计与 AQS](/java/510-ConcurrencyDetailed) 有选型表）。

```java
var listeners = new CopyOnWriteArrayList<Runnable>();
listeners.add(() -> System.out.println("刷新界面"));
listeners.add(() -> System.out.println("保存草稿"));
for (Runnable r : listeners) r.run();   // 遍历期间别人随便增删，都不会炸
```

预期输出：

```text
刷新界面
保存草稿
```

## 5. BlockingQueue：任务交接的最小实现

统计之外还有一类需求：一个线程生产任务，另一个线程消费。手写 wait/notify 容易错，JUC 直接给了带阻塞语义的队列：**满了 put 就等，空了 take 就等**：

```java
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

public class TaskQueue {
    public static void main(String[] args) throws InterruptedException {
        BlockingQueue<String> queue = new ArrayBlockingQueue<>(2);

        Thread producer = new Thread(() -> {
            try {
                for (int i = 1; i <= 5; i++) {
                    queue.put("任务" + i);
                    System.out.println("生产 任务" + i + "，队列 " + queue.size());
                }
            } catch (InterruptedException e) { }
        }, "producer");

        Thread consumer = new Thread(() -> {
            try {
                for (int i = 1; i <= 5; i++) {
                    System.out.println("消费 " + queue.take());
                    Thread.sleep(50);
                }
            } catch (InterruptedException e) { }
        }, "consumer");

        producer.start();
        consumer.start();
        producer.join();
        consumer.join();
        System.out.println("全部处理完毕");
    }
}
```

某次真实运行（交错顺序每次不同）：

```text
消费 任务1
生产 任务1，队列 0
生产 任务2，队列 1
生产 任务3，队列 2
消费 任务2
生产 任务4，队列 2
消费 任务3
生产 任务5，队列 2
消费 任务4
消费 任务5
全部处理完毕
```

容量是 2，队列号最大只到 2——生产者在满的时候被 put 卡住，直到消费者腾位置。**十几行代码得到一个不丢任务、不爆内存的流水线**；这套骨架生产里原样能跑，也是下一篇线程池工作队列的原型。

## 6. 常见错误与调试实录

错误一：往 ConcurrentHashMap 里放 null 值（HashMap 里可是合法的），运行时：

```text
Exception in thread "main" java.lang.NullPointerException
	at java.base/java.util.concurrent.ConcurrentHashMap.putVal(ConcurrentHashMap.java:1023)
	at java.base/java.util.concurrent.ConcurrentHashMap.put(ConcurrentHashMap.java:1018)
	at NullInChm.main(NullInChm.java:6)
```

这不是随机 Bug 而是设计如此：get 返回 null 时，并发下无法区分「键不存在」和「值就是 null」，索性禁止。需要占位就放哨兵对象，或先 containsKey。

错误二：以为换了 ConcurrentHashMap 万事大吉，却自己写了「读出来判断再放回去」：

```java
Integer c = map.get(key);
if (c == null) { map.put(key, 1); } else { map.put(key, c + 1); }
```

程序不报错，计数却悄悄偏小——这正是 480 篇竞态条件的换皮。修法回到第 3 节：merge 或 compute。调试线索：拿不准一段并发代码对不对，先问「读和写之间隔着几步」。

错误三：把 AtomicInteger 当普通 int 改状态。`counter.set(counter.get() + 1)` 两步之间照样会插队，要用 incrementAndGet 或 compareAndSet。

## 7. 修改实验

1. 把 MapCompare 的线程数从 8 改到 2，再从 8 改到 32，观察差距如何变化，用一句话解释「锁竞争与线程数」的关系；
2. 把 TaskQueue 的队列容量从 2 改成 1，再改成 10，对照输出里的「队列」数字，验证生产节奏如何被容量反向约束；
3. 给第 2 节的 CasDemo 补一个线程 C：先 `ticket.set(1)` 再 compareAndSet(1, 0)，预测它能否抢到——想想这暴露了 CAS 依赖什么前提。

## 8. 小练习

预测题（先写答案再运行）：两个线程同时执行 `new AtomicInteger(0)` 上的 `incrementAndGet()` 各 10 次，最终 get() 的可能取值范围是？如果把 AtomicInteger 换成普通 int 且不加锁呢？自查：前者恒为 20；后者在 11 到 20 之间浮动，永不准确。

修改题（15 分钟）：把第 5 节的消费者改成两个抢同一个队列。要求：每个任务只被消费一次；程序结束时打印两个消费者各处理了几件。提示：用 AtomicInteger 统计；验收：总数恒等于 5。

修 Bug 题（10 分钟）：下面的代码单线程没问题，多线程环境就抛异常，报错原文如下，先定位再改：

```java
Map<String, Integer> score = new ConcurrentHashMap<>();
score.put("alice", null);
```

报错原文：`Exception in thread "main" java.lang.NullPointerException at java.base/java.util.concurrent.ConcurrentHashMap.putVal(...)`。说出它和 HashMap 的差异，并给出两种不改成 HashMap 的修复写法。

## 9. 什么时候用 / 不用 JUC 工具

该用：任何被多线程触碰的计数、共享集合、任务交接——默认姿势，成本几乎为零。不用：变量只有一个线程看得到（方法内局部变量），普通类型就好；跨多步保持一致的复杂状态原子类管不了，回到锁或把状态收进并发容器（[线程池实战](/java/500-ThreadPoolExecutorPractice) 会大量用到 BlockingQueue）。

## 10. 与之前和之后的知识的关系

- 往前：[多线程入门](/java/480-MultithreadingBasics) 立了「共享可变数据要保护」的规矩，本文把锁这把钝刀换成四把趁手工具；
- 往后，并发四篇的分工：**480 裸线程与 synchronized**，**本文不锁也能对**，**[线程池实战](/java/500-ThreadPoolExecutorPractice) 解决线程由谁管**——阻塞队列在那里成为任务排队的核心部件，**[并发设计与 AQS](/java/510-ConcurrencyDetailed) 回答这些工具共同的底层套路**；
- 更远：[CompletableFuture](/java/520-CompletableFutureAsync) 把「任务交接」升级成链式编排。

## 11. 官方文档

- java.util.concurrent 包总览（先读包描述）：https://docs.oracle.com/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html
- AtomicInteger API：https://docs.oracle.com/javase/21/docs/api/java.base/java/util/concurrent/atomic/AtomicInteger.html
- ConcurrentHashMap API（merge/compute 的行为约定）：https://docs.oracle.com/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html

## 12. 自我检查

- 能用「过时判断会被识破」一句话向同事解释 CAS，并现场演示 compareAndSet 的 true/false；
- 能报出两种 Map 差距的数量级及其来源；
- 拿到需求能直接点名工具：计数、共享 Map、读多写少 List、任务交接；
- 看到 ConcurrentHashMap 抛 NPE 不再怀疑人生。

## 本章总结

JUC 的思路是「让对的操作变得便宜」：原子类用 CAS 把「判断再写入」压成一步；ConcurrentHashMap 把锁缩小到桶；CopyOnWriteArrayList 干脆让写复制、读免锁；BlockingQueue 用阻塞语义替代手写等待。工具选对了，锁就从日常动作变成最后手段。

## 下一步

进入 [线程池实战](/java/500-ThreadPoolExecutorPractice)：线程本身成了要管理的稀缺资源，看 ThreadPoolExecutor 的七个参数如何分工，以及 execute 与 submit 吞异常的那场真实事故。
