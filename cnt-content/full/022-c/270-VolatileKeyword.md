---
order: 310
title: volatile 深水区：优化器、寄存器与信号
module: 'c'
category: 计算机科学
difficulty: advanced
description: 同一个忙等循环 -O0 能退出、-O2 死循环：从 as-if 规则拆解编译器凭什么省略读写，完整跑通 MMIO 模拟寄存器与信号处理实战，用丢更新与假锁两起事故验证 volatile 不提供原子性与内存序，给出 volatile、_Atomic、互斥锁的职责边界表。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'c/380-AtomicAndMemoryModel'
  - 'c/360-ThreadConcurrency'
  - 'c/550-EmbeddedCProgramming'
  - 'c/560-CAssemblyInteraction'
prerequisites:
  - 'c/260-ConstAndVolatileQualifiers'
  - 'c/340-SignalHandling'
---

## 前置知识

- 已完成 [const 与 volatile](/c/260-ConstAndVolatileQualifiers)：知道 volatile 的定义（每次访问都是可观察副作用）、三大经典场景与「不原子、不排序、不当锁」的结论；
- 已完成 [信号处理](/c/340-SignalHandling)：用过 signal/sigaction 注册处理器，见过 SIGINT、SIGTERM。

本文会现场重演 volatile 缺席时的每一次事故，结论记不全也能往下读。

> 分工说明：volatile 的**定义与三大场景的标准模式**在 [const 与 volatile](/c/260-ConstAndVolatileQualifiers) 建立完毕。本篇是深水区：从编译器优化视角回答「为什么非 volatile 会被吃掉」，用 `-O0`/`-O2` 汇编对照与三起误用事故验证边界，最后给出 volatile、`_Atomic`、互斥锁的职责对照表。const 指针三组合的语法归 [指针深度解析](/c/140-PointerDeep)，并发原语的系统讲解归 [C 原子操作与内存模型](/c/380-AtomicAndMemoryModel)。

## 学习目标

读完本文你将能够：

1. 用 `-O0` 与 `-O2` 编译同一个忙等循环，读出两条汇编路径的差异，并指出「读被提出循环」发生在哪；
2. 用 as-if 规则解释编译器省略重复读写、删除死存储、缩掉空循环的合法性来源，说出 volatile 在哪里截断了这条授权链；
3. 写出「模拟寄存器 + 读状态机 + 触发握手」的完整 MMIO 实验，并指出真实嵌入式映射与之的对应关系；
4. 逐条援引 C17 7.14.1.1，说清信号处理器里普通 int 为什么不行、`volatile sig_atomic_t` 恰好补上什么、处理器函数还能安全做什么；
5. 复现「volatile 计数器丢更新」与「volatile 假锁双双闯入」两起事故，并为每个场景选出 `_Atomic` 或互斥锁的正解。

预计 60 到 80 分钟，含 3 组动手实验与 3 道练习。

## 1. 问题引入：同一个忙等，-O0 能退出，-O2 死循环

```c
/* flag_loop.c */
int flag = 0;

void set_flag(void) {      /* 假装由中断或别的线程调用 */
    flag = 1;
}

int main(void) {
    while (flag == 0) {
        ;                  /* 忙等：等别人把 flag 置 1 */
    }
    return 0;
}
```

```bash
gcc -Wall -Wextra -O0 flag_loop.c -o loop_o0
gcc -Wall -Wextra -O2 flag_loop.c -o loop_o2
objdump -d loop_o0 | grep -A12 '<main>:'
objdump -d loop_o2 | grep -A9 '<main>:'
```

-O0 的 main（典型输出，x86-64 AT&T 格式；不同版本指令选择略有出入，结构一致）：

```text
<main>:
        endbr64
        push   %rbp
        mov    %rsp,%rbp
.L2:
        mov    flag(%rip),%eax     # 每一圈都真实读一次 flag
        test   %eax,%eax
        je     .L2                 # 还是 0 就再读
        mov    $0,%eax
        pop    %rbp
        ret
```

-O2 的 main：

```text
<main>:
        endbr64
        mov    flag(%rip),%eax     # 读一次，提到循环外
        test   %eax,%eax
        jne    .L3                 # 非 0：直接返回
.L2:
        jmp    .L2                 # 为 0：空转死循环，flag 再也不会被读
.L3:
        xor    %eax,%eax
        ret
```

