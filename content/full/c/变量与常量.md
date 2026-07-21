---
order: 40
tags:
  - c
difficulty: beginner
title: 变量与常量
module: c
category: 'C Basics'
description: 变量的定义、生命周期、作用域以及常量的多种实现方式。
author: Anonymous
related:
  - c/程序结构与基本语法
  - c/数据类型详解
  - c/位运算与位域
  - c/运算符与表达式
prerequisites:
  - c/概述
---

# 变量与常量 (Variables and Constants)

## 第 1 章 引言与学习路径

### 1.1 为什么变量与常量是 C 语言的基石

在所有编程语言中,"变量"与"常量"是最基本也是最重要的概念之一。它们决定了程序如何在内存中表达数据、如何控制数据可视性、如何让编译器为数据安排恰当的存储位置。对于 C 语言这门"贴近硬件"的系统编程语言而言,理解变量与常量不仅是写出能编译通过的代码,更是理解程序在内存中如何运行的关键。

回顾计算机科学的发展史,从机器语言到汇编语言,再到高级语言,每一次抽象层次的提升,本质上都在试图让程序员更方便地"命名"和"操作"内存中的数据。在机器语言时代,程序员需要直接操作内存地址,例如 `MOV AX, [0x1000]`;在汇编语言中,出现了符号地址,如 `MOV AX, [counter]`;而到了 C 这样的高级语言,我们使用更具语义的名称,例如 `int counter = 0;`,由编译器负责将其翻译为底层指令。

变量是 C 语言为程序员提供的第一层抽象。一个看似简单的语句 `int x = 42;` 背后,实际上涉及多个层面的语义:

- **类型 (Type)**:`int` 决定了 `x` 占用的内存大小、取值范围、对齐要求以及可参与的运算
- **名称 (Name)**:`x` 是程序员可读的标识符,编译器会将其映射到具体的内存地址
- **存储期 (Storage Duration)**:决定 `x` 何时被分配、何时被释放
- **作用域 (Scope)**:决定 `x` 的名字在哪些代码区域可见
- **链接性 (Linkage)**:决定 `x` 能否被其他翻译单元 (translation unit) 引用
- **值 (Value)**:`42` 是 `x` 的初始值,会按照 `int` 的二进制表示写入对应内存

常量则是变量的对立面:它代表"不可变"的数据。在 C 语言中,"常量"这一概念具有多义性,它可能指:

- **字面量 (Literal)**:如 `42`、`3.14`、`'A'`、`"hello"`
- **const 限定对象**:如 `const int MAX = 100;`
- **宏常量 (Macro Constant)**:如 `#define MAX 100`
- **枚举常量 (Enumeration Constant)**:如 `enum { MAX = 100 };`

每种"常量"在 C 中有不同的语义、不同的存储位置、不同的类型推导规则、不同的调试可见性,以及不同的性能影响。理解这些差异,是从 C 入门者迈向 C 工程师的关键一步。

### 1.2 本文档的目标读者

本文档面向以下读者:

- **零基础自学者**:从未接触过 C 语言,但希望从最基础的概念开始建立扎实的认知体系
- **有其他语言经验的开发者**:熟悉 Python、Java、JavaScript 等语言,希望快速理解 C 的独特之处
- **高校学生**:正在学习数据结构、操作系统、计算机网络等后续课程,需要补足 C 语言基础
- **嵌入式工程师**:需要精确控制内存与存储位置,理解每一个字节的开销

### 1.3 学习路径建议

为了帮助不同背景的读者高效学习,本文档采用 12 章递进式结构:

1. **第 1 章 引言**:建立全局视野,理解为什么这个主题重要
2. **第 2 章 历史演进**:从 BCPL、B 语言到 C23,看清设计背后的取舍
3. **第 3 章 核心概念**:建立术语体系,如 object、lvalue、storage duration 等
4. **第 4 章 语法规范**:从声明语法的角度,理解 C 的"声明即定义"原则
5. **第 5 章 存储期与作用域**:这是 C 语言最容易被忽视的部分,也是面试高频考点
6. **第 6 章 内存模型与对象布局**:从硬件视角理解对齐、填充、字节序
7. **第 7 章 实战示例**:通过完整的工程化代码片段巩固理解
8. **第 8 章 常见陷阱**:总结未定义行为 (UB) 与常见反模式
9. **第 9 章 性能优化**:讨论 const 优化、register 关键字、字符串字面量池
10. **第 10 章 编译器与跨平台**:GCC、Clang、MSVC 的差异,以及 32/64 位考量
11. **第 11 章 高级主题**:C23 引入的 constexpr、线程局部存储、原子变量等
12. **第 12 章 总结与延伸**:系统化最佳实践与权威参考资料

建议零基础读者按章节顺序阅读;有经验的读者可以直接跳到第 5、6、8 章查看核心难点。

### 1.4 阅读前的最小预备知识

在开始阅读本文档前,你应该:

- 了解计算机的基本组成 (CPU、内存、磁盘)
- 知道二进制与十六进制的基本概念
- 安装一个 C 编译器 (推荐 GCC 13+ 或 Clang 17+),并能够编译运行 Hello World 程序
- 了解什么是源代码文件 (`.c`) 与头文件 (`.h`)

如果你尚未具备上述基础,建议先阅读本项目的《概述》与《程序结构与基本语法》章节。

## 第 2 章 历史演进与设计哲学

### 2.1 从 BCPL 到 C:变量概念的诞生

C 语言的诞生可以追溯到 1960 年代末。Martin Richards 在 1966 年设计了 BCPL (Basic Combined Programming Language),这是最早为系统编程设计的高级语言之一。BCPL 中的"变量"是一种无类型的命名内存单元,所有变量都占用一个机器字 (machine word)。

Ken Thompson 在 1969 年为 PDP-7 设计了 B 语言,B 语言继承了 BCPL 的无类型思想,所有变量都是机器字。例如:

```c
/* B 语言代码 (示意,语法近似) */
let x;
x = 42;
```

在 B 语言中,`x` 仅仅是一个名字,指向一个固定大小的内存槽位。这种设计在 PDP-7 这种字寻址 (word-addressed) 机器上工作良好,但当 Dennis Ritchie 在 1972 年为 PDP-11 设计 C 语言时,他面临一个全新的挑战:PDP-11 是字节寻址 (byte-addressed) 机器,不同类型的数据需要不同的存储大小与访问方式。

于是,Ritchie 在 C 语言中引入了"类型"概念。变量不再只是命名内存槽,而是带有类型信息的命名对象。这一设计决策深刻影响了后续所有系统编程语言:

- 类型决定了内存占用大小
- 类型决定了合法的运算
- 类型决定了指针的算术行为
- 类型决定了与硬件的对应关系

### 2.2 K&R C 时代:简洁即是美

1978 年,Brian Kernighan 和 Dennis Ritchie 出版了《The C Programming Language》(简称 K&R C)。这一时期的 C 语言极其简洁:

- 变量必须在使用前声明,但只能在代码块开头声明
- 没有 `const` 关键字 (直到 C89 才引入)
- 没有 `volatile` 关键字
- 整数类型的位宽完全由实现定义 (implementation-defined)

K&R 时代的"常量"只能通过 `#define` 宏实现,例如:

```c
#define MAX 100
#define PI  3.14159
```

这种宏常量在预处理阶段被替换,没有类型信息,也没有调试符号。这一局限性直接催生了后来的 `const` 关键字。

### 2.3 C89/C90:const 与 volatile 的引入

1989 年,ANSI 发布了 C89 标准 (ISO 在 1990 年采纳为 ISO/IEC 9899:1990,又称 C90)。这一版本引入了两个极其重要的类型限定符 (type qualifier):

- `const`:表示对象在初始化后不可通过该标识符修改
- `volatile`:告诉编译器对象的值可能在程序控制流之外被改变,禁止激进优化

`const` 的引入解决了 `#define` 的诸多问题:

- `const` 对象有明确的类型,可以参与类型检查
- `const` 对象有地址,可以被指针指向 (例如 `const int *p`)
- `const` 对象在调试器中可见
- `const` 对象遵循作用域规则,不会污染全局命名空间

但 C 的 `const` 与 C++ 的 `const` 有一个关键区别:在 C 中,`const int N = 10;` 的 `N` 仍然是外部链接的 (external linkage),除非显式加 `static`;在 C++ 中,`const` 默认是内部链接的。这是从 C 迁移到 C++ 时常见的坑点。

### 2.4 C99:VLA、指定初始化器与 long long

1999 年发布的 C99 标准为变量带来了多项新特性:

- **变长数组 (Variable-Length Array, VLA)**:允许数组大小在运行时确定
- **指定初始化器 (Designated Initializer)**:如 `int arr[10] = {[5] = 42};`
- **`long long` 类型**:保证至少 64 位整数
- **复合字面量 (Compound Literal)**:如 `(int[]){1, 2, 3}`
- **声明可以在代码块任意位置**:不再局限于块开头

VLA 是一个有争议的特性,因为它的内存分配在栈上,可能导致栈溢出。C11 将 VLA 设为可选特性,允许编译器不实现。

### 2.5 C11:线程、原子与对齐

2011 年的 C11 标准引入了多线程与原子操作的官方支持:

- **`_Thread_local` 存储类**:线程局部存储 (Thread-Local Storage, TLS)
- **`_Atomic` 类型限定符**:原子变量
- **`_Alignas` 与 `_Alignof`**:显式对齐控制
- **`_Static_assert`**:编译期断言

线程局部存储是变量生命周期模型的重大扩展:同一个变量名在不同线程中有独立的实例。例如:

```c
_Thread_local int thread_id;
```

每个线程访问 `thread_id` 时,实际上访问的是自己线程私有的副本。

### 2.6 C23:constexpr 与现代 C

2023 年发布的 C23 标准是 C 语言自 C11 以来最大的一次更新,在变量与常量方面引入了:

- **`constexpr` 关键字**:真正的编译期常量,与 C++11+ 对齐
- **`_BitInt(N)` 类型**:任意位宽整数
- **`typeof` 与 `typeof_unqual`**:类型推导
- **`auto` 关键字**:类型推导 (与 C++ 不同语义)
- **`#embed` 指令**:将二进制文件嵌入为常量数组
- **零初始化语法**:`int x{};` 风格

`constexpr` 是 C23 中最值得关注的特性。在 C23 之前,C 程序员要做"真正的编译期常量"只能在 `enum` 与 `#define` 之间二选一,各有缺陷:

- `#define MAX 100`:无类型、无作用域、不可取地址
- `enum { MAX = 100 };`:只能是整数、不可浮点、不可取地址

`constexpr` 解决了所有这些问题:

```c
constexpr int MAX = 100;
constexpr double PI = 3.14159;
constexpr const char *VERSION = "1.0.0";
```

### 2.7 设计哲学总结

回顾 C 语言变量与常量的演进,我们可以总结出几条核心设计哲学:

1. **信任程序员 (Trust the Programmer)**:C 不阻止你做任何事,包括危险的事。`const` 可以被 `const_cast` 绕过 (虽然 C 没有这个运算符,但通过指针强制转换可以)
2. **不为没用到的东西付费 (Don't Pay for What You Don't Use)**:变量声明本身不产生运行时开销,只有赋值与访问才产生
3. **保持语言小而库大 (Keep the Language Small, Make the Library Rich)**:C 语言本身只提供基本存储模型,高级抽象通过库实现
4. **可预测的性能 (Predictable Performance)**:变量的存储位置 (栈/堆/静态区) 由存储类决定,程序员可以精确控制

