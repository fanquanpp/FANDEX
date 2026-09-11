---
order: 540
title: Java Executor 与 ForkJoin
module: 'java'
category: 后端技术
difficulty: beginner
description: Java Executor 与 ForkJoin 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'java/510-ConcurrencyDetailed'
  - 'java/520-CompletableFutureAsync'
prerequisites:
  - 'java/480-MultithreadingBasics'
---

## 0. 本节阅读指引（先读这一节）

本篇是「Executor 与 ForkJoin」语法速查手册，按需查阅。

零基础第一遍只读：ExecutorService 创建、提交任务、Future 操作、关闭线程池；ScheduledExecutorService、ForkJoinPool、RecursiveTask、并行流底层、CompletionService 遇到再查。

前置：047 多线程基础。


## ExecutorService 创建

**基本写法：固定线程池**
`Executors.newFixedThreadPool(<线程数>);`
```java
// 创建固定大小线程池
ExecutorService pool = Executors.newFixedThreadPool(4);
```

---

**基本写法：缓存线程池**
`Executors.newCachedThreadPool();`
```java
// 按需创建线程的缓存池
ExecutorService pool = Executors.newCachedThreadPool();
```

---

**基本写法：单线程池**
`Executors.newSingleThreadExecutor();`
```java
// 单线程顺序执行
ExecutorService pool = Executors.newSingleThreadExecutor();
```

---

**基本写法：定时任务线程池**
`Executors.newScheduledThreadPool(<线程数>);`
```java
// 支持定时和周期任务的线程池
ScheduledExecutorService pool = Executors.newScheduledThreadPool(2);
```

---

**基本写法：虚拟线程池（Java 21+）**
`Executors.newVirtualThreadPerTaskExecutor();`
```java
// 每任务一虚拟线程的执行器
ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor();
```

---

## 自定义 ThreadPoolExecutor

**基本写法：自定义线程池**
`new ThreadPoolExecutor(<核心>, <最大>, <空闲时长>, <单位>, <队列>);`
```java
// 自定义线程池参数
ThreadPoolExecutor pool = new ThreadPoolExecutor(
    2, 4, 60L, TimeUnit.SECONDS, new LinkedBlockingQueue<>(100));
```

---

**基本写法：自定义线程工厂**
`new ThreadPoolExecutor(<参数>, <队列>, <线程工厂>);`
```java
// 设置命名线程工厂便于排查
ThreadPoolExecutor pool = new ThreadPoolExecutor(
    2, 4, 60L, TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(),
    new ThreadFactoryBuilder().setNameFormat("worker-%d").build());
```

---

**基本写法：自定义拒绝策略**
`new ThreadPoolExecutor(<参数>, <队列>, <工厂>, <拒绝策略>);`
```java
// 队列满时由调用线程执行
ThreadPoolExecutor pool = new ThreadPoolExecutor(
    2, 4, 60L, TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(10),
    new ThreadPoolExecutor.CallerRunsPolicy());
```

---

## 提交任务

**基本写法：提交 Runnable**
`<pool>.submit(<Runnable>);`
```java
// 提交无返回值任务
Future<?> f = pool.submit(() -> doWork());
```

---

**基本写法：提交 Callable**
`<pool>.submit(<Callable>);`
```java
// 提交有返回值任务
Future<Integer> f = pool.submit(() -> compute());
```

---

**基本写法：批量提交**
`<pool>.invokeAll(<任务集合>);`
```java
// 批量提交并等待全部完成
List<Future<Integer>> futures = pool.invokeAll(tasks);
```

---

**基本写法：任一完成返回**
`<pool>.invokeAny(<任务集合>);`
```java
// 任一任务完成即返回结果
Integer r = pool.invokeAny(tasks);
```

---

## Future 操作

**基本写法：获取结果**
`<future>.get();`
```java
// 阻塞等待结果
Integer r = future.get();
```

---

**基本写法：超时获取**
`<future>.get(<超时>, <单位>);`
```java
// 最多等待 1 秒
Integer r = future.get(1, TimeUnit.SECONDS);
```

---

