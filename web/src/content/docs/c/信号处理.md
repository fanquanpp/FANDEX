---
order: 56
title: 信号处理
module: c
category: C
difficulty: intermediate
description: signal.h与信号处理
author: fanquanpp
updated: '2026-06-14'
related:
  - c/函数指针与回调
  - c/可变参数函数
  - c/原子操作与内存模型
  - c/泛型选择
prerequisites:
  - c/概述
---

# 信号处理 (Signal Handling)

## 第 1 章 引言与学习路径

### 1.1 为什么信号处理是系统编程的核心能力

在 Unix 哲学中,信号(Signal)是操作系统与进程之间最基础的异步通信机制。当你按下 `Ctrl+C` 终止一个失控的程序,当你用 `kill -9` 强杀一个僵尸进程,当一个进程访问非法内存地址触发段错误,当定时器到期唤醒一个休眠的服务器——所有这些场景背后,都是信号在运作。

信号处理之所以是系统编程工程师的必备能力,原因有三:

- **异步性**:信号可以在任意指令处打断程序执行,这与同步的函数调用完全不同
- **不可控性**:信号到达时机由操作系统决定,程序员无法预知
- **安全性约束**:信号处理函数运行在特殊的上下文中,大量常见的库函数都不能调用

一个不理解信号处理的 C 工程师,无法写出真正可靠的服务端程序。Redis、Nginx、Apache、PostgreSQL 这些世界级的 C 项目中,信号处理代码虽然不多,但每一行都经过精心设计,因为信号处理中的任何错误都可能导致整个服务崩溃。

### 1.2 信号处理的核心挑战

信号处理之所以困难,源于以下几个根本性的技术挑战:

#### 1.2.1 异步中断的可重入性问题

当主程序正在执行 `printf` 这类非可重入函数时,信号到达并触发处理函数,而处理函数又调用了 `printf`,就会导致内部数据结构损坏。这是信号处理中最经典的陷阱:

```c
#include <stdio.h>
#include <signal.h>

void handler(int sig) {
    // 危险!如果主程序正在执行 printf,这里再次调用 printf
    // 可能导致 stdio 内部缓冲区数据结构损坏
    printf("收到信号 %d\n", sig);
}

int main(void) {
    signal(SIGINT, handler);
    while (1) {
        printf("工作中...\n");  // 主程序频繁调用 printf
    }
    return 0;
}
```

#### 1.2.2 信号处理函数的运行上下文

信号处理函数运行在"信号上下文"(signal context)中,它使用主线程的栈(默认情况下),但不受主线程任何同步机制保护。这意味着:

- 主线程持有的锁,信号处理函数若尝试获取相同锁,会立即死锁
- 主线程正在修改的数据结构,信号处理函数看到的可能是不一致状态
- 信号处理函数中调用 `malloc` 可能导致堆数据结构损坏

#### 1.2.3 信号传递的不可靠性

标准信号(Standard Signals)在传递过程中存在多种不可靠性:

- **信号丢失**:同一信号在处理期间多次到达,只记录一次(不排队)
- **信号合并**:多个相同信号可能合并为一个
- **递送顺序**:不同信号之间的递送顺序未指定

POSIX 实时信号(Real-time Signals)解决了这些问题,但使用复杂度更高。

### 1.3 本文档的目标读者

本文档面向以下读者:

- **C 系统编程学习者**:希望编写守护进程、服务器程序
- **嵌入式开发者**:在资源受限环境中处理硬件中断与信号
- **安全工程师**:分析信号相关漏洞与竞态条件
- **面试准备者**:信号处理是 Unix 系统编程面试的高频考点

### 1.4 学习路径建议

本文档采用 12 章递进式结构:

1. **第 1 章 引言**:建立对信号处理的整体认识
2. **第 2 章 历史与设计**:从 Unix V6 信号到 POSIX 实时信号
3. **第 3 章 核心概念**:信号编号、信号掩码、信号上下文
4. **第 4 章 API 详解**:signal/sigaction/sigprocmask 等
5. **第 5 章 信号处理函数安全**:async-signal-safe 函数与可重入性
6. **第 6 章 实战模式**:优雅退出、定时器、子进程回收等
7. **第 7 章 常见陷阱**:竞态条件、不可重入函数、信号丢失
8. **第 8 章 性能与可移植性**:不同系统的信号开销差异
9. **第 9 章 跨平台考量**:Linux/Windows/macOS 信号差异
10. **第 10 章 高级主题**:实时信号、signalfd、自管道模式
11. **第 11 章 高级应用**:多线程信号处理与并发安全
12. **第 12 章 总结与最佳实践**:工业级项目的信号处理策略

### 1.5 阅读前的预备知识

在开始阅读本文档前,你应该:

- 掌握 C 基本语法、函数指针、`volatile` 关键字
- 理解进程的概念与进程地址空间布局
- 了解操作系统的中断与异常处理机制
- 熟悉 Linux 基本命令(`kill`、`ps`、`strace`)
- 能够在 Linux/Unix 环境下编译运行 C 程序

## 第 2 章 历史演进与设计哲学

### 2.1 信号的起源:Unix V6 与 V7

信号的最早实现出现在 1970 年代的 Unix V4。在 Unix V6 (1975 年) 中,信号机制已经初具雏形,但功能非常有限:

- 只有 13 个信号(编号 1-13)
- 信号处理函数执行后,信号处理自动重置为默认值(`SIG_DFL`)
- 没有信号屏蔽机制
- 信号可能在程序执行的任意指令处打断,包括正在执行系统调用时

这一时期的 `signal` 函数原型:

```c
int (*signal(int sig, int (*func)()))();
```

注意 K&R 风格的函数声明——参数类型为空表示接受任意参数,返回 `int (*)()` 表示返回一个函数指针。

### 2.2 4.2BSD 的可靠信号

1983 年的 4.2BSD 引入了一系列改进,使信号机制更加可靠:

- **信号屏蔽**:`sigblock`、`sigsetmask` 函数允许临时屏蔽信号
- **信号处理函数不重置**:处理函数执行后保持注册状态
- **系统调用自动重启**:被信号中断的系统调用自动重启
- **新增信号**:`SIGCHLD`、`SIGWINCH` 等

4.2BSD 的 `sigvec` 函数是 `sigaction` 的前身:

```c
int sigvec(int sig, struct sigvec *vec, struct sigvec *ovec);
```

### 2.3 POSIX.1 标准化

1988 年的 POSIX.1 (IEEE Std 1003.1) 对信号机制进行了标准化,引入了现代的 `sigaction` 接口:

```c
int sigaction(int sig, const struct sigaction *act, struct sigaction *oldact);
```

POSIX 标准化了以下核心概念:

- **信号集**(`sigset_t`):用于表示多个信号
- **信号屏蔽**(`sigprocmask`):进程级信号屏蔽字
- **信号挂起**(`sigpending`):查询挂起的信号
- **同步等待**(`sigsuspend`、`sigwait`):替代异步处理的同步方式

### 2.4 POSIX 实时信号

POSIX.1b (1993 年) 引入了实时信号(Real-time Signals),解决了标准信号的多个缺陷:

- **排队传递**:同一信号多次到达会排队,不会丢失
- **有序递送**:多个实时信号按发送顺序递送
- **携带数据**:可以携带一个 `siginfo_t` 结构,包含发送者 PID、UID 等

实时信号的范围是 `[SIGRTMIN, SIGRTMAX]`,具体值因系统而异:

```c
#include <signal.h>

// Linux 上通常 SIGRTMIN=34, SIGRTMAX=64
printf("SIGRTMIN = %d\n", SIGRTMIN);
printf("SIGRTMAX = %d\n", SIGRTMAX);
```

### 2.5 现代信号机制的设计哲学

现代 Unix/Linux 信号机制体现了以下设计哲学:

#### 2.5.1 异步优先,同步补充

传统信号采用"异步中断"模型:信号到达时立即打断主程序,跳转到处理函数。这种模型难以编写正确,因此 POSIX 后来引入了同步等待机制:

- `sigwait`:在指定线程中同步等待信号
- `signalfd` (Linux 特有):将信号转换为文件描述符,可用 `select`/`poll`/`epoll` 监听

现代推荐做法是**尽量使用同步模型**,仅在必要时使用异步处理。

#### 2.5.2 最小化处理函数

信号处理函数应尽可能短小,通常只设置一个 `volatile sig_atomic_t` 标志,由主循环检查并处理。这一原则被称为"deferred work":

```c
static volatile sig_atomic_t exit_requested = 0;

void handler(int sig) {
    (void)sig;
    exit_requested = 1;  // 只设置标志,不做其他工作
}

int main(void) {
    signal(SIGINT, handler);
    while (!exit_requested) {
        // 主循环做实际工作
    }
    // 清理资源后退出
    return 0;
}
```

#### 2.5.3 显式优于隐式

`sigaction` 相比 `signal` 的优势在于"显式":所有行为(信号屏蔽、标志、重置策略)都必须显式指定,没有隐含的"历史包袱"。这一原则贯穿 POSIX 设计。

## 第 3 章 核心概念与术语体系

### 3.1 信号编号

每个信号都有一个唯一的整数编号。标准信号编号定义在 `<signal.h>` 中,常见信号如下:

| 信号        | 编号 (Linux x86_64) | 默认动作 | 说明                          |
| ----------- | ------------------- | -------- | ----------------------------- |
| `SIGHUP`    | 1                   | 终止     | 挂起(终端断开)               |
| `SIGINT`    | 2                   | 终止     | 中断(Ctrl+C)                  |
| `SIGQUIT`   | 3                   | 终止+core| 退出(Ctrl+\)                  |
| `SIGILL`    | 4                   | 终止+core| 非法指令                      |
| `SIGABRT`   | 6                   | 终止+core| 由 `abort()` 产生             |
| `SIGFPE`    | 8                   | 终止+core| 算术异常(如除零)             |
| `SIGKILL`   | 9                   | 终止     | 强制终止(不可捕获)           |
| `SIGSEGV`   | 11                  | 终止+core| 段错误(非法内存访问)         |
| `SIGPIPE`   | 13                  | 终止     | 管道破裂                      |
| `SIGALRM`   | 14                  | 终止     | `alarm()` 定时器到期          |
| `SIGTERM`   | 15                  | 终止     | 请求终止                      |
| `SIGUSR1`   | 10                  | 终止     | 用户自定义 1                  |
| `SIGUSR2`   | 12                  | 终止     | 用户自定义 2                  |
| `SIGCHLD`   | 17                  | 忽略     | 子进程状态改变                |
| `SIGCONT`   | 18                  | 继续     | 继续运行(若停止)             |
| `SIGSTOP`   | 19                  | 停止     | 停止(不可捕获)               |
| `SIGTSTP`   | 20                  | 停止     | 终端停止(Ctrl+Z)              |
| `SIGTTIN`   | 21                  | 停止     | 后台进程读终端                |
| `SIGTTOU`   | 22                  | 停止     | 后台进程写终端                |

