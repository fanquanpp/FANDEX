---
order: 270
title: 函数调用栈帧：一次调用的完整旅程
module: 'c'
category: 计算机科学
difficulty: advanced
description: 拆开 210 地图上 stack 那一段：无限递归数到几十万层才崩的现场实验，栈帧的建立与拆除、System V 与 Windows x64 传参差异、递归深度与尾调用优化、大局部数组与缓冲区溢出两类栈事故的逐行报告解读。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'c/200-DynamicMemoryManagement'
  - 'c/060-OperatorExpression'
  - 'c/560-CAssemblyInteraction'
  - 'c/100-VarargsFunction'
prerequisites:
  - 'c/210-MemoryManagement'
  - 'c/090-FunctionDetailed'
---

## 前置知识

- 已完成 [内存深水区](/c/210-MemoryManagement)：亲手打印过五段地址，记得 stack 在最高处、向下长；
- 已完成 [函数](/c/090-FunctionDetailed)：会写带参数、带返回值的函数，理解调用与返回的语义。

> 分工说明：210 与 250 合讲内存的「地理」。210 画的是进程整张地图：五段各在哪、堆事故怎么读；本篇把镜头推进 stack 这一段——一次调用如何压入一帧、帧里装了什么、递归如何层层叠叠、栈如何被撑爆、缓冲区溢出如何借栈劫持程序。两篇实验不重复：210 打印的是不同段的名字，本篇打印的是同一个段里相邻帧的位置。

## 学习目标

读完本文你将能够：

1. 画出 main 到 f 再到 g 三层调用期间的帧图，说出栈指针随每次调用怎么动；
2. 指出栈帧里返回地址、保存的帧指针、局部变量各住哪里，用打印地址的实验验证相邻帧的位置关系；
3. 说出 System V x86-64 与 Windows x64 传参规则的两条核心差异，解释同一份 C 代码为何在两个平台汇编不同；
4. 估算递归每帧的字节成本、量出崩溃深度，解释尾调用优化在 -O2 下把 call 变成了什么、标准为什么不管；
5. 制造并修复一次栈溢出，逐行读懂 ASan 的 stack-overflow 报告，说清 canary 如何在 ret 之前抓住缓冲区溢出。

预计 60 到 80 分钟，含 4 组实验、1 道预测题与 1 道挑战题。

## 1. 问题引入：无限递归能数到多少

```c
/* countdown.c：一个没有终止条件的递归 */
#include <stdio.h>

void recurse(int depth) {
    if (depth % 10000 == 0) {          /* 每一万层报一次到，避免刷屏 */
        printf("depth = %d\n", depth);
    }
    recurse(depth + 1);
}

int main(void) {
    recurse(0);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g countdown.c -o countdown
./countdown
```

一次典型输出（Linux 默认配置；具体数字每次、每机都不同）：

```text
depth = 0
depth = 10000
depth = 20000
...
depth = 170000
Segmentation fault (core dumped)
```

没有指针、没有数组、没有 free，程序自己崩了。「数到几十万」这个量级值得记住，它说明两件事：一次函数调用有真实成本（否则可以数到无限），这份成本有一个硬上限（用完就崩）。成本与上限都藏在同一个机制里——调用栈（call stack）。本文拆的就是它。

## 2. 调用栈心智模型：一次调用，一帧

栈是一段内存加两条硬件约定。栈指针（stack pointer，x86-64 上是 rsp 寄存器）永远指着当前栈顶；`call` 指令做两件事——把返回地址（return address，call 的下一条指令地址）压入栈，然后跳进被调用函数；`ret` 指令反向执行——弹出返回地址并跳回去。一次函数调用，就是在栈上划出一块地，这块地叫栈帧（stack frame，也叫活动记录 activation record）；函数返回，整帧退场。函数套函数，帧就叠帧——后进先出天然匹配调用嵌套。主流平台的栈都向低地址生长：每压入一帧，地址变小一格。

```text
高地址
+--------------------------------------+
| main 的帧                             |
+--------------------------------------+
| recurse 的帧（depth = 0）             |
+--------------------------------------+
| recurse 的帧（depth = 1）             |
+--------------------------------------+
| recurse 的帧（depth = 2）  <- rsp 在这 |
+--------------------------------------+
低地址    再往下是禁区，越过去即崩溃
```

帧不是语言魔法，是编译器搭的脚手架。看一个最小函数的汇编：

