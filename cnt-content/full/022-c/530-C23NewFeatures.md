---
order: 520
title: C23 深水区：编译期特性与升级策略
module: 'c'
category: 计算机科学
difficulty: advanced
description: 接着 C23 上手往深处走：#embed、typeof、constexpr、ckd_* 四个编译期深水特性，查编译器支持矩阵的三板斧、C2y 草案现状，以及旧代码库「先开警告再切标准」的升级路线。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'c/520-C23C2y'
  - 'c/290-PreprocessorMacro'
  - 'c/470-BuildSystem'
  - 'c/410-CrossPlatformProgramming'
  - 'c/550-EmbeddedCProgramming'
prerequisites:
  - 'c/010-CZeroBasisStart'
  - 'c/520-C23C2y'
---

## 前置知识

- 已完成 [C23 上手](/c/520-C23C2y)：会用 `gcc -std=c23`，用过数字分隔符、nullptr、bool 关键字、auto 与 `[[attributes]]`，知道 `__STDC_VERSION__` 是标准身份证；
- 了解预处理基础（[预处理器与宏](/c/290-PreprocessorMacro) 的 `#define`、条件编译）——本文的 #embed 与特性探测都建在其上，细节记不全也行，用到就当场解释。

> 分工说明：520 与 530 合讲 C 新标准。520 是主教学，解决「日常写代码的新手感」；本篇是深水区，讲编译期的深水能力——#embed、typeof、constexpr、ckd_*——以及三个工程问题：支持矩阵怎么查、C2y 什么状态、旧代码库怎么升级。520 的五个特性本篇不再重复。

## 学习目标

读完本文你将能够：

1. 用 `#embed` 把二进制文件直接编进可执行文件，并用 `limit` 控制嵌入大小；
2. 用 `typeof` 写出类型安全的泛型宏，说出它与旧式宏交换的差异；
3. 说清 `#define`、`const`、`constexpr` 三者的差别，用 `constexpr` 声明编译期常量；
4. 用 `ckd_add`/`ckd_mul` 把整数溢出从未定义行为变成一次可判断的返回值；
5. 在陌生机器上用三板斧确认「特性能不能用」，按先开警告再切标准的顺序制定 C23 升级步骤，并说出 C2y 的现状与风险。

预计 60 到 75 分钟，含 1 组修改实验、1 道预测题与 1 道挑战题。

## 1. 问题引入

你在给一个像素小游戏做两件事：把 4KB 的调色板数据编进固件；给排行榜累加总分。第一件事的老办法是拿 `xxd -i` 把文件转成 C 数组头文件——改一次资源就得重新生成，两处版本还会悄悄不同步。第二件事更隐蔽：总分用 `int` 累加，某天测试报了个负分，你才发现有符号整数溢出在 C 里是**未定义行为**。

两个问题的共同点：都希望「编译器在构建期多干一步」，而不是靠人盯流程。C23 恰好把这批能力收进了标准。前置的五个日常特性见 [C23 上手](/c/520-C23C2y)，本文只讲编译期深水能力与落地策略。

## 2. #embed：资源文件直接进可执行文件

过去把图片、字体编进程序要靠外部工具生成数组；`#embed` 让预处理器直接读文件：

```c
/* embed_logo.c：把调色板文件嵌进程序 */
#include <stdio.h>

const unsigned char palette[] = {
    #embed "palette.bin" limit(16)   /* 只嵌前 16 字节 */
};

int main(void) {
    printf("embedded %zu bytes\n", sizeof palette);
    printf("first byte: 0x%02X\n", palette[0]);
    return 0;
}
```

```bash
printf '\x89PNG\x0d\x0a\x1a\x0a\x00\x00\x00\x0dIHDR\x00\x00' > palette.bin
gcc -std=c23 embed_logo.c -o embed_logo && ./embed_logo
```

预期输出：

```text
embedded 16 bytes
first byte: 0x89
```

