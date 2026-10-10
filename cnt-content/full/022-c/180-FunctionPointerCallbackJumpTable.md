---
order: 220
title: 跳转表：用表驱动替换长 switch
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 从一个 20 个 case、增删命令要改两处的 switch 分发器出发：用枚举做索引、函数指针数组做表体、指定初始化器保证表项对位，完成一个支持 help 列命令的表驱动命令行分发器；对比表驱动与 switch、if-else 链的工程取舍，附字符串命令的哈希查找预告与「漏初始化表项调用 NULL」的段错误调试实录。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'c/130-StructAndUnion'
  - 'c/120-ArrayDetailed'
  - 'c/280-GenericSelection'
  - 'c/550-EmbeddedCProgramming'
prerequisites:
  - 'c/170-FunctionPointerCallback'
  - 'c/110-EnumTypedef'
---

## 前置知识

- 已完成 [函数指针与回调](/c/170-FunctionPointerCallback)：会声明 `int (*fp)(int, int)`、会写函数指针类型的 typedef、知道调用前要判 NULL——本文的全部零件都在那篇；
- 已完成 [枚举与 typedef](/c/110-EnumTypedef)：会定义枚举并知道末尾哨兵成员的用法——本文用枚举做表的索引。

> 分工说明：170 讲函数指针本身与回调模式（怎么声明、怎么传、怎么当比较器）；本篇专讲它的头号应用模式——跳转表（jump table，也叫分发表、命令表）：把一组同签名的函数指针排成数组，用索引代替分支，让「新增一个命令」从改两处变成只改一处。函数指针的语法与陷阱本文不再重复，需要回查去 170。

## 学习目标

读完本文你将能够：

1. 把一个 if-else / switch 命令分发器重构成函数指针数组跳转表，说清改了哪里、没改哪里；
2. 用指定初始化器 `[CMD_ADD] = cmd_add` 写初始化表，解释它比按位置初始化安全在哪、漏写的项是什么值；
3. 写出带 `{命令名, 处理函数, 帮助文本}` 表项的命令行分发器，help 命令免费得到全部命令清单；
4. 按「分发频率、可维护性、调试体验」三个维度，为具体场景在表驱动、switch、if-else 链之间做取舍；
5. 读懂一次「调用空函数指针」的段错误与 ASan 报告，写出两级防御（边界检查 + 判空）。

预计 45 到 60 分钟，含 3 组修改实验、1 道预测题与 1 道挑战题。

## 1. 问题引入：改一个命令，动两处代码

一个命令行工具的分发器，通常长这样（20 个 case 的节选）：

```c
/* dispatcher_switch.c：if-else 链分发器 */
#include <stdio.h>
#include <string.h>

static void cmd_add(const char *arg)  { printf("add %s\n", arg); }
static void cmd_del(const char *arg)  { printf("del %s\n", arg); }
static void cmd_list(const char *arg) { (void)arg; printf("list\n"); }
/* ...其余 17 个 cmd_* 处理函数... */

static void dispatch(const char *cmd, const char *arg) {
    if      (strcmp(cmd, "add")  == 0) cmd_add(arg);
    else if (strcmp(cmd, "del")  == 0) cmd_del(arg);
    else if (strcmp(cmd, "list") == 0) cmd_list(arg);
    /* ...其余 17 个分支，结构照抄... */
    else printf("unknown command: %s\n", cmd);
}

int main(void) {
    dispatch("add", "milk");
    dispatch("list", "");
    dispatch("oops", "");
    return 0;
}
```

预期输出：

```text
add milk
list
unknown command: oops
```

功能正确，但维护起来有三处疼：

1. **增删命令要改两处**：写一个 `cmd_xxx` 函数是第一处；钻进 `dispatch` 的分支链里再插一行是第二处。命令一多，这个函数膨胀到几百行，merge 冲突的重灾区；
2. **help 没有数据来源**：想打印「全部可用命令」，只能再手写一份清单——命令名从此存在两个地方，改漏一处就是文档撒谎；
3. **找分支靠肉眼扫**：想知道 "del" 走哪个函数，从链头往后数。

病根：**「有哪些命令」这个数据，被编译进了「控制流」里**。数据本该住在数据里——一张表。这正是跳转表要解决的事。

## 2. 跳转表构建：枚举做索引，数组做表体

跳转表的本质一句话：函数指针的数组，索引即命令。先从「索引天然就是数字」的场景入手：

