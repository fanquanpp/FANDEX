---
order: 210
title: 动态内存：大小运行时才确定的数组
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 用「玩家人数运行时才知道」的积分榜场景掌握 malloc/calloc/realloc/free 四件套：分配即判 NULL、用 LeakSanitizer 当场抓泄漏、free 后置 NULL 纪律，附预测题与调试实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'c/210-MemoryManagement'
  - 'c/140-PointerDeep'
  - 'c/120-ArrayDetailed'
  - 'c/130-StructAndUnion'
  - 'c/510-CValgrind'
prerequisites:
  - 'c/010-CZeroBasisStart'
  - 'c/140-PointerDeep'
---

## 前置知识

- 已完成 [指针深度解析](/c/140-PointerDeep)：会声明指针、用 `*` 解引用、用 `&` 取地址。堆内存从头到尾都靠指针摸；
- 已完成 [数组详解](/c/120-ArrayDetailed)：知道数组大小必须是编译期常量——正是本文要拆掉的那堵墙。

零基础起步见 [C 语言零基础起步](/c/010-CZeroBasisStart)。指针细节记不全也能往下读，用到就当场解释。

> 分工说明：200 与 210 合讲 C 的动态内存。本篇是主教学，建立操作层面的手感：malloc/calloc/realloc/free 四件套怎么用、返回值为什么不许不查、泄漏怎么自己抓出来；[内存深水区](/c/210-MemoryManagement) 负责拆机制：进程的五段内存布局、use-after-free 与 double free 的 ASan 报告解读、realloc 的搬移语义。两篇示例不重复，本篇是 210 的地基。

## 学习目标

读完本文你将能够：

1. 用 malloc、calloc、realloc、free 在堆上创建、清零、扩容、释放一块运行时才定大小的数组；
2. 解释为什么 malloc 的返回值必须检查，形成「分配即判断 NULL」的习惯；
3. 用 AddressSanitizer 抓出自己程序的内存泄漏，并从报告里指出泄漏分配在哪一行；
4. 遵守 free 后置 NULL 的纪律，说出它能防住的两种事故；
5. 预测「分配不释放」「解引用 NULL」在有无 ASan 时的不同表现。

预计 45 到 60 分钟，包含 3 组动手实验与 3 道练习。

## 1. 你现在要解决什么问题

你在写一个游戏的积分榜。玩家人数是运营决定的：内测 3 人，公测可能 5000 人。第一反应是开个数组：

```c
double scores[MAX_PLAYERS];   /* MAX_PLAYERS 写多少？ */
```

数组大小是编译期常量（[数组详解](/c/120-ArrayDetailed)）。写 3，公测第一天就装不下；写 5000000，内存被白白空占。你需要一种「程序跑起来之后，再按真实人数要内存」的能力。

这就是**动态内存**：内存从堆（heap，运行时按需取用的公共内存池）上分配，大小可以是一个运行时才算出来的变量。C 标准库给了四个函数，本文逐一上手。

## 2. malloc 与 free：要一块，还一块

```c
/* alloc_one.c：在堆上给一个 int 安家 */
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = malloc(sizeof *p);      /* sizeof *p 按指针指向的类型取大小，类型改了这行不用动 */
    if (p == NULL) {                 /* 要不到会返回 NULL，必须检查 */
        perror("malloc");
        return 1;
    }
    *p = 42;
    printf("*p = %d\n", *p);
    free(p);                         /* 用完亲手还 */
    p = NULL;                        /* 还完立刻置空，原因见第 7 节 */
    return 0;
}
```

```bash
gcc -Wall -Wextra -g alloc_one.c -o alloc_one
./alloc_one
```

预期输出：

```text
*p = 42
```

两件事与局部变量不同：这块内存在函数返回后**不会**自动回收，必须亲手 `free`，不还就是泄漏（第 6 节当场抓给你看）；`free` 之后 `p` 里还留着旧地址，再访问是事故，所以立刻置 NULL。

## 3. calloc：要一块干净的

积分榜开局人人 0 分。malloc 给的内存内容是**未定义**的（上一个使用者留下的杂乱字节），逐个赋值很烦；calloc 分配的同时全部清零：

```c
/* calloc_zero.c：新开的榜单天然是 0 分 */
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int n = 4;
    int *scores = calloc(n, sizeof(int));   /* 4 个 int，全零 */
    if (scores == NULL) {
        perror("calloc");
        return 1;
    }
    for (int i = 0; i < n; i++) {
        printf("scores[%d] = %d\n", i, scores[i]);
    }
    free(scores);
    scores = NULL;
    return 0;
}
```

预期输出：

```text
scores[0] = 0
scores[1] = 0
scores[2] = 0
scores[3] = 0
```

