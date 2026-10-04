---
order: 380
title: "多线程入门：把 3 秒的串行下载压缩到 1 秒"
module: 'java'
category: 后端技术
difficulty: intermediate
description: "以「同时下载三个文件，串行 3 秒并行 1 秒」引入，讲透 Thread 与 Runnable、start 与 run 区别实验、sleep 与 join、竞态条件丢失更新与 synchronized 最小修复，附 IllegalThreadStateException 与 InterruptedException 调试实录。"
author: fanquanpp
updated: '2026-10-05'
related:
  - 'java/490-JucConcurrencyTools'
  - 'java/500-ThreadPoolExecutorPractice'
  - 'java/510-ConcurrencyDetailed'
  - 'java/290-LambdaFunctionalProgramming'
prerequisites:
  - 'java/100-MethodDetailed'
---

## 前置知识

- 已完成 [方法详解](/java/100-MethodDetailed)：会定义并调用方法，理解「值传递」——竞态条件实验的根源就藏在它讲过的「副本」概念里；
- 代码里会出现 `() -> download("a.zip")` 这样的写法，它叫 Lambda（[Lambda 与函数式编程](/java/290-LambdaFunctionalProgramming) 讲透）。现在只需知道：这是一段「可以塞给别人执行的方法」，没学过也照样能跑通每个实验。

## 学习目标

读完本文你将能够：

1. 用 Thread 与 Runnable 两种写法启动新线程，并说出生产代码推荐哪一种、为什么；
2. 解释 start() 与 run() 的区别，靠输出里的线程名判断程序到底有没有真的并发；
3. 用 join() 让主线程等子线程干完活，用 sleep() 模拟耗时操作；
4. 复现「计数器丢失更新」的竞态条件，并用 synchronized 做最小修复；
5. 看到 IllegalThreadStateException 与未捕获的 InterruptedException，知道各自在说什么、怎么改。

预计 60 到 90 分钟。

## 1. 你现在要解决什么问题

写个小工具，从网上下载三个文件。网络等待是纯粹的「干等」，每个文件假设要 1 秒。按 [方法详解](/java/100-MethodDetailed) 学到的习惯，把下载收口成一个方法，然后按顺序调用：

```java
public class DownloadDemo {
    static void download(String file) {
        try { Thread.sleep(1000); } catch (InterruptedException e) { }
        System.out.println(file + " 完成");
    }

    public static void main(String[] args) throws InterruptedException {
        long start = System.currentTimeMillis();
        download("a.zip");
        download("b.zip");
        download("c.zip");
        System.out.println("串行耗时: " + (System.currentTimeMillis() - start) + " ms");
    }
}
```

预期输出：

```text
a.zip 完成
b.zip 完成
c.zip 完成
串行耗时: 3009 ms
```

3 秒。可你的网络带宽没满、CPU 没忙，三个下载明明谁也不依赖谁——**互相独立的等待任务被排成了队，这就是串行的代价**。让它们同时进行，就是线程存在的意义。

## 2. 最小修复：三个线程同时下载

```java
public class DownloadParallel {
    static void download(String file) {
        try { Thread.sleep(1000); } catch (InterruptedException e) { }
        System.out.println(file + " 完成");
    }

    public static void main(String[] args) throws InterruptedException {
        long start = System.currentTimeMillis();
        Thread t1 = new Thread(() -> download("a.zip"));
        Thread t2 = new Thread(() -> download("b.zip"));
        Thread t3 = new Thread(() -> download("c.zip"));
        t1.start();
        t2.start();
        t3.start();
        t1.join();
        t2.join();
        t3.join();
        System.out.println("并行耗时: " + (System.currentTimeMillis() - start) + " ms");
    }
}
```

某次真实运行（顺序可能不同）：

```text
b.zip 完成
c.zip 完成
a.zip 完成
并行耗时: 1008 ms
```

两个新面孔：

- `new Thread(任务)` 创建了一个线程，任务就是那段 Lambda；
- `t.start()` 让它开跑——操作系统会真的分一条执行流给它；
- `t.join()` 表示「我（main 线程）等你跑完」。没有这三行 join，main 会立刻打印耗时退出，子线程的输出可能来不及出现。

注意完成的顺序变成了 b、c、a：**多个线程的执行顺序由操作系统调度决定，你的代码只能发起，不能保证先后**。这是并发编程所有麻烦的源头，记住它。

