---
order: 50
title: 位运算与位域
module: c
category: C
difficulty: intermediate
description: 位操作与位域结构
author: fanquanpp
updated: '2026-06-14'
related:
  - c/数据类型详解
  - c/变量与常量
  - c/运算符与表达式
  - c/枚举与typedef
prerequisites:
  - c/概述
---

## 概述

位运算是直接对整数的二进制位进行操作的运算方式，是C语言接近硬件底层的核心能力之一。通过位运算，程序员可以用最少的指令完成标志管理、数据压缩、硬件寄存器操控等任务。位域则是C语言结构体的特殊成员，允许以位为单位指定成员的存储宽度，在内存受限的嵌入式场景中尤为实用。两者结合使用，是编写高效底层代码的基本功。

## 基础概念

### 二进制基础

计算机中所有数据以二进制存储，理解位运算需要先熟悉二进制表示：

```c
/*
 * 十进制 5 的二进制表示（8位）: 0000 0101
 * 十进制 3 的二进制表示（8位）: 0000 0011
 * 十进制 12 的二进制表示（8位）: 0000 1100
 *
 * 最高位为符号位（有符号数）: 0 表示正数，1 表示负数
 * 无符号数所有位均为数值位
 */
unsigned char a = 5;   /* 0000 0101 */
unsigned char b = 3;   /* 0000 0011 */
```

### 六种位运算符

| 运算符 | 名称     | 说明                      | 示例          |
| ------ | -------- | ------------------------- | ------------- |
| `&`    | 按位与   | 两位均为1时结果为1        | `5 & 3` = 1   |
| `\|`   | 按位或   | 任一位为1时结果为1        | `5 \| 3` = 7  |
| `^`    | 按位异或 | 两位不同时结果为1         | `5 ^ 3` = 6   |
| `~`    | 按位取反 | 0变1，1变0                | `~5` = -6     |
| `<<`   | 左移     | 各位左移，低位补0         | `5 << 1` = 10 |
| `>>`   | 右移     | 各位右移，高位补符号位或0 | `5 >> 1` = 2  |

### 按位与（&）

按位与的规则：两位均为1时结果才为1。常用于清除（掩码）和检测特定位：

```c
unsigned char flags = 0b11010110;  /* 0xD6 */

/* 掩码：只保留低4位 */
unsigned char low4 = flags & 0x0F;  /* 0b00000110 = 0x06 */

/* 检测第5位是否为1 */
if (flags & (1 << 5)) {
    /* 第5位已设置 */
}

/* 清除第1位 */
flags = flags & ~(1 << 1);  /* 将第1位清零，其余不变 */
```

### 按位或（|）

按位或的规则：任一位为1时结果为1。常用于设置特定位：

```c
unsigned char flags = 0b11010110;

/* 设置第0位 */
flags = flags | (1 << 0);  /* 0b11010111 */

/* 同时设置多个位 */
flags = flags | 0x0F;  /* 低4位全部置1 */
```

### 按位异或（^）

按位异或的规则：两位不同时结果为1，相同时为0。常用于翻转位和无临时变量交换：

```c
unsigned char a = 0b11010110;

/* 翻转第3位 */
a = a ^ (1 << 3);  /* 第3位取反，其余不变 */

/* 异或的重要性质: x ^ x = 0, x ^ 0 = x */
/* 利用异或交换两个变量（不推荐，可读性差） */
int x = 10, y = 20;
x = x ^ y;
y = x ^ y;  /* y = (x^y)^y = x */
x = x ^ y;  /* x = (x^y)^x = y */
```

### 按位取反（~）

按位取反将0变1、1变0。注意结果依赖于数据类型的位数：

```c
unsigned char a = 0b00001111;  /* 0x0F */
unsigned char b = ~a;           /* 0b11110000 = 0xF0 */

/* 对于有符号数，取反结果与补码表示有关 */
signed char c = 5;     /* 0000 0101 */
signed char d = ~c;    /* 1111 1010 = -6（补码） */
```

### 左移（<<）与右移（>>）

左移相当于乘以2的幂次，右移相当于除以2的幂次（对于无符号数）：

