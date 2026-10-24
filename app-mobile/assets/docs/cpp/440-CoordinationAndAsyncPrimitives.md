---
order: 470
title: 并发工程：条件变量、死锁与 future 的取舍
module: 'cpp'
category: 计算机科学
difficulty: advanced
description: 承接多线程入门的深水区篇：condition_variable 生产者消费者完整实现与谓词防虚假唤醒、两把锁的死锁最小实验与锁排序纪律（ASan 与 TSan 都抓不到死锁，用线程序评审）、future/promise/async 取舍实验（默认策略可能根本不开线程）、shared_mutex 读写场景一句话，附忘发通知与线程 join 自己的真实报错。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cpp/430-MultithreadingConcurrency'
  - 'cpp/450-CppMemoryModel'
  - 'cpp/460-MemoryOrderLockFree'
  - 'cpp/610-CppPerformance'
prerequisites:
  - 'cpp/430-MultithreadingConcurrency'
---

## 前置知识

- 已完成 [多线程入门](/cpp/430-MultithreadingConcurrency)：会创建与 join 线程，理解数据竞争与「共享可变数据必须同步」纪律，用过 mutex、lock_guard、atomic。

> 分工说明：430 建立了线程、锁、原子的最小闭环，本篇解决「多个线程要协作与排队」的工程问题：生产者消费者（条件变量）、死锁（成因与纪律）、异步结果（future/promise/async）。atomic 的内存序细节属于 450/460 两篇，本文不展开。

## 学习目标

读完本文你将能够：

1. 用 mutex 加 condition_variable 写出完整的生产者消费者，并解释谓词版 wait 为什么不可省；
2. 亲手制造一次死锁，记住「锁排序」与 `std::scoped_lock` 两条避免纪律；
3. 为「要并发结果」的任务在 thread/promise、async 之间做取舍，并说出默认启动策略的坑；
4. 判断一个卡死的程序是死锁还是忘发通知，并知道为什么 ASan 与 TSan 都帮不上忙。

预计 60 到 90 分钟。

## 1. 你现在要解决什么问题

430 篇的缩放任务是「各干各的」，线程间不需要沟通。现在换个形状：一个线程往任务队列里塞任务（生产者），一个线程取任务处理（消费者）。难点在节奏——队列空的时候消费者干什么？

```cpp
while (tasks.empty()) { }   // 忙等：烧着一个核心什么都不干
```

忙等能跑，但空转的核心是纯浪费。你想要的是「没活就睡，来活就被叫醒」——这正是条件变量的职责。

## 2. 核心概念一：condition_variable 生产者消费者

```cpp
// producer_consumer.cpp
#include <condition_variable>
#include <iostream>
#include <mutex>
#include <queue>
#include <thread>

std::queue<int> tasks;
std::mutex mtx;
std::condition_variable cv;
bool finished = false;

void producer() {
    for (int i = 1; i <= 5; ++i) {
        {
            std::lock_guard<std::mutex> lock(mtx);   // 改队列前先锁
            tasks.push(i);
        }                                            // 出作用域解锁，再通知
        cv.notify_one();
    }
    {
        std::lock_guard<std::mutex> lock(mtx);
        finished = true;
    }
    cv.notify_all();                                 // 叫醒所有人收工
}

void consumer() {
    while (true) {
        std::unique_lock<std::mutex> lock(mtx);
        cv.wait(lock, [] { return !tasks.empty() || finished; });  // 谓词版
        while (!tasks.empty()) {
            std::cout << "consume " << tasks.front() << '\n';
            tasks.pop();
        }
        if (finished) return;
    }
}

int main() {
    std::thread p(producer), c(consumer);
    p.join();
    c.join();
    std::cout << "all done\n";
}
```

预期输出：

```text
consume 1
consume 2
consume 3
consume 4
consume 5
all done
```

数值顺序恒为 1 到 5；打印与生产可能交错（生产快时会一次性入队多条），这是正常现象。三个关键点：

- `cv.wait(lock, pred)` 自动做三件事：检查谓词、不满足则解锁睡眠、被唤醒后**重新检查**。裸 `wait(lock)` 醒来不查条件就继续跑——条件变量存在虚假唤醒（操作系统层面允许无故醒来），谓词版是唯一正确写法；
- 谓词要覆盖两种「该干活」：有活或已收工（`finished`）——漏了后者消费者永远等不到下一次通知；
- 等待用 `unique_lock` 而非 `lock_guard`：wait 内部要反复解锁加锁，`lock_guard` 不支持。

