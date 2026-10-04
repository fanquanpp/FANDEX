---
order: 130
title: 枚举与 typedef：给类型起好名字
module: 'c'
category: 计算机科学
difficulty: beginner
description: 从 0/1/2 魔数事故引入 enum：默认递增与显式赋值、-Wswitch 穷举检查、枚举常量与 int 的关系；typedef 三步读法、typedef vs #define 对比、tag 命名空间；收束到错误码设计与 C23 固定底层类型，附两组调试实录。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'c/130-StructAndUnion'
  - 'c/190-ComplexDeclarationParsing'
  - 'c/520-C23C2y'
  - 'c/170-FunctionPointerCallback'
prerequisites:
  - 'c/080-ControlFlow'
  - 'c/050-VariableConstant'
---

## 前置知识

- 已完成 [控制流程](/c/080-ControlFlow)：会写 switch 与 if，知道 case 标签要常量；
- 已完成 [变量与常量](/c/050-VariableConstant)：用过 `#define` 定义常量——本文反复拿它和 enum、typedef 对比。

零基础起步见 [C 语言零基础起步](/c/010-CZeroBasisStart)。

> 分工说明：080 篇教了 switch 的语法，本篇给它配上一套「编译器帮忙查错」的枚举；050 篇的 `#define` 常量能顶一时，本篇讲清为什么工程代码最终都用 enum 与 typedef。函数指针的运行机制在 [函数指针与回调](/c/170-FunctionPointerCallback)，本篇只负责用 typedef 把它的声明变简单。

## 学习目标

读完本文你将能够：

1. 把一份满是 0/1/2 的魔数代码重构成 enum 版本，说出编译器因此新增的两种检查；
2. 预测显式赋值与部分赋值之后每个枚举常量的值，说清枚举常量与 int 的关系；
3. 用三步读法读懂 typedef 声明，包括数组指针与函数指针；
4. 列出 typedef 与 #define 的本质差异，解释为什么类型别名一律用 typedef；
5. 用 -Wswitch 抓出 switch 漏 case 的 bug，并设计一套带名字表与范围检查的错误码。

预计 45 到 60 分钟，含 2 组动手实验、3 道练习。

## 1. 问题引入：0/1/2 的事故现场

```c
/* magic.c：三个魔数撑起一个功能 */
#include <stdio.h>

int main(void) {
    int status = 1;              /* 1 是什么意思？三个月后没人记得 */
    if (status == 2) { printf("stopped\n"); } else { printf("still running\n"); }
    status = 3;                  /* 3 又是什么？编译器不问 */
    printf("status = %d\n", status);
    return 0;
}
```

事故复盘：需求文档写「0 待机、1 运行、2 停止」。三个月后新同事要加「暂停」，随手用 3；另一位同事记得 3 曾经被临时用作「错误」，于是两个 3 各自为政——而对编译器来说这些全都只是普通的 int，从第一行到最后一行一言不发。

换成枚举，第一类错误当场现形。在 `enum Status { STATUS_IDLE, STATUS_RUNNING, STATUS_STOPPED };` 之后写 `enum Status s = STATUS_RUNING;`（拼错一个字母），编译器立刻回敬：

```text
error: use of undeclared identifier 'STATUS_RUNING'
```

编译器拦下的是「名字拼错」这一类错误。要诚实地说清边界：C 的枚举是弱类型，`s = 99` 这类「值越界」它不管（第 2 节末尾给出工程补救）。但「拼错名字」与「switch 漏分支」（第 6 节实录）这两类高频 bug，从此有了免费的编译期检查。

## 2. enum：一串有名字的整型常量

```c
/* enum_basic.c */
#include <stdio.h>

enum Weekday { MON, TUE, WED, THU, FRI, SAT, SUN };

int main(void) {
    enum Weekday today = WED;
    printf("WED = %d\n", today);           /* 2 */
    printf("tomorrow = %d\n", today + 1);  /* 3：参与算术时就是普通整数 */
    return 0;
}
```

```bash
gcc -Wall -Wextra -g enum_basic.c -o enum_basic
./enum_basic
```

```text
WED = 2
tomorrow = 3
```

赋值规则（cppreference 校准）：首个枚举常量缺省为 0，其后逐个加一；某项显式赋值后，其后未赋值的项在它基础上**继续递增**。校准例子：`enum Foo { A, B, C = 10, D, E = 1, F, G = F + C };` 得 A=0、B=1、C=10、D=11、E=1、F=2、G=12。

枚举常量是编译期整型常量，凡整数常量能出现的地方都能用——case 标签、非变长数组的数组大小都行。直到 C23 之前，每个枚举常量的类型就是 int。

