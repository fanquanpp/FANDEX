---
order: 220
title: 内存对齐：struct 的大小为什么不是成员相加
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 从「三个成员手算 6 字节，sizeof 却说 12」出发理解对齐动机，用 alignof 与 offsetof 实验量出三条 padding 规则，学会 #pragma pack 与 C11 _Alignas，附栈溢出调试实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'c/230-AlignmentMemoryLayout'
  - 'c/130-StructAndUnion'
  - 'c/240-BitField'
  - 'c/250-FunctionCallStackFrame'
prerequisites:
  - 'c/010-CZeroBasisStart'
  - 'c/130-StructAndUnion'
---

## 前置知识

- 已完成 [结构体与联合体](/c/130-StructAndUnion)：会声明 struct、用 `.` 和 `->` 访问成员；
- 会编译运行单文件 C 程序（[C 语言零基础起步](/c/010-CZeroBasisStart) 的终端部分即可）。

> 分工说明：220 与 230 合讲结构体的内存布局。本篇是主教学：CPU 为什么要求对齐、三条 padding 规则、alignof/offsetof 怎么用；[布局深水区](/c/230-AlignmentMemoryLayout) 讲工程落地：成员排序优化、跨平台差异、位域的不可移植性、序列化为什么禁用 memcpy。两篇示例不重复。

## 学习目标

读完本文你将能够：

1. 解释 CPU 要求对齐访问的硬件原因，说出「不对齐」在两种架构上的两种下场；
2. 用 alignof 与 offsetof 把任意结构体的对齐值和成员偏移量出来；
3. 用三条 padding 规则手工推算常见结构体的 sizeof，并解释尾部填充为什么存在；
4. 紧凑布局用 `#pragma pack(1)` 并说出代价，更高对齐用 C11 `_Alignas`。

预计 40 到 60 分钟，含 2 组实验与 3 道练习。

## 1. 你现在要解决什么问题

你在写一个联网对战游戏的消息包：1 字节消息类型、4 字节长度、1 字节标志位：

```c
struct Packet {
    char type;      /* 1 字节 */
    int  length;    /* 4 字节 */
    char flag;      /* 1 字节 */
};

printf("%zu\n", sizeof(struct Packet));   /* 放进 main 里编译运行 */
```

预期输出（64 位 Linux/macOS 的 gcc/clang）：

```text
12
```

加起来是 6，sizeof 却报 12——凭空多出 6 个字节。这不是编译器出错，而是「对齐」在起作用；把这 6 个字节的去向弄明白，就是本文的全部内容。

## 2. 为什么需要对齐：CPU 不是按字节读内存的

直觉是「内存一个字节一个字节地存取」，实际不是：CPU 与内存一次搬运一整块——32 位机器常见一次 4 字节，64 位一次 8 字节，且**只能从块边界开始读**。`int` 最好整个躺在一格里。

如果 `int` 的地址是 2（横跨两格），CPU 要么读两格拼接（慢一倍），要么直接拒绝——部分 32 位 ARM、老 SPARC 会触发总线错误当场死亡。x86 走「能凑合但慢」路线：不崩，只慢，还难查。

所以编译器立规矩：**每种类型的地址必须是对齐值的倍数**。int 对齐值 4，double 是 8。补进去的「占位但不使用」的字节，叫填充（padding）。

## 3. 测量工具：alignof 与 offsetof

规矩不能靠猜，C11 给了两把尺子：`alignof` 量一个类型的对齐值，`offsetof` 量一个成员在结构体里的字节偏移。

```c
/* probe.c：把 Packet 的规矩量出来 */
#include <stdio.h>
#include <stddef.h>
#include <stdalign.h>

struct Packet { char type; int length; char flag; };

int main(void) {
    printf("sizeof  = %zu\n", sizeof(struct Packet));
    printf("alignof = %zu\n", alignof(struct Packet));
    printf("type   offset %zu\n", offsetof(struct Packet, type));
    printf("length offset %zu\n", offsetof(struct Packet, length));
    printf("flag   offset %zu\n", offsetof(struct Packet, flag));
    return 0;
}
```

```bash
gcc -Wall -Wextra probe.c -o probe && ./probe
```

预期输出：

```text
sizeof  = 12
alignof = 4
type   offset 0
length offset 4
flag   offset 8
```

画成内存图，多出的 6 个字节当场现形：

```text
偏移   0    1-3       4-7       8     9-11
      +----+-------+---------+-----+-------+
      |type|  填充 |  length |flag |  填充 |
      +----+-------+---------+-----+-------+
       1B    3B       4B       1B     3B      合计 12 字节
```

type 和 flag 之间补 3 字节，flag 之后又补 3 字节，正好 6 字节——全是填充。它们按什么规则放、为什么非放不可，就是下面三条规则。

## 4. 三条 padding 规则

