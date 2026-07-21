---
order: 85
tags:
  - c
  - preprocessor
difficulty: intermediate
title: 预处理器与宏
module: c
category: 'C Basics'
description: C预处理器指令、宏定义与展开、条件编译、文件包含与常见陷阱详解。
author: fanquanpp
updated: '2026-06-13'
related:
  - c/C与汇编交互
  - c/数组详解
  - c/C23与C2y新标准
  - c/指针深度解析
prerequisites:
  - c/概述
---

# 预处理器与宏 (Preprocessor and Macros)

## 第 1 章 引言与学习路径

### 1.1 为什么预处理器是 C 工程师的"必修课"

C 预处理器(Preprocessor)是 C 编译工具链中最古老、最强大,也是最容易滥用的部分。它诞生于 1970 年代,最初只是一个简单的"文本替换工具",但随着 C 语言在系统编程、嵌入式、跨平台开发中的广泛应用,预处理器逐渐演化为支持条件编译、宏元编程、代码生成的"小型图灵完备语言"。

理解预处理器对 C 工程师的重要性体现在以下几个方面:

- **跨平台开发的基石**:通过 `#ifdef`、`#if` 等条件编译指令,Linux 内核、glibc、OpenSSL 这些大型项目能用同一份代码支持数十种硬件架构与操作系统。
- **编译时计算**:通过宏展开,可以在编译期完成常量计算、类型选择、代码生成,实现零运行时开销的抽象。
- **头文件管理**:`#include` 与 Include Guard 是 C 模块化的基础,理解其机制是组织大型项目的必备能力。
- **现代 C 的过渡桥梁**:C23 引入的 `#embed`、`constexpr`、模块化等特性,都直接或间接地与预处理器演进相关。
- **调试与诊断**:`__FILE__`、`__LINE__`、`__func__` 等预定义宏是构建日志、断言、错误报告系统的核心工具。

一个不理解预处理器的 C 工程师,会写出大量重复代码、无法跨平台编译、难以调试,也无法阅读 Linux 内核、SQLite 这类世界级 C 项目的源码。

### 1.2 预处理器的核心挑战

#### 1.2.1 宏不是函数:文本替换的陷阱

宏本质是"文本替换",与函数有根本性区别。最经典的陷阱是参数副作用:

```c
#define SQUARE(x) ((x) * (x))

int i = 3;
int r = SQUARE(i++);  // 展开为 ((i++) * (i++))，行为未定义！
```

这种"看起来像函数,行为却完全不同"的特性,是宏最危险的来源。

#### 1.2.2 宏展开的不可预测性

宏展开遵循复杂的规则(参数预扫描、递归展开、字符串化、Token 粘贴),即使是经验丰富的 C 程序员也常常被坑:

```c
#define CAT(a, b) a##b
#define XCAT(a, b) CAT(a, b)

#define AB "ab"
#define A B
#define B "real"

CAT(A, B)     // 展开为 AB，结果是 "ab"
XCAT(A, B)    // 先展开 A、B，再粘贴，结果是 "real"
```

#### 1.2.3 调试困难

宏展开后,调试器看到的是展开后的代码,与源码行号可能不一致。`-g` 调试信息虽能映射回源码,但宏参数、宏内部逻辑在调试器中几乎不可观察。

#### 1.2.4 命名空间污染

宏是全局的,没有作用域概念。一个 `#define MAX 100` 会影响整个翻译单元中所有 `MAX` 的使用,包括第三方头文件中的代码。这是 C 程序"宏命名冲突"问题的根源。

### 1.3 本文档的目标读者

本文档面向以下读者:

- **C 进阶学习者**:已掌握基本语法,希望理解宏与预处理器的深层机制
- **跨平台开发者**:需要编写在 Linux/Windows/macOS/嵌入式等多平台运行的代码
- **库作者**:设计公开 API 头文件,需要正确的 Include Guard、extern "C"、ABI 兼容
- **代码审计工程师**:分析宏相关的安全漏洞(如 Linux 内核中常见的宏副作用 bug)
- **面试准备者**:预处理器是 C 面试的高频考点,尤其是宏展开、条件编译、X-Macro

### 1.4 学习路径建议

本文档采用 12 章递进式结构:

1. **第 1 章 引言**:建立对预处理器的整体认识
2. **第 2 章 历史演进**:从 cpp 到 C23 预处理器改革
3. **第 3 章 核心概念**:翻译阶段、Token 化、宏展开机制
4. **第 4 章 文件包含**:`#include` 的两种形式与搜索路径
5. **第 5 章 宏定义详解**:`#define`、对象式宏、函数式宏、可变参数宏
6. **第 6 章 条件编译**:`#if`/`#ifdef`/`#ifndef`/`#elif`/`#endif` 与 `defined`
7. **第 7 章 预定义宏与 `#line`/`#error`/`#pragma`**
8. **第 8 章 实战模式**:X-Macro、编译时断言、泛型宏、调试日志宏
9. **第 9 章 常见陷阱**:宏副作用、运算符优先级、分号问题、递归展开限制
10. **第 10 章 高级主题**:C23 `#embed`/`#warning`、模块化与预处理器关系
11. **第 11 章 跨平台与编译器差异**:GCC/Clang/MSVC 行为差异
12. **第 12 章 总结与最佳实践**:工业级项目的宏使用策略

### 1.5 阅读前的预备知识

在开始阅读本文档前,你应该:

- 掌握 C 基本语法(变量、函数、控制流)
- 了解编译流程(预处理 → 编译 → 汇编 → 链接)
- 熟悉 Linux 基本命令(`gcc`、`make`)
- 理解 C 类型系统与指针基础
- 能够在 Linux/Unix 或 Windows 环境下编译运行 C 程序

## 第 2 章 历史演进与设计哲学

### 2.1 早期预处理器的诞生(1970s)

C 语言的创造者 Dennis Ritchie 在 1972 年设计 C 时,预处理器(Preprocessor)是作为一个独立的工具 `cpp`(C Preprocessor)实现的。早期的 `cpp` 非常简单,只支持:

- `#include` 文件包含
- `#define` 简单的文本替换
- `#if`/`#ifdef` 基本条件编译

设计初衷是为了解决三个问题:

1. **头文件复用**:多个 `.c` 文件共享公共声明
2. **平台差异**:不同 Unix 变体(BSD、System V、V7)的系统调用略有不同
3. **编译时配置**:调试版与发布版的代码差异

### 2.2 ANSI C 标准化(1989, C89)

ANSI C(C89)对预处理器进行了首次标准化,引入了:

- **函数式宏**:`#define MAX(a, b) ((a) > (b) ? (a) : (b))`
- **字符串化运算符** `#`:将宏参数转为字符串
- **Token 粘贴运算符** `##`:拼接两个 token
- **预定义宏**:`__FILE__`、`__LINE__`、`__DATE__`、`__TIME__`、`__STDC__`
- **`#error` 指令**:编译时产生错误
- **`#pragma` 指令**:实现定义的编译器指令

C89 还明确了"翻译阶段"(Translation Phases)的概念,将预处理器的行为规范化为 8 个阶段。

### 2.3 C99 的增强

C99(1999)对预处理器做了几项重要增强:

- **可变参数宏**:`__VA_ARGS__` 代表可变参数部分
  ```c
  #define LOG(fmt, ...) printf(fmt, __VA_ARGS__)
  ```
- **`__func__` 标识符**:虽然不是宏,但与 `__FILE__`/`__LINE__` 一起用于诊断
- **`_Pragma` 运算符**:`#pragma` 的运算符形式,可嵌入宏中
  ```c
  #define PACKED _Pragma("pack(push, 1)")
  ```
- **预定义标识符** `__STDC_VERSION__`:定义 C 标准版本(如 `199901L`)

### 2.4 C11 与 C17 的微调

C11(2011)与 C17(2018)对预处理器改动较小:

- C11 新增 `__STDC_HOSTED__`(是否为宿主环境)、`_Generic`(虽然不是预处理器特性,但常与宏结合)
- C17 主要是 bug 修复与澄清,无重大预处理器变更

### 2.5 C23 的预处理器改革

C23(2023)对预处理器进行了重大改革,引入多项新特性:

#### 2.5.1 `#embed` 指令

将二进制文件嵌入源码,替代传统的 `xxd -i` 工具:

```c
const unsigned char icon[] = {
#embed "icon.png"
};
```

这避免了将二进制文件转换为 C 数组源码的繁琐步骤,也减小了源码体积。

#### 2.5.2 `#warning` 指令

产生编译时警告(非错误):

```c
#if defined(_WIN32) && !defined(_WIN32_WINNT)
#warning "_WIN32_WINNT 未定义，使用默认值"
#define _WIN32_WINNT 0x0601
#endif
```

#### 2.5.3 `__has_include` 与 `__has_embed` 测试

```c
#if __has_include(<stdatomic.h>)
#include <stdatomic.h>
#else
#error "需要 C11 或更高版本"
#endif
```

#### 2.5.4 `__VA_OPT__`