三点值得记：`sizeof palette` 在**编译期**就等于嵌入字节数，不用单独维护长度变量；去掉 `limit(16)` 就嵌入整个文件；路径按预处理期相对路径解析，找不到直接编译失败。需要 GCC 15 / Clang 19 起（cppreference 支持页，验证于 2026-09）——老编译器上会先卡在这一步，这正是第 9 节支持矩阵要解决的问题。

## 3. typeof：给宏装上类型系统

交换两个变量的宏，用 `int tmp` 换不了 `double`。C23 的 `typeof(expr)` 在类型位置引用表达式的类型，让宏自己长出正确类型：

```c
/* typeof_swap.c：类型安全的交换宏 */
#include <stdio.h>

#define SWAP(a, b) do {   \
    typeof(a) tmp_ = (a); \
    (a) = (b);            \
    (b) = tmp_;           \
} while (0)

int main(void) {
    int    hp   = 30,   mp    = 99;
    double crit = 0.25, dodge = 0.15;

    SWAP(hp, mp);
    SWAP(crit, dodge);
    printf("%d %d\n", hp, mp);
    printf("%.2f %.2f\n", crit, dodge);

    const int cap = 100;
    typeof_unqual(cap) used = 40;   /* 去掉 const，得到 int */
    used = 60;
    printf("%d\n", used);
    return 0;
}
```

```bash
gcc -std=c23 typeof_swap.c -o typeof_swap && ./typeof_swap
```

预期输出：

```text
99 30
0.25 0.15
60
```

`typeof` 是 GCC 十几年的老扩展，C23 把它转正——C 标准现代化的典型路径：先在编译器里实践多年，再收编。配套的 `typeof_unqual` 去掉 `const`/`volatile` 限定，适合「要个可写副本」的场合。老式交换宏的问题当场实验见第 6 节。

## 4. constexpr：常量的三种写法该退休一种了

C 里声明常量有三条路：`#define PI 3.14`（无类型、无作用域、纯替换）；`const double PI = 3.14`（运行期不可改，但值未必编译期可知）；C23 的 `constexpr` **强制**编译期求值，可参与一切常量表达式：

```c
/* constexpr_tbl.c：编译期常量进静态断言、数组长度 */
#include <stdio.h>

constexpr int TABLE_MAX = 64;
constexpr double PI = 3.14159265;

_Static_assert(TABLE_MAX <= 256, "表过大，改为分段");

int main(void) {
    int squares[TABLE_MAX / 8] = {0};
    for (int i = 0; i < 8; i++) squares[i] = i * i;

    printf("PI = %.8f\n", PI);
    printf("4^2 = %d\n", squares[4]);
    return 0;
}
```

```bash
gcc -std=c23 constexpr_tbl.c -o constexpr_tbl && ./constexpr_tbl
```

预期输出：

```text
PI = 3.14159265
4^2 = 16
```

一个高频误区：C23 的 `constexpr` **只支持对象，不支持函数**。`constexpr int square(int x) { return x * x; }` 是 C++ 写法，C23 下编译报错。另外它必须用常量表达式初始化：`int n = read(); constexpr int m = n;` 不合法，因为 `n` 编译期未知。

## 5. ckd_*：溢出从未定义行为变成一次返回值

有符号整数溢出是未定义行为：结果可能变负，甚至编译器有权把你的溢出检查整个优化掉。手工检查 `if (a > INT_MAX - b)` 又难写对（类型提升的坑防不胜防）。C23 的 `<stdckdint.h>` 把「运算 + 检查」合成一步：

```c
/* ckd_score.c：排行榜总分不再静默溢出 */
#include <stdio.h>
#include <stdckdint.h>

int main(void) {
    int total = 2'000'000'000;
    int per_round = 500'000'000;

    int next;
    if (ckd_add(&next, total, per_round)) {   /* true 表示溢出 */
        puts("int 装不下了，溢出被拦下");
    } else {
        total = next;
    }

    long long wide;
    ckd_mul(&wide, 100000LL, 100000LL);       /* 换宽类型就装得下 */
    printf("wide = %lld\n", wide);
    return 0;
}
```

