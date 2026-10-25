---
order: 80
title: 位运算：掩码、移位与位级思维
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 用「8 个开关塞进 1 个字节」掌握六个位运算符与掩码四件套：权限标志实战贯穿全文，-8 >> 1 的算术/逻辑右移实验、UBSan 当场抓越界移位、Brian Kernighan 置位计数、异或交换的同地址陷阱、大小端探针小实验，最后看 C23 的 0b 字面量、数字分隔符与 stdbit.h 函数族。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'c/240-BitField'
  - 'c/260-ConstAndVolatileQualifiers'
  - 'c/230-AlignmentMemoryLayout'
  - 'c/520-C23CoreFeatures'
  - 'c/530-C23NewFeatures'
  - 'c/550-EmbeddedCProgramming'
prerequisites:
  - 'c/060-OperatorExpression'
  - 'c/040-DataTypeDetailed'
---

## 前置知识

- 已完成 [运算符与表达式](/c/060-OperatorExpression)：知道运算符优先级、会写 `if` 与 `while` 表达式；
- 已完成 [数据类型详解](/c/040-DataTypeDetailed)：知道 `int` 与 `unsigned int` 的区别、听说过补码。

没读过 040 也能往下读，本文用到补码的地方会当场用 8 位小例子讲明白。

> 分工说明：070 与 240 合讲「位」。本篇讲**按位运算**——六个运算符、掩码、移位与位级技巧，建立「把整数摊开成比特看」的思维；[位域](/c/240-BitField) 收拢全部位域内容——`struct` 里的 `: 宽度` 语法、存储分配的实现定义性、可移植性边界。本篇只在一句话里引出位域，语法与布局都在那一篇。

## 学习目标

读完本文你将能够：

1. 在二进制、十进制、十六进制之间换算，并用一个打印函数把任意 `unsigned int` 按位摊开；
2. 说出六个位运算符的逐位规则，徒手写出第 n 位置位、清零、翻转、检测的四个公式；
3. 用一组权限标志完成「授予、撤销、翻转、查询」的组合操作；
4. 说出移位的三个边界：左移进符号位、负数右移是实现定义、移位计数超宽是未定义行为，并用 UBSan 抓出越界移位；
5. 实现 Brian Kernighan 置位计数与「2 的幂」判断，说出异或交换法在同地址时的自杀陷阱。

预计 45 到 60 分钟，含 3 组动手实验、1 道预测题与 1 道挑战题。

## 1. 问题引入：8 个开关塞进 1 个字节

你在写一块开发板的控制程序：板上有 8 路继电器，每路要么开要么关。第一反应是开 8 个变量 `int relay0, relay1, ... relay7;`——8 个 `int` 占 32 个字节，换 `unsigned char` 也要 8 个字节。但每路开关只有两种状态，一个比特就够了——而一个字节有 8 个比特。理想写法是**一个字节装下全部 8 路开关**：

```c
/* switches.c：8 个开关塞进 1 个字节 */
#include <stdio.h>

int main(void) {
    unsigned char switches = 0;        /* 0000 0000：全部关闭 */
    switches |= 0x04;                  /* 打开 2 号开关（0x04 = 0000 0100） */
    printf("switches = 0x%02X\n", switches);
    if (switches & 0x04) {
        printf("No.2 is on\n");
    }
    switches &= ~0x04;                 /* 关闭 2 号开关 */
    printf("switches = 0x%02X\n", switches);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g switches.c -o switches
./switches
```

预期输出：

```text
switches = 0x04
No.2 is on
switches = 0x00
```

`|=`、`&`、`&= ~` 这三个符号就是「打开、查询、关闭」某一路开关的全部语法。这就是**位运算**：直接对整数的二进制位做操作。它省的往往不是那点内存，而是表达力——「第 3 路开、第 5 路关、其余不动」一句话就是一行代码。硬件寄存器、权限标志、协议字段，底层 C 代码里到处是这种按位思维。顺带留个悬念：C 圈流传一个「不加临时变量交换两个数」的把戏 `x ^= y; y ^= x; x ^= y;`，它有一个能自杀的陷阱，第 6 节当场拆穿。

