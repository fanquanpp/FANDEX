---
order: 73
title: 跨平台编程
module: c
category: C
difficulty: intermediate
description: 'C 语言跨平台编程原理、抽象层设计与工程实践'
author: fanquanpp
updated: '2026-07-21'
related:
  - c/构建系统
  - c/静态分析与调试
  - c/嵌入式C编程
  - c/C与汇编交互
  - c/属性与编译器扩展
  - c/数据类型详解
  - c/预处理器与宏
prerequisites:
  - c/概述
  - c/预处理器与宏
  - c/数据类型详解
  - c/头文件与链接
---

## 学习目标

本节遵循 Bloom 认知分类法，按"记忆 → 理解 → 应用 → 分析 → 评价 → 创造"六层级组织学习目标。读者完成本节后应能够：

- **记忆层级**：复述跨平台 C 编译器的预定义宏清单（`_WIN32`、`__linux__`、`__APPLE__`、`__GNUC__`、`__clang__`、`_MSC_VER` 等）、C 标准关于实现定义行为的规定、POSIX 与 Windows API 的核心差异。
- **理解层级**：解释字节序（endianness）的硬件根源、数据模型（ILP32/LP64/LLP64）的位宽差异、`char` 的符号性实现定义行为、ABI（应用二进制接口）对调用约定与名称修饰的影响。
- **应用层级**：使用条件编译、平台抽象层（PAL）、可移植类型（`stdint.h`）编写跨 Windows、Linux、macOS 的 C 代码，处理文件路径、线程、动态库、网络等平台相关功能。
- **分析层级**：剖析跨平台代码的可移植性陷阱（未定义行为、实现定义行为、编译器扩展依赖），识别"看似可移植实则平台相关"的代码模式。
- **评价层级**：评估在何种场景下应使用条件编译、函数指针表、抽象层接口、第三方可移植库（如 SDL、libuv、APR）等不同方案，权衡可读性、性能与维护成本。
- **创造层级**：基于平台抽象层设计一套完整的跨平台 C 项目骨架，集成构建系统（CMake）、CI/CD 矩阵测试、可移植性静态检查（cppcheck、clang-tidy）与多平台发布管理。

## 历史动机与背景

### 跨平台 C 编程的历史根源

C 语言自诞生起就与"可移植性"深度绑定。1972 年 Dennis Ritchie 在 PDP-11 上设计 C 的核心动机之一，就是用可移植的高级语言重写 Unix 内核，使其摆脱对特定硬件的依赖。1978 年 K&R《The C Programming Language》的出版，使 C 成为系统编程的事实标准。但"可移植"从来不是免费的，跨平台 C 编程的复杂性随平台多样化持续增长：

1. **1970 年代**：Unix 在 PDP-11、VAX、IBM 360 等多种架构上实现，C 编译器需适配不同字长（16 位、32 位、36 位）、不同字节序、不同对齐要求。
2. **1980 年代**：IBM PC 与 DOS 兴起，Microsoft C、Borland C 等编译器引入与 Unix 不同的 API 与 ABI。跨平台 C 编程首次面临"Unix vs Windows"分裂。
3. **1990 年代**：Windows NT 引入 Win32 API，与 POSIX 形成两大阵营。POSIX.1（IEEE 1003.1）标准化 Unix API，但 Windows 选择独立的 Win32 路线。C89/C90 标准化 C 语言，但仍保留大量实现定义行为。
4. **2000 年代**：Linux 在服务器领域崛起，64 位架构（x86-64、IA-64）普及，ILP32/LP64/LLP64 数据模型分裂显现。macOS 从 PowerPC 迁移到 Intel，再迁移到 ARM64（Apple Silicon），跨架构编译需求增长。
5. **2010 年代**：移动平台（iOS、Android）兴起，ARM 架构成为主流。容器化（Docker）与跨架构部署（x86、ARM、RISC-V）使跨平台 C 编程进入新阶段。
6. **2020 年代**：WebAssembly（Wasm）成为 C 代码的新目标平台，emcc（Emscripten）将 C 编译为浏览器可执行的 Wasm 模块。Apple Silicon（M1/M2/M3）使 mac 需同时支持 x86-64 与 ARM64 的通用二进制（universal binary）。

### 跨平台编程的核心挑战

跨平台 C 编程的核心挑战源于 C 标准的设计哲学：**将实现定义行为留给编译器**。ISO/IEC 9899 标准规定语言的核心语义，但对以下方面留有实现自由：

1. **数据类型大小**：`int` 的位宽（16/32/64）、`long` 在 64 位系统上的大小（LP64 vs LLP64）、指针大小（32 vs 64 位）。
2. **字节序**：多字节整数在内存中的字节排列顺序（大端 vs 小端）。
3. **对齐要求**：结构体成员的对齐边界、最大对齐值（`max_align_t`）。
4. **`char` 的符号性**：`char` 默认是 `signed char` 还是 `unsigned char`（ARM 默认 unsigned，x86 默认 signed）。
5. **浮点格式**：IEEE 754 单精度/双精度 vs 扩展精度（x87 80 位）。
6. **位域布局**：位序、跨存储单元、signed 位域处理（详见位域章节）。
7. **结构体填充**：成员间的填充字节大小与位置。

### 真实工程动机案例

**案例一：SQLite 的跨平台设计**。SQLite 是世界上部署最广的数据库引擎，运行在 iOS、Android、Windows、Linux、macOS、嵌入式系统等多种平台。其跨平台策略包括：用 `#ifdef` 区分平台相关功能、自研 OS 抽象层（OS Interface）、避免依赖特定编译器扩展。SQLite 源码的 30% 是平台适配代码。

**案例二：Redis 的可移植性**。Redis 6.0 支持 Linux、macOS、FreeBSD、OpenBSD、Windows（通过 WSL 或第三方分支）。核心网络 I/O 使用 `epoll`（Linux）、`kqueue`（BSD）、`select`（fallback）三种实现，通过函数指针表在运行时选择。

**案例三：libuv 的统一抽象**。Node.js 的底层库 libuv 抽象了 Windows IOCP、Linux epoll、BSD kqueue、Solaris event ports 等异步 I/O 机制，提供统一的 `uv_loop_t` 接口。libuv 的成功证明"平台抽象层"是跨平台 C 项目的有效架构模式。

**案例四：Google Protocol Buffers 的字节序处理**。Protobuf 序列化二进制数据时需处理字节序差异。其内部统一使用小端序编码，读写时通过 `htonl`/`ntohl` 或手写位运算处理，确保跨平台数据一致性。

## 形式化定义

### 跨平台可移植性的形式化定义

设程序 $P$ 在平台集合 $\mathcal{S} = \{s_1, s_2, \ldots, s_n\}$ 上运行，每个平台 $s_i$ 由其 ABI、操作系统、编译器、库版本等特征定义。程序 $P$ 在平台 $s_i$ 上的行为记为 $\text{Behavior}(P, s_i)$。

**可移植性定义**：程序 $P$ 在 $\mathcal{S}$ 上是可移植的，当且仅当：

$$
\forall s_i, s_j \in \mathcal{S}, \quad \text{Behavior}(P, s_i) \equiv \text{Behavior}(P, s_j)
$$

其中 $\equiv$ 表示语义等价（允许实现细节差异，但可观察行为一致）。

**实现定义行为**（implementation-defined behavior）：C 标准 §3.4.1 定义为"未指定行为，每个实现记录其选择"。例如 `sizeof(int)` 在不同平台为 2、4 或 8 字节。可移植代码不能依赖具体值，但可使用 `<limits.h>` 的 `INT_MAX` 等宏获取。

**未定义行为**（undefined behavior, UB）：C 标准 §3.4.3 定义为"使用不可移植或错误程序构造或错误数据时的行为，标准对此不施加任何要求"。例如有符号整数溢出、空指针解引用。可移植代码必须完全避免 UB。

**条件编译**（conditional compilation）：通过预处理器指令 `#if`/`#elif`/`#else`/`#endif` 在编译时选择平台相关代码。形式化为：

$$
\text{Compile}(P, s_i) = \text{Filter}_{\text{macro}(s_i)}(P)
$$

其中 $\text{macro}(s_i)$ 是平台 $s_i$ 的预定义宏集合，$\text{Filter}$ 保留满足条件的代码片段。

### 数据模型的形式化

数据模型描述基本数据类型的位宽。设 $W(T)$ 为类型 $T$ 的位宽，常见数据模型：

| 数据模型 | `short` | `int` | `long` | `long long` | `pointer` | 典型平台 |
|---------|---------|-------|--------|-------------|-----------|---------|
| ILP32 | 16 | 32 | 32 | 64 | 32 | 32 位 Linux/macOS/Windows |
| LP64 | 16 | 32 | 64 | 64 | 64 | 64 位 Linux/macOS |
| LLP64 | 16 | 32 | 32 | 64 | 64 | 64 位 Windows |
| ILP64 | 16 | 64 | 64 | 64 | 64 | 早期 Unix（罕见） |

形式化约束：

$$
W(\text{short}) \le W(\text{int}) \le W(\text{long}) \le W(\text{long long})
$$
$$
W(\text{pointer}) = W(\text{long}) \quad \text{(LP64/ILP64)}
$$
$$
W(\text{pointer}) = W(\text{long long}) \quad \text{(LLP64)}
$$

**可移植代码原则**：永远不要假设 `int` 能容纳指针（用 `intptr_t`），不要假设 `long` 是 64 位（用 `int64_t`），不要假设指针与 `int` 同宽。

### 字节序的形式化

字节序描述多字节整数在内存中的存储顺序。设整数 $V$ 占 $n$ 字节，其字节序列为 $b_0, b_1, \ldots, b_{n-1}$，地址从低到高。

- **小端序**（little-endian）：$b_0 = V \& 0xFF$，最低有效字节存储在最低地址。
- **大端序**（big-endian）：$b_0 = (V \gg (8(n-1))) \& 0xFF$，最高有效字节存储在最低地址。

形式化：

$$
\text{store}_{\text{LE}}(V, n) = [V \& 0xFF, (V \gg 8) \& 0xFF, \ldots, (V \gg 8(n-1)) \& 0xFF]
$$
$$
\text{store}_{\text{BE}}(V, n) = [(V \gg 8(n-1)) \& 0xFF, \ldots, (V \gg 8) \& 0xFF, V \& 0xFF]
$$

网络协议（TCP/IP）规定使用大端序（网络字节序），x86/ARM（小端模式）主机需转换。