对照读出三个事实：

1. -O0 忠实得像解释器：每一圈都从内存读 `flag`，谁改它都看得见；
2. -O2 把读取**提出循环**（循环不变量外提）：循环体改不了 flag，两次读之间它不可能变——于是只需要读一次；
3. 读一次之后条件永远为真，循环缩成一条跳回自己的指令。此时若有中断把 flag 改成 1，这条循环永远不会退出。

本程序是隔离变量用的对照装置：真实场景里改 flag 的通常是中断或别的线程，那些场景还叠加着别的未定义行为（第 6 节处理）；这里只看优化器这一层。给 flag 加上 `volatile`，-O2 的输出立刻退回 -O0 的形态——每一圈都有一条 `mov flag(%rip),%eax`。volatile 凭什么有这个权力？先看编译器手里的授权书。

## 2. 编译器优化视角：编译器凭什么这样做

### 2.1 as-if 规则：唯一的紧箍咒

C 标准用一台「抽象机」定义程序语义；实现（编译器 + CPU）可以做**任何变换，只要不改变程序的可观察行为**——这就是 as-if 规则。标准把三样东西列进可观察行为：volatile 对象的访问、程序终止时向文件写的数据、与交互式设备的读写。

普通变量不在清单里。所以：

```c
int x = 3 * 4;        /* 可观察行为等价于 x = 12 → 编译期直接算掉（常量折叠） */
```

```c
volatile int a = 3, b = 4;
int x = a * b;        /* a、b 的每次访问都是可观察行为 → 必须真的读两次、运行期算 */
```

volatile 的权力来源就在这里：**它把每一次访问变成可观察行为**，而 as-if 规则不许动可观察行为。省略重复读、删除「无人读的写」，在普通变量上合法，在 volatile 对象上越权。

### 2.2 吃掉你循环的四招

第一招，**循环不变量外提**（loop-invariant code motion，LICM）：循环内不随迭代变化的表达式搬到循环外。第 1 节的 `flag(%rip)` 读取就是被这一招提出的。

```c
for (int i = 0; i < 1000; i++) {
    arr[i] = *ptr;     /* 非 volatile：*ptr 提到循环外只读一次 */
}
```

第二招，**常量传播与折叠**：值已知的用值替换，表达式编译期算掉。`int x = 3 * 4;` 变 `x = 12`；第 1 节的 `flag == 0` 在读被提出后等价于常量真值。

第三招，**死存储消除**（dead store elimination）：写入的值再没人读，这个写就是死代码。

```c
void trigger(void) {
    volatile unsigned int *cmd = (volatile unsigned int *)0x4000A000u;
    *cmd = 1;          /* 写完就返回：值没人读，但副作用（启动设备）就是目的 */
}
```

去掉 volatile，这行写会被整条删掉——3.2 节实验验证。

第四招，**空循环终止假设**：C11 6.8.5 规定，控制表达式不是常量、循环体内无 I/O、不访问 volatile 对象、无同步/原子操作的循环，实现**可以假设它终止**。推论：一个「永远等下去」的纯空转循环没有任何可观察行为，可以任意处置——gcc 的实际选择是缩成一条自跳转（第 1 节的 `.L2: jmp .L2`）。循环体里只要有一次 volatile 访问，这张许可证立即作废。注意 `while (1)` 的控制表达式是常量，被规则明确豁免，编译器会保留它——你的忙等条件不是常量，享受不到这份保护。

### 2.3 真实编译器的自由度：volatile 也只管到序列点

GCC 文档（Volatiles 一节）写得很坦率：序列点处，此前的 volatile 访问必须稳定、其后的不得发生；但**两个序列点之间**，实现可以自由合并与重排 volatile 访问。两句对比：

```c
volatile int v;
int x = v + v;    /* 「读两次」不可依赖：两句分号之间没有序列点，可能只读一次 */
int y = v;
int z = v;        /* 两句隔着分号（序列点）：必须老老实实读两次 */
```

同一份文档还确认：**非 volatile 访问相对 volatile 访问没有顺序约束**——「先写数据再举旗」的代码，编译器有权把数据写入挪到举旗之后。需要严格的顺序时，GCC 给的答案是编译器屏障 `asm volatile("" ::: "memory")`（它与 CPU 硬件屏障的分工见 [C 汇编交互](/c/560-CAssemblyInteraction) 与 [C 原子操作与内存模型](/c/380-AtomicAndMemoryModel)）。所以「volatile 保证了顺序」这句话，连编译器这一层都只对了一半。