## 2. 二进制思维：先把 int 摊开看

谈位运算之前得先会**看**一个整数。同一个值有三种常用写法：

| 十进制 | 二进制 | 十六进制 |
| --- | --- | --- |
| 5 | 0101 | 0x5 |
| 214 | 1101 0110 | 0xD6 |
| 255 | 1111 1111 | 0xFF |

关键换算规律：**每 4 个二进制位恰好对应 1 个十六进制位**（4 位能表示 0 到 15，正好一个十六进制位）。C 里二进制字面量写 `0b` 前缀、十六进制写 `0x` 前缀（`0b` 是 C23 正式标准化的，GCC/Clang 更早就支持，第 7 节细说）。

坏消息是 `printf` 没有二进制格式符，补一个打印函数，它将贯穿全文：

```c
/* bits.c：把一个整数摊开看 */
#include <stdio.h>

void print_bits(unsigned int v, int width) {
    for (int i = width - 1; i >= 0; i--) {
        putchar('0' + (int)((v >> i) & 1u));   /* 取出第 i 位打印 */
    }
}

int main(void) {
    unsigned int v = 0xD6;
    printf("十进制 %u = 0x%X = 0b", v, v);
    print_bits(v, 8);
    putchar('\n');
    return 0;
}
```

预期输出：

```text
十进制 214 = 0xD6 = 0b11010110
```

`print_bits` 的原理现在看不懂没关系，它只用了第 3、5 节要讲的 `>>` 与 `&`：从最高位开始，每次把第 i 位挪到最低位再取出。本文之后所有实验都用它当「显微镜」。修改实验：把宽度 8 改成 16 再跑，看输出变成什么样。

## 3. 六个运算符逐个上手

C 有六个位运算符：`&`、`|`、`^`、`~`、`<<`、`>>`。前三个是「逐位运算」——两个数的对应位独立运算，互不进位，真值表一张看完：

| a | b | a & b | a \| b | a ^ b |
| --- | --- | --- | --- | --- |
| 0 | 0 | 0 | 0 | 0 |
| 0 | 1 | 0 | 1 | 1 |
| 1 | 0 | 0 | 1 | 1 |
| 1 | 1 | 1 | 1 | 0 |

### 3.1 按位与 `&`：两边都是 1 才是 1

```text
    0000 0101   (5)
  & 0000 0011   (3)
  = 0000 0001   (1)
```

`&` 的常用角色是**筛选**：`x & mask` 只保留 mask 中为 1 的那些位。

### 3.2 按位或 `|`：有 1 就是 1

`|` 的常用角色是**合并**与**置位**：`x | mask` 把 mask 中为 1 的位强行点亮，其余位不动。

### 3.3 按位异或 `^`：不同才是 1

异或有三条黄金性质：`x ^ x == 0`（自己翻自己全灭）、`x ^ 0 == x`（翻零次等于没翻）、交换律与结合律（谁跟谁配对无所谓）。第 6 节的交换把戏与差集运算都建立在这三条上。

### 3.4 按位取反 `~`：0 变 1，1 变 0

`~` 是唯一的一元位运算符，把每一位翻转。它的结果**依赖类型宽度**：

```c
unsigned char c = 0x0F;
unsigned char d = (unsigned char)~c;   /* 8 位翻转：1111 0000 = 0xF0 */
```

而对 `int` 取反，`~5` 是 32 位全宽翻转，得到 `0xFFFFFFFA`，按补码解读就是 -6——补码下 `~x == -x - 1` 恒成立。这就是第 4 节清位公式里 `~(1u << n)` 能得到「只有第 n 位是 0、其余全 1」掩码的原因。

### 3.5 左移 `<<` 与右移 `>>`：整串挪动

`x << n` 把所有位向左挪 n 格，右边空出的补 0，左边挤出去的丢弃；`x >> n` 反向挪动。机械规则先记这一句，**挪出去的数去哪了、负数怎么挪**，是第 5 节的全部内容。

