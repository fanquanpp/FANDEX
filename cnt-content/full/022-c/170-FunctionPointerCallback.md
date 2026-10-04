---
order: 190
title: 函数指针与回调：把行为当参数传
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 从 qsort「一行排任意类型」的读心术之谜出发：读懂函数指针声明、函数名退化与两种调用写法、typedef 三步法；qsort 比较器完整实战（含减法溢出陷阱实录）、带上下文的泛型 apply、事件处理器表，讲清 C 函数指针为什么不是闭包，以及对象指针与函数指针互转的标准边界。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'c/180-FunctionPointerCallbackJumpTable'
  - 'c/190-ComplexDeclarationParsing'
  - 'c/100-VarargsFunction'
  - 'c/340-SignalHandling'
prerequisites:
  - 'c/090-FunctionDetailed'
  - 'c/140-PointerDeep'
---

## 前置知识

- 已完成 [函数详解](/c/090-FunctionDetailed)：会声明函数、传参数、写返回值——本文要把「函数」本身变成可以传来传去的东西；
- 已完成 [指针深度解析](/c/140-PointerDeep)：会解引用、会 `const void *` 这类写法。函数指针不过是「指向的东西从数据换成了代码」。

> 分工说明：170 与 180 合讲函数指针。本篇是主教学，回答「函数指针是什么、回调怎么写」：声明读法、typedef、qsort 比较器、带上下文的泛型遍历；[跳转表](/c/180-FunctionPointerCallbackJumpTable) 专讲这一招的头号应用——用函数指针数组替换长 switch，做表驱动的命令分发。两篇示例不重复，本篇是 180 的地基。

## 学习目标

读完本文你将能够：

1. 读懂 `int (*fp)(int, int)` 这类函数指针声明，并说清它与 `int *f(int)` 的区别；
2. 用 typedef 三步法给函数指针类型起名，写出以函数指针为参数的函数；
3. 为 qsort 写出类型安全的比较器，指出「返回 `a - b`」的溢出陷阱并给出安全写法；
4. 用 `void *` 上下文实现泛型 apply 与事件处理器表，解释 C 函数指针为什么不是闭包；
5. 说出函数指针类型不匹配与调用空指针的下场，以及对象指针与函数指针互转在 ISO C 与 POSIX 里各自的边界。

预计 50 到 70 分钟，含 4 组修改实验、1 道预测题与 1 道挑战题。

## 1. 问题引入：qsort 怎么知道怎么比

```c
/* qsort_demo.c：同一个 qsort，排三种类型 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int cmp_int(const void *pa, const void *pb) {
    int a = *(const int *)pa, b = *(const int *)pb;
    return (a > b) - (a < b);
}

int cmp_double(const void *pa, const void *pb) {
    double a = *(const double *)pa, b = *(const double *)pb;
    return (a > b) - (a < b);
}

int cmp_str(const void *pa, const void *pb) {
    const char *a = *(const char *const *)pa;
    const char *b = *(const char *const *)pb;
    return strcmp(a, b);
}

int main(void) {
    int    nums[]  = { 42, 7, 19, 3 };
    double temps[] = { 36.6, 0.5, -12.8, 99.9 };
    char  *words[] = { "pear", "apple", "fig", "banana" };

    qsort(nums,  4, sizeof nums[0],  cmp_int);
    qsort(temps, 4, sizeof temps[0], cmp_double);
    qsort(words, 4, sizeof words[0], cmp_str);

    for (int i = 0; i < 4; i++) printf("%d ", nums[i]);
    printf("\n");
    for (int i = 0; i < 4; i++) printf("%.1f ", temps[i]);
    printf("\n");
    for (int i = 0; i < 4; i++) printf("%s ", words[i]);
    printf("\n");
    return 0;
}
```

```bash
gcc -Wall -Wextra -g qsort_demo.c -o qsort_demo
./qsort_demo
```

预期输出：

```text
3 7 19 42
-12.8 0.5 36.6 99.9
apple banana fig pear
```

疑点：qsort 在标准库里，1978 年写 K&R C 的人不可能见过你的 `double`，它凭什么排得对？答案在每个调用的第四个实参里：`cmp_int`、`cmp_double`、`cmp_str`——这些是你写的**函数的名字**，却被当成值传进了库函数内部。把行为当参数传，这就是函数指针（function pointer）。三个比较器的门道，第 4 节逐一拆开。

