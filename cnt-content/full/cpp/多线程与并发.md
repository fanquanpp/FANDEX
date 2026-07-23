---
order: 65
title: 多线程与并发
module: cpp
category: C++
difficulty: advanced
description: 'std::thread与同步原语'
author: fanquanpp
updated: '2026-06-14'
related:
  - cpp/文件IO与文件系统
  - cpp/异常安全
  - cpp/类型特征与SFINAE
  - cpp/变参模板
prerequisites:
  - cpp/概述与现代标准
---

## 学习目标

完成本章学习后，读者应当能够达到以下认知层级（参照 Bloom 分类法）：

- **记忆（Remembering）**：复述 C++ 内存模型的核心要素（happens-before、synchronizes-with、sequenced-before、sequentially consistent）；列举 C++11 至 C++23 引入的并发原语（`std::thread`、`std::mutex`、`std::condition_variable`、`std::future`、`std::atomic`、C++17 并行算法、C++20 `std::jthread`/`std::semaphore`/`std::latch`/`std::barrier`、C++20 协程、C++23 `std::mdspan` 并行扩展）；列举六种内存序（`memory_order_relaxed`、`memory_order_consume`、`memory_order_acquire`、`memory_order_release`、`memory_order_acq_rel`、`memory_order_seq_cst`）。
- **理解（Understanding）**：解释数据竞争（data race）的定义及其导致的未定义行为；阐述 happens-before 关系如何保证可见性；区分互斥锁、读写锁、条件变量、信号量、闩、屏障的语义差异；解释死锁的四个必要条件（互斥、占有等待、不可剥夺、循环等待）。
- **应用（Applying）**：使用 `std::thread` 与 `std::jthread` 创建可加入、可停止的线程；使用 `std::lock_guard`、`std::unique_lock`、`std::scoped_lock`、`std::shared_lock` 管理锁的生命周期；使用 `std::condition_variable` 实现生产者-消费者模式；使用 `std::atomic` 与合适的内存序实现无锁计数器与单生产者-单消费者队列。
- **分析（Analyzing）**：分析给定并发代码中的数据竞争、死锁、虚假唤醒、内存序误用等缺陷；通过 ThreadSanitizer（TSan）、AddressSanitizer（ASan）、`helgrind` 等工具定位并发 bug；评估不同锁策略（粗粒度锁、细粒度锁、读写锁、无锁）在吞吐量与延迟上的权衡。
- **评价（Evaluating）**：在给定场景下选择合适的并发原语（互斥锁 vs 读写锁 vs 原子操作 vs 消息传递）；评估 ABA 问题对无锁栈/队列的影响并选择合适的解决方案（ tagged pointer、hazard pointer、epoch-based reclamation）；评估 C++20 协程相比传统线程池在高并发 I/O 场景下的优劣。
- **创造（Creating）**：设计并实现一个支持任务优先级、动态扩容、优雅停止的线程池；设计并实现一个基于 `std::atomic` 与 hazard pointer 的无锁并发栈；将传统基于锁的并发哈希表改造为基于细粒度分片锁的高并发哈希表。

## 概述

并发（Concurrency）是指多个执行流在逻辑上同时进行的能力，并行（Parallelism）则是指多个执行流在物理上同时运行。在多核处理器普及之前，操作系统通过时间片轮转实现"伪并行"——多个线程交替使用单一 CPU 核心，造成同时运行的错觉；而现代多核 CPU 可以让多个线程真正同时执行。C++ 的多线程模型既支持并发（在单核上通过时间片实现），也支持并行（在多核上真正并行）。

C++ 在 2011 年之前**没有标准化的多线程支持**。开发者必须依赖平台特定的 API：Windows 使用 `CreateThread`、`_beginthreadex`；POSIX 系统使用 `pthread_create`。这种碎片化导致 C++ 代码难以跨平台移植，也使标准库无法提供线程安全的设施。C++11 引入了 `<thread>`、`<mutex>`、`<condition_variable>`、`<future>`、`<atomic>` 等头文件，标志着 C++ 正式进入标准化并发时代。此后每个版本都在扩展并发能力：

- **C++14**：`std::shared_timed_mutex`（读写锁）；
- **C++17**：`std::shared_mutex`（无超时读写锁）、`std::scoped_lock`（多锁同时获取避免死锁）、并行算法（`<execution>`）；
- **C++20**：`std::jthread`（自动 join 与协作停止）、`std::stop_token`/`std::stop_source`、`std::semaphore`、`std::latch`、`std::barrier`、协程（`<coroutine>`）、`std::atomic_ref`、`std::wait`/`std::notify_*`；
- **C++23**：`std::atomic_ref` 改进、`std::flat_map` 等并行友好的容器、`std::expected` 与异步组合、`std::mdspan`（多维视图便于并行访问）。

C++ 并发编程的核心挑战是**正确性**——比单线程程序更难写对。原因在于：

1. **数据竞争（Data Race）**：两个线程并发访问同一内存位置且至少一个是写操作且无同步关系，导致未定义行为（UB）；
2. **可见性（Visibility）**：一个线程对内存的修改何时对其他线程可见，取决于内存模型；
3. **原子性（Atomicity）**：复合操作（如读-改-写）需要原子性保证，否则中间状态可能被其他线程观察到；
4. **重排序（Reordering）**：编译器与 CPU 会重排序指令以优化性能，可能破坏程序逻辑；
5. **死锁（Deadlock）**：多个线程互相等待对方持有的锁，导致永久阻塞；
6. **活锁（Livelock）**：线程不断改变状态但无法推进；
7. **饥饿（Starvation）**：某些线程长期得不到调度。

C++ 内存模型（C++ Memory Model）通过 **happens-before 关系** 解决了前四个问题——它规定了操作之间的偏序关系，只有存在 happens-before 关系的写操作才能被读操作安全地观察到。后三个问题需要通过锁的层次设计、超时机制、公平调度等工程手段解决。

本章将从 C++ 并发的历史背景出发，深入推导内存模型的形式化语义、各种同步原语的理论与实现，并通过完整的案例研究帮助读者掌握并发编程的工程实践。

## 历史动机与背景

### 并发编程的演进

| 时间 | 里程碑 | 意义 |
| ---- | ---- | ---- |
| 1965 | Dijkstra 提出**信号量**（Semaphore）概念 | 第一个同步原语 |
| 1971 | Dijkstra 提出**生产者-消费者**问题 | 经典同步问题 |
| 1974 | Hoare 提出**管程**（Monitor） | 高级同步抽象 |
| 1985 | POSIX 1003.1c 标准 | `pthread` 库标准化 |
| 1995 | Java 引入内置 `synchronized` 与 `Thread` | 语言级并发支持 |
| 2001 | Intel 推出**超线程**（Hyper-Threading） | 单核"伪多线程" |
| 2005 | 多核 CPU 普及（Pentium D、Core 2 Duo） | 真正并行成为主流 |
| 2007 | Herb Sutter 提出 "The Free Lunch Is Over" | 单核性能停滞，必须并行化 |
| 2011 | C++11 引入 `<thread>`、`<atomic>` 等 | 标准化并发支持 |
| 2014 | C++14 增加 `std::shared_timed_mutex` | 读写锁 |
| 2017 | C++17 增加并行算法、`std::scoped_lock` | 标准化并行 |
| 2020 | C++20 引入 `std::jthread`、信号量、闩、屏障、协程 | 现代并发抽象 |

### C++ 标准化之前的并发

C++03 时代，多线程编程依赖平台特定的库：

```cpp
// Windows 平台
#include <windows.h>
DWORD WINAPI threadFunc(LPVOID arg) { /* ... */ }
HANDLE h = CreateThread(NULL, 0, threadFunc, NULL, 0, NULL);
WaitForSingleObject(h, INFINITE);

// POSIX 平台
#include <pthread.h>
void* threadFunc(void* arg) { /* ... */ return nullptr; }
pthread_t t;
pthread_create(&t, NULL, threadFunc, NULL);
pthread_join(t, NULL);
```

这导致代码难以跨平台，且 `volatile` 关键字被滥用——C++03 的 `volatile` 在标准中并不保证原子性或可见性，仅是编译器提示。开发者依赖**编译器特定的扩展**（如 GCC 的 `__sync_*` 内建函数、MSVC 的 `_InterlockedExchange`）实现原子操作，可移植性极差。

### C++11 内存模型的诞生

C++11 内存模型的设计由 Hans-J. Boehm、Brian Demsky、Paul McKenney 等人主导，参考了 Java Memory Model（JSR-133）的经验但去除了 JMM 中过度复杂的部分。C++11 内存模型的核心贡献是：

1. **形式化 happens-before 关系**：定义了操作之间的偏序关系，规定何时一个写操作对另一个读操作可见；
2. **六种内存序**：允许程序员在性能与可读性之间权衡，从最弱的 `relaxed` 到最强的 `seq_cst`；
3. **原子类型 `std::atomic<T>`**：保证操作的原子性与可见性；
4. **标准化的同步原语**：`std::thread`、`std::mutex`、`std::condition_variable`、`std::future` 等。

C++11 内存模型保证了**顺序一致性（Sequential Consistency, SC）**的默认行为——使用默认内存序 `memory_order_seq_cst` 时，所有线程看到的操作顺序是一致的。这简化了正确性论证，但有性能开销。其他内存序允许更激进的重排序，但需要程序员手动维护 happens-before 关系。

### 为什么 C++ 选择基于互斥而非消息传递

