---
order: 71
title: C++内存模型
module: cpp
category: C++
difficulty: advanced
description: C++11 原子操作、内存序、happens-before 关系与无锁编程的工程实践
author: fanquanpp
updated: '2026-07-21'
related:
  - cpp/设计模式与C++
  - cpp/面向对象进阶
  - cpp/C++工具链
  - cpp/C++测试框架
  - cpp/C++性能优化
  - cpp/C++并发编程
prerequisites:
  - cpp/概述与现代标准
  - cpp/智能指针详解
  - cpp/多线程
---

## 学习目标

本节按照 Bloom 分类法的认知层级组织学习目标,读者完成本章学习后应能够达到以下层级。

### 识记层 (Remembering)

- 列举 C++11 标准定义的六种内存序(`memory_order_relaxed`、`memory_order_consume`、`memory_order_acquire`、`memory_order_release`、`memory_order_acq_rel`、`memory_order_seq_cst`)
- 说出 `std::atomic`、`std::atomic_flag`、`std::atomic_ref` 三种原子抽象的差异
- 复述 happens-before、synchronizes-with、carries-dependency 三种关系的定义
- 识别 x86-TSO 与 ARMv8 弱内存模型在指令重排上的差异

### 理解层 (Understanding)

- 解释数据竞争 (data race) 导致未定义行为的根本原因
- 阐述 release-acquire 配对如何建立跨线程的 happens-before 关系
- 描述 MESI 缓存一致性协议在多核可见性中的作用
- 区分编译器屏障、CPU 屏障与原子操作三者的层次差异

### 应用层 (Applying)

- 使用 `std::atomic` 实现自旋锁、无锁队列、引用计数等并发原语
- 应用 release-acquire 模式实现生产者-消费者同步
- 使用 `compare_exchange_weak/strong` 实现 CAS (Compare-And-Swap) 算法
- 应用 `alignas(64)` 解决伪共享 (false sharing) 问题

### 分析层 (Analyzing)

- 分析 Dekker 互斥算法在弱内存模型下失效的原因
- 解构双重检查锁定 (DCLP) 在不同内存序下的正确性条件
- 对比seq_cst、acq_rel、relaxed 在不同场景下的性能开销

### 评价层 (Evaluating)

- 评估何时应使用无锁编程、何时应退回互斥锁
- 判断一段并发代码是否存在数据竞争或可见性 bug
- 在 x86 与 ARM 平台之间评估内存序选择的可移植性影响

### 创造层 (Creating)

- 设计一个支持多生产者多消费者的无锁环形缓冲区
- 构建一个跨平台的内存序抽象层,自动适配 TSO 与弱内存模型
- 提出一种基于 hazard pointer 的安全内存回收方案

## 历史动机与背景

C++ 内存模型的诞生是并发编程领域数十年的工程实践与理论研究的结晶。

### 1970-1990:硬件层面的早期探索

早期单处理器时代,内存模型问题不存在。随着多处理器系统出现,IBM 370、VAX、x86 等架构展现出不同的内存可见性行为。1979 年 Leslie Lamport 发表《How to Make a Multiprocessor Computer That Correctly Executes Multiprocess Programs》,首次形式化定义了"顺序一致性"(Sequential Consistency)概念,奠定现代内存模型的理论基础。

### 1990-2000:Java 的首次尝试

1996 年 Java 1.0 引入 `volatile` 关键字试图解决可见性问题,但语义过于模糊。直到 2004 年 JSR-133 才完成 Java Memory Model (JMM) 的重新设计,引入 happens-before、synchronizes-with 等概念,成为后续语言内存模型的范本。Jeremy Manson、Bill Pugh 等人的工作直接影响了 C++ 标准。

### 2002-2008:C++ 标准化的艰难历程

C++98/C++03 没有线程概念,所有多线程行为都依赖平台扩展 (POSIX threads、Windows threads)。2002 年 Boost.Thread 启动,2004 年 Boost.Interatomic 尝试提供跨平台原子操作。Boost 这两项工作成为 C++11 并发标准的原型。

C++ 内存模型的核心设计师 Hans-J. Boehm (HP Labs) 在 2005-2008 年间发表了一系列论文,论证了"无数据竞争"(data-race-free) 语义的必要性。他与 Mark Batty、Peter Sewell (Cambridge) 等人合作,利用形式化方法验证了 C++ 内存模型的一致性。Peter Sewell 团队的 `memevents` 工具对 ARM、POWER、x86 进行了详尽的 litmus test 测试,揭示了真实硬件与直觉的巨大差距。

### 2008-2011:C++11 标准确立

C++11 (ISO/IEC 14882:2011) 第 1.10 节正式定义内存模型,核心要点:

- 引入"数据竞争导致未定义行为"原则 (data-race-free DRF-SC)
- 定义六种内存序,提供从弱到强的灵活选择
- 引入 `std::atomic`、`std::atomic_flag`、`std::thread`、`std::mutex` 等
- 形式化 happens-before、synchronizes-with、sequenced-before 关系

### 2011-2020:C++14/17/20 的渐进完善

C++14 修复了 release/consume 语义的漏洞 (`memory_order_consume` 在实践中难以正确实现,标准建议避免使用)。C++17 引入 `std::atomic_ref`,允许对非原子对象进行原子访问。C++20 引入:

- `std::atomic::wait/notify_one/notify_all`,提供 futex 风格的高效等待
- `std::atomic_ref` 完善为模板
- `std::counting_semaphore`、`std::latch`、`std::barrier` 等同步原语
- `std::jthread` 与协作式取消机制

### 2020 至今:C++23/26 与硬件演进

C++23 进一步完善原子 API,引入 `std::atomic_ref<T>::is_always_lock_free` 等编译期常量。C++26 计划引入 `std::execution` (Sender/Receiver 模型),将异步并发与内存模型深度整合。

硬件层面,ARMv8、RISC-V 等弱内存模型架构在数据中心与移动端普及,x86-TSO 不再是默认假设。Apple Silicon M1/M2、AWS Graviton、华为鲲鹏等 ARM 处理器迫使 C++ 开发者重新审视内存序选择。同时,GPU (CUDA、HIP) 与 CXL (Compute Express Link) 等异构内存架构进一步复杂化了可见性问题。

### 核心动因总结

C++ 内存模型的演化动因可归纳为:

- **跨平台可移植性**:统一 x86、ARM、POWER、RISC-V 等不同架构的并发语义
- **性能优化**:细粒度内存序允许在不牺牲正确性的前提下放松硬件屏障
- **形式化严谨性**:利用数学证明保证并发程序正确性,避免"恰好工作"的脆弱代码
- **编译器优化空间**:明确定义数据竞争 UB,允许编译器进行激进优化

## 形式化定义

### 内存模型的核心问题

内存模型回答一个根本问题:在多线程程序中,一个线程对内存位置的写操作,何时以及如何对其他线程可见?形式化地,内存模型定义了:

$$
\text{MemoryModel} = (\mathcal{O}, \xrightarrow{hb}, \xrightarrow{sw}, \xrightarrow{sb}, \text{visibility})
$$

其中 $\mathcal{O}$ 是所有内存操作集合,$\xrightarrow{hb}$ 是 happens-before 关系,$\xrightarrow{sw}$ 是 synchronizes-with 关系,$\xrightarrow{sb}$ 是 sequenced-before 关系。

### Sequenced-Before 关系

在同一线程内,操作之间的 sequenced-before 关系 $\xrightarrow{sb}$ 由求值规则决定:

$$
a \xrightarrow{sb} b \iff \text{a 在 b 之前求值,且在同一线程内}
$$

例如 `int x = 1; int y = x + 1;` 中,`x=1` sequenced-before `y=x+1`。但子表达式求值顺序 (`f(g(), h())`) 在某些情况下未指定,不构成 sequenced-before。

### Synchronizes-With 关系

跨线程的同步通过 synchronizes-with 关系 $\xrightarrow{sw}$ 建立:

$$
A \xrightarrow{sw} B \iff \text{A 是 release 写,B 是对应的 acquire 读,且读到 A 写入的值}
$$

