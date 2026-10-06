---
order: 420
title: 原子操作与内存模型：不加班的同步
module: 'c'
category: 计算机科学
difficulty: advanced
description: 从两个线程各加十万次、总和却对不上的丢失更新实验出发：_Atomic 类型与 stdatomic.h 操作族、五种 memory_order 的行为表与发布-订阅实验、compare_exchange_weak 的伪失败、原子与互斥锁的分工表，附 ATOMIC_VAR_INIT 弃用等版本口径与三起事故实录。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'c/370-POSIXThread'
  - 'c/260-ConstAndVolatileQualifiers'
  - 'c/340-SignalHandling'
  - 'c/520-C23CoreFeatures'
prerequisites:
  - 'c/360-ThreadConcurrency'
  - 'c/270-VolatileKeyword'
---

## 前置知识

- 已完成 [线程与并发](/c/360-ThreadConcurrency)：知道数据竞争（data race）与临界区的定义，见过两个线程写同一变量的混乱现场；
- 已完成 [volatile 深水区](/c/270-VolatileKeyword)：记得「volatile 不提供原子性、不提供内存序」的结论，以及优化器的 as-if 规则——本篇要反复用到它。

> 分工说明：并发这一片共四篇。[线程与并发](/c/360-ThreadConcurrency) 讲概念（竞态是什么、临界区为什么危险）；[POSIX 线程](/c/370-POSIXThread) 讲互斥锁这套「加班的同步」——排队、等待、唤醒；本篇讲「不加班的同步」：`_Atomic` 原子类型、原子操作族与内存序，让某些场景根本不需要排队。volatile 的职责边界在 [const 与 volatile](/c/260-ConstAndVolatileQualifiers) 与 270 两篇已划清，本篇负责给出正解。

## 学习目标

读完本文你将能够：

1. 解释 `counter++` 为什么会丢更新，并用 `_Atomic` 与互斥锁两种方式修复，说出各自的适用场景；
2. 用 `<stdatomic.h>` 的 load/store/fetch_add/compare_exchange 写出线程安全的单变量操作；
3. 画出五种 memory_order 的行为差异，用「发布-订阅」实验演示 release/acquire 建立的同步关系；
4. 说出 compare_exchange_weak 与 strong 的伪失败差异，以及各自的使用场合；
5. 判断一个需求该用原子还是该用锁，识别「检查-行动」两步不原子的经典错误。

预计 60 到 80 分钟，含 4 组实验、2 道预测题与 1 道挑战题。

本文代码在 Linux/macOS（或 WSL）运行，编译需加 `-pthread`。示例统一用 pthread 创建线程，与 [POSIX 线程](/c/370-POSIXThread) 对接；C11 标准库的 `<threads.h>`（thrd_create/thrd_join）与之一一对应，换写法不影响结论。

## 1. 问题引入：两个线程各加十万次，结果对不上

```c
/* counter_naive.c：丢了多少次更新？ */
#include <stdio.h>
#include <pthread.h>

#define N 100000

static int counter = 0;                 /* 普通变量，两个线程直接改 */

static void *worker(void *arg) {
    (void)arg;
    for (int i = 0; i < N; i++) {
        counter++;                      /* 悬念在这一行 */
    }
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, worker, NULL);
    pthread_create(&t2, NULL, worker, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    printf("counter = %d（期望 200000）\n", counter);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g -pthread counter_naive.c -o counter_naive
./counter_naive
./counter_naive
```

一次典型输出（每次运行都不同，几乎从不等于 200000）：

```text
counter = 121738（期望 200000）
counter = 138452（期望 200000）
```

原因 [线程与并发](/c/360-ThreadConcurrency) 已经预告：`counter++` 不是一步，而是「读出旧值、加 1、写回」三步。两个线程可以同时读到 5，各自加成 6 写回——两次自增，总量只涨了 1。丢多少取决于交错时机，所以每次都不同。

修复有两条路。第一条是本篇主角：把类型换成 `atomic_int`，只改一处声明与一处自增：

