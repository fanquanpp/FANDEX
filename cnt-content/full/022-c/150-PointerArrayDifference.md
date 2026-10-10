---
order: 180
title: 指针与数组：似是而非的边界
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 从「sizeof 在 main 里是 40、进函数变 8」拆解数组退化：三条例外、传数组即传指针、char *s 与 char a[] 的存储差异、int *p[10] 与 int (*p)[10] 读法拆解，附二维数组当 int** 传的段错误现场。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'c/160-DoublePointerPointerArray'
  - 'c/165-CLinkedListImplementation'
  - 'c/190-ComplexDeclarationParsing'
  - 'c/200-DynamicMemoryManagement'
prerequisites:
  - 'c/140-PointerDeep'
  - 'c/120-ArrayDetailed'
---

## 前置知识

- 已完成 [指针：地址、解引用与指针算术](/c/140-PointerDeep)：会用 `&` 与 `*`，知道指针算术按元素跨步、数组名能赋给指针（`int *p = arr;`）；
- 已完成 [数组详解](/c/120-ArrayDetailed)：知道数组大小是编译期常量、元素连续存放。

数组那边提过一句「数组作参数会退化」，本文把这句一笔带过的话拆成完整的规则、例外与事故现场。

> 分工说明：指针主线三篇各有山头。本篇只回答一个问题——数组什么时候是数组，什么时候变成指针：退化规则与例外、传参差异、`char *s` 与 `char a[]`、指针数组对数组指针、二维数组与动态二维数组。指针本身的语法在 [指针：地址、解引用与指针算术](/c/140-PointerDeep)；二级指针的工程体系（输出参数、游走、内存安全）在 [二级指针与指针数组](/c/160-DoublePointerPointerArray)；节点式链表结构在 [C 链表与节点式数据结构](/c/165-CLinkedListImplementation)；复杂声明（`int (*(*f)(void))[10]` 这类）的通用读法在 [复杂声明解析](/c/190-ComplexDeclarationParsing)；数组长度运行时才知道的一维解法在 [动态内存](/c/200-DynamicMemoryManagement)。

## 知识点地图

- **知识类别**：指针体系的分界篇——数组到指针的自动转换（decay）规则及其全部例外与工程后果。
- **解决什么问题**：「数组就是指针」是 C 流传最广的误解。`sizeof` 在 main 里是 40、进函数变 8；`char *s` 与 `char a[]` 一个只读一个可改；二维数组当 `int **` 传当场段错误。本篇把「什么时候是数组、什么时候变成指针」拆成可背诵的规则、三条例外与可复现的事故现场。
- **什么时候用到**：
  - 写函数签名时：决定形参用 `int *` 还是 `int (*)[4]`，长度要不要另传；
  - 排查「进函数 sizeof 就变小」「改字符串字面量崩了」「二维数组传参段错误」这类 bug；
  - 设计接口：`const int *arr, size_t n` 的「指针 + 长度 + 只读承诺」三元组；
  - 在栈上二维数组与堆上动态二维数组之间做选型（第 7 节两种实现对照）。
- **学完能做什么**：给任何数组参数写出正确形参；解释 `&arr + 1` 为什么跨 40 字节；一眼认出 `int *p[10]` 与 `int (*p)[10]`；为运行时尺寸的矩阵选对分配方案。

## 学习目标

读完本文你将能够：

1. 解释「main 里 `sizeof(arr)` 是 40、函数里变 8」的完整原因，说出退化（decay）规则；
2. 背出数组名不退化的三条例外（`sizeof`、`&`、字符串字面量初始化），并用 `&arr + 1` 的 40 字节跨步验证 `&arr` 的类型；
3. 说明 `void f(int a[10])` 与 `void f(int *a)` 是同一个函数，形成「长度必须另传」的惯例；
4. 区分 `char *s = "hi"` 与 `char a[] = "hi"` 的存储位置与可修改性，避开改字面量的段错误；
5. 拆解 `int *p[10]` 与 `int (*p)[10]` 的读法，写出二维数组传参的正确形参 `int (*m)[4]`。

预计 50 到 70 分钟，含 4 组动手实验与 3 道练习。

