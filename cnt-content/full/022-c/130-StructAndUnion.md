---
order: 150
title: 结构体与联合：自定义类型打包
module: 'c'
category: 计算机科学
difficulty: beginner
description: 从「把学生的姓名/学号/成绩打包」出发掌握结构体与联合：tag 声明与 . -> 成员访问、顺序/指定/嵌套三种初始化、逐成员拷贝的赋值语义（数组成员一起搬走）、== 比较的编译错误与 memcmp 的 padding 陷阱、调换成员顺序 sizeof 变化的实验，以及 union 共享存储、写 A 读 B 的边界与 tag+union 变体记录、匿名 union（C11）。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'c/140-PointerDeep'
  - 'c/220-MemoryAlignmentDeepDive'
  - 'c/230-AlignmentMemoryLayout'
  - 'c/240-BitField'
prerequisites:
  - 'c/110-EnumTypedef'
  - 'c/120-ArrayDetailed'
---

## 前置知识

- 已完成 [枚举与 typedef](/c/110-EnumTypedef)：会写枚举（变体记录的「标签」要用它）与 typedef 的基本用法；
- 已完成 [数组详解](/c/120-ArrayDetailed)：会初始化数组、知道「数组不能整体赋值」——本文第 4 节有一个漂亮的反转。

struct 的成员就是普通变量，没见过的类型写法用到时会当场解释。

> 分工说明：结构体的内存布局由三篇接力。本篇是主线：怎么用，加上 padding 初见（成员顺序为什么改变 sizeof）；[内存对齐](/c/220-MemoryAlignmentDeepDive) 拆机制——对齐规则、alignof/offsetof、#pragma pack 与 _Alignas；[布局深水区](/c/230-AlignmentMemoryLayout) 讲工程后果——成员排序的收益、跨平台布局差异、序列化为什么不能直接 memcpy 结构体；把一个整数拆到「位」是 [位域](/c/240-BitField) 的事。本篇与它们唯一的重叠是第 6 节的 sizeof 实验，作为通往 220 的入口。

## 学习目标

读完本文你将能够：

1. 声明 struct、用 `.` 与 `->` 访问成员，用顺序、指定初始化器、嵌套三种写法初始化，并写出结构体数组；
2. 解释结构体赋值是逐成员拷贝（数组成员一起搬）、传参与返回值都是整包拷贝，据此说出什么时候该改传 `const` 指针；
3. 说出结构体为什么不能用 `==` 比较，读懂编译器的报错，用逐成员比较替代，并解释 memcmp 为什么不可靠；
4. 完成「调换成员顺序看 sizeof 变化」的实验，用 padding 解释结果，并说出深入对齐在哪两篇；
5. 从零写出 tag+union 变体记录，解释 union 大小为什么等于最大成员按对齐补齐，说清写 A 读 B 的边界与匿名 union（C11）。

预计 60 到 80 分钟，包含 5 组动手实验、2 道预测题与 1 道挑战题。

## 1. 问题引入：三个散变量的管理成本

```c
/* no_struct.c：一个学生三个变量，两个学生六个变量 */
#include <stdio.h>

int main(void) {
    char name1[20] = "Alice";  long id1 = 1001;  double score1 = 92.5;
    char name2[20] = "Bob";    long id2 = 1002;  double score2 = 78.0;

    printf("%s %ld %.1f\n", name1, id1, score1);
    printf("%s %ld %.1f\n", name2, id2, score2);
    return 0;
}
```

一个学生要三个变量，全班 40 人要 120 个；把一个学生传给函数要三个参数；交换两个学生要六次赋值。这些数据在逻辑上属于同一个「学生」，语言却看不出这层关系——[数组详解](/c/120-ArrayDetailed) 解决「多个同类型」，这里的问题是「一组不同类型」。

struct（结构体）让你自己定义一个「学生类型」，把不同类型的成员打包成一个整体：

```c
struct Student {
    char   name[20];
    long   id;
    double score;
};
```

从此 `struct Student s1 = {"Alice", 1001, 92.5};` 一句话就是一个学生，传参、赋值、放进数组都按「一个整体」处理。本文沿两个问题走：**怎么用**（第 2 到 5 节）与**它在内存里长什么样**（第 6 到 8 节）。

## 2. 声明与成员访问：tag、. 与 ->

