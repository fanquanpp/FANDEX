---
order: 350
title: 多文件编译：翻译单元、头文件与链接器
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 把 200 行单文件拆成 main.c + utils.c + utils.h 后撞上 undefined reference：从链接器报错进入多文件世界。翻译单元互不可见、声明给人看定义给链接器、一条命令与分开 -c 编译的等价实验、nm 读符号表、undefined reference 与 multiple definition 两大报错逐个复现修复、extern 共享变量与 include/src 工程布局，全程裸 gcc 看得见每一步。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'c/320-DynamicStaticLibrary'
  - 'c/470-BuildSystem'
  - 'c/290-PreprocessorMacro'
  - 'c/300-InlineFunctionMacro'
prerequisites:
  - 'c/090-FunctionDetailed'
  - 'c/055-ScopeStorageLinkage'
---

## 前置知识

- 已完成 [函数：声明、传值与递归](/c/090-FunctionDetailed)：会写函数原型，分得清声明与定义；
- 已完成 [作用域、存储期与链接性](/c/055-ScopeStorageLinkage)：知道 static 与 extern 的用法，听过外部链接（external linkage）、内部链接（internal linkage）这些词。没读过也能往下读，用到链接性时本文会带一句。

> 分工说明：055 与本篇是一对。[作用域、存储期与链接性](/c/055-ScopeStorageLinkage) 讲语言语义：名字谁看得见、对象活多久；本篇承接机制：一个 .c 怎么变成 .o、头文件在给谁递声明、链接器怎么把多个 .o 拼成一个程序。库的创建与使用整篇在 [动态库与静态库](/c/320-DynamicStaticLibrary)；Makefile 与 CMake 的构建机制在 [构建系统](/c/470-BuildSystem)。本篇全程只用裸 gcc 命令，让每个环节都亲眼可见。

## 学习目标

读完本文你将能够：

1. 解释翻译单元为什么互不可见，说出「声明给人看、定义给链接器」分别服务的对象；
2. 用 gcc 一条命令与「分开 -c 再链接」两种方式构建同一个多文件程序，并用 ls 亲眼看到中间产物 .o；
3. 写出规范的模块头文件：守卫齐全、只放声明/类型/宏，说出往头文件里写定义会撞上什么报错；
4. 用 nm 查看自己 .o 的符号表，据此诊断 undefined reference 与 multiple definition 两大报错；
5. 用 extern 配 globals.c/globals.h 惯例跨文件共享变量，用 include/src 目录布局与 -I 组织一个小工程。

预计 60 到 80 分钟，含 7 组动手实验与 2 道练习。

## 1. 问题引入：undefined reference 从哪来

第一个程序 200 行，全挤在 main.c 里。功能一多你决定拆分：把工具函数挪出去，变成三个文件：

```c
/* main.c */
#include <stdio.h>
#include "utils.h"

int main(void) {
    printf("sum 1..10 = %d\n", sum_to(10));
    return 0;
}
```

```c
/* utils.h */
#ifndef UTILS_H
#define UTILS_H

int sum_to(int n);   /* 声明。守卫先照抄，第 3 节拆解 */

#endif
```

```c
/* utils.c */
#include "utils.h"

int sum_to(int n) {          /* 定义。真正的实现在这里 */
    int total = 0;
    for (int i = 1; i <= n; i++) {
        total += i;
    }
    return total;
}
```

编译——报错了：

```bash
gcc -Wall -Wextra main.c -o app
```

```text
/usr/bin/ld: /tmp/ccGw1nA2b.o: in function `main':
main.c:(.text+0x1f): undefined reference to `sum_to'
collect2: error: ld returned 1 exit status
```

（/tmp 的随机名是 gcc 的临时文件，每次不同；报错措辞各平台略有差异。）

疑点：代码语法零错误，utils.c 甚至没参与这次编译。把两个 .c 都给上，就好了：

```bash
gcc -Wall -Wextra main.c utils.c -o app
./app
```

```text
sum 1..10 = 55
```