三个惯用技巧：

- **显式赋值锁定值**。HTTP 状态码、协议命令字这类「值即协议」的场景，数值不能跟着增删漂移：`enum HttpStatus { HTTP_OK = 200, HTTP_NOT_FOUND = 404, HTTP_SERVER_ERROR = 500 };`
- **匿名枚举当常量集**。不需要类型名、只要一小撮相关常量时，连名字都可以省：

```c
enum { MAX_USERS = 64, TIMEOUT_MS = 3000 };
int online[MAX_USERS];
```

- **枚举常量没有私有命名空间**。同一作用域内两个枚举不能有同名常量：`enum Color { RED, GREEN };` 与 `enum Signal { RED, YELLOW };` 若都不带前缀，第二个 RED 就是编译错误。这就是「枚举常量一律带类型前缀」（COLOR_RED、SIGNAL_RED）这条行业惯例的来历。

最后是必须交底的弱类型事实：cppreference 原话「枚举类型是整型，凡其他整型能用的地方（隐式转换、算术运算）它都能用」。所以 `s = 100` 完全合法，哪怕 100 不在清单里。工程补救是对外函数入口做范围检查——第 5 节的 error_string 与第 6 节实录二都会实际用到。

修改实验：打印 enum Foo 的全部七个值验证递增规则；再把 `C = 10` 改成 `C = 2 + 8`，常量表达式照样合法。

## 3. typedef：不造新类型，只起别名

typedef 的读法只需要一套「三步法」：**把 typedef 三个字母遮住，剩下的就是一个普通变量声明；声明里变量的名字就是别名，声明里变量的类型就是被命名的类型**。

```c
typedef unsigned int uint;        /* 遮住 typedef：unsigned int uint; —— uint 同义于 unsigned int */
typedef int Vector4[4];           /* 遮住 typedef：int Vector4[4]; —— Vector4 是「4 个 int 的数组」类型 */

typedef int (*RowPtr)[4];
/* 遮住 typedef：int (*RowPtr)[4]; —— RowPtr 是「指向 4 个 int 数组的指针」类型 */

typedef int (*Comparator)(const void *, const void *);
/* 遮住 typedef：Comparator 是「参数两个指针、返回 int 的函数」的指针类型 */
```

关键事实，cppreference 的原话直译：「typedef 声明并不引入一个新类型，它只是为既有类型建立一个同义名。」由此立刻推出一个反直觉结论：

```c
typedef int Celsius;
typedef int Fahrenheit;

Celsius c = 25;
Fahrenheit f = c;    /* 编译通过：它们本来就是同一个类型 */
```

想要「摄氏度不能赋给华氏度」的强类型，C 的 typedef 给不了——同义名之间畅通无阻。typedef 真正解决的是三件事：给类型起一个有业务含义的名字、把跨平台的类型收拢到一处（`uint32_t` 就是 typedef 的作品）、以及把复杂声明变简单（第 4 节）。

与 `#define` 的对比是一张值得背下来的表：

| 维度 | typedef | #define |
| --- | --- | --- |
| 本质 | 语言级别的类型同义名 | 预处理器文本替换 |
| 类型检查 | 编译器把它当类型看 | 没有类型概念 |
| 作用域 | 遵守块作用域，函数内声明函数外无效 | 从定义行起生效到文件尾（或 #undef） |
| 复杂声明 | `typedef int (*FP)(void);` 语义精确 | `#define FP int (*)(void)` 展开后极易出错 |
| 调试器 | 能显示别名 | 通常不保留 |

结论一句话：**起类型别名一律 typedef，#define 留给真正的宏**。宏的完整生态见 [预处理与宏](/c/290-PreprocessorMacro)。

typedef struct 与 tag 命名空间：struct 与 enum 的标签住在独立的「标签命名空间」，所以标签可以和变量、函数重名，但每次使用都要带着 struct 前缀。typedef 的一个高频用途就是把标签搬进普通命名空间：

```c
struct Point { int x, y; };
struct Point p1;            /* 必须 struct 开头 */

typedef struct Point Point; /* 把标签名同步进普通命名空间 */
Point p2;                   /* 不用 struct 了 */

/* 链表结点的一步到位写法：标签必须保留 */
typedef struct Node {
    int value;
    struct Node *next;      /* 自引用处只能写 struct Node * */
} Node;
```

自引用处为什么不能写 `Node *next`？因为别名 Node 要到整个声明结束才生效，而标签在左大括号处就可用了。结构体与联合体的完整故事（含内存布局）见 [结构体与联合体](/c/130-StructAndUnion)。

