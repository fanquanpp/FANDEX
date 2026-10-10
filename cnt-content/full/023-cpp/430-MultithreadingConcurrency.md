---
order: 460
title: 多线程入门：从单线程 10 秒到四线程 3 秒
module: 'cpp'
category: 计算机科学
difficulty: advanced
description: "以「图片批量缩放单线程约 10 秒、四线程约 3 秒」引入，讲透 std::thread 创建与 join 的最小生命周期、detach 的危险一句话、非原子计数丢失更新的竞态对照实验与 mutex 加 lock_guard 修复，警告数据竞争是未定义行为并与 030 篇 UB 呼应，最后给出 atomic 最小替换示例与 ThreadSanitizer 实录。"
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cpp/440-CoordinationAndAsyncPrimitives'
  - 'cpp/160-RAIIResourceManagement'
  - 'cpp/030-CppBasicSyntax'
  - 'cpp/450-CppMemoryModel'
prerequisites:
  - 'cpp/120-CppPointers'
---

## 前置知识

- 已完成 [C++ 指针](/cpp/120-CppPointers)：知道内存里同一个地址可以被多方访问——线程共享的正是同一片内存；
- 知道 [未定义行为](/cpp/030-CppBasicSyntax) 这个词的含义（越界数组那篇）。没读过也行，本文第 4 节会把这个概念接到线程上。

## 学习目标

读完本文你将能够：

1. 用 `std::thread` 把一个 CPU 密集任务拆给多个线程，并用 `join` 收队；
2. 解释计数器为什么会在多线程下「丢更新」，并分别用 `mutex + lock_guard` 与 `atomic` 修复它；
3. 说出数据竞争为什么是未定义行为，而不是「偶尔数错」；
4. 忘记 `join` 时能认出 `terminate called without an active exception` 这条报错并定位原因。

预计 60 到 90 分钟。

## 1. 你现在要解决什么问题

手头有个批量缩放 1000 张图片的任务，单线程跑约 10 秒。你的机器有 4 个核心，可 `for` 循环一次只喂饱一个——另外三个核心在旁边看戏。目标：把活分给四个线程，压到 3 秒左右（不是 2.5 秒，创建线程和调度本身有开销）。

先写下可测量的单线程基线（用 100 毫秒的休眠模拟单张缩放耗时，让程序在你的机器上结果可复现）：

```cpp
// scale.cpp
#include <chrono>
#include <iostream>
#include <thread>

void scaleImage(int id) {
    std::this_thread::sleep_for(std::chrono::milliseconds(100));  // 模拟缩放耗时
}

int main() {
    auto start = std::chrono::steady_clock::now();
    for (int i = 0; i < 40; ++i) scaleImage(i);
    auto end = std::chrono::steady_clock::now();
    std::cout << "cost: "
              << std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count()
              << " ms\n";
}
```

预期输出：

```text
cost: 4003 ms
```

## 2. 核心概念一：std::thread 与 join

`std::thread` 构造即启动：给它一个可调用对象和参数，它就在新线程上跑起来。把 40 张图按 `i % 4` 分给四个线程：

```cpp
#include <vector>

int main() {
    auto start = std::chrono::steady_clock::now();
    std::vector<std::thread> workers;
    for (int w = 0; w < 4; ++w) {
        workers.emplace_back([w] {
            for (int i = w; i < 40; i += 4) scaleImage(i);   // 每人 10 张
        });
    }
    for (auto& t : workers) t.join();     // 主线程在这里等每人干完
    auto end = std::chrono::steady_clock::now();
    std::cout << "cost: "
              << std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count()
              << " ms\n";
}
```

预期输出（数值每次略有浮动）：

```text
cost: 1005 ms
```

四倍加速到手。`join()` 的语义是「我等你」：调用方阻塞到目标线程结束。每个 `std::thread` 对象在析构前**必须**被 `join()` 或 `detach()` 过——`detach()` 让线程与对象脱钩、在后台自生自灭，但主程序退出时它可能还在跑，引用的局部变量早已悬垂，初学阶段一律用 `join`。两条路都不走会怎样？第 7 节实录见。