### ABI 的形式化

ABI（Application Binary Interface）定义了编译后的二进制代码的接口规范，包括：

1. **数据类型大小与对齐**：`sizeof(int)`、`alignof(double)` 等。
2. **调用约定**（calling convention）：参数传递（寄存器 vs 栈）、返回值位置、栈帧布局。
3. **名称修饰**（name mangling）：C 函数无修饰（`extern "C"`），C++ 函数有修饰。
4. **系统调用接口**：系统调用号、参数传递方式。
5. **动态库符号表**：符号可见性、版本控制。

不同 ABI 不兼容：Windows x64 与 System V AMD64 的调用约定不同（前 4 参数 vs 前 6 参数通过寄存器传递），Linux glibc 与 musl libc 的符号版本不同，ARM AArch64 与 x86-64 的指令集完全不同。

## 理论推导

### 可移植性证明的形式化方法

**命题**：若程序 $P$ 仅使用 C 标准定义的行为（不依赖实现定义行为、未定义行为或编译器扩展），则 $P$ 在所有符合标准的平台上行为一致。

**证明**：C 标准 §5.1.2.3 规定了程序的"可观察行为"（observable behavior），包括 volatile 对象的访问、I/O 操作的顺序与内容。标准保证符合程序的可观察行为在所有实现上一致。若 $P$ 仅使用标准定义行为，则其可观察行为 $\text{Obs}(P, s_i)$ 满足：

$$
\forall s_i, s_j \in \mathcal{S}_{\text{conforming}}, \quad \text{Obs}(P, s_i) = \text{Obs}(P, s_j)
$$

其中 $\mathcal{S}_{\text{conforming}}$ 是所有符合 C 标准的平台集合。$\square$

**注意**：此证明假设编译器无 bug、标准库实现正确。实际中存在三类违反：

1. **编译器 bug**：如 GCC 早期版本的严格别名优化错误。
2. **标准库 bug**：如 glibc 某些版本的 `printf` 浮点格式化错误。
3. **标准歧义**：标准某些条款的解读存在分歧。

### 字节序无关代码的设计原理

字节序无关代码的核心原理是"按字节操作而非按整型操作"。设整数 $V$ 需写入字节缓冲区 $B$，比较两种方式：

**字节序相关方式**（不可移植）：

```c
uint32_t V = 0x12345678;
memcpy(B, &V, sizeof(V));   // B 的内容依赖主机字节序
```

**字节序无关方式**（可移植）：

```c
B[0] = (V >> 24) & 0xFF;   // 显式写出每个字节
B[1] = (V >> 16) & 0xFF;
B[2] = (V >> 8)  & 0xFF;
B[3] = V & 0xFF;
```

后者通过显式移位与掩码，保证在任何字节序主机上生成相同的字节序列（大端序）。

**性能分析**：现代编译器（GCC、Clang）能识别上述模式，优化为单条 `bswap` 指令（x86）或 `rev` 指令（ARM），性能与 `memcpy + bswap` 相当。因此字节序无关代码不会带来性能损失。

### 对齐要求与结构体填充

C 标准 §6.7.2.1 规定结构体成员的对齐要求。设结构体 $S$ 有成员 $m_1, m_2, \ldots, m_n$，类型为 $T_1, T_2, \ldots, T_n$，对齐要求为 $A_i = \text{alignof}(T_i)$。

**填充规则**：成员 $m_i$ 的偏移 $o_i$ 满足：

$$
o_i = \lceil (o_{i-1} + W(T_{i-1})) / A_i \rceil \cdot A_i
$$

结构体总大小 $W(S) = \lceil (o_n + W(T_n)) / A_{\max} \rceil \cdot A_{\max}$，其中 $A_{\max} = \max_i A_i$。

**跨平台问题**：不同平台对同一类型的对齐要求不同。例如 `double` 在 x86 Linux 上为 4 字节对齐（GCC 默认），在 x86-64 上为 8 字节对齐，在 ARM AArch64 上为 8 字节对齐（强对齐，未对齐访问触发异常）。

**可移植方案**：

1. 使用 `stdatomic.h` 的原子类型保证对齐。
2. 使用 `alignas`（C23）/ `_Alignas`（C11）显式指定对齐。
3. 序列化时按字节读写，避免结构体直接 `memcpy`。

### 编译器扩展的可移植性分析

编译器扩展（如 GCC `__attribute__`、MSVC `__declspec`）提供标准未定义的功能。跨平台代码需：

1. **检测扩展可用性**：通过 `__GNUC__`、`_MSC_VER` 等宏判断。
2. **提供回退实现**：扩展不可用时使用标准等价物或 noop。
3. **封装为统一宏**：上层代码使用统一接口，平台差异隐藏在宏定义中。

形式化：

$$
\text{Attribute}(\text{name}) = \begin{cases}
\text{GCC: } \texttt{\_\_attribute\_\_((name))} & \text{if } \texttt{\_\_GNUC\_\_} \\
\text{MSVC: } \texttt{\_\_declspec(name)} & \text{if } \texttt{\_MSC\_VER} \\
\text{C23: } \texttt{[[name]]} & \text{if } \texttt{\_\_STDC\_VERSION\_\_} \geq 202311L \\
\text{empty} & \text{otherwise}
\end{cases}
$$

## 代码示例

### 示例 1：平台检测与编译器检测

```c
/* 平台检测宏的统一封装
 * 提供统一的平台标识宏，隔离编译器与操作系统的判断逻辑
 * 上层代码使用 PLATFORM_WINDOWS 等抽象宏，不直接用 _WIN32
 */
#ifndef PLATFORM_H
#define PLATFORM_H

/* 操作系统检测（按优先级） */
#if defined(_WIN32) || defined(_WIN64)
    #define PLATFORM_WINDOWS 1
    #if defined(_WIN64)
        #define PLATFORM_WINDOWS_64 1
    #else
        #define PLATFORM_WINDOWS_32 1
    #endif
#elif defined(__linux__)
    #define PLATFORM_LINUX 1
    #if defined(__ANDROID__)
        #define PLATFORM_ANDROID 1
    #endif
#elif defined(__APPLE__) && defined(__MACH__)
    #include <TargetConditionals.h>
    #define PLATFORM_MACOS 1
    #if TARGET_OS_IPHONE
        #define PLATFORM_IOS 1
    #endif
#elif defined(__FreeBSD__)
    #define PLATFORM_FREEBSD 1
#elif defined(__OpenBSD__)
    #define PLATFORM_OPENBSD 1
#elif defined(__NetBSD__)
    #define PLATFORM_NETBSD 1
#elif defined(__unix__) || defined(__unix)
    #define PLATFORM_UNIX 1
#else
    #error "未支持的平台，请扩展平台检测宏"
#endif

/* 编译器检测 */
#if defined(__clang__)
    #define COMPILER_CLANG 1
    #define COMPILER_VERSION (__clang_major__ * 10000 + __clang_minor__ * 100 + __clang_patchlevel__)
#elif defined(__GNUC__)
    #define COMPILER_GCC 1
    #define COMPILER_VERSION (__GNUC__ * 10000 + __GNUC_MINOR__ * 100 + __GNUC_PATCHLEVEL__)
#elif defined(_MSC_VER)
    #define COMPILER_MSVC 1
    #define COMPILER_VERSION _MSC_VER
#elif defined(__INTEL_COMPILER)
    #define COMPILER_INTEL 1
    #define COMPILER_VERSION __INTEL_COMPILER
#else
    #define COMPILER_UNKNOWN 1
#endif

/* 架构检测 */
#if defined(__x86_64__) || defined(_M_X64)
    #define ARCH_X86_64 1
#elif defined(__i386__) || defined(_M_IX86)
    #define ARCH_X86 1
#elif defined(__aarch64__)
    #define ARCH_ARM64 1
#elif defined(__arm__) || defined(_M_ARM)
    #define ARCH_ARM32 1
#elif defined(__riscv)
    #define ARCH_RISCV 1
#elif defined(__powerpc64__)
    #define ARCH_PPC64 1
#endif

/* 字节序检测（编译时） */
#if defined(__BYTE_ORDER__) && __BYTE_ORDER__ == __ORDER_LITTLE_ENDIAN__
    #define ENDIAN_LITTLE 1
#elif defined(__BYTE_ORDER__) && __BYTE_ORDER__ == __ORDER_BIG_ENDIAN__
    #define ENDIAN_BIG 1
#elif defined(_WIN32)
    /* Windows 仅支持小端架构 */
    #define ENDIAN_LITTLE 1
#else
    #error "无法确定字节序，请在配置脚本中显式检测"
#endif

/* 数据模型检测 */
#if defined(_WIN64)
    #define DATA_MODEL_LLP64 1
#elif defined(__LP64__) || defined(__x86_64__) || defined(__aarch64__)
    #define DATA_MODEL_LP64 1
#elif defined(_ILP32) || defined(__ILP32__)
    #define DATA_MODEL_ILP32 1
#endif

#endif /* PLATFORM_H */
```

### 示例 2：可移植类型与精度保证