## 2. 函数指针语法：声明、赋值与调用

函数是内存里的一段指令，有入口地址。函数指针就是一个存这个地址的变量——类型是「返回类型 + 参数列表」合起来的签名，一个都不能差。

```c
/* fp_basics.c */
#include <stdio.h>

int add(int a, int b) { return a + b; }

int main(void) {
    int (*fp)(int, int) = add;     /* 声明并初始化 */

    printf("%d\n", fp(2, 3));      /* 5：直接通过指针调用 */
    printf("%d\n", (*fp)(2, 3));   /* 5：解引用后调用，两种写法完全等价 */

    int (*gp)(int, int) = &add;    /* 与 add 等价：& 可写可不写；另可验证 fp == gp 成立 */
    printf("%d\n", gp(10, 20));    /* 30 */
    return 0;
}
```

预期输出：

```text
5
5
30
```

三个语法点，每个背后有机制：

1. **声明怎么读**：`int (*fp)(int, int)` 从里往外读——`(*fp)` 的括号先把 fp 和 `*` 锁在一起，说明 fp 是指针；跟着的 `(int, int)` 说明它指向的函数吃两个 int；最左的 `int` 说明返回 int。括号不是装饰：`()` 的优先级高于 `*`，不写括号含义就变（见第 3 点）。
2. **函数名即地址**（函数到指针的转换，function-to-pointer conversion）：赋值和传参时，函数名自动退化成函数指针，所以 `fp = add` 与 `fp = &add` 等价。这也是识别回调的标志：参数位置出现「不带括号的函数名」。
3. **与「返回指针的函数」区分**：`int *f(int)` 里 `f` 先和 `(int)` 结合——f 是函数，返回 `int *`；`int (*f)(int)` 里括号先锁住 `(*f)`——f 是指针。一句话：**看标识符先跟 `()` 还是先跟 `*` 结合**。这个读法延伸下去就是复杂声明的整套规则，[复杂声明解析](/c/190-ComplexDeclarationParsing) 专门讲。

调用写法上 `fp(x)` 与 `(*fp)(x)` 等价：解引用函数指针得到「函数指代符」，它随即又退化回指针——绕一圈回到原地，标准因此规定两种写法同义。工程上常用短的 `fp(x)`；`(*fp)(x)` 的好处是「我在间接调用」写在脸上。

修改实验一：把声明改成 `double (*fp)(int, int) = add;` 再编译。返回类型变了，类型就不匹配——新编译器（GCC 14 起）直接报错 `incompatible pointer type`，老编译器给警告。记牢这条报错，第 7 节解释为什么标准对这种代码判死刑。

## 3. typedef 三步法与函数指针做参数

裸写函数指针类型，声明一长就难读。typedef 三步法给它起名：

1. 先写出你想要的变量声明：`int (*fp)(int, int);`
2. 把变量名换成新类型名，前面加 typedef：`typedef int (*BinaryOp)(int, int);`
3. 之后 `BinaryOp` 就是一个正常类型：`BinaryOp fp = add;`

还有一种读内核源码会遇到的写法——typedef 的是**函数类型**而不是指针类型：

```c
typedef int BinOpFn(int, int);   /* 给「int(int,int) 这个函数类型」起名 */
BinOpFn *fp = add;               /* 加个 * 仍是函数指针 */
```

typedef 只是同义词，不发明新类型，所以 `BinOpFn *fp` 与 `int (*fp)(int, int)` 完全相同。两种都对，指针版更常见。typedef 最大的收益在函数签名里——函数指针做参数：

```c
/* transform.c：行为由调用者注入 */
#include <stdio.h>

typedef int (*IntFn)(int);

int square(int x) { return x * x; }
int negate(int x) { return -x; }

void transform(int *arr, size_t n, IntFn f) {
    for (size_t i = 0; i < n; i++) {
        arr[i] = f(arr[i]);
    }
}

int main(void) {
    int a[] = { 1, 2, 3, 4 };
    transform(a, 4, square);
    for (int i = 0; i < 4; i++) printf("%d ", a[i]);
    printf("\n");

    transform(a, 4, negate);
    for (int i = 0; i < 4; i++) printf("%d ", a[i]);
    printf("\n");
    return 0;
}
```

预期输出：

```text
1 4 9 16
-1 -4 -9 -16
```

`transform` 对数组元素「做什么」完全由调用者决定——它自己只管「逐个应用」。这就是回调（callback）模式：被调用者在合适时机回头调用你塞给它的函数。

