---
order: 72
title: 静态分析与调试
module: c
category: C
difficulty: intermediate
description: 代码静态分析与调试技巧
author: fanquanpp
updated: '2026-06-14'
related:
  - c/国际化与本地化
  - c/构建系统
  - c/跨平台编程
  - c/嵌入式C编程
prerequisites:
  - c/概述
---

# 静态分析与调试 (Static Analysis and Debugging)

## 第 1 章 引言与学习路径

### 1.1 为什么静态分析与调试是 C 工程师的"第二语言"

C 语言以"信任程序员"为设计哲学,这赋予了开发者前所未有的控制力,也意味着编译器不会替你拦住绝大多数错误。一个忘记初始化的局部变量、一个越界访问的数组下标、一个悬空的指针——这些错误在 Java/Python 中往往会被运行时机制(垃圾回收、数组边界检查、空指针异常)自动捕获,而在 C 中则会以"看似正常 → 偶发崩溃 → 难以复现"的方式潜伏到生产环境。

统计数据印证了这一点:据 CVE Details 与 MITRE CWE Top 25 统计,C/C++ 程序中超过 70% 的高危漏洞属于内存安全问题(buffer overflow、use-after-free、double free、null pointer dereference 等)。Linux 内核、Chromium、OpenSSL 这些由顶级工程师维护的项目,每年依然会通过静态分析工具发现数百个潜在缺陷。

因此,**静态分析与动态调试是 C 工程师必备的"第二语言"**。它们不是"高级技巧",而是"基础生存技能":
- **静态分析**(Static Analysis):在不运行程序的情况下,通过分析源代码或二进制发现潜在问题
- **动态调试**(Dynamic Debugging):在程序运行时观察其行为,定位 bug 的根因

一个不会用 GDB 调试段错误、不会用 ASan 检测内存越界、不会用 cppcheck 扫描代码的 C 工程师,就像一个不会用 IDE 的 Java 工程师一样,工作效率会大大折扣。

### 1.2 静态分析与调试的核心挑战

#### 1.2.1 误报与漏报的平衡

静态分析工具面临一个根本性矛盾:
- **太宽松**:漏报(miss)多,真正的 bug 被淹没在噪音中
- **太严格**:误报(false positive)多,开发者不堪其扰,最终关闭工具

例如,以下代码:

```c
int *p = NULL;
if (cond) {
    p = &local_var;
}
*p = 42;  // 当 cond 为假时是空指针解引用
```

静态分析工具若不做路径敏感分析,会认为 `p` 一定非空,漏报;若做路径敏感分析,又会因路径爆炸导致分析无法终止。现代工具(如 Clang Static Analyzer、GCC -fanalyzer)采用符号执行(symbolic execution)与抽象解释(abstract interpretation)等技术,在精度与可扩展性之间寻找平衡。

#### 1.2.2 调试的可复现性

调试最大的痛苦是"无法复现的 bug"。例如:
- **Heisenbug**:加了 printf 或断点后 bug 消失(因为时序被改变)
- **平台相关 bug**:在开发机正常,在生产服务器崩溃(因为 glibc 版本、内核参数不同)
- **数据相关 bug**:仅在特定输入下触发(如超大文件、特殊字符)

应对这些挑战需要系统化的方法:控制变量、最小化复现用例、二分定位(bisect)、使用 sanitizer 替代 printf。

#### 1.2.3 优化对调试的干扰

编译器优化(`-O2`、`-O3`)会重排代码、内联函数、消除变量,导致调试信息与实际执行不匹配:

```c
int x = 42;
printf("%d\n", x);  // 在 -O2 下, x 可能被完全消除
```

调试时必须使用 `-O0 -g`,但这又掩盖了只在优化下才暴露的 bug(如未定义行为)。处理这类问题需要:
- 在 `-O0` 下复现并修复逻辑错误
- 在 `-O2` + UBSan/ASan 下复现并修复未定义行为
- 使用 `-Og`(GCC 专为调试设计的优化级别)在两者间平衡

### 1.3 本文档的目标读者

本文档面向以下读者:
- **C 进阶学习者**:已掌握基本语法,希望写出更可靠的代码
- **系统编程工程师**:开发服务端、嵌入式等需要高可靠性的程序
- **安全工程师**:需要理解漏洞原理以进行代码审计或漏洞分析
- **面试准备者**:调试与静态分析是高级 C 工程师面试的常见话题

### 1.4 学习路径建议

本文档采用 12 章递进式结构:

1. **第 1 章 引言**:建立对静态分析与调试的整体认识
2. **第 2 章 历史演进**:从 printf 调试到现代工具链
3. **第 3 章 核心概念**:静态 vs 动态、bug 分类、符号执行
4. **第 4 章 编译器警告**:GCC/Clang 警告选项详解
5. **第 5 章 静态分析工具**:cppcheck、clang-tidy、Clang Static Analyzer
6. **第 6 章 动态调试工具**:GDB、LLDB 详解
7. **第 7 章 Sanitizers**:ASan、MSan、UBSan、TSan
8. **第 8 章 Valgrind**:Memcheck、Helgrind、Callgrind
9. **第 9 章 实战调试模式**:段错误、内存泄漏、并发 bug 等
10. **第 10 章 常见陷阱**:优化相关、平台相关、工具局限
11. **第 11 章 高级主题**:core dump、Python 脚本、远程调试
12. **第 12 章 总结与最佳实践**:工业级项目的调试策略

### 1.5 阅读前的预备知识

在开始阅读本文档前,你应该:
- 掌握 C 基本语法、指针、内存管理
- 了解编译流程(预处理 → 编译 → 汇编 → 链接)
- 熟悉 Linux 基本命令(`gcc`、`make`、`gdb`)
- 理解进程地址空间布局(代码段、数据段、堆、栈)
- 能够在 Linux/Unix 环境下编译运行 C 程序

## 第 2 章 历史演进与设计哲学

### 2.1 早期调试:printf 与 core dump

1970 年代的 Unix 时代,调试工具非常简陋。程序员的主要手段是:
- **printf 调试法**:在代码中插入 `printf` 输出变量值
- **core dump 分析**:程序崩溃后,操作系统将内存映像写入 `core` 文件,使用 `adb` 或 `dbx` 分析

`printf` 调试法虽然原始,但有其独特优势:
- 不需要学习复杂工具
- 输出可以重定向到文件,适合长时间运行
- 适用于任何平台,包括嵌入式系统

其缺点同样明显:
- 修改代码后需要重新编译
- 输出可能改变时序(导致 Heisenbug)
- 难以观察复杂数据结构(如链表、树)

### 2.2 符号调试器的诞生:dbx 与 GDB

1980 年代,符号调试器(symbolic debugger)出现,允许程序员用源代码中的变量名、函数名、行号设置断点,而非使用内存地址。

**dbx**(1981 年,Berkeley):Unix 早期的符号调试器,语法影响深远:

```
(dbx) stop at main
(dbx) run
(dbx) print x
(dbx) next
```

**GDB**(1986 年,Richard Stallman):GNU 项目的调试器,功能远超 dbx,支持:
- 源码级调试(C/C++/Fortran/Go/Rust 等)
- 条件断点、观察点、捕获点
- 反汇编、寄存器查看
- 远程调试(gdbserver)
- Python/Guile 脚本扩展

GDB 至今仍是 Linux 下 C 调试的事实标准。

### 2.3 商业调试器:TotalView 与 LLDB

**TotalView**(1990s):面向高性能计算(HPC)的商业调试器,支持:
- 千万级并行进程调试(MPI、OpenMP)
- 内存泄漏检测(集成 Memcheck 功能)
- GPU 代码调试(CUDA)

**LLDB**(2009 年,LLVM 项目):作为 GDB 的现代替代品,优势在于:
- 与 Clang 共用解析器,对 C++ 模板、lambda 等新特性支持更好
- 性能更高(启动快、表达式求值快)
- Python 脚本原生支持,API 设计更现代
- macOS/Xcode 默认调试器

### 2.4 静态分析工具的演进

#### 2.4.1 Lint(1979 年,Stephen Johnson)

`lint` 是最早的 C 静态分析工具,随 Unix V7 发布。它能检测:
- 未使用的变量与函数
- 类型不一致(如 `int` 与 `long` 混用)
- 可能的可移植性问题

但 `lint` 的检查规则与编译器警告高度重叠,且误报多,逐渐被遗忘。直到 2000 年代,新一代工具(splint、cppcheck、clang-tidy)才重振静态分析。

#### 2.4.2 PC-lint(1985 年,Gimpel Software)

商业工具 PC-lint 是 Windows 平台 C/C++ 静态分析的事实标准,检查规则极其丰富(数千条),但价格昂贵且配置复杂。

#### 2.4.3 Coverity(2002 年)与 Klocwork(2003 年)

Coverity 采用基于摘要的过程间分析(interprocedural analysis),能检测跨函数的缺陷,误报率较低。被 Synopsys 收购后,成为企业级代码审计的主流工具。

#### 2.4.4 开源工具的崛起

- **cppcheck**(2007 年):开源、轻量,专注于真正的 bug 而非风格问题
- **Clang Static Analyzer**(2008 年):基于符号执行,精度高
- **clang-tidy**(2013 年):集成于 Clang,可自动修复,规则可扩展

### 2.5 动态分析工具的演进

#### 2.5.1 Purify(1990 年)与 BoundsChecker(1993 年)

Purify 通过二进制插桩(binary instrumentation)检测内存错误,是商业动态分析工具的鼻祖。其检查能力后来被开源的 Valgrind 与 ASan 超越。

#### 2.5.2 Valgrind(2000 年,Julian Seward)

Valgrind 通过二进制翻译(binary translation)在虚拟机中运行程序,无需重新编译即可检测:
- 内存泄漏与越界(Memcheck)
- 线程数据竞争(Helgrind、DRD)
- 函数调用性能分析(Callgrind)
- 缓存命中率分析(Cachegrind)

缺点是性能开销极大(10-50 倍慢),不适合生产环境。

#### 2.5.3 Sanitizers(2012 年,Google)

