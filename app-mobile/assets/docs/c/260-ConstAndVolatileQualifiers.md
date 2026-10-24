---
order: 300
title: const 与 volatile：两个限定符的正交语义
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 从舞台灯控固件出发掌握 const 与 volatile 的正交语义：const 的只读契约与真实优化边界（文件内可折叠、跨编译单元不行）、volatile 三经典场景（MMIO、信号标志、setjmp）、const volatile 组合，以及「不原子、不排序、不当锁」的能力边界。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'c/270-VolatileKeyword'
  - 'c/380-AtomicAndMemoryModel'
  - 'c/520-C23CoreFeatures'
  - 'c/550-EmbeddedCProgramming'
prerequisites:
  - 'c/050-VariableConstant'
  - 'c/070-BitwiseOperationAndMask'
  - 'c/140-PointerDeep'
---

## 前置知识

- 已完成 [变量与常量](/c/050-VariableConstant)：会声明变量、理解作用域与初始化——限定符叠在声明之上，先要会读声明；
- 已完成 [位运算与位域](/c/070-BitwiseOperationAndMask)：读状态寄存器要用按位与、移位（`status & 0x1u`）；
- 已完成 [指针深度解析](/c/140-PointerDeep)：会用 `&` 取地址、`*` 解引用——const 与指针的组合、把整数地址当指针用，都建立在这套操作上。

指针细节记不全也能往下读，用到的地方当场解释。

> 分工说明：const 的内容由两篇共讲——const 与指针三组合的**语法**（四种声明怎么读、「右左法则」）在 [指针深度解析](/c/140-PointerDeep)，本篇讲**语义与工程用法**：const 契约承诺了什么、没承诺什么、编译器什么时候真的敢优化。volatile 的**定义与三大场景**在本篇建立；**优化器视角、逐条汇编证据与误用事故复现**在 [volatile 深水区](/c/270-VolatileKeyword)。

## 学习目标

读完本文你将能够：

1. 用「谁能写 × 值何时变」的二维表说清 const 与 volatile 的正交关系，并为每个象限举出真实例子；
2. 说清 const 形参的 API 契约意义，解释字符串字面量为什么改写就是未定义行为；
3. 用两文件实验验证「const 的折叠优化止步于编译单元」，说出 C23 constexpr 补上了什么缺口；
4. 说出 volatile 的三大经典场景（内存映射寄存器、信号处理器、setjmp），写出 `volatile sig_atomic_t` 标志的完整信号处理程序；
5. 指出 volatile 不提供原子性、不提供内存序、不能当锁，并用三问清单评审一段共享代码。

预计 50 到 70 分钟，含 4 组动手实验与 3 道练习。

## 1. 问题引入：舞台设备的两种「反常」

给演唱会舞台灯控固件写 C 代码时，你会遇到两类行为反常的变量。第一类是配色表：应援色一旦烧录进闪存就永远不该被改写，谁改谁闯祸。第二类是升降台状态寄存器：软件一行都不能写，硬件却在不停地改——你不写它，它自己会变。

```c
/* stage.c：舞台灯控固件里的两类「反常」变量（固件示意，桌面机不可跑） */
static const unsigned int theme_palette[] = {   /* 配色表：烧进闪存，永远只读 */
    0x3399FFu,   /* 蓝 */
    0xFF69B4u,   /* 粉 */
    0xFFD700u,   /* 金 */
};

volatile unsigned int lift_status = 0;          /* 升降台状态：软件不写，硬件在改 */

int WaitLiftReady(void) {
    while ((lift_status & 0x1u) == 0u) {        /* 轮询硬件置起的「手续完成」位 */
        ;
    }
    return 1;
}
```

两个约束方向恰好相反：对配色表，你要对编译器说「**请拦住任何改写它的企图**」——这是 `const`；对状态寄存器，你要对编译器说「**每次都老老实实去读，别自作聪明**」——这是 `volatile`。先把悬念立在这里：去掉配色表的 const，某天一次误写可能烧毁固件数据或撞上硬件写保护；去掉状态寄存器的 volatile，`-O2` 编译后这个轮询可能永远退不出去（4.6 节现场复现，逐条汇编拆解在 [volatile 深水区](/c/270-VolatileKeyword)）。

两个限定符回答的是两个互不干涉的问题，这就是「正交」：