```c
unsigned int a = 5;

/* 左移1位相当于乘2 */
a << 1;  /* 10 */
a << 2;  /* 20 */
a << 3;  /* 40 */

/* 右移1位相当于除2（无符号数） */
unsigned int b = 40;
b >> 1;  /* 20 */
b >> 2;  /* 10 */
b >> 3;  /* 5  */

/* 有符号数的右移：算术右移 vs 逻辑右移（实现定义） */
signed char c = -8;   /* 1111 1000（补码） */
c >> 1;               /* 可能是 1111 1100（算术右移，-4） */
                      /* 也可能是 0111 1100（逻辑右移，124） */
                      /* 大多数现代编译器使用算术右移 */
```

### 位域的概念

位域是结构体中指定存储位数的成员，语法为 `类型 成员名 : 位数`：

```c
struct Flags {
    unsigned int is_active : 1;   /* 1位，0或1 */
    unsigned int priority  : 3;   /* 3位，0-7 */
    unsigned int mode      : 4;   /* 4位，0-15 */
    unsigned int reserved  : 24;  /* 24位保留 */
};

sizeof(struct Flags);  /* 4字节，共32位 */
```

位域的存储类型通常为 `unsigned int` 或 `int`，也可以使用 `_Bool`、`signed int` 等。C99 之后还允许其他标准整数类型。

## 快速上手

### 位操作基本模板

设置、清除、翻转、检测位是位运算的四个基本操作：

```c
#include <stdio.h>

int main(void) {
    unsigned char flags = 0;  /* 初始全0 */

    /* 设置第3位 */
    flags |= (1 << 3);    /* flags = 0b00001000 = 0x08 */
    printf("设置第3位: 0x%02X\n", flags);

    /* 设置第0位和第5位 */
    flags |= (1 << 0) | (1 << 5);  /* flags = 0b00101001 = 0x29 */
    printf("设置第0、5位: 0x%02X\n", flags);

    /* 清除第3位 */
    flags &= ~(1 << 3);   /* flags = 0b00100001 = 0x21 */
    printf("清除第3位: 0x%02X\n", flags);

    /* 翻转第5位 */
    flags ^= (1 << 5);    /* flags = 0b00000001 = 0x01 */
    printf("翻转第5位: 0x%02X\n", flags);

    /* 检测第0位 */
    if (flags & (1 << 0)) {
        printf("第0位已设置\n");
    }

    return 0;
}
```

### 第一个位域程序

```c
#include <stdio.h>

/* 设备配置寄存器 */
struct DeviceConfig {
    unsigned int enabled    : 1;   /* 使能位 */
    unsigned int interrupt  : 1;   /* 中断使能 */
    unsigned int mode       : 2;   /* 工作模式: 0-3 */
    unsigned int speed      : 3;   /* 速度等级: 0-7 */
    unsigned int channel    : 4;   /* 通道号: 0-15 */
    unsigned int reserved   : 21;  /* 保留 */
};

int main(void) {
    struct DeviceConfig cfg = { 0 };

    /* 设置各字段 */
    cfg.enabled   = 1;   /* 使能 */
    cfg.interrupt = 1;   /* 开中断 */
    cfg.mode      = 2;   /* 模式2 */
    cfg.speed     = 5;   /* 速度5 */
    cfg.channel   = 8;   /* 通道8 */

    printf("使能: %u\n", cfg.enabled);    /* 1 */
    printf("中断: %u\n", cfg.interrupt);  /* 1 */
    printf("模式: %u\n", cfg.mode);       /* 2 */
    printf("速度: %u\n", cfg.speed);      /* 5 */
    printf("通道: %u\n", cfg.channel);    /* 8 */
    printf("结构体大小: %zu 字节\n", sizeof(cfg));  /* 4 */

    return 0;
}
```

## 详细用法

### 位掩码与标志管理

使用宏定义位掩码是管理标志位的常见做法：

