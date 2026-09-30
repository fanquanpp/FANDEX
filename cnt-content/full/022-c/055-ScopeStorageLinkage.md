---
order: 60
title: 作用域、存储期与链接性：变量的一生与可见范围
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 从「两个同名 total 互不干扰」与「static 局部变量记住值」两个实验开题，一次办齐变量的户口（四种作用域）、寿命（四种存储期）与跨文件身份（链接性），顺带核实 register 的真实现状与 _Thread_local 的用法。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'c/310-MultiFileCompilation'
  - 'c/210-MemoryManagement'
  - 'c/260-CVolatileAndConstDeepDive'
  - 'c/360-ThreadConcurrency'
  - 'c/050-VariableConstant'
prerequisites:
  - 'c/050-VariableConstant'
  - 'c/040-DataTypeDetailed'
---

## 前置知识

- 已完成 [变量与常量](/c/050-VariableConstant)：说得出声明与定义、初始化与赋值的区别，知道静态对象默认清零而局部变量默认不确定；
- 知道 `&` 取地址、`%p` 打印地址，用过 static 或 extern 中至少一个关键字但不求甚解——本文就是来求甚解的。

> 分工说明：050 与 055 合讲 C 的变量。050 是主线（入门）：声明、初始化、四种常量、字符串字面量；本篇拆「户口与寿命」：名字在哪些行可见（作用域）、对象活多久（存储期）、跨文件谁看得见谁（链接性），并核实 register 与 _Thread_local 的真实现状。多文件工程里的头文件与链接器机制细节在 [多文件编译](/c/310-MultiFileCompilation)，本文只讲语义与用法，两篇分工明确。

## 学习目标

读完本文你将能够：

1. 列出 C 的四种作用域，判断任意一个标识符「在哪些行可见、被谁遮蔽」；
2. 列出四种存储期，解释 static 局部变量凭什么在多次调用之间记住值；
3. 分清 extern 声明与定义，看懂并修复 multiple definition 链接错误，理解暂定定义是什么；
4. 用 static 文件变量把模块内部状态封装起来，说出它与全局变量在链接性上的差别；
5. 说清 register 与 _Thread_local 的真实现状：一个仍存在但基本退役，一个是 C11 的线程私有变量。

预计 50 到 70 分钟，含 4 组动手实验与 3 道练习。

## 1. 问题引入：同名变量与记性好的计数器

```c
/* totals.c：两个 total，互不干扰 */
#include <stdio.h>

int total = 1000;                 /* 全局 total */

void demo(void) {
    static int calls = 0;         /* 记性好的计数器 */
    calls++;
    printf("demo 第 %d 次被调用\n", calls);
}

int main(void) {
    printf("全局 total = %d\n", total);
    int total = 42;               /* main 里的另一个 total */
    {
        int total = 7;            /* 花括号里的第三个 total */
        printf("内层 total = %d\n", total);
    }
    printf("main 的 total = %d\n", total);
    demo();
    demo();
    demo();
    return 0;
}
```

```bash
gcc -Wall -Wextra totals.c -o totals
./totals
```

预期输出：

```text
全局 total = 1000
内层 total = 7
main 的 total = 42
demo 第 1 次被调用
demo 第 2 次被调用
demo 第 3 次被调用
```

两个问题值得带着读完全文：三个同名 total 凭什么互不干扰——这是**作用域**在起作用；calls 只是函数里的一个局部变量，凭什么记得住上一轮的值——这是**存储期**在起作用。至于全局 total 能不能被别的 .c 文件看见、static 加在全局变量上又改变了什么，那是**链接性**的领域。

## 2. 作用域：名字在哪些行有效

C 的标识符有四种作用域（label 之外，日常变量只遇前两种）：

| 作用域 | 谁拥有 | 可见范围 |
| --- | --- | --- |
| 块作用域 | 花括号内声明的变量、函数参数 | 声明点到所在块结束 |
| 文件作用域 | 所有花括号外声明的变量与函数 | 声明点到本翻译单元结束 |
| 函数原型作用域 | 函数声明（非定义）参数表里的名字 | 只到该声明的右括号 |
| 函数作用域 | 标签（goto 的跳转目标） | 整个函数体，无视花括号 |

函数原型作用域只是说 `int f(int length);` 里的 length 这个名字出了分号就不存在，原型里甚至可以只写 `int f(int, int);`。函数作用域是标签专属——只有 goto 的目标能无视嵌套块在整个函数里被引用。剩下两种用实验看：