```c
/* calc_table.c：四则运算跳转表 */
#include <stdio.h>

typedef enum { OP_ADD, OP_SUB, OP_MUL, OP_DIV, OP_COUNT } Op;

double op_add(double a, double b) { return a + b; }
double op_sub(double a, double b) { return a - b; }
double op_mul(double a, double b) { return a * b; }
double op_div(double a, double b) { return b != 0 ? a / b : 0.0; }

typedef double (*OpFn)(double, double);

/* 跳转表：指定初始化器把表项与枚举成员按名字绑死 */
static const OpFn OPS[OP_COUNT] = {
    [OP_ADD] = op_add,
    [OP_SUB] = op_sub,
    [OP_MUL] = op_mul,
    [OP_DIV] = op_div,
};

static const char *OP_NAMES[OP_COUNT] = {
    [OP_ADD] = "+", [OP_SUB] = "-", [OP_MUL] = "*", [OP_DIV] = "/",
};

double calculate(Op op, double a, double b) {
    int i = op;
    if (i < 0 || i >= OP_COUNT || OPS[i] == NULL) { fprintf(stderr, "bad op: %d\n", i); return 0.0; }
    return OPS[i](a, b);          /* 一次下标访问 + 一次间接调用 */
}

int main(void) {
    for (int op = 0; op < OP_COUNT; op++) {
        printf("10 %s 3 = %.2f\n", OP_NAMES[op], calculate((Op)op, 10, 3));
    }
    return 0;
}
```

```bash
gcc -Wall -Wextra -g calc_table.c -o calc_table
./calc_table
```

预期输出：

```text
10 + 3 = 13.00
10 - 3 = 7.00
10 * 3 = 30.00
10 / 3 = 3.33
```

四个关键设计，各回答一个「为什么不」：

1. **为什么用枚举做索引**：`OP_ADD` 既是代码里的名字又是数组下标，两者永远不会错位；末尾哨兵 `OP_COUNT`（值 5）让数组大小和循环边界自动跟随成员增减。枚举的完整用法见 [枚举与 typedef](/c/110-EnumTypedef)。
2. **为什么用指定初始化器**（designated initializer，C99 引入的 `[下标] = 值` 写法）：`[OP_MUL] = op_mul` 按**名字**绑定位次，表项写乱了顺序也不影响正确性。对照按位置写 `{ op_add, op_sub, op_mul, op_div }`——一旦有人在枚举中间插入一个 `OP_NEG`，所有后续表项集体错位一位，而且编译器一声不吭。名字绑定把这类事故从根上掐掉。
3. **漏写的项是什么**：数组初始化中没被指定初始化器覆盖的元素做「空初始化」——对函数指针就是 NULL。这是双刃剑：它让第 6 节的漏项事故静默存在，也让「按需注册」成为合法设计（先全 NULL，运行时再装）。
4. **为什么入口要防御**：`calculate` 检查下标范围与 NULL，这两行在第 6 节的事故现场里会救命。

修改实验一：把 `OPS` 的四条表项顺序完全打乱（比如 `[OP_DIV]` 写在第一行），重跑——输出一字不变。这就是指定初始化器买到的保险。

## 3. 完整贯穿项目：表驱动命令行分发器

四则运算的索引是枚举，真实命令的索引是**字符串**——那就把「字符串、处理函数、帮助文本」三样捆成一条表项（结构体复习见 [结构体与联合体](/c/130-StructAndUnion)）：

