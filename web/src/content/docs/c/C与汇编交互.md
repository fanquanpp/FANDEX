---
order: 75
title: C与汇编交互
module: c
category: 'dev-lang'
difficulty: advanced
description: 'C语言与汇编交互：GCC/Clang内联汇编、操作数约束、内存屏障、原子操作、SIMD加速、外部汇编与跨架构支持。'
author: fanquanpp
updated: '2026-06-14'
related:
  - c/跨平台编程
  - c/嵌入式C编程
  - c/数组详解
  - c/预处理器与宏
prerequisites:
  - c/概述
---

# C 与汇编交互（C and Assembly Interaction）

> "It is difficult to prevent the C compiler from generating good code. But sometimes the only way to get the code you need is to write it yourself in assembly language. ... GCC's extended `asm` syntax lets you embed assembly instructions within C functions, specify input and output operands, and tell the compiler what registers and memory your instructions modify."
> —— GCC Manual, "Extended Asm" 与 Richard M. Stallman, *Using and Porting GCC*

## 摘要

本文系统论述 C 语言与汇编语言（assembly language）交互的形式化语法、底层机制、跨架构差异与工程实践。C 与汇编的交互允许开发者在性能关键路径（performance-critical path）、操作系统内核（OS kernel）、设备驱动（device driver）、加密算法（cryptographic algorithm）、底层并发原语（low-level concurrency primitive）等场景中，直接调用处理器特定指令（processor-specific instruction），绕过编译器的抽象限制。GCC 与 Clang 提供"扩展内联汇编"（extended inline assembly）语法，允许声明输入/输出操作数、修改寄存器列表与内存副作用；MSVC 则提供更受限的 `__asm` 块语法；此外，C 代码也可通过外部链接（external linkage）调用独立汇编文件中的函数。

本文对标 MIT 6.087（Practical Programming in C）、Stanford CS107、CMU 15-213（CSAPP Chapter 3）、Berkeley CS162 等海外名校课程教学水准，融合 ISO/IEC 9899:2024（C23）规范、GCC Manual、Clang Language Extensions、System V AMD64 ABI、Microsoft x64 ABI、Linux Kernel、glibc、SQLite、Redis、DPDK、OpenSSL 等真实工程案例，提供从形式化定义到生产级代码的完整路径。

---

## 1. 学习目标

本节使用 Bloom 分类法（Bloom's Taxonomy, Revised 2001）描述完成本文学习后学习者应当具备的认知层级。Bloom 分类法将认知目标从低阶到高阶划分为六个层次：remember（记忆）、understand（理解）、apply（应用）、analyze（分析）、evaluate（评价）、create（创造）。

### 1.1 Remember（记忆）

完成本节后，学习者应当能够准确回忆以下事实性知识：

- 内联汇编（inline assembly）的两种形式：基础内联汇编（basic asm）与扩展内联汇编（extended asm）。
- GCC/Clang 扩展内联汇编的语法骨架：`__asm__ __volatile__("模板" : 输出 : 输入 : clobber);`。
- AT&T 语法与 Intel 语法的核心差异：操作数顺序（源在前 vs 目的在前）、寄存器前缀（`%` vs 无）、立即数前缀（`$` vs 无）。
- 常用操作数约束字符：`r`（通用寄存器）、`m`（内存）、`i`（立即数）、`a`/`b`/`c`/`d`（eax/ebx/ecx/edx）、`D`/`S`（edi/esi）、`=r`（只写输出）、`+r`（读写）。
- `__volatile__` 修饰符的作用：禁止编译器将汇编代码优化掉或与其他内存操作重排。
- `clobber list`（修改列表）的常见条目：`"memory"`（内存副作用）、`"cc"`（条件码）、寄存器名（如 `"eax"`、`"xmm0"`）。
- `rdtsc` 指令读取 x86 时间戳计数器（Time Stamp Counter），结果存入 `edx:eax`。
- `cpuid` 指令获取 CPU 特性信息，输入 `eax`（leaf），输出 `eax/ebx/ecx/edx`。
- `lock` 前缀实现原子内存操作，如 `lock cmpxchg`（原子比较交换）。
- 内存屏障指令：x86 的 `mfence`/`lfence`/`sfence`，ARM 的 `dmb`/`dsb`/`isb`，RISC-V 的 `fence`。
- 外部汇编通过 `extern` 声明，遵循调用约定（System V AMD64 ABI、AAPCS64 等）。
- MSVC 使用 `__asm { }` 块语法（Intel 语法），且在 x64 模式下不支持内联汇编。

### 1.2 Understand（理解）

学习者应当能够解释：

- 为什么需要内联汇编：访问 C 无法直接生成的指令（如 `cpuid`、`rdtsc`、`invlpg`）、实现精确的内存序控制（memory ordering）、手写 SIMD 优化（SIMD optimization）、操作系统上下文切换（context switch）等。
- 为什么 GCC 选择"扩展内联汇编"语法而非简单字符串替换：扩展语法允许编译器理解汇编代码的数据流（输入/输出操作数），从而更好地分配寄存器与进行优化。
- `__volatile__` 的语义：防止编译器删除"看似无副作用"的汇编代码（如 `rdtsc`），防止将汇编代码与周围内存操作重排；但不能阻止 CPU 层面的乱序执行（需要硬件内存屏障）。
- `"memory"` clobber 的作用：告诉编译器汇编代码可能修改任意内存，强制编译器在汇编前后将所有相关变量从寄存器回写到内存。
- AT&T 与 Intel 语法的选用权衡：GCC 默认 AT&T 语法，可通过 `.intel_syntax noprefix` 切换；MSVC 仅支持 Intel 语法；AT&T 语法与 GCC 工具链（`as`、`gdb`、`objdump`）一致。
- 为什么 MSVC x64 不支持内联汇编：Microsoft 选择通过编译器内建函数（intrinsic）提供等价功能，简化编译器实现。
- 内联汇编与外部汇编的权衡：内联汇编允许编译器优化寄存器分配，但可移植性差；外部汇编可独立编译与优化，但调用约定需手动维护。
- `asm goto`（GCC 4.5+）的用途：允许汇编代码跳转到 C 标签，常用于实现自适应锁（adaptive lock）的快速路径。
- `__builtin_expect` 与内联汇编的配合：分支预测提示与汇编代码的协同优化。
- 跨架构汇编的可移植性挑战：x86、ARM、RISC-V 的指令集与寄存器完全不同，需要通过 `#if defined(__x86_64__)` 等预处理宏隔离。

### 1.3 Apply（应用）

学习者应当能够：

- 使用 `__asm__ __volatile__` 编写 `rdtsc`、`cpuid`、`mfence` 等常用指令的内联汇编。
- 使用操作数约束将 C 变量绑定到汇编操作数（如 `"=a"(result)` 将 eax 绑定到 result）。
- 使用 `clobber list` 正确声明汇编代码修改的寄存器与内存。
- 使用 `#ifdef __x86_64__` / `#ifdef __aarch64__` / `#ifdef __riscv` 编写跨架构汇编代码。
- 编写外部汇编函数（`.s` 文件），通过 `extern` 声明并在 C 中调用。
- 使用 GCC intrinsics（如 `__builtin_ia32_rdtsc`、`__sync_bool_compare_and_swap`）替代手写汇编。
- 使用 `_mm_load_ps` 等 SIMD intrinsics 实现向量加速。
- 使用 `asm goto` 实现带快速路径的并发原语。

### 1.4 Analyze（分析）

学习者应当能够：

- 分析 `gcc -S` 生成的汇编代码，识别内联汇编与编译器生成代码的边界。
- 通过 `objdump -d` 反汇编二进制，验证内联汇编是否被正确编译。
- 分析内存屏障在多线程代码中的作用，识别所需的屏障类型（`mfence`/`lfence`/`sfence` 或 `dmb`/`dsb`/`isb`）。
- 分析内联汇编的性能：寄存器分配、内存 clobber 的副作用、指令流水线停顿。
- 分析 `asm goto` 与传统 `asm` 的控制流差异：前者允许跳转到 C 标签，后者只能通过输出操作数影响控制流。
- 分析跨编译器（GCC vs Clang vs MSVC）的内联汇编兼容性问题。

### 1.5 Evaluate（评价）

学习者应当能够评估：

- 内联汇编 vs intrinsics 的权衡：intrinsics 可移植性更好、编译器可优化，但某些指令无对应 intrinsic（如 `invlpg`）。
- AT&T vs Intel 语法的选用：AT&T 与 GCC 工具链一致，Intel 更易读且被 MSVC 用户熟悉。
- 内联汇编 vs 外部汇编的选用：内联汇编允许编译器优化，外部汇编可独立测试与维护。
- 在性能关键路径上，手写汇编 vs 编译器自动向量化的收益：手写通常更快 10-30%，但维护成本高。
- `__volatile__` 的使用场景：仅在汇编代码有副作用（如 I/O 端口访问、rdtsc）时使用，无副作用的汇编应允许编译器优化。

### 1.6 Create（创造）

学习者应当能够：

- 实现一个跨架构的高精度计时器，x86 用 `rdtsc`，ARM 用 `mrs x0, cntvct_el0`，RISC-V 用 `rdcycle`。
- 实现一个无锁（lock-free）队列，使用 `lock cmpxchg` 实现 CAS 原语。
- 实现一个 SIMD 加速的字符串查找函数，使用 AVX2 `VPCMPESTRI` 指令。
- 设计一个自适应自旋锁，使用 `asm goto` 实现快速路径跳转。
- 实现一个用户级线程（coroutine）库，使用内联汇编进行上下文切换（保存/恢复 callee-saved 寄存器）。
- 在裸机嵌入式环境中实现 `memcpy` 的优化版本，利用对齐访问与 SIMD 指令。

---

## 2. 历史动机与发展脉络

### 2.1 早期 C 与汇编的紧密耦合

C 语言诞生于 1972 年的 Bell Labs，最初目的是编写 UNIX 操作系统。Dennis Ritchie 设计 C 时，C 与汇编的关系极为紧密：UNIX 内核中大量使用 PDP-11 汇编（通过 `asm` 语句嵌入），用于实现上下文切换、中断处理、I/O 端口访问等底层操作。

K&R C（1978）第一版引入 `asm` 关键字：

```c
asm("assembly instruction");
```

但 K&R 未规定具体语法，各编译器厂商各行其是：

- Microsoft C 4.0（1985）：`asm { mov ax, 1 }` 块语法，Intel 语法。
- Borland Turbo C（1987）：`asm mov ax, 1` 行语法，Intel 语法。
- VAX VMS C：`asm("movl $1, r0")` 函数式语法，VAX 汇编。
- SunOS cc on SPARC：`asm("sethi %hi(1), %o0")` 函数式语法，SPARC 汇编。

