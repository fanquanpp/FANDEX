---
order: 310
title: 预处理器与宏：编译前的文本手术
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 用 gcc -E 把 main.c 的预处理产物摊开，一图看穿「宏只是文本替换」：编译四阶段心智模型、#include 搜索路径 gcc -v 实验、头文件守卫三写法；函数式宏的 SQUARE(i++) 事故实录与括号纪律、# 与 ## 两级宏与能跑的 X-Macro 全貌、__VA_ARGS__ 与 C23 __VA_OPT__；条件编译三大用途与 #error/#warning、C23 __has_include；do { } while(0) 惯用法与五条宏军规。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'c/300-InlineFunctionMacro'
  - 'c/310-MultiFileCompilation'
  - 'c/520-C23C2y'
  - 'c/530-C23NewFeatures'
  - 'c/110-EnumTypedef'
  - 'c/410-CrossPlatformProgramming'
prerequisites:
  - 'c/060-OperatorExpression'
  - 'c/090-FunctionDetailed'
---

## 前置知识

- 已完成 [运算符与表达式](/c/060-OperatorExpression)：知道优先级怎么定胜负、什么叫未定义行为——本文 `SQUARE(i++)` 的事故判定直接引用它；
- 已完成 [函数](/c/090-FunctionDetailed)：会写函数声明与调用——函数式宏长得像函数，本文反复拿它当反例对照。

零基础起步见 [C 语言零基础起步](/c/010-CZeroBasisStart)。记不全的部分不影响往下读，用到就当场解释。

> 分工说明：C 模块里与「宏」沾边的内容拆在四篇。本篇讲预处理器与宏本体：指令、展开规则、条件编译、军规与事故。「什么时候用宏、什么时候用 inline 函数」的工程决策在 [内联函数与宏](/c/300-InlineFunctionMacro)；`_Generic` 类型分派在 [泛型选择](/c/280-GenericSelection)；头文件怎么组织、翻译单元与链接在 [多文件编译](/c/310-MultiFileCompilation)；`#pragma pack` 与对齐在 [内存对齐](/c/220-MemoryAlignmentDeepDive)。本篇与它们互为地基，不重复对方的示例。

## 学习目标

读完本文你将能够：

1. 用 `gcc -E` 看任意程序的预处理产物，指出宏在哪一行消失、展开成了什么；
2. 画出编译流水线中预处理器管的那一段，说清 `#include <...>` 与 `"...\"` 的搜索路径差异和头文件守卫的三种写法；
3. 解释「宏参数不求值，只替换文本」，识别并修复 `SQUARE(i++)` 与缺括号两类经典事故；
4. 用 `#` 与 `##` 写字符串化和 X-Macro 代码生成，用 `__VA_ARGS__`（或 C23 的 `__VA_OPT__`）写日志宏；
5. 用条件编译实现平台探测与调试开关，并遵守 `do { } while (0)` 等五条宏军规。

预计 60 到 80 分钟，含 5 组动手实验、2 道预测题与 1 道挑战题。

## 1. 问题引入：gcc -E 把 printf 前的世界摊开

先看一份普通得不能再普通的源码：

```c
/* greet.c */
#include <stdio.h>

#define GREETING "Hello, preprocessor"
#define SQUARE(x) ((x) * (x))

int main(void) {
    printf("%s\n", GREETING);
    printf("5^2 = %d\n", SQUARE(5));
    return 0;
}
```

问题：编译器看到这份文件了吗？答案出乎多数初学者意料——**没有**。`gcc` 在真正编译之前先跑了一道独立工序：预处理器（preprocessor）。想亲眼看到它的产物，加 `-E`：只做预处理，不做编译。

```bash
gcc -E greet.c | grep -n printf
```

输出（`-E` 的完整产物有几千行——stdio.h 的内容被整个抄了进来，用 grep 挑出我们关心的行）：

```text
1477:    printf("%s\n", "Hello, preprocessor");
1478:    printf("5^2 = %d\n", ((5) * (5)));
```

两个宏都消失了：`GREETING` 变成了字符串字面量，`SQUARE(5)` 变成了 `((5) * (5))`。这一眼看出本文最重要的事实：**预处理就是文本替换**。它不理解 C 语法、不知道类型、不检查你写的是什么——它只管照着 `#define` 建的对照表改写文本，改完把一份「纯 C」交给编译器。这个特性既是宏全部能力的来源（条件编译、代码生成），也是全部事故的来源（参数不求值、括号陷阱）。接下来先建立流水线地图，再逐一拆招。

## 2. 预处理心智模型：编译流水线的第一站

C 标准把「源码到可执行文件」分成 8 个翻译阶段（translation phases），日常心智模型可以浓缩为四步，预处理器管前一步：

```text
.c 源文件
  ↓ 字符与行：\ 加换行的续行对被拼掉，多行并成一行（三字符组在 C23 已从标准删除）
  ↓ 记号化：注释整体替换为一个空格，文本切成预处理记号（token）
  ↓ 执行指令：#include 复制粘贴、#define 登记对照表、#if 剪枝、宏展开
  ↓ 产物：一份"纯 C"翻译单元（gcc -E 能看到的 .i 文件）
  ↓ 之后才轮到：编译 → 汇编 → 链接（见 210/310 两篇）
```

三件事从这里立刻变清楚：

- **注释死在预处理手里**。宏定义里写注释是安全的（替换成空格），但也意味着注释不进宏体参与展开；
- **续行符 `\` 是预处理级的**。它让多行宏定义在处理器眼里仍是「一行」，这是第 8 节多语句宏的前提；
- **宏替换发生在一切语法分析之前**。编译器从没见过你的宏名——所以第 4 节那些「展开后语义全变」的事故，编译器也未必能救你。

### 2.1 #include：复制粘贴，以及两种括号的搜索路径

`#include` 的行为朴素到粗暴：把目标文件的**全部内容原样粘贴**到这一行。所谓「包含头文件」，实为「抄进来」。粘贴去哪找文件？两种写法路径不同：

