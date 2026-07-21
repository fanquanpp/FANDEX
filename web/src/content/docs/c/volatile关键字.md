---
order: 106
title: volatile关键字
module: c
category: dev-lang
tags:
  - c
  - volatile
  - memory-model
  - compiler-optimization
  - atomic
  - mmio
  - signal-handler
  - embedded
difficulty: advanced
description: C 语言 volatile 关键字的完整知识体系，涵盖标准语义、编译器优化抑制、内存映射 I/O、信号处理、setjmp/longjmp、C11 原子操作对比、C++20 volatile 弃用、Linux 内核实践与多线程陷阱。
author: fanquanpp
related:
  - c/多文件编译
  - c/指针深度解析
  - c/C23与C2y新标准
  - c/线程与并发
  - c/属性与编译器扩展
  - c/内存模型
prerequisites:
  - c/概述
  - c/指针深度解析
  - c/多文件编译
learningObjectives:
  - '{''remember'': ''记忆 C 标准 §6.7.3 对 volatile 的定义、6 种必须使用 volatile 的场景与 5 种常见误用''}'
  - '{''understand'': ''理解编译器优化机制、as-if 规则、可观察行为（observable behavior）与 volatile 的语义边界''}'
  - '{''apply'': ''能够正确使用 volatile 处理内存映射 I/O、信号处理、setjmp/longjmp 等场景''}'
  - '{''analyze'': ''分析 volatile 与 atomic 的本质区别，识别 volatile 在多线程环境下的局限性''}'
  - '{''evaluate'': ''评估 C11 stdatomic、GCC __sync、__atomic 内建函数与 volatile 的适用场景''}'
  - '{''create'': ''设计正确的跨线程通信与硬件抽象层代码，正确组合 volatile、atomic、memory barrier''}'
exercises:
  - id: ex-volatile-01
    type: fill-blank
    cognitiveLevel: remember
    question: C 标准规定，对 volatile 限定对象的访问构成____，编译器必须严格按照抽象机的语义进行读写，不得合并、消除或重排此类访问。
    blankCount: 1
    answers:
      - 副作用
      - side effect
    caseSensitive: false
    answer: 副作用（side effect）
    explanation: ISO/IEC 9899:2024 §5.1.2.3 将对 volatile 对象的访问定义为副作用，§6.7.3 进一步规定 volatile 限定对象的访问属于"可观察行为"（observable behavior），编译器不可优化。
    difficulty: 2
    estimatedTime: 3
  - id: ex-volatile-02
    type: choice
    cognitiveLevel: understand
    question: 下列关于 volatile 与原子性（atomicity）关系的描述，哪一项是正确的？
    options:
      - volatile 保证操作的原子性，因此可用于多线程同步
      - volatile 仅抑制编译器优化，不保证原子性、可见性与有序性
      - 在 32 位平台上，对 volatile int 的读写是原子的，因此可作多线程标志位
      - C11 stdatomic.h 的 atomic_int 与 volatile int 语义等价
    correctIndex: 1
    answer: B
    explanation: volatile 仅告诉编译器"对象可能被意外改变"，抑制优化。它不保证 (1) 原子性（读取可能被撕裂）、(2) 多核可见性（无内存屏障）、(3) 顺序性（CPU 可能重排）。多线程同步必须使用 atomic 或锁。C++20 起 volatile 的部分语义被进一步弱化。
    difficulty: 3
    estimatedTime: 5
  - id: ex-volatile-03
    type: code-fix
    cognitiveLevel: apply
    question: 下列多线程代码意图用 volatile 实现自旋锁，但存在严重错误。请说明错误原因并给出正确实现。
    buggyCode: |
      #include <stdbool.h>
      static volatile bool ready = false;

      // 线程 1
      void producer(void) {
          data = 42;            // 写数据
          ready = true;         // 通知消费者
      }

      // 线程 2
      void consumer(void) {
          while (!ready) {}     // 自旋等待
          use(data);            // 读取数据
      }
    language: c
    fixedCode: |
      #include <stdatomic.h>
      #include <stdbool.h>

      static _Atomic bool ready = false;
      static int data = 0;

      // 线程 1
      void producer(void) {
          data = 42;
          atomic_store_explicit(&ready, true, memory_order_release);
      }

      // 线程 2
      void consumer(void) {
          while (!atomic_load_explicit(&ready, memory_order_acquire)) {}
          use(data);  // 看到 data == 42
      }
    errorDescription: volatile 不保证 (1) ready 写入对其他 CPU 可见（无内存屏障）、(2) data = 42 与 ready = true 的顺序（CPU 可能重排）、(3) ready 读取的原子性（虽然单字节通常原子，但标准不保证）。
    answer: 见 fixedCode
    explanation: 正确做法是使用 C11 stdatomic.h 的 atomic_store_explicit/atomic_load_explicit 配合 memory_order_release/acquire，建立 happens-before 关系，保证 data 的写入对消费者可见。这是经典的 release-acquire 同步模式。
    difficulty: 5
    estimatedTime: 10
  - id: ex-volatile-04
    type: open-ended
    cognitiveLevel: create
    question: 设计一个嵌入式系统的 GPIO 驱动框架，要求：(1) 抽象 GPIO 寄存器访问；(2) 支持多平台（STM32、ESP32、Linux 用户态）；(3) 处理编译器优化；(4) 保证读写在硬件层面的顺序；(5) 提供中断安全的接口。请给出关键数据结构、API 设计、平台适配层实现，并说明你的设计决策。
    keyPoints:
      - 使用 volatile uint32_t * 映射硬件寄存器地址
      - 通过宏或函数抽象 MMIO 访问（readl/writel 或自定义）
      - 使用 memory barrier（__sync_synchronize、asm volatile、dmb）保证顺序
      - 区分中断上下文与任务上下文，使用关中断或自旋锁保护临界区
      - Linux 用户态使用 /dev/mem 或 UIO，需要 mmap
      - 至少讨论寄存器位操作原子性、DMA 一致性、Cache 一致性 3 个工程权衡
    answer: 开放性题目，参考 keyPoints 评分
    explanation: 本题考察嵌入式系统综合能力。优秀答案应体现硬件抽象、平台可移植性、并发安全、性能权衡。参考 Linux kernel drivers/gpio、Zephyr RTOS、FreeRTOS 的 GPIO 实现。
    difficulty: 5
    estimatedTime: 60
references:
  - type: standard
    authors: ['ISO/IEC JTC1/SC22/WG14']
    year: 2024
    title: 'ISO/IEC 9899:2024 Information technology — Programming languages — C'
    venue: International Organization for Standardization
    version: C23
    url: https://www.iso.org/standard/82075.html
  - type: standard
    authors: ['ISO/IEC JTC1/SC22/WG21']
    year: 2020
    title: 'ISO/IEC 14882:2020 Programming languages — C++'
    venue: International Organization for Standardization
    version: C++20
  - type: book
    authors: ['Kernighan, Brian W.', 'Ritchie, Dennis M.']
    year: 1988
    title: 'The C Programming Language'
    venue: Prentice Hall
    edition: 2nd
  - type: book
    authors: ['Bryant, Randal E.', "O'Hallaron, David R."]
    year: 2015
    title: 'Computer Systems: A Programmer''s Perspective'
    venue: Pearson
    edition: 3rd
    pages: '233-280'
    isbn: 9780134092663
  - type: book
    authors: ['Williams, Anthony']
    year: 2019
    title: 'C++ Concurrency in Action'
    venue: Manning Publications
    edition: 2nd
    isbn: 9781617294693
  - type: book
    authors: ['Cattell, Richard']
    year: 2017
    title: 'Embedded C Coding Standard'
    venue: Barr Group
  - type: technical-report
    authors: ['Meyers, Scott', 'Alexandrescu, Andrei']
    year: 2004
    title: 'C++ and the Perils of Double-Checked Locking'
    venue: IsoCpp
    url: https://www.aristeia.com/Papers/DDJ_Jul_Aug_2004_revised.pdf
  - type: documentation
    authors: ['Kernel.org Documentation Team']
    year: 2024
    title: 'Linux Kernel Memory Barriers'
    venue: Linux Foundation
    url: https://www.kernel.org/doc/Documentation/memory-barriers.txt
etymology:
  - term: volatile
    english: volatile
    origin: 拉丁语 volatilis，意为"飞行的、易挥发的"，引申为"易变的、不稳定的"。C 语言借用此词表达"对象可能在编译器不知情时被改变"的语义，最早出现在 K&R C（1978）
  - term: 副作用
    english: side effect
    origin: 来源于形式语义学，指表达式求值过程中对程序状态（如内存、I/O）的改变。C 标准 §5.1.2.3 将 volatile 访问、对象修改、文件读写列为副作用
  - term: 可观察行为
    english: observable behavior
    origin: C 标准 as-if 规则的核心概念，指程序对外部世界（I/O、volatile 访问、信号处理）的影响，编译器优化不得改变可观察行为
lastReviewed: 2026-07-20
reviewer: FANDEX Content Engineering Team
---

# volatile 关键字

## 1. 学习目标与导论

### 1.1 为什么需要 volatile

C 语言诞生于 1972 年，最初用于编写 Unix 操作系统。在编译器优化能力尚弱的年代，程序员编写的代码与机器执行的行为基本一致。然而，随着编译器优化技术（如常量折叠、死代码消除、循环不变量外提、指令重排）日益强大，原本"看似正确"的代码在优化后出现诡异行为。