这种混乱促使 ANSI C 委员会（X3J11）在 C89 中将 `asm` 归为"实现定义"（implementation-defined），不强制语法。

### 2.2 GCC 扩展内联汇编的诞生

Richard Stallman 在 1987 年开始开发 GCC（GNU Compiler Collection）时，意识到简单的 `asm("...")` 语法无法满足 GCC 的优化需求：编译器无法理解汇编代码的数据流，导致无法正确分配寄存器或进行常量传播。

GCC 2.0（1992）引入"扩展内联汇编"（extended `asm`）语法：

```c
__asm__ (
    "汇编指令模板"
    : 输出操作数列表    /* 可选 */
    : 输入操作数列表    /* 可选 */
    : clobber 列表      /* 可选 */
);
```

这一设计允许编译器理解汇编代码的输入/输出依赖，从而：

1. 正确分配寄存器，避免汇编代码与 C 代码的寄存器冲突。
2. 在满足约束的前提下，将汇编代码与其他指令重排优化。
3. 进行常量传播（若输入是编译期常量）。

GCC 扩展内联汇编迅速成为 Unix/Linux 生态的事实标准，被 Linux Kernel、glibc、GCC runtime（libgcc）广泛采用。

### 2.3 Clang 与 GCC 兼容

Clang（2007 起）作为 GCC 的替代品，完全兼容 GCC 的扩展内联汇编语法。这使得 Linux Kernel、glibc 等项目可用 Clang 编译，同时保持汇编代码不变。

### 2.4 MSVC 的分道扬镳

Microsoft Visual C++（MSVC）选择不同的路线：

- 16 位与 32 位 x86：支持 `__asm { }` 块语法（Intel 语法），允许在 C 函数中嵌入汇编块。
- 64 位 x64：**完全移除内联汇编支持**。Microsoft 的理由是：

  1. 简化编译器实现（x64 寄存器更多，寄存器分配更复杂）。
  2. 推动开发者使用编译器内建函数（intrinsic），如 `__rdtsc()`、`__cpuid()`、`_InterlockedCompareExchange()`。
  3. 提升可移植性（intrinsic 可跨编译器，内联汇编不可）。

这一决定导致大量依赖内联汇编的代码（如 OpenSSL 早期版本）需要为 MSVC x64 单独维护 intrinsic 版本。

### 2.5 C11 与 C23 的标准化努力

C11（ISO/IEC 9899:2011）未引入标准化的内联汇编语法，但引入了 `_Atomic` 类型与原子操作库（`<stdatomic.h>`），为部分原子操作场景提供了汇编的替代方案。

C23（ISO/IEC 9899:2024）仍未标准化内联汇编，但：

1. 引入 `#embed` 指令，可将二进制数据嵌入源码（间接影响汇编嵌入）。
2. 强化 `constexpr` 支持，允许编译期常量传递给汇编。
3. C2y（下一个标准）正在讨论将 GCC 扩展内联汇编语法纳入标准。

### 2.6 C++ 的标准化尝试

C++ 标准委员会（WG21）在 C++23 周期中提出了 P1668（Standardized Inline Assembly），建议采用 GCC 扩展语法作为标准。该提案尚未通过，但反映了业界对标准化内联汇编的需求。

---

## 3. 形式化定义

### 3.1 内联汇编的形式化语法

GCC/Clang 扩展内联汇编的形式化语法：

$$
\text{asm-stmt} \ ::= \ \text{__asm__} \ [\text{__volatile__}] \ ( \text{template} \ [: \text{outputs}] \ [: \text{inputs}] \ [: \text{clobbers}] \ [: \text{labels}] )
$$

其中：

- $\text{template}$：汇编指令模板字符串，使用 `%0`、`%1` 等引用操作数，`%%` 引用寄存器名。
- $\text{outputs}$：输出操作数列表，形如 `"constraint"(variable), ...`。
- $\text{inputs}$：输入操作数列表，形如 `"constraint"(expression), ...`。
- $\text{clobbers}$：clobber 列表，形如 `"memory", "cc", "rax", ...`。
- $\text{labels}$：`asm goto` 的目标标签列表（GCC 4.5+）。

### 3.2 操作数约束的形式化定义

操作数约束（operand constraint）是一个字符串，描述汇编操作数的属性：

$$
\text{constraint} \ ::= \ \text{modifier}^* \ \text{type} \ [\text{size}]
$$

其中：

- $\text{modifier}$：`=`（只写输出）、`+`（读写）、`&`（早期 clobber，编译器不可将输入分配到同一寄存器）。
- $\text{type}$：`r`（通用寄存器）、`m`（内存）、`i`（立即数）、`a`/`b`/`c`/`d`/`S`/`D`（特定寄存器）、`f`（浮点寄存器）、`x`（SSE 寄存器）、`v`（AVX 寄存器）等。
- $\text{size}$：可选，指定操作数大小（如 `b` 字节、`h` 半字、`w` 字、`k` 32 位、`q` 64 位）。

### 3.3 操作数编号规则

操作数按"输出在前，输入在后"的顺序编号：

$$
\text{outputs} = o_0, o_1, \ldots, o_{n-1}
$$

$$
\text{inputs} = i_n, i_{n+1}, \ldots, i_{n+m-1}
$$

在模板中，`%0` 引用 $o_0$，`%n` 引用 $i_n$，依此类推。`%%` 引用字面寄存器名（如 `%%eax`）。

### 3.4 `__volatile__` 的形式化语义

`__volatile__` 修饰符对编译器施加以下约束：

1. **禁止删除**：即使编译器认为汇编代码无副作用，也不得删除。
2. **禁止重排**：汇编代码不得与周围的 `volatile` 访问或其他 `asm __volatile__` 重排。但可与普通内存访问重排（除非 clobber 包含 `"memory"`）。

形式化地，设 $\text{asm}_v$ 为 `asm __volatile__` 语句，$S_1$、$S_2$ 为其前后的普通语句：

$$
S_1 \prec \text{asm}_v \prec S_2 \implies \text{不交换 } \text{asm}_v \text{ 与 } S_1/S_2
$$

但若 $S_1$ 或 $S_2$ 是普通内存访问（非 `volatile`），编译器可能将其与 $\text{asm}_v$ 重排，除非 $\text{asm}_v$ 的 clobber 包含 `"memory"`。

### 3.5 `"memory"` clobber 的形式化语义

`"memory"` clobber 告诉编译器：汇编代码可能读取或修改任意内存地址。编译器必须：

1. 在汇编代码前，将所有"可能被汇编访问"的变量从寄存器回写到内存（spill）。
2. 在汇编代码后，从内存重新加载这些变量（reload）。
3. 不将汇编代码与任何内存访问重排。

形式化地，`"memory"` clobber 构成一个"编译器内存屏障"（compiler memory barrier）：

$$
\text{asm}_\text{memory} \ ::= \ \text{__asm__} \ \text{__volatile__} \ (" " \ ::: \text{"memory"})
$$

等价于 GCC 内建 `__sync_synchronize()` 的编译器部分（不含硬件屏障）。

### 3.6 `asm goto` 的形式化语法

`asm goto`（GCC 4.5+）允许汇编代码跳转到 C 标签：

$$
\text{asm-goto} \ ::= \ \text{asm} \ \text{goto} \ ( \text{template} \ ::: \text{clobbers} \ : \text{labels} )
$$

在模板中，`%l[N]` 引用第 N 个标签（从 0 开始）。汇编代码通过 `jmp` 或 `je`/`jne` 等条件跳转指令跳转到标签。

`asm goto` 的限制：

1. 不能有输出操作数（GCC 4.5-9），GCC 10+ 允许输出操作数（`asm goto with outputs`）。
2. 输入操作数不能是内存（防止编译器在跳转前 spill 内存）。

---

## 4. 理论推导与原理解析

### 4.1 扩展内联汇编的工作原理

当编译器遇到扩展内联汇编时，执行以下步骤：

1. **解析约束**：为每个操作数选择合适的寄存器或内存位置。例如，约束 `"=a"` 强制使用 `eax`/`rax`，约束 `"r"` 由编译器选择任意通用寄存器。
2. **分配寄存器**：根据约束与当前寄存器占用情况，分配物理寄存器。若冲突，则 spill 原寄存器内容。
3. **生成加载/存储指令**：若输入操作数的 C 变量不在分配的寄存器中，生成 `mov` 指令加载；若输出操作数需要写回 C 变量，生成 `mov` 指令存储。
4. **替换模板中的操作数引用**：将 `%0`、`%1` 等替换为实际寄存器名或内存地址。
5. **插入 clobber 保存/恢复**：若 clobber 列表中的寄存器包含 callee-saved 寄存器且被使用，生成保存/恢复指令。
6. **应用 `__volatile__` 与 `"memory"` 语义**：禁止删除与重排，spill/reload 内存变量。

### 4.2 操作数约束的详细语义

**输出约束**：

- `"=r"(x)`：将汇编结果写入通用寄存器，再赋值给 `x`。
- `"=a"(x)`：将结果写入 `eax`/`rax`，再赋值给 `x`。
- `"=m"(x)`：将结果直接写入 `x` 的内存地址（无需中间寄存器）。

**输入约束**：

- `"r"(expr)`：将 `expr` 的值加载到通用寄存器。
- `"i"(42)`：将立即数 42 直接嵌入汇编（编译期常量）。
- `"a"(expr)`：将 `expr` 加载到 `eax`/`rax`。
- `"m"(x)`：使用 `x` 的内存地址（无需加载到寄存器）。

**读写约束**：

- `"+r"(x)`：`x` 既是输入也是输出，编译器将 `x` 加载到寄存器，汇编后写回。
- `"0"(x)`：`x` 与第 0 个操作数（通常是输出）使用同一寄存器。

**早期 clobber**：

- `"=&r"(x)`：输出操作数在汇编代码执行前就被修改，编译器不得将任何输入分配到同一寄存器。常用于循环中多个输出复用寄存器的场景。

### 4.3 `__volatile__` 与 `asm` 的对比

考虑：

```c
int x = 0;
asm("nop");  /* 无 __volatile__ */
x = 1;
```

编译器可能认为 `nop` 无副作用，将其删除，得到：

```c
int x = 0;
x = 1;
```

若改为：

```c
int x = 0;
asm __volatile__("nop");  /* 有 __volatile__ */
x = 1;
```

编译器不得删除 `nop`。

但 `__volatile__` 不能防止 CPU 层面的乱序执行。考虑：

```c
data = 42;
asm __volatile__("nop");  /* __volatile__ 但无 memory clobber */
flag = 1;
```