修改实验：把 `typedef struct Point Point;` 拆成「先定义标签、再单独 typedef」两行，确认与一步到位写法等价；再把 `struct Node *next` 改成 `Node *next`，观察编译器报什么。

## 4. 用 typedef 驯服复杂声明

最值得 typedef 的两类类型是数组指针与函数指针。函数指针的实战主角是 qsort 的比较器：

```c
/* sort_demo.c */
#include <stdio.h>
#include <stdlib.h>

typedef int (*Comparator)(const void *, const void *);

static int ascending(const void *a, const void *b) {
    int x = *(const int *)a, y = *(const int *)b;
    return (x > y) - (x < y);        /* 三态写法，防减法溢出 */
}

static int descending(const void *a, const void *b) {
    return ascending(b, a);
}

int main(void) {
    int arr[] = {5, 2, 8, 1, 9};
    size_t n = sizeof arr / sizeof arr[0];

    qsort(arr, n, sizeof arr[0], ascending);
    for (size_t i = 0; i < n; i++) { printf("%d ", arr[i]); }
    printf("\n");

    qsort(arr, n, sizeof arr[0], descending);
    for (size_t i = 0; i < n; i++) { printf("%d ", arr[i]); }
    printf("\n");
    return 0;
}
```

```text
1 2 5 8 9
9 8 5 2 1
```

没有 typedef 时，这个比较器类型每次出现都要重写一遍 `int (*)(const void *, const void *)`；有了 Comparator，回调参数、函数指针数组、事件表全都一个短名字走天下。函数指针本身怎么指向函数、怎么被调用，在 [函数指针与回调](/c/170-FunctionPointerCallback) 讲透；不带 typedef 时这些声明怎么徒手拆解，在 [复杂声明解析](/c/190-ComplexDeclarationParsing)——本篇给你的是「用 typedef 一劳永逸」这条捷径。

数组指针 typedef 的价值在「保住数组的长度信息」：

```c
typedef int Vector4[4];

static void fill(Vector4 *v) {       /* 指向「整个数组」的指针，自带长度 4 */
    for (int i = 0; i < 4; i++) { (*v)[i] = (int)(i * i); }
}
```

对比 `int *v` 什么长度都不携带，`Vector4 *v` 在类型上就写明了「这边是 4 个 int」。数组退化为指针的完整讨论留给 [数组详解](/c/120-ArrayDetailed)。

## 5. 风格与工程：命名、错误码与 C23 底层类型

命名惯例三条：类型名用大驼峰（Status、ErrorCode）；枚举常量全大写并带类型前缀（STATE_IDLE、ERR_IO）——前缀防撞名，见第 2 节；对外协议（协议命令字、文件格式）里的值显式赋值，让数值稳定不随增删漂移。

错误码设计是枚举最重要的工程应用，骨架如下：

```c
/* errors.h */
typedef enum {
    ERR_OK = 0,          /* 0 恒为成功：if (err) 走失败分支的惯例靠它支撑 */
    ERR_INVALID_ARG,
    ERR_NOT_FOUND,
    ERR_TIMEOUT,
    ERR_UNKNOWN = 255
} Error;

const char *error_string(Error err);
```

```c
/* error.c：名字表 + 范围检查 */
#include "errors.h"

const char *error_string(Error err) {
    static const char *const names[] = {
        "ok", "invalid arg", "not found", "timeout"
    };
    if (err < ERR_OK || err > ERR_TIMEOUT) { return "unknown"; }   /* 清单外的值挡在门外 */
    return names[err];
}
```

三条设计要点：其一，0 表示成功，让 `if (err)` 成为统一的失败判断；其二，名字表依赖「从 0 连续递增」的隐含前提，所以入口必须先做范围检查；其三，对外发布的错误码只在末尾追加、不动旧值——改动中间值会破坏所有已编译的调用方。负数错误码（-1、-2）是另一种流派，与「0 为成功」并存时注意别让 0 混进错误区。

C23 补上了最后一块拼图——固定底层类型：

```c
#include <stdint.h>

enum Status : uint8_t { STATUS_IDLE, STATUS_RUNNING, STATUS_STOPPED };  /* C23 */
```

C23 之前，枚举的兼容整型由实现自行挑选（要求只是「装得下所有枚举值」的某个 char/有符号/无符号整型），于是 `sizeof(enum Status)` 不可移植，把枚举直接写入文件或网络包是隐性雷区。C23 的 `enum E : 类型` 把话挑明。各编译器的支持进度与标准开关（GCC 15 起默认 gnu23、Clang 需显式 -std=c23）见 [C23 与 C2y](/c/520-C23C2y)。