### 3.6 一次跑一遍

```c
/* ops.c：四个逐位运算符各来一发（print_bits 定义见第 2 节，拷进来即可编译） */
#include <stdio.h>

void print_bits(unsigned int v, int width);

int main(void) {
    unsigned int samples[] = { 5 & 3, 5 | 3, 5 ^ 3, ~5 & 0xFFu };
    const char *names[] = { "5 & 3", "5 | 3", "5 ^ 3", "~5 & 0xFF" };
    for (int i = 0; i < 4; i++) {
        printf("%-10s = 0x%02X = 0b", names[i], samples[i]);
        print_bits(samples[i], 8);
        putchar('\n');
    }
    return 0;
}
```

预期输出：

```text
5 & 3      = 0x01 = 0b00000001
5 | 3      = 0x07 = 0b00000111
5 ^ 3      = 0x06 = 0b00000110
~5 & 0xFF  = 0xFA = 0b11111010
```

修改实验：把 `samples` 里的 `5` 全换成 `12`（`1100`），先在纸上按真值表逐位算出四个结果，再运行对照。遮住这段代码，你能凭 3.1 到 3.4 的规则自己重写 `samples` 的四个表达式吗？

## 4. 掩码四件套：第 n 位的置、清、翻、测

**掩码（mask）**是一张「选中哪些位」的图案：mask 里为 1 的位是本次操作的对象，为 0 的位保持原样。构造「第 n 位」掩码用移位：`1u << n`。配合第 3 节四个运算符，得到位操作的四件套：

| 操作 | 公式 | 原理 |
| --- | --- | --- |
| 置位（置 1） | `flags \|= 1u << n;` | 或上选中位：选中位强变 1 |
| 清零（置 0） | `flags &= ~(1u << n);` | 与上反选位：选中位清 0，其余全 1 保留 |
| 翻转 | `flags ^= 1u << n;` | 异或选中位：同 0 异 1，正好翻转 |
| 检测 | `(flags & (1u << n)) != 0` | 与上选中位：为 0 就是没开 |

四件套的正面战场是**权限标志**。一套文件权限有读、写、执行、隐藏、系统五个开关，用五个宏各占一位：

```c
/* perm.c：权限标志四件套 */
#include <stdio.h>

#define PERM_READ    (1u << 0)   /* 0x01 可读 */
#define PERM_WRITE   (1u << 1)   /* 0x02 可写 */
#define PERM_EXEC    (1u << 2)   /* 0x04 可执行 */
#define PERM_HIDDEN  (1u << 3)   /* 0x08 隐藏 */
#define PERM_SYSTEM  (1u << 4)   /* 0x10 系统文件 */

unsigned int perm_grant(unsigned int perm, unsigned int flags) { return perm | flags; }

unsigned int perm_revoke(unsigned int perm, unsigned int flags) { return perm & ~flags; }

int perm_has(unsigned int perm, unsigned int flag) { return (perm & flag) != 0; }

int main(void) {
    unsigned int perm = 0;
    perm = perm_grant(perm, PERM_READ | PERM_WRITE);
    printf("perm = 0x%02X\n", perm);                       /* 0x03 */
    printf("read? %s  exec? %s\n",
           perm_has(perm, PERM_READ) ? "yes" : "no",
           perm_has(perm, PERM_EXEC) ? "yes" : "no");      /* yes  no */

    perm = perm_revoke(perm, PERM_WRITE) | PERM_EXEC;
    printf("perm = 0x%02X\n", perm);                       /* 0x05 */

    for (int i = 0; i < 2; i++) {
        perm ^= PERM_HIDDEN;           /* 翻转两次：加上隐藏再取消 */
        printf("perm = 0x%02X\n", perm);                   /* 0x0D, 0x05 */
    }
    return 0;
}
```

预期输出：

```text
perm = 0x03
read? yes  exec? no
perm = 0x05
perm = 0x0D
perm = 0x05
```