并发编程有两个主要流派：

1. **共享内存（Shared Memory）**：线程通过共享变量通信，需要同步原语（锁、原子）保证一致性。代表：C、C++、Java、C#。
2. **消息传递（Message Passing）**：线程通过发送消息通信，无共享状态。代表：Erlang、Go（channel）、Rust（基于 channel 的 `std::sync::mpsc`）、Actor 框架（Akka）。

C++ 选择共享内存模型的原因：

- **性能**：共享内存的随机访问比消息传递（需序列化、拷贝）更快；
- **零开销原则**：C++ 不希望引入运行时调度器；
- **兼容性**：与 C 语言兼容，便于调用系统级 API；
- **控制粒度**：开发者可以精细控制同步的粒度。

但共享内存模型的代价是正确性论证复杂、容易出错。Rust 通过所有权系统在编译期消除数据竞争，C++ 则依赖开发者谨慎与工具（ThreadSanitizer、Clang Static Analyzer）。

## 形式化定义

### 内存模型

设 $\mathcal{M}$ 为内存位置（memory location）的集合，$\mathcal{T}$ 为线程集合，$\mathcal{O}$ 为所有原子操作与非原子操作的集合。内存模型定义了一个**偏序关系** $\xrightarrow{\text{hb}}$（happens-before）：

$$
\xrightarrow{\text{hb}} \subseteq \mathcal{O} \times \mathcal{O}
$$

满足以下公理：

- **公理 1（程序序）**：同一线程内的操作 $a, b$，若 $a$ 在 $b$ 之前求值，则 $a \xrightarrow{\text{hb}} b$；
- **公理 2（同步）**：若操作 $a$ 同步于操作 $b$（记作 $a \xrightarrow{\text{sw}} b$），则 $a \xrightarrow{\text{hb}} b$；
- **公理 3（传递性）**：若 $a \xrightarrow{\text{hb}} b$ 且 $b \xrightarrow{\text{hb}} c$，则 $a \xrightarrow{\text{hb}} c$。

### synchronizes-with 关系

操作 $a$ 同步于操作 $b$（$a \xrightarrow{\text{sw}} b$）的典型情况：

1. 释放操作：线程 T1 的 `store(x, release)` 与线程 T2 的 `load(x, acquire)`，则 `store` 同步于 `load`；
2. 锁的获取与释放：`mutex.unlock()` 同步于下次 `mutex.lock()`；
3. 线程创建：`thread t(f)` 创建同步于 `f` 的第一次执行；
4. 线程 join：`f` 的最后一次执行同步于 `t.join()` 返回；
5. fence：`atomic_thread_fence(release)` 与后续 `acquire` fence 配对。

### 数据竞争的形式化定义

设 $a, b$ 是两个操作，访问同一内存位置 $m \in \mathcal{M}$，其中至少一个是写操作（非原子）。若 $a$ 与 $b$ 之间不存在 happens-before 关系，则构成**数据竞争（Data Race）**：

$$
\text{DataRace}(a, b) \iff \neg(a \xrightarrow{\text{hb}} b \lor b \xrightarrow{\text{hb}} a) \land \text{conflict}(a, b, m)
$$

数据竞争导致未定义行为（UB）。

### 内存序的语义

C++ 定义了六种内存序，对应不同的同步语义：

| 内存序 | 语义 | 适用操作 |
| ------ | ---- | -------- |
| `memory_order_relaxed` | 无同步，仅保证原子性 | 计数器递增 |
| `memory_order_consume` | 数据依赖（C++17 起弱化为 `acquire`） | 极少使用 |
| `memory_order_acquire` | 获取：后续读写不能重排序到前面 | load |
| `memory_order_release` | 释放：前面读写不能重排序到后面 | store |
| `memory_order_acq_rel` | 获取-释放：读-改-写操作同时具备两种语义 | `fetch_add`、`exchange` |
| `memory_order_seq_cst` | 顺序一致：全局总序 | 默认 |

### happens-before 的形式化示例

```cpp
// 线程 1
data = 42;                              // (1) 非原子写
flag.store(true, std::memory_order_release);  // (2) 原子释放

// 线程 2
while (!flag.load(std::memory_order_acquire))  // (3) 原子获取
    ;
assert(data == 42);                     // (4) 非原子读
```

形式化分析：

- (1) $\xrightarrow{\text{sb}}$ (2)（程序序）
- (2) $\xrightarrow{\text{sw}}$ (3)（释放-获取配对）
- (3) $\xrightarrow{\text{sb}}$ (4)（程序序）

由传递性：(1) $\xrightarrow{\text{hb}}$ (4)，故 `data` 的写入对线程 2 可见，断言成立。

### 死锁的形式化定义

设线程集合 $\mathcal{T} = \{t_1, \ldots, t_n\}$，锁集合 $\mathcal{L} = \{l_1, \ldots, l_m\}$，分配关系 $A \subseteq \mathcal{T} \times \mathcal{L}$（$A(t, l)$ 表示线程 $t$ 持有锁 $l$），等待关系 $W \subseteq \mathcal{T} \times \mathcal{L}$（$W(t, l)$ 表示线程 $t$ 等待锁 $l$）。

**死锁**：存在线程序列 $t_{i_1}, t_{i_2}, \ldots, t_{i_k}$ 与锁序列 $l_{j_1}, \ldots, l_{j_k}$，使得：

$$
A(t_{i_1}, l_{j_1}) \land W(t_{i_1}, l_{j_2}) \land A(t_{i_2}, l_{j_2}) \land W(t_{i_2}, l_{j_3}) \land \ldots \land A(t_{i_k}, l_{j_k}) \land W(t_{i_k}, l_{j_1})
$$

即形成等待环。

### Coffman 四条件

死锁的四个必要条件（Coffman, 1971）：

1. **互斥（Mutual Exclusion）**：资源一次只能由一个线程持有；
2. **占有并等待（Hold and Wait）**：线程持有资源同时等待其他资源；
3. **不可剥夺（No Preemption）**：资源只能由持有者主动释放；
4. **循环等待（Circular Wait）**：存在线程的等待环。

破坏任意一个条件即可避免死锁。C++ 中最常用的策略是**破坏循环等待**——通过统一的锁获取顺序或 `std::scoped_lock` 一次性获取所有锁。

## 理论推导

### 推导 1：内存序与性能的关系

**定理 1.1**：在 x86-TSO 内存模型下，`memory_order_acquire` 与 `memory_order_release` 操作的运行时开销为零，而 `memory_order_seq_cst` 需要 `MFENCE` 或 `LOCK` 前缀。

**证明草图**：

x86-TSO 是一个相对严格的内存模型，硬件本身保证 load-load、load-store、store-store 的有序性，仅 store-load 可能重排序。

- `acquire` 操作（load）：x86 的普通 `MOV` 已满足 acquire 语义，无需额外指令；
- `release` 操作（store）：x86 的普通 `MOV` 已满足 release 语义；
- `seq_cst` 操作：store 需要 `MFENCE` 或 `XCHG`（隐含 `LOCK`）保证全局可见顺序，load 仍可普通 `MOV`。

而在 ARMv8 等弱内存模型上：

- `acquire` load 需要 `LDAR`；
- `release` store 需要 `STLR`；
- `seq_cst` 需要 `DMB ISH` 或 `STLR + LDAR` 配对。

故 `seq_cst` 的开销在 x86 上是 store 时一个 fence 指令（约 30-50 周期），在 ARM 上更高。$\square$

**推论 1.2**：对性能敏感的无锁代码，应优先使用 `acquire`/`release` 而非 `seq_cst`。

### 推导 2：无锁数据结构的可线性化

**定义**：一个并发操作是**可线性化（Linearizable）**的，如果它看起来像在某个瞬间原子地完成。

**定理 2.1**：基于 `std::atomic` 与 `compare_exchange_weak` 实现的无锁栈是可线性化的。

**证明草图**：

每个 `push`/`pop` 操作有一个关键 `compare_exchange` 步骤，该步骤原子地完成，可作为线性化点。所有操作的线性化点构成全局顺序，与线程感知的"瞬间"一致。$\square$

**推论 2.2**：可线性化是并发正确性的强保证，比顺序一致性更易实现。

### 推导 3：自旋锁 vs 互斥锁的性能转折点

**定理 3.1**：当临界区持续时间 $T_c$ 小于线程切换时间 $T_s$ 时，自旋锁更优；反之，互斥锁更优。

**证明**：

- 自旋锁等待时间：$W_{\text{spin}} = T_c \cdot n$（$n$ 为竞争者数）；
- 互斥锁等待时间：$W_{\text{mutex}} = T_s + T_c$；

临界点：$T_c \cdot n = T_s + T_c$，即 $T_c = T_s / (n - 1)$。

在 $n = 2$ 时，临界点 $T_c = T_s$，典型 Linux 上 $T_s \approx 1-10 \mu s$。$\square$

**推论 3.2**：用户态自旋锁仅适合极短临界区（几十纳秒）；长临界区应使用 `std::mutex` 让出 CPU。

### 推导 4：ABA 问题

**定理 4.1**：基于 `compare_exchange` 的无锁栈在 ABA 情况下可能产生数据竞争。

**证明**：

考虑以下序列：

1. 线程 T1 读 `head = A`，准备 `compare_exchange(head, A, B)`；
2. T2 将 `head` 改为 `B`，再改回 `A`（但 `A` 可能已是新对象）；
3. T1 的 `compare_exchange` 成功（值仍为 `A`），但 `A.next` 已被 T2 修改。