```c
#include <stdio.h>

/* 文件权限掩码 */
#define PERM_READ    (1 << 0)  /* 0x01: 可读 */
#define PERM_WRITE   (1 << 1)  /* 0x02: 可写 */
#define PERM_EXEC    (1 << 2)  /* 0x04: 可执行 */
#define PERM_HIDDEN  (1 << 3)  /* 0x08: 隐藏 */
#define PERM_SYSTEM  (1 << 4)  /* 0x10: 系统文件 */

/* 设置权限 */
unsigned int setPermission(unsigned int perm, unsigned int flags) {
    return perm | flags;
}

/* 清除权限 */
unsigned int clearPermission(unsigned int perm, unsigned int flags) {
    return perm & ~flags;
}

/* 检查权限 */
int hasPermission(unsigned int perm, unsigned int flag) {
    return (perm & flag) != 0;
}

int main(void) {
    unsigned int perm = 0;

    /* 授予读写权限 */
    perm = setPermission(perm, PERM_READ | PERM_WRITE);
    printf("读写权限: 0x%02X\n", perm);  /* 0x03 */

    /* 检查权限 */
    printf("可读: %s\n", hasPermission(perm, PERM_READ) ? "是" : "否");
    printf("可执行: %s\n", hasPermission(perm, PERM_EXEC) ? "是" : "否");

    /* 撤销写权限，添加执行权限 */
    perm = clearPermission(perm, PERM_WRITE);
    perm = setPermission(perm, PERM_EXEC);
    printf("调整后: 0x%02X\n", perm);  /* 0x05 */

    return 0;
}
```

### 多位字段的提取与插入

从整数中提取或插入连续多位是协议解析和寄存器操作的常见需求：

```c
#include <stdio.h>

/* 提取从第 start 位开始的 n 位 */
unsigned int extractBits(unsigned int value, int start, int n) {
    unsigned int mask = (1U << n) - 1;  /* n个1的掩码 */
    return (value >> start) & mask;
}

/* 将 bits 写入 value 的第 start 位开始的 n 位 */
unsigned int insertBits(unsigned int value, int start, int n, unsigned int bits) {
    unsigned int mask = (1U << n) - 1;
    /* 先清除目标位，再写入新值 */
    return (value & ~(mask << start)) | ((bits & mask) << start);
}

int main(void) {
    unsigned int data = 0xABCD1234;

    /* 提取第4-7位（4位） */
    unsigned int field = extractBits(data, 4, 4);
    printf("第4-7位: 0x%X\n", field);  /* 3 */

    /* 提取第8-15位（8位） */
    field = extractBits(data, 8, 8);
    printf("第8-15位: 0x%X\n", field);  /* 0x12 */

    /* 将 0xB 写入第4-7位 */
    data = insertBits(data, 4, 4, 0xB);
    printf("修改后: 0x%08X\n", data);

    return 0;
}
```

### 位域的内存布局

位域在结构体中的布局受编译器影响，需要了解其规则：

```c
#include <stdio.h>

/* 位域布局示例 */
struct LayoutA {
    unsigned int a : 1;    /* 第0位 */
    unsigned int b : 3;    /* 第1-3位 */
    unsigned int c : 4;    /* 第4-7位 */
};

/* 跨存储单元的位域 */
struct LayoutB {
    unsigned int a : 12;
    unsigned int b : 12;
    unsigned int c : 12;  /* 可能跨到下一个 unsigned int */
};

/* 无名位域用于对齐 */
struct LayoutC {
    unsigned int a : 4;
    unsigned int   : 0;   /* 强制对齐到下一个存储单元边界 */
    unsigned int b : 4;
};

int main(void) {
    printf("LayoutA: %zu 字节\n", sizeof(struct LayoutA));  /* 4 */
    printf("LayoutB: %zu 字节\n", sizeof(struct LayoutB));  /* 8 */
    printf("LayoutC: %zu 字节\n", sizeof(struct LayoutC));  /* 8 */

    return 0;
}
```

### 位域与联合体配合

联合体可以让同一段内存以位域和整体两种方式访问：

