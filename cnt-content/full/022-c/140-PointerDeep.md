---
order: 150
title: 指针：地址、解引用与指针算术
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 从「swap 为什么救不回来」入门指针：房间号心智模型、& 与 * 互逆、NULL 判空、const 三组合读法口诀、按元素跨步的指针算术、void* 的能与不能，附 SEGV 调试实录与 minmax 双输出小项目。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'c/150-PointerArrayDifference'
  - 'c/160-DoublePointerPointerArray'
  - 'c/210-MemoryManagement'
  - 'c/260-CVolatileAndConstDeepDive'
prerequisites:
  - 'c/120-ArrayDetailed'
  - 'c/090-FunctionDetailed'
---

## 前置知识

- 已完成 [数组详解](/c/120-ArrayDetailed)：知道数组是一段连续的同类型元素；
- 已完成 [函数详解](/c/090-FunctionDetailed)：知道 C 的参数是值传递，形参是实参的一份拷贝——本篇开头的谜题正源于此。

零基础起步见 [C 语言零基础起步](/c/010-CZeroBasisStart)。没读过也没关系，本文用到数组与函数的知识时会当场带一句。

> 分工说明：C 模块的指针主线由三篇组成。本篇负责把指针本身建立起来：地址、解引用、NULL、const 三组合、指针算术、void*；[指针与数组的区别](/c/150-PointerArrayDifference) 专攻「数组什么时候是数组、什么时候变成指针」这层似是而非的关系；[二级指针与指针数组](/c/160-DoublePointerPointerArray) 是深水篇，负责多级间接寻址与指针数组的完整工程体系。malloc/free 的用法在 [动态内存](/c/200-DynamicMemoryManagement)，堆事故现场在 [内存深水区](/c/210-MemoryManagement)，const 的类型系统语义在 [const 与 volatile 详解](/c/260-CVolatileAndConstDeepDive)——本篇只在衔接处提它们，不重复展开。

## 学习目标

读完本文你将能够：

1. 用「编号的房间」心智模型解释地址与指针，用 `%p` 打印变量地址并说出为什么传 `(void *)`；
2. 读懂 `int *p` 声明的读法，避开 `int *p, q` 声明陷阱，用 `&` 与 `*` 完成取地址和解引用赋值；
3. 用 NULL 表达「没指」，形成判空惯例，并解释解引用 NULL 为什么是未定义行为；
4. 区分 `const int *p`、`int *const p`、`const int *const p` 三种组合并说出读法口诀；
5. 计算指针算术的步长（`p + 1` 跨多少字节），在同一数组内比较与相减指针，说清越界算术的边界与 `void*` 的限制。

预计 60 到 80 分钟，含 4 组动手实验与 3 道练习。

## 1. 问题引入：救不回来的 swap

写一个交换两个变量的函数，直觉版本长这样：

```c
/* swap.c：值传递救不了的，指针一行解决 */
#include <stdio.h>

void swap_bad(int a, int b) {
    int t = a;
    a = b;
    b = t;            /* 换的只是形参这份拷贝 */
}

void swap(int *pa, int *pb) {
    int t = *pa;      /* 顺着地址找到原变量 */
    *pa = *pb;
    *pb = t;
}

int main(void) {
    int x = 1, y = 9;

    swap_bad(x, y);
    printf("swap_bad 后: x = %d, y = %d\n", x, y);

    swap(&x, &y);
    printf("swap     后: x = %d, y = %d\n", x, y);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g swap.c -o swap
./swap
```

预期输出：

```text
swap_bad 后: x = 1, y = 9
swap     后: x = 9, y = 1
```

同一份交换逻辑，`swap_bad` 换了个寂寞，`swap` 一击命中。差别只有一处：`swap` 拿到的不是变量的值，而是变量的**地址**。能装地址的变量，就是**指针（pointer）**。它凭什么有这么大的权力？先建立心智模型。

## 2. 地址与指针：内存是编号的房间

把内存想成一排编号的房间：每个房间 1 字节，编号就是**地址（address）**。一个 `int` 变量占连续 4 间房（见 [数据类型](/c/040-DataTypeDetailed)），我们说的「变量 `a` 的地址」就是它第一间房的编号。

- `&a`：向内存问一句「`a` 住几号房」，得到地址；
- 指针：一种专门存放房间号的变量。`int *p` 读作「p 是指向 int 的指针」——它存的地址处放着一个 int。

