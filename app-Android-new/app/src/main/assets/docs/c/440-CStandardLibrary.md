---
order: 440
title: C 标准库速查手册
module: 'c'
category: 计算机科学
difficulty: beginner
description: C 标准库常用头文件与函数速查：stdio、string、stdlib、math、ctype、time 的签名、返回值语义与典型陷阱，含完整示例。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'c/430-StdioFileIO'
  - 'c/420-CPosixSystemCall'
  - 'c/450-SafeFunctionBoundsCheck'
  - 'c/200-DynamicMemoryManagement'
prerequisites:
  - 'c/030-ProgramStructureBasicSyntax'
---

## 前置知识

- [程序结构与基本语法](/c/030-ProgramStructureBasicSyntax)：会写、会编译基础 C 程序
- 了解指针与数组的基本用法（字符串函数大量使用 `char *`）

## 学习目标

- 说出标准库核心头文件各自的职责，需要某个功能时知道去哪个头文件找
- 掌握四类返回值的通用语义：指针型（NULL 表失败）、流操作（EOF）、状态型（0/非 0）、尺寸型（size_t）
- 正确使用 printf/scanf 格式符，避免 %zu、%p、宽度限制等常见错误
- 用 strncpy/snprintf/strncat 写出边界安全的字符串代码，理解 strncpy 可能不补 '\0' 的陷阱
- 用 strtol 替代 atoi 做带错误检测的数值转换
- 会用 qsort 的比较函数约定（负/零/正）

## 标准库总览

C 标准库按功能拆成多个头文件。写代码时先想"要做什么"，再对应到头文件：

| 头文件      | 职责                     | 代表函数                          |
| :---------- | :----------------------- | :-------------------------------- |
| `<stdio.h>` | 输入输出、文件           | `printf` `scanf` `fopen` `fgets`  |
| `<string.h>`| 字符串与内存块操作       | `strlen` `strcpy` `strcmp` `memcpy` |
| `<stdlib.h>`| 内存分配、数值转换、排序 | `malloc` `strtol` `qsort` `exit`  |
| `<math.h>`  | 数学函数                 | `sqrt` `pow` `floor` `fabs`       |
| `<ctype.h>` | 字符分类与大小写转换     | `isdigit` `isalpha` `tolower`     |
| `<time.h>`  | 时间与日期               | `time` `clock` `strftime`         |
| `<errno.h>` | 错误码                   | `errno` `EDOM` `ERANGE`           |
| `<assert.h>`| 断言（调试期检查）       | `assert`                          |
| `<stddef.h>`| 通用定义                 | `size_t` `NULL` `offsetof`        |
| `<stdint.h>`| 定宽整数类型             | `int32_t` `uint64_t` `SIZE_MAX`   |

## 返回值语义的通用规律

标准库函数的返回值分四类，记熟规律后遇到新函数也能猜对：

| 返回类型   | 成功              | 失败               | 代表                              |
| :--------- | :---------------- | :----------------- | :-------------------------------- |
| 指针       | 有效地址          | `NULL`             | `fopen` `malloc` `strchr`(找不到) |
| `int`（流）| 读到的字符/项数   | `EOF` 或负值       | `fgetc` `printf` `scanf`          |
| `int`（状态）| 0               | 非 0（常为 -1）    | `fclose` `remove` `rename`        |
| `size_t`   | 完成的"件数"或长度 | 可能少于请求数     | `fread` `fwrite` `strlen`         |

两个必须内化的细节：

- **`size_t` 是无符号类型**。`strlen("abc") - 5` 不会得到 -2，而是回绕成巨大的正数。循环写 `for (size_t i = len - 1; ...)` 前先确认 `len > 0`。
- **EOF 是 int**。`fgetc` 返回 int 是为了能同时表达"某个字节值"和"读失败"，接收它的变量必须声明为 `int`。

## 输入输出 `<stdio.h>`

### printf 格式符速查

| 格式符 | 对应类型                | 说明                       |
| :----- | :---------------------- | :------------------------- |
| `%d` `%u`   | `int` / `unsigned int` | 十进制整数                 |
| `%ld` `%lu` | `long` / `unsigned long` | 长整型                   |
| `%zu`       | `size_t`               | sizeof/strlen 的正确格式符 |
| `%x`        | `unsigned int`          | 十六进制                   |
| `%f` `%e` `%g` | `double`            | scanf 中对应 `%lf`         |
| `%c` `%s`   | `int`(字符) / `char*`   | 字符与字符串               |
| `%p`        | `void *`                | 打印指针应先转为 `(void*)` |
| `%%`        | -                       | 输出百分号本身             |

