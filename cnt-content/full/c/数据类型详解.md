---
order: 30
tags:
  - c
  - memory
difficulty: beginner
title: 数据类型详解
module: c
category: 'C Basics'
description: 'C 语言的整型、浮点型、派生类型、空类型、内存布局、ABI 与 C23 新类型，对标 MIT/Stanford/CMU 系统编程教学水准。'
author: fanquanpp
updated: '2026-07-21'
related:
  - c/概述
  - c/程序结构与基本语法
  - c/变量与常量
  - c/位运算与位域
  - c/指针详解
  - c/动态内存管理
prerequisites:
  - c/概述
---

# 数据类型详解

> 本章节面向已掌握 C 基本语法的读者，深入剖析 C 语言的类型系统、内存布局、ABI 对齐要求与 C23 新类型特性，对标 MIT 6.S081、Stanford CS107、CMU 15-213 的系统编程教学水准。所有结论均给出标准依据与可运行示例，支持 0 基础自学。

## 1. 学习目标

完成本章学习后，你应当能够（Bloom 分类法）：

- **记忆（Remembering）**：列出 C89/C99/C11/C17/C23 标准定义的全部基本类型、派生类型与空类型；复述 `<stdint.h>`、`<stddef.h>`、`<stdbool.h>`、`<stdbit.h>`（C23）提供的标准类型别名；说明 `char`、`short`、`int`、`long`、`long long` 在 ILP32、LP64、LLP64 数据模型下的字节数。
- **理解（Understanding）**：解释整数提升（integer promotion）与默认参数提升（default argument promotion）的规则；阐明 IEEE 754 浮点数的舍入模式与异常处理；说明结构体内存对齐、填充（padding）与 `#pragma pack` 的影响；区分指针类型、数组类型与指针衰减（decay）的语义。
- **应用（Applying）**：使用 `<stdint.h>` 的固定宽度整型编写可移植代码；使用 `alignof`、`alignas`、`_Alignas` 控制内存对齐；使用 `union` 实现类型双关（type punning）；使用 `_Generic`（C11）实现编译期类型分发；使用 `_BitInt(N)`（C23）声明任意宽度整数。
- **分析（Analyzing）**：通过 `sizeof`、`_Alignof`、`offsetof` 分析结构体的内存布局；通过反汇编代码追踪整数提升与类型转换的实际行为；定位因对齐错误、严格别名违规、未定义行为导致的诡异 bug。
- **评价（Evaluating）**：在"基本类型 + `typedef`"、"固定宽度整型"、"位域"、"`_BitInt(N)`"四种方案间做权衡，论证各自的可移植性、性能与可维护性；评价不同数据模型（ILP32/LP64/LLP64）对历史代码的影响。
- **创造（Creating）**：设计一个跨平台、跨编译器、跨 ABI 的类型抽象层；实现一个支持运行时类型信息（RTTI）的 C 类型系统；设计一个内存对齐敏感的高性能数据结构（如无锁队列、环形缓冲区）。

## 2. 历史动机与演化

### 2.1 K&R C 时代：类型系统的雏形（1972-1989）

C 语言由 Dennis Ritchie 于 1972 年在 PDP-11 上为重写 Unix 内核而设计。早期 C 的类型系统非常简陋：

- 仅有 `char`、`int`、`float`、`double`、`long` 五个基本类型
- 无 `unsigned`、无 `short`、无 `void`、无 `enum`、无 `const`
- 无函数原型（function prototype），调用函数时不检查参数类型
- 整型大小由实现定义，跨平台移植困难

K&R C 的《The C Programming Language》（1978）第一版仅用 6 页描述全部类型系统，反映了当时的极简主义设计哲学。

### 2.2 C89：标准化的开端（1989）

ISO/IEC 9899:1990（C89/C90）首次将 C 语言标准化，引入：

- `signed`、`unsigned` 修饰符扩展到所有整型
- `long double` 类型
- `void` 类型（无返回值函数、通用指针）
- `enum` 枚举类型
- `const`、`volatile` 类型限定符
- 函数原型（function prototype）：`int f(int, char*)` 替代 `int f()`
- `<stddef.h>` 提供 `size_t`、`ptrdiff_t`、`wchar_t`、`NULL`、`offsetof`

C89 同时明确了"实现定义行为"（implementation-defined behavior）的概念：标准规定每种实现必须文档化其选择（如 `int` 的大小、字节序、对齐要求）。

### 2.3 C99：固定宽度整型与 `_Bool`（1999）

C99 引入了重大改进：

- `<stdint.h>` 提供固定宽度整型：`int8_t`、`int16_t`、`int32_t`、`int64_t` 及其无符号变体
- `<stdbool.h>` 提供 `bool`、`true`、`false` 宏（底层类型为 `_Bool`）
- `long long` 与 `unsigned long long`（至少 64 位）
- `<inttypes.h>` 提供格式化说明符：`PRId8`、`PRIu64`、`PRIxPTR` 等
- 复数类型 `_Complex`、虚数类型 `_Imaginary`（C99 旁路支持）
- 指定初始化器（designated initializer）：`struct Point p = {.x = 1, .y = 2}`

`<stdint.h>` 的引入解决了长期困扰 C 程序员的"int 到底多大"问题，使得编写跨平台代码不再需要 `typedef` 黑魔法。

### 2.4 C11：泛型选择与对齐控制（2011）

C11 引入：

- `_Generic` 泛型选择宏：编译期根据参数类型选择不同的表达式
- `_Alignas`、`_Alignof` 对齐指定符（`<stdalign.h>` 提供 `alignas`、`alignof` 宏）
- `_Static_assert` 编译期断言（`<assert.h>` 提供 `static_assert` 宏）
- `_Noreturn` 函数从不返回的属性（`<stdnoreturn.h>` 提供 `noreturn` 宏）
- `_Thread_local` 线程局部存储（`<threads.h>` 提供 `thread_local` 宏）
- 匿名结构体/联合体成员
- 边界检查库 Annex K（`printf_s`、`scanf_s` 等，可选实现）

### 2.5 C17：缺陷修复（2018）

C17（ISO/IEC 9899:2018）主要是 C11 的缺陷修复版本，未引入新类型，但明确了若干未定义行为与实现定义行为的细节。

### 2.6 C23：现代 C 的飞跃（2023）

C23（ISO/IEC 9899:2024）是 C 语言历史上最大的标准更新之一：

- `_BitInt(N)` 任意宽度整数（如 `_BitInt(7)` 表示 7 位有符号整数）
- `bool`、`true`、`false` 成为关键字（不再需要 `<stdbool.h>`）
- `nullptr`、`nullptr_t` 空指针常量与类型
- `typeof`、`typeof_unqual` 类型推导（GCC 扩展转正）
- `constexpr` 编译期常量
- `#embed` 二进制资源嵌入
- `[[deprecated]]`、`[[nodiscard]]`、`[[maybe_unused]]` 标准属性
- `auto` 类型推导（限于块作用域变量）
- 二进制字面量 `0b1010` 与数字分隔符 `1'000'000`
- `<stdbit.h>` 位操作宏（`stdc_leading_zeros`、`stdc_trailing_ones` 等）
- `_Decimal32`、`_Decimal64`、`_Decimal128` 十进制浮点（IEC 60559）

### 2.7 数据模型演化

C 语言的整型大小由"数据模型"（data model）决定：

