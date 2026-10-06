---
order: 600
title: C 与汇编交互：从反汇编到内联汇编
module: 'c'
category: 计算机科学
difficulty: advanced
description: objdump 反汇编自己的 add 函数起步：gcc -S 的 -O0/-O2 对照看寄存器分配，手写 .s 与 C 互相调用（System V x64 约定、名字修饰、栈对齐纪律），GCC 基本 asm 与扩展 asm 四段结构逐段讲透，volatile asm 与 "memory" clobber 防住哪类优化，什么时候值得写汇编与三类翻车现场。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'c/270-VolatileKeyword'
  - 'c/410-CrossPlatformProgramming'
  - 'c/250-FunctionCallStackFrame'
  - 'c/380-AtomicAndMemoryModel'
prerequisites:
  - 'c/250-FunctionCallStackFrame'
  - 'c/550-EmbeddedCProgramming'
---

## 前置知识

- 已完成 [函数调用栈帧](/c/250-FunctionCallStackFrame)：背得出 System V x64 的传参表——前 6 个整型参数走 rdi/rsi/rdx/rcx/r8/r9、返回值在 rax——本篇全篇在用这张表；
- 已完成 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)：见过寄存器与内存地址直接对话的世界，理解为什么有些事必须离开纯 C 的层面。

> 分工说明：250 用 gcc -S 看栈帧的建立与拆除，本篇在其上回答两个新问题——C 与汇编怎么互相调用、怎么在 C 里写汇编；550 的链接脚本把 .text 等段铺进地址空间，本篇补上段里指令这一层的读写能力；270 引用的编译器屏障 `asm volatile("" ::: "memory")` 在本篇拆开。Windows x64 与 ARM/RISC-V 的汇编细节点到即止，收口在 [跨平台编程](/c/410-CrossPlatformProgramming)。

## 学习目标

读完本文你将能够：

1. 用 objdump -d 反汇编自己写的函数，从 -O0 与 -O2 的输出对比中读出寄存器分配；
2. 手写一个遵守 System V x64 约定的 .s 文件与 C 互相调用，并说出 Linux/macOS/Windows 的符号名差异；
3. 写出带输出、输入、clobber 三段的扩展内联汇编，解释 %0 编号规则与约束 "r"/"m"/"=r" 各管什么；
4. 预测哪些内联汇编会被编译器删除，说清 volatile 修饰与 "memory" clobber 分别防住哪一类优化；
5. 对「要不要写汇编」给出工程判断，并读懂 clobber 遗漏、约束错误、32 位约定误用三类翻车现场。

预计 60 到 80 分钟，含 5 组实验、1 道预测题与 1 道挑战题。

## 1. 问题引入：反汇编自己的 add 函数

```c
/* add.c */
int add(int a, int b) {
    return a + b;
}
```

```bash
gcc -O2 -c add.c -o add.o
objdump -d add.o
```

一次典型输出（x86-64 Linux，gcc 13；地址与字节码随版本浮动）：

```text
add.o:     file format elf64-x86-64

Disassembly of section .text:

0000000000000000 <add>:
   0:   8d 04 37                lea    (%rdi,%rsi,1),%eax
   3:   c3                      ret
```

三行汇编写完了 a + b：参数 a 早已住在 edi、参数 b 住在 esi（正是 250 那张传参表），`lea` 把两者相加送进 eax，`ret` 弹返回地址跳回去。C 编译出来就是汇编——读写汇编不是黑魔法，而是「看得懂编译器的输出」。从本篇起，编译器在你眼里的行为从「黑盒」变成「可以验收的产物」。

## 2. 从 C 到汇编：gcc -S 与最小词汇表

objdump 是从二进制往回看；gcc 的 `-S` 则让编译器直接交出汇编文本，方便逐行对照源码。

```c
/* calc.c */
int calc(int a, int b, int c) {
    int x = a + b;
    int y = c * 3;
    return x - y;
}
```

```bash
gcc -O0 -S calc.c -o calc0.s
gcc -O2 -S calc.c -o calc2.s
```

-O0 的骨架（AT&T 语法，节选）：