Google 团队推出的 Sanitizers 采用**编译时插桩**(compile-time instrumentation),在编译时插入检查代码,运行时开销远小于 Valgrind:
- **ASan**(AddressSanitizer):检测内存越界、use-after-free、double free,2 倍慢
- **MSan**(MemorySanitizer):检测未初始化内存读取,3 倍慢
- **UBSan**(UndefinedBehaviorSanitizer):检测未定义行为,1.1 倍慢
- **TSan**(ThreadSanitizer):检测线程数据竞争,5-15 倍慢

Sanitizers 已集成到 GCC 与 Clang 中,成为现代 C/C++ 开发的标配。

### 2.6 现代调试工具链的设计哲学

现代调试工具链体现了以下设计哲学:

#### 2.6.1 分层防御

不应依赖单一工具,而应构建多层防御:
1. **编译器警告**(`-Wall -Wextra`):第一道防线,成本最低
2. **静态分析**(cppcheck、clang-tidy):CI 流水线中运行
3. **Sanitizers**(ASan、UBSan):开发与测试环境运行
4. **动态调试**(GDB):定位具体 bug
5. **运行时监控**( Valgrind、core dump):生产环境事后分析

#### 2.6.2 自动化优先

手动调试耗时且易错,现代实践强调自动化:
- CI 中集成静态分析与 sanitizer 测试
- fuzzing(AFL、libFuzzer)自动发现崩溃
- 自动化测试覆盖率监控

#### 2.6.3 失败快速(fail fast)

Sanitizer 的设计哲学是"一旦发现错误立即崩溃",而非"尽量继续运行"。这样能:
- 防止错误传播掩盖根因
- 强制开发者修复而非忽略
- 在测试环境暴露问题而非生产环境

## 第 3 章 核心概念与术语体系

### 3.1 静态分析 vs 动态分析

| 维度       | 静态分析                     | 动态分析                       |
| ---------- | ---------------------------- | ------------------------------ |
| 运行时     | 不运行程序                   | 运行程序                       |
| 输入       | 源代码或二进制               | 可执行文件 + 测试输入          |
| 覆盖率     | 理论上覆盖所有路径           | 仅覆盖测试输入触发的路径       |
| 误报率     | 较高(无法判断运行时实际值) | 极低(基于真实执行)            |
| 漏报率     | 中等(受分析精度限制)        | 高(未执行的路径不会被检查)    |
| 性能开销   | 无运行时开销                 | 2-50 倍慢                      |
| 典型工具   | cppcheck、clang-tidy         | Valgrind、ASan、GDB            |
| 适用场景   | CI、代码审计                 | 测试、调试、生产监控           |

二者互补:静态分析能发现"潜在"问题,动态分析能确认"真实"问题。成熟的工程实践两者并用。

### 3.2 Bug 的分类体系

#### 3.2.1 内存安全 Bug

C 程序中最常见也最危险的类别:

| Bug 类型          | 英文                     | 示例                          |
| ----------------- | ------------------------ | ----------------------------- |
| 缓冲区溢出        | Buffer Overflow          | `arr[10]` 当 `arr` 只有 5 个元素 |
| 越界读            | Out-of-bounds Read       | `memcpy(dst, src, len)` 当 `len` 超过 `src` |
| 越界写            | Out-of-bounds Write      | 同上,但写方向                 |
| Use-After-Free    | UAF                      | `free(p); p->x = 1;`          |
| Double Free       | DF                       | `free(p); free(p);`           |
| 空指针解引用      | NULL Pointer Dereference | `*p = 1;` 当 `p == NULL`       |
| 未初始化读取      | Uninitialized Memory Read | `int x; if (x > 0) ...`       |
| 内存泄漏          | Memory Leak              | `p = malloc(...);` 但无 `free` |
| 栈缓冲区溢出      | Stack Buffer Overflow    | 局部数组越界覆盖返回地址       |
| 堆栈冲突          | Stack Clash              | 堆与栈边界破坏                |

#### 3.2.2 并发 Bug

| Bug 类型        | 说明                                       |
| --------------- | ------------------------------------------ |
| 数据竞争        | 多线程同时访问同一变量,至少一个为写         |
| 死锁            | 多个线程互相等待对方持有的锁                |
| 活锁            | 线程不断改变状态但无法推进                  |
| 原子性违反      | 应该原子的操作被打断                        |
| 顺序违反        | 操作顺序与预期不符                          |

#### 3.2.3 未定义行为(Undefined Behavior, UB)

C 标准规定了一类"未定义行为",编译器可以任意处理,包括:
- 有符号整数溢出
- 移位位数超过位宽
- 对同一表达式多次修改同一变量(`i = i++ + ++i`)
- 违反严格别名(strict aliasing)
- 访问已释放内存

UB 是 C 程序的"隐形杀手":在 `-O0` 下可能正常,在 `-O2` 下崩溃;在 GCC 下正常,在 Clang 下异常。UBSan 是检测 UB 的利器。

### 3.3 符号执行(Symbolic Execution)

符号执行是高级静态分析的核心技术,其思路是:用"符号变量"代替具体值,跟踪程序所有可能路径。

例如:

```c
int foo(int x) {
    int y = x * 2;
    if (y > 10) {
        return y - 1;
    } else {
        return y + 1;
    }
}
```

符号执行器会同时分析两条路径:
- 路径 1:`x > 5` → 返回 `2x - 1`
- 路径 2:`x <= 5` → 返回 `2x + 1`

若在某路径发现潜在的空指针解引用,则报告一个 bug。

符号执行的主要挑战是**路径爆炸**(path explosion):分支数量随代码深度指数增长。现代工具(如 KLEE、Clang Static Analyzer)采用:
- 路径合并(path merging)
- 状态缓存
- 超时与深度限制

来缓解路径爆炸问题。

### 3.4 抽象解释(Abstract Interpretation)

抽象解释是另一种静态分析技术,通过对变量取值进行"抽象"(如区间、符号、类型)而非精确跟踪:

- **区间抽象**:`x ∈ [0, 100]`
- **符号抽象**:`x > 0`
- **类型抽象**:`x 是非空指针`

抽象解释的优势是可扩展性好(无路径爆炸),劣势是精度较低(更多误报)。GCC 的 `-fanalyzer` 主要基于抽象解释。

### 3.5 二进制插桩 vs 源码插桩

动态分析工具按插桩方式分为两类:

#### 3.5.1 二进制插桩(Binary Instrumentation)

在已编译的二进制上插入检查代码,无需源码:
- **Valgrind**:运行时二进制翻译
- **Intel Pin**:动态插桩框架
- **DynamoRIO**:类似 Pin

优点:无需重新编译,可分析闭源程序
缺点:性能开销大,无法利用类型信息

#### 3.5.2 源码插桩(Source Instrumentation)

在编译时插入检查代码,需要源码:
- **ASan/MSan/UBSan/TSan**:编译器插桩
- **gcov**:覆盖率插桩

优点:性能开销小,精度高
缺点:需要重新编译,无法分析第三方闭源库

### 3.6 调试信息格式

调试信息让调试器能将机器码映射回源代码:
- **DWARF**:Linux/ELF 标准格式,GCC/Clang 默认
- **STAB**:SunOS 早期格式,已淘汰
- **PDB**(Program Database):Windows/MSVC 格式
- **CodeView**:Windows 早期格式

`-g` 选项生成调试信息,`-g3` 额外包含宏定义,`-gdwarf-4` 指定 DWARF 版本(默认 v4,v5 更紧凑)。

### 3.7 调用栈(Call Stack)与栈帧(Stack Frame)

调试时最频繁查看的信息是调用栈。每次函数调用会创建一个栈帧,包含:
- 函数参数
- 局部变量
- 返回地址
- 保存的寄存器

GDB 的 `backtrace` 命令显示调用栈:

```
(gdb) bt
#0  process_string (str=0x0) at segfault.c:8
#1  0x00401789 in main () at segfault.c:18
```

`#0` 是当前栈帧(崩溃点),`#1` 是调用者。使用 `frame N` 切换到第 N 层栈帧,使用 `info locals` 查看该帧的局部变量。

## 第 4 章 编译器警告:第一道防线

### 4.1 GCC/Clang 警告选项体系

编译器警告是成本最低的"静态分析",应在所有项目中启用。GCC 与 Clang 共享大部分警告选项。

#### 4.1.1 基础警告选项

| 选项         | 说明                              |
| ------------ | --------------------------------- |
| `-Wall`      | 启用常见警告(并非所有警告)      |
| `-Wextra`    | 启用 `-Wall` 未包含的额外警告     |
| `-Wpedantic` | 严格遵循 ISO C 标准,禁用扩展      |
| `-Werror`    | 将警告视为错误,阻止编译          |

推荐的"起步配置":

```bash
gcc -Wall -Wextra -Wpedantic -Werror -std=c17 program.c -o program
```

#### 4.1.2 重要警告选项详解

```bash
gcc -Wall -Wextra \
    -Wformat=2          \  # 检查 printf/scanf 格式串
    -Wconversion        \  # 隐式类型转换可能丢失数据
    -Wshadow            \  # 局部变量遮蔽外层变量
    -Wundef             \  # #if 中使用未定义宏
    -Wpointer-arith     \  # 指针运算警告
    -Wstrict-prototypes \  # 函数声明必须写参数类型
    -Wmissing-prototypes\  # 非静态函数必须有原型
    -Wredundant-decls   \  # 重复声明
    -Wnested-externs    \  # 嵌套 extern
    -Wold-style-definition \  # K&R 风格函数定义
    -Wmissing-include-dirs \  # 不存在的 include 目录
    -Wundef             \  # #if 中未定义宏
    -Wcast-align        \  # 强制转换导致对齐问题
    -Wwrite-strings     \  # 字符串字面量应为 const
    -Wswitch-enum       \  # switch 未覆盖枚举值
    -Wswitch-default    \  # switch 缺少 default
    -Wuninitialized     \  # 未初始化变量
    -Winit-self         \  # 变量用自身初始化 (如 int x = x;)
    -Wmissing-field-initializers \  # 结构体初始化不全
    -Wmissing-declarations  \  # 全局函数无声明
    -Wformat-nonliteral     \  # printf 格式串不是字面量
    -Wformat-security       \  # printf 安全问题
    -Wformat-y2k            \  # 日期格式 Y2K
    -Wnull-dereference      \  # 空指针解引用
    -Wdouble-promotion      \  # float 隐式转 double
    -Wframe-larger-than=4096 \ # 栈帧过大
    -Wlarger-than=8192      \  # 单个对象过大
    -Wstack-usage=4096      \  # 栈使用过大
    -Wvla                   \  # 使用变长数组 VLA
    -Walloca                \  # 使用 alloca
    -Warray-bounds=2        \  # 数组越界检查级别 2
    -Wimplicit-fallthrough=3 \ # switch case 穿透
    -Wshift-overflow=2      \  # 移位溢出
    -Wstringop-overflow=4   \  # 字符串操作溢出
    -Wtrampolines           \  # 嵌套函数跳板
    -Wfloat-equal           \  # 浮点数相等比较
    -Wlogical-op            \  # 逻辑运算符可疑
    -Waggregate-return      \  # 返回结构体
    -Wpadded                \  # 结构体填充
    -Wsync-nand             \  # __sync_nand 不安全
    -Wunsuffixed-float-constants \  # 浮点常量无后缀
    program.c -o program
```