```c
#include <stdint.h>
#include <inttypes.h>
#include <limits.h>
#include <stdio.h>

/* 跨平台类型选择原则：
 * - 整数大小需精确：用 int8_t/int16_t/int32_t/int64_t
 * - 整数大小至少 N 位：用 int_least8_t/int_least16_t/...
 * - 整数大小最快 N 位：用 int_fast8_t/int_fast16_t/...
 * - 持有指针：用 intptr_t/uintptr_t
 * - 64 位整数（跨平台）：用 int64_t（不要用 long，LP64/LLP64 不同）
 */

/* 跨平台打印格式说明符：
 * C99 引入 <inttypes.h> 的 PRId8/PRId16/PRId32/PRId64
 * 避免 %lld（long long）vs %ld（long）的平台差异
 */
void print_portable_integers(void) {
    int32_t small = 42;
    int64_t large = 9223372036854775807LL;  /* INT64_MAX */

    /* PRIi32 在 LP64 上展开为 "i"，在 LLP64 上也展开为 "i"
     * PRIi64 在 LP64 上展开为 "li"，在 LLP64 上展开为 "lli"
     */
    printf("int32_t: %" PRIi32 "\n", small);
    printf("int64_t: %" PRIi64 "\n", large);
}

/* 持有指针的整数类型：跨平台安全
 * 错误：intptr_t p = (int)ptr;  // 64 位平台截断指针
 * 正确：intptr_t p = (intptr_t)ptr;
 */
void ptr_arithmetic_safe(void *ptr) {
    uintptr_t addr = (uintptr_t)ptr;

    /* 指针对齐检查：低 3 位为 0 表示 8 字节对齐 */
    int is_aligned = (addr & 7) == 0;
    printf("ptr = 0x%016" PRIxPTR ", aligned=%d\n", addr, is_aligned);
}

/* 字符宽度保证：char 始终为 1 字节，但符号性实现定义
 * 跨平台代码应显式声明 signed char 或 unsigned char
 */
void char_signedness(void) {
    /* 平台：char 在 x86 默认 signed，ARM 默认 unsigned
     * 此差异影响 0x80 是否为 -128 还是 128
     */
    unsigned char buf[4] = {0x80, 0xFF, 0x01, 0x7F};

    /* 错误：char 的符号性不定
     * char c = 0x80;
     * if (c < 0) ...  // x86: true, ARM: false
     */
    for (int i = 0; i < 4; i++) {
        printf("buf[%d] = %u (unsigned)\n", i, (unsigned)buf[i]);
    }
}

/* SIZE_MAX 跨平台：表示 size_t 的最大值 */
#include <stdint.h>
size_t safe_mul(size_t a, size_t b) {
    /* 乘法溢出检查（跨平台） */
    if (a != 0 && b > SIZE_MAX / a) {
        return 0;  /* 溢出，返回错误 */
    }
    return a * b;
}
```

### 示例 3：跨平台路径处理

```c
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <limits.h>

/* 路径分隔符抽象 */
#ifdef _WIN32
    #define PATH_SEP '\\'
    #define PATH_SEP_STR "\\"
    #define PATH_LIST_SEP ';'   /* PATH 环境变量分隔符 */
#else
    #define PATH_SEP '/'
    #define PATH_SEP_STR "/"
    #define PATH_LIST_SEP ':'
#endif

/* 跨平台路径最大长度
 * Windows: MAX_PATH = 260（可扩展到 32767 用 \\?\ 前缀）
 * Linux:   PATH_MAX = 4096
 * macOS:   PATH_MAX = 1024
 */
#ifdef _WIN32
    #include <windows.h>
    #define PORTABLE_PATH_MAX MAX_PATH
#else
    #include <limits.h>
    #ifdef PATH_MAX
        #define PORTABLE_PATH_MAX PATH_MAX
    #else
        #define PORTABLE_PATH_MAX 4096
    #endif
#endif

/* 路径拼接（跨平台安全）
 * 自动处理分隔符，去除多余的斜杠
 * 返回 0 成功，-1 失败（缓冲区不足）
 */
int path_join(char *buf, size_t buf_size, const char *dir, const char *name) {
    size_t dir_len = strlen(dir);
    size_t name_len = strlen(name);

    /* 去除目录末尾的分隔符（支持 / 和 \） */
    while (dir_len > 0 && (dir[dir_len - 1] == '/' || dir[dir_len - 1] == '\\')) {
        dir_len--;
    }

    /* 检查缓冲区大小：dir + sep + name + '\0' */
    if (dir_len + 1 + name_len + 1 > buf_size) {
        return -1;
    }

    /* 复制目录部分 */
    memcpy(buf, dir, dir_len);
    buf[dir_len] = PATH_SEP;
    memcpy(buf + dir_len + 1, name, name_len);
    buf[dir_len + 1 + name_len] = '\0';

    return 0;
}

/* 路径规范化（简化版，不处理 .. 与 . ）
 * 完整实现参考 realpath()（POSIX）或 _fullpath()（Windows）
 */
char *path_normalize(const char *path) {
#ifdef _WIN32
    return _fullpath(NULL, path, PORTABLE_PATH_MAX);
#else
    return realpath(path, NULL);  /* NULL 表示自动 malloc */
#endif
}

/* 获取用户主目录（跨平台） */
const char *get_home_dir(void) {
#ifdef _WIN32
    /* Windows: 优先 USERPROFILE，其次 HOMEDRIVE + HOMEPATH */
    const char *home = getenv("USERPROFILE");
    if (home) return home;

    static char buf[PORTABLE_PATH_MAX];
    const char *drive = getenv("HOMEDRIVE");
    const char *path = getenv("HOMEPATH");
    if (drive && path) {
        snprintf(buf, sizeof(buf), "%s%s", drive, path);
        return buf;
    }
    return NULL;
#else
    /* Unix: $HOME */
    const char *home = getenv("HOME");
    if (home) return home;
    return NULL;  /* 严重错误，应查 passwd */
#endif
}

int main(void) {
    char path[PORTABLE_PATH_MAX];

    /* 跨平台路径拼接 */
    path_join(path, sizeof(path), "/home/user/", "documents/file.txt");
    printf("Path: %s\n", path);

    path_join(path, sizeof(path), "C:\\Users\\test", "file.txt");
    printf("Path: %s\n", path);

    /* 获取主目录 */
    const char *home = get_home_dir();
    if (home) {
        printf("Home: %s\n", home);
    }

    return 0;
}
```

### 示例 4：跨平台休眠与时间

```c
#include <stdio.h>
#include <time.h>

#ifdef _WIN32
    #include <windows.h>
#else
    #include <unistd.h>
    #include <sys/time.h>
#endif

/* 跨平台毫秒级休眠
 * Windows: Sleep()（毫秒）
 * Unix:    nanosleep()（纳秒精度）
 * 旧 Unix: usleep()（已废弃，不推荐）
 */
void sleep_ms(unsigned int milliseconds) {
#ifdef _WIN32
    Sleep(milliseconds);
#else
    struct timespec ts;
    ts.tv_sec = milliseconds / 1000;
    ts.tv_nsec = (milliseconds % 1000) * 1000000L;
    nanosleep(&ts, NULL);  /* 不处理 EINTR，简化处理 */
#endif
}

/* 跨平台获取高精度时间戳（毫秒）
 * Windows: QueryPerformanceCounter（高精度）
 * Unix:    clock_gettime(CLOCK_MONOTONIC)（单调时钟）
 */
uint64_t get_time_ms(void) {
#ifdef _WIN32
    static LARGE_INTEGER freq = {0};
    if (freq.QuadPart == 0) {
        QueryPerformanceFrequency(&freq);
    }
    LARGE_INTEGER now;
    QueryPerformanceCounter(&now);
    /* 转换为毫秒 */
    return (uint64_t)(now.QuadPart * 1000 / freq.QuadPart);
#else
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)ts.tv_sec * 1000 + (uint64_t)ts.tv_nsec / 1000000;
#endif
}

/* 跨平台获取墙上时间（wall clock）
 * 用于日志时间戳，不可用于性能测量（可能回拨）
 */
void get_current_datetime(char *buf, size_t buf_size) {
    time_t now = time(NULL);
    struct tm *tm_info;

#ifdef _WIN32
    /* Windows: localtime_s 是安全版本（参数顺序与 Unix 相反） */
    struct tm tm_local;
    localtime_s(&tm_local, &now);
    tm_info = &tm_local;
#else
    /* Unix: localtime_r 是可重入版本 */
    struct tm tm_local;
    localtime_r(&now, &tm_local);
    tm_info = &tm_local;
#endif

    /* ISO 8601 格式：2026-07-21T15:30:00 */
    strftime(buf, buf_size, "%Y-%m-%dT%H:%M:%S", tm_info);
}

/* 跨平台定时器示例：测量代码执行时间 */
void benchmark_example(void) {
    uint64_t start = get_time_ms();

    /* 待测代码 */
    volatile double sum = 0;
    for (int i = 0; i < 1000000; i++) {
        sum += i * 0.001;
    }

    uint64_t end = get_time_ms();
    printf("耗时: %llu ms\n", (unsigned long long)(end - start));
}
```

### 示例 5：跨平台文件操作