> "In C, there is a strong relationship between pointers and arrays, strong enough that pointers and arrays should be discussed simultaneously."
> —— Brian W. Kernighan & Dennis M. Ritchie, *The C Programming Language*, 2nd ed., 5.3 节

K&R 说的「strong relationship」是真是假？看完本文你会发现：关系确实强，但「数组就是指针」是 C 流传最广的误解。

## 1. 问题引入：数组一进函数就「缩水」

```c
/* shrink.c：同一个数组，两处 sizeof，两个答案 */
#include <stdio.h>

void in_function(int a[10]) {
    printf("函数里  sizeof(a)    = %zu\n", sizeof(a));
}

int main(void) {
    int arr[10] = {0};

    printf("main 里 sizeof(arr)  = %zu\n", sizeof(arr));
    printf("main 里 sizeof(arr[0]) = %zu\n", sizeof(arr[0]));
    in_function(arr);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g shrink.c -o shrink
./shrink
```

预期输出（64 位平台；32 位平台第三行是 4）：

```text
main 里 sizeof(arr)  = 40
main 里 sizeof(arr[0]) = 4
函数里  sizeof(a)    = 8
```

数组还是那个数组，10 个 int、40 字节，一个都没少。变的是 `arr` 这个**名字**的身份：在 main 里它是数组类型，传进函数的路上它变成了**指针**——8 字节正是指针的大小。它是怎么变的、哪些场合不变，就是本文的全部内容。

## 2. 退化规则：多数场合，数组名就是首元素指针

**数组到指针的转换（array-to-pointer conversion）**，俗称**退化（decay）**：除少数场合外，表达式中数组类型的名字自动转换成「指向首元素的指针」，转换结果不再是可赋值的左值（lvalue）。它不是一个值拷贝，只是一次类型与值的改写：`arr` 变成 `&arr[0]`。

C 为什么这么设计？两个动机：C 继承自无类型的 BCPL/B 语言，「数组名即首地址」是祖传语义；更重要的是效率——函数调用是值传递，若数组按值传递就得整个拷贝一份（大数组可能几千上万元素），退化让数组天然「按地址传」，调用点也不必携带数组大小。

**三条例外**——数组名在这些场合不退化，仍是完整的数组：

| 场合 | 结果 |
| --- | --- |
| `sizeof arr` | 整个数组的字节数（10 个 int 就是 40） |
| `&arr` | 指向**整个数组**的指针，类型 `int (*)[10]` |
| `char a[] = "hi"` 字面量初始化 | 字面量内容被拷贝进数组，不转成指针 |

C23 又补了两条极少遇到的：`typeof` 与 `alignof` 也不触发退化——初学阶段知道存在即可。

退化解释了第 1 节的谜题：`in_function(arr)` 调用时 `arr` 退化成 `int *`，函数收到的只是一个地址。也解释了遍历惯用式的成立：

```c
int *p = arr;          /* 退化：arr 变成 &arr[0] */
/* 此后 p[i] 等价于 *(p + i)；交换写 2[arr] 也合法，但别写 */
```

修改实验：在 main 里加一行 `printf("%zu\n", sizeof(&arr));`。它是指针大小（8），因为 `&arr` 的结果本身是个指针——但它指向的不再是单个 int，下一节看它跨步有多远。

## 3. sizeof 差异实验与 &arr 的真面目

```c
/* decay.c：arr 与 &arr 数值相同，类型不同 */
#include <stdio.h>

int main(void) {
    int arr[10] = {0};
    int *p = arr;

    printf("sizeof(arr)  = %zu\n", sizeof(arr));   /* 整个数组 */
    printf("sizeof(p)    = %zu\n", sizeof(p));     /* 一个指针 */
    printf("sizeof(&arr) = %zu\n", sizeof(&arr));  /* 还是一个指针 */

    printf("arr      = %p\n", (void *)arr);
    printf("arr + 1  = %p\n", (void *)(arr + 1));
    printf("&arr     = %p\n", (void *)&arr);
    printf("&arr + 1 = %p\n", (void *)(&arr + 1));
    return 0;
}
```

一次典型输出（地址每次不同，看差值）：