### 2.1 声明与 tag

`struct Student { ... };` 里的 `Student` 是 tag（标签）。声明变量必须写全 `struct Student s;`——C 里 struct 关键字不能省。嫌啰嗦就用 typedef 起别名（typedef 的完整机制在[枚举与 typedef](/c/110-EnumTypedef)）：

```c
typedef struct Student Student;   /* 此后写 Student s; 即可 */
```

注意定义末尾的分号——丢了它，报错会指向下一行代码，非常难查。

### 2.2 点号访问成员

```c
struct Student s = {"Alice", 1001, 92.5};
printf("%s\n", s.name);    /* 读 */
s.score = 95.0;            /* 写：成员就是普通变量 */
```

### 2.3 箭头：先混个眼熟

```c
struct Student *p = &s;
printf("%ld %ld\n", p->id, (*p).id);   /* 两者完全等价 */
```

`p->x` 完全等价于 `(*p).x`——「顺着指针找到结构体，再取成员」。指针的解引用机制本文按下不表，[指针深度解析](/c/140-PointerDeep) 讲透；现在只需认识这个符号，第 8 节的函数参数会再用到它。

## 3. 初始化：顺序、指定与嵌套

```c
/* init_styles.c：三种初始化写法 */
#include <stdio.h>

struct Date { int year; int month; int day; };

struct Student {
    char        name[20];
    long        id;
    long        group;
    double      score;
    struct Date birthday;      /* 嵌套结构体 */
};

int main(void) {
    struct Student a = {"Alice", 1001, 3, 92.5, {2005, 5, 15}};        /* 顺序初始化 */
    struct Student b = { .id = 1002, .score = 78.0, .name = "Bob" };   /* 指定初始化器（C99）*/
    struct Student c = { .name = "Carol", .birthday = {2004, 12, 1} }; /* 嵌套初始化 */

    printf("%s %ld %ld %.1f %d\n", a.name, a.id, a.group, a.score, a.birthday.year);
    printf("%s %ld %.1f\n",        b.name, b.id, b.score);
    printf("%s %d-%d-%d\n",        c.name, c.birthday.year, c.birthday.month, c.birthday.day);
    return 0;
}
```

预期输出：

```text
Alice 1001 3 92.5 2005
Bob 1002 78.0
Carol 2004-12-1
```

三条规则：

1. 与数组一样：初始化列表只要出现，**没写到的成员保证清零**——b 没写 birthday 与 group，全是 0；
2. 指定初始化器 `.成员 = 值` 比顺序写法**抗修改**：以后往结构体中间插入新成员，顺序写法全体错位，指定写法不受影响。实际项目首选；
3. 嵌套结构体用 `{...}` 对应，或一路 `.birthday.year = ...` 点下去。

结构体数组（每个格子是一个完整结构体，写法与普通数组一致）：

```c
struct Student roster[3] = {
    {"Alice", 1001, 3, 92.5, {2005, 5, 15}},
    {"Bob",   1002, 5, 78.0, {2004, 8, 20}},
    {.name = "Carol", .id = 1003, .score = 88.0}
};
for (int i = 0; i < 3; i++) printf("%s\n", roster[i].name);
```

修改实验一：把声明里的 `long id; long group;` 调换成 `long group; long id;` 再运行——顺序初始化的 a 里 1001 与 3 **静默对调**（编译器不报错），而指定初始化器的 b 毫发无伤。这就是「指定初始化器抗修改」的现场，也是 120 篇「数组三个不能」之外的新教训：顺序初始化的正确性挂在成员顺序上。

## 4. 赋值语义：逐成员拷贝，数组成员也不例外

120 篇的结论：数组不能整体赋值。结构体反转了这条：

```c
/* assign.c：结构体赋值是逐成员拷贝 */
#include <stdio.h>

struct Student {
    char name[20];
    long id;
};

int main(void) {
    struct Student a = {"Alice", 1001};
    struct Student b;
    b = a;                                  /* 整体赋值：合法 */
    a.name[0] = 'X';                        /* 改 a 的名字 */
    printf("a = %s %ld\n", a.name, a.id);
    printf("b = %s %ld\n", b.name, b.id);   /* b 的 name 数组完好 */
    return 0;
}
```

预期输出：

```text
a = Xlice 1001
b = Alice 1001
```