| | 值不会自己变 | 值随时会变（在编译器看不见的地方改的） |
| --- | --- | --- |
| 软件可以写 | 普通变量（你熟悉的大多数变量） | `volatile` 变量（中断、信号、硬件共享的标志） |
| 软件不可以写 | `const` 对象（配色表、查找表） | `const volatile`（只读状态寄存器，见 4.3 节） |

记住这张 2x2 表，全文就是把它填满。

## 2. const：只读契约的三个层次

### 2.1 const 对象：出生即定，终身不改

```c
const int max_lift = 4;      /* 定义时必须给初值：以后没有机会再赋了 */
max_lift = 5;                /* 编译错误 */
```

```text
error: assignment of read-only variable 'max_lift'
```

`const` 修饰「声明里的这个名字」：这个名字从此只能读、不能写。它有类型、有作用域、能进调试器的符号表，本质上是一个**只读变量**，而不是「常量」的全部含义——这一点在 3.3 节会翻转你的认知。

### 2.2 与指针组合：约束的是「路径」，不是「对象」

指针带来一个新问题：限制谁？指针有两个自由度——指向哪里、能否经它写所指对象。const 出现在 `*` 左边约束后者，出现在 `*` 右边约束前者（四种组合的完整读法与右左法则训练在 [指针深度解析](/c/140-PointerDeep)，这里只取语义）：

```c
/* palette_view.c：const 与指针的组合（语义示意） */
int theme = 0x3399FF;                     /* 当前应援色：蓝 */
int backup = 0xFF69B4;                    /* 备用应援色：粉 */

const int *p_view = &theme;               /* 指向 const 的指针：不能经 p_view 写，可改指 */
int *const p_bind = &theme;               /* const 指针：不能改指，可经它写 */
const int *const p_both = &theme;         /* 双重 const：改值、改指都不行 */
/* p_view = &backup; *p_bind = 0xFFD700;   前者合法（换对象看），后者合法（经它写） */
/* *p_view = 0x000000; p_bind = &backup;   前者编译错误（写路径被封死），后者同 */
```

语义上最关键的一句：**const 限制的是「这一条访问路径」，不是「对象永远不变」**。

```c
int score = 90;
const int *view = &score;   /* 只承诺：经 view 不可写 */
score = 60;                 /* 完全合法：经原名写 */
/* 此时 *view 读到的是 60 */
```

`view` 只是一扇锁上的窗，房子还有别的门。这个区别在 3.2 节决定编译器敢不敢优化，请务必记住。修改实验：把这几行敲进 main 并加 `printf("%d\n", *view);`，先写下预测输出再运行（答案在练习节）。

### 2.3 函数形参：写进接口的承诺

const 在函数签名里是**契约**，最常见的是 `const char *title`：

```c
void play(const char *title) {   /* 承诺：本函数不通过 title 改写你的歌名 */
    printf("Now playing: %s\n", title);
}
```

它向调用方保证「你的数据不会被这个函数动过」；它**不**表示「调用方的变量从此不可变」——调用方在自己代码里怎么改都行，形参 const 只约束函数内部的这条路径。工程约定：**能写 const 的形参一律写 const**。它不改变函数行为，却让接口自我文档化——阅读者一眼可知哪些参数不会被改写；在多层指针、结构体指针满天飞的固件代码里，const 注记几乎等于免费的正确性文档。反过来也要防误解：`const char *` 形参不提供任何运行时保护，需要跨线程长期持有的数据，在接口层复制或由调用方保证生存期（见第 6 节实录五）。

### 2.4 字符串字面量：天生只读，改写即 UB

C 的字符串字面量（`"stagelight"`）会形成一个匿名静态数组，放在只读段（.rodata），**改写它是未定义行为**：

```c
/* literal.c：字符串字面量在只读段 */
#include <stdio.h>

int main(void) {
    char *s = "stagelight";   /* s 指向只读段里的匿名数组 */
    s[0] = 'S';               /* 试图改写：未定义行为 */
    printf("%s\n", s);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g literal.c -o literal
./literal
```

大概率直接段错误；开 ASan 看现场（地址每次不同，关键行如下）：

```text
==24110==ERROR: AddressSanitizer: SEGV on unknown address 0x55d0b2a01004 ... T0
==24110==The signal is caused by a WRITE memory access.
    #0 0x55d0b29ff2b4 in main literal.c:6
```