顺带一个常用小件——返回函数指针的函数。有了 typedef，返回类型一行写完；没有 typedef 就得写 `int (*pick_op(char c))(int, int)`，典型的复杂声明（[复杂声明解析](/c/190-ComplexDeclarationParsing) 练这类读法）：

```c
typedef int (*BinOp)(int, int);

int add(int a, int b) { return a + b; }
int sub(int a, int b) { return a - b; }

BinOp pick_op(char c) {
    switch (c) {
        case '+': return add;
        case '-': return sub;
        default:  return NULL;   /* 未知运算符用 NULL 表达 */
    }
}
```

调用方必须先判 NULL 再调用（第 7 节讲为什么）。

修改实验二：给 `pick_op` 增加乘法分支，并在 main 里调用 `pick_op('?')` 验证返回 NULL——「未知运算符」该报错还是给默认值？这就是 API 设计。

## 4. 回调实战一：qsort 与比较器契约

现在回到开头。qsort 的完整签名：

```c
void qsort(void *ptr, size_t count, size_t size,
           int (*compar)(const void *, const void *));
```

它排的是「一块内存里若干个等长元素」，元素类型一无所知，所以前三个参数只够它找到每个元素的**地址**；至于两个元素谁大谁小，只能反过来问调用者——第四个参数就是这个问题本身。参数类型是 `const void *`（通用对象指针）：qsort 递给你两张「不知道内容的字条」，你清楚自己的类型，转回正确类型再解引用。

比较器契约（硬规定，不是约定俗成）：返回负数表示第一参数排在第二参数之前，返回零表示两元素等价、顺序不分先后，返回正数表示第一参数排在第二参数之后。手册页原文：比较函数必须在第一参数「小于、等于或大于」第二参数时，相应地返回「小于、等于或大于零」的整数。同时它**只读不写**两个元素，且对同一对元素必须给出一致的结果。

### 4.1 减法溢出陷阱实录

网上教程最常见的写法是直接 `return a - b;`（即下面 cmp_bad 第 7 行）。日常小数字下它工作正常，危险恰恰在此——测试全过，线上爆炸。制造一次事故：

```c
/* cmp_sub.c：减法比较器在极端值上翻车 */
#include <stdio.h>
#include <stdlib.h>
#include <limits.h>

int cmp_bad(const void *pa, const void *pb) {
    return *(const int *)pa - *(const int *)pb;   /* 第 7 行 */
}

int main(void) {
    int arr[] = { 0, INT_MAX, INT_MIN };
    qsort(arr, 3, sizeof arr[0], cmp_bad);
    for (int i = 0; i < 3; i++) printf("%d ", arr[i]);
    printf("\n");
    return 0;
}
```

```bash
gcc -Wall -Wextra -g cmp_sub.c -o cmp_sub && ./cmp_sub
gcc -Wall -Wextra -g -fsanitize=undefined cmp_sub.c -o cmp_sub_ubsan && ./cmp_sub_ubsan
```

第一次运行的典型输出（实现与库版本不同、结果可能不同——重点是不升序）：

```text
0 2147483647 -2147483648
```

排完序 INT_MAX 竟然排在 INT_MIN 前面。原因：这些差值超出 int 范围，有符号溢出是未定义行为（UB）；实践中回绕成负数，比较器给出颠倒的结论。第二次运行带上 UBSan，标准替你盖章（列号随版本略有差异）：

```text
cmp_sub.c:7:12: runtime error: signed integer overflow: 0 - -2147483648 cannot be represented in type 'int'
0 2147483647 -2147483648
```

正确写法（推荐第一种）：

```c
return (a > b) - (a < b);   /* 两个 0/1 相减，结果只有 -1、0、+1 */
/* 等价：if (a < b) return -1; if (a > b) return 1; return 0; */
```

`(a > b) - (a < b)` 的两个括号各是 0 或 1，相减永远落在 -1、0、+1，不存在溢出；qsort 只看符号，-1 和 -2147483648 对它等价。编译器认得这个惯用法，生成的代码与减法版一样是几条无分支指令。降序调转：`(a < b) - (a > b)`。double 同理用比较运算符写，绝不要写 `a - b`——除了精度问题还有 NaN：NaN 与任何数比较都为假，两个括号同时取 0，NaN 的位置于是未指定。

### 4.2 字符串比较器：指针的指针