```bash
gcc -std=c23 ckd_score.c -o ckd_score && ./ckd_score
```

预期输出：

```text
int 装不下了，溢出被拦下
wide = 10000000000
```

约定：不溢出返回 `false` 并把正确结果写入第一个参数；溢出返回 `true`，结果按回绕值写入。`ckd_add`/`ckd_sub`/`ckd_mul` 对任意整数类型通用，是数值代码处理积分、计数、金额的首选。可用性：GCC 14 自带，glibc 2.39 起系统库也提供（验证于 2026-09，以 cppreference 支持页为准）。

## 6. 修改实验：SWAP 遇上混合类型

把 typeof_swap.c 的 `SWAP(crit, dodge);` 一行改成跨类型交换：`SWAP(hp, crit);`。先预测能编译吗、输出是什么，再用 `gcc -std=c23 -Wall -Wextra -Wconversion` 编译观察。

预期观察（警告截取关键行；程序仍能运行，`hp` 变成 `0`——0.25 截断，`crit` 变成 `30.00`）：

```text
typeof_swap.c:11:26: warning: conversion from 'double' to 'int' may change value [-Wfloat-conversion]
```

结论：`typeof` 只负责「搬运类型」，不做类型检查——泛型宏假定调用者传同一类型，跨类型调用要自己负责。这也是泛型宏文档必须写前置条件的理由。

## 7. 核心概念：这批特性的共同点

四个特性在回答同一个问题：**能不能让编译器在构建期多承担一点？** `#embed` 把资源进二进制从外部脚本搬回预处理期；`typeof` 把宏的类型正确性从调用者自觉搬回编译器；`constexpr` 把常量的正确性从约定搬进类型系统；`ckd_*` 把溢出判定从「运行时祈祷」变成绑定的库调用。

## 8. C2y 现状：别把草案当定稿

「标准号不等于定稿」：`-std=c2y` 能编译通过的代码，不代表 C2y 已发布，更不代表特性已稳定。截至 2026-09（本文验证日期），C2y——C23 的下一个修订版——仍处于 WG14 工作草案阶段，**尚未发布**，草案文本在 WG14 官方文档库公开；GCC 15 与 Clang 20 起提供 `-std=c2y` / `-std=gnu2y` 实验开关，仅用于提前验证，生产代码不要依赖。

已进入讨论或草案的候选包括 `case 1 ... 5:` 区间语法、defer（作用域退出自动清理）等提案——定稿前都可能改名、改语义甚至被撤回。判断新特性资讯的可信度，看它分不分得清三层：提案（可能有变）→ 工作草案（较稳但仍可变）→ 正式发布（ISO 定稿）。把草案特性写进产品代码，等于替标准委员会赌明天。

## 9. 支持矩阵怎么查：三个入口与三板斧

「哪个编译器、哪个版本开始能用」没有统一答案，要查表而不是背表：

| 入口 | 查什么 |
| :--- | :--- |
| cppreference C23 支持页 | 逐特性列 GCC/Clang 最低版本（本文版本事实出处） |
| GCC 在线手册 C Dialect Options | `-std` 全部取值与默认标准 |
| 各编译器发布说明 / MSVC 一致性文档 | 具体版本的新增特性与开关名 |

拿到一台陌生机器，三板斧：

```bash
gcc --version | head -1                            /* 编译器版本 */
gcc -dM -E - < /dev/null | grep __STDC_VERSION__   /* 预定义宏里的标准号 */
gcc -std=c23 probe.c -o probe && ./probe           /* 用 520 的探针实测 */
```

第二条命令在一台 GCC 14 的 Linux 默认配置上会打出 `#define __STDC_VERSION__ 201710L`——它揭示一个常被忽略的事实：**默认标准往往不是最新标准**（GCC 14 默认 gnu17，GCC 15 起才默认 gnu23）。「机器上有新 GCC」不等于「你的构建在用新标准」，两者要分别确认。MSVC 的 C23 支持仍在推进中，以 Microsoft 文档为准（验证于 2026-09）。

