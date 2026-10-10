---
order: 490
title: 安全函数与边界检查：溢出从源头杜绝
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 从 strcpy 溢出现场出发，给全危险函数地图与 snprintf 正解，讲透 strncpy 无终止符、sizeof(指针)、整数转 size_t 三大经典坑，核实 Annex K（_s 函数）的真实生态位，收口于编译期检查清单。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'c/430-StdioFileIO'
  - 'c/210-ProcessMemoryLayoutAndErrors'
  - 'c/485-StaticAnalysisAndSanitizers'
  - 'c/410-CrossPlatformProgramming'
prerequisites:
  - 'c/120-ArrayDetailed'
  - 'c/140-PointerDeep'
---

## 前置知识

- 已完成 [数组](/c/120-ArrayDetailed)：知道数组名传递会退化为指针、`sizeof` 求数组大小的用法与限制；
- 知道 `char buf[16]` 与 `char *p` 的区别，用过 `strcpy`、`strlen`、`fgets` 中至少一个。

> 分工说明：本篇讲「危险函数与边界」的源头治理——怎么不写出溢出。[内存深水区](/c/210-ProcessMemoryLayoutAndErrors) 讲事故发生后 ASan 报告怎么逐行读（工具抓现场）；[静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers) 讲静态分析工具箱（编译器之外的检查器）；[文件 I/O](/c/430-StdioFileIO) 讲 `fgets` 的完整用法。本篇与三者互补：210 教你破案，本篇教你别作案。

## 学习目标

读完本文你将能够：

1. 给出 `strcpy`、`strncpy`、`strlcpy`、`snprintf` 四者的行为差异表，并为任一场景选出正确的一个；
2. 说清 `strncpy` 「源串过长时不写 `\0`」的陷阱，写出能复现越界读的最小实验；
3. 解释为什么函数内部拿不到缓冲区大小，以及 `sizeof(指针)` 误用的现场；
4. 识别「负数转 `size_t` 变巨数」「长度计算回绕」两类整数陷阱并给出防御写法；
5. 说出 Annex K（`*_s` 函数）的真实生态位：谁实现了、谁拒绝了、为什么不把它当日常方案。

预计 40 到 60 分钟，含 2 组动手实验与 3 道练习。

## 1. 问题引入：一行 strcpy 的代价

```c
/* greet.c */
#include <stdio.h>
#include <string.h>

int main(int argc, char *argv[]) {
    char buf[16];
    strcpy(buf, argv[1]);    /* argv[1] 长于 15 字节时会发生什么？ */
    printf("hello %s\n", buf);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g greet.c -o greet
./greet a-very-long-name-that-exceeds-sixteen
```

大概率照常打印，然后程序在别的地方崩溃——或者干脆什么都不发生。这正是缓冲区溢出的阴险之处：`strcpy` 不检查目标缓冲区大小，源串长于 15 字节时，多余的字符越过 `buf` 的边界继续写，踩坏栈上相邻数据甚至返回地址。1988 年的 Morris 蠕虫（互联网第一次大规模安全事件）利用的就是 `gets` 的这一类缺陷；2014 年的 Heartbleed（OpenSSL 越界读取，泄露私钥与会话）是它的现代变体——信任了一个来自外部的长度字段。

用 ASan 抓现行（工具详解在 210 篇）：

```bash
gcc -Wall -Wextra -g -fsanitize=address greet.c -o greet
./greet a-very-long-name-that-exceeds-sixteen
```

```text
==21503==ERROR: AddressSanitizer: stack-buffer-overflow on address 0x7ffd...
WRITE of size 38 at 0x7ffd... thread T0
    #0 ... in main greet.c:7
Address ... is located in stack of thread T0 at offset 32 in frame
    #0 ... in main greet.c:5
  This frame has 1 object(s):
    [32, 48) 'buf' <== Memory access at offset 32 overflows this variable
```

`WRITE of size 38` 对着 16 字节的 `buf`——现场清楚了。本篇的任务：这些代码当初怎么不写出来。

## 2. 危险函数地图：谁危险，换成谁

### 2.1 五个惯犯与安全替代