理解这些哲学,有助于我们理解 C 语言为何至今仍是最重要的系统编程语言之一。

## 第 3 章 核心概念与术语体系

### 3.1 Object (对象) 与 Variable (变量)

在 C 标准中,"object"是一个极其精确的术语。ISO/IEC 9899:2011 第 3.15 节定义:

> **object**: region of data storage in the execution environment, the contents of which can represent values.

也就是说,object 是"执行环境中的存储区域,其内容可以表示值"。注意 object 与 C++ 中的"对象"概念完全不同,C 的 object 没有方法、没有继承,纯粹是内存区域。

而 variable (变量) 并不是 C 标准术语,而是常见的工程用语,通常指"有名字的 object"。一个变量由以下要素组成:

- **标识符 (Identifier)**:程序员使用的名字,如 `x`、`counter`
- **类型 (Type)**:决定内存大小与运算语义,如 `int`、`double`
- **存储期 (Storage Duration)**:决定生命周期,如自动、静态、线程、动态
- **作用域 (Scope)**:决定名字可见范围,如块作用域、文件作用域
- **链接性 (Linkage)**:决定跨翻译单元可见性,如无链接、内部链接、外部链接
- **值 (Value)**:存储在内存中的实际数据
- **地址 (Address)**:内存中的位置

### 3.2 Lvalue、Rvalue 与 Modifier

C 语言中,表达式分为两类:

- **lvalue**:能出现在赋值号左侧的表达式,本质上是"有名字、可取地址"的对象引用
- **rvalue**:只能出现在右侧的表达式,如字面量、函数返回值

严格地说,C 标准使用 "lvalue" 与 "non-lvalue" 来分类。C23 进一步引入了更精确的术语:

- **lvalue**:指向某个 object 的表达式
- **rvalue**:不指向 object 的表达式值

例如:

```c
int x = 10;
int *p = &x;  /* x 是 lvalue,可以取地址 */
x = 20;        /* x 作为左操作数,是 modifiable lvalue */
int y = x + 1; /* x + 1 是 rvalue,不能取地址 */
```

`const int N = 100;` 中的 `N` 是 lvalue,但不是 modifiable lvalue,试图修改它会导致编译错误或未定义行为。

### 3.3 Storage Duration (存储期)

C 标准定义了四种存储期:

| 存储期 | 关键字 | 生命周期 | 典型存储位置 |
|--------|--------|----------|--------------|
| automatic (自动) | 默认 (或 `auto`) | 进入块时分配,退出时释放 | 栈 (Stack) |
| static (静态) | `static` 或文件作用域 | 程序整个运行期间 | 静态区 (.data/.bss) |
| thread (线程) | `_Thread_local` (C11+) | 线程创建到线程退出 | TLS 段 |
| allocated (动态) | `malloc` 等函数 | 从 `malloc` 到 `free` | 堆 (Heap) |

注意:`allocated` 不是关键字,而是通过库函数实现的存储期。这一点容易混淆。

### 3.4 Scope (作用域)

C 语言有四种作用域:

- **block scope (块作用域)**:在 `{}` 内声明的标识符,只在该块内可见
- **file scope (文件作用域)**:在任何块外声明的标识符,在整个翻译单元可见
- **function prototype scope (函数原型作用域)**:函数原型中参数的作用域,仅到原型结束
- **function scope (函数作用域)**:仅 label (标签) 拥有,整个函数内可见

C99 新增了"块作用域可以声明在块内任意位置",C23 进一步放宽了循环变量声明的范围:

```c
for (int i = 0; i < 10; i++) {  /* C99+: i 的作用域是 for 循环 */
    /* ... */
}
```

### 3.5 Linkage (链接性)

链接性决定一个标识符能否在多个翻译单元之间共享:

- **no linkage (无链接)**:块作用域的所有变量,函数参数
- **internal linkage (内部链接)**:`static` 修饰的文件作用域变量,只在当前翻译单元可见
- **external linkage (外部链接)**:默认的文件作用域变量,可以在其他翻译单元通过 `extern` 访问

例如:

```c
/* file1.c */
int global_counter = 0;        /* external linkage */
static int file_private = 42;  /* internal linkage */

void f(void) {
    int local = 1;             /* no linkage */
}
```

```c
/* file2.c */
extern int global_counter;     /* 引用 file1.c 的 global_counter */
/* 不能访问 file_private,因为它内部链接 */
```

### 3.6 Constant (常量) 的多义性

C 语言中"常量"是一个被滥用的术语。我们需要区分以下概念:

#### 3.6.1 Literal (字面量)

字面量是直接出现在源代码中的值,例如 `42`、`3.14`、`'A'`、`"hello"`、`true`。C 标准称之为 "constant",但工程上常用 "literal" 来避免混淆。

字面量的类型由其形式决定:

| 字面量 | 类型 | 备注 |
|--------|------|------|
| `42` | `int` | 十进制整数 |
| `042` | `int` | 八进制 (前导 0) |
| `0x42` | `int` | 十六进制 (前导 0x) |
| `0b1010` | `int` | 二进制 (C23 引入) |
| `42U` | `unsigned int` | U 后缀 |
| `42L` | `long` | L 后缀 |
| `42LL` | `long long` | LL 后缀 (C99) |
| `42ULL` | `unsigned long long` | 组合后缀 |
| `3.14` | `double` | 默认双精度 |
| `3.14f` | `float` | f 后缀 |
| `3.14L` | `long double` | L 后缀 (浮点上下文) |
| `'A'` | `int` | 字符常量 (注意:不是 char!) |
| `u'A'` | `char16_t` | C11 UTF-16 |
| `U'A'` | `char32_t` | C11 UTF-32 |
| `"hello"` | `char[6]` | 字符串字面量 (含 \0) |
| `u8"hello"` | `char[6]` | C23 起为 `char[6]` (与 `"hello"` 相同) |

#### 3.6.2 const-qualified Object

`const int N = 100;` 中的 `N` 是 const 限定的对象。在 C 中,这意味着:

- 不能通过 `N` 这个标识符修改其值
- 但可以通过强制类型转换的指针修改 (导致 UB,但语法允许)
- `N` 仍然是 object,有地址,运行时占用内存 (除非编译器优化)

这与 C++ 的 `const` 不同:在 C++ 中,`const int N = 100;` 用作数组大小时是合法的常量表达式;在 C 中,这会导致编译错误:

```c
const int N = 100;
int arr[N];   /* C 中非法!N 不是常量表达式 */
              /* C++ 中合法 */
```

#### 3.6.3 Enumeration Constant (枚举常量)

`enum { MAX = 100 };` 中的 `MAX` 是真正的编译期常量,类型为 `int`。枚举常量可以用作数组大小、case 标签等:

```c
enum { MAX_SIZE = 256 };
char buffer[MAX_SIZE];   /* 合法 */
```

但枚举常量只能是 `int` 类型,无法表达浮点或字符串常量。

#### 3.6.4 Macro Constant (宏常量)

`#define PI 3.14159` 定义了一个宏常量。在预处理阶段,所有 `PI` 会被替换为 `3.14159`。宏常量的特点:

- 无类型 (但替换后的字面量有类型)
- 无作用域 (从定义到文件结束或 `#undef`)
- 无地址 (不是真正的 object)
- 调试器中不可见 (因为预处理后被替换)

#### 3.6.5 constexpr (C23)

`constexpr` 是 C23 引入的、最完整的常量定义方式:

```c
constexpr int MAX = 100;
constexpr double PI = 3.14159;
```

`constexpr` 对象:

- 有明确的类型
- 有作用域
- 可用作常量表达式 (如数组大小)
- 不可修改
- 在调试器中可见

### 3.7 术语速查表

| 术语 | 英文 | 简要说明 |
|------|------|----------|
| 对象 | object | 内存中的存储区域 |
| 标识符 | identifier | 程序员命名的符号 |
| 左值 | lvalue | 指向对象的表达式 |
| 修改型左值 | modifiable lvalue | 可被赋值的左值 |
| 右值 | rvalue | 不指向对象的表达式值 |
| 存储期 | storage duration | 对象的生命周期 |
| 作用域 | scope | 标识符的可见范围 |
| 链接性 | linkage | 跨翻译单元的可见性 |
| 类型限定符 | type qualifier | const/volatile/restrict/_Atomic |
| 存储类说明符 | storage-class specifier | auto/static/extern/register/_Thread_local/typedef |
| 翻译单元 | translation unit | 一个源文件经预处理后的结果 |
| 未定义行为 | undefined behavior, UB | 标准未规定的行为 |

## 第 4 章 语法规范与声明语义

### 4.1 声明的完整语法

C 语言的声明语法以"声明说明符序列"开头,后接"声明符列表",最后以分号结束。简化后的 BNF 范式如下:

```
declaration:
    declaration-specifiers declarator-list? ';'

declaration-specifiers:
    storage-class-specifier declaration-specifiers?
    type-specifier declaration-specifiers?
    type-qualifier declaration-specifiers?
    function-specifier declaration-specifiers?
    alignment-specifier declaration-specifiers?

declarator:
    pointer? direct-declarator
    ...

direct-declarator:
    identifier
    '(' declarator ')'
    direct-declarator '[' type-qualifier-list? assignment-expression? ']'
    direct-declarator '(' parameter-type-list ')'
    ...
```

虽然语法看似复杂,但实际使用中最常见的几种形式可以归纳如下:

```c
/* 基本变量声明 */
int x;
int x, y, z;

/* 带初始化的声明 */
int x = 10;
int x = 10, y = 20, z = 30;

/* 带类型限定符的声明 */
const int N = 100;
volatile int hw_register;
const int *p;          /* 指向 const int 的指针 */
int *const p = &x;     /* 指向 int 的 const 指针 */
const int *const p = &x; /* 双 const */

/* 带存储类的声明 */
static int counter = 0;
extern int global_var;
register int loop_var;  /* C 起就存在,但 C 起忽略 */
_Thread_local int tid;  /* C11+ */

/* 指针声明 */
int *p;
int **pp;               /* 指向 int 指针的指针 */
int (*fp)(int);         /* 函数指针 */
int (*arr)[10];         /* 指向 int[10] 的指针 */
int *arr[10];           /* 包含 10 个 int* 的数组 */
```

### 4.2 "声明即定义"原则

C 语言中,大多数变量声明同时也是定义 (definition)。区别在于:

- **声明 (declaration)**:向编译器介绍一个名字及其类型
- **定义 (definition)**:在内存中实际创建对象

例如:

```c
int x;            /* 定义,分配内存 */
extern int x;     /* 声明,不分配内存,引用别处的定义 */
```

对于函数,声明与定义更明显:

```c
int f(int);       /* 函数声明 (原型) */
int f(int x) {    /* 函数定义 */
    return x * 2;
}
```

C 标准的规则是:一个程序中,每个具有外部链接的对象只能有一个定义,但可以有多个声明。这一规则在大型项目中通过头文件实现:

```c
/* config.h */
extern int global_config;   /* 声明,可被多个 .c 文件包含 */

/* config.c */
int global_config = 0;      /* 定义,只在一个 .c 文件中 */

/* main.c */
#include "config.h"
int main(void) {
    global_config = 42;     /* 使用 */
    return 0;
}
```

### 4.3 初始化的语义

初始化 (initialization) 是在对象创建时赋予初值的过程,与赋值 (assignment) 在语义上不同:

- **初始化**:对象诞生时即被赋予值,发生在构造阶段
- **赋值**:对象已存在,将其值替换为新值

在 C 中,初始化的语法取决于对象的位置与类型:

#### 4.3.1 自动变量的初始化

```c
void f(void) {
    int x = 10;          /* 初始化 */
    int y = x + 5;       /* 可以用表达式初始化 */
    int arr[3] = {1, 2, 3};
    int arr[10] = {0};   /* 全部初始化为 0 */
}
```

未初始化的自动变量具有**不确定值 (indeterminate value)**,读取它是未定义行为:

```c
void f(void) {
    int x;        /* 未初始化 */
    printf("%d\n", x);   /* UB!可能输出任何值,甚至崩溃 */
}
```

#### 4.3.2 静态变量的初始化

```c
static int counter = 0;     /* 静态初始化,程序启动时执行 */
int global = 42;            /* 同上 */

void f(void) {
    static int called = 0;  /* 函数内静态变量,只初始化一次 */
    called++;
}
```

静态变量的初始化必须使用**常量表达式 (constant expression)**:

```c
static int x = 10;       /* 合法 */
static int y = x + 1;    /* 非法!x 不是常量表达式 */
static int z = sizeof(int);  /* 合法,sizeof 是常量表达式 */
```

未显式初始化的静态变量会被**零初始化 (zero-initialized)**:

- 整数类型为 0
- 浮点类型为 0.0
- 指针类型为 NULL
- 数组、结构体的每个成员递归零初始化

#### 4.3.3 指定初始化器 (C99+)

```c
int arr[10] = {[5] = 42, [9] = 99};  /* 只指定元素,其余为 0 */

struct Point {
    int x, y;
};

struct Point p = {.y = 10, .x = 20};  /* 按名指定,顺序无关 */
```

指定初始化器使代码更健壮,特别是结构体布局变化时不会出错。

#### 4.3.4 复合字面量 (C99+)

```c
struct Point p = (struct Point){.x = 1, .y = 2};
int *arr = (int[]){1, 2, 3, 4, 5};

/* 注意:块作用域内的复合字面量是自动存储期 */
/* 文件作用域或静态存储期的复合字面量是静态存储期 */
```

### 4.4 多重声明与"指针星号位置"

C 中声明多个变量时,容易出错的陷阱:

```c
int *p, q;     /* p 是 int*,q 是 int!不是 int* */
int *p, *q;    /* 两个都是 int* */
```

这是因为 `*` 是声明符的一部分,而不是类型说明符。常见的代码风格有:

```c
/* 风格 1:星号贴近变量名 */
int *p;
int *p, *q;

/* 风格 2:星号贴近类型 */
int* p;
int* p, q;     /* 危险!q 实际是 int */

/* 风格 3:每行一个变量 */
int* p;
int* q;
```

风格 3 在工业代码中最常用,可读性最高。

### 4.5 typedef 的语义

`typedef` 是存储类说明符 (虽然语义上不像),用于为类型起别名:

```c
typedef unsigned int uint32_t;
typedef int (*func_ptr)(int, int);   /* 函数指针类型 */

uint32_t x = 42;
func_ptr fp = some_function;
```

`typedef` 不创建新类型,只是已有类型的别名:

```c
typedef int Int;
Int x = 10;
int y = x;   /* 完全兼容,Int 与 int 是同一类型 */
```

这与 C++ 的 `using` 不同,C 的 `typedef` 不能模板化。

### 4.6 const 的位置与语义

`const` 的位置决定了它修饰的对象:

```c
const int x = 10;        /* x 是 const int */
int const x = 10;        /* 等价于上一行 */

const int *p;            /* 指向 const int 的指针:*p 不可改,p 可改 */
int *const p = &x;       /* const 指针:p 不可改,*p 可改 (假设 x 非 const) */
const int *const p = &x; /* 双 const */

/* 阅读 const 的技巧:从右向左读 */
const int *p;            /* p is pointer to const int */
int *const p;            /* p is const pointer to int */
const int *const p;      /* p is const pointer to const int */
```

### 4.7 数组声明的多种形式

```c
int arr[10];             /* 显式大小 */
int arr[] = {1, 2, 3};   /* 大小由初始化决定 (3) */
int arr[5] = {1, 2, 3};  /* 部分初始化,其余为 0 */

/* C99+:指定元素 */
int arr[10] = {[0] = 1, [5] = 2, [9] = 3};

/* C99+:变长数组 VLA (在块作用域内) */
int n = 10;
int arr[n];              /* VLA,大小运行时确定 */
                          /* C11 起为可选特性 */

/* 多维数组 */
int matrix[3][4];        /* 3 行 4 列 */
int matrix[][4] = {{1,2,3,4}, {5,6,7,8}};  /* 第一维可省略 */
```

### 4.8 字符串字面量的声明

```c
char *s = "hello";       /* 危险:字符串字面量在只读区,修改 *s 是 UB */
const char *s = "hello"; /* 安全:const 提示不可修改 */
char s[] = "hello";      /* 安全:在栈上创建副本,可修改 */
char s[6] = "hello";     /* 显式大小,刚好容纳 */
char s[10] = "hello";    /* 多余位置零初始化 */
```

C 标准并未规定字符串字面量必须放在只读区,但现代编译器 (GCC、Clang、MSVC) 都将它们放在 `.rodata` 段。尝试修改会触发段错误 (segfault)。

## 第 5 章 存储期、作用域与链接性

本章是 C 语言变量模型的核心。理解存储期、作用域、链接性的三角关系,是从入门走向精通的关键一步。

### 5.1 四种存储期的深度剖析

#### 5.1.1 自动存储期 (automatic storage duration)

```c
void f(void) {
    int x = 10;          /* 自动存储期 */
    int arr[100];        /* 同上 */
    /* ... */
}                          /* x 和 arr 在此处释放 */
```

自动变量存储在线程栈 (stack) 上,进入函数时通过调整栈指针分配,退出时反向调整释放。这一机制极其高效,只需一两条汇编指令:

```asm
; x86-64 GCC 生成的代码示意
push   rbp
mov    rbp, rsp
sub    rsp, 16           ; 分配 16 字节栈空间
mov    DWORD PTR [rbp-4], 10  ; 初始化 x = 10
...
leave                     ; 释放栈空间
ret
```

自动变量的优点:

- 分配释放零成本 (一条指令)
- 缓存友好 (栈空间集中,缓存命中率高)
- 无需手动管理

自动变量的缺点:

- 大小受栈大小限制 (Linux 默认 8MB,Windows 默认 1MB)
- 不能跨函数返回 (函数返回后栈被释放,返回栈上变量的地址是 UB)
- 生命周期受限于块

#### 5.1.2 静态存储期 (static storage duration)

```c
int global_var = 42;          /* 静态存储期,外部链接 */
static int file_var = 0;      /* 静态存储期,内部链接 */

void f(void) {
    static int call_count = 0;  /* 静态存储期,无链接 */
    call_count++;
    printf("f called %d times\n", call_count);
}
```

静态变量存储在 `.data` 段 (已初始化) 或 `.bss` 段 (未初始化或零初始化),程序启动时分配,程序退出时释放。

**`.data` vs `.bss` 的区别**:

- `.data`:存放非零初值的全局/静态变量,占用可执行文件大小
- `.bss`:存放零初值的全局/静态变量,不占用可执行文件大小,启动时由操作系统零填充

```c
int arr1[1000] = {1};   /* .data 段,占用 4KB 可执行文件空间 */
int arr2[1000];         /* .bss 段,不占用可执行文件空间 */
```

静态变量的初始化发生在程序启动的"动态初始化"阶段,先于 `main` 函数执行。多个静态变量之间的初始化顺序在同一翻译单元内按定义顺序,跨翻译单元则未指定。

#### 5.1.3 线程存储期 (thread storage duration, C11+)

```c
_Thread_local int tid;    /* 每个线程独立的实例 */
```

线程局部存储 (Thread-Local Storage, TLS) 让每个线程拥有变量的独立副本。常见用途:

- 线程 ID
- 线程本地错误码 (类似 `errno`)
- 线程本地随机数生成器状态
- 线程本地日志缓冲

TLS 的实现因平台而异:

- Linux:glibc 使用 `.tdata` / `.tbss` 段,通过 `fs` 寄存器访问
- Windows:使用 `__declspec(thread)` 或 `_Thread_local`,通过 `gs` 段寄存器访问
- macOS:较新版本支持,通过 `__thread` 关键字

TLS 的访问成本:首次访问可能涉及动态分配,后续访问通常只需一次段寄存器寻址,比全局变量稍慢。

#### 5.1.4 动态存储期 (allocated storage duration)

```c
int *p = malloc(sizeof(int));  /* 动态分配 */
*p = 42;
free(p);                        /* 必须手动释放 */
```

动态分配的内存位于堆 (heap) 上。堆是由 C 运行时库管理的内存池,程序员通过 `malloc` / `calloc` / `realloc` 申请,通过 `free` 释放。

动态分配的特点:

- 大小可在运行时决定
- 生命周期完全由程序员控制
- 性能远低于栈分配 (涉及系统调用,如 `brk` 或 `mmap`)
- 容易出错 (内存泄漏、双重释放、悬空指针)

更深入的讨论见《动态内存管理》章节。

### 5.2 作用域的细节

#### 5.2.1 块作用域

```c
void f(void) {
    int x = 1;            /* x 在此处到块尾可见 */
    {
        int y = 2;        /* y 仅在内层块可见 */
        int x = 3;        /* 内层 x 隐藏外层 x! */
        printf("%d\n", x);  /* 输出 3 */
    }
    printf("%d\n", x);    /* 输出 1 */
}
```

变量隐藏 (variable shadowing) 是 C 中常见的反模式,容易导致误解。GCC 提供 `-Wshadow` 警告选项。

#### 5.2.2 文件作用域

```c
/* file.c */
#include <stdio.h>

int counter = 0;          /* 文件作用域,外部链接 */

static int helper = 42;   /* 文件作用域,内部链接 */

void f(void) {            /* 文件作用域,外部链接 */
    /* ... */
}

static void g(void) {     /* 文件作用域,内部链接 */
    /* ... */
}
```

文件作用域标识符在整个翻译单元可见,从声明点开始。

#### 5.2.3 函数原型作用域

```c
int f(int x, int y);      /* x, y 仅在原型内可见,作用域到 ; 结束 */

/* 参数名在原型中可省略 */
int f(int, int);          /* 同样合法 */
```

#### 5.2.4 函数作用域

```c
void f(void) {
    goto end;
    /* ... */
end:
    return;
}
```

标签 (label) 是唯一具有函数作用域的标识符,可以在函数内任意位置引用 (尽管 `goto` 跳过变量初始化是 UB)。

### 5.3 链接性的实战应用

#### 5.3.1 模块化设计

`static` 关键字在文件作用域中是实现信息隐藏 (information hiding) 的关键:

```c
/* stack.c */
#include <stdbool.h>

#define MAX_SIZE 100

static int data[MAX_SIZE];    /* 内部链接,外部不可见 */
static int top = 0;            /* 内部链接 */

bool push(int x) {             /* 外部链接,作为 API */
    if (top >= MAX_SIZE) return false;
    data[top++] = x;
    return true;
}

bool pop(int *x) {             /* 外部链接 */
    if (top == 0) return false;
    *x = data[--top];
    return true;
}
```

```c
/* main.c */
#include <stdbool.h>
#include <stdio.h>

bool push(int x);
bool pop(int *x);

int main(void) {
    push(10);
    push(20);
    int x;
    pop(&x);
    printf("%d\n", x);   /* 20 */
    return 0;
}
```

`data` 与 `top` 完全封装在 `stack.c` 内,`main.c` 无法直接访问,保证了模块不变量 (invariant)。

#### 5.3.2 头文件中的 extern 声明

```c
/* config.h */
#ifndef CONFIG_H
#define CONFIG_H

extern int global_config;       /* 声明,可被多个 .c 文件包含 */
extern const char *app_name;

#endif
```

```c
/* config.c */
#include "config.h"

int global_config = 0;          /* 定义,只在一处 */
const char *app_name = "MyApp";
```

每个使用 `global_config` 的 .c 文件只需 `#include "config.h"`,链接器会自动找到 `config.c` 中的定义。

#### 5.3.3 inline 函数的链接性

C99 引入的 `inline` 函数有三种链接形式,容易混淆:

```c
/* file1.c */
inline int square(int x) {       /* 普通内联,外部链接 */
    return x * x;
}

/* file2.c */
extern inline int square(int);   /* 提供外部定义 */

/* file3.c */
static inline int cube(int x) {  /* 静态内联,内部链接 */
    return x * x * x;
}
```

C 的 `inline` 规则比 C++ 复杂,详见《内联函数与宏》章节。

### 5.4 存储类说明符一览

| 关键字 | 存储期 | 链接性 | 备注 |
|--------|--------|--------|------|
| `auto` | 自动 | 无 | C 起为默认,C23 改为类型推导 |
| `register` | 自动 | 无 | C 起被忽略,C23 删除 |
| `static` | 静态 | 内部 (文件作用域) / 无 (块作用域) | 多义关键字 |
| `extern` | 静态 | 外部 | 引用别处定义 |
| `_Thread_local` | 线程 | 同文件作用域默认 | C11+ |
| `typedef` | N/A | N/A | 类型别名,非存储类 |

### 5.5 同一标识符的多重属性

变量的"行为"由四个属性共同决定:类型、存储期、作用域、链接性。下表列举几种常见组合:

```c
/* 文件作用域 */
int a;                       /* int | static | file | external */
static int b;                /* int | static | file | internal */
extern int c;                /* int | static | file | external (引用) */

/* 块作用域 */
void f(void) {
    int x;                   /* int | automatic | block | no */
    static int y;            /* int | static | block | no */
    extern int z;            /* int | static | block | external (引用) */
    _Thread_local int w;     /* int | thread | block | no */
}
```

## 第 6 章 内存模型与对象布局

### 6.1 C 的抽象机器模型

C 标准定义了一台"抽象机器",程序的行为以这台机器为参照。编译器只要保证"可观察行为 (observable behavior)"与抽象机器一致,可以进行任意优化。这就是"as-if 规则"。

C11 引入的内存模型 (memory model) 定义了:

- **对象 (object)**:由一个或多个字节构成的存储区域
- **字节 (byte)**:至少 8 位,可表示基本字符集
- **位 (bit)**:基本存储单元,值为 0 或 1
- **存储值 (value representation)**:对象中位的语义解释

### 6.2 字节序 (Endianness)

多字节对象在内存中的字节顺序由实现定义:

- **大端 (Big-Endian, BE)**:最高有效字节 (MSB) 在最低地址
- **小端 (Little-Endian, LE)**:最低有效字节 (LSB) 在最低地址

例如 `uint32_t x = 0x01020304;`:

```
大端:
地址:  0x00  0x01  0x02  0x03
内容:  0x01  0x02  0x03  0x04

小端:
地址:  0x00  0x01  0x02  0x03
内容:  0x04  0x03  0x02  0x01
```

检测字节序的常用方法:

```c
#include <stdint.h>
#include <stdio.h>

int main(void) {
    uint32_t x = 0x01020304;
    char *p = (char *)&x;
    if (*p == 0x01) {
        printf("Big-Endian\n");
    } else if (*p == 0x04) {
        printf("Little-Endian\n");
    } else {
        printf("Unknown Endianness\n");
    }
    return 0;
}
```

或使用 union:

```c
union {
    uint32_t i;
    uint8_t  c[4];
} u = { 0x01020304 };
/* u.c[0] == 0x01 ? BE : LE */
```

x86/x86-64 是小端,ARM 默认小端 (可配置),PowerPC 历史上大端 (现代小端)。网络字节序 (network byte order) 是大端,通过 `htonl` / `ntohl` 转换。

### 6.3 对齐 (Alignment)

每种类型都有对齐要求,即其对象的地址必须是某个值的倍数:

| 类型 | 典型对齐 (32 位) | 典型对齐 (64 位) |
|------|------------------|------------------|
| `char` | 1 | 1 |
| `short` | 2 | 2 |
| `int` | 4 | 4 |
| `long` | 4 | 8 (Linux/macOS), 4 (Windows) |
| `long long` | 8 | 8 |
| `float` | 4 | 4 |
| `double` | 8 | 8 |
| `long double` | 12 | 16 |
| 指针 | 4 | 8 |

对齐由 `alignof` (C11 `_Alignof`) 查询:

```c
#include <stdalign.h>
printf("%zu\n", alignof(int));        /* 通常 4 */
printf("%zu\n", alignof(long double)); /* 通常 16 */
```

C11 起可以显式指定对齐:

```c
alignas(16) int buffer[256];   /* 16 字节对齐,适合 SIMD */
_Alignas(64) int cache_line;   /* 64 字节对齐,缓存行 */
```

未对齐访问在某些架构 (如 ARM、SPARC) 上会触发总线错误 (bus error),在 x86 上虽能工作但性能下降。

### 6.4 结构体内存布局

```c
struct S {
    char  a;     /* 1 字节,偏移 0 */
    int   b;     /* 4 字节,偏移 4 (3 字节填充) */
    char  c;     /* 1 字节,偏移 8 */
    /* 总大小:12 字节 (b 后 3 字节填充以满足结构体对齐 4) */
};
```

结构体大小是其最大成员对齐的倍数。可以通过 `offsetof` 查询成员偏移:

```c
#include <stddef.h>
printf("a: %zu\n", offsetof(struct S, a));   /* 0 */
printf("b: %zu\n", offsetof(struct S, b));   /* 4 */
printf("c: %zu\n", offsetof(struct S, c));   /* 8 */
printf("sizeof: %zu\n", sizeof(struct S));   /* 12 */
```

减少填充的技巧:按对齐从大到小排列成员。

```c
struct Optimized {
    int   b;     /* 偏移 0 */
    char  a;     /* 偏移 4 */
    char  c;     /* 偏移 5 */
    /* 总大小:8 字节 */
};
```

更深入的讨论见《对齐与内存布局》章节。

### 6.5 位域 (Bit Field)

```c
struct Flags {
    unsigned int a : 1;   /* 1 位 */
    unsigned int b : 3;   /* 3 位 */
    unsigned int c : 4;   /* 4 位 */
    /* 共 8 位,1 字节 (但通常占 4 字节,int 对齐) */
};
```

位域的内存布局是实现定义的,跨平台时需谨慎。详见《位运算与位域》章节。

### 6.6 volatile 与硬件寄存器

`volatile` 告诉编译器:对象的值可能在程序控制流之外被改变,禁止将访问优化掉。

```c
volatile int *hw_reg = (volatile int *)0x40021000;
*hw_reg = 0x01;            /* 必须实际写入硬件 */
int val = *hw_reg;         /* 必须实际读取硬件 */
```

不加 `volatile`,编译器可能将写入合并或删除:

```c
int *reg = (int *)0x40021000;
*reg = 0x01;
*reg = 0x02;
/* 编译器可能优化为只执行 *reg = 0x02 */
```

`volatile` 的常见用途:

- 内存映射 I/O (Memory-Mapped I/O, MMIO)
- 信号处理函数中访问的全局变量
- `setjmp` / `longjmp` 跨越的局部变量
- 多线程中的"标志位" (但 C11 起应使用 `_Atomic`)

注意:`volatile` 不提供原子性,也不提供内存顺序保证。多线程同步应使用 `_Atomic` 或互斥锁。

## 第 7 章 实战示例与工程模式

### 7.1 模式 1:模块化全局配置

```c
/* config.h */
#ifndef CONFIG_H
#define CONFIG_H

#include <stddef.h>

typedef struct {
    int   max_connections;
    int   port;
    const char *host;
    int   debug_mode;
} config_t;

extern const config_t g_config;   /* 全局只读配置 */

const config_t *config_get(void);
void config_dump(void);

#endif
```

```c
/* config.c */
#include "config.h"
#include <stdio.h>

const config_t g_config = {
    .max_connections = 100,
    .port            = 8080,
    .host            = "127.0.0.1",
    .debug_mode      = 1,
};

const config_t *config_get(void) {
    return &g_config;
}

void config_dump(void) {
    printf("=== Configuration ===\n");
    printf("max_connections: %d\n", g_config.max_connections);
    printf("host:port: %s:%d\n", g_config.host, g_config.port);
    printf("debug_mode: %d\n", g_config.debug_mode);
}
```

### 7.2 模式 2:单例模式 (Singleton)

```c
/* logger.h */
#ifndef LOGGER_H
#define LOGGER_H

typedef struct logger {
    int level;
    int lines_written;
} logger_t;

logger_t *logger_instance(void);
void logger_log(const char *msg);

#endif
```

```c
/* logger.c */
#include "logger.h"
#include <stdio.h>

static logger_t g_logger = { .level = 1, .lines_written = 0 };

logger_t *logger_instance(void) {
    return &g_logger;
}

void logger_log(const char *msg) {
    if (g_logger.level > 0) {
        printf("[LOG] %s\n", msg);
        g_logger.lines_written++;
    }
}
```

### 7.3 模式 3:常量的多种实现对比

```c
#include <stdio.h>

/* 1. 宏常量:无类型,无作用域 */
#define MAX_BUF 256

/* 2. 枚举常量:仅整数,有作用域,可用作常量表达式 */
enum {
    MAX_CONN = 100,
    TIMEOUT_MS = 5000,
};

/* 3. const 对象:有类型,有地址,不可用作数组大小 (C 中) */
const int MAX_RETRY = 3;

/* 4. C23 constexpr:真正编译期常量,任意类型 */
#if __STDC_VERSION__ >= 202311L
constexpr double PI = 3.14159265358979;
constexpr const char *APP_NAME = "MyApp";
#endif

int main(void) {
    char buf[MAX_BUF];                /* 合法:宏常量是字面量 */
    int conns[MAX_CONN];              /* 合法:枚举常量 */
    int retries[MAX_RETRY];           /* 非法!const 对象不是常量表达式 */
    
    (void)buf; (void)conns;
    return 0;
}
```

