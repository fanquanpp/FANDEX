---
order: 54
title: 函数指针与回调
module: c
category: C
difficulty: intermediate
description: 函数指针与回调函数模式
author: fanquanpp
updated: '2026-07-21'
related:
  - c/多文件编译
  - c/动态内存管理
  - c/可变参数函数
  - c/信号处理
prerequisites:
  - c/概述
---

## 概述

函数指针(function pointer)是 C 语言中存储函数入口地址的指针变量,是实现运行时多态、回调函数(callback)、策略模式(strategy pattern)、事件驱动编程(event-driven programming)、跳转表(jump table)与插件架构(plugin architecture)的核心机制。回调函数是一种通过函数指针实现的设计模式,允许调用者将自定义行为注入被调用者,使被调用者在特定时机"回调"调用者的代码。

函数指针的概念可追溯至 1960 年代 Lisp 的 `apply` 与 `funcall`、ALGOL 60 的过程参数。1972 年 C 语言诞生时,Dennis Ritchie 将函数指针作为一等公民引入,使 C 具备了高阶函数(higher-order function)的雏形。1978 年 K&R C 出版后,C 标准库的 `qsort`、`bsearch` 函数正式采用函数指针参数,确立了回调模式的工程地位。此后,从 Unix VFS 的 `file_operations`、X Window System 的事件循环,到 libuv、Nginx、Redis、Node.js 的异步 I/O 框架,函数指针与回调始终是系统级 C 编程的基石。

本文系统化阐述函数指针的声明、初始化、调用语义、调用约定(calling convention)、函数指针数组、返回函数指针的函数、带上下文的回调、闭包模拟、事件系统、策略模式、跳转表、插件架构,并分析 `qsort`、libuv、Nginx、Linux VFS 等真实案例。

## 学习目标

### 识记层(Remember)

- 列举函数指针的声明语法,以及与返回指针的函数的语法区别。
- 复述 C 标准库中采用函数指针参数的函数(`qsort`、`bsearch`、`atexit`、`signal`、`scandir`、`qsort_r`)。
- 说明 `cdecl`、`stdcall`、`fastcall`、`thiscall`、`vectorcall` 等调用约定的差异。
- 列举函数指针与数据指针在大小、转换、别名上的标准约束。

### 理解层(Understand)

- 解释函数名到函数指针的隐式转换(decay)及其形式化语义。
- 阐述间接调用(indirect call)相对于直接调用(direct call)的额外性能开销,以及分支预测器对间接跳转的影响。
- 推导带上下文回调(`void *user_data`)模式如何模拟闭包(closure)。
- 说明函数指针类型不匹配导致的未定义行为(UB)及其形式化条件。

### 应用层(Apply)

- 使用 `typedef` 简化复杂的函数指针声明,提升代码可读性。
- 实现基于函数指针数组的事件系统、策略模式、跳转表。
- 使用 `qsort_r`(POSIX)或 `qsort_s`(C11)的带上下文回调避免全局变量。
- 实现返回函数指针的工厂函数,用于运行时策略选择。

### 分析层(Analyze)

- 对比 C 函数指针回调与 C++ 虚函数、Java 接口、Rust trait object、Go interface 在运行时多态上的性能与工程差异。
- 分析 libuv、Nginx、Redis 等异步框架的回调设计模式差异。
- 推导函数指针表(jump table)与 `switch-case` 在指令缓存、分支预测上的相对性能。

### 评价层(Evaluate)

- 评估"回调地狱(callback hell)"在 C 异步编程中的表现,以及 promise/future、async/await 模式的相对优势。
- 论证函数指针在类型安全上的缺陷,以及 C11 `_Generic`、C++ `std::function`、Rust `Fn` trait 的改进方向。
- 评判 Linux VFS `file_operations`、`vm_operations_struct` 等大型函数指针表在可维护性与性能间的权衡。

### 创造层(Create)

- 设计一套面向大型 C 项目的回调注册与分发框架,支持优先级、错误传播、取消机制。
- 构建基于函数指针的轻量级协程调度器,实现协作式多任务。
- 实现一个支持运行时注册、卸载、版本协商的插件系统,通过函数指针表暴露 API。

## 历史动机与背景

### 1. 函数指针的起源:ALGOL 60 与 Lisp

函数指针的概念最早可追溯至 1960 年 ALGOL 60 的过程参数(procedure parameter),允许将一个过程作为参数传递给另一个过程。1960 年代 Lisp 引入 `apply` 与 `funcall`,使函数成为一等公民(first-class citizen)。这些早期语言确立了"函数作为参数"的高阶函数思想,直接影响了后续 C 语言的设计。

### 2. C 语言函数指针的诞生(1972)

Dennis Ritchie 在 1972 年设计 C 语言时,将函数指针作为指针类型的一种纳入语言。C 函数指针保留了 ALGOL 60 的过程参数语义,但增加了显式的指针操作能力(取地址、解引用、指针算术)。C 函数指针的设计目标是为 Unix 内核提供运行时多态机制:例如 VFS 层通过函数指针表(`file_operations`)统一不同文件系统的接口,设备驱动通过函数指针注册到内核。

### 3. qsort 与回调模式的标准化(1978-1989)

1978 年 K&R C 出版时,标准库已包含 `qsort` 函数,采用函数指针作为比较器参数:

```c
void qsort(void *base, size_t nmemb, size_t size,
           int (*compar)(const void *, const void *));
```

这一设计确立了"库函数 + 用户回调"的工程模式,被后续 `bsearch`、`scandir`、`atexit`、`signal` 等标准函数沿用。1989 年 ANSI C(C89)正式标准化函数指针语法与语义,包括函数名到函数指针的隐式转换、函数指针比较、函数指针数组等。

### 4. 异步 I/O 与事件驱动(1980s-2000s)

1984 年 X Window System 采用事件循环 + 回调的模式处理 GUI 事件,成为现代事件驱动编程的雏形。1990 年代 libevent、libev 等 C 异步 I/O 库将回调模式推广到网络编程。2009 年 Ryan Dahl 发布 Node.js,底层 libuv 大量使用函数指针实现异步回调,使 JavaScript 的回调模式成为主流。Redis、Nginx、memcached 等高性能 C 服务也通过函数指针实现命令分发、模块扩展、事件处理。

### 5. C++ 虚函数与函数指针的对比

C++ 在 1985 年引入虚函数(virtual function),通过虚函数表(vtable)实现运行时多态。虚函数本质上编译器自动生成的函数指针表,语法上更安全、更易用,但运行时开销与 C 函数指针相当(一次间接跳转 + 寄存器加载)。C 函数指针的优势在于显式控制、无隐藏状态、可跨语言绑定(Foreign Function Interface),劣势在于缺乏类型安全与生命周期管理。

## 形式化定义

### 1. 函数指针类型

设函数类型 $F = \text{Ret}(\text{Arg}_1, \text{Arg}_2, \dots, \text{Arg}_n)$,其指针类型为 $F^* = \text{Ret}(*)(\text{Arg}_1, \text{Arg}_2, \dots, \text{Arg}_n)$。函数名 $f$ 在大多数上下文中隐式转换为 $f^*$(函数到指针的 decay)。

$$
\text{decay}: F \to F^*, \quad f \mapsto \&f
$$

调用函数指针 $p$ 的语义:$p(a_1, a_2, \dots, a_n)$ 等价于 $(*p)(a_1, a_2, \dots, a_n)$,二者在 C 标准中完全等价。

### 2. 调用约定

调用约定(calling convention)定义函数参数传递、返回值传递、寄存器使用、栈清理的规则。不同平台与编译器有不同默认约定:

| 调用约定 | 参数传递 | 栈清理 | 典型平台 |
|---------|---------|--------|---------|
| `cdecl` | 右到左压栈 | 调用者 | C 默认(x86) |
| `stdcall` | 右到左压栈 | 被调用者 | Win32 API |
| `fastcall` | 部分寄存器 + 栈 | 被调用者 | MSVC 优化 |
| `thiscall` | this 在 ECX,其余栈 | 被调用者 | MSVC C++ |
| `vectorcall` | 寄存器 + 向量寄存器 | 被调用者 | MSVC SIMD |
| System V AMD64 | 整数参数 RDI/RSI/RDX/RCX/R8/R9 | 调用者 | Linux x86-64 |
| ARM AAPCS | R0-R3 + 栈 | 调用者 | ARM |