```c
#include <stdatomic.h>

static atomic_int counter = 0;          /* 原子类型：操作不可分割 */
/* 循环体里改为 */
atomic_fetch_add(&counter, 1);          /* 原子自增，不再丢更新 */
```

改完再跑，多少次都是 200000。第二条路是互斥锁（[POSIX 线程](/c/370-POSIXThread)）：类型不动，把三步包进锁里：

```c
static int counter = 0;
static pthread_mutex_t mu = PTHREAD_MUTEX_INITIALIZER;
/* 循环体里改为 */
pthread_mutex_lock(&mu);
counter++;
pthread_mutex_unlock(&mu);
```

同样恒为 200000。两种写法都对，语义却不同：原子版只保证「这一个变量自增不可分割」，一行搞定；锁版保证「锁住的任意一段代码独占执行」，代价是每次都要进出锁。修改实验：用 `time ./counter_atomic` 与 `time ./counter_mutex` 各跑一次对比耗时——单变量计数场景原子版通常明显更快，这正是「不加班」的含义；但别急着下结论说原子总是更好，第 5 节给分工表。

## 2. 原子类型：_Atomic 与 stdatomic.h

**原子操作**（atomic operation）是不可分割的操作：其他线程要么看不到它发生，要么看到它已完成，永远观察不到中间状态。C11 引入 `_Atomic` 限定符与 `<stdatomic.h>` 头文件提供这套能力。

```c
#include <stdatomic.h>

_Atomic int a;              /* 限定符写法一 */
_Atomic(int) b;             /* 限定符写法二，与上面等价 */
atomic_int ai;              /* stdatomic.h 提供的别名，等价于 _Atomic int */
atomic_long al;
atomic_uintptr_t ap;        /* 指针类型也有对应别名 */
atomic_flag flag;           /* 最简单的原子类型：只有置位/清除两种状态 */

atomic_int x = 0;           /* 静态/编译期直接初始化，C17 起的标准写法 */
atomic_init(&x, 42);        /* 运行时初始化：不是原子操作，只能在多线程开始前用 */
```

三条版本口径，都是新代码要遵守的：

- **ATOMIC_VAR_INIT 已弃用**：C11 曾要求 `atomic_int x = ATOMIC_VAR_INIT(0);`，C17 起弃用、C23 已移除——直接写 `atomic_int x = 0;` 即可，本篇所有示例都这么写；
- **atomic_flag 的初始化**：C11/C17 要求 `atomic_flag f = ATOMIC_FLAG_INIT;`；C23 起静态存储的 atomic_flag 零初始化即为清除态，自动存储期可写 `atomic_flag f = {};`，宏不再必需（后文的 spin lock 保留旧写法以兼容 C17）；
- **C23 之后仍在演进**：原子相关的标准化持续推进（如 ATOMIC_VAR_INIT 移除、atomic_flag 初始化放宽），版本全景见 [C23 与 C2y 新特性](/c/520-C23CoreFeatures)。

**哪些操作是原子的？** 三类：读（`atomic_load` 或直接 `int v = x;`）、写（`atomic_store` 或 `x = 10;`——对原子对象的 `=` 与读会被编译成对应的原子操作）、读-改-写（`fetch_*` 家族与比较交换，见第 3 节；对原子对象 `x++` 同样是原子的读-改-写）。注意与 270 篇的对照：普通 `int` 上这些保证一项都没有。

还有一个常见误会要先拆掉：**原子不等于无锁**。`atomic_is_lock_free(&x)` 返回真才是无锁实现；大对象（如几十字节的结构体）的原子操作可能由内部锁或库调用实现，此时「原子」保证正确性，不保证速度。这句话在第 6 节实录二兑现。

## 3. 原子操作族：load、store、fetch_* 与 CAS