更优雅地处理可变参数宏的空参数情况,替代 GCC 扩展 `##__VA_ARGS__`:

```c
#define LOG(fmt, ...) printf(fmt __VA_OPT__(,) __VA_ARGS__)

LOG("hello");           // printf("hello")
LOG("value=%d", x);     // printf("value=%d", x)
```

#### 2.5.5 `elifdef` 与 `elifndef`

```c
#ifdef PLATFORM_LINUX
// ...
#elifdef PLATFORM_WINDOWS
// ...
#elifndef PLATFORM_MACOS
// ...
#endif
```

### 2.6 现代预处理器的哲学

现代 C 预处理器体现了以下设计哲学:

#### 2.6.1 编译时计算优先

通过宏展开,尽可能多地将计算与决策移到编译期,实现零运行时开销:

```c
#define BIT(n) (1ULL << (n))
#define FLAG_A BIT(0)
#define FLAG_B BIT(1)
#define FLAGS_ALL (FLAG_A | FLAG_B)
```

#### 2.6.2 渐进式抽象

宏提供了从"简单文本替换"到"复杂元编程"的渐进抽象层次:

- 简单常量:`#define PI 3.14`
- 函数式宏:`#define MAX(a, b) ((a) > (b) ? (a) : (b))`
- X-Macro:通过 `#include` 同一头文件多次,每次定义不同的宏
- 元编程:用宏生成重复代码(如状态机、访问器)

#### 2.6.3 显式优于隐式

宏的"显式"特性使其在以下场景优于 C 语言本身的特性:

- 跨平台代码用 `#ifdef` 显式区分,而非运行时 `if`
- 调试代码用 `#ifdef DEBUG` 显式开关,而非运行时变量
- 编译时断言用 `#error` 显式失败,而非运行时 `assert`

## 第 3 章 核心概念与术语体系

### 3.1 翻译阶段(Translation Phases)

C 标准将源代码到可执行文件的整个过程分为 8 个翻译阶段,预处理器主要在前 4 个阶段工作:

| 阶段 | 主要工作                                   |
| ---- | ------------------------------------------ |
| 1    | 物理源字符映射到源字符集(如 UTF-8 转换) |
| 2    | 反斜杠-换行符(`\`+换行)拼接为逻辑行     |
| 3    | 注释替换为单个空格,Token 化               |
| 4    | 执行预处理指令(`#include`/`#define`/`#if`)|
| 5    | 字符常量与字符串字面量转义序列处理         |
| 6    | 相邻字符串字面量拼接                       |
| 7    | 编译(语法分析、语义分析、生成汇编)       |
| 8    | 链接(合并目标文件、解析符号引用)         |

**关键理解**:预处理器在第 4 阶段运行,此时注释已被替换为空格,字符串字面量尚未处理转义序列。这意味着:

```c
#define MSG "Hello\n"
printf(MSG);   // 在第 4 阶段，MSG 被替换为 "Hello\n"
               // 在第 5 阶段，\n 才被解释为换行符
```

### 3.2 Token 与 Token 化

预处理器将源代码分解为 Token(词法单元),Token 分为以下几类:

- **标识符**(Identifier):变量名、函数名、宏名
- **预处理数字**(Preprocessing Number):`123`、`3.14`、`0xFF`
- **字符常量**(Character Constant):`'a'`、`'\n'`
- **字符串字面量**(String Literal):`"hello"`
- **运算符与标点**(Operator/Punctuator):`+`、`-`、`(`、`)`、`{`、`}`
- **其他**:头文件名(`<stdio.h>`)、预处理指令(`#include`)

Token 化的细节:

```c
int x = 1+2;   // Token: int, x, =, 1, +, 2, ;
int y = 1 + 2; // Token: int, x, =, 1, +, 2, ;  (空格不影响 Token 化)
```

但以下情况有差异:

```c
#define A B
#define B 1
A        // 经过两轮展开，最终为 1
```

### 3.3 宏的展开机制

宏展开是预处理器最复杂的部分,其规则如下:

#### 3.3.1 对象式宏(Object-like Macro)

```c
#define PI 3.14159
double area = PI * r * r;  // 展开为 3.14159 * r * r
```

#### 3.3.2 函数式宏(Function-like Macro)

```c
#define SQUARE(x) ((x) * (x))
int y = SQUARE(3);  // 展开为 ((3) * (3))
```

#### 3.3.3 参数预扫描(Argument Prescan)

函数式宏的参数在替换前会先完全展开:

```c
#define A B
#define B 1
#define X(a) a
X(A)   // 先展开 A 为 B，B 为 1，再替换 a，结果为 1
```

#### 3.3.4 递归展开的限制

宏展开时,若宏名在自身展开结果中出现,不会被再次展开:

```c
#define A B
#define B A
A    // 展开为 B，B 又展开为 A，A 不会再展开，最终结果为 A
```

这被称为"蓝色绘制"(Blue Paint)规则,防止无限递归。

### 3.4 字符串化与 Token 粘贴

#### 3.4.1 字符串化 `#`

```c
#define STR(x) #x
STR(hello world)    // "hello world"
STR(hello \n world) // "hello \\n world" (反斜杠被转义)
```

注意:字符串化会保留参数中的空白为一个空格,并对特殊字符转义。

#### 3.4.2 Token 粘贴 `##`

```c
#define CAT(a, b) a##b
CAT(foo, bar)    // foobar
CAT(var, 1)      // var1
```

`##` 将两个 Token 粘接成一个新 Token,如果结果不是合法 Token,则是未定义行为。

### 3.5 `#` 与 `##` 的求值顺序

```c
#define A B
#define B 1

#define STR(x) #x
#define XSTR(x) STR(x)

STR(A)    // "A"   (# 先于参数展开)
XSTR(A)   // "1"   (通过 XSTR，参数先展开再字符串化)
```

这是宏元编程的关键技巧:通过中间宏控制求值顺序。

### 3.6 条件编译的求值规则

`#if` 表达式遵循特殊规则:

- 标识符(包括宏名)被替换为 `0`(若未定义)或其展开后的值
- `defined(MACRO)` 返回 0 或 1
- 表达式求值使用 `intmax_t`/`uintmax_t`
- 不允许赋值、函数调用、`sizeof`

```c
#define VERSION 3
#if VERSION >= 3 && defined(DEBUG)
// ...
#endif
```

### 3.7 预处理器与 C 语言的关系

预处理器不是 C 语言本身,它是一个独立的"语言":

- 预处理器不理解 C 语法,只做 Token 级处理
- 预处理器不知道类型、作用域、函数
- 预处理器的输出(预处理后的源码)才是 C 编译器的输入

可以用 `gcc -E` 查看预处理器的输出:

```bash
gcc -E hello.c -o hello.i
```

`hello.i` 是预处理后的源码,通常很大(因为包含了头文件展开),但能让你看到预处理器的实际工作结果。

## 第 4 章 文件包含 (`#include`)

### 4.1 `#include` 的两种形式

```c
#include <stdio.h>      // 尖括号：系统目录搜索
#include "myheader.h"   // 双引号：当前目录优先
#include "utils/math.h" // 相对路径
```

#### 4.1.1 搜索路径规则

**尖括号 `<...>`**:

1. 仅在系统/include 路径中搜索
2. 路径由编译器选项 `-I` 指定,以及内置路径(如 `/usr/include`)

**双引号 `"..."`**:

1. 先在当前文件所在目录搜索
2. 若找不到,再按尖括号规则搜索

可以用 `-I` 显式添加搜索路径:

```bash
gcc -I./include -I./third_party/include hello.c -o hello
```

#### 4.1.2 系统头文件 vs 用户头文件

约定俗成:

- `<...>`:系统头文件、第三方库头文件
- `"..."`:项目自身头文件

但技术上,`#include <myheader.h>` 也是合法的,只要 `-I` 路径能找到它。

### 4.2 头文件保护(Include Guard)

头文件被多次包含会导致重复定义错误。解决方法是使用 Include Guard:

#### 4.2.1 传统宏 Include Guard

```c
#ifndef MYHEADER_H
#define MYHEADER_H

/* 头文件内容 */

#endif /* MYHEADER_H */
```

工作原理:第一次包含时,`MYHEADER_H` 未定义,执行 `#define` 并处理内容;再次包含时,`MYHEADER_H` 已定义,跳过内容。

#### 4.2.2 `#pragma once`

```c
#pragma once

/* 头文件内容 */
```

GCC、Clang、MSVC 等主流编译器都支持。优点:

- 更简洁
- 编译器自动管理,无需起宏名
- 编译速度更快(无需读取整个文件就能跳过)

缺点:

- 非标准(C 标准未定义)
- 在某些特殊场景(如通过符号链接包含同一文件)可能失败

#### 4.2.3 选择建议

- **新项目**:优先使用 `#pragma once`,简洁高效
- **跨平台库**:同时使用两种(兼容性最好):
  ```c
  #pragma once
  #ifndef MYHEADER_H
  #define MYHEADER_H
  /* ... */
  #endif
  ```
- **Linux 内核风格**:必须用传统 Include Guard(内核编码规范要求)

### 4.3 Include Guard 的命名规范

宏名冲突会导致难以排查的问题。推荐命名规范:

```c
/* 项目名_模块名_文件名_H */
#ifndef FOO_BAR_UTILS_H
#define FOO_BAR_UTILS_H
/* ... */
#endif
```

避免以下命名:

- `UTILS_H`(太通用,易冲突)
- `_MYHEADER_H`(下划线开头保留给实现)
- `MACRO_H`(过于通用)

### 4.4 头文件的内容组织

一个设计良好的头文件应包含:

```c
/* mymodule.h */

#ifndef MYMODULE_H
#define MYMODULE_H

/* 1. 必要的前置包含 */
#include <stddef.h>  /* size_t */

/* 2. 宏定义 */
#define MYMODULE_VERSION_MAJOR 1
#define MYMODULE_VERSION_MINOR 0
#define MYMODULE_VERSION_STR   "1.0"

/* 3. 类型定义 */
typedef enum {
    MYMODULE_OK = 0,
    MYMODULE_ERROR_INVALID_ARG,
    MYMODULE_ERROR_NOMEM,
    MYMODULE_ERROR_IO
} MyModuleStatus;

typedef struct MyModule MyModule;  /* 不透明指针模式 */

/* 4. 函数声明 */
MyModule *mymodule_create(void);
void mymodule_destroy(MyModule *mod);
MyModuleStatus mymodule_process(MyModule *mod, const char *input);

/* 5. 内联函数(可选) */
static inline size_t mymodule_version(void) {
    return (MYMODULE_VERSION_MAJOR << 16) | MYMODULE_VERSION_MINOR;
}

#endif /* MYMODULE_H */
```

### 4.5 头文件的自包含原则

每个头文件应能独立编译,即:只包含本头文件就能通过编译。错误示例:

```c
/* bad.h */
#ifndef BAD_H
#define BAD_H

typedef struct {
    size_t len;  /* 错误：未包含 <stddef.h>，使用 size_t 会失败 */
} BadStruct;
#endif
```

正确做法:

```c
/* good.h */
#ifndef GOOD_H
#define GOOD_H

#include <stddef.h>  /* 显式包含，确保 size_t 可用 */

typedef struct {
    size_t len;
} GoodStruct;
#endif
```

### 4.6 前向声明 vs 包含

有时不需要完整类型,只需前向声明即可,这能加快编译速度:

```c
/* point.h */
#ifndef POINT_H
#define POINT_H
typedef struct Point Point;
#endif

/* circle.h */
#ifndef CIRCLE_H
#define CIRCLE_H

#include "point.h"  /* 只需要 Point 的前向声明 */

typedef struct {
    Point *center;  /* 指针，不需要完整类型 */
    double radius;
} Circle;
#endif
```

只有当需要完整类型(如访问成员、栈上分配)时才包含完整定义。

### 4.7 C++ 兼容性:extern "C"

若头文件可能被 C++ 代码包含,应使用 `extern "C"` 包裹:

```c
#ifdef __cplusplus
extern "C" {
#endif

/* 函数声明 */
void my_function(int x);

#ifdef __cplusplus
}
#endif
```

这告诉 C++ 编译器:这些函数使用 C 链接(不做 name mangling),以便 C 代码能调用。

## 第 5 章 宏定义详解 (`#define`)

### 5.1 无参宏(对象式宏)

```c
#include <stdio.h>

/* 基本常量定义 */
#define PI 3.14159265
#define MAX_SIZE 100
#define NEWLINE '\n'
#define GREETING "Hello, World!"

/* 使用宏 */
int main(void) {
    double area = PI * 5 * 5;
    int arr[MAX_SIZE];
    printf("Area = %f%c", area, NEWLINE);
    printf("%s\n", GREETING);
    return 0;
}
```

注意事项:

- 宏定义末尾**不要加分号**,分号会成为替换内容的一部分
- 宏名通常全大写,以区分变量名
- 宏定义不分配内存,只是文本替换

### 5.2 多行宏:续行符 `\`

```c
#define LONG_MACRO(x, y) \
    do { \
        int tmp = (x); \
        (x) = (y); \
        (y) = tmp; \
    } while (0)
```

注意:

- `\` 必须是行尾最后一个字符(不能有空格)
- 续行后仍是同一逻辑行

### 5.3 带参宏(函数式宏)

```c
#include <stdio.h>

/* 基本带参宏 */
#define SQUARE(x) ((x) * (x))
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define MIN(a, b) ((a) < (b) ? (a) : (b))
#define ABS(x) ((x) >= 0 ? (x) : -(x))

/* 多语句宏 - 使用 do-while(0) */
#define SWAP(a, b) do { \
    typeof(a) _temp = (a); \
    (a) = (b); \
    (b) = _temp; \
} while (0)