### 2.4 谁在「编译器看不见的地方」写你的变量

volatile 防的是所有控制流之外的写入者：

- 内存映射的硬件寄存器（MMIO）：外设按自己的时钟改内存；
- 中断服务程序 / 信号处理器：随时打断当前控制流；
- DMA 控制器：绕过 CPU 直接搬内存；
- 调试器：暂停时改一个全局变量的值；
- 共享内存另一端的进程。

volatile 只保证「编译器睁眼」；写入者的修改是否真的到达你的内存（多核缓存一致性、MMIO 区域的不可缓存属性），是链接脚本与平台配置的功课，见 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)。

## 3. MMIO 完整小实验：模拟寄存器与读状态机

### 3.1 桌面可跑的「假寄存器」

真实寄存器在桌面机上够不着，用一个全局变量扮演它，「硬件」由一个线程扮演（严格说这是数据竞争，此处作为「看不见的写入者」复现装置使用；真实硬件写入根本不经过 C 执行模型，现象与之同构）：

```c
/* fake_mmio.c */
#include <pthread.h>
#include <stdio.h>
#include <time.h>

volatile unsigned int hw_status = 0;   /* 模拟状态寄存器：bit0 = 设备就绪 */

static void *hardware_actor(void *arg) {
    (void)arg;
    struct timespec t = {0, 3 * 1000 * 1000};   /* 3 毫秒后硬件「就绪」 */
    nanosleep(&t, NULL);
    hw_status = 1u;                    /* 硬件写入：不经过 main 的控制流 */
    return NULL;
}

int main(void) {
    pthread_t dev;
    if (pthread_create(&dev, NULL, hardware_actor, NULL) != 0) {
        return 1;
    }
    while ((hw_status & 0x1u) == 0u) { /* 读状态机：轮询就绪位 */
        ;
    }
    printf("device ready\n");
    pthread_join(dev, NULL);
    return 0;
}
```

```bash
gcc -Wall -Wextra -O2 fake_mmio.c -o fake_mmio -pthread
./fake_mmio
```

预期输出（约 3 毫秒后）：

```text
device ready
```

```bash
# 反悔实验：-Dvolatile= 把 volatile 宏替换为空，等价于删掉限定符
gcc -Wall -Wextra -O2 -Dvolatile= fake_mmio.c -o fake_broken -pthread
./fake_broken
```

预期输出：程序挂死，Ctrl+C 退出——第 1 节的死循环换了一身衣服。轮询位检测（`& 0x1u`）是 MMIO 读侧的状态机骨架：volatile 保证每一圈都真实读寄存器，位运算负责解析语义（[位运算与位域](/c/070-BitwiseOperationAndMask)）。

### 3.2 写触发的死存储实验

读侧之外，写侧也有专属事故：寄存器写入常常「值没人读」，副作用才是目的（启动转换、触发 DMA）。上面的实验加一个触发寄存器：

```c
volatile unsigned int hw_trigger = 0;   /* 写 1 = 按启动钮 */

static void start_device(void) {
    hw_trigger = 1;    /* 写完即返回，这个值再没人读 */
}
```

先保持 volatile，`gcc -O2 -S fake_mmio.c` 在汇编里能找到对 hw_trigger 的存储指令；再把 hw_trigger 的 volatile 删掉重新生成，`start_device` 会被优化成一条直接 `ret`——死存储消除把「启动设备」这个动作整个抹掉了。值可以没人读，动作不能没发生：这正是写寄存器必须 volatile 的原因。

### 3.3 真实嵌入式映射长什么样

真实固件里，一整块外设寄存器用结构体映射（STM32 风格，节选）：

```c
typedef struct {
    volatile unsigned int MODER;   /* 模式寄存器 */
    volatile unsigned int IDR;     /* 输入数据寄存器 */
    volatile unsigned int BSRR;    /* 置位/复位寄存器：写它点亮 LED */
} GPIO_Type;
#define GPIOA ((GPIO_Type *)0x40020000u)

GPIOA->BSRR = (1u << 5);                        /* 写：副作用即目的 */
while ((GPIOA->IDR & (1u << 0)) == 0u) { }      /* 读：轮询按键 */
```

