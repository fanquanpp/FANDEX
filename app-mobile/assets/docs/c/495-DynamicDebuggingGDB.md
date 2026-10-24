---
order: 540
title: 动态调试与 GDB 实战
module: 'c'
category: 计算机科学
difficulty: intermediate
description: C 程序动态调试实战：GDB 断点/观察点/多线程调试、core dump 分析、段错误与死锁的复现-定位-修复模式、远程调试与反向调试。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'c/485-StaticAnalysisAndSanitizers'
  - 'c/510-CValgrind'
  - 'c/210-ProcessMemoryLayoutAndErrors'
prerequisites:
  - 'c/020-CLanguageOverview'
  - 'c/140-PointerDeep'
---

# 动态调试与 GDB 实战 (Dynamic Debugging with GDB)

## 知识点地图

- **知识类别**：动态调试——程序运行时观察和控制它的行为，把「崩溃了但不知道为什么」变成「断在哪一行、哪个变量是坏值」。
- **解决什么问题**：静态分析与 Sanitizers（见 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers)）负责在运行前拦截问题；但真正的线上事故——偶现段错误、死锁、时序敏感 bug——需要你走进正在执行的进程：下断点、看调用栈、盯一个变量什么时候被谁改坏、事后解剖 core dump。
- **什么时候用到**：
  - 程序段错误/断言失败，手上有 `core` 文件或能复现；
  - 多线程程序偶现错误结果，怀疑数据竞争或死锁；
  - 嵌入式/容器/远程服务器上的进程，需要 gdbserver 远程调试；
  - `printf` 改动时序导致 Heisenbug 消失，必须零侵入观察。
- **学完能做什么**：面对一个带调试符号的程序，从崩溃现场反推根因；用观察点揪出「谁改了这个全局变量」；用 `thread apply all bt` 诊断死锁；对无源码符号缺失的场景仍有调试路径。

## 学习目标

- 掌握「第 1 章 动态调试工具」的核心机制、典型用法与常见陷阱
- 掌握「第 2 章 实战调试模式」的核心机制、典型用法与常见陷阱
- 掌握「第 3 章 平台相关调试陷阱」的核心机制、典型用法与常见陷阱
- 掌握「第 4 章 高级主题」的核心机制、典型用法与常见陷阱

## 第 1 章 动态调试工具

### 1.1 GDB 详解

#### 1.1.1 启动 GDB

```bash
# 基本启动
gdb ./program

# 带参数启动
gdb --args ./program arg1 arg2

# 分析 core dump
gdb ./program core

# 附加到运行中的进程
gdb -p <pid>

# 远程调试
gdb ./program
(gdb) target remote 192.168.1.100:2345

# 启动时不显示启动信息
gdb -q ./program

# 执行 GDB 命令后退出
gdb -batch -ex "run" -ex "bt" ./program
```

#### 1.1.2 断点管理

```bash
# 函数断点
break main
break file.c:42
break MyClass::myMethod

# 条件断点
break file.c:42 if x > 100
break loop_function if i == 50

# 临时断点(触发一次后自动删除)
tbreak file.c:42

# 正则断点
rbreak ^test_.*

# 观察点(变量值变化时中断)
watch x
watch *0x7fff1234

# 读观察点
rwatch x

# 读写观察点
awatch x

# 捕获点(捕获特定事件)
catch throw           # C++ 异常抛出
catch catch           # C++ 异常捕获
catch fork            # fork 调用
catch syscall write   # 系统调用

# 查看断点
info breakpoints

# 删除断点
delete 1              # 删除 1 号断点
delete                # 删除所有断点
clear file.c:42       # 删除指定位置的断点

# 禁用/启用断点
disable 1
enable 1
enable once 1         # 启用一次后禁用
enable delete 1       # 触发后删除

# 设置断点命令(断点触发时执行的命令)
break file.c:42
commands
  print x
  print y
  continue
end
```

#### 1.1.3 执行控制

