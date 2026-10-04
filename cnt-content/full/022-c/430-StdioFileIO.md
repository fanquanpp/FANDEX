---
order: 450
title: 文件 I/O：fopen 到 fclose 的完整闭环
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 从「程序退出后数据去哪了」出发建立流的心智模型：七种 fopen 模式与判 NULL、字符/行/格式化/块四大读写家族、feof 多读一次的调试实录、缓冲与 fclose 的落盘实验，以仿 wc 的统计器把全篇串成一条线。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'c/060-OperatorExpression'
  - 'c/400-FileSystemOperation'
  - 'c/420-CPosixSystemCall'
  - 'c/440-CStandardLibrary'
  - 'c/450-SafeFunctionBoundsCheck'
prerequisites:
  - 'c/090-FunctionDetailed'
  - 'c/120-ArrayDetailed'
---

## 前置知识

- 已完成 [函数详解](/c/090-FunctionDetailed)：会定义函数、传参数、看懂返回值——本篇每个库函数都靠返回值汇报成败，不查返回值等于不听汇报；
- 已完成 [数组详解](/c/120-ArrayDetailed)：会开 `char` 缓冲区、知道数组与指针的关系——`fgets` 与 `fread` 都往数组里放东西，放多少由你说了算。

> 分工说明：C 模块的文件主题分三层。本篇讲标准库 stdio 的高层流——`FILE*`、缓冲、fopen 到 fclose 的闭环，日常首选；[POSIX 系统调用](/c/420-CPosixSystemCall) 讲 open/read/write 的底层文件描述符一套；目录遍历、权限、文件属性等更大的文件系统主题在 [文件系统操作](/c/400-FileSystemOperation)。

## 学习目标

读完本文你将能够：

1. 建立「流」的心智模型：说出 `FILE*` 是什么、三个标准流各自去向、文本流与二进制流的差别；
2. 查表选对七种 fopen 模式（含 C11 的 x 独占创建），失败判 NULL 并用 perror 或 strerror 报出原因；
3. 按数据形态选对读写家族（字符/行/格式化/块），并对每一次读写的返回值负责；
4. 解释 `while (!feof(fp))` 为什么多读一次，写出两种正确的读循环；
5. 说清缓冲与落盘的关系，完成一个把统计结果写进文件的完整小项目。

预计 60 到 80 分钟，含 3 组动手实验与 1 个贯穿小项目。

## 1. 问题引入：程序退出后，数据去哪了

```c
/* gone.c */
#include <stdio.h>

int main(void) {
    long lines = 1024;          /* 假设刚统计完一本书的行数 */
    printf("lines = %ld\n", lines);
    return 0;                   /* 进程一退，lines 连同整块内存一起蒸发 */
}
```

变量住在内存里，进程退出时内存整体回收——`lines` 的 1024 从此无处可寻。打印到屏幕也没用：那串字符随终端会话一起消失。想让数据活得比程序久，只有一个办法：在退出前写进**文件**。本篇就做这一件事——把数据从程序安全送到磁盘，再安全取回来。

## 2. 流的心智模型：FILE 与三个常驻流

### 2.1 FILE*：不透明指针，拿去用就好

C 标准库把「一个打开的文件」抽象成**流**（stream），流由 `FILE` 类型的结构体描述，里面装着缓冲区、当前读写位置（文件位置指示器）、出错标志与文件结束标志——具体长什么样由各家实现自己定。你的代码从头到尾只持有 `FILE *` 这种指针，把它转交给库函数，永远不需要解引用它。这个设计换来一件事：同一份读写代码，Windows 与 Linux 都能跑。

### 2.2 stdin、stdout、stderr：程序一启动就有

每个程序启动时自动挂好三条流：

| 流 | 去向 | 用途 |
| --- | --- | --- |
| stdin | 键盘 | 标准输入 |
| stdout | 屏幕 | 正常输出 |
| stderr | 屏幕 | 错误信息 |

`printf("hi\n")` 就是 `fprintf(stdout, "hi\n")` 的简写。错误单独走 stderr 有两个理由：重定向 stdout 到文件时错误仍留在屏幕上；stderr 通常不缓冲，出错信息即刻可见。第 3 节的 `perror` 就打印到 stderr。

### 2.3 文本流与二进制流：换行差异实验