/* 字符串化与拼接 */
#define STR(x) #x
#define CONCAT(a, b) a##b

int main(void) {
    int a = 5, b = 10;
    printf("SQUARE(5) = %d\n", SQUARE(5));      /* 25 */
    printf("MAX(3, 7) = %d\n", MAX(3, 7));      /* 7 */
    printf("ABS(-3) = %d\n", ABS(-3));           /* 3 */

    SWAP(a, b);
    printf("After swap: a=%d, b=%d\n", a, b);   /* a=10, b=5 */

    printf("%s\n", STR(hello world));            /* "hello world" */
    int CONCAT(var, 1) = 42;                     /* 等价于 int var1 = 42; */
    printf("var1 = %d\n", var1);                 /* 42 */

    return 0;
}
```

### 5.4 宏的括号陷阱

宏定义中括号的使用至关重要:

```c
/* 错误示例：缺少括号 */
#define SQUARE_BAD(x) x * x
SQUARE_BAD(3 + 1)    /* 展开为 3 + 1 * 3 + 1 = 7，而非 16 */

/* 正确写法 */
#define SQUARE_GOOD(x) ((x) * (x))
SQUARE_GOOD(3 + 1)   /* 展开为 ((3 + 1) * (3 + 1)) = 16 */

/* 另一个陷阱：参数有副作用 */
#define SQUARE_SIDE(x) ((x) * (x))
int i = 3;
SQUARE_SIDE(i++)     /* 展开为 ((i++) * (i++))，行为未定义！ */
```

宏定义括号规则:

1. **整个宏体用括号包围**,防止与外部运算符结合错误
2. **每个参数出现的地方都用括号包围**,防止参数本身是表达式时出错
3. 避免在宏参数中使用自增/自减运算符

### 5.5 可变参数宏(`__VA_ARGS__`)

C99 引入了可变参数宏:

```c
#include <stdio.h>

/* __VA_ARGS__ 代表可变参数部分 */
#define DEBUG_LOG(fmt, ...) \
    fprintf(stderr, "[DEBUG] %s:%d: " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)

int main(void) {
    int value = 42;
    DEBUG_LOG("value = %d", value);  /* [DEBUG] test.c:9: value = 42 */
    return 0;
}
```

#### 5.5.1 GCC 扩展:`##__VA_ARGS__`

C99 要求 `__VA_ARGS__` 至少有一个参数,否则编译失败。GCC 引入了 `##__VA_ARGS__` 扩展,允许可变参数为空:

```c
#define LOG(fmt, ...) \
    printf("[LOG] " fmt "\n", ##__VA_ARGS__)

LOG("simple message");    /* [LOG] simple message（无额外参数） */
LOG("value=%d", x);       /* [LOG] value=%d, x */
```

#### 5.5.2 C23 的 `__VA_OPT__`

C23 引入了 `__VA_OPT__`,更优雅地处理空参数情况:

```c
#define LOG(fmt, ...) \
    printf("[LOG] " fmt "\VA_OPT__(,) __VA_ARGS__")

LOG("hello");           /* printf("[LOG] " "hello" "\n") */
LOG("value=%d", x);     /* printf("[LOG] " "value=%d" "\n", x) */
```

`__VA_OPT__(X)` 在可变参数非空时展开为 `X`,空时展开为空。

### 5.6 预定义运算符:`#`、`##`、`_Pragma`

#### 5.6.1 `#` 字符串化

```c
#define STR(x) #x
#define XSTR(x) STR(x)

#define VERSION 42
STR(VERSION)    /* "VERSION" */
XSTR(VERSION)   /* "42" (先展开 VERSION，再字符串化) */
```

#### 5.6.2 `##` Token 粘贴

```c
#define CAT(a, b) a##b
#define XCAT(a, b) CAT(a, b)

#define PREFIX foo
CAT(PREFIX, _bar)   /* PREFIX_bar (PREFIX 未先展开) */
XCAT(PREFIX, _bar)  /* foo_bar (PREFIX 先展开为 foo，再粘贴) */
```

#### 5.6.3 `_Pragma` 运算符

C99 引入,允许在宏中使用 `#pragma`:

```c
#define PACKED_STRUCT(name, body) \
    _Pragma("pack(push, 1)") \
    struct name body; \
    _Pragma("pack(pop)")

PACKED_STRUCT(MyStruct, {
    char a;
    int b;
});
```

### 5.7 宏的取消:`#undef`

```c
#define DEBUG 1
/* ... */
#undef DEBUG
/* 之后 DEBUG 不再定义 */
```

`#undef` 用于:

- 临时修改宏定义
- 防止宏污染后续代码
- 配合 X-Macro 技巧

### 5.8 宏的作用域

宏从 `#define` 处生效,直到 `#undef` 或文件结束。宏没有作用域概念,会"穿透"函数、结构体等:

```c
#define MAX 100

void f(void) {
    int arr[MAX];  /* MAX 在此处展开 */
}

void g(void) {
    /* 即使在另一个函数中，MAX 仍然有效 */
    int x = MAX;
}
```

这就是为什么宏命名要特别小心,避免与变量、函数名冲突。

## 第 6 章 条件编译

### 6.1 基本条件编译指令

```c
#define VERSION 3

#if VERSION == 1
    const char *server = "v1.example.com";
#elif VERSION == 2
    const char *server = "v2.example.com";
#elif VERSION == 3
    const char *server = "v3.example.com";
#else
    const char *server = "default.example.com";
#endif

/* #ifdef / #ifndef - 检查宏是否定义 */
#ifdef DEBUG
    #define LOG(msg) printf("[DEBUG] %s\n", msg)
#else
    #define LOG(msg) ((void)0)
#endif

#ifndef BUFFER_SIZE
    #define BUFFER_SIZE 1024
#endif
```

### 6.2 `defined` 运算符

`defined` 用于在 `#if` 中检查宏是否定义:

```c
#if defined(DEBUG) && defined(VERBOSE)
    /* 调试和详细模式都启用时的代码 */
    #define DUMP_STATE(state) dump_full_state(state)
#elif defined(DEBUG)
    /* 仅调试模式 */
    #define DUMP_STATE(state) dump_summary(state)
#else
    #define DUMP_STATE(state) ((void)0)
#endif

/* 多条件组合 */
#if defined(__linux__)
    #define PLATFORM "Linux"
#elif defined(_WIN32)
    #define PLATFORM "Windows"
#elif defined(__APPLE__)
    #define PLATFORM "macOS"
#else
    #define PLATFORM "Unknown"
#endif
```

`defined(MACRO)` 等价于 `#ifdef MACRO`,但 `defined` 可以组合在复杂表达式中,而 `#ifdef` 只能单独使用。

### 6.3 `#if` 表达式的求值规则

`#if` 表达式遵循特殊规则:

- 所有标识符(包括宏名)被替换为 `0`(若未定义)或其展开后的值
- `defined(MACRO)` 在替换前求值,返回 0 或 1
- 表达式求值使用 `intmax_t`/`uintmax_t`
- 不允许赋值、函数调用、`sizeof`

```c
#define VERSION 3
#if VERSION >= 3 && defined(DEBUG)
/* ... */
#endif

#if !defined(NDEBUG) && (defined(__GNUC__) || defined(__clang__))
/* ... */
#endif
```

### 6.4 C23 的 `#elifdef` 与 `#elifndef`

C23 引入了更简洁的语法:

```c
#ifdef PLATFORM_LINUX
/* ... */
#elifdef PLATFORM_WINDOWS   /* 等价于 #elif defined(PLATFORM_WINDOWS) */
/* ... */
#elifndef PLATFORM_MACOS    /* 等价于 #elif !defined(PLATFORM_MACOS) */
/* ... */
#endif
```

### 6.5 条件编译的实际应用

#### 6.5.1 跨平台代码

```c
#ifdef _WIN32
    #include <windows.h>
    #define SLEEP(ms) Sleep(ms)
    #define PATH_SEPARATOR '\\'
    #define DLL_EXPORT __declspec(dllexport)
#else
    #include <unistd.h>
    #define SLEEP(ms) usleep((ms) * 1000)
    #define PATH_SEPARATOR '/'
    #define DLL_EXPORT __attribute__((visibility("default")))
#endif
```

#### 6.5.2 调试与发布版本

```c
#ifdef NDEBUG
    /* 发布版本：assert 变为空操作 */
    #define assert(condition) ((void)0)
#else
    /* 调试版本：assert 检查条件 */
    #define assert(condition) \
        do { \
            if (!(condition)) { \
                fprintf(stderr, "Assertion failed: %s, file %s, line %d\n", \
                    #condition, __FILE__, __LINE__); \
                abort(); \
            } \
        } while (0)
#endif
```

#### 6.5.3 功能开关

```c
#define FEATURE_NETWORK 1
#define FEATURE_CRYPTO  1

#if FEATURE_NETWORK
    void init_network(void);
    void send_data(const char *data);
#endif

#if FEATURE_CRYPTO
    void encrypt_data(char *data, const char *key);
#endif
```

#### 6.5.4 C 标准版本检测

```c
#if defined(__STDC_VERSION__)
    #if __STDC_VERSION__ >= 202311L
        #define C_VERSION 23
    #elif __STDC_VERSION__ >= 201710L
        #define C_VERSION 17
    #elif __STDC_VERSION__ >= 201112L
        #define C_VERSION 11
    #elif __STDC_VERSION__ >= 199901L
        #define C_VERSION 99
    #else
        #define C_VERSION 90
    #endif
#else
    #define C_VERSION 90  /* K&R 或 pre-C89 */
#endif
```

#### 6.5.5 编译器检测

```c
#if defined(__clang__)
    #define COMPILER "Clang"
    #define COMPILER_VERSION __clang_version__
#elif defined(__GNUC__)
    #define COMPILER "GCC"
    #define COMPILER_VERSION __VERSION__
#elif defined(_MSC_VER)
    #define COMPILER "MSVC"
    #define COMPILER_VERSION _MSC_VER
#else
    #define COMPILER "Unknown"
    #define COMPILER_VERSION "Unknown"
#endif
```

#### 6.5.6 架构检测

```c
#if defined(__x86_64__) || defined(_M_X64)
    #define ARCH "x86_64"
#elif defined(__i386__) || defined(_M_IX86)
    #define ARCH "x86"
#elif defined(__aarch64__) || defined(_M_ARM64)
    #define ARCH "arm64"
#elif defined(__arm__) || defined(_M_ARM)
    #define ARCH "arm"
#elif defined(__riscv)
    #define ARCH "riscv"
#else
    #define ARCH "unknown"
#endif
```

### 6.6 条件编译的最佳实践

#### 6.6.1 使用 `defined()` 而非 `#ifdef`

```c
/* 不推荐：无法组合多个条件 */
#ifdef DEBUG
#ifdef VERBOSE
/* ... */
#endif
#endif

/* 推荐：可以组合 */
#if defined(DEBUG) && defined(VERBOSE)
/* ... */
#endif
```

#### 6.6.2 提供默认值

```c
#ifndef BUFFER_SIZE
    #define BUFFER_SIZE 1024
#endif
```

#### 6.6.3 注释 `#endif`

```c
#ifdef DEBUG
    /* ... 长段代码 ... */
#endif /* DEBUG */

#if defined(_WIN32)
    /* ... */
#elif defined(__linux__)
    /* ... */
#endif /* 平台判断 */
```

#### 6.6.4 避免深层嵌套

```c
/* 不推荐：嵌套过深 */
#ifdef A
    #ifdef B
        #ifdef C
            /* ... */
        #endif
    #endif
#endif

/* 推荐：合并条件 */
#if defined(A) && defined(B) && defined(C)
    /* ... */
#endif
```

## 第 7 章 预定义宏、`#line`、`#error`、`#pragma`

### 7.1 标准预定义宏

C 标准定义了以下必需的预定义宏:

```c
#include <stdio.h>

int main(void) {
    printf("源文件名: %s\n", __FILE__);
    printf("当前行号: %d\n", __LINE__);
    printf("编译日期: %s\n", __DATE__);       /* "Jun 13 2026" */
    printf("编译时间: %s\n", __TIME__);       /* "14:30:00" */
    printf("C标准版本: %ld\n", __STDC_VERSION__);  /* 201710L (C17) */
    printf("是否宿主环境: %d\n", __STDC_HOSTED__); /* 1 = 宿主，0 = 独立 */

    /* __func__ 是 C99 关键字（不是宏），返回当前函数名 */
    printf("当前函数: %s\n", __func__);

    return 0;
}
```

### 7.2 编译器扩展预定义宏

#### 7.2.1 GCC/Clang

```c
#ifdef __GNUC__
    printf("GCC版本: %d.%d.%d\n",
        __GNUC__, __GNUC_MINOR__, __GNUC_PATCHLEVEL__);
#endif

#ifdef __clang__
    printf("Clang版本: %d.%d.%d\n",
        __clang_major__, __clang_minor__, __clang_patchlevel__);
#endif

/* 平台检测 */
#ifdef __linux__
    printf("Linux\n");
#endif

#ifdef __APPLE__
    printf("macOS\n");
#endif

#ifdef __FreeBSD__
    printf("FreeBSD\n");
#endif
```