回看第 1 节的 `cmp_str`。要排的是 `char *words[]`——数组元素是 `char *`（一个地址），qsort 递来的 `pa` 指向**这个数组元素**，所以是「指向 char 的指针」的指针，先解一层再交给 strcmp（strcmp 本身就返回负/零/正）：

```c
const char *a = *(const char *const *)pa;   /* 解一层：拿到元素里的那个 char * */
const char *b = *(const char *const *)pb;
return strcmp(a, b);
```

漏解一层是常见错误：`strcmp((const char *)pa, (const char *)pb)` 比较的是数组元素的位置（地址），排出来与字典序毫无关系——本文末预测题就是它。二级指针的完整讨论在 [二级指针与指针数组](/c/160-DoublePointerPointerArray)，此处先照抄模式。

### 4.3 等价不等于相等：qsort 不稳定

还有一条易踩的规定：两元素被判等价时，它们在结果里的相对顺序**未指定**。按分数排结构体时，同分学生的先后可能与插入顺序不同。需要稳定，就在比较器里补第二关键字（如同分再比学号）。标准库自己提供了带上下文参数的 `qsort_s`（C11 附件 K）与 POSIX 的 `qsort_r`——第 6 节的上下文模式，标准库也在用。二分查找 `bsearch` 用与 qsort 完全相同的比较器签名，一套比较器两处复用；同族还有 `atexit`、`signal`，都是「库函数 + 用户回调」。

修改实验三：把第 1 节程序里 `cmp_int` 的返回语句换成减法版，用数组 `{ 0, INT_MAX, INT_MIN }` 重跑第 4.1 节的事故——亲手复现一次「测试通过、极端值翻车」。

## 5. 回调实战二：泛型 apply 与事件处理器表

qsort 证明回调能进标准库，现在自己造两个：一个泛型遍历，一个事件订阅表。

### 5.1 泛型 apply：遍历与累积

```c
/* apply.c：行为是参数，状态走 ctx */
#include <stdio.h>

typedef void (*VisitFn)(int value, void *ctx);

void apply(const int *arr, size_t n, VisitFn visit, void *ctx) {
    for (size_t i = 0; i < n; i++) {
        visit(arr[i], ctx);          /* 每个元素交给调用者的行为 */
    }
}

void print_visit(int value, void *ctx) { (void)ctx; printf("%d ", value); }
void sum_visit(int value, void *ctx)   { *(int *)ctx += value; }   /* ctx 是调用者的变量 */

int main(void) {
    int arr[] = { 1, 2, 3, 4, 5 };
    int sum = 0;

    apply(arr, 5, print_visit, NULL);
    printf("\n");
    apply(arr, 5, sum_visit, &sum);
    printf("sum = %d\n", sum);
    return 0;
}
```

预期输出：

```text
1 2 3 4 5
sum = 15
```

`apply` 一次编写，遍历策略永不重写；换行为只需换函数。注意 `sum_visit` 没有返回累加值——回调需要「记住」跨多次调用的状态时，状态不能放回调自己的局部变量里（每次调用都重建），要放调用者传进来的 `ctx` 里。这个 `void *ctx` 就是 C 世界里回调的标配，下一节专门谈它。

### 5.2 事件处理器表：订阅与发布

```c
/* events.c：订阅表 + 发布 */
#include <stdio.h>

#define MAX_HANDLERS 8

typedef enum { EV_CLICK, EV_KEY, EV_QUIT, EV_COUNT } EventType;
typedef void (*EventHandler)(int x, int y);

typedef struct {
    EventType    type;      /* 订阅哪类事件 */
    EventHandler handler;   /* 到时调用谁 */
} Subscription;

static Subscription subs[MAX_HANDLERS];
static int sub_count = 0;

int subscribe(EventType type, EventHandler h) {
    if (h == NULL || sub_count == MAX_HANDLERS) return -1;
    subs[sub_count++] = (Subscription){ type, h };   /* C99 复合字面量 */
    return 0;
}

void emit(EventType type, int x, int y) {
    for (int i = 0; i < sub_count; i++) {
        if (subs[i].type == type && subs[i].handler != NULL) subs[i].handler(x, y);
    }
}

void on_click(int x, int y) { printf("click: (%d, %d)\n", x, y); }
void on_key(int x, int y)   { printf("key at (%d, %d)\n", x, y); }

int main(void) {
    subscribe(EV_CLICK, on_click);
    subscribe(EV_KEY, on_key);
    emit(EV_CLICK, 100, 200);
    emit(EV_KEY, 0, 65);
    return 0;
}
```