若 `A` 被释放并重新分配，T1 操作的对象已失效，但 CAS 仍成功，导致未定义行为。$\square$

**解决方案**：

1. **Tagged Pointer**：在指针上附加版本号，CAS 同时比较指针与版本；
2. **Hazard Pointer**：线程声明正在访问的对象，防止被回收；
3. **Epoch-Based Reclamation**：周期性回收，确保所有线程离开旧 epoch；
4. **RCU（Read-Copy-Update）**：延迟回收，等待所有读者完成。

## 基础概念

### 同步原语一览

| 原语 | 头文件 | C++版本 | 说明 |
| ---- | ---- | ---- | ---- |
| `std::thread` | `<thread>` | C++11 | 线程管理 |
| `std::jthread` | `<thread>` | C++20 | 自动 join 与协作停止 |
| `std::mutex` | `<mutex>` | C++11 | 互斥量 |
| `std::recursive_mutex` | `<mutex>` | C++11 | 可重入互斥量 |
| `std::timed_mutex` | `<mutex>` | C++11 | 带超时的互斥量 |
| `std::shared_mutex` | `<shared_mutex>` | C++17 | 读写锁 |
| `std::shared_timed_mutex` | `<shared_mutex>` | C++14 | 带超时的读写锁 |
| `std::condition_variable` | `<condition_variable>` | C++11 | 条件变量 |
| `std::condition_variable_any` | `<condition_variable>` | C++11 | 通用条件变量 |
| `std::future`/`std::promise` | `<future>` | C++11 | 异步计算 |
| `std::async` | `<future>` | C++11 | 异步启动 |
| `std::packaged_task` | `<future>` | C++11 | 任务包装 |
| `std::atomic` | `<atomic>` | C++11 | 原子操作 |
| `std::atomic_ref` | `<atomic>` | C++20 | 原子引用 |
| `std::semaphore` | `<semaphore>` | C++20 | 信号量 |
| `std::latch` | `<latch>` | C++20 | 一次性闩 |
| `std::barrier` | `<barrier>` | C++20 | 可重用屏障 |
| `std::stop_token` | `<stop_token>` | C++20 | 协作停止 |
| 协程 | `<coroutine>` | C++20 | 协程 |
| `std::execution::par` | `<execution>` | C++17 | 并行算法 |

### 锁的种类

#### 互斥锁（Mutex）

```cpp
std::mutex mtx;
mtx.lock();
// 临界区
mtx.unlock();
```

特点：同一时刻仅一个线程可进入临界区。

#### 递归锁（Recursive Mutex）

```cpp
std::recursive_mutex rmtx;
void f() {
    rmtx.lock();   // 已持有也能再次 lock
    rmtx.unlock(); // 必须配对 unlock
}
```

特点：同一线程可多次加锁，避免自死锁。但通常视为代码异味——可能意味着接口设计不当。

#### 读写锁（Shared Mutex）

```cpp
std::shared_mutex smtx;
// 读操作
{
    std::shared_lock lock(smtx);   // 共享锁
    // 多个线程可同时读
}
// 写操作
{
    std::unique_lock lock(smtx);   // 独占锁
    // 仅一个线程可写
}
```

特点：允许多读单写，读多写少场景性能优。

#### 自旋锁（Spin Lock）

C++ 标准库未提供自旋锁（避免被滥用），但可基于 `std::atomic_flag` 实现：

```cpp
class SpinLock {
    std::atomic_flag flag_ = ATOMIC_FLAG_INIT;
public:
    void lock() {
        while (flag_.test_and_set(std::memory_order_acquire)) {
            // 可加入 pause 指令降低功耗
            // 但 C++ 标准未提供，需平台特定 intrinsics
        }
    }
    void unlock() {
        flag_.clear(std::memory_order_release);
    }
};
```

特点：忙等待，不让出 CPU。适合极短临界区。

### RAII 锁管理器

| 类型 | 用途 | C++版本 |
| ---- | ---- | ---- |
| `std::lock_guard<M>` | 简单 RAII 加锁 | C++11 |
| `std::unique_lock<M>` | 灵活锁管理（可延迟、可转移） | C++11 |
| `std::shared_lock<M>` | 共享锁 RAII | C++14 |
| `std::scoped_lock<M...>` | 多锁同时获取（避免死锁） | C++17 |
| `std::call_once` | 一次性调用 | C++11 |

### happens-before 关系的来源

1. **程序序（Sequenced-Before）**：同一线程内的操作顺序；
2. **同步关系（Synchronizes-With）**：通过原子操作或锁建立的跨线程同步；
3. **传递性**：若 A happens-before B，B happens-before C，则 A happens-before C。

### 原子操作的类别

| 操作 | 语义 | 示例 |
| ---- | ---- | ---- |
| `load` | 原子读 | `x.load(acquire)` |
| `store` | 原子写 | `x.store(v, release)` |
| `exchange` | 原子交换 | `old = x.exchange(new)` |
| `compare_exchange_weak/strong` | CAS | `x.compare_exchange_strong(expected, desired)` |
| `fetch_add` | 原子加 | `x.fetch_add(1)` |
| `fetch_sub` | 原子减 | `x.fetch_sub(1)` |
| `fetch_and`/`or`/`xor` | 原子位运算 | `x.fetch_or(mask)` |
| `++x` / `x++` | 原子自增 | `++counter` |

## 代码示例

### 示例 1：基础线程创建

```cpp
#include <iostream>
#include <thread>
#include <chrono>

/// 线程入口函数：接受任意参数
void task(int id, const std::string& msg) {
    std::cout << "线程 " << id << ": " << msg << "\n";
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
}

int main() {
    // 创建线程：函数与参数会被拷贝到线程上下文
    std::thread t1(task, 1, "Hello");
    std::thread t2(task, 2, "World");

    // 必须显式 join 或 detach，否则 std::thread 析构调用 std::terminate
    t1.join();
    t2.join();

    // C++20: jthread 析构时自动请求停止并 join，更安全
    std::jthread t3(task, 3, "jthread");

    // jthread 离开作用域时自动 join
    return 0;
}
```

### 示例 2：使用 RAII 锁管理器

```cpp
#include <mutex>
#include <vector>

/// 线程安全的计数器
class ThreadSafeCounter {
    int count_ = 0;
    mutable std::mutex mtx_;

public:
    /// 加锁递增：使用 lock_guard 自动释放
    void increment() {
        std::lock_guard<std::mutex> lock(mtx_);
        ++count_;
        // 离开作用域自动 unlock
    }

    /// 加锁读取：mutable 允许 const 方法加锁
    int get() const {
        std::lock_guard<std::mutex> lock(mtx_);
        return count_;
    }

    /// 批量递增：使用 unique_lock 灵活管理
    void increment_by(int n) {
        std::unique_lock<std::mutex> lock(mtx_);
        for (int i = 0; i < n; ++i) {
            ++count_;
        }
        // 可中途 unlock 释放锁
        lock.unlock();
        // 此处 mtx_ 已释放，可执行非临界区操作
    }
};
```

### 示例 3：多锁同时获取（避免死锁）

```cpp
#include <mutex>

class Account {
    int balance_ = 0;
    std::mutex mtx_;

    friend void transfer(Account& from, Account& to, int amount);
};

/// 经典死锁陷阱：若两个线程同时 transfer(A, B) 与 transfer(B, A)
/// 会出现 A 等待 B 的锁，B 等待 A 的锁，形成死锁
void transfer_bad(Account& from, Account& to, int amount) {
    std::lock_guard<std::mutex> lock1(from.mtx_);  // 持有 from
    std::lock_guard<std::mutex> lock2(to.mtx_);    // 等待 to
    // ... 转账逻辑
}

/// C++17 解决方案：使用 std::scoped_lock 一次性原子地获取所有锁
/// 内部使用"试锁-回退"算法，避免死锁
void transfer(Account& from, Account& to, int amount) {
    std::scoped_lock lock(from.mtx_, to.mtx_);  // 同时获取，避免死锁
    // ... 安全执行转账
}
```

### 示例 4：生产者-消费者模式

```cpp
#include <queue>
#include <mutex>
#include <condition_variable>
#include <thread>
#include <chrono>

/// 线程安全的有界队列：经典生产者-消费者实现
template <typename T>
class BoundedQueue {
    std::queue<T> queue_;
    size_t capacity_;
    mutable std::mutex mtx_;
    std::condition_variable not_full_;
    std::condition_variable not_empty_;
    bool stopped_ = false;

public:
    explicit BoundedQueue(size_t cap) : capacity_(cap) {}

    /// 生产者：阻塞直到队列非满
    void produce(T value) {
        std::unique_lock<std::mutex> lock(mtx_);
        // 使用谓词形式避免虚假唤醒
        not_full_.wait(lock, [this]() {
            return queue_.size() < capacity_ || stopped_;
        });
        if (stopped_) return;
        queue_.push(std::move(value));
        not_empty_.notify_one();
    }

    /// 消费者：阻塞直到队列非空或停止
    bool consume(T& value) {
        std::unique_lock<std::mutex> lock(mtx_);
        not_empty_.wait(lock, [this]() {
            return !queue_.empty() || stopped_;
        });
        if (queue_.empty()) return false;  // 已停止且空
        value = std::move(queue_.front());
        queue_.pop();
        not_full_.notify_one();
        return true;
    }

    /// 停止队列：唤醒所有等待的线程
    void stop() {
        {
            std::lock_guard<std::mutex> lock(mtx_);
            stopped_ = true;
        }
        not_full_.notify_all();
        not_empty_.notify_all();
    }
};

// 使用示例
int main() {
    BoundedQueue<int> q(10);

    std::thread producer([&q]() {
        for (int i = 0; i < 100; ++i) {
            q.produce(i);
        }
        q.stop();
    });

    std::thread consumer([&q]() {
        int v;
        while (q.consume(v)) {
            std::cout << "consumed: " << v << "\n";
        }
    });

    producer.join();
    consumer.join();
    return 0;
}
```

