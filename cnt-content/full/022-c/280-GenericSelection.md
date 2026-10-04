---
order: 300
title: 泛型选择：_Generic 与类型分派
module: 'c'
category: 计算机科学
difficulty: advanced
description: 用「取个绝对值要记四个名字」引出 C11 _Generic：编译期按类型查表、控制表达式不求值的副作用实验、重复类型的报错实录、数组和 const 进开关前的三步整形；宏 + _Generic + 函数族拼出类型安全的伪重载 API，tgmath.h 实现原理与 C23 typeof 协同收尾。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'c/300-InlineFunctionMacro'
  - 'c/290-PreprocessorMacro'
  - 'c/520-C23C2y'
  - 'c/180-FunctionPointerCallbackJumpTable'
prerequisites:
  - 'c/110-EnumTypedef'
  - 'c/170-FunctionPointerCallback'
---

## 前置知识

- 已完成 [枚举与 typedef](/c/110-EnumTypedef)：会自定义类型名——`_Generic` 分支里写的正是类型名；
- 已完成 [函数指针与回调](/c/170-FunctionPointerCallback)：知道函数名是地址、能当值传递——本文的分支值常常就是一个函数名。

没读过这两篇也能往下读，用到的概念当场解释。

> 分工说明：C 模块里「让一份代码服务多种类型」拆在三篇。[预处理器与宏](/c/290-PreprocessorMacro) 讲宏本体：文本替换的机制、五条军规，以及宏模拟泛型的老手艺（参数计数派发、X-Macro）；本篇讲 C11 的标准答案 `_Generic`——编译期按类型分派；[内联函数与宏](/c/300-InlineFunctionMacro) 讲分支函数为什么该写成 `static inline`。三篇互为地基，示例不重复。

## 学习目标

读完本文你将能够：

1. 用 `_Generic` 写出按表达式类型在编译期分派的泛型宏，并把它与函数族封装成类型安全的「伪重载」API；
2. 用一个副作用实验证明控制表达式不被求值，并说出这条规则对宏设计的意义；
3. 解释「各关联类型必须互不相同」的约束，读懂编译器对重复类型的报错；
4. 说清控制表达式进开关前的三步「整形」——顶层限定符剥离、数组退化、函数退化，并用 `&arr` 技巧保住数组身份；
5. 讲出 tgmath.h 的实现原理，以及 C23 的 typeof/typeof_unqual 给 `_Generic` 带来的增强。

预计 50 到 70 分钟，含 3 组修改实验、1 道预测题与 1 道挑战题。

## 1. 问题引入：取个绝对值，为什么要记四个名字

C 标准库把「绝对值」拆成了四个名字：

```c
/* four_abs.c：同一个数学操作，四个名字
 * gcc -Wall -Wextra -g four_abs.c -o four_abs -lm
 */
#include <stdio.h>
#include <stdlib.h>
#include <math.h>

int main(void) {
    int       a = -7;
    long      b = -70000L;
    long long c = -7000000000LL;
    double    d = -3.5;

    printf("%d %ld %lld %f\n",
           abs(a), labs(b), llabs(c), fabs(d));
    return 0;
}
```

预期输出：

```text
7 70000 7000000000 3.500000
```

数学库更夸张：`sin`/`sinf`/`sinl` 一族几百个名字，后缀 `f` 配 float、后缀 `l` 配 long double，记错一个轻则精度损失、重则类型错配。第一反应是用宏统一名字：

```c
#define ABS(x) ((x) < 0 ? -(x) : (x))
```

`ABS(-7)` 碰巧对，`ABS(-3.5)` 也碰巧对——但这个宏对类型一无所知：它不会「对整数走整数路径、对浮点走浮点路径」，更不会在传错类型时报警。[预处理器与宏](/c/290-PreprocessorMacro) 讲过，宏参数是抄写的文本，`ABS(i++)` 甚至直接未定义行为。

