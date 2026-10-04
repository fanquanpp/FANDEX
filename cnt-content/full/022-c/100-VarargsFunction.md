---
order: 120
title: 可变参数函数：printf 是怎么炼成的
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 从「printf 为什么能吃任意个参数」出发，用 stdarg.h 四件套手写 sum_ints 与迷你 my_printf（支持 %d %c %s %f），讲透默认参数提升、va_copy、显式个数/格式串/哨兵三种传递约定，以及 v 前缀转发封装与参数不匹配的调试实录。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'c/170-FunctionPointerCallback'
  - 'c/430-StdioFileIO'
  - 'c/280-GenericSelection'
  - 'c/250-FunctionCallStackFrame'
prerequisites:
  - 'c/090-FunctionDetailed'
  - 'c/040-DataTypeDetailed'
---

## 前置知识

- 已完成 [函数详解](/c/090-FunctionDetailed)：会声明、定义、调用普通参数固定的函数；
- 已完成 [数据类型详解](/c/040-DataTypeDetailed)：知道 char、short、int、float、double 的大小与家谱——本文的提升规则全靠它们。

零基础起步见 [C 语言零基础起步](/c/010-CZeroBasisStart)；`char *` 指针参数在本文会先混个眼熟，[指针深度解析](/c/140-PointerDeep) 讲透。

> 分工说明：090 篇讲完参数个数写死的普通函数；本篇专攻 `...`——参数个数与类型到运行时才定的可变参数函数。「编译期就检查类型」的替代方案 `_Generic` 在 [泛型选择](/c/280-GenericSelection)，本篇末尾会告诉你什么时候该叛逃过去。

## 学习目标

读完本文你将能够：

1. 用 stdarg.h 的 va_list / va_start / va_arg / va_end 写出自己的可变参数函数；
2. 亲手迭代出一个支持 %d %c %s %f 的迷你 my_printf，并说清 va_copy 在什么场合不可省；
3. 解释默认参数提升规则，指出 `va_arg(ap, float)` 错在哪、正确写法是什么；
4. 对比显式个数、格式串、哨兵值三种参数传递约定及各自的经典事故；
5. 用「v 前缀函数 + vsnprintf + format 属性」写出可转发、可被编译器检查的日志封装。

预计 60 到 80 分钟，含 4 组动手实验、3 道练习。

## 1. 问题引入：printf 为什么能吃任意个参数

```c
/* three_calls.c：同一个函数，三种调法 */
#include <stdio.h>

int main(void) {
    printf("%d %d %d\n", 1, 2, 3);
    printf("hello\n");
    printf("%s has %d points\n", "Ada", 36);
    return 0;
}
```

三次调用，参数个数一个比一个多。普通函数做不到这件事——090 篇讲过，参数列表在声明时就写死了。printf 的签名里藏着一个 `...`：

```c
int printf(const char *fmt, ...);
```

`...` 读作「省略号参数」：后面还可以跟任意个、任意类型的实参。本文的目标是自己写一个 `sum_ints(int n, ...)`，把 printf 的秘密从内部拆开。

## 2. stdarg 四件套：先写一个最小版本

```c
/* sum_ints.c：第一个可变参数函数 */
#include <stdio.h>
#include <stdarg.h>

int sum_ints(int n, ...) {         /* ... 之前必须至少有一个具名参数 */
    va_list ap;                    /* 1 声明游标 */
    va_start(ap, n);               /* 2 定位：从 n 之后开始摸参数 */
    int total = 0;
    for (int i = 0; i < n; i++) { total += va_arg(ap, int); }   /* 3 取一个：按 int 读，游标前移 */
    va_end(ap);                     /* 4 收尾 */
    return total;
}

int main(void) {
    printf("%d\n", sum_ints(3, 10, 20, 30));
    printf("%d\n", sum_ints(5, 1, 2, 3, 4, 5));
    return 0;
}
```

```bash
gcc -Wall -Wextra -g sum_ints.c -o sum_ints
./sum_ints
```

```text
60
15
```

心智模型：va_list 是一枚书签，记录「下一个可变参数在哪」。四个成员各司其职：