```c
/* shell.c：表驱动命令行分发器，可编译运行 */
#include <stdio.h>
#include <string.h>

typedef void (*CmdFn)(const char *arg);

typedef struct {
    const char *name;     /* 命令名：查找键 */
    CmdFn       handler;  /* 处理函数：跳转目标 */
    const char *help;     /* 帮助文本：help 命令的数据来源 */
} Cmd;

static int g_running = 1;

static void cmd_add(const char *arg)  { printf("added: %s\n", arg[0] ? arg : "(empty)"); }
static void cmd_del(const char *arg)  { printf("removed: %s\n", arg[0] ? arg : "(empty)"); }
static void cmd_time(const char *arg) { (void)arg; printf("now: 12:00 (stub)\n"); }
static void cmd_quit(const char *arg) { (void)arg; g_running = 0; printf("bye\n"); }

static const Cmd TABLE[] = {
    { "add",  cmd_add,  "add <item>   add an item" },
    { "del",  cmd_del,  "del <item>   remove an item" },
    { "time", cmd_time, "time         show the time" },
    { "quit", cmd_quit, "quit         exit" },
};
#define TABLE_LEN (sizeof TABLE / sizeof TABLE[0])

static const Cmd *lookup(const char *name) {
    for (size_t i = 0; i < TABLE_LEN; i++) {
        if (strcmp(TABLE[i].name, name) == 0) return &TABLE[i];
    }
    return NULL;
}

static void help(void) {
    for (size_t i = 0; i < TABLE_LEN; i++) printf("  %s\n", TABLE[i].help);
}

static void dispatch(char *line) {
    char *cmd = strtok(line, " \t\n");      /* 取第一个词做命令 */
    if (cmd == NULL) return;                /* 空行 */
    char *arg = strtok(NULL, " \t\n");      /* 剩余部分做参数 */
    if (strcmp(cmd, "help") == 0) { help(); return; }
    const Cmd *c = lookup(cmd);
    if (c == NULL) { printf("unknown command: %s (try help)\n", cmd); return; }
    c->handler(arg == NULL ? "" : arg);     /* 跳转：通过表项里的函数指针 */
}

int main(void) {
    char line[128];
    printf("mini shell, try 'help'\n> ");
    while (g_running && fgets(line, sizeof line, stdin) != NULL) {
        dispatch(line);
        if (g_running) printf("> ");
    }
    return 0;
}
```

```bash
gcc -Wall -Wextra -g shell.c -o shell
./shell
```

一次会话（`>` 后是输入）：

```text
mini shell, try 'help'
> add milk
added: milk
> time
now: 12:00 (stub)
> help
  add <item>   add an item
  del <item>   remove an item
  time         show the time
  quit         exit
> quit
bye
```

对照第 1 节的三处疼，逐条验收：

1. **增删命令只改一处**：新命令 = 一个 `cmd_xxx` 函数 + TABLE 里一行。`dispatch`、`lookup`、`help`、主循环全部零改动——分发逻辑从 20 个分支缩成 3 行；
2. **help 有了数据来源**：帮助文本住在表项里，`help()` 遍历 TABLE 打印，永远与命令同步，不存在「文档撒谎」；
3. **找分支变成查表**：`lookup` 一眼看清「名字到函数」的映射全表。

`Cmd` 结构体里 `handler` 是函数指针、旁边跟着数据字段——这就是 170 篇事件处理器表的直系亲属，区别只在组织方式：订阅表按「登记顺序」排，命令表按「名字可查」排。

修改实验二：给 shell.c 加 `echo` 命令。动手前先列改动清单：一个 `cmd_echo` 函数、TABLE 一行——两处，而且都在「数据区」；改完跑 help，新命令自动出现在清单里。

## 4. 工程取舍：表驱动、switch、if-else 链

三种分发方式没有绝对赢家，按维度对照：

| 维度 | if-else / switch 链 | 表驱动跳转表 |
| --- | --- | --- |
| 新增一项 | 分发器里加分支，改控制流 | 加一条表项，控制流零改动 |
| help / 列举全部 | 手写第二份清单，易失同步 | 遍历表免费得到 |
| 查找成本 | 命中靠前快、靠后慢，平均 O(n) | 枚举索引 O(1) 下标；字符串索引 O(n) 线性查找 |
| 调试体验 | 单步直观，分支一目了然 | 多一层间接：跳进函数指针，调用栈多一跳 |
| 性能上限 | 密集 case 的 switch 编译器自己会生成跳转表 | 显式可控；函数体分离，可能损失内联 |

两个常被误解的点值得掰开：

- **性能直觉别高估**：编译器并不傻——case 值密集的 switch 早就被编译成编译器生成的跳转表，手写跳转表在纯性能上常常只是打平。间接调用命中分支预测时与直接调用同价，预测失败才要冲刷流水线（十几周期）；而每个处理函数独立成函数，编译器无法把它们内联进分发器，switch 的小 case 体反而可能被内联。
- **所以真正的赢面是可维护性**：命令行、菜单、消息类型这类**低频分发**（用户敲一次命令才分发一次），表驱动把「加命令」的成本从「读懂分发器」降到「加一行」，还白送 help；**高频热路径**（每秒百万次的字节流 opcode 分发）则先写 switch 让编译器优化，用性能剖析数据说话，而不是先验地手写表。