```c
#include <stdio.h>
#include <string.h>

int main(void) {
    size_t n = strlen("hello");
    int *p = NULL;

    printf("长度: %zu\n", n);          // 长度: 5
    printf("指针: %p\n", (void *)p);   // %p 必须配 void*
    printf("[%5d] [%-5d] [%05d]\n", 42, 42, 42);
    // [   42] [42   ] [00042]
    return 0;
}
```

### scanf 的两条铁律

```c
int x;
double d;
char name[32];

scanf("%d", &x);            // 参数必须是"地址"：&x 而不是 x
scanf("%31[^\n]", name);    // 读含空格的一行：限制宽度 31，留 1 字节给 '\0'
```

### 文件操作模式

```c
FILE *fp = fopen("data.txt", "r");   // r读 w写 a追加；+ 表读写；b 表二进制
if (fp == NULL) {                    // fopen 失败返回 NULL，必须检查
    perror("fopen");                 // 打印"系统错误原因"
    return 1;
}
// "w" 会清空已有文件；想保留旧内容追加要用 "a"
fclose(fp);
```

文件读写函数的系统讲解见 [文件 I/O 操作](/c/430-StdioFileIO)。

## 字符串与内存 `<string.h>`

| 函数       | 签名要点                     | 返回值与陷阱                                     |
| :--------- | :--------------------------- | :----------------------------------------------- |
| `strlen`   | `size_t strlen(const char*)` | 不含结尾 '\0'；对未终止的缓冲区是未定义行为      |
| `strcpy`   | 不检查目标长度               | 溢出不报错，务必确保目标足够大                   |
| `strncpy`  | 最多复制 n 字节              | **源短时补 '\0'，源长时不写 '\0'**，需手动补     |
| `strncat`  | 最多追加 n 字符              | 总会补 '\0'，n 是"最多追加数"而非缓冲区大小      |
| `strcmp`   | 按字典序比较                 | 返回负/零/正，**不是只返回 -1/0/1**              |
| `strncmp`  | 比较前 n 字符                | 同上                                             |
| `strstr`   | 查找子串                     | 返回首次出现位置指针，找不到返回 NULL            |
| `strchr`   | 查找字符                     | 同上；查找字符 '\0' 会返回指向结尾的指针         |
| `strtok`   | 就地分割                     | 内部有静态状态：**不可重入**，多线程用 strtok_r  |
| `memcpy`   | 复制 n 字节                  | 内存**不允许重叠**，重叠用 memmove               |
| `memmove`  | 复制 n 字节                  | 允许重叠，稍慢但安全                             |
| `memset`   | 按字节填充                   | 只适合清零或填充字节型数据                       |
| `snprintf` | 见下                         | 返回"本想写入的长度"，可用于预判截断             |

```c
#include <stdio.h>
#include <string.h>

int main(void) {
    /* strncpy 陷阱演示 */
    char dst[8];
    strncpy(dst, "hello, world", sizeof(dst));
    dst[sizeof(dst) - 1] = '\0';   // 源更长时不保证 '\0'，必须手动补
    printf("%s\n", dst);           // hello, 

    /* 推荐写法：snprintf 永远补 '\0'，并返回应写的长度 */
    char buf[8];
    int need = snprintf(buf, sizeof(buf), "%d-%s", 12345, "abcdef");
    if (need < 0) { /* 编码错误 */ }
    else if ((size_t)need >= sizeof(buf)) {
        printf("被截断：需要 %d 字节\n", need);
    }
    printf("%s\n", buf);           // 12345-a
    return 0;
}
```

## 通用工具 `<stdlib.h>`

### 动态内存四件套

```c
int *p  = malloc(10 * sizeof(int));        // 分配，内容未初始化
int *p0 = calloc(10, sizeof(int));         // 分配并清零
int *q  = realloc(p, 20 * sizeof(int));    // 扩容；用新变量接收，防止失败时丢指针
if (q) p = q;
free(p);                                    // 释放后置空，防止悬垂指针
p = NULL;
```

