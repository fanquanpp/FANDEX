---
order: 63
title: 内联函数与宏
module: c
category: C
difficulty: intermediate
description: inline函数与预处理器宏
author: fanquanpp
updated: '2026-07-21'
related:
  - c/属性与编译器扩展
  - c/安全函数与边界检查
  - c/复杂声明解析
  - c/POSIX线程
prerequisites:
  - c/概述
---

## 概述

内联函数(inline function)与预处理器宏(macro)是 C 语言中两种实现代码复用与零开销抽象的机制。宏由预处理器(preprocessor)在编译前期进行纯文本替换,起源于 1969 年 BCPL 语言的 `LET` 与 `VALOF` 机制;`inline` 关键字则由 C99 标准正式引入,其思想可追溯至 1984 年 GCC 1.0 的 `__inline` 扩展与 MacLaren 1977 年的"inline expansion"研究。两者都旨在消除函数调用开销,但语义、安全性、可调试性与工程适用性差异显著。

宏的优势在于类型泛型、编译时计算、字符串化与标记粘贴等元编程能力,但缺乏类型检查、参数多次求值、作用域污染等问题使其成为 C 语言安全性的主要争议点。内联函数具备类型检查、参数单次求值、遵循作用域规则、可取地址可调试等优势,但无法替代宏的元编程能力。现代 C 工程实践倾向于"能用 `static inline` 就不用宏",仅在泛型、编译时反射、DSL 构造等场景使用宏,并通过 `_Generic`(C11)、`_Static_assert`(C11)、语句表达式(GCC 扩展)等机制减少对宏的依赖。

本文系统化阐述宏展开机制、`inline` 语义、`static inline`/`extern inline`/`inline` 三种形式的差异、X-Macro 元编程、`_Generic` 类型泛型、GCC 语句表达式、编译时断言、容器宏等高级技术,并分析 Linux kernel `container_of`、Redis `sds` 等真实案例。

## 学习目标

### 识记层(Remember)

- 列举 C 预处理器的翻译阶段(translation phase)1~8 及宏展开发生的阶段。
- 复述 `#define`、`#`、`##`、`__VA_ARGS__`、`##__VA_ARGS__` 的语法与作用。
- 说明 C99 `inline`、`extern inline`、`static inline` 三种形式的链接与内联语义差异。
- 列举 C11 引入的 `_Generic`、`_Static_assert` 与宏协作的典型用法。

### 理解层(Understand)

- 解释宏参数多次求值导致的副作用问题及其形式化推导。
- 阐述 `do { ... } while (0)` 包装多语句宏的必要性。
- 说明 `inline` 关键字对编译器是建议而非强制,以及 `__attribute__((always_inline))`、`__forceinline` 的差异。
- 推导 `static inline` 在多个翻译单元中产生多个副本对二进制体积的影响。

### 应用层(Apply)

- 使用 `static inline` 在头文件中定义高性能数学辅助函数。
- 使用 `do-while(0)`、`({ ... })`(GCC 扩展)编写安全的多语句宏。
- 使用 X-Macro 模式从单一数据源生成枚举、字符串表、跳转表。
- 使用 `_Generic` 实现类型安全的 `MAX`、`PRINT` 等泛型宏。

### 分析层(Analyze)

- 对比宏与 `static inline` 在类型安全、调试性、代码膨胀、编译时间四个维度的差异。
- 分析 `inline`(无 static)在 C99 与 C11 下的不同链接行为,以及 glibc、musl、MSVC CRT 的实现差异。
- 推导 `container_of` 宏的 `((type *)0)->member` 零偏移技巧与编译器兼容性。

### 评价层(Evaluate)

- 评估"全部用 `static inline` 替代宏"策略在元编程、DSL、泛型容器场景的可行性。
- 论证 LTO(Link-Time Optimization)与 PGO(Profile-Guided Optimization)对 `inline` 决策的影响,以及 `__attribute__((always_inline))` 在 LTO 下的潜在负面影响。
- 评判 Linux kernel 大量使用宏(`container_of`、`list_entry`、`min`、`max`)与现代 C++ 模板、Rust 泛型在工程可维护性上的相对优劣。

### 创造层(Create)

- 设计一套面向大型 C 项目的"宏 + `static inline` + `_Generic`"分层抽象库,统一类型安全、可调试、可测试。
- 构建基于 X-Macro 的协议代码生成器,从单一 schema 生成序列化、反序列化、校验代码。
- 实现一个编译时类型反射系统,通过 `_Generic` 与宏组合实现运行时类型注册与动态分发。

## 历史动机与背景

### 1. 宏的起源:BCPL 与 CPL 时代

宏的概念最早可追溯至 1963 年 CPL 语言与 1967 年 BCPL 语言。BCPL 提供 `LET` 定义函数、`VALOF` 块表达式,以及简单的词法宏系统。Martin Richards 在 BCPL 中首次实现了"代码模板替换"思想,这是现代宏的雏形。1969 年 Ken Thompson 在 PDP-7 上设计 B 语言时,沿用了 BCPL 的宏思想,并通过 `#` 前缀引入预处理器。

### 2. C 预处理器的诞生(1972-1973)

Dennis Ritchie 在 1972 年设计 C 语言时,引入了独立的预处理器 cpp。最初的 cpp 仅支持 `#include`、`#define` 简单对象式宏,1973 年后逐步加入函数式宏、条件编译(`#ifdef`、`#ifndef`)、`#` 字符串化操作符。1978 年 K&R C 出版时,预处理器已成为 C 语言不可或缺的组成部分。1989 年 ANSI C(C89)正式标准化预处理器的语法与语义,引入 `##` 标记粘贴操作符。

### 3. inline 关键字的引入(1984-1999)

内联展开的思想早在 1960 年代 Lisp 编译器中就已出现。1984 年 GCC 1.0 引入 `__inline__` 扩展关键字,允许程序员建议编译器内联展开函数。1988 年 C++ 标准草案正式采纳 `inline` 关键字。1999 年 C99 标准将 `inline` 纳入 C 语言,但其语义与 C++ 存在微妙差异:C99 `inline`(无 static)表示"提供内联定义,但同时需要外部定义",而 C++ `inline` 表示"允许多重定义,链接器合并"。

### 4. C11 与现代宏技术(2011 至今)

C11 标准引入 `_Generic` 初步支持类型泛型编程,`_Static_assert` 实现编译时断言,`_Alignof`/`_Alignas` 对齐控制。这些特性减少了对宏的依赖,但宏在元编程、X-Macro、DSL 构造等场景仍不可替代。C23 标准进一步引入 `#embed` 指令(嵌入二进制资源)、`#elifdef`、`#elifndef` 简化条件编译,并改进 `__VA_OPT__` 处理可变参数宏的空参数情况。

### 5. 现代编译器的内联决策

GCC、Clang、MSVC 等现代编译器在 `-O2`/`-O3` 优化级别下,即使没有 `inline` 关键字也会自动内联小函数。编译器内联决策基于函数大小、调用频率、寄存器压力、代码膨胀等因素的综合启发式。LTO(Link-Time Optimization)允许跨模块内联,使 `static inline` 不再是头文件函数的唯一选择。PGO(Profile-Guided Optimization)根据运行时 profile 数据指导内联,热点路径函数更可能被内联。

## 形式化定义

### 1. 宏展开的形式化

设对象式宏定义 `#define M replacement-list`,源代码中出现标识符 `M` 时,预处理器将其替换为 `replacement-list`。函数式宏 `#define M(params) replacement-list` 的展开形式化:

$$
\text{expand}(M(a_1, a_2, \dots, a_n)) = \sigma(\text{replacement-list}, \text{params} \to \text{args})
$$

