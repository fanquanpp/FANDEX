---
order: 150
title: C 字符串处理
module: 'c'
category: 计算机科学
difficulty: intermediate
description: C 字符串专篇：char 数组与 '\0' 终止符心智模型、字面量与 char* 的存储差异、string.h 全家（strlen/strcpy/strncpy/strcat/strcmp/strchr/strstr/strtok/strerror）逐个可跑示例、sizeof 与 strlen 混用陷阱，附日志解析、配置键值切分、argv 分词与提取数字实战。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'c/120-ArrayDetailed'
  - 'c/150-PointerArrayDifference'
  - 'c/160-DoublePointerPointerArray'
  - 'c/450-SafeFunctionBoundsCheck'
  - 'c/440-CStandardLibrary'
prerequisites:
  - 'c/120-ArrayDetailed'
  - 'c/140-PointerDeep'
---

# C 字符串处理

## 知识点地图

- **知识类别**：字符串这一独立知识类别——C 里字符串不是类型，而是一套「以 `'\0'` 结尾的字符数组」+ `<string.h>` 函数族的约定。
- **解决什么问题**：所有语言都有字符串，唯独 C 把它交给你自己管：没有长度字段、没有越界保护、`==` 比较的不是内容而是地址。日志要按行切、配置要按 `=` 分键值、命令行要按空格分词——这些日常活全靠 `string.h` 的函数族完成，而每个函数都有自己的一坑（`strncpy` 不补 `'\0'`、`strtok` 不可重入、`strcmp` 返回值符号）。
- **什么时候用到**：
  - 解析任何文本：日志行、CSV、配置文件、命令行参数；
  - 构造与拼接输出：拼路径、拼 SQL（注意注入，见 [安全函数与边界检查](/c/450-SafeFunctionBoundsCheck)）；
  - 查找与替换：在响应体里找子串、在表里查键；
  - 阅读 C 项目源码——`char *` 满天飞，分不清「指向字面量」还是「指向可写缓冲区」就读不下去。
- **与相邻篇目的分工**：字符数组的声明与初始化在 [数组详解](/c/120-ArrayDetailed) 第 2.3 节；`char *s` 对 `char a[]` 的存储差异在 [指针与数组的区别](/c/150-PointerArrayDifference) 第 5 节（本篇只引用结论不重讲）；`argv` 的二级指针本质在 [二级指针与指针数组](/c/160-DoublePointerPointerArray)；`string.h` 函数的速查表在 [C 标准库](/c/440-CStandardLibrary)——本篇是逐个带例子的详解篇。

## 学习目标

- 掌握「1. 心智模型」的核心机制：`'\0'` 终止符、字面量与数组的存储差异、sizeof 对 strlen
- 掌握「2. string.h 函数族」逐个函数的行为、返回值与陷阱
- 能完成「3. 日志行解析」「4. 配置键值切分」「5. argv 分词」「6. 提取数字」四个实战
- 能独立完成密码检测、回文判断、排序与加密四组练习

## 1. 心智模型：一切围绕那个看不见的 '\0'

### 1.1 字符串是「加了句号的字符数组」

C 语言的字符串（string）不是一种独立类型，而是**以 `'\0'` 结尾的字符数组**：

```c
char chars[5] = {'H', 'e', 'l', 'l', 'o'};      /* 只是 5 个字符，不是字符串 */
char str[6]  = {'H', 'e', 'l', 'l', 'o', '\0'}; /* 补上 '\0'，这才是字符串 */
char s[] = "Hello";   /* 惯用写法：自动补 '\0'，sizeof 是 6 不是 5 */
```

`'\0'` 是值为 0 的字符，占 1 字节，叫**终止符**（terminator）。所有字符串函数——`strlen`、`printf` 的 `%s`、`strcmp`——都靠**向前扫描直到遇到 0** 工作。少写它，函数就一路读到越界为止：

```c
/* missing.c：少了 '\0' 会怎样 */
#include <stdio.h>

int main(void) {
    char no_term[5] = {'h', 'e', 'l', 'l', 'o'};   /* 没有 '\0'！ */
    printf("%s\n", no_term);   /* UB：printf 读到哪算哪 */
    return 0;
}
```

典型输出（不可复现，这正是 UB 的定义）：

```text
hello|o�c�!P��
```