函数指针类型必须包含调用约定信息(在 x86 Windows 上),不匹配的调用约定导致未定义行为。

### 3. 函数指针数组

函数指针数组 $A = [f_1^*, f_2^*, \dots, f_n^*]$,索引调用 $A[i](args)$ 等价于间接跳转:

$$
\text{call}(A, i, \text{args}) = \text{indirect\_jump}(A[i], \text{args})
$$

跳转表(jump table)利用函数指针数组替代 `switch-case`,在某些场景下性能更优(因间接跳转可被分支预测器预测,而大型 switch 的比较链无法)。

### 4. 回调契约

回调函数 $g$ 通过函数指针 $p$ 注册到调用者 $f$,调用形式:

$$
f(p, \text{context}) \to f \text{ 在适当时机调用 } p(\text{args}, \text{context})
$$

`context` 通常是 `void *` 指针,允许调用者传递任意状态,模拟闭包的捕获变量。形式化地,带上下文的回调等价于:

$$
\text{closure}(g, \text{captured\_vars}) \approx \lambda \text{args}. g(\text{args}, \text{captured\_vars})
$$

### 5. 函数指针的类型安全

C 函数指针类型严格区分返回类型与参数类型,但允许通过强制转换绕过:

```c
int add(int a, int b) { return a + b; }
void (*p)(void) = (void (*)(void))add;  /* 强制转换 */
p();  /* UB:实际调用 add,但参数与返回值不匹配 */
```

形式化:设函数 $f$ 真实类型 $F_1 = \text{Ret}_1(\text{Args}_1)$,函数指针 $p$ 声明类型 $F_2^* = \text{Ret}_2^*(\text{Args}_2)$。若 $F_1 \neq F_2$,通过 $p$ 调用 $f$ 是未定义行为(C 标准 6.5.2.2)。

## 理论推导

### 1. 间接调用的性能开销

直接调用 `call func` 指令编码短(5 字节相对调用),目标地址在指令中固定,分支预测器(BTU)可 100% 预测。间接调用 `call [rax]` 指令编码短(2 字节),但目标地址在寄存器中,分支预测器需要查询 BTB(Branch Target Buffer)间接跳转历史。

现代 CPU 的间接跳转预测器(如 Intel ITTAGE、AMD Indirect Branch Predictor)在预测命中时开销接近直接调用(1-2 周期),但预测失败需冲刷流水线,代价 15-20 周期。函数指针数组的间接调用因目标随索引变化,预测难度高于单一函数指针。

### 2. 跳转表 vs switch-case 的性能

`switch-case` 在 case 数量少时编译为比较链,case 多且密集时编译为跳转表。手动跳转表(函数指针数组)的优势:

- 显式控制布局,可放至缓存友好的内存区域。
- 函数体可独立优化(每个函数单独编译,寄存器分配独立)。
- 支持运行时动态修改(替换函数指针)。

劣势:

- 间接调用预测失败代价高。
- 函数体分离可能破坏指令缓存局部性。
- 无法内联(switch-case 在 case 体小时可被编译器内联到调用者)。

### 3. 闭包模拟的内存模型

C 不支持闭包(lexical closure),但可通过"函数指针 + 上下文指针"模拟:

```c
typedef struct {
    int threshold;
    int count;
} FilterState;

void filter_callback(int value, void *ctx) {
    FilterState *s = (FilterState *)ctx;
    if (value > s->threshold) s->count++;
}
```

上下文指针 `ctx` 等价于闭包捕获的变量,函数指针 + 上下文 = 闭包。这种模拟的局限:

- 上下文是显式参数,污染函数签名。
- 上下文生命周期需手动管理(类似手动 GC)。
- 无法嵌套定义(闭包可定义在函数内部)。

GCC 扩展支持嵌套函数与词法捕获,但非标准且不可移植:

```c
void outer(int threshold) {
    int count = 0;
    void inner(int value) {  /* GCC 嵌套函数 */
        if (value > threshold) count++;
    }
    /* inner 持有对 threshold、count 的词法引用 */
}
```

### 4. 类型安全的形式化

设函数 $f$ 真实类型 $F_1 = \text{Ret}_1(\text{Arg}_1, \dots, \text{Arg}_m)$,函数指针声明类型 $F_2^* = \text{Ret}_2^*(\text{Arg}'_1, \dots, \text{Arg}'_n)$。安全调用要求:

$$
\text{safe}(p, f) \iff \text{Ret}_1 = \text{Ret}_2 \land m = n \land \forall i: \text{Arg}_i = \text{Arg}'_i
$$

C 标准允许某些兼容类型的隐式转换(如 `int` 与 `signed int`),但忽略限定符(如 `const`)的行为未定义。强制转换 `(void (*)(void))f` 后调用是 UB,但 POSIX 信号处理函数 `void (*)(int)` 与 `void (*)(void)` 的转换在多数平台实际工作(因 ABI 兼容)。

### 5. 函数指针与数据指针的大小

C 标准 6.2.5 规定函数指针与数据指针是不同类型,大小可能不同(尽管在主流平台上都是 `sizeof(void *)`)。某些嵌入式平台(如 Harvard 架构)函数地址空间与数据地址空间分离,函数指针可能比数据指针大或小。

POSIX 标准 `dlsym` 返回 `void *`,但严格来说应返回 `void (*)(void)`,因函数指针不能安全转换为 `void *`。POSIX 强制要求 `void *` 与函数指针大小一致以支持 `dlsym`,这是 POSIX 对 C 标准的扩展。

## 代码示例

### 示例 1:基础函数指针声明与调用

```c
/* 文件: basic_func_ptr.c
 * 演示函数指针的基本声明、初始化与调用
 */
#include <stdio.h>

/* 简单算术函数 */
int add(int a, int b) { return a + b; }
int subtract(int a, int b) { return a - b; }
int multiply(int a, int b) { return a * b; }
int divide(int a, int b) { return b != 0 ? a / b : 0; }

int main(void) {
    /* 声明函数指针:int (*)(int, int) */
    int (*op)(int, int);

    /* 赋值:函数名隐式转换为函数指针 */
    op = add;  /* 等价于 op = &add; */
    printf("10 + 3 = %d\n", op(10, 3));  /* 等价于 (*op)(10, 3) */

    op = subtract;
    printf("10 - 3 = %d\n", op(10, 3));

    op = multiply;
    printf("10 * 3 = %d\n", op(10, 3));

    op = divide;
    printf("10 / 3 = %d\n", op(10, 3));

    /* 函数指针比较 */
    int (*op2)(int, int) = add;
    if (op2 == add) {
        printf("op2 指向 add\n");
    }

    return 0;
}
```

### 示例 2:typedef 简化函数指针

```c
/* 文件: typedef_func_ptr.c
 * 演示使用 typedef 简化复杂的函数指针声明
 */
#include <stdio.h>

/* 不使用 typedef:声明复杂 */
/* int (*ops[4])(int, int); */  /* 函数指针数组 */

/* 使用 typedef:声明清晰 */
typedef int (*BinaryOp)(int, int);  /* 二元运算函数指针类型 */
typedef void (*Callback)(int);       /* 简单回调类型 */
typedef void (*CallbackCtx)(int, void *);  /* 带上下文回调 */

int add(int a, int b) { return a + b; }
int max(int a, int b) { return a > b ? a : b; }

void print_value(int x) {
    printf("value: %d\n", x);
}

void accumulate(int x, void *ctx) {
    int *sum = (int *)ctx;
    *sum += x;
}

int main(void) {
    /* 使用 typedef 后,声明更清晰 */
    BinaryOp op1 = add;
    BinaryOp op2 = max;

    printf("add(3, 5) = %d\n", op1(3, 5));
    printf("max(3, 5) = %d\n", op2(3, 5));

    /* 函数指针数组 */
    BinaryOp ops[] = {add, max};
    printf("ops[0](10, 20) = %d\n", ops[0](10, 20));
    printf("ops[1](10, 20) = %d\n", ops[1](10, 20));

    /* 回调示例 */
    Callback cb = print_value;
    cb(42);

    /* 带上下文回调 */
    int sum = 0;
    CallbackCtx cbctx = accumulate;
    int arr[] = {1, 2, 3, 4, 5};
    for (size_t i = 0; i < sizeof(arr)/sizeof(arr[0]); i++) {
        cbctx(arr[i], &sum);
    }
    printf("sum = %d\n", sum);  /* 15 */

    return 0;
}
```

