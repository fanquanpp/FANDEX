---
order: 40
title: 数据类型：类型系统、溢出与浮点的第一课
module: 'c'
category: 计算机科学
difficulty: beginner
description: 用 sizeof 打印实验走进类型系统：整型家族的最小宽度与 limits.h、stdint.h 定宽类型的选型速查、无符号回绕与有符号溢出的 UBSan 实录、IEEE 754 浮点心智模型与 0.1 + 0.2 不等于 0.3 的 epsilon 解法。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'c/050-VariableConstant'
  - 'c/060-OperatorExpression'
  - 'c/120-ArrayDetailed'
  - 'c/220-MemoryAlignmentDeepDive'
  - 'c/520-C23CoreFeatures'
  - 'c/530-C23NewFeatures'
prerequisites:
  - 'c/020-CLanguageOverview'
  - 'c/030-ProgramStructureBasicSyntax'
---

## 前置知识

- 已完成 [程序结构与基本语法](/c/030-ProgramStructureBasicSyntax)：会写、编译、运行一个 printf 程序；
- [C 语言概览](/c/020-CLanguageOverview) 里见过 int、char 这些名字，本文负责把它们一次讲透。

> 分工说明：本篇是类型系统的主线教学。类型转换的完整阶梯在 [运算符与表达式](/c/060-OperatorExpression) 安家；结构体成员怎么排布、对齐怎么算在 [内存对齐](/c/220-MemoryAlignmentDeepDive)；C23 的新类型在 [C23 与 C2y](/c/520-C23CoreFeatures) 与 [C23 新特性](/c/530-C23NewFeatures)。本篇只给主线与「什么时候用哪个」。

## 学习目标

读完本文你将能够：

1. 用 sizeof 打印各类型的大小，解释为什么同一份代码在不同平台上大小不同；
2. 说出整型家族每名成员的最小宽度保证，用 limits.h 在自己机器上验证真实边界；
3. 按场景在 int、size_t、int32_t/int64_t 之间做出正确选择；
4. 演示「无符号回绕」与「有符号溢出是未定义行为」的区别，并用 UBSan 当场抓住后者；
5. 画出 IEEE 754 浮点的位段心智模型，解释 0.1 + 0.2 为什么不等于 0.3，写出 epsilon 比较。

预计 50 到 70 分钟，含 4 组动手实验与 3 道练习。

## 1. 问题引入：同一个 int，换个平台就不一样大

C 不规定「int 就是 4 字节」。标准只给出一条底线：int 至少能装下正负 32767（即至少 16 位），其余交给各平台的实现。空口无凭，把类型大小打出来：

```c
/* sizes.c：把基本类型的大小打出来 */
#include <stdio.h>

int main(void) {
    printf("char       %zu\n", sizeof(char));
    printf("short      %zu\n", sizeof(short));
    printf("int        %zu\n", sizeof(int));
    printf("long       %zu\n", sizeof(long));
    printf("long long  %zu\n", sizeof(long long));
    printf("float      %zu\n", sizeof(float));
    printf("double     %zu\n", sizeof(double));
    printf("size_t     %zu\n", sizeof(size_t));
    return 0;
}
```

```bash
gcc -Wall -Wextra sizes.c -o sizes
./sizes
```

x86-64 Linux 上一次典型输出：

```text
char       1
short      2
int        4
long       8
long long  8
float      4
double     8
size_t     8
```

同一份代码，在 64 位 Windows 上 long 会打印 4 而不是 8。这不是编译器出错，是 64 位时代两大家族的数据模型不同：

| 数据模型 | short | int | long | 指针 | 代表平台 |
| --- | --- | --- | --- | --- | --- |
| ILP32 | 2 | 4 | 4 | 4 | 32 位 Linux、Win32 |
| LLP64 | 2 | 4 | 4 | 8 | 64 位 Windows |
| LP64 | 2 | 4 | 8 | 8 | 64 位 Linux、macOS、BSD |

心智模型先行：**一个类型 = 一段字节 + 对这段字节的解读方式**。C 把「多少字节」大部分留给平台，只承诺最小宽度与相对大小（short 不长于 int，int 不长于 long，long 不长于 long long）。所以写 C 的第一课就是：别猜大小，用 sizeof 问，用标准头文件 limits.h 与 stdint.h 要（第 3、4 节）。