### 7.4 模式 4:线程本地存储

```c
#include <stdatomic.h>
#include <stdio.h>
#include <threads.h>

_Thread_local int thread_id;
_Thread_local char thread_name[32];

int worker(void *arg) {
    int id = *(int *)arg;
    thread_id = id;
    snprintf(thread_name, sizeof(thread_name), "worker-%d", id);
    
    printf("Thread %s (id=%d) running\n", thread_name, thread_id);
    return 0;
}

int main(void) {
    thrd_t t1, t2;
    int id1 = 1, id2 = 2;
    thrd_create(&t1, worker, &id1);
    thrd_create(&t2, worker, &id2);
    thrd_join(t1, NULL);
    thrd_join(t2, NULL);
    return 0;
}
```

### 7.5 模式 5:类型安全的常量

C 没有真正的类型安全常量,但可以通过技巧模拟:

```c
/* 使用 typedef 与 enum 实现类型安全 */
typedef enum { RED, GREEN, BLUE } color_t;
typedef enum { MON, TUE, WED, THU, FRI, SAT, SUN } day_t;

void paint(color_t c);    /* 只接受 color_t */
void schedule(day_t d);   /* 只接受 day_t */

int main(void) {
    paint(RED);    /* 合法 */
    paint(MON);    /* 警告 (虽然 enum 本质是 int,编译器可能放行) */
    return 0;
}
```

### 7.6 模式 6:字符串常量的国际化

```c
#include <stdio.h>
#include <libintl.h>     /* GNU gettext */

#define _(s) gettext(s)

int main(void) {
    setlocale(LC_ALL, "");
    bindtextdomain("myapp", "/usr/share/locale");
    textdomain("myapp");
    
    printf("%s\n", _("Hello, world!"));   /* 可被翻译 */
    return 0;
}
```

### 7.7 模式 7:配置表驱动设计

```c
#include <stdio.h>

typedef struct {
    const char *name;
    int         value;
    const char *description;
} config_entry_t;

static const config_entry_t config_table[] = {
    { "max_conn",    100,    "Maximum concurrent connections" },
    { "port",        8080,   "Server port" },
    { "timeout_ms",  5000,   "Request timeout in ms" },
    { "debug",       1,      "Enable debug mode" },
};

#define CONFIG_TABLE_SIZE (sizeof(config_table) / sizeof(config_table[0]))

int config_get(const char *name) {
    for (size_t i = 0; i < CONFIG_TABLE_SIZE; i++) {
        if (strcmp(config_table[i].name, name) == 0) {
            return config_table[i].value;
        }
    }
    return -1;
}

void config_print_all(void) {
    printf("%-15s %-8s %s\n", "Name", "Value", "Description");
    for (size_t i = 0; i < CONFIG_TABLE_SIZE; i++) {
        printf("%-15s %-8d %s\n",
               config_table[i].name,
               config_table[i].value,
               config_table[i].description);
    }
}
```

## 第 8 章 常见陷阱与未定义行为

### 8.1 未初始化的自动变量

```c
#include <stdio.h>

int main(void) {
    int x;                  /* 未初始化 */
    printf("%d\n", x);      /* UB!可能输出任何值 */
    return 0;
}
```

GCC 提供 `-Wuninitialized` 警告,但仅能检测简单的局部情况。最佳实践:声明时即初始化。

### 8.2 误以为 const 是常量表达式

```c
const int N = 100;
int arr[N];              /* C 中非法!C++ 中合法 */

/* 解决方案 1:用 enum */
enum { N = 100 };
int arr[N];              /* 合法 */

/* 解决方案 2:用 #define */
#define N 100
int arr[N];              /* 合法 */

/* 解决方案 3:C23 constexpr */
constexpr int N = 100;   /* C23 */
int arr[N];              /* 合法 */
```

### 8.3 修改字符串字面量

```c
char *s = "hello";
s[0] = 'H';              /* UB!段错误 */
```

正确做法:

```c
char s[] = "hello";      /* 在栈上创建副本 */
s[0] = 'H';              /* 合法 */
```

### 8.4 误用指针星号位置

```c
int* a, b;               /* b 是 int,不是 int* */
```

正确做法:

```c
int *a;
int *b;
```

### 8.5 跨翻译单元的初始化顺序

```c
/* a.c */
int x = y + 1;           /* y 在另一个翻译单元,初始化顺序未指定 */

/* b.c */
int y = 10;
```

C 标准未规定跨翻译单元静态变量的初始化顺序。最佳实践:避免跨翻译单元依赖,改用函数延迟初始化。

### 8.6 返回栈上变量的地址

```c
int *f(void) {
    int x = 42;
    return &x;            /* UB!栈释放后地址失效 */
}
```

正确做法:

```c
int *f(void) {
    int *p = malloc(sizeof(int));
    if (p) *p = 42;
    return p;
}
```

### 8.7 修改 const 对象

```c
const int x = 10;
int *p = (int *)&x;
*p = 20;                  /* UB! */
```

虽然语法允许强制转换,但修改 const 对象是 UB。编译器可能将 const 对象放在只读段,导致段错误;或者优化掉读取,导致读到旧值。

### 8.8 整数溢出

```c
int x = INT_MAX;
x = x + 1;                /* 有符号整数溢出是 UB */
                          /* 无符号整数溢出是定义良好的回绕 */
```

C23 引入了 `__builtin_add_overflow` 等内建函数检测溢出,也可用 `<stdckdint.h>`:

```c
#include <stdckdint.h>

int a = INT_MAX, b = 1, c;
if (ckd_add(&c, a, b)) {
    /* 溢出 */
} else {
    /* c = a + b */
}
```

### 8.9 类型双关 (Type Punning) 陷阱

```c
int x = 0x3F800000;       /* 1.0f 的位模式 */
float f = *(float *)&x;  /* UB:违反严格别名规则 */
```

C 中安全的方式是使用 union (C 标准允许 union 进行类型双关):

```c
union { int i; float f; } u;
u.i = 0x3F800000;
float f = u.f;            /* 合法 */
```

或使用 `memcpy`:

```c
int x = 0x3F800000;
float f;
memcpy(&f, &x, sizeof(f));  /* 合法,优化为零开销 */
```

### 8.10 字符串字面量修改的"伪修复"

某些古老代码在 DOS 时代可以工作,因为那时字符串字面量放在可写数据段。现代操作系统将字符串字面量放在只读段,运行时会段错误。这是从 K&R 时代到现代 C 的常见迁移问题。

### 8.11 函数指针与数据指针混淆

```c
int x = 42;
int (*fp)(void) = (int (*)(void))&x;
fp();                     /* UB! */
```

C 标准不保证函数指针与数据指针大小相同或可互换。

### 8.12 严格的别名规则 (Strict Aliasing)

```c
int x = 42;
float *fp = (float *)&x;
*fp = 3.14f;              /* UB!违反严格别名 */
```

C 标准规定,不同类型的指针不能指向同一对象 (少数例外:char*, 兼容类型, union 等)。违反严格别名规则是 UB,可能导致编译器优化出意外结果。

### 8.13 静态变量初始化的非常量表达式

```c
int compute(void) { return 42; }
static int x = compute();  /* 非法!静态变量必须用常量表达式初始化 */
```

### 8.14 register 关键字的现代含义

```c
register int x = 42;
int *p = &x;              /* C 起非法!register 变量不可取地址 */
                          /* C 起被忽略,可取地址 */
                          /* C23 起被删除 */
```

### 8.15 VLA 的栈溢出

```c
int n = 1000000;
int arr[n];               /* VLA,可能栈溢出 */
```

VLA 大小运行时决定,栈空间有限 (Linux 默认 8MB),大 VLA 极易栈溢出。最佳实践:禁用 VLA,改用 `malloc`。

## 第 9 章 性能影响与优化策略

### 9.1 const 优化的真相

`const` 是否产生优化取决于上下文:

```c
const int x = 42;
int y = x + 1;            /* 编译器知道 x 是 42,常量传播 */

const int *p = &some_var;
int y = *p + 1;           /* 编译器不能假设 *p 不变,因为其他指针可能修改 */
```

`const` 不能保证不可变,只是"承诺不通过此标识符修改"。跨函数调用时,编译器通常保守处理。

### 9.2 字符串字面量池

```c
const char *s1 = "hello";
const char *s2 = "hello";
/* s1 == s2 可能成立:编译器合并相同字面量 */
```

GCC、Clang 默认合并相同字符串字面量,可通过 `-fno-merge-strings` 禁用。

### 9.3 静态变量与缓存

```c
/* 反模式:False Sharing */
static int counters[4];   /* 4 个计数器在同一缓存行 */

/* 优化:缓存行对齐 */
alignas(64) static int counters[4];   /* 每个计数器独占缓存行 */
```

多线程并发修改同一缓存行的不同变量会导致性能急剧下降 (缓存一致性协议开销)。

### 9.4 register 关键字的历史

早期 C 编译器优化能力弱,`register` 是给编译器的提示:"尽量把这个变量放在寄存器中"。现代编译器的寄存器分配算法远比人类精准,`register` 在 C 起被忽略,C23 正式删除。

### 9.5 局部变量 vs 全局变量

```c
/* 反模式:大量全局变量 */
int g_a, g_b, g_c, g_d;

void f(void) {
    g_a = 1; g_b = 2; g_c = 3; g_d = 4;
}
```

全局变量:

- 无法进行跨函数优化 (aliasing 分析困难)
- 阻碍函数并行化
- 缓存可能不友好 (分散在 .data 段)

局部变量:

- 编译器可进行数据流分析
- 寄存器分配灵活
- 栈缓存友好

### 9.6 const 与函数参数

```c
/* 推荐做法 */
size_t strlen(const char *s);
int strcmp(const char *a, const char *b);

/* const 告诉调用者:不会修改你的数据 */
/* 同时帮助编译器优化调用方代码 */
```

### 9.7 restrict 关键字 (C99)

```c
void *memcpy(void *restrict dest, const void *restrict src, size_t n);
```

`restrict` 承诺:在指针生命周期内,其指向的对象不会被其他指针访问。这允许编译器进行更激进的优化:

```c
void add(int *restrict a, const int *restrict b, const int *restrict c, size_t n) {
    for (size_t i = 0; i < n; i++) {
        a[i] = b[i] + c[i];
    }
}
```

无 `restrict` 时,编译器必须考虑 `a`、`b`、`c` 是否重叠,无法进行向量化。有 `restrict` 时,可使用 SIMD 指令加速。

### 9.8 字面量后缀的优化

```c
uint64_t x = 1 << 32;       /* UB!1 是 int,左移溢出 */
uint64_t x = 1ULL << 32;    /* 合法:1ULL 是 unsigned long long */
```

### 9.9 复合字面量的生命周期

```c
/* 块作用域:自动存储期,离开块后失效 */
void f(void) {
    int *p = (int[]){1, 2, 3};
    /* p 在块内有效 */
}

/* 文件作用域:静态存储期,程序全程有效 */
int *p = (int[]){1, 2, 3};
```

### 9.10 字符串字面量的存储

字符串字面量存储在 `.rodata` 段 (只读),程序启动时加载。多个相同字面量通常被合并,节省内存。