`WRITE memory access` 坐实了：往只读段写。两个正确姿势按需选用——只读用 `const char *title = "stagelight";`（契约与物理位置一致）；要一份可改的副本就拷进数组 `char buf[] = "stagelight";`（buf 可改，改的是自己的）。

### 2.5 const 的物理意义：只读段与闪存

嵌入式场景里，const 还有一层物理意义：被 const 修饰、程序从不改写的数据，链接器会放进只读段（.rodata），可以留在闪存里、由 MPU 等机制提供运行期写保护——**省下宝贵的 RAM**。配色表、字形库、曲目元数据这类「烧录即定」的数据都应声明为 const（平台细节见 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)）：

```c
/* theme_palette.c：烧录进闪存的只读段 */
static const unsigned int theme_palette[] = {
    0x3399FFu,   /* 蓝 */
    0xFF69B4u,   /* 粉 */
    0xFFD700u,   /* 金 */
};
```

## 3. const 变量与真常量：编译器真的会优化吗

### 3.1 三种常量手段各管一段

C 里表达「不变的值」有三种手段：`#define` 宏、枚举常量、const 变量。先看差异表：

| 维度 | #define 宏 | 枚举 | const 变量 |
| --- | --- | --- | --- |
| 类型检查 | 无 | 有（限整型） | 有（任意类型） |
| 作用域 | 从定义点到文件尾 | 花括号内 | 遵循 C 作用域规则 |
| 常量表达式 | 是 | 是 | 否（C 语言中） |
| 调试符号 | 无，替换后不可见 | 有 | 有 |
| 占用存储 | 不占（纯替换） | 不占 | 通常占（可被优化掉） |

```c
#define MAX_TICKETS 1000        /* 宏：无类型、预处理期文本替换 */
enum { MAX_ROWS = 20 };         /* 枚举：整型常量表达式 */
const int vip_rows = 5;         /* const：有类型有作用域，但不是常量表达式 */

int seats[MAX_ROWS];            /* 合法：枚举可用于数组长度 */
/* int vipseats[vip_rows];      C 中非法：const int 不是常量表达式 */

switch (999) {
case MAX_TICKETS:               /* 合法：宏展开为整型常量 */
    break;
default:
    break;
}
```

表中「调试符号」一行常被忽视：宏在崩溃现场只剩展开后的表达式，排查全靠猜；const 与枚举在调试器里都有自己的名字——不少嵌入式团队把常量从宏迁到枚举后，现场排障效率立竿见影。选择建议：一组相关的整数（状态码、档位）用枚举；需要类型检查与作用域、只作为「只读数据」使用时用 const 变量；需要参与编译期计算（数组长度、位宽宏、条件编译开关）时才用宏，且定义时给整体加括号（反例见第 6 节实录三）。

### 3.2 折叠实验：const 的优化止步于编译单元

「加了 const 编译器会更快吗？」答案比想象的有条件。先看**能**的情形——对象在本文件里定义、初始化可见：

```c
/* fold_a.c */
#include <stdio.h>
const int rows = 8;

int main(void) {
    int sum = 0;
    for (int i = 0; i < rows; i++) {
        sum += i;
    }
    printf("%d\n", sum);
    return 0;
}
```

```bash
gcc -Wall -Wextra -O2 -S fold_a.c -o fold_a.s
```

翻看 fold_a.s：循环整个消失，出现的是立即数 `28`（0+1+……+7）和一次 printf 调用，找不到任何对 rows 的内存读取——编译器看到初始化、确认对象生来只读，就把 rows 折叠成 8 参与编译期计算了。

再看**不能**的情形——值在另一个文件里：

```c
/* fold_b_main.c */
#include <stdio.h>
extern const int rows;      /* 只声明：初值在别的翻译单元 */

int main(void) {
    int sum = 0;
    for (int i = 0; i < rows; i++) {
        sum += i;
    }
    printf("%d\n", sum);
    return 0;
}

/* fold_b_data.c */
const int rows = 8;
```

```bash
gcc -Wall -Wextra -O2 -S fold_b_main.c -o fold_b.s
```

这次汇编里能找到对 rows 的内存读取（`mov eax, DWORD PTR rows[rip]` 之类）：编译器在当前翻译单元内看不到初值，不敢折叠，只能运行期读内存。C 的 const **没有跨文件生效的能力**——这也解释了「头文件里 extern const、源文件里定义」的经典排布为什么成立，多文件组织见 [多文件编译](/c/310-MultiFileCompilation)。