### 示例 3:qsort 回调与自定义比较

```c
/* 文件: qsort_callback.c
 * 演示 qsort 与多种比较回调
 */
#include <stdio.h>
#include <stdlib.h>

/* 升序比较 */
int cmp_asc(const void *a, const void *b) {
    int va = *(const int *)a;
    int vb = *(const int *)b;
    return (va > vb) - (va < vb);  /* 避免溢出 */
}

/* 降序比较 */
int cmp_desc(const void *a, const void *b) {
    return cmp_asc(b, a);
}

/* 按绝对值比较 */
int cmp_abs(const void *a, const void *b) {
    int va = abs(*(const int *)a);
    int vb = abs(*(const int *)b);
    return (va > vb) - (va < vb);
}

/* 按模 k 比较(需要全局变量,不推荐) */
static int g_mod;
int cmp_mod(const void *a, const void *b) {
    int va = *(const int *)a % g_mod;
    int vb = *(const int *)b % g_mod;
    return (va > vb) - (va < vb);
}

void print_array(const int *arr, size_t n, const char *label) {
    printf("%s: ", label);
    for (size_t i = 0; i < n; i++) {
        printf("%d ", arr[i]);
    }
    printf("\n");
}

int main(void) {
    int arr[] = {5, -3, 8, -1, 2, -7, 4};
    size_t n = sizeof(arr) / sizeof(arr[0]);

    print_array(arr, n, "original");

    /* 升序 */
    qsort(arr, n, sizeof(int), cmp_asc);
    print_array(arr, n, "ascending");

    /* 降序 */
    qsort(arr, n, sizeof(int), cmp_desc);
    print_array(arr, n, "descending");

    /* 按绝对值 */
    qsort(arr, n, sizeof(int), cmp_abs);
    print_array(arr, n, "by absolute");

    /* 按模 3(使用全局变量,不推荐,推荐 qsort_r) */
    g_mod = 3;
    qsort(arr, n, sizeof(int), cmp_mod);
    print_array(arr, n, "by mod 3");

    return 0;
}
```

### 示例 4:带上下文回调(qsort_r 风格)

```c
/* 文件: callback_with_context.c
 * 演示带上下文的回调,避免全局变量
 */
#include <stdio.h>
#include <stdlib.h>

/* 比较上下文 */
typedef struct {
    int modulus;     /* 取模基数 */
    int ascending;   /* 1 升序,0 降序 */
} CompareContext;

/* 带上下文的比较函数 */
int cmp_with_ctx(const void *a, const void *b, void *ctx) {
    const CompareContext *c = (const CompareContext *)ctx;
    int va = *(const int *)a % c->modulus;
    int vb = *(const int *)b % c->modulus;
    int result = (va > vb) - (va < vb);
    return c->ascending ? result : -result;
}

/* 通用排序包装:接受带上下文回调 */
void sort_with_context(int *arr, size_t n,
                       int (*cmp)(const void *, const void *, void *),
                       void *ctx) {
    /* 简化的冒泡排序(演示用,实际应使用 qsort_r) */
    for (size_t i = 0; i < n; i++) {
        for (size_t j = i + 1; j < n; j++) {
            if (cmp(&arr[i], &arr[j], ctx) > 0) {
                int tmp = arr[i];
                arr[i] = arr[j];
                arr[j] = tmp;
            }
        }
    }
}

void print_array(const int *arr, size_t n) {
    for (size_t i = 0; i < n; i++) printf("%d ", arr[i]);
    printf("\n");
}

int main(void) {
    int arr[] = {5, -3, 8, -1, 2, -7, 4, 10, 6, 9};
    size_t n = sizeof(arr) / sizeof(arr[0]);

    CompareContext ctx1 = {.modulus = 3, .ascending = 1};
    sort_with_context(arr, n, cmp_with_ctx, &ctx1);
    printf("mod 3 ascending: ");
    print_array(arr, n);

    CompareContext ctx2 = {.modulus = 5, .ascending = 0};
    sort_with_context(arr, n, cmp_with_ctx, &ctx2);
    printf("mod 5 descending: ");
    print_array(arr, n);

    return 0;
}
```

### 示例 5:事件系统实现

```c
/* 文件: event_system.c
 * 演示基于函数指针的事件系统:订阅、发布、多处理器
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_HANDLERS 16

/* 事件类型 */
typedef enum {
    EVENT_CLICK,
    EVENT_KEY_PRESS,
    EVENT_MOUSE_MOVE,
    EVENT_TIMER,
    EVENT_CUSTOM
} EventType;

/* 事件结构 */
typedef struct {
    EventType type;
    int x, y;          /* 鼠标坐标 */
    int key_code;      /* 按键码 */
    const char *data;  /* 自定义数据 */
} Event;

/* 事件处理器类型 */
typedef void (*EventHandler)(const Event *);

/* 事件系统 */
typedef struct {
    EventHandler handlers[MAX_HANDLERS];
    EventType handler_types[MAX_HANDLERS];
    int count;
} EventSystem;

/* 初始化事件系统 */
void event_system_init(EventSystem *es) {
    memset(es, 0, sizeof(*es));
}

/* 订阅事件 */
int event_system_subscribe(EventSystem *es, EventType type, EventHandler handler) {
    if (es->count >= MAX_HANDLERS) return -1;
    if (handler == NULL) return -1;
    es->handlers[es->count] = handler;
    es->handler_types[es->count] = type;
    es->count++;
    return 0;
}

/* 发布事件 */
void event_system_emit(EventSystem *es, const Event *event) {
    for (int i = 0; i < es->count; i++) {
        if (es->handler_types[i] == event->type || es->handler_types[i] == EVENT_CUSTOM) {
            es->handlers[i](event);
        }
    }
}

/* 具体处理器 */
void on_click(const Event *e) {
    printf("[click] at (%d, %d)\n", e->x, e->y);
}

void on_key(const Event *e) {
    printf("[key] code=%d\n", e->key_code);
}

void logger(const Event *e) {
    const char *type_str[] = {"CLICK", "KEY", "MOUSE", "TIMER", "CUSTOM"};
    printf("[log] type=%s", type_str[e->type]);
    if (e->type == EVENT_CLICK) printf(" x=%d y=%d", e->x, e->y);
    if (e->type == EVENT_KEY_PRESS) printf(" key=%d", e->key_code);
    printf("\n");
}

void custom_handler(const Event *e) {
    if (e->data) {
        printf("[custom] data=%s\n", e->data);
    }
}

int main(void) {
    EventSystem es;
    event_system_init(&es);

    /* 订阅 */
    event_system_subscribe(&es, EVENT_CLICK, on_click);
    event_system_subscribe(&es, EVENT_KEY_PRESS, on_key);
    event_system_subscribe(&es, EVENT_CUSTOM, custom_handler);
    /* logger 监听所有事件(订阅 EVENT_CUSTOM 作为通配) */
    /* 实际可扩展为 EVENT_ANY */

    /* 发布事件 */
    Event click = {.type = EVENT_CLICK, .x = 100, .y = 200};
    event_system_emit(&es, &click);

    Event key = {.type = EVENT_KEY_PRESS, .key_code = 65};
    event_system_emit(&es, &key);

    Event custom = {.type = EVENT_CUSTOM, .data = "hello world"};
    event_system_emit(&es, &custom);

    return 0;
}
```

### 示例 6:策略模式