- `va_list ap`——声明书签；
- `va_start(ap, n)`——把书签插到**最后一个具名参数 n 之后**。为什么必须靠具名参数定位？因为 `...` 本身不携带任何位置信息，函数只能从最后一个确定的东西往后摸。C23 起标准放开了「至少一个具名参数」的要求，但主流平台仍依赖具名参数定位，工程上照旧这么写；
- `va_arg(ap, int)`——按你亲口保证的类型读出当前参数，书签前移。类型写错没人拦你，后果见第 4、8 节；
- `va_end(ap)`——宣布遍历结束。va_start 与 va_end 必须成对。

机制一瞥（好奇 va_list 到底是什么再读）：stdarg.h 里没有魔法，四个「函数」全是宏。x86-64 Linux 上前几个参数经寄存器传递，而函数要按顺序逐个访问，所以 va_start 会把可能装过参数的寄存器先拍一份到栈上的「寄存器保存区」，va_arg 再按类型去保存区或栈上取数。由此得出三条实用结论：其一，va_list 在 GCC 的 x86-64 上是「装着一个结构体的数组」，在 MSVC 的 x64 上干脆是一个 `char *`——不同平台长得完全不同；其二，对 va_list 只能做宏允许的那几件事，直接赋值 `ap2 = ap1` 在不同平台行为不同，复制一律用 C99 引入的 va_copy；其三，va_start 有真实开销（保存一排寄存器），性能敏感路径少用变参。调用约定与栈帧的细节在[函数调用栈帧](/c/250-FunctionCallStackFrame)。

修改实验：把 `sum_ints(3, 10, 20, 30)` 改成 `sum_ints(4, 10, 20, 30)`——n 说有 4 个，实参只给了 3 个。编译零警告，运行多半打印一个莫名其妙的数。第 8 节把这个实验做成正式实录。

## 3. 迷你项目 my_printf：从 %d 开始

可变参数函数怎么知道参数的个数与类型？看 printf 的答案：**类型信息藏在调用方写下的格式串里**。格式串里有几个占位符就 va_arg 几次，读什么类型由占位符决定。我们亲手做一个：第一版支持 %d %c %s 与 %%，下一节再补 %f——那里埋着本文最大的一个坑。

```c
/* my_printf.c：迷你 printf，支持 %d %c %s %% */
#include <stdarg.h>
#include <stdio.h>

/* 把整数按十进制一个字符一个字符吐出来 */
static void put_int(int v) {
    unsigned int u = (unsigned int)v;   /* 按无符号处理补码，INT_MIN 也安全 */
    char buf[12];                       /* 32 位 int 最长 10 位数字，留余量 */
    int i = 0;
    if (v < 0) { putchar('-'); u = 0u - u; }
    do { buf[i++] = (char)('0' + u % 10); u /= 10; } while (u != 0);
    while (i > 0) { putchar(buf[--i]); }
}

void my_printf(const char *fmt, ...) {
    va_list ap;
    va_start(ap, fmt);
    for (const char *p = fmt; *p != '\0'; p++) {
        if (*p != '%') { putchar(*p); continue; }   /* 普通字符照抄 */
        p++;                            /* 越过 '%' */
        switch (*p) {
        case 'd': put_int(va_arg(ap, int)); break;
        case 'c': putchar(va_arg(ap, int)); break;  /* 为什么不是 char？第 4 节揭晓 */
        case 's': {
            const char *s = va_arg(ap, const char *);
            fputs(s != NULL ? s : "(null)", stdout);
            break;
        }
        case '%': putchar('%'); break;
        default:  putchar('%'); putchar(*p); break; /* 不认识的占位符原样吐回，方便发现笔误 */
        }
    }
    va_end(ap);
}

int main(void) {
    my_printf("%s got %d points, rank %c\n", "Ada", 36, 'A');
    my_printf("100%% pure variadic\n");
    return 0;
}
```

```bash
gcc -Wall -Wextra -g my_printf.c -o my_printf
./my_printf
```

```text
Ada got 36 points, rank A
100% pure variadic
```

三个细节值得停下来看：%c 处读的是 int 而不是 char（第 4 节的伏笔）；%s 处 `const char *s` 先混个眼熟，[指针深度解析](/c/140-PointerDeep) 讲透；`%%` 只是普通字符分支，与可变参数无关——它考验的是格式串扫描器自己。