具体而言,若线程 T1 执行 `x.store(v, release)`,线程 T2 执行 `x.load(acquire)` 且读到 `v`,则 `x.store` synchronizes-with `x.load`。

### Happens-Before 关系

happens-before 关系 $\xrightarrow{hb}$ 是 sequenced-before 与 synchronizes-with 的传递闭包:

$$
\xrightarrow{hb} = (\xrightarrow{sb} \cup \xrightarrow{sw})^{+}
$$

即 $a \xrightarrow{hb} b$ 当且仅当存在有限序列 $a = o_1, o_2, \ldots, o_n = b$,使得每对相邻 $o_i \xrightarrow{sb} o_{i+1}$ 或 $o_i \xrightarrow{sw} o_{i+1}$。

### 数据竞争的形式化定义

给定两个操作 $o_1, o_2$,若满足:

1. $o_1, o_2$ 访问同一内存位置
2. 至少一个是写操作
3. $o_1 \not\xrightarrow{hb} o_2$ 且 $o_2 \not\xrightarrow{hb} o_1$
4. 二者在不同线程

则构成数据竞争 (data race)。C++ 标准规定:**无数据竞争的程序在顺序一致性语义下执行** (DRF-SC)。

### 内存序的数学语义

六种内存序的行为可形式化为对重排序的限制:

| 内存序                  | 写入端约束               | 读取端约束               | 全序保证     |
| ----------------------- | ------------------------ | ------------------------ | ------------ |
| `relaxed`               | 无                       | 无                       | 无           |
| `consume`               | 当前线程相关读不重排其后 | 依赖操作不重排其前       | 无           |
| `acquire`               | -                        | 后续读写不重排其前       | 无           |
| `release`               | 之前读写不重排其后       | -                        | 无           |
| `acq_rel` (RMW)         | 之前读写不重排其后       | 后续读写不重排其前       | 无           |
| `seq_cst`               | 之前读写不重排其后       | 后续读写不重排其前       | 单一全局总序 |

### 顺序一致性的形式化

顺序一致性 (Sequential Consistency, SC) 要求存在单一全局总序 $<_\text{sc}$,满足:

1. 每个 `seq_cst` 操作在 $<_\text{sc}$ 中线性排列
2. $<_\text{sc}$ 与各线程的 sequenced-before 一致
3. $<_\text{sc}$ 与 synchronizes-with 一致
4. 每个 `seq_cst` 读操作读到最近一次 `seq_cst` 写操作的值

### 修改顺序 (Modification Order)

每个原子对象有一个修改顺序 $<_\text{mo}$,即所有写操作的单一全序。读操作看到的值必须按 $<_\text{mo}$ 单调推进 (coherence):

$$
\forall \text{read } r_i, r_j: i \xrightarrow{hb} j \implies \text{value}(r_i) \leq_{\text{mo}} \text{value}(r_j)
$$

### Cache Coherence 与硬件实现

硬件层缓存一致性通常采用 MESI 协议,定义四种缓存行状态:

| 状态             | 含义                         | 读 | 写 | 广播 |
| ---------------- | ---------------------------- | -- | -- | ---- |
| Modified (M)     | 独占,脏数据                 | 是 | 是 | 否   |
| Exclusive (E)    | 独占,干净数据               | 是 | 是 | 否   |
| Shared (S)       | 共享,干净数据               | 是 | 否 | 是   |
| Invalid (I)      | 无效                         | 否 | 否 | -    |

MESI 保证单写多读一致性,但不保证全局顺序。x86-TSO 在 MESI 之上增加 Store Buffer 与 Memory Ordering Machine Clear,提供"Total Store Order"。ARM/RISC-V 则允许更激进的重排,需要显式屏障 (DMB/DSB/ISB)。

## 理论推导

### Store Buffer 导致的可见性延迟

x86-TSO 模型中,每个核心有 Store Buffer。考虑:

```
// 线程 0          // 线程 1
x = 1;             r1 = y;  // 0
y = 1;             r2 = x;  // 0?
```

在严格 SC 下,`r1=0, r2=0` 不可能 (因为 `x=1` 与 `y=1` 中至少一个先发生)。但在 TSO 下,`x=1` 进入 Store Buffer,线程 0 继续执行 `y=1`;线程 1 看到 `y=0` 后读 `x` 也可能从自己的缓存读到 0。结果 `(r1, r2) = (0, 0)` 在 TSO 下合法。

形式化描述:TSO 允许 `store-store` 重排,但禁止 `load-load`、`load-store`、`store-load` (后者需特殊情况)。即:

$$
\text{Store}(x) \xrightarrow{sb} \text{Store}(y) \not\Rightarrow \text{Store}(x) \xrightarrow{hb} \text{Store}(y) \text{ (TSO)}
$$

### Dekker 互斥在弱内存模型下失效

Dekker 算法经典实现:

```
// 线程 0                // 线程 1
flag0 = true;            flag1 = true;
if (flag1) {             if (flag0) {
    flag0 = false;           flag1 = false;
    // 等待重试             // 等待重试
} else {                 } else {
    // 临界区               // 临界区
}                        }
```

在 SC 下,两个线程不能同时进入临界区。但在 ARM 等弱内存模型下,`flag0 = true` 与 `if (flag1)` 之间无屏障,可能被重排,导致两者同时看到对方 flag 为 false。修复需要 `atomic_thread_fence(seq_cst)` 或使用 `seq_cst` 原子。

### ABA 问题的形式化

考虑无锁栈的 pop 操作:

```
Node* old = head.load();
Node* next = old->next;
if (head.compare_exchange_weak(old, next)) { /* 成功 */ }
```

ABA 问题:线程 T1 读取 `head = A`,被抢占;T2 pop A, pop B, push A (复用节点)。T1 唤醒后 CAS(A, next) 仍成功,但 `A->next` 可能指向已释放的 B。

形式化:

$$
\text{ABA}: \text{CAS}(A, B) \text{ 成功} \nRightarrow A \text{ 在期间未被修改}
$$

解决方案:版本号 (tagged pointer)、hazard pointer、epoch-based reclamation。

### CAS 复杂度与无锁进度保证

无锁 (lock-free) 算法的进度保证层次:

| 性质            | 定义                                       |
| --------------- | ------------------------------------------ |
| wait-free       | 每个操作在有限步内完成                     |
| lock-free       | 至少一个操作在有限步内完成                 |
| obstruction-free | 单线程独占时,操作在有限步内完成          |

CAS 循环通常只能保证 lock-free。若所有线程同时竞争,理论上可能无限重试。Herlihy & Shavit 证明,使用 CAS 实现的任意共识对象存在共识数 (consensus number) 限制:CAS 的共识数为 $\infty$,但读-改-写 (RMW) 操作的共识数有限。

### 内存序与硬件屏障映射

不同内存序在不同架构上映射为不同指令:

| 内存序                | x86 指令                  | ARMv8 指令            |
| --------------------- | ------------------------- | --------------------- |
| `relaxed`             | 普通 MOV                  | 普通 LDR/STR          |
| `acquire` (load)      | 普通 MOV                  | LDAR (Load-Acquire)   |
| `release` (store)     | 普通 MOV                  | STLR (Store-Release)  |
| `seq_cst` (load)      | 普通 MOV (部分需 LFENCE)  | LDAR                  |
| `seq_cst` (store)     | MOV + MFENCE (或 LOCK XCHG) | STLR + DMB ISH       |
| `seq_cst` (RMW)       | LOCK CMPXCHG              | LDAXR/STLXR 循环      |

x86 上 `seq_cst` store 需要额外 MFENCE,开销显著。ARMv8 的 LDAR/STLR 设计使得 `acquire/release` 几乎无开销,但 `seq_cst` 仍需 DMB。

### 伪共享的性能影响

缓存行通常 64 字节。若两个原子变量在同一缓存行,跨核修改会触发 MESI 协议的 invalidate 风暴,性能下降 10-100 倍。形式化:

$$
T_\text{false-sharing} = O(n \cdot T_\text{MESI})
$$

而独立缓存行时:

$$
T_\text{independent} = O(T_\text{local})
$$