malloc 失败返回 NULL；`free(NULL)` 安全无害。完整的内存管理讲解见 [动态内存管理](/c/200-DynamicMemoryManagement)。

### 数值转换：strtol 优于 atoi

`atoi("abc")` 返回 0 且**无法得知出错了**；`strtol` 通过指针与 errno 提供完整错误信息：

```c
#include <stdio.h>
#include <stdlib.h>
#include <errno.h>
#include <limits.h>

int main(void) {
    const char *s = "123abc";
    char *end;
    errno = 0;
    long v = strtol(s, &end, 10);

    if (end == s)      printf("没有解析出任何数字\n");
    else if (*end)     printf("数字后有余料: %s\n", end);   // 余料: abc
    else if (errno == ERANGE) printf("超出 long 范围\n");
    else               printf("解析成功: %ld\n", v);
    return 0;
}
```

### qsort 与 bsearch

比较函数约定：返回"负数 / 0 / 正数"表示"前者应排在后者前 / 相等 / 后"：

```c
#include <stdio.h>
#include <stdlib.h>

int cmp_int(const void *a, const void *b) {
    int x = *(const int *)a, y = *(const int *)b;
    return (x > y) - (x < y);   // 安全写法；不要写 x - y（大数相减可能溢出）
}

int main(void) {
    int arr[] = {5, 2, 8, 1, 9};
    qsort(arr, sizeof(arr) / sizeof(arr[0]), sizeof(int), cmp_int);
    for (int i = 0; i < 5; i++) printf("%d ", arr[i]);   // 1 2 5 8 9
    printf("\n");
    return 0;
}
```

### 其它常用

| 函数          | 说明                                     |
| :------------ | :--------------------------------------- |
| `abs` / `labs`| 整数绝对值（INT_MIN 取反是未定义行为）   |
| `exit`/`atexit`| 终止进程 / 注册退出回调                 |
| `getenv`      | 读环境变量，找不到返回 NULL              |
| `rand`/`srand`| 伪随机数；`rand() % N` 分布不均，要求高时用别的方案 |

## 数学 `<math.h>`

```c
#include <stdio.h>
#include <math.h>

int main(void) {
    printf("sqrt(2)   = %.4f\n", sqrt(2.0));     // 1.4142
    printf("pow(2,10) = %.0f\n", pow(2.0, 10.0)); // 1024
    printf("ceil(3.2) = %.1f\n", ceil(3.2));      // 4.0（向上取整）
    printf("floor(3.8)= %.1f\n", floor(3.8));     // 3.0（向下取整）
    printf("fabs(-1.5)= %.1f\n", fabs(-1.5));     // 1.5
    printf("round(2.5)= %.1f\n", round(2.5));     // 3.0（远离零四舍五入）
    return 0;
}
```

三个易错点：

- **参数与返回都是 double**：写 `sqrt(2)` 也能编译（隐式转 double），但习惯上写 `2.0`。
- **Linux 下要链接数学库**：`gcc main.c -o main -lm`。
- **浮点比较不能直接用 ==**：应比较 `fabs(a - b) < EPS`（EPS 按量级取，如 1e-9）。

## 字符分类 `<ctype.h>`

```c
#include <ctype.h>

if (isdigit((unsigned char)ch)) { /* ch 是 '0'..'9' */ }
if (isalpha((unsigned char)ch)) { /* ch 是字母 */ }
ch = (char)toupper(ch);   // 转大写；非字母原样返回
```

注意：参数虽声明为 int，但**必须传入 unsigned char 值或 EOF**。直接把 `char` 传进去，在 char 为有符号的平台上遇到扩展字符（负值）是未定义行为，所以惯例是先转 `(unsigned char)`。

## 时间 `<time.h>`

```c
#include <stdio.h>
#include <time.h>

int main(void) {
    clock_t c0 = clock();            // 进程 CPU 时间（测量耗时）
    time_t now = time(NULL);         // 日历时间戳（秒）

    struct tm *t = localtime(&now);
    printf("%04d-%02d-%02d\n",
           t->tm_year + 1900, t->tm_mon + 1, t->tm_mday);

    double cpu = (double)(clock() - c0) / CLOCKS_PER_SEC;
    printf("CPU time: %.6f s\n", cpu);
    return 0;
}
```