### 示例 5：future 与 promise

```cpp
#include <future>
#include <iostream>
#include <thread>

/// 异步任务：使用 promise/future 显式传递结果
void producer(std::promise<int>&& p) {
    try {
        std::this_thread::sleep_for(std::chrono::seconds(1));
        // 计算结果
        int result = 42;
        p.set_value(result);  // 设置结果
    } catch (...) {
        p.set_exception(std::current_exception());  // 传递异常
    }
}

int main() {
    std::promise<int> p;
    std::future<int> f = p.get_future();

    std::thread t(producer, std::move(p));

    // 等待结果：阻塞直到就绪
    int result = f.get();  // 若有异常会重新抛出
    std::cout << "Result: " << result << "\n";

    t.join();
    return 0;
}
```

### 示例 6：std::async 与启动策略

```cpp
#include <future>
#include <iostream>

int compute() {
    std::this_thread::sleep_for(std::chrono::seconds(1));
    return 42;
}

int main() {
    // 默认策略：可能延迟执行（deferred），需要 get() 时才执行
    auto f1 = std::async(compute);

    // 强制异步：在新线程执行
    auto f2 = std::async(std::launch::async, compute);

    // 延迟执行：在 get() 调用时同步执行
    auto f3 = std::async(std::launch::deferred, compute);

    // 注意：f1 默认策略可能导致死锁——若主线程在 get() 时阻塞
    // 而任务可能未启动，主线程等到自己执行任务

    std::cout << f1.get() << "\n";  // 42
    std::cout << f2.get() << "\n";  // 42
    std::cout << f3.get() << "\n";  // 42（同步执行）
    return 0;
}
```

### 示例 7：原子操作与内存序

```cpp
#include <atomic>
#include <thread>
#include <iostream>

/// 使用 seq_cst（默认）：最强保证，所有线程一致
void seq_cst_demo() {
    std::atomic<bool> x{false}, y{false};
    std::atomic<int> z{0};

    std::thread t1([&]() { x.store(true); });
    std::thread t2([&]() { y.store(true); });
    std::thread t3([&]() {
        while (!x.load()) ;
        if (y.load()) ++z;
    });
    std::thread t4([&]() {
        while (!y.load()) ;
        if (x.load()) ++z;
    });

    t1.join(); t2.join(); t3.join(); t4.join();
    // seq_cst 保证 z 不会是 0（其中一个线程必然看到另一个的写）
}

/// 使用 acquire/release：弱保证，性能更好
void acq_rel_demo() {
    int data = 0;
    std::atomic<bool> ready{false};

    std::thread producer([&]() {
        data = 42;                                          // (1)
        ready.store(true, std::memory_order_release);      // (2)
    });

    std::thread consumer([&]() {
        while (!ready.load(std::memory_order_acquire)) ;   // (3)
        std::cout << data << "\n";                          // (4) 必然是 42
    });

    producer.join();
    consumer.join();
}

/// relaxed：仅保证原子性，不保证顺序
void relaxed_demo() {
    std::atomic<int> counter{0};
    std::vector<std::thread> threads;
    for (int i = 0; i < 10; ++i) {
        threads.emplace_back([&]() {
            for (int j = 0; j < 1000; ++j) {
                counter.fetch_add(1, std::memory_order_relaxed);
            }
        });
    }
    for (auto& t : threads) t.join();
    std::cout << counter.load() << "\n";  // 必然是 10000
}
```

### 示例 8：无锁栈（Treiber Stack）

```cpp
#include <atomic>
#include <memory>

/// 无锁栈：基于 CAS 实现
/// 注意：本实现存在 ABA 问题，生产环境需要 hazard pointer 或 RCU
template <typename T>
class LockFreeStack {
    struct Node {
        T data;
        Node* next;
        Node(T d) : data(std::move(d)), next(nullptr) {}
    };

    std::atomic<Node*> head_{nullptr};

public:
    void push(T value) {
        Node* new_node = new Node(std::move(value));
        new_node->next = head_.load(std::memory_order_relaxed);
        // CAS：若 head 仍为 new_node->next，则替换为 new_node
        while (!head_.compare_exchange_weak(
            new_node->next, new_node,
            std::memory_order_release,
            std::memory_order_relaxed)) {
            // CAS 失败：head 已被其他线程修改，更新 new_node->next 重试
        }
    }

    /// 注意：pop 后的内存释放存在 ABA 风险
    bool pop(T& result) {
        Node* old_head = head_.load(std::memory_order_relaxed);
        while (old_head &&
               !head_.compare_exchange_weak(
                   old_head, old_head->next,
                   std::memory_order_acquire,
                   std::memory_order_relaxed)) {
        }
        if (!old_head) return false;
        result = std::move(old_head->data);
        delete old_head;  // ABA 风险：此处可能有其他线程仍在访问
        return true;
    }

    ~LockFreeStack() {
        T tmp;
        while (pop(tmp)) ;
    }
};
```

### 示例 9：C++20 jthread 与协作停止

```cpp
#include <thread>
#include <stop_token>
#include <iostream>
#include <chrono>

/// jthread：自动 join + 协作停止
/// 任务函数接收 stop_token，可定期检查是否被请求停止
void monitoredTask(std::stop_token token, int id) {
    while (!token.stop_requested()) {
        std::cout << "Thread " << id << " working...\n";
        std::this_thread::sleep_for(std::chrono::milliseconds(200));
    }
    std::cout << "Thread " << id << " stopped gracefully\n";
}

int main() {
    std::jthread t1(monitoredTask, 1);
    std::jthread t2(monitoredTask, 2);

    // 主线程运行 1 秒
    std::this_thread::sleep_for(std::chrono::seconds(1));

    // 请求停止：jthread 析构时会自动调用 request_stop() + join()
    // 显式调用也可
    t1.request_stop();
    t1.join();

    // t2 离开作用域时自动停止并 join
    return 0;
}
```

### 示例 10：C++20 信号量、闩、屏障

```cpp
#include <semaphore>
#include <latch>
#include <barrier>
#include <thread>
#include <iostream>

/// 信号量：限制并发访问数量
std::counting_semaphore<10> db_pool{3};  // 数据库连接池上限 3

void queryDatabase() {
    db_pool.acquire();   // 获取许可
    // 最多 3 个线程同时执行
    std::cout << "Querying database...\n";
    db_pool.release();   // 释放许可
}

/// 闩（Latch）：一次性同步点
/// 用于等待 N 个线程完成初始化
std::latch init_done{5};

void initWorker(int id) {
    std::cout << "Worker " << id << " initialized\n";
    init_done.count_down();  // 计数 -1
}

/// 屏障（Barrier）：可重用同步点
/// 用于分阶段并行计算
int main() {
    // 5 个线程，每阶段同步一次
    std::barrier sync_point{5, []() noexcept {
        std::cout << "Phase completed\n";
    }};

    auto worker = [&](int id) {
        for (int phase = 0; phase < 3; ++phase) {
            std::cout << "Worker " << id << " phase " << phase << "\n";
            sync_point.arrive_and_wait();  // 等待所有线程完成本阶段
        }
    };

    std::vector<std::jthread> threads;
    for (int i = 0; i < 5; ++i) {
        threads.emplace_back(worker, i);
    }
    return 0;
}
```

### 示例 11：并行算法

```cpp
#include <algorithm>
#include <execution>
#include <vector>
#include <numeric>

int main() {
    std::vector<int> data(1'000'000);
    std::iota(data.begin(), data.end(), 0);

    // 顺序执行
    auto sum1 = std::accumulate(data.begin(), data.end(), 0LL);

    // C++17 并行执行：自动分块并行
    auto sum2 = std::reduce(
        std::execution::par,
        data.begin(), data.end(), 0LL);

    // 并行不向量化
    auto sum3 = std::reduce(
        std::execution::par_unseq,
        data.begin(), data.end(), 0LL);

    // 并行排序
    std::sort(std::execution::par, data.begin(), data.end());

    // 并行 transform
    std::vector<int> result(data.size());
    std::transform(std::execution::par,
        data.begin(), data.end(),
        result.begin(),
        [](int x) { return x * 2; });

    return 0;
}
```

### 示例 12：thread_local 线程局部存储

```cpp
#include <thread>
#include <iostream>

/// thread_local：每个线程独立实例
thread_local int thread_id = 0;
thread_local std::string thread_name = "default";

void worker(int id) {
    thread_id = id;
    thread_name = "thread-" + std::to_string(id);
    std::cout << "ID: " << thread_id << ", Name: " << thread_name << "\n";
}

int main() {
    std::thread t1(worker, 1);
    std::thread t2(worker, 2);

    t1.join();
    t2.join();

    // 主线程的 thread_id 仍是 0
    std::cout << "Main thread_id: " << thread_id << "\n";
    return 0;
}
```