```bash
# 运行程序
run                  # 从头开始运行
run arg1 arg2        # 带参数运行

# 单步执行
next                 # 单步,不进入函数 (next)
step                 # 单步,进入函数 (step)
nexti                # 单步指令,不进入函数
stepi                # 单步指令,进入函数

# 继续执行
continue             # 继续到下一个断点
continue 5           # 跳过下 5 次断点

# 函数级执行
finish               # 运行到当前函数返回
return               # 立即从当前函数返回
return 42            # 立即返回,返回值为 42
until                # 运行到当前循环结束
until file.c:50      # 运行到指定行

# 跳转执行
jump file.c:50       # 跳到第 50 行(不改变栈)
call func(1, 2)      # 调用函数

# 信号处理
handle SIGINT stop   # 收到 SIGINT 时停止
handle SIGINT pass   # 将信号传递给程序
handle SIGINT nopass # 不传递信号给程序
handle SIGINT ignore # 忽略信号
```

#### 1.1.4 查看数据

```bash
# 打印变量
print x
print *ptr
print arr[0]@5       # 打印数组前 5 个元素
print arr@10         # 打印数组前 10 个元素
print *list@10       # 打印指针指向的 10 个元素

# 格式化输出
print/x x            # 十六进制
print/t x            # 二进制
print/c x            # 字符
print/f x            # 浮点
print/s str          # 字符串
print/a ptr          # 地址

# 表达式
print x + y
print strlen(s)
print sizeof(struct MyStruct)

# 自动显示(每次暂停时显示)
display x
display/x flags
info display
undisplay 1

# 内存查看
x/10xw 0x7fff1234    # 查看内存, 10 个 4 字节, 十六进制
x/10dw 0x7fff1234    # 10 个 4 字节, 十进制
x/10cw 0x7fff1234    # 10 个 4 字节, 字符
x/10gw 0x7fff1234    # 10 个 8 字节, 十六进制
x/s 0x7fff1234       # 字符串
x/i 0x401000         # 反汇编指令

# 寄存器
info registers
print $rsp
print $rip

# 局部变量
info locals
info args

# 调用栈
backtrace            # 完整调用栈
backtrace 5          # 最内 5 层
backtrace full       # 带局部变量
frame 2              # 切换到第 2 层
up
down
info frame           # 当前栈帧详情
info frame 2         # 第 2 层栈帧详情

# 查看类型
ptype struct MyStruct
ptype x
whatis x
info types           # 所有类型
info types MyStruct  # 匹配的类型

# 查看源码
list                 # 当前位置前后 10 行
list 50              # 第 50 行附近
list main            # main 函数附近
list file.c:50       # 指定文件第 50 行
list -               # 上一段源码
list +               # 下一段源码
info source          # 当前源文件信息
info line 50         # 第 50 行对应的地址
disas main           # 反汇编 main 函数
```

#### 1.1.5 修改变量值

```bash
# 设置变量值
set variable x = 10
set variable ptr = (int *)malloc(sizeof(int))
set variable arr[0] = 100

# 设置内存
set {int}0x7fff1234 = 42
set {char [10]}0x7fff1234 = "hello"

# 设置寄存器
set $rax = 0

# 便利变量(convenience variable)
set $count = 0
print $count++
```

#### 1.1.6 多线程调试

```bash
# 查看所有线程
info threads

# 输出示例:
#   Id   Target Id          Frame
# * 1    Thread 0x7f... "prog" main () at prog.c:10
#   2    Thread 0x7f... "prog" worker () at prog.c:50
#   3    Thread 0x7f... "prog" worker () at prog.c:50

# 切换线程
thread 2

# 在所有线程上设置断点
break file.c:42 thread all

# 仅在指定线程上设置断点
break file.c:42 thread 2

# 调度器锁定(其他线程暂停)
set scheduler-locking on     # 仅当前线程运行
set scheduler-locking off    # 所有线程运行(默认)
set scheduler-locking step   # 单步时锁定

# 线程名(便于识别)
set thread name "my-worker"

# 线程断点(每个线程独立计数)
set thread apply all break file.c:42
```