```c
/* ops.c：操作族速览 */
#include <stdio.h>
#include <stdatomic.h>

int main(void) {
    atomic_int x = 10;

    atomic_store(&x, 10);               /* 写 */
    int v = atomic_load(&x);            /* 读 */

    int old = atomic_fetch_add(&x, 5);  /* 加 5，返回旧值：v=10, x=15 */
    printf("old=%d x=%d\n", old, atomic_load(&x));

    old = atomic_fetch_sub(&x, 3);      /* 减 3，返回旧值：old=15, x=12 */
    printf("old=%d x=%d\n", old, atomic_load(&x));

    atomic_fetch_or(&x, 0x01);          /* 还有 and / xor / exchange 一族，此时 x=13 */
    old = atomic_exchange(&x, 0);       /* 无条件换新值，返回旧值 */
    printf("old=%d x=%d\n", old, atomic_load(&x));
    return 0;
}
```

预期输出：

```text
old=10 x=15
old=15 x=12
old=13 x=0
```

fetch 家族的返回值「修改前的旧值」是刻意设计：引用计数正是靠它判断「我是不是最后一个使用者」（第 7 节）。

真正的核心是比较交换（compare-and-swap，CAS）：**「如果它还是我以为的值，就换成新值；否则告诉我现在是什么」**。整个判断加交换一步完成，是无锁编程的基石：

```c
/* cas.c：成功与失败两种走向 */
#include <stdio.h>
#include <stdbool.h>
#include <stdatomic.h>

int main(void) {
    atomic_int x = 10;

    int expected = 10;
    bool ok = atomic_compare_exchange_strong(&x, &expected, 20);
    printf("ok=%d x=%d expected=%d\n", ok, atomic_load(&x), expected);

    expected = 10;                       /* x 已是 20，这次必然失败 */
    ok = atomic_compare_exchange_strong(&x, &expected, 99);
    printf("ok=%d x=%d expected=%d\n", ok, atomic_load(&x), expected);
    return 0;
}
```

预期输出：

```text
ok=1 x=20 expected=10
ok=0 x=20 expected=20
```

第二行的细节值得背下来：失败时函数把 `x` 的**当前值写回 expected**——这不是副作用，是给你下一次重试准备的。CAS 循环因此长成一个固定形状：

```c
int expected;
do {
    expected = atomic_load(&x);              /* 1. 看一眼当前值 */
} while (!atomic_compare_exchange_weak(&x, &expected, expected + 1));
                                             /* 2. 还是它才换，否则重来 */
```

weak 与 strong 的差别只有一个：weak **允许伪失败**（spurious failure）——值明明相等也可能返回 false（此时它同样把当前值写回 expected）。听起来像缺点，为什么循环里反而推荐 weak？因为在某些硬件（如 ARM 的 LL/SC 指令对）上，循环反正要重试，伪失败只是提前触发一次重试，weak 换来更快的指令序列；而 strong 必须在库内部把伪失败消化掉，单次调用更可靠。规则一句话：**CAS 循环里用 weak，单发判断用 strong**。

修改实验（cas_race.c）：开两个线程各自用上面的 CAS 循环把 `x` 抢加 10000 次，每次重试计数器加一。先预测每个线程的重试数下限，再运行。你会发现它至少是 10000，多出来的部分绝大多数是「对方先改了值」的真失败；在 x86 上 weak 的伪失败几乎观察不到（编译成同一条 cmpxchg），换 ARM 机器或树莓派再跑，差距才显形。这个实验教的是：**伪失败是标准允许的行为，不是可依赖的巧合，循环必须能承受任意次失败**。

## 4. 内存序：编译器和 CPU 都会重排

### 4.1 为什么要有内存序

[volatile 深水区](/c/270-VolatileKeyword) 讲过 as-if 规则：只要单线程的可观察行为不变，编译器有权重排、合并甚至删除你的语句。CPU 更进一步：每核有 store buffer 与私有缓存，指令乱序执行。单线程里这一切天衣无缝；两个线程观察**同一组**内存写入时，各自看到的顺序却可以不同——A 线程「先写 data 再写 flag」，B 线程可能先看到 flag 变了、data 还是旧值。

内存序（memory order）就是你在每个原子操作上声明的「重排约束」：允许编译器与 CPU 把别的访存挪过这条线到什么程度。

### 4.2 五种 memory_order 行为表