真正的问题是：**有没有办法让一个名字根据表达式的类型，在编译期自动挑一个实现？** C11 给出了标准答案——泛型选择表达式（generic selection）`_Generic`。

## 2. _Generic 语法：编译期的类型开关

### 2.1 基本形状

```c
_Generic(控制表达式, 类型1: 结果1, 类型2: 结果2, ..., default: 兜底)
```

心智模型：一张「类型 → 表达式」的**编译期查表**。编译器看一眼控制表达式的**类型**（不是值），从关联列表里挑出类型匹配的那一项，整个 `_Generic` 表达式的值就是那一项。控制表达式按**静态类型**匹配——编译完之后，这张表就只剩被选中的那一项。

```c
/* type_name.c：类型探测宏
 * gcc -Wall -Wextra -g type_name.c -o type_name
 */
#include <stdio.h>

#define TYPE_NAME(x) \
    _Generic((x), \
        int:    "int", \
        double: "double", \
        char*:  "char*", \
        default: "other")

int main(void) {
    int i = 42;
    double d = 3.14;
    char *s = "hi";

    printf("i     -> %s\n", TYPE_NAME(i));
    printf("d     -> %s\n", TYPE_NAME(d));
    printf("s     -> %s\n", TYPE_NAME(s));
    printf("100L  -> %s\n", TYPE_NAME(100L));    /* long 没列出来 */
    printf("3.14f -> %s\n", TYPE_NAME(3.14f));  /* f 后缀是 float，也没列 */
    return 0;
}
```

预期输出：

```text
i     -> int
d     -> double
s     -> char*
100L  -> other
3.14f -> other
```

三条规则从输出里浮出来：

1. 匹配的是**类型**，`int` 分支接到 `i`，`double` 分支接到 `d`，互不串门；
2. `default` 是兜底分支，整个开关**至多一个** default；
3. 没写 default、又没有类型命中时，是**编译错误**——这不是缺陷，反而是武器：想让 API 拒绝没考虑过的类型，就别给 default（第 4 节用到）。

### 2.2 控制表达式不求值：拿 i++ 做实验

`_Generic` 最反直觉也最重要的一条规则：**控制表达式只参与类型推导，从不被执行**（C11 6.5.1.1：控制表达式不被求值）。选择在编译期完成，运行时没有任何判断代码。空口无凭：

```c
/* not_evaluated.c：i++ 会被执行吗？
 * gcc -Wall -Wextra -g not_evaluated.c -o not_evaluated
 */
#include <stdio.h>

int main(void) {
    int i = 3;
    printf("type = %s\n", _Generic((i++), int: "int", default: "?"));
    printf("i = %d\n", i);
    return 0;
}
```

预期输出：

```text
type = int
i = 3
```

`i++` 躺在控制表达式的位置上，**没有执行**：i 还是 3。这条规则保证两件事：其一，`_Generic` 是零运行时开销的——类型在编译期定死，产物代码和手写的 `abs(i)` 一模一样；其二，把「探测类型」和「使用值」分开设计宏成为可能，第 4 节的伪重载全靠它。

修改实验一：把 `(i++)` 从控制表达式挪到分支里——`_Generic(i, int: i++, default: 0)`，重跑。这次只有被选中的分支参与求值，i 变成 4。**控制表达式从不求值，被选中的分支正常求值**，两句话合起来才是完整规则。

### 2.3 各关联类型必须互不相同

第二个约束：**任何两个关联的类型不得是兼容类型**——写重复了直接编译报错。这是「查表」的合法性前提：一张表里同一个键出现两次，查表就没有唯一答案。最容易踩的雷是把同义词当两种类型：

```c
/* dup_type.c：long 与 long int 是同一个类型
 * gcc -Wall -Wextra -c dup_type.c
 */
int pick(int x);

int pick(int x) {
    return _Generic((x),
        int:      1,
        long:     2,
        long int: 3,        /* long int 就是 long：与上一行同类型 */
        default:  0);
}
```