```c
const char *months[] = {
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
};
/* 12 个指针 + 12 个字符串,共约 100 字节 */
```

## 第 10 章 编译器实现与跨平台考量

### 10.1 GCC、Clang、MSVC 的差异

| 特性 | GCC | Clang | MSVC |
|------|-----|-------|------|
| C23 支持 | 14+ 部分支持 | 17+ 部分支持 | 不支持 |
| `_Thread_local` | 支持 | 支持 | 不支持 (需 `__declspec(thread)`) |
| `_Atomic` | 支持 | 支持 | 不支持 |
| VLA | 支持 (可禁用) | 支持 (可禁用) | 不支持 |
| `typeof` | 扩展支持 | 扩展支持 | 不支持 |
| 复合字面量 | 支持 | 支持 | C99 起支持 |

### 10.2 跨平台头文件

```c
/* portability.h */
#ifndef PORTABILITY_H
#define PORTABILITY_H

#if defined(_WIN32)
    #define PLATFORM_WINDOWS 1
    #define THREAD_LOCAL __declspec(thread)
#elif defined(__linux__)
    #define PLATFORM_LINUX 1
    #define THREAD_LOCAL _Thread_local
#elif defined(__APPLE__)
    #define PLATFORM_MACOS 1
    #define THREAD_LOCAL _Thread_local
#endif

#if defined(_MSC_VER)
    #define inline __inline
    #define alignof _Alignof
#endif

#endif
```

### 10.3 整数类型的可移植性

`int` 的大小因平台而异 (16/32/64 位)。需要精确宽度时使用 `<stdint.h>`:

```c
#include <stdint.h>

int8_t   a;     /* 8 位有符号 */
int16_t  b;     /* 16 位有符号 */
int32_t  c;     /* 32 位有符号 */
int64_t  d;     /* 64 位有符号 */
uint8_t  e;     /* 8 位无符号 */
uint16_t f;     /* 16 位无符号 */
uint32_t g;     /* 32 位无符号 */
uint64_t h;     /* 64 位无符号 */

intptr_t  i;    /* 能容纳指针的整数 */
uintptr_t j;    /* 能容纳指针的无符号整数 */

size_t    k;    /* sizeof 的返回类型 */
ptrdiff_t l;    /* 指针减法的结果类型 */
```

### 10.4 静态变量的初始化顺序

```c
/* C 中,同一翻译单元内的静态变量按定义顺序初始化 */
/* 跨翻译单元的初始化顺序未指定 */

/* 解决方案:延迟初始化 (Meyer's Singleton) */
static config_t *get_config(void) {
    static config_t instance = {0};
    /* C11 起线程安全 */
    return &instance;
}
```

注意:C11 起的"线程安全静态局部变量初始化"是 POSIX 系统的标准行为,但 MSVC 也有类似保证。

### 10.5 字节序无关代码

```c
#include <stdint.h>

/* 方法 1:每次显式转换 */
uint32_t read_be32(const uint8_t *p) {
    return ((uint32_t)p[0] << 24) |
           ((uint32_t)p[1] << 16) |
           ((uint32_t)p[2] << 8)  |
           ((uint32_t)p[3]);
}

/* 方法 2:使用 htonl/ntohl (POSIX) */
#include <arpa/inet.h>
uint32_t net_val = htonl(host_val);
uint32_t host_val = ntohl(net_val);
```

### 10.6 编译器特定扩展

```c
/* GCC/Clang:__attribute__ */
__attribute__((aligned(16))) int buffer[256];
__attribute__((packed)) struct Packed { char a; int b; };

/* MSVC:__declspec */
__declspec(align(16)) int buffer[256];
#pragma pack(push, 1)
struct Packed { char a; int b; };
#pragma pack(pop)
```

C23 引入了标准化的属性语法:

```c
[[deprecated("use new_func instead")]]
void old_func(void);

[[nodiscard]] int compute(void);

[[fallthrough]] void switch_case(void);
```

## 第 11 章 高级主题与 C 标准演进

### 11.1 C11 `_Generic` 与类型泛型

```c
#include <stdio.h>

#define print(x) _Generic((x), \
    int:    print_int, \
    float:  print_float, \
    double: print_double, \
    default: print_unknown \
)(x)

void print_int(int x)         { printf("int: %d\n", x); }
void print_float(float x)     { printf("float: %f\n", x); }
void print_double(double x)   { printf("double: %lf\n", x); }
void print_unknown(void *x)   { printf("unknown\n"); }

int main(void) {
    print(42);        /* int: 42 */
    print(3.14f);     /* float: 3.140000 */
    print(3.14);      /* double: 3.140000 */
    return 0;
}
```

### 11.2 C23 constexpr 详解

```c
/* 整数常量 */
constexpr int MAX = 100;
int arr[MAX];                   /* 合法 */

/* 浮点常量 */
constexpr double PI = 3.14159265358979;

/* 指针常量 */
constexpr const char *VERSION = "1.0.0";

/* 用作 case 标签 */
enum { SMALL, MEDIUM, LARGE };
constexpr int large_size = 100;
switch (size) {
    case large_size: /* 合法 */
        break;
}
```

`constexpr` 与 `const` 的区别:

| 特性 | const | constexpr (C23) |
|------|-------|-----------------|
| 不可修改 | 是 | 是 |
| 可用作常量表达式 | 否 (C 中) | 是 |
| 有地址 | 是 | 是 |
| 可用作数组大小 | 否 (C 中) | 是 |
| 可用作 case 标签 | 否 (C 中) | 是 |
| 任意类型 | 是 | 是 |

### 11.3 C23 `_BitInt(N)`

```c
_BitInt(7) small;       /* 7 位有符号整数,范围 -64 到 63 */
unsigned _BitInt(8) byte; /* 8 位无符号,0 到 255 */

constexpr _BitInt(128) huge = 1 << 100;  /* 128 位整数 */
```

`_BitInt(N)` 提供任意位宽整数,适合协议解析、加密算法等场景。

### 11.4 C23 `#embed`

```c
/* 将文件嵌入为常量数组 */
const unsigned char icon[] = {
    #embed "icon.png"
};

/* 等价于 */
const unsigned char icon[] = {
    0x89, 0x50, 0x4E, 0x47, /* ... 文件字节 ... */
};
```

`#embed` 避免了用工具脚本生成数据数组的繁琐。

### 11.5 C23 `auto` 类型推导

```c
/* C23: auto 推导类型 */
auto x = 42;             /* int */
auto y = 3.14;           /* double */
auto z = &x;             /* int* */

/* 注意:C 的 auto 与 C++ 不同,只能用于变量声明带初始化 */
auto p;                  /* 非法!必须有初始化 */
```

### 11.6 C23 `typeof` 与 `typeof_unqual`

```c
int x = 42;
typeof(x) y = 10;        /* y 是 int */
const int *p = &x;
typeof(p) q = &y;        /* q 是 const int* */
typeof_unqual(p) r = &y; /* r 是 int*,去除了 const */
```

### 11.7 原子变量 (_Atomic)

```c
#include <stdatomic.h>

atomic_int counter = 0;    /* 原子 int */

void increment(void) {
    atomic_fetch_add(&counter, 1);   /* 原子加 */
}

int get(void) {
    return atomic_load(&counter);    /* 原子读 */
}
```

`_Atomic` 提供原子操作与内存顺序保证,详见《原子操作与内存模型》章节。

### 11.8 C23 零初始化

```c
int x{};        /* C23:零初始化,等价于 int x = 0; */
int arr[10]{};  /* 全部零初始化 */
struct S s{};   /* 所有成员零初始化 */
```

### 11.9 C2y 展望

C2y (C 的下一个版本,预计 2027 年)正在讨论的特性:

- 更强的类型检查
- 模式匹配 (类似 Rust)
- defer 关键字 (类似 Go)
- 错误处理的标准化
- 更完善的字符集支持

## 第 12 章 总结、最佳实践与延伸阅读

### 12.1 核心知识图谱

```
变量与常量
├── 变量
│   ├── 类型 (type)
│   │   ├── 基本类型 (int, char, float, double, void)
│   │   ├── 派生类型 (指针, 数组, 函数, 结构体, 联合体)
│   │   └── 限定符 (const, volatile, restrict, _Atomic)
│   ├── 存储期 (storage duration)
│   │   ├── 自动 (auto, register)
│   │   ├── 静态 (static, extern)
│   │   ├── 线程 (_Thread_local)
│   │   └── 动态 (malloc/calloc/realloc/free)
│   ├── 作用域 (scope)
│   │   ├── 块作用域
│   │   ├── 文件作用域
│   │   ├── 函数原型作用域
│   │   └── 函数作用域
│   └── 链接性 (linkage)
│       ├── 无链接
│       ├── 内部链接 (static)
│       └── 外部链接 (extern)
└── 常量
    ├── 字面量 (literal)
    ├── const 对象
    ├── 枚举常量 (enum)
    ├── 宏常量 (#define)
    └── constexpr (C23)
```

### 12.2 最佳实践清单

#### 12.2.1 命名规范

- 全局变量加 `g_` 前缀
- 静态变量加 `s_` 前缀
- 常量全大写,下划线分隔 (`MAX_BUFFER_SIZE`)
- 局部变量小写,下划线分隔 (`buffer_size`)
- 类型名首字母大写 (`typedef struct Point Point;`)

#### 12.2.2 初始化习惯

- 自动变量声明时即初始化
- 静态变量显式零初始化 (虽然默认是 0,但显式更清晰)
- 全局变量用 `const` 或 `constexpr` 而非 `#define`
- 数组用 `{0}` 初始化为零

#### 12.2.3 作用域控制

- 变量声明尽量靠近首次使用位置
- 用 `static` 实现文件级封装
- 避免全局可变变量
- 函数参数用 `const` 标注只读参数

#### 12.2.4 const 使用

- 函数参数:只读指针参数用 `const T *`
- 函数返回值:不修改对象的返回 `const T *`
- 全局常量:用 `constexpr` (C23) 或 `enum` 而非 `#define`
- 局部变量:能加 const 就加,帮助编译器优化

#### 12.2.5 内存安全

- 不要返回栈变量地址
- 不要修改字符串字面量
- 不要修改 const 对象
- 用 `_Atomic` 而非 `volatile` 做多线程同步
- 用 `static_assert` 检查关键不变量

### 12.3 常用编译选项

```bash
# 启用所有警告
gcc -Wall -Wextra -Wpedantic ...

# 启用 shadow 警告 (变量隐藏)
gcc -Wshadow ...

# 启用未初始化警告
gcc -Wuninitialized -Wmaybe-uninitialized ...

# 启用严格标准
gcc -std=c11 -pedantic-errors ...
gcc -std=c23 -pedantic-errors ...   # C23

# 启用地址 sanitizer (检测内存错误)
gcc -fsanitize=address ...

# 启用未定义行为 sanitizer
gcc -fsanitize=undefined ...

# 启用控制流完整性
gcc -fsanitize=cfi ...
```

### 12.4 静态分析工具