`printf` 把 `no_term` 之后的栈内存也当字符打了出来，直到碰巧遇到一个 0 才停。它**可能**崩、**可能**打印垃圾、**可能**看似正常——三种结果都符合标准。用 ASan 跑（`gcc -g -fsanitize=address`）多半能抓到 stack-buffer-overflow READ。记死一句话：**分配 n 字节，最多安全地存 n-1 个字符 + 1 个 `'\0'`**。

### 1.2 字面量与 char 数组：一个只读、一个可写

```c
char *p = "hi";    /* p 指向只读段的字面量本体 */
char a[] = "hi";   /* a 是栈上数组，装了一份可写拷贝 */
```

两者 `sizeof` 一个是 8（指针）、一个是 3（数组），`p[0] = 'H'` 是修改字符串字面量的未定义行为，`a[0] = 'H'` 完全合法。完整机制（静态存储期、只读内存页、编译器可能合并相同字面量）在 [指针与数组的区别](/c/150-PointerArrayDifference) 第 5 节拆解，这里给出工程判据：

| 需求 | 写法 |
| --- | --- |
| 只读引用常量字符串（打印、比较、传参） | `const char *s = "...";` |
| 需要修改内容 | `char a[] = "...";` |
| 一组长度不一的字符串（名字表、菜单项） | `const char *names[] = {...};` |

顺手把 `const` 写上：字面量本来就改不得，`const char *` 让编译器替你把关——`s[0] = 'H'` 从「运行时可能崩」变成「编译期直接报错」。

### 1.3 sizeof 对 strlen：一个问容量，一个问内容

两个最容易混的计算，问的根本不是一件事：

```c
/* size_vs_len.c */
#include <stdio.h>
#include <string.h>

int main(void) {
    char a[20] = "hello";

    printf("sizeof(a)   = %zu\n", sizeof(a));    /* 20：数组的容量，编译期常量 */
    printf("strlen(a)   = %zu\n", strlen(a));    /* 5：扫到 '\0' 为止的字符数 */
    printf("sizeof(\"hello\") = %zu\n", sizeof("hello")); /* 6：字面量含 '\0' */
    printf("strlen(\"hello\") = %zu\n", strlen("hello")); /* 5：不含 '\0' */

    char *p = a;
    printf("sizeof(p)   = %zu\n", sizeof(p));    /* 8：p 是指针！不是 20 */
    return 0;
}
```

| 表达式 | 结果 | 含义 |
| --- | --- | --- |
| `sizeof(a)` | 20 | 分配了多少字节（含未用的格） |
| `strlen(a)` | 5 | 内容有多少字符（不含 `'\0'`），运行时扫描 |
| `sizeof("hello")` | 6 | 字面量类型是 `char[6]`，含结尾 |
| `strlen("hello")` | 5 | 内容长度 |

混用陷阱有两类：

1. **把 `sizeof(buf)` 当 `strlen(buf)` 用**：`memcpy(dst, src, sizeof(src))` 里若 `src` 是指针，拷的是 8 字节而不是内容——源代码里最常见的静默错误之一；
2. **数组名传进函数后再 sizeof**：参数已退化为指针，`sizeof` 变成 8。所以在函数里，「字符串多长」只能问 `strlen`，「缓冲区多大」必须由调用方另传一个 `size_t` 参数——这正是「指针 + 长度」接口惯例的来源（退化规则的完整推导见 [指针与数组的区别](/c/150-PointerArrayDifference)）。

还有一条与 `strlen` 返回值类型有关的暗坑：它返回 `size_t`（无符号）。`strlen(s) - 10` 在 `strlen(s) < 10` 时**不会**得到负数，而是回绕成天文数字：

```c
if (strlen(s) - 10 > 0) { ... }   /* 几乎永远为真！无符号比较 */
/* 想表达「长度不足 10」： */
if (strlen(s) < 10) { ... }       /* 正确写法 */
```

### 1.4 遍历的两种写法：下标与指针

```c
const char *s = "hello";

/* 下标法：直观 */
for (size_t i = 0; s[i] != '\0'; i++) putchar(s[i]);

/* 指针法：与标准库实现同款 */
for (const char *q = s; *q; q++) putchar(*q);
```

两种写法语义等价（`s[i]` 本就是 `*(s + i)` 的语法糖），指针法在逐字符处理时少一个下标变量，是 C 惯用风格。判断条件 `*q` 即 `*q != '\0'`——终止符本身就是循环出口，这是 C 字符串设计的自洽之处。