另一个方向上的兄弟是编译期分发：`_Generic` 按类型在**编译时**选函数，运行时零开销，适合「类型已知」的场景（见 [泛型选择](/c/280-GenericSelection)）；跳转表管的是**运行时**才知道走哪条的分发。两者不冲突，一个管类型、一个管值。

修改实验三：把 shell.c 的 `lookup` 前后各加一行计时用的空循环（或直接数 `strcmp` 次数并打印），体会「线性查找成本随命令数增长」——命令只有 4 条时无所谓，几百条时就是第 5 节的问题。

## 5. 进阶：三种常见变体

### 5.1 字符串命令的哈希预告

第 3 节的 `lookup` 是线性查找，n 条命令平均 n/2 次 `strcmp`。命令几十条毫无压力；到了几百条（数据库类程序的命令表规模，Redis 的命令表就是几百项、每项 `{名字, 处理函数, 参数个数}` 的结构，加命令 = 加表项），线性查找开始碍事。标准升级路径是把命令名哈希成桶下标：算一次 `hash("add")` 直接定位桶，桶内再比对——期望 O(1)。实现思路：一个 `hash(const char *)` 函数（djb2 之类）+ 一个 `Cmd *buckets[BUCKET_COUNT]` 数组。本文先把线性版用熟，哈希表留给数据结构专题。

### 5.2 枚举索引的菜单系统

菜单项天然是「编号」，用「全 NULL 起点 + 按需安装」的枚举索引表：

```c
/* menu.c 节选 */
typedef enum { MENU_OPEN, MENU_SAVE, MENU_EXIT, MENU_COUNT } MenuId;
typedef void (*MenuFn)(void);

static MenuFn MENU[MENU_COUNT];   /* 静态数组默认全 NULL：起点干净 */

void menu_install(int id, MenuFn fn) { if (id >= 0 && id < MENU_COUNT) MENU[id] = fn; }
void menu_run(int id) { if (id >= 0 && id < MENU_COUNT && MENU[id] != NULL) MENU[id](); }
```

与 170 篇订阅表的区别：一槽一人（每个菜单项最多一个处理器），安装即覆盖。未安装的项在 UI 上可以自动置灰——`MENU[id] == NULL` 本身就是状态。

### 5.3 跳转表状态机

状态机的「当前状态 + 事件 → 下一状态」也是一张表：每个状态一个处理函数，返回下一个状态。

```c
/* fsm.c 节选：状态处理函数表 */
typedef enum { ST_IDLE, ST_RUN, ST_STOP, ST_COUNT } State;
typedef State (*StateFn)(int ev);

static State on_idle(int ev) { return ev == 1 ? ST_RUN  : ST_IDLE; }
static State on_run(int ev)  { return ev == 2 ? ST_STOP : ST_RUN;  }
static State on_stop(int ev) { (void)ev; return ST_IDLE; }

static const StateFn STATES[ST_COUNT] = {
    [ST_IDLE] = on_idle, [ST_RUN] = on_run, [ST_STOP] = on_stop,
};

State step(State cur, int ev) { return STATES[cur](ev); }
```

协议解析器、游戏 AI、嵌入式控制流都长这个样子。相比巨型 switch 状态机，每个状态的逻辑独立成函数、转移条件读函数体即可；相同骨架在状态更多、转移更密时优势放大。再往深一层，把「方法表」装进结构体（形状结构体带 `draw`/`area` 函数指针、Linux VFS 的 `file_operations`），就从跳转表走到了「C 里的面向对象」，那是另一个专题。

## 6. 常见错误与调试实录：表里漏了一项

跳转表最经典的翻车不发生在写表时，发生在**改表时**。某次重构删掉一行表项，编译通过、测试通过，上线后用户碰到一个命令，程序当场蒸发：

```c
/* hole.c：表里漏了一项 */
#include <stdio.h>

typedef enum { CMD_GO, CMD_STOP, CMD_JUMP, CMD_COUNT } CmdId;

void cmd_go(int x)   { printf("go %d\n", x); }
void cmd_stop(int x) { printf("stop %d\n", x); }
void cmd_jump(int x) { printf("jump %d\n", x); }   /* 函数还在…… */

typedef void (*CmdFn)(int);

static const CmdFn TABLE[CMD_COUNT] = {
    [CMD_GO]   = cmd_go,
    [CMD_STOP] = cmd_stop,
    /* 重构时 [CMD_JUMP] = cmd_jump 这行被删，没人发现 */
};

int main(void) {
    int user_pick = CMD_JUMP;      /* 实际项目里来自配置、网络或用户输入 */
    TABLE[user_pick](3);           /* 第 20 行：崩溃在这里 */
    return 0;
}
```