```c
#include <stdio.h>

/* 状态寄存器：位域视图 + 整体视图 */
typedef union {
    struct {
        unsigned int busy      : 1;   /* 忙碌标志 */
        unsigned int error     : 1;   /* 错误标志 */
        unsigned int ready     : 1;   /* 就绪标志 */
        unsigned int mode      : 2;   /* 工作模式 */
        unsigned int           : 3;   /* 保留 */
        unsigned int count     : 8;   /* 计数器 */
        unsigned int           : 16;  /* 保留 */
    } bits;
    unsigned int value;  /* 整体访问 */
} StatusReg;

int main(void) {
    StatusReg reg = { 0 };

    /* 通过位域设置各字段 */
    reg.bits.busy  = 1;
    reg.bits.ready = 1;
    reg.bits.mode  = 2;
    reg.bits.count = 100;

    /* 以整体方式读取 */
    printf("寄存器值: 0x%08X\n", reg.value);

    /* 以整体方式写入 */
    reg.value = 0x00000005;  /* busy=1, ready=1 */
    printf("忙碌: %u\n", reg.bits.busy);   /* 1 */
    printf("错误: %u\n", reg.bits.error);  /* 0 */
    printf("就绪: %u\n", reg.bits.ready);  /* 1 */

    return 0;
}
```

### 位运算实现集合

用整数的每一位表示一个元素是否在集合中，可以高效实现小规模集合操作：

```c
#include <stdio.h>

#define SET_SIZE 32

typedef unsigned int BitSet;

/* 添加元素 */
BitSet setAdd(BitSet s, int elem) {
    return s | (1U << elem);
}

/* 移除元素 */
BitSet setRemove(BitSet s, int elem) {
    return s & ~(1U << elem);
}

/* 判断元素是否在集合中 */
int setContains(BitSet s, int elem) {
    return (s & (1U << elem)) != 0;
}

/* 并集 */
BitSet setUnion(BitSet a, BitSet b) {
    return a | b;
}

/* 交集 */
BitSet setIntersect(BitSet a, BitSet b) {
    return a & b;
}

/* 差集（在a中但不在b中） */
BitSet setDifference(BitSet a, BitSet b) {
    return a & ~b;
}

/* 集合大小 */
int setSize(BitSet s) {
    int count = 0;
    while (s) {
        count += s & 1;
        s >>= 1;
    }
    return count;
}

/* 打印集合 */
void setPrint(BitSet s) {
    printf("{ ");
    for (int i = 0; i < SET_SIZE; i++) {
        if (setContains(s, i)) {
            printf("%d ", i);
        }
    }
    printf("}\n");
}

int main(void) {
    BitSet a = 0, b = 0;

    a = setAdd(a, 1);
    a = setAdd(a, 3);
    a = setAdd(a, 5);
    a = setAdd(a, 7);

    b = setAdd(b, 2);
    b = setAdd(b, 3);
    b = setAdd(b, 5);
    b = setAdd(b, 8);

    printf("集合A: "); setPrint(a);  /* { 1 3 5 7 } */
    printf("集合B: "); setPrint(b);  /* { 2 3 5 8 } */
    printf("并集: ");  setPrint(setUnion(a, b));      /* { 1 2 3 5 7 8 } */
    printf("交集: ");  setPrint(setIntersect(a, b));  /* { 3 5 } */
    printf("差集: ");  setPrint(setDifference(a, b)); /* { 1 7 } */

    return 0;
}
```

## 常见场景

### 硬件寄存器操作

嵌入式开发中，位运算是操作硬件寄存器的基本手段：

```c
#include <stdio.h>

/* 模拟硬件寄存器 */
volatile unsigned int GPIO_CTRL = 0;

/* 寄存器位定义 */
#define GPIO_PIN0      (1U << 0)
#define GPIO_PIN1      (1U << 1)
#define GPIO_PIN2      (1U << 2)
#define GPIO_PIN3      (1U << 3)
#define GPIO_ALL_PINS  (0xF)

/* 设置引脚为输出 */
void gpioSetOutput(unsigned int pins) {
    GPIO_CTRL |= pins;
}

/* 设置引脚为输入 */
void gpioSetInput(unsigned int pins) {
    GPIO_CTRL &= ~pins;
}

/* 翻转引脚状态 */
void gpioToggle(unsigned int pins) {
    GPIO_CTRL ^= pins;
}

/* 读取引脚状态 */
unsigned int gpioRead(unsigned int pins) {
    return GPIO_CTRL & pins;
}

int main(void) {
    /* 设置 PIN0 和 PIN1 为输出 */
    gpioSetOutput(GPIO_PIN0 | GPIO_PIN1);
    printf("CTRL: 0x%08X\n", GPIO_CTRL);  /* 0x00000003 */

    /* 翻转 PIN0 */
    gpioToggle(GPIO_PIN0);
    printf("CTRL: 0x%08X\n", GPIO_CTRL);  /* 0x00000002 */

    /* 设置 PIN2 和 PIN3 为输出 */
    gpioSetOutput(GPIO_PIN2 | GPIO_PIN3);
    printf("CTRL: 0x%08X\n", GPIO_CTRL);  /* 0x0000000E */

    return 0;
}
```