1. **成员对齐**：每个成员的偏移必须是它自己对齐值的倍数，不够就在它前面补。type 占 0 号，length 要求 4 的倍数，于是 1、2、3 号补掉，length 从 4 开始；
2. **整体对齐**：结构体的总大小必须是其最大对齐值的整数倍。flag 结束在 9，最大对齐值是 4，补到 12；
3. **结构体的对齐值等于成员中最大的对齐值**。Packet 里 int 最大是 4，所以 `alignof(struct Packet)` 是 4。

规则 2 的理由藏在数组里：`struct Packet list[10]` 的第二个元素紧跟第一个，若总大小不是对齐值的倍数，它的 `length` 就不再落在 4 的倍数上。**尾部填充不是为了自己，是为了数组里的下一个兄弟。**

用三条规则推一遍第 1 节：type 在 0，length 前补 3、占 4 到 7，flag 在 8，尾部补 3 到 12——与 probe.c 完全吻合。现在你可以预测任何结构体的 sizeof 了。

## 5. 修改实验：调换成员顺序，白捡 4 字节

保持成员不变，只把声明顺序换成 `{ int length; char type; char flag; }`，先按三条规则写出预测再运行验证：length 占 0 到 3，type 占 4，flag 占 5，尾部补到 8。

预期输出：

```text
sizeof = 8
```

12 变 8，省掉三分之一，一行代码没多写。**成员按对齐值从大到小排列**是最有效的免费优化；工程里的排序收益与取舍，[布局深水区](/c/230-AlignmentMemoryLayout) 有完整实验。

## 6. 两个开关：#pragma pack 与 _Alignas

规则是默认值，C 给了改写它的开关。第一个是 `#pragma pack`：把对齐值压到 1，填充全部取消。解析现成的文件格式或硬件寄存器表时常用——格式每个字节都是死的，不容许填充插队：

```c
#pragma pack(push, 1)      /* 记住当前对齐设置，压到 1 */
struct RawFrame {
    char  magic;
    int   size;
    short crc;
};
#pragma pack(pop)          /* 恢复原设置，影响范围只在两行之间 */
```

此时 `sizeof(struct RawFrame)` 是 7（1+4+2），`offsetof(struct RawFrame, size)` 是 1——严丝合缝。代价必须说清：`size` 的地址是 1，不是 4 的倍数，**packed 结构体里充满不对齐的成员**——x86 上只是慢，部分 ARM 上取这种成员的指针再访问可能直接崩溃。规矩：packed 只用于「和外部格式对话」的边界结构体，内部数据结构不要乱用。

第二个是 C11 的 `_Alignas`：反向操作，强制对齐**变大**。缓冲区要交给 SIMD 指令或 DMA 时，16 字节对齐是常见要求。写法：`_Alignas(16) unsigned char buf[16];`，随后打印 `(size_t)((unsigned char *)buf % 16)`，任何一次运行都是 `0`——地址确实落在 16 的边界上。`_Alignas` 写在声明前，作用于那一个对象；堆上的对应物是 C11 的 `aligned_alloc`。

## 7. 常见错误与调试实录

真实事故：把「手算 6 字节」的惯性带进 memcpy，直接把栈写穿。

```c
/* pack_bug.c：按手算的 6 字节开缓冲区，却拷了 12 字节进去 */
#include <stdio.h>
#include <string.h>

struct Packet { char type; int length; char flag; };

int main(void) {
    struct Packet p = {'A', 300, 1};
    unsigned char buf[6];               /* 手算的「6 字节」 */
    memcpy(buf, &p, sizeof p);          /* 实际拷 12 字节：越界 */
    printf("type=%c\n", buf[0]);
    return 0;
}
```

编译（加 `-g -fsanitize=address`）并运行，预期输出（地址与偏移每次不同，关键行如下）：

```text
==31784==ERROR: AddressSanitizer: stack-buffer-overflow on address 0x7ffc0a3b1a52
WRITE of size 12 at 0x7ffc0a3b1a52 thread T0
    #0 0x7f3a5c8d21b9 in __asan_memcpy
    #1 0x5f0a91c2b1f2 in main pack_bug.c:11
  This frame has 2 object(s):
    ...
    [48, 54) 'buf' (line 10) <== Memory access at offset 54 overflows this variable
```

读报错三步：

1. `stack-buffer-overflow` + `WRITE of size 12`——栈上越界**写**，一次写了 12 字节；
2. 栈帧信息指向第 11 行的 memcpy；
3. 报告列出栈上对象，`buf` 只有 6 字节，12 字节的写入冲出了它的边界。

`sizeof p` 是 12 而不是 6——又是对齐。修复：缓冲区大小永远用 `sizeof` 计算；更根本的修法是不 memcpy 整个结构体，逐字段显式编码——为什么，[布局深水区](/c/230-AlignmentMemoryLayout) 用序列化场景讲透。这个 bug 也回答一个高频面试题：**sizeof 永远胜过手算**。