这条 undefined reference 来自链接器（linker，命令行上的 ld），不是编译器。它是 C 工程出现频率最高的报错，背后是一整套「多个 .c 如何变成一个程序」的机器。本篇把它拆开。

## 2. 翻译单元：每个 .c 都是一座孤岛

### 2.1 编译器一次只看一个文件

翻译单元（translation unit）：一个 .c 源文件经过预处理后的完整结果——原文件全部内容，加上它直接或间接 `#include` 进来的所有头文件内容。C 标准（C23 第 5.1.1.2 节）把从源文件到程序的过程划成 8 个翻译阶段，逐阶段细节在 [预处理器与宏](/c/290-PreprocessorMacro)；对本文重要的只有三步：

```text
阶段 4（预处理）：把 #include 的头文件内容原样贴进来，删掉注释与指令
                  → 到此形成翻译单元
阶段 7（编译）  ：每个翻译单元独立翻译成一个目标文件（object file，.o）
阶段 8（链接）  ：链接器把所有 .o 连同库拼装成可执行文件
```

关键在「独立」二字：编译 utils.c 时，编译器根本不知道 main.c 存在；反之亦然。每个 .c 是一座孤岛，岛与岛之间只有两条通信渠道：头文件（给编译器看）和符号（给链接器找）。本篇就是围绕这两条渠道展开。

顺带一提，这个模型也有反着用的极端：SQLite 官方把全部源码合并成单个 sqlite3.c 发布，一次编译得到整个库——孤岛并入大陆，编译器一次看完全局。

### 2.2 声明给人看，定义给链接器

| | 声明（declaration） | 定义（definition） |
| --- | --- | --- |
| 干什么 | 报名字、报类型 | 分配存储 / 落函数体 |
| 给谁看 | 编译器（做类型检查、生成调用） | 链接器（符号的真正住址） |
| 能出现几次 | 随便多次，跨多个 .c 都行 | 外部链接的名字全程序恰一次 |

```c
int sum_to(int n);              /* 声明：编译器知道有这么个函数 */
extern int g_verbose;           /* 声明：变量定义在别处，这里报个到 */

int sum_to(int n) { return n; } /* 定义：机器码在这里 */
int g_verbose = 0;              /* 定义：存储在这里 */
```

C 标准规定：具有外部链接的名字，在整个程序中必须恰有一个定义（C23 第 6.9 节）。C++ 生态把这条叫单一定义规则（One Definition Rule，ODR），C 的措辞朴素得多：一个名字，一份定义。

回头看第 1 节的结构：utils.h 放声明，给 main.c 的编译器看；utils.c 放定义，给链接器找。「声明给人看，定义给链接器」是贯穿全篇的主线。

### 2.3 实验 1：一条命令与分开编译是等价的

一条命令传多个 .c 时，gcc 内部其实是先逐个编译成 .o，再把 .o 链接成可执行文件。亲手拆开验证：

```bash
gcc -Wall -Wextra -g -c main.c    # -c：只编译不链接，产出 main.o
gcc -Wall -Wextra -g -c utils.c   # 产出 utils.o
ls *.o
```

```text
main.o  utils.o
```

中间产物就躺在目录里。再一步把它们链接起来：

```bash
gcc main.o utils.o -o app
./app
```

```text
sum 1..10 = 55
```

GCC 文档对 -c 的定义就是「Compile or assemble the source files, but do not link」，每个源文件各自产出一个 .o（后缀替换）。两种构建方式产物完全一致——一条命令只是省了手敲中间步。工程里坚持分开编译不是多此一举：文件一多，它是增量构建的地基（utils.c 没改就只重编 main.c），记账的活归 [构建系统](/c/470-BuildSystem)。

修改实验：只把半个程序交给链接器：

```bash
gcc main.o -o half
```

```text
/usr/bin/ld: main.o: in function `main':
main.c:(.text+0x1f): undefined reference to `sum_to'
collect2: error: ld returned 1 exit status
```

与第 1 节一模一样的报错，但这次没有悬念：main.o 里有个符号叫 sum_to，链接命令里却没有谁能提供它。第 1 节那条报错同理——gcc 其实已经把 main.c 编译完了（临时 .o 都生成了），是链接阶段没人接得住 sum_to。