这套玩法就是 Unix 文件权限的底层：`rwxr-xr-x` 是 9 个标志位，按 3 位一组读成八进制 `0755`（`chmod 755 file` 的 755 就是它）；`0644` 是 `110 100 100`。掩码四件套也适用于**连续多位**字段——提取与插入：

```c
/* 从第 start 位起取 n 位 */
unsigned int extract_bits(unsigned int v, int start, int n) {
    return (v >> start) & ((1u << n) - 1u);       /* 挪到最低位，再截 n 个 1 */
}

/* 把 bits 写进第 start 位起的 n 位，其余位不动 */
unsigned int insert_bits(unsigned int v, int start, int n, unsigned int bits) {
    unsigned int mask = ((1u << n) - 1u) << start;
    return (v & ~mask) | ((bits << start) & mask);
}
```

`(1u << n) - 1u` 是「n 个 1」的通用构造式：`1u << 4` 是 `1 0000`，减 1 得 `1111`。验证：`extract_bits(0xABCD1234u, 8, 8)` 取第 8 到 15 位，得 `0x12`；`insert_bits` 先清掉目标区再填入新值，是寄存器驱动的标准写法。修改实验：把 `perm_revoke` 的实现换成 `perm ^ flags` 会发生什么？没被授予过的权限也会被「翻转」成已授予——这就是置位用 `|`、只有真正的开关语义才用 `^` 的原因。

## 5. 移位：等价乘除 2 的边界与三个大坑

### 5.1 左移等于乘 2，直到它不等于

对**无符号**类型，`x << n` 就是 `x` 乘 2 的 n 次方后丢弃高位溢出（模 2 的 32 次方回绕），标准明文保证；右移 `x >> n` 就是除以 2 的 n 次方再取整。这也是很多代码用 `1u << 10` 写 1024、用 `x >> 4` 代替除以 16 的原因：

```c
/* shift.c：左移右移的基本面 */
#include <stdio.h>

int main(void) {
    printf("5u << 1 = %u, 5u << 3 = %u, 40u >> 3 = %u\n",
           5u << 1, 5u << 3, 40u >> 3);            /* 10, 40, 5 */
    printf("1u << 31 = %u\n", 1u << 31);           /* 2147483648：无符号下完全合法 */
    return 0;
}
```

边界在**有符号**一侧。`int` 的最高位是符号位，`1 << 31` 本意是 2147483648，可它装不进 32 位 `int`（上限 2147483647）——按标准，有符号左移只在「左操作数非负且结果可表示」时有定义，其余一律未定义行为。对比写法：`1 << 31` 是 UB（结果不可表示），`1u << 31` 恒定 2147483648u（无符号回绕规则兜底）。写移位常量时带上 `u` 后缀，是最便宜的保险；左操作数为负的左移同样落进「否则未定义」的口袋——不要左移负数。

### 5.2 负数右移：算术还是逻辑，标准说「看实现」

右移的坑更深：对**负数**右移，高位该补符号位（算术右移，保持负号）还是补 0（逻辑右移，变成大正数）？标准把选择权交给实现（C17 6.5.7：结果是实现定义的）。GCC、Clang、MSVC 在有符号类型上都选算术右移，但**可移植代码不能赌**。用 8 位小例子看两种走向（`-8` 的补码）：

```text
-8 的 8 位补码：  1111 1000
算术右移 1 位：   1111 1100   → 仍是负数，值为 -4（高位补符号位 1）
逻辑右移 1 位：   0111 1100   → 变成正数，值为 124（高位补 0）
```

```c
/* shift_neg.c：负数右移实验 */
#include <stdio.h>

int main(void) {
    int a = -8;
    printf("a >> 1 = %d\n", a >> 1);         /* 主流平台：-4；标准只保证「实现定义」 */

    unsigned int u = (unsigned int)a >> 1;   /* 转无符号后右移：必然逻辑右移 */
    printf("(unsigned)a >> 1 = %u\n", u);    /* 恒为 2147483644 = 0x7FFFFFFC */
    return 0;
}
```