## 对比分析

### 互斥锁 vs 自旋锁 vs 无锁

| 维度 | 互斥锁 | 自旋锁 | 无锁（CAS） |
| ---- | ---- | ---- | ---- |
| 实现复杂度 | 低 | 低 | 高 |
| 临界区长度 | 任意 | 极短 | 极短 |
| 等待策略 | 挂起（让出 CPU） | 忙等待 | CAS 重试 |
| 单核性能 | 中 | 差（浪费 CPU） | 中 |
| 多核性能 | 中 | 好（短临界区） | 好 |
| 公平性 | 可配置 | 不可配置 | 无 |
| 可重入 | 可（recursive_mutex） | 否 | 否 |
| 调试难度 | 中（可观测） | 难（无 backtrace） | 极难 |
| ABA 问题 | 无 | 无 | 有 |
| 内存回收 | 简单 | 简单 | 困难 |

### 不同内存序的适用场景

| 内存序 | 同步保证 | 性能开销 | 典型用途 |
| ------ | -------- | -------- | -------- |
| `relaxed` | 无 | 最低 | 计数器、统计 |
| `consume` | 数据依赖 | 低（已弱化为 acquire） | 极少使用 |
| `acquire` | 读后不重排 | 低 | 读取 flag |
| `release` | 写前不重排 | 低 | 写入 flag |
| `acq_rel` | 读改写 | 中 | fetch_add |
| `seq_cst` | 全局总序 | 高 | 默认、复杂同步 |

### C++ 并发 vs Java 并发

| 特性 | C++ | Java |
| ---- | ---- | ---- |
| 内存模型 | C++11（基于 happens-before） | JMM（JSR-133） |
| 线程 | `std::thread` | `java.lang.Thread` |
| 锁 | `std::mutex` | `synchronized`、`ReentrantLock` |
| 条件变量 | `std::condition_variable` | `Object.wait/notify`、`Condition` |
| 原子 | `std::atomic` | `AtomicInteger` 等 |
| Future | `std::future` | `CompletableFuture`（更强大） |
| 线程池 | 无标准库（需第三方） | `ExecutorService` |
| 协程 | C++20 协程（底层） | Loom Project（虚拟线程） |
| 内存序 | 6 种 | 4 种（volatile、final、synchronized、happens-before） |

### C++ 并发 vs Rust 并发

| 特性 | C++ | Rust |
| ---- | ---- | ---- |
| 数据竞争防护 | 运行时（TSan） | 编译期（所有权 + Send/Sync） |
| 锁 API | `std::lock_guard` | `MutexGuard`（与生命周期绑定） |
| 无锁数据结构 | 手动实现 | `crossbeam`、`tokio` 生态 |
| 协程 | C++20 协程 | async/await |
| 异步运行时 | 无标准 | Tokio、async-std |
| 内存管理 | 手动（RAII） | 编译期 + GC 兜底 |

## 常见陷阱

### 陷阱 1：忘记 join 或 detach

```cpp
void bad() {
    std::thread t([]() { /* ... */ });
    // t 离开作用域前未 join 或 detach
    // std::thread 析构会调用 std::terminate
}  // 程序崩溃
```

**修复**：始终使用 `std::jthread`（C++20），或确保所有路径都调用 `join()`/`detach()`。

### 陷阱 2：在持有锁时调用未知代码

```cpp
void dangerous(Callback cb) {
    std::lock_guard<std::mutex> lock(mtx_);
    cb();  // 回调可能获取其他锁，导致死锁
}
```

**修复**：在锁外调用回调，或使用 `std::call_once`。

### 陷阱 3：条件变量的虚假唤醒

```cpp
// 错误：使用 while 循环检查
std::unique_lock<std::mutex> lock(mtx_);
while (!condition()) {
    cv.wait(lock);  // 可能虚假唤醒，需重新检查
}

// 正确：使用谓词形式，内部自动处理虚假唤醒
cv.wait(lock, [&]() { return condition(); });
```

### 陷阱 4：双重检查锁定的陷阱

```cpp
// 错误：经典的双重检查锁定在 C++11 之前是 UB
std::atomic<Singleton*> ptr{nullptr};
Singleton* get() {
    Singleton* p = ptr.load(std::memory_order_relaxed);  // 错误！
    if (!p) {
        std::lock_guard<std::mutex> lock(mtx_);
        p = ptr.load(std::memory_order_relaxed);
        if (!p) {
            p = new Singleton();
            ptr.store(p, std::memory_order_relaxed);  // 错误！
        }
    }
    return p;
}

// 正确：使用 acquire/release
Singleton* get() {
    Singleton* p = ptr.load(std::memory_order_acquire);
    if (!p) {
        std::lock_guard<std::mutex> lock(mtx_);
        p = ptr.load(std::memory_order_relaxed);
        if (!p) {
            p = new Singleton();
            ptr.store(p, std::memory_order_release);
        }
    }
    return p;
}

// 更简单：C++11 起使用 Meyers Singleton，线程安全
Singleton& get() {
    static Singleton instance;  // C++11 保证线程安全初始化
    return instance;
}
```

### 陷阱 5：lock_guard 与 unique_lock 的误用

```cpp
// lock_guard：轻量，不可中途 unlock
{
    std::lock_guard<std::mutex> lock(mtx_);
    // ...
    lock.unlock();  // 编译错误！lock_guard 不支持
}

// unique_lock：稍重，但灵活
{
    std::unique_lock<std::mutex> lock(mtx_);
    // ...
    lock.unlock();  // 可以
    // ...
    lock.lock();    // 重新加锁
}
```

### 陷阱 6：std::async 的默认启动策略

```cpp
// 错误：默认策略可能延迟执行
auto f = std::async(someTask);
// 在析构 f 时，若任务未启动，会在析构线程同步执行
// 若主线程等待 f，而任务在主线程上执行，会死锁

// 正确：明确指定启动策略
auto f = std::async(std::launch::async, someTask);
```

### 陷阱 7：volatile 不是原子操作

```cpp
// 错误：volatile 仅防止编译器优化，不保证原子性与可见性
volatile int counter = 0;
// 多线程 ++counter 是数据竞争

// 正确：使用 std::atomic
std::atomic<int> counter{0};
counter.fetch_add(1, std::memory_order_relaxed);
```

### 陷阱 8：循环等待导致的死锁

```cpp
// 错误：两个线程以不同顺序获取锁
void transferAtoB() {
    std::lock_guard<std::mutex> la(mtx_a);
    std::lock_guard<std::mutex> lb(mtx_b);  // 可能死锁
}

void transferBtoA() {
    std::lock_guard<std::mutex> lb(mtx_b);
    std::lock_guard<std::mutex> la(mtx_a);  // 死锁
}

// 正确：使用 std::scoped_lock 一次性获取
void transferAtoB() {
    std::scoped_lock lock(mtx_a, mtx_b);  // 原子获取
}
```

### 陷阱 9：内存序使用不当

```cpp
// 错误：使用 relaxed 同步，可能看不到写入
std::atomic<bool> ready{false};
int data = 0;

// 线程 1
data = 42;
ready.store(true, std::memory_order_relaxed);  // 无同步

// 线程 2
while (!ready.load(std::memory_order_relaxed)) ;
assert(data == 42);  // 可能失败

// 正确：使用 release/acquire
ready.store(true, std::memory_order_release);
while (!ready.load(std::memory_order_acquire)) ;
assert(data == 42);  // 必然成立
```

### 陷阱 10：误用 std::atomic 的复合操作

```cpp
// 错误：read-modify-write 非原子
if (counter.load() == 0) {
    counter.store(1);  // 多个线程可能同时通过判断
}

// 正确：使用 CAS
int expected = 0;
while (!counter.compare_exchange_weak(expected, 1)) {
    if (expected != 0) break;
    expected = 0;
}

// 或使用 fetch_add
counter.fetch_add(1);
```

### 陷阱 11：协程的悬垂引用

```cpp
// 错误：协程引用局部变量
Task<int> bad() {
    int x = 42;
    co_await std::suspend_always{};
    co_return x;  // x 已销毁
}

// 正确：传值或使用智能指针
Task<int> good() {
    auto x = std::make_shared<int>(42);
    co_await std::suspend_always{};
    co_return *x;
}
```

### 陷阱 12：jthread 析构时的停止顺序

```cpp
{
    std::jthread t(task);
    // 析构顺序：
    // 1. 调用 request_stop() 设置停止标志
    // 2. 调用 join() 等待线程退出
    // 若任务不响应 stop_token，会一直阻塞
}
```

## 工程实践

### 实践 1：线程池实现