使用 `alignas(64)` 或 `[[likely]]`/`[[unlikely]]` 属性可缓解。

## 代码示例

### 示例 1:原子计数器与多种内存序对比

```cpp
#include <atomic>
#include <chrono>
#include <iostream>
#include <thread>
#include <vector>

// 演示不同内存序在原子计数器场景下的正确性与性能差异
class AtomicCounter {
    std::atomic<long> value_{0};
public:
    // relaxed 版本:仅保证原子性,不保证其他变量可见性
    void increment_relaxed() {
        value_.fetch_add(1, std::memory_order_relaxed);
    }

    // seq_cst 版本:最强保证,开销最大
    void increment_seq_cst() {
        value_.fetch_add(1, std::memory_order_seq_cst);
    }

    // acq_rel 版本:RMW 操作的折中选择
    void increment_acq_rel() {
        value_.fetch_add(1, std::memory_order_acq_rel);
    }

    long load() const {
        return value_.load(std::memory_order_acquire);
    }
};

// 性能基准测试
void benchmark(const char* name, void (AtomicCounter::*op)()) {
    AtomicCounter counter;
    constexpr int kThreads = 8;
    constexpr int kIters = 10'000'000;
    std::vector<std::thread> threads;
    auto start = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < kThreads; ++i) {
        threads.emplace_back([&counter, op]() {
            for (int j = 0; j < kIters; ++j) {
                (counter.*op)();
            }
        });
    }
    for (auto& t : threads) t.join();
    auto end = std::chrono::high_resolution_clock::now();
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();
    std::cout << name << ": " << ms << " ms, result=" << counter.load() << "\n";
}

int main() {
    // relaxed 最快,seq_cst 最慢,acq_rel 居中
    benchmark("relaxed ", &AtomicCounter::increment_relaxed);
    benchmark("acq_rel ", &AtomicCounter::increment_acq_rel);
    benchmark("seq_cst ", &AtomicCounter::increment_seq_cst);
    return 0;
}
```

### 示例 2:Release-Acquire 模式的生产者-消费者

```cpp
#include <atomic>
#include <chrono>
#include <iostream>
#include <string>
#include <thread>

// 演示 release-acquire 配对建立 happens-before 关系
// 生产者写入数据后 release store 标志位,消费者 acquire load 看到标志位后必定看到数据
struct Payload {
    int id;
    double value;
    char name[32];
};

Payload shared_payload;
std::atomic<bool> ready{false};

// 生产者线程:先填充数据,再 release store 通知消费者
void producer() {
    // 1. 准备数据 (sequenced-before store)
    shared_payload.id = 42;
    shared_payload.value = 3.14159;
    std::snprintf(shared_payload.name, sizeof(shared_payload.name), "example");

    // 2. release store:之前的所有写入对 acquire 读取者可见
    //    标准保证:shared_payload 的写入 happens-before ready.store
    ready.store(true, std::memory_order_release);
}

// 消费者线程:acquire load 等待标志位,看到后必定能看到生产者的全部写入
void consumer() {
    // 1. 自旋等待 ready 变为 true
    //    acquire load:之后的读取不会被重排到此 load 之前
    while (!ready.load(std::memory_order_acquire)) {
        std::this_thread::yield();  // 让出 CPU,避免空转消耗
    }

    // 2. 此时 shared_payload 的所有字段必定可见且一致
    //    因为 ready.store (release) synchronizes-with ready.load (acquire)
    //    而 producer 中 payload 填充 sequenced-before store
    //    consumer 中 load sequenced-before payload 读取
    //    根据 happens-before 传递性,数据写入 happens-before 数据读取
    std::cout << "id=" << shared_payload.id
              << " value=" << shared_payload.value
              << " name=" << shared_payload.name << "\n";
}

int main() {
    std::thread t1(producer);
    std::thread t2(consumer);
    t1.join();
    t2.join();
    return 0;
}
```

### 示例 3:无锁 SPSC 环形队列

```cpp
#include <atomic>
#include <optional>
#include <new>

// 单生产者单消费者无锁队列,基于环形缓冲区
// 关键点:
// 1. head 与 tail 分别由生产者与消费者独占修改,避免 CAS 竞争
// 2. 使用 alignas(64) 避免 head 与 tail 落入同一缓存行 (伪共享)
// 3. 使用 acquire-release 配对同步数据访问
template <typename T, size_t Capacity>
class SPSCQueue {
    // 缓存行对齐,避免 head 与 tail 伪共享
    alignas(64) std::atomic<size_t> head_{0};  // 消费者读位置
    alignas(64) std::atomic<size_t> tail_{0};  // 生产者写位置
    alignas(64) T buffer_[Capacity];           // 数据存储

public:
    // 生产者调用:将 item 入队
    bool push(const T& item) {
        const size_t tail = tail_.load(std::memory_order_relaxed);
        const size_t next_tail = (tail + 1) % Capacity;

        // 检查队列是否已满:读取 head (acquire)
        // 同步消费者的 pop 操作:消费者 pop 后 release store head
        if (next_tail == head_.load(std::memory_order_acquire)) {
            return false;  // 队列满
        }

        // 写入数据,然后 release store tail 通知消费者
        buffer_[tail] = item;
        tail_.store(next_tail, std::memory_order_release);
        return true;
    }

    // 消费者调用:出队
    std::optional<T> pop() {
        const size_t head = head_.load(std::memory_order_relaxed);

        // 检查队列是否为空:读取 tail (acquire)
        // 同步生产者的 push 操作
        if (head == tail_.load(std::memory_order_acquire)) {
            return std::nullopt;  // 队列空
        }

        // 读取数据,然后 release store head 通知生产者
        T item = buffer_[head];
        head_.store((head + 1) % Capacity, std::memory_order_release);
        return item;
    }
};

// 使用示例
int main() {
    SPSCQueue<int, 1024> queue;
    std::atomic<bool> done{false};

    // 生产者线程
    std::thread producer([&]() {
        for (int i = 0; i < 100000; ++i) {
            while (!queue.push(i)) {
                std::this_thread::yield();
            }
        }
        done.store(true, std::memory_order_release);
    });

    // 消费者线程
    std::thread consumer([&]() {
        int sum = 0;
        while (true) {
            auto item = queue.pop();
            if (item) {
                sum += *item;
            } else if (done.load(std::memory_order_acquire)) {
                // 队列空且生产者已完成
                if (!queue.pop()) break;
            }
        }
        std::cout << "sum=" << sum << "\n";
    });

    producer.join();
    consumer.join();
    return 0;
}
```

### 示例 4:CAS 实现的无锁栈

```cpp
#include <atomic>
#include <iostream>
#include <thread>

// 基于 CAS 的无锁栈 (Treiber Stack)
// 注意:此实现存在 ABA 问题,实际生产环境需配合 hazard pointer 或 RCU
template <typename T>
class LockFreeStack {
    struct Node {
        T data;
        Node* next;
        Node(const T& d) : data(d), next(nullptr) {}
    };

    std::atomic<Node*> head_{nullptr};

public:
    void push(const T& value) {
        Node* new_node = new Node(value);
        // 1. 读取当前 head (relaxed:不需要同步,仅作为 CAS 期望值)
        new_node->next = head_.load(std::memory_order_relaxed);

        // 2. CAS 循环:尝试将 head 从 new_node->next 改为 new_node
        //    成功用 release:确保 new_node 的写入对 acquire 读取者可见
        //    失败用 relaxed:其他线程的修改不需要同步到本线程
        while (!head_.compare_exchange_weak(
            new_node->next,  // 期望值 (会被自动更新)
            new_node,        // 欲写入值
            std::memory_order_release,
            std::memory_order_relaxed)) {
            // CAS 失败,new_node->next 已被更新为最新 head,继续重试
        }
    }

    // 出栈:返回栈顶元素,空栈返回 false
    bool pop(T& result) {
        Node* old_head = head_.load(std::memory_order_acquire);
        while (old_head) {
            // acquire 读取 old_head 后,old_head->next 必定可见
            // (因为 push 时 release store 保证)
            Node* next = old_head->next;

            // 尝试将 head 从 old_head 改为 next
            if (head_.compare_exchange_weak(
                old_head,
                next,
                std::memory_order_acquire,
                std::memory_order_relaxed)) {
                // 成功:old_head 已被弹出
                result = old_head->data;
                // 注意:此处存在 use-after-free 风险 (ABA 问题)
                // 实际生产环境需使用 hazard pointer 延迟回收
                delete old_head;
                return true;
            }
            // CAS 失败,old_head 已被更新,继续重试
        }
        return false;  // 栈空
    }
};

int main() {
    LockFreeStack<int> stack;
    std::vector<std::thread> threads;

    // 多线程并发 push
    for (int t = 0; t < 4; ++t) {
        threads.emplace_back([&stack, t]() {
            for (int i = 0; i < 1000; ++i) {
                stack.push(t * 1000 + i);
            }
        });
    }

    // 多线程并发 pop
    std::atomic<int> popped_count{0};
    for (int t = 0; t < 4; ++t) {
        threads.emplace_back([&stack, &popped_count]() {
            int value;
            while (stack.pop(value)) {
                popped_count.fetch_add(1, std::memory_order_relaxed);
            }
        });
    }

    for (auto& th : threads) th.join();
    std::cout << "popped " << popped_count.load() << " items\n";
    return 0;
}
```