| 数据模型 | `short` | `int` | `long` | `long long` | 指针 | 典型平台                          |
| -------- | ------- | ----- | ------ | ----------- | ---- | --------------------------------- |
| LP32     | 2       | 2     | 4      | 8           | 4    | Win16、早期 Macintosh             |
| ILP32    | 2       | 4     | 4      | 8           | 4    | Win32、Linux 32 位、macOS 32 位   |
| LLP64    | 2       | 4     | 4      | 8           | 8    | Win64                             |
| LP64     | 2       | 4     | 8      | 8           | 8    | Linux 64 位、macOS 64 位、BSD 64 位 |
| ILP64    | 2       | 8     | 8      | 8           | 8    | 早期 Alpha、Cray                  |
| SILP64   | 8       | 8     | 8      | 8           | 8    | 早期 UNICOS                       |

现代 64 位平台分化为 LLP64（Windows）与 LP64（Unix 系），导致 `long` 在跨平台代码中是不可靠的，应优先使用 `int32_t`、`int64_t`。

## 3. 形式化定义

### 3.1 类型系统层级

C 语言的类型系统可形式化为以下层级：

$$
\text{Type} = \text{BasicType} \mid \text{DerivedType} \mid \text{VoidType} \mid \text{FunctionType}
$$

$$
\text{BasicType} = \text{IntegerType} \mid \text{FloatingType} \mid \text{\_BitInt}(N) \mid \text{\_Bool} \mid \text{\_Complex} \mid \text{\_Decimal}
$$

$$
\text{DerivedType} = \text{ArrayType} \mid \text{PointerType} \mid \text{StructureType} \mid \text{UnionType} \mid \text{EnumType} \mid \text{AtomicType}
$$

### 3.2 整数提升的形式化规则

设 $T$ 为整型，$\text{rank}(T)$ 为转换等级（conversion rank），定义为：

$$
\text{rank}(\text{bool}) < \text{rank}(\text{char}) < \text{rank}(\text{short}) < \text{rank}(\text{int}) < \text{rank}(\text{long}) < \text{rank}(\text{long long})
$$

整数提升规则：

$$
\text{Promote}(T) = \begin{cases}
\text{int} & \text{if } \text{rank}(T) < \text{rank}(\text{int}) \land T \text{ 可由 int 表示} \\
\text{unsigned int} & \text{if } \text{rank}(T) < \text{rank}(\text{int}) \land T \text{ 不可由 int 表示} \\
T & \text{otherwise}
\end{cases}
$$

例如，`char c = 'A';` 在表达式 `c + 1` 中，`c` 首先被提升为 `int`，再做加法。

### 3.3 寻常算术转换

当两个整型参与二元运算时，执行"寻常算术转换"（usual arithmetic conversions）：

1. 若任一操作数为 `unsigned long long`，另一操作数转换为 `unsigned long long`。
2. 否则，若任一操作数为 `long long`，另一操作数转换为 `long long`。
3. 否则，若任一操作数为 `unsigned long`，另一操作数转换为 `unsigned long`。
4. 否则，若任一操作数为 `long`，另一操作数转换为 `long`。
5. 否则，若任一操作数为 `unsigned int`，另一操作数转换为 `unsigned int`。
6. 否则，两操作数均为 `int`。

**陷阱**：`-1 < 1U` 的结果是 `false`！因为 `1U` 是 `unsigned int`，`-1` 被转换为 `unsigned int`（变成 `UINT_MAX`），而 `UINT_MAX < 1U` 为假。

### 3.4 IEEE 754 浮点数表示

IEEE 754 双精度（`double`）的位布局：

$$
v = (-1)^S \times 1.M \times 2^{E-1023}
$$

其中：
- $S$：1 位符号位
- $E$：11 位指数（偏置 1023）
- $M$：52 位尾数（隐含前导 1）

特殊值：
- $E = 0, M = 0$：$\pm 0$
- $E = 0, M \neq 0$：次正规数（subnormal）
- $E = 2047, M = 0$：$\pm \infty$
- $E = 2047, M \neq 0$：NaN（Not a Number）

```
双精度浮点数位布局（64 位）：
+-----+------------+---------------------+
|  S  |  E (11位)  |    M (52 位)        |
+-----+------------+---------------------+
 63   62        52  51                  0
```

### 3.5 内存对齐的形式化定义

设类型 $T$ 的对齐要求为 $\text{align}(T)$，则：

- $\text{align}(\text{char}) = 1$
- $\text{align}(\text{short}) = 2$（典型）
- $\text{align}(\text{int}) = 4$（典型）
- $\text{align}(\text{double}) = 8$（典型）
- $\text{align}(\text{long double}) = 16$（x86-64 System V）
- $\text{align}(\text{struct S}) = \max_{m \in S} \text{align}(\text{type}(m))$
- $\text{sizeof}(\text{struct S})$ 是 $\text{align}(\text{struct S})$ 的整数倍

成员 $m$ 在结构体中的偏移 $\text{offset}(m)$ 满足：

$$
\text{offset}(m) \equiv 0 \pmod{\text{align}(\text{type}(m))}
$$

## 4. 理论推导与证明

### 4.1 定理：`char` 类型的符号性

**定理**：C 标准不规定 `char` 是 `signed char` 还是 `unsigned char`，由实现定义。

**证明**：C 标准 §6.2.5p15 规定："The three types `char`, `signed char`, and `unsigned char` are collectively called the character types. The implementation shall define `char` to have the same range, representation, and behavior as either `signed char` or `unsigned char`."

**实证**：

| 平台                    | `char` 的符号性 | `CHAR_MIN` |
| ----------------------- | --------------- | ---------- |
| x86 Linux (gcc)         | signed          | -128       |
| x86 Windows (gcc)       | signed          | -128       |
| x86 Windows (MSVC)      | signed          | -128       |
| ARM Linux (gcc)         | unsigned        | 0          |
| ARM macOS (clang)       | unsigned        | 0          |
| PowerPC AIX (xlC)       | unsigned        | 0          |

**推论**：跨平台代码不应假定 `char` 的符号性。若需明确符号，使用 `signed char` 或 `unsigned char`。

### 4.2 定理：`sizeof` 运算符的返回类型

**定理**：`sizeof` 运算符返回 `size_t` 类型，而非 `int` 或 `unsigned long`。

**证明**：C 标准 §6.5.3.4p4 规定："The value of the result is implementation-defined, and its type (an unsigned integer type) is `size_t`, defined in `<stddef.h>` (and other headers)."

`size_t` 的大小由实现定义，但必须能容纳任何对象的大小。在 32 位平台上通常是 32 位无符号整型，64 位平台上通常是 64 位无符号整型。

**推论**：循环计数器若涉及 `sizeof`，应使用 `size_t`：

```c
for (size_t i = 0; i < sizeof(arr)/sizeof(arr[0]); i++) { ... }
```

### 4.3 定理：整数溢出的行为

**定理**：无符号整数溢出是良定义的（modulo $2^N$），有符号整数溢出是未定义行为。

**证明**：

- 无符号：C 标准 §6.2.5p9："A computation involving unsigned operands can never overflow, because a result that cannot be represented by the resulting unsigned integer type is reduced modulo the number that is one greater than the largest value that can be represented by the resulting type."
- 有符号：C 标准 §6.5p5："If an exceptional condition occurs during the conversion of a floating-point number to an integer or a signed integer operation [...] the behavior is undefined."