编译器保留 `nop`，但可能将 `flag = 1` 重排到 `nop` 之前（因为 `nop` 不影响内存）。要防止重排，需要：

```c
data = 42;
asm __volatile__("nop" ::: "memory");  /* memory clobber */
flag = 1;
```

### 4.4 内存屏障的层次

内存屏障分为两层：

1. **编译器屏障**（compiler barrier）：防止编译器重排，但不影响 CPU。
   - GCC：`asm __volatile__("" ::: "memory")` 或 `__asm__ __volatile__("" ::: "memory")`。
   - C11：`atomic_signal_fence(memory_order_acq_rel)`。
   - Linux Kernel：`barrier()` 宏。

2. **硬件屏障**（hardware barrier）：防止 CPU 乱序执行。
   - x86：`mfence`（全屏障）、`lfence`（读屏障）、`sfence`（写屏障）。
   - ARM：`dmb`（数据内存屏障）、`dsb`（数据同步屏障）、`isb`（指令同步屏障）。
   - RISC-V：`fence`、`fence.i`。

完整的内存屏障需要同时使用编译器屏障与硬件屏障。Linux Kernel 的 `smp_mb()` 宏即为此设计：

```c
/* x86 */
#define smp_mb() asm __volatile__("mfence" ::: "memory")

/* ARM */
#define smp_mb() asm __volatile__("dmb ish" ::: "memory")

/* RISC-V */
#define smp_mb() asm __volatile__("fence rw, rw" ::: "memory")
```

### 4.5 AT&T vs Intel 语法对比

| 特性 | AT&T 语法 | Intel 语法 |
| --- | --- | --- |
| 操作数顺序 | 源在前，目的在后：`movl $42, %eax` | 目的在前，源在后：`mov eax, 42` |
| 寄存器前缀 | `%`：`%eax`、`%rbx` | 无：`eax`、`rbx` |
| 立即数前缀 | `$`：`$42`、`$0x1F` | 无：`42`、`1Fh` |
| 十六进制 | `0x1F` | `1Fh` |
| 指令后缀 | `l`（32位）、`q`（64位）、`w`（16位）、`b`（8位） | 无后缀（用 `dword ptr` 等指定大小） |
| 内存寻址 | `disp(base, index, scale)`：`4(%eax, %ebx, 2)` | `[base + index*scale + disp]`：`[eax + ebx*2 + 4]` |
| 注释 | `#` | `;` 或 `//` |

GCC 默认使用 AT&T 语法，但可通过 `.intel_syntax noprefix` 切换到 Intel 语法：

```c
asm __volatile__(".intel_syntax noprefix\n\t"
                 "mov eax, 42\n\t"
                 ".att_syntax prefix");
```

注意切换后需切回 AT&T 语法，否则后续汇编代码会解析错误。

### 4.6 外部汇编的调用约定

外部汇编函数需遵循目标平台的调用约定（calling convention），否则会导致参数传递错误或寄存器损坏。

**System V AMD64 ABI**（Linux/macOS）：

- 整数参数：`rdi`、`rsi`、`rdx`、`rcx`、`r8`、`r9`（前 6 个）。
- 浮点参数：`xmm0`-`xmm7`。
- 返回值：`rax`（整数/指针）、`xmm0`（浮点）。
- callee-saved：`rbx`、`rbp`、`r12`-`r15`。
- 栈对齐：`call` 前 `rsp` 16 字节对齐。

**Microsoft x64 ABI**（Windows）：

- 整数参数：`rcx`、`rdx`、`r8`、`r9`（前 4 个）。
- 浮点参数：`xmm0`-`xmm3`。
- 返回值：`rax`、`xmm0`。
- callee-saved：`rbx`、`rbp`、`rdi`、`rsi`、`r12`-`r15`。
- shadow space：调用方预留 32 字节栈空间供被调用方保存寄存器参数。
- 栈对齐：`rsp` 16 字节对齐。

**AAPCS64**（ARMv8-A）：

- 整数参数：`x0`-`x7`。
- 返回值：`x0`。
- callee-saved：`x19`-`x28`、`x29`（FP）。
- 栈对齐：`sp` 16 字节对齐。

---

## 5. 代码示例

### 5.1 基础示例：读取时间戳计数器

```c
/* rdtsc.c - 读取 x86 时间戳计数器
 * 编译: gcc -std=c11 -O2 rdtsc.c -o rdtsc
 * 标准: C11
 */
#include <stdio.h>
#include <stdint.h>

/* 读取 TSC（Time Stamp Counter）
 * rdtsc 指令将 64 位时间戳读入 edx:eax
 */
static inline uint64_t rdtsc(void) {
    unsigned int lo, hi;
    __asm__ __volatile__(
        "rdtsc"
        : "=a"(lo), "=d"(hi)  /* eax=低32位, edx=高32位 */
        :
        /* 无 clobber：rdtsc 只修改 eax/edx，已在输出中声明 */
    );
    return ((uint64_t)hi << 32) | lo;
}

/* 串行化的 rdtsc（更精确，但更慢）
 * cpuid 指令会串行化指令流水线，防止 rdtsc 被重排
 */
static inline uint64_t rdtscp(void) {
    unsigned int lo, hi, aux;
    __asm__ __volatile__(
        "rdtscp"
        : "=a"(lo), "=d"(hi), "=c"(aux)
        :
        /* rdtscp 同时写入 ecx（辅助信息） */
    );
    __asm__ __volatile__("cpuid" ::: "rax", "rbx", "rcx", "rdx");
    return ((uint64_t)hi << 32) | lo;
}

int main(void) {
    uint64_t start = rdtsc();
    /* 执行一些操作 */
    for (volatile int i = 0; i < 1000000; i++);
    uint64_t end = rdtsc();

    printf("耗时: %llu 个时钟周期\n", (unsigned long long)(end - start));
    return 0;
}
```

### 5.2 进阶示例：CPUID 获取 CPU 信息

```c
/* cpuid.c - 获取 CPU 信息
 * 编译: gcc -std=c11 -O2 cpuid.c -o cpuid
 * 标准: C11
 */
#include <stdio.h>
#include <stdint.h>
#include <string.h>

/* 执行 cpuid 指令
 * leaf: 输入参数（功能号）
 * eax/ebx/ecx/edx: 输出 CPU 信息
 */
static inline void cpuid(uint32_t leaf, uint32_t *eax, uint32_t *ebx,
                         uint32_t *ecx, uint32_t *edx) {
    __asm__ __volatile__(
        "cpuid"
        : "=a"(*eax), "=b"(*ebx), "=c"(*ecx), "=d"(*edx)
        : "a"(leaf)
    );
}

/* 获取 CPU 厂商字符串 */
static void get_cpu_vendor(char vendor[13]) {
    uint32_t eax, ebx, ecx, edx;
    cpuid(0, &eax, &ebx, &ecx, &edx);

    /* 厂商字符串存储在 ebx:edx:ecx（顺序特殊） */
    memcpy(vendor,     &ebx, 4);
    memcpy(vendor + 4, &edx, 4);
    memcpy(vendor + 8, &ecx, 4);
    vendor[12] = '\0';
}

/* 检查 CPU 是否支持 AVX2 */
static int has_avx2(void) {
    uint32_t eax, ebx, ecx, edx;
    /* leaf 7, subleaf 0: 扩展特性 */
    __asm__ __volatile__(
        "cpuid"
        : "=a"(eax), "=b"(ebx), "=c"(ecx), "=d"(edx)
        : "a"(7), "c"(0)
    );
    /* ebx 的 bit 5 表示 AVX2 支持 */
    return (ebx >> 5) & 1;
}

int main(void) {
    char vendor[13];
    get_cpu_vendor(vendor);
    printf("CPU 厂商: %s\n", vendor);
    printf("AVX2 支持: %s\n", has_avx2() ? "是" : "否");
    return 0;
}
```

### 5.3 进阶示例：原子比较交换（CAS）

```c
/* atomic_cas.c - 原子比较交换
 * 编译: gcc -std=c11 -O2 atomic_cas.c -o atomic_cas
 * 标准: C11
 */
#include <stdio.h>
#include <stdbool.h>
#include <stdint.h>

/* 原子比较交换（32位）
 * 若 *ptr == expected，则 *ptr = desired，返回 true
 * 否则返回 false
 */
static inline bool atomic_cas32(uint32_t *ptr, uint32_t expected, uint32_t desired) {
    uint8_t result;
    __asm__ __volatile__(
        "lock cmpxchgl %2, %1\n\t"
        "sete %0"
        : "=r"(result), "+m"(*ptr)
        : "r"(desired), "a"(expected)  /* expected 必须在 eax */
        : "memory", "cc"  /* 修改内存与条件码 */
    );
    return result;
}

/* 原子比较交换（64位，x86_64） */
static inline bool atomic_cas64(uint64_t *ptr, uint64_t expected, uint64_t desired) {
    uint8_t result;
    __asm__ __volatile__(
        "lock cmpxchgq %2, %1\n\t"
        "sete %0"
        : "=r"(result), "+m"(*ptr)
        : "r"(desired), "a"(expected)
        : "memory", "cc"
    );
    return result;
}

/* 使用 C11 stdatomic.h 对比 */
#include <stdatomic.h>
static inline bool atomic_cas_c11(_Atomic uint32_t *ptr, uint32_t expected, uint32_t desired) {
    return atomic_compare_exchange_strong(ptr, &expected, desired);
}

int main(void) {
    uint32_t value = 10;

    /* 第一次 CAS：expected=10, desired=20，应成功 */
    if (atomic_cas32(&value, 10, 20)) {
        printf("CAS 成功: value = %u\n", value);  /* 20 */
    }

    /* 第二次 CAS：expected=10, desired=30，应失败 */
    if (!atomic_cas32(&value, 10, 30)) {
        printf("CAS 失败: value 仍为 %u\n", value);  /* 20 */
    }

    return 0;
}
```

### 5.4 进阶示例：内存屏障