预期输出：

```text
a >> 1 = -4
(unsigned)a >> 1 = 2147483644
```

要「除以 2 的幂」且值可能为负时，算术右移恰好给出向下取整的除法（-8 >> 1 = -4，-7 >> 1 = -4 而不是 -3）；但要**跨平台一致的位级行为**，就先转成无符号再移。修改实验：把 `-8` 改成 `-1` 再跑，算术右移下 `-1 >> 1` 仍是 -1——全 1 的串怎么挪都还是全 1。

### 5.3 移位计数越宽：UB，UBSan 当场抓

第三条边界最容易被忽视：**移位计数是负数，或大于等于提升后类型的位宽，就是未定义行为**。32 位 `int` 移 32 位？不行：

```c
/* badshift.c */
#include <stdio.h>

int main(void) {
    unsigned int x = 1u;
    int n = 32;
    printf("x << n = %u\n", x << n);   /* 计数 32 >= 宽度 32：UB */
    return 0;
}
```

```bash
gcc -Wall -Wextra -g -fsanitize=undefined badshift.c -o badshift
./badshift
```

典型输出（GCC 与 Clang 的 libubsan 措辞一致，行列号可能有差）：

```text
badshift.c:6:26: runtime error: shift exponent 32 is too large for 32-bit type 'unsigned int'
x << n = 1
```

逐行读：第一行点名事故——移位指数 32 对 32 位类型太大；第二行的 `1` 不是标准给的答案，而是 x86 硬件移位器只取计数低 5 位（32 mod 32 = 0，等于没移）的侥幸产物。各硬件对越界计数的行为五花八门，编译器还可能借 UB 做优化，所以标准干脆留白——这与「有符号溢出是 UB」同源：**标准只在所有硬件能廉价达成一致的地方给承诺**（参见 [内存深水区](/c/210-ProcessMemoryLayoutAndErrors) 对 UB 的展开）。修法只有一种：移位前保证 `0 <= n < 位宽`。

## 6. 经典技巧与两个著名陷阱

### 6.1 统计置位数：Brian Kernighan 法

朴素做法逐位扫 32 次。Kernighan 法每轮用 `n & (n - 1)` 直接**清掉最低位的那个 1**，循环次数等于 1 的个数：

```text
n      = 1101 0100
n - 1  = 1101 0011   （最低位的 1 借位变 0，它右边的 0 全变 1）
n&(n-1)= 1101 0000   （最低位的 1 被精确清除）
```

```c
/* tricks.c */
#include <stdio.h>

int popcount(unsigned int n) {       /* Brian Kernighan */
    int count = 0;
    while (n != 0) {
        n &= n - 1u;
        count++;
    }
    return count;
}

int is_power_of_2(unsigned int n) {
    return n != 0u && (n & (n - 1u)) == 0u;
}

int main(void) {
    printf("0b11010110 有 %d 个 1\n", popcount(0b11010110u));   /* 5 */
    printf("16 是 2 的幂? %d\n", is_power_of_2(16u));           /* 1 */
    return 0;
}
```

「2 的幂」判断是同一条公式的直接推论：2 的幂恰好只有一个 1，清掉它就该归零，别忘排除 0。串行通信里的**奇偶校验**也是这套手法——数 1 的个数是奇是偶，循环体换成 `parity ^= 1` 即可。顺带一条同门公式：`n & (0u - n)` 单独捞出最低位的 1（补码的负数是取反加一，与原值相与恰好只剩它），树状数组的灵魂 lowbit，先混个眼熟。

### 6.2 陷阱一：异或交换的同地址自杀