## 8. 实际项目中的使用场景

- 协议与文件格式解析（网络包、固件镜像、存档头）：`#pragma pack(1)` 的正牌主场，配合 `offsetof` 逐字段核对偏移；SIMD 与 DMA 缓冲区用 `_Alignas`；
- 高频结构体数组（游戏实体、粒子池）的排布直接影响缓存命中，工程化处理见 [布局深水区](/c/230-AlignmentMemoryLayout)；
- 什么时候什么都不用做：内部数据结构保持默认对齐、按第 5 节排好成员即可；为省几个字节给所有结构体上 pack，是拿可移植性换戏法。

## 9. 小练习

预测题（5 分钟）：64 位 Linux 上，先按三条规则写出答案，再运行验证：

```c
struct Parse {
    char op;       /* 1 字节 */
    long value;    /* 8 字节 */
    char done;     /* 1 字节 */
};
printf("%zu\n", sizeof(struct Parse));
```

参考答案（先写再看）：24。op 在 0，value 要求 8 的倍数，前面补 7、占 8 到 15；done 在 16；总大小补到最大对齐值 8 的倍数，即 24。

修改题（10 分钟）：给 Packet 再加一个成员 `short crc;`（放在 flag 之后），预测新 sizeof 再验证。验收：保持 12——type 0、length 4 到 7、flag 8、crc 落在 10 到 11，总大小已是 4 的倍数。多出的 2 字节被现有尾部填充吃掉，这是理解规则的最好证明。

修 Bug 题（15 分钟）：下面的存档函数「能跑但读回来是乱码」。存入 length 为 300，读回来却是一个奇怪的数，且没有任何报错。定位并修复：

```c
/* save_bug.c：写入按手算 6 字节，读回按 sizeof 12 字节 */
#include <stdio.h>

struct Packet { char type; int length; char flag; };

void save(FILE *f, const struct Packet *p) {
    fwrite(p, 6, 1, f);            /* 手算大小 */
}

int load(FILE *f, struct Packet *p) {
    return fread(p, sizeof(struct Packet), 1, f) == 1;   /* 真实大小 */
}
```

参考要点：写入只写了前 6 字节（type、3 字节填充、length 的前 2 字节），读回却按 12 字节补齐，字段全部错位。根治不是把 6 改成 12——padding 字节同样不该进文件，正解是逐字段写入或显式编码，这条路在 [布局深水区](/c/230-AlignmentMemoryLayout) 铺好。

## 10. 与之前和之后的知识的关系

- 往前：[结构体与联合体](/c/130-StructAndUnion) 建立 struct 语法，本篇回答「sizeof 为什么大于成员之和」；malloc 大块结构体数组时（[动态内存](/c/200-DynamicMemoryManagement)），对齐决定元素间距；
- 往后：[布局深水区](/c/230-AlignmentMemoryLayout) 把三条规则用于工程：排序省内存、跨平台对照、序列化编码；位域是布局规则的又一特区，专门篇章见 [位域](/c/240-BitField)；
- 旁支：栈上局部变量的排布同样遵守对齐，栈帧全貌见 [函数调用栈帧](/c/250-FunctionCallStackFrame)。

## 11. 官方文档

- alignof 与 _Alignof（cppreference C）：https://zh.cppreference.com/w/c/language/_Alignof
- _Alignas（cppreference C）：https://zh.cppreference.com/w/c/language/_Alignas
- offsetof 手册页：https://man7.org/linux/man-pages/man3/offsetof.3.html

## 12. 自我检查

- 能向同事解释 CPU 为什么要求对齐，以及 x86 与部分 ARM 对不对齐访问的两种态度；
- 能用三条规则手工推算 struct Parse 这类结构体的 sizeof，并说出尾部填充为谁而设；
- 能用 alignof 与 offsetof 验证自己的推算；
- 能说出 #pragma pack 的适用场景与代价，以及 _Alignas 的方向（把对齐调大）。

## 本章总结

对齐源于硬件按块读内存的物理事实：每种类型的地址必须落在其对齐值的倍数上，编译器用 padding 保证这一点。三条规则（成员对齐、整体补齐、对齐值取最大）覆盖全部推算，尾部填充为的是数组里的下一个元素。`#pragma pack(1)` 取消填充用于格式对话，`_Alignas` 把对齐调大用于 SIMD 与 DMA。sizeof 永远胜过手算。规则如何变成工程收益，下一篇见。

## 下一步

进入 [布局深水区](/c/230-AlignmentMemoryLayout)：成员怎么排序最省内存、换一台机器布局会不会变、为什么存档与网络传输禁止直接 memcpy 结构体。