## 3. 头文件：写给别的翻译单元看的说明书

### 3.1 放什么、不放什么

头文件（header）是岛的对外说明书。放：

- 函数声明——模块的公开 API；
- 类型——struct、union、enum、typedef；
- 宏定义。

不放：

- 函数实现。实现是定义，进了头文件，每个包含它的翻译单元都会复制一份，链接时撞车（第 8 节完整复现现场）。唯一的例外是小函数用 inline 写进头文件，C 的 inline 规则微妙（非 static 的 inline 不构成外部定义，须在恰一个 .c 里补外部定义），整篇在 [内联函数与宏](/c/300-InlineFunctionMacro)；
- 变量定义。同因同果，正确姿势是 extern 声明，第 6 节讲。

顺带认识一个常见技巧：`typedef struct HashMap HashMap;` 这种「只给名字不给内容」的声明叫不完整类型（incomplete type），配合 .c 里的完整定义，能把结构体内部彻底藏起来——SQLite、libuv 等项目的公开头文件正是这么封装的。

### 3.2 尖括号与引号：include 的两条搜索路线

```c
#include <stdio.h>     /* 尖括号：找系统目录 */
#include "utils.h"     /* 引号：先找当前目录，再找系统目录 */
```

GCC 的实际搜索顺序：

| 写法 | 搜索顺序 |
| --- | --- |
| `#include "utils.h"` | 当前文件所在目录 → -I 指定目录（按命令行顺序）→ 系统目录 |
| `#include <stdio.h>` | -I 指定目录（按命令行顺序）→ 系统目录 |

尖括号跳过当前目录，直接表态「这是别人的头」；引号先找自己家，再按 -I 与系统目录找。-I 怎么用在第 7 节登场。

### 3.3 头文件守卫与 #pragma once

第 1 节照抄的守卫（include guard）拆解如下：

```c
#ifndef UTILS_H
#define UTILS_H
/* ...声明... */
#endif /* UTILS_H */
```

原理是宏开关：第一次包含时 UTILS_H 未定义，进入块内并定义它；同一翻译单元第二次包含（无论直接还是经由别的头）时宏已定义，整块被预处理器跳过。

命名惯例：大写加下划线，带项目前缀（如 FANDEX_UTILS_H）；别用「下划线开头 + 全大写」（如 _UTILS_H），这类拼写被语言实现保留。

另一种写法是在文件第一行放 `#pragma once`，让编译器自己记住「这个文件只处理一次」。GCC、Clang、MSVC 都支持它，但它不是标准——GCC 文档干脆把它归入「过时的只含一次头」一节，并提醒并非所有预处理器都识别、可移植程序不能指望。守卫是唯一的跨平台保险；#pragma once 胜在省心；两者同写的大项目也不少见。

修改实验：守卫到底防什么？做一个没有守卫的头文件，塞进一个 typedef，然后在 main.c 里包含它两次：

```c
/* utils_noguard.h */
typedef struct Point { int x; int y; } Point;
```

```c
/* main.c */
#include "utils_noguard.h"
#include "utils_noguard.h"

int main(void) { return 0; }
```

```bash
gcc -Wall -Wextra main.c -o app
```

```text
In file included from main.c:2:
utils_noguard.h:1:8: error: redefinition of 'typedef struct Point Point'
utils_noguard.h:1:8: note: originally defined here
```

对照着再试一步：把 typedef 换成一个函数声明 `int twice(int x);`，删掉守卫重复包含却相安无事——声明可以重复，守卫真正防的是「同一翻译单元里出现第二份定义」（类型定义、宏）。纯声明头不写守卫也能编过，但没人赌这一点：守卫一律加上。

### 3.4 包含顺序惯例：自己的头放第一位

源文件的 include 区，通行惯例是分三层，且自己的头永远放第一：

```c
/* utils.c */
#include "utils.h"        /* 1. 自己对应的头，放最前 */

#include <stdio.h>        /* 2. 标准库 */
#include <stdlib.h>

#include "log.h"          /* 3. 本项目其他头 */
```