## 2. string.h 函数族：逐个拆解

速查表版在 [C 标准库](/c/440-CStandardLibrary)，本节逐个带可跑示例。

### 2.1 strlen：求长度，O(n) 不是 O(1)

```c
size_t len = strlen("hello world");   /* 11 */
```

注意三点：

- **每次调用都是完整扫描**。把它写进循环条件就是 O(n^2)：

```c
/* 反例：每轮循环重新扫一遍 s */
for (size_t i = 0; i < strlen(s); i++) { ... }

/* 正解：长度先存下来 */
size_t len = strlen(s);
for (size_t i = 0; i < len; i++) { ... }
```

编译器在 `-O2` 下有时能把不变量外提救回来，但别赌——把「循环条件里调用 strlen」当成代码评审的固定扣分项。
- 返回 `size_t`，无符号回绕陷阱见 1.3 节；
- 对没有 `'\0'` 的缓冲区是 UB——它不知道你有多少字节，只认终止符。

### 2.2 strcpy / strncpy：拷贝，一个危险一个反直觉

```c
char dst[16];

strcpy(dst, "short");      /* 内容短：安全，复制含 '\0' 共 6 字节 */
strcpy(dst, "this string is way too long!");   /* 越界写！没有长度参数 */
```

`strcpy` 不检查目标大小——目标小了就是缓冲区溢出，安全分析与事故案例集中在 [安全函数与边界检查](/c/450-SafeFunctionBoundsCheck)。`strncpy` 看起来是解药：

```c
strncpy(dst, src, sizeof(dst) - 1);
```

但它有两个著名的反直觉：

```c
/* 陷阱一：源串不短于 n 时不写 '\0' */
char dst[4];
strncpy(dst, "hello", sizeof(dst));   /* dst 现在是 'h''e''l''l'，没有终止符！ */
printf("%s", dst);                     /* UB：一路读出去 */

/* 正确姿势：手动补终止符 */
char dst2[4];
strncpy(dst2, "hello", sizeof(dst2) - 1);
dst2[sizeof(dst2) - 1] = '\0';        /* 现在是 "hel" */
```

所以工程铁律：**用 `strncpy` 必须紧跟一句手动置 `'\0'`**，或者直接用带边界检查的 `snprintf(dst, sizeof(dst), "%s", src)`——它保证终止，代价是多一次格式解析。C11 还提供 Annex K 的 `strcpy_s`（MSVC 支持，glibc 默认不开），可移植代码首选 `snprintf` 方案。

### 2.3 strcat / strncat：拼接，先问装不装得下

```c
char path[64] = "/home/user";
strcat(path, "/notes.md");    /* 追加到已有内容之后，返回 dst */
```

`strcat` 的前提是「目标装得下两段之和」，装不下就溢出。`strncat(dst, src, n)` 追加**至多** n 个字符——且与 `strncpy` 不同，它**总会**补 `'\0'`（这是两者最反直觉的不对称）。更稳的拼接是 `snprintf`：

```c
char path[64];
snprintf(path, sizeof(path), "%s/%s", dir, name);   /* 装不下就截断，保证终止 */
```

### 2.4 strcmp：比较内容，返回值是符号不是布尔

```c
if (strcmp(input, "quit") == 0) { ... }    /* 判等：== 0 */
```

三条必须刻进肌肉记忆：

1. **比较字符串内容用 `strcmp(a, b) == 0`，绝不能用 `a == b`**——后者比较的是两个指针（地址），内容完全相同的两块内存也不相等：

```c
char a[] = "hi";
char *b = "hi";
a == b          /* false：一个是栈地址，一个是只读段地址 */
strcmp(a, b)    /* 0：内容逐字符相同 */
```

2. **返回值是「负零正」**：`a` 小于 `b` 返回负数，相等返回 0，大于返回正数。标准只保证**符号**，不保证具体数值——写 `strcmp(a, b) == 1` 是经典 bug，必须写 `> 0`。
3. 比较依据是 `unsigned char` 的字典序，对纯 ASCII 就是字母表序；遇到中文等多字节编码，字节序不等于语言排序（locale 相关的 `strcoll` 是另一回事）。

### 2.5 strchr / strstr：查找字符与子串