声明读法有一个高频陷阱：`*` 属于变量名，不属于类型。

```c
int *p;      /* 读法：p 是「指向 int 的指针」，* 属于 p */
```

而写成 `int* p, q;` 时，`*` 依然只贴着 `p`——`p` 是指针，`q` 只是普通 int。两种写法含义完全相同，陷阱在于 `*` 看起来像属于类型。编译器不报错——这是合法 C。防御办法很简单：一行只声明一个变量。指针变量名常以 `p` 或 `ptr` 开头，让「这是指针」一眼可见。

指针的三种常见初始化来源：取地址（`int *p = &a;`）、另一个同型指针（`int *p2 = p;`，两者指向同一处）、以及 NULL（下一节）。

## 3. & 与 *：一进一出的互逆操作

`&` 把变量变成地址，`*` 把地址变回变量——两者互逆。第一次见到变量地址，把它打出来：

```c
/* addr.c：第一次见到变量的「房间号」 */
#include <stdio.h>

int main(void) {
    int a = 10;
    int *p = &a;              /* p 存下 a 的地址 */

    printf("a    的值:   %d\n", a);
    printf("&a   的地址: %p\n", (void *)&a);
    printf("p    存的:   %p\n", (void *)p);
    printf("*p   解引用: %d\n", *p);

    *p = 20;                  /* 顺着地址改原变量 */
    printf("改后 a 的值: %d\n", a);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g addr.c -o addr
./addr
```

一次典型输出（地址每次运行都不同）：

```text
a    的值:   10
&a   的地址: 0x7ffc31a8b94c
p    存的:   0x7ffc31a8b94c
*p   解引用: 10
改后 a 的值: 20
```

三个要点：

1. `p` 与 `&a` 打印出同一个地址——`p` 里装的就是 `a` 的房间号；
2. `*p` 是**解引用（dereference）**：顺着地址找到那个 int 本尊，既能读（`printf` 里）也能写（`*p = 20;`）；
3. `%p` 打印指针时按惯例写成 `(void *)&a`。原因是 `printf` 是可变参数函数，编译器不做类型检查，而 `%p` 约定接收 `void *`；其他指针类型与 `void *` 值相同但类型不同，显式转换一次， warning 不再出现，移植性也最好。

修改实验：把 `(void *)&a` 的强转删掉再编译。多数平台照样跑，但 `-Wall -Wextra` 会给出 `format '%p' expects argument of type 'void *'` 一类警告——指针类型不匹配在编译期就该消灭。

## 4. NULL：把「没指」写成代码

指针可以不指向任何东西，但「不指向」必须显式表达，这就是**空指针**。宏 `NULL` 定义在 `<stddef.h>`（也在 `<stdio.h>`、`<stdlib.h>` 等头中）：它是一个实现定义的空指针常量，可能长成整数 `0`、`(void *)0`，C23 起也可以直接用关键字 `nullptr`。用哪个无所谓，写 `NULL` 表意最清楚。

```c
int *p = NULL;        /* 明确表示：现在没指任何对象 */

if (p != NULL) {      /* 判空惯例：用之前先问一句 */
    printf("%d\n", *p);
}
```

两条纪律从这里开始长：

1. **定义即初始化**：暂时不知道指向哪，就先置 NULL，别让指针揣着垃圾值上街；
2. **用前判空**：库函数用返回 NULL 报告「要不到」（最典型的是 malloc，见 [动态内存](/c/200-DynamicMemoryManagement)），调用方判 NULL 是标准动作。

解引用 NULL（`*p`）是**未定义行为（undefined behavior，UB）**——标准不规定任何结果，常见的表现是进程当场崩溃。崩溃现场长什么样，第 8 节用 ASan 逐行读给你看。

## 5. 指针与 const：三种组合一次讲清

const 与指针组合出三种声明，读法有一条口诀：**`*` 号左边的 const 保护内容，`*` 号右边的 const 锁死指针**。