```c
int add(int a, int b) {
    int sum = a + b;
    return sum;
}
```

```bash
gcc -O0 -S -masm=intel add.c -o add.s
```

add.s 的骨架（Intel 语法，节选）：

```asm
add:
    push    rbp                       ; 序言开头：保存调用方的帧指针
    mov     rbp, rsp                  ; 立起自己的帧指针
    mov     DWORD PTR -20[rbp], edi   ; 参数 a 此刻在 edi 寄存器里，先安顿进帧
    mov     DWORD PTR -24[rbp], esi   ; 参数 b 同理
    ...
    pop     rbp                       ; 尾声：还回调用方的帧指针
    ret                               ; 弹出返回地址，跳回去
```

开头几条指令叫序言（prologue），负责建帧；结尾几条叫尾声（epilogue），负责拆帧。`push rbp` 一条指令等价于「rsp 减 8，再把 rbp 存进去」——压栈就是往下占一格。

值得说破的背景：C 标准从头到尾没提过「栈」这个字，它只规定调用语义和局部变量的生命周期。本文讲的全是主流平台的共同实现，换平台以该平台的 ABI 文档为准（第 9 节给了出处）。

修改实验一：同一份 add.c 换 `gcc -O2 -S -masm=intel add.c` 再看末尾。函数体缩成两三行，帧消失了——优化器发现 a 与 b 一直待在寄存器里，根本不用搬进内存。帧按需而建，这是「栈帧是实现细节」最直接的一次眼见为实。

## 3. 栈帧解剖：帧里到底装了什么

把一帧从外到里拆开，五样东西各就各位：

| 帧里的东西 | 谁放进去 | 干什么用 |
| --- | --- | --- |
| 返回地址 | call 指令自动压入 | ret 时跳回调用方，是「回到哪」的唯一凭据 |
| 保存的帧指针 | 被调用函数的序言 | 把所有帧串成一条链，调试器的回溯沿它走 |
| 局部变量 | 被调用函数分配 | 本函数的 auto 变量与临时量 |
| 被保存的寄存器 | 被调用函数 | 用了约定里「必须保住」的寄存器，返回前要原样奉还 |
| 参数区 | 调用方 | 寄存器装不下的参数落在这里（第 4 节展开） |

按地址从高到低，顺序是：参数区、返回地址、保存的帧指针、局部变量。空口无凭，打印出来看。210 的五段实验打印的是「不同段的名字」，这次打印「同一个段里相邻帧的位置」：

```c
/* frames.c：观察相邻调用帧的落点 */
#include <stdio.h>

void inner(void) {
    int inner_local = 2;
    printf("inner: &inner_local = %p\n", (void *)&inner_local);
}

void outer(void) {
    int outer_local = 1;
    printf("outer: &outer_local  = %p\n", (void *)&outer_local);
    inner();
}

int main(void) {
    int main_local = 0;
    printf("main : &main_local   = %p\n", (void *)&main_local);
    outer();
    return 0;
}
```

```bash
gcc -Wall -Wextra -g frames.c -o frames
./frames
```

一次典型输出（地址每次运行都不同）：

```text
main : &main_local   = 0x7ffc8a2b3e5c
outer: &outer_local  = 0x7ffc8a2b3e24
inner: &inner_local  = 0x7ffc8a2b3dfc
```

从地址读出三条事实：

1. main 最高、outer 居中、inner 最低——每进入一层函数，新帧压在旧帧下方，栈确实向下长；
2. 相邻两个地址的差（0x38 与 0x28，即 56 与 40 字节）约等于两帧各自的大小：哪怕函数只有一个 int，帧也不白给——返回地址、帧指针、对齐填充都要占位；
3. 同一函数里多个局部变量怎么排是编译器的自由（GCC 常按声明顺序向低地址排），不要写依赖排布的代码。

修改实验二：在 outer 里加一个 `char pad[256];` 并写一笔 `pad[0] = 1;`（防被优化掉），重跑。outer 与 inner 的间距立刻涨了二百多字节——帧大小 = 你要的空间 + 布头布尾，看得见摸得着。

帧的生死还解释了一个经典 UB：返回局部变量的地址。

```c
int *leak_local(void) {
    int local = 42;
    return &local;    /* 函数一返回，整帧退场，这个地址即将易主 */
}
```

编译器看得懂这个危险动作，开警告就有提示：

```text
leak.c: In function 'leak_local':
leak.c:3:12: warning: function returns address of local variable [-Wreturn-local-addr]
```