厂商头文件里的 `__IO`、`__O`、`__I` 宏展开后就是 `volatile`、`volatile`、`volatile const`——260 篇 2x2 表的右列，在这里全部落地。地址段不可缓存、MPU 写保护、启动代码建映射等平台功课见 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)。

## 4. 信号处理实战

### 4.1 为什么普通 int 不行：条款级解释

C17 7.14.1.1 的规则（转述）：信号非因调用 abort 或 raise 而发生时，信号处理器若引用任何具有静态或线程存储期、**既不是无锁原子对象、也不是（赋值给）static volatile sig_atomic_t** 的对象，行为未定义。

普通 int 踩空在两个独立的位置上：

1. **可见性输给优化器**：处理器改了普通 int，主循环可能永远看不见——第 1 节的汇编就是证据，编译器把读取提出循环之后，处理器写的那个内存位置再也没人看；
2. **没有原子性承诺**：标准没说普通 int 的单次读写不可分割。宽度超过总线或对齐不佳的平台上，一次读可能被信号拦腰截断，读到半成品。`sig_atomic_t` 是标准钦定的「信号原子」整数类型：单次读或写保证不可分割。

`volatile sig_atomic_t` 两个字各补一个窟窿：sig_atomic_t 管单次访问的完整性，volatile 管可见性。严谨的边界还要再划一刀：sig_atomic_t 只担保**单次读或单次写**，自增（读-改-写三步）不在担保之内——两次信号贴得极近时仍可能丢一次计数。逐字可移植的写法把处理器限制在「纯赋值」，计数需求交给 C11 无锁原子类型；工程上「计数允许极小概率误差、退出标志必须可靠」的取舍也被广泛接受（见 4.2 的注释）。

### 4.2 完整可跑程序：USR1 计数，TERM 退出

POSIX 推荐 sigaction 而非 signal（signal 的语义在各平台上差异过大）：

```c
/* signal_demo.c：SIGUSR1 计数，SIGTERM 退出 */
#include <signal.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

static volatile sig_atomic_t usr1_count = 0;
static volatile sig_atomic_t stop = 0;

static void handler(int sig) {
    if (sig == SIGUSR1) {
        usr1_count++;    /* 读改写：工程取舍可接受，逐字严谨请用 C11 原子类型 */
    } else if (sig == SIGTERM) {
        stop = 1;        /* 纯赋值：标准担保的用法 */
    }
}

int main(void) {
    struct sigaction sa;
    memset(&sa, 0, sizeof sa);
    sa.sa_handler = handler;
    sigemptyset(&sa.sa_mask);
    if (sigaction(SIGUSR1, &sa, NULL) != 0 ||
        sigaction(SIGTERM, &sa, NULL) != 0) {
        perror("sigaction");
        return 1;
    }

    printf("PID = %d；kill -USR1 <PID> 计数，kill <PID> 退出\n", (int)getpid());
    while (stop == 0) {
        (void)pause();   /* 睡到信号来，不烧 CPU */
    }
    printf("收到 SIGUSR1 共 %d 次\n", (int)usr1_count);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g signal_demo.c -o signal_demo
./signal_demo &
kill -USR1 24116; kill -USR1 24116; kill 24116
```

预期输出（PID 每次不同）：

```text
PID = 24116；kill -USR1 <PID> 计数，kill <PID> 退出
收到 SIGUSR1 共 2 次
```

把 stop 的 volatile 删掉、`-O2` 重编：pause 返回后循环若被优化成只读一次 stop，第一发 SIGTERM 可能直接被吞掉——第 1 节的机制在真实守护进程里的翻版。

### 4.3 处理器里到底能做什么

标准的白名单（C17 7.14.1.1，转述）：异步信号的处理器里，除读写 `volatile sig_atomic_t` 与无锁原子对象外，调用标准库函数只有五个安全项——`abort`、`_Exit`、`quick_exit`、以当前信号重注册的 `signal`、`<stdatomic.h>` 中作用于无锁原子对象的函数。`printf`、`malloc` 一概不可：它们内部有锁与缓冲区状态，被打断的正是它们自己时，重入就是灾难。POSIX 另维护一份更长的异步信号安全清单（`write`、`_exit` 等），`printf` 与 `malloc` 同样不在其列。