#### 1.1.7 多进程调试

```bash
# follow-fork-mode
set follow-fork-mode parent   # 跟踪父进程(默认)
set follow-fork-mode child    # 跟踪子进程

# detach-on-fork
set detach-on-fork on         # 分离未跟踪的进程(默认)
set detach-on-fork off        # 同时跟踪父子进程

# 查看所有被跟踪的进程
info inferiors

# 切换进程
inferior 2

# 在新进程上启动 GDB
catch fork
run
# 程序 fork 后, GDB 会暂停
```

#### 1.1.8 GDB 配置文件

`~/.gdbinit` 或 `.gdbinit`:

```text
# 自动加载安全配置
set auto-load safe-path /

# 历史记录
set history save on
set history filename ~/.gdb_history
set history size 1000

# 显示设置
set print pretty on
set print object on
set print static-members on
set print vtbl on
set print demangle on
set print sevenbit-strings off
set print array on
set print elements 200

# 字符集
set charset UTF-8

# 提示符
set prompt (gdb) 

# 默认汇编风格
set disassembly-flavor intel

# 自定义命令
define print_string
  if $arg0 != 0
    printf "String: %s\n", $arg0
  else
    printf "NULL string\n"
  end
end

# 启动时打印信息
echo === GDB Loaded ===\n
```

### 1.2 LLDB 详解

LLDB 是 LLVM 项目的调试器,与 GDB 命令兼容但有差异。

#### 1.2.1 LLDB 与 GDB 命令对照

| 操作             | GDB                     | LLDB                            |
| ---------------- | ----------------------- | ------------------------------- |
| 启动             | `gdb ./prog`            | `lldb ./prog`                   |
| 运行             | `run`                   | `run` 或 `process launch`       |
| 单步             | `step` / `next`         | `step` / `next`                 |
| 继续             | `continue`              | `continue` 或 `c`               |
| 断点             | `break main`            | `b main` 或 `breakpoint set`    |
| 查看变量         | `print x`               | `p x` 或 `frame variable x`     |
| 调用栈           | `bt`                    | `bt` 或 `thread backtrace`      |
| 查看局部变量     | `info locals`           | `frame variable`                |
| 切换栈帧         | `frame 2`               | `frame select 2`                |
| 查看线程         | `info threads`          | `thread list`                   |
| 切换线程         | `thread 2`              | `thread select 2`               |
| 内存查看         | `x/10xw 0xaddr`         | `memory read --size 4 --count 10 --format x 0xaddr` |
| 反汇编           | `disas main`            | `disassemble --name main`       |

#### 1.2.2 LLDB 独有特性

```bash
# 表达式求值(更强大)
p print("hello")              # 调用函数
p *(int *)$rsp                # 访问寄存器指向的内存

# Python 脚本(原生支持)
script
>>> import lldb
>>> frame = lldb.debugger.GetSelectedTarget().GetProcess().GetSelectedThread().GetSelectedFrame()
>>> print(frame.GetVariables())
>>> exit()

# 变量观测(lldb 独有)
watchpoint set variable x     # 设置 watchpoint
watchpoint list
watchpoint delete 1

# 多线程并发查看
thread backtrace all          # 所有线程的调用栈
```

### 1.3 IDE 集成调试

#### 1.3.1 VS Code + cppvscode

VS Code 的 C/C++ 扩展支持 GDB/LLDB 调试,通过 `launch.json` 配置:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug with GDB",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/build/program",
      "args": ["arg1", "arg2"],
      "stopAtEntry": false,
      "cwd": "${workspaceFolder}",
      "environment": [],
      "externalConsole": false,
      "MIMode": "gdb",
      "miDebuggerPath": "/usr/bin/gdb",
      "setupCommands": [
        { "text": "-enable-pretty-printing", "ignoreFailures": true }
      ]
    },
    {
      "name": "Debug with ASan",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/build/program_asan",
      "args": [],
      "env": { "ASAN_OPTIONS": "detect_leaks=1:abort_on_error=0" },
      "MIMode": "gdb"
    }
  ]
}
```
## 第 2 章 实战调试模式

### 2.1 模式一:调试段错误

#### 2.1.1 经典段错误场景

```c
#include <stdio.h>
#include <string.h>