fopen 的模式串里带 `b` 就是二进制流，不带就是文本流。差别只有一处但很要命：**文本流做换行翻译**——Windows 上写出时 `\n` 变成 `\r\n` 两个字节，读入时再变回来；Unix 上两者完全一样。

```c
/* newline.c：同一个字符串，两种模式 */
#include <stdio.h>

int main(void) {
    FILE *t = fopen("t.txt", "w");
    FILE *b = fopen("b.bin", "wb");
    if (t == NULL || b == NULL) { perror("fopen"); return 1; }
    fputs("a\nb\n", t);
    fputs("a\nb\n", b);
    fclose(t);
    fclose(b);
    return 0;
}
```

实验结论（Windows 上 `ls -l` 或资源管理器看大小）：`t.txt` 是 6 字节（两个 `\n` 各变 `\r\n`），`b.bin` 是 4 字节；Unix 上两者都是 4。规则一句话：**读写二进制数据（图片、结构体、序列化记录）必须带 b**，否则遇到 `0x0A` 之类的字节会被换行翻译毁掉。

## 3. fopen：选对模式，判住失败

### 3.1 七种基本模式

| 模式 | 文件须已存在 | 原内容 | 初始位置 | 典型用途 |
| --- | --- | --- | --- | --- |
| `"r"` | 是 | 保留 | 开头读 | 读现有文件 |
| `"w"` | 否，自动创建 | 清空 | 开头写 | 生成报告、覆盖输出 |
| `"a"` | 否，自动创建 | 保留 | 每次写都到末尾 | 日志追加 |
| `"r+"` | 是 | 保留 | 开头（读） | 原地修改记录 |
| `"w+"` | 否，自动创建 | 清空 | 开头 | 可读可写的草稿 |
| `"a+"` | 否，自动创建 | 保留 | 读从头，写永远到末尾 | 边读边追加 |

三条来自标准文档的细则：

- `b` 可以叠加在任意一个后面（`"rb"`、`"wb+"` 等），只影响换行翻译，不改变上表语义；
- 追加模式（`a` 与 `a+`）的写操作**永远落到文件末尾**，与当前位置无关；`a+` 的读仍从开头开始；
- 更新模式（带 `+`）读写切换有纪律：写之后想读、读之后想写，中间必须隔一次 `fflush`、`fseek`、`fsetpos` 或 `rewind`（读到文件尾除外），否则行为未定义。

C11 还给 `w` 与 `w+` 加了独占标志 `x`（如 `"wx"`）：文件已存在则 fopen 直接失败，而不是清空覆盖——防止并发或误操作吃掉别人的文件。

### 3.2 失败判 NULL：perror 与 strerror

fopen 失败时返回**空指针**（POSIX 环境还会设置 errno 说明原因）。判住它，并把原因说出来：

```c
/* tryopen.c */
#include <errno.h>
#include <stdio.h>
#include <string.h>

int main(void) {
    FILE *fp = fopen("no_such_dir/data.txt", "r");
    if (fp == NULL) {
        perror("fopen");          /* fopen: No such file or directory */
        fprintf(stderr, "strerror: %s\n", strerror(errno));
        return 1;
    }
    fclose(fp);
    return 0;
}
```

预期输出：

```text
fopen: No such file or directory
strerror: No such file or directory
```

`perror(s)` 打印「你给的前缀 + 冒号 + 当前 errno 对应的系统描述」到 stderr；`strerror(errno)` 返回同一句描述的字符串，方便拼进自己的日志。习惯与动态内存同款：**fopen 的下一行就是判 NULL**（[运算符与表达式](/c/060-OperatorExpression) 里「分配即判 NULL」的纪律在文件世界的翻版）。

## 4. 读写家族：按数据形态选函数

### 4.1 字符：fgetc 与 fputc

```c
/* charcopy.c：逐字符复制 */
#include <stdio.h>

int main(void) {
    FILE *src = fopen("t.txt", "r");
    FILE *dst = fopen("copy.txt", "w");
    if (src == NULL || dst == NULL) { perror("fopen"); return 1; }
    int ch;                       /* 必须是 int，原因见下 */
    long count = 0;
    while ((ch = fgetc(src)) != EOF) {
        fputc(ch, dst);
        count++;
    }
    printf("copied %ld chars\n", count);
    fclose(src);
    fclose(dst);
    return 0;
}
```