#### 4.1.3 启用与禁用特定警告

```bash
# 启用某个警告
gcc -Wunused-variable program.c -o program

# 禁用某个警告(在 -Wall 后)
gcc -Wall -Wno-unused-parameter program.c -o program

# 将某个警告视为错误
gcc -Werror=format-security program.c -o program

# 将某个错误降级为警告
gcc -Wno-error=format program.c -o program
```

### 4.2 在代码中控制警告

#### 4.2.1 GCC/Clang pragma

```c
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunused-variable"

int unused_demo(void) {
    int x = 42;  // 警告被抑制
    return 0;
}

#pragma GCC diagnostic pop  // 恢复警告设置
```

#### 4.2.2 函数属性控制

```c
/* 标记函数的某些参数可能未使用 */
int callback(int event, void *data)
    __attribute__((unused));  // 整个函数标记为可能未使用

/* 标记参数未使用 */
int callback(int event, void *data) {
    (void)data;  // 常用技巧:转换为 void 抑制警告
    return event;
}
```

#### 4.2.3 MSVC 警告控制

```c
#pragma warning(push)
#pragma warning(disable: 4996)  // 禁用"不安全 CRT 函数"警告
FILE *f = fopen("file.txt", "r");
#pragma warning(pop)
```

### 4.3 警告选项的最佳实践

#### 4.3.1 渐进式启用

对于已有大型项目,一次性启用所有警告会产生数千个警告,难以处理。推荐渐进式策略:

1. **第一阶段**:启用 `-Wall -Wextra`,修复主要警告
2. **第二阶段**:启用 `-Wpedantic -Wconversion`,处理类型问题
3. **第三阶段**:启用 `-Werror`,将警告阻断 CI

#### 4.3.2 警告基线管理

对于无法立即修复的警告,使用基线文件管理:

```bash
# 生成当前警告基线
gcc -Wall -Wextra program.c 2> warnings.baseline

# CI 中对比新警告
gcc -Wall -Wextra program.c 2> warnings.new
diff warnings.baseline warnings.new
```

#### 4.3.3 区分开发与生产

```cmake
# CMakeLists.txt
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    add_compile_options(-Wall -Wextra -Wpedantic -Werror -g -O0)
elseif(CMAKE_BUILD_TYPE STREQUAL "Release")
    add_compile_options(-Wall -Wextra -O2)
    # 生产不强制 -Werror,避免阻塞发布
endif()
```

## 第 5 章 静态分析工具

### 5.1 cppcheck

cppcheck 是开源、轻量的 C/C++ 静态分析工具,设计目标:误报少,只报告真正的 bug。

#### 5.1.1 安装与基本用法

```bash
# Ubuntu/Debian
sudo apt install cppcheck

# macOS
brew install cppcheck

# Windows
choco install cppcheck

# 基本用法
cppcheck program.c

# 启用所有检查
cppcheck --enable=all --suppress=missingIncludeSystem program.c

# 检查整个项目
cppcheck --enable=all --inline-suppr src/

# 生成 XML 报告(可被 CI 工具解析)
cppcheck --enable=all --xml --xml-version=2 src/ 2> report.xml
```

#### 5.1.2 检查级别

```bash
# 默认:仅 error 级别
cppcheck program.c

# 启用 warning、style、performance、portability
cppcheck --enable=warning,style program.c

# 全部启用
cppcheck --enable=all program.c
```

#### 5.1.3 内联抑制

在代码中通过注释控制 cppcheck:

```c
void f(void) {
    int x;
    // cppcheck-suppress uninitvar
    printf("%d\n", x);  // 抑制"未初始化变量"警告
}
```

#### 5.1.4 cppcheck 能检测的典型问题

```c
#include <stdlib.h>
#include <string.h>

/* 1. 空指针解引用 */
void null_deref(int *p) {
    if (p == NULL) {
        *p = 42;  // cppcheck 报告: Null pointer dereference
    }
}

/* 2. 内存泄漏 */
void leak(void) {
    char *buf = malloc(100);
    /* 忘记 free, cppcheck 报告: Memory leak */
}

/* 3. 缓冲区溢出 */
void overflow(void) {
    char buf[10];
    strcpy(buf, "Hello, World!");  // cppcheck 报告: Buffer overflow
}

/* 4. 数组越界 */
void out_of_bounds(void) {
    int arr[5];
    for (int i = 0; i <= 5; i++) {  // cppcheck 报告: Array index out of bounds
        arr[i] = i;
    }
}

/* 5. 资源泄漏 */
void fd_leak(void) {
    FILE *f = fopen("file.txt", "r");
    if (!f) return;
    /* 忘记 fclose, cppcheck 报告: Resource leak */
}

/* 6. 重复代码 */
void duplicate_code(int x) {
    if (x > 0) {
        printf("positive\n");
    } else if (x > 0) {  // cppcheck 报告: duplicateCondition
        printf("positive again\n");
    }
}
```

### 5.2 clang-tidy

clang-tidy 是 Clang 项目下的 lint 工具,既能做静态分析,也能自动修复代码。

#### 5.2.1 基本用法

```bash
# 基本用法
clang-tidy program.c -- -std=c17

# 使用特定检查集
clang-tidy -checks='bugprone-*,modernize-*,performance-*,readability-*' program.c -- -std=c17

# 自动修复
clang-tidy -fix -checks='modernize-*,readability-*' program.c -- -std=c17

# 列出所有可用检查
clang-tidy -list-checks -checks='*'

# 使用 .clang-tidy 配置文件
clang-tidy program.c
```

#### 5.2.2 .clang-tidy 配置文件

在项目根目录创建 `.clang-tidy`:

```yaml
---
Checks: >
  -*,
  bugprone-*,
  cert-*,
  cppcoreguidelines-*,
  clang-analyzer-*,
  modernize-*,
  performance-*,
  readability-*,
  -bugprone-narrowing-conversions,
  -modernize-use-trailing-return-type,
  -readability-magic-numbers,
  -readability-identifier-name-length
WarningsAsErrors: ''
HeaderFilterRegex: '^(?!.*(third_party|build)).*$'
FormatStyle: file
CheckOptions:
  - key:   readability-identifier-naming.VariableCase
    value: lower_case
  - key:   readability-identifier-naming.FunctionCase
    value: lower_case
  - key:   readability-identifier-naming.ClassCase
    value: CamelCase
  - key:   readability-identifier-naming.EnumConstantCase
    value: UPPER_CASE
  - key:   cppcoreguidelines-avoid-magic-numbers.IgnoredIntegerValues
    value: '0;1;2;3;4;'
...
```

#### 5.2.3 常用检查集

| 检查集              | 说明                                    |
| ------------------- | --------------------------------------- |
| `bugprone-*`        | 容易引发 bug 的代码模式                  |
| `cert-*`            | CERT C/C++ 安全编码标准                  |
| `cppcoreguidelines-*` | C++ Core Guidelines (部分适用 C)        |
| `clang-analyzer-*`  | Clang Static Analyzer 检查              |
| `modernize-*`       | 现代化 C/C++ 代码                        |
| `performance-*`     | 性能相关建议                            |
| `readability-*`     | 代码可读性                              |
| `misc-*`            | 杂项                                    |
| `google-*`          | Google 编码风格                          |
| `llvm-*`            | LLVM 编码风格                            |

#### 5.2.4 clang-tidy 的自动修复能力

```bash
# 自动修复所有可修复的问题
clang-tidy -fix -checks='modernize-*,readability-braces-around-statements' \
    program.c -- -std=c17

# 仅显示建议的修复,不实际修改
clang-tidy -fix-errors -checks='modernize-*' program.c -- -std=c17
```

clang-tidy 可以自动完成的修复示例:
- `modernize-use-nullptr`:`NULL` → `nullptr`(C++)
- `modernize-use-override`:添加 `override` 关键字
- `readability-braces-around-statements`:为 `if`/`for`/`while` 添加大括号
- `readability-delete-null-pointer`:简化 `if (p) delete p` 为 `delete p`

### 5.3 Clang Static Analyzer

Clang Static Analyzer 是基于符号执行的高级静态分析器,精度高于 cppcheck。

#### 5.3.1 命令行使用

```bash
# 单文件分析
clang --analyze -Xanalyzer -analyzer-checker=core program.c

# 启用所有检查器
clang --analyze -Xanalyzer -analyzer-checker=alpha,alpha.security,alpha.unix program.c

# 生成 HTML 报告
scan-build -o reportDir clang program.c

# 查看可用检查器
clang -cc1 -analyzer-checker-help
```

#### 5.3.2 重要检查器

| 检查器                            | 说明                              |
| --------------------------------- | --------------------------------- |
| `core`                            | 核心检查(NULL 解引用、内存泄漏)  |
| `core.CallAndMessage`             | 调用错误(参数不匹配、空函数指针) |
| `core.DivideZero`                 | 除零                              |
| `core.NullDereference`            | 空指针解引用                      |
| `core.StackAddressEscape`         | 栈地址逃逸(返回局部变量地址)    |
| `core.uninitialized.ArraySubscript` | 未初始化数组下标                |
| `core.uninitialized.Assign`       | 未初始化赋值                      |
| `cplusplus.NewDelete`             | C++ new/delete 不匹配             |
| `deadcode.DeadStores`             | 死代码(赋值后未使用)             |
| `security.insecureAPI.*`          | 不安全 API(gets、strcpy)         |
| `unix.*`                          | Unix API 检查                     |
| `osx.*`                           | macOS API 检查                    |
| `alpha.*`                         | 实验性检查(可能高误报)          |