```cpp
#include <vector>
#include <queue>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <future>
#include <functional>
#include <atomic>

/// 通用线程池：支持任意返回类型的任务
/// 设计要点：
/// 1. 任务队列使用 std::function<void()> 隐藏类型差异
/// 2. 使用 packaged_task 保存返回值
/// 3. 支持 graceful shutdown（等待任务完成）
/// 4. 支持 dynamic resize（可选）
class ThreadPool {
    std::vector<std::thread> workers_;
    std::queue<std::function<void()>> tasks_;

    std::mutex mtx_;
    std::condition_variable cv_;
    std::atomic<bool> stop_{false};

public:
    explicit ThreadPool(size_t num_threads = std::thread::hardware_concurrency()) {
        for (size_t i = 0; i < num_threads; ++i) {
            workers_.emplace_back([this]() {
                workerLoop();
            });
        }
    }

    ~ThreadPool() {
        stop_.store(true);
        cv_.notify_all();
        for (auto& w : workers_) {
            if (w.joinable()) w.join();
        }
    }

    /// 提交任务：返回 future 以获取结果
    template <typename F, typename... Args>
    auto submit(F&& f, Args&&... args)
        -> std::future<std::invoke_result_t<F, Args...>>
    {
        using ResultType = std::invoke_result_t<F, Args...>;

        // 使用 shared_ptr 包装 packaged_task，便于在 lambda 中捕获
        auto task = std::make_shared<std::packaged_task<ResultType()>>(
            std::bind(std::forward<F>(f), std::forward<Args>(args)...)
        );

        std::future<ResultType> result = task->get_future();

        {
            std::lock_guard<std::mutex> lock(mtx_);
            tasks_.emplace([task]() { (*task)(); });
        }
        cv_.notify_one();

        return result;
    }

    /// 等待所有任务完成（graceful shutdown）
    void waitAll() {
        std::unique_lock<std::mutex> lock(mtx_);
        cv_.wait(lock, [this]() {
            return tasks_.empty();
        });
    }

private:
    void workerLoop() {
        while (true) {
            std::function<void()> task;
            {
                std::unique_lock<std::mutex> lock(mtx_);
                cv_.wait(lock, [this]() {
                    return stop_.load() || !tasks_.empty();
                });
                if (stop_.load() && tasks_.empty()) return;
                task = std::move(tasks_.front());
                tasks_.pop();
            }
            task();
        }
    }
};

// 使用示例
int main() {
    ThreadPool pool(4);

    auto f1 = pool.submit([]() { return 1 + 2; });
    auto f2 = pool.submit([](int x) { return x * x; }, 5);

    std::cout << f1.get() << "\n";  // 3
    std::cout << f2.get() << "\n";  // 25
    return 0;
}
```

### 实践 2：读写锁缓存

```cpp
#include <shared_mutex>
#include <map>
#include <optional>

/// 线程安全的 LRU 缓存：使用读写锁优化读多写少场景
template <typename K, typename V>
class ThreadSafeCache {
    mutable std::shared_mutex mtx_;
    std::map<K, V> data_;

public:
    /// 读操作：使用共享锁，允许多线程并发读
    std::optional<V> get(const K& key) const {
        std::shared_lock<std::shared_mutex> lock(mtx_);
        auto it = data_.find(key);
        if (it == data_.end()) return std::nullopt;
        return it->second;
    }

    /// 写操作：使用独占锁
    void set(const K& key, const V& value) {
        std::unique_lock<std::shared_mutex> lock(mtx_);
        data_[key] = value;
    }

    /// 删除：独占锁
    bool remove(const K& key) {
        std::unique_lock<std::shared_mutex> lock(mtx_);
        return data_.erase(key) > 0;
    }
};
```

### 实践 3：使用 ThreadSanitizer 检测数据竞争

```cpp
// 编译：g++ -fsanitize=thread -g -O1 main.cpp -o main
// 运行：./main

#include <thread>
#include <atomic>
#include <iostream>

int shared_data = 0;  // 非原子，未加锁
// TSan 会报告此处数据竞争

int main() {
    std::thread t1([]() {
        for (int i = 0; i < 1000; ++i) ++shared_data;
    });
    std::thread t2([]() {
        for (int i = 0; i < 1000; ++i) ++shared_data;
    });
    t1.join();
    t2.join();
    std::cout << shared_data << "\n";  // 可能小于 2000
    return 0;
}
```

### 实践 4：分片锁哈希表

```cpp
#include <vector>
#include <mutex>
#include <list>
#include <functional>

/// 高并发哈希表：分片锁策略
/// 每个分片独立加锁，不同 key 可并行操作
template <typename K, typename V>
class ShardedHashMap {
    static constexpr size_t SHARDS = 64;
    std::vector<std::list<std::pair<K, V>>> buckets_;
    std::vector<std::mutex> mtxs_;
    std::hash<K> hasher_;

public:
    ShardedHashMap() : buckets_(SHARDS), mtxs_(SHARDS) {}

    /// 根据 key 决定分片
    size_t shard(const K& key) const {
        return hasher_(key) % SHARDS;
    }

    void insert(const K& key, const V& value) {
        auto idx = shard(key);
        std::lock_guard<std::mutex> lock(mtxs_[idx]);
        auto& bucket = buckets_[idx];
        for (auto& p : bucket) {
            if (p.first == key) {
                p.second = value;
                return;
            }
        }
        bucket.emplace_back(key, value);
    }

    std::optional<V> get(const K& key) const {
        auto idx = shard(key);
        std::lock_guard<std::mutex> lock(mtxs_[idx]);
        for (const auto& p : buckets_[idx]) {
            if (p.first == key) return p.second;
        }
        return std::nullopt;
    }
};
```

### 实践 5：无锁单生产者-单消费者队列

```cpp
#include <atomic>
#include <memory>

/// SPSC 无锁队列：单生产者-单消费者
/// 基于 ring buffer，无 ABA 问题
template <typename T, size_t Size>
class SPSCQueue {
    std::array<T, Size> buffer_;
    std::atomic<size_t> head_{0};  // 消费者写
    std::atomic<size_t> tail_{0};  // 生产者写

public:
    bool push(const T& value) {
        size_t tail = tail_.load(std::memory_order_relaxed);
        size_t next_tail = (tail + 1) % Size;
        if (next_tail == head_.load(std::memory_order_acquire)) {
            return false;  // 队列满
        }
        buffer_[tail] = value;
        tail_.store(next_tail, std::memory_order_release);
        return true;
    }

    bool pop(T& value) {
        size_t head = head_.load(std::memory_order_relaxed);
        if (head == tail_.load(std::memory_order_acquire)) {
            return false;  // 队列空
        }
        value = buffer_[head];
        head_.store((head + 1) % Size, std::memory_order_release);
        return true;
    }
};
```

### 实践 6：使用 C++20 协程实现异步任务

```cpp
#include <coroutine>
#include <iostream>
#include <future>

/// 简单的协程 Task 类型
struct Task {
    struct promise_type {
        std::promise<int> promise_;
        std::future<int> future_;

        Task get_return_object() {
            return Task{promise_.get_future()};
        }
        std::suspend_never initial_suspend() { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }
        void return_value(int v) { promise_.set_value(v); }
        void unhandled_exception() {
            promise_.set_exception(std::current_exception());
        }
    };

    std::future<int> future_;

    int get() {
        return future_.get();
    }
};

/// 协程函数
Task asyncCompute() {
    co_await std::suspend_always{};
    co_return 42;
}

int main() {
    Task t = asyncCompute();
    std::cout << t.get() << "\n";  // 42
    return 0;
}
```

### 实践 7：避免虚假共享（False Sharing）

```cpp
#include <vector>
#include <thread>
#include <atomic>

/// 错误：多个线程频繁修改同一缓存行的不同变量
struct Counter {
    std::atomic<int> count{0};
    // 64 字节填充避免 false sharing
    char padding[60];
};

/// 正确：使用 alignas 强制对齐
struct alignas(64) AlignedCounter {
    std::atomic<int> count{0};
};

void increment(AlignedCounter& c, int n) {
    for (int i = 0; i < n; ++i) {
        c.count.fetch_add(1, std::memory_order_relaxed);
    }
}

int main() {
    AlignedCounter c1, c2;
    std::thread t1(increment, std::ref(c1), 1'000'000);
    std::thread t2(increment, std::ref(c2), 1'000'000);
    t1.join();
    t2.join();
    return 0;
}
```

## 案例研究

### 案例 1：经典哲学家就餐问题

```cpp
#include <mutex>
#include <thread>
#include <vector>
#include <iostream>

/// 哲学家就餐问题：避免死锁的策略
/// 方案：使用层次锁——每个筷子有编号，哲学家先取编号小的
class DiningPhilosophers {
    std::vector<std::mutex> forks_;
    int n_;

public:
    explicit DiningPhilosophers(int n) : forks_(n), n_(n) {}

    void philosopher(int id) {
        int left = id;
        int right = (id + 1) % n_;

        // 层次锁策略：先取编号小的
        int first = std::min(left, right);
        int second = std::max(left, right);

        std::scoped_lock lock(forks_[first], forks_[second]);
        std::cout << "Philosopher " << id << " is eating\n";
    }
};

int main() {
    DiningPhilosophers dp(5);
    std::vector<std::jthread> philosophers;
    for (int i = 0; i < 5; ++i) {
        philosophers.emplace_back([&dp, i]() { dp.philosopher(i); });
    }
    return 0;
}
```

### 案例 2：生产者-消费者-日志系统

```cpp
#include <queue>
#include <mutex>
#include <condition_variable>
#include <thread>
#include <fstream>
#include <string>

/// 异步日志系统：生产者写入队列，消费者写入文件
class AsyncLogger {
    std::queue<std::string> queue_;
    std::mutex mtx_;
    std::condition_variable cv_;
    std::atomic<bool> running_{true};
    std::thread writer_;
    std::ofstream log_file_;

public:
    explicit AsyncLogger(const std::string& filename)
        : log_file_(filename), writer_([this]() { run(); }) {}

    ~AsyncLogger() {
        running_.store(false);
        cv_.notify_all();
        writer_.join();
    }

    void log(const std::string& msg) {
        {
            std::lock_guard<std::mutex> lock(mtx_);
            queue_.push(msg);
        }
        cv_.notify_one();
    }

private:
    void run() {
        while (true) {
            std::string msg;
            {
                std::unique_lock<std::mutex> lock(mtx_);
                cv_.wait(lock, [this]() {
                    return !queue_.empty() || !running_.load();
                });
                if (queue_.empty() && !running_.load()) return;
                msg = std::move(queue_.front());
                queue_.pop();
            }
            log_file_ << msg << "\n";
            log_file_.flush();
        }
    }
};
```