```asm
calc:
    pushq   %rbp
    movq    %rsp, %rbp
    movl    %edi, -20(%rbp)          # 三个参数先安顿进栈
    movl    %esi, -24(%rbp)
    movl    %edx, -28(%rbp)
    movl    -20(%rbp), %edx          # 再逐个搬回寄存器做加法
    movl    -24(%rbp), %eax
    addl    %edx, %eax               # x = a + b
    movl    %eax, -4(%rbp)           # x 存回栈
    movl    -28(%rbp), %eax
    imull   $3, %eax, %eax           # y = c * 3
    movl    %eax, -8(%rbp)           # y 存回栈
    movl    -4(%rbp), %edx
    movl    -8(%rbp), %eax
    subl    %edx, %eax               # return x - y
    popq    %rbp
    ret
```

-O2 的全貌：

```asm
calc:
    leal    (%rdi,%rsi), %eax        # x = a + b，寄存器里直接完成
    leal    (%rcx,%rcx,2), %edx      # y = c * 3，乘 3 变成一条取址算术
    subl    %edx, %eax
    ret
```

对照读出三件事：-O0 忠实地按源码语义翻译，每个变量进出内存各走一趟；-O2 里三个参数从进函数起就住在寄存器里，全程不碰内存——这就是寄存器分配，肉眼可见；乘 3 在 -O2 里不是乘法指令，而是 `lea (%rcx,%rcx,2)`（rcx + rcx*2），取址算术当算术用是 x86 的经典小技巧。

读汇编的最小词汇表，十来条就够起步：

| 指令 | 作用 |
| --- | --- |
| mov | 搬运：寄存器与寄存器/内存之间 |
| push / pop | 压栈 / 出栈（rsp 自动减/加 8） |
| call / ret | 调用（压返回地址并跳转）/ 返回（弹返回地址跳回） |
| add / sub | 加 / 减 |
| cmp | 比较：做减法但丢掉结果，只留下标志位 |
| je / jne / jge 等 | 条件跳转：看标志位决定走哪条路 |
| jmp | 无条件跳转 |
| lea | 取地址算术：不真正访存，常用来算地址与小巧的乘加 |
| imul | 整数乘法 |
| nop | 什么都不做，占一个位置 |

一句语法说明：gcc 默认输出 AT&T 语法——寄存器带 %、立即数带 $、源在前目的在后（`mov %esi,%edi` 是 edi = esi）；`objdump -M intel` 与 `gcc -masm=intel` 可切换成目的在前的 Intel 语法（250 篇的示例用的就是它）。两种语法描述的是同一套机器指令，本篇跟随 gcc 默认用 AT&T。

## 3. C 调汇编：从 .s 到链接

现在反向操作：写一个纯汇编文件，让 C 当调用方。按 System V x64 约定，`int max_asm(int a, int b)` 的两个参数分别在 edi 与 esi，返回值放 eax——250 篇的约定表在这里直接当设计说明书用。

```asm
# max_asm.s —— 实现 int max_asm(int a, int b)
    .text
    .globl max_asm              # 不写这行，链接器看不见这个符号
max_asm:
    mov     %edi, %eax          # eax = a
    cmp     %esi, %eax          # 比较 eax 与 b
    jge     done                # a >= b：eax 已是较大者
    mov     %esi, %eax          # 否则换成 b
done:
    ret
```

C 侧只看到一个普通函数声明：

```c
/* main.c */
#include <stdio.h>

int max_asm(int a, int b);      /* extern 可写可不写：函数声明默认就是 extern */

int main(void) {
    printf("max(3, 9) = %d\n", max_asm(3, 9));
    printf("max(9, 3) = %d\n", max_asm(9, 3));
    return 0;
}
```

```bash
gcc main.c max_asm.s -o demo
./demo
```

```text
max(3, 9) = 9
max(9, 3) = 9
```

链接为什么能接上？[多文件编译](/c/310-MultiFileCompilation) 的符号配对逻辑原样适用：C 编译器看到声明就放行一个未定义符号，链接器再到 max_asm.o 里找到实现。用 nm 验收：

```bash
nm max_asm.o
```

```text
0000000000000000 T max_asm
```

T 表示「已定义的文本段符号」——[动态库与静态库](/c/320-DynamicStaticLibrary) 的 nm 词汇表在此重逢。

**名字修饰的事实**：上面 .s 里写 `max_asm` 而不是 `_max_asm`，是 Linux 的规矩——ELF 平台上 C 符号原名照登，没有任何前缀。macOS（Mach-O 格式）会给所有 C 符号自动加一个下划线，同一个文件移植过去必须写成 `_max_asm`；Windows x64 的 C 符号同样不加下划线，但传参约定换成另一套（4 个寄存器加 shadow space），细节收口在 [跨平台编程](/c/410-CrossPlatformProgramming)。一句话：C 语言本身不做名字修饰，修饰符号的是平台，跨平台的汇编都靠预处理宏按平台改名。