```c
#include <stdio.h>      /* 尖括号：只在系统目录里找 */
#include "utils.h"      /* 双引号：先找当前文件所在目录，找不到再走尖括号的路径 */
```

空口无凭，让 gcc 自己招供。`-v` 会把搜索路径打到标准错误流：

```bash
gcc -v -E greet.c 2>&1 | tail -n 12
```

一次典型输出（Linux + GCC 13，Windows/MinGW 的列表不同但结构一致）：

```text
#include "..." search starts here:
#include <...> search starts here:
 /usr/lib/gcc/x86_64-linux-gnu/13/include
 /usr/local/include
 /usr/include/x86_64-linux-gnu
 /usr/include
End of search list.
```

读出三条规则：

1. 尖括号**只**从这个列表找（系统目录 + `-I` 添加的目录）；
2. 双引号**先**查「当前文件所在目录」——这一站是隐式的，不在列表里——然后才进同一个列表；
3. 列表可以用 `-I./include` 往前插，`-iquote` 则只影响双引号形式。

修改实验一：新建 `inc/my.h`，把 `gcc -v -E greet.c` 换成 `gcc -v -E -Iinc greet.c 2>&1 | tail -n 12`，看 `inc` 出现在列表最前面。工程惯例随之而来：系统与第三方库头文件用尖括号，自己项目的头文件用双引号——技术上反过来写也能编译，但惯例让人一眼分清「谁的是谁的」。

### 2.2 头文件守卫：三写法与可移植性

「复制粘贴」立刻引出一个问题：同一个头文件被包含两次，它的内容就被抄两遍——类型重复定义，编译失败。守卫（include guard）就是给粘贴加一道闸。第一种，传统宏守卫：

```c
/* mylib.h */
#ifndef MYLIB_H            /* 第一次：没定义过 → 往下执行 */
#define MYLIB_H            /* 定义标记并抄入内容 */

/* ... 头文件内容 ... */

#endif /* MYLIB_H */       /* 第二次：标记已存在 → #ifndef 与 #endif 之间全部跳过 */
```

第二种，`#pragma once`：

```c
/* mylib.h */
#pragma once

/* ... 头文件内容 ... */
```

编译器保证同一物理文件只被抄一次。GCC、Clang、MSVC 三大主流都支持，写法简洁、不用起宏名；代价是它不在 C 标准里（极特殊的文件系统布局下个别实现判断有出入）。第三种是折中：两个都写，`#pragma once` 在前、宏守卫兜底——跨平台库图双保险。Linux 内核编码规范则强制只用传统宏守卫。

宏守卫的命名要独一无二，惯例是 `项目_路径_文件名_H`（如 `FANDEX_NET_UTILS_H`）。太通用的 `UTILS_H` 迟早撞车，下划线开头的 `_XXX_H` 按标准保留给实现，别用。头文件里还该放什么、`extern "C"` 兼容层怎么写、自包含原则与前向声明怎么省编译时间，属于多文件工程的日常，在 [多文件编译](/c/310-MultiFileCompilation) 展开。

## 3. 无参宏：常量、链式与预定义宏

### 3.1 对象式宏与它的作用域

不带参数的宏叫对象式宏（object-like macro），最常见用途是常量：

```c
/* const_macro.c */
#include <stdio.h>

#define MAX_QUEUE 1024

int queue[MAX_QUEUE];

int main(void) {
    printf("capacity = %d\n", MAX_QUEUE);
    return 0;
}
```

三条纪律来自「文本替换」这个本质：

- **末尾不写分号**。分号会进入替换文本，`#define N 10;` 会让 `int a[N];` 展开成 `int a[10;];`；
- **名字全大写**。宏是全局生效、无作用域概念的，大写是一眼识别「这是替换」的唯一视觉线索；
- **作用域是文本意义上的**：从 `#define` 那一行起，到 `#undef` 或文件尾为止——注意是文件里位置靠后的文本，与函数、花括号无关。写在前面的代码用不到它。

`MAX_QUEUE` 与 `const int`、枚举常量的取舍口诀：需要类型检查和调试器可见选 `const`，需要Case 标签和连续常量选 `enum`（见 [变量与常量](/c/050-VariableConstant) 与 [枚举与 typedef](/c/110-EnumTypedef)）；「宏 vs 内联函数」这类工程决策的完整对照在 [内联函数与宏](/c/300-InlineFunctionMacro)，本篇不展开。

### 3.2 链式展开与递归禁止

宏体里可以引用别的宏，展开会像多米诺一样传递：

```c
#define ROWS    8
#define COLS    8
#define CELLS   (ROWS * COLS)     /* 用到时才展开成 (8 * 8) */
```

但传递有一条铁律：**宏不会展开自己**。经典的互相引用最终停在第 2 轮：

```c
#define A B
#define B A
A        /* A → B → A：A 已在本轮出现过，不再展开，结果就是记号 A */
```

这个规则俗称「蓝漆」（blue paint）规则：展开过程中再次遇到的同名宏被刷蓝、视作普通标识符。它保证预处理器永不死循环，也解释了为什么「两个宏互相定义」得不到任何值，只会留下原样的记号——等编译器接手时报「A 未声明」。

### 3.3 预定义宏：让代码自报家门

编译器开箱就塞好了几个宏，最实用的是位置三件套：