void process_string(const char *str) {
    /* 忘记检查 NULL */
    size_t len = strlen(str);  /* 若 str 为 NULL, 段错误 */
    printf("Length: %zu\n", len);
}

int main(void) {
    const char *names[] = {"Alice", "Bob", NULL, "Charlie"};

    for (int i = 0; i < 4; i++) {
        process_string(names[i]);  /* i=2 时段错误 */
    }

    return 0;
}
```

#### 2.1.2 GDB 调试流程

```bash
# 编译时加调试信息
gcc -g -O0 segfault.c -o segfault

# 启动 GDB
gdb ./segfault

# 运行程序
(gdb) run

# 程序崩溃后, 查看调用栈
(gdb) bt
#0  __strlen_avx2 () at ../sysdeps/x86_64/multiarch/strlen-avx2.S:95
#1  0x00007f1234567890 in __strlen_sse2 () at ../sysdeps/x86_64/multiarch/../strlen.S:32
#2  0x0000555555555167 in process_string (str=0x0) at segfault.c:5
#3  0x00005555555551a8 in main () at segfault.c:12

# 切换到崩溃的栈帧
(gdb) frame 2
#2  0x0000555555555167 in process_string (str=0x0) at segfault.c:5
#5           size_t len = strlen(str);

# 查看变量
(gdb) print str
$1 = 0x0
(gdb) print i
$2 = 2

# 确认是空指针, 修复: 添加 NULL 检查
```

#### 2.1.3 用 ASan 调试

```bash
gcc -fsanitize=address -g segfault.c -o segfault_asan
./segfault_asan

# ASan 报告:
# ERROR: AddressSanitizer: SEGV on unknown address 0x000000000000
# The signal is caused by a READ memory access.
#     #0 0x7f... in __strlen_avx2
#     #1 0x401168 in process_string segfault.c:5
#     #2 0x4011a8 in main segfault.c:12
```

ASan 直接显示崩溃点的栈,无需 GDB 交互。

### 2.2 模式二:定位内存泄漏

#### 2.2.1 泄漏示例

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

Node *create_list(int n) {
    Node *head = NULL;
    for (int i = 0; i < n; i++) {
        Node *node = malloc(sizeof(Node));
        if (!node) return NULL;
        node->value = i;
        node->next = head;
        head = node;
    }
    return head;
}

void process_list(Node *head) {
    Node *curr = head;
    while (curr) {
        printf("%d ", curr->value);
        curr = curr->next;
    }
    printf("\n");
    /* 忘记 free */
}

int main(void) {
    Node *list = create_list(5);
    process_list(list);
    /* 应该 free_list(list); */
    return 0;
}
```

#### 2.2.2 用 Valgrind 定位

```bash
valgrind --leak-check=full --show-leak-kinds=all ./leak

# Valgrind 报告:
# ==12345== 80 (40 direct, 40 indirect) bytes in 1 blocks are definitely lost
# ==12345==    at 0x483777F: malloc (vg_replace_malloc.c:299)
# ==12345==    by 0x401177: create_list (leak.c:11)
# ==12345==    by 0x4011c2: main (leak.c:25)
```

#### 2.2.3 用 ASan 定位

```bash
gcc -fsanitize=address -g leak.c -o leak_asan
ASAN_OPTIONS=detect_leaks=1 ./leak_asan

# ASan 报告:
# Direct leak of 40 byte(s) in 1 object(s) allocated from:
#     #0 0x40a26f in malloc
#     #1 0x401177 in create_list leak.c:11
#     #2 0x4011c2 in main leak.c:25
# Indirect leak of 40 byte(s) in 1 object(s) allocated from:
#     #0 0x40a26f in malloc
#     #1 0x401177 in create_list leak.c:11
#     #2 0x4011c2 in main leak.c:25
```