### 数据压缩与打包

将多个小范围数值打包到一个整数中，节省存储空间：

```c
#include <stdio.h>

/* 将 RGBA 四个通道打包为 32 位颜色值 */
unsigned int packColor(unsigned char r, unsigned char g,
                       unsigned char b, unsigned char a) {
    return ((unsigned int)a << 24) |
           ((unsigned int)r << 16) |
           ((unsigned int)g << 8)  |
           ((unsigned int)b);
}

/* 从 32 位颜色值中解包各通道 */
void unpackColor(unsigned int color,
                 unsigned char *r, unsigned char *g,
                 unsigned char *b, unsigned char *a) {
    *a = (color >> 24) & 0xFF;
    *r = (color >> 16) & 0xFF;
    *g = (color >> 8)  & 0xFF;
    *b =  color        & 0xFF;
}

int main(void) {
    unsigned int color = packColor(255, 128, 64, 200);
    printf("打包颜色: 0x%08X\n", color);  /* 0xC8FF8040 */

    unsigned char r, g, b, a;
    unpackColor(color, &r, &g, &b, &a);
    printf("R=%d, G=%d, B=%d, A=%d\n", r, g, b, a);  /* 255, 128, 64, 200 */

    return 0;
}
```

### 权限与标志系统

Unix 文件权限是位运算的经典应用：

```c
#include <stdio.h>

/* 权限位定义 */
#define USR_R (1 << 8)  /* 用户读 */
#define USR_W (1 << 7)  /* 用户写 */
#define USR_X (1 << 6)  /* 用户执行 */
#define GRP_R (1 << 5)  /* 组读 */
#define GRP_W (1 << 4)  /* 组写 */
#define GRP_X (1 << 3)  /* 组执行 */
#define OTH_R (1 << 2)  /* 其他读 */
#define OTH_W (1 << 1)  /* 其他写 */
#define OTH_X (1 << 0)  /* 其他执行 */

/* 将权限位转换为 rwx 字符串 */
void permToStr(unsigned int perm, char *out) {
    const char *labels[] = { "r", "w", "x" };
    unsigned int bits[]  = { USR_R, USR_W, USR_X, GRP_R, GRP_W, GRP_X, OTH_R, OTH_W, OTH_X };
    int idx = 0;
    for (int i = 0; i < 9; i++) {
        if (perm & bits[i]) {
            out[idx++] = labels[i % 3][0];
        } else {
            out[idx++] = '-';
        }
    }
    out[idx] = '\0';
}

int main(void) {
    /* rwxr-xr-x = 0755 */
    unsigned int perm = USR_R | USR_W | USR_X | GRP_R | GRP_X | OTH_R | OTH_X;

    char str[10];
    permToStr(perm, str);
    printf("权限: %s (0o%o)\n", str, perm);  /* rwxr-xr-x (0o755) */

    /* 去掉其他用户的写权限 */
    perm &= ~OTH_W;
    permToStr(perm, str);
    printf("修改后: %s\n", str);  /* rwxr-xr-x */

    return 0;
}
```

### 哈希与校验

位运算在哈希函数和校验算法中大量使用：