顺带认识 %zu：它是打印 sizeof 结果的格式符。sizeof 的返回类型是 size_t——一个足以装下任何对象大小的无符号整型，不是 int，打印时用 %zu，本文后面会再收拢这条线。

## 2. char：身兼二职的字符与小整数

char 的本职是「字符类型」，但它只有 1 个字节，所以 C 程序员也拿它当最小整数用：

```c
/* char_as_int.c */
#include <stdio.h>

int main(void) {
    char c = 'A';
    printf("%c %d\n", c, c);   /* 字符照打，数字也照打 */
    return 0;
}
```

预期输出：

```text
A 65
```

'A' 的编号是 65（ASCII 码）。printf 的 %c 按字符打印、%d 按整数打印——同一个字节、两种解读，正是第 1 节心智模型的缩影。

但 char 有个埋伏：**它的符号性是实现定义的**。C 标准只要求 plain char 的行为等价于 signed char 或 unsigned char 中的某一种，选哪种由每个编译器自行文档化。写个探针试试：

```c
/* char_sign_probe.c */
#include <stdio.h>

int main(void) {
    char c = 200;
    printf("%d\n", c);
    return 0;
}
```

x86 平台（Linux、Windows 上的 gcc/MSVC）常见输出 `-56`：char 默认按 signed char 处理，200 超出 127 的上限，装进去变成负数。ARM Linux 与 macOS 上常见输出 `200`：char 默认按 unsigned char 处理。想知道自己平台的答案，甚至不用跑程序，编译期就能查：

```c
#include <limits.h>
#if CHAR_MIN < 0
/* 本平台 char 默认有符号 */
#endif
```

CHAR_MIN 在有符号平台是 -128，在无符号平台是 0，这个条件编译在任何平台都成立。规则因此很简单：

- 装字符（'A'、'7'）：用 char，没有争议；
- 装 0 到 255 的小数值或字节：用 unsigned char，把意图写明；
- 需要真正的小负数：用 signed char。

别让 char 参与算术——它的符号性不确定，MISRA、AUTOSAR 这类编码规范都明令禁止这样用。

## 3. short / int / long / long long：只保底，不封顶

整型家族五名成员，标准给出的最小宽度与保证范围：

| 类型 | 标准最小宽度（位） | 常见实现 | 标准保证范围至少 |
| --- | --- | --- | --- |
| char | 8 | 8 | -127 至 127，或 0 至 255（看符号性） |
| short | 16 | 16 | -32767 至 32767 |
| int | 16 | 32 | -32767 至 32767 |
| long | 32 | 32（Windows）或 64（Unix 系） | -2147483647 至 2147483647 |
| long long | 64（C99 起） | 64 | 约正负 9.2 × 10^18 |

读表三件事：

1. **int 只有 16 位也合法**。某些 DSP 与老式嵌入式平台上 sizeof(int) 真的等于 2，代码里假设「int 是 4 字节」就会翻车；
2. **long 在 64 位平台分裂成两派**（第 1 节的 LLP64 与 LP64），跨平台代码里 long 是不可靠的类型；
3. 每个边界的真实数字不用背，limits.h 全都备好了：

```c
/* limits.c：把本平台的真实边界打出来 */
#include <stdio.h>
#include <limits.h>

int main(void) {
    printf("CHAR_MIN  %d\n", CHAR_MIN);
    printf("CHAR_MAX  %d\n", CHAR_MAX);
    printf("INT_MIN   %d\n", INT_MIN);
    printf("INT_MAX   %d\n", INT_MAX);
    printf("UINT_MAX  %u\n", UINT_MAX);
    printf("LONG_MIN  %ld\n", LONG_MIN);
    printf("LLONG_MAX %lld\n", LLONG_MAX);
    return 0;
}
```

```bash
gcc -Wall -Wextra limits.c -o limits
./limits
```

x86-64 Linux 上一次典型输出：

```text
CHAR_MIN  -128
CHAR_MAX  127
INT_MIN   -2147483648
INT_MAX   2147483647
UINT_MAX  4294967295
LONG_MIN  -9223372036854775808
LLONG_MAX 9223372036854775807
```