赋值把右操作数的值**逐成员拷贝**进左操作数，`char name[20]` 这个数组成员也被整个搬走——这正是「数组包进结构体就能整体赋值」的原因：赋值发生在结构体层面，数组只是跟着一起搬家的成员。标准对结构体赋值的要求是两侧类型相容。

同一个拷贝语义还出现在两个地方：

- **传参即拷贝**：`void print(struct Student s)` 收到的是整包副本，函数内改它不影响调用者的原件；
- **返回即拷贝**：`struct Point make(int x, int y)` 返回时整体拷出。小型结构体（两三个标量）这么写清晰又常见。

成本直觉：拷贝成本与 `sizeof` 成正比。几十字节无所谓；一个带 `char title[512]` 的结构体在热循环里按值传来传去，就是每次 512 字节的搬运。工程惯例：**只读访问传 `const struct Student *`，需要修改才传指针**，小型结构体随意。指针怎么用是 [指针深度解析](/c/140-PointerDeep) 的主题，这里先记住选择标准。

修改实验二：给 assign.c 的 struct 加一个 `char title[512];` 成员，打印 `sizeof(struct Student)`，直观看到「包有多大，拷多大」。

## 5. 结构体不能用 == 比较

```c
/* cmp_err.c */
struct Point { int x; int y; };

int main(void) {
    struct Point p1 = {1, 2}, p2 = {1, 2};
    if (p1 == p2) { }        /* 编译不过 */
    return 0;
}
```

```text
cmp_err.c:8:9: error: invalid operands to binary == (have 'struct Point' and 'struct Point')
```

`==` 只为算术类型与指针定义，结构体不在名单上——这是**编译错误**，不是警告。C 不替结构体生成逐字段比较，因为「相等」的含义该由你定：比全部成员，还是只比主键？

替代一，逐成员比较（默认选择）：

```c
if (p1.x == p2.x && p1.y == p2.y) { /* 逻辑相等 */ }
```

替代二，`memcmp(&p1, &p2, sizeof p1)`——整块字节比较。但它有个著名的坑：**padding 字节不参与逻辑，却参与 memcmp**。两个「成员完全相等」的结构体，中间的填充字节可能不同（下一节讲 padding 是什么），memcmp 就会判「不等」。规则：初学者一律逐成员比较；memcmp 只在你保证两个结构体以完全相同的方式构造（比如都先整体清零）时才可靠。第 9 节有可运行的翻车实录。

含字符串成员时同理：`strcmp(a.name, b.name) == 0`；`a.name == b.name` 比的是地址（120 篇的「不能比较」）。

## 6. 内存布局：padding 初见

先做实验，再解释。

```c
/* layout.c：sizeof 与成员顺序 */
#include <stdio.h>

struct A { char c; double d; int i; };
struct B { double d; int i;  char c; };

int main(void) {
    printf("sizeof A = %zu\n", sizeof(struct A));
    printf("sizeof B = %zu\n", sizeof(struct B));
    return 0;
}
```

64 位平台一次典型输出：

```text
sizeof A = 24
sizeof B = 16
```

两个结构体的成员**完全相同**，只是顺序不同，大小却差了 8 字节。原因是 padding（填充字节）：CPU 访问对齐的地址更快也更安全，编译器在每个成员前面垫字节，把每个成员放到「自身对齐要求的整数倍」偏移上，最后再把总大小补齐到最大成员对齐的整数倍。手算对照：

```text
struct A: c(1) + 垫7 + d(8) + i(4) + 垫4 = 24
struct B: d(8) + i(4) + c(1) + 垫3 = 16
```

对初学者的实用推论只有两条：`sizeof` 不要心算成员相加，直接量；成员按「从大到小」排通常更省内存——记住这是习惯，规则细节见下。

本文到此为止：CPU 为什么要对齐、`alignof`/`offsetof` 怎么量出每条规则、`#pragma pack` 与 `_Alignas` 怎么改规则，见 [内存对齐](/c/220-MemoryAlignmentDeepDive)；成员排序的工程收益、跨平台布局差异、「存档能不能直接 memcpy 结构体」，见 [布局深水区](/c/230-AlignmentMemoryLayout)。

## 7. 嵌套与自引用

嵌套已在第 3 节见过：成员可以是另一个结构体类型，访问时一层层点下去（`c.birthday.year`）。