**注意**:信号编号在不同 Unix 系统上可能不同。例如,`SIGCHLD` 在 Linux 上是 17,在 macOS 上是 20。因此,代码中**始终使用符号名**,不要使用数字。

### 3.2 信号的默认动作

每个信号都有一个"默认动作"(Default Action),即当进程没有显式处理该信号时,操作系统执行的动作。默认动作分为以下几类:

- **终止**(Terminate):进程立即退出
- **终止 + core dump**(Core Dump):进程退出并生成核心转储文件
- **忽略**(Ignore):信号被丢弃,不产生任何效果
- **停止**(Stop):进程暂停执行,直到收到 `SIGCONT`
- **继续**(Continue):若进程处于停止状态,则继续执行

`SIGKILL` 和 `SIGSTOP` 是两个特殊的信号,它们的默认动作不能被改变(不能被捕获、阻塞或忽略)。这是操作系统为了保证能强制终止失控进程而保留的"最后手段"。

### 3.3 信号处理函数

进程通过注册"信号处理函数"(Signal Handler)来改变信号的默认动作。处理函数的原型为:

```c
void handler(int sig);
```

这是最简单的"无信息"处理函数,只能知道"哪个信号到达"。

更高级的 `sigaction` 允许注册带信息的处理函数:

```c
void handler(int sig, siginfo_t *info, void *ucontext);
```

其中 `siginfo_t` 包含信号的详细信息:

```c
typedef struct {
    int      si_signo;    // 信号编号
    int      si_code;     // 信号来源
    pid_t    si_pid;      // 发送进程 PID (适用于 kill 发送)
    uid_t    si_uid;      // 发送进程 UID
    int      si_status;   // 退出状态 (适用于 SIGCHLD)
    void    *si_addr;     // 触发地址 (适用于 SIGSEGV/SIGFPE)
    int      si_fd;       // 文件描述符 (适用于 SIGIO)
    // ... 其他字段
} siginfo_t;
```

### 3.4 信号掩码

每个进程都有一个"信号掩码"(Signal Mask),定义了哪些信号被阻塞。被阻塞的信号在到达后不会立即递送,而是成为"挂起信号"(Pending Signal),待解除阻塞后才递送。

信号掩码的数据类型是 `sigset_t`,通常是一个位图:

```c
// 假设 sigset_t 是 64 位整数
// 第 N 位为 1 表示信号 N 被阻塞
typedef struct {
    unsigned long __val[_SIGSET_NWORDS];
} sigset_t;
```

Linux 上 `sigset_t` 通常是 128 字节,支持 1024 个信号位。

### 3.5 信号生命周期

一个信号从产生到递送,经历以下阶段:

```
[信号产生]  →  [信号挂起]  →  [信号递送]  →  [处理函数执行]  →  [返回主程序]
   |              |              |               |
   |              |              |               +-- 信号掩码被临时修改
   |              |              +-- 检查信号掩码,若阻塞则继续挂起
   |              +-- 进入进程的挂起信号集
   +-- kill/raise/硬件异常/...
```

关键术语:

- **产生**(Generation):信号由内核或其他进程产生
- **挂起**(Pending):信号已产生但未递送,可能因被阻塞
- **递送**(Delivery):信号被传递给进程的处理逻辑
- **接受**(Acceptance):进程实际执行信号处理逻辑

### 3.6 信号处理的两种模式

#### 3.6.1 异步处理(Asynchronous Handling)

传统的信号处理方式,信号到达时立即打断主程序:

```c
void handler(int sig) {
    // 在任意时刻被调用
}

int main(void) {
    signal(SIGINT, handler);
    while (1) {
        work();  // 任意时刻可能被打断
    }
}
```

优点:响应及时
缺点:难以编写正确的处理函数,可重入性约束严格

#### 3.6.2 同步处理(Synchronous Handling)

进程主动等待信号,信号不会打断主程序:

```c
int main(void) {
    sigset_t set;
    sigemptyset(&set);
    sigaddset(&set, SIGINT);
    sigprocmask(SIG_BLOCK, &set, NULL);  // 阻塞 SIGINT

    while (1) {
        int sig;
        sigwait(&set, &sig);  // 同步等待信号
        printf("收到信号 %d\n", sig);
    }
}
```

优点:处理逻辑在主上下文执行,无重入约束
缺点:响应延迟取决于主循环的繁忙程度

### 3.7 信号与中断的区别

虽然信号被称为"软件中断"(Software Interrupt),但它与硬件中断有本质区别:

| 特性     | 硬件中断                 | 信号                       |
| -------- | ------------------------ | -------------------------- |
| 触发源   | 硬件设备                 | 内核或进程                 |
| 处理上下文 | 中断上下文(不可睡眠) | 进程上下文(可调用部分系统调用) |
| 响应延迟 | 微秒级                   | 毫秒级                     |
| 可屏蔽性 | 通过中断控制器           | 通过信号掩码               |
| 优先级   | 有硬件优先级             | 无优先级(按编号顺序处理)   |

## 第 4 章 API 详解

### 4.1 signal 函数

`signal` 是最早的信号注册函数,其原型在 `<signal.h>` 中:

```c
void (*signal(int sig, void (*func)(int)))(int);
```

参数:
- `sig`:要注册的信号编号
- `func`:处理函数,可以是:
  - 用户定义的函数指针
  - `SIG_DFL`:恢复默认动作
  - `SIG_IGN`:忽略信号

返回值:
- 成功:之前的信号处理函数指针
- 失败:`SIG_ERR`,并设置 `errno`

**重要警告**:`signal` 的行为在不同 Unix 系统上不一致。在 System V 派生系统上,信号处理函数执行后会自动重置为 `SIG_DFL`(BSD 不会)。因此,**生产代码应避免使用 `signal`,改用 `sigaction`**。

#### 4.1.1 signal 的可移植用法

如果必须使用 `signal`,可以用以下包装实现可移植行为:

```c
#include <signal.h>

/* 可移植的 signal 安装函数,行为类似 BSD (不重置,系统调用重启) */
void (*install_signal(int sig, void (*func)(int)))(int) {
    struct sigaction sa, old_sa;

    sa.sa_handler = func;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_RESTART;  /* 系统调用自动重启 */

    if (sigaction(sig, &sa, &old_sa) == -1) {
        return SIG_ERR;
    }
    return old_sa.sa_handler;
}

#define signal(sig, func) install_signal((sig), (func))
```

### 4.2 sigaction 函数

`sigaction` 是 POSIX 标准推荐的信号注册方式,提供精确控制:

```c
int sigaction(int sig, const struct sigaction *act, struct sigaction *oldact);
```

参数:
- `sig`:要注册的信号编号
- `act`:新的处理方式(NULL 表示只查询)
- `oldact`:保存旧的处理方式(NULL 表示不保存)

返回值:0 成功,-1 失败并设置 `errno`

#### 4.2.1 struct sigaction

```c
struct sigaction {
    union {
        void (*sa_handler)(int);                          // 简单处理函数
        void (*sa_sigaction)(int, siginfo_t *, void *);   // 带信息处理函数
    } __sigaction_handler;

    sigset_t sa_mask;      // 处理函数执行期间额外阻塞的信号
    int      sa_flags;     // 控制行为的标志
    void     (*sa_restorer)(void);  // 已废弃,不要使用
};

#define sa_handler   __sigaction_handler.sa_handler
#define sa_sigaction __sigaction_handler.sa_sigaction
```

#### 4.2.2 sa_flags 常用标志

| 标志            | 说明                                              |
| --------------- | ------------------------------------------------- |
| `SA_RESTART`    | 被信号中断的系统调用自动重启                       |
| `SA_NOCLDSTOP`  | 子进程停止时不发送 SIGCHLD(仅对 SIGCHLD 有效)    |
| `SA_NOCLDWAIT`  | 子进程退出时不变成僵尸(仅对 SIGCHLD 有效)        |
| `SA_NODEFER`    | 处理函数执行期间不自动阻塞当前信号                |
| `SA_RESETHAND`  | 处理函数执行后重置为 SIG_DFL                       |
| `SA_SIGINFO`    | 使用 sa_sigaction 而非 sa_handler                  |
| `SA_ONSTACK`    | 使用 sigaltstack 设置的备用栈                      |

#### 4.2.3 sigaction 完整示例

```c
#include <stdio.h>
#include <signal.h>
#include <string.h>
#include <unistd.h>

static volatile sig_atomic_t got_signal = 0;
static int received_signal = 0;

/* 带信息的信号处理函数 */
static void info_handler(int sig, siginfo_t *info, void *ctx) {
    (void)ctx;
    received_signal = sig;
    got_signal = 1;

    /* 使用 async-signal-safe 函数输出信息 */
    const char *msg = "Signal received\n";
    write(STDERR_FILENO, msg, strlen(msg));
}

int main(void) {
    struct sigaction sa;

    /* 初始化 sigaction 结构 */
    memset(&sa, 0, sizeof(sa));
    sa.sa_sigaction = info_handler;
    sigemptyset(&sa.sa_mask);

    /* 处理期间阻塞 SIGUSR2,防止嵌套 */
    sigaddset(&sa.sa_mask, SIGUSR2);

    /* 使用带信息模式,系统调用自动重启 */
    sa.sa_flags = SA_SIGINFO | SA_RESTART;

    if (sigaction(SIGUSR1, &sa, NULL) == -1) {
        perror("sigaction");
        return 1;
    }

    printf("PID=%d, 等待 SIGUSR1...\n", getpid());

    while (!got_signal) {
        pause();
    }

    printf("收到信号 %d\n", received_signal);
    return 0;
}
```

### 4.3 kill 函数

`kill` 用于向指定进程发送信号:

```c
#include <sys/types.h>
#include <signal.h>

int kill(pid_t pid, int sig);
```

参数 `pid` 的含义:

| pid 值 | 含义                                       |
| ------ | ------------------------------------------ |
| `> 0`  | 向 PID 为 pid 的进程发送                   |
| `== 0` | 向同进程组的所有进程发送                   |
| `== -1`| 向调用进程有权限发送的所有进程发送(广播) |
| `< -1` | 向进程组 ID 为 -pid 的所有进程发送         |

返回值:0 成功,-1 失败并设置 `errno`

**权限规则**:发送进程的 RUID/EUID 必须等于接收进程的 RUID/EUID,或者发送进程具有 CAP_KILL 能力(Linux)。

```c
#include <stdio.h>
#include <signal.h>
#include <unistd.h>
#include <sys/types.h>

int main(void) {
    pid_t pid = fork();
    if (pid == 0) {
        /* 子进程 */
        printf("子进程 PID=%d,等待信号\n", getpid());
        pause();
        printf("子进程收到信号,退出\n");
        return 0;
    } else {
        /* 父进程 */
        sleep(1);
        printf("父进程向子进程发送 SIGUSR1\n");
        kill(pid, SIGUSR1);
        wait(NULL);
    }
    return 0;
}
```

### 4.4 raise 函数

`raise` 向当前进程发送信号:

```c
#include <signal.h>

int raise(int sig);
```

相当于 `kill(getpid(), sig)`,但在单线程程序中等价,在多线程程序中是 `pthread_kill(pthread_self(), sig)`。

```c
#include <stdio.h>
#include <signal.h>

void handler(int sig) {
    printf("处理信号 %d\n", sig);
}

int main(void) {
    signal(SIGUSR1, handler);

    printf("向自己发送 SIGUSR1\n");
    raise(SIGUSR1);  /* 同步调用处理函数 */

    printf("信号处理完成\n");
    return 0;
}
```

### 4.5 sigqueue 函数

`sigqueue` 是 `kill` 的增强版,可以向接收进程附加一个值:

```c
#include <signal.h>

int sigqueue(pid_t pid, int sig, const union sigval value);
```

`union sigval` 可以是整数或指针:

```c
union sigval {
    int   sival_int;    /* 整数值 */
    void *sival_ptr;    /* 指针值(仅在同一进程内有意义) */
};
```

接收端必须使用 `SA_SIGINFO` 标志注册处理函数才能获取附加数据:

```c
#include <stdio.h>
#include <signal.h>
#include <unistd.h>
#include <sys/types.h>

void handler(int sig, siginfo_t *info, void *ctx) {
    (void)sig; (void)ctx;
    printf("收到信号,附加数据 = %d\n", info->si_value.sival_int);
}

int main(void) {
    struct sigaction sa;
    sa.sa_sigaction = handler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_SIGINFO;
    sigaction(SIGRTMIN, &sa, NULL);

    pid_t pid = fork();
    if (pid == 0) {
        /* 子进程:向父进程发送带数据的实时信号 */
        sleep(1);
        union sigval v;
        v.sival_int = 42;
        sigqueue(getppid(), SIGRTMIN, v);
        return 0;
    } else {
        /* 父进程:等待信号 */
        printf("等待子进程发送信号...\n");
        pause();
    }
    return 0;
}
```

### 4.6 alarm 函数

`alarm` 设置一个定时器,到期后向进程发送 `SIGALRM`:

```c
#include <unistd.h>

unsigned int alarm(unsigned int seconds);
```

参数 `seconds` 为 0 时取消之前的定时器。返回值是之前定时器的剩余秒数。

**注意**:`alarm` 只能设置一个定时器,新的设置会覆盖旧的。如果需要多个定时器,使用 `setitimer` 或 `timer_create`。

```c
#include <stdio.h>
#include <unistd.h>
#include <signal.h>

static volatile sig_atomic_t timer_fired = 0;

void alarm_handler(int sig) {
    (void)sig;
    timer_fired = 1;
}

int main(void) {
    signal(SIGALRM, alarm_handler);
    alarm(3);

    printf("3 秒后触发定时器\n");
    while (!timer_fired) {
        pause();
    }
    printf("定时器触发!\n");

    return 0;
}
```

### 4.7 setitimer 与 timer_create

#### 4.7.1 setitimer (传统接口)

`setitimer` 提供比 `alarm` 更精细的定时器控制:

```c
#include <sys/time.h>

int setitimer(int which, const struct itimerval *new, struct itimerval *old);

struct itimerval {
    struct timeval it_interval;  /* 间隔时间(0 表示单次) */
    struct timeval it_value;     /* 首次到期时间 */
};

struct timeval {
    time_t      tv_sec;   /* 秒 */
    suseconds_t tv_usec;  /* 微秒 */
};
```

`which` 参数:

- `ITIMER_REAL`:实时计时,到期发送 `SIGALRM`
- `ITIMER_VIRTUAL`:仅进程用户态执行时计时,到期发送 `SIGVTALRM`
- `ITIMER_PROF`:进程用户态 + 内核态计时,到期发送 `SIGPROF`

```c
#include <stdio.h>
#include <sys/time.h>
#include <signal.h>

int counter = 0;

void timer_handler(int sig) {
    (void)sig;
    counter++;
    printf("定时器触发,计数 = %d\n", counter);
}

int main(void) {
    signal(SIGALRM, timer_handler);

    struct itimerval timer;
    timer.it_value.tv_sec = 1;       /* 首次 1 秒后触发 */
    timer.it_value.tv_usec = 0;
    timer.it_interval.tv_sec = 0;    /* 之后每 500ms 触发 */
    timer.it_interval.tv_usec = 500000;

    setitimer(ITIMER_REAL, &timer, NULL);

    while (counter < 5) {
        pause();
    }

    /* 关闭定时器 */
    timer.it_value.tv_sec = 0;
    timer.it_value.tv_usec = 0;
    timer.it_interval.tv_sec = 0;
    timer.it_interval.tv_usec = 0;
    setitimer(ITIMER_REAL, &timer, NULL);

    printf("定时器已关闭\n");
    return 0;
}
```

#### 4.7.2 timer_create (POSIX.1b)

`timer_create` 是更现代的定时器接口,支持纳秒级精度和自定义信号:

```c
#include <signal.h>
#include <time.h>

int timer_create(clockid_t clockid, struct sigevent *evp, timer_t *timerid);
int timer_settime(timer_t timerid, int flags,
                  const struct itimerspec *new, struct itimerspec *old);
int timer_delete(timer_t timerid);
```

```c
#include <stdio.h>
#include <signal.h>
#include <time.h>
#include <unistd.h>

static volatile sig_atomic_t ticks = 0;

void timer_handler(int sig, siginfo_t *info, void *ctx) {
    (void)sig; (void)info; (void)ctx;
    ticks++;
}

int main(void) {
    /* 注册带信息的信号处理 */
    struct sigaction sa;
    sa.sa_sigaction = timer_handler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_SIGINFO;
    sigaction(SIGRTMIN, &sa, NULL);

    /* 创建定时器 */
    timer_t timerid;
    struct sigevent sev;
    sev.sigev_notify = SIGEV_SIGNAL;
    sev.sigev_signo = SIGRTMIN;
    sev.sigev_value.sival_ptr = &timerid;
    timer_create(CLOCK_MONOTONIC, &sev, &timerid);

    /* 启动定时器:首次 1 秒,之后每 100ms */
    struct itimerspec its;
    its.it_value.tv_sec = 1;
    its.it_value.tv_nsec = 0;
    its.it_interval.tv_sec = 0;
    its.it_interval.tv_nsec = 100 * 1000 * 1000;
    timer_settime(timerid, 0, &its, NULL);

    while (ticks < 20) {
        pause();
    }
    printf("共收到 %d 次定时器信号\n", ticks);

    timer_delete(timerid);
    return 0;
}
```

### 4.8 sigprocmask 函数

`sigprocmask` 用于检查或修改进程的信号掩码:

```c
#include <signal.h>

int sigprocmask(int how, const sigset_t *set, sigset_t *oldset);
```

`how` 参数:

- `SIG_BLOCK`:将 `set` 中的信号添加到当前掩码(并集)
- `SIG_UNBLOCK`:从当前掩码中移除 `set` 中的信号
- `SIG_SETMASK`:将当前掩码设置为 `set`

```c
#include <stdio.h>
#include <signal.h>
#include <unistd.h>

int main(void) {
    sigset_t block_set, old_set;

    /* 屏蔽 SIGINT */
    sigemptyset(&block_set);
    sigaddset(&block_set, SIGINT);

    printf("屏蔽 SIGINT 5 秒...\n");
    sigprocmask(SIG_BLOCK, &block_set, &old_set);

    sleep(5);

    /* 解除屏蔽,期间按 Ctrl+C 的信号现在才会递送 */
    printf("解除屏蔽\n");
    sigprocmask(SIG_SETMASK, &old_set, NULL);

    printf("等待 3 秒...\n");
    sleep(3);

    return 0;
}
```

### 4.9 sigpending 函数

`sigpending` 查询当前挂起的信号(已产生但未递送):

```c
#include <signal.h>

int sigpending(sigset_t *set);
```

```c
#include <stdio.h>
#include <signal.h>
#include <unistd.h>

int main(void) {
    sigset_t block_set, pending;

    sigemptyset(&block_set);
    sigaddset(&block_set, SIGUSR1);
    sigprocmask(SIG_BLOCK, &block_set, NULL);

    /* 屏蔽期间向自己发送 SIGUSR1 */
    raise(SIGUSR1);

    /* 查询挂起信号 */
    sigpending(&pending);
    if (sigismember(&pending, SIGUSR1)) {
        printf("SIGUSR1 正在挂起\n");
    }

    return 0;
}
```

### 4.10 sigsuspend 函数

`sigsuspend` 原子地"设置掩码 + 等待信号",解决了"检查-等待"之间的竞态:

```c
#include <signal.h>

int sigsuspend(const sigset_t *mask);
```

`mask` 是临时的信号掩码,`sigsuspend` 会:
1. 将进程掩码临时设为 `mask`
2. 阻塞等待信号
3. 信号递送并处理完成后,恢复原掩码