printf 与整型的对应关系一张表收齐：int 用 %d，unsigned int 用 %u，long 用 %ld，long long 用 %lld，size_t 用 %zu。凡是表达「大小、下标、内存量」的变量，首选 size_t，打印记得 %zu——这条会伴随你整个 C 生涯。

## 4. stdint.h：把宽度写进类型名

第 3 节的两个坑（int 可能只有 16 位、long 平台分裂）有个标准解：头文件 stdint.h 提供一组宽度定死的类型。

| 类型 | 含义 | 典型用途 |
| --- | --- | --- |
| int8_t / uint8_t | 8 位有/无符号 | 字节缓冲、协议字段 |
| int16_t / uint16_t | 16 位有/无符号 | 音频样本、端口号 |
| int32_t / uint32_t | 32 位有/无符号 | 文件格式、哈希值 |
| int64_t / uint64_t | 64 位有/无符号 | 时间戳、大计数 |
| intptr_t / uintptr_t | 能装下指针的整数 | 指针与整数互转的少数场合 |

```c
/* fixed.c：宽度定死的类型 */
#include <stdio.h>
#include <stdint.h>

int main(void) {
    uint8_t  byte = 255;           /* 0 到 255，任何平台绝不多不少 */
    int32_t  score = -2000000000;  /* 32 位，Windows 与 Linux 一致 */
    uint64_t nanos = 1759150000000000000ULL;
    printf("%u %d %llu\n", byte, score, (unsigned long long)nanos);
    return 0;
}
```

预期输出：

```text
255 -2000000000 1759150000000000000
```

两处细节：大数字面量要带 ULL 后缀（字面量先落进能装下它的类型，第 8 节收拢）；严格打印 uint64_t 应配 inttypes.h 的 PRIu64 宏，本文从简用 %llu 加显式转换（主流平台 int64 与 long long 宽度相同）。

选型速查（全文最常被问的问题）：

- 循环计数、普通局部变量：int；
- 数组下标、内存大小、与 sizeof 打交道：size_t；
- 跨平台要求宽度一致（文件格式、网络协议、序列化）：int32_t/int64_t 等定宽类型；
- 装字节：uint8_t 或 unsigned char；
- 拿不准就用 int，遇到宽度敏感的场景再换定宽类型。

再加一根编译期保险丝。文件开头写上：

```c
#include <assert.h>
_Static_assert(sizeof(int) >= 4, "int must be at least 32 bits");
```

假设不成立时编译直接报错——把跨平台翻车从运行时提前到编译期。

## 5. 溢出：无符号回绕，有符号未定义

第 1 节的「字节 + 解读」模型，在溢出时刻分岔成两条完全不同的路：

```c
/* overflow.c */
#include <stdio.h>
#include <limits.h>

int main(void) {
    unsigned int u = UINT_MAX;   /* 4294967295：无符号的最大值 */
    u = u + 1;
    printf("u = %u\n", u);       /* 标准规定：回绕到 0 */

    int i = INT_MAX;             /* 2147483647：有符号的最大值 */
    i = i + 1;
    printf("i = %d\n", i);       /* 未定义行为！ */
    return 0;
}
```

无符号一方，标准白纸黑字：无符号运算永远不会「溢出」，装不下的结果按 2^N 取模回绕，所以 UINT_MAX + 1 必然等于 0，毫无悬念。有符号一方，INT_MAX + 1 是**未定义行为**（undefined behavior，UB）：标准不规定任何结果，怎么做都行。

先不加工具直接跑，x86-64 上大概率打印 i = -2147483648——看起来像「回绕成最小值」，但这只是当前硬件补码实现的巧合，标准不背书。开 UBSan（UndefinedBehaviorSanitizer）重跑：

```bash
gcc -Wall -Wextra -g -fsanitize=undefined overflow.c -o overflow
./overflow
```

预期输出（关键行）：

```text
u = 0
overflow.c:11:5: runtime error: signed integer overflow: 2147483647 + 1 cannot be represented in type 'int'
i = -2147483648
```

UBSan 把看不见的 UB 变成一行带文件名、行号与解释的实录：2147483647 + 1 在 int 里装不下。程序默认继续跑完（想让它在出错点当场中止，加 -fno-sanitize-recover=all），但这一行就是实锤。