calloc 用两个参数表达「几个元素，每个多大」，还自带乘法溢出检查——`calloc(n, sizeof(int))` 比 `malloc(n * sizeof(int))` 更难写错。

## 4. realloc：榜单要加人了

公测来了，2 人的榜单要扩到 4 人。realloc 调整一块已有内存的大小，旧数据原样保留：

```c
/* grow.c：从 2 人扩到 4 人 */
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    size_t n = 2;
    int *scores = malloc(n * sizeof *scores);
    if (scores == NULL) { perror("malloc"); return 1; }
    scores[0] = 90;
    scores[1] = 75;

    size_t new_n = 4;
    int *bigger = realloc(scores, new_n * sizeof *scores);
    if (bigger == NULL) {            /* 失败时 scores 仍然有效，别弄丢它 */
        fprintf(stderr, "realloc failed, old array still usable\n");
        free(scores);
        return 1;
    }
    scores = bigger;                 /* 成功才换指针 */
    scores[2] = 60;                  /* 新位置直接可用 */
    scores[3] = 82;
    for (size_t i = 0; i < new_n; i++) {
        printf("%zu: %d\n", i, scores[i]);
    }
    free(scores);
    scores = NULL;
    return 0;
}
```

预期输出：

```text
0: 90
1: 75
2: 60
3: 82
```

注意安全写法：**永远用临时指针接 realloc 的返回值，成功才覆盖原指针**。为什么不能写 `scores = realloc(scores, ...)`？这个经典大坑在 [内存深水区](/c/210-MemoryManagement) 分析，本篇先把正确姿势练成习惯。

## 5. 修改实验：malloc 的新房其实没人打扫

把 calloc_zero.c 里的分配一行换成 malloc，先预测输出再运行：

```c
    int *scores = malloc(n * sizeof(int));   /* 只分配，不清零 */
```

一次典型输出（每次运行都可能不同）：

```text
scores[0] = 0
scores[1] = 614931984
scores[2] = 875573541
scores[3] = 32767
```

也可能碰巧全是 0。**碰巧全零不等于保证全零**：读未初始化的堆内存是未定义行为。这一步把「malloc 不清零」从知识变成手感——要干净就用 calloc，或自己初始化。

## 6. 常见错误与调试实录：内存泄漏当场抓

泄漏最阴险的地方是它不崩溃、不报错，只让进程内存一点点涨。用 AddressSanitizer 的 LeakSanitizer 把它当场抓住：

```c
/* leak.c：故意只分配，不释放 */
#include <stdlib.h>

int main(void) {
    for (int i = 0; i < 3; i++) {
        int *p = malloc(sizeof(int));   /* 3 次 malloc，0 次 free */
        if (p == NULL) return 1;
        *p = i;
    }
    return 0;
}
```

```bash
gcc -Wall -Wextra -g -fsanitize=address leak.c -o leak
./leak
```

预期输出（进程退出码非 0；地址与路径每次不同，关键行如下）：

```text
==12937==ERROR: LeakSanitizer: detected memory leaks

Direct leak of 4 byte(s) in 3 object(s) allocated from:
    #0 0x7f5d3e2ad928 in malloc ../../../../src/libsanitizer/alloc/asan_malloc.cpp:90
    #1 0x5b1c7e2a41a9 in main leak.c:7
    ...

SUMMARY: AddressSanitizer: 12 byte(s) leaked in 3 allocation(s).
```

读报告三步：

1. `ERROR: LeakSanitizer: detected memory leaks`——泄漏实锤；
2. `of 4 byte(s) in 3 object(s)`——3 个对象共 12 字节；同一行 malloc 的三次调用被合并成一条记录，所以报 1 条；
3. `allocated from ... main leak.c:7`——泄漏分配于哪一行，直接给出修的位置。

修法：循环体里在 `p` 失去指向前加 `free(p)`。再跑一遍：没有任何输出，进程安静退出——这就是干净的样子。ASan 之外的第二个探测器是 Valgrind，不用重新编译即可运行，对比见 [C Valgrind 内存检测](/c/510-CValgrind)。

## 7. 纪律：检查返回值，free 后置 NULL

malloc 要不到内存时返回 NULL「明说失败」，不会替你兜底。不检查的下场：

```c
    int *p = malloc(SIZE_MAX);   /* 要一个绝拿不到的量 */
    *p = 1;                      /* 向 NULL 写入，当场崩溃 */
```

```text
==13409==ERROR: AddressSanitizer: SEGV on unknown address 0x000000000000 (pc 0x5c8a... T0)
==13409==The signal is caused by a WRITE memory access.
    #0 0x5c8a... in main check.c:7
```

桌面小程序里 malloc 极少失败，但服务器与嵌入式天天面对内存紧张。习惯从今天起长在手上：**每一次分配，下一行就是判 NULL**。