`time_t` 秒数差不要直接相减，用 `difftime(t1, t2)`；测"真实流逝时间"在 POSIX 上更推荐 `clock_gettime(CLOCK_MONOTONIC, ...)`。

## 错误码与断言

```c
#include <errno.h>
#include <string.h>
#include <assert.h>

FILE *fp = fopen("nofile.txt", "r");
if (!fp) {
    // errno 被库函数置为失败原因，strerror 转为可读文本
    fprintf(stderr, "open failed: %s\n", strerror(errno));
}

assert(sizeof(int) >= 4);   // 调试期检查，编译时定义 NDEBUG 后被移除
```

`assert` 只用于捕捉"程序员的错误"，不要用它在正式逻辑里处理运行时失败（如文件不存在）。

## 综合示例

综合运用 fgets + strtok + strtol + qsort 的小程序，可直接编译运行：

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int cmp_desc(const void *a, const void *b) {
    long x = *(const long *)a, y = *(const long *)b;
    return (x < y) - (x > y);    // 降序
}

int main(void) {
    const char *line = "42, 7, 100, 9";
    long nums[16];
    int n = 0;

    // strtok 会修改字符串，先拷贝到可写缓冲区
    char buf[64];
    snprintf(buf, sizeof(buf), "%s", line);

    char *save = NULL;
    for (char *tok = strtok_r(buf, ", ", &save);
         tok != NULL; tok = strtok_r(NULL, ", ", &save)) {
        if (n >= 16) break;
        char *end;
        nums[n] = strtol(tok, &end, 10);
        if (end == tok || *end) {          // 解析失败或有余料则跳过
            fprintf(stderr, "忽略非法字段: %s\n", tok);
            continue;
        }
        n++;
    }

    qsort(nums, (size_t)n, sizeof(long), cmp_desc);

    printf("排序结果(%d 个): ", n);
    for (int i = 0; i < n; i++) printf("%ld ", nums[i]);
    printf("\n");
    return 0;
}
```

预期输出：

```text
排序结果(4 个): 100 42 9 7
```

说明：`strtok_r` 是 POSIX 扩展（C 标准只有不可重入的 `strtok`）；在 Windows 上对应 `strtok_s`。

## 常见陷阱

- **scanf 忘写 `&`**：`scanf("%d", x)` 是把 x 的值当地址用，运行必然出错。
- **把 `char` 用来接 `fgetc` 结果**：与 EOF 的比较在 char 为无符号的平台上永远不成立，必须用 `int`。
- **`strncpy` 之后直接当字符串用**：源串更长时目标没有 '\0'，后续 strlen/printf 全是未定义行为。
- **`strcpy`/`strcat` 无边界**：缓冲区溢出的头号来源，可变输入一律用 `snprintf`/`strncat` 并手动补 '\0'。
- **qsort 比较函数写 `a - b`**：大整数相减会溢出导致排序结果错乱，用 `(a>b)-(a<b)`。
- **`atoi` 当解析器**：失败只能得到 0，无法区分"0"和"非法输入"，解析外部输入用 strtol。
- **`memcpy` 用于重叠区间**：同一数组内前后挪动数据必须用 `memmove`。
- **`rand() % N` 做均匀抽样**：取模有偏；对分布有要求时换更好的随机源。
- **malloc 之后不检查 NULL**：小分配也必须检查，失败即解引用是未定义行为。

## 小结

**初学者记住这三点：**

1. 找功能先查头文件：输入输出 stdio、字符串 string、内存与转换 stdlib、数学 math。
2. 指针型函数失败返回 NULL（fopen/malloc/strchr），用前必须检查。
3. 字符串的"带 n"版本不是万能保险：strncpy 可能不补 '\0'，边界安全首选 snprintf。

**进阶者还需注意：**

- `size_t` 无符号回绕、EOF 必须用 int 接、ctype 函数参数要先转 unsigned char——这三类类型层陷阱编译器通常不会警告。
- 解析不可信输入的完整链条：fgets 读行 -> strtok_r 切分 -> strtol 带错误检测，比 scanf/atoi 系列可控得多。
- 比较函数、类型宽限（long 转换）、浮点误差等"约定值"在不同平台上语义一致，是标准库可移植性的核心价值；涉及文件系统、进程、信号时才退回到 POSIX 层，见 [POSIX 系统调用速查](/c/420-CPosixSystemCall)。