### 2.3 模式三:检测数据竞争

```c
#include <stdio.h>
#include <pthread.h>

int counter = 0;

void *worker(void *arg) {
    for (int i = 0; i < 1000000; i++) {
        counter++;  /* 数据竞争 */
    }
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, worker, NULL);
    pthread_create(&t2, NULL, worker, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    printf("counter = %d\n", counter);
    return 0;
}
```

```bash
# TSan 检测
gcc -fsanitize=thread -g race.c -o race_tsan -lpthread
./race_tsan

# Helgrind 检测
gcc -g race.c -o race
valgrind --tool=helgrind ./race
```

### 2.4 模式四:调试未定义行为

```c
#include <stdio.h>
#include <limits.h>

int main(void) {
    int x = INT_MAX;
    int y = x + 1;  /* 有符号整数溢出: UB */
    printf("y = %d\n", y);

    int arr[5] = {0};
    for (int i = 0; i <= 5; i++) {  /* i=5 时越界 */
        arr[i] = i;
    }

    int shift = 1 << 31;  /* 1 << 31 在 int 上是 UB */
    printf("shift = %d\n", shift);

    return 0;
}
```

```bash
# UBSan 检测
gcc -fsanitize=undefined -g ub.c -o ub_ubsan
./ub_ubsan

# UBSan 报告:
# ub.c:5:11: runtime error: signed integer overflow: 2147483647 + 1 cannot be represented in type 'int'
# ub.c:9:9: runtime error: index 5 out of bounds for type 'int [5]'
# ub.c:13:15: runtime error: shift exponent 31 is too large for 32-bit type 'int'
```

### 2.5 模式五:调试死锁

```c
#include <pthread.h>
#include <stdio.h>

pthread_mutex_t mutex1 = PTHREAD_MUTEX_INITIALIZER;
pthread_mutex_t mutex2 = PTHREAD_MUTEX_INITIALIZER;

void *worker1(void *arg) {
    pthread_mutex_lock(&mutex1);
    printf("worker1 locked mutex1\n");
    /* 模拟工作 */
    for (volatile int i = 0; i < 1000000; i++);
    pthread_mutex_lock(&mutex2);  /* 等待 mutex2 */
    printf("worker1 locked mutex2\n");
    pthread_mutex_unlock(&mutex2);
    pthread_mutex_unlock(&mutex1);
    return NULL;
}

void *worker2(void *arg) {
    pthread_mutex_lock(&mutex2);
    printf("worker2 locked mutex2\n");
    for (volatile int i = 0; i < 1000000; i++);
    pthread_mutex_lock(&mutex1);  /* 等待 mutex1, 死锁 */
    printf("worker2 locked mutex1\n");
    pthread_mutex_unlock(&mutex1);
    pthread_mutex_unlock(&mutex2);
    return NULL;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, NULL, worker1, NULL);
    pthread_create(&t2, NULL, worker2, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    return 0;
}
```

```bash
# GDB 调试死锁
gcc -g deadlock.c -o deadlock -lpthread
gdb ./deadlock
(gdb) run
# 程序卡住时按 Ctrl+C
Thread 1 "deadlock" received signal SIGINT, Interrupt.
[Switching to Thread 0x7f...]
0x00007f... in futex_wait_cancelable () from /lib/.../libpthread.so.0

(gdb) info threads
  Id   Target Id          Frame
* 1    Thread 0x7f... "deadlock" futex_wait_cancelable ()
  2    Thread 0x7f... "deadlock" futex_wait_cancelable ()
  3    Thread 0x7f... "deadlock" futex_wait_cancelable ()

(gdb) thread apply all bt
# 查看 3 个线程都在 futex_wait, 表明死锁

# Helgrind 检测
valgrind --tool=helgrind ./deadlock
```

### 2.6 模式六:用 printf 与日志调试

虽然 printf 调试法原始,但在某些场景依然有效:
- 嵌入式环境无 GDB
- 时序敏感(无法暂停)
- 长时间运行(只能事后分析日志)