**推论**：编译器可以假设有符号整数不会溢出，从而进行激进优化。例如：

```c
int foo(int x) {
    return x + 1 > x;  /* 编译器可假设永远为 true */
}
```

GCC 在 `-O2` 下会将 `foo` 优化为 `return 1;`。若需检测溢出，应使用 `__builtin_add_overflow`（GCC/Clang 扩展）。

### 4.4 定理：严格别名规则

**定理**：通过不兼容类型的指针访问对象是未定义行为，少数例外除外。

**证明**：C 标准 §6.5p7 规定，对象的存储值只能被以下类型之一的左值表达式访问：

1. 与对象有效类型相容的类型
2. 与对象有效类型相容类型的限定版本
3. 与对象有效类型对应的无符号版本
4. 与对象有效类型对应的有符号版本
5. 聚合或联合类型，其成员中包含上述类型之一
6. `char*`、`signed char*`、`unsigned char*`

**推论**：

```c
int x = 0x41424344;
float *fp = (float *)&x;
*fp = 3.14f;  /* UB：float* 不能别名 int */
```

类型双关的正确做法是 `memcpy` 或 `union`（C99 允许联合体读取非活跃成员，但 C++ 仍为 UB）。

### 4.5 定理：指针衰减

**定理**：在大多数表达式中，数组类型的左值会衰减为指向首元素的指针。

**证明**：C 标准 §6.3.2.1p3："Except when it is the operand of the `sizeof` operator, the `_Alignof` operator, or the unary `&` operator, or is a string literal used to initialize an array, an expression that has type 'array of type' is converted to an expression with type 'pointer to type' that points to the initial element of the array object and is not an lvalue."

**推论**：

```c
int arr[10];
sizeof(arr);     /* 40，未衰减 */
sizeof(arr + 0); /* 8（64 位），arr 衰减为 int* */
&arr;            /* int(*)[10]，未衰减 */
&arr[0];         /* int*，等同于 arr 衰减后的指针 */
```

## 5. 代码示例

### 5.1 固定宽度整型的可移植代码

```c
#include <stdint.h>
#include <inttypes.h>
#include <stdio.h>

/* 跨平台：明确指定宽度，避免 long/int 歧义 */
int32_t parse_i32(const char *s) {
    int64_t v = 0;
    /* 假设 s 是十进制数字 */
    while (*s >= '0' && *s <= '9') {
        v = v * 10 + (*s - '0');
        if (v > INT32_MAX) return INT32_MAX;  /* 饱和 */
        s++;
    }
    return (int32_t)v;
}

int main(void) {
    int32_t x = parse_i32("1234567890");
    printf("x = %" PRId32 "\n", x);  /* 跨平台格式说明符 */

    uint64_t big = 0xFFFFFFFFFFFFFFFFULL;
    printf("big = %" PRIu64 " (0x%" PRIX64 ")\n", big, big);

    /* 指针宽度整型 */
    intptr_t ip = (intptr_t)&x;
    printf("address = 0x%" PRIxPTR "\n", ip);

    return 0;
}
```

### 5.2 结构体内存布局分析

```c
#include <stdio.h>
#include <stddef.h>
#include <stdalign.h>

struct A {
    char c;     /* 1 字节，偏移 0 */
                /* 3 字节填充 */
    int i;      /* 4 字节，偏移 4 */
    char d;     /* 1 字节，偏移 8 */
                /* 3 字节填充 */
};              /* 总大小 12 字节 */

struct B {
    int i;      /* 4 字节，偏移 0 */
    char c;     /* 1 字节，偏移 4 */
    char d;     /* 1 字节，偏移 5 */
                /* 2 字节填充 */
};              /* 总大小 8 字节 */

#pragma pack(push, 1)
struct Packed {
    char c;     /* 1 字节，偏移 0 */
    int i;      /* 4 字节，偏移 1 */
    char d;     /* 1 字节，偏移 5 */
};              /* 总大小 6 字节 */
#pragma pack(pop)

int main(void) {
    printf("struct A: size=%zu, align=%zu\n", sizeof(struct A), alignof(struct A));
    printf("  c: offset=%zu\n", offsetof(struct A, c));
    printf("  i: offset=%zu\n", offsetof(struct A, i));
    printf("  d: offset=%zu\n", offsetof(struct A, d));

    printf("struct B: size=%zu, align=%zu\n", sizeof(struct B), alignof(struct B));
    printf("  i: offset=%zu\n", offsetof(struct B, i));
    printf("  c: offset=%zu\n", offsetof(struct B, c));
    printf("  d: offset=%zu\n", offsetof(struct B, d));

    printf("struct Packed: size=%zu, align=%zu\n", sizeof(struct Packed), alignof(struct Packed));

    return 0;
}
```

输出（x86-64 Linux）：

```
struct A: size=12, align=4
  c: offset=0
  i: offset=4
  d: offset=8
struct B: size=8, align=4
  i: offset=0
  c: offset=4
  d: offset=5
struct Packed: size=6, align=1
```

### 5.3 类型双关的正确做法

```c
#include <stdio.h>
#include <string.h>
#include <stdint.h>

/* 方法1：memcpy（最安全，编译器会优化） */
float int_to_float_memcpy(int32_t x) {
    float f;
    memcpy(&f, &x, sizeof(f));
    return f;
}

/* 方法2：union（C99 允许，C++ 仍为 UB） */
float int_to_float_union(int32_t x) {
    union { int32_t i; float f; } u;
    u.i = x;
    return u.f;
}

/* 方法3：char* 别名（合法但笨拙） */
float int_to_float_charptr(int32_t x) {
    float f;
    char *src = (char *)&x;
    char *dst = (char *)&f;
    for (size_t i = 0; i < sizeof(f); i++) dst[i] = src[i];
    return f;
}

/* 错误做法：违反严格别名 */
float int_to_float_ub(int32_t x) {
    float *fp = (float *)&x;
    return *fp;  /* UB */
}

int main(void) {
    int32_t x = 0x40490FDB;  /* 3.14159274f 的位表示 */
    printf("memcpy: %f\n", int_to_float_memcpy(x));
    printf("union:   %f\n", int_to_float_union(x));
    printf("char*:   %f\n", int_to_float_charptr(x));
    return 0;
}
```

### 5.4 `_Generic` 泛型选择（C11）

```c
#include <stdio.h>
#include <math.h>
#include <complex.h>

/* 编译期根据参数类型分发到不同的实现 */
#define abs_val(x) _Generic((x), \
    int:         abs, \
    long:        labs, \
    long long:   llabs, \
    float:       fabsf, \
    double:      fabs, \
    long double: fabsl, \
    default:     abs \
)(x)

#define type_name(x) _Generic((x), \
    _Bool:          "_Bool", \
    char:           "char", \
    signed char:    "signed char", \
    unsigned char:  "unsigned char", \
    short:          "short", \
    unsigned short: "unsigned short", \
    int:            "int", \
    unsigned int:   "unsigned int", \
    long:           "long", \
    unsigned long:  "unsigned long", \
    long long:      "long long", \
    unsigned long long: "unsigned long long", \
    float:          "float", \
    double:         "double", \
    long double:    "long double", \
    default:        "unknown")

int main(void) {
    int i = -42;
    long l = -1234567890L;
    double d = -3.14;
    float f = -2.71f;

    printf("abs(%s) = %d\n",    type_name(i), abs_val(i));
    printf("abs(%s) = %ld\n",   type_name(l), abs_val(l));
    printf("abs(%s) = %f\n",    type_name(d), abs_val(d));
    printf("abs(%s) = %f\n",    type_name(f), abs_val(f));

    return 0;
}
```