## 3. 核心概念二：受挫——进度计数对不上

加个需求：统计已完成的图片数。两个线程各自往同一个计数器上加：

```cpp
// race.cpp
#include <iostream>
#include <thread>

int done = 0;                 // 共享计数器

void work() {
    for (int i = 0; i < 100000; ++i) ++done;
}

int main() {
    std::thread a(work), b(work);
    a.join();
    b.join();
    std::cout << "done = " << done << '\n';
}
```

预期输出（**每次运行都不同**，且几乎总小于 200000）：

```text
done = 137842
```

不是玄学：`++done` 在机器层面是「读、加、写」三步。两个线程交错时，可能都读到 5、都写回 6——一次自增被吞掉。这叫**丢失更新**，是最典型的竞态。

## 4. 更严重的警告：数据竞争是未定义行为

数错只是最轻的后果。C++ 标准规定：两个线程无同步地访问同一内存位置、且至少一方是写，就是**数据竞争**，程序进入未定义行为——和 030 篇越界数组同级别：不只是结果不可信，编译器可以自由重排指令，程序可能崩溃、死循环、表现完全失控。由此得出并发第一纪律：**共享的可变数据，必须同步**。要么上锁，要么换成下一节的原子类型，没有第三种「我觉得没事」。

## 5. 修复一：mutex 加 lock_guard

```cpp
#include <mutex>

int done = 0;
std::mutex doneMutex;         // 与数据配对的锁

void work() {
    for (int i = 0; i < 100000; ++i) {
        std::lock_guard<std::mutex> lock(doneMutex);   // 构造即加锁
        ++done;                                        // 同一时刻只有一个线程在这
    }                                                  // lock 析构，自动解锁
}
```

预期输出（稳定）：

```text
done = 200000
```

`mutex` 保证同一时刻只有一个线程进入「上锁到解锁」之间的临界区；`lock_guard` 是 [RAII](/cpp/160-RAIIResourceManagement) 包装：构造加锁、析构解锁，中途抛异常也不会把锁忘在手里——永远不要手写裸的 `lock()`/`unlock()` 配对。

## 6. 修复二：atomic（这个场景的最优解）

一个整数的自增，用锁像开保险柜取笔。`std::atomic` 把「读改写」做成一条不可分割的操作：

```cpp
#include <atomic>

std::atomic<int> done{0};

void work() {
    for (int i = 0; i < 100000; ++i) ++done;   // 原子自增，无需加锁
}
```

输出仍是稳定的 `done = 200000`。分工原则：**单个独立变量的计数、标志用 atomic；多个变量要保持一起变的场合用 mutex**——原子只保单个操作的完整性，不保多个变量间的不变式。

## 7. 常见错误与调试实录

实录一：忘记 join。删掉 `t.join()` 后线程对象带着未结束的线程析构，程序当场被标准库处决：

```text
terminate called without an active exception
Aborted (core dumped)
```

定位：`terminate called` 说明标准库主动调用 `std::terminate`——`std::thread` 析构时仍处于 joinable 状态就会触发，库宁可杀掉进程也不留下无人看管的线程。修法：确保所有执行路径都 join，或改用 C++20 的 `std::jthread`（析构自动 join）。

实录二：给竞态装上探测器。AddressSanitizer 抓内存越界（030 篇），**抓不到**数据竞争；线程的工具是 ThreadSanitizer：

```bash
g++ -std=c++17 -fsanitize=thread -g race.cpp -o race && ./race
```

TSan 输出（节选，地址与 pid 每次不同）：

```text
==================
WARNING: ThreadSanitizer: data race (pid=12345)
  Read of size 4 at 0x7ffd2a4c by thread T2:
    #0 work() race.cpp:7
  Previous write of size 4 at 0x7ffd2a4c by thread T1:
    #0 work() race.cpp:7
SUMMARY: ThreadSanitizer: data race race.cpp:7 in work()
==================
```