#### 7.2.2 MSVC

```c
#ifdef _MSC_VER
    /* _MSC_VER 编码版本号，如 1938 表示 VS 17.8 */
    printf("MSVC版本: %d\n", _MSC_VER);

    #if _MSC_VER >= 1938
        /* VS 2022 17.8+ */
    #endif
#endif

#ifdef _WIN32
    printf("Windows (32/64位)\n");
#endif

#ifdef _WIN64
    printf("Windows 64位\n");
#endif
```

### 7.3 `__STDC_VERSION__` 的值

| 标准 | `__STDC_VERSION__` |
| ---- | ------------------ |
| C89/C90 | 未定义(或 `199409L` for C94) |
| C94 (C90 AMD1) | `199409L` |
| C99 | `199901L` |
| C11 | `201112L` |
| C17/C18 | `201710L` |
| C23 | `202311L` |

### 7.4 `#line` 指令

修改编译器内部记录的行号和文件名,常用于代码生成器:

```c
#line 100 "generated_code.c"
/* 此处之后，__LINE__ 从 100 开始，__FILE__ 为 "generated_code.c" */
int x = 0;  /* __LINE__ = 101 */
```

应用场景:

- Lex/Yacc 生成的代码,通过 `#line` 让错误指向原始 `.l`/`.y` 文件
- 模板代码生成器
- 调试宏展开

### 7.5 `#error` 指令

编译时产生错误,终止编译:

```c
#if !defined(__STDC_VERSION__) || __STDC_VERSION__ < 201112L
#error "需要 C11 或更高版本支持"
#endif

#ifdef _WIN32
    #ifdef __GNUC__
        /* MinGW */
    #elif defined(_MSC_VER)
        /* MSVC */
    #else
        #error "不支持的 Windows 编译器"
    #endif
#endif
```

### 7.6 C23 的 `#warning` 指令

产生警告但不终止编译:

```c
#if defined(_WIN32) && !defined(_WIN32_WINNT)
#warning "_WIN32_WINNT 未定义，使用默认值 0x0601"
#define _WIN32_WINNT 0x0601
#endif
```

C23 之前,GCC/Clang 已通过扩展支持 `#warning`。

### 7.7 `#pragma` 指令

`#pragma` 是实现定义的编译器指令,不同编译器支持不同:

#### 7.7.1 结构体对齐

```c
/* GCC/Clang/MSVC 通用 */
#pragma pack(push, 1)    /* 保存当前对齐，设为 1 字节对齐 */
struct PackedData {
    char a;
    int b;
    short c;
};
#pragma pack(pop)        /* 恢复之前的对齐 */

/* GCC/Clang 特有 */
struct __attribute__((packed)) PackedData2 {
    char a;
    int b;
    short c;
};
```

#### 7.7.2 警告控制

```c
/* MSVC */
#pragma warning(disable: 4996)  /* 禁用"不安全函数"警告 */
#pragma warning(push)
#pragma warning(error: 4267)    /* 将 4267 警告视为错误 */
/* ... */
#pragma warning(pop)

/* GCC/Clang */
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-parameter"
void callback(int event, void *data) {
    (void)data;
}
#pragma GCC diagnostic pop
```

#### 7.7.3 优化控制

```c
#pragma GCC optimize("O3")      /* GCC 优化级别 */
#pragma GCC push_options
#pragma GCC optimize("O0")
/* 此处不优化 */
void debug_function(void) {
    /* ... */
}
#pragma GCC pop_options
```

#### 7.7.4 MSVC 特有

```c
#pragma comment(lib, "ws2_32")        /* 自动链接库 */
#pragma once                           /* Include Guard */
#pragma region /* 折叠区域 */          /* IDE 折叠 */
/* ... */
#pragma endregion
```

### 7.8 `_Pragma` 运算符

C99 引入,允许在宏中使用 pragma:

```c
#define PACKED_STRUCT(name, body) \
    _Pragma("pack(push, 1)") \
    struct name body; \
    _Pragma("pack(pop)")

PACKED_STRUCT(MyStruct, {
    char a;
    int b;
});

/* 等价于：
#pragma pack(push, 1)
struct MyStruct { char a; int b; };
#pragma pack(pop)
*/
```

## 第 8 章 实战模式

### 8.1 X-Macro 技巧

X-Macro 是一种强大的代码生成模式,通过重复包含同一头文件,每次定义不同的宏:

#### 8.1.1 基本模式

```c
/* colors.x - X-Macro 数据文件 */
COLOR(RED,   "#FF0000")
COLOR(GREEN, "#00FF00")
COLOR(BLUE,  "#0000FF")
COLOR(WHITE, "#FFFFFF")
COLOR(BLACK, "#000000")
```

```c
/* 使用 X-Macro 生成枚举 */
#define COLOR(name, hex) name,
enum Color {
#include "colors.x"
    COLOR_COUNT  /* 自动计算颜色数量 */
};
#undef COLOR

/* 生成字符串数组 */
#define COLOR(name, hex) hex,
const char *color_hex[] = {
#include "colors.x"
};
#undef COLOR

/* 生成打印函数 */
#define COLOR(name, hex) case name: return #name;
const char *color_name(enum Color c) {
    switch (c) {
#include "colors.x"
        default: return "UNKNOWN";
    }
}
#undef COLOR
```

#### 8.1.2 X-Macro 的优势

- **单一数据源**:新增颜色只需修改 `colors.x`,所有相关代码自动更新
- **编译时生成**:零运行时开销
- **类型安全**:枚举由编译器检查
- **可维护性**:避免数据散落在多处

#### 8.1.3 应用场景

- 错误码定义
- 事件类型枚举
- SQL 表结构
- 配置项定义
- 状态机状态

### 8.2 编译时断言

C11 之前用宏实现编译时断言:

```c
/* C11 之前的编译时断言 */
#define STATIC_ASSERT(cond, name) \
    typedef char static_assert_##name[(cond) ? 1 : -1]

STATIC_ASSERT(sizeof(int) == 4, int_size);
STATIC_ASSERT(sizeof(void*) == 8, pointer_size);

/* C11 引入 _Static_assert */
_Static_assert(sizeof(int) == 4, "int must be 4 bytes");
_Static_assert(sizeof(void*) == 8, "64-bit platform required");

/* C23 进一步引入 static_assert 关键字（无需下划线） */
static_assert(sizeof(int) == 4, "int must be 4 bytes");
```

### 8.3 泛型选择与宏

C11 引入 `_Generic`,可结合宏实现类型泛型:

```c
#include <math.h>

#define cbrt(X) _Generic((X), \
    long double: cbrtl, \
    default: cbrt, \
    float: cbrtf \
)(X)

/* 使用 */
double d = cbrt(8.0);       /* 调用 cbrt */
float f = cbrt(8.0f);       /* 调用 cbrtf */
long double ld = cbrt(8.0L);/* 调用 cbrtl */
```

### 8.4 调试日志宏

```c
#include <stdio.h>
#include <stdarg.h>

/* 日志级别 */
#define LOG_LEVEL_DEBUG 0
#define LOG_LEVEL_INFO  1
#define LOG_LEVEL_WARN  2
#define LOG_LEVEL_ERROR 3
#define LOG_LEVEL_FATAL 4

/* 当前日志级别（可通过 -DCURRENT_LOG_LEVEL=LOG_LEVEL_INFO 修改） */
#ifndef CURRENT_LOG_LEVEL
    #define CURRENT_LOG_LEVEL LOG_LEVEL_INFO
#endif

/* 通用日志宏 */
#define LOG(level, tag, fmt, ...) \
    do { \
        if ((level) >= CURRENT_LOG_LEVEL) { \
            fprintf(stderr, "[%s] %s:%d: " fmt "\n", \
                    (tag), __FILE__, __LINE__, ##__VA_ARGS__); \
        } \
    } while (0)

/* 具体级别宏 */
#define LOG_DEBUG(fmt, ...) LOG(LOG_LEVEL_DEBUG, "DEBUG", fmt, ##__VA_ARGS__)
#define LOG_INFO(fmt, ...)  LOG(LOG_LEVEL_INFO,  "INFO",  fmt, ##__VA_ARGS__)
#define LOG_WARN(fmt, ...)  LOG(LOG_LEVEL_WARN,  "WARN",  fmt, ##__VA_ARGS__)
#define LOG_ERROR(fmt, ...) LOG(LOG_LEVEL_ERROR, "ERROR", fmt, ##__VA_ARGS__)
#define LOG_FATAL(fmt, ...) LOG(LOG_LEVEL_FATAL, "FATAL", fmt, ##__VA_ARGS__)

int main(void) {
    LOG_DEBUG("This is debug message");  /* 默认级别 INFO，不会输出 */
    LOG_INFO("Hello, %s", "world");      /* 输出 */
    LOG_ERROR("Error code: %d", 42);     /* 输出 */
    return 0;
}
```