```c
#include <stdio.h>
#include <string.h>
#include <errno.h>

#ifdef _WIN32
    /* Windows: 使用 _s 后缀的安全版本，并处理 UTF-8 路径 */
    #include <windows.h>
    #include <io.h>
    #include <direct.h>
    #define mkdir(path, mode) _mkdir(path)
    #define access(path, mode) _access(path, mode)
    #define F_OK 0
    #define W_OK 2
    #define R_OK 4
    typedef struct _stat stat_t;
    #define portable_stat(path, st) _stat(path, st)
#else
    #include <unistd.h>
    #include <sys/stat.h>
    #include <sys/types.h>
    typedef struct stat stat_t;
    #define portable_stat(path, st) stat(path, st)
#endif

/* 跨平台文件存在性检查 */
int file_exists(const char *path) {
    return access(path, F_OK) == 0;
}

/* 跨平台文件大小获取（64 位安全） */
long long file_size(const char *path) {
    stat_t st;
    if (portable_stat(path, &st) != 0) {
        return -1;
    }
#ifdef _WIN32
    return (long long)st.st_size;
#else
    return (long long)st.st_size;
#endif
}

/* 跨平台目录创建（递归）
 * 类似 mkdir -p，自动创建中间目录
 */
int mkdir_p(const char *path, int mode) {
    char tmp[1024];
    size_t len = strlen(path);
    if (len >= sizeof(tmp)) return -1;
    memcpy(tmp, path, len + 1);

    /* 去除末尾分隔符 */
    if (tmp[len - 1] == '/' || tmp[len - 1] == '\\') {
        tmp[len - 1] = '\0';
    }

    /* 逐级创建 */
    for (char *p = tmp + 1; *p; p++) {
        if (*p == '/' || *p == '\\') {
            *p = '\0';
            if (mkdir(tmp, mode) != 0 && errno != EEXIST) {
                return -1;
            }
            *p = '/';
        }
    }
    if (mkdir(tmp, mode) != 0 && errno != EEXIST) {
        return -1;
    }
    return 0;
}

/* 跨平台临时文件创建
 * Windows: GetTempFileName
 * Unix:    mkstemp（安全，避免竞态）
 */
FILE *portable_tmpfile(char *path_buf, size_t path_size) {
#ifdef _WIN32
    char tmp_dir[MAX_PATH];
    GetTempPath(MAX_PATH, tmp_dir);
    UINT unique = GetTempFileName(tmp_dir, "tmp", 0, path_buf);
    if (unique == 0) return NULL;
    return fopen(path_buf, "w+b");
#else
    strcpy(path_buf, "/tmp/tmpXXXXXX");
    int fd = mkstemp(path_buf);  /* mkstemp 自动创建文件，避免竞态 */
    if (fd < 0) return NULL;
    return fdopen(fd, "w+b");
#endif
}

/* 跨平台内存映射文件（简化版）
 * Windows: CreateFileMapping + MapViewOfFile
 * Unix:    mmap + munmap
 */
#ifdef _WIN32
typedef struct {
    HANDLE hFile;
    HANDLE hMapping;
    void *data;
    size_t size;
} PortableMMap;

PortableMMap portable_mmap(const char *path, int readonly) {
    PortableMMap m = {0};
    DWORD access = readonly ? GENERIC_READ : GENERIC_READ | GENERIC_WRITE;
    DWORD share = readonly ? FILE_SHARE_READ : 0;
    DWORD prot = readonly ? PAGE_READONLY : PAGE_READWRITE;

    m.hFile = CreateFileA(path, access, share, NULL, OPEN_EXISTING, 0, NULL);
    if (m.hFile == INVALID_HANDLE_VALUE) return m;

    LARGE_INTEGER fs;
    GetFileSizeEx(m.hFile, &fs);
    m.size = (size_t)fs.QuadPart;

    m.hMapping = CreateFileMappingA(m.hFile, NULL, prot, 0, 0, NULL);
    if (!m.hMapping) {
        CloseHandle(m.hFile);
        return m;
    }

    m.data = MapViewOfFile(m.hMapping, readonly ? FILE_MAP_READ : FILE_MAP_ALL_ACCESS, 0, 0, 0);
    return m;
}

void portable_munmap(PortableMMap *m) {
    if (m->data) UnmapViewOfFile(m->data);
    if (m->hMapping) CloseHandle(m->hMapping);
    if (m->hFile) CloseHandle(m->hFile);
    memset(m, 0, sizeof(*m));
}
#else
#include <sys/mman.h>
#include <fcntl.h>

typedef struct {
    int fd;
    void *data;
    size_t size;
} PortableMMap;

PortableMMap portable_mmap(const char *path, int readonly) {
    PortableMMap m = {0};
    int flags = readonly ? O_RDONLY : O_RDWR;
    int prot = readonly ? PROT_READ : PROT_READ | PROT_WRITE;

    m.fd = open(path, flags);
    if (m.fd < 0) return m;

    struct stat st;
    if (fstat(m.fd, &st) != 0) {
        close(m.fd);
        m.fd = -1;
        return m;
    }
    m.size = st.st_size;

    m.data = mmap(NULL, m.size, prot, MAP_SHARED, m.fd, 0);
    if (m.data == MAP_FAILED) {
        close(m.fd);
        m.fd = -1;
        m.data = NULL;
    }
    return m;
}

void portable_munmap(PortableMMap *m) {
    if (m->data) munmap(m->data, m->size);
    if (m->fd >= 0) close(m->fd);
    memset(m, 0, sizeof(*m));
}
#endif
```

### 示例 6：跨平台动态库加载

```c
#include <stdio.h>

#ifdef _WIN32
    #include <windows.h>
    typedef HMODULE lib_handle_t;
    #define LIB_LOAD(path)       LoadLibraryA(path)
    #define LIB_SYM(handle, name) GetProcAddress(handle, name)
    #define LIB_CLOSE(handle)    FreeLibrary(handle)
#else
    #include <dlfcn.h>
    typedef void *lib_handle_t;
    #define LIB_LOAD(path)       dlopen(path, RTLD_LAZY | RTLD_LOCAL)
    #define LIB_SYM(handle, name) dlsym(handle, name)
    #define LIB_CLOSE(handle)    dlclose(handle)
#endif

/* 动态库加载器封装 */
typedef struct {
    lib_handle_t handle;
    const char *last_error;
} DynamicLib;

/* 加载动态库
 * path: 库文件路径
 * 返回：成功 0，失败 -1
 */
int dynlib_load(DynamicLib *lib, const char *path) {
    lib->handle = LIB_LOAD(path);
    if (!lib->handle) {
#ifdef _WIN32
        /* Windows 错误码通过 GetLastError 获取 */
        static char err_buf[256];
        FormatMessageA(FORMAT_MESSAGE_FROM_SYSTEM, NULL,
            GetLastError(), 0, err_buf, sizeof(err_buf), NULL);
        lib->last_error = err_buf;
#else
        lib->last_error = dlerror();
#endif
        return -1;
    }
    lib->last_error = NULL;
    return 0;
}

/* 获取函数符号 */
void *dynlib_get_func(DynamicLib *lib, const char *name) {
    void *sym = (void *)LIB_SYM(lib->handle, name);
    if (!sym) {
#ifndef _WIN32
        lib->last_error = dlerror();
#endif
    }
    return sym;
}

/* 关闭动态库 */
void dynlib_close(DynamicLib *lib) {
    if (lib->handle) {
        LIB_CLOSE(lib->handle);
        lib->handle = NULL;
    }
}

/* 使用示例：跨平台加载 libm 并调用 sqrt */
typedef double (*sqrt_func_t)(double);

int main(void) {
    DynamicLib lib;
    /* 库路径跨平台：Linux: libm.so.6, macOS: libm.dylib, Windows: 不存在（数学函数在 msvcrt.dll） */
#ifdef _WIN32
    const char *lib_path = "msvcrt.dll";
#elif defined(__APPLE__)
    const char *lib_path = "/usr/lib/libSystem.dylib";
#else
    const char *lib_path = "libm.so.6";
#endif

    if (dynlib_load(&lib, lib_path) != 0) {
        fprintf(stderr, "加载库失败: %s\n", lib.last_error);
        return 1;
    }

    sqrt_func_t my_sqrt = (sqrt_func_t)dynlib_get_func(&lib, "sqrt");
    if (!my_sqrt) {
        fprintf(stderr, "找不到 sqrt 符号\n");
        dynlib_close(&lib);
        return 1;
    }

    printf("sqrt(2.0) = %f\n", my_sqrt(2.0));
    dynlib_close(&lib);
    return 0;
}
```

### 示例 7：跨平台字节序处理

```c
#include <stdio.h>
#include <stdint.h>
#include <string.h>

/* 字节序检测（运行时）
 * 编译时检测更优：见示例 1 的 ENDIAN_LITTLE/ENDIAN_BIG 宏
 */
int is_little_endian_runtime(void) {
    /* 联合体法：利用内存布局判断
     * 注意：严格别名规则下，此代码在 C 中合法（联合体允许读取非活跃成员）
     */
    union {
        uint16_t value;
        uint8_t bytes[2];
    } test;
    test.value = 0x0001;
    return test.bytes[0] == 1;
}

/* 字节序检测（编译时，更优）
 * 利用 C99 复合字面量（C99+）或静态数组初始化
 */
#define IS_LITTLE_ENDIAN_CTM \
    ((union { uint16_t v; uint8_t b[2]; }){ .v = 1 }.b[0] == 1)

/* 16/32/64 位字节序翻转 */
uint16_t swap16(uint16_t v) {
    return (uint16_t)((v >> 8) | (v << 8));
}

uint32_t swap32(uint32_t v) {
    return ((v & 0xFF000000) >> 24) |
           ((v & 0x00FF0000) >> 8)  |
           ((v & 0x000000FF) << 24) |
           ((v & 0x0000FF00) << 8);
}

uint64_t swap64(uint64_t v) {
    return ((v & 0xFF00000000000000ULL) >> 56) |
           ((v & 0x00FF000000000000ULL) >> 40) |
           ((v & 0x0000FF0000000000ULL) >> 24) |
           ((v & 0x000000FF00000000ULL) >> 8)  |
           ((v & 0x00000000FF000000ULL) << 8)  |
           ((v & 0x0000000000FF0000ULL) << 24) |
           ((v & 0x000000000000FF00ULL) << 40) |
           ((v & 0x00000000000000FFULL) << 56);
}

/* 主机序 → 小端序（写入缓冲区）
 * 若主机为大端，需翻转；小端则直接复制
 */
void host_to_le16(uint8_t *buf, uint16_t v) {
#ifdef ENDIAN_LITTLE
    memcpy(buf, &v, 2);
#else
    buf[0] = v & 0xFF;
    buf[1] = (v >> 8) & 0xFF;
#endif
}

void host_to_le32(uint8_t *buf, uint32_t v) {
#ifdef ENDIAN_LITTLE
    memcpy(buf, &v, 4);
#else
    buf[0] = v & 0xFF;
    buf[1] = (v >> 8) & 0xFF;
    buf[2] = (v >> 16) & 0xFF;
    buf[3] = (v >> 24) & 0xFF;
#endif
}

/* 小端序 → 主机序（从缓冲区读取） */
uint16_t le16_to_host(const uint8_t *buf) {
#ifdef ENDIAN_LITTLE
    uint16_t v;
    memcpy(&v, buf, 2);
    return v;
#else
    return (uint16_t)buf[0] | ((uint16_t)buf[1] << 8);
#endif
}

uint32_t le32_to_host(const uint8_t *buf) {
#ifdef ENDIAN_LITTLE
    uint32_t v;
    memcpy(&v, buf, 4);
    return v;
#else
    return (uint32_t)buf[0] |
           ((uint32_t)buf[1] << 8)  |
           ((uint32_t)buf[2] << 16) |
           ((uint32_t)buf[3] << 24);
#endif
}

/* 大端序（网络序）转换 */
void host_to_be32(uint8_t *buf, uint32_t v) {
    buf[0] = (v >> 24) & 0xFF;
    buf[1] = (v >> 16) & 0xFF;
    buf[2] = (v >> 8) & 0xFF;
    buf[3] = v & 0xFF;
}

uint32_t be32_to_host(const uint8_t *buf) {
    return ((uint32_t)buf[0] << 24) |
           ((uint32_t)buf[1] << 16) |
           ((uint32_t)buf[2] << 8)  |
           (uint32_t)buf[3];
}

/* 使用 <arpa/inet.h>（POSIX）或 Winsock2（Windows）的内置函数
 * htonl/ntohl/htons/ntohs 处理 16/32 位网络序
 * 注意：标准库不提供 64 位转换，需自行实现
 */
#ifdef _WIN32
    #include <winsock2.h>
    #pragma comment(lib, "ws2_32.lib")
#else
    #include <arpa/inet.h>
#endif

void network_byte_order_example(void) {
    uint32_t host_val = 0x12345678;
    uint32_t net_val = htonl(host_val);
    /* net_val 在所有平台上都是 0x12345678（大端序存储） */
    printf("host: 0x%08X, net: 0x%08X\n", host_val, net_val);
}

int main(void) {
    printf("字节序: %s\n", is_little_endian_runtime() ? "小端" : "大端");

    uint8_t buf[4];
    host_to_le32(buf, 0x12345678);
    printf("LE 编码: %02X %02X %02X %02X\n", buf[0], buf[1], buf[2], buf[3]);

    host_to_be32(buf, 0x12345678);
    printf("BE 编码: %02X %02X %02X %02X\n", buf[0], buf[1], buf[2], buf[3]);

    network_byte_order_example();
    return 0;
}
```