free 后置 NULL 同样是纪律而不是洁癖，它防住两类事故：

- **悬空指针误用**：`p = NULL` 后任何 `*p` 都在案发现场立刻崩，而不是悄悄读改别人正在用的内存；
- **重复释放**：`free(NULL)` 按标准是安全的空操作，所以置 NULL 后即使 free 又执行了一次也无害。

## 8. 实际项目中的使用场景

- 游戏服务器房间玩家列表、聊天室在线名单：人数运行时才知道，来人扩容、走人缩容，正是 realloc 的主场；
- 读文件进内存：文件多大只有运行时知道，量出大小再 malloc 刚好的一块；
- 嵌入式固件（如 FoloToy-calendar 的 ESP32 项目）：堆只有几十 KB，每个 malloc 前先想清楚谁在何时 free，见 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)；
- 反过来，小而固定的数据就用栈上数组：不 malloc、不用 free。什么时候栈、什么时候堆，[内存深水区](/c/210-MemoryManagement) 给出完整对照。

## 9. 小练习

预测题（5 分钟）：先写下答案，再运行验证：

```c
int *p = malloc(sizeof(int));
free(p);
p = NULL;
free(p);          /* 这一行会发生什么？ */
printf("ok\n");
```

参考答案（先写再看）：打印 `ok`。`free(NULL)` 是标准规定的空操作。如果把 `p = NULL;` 删掉，最后一行就成了对同一块内存的第二次释放——事故现场的逐行解读见 [内存深水区](/c/210-MemoryManagement)。

修改题（15 分钟）：把 grow.c 改一次「缩容」：用 realloc 把榜单从 4 个元素调回 2 个，只打印前 2 个元素。验收：输出 90 和 75 两行；注意缩容后绝不能再访问下标 2、3——那是越界。

修 Bug 题（15 分钟）：下面的程序运行必崩，真实报错如下。按「读报错三步」定位并修复：

```c
/* buggy_huge.c */
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>

int main(void) {
    int *p = malloc(SIZE_MAX);
    printf("%d\n", *p);
    free(p);
    return 0;
}
```

```text
==14002==ERROR: AddressSanitizer: SEGV on unknown address 0x000000000000 (pc 0x5f1e... T0)
==14002==The signal is caused by a READ memory access.
    #0 0x5f1e... in main buggy_huge.c:8
```

参考要点：报错指向第 8 行的一次 READ，地址是 0——解引用了空指针。malloc 对「要不到」的请求返回 NULL，代码没检查就用了。修复：分配后判 NULL，失败就打印信息退出；顺手把不合理的 SIZE_MAX 换成真实需求。

## 10. 与之前和之后的知识的关系

- 往前：[指针深度解析](/c/140-PointerDeep) 的解引用与取地址在堆上天天用；[数组详解](/c/120-ArrayDetailed) 的「大小编译期写死」从本文起被正式打破；
- 往后：[内存深水区](/c/210-MemoryManagement) 回答本文按下不表的问题——内存住在进程哪个区域、free 之后那块内存怎么了、realloc 为什么可能整体搬家；
- 更远：结构体数组同样用 malloc 分配（[结构体与联合体](/c/130-StructAndUnion)），`malloc(n * sizeof *arr)` 写法不变；「谁分配谁释放」的所有权约定在 [多文件编译](/c/310-MultiFileCompilation) 后成为日常。

## 11. 官方文档

- malloc / calloc / realloc / free（cppreference C）：https://zh.cppreference.com/w/c/memory/malloc
- malloc 手册页（含实现细节、陷阱与环境变量）：https://man7.org/linux/man-pages/man3/malloc.3.html

## 12. 自我检查

- 能不看资料写出「分配 n 个 int、判 NULL、用完 free、置 NULL」的完整片段；
- 能说出 malloc 与 calloc 各适合什么场合，realloc 为什么必须用临时指针接返回值；
- 能用 ASan 跑出自己的泄漏，并指出报告里「分配于哪一行」；
- 能向同事讲清 free 后置 NULL 防住哪两类事故。

## 本章总结

堆让数组大小摆脱编译期：malloc 要内存（不清零）、calloc 要干净的（清零并查乘法溢出）、realloc 调大小（旧数据保留，临时指针接返回值）、free 还回去（之后立刻置 NULL）。三条纪律随本文生效：分配即判 NULL、开发期常开 ASan、泄漏用 LeakSanitizer 当场抓。内存到底住在进程的哪里、free 之后发生了什么，下一篇拆开给你看。

## 下一步

进入 [内存深水区](/c/210-MemoryManagement)：带着「我的变量到底住在内存的哪里」这个问题，把进程的五段布局和堆事故现场一次看穿。