### 示例 5:双重检查锁定 (DCLP) 的正确实现

```cpp
#include <atomic>
#include <memory>
#include <mutex>

// 双重检查锁定模式:延迟初始化且避免重复加锁
// 错误实现分析:
//   if (ptr == nullptr) { lock; if (ptr == nullptr) ptr = new Obj; unlock; }
//   问题:ptr = new Obj 分为 (1) 分配内存 (2) 构造对象 (3) 赋值给 ptr
//   编译器可能重排为 (1)(3)(2),其他线程看到 ptr 非空但对象未构造
class Singleton {
    static std::atomic<Singleton*> instance_;
    static std::mutex mtx_;
    Singleton() = default;

public:
    static Singleton* getInstance() {
        // 第一次检查 (acquire):与 release store 配对,确保看到完整对象
        Singleton* tmp = instance_.load(std::memory_order_acquire);
        if (tmp == nullptr) {
            // 加锁,串行化初始化
            std::lock_guard<std::mutex> lock(mtx_);
            // 第二次检查 (relaxed):已在锁内,无需同步
            tmp = instance_.load(std::memory_order_relaxed);
            if (tmp == nullptr) {
                tmp = new Singleton();  // 构造完整对象
                // release store:确保构造的写入对 acquire 读取者可见
                instance_.store(tmp, std::memory_order_release);
            }
        }
        return tmp;
    }
};

std::atomic<Singleton*> Singleton::instance_{nullptr};
std::mutex Singleton::mtx_;

// C++11 后更推荐使用局部静态变量,编译器保证线程安全初始化
class ModernSingleton {
    ModernSingleton() = default;
public:
    static ModernSingleton& getInstance() {
        // C++11 [stmt.dcl]/4:局部静态变量初始化线程安全
        static ModernSingleton instance;
        return instance;
    }
};

int main() {
    auto* p1 = Singleton::getInstance();
    auto* p2 = Singleton::getInstance();
    std::cout << "same instance: " << (p1 == p2) << "\n";
    return 0;
}
```

### 示例 6:C++20 wait/notify 高效等待

```cpp
#include <atomic>
#include <chrono>
#include <iostream>
#include <thread>

// C++20 引入 atomic::wait/notify,底层使用 futex (Linux) 或类似机制
// 相比自旋或 condition_variable,大幅降低 CPU 占用
class EventFlag {
    std::atomic<int> flag_{0};
public:
    // 等待方:阻塞直到 flag 不等于 expected
    void wait(int expected) {
        // wait 内部会处理虚假唤醒:每次唤醒后重新检查
        flag_.wait(expected, std::memory_order_acquire);
    }

    // 通知方:修改 flag 并唤醒一个等待线程
    void set_and_notify_one(int value) {
        flag_.store(value, std::memory_order_release);
        flag_.notify_one();  // 唤醒一个等待线程
    }

    // 通知所有等待线程
    void set_and_notify_all(int value) {
        flag_.store(value, std::memory_order_release);
        flag_.notify_all();
    }

    int load() const { return flag_.load(std::memory_order_acquire); }
};

int main() {
    EventFlag event;

    // 等待线程
    std::thread waiter([&]() {
        std::cout << "waiter: waiting for signal...\n";
        event.wait(0);  // 阻塞直到 flag != 0
        std::cout << "waiter: received signal, flag=" << event.load() << "\n";
    });

    // 通知线程
    std::thread notifier([&]() {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        std::cout << "notifier: sending signal\n";
        event.set_and_notify_one(42);
    });

    waiter.join();
    notifier.join();
    return 0;
}
```

### 示例 7:内存屏障 fence 的灵活用法

```cpp
#include <atomic>
#include <iostream>
#include <thread>

// std::atomic_thread_fence 提供独立的内存屏障
// 与原子操作配合,可实现更灵活的同步模式
// 适用场景:多个数据变量只需一个屏障,而非每个都用 acquire/release

int data1 = 0, data2 = 0, data3 = 0;
std::atomic<bool> flag{false};

// 写入方:先写多个数据,再用单个 fence + relaxed store
void writer() {
    data1 = 100;
    data2 = 200;
    data3 = 300;

    // release fence:之前的所有写入不会被重排到 fence 之后
    std::atomic_thread_fence(std::memory_order_release);

    // relaxed store:仅修改 flag,无额外同步开销
    flag.store(true, std::memory_order_relaxed);
}

// 读取方:relaxed load + acquire fence
void reader() {
    // relaxed load:仅检查 flag
    while (!flag.load(std::memory_order_relaxed)) {
        // 自旋等待
    }

    // acquire fence:之后的所有读取不会被重排到 fence 之前
    std::atomic_thread_fence(std::memory_order_acquire);

    // 此时 data1/2/3 必定可见且一致
    std::cout << "data1=" << data1 << " data2=" << data2 << " data3=" << data3 << "\n";
}

int main() {
    std::thread w(writer);
    std::thread r(reader);
    w.join();
    r.join();
    return 0;
}
```

### 示例 8:引用计数智能指针的线程安全实现

```cpp
#include <atomic>
#include <iostream>

// 演示 std::shared_ptr 内部引用计数的原子操作原理
// shared_ptr 使用分离的引用计数:强引用 (shared) 与弱引用 (weak)
template <typename T>
class IntrusiveSharedPtr {
    struct ControlBlock {
        std::atomic<long> strong_count{1};
        std::atomic<long> weak_count{1};  // weak_count 包含 strong 引用
        T* ptr;

        ControlBlock(T* p) : ptr(p) {}

        void destroy() {
            delete ptr;
            // 强引用归零,弱引用减一
            if (weak_count.fetch_sub(1, std::memory_order_acq_rel) == 1) {
                delete this;
            }
        }
    };

    ControlBlock* control_{nullptr};

public:
    explicit IntrusiveSharedPtr(T* p = nullptr) : control_(p ? new ControlBlock(p) : nullptr) {}

    // 拷贝构造:增加强引用计数
    IntrusiveSharedPtr(const IntrusiveSharedPtr& other) : control_(other.control_) {
        if (control_) {
            // relaxed:仅增加计数,不影响对象本身的可见性
            // 因为其他线程持有时对象必定有效
            control_->strong_count.fetch_add(1, std::memory_order_relaxed);
        }
    }

    // 析构:减少强引用计数
    ~IntrusiveSharedPtr() {
        if (control_) {
            // release:确保对此对象的所有写入在减计数之前完成
            if (control_->strong_count.fetch_sub(1, std::memory_order_acq_rel) == 1) {
                // acquire:与之前的 release 配对,确保看到所有写入
                control_->destroy();
            }
        }
    }

    T& operator*() const { return *control_->ptr; }
    T* operator->() const { return control_->ptr; }
    long use_count() const {
        return control_ ? control_->strong_count.load(std::memory_order_relaxed) : 0;
    }
};

int main() {
    IntrusiveSharedPtr<int> p1(new int(42));
    std::cout << "count after p1: " << p1.use_count() << "\n";

    {
        IntrusiveSharedPtr<int> p2 = p1;
        std::cout << "count after p2: " << p1.use_count() << "\n";
    }

    std::cout << "count after p2 destroyed: " << p1.use_count() << "\n";
    std::cout << "value: " << *p1 << "\n";
    return 0;
}
```