```c
/* strchr：找第一个出现的字符，返回指向它的指针，找不到返回 NULL */
const char *log = "2026-10-07 12:00:01 INFO server started";
const char *first_space = strchr(log, ' ');
if (first_space) {
    printf("date part: %.*s\n", (int)(first_space - log), log);
}

/* 变体 strrchr 从右往左找：取文件扩展名 */
const char *name = "report.final.pdf";
const char *dot = strrchr(name, '.');
printf("ext: %s\n", dot ? dot + 1 : "(none)");   /* pdf */

/* strstr：找子串 */
const char *body = "HTTP/1.1 404 Not Found";
if (strstr(body, "404")) printf("not found response\n");
```

返回指针而不是下标，配合指针减法能直接得到位置：`first_space - log` 是 10。`%.*s` 的 `*` 表示「精度从参数取」，打印限定长度的片段——日志解析的常用组合拳。找不到返回 NULL，**用前必须判空**，这也是 [C 标准库](/c/440-CStandardLibrary) 总结的「指针型函数失败返回 NULL」通用规律。

### 2.6 strtok / strtok_r：切分，但是有状态的

`strtok(line, " ")` 按 " " 里的字符切分，**原地修改**字符串（把分隔符改成 `'\0'`），内部用**静态变量**记住进度：

```c
char line[] = "error: disk full on /dev/sda1";
char *tag  = strtok(line, ":");    /* "error"          第一次传字符串 */
char *msg  = strtok(NULL, ":");    /* " disk full ..." 后续传 NULL 续切 */
/* line 已被改写："error\0 disk full on /dev/sda1"，冒号变成了 '\0' */
```

三个必须知道的特性：

1. **原地修改**：想保住原串，先拷贝一份再切（下面实战全是这个写法）；
2. **不可重入**：静态状态意味着两个调用交错（多线程、或在切分循环里调用另一个切分函数）会互相踩——POSIX 提供可重入版 `strtok_r(s, delim, &saveptr)`（Windows 对应 `strtok_s`），工程代码一律用它；
3. **连续分隔符按一个处理**，且跳过开头的分隔符——`"a,,b"` 用 "," 切得到 "a"、"b"，空字段会丢。CSV 这类「空字段有意义」的格式必须手写状态机，`strtok` 不合适。

### 2.7 strerror / perror：把错误码翻译成人话

```c
#include <errno.h>
#include <stdio.h>
#include <string.h>

FILE *fp = fopen("missing.txt", "r");
if (!fp) {
    printf("open failed: %s\n", strerror(errno));   /* "No such file or directory" */
    perror("open failed");                           /* "open failed: No such file or directory" */
}
```

`errno` 是「上一次系统调用/库函数失败」的错误码，`strerror(errno)` 翻译成可读字符串，`prefix + 冒号 + 空格 + 人话` 一步到位。易错点：`errno` 只在**调用失败后**立即读取才有意义——中间隔了另一个可能失败的调用就会被覆盖。错误处理的体系化讲解在 [C 标准库](/c/440-CStandardLibrary) 的错误码一节。

## 3. 实战一：日志行解析

工程里最常见的字符串活：把一行日志按格式拆出时间、级别与消息。

```c
/* logparse.c：解析 "2026-10-07 12:00:01 INFO server started" */
#include <stdio.h>
#include <string.h>

int main(void) {
    const char *raw = "2026-10-07 12:00:01 INFO server started";

    char line[128];
    snprintf(line, sizeof(line), "%s", raw);   /* 拷贝到可写缓冲区 */

    char *save = NULL;                         /* strtok_r 的进度记录，声明一次全程复用 */
    char *date  = strtok_r(line, " ", &save);
    char *time_ = strtok_r(NULL, " ", &save);
    char *level = strtok_r(NULL, " ", &save);
    char *msg   = strtok_r(NULL, "",  &save);  /* 空分隔符：剩余全部 */

    printf("[%s] [%s] %s\n", level, date, msg);
    return 0;
}
```

逐段讲解：

- **先拷贝再切**：`raw` 指向字面量（只读段），`strtok_r` 要原地改写，直接切是「修改字符串字面量」UB。`snprintf` 拷进栈数组，顺带保证终止；
- **第二次起传 NULL**：`strtok_r` 靠 `saveptr` 记住上次的进度，NULL 表示「接着切」；
- **用 `""` 吃掉剩余整段**：分隔符串为空时，`strtok_r` 返回「从当前位置到结尾」的整体——因为消息本身可能含空格，不能再按空格切。