## 10. 旧代码库升级：先开警告，再切标准

升级顺序错了会把几百个错误一次性泼到团队脸上。可靠路径是三步：

```bash
/* 第 1 步：还在旧标准时，先把警告清零 */
gcc -std=gnu17 -Wall -Wextra -Wpedantic -Werror -c src/*.c

/* 第 2 步：切标准，让 C23 的新规则暴露老毛病，此时不加 -Werror */
gcc -std=c23   -Wall -Wextra -Wpedantic -c src/*.c

/* 第 3 步：逐文件修完、逐目录固化 -Werror；对外发布的库再加特性探测降级 */
```

为什么顺序不能反：警告是「提示」，错误是「拦截」。先把旧标准下的警告清零，切标准后新增的报错才隔离得住。切到 C23 后最容易爆的两类老毛病：一是 K&R 旧式函数定义被移除（C23 里 `()` 收窄为 `(void)`，真实报错见下一节）；二是关键字占用冲突——旧代码里自己 `#define bool`、或声明了名为 `true` 的变量/宏，会与真关键字撞车。

配套原则：对外发布的库不要硬性要求 C23，用 `__STDC_VERSION__` 与 `__has_include` 探测降级（`__has_include` 已由 C23 标准化，GCC 5 起就支持）：

```c
#if __has_include(<stdckdint.h>)
    #define HAS_CKD 1
#else
    #define HAS_CKD 0
#endif
```

把这套步骤写进 CI（新旧编译器各一档矩阵），是 [构建系统](/c/470-BuildSystem) 的日常工作。

## 11. 常见错误与调试实录

### 实录一：fatal error: stdckdint.h: No such file or directory——工具链没有这个头文件

把 ckd_score.c 交给一个旧环境的构建：

```bash
gcc -std=c17 ckd_score.c -o ckd_score
```

真实报错：

```text
ckd_score.c:2:10: fatal error: stdckdint.h: No such file or directory
    2 | #include <stdckdint.h>
      |          ^~~~~~~~~~~~~
compilation terminated.
```

读报错三步：`fatal error ... No such file or directory` 说明预处理器找不到头文件，编译在预处理期就停了；排查方向有二——标准太旧（C17 不提供，改 `-std=c23` 试试）或工具链太老（GCC 14 之前、glibc 2.39 之前都没有）；决策是能升级就升级工具链，不能升级就按第 10 节的 `__has_include` 写降级路径。教训一句话：`-std=c23` 只声明标准，不保证头文件存在——头文件属于编译器与 C 库的具体实现。

### 实录二：old-style parameter declarations——K&R 定义在 C23 下出局

老代码里参数类型写在花括号之前的写法：

```c
/* legacy.c：上世纪的函数定义 */
int add(a, b)
int a;
int b;
{
    return a + b;
}
```

```bash
gcc -std=c23 -c legacy.c -o legacy.o
```

真实报错（截取关键行）：

```text
legacy.c:3:5: error: old-style parameter declarations in prototyped function definition
    3 | int add(a, b)
      |     ^~~
```

读报错三步：`old-style parameter declarations` 点明这是 K&R 旧式定义，与原型声明冲突；在 C17 下它只是警告或勉强通过，C23 把 `()` 定义收窄为 `(void)`，此类写法从「别这么写」变成「编译不过」——正是升级策略里「切标准才暴露」的典型；修法是改成原型式定义 `int add(int a, int b) { return a + b; }`。历史包袱太重的文件，短期用 `-std=gnu17` 维持，长期按第 10 节的节奏迁移。

## 12. 实际项目中的使用场景

- 固件资源打包：字库、校准表、证书用 `#embed` 进固件，资源与代码同源同版本（FoloToy-calendar 这类 ESP32 项目的资源管理思路），见 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)；
- 容器与日志宏：团队公共宏用 `typeof` 写成类型安全版本；积分、库存、协议字段运算全部过 `ckd_*`，把「溢出」从上线事故变成一条可测试的分支；
- 升级工程：三步升级法与 `__has_include` 降级配合跨平台构建，见 [跨平台编程](/c/410-CrossPlatformProgramming)。