```c
/* 文件: strategy_pattern.c
 * 演示使用函数指针实现策略模式
 */
#include <stdio.h>
#include <stdlib.h>

/* 折扣策略类型 */
typedef double (*DiscountStrategy)(double price, void *ctx);

/* 具体策略:无折扣 */
double no_discount(double price, void *ctx) {
    (void)ctx;
    return price;
}

/* 具体策略:百分比折扣 */
double percentage_discount(double price, void *ctx) {
    double *percent = (double *)ctx;
    return price * (1.0 - *percent / 100.0);
}

/* 具体策略:固定金额减免 */
double fixed_discount(double price, void *ctx) {
    double *amount = (double *)ctx;
    return price > *amount ? price - *amount : 0;
}

/* 具体策略:满减 */
double threshold_discount(double price, void *ctx) {
    /* ctx 包含 [threshold, reduction] */
    double *params = (double *)ctx;
    double threshold = params[0];
    double reduction = params[1];
    return price >= threshold ? price - reduction : price;
}

/* 应用折扣 */
double apply_discount(double price, DiscountStrategy strategy, void *ctx) {
    return strategy(price, ctx);
}

int main(void) {
    double price = 200.0;
    double percent = 20.0;  /* 20% off */
    double amount = 50.0;   /* 减 50 */
    double params[] = {150.0, 30.0};  /* 满 150 减 30 */

    printf("原价: %.2f\n", price);
    printf("无折扣: %.2f\n", apply_discount(price, no_discount, NULL));
    printf("8 折: %.2f\n", apply_discount(price, percentage_discount, &percent));
    printf("减 50: %.2f\n", apply_discount(price, fixed_discount, &amount));
    printf("满 150 减 30: %.2f\n",
           apply_discount(price, threshold_discount, params));

    return 0;
}
```

### 示例 7:跳转表(替代 switch-case)

```c
/* 文件: jump_table.c
 * 演示使用函数指针数组实现跳转表,替代 switch-case
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* 计算器操作函数 */
double calc_add(double a, double b) { return a + b; }
double calc_sub(double a, double b) { return a - b; }
double calc_mul(double a, double b) { return a * b; }
double calc_div(double a, double b) { return b != 0 ? a / b : 0; }
double calc_mod(double a, double b) { return b != 0 ? (double)((int)a % (int)b) : 0; }
double calc_pow(double a, double b) {
    double result = 1;
    int exp = (int)b;
    while (exp-- > 0) result *= a;
    return result;
}

/* 操作类型枚举 */
typedef enum {
    OP_ADD, OP_SUB, OP_MUL, OP_DIV, OP_MOD, OP_POW, OP_COUNT
} Operation;

/* 跳转表:函数指针数组 */
typedef double (*CalcOp)(double, double);
static const CalcOp calc_ops[OP_COUNT] = {
    [OP_ADD] = calc_add,
    [OP_SUB] = calc_sub,
    [OP_MUL] = calc_mul,
    [OP_DIV] = calc_div,
    [OP_MOD] = calc_mod,
    [OP_POW] = calc_pow
};

/* 操作名称表(与跳转表对应) */
static const char *op_names[OP_COUNT] = {
    [OP_ADD] = "+",
    [OP_SUB] = "-",
    [OP_MUL] = "*",
    [OP_DIV] = "/",
    [OP_MOD] = "%",
    [OP_POW] = "^"
};

/* 通过跳转表执行 */
double calculate(Operation op, double a, double b) {
    if (op >= 0 && op < OP_COUNT) {
        return calc_ops[op](a, b);
    }
    fprintf(stderr, "invalid operation: %d\n", op);
    return 0;
}

int main(void) {
    double a = 10.0, b = 3.0;

    for (Operation op = OP_ADD; op < OP_COUNT; op++) {
        printf("%.2f %s %.2f = %.2f\n", a, op_names[op], b,
               calculate(op, a, b));
    }

    return 0;
}
```

### 示例 8:返回函数指针的工厂

```c
/* 文件: func_ptr_factory.c
 * 演示返回函数指针的工厂函数
 */
#include <stdio.h>
#include <string.h>

/* 运算函数类型 */
typedef int (*IntOp)(int, int);

int add(int a, int b) { return a + b; }
int sub(int a, int b) { return a - b; }
int mul(int a, int b) { return a * b; }
int divide(int a, int b) { return b != 0 ? a / b : 0; }

/* 工厂函数:根据字符返回对应运算函数 */
IntOp get_operation(char op) {
    switch (op) {
        case '+': return add;
        case '-': return sub;
        case '*': return mul;
        case '/': return divide;
        default:  return NULL;
    }
}

/* 工厂函数:根据字符串返回运算函数 */
IntOp get_operation_by_name(const char *name) {
    if (strcmp(name, "add") == 0) return add;
    if (strcmp(name, "sub") == 0) return sub;
    if (strcmp(name, "mul") == 0) return mul;
    if (strcmp(name, "div") == 0) return divide;
    return NULL;
}

int main(void) {
    /* 通过字符获取 */
    IntOp op = get_operation('+');
    if (op) {
        printf("5 + 3 = %d\n", op(5, 3));
    }

    /* 通过字符串获取 */
    op = get_operation_by_name("mul");
    if (op) {
        printf("5 * 3 = %d\n", op(5, 3));
    }

    /* 错误处理 */
    op = get_operation('?');
    if (!op) {
        printf("unsupported operation\n");
    }

    return 0;
}
```

### 示例 9:闭包模拟(带状态的回调)

```c
/* 文件: closure_sim.c
 * 演示通过"函数指针 + 上下文结构"模拟闭包
 */
#include <stdio.h>
#include <stdlib.h>

/* 过滤器上下文(模拟闭包捕获的变量) */
typedef struct {
    int threshold;
    int count;
    int sum;
} FilterContext;

/* 过滤回调:超过阈值时计数并累加 */
void filter_and_accumulate(int value, void *ctx) {
    FilterContext *c = (FilterContext *)ctx;
    if (value > c->threshold) {
        c->count++;
        c->sum += value;
        printf("  matched: %d (count=%d, sum=%d)\n",
               value, c->count, c->sum);
    }
}

/* 通用遍历函数:对每个元素调用回调 */
void for_each(int *arr, size_t n, void (*callback)(int, void *), void *ctx) {
    for (size_t i = 0; i < n; i++) {
        callback(arr[i], ctx);
    }
}

/* 更复杂的闭包:带谓词的过滤 */
typedef int (*Predicate)(int, void *);

typedef struct {
    Predicate pred;
    void *pred_ctx;
    int *results;
    size_t count;
    size_t capacity;
} Collector;

void collect_if(int *arr, size_t n, Collector *c) {
    for (size_t i = 0; i < n; i++) {
        if (c->pred(arr[i], c->pred_ctx)) {
            if (c->count < c->capacity) {
                c->results[c->count++] = arr[i];
            }
        }
    }
}

/* 谓词:大于阈值 */
int greater_than(int x, void *ctx) {
    int *threshold = (int *)ctx;
    return x > *threshold;
}

/* 谓词:偶数 */
int is_even(int x, void *ctx) {
    (void)ctx;
    return x % 2 == 0;
}

int main(void) {
    int arr[] = {10, 25, 5, 30, 15, 40, 8, 50, 3, 35};
    size_t n = sizeof(arr) / sizeof(arr[0]);

    /* 简单闭包:FilterContext 捕获 threshold、count、sum */
    FilterContext ctx = {.threshold = 20, .count = 0, .sum = 0};
    printf("filtering > %d:\n", ctx.threshold);
    for_each(arr, n, filter_and_accumulate, &ctx);
    printf("total: count=%d, sum=%d\n", ctx.count, ctx.sum);

    /* 复杂闭包:Collector + Predicate */
    int results[10];
    Collector collector = {
        .pred = greater_than,
        .pred_ctx = &(int){25},
        .results = results,
        .count = 0,
        .capacity = 10
    };
    collect_if(arr, n, &collector);
    printf("\ncollected > 25: ");
    for (size_t i = 0; i < collector.count; i++) {
        printf("%d ", results[i]);
    }
    printf("\n");

    /* 切换谓词:收集偶数 */
    collector.pred = is_even;
    collector.pred_ctx = NULL;
    collector.count = 0;
    collect_if(arr, n, &collector);
    printf("collected evens: ");
    for (size_t i = 0; i < collector.count; i++) {
        printf("%d ", results[i]);
    }
    printf("\n");

    return 0;
}
```

### 示例 10:插件架构