预期输出（t.txt 来自 2.3 节，Unix 上）：

```text
copied 4 chars
```

接收变量必须是 `int`：`fgetc` 要用同一个返回值表达「读到一个字符」和「读完了」两种结局，EOF 是负数常量。若用 `char` 接，在 char 为无符号的平台上 EOF 永远配不上对，死循环当场发生——这正是 [运算符与表达式](/c/060-OperatorExpression) 第 2 节整型提升规则的实战版。

### 4.2 行：fgets 与 fputs（换行保留与截断）

`fgets(buf, size, fp)` 一次读一行：最多读 `size - 1` 个字符、必补 `'\0'`；行内的换行符**读到了就保留在串里**；一行太长只读前段，余下的留给下一次。成功返回 buf，失败或到文件尾返回 NULL。`fputs(s, fp)` 写字符串但不自动补换行。

```c
/* lines.c：故意用小缓冲区观察截断 */
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("lines.txt", "w");
    if (fp == NULL) { perror("fopen"); return 1; }
    fputs("first\nsecond\nthird\n", fp);
    fclose(fp);

    fp = fopen("lines.txt", "r");
    if (fp == NULL) { perror("fopen"); return 1; }
    char buf[6];                  /* 只装得下 5 个字符 + '\0' */
    while (fgets(buf, sizeof buf, fp) != NULL) {
        printf("[%s]", buf);
    }
    fclose(fp);
    return 0;
}
```

预期输出：

```text
[first][secon][d
][thir][d
]
```

`second` 被切成 `secon` 与 `d\n` 两次读到。判断「这行被截断了」的写法：本次读满（`strlen(buf) == sizeof buf - 1`）且末尾不是 `'\n'`。生产代码里要么把缓冲区开够，要么老老实实处理截断续读；已被 C11 删除的 `gets` 永远不要用，它连截断保护都没有（边界安全见 [安全函数与边界检查](/c/450-SafeFunctionBoundsCheck)）。

### 4.3 格式化：fprintf 与 fscanf（返回值必须检查）

`fprintf` 与 printf 同参，返回**成功写入的字符数**，负数即失败；`fscanf` 返回**成功赋值的项数**，一个都没配上返回 0，读到文件尾返回 EOF。不检查返回值的下场：磁盘上的数据缺了一项，程序拿上一次的旧值继续算，错得悄无声息。

```c
/* fmt.c：写入三项，读回时检查返回值 */
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("stats.txt", "w");
    if (fp == NULL) { perror("fopen"); return 1; }
    if (fprintf(fp, "lines %d\nwords %d\nbytes %ld\n", 3, 12, 48L) < 0) perror("fprintf");
    fclose(fp);

    fp = fopen("stats.txt", "r");
    if (fp == NULL) { perror("fopen"); return 1; }
    int lines, words;
    long bytes;
    int got = fscanf(fp, "lines %d words %d bytes %ld", &lines, &words, &bytes);
    if (got != 3) fprintf(stderr, "stats.txt damaged: got %d of 3\n", got);
    else printf("lines=%d words=%d bytes=%ld\n", lines, words, bytes);
    fclose(fp);
    return 0;
}
```

预期输出：

```text
lines=3 words=12 bytes=48
```

fscanf 格式串里的空格能吃掉任意空白，所以写和读不必逐字节对齐；判 `got != 3` 就是给文件格式上了保险。

### 4.4 块：fread 与 fwrite（结构体序列化的可移植性）

`fwrite(ptr, size, count, fp)` 把 count 个 size 字节的块倒进文件，返回成功写入的**项数**；`fread` 同理返回读到的项数，返回值少于 count 就是出错或到尾——fread 不区分这两种情况，事后用 feof 与 ferror 分辨。

```c
/* block.c：结构体整体落盘再读回 */
#include <stdint.h>
#include <stdio.h>

typedef struct {
    int32_t id;
    int32_t score;
} Record;

int main(void) {
    Record out = {7, 95};
    FILE *fp = fopen("rec.bin", "wb");
    if (fp == NULL) { perror("fopen"); return 1; }
    fwrite(&out, sizeof out, 1, fp);       /* 返回值应核对为 1 */
    fclose(fp);

    Record in;
    fp = fopen("rec.bin", "rb");
    if (fp == NULL) { perror("fopen"); return 1; }
    if (fread(&in, sizeof in, 1, fp) != 1) {
        fprintf(stderr, "fread incomplete\n");
    } else {
        printf("id=%d score=%d\n", in.id, in.score);
    }
    fclose(fp);
    return 0;
}
```