```c
/* constp.c：三种组合，谁能改什么 */
#include <stdio.h>

int main(void) {
    int a = 10, b = 20;

    const int *p1 = &a;        /* 左 const：内容不可改，指向可换 */
    p1 = &b;                   /* 合法：换指向 */
    printf("*p1 = %d\n", *p1);
    /* *p1 = 1;                 编译错误：read-only location */

    int *const p2 = &a;        /* 右 const：指向锁死，内容可改 */
    *p2 = 30;                  /* 合法：a 变成 30 */
    printf("a = %d\n", a);
    /* p2 = &b;                 编译错误：read-only variable */

    const int *const p3 = &a;  /* 双 const：内容与指向都锁死 */
    printf("*p3 = %d\n", *p3);
    return 0;
}
```

把两行注释解开，编译器分别报：

```text
error: assignment of read-only location '*p1'
error: assignment of read-only variable 'p2'
```

两条报错正好对应口诀的两侧：`*p1` 是「内容」（read-only location），`p2` 是「指针本身」（read-only variable）。

`int *const` 还有一个连带要求：它声明后不能再说「算了换个指向」，所以初始化必须写在声明同一行。写 `int *const p2;` 再补 `p2 = &a;` 直接触发上面的第二条报错——这个指针成了永远指不了任何地方的废指针。

修改实验：把 `const int *p1` 指向一个普通 int 后，试着用另一个 `int *` 指向同一处去写。能编译、能跑——这不算破坏 const 吗？这条边界属于 const 的类型系统语义与工程用法（「API 只读承诺」），在 [const 与 volatile 详解](/c/260-CVolatileAndConstDeepDive) 深入，本篇先掌握三组合的读法与语法。

## 6. 指针算术：按元素跨步，不按字节

指针可以加、减整数。关键规则一句话：**`p + 1` 前进的是「1 个 p 所指类型」的大小，不是 1 个字节**。地址上跨过的字节数是 `sizeof(元素类型)`。拿 int 数组和 double 数组对比一跑便知：

```c
/* step.c：p + 1 到底跨了几个字节？ */
#include <stdio.h>

int main(void) {
    int    nums[4] = {10, 20, 30, 40};
    double vals[4] = {1.0, 2.0, 3.0, 4.0};
    int    *pi = nums;      /* 指向 nums[0] */
    double *pd = vals;      /* 指向 vals[0] */

    printf("sizeof(int)    = %zu\n", sizeof(int));
    printf("pi     = %p\n", (void *)pi);
    printf("pi + 1 = %p\n", (void *)(pi + 1));

    printf("sizeof(double) = %zu\n", sizeof(double));
    printf("pd     = %p\n", (void *)pd);
    printf("pd + 1 = %p\n", (void *)(pd + 1));
    return 0;
}
```

一次典型输出（地址每次不同，看差值）：

```text
sizeof(int)    = 4
pi     = 0x7ffc31a8b930
pi + 1 = 0x7ffc31a8b934      (差 4 字节：一个 int)
sizeof(double) = 8
pd     = 0x7ffc31a8b940
pd + 1 = 0x7ffc31a8b948      (差 8 字节：一个 double)
```

`int *` 一步 4 字节，`double *` 一步 8 字节。「按元素跨步」正是指针能优雅遍历数组的原因：`p++` 永远落在下一个元素上。

同一数组内的指针还能比较与相减：

```c
int *p2 = &nums[3];
if (pi < p2) {                          /* 比较位置先后 */
    printf("pi 在 p2 前面\n");
}
printf("元素个数: %td\n", p2 - pi);      /* 相减得元素个数 */
```

预期输出：

```text
pi 在 p2 前面
元素个数: 3
```

相减的结果是**元素个数**而非字节数，类型是 `ptrdiff_t`（定义在 `<stddef.h>`，打印用 `%td`）。它还顺手解决一个常见需求：指针减数组首地址就是下标——`p2 - nums` 为 3，即 `&nums[3]` 的下标。

边界在这里划清楚：

- `nums + 4`（**越过头一个不存在的位置**，称 one-past-the-end，哨兵位置）允许形成，允许参与比较和相减，它是遍历循环的终点；
- 解引用 `*(nums + 4)` 是越界访问，UB；
- 往前越过首元素（`nums - 1`）更严格——连**形成**这个指针都是 UB。

所以遍历的惯用写法是左闭右开：

```c
for (int *p = nums; p < nums + 4; p++) {
    printf("%d ", *p);
}
printf("\n");
```

顺带补一句冷知识：下标本来就是算术的语法糖，`arr[2]` 严格等价于 `*(arr + 2)`，交换后写 `2[arr]` 同样合法——能跑，但可读性为零，知道即可，永远别写。