#### 5.3.3 scan-build 工作流

`scan-build` 是 Clang 提供的构建系统包装器,用于分析整个项目:

```bash
# 包装 make
scan-build make

# 包装 cmake
scan-build cmake --build build/

# 指定输出目录
scan-build -o /tmp/scan-results make

# 分析完成后,自动在浏览器中查看结果
scan-view /tmp/scan-results/2024-01-01-*/  # scan-build 会输出实际路径
```

scan-build 生成的 HTML 报告会显示每个 bug 的完整路径,例如:

```
路径:
1. 调用 malloc() 返回指针 p
2. 检查 p == NULL
3. 当 p == NULL 时,解引用 *p
   ↑ Bug: Null pointer dereference
```

### 5.4 GCC -fanalyzer

GCC 10 引入了 `-fanalyzer` 选项,提供基于抽象解释的静态分析。

#### 5.4.1 基本用法

```bash
# 启用静态分析
gcc -fanalyzer -O0 program.c -o program

# 启用更详细的分析
gcc -fanalyzer -fanalyzer-call-summaries -fdump-analyzer program.c -o program

# 指定检查的函数
gcc -fanalyzer -fanalyzer-function-attr=analyze program.c
```

#### 5.4.2 -fanalyzer 能检测的问题

- 双重释放(double-free)
- Use-after-free
- 内存泄漏
- 空指针解引用
- 使用未初始化值
- `taint` 检查(用户输入传播到敏感操作)

```c
#include <stdlib.h>

void double_free_demo(void) {
    int *p = malloc(sizeof(int));
    free(p);
    free(p);  // -fanalyzer 报告: double-free of 'p'
}

void use_after_free_demo(void) {
    char *s = strdup("hello");
    free(s);
    printf("%s\n", s);  // -fanalyzer 报告: use after free
}

void leak_demo(void) {
    char *buf = malloc(1024);
    if (some_condition()) {
        return;  // -fanalyzer 报告: memory leak
    }
    free(buf);
}
```

### 5.5 其他静态分析工具

#### 5.5.1 CppDepend

商业工具,专注于代码度量(圈复杂度、耦合度、内聚度),适合大型项目的架构分析。

#### 5.5.2 Polyspace

MathWorks 出品,基于抽象解释,能数学证明代码无运行时错误。被用于航空航天、汽车等安全关键领域。价格昂贵(年费数万美元)。

#### 5.5.3 CodeQL(GitHub)

GitHub 推出的语义化代码查询工具,使用类 SQL 语法查询代码:

```sql
-- 查找所有 strcpy 调用
import c

from CallExpr call
where call.getTarget().getName() = "strcpy"
select call, "Use of unsafe strcpy"
```

CodeQL 集成在 GitHub 代码扫描中,免费用于开源项目。

## 第 6 章 动态调试工具

### 6.1 GDB 详解

#### 6.1.1 启动 GDB

```bash
# 基本启动
gdb ./program

# 带参数启动
gdb --args ./program arg1 arg2

# 分析 core dump
gdb ./program core

# 附加到运行中的进程
gdb -p <pid>

# 远程调试
gdb ./program
(gdb) target remote 192.168.1.100:2345

# 启动时不显示启动信息
gdb -q ./program

# 执行 GDB 命令后退出
gdb -batch -ex "run" -ex "bt" ./program
```

#### 6.1.2 断点管理

```bash
# 函数断点
break main
break file.c:42
break MyClass::myMethod

# 条件断点
break file.c:42 if x > 100
break loop_function if i == 50

# 临时断点(触发一次后自动删除)
tbreak file.c:42

# 正则断点
rbreak ^test_.*

# 观察点(变量值变化时中断)
watch x
watch *0x7fff1234

# 读观察点
rwatch x

# 读写观察点
awatch x

# 捕获点(捕获特定事件)
catch throw           # C++ 异常抛出
catch catch           # C++ 异常捕获
catch fork            # fork 调用
catch syscall write   # 系统调用

# 查看断点
info breakpoints

# 删除断点
delete 1              # 删除 1 号断点
delete                # 删除所有断点
clear file.c:42       # 删除指定位置的断点

# 禁用/启用断点
disable 1
enable 1
enable once 1         # 启用一次后禁用
enable delete 1       # 触发后删除

# 设置断点命令(断点触发时执行的命令)
break file.c:42
commands
  print x
  print y
  continue
end
```

#### 6.1.3 执行控制

```bash
# 运行程序
run                  # 从头开始运行
run arg1 arg2        # 带参数运行

# 单步执行
next                 # 单步,不进入函数 (next)
step                 # 单步,进入函数 (step)
nexti                # 单步指令,不进入函数
stepi                # 单步指令,进入函数

# 继续执行
continue             # 继续到下一个断点
continue 5           # 跳过下 5 次断点

# 函数级执行
finish               # 运行到当前函数返回
return               # 立即从当前函数返回
return 42            # 立即返回,返回值为 42
until                # 运行到当前循环结束
until file.c:50      # 运行到指定行

# 跳转执行
jump file.c:50       # 跳到第 50 行(不改变栈)
call func(1, 2)      # 调用函数

# 信号处理
handle SIGINT stop   # 收到 SIGINT 时停止
handle SIGINT pass   # 将信号传递给程序
handle SIGINT nopass # 不传递信号给程序
handle SIGINT ignore # 忽略信号
```

#### 6.1.4 查看数据

```bash
# 打印变量
print x
print *ptr
print arr[0]@5       # 打印数组前 5 个元素
print arr@10         # 打印数组前 10 个元素
print *list@10       # 打印指针指向的 10 个元素

# 格式化输出
print/x x            # 十六进制
print/t x            # 二进制
print/c x            # 字符
print/f x            # 浮点
print/s str          # 字符串
print/a ptr          # 地址

# 表达式
print x + y
print strlen(s)
print sizeof(struct MyStruct)

# 自动显示(每次暂停时显示)
display x
display/x flags
info display
undisplay 1

# 内存查看
x/10xw 0x7fff1234    # 查看内存, 10 个 4 字节, 十六进制
x/10dw 0x7fff1234    # 10 个 4 字节, 十进制
x/10cw 0x7fff1234    # 10 个 4 字节, 字符
x/10gw 0x7fff1234    # 10 个 8 字节, 十六进制
x/s 0x7fff1234       # 字符串
x/i 0x401000         # 反汇编指令

# 寄存器
info registers
print $rsp
print $rip

# 局部变量
info locals
info args

# 调用栈
backtrace            # 完整调用栈
backtrace 5          # 最内 5 层
backtrace full       # 带局部变量
frame 2              # 切换到第 2 层
up
down
info frame           # 当前栈帧详情
info frame 2         # 第 2 层栈帧详情

# 查看类型
ptype struct MyStruct
ptype x
whatis x
info types           # 所有类型
info types MyStruct  # 匹配的类型

# 查看源码
list                 # 当前位置前后 10 行
list 50              # 第 50 行附近
list main            # main 函数附近
list file.c:50       # 指定文件第 50 行
list -               # 上一段源码
list +               # 下一段源码
info source          # 当前源文件信息
info line 50         # 第 50 行对应的地址
disas main           # 反汇编 main 函数
```

#### 6.1.5 修改变量值

```bash
# 设置变量值
set variable x = 10
set variable ptr = (int *)malloc(sizeof(int))
set variable arr[0] = 100

# 设置内存
set {int}0x7fff1234 = 42
set {char [10]}0x7fff1234 = "hello"

# 设置寄存器
set $rax = 0

# 便利变量(convenience variable)
set $count = 0
print $count++
```

#### 6.1.6 多线程调试

```bash
# 查看所有线程
info threads

# 输出示例:
#   Id   Target Id          Frame
# * 1    Thread 0x7f... "prog" main () at prog.c:10
#   2    Thread 0x7f... "prog" worker () at prog.c:50
#   3    Thread 0x7f... "prog" worker () at prog.c:50

# 切换线程
thread 2

# 在所有线程上设置断点
break file.c:42 thread all

# 仅在指定线程上设置断点
break file.c:42 thread 2

# 调度器锁定(其他线程暂停)
set scheduler-locking on     # 仅当前线程运行
set scheduler-locking off    # 所有线程运行(默认)
set scheduler-locking step   # 单步时锁定

# 线程名(便于识别)
set thread name "my-worker"

# 线程断点(每个线程独立计数)
set thread apply all break file.c:42
```

#### 6.1.7 多进程调试

```bash
# follow-fork-mode
set follow-fork-mode parent   # 跟踪父进程(默认)
set follow-fork-mode child    # 跟踪子进程

# detach-on-fork
set detach-on-fork on         # 分离未跟踪的进程(默认)
set detach-on-fork off        # 同时跟踪父子进程

# 查看所有被跟踪的进程
info inferiors

# 切换进程
inferior 2

# 在新进程上启动 GDB
catch fork
run
# 程序 fork 后, GDB 会暂停
```

#### 6.1.8 GDB 配置文件

`~/.gdbinit` 或 `.gdbinit`:

```
# 自动加载安全配置
set auto-load safe-path /

# 历史记录
set history save on
set history filename ~/.gdb_history
set history size 1000

# 显示设置
set print pretty on
set print object on
set print static-members on
set print vtbl on
set print demangle on
set print sevenbit-strings off
set print array on
set print elements 200

# 字符集
set charset UTF-8

# 提示符
set prompt (gdb) 

# 默认汇编风格
set disassembly-flavor intel

# 自定义命令
define print_string
  if $arg0 != 0
    printf "String: %s\n", $arg0
  else
    printf "NULL string\n"
  end
end

# 启动时打印信息
echo === GDB Loaded ===\n
```

### 6.2 LLDB 详解

LLDB 是 LLVM 项目的调试器,与 GDB 命令兼容但有差异。

#### 6.2.1 LLDB 与 GDB 命令对照