```c
/* scope.c：块作用域与文件作用域 */
#include <stdio.h>

int file_var = 1;                 /* 文件作用域，从这行到文件尾可见 */

void show(void) {
    for (int i = 0; i < 2; i++) { /* i 的作用域是整个 for 语句（C99 起） */
        int in_loop = i;          /* 块作用域：循环体 */
        printf("i = %d, file_var = %d\n", in_loop, file_var);
    }
    /* printf("%d\n", in_loop);   编译错误：in_loop 已出作用域 */
}

int main(void) {
    show();
    /* printf("%d\n", i);         编译错误：i 也不在 main 可见 */
    return 0;
}
```

要点两条：

1. **作用域从声明点开始**，不是从块的开头——声明之前的行里这个名字不存在；
2. **for 里声明的 i 只属于这个 for 语句**（C99 起），循环结束即销毁，两个相邻的 for 可以各声明一个 i 而互不打架。这也是 C99 之前「变量必须在块开头声明」的旧规矩被废除后的日常。

## 3. 变量遮蔽与 -Wshadow

050 已经见过内层遮外层，这里补全规则与立场。名字查找从最内层作用域向外走，命中即停——于是内层同名声明会让外层名字**在本块内完全不可见**，三种常见形态：

```c
/* shadow_full.c：遮蔽的三种形态 */
#include <stdio.h>

int level = 1;                          /* 全局 */

void f(int level) {                     /* 形态一：参数遮全局 */
    printf("f: %d\n", level);
    {
        int level = 3;                  /* 形态二：局部遮参数 */
        printf("block: %d\n", level);
    }
    printf("f again: %d\n", level);
}

int main(void) {
    f(2);
    {
        int level = 9;                  /* 形态三：局部遮全局 */
        printf("main block: %d\n", level);
    }
    printf("global: %d\n", level);
    return 0;
}
```

```bash
gcc -Wall -Wextra -Wshadow shadow_full.c -o shadow_full
./shadow_full
```

预期输出：

```text
shadow_full.c:6:10: warning: declaration of 'level' shadows a global declaration [-Wshadow]
shadow_full.c:9:17: warning: declaration of 'level' shadows a parameter [-Wshadow]
shadow_full.c:19:13: warning: declaration of 'level' shadows a global declaration [-Wshadow]
f: 2
block: 3
f again: 2
main block: 9
global: 1
```

输出本身完全符合规则，问题在**读代码的人**：两百行函数里一行 `total = 0;` 到底改了哪个 total？遮蔽不是语法错误，是可读性税。-Wshadow 把每一处遮蔽报出来，让每一次「故意遮蔽」都经得起确认；团队实践里通常直接进 CI 的警告名单（050 第 6 节的另外两个 -W 选项同理）。审查立场：给外层变量换名或拆函数，比留着遮蔽便宜得多。

## 4. 左值右值再进一步

050 立了两条口诀（能取地址的是左值；赋值号左边须是可修改的左值），这里把术语补齐。C 标准没有「变量」这个词的精确定义，只有 **object**（执行环境中的一块存储）；**左值**（lvalue）是「指向某个 object 的表达式」，`x`、`*p`、`arr[3]` 都是；**右值**（rvalue）是不指向对象的纯值，`42`、`x + 1`、函数按值返回的结果都是。

两个进阶事实：

- **左值到右值的转换**：`x + 1` 里，x 先作为左值被「读取」，取出的值参与运算——这叫 lvalue conversion。所以左值大多数时候也能出现在右边；
- **可修改左值**（modifiable lvalue）：`const int N = 100;` 里 N 是左值（`&N` 合法），但不是可修改左值，`N = 5;` 编译错误。「是左值」与「可被赋值」是两回事。

运算符与表达式的更多求值细节（优先级、序列点、整型提升）在 [运算符与表达式](/c/060-OperatorExpression)，那里会反复用到本文的 object 与左值词汇。

## 5. 存储期：对象能活多久

作用域管「名字在哪可见」，存储期管「那块存储什么时候存在」。C 有四种：