**栈对齐纪律**：250 埋过的伏笔在此兑现——System V 要求 call 指令发出之前 rsp 是 16 字节的倍数；而 call 自己会压入 8 字节返回地址，所以被调函数刚开场时 rsp 除以 16 余 8。max_asm 这种不调用别人、不碰栈的叶子函数天然合规；一旦你的汇编要 call C 函数，进门就得留意对齐（见第 4 节的写法），否则被调方某条要求对齐的 SSE 指令会把程序当场送走。

## 4. 汇编调 C：call 过去，守好分工

反过来，汇编文件里也可以直接 call 一个 C 函数。写一个 `int twice(int n)`，内部调 C 的 add：

```asm
# twice.s —— int twice(int n)：调 C 的 add(n, n)
    .text
    .globl twice
twice:
    push    %rcx              # 占 8 字节凑对齐：进门时 rsp 余 8，压一下回到 16 的倍数
    mov     %edi, %esi        # 第 2 个参数 = n（第 1 个参数已在 edi）
    call    add               # eax = add(n, n)；Linux 的 C 符号不加前缀
    pop     %rcx              # 复原 rsp；返回值已在 eax，拿 caller-saved 寄存器垫背
    ret
```

```c
/* twice_main.c */
#include <stdio.h>

int add(int a, int b) { return a + b; }   /* C 侧提供实现 */
int twice(int n);                          /* 汇编侧提供实现 */

int main(void) {
    printf("twice(21) = %d\n", twice(21));
    return 0;
}
```

```bash
gcc twice_main.c twice.s -o twice && ./twice
```

```text
twice(21) = 42
```

能安全地 call，靠的是寄存器阵营表（System V x64）：

| 寄存器 | 阵营 | 纪律 |
| --- | --- | --- |
| rax | caller（调用方保存） | 放返回值，随便踩 |
| rcx, rdx, rsi, rdi, r8-r11 | caller | 想跨 call 保住它，call 前自己 push |
| rbx, rbp, r12-r15 | callee（被调用方保存） | 要用先 push、还账再 pop |

「caller 保存」的意思是：被调函数可以不打招呼地改掉这些寄存器，谁想跨调用保住值谁自己负责。twice 里 n 传给 add 前就搬家进 esi、call 之后不再需要，所以毫无负担。

修改实验一：把 twice 升级成 thrice（返回 add(add(n, n), n)）——第二次 call 之后还需要 n，caller-saved 寄存器靠不住了，必须动用 callee-saved 阵营：

```asm
thrice:
    push    %rbx              # 用 callee-saved 前先保存（顺带凑好了对齐）
    mov     %edi, %ebx        # n 存进 rbx：跨任意 call 都不会被别人改
    mov     %edi, %esi
    call    add               # eax = n + n
    mov     %ebx, %esi        # 第 2 参 = n
    mov     %eax, %edi        # 第 1 参 = 2n
    call    add               # eax = 2n + n
    pop     %rbx              # 还账
    ret
```

纪律从表格变成手感：caller-saved 是借的，callee-saved 是自己的，借的过夜会丢。

## 5. GCC 内联汇编：让汇编住进 C 函数

独立 .s 之外，GCC 与 Clang 还允许把汇编写进 C 函数内部。分基本与扩展两档。

**基本 asm**：只有一段字符串，没有操作数。

```c
__asm__ ("nop");
```

编译器不解析这段字符串，原样转交汇编器。适合没有输入输出、不依赖任何 C 变量的场合。GCC 手册里有一条关键性质：基本 asm 全部隐含 volatile，编译器不会删它。另外 asm 与 `__asm__` 同义，后者用于 `-std=c99` 这类把 asm 留给未来标准的编译模式。

**扩展 asm**：四段结构，让编译器代管寄存器。

```c
/* five.c：t = 5 * x */
int five_times(int x) {
    int t;
    __asm__ ("leal (%1,%1,4), %0"
             : "=r"(t)          /* 输出段：0 号操作数 */
             : "r"(x));         /* 输入段：1 号操作数 */
    return t;
}
```

逐段讲：

- **模板**：机器指令文本，%N 引用操作数；
- **输出段**：`"=r"(t)`——等号表示只写输出，r 表示「找个通用寄存器」；编译器自行分配寄存器，事后把寄存器值写回 t；
- **输入段**：`"r"(x)`——编译器负责先把 x 装进它挑中的寄存器；
- **clobber 段**（本例省略）：声明模板偷偷改掉的、操作数清单之外的资源。