第三种情形最隐蔽——**别名**会击穿折叠。回看 2.2 节的 `view`：它指向的 `score` 可以经原名改写，所以编译器在任何优化等级都必须老老实实重读 `*view`。const 修饰指针时，编译器面对的是「一扇锁上的窗」，窗后的房子随时可能有人进出。修改实验：把 fold_b_data.c 的定义改成 `const volatile int rows = 8;` 重新生成 fold_b.s，对比差异（含义在 4.1 节揭晓）。

### 3.3 事实核查小结与 C23 的答案

三组事实摆在一起：第一，const 首先是**契约**——给人的，也给编译器的：生来 const 的对象被改写是 UB，编译器才有权当它不变；第二，折叠是契约的**副产品**，只在「初始化可见」的范围内发生：本文件可折叠，跨编译单元不行；第三，「到处加 const 就更快」是误解：const 指针约束的只是路径，别名之下编译器一步都不敢省。

真正的编译期常量，C 语言等了三十多年才补上——C23 的 `constexpr` 对象：

```c
constexpr int rows = 8;    /* C23：真编译期常量 */
int seats[rows];           /* 合法：可定数组长度 */
switch (x) { case rows: break; default: break; }   /* 合法：可做 case 标签 */
```

const 变量在 C23 之前做不到这两件事。C23 特性与编译器支持现状见 [C23 与 C2y](/c/520-C23CoreFeatures)。

## 4. volatile：每一次访问都算数

### 4.1 定义：可观察副作用

C 标准的表述（C17 6.7.3，转述）：凡经 volatile 限定类型的表达式对对象做访问，都被视为**可观察副作用**，必须严格按抽象机规则求值。工程版翻译：volatile 是对编译器说「别把我的读写当摆设」——每次读都真的从内存读一次（不许用上次缓存的结果）；每次写都真的写进内存一次（不许因「看起来没人用」而删掉）；访问的次数与相对顺序按源代码字面执行。

C 标准点名 volatile 的三类对象，共同点是「值可能在编译器看不见的地方被改变」：内存映射的硬件寄存器、与信号处理器共享的对象、`setjmp`/`longjmp` 跨越点存活的局部变量。下面逐个上手。另外凡「控制流之外」的写入者——DMA、调试器改值、共享内存里的其他进程——原理相同：没有 volatile，编译器就有权当你没看见。

### 4.2 场景一：中断与主循环共享的标志

升降台到位由中断服务程序置位，主循环轮询等待（固件示意）：

```c
/* lift_flag.c：中断置位、主循环轮询 */
volatile unsigned int lift_ready = 0;

/* 中断服务程序：硬件到位后由平台注册并触发 */
void LiftInterruptHandler(void) {
    lift_ready = 1;   /* 这行写入发生在主循环的控制流之外 */
}

int WaitLiftReady(void) {
    while (lift_ready == 0u) {
        /* 缺 volatile：编译器可能只读一次并缓存进寄存器，
           主循环永远看到 0，形成死循环 */
    }
    return 1;
}
```

volatile 缺席时的机制：循环体不修改 lift_ready，编译器有权认定「两次读之间它不会变」（依据是 as-if 规则，详见 270 篇），于是把读取外提、缓存进寄存器——中断改的是内存，寄存器里的旧值纹丝不动。

### 4.3 场景二：const volatile 组合——只读且会变的寄存器

2x2 表的右下角：软件只读（契约）+ 硬件随时改（事实），两个限定符叠加：

```c
/* status_reg.c：状态寄存器映射在固定地址（固件示意） */
volatile const unsigned int *const STATUS_REG =
    (volatile const unsigned int *)0x40021000u;

int StageReady(void) {
    /* 每次循环都真实读取寄存器（volatile 保证）；
       误写 *STATUS_REG 会在编译期被 const 拦下 */
    while ((*STATUS_REG & 0x1u) == 0u) {
        ; /* 等待舞台自检通过位 */
    }
    return 1;
}
```

逐层读这个声明：数据侧 `const` 表示不可通过此指针写；`volatile` 表示数据随时可能被硬件改变，禁止缓存与合并读取；最右的 `* const` 表示指针本身初始化后不再改指。三个限定各司其职，缺一个都引入缺陷：去掉数据侧 const，固件里某次误写可能通过编译；去掉 volatile，轮询可能变成永真或永假的死循环。嵌入式代码评审中，寄存器映射声明值得逐字符核对。