| 存储期 | 怎么获得 | 生命周期 | 典型位置 |
| --- | --- | --- | --- |
| 自动（automatic） | 块内声明，默认 | 进入块时存在，退出块时消失 | 栈 |
| 静态（static） | 文件作用域声明，或 static 修饰 | 程序全程，只初始化一次 | 静态区（.data / .bss） |
| 动态（allocated） | malloc 等库函数 | 从分配到 free | 堆 |
| 线程（thread，C11 起） | _Thread_local 修饰 | 线程创建到线程结束 | 线程局部存储 |

四种里只有「动态」没有关键字——它是库函数带来的，不是语言语义的一部分。

### 5.1 自动存储期：栈上的临时工

函数里的普通局部变量属于自动存储期：进函数时栈指针一移就分配好，退出时一并消失，成本一两条指令。它解释了两个经典事实：递归每层都有自己的局部变量副本；返回局部变量的地址是 UB——函数返回那块存储已经还给栈了（栈帧细节见 [函数调用栈帧](/c/250-FunctionCallStackFrame)）。

### 5.2 静态存储期与 static 局部变量

第 1 节的 calls 就是 static 局部变量：**static 把块内变量的存储期从自动改成静态**——存储还在静态区、程序全程存在、初始化只在程序启动时做一次（先于 main），但作用域没变，仍然只在函数内可见。这正是它「有记性」的全部原理。再做一个实验把「初始化只做一次」钉死：

```c
/* counter.c：static 局部变量的初始化只执行一次 */
#include <stdio.h>

int next_ticket(void) {
    static int ticket = 0;    /* 若每次调用都执行，输出将永远是 1 */
    ticket++;
    return ticket;
}

int main(void) {
    printf("%d\n", next_ticket());
    printf("%d\n", next_ticket());
    printf("%d\n", next_ticket());
    return 0;
}
```

```bash
gcc -Wall -Wextra counter.c -o counter
./counter
```

预期输出：

```text
1
2
3
```

补充三条使用纪律：static 局部变量的初值必须是常量表达式（050 第 2 节）；它让函数不再是纯函数（同样的输入参数，输出受历史影响），单测与并发都要多想一步；它默认清零，写 `= 0` 与不写等价，显式写出更醒目。

static 局部变量在静态区，static 全局变量也在静态区——两者存储期相同，static 在全局变量身上改的其实是**链接性**，见第 6 节。

### 5.3 extern：声明与定义的分界线

050 见过：`extern int g;` 是声明（不分配存储），`int g = 1;` 是定义。这条分界线撑起跨文件共享的全部规则：

```c
/* config.h */
#ifndef CONFIG_H
#define CONFIG_H
extern int g_config;      /* 声明：所有 include 它的 .c 都知道这个名字 */
#endif

/* config.c */
#include "config.h"
int g_config = 42;        /* 定义：全程序只许这一处 */

/* main.c */
#include "config.h"
#include <stdio.h>
int main(void) {
    printf("%d\n", g_config);
    return 0;
}
```

```bash
gcc -Wall -Wextra main.c config.c -o app
./app
```

```text
42
```

把定义写进两个 .c 会怎样？

```text
/usr/bin/ld: /tmp/ccAb12cd.o:(.data+0x0): multiple definition of `g_config'; /tmp/ccDe34ef.o:(.data+0x0): first defined here
collect2: error: ld returned 1 exit status
```

multiple definition 是链接器在执法：**外部链接的标识符全程序只许定义一次，声明可以有很多次**。头文件里放 extern 声明、恰好一个 .c 里放定义，就是让「多次声明」合法化、把唯一定义锁在指定位置的标准姿势。这套机制在构建层面的细节（翻译单元、链接器怎么找符号）由 [多文件编译](/c/310-MultiFileCompilation) 负责。

### 5.4 暂定定义：int g; 写在文件作用域是什么

一个几乎人人写过却少有人能解释的写法：

```c
/* tentative.c：文件作用域的 int g; 算声明还是定义？ */
#include <stdio.h>

int g;              /* 这是「暂定定义」（tentative definition） */
int g;              /* 同一个翻译单元里可以再次暂定 */
int g = 7;          /* 真正的定义终于出现 */