## 3. 核心概念二：死锁最小实验

两个线程、两把锁、获取顺序相反：

```cpp
// deadlock.cpp
#include <chrono>
#include <iostream>
#include <mutex>
#include <thread>

std::mutex lockA, lockB;

void worker1() {
    std::lock_guard<std::mutex> la(lockA);
    std::this_thread::sleep_for(std::chrono::milliseconds(10));  // 制造交错窗口
    std::lock_guard<std::mutex> lb(lockB);   // 在这里等 worker2 手里的 lockB
    std::cout << "worker1 got both\n";
}

void worker2() {
    std::lock_guard<std::mutex> lb(lockB);
    std::this_thread::sleep_for(std::chrono::milliseconds(10));
    std::lock_guard<std::mutex> la(lockA);   // 在这里等 worker1 手里的 lockA
    std::cout << "worker2 got both\n";
}

int main() {
    std::thread t1(worker1), t2(worker2);
    t1.join();
    t2.join();
    std::cout << "main exits\n";
}
```

运行现象：

```text
（程序永久卡住，一行都不输出，CPU 占用极低，只能 Ctrl+C）
```

worker1 持 A 等 B，worker2 持 B 等 A，形成循环等待——谁也不放手，谁也拿不到第二把锁。这不是崩溃，是「合法地」永远等下去，所以**没有任何报错输出**。

避免纪律（按优先级）：

1. **锁排序**：全程序约定「永远先 A 后 B」，任何人都不得逆序获取——循环等待在结构上不可能形成；
2. **一次拿全**：C++17 的 `std::scoped_lock lock(lockA, lockB);` 内部用避免死锁的算法一次性获取两把锁，替你守住顺序；
3. 缩小临界区、持锁期间不调用看不见源码的回调（它可能反过来要别的锁）。

为什么工具救不了你：AddressSanitizer 抓内存越界，ThreadSanitizer 抓数据竞争——死锁两者都不报，因为它不涉及未定义行为，只是逻辑把线程困住了。**唯一可靠的手段是线程序评审**：列出每一处「持有 X 时请求 Y」，画出等待方向箭头，检查图里有没有环。有环就是死锁，与跑多少次测试无关。

## 4. 核心概念三：future/promise/async 的取舍

`std::thread` 有个尴尬：拿不到返回值。`std::future` 是「结果收据」——任务还没算完就把收据发给你，算完凭收据取值。先做取舍实验，重点观察默认策略到底开没开线程：

```cpp
// async_test.cpp
#include <chrono>
#include <future>
#include <iostream>
#include <thread>

int work(int n) {
    std::cout << "  worker id: " << std::this_thread::get_id() << '\n';
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    return n * n;
}

int main() {
    std::cout << "main id:    " << std::this_thread::get_id() << '\n';

    auto f1 = std::async(std::launch::async, work, 12);   // 强制开新线程
    auto f2 = std::async(work, 12);                       // 默认策略：实现自选

    std::cout << f1.get() << '\n';
    std::cout << f2.get() << '\n';
}
```

一次实测输出（GCC/Linux，**换平台可能不同——这正是问题**）：

```text
main id:    140514248328128
  worker id: 140514239932160
144
  worker id: 140514248328128
144
```

第二个任务的 id 与 main 相同：默认策略允许实现把任务**推迟到 get() 时在调用方线程同步执行**，压根没开新线程。想要并发，写明 `std::launch::async`；并且注意它的隐藏条款——`std::launch::async` 返回的 future 析构时会阻塞等待任务完成。

三层工具的取舍：

- **std::async（async 策略）**：要返回值、要并发、任务数不多，一行搞定；
- **promise/future**：底层机制——工作线程算完 `p.set_value(v)`，任意线程 `f.get()` 收货，async 内部就是它；需要自己管理线程生命周期时才用；
- **std::thread**：完全控制但零回报传递，配合 promise 样板最重。

任务短且量大时三者都别直接用，攒进线程池。

## 5. 实际场景与边界

读多写少的场景（如配置缓存）用 `std::shared_mutex`：读拿 `std::shared_lock`（多个读者并行），写拿 `std::unique_lock`（独占）；读写都频繁时不如普通 mutex，先测量再换。更大的分界线：线程之间要「等某个状态」就用条件变量（任务队列、连接池、线程池的工作循环）；只共享一个计数就留在 430 的 atomic；少量独立、要返回值的任务交给 async；任务量大到线程被频繁创建销毁，就该上线程池了。