```c
/* swaptrap.c */
#include <stdio.h>

void swap_bad(int *a, int *b) {
    *a ^= *b; *b ^= *a; *a ^= *b;   /* 若 a 与 b 指向同一变量：自己翻自己，归零 */
}

void swap_safe(int *a, int *b) {
    if (a == b) return;             /* 保险丝：同一地址直接返回 */
    *a ^= *b; *b ^= *a; *a ^= *b;
}

int main(void) {
    int x = 10;
    swap_bad(&x, &x);
    printf("swap_bad 后 x = %d\n", x);      /* 0，而不是 10 */
    int a = 1, b = 2;
    swap_safe(&a, &b);
    printf("a = %d, b = %d\n", a, b);       /* 2 1 */
    return 0;
}
```

推演一遍 `swap_bad(&x, &x)`：第一步 `x ^= x` 利用 `x ^ x == 0` 直接归零，后两步在同值上空转——数据丢了。真实事故现场是 `swap(arr, i, j)` 在 `i == j` 时把数组元素清零。结论：日常代码老老实实用临时变量；异或交换只值得当「性质演示题」记住，记的时候必须连陷阱一起记。

### 6.3 陷阱二：字节顺序，用位运算做个探针

多字节整数在内存里怎么摆，取决于平台是**小端**（低字节放低地址）还是**大端**（高字节放低地址）。一个联合体探针当场验出来：

```c
/* endian.c */
#include <stdio.h>

int main(void) {
    union { unsigned int value; unsigned char bytes[4]; } probe = { .value = 0x01020304u };

    printf("bytes[0] = 0x%02X -> %s 端\n", probe.bytes[0],
           probe.bytes[0] == 0x04 ? "小" : "大");
    return 0;
}
```

x86 与 ARM 的主流 Linux/Windows 环境输出 `bytes[0] = 0x04 -> 小端`。字节序影响的是「字节在内存里的排法」，而位运算操作的是「值本身的位」——所以本篇的掩码公式在任何端上都成立；一旦涉及把内存按字节倒出来看（序列化、协议、文件格式），端序就成了主角，展开见 [内存布局](/c/230-AlignmentMemoryLayout)。

## 7. C23 新料：0b 字面量、数字分隔符与 stdbit.h

C23 把两件编译器界的既成事实收编进标准，又带来一整套标准位函数：

- **二进制字面量**：`0b10101010`，与 `0x`、八进制 `0` 前缀并列（本文示例一直在用）；
- **数字分隔符**：用单引号分组，`1'000'000`、`0b1010'1010`，纯可读性糖，不改变值；
- **`<stdbit.h>` 函数族**：C23 新头文件，把过去散落在 `__builtin_popcount` 这类编译器内置函数（GCC/Clang 提供）里的位操作标准化。命名规律是 `stdc_ + 功能 + 后缀`，后缀 `_uc/_us/_ui/_ul/_ull` 对应五种无符号类型，另有不加后缀的类型泛型宏自动按实参类型分发。

| 函数（以 `_ui` 版为例） | 含义 | `x = 0b10100u`（20）时 |
| --- | --- | --- |
| `stdc_count_ones` | 1 的个数 | 2 |
| `stdc_count_zeros` | 0 的个数 | 30 |
| `stdc_leading_zeros` | 前导 0 个数 | 27 |
| `stdc_trailing_zeros` | 尾随 0 个数 | 2 |
| `stdc_bit_width` | 表示所需位数 | 5 |
| `stdc_bit_floor` | 不超过 x 的最大 2 的幂（返回值本身） | 16 |
| `stdc_bit_ceil` | 不小于 x 的最小 2 的幂 | 32 |
| `stdc_has_single_bit` | 是否恰有一个 1（即 2 的幂） | 0 |

```c
/* stdbit_demo.c：需要 GCC 14+（glibc 2.39+ 提供该头文件）等较新工具链 */
#include <stdio.h>
#include <stdbit.h>

int main(void) {
    unsigned int x = 0b1'0100u;                            /* 数字分隔符写法 */
    printf("count_ones = %u\n", stdc_count_ones(x));       /* 2 */
    printf("bit_width  = %u\n", stdc_bit_width(x));        /* 5 */
    printf("bit_floor  = %u\n", stdc_bit_floor(x));        /* 16 */
    printf("has_single_bit = %d\n", stdc_has_single_bit(x) ? 1 : 0);  /* 0 */
    return 0;
}
```