编号规则：输出从 0 号起，输入接着排。上例 %0 是 t、%1 是 x。想在模板里引用真正的寄存器名要写两个百分号（`%%eax`）——单个 % 已经被操作数征用。

约束速查（精选，够本篇用）：

| 约束 | 含义 |
| --- | --- |
| r | 通用寄存器，编译器挑 |
| m | 内存操作数，不占寄存器 |
| i | 编译期立即数 |
| = / + | 输出只写 / 输入兼输出（读写） |
| a | 绑定到 a 系寄存器（rax/eax） |
| & | 早期 clobber：输入不得与该输出共用寄存器 |

两个补充示例把 m 与 a 讲透。m 约束让操作直接落在内存上：

```c
/* bump.c：直接对 *p 加 42，不经寄存器中转 */
void bump(int *p) {
    __asm__ ("addl $42, %0" : "+m"(*p));
}
```

a 系绑定用在「指令规定了寄存器」的场合——读 CPU 时间戳计数器，指令本身把 64 位结果拆进 edx:eax：

```c
/* rdtsc.c：C 语句表达不了的指令，是内联汇编最正当的用武之地 */
static inline unsigned long long rdtsc(void) {
    unsigned int lo, hi;
    __asm__ volatile ("rdtsc" : "=a"(lo), "=d"(hi));
    return ((unsigned long long)hi << 32) | lo;
}
```

**volatile 的必要性——空转实验**。扩展 asm 不写 volatile 时，编译器按 as-if 规则对待它：

```c
/* beat.c */
static inline unsigned long long tick(void) {
    unsigned int lo, hi;
    __asm__ ("rdtsc" : "=a"(lo), "=d"(hi));   /* 注意：没有 volatile */
    return ((unsigned long long)hi << 32) | lo;
}

int main(void) {
    tick();                     /* 结果没人用 */
    return 0;
}
```

```bash
gcc -O2 -S beat.c -o beat.s
grep -c rdtsc beat.s
```

```text
0
```

rdtsc 被整段删除：输出没人用、编译器又看不见副作用，as-if 规则下这段汇编「等于不存在」。补上 volatile（`__asm__ volatile`）后它会被保留，且不得与 volatile 访问相互重排——这与 [volatile 深水区](/c/270-VolatileKeyword) 的语义同源：volatile 汇编等于向编译器声明「我有效果，虽然你看不见」。规则要说精确：没有输出操作数的扩展 asm 本来就隐含 volatile，会踩空转陷阱的是「带输出、而输出被丢弃」的场合。

**"memory" clobber 一句**："memory" 告诉编译器这段汇编可能读写任意内存——前后所有缓存在寄存器里的变量必须落回内存，且不得与内存访问重排。它就是 270 篇引用过的编译器屏障 `asm volatile("" ::: "memory")` 的本体；至于 CPU 硬件层面的内存序，是另一层屏障，在 [原子操作与内存模型](/c/380-AtomicAndMemoryModel) 展开。

还有一支 asm goto，允许汇编代码直接跳到 C 标签（模板里用 %l 引用），Linux 内核的静态调用与部分锁快速路径靠它省掉一层寄存器交接；工程上遇到再查手册，本篇不展开。

## 6. 使用判断：什么时候值得写汇编

值得的三种场合：

1. **编译器够不着的指令**：rdtsc、cpuid、特定的缓存与屏障指令——它们没有 C 语句对应物。原子操作这一类已经由 C11 的 `_Atomic` 接管（见 380），SIMD 的对应物是编译器内建的 intrinsics 函数（如 `_mm256_add_epi32`），SIMD 教学属并行计算专题、本模块不展开；
2. **帧内魔法**：协程与用户态线程的「函数中途换栈」，本质是手改 rsp 后 jmp，C 语句表达不了；
3. **逐周期抠到底的关键路径**：极少见，且必须先用测量证明 C 版本不够快。