预期输出：

```text
id=7 score=95
```

把结构体原样倒进文件方便，但有三个可移植性雷区：填充字节（结构体内部的对齐空隙，见 [内存对齐](/c/220-MemoryAlignmentDeepDive)）、字节序（大端与小端机器读同一文件结果不同）、类型宽度（`long` 在 Windows 与 Linux 上宽度不同）。工程做法：用 `<stdint.h>` 的定宽类型定义记录格式，跨机器交换时逐字段显式序列化，不要整块 fwrite。

### 4.5 定位与量大小：ftell、fseek、rewind

每个流有一根文件位置指示器，三件工具搬动它：`fseek(fp, offset, origin)` 定位（origin 取 `SEEK_SET` 开头、`SEEK_CUR` 当前、`SEEK_END` 末尾，成功返回 0）；`ftell(fp)` 报告当前字节位置；`rewind(fp)` 回开头并顺手清掉错误标志。常用组合是量文件大小：

```c
    fseek(fp, 0, SEEK_END);       /* 移到末尾 */
    long size = ftell(fp);        /* 末尾的位置就是总字节数 */
    rewind(fp);                   /* 回开头，接着从头读 */
```

对 4.4 节的 rec.bin，这段打出的 size 是 8（两个 int32_t）。

## 5. 常见错误与调试实录：feof 多读一次

教科书级 bug：把 `feof` 当循环条件。

```c
/* feofbug.c */
#include <stdio.h>

int main(void) {
    FILE *fp = fopen("lines.txt", "r");
    if (fp == NULL) { perror("fopen"); return 1; }
    char buf[64];
    int n = 0;
    while (!feof(fp)) {                    /* 错误写法 */
        if (fgets(buf, sizeof buf, fp) != NULL) n++;
        printf("line %d: %s", n, buf);
    }
    fclose(fp);
    return 0;
}
```

预期输出（lines.txt 内容为 first、second、third 三行，注意第三行出现两次）：

```text
line 1: first
line 2: second
line 3: third
line 3: third
```

破案依据是 cppreference feof 页的关键说明：**feof 只报告最近一次 I/O 操作之后的流状态，不检查数据源本身**，它只在某次读取**试图越过文件尾**之后才为真。于是时间线是：第三次 fgets 读到 `third`，feof 仍为假；第四次循环照常进入，fgets 越过尾部返回 NULL，buf 里躺着的还是上次的 `third`，printf 原样再打一遍；这次读取才让 feof 变真，循环退出。

正确写法是把判断权交给读函数的返回值，feof 退居循环之后做「死因鉴定」：

```c
    /* 行版 */
    while (fgets(buf, sizeof buf, fp) != NULL) {
        printf("%s", buf);
    }
    /* 字符版 */
    int ch;
    while ((ch = fgetc(fp)) != EOF) {
        putchar(ch);
    }
    if (ferror(fp)) perror("read");   /* 循环后：出错与读完就此分清 */
```

## 6. fclose 与缓冲：数据什么时候真正落盘

`fprintf` 写的字节并不直接进磁盘，先住进 stdio 的用户态缓冲区——攒一批再交给内核，这是 stdio 快的原因。那缓冲区什么时候真正落盘？做实验：

```c
/* flushbug.c */
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char **argv) {
    FILE *fp = fopen("will.txt", "w");
    if (fp == NULL) { perror("fopen"); return 1; }
    fprintf(fp, "saved checkpoint\n");
    if (argc > 1) {
        abort();                 /* 模拟崩溃：缓冲区不冲刷 */
    }
    fclose(fp);                  /* 正常路径：把缓冲交给内核 */
    return 0;
}
```

```bash
gcc -Wall -Wextra -g flushbug.c -o flushbug
./flushbug && ls -l will.txt
./flushbug crash; ls -l will.txt
```