自己的头放第一位有个妙处：utils.h 若自身缺依赖（比如用了 size_t 却忘了 `#include <stddef.h>`），编译 utils.c 时立刻在 utils.h 里报错；若它排在系统头后面，缺的依赖可能被前面的头顺手补上，编译侥幸通过——换个编译器、换个包含顺序就炸。第一位的头是每个翻译单元的依赖自检器。

## 4. 链接器：符号表的拼装工

### 4.1 目标文件里有什么

.o 不是最终机器码，而是「半成品 + 一张清单」：代码与数据按段（section）存放——.text 代码段、.data 已初始化数据、.bss 清零数据、.rodata 只读数据；另有一张符号表（symbol table），记录「我定义了哪些名字、我用了哪些还没着落的名字」。链接器的全部工作围绕这张表展开：

1. 符号解析（symbol resolution）：对每个 .o 报上来的未定义符号，去其他 .o 或库里找唯一定义；
2. 重定位（relocation）：把各 .o 的段合并成整体，把代码里「给 sum_to 留的空位」填成最终地址。

```text
链接前：main.o 的 .text 里 call sum_to 留着空位；utils.o 的 sum_to 在自己的段里
链接后：两个 .text 拼成一段，sum_to 有了最终地址，空位被填上
```

（目标文件在 Windows 的 MSVC 工具链下是 .obj，报错措辞也不同；本篇以 Linux/macOS 的 gcc 为准。）

### 4.2 实验 2：nm 看自己的符号

```bash
gcc -c main.c utils.c
nm main.o
```

```text
0000000000000000 T main
                 U printf
                 U sum_to
```

```bash
nm utils.o
```

```text
0000000000000000 T sum_to
```

读法：nm 按字母序列出符号，前面的字母是符号类型，小写表示本文件私有，大写表示全局可见。常用的几个：

| 字母 | 含义 |
| --- | --- |
| T / t | 定义在代码段 .text；大写外部链接，小写内部链接 |
| D / d | 已初始化数据段 |
| B / b | bss 段（清零数据） |
| U | 未定义——等链接器解决 |
| R / r | 只读数据段 |

main.o：T main 是我定义的；U sum_to、U printf 是我用了但没定义的。utils.o：T sum_to。链接器的活，就是把 main.o 的 U sum_to 接到 utils.o 的 T sum_to 上——第 1 节的报错不过是这张表对不上账。

现在给 utils.c 加一个私有函数，再看符号表：

```c
/* utils.c */
#include "utils.h"

static int clamp_down(int n) {   /* static：内部链接，语义详见 055 篇 */
    return n < 0 ? 0 : n;
}

int sum_to(int n) {
    int total = 0;
    for (int i = 1; i <= clamp_down(n); i++) {
        total += i;
    }
    return total;
}
```

```bash
gcc -c utils.c && nm utils.o
```

```text
0000000000000010 t clamp_down
0000000000000000 T sum_to
```

小写 t：clamp_down 没进全局符号表。这正是文件内 static 的封装价值——模块的辅助函数一律 static：不占全局名字（别的 .c 也定义 helper 也撞不到它），编译器与链接器看得见全部调用、优化空间更大，没人调用的还能被裁掉。链接性语义的完整规则在 [作用域、存储期与链接性](/c/055-ScopeStorageLinkage)，本篇给的是它在符号表上的长相：大写对外，小写对内。

### 4.3 一条铁律，两大报错

第 2.2 节的铁律「一个名字，一份定义」在链接器这里兑现成两条底线：每个 U 必须恰好被一个定义接住（否则 undefined reference）；每个外部名字必须只定义一次（否则 multiple definition）。两大报错的逐个复现在第 8 节。

## 5. 头文件循环依赖：编译错误现场与前向声明

两个类型互相持有对方的指针，写出这样的头文件：

```c
/* a.h */
#ifndef A_H
#define A_H
#include "b.h"

typedef struct A {
    B *b;
} A;
#endif
```

```c
/* b.h */
#ifndef B_H
#define B_H
#include "a.h"

typedef struct B {
    A *a;
} B;
#endif
```