```c
#include <stdio.h>
#include <signal.h>
#include <unistd.h>

static volatile sig_atomic_t got_sigusr1 = 0;

void handler(int sig) {
    (void)sig;
    got_sigusr1 = 1;
}

int main(void) {
    signal(SIGUSR1, handler);

    /* 屏蔽 SIGUSR1 */
    sigset_t mask, oldmask;
    sigemptyset(&mask);
    sigaddset(&mask, SIGUSR1);
    sigprocmask(SIG_BLOCK, &mask, &oldmask);

    /* 模拟:fork 子进程发送信号 */
    if (fork() == 0) {
        sleep(1);
        kill(getppid(), SIGUSR1);
        return 0;
    }

    /* 等待 SIGUSR1,临时解除屏蔽 */
    while (!got_sigusr1) {
        sigset_t wait_mask = oldmask;
        sigaddset(&wait_mask, SIGUSR1);
        /* 错误示范:这里会有竞态
         * sigprocmask(SIG_SETMASK, &oldmask, NULL);
         * if (!got_sigusr1) pause();
         */
        /* 正确:用 sigsuspend 原子等待 */
        sigsuspend(&oldmask);
    }

    printf("收到 SIGUSR1\n");
    return 0;
}
```

### 4.11 sigwait 与 sigwaitinfo

#### 4.11.1 sigwait

`sigwait` 同步等待信号,不触发处理函数:

```c
#include <signal.h>

int sigwait(const sigset_t *set, int *sig);
```

要求 `set` 中的信号必须已被阻塞,`sigwait` 会从挂起队列中取出一个信号并返回。

```c
#include <stdio.h>
#include <signal.h>
#include <unistd.h>
#include <pthread.h>

int main(void) {
    sigset_t wait_set;
    int sig;

    sigemptyset(&wait_set);
    sigaddset(&wait_set, SIGINT);
    sigaddset(&wait_set, SIGTERM);

    /* 阻塞信号,以便用 sigwait 同步等待 */
    pthread_sigmask(SIG_BLOCK, &wait_set, NULL);

    printf("等待 SIGINT 或 SIGTERM...\n");
    sigwait(&wait_set, &sig);

    if (sig == SIGINT) {
        printf("收到 SIGINT\n");
    } else if (sig == SIGTERM) {
        printf("收到 SIGTERM\n");
    }

    return 0;
}
```

#### 4.11.2 sigwaitinfo 与 sigtimedwait

`sigwaitinfo` 返回信号的 `siginfo_t`,可以获取附加数据:

```c
#include <signal.h>

int sigwaitinfo(const sigset_t *set, siginfo_t *info);

struct timespec {
    time_t tv_sec;
    long   tv_nsec;
};
int sigtimedwait(const sigset_t *set, siginfo_t *info,
                 const struct timespec *timeout);
```

`sigtimedwait` 可以指定超时时间。

### 4.12 strsignal 与 psignal

用于将信号编号转换为可读字符串:

```c
#include <string.h>   /* strsignal */
#include <signal.h>   /* psignal */

char *strsignal(int sig);    /* 返回信号名称字符串 */
void psignal(int sig, const char *prefix);  /* 类似 perror,输出到 stderr */
```

```c
#include <stdio.h>
#include <signal.h>
#include <string.h>

int main(void) {
    for (int sig = 1; sig < NSIG; sig++) {
        printf("信号 %2d: %s\n", sig, strsignal(sig));
    }
    return 0;
}
```

## 第 5 章 信号处理函数安全

### 5.1 async-signal-safe 的定义

POSIX 定义了"异步信号安全"(async-signal-safe)的概念:一个函数如果可以在信号处理函数中安全调用,就称为 async-signal-safe。这些函数要么是可重入的(Reentrant),要么内部使用了信号屏蔽来保证原子性。

POSIX.1-2017 列出的 async-signal-safe 函数包括(部分):

```
_Exit          abort         accept        access        aio_error
aio_return     aio_suspend   alarm         bind          cfgetispeed
cfgetospeed    cfsetispeed   cfsetospeed   chdir         chmod
chown          close         connect       creat         dup
dup2           execl         execle        execlp        execv
execve         execvp        fchmod        fchown        fcntl
fdatasync      fork          fpathconf     fstat         fsync
ftruncate      getegid       geteuid       getgid        getgroups
getpeername    getpgrp       getpid        getppid       getsockname
getsockopt     getuid        kill          link          listen
lseek          lstat         mkdir         mkfifo        open
pathconf       pause         pipe          poll          posix_trace_event
pselect        raise         read          readlink      recv
recvfrom       recvmsg       rename        rmdir         select
sem_post       send          sendmsg       sendto        setgid
setpgid        setsid        setsockopt    setuid        shutdown
sigaction      sigaddset     sigdelset     sigemptyset   sigfillset
sigismember    signal        sigpause      sigpending    sigprocmask
sigqueue       sigset        sigsuspend    sleep         socket
socketpair     stat         symlink       sysconf       tcdrain
tcflow         tcflush       tcgetattr     tcgetpgrp     tcsendbreak
tcsetattr      tcsetpgrp     time          timer_getoverrun  timer_gettime
timer_settime  times         umask         uname         unlink
utime          wait          waitpid       write
```

**关键警告**:以下常见函数**不是** async-signal-safe,**不能**在信号处理函数中调用:

- `printf`、`fprintf`、`sprintf`、`snprintf`
- `malloc`、`calloc`、`realloc`、`free`
- `exit`(应使用 `_exit` 或 `_Exit`)
- `fopen`、`fclose`、`fread`、`fwrite`
- `syslog`
- 任何使用 `errno` 之外的静态数据的函数

### 5.2 为什么 printf 不安全

`printf` 不安全的原因:

1. **使用全局缓冲区**:stdio 函数使用进程内的缓冲区,主程序正在修改缓冲区时被信号打断,处理函数又调用 `printf`,会破坏缓冲区状态
2. **使用锁**:glibc 的 stdio 使用内部锁保证线程安全,若主程序持有锁时被信号打断,处理函数尝试获取同一锁会立即死锁
3. **调用 `malloc`**:某些情况下 `printf` 会调用 `malloc` 扩展缓冲区,而 `malloc` 不是 async-signal-safe

#### 5.2.1 安全的替代方案

如果必须在信号处理函数中输出信息,使用 `write`:

```c
#include <unistd.h>
#include <string.h>

void safe_log(const char *msg) {
    write(STDERR_FILENO, msg, strlen(msg));
}

void handler(int sig) {
    (void)sig;
    safe_log("信号已处理\n");
}
```

如果需要输出数字,可以手动转换:

```c
void safe_log_int(const char *prefix, int value) {
    char buf[64];
    int len = 0;

    /* 复制前缀 */
    while (prefix[len] && len < 50) {
        buf[len] = prefix[len];
        len++;
    }

    /* 将整数转为字符串(逆序写入再翻转) */
    char num[16];
    int num_len = 0;
    if (value == 0) {
        num[num_len++] = '0';
    } else {
        int v = value;
        while (v > 0 && num_len < 16) {
            num[num_len++] = '0' + (v % 10);
            v /= 10;
        }
    }
    /* 翻转并追加 */
    for (int i = num_len - 1; i >= 0 && len < 62; i--) {
        buf[len++] = num[i];
    }
    buf[len++] = '\n';

    write(STDERR_FILENO, buf, len);
}

void handler(int sig) {
    safe_log_int("收到信号 ", sig);
}
```

### 5.3 errno 的保护

信号处理函数若调用会修改 `errno` 的 async-signal-safe 函数(如 `write`),需要在进入时保存 `errno`,退出时恢复:

```c
#include <errno.h>
#include <unistd.h>
#include <string.h>

void handler(int sig) {
    (void)sig;
    int saved_errno = errno;  /* 保存 */

    const char *msg = "信号到达\n";
    write(STDERR_FILENO, msg, strlen(msg));  /* 可能修改 errno */

    errno = saved_errno;      /* 恢复 */
}
```

这是为了不破坏主程序中的 `errno` 值,例如主程序刚检查 `errno` 后被信号打断,处理函数中的系统调用修改了 `errno`,返回主程序后 `errno` 已不是预期值。

### 5.4 volatile sig_atomic_t 的使用

信号处理函数与主程序之间共享的标志变量,必须声明为 `volatile sig_atomic_t`:

- `volatile`:禁止编译器优化,确保每次都从内存读取(而不是寄存器)
- `sig_atomic_t`:保证读写操作的原子性(通常是 `int`)

```c
#include <signal.h>
#include <stdio.h>

/* 正确:使用 volatile sig_atomic_t */
static volatile sig_atomic_t exit_flag = 0;

void handler(int sig) {
    (void)sig;
    exit_flag = 1;  /* 原子写入 */
}

int main(void) {
    signal(SIGINT, handler);
    while (!exit_flag) {  /* 原子读取 */
        /* 工作 */
    }
    printf("退出\n");
    return 0;
}
```

**注意**:`sig_atomic_t` 只保证单个变量的原子读写,不保证复合操作的原子性。例如 `flag++` 不是原子的(读-改-写三步),在信号处理中应避免。

### 5.5 自管道模式 (Self-Pipe Trick)

自管道模式是一种将信号转换为文件描述符事件的技术,使信号可以被集成到事件循环中:

```c
#include <stdio.h>
#include <signal.h>
#include <unistd.h>
#include <fcntl.h>

static int pipe_fd[2];

void handler(int sig) {
    (void)sig;
    /* 信号处理函数只做一件事:向管道写一个字节 */
    char byte = 'x';
    write(pipe_fd[1], &byte, 1);
}

int main(void) {
    /* 创建管道 */
    pipe(pipe_fd);

    /* 设置写端非阻塞,防止管道满时阻塞 */
    fcntl(pipe_fd[1], F_SETFL, O_NONBLOCK);

    /* 注册信号处理 */
    signal(SIGINT, handler);
    signal(SIGTERM, handler);

    printf("等待信号(通过 poll 监听管道)...\n");

    while (1) {
        fd_set fds;
        FD_ZERO(&fds);
        FD_SET(pipe_fd[0], &fds);

        int ret = select(pipe_fd[0] + 1, &fds, NULL, NULL, NULL);
        if (ret > 0 && FD_ISSET(pipe_fd[0], &fds)) {
            /* 读出所有字节 */
            char buf[64];
            ssize_t n = read(pipe_fd[0], buf, sizeof(buf));
            printf("收到信号,读取 %zd 字节\n", n);
            break;
        }
    }

    return 0;
}
```