修改实验：把循环终点 `nums + 4` 改成 `nums + 5`，用 `gcc -fsanitize=address` 编译再跑，看越界读如何被当场抓获（第 8 节有同款报告读法）。

`int *p = nums;` 能成立，是因为数组名在表达式中会退化为首元素指针——这层关系的完整规则与三大例外，正是下一篇 [指针与数组的区别](/c/150-PointerArrayDifference) 的主题，这里先混个眼熟。

## 7. void*：通用指针的能与不能

`void *` 是「不关心指向什么类型」的通用指针。两条规则：

1. **任意对象指针与 `void *` 可以互相隐式转换，不需要强转**。`int *` 转 `void *` 再转回 `char *` 都合法（C 语言里；C++ 不允许隐式下行转换）；
2. **解引用前必须转换回具体类型**。`void` 没有大小，编译器不知道该读几个字节，`*vp` 直接编译错误。

```c
int a = 10;
void *vp = &a;                    /* 不需要强转 */
printf("%d\n", *(int *)vp);       /* 先 (int *) 转回，再解引用 */

int *ip = vp;                     /* 转回具体类型也不需要强转 */
```

**算术是禁区**：标准 C 不允许对 `void *` 做加减——`void` 没有大小，「跨一步」无法定义。GCC 把它当 GNU 扩展放行（按 1 字节算），开 `-Wpointer-arith` 会警告；要按字节移动内存，正路是转成 `unsigned char *`。

那 `void *` 用在哪？两个你马上会遇到的地方：

- `malloc` 返回 `void *`：分配的内存还没定类型，转交给调用方（[动态内存](/c/200-DynamicMemoryManagement)）；
- 通用函数的参数。标准库排序函数 `qsort` 能排任何类型，靠的就是 `void *`：

```c
int cmp_int(const void *a, const void *b) {
    int x = *(const int *)a;      /* 先转回真实类型再解引用 */
    int y = *(const int *)b;
    return (x > y) - (x < y);     /* 别写 x - y：大数相减会溢出 */
}
```

`cmp_int` 是函数，却被当成参数传给 `qsort`——这是**函数指针**，本文按下不表，[函数指针与回调](/c/170-FunctionPointerCallback) 专门讲透。

## 8. 常见错误与调试实录：从 SEGV 到野指针

### 实录一：解引用 NULL

```c
/* null_deref.c */
#include <stdio.h>

int main(void) {
    int *p = NULL;
    printf("%d\n", *p);     /* 事故现场 */
    return 0;
}
```

不加工具直接跑，进程带着一行 `Segmentation fault` 死掉。开 ASan 重跑：

```bash
gcc -Wall -Wextra -g -fsanitize=address null_deref.c -o null_deref
./null_deref
```

预期输出（地址与编号每次不同，关键行如下）：

```text
==24510==ERROR: AddressSanitizer: SEGV on unknown address 0x000000000000 (pc 0x5a3c... T0)
==24510==The signal is caused by a READ memory access.
==24510==Hint: address points to the zero page.
    #0 0x5a3c... in main null_deref.c:6
```

逐行读：首行点名事故类型 SEGV（段错误）与出错地址 `0x0`——正是 NULL 的常见取值；第二行说明这是一次 READ；`Hint: address points to the zero page` 补刀「你解引用了空指针」；最后一行给出出错代码在 `null_deref.c` 第 6 行。地址为 0 的访问被硬件拒绝，这就是「解引用 NULL 通常表现为崩溃」的机制。

### 实录二：野指针——未初始化的指针

```c
int *p;        /* 未初始化：里面是上一位使用者留下的垃圾 */
*p = 1;        /* UB：写到哪只有天知道 */
```

NULL 解引用大概率当场崩，野指针更阴险：`p` 里是随机的历史残留值，`*p = 1` 多数时候崩溃，偶尔恰好落在某块可写内存上——于是**悄悄改坏了别的变量**，程序继续带着错数据跑。这类事故在 [内存深水区](/c/210-MemoryManagement) 有完整的 ASan 现场。防线只有一条：定义即初始化，暂时没得指就置 NULL。

### 实录三：悬空指针——free 之后没置 NULL

