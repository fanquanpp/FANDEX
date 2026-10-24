---
order: 50
title: 变量与常量：int x = 42 背后发生了什么
module: 'c'
category: 计算机科学
difficulty: beginner
description: 用「未初始化变量打印出垃圾值」的实验开题，讲透声明与定义、初始化与赋值、左值右值第一课，四种常量（字面量、宏、const、枚举）怎么选，字符串字面量为什么改不得，三类变量 Bug 的编译期拦截。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'c/055-ScopeStorageLinkage'
  - 'c/260-ConstAndVolatileQualifiers'
  - 'c/210-ProcessMemoryLayoutAndErrors'
  - 'c/520-C23CoreFeatures'
  - 'c/060-OperatorExpression'
prerequisites:
  - 'c/020-CLanguageOverview'
  - 'c/040-DataTypeDetailed'
---

## 前置知识

- 已完成 [数据类型详解](/c/040-DataTypeDetailed)：知道 int、char、double 各占多少字节、能表示什么范围；
- 会用 gcc 编译并运行单个 .c 文件（见 [程序结构与基本语法](/c/030-ProgramStructureBasicSyntax)）。

> 分工说明：050 与 055 合讲 C 的变量。本篇是主线（入门）：变量怎么声明、初始化与赋值差在哪、四种「常量」怎么选型、最常见的几类翻车现场；[作用域、存储期与链接性](/c/055-ScopeStorageLinkage) 负责变量的「户口与寿命」——名字在哪些行可见、值能活多久、跨文件谁看得见谁。左值与右值本篇开第一课，术语的进一步展开同样放在 055。

## 学习目标

读完本文你将能够：

1. 说清声明与定义、初始化与赋值的区别，并解释为什么未初始化的局部变量不能读；
2. 用实验验证「静态与全局变量默认清零，局部变量默认不确定」；
3. 在字面量、宏常量、const 对象、枚举常量四种写法里为场景选型，说出 #define 与 const 的三条硬差异；
4. 解释 `char *s = "hello"` 与 `char s[] = "hello"` 的本质不同，不再尝试修改字符串字面量；
5. 用 -Wshadow、-Wuninitialized、-Wparentheses 把三类常见变量 Bug 拦在编译期。

预计 45 到 60 分钟，含 4 组动手实验与 3 道练习。

## 1. 问题引入：没初始化的变量里是什么

```c
/* garbage.c：读一个没初始化的局部变量 */
#include <stdio.h>

int main(void) {
    int x;
    printf("x = %d\n", x);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g garbage.c -o garbage
./garbage
./garbage
```

一次典型输出：

```text
x = -1363154332
x = 32767
```

两次运行两个答案，看起来像随机数。它不是随机数，是上一个用过这块栈内存的函数留下的「残骸」。C 标准的说法：未初始化的自动（局部）变量具有**不确定值**（indeterminate value），读取它是未定义行为——上一章打印 42、这一章打印垃圾的「灵异 Bug」，十有八九从这行来。顺带说明：这条命令没报警告不是你的错觉，-Wall 对这种场景常常沉默，怎么让编译器开口，第 6 节演示。

回头看 `int x = 42;` 这一行发生了什么：编译器在符号表里记下「x 是 int 类型，住在栈帧的某个偏移处」，运行时一条指令把 42 写进那 4 个字节。一个变量 = 名字、类型、值、住址、寿命。本文拆前三个，住址与寿命交给姊妹篇 055。

## 2. 声明、定义与初始化

### 2.1 声明不等于定义

```c
int x;            /* 定义：真的分配了一块 int 大小的存储 */
extern int x;     /* 声明：只向编译器介绍这个名字与类型，不分配存储 */
```

多数变量写下来既是声明也是定义；`extern` 开头的是纯声明，它承诺「这个名字的定义在别处」。这个「别处」通常是另一个 .c 文件，完整玩法（头文件放声明、.c 放定义）见 [作用域、存储期与链接性](/c/055-ScopeStorageLinkage) 第 5 节。

### 2.2 初始化不等于赋值

```c
int x = 42;       /* 初始化：对象诞生时获得第一个值 */
x = 43;           /* 赋值：对象已存在，覆盖旧值 */
```

平时两者结果一样，差别藏在静态对象身上：静态存储期的对象（全局变量、static 变量）的初始化在程序启动时一次完成，且必须用**常量表达式**：

```c
int a = 42;                  /* 合法 */
static int b = sizeof(int);  /* 合法：sizeof 是常量表达式 */
static int c = a;            /* 非法：a 不是常量表达式 */
```