```c
/* memory_barrier.c - 内存屏障示例
 * 编译: gcc -std=c11 -O2 memory_barrier.c -o memory_barrier
 * 标准: C11
 */
#include <stdio.h>
#include <stdatomic.h>
#include <threads.h>

/* 编译器内存屏障：防止编译器重排，不影响 CPU */
#define compiler_barrier() __asm__ __volatile__("" ::: "memory")

/* x86 硬件内存屏障 */
#define mfence() __asm__ __volatile__("mfence" ::: "memory")  /* 全屏障 */
#define lfence() __asm__ __volatile__("lfence" ::: "memory")  /* 读屏障 */
#define sfence() __asm__ __volatile__("sfence" ::: "memory")  /* 写屏障 */

/* 跨架构硬件屏障 */
#if defined(__x86_64__) || defined(__i386__)
    #define smp_mb() __asm__ __volatile__("mfence" ::: "memory")
#elif defined(__aarch64__)
    #define smp_mb() __asm__ __volatile__("dmb ish" ::: "memory")
#elif defined(__riscv)
    #define smp_mb() __asm__ __volatile__("fence rw, rw" ::: "memory")
#else
    #define smp_mb() compiler_barrier()
#endif

int data = 0;
atomic_int flag = 0;

void producer(void) {
    data = 42;
    smp_mb();  /* 确保 data 的写入在 flag 之前完成 */
    atomic_store_explicit(&flag, 1, memory_order_relaxed);
}

void consumer(void) {
    while (atomic_load_explicit(&flag, memory_order_relaxed) == 0) {
        /* 自旋等待 */
    }
    smp_mb();  /* 确保 data 的读取在 flag 读取之后 */
    printf("data = %d\n", data);  /* 保证输出 42 */
}

int main(void) {
    thrd_t t1, t2;
    thrd_create(&t1, (thrd_start_t)producer, NULL);
    thrd_create(&t2, (thrd_start_t)consumer, NULL);
    thrd_join(t1, NULL);
    thrd_join(t2, NULL);
    return 0;
}
```

### 5.5 高级示例：SIMD 加速

```c
/* simd_sum.c - 使用 SSE/AVX2 指令加速数组求和
 * 编译: gcc -std=c11 -O3 -mavx2 simd_sum.c -o simd_sum
 * 标准: C11
 */
#include <stdio.h>
#include <stdint.h>
#include <immintrin.h>  /* AVX2 intrinsics */

/* 标量求和 */
int sum_scalar(const int *arr, int n) {
    int sum = 0;
    for (int i = 0; i < n; i++) {
        sum += arr[i];
    }
    return sum;
}

/* SSE 求和（每次处理 4 个 int） */
int sum_sse_inline(const int *arr, int n) {
    int result = 0;
    int i = 0;
    int sse_sum[4] = {0, 0, 0, 0};

    for (; i + 3 < n; i += 4) {
        __asm__ __volatile__(
            "movdqu %1, %%xmm0\n\t"      /* 加载 4 个 int 到 xmm0 */
            "movdqu %0, %%xmm1\n\t"      /* 加载当前累加值到 xmm1 */
            "paddd %%xmm0, %%xmm1\n\t"   /* 4 路并行加法 */
            "movdqu %%xmm1, %0"           /* 存回累加值 */
            : "+m"(sse_sum)
            : "m"(arr[i])
            : "xmm0", "xmm1", "memory"
        );
    }

    /* 汇总 SSE 结果 */
    for (int j = 0; j < 4; j++) {
        result += sse_sum[j];
    }

    /* 处理剩余元素 */
    for (; i < n; i++) {
        result += arr[i];
    }

    return result;
}

/* AVX2 求和（每次处理 8 个 int）使用 intrinsics */
int sum_avx2_intrinsic(const int *arr, int n) {
    __m256i vsum = _mm256_setzero_si256();  /* 256位全0 */
    int i = 0;

    for (; i + 7 < n; i += 8) {
        __m256i v = _mm256_loadu_si256((__m256i const *)&arr[i]);
        vsum = _mm256_add_epi32(vsum, v);
    }

    /* 水平求和 */
    int temp[8];
    _mm256_storeu_si256((__m256i *)temp, vsum);
    int result = 0;
    for (int j = 0; j < 8; j++) {
        result += temp[j];
    }

    /* 处理剩余元素 */
    for (; i < n; i++) {
        result += arr[i];
    }

    return result;
}

int main(void) {
    int arr[1024];
    for (int i = 0; i < 1024; i++) {
        arr[i] = i + 1;
    }

    printf("标量求和: %d\n", sum_scalar(arr, 1024));
    printf("SSE 内联汇编: %d\n", sum_sse_inline(arr, 1024));
    printf("AVX2 intrinsic: %d\n", sum_avx2_intrinsic(arr, 1024));

    return 0;
}
```

### 5.6 高级示例：外部汇编函数

```c
/* main.c - 调用外部汇编函数
 * 编译: gcc -std=c11 main.c add_asm.s -o external_asm
 * 标准: C11
 */
#include <stdio.h>
#include <stdint.h>

/* 声明外部汇编函数 */
extern int add_asm(int a, int b);
extern uint64_t factorial_asm(int n);

int main(void) {
    int sum = add_asm(10, 20);
    printf("10 + 20 = %d\n", sum);  /* 30 */

    uint64_t fact = factorial_asm(5);
    printf("5! = %llu\n", (unsigned long long)fact);  /* 120 */

    return 0;
}
```

```asm
# add_asm.s - x86_64 System V AMD64 ABI
# 函数: int add_asm(int a, int b)
# 参数: a=edi, b=esi
# 返回: eax
.text
.globl add_asm
.type add_asm, @function
add_asm:
    movl    %edi, %eax    # eax = a
    addl    %esi, %eax    # eax += b
    ret                   # 返回 eax

# 函数: uint64_t factorial_asm(int n)
# 参数: n=edi
# 返回: rax
# 使用递归实现
.globl factorial_asm
.type factorial_asm, @function
factorial_asm:
    cmpl    $1, %edi      # if n <= 1
    jle     .Lbase_case
    # 递归: n * factorial(n-1)
    pushq   %rdi          # 保存 n（callee-saved 不够用）
    decl    %edi          # n - 1
    call    factorial_asm # rax = factorial(n-1)
    popq    %rdi          # 恢复 n
    imulq   %rdi, %rax    # rax = n * factorial(n-1)
    ret
.Lbase_case:
    movl    $1, %eax      # 返回 1
    ret
```

### 5.7 高级示例：`asm goto` 自适应锁

```c
/* asm_goto_lock.c - 使用 asm goto 实现快速路径锁
 * 编译: gcc -std=c11 -O2 asm_goto_lock.c -o asm_goto_lock
 * 标准: C11（需要 GCC 4.5+）
 */
#include <stdio.h>
#include <stdatomic.h>
#include <stdint.h>

/* 使用 asm goto 实现快速路径锁 */
static inline int try_lock(atomic_int *lock) {
    int expected = 0;
    int success;
    __asm__ goto(
        "lock cmpxchgl %1, %0\n\t"
        "jne %l[fail]"
        :
        : "m"(*lock), "r"(1), "a"(expected)
        : "memory", "cc"
        : fail
    );
    return 1;  /* 成功获取锁 */
fail:
    return 0;  /* 锁已被占用 */
}

static inline void unlock(atomic_int *lock) {
    atomic_store_explicit(lock, 0, memory_order_release);
}

int main(void) {
    atomic_int lock = 0;

    if (try_lock(&lock)) {
        printf("获取锁成功\n");
        unlock(&lock);
        printf("释放锁\n");
    } else {
        printf("获取锁失败\n");
    }

    return 0;
}
```

### 5.8 生产级示例：跨架构高精度计时器

```c
/* timer.c - 跨架构高精度计时器
 * 编译: gcc -std=c11 -O2 timer.c -o timer
 * 标准: C11
 */
#include <stdio.h>
#include <stdint.h>

/* 跨架构读取高精度时间戳 */
static inline uint64_t read_timestamp(void) {
#if defined(__x86_64__) || defined(__i386__)
    /* x86/x86_64: rdtsc */
    unsigned int lo, hi;
    __asm__ __volatile__("rdtsc" : "=a"(lo), "=d"(hi));
    return ((uint64_t)hi << 32) | lo;

#elif defined(__aarch64__)
    /* ARMv8-A: 读取虚拟计时器 */
    uint64_t val;
    __asm__ __volatile__("mrs %0, cntvct_el0" : "=r"(val));
    return val;

#elif defined(__arm__)
    /* ARMv7-A: 读取协处理器计时器 */
    uint32_t val;
    __asm__ __volatile__("mrc p15, 0, %0, c9, c13, 0" : "=r"(val));
    return val;

#elif defined(__riscv) && (__riscv_xlen == 64)
    /* RISC-V 64: 读取 cycle 计数器 */
    uint64_t val;
    __asm__ __volatile__("rdcycle %0" : "=r"(val));
    return val;

#else
    #warning "未支持的架构，使用 clock() 作为回退"
    return (uint64_t)clock();
#endif
}

/* 跨架构 CPU 串行化（用于精确计时） */
static inline void cpu_serialize(void) {
#if defined(__x86_64__) || defined(__i386__)
    /* x86: cpuid 串行化指令流水线 */
    __asm__ __volatile__("cpuid" ::: "rax", "rbx", "rcx", "rdx");
#elif defined(__aarch64__)
    /* ARMv8-A: isb 指令同步屏障 */
    __asm__ __volatile__("isb");
#elif defined(__riscv)
    /* RISC-V: fence.i 指令屏障 */
    __asm__ __volatile__("fence.i");
#endif
}

int main(void) {
    /* 串行化后读取时间戳，确保精确 */
    cpu_serialize();
    uint64_t start = read_timestamp();

    /* 执行被测代码 */
    volatile int sum = 0;
    for (int i = 0; i < 1000000; i++) {
        sum += i;
    }

    cpu_serialize();
    uint64_t end = read_timestamp();

    printf("耗时: %llu 个时钟周期\n", (unsigned long long)(end - start));
    return 0;
}
```

### 5.9 CMake 配置

```cmake
# CMakeLists.txt - C 与汇编交互示例
cmake_minimum_required(VERSION 3.15)
project(asm_demo C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_EXTENSIONS ON)  # 允许 GCC 扩展（__asm__）

# 启用汇编相关警告与优化
add_compile_options(
    -Wall
    -Wextra
    -Wno-unused-parameter
    -O2
)

# 检测架构
if(CMAKE_SYSTEM_PROCESSOR MATCHES "x86_64|amd64|AMD64")
    set(ARCH_X86_64 ON)
    message(STATUS "架构: x86_64")
elseif(CMAKE_SYSTEM_PROCESSOR MATCHES "aarch64|arm64")
    set(ARCH_AARCH64 ON)
    message(STATUS "架构: AArch64")
elseif(CMAKE_SYSTEM_PROCESSOR MATCHES "riscv64")
    set(ARCH_RISCV64 ON)
    message(STATUS "架构: RISC-V 64")
endif()

# 启用 AVX2（可选）
option(ENABLE_AVX2 "Enable AVX2 support" OFF)
if(ENABLE_AVX2 AND ARCH_X86_64)
    add_compile_options(-mavx2)
endif()

# 主可执行文件
add_executable(asm_demo
    rdtsc.c
    cpuid.c
    atomic_cas.c
    memory_barrier.c
    simd_sum.c
    asm_goto_lock.c
    timer.c
)

# 外部汇编示例
if(ARCH_X86_64)
    enable_language(ASM-ATT)
    add_executable(external_asm main.c add_asm.s)
endif()

install(TARGETS asm_demo external_asm DESTINATION bin)
```

