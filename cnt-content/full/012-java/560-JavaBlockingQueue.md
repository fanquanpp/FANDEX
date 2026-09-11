---
order: 560
title: Java 阻塞队列 BlockingQueue 语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Java 阻塞队列 BlockingQueue 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'java/500-JUCConcurrency'
  - 'java/510-ConcurrencyDetailed'
  - 'java/540-ExecutorForkJoinPool'
prerequisites:
  - 'java/480-MultithreadingBasics'
---

## 0. 本节阅读指引（先读这一节）

本篇是「BlockingQueue 阻塞队列」语法速查手册，按需查阅。

零基础第一遍只读：概念引入、四组方法对照表、完整生产者消费者示例；然后按需查 ArrayBlockingQueue、LinkedBlockingQueue 等队列变体速查段。

前置：047 多线程基础。

## 概念引入：线程间的"传送带"

生产者消费者是最经典的并发模型：一方产生数据、另一方处理数据，两边速度还经常不匹配。手写方案需要 `wait`/`notify` 加一把锁，极易出错。`BlockingQueue` 把这套协作封装成一条**线程安全的传送带**：

- 传送带满了，生产者 `put` 时自动停下来等（阻塞）；
- 传送带空了，消费者 `take` 时自动停下来等；
- 两边都不需要自己写任何 `synchronized`/`wait`/`notify`。

类比外卖取餐口：骑手（生产者）把餐放上传送格，满了就等柜子腾位；顾客（消费者）取餐，柜子空了就站着等新餐入柜。

## 四组方法对照表（背下这张表）

同一个"放入/取出"动作，`BlockingQueue` 提供四种失败策略：

| 动作 | 满了/空了立即抛异常 | 返回特殊值 | 无限阻塞 | 限时阻塞 |
|------|--------------------|-----------|----------|----------|
| 放入 | `add(e)` 抛 `IllegalStateException` | `offer(e)` 返回 false | `put(e)` | `offer(e, 时间, 单位)` |
| 取出 | `remove()` 抛 `NoSuchElementException` | `poll()` 返回 null | `take()` | `poll(时间, 单位)` |
| 检查队首 | `element()` | `peek()` 返回 null | — | — |

选择口诀：**业务循环里用 `put`/`take`（阻塞语义最自然）；不想被卡死用限时 `offer`/`poll`；`add`/`remove` 的抛异常版本几乎只在断言场景用**。

## 完整示例：生产者消费者（含优雅停机）

```java
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

public class ProducerConsumerDemo {
    public static void main(String[] args) throws InterruptedException {
        // 有界队列：容量 3，天然对生产者形成"背压"（压不住速度就等）
        BlockingQueue<Integer> queue = new LinkedBlockingQueue<>(3);

        // 生产者：产出 0-4 五个数据
        Thread producer = new Thread(() -> {
            try {
                for (int i = 0; i < 5; i++) {
                    queue.put(i);                     // 队列满时阻塞等待
                    System.out.println("生产 " + i);
                }
                queue.put(-1);                        // "毒丸"：约定消费者见到 -1 就退出
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });

        // 消费者：处理数据，遇到毒丸收工
        Thread consumer = new Thread(() -> {
            try {
                while (true) {
                    int data = queue.take();          // 队列空时阻塞等待
                    if (data == -1) break;
                    System.out.println("  消费 " + data);
                }
                System.out.println("消费者收工");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });

        producer.start();
        consumer.start();
        producer.join();
        consumer.join();
    }
}
// 预期输出（put 成功后才打印"生产"，顺序可推导；每行前的缩进区分角色）：
// 生产 0
// 生产 1
// 生产 2
//   消费 0      <- 队列已满，生产者 put(3) 阻塞，直到消费者取走 0
// 生产 3
//   消费 1
// 生产 4
//   消费 2
//   消费 3
//   消费 4
// 消费者收工
```

"-1 当毒丸"是多消费者场景外的常用停机手法；多消费者时每个消费者发一颗毒丸，或改用 `poll(超时)` 加停机标志位。

## 队列选型速记

| 队列 | 有界? | 特点 | 典型场景 |
|------|-------|------|----------|
| `ArrayBlockingQueue` | 必须 | 数组实现，一把锁，内存固定 | 流量削峰、固定缓冲 |
| `LinkedBlockingQueue` | 可选 | 链表实现，读写两把锁，吞吐略高 | 通用任务通道 |
| `SynchronousQueue` | 无容量 | put 必须等 take 直接交接 | `newCachedThreadPool` 的队列 |
| `PriorityBlockingQueue` | 无界 | 按优先级出队 | 任务调度、告警分级 |
| `DelayQueue` | 无界 | 到期才能取出 | 延迟任务、缓存过期 |
| `LinkedTransferQueue` | 无界 | `transfer` 等消费者到场才返回 | 高性能交接 |

## 常见陷阱

**陷阱一：默认构造的无界队列悄悄吃内存。** `new LinkedBlockingQueue<>()` 容量是 `Integer.MAX_VALUE`，生产快于消费时队列无限堆积直到 OOM。除非能证明"生产速率有上界"，**永远优先用有界队列**。