自管道模式的优点:

- 信号处理函数极简,只调用 `write`(async-signal-safe)
- 实际处理逻辑在主循环中执行,可以使用任意函数
- 可以与 `select`/`poll`/`epoll` 集成

### 5.6 signalfd (Linux 特有)

Linux 2.6.22 引入了 `signalfd`,将信号转换为文件描述符,是比自管道更优雅的方案:

```c
#include <sys/signalfd.h>

int signalfd(int fd, const sigset_t *mask, int flags);
```

```c
#include <stdio.h>
#include <signal.h>
#include <sys/signalfd.h>
#include <unistd.h>

int main(void) {
    sigset_t mask;
    sigemptyset(&mask);
    sigaddset(&mask, SIGINT);
    sigaddset(&mask, SIGTERM);

    /* 阻塞这些信号,以便 signalfd 接收 */
    sigprocmask(SIG_BLOCK, &mask, NULL);

    /* 创建 signalfd */
    int sfd = signalfd(-1, &mask, 0);

    printf("通过 signalfd 等待信号...\n");

    while (1) {
        struct signalfd_siginfo si;
        ssize_t n = read(sfd, &si, sizeof(si));
        if (n != sizeof(si)) {
            perror("read");
            break;
        }

        printf("收到信号 %d (PID=%d, UID=%d)\n",
               si.ssi_signo, si.ssi_pid, si.ssi_uid);

        if (si.ssi_signo == SIGTERM) {
            break;
        }
    }

    close(sfd);
    return 0;
}
```

## 第 6 章 实战模式

### 6.1 模式一:优雅退出

服务器程序收到 `SIGTERM`/`SIGINT` 后,不应立即退出,而应完成当前请求、关闭连接、保存状态。这是"优雅退出"(Graceful Shutdown)模式:

```c
#include <stdio.h>
#include <signal.h>
#include <stdlib.h>
#include <unistd.h>
#include <stdbool.h>

static volatile sig_atomic_t g_exit = 0;

static void exit_handler(int sig) {
    (void)sig;
    g_exit = 1;
}

static int install_exit_handler(void) {
    struct sigaction sa;
    sigemptyset(&sa.sa_mask);
    sa.sa_handler = exit_handler;
    sa.sa_flags = SA_RESTART;  /* 被中断的系统调用自动重启 */

    if (sigaction(SIGINT, &sa, NULL) == -1) return -1;
    if (sigaction(SIGTERM, &sa, NULL) == -1) return -1;
    return 0;
}

/* 模拟服务器主循环 */
static void server_loop(void) {
    int request_id = 0;
    while (!g_exit) {
        printf("处理请求 #%d...\n", ++request_id);
        sleep(1);  /* 模拟工作 */
    }
}

static void cleanup(void) {
    printf("正在关闭连接...\n");
    sleep(1);
    printf("正在保存状态...\n");
    sleep(1);
    printf("清理完成\n");
}

int main(void) {
    if (install_exit_handler() == -1) {
        perror("sigaction");
        return 1;
    }

    printf("服务器启动 (PID=%d),按 Ctrl+C 优雅退出\n", getpid());
    server_loop();

    cleanup();
    printf("服务器已退出\n");
    return 0;
}
```

### 6.2 模式二:带超时的操作

使用 `alarm` 实现操作超时,例如读操作不能超过 5 秒:

```c
#include <stdio.h>
#include <signal.h>
#include <unistd.h>
#include <setjmp.h>
#include <stdbool.h>

static sigjmp_buf jmp_buf;
static volatile sig_atomic_t timed_out = 0;

static void alarm_handler(int sig) {
    (void)sig;
    timed_out = 1;
    siglongjmp(jmp_buf, 1);  /* 跳转回 setjmp 处 */
}

/* 带超时的读取函数 */
ssize_t read_with_timeout(int fd, void *buf, size_t count, unsigned int seconds) {
    struct sigaction sa, old_sa;
    unsigned int old_alarm;

    /* 安装 SIGALRM 处理函数 */
    sa.sa_handler = alarm_handler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;
    sigaction(SIGALRM, &sa, &old_sa);

    /* 设置定时器 */
    old_alarm = alarm(seconds);

    /* 设置跳转点 */
    if (sigsetjmp(jmp_buf, 1) != 0) {
        /* 超时返回 */
        alarm(0);  /* 取消定时器 */
        sigaction(SIGALRM, &old_sa, NULL);
        if (old_alarm > 0) {
            /* 恢复旧定时器(粗略) */
            alarm(old_alarm);
        }
        return -1;  /* 超时 */
    }

    ssize_t n = read(fd, buf, count);

    /* 取消定时器 */
    alarm(0);
    sigaction(SIGALRM, &old_sa, NULL);
    if (old_alarm > 0) {
        alarm(old_alarm);
    }

    return n;
}

int main(void) {
    char buf[256];
    printf("输入内容(5 秒内):");
    fflush(stdout);

    ssize_t n = read_with_timeout(STDIN_FILENO, buf, sizeof(buf), 5);
    if (n < 0) {
        printf("\n超时!\n");
    } else {
        printf("\n读取了 %zd 字节\n", n);
    }
    return 0;
}
```

**注意**:`siglongjmp` 是 async-signal-safe 的,而 `longjmp` 不是。生产环境更推荐使用 `select`/`poll` 的超时机制,而非 `alarm`。

### 6.3 模式三:子进程回收

父进程 fork 子进程后,子进程退出会变成僵尸进程(Zombie),直到父进程调用 `wait`。使用 `SIGCHLD` 可以让父进程在子进程退出时自动回收:

```c
#include <stdio.h>
#include <signal.h>
#include <unistd.h>
#include <sys/wait.h>
#include <string.h>

static void sigchld_handler(int sig) {
    (void)sig;
    int saved_errno = errno;

    /* 循环回收所有已退出的子进程 */
    while (waitpid(-1, NULL, WNOHANG) > 0) {
        /* do nothing, just reap */
    }

    errno = saved_errno;
}

int main(void) {
    struct sigaction sa;
    sa.sa_handler = sigchld_handler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_RESTART | SA_NOCLDSTOP;
    sigaction(SIGCHLD, &sa, NULL);

    /* fork 5 个子进程 */
    for (int i = 0; i < 5; i++) {
        pid_t pid = fork();
        if (pid == 0) {
            /* 子进程 */
            printf("子进程 %d 启动\n", getpid());
            sleep(i + 1);  /* 各运行不同时间 */
            printf("子进程 %d 退出\n", getpid());
            return 0;
        }
    }

    /* 父进程继续工作 */
    printf("父进程等待子进程...\n");
    for (int i = 0; i < 10; i++) {
        printf("父进程工作中...\n");
        sleep(1);
    }

    return 0;
}
```

**关键点**:

- `SA_RESTART`:被 `SIGCHLD` 中断的系统调用自动重启
- `SA_NOCLDSTOP`:子进程停止(如 `SIGSTOP`)时不发送 `SIGCHLD`,只在退出时发送
- 循环 `waitpid` 而非单次,避免遗漏

### 6.4 模式四:配置重载

服务器收到 `SIGHUP` 时重载配置文件:

```c
#include <stdio.h>
#include <signal.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <stdbool.h>

typedef struct {
    int port;
    int max_connections;
    char log_file[256];
} Config;

static Config g_config;
static volatile sig_atomic_t g_reload = 0;

static void sighup_handler(int sig) {
    (void)sig;
    g_reload = 1;
}

static int load_config(const char *path, Config *cfg) {
    /* 简化:实际应解析配置文件 */
    cfg->port = 8080;
    cfg->max_connections = 100;
    strncpy(cfg->log_file, "/var/log/myapp.log", sizeof(cfg->log_file) - 1);
    return 0;
}

int main(void) {
    /* 初始加载配置 */
    if (load_config("/etc/myapp.conf", &g_config) != 0) {
        fprintf(stderr, "配置加载失败\n");
        return 1;
    }

    /* 注册 SIGHUP */
    struct sigaction sa;
    sa.sa_handler = sighup_handler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_RESTART;
    sigaction(SIGHUP, &sa, NULL);

    printf("服务器启动 (PID=%d),发送 SIGHUP 重载配置\n", getpid());

    while (1) {
        if (g_reload) {
            printf("收到 SIGHUP,重载配置...\n");
            Config new_config;
            if (load_config("/etc/myapp.conf", &new_config) == 0) {
                g_config = new_config;
                printf("配置重载成功:port=%d, max_conn=%d\n",
                       g_config.port, g_config.max_connections);
            } else {
                fprintf(stderr, "配置重载失败,保留旧配置\n");
            }
            g_reload = 0;
        }

        /* 主循环工作 */
        sleep(1);
    }

    return 0;
}
```

### 6.5 模式五:崩溃诊断

捕获 `SIGSEGV`/`SIGABRT` 等致命信号,打印调用栈用于诊断:

```c
#define _GNU_SOURCE
#include <stdio.h>
#include <signal.h>
#include <stdlib.h>
#include <unistd.h>
#include <execinfo.h>
#include <string.h>

#define MAX_BT_FRAMES 64

static void crash_handler(int sig) {
    void *frames[MAX_BT_FRAMES];
    int n;

    /* 保存 errno */
    int saved_errno = errno;

    /* 输出到 stderr */
    const char *msg1 = "\n*** 程序崩溃 ***\n";
    write(STDERR_FILENO, msg1, strlen(msg1));

    char sig_msg[128];
    int len = snprintf(sig_msg, sizeof(sig_msg), "信号: %d (%s)\n",
                       sig, strsignal(sig));
    write(STDERR_FILENO, sig_msg, len);

    /* 获取调用栈 */
    n = backtrace(frames, MAX_BT_FRAMES);
    if (n > 0) {
        const char *msg2 = "调用栈:\n";
        write(STDERR_FILENO, msg2, strlen(msg2));
        backtrace_symbols_fd(frames, n, STDERR_FILENO);
    }

    /* 恢复默认处理并重新发送信号,以便生成 core dump */
    signal(sig, SIG_DFL);
    raise(sig);

    errno = saved_errno;
    _exit(1);  /* 不应到达这里 */
}

static void install_crash_handler(void) {
    struct sigaction sa;
    sa.sa_handler = crash_handler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_RESETHAND;  /* 处理后重置,允许再次触发默认动作 */

    sigaction(SIGSEGV, &sa, NULL);
    sigaction(SIGABRT, &sa, NULL);
    sigaction(SIGFPE, &sa, NULL);
    sigaction(SIGILL, &sa, NULL);
    sigaction(SIGBUS, &sa, NULL);
}

/* 故意触发段错误 */
static void trigger_bug(void) {
    int *p = NULL;
    *p = 42;
}

int main(void) {
    install_crash_handler();

    printf("即将触发段错误...\n");
    trigger_bug();

    return 0;
}
```