```c
/* 文件: plugin_arch.c
 * 演示基于函数指针的插件架构
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_PLUGINS 16
#define MAX_NAME_LEN 32

/* 插件接口(通过函数指针表定义) */
typedef struct {
    char name[MAX_NAME_LEN];
    int version;
    void (*init)(void);
    void (*process)(const char *input, char *output, size_t size);
    void (*cleanup)(void);
} Plugin;

/* 插件注册表 */
static Plugin plugins[MAX_PLUGINS];
static int plugin_count = 0;

/* 注册插件 */
int register_plugin(const Plugin *p) {
    if (plugin_count >= MAX_PLUGINS) return -1;
    if (!p || !p->init || !p->process) return -1;
    plugins[plugin_count] = *p;
    plugin_count++;
    return 0;
}

/* 初始化所有插件 */
void init_all_plugins(void) {
    for (int i = 0; i < plugin_count; i++) {
        if (plugins[i].init) {
            printf("initializing plugin: %s v%d\n",
                   plugins[i].name, plugins[i].version);
            plugins[i].init();
        }
    }
}

/* 通过插件链处理数据 */
void process_through_plugins(const char *input, char *final_output, size_t size) {
    char buf1[256], buf2[256];
    strncpy(buf1, input, sizeof(buf1) - 1);
    buf1[sizeof(buf1) - 1] = '\0';

    for (int i = 0; i < plugin_count; i++) {
        if (plugins[i].process) {
            plugins[i].process(buf1, buf2, sizeof(buf2));
            strncpy(buf1, buf2, sizeof(buf1) - 1);
            buf1[sizeof(buf1) - 1] = '\0';
        }
    }

    strncpy(final_output, buf1, size - 1);
    final_output[size - 1] = '\0';
}

/* 清理所有插件 */
void cleanup_all_plugins(void) {
    for (int i = 0; i < plugin_count; i++) {
        if (plugins[i].cleanup) {
            printf("cleaning up plugin: %s\n", plugins[i].name);
            plugins[i].cleanup();
        }
    }
}

/* 具体插件实现 */

/* 大写转换插件 */
void upper_init(void) { /* 可初始化资源 */ }
void upper_process(const char *input, char *output, size_t size) {
    size_t i;
    for (i = 0; input[i] && i < size - 1; i++) {
        output[i] = (input[i] >= 'a' && input[i] <= 'z')
                    ? input[i] - 32 : input[i];
    }
    output[i] = '\0';
}
void upper_cleanup(void) { /* 释放资源 */ }

/* 前缀添加插件 */
void prefix_init(void) {}
void prefix_process(const char *input, char *output, size_t size) {
    snprintf(output, size, "[PREFIX] %s", input);
}
void prefix_cleanup(void) {}

/* 后缀添加插件 */
void suffix_init(void) {}
void suffix_process(const char *input, char *output, size_t size) {
    snprintf(output, size, "%s [SUFFIX]", input);
}
void suffix_cleanup(void) {}

int main(void) {
    /* 注册插件 */
    Plugin upper_plugin = {
        .name = "UpperConverter",
        .version = 1,
        .init = upper_init,
        .process = upper_process,
        .cleanup = upper_cleanup
    };
    Plugin prefix_plugin = {
        .name = "PrefixAdder",
        .version = 1,
        .init = prefix_init,
        .process = prefix_process,
        .cleanup = prefix_cleanup
    };
    Plugin suffix_plugin = {
        .name = "SuffixAdder",
        .version = 1,
        .init = suffix_init,
        .process = suffix_process,
        .cleanup = suffix_cleanup
    };

    register_plugin(&upper_plugin);
    register_plugin(&prefix_plugin);
    register_plugin(&suffix_plugin);

    /* 初始化 */
    init_all_plugins();

    /* 处理数据 */
    char output[512];
    process_through_plugins("hello world", output, sizeof(output));
    printf("\nfinal output: %s\n", output);

    /* 清理 */
    cleanup_all_plugins();

    return 0;
}
```

### 示例 11:观察者模式(发布-订阅)

```c
/* 文件: observer_pattern.c
 * 演示观察者模式:主题(Subject)与观察者(Observer)
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_OBSERVERS 32

/* 观察者回调类型 */
typedef void (*ObserverCallback)(const char *event, void *data, void *ctx);

/* 观察者结构 */
typedef struct {
    ObserverCallback callback;
    void *ctx;  /* 观察者私有上下文 */
} Observer;

/* 主题(被观察对象) */
typedef struct {
    Observer observers[MAX_OBSERVERS];
    int count;
    char name[32];
} Subject;

/* 初始化主题 */
void subject_init(Subject *s, const char *name) {
    memset(s, 0, sizeof(*s));
    strncpy(s->name, name, sizeof(s->name) - 1);
}

/* 订阅(注册观察者) */
int subject_subscribe(Subject *s, ObserverCallback cb, void *ctx) {
    if (s->count >= MAX_OBSERVERS) return -1;
    if (!cb) return -1;
    s->observers[s->count].callback = cb;
    s->observers[s->count].ctx = ctx;
    s->count++;
    return 0;
}

/* 通知所有观察者 */
void subject_notify(Subject *s, const char *event, void *data) {
    printf("[%s] notifying %d observers about '%s'\n",
           s->name, s->count, event);
    for (int i = 0; i < s->count; i++) {
        s->observers[i].callback(event, data, s->observers[i].ctx);
    }
}

/* 具体观察者:日志记录器 */
void logger_observer(const char *event, void *data, void *ctx) {
    (void)ctx;
    printf("  [logger] event=%s", event);
    if (data) printf(" data=%s", (const char *)data);
    printf("\n");
}

/* 具体观察者:邮件通知 */
typedef struct {
    char email[64];
} EmailConfig;

void email_observer(const char *event, void *data, void *ctx) {
    EmailConfig *config = (EmailConfig *)ctx;
    printf("  [email:%s] event=%s", config->email, event);
    if (data) printf(" data=%s", (const char *)data);
    printf("\n");
}

/* 具体观察者:计数器 */
typedef struct {
    int count;
} Counter;

void counter_observer(const char *event, void *data, void *ctx) {
    (void)event; (void)data;
    Counter *c = (Counter *)ctx;
    c->count++;
    printf("  [counter] total events received: %d\n", c->count);
}

int main(void) {
    Subject news;
    subject_init(&news, "News");

    /* 订阅 */
    subject_subscribe(&news, logger_observer, NULL);

    EmailConfig admin_email = {.email = "admin@example.com"};
    subject_subscribe(&news, email_observer, &admin_email);

    EmailConfig user_email = {.email = "user@example.com"};
    subject_subscribe(&news, email_observer, &user_email);

    Counter counter = {.count = 0};
    subject_subscribe(&news, counter_observer, &counter);

    /* 发布事件 */
    subject_notify(&news, "article_published", "New C tutorial released");
    printf("\n");
    subject_notify(&news, "comment_added", "Great article!");
    printf("\n");
    subject_notify(&news, "article_published", "Advanced C pointers");

    printf("\ntotal events: %d\n", counter.count);

    return 0;
}
```

### 示例 12:协程式状态机