考虑以下经典场景：

```c
// 场景 1：内存映射 I/O
volatile uint32_t *status_reg = (uint32_t *)0x40008000;
while (*status_reg & 0x01) {
    // 等待状态位清零
}
```

若不加 `volatile`，编译器可能将 `*status_reg` 的值缓存到寄存器，只读取一次，导致死循环。

```c
// 场景 2：信号处理
volatile sig_atomic_t flag = 0;

void handler(int sig) { flag = 1; }

int main(void) {
    signal(SIGINT, handler);
    while (!flag) { }   // 等待 Ctrl+C
    return 0;
}
```

若不加 `volatile`，编译器可能认为 `flag` 在循环中未被修改（信号处理函数对编译器不可见），将其提升到循环外。

```c
// 场景 3：setjmp/longjmp
volatile int val = 0;
if (setjmp(buf) == 0) {
    val = 42;
    longjmp(buf, 1);
}
// 此处 val 必须为 42，需要 volatile
```

`volatile` 关键字正是为应对这些场景而生。它告诉编译器："此对象的值可能在编译器不知情的情况下被改变，每次访问都必须从内存读取或写回，不得缓存到寄存器，不得合并、消除或重排访问。"

### 1.2 volatile 的核心语义

ISO/IEC 9899:2024 §6.7.3 与 §5.1.2.3 定义了 volatile 的三项核心语义：

1. **副作用保证**：对 volatile 限定对象的访问（读或写）构成副作用（side effect），属于程序的"可观察行为"（observable behavior）。
2. **优化抑制**：编译器必须严格按照抽象机语义执行 volatile 访问，不得优化掉、合并或重排。
3. **类型系统影响**：volatile 是类型限定符（type qualifier），影响类型而非存储类。

### 1.3 本文档适用读者

- 嵌入式系统开发者（GPIO、UART、SPI 等外设驱动）
- 操作系统内核开发者
- 信号处理、setjmp/longjmp 的高级 C 程序员
- 多线程并发编程学习者
- 准备深入理解 C 内存模型的工程师

### 1.4 学习路径

```
C 标准 volatile 定义 & as-if 规则
        │
        ▼
编译器优化机制（常量折叠、循环外提、指令重排）
        │
        ▼
volatile 的 6 大使用场景
        │
        ▼
volatile 与 atomic 的本质区别
        │
        ▼
内存屏障与 CPU 重排
        │
        ▼
C11 stdatomic.h
        │
        ▼
C++20 volatile 弃用与语义变化
        │
        ▼
Linux 内核 ACCESS_ONCE/READ_ONCE/WRITE_ONCE
        │
        ▼
嵌入式 MMIO 工程实践
```

## 2. 历史动机与演进

### 2.1 K&R C 时代（1978）

`volatile` 关键字首次出现在 1978 年 Brian Kernighan 与 Dennis Ritchie 的《The C Programming Language》第一版。当时 Unix 已被移植到多种硬件平台，程序员发现：

- 内存映射 I/O 寄存器在被缓存后失效
- 信号处理函数修改的变量在主循环中"看不到"变化
- 早期优化编译器（如 PCC）开始出现这类问题

K&R 引入 `volatile` 作为类型限定符，明确告知编译器"此对象不可优化"。

### 2.2 C89 标准化（1989）

ANSI X3.159-1989（C89）正式将 `volatile` 纳入标准，定义为类型限定符（type qualifier），与 `const` 并列。C89 §3.5.3 规定：

> An object that has volatile-qualified type may be modified in ways unknown to the implementation or have other unknown side effects. Therefore any expression referring to such an object shall be evaluated strictly according to the rules of the abstract machine, as described in 2.1.2.3.

C89 同时将 volatile 访问列为"可观察行为"的一部分。

### 2.3 C99 的细化（1999）

C99 §6.7.3 进一步细化 volatile 语义：

- 明确 volatile 数组、volatile 结构体成员的处理
- 引入 `volatile` 限定指针（`volatile int *p` vs `int *volatile p`）
- 规定 volatile 对象的初始化语义

### 2.4 C11 的革命性变化（2011）

C11 引入 `_Atomic` 类型限定符与 `<stdatomic.h>` 头文件，从根本上改变了多线程编程的范式：

- `_Atomic` 提供真正的原子性、可见性、有序性保证
- `volatile` 被明确排除在多线程同步之外
- C11 内存模型（§5.1.2.4）定义了 happens-before、synchronizes-with 等关系

C11 之后，多线程编程应使用 `atomic_int`、`atomic_store`、`atomic_load`，而非 `volatile`。

### 2.5 C17/C23 的演进

- **C17**（2018）：缺陷修复，无重大变化
- **C23**（2024）：
  - 标准化 `__attribute__` 语法
  - 引入 `constexpr`（与 volatile 互斥）
  - `thread_local` 替代 `_Thread_local`
  - 部分弃用 volatile 的语义（参考 C++20）

### 2.6 C++20 的革命（2020）

C++20 对 volatile 做了重大语义调整（P1152R4）：

- 弃用 `volatile` 限定类型的某些操作
- 弃用 `volatile` 的复合赋值（`+=`、`-=` 等）
- 弃用 `volatile` 的自增/自减
- 弃用 `volatile` 函数返回值

C++20 起推荐使用 `std::atomic` 替代 `volatile` 用于多线程，`volatile` 仅用于真正的 MMIO 场景。

## 3. C 标准对 volatile 的定义

### 3.1 §6.7.3 类型限定符

ISO/IEC 9899:2024 §6.7.3 规定：

> An object that has volatile-qualified type may be modified in ways unknown to the implementation or have other unknown side effects. Therefore any expression referring to such an object shall be evaluated strictly according to the rules of the abstract machine, as described in 5.1.2.3.

关键点：

1. "may be modified in ways unknown to the implementation"：对象可能被编译器无法察觉的方式修改（如硬件、中断、其他线程）。
2. "shall be evaluated strictly according to the rules of the abstract machine"：必须按抽象机语义求值。
3. "any expression referring to such an object"：任何引用该对象的表达式都受影响。

### 3.2 §5.1.2.3 程序执行（抽象机语义）

C 标准定义"抽象机"（abstract machine）作为程序语义的形式化模型。§5.1.2.3 列出构成"可观察行为"的副作用：

1. 对 volatile 对象的访问
2. 程序终止时的数据写入文件
3. 输入/输出设备交互

as-if 规则（as-if rule）规定：编译器可以任意优化，**只要不改变可观察行为**。volatile 访问属于可观察行为，因此不可被优化掉。

### 3.3 §5.1.2.3 程序执行 - 序列点

volatile 访问的求值顺序受序列点（sequence point）约束。C11 引入的简化模型用"前序"（sequenced before）关系替代了 C89 的序列点。

```c
volatile int a = 1, b = 2;
int x = a + b;   // a 与 b 的读取有顺序约束
```

### 3.4 volatile 与 const 的组合

`volatile` 与 `const` 可同时使用，产生 4 种组合：

```c
int v;
const int *p1 = &v;            // 指向 const int 的指针：不能通过 p1 修改 *p1
volatile int *p2 = &v;         // 指向 volatile int 的指针：每次访问 *p2 都从内存读取
const volatile int *p3 = &v;   // 指向 const volatile int 的指针：只读但每次都从内存读
int *const p4 = &v;            // const 指针：p4 本身不可改
int *volatile p5 = &v;         // volatile 指针：p5 本身可能被改（少用）
const int *volatile p6 = &v;   // 组合：p6 volatile，*p6 const
```

#### 3.4.1 硬件只读寄存器（const volatile）

最经典的组合是 `const volatile`，用于硬件只读寄存器：

```c
// 硬件状态寄存器：软件只读，但硬件会随时修改
const volatile uint32_t *status = (const volatile uint32_t *)0x40008000;

uint32_t read_status(void) {
    return *status;   // 每次都从硬件读取
}
// *status = 0;  // 编译错误：const 限定
```

`const` 防止软件误写，`volatile` 防止编译器缓存读值。

### 3.5 volatile 限定符的位置

```c
volatile int x;          // x 是 volatile int
int volatile x;          // 等价写法
volatile int *p;         // p 是指向 volatile int 的指针
int *volatile p;         // p 是 volatile 指针，指向 int
volatile int *volatile p; // p 是 volatile 指针，指向 volatile int
```

记忆规则（"右左法则"）：从变量名开始，先向右看（数组/函数），再向左看（指针），遇到类型限定符（const/volatile）作用于左侧最近的类型。

## 4. 编译器优化机制

理解 volatile 的价值，必须先理解编译器优化机制。

### 4.1 常量折叠（Constant Folding）

```c
int x = 3 * 4;   // 编译器直接计算为 x = 12
```

若 `3` 与 `4` 是 volatile，则禁止折叠：

```c
volatile int a = 3, b = 4;
int x = a * b;   // 必须运行时计算
```

### 4.2 死代码消除（Dead Code Elimination）

```c
int x = 0;
if (x) {
    do_something();   // 编译器知道 x == 0，删除整个 if
}
```

```c
volatile int x = 0;
if (x) {
    do_something();   // volatile，不能假设 x == 0，保留 if
}
```

### 4.3 循环不变量外提（Loop-Invariant Code Motion）