拿到地址时帧已退场，地皮随时分给别人：打印 42、打印垃圾、崩溃都有可能。修复四选一——返回值本身、static、堆上分配（判 NULL 与 free 的纪律在 [动态内存](/c/200-DynamicMemoryManagement)）、调用方传缓冲区进来。

## 4. 调用约定概览：同一份 C 代码，两套落地规则

参数怎么传、返回值放哪、哪些寄存器谁保存、栈怎么对齐——这套规则叫调用约定（calling convention），它是应用二进制接口（ABI，Application Binary Interface）的核心部分。第 2 节的汇编里「参数 a 此刻在 edi 里」就是它规定的。主流桌面两套规则：

| 规则 | Linux/macOS（System V AMD64） | Windows（Microsoft x64） |
| --- | --- | --- |
| 整型/指针参数寄存器 | 前 6 个：rdi, rsi, rdx, rcx, r8, r9 | 前 4 个：rcx, rdx, r8, r9 |
| 浮点参数寄存器 | xmm0 到 xmm7（8 个） | xmm0 到 xmm3（4 个） |
| 返回值 | rax | rax |
| 调用方额外义务 | 无 | 预留 32 字节 shadow space |
| 被调用方必须保住的寄存器 | rbx, rbp, r12 到 r15 | rbx, rbp, rdi, rsi, r12 到 r15 |

两处差异最值得记住：

1. **传参个数**：Linux 一侧 6 个整型参数走寄存器，第 7 个起才落栈；Windows 一侧只有 4 个。同一段 `f(a, b, c, d, e, f6, g)`，一个平台 7 个参数里 6 个不碰内存，另一个平台 3 个要压栈——「参数别写太多」在性能敏感的接口上是真建议。
2. **shadow space（影子空间）**：Windows 的调用方哪怕只传 1 个参数，也必须在栈上留够 32 字节（4 个 8 字节槽位）；被调用方有权把寄存器参数暂存回这里。这就是为什么同样 4 个参数的调用，Windows 侧的 rsp 比 Linux 侧多让出 32 字节。「被调用方必须保住的寄存器」一栏则是第 3 节帧里「被保存的寄存器」的来源：想用这些寄存器，序言先存、尾声再还，Windows 把 rdi、rsi 也划进了这份名单。

平台差异记这两条就够，不背全表。同一份 C 代码在两个平台汇编不同，原因就在这里：编译器以目标平台的 ABI 为准，第 1 个参数一个平台进 rdi、另一个进 rcx。

再收三笔与本节相关的账：

- 栈对齐：System V 要求 call 之前 rsp 是 16 字节的倍数（为 SSE 指令铺路），编译器自动维护，只有手写汇编才需要操心，见 [C 与汇编交互](/c/560-CAssemblyInteraction)；
- 求值顺序：参数「怎么传」由约定管，但实参表达式「先算谁」C 标准未指定——`f(++i, i)` 这类写法是雷，规则细节见 [运算符与表达式](/c/060-OperatorExpression)；
- 变参函数：printf 的「参数个数不定」能在寄存器传参下工作，靠的是约定里专门的补丁规则，见 [可变参数函数](/c/100-VarargsFunction)。

## 5. 递归与栈：深度、成本与尾调用

递归不过是自己调自己，栈的视角里就是「同一套帧反复压入」。第 1 节崩在几十万层，这道除法现在能做了：默认栈 8 MB，崩在约 20 万层，每层约 40 字节——一个小函数一帧就几十字节，量级对得上第 3 节的测量。

修改实验三：给 recurse 每帧塞 4 KB，看深度跌多少倍。

```c
void recurse(int depth) {
    char pad[4096];               /* 每帧多要 4 KB */
    pad[0] = 1;                   /* 写一笔，防止被优化掉 */
    if (depth % 1000 == 0) {
        printf("depth = %d\n", depth);
    }
    recurse(depth + 1);
}
```

一次典型输出：

```text
depth = 0
depth = 1000
Segmentation fault (core dumped)
```

约两千层就崩了——8192 KB 除以每帧 4 KB 出头，正好两千上下。深度上限不是玄学，是一道除法：栈预算除以每帧成本。反过来，掐指一算就能预判「这个递归会不会崩」。

那能不能让递归不压帧？看这个函数：