更严苛的解析（时间戳要拆成 6 个数字）交给 `strtol` 而不是 `atoi`——「带错误检测的数值转换」在 [C 标准库](/c/440-CStandardLibrary) 的 strtol 一节有完整对照。

## 4. 实战二：配置文件按 '=' 切键值

INI 风格配置行 `timeout = 30` 的键值分离：

```c
/* kvparse.c：把 "timeout = 30" 拆成 key="timeout" value="30" */
#include <stdio.h>
#include <string.h>
#include <ctype.h>

/* 就地修剪首尾空白，返回裁剪后的指针（原缓冲区内容可能被前移利用） */
char *trim(char *s) {
    while (isspace((unsigned char)*s)) s++;            /* 跳过开头空白 */
    char *end = s + strlen(s);
    while (end > s && isspace((unsigned char)end[-1])) *--end = '\0';
    return s;
}

int parse_kv(char *line, char **key, char **value) {
    char *eq = strchr(line, '=');
    if (!eq) return -1;             /* 没有 '='：不是键值行 */
    *eq = '\0';                     /* 原地断开：左半是 key，右半是 value */
    *key   = trim(line);
    *value = trim(eq + 1);
    return 0;
}

int main(void) {
    char buf[64];
    char *lines[] = {"timeout = 30", "  name=server ", "noseparator"};
    for (int i = 0; i < 3; i++) {
        snprintf(buf, sizeof(buf), "%s", lines[i]);
        char *k, *v;
        if (parse_kv(buf, &k, &v) == 0) {
            printf("key=[%s] value=[%s]\n", k, v);
        } else {
            printf("skip: %s\n", buf);
        }
    }
    return 0;
}
```

```text
key=[timeout] value=[30]
key=[name] value=[server]
skip: noseparator
```

关键技巧逐条：

- **`strchr(line, '=')` 找第一个 `=` 并写 `'\0'` 断开**——这是不拷贝就能切两半的标准手法：`= 'x' = 'y'` 的写法把行内某处变成两个字符串；
- **`trim` 处理 `=` 两侧的空格**：`isspace` 参数强转 `unsigned char` 是为避免负 `char` 传给 `ctype` 函数的 UB（`char` 默认有符号的平台上传中文等高位字节会踩雷）；
- **为什么不找最后一个 `=`**：`url=http://x?a=b` 这类值里含 `=` 的行，找第一个会截断值。解析器对「第一个还是最后一个」的选择是需求问题——注释里写清你的选择即可。

这个函数与真实配置解析器的差距在注释行、引号、转义——每加一条规则，手写解析器的分叉就多一层，这也是为什么生产代码常用现成 INI 库。手写的价值在于看懂每一层分支。

## 5. 实战三：argv 分词（承接二级指针篇）

`main(int argc, char **argv)` 里的 `argv` 是「指向 char 指针的指针」——一个指针数组。自己动手构造一个 `argv`，把一行命令按空格切成参数表，是把「字符串 + 二级指针 + malloc」三件事串起来的最好练习。完整实现（两遍扫描：先数 token 个数、再分配指针数组并复制）与逐行讲解在 [二级指针与指针数组](/c/160-DoublePointerPointerArray) 的工程案例一节，这里给出精简版供对照：

```c
/* miniargv.c：把 "ls -la /tmp" 切成 argv 形态（精简版，错误路径从简） */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    char buf[64];
    snprintf(buf, sizeof(buf), "%s", "ls -la /tmp");

    char *argv[8] = {NULL};
    int argc = 0;
    char *save = NULL;
    for (char *tok = strtok_r(buf, " ", &save);
         tok != NULL && argc < 7;
         tok = strtok_r(NULL, " ", &save)) {
        argv[argc++] = tok;          /* token 就地留在 buf 里，指针数组只存地址 */
    }
    argv[argc] = NULL;               /* argv[argc] == NULL 的约定 */

    for (int i = 0; argv[i]; i++) {
        printf("argv[%d] = %s\n", i, argv[i]);
    }
    return 0;
}
```

```text
argv[0] = ls
argv[1] = -la
argv[2] = /tmp
```