```c
#include <stdio.h>
#include <string.h>

/* 简单的 FNV-1a 哈希 */
unsigned int fnv1aHash(const char *str) {
    unsigned int hash = 2166136261U;  /* FNV 偏移基数 */
    while (*str) {
        hash ^= (unsigned char)*str++;  /* 异或当前字节 */
        hash *= 16777619U;              /* 乘以 FNV 质数 */
    }
    return hash;
}

/* 简单的奇偶校验 */
int parityCheck(unsigned int value) {
    int parity = 0;
    while (value) {
        parity ^= 1;       /* 每遇到一个1就翻转 */
        value &= value - 1; /* 清除最低位的1 */
    }
    return parity;  /* 0: 偶数个1, 1: 奇数个1 */
}

int main(void) {
    const char *msg = "Hello, World!";
    printf("FNV-1a 哈希: 0x%08X\n", fnv1aHash(msg));

    unsigned int data = 0b11010110;
    printf("0x%X 的奇偶校验: %s\n", data,
           parityCheck(data) ? "奇" : "偶");

    return 0;
}
```

## 注意事项

### 移位溢出

移位位数不能超过数据类型的位宽，否则是未定义行为：

```c
unsigned int x = 1;

/* 未定义行为：移位位数 >= int 的位数 */
x << 32;   /* 未定义！int 通常为 32 位 */
x << -1;   /* 未定义！移位位数为负 */

/* 安全做法：确保移位位数在合法范围内 */
int shift = 32;
if (shift >= 0 && shift < (int)sizeof(unsigned int) * 8) {
    x = x << shift;
}
```

### 有符号数的右移

有符号数右移时，高位填充符号位（算术右移）还是0（逻辑右移）由实现定义。需要可移植的代码应使用无符号类型：

```c
/* 不可移植：有符号数右移 */
int a = -8;
int b = a >> 1;  /* 结果依赖编译器实现 */

/* 可移植：使用无符号数 */
unsigned int c = (unsigned int)-8;
unsigned int d = c >> 1;  /* 保证逻辑右移 */
```

### 位域的可移植性

位域的内存布局由编译器决定，不同编译器可能不同：

```c
/*
 * 位域的以下方面是实现定义的：
 * 1. 位域在存储单元中的分配方向（从高位到低位，或反之）
 * 2. 相邻位域是否可以跨越存储单元边界
 * 3. int 位域是否有符号（实现定义）
 * 4. 位域的最大宽度限制
 *
 * 因此，位域结构不应直接用于跨平台的数据交换或文件存储。
 * 需要跨平台时，应使用显式的位运算代替位域。
 */
```

### 位域不能取地址

位域成员可能不按字节对齐，因此不能对其取地址：

```c
struct Flags {
    unsigned int a : 1;
    unsigned int b : 3;
};

struct Flags f;
/* int *p = &f.a; */  /* 编译错误！位域不能取地址 */

/* 替代方案：通过整体访问 */
unsigned int *pval = (unsigned int *)&f;  /* 取整个结构体的地址 */
```

### 整数提升陷阱

位运算前，小于 int 的类型会被提升为 int，可能导致意外结果：

```c
unsigned char flags = 0x80;  /* 1000 0000 */

/* 意图：清除最高位 */
unsigned char result = flags & ~(0x80);
/* ~(0x80) 在 int 上是 0xFFFFFF7F，但 & 运算后截断为 unsigned char，结果正确 */

/* 但如果写成这样就有问题 */
unsigned char mask = 0x80;
/* ~mask 被提升为 int: 0xFFFFFF7F */
/* flags & ~mask 结果为 int: 0xFFFFFF00 */
/* 赋值给 unsigned char 时截断为 0x00，可能不是预期结果 */
```

### 位域的符号问题

`int` 类型的位域是否有符号由实现定义，建议显式使用 `signed` 或 `unsigned`：

```c
struct Example {
    int a : 3;            /* 实现定义：可能是 signed 或 unsigned */
    signed int b : 3;     /* 明确有符号：-4 到 3 */
    unsigned int c : 3;   /* 明确无符号：0 到 7 */
};
```

## 进阶用法

### 位运算技巧集锦