编译时需要:

```bash
gcc -g -rdynamic crash.c -o crash
```

`-rdynamic` 确保符号表被保留,`backtrace_symbols` 才能输出函数名。

### 6.6 模式六:父子进程同步

使用 `SIGUSR1`/`SIGUSR2` 在父子进程间同步:

```c
#include <stdio.h>
#include <signal.h>
#include <unistd.h>
#include <sys/types.h>
#include <stdbool.h>

static volatile sig_atomic_t ready = 0;

static void handler(int sig) {
    (void)sig;
    ready = 1;
}

int main(void) {
    /* 注册 SIGUSR1 */
    signal(SIGUSR1, handler);

    pid_t pid = fork();
    if (pid < 0) {
        perror("fork");
        return 1;
    }

    if (pid == 0) {
        /* 子进程:等待父进程信号 */
        printf("子进程 (PID=%d) 等待父进程就绪\n", getpid());
        while (!ready) {
            pause();
        }
        printf("子进程:父进程已就绪,开始工作\n");

        /* 工作完成后通知父进程 */
        sleep(2);
        printf("子进程:工作完成\n");
        kill(getppid(), SIGUSR1);
        return 0;
    } else {
        /* 父进程:初始化后通知子进程 */
        printf("父进程 (PID=%d) 初始化中...\n", getpid());
        sleep(1);  /* 模拟初始化 */
        printf("父进程:初始化完成,通知子进程\n");
        kill(pid, SIGUSR1);

        /* 等待子进程完成 */
        printf("父进程:等待子进程完成\n");
        ready = 0;
        while (!ready) {
            pause();
        }
        printf("父进程:子进程已完成\n");
    }

    return 0;
}
```

### 6.7 模式七:防止僵尸进程

fork 后父进程不关心子进程状态,可以通过忽略 `SIGCHLD` 避免僵尸:

```c
#include <stdio.h>
#include <signal.h>
#include <unistd.h>
#include <sys/wait.h>

int main(void) {
    /* 忽略 SIGCHLD,内核自动回收子进程 */
    struct sigaction sa;
    sa.sa_handler = SIG_IGN;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_RESTART | SA_NOCLDWAIT;
    sigaction(SIGCHLD, &sa, NULL);

    for (int i = 0; i < 5; i++) {
        pid_t pid = fork();
        if (pid == 0) {
            printf("子进程 %d\n", getpid());
            sleep(1);
            return 0;
        }
    }

    /* 父进程不需要 wait,子进程不会变僵尸 */
    sleep(3);
    printf("父进程退出\n");
    return 0;
}
```

**注意**:`SA_NOCLDWAIT` 在某些系统上的行为可能不同,跨平台代码应显式调用 `waitpid`。

## 第 7 章 常见陷阱

### 7.1 陷阱一:在信号处理函数中调用非安全函数

最经典的陷阱:

```c
#include <stdio.h>
#include <signal.h>

void handler(int sig) {
    (void)sig;
    printf("收到信号\n");  /* 错误!printf 不是 async-signal-safe */
}

int main(void) {
    signal(SIGINT, handler);
    while (1) {
        printf("工作\n");  /* 主程序也用 printf,可能冲突 */
    }
}
```

**修复**:使用 `write` 或仅设置标志。

### 7.2 陷阱二:竞态条件

检查标志与等待信号之间存在窗口:

```c
static volatile sig_atomic_t got = 0;

void handler(int sig) {
    (void)sig;
    got = 1;
}

int main(void) {
    signal(SIGUSR1, handler);

    /* 竞态:如果在 if 检查后、pause 前信号到达,
     * pause 会一直等待(信号已丢失) */
    while (!got) {
        pause();  /* 危险! */
    }
    return 0;
}
```

**修复**:使用 `sigsuspend` 原子等待:

```c
sigset_t mask, oldmask;
sigemptyset(&mask);
sigaddset(&mask, SIGUSR1);
sigprocmask(SIG_BLOCK, &mask, &oldmask);

while (!got) {
    sigsuspend(&oldmask);  /* 原子:解除阻塞 + 等待 */
}
sigprocmask(SIG_SETMASK, &oldmask, NULL);
```

### 7.3 陷阱三:信号丢失

标准信号不排队,处理期间到达的同种信号最多只记录一次:

```c
void handler(int sig) {
    (void)sig;
    /* 处理期间,如果 SIGUSR1 到达 10 次,只会记录 1 次 */
}

int main(void) {
    signal(SIGUSR1, handler);
    /* 如果快速 raise(SIGUSR1) 多次,handler 只调用 1-2 次 */
    raise(SIGUSR1);
    raise(SIGUSR1);
    raise(SIGUSR1);  /* 可能只触发 1 次 handler */
}
```

**修复**:使用实时信号(`SIGRTMIN` 到 `SIGRTMAX`),它们会排队。

### 7.4 陷阱四:被中断的系统调用

慢系统调用(slow system call)如 `read` 从终端读取,被信号中断后返回 `EINTR`:

```c
char buf[256];
ssize_t n = read(STDIN_FILENO, buf, sizeof(buf));
if (n < 0 && errno == EINTR) {
    /* 被信号中断,但数据未读到 */
    /* 需要重新调用 read */
}
```

**修复**:使用 `SA_RESTART` 标志让系统调用自动重启,或手动重试:

```c
ssize_t n;
do {
    n = read(STDIN_FILENO, buf, sizeof(buf));
} while (n < 0 && errno == EINTR);
```

### 7.5 陷阱五:使用 longjmp 跳出处理函数

`longjmp` 不是 async-signal-safe,从信号处理函数中跳转可能导致数据结构损坏。POSIX 提供了 `sigsetjmp`/`siglongjmp`,它会保存和恢复信号掩码:

```c
#include <setjmp.h>

sigjmp_buf buf;

void handler(int sig) {
    (void)sig;
    /* 正确:使用 siglongjmp */
    siglongjmp(buf, 1);
    /* 错误:longjmp(buf, 1); 不会恢复信号掩码 */
}
```

但即使如此,跳出处理函数仍是危险操作,因为被中断的代码可能处于不一致状态。生产代码应避免。

### 7.6 陷阱六:不可重入函数与静态数据

许多函数使用静态数据,被信号打断后再次调用会损坏数据:

```c
#include <string.h>

void handler(int sig) {
    (void)sig;
    /* 错误:strtok 使用静态缓冲区,主程序可能正在用 */
    char *token = strtok(NULL, ",");
}
```

**修复**:使用可重入版本 `strtok_r`,或避免在处理函数中调用此类函数。

### 7.7 陷阱七:递归信号处理

默认情况下,处理函数执行期间,当前信号会被自动阻塞,防止递归。但如果使用 `SA_NODEFER` 标志,则会允许递归:

```c
void handler(int sig) {
    (void)sig;
    /* 危险:如果 SA_NODEFER 设置,处理期间又收到 SIGUSR1
     * 会递归调用 handler,可能导致栈溢出 */
}

int main(void) {
    struct sigaction sa;
    sa.sa_handler = handler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_NODEFER;  /* 危险! */
    sigaction(SIGUSR1, &sa, NULL);
    /* ... */
}
```

**修复**:除非有特殊需求,否则不要使用 `SA_NODEFER`。

### 7.8 陷阱八:fork 后的信号处理

`fork` 后子进程继承父进程的信号处理函数,但已挂起的信号不会继承。这可能导致问题:

```c
void handler(int sig) {
    (void)sig;
    /* ... */
}

int main(void) {
    signal(SIGUSR1, handler);
    raise(SIGUSR1);  /* 父进程挂起 SIGUSR1 */

    pid_t pid = fork();
    if (pid == 0) {
        /* 子进程:挂起的 SIGUSR1 不会继承
         * 但 handler 函数已继承,新信号会触发 */
    }
}
```

**关键规则**:

- 子进程继承信号掩码
- 子进程继承已安装的处理函数
- 子进程不继承挂起的信号

`exec` 后,所有被捕获的信号会重置为默认动作(因为原处理函数代码已被覆盖),但被忽略的信号保持忽略。

### 7.9 陷阱九:多线程中的信号

多线程程序中,信号处理更复杂:

- 信号处理函数是进程级的,任意线程都可能被调用
- 信号掩码是线程级的,每个线程可以独立设置
- `kill` 发送的信号会递送给"任意一个未阻塞该信号的线程"

```c
#include <pthread.h>
#include <signal.h>

void handler(int sig) {
    (void)sig;
    /* 哪个线程会被调用?未指定! */
}

int main(void) {
    signal(SIGINT, handler);

    pthread_t t1, t2;
    pthread_create(&t1, NULL, worker, NULL);
    pthread_create(&t2, NULL, worker, NULL);

    /* 如果按 Ctrl+C,可能 t1 或 t2 或主线程触发 handler */
}
```

**最佳实践**:多线程程序中,使用 `pthread_sigmask` 在主线程中阻塞信号,创建一个专用线程用 `sigwait` 同步处理。

### 7.10 陷阱十:SIGPIPE 导致服务器退出

向已关闭的 socket 写入会触发 `SIGPIPE`,默认动作是终止进程。网络服务器必须忽略此信号:

```c
#include <signal.h>

int main(void) {
    /* 忽略 SIGPIPE,改为检查 write 的返回值 */
    signal(SIGPIPE, SIG_IGN);

    /* 或者使用 send 的 MSG_NOSIGNAL 标志(Linux) */
    /* send(fd, buf, len, MSG_NOSIGNAL); */

    /* 服务器主循环 */
    /* ... */
}
```

### 7.11 陷阱十一:可移植性问题

`signal` 函数的行为在不同系统上不一致:

- System V:处理后被重置为 `SIG_DFL`
- BSD:处理后被重置为 `SIG_IGN`(实际上是"信号屏蔽")
- POSIX:未指定