### 案例 3：并行归约求和

```cpp
#include <vector>
#include <thread>
#include <numeric>
#include <future>
#include <algorithm>

/// 并行求和：将数组分成 N 块，每块单独求和
template <typename T>
T parallelSum(const std::vector<T>& data, size_t num_threads = 4) {
    size_t chunk_size = (data.size() + num_threads - 1) / num_threads;

    std::vector<std::future<T>> futures;
    for (size_t i = 0; i < num_threads; ++i) {
        size_t start = i * chunk_size;
        size_t end = std::min(start + chunk_size, data.size());
        if (start >= end) break;

        futures.push_back(std::async(std::launch::async,
            [&data, start, end]() {
                return std::accumulate(data.begin() + start,
                                       data.begin() + end, T{0});
            }));
    }

    T total = T{0};
    for (auto& f : futures) {
        total += f.get();
    }
    return total;
}

// 使用 C++17 并行算法更简洁
#include <execution>
T parallelSumStd(const std::vector<T>& data) {
    return std::reduce(std::execution::par,
                       data.begin(), data.end(), T{0});
}
```

### 案例 4：基于 Atomic 的引用计数智能指针

```cpp
#include <atomic>
#include <iostream>

/// 简化的 intrusive_ptr：原子引用计数
template <typename T>
class IntrusivePtr {
    T* ptr_;
public:
    IntrusivePtr(T* p = nullptr) : ptr_(p) {
        if (ptr_) ptr_->addRef();
    }
    ~IntrusivePtr() {
        if (ptr_) ptr_->release();
    }
    IntrusivePtr(const IntrusivePtr& o) : ptr_(o.ptr_) {
        if (ptr_) ptr_->addRef();
    }
    // ... 移动语义等
    T* operator->() { return ptr_; }
};

class RefCounted {
    std::atomic<int> ref_count_{0};
public:
    void addRef() {
        ref_count_.fetch_add(1, std::memory_order_relaxed);
    }
    void release() {
        // 释放操作使用 acq_rel：保证析构前的所有操作可见
        if (ref_count_.fetch_sub(1, std::memory_order_acq_rel) == 1) {
            delete this;
        }
    }
    virtual ~RefCounted() = default;
};
```

### 案例 5：Future 的组合

```cpp
#include <future>
#include <iostream>

/// then 组合子：链式异步任务
/// 注意：C++ 标准库未提供，需自行实现
template <typename T, typename F>
auto then(std::future<T>&& fut, F f)
    -> std::future<decltype(f(fut.get()))>
{
    return std::async(std::launch::async,
        [fut = std::move(fut), f]() mutable {
            return f(fut.get());
        });
}

int main() {
    auto f1 = std::async([]() { return 1; });
    auto f2 = then(std::move(f1), [](int x) { return x + 1; });
    auto f3 = then(std::move(f2), [](int x) { return x * 2; });
    std::cout << f3.get() << "\n";  // 4
    return 0;
}
```

### 案例 6：基于 Barrier 的并行计算

```cpp
#include <barrier>
#include <thread>
#include <vector>
#include <cmath>

/// 并行 Jacobi 迭代：求解线性方程组
/// 使用 barrier 同步每个迭代步
void parallelJacobi(std::vector<double>& u, int iterations, int num_threads) {
    int n = u.size();
    std::vector<double> u_new(n);

    std::barrier sync(num_threads, []() noexcept {
        // 完成阶段的回调（无需操作）
    });

    auto worker = [&](int tid) {
        int chunk = (n + num_threads - 1) / num_threads;
        int start = tid * chunk;
        int end = std::min(start + chunk, n);

        for (int iter = 0; iter < iterations; ++iter) {
            // 并行更新
            for (int i = start; i < end; ++i) {
                if (i == 0 || i == n - 1) {
                    u_new[i] = u[i];  // 边界保持
                } else {
                    u_new[i] = 0.5 * (u[i-1] + u[i+1]);
                }
            }
            sync.arrive_and_wait();  // 等待所有线程完成更新

            // 交换 u 与 u_new
            for (int i = start; i < end; ++i) {
                std::swap(u[i], u_new[i]);
            }
            sync.arrive_and_wait();
        }
    };

    std::vector<std::jthread> threads;
    for (int i = 0; i < num_threads; ++i) {
        threads.emplace_back(worker, i);
    }
}
```

## 性能分析

### 锁的开销分解

| 操作 | 典型耗时（x86） | 备注 |
| ---- | ---- | ---- |
| `std::mutex::lock`（无竞争） | ~20 ns | 用户态 fast path |
| `std::mutex::lock`（有竞争） | ~1-10 μs | 内核态切换 |
| `std::shared_mutex::lock_shared` | ~30 ns | 读锁 |
| `std::atomic::load(seq_cst)` | ~5 ns | 缓存命中 |
| `std::atomic::fetch_add(seq_cst)` | ~10-30 ns | 缓存行伪共享时更高 |
| `std::condition_variable::notify_one` | ~1 μs | 唤醒等待线程 |
| 线程创建 + join | ~50 μs | 含栈分配 |
| 线程上下文切换 | ~1-10 μs | 内核调度 |

### 性能优化原则

1. **减少锁的持有时间**：临界区仅包含必要操作；
2. **减小锁的粒度**：分片锁、读写锁；
3. **避免锁嵌套**：使用 `std::scoped_lock` 一次性获取；
4. **优先使用无锁数据结构**：在高竞争场景；
5. **避免 false sharing**：使用对齐填充；
6. **使用合适的内存序**：避免不必要的 `seq_cst`；
7. **使用 thread_local**：减少共享状态；
8. **批量化操作**：减少同步开销。

### Amdahl 定律

$$
\text{Speedup}(N) = \frac{1}{(1 - P) + \frac{P}{N}}
$$

其中 $P$ 是可并行部分比例，$N$ 是处理器数。

若 90% 可并行，10 核加速比仅 5.3 倍；99% 可并行，100 核加速比 50 倍。这解释了为什么单线程性能仍重要——难以完全并行化。

## 与现代 C++ 特性整合

### 与 RAII 整合

`std::lock_guard`、`std::unique_lock`、`std::scoped_lock`、`std::shared_lock` 都是 RAII 包装器，保证锁的自动释放。这是 C++ 异常安全与资源管理哲学的延伸。

### 与移动语义整合

```cpp
std::unique_lock<std::mutex> lock1(mtx_);
std::unique_lock<std::mutex> lock2 = std::move(lock1);  // 移动构造
// lock1 不再持有锁
```

移动语义使得锁可以在线程间传递，支持线程池的任务调度。

### 与 Concepts 整合（C++20）

```cpp
#include <concepts>

template <typename T>
concept Lockable = requires(T m) {
    m.lock();
    m.unlock();
    { m.try_lock() } -> std::convertible_to<bool>;
};

template <Lockable M>
void criticalSection(M& mtx) {
    std::lock_guard<M> lock(mtx);
    // ...
}
```

### 与 Ranges 整合（C++20）

```cpp
#include <ranges>
#include <execution>
#include <algorithm>

/// 并行处理 range
auto data = std::views::iota(0, 1'000'000)
          | std::views::transform([](int x) { return x * 2; });

std::vector<int> vec(data.begin(), data.end());
std::sort(std::execution::par, vec.begin(), vec.end());
```

### 与 Coroutines 整合（C++20）

C++20 协程是异步编程的现代化方案，特别适合 I/O 密集场景。协程相比线程：

- **开销低**：协程切换无需内核态；
- **栈小**：协程栈按需分配；
- **可组合**：协程可嵌套、组合。

但 C++20 协程是底层原语，需第三方库（如 cppcoro、folly）提供高层抽象。

### 与 Modules 整合（C++20）

模块可改善多线程库的导入速度，特别是大量模板的并发库（如 Boost.MPL、TBB）。

## 习题

### 基础题

**习题 1**：以下代码是否有数据竞争？若有，如何修复？

```cpp
int counter = 0;
std::mutex mtx;

void increment() {
    mtx.lock();
    ++counter;
    mtx.unlock();
}

int get() {
    return counter;  // 读取未加锁
}
```

**参考答案要点**：有数据竞争——`get()` 读取未加锁的 `counter`，可能与 `increment()` 的写入竞争。修复：使用 `std::atomic<int>`，或在 `get()` 中加锁。

**习题 2**：以下哪种内存序最适合"统计计数器"？

A. `memory_order_seq_cst`
B. `memory_order_release`
C. `memory_order_relaxed`
D. `memory_order_acquire`

**参考答案要点**：C。统计计数器不需要同步其他数据，仅需原子性，`relaxed` 性能最优。

**习题 3**：解释 `std::lock_guard` 与 `std::unique_lock` 的区别。

**参考答案要点**：`lock_guard` 轻量、不可解锁；`unique_lock` 灵活、可中途 `unlock()`、可延迟加锁、可配合条件变量使用。

### 进阶题

**习题 4**：实现一个线程安全的单例模式（C++11 起的推荐做法）。

