---
order: 230
title: 内存深水区：五段布局与堆事故现场
module: 'c'
category: 计算机科学
difficulty: advanced
description: 拆开 200 建立的黑盒：打印地址画出进程五段内存布局，逐行解读 use-after-free 与 double free 的 ASan 报告，讲透 realloc 的搬移语义与丢指针经典坑，柔性数组一句话。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'c/200-DynamicMemoryManagement'
  - 'c/250-FunctionCallStackFrame'
  - 'c/510-CValgrind'
  - 'c/490-StaticAnalysisDebug'
  - 'c/140-PointerDeep'
prerequisites:
  - 'c/010-CZeroBasisStart'
  - 'c/200-DynamicMemoryManagement'
---

## 前置知识

- 已完成 [动态内存](/c/200-DynamicMemoryManagement)：亲手用过 malloc/calloc/realloc/free，有「分配即判 NULL、free 后置 NULL」的习惯；
- 知道 `&` 取地址、`%p` 打印指针，会用 `gcc -fsanitize=address` 编译。

> 分工说明：200 与 210 合讲动态内存。200 是主教学，解决「怎么用」；本篇是深水区，拆开机制——变量住在进程内存的哪五段、free 之后那块内存怎么了、两类堆事故的报告怎么逐行读、realloc 为什么可能整体搬家。泄漏检测的基本操作在 200。

## 学习目标

读完本文你将能够：

1. 画出进程的五段内存布局，并用打印地址的实验验证各段相对位置；
2. 解释「未定义行为」为什么表现为「有时正常、有时崩溃」；
3. 逐行读懂 ASan 的 heap-use-after-free 与 double-free 报告，指出分配行、释放行、出错行；
4. 说清 realloc 的三种结果与搬移语义，识别并修复 `p = realloc(p, ...)` 丢指针坑；
5. 一句话说出柔性数组成员解决什么问题。

预计 50 到 70 分钟，含 3 组实验、1 道预测题与 1 道挑战题。

## 1. 问题引入：为什么事故「有时」才发生

```c
int *make_scores(void) {
    int *scores = malloc(3 * sizeof(int));   /* 判 NULL 从简，专注事故本身 */
    scores[0] = 90; scores[1] = 75; scores[2] = 60;
    return scores;
}

int main(void) {
    int *a = make_scores();
    free(a);
    printf("%d\n", a[0]);    /* 有时打印 90，有时崩溃：为什么是「有时」？ */
    return 0;
}
```

「free 之后还去读」，答案却时对时错：标准把结果**留白**了——这叫未定义行为（undefined behavior，UB）。要弄懂「不属于你」的含义，先看地图：你的程序住在内存的哪些区域。

## 2. 五段布局：打印地址画出进程地图

一个正在运行的 C 程序，内存分五个区域，各司其职：

| 区域 | 装什么 | 谁管理 |
| --- | --- | --- |
| text 代码段 | 机器指令、字符串字面量 | 只读，加载时定死 |
| data 数据段 | 初始化过的全局/static 变量 | 程序启动时载入 |
| bss 段 | 未初始化的全局/static 变量 | 加载时统一清零 |
| heap 堆 | malloc/calloc/realloc 的地盘 | 你，手动 malloc/free |
| stack 栈 | 局部变量、函数调用信息 | 编译器自动进出 |

空口无凭，把地址打出来：

```c
/* map.c：把五段的真实地址打出来 */
#include <stdio.h>
#include <stdlib.h>

int g_init = 42;          /* data：初始化过的全局变量 */
int g_zero;               /* bss：没初始化的全局变量，加载时清零 */

int main(void) {
    static int s_init = 7;                /* 也在 data */
    int local = 1;                        /* 栈 */
    int *heap = malloc(sizeof(int));      /* 堆 */
    printf("text  %p\n", (void *)main);
    printf("data  %p\n", (void *)&g_init);
    printf("bss   %p\n", (void *)&g_zero);
    printf("heap  %p\n", (void *)heap);
    printf("stack %p\n", (void *)&local);
    free(heap);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g map.c -o map
./map
```

一次典型输出（地址每次运行都不同，相对位置永远如此）：

```text
text  0x5f2a91c2b169
data  0x5f2a91e2d010
bss   0x5f2a91e2d018
heap  0x5f8d2a0002a0
stack 0x7ffec93f4744
```

从地址读出三条事实：

1. text、data、bss 挨在一起——来自同一个可执行文件，加载时一次铺好；
2. heap 远高于 bss：堆从 bss 上方开始，随 malloc 一步步向上长；
3. stack 在最高处、向下长（函数每调用一层下移一块，见 [函数调用栈帧](/c/250-FunctionCallStackFrame)）。