位标志是另一个常见用途：`PERM_READ = 1 << 0` 式的枚举可以按位组合出权限集合。注意组合结果（如 3）往往不在枚举清单里——C 允许，但承载组合值的变量声明成 int 更诚实。位运算细节见 [位运算与位域](/c/070-BitwiseBitField)。

## 6. 常见错误与调试实录

实录一：switch 漏 case，-Wswitch 当场抓获。

```c
/* wswitch.c：日志级别描述函数 */
#include <stdio.h>

typedef enum {
    LOG_DEBUG,
    LOG_INFO,
    LOG_WARN,
    LOG_ERROR
} LogLevel;

static void describe(LogLevel lv) {
    switch (lv) {
    case LOG_DEBUG: puts("debug"); break;
    case LOG_INFO:  puts("info");  break;
    case LOG_WARN:  puts("warn");  break;
    case LOG_ERROR: puts("error"); break;
    }
}

int main(void) { describe(LOG_WARN); return 0; }
```

迭代：后来的同事往枚举末尾追加了 `LOG_FATAL`，describe 没跟上。重新编译：

```bash
gcc -Wall -Wextra -g wswitch.c -o wswitch
```

```text
wswitch.c: In function 'describe':
wswitch.c:13:12: warning: enumeration value 'LOG_FATAL' not handled in switch [-Wswitch]
```

-Wall 自带 -Wswitch：对枚举类型的 switch，漏了任何一个枚举常量都点名警告。而运行期的表现是——走进没写的分支什么都不发生，静默无输出。这正是静态警告比肉眼观察值钱的地方。两个补充开关：一旦写了 default，-Wswitch 立即沉默（它假定 default 兜住了一切）；想让「有 default 也照查」，换 -Wswitch-enum，它的警告连 default 都压不住（GCC 手册原话：即使有 default 标签也照样警告遗漏的枚举值）。

实录二：魔数与错位的名字表，一次事故复盘。

事故起点——值与名字靠人肉同步的两处定义：

```c
/* 事故版 */
#define LOG_DEBUG 0
#define LOG_INFO  1
#define LOG_WARN  2
static const char *const names[] = { "DEBUG", "INFO", "WARN" };
```

需求要加最详细的 TRACE 级别。有人在清单**中间**插入新项，却只改了一半：

```c
typedef enum { LOG_TRACE, LOG_DEBUG, LOG_INFO, LOG_WARN } LogLevel;
static const char *const names[] = { "DEBUG", "INFO", "WARN" };  /* 少了一行 */
/* 后果：level_name(LOG_TRACE) 越界读垃圾；
   level_name(LOG_DEBUG) 打出 "INFO"——错位，且不报错 */
```

复盘三步：第一步定性，值与名字分家在两处，必然漂移；第二步止血，新值只在末尾追加 + 对外值显式赋值锁死；第三步根治，用 X-Macro 把清单收拢到唯一定义点：

```c
/* xmacro.c：一份清单，同时生成枚举与名字表 */
#include <stdio.h>

#define LOG_LEVELS(X) \
    X(LOG_TRACE)      \
    X(LOG_DEBUG)      \
    X(LOG_INFO)       \
    X(LOG_WARN)

typedef enum {
#define X(lv) lv,
    LOG_LEVELS(X)
#undef X
    LOG_COUNT
} LogLevel;

static const char *const names[] = {
#define X(lv) #lv,
    LOG_LEVELS(X)
#undef X
};

static const char *level_name(LogLevel lv) {
    if (lv < 0 || lv >= LOG_COUNT) { return "UNKNOWN"; }   /* 范围检查兜底 */
    return names[lv];
}

int main(void) {
    printf("%s = %d\n", level_name(LOG_TRACE), (int)LOG_TRACE);
    printf("count = %d\n", (int)LOG_COUNT);
    return 0;
}
```

```text
LOG_TRACE = 0
count = 5
```

新增级别从此只加一行 `X(LOG_XXX)`，枚举、名字表、个数三处同生共长。LOG_COUNT 这种「哨兵成员」——不参与业务、专职记录个数——是枚举工程里最值钱的习惯之一。# 与 ## 的展开规则在 [预处理与宏](/c/290-PreprocessorMacro) 有完整讲解。

## 7. 实际项目中的使用场景

- 状态机：枚举当状态、switch 当引擎；更复杂的用「状态 × 事件」二维表，枚举值即下标——

```c
typedef enum { ST_IDLE, ST_BUSY, ST_DONE, ST_COUNT } State;
typedef enum { EV_START, EV_FINISH, EV_COUNT } Event;

static const State next_tab[ST_COUNT][EV_COUNT] = {
    /*               EV_START  EV_FINISH */
    /* ST_IDLE */ { ST_BUSY,  ST_IDLE  },
    /* ST_BUSY */ { ST_BUSY,  ST_DONE  },
    /* ST_DONE */ { ST_DONE,  ST_DONE  },
};
```