| 宏 | 内容 | 备注 |
| --- | --- | --- |
| `__FILE__` | 当前文件名字符串 | |
| `__LINE__` | 当前行号（整数） | |
| `__func__` | 当前函数名字符串 | C99 起的预定义**标识符**，严格说不是宏 |
| `__DATE__` / `__TIME__` | 编译日期/时间字符串 | 每次编译都会变 |
| `__STDC_VERSION__` | C 标准版本的 long 常量 | C99 是 199901L，C17 是 201710L，C23 是 202311L |
| `__STDC_HOSTED__` | 1 宿主环境 / 0 独立环境 | 嵌入式裸机常为 0 |

位置三件套组合起来就是一行现成的调试探针：

```c
/* here.c */
#include <stdio.h>

#define HERE() fprintf(stderr, "[here] %s:%d in %s\n", __FILE__, __LINE__, __func__)

void step_two(void) {
    HERE();
}

int main(void) {
    HERE();
    step_two();
    return 0;
}
```

```bash
gcc -Wall -Wextra -g here.c -o here
./here
```

预期输出：

```text
[here] here.c:13 in main
[here] here.c:9 in step_two
```

行号是**展开点**的行号——探针放在哪一行，就报哪一行。程序崩在哪个函数进来的、走到哪一步，加几个 `HERE()` 立刻现形。标准库的 `assert` 宏打印「断言失败于某文件某行」，用的正是同一套机关。修改实验二：把 `HERE()` 再抄进第三个函数，重跑，核对三处行号是否都正确——宏体只写了一遍，`__LINE__` 却每次都对，想通为什么，就理解了「展开」二字。

## 4. 函数式宏：参数替换是纯文本

### 4.1 机制：不求值，只替换

带参数的宏形如函数，本质却是「先把参数文本抄进宏体，再整体替换」：

```c
#define SQUARE(x) ((x) * (x))
SQUARE(5)        /* 展开为 ((5) * (5)) */
```

关键在于：`x` 不是一个被传入的值，而是一段**被抄写的文本**。预处理器不执行 `5`、不求它的值、甚至不知道它是 int——这与函数有本质区别（函数参数先求值再传拷贝）。抄写式的第一个后果就是著名的 `i++` 事故。

### 4.2 事故实录一：SQUARE(i++) 为什么是未定义行为

```c
/* crash_sq.c */
#include <stdio.h>

#define SQUARE(x) ((x) * (x))

int main(void) {
    int i = 3;
    int r = SQUARE(i++);
    printf("r = %d, i = %d\n", r, i);
    return 0;
}
```

宏展开后，第 7 行实际是：

```c
    int r = ((i++) * (i++));
```

同一个表达式里 `i` 被自增了两次，两次自增之间没有序列点隔开——按 [运算符与表达式](/c/060-OperatorExpression) 的判定，这是未定义行为：r 可能是 12（3 乘 4）、可能是 20（4 乘 5），编译器爱怎么算怎么算。别靠猜，让工具说话：

```bash
gcc -Wall -Wextra -g crash_sq.c -o crash_sq
```

预期输出（-Wall 自带的 -Wsequence-point 直接点名）：

```text
crash_sq.c: In function 'main':
crash_sq.c:7:21: warning: operation on 'i' may be undefined [-Wsequence-point]
```

修复不是「换种写法的宏」，而是承认这个需求不该用宏：换成函数（含 `static inline`，语义对比见 [内联函数与宏](/c/300-InlineFunctionMacro)），参数 `i++` 只求值一次：

```c
static inline int square(int x) { return x * x; }
/* square(i++) 合法：i 只自增一次，r = 9，i = 4 */
```

军规由此而来：**绝不把带副作用的表达式（i++、f(x)、赋值）喂给函数式宏**。

### 4.3 括号纪律：两处都必须有

抄写式的第二个后果是优先级陷阱。看一组反例的正面对照：

```c
#define SQUARE_BAD(x)  x * x
SQUARE_BAD(3 + 1)      /* 展开为 3 + 1 * 3 + 1 = 7，不是 16！ */

#define DOUBLE_BAD(x)  x + x
DOUBLE_BAD(5) * 3      /* 展开为 5 + 5 * 3 = 20，不是 30！ */

#define SQUARE_OK(x)   ((x) * (x))
SQUARE_OK(3 + 1)       /* 展开为 ((3 + 1) * (3 + 1)) = 16 */
#define DOUBLE_OK(x)   ((x) + (x))
DOUBLE_OK(5) * 3       /* 展开为 ((5) + (5)) * 3 = 30 */
```

规则两句：**宏体整体用一层括号包住**（防它和外部运算符结合），**每个参数出现处各包一层**（防参数本身是表达式）。这类错最阴险的地方是**静默**：语法完全合法、编译器零警告，只是结果悄悄不对——第 9 节的实录一给出完整的现场。

### 4.4 # 与 ##：字符串化和记号拼接

两个只属于预处理器的运算符，函数无论如何做不到。

`#` 把参数**原文**变成字符串字面量：

```c
#define STR(x)   #x
#define XSTR(x)  STR(x)

STR(hello)        /* "hello" */
STR(3 + 1)        /* "3 + 1"：抄的是写法，不是算出来的值 */
```

`##` 把两个记号（token）粘成一个新记号：

```c
#define CAT(a, b)   a##b
CAT(var, 1)       /* var1：真的造出了一个新标识符 */
```

`##` 若粘出非法记号（比如把 `x` 和 `+` 粘成 `x+`），是约束违反，编译器报错——实录见第 9 节。参数名拼接让「按清单造名字」成为可能，第 4.6 节的 X-Macro 全靠它。

两级宏技巧是 `#`/`##` 的必备搭档。`#` 和 `##` 优先于参数展开：参数还没来得及变成值，就被先抄成字符串、先粘起来了。想让参数**先展开再**操作，就垫一层间接宏：