| 危险函数 | 问题 | 安全替代 |
| --- | --- | --- |
| `gets(s)` | 无法限制长度，任何输入都能溢出 | 已从 C11 标准删除，用 `fgets` |
| `strcpy(dst, src)` | 不检查 dst 大小 | `snprintf(dst, n, "%s", src)` |
| `strcat(dst, src)` | 不检查 dst 剩余空间 | `snprintf(dst, n, "%s%s", dst, src)` |
| `sprintf(buf, fmt, ...)` | 无边界 | `snprintf(buf, n, fmt, ...)` |
| `scanf("%s", buf)` | `%s` 不限宽 | `scanf("%15s", buf)`：最多 15 字符加 `\0` |

`gets` 是 C 标准史上唯一被整个删除的库函数——连「留着但别用」都不肯，因为任何长度限制都加不上去。`strcpy(buf, argv[1])` 这行代码，编译器开着 `-Wall` 也只会给一条弱提示：它看起来太无害了。

### 2.2 strncpy：带边界的坑

`strncpy` 是 C89 给出的「带边界版本」，行为却很拧巴：

- 源串长度小于 `n`：拷完整个源串，**并用 `\0` 填满剩余位置直到 n 字节**；
- 源串长度大于等于 `n`：拷前 `n` 字节，**不写 `\0`**。

```c
/* trunc.c：strncpy 的两种结局 */
#include <stdio.h>
#include <string.h>

int main(void) {
    char buf[8];

    strncpy(buf, "short", sizeof(buf));
    printf("A: [%s]\n", buf);          /* 有 \0，正常打印 */

    strncpy(buf, "a-much-longer-string", sizeof(buf));
    printf("B: [");
    for (size_t i = 0; i < sizeof(buf); i++) {
        if (buf[i] == '\0') printf("\\0");
        else putchar(buf[i]);
    }
    printf("]\n");                     /* 8 字节全是字符：没有 \0 */
    return 0;
}
```

```bash
gcc -Wall -Wextra trunc.c -o trunc && ./trunc
```

```text
A: [short]
B: [a-much-]
```

B 情况下 `buf` 不是合法 C 字符串。随后的 `strlen(buf)`、`printf("%s", buf)` 都会越过边界继续读，读到哪里算哪里——这是越界**读**，ASan 报 stack-buffer-overflow（READ），真实程序里泄漏相邻内存的数据。

修法有两种：

```c
strncpy(buf, src, sizeof(buf) - 1);
buf[sizeof(buf) - 1] = '\0';           /* 手动补，容易忘 */

snprintf(buf, sizeof(buf), "%s", src); /* 推荐：永远补 \0，见第 3 节 */
```

### 2.3 fgets 的配套细节

`fgets` 是安全读取的正解，但有两个配套动作（完整用法在 430 篇）：换行符会保留在结果里，需要手动去掉；返回 `NULL` 表示读到末尾或出错，必须检查。

```c
char buf[64];
if (fgets(buf, sizeof(buf), stdin) != NULL) {
    buf[strcspn(buf, "\n")] = '\0';    /* 一行去掉换行符 */
}
```

## 3. snprintf 正解：截断语义与返回值

`snprintf(buf, n, ...)` 的行为对学习者极友好：最多写 `n - 1` 个字符加 `\0`，**永远保证终止符**。它还有一个被大量误用的返回值：

- 返回值是「**假设缓冲区无限大时会写多少字符**」，不是实际写入数；
- 返回值非负且**小于 n**：完整写入；
- 返回值**大于等于 n**：发生了截断，实际只写了 `n - 1` 个字符。

```c
char buf[8];
int n = snprintf(buf, sizeof(buf), "%s", "a-very-long-string");
/* n == 19：本想写 19 个字符；buf 里只有 7 个字符 + '\0' */
if (n < 0 || (size_t)n >= sizeof(buf)) {
    /* 截断发生：按业务决定报错、重试或接受 */
}
```

误用现场：把 `n` 当实际写入长度去推进 `buf + n`，下一步就写出界。

两遍 `vsnprintf` 是动态拼接的标准姿势（不安全版的 `sprintf` 没有等价物）：

```c
/* asprintf.c：先量长度，再分配，再写入 */
#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include <string.h>

int xasprintf(char **out, const char *fmt, ...) {
    va_list ap, ap_copy;
    va_start(ap, fmt);
    va_copy(ap_copy, ap);
    int need = vsnprintf(NULL, 0, fmt, ap_copy);   /* 第一遍：只量长度 */
    va_end(ap_copy);
    if (need < 0) { va_end(ap); return -1; }

    char *buf = malloc((size_t)need + 1);
    if (buf == NULL) { va_end(ap); return -1; }
    vsnprintf(buf, (size_t)need + 1, fmt, ap);     /* 第二遍：写入 */
    va_end(ap);
    *out = buf;
    return 0;
}

int main(void) {
    char *s = NULL;
    if (xasprintf(&s, "name=%s age=%d", "Alice", 30) == 0) {
        printf("%s\n", s);
        free(s);
    }
    return 0;
}
```