与 160 篇完整版的差异：这里 token 直接引用 `buf` 内的原地切片（`strtok_r` 写的 `'\0'` 就是界碑），不 `strdup` 复制——**栈缓冲区的生命周期覆盖使用期**时可以省内存；一旦 `argv` 要活过 `buf`（比如存进全局），就必须 `strdup` 逐个复制并在用完后 `free`，所有权规则与 [二级指针与指针数组](/c/160-DoublePointerPointerArray) 的输出参数一节相同。

## 6. 实战四：从混合文本中提取数字

从 `"abc123read456,fg789"` 中把三段数字 123、456、789 抠出来——文字与数字混排的解析（日志里的耗时、传感器行里的读数）都是这个模式：

```c
/* extract.c：扫描字符串，逐段提取数字 */
#include <ctype.h>
#include <stdio.h>

int main(void) {
    const char *s = "abc123read456,fg789";

    int values[16] = {0};
    int count = 0;

    for (const char *p = s; *p; p++) {
        if (!isdigit((unsigned char)*p)) continue;    /* 非数字：跳过 */
        int v = 0;
        while (isdigit((unsigned char)*p)) {          /* 连续数字段：累加 */
            v = v * 10 + (*p - '0');
            p++;
        }
        if (count < 16) values[count++] = v;          /* 防越界写入 */
        p--;                       /* for 的 p++ 会再走一步，退回衔接处 */
    }

    for (int i = 0; i < count; i++) printf("%d\n", values[i]);
    return 0;
}
```

```text
123
456
789
```

逐行解释：

- **两层循环的分工**：外层找「数字段的起点」（遇到非数字就前进），内层把一段连续数字累加成整数；
- **`*p - '0'` 是字符转数字**：ASCII 里 `'0'` 到 `'9'` 连续编码，`'7' - '0'` 就是 7。反过来 `v % 10 + '0'` 是数字转字符；
- **`v * 10 + digit` 是手写 `strtol` 的核心**——这也是「为什么解析数字要用 `strtol`」的答案：溢出检测、前后导空白、错误码，手写版全都没管；
- **`p--` 的补偿**：内层循环结束时 `p` 停在数字段后的第一个非数字字符上，外层 `for` 的 `p++` 会跳过它——若那个字符恰是另一个数字段的起点（不可能，段后必是非数字）或结束符就没问题；写成显式 `while` 而不做补偿更不易错，两种写法都值得会读；
- **`count < 16` 的边界**：输出数组固定 16 格，写入前检查——提取类程序最容易漏「比预期多的匹配」。

更工程的做法是直接用 `strtol` 扫描：它能告诉你「消费到哪了」（通过第二参数的指针），循环里不需要手动步进。

## 7. 常见陷阱速查

1. **忘 `'\0'`**：手工填字符数组后没补终止符，`printf`/`strlen` 全部越界读；
2. **`sizeof` 当 `strlen`**：拷贝长度写成 `sizeof(p)`（指针 8 字节）或 `sizeof(buf)`（含未用空间）；
3. **`strncpy` 后直接用**：源串不短于 n 时无终止符，后续全是 UB；
4. **`a == b` 比内容**：比的是地址，永远判「同一块内存」；
5. **`strcmp(a, b) == 1`**：返回值只保证符号，不保证数值；
6. **循环里写 `strlen(s)`**：O(n^2)，长度先存变量；
7. **`strtok` 修改原串 / 多线程踩静态状态**：先拷贝、用 `strtok_r`；
8. **无符号回绕**：`strlen(s) - 10 > 0` 几乎恒真，判断写成 `strlen(s) < 10`；
9. **返回局部字符数组**：`char buf[32]; return buf;` 悬空指针，用输出参数或动态分配。

## 8. 动手实践

### 练习一：密码检测（课件例题改编）

任务：实现 `int password_ok(const char *pwd);`——长度 6 到 12、必须同时含字母与数字，满足返回 1。`main` 里从键盘读入（`fgets`，记得去掉末尾换行）测试。
提示：`fgets(buf, sizeof(buf), stdin)` 之后 `buf[strcspn(buf, "\n")] = '\0'` 去换行；「同时含」用两个标志变量，一遍循环同时统计。

参考实现（先自己写，写完再对照）：