```c
/* tail.c */
#include <stdio.h>

long sum_to(int n, long acc) {
    if (n == 0) return acc;
    return sum_to(n - 1, acc + n);   /* 最后一个动作就是调用本身 */
}

int main(void) {
    printf("%ld\n", sum_to(1000000, 0));
    return 0;
}
```

```bash
gcc -Wall -Wextra -g tail.c -o tail0 && ./tail0        # 崩：百万层帧
gcc -Wall -Wextra -O2 tail.c -o tail2 && ./tail2       # 打印 500000500000
```

-O0 下它崩了，-O2 下它算出了正确答案——百万次「递归」只用了常量栈。这就是尾调用优化（tail call optimization，TCO）：当调用是函数的最后一个动作（尾调用），当前帧使命已尽，call 加 ret 可以合并成一条 jmp——不压返回地址、不建新帧，把本帧直接让给下一轮，递归折叠成等价的循环。看汇编验证：

```bash
gcc -O0 -S -masm=intel tail.c -o tail0.s
gcc -O2 -S -masm=intel tail.c -o tail2.s
grep -n "call.*sum_to\|jmp.*sum_to" tail0.s tail2.s
```

```text
tail0.s:17:	call	sum_to
tail2.s:12:	jmp	sum_to
```

-O0 里是 call（压栈、建帧），-O2 里变成 jmp（原地跳转、帧复用）。

TCO 什么时候会发生？三个要点：

1. **形态**：调用之后必须无事可做。`return n * factorial(n - 1)` 里乘法在调用后面，返回值还要再算一步，帧不能让，优化不做；
2. **级别**：GCC 与 Clang 从 -O2 起通常做（GCC 对应的优化开关叫 -foptimize-sibling-calls），-O0 从不做；
3. **不保证**：C 标准至今只字未提尾调用，它是编译器在「可观察行为不变」前提下的自由发挥。换编译器、换优化级别、改一行代码形态，都可能让它消失。

工程纪律由此而来：深递归要么自限深度，要么改写成迭代，绝不把正确性押在 TCO 上。第 8 节小练习的挑战题会带你亲手把 jmp 抓出来。

## 6. 常见错误与调试实录：栈溢出事故现场

### 事故一：大局部数组，一行声明压垮栈

```c
/* boom.c */
#include <stdio.h>

int main(void) {
    int big[10 * 1000 * 1000];    /* 4000 万字节 = 40 MB */
    big[0] = 1;
    printf("%d\n", big[0]);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g boom.c -o boom
./boom
```

```text
Segmentation fault (core dumped)
```

没有任何越界，编译器一声不吭——栈用量不是标准关心的错误，是资源问题。崩因纯粹是「要的比有的多」：默认栈 8 MB，声明就 40 MB，序言里 rsp 一次性下移 40 MB，写 `big[0]`（数组的最低地址）时一脚踩进未映射区域。注意是声明就埋雷，写不写数据都危险。

修复：这样的体量上堆。

```c
    int *big = malloc(10 * 1000 * 1000 * sizeof(int));
    if (big == NULL) { perror("malloc"); return 1; }
    big[0] = 1;
    printf("%d\n", big[0]);
    free(big);
```

判据一句话：小而短命住栈，大或需跨函数存活上堆——四件套的完整纪律在 [动态内存](/c/200-DynamicMemoryManagement)。

### 顺手的工具：ulimit -s

```bash
ulimit -s        # 8192（单位 KB，即 8 MB，主流 Linux 默认）
ulimit -s 16384  # 本 shell 之后启动的进程改用 16 MB
```

| 平台 | 默认栈 | 查看与调整 |
| --- | --- | --- |
| Linux | 8 MB（常见默认 8192 KB） | ulimit -s |
| Windows | 1 MB | 链接器 /STACK 选项 |

调大栈是止痛药不是修复：程序对栈的真实需求没变，只是把崩溃推迟到没调过的那台机器上。Windows 侧没有 ulimit，默认 1 MB，由链接器的 /STACK 选项决定。

### 事故二：ASan 的 stack-overflow 报告逐行读

裸跑只给你一行 Segmentation fault，ASan 给你完整案情。给 countdown.c 开 ASan 再崩一次：

```bash
gcc -Wall -Wextra -g -fsanitize=address countdown.c -o countdown_asan
./countdown_asan
```

预期输出（数字与地址每次不同，关键行如下）：