```c
free(p);       /* 内存已归还分配器 */
p = NULL;      /* 少了这一行，p 就成了悬空指针（dangling pointer） */
```

`free` 只还内存，不改指针：`p` 里还留着旧地址，再解引用就是 use-after-free。置 NULL 的价值在第 4 节两条纪律上兑现：之后的误用会**立刻**崩在案发现场，而不是悄悄踩别人的内存；且 `free(NULL)` 是标准规定的安全空操作，重复 free 的风险一并消除。事故逐行解读见 [内存深水区](/c/210-MemoryManagement)，本篇记住纪律即可。

## 9. 小项目：minmax 双输出

函数的 return 只能带回一个值。要一次带回两个结果——最大值和最小值——指针是标准解法：把结果的地址传进去，函数顺着地址写。

```c
/* minmax.c：一次遍历，同时找出最大与最小 */
#include <stdio.h>

void minmax(const int *arr, size_t n, int *min_out, int *max_out) {
    /* 约定：调用方保证 n >= 1，否则两个输出都无从谈起 */
    int lo = arr[0];
    int hi = arr[0];
    for (size_t i = 1; i < n; i++) {
        if (arr[i] < lo) lo = arr[i];
        if (arr[i] > hi) hi = arr[i];
    }
    *min_out = lo;      /* 顺着地址把结果写回调用方 */
    *max_out = hi;
}

int main(void) {
    int scores[] = {88, 42, 97, 61, 73};
    size_t n = sizeof(scores) / sizeof(scores[0]);

    int lo, hi;
    minmax(scores, n, &lo, &hi);
    printf("min = %d, max = %d\n", lo, hi);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g minmax.c -o minmax
./minmax
```

预期输出：

```text
min = 42, max = 97
```

三个设计点都是本篇知识的直接变现：

- `&lo, &hi` 是「出参（output parameter）」模式，`scanf("%d", &n)` 里你早就在用同款；
- 形参写 `const int *arr`：只读承诺——本函数保证不碰数组内容，谁调谁放心（语义深入见 [const 与 volatile 详解](/c/260-CVolatileAndConstDeepDive)）；
- `minmax` 内部没有 `sizeof` 算长度——数组传参的尺寸陷阱下一篇揭底。

## 10. 二级指针：先混个眼熟

指针自己也是变量，也有地址。存「指针的地址」的变量叫**二级指针**：

```c
int a = 10;
int *p = &a;        /* p 存 a 的地址 */
int **pp = &p;      /* pp 存 p 的地址 */
printf("%d\n", **pp);   /* 解两次才到 a：*pp 是 p，**pp 是 a */
```

一层套一层可以套到 `***`，但三级以上在实际代码里极少见。多级间接寻址有自己的一整套工程用法——命令行参数 `char **argv`、动态二维数组、链表插入的二级指针写法——全部集中在深水篇 [二级指针与指针数组](/c/160-DoublePointerPointerArray)，本篇不展开，你只需要知道：`**` 就是「多解一层引用」，没有新语法。

## 11. 实际项目中的使用场景

- **出参**：minmax、`scanf`、任何「带回多个结果」的函数接口，出参一律指针；
- **遍历与算法**：标准库 `qsort`、`memmove` 的内部就是指针算术在数组上跨步；你写的查找、填充函数用「指针到哨兵」的左闭右开循环最顺；
- **数据结构**：链表结点靠 `next` 指针互链，树靠 `left/right`——指针是 C 里表达「关系」的唯一手段，实例见 [二级指针与指针数组](/c/160-DoublePointerPointerArray)；
- **回调**：把函数的地址交给别人在合适的时机调用（qsort 的比较函数、信号处理器），见 [函数指针与回调](/c/170-FunctionPointerCallback)；
- **动态内存**：堆上的一切都靠指针摸，malloc/free 四件套见 [动态内存](/c/200-DynamicMemoryManagement)。

## 12. 小练习

预测题（5 分钟）：先写下两行的答案，再运行验证：

```c
int nums[4] = {1, 2, 3, 4};
int *p = nums + 1;

p = p + 2;
printf("%d\n", *p);          /* 打印什么？ */
p = p - 3;
printf("%td\n", p - nums);   /* 此刻打印什么？ */
```

参考答案（先写再看）：第一行打印 `4`——`p` 从 `nums[1]` 前进 2 个元素到 `nums[3]`；第二行打印 `0`——`p` 退回 3 个元素回到首元素，指针差为 0。两行合起来复述了第 6 节：跨步按元素，相减得个数。