```c
// 非 volatile 版本
for (int i = 0; i < 1000; i++) {
    arr[i] = *ptr;   // 编译器可能将 *ptr 提到循环外，只读一次
}

// volatile 版本
volatile int *ptr = ...;
for (int i = 0; i < 1000; i++) {
    arr[i] = *ptr;   // 每次迭代都必须重新读取
}
```

### 4.4 公共子表达式消除（Common Subexpression Elimination）

```c
// 非 volatile
int a = *ptr + 1;
int b = *ptr + 2;   // 编译器可能复用上次的 *ptr 值

// volatile
volatile int *ptr = ...;
int a = *ptr + 1;
int b = *ptr + 2;   // 必须重新读取 *ptr
```

### 4.5 指令重排（Instruction Reordering）

编译器可能重排指令以提高流水线效率：

```c
// 原始顺序
data = 42;
ready = 1;

// 编译器可能重排为
ready = 1;
data = 42;   // 优化：先写无依赖的寄存器
```

volatile 限制了编译器对 volatile 访问的重排，但**不限制**非 volatile 访问的重排：

```c
volatile int ready;
int data;

data = 42;       // 非 volatile，可重排
ready = 1;       // volatile，不可与上句合并，但 data 可被重排到 ready 之后
```

这是 volatile 在多线程中失效的关键原因之一。

### 4.6 寄存器缓存（Register Caching）

最常见也最危险的优化：

```c
// 死循环：编译器缓存 *status
uint32_t *status = ...;
while (*status & 0x01) { }   // *status 被缓存到寄存器，永远为真

// 正确：volatile 强制每次读内存
volatile uint32_t *status = ...;
while (*status & 0x01) { }
```

## 5. volatile 的六大使用场景

### 5.1 场景一：内存映射 I/O（MMIO）

最常见的 volatile 用途。硬件寄存器映射到特定内存地址，软件通过指针访问。

```c
// STM32 GPIOA 输出数据寄存器
#define GPIOA_ODR (*(volatile uint32_t *)0x40020014)

// 设置 PA5 高电平（点亮 LED）
GPIOA_ODR |= (1 << 5);

// 读取 GPIOA 输入
uint32_t input = GPIOA_ODR;
```

#### 5.1.1 完整的 MMIO 示例

```c
#include <stdint.h>

// STM32F4xx GPIO 寄存器定义
typedef struct {
    volatile uint32_t MODER;    // 模式寄存器
    volatile uint32_t OTYPER;   // 输出类型寄存器
    volatile uint32_t OSPEEDR;  // 输出速度寄存器
    volatile uint32_t PUPDR;    // 上拉下拉寄存器
    volatile uint32_t IDR;      // 输入数据寄存器
    volatile uint32_t ODR;      // 输出数据寄存器
    volatile uint32_t BSRR;     // 置位/复位寄存器
    volatile uint32_t LCKR;     // 锁定寄存器
    volatile uint32_t AFRL;     // 复用功能低位寄存器
    volatile uint32_t AFRH;     // 复用功能高位寄存器
} GPIO_Type;

#define GPIOA ((GPIO_Type *)0x40020000)
#define GPIOB ((GPIO_Type *)0x40020400)

// 配置 PA5 为输出模式
void gpioa_init(void) {
    GPIOA->MODER &= ~(3 << 10);   // 清零 PA5 模式位
    GPIOA->MODER |= (1 << 10);    // 设置为通用输出模式
    GPIOA->OTYPER &= ~(1 << 5);   // 推挽输出
    GPIOA->OSPEEDR |= (3 << 10);  // 高速
    GPIOA->PUPDR &= ~(3 << 10);   // 无上拉下拉
}

// 设置 PA5 高电平
void led_on(void) {
    GPIOA->BSRR = (1 << 5);       // 通过 BSRR 原子置位
}

// 设置 PA5 低电平
void led_off(void) {
    GPIOA->BSRR = (1 << 21);      // 通过 BSRR 原子复位（高位）
}

// 读取 PB0 输入
uint32_t read_button(void) {
    return (GPIOB->IDR >> 0) & 1;
}
```

#### 5.1.2 MMIO 的 volatile 必要性

```c
// 错误：无 volatile
uint32_t *status = (uint32_t *)0x40008000;
while (*status & 0x01) { }
// 编译器可能优化为：
//   if (*status & 0x01) while (1) {}
// 死循环
```

```c
// 正确：volatile
volatile uint32_t *status = (volatile uint32_t *)0x40008000;
while (*status & 0x01) { }
// 编译器必须每次从 0x40008000 读取
```

### 5.2 场景二：信号处理函数

信号处理函数（signal handler）可能异步中断主程序，主程序中访问的变量可能被信号处理函数修改。

```c
#include <signal.h>
#include <stdio.h>

static volatile sig_atomic_t got_signal = 0;

void handler(int sig) {
    (void)sig;
    got_signal = 1;   // 信号处理函数中修改
}

int main(void) {
    signal(SIGINT, handler);

    while (!got_signal) {
        // 编译器不能缓存 got_signal，因为可能被 handler 修改
        // 必须每次从内存读取
    }

    printf("Received SIGINT\n");
    return 0;
}
```

#### 5.2.1 sig_atomic_t

`sig_atomic_t` 是 C 标准定义的"信号安全整数类型"，保证读写在硬件层面原子。结合 `volatile` 使用是信号处理的标准模式：

```c
volatile sig_atomic_t flag = 0;
```

- `volatile` 防止编译器优化
- `sig_atomic_t` 保证读写原子性

#### 5.2.2 信号处理函数的限制

信号处理函数中只能调用异步信号安全函数（async-signal-safe），如 `write`、`_exit`，不能调用 `printf`、`malloc`。访问的全局变量必须是 `volatile sig_atomic_t`。

### 5.3 场景三：setjmp/longjmp

`setjmp` 保存当前执行上下文，`longjmp` 跳转回 `setjmp` 处。在 setjmp 与 longjmp 之间修改的非 volatile 变量，其值未指定。

```c
#include <setjmp.h>
#include <stdio.h>

static jmp_buf buf;

void do_work(void) {
    longjmp(buf, 1);
}

int main(void) {
    volatile int val = 0;   // 必须 volatile

    if (setjmp(buf) == 0) {
        val = 42;
        do_work();
    } else {
        // longjmp 跳回此处
        // val 必须为 42，但若不加 volatile，可能为 0
        printf("val = %d\n", val);
    }

    return 0;
}
```

#### 5.3.1 为什么 setjmp/longjmp 需要 volatile

`setjmp` 保存寄存器状态。`longjmp` 恢复寄存器，导致 setjmp 之后修改的非 volatile 变量可能丢失（其值存在寄存器中，被 longjmp 覆盖回旧值）。`volatile` 强制变量存储在内存，避免此问题。

### 5.4 场景四：被外部修改的变量

变量可能被以下"外部"力量修改：

- 硬件设备（DMA、外设）
- 调试器
- 操作系统
- 其他进程（共享内存）

```c
// 共享内存示例
volatile int *shared = (volatile int *)mmap(...);

// 进程 A 写
*shared = 42;

// 进程 B 读
while (*shared != 42) { }
```

### 5.5 场景五：防止编译器删除"无用"代码

某些场景下，代码看似无用，实则用于触发硬件行为：

```c
// 写硬件寄存器，触发 DMA 传输
// 但写入的值"看起来"被丢弃
volatile uint32_t *dma_trigger = ...;
*dma_trigger = 1;   // 触发 DMA

// 若不加 volatile，编译器可能删除此行（"无用写入"）
```

### 5.6 场景六：内联汇编约束

GCC 内联汇编中使用 volatile 防止编译器删除或重排：

```c
// 内存屏障
static inline void memory_barrier(void) {
    asm volatile("" ::: "memory");
}

// 读取时间戳计数器
static inline uint64_t rdtsc(void) {
    uint32_t lo, hi;
    asm volatile("rdtsc" : "=a"(lo), "=d"(hi));
    return ((uint64_t)hi << 32) | lo;
}
```

`asm volatile` 告诉编译器：这段汇编有副作用，不可删除或重排。

## 6. volatile 与 atomic 的本质区别

这是 volatile 最常被误解的领域。许多程序员认为 `volatile` 提供原子性，因此可用于多线程同步。**这是错误的**。

### 6.1 三个维度的差异

| 维度 | volatile | atomic（C11） |
|------|----------|---------------|
| 原子性（atomicity） | 不保证 | 保证 |
| 可见性（visibility） | 不保证 | 保证 |
| 有序性（ordering） | 不保证 | 保证 |

#### 6.1.1 原子性

`volatile int x; x++;` 在某些平台上可能被编译为"读-改-写"三条指令，期间可能被其他线程插入操作，导致数据竞争。

```c
// 非原子操作示例
volatile int counter = 0;

// 线程 A 与 B 同时执行
void increment(void) {
    counter++;   // 可能被编译为：
                 //   load counter, r0
                 //   add r0, #1
                 //   store r0, counter
                 // 若线程 A 在 load 后、store 前被抢占，B 也 load 旧值，
                 // 最终 counter 只增加 1 而非 2
}
```

```c
// 原子操作
#include <stdatomic.h>
atomic_int counter = 0;

void increment(void) {
    atomic_fetch_add(&counter, 1);   // 硬件级原子指令
}
```

#### 6.1.2 可见性

`volatile` 不保证写入对其他 CPU 核可见。现代多核 CPU 有多级缓存（L1/L2/L3），一个核的写入可能停留在自己的缓存中，其他核看不到。