## 对比分析

### 内存序性能对比

| 内存序      | x86 开销 | ARM 开销 | 适用场景                       | 风险等级 |
| ----------- | -------- | -------- | ------------------------------ | -------- |
| `relaxed`   | 最低     | 最低     | 计数器、统计                   | 高 (易误用) |
| `acquire`/`release` | 低 | 中 | 单向同步 (生产者-消费者) | 低       |
| `acq_rel`   | 中       | 中       | RMW 操作 (CAS)                 | 低       |
| `seq_cst`   | 高       | 高       | 复杂同步、跨变量约束           | 极低     |

x86 上 `acquire`/`release` 几乎免费 (普通 MOV),`seq_cst` store 需要 MFENCE (约 30-50 周期)。ARMv8 上 LDAR/STLR 比 relaxed 贵约 2-3 周期,`seq_cst` 需 DMB ISH (约 50-100 周期)。

### 同步原语对比

| 原语                  | 进度保证           | 适用场景                | 缺点                       |
| --------------------- | ------------------ | ----------------------- | -------------------------- |
| `std::mutex`          | 阻塞 (kernel)      | 通用临界区              | 上下文切换开销大           |
| `std::shared_mutex`   | 阻塞               | 读多写少                | 写饥饿风险                 |
| `SpinLock` (atomic)   | lock-free          | 短临界区                | CPU 空转,优先级反转        |
| `std::atomic<T>`      | 取决于操作         | 计数、标志、CAS         | 仅适合单一变量             |
| `std::counting_semaphore` | 阻塞           | 资源池                  | C++20 才支持               |
| `std::latch`          | 一次性             | 等待 N 个线程到位       | 不可重置                   |
| `std::barrier`        | 可重置             | 阶段性并行              | 复杂度较高                 |

### 无锁 vs 互斥锁

| 维度       | 互斥锁                 | 无锁                          |
| ---------- | ---------------------- | ----------------------------- |
| 公平性     | 可配置 (fair/unfair)   | 通常不公平                    |
| 优先级反转 | 内核可解决 (PI)        | 无法解决                      |
| 上下文切换 | 短临界区浪费           | 无切换                        |
| ABA 问题   | 不存在                 | 需额外机制                    |
| 内存回收   | 简单                   | 复杂 (hazard/epoch)           |
| 调试难度   | 容易 (deadlock 可定位) | 极难 (race 难复现)            |
| 适用场景   | 通用                   | 低延迟、高吞吐、临界区极短    |

### 跨架构内存序映射

| 操作             | x86-TSO              | ARMv8                  | RISC-V                 |
| ---------------- | -------------------- | ---------------------- | ---------------------- |
| relaxed load     | MOV                  | LDR                    | LD                     |
| acquire load     | MOV                  | LDAR                   | LD + FENCE R           |
| release store    | MOV                  | STLR                   | FENCE W + ST           |
| seq_cst load     | MOV (+ LFENCE 偶尔)  | LDAR                   | LD + FENCE RW          |
| seq_cst store    | MOV; MFENCE          | STLR + DMB ISH         | FENCE RW + ST          |
| seq_cst RMW      | LOCK CMPXCHG         | LDAXR/STLXR             | LR/SC + FENCE          |

x86 上 `seq_cst` store 显著贵于 `release`,但 ARMv8 上 LDAR/STLR 设计使得 acquire/release 几乎免费。这导致同一段代码在不同架构上性能差异巨大。

### atomic vs atomic_ref vs volatile

| 特性          | `std::atomic<T>`          | `std::atomic_ref<T>` (C++20) | `volatile T`        |
| ------------- | ------------------------- | ---------------------------- | ------------------- |
| 原子性        | 是                        | 是                           | 否 (仅阻止编译器优化) |
| 内存序        | 支持                      | 支持                         | 不支持              |
| 可构造        | 直接                      | 引用已存在对象               | 直接                |
| 跨线程同步    | 是                        | 是                           | 否                  |
| 适用场景      | 通用原子                  | 第三方库对象原子化           | 硬件寄存器 (非并发) |

`volatile` 在 C++ 中**不**提供线程安全,仅用于 MMIO 等场景。Java 的 `volatile` 等价于 C++ 的 `atomic<T>` with `seq_cst`,二者语义完全不同。

## 常见陷阱与反模式

### 反模式 1:误用 relaxed 同步非原子变量

```cpp
// 错误:relaxed 不提供任何同步语义
int data = 0;
std::atomic<bool> ready{false};

// 线程 A
data = 42;
ready.store(true, std::memory_order_relaxed);  // data 对其他线程可能不可见!

// 线程 B
if (ready.load(std::memory_order_relaxed)) {
    std::cout << data;  // 未定义行为:可能读到 0
}
```

**生产事故**:某高频交易系统使用 relaxed 同步订单簿,在 ARM 服务器上出现订单丢失,定位耗时 3 周。修复改为 release-acquire 后问题消失。

**正确做法**:

```cpp
data = 42;
ready.store(true, std::memory_order_release);  // 确保 data 可见

if (ready.load(std::memory_order_acquire)) {
    std::cout << data;  // 安全:看到 42
}
```

### 反模式 2:误用 volatile 实现线程安全

```cpp
// 错误:C++ 的 volatile 不提供原子性或可见性
volatile int counter = 0;
void increment() {
    counter++;  // 非原子,多线程下数据竞争
}
```

**原因**:C++ `volatile` 仅阻止编译器优化 (如寄存器缓存),不生成内存屏障,不保证 CPU 层原子性。这是 C++ 与 Java 的关键差异。

### 反模式 3:DCLP 错误实现

```cpp
// 错误:双重检查锁定未使用原子
Singleton* Singleton::getInstance() {
    if (instance_ == nullptr) {  // 第一次检查:数据竞争
        std::lock_guard<std::mutex> lock(mtx_);
        if (instance_ == nullptr) {
            instance_ = new Singleton();  // 重排风险
        }
    }
    return instance_;
}
```

**问题**:`new Singleton()` 分三步:(1) 分配 (2) 构造 (3) 赋值。编译器可能重排为 (1)(3)(2),其他线程看到非空 instance_ 但对象未构造完成。

### 反模式 4:无锁代码的 ABA 问题

```cpp
// 错误:CAS 无法检测 ABA 切换
Node* old = head.load();
while (!head.compare_exchange_weak(old, old->next)) {}
// 若 head: A -> B -> C,线程 T1 读到 old=A
// T2 pop A, pop B, push A (复用),T1 CAS 成功但 A->next 可能指向已释放的 B
```

**生产事故**:某数据库系统使用 Treiber Stack 管理内存块,在高负载下出现段错误。根因是 ABA 导致访问已释放内存。修复使用 tagged pointer (附加版本号) 后稳定。

### 反模式 5:伪共享导致性能骤降

```cpp
// 错误:多个原子变量在同一缓存行
struct Counters {
    std::atomic<int> a{0};
    std::atomic<int> b{0};
    std::atomic<int> c{0};
};
// 多线程分别修改 a/b/c,触发 MESI invalidate 风暴
```

**性能影响**:某并行计算程序,8 线程计数器从 64M ops/s 降至 1.2M ops/s。修复使用 `alignas(64)` 后恢复至 62M ops/s。

### 反模式 6:compare_exchange 强弱误用

```cpp
// 错误:在循环中使用 strong (多余的开销)
while (!head.compare_exchange_strong(old, new_node)) {}

// 正确:循环中用 weak,避免重复的强保证开销
while (!head.compare_exchange_weak(old, new_node)) {}
```

**原因**:`weak` 允许虚假失败 (spurious failure),即 CAS 本可成功但返回 false。循环中重试即可,而 `strong` 内部循环直到非虚假结果,在循环中调用是浪费。