```text
sizeof(arr)  = 40
sizeof(p)    = 8
sizeof(&arr) = 8
arr      = 0x7ffd2a4c9a70
arr + 1  = 0x7ffd2a4c9a74      (差 4 字节：一个 int)
&arr     = 0x7ffd2a4c9a70
&arr + 1 = 0x7ffd2a4c9a98      (差 40 字节：整个数组)
```

三个事实钉死：

1. `arr` 与 `&arr` 打印出**同一个地址**——都从数组起点算；
2. 但它们**类型不同**：`arr`（退化后）是 `int *`，`&arr` 是「指向 10 个 int 的数组」的指针 `int (*)[10]`；
3. 类型不同决定 `+1` 的跨步不同：`arr + 1` 跨一个元素（4 字节），`&arr + 1` 跨整个数组（40 字节）。

`&arr + 1` 指向的位置正好是数组的**哨兵位置（one-past-the-end）**——越过最后一个元素的那一格。形成它、比较它都合法（边界规则见 [指针：地址、解引用与指针算术](/c/140-PointerDeep) 第 6 节），解引用它是越界 UB。

修改实验：把数组换成 `double d[10]` 再跑。两个差值应变成 8 和 80——跨步永远跟着元素大小与数组总大小走。

## 4. 传数组即传指针：长度必须自己带

第 1 节的 `in_function(int a[10])` 不是特例，是规则：**形参清单里的数组类型会被编译器调整成指针类型**。`int a[10]`、`int a[]`、`int *a` 三种写法声明的是**同一个函数**。`a[10]` 里的 10 是写给人看的注释，编译器眼里只有 `int *a`。

```c
/* param.c：三种形参，同一个函数 */
#include <stdio.h>

void f1(int a[10]) { printf("f1: %zu\n", sizeof(a)); }
void f2(int a[])   { printf("f2: %zu\n", sizeof(a)); }
void f3(int *a)    { printf("f3: %zu\n", sizeof(a)); }

int main(void) {
    int arr[10] = {0};
    f1(arr);
    f2(arr);
    f3(arr);
    return 0;
}
```

预期输出（64 位平台）：

```text
f1: 8
f2: 8
f3: 8
```

由此得出 C 函数接口的第一惯例：**长度必须另传**。

```c
void print_array(const int *arr, size_t n);   /* 指针 + 长度，C 的通用约定 */
```

顺手写 `const`：本函数承诺不改数组内容。这套「指针 + 长度 + 只读承诺」的接口形态在标准库与工程项目里无处不在。

再顺手认识一个宏——「数多少个元素」在数组还是真数组的地方可用：

```c
#define ARRAY_LEN(a) (sizeof(a) / sizeof((a)[0]))

int arr[10];
size_t n = ARRAY_LEN(arr);    /* 10，正确 */
```

但它绝不能用在函数内部：那里的 `a` 已经是指针，`sizeof(a) / sizeof(a[0])` 算出 8/4 = 2。这正是 GCC 与 Clang 提供 `-Wsizeof-pointer-div` 警告的原因；`-Warray-parameter` 则能抓住「声明写成数组、别处写成指针」的不一致形参。两个开关都在 `gcc.gnu.org` 的警告文档里（见文末）。

还有一个隐蔽的同源陷阱：**返回局部数组**同样过不了退化这一关——`return arr;` 返回的是退化后的首元素指针，而数组本体随函数返回消亡，调用方拿到的是悬空指针。事故现场在第 7 节实录三。

## 5. char *s = "hi" 与 char a[] = "hi"

两种写法只差两个字符，命运完全不同：

```c
/* strlit.c：同名不同命 */
#include <stdio.h>

int main(void) {
    char *s = "hi";       /* s 指向字面量本体 */
    char a[] = "hi";      /* a 是栈上数组，装了一份拷贝 */

    printf("sizeof(s) = %zu\n", sizeof(s));
    printf("sizeof(a) = %zu\n", sizeof(a));
    printf("s 指向的内容 = %s\n", s);

    a[0] = 'H';           /* 合法：改自己的拷贝 */
    printf("a = %s\n", a);
    /* s[0] = 'H';          UB：改的是字面量，见第 7 节实录二 */
    return 0;
}
```

预期输出（64 位平台）：

```text
sizeof(s) = 8
sizeof(a) = 3
s 指向的内容 = hi
a = Hi
```