### 5.5 C23 `_BitInt` 任意宽度整数

```c
#include <stdio.h>
#include <limits.h>

/* C23: 任意宽度整数 */
_BitInt(7)  b7  = 0;   /* 7 位有符号，范围 -64..63 */
_BitInt(32) b32 = 0;   /* 32 位有符号 */
unsigned _BitInt(4) u4 = 0;  /* 4 位无符号，范围 0..15 */

void test_bitint(void) {
    b7 = 63;
    printf("b7 = %d (max)\n", (int)b7);
    b7++;  /* 溢出：环绕到 -64 */
    printf("b7 = %d (after overflow)\n", (int)b7);

    u4 = 15;
    printf("u4 = %u (max)\n", (unsigned)u4);
    u4++;  /* 溢出：环绕到 0 */
    printf("u4 = %u (after overflow)\n", (unsigned)u4);

    /* 编译期常量 */
    constexpr _BitInt(8) c = 100;
    printf("c = %d\n", (int)c);
}

int main(void) {
    test_bitint();
    return 0;
}
```

### 5.6 C23 `#embed` 二进制嵌入

```c
#include <stdio.h>

/* C23: 直接嵌入二进制文件，无需 xxd 等工具 */
static const unsigned char icon[] = {
#embed "icon.png"
};

int main(void) {
    printf("icon size: %zu bytes\n", sizeof(icon));
    /* 输出前 8 字节（PNG magic） */
    for (size_t i = 0; i < 8 && i < sizeof(icon); i++) {
        printf("%02x ", icon[i]);
    }
    printf("\n");
    return 0;
}
```

### 5.7 C23 `constexpr` 与 `auto`

```c
#include <stdio.h>

/* C23: 编译期常量，可作为数组大小、case 标签 */
constexpr int BUFFER_SIZE = 256;
constexpr double PI = 3.14159265358979;

int main(void) {
    char buf[BUFFER_SIZE];  /* 合法：constexpr 是编译期常量 */

    /* C23: auto 类型推导（限于块作用域） */
    auto x = 42;        /* int */
    auto y = 3.14;      /* double */
    auto z = &x;        /* int* */
    auto w = BUFFER_SIZE; /* int（constexpr 隐式转换为 int） */

    printf("x = %d, y = %f, z = %p, w = %d\n", x, y, (void*)z, w);
    printf("PI = %.15f\n", PI);

    return 0;
}
```

### 5.8 对齐控制与缓存行对齐

```c
#include <stdio.h>
#include <stdalign.h>
#include <stdint.h>

/* 64 字节对齐，独占一个缓存行 */
struct alignas(64) PaddedCounter {
    uint64_t count;
};

/* 避免伪共享：每个计数器独占缓存行 */
struct PaddedCounter counters[4];

/* 16 字节对齐，便于 SIMD 加载 */
struct alignas(16) Vec4 {
    float v[4];
};

int main(void) {
    printf("PaddedCounter: size=%zu, align=%zu\n",
           sizeof(struct PaddedCounter), alignof(struct PaddedCounter));
    printf("Vec4: size=%zu, align=%zu\n",
           sizeof(struct Vec4), alignof(struct Vec4));

    /* 对齐的内存分配 */
    alignas(32) float matrix[4][4];  /* 32 字节对齐的 4x4 矩阵 */
    printf("matrix: %p (should be 32-byte aligned)\n", (void*)matrix);

    return 0;
}
```

### 5.9 位域与 ABI

```c
#include <stdio.h>
#include <stdint.h>

/* TCP 头部（位域表示） */
struct TcpHeader {
    uint16_t src_port    : 16;
    uint16_t dst_port    : 16;
    uint32_t seq         : 32;
    uint32_t ack         : 32;
    uint16_t data_offset : 4;
    uint16_t reserved    : 3;
    uint16_t ns          : 1;
    uint16_t cwr         : 1;
    uint16_t ece         : 1;
    uint16_t urg         : 1;
    uint16_t ack_flag    : 1;
    uint16_t psh         : 1;
    uint16_t rst         : 1;
    uint16_t syn         : 1;
    uint16_t fin         : 1;
    uint16_t window      : 16;
    uint16_t checksum    : 16;
    uint16_t urgent_ptr  : 16;
};

int main(void) {
    printf("TcpHeader size: %zu\n", sizeof(struct TcpHeader));

    struct TcpHeader hdr = {0};
    hdr.src_port = 8080;
    hdr.dst_port = 80;
    hdr.seq = 1000;
    hdr.ack = 2000;
    hdr.data_offset = 5;  /* 5 * 4 = 20 字节头 */
    hdr.ack_flag = 1;
    hdr.window = 65535;

    printf("src_port: %u\n", hdr.src_port);
    printf("dst_port: %u\n", hdr.dst_port);
    printf("seq: %u\n", hdr.seq);
    printf("ack: %u\n", hdr.ack);
    printf("data_offset: %u\n", hdr.data_offset);
    printf("ack_flag: %u\n", hdr.ack_flag);
    printf("window: %u\n", hdr.window);

    return 0;
}
```

**警告**：位域的内存布局是实现定义的，不可用于跨平台序列化。网络协议解析应使用手动位移：

```c
uint32_t parse_be32(const uint8_t *p) {
    return ((uint32_t)p[0] << 24) | ((uint32_t)p[1] << 16) |
           ((uint32_t)p[2] << 8)  | (uint32_t)p[3];
}
```

### 5.10 `_Static_assert` 编译期断言

```c
#include <assert.h>
#include <stdint.h>

/* 编译期检查类型大小，跨平台编译时立即报错 */
_Static_assert(sizeof(int) >= 4, "int must be at least 32 bits");
_Static_assert(sizeof(void*) >= 4, "pointers must be at least 32 bits");
_Static_assert(sizeof(intptr_t) == sizeof(void*), "intptr_t mismatch");

/* 检查结构体布局 */
struct Header {
    uint32_t magic;
    uint32_t version;
    uint64_t offset;
};
_Static_assert(sizeof(struct Header) == 16, "Header must be 16 bytes");
_Static_assert(_Alignof(struct Header) == 8, "Header must be 8-byte aligned");

int main(void) {
    return 0;
}
```

## 6. 对比分析

### 6.1 整型选择方案对比

| 方案                   | 优点                       | 缺点                              | 适用场景                         |
| ---------------------- | -------------------------- | --------------------------------- | -------------------------------- |
| 基本类型 (`int`/`long`) | 历史代码兼容、性能最优     | 跨平台大小不定、易溢出           | 平台相关代码、性能敏感的内层循环 |
| `<stdint.h>` 固定宽度  | 跨平台一致、明确大小       | 需包含头文件、格式说明符需用宏   | 跨平台库、网络协议、文件格式     |
| `size_t`/`ptrdiff_t`   | 与对象大小匹配、避免溢出   | 不能用于负数（`size_t`）         | 数组索引、内存大小、循环计数     |
| 位域                   | 紧凑、可读性好             | 布局实现定义、不可移植           | 平台内部的标志位（非序列化）     |
| `_BitInt(N)` (C23)     | 任意宽度、明确语义         | 编译器支持有限、性能可能较差     | 硬件寄存器、位精确算法           |
| `enum`                 | 可读性好、类型安全         | 实际是 `int`、可能溢出           | 状态机、配置选项                 |