地址每次不同是地址随机化（ASLR）在防攻击，但**相对位置是铁律**。表也回答了栈与堆的分工：栈自动进出、快而小（默认约 1 到 8 MB），堆手动 malloc/free、慢而大——小而固定的数据住栈，大的上堆，`int big[10000000]` 这种局部数组会把栈撑爆。

修改实验一：删掉 `g_init` 的 `= 42` 再跑。留着 42 时 `&g_init` 紧挨 `s_init`（同在 data），删掉后紧挨 `g_zero`（同在 bss）——编译器按「初始化了没有」分两段；bss 不占可执行文件体积、加载时统一清零，这就是「全局变量不写初值也是 0」的实现。

## 3. 常见错误与调试实录一：use-after-free

```c
/* uaf.c */
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = malloc(sizeof(int));
    if (p == NULL) return 1;
    *p = 5;
    free(p);
    printf("%d\n", *p);    /* 已交还的内存又去读 */
    return 0;
}
```

先不加工具直接跑：大概率打印 `5`——内存刚还回去，还没被别人领走。这就是 UB 的阴险之处：**没出事不等于没错，只是运气好**。开 ASan 重跑：

```bash
gcc -Wall -Wextra -g -fsanitize=address uaf.c -o uaf
./uaf
```

预期输出（地址每次不同，关键行如下）：

```text
==23054==ERROR: AddressSanitizer: heap-use-after-free on address 0x602000000010
READ of size 4 at 0x602000000010 thread T0
    #0 0x5b3a91c2b1d4 in main uaf.c:9
freed by thread T0 here:
    #0 0x7f2c4a8627a7 in free
    #1 0x5b3a91c2b1b0 in main uaf.c:8
previously allocated by thread T0 here:
    #0 0x7f2c4a862588 in malloc
    #1 0x5b3a91c2b1a2 in main uaf.c:5
```

逐行读：首行点名事故 heap-use-after-free 与出错地址；`READ of size 4` 与第 9 行说明谁在出错；`freed by`、`previously allocated by` 指出在哪一行 free、在哪一行 malloc。第 5 行分的、第 8 行还的、第 9 行又用——故事不需要猜。ASan 能抓住是因为它把 free 后的内存标成隔离区，真实分配器没这么讲究。

修改实验二：在 `free(p);` 后插两行 `int *q = malloc(sizeof(int)); *q = 99;`，不开 ASan 再跑。大概率打印 `99`——内存被 `q` 领走，`p` 成了指向**别人内存**的悬空指针，真实程序里「数据莫名被改」常有这类源头。

修改实验三：按 200 篇的纪律补一行 `p = NULL;`，保留后面误用的 `printf`。现在必崩，崩在这一行——把「静默的错误」变成「响亮的崩溃」，正是置 NULL 的全部意义。

## 4. 常见错误与调试实录二：double free

```c
/* dfree.c */
#include <stdlib.h>

int main(void) {
    int *p = malloc(sizeof(int));
    if (p == NULL) return 1;
    free(p);
    free(p);          /* 第二次：事故现场 */
    return 0;
}
```

```bash
gcc -Wall -Wextra -g -fsanitize=address dfree.c -o dfree
./dfree
```

预期输出（关键行如下）：

```text
==23188==ERROR: AddressSanitizer: attempting double-free on 0x602000000010 in thread T0
    #0 0x7f2c4a8627a7 in free
    #1 0x5b3a91c2b1f2 in main dfree.c:7
freed by thread T0 here:
    #1 0x5b3a91c2b1f2 in main dfree.c:6
```

报告同时给出两次 free 的行号，对照即破案。不开 ASan 也没多安全：现代 glibc 常直接中止进程，留下 `free(): double free detected in tcache 2` 一行。更深的危险：分配器用链表管理空闲块，两次释放会写坏空闲链表，此后 malloc 可能返回互相重叠的内存——历史上多起漏洞正从 double free 打进去。置 NULL 在此兑现：`free(NULL)` 无害，事故链第一环就断。

## 5. realloc 的搬移语义与经典坑

200 篇把 realloc 当扩容按钮，现在拆开。`realloc(p, new_size)` 有三种结果：

1. **原地扩展**：后面恰好有空地，返回原指针 `p`，什么都没发生；
2. **整体搬家**：找一块新地，把旧数据拷过去，**释放旧块**，返回新地址；
3. **失败**：返回 NULL，**旧块完好无损**。

结果 2 是搬移语义的全部后果：搬家后旧地址已还回分配器，**一切指向旧块的指针同时悬空**，包括你早先存下的别名。结果 3 则催生 C 语言最著名的坑之一：

```c
/* 错误写法：realloc 的返回值直接写回原指针 */
int *p = malloc(10 * sizeof(int));
/* ... */
p = realloc(p, HUGE_SIZE);   /* 若失败返回 NULL：p 被覆盖，
    原内存从此无人知道地址——泄漏，而且连 free 都做不到 */
```