`vsnprintf(NULL, 0, ...)` 合法且只做测量。这套「量两次」模式配合 `va_copy`（用法见 [可变参数函数](/c/100-VarargsFunction)），是 C 里字符串拼接既安全又准确的方案。

## 4. 边界的谎言：函数拿不到缓冲区大小

把危险函数换成安全版本有一个共同前提：**你得知道目标缓冲区多大**。而 C 里有一个反复出现的悲剧：

```c
/* bad_sizeof.c */
#include <stdio.h>
#include <string.h>

void copy_name(char *buf, const char *src) {
    snprintf(buf, sizeof(buf), "%s", src);   /* 编译通过，运行不可靠 */
}

int main(void) {
    char name[64];
    copy_name(name, "Alice");
    printf("%s\n", name);                    /* 只拷了 8 字节：sizeof(char*)==8 */
    return 0;
}
```

`buf` 在函数参数里是 `char *`，`sizeof(buf)` 等于指针大小（64 位平台是 8），不是调用方那 64 字节的数组。数组传参即退化（[指针与数组](/c/150-PointerArrayDifference) 的退化规则），函数内部**从指针拿不到缓冲区大小**——这个信息在编译时就被丢掉了。

工程结论只有一条：缓冲区大小必须作为参数显式传递，并且命名上分清两个量——

- **长度（length）**：字符串里的字符数，不含 `\0`；
- **容量（capacity / size）**：缓冲区总字节数，含 `\0` 的位置。

存 `length` 的字符串需要 `length + 1` 字节容量。混用这两个数的 off-by-one 是溢出类漏洞的常青树：`malloc(len)` 却 `memcpy(dst, src, len + 1)`，多写的那一字节长期悄悄破坏堆。

## 5. 整数陷阱：负数变大数与回绕

边界检查的参数本身也可能先坏掉。两类经典：

**一类：有符号负数转 `size_t` 变巨数。**

```c
int32_t raw_len = read_int32();   /* 从文件/网络读来的长度字段，可能是负数 */
size_t len = (size_t)raw_len;     /* raw_len == -1 时 len == SIZE_MAX */
malloc(len);                      /* 失败还好；若先 read_full(buf, len) 就炸了 */
```

防御在转换之前：先验非负，再验上限，最后才转。

```c
if (raw_len < 0 || (uint32_t)raw_len > MAX_LEN) return -1;
size_t len = (size_t)raw_len;
```

**二类：长度计算回绕。**

```c
size_t n = a + b + 1;      /* a、b 各 4GB 边缘：加法回绕成小值 */
char *buf = malloc(n);     /* 分到小缓冲 */
memcpy(buf, src, real_n);  /* 按真实大小拷：堆溢出 */
```

防御是先判回绕再相加：

```c
if (a > SIZE_MAX - b - 1) return -1;   /* a + b + 1 会回绕 */
size_t n = a + b + 1;
```

C23 起可以直接用 `<stdckdint.h>` 的 `ckd_add(&n, a, b)`：溢出返回 `true` 并把回绕值写入 `n`（GCC 14+、glibc 2.39+，见 [C23 深水区](/c/530-C23NewFeatures)）。Android Stagefright（2015，一条 MMS 视频即可远程执行代码）的根因正是 32 位尺寸乘法回绕；Heartbleed 则是「长度字段与实际数据量不比对」。把「外部来的每个长度都先验范围」内化成条件反射，这两类漏洞就与你无缘。

## 6. Annex K 的真相：_s 函数的生态位

看到这里你可能想问：标准里不是有 `strcpy_s` 这些安全函数吗？

C11 的 Annex K「边界检查接口」定义了 `strcpy_s(dst, dstsz, src)`、`strncpy_s`、`memcpy_s` 等函数：都带目标容量参数，失败时调用约束处理函数（默认 `abort`），引入 `rsize_t` 与上限 `RSIZE_MAX` 拦截「巨数」参数。用之前要 `#define __STDC_WANT_LIB_EXT1__ 1` 再包含头文件，且实现方须定义 `__STDC_LIB_EXT1__` 表示支持。