| 操作             | GDB                     | LLDB                            |
| ---------------- | ----------------------- | ------------------------------- |
| 启动             | `gdb ./prog`            | `lldb ./prog`                   |
| 运行             | `run`                   | `run` 或 `process launch`       |
| 单步             | `step` / `next`         | `step` / `next`                 |
| 继续             | `continue`              | `continue` 或 `c`               |
| 断点             | `break main`            | `b main` 或 `breakpoint set`    |
| 查看变量         | `print x`               | `p x` 或 `frame variable x`     |
| 调用栈           | `bt`                    | `bt` 或 `thread backtrace`      |
| 查看局部变量     | `info locals`           | `frame variable`                |
| 切换栈帧         | `frame 2`               | `frame select 2`                |
| 查看线程         | `info threads`          | `thread list`                   |
| 切换线程         | `thread 2`              | `thread select 2`               |
| 内存查看         | `x/10xw 0xaddr`         | `memory read --size 4 --count 10 --format x 0xaddr` |
| 反汇编           | `disas main`            | `disassemble --name main`       |

#### 6.2.2 LLDB 独有特性

```bash
# 表达式求值(更强大)
p print("hello")              # 调用函数
p *(int *)$rsp                # 访问寄存器指向的内存

# Python 脚本(原生支持)
script
>>> import lldb
>>> frame = lldb.debugger.GetSelectedTarget().GetProcess().GetSelectedThread().GetSelectedFrame()
>>> print(frame.GetVariables())
>>> exit()

# 变量观测(lldb 独有)
watchpoint set variable x     # 设置 watchpoint
watchpoint list
watchpoint delete 1

# 多线程并发查看
thread backtrace all          # 所有线程的调用栈
```

### 6.3 IDE 集成调试

#### 6.3.1 VS Code + cppvscode

VS Code 的 C/C++ 扩展支持 GDB/LLDB 调试,通过 `launch.json` 配置:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug with GDB",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/build/program",
      "args": ["arg1", "arg2"],
      "stopAtEntry": false,
      "cwd": "${workspaceFolder}",
      "environment": [],
      "externalConsole": false,
      "MIMode": "gdb",
      "miDebuggerPath": "/usr/bin/gdb",
      "setupCommands": [
        { "text": "-enable-pretty-printing", "ignoreFailures": true }
      ]
    },
    {
      "name": "Debug with ASan",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/build/program_asan",
      "args": [],
      "env": { "ASAN_OPTIONS": "detect_leaks=1:abort_on_error=0" },
      "MIMode": "gdb"
    }
  ]
}
```

## 第 7 章 Sanitizers 详解

### 7.1 AddressSanitizer (ASan)

ASan 是最常用的 sanitizer,检测内存越界与 use-after-free。

#### 7.1.1 编译选项

```bash
# GCC 与 Clang 都支持
gcc -fsanitize=address -g -O1 program.c -o program

# 推荐组合(开发环境)
gcc -fsanitize=address \
    -fno-omit-frame-pointer \
    -g -O1 \
    program.c -o program

# 检测内存泄漏(默认开启,可显式控制)
gcc -fsanitize=address -fsanitize=leak program.c -o program

# Clang 专属:检测栈使用后返回
clang -fsanitize=address -fsanitize-address-use-after-scope program.c -o program
```

#### 7.1.2 ASan 能检测的错误

| 错误类型              | 说明                              |
| --------------------- | --------------------------------- |
| Heap buffer overflow  | 堆缓冲区溢出                       |
| Stack buffer overflow | 栈缓冲区溢出                       |
| Global buffer overflow | 全局缓冲区溢出                    |
| Use after free        | 释放后使用                         |
| Use after return      | 函数返回后使用栈变量(需特殊编译) |
| Use after scope       | 离开作用域后使用(Clang)          |
| Double free           | 重复释放                           |
| Invalid free          | 释放非堆指针                       |
| Memory leaks          | 内存泄漏(集成 LeakSanitizer)    |

#### 7.1.3 ASan 错误报告解读

```c
#include <stdlib.h>

int main(void) {
    int *arr = malloc(5 * sizeof(int));
    arr[5] = 42;  // 堆缓冲区溢出
    free(arr);
    return 0;
}
```

ASan 输出:

```
=================================================================
==12345==ERROR: AddressSanitizer: heap-buffer-overflow on address 0x602000000014 at pc 0x4011c7 bp 0x7ffe9cff13d0 sp 0x7ffe9cff13c0
WRITE of size 4 at 0x602000000014 thread T0
    #0 0x4011c7 in main /path/program.c:4:5
    #1 0x7f1234568082 in __libc_start_main (/lib/x86_64-linux-gnu/libc.so.6:243)
    #2 0x40110d in _start (/path/program+0x40110d)

0x602000000014 is located 0 bytes to the right of 20-byte region [0x602000000000,0x602000000014)
allocated by thread T0 here:
    #0 0x40a26f in malloc (/usr/lib/x86_64-linux-gnu/libasan.so.5+0xe926f)
    #1 0x4011b8 in main /path/program.c:3:16
    #2 0x7f1234568082 in __libc_start_main (/lib/x86_64-linux-gnu/libc.so.6:243)

SUMMARY: AddressSanitizer: heap-buffer-overflow /path/program.c:4:5 in main
Shadow bytes around the buggy address:
  0x0c047fff7fb0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x0c047fff7fc0: 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
  0x602000000000: fa fa fa fa 00 00 00 00
                              ^
  0x0c047fff7fe0: fa fa fa fa fa fa fa fa
==12345==ABORTING
```

关键信息解读:
- **错误类型**: `heap-buffer-overflow`
- **访问地址**: `0x602000000014`
- **访问类型**: `WRITE of size 4`
- **栈帧**: `main` 函数第 4 行
- **分配信息**: 20 字节区域,在第 3 行分配
- **位置**: 在分配区域右侧 0 字节处(刚好越界)
- **Shadow bytes**: ASan 的"影子内存"可视化

#### 7.1.4 ASan 运行时选项

通过环境变量 `ASAN_OPTIONS` 配置:

```bash
# 默认行为:出错即 abort
ASAN_OPTIONS=abort_on_error=1 ./program

# 不立即退出,继续报告其他错误
ASAN_OPTIONS=halt_on_error=0:print_legend=0 ./program

# 检测 use-after-return(有性能开销)
ASAN_OPTIONS=detect_stack_use_after_return=1 ./program

# 检测容器越界(C++ std::vector)
ASAN_OPTIONS=detect_container_overflow=1 ./program

# 禁用内存泄漏检测
ASAN_OPTIONS=detect_leaks=0 ./program

# 输出到文件
ASAN_OPTIONS=log_path=asan.log ./program

# 启用调试日志
ASAN_OPTIONS=verbosity=1 ./program
```

### 7.2 MemorySanitizer (MSan)

MSan 检测**未初始化内存读取**,这是 ASan 不检测的类别。

#### 7.2.1 编译选项

```bash
# MSan 仅 Clang 支持
clang -fsanitize=memory -fno-omit-frame-pointer -g -O1 program.c -o program

# 必须用 Clang 重新编译所有依赖(包括标准库)
# 推荐使用 libc++ 而非 libstdc++
clang++ -fsanitize=memory -stdlib=libc++ program.cpp -o program
```

#### 7.2.2 MSan 检测示例

```c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = malloc(sizeof(int));
    if (*p > 0) {  // MSan 报告: 使用未初始化值
        printf("positive\n");
    }
    free(p);
    return 0;
}
```

MSan 输出:

```
==12345==WARNING: MemorySanitizer: use-of-uninitialized-value
    #0 0x4011c7 in main /path/program.c:5:9
    #1 0x7f1234568082 in __libc_start_main

  Uninitialized value was created by a heap allocation
    #0 0x40a26f in malloc
    #1 0x4011b8 in main /path/program.c:4:14
```

#### 7.2.3 MSan 的限制

- 仅 Clang 支持(GCC 无 MSan)
- 需要用 MSan 重新编译所有依赖(包括 libc)
- 不能与 ASan 同时使用(互斥)
- 性能开销:约 3 倍慢

### 7.3 UndefinedBehaviorSanitizer (UBSan)

UBSan 检测 C 标准定义的"未定义行为"。

#### 7.3.1 编译选项

```bash
# 启用所有 UB 检查
gcc -fsanitize=undefined -g program.c -o program

# 启用特定检查
gcc -fsanitize=signed-integer-overflow,shift,alignment program.c -o program

# 推荐组合
gcc -fsanitize=undefined \
    -fno-sanitize-recover=all \  # 出错立即终止
    -g -O1 \
    program.c -o program

# Clang 专属:整数溢出 traps
clang -fsanitize=integer program.c -o program
```

#### 7.3.2 UBSan 能检测的 UB

| 检查项                       | 说明                                  |
| ---------------------------- | ------------------------------------- |
| `alignment`                  | 未对齐的指针访问                       |
| `bool`                       | bool 值非 0/1                          |
| `builtin`                    | 内置函数参数错误                       |
| `bounds`                     | 数组越界(C 静态数组)                 |
| `enum`                       | enum 值超出范围                        |
| `float-cast-overflow`        | 浮点转整数溢出                         |
| `function`                   | 函数指针调用类型不匹配                 |
| `implicit-unsigned-integer-truncation` | 无符号整数截断              |
| `implicit-signed-integer-truncation`   | 有符号整数截断              |
| `implicit-integer-sign-change`        | 整数符号变化                 |
| `integer-divide-by-zero`     | 整数除零                              |
| `nonnull-attribute`          | 违反 nonnull 属性                      |
| `null`                       | 空指针解引用                          |
| `object-size`                | 对象大小检查                           |
| `pointer-overflow`           | 指针运算溢出                           |
| `return`                     | 非 void 函数未返回                    |
| `returns-nonnull-attribute`  | 违反 returns_nonnull 属性              |
| `shift`                      | 移位运算错误                           |
| `signed-integer-overflow`    | 有符号整数溢出                         |
| `unreachable`                | 执行到 __builtin_unreachable()        |
| `vla-bound`                  | VLA 长度非正                           |
| `vptr`                       | C++ 虚指针错误                         |

#### 7.3.3 UBSan 检测示例

```c
#include <stdio.h>
#include <limits.h>