### 8.5 容器of 宏(Linux 内核经典)

`container_of` 是 Linux 内核中最著名的宏之一,从成员指针反推容器结构体指针:

```c
#include <stddef.h>

#define container_of(ptr, type, member) \
    ((type *)((char *)(ptr) - offsetof(type, member)))

/* 使用示例 */
struct list_node {
    int value;
    struct list_node *next;
};

struct person {
    char name[32];
    int age;
    struct list_node node;  /* 嵌入的链表节点 */
};

void process_person(struct list_node *node) {
    /* 从 node 指针反推 person 指针 */
    struct person *p = container_of(node, struct person, node);
    printf("Name: %s, Age: %d\n", p->name, p->age);
}
```

这个宏是 Linux 内核链表、红黑树等通用数据结构的基础。

### 8.6 数组长度宏

```c
#define ARRAY_SIZE(arr) (sizeof(arr) / sizeof((arr)[0]))

int arr[] = {1, 2, 3, 4, 5};
for (size_t i = 0; i < ARRAY_SIZE(arr); i++) {
    printf("%d ", arr[i]);
}
```

注意:此宏对指针无效,会得到错误结果:

```c
void f(int *arr) {
    /* 错误：arr 是指针，不是数组 */
    size_t n = ARRAY_SIZE(arr);  /* 在 64 位系统上，结果为 2 (8/4) */
}
```

GCC 扩展可以检测这种误用:

```c
#define ARRAY_SIZE(arr) \
    (sizeof(arr) / sizeof((arr)[0]) + \
     __builtin_types_compatible_p(typeof(arr), typeof(&(arr)[0])) ? 0 : 0)
```

### 8.7 位运算宏

```c
/* 设置位 */
#define BIT_SET(reg, bit)   ((reg) |= (1U << (bit)))
/* 清除位 */
#define BIT_CLR(reg, bit)   ((reg) &= ~(1U << (bit)))
/* 翻转位 */
#define BIT_TOGGLE(reg, bit) ((reg) ^= (1U << (bit)))
/* 检查位 */
#define BIT_GET(reg, bit)   (((reg) >> (bit)) & 1U)

/* 位域掩码 */
#define BIT_MASK(n) ((1U << (n)) - 1)
#define BIT_RANGE(reg, start, end) (((reg) >> (start)) & BIT_MASK((end) - (start) + 1))

/* 使用 */
uint32_t reg = 0;
BIT_SET(reg, 3);       /* 设置第 3 位 */
BIT_CLR(reg, 3);       /* 清除第 3 位 */
if (BIT_GET(reg, 5)) { /* 检查第 5 位 */
    /* ... */
}
```

### 8.8 字符串处理宏

```c
/* 字符串拼接(编译时) */
#define CONCAT_(a, b) a##b
#define CONCAT(a, b) CONCAT_(a, b)

/* 生成唯一变量名 */
#define UNIQUE_VAR(prefix) CONCAT(prefix, __LINE__)
int UNIQUE_VAR(var_) = 42;  /* 如 var_42 */

/* C23 的 __COUNTER__ */
#define UNIQUE_VAR2(prefix) CONCAT(prefix, __COUNTER__)
int UNIQUE_VAR2(var_) = 1;  /* var_0 */
int UNIQUE_VAR2(var_) = 2;  /* var_1 */
```

### 8.9 版本号宏

```c
#define VERSION_MAJOR 1
#define VERSION_MINOR 2
#define VERSION_PATCH 3

#define VERSION_NUMBER (VERSION_MAJOR * 10000 + VERSION_MINOR * 100 + VERSION_PATCH)
#define VERSION_STRING STR(VERSION_MAJOR) "." STR(VERSION_MINOR) "." STR(VERSION_PATCH)

#if VERSION_NUMBER >= 10203
    /* 版本 >= 1.2.3 的代码 */
#endif
```

## 第 9 章 常见陷阱

### 9.1 宏副作用陷阱

```c
#define SQUARE(x) ((x) * (x))

/* 错误：参数有副作用 */
int i = 3;
int r = SQUARE(i++);  /* ((i++) * (i++))，行为未定义！ */

/* 解决方案：使用内联函数 */
static inline int square(int x) {
    return x * x;
}
int r2 = square(i++);  /* 安全，i 只自增一次 */
```

### 9.2 运算符优先级陷阱

```c
/* 错误：缺少括号 */
#define DOUBLE_BAD(x) x + x
int r = DOUBLE_BAD(5) * 3;  /* 5 + 5 * 3 = 20，而非 (5+5)*3 = 30 */

/* 正确：用括号包围整个宏体 */
#define DOUBLE_GOOD(x) ((x) + (x))
int r2 = DOUBLE_GOOD(5) * 3;  /* ((5) + (5)) * 3 = 30 */
```

### 9.3 分号陷阱

```c
/* 错误：宏末尾分号导致语法错误 */
#define BAD_END(x) do { f(x); } while (0);

if (cond)
    BAD_END(1);   /* 展开为 do {...} while (0);; */
else
    g();          /* else 没有匹配的 if！ */

/* 正确：宏末尾不加分号，由调用者加 */
#define GOOD_END(x) do { f(x); } while (0)

if (cond)
    GOOD_END(1);
else
    g();
```

### 9.4 if-else 陷阱

```c
/* 错误：多语句宏在 if-else 中出错 */
#define BAD_SWAP(a, b) { \
    int tmp = a; a = b; b = tmp; \
}

if (cond)
    BAD_SWAP(x, y);   /* 展开后多了分号，else 匹配错误 */
else
    do_something();

/* 正确：使用 do-while(0) */
#define GOOD_SWAP(a, b) do { \
    int tmp = a; a = b; b = tmp; \
} while (0)

if (cond)
    GOOD_SWAP(x, y);  /* OK */
else
    do_something();
```

`do-while(0)` 的妙处:它是一个语句(像函数调用),需要分号结尾,且 `while (0)` 保证只执行一次。

### 9.5 命名冲突陷阱

```c
/* 第三方头文件定义 */
#define MAX(a, b) ((a) > (b) ? (a) : (b))

/* 你的代码 */
#include "third_party.h"

int max_val = MAX(x, y);  /* 可能调用宏，而非你期望的函数 */

/* 解决方案：使用 #undef */
#include "third_party.h"
#undef MAX
int max_val = max_func(x, y);  /* 调用函数 */
```

### 9.6 递归展开限制

```c
#define A B
#define B A

A    /* 展开为 B，B 展开为 A，A 不再展开，最终为 A */
```

预处理器有"蓝色绘制"规则,防止无限递归,但这可能导致意外的结果。

### 9.7 `#if` 陷阱

```c
#define VERSION abc

#if VERSION >= 3
    /* 错误：VERSION 展开为 abc，abc 是未定义标识符，被替换为 0 */
    /* 0 >= 3 为假，此段被跳过 */
#endif

/* 解决方案：确保宏定义的是数字 */
#define VERSION 3
```

### 9.8 宏与字符串字面量

```c
#define PATH "/usr/local"

/* 错误：试图拼接字符串字面量 */
#define BAD_PATH(file) PATH "/" file   /* 语法错误 */

/* 正确：相邻字符串字面量会自动拼接 */
#define GOOD_PATH(file) PATH "/" file  /* OK，编译期自动拼接 */
```

### 9.9 `sizeof` 在宏中的陷阱

```c
#define ARRAY_SIZE(arr) (sizeof(arr) / sizeof(arr[0]))

void f(int arr[10]) {  /* arr 实际上是指针 */
    size_t n = ARRAY_SIZE(arr);  /* 错误：sizeof(int*) / sizeof(int) = 2 */
}
```

数组作为函数参数时退化为指针,`sizeof` 得到的是指针大小,而非数组大小。

### 9.10 宏定义中的注释

```c
/* 错误：注释会进入宏体 */
#define BAD_VERSION 1 /* version */ + 2
int v = BAD_VERSION * 10;  /* 1 + 2 * 10 = 21 */

/* 正确：注释在宏外 */
/* version */
#define GOOD_VERSION (1 + 2)
int v2 = GOOD_VERSION * 10;  /* (1 + 2) * 10 = 30 */
```

实际上,预处理器在 Token 化时已将注释替换为空格,但 `1 + 2` 与 `1 /* c */ + 2` 在宏体中行为不同:前者需要括号,后者看似有"分割"实际没有。

## 第 10 章 高级主题

### 10.1 C23 的 `#embed` 指令

`#embed` 将二进制文件嵌入源码,作为初始化列表:

```c
/* 传统方式：用 xxd -i icon.png > icon.h 生成 C 数组 */
#include "icon.h"
const unsigned char icon[] = {
    0x89, 0x50, 0x4E, 0x47, ...
};
const size_t icon_size = sizeof(icon);

/* C23 方式：直接嵌入 */
const unsigned char icon[] = {
#embed "icon.png"
};
const size_t icon_size = sizeof(icon);
```

#### 10.1.1 `#embed` 的高级用法