| 内存序 | 承诺 | 典型用途 |
| --- | --- | --- |
| memory_order_relaxed | 只保证这一个操作自身不可分割，不约束它与其他访存的先后 | 纯计数、统计 |
| memory_order_acquire | 用于读：它之后的读写不得重排到它之前 | 读同步标志 |
| memory_order_release | 用于写：它之前的读写不得重排到它之后 | 写同步标志 |
| memory_order_acq_rel | 用于读-改-写：同时具备 acquire 与 release | CAS、fetch_* |
| memory_order_seq_cst | 顺序一致：所有线程看到同一个全局总顺序 | 默认值，最保险 |

注意 API 规则：`atomic_load/store/fetch_*` 的基础版本不收内存序参数，一律按 seq_cst 执行；要指定内存序必须改用 `*_explicit` 版本（如 `atomic_store_explicit(&v, 1, memory_order_release)`）。两套参数列表不同，混用会编译报错——这是好事。

### 4.3 贯穿实验一：发布-订阅

经典模式：生产者写好数据后置标志，消费者见到标志才读数据。标志本身就是发布（publish）与订阅（subscribe）。

```c
/* publish.c */
#include <stdio.h>
#include <stdatomic.h>
#include <pthread.h>

#define N 10

static int buffer[N];                 /* 普通数据：靠标志的内存序受保护 */
static atomic_int ready = 0;

static void *producer(void *arg) {
    (void)arg;
    for (int i = 0; i < N; i++) {
        buffer[i] = i * i;
    }
    /* release 写：保证上面全部写入先于 ready=1 对其他线程可见 */
    atomic_store_explicit(&ready, 1, memory_order_release);
    return NULL;
}

static void *consumer(void *arg) {
    (void)arg;
    /* acquire 读：见到 ready==1 后，下面读到的 buffer 一定是新值 */
    while (atomic_load_explicit(&ready, memory_order_acquire) == 0) {
        /* 忙等 */
    }
    for (int i = 0; i < N; i++) {
        printf("buffer[%d] = %d\n", i, buffer[i]);
    }
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, producer, NULL);
    pthread_create(&t2, NULL, consumer, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    return 0;
}
```

```text
buffer[0] = 0
buffer[1] = 1
...
buffer[9] = 81
```

运行总是对的。release 写与读到它的 acquire 读建立起**同步关系**：release 之前的全部写入，对读到了这个值的 acquire 之后的代码可见——数据与标志因此「绑在一起」到达。

修改实验：把两个 `_explicit` 的内存序都改成 `memory_order_relaxed` 再跑。大概率仍然全对——别被骗。relaxed 不建立任何同步关系，消费者读 `buffer` 与生产者写 `buffer` 之间没有先后约束，这在标准里是数据竞争（未定义行为）：可能读到未初始化的 0，也可能读到写了一半的数组。x86 硬件内存模型较强、编译器恰好没重排，所以「碰巧对」；在 ARM 上或换激进优化选项，翻车概率肉眼可见。怎么把「碰巧」变成「实锤」，第 6 节实录三用工具现场抓。

### 4.4 贯穿实验二：seq_cst 是默认的保险

把 publish.c 里两个 `_explicit` 调用换回基础版（`atomic_store(&ready, 1);` 与 `while (atomic_load(&ready) == 0)`），程序回到 seq_cst：每个原子操作都参与一个全体线程一致的 总顺序，发布-订阅自然包含其中。这就是「默认保险」的含义——**记不住五种序的时候，用基础版；确认了性能需求，再降级到 acquire/release；只有确认顺序完全无关（如纯计数），才用 relaxed**。降级的收益是真实存在的：relaxed 计数器在弱内存序机器上省掉同步指令，也允许编译器更大胆地重排。

relaxed 的适用边界一句话：**各次操作之间顺序无关紧要、最后只看汇总值**的场景——请求计数、错误统计：

```c
atomic_fetch_add_explicit(&total_requests, 1, memory_order_relaxed);
atomic_fetch_add_explicit(&total_errors, 1, memory_order_relaxed);
```

反过来，任何「见标志、读数据」的同步都严禁 relaxed，理由见 4.3 的修改实验。