int main(void) {
    int x = INT_MAX;
    int y = x + 1;  // 有符号整数溢出(UB)

    int arr[5] = {0};
    arr[10] = 42;   // 数组越界(UB)

    int shift = 32;
    int z = 1 << shift;  // 移位溢出(UB)

    int *p = NULL;
    *p = 42;        // 空指针解引用(UB)

    return 0;
}
```

UBSan 输出:

```
program.c:5:11: runtime error: signed integer overflow: 2147483647 + 1 cannot be represented in type 'int'
program.c:8:5: runtime error: index 10 out of bounds for type 'int [5]'
program.c:11:13: runtime error: shift exponent 32 is too large for 32-bit type 'int'
program.c:14:5: runtime error: load of null pointer of type 'int'
```

### 7.4 ThreadSanitizer (TSan)

TSan 检测线程数据竞争。

#### 7.4.1 编译选项

```bash
# GCC 与 Clang 都支持
gcc -fsanitize=thread -g -O1 program.c -o program -lpthread

# 必须用 -pie 与 -fPIC(位置无关代码)
gcc -fsanitize=thread -pie -fPIC -g -O1 program.c -o program -lpthread
```

#### 7.4.2 TSan 检测示例

```c
#include <stdio.h>
#include <pthread.h>

int shared_counter = 0;

void *increment(void *arg) {
    for (int i = 0; i < 1000000; i++) {
        shared_counter++;  // 数据竞争!
    }
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, increment, NULL);
    pthread_create(&t2, NULL, increment, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    printf("counter = %d\n", shared_counter);
    return 0;
}
```

TSan 输出:

```
==================
WARNING: ThreadSanitizer: data race
  Write of size 4 by thread T1:
    #0 increment /path/program.c:7:9
    #1 <null> <null>

  Previous write of size 4 by thread T2:
    #0 increment /path/program.c:7:9
    #1 <null> <null>

  Location is global 'shared_counter' of size 4 at 0x7f...program

  Thread T1 (tid=12346, running) created by main thread at:
    #0 pthread_create <null>
    #1 main /path/program.c:13:5

  Thread T2 (tid=12347, finished) created by main thread at:
    #0 pthread_create <null>
    #1 main /path/program.c:14:5
==================
```

#### 7.4.3 TSan 的限制

- 性能开销大:5-15 倍慢,内存增加 5-10 倍
- 不能与 ASan/MSan 同时使用
- 仅检测"真实"竞争,需要程序实际执行该路径
- 不能检测原子性违反(除非表现为数据竞争)

### 7.5 多个 Sanitizer 组合

不同 sanitizer 不能随意组合:

| 组合              | 是否支持 | 备注                          |
| ----------------- | -------- | ----------------------------- |
| ASan + UBSan      | 是       | 推荐组合,常用                 |
| ASan + MSan       | 否       | 互斥                          |
| ASan + TSan       | 否       | 互斥                          |
| MSan + UBSan      | 是       | 可组合                        |
| TSan + UBSan      | 是       | 可组合                        |
| ASan + LeakSan    | 是       | LeakSan 默认集成于 ASan       |

推荐的 CI 流水线配置:
- 构建 1:`-fsanitize=address,undefined`
- 构建 2:`-fsanitize=thread`(如有并发代码)
- 构建 3:`-fsanitize=memory`(如能用 Clang 全套编译)

## 第 8 章 Valgrind 详解

### 8.1 Valgrind 概述

Valgrind 是一个工具套件,核心是二进制翻译引擎,将程序的每条指令翻译为带检查的代码后执行。无需重新编译,但性能开销大。

### 8.2 Memcheck:内存检查

#### 8.2.1 基本用法

```bash
# 编译(必须 -g, 推荐 -O0)
gcc -g -O0 program.c -o program

# 运行 Memcheck
valgrind --leak-check=full ./program

# 详细选项
valgrind \
    --leak-check=full \           # 完整内存泄漏检查
    --show-leak-kinds=all \       # 显示所有泄漏类型
    --track-origins=yes \         # 追踪未初始化值来源
    --trace-children=yes \        # 跟踪子进程
    --error-exitcode=1 \          # 发现错误时退出码
    --log-file=valgrind.log \     # 日志文件
    ./program arg1 arg2
```

#### 8.2.2 Memcheck 能检测的错误

```c
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

int main(void) {
    /* 1. 内存泄漏 */
    int *leak = malloc(100 * sizeof(int));

    /* 2. 未初始化读取 */
    int *uninit = malloc(sizeof(int));
    if (*uninit > 0) {  // Memcheck: Conditional jump depends on uninitialised value
        printf("positive\n");
    }

    /* 3. 越界访问 */
    char *buf = malloc(10);
    strcpy(buf, "Hello, World!");  // Memcheck: Invalid write of size 1

    /* 4. 释放后使用 */
    free(uninit);
    printf("%d\n", *uninit);  // Memcheck: Invalid read of size 4

    /* 5. 双重释放 */
    free(uninit);  // Memcheck: Invalid free()

    /* 6. 系统调用参数错误 */
    int *bad_ptr = (int *)0x12345678;
    write(1, bad_ptr, 4);  // Memcheck: Syscall param write(buf) points to unaddressable byte(s)

    return 0;
}
```

#### 8.2.3 Memcheck 报告解读

```
==12345== Memcheck, a memory error detector
==12345== Copyright (C) 2002-2017, and GNU GPL'd, by Julian Seward et al.
==12345== Using Valgrind-3.15.0 and LibVEX; rerun with -h for copyright info
==12345== Command: ./program
==12345== 
==12345== Invalid write of size 1
==12345==    at 0x483CD89: strcpy (vg_replace_strmem.c:510)
==12345==    by 0x4011A0: main (program.c:14)
==12345==  Address 0x4a57058 is 0 bytes after a block of size 10 alloc'd
==12345==    at 0x483777F: malloc (vg_replace_malloc.c:299)
==12345==    by 0x401185: main (program.c:13)
==12345== 
==12345== Invalid read of size 4
==12345==    at 0x4011C2: main (program.c:18)
==12345==  Address 0x4a57040 is 4 bytes inside a block of size 4 free'd
==12345==    at 0x48389AB: free (vg_replace_malloc.c:530)
==12345==    by 0x4011B8: main (program.c:17)
==12345== 
==12345== HEAP SUMMARY:
==12345==     in use at exit: 400 bytes in 1 blocks
==12345==   total heap usage: 3 allocs, 3 frees, 432 bytes allocated
==12345== 
==12345== 400 bytes in 1 blocks are definitely lost in loss record 1 of 1
==12345==    at 0x483777F: malloc (vg_replace_malloc.c:299)
==12345==    by 0x401168: main (program.c:9)
==12345== 
==12345== LEAK SUMMARY:
==12345==    definitely lost: 400 bytes in 1 blocks
==12345==    indirectly lost: 0 bytes in 0 blocks
==12345==      possibly lost: 0 bytes in 0 blocks
==12345==    still reachable: 0 bytes in 0 blocks
==12345==         suppressed: 0 bytes in 0 blocks
==12345== 
==12345== For lists of detected and suppressed errors, rerun with: -s
==12345== ERROR SUMMARY: 3 errors from 3 contexts
```

关键部分:
- **Invalid write/read**:内存访问错误
- **Address 0x... is N bytes after/before/in/inside**:错误地址与分配块的关系
- **HEAP SUMMARY**:堆使用总结
- **LEAK SUMMARY**:泄漏总结
  - `definitely lost`:肯定泄漏(最严重)
  - `indirectly lost`:间接泄漏(被泄漏对象引用)
  - `possibly lost`:可能泄漏(指针被修改)
  - `still reachable`:仍可达(程序退出时未释放,但仍有指针指向)

### 8.3 Helgrind:线程错误检测

```bash
valgrind --tool=helgrind ./program
```

Helgrind 检测:
- 数据竞争
- 锁顺序错误(可能导致死锁)
- POSIX 线程 API 误用

### 8.4 DRD:另一线程检测工具

```bash
valgrind --tool=drd ./program
```

DRD 与 Helgrind 类似,但实现机制不同,误报率与性能特征不同。某些场景下 DRD 比 Helgrind 更快。

### 8.5 Callgrind:性能分析

```bash
# 运行 Callgrind
valgrind --tool=callgrind ./program

# 输出 callgrind.out.<pid> 文件
# 使用 kcachegrind 或 qcachegrind 可视化
kcachegrind callgrind.out.12345
```

Callgrind 记录每个函数的调用次数与指令数,适合定位性能瓶颈。

### 8.6 Cachegrind:缓存分析

```bash
valgrind --tool=cachegrind ./program
```

Cachegrind 模拟 CPU 缓存(L1、L2、LL),报告缓存命中率,帮助优化缓存友好性。

### 8.7 Valgrind 与 ASan 对比

| 特性         | Valgrind           | ASan                |
| ------------ | ------------------- | ------------------- |
| 是否需重新编译 | 否                  | 是                  |
| 性能开销     | 10-50 倍慢          | 2 倍慢              |
| 内存开销     | 大                  | 中                  |
| 检测精度     | 高                  | 高                  |
| 检测范围     | 内存、线程、缓存   | 仅内存              |
| 适用环境     | 测试环境            | 测试 + 部分生产环境 |
| 支持语言     | C/C++/Fortran/Pascal | C/C++/Rust/Go      |
| 平台支持     | Linux、macOS        | Linux、macOS、Android |

实践建议:开发与 CI 用 ASan(快),复杂问题或第三方库用 Valgrind(全)。

## 第 9 章 实战调试模式

### 9.1 模式一:调试段错误

#### 9.1.1 经典段错误场景

```c
#include <stdio.h>
#include <string.h>

void process_string(const char *str) {
    /* 忘记检查 NULL */
    size_t len = strlen(str);  /* 若 str 为 NULL, 段错误 */
    printf("Length: %zu\n", len);
}

int main(void) {
    const char *names[] = {"Alice", "Bob", NULL, "Charlie"};

    for (int i = 0; i < 4; i++) {
        process_string(names[i]);  /* i=2 时段错误 */
    }

    return 0;
}
```

#### 9.1.2 GDB 调试流程

```bash
# 编译时加调试信息
gcc -g -O0 segfault.c -o segfault

# 启动 GDB
gdb ./segfault

# 运行程序
(gdb) run

# 程序崩溃后, 查看调用栈
(gdb) bt
#0  __strlen_avx2 () at ../sysdeps/x86_64/multiarch/strlen-avx2.S:95
#1  0x00007f1234567890 in __strlen_sse2 () at ../sysdeps/x86_64/multiarch/../strlen.S:32
#2  0x0000555555555167 in process_string (str=0x0) at segfault.c:5
#3  0x00005555555551a8 in main () at segfault.c:12