问题在于生态：**Annex K 是可选附录，主流 C 库几乎全部拒绝实现**。glibc、musl、FreeBSD、macOS 的 libc 都没有这些函数；只有 Windows 的 MSVC CRT 完整提供（配合 `_CRT_SECURE_NO_WARNINGS` 的历史故事）。在 Linux 上用 `strcpy_s`，程序根本编译不过。

| 函数 | 补 `\0` | 越界行为 | 可移植性 |
| --- | --- | --- | --- |
| `strcpy` / `sprintf` | 是 | 无检查，直接溢出 | 全平台，禁用 |
| `strncpy` | 源短是，源长否 | 截断但留陷阱 | 全平台，慎用 |
| `strlcpy` / `strlcat` | 是 | 截断并保证终止 | OpenBSD 1998 年提出，BSD/macOS 常见，glibc 2.38（2023）才收入 |
| `strcpy_s` 系（Annex K） | 是（成功时） | 调约束处理函数，默认 abort | 仅 MSVC 等少数实现 |
| `snprintf` | 是 | 截断，返回值可判 | **全平台，默认之选** |

工程结论：跨平台代码的安全字符串操作以 `snprintf` 与自写的小封装为主；`strlcpy` 可用但要知道 glibc 收编很晚；`*_s` 家族只在确认目标平台提供时使用（Windows 项目常见）。检查参数的 `_s` 函数防的是「这次调用越界」，防不了「设计上长度就没管好」——第 4、5 节的设计纪律才是根。

## 7. 编译期与运行期防线

代码层之上还有两道闸，都能在事故到达生产之前拦下溢出：

**编译器警告与加固选项**（GCC/Clang）：

```bash
# 基础纪律：警告全开
gcc -Wall -Wextra -Wpedantic ...

# 溢出专项：格式串截断、字符串操作越界（需优化开启才生效）
gcc -O2 -D_FORTIFY_SOURCE=2 -Wformat-truncation -Wstringop-overflow ...

# 栈保护：缓冲区被溢出时破坏 canary 触发中止（机制见函数调用栈帧篇）
gcc -fstack-protector-strong ...
```

`_FORTIFY_SOURCE` 让 glibc 在编译期把可判断的 `strcpy(buf, "constant-too-long")` 直接判为错误，运行期换成带检查的 `__strcpy_chk` 版本——它强化的是标准函数，不要求改代码。

**运行期检测**（测试环境专用，性能开销大）：ASan 抓越界与 use-after-free、UBSan 抓带符号溢出与越界，CI 里全量测试跑一遍（第 1 节的现场就是这么抓的）；fuzzing（如 libFuzzer 用随机输入喂解析函数）专治「长度字段没人验」类逻辑洞。工具箱的全貌在 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers)。

**输入验证习惯**（不限于字符串）：外部来的长度先验「非负 + 上限」；数组索引先验 `0 <= i < n`；消息格式里带长度前缀时，长度与实际收到的字节数必须比对——Heartbleed 缺的就是最后这一比。

## 8. 实际项目中的使用场景

- 日志/路径/协议解析这类「外部输入进入固定缓冲」的代码，是 `snprintf` 与显式长度参数的重灾区，也是 code review 的重点看位；
- 安全审计（CERT C、MISRA C 等编码规范）几乎第一条都是「禁用无边界字符串函数」；多数商业与开源静态分析工具内置了这些检查项，工具选型见 490 篇；
- 嵌入式与安全关键领域（cross-link [嵌入式 C 编程](/c/550-EmbeddedCProgramming)）常直接禁用整个动态分配与大部分字符串库，边界纪律更加刚性。

## 9. 小练习

预测题（5 分钟）：下面代码 `src` 是什么内容时，`buf` 里的结果不是合法 C 字符串？

```c
char buf[8];
strncpy(buf, src, sizeof(buf));
```

参考答案（先写再看）：`strlen(src) >= 8` 的任何 `src`——此时 `strncpy` 拷满 8 字节、不写 `\0`。`strlen(src) < 8` 时反而会把剩余位置全部填 `\0`。这正是「strncpy 的边界是陷阱不是保护」的原因。

修改题（10 分钟）：把下面函数修安全，并说出两处问题：