```bash
gcc -c main.c     # main.c 第一行 include 了 a.h
```

```text
In file included from a.h:4,
                 from main.c:1:
b.h:7:5: error: unknown type name 'A'
```

（报错里嵌套的文件行号恰好就是包含链。）

逐行还原事故：预处理 main.c → 展开第 1 行的 a.h → 定义守卫 A_H → 展开第 4 行的 b.h → 定义守卫 B_H → b.h 又 include a.h，但 A_H 已定义，整个文件被守卫跳过 → 于是 b.h 用到 A 时，A 还没来得及定义。守卫没失职：它防的是同一翻译单元重复包含；而循环引用里，总有一方会被守卫堵在门外。

修复靠前向声明（forward declaration）：先声明「世上有个 struct A」，完整定义晚点再说。

```c
/* a.h */
#ifndef A_H
#define A_H

struct B;               /* 前向声明：有个 struct B，长什么样不告诉你 */

typedef struct A {
    struct B *b;        /* 指针成员不需要完整类型 */
} A;
#endif
```

```c
/* b.h */
#ifndef B_H
#define B_H

struct A;

typedef struct B {
    struct A *a;
} B;
#endif
```

能过是因为指针的大小与目标类型无关——存一个 struct B * 只需要知道「是个地址」。代价是前向声明的类型只能当指针用：不能拿它定义对象（编译器不知道大小），不能访问成员。附带的红利：能前向声明就别 include，头文件依赖越少，改动后的重编译越少——依赖的账归 [构建系统](/c/470-BuildSystem) 管。

## 6. extern 变量：跨文件共享一个「全局」

跨文件共享变量的惯例是 globals 三件套：

```c
/* globals.h */
#ifndef GLOBALS_H
#define GLOBALS_H

extern int g_verbose;    /* 声明：告诉所有包含者「有这么个 int，定义在别处」 */

#endif
```

```c
/* globals.c */
#include "globals.h"

int g_verbose = 0;       /* 定义：存储与初始化都在这里，全程序仅此一份 */
```

```c
/* main.c */
#include <stdio.h>
#include "globals.h"

int main(void) {
    g_verbose = 1;
    printf("verbose = %d\n", g_verbose);
    return 0;
}
```

```bash
gcc -Wall -Wextra main.c globals.c -o app && ./app
```

```text
verbose = 1
```

main.c 与 globals.c 是两座孤岛，却读写着同一个变量——链接器把两边的 g_verbose 对到了同一份存储上。三条纪律：

1. 初始化只写在定义文件里。extern 声明不带初值；`extern int g_verbose = 0;` 一带初值就不是声明而是定义，后果见第 8 节；
2. 类型必须处处一致。链接器按名字找人，不核对类型：定义处写 int、别处 `extern long g_verbose;`，编译链接都通过，读写行为却是未定义。「声明给人看」的意义正在于此——给人看的说明书都写错，程序自然没人救得了；
3. 能不用就不用。裸全局变量是跨文件耦合的直通车：谁都能改、难测试、并发下危险。更稳的设计是把变量藏成 static，只暴露访问函数（如 `int verbose_enabled(void);` / `void verbose_set(int on);`）——static 的语义在 [作用域、存储期与链接性](/c/055-ScopeStorageLinkage)。

函数天然就是「对外」的：头文件里的原型不用写 extern。extern 这个关键字对变量声明才是必需的标记。

## 7. 工程结构：include/ 与 src/

文件一多，头文件别再和 .c 混放。通行布局是头文件独立成目录：

```text
app/
├── include/
│   └── utils.h          # 对外公开的头
└── src/
    ├── main.c
    └── utils.c
```

头文件不再挨着使用者的目录，引号包含的「当前目录优先」帮不上忙了，轮到 -I：

```bash
gcc -Wall -Wextra -g -Iinclude src/main.c src/utils.c -o app
./app
```

```text
sum 1..10 = 55
```