```c
volatile int ready = 0;
int data = 0;

// 线程 A
data = 42;
ready = 1;   // volatile，但不保证 data 写入对其他核可见

// 线程 B
while (!ready) { }
use(data);   // 可能看到 ready == 1 但 data == 0
```

`atomic` 配合内存屏障保证可见性：

```c
#include <stdatomic.h>
atomic_int ready = 0;
int data = 0;

// 线程 A
data = 42;
atomic_store_explicit(&ready, 1, memory_order_release);
// release 屏障：data 的写入对其他核可见后，ready 的写入才可见

// 线程 B
while (!atomic_load_explicit(&ready, memory_order_acquire)) { }
use(data);   // 看到 ready == 1 后，必然看到 data == 42
```

#### 6.1.3 有序性

CPU 可能重排指令以提高流水线效率。`volatile` 限制编译器重排，但**不限制 CPU 重排**。

```c
volatile int a, b;
int x, y;

// 线程 A
a = 1;       // volatile，编译器不重排
x = 2;       // 非 volatile，编译器可能重排
b = 3;       // volatile
// CPU 可能实际执行顺序：a=1, b=3, x=2
```

`atomic` 配合内存屏障限制 CPU 重排：

```c
atomic_store_explicit(&a, 1, memory_order_seq_cst);   // 全序
atomic_store_explicit(&b, 3, memory_order_seq_cst);   // 必然在 a 之后
```

### 6.2 经典反例：双重检查锁定（DCLP）

```c
// 错误的双重检查锁定
static volatile SomeType *instance = NULL;

SomeType *get_instance(void) {
    if (instance == NULL) {              // 第一次检查（无锁）
        lock();
        if (instance == NULL) {          // 第二次检查（加锁）
            instance = new_object();     // 构造对象
        }
        unlock();
    }
    return instance;
}
```

DCLP 在 C03 与 C++03 时代是著名反模式，因为：

1. `instance = new_object()` 可能被重排为"先分配内存赋值给 instance，再调用构造函数"
2. 其他线程看到 `instance != NULL` 后直接使用，但对象可能未构造完成
3. volatile 无法阻止这种重排

C11 起的正确写法：

```c
#include <stdatomic.h>
static _Atomic(SomeType *) instance = NULL;

SomeType *get_instance(void) {
    SomeType *p = atomic_load_explicit(&instance, memory_order_acquire);
    if (p == NULL) {
        lock();
        p = atomic_load_explicit(&instance, memory_order_relaxed);
        if (p == NULL) {
            p = new_object();
            atomic_store_explicit(&instance, p, memory_order_release);
        }
        unlock();
    }
    return p;
}
```

或更简单地，使用 `call_once`：

```c
#include <threads.h>
static once_flag init_flag = ONCE_FLAG_INIT;
static SomeType *instance = NULL;

static void init(void) {
    instance = new_object();
}

SomeType *get_instance(void) {
    call_once(&init_flag, init);
    return instance;
}
```

### 6.3 volatile 何时仍可用于多线程？

虽然 volatile 不提供原子性/可见性/有序性，但在以下特定场景仍可用：

1. **单核系统**：无多核缓存问题，volatile 配合关中断可保证原子性
2. **特定平台扩展**：MSVC 的 `_InterlockedExchange` 等内建函数结合 volatile 可用于 x86
3. **信号处理函数**：`volatile sig_atomic_t` 仍是标准做法
4. **Linux 内核**：使用 `READ_ONCE`/`WRITE_ONCE` 封装（见 §10）

但跨平台、跨编译器的多线程代码应使用 C11 `<stdatomic.h>` 或 C++ `std::atomic`。

## 7. 内存屏障与 CPU 重排

### 7.1 CPU 缓存层次

```
       CPU 0           CPU 1
      ┌─────┐         ┌─────┐
      │ L1  │         │ L1  │    L1: ~1ns
      ├─────┤         ├─────┤
      │ L2  │         │ L2  │    L2: ~3ns
      └──┬──┘         └──┬──┘
         │               │
      ┌──┴───────────────┴──┐
      │         L3          │         L3: ~10ns
      └──────────┬──────────┘
                 │
      ┌──────────┴──────────┐
      │       Memory         │        Memory: ~100ns
      └─────────────────────┘
```

CPU 写入先到 L1，稍后通过缓存一致性协议（如 MESI）传播到 L2/L3/其他核。

### 7.2 CPU 指令重排

CPU 为提高流水线效率，可能重排指令：

| CPU | 重排类型 | 说明 |
|-----|----------|------|
| x86/x64 | 弱重排 | 仅 store-load 可能重排 |
| ARM | 强重排 | load-load、load-store、store-load、store-store 都可能重排 |
| POWER | 强重排 | 类似 ARM |

```c
// ARM 上可能重排
data = 42;
ready = 1;
// 实际执行顺序可能是 ready=1, data=42
```

### 7.3 内存屏障类型

| 屏障类型 | 作用 | C11 对应 |
|----------|------|----------|
| Load Barrier（读屏障） | 之后的读不重排到之前 | memory_order_acquire |
| Store Barrier（写屏障） | 之后的写不重排到之前 | memory_order_release |
| Full Barrier（全屏障） | 读/写都不重排 | memory_order_seq_cst |
| Data Dependency Barrier | 仅 POWER/Alpha 需要 | memory_order_consume |

### 7.4 GCC/Clang 内联屏障

```c
// 编译器屏障：阻止编译器重排，但不阻止 CPU 重排
asm volatile("" ::: "memory");

// CPU 屏障（x86）
asm volatile("mfence" ::: "memory");

// CPU 屏障（ARM）
asm volatile("dmb ish" ::: "memory");

// GCC 内建
__sync_synchronize();   // 全屏障
__atomic_thread_fence(__ATOMIC_SEQ_CST);
```

### 7.5 Linux 内核的 smp_mb/smp_rmb/smp_wmb

```c
// 全屏障
smp_mb();

// 读屏障
smp_rmb();

// 写屏障
smp_wmb();

// 使用示例
data = 42;
smp_wmb();              // 保证 data 写入对其他核可见后
ready = 1;              // ready 才可见
```

## 8. C11 stdatomic.h 详解

### 8.1 原子类型

```c
#include <stdatomic.h>

atomic_int x;                    // 等价于 _Atomic int
atomic_uint y;
atomic_flag lock;                // 最简单的原子类型
_Atomic(long) z;                 // _Atomic 限定符
```

### 8.2 原子操作

```c
atomic_int x = 0;

// 加载
int v = atomic_load(&x);
int v = atomic_load_explicit(&x, memory_order_acquire);

// 存储
atomic_store(&x, 42);
atomic_store_explicit(&x, 42, memory_order_release);

// 交换
int old = atomic_exchange(&x, 99);
int old;
bool success = atomic_compare_exchange_strong(&x, &old, 99);

// 算术运算（仅整数类型）
atomic_fetch_add(&x, 1);
atomic_fetch_sub(&x, 1);
atomic_fetch_or(&x, 0xFF);
atomic_fetch_and(&x, 0xFF);
atomic_fetch_xor(&x, 0xFF);

// 标志位（最轻量）
atomic_flag f = ATOMIC_FLAG_INIT;
bool old = atomic_flag_test_and_set(&f);
atomic_flag_clear(&f);
```

### 8.3 内存顺序

```c
typedef enum {
    memory_order_relaxed,       // 无同步，仅原子
    memory_order_consume,       // 数据依赖（少用）
    memory_order_acquire,       // 读屏障
    memory_order_release,       // 写屏障
    memory_order_acq_rel,       // 读写屏障（用于 RMW）
    memory_order_seq_cst,       // 全序（最强，默认）
} memory_order;
```

### 8.4 内存顺序选择

```c
// 场景 1：计数器，不关心顺序
atomic_fetch_add_explicit(&counter, 1, memory_order_relaxed);

// 场景 2：发布-订阅
data = 42;
atomic_store_explicit(&ready, true, memory_order_release);   // 发布

while (!atomic_load_explicit(&ready, memory_order_acquire)) { }   // 订阅
use(data);

// 场景 3：自旋锁
atomic_flag lock = ATOMIC_FLAG_INIT;
while (atomic_flag_test_and_set_explicit(&lock, memory_order_acquire)) { }
// 临界区
atomic_flag_clear_explicit(&lock, memory_order_release);

// 场景 4：全局同步
atomic_store_explicit(&done, true, memory_order_seq_cst);
```

### 8.5 atomic 与 volatile 的关系

| 特性 | volatile | atomic |
|------|----------|--------|
| 标准定义 | C89 起 | C11 起 |
| 原子性 | 否 | 是 |
| 可见性 | 否 | 是 |
| 有序性 | 部分（编译器级） | 是（CPU 级） |
| 多线程安全 | 否 | 是 |
| 性能 | 最快 | 较快（取决于内存顺序） |
| 用途 | MMIO、信号、setjmp | 多线程同步 |

## 9. volatile 的常见陷阱

### 9.1 陷阱一：volatile 不保证原子性

```c
volatile uint64_t counter = 0;

// 线程 A 与 B 同时执行
void inc(void) {
    counter++;   // 64 位操作在 32 位平台上是两条指令，可能被中断
}
```

### 9.2 陷阱二：volatile 不保证多核可见性

```c
volatile int ready = 0;

// 线程 A
ready = 1;

// 线程 B
while (!ready) { }   // 可能永远等不到
```