逐条解释：

- 字面量 `"hi"` 的类型是 `char[3]`（h、i 与结尾的 `\0`），拥有**静态存储期**，编译进可执行文件的只读数据段——进程内存地图里它在 text 旁边的只读区（五段布局见 [内存深水区](/c/210-ProcessMemoryLayoutAndErrors)）；
- `char *s = "hi"`：`s` 是一个普通指针，装着字面量在只读段的地址。通过 `s` 改内容是**修改字符串字面量，UB**——只读内存页在硬件层拒绝写入，见第 7 节实录二；
- `char a[] = "hi"`：这是例外清单第三条——字面量不退化成指针，而是**逐字符拷贝**进栈上的新数组。`a` 是你自己的地盘，随便改。

选用口诀：

| 需求 | 写法 |
| --- | --- |
| 只读引用常量字符串（打印、比较、传参） | `const char *s = "...";` |
| 需要修改内容 | `char a[] = "...";` |
| 一组字符串（名字表、菜单项） | `char *names[] = {...};` 深入见 [二级指针与指针数组](/c/160-DoublePointerPointerArray) |

两个补充：其一，字面量遍历是指针跨步最短的示范——

```c
for (const char *q = a; *q != '\0'; q++) {
    putchar(*q);
}
```

其二，两个内容相同的字面量在内存里可能被编译器合并成一份，标准未规定必须分开——又一条「别对字面量动手」的理由。

## 6. 指针数组与数组指针：int *p[10] 对 int (*p)[10]

### 6.1 一字之差：读法与 sizeof 验证

两个声明一字之差，类型天壤之别。读法拆解：

- `int *p[10]`：`[]` 优先级高于 `*`，`p` 先和 `[10]` 结合——**p 是数组**，10 个元素，每个元素是 `int *`。这是**指针数组（array of pointers）**；
- `int (*p)[10]`：括号强制 `p` 先和 `*` 结合——**p 是指针**，指向「10 个 int 组成的数组」。这是**数组指针（pointer to array）**，正是第 3 节 `&arr` 的类型。

一眼认不出来的复杂声明有一套通用拆法（右左法则与 cdecl 工具），集中在 [复杂声明解析](/c/190-ComplexDeclarationParsing)，这里掌握这两条即可。用 sizeof 验证身份：

```c
/* pa_pb.c：一字之差，类型天壤 */
#include <stdio.h>

int main(void) {
    int arr[5] = {1, 2, 3, 4, 5};

    int *pa[3];           /* 指针数组：3 个 int* 元素 */
    int x = 10, y = 20, z = 30;
    pa[0] = &x; pa[1] = &y; pa[2] = &z;

    int (*pb)[5] = &arr;  /* 数组指针：指向整个 arr */

    printf("sizeof(pa) = %zu\n", sizeof(pa));
    printf("sizeof(pb) = %zu\n", sizeof(pb));
    printf("*pa[1]  = %d\n", *pa[1]);
    printf("(*pb)[2] = %d\n", (*pb)[2]);
    return 0;
}
```

预期输出（64 位平台）：

```text
sizeof(pa) = 24
sizeof(pb) = 8
*pa[1]  = 20
(*pb)[2] = 3
```

`pa` 是 3 个指针（24 字节），`pb` 是 1 个指针（8 字节）——身份一目了然。

### 6.2 访问元素：四种写法一个语义

数组指针指向整个数组，访问元素有几条等价路径：

```c
(*pb)[0]      /* 等价于 arr[0]：先解引用得到数组，再下标 */
(*pb)[2]      /* 等价于 arr[2] */
**pb          /* 等价于 arr[0]：*pb 是数组名，表达式里立即退化为首元素指针，再解引用 */
*(*pb + 1)    /* 等价于 arr[1]：退化后的指针 +1 跨一个元素 */
```

易错点：`*pb[0]` 与 `(*pb)[0]` 完全不同——前者按优先级先算 `pb[0]`（跨 40 字节取到「下一个数组」的地址）再解引用，写错括号访问的是数组外的内存。括号不是装饰，是语法本身。

### 6.3 典型应用：字符串数组，对比二维字符数组

指针数组最常见的用途是组织多个长度不一的字符串：