为什么标准敢把最常用的加法留白？因为编译器被授权**假设有符号整数不溢出**，并据此优化。经典例子：`return x + 1 > x;` 会被 -O2 优化成 `return 1;`——既然你承诺不溢出，这句话恒真；一旦真的溢出，程序行为已经不在语言规则之内。所以「我试了试，好像只是变成负数」不构成依赖的理由。真要检测溢出，正路是 GCC/Clang 的 `__builtin_add_overflow(a, b, &result)`（溢出时返回 true），或先比较再运算。

习惯从本文起生效：有符号运算留足余量，不拿最大值当起点；无符号运算记得回绕随时发生——u 为 0 时 u - 1 得到 UINT_MAX，第 12 节的预测题就是它。

## 6. 浮点：IEEE 754 心智模型

整数存的是字节本身，浮点存的是**近似值**。C 的 float（32 位）与 double（64 位）几乎处处按 IEEE 754 标准实现，心智模型是二进制版的科学计数法：正负 1.M 乘以 2 的 E 次方。位段三件套：

```text
double（64 位）： [ S 1 位 ][ E 11 位（偏置 1023）][ M 52 位 ]
float（32 位）：  [ S 1 位 ][ E 8 位（偏置 127）  ][ M 23 位 ]
```

- S 符号位：管正负；
- E 指数：管数量级，存的是「真实指数加偏置」；
- M 尾数：管精度，前导 1 约定省略不存，所以 float 的有效位实为 24 位（约 7 位十进制数字），double 为 53 位（约 15 到 16 位）。

两个特例先认识：指数全 1 且尾数全 0 表示无穷大（inf）；指数全 1 且尾数非零是 NaN（Not a Number），0.0/0.0 的结果就是它，`x != x` 是检测 NaN 的标准写法——NaN 连自己都不等于。完整位表与推导属于数值分析课程，记住心智模型就够。

这个模型直接推出第一条军规：**0.1 在二进制里是无限循环小数**（就像十进制里的 1/3），存进 double 必然有舍入。实验：

```c
/* float_precision.c */
#include <stdio.h>
#include <math.h>

int main(void) {
    double a = 0.1 + 0.2;
    printf("%.1f\n", a);       /* 打印时四舍五入，看起来是 0.3 */
    printf("%.17f\n", a);      /* 揭底 */
    printf("%d\n", a == 0.3);  /* 浮点能用 == 吗？ */
    printf("%d\n", fabs(a - 0.3) < 1e-9);  /* epsilon 比较 */
    return 0;
}
```

```bash
gcc -Wall -Wextra float_precision.c -o float_precision -lm
./float_precision
```

预期输出：

```text
0.3
0.30000000000000004
0
1
```

读输出：%.1f 显示 0.3 是 printf 四舍五入在替你遮丑，%.17f 才是真相——0.1 + 0.2 存的是 0.30000000000000004，而 0.3 存的是另一个略小的近似值，两者不相等。于是第二条军规：**永远不要用 == 比较浮点数**，改问「差距是否足够小」，即 epsilon 比较：`fabs(a - b) < 1e-9`。测试框架的浮点断言全部走这条路。

float 与 double 怎么选：**默认 double**——现代 CPU 上两者速度差距很小，而 double 的精度余量大得多；float 留给海量数据（图形顶点、音频样本）省内存省带宽的场合；long double 精度更高但速度慢、平台差异大，按需取用。财务系统连二进制浮点都不该用（0.1 都存不准），那是 C23 十进制浮点 _Decimal64 的课题，见 [C23 新特性](/c/530-C23NewFeatures)。

## 7. _Bool 与 bool：真假的两种写法

逻辑真假有专属类型。C99 给了关键字 _Bool，并在 stdbool.h 里提供 bool、true、false 三个宏；C23 起这几个词全部转正为关键字，不再需要任何头文件：

```c
#include <stdbool.h>   /* C23 起可省略 */

bool ok = 0.1 + 0.2 > 0.3 - 1e-9;   /* true */
```

所以老代码里的 `#include <stdbool.h>` 依然常见、依然合法。C23 的完整变化清单见 [C23 与 C2y](/c/520-C23CoreFeatures)。

## 8. 修饰符组合与字面量后缀速览