两段调用栈直指同一个文件行号——读写交火点。看到 `WARNING: ThreadSanitizer: data race` 就不用再猜「是不是我数错了」。

## 8. 修改实验

1. 把线程数从 4 改成 8 再测耗时：4 核机器上不再继续变快，体会线程数超过核心数后只剩调度开销；
2. 把 `lock_guard` 从循环内移到循环外（整个函数只锁一次），对比耗时——这是「锁粒度」实验，粒度小更安全、粒度大更快，工程上永远在权衡；
3. 让每个线程累加自己的局部变量，join 后主线程汇总四份结果，验证「不共享就不用同步」——这是比锁更优先的方案。

## 9. 小练习

预测题（预计 5 分钟，先写答案再运行）：

```cpp
int v = 0;
std::thread t([&v] { v = 42; });
std::cout << v;      // 不 join，直接读
t.join();
```

这行 `cout` 的输出是否一定是 0？（提示：读 `v` 与另一个线程写 `v` 之间有同步吗？）

修改题（预计 15 分钟）：给缩放程序加进度显示——每完成 10 张打印一次百分比，要求进度计数无竞态。验收：打印值单调递增且最终恰为 100%。

修 Bug 题（预计 15 分钟）：下面的函数偶发崩溃或行为诡异，指出两处问题并修复：

```cpp
void run() {
    std::vector<int> data(100, 0);
    std::thread t([&data] {
        for (int& x : data) ++x;
    });
    t.detach();
}   // 函数在这里返回
```

## 10. 实际场景

该用线程：CPU 密集且可分片的批量任务（缩放、编码、压缩、物理模拟）；I/O 密集等待型任务往往用异步接口（440 篇的 future）更省心。不该用：任务本身比创建线程还快（线程创建加 join 约 50 微秒起步）；拆分后仍要频繁抢同一把锁的伪并行。线程数经验起点是 `std::thread::hardware_concurrency()`，再靠测量调整。

## 11. 与之前和之后的知识的关系

- 往前：120 篇的指针告诉你「同一地址多方可达」——线程把这句话变成日常；030 的 UB 概念在数据竞争处升级；160 的 RAII 化身 lock_guard；
- 往后：[并发工程](/cpp/440-CoordinationAndAsyncPrimitives) 讲线程之间如何协作与排队（条件变量、死锁、future）；450 篇的内存模型解释数据竞争为什么被定义为 UB；
- 更远：变参模板（370）正是 `std::thread t(f, a, b, c)` 这类「任意参数启动」的底层机制。

## 12. 官方文档

- cppreference std::thread：https://en.cppreference.com/w/cpp/thread/thread
- cppreference std::mutex：https://en.cppreference.com/w/cpp/thread/mutex
- cppreference std::lock_guard：https://en.cppreference.com/w/cpp/thread/lock_guard
- cppreference std::atomic：https://en.cppreference.com/w/cpp/atomic/atomic

## 13. 自我检查

- 能默写「创建、join、析构前必须二选一」的线程生命周期，并说出 detach 的风险；
- 能在内存层面解释丢失更新（读改写三步交错），并给出 mutex 与 atomic 两种修法的适用分界；
- 能复述数据竞争的定义与「共享可变数据必须同步」纪律；
- 看到 `terminate called without an active exception` 能说出是线程对象未 join 就析构。

## 本章总结

多线程把一个大任务拆到多个核心：`std::thread` 构造即启动、`join` 收队，析构前不 join 不 detach 会被标准库处决。共享可变数据一旦出现，丢失更新就登场——`++counter` 的读改写三步在两个线程间交错，结果小于期望且每次不同；而数据竞争在标准里是未定义行为，不只是数错。修复两板斧：mutex 加 lock_guard 守住多变量不变式，atomic 处理单变量计数；ThreadSanitizer 是这个领域的探测器。线程会跑只是第一步，让多个线程排队协作是下一篇的事。

## 下一步

进入 [并发工程](/cpp/440-CoordinationAndAsyncPrimitives)：条件变量实现生产者消费者、亲手造一次死锁、以及 future 与 async 的取舍实验。