### 5.10 Makefile 配置

```makefile
# Makefile - C 与汇编交互示例
CC      = gcc
CFLAGS  = -std=c11 -O2 -Wall -Wextra
LDFLAGS =

TARGETS = rdtsc cpuid atomic_cas memory_barrier simd_sum asm_goto_lock timer external_asm

.PHONY: all clean test

all: $(TARGETS)

rdtsc: rdtsc.c
	$(CC) $(CFLAGS) $< -o $@

cpuid: cpuid.c
	$(CC) $(CFLAGS) $< -o $@

atomic_cas: atomic_cas.c
	$(CC) $(CFLAGS) $< -o $@

memory_barrier: memory_barrier.c
	$(CC) $(CFLAGS) $< -o $@ -lpthread

simd_sum: simd_sum.c
	$(CC) $(CFLAGS) -mavx2 $< -o $@

asm_goto_lock: asm_goto_lock.c
	$(CC) $(CFLAGS) $< -o $@

timer: timer.c
	$(CC) $(CFLAGS) $< -o $@

external_asm: main.c add_asm.s
	$(CC) $(CFLAGS) main.c add_asm.s -o $@

clean:
	rm -f $(TARGETS)

# 生成汇编代码（调试用）
asm-gen: rdtsc.c
	$(CC) $(CFLAGS) -S rdtsc.c -o rdtsc.s
	@echo "汇编代码已生成: rdtsc.s"

# 反汇编检查
disasm: rdtsc
	objdump -d rdtsc | head -50

test: $(TARGETS)
	@echo "=== 运行测试 ==="
	./rdtsc
	./cpuid
	./atomic_cas
	./simd_sum
	./timer
	./external_asm
```

---

## 6. 对比分析

### 6.1 内联汇编 vs Intrinsics vs 外部汇编

| 维度 | 内联汇编 | Intrinsics | 外部汇编 |
| --- | --- | --- | --- |
| 可移植性 | 差（架构相关） | 好（编译器抽象） | 差（架构相关） |
| 编译器优化 | 部分（需正确声明约束） | 完全（编译器理解语义） | 无（独立编译） |
| 寄存器分配 | 编译器辅助 | 完全编译器 | 手动 |
| 学习成本 | 高（需懂汇编+约束） | 中（需懂指令集） | 最高（需懂汇编+ABI） |
| 调试难度 | 高（汇编嵌入C中） | 中（可单步） | 中（独立文件） |
| 适用场景 | 无 intrinsic 的指令 | SIMD、原子操作 | 完整函数、上下文切换 |
| 典型例子 | `rdtsc`、`invlpg` | `_mm_add_ps`、`__sync_...` | `setjmp`、`longjmp` |

### 6.2 AT&T vs Intel 语法对比

| 特性 | AT&T 语法 | Intel 语法 |
| --- | --- | --- |
| 默认工具链 | GCC, Clang, GAS, GDB | MSVC, NASM, MASM, IDA |
| 操作数顺序 | 源, 目的 | 目的, 源 |
| 寄存器前缀 | `%` | 无 |
| 立即数前缀 | `$` | 无 |
| 大小后缀 | `l`/`q`/`w`/`b` | `dword ptr`/`qword ptr` |
| 内存寻址 | `disp(base, index, scale)` | `[base + index*scale + disp]` |
| 注释 | `#`（行）, `/* */`（块） | `;`（行）, `//`（C++） |
| 跳转标签 | `.L1:` | `L1:` |
| 全局符号 | `.globl` | `global`（NASM）/ `PUBLIC`（MASM） |

### 6.3 跨编译器内联汇编对比

| 编译器 | 语法 | x86 支持 | x64 支持 | ARM 支持 |
| --- | --- | --- | --- | --- |
| GCC | `__asm__("..." : : :);` | 是 | 是 | 是 |
| Clang | `__asm__("..." : : :);` | 是 | 是 | 是 |
| MSVC | `__asm { }` | 是 | **否** | 是（ARM64） |
| ICC | `__asm__("..." : : :);` | 是 | 是 | 是 |

### 6.4 跨架构内存屏障对比

| 架构 | 全屏障 | 读屏障 | 写屏障 | 指令屏障 |
| --- | --- | --- | --- | --- |
| x86/x86_64 | `mfence` | `lfence` | `sfence` | `cpuid`/`lfence` |
| ARMv7-A | `dmb sy` | `dmb ishld` | `dmb ishst` | `isb` |
| ARMv8-A | `dmb ish` | `dmb ishld` | `dmb ishst` | `isb` |
| RISC-V | `fence rw, rw` | `fence r, r` | `fence w, w` | `fence.i` |
| PowerPC | `sync` | `lwsync` | `lwsync` | `isync` |

### 6.5 跨架构时间戳指令对比

| 架构 | 指令 | 寄存器 | 频率 | 可靠性 |
| --- | --- | --- | --- | --- |
| x86 | `rdtsc` | `edx:eax` | CPU 频率 | 不恒定（受 Turbo Boost 影响） |
| x86 | `rdtscp` | `edx:eax`, `ecx` | CPU 频率 | 串行化版本 |
| ARMv7-A | `mrc p15, 0, r0, c9, c13, 0` | `r0` | 通用计时器 | 恒定 |
| ARMv8-A | `mrs x0, cntvct_el0` | `x0` | 系统计时器 | 恒定 |
| RISC-V | `rdcycle` | `rd` | CPU 周期 | 实现定义 |

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱一：clobber 列表遗漏寄存器

```c
/* 错误：汇编修改了 ebx 但未声明 */
int bad_example(void) {
    int result;
    __asm__(
        "movl $1, %%eax\n\t"
        "movl $2, %%ebx\n\t"   /* 修改 ebx */
        "addl %%ebx, %%eax\n\t"
        "movl %%eax, %0"
        : "=r"(result)
        :
        : "eax"  /* 遗漏 ebx！ */
    );
    return result;
}
```

**问题**：编译器可能将其他变量分配到 `ebx`，汇编代码破坏其值。

**修复**：完整声明 clobber：

```c
__asm__(
    "movl $1, %%eax\n\t"
    "movl $2, %%ebx\n\t"
    "addl %%ebx, %%eax\n\t"
    "movl %%eax, %0"
    : "=r"(result)
    :
    : "eax", "ebx"  /* 完整声明 */
);
```

### 7.2 陷阱二：缺少 `__volatile__` 导致代码被删除

```c
/* 错误：rdtsc 可能被编译器删除 */
uint64_t bad_rdtsc(void) {
    unsigned int lo, hi;
    asm("rdtsc" : "=a"(lo), "=d"(hi));  /* 无 __volatile__ */
    return ((uint64_t)hi << 32) | lo;
}
```

**问题**：若编译器认为 `rdtsc` 无副作用（输出未被使用），可能删除整个汇编块。

**修复**：添加 `__volatile__`：

```c
__asm__ __volatile__("rdtsc" : "=a"(lo), "=d"(hi));
```

### 7.3 陷阱三：缺少 `"memory"` clobber 导致内存重排

```c
/* 错误：缺少 memory clobber，编译器可能重排 */
data = 42;
__asm__ __volatile__("mfence");  /* 缺少 ::: "memory" */
flag = 1;
```

**问题**：编译器可能将 `flag = 1` 重排到 `mfence` 之前。

**修复**：添加 `"memory"` clobber：

```c
data = 42;
__asm__ __volatile__("mfence" ::: "memory");
flag = 1;
```

### 7.4 陷阱四：AT&T 与 Intel 语法混淆

```c
/* 错误：在 AT&T 语法中使用 Intel 风格 */
__asm__("mov eax, 42");  /* 应为 movl $42, %eax */
```

**问题**：GCC 默认 AT&T 语法，上述代码会编译错误或行为异常。

**修复**：使用正确的 AT&T 语法或切换到 Intel 语法：

```c
/* AT&T 语法 */
__asm__("movl $42, %eax");

/* Intel 语法（需切换） */
__asm__(".intel_syntax noprefix\n\t"
        "mov eax, 42\n\t"
        ".att_syntax prefix");
```

### 7.5 陷阱五：外部汇编调用约定不匹配

```asm
/* 错误：未遵循 System V AMD64 ABI */
.globl bad_add
bad_add:
    /* 假设参数在 rax, rbx（错误！） */
    addq %rbx, %rax
    ret
```

**问题**：System V AMD64 ABI 要求参数在 `rdi`、`rsi`，且 `rbx` 是 callee-saved 必须保存。

**修复**：遵循调用约定：

```asm
.globl good_add
good_add:
    /* 参数: a=rdi, b=rsi, 返回: rax */
    movq %rdi, %rax
    addq %rsi, %rax
    ret
```

### 7.6 陷阱六：`asm goto` 误用输出操作数

```c
/* 错误：GCC 4.5-9 的 asm goto 不支持输出 */
int x;
__asm__ goto(
    "cmp %1, %0\n\t"
    "je %l[equal]"
    : "=r"(x)  /* GCC 9 及更早不支持 */
    : "r"(42)
    :
    : equal
);
```

**修复**：使用 GCC 10+ 或改用普通 `asm` + 输出标志：

```c
int equal;
__asm__(
    "cmp %2, %1\n\t"
    "sete %0"
    : "=r"(equal)
    : "r"(value), "r"(42)
    : "cc"
);
if (equal) goto label;
```

### 7.7 陷阱七：MSVC x64 不支持内联汇编

```c
/* 错误：MSVC x64 不支持 __asm */
int rdtsc_msvc(void) {
    __asm {
        rdtsc  /* 编译错误：x64 不支持 */
    }
}
```

**修复**：使用 MSVC intrinsic：

```c
#include <intrin.h>
uint64_t rdtsc_msvc(void) {
    return __rdtsc();
}
```

### 7.8 陷阱八：SIMD 指令对齐要求

```c
/* 错误：_mm_load_ps 要求 16 字节对齐 */
float *data = malloc(100 * sizeof(float));  /* malloc 仅保证 max_align_t */
__m128 v = _mm_load_ps(data);  /* 可能崩溃 */
```

**修复**：使用对齐分配或未对齐加载：