GCC 13 的报错（不同版本措辞略有出入，关键词是 duplicate）：

```text
dup_type.c:9:9: error: duplicate type 'long' in '_Generic'
    9 |         long int: 3,
      |         ^~~~
dup_type.c:8:9: note: previously used here
```

两行报错合起来读：第 9 行的类型与第 8 行重复，`_Generic` 拒绝编译。同理 `signed int` 与 `int` 也是同一类型，不能并排出现。顺带一个冷知识：C 里 `char`、`signed char`、`unsigned char` 是**三种不同类型**，所以它们可以同时出现在分支列表里——写全类型探测宏时三兄弟一个都不能省。

修改实验二：把 `long int: 3` 改成 `unsigned long: 3`，重新编译。报错消失——`unsigned long` 与 `long` 是不同类型。用这个办法可以快速确认「两个类型名是不是一回事」。

## 3. 剥离规则：进开关前先「整形」

控制表达式的类型不是原样进开关的，标准规定先做三步调整（C11 6.5.1.1）：

| 调整 | 规则 | 后果 |
| --- | --- | --- |
| 顶层限定符剥离 | `const int` 的 `const` 被丢掉 | `const int` 变量命中 `int` 分支；写 `const int:` 分支永远命中不了 |
| 数组到指针 | `int[10]` 退化成 `int*` | 数组名命中指针分支，`int[10]:` 分支永远命中不了 |
| 函数到指针 | 函数名退化成函数指针 | 函数名命中「指针」分支 |

一次看全：

```c
/* strip.c：三步整形的现场
 * gcc -Wall -Wextra -g strip.c -o strip
 */
#include <stdio.h>

#define SHOW(e) printf("%-18s -> %s\n", #e, _Generic((e), \
    int:         "int", \
    int*:        "int*", \
    const int*:  "const int*", \
    int(*)[10]:  "int(*)[10]", \
    default:     "other"))

int main(void) {
    int arr[10];
    const int ci = 1;
    const int *pci = &ci;
    int *p = arr;

    SHOW(ci);        /* const int 变量：顶层 const 被剥掉 */
    SHOW(pci);       /* 指向 const 的指针：指向型 const 保留 */
    SHOW(arr);       /* 数组名：退化成 int* */
    SHOW(&arr);      /* 指向数组的指针：数组身份保住了 */
    SHOW(p);
    return 0;
}
```

预期输出：

```text
ci                 -> int
pci                -> const int*
arr                -> int*
&arr               -> int(*)[10]
p                  -> int*
```

两个结论值得背下来：

1. **剥离的只是「顶层」限定符**。`const int` 的 const 贴在 int 本身上，被剥；`const int *` 的 const 贴在指向物上，保留。想区分「只读」就得通过指针间接一层；
2. **数组在 `_Generic` 里永远是指针**。想探测「这到底是不是数组」，用 `&arr`——它的类型是「指向 int[10] 的指针」，数组大小作为类型的一部分被保留，`int(*)[10]` 分支能接住它。[数组详解](/c/120-ArrayDetailed) 讲的退化规则在这里原样上演。

修改实验三：把 `SHOW(&arr)` 那行的分支 `int(*)[10]` 从宏里删掉，重编译。`&arr` 落进 default。再用 `int arr2[3]` 试试——`int(*)[3]` 与 `int(*)[10]` 是不同类型，数组大小就这样变成了编译期可探测的信息。

## 4. 伪重载：宏 + _Generic + 函数族

单用 `_Generic` 返回字符串只能玩票；工程里的标准用法是三分工：

- **函数族**：每种类型一个真函数（类型检查、单次求值、可调试，见 [内联函数与宏](/c/300-InlineFunctionMacro)）；
- **`_Generic`**：按实参类型挑出对应的**函数名**；
- **宏**：把三者包成一个统一的对外名字。

一个完整可用的「伪重载 ABS」：