ST_COUNT 哨兵让表尺寸自动跟随枚举增长；「枚举连续」这个表驱动的前提，可用 C11 的 `_Static_assert(ST_DONE == 2, ...)` 在编译期锁死。

- 错误码：第 5 节的 errors.h 模式是 C 库接口的标配；
- 权限位、日志级别、协议命令字：值即协议，显式赋值、只追加、配名字表。

## 8. 小练习

预测题（5 分钟）：先写答案再验证。`enum Pri { LOW = 1, MEDIUM, HIGH, URGENT = 10, CRITICAL };` 中 MEDIUM、HIGH、CRITICAL 各是多少？

参考答案（先写再看）：MEDIUM = 2、HIGH = 3（在 LOW 基础上继续递增），CRITICAL = 11（在 URGENT 基础上继续递增）。递增的基准是「前一项」，不是「第一项」。

修改题（10 分钟）：给第 6 节实录一的 describe 补上 LOG_FATAL 分支后，故意再删掉其中一个 case，用 -Wall 编译，确认警告文本里直接给出了漏掉的那个枚举常量名；再补一个 default，观察 -Wswitch 沉默、-Wswitch-enum 仍报。

挑战题（30 分钟，不看答案先动手）：把第 5 节的 errors.h + error_string 扩成完整小程序：从 stdin 读入整数，转成 Error 打印名字，支持「列出全部错误码」的 list 命令。提示两级：

思路方向：names 表 + LOG_COUNT 式的 ERR_COUNT 哨兵；读入用 fgets + strtol 而不是 scanf，转换失败也是一种错误码。

关键 API：strtol 解析整数并检查 errno；范围检查复用 error_string 的入口逻辑。

验收清单：范围外的数字打印 unknown 而不崩溃；-Wall -Wextra 零警告；错误码值的任何调整只动 enum 一处，names 与个数自动跟随。

## 9. 与之前和之后的知识的关系

- 往前：[控制流程](/c/080-ControlFlow) 的 switch 在本篇长出编译期穷举检查；[变量与常量](/c/050-VariableConstant) 的 #define 是本文对比的另一半；
- 旁支：[位运算与位域](/c/070-BitwiseBitField) 支撑位标志枚举；[预处理与宏](/c/290-PreprocessorMacro) 解释 X-Macro 与 typedef vs #define 的底层差异；
- 往后：[结构体与联合体](/c/130-StructAndUnion) 与本文共享 tag 命名空间并延续 typedef struct 惯例；[复杂声明解析](/c/190-ComplexDeclarationParsing) 把三步读法推进到徒手拆任何声明；[C23 与 C2y](/c/520-C23C2y) 给出固定底层类型的标准全景；枚举当下标的状态表，在 [数组详解](/c/120-ArrayDetailed) 正式展开。

## 10. 官方文档

- 枚举（含 C23 固定底层类型与递增规则）：https://en.cppreference.com/w/c/language/enum
- typedef（别名语义与复杂声明示例）：https://en.cppreference.com/w/c/language/typedef
- GCC 警告选项（-Wswitch 与 -Wswitch-enum）：https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html

## 自我检查

- 能把一份魔数 int 状态代码重构成枚举版本，说出新增的两类编译期检查（拼错名字、switch 漏 case）；
- 能用三步读法解释 `typedef int (*Comparator)(const void *, const void *);` 声明的是什么类型；
- 能说出 typedef 与 #define 的两条本质差异，并复述「typedef 不创建新类型」的 Celsius/Fahrenheit 反例；
- 能解释 error_string 为什么先做范围检查，以及 X-Macro 解决了什么漂移问题。

## 本章总结

枚举是一串有名字的整型常量：默认从 0 递增，显式赋值后继续递增，常量本身直到 C23 都是 int；它换来的是拼错名字与 switch 漏 case 两类免费的编译期检查，代价是弱类型——清单外的整数照样能赋进来，工程上用范围检查兜底。typedef 不创建新类型，只是既有类型的同义名，三步读法（遮住 typedef 看变量声明）能读懂一切别名，数组指针与函数指针是最受益的两类。工程收束成三件事：带前缀的命名、0 为成功的错误码配名字表、C23 的固定底层类型。

## 下一步

进入 [数组详解](/c/120-ArrayDetailed)：名字与类型都理顺了，接下来把最常用的复合数据——数组——从声明、退化到多维一次讲透。