```c
const char *weekdays[] = {
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday"
};

size_t n = sizeof(weekdays) / sizeof(weekdays[0]);   /* 7，本处还是真数组 */
for (size_t i = 0; i < n; i++) {
    printf("%s (len=%zu)\n", weekdays[i], strlen(weekdays[i]));
}
```

对比二维字符数组：

```c
/* 二维数组：每行长度固定为最长字符串+1 */
char weekdays_arr[7][10] = {
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday"
};
/* 内存占用：7 * 10 = 70 字节，"Monday" 只有 7 字节也占满一行 */
```

而指针数组仅存储 7 个指针（56 字节）加上字符串字面量本身的存储（约 50 字节），且字符串字面量在只读段，紧凑存储。选型口诀：长度整齐、需要整体改名（`strcpy` 一行）用二维数组；长短不一、只读展示用指针数组。

### 6.4 数组指针最重要的应用：二维数组传参

`int m[3][4]` 是「3 个 `int[4]` 组成的数组」，传参时最外层退化，得到**指向首行（`int[4]`）的指针**：

```c
/* matrix.c：二维数组过函数，行的宽度必须写死 */
#include <stdio.h>

void print_matrix(int (*m)[4], int rows) {
    for (int i = 0; i < rows; i++) {
        for (int j = 0; j < 4; j++) {
            printf("%3d", m[i][j]);
        }
        printf("\n");
    }
}

int main(void) {
    int m[3][4] = {
        {1,  2,  3,  4},
        {5,  6,  7,  8},
        {9, 10, 11, 12}
    };
    print_matrix(m, 3);    /* m 退化为 int (*)[4] */
    return 0;
}
```

预期输出：

```text
  1  2  3  4
  5  6  7  8
  9 10 11 12
```

为什么行宽 4 必须写死：编译器要算 `m + 1` 跨几字节——一行 4 个 int 共 16 字节，不知道列宽就算不出来。`void f(int m[3][4])` 与 `void f(int (*m)[4])` 完全等价（第一维照样退化），第二种写法诚实。把 `m` 当 `int **` 用？那是经典事故，下一节现场直播。

### 6.5 二维数组的寻址公式

`int m[3][4]` 在内存里是**连续的 12 个 int**，没有「行指针表」这回事。`m[i][j]` 的地址可以手算：

```text
&m[i][j] = (char *)m + (i * 4 + j) * sizeof(int)
```

等价的指针写法是 `*(*(m + i) + j)`，逐步展开：

1. `m` 衰减为 `int (*)[4]`，指向第 0 行；
2. `m + i` 仍是 `int (*)[4]`，指向第 i 行（每步跨 16 字节）；
3. `*(m + i)` 是 `int[4]`，在表达式里再次衰减为 `int *`，指向第 i 行首元素；
4. `*(m + i) + j` 指向 `m[i][j]`；
5. 再解引用一层就得到元素值。

这个公式直接解释了两件事：行宽必须写死（少了 4 算不出偏移）；以及为什么 `int **` 在这里是错的——二级指针的 `m[i]` 要先做一次**内存读取**拿到第 i 行的指针，而二维数组根本没有这张指针表。

### 6.6 指针数组与数组指针的身份对照表

| 声明 | 类型 | sizeof（64 位） | `+1` 步长 | 含义 |
|------|------|--------|------|------|
| `int *p` | `int *` | 8 | 4 | 指向 int |
| `int **pp` | `int **` | 8 | 8 | 指向 int * |
| `int *arr[5]` | `int *[5]` | 40 | - | 5 个 int* 的数组 |
| `int (*ptr)[5]` | `int (*)[5]` | 8 | 20 | 指向 int[5] 的指针 |
| `int arr[5]` | `int[5]` | 20 | - | 5 个 int 的数组 |
| `int arr[3][4]` | `int[3][4]` | 48 | - | 3×4 二维数组 |
| `int (*ptr)[3][4]` | `int (*)[3][4]` | 8 | 48 | 指向 3×4 二维数组的指针 |

这张表值得抄在便签上：`sizeof` 告诉你「它是数组还是指针」，`+1` 步长告诉你「它指向的东西有多大」。两者一验，任何声明伪装都能当场识破。