### 反模式 7:seq_cst 滥用导致性能下降

```cpp
// 错误:对性能敏感的计数器使用 seq_cst
std::atomic<long> counter{0};
counter.fetch_add(1, std::memory_order_seq_cst);  // 每次 MFENCE,慢 5-10 倍

// 正确:计数器用 relaxed 即可
counter.fetch_add(1, std::memory_order_relaxed);
```

### 反模式 8:memory_order_consume 的不可靠性

```cpp
// 不推荐:consume 在主流编译器上被当作 acquire 处理,且标准建议避免使用
atomic<T*> ptr;
T* p = ptr.load(std::memory_order_consume);
// 编译器无法正确追踪依赖链,实际效果不确定

// 推荐:直接使用 acquire
T* p = ptr.load(std::memory_order_acquire);
```

### 反模式 9:假设原子操作是 wait-free

```cpp
// 错误:假设所有原子操作都无锁
std::atomic<BigStruct> big_atomic;  // 大于机器字长
big_atomic.load();  // 可能内部使用 mutex,非 lock-free

// 检查:使用 is_lock_free 或 is_always_lock_free
static_assert(decltype(big_atomic)::is_always_lock_free);
```

### 反模式 10:跨线程调用未同步的 this 捕获

```cpp
// 错误:Lambda 捕获 this,跨线程访问成员
class Worker {
    int data_{0};
public:
    void start() {
        std::thread([this]() {
            data_ = 42;  // 与主线程的 data_ 访问未同步,数据竞争
        }).detach();
    }
};
```

## 工程实践

### 实践 1:优先使用标准库而非手写无锁代码

```cpp
// 推荐:使用 std::shared_ptr, std::mutex 等经过验证的实现
auto ptr = std::make_shared<BigData>();
std::lock_guard<std::mutex> lock(mtx_);

// 不推荐:手写无锁引用计数 (极易出错)
// 除非有明确的性能瓶颈且已 profile
```

### 实践 2:使用 ThreadSanitizer 检测数据竞争

```bash
# 编译时加 -fsanitize=thread
g++ -fsanitize=thread -g -O1 main.cpp -o main
./main  # TSan 会在数据竞争时报告
```

TSan 能检测 95%+ 的数据竞争,开销约 5-10 倍。CI 流水线中应集成 TSan 测试。

### 实践 3:使用 LITMUS 测试验证内存序理解

```cpp
// 经典 MP (Message Passing) litmus test
std::atomic<int> x{0}, y{0};

void thread0() {
    x.store(1, std::memory_order_relaxed);
    y.store(1, std::memory_order_release);
}

void thread1(int& r1, int& r2) {
    r1 = y.load(std::memory_order_acquire);
    r2 = x.load(std::memory_order_relaxed);
    // 不可能出现 r1=1, r2=0 (release-acquire 保证)
}
```

### 实践 4:合理选择数据布局避免伪共享

```cpp
// 缓存行对齐的多线程计数器
struct alignas(64) AlignedCounter {
    std::atomic<long> value{0};
};

struct Counters {
    AlignedCounter counters[8];  // 每个计数器独占缓存行
};

// 或使用 padding
struct PaddedCounter {
    std::atomic<long> value{0};
    char padding[64 - sizeof(std::atomic<long>)];
};
```

### 实践 5:无锁代码的内存回收

```cpp
// Hazard Pointer:延迟回收,避免 use-after-free
template <typename T>
class HazardPointer {
    std::atomic<T*> ptr_{nullptr};
public:
    T* protect(std::atomic<T*>& src) {
        T* p;
        do {
            p = src.load(std::memory_order_acquire);
            ptr_.store(p, std::memory_order_release);
        } while (p != src.load(std::memory_order_acquire));
        return p;
    }

    void release() { ptr_.store(nullptr, std::memory_order_release); }
};

// 全局 hazard pointer 列表,回收时检查
void retire(T* p) {
    // 若 p 不在任何 hazard pointer 中,安全删除
    // 否则加入待回收列表,稍后再试
}
```

### 实践 6:性能关键路径的内存序选择

```cpp
// 性能关键路径的渐进式优化:
// 1. 先用 seq_cst 保证正确性
// 2. Profile 定位瓶颈
// 3. 仅对瓶颈降级为 acquire/release
// 4. 极端场景才考虑 relaxed

// 示例:高频交易订单匹配引擎
class OrderBook {
    std::atomic<Order*> best_bid_{nullptr};  // seq_cst 保证全局一致

    // 热点路径:用 acq_rel (足够)
    bool try_match(Order* new_order) {
        Order* bid = best_bid_.load(std::memory_order_acquire);
        while (bid && !is_match(bid, new_order)) {
            bid = bid->next;
        }
        if (bid) {
            return best_bid_.compare_exchange_weak(
                bid, bid->next,
                std::memory_order_acq_rel,
                std::memory_order_relaxed);
        }
        return false;
    }
};
```

### 实践 7:跨平台可移植性考虑

```cpp
// 不可移植:依赖 x86 强内存模型
std::atomic<bool> flag{false};
int data = 0;

// 线程 A
data = 42;
flag.store(true, std::memory_order_relaxed);  // x86 上可能工作,ARM 上失败

// 可移植版本
data = 42;
flag.store(true, std::memory_order_release);  // 所有架构正确
```

### 实践 8:使用 C++20 的 atomic_ref 操作非原子对象

```cpp
// C++20:原子引用,允许对已有非原子变量进行原子访问
void increment_array(int* arr, size_t n) {
    // arr 是普通 int*,但需要原子操作
    for (size_t i = 0; i < n; ++i) {
        std::atomic_ref<int> ref(arr[i]);
        ref.fetch_add(1, std::memory_order_relaxed);
    }
}

// 适用场景:第三方库返回非原子数据,需原子访问
```

## 案例研究

### 案例 1:Linux 内核 RCU (Read-Copy-Update)

Linux RCU 是无锁读取的极致实践。核心思想:

1. **读者无锁**:直接访问数据,不加任何锁或原子操作
2. **写者复制**:修改时复制一份,修改副本,原子替换指针
3. **延迟回收**:等待所有读者退出后,才释放旧数据

```cpp
// RCU 简化示意
template <typename T>
class RcuProtected {
    std::atomic<T*> ptr_;
public:
    // 读者:无锁访问
    const T* read() {
        return ptr_.load(std::memory_order_consume);  // 依赖顺序
    }

    // 写者:复制-修改-替换
    void update(const T& new_value) {
        T* new_data = new T(new_value);
        T* old = ptr_.exchange(new_data, std::memory_order_acq_rel);
        // synchronize_rcu():等待所有读者完成
        sched_rcu_grace_period();
        delete old;
    }
};
```

RCU 在 Linux 内核中用于 dcache、page table 等高频路径,读吞吐比 rwlock 高 10-100 倍。Paul McKenney 因此获 2020 Linux 基金会终身成就奖。

### 案例 2:Facebook Folly 的 MicroLock

Folly 库针对短临界区设计了 MicroLock,核心优化:

1. 将多个锁压缩到一个 uint64_t 中 (每个锁 8 位)
2. 使用 CAS 而非系统调用
3. 自旋一段时间后回退到 futex

```cpp
// Folly MicroLock 简化版
class MicroLock {
    std::atomic<uint64_t> state_{0};
    static constexpr uint64_t kLockedBit = 1ULL << 32;
    static constexpr uint64_t kWaiterBit = 1ULL << 33;

public:
    void lock() {
        // 快速路径:CAS 直接获取
        uint64_t expected = state_.load(std::memory_order_relaxed) & ~(kLockedBit | kWaiterBit);
        if (state_.compare_exchange_weak(expected, expected | kLockedBit,
                                          std::memory_order_acquire)) {
            return;  // 成功
        }
        // 慢速路径:自旋 + futex
        slow_lock();
    }
};
```

MicroLock 在 4 核机器上比 std::mutex 快 5-10 倍,但仅适合极短临界区 (<1μs)。

### 案例 3:Boost.Lockfree 的队列实现

Boost.Lockfree 提供生产级无锁队列,关键设计:

1. **MPSC 用原子索引**:多生产者通过 CAS 推进 tail
2. **内存回收**:内部使用 freelist,避免 ABA
3. **可变大小**:支持固定大小与动态扩容

```cpp
#include <boost/lockfree/queue.hpp>

boost::lockfree::queue<int, boost::lockfree::capacity<1024>> q;

// 多生产者多消费者安全
void producer() {
    for (int i = 0; i < 1000; ++i) {
        while (!q.push(i)) {
            std::this_thread::yield();
        }
    }
}

void consumer() {
    int value;
    while (q.pop(value)) {
        process(value);
    }
}
```

### 案例 4:ClickHouse 的列式存储并发

ClickHouse 使用细粒度原子操作实现高并发查询:

1. **Part 引用计数**:`std::shared_ptr` 不可见,改用侵入式 atomic 计数
2. **Merge 调度**:用 atomic flag 避免重复触发
3. **查询取消**:原子 bool 定期检查

```cpp
// ClickHouse 的 MergeTask 简化
class MergeTask {
    std::atomic<bool> cancelled_{false};

    void execute() {
        while (!cancelled_.load(std::memory_order_relaxed)) {
            process_batch();
        }
    }

    void cancel() {
        cancelled_.store(true, std::memory_order_relaxed);
    }
};
```

### 案例 5:ARM 服务器迁移的内存序陷阱

某互联网公司从 Intel Xeon 迁移到 AWS Graviton (ARM),发现以下问题:

1. **x86 上的"巧合"代码失效**:依赖 TSO 的强排序,未加 acquire/release
2. **性能不升反降**:seq_cst 在 ARM 上比 x86 贵 10 倍
3. **缓存行大小差异**:ARM 系统缓存行 128 字节 (部分),`alignas(64)` 不足

修复方案:

```cpp
// 检测缓存行大小
constexpr size_t kCacheLineSize = 
#ifdef __x86_64__
    64;
#elif defined(__aarch64__)
    128;  // 部分 ARM 服务器
#else
    64;
#endif

struct alignas(kCacheLineSize) Counter {
    std::atomic<long> value{0};
};
```

### 案例 6:Rust 与 C++ 内存模型对比

Rust 借鉴 C++ 内存模型但更严格:

| 特性        | C++                       | Rust                          |
| ----------- | ------------------------- | ----------------------------- |
| 数据竞争    | UB                        | 编译期拒绝 (Send/Sync)        |
| 原子 API    | `std::atomic<T>`          | `std::sync::atomic::*`        |
| Unsafe      | 全部 unsafe               | 仅 unsafe 块                  |
| 内存序      | 6 种                      | 5 种 (无 consume)             |
| Borrow      | 无                        | 编译期借用检查                |

Rust 的 Send/Sync trait 在编译期阻止数据竞争,而 C++ 依赖运行时工具 (TSan)。但 C++ 的灵活性允许更激进的优化。

## 习题

### 基础题

**1.** 以下代码是否存在数据竞争?若存在,如何修复?

```cpp
int counter = 0;
std::mutex mtx;

void increment() {
    mtx.lock();
    counter++;
    mtx.unlock();
}

int read() {
    return counter;  // 未加锁
}
```

**参考答案要点**:存在数据竞争,`read` 与 `increment` 并发访问 `counter` 且无同步。修复:将 `counter` 改为 `std::atomic<int>`,或在 `read` 中加锁。

**2.** 解释 `relaxed`、`acquire`、`release` 三种内存序的区别,并各举一个适用场景。

**参考答案要点**:
- `relaxed`:仅保证原子性,无同步。适用:计数器统计。
- `acquire`:load 后的读写不重排到 load 前。适用:读取标志位后访问共享数据。
- `release`:store 前的读写不重排到 store 后。适用:写入数据后设置 ready 标志。

**3.** 为什么 `std::atomic<bool>` 通常比 `std::mutex` 更快?在什么情况下反而更慢?

**参考答案要点**:`atomic` 用户态完成,无系统调用开销。但当自旋时间超过上下文切换开销时,`mutex` 让出 CPU 更高效。

### 进阶题

**4.** 以下代码在 x86 和 ARM 上行为是否一致?为什么?

```cpp
std::atomic<int> x{0}, y{0};
int r1, r2;

void t1() {
    x.store(1, std::memory_order_relaxed);
    y.store(1, std::memory_order_relaxed);
}

void t2() {
    r1 = y.load(std::memory_order_relaxed);
    r2 = x.load(std::memory_order_relaxed);
}
// 可能出现 r1=1, r2=0 吗?
```

**参考答案要点**:
- x86 (TSO):禁止 store-store 重排,`r1=1, r2=0` 不可能
- ARM (弱):允许 store-store 重排,`r1=1, r2=0` 可能
- 这体现了跨架构可移植性的关键差异

**5.** 实现 Peterson 互斥算法,并分析为何在 C++ 默认内存模型下需要 `seq_cst`。

```cpp
// Peterson 算法 (简化)
std::atomic<bool> flag[2]{false, false};
std::atomic<int> turn{0};

void lock(int id) {
    int other = 1 - id;
    flag[id].store(true, ???);
    turn.store(other, ???);
    while (flag[other].load(???) && turn.load(???) == other) {}
}
```

**参考答案要点**:Peterson 依赖严格的操作顺序,弱内存序下 `flag[id]=true` 可能被重排到 `turn.store` 之后,导致两个线程同时进入临界区。必须用 `seq_cst` 或显式 fence。

**6.** 分析以下代码的 ABA 问题,并给出两种解决方案。

```cpp
std::atomic<Node*> head;
Node* old = head.load();
while (old && !head.compare_exchange_weak(old, old->next)) {}
```

**参考答案要点**:
- ABA:`head` 从 A 变 B 再变 A,CAS 成功但 `A->next` 可能指向已释放的 B
- 方案 1:tagged pointer,附加版本号 `atomic<pair<Node*, uint64_t>>`
- 方案 2:hazard pointer,读取前登记,回收前检查

### 挑战题

**7.** 设计一个无锁 MPMC 队列,要求:

- 支持多生产者多消费者
- 无 ABA 问题
- 无内存泄漏
- 给出完整 C++20 实现

**参考答案要点**:基于环形缓冲区 + 序号 (sequence number) 的 Michael-Scott 队列变体,使用 `atomic<uint64_t>` 编码位置与版本。关键点:

```cpp
template <typename T, size_t Capacity>
class MPMCQueue {
    struct Cell {
        std::atomic<size_t> sequence;
        T data;
    };
    alignas(64) Cell buffer_[Capacity];
    alignas(64) std::atomic<size_t> enqueue_pos_{0};
    alignas(64) std::atomic<size_t> dequeue_pos_{0};

public:
    bool push(const T& value) {
        Cell* cell;
        size_t pos = enqueue_pos_.load(std::memory_order_relaxed);
        for (;;) {
            cell = &buffer_[pos % Capacity];
            size_t seq = cell->sequence.load(std::memory_order_acquire);
            intptr_t diff = static_cast<intptr_t>(seq) - static_cast<intptr_t>(pos);
            if (diff == 0) {
                if (enqueue_pos_.compare_exchange_weak(pos, pos + 1,
                                                       std::memory_order_relaxed)) break;
            } else if (diff < 0) {
                return false;  // 满
            } else {
                pos = enqueue_pos_.load(std::memory_order_relaxed);
            }
        }
        cell->data = value;
        cell->sequence.store(pos + 1, std::memory_order_release);
        return true;
    }
    // pop 类似
};
```

**8.** 证明:x86-TSO 上,`acquire/release` 可以用普通 MOV 实现,但 `seq_cst` store 必须加 MFENCE。

**参考答案要点**:
- TSO 已保证 load-load、load-store、store-store 不重排,因此 acquire load (普通 MOV) 后的读写自然在 load 后
- TSO 允许 store-load 重排 (store buffer),因此 `seq_cst` store 后的 `seq_cst` load 必须用 MFENCE 刷新 store buffer,否则全局总序无法保证
- 反例:Store Buffer Litmus Test (SB) 在 TSO 下允许 `(r1,r2)=(0,0)`,但 `seq_cst` 禁止