顺带解开 3.2 节修改实验的答案：`const volatile int rows` 与 `const int rows` 的汇编差异，就是 volatile 关掉了「读取合并」——每个用到 rows 的位置都必须真实读一次内存。跨编译器构建（GCC、Clang、厂商工具链并用）时 volatile 访问的实现细节存在差异，应以最严格者为准；寄存器地址段通常还要配合链接脚本或启动代码标记为不可缓存，那是平台移植的功课，C 代码层面能做的是把声明写对、把注释写清。

### 4.4 场景三：信号处理器与 volatile sig_atomic_t

信号（如 Ctrl+C 的 SIGINT）可以在任何一条指令之间打断程序——这是教科书级的「控制流之外」。处理急停信号的完整标准模式：

```c
/* estop.c：急停信号标志——可直接运行 */
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>

static volatile sig_atomic_t estop = 0;   /* volatile 与 sig_atomic_t，缺一不可 */

static void on_estop(int sig) {
    (void)sig;         /* 消除未使用参数警告 */
    estop = 1;         /* 处理器里只做「置标志」这一件事 */
}

int main(void) {
    if (signal(SIGINT, on_estop) == SIG_ERR) {
        perror("signal");
        return 1;
    }
    printf("按 Ctrl+C 模拟急停...\n");
    while (estop == 0) {
        ;              /* 主循环：volatile 保证 estop 每圈真实重读 */
    }
    printf("急停生效，主循环退出\n");
    return 0;
}
```

```bash
gcc -Wall -Wextra -g estop.c -o estop
./estop
```

预期输出：

```text
按 Ctrl+C 模拟急停...
^C急停生效，主循环退出
```

两个限定符各管一事：`sig_atomic_t` 是标准定义的「信号安全整数类型」，保证单次读写不可分割；`volatile` 保证主循环每次重读、看得见处理器的写入。标准依据（C17 7.14.1.1，转述）：信号非因 abort/raise 而发生时，处理器若引用任何具有静态或线程存储期、既非无锁原子对象、亦非 volatile sig_atomic_t 的对象，行为未定义。为什么普通 int 两头都不占、处理器里还能安全做什么，[volatile 深水区](/c/270-VolatileKeyword) 按条款逐条拆；信号 API 本身见 [信号处理](/c/340-SignalHandling)。

### 4.5 场景四：setjmp/longjmp 的简述

`setjmp` 保存执行现场，`longjmp` 跳回。标准（C17 7.13.2.1）规定：跳回后，setjmp 所在函数里**已被修改的非 volatile 局部变量，值不确定**。机制一句话：变量的值若被缓存在寄存器里，longjmp 恢复的是旧的寄存器现场，你的修改就丢了。规矩：setjmp 之后要改、改完跨过 longjmp 还要用的局部变量，一律加 volatile。完整示例与深水讨论见 270 篇。

### 4.6 修改实验：删掉 volatile，让死循环现身

把 estop.c 的 `static volatile sig_atomic_t estop` 改成 `static int estop`，`-O2` 编译再运行：按 Ctrl+C 大概率毫无反应，进程永远不退出——处理器的写入发生了，主循环看不见。反汇编对比看编译器把它改成了什么：

```bash
gcc -Wall -Wextra -O0 estop.c -o estop_o0
gcc -Wall -Wextra -O2 estop.c -o estop_fast
objdump -d estop_o0 | grep -A10 '<main>:'
objdump -d estop_fast | grep -A6 '<main>:'
```

-O0 版每圈都有一条读 estop 的内存加载；-O2 版循环缩成一条跳回自己的指令——读被提出循环后，条件永远为假。逐条拆解这份汇编、解释编译器的每一步推理，是 [volatile 深水区](/c/270-VolatileKeyword) 的开场大戏。

## 5. volatile 的边界：不原子、不排序、不当锁

volatile 的效果**精确而狭窄**，三条边界刻在心里：