-Iinclude 把 include/ 加进搜索路径，位置见 3.2 节的表：引号形式按「当前目录 → -I → 系统目录」找，尖括号形式按「-I → 系统目录」找。此后任何 .c 里写 `#include "utils.h"` 都能命中。src/ 里若还有内部专用的头（比如 src/internal.h），再加一个 -Isrc 即可；也有小项目干脆把头和 .c 全放 src/ 用 -Isrc 一把梭。布局是手段，「公开的头进独立目录、内部头留在实现侧」才是惯例的内核。

顺带一提：到了 make 的世界，即使 Makefile 一行规则不写，`make main.o` 也能从 main.c 造出 main.o——make 内置了「%.o 由同名 %.c 编译而来」的隐式规则（implicit rule）。机制全貌在 [构建系统](/c/470-BuildSystem)；你只需要知道，本篇手敲的每条 gcc -c 命令，make 都存着模板。

## 常见错误与调试实录：undefined reference 五连与 multiple definition

诊断总纲：链接器报错都指向一个符号名。先别急着改代码，用 nm 把相关 .o 看一遍——谁在要（U）、谁在给（T/D）——再对症下药。以下均在 Linux gcc 上复现，其他平台措辞有差异。

### 现场 1：忘了把定义所在的 .o 交给链接器

第 1 节与 2.3 节已完整复现。nm 证据：main.o 里 U sum_to，而链接命令里没有 utils.o——没人接得住。修法：把 utils.o（或 utils.c）补进命令。这是五种成因里最常见的一种。

### 现场 2：名字拼错

```c
/* main.c 里 */
printf("%d\n", sumTo(10));     /* 定义的是 sum_to */
```

```text
/usr/bin/ld: main.o: in function `main':
main.c:(.text+0x1f): undefined reference to `sumTo'
collect2: error: ld returned 1 exit status
```

报错里的 sumTo 就是答案：nm utils.o 一眼看到 T sum_to。大小写、下划线逐字符对。

### 现场 3：原型与定义不一致（C 链接器不核对参数）

```c
/* main.c —— 嫌 include 麻烦，手抄了原型，还抄错了参数表 */
#include <stdio.h>

int sum_to(void);            /* utils.c 的真实定义是 int sum_to(int) */

int main(void) {
    printf("sum 1..10 = %d\n", sum_to());
    return 0;
}
```

```bash
gcc -Wall -Wextra main.c utils.c -o app   # 编译链接双双通过
./app
```

```text
sum 1..10 = -1049437168
```

（数值每次不同：sum_to 按自己的定义去读第一个参数，读到的是寄存器里谁留下的垃圾。）

原因：C 编译出的符号就是 sum_to 本名，链接器只按名字配对，不核对参数类型——两个翻译单元各自「自洽」，冤案无人过问。修复：原型只从头文件来。删掉手抄声明，`#include "utils.h"`。顺带验证头文件的自检力：若把这条错误原型写进 utils.h，utils.c 一编译就报 conflicting types for 'sum_to'，当场拦下；手抄原型正是绕开了这道安检。

两句背景：C++ 编译器会把参数类型编进符号名（name mangling，nm 下长成 _Z6sum_toi 这类修饰名），所以同类错误在 C++ 里通常当场表现为 undefined reference；C 库要被 C++ 调用时，头文件里 `#ifdef __cplusplus extern "C" {` 的包裹就是让 C++ 侧放弃修饰、按 C 本名找符号。细节属于 C++ 侧，此处备一句即可。

### 现场 4：漏写 static 导致撞名

两个 .c 各有一个本想私有的同名函数，都没写 static：

```c
/* logger.c */
void log_reset(void) { /* ... */ }   /* 想私有，忘写 static */

/* net.c */
void log_reset(void) { /* ... */ }   /* 另一个模块也想私有，同样忘写 */
```

```text
/usr/bin/ld: net.o: in function `log_reset':
net.c:(.text+0x0): multiple definition of `log_reset'; logger.o:logger.c:(.text+0x0): first defined here
collect2: error: ld returned 1 exit status
```

修法：两处都加 static。内部链接让符号退出全局符号表（nm 里变大写为小写 t，4.2 节刚见过），两座岛各用各的同名函数，互不干扰。语义在 [作用域、存储期与链接性](/c/055-ScopeStorageLinkage)。