工程范式因此定型：**处理器里只置标志，一切复杂处理回主循环**。4.2 的 handler 就是这个范式的最小实现。

## 5. setjmp/longjmp：一句带准

C17 7.13.2.1（转述）：longjmp 跳回后，setjmp 所在函数里**已被修改的非 volatile 局部变量，值不确定**——值若被缓存进寄存器，longjmp 恢复的是旧寄存器现场，修改即丢失。规矩：setjmp 之后要改、改完要跨过 longjmp 使用的局部变量，一律加 volatile。volatile 的第三大法定场景，机制与第 2 节的寄存器缓存同源。

## 6. 常见错误与调试实录：误用事故三则

### 6.1 事故一：volatile 当原子计数器（丢更新）

```c
/* race_counter.c */
#include <pthread.h>
#include <stdio.h>

volatile unsigned int counter = 0;   /* 错误信念：volatile 保证 ++ 原子 */

static void *worker(void *arg) {
    (void)arg;
    for (int i = 0; i < 100000; i++) {
        counter++;                   /* 读-改-写三步，volatile 管不住中间插队 */
    }
    return NULL;
}

int main(void) {
    pthread_t a, b;
    if (pthread_create(&a, NULL, worker, NULL) != 0 ||
        pthread_create(&b, NULL, worker, NULL) != 0) {
        return 1;
    }
    pthread_join(a, NULL);
    pthread_join(b, NULL);
    printf("counter = %u（期望 200000）\n", counter);
    return 0;
}
```

```bash
gcc -Wall -Wextra -O2 race_counter.c -o race_counter -pthread
./race_counter
./race_counter
```

一次典型输出（每次不同，几乎从不到 200000）：

```text
counter = 137291（期望 200000）
counter = 121847（期望 200000）
```

事故解读：`counter++` 展开为 load、add、store 三步。volatile 只担保三步各自真实发生，不担保线程 A 的 load 与 store 之间没有线程 B 抢跑——B 也 load 到旧值，两次自增只落地一次。更严重的是，无同步的并发修改本身是数据竞争（未定义行为），volatile 救不了。修正：

```c
#include <stdatomic.h>
atomic_uint counter = 0;
/* counter++ 等价 atomic_fetch_add(&counter, 1)：一条不可分割的读-改-写 */
```

换成 atomic_uint 后，跑十遍次次 200000。原子类型与内存序的系统讲解在 [C 原子操作与内存模型](/c/380-AtomicAndMemoryModel)。

### 6.2 事故二：volatile 标志当锁（双线程双双闯入）

```c
/* race_lock.c */
#include <pthread.h>
#include <stdio.h>
#include <time.h>

volatile int locked = 0;             /* 0 = 没人持有，1 = 已持有 */

static void *worker(void *arg) {
    long id = (long)arg;
    while (locked == 1) {            /* 第一拍：看见锁被占就等 */
        ;
    }
    struct timespec t = {0, 10 * 1000 * 1000};   /* 人为放大竞态窗口；
        真实事故没有这行 sleep，所以表现为偶现——偶现才是事故常态 */
    nanosleep(&t, NULL);
    locked = 1;                      /* 第二拍：占锁 */
    printf("thread %ld entered\n", id);   /* 两行输出 = 双双闯入的铁证 */
    locked = 0;
    return NULL;
}

int main(void) {
    pthread_t a, b;
    if (pthread_create(&a, NULL, worker, (void *)1L) != 0 ||
        pthread_create(&b, NULL, worker, (void *)2L) != 0) {
        return 1;
    }
    pthread_join(a, NULL);
    pthread_join(b, NULL);
    return 0;
}
```

```bash
gcc -Wall -Wextra -O2 race_lock.c -o race_lock -pthread
./race_lock
```

一次典型输出：

```text
thread 1 entered
thread 2 entered
```

事故解读：check-then-set 是两拍动作，volatile 拼不成一拍。线程 1 在「看见 locked==0」与「写 locked=1」之间被线程 2 超车，两人同时通过门禁。锁的本质是**不可分割的「检查并占位」**（test-and-set），而 volatile 恰恰不提供任何不可分割性。正解二选一：C11 的 `atomic_flag` 自旋锁（`atomic_flag_test_and_set` + release 语义的 clear），或 `mtx_t` 互斥锁（见 [C 原子操作与内存模型](/c/380-AtomicAndMemoryModel)、[线程与并发](/c/360-ThreadConcurrency)）。