```c
/* generic_abs.c：一个 ABS 名字，整数浮点各走各的
 * gcc -Wall -Wextra -g generic_abs.c -o generic_abs -lm
 */
#include <stdio.h>
#include <math.h>

static int          abs_i (int x)          { return x < 0 ? -x : x; }
static long         abs_l (long x)         { return x < 0 ? -x : x; }
static long long    abs_ll(long long x)    { return x < 0 ? -x : x; }

#define ABS(x) _Generic((x), \
    int:         abs_i, \
    long:        abs_l, \
    long long:   abs_ll, \
    float:       fabsf, \
    double:      fabs, \
    long double: fabsl, \
    default:     abs_ll)((x))

int main(void) {
    printf("%d\n",  ABS(-7));         /* int 路径 */
    printf("%ld\n", ABS(-70000L));    /* long 路径 */
    printf("%f\n",  ABS(-3.5));       /* double 路径 */
    printf("%f\n",  ABS(-3.5f));      /* float 路径 */
    return 0;
}
```

预期输出：

```text
7
70000
3.500000
3.500000
```

三个细节撑起这个模式：

1. **分支值写函数名，调用 `(x)` 放在开关外面**。`_Generic` 的关联值是「赋值表达式」，函数名是表达式（隐式转成函数指针），`abs_i(int)` 这种写法会被当成函数调用、把 `int` 当实参，直接编译错误。整条宏展开后的流水线是：预处理器文本展开 → `_Generic` 看 `x` 的静态类型查表 → 选中函数名 → 编译器生成调用（小函数常顺手内联）→ 运行时与手写函数调用零差异。

2. **参数实际只求值一次**。展开结果里 `x` 出现两次：一次在控制表达式（不求值），一次在调用实参（求值）。所以 `ABS(i++)` 合法，i 只加一次——这与 290 篇「纯表达式宏参数被抄多次」的事故家族形成鲜明对比。宏名加括号、`do { } while (0)` 那些军规在这里都不需要：ABS 的展开结果是一条完整的表达式。

3. **类型安全是编译期强制**。给 ABS 传一个结构体，没有任何分支命中且 default 落到 `abs_ll` 时结构体转不成 long long——编译失败。错误发生在编译期而不是运行时，这正是它优于 `void*` 万能接口的地方。

同一模式换个皮，就是类型安全的打印宏。注意这次**故意不给 default**——「没列出的类型直接编译失败」，把「忘了处理这种类型」拦在编译期，适合封闭集合的 API 设计：

```c
/* print_val.c：PRINT_VAL 自动选对格式
 * gcc -Wall -Wextra -g print_val.c -o print_val
 */
#include <stdio.h>

static void print_int(int v)         { printf("%d (int)\n", v); }
static void print_double(double v)   { printf("%f (double)\n", v); }
static void print_str(const char *v) { printf("%s (string)\n", v); }

#define PRINT_VAL(x) _Generic((x), \
    int:         print_int, \
    double:      print_double, \
    char*:       print_str, \
    const char*: print_str)((x))

int main(void) {
    PRINT_VAL(42);
    PRINT_VAL(3.14);
    PRINT_VAL("hello");
    /* PRINT_VAL(7L);   取消注释即编译失败：long 不在集合里 */
    return 0;
}
```

预期输出：

```text
42 (int)
3.140000 (double)
hello (string)
```

与 C++ 的关系一句话说清：`_Generic` 只做「类型 → 已有表达式」的一次静态查表，不生成新代码、没有图灵完备的元编程，相当于 C++ 重载决议的一个极小手工版；需要「同一份代码按类型实例化」的场景，C 里要用宏代码生成（290 篇的 X-Macro）来补。能力边界不同，不构成替代关系——本库不再展开跨语言对比。

## 5. 与 C23 的演进：typeof 让宏长出类型系统