## 7. 动态二维数组：两种实现

栈上 `int m[3][4]` 的两个维度都是编译期常量。行列数都要运行时决定时，堆上有两条路，各有山头。

### 7.1 指针数组方式：每行独立分配（不连续）

```c
int **matrix_alloc_v1(int rows, int cols) {
    int **matrix = malloc(rows * sizeof(int *));
    if (!matrix) return NULL;
    for (int i = 0; i < rows; i++) {
        matrix[i] = malloc(cols * sizeof(int));
        if (!matrix[i]) {
            /* 分配失败，回滚已分配的行 */
            for (int j = 0; j < i; j++) free(matrix[j]);
            free(matrix);
            return NULL;
        }
    }
    return matrix;
}

void matrix_free_v1(int **matrix, int rows) {
    if (!matrix) return;
    for (int i = 0; i < rows; i++) free(matrix[i]);
    free(matrix);
}
```

特点：

- 每行独立分配，**内存不连续**
- 行数和列数都可以是运行时值
- 访问 `matrix[i][j]` 需要两次解引用（先读行指针，再读元素）
- 释放必须**从内到外**逐行 free，只 `free(matrix)` 会漏掉全部行
- 每行长度还可以各不相同（三角形矩阵、字典序不齐的表）

### 7.2 连续分配方式：一维数组 + 手动寻址

```c
int *matrix_alloc_flat(int rows, int cols) {
    return malloc((size_t)rows * cols * sizeof(int));
}
/* 访问 matrix[i * cols + j] */
```

封装成结构体，接口更体面：

```c
typedef struct {
    int *data;
    int rows;
    int cols;
} Matrix;

Matrix *matrix_create(int rows, int cols) {
    Matrix *m = malloc(sizeof(Matrix));
    if (!m) return NULL;
    m->data = malloc((size_t)rows * cols * sizeof(int));
    if (!m->data) { free(m); return NULL; }
    m->rows = rows;
    m->cols = cols;
    return m;
}

int matrix_get(Matrix *m, int i, int j) {
    return m->data[i * m->cols + j];
}

void matrix_set(Matrix *m, int i, int j, int val) {
    m->data[i * m->cols + j] = val;
}

void matrix_free(Matrix *m) {
    if (m) { free(m->data); free(m); }
}
```

列数若为编译期常量，还可以直接分配「数组的数组」，得到货真价实的数组指针：

```c
/* 每行固定 4 个 int 的连续矩阵 */
int (*matrix)[4] = malloc(rows * sizeof(int[4]));
/* matrix[i][j] 语法与栈上二维数组完全一致 */
free(matrix);      /* 一次 free 搞定 */
```

### 7.3 两种方式对比与选型

| 维度 | 指针数组方式 | 连续分配方式 |
|------|--------------|--------------|
| 内存连续性 | 不连续 | 连续 |
| 访问开销 | 两次解引用 | 一次乘法 + 一次解引用 |
| 缓存友好性 | 差（指针跳转） | 好（连续访问） |
| 释放复杂度 | 逐行 free | 单次 free |
| 行/列可变性 | 行长可独立 | 列宽需固定或额外存储 |
| 应用场景 | 不规则数组（如三角形矩阵） | 规则矩阵、数值计算 |

选型口诀：**规则矩阵用连续，参差数据用指针数组**；数值计算、图像处理这类缓存敏感的场景，连续布局往往快出可见的差距。释放纪律盯死一句：指针数组从内到外，连续分配一次到位。

## 8. 常见误用实录

### 实录一：把二维数组当 int** 传

```c
/* wrong2d.c */
#include <stdio.h>

void bad(int **m) {
    printf("%d\n", m[0][0]);    /* 按「指针的指针」去读 */
}

int main(void) {
    int matrix[3][4] = {{1, 2, 3, 4}, {5, 6, 7, 8}, {9, 10, 11, 12}};
    bad((int **)matrix);
    return 0;
}
```

（`(int **)` 强转只是为了压住 gcc 的 `incompatible pointer type` 警告让程序能编过——警告本身已经在报信。）运行必崩，ASan 报告关键行：