### 9.3 陷阱三：volatile 不保证顺序

```c
volatile int a, b;
a = 1;
b = 2;   // CPU 可能先执行 b=2 再执行 a=1
```

### 9.4 陷阱四：volatile 数组的元素访问

```c
volatile int arr[10];
arr[5] = 42;   // 正确：每次访问都是 volatile

int *p = (int *)arr;   // 错误：丢失 volatile 限定
*p = 42;   // 编译器可能优化
```

正确做法：

```c
volatile int *p = arr;
*p = 42;
```

### 9.5 陷阱五：volatile 结构体的成员

```c
struct Data {
    volatile int x;
    int y;
};

struct Data d;
d.x = 1;   // volatile 访问
d.y = 2;   // 非 volatile，可能被优化

// 整体结构体 volatile
volatile struct Data d2;
d2.x = 1;   // volatile
d2.y = 2;   // volatile
```

### 9.6 陷阱六：volatile 与 const_cast（C++）

```cpp
volatile int x = 0;
int *p = const_cast<int *>(&x);   // C++ 去除 volatile，未定义行为
*p = 42;
```

### 9.7 陷阱七：volatile 函数返回值

```c
volatile int get_value(void) {   // 返回值是 volatile int
    return 42;
}
// 几乎无意义：返回值是临时对象，立即被丢弃
```

C++20 弃用了这种用法。

### 9.8 陷阱八：volatile 复合赋值

```c
volatile int x = 0;
x += 1;   // 等价于 x = x + 1
// 包含读-改-写，非原子
// C++20 弃用了 volatile 的复合赋值
```

### 9.9 陷阱九：volatile 与位域

```c
struct Flags {
    volatile unsigned a : 1;
    volatile unsigned b : 7;
};

struct Flags f;
f.a = 1;   // 读-改-写整个字节，非原子
```

位域的 volatile 访问仍是非原子的，因为 CPU 无法只访问单个位。

### 9.10 陷阱十：volatile 不是同步原语

最根本的陷阱：将 volatile 误用为同步原语。任何依赖 volatile 实现多线程同步的代码都是错误的（特定平台特定编译器的扩展除外）。

## 10. Linux 内核的 volatile 实践

Linux 内核对 volatile 的使用极为谨慎，甚至有"不要用 volatile"的著名警告（Documentation/process/volatile-considered-harmful.rst）。

### 10.1 内核的 volatile 禁忌

Linus Torvalds 在邮件列表中多次强调：

> Volatile is evil. The use of volatile in the kernel is almost always a bug.

内核认为 volatile：
- 隐藏了真正的同步问题
- 鼓励错误的"用 volatile 解决并发"思维
- 性能损失（强制内存访问）
- 应使用屏障、原子操作、锁等显式机制

### 10.2 READ_ONCE / WRITE_ONCE

内核提供宏替代直接 volatile 访问：

```c
// 等价于 volatile 读
int x = READ_ONCE(shared_var);

// 等价于 volatile 写
WRITE_ONCE(shared_var, 42);

// 实现原理（简化）
#define READ_ONCE(x) (*(volatile typeof(x) *)&(x))
#define WRITE_ONCE(x, v) (*(volatile typeof(x) *)&(x) = (v))
```

这种写法的好处：

1. 显式标记"此处需要 volatile 语义"
2. 易于 grep 搜索
3. 避免变量声明为 volatile 导致所有访问都强制内存访问

### 10.3 ACCESS_ONCE（旧版）

早期内核使用 `ACCESS_ONCE`，4.15 起拆分为 `READ_ONCE` 与 `WRITE_ONCE`。

### 10.4 内核的内存屏障

```c
#include <asm/barrier.h>

// 全屏障
smp_mb();

// 读屏障
smp_rmb();

// 写屏障
smp_wmb();

// 使用示例
data = 42;
smp_wmb();
WRITE_ONCE(ready, 1);

// 另一线程
while (READ_ONCE(ready) != 1) { }
smp_rmb();
use(data);   // 必然看到 data == 42
```

### 10.5 内核的原子变量

```c
#include <linux/atomic.h>

atomic_t counter = ATOMIC_INIT(0);

atomic_inc(&counter);
int v = atomic_read(&counter);
atomic_set(&counter, 100);
```

内核的 `atomic_t` 比 C11 `atomic_int` 更早出现，但语义类似。

### 10.6 内核中允许的 volatile 使用

少数场景仍允许 volatile：

1. 与硬件寄存器交互（`__raw_readl`、`__raw_writel`）
2. `jiffies` 全局变量（时钟计数）
3. 特定架构的 `asm volatile` 内联汇编

## 11. 嵌入式系统的 volatile 实践

### 11.1 寄存器定义

嵌入式开发中，volatile 是与硬件交互的基础：

```c
// STM32 HAL 风格
typedef struct {
    __IO uint32_t CR;       // __IO 即 volatile
    __IO uint32_t CFGR;
    __IO uint32_t CIR;
    // ...
} RCC_TypeDef;

#define RCC ((RCC_TypeDef *)0x40023800)

// 启用 GPIOA 时钟
RCC->AHB1ENR |= (1 << 0);
```

`__IO` 在 STM32 头文件中定义为 `volatile`：

```c
#define __IO volatile
#define __I volatile const
#define __O volatile
#define __A volatile const
```

### 11.2 位带操作（Bit-Banding）

ARM Cortex-M 的位带区允许原子访问单个位：

```c
// 位带别名区地址计算
#define BITBAND(addr, bit) ((volatile uint32_t *)(((uint32_t)(addr) & 0xF0000000) + 0x02000000 + (((uint32_t)(addr) & 0xFFFFF) << 5) + ((bit) << 2)))

// PA5 的位带别名
#define PA5_OUT BITBAND(0x40020014, 5)

*PA5_OUT = 1;   // 原子置位 PA5
```

### 11.3 中断服务例程（ISR）

ISR 与主程序共享的变量必须 volatile：

```c
volatile uint32_t tick = 0;

// SysTick 中断
void SysTick_Handler(void) {
    tick++;
}

// 主程序
void delay_ms(uint32_t ms) {
    uint32_t start = tick;
    while ((tick - start) < ms) { }
}
```

### 11.4 DMA 缓冲区

DMA 直接访问内存，CPU 与 DMA 共享的缓冲区需要 volatile 或缓存一致性维护：

```c
// 简单方案：volatile
volatile uint8_t dma_buffer[1024];

// 复杂方案：缓存维护（ARM）
//   1. 配置 DMA 前清缓存
//   2. DMA 完成后失效缓存
//   3. CPU 重新读内存
SCB_CleanDCache_by_Addr((uint32_t *)dma_buffer, sizeof(dma_buffer));
// 启动 DMA
// ...
// DMA 完成
SCB_InvalidateDCache_by_Addr((uint32_t *)dma_buffer, sizeof(dma_buffer));
```

### 11.5 RTOS 中的 volatile

FreeRTOS 等实时操作系统也广泛使用 volatile：

```c
// FreeRTOS 任务控制块
typedef struct tskTaskControlBlock {
    volatile StackType_t *pxTopOfStack;   // 栈顶，volatile
    ListItem_t xStateListItem;
    // ...
} TCB_t;
```

## 12. C++20 volatile 的变化

### 12.1 P1152R4 提案

C++20（ISO/IEC 14882:2020）通过 P1152R4 提案弃用了 volatile 的部分操作：

### 12.2 弃用的操作

```cpp
// C++20 弃用的 volatile 操作
volatile int x = 0;

x++;                    // 弃用：volatile 的自增
x--;                    // 弃用：volatile 的自减
x += 1;                 // 弃用：复合赋值
x -= 1;                 // 弃用
x *= 2;                 // 弃用
x /= 2;                 // 弃用
x <<= 1;                // 弃用
x >>= 1;                // 弃用
x &= 0xFF;              // 弃用
x |= 0xFF;              // 弃用
x ^= 0xFF;              // 弃用

volatile int *p = &x;
p++;                    // 弃用：volatile 指针的自增

volatile int f();       // 弃用：volatile 返回值

struct S { int a; };
volatile S s;
s.a;                    // 弃用：volatile 对象的成员访问（部分场景）
```

### 12.3 未弃用的操作

```cpp
volatile int x = 0;

x = 1;                  // 未弃用：简单赋值
int v = x;              // 未弃用：简单读取
(void)x;                // 未弃用：丢弃读取

volatile int *p = &x;
int v = *p;             // 未弃用
*p = 1;                 // 未弃用
```

### 12.4 弃用的原因

1. **复杂语义**：volatile 的复合赋值等操作语义不直观
2. **多线程误用**：鼓励错误的并发思维
3. **C++ 标准库冲突**：`std::atomic` 提供更清晰的语义
4. **跨平台不一致**：不同编译器对 volatile 复合操作的处理不同

### 12.5 C++23/C++26 的进一步动作

C++23 进一步强化弃用警告，C++26 可能完全移除某些 volatile 操作。建议 C++ 代码：

- 使用 `std::atomic` 处理多线程
- 仅在 MMIO 场景使用 volatile，且只用简单读/写

## 13. 综合实战示例

### 13.1 完整的 GPIO 驱动