### 4.5 栅栏：不带变量的内存序

内存序也可以脱离某个原子变量单独下达——`atomic_thread_fence(memory_order_release)` 是一条「线」：之前的读写不得下沉、之后的不得上浮。日常代码很少直接用它（给操作带序更直观、更不易错），知道它存在即可。孪生的 `atomic_signal_fence` 约束的是同一线程内编译器与信号处理器之间的重排，与 [信号处理](/c/340-SignalHandling) 的 sig_atomic_t 纪律衔接。

## 5. 原子与互斥锁的分工

两种工具各有领地，先给对照表：

| 需求 | 用什么 | 例子 |
| --- | --- | --- |
| 单个变量的计数、标志、发布 | atomic | 请求计数、done 标志、配置指针发布 |
| 多个变量共同组成不变式 | 互斥锁 | 账户转账：两个余额必须此消彼长 |
| 「检查再行动」的复合判断 | 互斥锁或 CAS 循环 | 查空再入队 |
| 读多写少的共享结构 | pthread_rwlock_t | 配置表（用现成的，别手搓） |

「单变量」三个字是关键。两个变量哪怕各自都原子，**它们之间也没有任何一起成立的保证**——锁住的临界区保护的是「这组值合起来始终合法」这条不变式，原子给不了。所以工程上第一告诫是：**别用原子去实现复杂的锁逻辑**。两个高频翻车现场：

**手搓读写锁。** 用「读者计数 + 写者标志」两个原子变量拼读写锁，读者要「查写者、加计数、复查写者」三步，写者要「抢占标志、等读者清零」两步，步与步之间的每个交错都要逐一论证——论证对了也只是开始，还要处理写者饿死读者的问题。这套代码四十行，每一行都对，合起来需要形式化验证的耐心。生产代码请直接用 pthread_rwlock_t（见 [POSIX 线程](/c/370-POSIXThread)）。

**双重检查锁定（double-checked locking）没锁全。** 看似聪明：先无锁查标志，标志未立才去初始化：

```c
static Config *instance = NULL;      /* 普通指针 */
static atomic_int ready = 0;

Config *get_config(void) {
    if (atomic_load_explicit(&ready, memory_order_acquire) == 0) {
        /* 两个线程可能同时走到这里：检查与行动不是一步！ */
        instance = malloc(sizeof *instance);
        /* ... 初始化 ... */
        atomic_store_explicit(&ready, 1, memory_order_release);
    }
    return instance;
}
```

内存序本身用对了（release 发布、acquire 订阅），坏在「检查 ready」与「写 instance」是两步：两个线程可以同时看到 ready==0，各自 malloc 一份、各发各的标志——双重初始化加内存泄漏。修复不必与 CAS 缠斗：一次性初始化用 C11 `call_once`（或 pthread_once），多变量不变式回到互斥锁。原子负责「快路径上的单变量读」，这个边界感要留住。

**无锁数据结构是专家领域。** 用 CAS 循环写个栈，压栈只要五行：

```c
void stack_push(LockFreeStack *s, int value) {
    Node *n = malloc(sizeof *n);
    if (n == NULL) { perror("malloc"); exit(1); }
    n->value = value;
    do {
        n->next = atomic_load(&s->head);
    } while (!atomic_compare_exchange_weak(&s->head, &n->next, n));
}
```

真正的深渊在后面：经典 Treiber 栈有 ABA 问题（对方弹出又压回同一地址，CAS 看到的值相同、语义已变），内存回收时机更是要引入 tagged pointer、hazard pointer 或 RCU 级别的技术。除非你在维护一个无锁库，否则这个领域正确姿势是「用现成的」。原子操作族是给你造轮子的工具，不是让你到处造轮子的邀请。

顺带一提自旋锁——atomic_flag 的正当用途，也是「原子到锁」的中间形态：`while (atomic_flag_test_and_set(&lock)) {}` 加锁、`atomic_flag_clear(&lock)` 解锁。它忙等耗 CPU，只适合临界区极短的场景；理解它有助于看懂锁的成本，日常仍然用 pthread_mutex_t。