| 工具 | 特点 | 适用场景 |
|------|------|----------|
| cppcheck | 轻量级,无执行开销 | CI 集成 |
| clang-tidy | Clang 工具链,可修复 | 代码风格、最佳实践 |
| clang-analyzer | Clang 静态分析器 | 深度分析 |
| Coverity | 商业工具,工业级 | 大型项目 |
| PVS-Studio | 商业工具,规则丰富 | 工业、嵌入式 |
| gcc -fanalyzer | GCC 内置 | 简单集成 |

详见《静态分析与调试》章节。

### 12.5 延伸阅读

#### 12.5.1 标准

- ISO/IEC 9899:2018 (C17):当前最广泛支持的标准
- ISO/IEC 9899:2024 (C23):最新标准,GCC 14+、Clang 17+ 部分支持
- C2y 草案:仍在讨论中

#### 12.5.2 经典教材

- 《The C Programming Language》第二版,Brian Kernighan & Dennis Ritchie 著 (K&R)
- 《C Primer Plus》第六版,Stephen Prata 著,适合入门
- 《Effective C》Robert Seacord 著,现代 C 实践
- 《Modern C》第二版,Jens Gustedt 著,免费 PDF
- 《C: A Reference Manual》第五版,Harbison & Steele 著

#### 12.5.3 进阶与系统编程

- 《Expert C Programming: Deep C Secrets》Peter van der Linden 著
- 《Advanced C Programming by Example》John Perry 著
- 《Pointers on C》Kenneth Reek 著
- 《21st Century C》第二版,Ben Klemens 著

#### 12.5.4 安全与可靠性

- 《Secure Coding in C and C++》Robert Seacord 著,CERT 标准
- 《Cryptography in C and C++》Michael Welschenbach 著

#### 12.5.5 在线资源

- cppreference.com:C 标准库参考,更新及时
- gcc.gnu.org/onlinedocs/:GCC 官方文档
- clang.llvm.org/docs/:Clang 官方文档
- iso-9899.info:C 标准草案汇总
- comp.lang.c:历史悠久的 C 新闻组

### 12.6 学习路径总结

#### 入门阶段 (1-2 个月)

1. 阅读 K&R 或《C Primer Plus》,完成所有练习
2. 理解变量、类型、运算符、控制流
3. 编写小型程序 (计算器、链表、文件读写)
4. 学习使用 GCC 或 Clang 编译运行

#### 进阶阶段 (3-6 个月)

1. 阅读《Expert C Programming》《Pointers on C》
2. 理解指针、数组、内存布局、函数指针
3. 学习动态内存管理、结构体、文件 I/O
4. 编写中型项目 (简易 shell、HTTP 服务器、JSON 解析器)

#### 高级阶段 (6 个月以上)

1. 阅读 C 标准 (至少 N1570 草案)
2. 学习多线程、原子操作、内存模型
3. 学习编译器扩展、内联汇编
4. 阅读开源项目代码 (Redis、SQLite、Linux Kernel 部分)
5. 关注 C23/C2y 新特性,持续学习

### 12.7 结语

变量与常量看似简单,实则蕴含了 C 语言最深刻的设计哲学。从 BCPL 的无类型变量到 C23 的 `constexpr`,每一次演进都反映了硬件发展、软件工程实践与编程语言理论的综合进步。

掌握变量与常量,不仅是掌握 C 语言的语法,更是理解:

- 程序如何在内存中运行
- 编译器如何翻译我们的代码
- 操作系统如何管理进程的内存
- 硬件如何执行我们的指令

这些底层理解,是从"会写 C 代码"到"理解 C 代码"的关键一步。希望本文档能够帮助你建立坚实的认知基础,在系统编程的道路上走得更远。

### 12.8 速查附录

#### 12.8.1 类型大小 (LP64 模型)

| 类型 | 大小 (字节) | 范围 |
|------|-------------|------|
| `char` | 1 | -128 ~ 127 或 0 ~ 255 |
| `short` | 2 | -32768 ~ 32767 |
| `int` | 4 | -2^31 ~ 2^31-1 |
| `long` | 8 (Linux/macOS) / 4 (Windows) | -2^63 ~ 2^63-1 |
| `long long` | 8 | -2^63 ~ 2^63-1 |
| `float` | 4 | ±3.4e±38 |
| `double` | 8 | ±1.7e±308 |
| `long double` | 16 | 平台相关 |
| 指针 | 8 (64 位) / 4 (32 位) | N/A |

#### 12.8.2 类型限定符速查

| 限定符 | 作用 | 示例 |
|--------|------|------|
| `const` | 只读 | `const int x = 10;` |
| `volatile` | 禁止优化 | `volatile int *reg;` |
| `restrict` | 无别名承诺 (C99) | `void *memcpy(void *restrict, ...)` |
| `_Atomic` | 原子 (C11) | `_Atomic int counter;` |

#### 12.8.3 存储类速查

| 关键字 | 作用 | 备注 |
|--------|------|------|
| `auto` | 自动存储期 | C 起为默认,C23 改为类型推导 |
| `register` | 寄存器提示 | C 起被忽略,C23 删除 |
| `static` | 静态存储期 / 内部链接 | 多义关键字 |
| `extern` | 外部链接 | 引用别处定义 |
| `_Thread_local` | 线程存储期 | C11+ |
| `typedef` | 类型别名 | 非存储类,语法上属于此类 |

#### 12.8.4 常量定义方式对比

| 方式 | 类型 | 作用域 | 地址 | 用作数组大小 | C23 推荐 |
|------|------|--------|------|--------------|----------|
| `#define N 100` | 无 | 全局 | 无 | 是 | 否 |
| `enum { N = 100 };` | int | 文件/块 | 无 | 是 | 否 |
| `const int N = 100;` | int | 文件/块 | 有 | 否 (C 中) | 否 |
| `constexpr int N = 100;` | int | 文件/块 | 有 | 是 | 是 |

#### 12.8.5 常见未定义行为 (UB)

| UB 类型 | 示例 | 后果 |
|---------|------|------|
| 未初始化读取 | `int x; printf("%d", x);` | 不确定值 |
| 修改 const 对象 | `*(int *)&const_var = 1;` | 段错误 / 不变 |
| 修改字符串字面量 | `char *s = "x"; s[0] = 'y';` | 段错误 |
| 有符号整数溢出 | `INT_MAX + 1` | 不确定 |
| 返回栈地址 | `return &local_var;` | 悬空指针 |
| 严格别名违规 | `*(float *)&int_var = 1.0f;` | 优化异常 |
| 函数指针/数据指针混淆 | `((void(*)(void))&int_var)();` | 崩溃 |
| 静态变量非常量初始化 | `static int x = func();` | 编译错误 |

#### 12.8.6 编译命令速查

```bash
# 基本
gcc -o prog prog.c
gcc -std=c11 -Wall -Wextra -o prog prog.c

# 调试
gcc -g -O0 -fsanitize=address,undefined -o prog prog.c

# 优化
gcc -O2 -march=native -o prog prog.c
gcc -O3 -flto -march=native -o prog prog.c

# 静态分析
gcc -fanalyzer -o prog prog.c
cppcheck --enable=all prog.c
clang-tidy prog.c -- -std=c11

# 查看预处理结果
gcc -E prog.c -o prog.i

# 查看汇编
gcc -S -O2 prog.c -o prog.s

# 查看内存布局
objdump -h prog
readelf -S prog
```

#### 12.8.7 调试器常用命令

```
# GDB
gcc -g -o prog prog.c
gdb ./prog

(gdb) break main
(gdb) run
(gdb) next
(gdb) step
(gdb) print x
(gdb) print &x
(gdb) display x
(gdb) info locals
(gdb) info globals
(gdb) backtrace
(gdb) frame 2
(gdb) continue
(gdb) quit
```

#### 12.8.8 内存布局示意

```
高地址
┌─────────────────┐
│  Kernel space   │  操作系统保留
├─────────────────┤
│  Stack          │  局部变量,向下增长
│  ↓              │
│                 │
│  ↑              │
│  Heap           │  malloc 分配,向上增长
├─────────────────┤
│  .bss           │  未初始化全局/静态变量
├─────────────────┤
│  .data          │  已初始化全局/静态变量
├─────────────────┤
│  .rodata        │  字符串字面量,const 全局
├─────────────────┤
│  .text          │  代码段
└─────────────────┘
低地址
```

#### 12.8.9 关键字一览 (C23)

```
auto        break      case       char       const      continue
default     do         double     else       enum       extern
float       for        goto       if         inline     int
long        register   restrict   return     short      signed
sizeof      static     struct     switch     typedef    union
unsigned    void       volatile   while

_Bool       _Complex    _Imaginary  (C99)
_Alignas    _Alignof    _Atomic     _Generic   _Noreturn   (C11)
_Static_assert  _Thread_local
constexpr   _BitInt     _Decimal128  true  false  (C23)
nullptr     static_assert  thread_local  alignas  alignof  (C23)
typeof      typeof_unqual  bool  (C23)
```

#### 12.8.10 类型推导示例

```c
/* C23 auto */
auto x = 42;             /* int */
auto y = 3.14;           /* double */
auto z = &x;             /* int* */
auto w = (long)42;       /* long */

/* C23 typeof */
int a = 42;
typeof(a) b = 10;        /* int */

/* C23 decltype (推迟到 C2y?) */
/* decltype(a) c = 10; */

/* 组合使用 */
#define SWAP(a, b) do { \
    typeof(a) _tmp = (a); \
    (a) = (b); \
    (b) = _tmp; \
} while (0)
```

#### 12.8.11 常用宏

```c
#include <stddef.h>

NULL            /* 空指针 */
offsetof(type, member)   /* 成员偏移 */
size_t          /* sizeof 的返回类型 */
ptrdiff_t       /* 指针减法结果类型 */

#include <stdint.h>
INT8_MAX, INT8_MIN        /* int8_t 范围 */
INT32_MAX, INT32_MIN
UINT32_MAX
PTRDIFF_MAX
SIZE_MAX

#include <limits.h>
CHAR_BIT      /* 字节位数 (通常 8) */
INT_MAX, INT_MIN
LONG_MAX, LONG_MIN

#include <float.h>
FLT_MAX, FLT_MIN
DBL_MAX, DBL_MIN
FLT_EPSILON
DBL_EPSILON

#include <stdatomic.h>
ATOMIC_INT_LOCK_FREE      /* atomic_int 是否无锁 */
ATOMIC_POINTER_LOCK_FREE
```

#### 12.8.12 编译期断言

```c
/* C11: _Static_assert */
_Static_assert(sizeof(int) >= 4, "int must be at least 32 bits");
_Static_assert(ATOMIC_INT_LOCK_FREE == 2, "atomic int must be lock-free");

/* C23: static_assert (关键字) */
static_assert(sizeof(int) >= 4);
```

#### 12.8.13 属性语法 (C23)

```c
[[deprecated("use new_func")]] void old_func(void);
[[nodiscard]] int compute(void);
[[maybe_unused]] static int unused_var;
[[fallthrough]] void switch_case(void);
[[noreturn]] void fatal_error(const char *msg);

/* 编译器扩展 */
__attribute__((unused)) int x;
__attribute__((aligned(16))) int buffer[256];
__attribute__((packed)) struct Packed { /* ... */ };
```

#### 12.8.14 字面量前缀与后缀