```c
// gpio_driver.h
#pragma once
#include <stdint.h>

typedef enum {
    GPIO_MODE_INPUT = 0,
    GPIO_MODE_OUTPUT,
    GPIO_MODE_ALTERNATE,
    GPIO_MODE_ANALOG,
} GpioMode;

typedef enum {
    GPIO_PULL_NONE = 0,
    GPIO_PULL_UP,
    GPIO_PULL_DOWN,
} GpioPull;

typedef struct GpioPin {
    volatile uint32_t *port;
    uint8_t pin;
} GpioPin;

void gpio_init(const GpioPin *g, GpioMode mode, GpioPull pull);
void gpio_set(const GpioPin *g, int value);
int gpio_read(const GpioPin *g);
void gpio_toggle(const GpioPin *g);

// 平台相关：由具体平台实现
extern volatile uint32_t *gpio_port_base(int port);
```

```c
// gpio_driver.c
#include "gpio_driver.h"

#define MODER_OFFSET  0x00
#define OTYPER_OFFSET 0x04
#define OSPEEDR_OFFSET 0x08
#define PUPDR_OFFSET  0x0C
#define IDR_OFFSET    0x10
#define ODR_OFFSET    0x14
#define BSRR_OFFSET   0x18

void gpio_init(const GpioPin *g, GpioMode mode, GpioPull pull) {
    volatile uint32_t *base = g->port;
    uint8_t pin = g->pin;

    // 配置模式
    base[MODER_OFFSET / 4] &= ~(3 << (pin * 2));
    base[MODER_OFFSET / 4] |= (mode << (pin * 2));

    // 配置上拉下拉
    base[PUPDR_OFFSET / 4] &= ~(3 << (pin * 2));
    base[PUPDR_OFFSET / 4] |= (pull << (pin * 2));
}

void gpio_set(const GpioPin *g, int value) {
    volatile uint32_t *base = g->port;
    uint8_t pin = g->pin;

    if (value) {
        base[BSRR_OFFSET / 4] = (1 << pin);          // 置位
    } else {
        base[BSRR_OFFSET / 4] = (1 << (pin + 16));   // 复位
    }
}

int gpio_read(const GpioPin *g) {
    volatile uint32_t *base = g->port;
    uint8_t pin = g->pin;

    return (base[IDR_OFFSET / 4] >> pin) & 1;
}

void gpio_toggle(const GpioPin *g) {
    volatile uint32_t *base = g->port;
    uint8_t pin = g->pin;

    int v = gpio_read(g);
    gpio_set(g, !v);
}
```

### 13.2 信号驱动的程序

```c
#include <stdio.h>
#include <signal.h>
#include <unistd.h>
#include <stdlib.h>

static volatile sig_atomic_t stop = 0;
static volatile sig_atomic_t usr1_count = 0;

void handler_sigterm(int sig) {
    (void)sig;
    stop = 1;
}

void handler_sigusr1(int sig) {
    (void)sig;
    usr1_count++;
}

int main(void) {
    struct sigaction sa = {0};
    sa.sa_handler = handler_sigterm;
    sigaction(SIGTERM, &sa, NULL);

    sa.sa_handler = handler_sigusr1;
    sigaction(SIGUSR1, &sa, NULL);

    printf("PID = %d\n", getpid());
    printf("Send SIGUSR1 to count, SIGTERM to exit\n");

    while (!stop) {
        pause();   // 等待信号
    }

    printf("Received %d SIGUSR1 signals\n", usr1_count);
    return 0;
}
```

### 13.3 自旋锁（无原子操作，仅演示）

```c
// 注意：这是简化示例，生产代码应使用 C11 stdatomic
#include <stdatomic.h>

typedef struct {
    atomic_flag locked;
} SpinLock;

void spinlock_init(SpinLock *l) {
    atomic_flag_clear(&l->locked);
}

void spinlock_lock(SpinLock *l) {
    while (atomic_flag_test_and_set_explicit(&l->locked, memory_order_acquire)) {
        // 自旋等待
    }
}

void spinlock_unlock(SpinLock *l) {
    atomic_flag_clear_explicit(&l->locked, memory_order_release);
}

// 使用
SpinLock lock;
int shared_data = 0;

void thread_safe_increment(void) {
    spinlock_lock(&lock);
    shared_data++;
    spinlock_unlock(&lock);
}
```

### 13.4 Linux 内核风格的状态机

```c
#include <stdatomic.h>
#include <stdbool.h>

typedef enum {
    STATE_IDLE,
    STATE_RUNNING,
    STATE_STOPPING,
    STATE_ERROR,
} State;

static _Atomic State state = STATE_IDLE;
static int data = 0;

void start(void) {
    data = 42;
    atomic_store_explicit(&state, STATE_RUNNING, memory_order_release);
}

void stop(void) {
    atomic_store_explicit(&state, STATE_STOPPING, memory_order_release);
}

void loop(void) {
    State s = atomic_load_explicit(&state, memory_order_acquire);
    switch (s) {
        case STATE_IDLE:
            // 等待启动
            break;
        case STATE_RUNNING:
            // 使用 data（必然看到 data == 42）
            use(data);
            break;
        case STATE_STOPPING:
            // 清理
            atomic_store_explicit(&state, STATE_IDLE, memory_order_release);
            break;
        default:
            break;
    }
}
```

## 14. 跨语言对比

### 14.1 C++ 的 volatile

C++ 的 volatile 与 C 几乎相同，但 C++20 弃用了部分操作（见 §12）。

```cpp
// C++ 推荐使用 std::atomic
#include <atomic>
std::atomic<int> counter{0};
counter.fetch_add(1, std::memory_order_relaxed);
```

### 14.2 Java 的 volatile

Java 的 volatile 语义比 C 强：

- 保证可见性（CPU 屏障）
- 保证有序性（禁止重排）
- 64 位类型的原子性
- **不保证**复合操作（如 `++`）的原子性

```java
volatile boolean ready = false;
int data = 0;

// 线程 A
data = 42;
ready = true;   // volatile 写，插入 store-store 屏障

// 线程 B
while (!ready) { }   // volatile 读，插入 load-load 屏障
// 必然看到 data == 42
```

Java volatile 接近 C11 的 `memory_order_acquire/release`。

### 14.3 C# 的 volatile

C# 的 `volatile` 关键字类似 Java，保证可见性与有序性：

```csharp
class Foo {
    volatile bool ready = false;
    int data = 0;

    void Producer() {
        data = 42;
        ready = true;
    }

    void Consumer() {
        while (!ready) { }
        Console.WriteLine(data);   // 必然看到 42
    }
}
```

### 14.4 Rust 的原子类型

Rust 没有 `volatile` 关键字，使用 `std::sync::atomic`：

```rust
use std::sync::atomic::{AtomicBool, Ordering};

static READY: AtomicBool = AtomicBool::new(false);
static mut DATA: i32 = 0;

// 线程 A
unsafe { DATA = 42; }
READY.store(true, Ordering::Release);

// 线程 B
while !READY.load(Ordering::Acquire) {}
unsafe { println!("{}", DATA); }   // 必然看到 42
```

Rust 的 `volatile` 通过 `std::ptr::read_volatile`/`write_volatile` 函数实现，用于 MMIO。

### 14.5 对比表

| 语言 | volatile 保证 | 推荐替代 |
|------|---------------|----------|
| C | 仅优化抑制 | C11 stdatomic |
| C++ | 仅优化抑制（C++20 弃用部分） | std::atomic |
| Java | 可见性、有序性、64 位原子性 | synchronized、Atomic* |
| C# | 可见性、有序性 | Interlocked、lock |
| Rust | 无 volatile 关键字 | std::sync::atomic |

## 15. 常见陷阱与反模式

### 15.1 反模式一：用 volatile 做多线程同步

```c
// 错误
volatile int ready = 0;

// 线程 A
data = 42;
ready = 1;

// 线程 B
while (!ready) { }
use(data);   // 可能 data == 0
```

正确做法见 §6.2。

### 15.2 反模式二：volatile 数组的指针转换

```c
volatile int arr[10];
int *p = (int *)arr;   // 丢失 volatile
*p = 1;                // 编译器可能优化
```

正确：

```c
volatile int *p = arr;
*p = 1;
```

### 15.3 反模式三：volatile 结构体指针

```c
struct Device {
    uint32_t reg1;
    uint32_t reg2;
};

volatile struct Device *dev = ...;
dev->reg1 = 1;   // volatile 访问

uint32_t *p = &dev->reg1;   // 错误：丢失 volatile
*p = 2;
```

正确：

```c
volatile uint32_t *p = &dev->reg1;
*p = 2;
```

### 15.4 反模式四：过度使用 volatile

```c
// 错误：将所有全局变量都加 volatile
volatile int g_count;
volatile int g_state;
volatile int g_flag;
```

volatile 不是"万能同步器"，过度使用会：

1. 性能损失
2. 隐藏真实问题
3. 代码难以维护

应根据场景选择：

- 多线程：用 atomic 或锁
- 信号：用 `volatile sig_atomic_t`
- MMIO：用 volatile
- 其他：通常不需要

### 15.5 反模式五：volatile 替代锁

```c
// 错误：volatile 不是锁
volatile int balance = 100;

void transfer(int amount) {
    balance -= amount;   // 非原子，可能数据竞争
}
```

正确：

```c
#include <stdatomic.h>
atomic_int balance = 100;

void transfer(int amount) {
    atomic_fetch_sub(&balance, amount);
}
```

### 15.6 反模式六：volatile 解决缓存一致性问题