### 示例 8：跨平台线程与同步

```c
#include <stdio.h>
#include <stdint.h>

/* C11 线程（推荐，标准接口）
 * 需要支持 C11 的编译器与库：GCC 11+、Clang 12+、MSVC 19.29+
 * 若 C11 不可用，回退到 pthread（Unix）或 Windows 线程
 */
#if defined(__STDC_VERSION__) && __STDC_VERSION__ >= 201112L \
    && !defined(__STDC_NO_THREADS__)
    #include <threads.h>
    #define USE_C11_THREADS 1
#elif defined(_WIN32)
    #include <windows.h>
    #define USE_WIN_THREADS 1
#else
    #include <pthread.h>
    #define USE_PTHREADS 1
#endif

/* 线程句柄抽象 */
typedef
#if defined(USE_C11_THREADS)
    thrd_t
#elif defined(USE_WIN_THREADS)
    HANDLE
#else
    pthread_t
#endif
    thread_t;

/* 互斥锁抽象 */
typedef
#if defined(USE_C11_THREADS)
    mtx_t
#elif defined(USE_WIN_THREADS)
    CRITICAL_SECTION
#else
    pthread_mutex_t
#endif
    mutex_t;

/* 互斥锁操作 */
int mutex_init(mutex_t *m) {
#if defined(USE_C11_THREADS)
    return mtx_init(m, mtx_plain) == thrd_success ? 0 : -1;
#elif defined(USE_WIN_THREADS)
    InitializeCriticalSection(m);
    return 0;
#else
    return pthread_mutex_init(m, NULL) == 0 ? 0 : -1;
#endif
}

void mutex_lock(mutex_t *m) {
#if defined(USE_C11_THREADS)
    mtx_lock(m);
#elif defined(USE_WIN_THREADS)
    EnterCriticalSection(m);
#else
    pthread_mutex_lock(m);
#endif
}

void mutex_unlock(mutex_t *m) {
#if defined(USE_C11_THREADS)
    mtx_unlock(m);
#elif defined(USE_WIN_THREADS)
    LeaveCriticalSection(m);
#else
    pthread_mutex_unlock(m);
#endif
}

void mutex_destroy(mutex_t *m) {
#if defined(USE_C11_THREADS)
    mtx_destroy(m);
#elif defined(USE_WIN_THREADS)
    DeleteCriticalSection(m);
#else
    pthread_mutex_destroy(m);
#endif
}

/* 线程函数签名（统一为返回 int，接收 void*） */
typedef int (*thread_func_t)(void *arg);

int thread_create(thread_t *t, thread_func_t func, void *arg) {
#if defined(USE_C11_THREADS)
    return thrd_create(t, func, arg) == thrd_success ? 0 : -1;
#elif defined(USE_WIN_THREADS)
    DWORD tid;
    *t = CreateThread(NULL, 0, (LPTHREAD_START_ROUTINE)func, arg, 0, &tid);
    return *t != NULL ? 0 : -1;
#else
    return pthread_create(t, NULL, (void *(*)(void *))func, arg) == 0 ? 0 : -1;
#endif
}

int thread_join(thread_t t) {
#if defined(USE_C11_THREADS)
    int code;
    return thrd_join(t, &code) == thrd_success ? 0 : -1;
#elif defined(USE_WIN_THREADS)
    WaitForSingleObject(t, INFINITE);
    CloseHandle(t);
    return 0;
#else
    return pthread_join(t, NULL) == 0 ? 0 : -1;
#endif
}

/* 示例：跨平台线程安全的计数器 */
typedef struct {
    mutex_t mutex;
    int64_t value;
} SafeCounter;

void counter_init(SafeCounter *c) {
    mutex_init(&c->mutex);
    c->value = 0;
}

void counter_inc(SafeCounter *c) {
    mutex_lock(&c->mutex);
    c->value++;
    mutex_unlock(&c->mutex);
}

int64_t counter_get(SafeCounter *c) {
    int64_t v;
    mutex_lock(&c->mutex);
    v = c->value;
    mutex_unlock(&c->mutex);
    return v;
}

/* 线程入口函数 */
int worker_thread(void *arg) {
    SafeCounter *c = (SafeCounter *)arg;
    for (int i = 0; i < 100000; i++) {
        counter_inc(c);
    }
    return 0;
}

int main(void) {
    SafeCounter counter;
    counter_init(&counter);

    /* 启动 4 个线程 */
    thread_t threads[4];
    for (int i = 0; i < 4; i++) {
        if (thread_create(&threads[i], worker_thread, &counter) != 0) {
            fprintf(stderr, "线程创建失败\n");
            return 1;
        }
    }

    /* 等待所有线程完成 */
    for (int i = 0; i < 4; i++) {
        thread_join(threads[i]);
    }

    printf("最终计数: %lld (期望: 400000)\n",
           (long long)counter_get(&counter));
    return 0;
}
```

### 示例 9：跨平台原子操作

```c
#include <stdio.h>
#include <stdint.h>

/* C11 stdatomic（首选，标准接口） */
#if defined(__STDC_VERSION__) && __STDC_VERSION__ >= 201112L \
    && !defined(__STDC_NO_ATOMICS__)
    #include <stdatomic.h>
    #define USE_C11_ATOMICS 1
#elif defined(_WIN32)
    #include <windows.h>
    #define USE_WIN_ATOMICS 1
#else
    /* GCC/Clang 内建原子操作（__sync_* 与 __atomic_*） */
    #define USE_GCC_ATOMICS 1
#endif

/* 原子计数器抽象 */
typedef struct {
#if defined(USE_C11_ATOMICS)
    _Atomic int64_t value;
#elif defined(USE_WIN_ATOMICS)
    volatile LONG64 value;
#else
    volatile int64_t value;
#endif
} AtomicCounter;

void atomic_counter_set(AtomicCounter *c, int64_t v) {
#if defined(USE_C11_ATOMICS)
    atomic_store(&c->value, v);
#elif defined(USE_WIN_ATOMICS)
    InterlockedExchange64(&c->value, v);
#else
    __atomic_store_n(&c->value, v, __ATOMIC_SEQ_CST);
#endif
}

int64_t atomic_counter_inc(AtomicCounter *c) {
#if defined(USE_C11_ATOMICS)
    return atomic_fetch_add(&c->value, 1) + 1;
#elif defined(USE_WIN_ATOMICS)
    return InterlockedIncrement64(&c->value);
#else
    return __atomic_add_fetch(&c->value, 1, __ATOMIC_SEQ_CST);
#endif
}

int64_t atomic_counter_get(AtomicCounter *c) {
#if defined(USE_C11_ATOMICS)
    return atomic_load(&c->value);
#elif defined(USE_WIN_ATOMICS)
    return InterlockedExchangeAdd64(&c->value, 0);
#else
    return __atomic_load_n(&c->value, __ATOMIC_SEQ_CST);
#endif
}

/* 比较并交换（CAS） */
int atomic_cas_ptr(void **target, void *expected, void *desired) {
#if defined(USE_C11_ATOMICS)
    return atomic_compare_exchange_strong(target, expected, desired);
#elif defined(USE_WIN_ATOMICS)
    return InterlockedCompareExchangePointer(target, desired, expected) == expected;
#else
    return __atomic_compare_exchange_n(target, expected, desired, 0,
                                       __ATOMIC_SEQ_CST, __ATOMIC_SEQ_CST);
#endif
}

/* 无锁栈示例（Treiber 栈）
 * 演示跨平台原子操作在无锁数据结构中的应用
 */
typedef struct Node {
    void *data;
    struct Node *next;
#if defined(USE_C11_ATOMICS)
    _Atomic(struct Node *) next_atomic;
#endif
} Node;

/* 注意：简化示例，完整无锁栈需考虑 ABA 问题、内存回收等
 * 生产环境推荐使用 hazard pointer 或 epoch-based reclamation
 */

int main(void) {
    AtomicCounter counter;
    atomic_counter_set(&counter, 0);

    /* 单线程测试，实际应用中应由多线程调用 */
    for (int i = 0; i < 1000000; i++) {
        atomic_counter_inc(&counter);
    }

    printf("计数: %lld (期望: 1000000)\n",
           (long long)atomic_counter_get(&counter));
    return 0;
}
```

### 示例 10：跨平台进程与子进程