失败时旧块还好好的，但你唯一知道它地址的变量已被 NULL 覆盖。修复就是 200 篇的安全姿势，现在能说出**为什么**：

```c
int *bigger = realloc(p, HUGE_SIZE);
if (bigger == NULL) {
    /* p 仍然有效：可继续用旧数据，或 free(p) 后退出 */
    free(p);
    return 1;
}
p = bigger;
```

一句话收尾：结构体末尾不写大小的**柔性数组**成员（`struct Header { size_t len; char data[]; };`）配一次 `malloc(sizeof(struct Header) + len)`，把「头 + 变长数据」放进同一块，free 一次全还。

## 6. 实际项目中的使用场景

- 长跑进程（游戏服、网关）上线前必须用 ASan 或 Valgrind 把泄漏清零：泄漏对长跑进程是死刑，工具对比见 [C Valgrind 内存检测](/c/510-CValgrind)；「偶现」崩溃的第一嫌疑人也是 use-after-free 与越界——静默错误才会偶现，用 ASan 把偶现变必现，见 [静态分析与调试](/c/490-StaticAnalysisDebug)；
- 团队守则两条：free 后置 NULL；谁分配谁释放，注释写清返回的内存归谁 free，跨文件约定在 [多文件编译](/c/310-MultiFileCompilation) 后成为日常。

## 7. 小练习

预测题（5 分钟）：下面是无 ASan 编译的代码。先写答案再运行，跑三次：

```c
int *p = malloc(sizeof(int));
if (p == NULL) return 1;
*p = 5;
free(p);
printf("%d\n", *p);
```

参考答案（先写再看）：大概率三次都打印 `5`，但标准不保证任何结果——只是内存还没被复用。按修改实验二的做法，free 后立刻再 malloc 一个新块，输出就会变成新值。「没崩」从来不是「没错」的证据。

挑战题（半小时，不看答案先动手）：把本文的 map.c 扩成「内存地图自检器」：打印五段地址后，用断言验证相对顺序。提示两级如下。

提示（思路方向）：`<stdint.h>` 的 `uintptr_t` 能把指针转成整数比大小；断言顺序参考第 2 节三条事实。

展开（关键 API）：`assert((uintptr_t)heap > (uintptr_t)&g_zero);`、`assert((uintptr_t)&local > (uintptr_t)heap);`，text 侧用 `(uintptr_t)main` 验证最小；记得 `#include <assert.h>`，断言失败会带行号中止。

验收清单：五个地址打印成行；三条断言全部通过；删掉 `= 42` 后 `&g_init` 落回 bss。本练习验证 Linux/macOS 上 gcc/clang 的常规布局，MSVC 布局不同，断言只看相对顺序。

## 8. 与之前和之后的知识的关系

- 往前：[动态内存](/c/200-DynamicMemoryManagement) 的四件套与纪律是本篇所有实验的原料，「free 后置 NULL」在第 3、4 节的事故现场完成闭环；
- 旁支：栈一侧的进出细节在 [函数调用栈帧](/c/250-FunctionCallStackFrame)；本篇看「程序住在哪」，[内存对齐](/c/220-MemoryAlignmentDeepDive) 看「一块结构体内部怎么排」；
- 往后：并发场景里这些事故会更隐蔽（两个线程同时 free），基础仍是本篇的事故分类，见 [线程与并发](/c/360-ThreadConcurrency)。

## 9. 官方文档

- realloc 的完整语义（cppreference C）：https://zh.cppreference.com/w/c/memory/realloc
- free 手册页（含未定义行为清单）：https://man7.org/linux/man-pages/man3/free.3.html
- AddressSanitizer 官方 wiki（原理与更多用法）：https://github.com/google/sanitizers/wiki/AddressSanitizer

## 10. 自我检查

- 能默画五段布局并说出每段的管理者，能用 map.c 式的打印验证；
- 拿到一份 heap-use-after-free 报告，能在三行内指出分配、释放、出错的位置；
- 能向同事讲清 `p = realloc(p, ...)` 错在哪，以及为什么临时指针能救；
- 能解释「未定义行为」为什么表现为偶现，ASan 为什么能把偶现变必现。

## 本章总结

进程内存五段各司其职：text/data/bss 由加载器铺好，stack 自动进出，heap 归你管。free 之后内存归还分配器，原指针全部悬空——use-after-free 的「有时正常」是复用时机碰巧，double free 破坏的是分配器自己的账本。realloc 可能整体搬家，别名随之作废；失败时旧块还在，所以必须临时指针接返回值。把偶现变必现的工具是 ASan，把事故链掐断的习惯是 200 篇的纪律。

## 下一步

进入 [内存对齐](/c/220-MemoryAlignmentDeepDive)：内存在哪搞清楚了，接下来看一块结构体内部——为什么三个成员的结构体不是 6 字节。