`_Generic` 的短板是「看不见类型的名字」：分支函数签名各不相同，想在宏里声明一个「和参数同类型」的临时变量，C11 没有语法。C23 把 GCC/Clang 用了十几年的扩展 `typeof`/`typeof_unqual` 转正为**标准关键字**：`typeof(expr)` 在类型位置引用 expr 的类型，`typeof_unqual` 再去掉顶层限定符。老代码里常见的 `__typeof__` 就是它的扩展期写法（双下划线避免与用户标识符撞车）。

配合示例如下，需要 C23 模式编译（编译器支持矩阵见 [C23 上手](/c/520-C23C2y)，typeof 的完整专题在 [C23 深水区](/c/530-C23NewFeatures)）：

```c
/* c23_generic.c：typeof 与 _Generic 协同
 * gcc -std=c23 -Wall -Wextra -g c23_generic.c -o c23_generic
 */
#include <stdio.h>

static int   area_i(int x)   { return x * x; }
static double area_d(double x) { return x * x; }

/* typeof 是 C23 关键字：pi 的类型就是 3.14 的类型（double） */
#define AREA(x) \
    _Generic((x), int: area_i, default: area_d)(x)

int main(void) {
    typeof(3.14) pi = 3.14;   /* C23 关键字：pi 是 double */
    printf("%d\n",  AREA(5));
    printf("%f\n",  AREA(pi));
    printf("pi -> %s\n", _Generic(pi, int: "int", default: "double"));
    return 0;
}
```

预期输出：

```text
25
9.859600
pi -> double
```

C23 还有两处与本文直接相关的收编：其一，`typeof_unqual` 与 `_Generic` 的剥离规则口径一致（去顶层限定符），两者配合写「同类型可写副本」不再有口径分歧；其二，枚举可以显式指定底层类型（`enum E : int`），第 6 节会看到这解决了 `_Generic` 匹配枚举时的一个历史悬案。

## 6. 常见错误与调试实录

**实录一：分支类型重复的报错。** 第 2.3 节的 dup_type.c 已经完整看过 GCC 的 `duplicate type 'long' in '_Generic'`。反向排查口诀：看到 duplicate 关键词，把报错里点到的那两个分支拿出来比——多半是同义词（`long` 与 `long int`、`signed` 与 `int`）或者手滑多写了一行。Clang 的措辞不同（指认「与前面某个关联类型兼容」），但都指向同一约束。

**实录二：把 `_Generic` 当运行时 switch 用。** 最常见的误解是「_Generic 会看表达式的值」：

```c
/* wrong_switch.c：想按值分发，结果永远是同一个分支 */
#include <stdio.h>

const char *classify(int v) {
    return _Generic((v == 1), int: "one or not", default: "?");
}

int main(void) {
    printf("%s\n", classify(1));
    printf("%s\n", classify(2));    /* 也打印 one or not */
    return 0;
}
```

`v == 1` 的**类型**是 int——无论值是 1 还是 2，命中的都是 `int` 分支。`_Generic` 是编译期的类型开关，运行时按值分派请用 switch 或跳转表（[跳转表](/c/180-FunctionPointerCallbackJumpTable) 的结论：`_Generic` 按类型在编译时选函数，跳转表管运行时才知道走哪条的分发——一个管类型、一个管值）。两条心法防呆：值会变的判断永远进不了 `_Generic`；把常量表达式喂进去也只会得到它的类型，不是它的值。

**实录三：数组分支命中不了。** 第 3 节讲过数组退化，这里看它的报错形态。想当然写出这样的代码：

```c
/* array_trap.c：int[10] 分支永远不会被选中
 * gcc -Wall -Wextra -c array_trap.c
 */
int probe(int arr[10]);

int probe(int arr[10]) {
    return _Generic((arr), int[10]: 1);   /* 没有 default，也没有能命中的分支 */
}
```

GCC 的报错（措辞随版本略有差异，关键词是 not compatible with any association）：

```text
array_trap.c:6:12: error: '_Generic' selector of type 'int *' is not
compatible with any association
    6 |     return _Generic((arr), int[10]: 1);
      |            ^~~~~~~~
```