```bash
gcc -Wall -Wextra -g hole.c -o hole
./hole
```

编译零警告零错误，运行直接退出：

```text
Segmentation fault
```

先想明白为什么编译器不吭声：`TABLE` 声明了 `CMD_COUNT` 个槽，指定初始化器只填了两个——第 2 节说过，没填的槽做空初始化，函数指针槽得到 **NULL**。类型、大小、语法全部合法，静态检查无从下手。而 `TABLE[CMD_JUMP]` 是 `void (*)(int)` 类型的 NULL，调用它就是「跳到地址 0 去执行指令」，未定义行为，典型表现是段错误。开 ASan 拿一份带行号的现场：

```bash
gcc -Wall -Wextra -g -fsanitize=address hole.c -o hole
./hole
```

预期输出（地址每次不同，关键行如下）：

```text
==23150==ERROR: AddressSanitizer: SEGV on unknown address 0x000000000000 (pc 0x000000000000 bp 0x7ffc... sp 0x7ffc... T0)
==23150==The signal is caused by a READ memory access.
==23150==Hint: PC is at a non-executable region. Maybe a wild jump?
==23150==Hint: address points to the zero page.
    #0 0x0  (<unknown module>)
    #1 0x5f2a91c2b1f2 in main hole.c:20
```

逐行读这份报告：

1. `SEGV on unknown address 0x000000000000`——出错地址是 0；
2. `PC is at a non-executable region. Maybe a wild jump?`——ASan 的提示已经点名「野跳转」：程序计数器（PC）跑到了地址 0，即 CPU 被要求去地址 0 取指令执行，这正是「调用 NULL 函数指针」的指纹（数据解引用 NULL 会报 READ/WRITE，这里报的是跳转）；
3. `#0 0x0 (<unknown module>)`——最顶层帧没有名字，因为地址 0 上没有代码；
4. `#1 ... in main hole.c:19`——第二帧才是你的代码：第 19 行的 `TABLE[user_pick](3)`。

破案三步：报错说跳到 0 → 0 从哪来 → 表项是 NULL。修复两级防御，缺一不可：

```c
static void dispatch_cmd(int id, int x) {
    if (id < 0 || id >= CMD_COUNT) { fprintf(stderr, "bad command id: %d\n", id); return; }      /* 第一级：索引越界 */
    if (TABLE[id] == NULL)         { fprintf(stderr, "command %d is not installed\n", id); return; }  /* 第二级：槽位没安装 */
    TABLE[id](x);
}
```

把这次事故变成两条肌肉记忆：

- **静态表必须在入口处防御**：跳转表的索引常来自外部（配置、网络、用户），「表是全的」永远不能当前提；
- **NULL 洞是特性也是雷**：按需注册的设计依赖「未装即 NULL」，那就必须配套「调用前判 NULL」；反过来，绝不要让表处于「未初始化」状态——静态数组默认清零所以安全，局部数组若只初始化一半，剩下的槽是**不确定值**，跳过去比 NULL 更恐怖。

## 7. 实际项目中的使用场景

- **命令分发**：Redis 这类服务用一张全局命令表 `{名字, 处理函数, 参数个数}` 支撑几百条命令，新命令只加表项；本文第 3 节的 shell.c 是它的迷你版；
- **中断向量表**：嵌入式里函数指针数组被链接器放到固定地址，中断号就是下标；中断回调指针常加 volatile 修饰（中断与主程序并发改写），场景见 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)，volatile 的语义在 [C volatile 与 const 深水区](/c/260-ConstAndVolatileQualifiers)；
- **状态机**：协议解析、连接生命周期管理（第 5.3 节骨架），状态多、转移密的项目里几乎是标配写法；
- **接口表**：Linux VFS 的 `file_operations`、Nginx 模块结构——「结构体装一排函数指针」是跳转表思想的静态版：不按下标跳，按字段名调。

## 8. 小练习