```text
==24884==ERROR: AddressSanitizer: SEGV on unknown address 0x0000000200000001 (pc 0x5b2e... T0)
==24884==The signal is caused by a READ memory access.
    #0 0x5b2e... in bad wrong2d.c:5
```

逐行读事故：`m[0][0]` 的求值顺序是先取 `m[0]`，即把 `matrix` 的**前 8 个字节当指针读**——那是数据 1 和 2 两个 int 在小端平台拼出来的假地址 `0x200000001`；再对它解引用，访问一块不存在的内存，SEGV。报告里的出错地址就是你自己的数据拼的，这是本事故最讽刺的证据。

修复：形参改成第 6.4 节的 `int (*m)[4]`。记住结论：**二维数组退化为数组指针，永远不是二级指针**。

### 实录二：修改字符串字面量

```c
/* lit.c */
#include <stdio.h>

int main(void) {
    char *s = "hi";
    s[0] = 'H';        /* UB：字面量住在只读页 */
    printf("%s\n", s);
    return 0;
}
```

不加工具直接跑，`Segmentation fault`；开 ASan 报 `SEGV on unknown address ...`，并注明 `The signal is caused by a WRITE memory access`。机制在第 5 节讲过：字面量所在内存页只读，写入被硬件当场拒绝。也要警惕：个别平台或编译器组合下它可能**不崩**——那是运气，标准已把它定为 UB，坏行为随时可能换一天发作。

### 实录三：返回局部数组的地址

```c
int *make(void) {
    int arr[3] = {1, 2, 3};
    return arr;        /* arr 退化为指针，数组本体随函数消亡 */
}
```

`gcc -Wall` 会直接警告 `function returns address of local variable`。调用方拿到的指针指向一块已经失效的栈内存（栈帧进出见 [函数调用栈帧](/c/250-FunctionCallStackFrame)），解引用是悬空访问。三个正解：调用方传入缓冲区、`static` 局部数组（注意多线程不安全）、或堆分配——最后一条正是下一节的主题。

## 9. 长度运行时才知道：与动态内存衔接

本文所有例子的数组大小都是编译期写死的。一旦大小来自用户输入或文件，「编译期常量」这条数组铁律就顶不住了——出路是把数组搬到堆上：

```c
/* n 来自运行时（用户输入、文件大小），此处以 0 占位 */
size_t n = 0;
int *arr = malloc(n * sizeof *arr);   /* 需 <stdlib.h> */
if (arr == NULL) {
    /* 要不到内存 */
}
/* 用完 free(arr); arr = NULL; */
```

malloc/free 四件套、判 NULL 纪律与泄漏抓捕，在 [动态内存](/c/200-DynamicMemoryManagement) 完整教学；堆上的悬空事故在 [内存深水区](/c/210-ProcessMemoryLayoutAndErrors)。顺带一提：C99 曾引入变长数组（VLA，`int arr[n]`，栈上、运行时定长），C11 起改为可选特性（宏 `__STDC_NO_VLA__` 标记），且有栈溢出风险——工程上更稳妥的选择仍是 malloc。

## 10. 实际项目中的使用场景

- **API 设计**：`void func(const int *arr, size_t n)` 的「指针 + 长度 + 只读承诺」三元组是 C 世界的事实标准——标准库的 `memcpy`、你依赖的每个 C 库都是这个形状；
- **文本与配置**：字符串表用 `char *names[]`，命令行参数 `main(int argc, char *argv[])` 的 `argv` 就是指针数组，实例见 [二级指针与指针数组](/c/160-DoublePointerPointerArray)；
- **矩阵与图像**：行宽固定的二维数据过函数，形参一律 `int (*m)[cols]`；行宽也要运行时定，走 malloc；
- **编译期防线**：`-Warray-parameter`、`-Wsizeof-pointer-div` 常开，让「退化」类错误在编译期现形。

## 11. 小练习

预测题一（3 分钟）：

```c
char s[] = "hello";
printf("%zu\n", sizeof(s));    /* 打印什么？ */
```

参考答案（先写再看）：`6`——字面量初始化是例外，5 个字符加结尾 `\0` 整整 6 字节进了数组。若写成 `char *s = "hello"`，`sizeof(s)` 是指针大小 8。

预测题二（3 分钟）：