```c
/* 方案1：对齐分配 */
float *data = aligned_alloc(16, 112);  /* 112 是 16 的倍数 */
__m128 v = _mm_load_ps(data);

/* 方案2：未对齐加载 */
__m128 v = _mm_loadu_ps(data);  /* 不要求对齐 */
```

### 7.9 最佳实践

1. **优先使用 intrinsics 而非内联汇编**：intrinsics 可移植性更好，编译器可优化。
2. **仅在必要时使用 `__volatile__`**：无副作用的汇编应允许编译器优化。
3. **完整声明 clobber 列表**：遗漏会导致寄存器损坏。
4. **使用 `"memory"` clobber 保护内存序**：防止编译器重排内存访问。
5. **跨架构代码使用预处理宏隔离**：`#if defined(__x86_64__)` 等。
6. **外部汇编严格遵循调用约定**：使用 `objdump -d` 验证。
7. **MSVC 使用 intrinsic 替代内联汇编**：跨编译器兼容。
8. **使用 `static_assert` 验证架构假设**：编译期捕获移植性问题。

---

## 8. 工程实践

### 8.1 调试与检查工具

| 工具 | 用途 | 平台 |
| --- | --- | --- |
| `gcc -S` | 生成汇编代码 | 全部 |
| `clang -S` | 生成汇编代码 | 全部 |
| `objdump -d` | 反汇编二进制 | 全部 |
| `gdb` | 单步调试汇编 | 全部 |
| `lldb` | 单步调试汇编 | 全部 |
| `objdump -d -M intel` | Intel 语法反汇编 | 全部 |
| `gcc -fverbose-asm` | 生成带注释的汇编 | 全部 |
| `Compiler Explorer (godbolt.org)` | 在线对比汇编输出 | 全部 |
| `perf` | 性能分析 | Linux |
| `VTune` | 性能分析 | Windows/Linux |

### 8.2 编译选项

| 选项 | 作用 | 编译器 |
| --- | --- | --- |
| `-S` | 生成汇编代码而非目标文件 | GCC, Clang |
| `-fverbose-asm` | 汇编代码带注释 | GCC, Clang |
| `-fno-asynchronous-unwind-tables` | 减少调试信息，简化汇编 | GCC, Clang |
| `-mavx2` | 启用 AVX2 指令 | GCC, Clang |
| `-mavx512f` | 启用 AVX-512 基础指令 | GCC, Clang |
| `-msse4.2` | 启用 SSE 4.2 指令 | GCC, Clang |
| `-march=native` | 启用本地 CPU 所有指令集 | GCC, Clang |
| `-mtune=native` | 针对本地 CPU 优化 | GCC, Clang |
| `-Winline` | 警告内联失败 | GCC, Clang |
| `-fno-inline-asm` | 禁止内联汇编（调试用） | GCC |

### 8.3 静态分析

| 工具 | 能力 |
| --- | --- |
| `clang-tidy` | 检测不安全内联汇编模式 |
| `cppcheck` | 部分支持汇编检查 |
| `Coverity` | 商业静态分析，含汇编规则 |
| `CodeQL` | GitHub 代码扫描 |

### 8.4 CI/CD 集成

```yaml
# .github/workflows/asm-check.yml
name: Assembly Check
on: [push, pull_request]

jobs:
  asm-check:
    strategy:
      matrix:
        arch: [x86_64, aarch64]
        compiler: [gcc, clang]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install cross compilers
        run: |
          sudo apt-get update
          sudo apt-get install -y gcc-aarch64-linux-gnu clang qemu-user

      - name: Compile and check (x86_64)
        if: matrix.arch == 'x86_64'
        run: |
          ${{ matrix.compiler }} -std=c11 -Wall -Wextra -S src/asm_code.c -o out.s
          objdump -d -M intel out.s | head -50

      - name: Cross compile (aarch64)
        if: matrix.arch == 'aarch64'
        run: |
          aarch64-linux-gnu-gcc -std=c11 -Wall -Wextra -S src/asm_code.c -o out_arm.s
          cat out_arm.s | head -50

      - name: Verify assembly output
        run: |
          # 检查是否包含预期的指令
          grep -q "rdtsc\|mrs.*cntvct" out.s || exit 1
```

### 8.5 跨平台汇编抽象层

```c
/* asm_compat.h - 跨平台内联汇编抽象
 * 标准: C11（兼容 GCC/Clang/MSVC）
 */
#ifndef ASM_COMPAT_H
#define ASM_COMPAT_H

#include <stdint.h>

/* ========== 编译器检测 ========== */
#if defined(__GNUC__) || defined(__clang__)
    #define ASM_COMPILER_GCC_LIKE 1
#elif defined(_MSC_VER)
    #define ASM_COMPILER_MSVC 1
#endif

/* ========== 内存屏障 ========== */
#if defined(ASM_COMPILER_GCC_LIKE)
    #if defined(__x86_64__) || defined(__i386__)
        #define ASM_MFENCE() __asm__ __volatile__("mfence" ::: "memory")
        #define ASM_LFENCE() __asm__ __volatile__("lfence" ::: "memory")
        #define ASM_SFENCE() __asm__ __volatile__("sfence" ::: "memory")
    #elif defined(__aarch64__)
        #define ASM_MFENCE() __asm__ __volatile__("dmb ish" ::: "memory")
        #define ASM_LFENCE() __asm__ __volatile__("dmb ishld" ::: "memory")
        #define ASM_SFENCE() __asm__ __volatile__("dmb ishst" ::: "memory")
    #elif defined(__riscv)
        #define ASM_MFENCE() __asm__ __volatile__("fence rw, rw" ::: "memory")
        #define ASM_LFENCE() __asm__ __volatile__("fence r, r" ::: "memory")
        #define ASM_SFENCE() __asm__ __volatile__("fence w, w" ::: "memory")
    #else
        #define ASM_MFENCE() __asm__ __volatile__("" ::: "memory")
        #define ASM_LFENCE() ASM_MFENCE()
        #define ASM_SFENCE() ASM_MFENCE()
    #endif
#elif defined(ASM_COMPILER_MSVC)
    #include <intrin.h>
    #define ASM_MFENCE() _mm_mfence()
    #define ASM_LFENCE() _mm_lfence()
    #define ASM_SFENCE() _mm_sfence()
#endif

/* ========== 时间戳读取 ========== */
static inline uint64_t asm_rdtsc(void) {
#if defined(ASM_COMPILER_GCC_LIKE)
    #if defined(__x86_64__) || defined(__i386__)
        unsigned int lo, hi;
        __asm__ __volatile__("rdtsc" : "=a"(lo), "=d"(hi));
        return ((uint64_t)hi << 32) | lo;
    #elif defined(__aarch64__)
        uint64_t val;
        __asm__ __volatile__("mrs %0, cntvct_el0" : "=r"(val));
        return val;
    #else
        return 0;
    #endif
#elif defined(ASM_COMPILER_MSVC)
    return __rdtsc();
#else
    return 0;
#endif
}

/* ========== CPU 串行化 ========== */
static inline void asm_serialize(void) {
#if defined(ASM_COMPILER_GCC_LIKE)
    #if defined(__x86_64__) || defined(__i386__)
        __asm__ __volatile__("cpuid" ::: "rax", "rbx", "rcx", "rdx");
    #elif defined(__aarch64__)
        __asm__ __volatile__("isb");
    #endif
#elif defined(ASM_COMPILER_MSVC)
    int cpuinfo[4];
    __cpuid(cpuinfo, 0);
#endif
}

#endif /* ASM_COMPAT_H */
```

---

## 9. 案例研究

### 9.1 Linux Kernel：内联汇编的广泛使用

Linux Kernel 大量使用内联汇编实现底层操作：

```c
/* arch/x86/include/asm/msr.h (简化) */
static inline unsigned long long rdtsc(void) {
    unsigned long long val;
    asm volatile("rdtsc" : "=a" (((unsigned *)&val)[0]),
                          "=d" (((unsigned *)&val)[1]));
    return val;
}

/* arch/x86/include/asm/atomic.h (简化) */
static inline int atomic_cmpxchg(atomic_t *v, int old, int new) {
    int prev;
    asm volatile(LOCK_PREFIX "cmpxchgl %1,%2"
                 : "=a"(prev)
                 : "r"(new), "m"(v->counter), "0"(old)
                 : "memory");
    return prev;
}
```

`LOCK_PREFIX` 宏在 SMP 系统下展开为 `lock` 前缀，单处理器系统下为空。

### 9.2 glibc：原子操作实现

glibc 的 `<bits/atomic.h>` 在不同架构上使用内联汇编实现原子操作：

```c
/* sysdeps/x86_64/bits/atomic.h (简化) */
typedef int __atomic_lock_t;
#define __arch_compare_and_exchange_val_32_acq(mem, newval, oldval) \
  ({ __typeof(*mem) ret;                                              \
     __asm __volatile (LOCK_PREFIX "cmpxchgl %2, %1"                 \
                       : "=a" (ret), "=m" (*mem)                      \
                       : "r" (newval), "m" (*mem), "0" (oldval)      \
                       : "memory", "cc");                             \
     ret; })
```

### 9.3 OpenSSL：加密算法的汇编优化

OpenSSL 为每种支持的架构提供手写汇编优化：

```c
/* crypto/aes/asm/aes-x86_64.pl (简化生成的汇编) */
.text
.globl AES_encrypt
.type AES_encrypt,@function
AES_encrypt:
    movq    %rdi, %rax    # 输入
    movq    %rsi, %r11    # 输出
    movq    %rdx, %rcx    # 密钥
    # ... 加密逻辑 ...
    ret
```

OpenSSL 的汇编代码由 Perl 脚本生成，支持 x86、x86_64、ARM、AArch64 等多种架构。

### 9.4 Redis：原子操作的使用

Redis 使用 GCC 内建原子操作（基于内联汇编）实现无锁数据结构：

```c
/* src/atomic.h (简化) */
#define atomic_incr(var,count) __sync_add_and_fetch(&var, (count))
#define atomic_decr(var,count) __sync_sub_and_fetch(&var, (count))
#define atomic_get(var) ({ __sync_synchronize(); (var); })

/* 使用 CAS 实现无锁队列 */
while (1) {
    old_head = head;
    new_head = old_head->next;
    if (__sync_bool_compare_and_swap(&head, old_head, new_head)) {
        break;
    }
}
```

### 9.5 DPDK：高性能网络包处理

DPDK 使用内联汇编实现极速的内存屏障与原子操作：