1. **不提供原子性**。两个线程同时 `counter++`，这一句是「读-改-写」三步；volatile 只保证三步各自真实发生，不保证三步之间没有别的线程插进来——更新互相覆盖，最终值小于期望值。可复现实验在 270 篇。
2. **不提供内存序**。`data = 42; ready = 1;`（ready 为 volatile）不保证线程 B 看到 ready 为 1 时 data 也是 42——volatile 只约束 volatile 访问彼此的相对顺序；GCC 文档明说：非 volatile 访问相对 volatile 访问没有顺序约束。把「先写数据再举旗」押在 volatile 上，押空。
3. **不能当锁**。锁的本质是「检查并占位」不可分割；volatile 恰恰不提供任何不可分割性，只给 false 的安全感。

cppreference 的直接结论（转述）：volatile 变量不适合线程间通信——不提供原子性、同步与内存序；另一线程无同步地修改、或两线程无同步地并发修改 volatile 对象，本身就是数据竞争（未定义行为）。一句话分工：**volatile 解决「看得见」，原子与锁解决「算得对、排得对」**。并发正解（`_Atomic`、互斥锁、内存序）在 [C 原子操作与内存模型](/c/380-AtomicAndMemoryModel) 与 [线程与并发](/c/360-ThreadConcurrency)；优化器为什么有权吃掉你的读写，[volatile 深水区](/c/270-VolatileKeyword) 从 as-if 规则讲起。

把三者放进同一心智模型，评审任何共享对象时依次三问：**该不该写？**（const 管：不该写的路径是否已封死）；**看得见吗？**（volatile 管：控制流之外的修改能否被观察到）；**同时改会怎样？**（`_Atomic` 与锁管：读改写与顺序的正确性）。缺哪层补哪层，三问三分钟口算完，能拦下绝大多数硬件交互与并发缺陷。

## 6. 常见错误与调试实录

实录一：**把 volatile 当原子操作用**。两个线程同时 `stage_bpm++`，认为 volatile 能保证正确——最终计数小于期望（270 篇给出可复现实验）。修正：改用 C11 原子类型 `atomic_uint`，读改写用 `atomic_fetch_add(&stage_bpm, 1)`。

实录二：**强转写 const 数据**。`*(int *)&theme = 0;` 若对象真被放进只读段，运行期触发写保护错误，属未定义行为；即使碰巧不在只读段，也击穿了编译器「它不变」的优化假设，属于「能跑但全错」。修正：需要修改就不要声明为 const；确需绕过契约的场景（如回调的上下文参数），重新审视设计。

实录三：**宏常量缺括号**。`#define SEAT_FEE 10+2` 之后写 `SEAT_FEE * 3`，展开成 `10+2*3`。修正：整体加括号 `#define SEAT_FEE (10 + 2)`，或直接改用 `enum { SEAT_FEE = 12 };`。

实录四：**共享变量漏写 volatile**。中断置位的标志没加 volatile，主循环轮询被优化成死循环（4.6 节的现场）。修正：所有「控制流之外可能被修改」的对象一律加 volatile，并理解它只保证可见性。反向也别矫枉过正：普通局部变量、互斥锁保护下的共享数据都不需要 volatile，滥用会关闭优化、掩盖真正的同步问题。

实录五：**形参 const 被误解为全局承诺**。`void play(const char *title)` 只承诺函数内部不改；调用方 title 指向的内容随时可以变。需要跨线程长期持有的数据，在接口层复制或由调用方保证生存期。

## 7. 实际项目中的使用场景

- **固件与驱动**（[嵌入式 C 编程](/c/550-EmbeddedCProgramming)）：寄存器映射声明逐一核对 const/volatile/指针 const 三层；查表数据（配色、字形、校准参数）声明 const 进只读段，换 RAM、换写保护；
- **后台服务与守护进程**：Ctrl+C / kill 的退出标志用 `volatile sig_atomic_t`（4.4 节的 estop 模式），信号 API 细节见 [信号处理](/c/340-SignalHandling)；
- **中断与主循环共享数据**：单字节标志用 volatile + 必要时关中断构成临界区；多字节数据的读改写需要平台临界区，volatile 不够：

```c
/* bpm_shared.c：多字节共享数据的读取需临界区（Cortex-M 风格伪代码） */
volatile unsigned int stage_bpm = 120;

unsigned int ReadBpmSafe(void) {
    unsigned int value;
    __disable_irq();   /* 临界区入口（平台相关） */
    value = stage_bpm;
    __enable_irq();    /* 临界区出口 */
    return value;
}
```