预期输出：

```text
click: (100, 200)
key at (0, 65)
```

这是图形界面、网络库共用的「订阅-发布」骨架：事件源不关心谁在听，只按表广播。注意 `Subscription`——把函数指针和数据字段装进同一个结构体，就是「带注册信息的处理器」，Linux 内核的 `file_operations`、Nginx 的模块结构走的是同一条路（第 8 节）。此例逐个匹配事件类型；若一类事件只允许一个处理器、用枚举值直接做数组下标，就演化成跳转表——那是 [跳转表](/c/180-FunctionPointerCallbackJumpTable) 的主场。

两个约定值得从第一天养成：调用回调前判 NULL（`subscribe` 拒绝空指针，`emit` 再防一道）；回调不该修改它正在被遍历的那份数据（比如处理器里反手注销自己）——这类事故需要先标记、遍历完统一处理。

修改实验四：给 events.c 增加 `EV_TIMER` 与一个 `on_timer`，订阅后 emit——验证加一种事件不需要改 `emit` 一行。

## 6. C 函数指针不是闭包：void *ctx 补位

换一种语言写 `sum_visit`，你多半会把 `sum` 直接写进函数体里捕获。C 的函数指针做不到：函数没有「随身行李」，**不存在闭包（closure）**——不能捕获定义处的变量，签名里没有的位置就无法访问。换来的好处是函数指针就是一个普通地址，零隐藏开销、可跨语言传递；代价是状态必须显式交接。`void *ctx` 模式就是 C 的补位方案：

```c
/* filter_ctx.c：回调不带状态，状态放结构体里递进去 */
#include <stdio.h>

typedef struct {
    int threshold;   /* 想捕获的「环境变量」们 */
    int count;
    int sum;
} FilterCtx;

void apply(const int *arr, size_t n, void (*visit)(int, void *), void *ctx) {
    for (size_t i = 0; i < n; i++) visit(arr[i], ctx);
}

void count_above(int value, void *ctx) {
    FilterCtx *c = ctx;                        /* 拆行李：等价于闭包捕获的变量 */
    if (value > c->threshold) { c->count++; c->sum += value; }
}

int main(void) {
    int arr[] = { 10, 25, 5, 30, 15 };
    FilterCtx ctx = { .threshold = 20 };
    apply(arr, 5, count_above, &ctx);
    printf("count=%d sum=%d\n", ctx.count, ctx.sum);
    return 0;
}
```

预期输出：

```text
count=2 sum=55
```

心智模型一句话：**函数指针 + 上下文 = 闭包的 C 等价物**。闭包把捕获的变量藏在对象里、生命周期自动管理、可定义在函数体内；C 把捕获物摆进结构体由你亲手递入、生命周期手动管理、回调必须是文件级函数。替代方案各有代价：全局变量装状态最省事，可两处代码同时用这个回调就互相踩脚——这叫可重入性（reentrancy）问题，多线程与信号场景更危险，所以库 API 宁可在签名里多一个 `ctx` 参数（qsort_r/qsort_s 正是这么做的）。GCC 的嵌套函数扩展能捕获外层变量，但那是编译器私有语法，不可移植，认得即可。ctx 的生命周期是硬责任：把指向栈变量的 ctx 注册给「活得更久」的系统（事件循环、信号处理器），函数返回后回调拿到的就是悬空指针——注册类 API 必须想清楚谁分配、谁释放、何时注销。

## 7. 函数指针与安全

### 7.1 类型不匹配是未定义行为

函数指针类型必须与目标函数**精确匹配**：返回类型与每个参数类型都算在内，任何一处不同就是两个不同类型。强行转换后调用是未定义行为：

```c
int add(int a, int b) { return a + b; }
double (*p)(int, int) = (double (*)(int, int))add;   /* 强转骗过编译器 */
double r = p(3, 5);   /* UB：调用方按 double 取返回值，add 按 int 放返回值 */
```

调用方与被调方对「返回值放在哪、参数怎么传」的理解不一致，轻则垃圾值，重则栈被写坏。编译器能拦住不带强转的版本（修改实验一见过报错），强转是亲手拆掉这道防线。第 2 节说过 `int` 与 `signed int` 这类同义类型没问题；除此之外，签名对不上就是雷。C23 起无原型声明的收紧（`int foo()` 等价 `int foo(void)`）让函数类型更严格了，详见 [C23 新特性](/c/530-C23NewFeatures)。