本文手写的 `popcount`、`is_power_of_2` 在标准库里各有一个对应函数——手写版的价值在于你懂了原理，标准版的价值在于编译器能把它翻成单条硬件指令。C23 其余新特性（`_BitInt(N)` 位精确整数、`bool` 关键字化等）见 [C23 与 C2y](/c/520-C23CoreFeatures) 与 [C23 新特性](/c/530-C23NewFeatures)。

至于**位域**——把一个 `struct` 的成员精确到「占 3 个比特」的语法，本文到这里只留一句话：它让「8 个开关塞 1 个字节」写起来更像普通结构体，但布局由实现说了算。全部内容在 [位域](/c/240-BitField)。

## 8. 常见错误与调试实录

### 8.1 整数提升：unsigned char 一进表达式就变 int

```c
unsigned char x = 0x80;             /* 1000 0000 */
unsigned int shifted = x << 24;     /* 本意：把 0x80 挪到最高字节 —— UB！ */
```

报错没有——但这是未定义行为。按整数提升规则，`unsigned char` 参与表达式先升格为 `int`：`0x80` 变成 `0x00000080`，`128 << 24` 等于 2 的 31 次方，超出 `INT_MAX`，正好踩中 5.1 节的有符号左移 UB。修法是把左操作数先变成无符号：`unsigned int shifted = (unsigned int)x << 24;`（无符号回绕规则接管，合法）。记住口诀：**小类型没有位运算，只有先提升再运算**。同理 `flags &= ~0x80` 之所以安全，是因为 `~` 在 `int` 上算完后赋回 `unsigned char` 时恰好截回正确结果——靠的是运气与 8 位的巧合，而不是类型推理。同类保险还有一条：**构造掩码一律写 `1u`**，`1 << 31` 与 `(1 << n) - 1` 在 n 取 31 时都会炸（5.1、5.3 节）。

### 8.2 优先级：`&` 比 `==` 低

```c
if (flags & PERM_READ == 0) {   /* 实际解析成 flags & (PERM_READ == 0) */
```

`==` 的优先级高于 `&`，这行代码判断的是「常量 1 是否为 0」，永远为假。`gcc -Wall` 会给出 `suggest parentheses around comparison in operand of '&'` 的警告。位运算与相等比较混用时，两边都加括号：`if ((flags & PERM_READ) == 0)`。

## 9. 实际项目中的使用场景

- **硬件寄存器**：嵌入式驱动里外设寄存器的每一位都有名字（使能、模式、中断标志），驱动代码就是掩码四件套的连招；真硬件上寄存器还要加 `volatile` 修饰，见 [volatile 与 const 深水区](/c/260-ConstAndVolatileQualifiers)、[嵌入式 C 编程](/c/550-EmbeddedCProgramming)；
- **数据打包**：把 RGBA 四个 8 位通道压进一个 32 位颜色值——`(a << 24) | (r << 16) | (g << 8) | b`，解包用 `extract_bits` 反向取出；图标、协议头、传感器数据的「多字段合一」同型；
- **集合与位图**：32 个元素以内的集合用一个 `unsigned int` 存——添加 `s \|= 1u << e`、删除 `s &= ~(1u << e)`、并集 `a | b`、交集 `a & b`、差集 `a & ~b`；更大的开关阵列开一个字节数组，第 i 位落在 `data[i / 8]` 的第 `i % 8` 位——`data[i / 8] \|= (unsigned char)(1u << (i % 8))`；动态分配版本遵守 [动态内存](/c/200-DynamicMemoryManagement) 的判 NULL 与释放纪律；
- **哈希与校验**：FNV-1a 之类哈希以 `^` 与乘法搅位；串口协议用奇偶校验位查传输出错，都是本篇手法的直接应用。

## 10. 小练习

预测题（5 分钟）：先写下答案再运行验证：

```c
unsigned int x = 0x00000001u;
x |= 1u << 3;
x ^= 0x0000000Fu;
x &= ~(1u << 1);
printf("0x%08X\n", x);
```