```c
/* 文件: state_machine.c
 * 演示使用函数指针实现状态机
 */
#include <stdio.h>
#include <stdlib.h>

/* 状态枚举 */
typedef enum {
    STATE_IDLE,
    STATE_RUNNING,
    STATE_PAUSED,
    STATE_STOPPED,
    STATE_ERROR,
    STATE_COUNT
} State;

/* 事件枚举 */
typedef enum {
    EVENT_START,
    EVENT_PAUSE,
    EVENT_RESUME,
    EVENT_STOP,
    EVENT_ERROR,
    EVENT_RESET,
    EVENT_COUNT
} Event;

/* 状态机上下文 */
typedef struct {
    State current_state;
    int error_count;
    int transition_count;
} StateMachine;

/* 状态处理函数类型 */
typedef State (*StateHandler)(StateMachine *sm, Event event);

/* 状态处理函数:IDLE */
State handle_idle(StateMachine *sm, Event event) {
    (void)sm;
    switch (event) {
        case EVENT_START:  return STATE_RUNNING;
        case EVENT_ERROR:  return STATE_ERROR;
        default:           return STATE_IDLE;
    }
}

/* 状态处理函数:RUNNING */
State handle_running(StateMachine *sm, Event event) {
    switch (event) {
        case EVENT_PAUSE: return STATE_PAUSED;
        case EVENT_STOP:  return STATE_STOPPED;
        case EVENT_ERROR:
            sm->error_count++;
            return STATE_ERROR;
        default:          return STATE_RUNNING;
    }
}

/* 状态处理函数:PAUSED */
State handle_paused(StateMachine *sm, Event event) {
    (void)sm;
    switch (event) {
        case EVENT_RESUME: return STATE_RUNNING;
        case EVENT_STOP:   return STATE_STOPPED;
        default:           return STATE_PAUSED;
    }
}

/* 状态处理函数:STOPPED */
State handle_stopped(StateMachine *sm, Event event) {
    (void)sm;
    switch (event) {
        case EVENT_RESET: return STATE_IDLE;
        default:          return STATE_STOPPED;
    }
}

/* 状态处理函数:ERROR */
State handle_error(StateMachine *sm, Event event) {
    switch (event) {
        case EVENT_RESET:
            sm->error_count = 0;
            return STATE_IDLE;
        default:
            return STATE_ERROR;
    }
}

/* 状态处理函数表(跳转表) */
static const StateHandler state_handlers[STATE_COUNT] = {
    [STATE_IDLE]    = handle_idle,
    [STATE_RUNNING] = handle_running,
    [STATE_PAUSED]  = handle_paused,
    [STATE_STOPPED] = handle_stopped,
    [STATE_ERROR]   = handle_error
};

/* 状态名称表 */
static const char *state_names[STATE_COUNT] = {
    [STATE_IDLE]    = "IDLE",
    [STATE_RUNNING] = "RUNNING",
    [STATE_PAUSED]  = "PAUSED",
    [STATE_STOPPED] = "STOPPED",
    [STATE_ERROR]   = "ERROR"
};

/* 事件名称表 */
static const char *event_names[EVENT_COUNT] = {
    [EVENT_START]  = "START",
    [EVENT_PAUSE]  = "PAUSE",
    [EVENT_RESUME] = "RESUME",
    [EVENT_STOP]   = "STOP",
    [EVENT_ERROR]  = "ERROR",
    [EVENT_RESET]  = "RESET"
};

/* 处理事件 */
void state_machine_handle(StateMachine *sm, Event event) {
    printf("[%s] event=%s -> ", state_names[sm->current_state], event_names[event]);

    StateHandler handler = state_handlers[sm->current_state];
    State new_state = handler(sm, event);

    if (new_state != sm->current_state) {
        sm->current_state = new_state;
        sm->transition_count++;
        printf("[%s] (transition #%d)\n",
               state_names[sm->current_state], sm->transition_count);
    } else {
        printf("[%s] (no change)\n", state_names[sm->current_state]);
    }
}

int main(void) {
    StateMachine sm = {.current_state = STATE_IDLE, .error_count = 0, .transition_count = 0};

    Event events[] = {
        EVENT_START, EVENT_PAUSE, EVENT_RESUME,
        EVENT_ERROR, EVENT_RESET, EVENT_START, EVENT_STOP
    };

    for (size_t i = 0; i < sizeof(events)/sizeof(events[0]); i++) {
        state_machine_handle(&sm, events[i]);
    }

    printf("\nfinal state: %s, transitions: %d, errors: %d\n",
           state_names[sm.current_state], sm.transition_count, sm.error_count);

    return 0;
}
```

## 对比分析

### 1. C 函数指针 vs C++ 虚函数

| 维度 | C 函数指针 | C++ 虚函数 |
|------|----------|----------|
| 语法 | 显式声明 `int (*p)(int)` | 隐式 `virtual` 关键字 |
| 类型安全 | 弱(可强制转换绕过) | 强(编译器严格检查) |
| 运行时开销 | 1 次间接跳转 | 1 次间接跳转 + vtable 查找 |
| 多继承 | 不支持 | 支持(vtable 链) |
| 生命周期 | 手动管理 | 析构函数自动 |
| 可见性 | 任意可访问 | 受 `public`/`protected`/`private` 控制 |
| 跨语言 | 易(ABI 简单) | 难(name mangling) |
| 内联 | 不可 | 通常不可(可 `final` 内联) |
| 调试 | 难(无符号) | 易(有符号) |

### 2. C 回调 vs 闭包(Lambda)

| 维度 | C 回调(函数指针 + ctx) | 闭包(Lambda) |
|------|----------------------|--------------|
| 捕获变量 | 显式 `void *ctx` | 隐式词法捕获 |
| 类型安全 | 弱(需强制转换) | 强(编译器推导) |
| 生命周期 | 手动管理 | 自动(GC/RAII) |
| 嵌套定义 | 不可(需顶层) | 可(函数内定义) |
| 性能 | 直接调用,零开销 | 通常零开销(可内联) |
| 可读性 | 低(分离的 ctx) | 高(就近定义) |
| 语言支持 | C89+ | C++11+、Java 8+、Python、JS |

### 3. 直接调用 vs 间接调用性能

| 维度 | 直接调用 | 间接调用(函数指针) |
|------|---------|-----------------|
| 指令 | `call rel32`(5 字节) | `call [rax]`(2 字节) |
| 分支预测 | 100% 命中(BTU) | 70-95% 命中(ITTAGE) |
| 内联 | 可内联 | 不可内联 |
| 寄存器分配 | 跨函数优化 | 独立函数优化 |
| 指令缓存 | 局部性好 | 可能跨页 |
| 典型开销 | 1-2 周期 | 2-5 周期(预测命中) |

### 4. 函数指针 vs 函数对象(C++)

| 维度 | C 函数指针 | C++ 函数对象(functor) |
|------|----------|--------------------|
| 状态 | 无(需外部 ctx) | 有(成员变量) |
| 内联 | 不可 | 可(模板特化) |
| 类型安全 | 弱 | 强 |
| 模板特化 | 不支持 | 支持 |
| `std::function` | 不适用 | 类型擦除,可持有任意可调用对象 |
| 性能 | 间接调用 | 直接调用(模板)或间接(`std::function`) |

## 常见陷阱与反模式

### 1. 函数指针类型不匹配

```c
int add(int a, int b) { return a + b; }

/* 错误:类型不匹配 */
double (*p)(int, int) = (double (*)(int, int))add;
double r = p(3, 5);  /* UB:返回值解释错误 */
```

正确做法:确保函数指针类型与函数签名完全一致。

### 2. 调用空函数指针

```c
int (*func_ptr)(int) = NULL;
func_ptr(42);  /* UB:解引用空指针,通常段错误 */
```

正确做法:调用前检查非空。

```c
if (func_ptr) {
    func_ptr(42);
}
```

### 3. 调用约定不匹配(x86 Windows)

```c
/* MSVC 上 cdecl 与 stdcall 不匹配 */
void __stdcall callback_stdcall(int x) { ... }
void (*p)(int) = callback_stdcall;  /* 声明为 cdecl */
p(42);  /* UB:栈清理不一致,可能导致栈损坏 */
```

正确做法:函数指针类型显式声明调用约定。

```c
void (__stdcall *p)(int) = callback_stdcall;
```

### 4. 重入问题(可重入性)

```c
/* 不可重入的回调:使用全局状态 */
static int counter = 0;
void callback(int x) {
    counter++;  /* 重入时计数错误 */
    /* ... */
}

/* 若 callback 在信号处理或多线程中被重入,counter 可能不一致 */
```

正确做法:使用局部上下文,或加锁保护。

### 5. 异常安全(C++ 回调到 C)

```cpp
/* C++ 回调抛异常到 C 代码 */
extern "C" void cpp_callback(int x) {
    throw std::runtime_error("oops");  /* UB:跨 C 边界抛异常 */
}

/* C 代码 */
void (*cb)(int) = cpp_callback;
cb(42);  /* 异常传播到 C,行为未定义 */
```

正确做法:C++ 回调函数捕获所有异常,转换为错误码。

### 6. 生命周期管理

```c
/* 错误:回调引用已释放的资源 */
void *ctx = malloc(sizeof(int));
*(int *)ctx = 42;
register_callback(cb, ctx);
free(ctx);  /* ctx 已释放 */
/* 回调触发时访问已释放内存 */
```

正确做法:确保上下文生命周期覆盖回调使用期。

### 7. 函数指针与数据指针混用

```c
int x = 42;
int (*func_ptr)(int) = (int (*)(int))&x;  /* 强制转换数据指针 */
func_ptr(10);  /* UB:数据指针转函数指针并调用 */
```

注意:POSIX `dlsym` 返回 `void *`,但严格 C 标准不允许数据指针转函数指针调用。

### 8. 函数指针数组越界

```c
typedef int (*Op)(int, int);
Op ops[] = {add, sub, mul};
int r = ops[5](3, 4);  /* 越界:UB */
```