```c
/* 不可移植的代码 */
signal(SIGINT, handler);
/* 在 System V 上,第一次按 Ctrl+C 后 handler 被重置
 * 第二次按 Ctrl+C 会使用默认动作(终止) */

/* 可移植的代码 */
struct sigaction sa;
sa.sa_handler = handler;
sigemptyset(&sa.sa_mask);
sa.sa_flags = SA_RESTART;
sigaction(SIGINT, &sa, NULL);
```

### 7.12 陷阱十二:errno 被破坏

信号处理函数中的系统调用会修改 `errno`,破坏主程序的错误检查:

```c
void handler(int sig) {
    (void)sig;
    write(fd, "msg", 3);  /* 可能修改 errno */
}

int main(void) {
    int ret = some_syscall();
    /* 如果信号在此时到达,handler 中的 write 修改 errno */
    if (ret < 0) {
        perror("error");  /* errno 可能不是 some_syscall 设置的 */
    }
}
```

**修复**:在处理函数中保存/恢复 `errno`。

## 第 8 章 性能与可移植性

### 8.1 信号处理的性能开销

信号处理的开销远高于函数调用:

- **上下文切换**:进入内核态再返回用户态
- **信号栈设置**:内核需要在用户态栈上保存上下文
- **处理函数调用**:间接跳转
- **返回与恢复**:恢复上下文,可能重启系统调用

在 x86_64 Linux 上,一次信号处理的典型开销是 1-5 微秒,而一次函数调用仅需纳秒级。对于高频信号(如 `SIGPROF` 采样),这一开销不可忽视。

### 8.2 减少信号处理开销的策略

#### 8.2.1 最小化处理函数

处理函数只设置标志,不做实际工作:

```c
static volatile sig_atomic_t flag = 0;

void handler(int sig) {
    (void)sig;
    flag = 1;  /* 极快 */
}
```

#### 8.2.2 使用 sigwait 替代异步处理

同步等待避免了上下文切换开销:

```c
sigset_t set;
sigemptyset(&set);
sigaddset(&set, SIGUSR1);
sigprocmask(SIG_BLOCK, &set, NULL);

int sig;
sigwait(&set, &sig);  /* 在主上下文处理,开销小 */
```

#### 8.2.3 使用 signalfd (Linux)

将信号转换为文件描述符,与事件循环集成:

```c
int sfd = signalfd(-1, &set, 0);
/* 用 epoll 监听 sfd */
```

### 8.3 信号处理的可移植性

不同系统的信号机制有差异:

| 特性             | Linux    | macOS    | FreeBSD  | Windows     |
| ---------------- | -------- | -------- | -------- | ----------- |
| `signal`         | 重置     | 不重置   | 不重置   | 不重置      |
| `sigaction`      | 支持     | 支持     | 支持     | 不支持      |
| `signalfd`       | 支持     | 不支持   | 不支持   | 不支持      |
| 实时信号         | 34-64    | 37-63    | 65-126   | 无          |
| `SIGCHLD` 编号   | 17       | 20       | 20       | N/A         |
| `kill` 权限检查  | CAP_KILL | EUID     | EUID     | N/A         |

**跨平台建议**:

1. 始终使用 `sigaction` 而非 `signal`
2. 使用符号名而非数字编号
3. 用 `#ifdef` 区分平台特性
4. Windows 平台考虑使用条件变量或事件对象替代信号

### 8.4 Windows 平台的信号

Windows 只支持有限的信号子集:

- `SIGINT`:Ctrl+C
- `SIGBREAK`:Ctrl+Break
- `SIGTERM`:`terminate` 调用
- `SIGABRT`:异常终止
- `SIGFPE`:浮点异常
- `SIGILL`:非法指令
- `SIGSEGV`:段错误

其他 Unix 信号在 Windows 上不可用。Windows 推荐使用:

- **事件对象**(Event):替代 `SIGUSR1`/`SIGUSR2` 的进程间通知
- **APC**(Asynchronous Procedure Call):替代信号处理
- **条件变量**:替代 `sigwait` 的同步等待

## 第 9 章 跨平台考量

### 9.1 平台差异概览

```c
/* 跨平台信号处理框架 */
#ifdef _WIN32
    /* Windows 平台 */
    #include <windows.h>

    static BOOL WINAPI console_handler(DWORD ctrl_type) {
        switch (ctrl_type) {
            case CTRL_C_EVENT:
            case CTRL_CLOSE_EVENT:
            case CTRL_BREAK_EVENT:
                /* 处理 Ctrl+C 等 */
                return TRUE;
            default:
                return FALSE;
        }
    }

    void install_exit_handler(void) {
        SetConsoleCtrlHandler(console_handler, TRUE);
    }

#elif defined(__linux__) || defined(__APPLE__) || defined(__FreeBSD__)
    /* Unix 平台 */
    #include <signal.h>

    static volatile sig_atomic_t g_exit = 0;

    static void exit_handler(int sig) {
        (void)sig;
        g_exit = 1;
    }

    void install_exit_handler(void) {
        struct sigaction sa;
        sa.sa_handler = exit_handler;
        sigemptyset(&sa.sa_mask);
        sa.sa_flags = SA_RESTART;
        sigaction(SIGINT, &sa, NULL);
        sigaction(SIGTERM, &sa, NULL);
    }
#endif
```

### 9.2 嵌入式平台

嵌入式系统(如 FreeRTOS、Zephyr)的信号支持有限:

- 通常没有完整的 POSIX 信号
- 使用任务通知(Task Notification)或事件组(Event Group)替代
- ISR(中断服务例程)有严格约束,类似信号处理函数

```c
/* FreeRTOS 示例:用任务通知替代信号 */
void ISR_handler(void) {
    BaseType_t higher_priority_task_woken = pdFALSE;
    vTaskNotifyGiveFromISR(worker_task, &higher_priority_task_woken);
    portYIELD_FROM_ISR(higher_priority_task_woken);
}

void worker_task(void *arg) {
    while (1) {
        ulTaskNotifyTake(pdTRUE, portMAX_DELAY);  /* 等待通知 */
        /* 处理 */
    }
}
```

### 9.3 实时系统

实时操作系统(RTOS)对信号有更高要求:

- **确定性**:信号延迟必须有上界
- **优先级**:高优先级信号应能抢占低优先级
- **避免抖动**:处理时间应稳定

POSIX 实时扩展提供了 `sigev_thread` 选项,在专用线程中处理信号:

```c
struct sigevent sev;
sev.sigev_notify = SIGEV_THREAD;
sev.sigev_notify_function = timer_callback;
sev.sigev_value.sival_ptr = &timer_data;
timer_create(CLOCK_MONOTONIC, &sev, &timerid);
```

## 第 10 章 高级主题

### 10.1 实时信号详解

实时信号(Real-time Signals)是 POSIX.1b 引入的增强信号机制:

- **范围**:`SIGRTMIN` 到 `SIGRTMAX`
- **排队**:同一信号多次到达会排队,不会丢失
- **有序**:多个信号按发送顺序递送
- **携带数据**:可附加 `sigval`(整数或指针)

```c
#include <signal.h>
#include <stdio.h>
#include <unistd.h>
#include <sys/types.h>

void rt_handler(int sig, siginfo_t *info, void *ctx) {
    (void)sig; (void)ctx;
    printf("收到实时信号,数据 = %d\n", info->si_value.sival_int);
}

int main(void) {
    struct sigaction sa;
    sa.sa_sigaction = rt_handler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_SIGINFO;
    sigaction(SIGRTMIN, &sa, NULL);

    /* 发送 10 个带不同数据的实时信号 */
    for (int i = 0; i < 10; i++) {
        union sigval v;
        v.sival_int = i;
        sigqueue(getpid(), SIGRTMIN, v);
    }

    /* 等待所有信号处理完成 */
    sleep(1);
    return 0;
}
```

**注意**:`SIGRTMIN` 和 `SIGRTMAX` 是函数而非宏(在某些实现中),因为它们的值可能受 libc 内部使用影响。不要使用 `SIGRTMIN + 0` 等表达式,而应保存到变量:

```c
int my_sig = SIGRTMIN + 5;  /* 可能有问题 */
/* 改为 */
int rt_base = SIGRTMIN;
int my_sig = rt_base + 5;   /* 安全 */
```

### 10.2 signalfd 深入

`signalfd` 是 Linux 2.6.22+ 提供的机制,将信号转换为文件描述符:

```c
#include <sys/signalfd.h>
#include <poll.h>
#include <stdio.h>

int main(void) {
    sigset_t mask;
    sigemptyset(&mask);
    sigaddset(&mask, SIGINT);
    sigaddset(&mask, SIGTERM);
    sigaddset(&mask, SIGUSR1);

    /* 阻塞信号,以便 signalfd 接收 */
    sigprocmask(SIG_BLOCK, &mask, NULL);

    /* 创建 signalfd */
    int sfd = signalfd(-1, &mask, SFD_CLOEXEC);

    /* 与其他 fd 一起监听 */
    struct pollfd fds[2];
    fds[0].fd = sfd;
    fds[0].events = POLLIN;
    fds[1].fd = STDIN_FILENO;
    fds[1].events = POLLIN;

    while (1) {
        poll(fds, 2, -1);

        if (fds[0].revents & POLLIN) {
            struct signalfd_siginfo si;
            read(sfd, &si, sizeof(si));
            printf("收到信号 %d\n", si.ssi_signo);
            if (si.ssi_signo == SIGTERM) break;
        }
        if (fds[1].revents & POLLIN) {
            char buf[64];
            fgets(buf, sizeof(buf), stdin);
            printf("输入:%s", buf);
        }
    }

    close(sfd);
    return 0;
}
```

### 10.3 sigaltstack:备用信号栈

当主栈溢出时(如递归过深),`SIGSEGV` 处理函数无法在主栈上运行。`sigaltstack` 提供备用栈:

```c
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>

#define STACK_SIZE (SIGSTKSZ * 2)

static void segv_handler(int sig) {
    (void)sig;
    const char *msg = "栈溢出已捕获\n";
    write(STDERR_FILENO, msg, strlen(msg));
    _exit(1);
}

int main(void) {
    /* 分配备用栈 */
    stack_t ss;
    ss.ss_sp = malloc(STACK_SIZE);
    ss.ss_size = STACK_SIZE;
    ss.ss_flags = 0;
    if (sigaltstack(&ss, NULL) == -1) {
        perror("sigaltstack");
        return 1;
    }

    /* 注册处理函数,使用 SA_ONSTACK */
    struct sigaction sa;
    sa.sa_handler = segv_handler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_ONSTACK;  /* 在备用栈上运行 */
    sigaction(SIGSEGV, &sa, NULL);

    /* 无限递归,触发栈溢出 */
    printf("即将触发栈溢出...\n");
    void recurse(void) {
        char buf[4096];
        memset(buf, 0, sizeof(buf));
        recurse();
    }
    recurse();

    return 0;
}
```