int main(void) {
    printf("%d\n", g);
    return 0;
}
```

```text
7
```

规则：文件作用域、无初值、无存储类说明符（或带 static）的声明是**暂定定义**——它「暂定」为定义，若整个翻译单元读到最后仍没有真正的定义出现，编译器就当你在文件末尾写了 `int g = 0;`。所以单独一个 `int g;` 也能用（默认 0），重复的暂定彼此不算 multiple definition，`extern int g;` 则始终只是声明。便利归便利，工程里更推荐「头文件 extern + 一个 .c 定义」的显式写法：暂定定义的宽容在 C++ 里并不存在，也容易让「这变量到底在哪定义的」变成考古题。

### 5.5 动态存储期与线程存储期，各一句话

动态存储期：malloc 分配的对象既不在栈也不在静态区，寿命由 free 决定，全套用法与事故现场见 [动态内存](/c/200-DynamicMemoryManagement) 与 [内存深水区](/c/210-MemoryManagement)。线程存储期见第 7 节。

## 6. 链接性：跨文件谁看得见谁

作用域管一个翻译单元内部的可见性，**链接性**（linkage）管跨翻译单元的可见性。三档：

| 链接性 | 谁拥有 | 效果 |
| --- | --- | --- |
| 外部链接（external） | 文件作用域的变量与函数，默认 | 其他 .c 用 extern 声明后可用 |
| 内部链接（internal） | 文件作用域加 static | 只在本翻译单元可见 |
| 无链接（no linkage） | 块作用域变量、函数参数 | 出了块就不存在 |

`static` 是多义关键字，现在集齐全部语义：**修饰块内变量改存储期（5.2 节），修饰文件作用域变量或函数改链接性**——存储期本来就静态，static 只是把它从「对外可见」降级为「文件私有」。这恰是 C 里实现信息隐藏的正统手段：

```c
/* stack.c：static 封装的迷你栈 */
#include <stdbool.h>
#include <stddef.h>

#define CAPACITY 16

static int   data[CAPACITY];   /* 文件私有：别的 .c 看不见 */
static size_t top = 0;         /* 同上：模块内部状态 */

bool push(int x) {             /* 外部链接：模块的公开接口 */
    if (top == CAPACITY) return false;
    data[top++] = x;
    return true;
}

bool pop(int *out) {
    if (top == 0) return false;
    *out = data[--top];
    return true;
}
```

```c
/* user.c：只经接口使用，data 与 top 无法被绕过 */
#include <stdbool.h>
#include <stdio.h>

bool push(int x);
bool pop(int *out);

int main(void) {
    push(10);
    push(20);
    int v;
    pop(&v);
    printf("%d\n", v);
    return 0;
}
```

```bash
gcc -Wall -Wextra stack.c user.c -o stack_demo
./stack_demo
```

```text
20
```

user.c 想直接读 top？名字在 user.c 里根本不存在——访问 `data` 与 `top` 的唯一路径是公开函数，模块的不变量（top 不会越过 CAPACITY）就有了保证。若把 static 去掉，data 与 top 变成外部链接，任何 .c 加一行 extern 就能绕过接口乱改——这就是「static 全局变量是封装不是优化」的含义。

三档链接性与头文件的搭配惯例收口：对外公布的接口（函数与确实要共享的变量）在头文件里放声明（变量用 extern），定义锁在对应 .c；只为自己服务的函数与变量全部加 static。要不要对外、对外暴露多少，是模块设计的第一个决定，机制全景见 [多文件编译](/c/310-MultiFileCompilation)。

## 7. register：仍在标准里，但基本退役

```c
/* reg.c：register 对象不可取地址 */
int main(void) {
    register int fast = 0;
    int *p = &fast;           /* 编译错误 */
    return p != 0;
}
```

```bash
gcc -Wall -Wextra -c reg.c -o /dev/null
```

```text
reg.c:4:14: error: address of register variable 'fast' requested
```

按现行标准（截至 C23）核实三句话：

1. **register 仍然存在**，是合法的存储类说明符，语义为「自动存储期，且不可取地址」——`&fast` 不是警告，是约束违反，直接编译失败（数组形式的 register 变量同样不能退化为指针）。网上流传的「C23 删掉了 register」并不属实；
2. **它作为优化提示已被现代编译器无视**：寄存器分配算法做得远比人好，编译器保留的只有「不可取地址」这条硬约束，提示本身不再影响优化决策。它历史上真正的用武之地之一（K&R 旧式函数定义的参数声明）已随 C23 删除旧式函数定义而消失；
3. **新代码没有理由使用它**。读到遗留代码里的 register，可当作「作者想让它快」的历史注释，删掉不影响语义——唯一要留意的是它同时意味着「没人能取它的地址」。

## 8. _Thread_local：每个线程一份的变量

```c
/* tls.c（需要支持 C11 线程的环境编译运行） */
#include <threads.h>
#include <stdio.h>