```c
/* 限制嵌入的字节数 */
const unsigned char icon_preview[] = {
#embed "icon.png" limit(16)
};

/* 带参数 */
const unsigned char data[] = {
#embed "data.bin" if_empty(0)
};

/* 用 __has_embed 检测支持 */
#if __has_embed("icon.png")
    const unsigned char icon[] = {
#embed "icon.png"
    };
#else
    /* 备用方案 */
#endif
```

### 10.2 C23 的 `#warning`

C23 标准化了 `#warning` 指令:

```c
#if defined(__GNUC__) && !defined(__OPTIMIZE__)
#warning "建议使用 -O2 优化级别编译"
#endif

#ifdef LEGACY_API
#warning "LEGACY_API 已弃用，将在下一版本移除"
#endif
```

### 10.3 `__has_include` 与 `__has_embed`

```c
/* 检测头文件是否存在 */
#if __has_include(<stdatomic.h>)
    #include <stdatomic.h>
    #define HAS_ATOMIC 1
#else
    #define HAS_ATOMIC 0
#endif

/* 检测嵌入文件是否存在 */
#if __has_embed("config.json")
    const unsigned char config[] = {
#embed "config.json"
    };
#endif
```

### 10.4 C 模块化(C23 草案)

C23 草案中讨论了模块化(Module)特性,可能引入 `import`、`export` 等关键字。但截至 C23 正式发布,模块化尚未标准化,预处理器仍是 C 模块化的主要机制。

未来 C 标准可能引入:

```c
/* 假想的 C 模块语法 */
export module math;

export int add(int a, int b) { return a + b; }

/* 使用 */
import math;
int main(void) { return add(1, 2); }
```

在此之前,`#include` + Include Guard 仍是 C 模块化的唯一方式。

### 10.5 宏的"重载"

C 没有函数重载,但可通过宏模拟:

```c
#include <stdio.h>

/* 模拟重载：根据参数数量调用不同函数 */
#define NARG_(...) NARG_I_(__VA_ARGS__, 6, 5, 4, 3, 2, 1, 0)
#define NARG_I_(_1, _2, _3, _4, _5, _6, N, ...) N

#define CAT_(a, b) a##b
#define CAT(a, b) CAT_(a, b)

#define print(...) CAT(print, NARG_(__VA_ARGS__))(__VA_ARGS__)

void print1(int a) { printf("%d\n", a); }
void print2(int a, int b) { printf("%d, %d\n", a, b); }
void print3(int a, int b, int c) { printf("%d, %d, %d\n", a, b, c); }

int main(void) {
    print(1);          /* print1(1) */
    print(1, 2);       /* print2(1, 2) */
    print(1, 2, 3);    /* print3(1, 2, 3) */
    return 0;
}
```

### 10.6 状态机生成

通过 X-Macro 自动生成状态机代码:

```c
/* states.x */
STATE(INIT,     "initialization")
STATE(LOADING, "loading data")
STATE(RUNNING, "running")
STATE(STOPPED, "stopped")
STATE(ERROR,   "error")

/* 生成枚举 */
#define STATE(name, desc) name,
enum State {
#include "states.x"
};
#undef STATE

/* 生成描述数组 */
#define STATE(name, desc) desc,
const char *state_desc[] = {
#include "states.x"
};
#undef STATE

/* 生成打印函数 */
const char *state_to_string(enum State s) {
    if (s >= 0 && s < sizeof(state_desc)/sizeof(state_desc[0]))
        return state_desc[s];
    return "UNKNOWN";
}
```

### 10.7 反射式宏

通过宏生成结构体的元信息:

```c
/* person.def */
FIELD(name, char[32])
FIELD(age, int)
FIELD(email, char[64])

/* 生成结构体 */
#define FIELD(name, type) type name;
struct Person {
#include "person.def"
};
#undef FIELD

/* 生成字段名数组 */
#define FIELD(name, type) #name,
const char *person_fields[] = {
#include "person.def"
};
#undef FIELD

/* 生成序列化函数 */
void person_serialize(const struct Person *p, FILE *f) {
#define FIELD(name, type) \
    fprintf(f, "%s=", #name); \
    /* 简化示例，实际需要根据类型处理 */
#include "person.def"
#undef FIELD
}
```

## 第 11 章 跨平台与编译器差异

### 11.1 GCC/Clang/MSVC 的预处理器差异

#### 11.1.1 扩展支持

| 特性 | GCC | Clang | MSVC |
| ---- | --- | ----- | ---- |
| `#pragma once` | 是 | 是 | 是 |
| `##__VA_ARGS__` | 是 | 是 | 否(已支持 `__VA_OPT__`) |
| `#warning` | 是(C23 前) | 是(C23 前) | 是(C23 前) |
| `#embed` | 否(等待 C23 实现) | 部分 | 否 |
| `_Pragma` | 是 | 是 | 是 |

#### 11.1.2 预定义宏差异

```c
/* GCC 特有 */
__GNUC__
__GNUC_MINOR__
__GNUC_PATCHLEVEL__
__linux__
__unix__

/* Clang 特有 */
__clang__
__clang_major__
__clang_minor__

/* MSVC 特有 */
_MSC_VER
_MSC_FULL_VER
_WIN32
_WIN64
```

### 11.2 跨平台宏的最佳实践

```c
/* 跨平台 DLL 导出 */
#if defined(_WIN32) || defined(_WIN64)
    #ifdef MYLIB_EXPORTS
        #define MYLIB_API __declspec(dllexport)
    #else
        #define MYLIB_API __declspec(dllimport)
    #endif
#else
    #define MYLIB_API __attribute__((visibility("default")))
#endif

/* 跨平台对齐 */
#if defined(_MSC_VER)
    #define ALIGNED(x) __declspec(align(x))
#else
    #define ALIGNED(x) __attribute__((aligned(x)))
#endif

/* 跨平台 noreturn */
#if defined(_MSC_VER)
    #define NORETURN __declspec(noreturn)
#elif defined(__STDC_VERSION__) && __STDC_VERSION__ >= 202311L
    #define NORETURN [[noreturn]]
#elif defined(__STDC_VERSION__) && __STDC_VERSION__ >= 201112L
    #define NORETURN _Noreturn
#else
    #define NORETURN __attribute__((noreturn))
#endif
```

### 11.3 平台检测的最佳实践

#### 11.3.1 操作系统检测

```c
#if defined(_WIN32) || defined(_WIN64)
    /* Windows (32 或 64 位) */
#elif defined(__linux__)
    /* Linux */
#elif defined(__APPLE__) && defined(__MACH__)
    /* macOS 或 iOS */
    #include <TargetConditionals.h>
    #if TARGET_OS_MAC
        /* macOS */
    #elif TARGET_OS_IPHONE
        /* iOS */
    #endif
#elif defined(__FreeBSD__)
    /* FreeBSD */
#elif defined(__OpenBSD__)
    /* OpenBSD */
#elif defined(__NetBSD__)
    /* NetBSD */
#elif defined(__ANDROID__)
    /* Android (在 Linux 之上) */
#else
    #error "未知平台"
#endif
```

#### 11.3.2 架构检测

```c
#if defined(__x86_64__) || defined(_M_X64)
    /* x86_64 */
#elif defined(__i386__) || defined(_M_IX86)
    /* x86 */
#elif defined(__aarch64__) || defined(_M_ARM64)
    /* ARM64 */
#elif defined(__arm__) || defined(_M_ARM)
    /* ARM32 */
#elif defined(__riscv) && __riscv_xlen == 64
    /* RISC-V 64 */
#elif defined(__riscv) && __riscv_xlen == 32
    /* RISC-V 32 */
#elif defined(__mips__) || defined(__mips64)
    /* MIPS */
#elif defined(__powerpc64__)
    /* PowerPC 64 */
#else
    #error "未知架构"
#endif
```

#### 11.3.3 字节序检测

```c
#if defined(__BYTE_ORDER__) && __BYTE_ORDER__ == __ORDER_LITTLE_ENDIAN__
    #define IS_LITTLE_ENDIAN 1
#elif defined(__BYTE_ORDER__) && __BYTE_ORDER__ == __ORDER_BIG_ENDIAN__
    #define IS_LITTLE_ENDIAN 0
#else
    /* 运行时检测 */
    #define IS_LITTLE_ENDIAN (htonl(1) != 1)
#endif
```

### 11.4 编译器特定的 pragma

#### 11.4.1 GCC 特有

```c
/* 函数属性 */
__attribute__((format(printf, 1, 2)))
void my_log(const char *fmt, ...);

__attribute__((nonnull(1)))
void *must_not_null(void *ptr);

__attribute__((deprecated("use new_func instead")))
void old_func(void);

__attribute__((weak))
void optional_func(void);

/* 结构体属性 */
struct __attribute__((packed)) PackedStruct { ... };
struct __attribute__((aligned(16))) AlignedStruct { ... };
```

#### 11.4.2 MSVC 特有