```text
==24512==ERROR: AddressSanitizer: stack-overflow on address 0x7ffc1d5a2ef8 (pc 0x55b2a1c23169 bp 0x7ffc1d5a2f00 sp 0x7ffc1d5a2ef8 T0)
    #0 0x55b2a1c23168 in recurse countdown.c:8
    #1 0x55b2a1c23168 in recurse countdown.c:8
    #2 0x55b2a1c23168 in recurse countdown.c:8
    ...
SUMMARY: AddressSanitizer: stack-overflow in recurse countdown.c:8
```

逐行读：

1. 首行点名事故 `stack-overflow`——栈耗尽，注意它与 `stack-buffer-overflow`（栈上数组越界访问）是两种报告，ASan 会替你分类；
2. `on address` 是踩到禁区的那个地址，通常紧贴当前栈指针 sp——正是帧生长撞上保护页的现场；
3. `#0` 起的回溯全是同一行 countdown.c:8——无限递归的自供状态，连行号都不带换的；
4. SUMMARY 收口，指出在哪个函数哪一行。

两个使用提示：ASan 自身更耗栈（官方实测最多约 3 倍），所以它崩得比裸跑更早，报出来的深度别当真实预算；想在自己崩掉后还能打印现场，需要给信号处理器备一块独立信号栈（sigaltstack），机制见 [信号处理](/c/340-SignalHandling)。

### 顺带两个陷阱

- **大小不可控的栈分配**：`int arr[n]`（VLA）与 alloca 同样在栈上要空间，要不到时不返回 NULL，而是直接撞穿栈。VLA 是 C99 引入、C11 起可选（宏 `__STDC_NO_VLA__`），MSVC 从未支持；alloca 连标准都不是。大小来自外部输入时，这两个一律禁用，改走 malloc；
- **信号处理器里的栈**：处理函数自己也要压帧，栈已耗尽时它无处落脚——这正是 sigaltstack 存在的理由，同样见 [信号处理](/c/340-SignalHandling)。

## 7. 缓冲区溢出与栈保护：从栈看安全

帧里最值钱的一格是返回地址——谁改写了它，ret 就跳到谁指定的地址。这不是理论威胁，十行代码就能演示：

```c
/* smash.c：故意不检查长度的拷贝 */
#include <stdio.h>
#include <string.h>

void greet(const char *src) {
    char buf[8];
    strcpy(buf, src);            /* src 比 8 字节长时，多出的部分越过 buf */
    printf("hello, %s\n", buf);
}

int main(void) {
    char input[64];
    memset(input, 'A', sizeof(input) - 1);
    input[sizeof(input) - 1] = '\0';
    greet(input);
    return 0;
}
```

buf 之上的帧内存依次是 canary（如果有）、保存的帧指针、返回地址。64 个 'A' 一路碾过去，全被写成 0x41。两版各编一次对照：

```bash
gcc -Wall -Wextra -g -fno-stack-protector smash.c -o smash_off
./smash_off
```

```text
hello, AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
Segmentation fault (core dumped)
```

返回地址被 'A' 填满，ret 跳向 0x4141414141414141，段错误。崩溃地址不是攻击者想要的地址时你只看到崩，是精心构造的地址时程序就被劫持了——这就是缓冲区溢出攻击的原理。

现在开栈保护再跑一遍：

```bash
gcc -Wall -Wextra -g -fno-stack-protector -fstack-protector-all smash.c -o smash_on
./smash_on
```

```text
*** stack smashing detected ***: terminated
Aborted (core dumped)
```

崩溃换成了明确的警报。机制叫栈金丝雀（stack canary，得名于矿坑里的金丝雀）：开启 -fstack-protector 系列后，序言从线程局部存储里取一个每次运行都不同的随机值，安放在局部变量与返回地址之间；尾声返回前核对——canary 变了说明有人越过了它，glibc 的 `__stack_chk_fail` 立即打印这行消息并中止进程。canary 最低字节固定为 0，字符串复制撞上它就会停，strcpy 们想无声无息碾过去都难。

按保护范围从松到紧：-fstack-protector 只保护含较大缓冲区或用了 alloca 的函数；-fstack-protector-strong 扩大到所有带局部数组定义的函数；-fstack-protector-all 保护全部函数。许多发行版的编译器默认已开 strong，所以平时看到的多是「detected」而不是静默劫持——做实验时用 -fno-stack-protector 才能看到裸奔的样子。