### 10.4 SA_SIGINFO 的高级用法

`SA_SIGINFO` 提供丰富的信号信息:

```c
void detailed_handler(int sig, siginfo_t *info, void *ucontext) {
    (void)ucontext;

    /* 信号来源 */
    switch (info->si_code) {
        case SI_USER:       /* kill 发送 */
            printf("来自 kill,发送者 PID=%d UID=%d\n",
                   info->si_pid, info->si_uid);
            break;
        case SI_KERNEL:     /* 内核发送 */
            printf("来自内核\n");
            break;
        case SI_QUEUE:      /* sigqueue 发送 */
            printf("来自 sigqueue,数据=%d\n",
                   info->si_value.sival_int);
            break;
        case SI_TIMER:      /* 定时器到期 */
            printf("来自定时器\n");
            break;
        case SI_ASYNCIO:    /* AIO 完成 */
            printf("AIO 完成\n");
            break;
    }

    /* 对于 SIGSEGV,si_addr 是触发地址 */
    if (sig == SIGSEGV) {
        printf("非法访问地址 %p\n", info->si_addr);
    }

    /* 对于 SIGCHLD,si_status 是子进程退出状态 */
    if (sig == SIGCHLD) {
        printf("子进程 PID=%d 退出,状态=%d\n",
               info->si_pid, info->si_status);
    }
}
```

### 10.5 信号与 ptrace

`ptrace` 允许跟踪进程拦截信号,用于调试器实现:

```c
#include <sys/ptrace.h>
#include <sys/wait.h>
#include <signal.h>

/* 调试器拦截被调试进程的信号 */
void tracer_loop(pid_t child) {
    int status;
    while (1) {
        waitpid(child, &status, 0);

        if (WIFEXITED(status)) {
            printf("子进程退出\n");
            break;
        }

        if (WIFSTOPPED(status)) {
            int sig = WSTOPSIG(status);
            if (sig == SIGTRAP) {
                printf("断点命中\n");
                ptrace(PTRACE_CONT, child, 0, 0);  /* 继续 */
            } else {
                printf("收到信号 %d,传递给子进程\n", sig);
                ptrace(PTRACE_CONT, child, 0, sig);  /* 传递信号 */
            }
        }
    }
}
```

## 第 11 章 高级应用:多线程信号处理

### 11.1 多线程信号模型

多线程程序中,信号机制更复杂:

- **进程级**:信号处理函数是进程级的,所有线程共享
- **线程级**:信号掩码是线程级的,每个线程独立
- **递送**:同步信号(如 `SIGSEGV`)递送给触发线程,异步信号(如 `SIGINT`)递送给任意未阻塞线程

### 11.2 推荐模型:专用信号线程

最佳实践是创建一个专用线程处理信号:

```c
#include <pthread.h>
#include <signal.h>
#include <stdio.h>
#include <unistd.h>

static volatile sig_atomic_t g_exit = 0;

/* 信号处理线程 */
static void *signal_thread(void *arg) {
    (void)arg;
    sigset_t set;
    int sig;

    sigemptyset(&set);
    sigaddset(&set, SIGINT);
    sigaddset(&set, SIGTERM);
    sigaddset(&set, SIGHUP);

    while (!g_exit) {
        sigwait(&set, &sig);  /* 同步等待 */
        printf("信号线程收到 %d\n", sig);

        switch (sig) {
            case SIGINT:
            case SIGTERM:
                g_exit = 1;
                break;
            case SIGHUP:
                printf("重载配置\n");
                break;
        }
    }
    return NULL;
}

/* 工作线程 */
static void *worker_thread(void *arg) {
    (void)arg;
    while (!g_exit) {
        printf("工作线程运行中\n");
        sleep(1);
    }
    return NULL;
}

int main(void) {
    /* 主线程阻塞所有信号 */
    sigset_t set;
    sigfillset(&set);
    pthread_sigmask(SIG_BLOCK, &set, NULL);

    /* 创建信号线程 */
    pthread_t sig_tid, work_tid;
    pthread_create(&sig_tid, NULL, signal_thread, NULL);
    pthread_create(&work_tid, NULL, worker_thread, NULL);

    pthread_join(sig_tid, NULL);
    pthread_join(work_tid, NULL);

    printf("主线程退出\n");
    return 0;
}
```

### 11.3 pthread_kill 与线程定向信号

`pthread_kill` 向指定线程发送信号:

```c
#include <pthread.h>
#include <signal.h>

void thread_handler(int sig) {
    (void)sig;
    /* 仅在目标线程中触发 */
}

void *worker(void *arg) {
    signal(SIGUSR1, thread_handler);
    while (1) {
        pause();
    }
    return NULL;
}

int main(void) {
    pthread_t tid;
    pthread_create(&tid, NULL, worker, NULL);

    sleep(1);
    pthread_kill(tid, SIGUSR1);  /* 向 tid 发送 SIGUSR1 */

    pthread_join(tid, NULL);
    return 0;
}
```

### 11.4 同步信号的处理

`SIGSEGV`、`SIGFPE`、`SIGILL` 等由硬件触发,递送给触发线程。这些信号不能被"等待",只能用处理函数捕获:

```c
void segv_handler(int sig, siginfo_t *info, void *ctx) {
    (void)sig; (void)info; (void)ctx;
    /* 记录日志、清理、退出 */
    _exit(1);
}

/* 多线程程序中,每个线程都应安装 */
void install_segv_handler(void) {
    struct sigaction sa;
    sa.sa_sigaction = segv_handler;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_SIGINFO | SA_ONSTACK;
    sigaction(SIGSEGV, &sa, NULL);
}
```

## 第 12 章 总结与最佳实践

### 12.1 信号处理的核心原则

1. **最小化处理函数**:只设置标志,不做实际工作
2. **使用 async-signal-safe 函数**:严格限制在 POSIX 安全列表内
3. **优先使用 sigaction**:避免 `signal` 的可移植性问题
4. **多线程用专用线程**:`sigwait` + 阻塞信号
5. **保护 errno**:处理函数中保存/恢复
6. **使用 volatile sig_atomic_t**:共享标志的类型
7. **避免 longjmp 跳出处理函数**:除非用 `sigsetjmp`/`siglongjmp`

### 12.2 工业级项目的信号处理策略

参考 Redis、Nginx 等成熟项目:

#### 12.2.1 Redis 的信号处理

Redis 的信号处理极其简单,只处理 `SIGTERM`/`SIGINT`:

```c
/* Redis 简化版 */
void sigterm_handler(int sig) {
    (void)sig;
    redisSetProcTitle("received SIGTERM, scheduling shutdown...");
    server.shutdown_asap = 1;  /* 设置标志,主循环检查 */
}
```

#### 12.2.2 Nginx 的信号处理

Nginx 使用标志 + 主循环检查的模式:

```c
/* Nginx 简化版 */
static volatile sig_atomic_t ngx_terminate;
static volatile sig_atomic_t ngx_quit;
static volatile sig_atomic_t ngx_reopen;

void ngx_signal_handler(int signo) {
    switch (signo) {
        case SIGQUIT: ngx_quit = 1; break;
        case SIGTERM: ngx_terminate = 1; break;
        case SIGHUP:  ngx_reopen = 1; break;
        /* ... */
    }
}
```

### 12.3 信号处理检查清单

编写信号处理代码时,逐项检查:

- [ ] 处理函数是否尽可能短小?
- [ ] 是否只调用了 async-signal-safe 函数?
- [ ] 共享变量是否声明为 `volatile sig_atomic_t`?
- [ ] 是否使用 `sigaction` 而非 `signal`?
- [ ] 是否设置了 `SA_RESTART` 以重启系统调用?
- [ ] 处理函数中是否保存/恢复 `errno`?
- [ ] 是否处理了 `SIGPIPE`(网络程序必须忽略)?
- [ ] 多线程程序中是否在专用线程中处理?
- [ ] 是否考虑了 `EINTR` 错误?
- [ ] 复杂逻辑是否使用 `signalfd` 或 `sigwait` 替代异步处理?

### 12.4 推荐学习资源

- 《Advanced Programming in the UNIX Environment》(APUE)第 10 章
- 《The Linux Programming Interface》(TLPI)第 20-22 章
- 《Programming with POSIX Threads》第 6 章(多线程信号)
- POSIX.1-2017 标准 `<signal.h>` 章节
- Linux 手册:`man 7 signal`、`man 7 signal-safety`

### 12.5 信号处理的演进方向

现代系统编程中,信号的使用呈下降趋势:

- **事件驱动**:libuv、libevent 抽象了信号,统一为事件
- **同步等待**:`sigwait`/`signalfd` 替代异步处理
- **消息队列**:POSIX 消息队列替代信号传递数据
- **线程通知**:`pthread_cond_signal` 替代进程间信号

但信号仍是 Unix 编程的基础,理解其机制对系统级开发至关重要。

### 12.6 总结

信号处理是 C 系统编程中最具挑战性的主题之一。其困难源于异步性、可重入性约束与跨平台差异。掌握信号处理需要:

1. **理解机制**:信号生命周期、掩码、递送规则
2. **掌握 API**:`sigaction`/`sigprocmask`/`sigwait` 的精确用法
3. **遵守约束**:async-signal-safe 函数列表与 `volatile sig_atomic_t`
4. **实践模式**:优雅退出、子进程回收、崩溃诊断等经典模式
5. **避免陷阱**:竞态条件、不可重入函数、信号丢失

通过本文档的系统学习,你应该能够:

- 编写正确的信号处理函数
- 设计可靠的服务器信号处理架构
- 诊断信号相关的 bug 与竞态
- 在多线程程序中正确处理信号
- 在跨平台项目中处理信号差异

信号处理的精妙之处在于"以简御繁"——处理函数越简单,系统越可靠。这是 Unix 哲学的体现,也是系统编程的艺术。