## 3. Thread 与 Runnable：任务与执行分离

继承 Thread 也能达到目的，但写法把「任务」和「执行者」焊死在一起：

```java
class DownloadTask extends Thread {
    private final String file;
    DownloadTask(String file) { this.file = file; }

    @Override
    public void run() {
        System.out.println(file + " 由 " + getName() + " 下载");
    }
}
// new DownloadTask("a.zip").start();
```

Runnable 写法则把任务单独描述，谁来执行它不关心：

```java
Runnable task = () -> download("a.zip");
new Thread(task).start();
```

推荐 Runnable，两个理由：Java 是单继承，继承 Thread 就占掉了唯一的继承名额；任务与执行分离后，同一个任务可以交给线程池复用（[线程池实战](/java/500-ThreadPoolExecutorPractice) 的主角）。

## 4. 实验：start 与 run 的区别

把并行示例里的 `t.start()` 换成 `t.run()`，程序不报错、照样出结果，但看线程名就穿帮了：

```java
public class StartVsRun {
    public static void main(String[] args) throws InterruptedException {
        Runnable job = () -> System.out.println("执行者: " + Thread.currentThread().getName());
        Thread t = new Thread(job, "worker-1");
        t.run();
        t.start();
        t.join();
    }
}
```

预期输出：

```text
执行者: main
执行者: worker-1
```

第一行是 `t.run()` 的产物：线程名是 main——**run 只是一个普通方法，直接调用就是在当前线程里执行，毫无并发**。第二行 `t.start()` 才让 JVM 请求操作系统开新线程，名字才是 worker-1。这个 Bug 不抛异常，只是悄悄把「并行」退化成「串行」，是初学者最阴险的坑。

## 5. 共享变量出事了：竞态条件实验

线程各干各的相安无事，一旦共享同一个变量，事情就不对了。两个线程各把同一个计数器加 100000 次：

```java
public class RaceCounter {
    static int count = 0;

    public static void main(String[] args) throws InterruptedException {
        Runnable job = () -> {
            for (int i = 0; i < 100_000; i++) {
                count++;
            }
        };
        Thread t1 = new Thread(job);
        Thread t2 = new Thread(job);
        t1.start();
        t2.start();
        t1.join();
        t2.join();
        System.out.println("期望 200000, 实际 " + count);
    }
}
```

三次真实运行：

```text
期望 200000, 实际 128226
期望 200000, 实际 106162
期望 200000, 实际 124948
```

每次都不够数，而且每次都不一样。原因：`count++` 不是一步，是「读出值、加 1、写回去」三步。两个线程可以同时读到同一个旧值，各自加 1 后写回同一个数——**一次加法凭空消失**。几万次加法里丢几百次，肉眼根本看不出来，这叫竞态条件（race condition）。

## 6. 最小修复：synchronized

给改动共享变量的方法贴上 synchronized，同一时刻只允许一个线程进去：

```java
static int count = 0;

static synchronized void inc() {
    count++;
}
// 循环里改为调用 inc();
```

再跑一次，输出稳定：

```text
期望 200000, 实际 200000
```

代价是线程要排队，吞吐会降。排队排狠了怎么办？[JUC 并发工具](/java/490-JucConcurrencyTools) 给出「不排队也对」的答案。

## 7. 修改实验

1. 把下载改成 5 个文件，时长分别 500/300/200/400/100 ms，先预测总耗时约等于多少再运行验证（答案藏在本节末）；
2. 把并行版里的三行 `join()` 全删掉，预测输出会变成什么样，运行观察「耗时」打印在什么位置；
3. 给 RaceCounter 的 `count++` 改成 `count = count + 1`，验证结果依然不准——换写法没用，问题出在「三步操作」本身。

实验 1 自查：并行总耗时约等于最长的那个下载（500 ms 出头），不是求和。

## 8. 常见错误与调试实录

错误一：直接在线程任务里写 `Thread.sleep(1000);` 不处理异常，编译都过不去，javac 报：

```text
SleepRaw.java:3: error: unreported exception InterruptedException; must be caught or declared to be thrown
        Thread.sleep(100);
                    ^
1 error
```

读报错三步：先看行号，再看错误类型（异常没处理），最后照提示改——sleep 声明了「我可能被中断」，调用者必须捕获它或继续向上声明。本文示例都用了 try/catch 兜底。