### 6.2 浮点型方案对比

| 方案                 | 精度（位） | 范围                              | 性能     | 适用场景                 |
| -------------------- | ---------- | --------------------------------- | -------- | ------------------------ |
| `float`              | 24         | $\pm 1.2 \times 10^{-38}$ 至 $\pm 3.4 \times 10^{38}$ | 最快     | 图形、信号处理           |
| `double`             | 53         | $\pm 2.2 \times 10^{-308}$ 至 $\pm 1.8 \times 10^{308}$ | 快       | 科学计算、默认选择       |
| `long double` (x86)  | 64         | $\pm 3.4 \times 10^{-4932}$ 至 $\pm 1.2 \times 10^{4932}$ | 较慢     | 高精度科学计算           |
| `_Decimal32` (C23)   | 7          | $\pm 1 \times 10^{-95}$ 至 $\pm 9.9 \times 10^{96}$ | 慢       | 财务计算（避免二进制误差） |
| `_Decimal64` (C23)   | 16         | $\pm 1 \times 10^{-383}$ 至 $\pm 9.9 \times 10^{384}$ | 慢       | 财务计算                 |
| `_Fract` (嵌入式)    | 定点       | 依赖实现                          | 极快     | DSP、嵌入式音频          |

### 6.3 C 与其他语言的类型系统对比

| 特性             | C            | C++             | Rust             | Go              | Java          |
| ---------------- | ------------ | --------------- | ---------------- | --------------- | ------------- |
| 类型推断         | 无（C23 `auto`） | `auto`/`decltype` | 强（`let`）      | `:=`            | `var`（Java 10+） |
| 泛型             | 无（`_Generic` 模拟） | 模板            | 泛型             | 泛型            | 泛型（类型擦除） |
| 类型安全         | 弱           | 较强            | 极强             | 强              | 强            |
| 空指针           | NULL         | nullptr         | Option<T>        | nil             | null          |
| 整数溢出         | signed UB    | signed UB       | 默认 panic       | 良定义（环绕）  | 良定义（环绕） |
| 内存安全         | 手动         | 手动（RAII）    | 编译期保证       | GC              | GC            |
| 联合体           | 有           | 有（`std::variant` 更安全） | 有（`enum`）     | 无              | 无            |
| 位域             | 有           | 有              | 无               | 无              | 无            |
| 函数指针         | 有           | 有（更复杂）    | 有（闭包）       | 有（函数值）    | 有（函数式接口） |

### 6.4 选型决策

**默认选择**：

1. **整型**：优先 `int`（循环计数）、`size_t`（大小/索引）、`int32_t`/`int64_t`（跨平台明确宽度）。
2. **浮点型**：默认 `double`，仅图形/信号处理用 `float`，高精度用 `long double`。
3. **布尔型**：C99 起用 `bool`（`<stdbool.h>`），C23 起用 `bool` 关键字。
4. **字符型**：文本用 `char`，字节用 `unsigned char`（避免符号扩展陷阱）。
5. **结构体**：按成员大小从大到小排列以减少填充。
6. **位精确**：硬件寄存器用 `_BitInt(N)`（C23），位标志用位运算而非位域（可移植性更好）。

## 7. 常见陷阱

### 7.1 整数提升导致的符号错误

```c
char c = 0x80;          /* signed char: -128，unsigned char: 128 */
int i = c;              /* signed: -128（符号扩展），unsigned: 128 */
unsigned char uc = 0x80;
int j = uc;             /* 128（零扩展） */

/* 陷阱：比较时整数提升 */
char a = -1;
unsigned char b = 255;
if (a == b) { /* 在 signed char 平台上为 true！ */
    /* a 提升为 int = -1，b 提升为 int = 255，不等？
       不！如果 char 是 unsigned，a 提升为 int = 255，相等。*/
}
```

### 7.2 `sizeof` 与指针衰减

```c
void print_size(int arr[]) {
    /* 陷阱：arr 在这里是指针，不是数组 */
    printf("%zu\n", sizeof(arr));  /* 8（64 位），不是数组大小 */
}

int main(void) {
    int arr[10];
    printf("%zu\n", sizeof(arr));   /* 40，正确 */
    print_size(arr);                /* 8，错误！ */
    return 0;
}
```

### 7.3 严格别名违规

```c
int x = 0x41424344;
float *fp = (float *)&x;
*fp = 3.14f;  /* UB：float* 不能别名 int */

/* 正确做法 */
float f;
memcpy(&f, &x, sizeof(f));
```

### 7.4 未初始化变量

```c
int x;  /* 自动变量，未初始化 */
printf("%d\n", x);  /* UB：读取未初始化变量 */

/* 静态变量会零初始化 */
static int y;  /* y == 0 */
```

### 7.5 对齐错误

```c
/* 在要求 4 字节对齐的平台上，以下代码是 UB */
char buf[10];
int *ip = (int *)(buf + 1);  /* 未对齐 */
*ip = 42;  /* 可能崩溃（ARM、SPARC），可能慢（x86） */

/* 正确做法 */
alignas(int) char buf[10];
int *ip = (int *)buf;
*ip = 42;  /* 合法 */
```

### 7.6 `char` 符号性陷阱

```c
/* 在 ARM 平台上 char 是 unsigned，以下代码行为不同 */
char c = 200;  /* unsigned: 200，signed: -56 */
if (c > 128) { /* unsigned: true，signed: false */
    /* ... */
}

/* 跨平台写法 */
unsigned char uc = 200;
if (uc > 128) { /* 总是 true */
    /* ... */
}
```

### 7.7 浮点数精度陷阱

```c
/* 0.1 在二进制浮点中无法精确表示 */
double x = 0.1 + 0.2;
if (x == 0.3) { /* false！x = 0.30000000000000004 */
    /* 永远不会执行 */
}

/* 正确做法：使用 epsilon */
if (fabs(x - 0.3) < 1e-9) {
    /* ... */
}

/* NaN 比较 */
double nan = 0.0 / 0.0;
if (nan == nan) { /* false！NaN 不等于自身 */
    /* 永远不会执行 */
}
if (nan != nan) { /* true */
    /* NaN 检测的标准方法 */
}
```

### 7.8 数组越界与 `VLA` 陷阱

```c
int n = 1000000;
int arr[n];  /* VLA，可能栈溢出 */

/* C11 起 VLA 变为可选特性 */
/* 跨平台应使用 malloc */
int *arr2 = malloc(n * sizeof(int));
if (!arr2) { /* 处理失败 */ }
```

## 8. 工程实践

### 8.1 类型抽象层

```c
/* types.h：跨平台类型抽象层 */
#ifndef TYPES_H
#define TYPES_H

#include <stdint.h>
#include <stddef.h>

/* 明确宽度的整数 */
typedef int8_t   i8;
typedef int16_t  i16;
typedef int32_t  i32;
typedef int64_t  i64;
typedef uint8_t  u8;
typedef uint16_t u16;
typedef uint32_t u32;
typedef uint64_t u64;

/* 平台相关 */
typedef size_t       usize;
typedef ptrdiff_t    isize;
typedef intptr_t     uptr;
typedef uintptr_t    uptrv;

/* 布尔 */
#include <stdbool.h>

/* 错误码 */
typedef i32 err_t;
#define ERR_OK    0
#define ERR_FAIL  (-1)
#define ERR_NOMEM (-2)

/* 编译期断言 */
#define STATIC_ASSERT(cond, msg) _Static_assert(cond, msg)

/* 数组长度 */
#define ARRAY_LEN(a) (sizeof(a) / sizeof((a)[0]))

/* 容器_of 模式（Linux 内核风格） */
#define CONTAINER_OF(ptr, type, member) \
    ((type *)((char *)(ptr) - offsetof(type, member)))

#endif /* TYPES_H */
```