```c
/* lib/librte_eal/common/include/arch/x86/rte_atomic.h (简化) */
static inline void rte_smp_mb(void) {
    asm volatile("mfence" ::: "memory");
}

static inline void rte_smp_wmb(void) {
    asm volatile("sfence" ::: "memory");
}

static inline void rte_smp_rmb(void) {
    asm volatile("lfence" ::: "memory");
}

/* 原子 CAS */
static inline int rte_atomic32_cmpset(rte_atomic32_t *dst, uint32_t exp, uint32_t src) {
    uint8_t res;
    asm volatile(
        LOCK_PREFIX "cmpxchgl %[src], %[dst];"
        "sete %[res];"
        : [res] "=a" (res), [dst] "=m" (dst->cnt)
        : [src] "r" (src), "a" (exp), "m" (dst->cnt)
        : "memory", "cc");
    return res;
}
```

### 9.6 SQLite：跨平台原子操作

SQLite 通过抽象层支持多种编译器与架构：

```c
/* src/os_common.h (简化) */
#if defined(__GNUC__)
    #define sqlite3_atomic_load(p)  __sync_fetch_and_add(p, 0)
    #define sqlite3_atomic_store(p, v) __sync_lock_test_and_set(p, v)
#elif defined(_MSC_VER)
    #include <intrin.h>
    #define sqlite3_atomic_load(p)  _InterlockedExchangeAdd(p, 0)
    #define sqlite3_atomic_store(p, v) _InterlockedExchange(p, v)
#endif
```

---

## 10. 习题

### 10.1 选择题

**题目 1**：以下内联汇编中，`%0` 引用的是哪个操作数？

```c
int a = 1, b = 2, c;
__asm__("addl %1, %0" : "=r"(c) : "r"(a), "0"(b));
```

A. `a`
B. `b`
C. `c`
D. 编译错误

**答案**：C

**解析**：操作数按"输出在前，输入在后"顺序编号。`c` 是第 0 个（输出），`a` 是第 1 个（输入），`b` 通过 `"0"` 约束复用第 0 个操作数的寄存器。因此 `%0` = `c`，`%1` = `a`。

---

**题目 2**：以下代码的输出是什么？

```c
int x = 5;
__asm__ __volatile__(
    "movl %1, %0\n\t"
    "addl $10, %0"
    : "=r"(x)
    : "r"(x)
);
printf("%d\n", x);
```

A. 5
B. 10
C. 15
D. 不确定

**答案**：C

**解析**：汇编代码将输入 `x`（值 5）加载到寄存器，加 10，结果写回输出 `x`。输出为 15。注意：输入和输出是同一个 C 变量，但编译器可能使用不同寄存器，通过 `movl %1, %0` 传递。

---

**题目 3**：在 MSVC x64 上，以下哪种方式可以实现 `rdtsc`？

A. `__asm { rdtsc }`
B. `__asm__("rdtsc")`
C. `__rdtsc()`（来自 `<intrin.h>`）
D. 无法实现

**答案**：C

**解析**：MSVC x64 不支持内联汇编（`__asm` 块在 x64 模式下被移除），必须使用编译器 intrinsic `__rdtsc()`（需 `#include <intrin.h>`）。

---

### 10.2 填空题

**题目 4**：GCC 扩展内联汇编中，`__volatile__` 修饰符的作用是 ______。

**答案**：禁止编译器将汇编代码优化掉或与周围 `volatile` 访问重排。

---

**题目 5**：`"memory"` clobber 的作用是 ______。

**答案**：告诉编译器汇编代码可能修改任意内存，强制编译器在汇编前后 spill/reload 内存变量，防止内存访问重排。

---

**题目 6**：AT&T 语法中，`movl $42, %eax` 对应的 Intel 语法是 ______。

**答案**：`mov eax, 42`

---

### 10.3 编程题

**题目 7**：使用内联汇编实现一个 `atomic_add(int *ptr, int value)` 函数，原子地将 `value` 加到 `*ptr`。

**参考答案**：

```c
#include <stdint.h>

static inline int atomic_add(int *ptr, int value) {
    __asm__ __volatile__(
        "lock xaddl %0, %1\n\t"
        : "=r"(value), "+m"(*ptr)
        : "0"(value)
        : "memory", "cc"
    );
    return value;  /* 返回旧值 */
}

/* 使用示例 */
int main(void) {
    int counter = 10;
    int old = atomic_add(&counter, 5);
    /* counter = 15, old = 10 */
    return 0;
}
```

---

**题目 8**：使用 `asm goto` 实现一个快速路径的自旋锁获取函数 `try_lock(atomic_int *lock)`，成功返回 1，失败返回 0。

**参考答案**：

```c
#include <stdatomic.h>

static inline int try_lock(atomic_int *lock) {
    __asm__ goto(
        "movl $1, %%eax\n\t"
        "xchgl %%eax, %0\n\t"
        "testl %%eax, %%eax\n\t"
        "jnz %l[locked]"
        :
        : "m"(*lock)
        : "eax", "memory"
        : locked
    );
    return 1;  /* 获取成功 */
locked:
    return 0;  /* 锁已被占用 */
}
```

---

### 10.4 思考题

**题目 9**：为什么 MSVC 在 x64 模式下移除了内联汇编支持？这一决定有哪些利弊？

**参考答案**：

**移除原因**：

1. **简化编译器实现**：x64 有 16 个通用寄存器，寄存器分配算法更复杂，支持内联汇编会增加编译器实现难度。
2. **推动 intrinsic 使用**：intrinsic 让编译器理解操作语义，可进行更好的优化（如常量传播、指令调度）。
3. **提升可移植性**：intrinsic 跨编译器兼容（`__rdtsc` 在 GCC/Clang/MSVC 上都有对应），内联汇编不可移植。
4. **安全性**：内联汇编可能破坏编译器假设（如堆栈对齐、寄存器保存），intrinsic 由编译器保证正确性。

**利**：

- 编译器优化更彻底。
- 代码可移植性更好。
- 减少编译器 bug。

**弊**：

- 某些指令无对应 intrinsic（如 `invlpg`、`sysenter`），需使用外部汇编。
- 迁移 32 位代码到 64 位时需重写内联汇编。
- 失去对生成代码的精确控制。

---

**题目 10**：在什么场景下应该优先使用内联汇编而非 intrinsics？反之呢？

**参考答案**：

**优先使用内联汇编的场景**：

1. **无 intrinsic 的指令**：如 `invlpg`（页表失效）、`sysenter`/`syscall`（系统调用）、`wrmsr`（写 MSR）。
2. **精确控制寄存器使用**：操作系统上下文切换需要精确保存/恢复特定寄存器。
3. **自定义指令序列**：需要精确控制指令顺序与对齐（如加密算法的常量时间实现）。
4. **`asm goto`**：需要汇编代码跳转到 C 标签的场景。
5. **学习与研究**：理解底层指令集工作原理。

**优先使用 intrinsics 的场景**：

1. **SIMD 操作**：`_mm_add_ps`、`_mm256_load_ps` 等，编译器可向量化循环。
2. **原子操作**：`__sync_...`、`__atomic_...`、`_InterlockedCompareExchange`。
3. **跨平台代码**：intrinsic 通常跨编译器兼容（通过宏抽象）。
4. **可维护性**：intrinsic 是 C 函数调用，更易读、更易调试。
5. **编译器优化**：编译器可对 intrinsic 进行常量传播、内联、指令调度。

**一般原则**：能用 intrinsic 就用 intrinsic，只有在 intrinsic 无法满足时才使用内联汇编。

---

## 11. 参考文献

[1] Brian W. Kernighan and Dennis M. Ritchie. 1988. *The C Programming Language*, 2nd ed. Prentice Hall, Englewood Cliffs, NJ. ISBN 0-13-110362-8.

[2] ISO/IEC. 2024. *ISO/IEC 9899:2024 Information technology — Programming languages — C* (C23). ISO, Geneva, Switzerland. DOI: 10.3403/9899_2024.

[3] GCC Team. 2024. *GCC Manual: Extended Asm*. Free Software Foundation. https://gcc.gnu.org/onlinedocs/gcc/Extended-Asm.html

[4] GCC Team. 2024. *GCC Manual: Basic Asm*. https://gcc.gnu.org/onlinedocs/gcc/Basic-Asm.html

[5] GCC Team. 2024. *GCC Manual: Constraints for asm Operands*. https://gcc.gnu.org/onlinedocs/gcc/Constraints.html

[6] Clang Team. 2024. *Clang Language Extensions: Inline Assembly*. LLVM Project. https://clang.llvm.org/compatibility/inline-asm.html

[7] Microsoft. 2024. *MSVC Compiler Reference: __asm*. https://learn.microsoft.com/cpp/assembler/inline/asm

[8] Microsoft. 2024. *MSVC Compiler Intrinsics*. https://learn.microsoft.com/cpp/intrinsics/compiler-intrinsics

[9] System V Application Binary Interface. 2018. *AMD64 Architecture Programmer's Manual*. System V ABI Working Group. https://refspecs.linuxbase.org/elf/x86_64-abi-0.99.pdf

[10] ARM Limited. 2023. *ARM Architecture Reference Manual (ARMv8-A)*. ARM DDI 0487. https://developer.arm.com/documentation/ddi0487/latest

[11] RISC-V International. 2024. *RISC-V Instruction Set Manual, Volume I: Unprivileged Spec*. https://riscv.org/technical/specifications/

[12] Randal E. Bryant and David R. O'Hallaron. 2015. *Computer Systems: A Programmer's Perspective*, 3rd ed. Pearson, Boston, MA. ISBN 0-13-409266-X.

[13] Intel Corporation. 2024. *Intel 64 and IA-32 Architectures Software Developer's Manual, Volume 2: Instruction Set Reference*. https://www.intel.com/sdm

[14] Hans-J. Boehm. 2009. *Threads and Shared Variables in C++0x*. HP Labs. https://www.hpl.hp.com/techreports/2008/HPL-2008-67.html

[15] Paul McKenney. 2018. *Is Parallel Programming Hard, And, If So, What Can You Do About It?* Kernel.org. https://kernel.org/pub/linux/kernel/people/paulmck/perfbook/perfbook.html

[16] Torvalds, L., et al. 2024. *Linux Kernel Source: arch/x86/include/asm/msr.h*. https://github.com/torvalds/linux/blob/master/arch/x86/include/asm/msr.h

[17] Torvalds, L., et al. 2024. *Linux Kernel Source: arch/x86/include/asm/atomic.h*. https://github.com/torvalds/linux/blob/master/arch/x86/include/asm/atomic.h