## 13. 小练习

预测题（5 分钟）：先写下答案再运行验证（`-std=c23` 编译）：

```c
constexpr int N = 5;
int a[N] = {0};
typeof(a) b;
typeof(a[0]) c = 7;
printf("%zu %zu %d\n", sizeof a / sizeof a[0], sizeof b / sizeof b[0], c);
```

参考答案（先写再看）：输出 `5 5 7`。`typeof(a)` 得到 `int[5]`，`b` 与 `a` 同型（`b` 未初始化，但只用 `sizeof` 取型是安全的，读它的内容才是未定义行为）；`typeof(a[0])` 得到 `int`。

挑战题（半小时）：实现「安全积分累加」接口 `int add_score(int total, int delta, int *out)`——成功求和返回 1 并把结果写入 `*out`；检测到溢出返回 0 且不改动 `*out`。验收断言（需 `#include <assert.h>`）：

```c
assert(add_score(2'000'000'000, 500'000'000, &out) == 0);
assert(add_score(1000, 233, &out) == 1 && out == 1233);
```

提示（思路）：内部用临时变量接收 `ckd_add` 的结果，成功才写 `*out`；展开（关键 API）：`ckd_add(&tmp, total, delta)` 的返回值即溢出标志。

## 14. 与之前和之后的知识的关系

- 往前：[C23 上手](/c/520-C23C2y) 的五个特性与本文四个深水特性同属 C23，本篇默认你已会开标准、会读版本表；[预处理器与宏](/c/290-PreprocessorMacro) 解释了 SWAP 宏里的括号、反斜杠续行为什么必须这么写；
- 往后：编译器专属属性大家族在 [属性与编译器扩展](/c/540-AttributeCompilerExtension)；三步升级法落到 CI 的写法在 [构建系统](/c/470-BuildSystem)；`ckd_*` 的应用边界在 [安全函数与边界检查](/c/450-SafeFunctionBoundsCheck)；
- 更远：#embed 的主场在嵌入式固件（[嵌入式 C 编程](/c/550-EmbeddedCProgramming)）；内存层面的安全实践见 [动态内存](/c/200-DynamicMemoryManagement)。

## 15. 官方文档

- cppreference C23 编译器支持（本文版本矩阵出处，验证于 2026-09）：https://en.cppreference.com/w/c/compiler_support/23
- cppreference #embed 与 `<stdckdint.h>`：https://en.cppreference.com/w/c/preprocessor/embed 、https://en.cppreference.com/w/c/header/stdckdint.h
- WG14 官方文档库（C2y 草案与提案原文）：https://www.open-std.org/jtc1/sc22/wg14/

## 16. 自我检查

- 能不看资料写出 `#embed` 嵌入文件并用 `sizeof` 打印大小的最小程序；
- 能说清 `#define`、`const`、`constexpr` 三者的边界，并解释 `constexpr int m = n;`（n 为运行期变量）为什么不合法；
- 能说出「陌生机器确认特性可用性」的三个命令各查什么；
- 能按顺序复述三步升级法，并说明警告清零为什么必须发生在切标准之前；
- 面对一条「C2y 新特性」资讯，能判断它处在提案、草案还是定稿层。

## 本章总结

C23 的深水能力都在做同一件事：把构建期能判断的事从人手里接过来——#embed 让资源与代码同源，typeof 让宏的类型正确，constexpr 让常量进类型系统，ckd_* 让溢出变成一次可判断的返回。落地时记住三条纪律：版本事实查 cppreference 支持页而不是背表（本文验证于 2026-09）；C2y 仍是草案，草案特性不进生产；旧库升级先警告后标准、逐目录固化。

## 下一步

进入 [属性与编译器扩展](/c/540-AttributeCompilerExtension)：C23 的 `[[...]]` 只是标准化的最小集，GCC/Clang 还有庞大的专属属性家族——把它们纳入武器库，让编译器成为你的第一道 code review。