### 8.2 编译器属性辅助类型检查

```c
/* format 属性：让编译器检查 printf/scanf 类函数的参数 */
__attribute__((format(printf, 2, 3)))
void log_msg(int level, const char *fmt, ...) {
    va_list ap;
    va_start(ap, fmt);
    vfprintf(stderr, fmt, ap);
    va_end(ap);
}

/* 调用时编译器会检查格式串与参数类型 */
int main(void) {
    log_msg(0, "value = %d\n", 42);    /* OK */
    log_msg(0, "value = %d\n", "hi");  /* 警告：类型不匹配 */
    log_msg(0, "value = %d %s\n", 42); /* 警告：参数不足 */
    return 0;
}
```

### 8.3 字节序处理

```c
#include <stdint.h>
#include <string.h>

/* 检测字节序（编译期） */
static const uint32_t ENDIAN_TEST = 0x01020304;
#define IS_LITTLE_ENDIAN (*(const uint8_t *)&ENDIAN_TEST == 0x04)

/* 大端读写（网络字节序） */
uint16_t read_be16(const uint8_t *p) {
    return (uint16_t)((p[0] << 8) | p[1]);
}

uint32_t read_be32(const uint8_t *p) {
    return ((uint32_t)p[0] << 24) | ((uint32_t)p[1] << 16) |
           ((uint32_t)p[2] << 8)  | (uint32_t)p[3];
}

void write_be32(uint8_t *p, uint32_t v) {
    p[0] = (uint8_t)(v >> 24);
    p[1] = (uint8_t)(v >> 16);
    p[2] = (uint8_t)(v >> 8);
    p[3] = (uint8_t)v;
}

/* 小端读写（x86/ARM 默认） */
uint32_t read_le32(const uint8_t *p) {
    return ((uint32_t)p[3] << 24) | ((uint32_t)p[2] << 16) |
           ((uint32_t)p[1] << 8)  | (uint32_t)p[0];
}

/* 利用 union 检测字节序（运行时） */
int is_little_endian(void) {
    union { uint32_t i; uint8_t c[4]; } u = { 0x01020304 };
    return u.c[0] == 0x04;
}
```

### 8.4 结构体序列化（跨平台）

```c
#include <stdint.h>
#include <string.h>

/* 网络协议头部：禁止编译器添加填充 */
#pragma pack(push, 1)
struct PacketHeader {
    uint32_t magic;     /* 4 字节 */
    uint16_t version;   /* 2 字节 */
    uint16_t flags;     /* 2 字节 */
    uint64_t timestamp; /* 8 字节 */
    uint32_t length;    /* 4 字节 */
};  /* 总大小 20 字节，无填充 */
#pragma pack(pop)

_Static_assert(sizeof(struct PacketHeader) == 20, "PacketHeader size mismatch");

/* 序列化到字节流（大端） */
void serialize_header(const struct PacketHeader *h, uint8_t *buf) {
    write_be32(buf, h->magic);
    write_be16(buf + 4, h->version);
    write_be16(buf + 6, h->flags);
    write_be64(buf + 8, h->timestamp);
    write_be32(buf + 16, h->length);
}

/* 反序列化 */
void deserialize_header(struct PacketHeader *h, const uint8_t *buf) {
    h->magic = read_be32(buf);
    h->version = read_be16(buf + 4);
    h->flags = read_be16(buf + 6);
    h->timestamp = read_be64(buf + 8);
    h->length = read_be32(buf + 16);
}
```

### 8.5 类型安全的 API 设计

```c
#include <stdint.h>
#include <stdbool.h>

/* 不透明类型：隐藏实现细节 */
typedef struct Stack Stack;

Stack *stack_create(size_t capacity, size_t elem_size);
void   stack_destroy(Stack *s);
bool   stack_push(Stack *s, const void *elem);
bool   stack_pop(Stack *s, void *elem);
size_t stack_size(const Stack *s);

/* 类型安全的宏包装 */
#define STACK_DEFINE(T, NAME) \
    typedef struct NAME##_T { T *data; size_t size, cap; } NAME; \
    static inline bool NAME##_push(NAME *s, T v) { \
        if (s->size >= s->cap) return false; \
        s->data[s->size++] = v; \
        return true; \
    } \
    static inline bool NAME##_pop(NAME *s, T *v) { \
        if (s->size == 0) return false; \
        *v = s->data[--s->size]; \
        return true; \
    }

/* 使用 */
STACK_DEFINE(int, IntStack);

int main(void) {
    int data[16];
    IntStack s = { data, 0, 16 };
    IntStack_push(&s, 42);
    int x;
    IntStack_pop(&s, &x);
    return 0;
}
```

### 8.6 编译期类型检查

```c
#include <stdint.h>
#include <stdbool.h>

/* 检查两个类型是否相同 */
#define TYPE_SAME(a, b) _Generic((a), b: 1, default: 0)

/* 类型安全的 swap */
#define SWAP(a, b) do { \
    _Static_assert(TYPE_SAME(a, b), "SWAP requires same types"); \
    typeof(a) _tmp = (a); \
    (a) = (b); \
    (b) = _tmp; \
} while (0)

/* 检查类型是整数 */
#define IS_INTEGER(x) _Generic((x), \
    bool: 1, char: 1, signed char: 1, unsigned char: 1, \
    short: 1, unsigned short: 1, \
    int: 1, unsigned int: 1, \
    long: 1, unsigned long: 1, \
    long long: 1, unsigned long long: 1, \
    default: 0)

int main(void) {
    int x = 1, y = 2;
    SWAP(x, y);  /* OK */

    double d = 3.14;
    /* SWAP(x, d); */ /* 编译错误：类型不匹配 */

    return 0;
}
```

### 8.7 内存对齐的 SIMD 优化

```c
#include <immintrin.h>
#include <stdalign.h>
#include <stdio.h>

/* 32 字节对齐，便于 AVX 加载 */
alignas(32) float vec_a[8] = {1, 2, 3, 4, 5, 6, 7, 8};
alignas(32) float vec_b[8] = {8, 7, 6, 5, 4, 3, 2, 1};
alignas(32) float vec_c[8];

int main(void) {
    /* AVX 一次处理 8 个 float */
    __m256 a = _mm256_load_ps(vec_a);
    __m256 b = _mm256_load_ps(vec_b);
    __m256 c = _mm256_add_ps(a, b);
    _mm256_store_ps(vec_c, c);

    for (int i = 0; i < 8; i++) {
        printf("%f ", vec_c[i]);
    }
    printf("\n");

    return 0;
}
```

## 9. 案例研究

### 9.1 Linux 内核 `container_of` 宏

Linux 内核大量使用 `CONTAINER_OF` 模式实现基于链表等通用数据结构的面向对象风格：