```c
int arr[5] = {1, 2, 3, 4, 5};
printf("%d\n", 2[arr]);        /* 打印什么？能编译吗？ */
```

参考答案：能编译，打印 `3`。下标是算术的语法糖，`2[arr]` 等价 `*(2 + arr)` 等价 `arr[2]`。合法但可读性为零，识别即可，永远别写。

挑战题（20 分钟，不看提示先动手）：实现 `void reverse(int *a, size_t n)`，原地反转数组。

提示（思路方向）：头尾两个下标向中间走，交换所指元素；第 140 篇问题引入的 `swap` 可以直接复用——`swap(&a[lo], &a[hi])`。

展开（关键点）：循环条件 `lo < hi`；`size_t` 做减法会下溢，用「`lo < hi` 时各自向中间一步」的写法避免 `hi - 1` 变成超大正数。

验收清单：`{1,2,3,4,5}` 反转成 `{5,4,3,2,1}`；`n = 0` 与 `n = 1` 不崩也不动；`-fsanitize=address` 下运行干净。

## 12. 与之前和之后的知识的关系

- 往前：[指针：地址、解引用与指针算术](/c/140-PointerDeep) 的「数组名赋给指针」是本文退化规则的入口；[数组详解](/c/120-ArrayDetailed) 的连续布局与编译期定长是退化的物理前提；
- 旁支：[复杂声明解析](/c/190-ComplexDeclarationParsing) 把本文「先看括号」的两条读法扩成通用方法；[内存深水区](/c/210-ProcessMemoryLayoutAndErrors) 的五段布局解释字面量与栈数组各住哪；
- 往后：[二级指针与指针数组](/c/160-DoublePointerPointerArray) 把指针数组用到 argv、动态二维数组与链表上；[动态内存](/c/200-DynamicMemoryManagement) 接管「长度运行时才知道」的一切。

## 13. 官方文档

- 数组与退化规则（含全部例外清单与函数参数调整）（cppreference C）：https://en.cppreference.com/w/c/language/array
- 算术运算符（指针相减、哨兵与越界边界）（cppreference C）：https://en.cppreference.com/w/c/language/operator_arithmetic
- GCC 警告选项（-Warray-parameter、-Wsizeof-pointer-div 等）：https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html

## 14. 自我检查

- 能不看资料复述退化规则与三条例外，并用 `&arr + 1` 跨 40 字节的实验验证 `&arr` 的类型；
- 能解释 `void f(int a[10])` 与 `void f(int *a)` 为什么是同一个函数，并说出「长度另传」的接口惯例；
- 拿到 `char *s = "hi"` 与 `char a[] = "hi"`，能指出两者的存储位置、各自的 `sizeof`，以及哪个能改；
- 能向同事演示「二维数组当 `int **` 传」为什么崩在 `0x200000001` 这样的地址，并给出正确形参；
- 能写出运行时行列数的两种动态二维数组实现，并说出各自适用场景与释放顺序。

## 本章总结

数组与指针「看起来一样」的根源是退化：多数场合数组名自动变成首元素指针，于是 `arr[i]`、`*(arr + i)`、`p[i]` 通用。但数组不是指针——`sizeof` 得到整个数组、`&arr` 得到数组指针（跨步是整个数组的长度）、字面量初始化是拷贝，三条例外就是分界线。传参即退化，`int a[10]` 形同 `int *a`，长度必须另传。`char *s` 指向只读字面量（改则 UB），`char a[]` 是栈上可改拷贝。`int *p[10]` 是装指针的数组，`int (*p)[10]` 是指向数组的指针，二维数组传参用后者且行宽必须写死（寻址公式 `(i * N + j) * sizeof(int)` 里那个 N 就是它），当 `int **` 传必崩。行列都要运行时定，堆上两条路：指针数组逐行分配（参差、两次解引用、从内到外释放）或连续一维手动寻址（规则矩阵、缓存友好、一次 free）。

## 下一步

进入 [二级指针与指针数组](/c/160-DoublePointerPointerArray)：`char **argv`、输出参数与二级指针游走——多级间接寻址的完整工程体系在深水篇铺开；`char **` 指针数组挂上节点指针，就是 [C 链表与节点式数据结构](/c/165-CLinkedListImplementation) 的世界。