[18] OpenSSL Project. 2024. *OpenSSL Source: crypto/aes/asm/*. https://github.com/openssl/openssl/tree/master/crypto/aes/asm

[19] Redis. 2024. *Redis Source: src/atomic.h*. https://github.com/redis/redis/blob/unstable/src/atomic.h

[20] DPDK. 2024. *DPDK Source: lib/librte_eal/common/include/arch/x86/rte_atomic.h*. https://doc.dpdk.org/api/rte__atomic_8h.html

[21] SQLite. 2024. *SQLite Source: src/os_common.h*. https://www.sqlite.org/src/file/src/os_common.h

[22] Jeff Preshing. 2012. *Compiler and CPU Reordering*. Preshing on Programming. https://preshing.com/20120625/memory-ordering-at-compile-time/

[23] Matt Godbolt. 2024. *Compiler Explorer*. https://godbolt.org/

---

## 12. 延伸阅读

### 12.1 书籍

- Bryant, R. E., & O'Hallaron, D. R. *Computer Systems: A Programmer's Perspective*, 3rd ed. Pearson, 2015.（第 3 章机器级表示）
- Patterson, D. A., & Hennessy, J. L. *Computer Organization and Design RISC-V Edition*, 2nd ed. Morgan Kaufmann, 2020.（附录 A 汇编语言）
- Intel. *Intel 64 and IA-32 Architectures Software Developer's Manual*, Volume 2: Instruction Set Reference.（指令集权威参考）
- ARM. *ARM Architecture Reference Manual*（ARMv8-A）. ARM DDI 0487.（ARM 指令集）
- RISC-V International. *RISC-V Instruction Set Manual*.（RISC-V 指令集）

### 12.2 在线课程

- MIT 6.087 *Practical Programming in C*（2009）— Lecture 11: Low-Level Programming
- Stanford CS107 *Programming Paradigms* — Lecture 13-15: Assembly Language
- CMU 15-213 *CSAPP* — Lecture 6-9: Machine-Level Programming
- Berkeley CS61C *Great Ideas in Computer Architecture* — Lecture 4-6: Assembly
- MIT 6.172 *Performance Engineering* — Lecture 8: Memory Hierarchy & Vectorization

### 12.3 在线资源

- GCC Manual: *Extended Asm* — https://gcc.gnu.org/onlinedocs/gcc/Extended-Asm.html
- GCC Manual: *Constraints* — https://gcc.gnu.org/onlinedocs/gcc/Constraints.html
- Clang *Inline Assembly* — https://clang.llvm.org/compatibility/inline-asm.html
- MSVC *Inline Assembler* — https://learn.microsoft.com/cpp/assembler/inline/asm
- Compiler Explorer (godbolt.org) — https://godbolt.org/
- x86 Instruction Reference — https://www.felixcloutier.com/x86/

### 12.4 开源项目

- Linux Kernel `arch/x86/include/asm/` — x86 内联汇编头文件
- glibc `sysdeps/x86_64/` — x86_64 原子操作实现
- OpenSSL `crypto/` — 各架构加密算法汇编优化
- DPDK `lib/librte_eal/` — 高性能网络底层
- Redis `src/` — 原子操作与内存屏障使用

### 12.5 标准规范

- ISO/IEC 9899:2024 (C23) §6.10.1 Conditional inclusion（架构检测宏）
- ISO/IEC 9899:2024 (C23) §7.17 Atomics `<stdatomic.h>`
- System V AMD64 ABI v1.0 — 调用约定
- ARM AAPCS64 — ARM 过程调用标准

---

## 附录 A：术语表

| 术语 | 英文 | 定义 |
| --- | --- | --- |
| 内联汇编 | inline assembly | 在 C 代码中嵌入汇编指令 |
| 扩展内联汇编 | extended asm | GCC/Clang 的带操作数约束的内联汇编 |
| 基础内联汇编 | basic asm | 不带操作数约束的内联汇编 |
| 操作数约束 | operand constraint | 描述操作数属性的字串 |
| clobber 列表 | clobber list | 汇编代码修改的寄存器/内存列表 |
| 内存屏障 | memory barrier | 防止内存操作重排的指令 |
| 编译器屏障 | compiler barrier | 防止编译器重排的屏障 |
| 硬件屏障 | hardware barrier | 防止 CPU 乱序执行的屏障 |
| 调用约定 | calling convention | 函数调用的参数传递与寄存器规则 |
| intrinsic | 内建函数 | 编译器提供的指令封装函数 |
| AT&T 语法 | AT&T syntax | GCC 默认的汇编语法 |
| Intel 语法 | Intel syntax | MSVC/NASM 使用的汇编语法 |
| `asm goto` | asm goto | 允许跳转到 C 标签的内联汇编 |

## 附录 B：x86/x86_64 常用指令速查

### B.1 系统指令

| 指令 | 功能 | 示例 |
| --- | --- | --- |
| `rdtsc` | 读取时间戳计数器 | `rdtsc` → `edx:eax` |
| `rdtscp` | 串行化读取时间戳 | `rdtscp` → `edx:eax`, `ecx` |
| `cpuid` | CPU 特性查询 | `cpuid` (eax=leaf) → `eax/ebx/ecx/edx` |
| `mfence` | 内存全屏障 | `mfence` |
| `lfence` | 内存读屏障 | `lfence` |
| `sfence` | 内存写屏障 | `sfence` |
| `pause` | 自旋等待提示 | `pause` |
| `nop` | 空操作 | `nop` |
| `hlt` | 停机 | `hlt` |
| `invlpg` | TLB 项失效 | `invlpg [addr]` |

### B.2 原子指令

| 指令 | 功能 | 示例 |
| --- | --- | --- |
| `lock cmpxchg` | 原子比较交换 | `lock cmpxchg [mem], reg` |
| `lock xadd` | 原子加法并返回旧值 | `lock xadd [mem], reg` |
| `lock xchg` | 原子交换 | `lock xchg [mem], reg` |
| `lock inc` | 原子自增 | `lock inc [mem]` |
| `lock dec` | 原子自减 | `lock dec [mem]` |
| `lock bts` | 原子测试并设置位 | `lock bts [mem], bit` |
| `lock btr` | 原子测试并复位位 | `lock btr [mem], bit` |

### B.3 SIMD 指令

| 指令集 | 寄存器 | 典型指令 | Intrinsic |
| --- | --- | --- | --- |
| SSE | `xmm0-15`（128位） | `movdqa`, `paddd`, `mulps` | `_mm_add_ps` |
| SSE2 | `xmm0-15` | `movdqa`, `paddq`, `mulpd` | `_mm_add_pd` |
| AVX | `ymm0-15`（256位） | `vmovdqa`, `vpaddd`, `vmulps` | `_mm256_add_ps` |
| AVX2 | `ymm0-15` | `vpslld`, `vgatherdps` | `_mm256_i32gather_ps` |
| AVX-512 | `zmm0-31`（512位） | `vaddps zmm`, `vpmovm2d` | `_mm512_add_ps` |

## 附录 C：ARMv8-A 常用指令速查

| 指令 | 功能 | 示例 |
| --- | --- | --- |
| `mrs x0, cntvct_el0` | 读取虚拟计时器 | `mrs x0, cntvct_el0` |
| `dmb ish` | 数据内存屏障 | `dmb ish` |
| `dsb ish` | 数据同步屏障 | `dsb ish` |
| `isb` | 指令同步屏障 | `isb` |
| `ldxr w0, [x1]` | 独占加载 | `ldxr w0, [x1]` |
| `stxr w2, w0, [x1]` | 独占存储 | `stxr w2, w0, [x1]` |
| `casa w0, w1, [x2]` | 原子比较交换（v8.1+） | `casa w0, w1, [x2]` |
| `ldadd w0, w1, [x2]` | 原子加法（v8.1+） | `ldadd w0, w1, [x2]` |

## 附录 D：RISC-V 常用指令速查

| 指令 | 功能 | 示例 |
| --- | --- | --- |
| `rdcycle rd` | 读取周期计数器 | `rdcycle a0` |
| `rdtime rd` | 读取时间计数器 | `rdtime a0` |
| `rdinstret rd` | 读取已退休指令计数 | `rdinstret a0` |
| `fence rw, rw` | 全内存屏障 | `fence rw, rw` |
| `fence.i` | 指令屏障 | `fence.i` |
| `lr.w rd, (rs1)` | 独占加载 | `lr.w a0, (a1)` |
| `sc.w rd, rs2, (rs1)` | 独占存储 | `sc.w a0, a1, (a2)` |
| `amoswap.w rd, rs2, (rs1)` | 原子交换 | `amoswap.w a0, a1, (a2)` |
| `amoadd.w rd, rs2, (rs1)` | 原子加法 | `amoadd.w a0, a1, (a2)` |

## 附录 E：操作数约束速查

### E.1 通用约束

| 约束 | 含义 | 示例 |
| --- | --- | --- |
| `r` | 通用寄存器 | `"r"(x)` |
| `m` | 内存地址 | `"m"(x)` |
| `i` | 立即数（编译期常量） | `"i"(42)` |
| `n` | 立即数（指定位宽） | `"n"(5)` |
| `=` | 只写输出 | `"=r"(x)` |
| `+` | 读写 | `"+r"(x)` |
| `&` | 早期 clobber | `"=&r"(x)` |
| `%` | 可交换的输入 | `"%r"(x)` |

### E.2 x86 寄存器约束

| 约束 | 寄存器 |
| --- | --- |
| `a` | `eax`/`rax` |
| `b` | `ebx`/`rbx` |
| `c` | `ecx`/`rcx` |
| `d` | `edx`/`rdx` |
| `S` | `esi`/`rsi` |
| `D` | `edi`/`rdi` |
| `A` | `edx:eax`/`rdx:rax`（64位） |
| `f` | 浮点寄存器 `st(0)` |
| `t` | 浮点寄存器 `st(0)` |
| `u` | 浮点寄存器 `st(1)` |
| `x` | SSE 寄存器 `xmm` |
| `y` | MMX 寄存器 `mmx` |
| `v` | AVX 寄存器 `ymm`/`zmm` |

### E.3 ARM 寄存器约束

| 约束 | 寄存器 |
| --- | --- |
| `r` | 通用寄存器 `r0-r14` |
| `h` | 通用寄存器 `r0-r7`（Thumb） |
| `l` | 通用寄存器 `r0-r7`（ARM） |
| `k` | 通用寄存器 `r0-r15` |
| `f` | 浮点寄存器 `f0-f7` |
| `w` | NEON/VFP 寄存器 |

### E.4 RISC-V 寄存器约束

| 约束 | 寄存器 |
| --- | --- |
| `r` | 通用寄存器 `x0-x31` |
| `f` | 浮点寄存器 `f0-f31` |
| `vr` | 向量寄存器 `v0-v31` |

---

*本文档最后更新于 2026-06-14，遵循 ISO/IEC 9899:2024 (C23) 标准与 GCC 14 手册。*