### 6.3 事故三：多线程忙等标志的正解

第 1 节的 flag_loop 搬进真线程场景：

```c
int flag = 0;    /* 非 volatile、非原子 */
/* 线程 A：while (flag == 0) ;     线程 B：flag = 1; */
```

三宗罪叠加：-O2 下死循环（第 1 节）；就算侥幸退出，读写无同步仍是数据竞争（UB）；两个动作之间没有任何顺序保证。按需求三选一：

```c
#include <stdatomic.h>
atomic_bool flag = false;        /* 选一：标志只做通知 */
/* 线程 B */ atomic_store(&flag, true);
/* 线程 A */ while (!atomic_load(&flag)) { ; }
```

```c
#include <threads.h>
/* 选二：等的是「条件」，用条件变量，不烧 CPU（见线程与并发篇） */
/* 选三：单核裸机与中断共享——volatile + 关中断读改写（见嵌入式篇） */
```

顺带记住 volatile 限定被悄悄丢掉的两种写法——编译器拦得住第一种，拦不住第二种：

```c
volatile unsigned int fifo[8];
unsigned int *p = fifo;                    /* 编译错误：丢失 volatile */
unsigned int *q = (unsigned int *)fifo;    /* 强转：拦不住，此后 *q 不再受担保 */
```

## 7. 边界表：volatile、_Atomic、互斥锁各管什么

| 维度 | volatile | _Atomic（C11 起） | 互斥锁（mtx_t / pthread_mutex_t） |
| --- | --- | --- | --- |
| 回答的问题 | 每次访问都真实发生吗 | 读改写与同步是否不可分割 | 一段代码是否独占执行 |
| 原子性 | 不提供 | 提供 | 提供（临界区内） |
| 内存序 | 不提供（编译器级也只管到序列点） | 提供（relaxed 到 seq_cst 可选） | 提供（加解锁构成同步点） |
| 典型场景 | MMIO、信号标志、setjmp 局部变量 | 计数器、标志、无锁数据结构 | 保护一大段共享状态 |
| 反面典型 | 当线程同步工具 | 当 MMIO 访问手段 | 为改一个整数反复上重锁 |

最后两格的「互相不可替代」值得展开：`_Atomic` 不豁免 as-if 规则——语义等价的相邻原子访问仍可能被编译器合并，「每一次访问都物理发生」只有 volatile 担保，所以 MMIO 不能换成原子类型；反过来，「算得对、排得对」只有原子与锁担保，volatile 给不了，所以并发不能换成 volatile。两个关键词回答两个正交的问题，与 260 篇 const/volatile 的正交结构遥相呼应。

两条工程文化备注：C++ 侧自 C++20 起弃用了 volatile 的大部分复合操作（提案 P1152R4），方向与本篇结论一致——volatile 只留给「访问次数与顺序本身就是语义」的场合，C 标准未跟进弃用但纪律相同；Linux 内核文档 volatile-considered-harmful 更进一步，把变量上的直接 volatile 视为 bug 信号，改用 READ_ONCE / WRITE_ONCE 宏把 volatile 语义标注在**访问点**（`#define READ_ONCE(x) (*(volatile typeof(x) *)&(x))`）。启示一句话：volatile 是标在具体访问上的手术刀，不是撒在全局变量上的胡椒粉。

## 8. 实际项目中的使用场景

- 驱动与固件：寄存器访问全部经 volatile 指针，映射声明逐字符评审（[嵌入式 C 编程](/c/550-EmbeddedCProgramming)）；
- 守护进程与后台服务：SIGTERM 退出标志用 `volatile sig_atomic_t`，handler 只置标志（[信号处理](/c/340-SignalHandling)）；
- 高频忙等/自旋：先选对工具（原子操作、条件变量、平台 pause 指令），volatile 只是可见性保底；
- 代码评审：看到「全局变量一律加 volatile」的补丁要追问——它掩盖的是漏掉的原子操作还是漏掉的锁？用 260 篇的四问卡定位它真正属于哪一层，不属于任何一层的 volatile 应当删掉。

## 9. 小练习

预测题（5 分钟）：两个线程、`-O2` 编译，线程 B 执行 `data = 42; ready = 1;`（ready 为 volatile int，data 为普通 int），线程 A 执行 `while (ready == 0) ; printf("%d\n", data);`。打印 42 还是 0？