### 2.3 实验：谁默认清零，谁默认垃圾

```c
/* zero.c：三种位置的变量，不初始化各是什么 */
#include <stdio.h>

int g;                          /* 全局：静态存储期 */

int main(void) {
    static int s;               /* static 局部：静态存储期 */
    int local;                  /* 自动存储期 */
    printf("g = %d, s = %d, local = %d\n", g, s, local);
    return 0;
}
```

一次典型输出：

```text
g = 0, s = 0, local = -1842076688
```

规矩一句话：**静态存储期**的对象不初始化就自动清零（整数 0、浮点 0.0、指针空），因为它们住在静态区，程序加载时由系统统一清零；**自动存储期**的对象不初始化就是不确定值，因为栈上没人替你打扫。内存分区图见 [内存深水区](/c/210-ProcessMemoryLayoutAndErrors)。工程纪律从今天起：声明时即初始化，`int x = 0;` 不丢人，丢人的是三天后查一个「莫名随机」的 Bug。

### 2.4 命名规则与惯例

规则是硬的：标识符由字母、数字、下划线组成，不能以数字开头，区分大小写，不能用关键字。

惯例是软的，但值得从小养成：

- 常量全大写下划线分隔：`MAX_BUFFER_SIZE`；
- 循环变量 `i`、`j`、`k`，其他变量小写下划线：`buffer_size`；
- 全局变量加 `g_` 前缀、文件内 static 加 `s_` 前缀，让人一眼看出「这个变量能被谁改」。

惯例不强制，但「读代码的人不用猜」本身就是生产力。

## 3. 赋值语义与左值右值第一课

```c
x = 10;
```

这行的左右两边身份不同：左边是**对象**（C 标准对 object 的定义是「执行环境中的一块存储区域，其内容可以表示值」），右边是一个**值**。术语化：能放在赋值号左边的是**左值**（lvalue），只能当值使用的表达式是**右值**（rvalue）。

```c
/* lvalue.c */
#include <stdio.h>

int main(void) {
    int x = 10;
    x = 20;               /* 合法：x 是（可修改的）左值 */
    /* 10 = x;            编译错误：10 是右值，error: lvalue required */
    int *p = &x;          /* 合法：可以取左值的地址 */
    /* int *q = &(x + 1); 编译错误：x + 1 是右值，没有地址 */
    printf("%d\n", x);
    return 0;
}
```

两个判断口诀：**能取地址的是左值，赋值号左边必须是可修改的左值**。`const int N = 100;` 里的 N 是左值（有地址），但不是可修改的左值——`N = 5;` 直接编译错误。modifiable lvalue、左值到右值的转换这些更进一步的术语，[作用域、存储期与链接性](/c/055-ScopeStorageLinkage) 接着讲。

## 4. 四种「常量」

C 里说「常量」，可能指四种完全不同的东西，逐一见面的。

### 4.1 字面量：写在源代码里的值

| 字面量 | 类型 | 说明 |
| --- | --- | --- |
| `42` | int | 十进制 |
| `052` | int | 八进制，前导 0 就是八进制 |
| `0x2A` | int | 十六进制 |
| `0b101010` | int | 二进制（C23 起标准） |
| `42U` | unsigned int | U 后缀 |
| `42L` | long | L 后缀 |
| `42ULL` | unsigned long long | 后缀可组合 |
| `3.14` | double | 浮点字面量默认 double |
| `3.14f` | float | f 后缀 |
| `'A'` | int | 字符常量的类型是 int，sizeof('A') 通常为 4（C++ 里才是 1） |
| `"hello"` | char[6] | 字符串字面量，含结尾空字符，见 4.6 节 |

三处易错，都值得当场记牢：

1. **前导 0 是八进制**：`010` 是 8 不是 10。填日期写成 `09` 会直接编译失败（9 不是八进制数字）；
2. **后缀决定类型**：`uint64_t x = 1 << 32;` 里 1 是 int（常见平台 32 位），左移 32 位是未定义行为；写成 `1ULL << 32` 才安全。后缀不是装饰，是类型；
3. **C23 新写法**：二进制 `0b1111'0000` 与数字分隔符 `1'000'000`（单引号插在数字之间，编译器忽略，纯为可读）。更多 C23 变化见 [C23 与 C2y 新特性](/c/520-C23CoreFeatures)。

### 4.2 宏常量：#define 的文本替换

```c
#define MAX_BUFFER 1024
```