报错把真相说破了：选择器的类型是 `int *`——形参里的 `int arr[10]` 早就退化成指针（[数组详解](/c/120-ArrayDetailed) 的老结论）。`int[10]:` 这样的分支语法合法，但**任何表达式的调整后类型都不可能是数组类型**，它永远命中不了；列表里只有它时，编译器直接拒绝。要区分「真数组」就传 `&arr`，用 `int(*)[10]` 分支接住（第 3 节 strip.c 的做法）。

**实录四：宏体里嵌大段代码。** 把几十行的实现直接塞进各分支：

```c
#define BAD_REPORT(x) _Generic((x), \
    int:    /* 50 行 */ , \
    double: /* 50 行 */, \
    default: /* 50 行 */)
```

所有分支都必须是类型合法的表达式——**没被选中的分支也要通过语义检查**，编译时间与报错复杂度全涨。修复就是第 4 节的模式：分支里只留函数名，实现搬进函数体。顺手排掉另一个高频错误：想在分支里写函数声明（`int: abs_i(int)`）——关联值不是声明位置，去掉形参列表即可。

## 7. 实际项目中的使用场景

- **tgmath.h 的实现原理**：标准库的类型泛型数学头。`sin(0.5f)` 自动选 `sinf`，`sin(0.5)` 走 double 版：

```c
/* tg_demo.c：类型泛型数学
 * gcc -Wall -Wextra -g tg_demo.c -o tg_demo -lm
 */
#include <stdio.h>
#include <tgmath.h>

int main(void) {
    float  f = sin(0.5f);    /* 自动选 sinf */
    double d = sin(0.5);     /* double 版 sin */
    printf("%f %f\n", f, d);
    return 0;
}
```

C99 年代它需要编译器魔法才能实现（glibc 的老实现靠 GCC 内建 `__builtin_types_compatible_p`，移植性差）；C11 的 `_Generic` 第一次让它有了纯标准 C 的实现路径，musl 等库直接用它搭建。你手写的 `ABS` 就是一个迷你 tgmath。

- **类型安全的容器访问宏**：动态数组容器配 `VEC_GET(v, i, &out)` 式访问器，`_Generic` 按 out 的类型挑对应的取值函数，调用者不再手写 `void*` 强转——把第 4 节 ABS 的「函数族 + 查表」骨架搬过来即可，容器本体常用 290 篇 X-Macro 按类型批量生成。
- **编译期分发与运行时分发分工**：引用 180 篇的结论——类型已知选 `_Generic`（零运行时开销），值才知道选跳转表。`qsort` 的 `void*` 比较器则属于第三条路：类型彻底未知，只能运行时强转。
- **泛型 API 的封闭性设计**：不给 default 的 `_Generic`（第 4 节 PRINT_VAL）把「没处理的类型」变成编译错误，是 C 里做「约束即文档」的少数手段之一。

## 8. 小练习

预测题（5 分钟）：先写下答案再运行：

```c
printf("%s\n", _Generic(('A'), int: "int", char: "char", default: "?"));
printf("%s\n", _Generic((3.14f), float: "float", double: "double", default: "?"));
```

参考答案（先写再看）：第一行 `int`——C 的字符字面量类型是 int（与 C++ 不同）；第二行 `float`——`f` 后缀把字面量定成 float，没有后缀的小数才是 double。

修改题（15 分钟）：给 generic_abs.c 的 ABS 增加 `unsigned long` 支持。验收：`ABS(-7UL)` 没有意义，但 `ABS(7UL)` 返回 7；想想 unsigned 落进 `abs_ll` 会发生什么（隐式转换），以及是否应该单独写 `abs_ul`。

挑战题（40 分钟，不看答案先动手）：写一个泛型判断宏 `IS_INTEGER(x)`——x 是任意整型时展开为 1，浮点或指针展开为 0；再写 `IS_FLOAT(x)`。提示两级如下。