```c
__declspec(align(16)) struct AlignedStruct { ... };
__declspec(deprecated) void old_func(void);
__declspec(noinline) void never_inline(void);
__declspec(selectany) extern const int x = 0;  /* 多次定义只保留一次 */
```

### 11.5 跨平台头文件设计

一个跨平台库的头文件示例:

```c
/* mylib.h - 跨平台库头文件 */
#ifndef MYLIB_H
#define MYLIB_H

#ifdef __cplusplus
extern "C" {
#endif

/* 1. 版本信息 */
#define MYLIB_VERSION_MAJOR 1
#define MYLIB_VERSION_MINOR 0
#define MYLIB_VERSION_PATCH 0
#define MYLIB_VERSION_STR "1.0.0"

/* 2. 跨平台宏定义 */
#if defined(_WIN32) || defined(_WIN64)
    #ifdef MYLIB_EXPORTS
        #define MYLIB_API __declspec(dllexport)
    #else
        #define MYLIB_API __declspec(dllimport)
    #endif
    #define MYLIB_CALL __cdecl
#else
    #define MYLIB_API __attribute__((visibility("default")))
    #define MYLIB_CALL
#endif

/* 3. 跨平台类型 */
#if defined(_MSC_VER)
    typedef __int64 mylib_int64;
#else
    typedef long long mylib_int64;
#endif

/* 4. 函数声明 */
MYLIB_API int MYLIB_CALL mylib_init(void);
MYLIB_API void MYLIB_CALL mylib_cleanup(void);
MYLIB_API int MYLIB_CALL mylib_process(const char *input, mylib_int64 *output);

#ifdef __cplusplus
}
#endif

#endif /* MYLIB_H */
```

## 第 12 章 总结与最佳实践

### 12.1 宏使用决策表

| 场景 | 推荐方案 | 理由 |
| ---- | -------- | ---- |
| 常量定义 | `enum` 或 `static const` | 类型安全,可调试 |
| 简单计算 | `static inline` 函数 | 类型检查,无副作用 |
| 跨平台开关 | `#if`/`#ifdef` | 编译时决策,零开销 |
| 调试日志 | 宏 + `__FILE__`/`__LINE__` | 自动捕获位置信息 |
| 代码生成 | X-Macro | 单一数据源,可维护 |
| 类型泛型 | `_Generic`(C11) | 类型安全,编译器检查 |
| 字符串化 | `#` 运算符 | 唯一方式 |
| Token 粘贴 | `##` 运算符 | 唯一方式 |
| 编译时断言 | `_Static_assert`(C11) | 标准化,可移植 |

### 12.2 宏定义最佳实践

1. **宏名全大写**,区分变量和函数
2. **宏体加括号**,参数加括号
3. **多语句宏用 `do-while(0)`**
4. **避免参数副作用**,优先用内联函数
5. **复杂逻辑用内联函数替代宏**
6. **宏定义不加分号**,由调用者加
7. **使用 `##__VA_ARGS__` 或 `__VA_OPT__`** 处理空可变参数

### 12.3 头文件最佳实践

1. **始终使用 Include Guard**(传统宏或 `#pragma once`)
2. **头文件只放声明**,不放定义(除 `static inline`)
3. **最小化包含**,能用前向声明就不用包含
4. **自包含**:头文件自身能编译通过
5. **C++ 兼容**:用 `extern "C"` 包裹
6. **明确导出**:用 `__declspec(dllexport)`/`__attribute__((visibility("default")))` 控制符号可见性

### 12.4 条件编译最佳实践

1. **使用 `defined()` 检查宏**,而非直接 `#ifdef`
2. **提供默认值**,#ifndef + #define 模式
3. **保持条件逻辑清晰**,避免深层嵌套
4. **注释 `#endif`**,标明对应的 `#if`
5. **优先使用标准宏**(`__STDC_VERSION__`),而非编译器特定宏
6. **检测失败用 `#error`**,而非默默跳过

### 12.5 预处理器使用检查清单

设计宏时,检查以下问题:

- [ ] 宏体是否用括号包围?
- [ ] 每个参数是否用括号包围?
- [ ] 多语句宏是否用 `do-while(0)`?
- [ ] 宏名是否全大写,避免与变量冲突?
- [ ] 是否考虑了参数副作用?
- [ ] 是否能用 `static inline` 函数替代?
- [ ] 宏定义末尾是否多加了分号?
- [ ] 是否有 `##__VA_ARGS__` 或 `__VA_OPT__` 处理空参数?

设计头文件时,检查:

- [ ] 是否有 Include Guard?
- [ ] 头文件是否自包含?
- [ ] 是否最小化了 `#include`?
- [ ] 是否用 `extern "C"` 包裹(若需 C++ 兼容)?
- [ ] 公开 API 是否有明确的导出标记?

设计条件编译时,检查:

- [ ] 是否用 `defined()` 而非 `#ifdef`?
- [ ] 是否提供了 `#else` 默认分支?
- [ ] 是否在 `#endif` 后注释了对应的条件?
- [ ] 是否避免深层嵌套?

### 12.6 现代宏使用的核心原则

#### 12.6.1 能用 C 语言特性就不用宏

```c
/* 不推荐：用宏定义常量 */
#define MAX_SIZE 100

/* 推荐：用 static const 或 enum */
static const int MAX_SIZE = 100;
enum { MAX_SIZE = 100 };  /* 编译期常量 */

/* 不推荐：用宏定义简单计算 */
#define SQUARE(x) ((x) * (x))

/* 推荐：用 inline 函数 */
static inline int square(int x) { return x * x; }
```

#### 12.6.2 宏只在必要时使用

宏在以下场景仍是不可替代的:

- 字符串化(`#`)与 Token 粘贴(`##`)
- 编译时位置信息(`__FILE__`/`__LINE__`)
- 条件编译(`#if`/`#ifdef`)
- 代码生成(X-Macro)
- 跨平台抽象

#### 12.6.3 渐进式现代化

```c
/* 旧风格 */
#define DEBUG 1

/* C11 风格 */
_Static_assert(DEBUG == 0 || DEBUG == 1, "DEBUG must be 0 or 1");

/* C23 风格 */
constexpr int DEBUG = 1;  /* C23 constexpr (若支持) */
```

### 12.7 学习资源

#### 12.7.1 标准文档

- ISO/IEC 9899:2023(C23 标准)
- ISO/IEC 9899:2018(C17 标准)
- ISO/IEC 9899:2011(C11 标准)

#### 12.7.2 经典书籍

- 《C 程序设计语言》(K&R,第二版):预处理器基础
- 《C: A Reference Manual》(Harbison & Steele):预处理器详细参考
- 《Modern C》(Jens Gustedt):C11 与 C17 的预处理器
- 《21st Century C》(Ben Klemens):现代 C 实践

#### 12.7.3 在线资源

- GCC 文档:Preprocessor(https://gcc.gnu.org/onlinedocs/cpp/)
- Clang 文档:Preprocessor(https://clang.llvm.org/docs/)
- cppreference:https://en.cppreference.com/w/c/preprocessor
- Linux 内核源码:经典的宏使用案例

#### 12.7.4 实战项目学习

- **Linux 内核**:`include/linux/` 下的头文件,展示大规模宏使用
- **SQLite**:`src/sqliteInt.h`,展示跨平台宏设计
- **Redis**:`src/` 下的代码,展示简洁的宏抽象
- **musl libc**:`include/` 下的头文件,展示标准化宏使用

### 12.8 总结

C 预处理器是一个强大的工具,它诞生于 1970 年代,经过 C89、C99、C11、C23 的演进,至今仍是 C 程序员不可或缺的能力。

**预处理器的核心价值**:

1. **编译时决策**:通过条件编译,在编译期完成平台适配、功能开关,零运行时开销
2. **代码生成**:通过 X-Macro 等技巧,从单一数据源生成多种代码,降低维护成本
3. **诊断信息**:通过预定义宏,自动捕获源码位置,构建强大的日志与断言系统
4. **跨平台抽象**:通过宏封装平台差异,实现一次编写,多处编译

**预处理器的核心风险**:

1. **文本替换陷阱**:宏不是函数,副作用、运算符优先级、分号等问题频发
2. **调试困难**:宏展开后调试器难以观察
3. **命名空间污染**:宏全局有效,易冲突
4. **可读性下降**:过度使用宏的代码晦涩难懂

**现代 C 程序员的策略**:

- 优先使用 C 语言本身特性(`const`、`enum`、`inline`、`_Generic`、`_Static_assert`)
- 只在必要时使用宏(条件编译、字符串化、Token 粘贴、代码生成)
- 严格遵循宏定义的最佳实践(括号、do-while、避免副作用)
- 关注 C23 新特性(`#embed`、`#warning`、`__VA_OPT__`),渐进式现代化代码

掌握预处理器,是从"会写 C 代码"到"能写出工业级 C 代码"的关键一步。它能让你读懂 Linux 内核、glibc、SQLite 这些世界级项目的源码,也能让你写出真正跨平台、高可靠、易维护的 C 程序。