```c
#define VERSION_MAJOR 1
#define VERSION_MINOR 9

STR(VERSION_MAJOR)     /* "VERSION_MAJOR"：# 在展开前动手，抄到的是名字 */
XSTR(VERSION_MAJOR)    /* "1"：垫一层，参数先展开成 1，再被字符串化 */

#define APP_VERSION XSTR(VERSION_MAJOR) "." XSTR(VERSION_MINOR)
/* APP_VERSION 展开后是 "1" "." "9"，相邻字符串字面量编译期自动拼成 "1.9" */
```

这个「直接一层取名字、垫上一层取值」的非对称，是阅读内核与库源码时最常见的暗号。

### 4.5 顺手军规：ARRAY_SIZE 与指针退化

工程里出镜率最高的函数式宏之一：

```c
#define ARRAY_SIZE(arr) (sizeof(arr) / sizeof((arr)[0]))

int data[] = {10, 20, 30, 40};
for (size_t i = 0; i < ARRAY_SIZE(data); i++)   /* 4，正确 */
    printf("%d\n", data[i]);
```

修改实验三：把 `data` 传进函数再算一次——

```c
void probe(int arr[]) {          /* 数组形参在这里退化成 int* */
    printf("in function: %zu\n", ARRAY_SIZE(arr));   /* 64 位上打印 2：8/4 */
}
```

指针 8 字节除以 int 4 字节得 2。`sizeof` 只对「真正的数组」有效，数组一旦作为参数进门就退化成指针（[数组详解](/c/120-ArrayDetailed) 的老结论在这里埋了雷）。这个宏只该对着**本作用域里看得见的数组定义**用；想被编译器当场抓住误用，需要 GCC 的类型兼容检查扩展，思路见内核源码 `include/linux/array_size.h`。

### 4.6 X-Macro：一份清单生成全部代码

现在把 `##` 与两级宏组合成 C 工程最著名的代码生成模式。需求：一组颜色，要枚举、名字表、十六进制值表、打印函数——数据一模一样，写四遍迟早改漏。X-Macro 的答案是只写一遍清单：

```c
/* xmacro.c：gcc -Wall -Wextra -g xmacro.c -o xmacro */
#include <stdio.h>

/* 唯一的数据源：新增颜色只改这里 */
#define COLOR_LIST(X)  \
        X(RED,   "0xFF0000")  \
        X(GREEN, "0x00FF00")  \
        X(BLUE,  "0x0000FF")  \
        X(WHITE, "0xFFFFFF")

/* 四种消费姿势：同一个清单，各取所需 */
#define AS_ENUM(name, hex)  COLOR_##name,
#define AS_NAME(name, hex)  #name,
#define AS_CASE(name, hex)  case COLOR_##name: return hex;

enum color {
    COLOR_LIST(AS_ENUM)          /* 生成 RED, GREEN, BLUE, WHITE, */
    COLOR_COUNT                  /* 哨兵：顺手得到颜色个数 */
};

const char *color_names[] = {
    COLOR_LIST(AS_NAME)          /* 生成 "RED", "GREEN", ... */
};

const char *color_hex(enum color c) {
    switch (c) {
        COLOR_LIST(AS_CASE)      /* 生成四个 case 分支 */
        default: return "unknown";
    }
}

#undef AS_ENUM
#undef AS_NAME
#undef AS_CASE

int main(void) {
    for (int i = 0; i < COLOR_COUNT; i++) {
        printf("%-5s %s\n", color_names[i], color_hex((enum color)i));
    }
    printf("count = %d\n", COLOR_COUNT);
    return 0;
}
```

预期输出：

```text
RED   0xFF0000
GREEN 0x00FF00
BLUE  0x0000FF
WHITE 0xFFFFFF
count = 4
```

读法三步：`COLOR_LIST(X)` 是清单，`X` 是占位的姿势参数；四种 `AS_*` 宏是姿势；每次 `COLOR_LIST(姿势)` 就按姿势重放一遍清单。`COLOR_##name` 用 `##` 造出 `COLOR_RED` 等枚举名，`#name` 造出字符串。修改实验四：在 `COLOR_LIST` 里加一行 `X(YELLOW, "0xFFFF00")`，只改这一处，重新编译——枚举、名字表、打印函数、个数全部自动跟上，这就是「单一数据源」的威力。错误码表、状态机状态、配置项都是同一模式的经典主场，[枚举与 typedef](/c/110-EnumTypedef) 的错误码设计正是这套骨架的实战版；另一种变体是「同一份 .h 定义不同的 X 宏、#include 两三次」，X-Macro 的名字即来源于此，单文件版可维护性更好，推荐优先。

进阶一瞥：宏没有函数重载，但可用「参数计数 + `##` 拼接」模拟——`#define print(...) CAT(print, NARG(__VA_ARGS__))(__VA_ARGS__)`，`NARG` 借助可变参数的粘合技巧数出参数个数，把 `print(1)` 与 `print(1, 2)` 分发给 `print1`、`print2`。能看懂它需要第 5 节的全部知识，工程中更建议直接用 `_Generic`（见 [泛型选择](/c/280-GenericSelection)）。

## 5. 可变参数宏：LOG(fmt, ...) 怎么写

调试日志是可变参数宏的天下。C99 起 `__VA_ARGS__` 代表省略号吃下的全部参数：

```c
/* vlog.c：gcc -Wall -Wextra -g vlog.c -o vlog */
#include <stdio.h>

#define LOG(fmt, ...) \
    fprintf(stderr, "[LOG] %s:%d " fmt "\n", __FILE__, __LINE__, __VA_ARGS__)

int main(void) {
    int retries = 3;
    LOG("connect failed, retries = %d", retries);
    return 0;
}
```

预期输出（stderr，故带文件行号前缀）：

```text
[LOG] vlog.c:10 connect failed, retries = 3
```

注意 `"%s:%d " fmt "\n"` 的写法：三个相邻字符串字面量在编译期自动拼接成一个，`fmt` 作为参数传入的格式串被无缝嵌进中间——这正是相邻字符串拼接规则最实用的应用场景。运行时一侧（`vprintf`、默认参数提升）见 [可变参数函数](/c/100-VarargsFunction)。