参考答案（先写再看）：`0x01 | 0x08 = 0x09`；`0x09 ^ 0x0F = 0x06`；`0x06 & ~0x02 = 0x04`。输出 `0x00000004`。三步分别是置位、低 4 位翻转、清位——掩码四件套连招。

挑战题（30 分钟，不看答案先动手）：写 `unsigned int reverse_bits(unsigned int n)`，把 32 个位左右镜像：`reverse_bits(0x00000001u)` 应返回 `0x80000000u`。

提示（思路方向）：参考 `print_bits` 的视角——从一端逐位取出，按相反顺序塞进另一个变量；循环 32 次。

展开（关键 API）：循环体三行——`result = (result << 1) | (n & 1u);` 先腾出空位，`n >>= 1;` 丢掉已处理的位；最后返回 `result`。

验收清单：`reverse_bits(0x00000001u) == 0x80000000u`；`reverse_bits(0xF0F0F0F0u) == 0x0F0F0F0Fu`（对称样例）；用 `print_bits(reverse_bits(v), 32)` 肉眼核对一个不对称值。

## 11. 与之前和之后的知识的关系

- 往前：[运算符与表达式](/c/060-OperatorExpression) 的优先级与求值规则是 8.2 节事故的裁判；[数据类型详解](/c/040-DataTypeDetailed) 的补码表示解释了 `~5 == -6` 与算术右移；
- 旁支：把「位级成员」写进结构体的语法是位域，见 [位域](/c/240-BitField)；字节序与结构体排布见 [内存布局](/c/230-AlignmentMemoryLayout)；`volatile` 寄存器操作见 [volatile 与 const 深水区](/c/260-ConstAndVolatileQualifiers)；
- 往后：C23 的 `stdbit.h` 只是 C23 冰山一角，全景见 [C23 与 C2y](/c/520-C23CoreFeatures)、[C23 新特性](/c/530-C23NewFeatures)。

## 12. 官方文档

- 移位与位运算符的标准语义（含负数右移、计数越界规则）：https://en.cppreference.com/w/c/language/operator_arithmetic
- C23 `<stdbit.h>` 头文件总览（函数族与 `__STDC_VERSION_STDBIT_H__` 宏）：https://en.cppreference.com/w/c/header/stdbit
- Beej's Guide to C Programming（位运算章节的入门讲法可对照）：https://beej.us/guide/bgc/

## 13. 自我检查

- 能把任意 unsigned 值在二进制与十六进制间换算，并默写 `print_bits` 的循环体；
- 能徒手写出第 n 位置位、清零、翻转、检测四个公式，并说出各自用哪个运算符、为什么；
- 能向同事讲清三件事：负数右移为什么不能赌、`1 << 31` 与 `1u << 31` 差在哪、UBSan 怎么抓越界移位；
- 能实现 Kernighan 置位计数与 2 的幂判断，并说出异或交换在 `a == b` 时为什么自杀。

## 本章总结

位运算是把整数摊开成比特后的算术：`&` 筛选、`|` 合并、`^` 翻转、`~` 取反、`<<` `>>` 挪动。掩码四件套（`|=` 置位、`&= ~` 清零、`^=` 翻转、`&` 检测）是所有位级代码的基本功，权限标志是它的正面战场。移位的三条边界：左移有符号进符号位是 UB（写 `1u << 31`）、负数右移实现定义（可移植就先转无符号）、计数越宽是 UB（UBSan 当场抓）。经典技巧里，`n & (n - 1)` 一条公式撑起置位计数与 2 的幂判断；异或交换记住同地址陷阱；字节序用联合体探针验。C23 把 `0b` 字面量、数字分隔符与 `stdbit.h` 函数族收进标准，手写技巧从此有了标准名字。

## 下一步

进入 [控制流程](/c/080-ControlFlow)：位级积木备齐了，接下来给程序装上骨架——分支与循环，让「检测到位再动作」真正跑起来。