canary 不是万能锁：溢出可以只改相邻局部变量或栈上的函数指针，不碰 canary 就无法被它发现。系统级补强各有分工——地址随机化（ASLR，210 篇里地址每次不同就是它）让地址难猜，数据页不可执行让注入的代码跑不起来，新硬件的影子栈（如 Intel CET）把返回地址再存一份独立副本、ret 时核对。防线仍在前移：不给溢出机会——长度检查与更安全的库函数见 [安全函数与边界检查](/c/450-SafeFunctionBoundsCheck)；攻击视角与二进制安全实战见 [二进制安全与应急响应](/cybersecurity/580-BinarySecurityAndIncidentResponse)。

## 8. 工具角：gdb 看调用链，-fstack-usage 量帧

### gdb 的 bt：把栈链打印出来

程序崩在 countdown.c 里时，gdb 一条命令看清整条调用链：

```bash
gdb ./countdown
(gdb) run
```

```text
Program received signal SIGSEGV, Segmentation fault.
0x0000556a2b7c1169 in recurse (depth=176161) at countdown.c:8
```

```text
(gdb) bt 5
#0  recurse (depth=176161) at countdown.c:8
#1  recurse (depth=176160) at countdown.c:8
#2  recurse (depth=176158) at countdown.c:8
#3  recurse (depth=176156) at countdown.c:8
#4  recurse (depth=176155) at countdown.c:8
```

读法：bt（backtrace 的缩写）从当前帧一路列到 main，每行一帧；连续同名行就是递归；bt 5 只看最近 5 帧；`frame N` 切到某帧后可以打印那一层的局部变量，`info frame` 给出该帧的返回地址与前帧指针。第 3 节说「保存的帧指针把所有帧串成链」，bt 就是沿这条链走的人。

一个工程细节：-O2 下编译器常省掉帧指针（rbp 被挪去当通用寄存器），帧链断开——gdb 仍能回溯，靠的是编译器额外塞进可执行文件的展开信息（.eh_frame）。所以「优化后 bt 突然不准」时，调试构建加 -fno-omit-frame-pointer 是第一条自救措施。

### -fstack-usage：给每个函数的帧量尺寸

```bash
gcc -Wall -Wextra -g -fstack-usage frames.c -o frames
cat frames.su
```

```text
frames.c:5:6:void inner	16	32	static
frames.c:11:6:void outer	16	48	static
frames.c:17:5:int main	16	48	static
```

（数字随编译器版本浮动，格式不变。）每个函数一行，tab 分隔四列：源码位置、函数名、帧字节数、限定符。限定符 static 表示帧在进出时一次性分配；dynamic 表示函数体内还有动态调整（比如围绕调用压栈传参）；bounded 表示给出了上界。配上 `-Wstack-usage=128`，任何帧超 128 字节的函数直接编译告警——给栈预算装上静态闸门。Linux 内核用同一思路的 -Wframe-larger-than 把每个函数的帧卡在配额内，你完全可以把这条纪律搬进自己的项目。

## 实际项目中的使用场景

- 嵌入式固件：RTOS 的任务栈常以 KB 计（1 到 4 KB），第 6 节在桌面机上要 40 MB 才触发的坑，在板子上一个 4 KB 局部数组就够了——深递归与大局部数组在嵌入式是硬禁区，见 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)；
- 多线程服务：每个线程一条独立栈，glibc 默认大小跟随 ulimit -s；一百个线程乘 8 MB 就是 800 MB 的地址空间承诺，高密度线程服务用 pthread_attr_setstacksize 显式定尺寸，见 [线程与并发](/c/360-ThreadConcurrency)；
- 解析器与爬虫：递归下降解析嵌套结构时，深度由输入决定——不受限的递归深度是拒绝服务攻击的经典入口，必须设上限或改迭代；上线前用 -Wstack-usage 给帧上预算，工程化接入见 [静态分析与调试](/c/490-StaticAnalysisDebug)。

## 小练习

预测题（5 分钟）：把第 5 节实验里的 `char pad[4096]` 改成 `char pad[8192]`，在默认 8 MB 栈的 Linux 上，recurse 大约数到多少层崩？先写答案再运行。

参考答案（先写再看）：8192 KB 除以约 8 KB，一千层上下（实际略少——帧还要装返回地址、帧指针与对齐填充）。数量级对就算对：帧成本是字节级的事，深度上限是 MB 级的预算，除法就是全部秘密。

挑战题（30 分钟，不看提示先动手）：做一回 TCO 侦探，用汇编实证尾调用优化的发生条件。