修改实验：加 `#include <limits.h>`，输出 `my_printf("%d\n", INT_MIN);`。INT_MIN 是 int 能表示的最小负数，`-v` 对它本会溢出，put_int 却能正确打印 `-2147483648`——这正是它先转 unsigned 再取负的原因。

## 4. 默认参数提升：float 为什么必须写成 double

给 my_printf 加 %f 时，最顺手的写法是个深坑：

```c
        case 'f':
            printf("%f", va_arg(ap, float));   /* 错：编译不报错，运行才出错 */
            break;
```

调用 `my_printf("pi = %f\n", 3.14f);`，一次典型输出：

```text
pi = 0.000000
```

不是 3.140000，也未必每次都是 0.000000——就是错的。根子在**默认参数提升（default argument promotions）**：标准规定，可变参数列表里的每个实参在传递时都要经历一次隐式转换——

| 你写的实参类型 | 实际进入可变参数区的类型 |
| --- | --- |
| char / signed char / unsigned char / short / unsigned short / _Bool | int（int 装不下其取值范围时是 unsigned int） |
| float | double |
| 其余（int、long、指针、double 等） | 原样 |

cppreference 的原话：「可变参数列表中的每个整型实参经历整型提升，每个 float 实参被隐式转换为 double。」于是 `3.14f` 在进入函数之前就已经变成了 double；函数里却用 `va_arg(ap, float)` 按 float 去读——读的字节数、对齐方式全对不上。cppreference va_arg 页写明：「若 ap 中下一个实参（提升后）的类型与 T 不兼容，行为未定义。」未定义行为（undefined behavior，UB）意味着错值、崩溃、或碰巧看起来正常，全凭运气。

修复只有一个词：

```c
        case 'f':
            printf("%f", va_arg(ap, double));  /* 对：读提升后的类型 */
            break;
```

同理可推三条军规：`va_arg(ap, char)`、`va_arg(ap, short)`、`va_arg(ap, float)` 全是错的——char/short 传进来时已是 int，必须先 `va_arg(ap, int)` 再转回小类型；`%c` 分支读 int 也是这个原因；极少的例外（有符号/无符号对应类型且值双方都能表示等）不值得依赖，记住「读提升后的类型」就够了。

调用侧的对称错误同样致命：`my_printf("%d\n", 3.14)` 是 %d 声明读 int、实传 double——同一个 UB，只是方向反了。修改实验：跑 `my_printf("%d %c\n", 'A', 65);`。'A' 提升为 int 被 %d 读出 65；65 本就是 int 被 %c 读出字母 A。两端全是 int，提升规则在此闭环。

## 5. va_copy：同一组参数要吃两遍

有时一组参数要遍历两次：先扫一遍找最大值，再扫一遍输出谁等于最大值。直接复用书签行不通——第一遍走完，va_arg 已把 ap 推到「再无参数」的荒地，再读是 UB（cppreference：「在已无实参可取时调用 va_arg，行为未定义」）。赋值 `ap2 = ap1` 也不行：第 2 节说过 va_list 在一些平台是数组类型，赋值会退化成指针共享，动一个动两个。标准给的唯一可移植复制方式是 C99 的 va_copy：

```c
/* report_max.c：两遍遍历 */
#include <stdarg.h>
#include <stdio.h>

void report_max(int n, ...) {
    va_list ap, ap2;
    va_start(ap, n);
    va_copy(ap2, ap);                /* 第二枚书签从当前位置复制出来 */

    int max = va_arg(ap, int);       /* 第一遍：找最大值 */
    for (int i = 1; i < n; i++) {
        int v = va_arg(ap, int);
        if (v > max) { max = v; }
    }
    va_end(ap);

    printf("max = %d at", max);
    for (int i = 0; i < n; i++) {    /* 第二遍：用复制的书签重新出发 */
        int v = va_arg(ap2, int);
        if (v == max) { printf(" %d", i); }
    }
    printf("\n");
    va_end(ap2);                     /* 每个 va_copy 配对一次 va_end */
}

int main(void) {
    report_max(6, 1, 5, 3, 5, 2, 5);
    return 0;
}
```

```text
max = 5 at 1 3 5
```

修改实验：删掉 `va_copy(ap2, ap);` 这一行，让第二遍循环也用 ap。观察输出——第二遍读到的全是垃圾或直接把程序带崩，因为书签早已越过最后一枚参数。