```c
#include <stdio.h>
#include <stdarg.h>
#include <time.h>

typedef enum {
    LOG_TRACE,
    LOG_DEBUG,
    LOG_INFO,
    LOG_WARN,
    LOG_ERROR
} LogLevel;

static LogLevel g_log_level = LOG_TRACE;
static FILE *g_log_file = NULL;

static const char *level_names[] = {
    "TRACE", "DEBUG", "INFO", "WARN", "ERROR"
};

void log_init(const char *filename) {
    g_log_file = fopen(filename, "a");
}

void log_write(LogLevel level, const char *file, int line,
               const char *fmt, ...) {
    if (level < g_log_level) return;

    time_t now = time(NULL);
    struct tm *t = localtime(&now);
    char time_buf[20];
    strftime(time_buf, sizeof(time_buf), "%Y-%m-%d %H:%M:%S", t);

    FILE *out = g_log_file ? g_log_file : stderr;
    fprintf(out, "[%s] [%s] %s:%d: ",
            time_buf, level_names[level], file, line);

    va_list ap;
    va_start(ap, fmt);
    vfprintf(out, fmt, ap);
    va_end(ap);

    fprintf(out, "\n");
    fflush(out);
}

#define LOG(level, fmt, ...) log_write(level, __FILE__, __LINE__, fmt, ##__VA_ARGS__)
#define TRACE(fmt, ...) LOG(LOG_TRACE, fmt, ##__VA_ARGS__)
#define DEBUG(fmt, ...) LOG(LOG_DEBUG, fmt, ##__VA_ARGS__)
#define INFO(fmt, ...)  LOG(LOG_INFO, fmt, ##__VA_ARGS__)
#define WARN(fmt, ...)  LOG(LOG_WARN, fmt, ##__VA_ARGS__)
#define ERROR(fmt, ...) LOG(LOG_ERROR, fmt, ##__VA_ARGS__)

int main(void) {
    log_init("app.log");
    TRACE("程序启动");
    DEBUG("变量 x = %d", 42);
    INFO("处理文件: %s", "data.txt");
    WARN("磁盘空间不足: %d%%", 90);
    ERROR("无法打开文件: %s", "config.txt");
    return 0;
}
```
## 第 3 章 平台相关调试陷阱

### 3.1 字节序问题

```c
uint32_t value = 0x12345678;
char *bytes = (char *)&value;
/* 小端: bytes[0] = 0x78 */
/* 大端: bytes[0] = 0x12 */
```

调试时需注意当前平台的字节序。网络编程必须用 `htonl`/`ntohl`。

### 3.2 指针大小

```c
/* 32 位平台: 4 字节 */
/* 64 位平台: 8 字节 */
int *p;
printf("sizeof(p) = %zu\n", sizeof(p));
```

`int` 与 `int *` 大小不同,不能混用(常见于 printf 格式串)。

### 3.3 对齐要求

```c
char buf[8];
int *p = (int *)(buf + 1);  /* 未对齐! */
*p = 42;  /* x86 上慢, ARM 上崩溃 */
```

用 `memcpy` 处理未对齐访问:

```c
char buf[8];
int value;
memcpy(&value, buf + 1, sizeof(int));
```
## 第 4 章 高级主题

### 4.1 Core Dump 分析

#### 4.1.1 启用 core dump

```bash
# 临时启用(当前 shell)
ulimit -c unlimited

# 永久启用
echo "* soft core unlimited" >> /etc/security/limits.conf
echo "* hard core unlimited" >> /etc/security/limits.conf

# 设置 core 文件路径与命名
echo "/var/core/core.%e.%p.%t" > /proc/sys/kernel/core_pattern

# 测试
gcc -g crash.c -o crash
./crash  # 崩溃后生成 core 文件

# 分析
gdb ./crash core
(gdb) bt
```

#### 4.1.2 core_pattern 格式