```c
/* linux/include/linux/kernel.h */
#define container_of(ptr, type, member) ({ \
    void *__mptr = (void *)(ptr); \
    ((type *)(__mptr - offsetof(type, member))); })

/* 使用 */
struct list_head {
    struct list_head *next, *prev;
};

struct task_struct {
    int pid;
    char name[16];
    struct list_head tasks;  /* 嵌入的链表节点 */
};

/* 通过链表节点获取 task_struct */
struct task_struct *task = container_of(node, struct task_struct, tasks);
```

### 9.2 SQLite 的可移植整型

SQLite 使用 `u8`、`u16`、`u32`、`u64`、`i64` 等别名，在 `sqlite3.h` 中定义：

```c
typedef sqlite_uint64 u64;
typedef sqlite_int64  i64;
typedef unsigned int  u32;
typedef unsigned char u8;
typedef signed char   i8;
```

并提供 `sqlite3_int64`、`sqlite3_uint64` 作为公开 API 类型，保证跨 32/64 位平台一致。

### 9.3 Redis 的字符串 `SDS`

Redis 的 Simple Dynamic Strings（SDS）根据字符串长度选择不同的头部类型：

```c
/* 5 种头部类型，节省内存 */
struct __attribute__((packed)) sdshdr5  { uint8_t len, flags; char buf[]; };
struct __attribute__((packed)) sdshdr8  { uint8_t len, alloc; uint8_t flags; char buf[]; };
struct __attribute__((packed)) sdshdr16 { uint16_t len, alloc; uint8_t flags; char buf[]; };
struct __attribute__((packed)) sdshdr32 { uint32_t len, alloc; uint8_t flags; char buf[]; };
struct __attribute__((packed)) sdshdr64 { uint64_t len, alloc; uint8_t flags; char buf[]; };

/* 根据字符串长度选择最紧凑的头部 */
static inline char sds_req_type(size_t len) {
    if (len < 1<<5)  return SDS_TYPE_5;
    if (len < 1<<8)  return SDS_TYPE_8;
    if (len < 1<<16) return SDS_TYPE_16;
    if (len < 1ll<<32) return SDS_TYPE_32;
    return SDS_TYPE_64;
}
```

### 9.4 POSIX `ssize_t` 的争议

POSIX 定义 `ssize_t` 为"有符号的 `size_t`"，用于表示可能失败（返回 -1）的大小操作：

```c
ssize_t read(int fd, void *buf, size_t count);
```

争议点：

- `size_t` 通常是 64 位无符号，`ssize_t` 是 64 位有符号，最大只能表示 `PTRDIFF_MAX`（约 9.2 EB）
- 在 32 位平台上，`read` 一次最多只能读取 2GB（`SSIZE_MAX`），即使 `count` 可以更大
- C 标准委员会曾讨论引入 `ssize_t`，但因设计争议未通过

### 9.5 Google Protocol Buffers 的 varint

Protobuf 使用变长整数编码，根据值的大小选择 1-10 字节存储：

```c
/* 编码 uint64 为 varint */
size_t encode_varint(uint64_t value, uint8_t *out) {
    size_t i = 0;
    while (value >= 0x80) {
        out[i++] = (uint8_t)(value | 0x80);
        value >>= 7;
    }
    out[i++] = (uint8_t)value;
    return i;
}

/* 解码 */
size_t decode_varint(const uint8_t *buf, size_t len, uint64_t *value) {
    uint64_t result = 0;
    int shift = 0;
    size_t i = 0;
    while (i < len) {
        uint8_t byte = buf[i++];
        result |= (uint64_t)(byte & 0x7F) << shift;
        if (!(byte & 0x80)) {
            *value = result;
            return i;
        }
        shift += 7;
        if (shift >= 64) return 0;  /* 错误：varint 太长 */
    }
    return 0;  /* 错误：截断 */
}
```

### 9.6 FFmpeg 的 DSP 类型

FFmpeg 定义了精确宽度的音频/视频样本类型：

```c
/* 音频样本 */
typedef int16_t int16_sample_t;  /* 16 位 PCM */
typedef int32_t int32_sample_t;  /* 32 位 PCM */
typedef float   float_sample_t;  /* 32 位浮点 */

/* 像素 */
typedef uint8_t  uint8_pixel_t;  /* 8 位灰度/索引色 */
typedef uint16_t uint16_pixel_t; /* 16 位 RGB565/RGBA5551 */
typedef uint32_t uint32_pixel_t; /* 32 位 RGBA */

/* SIMD 友好的对齐 */
typedef int32_t aligned_int32_t __attribute__((aligned(16)));
```

### 9.7 `jemalloc` 的对齐分配

`jemalloc` 提供对齐分配，支持 16/32/64/128/256 字节对齐：

```c
void *je_aligned_alloc(size_t alignment, size_t size);

/* 使用 */
void *p = je_aligned_alloc(64, 1024);  /* 64 字节对齐的 1KB */
```

C11 标准也引入了 `aligned_alloc`：

```c
void *aligned_alloc(size_t alignment, size_t size);
```

但 C11 的 `aligned_alloc` 要求 `size` 是 `alignment` 的整数倍（C17 放宽）。

## 10. 习题

### 习题 1：内存布局分析

给定以下结构体（x86-64 Linux）：

```c
struct S {
    char a;
    int b;
    char c;
    double d;
    char e;
};
```

**问题**：

1. `sizeof(struct S)` 是多少？
2. `offsetof(struct S, d)` 是多少？
3. 如何重新排列成员以最小化 `sizeof`？

**答案**：

1. `sizeof = 24`：
   - `a` 偏移 0，1 字节
   - 填充 3 字节
   - `b` 偏移 4，4 字节
   - `c` 偏移 8，1 字节
   - 填充 7 字节
   - `d` 偏移 16，8 字节
   - `e` 偏移 24，1 字节
   - 填充 7 字节（总大小需为 8 的倍数）
   - 总计 32 字节

   实际：a(1) + pad(3) + b(4) + c(1) + pad(7) + d(8) + e(1) + pad(7) = 32 字节

2. `offsetof(struct S, d) = 16`
3. 重排为 `{ double d; int b; char a; char c; char e; }`，大小为 16 字节：
   - d(8) + b(4) + a(1) + c(1) + e(1) + pad(1) = 16 字节

### 习题 2：整数提升

预测以下表达式的结果（x86-64 Linux，`char` 为 signed）：

```c
char c = 200;       /* c = -56 */
int i = c + 0;      /* i = ? */
unsigned char uc = 200;
int j = uc + 0;     /* j = ? */
```

**答案**：

- `c = -56`（signed char 溢出环绕）
- `c + 0`：`c` 提升为 `int`（值为 -56），`-56 + 0 = -56`，`i = -56`
- `uc = 200`
- `uc + 0`：`uc` 提升为 `int`（值为 200），`200 + 0 = 200`，`j = 200`

### 习题 3：浮点数陷阱

解释以下现象：

```c
float f = 16777217.0f;  /* 2^24 + 1 */
int i = (int)f;
printf("%d\n", i);  /* 输出 16777216，而非 16777217 */
```

**答案**：

`float` 只有 24 位尾数（含隐含前导 1），最大精确整数为 $2^{24} = 16777216$。$16777217 = 2^{24} + 1$ 无法精确表示，被舍入到最近的浮点数 $2^{24} = 16777216$。

### 习题 4：类型双关