```c
/* 整数后缀 */
42      /* int */
42U     /* unsigned int */
42L     /* long */
42UL    /* unsigned long */
42LL    /* long long */
42ULL   /* unsigned long long */

/* 浮点后缀 */
3.14    /* double */
3.14f   /* float */
3.14L   /* long double */

/* 整数前缀 */
0x42    /* 十六进制 */
042     /* 八进制 */
0b1010  /* 二进制 (C23) */

/* 字符前缀 */
'A'     /* int (字符常量) */
u'A'    /* char16_t (C11) */
U'A'    /* char32_t (C11) */
L'A'    /* wchar_t */
u8'A'   /* char (C23,之前为 char 也但语义不同) */

/* 字符串前缀 */
"hello"     /* char[6] */
u8"hello"   /* char[6] (C23) */
u"hello"    /* char16_t[6] (C11) */
U"hello"    /* char32_t[6] (C11) */
L"hello"    /* wchar_t[6] */
```

#### 12.8.15 常见错误信息

| 错误信息 | 含义 | 解决方案 |
|---------|------|----------|
| `undefined reference to 'xxx'` | 链接器找不到定义 | 检查 extern 声明与库链接 |
| `multiple definition of 'xxx'` | 同一对象多处定义 | 用 extern 引用,定义只在一处 |
| `conflicting types for 'xxx'` | 声明与定义类型不一致 | 检查头文件声明 |
| `assignment of read-only variable` | 修改 const 对象 | 移除 const 或重新设计 |
| `lvalue required` | 需要 lvalue 但给出 rvalue | 检查赋值号左侧 |
| `variable-sized object may not be initialized` | VLA 不可初始化 | 用循环赋值 |
| `unused variable 'xxx'` | 变量未使用 | 添加 [[maybe_unused]] 或删除 |
| `comparison is always false` | 类型范围不重叠 | 检查比较的两边类型 |

### 12.9 学习笔记模板

```
# 学习笔记:变量与常量

## 我已掌握
- [ ] 变量声明的语法
- [ ] 四种存储期的区别
- [ ] const 的正确使用
- [ ] static 的多义性

## 我有疑问
- [ ] extern "C" 是什么意思?
- [ ] 为什么 C 的 const 不能用作数组大小?
- [ ] volatile 真的能保证线程安全吗?

## 实践项目
- [ ] 写一个使用全局配置的小程序
- [ ] 实现一个线程安全的计数器
- [ ] 用 constexpr 替换项目中的 #define

## 阅读进度
- [ ] K&R 第 1-4 章
- [ ] C Primer Plus 第 3-9 章
- [ ] Expert C Programming 第 1-3 章

## 反思
(写下你自己的理解与疑问)
```

### 12.10 自测题

#### 选择题

1. 下列哪个声明定义了一个指向 `const int` 的指针?
   - A. `const int *p;`
   - B. `int *const p;`
   - C. `const int *const p;`
   - D. A 和 C

   答案:D

2. 下列哪段代码会触发未定义行为?
   - A. `const int N = 10; int arr[N];`
   - B. `char *s = "hello"; s[0] = 'H';`
   - C. `int x; printf("%d", x);`
   - D. 以上都是

   答案:D

3. C23 中,以下哪个关键字可以定义真正的编译期常量?
   - A. `const`
   - B. `static`
   - C. `constexpr`
   - D. `final`

   答案:C

#### 简答题

1. 解释 `static` 在 C 中的三种不同用法。
2. 为什么 C 的 `const int N = 10;` 不能用作数组大小?
3. `_Thread_local` 变量的初始化发生在什么时候?
4. `volatile` 与 `_Atomic` 在多线程中有什么区别?
5. C23 引入 `constexpr` 解决了哪些问题?

#### 编程题

1. 编写一个程序,使用 `enum` 定义一组颜色常量,并实现 `color_to_string` 函数。
2. 实现一个线程安全的单例计数器,使用 `_Thread_local` 和 `_Atomic`。
3. 使用 C23 的 `constexpr`、`auto`、`typeof` 重写以下代码:

```c
#define MAX 100
int arr[MAX];
int sum = 0;
for (int i = 0; i < MAX; i++) {
    sum += arr[i];
}
```

### 12.11 参考答案

#### 12.11.1 简答题答案

1. `static` 的三种用法:
   - 修饰文件作用域变量:内部链接,只在当前翻译单元可见
   - 修饰块作用域变量:静态存储期,生命周期为整个程序运行期,但作用域仍为块内
   - 修饰函数:内部链接,只在当前翻译单元可见

2. C 的 `const` 对象在标准中不被视为常量表达式。这是为了与 C++ 区分,且 C 设计时认为 `const` 对象可能在运行时初始化 (如 `const int n = atoi(argv[1]);`)。C23 的 `constexpr` 修复了这一点。

3. `_Thread_local` 变量的初始化:
   - 静态初始化:线程创建时由运行时库完成 (与全局静态变量类似)
   - 动态初始化:C 不支持 (C 中 `_Thread_local` 变量必须用常量表达式初始化)

4. `volatile` 与 `_Atomic` 的区别:
   - `volatile`:禁止编译器优化,但不保证原子性,不保证内存顺序,不适合多线程同步
   - `_Atomic`:保证原子性,提供内存顺序选项,适合多线程同步

5. `constexpr` 解决的问题:
   - `#define` 无类型、无作用域、不可调试
   - `enum` 只能整数
   - `const` (在 C 中) 不能用作常量表达式
   - `constexpr` 提供了类型安全、有作用域、可调试、可用作常量表达式的解决方案

#### 12.11.2 编程题答案

1. 颜色常量:

```c
#include <stdio.h>

typedef enum {
    RED,
    GREEN,
    BLUE,
    YELLOW,
    BLACK,
    WHITE,
    COLOR_COUNT
} color_t;

const char *color_to_string(color_t c) {
    static const char *names[] = {
        [RED]    = "Red",
        [GREEN]  = "Green",
        [BLUE]   = "Blue",
        [YELLOW] = "Yellow",
        [BLACK]  = "Black",
        [WHITE]  = "White",
    };
    if (c < 0 || c >= COLOR_COUNT) return "Unknown";
    return names[c];
}

int main(void) {
    for (color_t c = RED; c < COLOR_COUNT; c++) {
        printf("%d: %s\n", c, color_to_string(c));
    }
    return 0;
}
```

2. 线程安全单例计数器:

```c
#include <stdatomic.h>
#include <stdio.h>
#include <threads.h>

static _Atomic int counter = 0;

int increment(void *arg) {
    (void)arg;
    atomic_fetch_add(&counter, 1);
    return 0;
}

int main(void) {
    thrd_t threads[10];
    for (int i = 0; i < 10; i++) {
        thrd_create(&threads[i], increment, NULL);
    }
    for (int i = 0; i < 10; i++) {
        thrd_join(threads[i], NULL);
    }
    printf("Counter: %d\n", counter);
    return 0;
}
```

3. C23 重写:

```c
constexpr int MAX = 100;
int arr[MAX];
auto sum = 0;
for (typeof(MAX) i = 0; i < MAX; i++) {
    sum += arr[i];
}
```

### 12.12 学习者常见问题 (FAQ)

#### Q1: 为什么 C 的 `const` 这么"弱"?

A: 历史原因。C89 引入 `const` 时,主要目的是"声明不可修改的接口参数",而非"定义编译期常量"。C++ 在同一时期引入了更强的 `const` 语义 (可用作常量表达式),但 C 选择保持简单。直到 C23 才通过 `constexpr` 补上这一短板。

#### Q2: `register` 关键字还有用吗?

A: 没有。C 标准已经删除 `register`,C 起编译器就完全忽略它。现代编译器的寄存器分配算法远比人类精准,人工干预反而可能干扰优化。

#### Q3: 什么时候用 `static`,什么时候用 `extern`?

A: 
- 想要"模块私有"的变量/函数:用 `static`
- 想要"使用其他模块定义的变量":在头文件用 `extern` 声明,在 .c 文件中定义

#### Q4: 字符串字面量能不能修改?

A: 不能。虽然语法上 `char *s = "hello";` 看似可写,但字符串字面量存储在只读段,修改是 UB。应该用 `const char *s = "hello";` 或 `char s[] = "hello";`。

#### Q5: 全局变量到底好不好?

A: 大量使用全局变量是反模式。原因:
- 难以测试 (无法 mock)
- 难以并行化 (数据竞争)
- 难以追踪修改 (任意位置可改)
- 代码耦合度高

最佳实践:全局变量仅用于真正的"全局只读配置",且用 `const` 修饰。

#### Q6: `volatile` 能保证线程安全吗?

A: 不能。`volatile` 只禁止编译器优化,不保证:
- 原子性 (一个写操作可能是多个总线周期)
- 内存顺序 (其他线程可能看到乱序的写)
- 互斥 (多个线程可能同时写)

多线程同步应使用 `_Atomic`、互斥锁或条件变量。

#### Q7: C 与 C++ 的 `const` 有什么区别?

A:
- C: `const int N = 10;` 的 `N` 是"不能通过此名修改的对象",仍可能被其他指针修改,不可用作常量表达式
- C++: `const int N = 10;` 的 `N` 是"真正的编译期常量",可用作数组大小、case 标签等

这是 C/C++ 不兼容的关键点之一。

#### Q8: `_Thread_local` 与 `_Atomic` 有什么区别?

A: 完全不同的概念。
- `_Thread_local`:每个线程有独立的实例 (TLS)
- `_Atomic`:同一实例,但访问是原子的

前者解决"线程隔离",后者解决"原子访问"。

#### Q9: 为什么 `sizeof('A')` 在 C 中是 4 (或 `sizeof(int)`),而 C++ 中是 1?

A: 历史原因。C 中字符常量 `'A'` 的类型是 `int` (为了兼容 K&R 时代的"无符号扩展")。C++ 中字符常量的类型是 `char`。这是 C/C++ 不兼容的另一个点。

#### Q10: C23 的 `auto` 与 C++ 的 `auto` 一样吗?

A: 几乎一样,但有差异:
- C 的 `auto` 只能用于"有初始化的变量声明"
- C++ 的 `auto` 还可用于函数返回类型、lambda 参数等
- C 不支持 `decltype` (推迟到 C2y?)

### 12.13 后续学习方向

掌握本文档内容后,建议继续学习:

1. **指针深度解析**:理解指针的算术、多级指针、函数指针
2. **动态内存管理**:malloc/calloc/realloc/free 的正确使用与常见陷阱
3. **结构体与联合体**:内存布局、位域、柔性数组
4. **多文件编译**:翻译单元、链接、头文件设计
5. **预处理器与宏**:函数式宏、X-Macro、字符串化与拼接
6. **C23 新标准**:constexpr、_BitInt、#embed、auto、typeof
7. **原子操作与内存模型**:C11 内存顺序、无锁编程
8. **静态分析与调试**:cppcheck、clang-tidy、AddressSanitizer
9. **构建系统**:Make、CMake、Ninja
10. **嵌入式 C 编程**:寄存器映射、中断处理、实时性

希望本文档能成为你 C 语言学习路上的坚实起点。C 是一门"小而美"的语言,虽然语法简单,但内涵深刻。持续学习、多写代码、阅读优秀开源项目,是精通 C 的不二法门。

---

至此,变量与常量章节结束。希望你能将所学应用到实际项目中,在 C 语言的世界里不断探索与成长。