更有趣的是**自引用**：结构体的成员是自己类型的指针。

```c
/* node.c：链表节点，先混个眼熟 */
#include <stdio.h>
#include <stdlib.h>

struct Node {
    int          data;
    struct Node *next;      /* 指向下一个同类节点 */
};

int main(void) {
    struct Node *n = malloc(sizeof(struct Node));   /* 节点从堆上要 */
    if (n == NULL) return 1;
    n->data = 42;
    n->next = NULL;                                  /* NULL 表示链到此为止 */
    printf("%d\n", n->data);
    free(n);
    return 0;
}
```

为什么成员不能是 `struct Node` 本身？那会让「结构体大小」无穷循环；而指针的大小是固定的，没问题。`malloc`/`free` 的完整纪律在 [动态内存](/c/200-DynamicMemoryManagement)，链表的完整搭建也在那里展开——本文只需要建立「结构体 + 自引用指针 = 节点可以串起来」的直觉。

## 8. union：同一块存储，多个名字

### 8.1 语义与大小

union（联合体）的所有成员**共享同一块存储**：同一时刻只有一个成员的值是有效的，写入新成员会覆盖旧成员的字节。

```c
/* union_size.c：union 的大小 = 最大成员，再按对齐补齐 */
#include <stdio.h>

union Data {
    char  c[5];
    float f;
    int   i;
};

int main(void) {
    printf("sizeof(union Data) = %zu\n", sizeof(union Data));
    return 0;
}
```

```text
sizeof(union Data) = 8
```

不是最大成员的 5 字节，而是 8：union 要装得下最大成员 `char c[5]`，再补齐到最苛刻成员（`float`，对齐 4）的整数倍。成员从同一起点开始摆放。写入 `d.f = 1.0f;` 之后读 `d.i`，读到的不是「数值转换」，而是**同一批字节的重新解释**。

### 8.2 写 A 读 B：边界在哪里

```c
/* pun.c：写 float，读 int */
#include <stdio.h>

union Bits {
    float f;
    int   i;
};

int main(void) {
    union Bits b;
    b.f = 1.0f;
    printf("i = %d (0x%X)\n", b.i, b.i);
    return 0;
}
```

一次典型输出（x86-64 小端机）：

```text
i = 1065353216 (0x3F800000)
```

`1.0f` 的 IEEE 754 编码恰好是 `0x3F800000`——你看到的不是「1 转成的整数」，是 float 的四个字节被当作 int 重读。这种「写 A 读 B」叫类型双关（type punning），它的规矩：

- 通过 union 成员读**上次用另一个成员写入**的内容：自 C99 修订起按**未指定（unspecified）**处理——此前是未定义行为，常见实现都按「重读字节」来做，但标准不承诺结果是什么。能用、常见，但结果不写进合同；
- 读出的字节顺序通常依赖**字节序**（大端机与小端机按字节读出的顺序相反），跨平台代码不要依赖具体字节；想做确定性的按位重解释，用 `memcpy` 拷进无符号整型再读，比 union 更可移植。

### 8.3 用途一：寄存器与数据帧的多视图

嵌入式与协议代码常见这种写法：同一个 32 位值，既能整体赋值，又能按字段拆开看——视图不同，存储只有一份（写法示意）：

```c
union Status {
    unsigned int raw;      /* 整体读写 */
    struct {               /* C11 匿名结构体：成员直接提升到外层 */
        unsigned int ready : 1;
        unsigned int mode  : 3;
    };
};
/* s.raw = 0xFF; 之后 s.ready、s.mode 都能直接读写 */
```

（`unsigned int ready : 1` 是位域写法——把成员精确到「位」，完整语义与可移植性在 [位域](/c/240-BitField)。）

### 8.4 用途二：变体记录（tag + union）

union 回答「同一时刻只需要其中一种」，但没人记得当前存的是哪种——加一个标签成员，把 union 装回 struct：