**基本写法：取消任务**
`<future>.cancel(<是否中断>);`
```java
// 中断运行中的任务
future.cancel(true);
```

---

**基本写法：判断完成**
`<future>.isDone();`
```java
// 判断任务是否完成
boolean done = future.isDone();
```

---

## 关闭线程池

**基本写法：优雅关闭**
`<pool>.shutdown();`
```java
// 不再接受新任务，等待已提交任务完成
pool.shutdown();
```

---

**基本写法：立即关闭**
`<pool>.shutdownNow();`
```java
// 尝试中断所有任务并返回未执行任务
List<Runnable> notRun = pool.shutdownNow();
```

---

**基本写法：等待终止**
`<pool>.awaitTermination(<超时>, <单位>);`
```java
// 等待关闭完成最多 60 秒
pool.awaitTermination(60, TimeUnit.SECONDS);
```

---

**基本写法：try-with-resources 关闭**
`try (ExecutorService pool = ...) { }`
```java
// Java 19+ 自动关闭执行器
try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
    pool.submit(() -> doWork());
}
```

---

## ScheduledExecutorService 定时任务

**基本写法：延迟执行**
`<pool>.schedule(<任务>, <延迟>, <单位>);`
```java
// 延迟 5 秒后执行一次
pool.schedule(() -> doWork(), 5, TimeUnit.SECONDS);
```

---

**基本写法：固定速率周期**
`<pool>.scheduleAtFixedRate(<任务>, <初始延迟>, <周期>, <单位>);`
```java
// 每 10 秒执行一次
pool.scheduleAtFixedRate(() -> doWork(), 0, 10, TimeUnit.SECONDS);
```

---

**基本写法：固定延迟周期**
`<pool>.scheduleWithFixedDelay(<任务>, <初始延迟>, <间隔>, <单位>);`
```java
// 上次结束后 10 秒再执行
pool.scheduleWithFixedDelay(() -> doWork(), 0, 10, TimeUnit.SECONDS);
```

---

## ForkJoinPool

**基本写法：创建 ForkJoinPool**
`new ForkJoinPool(<并行度>);`
```java
// 创建并行度为 CPU 核数的 ForkJoinPool
ForkJoinPool pool = new ForkJoinPool(Runtime.getRuntime().availableProcessors());
```

---

**基本写法：提交 RecursiveTask**
`<pool>.invoke(<任务>);`
```java
// 提交有返回值的分治任务
Integer r = pool.invoke(new SumTask(0, 1000));
```

---

**基本写法：提交 RecursiveAction**
`<pool>.execute(<任务>);`
```java
// 提交无返回值的分治任务
pool.execute(new PrintTask(0, 100));
```

---

## RecursiveTask 分治

**基本写法：继承 RecursiveTask**
`class <类> extends RecursiveTask<<返回类型>> { protected <类型> compute() {} }`
```java
// 分治任务带返回值
class SumTask extends RecursiveTask<Integer> {
    private final int start, end;
    protected Integer compute() {
        if (end - start < 100) return start + end;
        SumTask left = new SumTask(start, (start + end) / 2);
        SumTask right = new SumTask((start + end) / 2 + 1, end);
        left.fork();
        return right.compute() + left.join();
    }
}
```

---

**基本写法：fork 异步执行**
`<task>.fork();`
```java
// 异步提交子任务
left.fork();
```

---

**基本写法：join 等待结果**
`<task>.join();`
```java
// 阻塞等待子任务结果
int r = left.join();
```

---

## 并行流底层

**基本写法：并行流使用 ForkJoinPool**
`<集合>.parallelStream().<操作>`
```java
// 并行流默认使用公共 ForkJoinPool
list.parallelStream().mapToInt(Integer::intValue).sum();
```

---

## CompletionService

**基本写法：按完成顺序获取**
`new ExecutorCompletionService<<类型>>(<pool>);`
```java
// 按完成顺序获取结果
CompletionService<Integer> cs = new ExecutorCompletionService<>(pool);
cs.submit(() -> compute());
Future<Integer> f = cs.take();
Integer r = f.get();
```