```c
#include <stdio.h>

/* 判断是否为2的幂 */
int isPowerOf2(int n) {
    return n > 0 && (n & (n - 1)) == 0;
}

/* 统计二进制中1的个数（Brian Kernighan 算法） */
int popcount(unsigned int n) {
    int count = 0;
    while (n) {
        n &= n - 1;  /* 清除最低位的1 */
        count++;
    }
    return count;
}

/* 获取最低位的1（lowbit） */
unsigned int lowbit(unsigned int n) {
    return n & (-n);  /* 等价于 n & (~n + 1) */
}

/* 判断两个整数符号是否相反 */
int oppositeSigns(int a, int b) {
    return (a ^ b) < 0;
}

/* 不用分支求绝对值 */
int absNoBranch(int n) {
    int mask = n >> (sizeof(int) * 8 - 1);  /* 全0或全1 */
    return (n + mask) ^ mask;
}

/* 交换两个整数的最高字节 */
unsigned int swapHighByte(unsigned int a, unsigned int b) {
    unsigned int mask = 0xFF000000;
    return ((a & ~mask) | (b & mask));
}

/* 反转二进制位 */
unsigned int reverseBits(unsigned int n) {
    unsigned int result = 0;
    int bits = sizeof(n) * 8;
    for (int i = 0; i < bits; i++) {
        result <<= 1;
        result |= n & 1;
        n >>= 1;
    }
    return result;
}

int main(void) {
    printf("16 是2的幂: %s\n", isPowerOf2(16) ? "是" : "否");
    printf("0xAB 的1的个数: %d\n", popcount(0xAB));  /* 6 */
    printf("12 的 lowbit: %u\n", lowbit(12));  /* 4 */
    printf("-5 和 3 符号相反: %s\n", oppositeSigns(-5, 3) ? "是" : "否");
    printf("|-42| = %d\n", absNoBranch(-42));

    return 0;
}
```

### 位图（Bitmap）

位图是用位数组实现的高效索引结构，常用于内存管理和布隆过滤器：

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define BITMAP_SIZE(bits) (((bits) + 7) / 8)

typedef struct {
    unsigned char *data;
    int size;  /* 位数 */
} Bitmap;

/* 创建位图 */
Bitmap *bitmapCreate(int size) {
    Bitmap *bm = (Bitmap *)malloc(sizeof(Bitmap));
    bm->size = size;
    bm->data = (unsigned char *)calloc(BITMAP_SIZE(size), 1);
    return bm;
}

/* 销毁位图 */
void bitmapDestroy(Bitmap *bm) {
    free(bm->data);
    free(bm);
}

/* 设置位 */
void bitmapSet(Bitmap *bm, int index) {
    if (index >= 0 && index < bm->size) {
        bm->data[index / 8] |= (1U << (index % 8));
    }
}

/* 清除位 */
void bitmapClear(Bitmap *bm, int index) {
    if (index >= 0 && index < bm->size) {
        bm->data[index / 8] &= ~(1U << (index % 8));
    }
}

/* 检测位 */
int bitmapTest(const Bitmap *bm, int index) {
    if (index >= 0 && index < bm->size) {
        return (bm->data[index / 8] >> (index % 8)) & 1;
    }
    return 0;
}

int main(void) {
    Bitmap *bm = bitmapCreate(100);

    /* 标记一些位 */
    bitmapSet(bm, 5);
    bitmapSet(bm, 10);
    bitmapSet(bm, 63);
    bitmapSet(bm, 99);

    /* 检测 */
    printf("位5: %d\n", bitmapTest(bm, 5));   /* 1 */
    printf("位6: %d\n", bitmapTest(bm, 6));   /* 0 */
    printf("位63: %d\n", bitmapTest(bm, 63)); /* 1 */

    /* 清除 */
    bitmapClear(bm, 5);
    printf("位5清除后: %d\n", bitmapTest(bm, 5));  /* 0 */

    bitmapDestroy(bm);
    return 0;
}
```

### 位域实现协议头

网络协议和文件格式的头部字段通常用位域来描述：

```c
#include <stdio.h>
#include <string.h>

/* TCP 头部前16位的简化模型 */
typedef union {
    struct {
        unsigned int src_port  : 16;  /* 源端口 */
        unsigned int dst_port  : 16;  /* 目标端口 */
    } fields;
    unsigned int raw;
} TcpPortHeader;