- **代码评审**：对每个共享对象过一遍第 5 节的三问清单；再补一张「用不用 volatile」的四问卡：是内存映射寄存器吗？信号处理器会改它吗？setjmp/longjmp 会跨越它的修改吗？有 DMA、调试器这类隐形写入者吗？四个「是」之外的多线程场景，一律转 `_Atomic` 或锁。

## 8. 小练习

预测题（5 分钟）：先写答案再运行：

```c
int score = 90;
const int *view = &score;
score = 60;
printf("%d\n", *view);
```

参考答案（先写再看）：打印 `60`。const 只封了 view 这一条写路径，score 本身自由如常；编译器也必须重读 `*view`——这就是 3.2 节「别名击穿折叠」的手感版。

修改题（15 分钟）：把第 2.5 节的配色表搬进 main 变成桌面可跑程序：循环打印三个颜色，然后取消注释 `theme_palette[0] = 0u;`，读一遍编译报错。验收：能指着报错（`error: assignment of read-only object 'theme_palette[0]'`）说出「const 拦在了编译期」；再把数组临时改成 `static unsigned int` 确认报错消失，然后改回来。

挑战题（30 分钟，不看提示先动手）：为灯控固件设计一组常量：三档亮度、四种应援色、最大并发灯组数，分别用枚举、const 数组、宏表达，每个选择旁写一句理由（对照 3.1 节的表）。加分层：把「最大并发灯组数」改用 C23 `constexpr` 定义，写一个以它为 case 标签的 `switch`，用 `gcc -std=c23` 验证通过、再用 `-std=c17` 验证报错（const int 做不到 case 标签）。验收清单：三种手段各就各位、理由引用了表格维度、C17/C23 对照输出各贴一行。

## 9. 与之前和之后的知识的关系

- 往前：[变量与常量](/c/050-VariableConstant) 的声明与作用域是限定符的载体；[指针深度解析](/c/140-PointerDeep) 讲了 const 与指针的**语法**，本篇补上**语义**（契约、别名、折叠边界）；
- 旁支：[位运算与位域](/c/070-BitwiseOperationAndMask) 的按位与在读寄存器时天天用；多字节共享数据的正确姿势在 [C 原子操作与内存模型](/c/380-AtomicAndMemoryModel)；
- 往后：[volatile 深水区](/c/270-VolatileKeyword) 从优化器视角把「为什么会被吃掉」拆到汇编层，并给出 volatile 与 `_Atomic`、锁的职责对照表。

## 10. 官方文档

- volatile 限定符（cppreference C，含三大场景与「不提供原子性/同步/内存序」原文）：https://en.cppreference.com/w/c/language/volatile
- 字符串字面量（cppreference C，「改写字面量是未定义行为」原文）：https://en.cppreference.com/w/c/language/string_literal
- GCC 文档 Volatiles（volatile 访问在序列点间的合并/重排自由度）：https://gcc.gnu.org/onlinedocs/gcc/Volatiles.html

## 11. 自我检查

- 能默画 2x2 正交表，并为四个象限各举一个真实对象；
- 能向同事讲清 `const char *` 形参承诺了什么、没承诺什么，以及字符串字面量为什么不能写；
- 能解释「本文件的 const int 可被折叠、extern const 不行」的原因，知道 C23 用什么补这个缺口；
- 能写出 volatile sig_atomic_t 的信号标志程序，并说出 volatile 的三条边界各错在哪。

## 本章总结

const 与 volatile 正交：const 管「该不该写」，是封死路径的契约；volatile 管「看得见吗」，强制每次访问真实发生。const 的优化收益有条件——初始化可见时折叠成常量，跨编译单元与别名在场时一步不省，真正的编译期常量要等 C23 constexpr。volatile 的三大法定场景是内存映射寄存器、信号处理器（配 sig_atomic_t）与 setjmp 跨越点；它精确而狭窄：不原子、不排序、不当锁，并发正确性归 `_Atomic` 与锁管。三问清单——该不该写、看得见吗、同时改会怎样——是评审共享代码的三分钟口算法。

## 下一步

进入 [volatile 深水区](/c/270-VolatileKeyword)：同一个忙等循环，为什么 `-O0` 能退出、`-O2` 死循环？从 as-if 规则到逐条汇编，把编译器吃掉读写的每一步看清楚，再用三起误用事故丈量 volatile 的真实边界。