```c
/* tagged.c：变体记录 */
#include <stdio.h>

enum Kind { KIND_INT, KIND_FLOAT, KIND_TEXT };

struct Value {
    enum Kind kind;            /* 标签：当前 union 里存的是什么 */
    union {                    /* C11 匿名联合：成员直接提升，v.i 而非 v.data.i */
        int   i;
        float f;
        char  text[12];
    };
};

void print_value(const struct Value *v) {
    switch (v->kind) {
    case KIND_INT:   printf("int: %d\n", v->i); break;
    case KIND_FLOAT: printf("float: %f\n", v->f); break;
    case KIND_TEXT:  printf("text: %s\n", v->text); break;
    default:         printf("unknown\n"); break;
    }
}

int main(void) {
    struct Value a = { .kind = KIND_INT,  .i = 42 };
    struct Value b = { .kind = KIND_TEXT, .text = "hello" };
    print_value(&a);
    print_value(&b);
    return 0;
}
```

预期输出：

```text
int: 42
text: hello
```

这里的 union 连名字都没有——C11 的**匿名联合（anonymous union）**：不写成员名，union 的成员直接提升为外层结构体的成员，访问 `v.i` 而不必 `v.data.i`。匿名 struct/union 都是 C11 起进入标准（GCC/Clang 更早以扩展形式支持）。纪律：写 union 前先设 `kind`，读之前先查 `kind`——按错标签读到的就是 8.2 节说的未指定值。

选型一句话：**每个成员都要同时存在，用 struct；同一时刻只要一个，用 union；运行时才知道用哪个，就 tag + union。**

## 9. 常见错误与调试实录：memcmp 的 padding 陷阱

```c
/* memcmp_trap.c */
#include <stdio.h>
#include <string.h>

struct Packet {
    char tag;      /* 偏移 0，后面垫 3 字节 */
    int  len;      /* 偏移 4 */
    int  value;    /* 偏移 8 */
};

int main(void) {
    struct Packet a = {.tag = 'A', .len = 4, .value = 42};   /* 列表初始化：padding 也是 0 */
    struct Packet b;                                         /* 逐成员赋值：padding 没人管 */
    b.tag = 'A'; b.len = 4; b.value = 42;

    printf("members equal: %d\n", a.tag == b.tag && a.len == b.len && a.value == b.value);
    printf("memcmp equal:  %d\n", memcmp(&a, &b, sizeof a) == 0);
    return 0;
}
```

一次典型输出（b 的 padding 里是栈上的垃圾，每次运行可能不同）：

```text
members equal: 1
memcmp equal:  0
```

三个成员逐个比对全部相等，memcmp 却说不等——那 3 个填充字节里，a 是 0（初始化列表清零保证），b 是没初始化的垃圾。第 5 节的警告在此兑现：**memcmp 比的是字节，包括你不知道也不关心的填充字节**。修法就是逐成员比较；或者保证两边都以同样的方式清零后构造。常见错误清单：

- struct 定义末尾忘分号：报错指向下一行，往上一行找；
- 按值传大结构体进热循环：改 `const` 指针（第 4 节）；
- 读 union 前忘了设标签：未指定值（8.4 节）；
- 结构体里的 `char name[N]` 在 `strcpy` 时越界：溢出会写进相邻成员甚至越出结构体，边界习惯见[安全函数与边界检查](/c/450-SafeFunctionBoundsCheck)。

## 10. 实际项目中的使用场景

- 配置结构体 + 指定初始化器：默认值清晰，加字段不破坏既有调用点；
- 协议帧与硬件寄存器：union 多视图加位域拆字段（8.3 节），嵌入式日常，见 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)；
- 变体记录：消息类型、解释器的值、图形形状（本文挑战题）都是 tag + union；
- 链表、树、图：自引用结构体加 malloc 的节点，见 [动态内存](/c/200-DynamicMemoryManagement)；
- 记录表：结构体数组（第 3 节的 roster）加 qsort 按成员排序，比较器用函数指针，见 [函数指针与回调](/c/170-FunctionPointerCallback)；完整的学生成绩管理系统实战在 [C 项目实战：学生成绩系统](/c/580-CProjectExampleStudentGradeSystem)。

## 11. 小练习

预测题一（5 分钟）：

```c
struct X { char a; int b; char c; };
struct Y { int b; char a; char c; };
```

`sizeof(struct X)` 与 `sizeof(struct Y)` 各是多少（常见 64 位平台）？

参考答案（先写再看）：12 与 8。X：a(1) + 垫3 + b(4) + c(1) + 垫3 = 12；Y：b(4) + a(1) + c(1) + 垫2 = 8——「从大到小」排省 4 字节，与第 6 节实验同一原理。