```c
#include <ctype.h>
#include <string.h>

int password_ok(const char *pwd) {
    size_t len = strlen(pwd);
    if (len < 6 || len > 12) return 0;
    int has_alpha = 0, has_digit = 0;
    for (const char *p = pwd; *p; p++) {
        if (isalpha((unsigned char)*p)) has_alpha = 1;
        if (isdigit((unsigned char)*p)) has_digit = 1;
    }
    return has_alpha && has_digit;
}
```

### 练习二：回文判断

任务：实现 `int is_palindrome(const char *s);`，忽略大小写判断回文（"Level" 算回文）。
提示：头尾两个下标向中间走；比较前用 `tolower` 统一小写；`size_t` 做减法会下溢，循环条件用 `lo < hi` 而不是 `hi - lo > 0`。

参考实现（先自己写，写完再对照）：

```c
#include <ctype.h>
#include <string.h>

int is_palindrome(const char *s) {
    size_t lo = 0, hi = strlen(s);
    if (hi == 0) return 1;
    hi--;
    while (lo < hi) {
        if (tolower((unsigned char)s[lo]) != tolower((unsigned char)s[hi]))
            return 0;
        lo++;
        hi--;
    }
    return 1;
}
```

### 练习三：单词计数（题库第 47 题改编）

任务：统计一行英文里的单词个数，单词以空格分隔（连续空格按一个算）。
提示：状态机思路——用一个 `in_word` 标志，从「非单词字符」进入「字母」的那一瞬计数加一；注意用 `isalpha` 判断而不是 `!= ' '`，句尾标点不拆词。

参考实现（先自己写，写完再对照）：

```c
#include <ctype.h>

int count_words(const char *s) {
    int count = 0, in_word = 0;
    for (const char *p = s; *p; p++) {
        if (isalpha((unsigned char)*p)) {
            if (!in_word) { count++; in_word = 1; }
        } else {
            in_word = 0;
        }
    }
    return count;
}
```

### 练习四：大小写互换与 a 到 c 移位加密（题库第 45、46 题改编）

任务一：`void swap_case(char *s);` 把大写变小写、小写变大写，其余不变。
任务二：`void caesar_shift(char *s);` 做循环移位加密——每个字母替换成字母表后移 2 位的字母（a 变 c、y 绕回 a），大小写保持。
提示：`isupper`/`islower` 分支；移位加密用 `(ch - 'a' + 2) % 26 + 'a'` 的模运算处理绕回，先减 `'a'` 归一化再偏移。

参考实现（先自己写，写完再对照）：

```c
#include <ctype.h>

void swap_case(char *s) {
    for (; *s; s++) {
        if (isupper((unsigned char)*s))      *s = (char)tolower((unsigned char)*s);
        else if (islower((unsigned char)*s)) *s = (char)toupper((unsigned char)*s);
    }
}

void caesar_shift(char *s) {
    for (; *s; s++) {
        if (islower((unsigned char)*s))
            *s = (char)((*s - 'a' + 2) % 26 + 'a');
        else if (isupper((unsigned char)*s))
            *s = (char)((*s - 'A' + 2) % 26 + 'A');
    }
}
```

### 练习五（综合工程）：日志级别过滤

任务：把第 3 节的日志解析扩成过滤器——`int keep_line(const char *line, const char *level);` 返回该行级别是否等于 `level`，`main` 里对数组 `logs[]` 过滤出所有 ERROR 行。
提示：切分后用 `strcmp(level_tok, level) == 0` 判等；想想为什么「用 `strstr(line, level)` 会被消息正文里的 ERROR 字样误伤」——这正是「结构化解析优于子串匹配」的理由。

参考实现（先自己写，写完再对照）：

```c
#include <string.h>

int keep_line(char *line, const char *level) {   /* line 会被就地改写 */
    char *save = NULL;
    strtok_r(line, " ", &save);              /* 日期 */
    strtok_r(NULL, " ", &save);              /* 时间 */
    strtok_r(NULL, " ", &save);              /* 级别前若还有列则继续推进 */
    char *lv = strtok_r(NULL, " ", &save);
    return lv && strcmp(lv, level) == 0;
}
```

两个易错点自检：续切必须传 `NULL`（传 `line` 会从头重来，死循环切出同一个词）；列数要与日志格式对齐，格式一变这里就错位——工程上更稳的做法是把第 3 节的解析函数返回结构化的字段，而不是每个调用点手数列。

## 9. 实际项目中的使用场景