```c
#include <stdio.h>
#include <string.h>

#ifdef _WIN32
    #include <windows.h>
    #include <process.h>
#else
    #include <unistd.h>
    #include <sys/wait.h>
    #include <fcntl.h>
#endif

/* 跨平台执行子进程并捕获输出（简化版）
 * Windows: CreateProcess + 匿名管道
 * Unix:    fork + exec + pipe
 */

typedef struct {
    int exit_code;
    char stdout_buf[4096];
    char stderr_buf[1024];
} ProcessResult;

#ifdef _WIN32
int run_process(ProcessResult *result, const char *cmdline) {
    HANDLE stdout_read, stdout_write;
    HANDLE stderr_read, stderr_write;
    SECURITY_ATTRIBUTES sa = { sizeof(sa), NULL, TRUE };

    CreatePipe(&stdout_read, &stdout_write, &sa, 0);
    CreatePipe(&stderr_read, &stderr_write, &sa, 0);
    SetHandleInformation(stdout_read, HANDLE_FLAG_INHERIT, 0);
    SetHandleInformation(stderr_read, HANDLE_FLAG_INHERIT, 0);

    STARTUPINFOA si = {0};
    si.cb = sizeof(si);
    si.dwFlags = STARTF_USESTDHANDLES;
    si.hStdOutput = stdout_write;
    si.hStdError = stderr_write;

    PROCESS_INFORMATION pi = {0};
    if (!CreateProcessA(NULL, (LPSTR)cmdline, NULL, NULL, TRUE,
                        0, NULL, NULL, &si, &pi)) {
        return -1;
    }

    CloseHandle(stdout_write);
    CloseHandle(stderr_write);

    DWORD n;
    ReadFile(stdout_read, result->stdout_buf, sizeof(result->stdout_buf) - 1, &n, NULL);
    result->stdout_buf[n] = '\0';
    ReadFile(stderr_read, result->stderr_buf, sizeof(result->stderr_buf) - 1, &n, NULL);
    result->stderr_buf[n] = '\0';

    WaitForSingleObject(pi.hProcess, INFINITE);
    DWORD code;
    GetExitCodeProcess(pi.hProcess, &code);
    result->exit_code = (int)code;

    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);
    CloseHandle(stdout_read);
    CloseHandle(stderr_read);
    return 0;
}
#else
int run_process(ProcessResult *result, const char *cmdline) {
    int stdout_pipe[2], stderr_pipe[2];
    pipe(stdout_pipe);
    pipe(stderr_pipe);

    pid_t pid = fork();
    if (pid == 0) {
        /* 子进程 */
        close(stdout_pipe[0]);
        close(stderr_pipe[0]);
        dup2(stdout_pipe[1], STDOUT_FILENO);
        dup2(stderr_pipe[1], STDERR_FILENO);
        close(stdout_pipe[1]);
        close(stderr_pipe[1]);

        /* /bin/sh -c "cmdline" 支持管道与重定向 */
        execl("/bin/sh", "sh", "-c", cmdline, NULL);
        _exit(127);
    }

    /* 父进程 */
    close(stdout_pipe[1]);
    close(stderr_pipe[1]);

    ssize_t n;
    n = read(stdout_pipe[0], result->stdout_buf, sizeof(result->stdout_buf) - 1);
    result->stdout_buf[n > 0 ? n : 0] = '\0';
    n = read(stderr_pipe[0], result->stderr_buf, sizeof(result->stderr_buf) - 1);
    result->stderr_buf[n > 0 ? n : 0] = '\0';

    int status;
    waitpid(pid, &status, 0);
    result->exit_code = WIFEXITED(status) ? WEXITSTATUS(status) : -1;

    close(stdout_pipe[0]);
    close(stderr_pipe[0]);
    return 0;
}
#endif

int main(void) {
    ProcessResult result = {0};
#ifdef _WIN32
    run_process(&result, "ver && echo hello");
#else
    run_process(&result, "uname -a && echo hello");
#endif
    printf("exit code: %d\n", result.exit_code);
    printf("stdout: %s\n", result.stdout_buf);
    return 0;
}
```

### 示例 11：跨平台抽象层架构

```c
/* 平台抽象层（PAL）设计示例
 * 演示如何通过函数指针表实现运行时平台抽象
 * 上层代码调用统一接口，下层根据平台选择实现
 */

/* 抽象接口定义（pal.h） */
#ifndef PAL_H
#define PAL_H

#include <stdint.h>
#include <stddef.h>

/* 文件操作接口 */
typedef struct PALFile PALFile;
typedef struct {
    PALFile *(*open)(const char *path, const char *mode);
    int (*read)(PALFile *f, void *buf, size_t size);
    int (*write)(PALFile *f, const void *buf, size_t size);
    int (*close)(PALFile *f);
} PALFileOps;

/* 时间接口 */
typedef struct {
    uint64_t (*now_ms)(void);
    void (*sleep_ms)(unsigned int ms);
} PALTimeOps;

/* 线程接口 */
typedef struct PALThread PALThread;
typedef struct {
    int (*create)(PALThread **t, void (*func)(void *), void *arg);
    int (*join)(PALThread *t);
    void (*yield)(void);
} PALThreadOps;

/* 网络 I/O 接口（简化） */
typedef struct {
    int (*socket_create)(int domain, int type, int protocol);
    int (*connect)(int fd, const char *host, int port);
    int (*send)(int fd, const void *buf, size_t size);
    int (*recv)(int fd, void *buf, size_t size);
    int (*close)(int fd);
} PALNetOps;

/* 完整的 PAL 接口表 */
typedef struct {
    PALFileOps   file;
    PALTimeOps   time;
    PALThreadOps thread;
    PALNetOps    net;
} PALOps;

/* 获取 PAL 接口（平台相关实现） */
const PALOps *pal_get_ops(void);

#endif /* PAL_H */

/* 上层代码使用 PAL（不感知平台） */
#include "pal.h"

void app_main(void) {
    const PALOps *pal = pal_get_ops();

    /* 写文件 */
    PALFile *f = pal->file.open("test.txt", "w");
    pal->file.write(f, "hello", 5);
    pal->file.close(f);

    /* 获取时间 */
    uint64_t start = pal->time.now_ms();
    pal->time.sleep_ms(100);
    uint64_t end = pal->time.now_ms();
    printf("耗时: %llu ms\n", (unsigned long long)(end - start));
}
```

### 示例 12：跨平台错误处理

```c
#include <stdio.h>
#include <string.h>
#include <errno.h>

#ifdef _WIN32
    #include <windows.h>
#endif

/* 跨平台获取错误消息
 * Unix:    errno + strerror_r
 * Windows: GetLastError + FormatMessage
 */

/* 统一错误码（应用自定义，不依赖平台） */
typedef enum {
    ERR_OK = 0,
    ERR_NOT_FOUND = 1,
    ERR_PERMISSION = 2,
    ERR_IO = 3,
    ERR_NETWORK = 4,
    ERR_UNKNOWN = 99
} ErrorCode;

/* 获取错误消息字符串 */
const char *error_message(ErrorCode code) {
    switch (code) {
        case ERR_OK:         return "成功";
        case ERR_NOT_FOUND:  return "未找到";
        case ERR_PERMISSION: return "权限不足";
        case ERR_IO:         return "I/O 错误";
        case ERR_NETWORK:    return "网络错误";
        default:             return "未知错误";
    }
}

/* 将平台错误码转换为应用错误码 */
ErrorCode translate_errno(int err) {
    switch (err) {
        case 0:      return ERR_OK;
        case ENOENT: return ERR_NOT_FOUND;
        case EACCES: return ERR_PERMISSION;
        case EIO:    return ERR_IO;
        case ECONNREFUSED:
        case ENETUNREACH:
                     return ERR_NETWORK;
        default:     return ERR_UNKNOWN;
    }
}

#ifdef _WIN32
ErrorCode translate_win32(DWORD err) {
    switch (err) {
        case ERROR_SUCCESS:        return ERR_OK;
        case ERROR_FILE_NOT_FOUND:
        case ERROR_PATH_NOT_FOUND: return ERR_NOT_FOUND;
        case ERROR_ACCESS_DENIED:  return ERR_PERMISSION;
        case WSAECONNREFUSED:
        case WSAENETUNREACH:       return ERR_NETWORK;
        default:                   return ERR_UNKNOWN;
    }
}
#endif

/* 跨平台获取系统错误消息 */
void get_system_error(char *buf, size_t buf_size) {
#ifdef _WIN32
    DWORD err = GetLastError();
    if (err == 0) {
        strncpy(buf, "无错误", buf_size);
        return;
    }
    FormatMessageA(FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
                   NULL, err, 0, buf, (DWORD)buf_size, NULL);
#else
    int err = errno;
    if (err == 0) {
        strncpy(buf, "无错误", buf_size);
        return;
    }
    /* strerror_r 是可重入版本 */
    strerror_r(err, buf, buf_size);
#endif
}

/* 错误处理宏：检查返回值并跳转到清理标签 */
#define CHECK(cond, code, label) \
    do { \
        if (!(cond)) { \
            fprintf(stderr, "[%s:%d] 错误: %s\n", \
                    __FILE__, __LINE__, error_message(code)); \
            result = (code); \
            goto label; \
        } \
    } while (0)

/* 使用示例 */
int example_function(void) {
    ErrorCode result = ERR_OK;
    FILE *f = NULL;

    f = fopen("nonexistent.txt", "r");
    CHECK(f != NULL, translate_errno(errno), cleanup);

    /* 文件操作... */

cleanup:
    if (f) fclose(f);
    return (int)result;
}
```

## 对比分析

### 跨平台抽象方案对比

| 方案 | 优势 | 劣势 | 适用场景 |
|------|------|------|---------|
| 条件编译（`#ifdef`） | 无运行时开销，简单直接 | 代码可读性差，维护困难，测试组合爆炸 | 简单适配，少量差异 |
| 平台抽象层（PAL） | 接口统一，可测试性强，扩展性好 | 有间接调用开销，需设计接口 | 中大型项目，多平台支持 |
| 第三方可移植库 | 成熟稳定，功能完整，社区支持 | 增加依赖，可能引入安全风险 | 通用功能（线程、网络、I/O） |
| 函数指针表 | 运行时可选实现，灵活 | 有间接调用开销，调试稍复杂 | 需要运行时选择实现的场景 |
| 虚函数表（OOP 风格） | 类型安全，支持多态 | C 实现 OOP 较繁琐 | 复杂的对象模型 |
| 编译时多态（宏） | 零开销，编译期确定 | 调试困难，错误信息冗长 | 性能敏感场景 |

### 主要平台 API 对比

| 功能 | POSIX（Linux/macOS） | Windows（Win32） | 差异说明 |
|------|---------------------|------------------|---------|
| 线程 | pthread_create | CreateThread | 参数传递、返回值不同 |
| 互斥锁 | pthread_mutex_t | CRITICAL_SECTION | Windows 走用户态，POSIX 可配 |
| 文件操作 | open/read/write | CreateFile/ReadFile/WriteFile | 句柄语义不同 |
| 目录操作 | opendir/readdir | FindFirstFile/FindNextFile | 迭代模型不同 |
| 网络 I/O | socket/connect/send/recv | WSAStartup/socket/connect | 需初始化 Winsock |
| 高效 I/O | epoll/kqueue | IOCP | 模型差异大 |
| 信号 | signal/sigaction | SetConsoleCtrlHandler | Windows 信号模型简化 |
| 共享内存 | shmget/mmap | CreateFileMapping | API 完全不同 |
| 动态库 | dlopen/dlsym | LoadLibrary/GetProcAddress | 错误处理不同 |
| 时间 | clock_gettime | QueryPerformanceCounter | 精度与实现不同 |
| 环境 | getenv/setenv | getenv/SetEnvironmentVariable | 线程安全性不同 |

### 跨平台库生态对比