```
%%  - 字符 %
%p  - PID
%u  - UID
%g  - GID
%s  - 触发 core dump 的信号
%t  - 时间戳
%h  - 主机名
%e  - 可执行文件名
%E  - 可执行文件路径
%c  - core 文件大小限制
```

### 4.2 GDB Python 脚本

```python
# print_linked_list.py - GDB 自定义命令
import gdb

class PrintLinkedList(gdb.Command):
    """打印链表: print_linked_list <head_pointer>"""

    def __init__(self):
        super(PrintLinkedList, self).__init__("print_linked_list",
                                              gdb.COMMAND_USER)

    def invoke(self, arg, from_tty):
        node = gdb.parse_and_eval(arg)
        idx = 0
        while node != 0:
            value = node['value']
            next_ptr = node['next']
            gdb.write(f"[{idx}] value={int(value)}, addr={str(node)}\n")
            node = next_ptr
            idx += 1
            if idx > 1000:
                gdb.write("... (stopped at 1000 nodes)\n")
                break

PrintLinkedList()
```

使用:

```bash
gdb -x print_linked_list.py ./program
(gdb) print_linked_list head
[0] value=42, addr=0x5555555592a0
[1] value=17, addr=0x5555555592c0
...
```

### 4.3 远程调试

```bash
# 目标机器运行 gdbserver
gdbserver :2345 ./program

# 或附加到已有进程
gdbserver --attach :2345 <pid>

# 主机连接
gdb ./program
(gdb) target remote 192.168.1.100:2345
(gdb) continue
```

适用于嵌入式设备、Docker 容器、远程服务器调试。

### 4.4 条件断点优化

普通条件断点在每次命中时都暂停程序判断条件,性能极差:

```bash
# 慢: 每次循环都暂停判断
break loop.c:10 if i == 1000000
```

优化:用断点命令在达到条件后才中断

```bash
# 快: 仅在 i 接近目标时暂停
break loop.c:10
commands
  silent
  if i >= 999990
    printf "i = %d\n", i
  end
  if i == 1000000
    printf "Reached!\n"
    delete 1  # 删除断点,避免再触发
  else
    continue
  end
end
```

### 4.5 反向调试(Reverse Debugging)

GDB 7.0+ 支持反向执行:

```bash
# 启用反向调试记录
(gdb) record

# 运行到崩溃
(gdb) continue

# 反向单步
(gdb) reverse-step
(gdb) reverse-next

# 反向继续
(gdb) reverse-continue

# 反向到函数入口
(gdb) reverse-finish
```

适用于"程序崩溃后,想看崩溃前的状态"的场景。注意:性能开销大,且不支持所有架构。
## 第 5 章 调试检查清单

在开始调试前,确认以下信息:

- [ ] 编译选项是否包含 `-g`
- [ ] 是否禁用优化(`-O0`)或使用调试优化(`-Og`)
- [ ] 是否启用所有警告(`-Wall -Wextra -Wpedantic`)
- [ ] 是否能稳定复现 bug
- [ ] 是否有最小复现用例
- [ ] 是否尝试过 sanitizer(ASan/UBSan)
- [ ] 是否查看了 core dump
- [ ] 是否检查了最近的代码变更(git bisect)

在修复后,确认:

- [ ] 修复后 bug 不再复现
- [ ] 添加了回归测试
- [ ] 在 `-O2` 下也通过测试
- [ ] 通过 sanitizer 检查
- [ ] 静态分析无新警告
- [ ] 代码审查通过
## 动手实践

### 练习 1：从 core dump 还原事故现场

构造一个必然段错误的小程序并用 core dump 复盘：

```c
/* crash.c */
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int *p = malloc(sizeof(int));
    free(p);
    *p = 42;   /* use-after-free：写入已释放内存 */
    printf("%d\n", *p);
    return 0;
}
```

提示：
- 先 `ulimit -c unlimited`，崩掉后在当前目录找 `core` 文件；
- `gdb ./crash core` 打开后第一件事看什么？（调用栈）
- 这个 bug 属于哪一类内存错误？ASan 会不会报？对应 [静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers) 第 6 章的哪个错误类型？