实验结论：正常路径 will.txt 有 18 字节；带参数崩溃的那次 will.txt 是 **0 字节**——数据在缓冲区里随进程一起没了。三条规则：

1. `fclose(fp)` 不只是礼貌动作，它冲刷缓冲区并释放流；正常退出（main 返回或 exit）也会自动冲刷所有打开的流，但**崩溃与 abort 不会**；
2. 要「立刻见到」就手动 `fflush(fp)`：重要节点落盘、更新模式里写转读的切换（3.1 节）；
3. `setvbuf(fp, buf, mode, size)` 可自选缓冲模式（`_IOFBF` 全缓冲、`_IOLBF` 行缓冲、`_IONBF` 不缓冲），日志与进度输出想要实时时有用——知道即可，默认已经很好。

忘 fclose 的两个后果正由此而来：缓冲未冲刷（崩溃丢数据）、流未释放（长跑进程反复 fopen 会撞上打开文件数上限）。

## 7. 贯穿小项目：wcstat 行数统计器

现在把全篇串成一条线：fopen 读文件，fgetc 逐字符统计行数、单词数、字节数，fprintf 把结果写进 stats.txt。单词边界用 0 和 1 两个状态标记（用到的正是 [运算符与表达式](/c/060-OperatorExpression) 第 3 节的关系与逻辑运算符）：

```c
/* wcstat.c */
#include <stdio.h>

int main(int argc, char **argv) {
    if (argc < 2) { fprintf(stderr, "usage: %s FILE\n", argv[0]); return 1; }
    FILE *in = fopen(argv[1], "r");
    if (in == NULL) { perror(argv[1]); return 1; }

    long lines = 0, words = 0, bytes = 0;
    int in_word = 0;              /* 0 = 在词外，1 = 在词内 */
    int ch;
    while ((ch = fgetc(in)) != EOF) {
        bytes++;
        if (ch == '\n') lines++;
        if (ch == ' ' || ch == '\t' || ch == '\n') {
            in_word = 0;          /* 空白：一个词结束 */
        } else if (in_word == 0) {
            in_word = 1;          /* 从词外进入词内：新词 */
            words++;
        }
    }
    if (ferror(in)) {             /* 循环结束后分清读完还是出错 */
        perror("fgetc");
        fclose(in);
        return 1;
    }
    fclose(in);

    FILE *out = fopen("stats.txt", "w");
    if (out == NULL) { perror("stats.txt"); return 1; }
    fprintf(out, "lines %ld\nwords %ld\nbytes %ld\n", lines, words, bytes);
    fclose(out);
    printf("%ld %ld %ld stats.txt\n", lines, words, bytes);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g wcstat.c -o wcstat
./wcstat wcstat.c
cat stats.txt
```

预期输出（数字随文件内容而定）：

```text
85 261 1966 stats.txt
lines 85
words 261
bytes 1966
```

四十行走完闭环：fopen 判 NULL、fgetc 循环、ferror 鉴定、fclose、fprintf 写结果、再 fclose。对照 `wc wcstat.c` 检查数字（文件末尾无换行符时行数差 1，正是「行以 \n 结尾」定义的体现）。修改实验：加 `-a` 参数用 `"a"` 模式把本次结果追加进 history.txt，运行两次验证旧内容完好。

## 8. 周边函数速查

| 函数 | 一句话 |
| --- | --- |
| `rename("old", "new")` | 重命名（可跨目录移动），成功返回 0 |
| `remove("file")` | 删除文件，成功返回 0 |
| `tmpfile()` | 打开匿名临时文件，fclose 时自动删除 |
| `ferror(fp)` | 最近一次读写是否出错 |
| `clearerr(fp)` | 清除出错与文件结束标志（处理后想继续用流时） |

这五个函数与 4.5 节的定位三件套覆盖了 stdio 文件族的全部周边；rename 与 remove 失败时同样用 3.2 节的 perror 查 errno。

## 9. 实际项目中的使用场景

- 日志：fopen 用 `"a"` 追加，重要节点后 fflush；崩溃安全要求高就周期性 fclose 重开；
- 配置读取：fgets 逐行 + sscanf 解析，逐行检查返回值，坏行跳过并记日志；
- 数据导入导出：fread/fwrite 批量搬运，跨机器交换时按 4.4 节的三条可移植性纪律；
- 资源纪律：任何 fopen 都有配对的 fclose，出错路径提前 return 之前先收尾（第 7 节 wcstat 的 ferror 分支是模板）。