_Thread_local int progress = 0;    /* C11 关键字：线程存储期 */

int worker(void *arg) {
    int id = *(int *)arg;
    progress += 100;               /* 只改自己线程的那一份 */
    printf("worker %d sees progress = %d\n", id, progress);
    return 0;
}

int main(void) {
    thrd_t a, b;
    int ia = 1, ib = 2;
    thrd_create(&a, worker, &ia);
    thrd_create(&b, worker, &ib);
    thrd_join(a, 0);
    thrd_join(b, 0);
    printf("main sees progress = %d\n", progress);
    return 0;
}
```

```bash
gcc -Wall -Wextra tls.c -o tls -pthread   # glibc 环境编译 C11 线程通常加 -pthread
./tls
```

一次典型输出（两个 worker 各自看到自己的 100，main 看到自己的 0）：

```text
worker 1 sees progress = 100
worker 2 sees progress = 100
main sees progress = 0
```

`_Thread_local` 是 C11 引入的关键字，给对象线程存储期：**每个线程各有一份独立实例**，互不可见。标准库 errno 的「每个线程有自己的错误码」、线程本地的随机数状态与日志缓冲，都是这一语义的教科书应用。C23 补了无下划线的 thread_local 拼写。注意两点边界：它解决的是「隔离」，不是「同步」——多个线程要改**同一份**数据时，需要的是原子操作（[原子操作与内存模型](/c/380-AtomicAndMemoryModel)）或锁；线程创建、join 与完整的数据竞争话题在 [线程与并发](/c/360-ThreadConcurrency)。

## 9. C23 的一句话补充与存储类总表

C23 的 `constexpr` 让「有类型、有作用域、还能当数组大小的编译期常量」终于齐装满员，050 第 4 节已给对比表，细节在 [C23 与 C2y 新特性](/c/520-C23C2y)。存储类说明符全部语义收进一张表：

| 说明符 | 用在 | 改变什么 |
| --- | --- | --- |
| auto | 块内（可省略） | 什么都不改：自动存储期、无链接的默认值（C23 里 auto 另获类型推导新身份，见 C23 篇） |
| register | 块内 | 自动存储期 + 不可取地址；优化提示已被编译器无视 |
| static | 块内 | 存储期：自动改静态 |
| static | 文件作用域 | 链接性：外部改内部 |
| extern | 任意 | 声明而非定义；引用别处的外部链接定义 |
| _Thread_local | 文件或块内 | 存储期改线程（可与 static / extern 组合） |

## 10. 实际项目中的使用场景

- **模块化边界**：.c 文件里不打算对外的一切（辅助函数、内部状态）全部 static，接口进头文件——代码评审里「这个函数为什么不是 static」是高频问题，答案是「它对外无意义就该私有」，链接机制见 [多文件编译](/c/310-MultiFileCompilation)；
- **性能敏感的跨线程状态**：线程本地计数、缓冲先想 _Thread_local 再想锁，能隔离就不共享，共享就必谈原子与内存序（[线程与并发](/c/360-ThreadConcurrency)、[原子操作与内存模型](/c/380-AtomicAndMemoryModel)）；
- **变量住哪一段**：静态变量落 .data 或 .bss、自动变量落栈，先于程序行为决定内存画像——排查「全局数组让可执行文件变大」「大局部数组爆栈」时按图索骥，地图在 [内存深水区](/c/210-MemoryManagement)；
- **const 的另一半**：本文的 static 管可见性，const 管「改不改得」，两者常叠加成 `static const` 文件级只读表，限定符语义见 [const 与 volatile 详解](/c/260-CVolatileAndConstDeepDive)。

## 11. 小练习

预测题（5 分钟）：先写答案再运行：

```c
#include <stdio.h>

int g;

void bump(void) {
    static int n = 10;
    int m = 0;
    n++;
    m++;
    g++;
    printf("n = %d, m = %d, g = %d\n", n, m, g);
}