预测题二（5 分钟）：

```c
union Half { short s; unsigned char c[2]; } h;
h.s = 0x0102;
```

在常见的小端 x86 机器上，`h.c[0]` 与 `h.c[1]` 各是多少？

参考答案（先写再看）：`c[0]` 是 2（低字节在低地址），`c[1]` 是 1。这正是 8.2 节说的「读出什么取决于字节序」——大端机会反过来，所以不要写依赖具体顺序的代码。

挑战题（40 分钟）：形状面积计算器。用 tag + union 支持圆（半径）与矩形（宽、高）：定义 `enum ShapeKind` 与 `struct Shape`（含匿名 union），写 `double shape_area(const struct Shape *s)` 与打印函数，在 main 里构造半径 2 的圆与 3 × 4 的矩形各一个并打印面积。提示两级如下。

提示（思路方向）：面积函数先 switch `kind`；圆周率 `#define PI 3.14159265358979`。

展开（关键点）：参数是 `const struct Shape *s`，用 `->` 访问；匿名 union 的成员直接 `s->radius`、`s->width`、`s->height`；switch 记得 default 返回 0。

验收清单：编译无警告；面积输出在 12.57 与 12.00 附近；给 enum 加一个暂未实现的形状种类，确认走 default 不崩。

## 12. 与之前和之后的知识的关系

- 往前：[枚举与 typedef](/c/110-EnumTypedef) 的枚举在本文当了标签，typedef 简化了声明；[数组详解](/c/120-ArrayDetailed) 的初始化规则（剩余清零、指定初始化器）原样适用于结构体，「数组不能整体赋值」在第 4 节被结构体反转；
- 旁支：`->` 的原理在 [指针深度解析](/c/140-PointerDeep)；padding 的完整规则与工具在 [内存对齐](/c/220-MemoryAlignmentDeepDive)，工程后果在 [布局深水区](/c/230-AlignmentMemoryLayout)；拆到「位」的成员是 [位域](/c/240-BitField)；
- 往后：结构体指针与 malloc 组合出链表与树（[动态内存](/c/200-DynamicMemoryManagement)）；大结构体在函数调用中怎么进栈出栈，[函数调用栈帧](/c/250-FunctionCallStackFrame) 给出全景。

## 13. 官方文档

- struct（cppreference C）：https://en.cppreference.com/w/c/language/struct.html
- union（含大小、类型双关与匿名联合，cppreference C）：https://en.cppreference.com/w/c/language/union.html
- 赋值运算符（含「结构体里的数组可以赋值」注记）：https://en.cppreference.com/w/c/language/operator_assignment
- 相等运算符（含「结构体不可 ==、memcmp 不可靠」注记）：https://en.cppreference.com/w/c/language/operator_comparison

## 14. 自我检查

- 能写出 tag 声明、typedef 简化、指定初始化器、结构体数组的完整小例子；
- 能向同事解释结构体赋值拷贝了什么、传参拷贝了什么、什么时候该改传 const 指针；
- 能说出 `==` 比较结构体为什么是编译错误、memcmp 为什么不可靠，替代方案怎么选；
- 能从零写出 tag + union 变体记录，说出匿名 union 是哪个标准引入、使用纪律是什么，并用成员顺序解释 sizeof 的差异。

## 本章总结

struct 把不同类型的成员打包成一个整体：可以整体命名、整体赋值（逐成员拷贝，数组成员一起搬）、整体传递（按 sizeof 付拷贝成本，大包改传 const 指针）；初始化沿用数组的规则，指定初始化器让写法抗修改。结构体不能 `==` 比较（编译错误），逐成员比较是默认，memcmp 因 padding 字节不可靠。内存布局里编译器为对齐垫入 padding，成员顺序直接影响 sizeof。union 让成员共享同一块存储，大小等于最大成员按对齐补齐，写 A 读 B 是未指定的类型双关；配上枚举标签就是变体记录，匿名 union（C11）省掉一层名字。选型口诀：都要用 struct，只用一个用 union，运行时二选一用 tag + union。

## 下一步

进入 [指针深度解析](/c/140-PointerDeep)：本文两处「先混个眼熟」的 `->` 与自引用指针都是预告——`p->x` 为什么等价 `(*p).x`、`struct Node *next` 里到底存了什么，指针篇一次讲透。