- **嵌入式与日志**：串口/网络一行一行收文本，`fgets + strtok_r + strtol` 是标准三件套；
- **配置与脚本**：INI/环境变量解析（第 4 节）、shell 命令分词（第 5 节）；
- **协议处理**：HTTP 头是 `key: value` 行，解析骨架就是第 4 节的 `strchr + trim`；
- **安全边界**：所有「拷进固定缓冲区」的路径都该过一遍第 7 节清单——缓冲区溢出几乎是 C 漏洞史的第一主角（防御体系见 [安全函数与边界检查](/c/450-SafeFunctionBoundsCheck)）。

## 10. 与之前和之后的知识的关系

- 往前：[数组详解](/c/120-ArrayDetailed) 的字符数组与 `'\0'` 初识是本文的地基；[指针：地址、解引用与指针算术](/c/140-PointerDeep) 的指针遍历是第 1.4 节写法的来源；
- 旁支：[指针与数组的区别](/c/150-PointerArrayDifference) 拆解 `char *s` 与 `char a[]` 的存储与可写性差异；[二级指针与指针数组](/c/160-DoublePointerPointerArray) 解释 `char **argv` 的完整类型含义；
- 往后：[安全函数与边界检查](/c/450-SafeFunctionBoundsCheck) 系统讲缓冲区边界与 `_s` 系函数；[C 标准库](/c/440-CStandardLibrary) 是本文函数族的速查总表；[C 链表与节点式数据结构](/c/165-CLinkedListImplementation) 里 `strmat` 动态字符串矩阵展示了「字符串 + 动态内存」的组合。

## 11. 官方文档

- C 字符串处理总览（cppreference C，CC-BY-SA）：https://en.cppreference.com/w/c/string
- 字节字符串函数逐个页面（strlen/strcpy/strcmp/strchr/strstr/strtok/strerror）：https://en.cppreference.com/w/c/string/byte
- 空终止字符串工具（strtok_r 等 POSIX 扩展）：https://man7.org/linux/man-pages/man3/strtok.3.html
- `strncpy` 的终止符行为说明（C 标准原文的通俗版）：https://en.cppreference.com/w/c/string/byte/strncpy

## 12. 自我检查

- 能解释「n 字节最多安全存 n-1 个字符」的原因，并写出手工填字符数组后补 `'\0'` 的代码；
- 能在 30 秒内说出 `sizeof(a)`、`strlen(a)`、`sizeof(p)` 对 `char a[20] = "hello"; char *p = a;` 各是多少，以及为什么函数里 `sizeof(a)` 不可信；
- 能默写 `strncpy` 需要手动补终止符的理由，和 `strncat` 与它行为不对称的事实；
- 能解释 `strcmp(a, b) == 0` 与 `a == b` 的区别，以及为什么不能写 `== 1`；
- 能不查资料写出「拷贝、按分隔符切分（strtok_r）、判等、提取数字」四段骨架代码，并说出每个函数的一个坑。

## 本章总结

C 的字符串是「以 `'\0'` 结尾的字符数组」这一纸约定：终止符是所有函数的出口，少它一切越界。`sizeof` 问容量（编译期、数组身份专属），`strlen` 问内容（运行时扫描、返回无符号）。字面量住只读段（`char *` 指过去，改则 UB），数组是可写拷贝（`char a[]`）。`string.h` 的每个函数都带着自己的脾气：`strcpy` 不设防、`strncpy` 不补零、`strncat` 偏偏补、`strcmp` 只保证符号、`strchr/strstr` 失败给 NULL、`strtok` 原地改串且不可重入（工程用 `strtok_r`）、`strerror` 把 `errno` 翻译成人话。四个实战——日志按列切、配置按 `=` 断、argv 按空格分、文本里抽数字——覆盖了 90% 的日常文本处理，它们共享同一套骨架：拷进可写缓冲区、找分隔符断开、逐段判等或转换、每一步防越界。

## 参考与致谢

- 本文 `string.h` 各函数的行为描述（`strncpy` 不自动终止、`strtok` 不可重入、`strcmp` 返回值仅保证符号等）依据 cppreference C 标准库文档（CC-BY-SA 许可，来源：https://en.cppreference.com/w/c/string ），代码示例为原创；
- 练习一、二、四、五的题面原型来自课程讲义中的密码检测、回文判断与字符串处理系列上机题，实现均为原创；
- 其余内容为原创教学文本。