### 5.1 空参数难题：尾逗号

`LOG("started")` 一个可变参数都不传会怎样？展开成：

```c
fprintf(stderr, "[LOG] %s:%d " "started" "\n", __FILE__, __LINE__, );
```

尾逗号后空无一物，编译器报 `error: expected expression before ')' token`。三种解法按年代排列：

1. **GNU 扩展 `##__VA_ARGS__`**：`..., ##__VA_ARGS__` 写法下，可变参数为空时 GCC/Clang 连同前面的逗号一起剔除。好用，但它是扩展——MSVC 传统预处理器不认；
2. **要求至少一个参数**：把接口改成 `LOG(tag, fmt, ...)`，调用者被迫总传点什么。丑，但全平台合法；
3. **C23 的 `__VA_OPT__`（标准答案）**：C++20 已将其转正，C23 跟进标准化。`__VA_OPT__(x)` 在可变参数**非空**时展开为 `x`，**为空**时展开为空：

```c
#define LOG(fmt, ...) \
    fprintf(stderr, "[LOG] %s:%d " fmt "\n", __FILE__, __LINE__ __VA_OPT__(,) __VA_ARGS__)

LOG("started");                 /* 尾部干净：...__LINE__) */
LOG("value = %d", 42);          /* 逗号回来了：...__LINE__, 42) */
```

新代码直接用 `__VA_OPT__` 并以 `-std=c23` 编译；维护老代码时在 GCC/Clang 上可用 `##__VA_ARGS__` 过渡。C23 的其余新特性清单与编译器支持矩阵见 [C23 上手](/c/520-C23C2y) 与 [C23 深水区](/c/530-C23NewFeatures)。修改实验五：给 `LOG` 加上级别参数，再包一层 `LOG_ERROR(fmt, ...)` 固定级别，验证两条路（`__VA_OPT__` 与 GNU 扩展）在零参数调用下都编译通过。

## 6. 条件编译：编译期的 if

条件编译让「哪些代码进入最终产物」在**编译前**定死。基本骨架：

```c
#if defined(DEBUG) && defined(VERBOSE)   /* defined() 可组合 */
    /* 只有 DEBUG 与 VERBOSE 同时定义时，这段才存在 */
#elif defined(DEBUG)
    /* 仅 DEBUG */
#else
    /* 都没有 */
#endif

#ifdef DEBUG            /* 只判断「定义过没有」，不能组合 */
#define LOG_MSG(m) puts(m)
#else
#define LOG_MSG(m) ((void)0)
#endif

#ifndef BUFFER_SIZE     /* 惯用法：允许外部 -D 覆盖的默认值 */
#define BUFFER_SIZE 1024
#endif
```

C23 又加了两个对称的简写：`#elifdef MACRO` 等价 `#elif defined(MACRO)`，`#elifndef` 等价 `#elif !defined(MACRO)`，平台分支链可以少敲很多字。

### 6.1 #if 的算术规则：只认整型常量表达式

`#if` 后面必须是**整型常量表达式**，且有专属规则：

- 表达式里的标识符若不是宏，一律按 `0` 处理；
- 没有类型概念：不能用 `sizeof`，不能用强制转换，不能调函数；算术按能容纳的最大整型进行；
- `defined(MACRO)` 在宏展开前先求值，得 0 或 1。

「未定义标识符按 0」是静默错误的高发点：

```c
#define VERSION abc            /* 有人手滑写成了字符串或名字 */

#if VERSION >= 3               /* abc 不是宏 → 按 0 → 0 >= 3 为假 */
    /* 这段代码被无声跳过，没有任何诊断 */
#endif
```

`gcc -Wundef` 会对「`#if` 里出现未定义标识符」报警，把这类事故提前到编译期。还有一个 `#ifdef` 特有的坑：`#ifdef` 只看「定义过没有」，**不看值**——`#define USE_FAST 0` 之后 `#ifdef USE_FAST` 依然为真（实录二见第 9 节）。判断值请用 `#if`。

### 6.2 三大用途

平台探测是条件编译存在的第一理由——不同系统的头文件与函数根本不同，运行时 if 救不了编译期的不存在：

```c
#if defined(_WIN32)
    #define PLATFORM_NAME "Windows"
    #include <windows.h>
    #define SLEEP_MS(ms) Sleep(ms)
#elif defined(__linux__)
    #define PLATFORM_NAME "Linux"
    #include <unistd.h>
    #define SLEEP_MS(ms) usleep((ms) * 1000)
#elif defined(__APPLE__)
    #define PLATFORM_NAME "macOS"
    #include <unistd.h>
    #define SLEEP_MS(ms) usleep((ms) * 1000)
#else
    #error "unsupported platform"        /* 探不出来的平台当场失败，别静默继续 */
#endif
```

更长的架构检测（x86/ARM/RISC-V 等）、字节序判断与 DLL 导出宏属于跨平台工程的成套装备，见 [跨平台编程](/c/410-CrossPlatformProgramming)；编译器专属属性宏（`__GNUC__` 系、`_MSC_VER` 系）的详细对照在 [编译器扩展与属性](/c/540-AttributeCompilerExtension)。

调试开关是第二用途——发布版把调试代码整段剪掉，零体积零开销：

```c
#ifdef NDEBUG                    /* 发布构建 gcc -DNDEBUG 时断言变空操作 */
#define ASSERT(cond) ((void)0)
#else
#define ASSERT(cond) \
    do { \
        if (!(cond)) { \
            fprintf(stderr, "assert %s failed at %s:%d\n", #cond, __FILE__, __LINE__); \
            abort(); \
        } \
    } while (0)
#endif
```