signed、unsigned、short、long 四个修饰符与基本类型组合出整型全家福，等价写法一张表：

| 完整写法 | 等价简写 | 备注 |
| --- | --- | --- |
| signed int | int | signed 默认可省 |
| unsigned int | unsigned | 从 0 起，模 2^N 回绕（第 5 节） |
| short int / long int | short / long | 修饰 int 时 int 可省 |
| unsigned long long int | unsigned long long | 至少 64 位 |

字面量后缀对应类型：100 默认是 int；100U 是 unsigned int；100L 是 long；100ULL 是 unsigned long long。浮点字面量：3.14 默认是 double，3.14f 是 float，3.14L 是 long double。第 4 节的大数加 ULL 后缀，就是为了让字面量先落进能装下它的类型。

## 9. 类型转换：一段概览

不同类型混算时，编译器先做隐式转换再运算，两条主干：

- **整数提升**：char、short、_Bool 参与运算时先升为 int（CPU 天生按 int 的一档运算）；
- **寻常算术转换**：两操作数类型不同时，低等级向高等级靠；有符号与无符号相遇时，无符号一方往往获胜。

第二条埋着一颗雷：`-1 < 1U` 的结果是假——-1 被转成 unsigned int 后变成 4294967295，当然不小于 1。显式转换用 cast 写法：`(int)3.99` 得 3（向零截断），`(double)5 / 2` 得 2.5，而 `5 / 2` 是整数除法得 2。

分工说明：转换的完整阶梯、每一步的精确规则与更多陷阱，在 [运算符与表达式](/c/060-OperatorExpression) 安家，本文只保留心智模型与这两条结论。

## 10. 复合类型引路：数组、字符串与后面的章节

用基本类型拼装出复合类型，是 C 类型系统的另一半。本篇只负责一句话引路：

- **数组**：同类型的连续排布，`int scores[5];`。数组与字符串的关系值得提前知道：C 没有字符串类型，字符串就是 char 数组加一个 '\0' 结尾标记，`char name[] = "Ada";` 实际占 4 个字节（3 个字母加 1 个 '\0'）。数组的完整故事见 [数组详解](/c/120-ArrayDetailed)；
- **指针**：装地址的类型，`int *p = &x;`。指针的类型决定解引用时读几个字节、怎么解读——第 1 节心智模型在地址上的延伸，见 [指针深度解析](/c/140-PointerDeep)；
- **结构体与联合体**：异构成员的打包（struct）与共享同一块内存（union），成员排布与填充见 [结构体与联合体](/c/130-StructAndUnion) 与 [内存对齐](/c/220-MemoryAlignmentDeepDive)；
- **枚举与 typedef**：给整数值起可读名字、给类型起别名，见 [枚举与 typedef](/c/110-EnumTypedef)；
- **void**：空类型，表示「没有值」。函数无返回值写 void；`void *` 是不关心所指类型的通用指针，在 [指针深度解析](/c/140-PointerDeep) 展开。

## 11. 实际项目中的使用场景

- 平台相关的一般计算用 int；一切「大小与下标」用 size_t——这是 C 标准库自己的风格；
- 文件格式、网络协议、持久化数据用 int32_t/int64_t：宽度即承诺。真实项目同样如此，SQLite 与 Redis 都在头文件里定义了自己的 u32、i64 别名，本质是给 stdint.h 类型换一口项目方言；
- 嵌入式与驱动（寄存器值、字节流）：uint8_t/uint32_t 配合位运算，见 [位运算与位域](/c/070-BitwiseOperationAndMask) 与 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)；
- 图形与音频的海量样本用 float，科学计算默认 double（第 6 节）；
- 超大数组不要开在栈上（局部变量动辄几 MB 会栈溢出），去堆上 malloc，见 [动态内存](/c/200-DynamicMemoryManagement)。

## 12. 小练习

预测题（5 分钟）：先写答案，再运行验证：

```c
unsigned int u = 0;
u = u - 1;
printf("%u\n", u);
```

参考答案（先写再看）：打印 4294967295，即 UINT_MAX。0 减 1 在无符号世界里按模 2^32 回绕，从最小值下方绕回最大值——与第 5 节 UINT_MAX + 1 绕回 0 互为镜像。若是 `int i = 0; i = i - 1;` 则毫无悬念得 -1，因为 -1 在 int 的表示范围内。