## 6. 常见错误与调试实录

实录一：忘发通知。把 producer 里两处 `notify_*` 注释掉，程序表现与死锁一模一样——永久卡住、无输出。区分方法：死锁的两个线程都在等锁（评审等待图有环），忘通知的那个线程在 `wait` 里睡觉（评审发现「改了共享状态但没 notify」）。

实录二：线程 join 自己。在工作线程函数里误调自己的 `join()`，libstdc++ 真实输出：

```text
terminate called after throwing an instance of 'std::system_error'
  what():  resource deadlock avoided
Aborted (core dumped)
```

`what()` 里的文案来自操作系统的 EDEADLK 错误码——「避免资源死锁」，库检测到线程等待自身后抛出 `std::system_error`，未捕获进而 terminate。看到它就回调用栈找「谁在等谁」。

## 7. 修改实验

1. 把单消费者改成两个消费者，验证每条任务仍恰好被消费一次（锁保证取任务的原子性）；再给队列加上限，满了生产者等待——有界队列的雏形；
2. 给死锁实验套上 `std::scoped_lock lock(lockA, lockB)` 修复两个 worker，验证程序能正常退出；再把两处锁改成同一顺序，验证同样有效；
3. 把实验里的 f2 显式改成 `std::launch::deferred`，对比两次 worker id 与 get() 前后的耗时——deferred 意味着 200 毫秒的 sleep 记在主线程账上。

## 8. 小练习

预测题（预计 5 分钟，先写答案再运行）：

```cpp
auto f = std::async(std::launch::deferred,
                    [] { std::cout << "run\n"; return 7; });
std::cout << "main\n";
std::cout << f.get() << '\n';
```

三行输出的顺序是什么？哪一行执行时才真正运行了 lambda？

挑战题（预计半小时，脱离示例实现）：用 mutex、condition_variable 和一个整数计数实现 `Semaphore` 类，接口 `acquire()` 与 `release()`，初始许可数为 3。验证：10 个线程各自进入临界区后打印 `enter`、睡 200 毫秒、打印 `exit`，运行全程任意时刻输出中 enter 与 exit 之差不超过 3，结束后计数归位。提示（一级）：谓词是 `count > 0`，acquire 后减、release 后加并 notify_one。展开（二级）：`cv.wait(lock, [&] { return count > 0; });`。

## 9. 与之前和之后的知识的关系

- 往前：430 的 mutex 是本文所有同步的地基；变参模板（370）解释了 `std::thread t(f, args...)` 的签名从哪来；
- 往后：450 篇的内存模型从标准层面回答「为什么数据竞争是 UB」；460 篇的内存序是 atomic 的进阶档位；
- 更远：性能分析（610）里，锁竞争与线程池是热点常客。

## 10. 官方文档

- cppreference condition_variable：https://en.cppreference.com/w/cpp/thread/condition_variable
- cppreference scoped_lock：https://en.cppreference.com/w/cpp/thread/scoped_lock
- cppreference async：https://en.cppreference.com/w/cpp/thread/async
- cppreference shared_mutex：https://en.cppreference.com/w/cpp/thread/shared_mutex

## 11. 自我检查

- 能默写生产者消费者的骨架，并说出谓词版 wait 防的是什么（虚假唤醒与唤醒丢失）；
- 能画出死锁实验的等待图（两个节点、两支箭头成环），并给出锁排序与 scoped_lock 两种修法；
- 能说出 async 默认策略的风险与 `std::launch::async` future 析构阻塞的隐藏条款；
- 能区分「卡死的三种病因」：死锁、忘通知、忙等，并说出各自的排查手段。

## 本章总结

线程会跑之后，工程问题集中在协作：条件变量让消费者「没活就睡、来活就叫醒」，谓词版 wait 是虚假唤醒的唯一解药；死锁源于循环等待，锁排序与 scoped_lock 从结构上消灭环，而 ASan、TSan 对它无能为力，线程序评审是最后的防线；future 是结果收据，async 默认策略可能根本不开线程，`std::launch::async` 才是明确的并发声明。并发代码的表象极其相似——卡住的不一定是死锁，报错的未必是真凶，测量与审读永远优先于猜测。

## 下一步

进入 [C++ 内存模型](/cpp/450-CppMemoryModel)：从标准层面看清数据竞争为什么被定义为未定义行为，happens-before 是怎么给多线程建立秩序的。
