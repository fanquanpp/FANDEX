---
order: 570
title: Java 同步器 CountDownLatch/CyclicBarrier/Phaser 语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Java 同步器 CountDownLatch/CyclicBarrier/Phaser 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'java/052-JUCConcurrency'
  - 'java/053-ConcurrencyDetailed'
prerequisites:
  - 'java/050-MultithreadingBasics'
---

## 0. 本节阅读指引（先读这一节）

本篇是「CountDownLatch / CyclicBarrier / Phaser」语法速查手册，按需查阅。

零基础第一遍只读：CountDownLatch 一次性倒数与 CyclicBarrier 可循环屏障，理解「一个等待多个、多个互相等待」的区别；Phaser、Exchanger 遇到再查。

前置：047 多线程基础。


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