**陷阱二：take() 抛 InterruptedException 的处理姿势。** 捕获后要 `Thread.currentThread().interrupt()` 恢复中断标记，否则上层再也感知不到停机信号。

**陷阱三：poll() 返回 null 被当成正常元素。** 用 `poll()` 的循环要判 null；元素本身可能为 null 的业务，禁止向队列放 null（`BlockingQueue` 规定不允许 null 元素，put 会抛 NPE）。

**陷阱四：以为 size()/remainingCapacity() 能做业务判断。** 并发下查询结果瞬间过期，只能用于监控，不能用于"先看满没满再 put"的决策。

**陷阱五：SynchronousQueue 当普通队列用。** 它没有任何存储能力，put 不等到消费者就阻塞；理解成"接力棒"而不是"仓库"。

## ArrayBlockingQueue 有界数组队列

**基本写法：创建有界队列**
`new ArrayBlockingQueue<<类型>>(<容量>);`
```java
// 创建容量 100 的有界阻塞队列
ArrayBlockingQueue<String> q = new ArrayBlockingQueue<>(100);
```

---

**基本写法：公平队列**
`new ArrayBlockingQueue<<类型>>(<容量>, true);`
```java
// 使用公平锁的队列
ArrayBlockingQueue<String> q = new ArrayBlockingQueue<>(100, true);
```

---

## LinkedBlockingQueue 链式队列

**基本写法：创建链式队列**
`new LinkedBlockingQueue<<类型>>();`
```java
// 创建默认容量 Integer.MAX_VALUE 的链式队列
LinkedBlockingQueue<String> q = new LinkedBlockingQueue<>();
```

---

**基本写法：指定容量**
`new LinkedBlockingQueue<<类型>>(<容量>);`
```java
// 创建容量 1000 的链式队列
LinkedBlockingQueue<String> q = new LinkedBlockingQueue<>(1000);
```

---

## SynchronousQueue 同步队列

**基本写法：创建同步队列**
`new SynchronousQueue<<类型>>();`
```java
// 每个 put 必须等待一个 take
SynchronousQueue<String> q = new SynchronousQueue<>();
```

---

## PriorityBlockingQueue 优先级队列

**基本写法：创建优先级队列**
`new PriorityBlockingQueue<<类型>>();`
```java
// 自然顺序的优先级队列
PriorityBlockingQueue<Integer> q = new PriorityBlockingQueue<>();
```

---

**基本写法：带比较器**
`new PriorityBlockingQueue<<类型>>(<初始容量>, <比较器>);`
```java
// 自定义比较器
PriorityBlockingQueue<String> q = new PriorityBlockingQueue<>(11, Comparator.reverseOrder());
```

---

## DelayQueue 延迟队列

**基本写法：创建延迟队列**
`new DelayQueue<<类型>>();`
```java
// 元素必须实现 Delayed 接口
DelayQueue<DelayedTask> q = new DelayQueue<>();
```

---

## 通用操作

**基本写法：阻塞入队**
`<queue>.put(<元素>);`
```java
// 队列满时阻塞
q.put("item");
```

---

**基本写法：阻塞出队**
`<queue>.take();`
```java
// 队列空时阻塞
String item = q.take();
```

---

**基本写法：offer 超时入队**
`<queue>.offer(<元素>, <超时>, <单位>);`
```java
// 最多等待 5 秒
boolean ok = q.offer("item", 5, TimeUnit.SECONDS);
```

---

**基本写法：poll 超时出队**
`<queue>.poll(<超时>, <单位>);`
```java
// 最多等待 5 秒取元素
String item = q.poll(5, TimeUnit.SECONDS);
```

---

**基本写法：剩余容量**
`<queue>.remainingCapacity();`
```java
// 查询剩余容量
int cap = q.remainingCapacity();
```

---

## 生产者消费者示例

**基本写法：阻塞队列用作通道**
```java
BlockingQueue<String> queue = new LinkedBlockingQueue<>(10);
// 生产者
new Thread(() -> { for (int i = 0; i < 5; i++) queue.put("p" + i); }).start();
// 消费者
new Thread(() -> { for (int i = 0; i < 5; i++) System.out.println(queue.take()); }).start();
```

## 小结

初学者记住三点：

> 1. BlockingQueue 是线程安全传送带：满则 put 等，空则 take 等，无需自己写锁。
> 2. 四组方法按"抛异常/返特殊值/阻塞/限时"选；业务循环用 put/take。
> 3. 队列必须有界，无界队列等于把内存泄漏写进了架构。

进阶者还需注意：

- `LinkedBlockingQueue` 读写分离锁，吞吐通常优于 `ArrayBlockingQueue`；但数组实现预分配内存、无节点 GC 压力，小缓冲场景两者差距以实测为准。
- 线程池的队列参数（056）本质就是本篇：`newFixedThreadPool` 用无界 LinkedBlockingQueue，`newCachedThreadPool` 用 SynchronousQueue——理解队列才能理解线程池行为。
- 高吞吐交接看 `LinkedTransferQueue`；延迟执行看 `DelayQueue` 或调度线程池。