## 6. 参数怎么交接：三种约定与各自的事故

函数从 `...` 里拿参数全凭约定，工程上只有三种成熟的约定：

| 约定 | 代表 | 个数/类型信息在哪 | 典型事故 |
| --- | --- | --- | --- |
| 显式个数 | sum_ints(n, ...) | 具名参数 n | n 与实参个数不符，读到垃圾 |
| 格式串 | printf(fmt, ...) | 逐字符扫描 fmt | 占位符与实参类型不匹配，UB |
| 哨兵值 | execl(..., NULL) | 遇哨兵停止 | 忘写哨兵，一路读进野内存 |

显式个数：最简单也最脆。`sum_ints(4, 10, 20, 30)` 这种笔误（第 2 节修改实验）编译器无能为力，因为对它而言 n 只是一个普通的 int 实参。

格式串：表达力最强。POSIX 的 open 是它的一个精巧变体——`int open(const char *path, int flags, ...);` 只在 flags 带 O_CREAT 时才需要第三个参数 mode；忘传 mode，函数内部 va_arg 读到的就是垃圾。printf 自身的占位符不匹配则是第 4 节实录的主角。

哨兵值：用「最后一项是 NULL」宣布结束。一个纯 C 的可运行示例：

```c
/* sentinel.c：NULL 哨兵版的字符串拼接 */
#include <stdarg.h>
#include <stdio.h>
#include <string.h>

static int concat(char *dst, size_t cap, const char *first, ...) {
    size_t used = 0;
    va_list ap;
    va_start(ap, first);
    for (const char *s = first; s != NULL; s = va_arg(ap, const char *)) {
        size_t len = strlen(s);
        if (used + len + 1 > cap) { va_end(ap); return 0; }   /* 放不下：判失败而不是硬写 */
        memcpy(dst + used, s, len);
        used += len;
    }
    va_end(ap);
    dst[used] = '\0';
    return 1;
}

int main(void) {
    char buf[32];
    if (concat(buf, sizeof buf, "Hello, ", "variadic", " world", (char *)NULL)) { printf("%s\n", buf); }
    return 0;
}
```

```text
Hello, variadic world
```

注意末尾的 `(char *)NULL` 强转不是仪式感：NULL 在某些实现里就是整数 0，而可变参数处没有原型信息告诉编译器「这是指针」，64 位平台上 4 字节的整型 0 与 8 字节的空指针宽度不同，哨兵比较会失手，循环继续往野内存读。至于忘了写哨兵的后果——execl 系列函数的经典安全漏洞正是这么来的。

真实世界的样品间：

| 真实 API | 约定 | 备注 |
| --- | --- | --- |
| printf / scanf | 格式串 | 编译器的 -Wformat 警告专为其定制 |
| POSIX open | 条件参数（格式串思想的变体） | flags 带 O_CREAT 才要 mode |
| execl / execlp | 哨兵 (char *)NULL | 忘哨兵是教科书级漏洞 |
| syslog / vsyslog | 格式串 + v 前缀对 | v 版本收 va_list，专供转发 |
| Linux 内核 printk | 格式串 | 声明上的 __printf(1,2) 即 format 属性 |

## 7. 何时别用可变参数，用时怎么体面地用

先把丑话说完：`...` 的类型安全是零。类型全靠程序员口头约定，编译器对自家函数一概不查。所以默认立场应当是**不**用：

- 参数同型且个数运行时才定——数组加长度：`int sum(const int *v, int n);`，类型安全，还能 sizeof 检查；
- 参数异型但编译期已知——C11 `_Generic` 在编译期按实参类型分发到强类型函数，零运行时开销，见 [泛型选择](/c/280-GenericSelection)；
- 参数结构复杂——结构体数组加类型标签，数据驱动。

日志、格式化这类「参数天然不定个不定型」的场景才轮到变参出场，此时守两条纪律。

纪律一：提供 v 前缀版本，转发全走 vsnprintf。可变参数的壳只负责 va_start/va_end，真正的逻辑收进收 va_list 的 v 版本：