预处理阶段把 MAX_BUFFER 全部替换成 1024，编译器从头到尾没见过 MAX_BUFFER 这个名字。后果：无类型、无作用域（从定义行生效到文件尾或 #undef）、无地址、调试器里看不见。机制详见 [预处理器与宏](/c/290-PreprocessorMacro)。

### 4.3 const 对象：有类型的只读

```c
const int DAYS_IN_WEEK = 7;
```

const 对象有类型、有作用域、能进调试器，还承诺「不可通过该名字修改」。但在 C 里它**不是编译期常量**——这是 C 与 C++ 最著名的差异之一，做个实验：

```c
/* sized.c：const 对象能当数组大小吗 */
const int N = 8;
int global_arr[N];        /* 第 3 行 */

int main(void) {
    const int M = 8;
    int local_arr[M];     /* 第 8 行 */
    local_arr[0] = 1;
    return 0;
}
```

```bash
gcc -Wall -Wextra sized.c -o sized
```

预期输出（关键行）：

```text
sized.c:3:5: error: variably modified 'global_arr' at file scope
sized.c:8:9: warning: unused variable 'local_arr' [-Wunused-variable]
```

文件作用域的 `int global_arr[N]` 直接编译失败；块作用域的 `int local_arr[M]` 能编译，但它是**变长数组**（VLA）——M 不是常量表达式，编译器只能放到运行时定大小。想要真正的编译期定长，三选一：

```c
enum { MAX_SIZE = 256 };        /* 方案一：枚举常量 */
#define MAX_SIZE 256            /* 方案二：宏 */
constexpr int MAX_SIZE = 256;   /* 方案三：C23 constexpr，有类型有作用域
                                   还能当数组大小，详见 C23 篇 */
```

const 与 volatile 组合、const 指针的完整语法，深水区在 [const 与 volatile 详解](/c/260-ConstAndVolatileQualifiers)。

### 4.4 枚举常量：编译期整数

```c
enum { MAX_SIZE = 256 };
char buffer[MAX_SIZE];    /* 合法：枚举常量是真正的编译期整型常量 */
```

枚举常量能用在数组大小、case 标签这些「必须编译期确定」的位置，局限是只有 int 类型、表达不了浮点和字符串。枚举本尊的语法与玩法见 [枚举与 typedef](/c/110-EnumTypedef)。

### 4.5 四种写法对比与选型

| 写法 | 类型检查 | 作用域 | 调试器可见 | 可当数组大小 | 可取地址 |
| --- | --- | --- | --- | --- | --- |
| `#define N 100` | 无 | 从定义行到 #undef | 否 | 是 | 否 |
| `enum { N = 100 };` | int | 遵守作用域规则 | 是 | 是 | 否 |
| `const int N = 100;` | 有 | 遵守作用域规则 | 是 | 否（C 中） | 是 |
| `constexpr int N = 100;`（C23） | 有 | 有 | 是 | 是 | 是 |

选型惯例：整型小常量用枚举（或沿用代码库既有宏）；需要浮点、字符串或类型检查用 const；项目能用 C23 就 constexpr。#define 留给条件编译与函数式宏这类真正需要预处理的地方。

### 4.6 字符串字面量与指向它的指针

```c
char *s = "hello";        /* s 指向一个「无名只读数组」 */
char t[] = "hello";       /* t 是把字面量拷贝进栈上的新数组 */
```

`"hello"` 本身是**静态存储期的无名数组**（6 字节，含结尾空字符），编译器通常把它放进只读段；`char *s` 只是把指针指过去，通过它写内容是未定义行为；`char t[]` 则是把字面量拷贝进栈上的新数组，随便改。做个实验把三件事一次看清：

```c
/* strlit.c：字面量住哪里，两份相同字面量是同一份吗 */
#include <stdio.h>

int main(void) {
    const char *a = "hello";
    const char *b = "hello";
    char copy[] = "hello";
    printf("a     = %p\n", (void *)a);
    printf("b     = %p\n", (void *)b);
    printf("copy  = %p\n", (void *)copy);
    copy[0] = 'H';        /* 合法：改的是自己的拷贝 */
    printf("copy  = %s\n", copy);
    /* a[0] = 'H';        去掉注释试试：大概率段错误 */
    return 0;
}
```

```bash
gcc -Wall -Wextra -g strlit.c -o strlit
./strlit
```

一次典型输出：

```text
a     = 0x55d84a3c2004
b     = 0x55d84a3c2004
copy  = 0x7ffc09d3a616
copy  = Hello
```