### 7.2 空指针与未初始化指针

```c
int (*fp)(int) = NULL;
fp(42);          /* UB：跳到地址 0，通常段错误 */
```

未初始化的函数指针更糟，值不确定，跳到哪全凭运气。纪律与数据指针一致：声明即初始化为 NULL，调用前判空——`if (fp != NULL) fp(42);`。判空在表驱动代码里是生命线，[跳转表](/c/180-FunctionPointerCallbackJumpTable) 的调试实录专门演示一次漏判的段错误现场。

### 7.3 调用约定：Windows 32 位的历史坑

调用约定（calling convention）规定参数怎么传、栈由谁清。x86 32 位时代存在 cdecl（调用者清栈，C 默认）与 stdcall（被调用者清栈，Win32 API）等多套约定，指针类型里若不带上约定信息、或约定不匹配，调用会破坏栈。今天的 64 位平台（System V AMD64、Windows x64）各自只有一套主流约定，这个坑主要留在 32 位 Windows 与跨语言绑定的代码里——遇到 `__stdcall` 修饰的回调类型，照抄声明即可。

### 7.4 对象指针与函数指针互转的边界

C 标准把数据指针与函数指针当作不同类别：既不保证可以互转，也不保证大小相同（哈佛架构的嵌入式平台代码与数据各有地址空间，两者宽度可能不同；主流平台上恰好一致）。这条边界有一个著名的应用场景——POSIX 的 `dlsym` 从动态库里按名字取函数地址，返回类型却是 `void *`。POSIX 规范原文明确承认了这一点：把 `void *` 转成函数指针「不由 ISO C 标准定义」，但 POSIX **要求**一致实现上这个转换正确工作；`dlsym` 的返回值则被定义为「从函数指针转换成 `void *` 的函数地址」。换句话说：

```c
/* POSIX 环境（Linux/macOS）：转换由 POSIX 背书 */
int (*fn)(int) = (int (*)(int))dlsym(handle, "answer");   /* handle 来自 dlopen */
```

严格 ISO C 不保证这两步转换有意义；纯 ISO C 环境里的可移植写法不受标准保护。结论：POSIX 平台上放心用（有的编译器会对这行 cast 给警告，POSIX 的存在就是让它闭嘴的理由），跨到无 POSIX 保障的平台前查目标平台的 ABI 文档。动态加载插件的完整流程在 [动态库与静态库](/c/320-DynamicStaticLibrary)。

## 8. 实际项目中的使用场景

- **异步 I/O 与事件循环**：libuv（Node.js 的底层）用回调贯穿所有 I/O——`uv_read_start(stream, alloc_cb, read_cb)` 注册两个回调，I/O 就绪时由事件循环回头调用；本文第 5 节的订阅表就是这类 API 的骨架；
- **内核与服务器接口表**：Linux VFS 的 `file_operations` 结构体里装满 `read`/`write`/`open` 等函数指针，每个文件系统各填一份，VFS 层统一调用；Nginx 的模块结构同理。C++ 虚函数本质上就是编译器自动维护的这种函数指针表——同一招，语言帮你管；
- **标准库本身就是回调陈列馆**：qsort/bsearch 的比较器、`atexit` 注册退出函数、`signal` 注册信号处理器。signal 的原型 `void (*signal(int sig, void (*func)(int)))(int);` 是标准库里最难读的签名之一，但按第 2 节的读法拆：signal 是函数，吃一个 int 和一个函数指针，返回同型函数指针——旧处理器。信号回调的写法与异步信号安全注意事项见 [信号处理](/c/340-SignalHandling)；参数个数与类型运行时可变的 [可变参数函数](/c/100-VarargsFunction) 则是它的互补机制：一个把「参数形状」交给运行时，一个把「函数本体」交给运行时；
- **插件系统**：dlopen 加载动态库、dlsym 取出函数指针、转成约定的接口类型调用，第 7.4 节的边界规则在那里天天用到。

## 9. 小练习

预测题（5 分钟）：先写答案再运行。把 4.2 节的字符串比较器漏掉解引用、写成 `return strcmp((const char *)pa, (const char *)pb);`，第 1 节程序的 words 排序输出会变成什么样？