```c
// 错误：volatile 不保证 CPU 缓存一致性
volatile int shared_data;

// 线程 A 写
shared_data = 42;

// 线程 B 读
int x = shared_data;   // 可能读到旧值
```

正确做法是使用 `atomic` 或显式内存屏障。

## 16. 综合习题

### 习题 1（填空题）

C 标准 §5.1.2.3 将对 volatile 对象的访问定义为____，属于程序的____，编译器必须严格按照抽象机语义执行，不得优化。

**答案**：副作用；可观察行为

**解析**：volatile 访问是 C 标准定义的副作用之一（§5.1.2.3），属于可观察行为，as-if 规则要求编译器保留可观察行为。

### 习题 2（选择题）

下列哪种场景**必须**使用 volatile？

A. 多线程共享的全局计数器
B. 信号处理函数修改的标志位
C. 单线程程序中的局部变量
D. C++ 标准库的智能指针

**答案**：B

**解析**：信号处理函数异步中断主程序，被修改的变量必须 `volatile sig_atomic_t`。A 应用 atomic，C 无需 volatile，D 与 volatile 无关。

### 习题 3（选择题）

关于 volatile 与 atomic 的区别，下列说法**错误**的是：

A. volatile 不保证原子性，atomic 保证
B. volatile 不保证多核可见性，atomic 保证
C. volatile 限制编译器重排，atomic 限制编译器与 CPU 重排
D. C11 stdatomic 与 volatile 语义等价

**答案**：D

**解析**：C11 stdatomic 与 volatile 语义完全不同。atomic 提供原子性、可见性、有序性；volatile 仅抑制编译器优化。

### 习题 4（代码修正题）

```c
#include <signal.h>
#include <stdio.h>

static int flag = 0;   // 缺少 volatile

void handler(int sig) {
    flag = 1;
}

int main(void) {
    signal(SIGINT, handler);
    while (!flag) { }   // 可能死循环
    printf("Done\n");
    return 0;
}
```

**问题**：上述代码可能死循环，原因是什么？如何修正？

**问题原因**：`flag` 未加 volatile，编译器可能将其缓存到寄存器，循环中只读寄存器，看不到信号处理函数的修改。

**修正**：

```c
static volatile sig_atomic_t flag = 0;
```

### 习题 5（代码修正题）

```c
// 多线程代码（错误）
volatile int ready = 0;
int data = 0;

// 线程 A
void producer(void) {
    data = 42;
    ready = 1;
}

// 线程 B
void consumer(void) {
    while (!ready) { }
    use(data);   // 可能读到 data == 0
}
```

**问题**：(1) volatile 不保证 `data = 42` 与 `ready = 1` 的顺序，CPU 可能重排；(2) volatile 不保证 `ready` 写入对其他核可见。

**修正**：

```c
#include <stdatomic.h>

static _Atomic int ready = 0;
static int data = 0;

void producer(void) {
    data = 42;
    atomic_store_explicit(&ready, 1, memory_order_release);
}

void consumer(void) {
    while (!atomic_load_explicit(&ready, memory_order_acquire)) { }
    use(data);   // 必然看到 data == 42
}
```

### 习题 6（开放性问题）

讨论在以下场景中，应使用 volatile、atomic 还是其他机制：

(1) 嵌入式系统读取硬件 ADC 寄存器；
(2) 多线程生产者-消费者的就绪标志；
(3) 信号处理函数中的停止标志；
(4) setjmp/longjmp 间修改的变量；
(5) DMA 双缓冲的缓冲区；
(6) 全局配置只读变量；
(7) 多线程计数器。

**参考答案**：

| 场景 | 推荐机制 | 原因 |
|------|----------|------|
| (1) ADC 寄存器 | volatile | 硬件可能随时修改寄存器值 |
| (2) 就绪标志 | atomic（release/acquire） | 多线程同步需原子性与可见性 |
| (3) 信号停止标志 | volatile sig_atomic_t | 标准要求，跨信号安全 |
| (4) setjmp/longjmp | volatile | 防止寄存器缓存导致值丢失 |
| (5) DMA 缓冲区 | volatile 或缓存维护 | DMA 直接访问内存，CPU 缓存可能不一致 |
| (6) 配置只读变量 | const（无需 volatile） | 初始化后不变 |
| (7) 多线程计数器 | atomic_fetch_add | 原子算术操作 |

### 习题 7（开放性问题）

阅读以下 Linux 内核代码片段，分析为什么使用 READ_ONCE/WRITE_ONCE 而非直接 volatile：

```c
// 简化自内核代码
struct worker {
    int status;
    // ...
};

void worker_loop(struct worker *w) {
    while (READ_ONCE(w->status) != EXIT) {
        do_work(w);
    }
}

void stop_worker(struct worker *w) {
    WRITE_ONCE(w->status, EXIT);
}
```

**参考答案**：

1. **显式标记**：READ_ONCE/WRITE_ONCE 显式表达"此处需要 volatile 语义"，比直接将 `status` 声明为 volatile 更清晰。
2. **局部化**：仅特定访问需要 volatile 语义，其他访问可正常优化。若整个变量 volatile，所有访问都强制内存访问，性能损失。
3. **可搜索性**：READ_ONCE/WRITE_ONCE 易于 grep 搜索，便于审计。
4. **可移植性**：宏屏蔽了不同编译器的差异。
5. **配合屏障**：内核可结合 smp_mb() 等屏障，构建正确的同步语义。
6. **遵循内核规范**：Linus 反对滥用 volatile，提倡显式同步。

### 习题 8（综合题）

设计一个简单的环形缓冲区，要求：

(1) 单生产者单消费者；
(2) 无锁（不使用 mutex）；
(3) 跨平台；
(4) 正确处理内存序。

请给出数据结构、push/pop 函数实现，并说明内存序选择的理由。

**参考答案**：

```c
#include <stdatomic.h>
#include <stdbool.h>
#include <stddef.h>

#define BUF_SIZE 1024

typedef struct {
    int data[BUF_SIZE];
    _Atomic size_t head;   // 生产者写
    _Atomic size_t tail;   // 消费者写
} RingBuffer;

void rb_init(RingBuffer *rb) {
    atomic_store_explicit(&rb->head, 0, memory_order_relaxed);
    atomic_store_explicit(&rb->tail, 0, memory_order_relaxed);
}

bool rb_push(RingBuffer *rb, int value) {
    size_t head = atomic_load_explicit(&rb->head, memory_order_relaxed);
    size_t next_head = (head + 1) % BUF_SIZE;

    // 检查是否满
    if (next_head == atomic_load_explicit(&rb->tail, memory_order_acquire)) {
        return false;   // 满
    }

    rb->data[head] = value;

    // release：保证 data 写入对消费者可见后，head 才更新
    atomic_store_explicit(&rb->head, next_head, memory_order_release);
    return true;
}

bool rb_pop(RingBuffer *rb, int *value) {
    size_t tail = atomic_load_explicit(&rb->tail, memory_order_relaxed);

    // 检查是否空
    if (tail == atomic_load_explicit(&rb->head, memory_order_acquire)) {
        return false;   // 空
    }

    *value = rb->data[tail];

    // release：保证 data 读取完成后，tail 才更新
    atomic_store_explicit(&rb->tail, (tail + 1) % BUF_SIZE, memory_order_release);
    return true;
}
```

**内存序选择理由**：

- `head` 与 `tail` 的更新用 release，保证之前的 data 操作对另一端可见。
- `head` 与 `tail` 的检查用 acquire，保证看到对方的更新后，必然看到对方的 data 操作。
- 这构成了经典的 release-acquire 同步模式，无需 seq_cst 的全序开销。

### 习题 9（综合题）

分析以下代码在 x86 与 ARM 平台上的行为差异：

```c
volatile int x = 0, y = 0;
int r1, r2;

// 线程 1        // 线程 2
x = 1;           y = 1;
r1 = y;          r2 = x;
```

是否存在 r1 == 0 且 r2 == 0 的可能？为什么？

**参考答案**：

- **x86**：不可能。x86 是 TSO（Total Store Order）模型，store-store 与 load-load 不重排，store-load 可能重排但不会出现 r1=r2=0。
- **ARM**：可能。ARM 是弱内存模型，load-load 可能重排，线程 1 的 `r1 = y` 可能先于 `x = 1` 执行，线程 2 同理，导致 r1 = r2 = 0。

要避免此问题，需使用 atomic 配合 seq_cst：

```c
atomic_store_explicit(&x, 1, memory_order_seq_cst);
r1 = atomic_load_explicit(&y, memory_order_seq_cst);
```

### 习题 10（开放性问题）

讨论现代 C 程序中 volatile 的合理使用边界，包括：

(1) 应使用 volatile 的场景；
(2) 不应使用 volatile 的场景；
(3) C11 引入 stdatomic 后，volatile 的地位变化；
(4) C++20 弃用部分 volatile 操作的影响；
(5) 未来 C2y 可能的演进方向。

**参考答案**：

(1) **应使用**：MMIO、信号处理、setjmp/longjmp、防止编译器删除"无用"代码、内联汇编约束。

(2) **不应使用**：多线程同步、原子操作、内存可见性、缓存一致性。

(3) **C11 后地位变化**：stdatomic 提供了真正的多线程同步原语，volatile 在多线程领域的角色被取代。volatile 回归其本职：抑制编译器优化，用于"非编译器可见的修改"场景。