| 库 | 覆盖范围 | 许可证 | 体积 | 适用场景 |
|----|---------|--------|------|---------|
| glib | 通用工具、数据结构、线程 | LGPL | 大 | GNOME 生态，通用基础库 |
| libuv | 异步 I/O、事件循环 | MIT | 中 | Node.js 底层，跨平台网络 |
| SDL | 多媒体、图形、输入 | zlib | 中 | 游戏开发，跨平台多媒体 |
| APR | Apache 可移植运行时 | Apache 2.0 | 中 | Apache HTTPD，通用网络 |
| Boost（C++） | 通用框架，覆盖广泛 | Boost | 极大 | C++ 项目（C 项目不适用） |
| pthread-win32 | POSIX 线程的 Windows 实现 | LGPL | 小 | 移植 POSIX 代码到 Windows |

## 常见陷阱

### 陷阱 1：假设 `int` 与指针同宽

**问题**：64 位平台上 `int` 仍是 32 位，但指针是 64 位，将指针强转为 `int` 会截断。

**错误示例**：

```c
int addr = (int)ptr;           /* 64 位平台：指针被截断 */
void *p = (void *)addr;        /* 高 32 位丢失 */
```

**正确做法**：

```c
#include <stdint.h>
intptr_t addr = (intptr_t)ptr; /* 保证与指针同宽 */
void *p = (void *)addr;        /* 完整恢复 */
```

### 陷阱 2：`char` 符号性陷阱

**问题**：`char` 默认是 `signed` 还是 `unsigned` 由实现定义。x86 默认 `signed`，ARM 默认 `unsigned`。

**错误示例**：

```c
char c = 0x80;
if (c < 0) {                   /* x86: true, ARM: false */
    /* ... */
}
```

**正确做法**：

```c
signed char c = 0x80;          /* 显式指定 */
/* 或 */
unsigned char c = 0x80;
```

### 陷阱 3：结构体直接 memcpy 的对齐问题

**问题**：不同平台对结构体的对齐要求不同，直接 `memcpy` 结构体到字节缓冲区可能导致对齐错误或数据不一致。

**错误示例**：

```c
struct Header {
    uint16_t a;
    uint32_t b;
} h = {1, 2};

uint8_t buf[sizeof(h)];
memcpy(buf, &h, sizeof(h));   /* 平台相关：填充字节内容不定 */
```

**正确做法**：序列化时按字节读写，或使用 `#pragma pack(1)`（但牺牲性能）：

```c
/* 按字节序列化（推荐） */
buf[0] = h.a & 0xFF;
buf[1] = (h.a >> 8) & 0xFF;
buf[2] = h.b & 0xFF;
buf[3] = (h.b >> 8) & 0xFF;
buf[4] = (h.b >> 16) & 0xFF;
buf[5] = (h.b >> 24) & 0xFF;
```

### 陷阱 4：未定义行为依赖编译器优化

**问题**：有符号整数溢出是 UB，GCC 与 Clang 在 `-O2` 下会假设不溢出，导致不同编译器行为不同。

**错误示例**：

```c
int add(int a, int b) {
    return a + b;              /* 若溢出，UB */
}
```

**正确做法**：

```c
#include <stdbool.h>
bool safe_add(int a, int b, int *result) {
    if ((b > 0 && a > INT_MAX - b) || (b < 0 && a < INT_MIN - b)) {
        return false;
    }
    *result = a + b;
    return true;
}
```

### 陷阱 5：假设字节序

**问题**：直接将整型 `memcpy` 到字节数组，结果依赖主机字节序。

**错误示例**：

```c
uint32_t v = 0x12345678;
uint8_t buf[4];
memcpy(buf, &v, 4);
/* buf 在小端机: [0x78, 0x56, 0x34, 0x12]
 * buf 在大端机: [0x12, 0x34, 0x56, 0x78]
 */
```

**正确做法**：显式序列化（见示例 7）。

### 陷阱 6：Windows 上 `read`/`write` 与 `open` 的差异

**问题**：Windows 有 `_read`/`_write`/`_open`（低级 I/O）与 `ReadFile`/`WriteFile`（Win32 API），两者不互通。

**错误示例**：混用 `_open` 与 `ReadFile`。

**正确做法**：统一使用 POSIX 风格（`_open`/`_read`）或 Win32 API，不混用。

### 陷阱 7：`long` 的位宽差异

**问题**：`long` 在 LP64（Linux 64）是 64 位，在 LLP64（Windows 64）是 32 位。

**错误示例**：

```c
long v = 0x100000000L;        /* LLP64: 截断为 0 */
```

**正确做法**：

```c
int64_t v = 0x100000000LL;    /* 跨平台 64 位 */
```

### 陷阱 8：`time_t` 2038 问题

**问题**：32 位 `time_t` 在 2038-01-19 03:14:07 UTC 溢出。

**错误示例**：

```c
time_t t = time(NULL);
printf("%ld\n", (long)t);     /* 32 位平台：2038 溢出 */
```

**正确做法**：确保目标平台 `time_t` 为 64 位（Linux x86-64、macOS、Windows 64 均已 64 位），或使用 `struct timespec` 与 `clock_gettime`。

## 工程实践

### 实践 1：分层架构设计

```
应用层（业务逻辑，完全可移植）
    ↓
抽象层（PAL，接口定义）
    ↓
平台层（具体实现）
    ├── Linux 实现（epoll, pthread, mmap）
    ├── Windows 实现（IOCP, CreateThread, CreateFileMapping）
    └── macOS 实现（kqueue, pthread, mmap）
```

**原则**：

1. 应用层不直接调用平台 API，只调用 PAL 接口。
2. PAL 接口尽量小而精，避免"上帝接口"。
3. 平台实现隔离在不同源文件中，编译时按平台选择。

### 实践 2：CI/CD 多平台测试矩阵

```yaml
# .github/workflows/cross-platform.yml
name: Cross-Platform CI

on: [push, pull_request]

jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, ubuntu-24.04-arm, macos-latest, windows-latest]
        compiler: [gcc, clang, cl]
        exclude:
          - os: macos-latest
            compiler: cl
          - os: ubuntu-latest
            compiler: cl
          - os: windows-latest
            compiler: gcc

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - name: Configure
        run: cmake -B build -DCMAKE_C_COMPILER=${{ matrix.compiler }}
      - name: Build
        run: cmake --build build --parallel
      - name: Test
        run: ctest --test-dir build --output-on-failure
```

### 实践 3：可移植性静态检查

```bash
# 使用 cppcheck 检测可移植性问题
cppcheck --enable=all --platform=unix32 --platform=unix64 \
         --platform=win32a --platform=win64 \
         --project=build/compile_commands.json

# 使用 clang-tidy 的可移植性检查
clang-tidy -checks='-*,portability-*,bugprone-*' \
           -p build src/*.c

# 使用 -Wpedantic -Werror 捕获非标准代码
gcc -std=c17 -Wpedantic -Werror -Wall -Wextra
```

### 实践 4：跨平台编译选项管理

```cmake
# cmake/PortableFlags.cmake
function(set_portable_flags target)
    # 基本警告（所有编译器）
    target_compile_options(${target} PRIVATE
        $<$<C_COMPILER_ID:GNU,Clang>:-Wall -Wextra -Wpedantic>
        $<$<C_COMPILER_ID:MSVC>:/W4 /permissive->
    )

    # C 标准版本（禁用扩展，确保可移植）
    target_compile_features(${target} PRIVATE c_std_17)
    set_target_properties(${target} PROPERTIES
        C_EXTENSIONS OFF
    )

    # 平台特定定义
    if(WIN32)
        target_compile_definitions(${target} PRIVATE
            _CRT_SECURE_NO_WARNINGS    # 禁用 _s 函数警告
            _WINSOCK_DEPRECATED_NO_WARNINGS
            WIN32_LEAN_AND_MEAN        # 精简 windows.h
        )
    endif()

    # 64 位支持
    if(CMAKE_SIZEOF_VOID_P EQUAL 8)
        target_compile_definitions(${target} PRIVATE PLATFORM_64BIT=1)
    else()
        target_compile_definitions(${target} PRIVATE PLATFORM_32BIT=1)
    endif()
endfunction()
```

### 实践 5：跨平台日志系统

```c
/* 跨平台日志：颜色支持、线程安全、文件输出 */
#include <stdio.h>
#include <stdarg.h>
#include <time.h>

#ifdef _WIN32
    #include <windows.h>
    /* Windows 10+ 支持 ANSI 转义码 */
    #ifndef ENABLE_VIRTUAL_TERMINAL_PROCESSING
    #define ENABLE_VIRTUAL_TERMINAL_PROCESSING 0x0004
    #endif
#endif

typedef enum {
    LOG_DEBUG,
    LOG_INFO,
    LOG_WARN,
    LOG_ERROR
} LogLevel;

static const char *level_str[] = {"DEBUG", "INFO", "WARN", "ERROR"};
static const char *level_color[] = {"\033[37m", "\033[32m", "\033[33m", "\033[31m"};
static const char *color_reset = "\033[0m";

void log_init(void) {
#ifdef _WIN32
    /* Windows: 启用 ANSI 转义码支持 */
    HANDLE h = GetStdHandle(STD_OUTPUT_HANDLE);
    DWORD mode;
    GetConsoleMode(h, &mode);
    SetConsoleMode(h, mode | ENABLE_VIRTUAL_TERMINAL_PROCESSING);
#endif
}

void log_write(LogLevel level, const char *file, int line, const char *fmt, ...) {
    char time_buf[32];
    time_t now = time(NULL);
    struct tm tm_val;

#ifdef _WIN32
    localtime_s(&tm_val, &now);
#else
    localtime_r(&now, &tm_val);
#endif
    strftime(time_buf, sizeof(time_buf), "%Y-%m-%d %H:%M:%S", &tm_val);

    fprintf(stderr, "%s[%s]%s [%s:%d] ",
            level_color[level], level_str[level], color_reset, file, line);

    va_list args;
    va_start(args, fmt);
    vfprintf(stderr, fmt, args);
    va_end(args);

    fprintf(stderr, "\n");
    fflush(stderr);
}

#define LOG_INFO(...)  log_write(LOG_INFO,  __FILE__, __LINE__, __VA_ARGS__)
#define LOG_ERROR(...) log_write(LOG_ERROR, __FILE__, __LINE__, __VA_ARGS__)
```

### 实践 6：跨平台字节对齐保证