读出三条事实：a 与 b 地址相同——编译器把相同字面量合并成一份（标准允许合并且去重，但不要求，所以别写依赖这个行为的代码）；copy 在栈上，与只读区相距十万八千里；对 `a[0]` 赋值在 Linux 上通常直接段错误，但「没崩」不等于「没错」，这是 UB。工程纪律：指向字面量的指针一律写成 `const char *`，让编译器把误改拦成编译错误。字面量地址挨着代码段——五段布局的完整地图见 [内存深水区](/c/210-ProcessMemoryLayoutAndErrors)。

## 5. 变量遮蔽第一课

```c
/* shadow.c：内层 total 盖住了外层 total */
#include <stdio.h>

int main(void) {
    int total = 100;
    {
        int total = 0;               /* 另一个 total，只活在这个花括号里 */
        total += 42;
        printf("inner total = %d\n", total);
    }
    printf("outer total = %d\n", total);
    return 0;
}
```

```bash
gcc -Wall -Wextra -Wshadow shadow.c -o shadow
./shadow
```

```text
inner total = 42
outer total = 100
```

内层声明与外层同名时，名字查找命中最近的那一个——外层 total 不是被改了，是被**遮住**了。几十行的函数里顺手声明一个同名变量、从此改错对象，是真实的工业事故形态，所以把 -Wshadow 请进日常编译选项：

```text
shadow.c:6:13: warning: declaration of 'total' shadows a previous local [-Wshadow]
```

本文点到为止：遮蔽的完整规则（包括全局被局部遮、参数遮全局）与它在真实项目里的立场，见 [作用域、存储期与链接性](/c/055-ScopeStorageLinkage) 第 3 节。

## 6. 常见错误与调试实录

### 6.1 未初始化读取：警告为什么没响

回看第 1 节的 garbage.c：`-Wall -Wextra` 全开也没警告。加上优化再试：

```bash
gcc -Wall -Wextra -O2 -c garbage.c -o /dev/null
```

```text
garbage.c: In function 'main':
garbage.c:6:5: warning: 'x' is used uninitialized [-Wuninitialized]
```

原因：-Wuninitialized 与 -Wmaybe-uninitialized 依赖优化时的数据流分析，不开 -O 基本失明。这解释了「我本机好好的，CI 上炸了」的一类悬案——CI 常带 -O2。根治仍是最笨的那招：声明时初始化。

### 6.2 把 = 写进 if 条件

```c
/* assign_in_if.c */
#include <stdio.h>

int main(void) {
    int answer = 0;
    if (answer = 42) {                    /* 本意是 ==，写成了 = */
        printf("found, answer = %d\n", answer);
    }
    return 0;
}
```

```bash
gcc -Wall -Wextra assign_in_if.c -o assign_in_if
```

```text
assign_in_if.c:6:9: warning: suggest parentheses around assignment used as truth value [-Wparentheses]
```

`answer = 42` 是赋值表达式，值为 42，非零恒真：answer 被悄悄改写，分支永远执行。修法两选一：想比较就写 `==`；确实想「赋值并判断」就显式加括号 `if ((p = malloc(n)) != NULL)`，让读代码的人知道你是故意的。

### 6.3 int* a, b 的星号陷阱

```c
int* a, b;    /* a 是 int*，b 是 int：* 属于声明符，不属于类型 */
int *a, *b;   /* 两个都是 int* */
```

工业代码的通行写法是**一行一个指针**（`int *a;` 与 `int *b;` 分行），星号贴着变量名写，`int*` 风格在多声明一行里必埋雷。

### 6.4 修改字符串字面量

见 4.6 节：字面量在只读区，`s[0] = 'H'` 是 UB，Linux 上通常段错误。修复姿势二选一：`char s[] = "hello"`（要可写副本）或 `const char *s`（只要只读）。历史上 DOS 时代这类代码能跑，因为字面量放在可写数据段——老代码迁移到现代系统时这是高频爆点。

## 7. 实际项目中的使用场景

- **常量选型入闸**：新代码评审里，看到「用宏定义浮点常量」「用 const 当数组大小」可以直接引用 4.5 节的表；嵌入式项目里寄存器地址这类只读常量统一 `const` 全局只读，见 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)；
- **警告当门禁**：-Wall -Wextra -Wshadow -Werror 进 CI，本节三类 Bug 在合入前就死掉；未初始化这类漏网之鱼交给静态分析与 sanitizer，见 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers)；
- **只读字符串统一签名**：库接口里所有「我不改你的字符串」的参数写成 `const char *`，这是 [const 与 volatile 详解](/c/260-ConstAndVolatileQualifiers) 要展开的接口自我文档化。