提示（思路方向）：分别用 -O0 与 -O2 生成汇编（`gcc -O2 -S -masm=intel tail.c`），找出 sum_to 里那条递归调用指令；然后把 `return sum_to(n - 1, acc + n);` 改成 `return acc + sum_to(n - 1, n);`——加法挪到了调用后面——再对比 -O2 的汇编。

展开（关键点）：TCO 的判定条件是「调用是函数体最后一步」。加法挪到调用后，返回值还要再加工一步，当前帧不能让渡，jmp 变回 call。验收清单：-O0 汇编里能找到 call sum_to；原版 -O2 里是 jmp sum_to；改形后 -O2 也变回 call；用 `sum_to(10000000, 0)`（结果 50000005000000，long 装得下）验证——原版 -O2 跑得动，改形后 -O2 崩。

## 与之前和之后的知识的关系

- 往前：[内存深水区](/c/210-MemoryManagement) 的五段地图给了本篇坐标——stack 那一段的运行时机制本文拆完；[函数](/c/090-FunctionDetailed) 讲的调用语义，本文补上了机器层的进出账；
- 旁支：栈与堆怎么选是 [动态内存](/c/200-DynamicMemoryManagement) 的主题；手写汇编时的栈纪律（16 字节对齐、不许乱动 rbp）在 [C 与汇编交互](/c/560-CAssemblyInteraction)；实参求值顺序的完整规则在 [运算符与表达式](/c/060-OperatorExpression)；
- 往后：[const 与 volatile 详解](/c/260-CVolatileAndConstDeepDive) 里 volatile 局部变量在 setjmp/longjmp 场景的行为，正取决于「它住在栈上哪一层」——学完本篇，那个规则不再是死记硬背。

## 官方文档

- System V AMD64 ABI（Linux/macOS 传参规则的原始出处）：https://refspecs.linuxbase.org/elf/x86_64-SysV-abi.pdf
- Microsoft x64 calling convention（Windows 侧规则与 shadow space）：https://learn.microsoft.com/en-us/cpp/build/x64-calling-convention?view=msvc-170
- GCC 文档：-fstack-usage 与 .su 文件格式：https://gcc.gnu.org/onlinedocs/gcc/Developer-Options.html
- GCC 文档：-fstack-protector 系列：https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html
- pthread_create 手册页（线程默认栈大小与 RLIMIT_STACK 的关系）：https://man7.org/linux/man-pages/man3/pthread_create.3.html
- AddressSanitizer 文档（检测范围与栈开销）：https://clang.llvm.org/docs/AddressSanitizer.html

## 自我检查

- 能画出 main 到 f 再到 g 期间的帧图，说清 call、push rbp、ret 各把栈的哪一格动了；
- 能用打印地址的实验量出相邻帧间距，并解释它为什么约等于帧大小；
- 能不看资料说出两套 x86-64 调用约定各自的参数寄存器个数，以及 Windows 那 32 字节 shadow space 是谁留、归谁用；
- 能把「递归崩在几十万层」「大数组一行就崩」「stack smashing detected」三个现象各自对应到栈的哪个机制，并各自给出修复手段。

## 本章总结

调用栈让每次函数调用有了落脚点：call 压入返回地址，序言立起一帧——参数区、返回地址、保存的帧指针、局部变量、被保存的寄存器各就各位——ret 弹回，整帧退场。传参与寄存器分工由 ABI 约定：System V 用 6 个整型寄存器传参，Windows x64 用 4 个外加 32 字节 shadow space，同一份 C 代码因此汇编不同。递归深度乘以每帧成本就是栈预算：8 MB 或 1 MB，除法能预判崩溃。尾调用优化能在 -O2 下把递归折叠成循环，但标准不承诺，深递归的正确性只能靠自限深度或改迭代。大局部数组与深递归是栈溢出两大来源，上堆与限深度是修复；ASan 的 stack-overflow 报告与 -fstack-usage 的 .su 文件让事故与预算从猜变成量。返回地址是帧里最值钱的一格，canary 守在它前面，而真正可靠的防线是写不出溢出。

## 下一步

进入 [const 与 volatile 详解](/c/260-CVolatileAndConstDeepDive)：栈帧的进出账理清了，接下来看两个关键字——为什么信号处理器与 setjmp 场景里的 volatile 局部变量，命运和它住在哪一层栈直接相关。