### 现场 5：库的顺序问题（一句带过）

链接静态库时，ld 从左到右扫描、只补「扫描到此处时已经欠下」的符号，所以库要放在用到它的目标文件右边：gcc main.o -lutils 行，gcc -lutils main.o 就会莫名 undefined reference。静态库动态库的完整机制在 [动态库与静态库](/c/320-DynamicStaticLibrary)。

### multiple definition 现场：头文件里写定义的教训

把第 6 节的 globals 惯例写错一步——初始化顺手写进了头文件：

```c
/* globals.h */
#ifndef GLOBALS_H
#define GLOBALS_H

int g_verbose = 0;       /* 教训现场：这是定义，不是声明！ */

#endif
```

```bash
gcc -Wall -Wextra main.c globals.c -o app
```

```text
/usr/bin/ld: main.o:(.data+0x0): multiple definition of `g_verbose'; globals.o:(.data+0x0): first defined here
collect2: error: ld returned 1 exit status
```

分析：#include 是复制粘贴（[预处理器与宏](/c/290-PreprocessorMacro) 的机制）。头文件进了几个翻译单元，这段定义就存在几份，直接违反「一个名字，一份定义」。修复回到第 6 节：头文件留 extern 声明，定义与初始化搬进唯一一个 .c。

再补一刀：如果两处写的是未初始化的 `int g_verbose;` 呢？现行 GCC 默认 -fno-common（文档原话：未初始化全局变量放进 .bss），两份照样报 multiple definition；而在老版本 GCC 默认 -fcommon 的年代，这类「试探性定义」会被静默合并成一个——「以前能编译」的印象多来源于此。别赌历史行为：定义永远只写一份。

### 报错速查

| 报错 | 一线原因 | 首选动作 |
| --- | --- | --- |
| undefined reference to `x` | 有 U 没人接 | nm 查相关 .o：补 .o、查拼写、查原型一致性 |
| multiple definition of `x` | 一个名字几份定义 | 头文件里找定义；定义搬进 .c；辅助函数加 static |
| unknown type name 'X' | 类型没定义就被使用（循环依赖典型） | 前向声明 + 指针（第 5 节） |
| cannot find -lfoo | 找不到库文件 | 查 -L 路径与库名，见 [动态库与静态库](/c/320-DynamicStaticLibrary) |

## 实际项目中的使用场景

- 拆模块的默认动作：每个功能一对 .h/.c，.h 里只留 API 与类型，文件内辅助函数 static——第 2 到 4 节就是这套动作的分解教学；
- 头文件即合同：库作者维护 .h，使用者只看着 .h 编译、拿库文件链接。合同如何变成 .a 与 .so，在 [动态库与静态库](/c/320-DynamicStaticLibrary)；
- 反向操作也真实存在：SQLite 把全部源码合并成单个 sqlite3.c 发布（4.1 节提过），省去使用者管理多文件的麻烦——两种极端都站在「翻译单元」这个模型上；
- 跨语言边界的头：`#ifdef __cplusplus` 加 extern "C" 的包裹是 C 库头文件给 C++ 使用者留的门（第 8 节现场 3）。

## 小练习

预测题（5 分钟）：一个头文件里直接写下了函数定义：

```c
/* helper.h */
int twice(int x) { return 2 * x; }
```

目前全工程只有 main.c 包含它，编译、链接、运行全部正常。这段代码要不要修？为什么？

参考答案（先写再看）：要修。此刻能过只是因为包含者只有一个——第二个人 include 它的瞬间就是 multiple definition。「现在能编译」从来不等于「写对了」：头文件会被复制进未知的未来翻译单元。修法：头文件留 `int twice(int x);`，定义搬进某个 .c；或按 [内联函数与宏](/c/300-InlineFunctionMacro) 的 static inline 规则处理。

挑战题（30 分钟，不看答案先动手）：给 utils 模块加「调用统计」：sum_to 每被调用一次计数加一，提供 `int utils_calls(void);` 给 main.c 查询。约束：计数器绝不能被 main.c 直接改写。