这几十行就是标准 `assert.h` 的精神内核：`#cond` 把表达式原样打进错误信息（第 4.4 节的 `#`），`__FILE__`/`__LINE__` 自报位置（第 3.3 节），`do { } while (0)` 保证当语句用不出事（第 8 节）。头文件守卫是第三用途，第 2.2 节已完整演示。

### 6.3 #error、#warning 与 C23 的探测指令

`#error` 让编译**当场失败**并把消息打出来，用于「配置不满足就该停」：

```c
#if !defined(__STDC_VERSION__) || __STDC_VERSION__ < 201112L
#error "this project requires C11 or later"
#endif
```

C23 把 `#warning` 转正（此前 GCC/Clang/MSVC 早已作为扩展支持）：报警告但继续编译，适合「能用但不合规」的场景，如提示必填宏缺失、即将移除的旧接口。C23 还标准化了两个探测运算符，让条件编译从「猜」变成「问」：

```c
#if __has_include(<stdatomic.h>)     /* 头文件存在吗？ */
    #include <stdatomic.h>
    #define HAS_ATOMIC 1
#else
    #define HAS_ATOMIC 0
#endif

#if __has_c_attribute(nodiscard)     /* 支持这个属性吗？ */
    #define WARN_UNUSED [[nodiscard]]
#else
    #define WARN_UNUSED
#endif
```

探测失败再降级到旧实现，是配置系统（Autoconf/CMake 之外）最轻量的替代品。`#embed`（把二进制文件直接嵌进数组）也是 C23 预处理指令，完整展开见 [C23 深水区](/c/530-C23NewFeatures)。与 `#error` 同属「编译期就拦住」思想的还有语言级的 `_Static_assert`（C11，C23 简写 `static_assert`）：表达式在编译期求值、为假即报错，能用在函数体内、能用 `sizeof`——`#if` 做不到的它都行，条件里没有预处理宏时优先用它。

## 7. 预处理控制：#undef、#line 与 #pragma

**`#undef`** 注销一个宏，三个经典用途：挡住第三方头文件的宏污染（先 `#include` 再 `#undef MAX`，把名字还给函数版）；X-Macro 里用完即弃、保持卫生（第 4.6 节的 `#undef AS_*`）；同一名先注销再重定义（直接重定义是约束违反，编译器会报「宏重定义」）。

**`#line`** 改写编译器记账的行号与文件名，一句带过：代码生成器用它把报错位置映射回用户的原始文件，日常编码用不到。

**`#pragma`** 是留给各编译器自定义指令的逃生舱。C99 补了运算符形式 `_Pragma("指令")`，让 pragma 能写进宏体（`#` 开头的指令本身不能出现在宏展开结果里，`_Pragma` 没这个限制）：

```c
#define DO_PRAGMA(x) _Pragma(#x)
DO_PRAGMA(GCC diagnostic push)            /* 等价 #pragma GCC diagnostic push */
```

日常用得到的 pragma 一览（平台专属细节各归其位）：

| 指令 | 作用 | 归属 |
| --- | --- | --- |
| `#pragma once` | 头文件守卫 | 本文第 2.2 节 |
| `#pragma pack(push, 1)` / `pack(pop)` | 结构体按 1 字节对齐 | [内存对齐](/c/220-MemoryAlignmentDeepDive) |
| `#pragma GCC diagnostic push / ignored "-Wxxx" / pop` | 局部压制或升级警告 | 本文下方示例 |
| `#pragma message("...")` | 编译期打印提示（常拼 `__FILE__`） | 本文下方示例 |
| `#pragma warning(disable: N)` 等 | MSVC 警告控制 | [跨平台编程](/c/410-CrossPlatformProgramming) |

警告控制的招牌用法——明知某行会触发警告、且有正当理由时，把压制范围压到最小：

```c
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-parameter"
void legacy_callback(int event, void *unused) {
    (void)event;
    /* 老接口约定的签名，参数就是用不上 */
}
#pragma GCC diagnostic pop
```

编译器专属属性（`__attribute__((packed))`、`deprecated`、`format` 等）与 pragma 是平行的两套机关，语义见 [编译器扩展与属性](/c/540-AttributeCompilerExtension)。

## 8. 宏的军规与调试

### 8.1 do { } while (0)：多语句宏的唯一正确形状

多语句宏最直觉的写法是花括号块，而它在 if/else 里是必炸的：

```c
/* bad_swap.c：gcc -Wall -Wextra -c bad_swap.c */
#define BAD_SWAP(a, b) { int tmp = (a); (a) = (b); (b) = (tmp); }

void check(int ok) {
    int x = 1, y = 2;
    if (ok)
        BAD_SWAP(x, y);      /* 展开为 { ... }; —— 花括号块后跟分号 */
    else                     /* 编译错误：这个 else 找不到自己的 if */
        x = y;
}
```

```text
bad_swap.c: In function 'check':
bad_swap.c:9:5: error: 'else' without a previous 'if'
```

展开后 `if (ok) { ... };` 的分号成了一条空语句，把 if 和 else 拆散了。把宏体换成 `do { ... } while (0)`，问题消失：

```c
#define SWAP(a, b) do { int tmp = (a); (a) = (b); (b) = (tmp); } while (0)

    if (ok)
        SWAP(x, y);          /* do-while 是一条完整语句，分号恰好被它吃掉 */
    else
        x = y;               /* 配对正常 */
```

为什么偏偏是 do-while 而不是别的：它**是一条语句**（能跟分号、能在无花括号的 if 分支里出现），又**只执行一次**（条件恒为 0），还能用 `break` 提前跳出——函数形状、单次执行，一个不少。Linux 内核编码风格明文要求多语句宏必须包成 do-while，理由正在此。顺带一条：宏定义末尾**别加多余分号**，`do {...} while (0);`（宏内自带分号）会让调用处变成双分号，同样拆散 if/else——分号永远由调用者提供。完整的事故家族与「宏 vs 函数」的取舍在 [内联函数与宏](/c/300-InlineFunctionMacro)。