正确做法:检查索引边界。

### 9. 回调中修改被遍历的数据结构

```c
/* 错误:回调中删除当前节点,导致迭代器失效 */
void for_each(Node *head, void (*cb)(Node *)) {
    for (Node *n = head; n; n = n->next) {
        cb(n);  /* cb 可能 free(n),n->next 失效 */
    }
}
```

正确做法:回调仅标记删除,遍历后统一清理;或使用安全迭代器。

### 10. 未初始化的函数指针

```c
int (*func_ptr)(int);  /* 未初始化,值不确定 */
func_ptr(42);  /* UB:跳转到随机地址 */
```

正确做法:声明时初始化为 NULL,或确保使用前赋值。

## 工程实践

### 1. API 设计原则

```c
/* 良好的回调 API 设计 */

/* 1. 使用 typedef 简化签名 */
typedef int (*CompareFunc)(const void *, const void *, void *ctx);

/* 2. 提供上下文参数 */
void sort_with_ctx(void *base, size_t n, size_t size,
                   CompareFunc cmp, void *ctx);

/* 3. 返回错误码或状态 */
typedef enum {
    CALLBACK_OK = 0,
    CALLBACK_STOP = 1,    /* 停止迭代 */
    CALLBACK_ERROR = -1
} CallbackResult;

/* 4. 支持提前退出 */
typedef CallbackResult (*IterCallback)(void *item, void *ctx);
int iterate(void *arr, size_t n, size_t size, IterCallback cb, void *ctx);

/* 5. 明确线程安全约定 */
/* 文档说明:回调是否可重入、是否可并发调用 */
```

### 2. 错误处理

```c
/* 回调错误传播 */

typedef enum {
    HANDLER_CONTINUE = 0,
    HANDLER_STOP = 1,
    HANDLER_ERROR = -1
} HandlerResult;

typedef HandlerResult (*EventHandler)(const Event *e, void *ctx);

/* 事件分发:支持错误传播与提前退出 */
int dispatch_event(EventSystem *es, const Event *e) {
    for (int i = 0; i < es->count; i++) {
        HandlerResult r = es->handlers[i](e, es->contexts[i]);
        if (r == HANDLER_ERROR) {
            fprintf(stderr, "handler %d failed\n", i);
            return -1;
        }
        if (r == HANDLER_STOP) {
            break;  /* 停止后续处理 */
        }
    }
    return 0;
}
```

### 3. 线程安全

```c
/* 线程安全的事件系统 */

#include <pthread.h>

typedef struct {
    EventHandler handlers[MAX_HANDLERS];
    void *contexts[MAX_HANDLERS];
    int count;
    pthread_mutex_t lock;
} ThreadSafeEventSystem;

int ts_subscribe(ThreadSafeEventSystem *es, EventHandler h, void *ctx) {
    pthread_mutex_lock(&es->lock);
    int result = -1;
    if (es->count < MAX_HANDLERS && h) {
        es->handlers[es->count] = h;
        es->contexts[es->count] = ctx;
        es->count++;
        result = 0;
    }
    pthread_mutex_unlock(&es->lock);
    return result;
}

void ts_emit(ThreadSafeEventSystem *es, const Event *e) {
    pthread_mutex_lock(&es->lock);
    int count = es->count;
    /* 复制一份,避免回调中修改 handlers */
    EventHandler handlers_copy[MAX_HANDLERS];
    void *contexts_copy[MAX_HANDLERS];
    memcpy(handlers_copy, es->handlers, sizeof(EventHandler) * count);
    memcpy(contexts_copy, es->contexts, sizeof(void *) * count);
    pthread_mutex_unlock(&es->lock);

    /* 无锁调用回调(假设回调自身线程安全) */
    for (int i = 0; i < count; i++) {
        handlers_copy[i](e, contexts_copy[i]);
    }
}
```

### 4. 可重入性

```c
/* 可重入回调设计 */

/* 不可重入:使用全局变量 */
static int g_count = 0;
void bad_callback(int x) {
    g_count++;  /* 信号/多线程重入时数据竞争 */
}

/* 可重入:使用局部上下文 */
typedef struct {
    int count;
} CounterCtx;

void good_callback(int x, void *ctx) {
    CounterCtx *c = (CounterCtx *)ctx;
    c->count++;  /* 每个调用者有自己的 ctx */
}

/* 信号安全回调:仅调用异步信号安全函数 */
void signal_handler(int signo) {
    /* 仅调用 write()、_exit() 等异步信号安全函数 */
    /* 不可调用 malloc、printf、mutex 等 */
    char msg[] = "signal received\n";
    write(STDERR_FILENO, msg, sizeof(msg) - 1);
}
```

### 5. 性能优化

```c
/* 性能优化技巧 */

/* 1. 热点路径使用直接调用 */
/* 若回调函数固定,直接调用避免间接跳转 */
if (cmp == default_compare) {
    /* 直接调用,可内联 */
    for (size_t i = 0; i < n; i++) {
        if (default_compare(&arr[i], &key) == 0) { ... }
    }
} else {
    /* 间接调用 */
    for (size_t i = 0; i < n; i++) {
        if (cmp(&arr[i], &key) == 0) { ... }
    }
}

/* 2. 批量回调:减少间接调用次数 */
typedef void (*BatchCallback)(const int *items, size_t n, void *ctx);
void for_each_batch(const int *arr, size_t n, BatchCallback cb, void *ctx, size_t batch_size) {
    for (size_t i = 0; i < n; i += batch_size) {
        size_t end = i + batch_size < n ? i + batch_size : n;
        cb(&arr[i], end - i, ctx);
    }
}

/* 3. 内联小回调:使用宏 + _Generic */
#define APPLY(arr, n, op) do {        \
    for (size_t i = 0; i < (n); i++) { \
        op((arr)[i]);                  \
    }                                  \
} while (0)
```

## 案例研究

### 1. C 标准库 qsort 实现

glibc 的 `qsort` 通过函数指针接受比较器,内部使用优化排序算法( introsort 或归并排序):

```c
/* glibc/stdlib/msort.c (简化) */
void qsort(void *base, size_t nmemb, size_t size,
           int (*cmp)(const void *, const void *)) {
    /* 根据元素大小选择策略 */
    if (size < PAGESIZE) {
        msort_with_tmp(base, nmemb, size, cmp, tmp);
    } else {
        /* 大元素:使用指针数组排序,减少数据移动 */
        qsort_r_indirect(base, nmemb, size, cmp);
    }
}
```

分析:`qsort` 通过函数指针实现泛型排序,代价是每次比较的间接调用。`qsort_r`(POSIX)与 `qsort_s`(C11 Annex K)增加上下文参数,避免全局变量,提升线程安全。

### 2. libuv 异步 I/O 回调

libuv(Node.js 底层)通过函数指针实现异步 I/O 回调:

```c
/* libuv/include/uv.h (简化) */
typedef void (*uv_alloc_cb)(uv_handle_t *handle, size_t suggested_size, uv_buf_t *buf);
typedef void (*uv_read_cb)(uv_stream_t *stream, ssize_t nread, const uv_buf_t *buf);
typedef void (*uv_write_cb)(uv_write_t *req, int status);

int uv_read_start(uv_stream_t *stream, uv_alloc_cb alloc_cb, uv_read_cb read_cb);
int uv_write(uv_write_t *req, uv_stream_t *handle, const uv_buf_t *bufs,
             unsigned int nbufs, uv_write_cb cb);
```

分析:libuv 的回调设计遵循"注册-触发-回调"模式,I/O 完成后由事件循环调用用户注册的回调。`uv_handle_t`、`uv_req_t` 等结构体内嵌回调函数指针,实现 OOP 风格的对象方法。

### 3. Nginx 模块系统

Nginx 通过函数指针表实现模块化架构:

```c
/* nginx/src/core/ngx_module.h (简化) */
typedef struct ngx_module_s ngx_module_t;

struct ngx_module_s {
    ngx_uint_t            ctx_index;
    ngx_uint_t            index;
    void                 *ctx;  /* 模块上下文(函数指针表) */
    ngx_command_t        *commands;
    ngx_uint_t            type;
    ngx_int_t           (*init_master)(ngx_log_t *log);
    ngx_int_t           (*init_module)(ngx_cycle_t *cycle);
    ngx_int_t           (*init_process)(ngx_cycle_t *cycle);
    void                (*exit_process)(ngx_cycle_t *cycle);
    void                (*exit_master)(ngx_cycle_t *cycle);
};
```