其中 $\sigma$ 是替换算子,将 `replacement-list` 中每个参数 $p_i$ 替换为实际参数 $a_i$ 的展开文本(注意是文本而非值)。`#` 操作符将参数转为字符串字面量:

$$
\#p_i \to \text{stringify}(\text{expand}(a_i))
$$

`##` 操作符进行标记粘贴(token pasting):

$$
t_1 \text{ ## } t_2 \to \text{concat}(\text{expand}(t_1), \text{expand}(t_2))
$$

### 2. 内联函数的语义

`inline` 关键字向编译器发出"建议内联"的提示。形式化地,设函数 $f$ 调用点 $c$ 的执行成本:

$$
\text{cost}(c) = \text{cost}_{\text{call}} + \text{cost}_{\text{body}} + \text{cost}_{\text{ret}}
$$

内联展开后:

$$
\text{cost}_{\text{inline}}(c) = \text{cost}_{\text{body}} + \text{cost}_{\text{prologue/epilogue optimization}}
$$

当 $\text{cost}_{\text{call}} + \text{cost}_{\text{ret}} - \text{cost}_{\text{prologue/epilogue optimization}} > 0$ 且代码膨胀代价可接受时,编译器选择内联。

### 3. C99 inline 三种形式的链接语义

C99 标准 6.7.4 规定 `inline` 函数的链接语义:

| 形式 | 提供定义 | 外部定义 | 内联定义 | 典型用法 |
|------|---------|---------|---------|---------|
| `inline`(无 static) | 头文件内联定义 | 源文件 extern inline | 提供 | 跨模块内联 + 后备 |
| `extern inline` | 源文件 | 提供 | 不提供 | 提供外部定义 |
| `static inline` | 头文件 | 每个翻译单元独立副本 | 提供 | 最常用,自包含 |
| `inline`(C++) | 头文件 | 合并 | 提供 | C++ 语义 |

形式化:`static inline` 函数 $f$ 在每个包含其定义的翻译单元 $T_i$ 中都有独立符号 $f_{T_i}$,链接器不合并。`inline`(C99)在头文件中提供内联定义,在某个源文件中通过 `extern inline f;` 提供外部定义,其他翻译单元调用 $f$ 时优先内联,无法内联时调用外部定义。

### 4. 宏的求值次数模型

设函数式宏 `#define M(p) E(p)`,其中 $E(p)$ 中 $p$ 出现 $k$ 次。调用 `M(arg)` 时,`arg` 被求值 $k$ 次:

$$
\text{evaluations}(\text{M}(\text{arg})) = k \cdot \text{evaluations}(\text{arg})
$$

若 `arg` 有副作用(如 `i++`),则副作用被放大 $k$ 倍。内联函数参数只求值一次,与 $k$ 无关。

### 5. 代码膨胀的形式化

设函数 $f$ 大小为 $S_f$,被调用 $n$ 次,全部内联后代码膨胀:

$$
\Delta S = n \cdot S_f - S_f - \sum_{i=1}^{n} \text{cost}_{\text{call}}(i)
$$

当 $n \cdot S_f$ 超过指令缓存容量时,内联反而降低性能。现代编译器通过启发式(如 `-finline-limit`、`--param max-inline-insns-auto`)控制膨胀。

## 理论推导

### 1. 宏参数副作用的未定义行为

```c
#define SQUARE(x) ((x) * (x))
int i = 3;
int r = SQUARE(i++);  /* 展开为 ((i++) * (i++)) */
```

C 标准 6.5/2 规定:若对同一标量对象的两次修改之间无序列点,行为未定义。`SQUARE(i++)` 中 `i` 被修改两次且无序列点,UB。形式化:

$$
\text{seq}(i++_1) \parallel \text{seq}(i++_2) \implies \text{UB}
$$

不同编译器结果可能为 9、12、15、20 等,均符合标准。GCC `-Wsequence-point` 可警告。

### 2. 宏括号缺失的优先级陷阱

```c
#define DOUBLE(x) x + x
int r = DOUBLE(3) * 2;  /* 展开为 3 + 3 * 2 = 9,而非 12 */
```

C 运算符优先级:`*` 高于 `+`。展开后 `3 + 3 * 2` 按优先级解析为 `3 + (3 * 2) = 9`。正确写法:

```c
#define DOUBLE(x) ((x) + (x))
```

形式化:设宏体 $E = e_1 \oplus e_2 \oplus \dots \oplus e_n$,外层表达式 $O = E \otimes \text{other}$。若 $\otimes$ 优先级高于 $\oplus$,则 $O$ 解析为 $e_1 \oplus e_2 \oplus \dots \oplus (e_n \otimes \text{other})$,破坏语义。解决:对 $E$ 整体加括号 `((e_1 \oplus \dots \oplus e_n))`。

### 3. do-while(0) 的必要性

```c
#define BAD_SWAP(a, b, t) t _tmp = a; a = b; b = _tmp;
if (cond)
    BAD_SWAP(x, y, int);  /* 仅 t _tmp = a 在 if 内 */
else
    do_something();  /* else 悬挂,编译错误 */
```

展开后:

```c
if (cond)
    int _tmp = x; x = y; y = _tmp;;
else
    do_something();
```

`else` 无法匹配 `if`(因 `_tmp = x;` 后的 `;` 使 `if` 提前结束)。`do { ... } while (0)` 是单个语句,展开后 `if` 与 `else` 正确匹配:

```c
#define SWAP(a, b, t) do { t _tmp = (a); (a) = (b); (b) = _tmp; } while (0)
```

形式化:`do { ... } while (0)` 在语法上等价于单个 `statement`,可出现在任何要求 `statement` 的位置(如 `if`、`for` 体),且尾部不需要分号。

### 4. static inline 的代码膨胀分析

设头文件 `math_utils.h` 定义:

```c
static inline int clamp(int x, int lo, int hi) {
    return x < lo ? lo : (x > hi ? hi : x);
}
```

若被 100 个 `.c` 文件包含,且每个文件调用 `clamp` 至少一次,则编译器可能为每个翻译单元生成一份 `clamp` 的非内联副本。链接时这些副本独立存在(因 `static`),二进制增加 $100 \times S_{\text{clamp}}$。现代编译器在 `-O1` 以上通常会消除未使用的 `static` 函数(`-ffunction-sections -Wl,--gc-sections`),但若被取地址则必须保留。

### 5. 内联与寄存器分配的交互

内联展开后,函数体中的局部变量与调用点的局部变量共享寄存器分配空间。若内联函数使用 10 个寄存器,调用点已用 6 个,总共需要 16 个,超过 x86-64 ABI 的 14 个通用寄存器,触发溢出(spill),反而降低性能。编译器通过寄存器压力分析(register pressure estimation)决定是否内联。

形式化:设调用点寄存器需求 $R_{\text{caller}}$,内联函数需求 $R_{\text{callee}}$,平台寄存器数 $R_{\text{plat}}$。若 $R_{\text{caller}} + R_{\text{callee}} > R_{\text{plat}}$,溢出代价 $\text{cost}_{\text{spill}}$ 可能超过内联收益,编译器拒绝内联。

## 代码示例

### 示例 1:基础宏与内联函数对比

```c
/* 文件: macro_vs_inline.c
 * 演示宏与内联函数在类型安全、副作用、调试性上的差异
 */
#include <stdio.h>

/* 函数式宏:无类型检查,参数多次求值 */
#define SQUARE_MACRO(x) ((x) * (x))

/* static inline 函数:有类型检查,参数单次求值 */
static inline int square_inline(int x) {
    return x * x;
}

/* 演示副作用问题 */
void demo_side_effect(void) {
    int i = 3;

    /* 宏:i 被求值两次,行为未定义 */
    /* int r1 = SQUARE_MACRO(i++); */ /* UB,编译器警告 */

    /* 内联函数:i 只求值一次,行为确定 */
    int r2 = square_inline(i++);  /* r2 = 9, i = 4 */
    printf("inline: r2=%d, i=%d\n", r2, i);
}

/* 演示类型检查 */
void demo_type_check(void) {
    /* 宏:无类型检查,任何类型都接受 */
    double dm = SQUARE_MACRO(3.14);   /* 展开 ((3.14) * (3.14)),结果 double */
    printf("macro double: %f\n", dm);

    /* 内联函数:类型严格检查 */
    /* square_inline(3.14); */  /* 编译警告:int 与 double 不匹配 */
    int di = square_inline(3);   /* 正确 */
    printf("inline int: %d\n", di);
}

int main(void) {
    demo_side_effect();
    demo_type_check();
    return 0;
}
```

### 示例 2:安全的多语句宏(do-while(0))

```c
/* 文件: safe_macros.c
 * 演示使用 do-while(0) 与语句表达式编写安全的多语句宏
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* 安全交换宏:do-while(0) 包装,避免悬挂 else */
#define SWAP(a, b, type) do {    \
    type _tmp = (a);             \
    (a) = (b);                   \
    (b) = _tmp;                  \
} while (0)

/* 安全分配宏:检查返回值并退出 */
#define MALLOC_OR_EXIT(ptr, size, type) do {       \
    (ptr) = (type *)malloc((size) * sizeof(type)); \
    if (!(ptr)) {                                  \
        fprintf(stderr, "malloc failed at %s:%d\n", \
                __FILE__, __LINE__);                \
        exit(EXIT_FAILURE);                         \
    }                                              \
} while (0)

/* GCC 语句表达式:返回值,参数单次求值 */
#if defined(__GNUC__) || defined(__clang__)
#define MAX_EXPR(a, b) ({         \
    __typeof__(a) _a = (a);       \
    __typeof__(b) _b = (b);       \
    _a > _b ? _a : _b;            \
})

#define MIN_EXPR(a, b) ({         \
    __typeof__(a) _a = (a);       \
    __typeof__(b) _b = (b);       \
    _a < _b ? _a : _b;            \
})
#else
/* 非 GCC 平台:回退到普通宏(有副作用风险) */
#define MAX_EXPR(a, b) ((a) > (b) ? (a) : (b))
#define MIN_EXPR(a, b) ((a) < (b) ? (a) : (b))
#endif

int main(void) {
    int x = 10, y = 20;
    SWAP(x, y, int);
    printf("after swap: x=%d, y=%d\n", x, y);  /* x=20, y=10 */

    int *arr = NULL;
    MALLOC_OR_EXIT(arr, 100, int);
    arr[0] = 42;
    printf("arr[0]=%d\n", arr[0]);
    free(arr);

    /* 语句表达式:参数单次求值,可安全用于副作用表达式 */
    int i = 5, j = 3;
    int m = MAX_EXPR(i++, j++);
    printf("max=%d, i=%d, j=%d\n", m, i, j);  /* max=5, i=6, j=4 */

    return 0;
}
```

### 示例 3:X-Macro 元编程模式

```c
/* 文件: x_macro.c
 * 演示 X-Macro 模式:从单一数据源生成枚举、字符串表、处理函数
 * 优势:新增条目只需修改 X 列表,所有派生代码自动同步
 */
#include <stdio.h>
#include <string.h>

/* 单一数据源:错误码定义表
 * 列:枚举名、错误值、错误消息
 */
#define ERROR_TABLE(X)             \
    X(ERR_NONE,     0,  "Success") \
    X(ERR_INVALID,  -1, "Invalid argument") \
    X(ERR_NOMEM,    -2, "Out of memory")    \
    X(ERR_IO,       -3, "I/O error")        \
    X(ERR_NETWORK,  -4, "Network error")    \
    X(ERR_TIMEOUT,  -5, "Timeout")          \
    X(ERR_OVERFLOW, -6, "Buffer overflow")

/* 生成枚举 */
typedef enum {
    #define X(name, val, msg) name = val,
    ERROR_TABLE(X)
    #undef X
    ERR_COUNT
} ErrorCode;

/* 生成错误消息表(按值索引) */
static const char *error_messages[] = {
    #define X(name, val, msg) [name - ERR_OVERFLOW] = msg,
    ERROR_TABLE(X)
    #undef X
};

/* 生成枚举名转字符串函数 */
const char *error_to_string(ErrorCode e) {
    switch (e) {
        #define X(name, val, msg) case name: return #name;
        ERROR_TABLE(X)
        #undef X
        default: return "UNKNOWN";
    }
}

/* 生成错误消息获取函数 */
const char *error_to_message(ErrorCode e) {
    if (e < ERR_NONE || e < ERR_OVERFLOW) {
        return error_messages[e - ERR_OVERFLOW];
    }
    return "Invalid error code";
}

/* 生成错误处理跳转表 */
typedef void (*ErrorHandler)(ErrorCode);
static void handle_default(ErrorCode e) {
    printf("[default] %s: %s\n", error_to_string(e), error_to_message(e));
}
static void handle_fatal(ErrorCode e) {
    fprintf(stderr, "[fatal] %s: %s\n", error_to_string(e), error_to_message(e));
    abort();
}

static const ErrorHandler handlers[] = {
    [ERR_NONE]     = NULL,
    [ERR_INVALID]  = handle_default,
    [ERR_NOMEM]    = handle_fatal,
    [ERR_IO]       = handle_default,
    [ERR_NETWORK]  = handle_default,
    [ERR_TIMEOUT]  = handle_default,
    [ERR_OVERFLOW] = handle_fatal,
};

void dispatch_error(ErrorCode e) {
    int idx = e - ERR_OVERFLOW;
    if (idx >= 0 && idx < (int)(sizeof(handlers)/sizeof(handlers[0])) && handlers[idx]) {
        handlers[idx](e);
    }
}

int main(void) {
    ErrorCode errs[] = {ERR_INVALID, ERR_NOMEM, ERR_IO, ERR_OVERFLOW};
    for (size_t i = 0; i < sizeof(errs)/sizeof(errs[0]); i++) {
        printf("error %d: name=%s, msg=%s\n",
               errs[i], error_to_string(errs[i]), error_to_message(errs[i]));
    }
    return 0;
}
```

### 示例 4:_Generic 类型泛型宏

```c
/* 文件: generic_macros.c
 * 演示 C11 _Generic 实现类型安全的泛型宏
 */
#include <stdio.h>
#include <math.h>
#include <string.h>

/* 类型安全的打印宏:根据参数类型选择对应函数 */
#define PRINT(x) _Generic((x),          \
    int:    print_int,                  \
    long:   print_long,                 \
    float:  print_float,                \
    double: print_double,               \
    char *: print_string,               \
    const char *: print_string,         \
    default: print_unknown              \
)(x)

static inline void print_int(int x)         { printf("int: %d\n", x); }
static inline void print_long(long x)       { printf("long: %ld\n", x); }
static inline void print_float(float x)     { printf("float: %f\n", x); }
static inline void print_double(double x)   { printf("double: %f\n", x); }
static inline void print_string(const char *x) { printf("string: %s\n", x); }
static inline void print_unknown(void)      { printf("unknown type\n"); }

/* 类型安全的 MAX 宏 */
static inline int max_int(int a, int b) { return a > b ? a : b; }
static inline long max_long(long a, long b) { return a > b ? a : b; }
static inline double max_double(double a, double b) { return a > b ? a : b; }

#define MAX(a, b) _Generic((a),  \
    int:    max_int,             \
    long:   max_long,            \
    double: max_double,          \
    default: max_long            \
)((a), (b))

/* 类型安全的容器长度宏 */
#define LEN(x) _Generic((x),                                \
    int *:        array_len,                                \
    long *:       array_len,                                \
    double *:     array_len,                                \
    char *:       strlen,                                   \
    const char *: strlen,                                   \
    default:      array_len                                 \
)(x)

static inline size_t array_len(int *arr) {
    /* 注意:此宏仅用于演示,实际无法获取数组长度 */
    (void)arr;
    return 0;
}

int main(void) {
    PRINT(42);
    PRINT(3.14);
    PRINT("hello");
    PRINT(100L);

    printf("MAX(3, 5) = %d\n", MAX(3, 5));
    printf("MAX(3.14, 2.72) = %f\n", MAX(3.14, 2.72));
    printf("MAX(100L, 200L) = %ld\n", MAX(100L, 200L));

    return 0;
}
```

### 示例 5:编译时断言与类型检查

```c
/* 文件: compile_time_checks.c
 * 演示编译时断言与类型检查宏
 */
#include <stdio.h>
#include <stddef.h>

/* C11 _Static_assert */
#define COMPILE_ASSERT(cond, msg) _Static_assert(cond, msg)

/* C11 之前的手工编译时断言 */
#define STATIC_ASSERT_LEGACY(cond, msg) \
    typedef char static_assert_##msg[(cond) ? 1 : -1]

/* 类型大小断言 */
COMPILE_ASSERT(sizeof(int) >= 4, "int must be at least 4 bytes");
COMPILE_ASSERT(sizeof(void *) >= 4, "pointer must be at least 4 bytes");
COMPILE_ASSERT(sizeof(size_t) == sizeof(void *), "size_t must match pointer size");

/* 数组大小宏:编译时确定 */
#define ARRAY_SIZE(a) (sizeof(a) / sizeof((a)[0]))

/* 编译时检查数组大小 */
#define ASSERT_ARRAY_SIZE(a, expected) \
    COMPILE_ASSERT(ARRAY_SIZE(a) == (expected), "array size mismatch")

/* 类型兼容性检查(GCC 扩展) */
#if defined(__GNUC__)
#define TYPE_COMPATIBLE(a, b) __builtin_types_compatible_p(typeof(a), typeof(b))
#define ASSERT_TYPE(a, b) \
    COMPILE_ASSERT(TYPE_COMPATIBLE(a, b), "type mismatch")
#endif

/* 容器偏移宏 */
#define OFFSET_OF(type, member) ((size_t)&(((type *)0)->member))

/* 容器入口宏:Linux kernel container_of 简化版 */
#define CONTAINER_OF(ptr, type, member) \
    ((type *)((char *)(ptr) - OFFSET_OF(type, member)))

typedef struct {
    int x;
    int y;
    double z;
} Point;

void demo_container_of(void) {
    Point p = {1, 2, 3.14};
    int *py = &p.y;

    /* 通过成员指针反推容器指针 */
    Point *pp = CONTAINER_OF(py, Point, y);
    printf("container: x=%d, y=%d, z=%f\n", pp->x, pp->y, pp->z);
}

int main(void) {
    int arr[10];
    ASSERT_ARRAY_SIZE(arr, 10);

    printf("OFFSET_OF(Point, x) = %zu\n", OFFSET_OF(Point, x));
    printf("OFFSET_OF(Point, y) = %zu\n", OFFSET_OF(Point, y));
    printf("OFFSET_OF(Point, z) = %zu\n", OFFSET_OF(Point, z));

    demo_container_of();
    return 0;
}
```

### 示例 6:日志宏与调试辅助

```c
/* 文件: log_macros.c
 * 演示生产级日志宏:支持级别过滤、文件位置、可变参数
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

/* 日志级别 */
typedef enum {
    LOG_LEVEL_DEBUG = 0,
    LOG_LEVEL_INFO  = 1,
    LOG_LEVEL_WARN  = 2,
    LOG_LEVEL_ERROR = 3,
    LOG_LEVEL_FATAL = 4
} LogLevel;

/* 全局日志级别(运行时可调) */
static LogLevel g_log_level = LOG_LEVEL_DEBUG;

/* 级别字符串 */
static const char *level_str[] = {"DEBUG", "INFO", "WARN", "ERROR", "FATAL"};

/* 日志宏:支持编译时关闭(NDEBUG)与运行时过滤 */
#ifdef NDEBUG
#define LOG(level, fmt, ...) ((void)0)
#else
#define LOG(level, fmt, ...) do {                                    \
    if ((level) >= g_log_level) {                                    \
        time_t _t = time(NULL);                                      \
        struct tm _tm;                                               \
        localtime_r(&_t, &_tm);                                      \
        char _ts[32];                                                \
        strftime(_ts, sizeof(_ts), "%Y-%m-%d %H:%M:%S", &_tm);       \
        fprintf(stderr, "[%s] [%s] %s:%d: " fmt "\n",               \
                _ts, level_str[(level)], __FILE__, __LINE__,        \
                ##__VA_ARGS__);                                      \
    }                                                                \
} while (0)
#endif

/* 便捷级别宏 */
#define LOG_DEBUG(fmt, ...) LOG(LOG_LEVEL_DEBUG, fmt, ##__VA_ARGS__)
#define LOG_INFO(fmt, ...)  LOG(LOG_LEVEL_INFO,  fmt, ##__VA_ARGS__)
#define LOG_WARN(fmt, ...)  LOG(LOG_LEVEL_WARN,  fmt, ##__VA_ARGS__)
#define LOG_ERROR(fmt, ...) LOG(LOG_LEVEL_ERROR, fmt, ##__VA_ARGS__)
#define LOG_FATAL(fmt, ...) do { LOG(LOG_LEVEL_FATAL, fmt, ##__VA_ARGS__); abort(); } while (0)

/* 断言宏:失败时打印调用栈信息 */
#ifdef NDEBUG
#define ASSERT(cond) ((void)0)
#else
#define ASSERT(cond) do {                                              \
    if (!(cond)) {                                                     \
        LOG_FATAL("assertion failed: %s", #cond);                      \
    }                                                                  \
} while (0)
#endif

/* 不可达代码标记 */
#if defined(__GNUC__) || defined(__clang__)
#define UNREACHABLE() __builtin_unreachable()
#elif defined(_MSC_VER)
#define UNREACHABLE() __assume(0)
#else
#define UNREACHABLE() assert(0)
#endif

/* 未使用参数标记 */
#define UNUSED(x) ((void)(x))

void set_log_level(LogLevel level) {
    g_log_level = level;
}

int divide(int a, int b) {
    ASSERT(b != 0);
    LOG_DEBUG("dividing %d by %d", a, b);
    return a / b;
}

int main(void) {
    set_log_level(LOG_LEVEL_DEBUG);

    LOG_INFO("program started");
    LOG_DEBUG("debug message with value %d", 42);
    LOG_WARN("warning: %s", "low memory");

    int r = divide(10, 2);
    LOG_INFO("result: %d", r);

    UNUSED(r);
    return 0;
}
```

### 示例 7:泛型容器宏(类型安全的动态数组)

```c
/* 文件: generic_vec.c
 * 演示使用宏生成类型安全的动态数组容器
 * 类似 C++ std::vector<int>、std::vector<double> 等
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* 类型安全的动态数组生成宏
 * 参数:type 元素类型
 * 生成:Vec_<type> 类型、vec_<type>_create/push/get/free 函数
 */
#define DEFINE_VEC(type)                                          \
typedef struct {                                                  \
    type *data;                                                   \
    size_t size;                                                  \
    size_t capacity;                                              \
} Vec_##type;                                                     \
                                                                  \
static inline Vec_##type vec_##type##_create(void) {              \
    Vec_##type v = {NULL, 0, 0};                                  \
    return v;                                                     \
}                                                                 \
                                                                  \
static inline int vec_##type##_push(Vec_##type *v, type val) {    \
    if (v->size >= v->capacity) {                                 \
        size_t new_cap = v->capacity ? v->capacity * 2 : 4;       \
        type *new_data = realloc(v->data, new_cap * sizeof(type));\
        if (!new_data) return -1;                                 \
        v->data = new_data;                                       \
        v->capacity = new_cap;                                    \
    }                                                             \
    v->data[v->size++] = val;                                     \
    return 0;                                                     \
}                                                                 \
                                                                  \
static inline type vec_##type##_get(const Vec_##type *v, size_t i) {\
    return v->data[i];                                            \
}                                                                 \
                                                                  \
static inline void vec_##type##_set(Vec_##type *v, size_t i, type val) {\
    v->data[i] = val;                                             \
}                                                                 \
                                                                  \
static inline void vec_##type##_free(Vec_##type *v) {             \
    free(v->data);                                                \
    v->data = NULL;                                               \
    v->size = v->capacity = 0;                                    \
}                                                                 \
                                                                  \
static inline size_t vec_##type##_size(const Vec_##type *v) {     \
    return v->size;                                               \
}

/* 为 int、double、const char * 类型生成 Vec */
DEFINE_VEC(int)
DEFINE_VEC(double)
DEFINE_VEC(const char *)

int main(void) {
    /* 整数向量 */
    Vec_int nums = vec_int_create();
    for (int i = 0; i < 10; i++) {
        vec_int_push(&nums, i * i);
    }
    printf("nums size: %zu\n", vec_int_size(&nums));
    for (size_t i = 0; i < vec_int_size(&nums); i++) {
        printf("nums[%zu] = %d\n", i, vec_int_get(&nums, i));
    }
    vec_int_free(&nums);

    /* 字符串向量 */
    Vec_const_char_ptr names = vec_const_char_ptr_create();
    vec_const_char_ptr_push(&names, "Alice");
    vec_const_char_ptr_push(&names, "Bob");
    vec_const_char_ptr_push(&names, "Charlie");
    for (size_t i = 0; i < vec_const_char_ptr_size(&names); i++) {
        printf("name[%zu] = %s\n", i, vec_const_char_ptr_get(&names, i));
    }
    vec_const_char_ptr_free(&names);

    return 0;
}
```

### 示例 8:位操作宏与编译时计算

```c
/* 文件: bit_macros.c
 * 演示位操作宏、编译时计算、位域掩码生成
 */
#include <stdio.h>
#include <stdint.h>

/* 基本位操作宏 */
#define BIT(n) (1U << (n))
#define SET_BIT(x, n)   ((x) | BIT(n))
#define CLR_BIT(x, n)   ((x) & ~BIT(n))
#define TOG_BIT(x, n)   ((x) ^ BIT(n))
#define IS_BIT_SET(x, n) (((x) & BIT(n)) != 0)

/* 位域掩码:从 bit a 到 bit b */
#define BIT_MASK(a, b) (((~0U) << (a)) & ((~0U) >> (31 - (b))))

/* 位计数(编译时,使用 __builtin_popcount) */
#define POPCOUNT(x) __builtin_popcount(x)
#define POPCOUNTL(x) __builtin_popcountl(x)
#define POPCOUNTLL(x) __builtin_popcountll(x)

/* 前导零计数 */
#define CLZ(x) __builtin_clz(x)
#define CTZ(x) __builtin_ctz(x)

/* 对齐宏 */
#define ALIGN_UP(x, a)   (((x) + ((a) - 1)) & ~((a) - 1))
#define ALIGN_DOWN(x, a) ((x) & ~((a) - 1))
#define IS_ALIGNED(x, a) (((x) & ((a) - 1)) == 0)

/* 数组大小 */
#define ARRAY_SIZE(a) (sizeof(a) / sizeof((a)[0]))

/* 编译时幂运算(仅整数次幂) */
#define POW2(n) (1U << (n))
#define POW4(n) (1U << (2 * (n)))

/* 编译时 log2 */
#define LOG2_8(n) (((n) >= 128) ? 7 : \
                   ((n) >= 64)  ? 6 : \
                   ((n) >= 32)  ? 5 : \
                   ((n) >= 16)  ? 4 : \
                   ((n) >= 8)   ? 3 : \
                   ((n) >= 4)   ? 2 : \
                   ((n) >= 2)   ? 1 : 0)

/* 位域提取 */
#define EXTRACT_BITS(x, start, len) (((x) >> (start)) & ((1U << (len)) - 1))

int main(void) {
    uint32_t val = 0xDEADBEEF;

    printf("val = 0x%08X\n", val);
    printf("BIT(5) = 0x%X\n", BIT(5));
    printf("SET_BIT(0, 3) = 0x%X\n", SET_BIT(0, 3));
    printf("IS_BIT_SET(0b1010, 1) = %d\n", IS_BIT_SET(0b1010, 1));
    printf("IS_BIT_SET(0b1010, 3) = %d\n", IS_BIT_SET(0b1010, 3));

    printf("BIT_MASK(4, 7) = 0x%X\n", BIT_MASK(4, 7));

    printf("POPCOUNT(0xFF) = %d\n", POPCOUNT(0xFF));
    printf("POPCOUNT(0xDEADBEEF) = %d\n", POPCOUNT(0xDEADBEEF));
    printf("CLZ(1) = %d\n", CLZ(1));
    printf("CTZ(8) = %d\n", CTZ(8));

    printf("ALIGN_UP(100, 8) = %d\n", ALIGN_UP(100, 8));
    printf("ALIGN_DOWN(100, 8) = %d\n", ALIGN_DOWN(100, 8));
    printf("IS_ALIGNED(96, 8) = %d\n", IS_ALIGNED(96, 8));

    printf("EXTRACT_BITS(0xDEADBEEF, 4, 8) = 0x%X\n",
           EXTRACT_BITS(0xDEADBEEF, 4, 8));

    return 0;
}
```

## 对比分析

### 1. 宏 vs 内联函数

| 维度 | 函数式宏 | static inline 函数 |
|------|---------|-------------------|
| 类型检查 | 无(纯文本替换) | 有(编译器严格检查) |
| 参数求值次数 | 每次使用都求值(可能多次) | 只求值一次 |
| 副作用安全 | 不安全(UB 风险) | 安全 |
| 作用域 | 全局(预处理阶段) | 遵循 C 作用域规则 |
| 调试 | 困难(预处理后消失,无符号) | 容易(有符号信息,可单步) |
| 取地址 | 不可以 | 可以 |
| 递归 | 不支持 | 支持(但编译器通常不内联递归) |
| 代码膨胀 | 可能严重(每次展开) | 编译器控制(启发式决策) |
| 元编程 | 强(字符串化、标记粘贴、X-Macro) | 弱(仅普通函数) |
| 类型泛型 | 天然支持(宏无类型) | 需 `_Generic`(C11) |
| 编译错误信息 | 难懂(展开后报错) | 清晰(指向源码) |
| IDE 支持 | 弱(无法跳转、补全) | 强(完整符号信息) |

### 2. C99 inline 三种形式对比

| 形式 | 头文件定义 | 源文件定义 | 链接性 | 内联副本 | 典型用法 |
|------|----------|----------|--------|---------|---------|
| `static inline` | 是 | 否 | 内部链接 | 每个翻译单元一份 | 最常用,自包含 |
| `inline`(C99) | 是(内联定义) | 是(`extern inline`) | 外部链接 | 优先内联,后备外部 | 跨模块内联 |
| `extern inline` | 否 | 是 | 外部链接 | 不提供 | 提供外部后备 |
| `inline`(C++ 语义) | 是 | 否 | 外部链接(合并) | 合并 | C++ 项目 |

### 3. GCC/Clang/MSVC 内联行为对比

| 编译器 | `inline` 关键字 | 强制内联 | 跨模块内联 | LTO |
|--------|----------------|---------|----------|-----|
| GCC | C99 语义 | `__attribute__((always_inline))` | 需 LTO | `-flto` |
| Clang | C99 语义 | `__attribute__((always_inline))` | 需 LTO | `-flto` |
| MSVC | C++ 语义(合并) | `__forceinline` | 需 LTCG | `/GL` + `/LTCG` |

注意:MSVC 的 `inline` 实际遵循 C++ 语义(允许多重定义,链接器合并),与 C99 不同。跨平台代码应优先使用 `static inline` 避免歧义。

### 4. 宏 vs C++ 模板 vs Rust 泛型

| 机制 | 语言 | 类型安全 | 元编程能力 | 编译时检查 | 调试性 |
|------|------|---------|----------|----------|--------|
| 函数式宏 | C | 无 | 强(字符串化/粘贴) | 弱(预处理后) | 差 |
| `_Generic` 宏 | C11 | 部分(类型分发) | 中(受限) | 中 | 中 |
| 函数模板 | C++ | 强 | 强(图灵完备) | 强 | 好 |
| 概念(C++20) | C++ | 强 | 强 | 强(约束检查) | 好 |
| 泛型函数 | Rust | 强 | 强(trait bound) | 强 | 好 |
| 泛型 | Java/Kotlin | 强(类型擦除) | 弱 | 强 | 好 |

## 常见陷阱与反模式

### 1. 宏参数未加括号

```c
/* 反模式 */
#define SQUARE(x) x * x
int r = SQUARE(2 + 3);  /* 展开 2 + 3 * 2 + 3 = 11,而非 25 */

/* 正确 */
#define SQUARE(x) ((x) * (x))
```

规则:宏定义中每个参数出现处都加括号,整个表达式也加括号。

### 2. 宏多语句未用 do-while(0)

```c
/* 反模式 */
#define INIT(a, b) a = 0; b = 0;
if (cond)
    INIT(x, y);  /* 仅 a = 0 在 if 内 */
else
    other();  /* else 悬挂 */

/* 正确 */
#define INIT(a, b) do { (a) = 0; (b) = 0; } while (0)
```

### 3. 宏末尾加分号

```c
/* 反模式 */
#define MAX(a, b) ((a) > (b) ? (a) : (b));
if (cond)
    MAX(x, y);  /* 展开后多一个分号 */
else
    other();  /* else 悬挂 */

/* 正确:不加分号,调用时再加 */
#define MAX(a, b) ((a) > (b) ? (a) : (b))
```

### 4. 宏参数副作用

```c
/* 反模式 */
#define ABS(x) ((x) >= 0 ? (x) : -(x))
int i = -5;
int r = ABS(i++);  /* UB:i 被求值两次 */

/* 正确:使用内联函数 */
static inline int abs_int(int x) { return x >= 0 ? x : -x; }
```

### 5. 宏污染作用域

```c
/* 反模式 */
#define SIZE 100

void func(void) {
    int SIZE = 10;  /* 编译错误:展开为 int 100 = 10 */
}

/* 正确:使用枚举或 const 变量 */
enum { BUFFER_SIZE = 100 };
static const int MAX_CONN = 100;
```

### 6. 宏名与函数冲突

```c
/* 反模式 */
#define min(a, b) ((a) < (b) ? (a) : (b))

/* 某些标准库头文件已定义 min(如 Windows.h 的 min/max) */
#include <windows.h>  /* 冲突 */

/* 正确:使用命名约定 */
#define MY_MIN(a, b) ((a) < (b) ? (a) : (b))
```

### 7. 多行宏未用续行符

```c
/* 反模式:换行未加反斜杠 */
#define BAD(a, b) int tmp = a;
    a = b;
    b = tmp;

/* 正确 */
#define SWAP(a, b, type) do { \
    type _tmp = (a);          \
    (a) = (b);                \
    (b) = _tmp;               \
} while (0)
```

### 8. 滥用 always_inline

```c
/* 反模式:强制内联大函数,导致代码膨胀 */
__attribute__((always_inline))
static inline void huge_function(void) {
    /* 数百行代码 */
}

/* 正确:让编译器决策,仅在性能关键热点使用 always_inline */
static inline void small_hot_function(int x) {
    return x * 2;
}
```

### 9. 宏定义中的注释

```c
/* 反模式:行注释在多行宏中截断 */
#define BAD(a, b) do { \
    int t = a;  // 保存 a   <- 此处注释截断宏
    a = b; \
    b = t; \
} while (0)

/* 正确:使用块注释 */
#define GOOD(a, b) do {        \
    int t = (a);  /* 保存 a */ \
    (a) = (b);                 \
    (b) = t;                   \
} while (0)
```

### 10. 宏展开后语法错误难以定位

```c
/* 复杂宏展开后,编译错误指向展开后的代码,难以定位源 */
#define COMPLEX_MACRO(a, b, c) \
    ((a) > 0 ? process_##b((c)) : default_##b())

/* 调试技巧:使用 gcc -E 查看预处理结果 */
/* gcc -E file.c -o file.i 查看展开后的代码 */
```

## 工程实践

### 1. 头文件设计原则

```c
/* 头文件 utils.h */
#ifndef UTILS_H
#define UTILS_H

#include <stddef.h>

/* 简单数学函数:static inline */
static inline int max_int(int a, int b) { return a > b ? a : b; }
static inline int min_int(int a, int b) { return a < b ? a : b; }
static inline int clamp_int(int x, int lo, int hi) {
    return x < lo ? lo : (x > hi ? hi : x);
}

/* 类型泛型:用 _Generic 包装 */
#define MAX(a, b) _Generic((a), \
    int: max_int,               \
    long: max_long,             \
    default: max_long           \
)((a), (b))

/* 常量:用 enum 或 static const */
enum { MAX_BUFFER_SIZE = 4096 };
static const double PI = 3.141592653589793;

/* 复杂逻辑:用宏 + static inline 组合 */
#define ARRAY_SIZE(a) (sizeof(a) / sizeof((a)[0]))

#endif /* UTILS_H */
```

### 2. 编译选项与诊断

```bash
# 启用内联相关警告
gcc -Wall -Wextra -Winline -O2 -c file.c

# 查看内联决策(输出哪些函数被内联)
gcc -O3 -fdump-ipa-inline -c file.c
# 查看 file.c.001i.ipa-inline

# 限制内联(代码膨胀敏感场景)
gcc -O2 -finline-limit=100 --param max-inline-insns-auto=100

# 启用 LTO(跨模块内联)
gcc -O2 -flto -c file.c
gcc -O2 -flto -o app *.o

# PGO(配置文件引导优化)
gcc -O2 -fprofile-generate -o app_gen *.c
./app_gen  # 运行生成 profile
gcc -O2 -fprofile-use -o app *.c

# 强制内联检查
gcc -O2 -Winline -c file.c  # 警告 always_inline 未成功内联
```

### 3. 调试技巧

```bash
# 查看预处理结果(宏展开后)
gcc -E file.c -o file.i

# 保留注释与行号
gcc -E -C -P file.c -o file.i

# 仅展开特定宏
gcc -E -DDEBUG file.c | grep "MACRO_NAME"

# GDB 调试内联函数
gcc -g -O2 -c file.c  # -g 保留调试信息
gdb ./app
(gdb) info inline     # 查看内联帧
(gdb) set print inline-events on

# 性能分析(确认内联是否生效)
perf record ./app
perf report
# 关注 hot function 是否为内联函数
```

### 4. 性能测量

```c
/* 文件: perf_measure.c
 * 测量内联前后的性能差异
 */
#include <stdio.h>
#include <time.h>

#define ITERATIONS 1000000000

/* 不内联版本 */
__attribute__((noinline))
int add_noinline(int a, int b) {
    return a + b;
}

/* 内联版本 */
static inline int add_inline(int a, int b) {
    return a + b;
}

int main(void) {
    volatile int x = 1, y = 2;
    volatile int result;
    struct timespec start, end;

    /* 测量 noinline */
    clock_gettime(CLOCK_MONOTONIC, &start);
    for (long i = 0; i < ITERATIONS; i++) {
        result = add_noinline(x, y);
    }
    clock_gettime(CLOCK_MONOTONIC, &end);
    double t_noinline = (end.tv_sec - start.tv_sec) +
                        (end.tv_nsec - start.tv_nsec) / 1e9;
    printf("noinline: %.3f sec, result=%d\n", t_noinline, result);

    /* 测量 inline */
    clock_gettime(CLOCK_MONOTONIC, &start);
    for (long i = 0; i < ITERATIONS; i++) {
        result = add_inline(x, y);
    }
    clock_gettime(CLOCK_MONOTONIC, &end);
    double t_inline = (end.tv_sec - start.tv_sec) +
                      (end.tv_nsec - start.tv_nsec) / 1e9;
    printf("inline:   %.3f sec, result=%d\n", t_inline, result);

    printf("speedup: %.2fx\n", t_noinline / t_inline);
    return 0;
}
```

### 5. 跨平台兼容性

```c
/* 文件: portable_inline.h
 * 跨平台内联函数兼容性封装
 */
#ifndef PORTABLE_INLINE_H
#define PORTABLE_INLINE_H

/* 1. 选择最佳 inline 形式 */
#if defined(_MSC_VER)
    /* MSVC:使用 __inline 避免与 C++ inline 语义冲突 */
    #define INLINE __inline
    #define FORCE_INLINE __forceinline
    #define NEVER_INLINE __declspec(noinline)
#elif defined(__GNUC__) || defined(__clang__)
    /* GCC/Clang:使用 static inline */
    #define INLINE static inline
    #define FORCE_INLINE __attribute__((always_inline)) static inline
    #define NEVER_INLINE __attribute__((noinline))
#else
    /* 其他平台:回退到 static inline */
    #define INLINE static inline
    #define FORCE_INLINE static inline
    #define NEVER_INLINE
#endif

/* 2. 语句表达式兼容性 */
#if defined(__GNUC__) || defined(__clang__)
    #define HAVE_STMT_EXPR 1
    #define STMT_EXPR_BEGIN ({
    #define STMT_EXPR_END })
#else
    #define HAVE_STMT_EXPR 0
    /* 非 GCC 平台:回退到普通表达式,有副作用风险 */
#endif

/* 3. typeof 兼容性 */
#if defined(__GNUC__) || defined(__clang__)
    #define TYPEOF(x) __typeof__(x)
#else
    #define TYPEOF(x) int  /* 回退:可能损失类型信息 */
#endif

/* 4. 跨平台 MAX/MIN */
#if HAVE_STMT_EXPR
#define MAX(a, b) ({                \
    TYPEOF(a) _a = (a);             \
    TYPEOF(b) _b = (b);             \
    _a > _b ? _a : _b;              \
})
#else
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#endif

/* 5. 编译时断言兼容性 */
#if defined(__STDC_VERSION__) && __STDC_VERSION__ >= 201112L
    #define COMPILE_ASSERT(cond, msg) _Static_assert(cond, msg)
#else
    #define COMPILE_ASSERT(cond, msg) \
        typedef char static_assert_##msg[(cond) ? 1 : -1]
#endif

#endif /* PORTABLE_INLINE_H */
```

## 案例研究

### 1. Linux kernel container_of 宏

Linux kernel 中最经典的宏之一,用于从结构体成员指针反推结构体指针:

```c
/* linux/include/linux/kernel.h (简化版) */
#define offsetof(TYPE, MEMBER) ((size_t)&((TYPE *)0)->MEMBER)

#define container_of(ptr, type, member) ({          \
    void *__mptr = (void *)(ptr);                   \
    ((type *)(__mptr - offsetof(type, member)));    \
})

/* 使用示例:链表节点反推容器 */
struct list_head {
    struct list_head *next, *prev;
};

struct task_struct {
    int pid;
    char name[16];
    struct list_head tasks;  /* 嵌入的链表节点 */
};

/* 通过 tasks 成员获取 task_struct 指针 */
struct list_head *node = ...;
struct task_struct *task = container_of(node, struct task_struct, tasks);
```

分析:
- `offsetof(TYPE, MEMBER)` 利用零指针技巧:`((TYPE *)0)->MEMBER` 取地址,编译时计算偏移。
- `container_of` 使用 GCC 语句表达式 `({ ... })`,确保 `ptr` 只求值一次,并返回计算结果。
- 类型安全:GCC 在 `typeof` 推导下检查 `ptr` 类型与 `member` 类型匹配。

### 2. Redis sds(Simple Dynamic String)

Redis 使用宏实现类型安全的动态字符串:

```c
/* redis/src/sds.h (简化版) */
typedef char *sds;

struct sdshdr {
    size_t len;
    size_t free;
    char buf[];
};

/* 通过 sds(即 char*)指针反推 sdshdr */
#define SDS_HDR(s) ((struct sdshdr *)((s) - sizeof(struct sdshdr)))

/* 获取长度 */
#define sdslen(s) (SDS_HDR(s)->len)
#define sdsavail(s) (SDS_HDR(s)->free)

/* 使用示例 */
sds mystr = sdsnew("hello");
printf("len: %zu\n", sdslen(mystr));  /* 5 */
printf("avail: %zu\n", sdsavail(mystr));  /* 取决于分配策略 */
```

分析:Redis 通过 `sds` 类型(实际是 `char*`)与宏 `SDS_HDR` 配合,实现"指针指向 `buf`,通过负偏移访问头部"的内存布局。这种设计避免了每次访问 `len`/`free` 的函数调用开销,同时保持接口简洁。

### 3. SQLite 内联策略

SQLite 大量使用 `static inline` 优化热点路径:

```c
/* sqlite/src/sqliteInt.h (示例) */
static inline int sqlite3VdbeSerialTypeLen(u8 serial_type) {
    if (serial_type >= 12) {
        return (serial_type - 12) / 2;
    }
    switch (serial_type) {
        case 0: return 0;  /* NULL */
        case 1: return 1;  /* 8-bit int */
        case 2: return 2;  /* 16-bit int */
        case 3: return 3;  /* 24-bit int */
        case 4: return 4;  /* 32-bit int */
        case 5: return 6;  /* 48-bit int */
        case 6: return 8;  /* 64-bit int */
        case 7: return 8;  /* float */
        case 8: return 0;  /* integer 0 */
        case 9: return 0;  /* integer 1 */
        default: return 0;
    }
}
```

分析:SQLite 将记录解码的热点函数声明为 `static inline`,在 `-O3` 下编译器将其内联到 `sqlite3VdbeRecordCompare` 等核心函数中,消除函数调用开销。SQLite 团队通过 profile 指导决定哪些函数标记 `static inline`。

### 4. glibc 优化宏

glibc 使用宏实现位计数、对齐等底层操作:

```c
/* glibc/string/bits/string2.h (示例) */
#define __STRING2_SMALL_GET16(src, idx) \
    (((const unsigned char *)(src))[idx] | \
     ((unsigned int)(((const unsigned char *)(src))[(idx) + 1]) << 8))

#define __STRING2_SMALL_SET16(dst, idx, val) \
    ((void)((((unsigned char *)(dst))[idx] = (unsigned char)(val)), \
            (((unsigned char *)(dst))[(idx) + 1] = (unsigned char)((val) >> 8))))

/* strcmp 优化:使用宏内联字节比较 */
#define strcmp(s1, s2) \
    (__extension__ (__builtin_constant_p(s1) && __builtin_constant_p(s2) \
                    ? __strcmp_const(s1, s2) \
                    : __strcmp_var(s1, s2)))
```

分析:glibc 通过 `__builtin_constant_p`(GCC 内建)检测参数是否为编译时常量,如果是则使用编译时优化的版本,否则调用运行时函数。这种"编译时特化"是宏独有的能力,内联函数无法实现。

### 5. Linux kernel min/max 宏

```c
/* linux/include/linux/minmax.h (简化版) */
#define min(x, y) ({                \
    typeof(x) _min1 = (x);          \
    typeof(y) _min2 = (y);          \
    (void) (&_min1 == &_min2);      \  /* 类型检查 */
    _min1 < _min2 ? _min1 : _min2; })

#define max(x, y) ({                \
    typeof(x) _max1 = (x);          \
    typeof(y) _max2 = (y);          \
    (void) (&_max1 == &_max2);      \  /* 类型检查 */
    _max1 > _max2 ? _max1 : _max2; })

#define min3(x, y, z) min((typeof(x))min(x, y), z)
#define max3(x, y, z) max((typeof(x))max(x, y), z)
```

分析:
- 使用语句表达式 `({ ... })` 确保参数单次求值。
- `(void) (&_min1 == &_min2)` 是巧妙的类型检查:若 `x` 与 `y` 类型不同,指针类型不同,比较会触发编译警告。
- `typeof` 推导保留原类型,避免整数提升损失精度。

## 习题

### 习题 1:宏展开分析

给定以下宏定义:

```c
#define FOO(x) bar_##x
#define BAR(x) #x
#define BAZ(x) FOO(x)
```

请写出以下代码展开后的结果:

```c
FOO(hello);
BAR(hello world);
BAZ(hello);
```

### 习题 2:安全的 MAX 宏

编写一个类型安全、参数单次求值的 `MAX(a, b)` 宏,要求:
- 使用 GCC 语句表达式确保参数单次求值
- 使用 `typeof` 推导类型,避免整数提升
- 添加类型检查(若 `a` 与 `b` 类型不匹配,触发编译警告)

### 习题 3:容器宏实现

实现一个 `CONTAINER_OF(ptr, type, member)` 宏,从成员指针反推容器指针。要求:
- 使用 `offsetof` 计算偏移
- 使用 `typeof` 保留类型信息
- 添加类型检查(确保 `ptr` 类型与 `member` 类型匹配)

### 习题 4:X-Macro 应用

使用 X-Macro 模式定义一个 HTTP 状态码表,生成:
- 枚举 `HttpStatusCode`
- 状态码转字符串函数 `http_status_to_string`
- 状态码转消息函数 `http_status_to_message`

包含至少 10 个常见状态码(200、301、400、404、500 等)。

### 习题 5:_Generic 泛型

使用 C11 `_Generic` 实现一个类型安全的 `PRINT(x)` 宏,支持 `int`、`long`、`float`、`double`、`char*`、`const char*` 类型,对每种类型调用对应的打印函数。

### 习题 6:编译时断言

使用 `_Static_assert`(或手工编译时断言宏)验证以下条件:
- `sizeof(int) >= 4`
- `sizeof(void*) == sizeof(size_t)`
- `sizeof(long) >= 4`

并解释手工编译时断言 `typedef char static_assert_X[(cond) ? 1 : -1]` 的工作原理。

### 习题 7:内联决策分析

给定以下代码:

```c
static inline int small(int x) { return x * 2; }

__attribute__((always_inline))
static inline int forced(int x) { return x * 3; }

__attribute__((noinline))
static inline int never(int x) { return x * 4; }

int (*fp)(int) = small;  /* 取地址 */
```

分析:
- `small`、`forced`、`never` 在 `-O2` 下分别是否会被内联?
- 取 `small` 的地址对其内联决策有何影响?
- `forced` 是否一定被内联?什么情况下会失败?

### 习题 8:日志宏设计

设计一个生产级日志宏 `LOG(level, fmt, ...)`,要求:
- 支持编译时关闭(`NDEBUG`)
- 支持运行时级别过滤
- 输出时间戳、级别、文件、行号
- 支持 `##__VA_ARGS__` 处理空可变参数

## 参考文献

1. International Organization for Standardization. *ISO/IEC 9899:2018 Information technology — Programming languages — C (C17)*. ISO, 2018. https://www.iso.org/standard/74528.html

2. Kernighan, B. W., and Ritchie, D. M. *The C Programming Language*, 2nd ed. Prentice Hall, 1988. ISBN: 978-0131103627

3. Free Software Foundation. *GCC Online Documentation: Inline Functions*. https://gcc.gnu.org/onlinedocs/gcc/Inline.html

4. LLVM Project. *Clang Language Extensions: GNU Inline Functions*. https://clang.llvm.org/docs/LanguageExtensions.html

5. Microsoft. *MSVC Inline Functions Documentation*. https://learn.microsoft.com/en-us/cpp/cpp/inline-functions-cpp

6. Torvalds, L., et al. *Linux Kernel Source: include/linux/kernel.h (container_of)*. https://github.com/torvalds/linux/blob/master/include/linux/container_of.h

7. Sanfilippo, S. *Redis Source: src/sds.h*. https://github.com/redis/redis/blob/unstable/src/sds.h

8. Hipp, D. R. *SQLite Source: src/sqliteInt.h*. https://www.sqlite.org/src/doc/trunk/src/sqliteInt.h

9. Richards, M. *BCPL Reference Manual*. University of Cambridge, 1967.

10. Spinellis, D. "Modern Debugging of C Code with GDB and LLDB." *Communications of the ACM*, vol. 64, no. 7, 2021, pp. 48-57. DOI: 10.1145/3468805. https://doi.org/10.1145/3468805

11. Hennessy, J. L., and Patterson, D. A. *Computer Architecture: A Quantitative Approach*, 6th ed. Morgan Kaufmann, 2017. ISBN: 978-0128119051

12. Seacord, R. C. *Effective C: An Introduction to Professional C Programming*. No Starch Press, 2020. ISBN: 978-1718501048

## 延伸阅读

- **C11/C17 标准 6.10 预处理指令、6.7.4 函数说明符**:理解宏与 `inline` 的标准语义。
- **GCC Manual 第 6 章"Extensions to the C Language Family"**:语句表达式、`typeof`、`__builtin_constant_p` 等扩展。
- **Linux Kernel 文档"Documentation/process/coding-style.rst"**:内核宏与内联使用规范。
- **glibc 源码 `<bits/string2.h>`、`<bits/wordsize.h>`**:生产级宏优化实例。
- **SQLite 源码 `src/sqliteInt.h`、`src/vdbe.c`**:大规模 C 项目的内联策略。
- **Cerberus 项目(C semantics verification)**:形式化 C 预处理与内联语义。
- **C23 草案(N2912)`#embed`、`#elifdef`、`__VA_OPT__`**:预处理器新特性。
- **Cppreference "C language: Preprocessor"、"Inline function"**:在线参考。
- **"The Art of Macros" by Spencer Collyer(BSD Magazine)**:宏设计最佳实践。
- **"Modern C" by Jens Gustedt**:全面覆盖 C11/C17 的高级特性。