错误二：对同一个线程调用两次 start()，运行时：

```text
Exception in thread "main" java.lang.IllegalThreadStateException
	at java.base/java.lang.Thread.start(Thread.java:1416)
	at DoubleStart.main(DoubleStart.java:5)
```

报错原文已经说明问题：线程状态非法。一个线程只能启动一次，想再跑一个任务，就再 new 一个线程（或交给线程池）。

错误三：start 误写成 run——不报任何错，只是输出里的线程名是 main。排查动作：在任务里打印 `Thread.currentThread().getName()`，名字不是你起的那个，就是没真正开线程。

## 9. 什么时候该用 / 不该用裸线程

该用：一次性的后台任务（如桌面程序的「导出报表」，主界面不等它）；本地小工具并行处理几个文件。
不该用：服务端代码里「每个请求 new 一个线程」——请求一多线程数失控，正确姿势是线程池（[线程池实战](/java/500-ThreadPoolExecutorPractice)）；任务之间共享数据且竞争激烈——先看看不锁的写法（[JUC 并发工具](/java/490-JucConcurrencyTools)）。

## 10. 小练习

预测题（先写答案再运行）：下面的代码输出顺序是什么？

```java
Thread t = new Thread(() -> System.out.println("B"));
t.run();
System.out.println("A");
```

自查：若答的是 A、B，就掉进了第 4 节的坑——t.run() 是普通方法调用，实际输出 B 在前 A 在后，永远如此。

修改题（15 分钟）：把下载程序改成 5 个文件并行下载，每个文件耗时不同；要求打印「总耗时」且总耗时明显小于各文件耗时之和。运行两次，观察完成顺序是否一致，用一句话解释原因。

修 Bug 题（5 分钟）：下面程序想开两个线程却抛了异常，按读报错三步定位：

```java
Thread t = new Thread(() -> System.out.println("working"));
t.start();
t.start();
```

报错原文：`Exception in thread "main" java.lang.IllegalThreadStateException at java.base/java.lang.Thread.start(...)`。先指出哪一行、什么状态非法，再给出修复写法。

## 11. 与之前和之后的知识的关系

- 往前：[方法详解](/java/100-MethodDetailed) 的方法封装是本文示例的骨架；「丢失更新」本质是多个线程对同一份「副本」各自为政；
- 往后，本模块的并发四篇这样分工：**本文（480）讲裸线程与 synchronized**——怎么开线程、怎么等待、共享变量为什么会错；**[JUC 并发工具](/java/490-JucConcurrencyTools) 讲「不锁也能对」**——原子类与线程安全集合；**[线程池实战](/java/500-ThreadPoolExecutorPractice) 讲生产环境怎么管理线程**；**[并发设计与 AQS](/java/510-ConcurrencyDetailed) 讲设计层**——可见性、死锁与同步器的原理直觉；
- 更远：[虚拟线程](/java/550-JavaVirtualThread) 会改写「线程很贵」这个前提。

## 12. 官方文档

- Oracle 官方并发教程（Thread/Runnable/join 全覆盖）：https://docs.oracle.com/javase/tutorial/essential/concurrency/index.html
- synchronized 方法与代码块：https://docs.oracle.com/javase/tutorial/essential/concurrency/locksync.html
- Thread 类 API（start、join、sleep 的权威描述）：https://docs.oracle.com/javase/21/docs/api/java.base/java/lang/Thread.html

## 13. 自我检查

- 能不看示例默写「串行改并行」的五步：建任务、new Thread、start、join、计时；
- 能靠输出中的线程名一眼识破 start 写成 run 的程序；
- 能向别人解释 count++ 为什么会丢更新，并现场复现；
- 拿到 unreported exception InterruptedException 和 IllegalThreadStateException 时，能分别说出整改方法。

## 本章总结

线程是一条独立执行流：new Thread 发起，start 才开跑，join 等它收工，run 直接调只是普通方法。线程执行顺序不可预测，所以共享可变数据就是雷区——count++ 的三步操作会丢更新，synchronized 用排队换正确。这些是并发的「物理规则」，下一篇开始学「规则之上」的工具。

## 下一步

进入 [JUC 并发工具](/java/490-JucConcurrencyTools)：AtomicInteger 与 ConcurrentHashMap 让你常常一行代码就不用锁；随后 [线程池实战](/java/500-ThreadPoolExecutorPractice) 解决「线程该由谁来管」。