**9.** 分析 Linux `READ_ONCE`/`WRITE_ONCE` 宏与 `std::atomic` 的关系,并说明为何内核不使用 C++ 原子。

**参考答案要点**:
- `READ_ONCE`/`WRITE_ONCE` 等价于 `relaxed` 原子,防止编译器拆分/合并访问
- 内核用 C 实现,无 C++ 编译器;且需要与汇编、volatile MMIO 交互
- 内核内存模型 (LKMM) 比 C++ 更复杂,涉及 RCU、barrier() 等扩展

**10.** 设计一个测试框架,自动检测并发代码在不同内存序下的正确性。

**参考答案要点**:
- 使用 LITMUS 测试范式:枚举线程组合,运行 N 次,统计结果分布
- 集成 ThreadSanitizer 检测数据竞争
- 跨架构测试:x86 (基线) vs ARM (弱模型)
- 工具:llvm-lit、concurrency-kit、relacy

## 参考文献

以下参考文献遵循 ACM Reference Format。

1. Boehm, H.-J., and Adve, S. V. 2008. Foundations of the C++ concurrency memory model. In *Proceedings of the 29th ACM SIGPLAN Conference on Programming Language Design and Implementation (PLDI '08)*. ACM, 68-78. DOI: https://doi.org/10.1145/1375581.1375591

2. Lamport, L. 1979. How to make a multiprocessor computer that correctly executes multiprocess programs. *IEEE Transactions on Computers* C-28, 9, 690-691. DOI: https://doi.org/10.1109/TC.1979.1675439

3. Manson, J., Pugh, W., and Adve, S. V. 2005. The Java memory model. In *Proceedings of the 32nd ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages (POPL '05)*. ACM, 378-391. DOI: https://doi.org/10.1145/1040305.1040336

4. Adve, S. V., and Gharachorloo, K. 1996. Shared memory consistency models: A tutorial. *IEEE Computer* 29, 12, 66-76. DOI: https://doi.org/10.1109/2.546611

5. Herlihy, M., and Shavit, N. 2012. *The Art of Multiprocessor Programming* (2nd ed.). Morgan Kaufmann, Burlington, MA.

6. McKenney, P. E. 2017. *Is Parallel Programming Hard, And, If So, What Can You Do About It?* kernel.org. https://kernel.org/pub/linux/kernel/people/paulmck/perfbook/perfbook.html

7. Batty, M., Owens, S., Sarkar, S., Sewell, P., and Weber, T. 2011. Mathematizing C++ concurrency. In *Proceedings of the 38th Annual ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages (POPL '11)*. ACM, 55-66. DOI: https://doi.org/10.1145/1926385.1926394

8. Sewell, P., Sarkar, S., Owens, S., Nardelli, F. Z., and Myreen, M. O. 2010. x86-TSO: A rigorous and usable programmer's model for x86 multiprocessors. *Communications of the* ACM 53, 7, 89-97. DOI: https://doi.org/10.1145/1785414.1785443

9. Michael, M. M. 2004. Hazard pointers: Safe memory reclamation for lock-free objects. *IEEE Transactions on Parallel and Distributed Systems* 15, 6, 491-504. DOI: https://doi.org/10.1109/TPDS.2004.8

10. Herlihy, M. 1991. Wait-free synchronization. *ACM Transactions on Programming Languages and Systems (TOPLAS)* 13, 1, 124-149. DOI: https://doi.org/10.1145/114005.102808

11. International Organization for Standardization. 2020. *Information technology — Programming languages — C++* (ISO/IEC 14882:2020). ISO, Geneva, Switzerland.

12. Williams, A. 2019. *C++ Concurrency in Action* (2nd ed.). Manning Publications, Shelter Island, NY.

13. McKenney, P. E., Appavoo, J., Kleen, A., Krieger, O., Russell, R., and Heo, P. 2001. Read-copy update. In *Proceedings of the Ottawa Linux Symposium (OLS '01)*.

14. Fraser, K., and Harris, T. 2007. Concurrent programming without locks. *ACM Transactions on Computer Systems (TOCS)* 25, 2, Article 5, 1-61. DOI: https://doi.org/10.1145/1233307.1233309

15. Michael, M. M., and Scott, M. L. 1996. Simple, fast, and practical non-blocking and blocking concurrent queue algorithms. In *Proceedings of the 15th Annual ACM Symposium on Principles of Distributed Computing (PODC '96)*. ACM, 267-275. DOI: https://doi.org/10.1145/248052.248106

16. Dice, D., Lev, Y., Marathe, V. J., Moir, M., Nussbaum, D., and Olszewski, M. 2009. Simplifying concurrent algorithms by exploiting hardware transactional memory. In *Proceedings of the 22nd ACM Symposium on Operating Systems Principles (SOSP '09)*. ACM, 57-72. DOI: https://doi.org/10.1145/1629575.1629582

17. Adve, S. V., and Boehm, H.-J. 2010. Memory models: A case for rethinking parallel languages and hardware. *Communications of the* ACM 53, 8, 90-101. DOI: https://doi.org/10.1145/1787234.1787255

18. Demsky, B., and Lam, P. 2015.SATCheck: Sat-based model checking of memory models. In *Proceedings of the 10th Workshop on Programming Languages and Analysis for Security (PLAS '15)*. ACM, 32-44. DOI: https://doi.org/10.1145/2786557.2786563

19. Lahav, O., Vafeiadis, V., Kang, J., Hur, C.-K., and Dreyer, D. 2017. Repairing sequential consistency in C/C++11. In *Proceedings of the 38th ACM SIGPLAN Conference on Programming Language Design and Implementation (PLDI '17)*. ACM, 618-632. DOI: https://doi.org/10.1145/3062341.3062352

20. Chakraborty, S., and Vafeiadis, V. 2019. Validating optimizations of concurrent C/C++ programs. In *Proceedings of the 2019 International Symposium on Code Generation and Optimization (CGO '19)*. IEEE, 102-114. DOI: https://doi.org/10.1109/CGO.2019.8661186

## 延伸阅读

### 官方文档

- C++ Reference: Atomic operations library (https://en.cppreference.com/w/cpp/atomic)
- C++ Reference: Memory order (https://en.cppreference.com/w/cpp/atomic/memory_order)
- ISO C++ N2153: A simple and efficient memory model for C++ (Boehm 提案)
- ISO C++ P0019: atomic_ref (C++20 提案)
- ISO C++ P2165: atomic wait/notify (C++20 提案)

### 经典教材

- Anthony Williams. *C++ Concurrency in Action* (2nd Edition). Manning, 2019.
- Maurice Herlihy, Nir Shavit. *The Art of Multiprocessor Programming* (2nd Edition). Morgan Kaufmann, 2012.
- Paul E. McKenney. *Is Parallel Programming Hard, And, If So, What Can You Do About It?* kernel.org.
- Jeff Preshing. *Sane C++ Memory Model* 系列博客 (https://preshing.com)

### 前沿论文

- Batty et al. "Mathematizing C++ Concurrency" (POPL 2011) - 形式化语义
- Lahav et al. "Repairing Sequential Consistency in C/C++11" (PLDI 2017) - 修复 seq_cst 漏洞
- Chakraborty & Vafeiadis "Validating Optimizations of Concurrent C/C++ Programs" (CGO 2019) - 优化正确性

### 在线资源

- Preshing on Programming: Memory model 系列教程 (https://preshing.com)
- Herb Sutter's Blog: C++ memory model 深度解析 (https://herbsutter.com)
- Relacy Race Detector: 无锁代码测试工具 (http://relacy.com)
- LLVM ThreadSanitizer: 数据竞争检测 (https://clang.llvm.org/docs/ThreadSanitizer.html)
- CppMem: C++ 内存模型在线模拟器 (http://svr-pes20-cppmem.cl.cam.ac.uk)

### 相关课程

- MIT 6.006/6.172: Performance Engineering of Software Systems
- Stanford CS149: Parallel Computing
- CMU 15-440: Distributed Systems
- Berkeley CS262a: Advanced Topics in Computer Systems