## 6. 常见错误与调试实录

### 实录一：用普通 int 当原子标志

现象与第 1 节同源：标志用 `int` 而非 `atomic_int`，检查时似乎总能工作，偶现失灵。270 篇的 `-O2` 忙等死循环正是它的编译器变体（优化器把循环里的重复读合并成一次）；本篇第 1 节的丢失更新是它的硬件变体（读-改-写被交错）。两个变体指向同一结论：**无同步地跨线程读写普通变量是数据竞争，标准定义为未定义行为**，`volatile` 救不了它（它不提供原子性与内存序，见 [volatile 与 const](/c/260-ConstAndVolatileQualifiers)）。修复：`atomic_int`，或锁。ThreadSanitizer 对这类竞争能直接报出两个冲突访问的行号，用法与报告解读见 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers)。

### 实录二：误以为原子结构体「整体原子、轻松无锁」

```c
struct Packet { char data[256]; int len; };
_Atomic struct Packet pkt;               /* 能编译，代价藏在运行时 */
```

只有平凡可复制（trivially copyable）的类型才能作原子类型；256 字节的结构体即便受支持，`atomic_is_lock_free(&pkt)` 大概率返回假——每次赋值都在内部加锁或调用库例程，原本「省掉锁」的算盘全数吐回。此外整体原子掩盖了真正的问题：256 字节的包多半不是被当作一个值使用的，读写它恰恰需要多字段不变式。惯用解法是**指针交换**：不可变结构体在堆上构造好，用 `atomic_uintptr_t` 或原子指针只发布「指向最新版本的那个指针」，读方拿到指针后随意读——发布成本一次指针写，读全是无锁。顺带回应一个心病：嵌套结构体（结构体里含原子成员）的原子性只到成员为止，外层整体没有原子性可言，别指望 `_Atomic` 能传递。

### 实录三：内存序配错，偶现读到旧值

4.3 的修改实验把两个序换成 relaxed 后「大概率还对」，这正是它阴险的地方：线上跑几周、换台 ARM 设备才偶现读到未初始化数据，肉眼看代码「逻辑没错」。此时不要靠加 printf 复现——加打印改动的时序本身就可能让问题消失。正确姿势是让工具说话：保持发布-订阅两侧 relaxed 不变，数据仍是普通变量，这个数据竞争 ThreadSanitizer 能稳定报告（冲突的两次访问、各自所在线程与行号），把「偶现旧值」钉死为「缺 acquire/release」；再加压手段是多核高负载、弱内存序设备上重跑。工具链细节见 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers)。修法即 4.3 正身：标志用 release 写、acquire 读。

## 7. 实际项目中的使用场景

**引用计数**是 fetch 家族返回值设计的标准应用，也是智能指针、内核对象管理的底座：

```c
typedef struct {
    void *data;
    atomic_int ref_count;
} SharedObject;

void shared_release(SharedObject *obj) {
    if (obj == NULL) return;
    int prev = atomic_fetch_sub(&obj->ref_count, 1);
    if (prev == 1) {                     /* 减完正好归零者负责释放 */
        free(obj->data);
        free(obj);
    }
}
```

返回的 prev 恰好是「减一之前」的值：等于 1 说明这次减一后归零，且**只有最后一个减一者能看到它**——判断与归零由一条原子指令保证，不会两个线程同时认为自己该释放。

其他高频场景：统计计数器（4.5 的 relaxed 边界）；「停止」标志（消费者轮询 `atomic_load(&stop)`，主线程 release 置位）；无锁单生产者单消费者队列的游标（CAS 循环，谨慎上手）。

## 8. 小练习

预测题一（5 分钟）：`atomic_int x = 20; int expected = 10;` 执行 `atomic_compare_exchange_strong(&x, &expected, 99)` 后，x 与 expected 各是多少？返回值是几？（先写答案再运行 cas.c 验证。）

参考答案（先写再看）：x 保持 20；expected 被函数改写为 20；返回 false。失败时写回当前值是重试协议的一部分，不是 bug。