提示（思路方向）：`_Generic` 的每个分支返回一个整型常量，枚举「所有整型类型」即可；别忘了三个 char、short 的有符号无符号两版、long long 两版。

展开（关键 API）：`_Generic((x), char:1, signed char:1, unsigned char:1, short:1, unsigned short:1, int:1, unsigned int:1, long:1, unsigned long:1, long long:1, unsigned long long:1, _Bool:1, default:0)`。验收：`IS_INTEGER(3)`、`IS_INTEGER('a')`、`IS_INTEGER(3u)` 都是 1；`IS_INTEGER(3.0)`、`IS_INTEGER("s")` 是 0；对结构体变量使用应编译失败或得 0（想想 default 兜底与不给 default 两种设计各是什么体验）。

## 9. 与之前和之后的知识的关系

- 往前：[枚举与 typedef](/c/110-EnumTypedef) 的自定义类型名是分支列表的常客；[函数指针与回调](/c/170-FunctionPointerCallback) 的「函数名即地址」是伪重载的支点；[数组详解](/c/120-ArrayDetailed) 的退化规则在剥离规则里重演；
- 旁支：[跳转表](/c/180-FunctionPointerCallbackJumpTable) 是运行时按值分发的对照面；[预处理器与宏](/c/290-PreprocessorMacro) 提供宏外壳与 `#`/`##` 手艺，本篇提供类型内核；[内联函数与宏](/c/300-InlineFunctionMacro) 解释分支函数为什么写 `static inline`；
- 往后：[C23 上手](/c/520-C23C2y) 与 [C23 深水区](/c/530-C23NewFeatures) 收编 typeof/typeof_unqual 与枚举底层类型，`_Generic` 在 C23 下更顺手。

## 10. 官方文档

- 泛型选择（cppreference C，含约束与示例）：https://en.cppreference.com/w/c/language/generic
- 类型泛型数学 tgmath.h（cppreference C）：https://en.cppreference.com/w/c/numeric/tgmath
- GCC typeof/typeof_unqual 文档（扩展来历与 C23 口径）：https://gcc.gnu.org/onlinedocs/gcc/Typeof.html
- Clang 的 C23 支持状态（typeof 对应提案 N2927/N2930）：https://clang.llvm.org/c_status.html
- Modern C（Jens Gustedt，C23 版免费在线，泛型选择章节）：https://gustedt.gitlabpages.inria.fr/modern-c/

## 11. 自我检查

- 能不看资料写出「函数族 + _Generic + 宏」三件套的伪重载骨架，并说出每个部件的职责；
- 能用 `i++` 实验向同事证明控制表达式不求值，并解释为什么伪重载宏的参数只求值一次；
- 看到 `duplicate type ... in '_Generic'` 与 `not compatible with any association` 两类报错，能各说出一条成因与修法；
- 能说出 `const int`、`int[10]`、函数名进开关前的三步整形，以及 `&arr` 为什么能保住数组身份。

## 本章总结

`_Generic` 是 C11 埋进语言里的编译期类型开关：只看类型不看值，控制表达式从不求值，被选中的分支原样进入产物代码，运行时零开销。它的两条铁约束——各关联类型互不相同、default 至多一个——让「查表」永远有唯一答案；三条剥离规则（顶层限定符、数组、函数）则规定了「进开关前先整形」，数组身份要靠 `&arr` 才保得住。宏 + `_Generic` + 函数族是工程标准姿势：宏给统一名字，查表选函数，函数族保证类型安全与单次求值。tgmath.h 从编译器魔法走向标准实现，C23 又把 typeof 转正，泛型宏从此能声明「参数同类型」的临时变量。类型分派归 `_Generic`，值分派归 switch 和跳转表，宏本体与它的军规——下一篇就是它们的属地。

## 下一步

进入 [预处理器与宏](/c/290-PreprocessorMacro)：本文的宏外壳只是文本替换的一角，`#include`/`#define`/`#`/`##`、条件编译与五条宏军规，都在那篇从头拆起。