**参考答案要点**：

```cpp
class Singleton {
public:
    static Singleton& getInstance() {
        static Singleton instance;  // C++11 保证线程安全初始化
        return instance;
    }
private:
    Singleton() = default;
    Singleton(const Singleton&) = delete;
    Singleton& operator=(const Singleton&) = delete;
};
```

**习题 5**：以下代码会死锁吗？如何修复？

```cpp
std::mutex mtx_a, mtx_b;
void f() {
    std::lock_guard<std::mutex> la(mtx_a);
    std::lock_guard<std::mutex> lb(mtx_b);
}
void g() {
    std::lock_guard<std::mutex> lb(mtx_b);
    std::lock_guard<std::mutex> la(mtx_a);
}
```

**参考答案要点**：会死锁（循环等待）。修复：使用 `std::scoped_lock lock(mtx_a, mtx_b);` 或统一锁顺序。

**习题 6**：解释 `std::async(std::launch::async, f)` 与 `std::thread(f)` 的区别。

**参考答案要点**：`std::async` 返回 `std::future`，可获取返回值与异常；析构 future 会等待任务完成（隐式 join）。`std::thread` 析构需显式 join 或 detach，否则 terminate。

### 挑战题

**习题 7**：设计一个无锁的 FIFO 队列（多生产者多消费者），解决 ABA 问题。

**参考答案要点**：

- 使用 tagged pointer（指针 + 版本号）解决 ABA；
- 或使用 hazard pointer 延迟回收；
- Michael-Scott 队列算法；
- 测试：用 ThreadSanitizer 验证无数据竞争，用 stress test 验证正确性。

**习题 8**：分析以下代码的内存序是否正确，若不正确如何修复？

```cpp
std::atomic<bool> ready{false};
int data = 0;

// 线程 1
data = 42;
ready.store(true, std::memory_order_relaxed);

// 线程 2
while (!ready.load(std::memory_order_relaxed)) ;
assert(data == 42);
```

**参考答案要点**：错误。`relaxed` 不建立 happens-before，data 可能未被线程 2 看到。修复：store 用 `release`，load 用 `acquire`。

**习题 9**：实现一个支持任务优先级的线程池。

**参考答案要点**：

- 使用 `std::priority_queue` 替代普通队列；
- 任务封装 priority 字段；
- 注意：priority_queue 不是线程安全的，需加锁；
- 测试：高优先级任务应优先执行。

**习题 10**：分析 C++20 协程相比线程池的优势与局限。

**参考答案要点**：

优势：

- 协程切换开销极低（用户态）；
- 单线程可承载大量协程（百万级）；
- 代码风格同步、易读；
- 不需要锁，每个协程独立栈。

局限：

- 仅适合 I/O 密集，CPU 密集仍需线程；
- C++20 协程是底层原语，需第三方库；
- 调试困难（无标准 backtrace）；
- 异常处理复杂。

## 参考文献

- [1] Boehm, H.-J. and Adve, S. V. 2008. Foundations of the C++ concurrency memory model. In Proceedings of the 29th ACM SIGPLAN Conference on Programming Language Design and Implementation (PLDI '08). ACM, 68–78. DOI: 10.1145/1375581.1375591.

- [2] McKenney, P. E. and Slingwine, J. D. 1998. Read-copy update: using execution history to solve concurrency problems. In Proceedings of the 10th International Conference on Parallel and Distributed Computing and Systems (PDCS '98). IASTED, 509–518.

- [3] Herlihy, M. and Shavit, N. 2012. The Art of Multiprocessor Programming, Revised Reprint (1st ed.). Morgan Kaufmann, Cambridge, MA, USA.

- [4] Meyers, S. 2014. Effective Modern C++: 42 Specific Ways to Improve Your Use of C++11 and C++14 (1st ed.). O'Reilly Media, Sebastopol, CA, USA.

- [5] Williams, A. 2019. C++ Concurrency in Action (2nd ed.). Manning Publications, Shelter Island, NY, USA.

- [6] Sutter, H. 2005. The free lunch is over: a fundamental turn toward concurrency in software. Dr. Dobb's Journal 30, 3 (March 2005), 202–210.

- [7] Adve, S. V. and Boehm, H.-J. 2005. Memory consistency models and C++. In Proceedings of the Workshop on Memory Systems Performance and Correctness (MSPC '05). ACM, 1–6. DOI: 10.1145/1113933.1113934.

- [8] Coffman, E. G., Elphick, M. J., and Shoshani, A. 1971. System deadlocks. ACM Computing Surveys 3, 2 (June 1971), 67–78. DOI: 10.1145/356586.356588.

- [9] Dijkstra, E. W. 1965. Solution of a problem in concurrent programming control. Communications of the ACM 8, 9 (Sept. 1965), 569. DOI: 10.1145/365559.365617.

- [10] Hoare, C. A. R. 1974. Monitors: an operating system structuring concept. Communications of the ACM 17, 10 (Oct. 1974), 549–557. DOI: 10.1145/355620.361161.

- [11] Michael, M. M. and Scott, M. L. 1996. Simple, fast, and practical non-blocking and blocking concurrent queue algorithms. In Proceedings of the 15th Annual ACM Symposium on Principles of Distributed Computing (PODC '96). ACM, 267–275. DOI: 10.1145/248052.248106.

- [12] Herlihy, M. 1991. Wait-free synchronization. ACM Transactions on Programming Languages and Systems 13, 1 (Jan. 1991), 124–149. DOI: 10.1145/114005.102808.

- [13] Treiber, R. K. 1986. Systems programming: coping with parallelism. IBM Research Report RJ 5118. IBM Almaden Research Center.

- [14] Lamport, L. 1979. How to make a multiprocessor computer that correctly executes multiprocess programs. IEEE Transactions on Computers C-28, 9 (Sept. 1979), 690–691. DOI: 10.1109/TC.1979.1675439.

- [15] Adve, S. V. and Gharachorloo, K. 1996. Shared memory consistency models: a tutorial. Computer 29, 12 (Dec. 1996), 66–76. DOI: 10.1109/2.546611.

- [16] ISO/IEC 14882:2011. Information technology — Programming languages — C++. International Organization for Standardization, Geneva, Switzerland.

- [17] ISO/IEC 14882:2020. Information technology — Programming languages — C++. International Organization for Standardization, Geneva, Switzerland.

- [18] Stone, J., Gohara, D., and Shi, G. 2010. OpenCL: a parallel programming standard for heterogeneous computing systems. Computing in Science and Engineering 12, 3 (May 2010), 66–73. DOI: 10.1109/MCSE.2010.69.

- [19] Lea, D. 2000. A Java fork/join framework. In Proceedings of the ACM 2000 Java Grande Conference. ACM, 36–43. DOI: 10.1145/337465.337486.

- [20] Dagum, L. and Menon, R. 1998. OpenMP: an industry standard API for shared-memory programming. IEEE Computational Science and Engineering 5, 1 (Jan. 1998), 46–55. DOI: 10.1109/99.660313.

- [21] Reinders, J. 2007. Intel Threading Building Blocks: Outfitting C++ for Multi-core Processor Parallelism (1st ed.). O'Reilly Media, Sebastopol, CA, USA.

- [22] Nichols, B., Buttlar, D., and Proulx Farrell, J. 1996. Pthreads Programming: A POSIX Standard for Better Multiprocessing (1st ed.). O'Reilly Media, Sebastopol, CA, USA.

- [23] Schmidt, D. C. and Huston, S. D. 2002. C++ Network Programming, Volume 1: Sockets and PatternAce Frameworks (1st ed.). Addison-Wesley, Boston, MA, USA.

- [24] Attiya, H. and Welch, J. 2004. Distributed Computing: Fundamentals, Simulations, and Advanced Topics (2nd ed.). Wiley-Interscience, Hoboken, NJ, USA.

## 延伸阅读

- **C++ Reference**: <https://en.cppreference.com/w/cpp/thread>
- **C++ Concurrency in Action, 2nd Edition**: Anthony Williams 的经典著作，深入讲解 C++ 并发。
- **The Art of Multiprocessor Programming**: Maurice Herlihy 与 Nir Shavit 的并发编程圣经。
- **Java Concurrency in Practice**: Brian Goetz 等著，虽以 Java 为例，但并发思想通用。
- **P0159 "Concurrency Technical Specification"**: C++ 并发 TS，部分已并入 C++20。
- **P0660 "Cooperative Cancellation"**: C++20 jthread 的协作停止提案。
- **P0534 "C++20 Synchronization"**: semaphore、latch、barrier 提案。
- **P0912 "Merge Coroutines TS"**: C++20 协程并入主标准。
- **ThreadSanitizer**: <https://clang.llvm.org/docs/ThreadSanitizer.html>
- **Intel TBB**: <https://github.com/oneapi-src/oneTBB>
- **Folly Futures**: Facebook 的异步库，提供 future 组合子。
- **Boost.Asio**: 网络与异步 I/O 库，基于 proactor 模式。
- **Seastar**: ScyllaDB 的高性能异步框架。
- **Cpp-Taskflow**: <https://github.com/taskflow/taskflow>，现代 C++ 并行任务流库。
- **Moodycamel ConcurrentQueue**: 高性能无锁 MPMC 队列。
- **Concurrency Hazards**: Intel 的并发陷阱文档系列。
- **Preshing on Programming**: Jeff Preshing 的并发编程博客，深入讲解内存模型。