参考答案（先写再看）：**都可能**。volatile 只担保 ready 自身的访问真实发生；data 与 ready 之间没有任何顺序承诺——GCC 文档原话：非 volatile 访问相对 volatile 访问不受排序约束，编译器可以先把举旗提前（且无同步的共享本身已是数据竞争）。正解是 release/acquire 原子操作，见 [C 原子操作与内存模型](/c/380-AtomicAndMemoryModel)。

修改题（20 分钟）：把 6.1 的 race_counter 跑 10 次记下最小值；换成 `atomic_uint` 后再跑 10 次。验收：两列数字都进笔记，能口头解释「丢的更新去了哪」（B 的 store 覆盖了 A 刚 store 的值）。

挑战题（45 分钟）：给 fake_mmio.c 补上 3.2 节的触发握手：main 先写 `hw_trigger = 1`，hardware_actor 收到后（轮询或直接假定已触发均可）再置就绪位。步骤：先在 volatile 齐全的版本上跑通；再分别删除两个 volatile（触发寄存器、状态寄存器）做四次 `-O2` 对照，用 `objdump -d` 找出每一版里「触发存储消失」或「轮询被提出循环」的证据。提示两级：思路（触发写是死存储消除的猎物，轮询是循环不变量外提的猎物，两者失守的位置不同）；验收（四种组合的汇编证据各贴一段进学习笔记，并注明哪一种组合仍然能正常退出）。

## 10. 与之前和之后的知识的关系

- 往前：[const 与 volatile](/c/260-ConstAndVolatileQualifiers) 给出定义与场景，本篇补上「为什么」与「错会怎样」；
- 旁支：[信号处理](/c/340-SignalHandling) 讲信号 API 全集，本篇只取共享变量的角度；[C 汇编交互](/c/560-CAssemblyInteraction) 接住 2.3 节的编译器屏障；[静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers) 的 TSan 能把 6.1、6.2 的数据竞争当场揪出；
- 往后：[C 原子操作与内存模型](/c/380-AtomicAndMemoryModel) 与 [线程与并发](/c/360-ThreadConcurrency) 是「算得对、排得对」的正解所在。

## 11. 官方文档

- volatile 限定符（cppreference C，含「不提供原子性、同步、内存序」原文）：https://en.cppreference.com/w/c/language/volatile
- signal（cppreference C，处理器可引用对象与可调用函数白名单）：https://en.cppreference.com/w/c/program/signal
- setjmp（cppreference C，非 volatile 局部变量跳回后值不确定）：https://en.cppreference.com/w/c/program/setjmp
- GCC 文档 Volatiles（序列点间的合并/重排自由度、非 volatile 访问不受排序约束）：https://gcc.gnu.org/onlinedocs/gcc/Volatiles.html

## 12. 自我检查

- 能不看资料复现第 1 节实验，并指出 -O2 汇编里「读被提出循环」的那一行；
- 能用 as-if 规则与 C11 6.8.5 解释编译器四种优化各自的合法性来源；
- 能逐条援引 C17 7.14.1.1 与 7.13.2.1，说清信号处理器与 setjmp 场景的担保边界；
- 面对一段共享代码，能在三分钟内指出 volatile、`_Atomic`、锁各自的职责层，并指出错位用法。

## 本章总结

编译器的一切优化都从 as-if 规则领授权：普通变量的访问不属可观察行为，外提、折叠、死存储消除、空循环缩并全部合法；volatile 以「每次访问都是可观察副作用」截断授权链，但只截断到序列点，也管不到 CPU 层的重排。MMIO 的读写两侧各有一类事故：读侧漏 volatile 变死循环，写侧漏 volatile 触发动作用被当死存储抹掉。信号场景的担保精确到条款：处理器只可靠地读写 `volatile sig_atomic_t`（或无锁原子），printf 与 malloc 一概不可。三起误用事故丈量出同一条边界：volatile 不提供原子性与内存序——计数器要 `atomic_uint`，锁要 test-and-set，忙等标志要原子或条件变量。手术刀不是胡椒粉。

## 下一步

进入 [泛型选择](/c/280-GenericSelection)：优化器的边界摸完了，回到语言本身——C 的 `_Generic` 如何在编译期按类型分派，给没有重载的语言补上「一个名字，多种类型」。