修改题（10 分钟）：把 minmax.c 改成 `min_of(const int *arr, size_t n, int *min_out)` 单出参版本，并在 `n == 0` 时**不写** `*min_out`、由调用方用返回值 `int` 报告是否成功（0 成功，-1 失败）。验收：`scores` 上得到 42；空数组（`n = 0`）返回 -1 且 main 里不读 `lo`。

挑战题（20 分钟，不看提示先动手）：实现 `int *find(const int *arr, size_t n, int target)`——找到则返回指向该元素的指针，找不到返回 NULL。

提示（思路方向）：遍历指针从 `arr` 走到哨兵 `arr + n`，命中即返回当前指针；走完没命中返回 NULL。

展开（关键点）：调用方拿到返回值后先判 NULL 再解引用；`(result - arr)` 直接得到下标——第 6 节的指针差。

验收清单：`{88, 42, 97}` 中找 97 返回指向 97 的指针、`result - arr` 为 2；找 100 返回 NULL 且不崩；`n = 0` 返回 NULL；`-fsanitize=address` 下运行干净。

## 13. 与之前和之后的知识的关系

- 往前：[函数详解](/c/090-FunctionDetailed) 的值传递解释了 swap_bad 为何失败，指针正是对值传递的破解；[数组详解](/c/040-DataTypeDetailed) 的连续布局是算术按元素跨步的前提；
- 旁支：[指针与数组的区别](/c/150-PointerArrayDifference) 处理本文按下不表的退化规则；[const 与 volatile 详解](/c/260-CVolatileAndConstDeepDive) 展开 const 三组合背后的类型系统；[函数调用栈帧](/c/250-FunctionCallStackFrame) 解释本文打印的那些地址大多住在栈上；
- 往后：[二级指针与指针数组](/c/160-DoublePointerPointerArray) 把 `**` 与指针数组铺开成完整体系；[函数指针与回调](/c/170-FunctionPointerCallback) 把指针指向函数；[动态内存](/c/200-DynamicMemoryManagement) 与 [内存深水区](/c/210-MemoryManagement) 让指针在堆上安家并演示翻车现场。

## 14. 官方文档

- 指针与空指针语义（cppreference C）：https://en.cppreference.com/w/c/language/pointer
- 算术运算符（含指针加减、相减与哨兵规则）（cppreference C）：https://en.cppreference.com/w/c/language/operator_arithmetic
- NULL 宏的定义与可选实现（cppreference C）：https://en.cppreference.com/w/c/types/NULL
- printf 转换说明（%p 的参数类型约定）（cppreference C）：https://en.cppreference.com/w/c/io/printf

## 15. 自我检查

- 能向同事讲清 swap_bad 与 swap 的差别，并顺手画出 `p`、`*p`、`&a` 三者的关系；
- 看到 `const int *const p` 能不假思索说出「内容和指向都锁死」，并写出一行会触发编译错误的使用；
- 能说出 `p + 1` 在 `int *` 与 `double *` 上各跨多少字节，`p2 - p1` 的结果类型与打印格式；
- 能解释为什么 `%p` 要写 `(void *)`、为什么 `void *` 不能解引用、为什么 free 后要置 NULL。

## 本章总结

指针是存地址的变量；`&` 与 `*` 一进一出互逆，`%p` 配 `(void *)` 打印地址。NULL 把「没指」写成代码，判空与置空是两条从今天起生效的纪律。const 与指针的三种组合用口诀读：星号左 const 保护内容，星号右 const 锁死指针。指针算术按元素跨步、按元素相减（`ptrdiff_t`），哨兵位置以内合法，越界与回退都是 UB。`void *` 是类型无关的通用指针：互转自由，解引用前必须转回，算术是 GNU 扩展不能碰。野指针与悬空指针是 UB 的两大来源，防线是定义即初始化、free 后置 NULL。指针还有一层最大的似是而非——数组长得到底像不像指针——下一篇正面强攻。

## 下一步

进入 [指针与数组的区别](/c/150-PointerArrayDifference)：同一个数组，在 main 里 `sizeof` 是 40，传进函数变 8——数组与指针「看起来一样」的表象下，藏着三条例外与一串经典事故。