```c
/* my_log.c：可变参数入口 + va_list 实现 */
#include <stdarg.h>
#include <stdio.h>

static void my_vlog(char *buf, size_t cap, const char *fmt, va_list ap) {
    vsnprintf(buf, cap, fmt, ap);   /* 截断安全：最多写 cap 字节，含结尾 '\0' */
}

void my_log(char *buf, size_t cap, const char *fmt, ...) {
    va_list ap;
    va_start(ap, fmt);
    my_vlog(buf, cap, fmt, ap);     /* 整个 ap 交给 v 版本 */
    va_end(ap);
}

int main(void) {
    char buf[64];
    my_log(buf, sizeof buf, "user %s scored %d", "Ada", 99);
    printf("%s\n", buf);
    return 0;
}
```

```text
user Ada scored 99
```

标准库自己就是这个形状：printf 对 vprintf，fprintf 对 vfprintf，snprintf 对 vsnprintf。vsnprintf 的返回值是「本应需要的长度」，想先量后写（先 va_copy 扫一遍再分配缓冲区）也以它为地基，边界检查的完整姿势见 [安全函数与边界检查](/c/450-SafeFunctionBoundsCheck)。

把 va_list 交给别的函数有一句要紧话：被调函数里 va_arg 推进的到底是不是调用方那份 va_list，取决于平台实现（GCC 的 x86-64 上 va_list 是数组、传参时退化为指针，推进的就是原件；别的平台可能推进副本）。标准干脆规定这种情形下调用方手中 ap 的值未指定，继续用之前必须先 va_end。可移植的约定只有一条：转发就交整个 va_list 给 v 函数，交出去之后自己不再碰 ap。

纪律二：给自己的函数挂上 printf 检查。GCC 与 Clang 提供 format 属性：

```c
__attribute__((format(printf, 2, 3)))   /* 第 2 个参数是格式串，可变参数从第 3 个起 */
void my_log(const char *tag, const char *fmt, ...);
```

挂上之后，`my_log("INFO", "%d", "oops")` 这类笔误直接吃编译警告，与 printf 同等待遇。

还有一条 va_end 纪律：多出口的函数用 goto 汇合到统一的 cleanup 标签——`cleanup: va_end(ap); return status;`——保证每条提前 return 的路径也执行了 va_end。这是 goto 在 C 里的正经工作之一。

## 8. 常见错误与调试实录

实录一：参数个数不匹配，会发生什么。

```c
/* mismatch.c：n 说 4 个，实参只给 3 个 */
#include <stdarg.h>
#include <stdio.h>

int sum_ints(int n, ...) {
    va_list ap;
    va_start(ap, n);
    int total = 0;
    for (int i = 0; i < n; i++) { total += va_arg(ap, int); }
    va_end(ap);
    return total;
}

int main(void) {
    printf("sum = %d\n", sum_ints(4, 10, 20, 30));
    return 0;
}
```

```bash
gcc -Wall -Wextra -g mismatch.c -o mismatch
./mismatch
```

一次典型输出（再跑一次可能就不同）：

```text
sum = -790557526
```

没有崩溃、没有警告，只有一个错数。解读：第 4 次 va_arg 从寄存器保存区或栈上读到了上一次调用残留的字节。ASan 与 UBSan 都不追踪变参协议，抓不到这类 UB——C 把「参数协议正确性」完全交给程序员，第 6 节的三种约定、第 7 节的 format 属性、以及「能用固定参数就不用变参」的默认立场，全是在为这个代价上保险。

实录二：类型不匹配时，标准库函数为什么能被救。

```c
/* wrongtype.c */
#include <stdio.h>

int main(void) {
    printf("%d\n", 3.14);   /* %d 要 int，实给 double */
    return 0;
}
```

```bash
gcc -Wall -Wextra -g wrongtype.c -o wrongtype
```

```text
wrongtype.c: In function 'main':
wrongtype.c:4:20: warning: format '%d' expects argument of type 'int',
    but argument 2 has type 'double' [-Wformat=]
```

同一处笔误搬到 my_printf 上则无声通过——编译器认识 printf 的格式串语义，不认识你的。第 7 节的 format 属性就是把这份照顾租给自己的函数。顺带一句与之同源的 UB：把「参数个数可变」的函数地址硬转成固定参数的函数指针类型再调用（`int (*)(int, ...)` 冒充 `int (*)(int)`），调用约定可能对不上，同样是未定义行为——函数指针的匹配规则见 [函数指针与回调](/c/170-FunctionPointerCallback)。

## 9. 实际项目中的使用场景