## 8. 小练习

预测题（5 分钟）：先写下输出，再运行验证：

```c
#include <stdio.h>

int main(void) {
    static int s;
    int x;
    printf("s = %d\n", s);
    printf("x = %d\n", x);
    return 0;
}
```

参考答案（先写再看）：s 恒为 0（静态存储期默认清零），x 是不确定值（大概率每次运行不同）。若运行后 x「碰巧」也是 0，那只是栈上恰好是零——不初始化就依赖它仍然不是合法计划。

修改题（10 分钟）：把 sized.c 的 `int local_arr[M];` 改成真正编译期定长数组，要求分别用枚举、宏、constexpr（若编译器支持 C23）三种写法各改一遍，验证文件作用域的 `global_arr[N]` 也全部转正。

挑战题（半小时，不看答案先动手）：写一个「星期名转换器」：用枚举常量定义 MON 到 SUN（MON 为 1），配一个 static const char * 数组存英文名，实现 `const char *day_name(int day)`，1 到 7 返回名字，越界返回 "unknown"。main 里循环 0 到 8 打印验证。

提示（思路方向）：数组大小可以用枚举里的哨兵值（比如在 SUN 后面加一个 DAY_COUNT）来定；越界判断放 day_name 第一行。

提示（再进一步）：`static const char *names[] = { [MON] = "Monday", ... };` 的 [MON] = 写法是指定初始化器（C99），下标与枚举对齐后不依赖手数顺序。

## 9. 与之前和之后的知识的关系

- 往前：[数据类型详解](/c/040-DataTypeDetailed) 的类型知识在本文直接变现——字面量的后缀本质是选类型，初始化的类型匹配靠它把关；
- 往后：[作用域、存储期与链接性](/c/055-ScopeStorageLinkage) 回答本文按下不表的问题——同名变量谁遮谁、static 局部变量为什么记得住值、extern 与头文件怎么配合；[运算符与表达式](/c/060-OperatorExpression) 的求值处处要用左值右值的第一课；
- 更远：const 的深水区在 [const 与 volatile 详解](/c/260-ConstAndVolatileQualifiers)，C23 的 constexpr、auto、typeof 在 [C23 与 C2y 新特性](/c/520-C23CoreFeatures)。

## 10. 官方文档

- cppreference：字符串字面量（静态存储期无名数组、修改是 UB、允许合并去重）：https://en.cppreference.com/w/c/language/string_literal
- cppreference：整数常量（进制前缀、后缀、C23 二进制与数字分隔符）：https://en.cppreference.com/w/c/language/integer_constant
- cppreference：存储期与存储类说明符（static/extern/register 语义）：https://en.cppreference.com/w/c/language/storage_duration

## 11. 自我检查

- 能不看资料说清：声明与定义、初始化与赋值，各差在哪一行什么场景；
- 能解释 zero.c 里 g、s、local 三个值为什么是那样，以及「static 变量默认 0」的实现在哪一段；
- 面对一张 #define 与 const 的对比表，能填满并举出一个该用 const 的场景与一个必须用枚举的场景；
- 能向同事讲清 `char *s` 与 `char s[]` 接住 "hello" 后的区别，以及为什么字面量要配 const 指针。

## 本章总结

一个变量五要素：名字、类型、值、住址、寿命。声明介绍名字，定义分配存储；初始化是诞生时的第一个值，赋值是之后的覆盖。静态对象默认清零、自动对象默认不确定——所以「声明时即初始化」是纪律不是洁癖。四种常量各有岗位：字面量自带类型与后缀陷阱，宏是预处理期的无类型替换，const 有类型但不是编译期常量，枚举是编译期整数的正统来源（C23 之后 constexpr 补上最后一块）。字符串字面量是只读的无名静态数组，接它用 const 指针，要改就拷进数组。最后三道门禁：-Wshadow 拦遮蔽、-O2 下的 -Wuninitialized 拦垃圾值、-Wparentheses 拦 = 写进 if。名字在哪些行可见、值能活多久，下一篇见。

## 下一步

进入 [作用域、存储期与链接性](/c/055-ScopeStorageLinkage)：带着「static 局部变量凭什么记得住上次的值」「两个同名变量为什么互不干扰」这两个问题，把变量的户口（作用域）、寿命（存储期）与跨文件身份（链接性）一次办齐。