修改题（10 分钟）：把第 3 节的 limits.c 扩成「本平台类型档案卡」：为每个整型打印 sizeof 与上下限（limits.h），末尾加一行 size_t 的大小。验收：输出 8 行以上；有条件的话在 64 位 Windows 与 Linux 各跑一次，对比 long 那行。

挑战题（20 分钟，不看提示先动手）：写一个 `bool nearly_equal(double a, double b, double epsilon)` 函数，用 fabs 判断差距；在 main 里验证 0.1 + 0.2 与 0.3 在 epsilon 取 1e-9 时相等、取 1e-20 时不相等。

提示（思路方向）：fabs 在 math.h 里，Linux 编译加 -lm；bool 需要 stdbool.h（或用 C23）。

展开（关键行）：

```c
bool nearly_equal(double a, double b, double epsilon) {
    return fabs(a - b) < epsilon;
}
/* nearly_equal(0.1 + 0.2, 0.3, 1e-9)  为 true；
   nearly_equal(0.1 + 0.2, 0.3, 1e-20) 为 false：
   两者本就不完全相等（差约 5.6e-17），epsilon 调得比差值还小就测不出来 */
```

验收清单：两种 epsilon 取值的行为与注释一致；把 fabs 换成手写的差值函数再跑一遍。

## 13. 与之前和之后的知识的关系

- 往前：[程序结构与基本语法](/c/030-ProgramStructureBasicSyntax) 里你已经在写 int 与 printf，本文回答这些类型到底有多大、边界在哪；
- 往后：变量怎么声明、初始化，未初始化的变量读出来是什么，是 [变量与常量](/c/050-VariableConstant) 的主题；类型混算的完整阶梯在 [运算符与表达式](/c/060-OperatorExpression)；
- 更远：sizeof 配合数组形参的退化陷阱在 [数组详解](/c/120-ArrayDetailed)；用不兼容类型的指针重读同一块内存（严格别名）是未定义行为的深水区，见 [指针深度解析](/c/140-PointerDeep)；结构体成员的排布、填充与对齐在 [内存对齐](/c/220-MemoryAlignmentDeepDive) 逐一打印验证。

## 14. 官方文档

- C 类型分类总览（cppreference C）：https://zh.cppreference.com/w/c/language/types
- 定宽整数类型 int8_t 至 uint64_t（cppreference C）：https://zh.cppreference.com/w/c/types/integer
- 算术类型与整数提升规则（cppreference C）：https://zh.cppreference.com/w/c/language/arithmetic_types
- IEEE 754 位布局图解（Steve Hollasch）：https://steve.hollasch.net/cgindex/coding/ieeefloat.html

## 15. 自我检查

- 能解释同一份 sizes.c 为什么在 64 位 Windows 与 Linux 上打印出不同的 long 大小；
- 能说出 int 的最小宽度保证，并用 limits.h 在自己机器上验证真实边界；
- 能演示无符号回绕与有符号溢出的区别，并用 UBSan 抓到一行带文件名与行号的实录；
- 能画出 double 的 1 + 11 + 52 位段图，解释 0.1 + 0.2 为什么不等于 0.3，并写出 epsilon 比较；
- 拿到一个新需求，能按第 4 节速查表选对类型并说出理由。

## 本章总结

类型 = 一段字节加一种解读。C 把字节数大部分留给平台，只承诺最小宽度：int 至少 16 位，long long 至少 64 位；long 在 64 位平台两大家族分裂，所以跨平台宽度要用 stdint.h 的 int32_t/int64_t 写进类型名。char 身兼字符与小整数，符号性实现定义，装字节请写 unsigned char。溢出时刻两条规则分岔：无符号按 2^N 回绕是良定义，有符号是未定义行为，UBSan 能当场实录。浮点是二进制科学计数法，0.1 天生存不精确，比较靠 epsilon 不靠 ==。选型口诀：一般用 int，大小用 size_t，跨平台宽度用定宽类型，海量样本用 float，其余默认 double。

## 下一步

进入 [变量与常量](/c/050-VariableConstant)：类型给了字节与解读方式，接下来看变量——名字怎么绑定到内存、初始化与未初始化的差别、const 常量怎么写。