参考答案（先写再看）：输出大概率「看似随机」且每次进程可能不同。strcmp 拿到的是数组元素的地址而不是字符串本身，比较的是地址数值大小，与字典序无关；地址分布由加载器决定，所以顺序不可预测。修复：先解一层 `*(const char *const *)pa`。

修改题（15 分钟）：把第 1 节的 qsort_demo 扩展为结构体排序：定义 `struct Student { char name[16]; int score; };`，写比较器按分数降序排，同分按姓名字典序排。验收：先按 4.3 节处理稳定性，再用两组同分数据验证。

挑战题（30 分钟，不看答案先动手）：给 apply 加「提前终止」——实现 `int find_first(const int *arr, size_t n, int (*pred)(int, void *), void *ctx, int *out);`，返回第一个满足谓词的元素下标，找不到返回 -1。

提示（两级）：方向——回调要能向 apply 通报「找到了」，可在 ctx 里放 found 标志，循环检查；关键写法——`typedef struct { int target; int found; int index; } FindCtx;`，循环里 `if (c->found) break;`，这正是各种带返回值回调的设计动机。

验收清单：找到时返回正确下标且 out 被写入；找不到返回 -1；空数组不崩溃；谓词收到 ctx（比如比较「与目标差值小于 3」）。

## 10. 与之前和之后的知识的关系

- 往前：[函数详解](/c/090-FunctionDetailed) 的声明与传参是原料，本文把「函数」从被调者提升为可传递的值；[指针深度解析](/c/140-PointerDeep) 的解引用与 const 修饰规则原样适用于函数指针；
- 旁支：字符串排序那步用到的二级指针在 [二级指针与指针数组](/c/160-DoublePointerPointerArray)；回调签名里也能写 `...`（如分发器转发变参），机制在 [可变参数函数](/c/100-VarargsFunction)；信号处理器是「系统替你调用回调」的特殊场景，见 [信号处理](/c/340-SignalHandling)；
- 往后：[跳转表](/c/180-FunctionPointerCallbackJumpTable) 把本文的单个函数指针排成数组，专治长 switch；[复杂声明解析](/c/190-ComplexDeclarationParsing) 把第 2 节的读法升级成拆解任意声明（如 `int (*(*f)(int))[5]`）的系统方法。

## 11. 官方文档

- qsort 与比较器契约（cppreference C）：https://en.cppreference.com/w/c/algorithm/qsort
- qsort 手册页（返回值语义、字符串比较示例、不稳定性说明）：https://man7.org/linux/man-pages/man3/qsort.3.html
- 函数到指针转换与两种调用写法（cppreference C）：https://en.cppreference.com/w/c/language/pointer
- 函数指针章节（Beej's Guide to C Programming）：https://beej.us/guide/bgc/html/split/pointers-iii-pointers-to-pointers-and-more.html
- dlsym 与 void 转换边界的 POSIX 原文（APPLICATION USAGE 节）：https://pubs.opengroup.org/onlinepubs/9799919799/functions/dlsym.html

## 12. 自我检查

- 能遮住代码写出 `int (*fp)(int, int)` 的声明并解释括号的作用，能区分它与 `int *f(int)`；
- 能为 int、double、字符串各写一个 qsort 比较器，并说出减法版错在哪、`(a > b) - (a < b)` 为什么安全；
- 能解释 void *ctx 模式解决什么问题，以及「函数指针 + 上下文」与闭包的对应关系；
- 能说出类型不匹配、调用空指针的后果，以及对象指针与函数指针互转在 ISO C 与 POSIX 下各自的边界。

## 本章总结

函数指针把「一段代码的入口地址」变成可传递的值：声明时括号锁住标识符与星号，赋值时函数名自动退化，调用时带不带星号皆可。typedef 三步法让签名能读，函数指针做参数就成了回调——qsort 用第四个参数问「怎么比」，你用比较器作答，契约是返回负、零、正，只用符号；减法捷径在有符号溢出处翻车，`(a > b) - (a < b)` 是安全解。回调需要记忆时，void *ctx 补上闭包缺席的位置；类型必须精确匹配、调用前判空、ctx 必须活得够久；数据指针与函数指针在标准里是两个世界，POSIX 的 dlsym 是唯一的官方桥梁。

## 下一步

进入 [跳转表](/c/180-FunctionPointerCallbackJumpTable)：手里有了函数指针，把它排成数组、用枚举做下标，让二十个 case 的 switch 分发器变成一张只改一处的表。