参考实现（先自己做完再看）：

```text
1. ulimit -c unlimited && ./crash   # 段错误后生成 core（或 core.<pid>）
2. gdb ./crash core
3. (gdb) bt
   #0  0x0000555555555177 in main () at crash.c:7
   栈帧指向第 7 行的 *p = 42。
4. 这是 use-after-free。ASan 会报 heap-use-after-free，并在报告里同时给出
   「分配栈」与「释放栈」两条线索（见 485 篇第 6 章）。
注意：UAF 现场在纯 GDB 下只能看到「写到了坏地址」，看不到「谁释放过它」；
这正是 sanitizer 与调试器互补的原因。
```

### 练习 2：用观察点定位「变量被谁改坏」

```c
/* watch.c */
#include <stdio.h>

int score = 100;          /* 全局成绩榜 */

void bonus(void)  { score += 10; }
void penalty(void) { score = -1; }   /* 某处错误的扣分逻辑 */

int main(void) {
    bonus();
    penalty();
    bonus();
    printf("score = %d\n", score);
    return 0;
}
```

任务：不读代码逻辑（假设这是几万行里的一个函数），只用 GDB 找出是哪一行把 score 改成了 -1。

提示：
- `break main` 后 `run`，然后 `watch score`；
- `continue` 直到 watchpoint 触发，看停在哪一行、新值旧值是多少。

参考实现（先自己做完再看）：

```text
(gdb) b main
(gdb) run
(gdb) watch score
Hardware watchpoint 2: score
(gdb) continue
Hardware watchpoint 2: score
Old value = 110
New value = -1
0x0000555555555169 in penalty () at watch.c:7

停在第 7 行——penalty() 的赋值。观察点是「数据驱动」定位的标准答案：
不需要预先知道调用链，从数据变化反推代码位置。
```

### 练习 3：诊断多线程死锁（工程场景）

拿 2.5 节的 deadlock.c（两个线程交叉加锁 mutex1/mutex2）练手，写出完整的诊断命令序列。

提示：
- 程序卡死不是崩溃，怎么进入 GDB 观察状态？（Ctrl+C 的 SIGINT）
- 要同时看所有线程停在哪里，一条命令是什么？
- 对照 3.6 节的死锁判定：几个线程在等？等的是谁持有的锁？

参考实现（先自己做完再看）：

```text
gcc -g -pthread deadlock.c -o deadlock && gdb ./deadlock
(gdb) run        # 卡住后按 Ctrl+C
^C
(gdb) thread apply all bt

两个 worker 线程都停在 pthread_mutex_lock（futex_wait）：
- worker1 持有 mutex1 等 mutex2
- worker2 持有 mutex2 等 mutex1
构成环路 → 经典死锁。
修复方向：全项目统一加锁顺序（先 mutex1 后 mutex2），
或改用 pthread_mutex_trylock + 回退重试。
```

#### 12.5.2 经典书籍

- 《Debugging: The 9 Indispensable Rules》—— David Agans
- 《Why Programs Fail》—— Andreas Zeller
- 《Advanced Windows Debugging》—— Mario Hewardt
- 《The Art of Debugging with GDB, DDD, and Eclipse》—— Norman Matloff

#### 12.5.3 实战项目

- 阅读 GDB 源码中 `gdb/testsuite/` 的测试用例,学习各种调试技巧
- 阅读开源项目(如 Redis、Nginx)的 CI 配置,学习工业级工具链集成
- 参与 OSS-Fuzz 项目,实战 fuzzing 与 sanitizer
## 参考与致谢

- GDB Manual: https://sourceware.org/gdb/current/onlinedocs/gdb/
- LLDB Tutorial: https://lldb.llvm.org/use/tutorial.html
- 《Debugging: The 9 Indispensable Rules》—— David Agans
- 《The Art of Debugging with GDB, DDD, and Eclipse》—— Norman Matloff

官方文档与书籍条目承接自本模块旧版「静态分析与调试」篇的参考资料区。