/* IP 头部前字段的简化模型 */
typedef union {
    struct {
#if __BYTE_ORDER__ == __ORDER_LITTLE_ENDIAN__
        unsigned int hdr_len   : 4;   /* 头部长度 */
        unsigned int version   : 4;   /* 版本 */
#else
        unsigned int version   : 4;
        unsigned int hdr_len   : 4;
#endif
        unsigned int tos       : 8;   /* 服务类型 */
        unsigned int total_len : 16;  /* 总长度 */
    } fields;
    unsigned int raw;
} IpHeaderStart;

int main(void) {
    /* 构造 TCP 端口头部 */
    TcpPortHeader tcp = { 0 };
    tcp.fields.src_port = 8080;
    tcp.fields.dst_port = 80;
    printf("TCP 端口: 源=%u, 目标=%u\n",
           tcp.fields.src_port, tcp.fields.dst_port);

    /* 构造 IP 头部 */
    IpHeaderStart ip = { 0 };
    ip.fields.version = 4;
    ip.fields.hdr_len = 5;
    ip.fields.tos = 0;
    ip.fields.total_len = 1500;
    printf("IP 版本: %u, 头部长度: %u x 4 = %u 字节\n",
           ip.fields.version, ip.fields.hdr_len, ip.fields.hdr_len * 4);

    return 0;
}
```

### 编译器内置位操作函数

GCC 和 Clang 提供了高效的内置位操作函数：

```c
#include <stdio.h>

int main(void) {
    unsigned int x = 0b10110000;

    /* 统计1的个数 */
    printf("1的个数: %d\n", __builtin_popcount(x));  /* 3 */

    /* 前导零的个数（从最高位开始连续0的个数） */
    printf("前导零: %d\n", __builtin_clz(x));  /* 依赖位数 */

    /* 尾随零的个数（从最低位开始连续0的个数） */
    printf("尾随零: %d\n", __builtin_ctz(x));  /* 4 */

    /* 奇偶校验（1的个数的奇偶性） */
    printf("奇偶: %d\n", __builtin_parity(x));  /* 1（奇数个1） */

    /* long long 版本 */
    unsigned long long y = 0xFF00ULL;
    printf("ll popcount: %d\n", __builtin_popcountll(y));  /* 8 */

    return 0;
}
```

### C23 中的位操作新特性

C23 标准引入了 `<stdbit.h>` 头文件，提供标准化的位操作函数：

```c
/*
 * C23 <stdbit.h> 提供的函数（以 unsigned int 为例）：
 *
 * stdc_leading_zeros_ui(x)    - 前导零个数
 * stdc_trailing_zeros_ui(x)   - 尾随零个数
 * stdc_leading_ones_ui(x)     - 前导1个数
 * stdc_trailing_ones_ui(x)    - 尾随1个数
 * stdc_first_leading_zero_ui(x) - 第一个前导零的位置
 * stdc_first_leading_one_ui(x)  - 第一个前导1的位置
 * stdc_first_trailing_zero_ui(x)- 第一个尾随零的位置
 * stdc_first_trailing_one_ui(x) - 第一个尾随1的位置
 * stdc_count_zeros_ui(x)      - 零的个数
 * stdc_count_ones_ui(x)       - 1的个数
 * stdc_has_single_bit_ui(x)   - 是否恰好只有一个1（2的幂）
 * stdc_bit_width_ui(x)        - 表示x所需的最少位数
 * stdc_bit_floor_ui(x)        - 不超过x的最大2的幂
 * stdc_bit_ceil_ui(x)         - 不小于x的最小2的幂
 *
 * 每个函数有 _uc, _us, _ui, _ul, _ull 后缀版本
 * 对应 unsigned char, unsigned short, unsigned int, unsigned long, unsigned long long
 */

/* 使用示例（需要支持 C23 的编译器） */
#if defined(__STDC_VERSION__) && __STDC_VERSION__ >= 202311L
#include <stdbit.h>

void c23BitDemo(void) {
    unsigned int x = 0b00010100;  /* 20 */

    int zeros = stdc_count_zeros_ui(x);    /* 29 */
    int ones  = stdc_count_ones_ui(x);     /* 2 */
    int single = stdc_has_single_bit_ui(x); /* 0（不是2的幂） */
    int width = stdc_bit_width_ui(x);       /* 5 */
}
#endif
```