### 8.2 五条军规清单

1. **宏名全大写**，参数与整体必加括号（第 4.3 节）；常量宏与函数式宏都适用——全大写是给读者「这是文本替换」的唯一警报；
2. **多语句宏用 do { } while (0)**，末尾不带分号（第 8.1 节）；
3. **别把副作用表达式喂给宏参数**（第 4.2 节）；这五条之外的另一半答案是「能用函数就别用宏」，见 [内联函数与宏](/c/300-InlineFunctionMacro)；
4. **长宏体用 `\` 续行**：反斜杠必须是行尾最后一个字符（后面跟个看不见的空格，续行就失效，注意编辑器是否显示行尾空白）；
5. **起名防撞车**：宏无作用域、全局生效，`MAX`、`DEBUG` 这类名字极易与第三方头文件冲突；项目宏统一加前缀，撞了用 `#undef` 自救。

设计一个新宏时过一遍：整体括号了吗、参数括号了吗、多语句用 do-while 了吗、宏体末尾多余分号了吗、参数会被求值几次、名字会撞车吗。五问全过再落笔。

### 8.3 排查法：回到 gcc -E

宏的 bug 有一把万能钥匙：**看展开**。第 1 节的 `-E` 同样是调试工具：

```bash
gcc -E suspect.c | grep -n "SUSPECT_NAME"   # 定位可疑宏展开成了什么
gcc -E suspect.c > suspect.i                # 或存成 .i，在编辑器里逐行看
```

展开产物里注释已变空格、宏已消失，你看到的正是编译器看到的——「为什么这里类型不匹配」「为什么少了个逗号」，对着 .i 文件一眼见底。`-g` 调试信息虽能把断点映射回源码行，宏内部的参数与逻辑在调试器里几乎不可观察，所以宏世界里 `-E` 就是单步调试。

## 9. 常见错误与调试实录

**实录一：缺括号事故——静默算错，零警告。** `#define HALF(x) x / 2` 后调用 `HALF(2 + 2)`，展开为 `2 + 2 / 2`，结果是 3 而非 2。`gcc -Wall -Wextra` 一个字都不说：语法完全合法。程序跑出「差一点点」的结果时，把可疑表达式丢给 `-E` 展开看一眼，两分钟破案。防御就是第 4.3 节的两处括号纪律。

**实录二：## 粘出非法记号。** `#define CAT(a, b) a##b` 后调用 `CAT(x, +)`——`x` 和 `+` 粘不成任何合法记号，GCC 当场报错：

```text
suspect.c:5:20: error: pasting "x" and "+" does not give a valid preprocessing token
```

这是 `##` 少数会被编译器当场抓住的用法（多数宏错误都静默）。反过来说，看到这条报错就说明你的两级宏里有一层垫错了：参数被提前粘合，先检查该用 `XCAT`（间接层）的地方是不是写成了 `CAT`。

**实录三：#include 循环与守卫失效。** 两个头文件互相包含，都忘了写守卫：

```c
/* a.h */              /* b.h */
#include "b.h"         #include "a.h"
```

```text
In file included from a.h:1,
                 from main.c:1:
a.h:1:10: error: #include nested depth 200 exceeds maximum of 200
```

`#include` 是无脑复制粘贴，没有守卫时 a 抄 b、b 抄 a、无限套娃，直到 GCC 的内嵌深度上限（200 层）才停。加上守卫后循环包含不再爆栈，但还有第二层坑：A 需要的类型定义在 B 里、B 又需要 A 的，守卫会让先到的那一方拿不到对方的类型，报 `unknown type name`——解法是提取公共类型到第三个头文件，或用前向声明，工程手法见 [多文件编译](/c/310-MultiFileCompilation)。

**实录四：#ifdef 看不见值——配错分支的静默错误。** 有人想关掉功能，写了 `#define USE_FAST_PATH 0`，但代码用的是 `#ifdef USE_FAST_PATH`。`#ifdef` 只查「定义过没有」，0 也算定义过——快速路径照常编译进去，程序行为与作者预期相反，**没有任何警告**。反向同款事故是拼写：`#ifdef DEGUB`（想写 DEBUG）永远为假，调试日志悄无声息地消失。防御两条：判断值的开关一律 `#if` + `-Wundef`；项目级开关宏集中定义在一个头文件（或构建系统 `-D`），散落的 `#ifdef` 越少，这类事故越少（构建配置见 [构建系统](/c/470-BuildSystem)）。

## 实际项目中的使用场景

- **读世界级 C 项目绕不开**：Linux 内核、glibc、SQLite 的源码里 `#ifdef` 与宏俯拾皆是——内核用一套架构宏在数十种 CPU 上编译同一份代码，container_of 宏用 `offsetof` 从成员指针反推容器结构体指针（`((type *)((char *)(ptr) - offsetof(type, member)))`，机制地基是 [内存对齐](/c/220-MemoryAlignmentDeepDive) 的偏移量）；
- **日志与断言系统**：`__FILE__`/`__LINE__`/`__func__` 拼出的日志宏（第 5 节）与 assert 骨架（第 6.2 节）是所有 C 项目调试设施的标配起点；格式化转发到 `vfprintf` 的进阶写法见 [可变参数函数](/c/100-VarargsFunction)；
- **嵌入式位操作**：`BIT_SET(reg, n)` 一族寄存器位操作宏是裸机驱动的日常，公式推导见 [位运算与位域](/c/070-BitwiseBitField)；
- **构建配置入口**：`-DLOG_LEVEL=2`、`-DNDEBUG` 这类编译命令行宏是 Makefile/CMake 与代码之间的标准接口，配套见 [构建系统](/c/470-BuildSystem)。