- 日志系统：像样的 C 日志设施（glibc 的 syslog、内核 printk、PostgreSQL 的 elog）都是同一副骨架——可变参数壳、v 前缀实现、format 属性，本文三节正好拼齐；
- stdio 家族：printf/fprintf/snprintf 及其 v 系列是日常用量最大的变参函数，格式符全表见 [标准输入输出与文件](/c/430-StdioFileIO)；
- 跨语言边界：printf 风格变参是各语言调用 C 库的事实接口，格式串约定让跨语言侧也能做检查；
- 反例提醒：配置解析、数据聚合这类「参数其实同型」的需求，请用数组加长度——它们是误用变参的重灾区。

## 10. 小练习

预测题（5 分钟）：先写答案再运行。

```c
my_printf("%d %c\n", 'A', 65);
```

参考答案（先写再看）：打印 `65 A`。'A' 提升为 int 由 %d 读出 65；65 本就是 int，被 %c 读出字母 A。

修改题（10 分钟）：给 my_printf 增加 `%x`：按十六进制输出 unsigned int。提示：仿照 put_int 把 `% 10` 换成 `% 16`，余数 10 到 15 映射为字母 a 到 f。验收：`my_printf("%x\n", 48879u);` 输出 `beef`。

挑战题（30 分钟）：让 my_printf 像 printf 一样返回「输出的字符数」，并挂上 format 属性。提示两级：

思路方向：把 putchar 包一层带计数的辅助函数；返回值类型 int，失败返回负值与 printf 一致。

关键 API：`__attribute__((format(printf, 1, 2)))` 挂在声明上；用 -Wall -Wextra 验证。

验收清单：对同一格式串，my_printf 与 printf 返回值一致；`my_printf("%d", "x")` 能触发 -Wformat 警告；全程零编译警告。

## 11. 与之前和之后的知识的关系

- 往前：[函数详解](/c/090-FunctionDetailed) 的参数传递是本篇的地基；[数据类型详解](/c/040-DataTypeDetailed) 的类型家谱解释了提升表里每一行；
- 旁支：[泛型选择](/c/280-GenericSelection) 提供编译期的类型安全替代；[预处理与宏](/c/290-PreprocessorMacro) 的 `__VA_ARGS__` 是编译期拼接参数的「宏版变参」，与本篇运行期遍历互补；[函数调用栈帧](/c/250-FunctionCallStackFrame) 拆开 va_start 背后的寄存器保存；
- 往后：变参之外，参数的「含义」需要命名清楚的常量来表达——日志级别、错误码怎么设计，见下一篇 [枚举与 typedef](/c/110-EnumTypedef)。

## 12. 官方文档

- 可变参数与 C23 的放宽（cppreference C）：https://en.cppreference.com/w/c/language/variadic
- 默认参数提升的精确表述：https://en.cppreference.com/w/c/language/conversion
- va_arg 的未定义行为条款：https://en.cppreference.com/w/c/variadic/va_arg
- stdarg(3) 手册页：https://man7.org/linux/man-pages/man3/stdarg.3.html

## 自我检查

- 能默写四件套的使用顺序，并解释 va_start 的第二个参数为什么是最后一个具名参数；
- 能复述默认参数提升表，指出 `va_arg(ap, float)` 错在哪、正确写法是什么；
- 能给显式个数、格式串、哨兵三种约定各举一个标准库实例与其经典事故；
- 能用 v 前缀加 vsnprintf 写一个可转发的日志函数，并用 format 属性让它接受编译器检查。

## 本章总结

可变参数的全部秘密是一枚书签：va_start 定位、va_arg 逐个取、va_end 收尾、va_copy 复制。参数的个数与类型不经过编译器，全靠三种约定交接——显式个数、格式串、哨兵值——每种约定对应一种经典事故。默认参数提升让 char/short 变 int、float 变 double，所以 va_arg 只能读提升后的类型，写 float 就是未定义行为。工程上默认不用变参；必须用时，v 前缀加 vsnprintf 负责体面转发，format 属性负责把编译器的检查借回来。

## 下一步

进入 [枚举与 typedef](/c/110-EnumTypedef)：参数的个数与类型怎么交接解决了，接下来解决参数的「含义」怎么命名——用 0/1/2 当状态码的事故现场，正等着枚举来收拾。