# 切换到崩溃的栈帧
(gdb) frame 2
#2  0x0000555555555167 in process_string (str=0x0) at segfault.c:5
#5           size_t len = strlen(str);

# 查看变量
(gdb) print str
$1 = 0x0
(gdb) print i
$2 = 2

# 确认是空指针, 修复: 添加 NULL 检查
```

#### 9.1.3 用 ASan 调试

```bash
gcc -fsanitize=address -g segfault.c -o segfault_asan
./segfault_asan

# ASan 报告:
# ERROR: AddressSanitizer: SEGV on unknown address 0x000000000000
# The signal is caused by a READ memory access.
#     #0 0x7f... in __strlen_avx2
#     #1 0x401168 in process_string segfault.c:5
#     #2 0x4011a8 in main segfault.c:12
```

ASan 直接显示崩溃点的栈,无需 GDB 交互。

### 9.2 模式二:定位内存泄漏

#### 9.2.1 泄漏示例

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

Node *create_list(int n) {
    Node *head = NULL;
    for (int i = 0; i < n; i++) {
        Node *node = malloc(sizeof(Node));
        if (!node) return NULL;
        node->value = i;
        node->next = head;
        head = node;
    }
    return head;
}

void process_list(Node *head) {
    Node *curr = head;
    while (curr) {
        printf("%d ", curr->value);
        curr = curr->next;
    }
    printf("\n");
    /* 忘记 free */
}

int main(void) {
    Node *list = create_list(5);
    process_list(list);
    /* 应该 free_list(list); */
    return 0;
}
```

#### 9.2.2 用 Valgrind 定位

```bash
valgrind --leak-check=full --show-leak-kinds=all ./leak

# Valgrind 报告:
# ==12345== 80 (40 direct, 40 indirect) bytes in 1 blocks are definitely lost
# ==12345==    at 0x483777F: malloc (vg_replace_malloc.c:299)
# ==12345==    by 0x401177: create_list (leak.c:11)
# ==12345==    by 0x4011c2: main (leak.c:25)
```

#### 9.2.3 用 ASan 定位

```bash
gcc -fsanitize=address -g leak.c -o leak_asan
ASAN_OPTIONS=detect_leaks=1 ./leak_asan

# ASan 报告:
# Direct leak of 40 byte(s) in 1 object(s) allocated from:
#     #0 0x40a26f in malloc
#     #1 0x401177 in create_list leak.c:11
#     #2 0x4011c2 in main leak.c:25
# Indirect leak of 40 byte(s) in 1 object(s) allocated from:
#     #0 0x40a26f in malloc
#     #1 0x401177 in create_list leak.c:11
#     #2 0x4011c2 in main leak.c:25
```

### 9.3 模式三:检测数据竞争

```c
#include <stdio.h>
#include <pthread.h>

int counter = 0;

void *worker(void *arg) {
    for (int i = 0; i < 1000000; i++) {
        counter++;  /* 数据竞争 */
    }
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, worker, NULL);
    pthread_create(&t2, NULL, worker, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    printf("counter = %d\n", counter);
    return 0;
}
```

```bash
# TSan 检测
gcc -fsanitize=thread -g race.c -o race_tsan -lpthread
./race_tsan

# Helgrind 检测
gcc -g race.c -o race
valgrind --tool=helgrind ./race
```

### 9.4 模式四:调试未定义行为

```c
#include <stdio.h>
#include <limits.h>

int main(void) {
    int x = INT_MAX;
    int y = x + 1;  /* 有符号整数溢出: UB */
    printf("y = %d\n", y);

    int arr[5] = {0};
    for (int i = 0; i <= 5; i++) {  /* i=5 时越界 */
        arr[i] = i;
    }

    int shift = 1 << 31;  /* 1 << 31 在 int 上是 UB */
    printf("shift = %d\n", shift);

    return 0;
}
```

```bash
# UBSan 检测
gcc -fsanitize=undefined -g ub.c -o ub_ubsan
./ub_ubsan

# UBSan 报告:
# ub.c:5:11: runtime error: signed integer overflow: 2147483647 + 1 cannot be represented in type 'int'
# ub.c:9:9: runtime error: index 5 out of bounds for type 'int [5]'
# ub.c:13:15: runtime error: shift exponent 31 is too large for 32-bit type 'int'
```

### 9.5 模式五:调试死锁

```c
#include <pthread.h>
#include <stdio.h>

pthread_mutex_t mutex1 = PTHREAD_MUTEX_INITIALIZER;
pthread_mutex_t mutex2 = PTHREAD_MUTEX_INITIALIZER;

void *worker1(void *arg) {
    pthread_mutex_lock(&mutex1);
    printf("worker1 locked mutex1\n");
    /* 模拟工作 */
    for (volatile int i = 0; i < 1000000; i++);
    pthread_mutex_lock(&mutex2);  /* 等待 mutex2 */
    printf("worker1 locked mutex2\n");
    pthread_mutex_unlock(&mutex2);
    pthread_mutex_unlock(&mutex1);
    return NULL;
}

void *worker2(void *arg) {
    pthread_mutex_lock(&mutex2);
    printf("worker2 locked mutex2\n");
    for (volatile int i = 0; i < 1000000; i++);
    pthread_mutex_lock(&mutex1);  /* 等待 mutex1, 死锁 */
    printf("worker2 locked mutex1\n");
    pthread_mutex_unlock(&mutex1);
    pthread_mutex_unlock(&mutex2);
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, worker1, NULL);
    pthread_create(&t2, NULL, worker2, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    return 0;
}
```

```bash
# GDB 调试死锁
gcc -g deadlock.c -o deadlock -lpthread
gdb ./deadlock
(gdb) run
# 程序卡住时按 Ctrl+C
Thread 1 "deadlock" received signal SIGINT, Interrupt.
[Switching to Thread 0x7f...]
0x00007f... in futex_wait_cancelable () from /lib/.../libpthread.so.0

(gdb) info threads
  Id   Target Id          Frame
* 1    Thread 0x7f... "deadlock" futex_wait_cancelable ()
  2    Thread 0x7f... "deadlock" futex_wait_cancelable ()
  3    Thread 0x7f... "deadlock" futex_wait_cancelable ()

(gdb) thread apply all bt
# 查看 3 个线程都在 futex_wait, 表明死锁

# Helgrind 检测
valgrind --tool=helgrind ./deadlock
```

### 9.6 模式六:用 printf 与日志调试

虽然 printf 调试法原始,但在某些场景依然有效:
- 嵌入式环境无 GDB
- 时序敏感(无法暂停)
- 长时间运行(只能事后分析日志)

```c
#include <stdio.h>
#include <stdarg.h>
#include <time.h>

typedef enum {
    LOG_TRACE,
    LOG_DEBUG,
    LOG_INFO,
    LOG_WARN,
    LOG_ERROR
} LogLevel;

static LogLevel g_log_level = LOG_TRACE;
static FILE *g_log_file = NULL;

static const char *level_names[] = {
    "TRACE", "DEBUG", "INFO", "WARN", "ERROR"
};

void log_init(const char *filename) {
    g_log_file = fopen(filename, "a");
}

void log_write(LogLevel level, const char *file, int line,
               const char *fmt, ...) {
    if (level < g_log_level) return;

    time_t now = time(NULL);
    struct tm *t = localtime(&now);
    char time_buf[20];
    strftime(time_buf, sizeof(time_buf), "%Y-%m-%d %H:%M:%S", t);

    FILE *out = g_log_file ? g_log_file : stderr;
    fprintf(out, "[%s] [%s] %s:%d: ",
            time_buf, level_names[level], file, line);

    va_list ap;
    va_start(ap, fmt);
    vfprintf(out, fmt, ap);
    va_end(ap);

    fprintf(out, "\n");
    fflush(out);
}

#define LOG(level, fmt, ...) log_write(level, __FILE__, __LINE__, fmt, ##__VA_ARGS__)
#define TRACE(fmt, ...) LOG(LOG_TRACE, fmt, ##__VA_ARGS__)
#define DEBUG(fmt, ...) LOG(LOG_DEBUG, fmt, ##__VA_ARGS__)
#define INFO(fmt, ...)  LOG(LOG_INFO, fmt, ##__VA_ARGS__)
#define WARN(fmt, ...)  LOG(LOG_WARN, fmt, ##__VA_ARGS__)
#define ERROR(fmt, ...) LOG(LOG_ERROR, fmt, ##__VA_ARGS__)

int main(void) {
    log_init("app.log");
    TRACE("程序启动");
    DEBUG("变量 x = %d", 42);
    INFO("处理文件: %s", "data.txt");
    WARN("磁盘空间不足: %d%%", 90);
    ERROR("无法打开文件: %s", "config.txt");
    return 0;
}
```

## 第 10 章 常见陷阱

### 10.1 优化相关陷阱

#### 10.1.1 -O0 与 -O2 行为不一致

```c
#include <stdio.h>

int main(void) {
    int x = 0;
    /* 未定义行为: 多次修改 */
    x = x++ + ++x;
    printf("x = %d\n", x);
    return 0;
}
```

`-O0` 下可能输出 2,`-O2` 下可能输出 3。UBSan 能检测。

#### 10.1.2 严格别名违规

```c
int x = 0x3F800000;  /* 1.0f 的位模式 */
float *fp = (float *)&x;  /* 严格别名违规 */
printf("%f\n", *fp);
```

GCC `-O2` 可能"优化"掉这个访问。用 `memcpy` 替代:

```c
float f;
memcpy(&f, &x, sizeof(f));
```

#### 10.1.3 调试信息与优化不匹配

```c
int x = 42;
/* -O2 下 x 可能被消除 */
printf("%d\n", x);
```

GDB 中 `print x` 可能报 `<optimized out>`。解决:
- 调试用 `-O0` 或 `-Og`
- 关键变量用 `volatile` 防止优化

### 10.2 平台相关陷阱

#### 10.2.1 字节序问题

```c
uint32_t value = 0x12345678;
char *bytes = (char *)&value;
/* 小端: bytes[0] = 0x78 */
/* 大端: bytes[0] = 0x12 */
```

调试时需注意当前平台的字节序。网络编程必须用 `htonl`/`ntohl`。

#### 10.2.2 指针大小

```c
/* 32 位平台: 4 字节 */
/* 64 位平台: 8 字节 */
int *p;
printf("sizeof(p) = %zu\n", sizeof(p));
```