## 小练习

预测题（5 分钟）：先写下答案再运行验证。

```c
#define A 1
#define B A
#undef A
#define A 2
int x = B;      /* x 是几？ */
```

参考答案（先写再看）：x 是 2。`B` 展开成记号 `A` 时才去查当前的宏表，查到的是重定义后的 `A`——宏展开发生在**使用点**，不在定义点。`#undef` 后重定义不是覆盖历史，而是换掉了后续所有使用点要查的表项。

修改题（15 分钟）：把第 8.1 节的 `BAD_SWAP` 依次改成「花括号块去掉尾部分号」「do-while(0)」两个版本，分别编译第 8.1 节的 check 函数，记录哪版报错、报什么——亲手把 if/else 配对事故复现一遍。

挑战题（30 分钟，不看答案先动手）：C11 之前没有 `_Static_assert`，老项目用宏实现编译期断言。请写出 `STATIC_ASSERT(cond, name)`，让 `STATIC_ASSERT(sizeof(long) == 8, long_is_64)` 在 64 位平台编译通过、在 32 位平台编译失败。

提示（思路方向）：预处理之后是编译器的语义检查——有什么数组定义能让「长度为 0 或负数」直接变成编译错误？

展开（关键 API）：`typedef char static_assert_##name[(cond) ? 1 : -1];`——条件为真时定义一个 1 字节数组类型，为假时数组长度 -1，非法，编译失败；`##` 把 name 拼进类型名避免重复定义冲突。验收：改成 `sizeof(int) == 8` 后编译失败且报错指向这一行；对比 `_Static_assert(sizeof(int) == 4, "msg")` 的报错可读性，体会为什么 C11 要把它标准化（C23 起另有简写 `static_assert`，见 [C23 深水区](/c/530-C23NewFeatures)）。

## 与之前和之后的知识的关系

- 往前：[运算符与表达式](/c/060-OperatorExpression) 的优先级与序列点规则是本文括号纪律与 `SQUARE(i++)` 判定的裁判；[函数](/c/090-FunctionDetailed) 的传值语义是「宏参数不求值」的反面教材；[变量与常量](/c/050-VariableConstant) 的四种常量之争在本文 3.1 节落定一半；
- 旁支：[内联函数与宏](/c/300-InlineFunctionMacro) 回答「这个需求到底该用宏还是 inline」；[泛型选择](/c/280-GenericSelection) 接手类型分派；[多文件编译](/c/310-MultiFileCompilation) 把本文的头文件守卫扩展成完整的多文件工程；[内存对齐](/c/220-MemoryAlignmentDeepDive) 讲 `#pragma pack` 的对齐语义；[编译器扩展与属性](/c/540-AttributeCompilerExtension) 与本文的 pragma/宏互为表里；
- 往后：[C23 上手](/c/520-C23C2y) 与 [C23 深水区](/c/530-C23NewFeatures) 收编 `__VA_OPT__`、`#embed`、`__has_include` 的新特性全景；[跨平台编程](/c/410-CrossPlatformProgramming) 把本文的平台探测发展成成套的跨平台抽象层。

## 官方文档

- GCC 预处理器手册（搜索路径、宏语义、扩展，本文多节依据）：https://gcc.gnu.org/onlinedocs/cpp/
- 头文件搜索路径细则：https://gcc.gnu.org/onlinedocs/cpp/Search-Path.html
- 对象式宏的作用域与展开：https://gcc.gnu.org/onlinedocs/cpp/Object-like-Macros.html
- cppreference C 预处理页面（# / ## / `__VA_OPT__` 的标准语义）：https://zh.cppreference.com/w/c/preprocessor/replace
- 翻译阶段（8 阶段与 C23 删除三字符组）：https://en.wikibooks.org/wiki/C_programming/Alternative_tokens
- Linux 内核编码风格第 12 章（do-while(0) 与宏命名）：https://www.kernel.org/doc/html/latest/process/coding-style.html
- Modern C（Jens Gustedt，C23 版免费在线）：https://gustedt.gitlabpages.inria.fr/modern-c/

## 自我检查

- 能用 `gcc -E` 取出任意一段代码的预处理产物，并指着展开结果解释每个宏变成了什么；
- 能不看资料说出 `#include` 两种写法的搜索路径顺序、头文件守卫三写法及各自的可移植性代价；
- 拿到 `HALF(2 + 2) == 3` 式的静默算错，能在两分钟内用 `-E` 定位到缺括号的宏；
- 能向同事讲清 do { } while (0) 解决什么问题、`__VA_OPT__` 与 `##__VA_ARGS__` 各自的来历。

## 本章总结

预处理器是编译流水线的第一站：续行拼行、注释变空格、指令与宏展开都在编译器接手前完成，`gcc -E` 让这一切肉眼可见。`#include` 是复制粘贴（双引号先查当前目录），守卫挡住重复抄写；宏只是文本替换——参数不求值、无作用域、从定义行生效到 `#undef` 或文件尾，因此括号纪律与「别喂副作用」是保命符。`#` 字符串化与 `##` 记号拼接造就了 X-Macro 的单一数据源；`__VA_ARGS__` 配 C23 `__VA_OPT__` 让日志宏告别尾逗号。条件编译把平台、调试开关、头文件守卫三件事在编译前定死，`#error` 与 C23 探测指令让配错当场失败。宏的军规只有五条，核心一句：宏不是函数，别当函数用——该用函数的场景，下一篇给答案。

## 下一步

进入 [内联函数与宏](/c/300-InlineFunctionMacro)：宏的机制你已经吃透，接下来回答工程决策——同一个需求，什么时候该写 `static inline` 函数、什么时候宏仍是唯一解，以及 inline 关键字背后的链接语义。