分析:Nginx 模块通过 `ctx` 字段指向模块特定的函数指针表(如 HTTP 模块的 `ngx_http_module_t`),实现模块注册、配置解析、请求处理等钩子。这种设计使 Nginx 可在不修改核心代码的情况下扩展功能。

### 4. Linux VFS file_operations

Linux VFS 通过 `file_operations` 结构体统一不同文件系统的接口:

```c
/* linux/include/linux/fs.h (简化) */
struct file_operations {
    struct module *owner;
    loff_t (*llseek)(struct file *, loff_t, int);
    ssize_t (*read)(struct file *, char __user *, size_t, loff_t *);
    ssize_t (*write)(struct file *, const char __user *, size_t, loff_t *);
    int (*open)(struct inode *, struct file *);
    int (*release)(struct inode *, struct file *);
    int (*flush)(struct file *, fl_owner_t id);
    int (*fsync)(struct file *, loff_t, loff_t, int datasync);
    /* ... */
};
```

分析:每个文件系统(ext4、XFS、NFS、FUSE)实现自己的 `file_operations` 函数指针表,VFS 层通过 `file->f_op->read(...)` 调用具体实现。这是 C 语言面向对象编程的经典范例,通过函数指针表实现多态。

### 5. Redis 命令分发

Redis 通过函数指针表实现命令分发:

```c
/* redis/src/server.h (简化) */
struct redisCommand {
    char *name;
    redisCommandProc *proc;
    int arity;
    char *sflags;
    /* ... */
};

typedef void redisCommandProc(client *c);

/* commands.def (自动生成) */
struct redisCommand redisCommandTable[] = {
    {"get", getCommand, 2, "rF", ...},
    {"set", setCommand, -3, "wm", ...},
    {"del", delCommand, -2, "w", ...},
    /* ... */
};
```

分析:Redis 通过 `redisCommandTable` 数组将命令名映射到处理函数,客户端请求时通过查找表调用对应 `proc`。这种设计使命令扩展只需添加表项,无需修改分发逻辑。

## 习题

### 习题 1:函数指针声明解析

使用 `cdecl` 工具或手动解析以下声明:

```c
int (*fp)(int, int);
int *fps[10];
int (*fps2[10])(int, int);
int (*fparray[5])(int);
int (*(*fpfunc)(int))(int);
```

请用自然语言描述每个声明的含义。

### 习题 2:类型安全的回调框架

设计一个类型安全的回调框架,要求:
- 使用 `typedef` 定义回调类型
- 支持带上下文的回调(避免全局变量)
- 支持错误传播(回调返回错误码,调用者可停止迭代)
- 线程安全(使用 mutex 保护订阅/取消订阅)

### 习题 3:跳转表优化

给定一个计算器,有 6 种操作(add、sub、mul、div、mod、pow)。请:
- 使用 `switch-case` 实现
- 使用函数指针跳转表实现
- 对比两种实现在 `-O2` 下的汇编代码(`gcc -S`)
- 分析性能差异(使用 `perf` 或基准测试)

### 习题 4:状态机实现

使用函数指针表实现一个 TCP 连接状态机,状态包括:`CLOSED`、`LISTEN`、`SYN_SENT`、`SYN_RECEIVED`、`ESTABLISHED`、`FIN_WAIT_1`、`FIN_WAIT_2`、`CLOSE_WAIT`、`CLOSING`、`LAST_ACK`、`TIME_WAIT`。事件包括:`SYN`、`SYN_ACK`、`ACK`、`FIN`、`RST`、`CLOSE`。

### 习题 5:插件系统设计

设计一个图像处理插件系统,要求:
- 定义插件接口(`init`、`process`、`cleanup`)
- 支持运行时注册/卸载插件
- 支持插件链(数据依次通过多个插件)
- 使用 `dlopen`/`dlsym` 实现动态加载 `.so` 插件

### 习题 6:闭包模拟

使用"函数指针 + 上下文结构"模拟以下闭包行为:
- 计数器闭包:每次调用递增并返回当前计数
- 斐波那契闭包:每次调用返回下一个斐波那契数
- 过滤器闭包:带阈值,只处理超过阈值的数据

### 习题 7:qsort_r 兼容性

`qsort_r` 在 GNU、BSD、macOS 上的签名不同:

```c
/* GNU */
void qsort_r(void *base, size_t nmemb, size_t size,
             int (*compar)(const void *, const void *, void *),
             void *arg);

/* BSD/macOS */
void qsort_r(void *base, size_t nmemb, size_t size,
             void *arg,
             int (*compar)(void *, const void *, const void *));
```

请编写一个跨平台兼容的 `my_qsort_r` 包装宏,自动适配不同平台。

### 习题 8:函数指针与虚函数性能对比

编写 C 与 C++ 程序,分别使用函数指针与虚函数实现多态,要求:
- 定义基类(Shape)与派生类(Circle、Rectangle)
- 计算面积(虚函数 `area()`)
- 使用基准测试比较两种实现的性能
- 分析间接调用与虚函数调用在汇编层面的差异

## 参考文献

1. International Organization for Standardization. *ISO/IEC 9899:2018 Information technology — Programming languages — C (C17)*. ISO, 2018. https://www.iso.org/standard/74528.html

2. Kernighan, B. W., and Ritchie, D. M. *The C Programming Language*, 2nd ed. Prentice Hall, 1988. ISBN: 978-0131103627

3. Ritchie, D. M. "The Development of the C Language." *History of Programming Languages*, ACM, 1993, pp. 671-698. DOI: 10.1145/154766.155580. https://doi.org/10.1145/154766.155580

4. Torvalds, L., et al. *Linux Kernel Source: include/linux/fs.h (file_operations)*. https://github.com/torvalds/linux/blob/master/include/linux/fs.h

5. Joyent. *libuv Documentation: Handles and Requests*. http://docs.libuv.org/

6. Sysoev, I. *Nginx Source: src/core/ngx_module.h*. https://github.com/nginx/nginx/blob/master/src/core/ngx_module.h

7. Sanfilippo, S. *Redis Source: src/server.h (redisCommand)*. https://github.com/redis/redis/blob/unstable/src/server.h

8. Hennessy, J. L., and Patterson, D. A. *Computer Architecture: A Quantitative Approach*, 6th ed. Morgan Kaufmann, 2017. ISBN: 978-0128119051

9. Seacord, R. C. *Effective C: An Introduction to Professional C Programming*. No Starch Press, 2020. ISBN: 978-1718501048

10. spinellis, D. "Modern Debugging of C Code with GDB and LLDB." *Communications of the ACM*, vol. 64, no. 7, 2021, pp. 48-57. DOI: 10.1145/3468805. https://doi.org/10.1145/3468805

11. ISO/IEC JTC1/SC22/WG14. *ISO/IEC TS 17961:2013 C Secure Coding Rules*. ISO, 2013.

12. Meyers, S. *Effective C++: 55 Specific Ways to Improve Your Programs and Designs*, 3rd ed. Addison-Wesley, 2005. ISBN: 978-0321334879

## 延伸阅读

- **C17 标准 6.3.2.1 函数到指针转换、6.5.2.2 函数调用**:理解函数指针的标准语义。
- **GCC Manual "Function Attributes"**:`__attribute__((cdecl))`、`__attribute__((stdcall))` 等调用约定属性。
- **System V Application Binary Interface AMD64 Architecture Processor Supplement**:x86-64 调用约定详情。
- **Linux Kernel 文档"Documentation/filesystem/vfs.rst"**:VFS `file_operations` 设计文档。
- **libuv 设计文档"http://docs.libuv.org/en/v1.x/design.html"**:异步 I/O 回调架构。
- **Nginx 文档"http://nginx.org/en/docs/dev/development_guide.html"**:Nginx 模块开发指南。
- **"C Interfaces and Implementations" by David Hanson**:面向对象 C 编程技巧。
- **"Expert C Programming: Deep C Secrets" by Peter van der Linden**:函数指针与 C 语言深层机制。
- **"21st Century C" by Ben Klemens**:现代 C 编程实践,包括回调与函数指针。
- **Cppreference "C language: Functions"**:函数指针与调用的在线参考。