代价同样是三种：不可移植（换架构全部重写——ARM64 的参数寄存器是 x0-x7、返回 x0，AAPCS64 约定与 x86 完全是两套词汇；32 位 x86 则是参数全走栈、调用方清栈——多架构细节超出本主线，用到时以各架构 ABI 文档为准）、不可优化（编译器看不穿汇编内部，寄存器分配帮不上忙）、不可维护（读汇编的人永远比读 C 的少）。真实世界的用法印证这条直觉：Linux 内核与 glibc 只在架构相关的薄层里放汇编，业务层全是 C；OpenSSL 的各架构优化汇编由脚本生成而非人肉维护；MSVC 干脆在 x64 上移除了内联汇编、统一推 intrinsics——这些平台差异的收口都在 [跨平台编程](/c/410-CrossPlatformProgramming)。还有一条与构建工具的交界：.s 文件怎么进构建、CMake 怎么开汇编语言，属于 [构建系统](/c/470-BuildSystem) 的话题。

## 7. 常见错误与调试实录

### 事故一：clobber 遗漏，寄存器被踩出诡异错值

```c
/* bad_clobber.c */
int bad(void) {
    int keep = 7;                    /* -O2 下编译器可能把某个变量安在 ebx */
    __asm__ ("movl $99, %%ebx\n\t"
             "addl %%ebx, %0"
             : "+r"(keep)
             :                       /* clobber 段空着：没声明 ebx 被改 */
             );
    return keep;
}
```

模板把 ebx 写成 99，但 clobber 清单没有声明。编译器不知情：如果它恰好把 keep 自己（或别的变量）安排在 ebx，这些值就被 99 覆盖——典型症状是「某个不相干的变量悄悄变成 99」一类诡异错值，而且只在特定优化决策下出现，时有时无、极难复现。修复两选一：

```c
/* 修法一：如实声明 clobber */
int bad_fixed(void) {
    int keep = 7;
    __asm__ ("movl $99, %%ebx\n\t"
             "addl %%ebx, %0"
             : "+r"(keep)
             :
             : "ebx");                 /* 点名 ebx 被改，编译器自会绕开 */
    return keep;
}
```

```c
/* 修法二：临时寄存器交给编译器挑，从根上不手点具体寄存器 */
int good(int x) {
    int keep = x;
    int tmp;
    __asm__ ("movl $99, %1\n\t"
             "addl %1, %0"
             : "+r"(keep), "=&r"(tmp)); /* "=&r"：该输出不与输入共用寄存器 */
    return keep;
}
```

规则一句话：模板碰了操作数清单之外的任何寄存器，clobber 段都必须点名；拿不准就点名，误报的代价只是一次多余的保存恢复。

### 事故二：约束与操作数对不上，报错怎么读

两类典型报错。第一类：模板里写了 %2，操作数却只有两个——编译器不检查引用越界，未替换的 %2 会原样交给汇编器：

```text
five.s: Assembler messages:
five.s:8: Error: bad register name '%2'
```

读法：报错行号指向模板那几行，`bad register name` 后面的记号是没替换掉的 %N——回 C 里数操作数，输出段从前、输入段接排，多数是编号写串了或漏写了一段。第二类：约束自相矛盾或寄存器不够分，编译器直接拒绝：

```text
error: 'asm' operand has impossible constraints
```

常见于一条 asm 同时要求多个固定寄存器（连写几个 "a"），或输出加输入的硬性寄存器数超过可用额度。修法：把能放宽的约束改成 "r" 让编译器调度，或拆成多条小 asm。

### 事故三：把 32 位约定用错在 64 位

```asm
# 按 32 位老书的 cdecl 习惯：假设参数在栈上
bad_get:
    mov     4(%rsp), %eax    # 想取第 1 个参数——64 位下这里是返回地址！
    ret
```

64 位 System V 里第一个参数在 edi，栈上 `4(%rsp)` 处躺着的是 call 压入的返回地址——这段代码等于「拿参数当地址跳走」。症状：返回值永远是垃圾，或者一 ret 就崩在荒诞的地址上。修法：250 的传参表背熟；接手旧汇编先问一句「它是给哪个 ABI 写的」——32 位约定不止参数位置不同，连「谁负责清栈」都不同（cdecl 由调用方清栈，64 位寄存器传参后基本无栈要清）。

## 实际项目中的使用场景

- 驱动、内核与固件：访问平台专用指令、写上下文切换；550 的裸机世界与操作系统内核都在这条线上；
- 性能敏感库：加密、压缩与 SIMD 内核常用「汇编入口 + C/intrinsics 主体」的混合结构，用 nm 与 objdump 验收入口符号正是本篇的手艺；
- 调试与逆向：读懂 objdump 输出本身是日常——崩溃现场定位见 [动态调试与 GDB 实战](/c/495-DynamicDebuggingGDB)，平台间二进制差异见 [跨平台编程](/c/410-CrossPlatformProgramming)。

## 小练习

