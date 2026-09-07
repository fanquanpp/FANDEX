---
order: 580
title: Java 阻塞队列 BlockingQueue 语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Java 阻塞队列 BlockingQueue 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'java/052-JUCConcurrency'
  - 'java/053-ConcurrencyDetailed'
prerequisites:
  - 'java/050-MultithreadingBasics'
---

## 0. 本节阅读指引（先读这一节）

本篇是「BlockingQueue 阻塞队列」语法速查手册，按需查阅。

零基础第一遍只读：通用操作、ArrayBlockingQueue、LinkedBlockingQueue、生产者消费者示例；其余队列变体遇到再查。

前置：047 多线程基础。


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