```c
#include <stdalign.h>
#include <stdint.h>

/* C11 对齐说明符：跨平台保证对齐 */
alignas(16) uint8_t buffer[256];   /* 16 字节对齐（SSE 指令要求） */

/* 跨平台对齐内存分配 */
void *aligned_alloc_portable(size_t alignment, size_t size) {
#if defined(_WIN32)
    return _aligned_malloc(size, alignment);
#elif defined(__STDC_VERSION__) && __STDC_VERSION__ >= 201112L
    return aligned_alloc(alignment, size);   /* C11 */
#else
    void *ptr = NULL;
    posix_memalign(&ptr, alignment, size);   /* POSIX */
    return ptr;
#endif
}

void aligned_free_portable(void *ptr) {
#if defined(_WIN32)
    _aligned_free(ptr);
#else
    free(ptr);
#endif
}

/* 缓存行对齐（64 字节，避免 false sharing） */
#define CACHE_LINE_SIZE 64
alignas(CACHE_LINE_SIZE) typedef struct {
    int data[16];
} CacheLineAligned;

/* 使用示例：避免多核 CPU 的 false sharing */
alignas(CACHE_LINE_SIZE) static int counters[64];  /* 每核一个计数器 */
```

## 案例研究

### 案例一：libuv 的跨平台异步 I/O

libuv 是 Node.js 的底层库，抽象了 Windows IOCP、Linux epoll、BSD kqueue、Solaris event ports 等异步 I/O 机制。

**架构**：

- 统一接口：`uv_loop_t`、`uv_tcp_t`、`uv_timer_t` 等
- 平台实现：`unix/` 与 `win/` 目录隔离
- 运行时选择：编译时根据平台选择实现

**关键抽象**：

```c
/* 统一的循环结构 */
struct uv_loop_s {
    void *watchers;          /* 平台相关的 watcher 数组 */
    unsigned int nwatchers;
    uv_handle_t *pending;    /* 待处理的 handle */
    /* ... 跨平台字段 */
};

/* 平台相关的内部结构（隐藏在实现文件中） */
```

### 案例二：SQLite 的 VFS 层

SQLite 通过 VFS（Virtual File System）层抽象文件操作，支持多种平台。

```c
/* SQLite VFS 接口（简化） */
typedef struct sqlite3_vfs {
    int iVersion;
    int szOsFile;
    int mxPathName;
    sqlite3_vfs *pNext;
    const char *zName;
    int (*xOpen)(sqlite3_vfs*, const char *zName, sqlite3_file*, int flags, int *pOutFlags);
    int (*xDelete)(sqlite3_vfs*, const char *zName, int syncDir);
    int (*xAccess)(sqlite3_vfs*, const char *zName, int flags, int *pResOut);
    /* ... 更多方法 */
} sqlite3_vfs;
```

**意义**：VFS 使 SQLite 能在常规文件系统、内存、自定义存储（如加密容器）上运行。

### 案例三：Redis 的事件循环抽象

Redis 的网络 I/O 通过 `ae.c` 抽象层实现，根据编译时宏选择 `epoll`、`kqueue`、`evport`、`select`。

```c
/* ae.h 抽象层 */
typedef struct aeEventLoop {
    int maxfd;
    int setsize;
    aeFileEvent *events;
    aeFiredEvent *fired;
    void *apidata;           /* 平台相关数据（epoll fd / kqueue fd） */
    /* ... */
} aeEventLoop;

/* ae_epoll.c, ae_kqueue.c, ae_select.c 分别实现 */
```

**设计要点**：编译时通过 `#ifdef HAVE_EPOLL` 等宏选择实现，运行时零开销。

### 案例四：PostgreSQL 的平台抽象

PostgreSQL 使用 `pg_config` 在配置阶段探测平台特性，生成 `pg_config.h` 与 `pg_config_manual.h`。

```c
/* pg_config.h.in 片段（由 configure 生成） */
#define HAVE_CLOCK_GETTIME 1
#define HAVE_EPOLL 1
#define HAVE_POSIX_FADVISE 1
#define ALIGNOF_DOUBLE 8
#define SIZEOF_LONG 8
```

**优势**：编译时已知平台能力，避免运行时探测开销。

### 案例五：curl 的可移植性策略

libcurl 是广泛使用的网络库，支持 40+ 平台。

**关键策略**：

1. **编译时配置**：`configure` 脚本探测可用功能
2. **可选功能**：通过 `#ifdef USE_OPENSSL` 等启用/禁用
3. **统一 API**：上层 API 完全一致，下层后端可选（OpenSSL/GnuTLS/mbedTLS）
4. **CI 矩阵**：在 Linux、macOS、Windows、Android、iOS 等 10+ 平台测试

## 练习

### 基础练习

1. **平台检测**：编写 `platform.h` 头文件，检测 Windows、Linux、macOS 三大平台，并提供 `PLATFORM_NAME` 宏返回平台名字符串。

2. **可移植类型**：使用 `<stdint.h>` 重写以下不可移植代码：

   ```c
   long file_size;          /* LP64/LLP64 差异 */
   unsigned int addr;       /* 64 位平台截断 */
   ```

3. **字节序检测**：编写编译时和运行时两种字节序检测函数，并说明各自的优缺点。

4. **跨平台休眠**：实现 `sleep_ms()` 函数，在 Windows 上用 `Sleep`，在 Unix 上用 `nanosleep`。

### 进阶练习

5. **跨平台路径处理**：实现 `path_join()`、`path_normalize()`、`path_basename()` 三个函数，支持 Windows（`\`）与 Unix（`/`）路径分隔符。

6. **跨平台文件锁**：实现文件级互斥锁，Windows 用 `LockFileEx`，Unix 用 `flock` 或 `fcntl`。

7. **跨平台目录遍历**：实现 `dir_iter()` 迭代器，遍历指定目录下所有文件。Windows 用 `FindFirstFile/FindNextFile`，Unix 用 `opendir/readdir`。

8. **平台抽象层**：设计一个简单的 PAL，包含文件、时间、线程三类操作的接口，并提供 Linux 与 Windows 两套实现。

### 挑战练习

9. **跨平台异步 I/O**：基于 `epoll`（Linux）与 `IOCP`（Windows）实现统一的异步 TCP 服务器框架，要求：

   - 统一的 `async_accept`/`async_read`/`async_write` 接口
   - 回调机制通知 I/O 完成
   - 单线程事件循环，无锁

10. **跨平台可移植性审计**：选择一个开源 C 项目（如 Redis、SQLite），使用 cppcheck、clang-tidy、GCC `-Wpedantic` 等工具审计其可移植性问题，编写审计报告。

## 参考文献

1. ISO/IEC. (2018). _Programming languages—C_ (ISO/IEC 9899:2018). International Organization for Standardization. https://www.iso.org/standard/74528.html

2. Kernighan, B. W., & Ritchie, D. M. (1988). _The C Programming Language_ (2nd ed.). Prentice Hall. ISBN 978-0131103627

3. Seacord, R. C. (2020). _Effective C: An introduction to professional C programming_. No Starch Press. ISBN 978-1718501041

4. Stevens, W. R., & Rago, S. A. (2013). _Advanced Programming in the UNIX Environment_ (3rd ed.). Addison-Wesley. ISBN 978-0321637734

5. Hart, J. M. (2019). _Windows System Programming_ (5th ed.). Addison-Wesley. ISBN 978-0135384238

6. Butenhof, D. R. (1997). _Programming with POSIX Threads_. Addison-Wesley. ISBN 978-0201633924

7. The Open Group. (2018). _The Open Group Base Specifications Issue 7, 2018 Edition_ (IEEE Std 1003.1-2017). https://pubs.opengroup.org/onlinepubs/9699919799/

8. Microsoft. (2023). _Win32 API documentation_. Microsoft Learn. https://learn.microsoft.com/en-us/windows/win32/api/

9. Drepper, U. (2012). _How to Write Shared Libraries_ (Version 4.1.2). https://www.akkadia.org/drepper/dsohowto.pdf

10. Matz, M., Hubicka, J., Jaeger, A., & Mitchell, M. (2013). _System V Application Binary Interface: AMD64 Architecture Processor Supplement_ (Draft Version 1.0). https://refspecs.linuxbase.org/elf/x86_64-abi-0.99.pdf

11. Apple Inc. (2023). _Apple Platform ABI: ARM64_. Apple Developer Documentation. https://developer.apple.com/documentation/xcode/writing-arm64-code-for-apple-platforms

12. Regehr, J. (2010). _A guide to undefined behavior in C and C++_. Embedded in Academia blog. https://blog.regehr.org/archives/213

## 延伸阅读

### 官方文档

- **C 标准草案（N2176）**：https://www.open-std.org/jtc1/sc22/wg14/www/docs/n2176.pdf
- **POSIX 标准**：https://pubs.opengroup.org/onlinepubs/9699919799/
- **Win32 API**：https://learn.microsoft.com/en-us/windows/win32/
- **Linux man pages**：https://man7.org/linux/man-pages/
- **Apple Developer**：https://developer.apple.com/

### 经典书籍

- **《Expert C Programming: Deep C Secrets》**（Peter van der Linden, 1994）：C 语言深层原理与可移植性。
- **《C: A Reference Manual》**（Samuel Harbison & Guy Steele, 2002）：C 语言权威参考。
- **《Portable C Compiler》**（Eugene Jarvis, 1989）：跨平台编译器实现。

### 工具与生态

- **cppcheck**：静态分析，可检测可移植性问题。https://cppcheck.sourceforge.io/
- **clang-tidy**：静态分析，提供 portability-* 检查。https://clang.llvm.org/extra/clang-tidy/
- **GCC `-Wpedantic`**：严格遵循标准，禁用扩展。
- **Linux Test Project**：跨平台测试套件。https://linux-test-project.github.io/
- **Autoconf**：配置脚本生成工具。https://www.gnu.org/software/autoconf/

### 相关主题

- [构建系统](./构建系统.md)：CMake/Make/Ninja 跨平台构建
- [静态分析与调试](./静态分析与调试.md)：可移植性静态检查
- [嵌入式C编程](./嵌入式C编程.md)：嵌入式平台特殊性
- [C与汇编交互](./C与汇编交互.md)：ABI 与调用约定
- [属性与编译器扩展](./属性与编译器扩展.md)：编译器扩展的可移植封装
- [数据类型详解](./数据类型详解.md)：类型大小与对齐