```c
void log_msg(const char *user, const char *msg) {
    char buf[256];
    strcpy(buf, user);
    strcat(buf, ": ");
    strcat(buf, msg);
    printf("%s\n", buf);
}
```

参考答案：`strcpy`/`strcat` 均无边界（一处），用户或消息过长即溢出；修法一行：`snprintf(buf, sizeof(buf), "%s: %s", user, msg)`。另一处是风格问题——连续 `strcat` 每次都从头数长度，O(n 平方)；`snprintf` 一次成形。

挑战题（半小时，不看答案先动手）：实现 `size_t my_strlcpy(char *dst, const char *src, size_t dst_size)`：拷贝 `src` 到 `dst`，`dst_size` 为 0 时不动 `dst`，否则永远保证 `\0` 结尾；返回值是 `strlen(src)`（不是拷了多少），调用方据此判断截断。提示两级如下。

提示（思路方向）：特判 `dst_size == 0`；循环边界是 `dst_size - 1`；返回值与拷贝数是两个独立的量。

展开（关键参考）：BSD 手册页 man7.org 可查 strlcpy(3bsd) 的精确语义；写完用 `src` 长度小于、等于、大于 `dst_size` 三组用例自测，再与 `glibc 2.38+` 的 `strlcpy` 对照。

## 10. 与之前和之后的知识的关系

- 往前：[数组](/c/120-ArrayDetailed) 的越界与 [指针](/c/140-PointerDeep) 的解引用规则是本篇所有事故的语法根源；[文件 I/O](/c/430-StdioFileIO) 的 `fgets` 是安全读入的第一道门；
- 旁支：事故现场解读在 [内存深水区](/c/210-ProcessMemoryLayoutAndErrors)；整数本身的回绕规则在 [数据类型](/c/040-DataTypeDetailed)；`size_t` 与整型转换的完整阶梯在 [运算符与表达式](/c/060-OperatorExpression)；
- 往后：系统调用层的读写同样要循环处理部分读写，见 [文件系统操作](/c/400-FileSystemOperation) 与 [Socket 网络编程](/c/390-SocketNetworkProgramming) 的 `recv_n`；工具箱（cppcheck、clang-tidy、fuzzing）在 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers)。

## 11. 官方文档

- cppreference C 输入输出（snprintf 截断语义）：https://en.cppreference.com/w/c/io
- cppreference C 字符串（strncpy 行为）：https://en.cppreference.com/w/c/string/byte
- GCC Instrumentation Options（_FORTIFY_SOURCE / -fstack-protector）：https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html
- AddressSanitizer 官方 wiki：https://github.com/google/sanitizers/wiki/AddressSanitizer
- MITRE CWE 弱点分类（CWE-120 系缓冲区溢出条目）：https://cwe.mitre.org/

## 12. 自我检查

- 能背出危险函数地图五行的「危险函数与替代」，并解释 `gets` 为何被整条删除；
- 能写出 strncpy 源串过长时不补 `\0` 的复现实验，并说出两种修法；
- 能向同事讲清「函数内部为什么拿不到缓冲区大小」以及 `sizeof(指针)` 误用的后果；
- 能说出 Annex K 的生态现状（MSVC 有、glibc/musl 拒绝）并据此给出跨平台选型：默认 `snprintf`。

## 本章总结

溢出的根源是「写入者不知道边界」。`gets`/`strcpy`/`sprintf`/`scanf("%s")` 家族连问都不问就写，已被列为禁用；`strncpy` 问了却答得拧巴——源串过长时不补 `\0`，把越界写换成了越界读。默认之选是 `snprintf`：永远终止、截断可判（返回值大于等于容量即截断），配合「先量后写」的 `vsnprintf` 两遍法完成动态拼接。比换函数更根本的是两条纪律：容量必须作为参数显式传递（指针在函数里退化，`sizeof` 只是 8）；外部来的长度先验非负与上限再转 `size_t`。Annex K 的 `_s` 函数只活在 Windows CRT，跨平台方案以 `snprintf` 与小封装为主。最后，编译期 `_FORTIFY_SOURCE`、`-fstack-protector` 与测试期 ASan/fuzzing 组成第二、第三道防线。

## 下一步

进入 [国际化与本地化](/c/460-I18nAndL10n)：字符串安全处理完，下一关是多语言——为什么 `strlen("中文")` 是 6、`wchar_t` 在两个平台上大小不同，以及 gettext 翻译流程。