预测题（5 分钟）：把第 5 节 beat.c 的 `__asm__ ("rdtsc" ...)` 加上 volatile，再跑 `grep -c rdtsc beat.s`，输出几？先写答案再运行。

参考答案（先写再看）：1。volatile 让编译器放弃删除——哪怕结果依然没人用。对照实验里那个 0 与这里的 1，就是 as-if 优化与 volatile 声明的全部差别。

挑战题（30 分钟，不看提示先动手）：用扩展 asm 实现 `unsigned int bswap32(unsigned int x)`，把 32 位整数的字节序倒过来（0x12345678 变 0x78563412）。

提示（思路方向）：x86 有一条 bswap 指令；一个输入一个输出，想想能不能用一个读写约束同时管两头。

展开（关键点）：`__asm__ ("bswap %0" : "+r"(x)); return x;`——"+r" 表示进门前编译器把 x 装进寄存器、出门后再写回，一个操作数兼任输入与输出。验收清单：与 `__builtin_bswap32(x)` 的返回值一致；用 0x00000001、0x12345678、0xFFFFFFFF 三组值互测。

## 与之前和之后的知识的关系

- 往前：[函数调用栈帧](/c/250-FunctionCallStackFrame) 的传参表与帧图是本篇的两把钥匙；[多文件编译](/c/310-MultiFileCompilation) 的符号配对解释了 extern 加 .s 为什么能接上；[嵌入式 C 编程](/c/550-EmbeddedCProgramming) 的段与链接脚本给了 .text 的地址语境；
- 旁支：[volatile 深水区](/c/270-VolatileKeyword) 的 as-if 与 volatile 语义在本篇完成 volatile asm 这块拼图；原子操作的现代正解是 [原子操作与内存模型](/c/380-AtomicAndMemoryModel) 的 C11 `_Atomic`，手写 lock 前缀指令已成历史；
- 往后：[系统编程进阶](/c/570-CAdvancedSystemProgramming) 把镜头从指令拉回操作系统——加载器怎么把 .text 铺进内存、mmap 怎么把文件变成地址。

## 官方文档

- GCC 手册：扩展 asm（四段结构、约束修饰符、volatile 规则）：https://gcc.gnu.org/onlinedocs/gcc/Extended-Asm.html
- GCC 手册：基本 asm（隐含 volatile 与适用场合）：https://gcc.gnu.org/onlinedocs/gcc/Basic-Asm.html
- GCC 手册：asm 操作数约束总览：https://gcc.gnu.org/onlinedocs/gcc/Constraints.html
- x86-64 System V ABI（调用约定权威出处，现行版本由该仓库维护）：https://gitlab.com/x86-psABIs/x86-64ABI
- Writing portable ARM64 assembly（Darwin 平台 C 符号加下划线前缀的实例讨论）：https://ariadne.space

## 自我检查

- 能不看资料说出扩展 asm 四段各放什么，%0 与 %%eax 的区别；
- 能解释 Linux、macOS、Windows 三处符号名的差异，以及为什么跨平台汇编离不开预处理宏；
- 能预测「带输出但输出未用、无 volatile 的扩展 asm」在 -O2 下的命运，并说出 "memory" clobber 防住的是哪一层重排；
- 能对着一份按 32 位约定写的汇编，指出它在 64 位下会怎么坏。

## 本章总结

C 编译出来就是汇编：objdump 与 gcc -S 让编译器的产物可以逐行验收，-O0 与 -O2 的对照把寄存器分配从概念变成眼见为实。C 与汇编互调的全部秘密在 250 的约定表里——参数走 rdi/rsi、返回走 rax，caller 与 callee 寄存器各守各的账，call 之前 rsp 对齐 16 字节；名字由平台修饰，Linux 无前缀、macOS 加下划线。内联汇编分两档：基本 asm 一段字符串、隐含 volatile；扩展 asm 用输出、输入、clobber 三段把寄存器管理外包给编译器，%0 按输出在前的顺序编号。volatile 防删除，"memory" 防重排，两者都是对 as-if 规则的定向豁免。写汇编的正当理由只剩「编译器够不着的指令」与「帧内魔法」，其余场合 intrinsics 与纯 C 是更好的买卖。

## 下一步

进入 [系统编程进阶](/c/570-CAdvancedSystemProgramming)：汇编之上的指令又是谁来安置——加载器怎么把 .text 铺进地址空间、mmap 怎么把文件变成指针、进程怎么带着两个 UID 活着，一次看穿。