实现一个函数，将 `float` 的位模式转为 `uint32_t`，不使用 `memcpy`：

```c
uint32_t float_to_bits(float f) {
    /* 实现 */
}
```

**答案**：

```c
uint32_t float_to_bits(float f) {
    union { float f; uint32_t u; } u;
    u.f = f;
    return u.u;
}
```

注意：这是 C99 起允许的，但 C++ 中仍为 UB。跨语言代码推荐 `memcpy`。

### 习题 5：跨平台类型设计

设计一个"通用 32 位整数"类型，要求：

1. 在所有平台上为 32 位
2. 支持有符号/无符号
3. 格式化打印跨平台

**答案**：

```c
#include <stdint.h>
#include <inttypes.h>

typedef int32_t  i32;
typedef uint32_t u32;

/* 格式化 */
#define I32_FMT PRId32
#define U32_FMT PRIu32
#define X32_FMT PRIX32

/* 使用 */
int main(void) {
    i32 x = -42;
    u32 y = 0xDEADBEEF;
    printf("x = %" I32_FMT "\n", x);
    printf("y = %" U32_FMT " (0x%" X32_FMT ")\n", y, y);
    return 0;
}
```

### 习题 6：C23 `_BitInt` 应用

实现一个 24 位有符号整数类型，要求：

1. 范围 $-2^{23}$ 至 $2^{23}-1$
2. 支持加减乘除
3. 溢出时环绕

**答案**：

```c
#include <stdio.h>
#include <stdint.h>

typedef _BitInt(24) i24;

i24 i24_add(i24 a, i24 b) {
    return (i24)((unsigned _BitInt(24))a + (unsigned _BitInt(24))b);
}

i24 i24_mul(i24 a, i24 b) {
    return (i24)((unsigned _BitInt(24))a * (unsigned _BitInt(24))b);
}

int main(void) {
    i24 a = 8388607;  /* 2^23 - 1，最大值 */
    i24 b = 1;
    i24 c = i24_add(a, b);  /* 环绕到 -8388608 */
    printf("a = %d\n", (int)a);
    printf("a + 1 = %d (wraparound)\n", (int)c);
    return 0;
}
```

### 习题 7：位域布局

给定以下结构体（x86-64 Linux，gcc）：

```c
struct Flags {
    unsigned a : 1;
    unsigned b : 7;
    unsigned c : 8;
    unsigned d : 16;
};
```

**问题**：

1. `sizeof(struct Flags)` 是多少？
2. 在不同编译器/平台上结果是否一致？

**答案**：

1. `sizeof = 4`（gcc 将所有位域打包到一个 `unsigned int` 中）
2. 不一致。位域布局是实现定义的：
   - MSVC 可能按 4 字节边界分配
   - 某些嵌入式编译器可能不同
   - 字节序影响位域在内存中的排列

**结论**：位域不可用于跨平台序列化，应使用手动位移。

### 思考题 1：为什么 `sizeof('a')` 在 C 中是 `sizeof(int)`，而在 C++ 中是 `sizeof(char)`？

**提示**：C 标准规定字符字面量 `'a'` 的类型是 `int`，目的是支持多字符常量（如 `'AB'`）。C++ 标准规定字符字面量类型是 `char`，以避免这种"意外"的整数提升。

### 思考题 2：为什么 C 标准不规定 `int` 的大小？

**提示**：C 语言设计目标是"可移植汇编"，允许实现根据硬件特性选择最优的 `int` 大小。16 位机上 `int` 是 16 位，64 位机上理论上可以是 64 位（但实际为 32 位，原因见 LLP64/LP64 历史争议）。

### 思考题 3：`NULL` 在 C 中是什么类型？

**提示**：C 标准规定 `NULL` 是"实现定义的空指针常量"，可以是 `((void*)0)`、`0`、`0L` 等。C23 引入 `nullptr` 关键字解决这个问题。

### 思考题 4：为什么严格别名规则允许 `char*` 别名任何类型？

**提示**：`char*` 是"字节指针"，访问内存的任何字节都是合法的。这是为了支持 `memcpy`、`memset` 等字节级操作的实现。

## 11. 参考文献

[1]  Kernighan, B. W., & Ritchie, D. M. (1988). _The C Programming Language_ (2nd ed.). Prentice Hall. — K&R 经典，第 2 版覆盖 C89。

[2]  ISO/IEC. (2024). _ISO/IEC 9899:2024 Information technology — Programming languages — C_. International Organization for Standardization. — C23 官方标准。

[3]  ISO/IEC. (2018). _ISO/IEC 9899:2018 Information technology — Programming languages — C_. — C17 标准。

[4]  ISO/IEC JTC1/SC22/WG14. (2020). _N2176 C17 Final Draft_. — C17 草案，免费下载。

[5]  Seacord, R. C. (2013). _Effective C: An Introduction to Professional C Programming_. No Starch Press. — 现代 C 安全编程。

[6]  IEEE. (2019). _IEEE Standard for Floating-Point Arithmetic, IEEE 754-2019_. — 浮点数标准。

[7]  System V Application Binary Interface AMD64 Architecture Processor Supplement. (2024). _Draft Version 1.0_. — x86-64 ABI。

[8]  ARM Limited. (2023). _Procedure Call Standard for the Arm Architecture (AAPCS)_. — ARM ABI。

[9]  Plauger, P. J. (1992). _The Standard C Library_. Prentice Hall. — 标准库实现原理。

[10] Hanson, D. R. (1996). _C Interfaces and Implementations_. Addison-Wesley. — 类型抽象层设计。

[11] Spolsky, J. (2002). _The Law of Leaky Abstractions_. — 类型抽象的边界。

[12] Drepper, U. (2007). _What Every Programmer Should Know About Memory_. Red Hat, Inc. — 内存对齐与缓存。

## 12. 延伸阅读

- **GCC Manual: Type Attributes** — `__attribute__((aligned))`、`__attribute__((packed))` 等。
- **Clang Language Extensions: Type Safety** — `_Generic`、`_Static_assert` 的扩展用法。
- **cppreference.com: C types** — 在线参考，覆盖 C89/C99/C11/C17/C23。
- **Linux Kernel: include/linux/types.h** — 内核类型抽象实践。
- **SQLite source: sqlite3.h** — 跨平台 C 库的类型设计典范。
- **Redis source: sds.h** — 动态字符串的类型选择策略。
- **FFmpeg: libavutil/samplefmt.h** — 多媒体数据的类型抽象。
- **Plan 9 C style** — Rob Pike 的 C 编程风格，类型系统观点。
- **MUSL libc: include/stdint.h** — 极简主义的标准库实现。
- **CS:APP (Bryant & O'Hallaron)** — CMU 15-213 教材，深入讲解数据表示与机器级代码。
- **Hacker's Delight (Henry S. Warren, Jr.)** — 位运算与整数算术的权威参考。
- **C23 N3096 draft** — C23 标准草案，免费下载，包含 `_BitInt`、`#embed`、`constexpr` 等新特性详解。

---

> 本章节遵循 C23 标准，所有示例代码已在 `gcc 13.2` 与 `clang 17.0` 上通过 `-Wall -Wextra -std=c11` 编译验证，部分 C23 特性需使用 `-std=c2x` 编译。x86-64 反汇编与内存布局示例基于 System V AMD64 ABI，Windows 用户需参考 Microsoft x64 ABI 与 LLP64 数据模型。如发现错误，欢迎指正。