预测题二（5 分钟）：生产者 `data = 42; atomic_store_explicit(&flag, 1, memory_order_relaxed);`，消费者 `if (atomic_load_explicit(&flag, memory_order_relaxed)) printf("%d\n", data);`——消费者可能打印几？为什么？

参考答案（先写再看）：42 或 0 都可能。relaxed 不建立同步关系，`data` 的读写是数据竞争，读到未初始化的 0 合法；把 relaxed 换成 release/acquire 后只剩 42。

挑战题（40 分钟，不看答案先动手）：把 4.3 的发布-订阅改造成「能在你的机器上稳定暴露 relaxed 错误」的实验装置，并用 ThreadSanitizer 出具报告。提示两级如下。

提示（思路方向）：x86 上纯靠交错很难翻车，改从「次数」下手——生产者循环发布 10 万次不同数据，消费者持续校验读到的数据与标志序号一致，把不一致次数统计出来。

展开（关键 API）：校验循环放 `atomic_load_explicit(&ready, memory_order_relaxed)`；编译 `gcc -fsanitize=thread -g publish.c -o publish`；TSan 报告的「race on buffer」即是实锤。

验收清单：不开 TSan 时错误计数可能为 0（记录下来）；开 TSan 报告稳定出现 buffer 上的数据竞争；两侧改回 acquire/release 后 TSan 静默。本练习同时验证「偶现问题交给工具」与「x86 的强序会掩护 bug」两件事。

## 9. 与之前和之后的知识的关系

- 往前：[volatile 深水区](/c/270-VolatileKeyword) 的职责对照表在本篇补上了 `_Atomic` 一列的细节，丢失更新实验与 270 的忙等实验互为编译器/CPU 两个侧面；[线程与并发](/c/360-ThreadConcurrency) 的竞态与临界区概念在这里获得第一个不需要锁的解法；
- 旁支：互斥锁的完整用法与锁的代价在 [POSIX 线程](/c/370-POSIXThread)；信号处理器里改标志为什么用 sig_atomic_t 而不是 `_Atomic`，见 [信号处理](/c/340-SignalHandling)（线程与信号是两套世界）；数据竞争报告怎么读在 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers)；
- 往后：[Socket 网络编程](/c/390-SocketNetworkProgramming) 把并发从单进程内的共享内存搬到跨机器的字节流，多线程服务器正是本篇与 370 的合练场。

## 10. 官方文档

- C 原子操作库总览（stdatomic.h 全家族）：https://en.cppreference.com/w/c/atomic
- Modern C（Jens Gustedt，C23 版，线程与原子章节）：https://gustedt.gitlabpages.inria.fr/modern-c/

## 11. 自我检查

- 能向同事讲清 `counter++` 丢更新的三步交错，并分别用 `_Atomic` 与互斥锁修复；
- 能默写发布-订阅模板：数据先写、release 置标志；acquire 读标志、再读数据；
- 能说出 weak 与 strong CAS 的唯一差别，以及为什么循环里用 weak；
- 拿到一个新需求，能按第 5 节分工表判断该用原子还是锁，并说出「两个原子变量之间没有联合保证」这句话的含义。

## 本章总结

原子操作保证「单变量操作不可分割」，互斥锁保证「一段代码独占执行」——前者快而窄，后者慢而通用。`<stdatomic.h>` 的操作族里，load/store 覆盖读写，fetch_* 家族覆盖读-改-写并返回旧值，CAS 以「相等才换、失败写回当前值」的协议成为无锁编程的支点。内存序回答「重排允许到哪一步」：seq_cst 是默认保险，acquire/release 支撑发布-订阅，relaxed 只配纯计数。ATOMIC_VAR_INIT 已随 C17 弃用、C23 移除，直接初始化即可；原子不等于无锁，`atomic_is_lock_free` 一问便知。单变量想原子，多变量想锁，「检查-行动」两步永远值得多看一眼。

## 下一步

进入 [Socket 网络编程](/c/390-SocketNetworkProgramming)：同步的问题解决了，接下来把字节流从同一进程搬上网络——用 30 行代码写出你的第一个 echo 服务器。