(4) **C++20 影响**：进一步明确 volatile 的语义边界，限制其用于真正的 MMIO 场景。C 也会跟进类似演进。

(5) **C2y 方向**：可能引入模块化、更强的类型系统，volatile 的语义可能进一步收紧。未来 C 程序员应：

- 多线程：使用 stdatomic 或 pthread mutex
- 硬件交互：使用 volatile
- 信号：使用 volatile sig_atomic_t
- 其他：通常无需 volatile

## 17. 参考文献

[1] International Organization for Standardization. *ISO/IEC 9899:2024 Information technology — Programming languages — C* [Standard]. 4th ed. Geneva: ISO, 2024. §5.1.2.3 程序执行、§6.7.3 类型限定符.

[2] International Organization for Standardization. *ISO/IEC 14882:2020 Programming languages — C++* [Standard]. 4th ed. Geneva: ISO, 2020. P1152R4 volatile 弃用提案.

[3] Kernighan, B. W., and Ritchie, D. M. *The C Programming Language*. 2nd ed. Prentice Hall, 1988. Appendix A8 类型限定符.

[4] Bryant, R. E., and O'Hallaron, D. R. *Computer Systems: A Programmer's Perspective*. 3rd ed. Pearson, 2015. Chapter 7 链接、Chapter 9 虚拟内存.

[5] Williams, A. *C++ Concurrency in Action*. 2nd ed. Manning, 2019. 内存模型与原子操作.

[6] Cattell, R. *Embedded C Coding Standard*. Barr Group, 2017. 嵌入式 C 编码规范.

[7] Meyers, S., and Alexandrescu, A. *C++ and the Perils of Double-Checked Locking* [Technical Report]. IsoCpp, 2004. https://www.aristeia.com/Papers/DDJ_Jul_Aug_2004_revised.pdf

[8] Kernel.org Documentation Team. *Linux Kernel Memory Barriers* [Documentation]. Linux Foundation, 2024. https://www.kernel.org/doc/Documentation/memory-barriers.txt

## 18. 延伸阅读

### 18.1 标准与规范

- ISO/IEC 9899:2024 §5.1.2.3（程序执行）、§6.7.3（类型限定符）、§7.17（stdatomic.h）
- ISO/IEC 14882:2020（C++20）§6.9.2（多线程执行与数据竞争）、§13.9（volatile）
- P1152R4：*Deprecating volatile*
- Linux 内核文档：Documentation/process/volatile-considered-harmful.rst

### 18.2 经典书籍

- *C++ Concurrency in Action* by Anthony Williams（C++ 内存模型权威）
- *Computer Systems: A Programmer's Perspective* by Bryant & O'Hallaron（系统级编程基础）
- *The Art of Multiprocessor Programming* by Herlihy & Shavit（并发编程理论）
- *Is Parallel Programming Hard, And, If So, What Can You Do About It?* by Paul E. McKenney（Linux 内核 RCU 作者）

### 18.3 在线资源

- GCC Manual - Volatile：https://gcc.gnu.org/onlinedocs/gcc/Volatiles.html
- Clang Documentation - Atomic Operations：https://clang.llvm.org/docs/Atomics.html
- CppReference atomic：https://en.cppreference.com/w/c/atomic
- Linux Kernel Memory Barriers：https://www.kernel.org/doc/Documentation/memory-barriers.txt
- ARM Memory Barriers：https://developer.arm.com/documentation/den0024/latest/

### 18.4 经典论文

- Adve, S. V., and Gharachorloo, K. "Shared Memory Consistency Models: A Tutorial." *IEEE Computer*, 29(12):66-76, 1996.
- McKenney, P. E. "Memory Barriers: a Hardware View for Software Hackers." *Linux Technology Center*, 2010.
- Boehm, H.-J. "Threads Cannot Be Implemented As a Library." *PLDI 2005*.
- Meyers, S., and Alexandrescu, A. "C++ and the Perils of Double-Checked Locking." *DDJ*, 2004.

### 18.5 开源项目源码

- Linux 内核：https://github.com/torvalds/linux（READ_ONCE/WRITE_ONCE、smp_mb）
- FreeRTOS：https://github.com/FreeRTOS/FreeRTOS（嵌入式 RTOS 的 volatile 使用）
- Zephyr RTOS：https://github.com/zephyrproject-rtos/zephyr（现代 RTOS）
- STM32 HAL：https://github.com/STMicroelectronics/STM32CubeF4（嵌入式 HAL）
- Redis：https://github.com/redis/redis（多线程原子操作）

## 附录 A：volatile 使用决策表

```
变量是否被以下"外部"力量修改？
├─ 硬件寄存器（MMIO）
│   └─ 使用 volatile（必需）
├─ 信号处理函数
│   └─ 使用 volatile sig_atomic_t（必需）
├─ setjmp/longjmp
│   └─ 使用 volatile（必需）
├─ DMA
│   └─ 使用 volatile 或缓存维护（必需）
├─ 其他线程
│   └─ 使用 C11 atomic 或锁（不要用 volatile）
├─ 其他进程（共享内存）
│   └─ 使用 atomic 或显式屏障（视场景）
└─ 无外部修改
    └─ 无需 volatile
```

## 附录 B：内存序速查表

| 内存序 | 同步保证 | 适用场景 | 性能 |
|--------|----------|----------|------|
| `memory_order_relaxed` | 仅原子性 | 计数器、统计 | 最快 |
| `memory_order_consume` | 数据依赖（少用） | 依赖关系 | 快（但复杂） |
| `memory_order_acquire` | 读屏障 | 读取同步标志 | 中 |
| `memory_order_release` | 写屏障 | 发布数据 | 中 |
| `memory_order_acq_rel` | 读写屏障 | RMW 操作 | 中 |
| `memory_order_seq_cst` | 全序 | 全局同步 | 最慢（默认） |

## 附录 C：编译器屏障与 CPU 屏障对比

| 屏障类型 | 作用范围 | 示例 |
|----------|----------|------|
| 编译器屏障 | 仅阻止编译器重排 | `asm volatile("" ::: "memory")` |
| CPU 读屏障 | 阻止 CPU 重排后续读 | `asm volatile("lfence" ::: "memory")` |
| CPU 写屏障 | 阻止 CPU 重排后续写 | `asm volatile("sfence" ::: "memory")` |
| CPU 全屏障 | 阻止 CPU 重排读/写 | `asm volatile("mfence" ::: "memory")` |
| C11 acquire | 编译器+CPU 读屏障 | `atomic_load_explicit(&x, memory_order_acquire)` |
| C11 release | 编译器+CPU 写屏障 | `atomic_store_explicit(&x, v, memory_order_release)` |
| C11 seq_cst | 编译器+CPU 全屏障 | `atomic_store(&x, v)` |

## 附录 D：常见平台内存模型

| 平台 | 内存模型 | 允许的重排 |
|------|----------|------------|
| x86/x64 (TSO) | Total Store Order | 仅 store-load |
| ARMv7 | 弱有序 | load-load、load-store、store-load、store-store |
| ARMv8 | 弱有序 + acquire/release | 类似 ARMv7 但有专门屏障指令 |
| POWER | 弱有序 | 类似 ARM，更弱 |
| Alpha | 弱有序 + 数据依赖 | 唯一可能重排数据依赖的平台 |

## 附录 E：volatile 与 atomic 速查对比

| 特性 | volatile | atomic |
|------|----------|--------|
| C 标准版本 | C89 | C11 |
| 原子性 | 不保证 | 保证 |
| 可见性 | 不保证 | 保证 |
| 有序性 | 仅编译器级 | 编译器+CPU 级 |
| 多线程安全 | 否 | 是 |
| 用途 | MMIO、信号、setjmp | 多线程同步 |
| 性能 | 最快 | 中等 |
| C++20 状态 | 部分弃用 | 推荐 |
| 替代关系 | atomic 不能替代 volatile（MMIO 场景） | volatile 不能替代 atomic（多线程场景） |

## 附录 F：术语对照表

| 中文 | 英文 | 缩写 |
|------|------|------|
| 易变的 | volatile | - |
| 类型限定符 | type qualifier | - |
| 副作用 | side effect | - |
| 可观察行为 | observable behavior | - |
| 抽象机 | abstract machine | - |
| as-if 规则 | as-if rule | - |
| 内存映射输入输出 | memory-mapped I/O | MMIO |
| 信号处理函数 | signal handler | - |
| 信号安全整数类型 | signal-safe integer type | sig_atomic_t |
| 原子性 | atomicity | - |
| 可见性 | visibility | - |
| 有序性 | ordering | - |
| 内存屏障 | memory barrier / fence | - |
| 内存序 | memory order | - |
| 缓存一致性 | cache coherence | - |
| 自旋锁 | spinlock | - |
| 双重检查锁定 | double-checked locking | DCLP |
| 释放-获取 | release-acquire | - |
| 顺序一致性 | sequential consistency | seq_cst |
| 寄存器缓存 | register caching | - |
| 死代码消除 | dead code elimination | DCE |
| 循环不变量外提 | loop-invariant code motion | LICM |
| 公共子表达式消除 | common subexpression elimination | CSE |
| 指令重排 | instruction reordering | - |
| 全存储排序 | total store order | TSO |
| 缓存行 | cache line | - |
| 直接内存访问 | direct memory access | DMA |
| 中断服务例程 | interrupt service routine | ISR |
| 实时操作系统 | real-time operating system | RTOS |
| 位带 | bit-banding | - |