提示（思路方向）：计数器是 utils.c 的私产——用内部链接藏起来；对外只暴露一个只读函数。

展开（关键写法）：utils.c 顶部 `static int s_calls;`（static：出不了本文件）；sum_to 里 `s_calls++;`；utils.c 里 `int utils_calls(void) { return s_calls; }`；utils.h 里加 `int utils_calls(void);`。main.c 只 include utils.h。

验收清单：gcc -Wall -Wextra 全程零警告；nm utils.o 里 s_calls 以小写 b 出现（bss 段、文件私有），绝无大写同名字符；app 打印的调用次数与实际一致；在 main.c 里写 `s_calls = 0;` 编译报错（变量压根不可见）。

## 与之前和之后的知识的关系

- 往前：[作用域、存储期与链接性](/c/055-ScopeStorageLinkage) 的三种链接性在本篇符号表上现出原形（大写对外、小写对内、U 等人接）；[函数：声明、传值与递归](/c/090-FunctionDetailed) 的声明与定义，在多文件里落实为「头文件 / .c」的分工；
- 旁支：预处理与宏展开机制在 [预处理器与宏](/c/290-PreprocessorMacro)；头文件里写 inline 的正确姿势在 [内联函数与宏](/c/300-InlineFunctionMacro)；.text/.data/.bss 运行时的模样在 [内存深水区](/c/210-ProcessMemoryLayoutAndErrors)；
- 往后：链接器的下一个主角是库——静态库动态库的创建与使用在 [动态库与静态库](/c/320-DynamicStaticLibrary)；本篇手敲的每条命令在 [构建系统](/c/470-BuildSystem) 被自动化。

## 官方文档

- 翻译阶段与翻译单元（cppreference C）：https://zh.cppreference.com/w/c/language/translation_phases
- C 的 inline 函数说明符（cppreference C）：https://zh.cppreference.com/w/c/language/inline
- GCC 头文件搜索路径：https://gcc.gnu.org/onlinedocs/cpp/Search-Path.html
- GCC 总体选项（-c 的定义）：https://gcc.gnu.org/onlinedocs/gcc/Overall-Options.html
- GCC 对 #pragma once 的口径（过时的只含一次头）：https://gcc.gnu.org/onlinedocs/cpp/Obsolete-once-only-headers.html
- nm 与符号类型字母（GNU Binutils）：https://sourceware.org/binutils/docs/binutils/nm.html
- -fcommon / -fno-common 的现行默认（GCC）：https://gcc.gnu.org/onlinedocs/gcc/Code-Gen-Options.html

## 自我检查

- 能说出翻译单元的组成，并解释为什么两个 .c 各自定义同名的 static 函数互不冲突；
- 能不看资料写出「.h 只放声明/类型/宏、.c 放定义、守卫齐全」的模块三件套；
- 拿到一条 undefined reference，会先 nm 相关 .o 再动手改代码，并能说出至少三种成因；
- 能解释头文件里写定义为什么会 multiple definition，以及 extern 变量的初始化为什么只写在定义文件。

## 本章总结

- 编译按翻译单元进行：一个 .c 加上递归包含的头，独立翻译成 .o，编译器不知道其他 .c 的存在；
- 声明给人看（编译器做类型检查），定义给链接器（符号的唯一住址）；一条命令与分开 -c 再链接等价，分开是增量构建的地基；
- 头文件是模块说明书：声明、类型、宏；守卫防的是同一翻译单元重复包含，防不了循环引用——前向声明加指针才是解药；
- 链接器按符号表配对：U 找 T/D；static 让符号留在文件内，是 C 的封装旋钮；
- 两大报错都是符号表对不上账：undefined reference 是有 U 没人接，multiple definition 是一个名字几份定义。先 nm，再改代码。

## 下一步

进入 [动态库与静态库](/c/320-DynamicStaticLibrary)：本篇的符号配对发生在一条链接命令里；下一篇把被链接的对象换成库——.a 和 .so 怎么造、链接器怎么找它们、静态与动态各自的代价。