int main(void) {
    bump();
    bump();
    bump();
    return 0;
}
```

参考答案（先写再看）：n 依次 11、12、13（静态存储期，活得过调用，初值只生效一次）；m 三次都是 1（自动存储期，每调一次重生）；g 依次 1、2、3（静态存储期且默认清零，外部链接所以它同时是「全局的」）。三个变量正好各占一种组合。

修改题（10 分钟）：把 5.3 节拆成两个文件后故意在第二个 .c 里再写一遍 `int g_config = 42;`，看链接器的 multiple definition 报告；然后分别用「删掉重复定义」与「给两处都加 static」两种方式处理并重新编译——想清楚：第二种修复为什么能过链接器，却几乎总是错的（两个文件各养各的变量，看着同名实则无关）。

挑战题（半小时，不看答案先动手）：改造自「写一个使用全局配置的小程序」的实践题：把 050 第 4 节的常量与本文的栈模块组装成三文件工程——config.h 放 `extern` 声明与容量常量（枚举写法），config.c 放唯一定义，stack.c 提供 static 封装的 push/pop 与一个 static 计数器 `total_pushed`，stats.c（或 main）经接口查询「总共压了多少个」。验收三条：gcc -Wall -Wextra -Wshadow 全绿；故意在 stack.c 外直接访问 data 应得到 undefined reference；total_pushed 只能经接口读到。

提示（思路方向）：接口最小化——stats 需要的只是 `size_t stack_total_pushed(void);` 一个函数，不要为了省函数把计数器暴露出去。

提示（再进一步）：config.h 记得写 include guard；两个 .c 都 include 同一个 config.h 正是「声明可多次、定义仅一处」的实战形态。

## 12. 与之前和之后的知识的关系

- 往前：[变量与常量](/c/050-VariableConstant) 的「静态默认清零」「extern 是纯声明」在本文全部兑现成因；[数据类型详解](/c/040-DataTypeDetailed) 的类型知识与本文的存储期、链接性共同构成一个变量的完整档案；
- 往后：[多文件编译](/c/310-MultiFileCompilation) 把本文的链接性变成工程现实（头文件、库、链接器报错全解）；[函数调用栈帧](/c/250-FunctionCallStackFrame) 拆开自动存储期的栈机制；[运算符与表达式](/c/060-OperatorExpression) 的求值反复使用第 4 节的 object 与左值词汇；
- 更远：线程与数据竞争在 [线程与并发](/c/360-ThreadConcurrency)，原子与内存序在 [原子操作与内存模型](/c/380-AtomicAndMemoryModel)，C23 新关键字在 [C23 与 C2y 新特性](/c/520-C23C2y)。

## 13. 官方文档

- cppreference：作用域（四种作用域与嵌套遮蔽规则）：https://en.cppreference.com/w/c/language/scope
- cppreference：存储期与存储类说明符（四种存储期、static/extern/register 逐条语义）：https://en.cppreference.com/w/c/language/storage_duration
- cppreference：外部定义与暂定定义（tentative definition 规则原文）：https://en.cppreference.com/w/c/language/extern

## 14. 自我检查

- 给任意一行变量声明，能说出它的作用域、存储期、链接性三属性，并指出会被谁遮蔽；
- 能解释 counter.c 里 ticket 为什么记得住值、初始化为什么只执行一次；
- 看到 multiple definition 报错能定位并修复，说得出头文件里放 extern 声明的理由；
- 能纠正两个流行误传：「C23 删除了 register」（没有）与「volatile 能保证线程安全」（那是 _Atomic 与锁的事）。

## 本章总结

一个变量三份档案：作用域说名字在哪些行有效（块、文件、函数原型、函数标签四种，内层遮外层，-Wshadow 守门）；存储期说存储何时存在（自动住栈、静态活全程且只初始化一次、动态听 malloc 与 free、线程按线程各一份）；链接性说跨文件身份（外部默认可见、static 文件变量降为内部、块内无链接）。static 因此一身二任：块内改存储期，文件内改链接性。extern 与暂定定义划清「声明」与「定义」的边界，头文件放声明、定义只留一处。register 还在标准里但只剩「不可取地址」一条硬约束，优化提示早被编译器无视；_Thread_local 是 C11 给多线程的「每线程一份」。变量的一生到此办齐——接下来该看它们在表达式里如何运算了。

## 下一步

进入 [运算符与表达式](/c/060-OperatorExpression)：左值右值已在手，下一步看运算符如何把对象与值组装成表达式——优先级、类型转换与求值顺序里还埋着不少经典陷阱。