`int` 与 `int *` 大小不同,不能混用(常见于 printf 格式串)。

#### 10.2.3 对齐要求

```c
char buf[8];
int *p = (int *)(buf + 1);  /* 未对齐! */
*p = 42;  /* x86 上慢, ARM 上崩溃 */
```

用 `memcpy` 处理未对齐访问:

```c
char buf[8];
int value;
memcpy(&value, buf + 1, sizeof(int));
```

### 10.3 工具局限陷阱

#### 10.3.1 Sanitizer 检测不到栈外越界

```c
int arr[5];
arr[10] = 42;  /* 越栈帧, 可能不崩溃, ASan 可能不报 */
```

ASan 通过"红区"(redzone)检测,但远距离越界可能跳过红区。

#### 10.3.2 Valgrind 不能检测已优化代码

```c
/* -O2 下, 编译器可能消除未初始化读取 */
int *p = malloc(sizeof(int));
if (*p > 0) { ... }
```

`-O2` 下 `*p` 可能被预测为某常量,Valgrind 看不到读取。必须用 `-O0`。

#### 10.3.3 静态分析的误报

```c
void f(int *p) {
    if (p) {
        *p = 42;
    }
    /* cppcheck 可能报告: p 可能为 NULL */
}
```

某些工具路径分析精度不足,产生误报。需结合人工判断或用抑制注释。

## 第 11 章 高级主题

### 11.1 Core Dump 分析

#### 11.1.1 启用 core dump

```bash
# 临时启用(当前 shell)
ulimit -c unlimited

# 永久启用
echo "* soft core unlimited" >> /etc/security/limits.conf
echo "* hard core unlimited" >> /etc/security/limits.conf

# 设置 core 文件路径与命名
echo "/var/core/core.%e.%p.%t" > /proc/sys/kernel/core_pattern

# 测试
gcc -g crash.c -o crash
./crash  # 崩溃后生成 core 文件

# 分析
gdb ./crash core
(gdb) bt
```

#### 11.1.2 core_pattern 格式

```
%%  - 字符 %
%p  - PID
%u  - UID
%g  - GID
%s  - 触发 core dump 的信号
%t  - 时间戳
%h  - 主机名
%e  - 可执行文件名
%E  - 可执行文件路径
%c  - core 文件大小限制
```

### 11.2 GDB Python 脚本

```python
# print_linked_list.py - GDB 自定义命令
import gdb

class PrintLinkedList(gdb.Command):
    """打印链表: print_linked_list <head_pointer>"""

    def __init__(self):
        super(PrintLinkedList, self).__init__("print_linked_list",
                                              gdb.COMMAND_USER)

    def invoke(self, arg, from_tty):
        node = gdb.parse_and_eval(arg)
        idx = 0
        while node != 0:
            value = node['value']
            next_ptr = node['next']
            gdb.write(f"[{idx}] value={int(value)}, addr={str(node)}\n")
            node = next_ptr
            idx += 1
            if idx > 1000:
                gdb.write("... (stopped at 1000 nodes)\n")
                break

PrintLinkedList()
```

使用:

```bash
gdb -x print_linked_list.py ./program
(gdb) print_linked_list head
[0] value=42, addr=0x5555555592a0
[1] value=17, addr=0x5555555592c0
...
```

### 11.3 远程调试

```bash
# 目标机器运行 gdbserver
gdbserver :2345 ./program

# 或附加到已有进程
gdbserver --attach :2345 <pid>

# 主机连接
gdb ./program
(gdb) target remote 192.168.1.100:2345
(gdb) continue
```

适用于嵌入式设备、Docker 容器、远程服务器调试。

### 11.4 条件断点优化

普通条件断点在每次命中时都暂停程序判断条件,性能极差:

```bash
# 慢: 每次循环都暂停判断
break loop.c:10 if i == 1000000
```

优化:用断点命令在达到条件后才中断

```bash
# 快: 仅在 i 接近目标时暂停
break loop.c:10
commands
  silent
  if i >= 999990
    printf "i = %d\n", i
  end
  if i == 1000000
    printf "Reached!\n"
    delete 1  # 删除断点,避免再触发
  else
    continue
  end
end
```

### 11.5 反向调试(Reverse Debugging)

GDB 7.0+ 支持反向执行:

```bash
# 启用反向调试记录
(gdb) record

# 运行到崩溃
(gdb) continue

# 反向单步
(gdb) reverse-step
(gdb) reverse-next

# 反向继续
(gdb) reverse-continue

# 反向到函数入口
(gdb) reverse-finish
```

适用于"程序崩溃后,想看崩溃前的状态"的场景。注意:性能开销大,且不支持所有架构。

## 第 12 章 总结与最佳实践

### 12.1 工业级项目的调试策略

#### 12.1.1 分层防御体系

一个成熟的 C 项目应建立 5 层防御:

1. **编译器警告**:`-Wall -Wextra -Wpedantic -Werror`,所有警告必须修复
2. **静态分析**:CI 中运行 cppcheck、clang-tidy、GCC -fanalyzer
3. **Sanitizer 测试**:CI 中运行 ASan + UBSan 测试套件
4. **代码审查**:人工审查 + CodeQL 自动扫描
5. **运行时监控**:生产环境 core dump + 错误上报

#### 12.1.2 CI 流水线配置示例

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  build-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        sanitizer: [none, asan, ubsan, tsan, msan]
        compiler: [gcc, clang]
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: |
          sudo apt update
          sudo apt install -y cppcheck clang-tidy valgrind
      - name: Configure
        run: |
          mkdir build && cd build
          if [ "${{ matrix.sanitizer }}" = "asan" ]; then
            cmake -DCMAKE_C_FLAGS="-fsanitize=address,undefined -g" ..
          elif ...
      - name: Static analysis
        run: |
          cppcheck --enable=all --error-exitcode=1 src/
          run-clang-tidy -checks='*' src/
      - name: Build
        run: cmake --build build
      - name: Test
        run: cd build && ctest --output-on-failure
```

### 12.2 工具选择决策表

| 场景                     | 推荐工具                              |
| ------------------------ | ------------------------------------- |
| 编写新代码               | 编译器警告 + clang-tidy               |
| CI 自动检查              | cppcheck + clang-tidy + GCC -fanalyzer |
| 内存越界/UAF             | ASan                                  |
| 未初始化读取             | MSan(优先)或 Valgrind                |
| 数据竞争                 | TSan(优先)或 Helgrind                |
| 死锁                     | GDB + Helgrind                        |
| 内存泄漏                 | ASan LeakSanitizer(优先)或 Valgrind |
| 性能分析                 | Callgrind 或 perf                     |
| 崩溃事后分析             | core dump + GDB                       |
| 嵌入式调试               | printf + 远程 GDB                     |
| 第三方库(无源码)        | Valgrind                              |

### 12.3 核心原则总结

1. **预防优于修复**:启用所有警告,用静态分析在编码阶段拦截问题
2. **快速失败**:Sanitizer 让程序在第一次错误时崩溃,而非继续运行掩盖问题
3. **小步验证**:频繁运行测试 + sanitizer,而非一次性大改
4. **可复现优先**:任何 bug 先构建最小复现用例,再修复
5. **工具组合**:不同工具覆盖不同缺陷类别,不可相互替代
6. **不要依赖优化关闭**:`-O0` 调试后,必须在 `-O2` 下复测,捕获优化相关 bug
7. **记录与复盘**:记录每个 bug 的根因与教训,防止同类问题复发

### 12.4 调试检查清单

在开始调试前,确认以下信息:

- [ ] 编译选项是否包含 `-g`
- [ ] 是否禁用优化(`-O0`)或使用调试优化(`-Og`)
- [ ] 是否启用所有警告(`-Wall -Wextra -Wpedantic`)
- [ ] 是否能稳定复现 bug
- [ ] 是否有最小复现用例
- [ ] 是否尝试过 sanitizer(ASan/UBSan)
- [ ] 是否查看了 core dump
- [ ] 是否检查了最近的代码变更(git bisect)

在修复后,确认:

- [ ] 修复后 bug 不再复现
- [ ] 添加了回归测试
- [ ] 在 `-O2` 下也通过测试
- [ ] 通过 sanitizer 检查
- [ ] 静态分析无新警告
- [ ] 代码审查通过

### 12.5 学习资源

#### 12.5.1 官方文档

- GDB Manual: https://sourceware.org/gdb/current/onlinedocs/gdb/
- LLDB Tutorial: https://lldb.llvm.org/use/tutorial.html
- ASan Wiki: https://github.com/google/sanitizers/wiki
- Valgrind Manual: http://valgrind.org/docs/manual/manual.html
- cppcheck Manual: http://cppcheck.sourceforge.net/manual.pdf
- clang-tidy: https://clang.llvm.org/extra/clang-tidy/

#### 12.5.2 经典书籍

- 《Debugging: The 9 Indispensable Rules》—— David Agans
- 《Why Programs Fail》—— Andreas Zeller
- 《Advanced Windows Debugging》—— Mario Hewardt
- 《The Art of Debugging with GDB, DDD, and Eclipse》—— Norman Matloff

#### 12.5.3 实战项目

- 阅读 GDB 源码中 `gdb/testsuite/` 的测试用例,学习各种调试技巧
- 阅读开源项目(如 Redis、Nginx)的 CI 配置,学习工业级工具链集成
- 参与 OSS-Fuzz 项目,实战 fuzzing 与 sanitizer

### 12.6 结语

静态分析与调试不是"高级技巧",而是 C 工程师的基础生存技能。一个不会用 GDB 排查崩溃、不会用 ASan 检测内存越界、不会用 clang-tidy 扫描代码的工程师,在 C 世界里寸步难行。

掌握这些工具的路径很长:从 `-Wall` 开始,逐步加入 cppcheck、clang-tidy、ASan、UBSan,最后到 Valgrind、TSan。每一步都会让代码更可靠,让 bug 更早暴露。

更重要的是,**工具是手段,思维是根本**。一个有"防御性编程"思维的工程师,即使没有工具也能写出相对可靠的代码;一个没有这种思维的工程师,即使有最好的工具也会写出满是 bug 的代码。工具放大了能力,但无法替代思考。

愿这份文档能帮助你建立系统化的调试与静态分析能力,在 C 工程师的道路上越走越远。