## 10. 小练习

预测题（5 分钟）：先写答案再运行——以 `"a+"` 模式打开一个已有内容 `AB` 的文件后立刻 `fputs("C", fp)`，再 `fgetc(fp)` 读到的是什么？为什么？

参考答案（先写再看）：fputs 写到末尾（追加语义与位置无关），得 `ABC`；随后 fgetc 从**开头**读（`a+` 的读位置初始在头部），读到 `A`。

修改题（15 分钟）：让 wcstat 支持无参数时从 stdin 读：`argc < 2` 时令 `in = stdin`、跳过 fopen 与 fclose，其余不变。验收：`cat wcstat.c | ./wcstat` 与 `./wcstat wcstat.c` 结果一致。

挑战题（半小时，不看答案先动手）：把 4.4 节的 Record 扩成含 `char name[16]` 的版本，写三条记录再用 fread 全部读回。验收：读回与写入一致；能说出换到 32 位 int 或大端机器上这个文件会怎样；能给出定宽类型 + 逐字段序列化的稳定方案。

## 11. 与之前和之后的知识的关系

- 往前：[函数详解](/c/090-FunctionDetailed) 的返回值纪律是本篇每一次库函数调用的检查依据；[数组详解](/c/120-ArrayDetailed) 的数组是 fgets/fread 的容器；[运算符与表达式](/c/060-OperatorExpression) 的整型提升解释了 `int ch` 接 fgetc、短路求值支撑判 NULL 惯用法；
- 分工：本篇的 stdio 流带缓冲、可移植、按字符/行/块组织，是应用代码的日常选择；POSIX 的 `open/read/write/close` 是无缓冲的文件描述符接口，配合元数据与目录权限操作，见 [POSIX 系统调用](/c/420-CPosixSystemCall)；目录遍历与文件属性等更大的文件系统主题见 [文件系统操作](/c/400-FileSystemOperation)；
- 往后：标准库还有字符串、时间、排序一整套通用工具在 [C 标准库](/c/440-CStandardLibrary)；缓冲区边界与更安全的替代函数在 [安全函数与边界检查](/c/450-SafeFunctionBoundsCheck)。

## 12. 官方文档

- fopen（七种模式、x 独占创建、更新模式切换纪律）：https://en.cppreference.com/w/c/io/fopen.html
- feof（为什么不能当循环条件，正确读循环示例）：https://en.cppreference.com/w/c/io/feof.html
- fread（返回项数语义与 feof/ferror 分工）：https://en.cppreference.com/w/c/io/fread.html
- perror 与 strerror（错误信息打印）：https://en.cppreference.com/w/c/io/perror.html

## 13. 自我检查

- 能背出七种 fopen 模式中 r/w/a 的三条行为差异，说出 `a+` 的读与写各从哪里开始；
- 能解释 `int ch = fgetc(fp)` 里的 int 为什么不能换成 char，并说出这与整型提升的关系；
- 能复述 feof 误用多读一次的完整机理，默写两种正确读循环；
- 能说出 abort 与正常退出对缓冲区的不同待遇，以及忘掉 fclose 的两个后果。

## 本章总结

文件 I/O 的全部内容可以压成一条闭环：fopen 选模式（r/w/a 与 + 的组合决定存在性、清空与位置，x 防覆盖，b 管换行翻译）并判 NULL；按数据形态选读写家族——字符用 fgetc/fputc 且必须 int 接 EOF，行用 fgets/fputs 并处理换行保留与截断，格式化用 fprintf/fscanf 且返回值上保险，块用 fread/fwrite 但记住结构体序列化的填充、字节序与宽度三雷区；feof 只在读取越过尾部之后为真，永远不能当循环条件；缓冲让数据迟到，fclose 与 fflush 才是落盘动作，崩溃不冲刷。wcstat 用四十行把这五步串成线，此后读任何 I/O 代码都按这张地图走。

## 下一步

进入 [C 标准库](/c/440-CStandardLibrary)：文件读写只是标准库的一角，下一篇把字符串处理、时间日期、排序查找这些天天要用的工具箱一次点清。