预测题（5 分钟）：把 calc_table.c 里 `[OP_DIV] = op_div` 这一条表项删掉（枚举、函数、OP_NAMES 都保留），先写答案再运行。

参考答案（先写再看）：编译照常通过、无警告（这就是静默性）；运行前三行正常，第四行 stderr 打出 `bad op: 3`、返回 0.00——`calculate` 的两级防御接住了 NULL。把防御拆掉再跑，就是第 6 节的段错误现场。建议两种都跑一遍，体会「防御把崩溃变成报错」。

修改题（15 分钟）：给 shell.c 加 `echo` 命令（回显参数），验收：改动只有 `cmd_echo` 函数与 TABLE 一行；help 输出自动包含新命令；`echo`（无参数）与 `echo hello` 都不崩。

挑战题（40 分钟，不看答案先动手）：把 `lookup` 升级为哈希查找。提示两级如下。

提示（思路方向）：写 `unsigned hash_str(const char *s)`（djb2：初值 5381，每步乘 33 加当前字符），对 TABLE 预处理一遍建「名字 → 表项下标」的索引数组，`lookup` 先哈希再比对。

展开（关键 API）：`int INDEX[TABLE_LEN]` 存「该桶对应的 TABLE 下标，-1 表示空」；插入冲突时线性探测下一个空位；`lookup` 里 `hash(name) % TABLE_LEN` 起步，跳过 -1 与名字不符的槽。

验收清单：全部现有命令经新 lookup 命中且行为不变；未知命令仍报 unknown；help 依旧遍历 TABLE 输出完整清单；命令数写成常量的地方只剩 TABLE 本身。

## 9. 与之前和之后的知识的关系

- 往前：[函数指针与回调](/c/170-FunctionPointerCallback) 提供全部零件（声明、typedef、判空纪律）；[枚举与 typedef](/c/110-EnumTypedef) 的哨兵成员撑起表的自动扩缩；表项是结构体、表体是数组，分别是 [结构体与联合体](/c/130-StructAndUnion) 与 [数组详解](/c/120-ArrayDetailed) 的直接应用；
- 旁支：编译期按类型分发走 `_Generic`（[泛型选择](/c/280-GenericSelection)）；中断向量表与 volatile 的并发语义见 [嵌入式 C 编程](/c/550-EmbeddedCProgramming)；
- 往后：第 5.3 节 `StateFn` 的 typedef 只是热身，返回「函数指针的指针」这类声明（如 `int (*(*f)(int))[5]`）的系统性拆法在 [复杂声明解析](/c/190-ComplexDeclarationParsing)。

## 10. 官方文档

- 指定初始化器与「漏写项空初始化」（cppreference C）：https://en.cppreference.com/w/c/language/array_initialization
- 函数指针声明与间接调用（Beej's Guide to C Programming）：https://beej.us/guide/bgc/html/split/pointers-iii-pointers-to-pointers-and-more.html
- 函数指针作为对象：可入数组、可赋值、可传参（cppreference C）：https://en.cppreference.com/w/c/language/pointer

## 11. 自我检查

- 能把一个多分支 switch 分发器重构成表驱动，说清「改了哪些地方、没改哪些地方」；
- 能解释指定初始化器为什么比按位置初始化安全，以及漏写的槽是什么值、由此引出哪条防御纪律；
- 能按分发频率与可维护性，为具体场景在表驱动、switch、if-else 链之间给出选择和理由；
- 能读懂一次「调用 NULL 函数指针」的 ASan 报告（认出 wild jump 指纹），写出边界检查加判空的两级防御。

## 本章总结

跳转表把「有哪些分支」从控制流搬进数据：枚举做索引、函数指针数组做表体、指定初始化器按名字绑定位次（漏写的槽自动是 NULL）。表项捆上名字与帮助文本，分发器缩成三行，help 免费同步，「加一个命令」从此只加一行。工程取舍上，手写跳转表赢在可维护性而非性能——密集 switch 编译器本就会优化成表；低频分发选表驱动，热路径信任编译器。而 NULL 槽静默存在的那一面，就是第 6 节的段错误现场：入口两级防御（索引越界、槽位判空）是把「崩溃」变「报错」的全部代价。

## 下一步

进入 [复杂声明解析](/c/190-ComplexDeclarationParsing)：`StateFn`、`int (*f(int))(void)` 这类声明你已经照着写过不少，下一篇给你一套从标识符出发的读法，把任意复杂声明拆成大白话。
