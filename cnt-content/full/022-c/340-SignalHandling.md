---
order: 360
title: 信号处理：异步事件的捕获与纪律
module: 'c'
category: 计算机科学
difficulty: advanced
description: 从 Ctrl+C 拆开信号的完整体系：软件中断心智模型、signal 与 sigaction 的历史恩怨与 SA_RESTART、C17 7.14.1.1 的处理器纪律、printf 偶发死锁的现场分析、SIGCHLD 收割僵尸、sigaltstack 兜底烧穿的栈。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'c/250-FunctionCallStackFrame'
  - 'c/370-POSIXThread'
  - 'c/420-CPosixSystemCall'
prerequisites:
  - 'c/330-ProcessAndPipe'
  - 'c/260-CVolatileAndConstDeepDive'
---

## 前置知识

- 已完成 [进程与管道](/c/330-ProcessAndPipe)：知道 fork/wait/pipe，见过 SIGPIPE 的退出码 141 和僵尸进程；本篇的 SIGCHLD 专题就是 330 僵尸问题的收尾；
- 已完成 [volatile 与 const 深水区](/c/260-CVolatileAndConstDeepDive)：写过 `volatile sig_atomic_t` 标志程序。260 讲的是「为什么必须是这个类型」，本篇把它放进信号的完整体系里用。

> 分工说明：260 篇从编译器优化角度讲了 volatile 的三大场景之一「信号处理器」，回答「为什么不能只用 int」；本篇讲信号本身——信号是什么、怎么安装处理器、处理器里哪些事绝对不能做。两篇共用一套示例词汇（标志、主循环、处理器），不重复论证。

本文代码在 Linux/macOS（或 WSL）运行。Windows 没有这套机制：控制台事件走 SetConsoleCtrlHandler，异常走 SEH，对应关系见 [跨平台编程](/c/410-CrossPlatformProgramming)。

## 学习目标

读完本文你将能够：

1. 解释 Ctrl+C 背后的机制：终端产生 SIGINT、内核按处置表递送、默认动作终止进程；
2. 用 sigaction 安装处理器，说清它与 signal 的差异、SA_RESTART 与 EINTR 的取舍；
3. 背出处理器里的两条纪律（只碰 volatile sig_atomic_t 或无锁原子、只调异步信号安全函数）并解释每条背后的灾难现场；
4. 用 sigprocmask 给临界区挡信号，用 sigpending 查未决，理解「信号不排队」的合并语义；
5. 用 SIGCHLD 处理器收割僵尸进程、用 sigaltstack 给栈烧穿留后路。

预计 70 到 90 分钟，含 4 组动手实验、1 道预测题与 1 道挑战题。

## 1. 问题引入：Ctrl+C 的那一刻发生了什么

先写一个「能跑」的程序，捕获 SIGINT，按 Ctrl+C 后优雅退出：

```c
/* catch.c：看起来工作正常 */
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <signal.h>

static void on_interrupt(int sig) {
    printf("caught signal %d, cleaning up\n", sig);
    exit(0);
}

int main(void) {
    signal(SIGINT, on_interrupt);
    while (1) {
        printf("working...\n");
        sleep(1);
    }
}
```

编译运行，按 Ctrl+C，输出 `caught signal 2, cleaning up` 后退出。十次运行十次正常。但这段程序违反了两条工程铁律——处理器里调 printf、调 exit——而这两种调用在极端时序下一个能死锁进程、一个能损坏堆。十次正常不是它正确的证据，只是信号还没打断在那个位置。

要理解为什么，得先知道 Ctrl+C 那一刻发生了什么：终端驱动把按键转成 SIGINT 发给前台进程组；内核查看这个进程对 SIGINT 的处置（disposition）——默认动作是终止，于是进程直接消失；我们用 signal 把默认动作换成了 on_interrupt，内核改为打断当前执行流、在栈上压好现场、跳进这个函数，返回后从断点继续。信号（signal）就是「发给进程的软件中断」：异步到达，时机不由你，打断位置不由你——这两点决定了第 4 节的全部纪律。

## 2. 信号心智模型：一张表与三类默认动作

进程对每个信号可以有三种处置：默认（SIG_DFL）、忽略（SIG_IGN）、捕获（安装一个处理器函数）。常用的信号一张表装得下：

| 信号 | 编号（Linux x86_64） | 默认动作 | 谁在发 |
| --- | --- | --- | --- |
| SIGINT | 2 | 终止 | 终端 Ctrl+C |
| SIGTERM | 15 | 终止 | kill 命令的默认请求，「请你退出」 |
| SIGKILL | 9 | 终止 | 强杀；不可捕获、不可忽略 |
| SIGSEGV | 11 | 终止 + core | 访问非法内存（解引用坏指针） |
| SIGPIPE | 13 | 终止 | 向无读端的管道写（330 篇的退出码 141） |
| SIGCHLD | 17 | 忽略 | 子进程退出或停止 |
| SIGUSR1 | 10 | 终止 | 用户自定义，进程间通知 |

编号因平台而异（macOS 上 SIGCHLD 是 20），代码里永远用符号名。默认动作分三类：终止、忽略、终止并生成 core dump（用于事后解剖，SIGSEGV/SIGABRT 属此类）；另有停止与继续两个状态类动作（Ctrl+Z 背后的 SIGTSTP 与 SIGCONT）。表格里藏着一个特例要单独说：SIGKILL（以及 SIGSTOP）的处置不可改变——不能捕获、不能忽略、不能阻塞。这是操作系统留给管理员的最后手段：任何进程都必须能被杀死。你见过的 `kill -9` 就是它，而它属于信号里极少数「无法讲道理」的一类。

一个信号从生到死走三步：产生（generated，内核或别的进程发出）→ 未决（pending，已产生待递送）→ 递送（delivered，内核执行处置：终止、忽略，或跳进处理器）。被阻塞的信号会停在未决态排队等待——第 5 节讲怎么挡。还有一条影响深远的事实：标准信号**不排队**，同一信号在未决期间到达多少次都只记一笔「有一次」。预测题会验证它。

## 3. 两种安装 API：signal 的历史包袱与 sigaction

signal 是 C 标准里唯一的信号安装函数（`<signal.h>`），签名一眼难懂但用法简单：`signal(SIGINT, on_interrupt)`。问题在它的**历史行为**：早期 Unix（System V 血统）里处理器执行一次后，处置自动重置回默认——第二次 Ctrl+C 就直接杀进程；BSD 系修正为保留处理器、并自动重启被信号打断的系统调用；POSIX 标准干脆把 signal 的行为留给实现自行决定。同一段代码在不同系统上行为不同，这就是工程代码用 sigaction 的原因：每个行为都显式指定，没有隐含的历史包袱。

```c
struct sigaction {
    void (*sa_handler)(int);            /* 简单处理器；SA_SIGINFO 时换 sa_sigaction */
    sigset_t sa_mask;                   /* 处理器执行期间额外屏蔽的信号 */
    int sa_flags;                       /* 行为开关，见下文 */
};
int sigaction(int sig, const struct sigaction *act, struct sigaction *old);
```

sa_flags 里最重要的一个是 SA_RESTART。信号可能在程序阻塞在系统调用（read 终端、wait、sleep）时到达：处理器执行完后，被中断的系统调用怎么办？没有 SA_RESTART，系统调用返回 -1、errno 置 EINTR，程序自己决定重试还是放弃；有 SA_RESTART，内核自动替你重新发起调用，程序毫无知觉。同一行代码跑出两种命运的实验：

```c
/* eintr.c：SA_RESTART 开关决定 read 的命运
 * 编译：gcc -Wall -Wextra -g eintr.c -o eintr
 */
#include <stdio.h>
#include <string.h>
#include <errno.h>
#include <unistd.h>
#include <signal.h>

static void on_alarm(int sig) { (void)sig; }

int main(int argc, char *argv[]) {
    int restart = argc > 1 && strcmp(argv[1], "restart") == 0;

    struct sigaction sa;
    sa.sa_handler = on_alarm;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = restart ? SA_RESTART : 0;    /* 唯一的变量 */
    if (sigaction(SIGALRM, &sa, NULL) == -1) {
        perror("sigaction");
        return 1;
    }

    alarm(2);                                  /* 2 秒后向自己发 SIGALRM */
    printf("type a line within 2s (SA_RESTART=%d)\n", restart);
    char buf[64];
    ssize_t n = read(STDIN_FILENO, buf, sizeof buf);
    if (n == -1) {
        printf("read failed: %s\n", strerror(errno));
    } else {
        printf("read got %zd bytes\n", n);
    }
    return 0;
}
```

两次运行，分别等定时器到点：

```bash
./eintr          # 什么都不敲，等 2 秒
./eintr restart  # 定时器到点后再敲一行
```

预期输出（两个变体各跑一次；第二行的字节数取决于你输入的内容）：

```text
./eintr：         read failed: Interrupted system call
./eintr restart： 定时器打断后仍能读到输入，read got 12 bytes
```

第一个进程的 read 被 SIGALRM 打断后放弃了，第二个在原地继续等。两种策略没有对错：长跑服务通常选 SA_RESTART 省心，事件循环框架偏爱 EINTR（打断恰好是检查退出标志的时机），但你必须**知道自己在哪种模式里**——不设 SA_RESTART 又不查 EINTR 的 read，就是第 7 节实录三的崩溃来源。

发信号的另一半是发送侧：`kill(pid, sig)` 向指定进程发（shell 的 kill 命令同名同义；pid 取 0 发给同进程组、-1 广播），`raise(sig)` 发给当前进程。`alarm(秒)` 定时给自己发 SIGALRM，是本节实验的定时器来源；更现代的定时器接口 timer_create（毫秒精度、可选专用信号）属于深水区，用到这里再查手册。

还有一条 fork/exec 与信号的关系要记牢：fork 出的子进程**继承**处置表和信号掩码（未决信号不继承）；exec 之后，被捕获的信号全部重置为默认——因为处理器代码已被新程序覆盖，留着只会跳进无人区；被忽略的保持忽略。330 篇的迷你 shell 若要避免 Ctrl+C 杀掉整个管道，就从这里下手。

## 4. 处理器里的纪律：两条铁律与事故现场

把第 1 节的 catch.c 改写成守纪律的版本，这是信号处理的默认姿势：

```c
/* flag.c：处理器只立标志，主循环只看标志
 * 编译：gcc -Wall -Wextra -g flag.c -o flag
 */
#include <stdio.h>
#include <unistd.h>
#include <signal.h>

static volatile sig_atomic_t stop_requested = 0;

static void on_interrupt(int sig) {
    (void)sig;                 /* 处理器体内：不打印、不 malloc、不碰锁 */
    stop_requested = 1;        /* 唯一动作：一次原子写入 */
}

int main(void) {
    struct sigaction sa;
    sa.sa_handler = on_interrupt;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_RESTART;
    if (sigaction(SIGINT, &sa, NULL) == -1) {
        perror("sigaction");
        return 1;
    }

    int round = 0;
    while (!stop_requested) {
        printf("round %d working...\n", ++round);
        sleep(1);
    }
    printf("graceful shutdown after %d rounds\n", round);
    return 0;
}
```

为什么每个词都不能少，标准说得很硬。C17 7.14.1.1（260 篇已逐条核实，这里引其转述）：信号不是因 abort/raise 而发生时，处理器若引用任何具有静态或线程存储期、既非无锁原子对象、亦非 volatile sig_atomic_t 的对象，行为未定义；能安全调用的函数只有 abort、_Exit、quick_exit 与 signal（给同一信号换处置）。volatile 保证主循环看得见处理器的写入（-O2 下去掉它试试，260 篇做过这个实验），sig_atomic_t 保证单次读写不可分割——注意只是单次读写：`flag++` 是读改写三步，不原子。

POSIX 在这条 C 底线之上给了一个更宽的「异步信号安全」（async-signal-safe）函数清单：清单里的函数（write、read、_exit、waitpid、kill、sigaction、pipe 等）可以在处理器里调用而不破坏数据结构。清单的钥匙是排除法——这些**常见函数不在清单里**，一律禁入处理器：

| 函数 | 为什么不安全 |
| --- | --- |
| printf/fprintf | 依赖全局 stdio 缓冲与内部锁（见下文事故现场） |
| malloc/free | 改堆链表；主流程改到一半被处理器再改，堆直接损坏 |
| exit | 会跑 atexit 清单并刷 stdio；处理器里用 _exit/_Exit |
| fopen/fread 等 | 建立在 stdio 之上，同 printf |
| strtok 等静态缓冲函数 | 静态数据违反上表 |

事故现场：把 flag.c 的处理器换成 printf 后跑一个月的服务，某个凌晨整个进程卡死。逐行复盘：主循环正在 printf（内部持有 stdio 的锁、正改缓冲区状态），信号恰在此刻打断，处理器再调 printf——第二次进入要拿同一把锁，锁的主人被打断永远回不来，自等待死锁。strace -p 会看到进程停在 futex 系统调用上不再前进。「偶现」正是异步信号事故的签名：出错与否取决于信号打断指令流的精确位置，测试环境永远难以复现。

处理器里真的要说一句话呢？用 write（在 POSIX 安全清单里）：

```c
#include <errno.h>
#include <unistd.h>

static void on_interrupt(int sig) {
    int saved = errno;                          /* 处理器纪律：保护 errno */
    const char *msg = "interrupted\n";
    write(STDERR_FILENO, msg, sizeof msg - 1);  /* write 是异步信号安全的 */
    errno = saved;
    (void)sig;
}
```

保存并恢复 errno 是清单外的最后一条纪律：处理器里的系统调用可能改写 errno，而主流程可能正拿着「调用失败瞬间」的 errno 准备 perror。

再多走一步的工程形态是自管道技巧（self-pipe trick）：处理器只向一根管道写一个字节（write 安全），主循环把管道读端放进 select/poll/epoll 一起监听——信号从此变成普通 IO 事件，所有复杂逻辑回到主循环，再无安全清单约束：

```c
static int spipe[2];                     /* 初始化时 pipe(spipe)，写端设非阻塞 */

static void handler(int sig) {
    char b = (char)sig;
    write(spipe[1], &b, 1);              /* 管道满了就丢字节：多按几次没关系 */
}
/* 主循环：select(spipe[0] + 1, ...)，读到字节即信号到达，再从容处理 */
```

## 5. 阻塞与未决：给临界区挡住信号

sigprocmask 控制「哪些信号现在不许递送」，挡下的信号停在未决态；sigpending 查询未决集合。最直接的用途是保护临界区——一段不允许被打断的数据更新：

```c
/* mask.c：临界区里挡住 SIGINT，出来再处理
 * 编译：gcc -Wall -Wextra -g mask.c -o mask
 */
#include <stdio.h>
#include <signal.h>
#include <unistd.h>

int main(void) {
    sigset_t block, old, pending;
    sigemptyset(&block);
    sigaddset(&block, SIGINT);

    sigprocmask(SIG_BLOCK, &block, &old);   /* 进临界区：SIGINT 暂不递送 */
    printf("critical section: SIGINT blocked for 5s\n");
    sleep(5);                               /* 期间按 Ctrl+C：屏幕毫无反应 */

    sigpending(&pending);                   /* 但它没丢，在未决集合里 */
    if (sigismember(&pending, SIGINT)) {
        printf("SIGINT is pending\n");
    }
    sigprocmask(SIG_SETMASK, &old, NULL);   /* 出临界区：未决的此刻补送 */
    printf("unreachable if you pressed Ctrl+C just now\n");
    return 0;
}
```

运行后 5 秒内按一次 Ctrl+C：

```text
critical section: SIGINT blocked for 5s
SIGINT is pending
```

第三行没打出来，因为解除阻塞的瞬间未决的 SIGINT 补送，默认动作终止了进程——「挡」不是「丢」，是推迟。sigaction 的 sa_mask 是同一机制的自动化：处理器执行期间，内核自动屏蔽「触发信号本身」（防递归，SA_NODEFER 可以关掉这层保护）加上你在 sa_mask 里额外指定的信号。

阻塞还暴露了一个著名竞态：想「解除屏蔽并等信号到来」，若先 sigprocmask 恢复再 pause，两步之间到达的信号会在 pause 之前被处理完，pause 从此长眠。POSIX 的 sigsuspend(mask) 把「换掩码 + 等待」做成一步原子操作，正是为此而生；更现代的路线是多线程程序里用 sigwait 同步取信号（370 篇的多线程信号模型会展开）。

## 6. 进阶专题：四个真实系统里的必答题

### 6.1 SIGCHLD：收割僵尸（接 330 的烂尾楼）

330 篇留下了僵尸问题：父进程得有人守着 waitpid。守株待兔的低效版是轮询 waitpid(WNOHANG)；事件驱动的正解是子进程退出时内核自动给父进程发 SIGCHLD，处理器里非阻塞收割：

```c
/* reaper.c：子进程一退出就被收割，僵尸无处存身
 * 编译：gcc -Wall -Wextra -g reaper.c -o reaper
 */
#include <stdio.h>
#include <errno.h>
#include <signal.h>
#include <unistd.h>
#include <sys/wait.h>

static void on_sigchld(int sig) {
    (void)sig;
    int saved = errno;                          /* 保护 errno */
    while (waitpid(-1, NULL, WNOHANG) > 0) {
        ;                                       /* 非阻塞地领走所有已退出的孩子 */
    }
    errno = saved;
}

int main(void) {
    struct sigaction sa;
    sa.sa_handler = on_sigchld;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_RESTART | SA_NOCLDSTOP;    /* 只在退出时发，停止不算 */
    if (sigaction(SIGCHLD, &sa, NULL) == -1) {
        perror("sigaction");
        return 1;
    }

    for (int i = 0; i < 3; i++) {
        pid_t pid = fork();
        if (pid == 0) { sleep(i + 1); _exit(0); }  /* 子进程：各自跑一会 */
        printf("spawned child %d\n", pid);
    }
    sleep(5);                                   /* 期间另开终端：ps 无 Z */
    printf("parent exits\n");
    return 0;
}
```

两处细节都是第 4 节纪律的落地：处理器里只调 waitpid（在安全清单里）；用 `while` 循环而非单次调用——SIGCHLD 不排队，三个孩子同时退出只送一个信号，一次收割必须清空全部。不在乎子进程退出状态的服务还有个偷懒选项：把 SIGCHLD 的处置设为 SIG_IGN（或 sigaction 加 SA_NOCLDWAIT），内核自动回收，僵尸根本不产生——代价是拿不到退出码。

### 6.2 SIGSEGV：几乎什么都做不了

解引用坏指针触发 SIGSEGV 时，进程的状态已经不可信：栈可能已损坏、堆可能不一致。处理器里能做的只有「记录然后死」：用 write 输出一行现场（配 SA_SIGINFO 可以拿到出错地址 info->si_addr），然后恢复默认处置并重新 raise 同一信号，让进程带着 core dump 按正常方式死掉。试图恢复运行、longjmp 回主流程都是把「确定崩溃」升级成「不确定的数据损坏」。崩溃时自动打印调用栈的 backtrace 技巧属于调试专题，见 [静态分析与调试](/c/490-StaticAnalysisDebug)。

### 6.3 sigaltstack：栈烧穿时最后的容身之处

栈溢出（递归过深、局部数组过大，见 [函数调用栈帧](/c/250-FunctionCallStackFrame)）也以 SIGSEGV 的形式出现，这时有个鸡生蛋问题：处理函数要在栈上跑，而栈正是出事的地方。sigaltstack 预先注册一块备用内存，配合 SA_ONSTACK 让处理器改在备用栈上执行：

```c
/* altstack.c：栈烧穿后，处理器在备用栈上还有容身之处
 * 编译：gcc -Wall -Wextra -g altstack.c -o altstack
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <unistd.h>

static void recurse(int depth) {
    char pad[4096];
    memset(pad, 0, sizeof pad);   /* 真正触碰这一层栈页 */
    (void)pad;
    recurse(depth + 1);
}

static void on_segv(int sig) {
    (void)sig;
    const char *msg = "stack overflow caught on altstack\n";
    write(STDERR_FILENO, msg, strlen(msg));       /* write 安全；printf 禁入 */
    _exit(1);                                     /* 只能记录后退出 */
}

int main(void) {
    stack_t ss;
    ss.ss_sp = malloc(SIGSTKSZ);                  /* 标准备用栈大小 */
    if (ss.ss_sp == NULL) return 1;
    ss.ss_size = SIGSTKSZ;
    ss.ss_flags = 0;
    if (sigaltstack(&ss, NULL) == -1) { perror("sigaltstack"); return 1; }

    struct sigaction sa;
    sa.sa_handler = on_segv;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_ONSTACK;                     /* 关键：在备用栈上跑 */
    if (sigaction(SIGSEGV, &sa, NULL) == -1) { perror("sigaction"); return 1; }

    recurse(0);                                   /* 烧穿主栈 */
    return 0;
}
```

预期输出（随后退出码 1）：

```text
stack overflow caught on altstack
```

醒一句话：栈溢出本身是未定义行为，这个兜底依赖内核在栈耗尽时能发出 SIGSEGV，属于「尽力而为的保险丝」；SIGSTKSZ 不够放处理器 + 它调用的函数时启动即报错（下限是 MINSIGSTKSZ）。250 篇讲栈布局时埋的这颗种子，在这里发芽。

### 6.4 两句话带走两个话题

多线程程序里信号投递给「任意一个没屏蔽它的线程」，处理器在哪条线程上执行不确定——正确的姿势是主线程屏蔽全部信号、开专用线程 sigwait 同步处理，完整模型在 [POSIX 线程](/c/370-POSIXThread)。实时信号 SIGRTMIN 到 SIGRTMAX（Linux 上 34 到 64，运行时用符号名取值）是对标准信号的补丁：排队不合并、按发送顺序递送、sigqueue 可附带一个整数或指针——需要「每个事件都必须送达」的自定义通知时才动它，Linux 还提供 signalfd 把信号变成可 poll 的文件描述符（自管道的官方版），两者都属深水区。

## 7. 常见错误与调试实录

实录一：处理器里调 printf，偶发挂死。现象：99% 的 Ctrl+C 正常退出，偶发整进程卡死，strace 停在 futex（第 4 节现场）。修复：处理器只立标志或只 write；复杂逻辑全部移进主循环。检查清单第一问永远是「处理器体内出现了安全清单之外的符号吗」。

实录二：忘装 SIGPIPE 处理器，被管道对端无声杀死（接 330）。现象：长跑服务给断开的对端写数据后整进程消失，退出码 141（128 + SIGPIPE 编号 13）。修复三选一：sigaction 忽略 SIGPIPE 改查 write 的 EPIPE 返回；或按连接用 send 的 MSG_NOSIGNAL 标志（套接字场景）；或临时屏蔽该信号包住关键 write。网络服务是重灾区，见 [Socket 网络编程](/c/390-SocketNetworkProgramming)。

实录三：EINTR 没处理，read 集体失败。现象：一装上「每秒打点」的定时信号，所有阻塞的 read/wait 隔几秒就返回 -1，errno 是 4（EINTR）。根因：安装时没设 SA_RESTART（第 3 节实验的第一个进程），每次信号都把系统调用拦腰打断。修复二选一：sigaction 加 SA_RESTART 让内核自动重启；或包一层重试循环——

```c
ssize_t n;
do {
    n = read(fd, buf, sizeof buf);
} while (n == -1 && errno == EINTR);
```

## 8. 实际项目中的使用场景

- 成熟 C 项目的信号处理几乎全是 flag.c 的翻版：Redis 收到 SIGTERM 只置一个 shutdown_asap 标志，主循环看到标志才开始存盘退出；Nginx 用三个 volatile sig_atomic_t（terminate/quit/reopen）区分三种退出与重开日志的动作。处理器小到极致，是它们敢于长期运行的底气；
- SIGHUP 在守护进程语境里约定俗成地表示「重读配置」：处理器置 reload 标志，主循环重新加载配置文件——flag 模式直接套用；
- 网关/代理类服务在退出路径上用「标志 + 主循环收尾」实现优雅停机：停止接新请求、发完在途响应、关连接、才 _exit。多线程版本的信号模型归 370 篇。

## 9. 小练习

预测题（5 分钟）：先写答案再运行。

```c
sigset_t block;
sigemptyset(&block);
sigaddset(&block, SIGUSR1);
sigprocmask(SIG_BLOCK, &block, NULL);   /* 屏蔽 SIGUSR1 */
raise(SIGUSR1);                         /* 发第一次 */
raise(SIGUSR1);                         /* 发第二次 */
sigprocmask(SIG_UNBLOCK, &block, NULL); /* 解除屏蔽：处理器执行几次？ */
```

参考答案（先写再看）：一次。标准信号不排队，两次 raise 在未决集合里合并成「有一个 SIGUSR1」，解除阻塞只递送一次。要「每次都到」得用实时信号（6.4 节）。

挑战题（45 分钟，不看答案先动手）：把 flag.c 升级成两段式退出——第一次 Ctrl+C 置标志开始清理（打印几行模拟收尾工作），清理还没结束时再按一次 Ctrl+C 立刻终止。提示两级如下。

提示（思路方向）：清理开始后把 SIGINT 的处置恢复成默认（或用 SA_RESETHAND 让处理器触发一次后自动重置），第二次 Ctrl+C 就直接杀进程。

展开（关键 API）：`sigaction(SIGINT, &(struct sigaction){ .sa_handler = SIG_DFL }, NULL);` 或 sa_flags 加 SA_RESETHAND；清理函数里定期检查第二标志位可以做得更细。

验收清单：第一次 Ctrl+C 后清理日志完整打印；清理进行中第二次 Ctrl+C 立即退出且退出码为 130（128 + 2）；清理完成后再按 Ctrl+C 程序早已正常结束、无第二次机会。

## 10. 与之前和之后的知识的关系

- 往前：SIGPIPE 退出码 141 与僵尸进程都产自 [进程与管道](/c/330-ProcessAndPipe)，本篇分别用「忽略处置」与「SIGCHLD 处理器」收尾；volatile sig_atomic_t 的机制论证在 [volatile 与 const 深水区](/c/260-CVolatileAndConstDeepDive)；
- 旁支：栈溢出与备用栈的内存视角在 [函数调用栈帧](/c/250-FunctionCallStackFrame)；「无锁原子」是 C17 条款里的另一条生路，原子与内存序在 [原子与内存模型](/c/380-AtomicAndMemoryModel)；系统调用与文件描述符的底座在 [POSIX 系统调用](/c/420-CPosixSystemCall)；
- 往后：进程间除了信号还有共享内存与信号量，见 [共享内存与信号量](/c/350-SharedMemorySemaphore)；同一地址空间里的并发与锁见 [线程与并发](/c/360-ThreadConcurrency)。

## 11. 官方文档

- sigaction 手册页（SA_RESTART、sa_mask、全部 sa_flags）：https://man7.org/linux/man-pages/man2/sigaction.2.html
- sigaltstack 手册页（备用信号栈与 SIGSTKSZ）：https://man7.org/linux/man-pages/man2/sigaltstack.2.html
- POSIX.1-2017 2.4.3 Signal Concepts（异步信号安全函数的权威清单）：https://pubs.opengroup.org/onlinepubs/9699919799/functions/V2_chap02.html#tag_15_04

## 12. 自我检查

- 能画出「按键 → 终端驱动 → SIGINT → 处置表 → 处理器/终止」的完整链路，并指出默认动作的三类；
- 能说清 signal 与 sigaction 的差别、SA_RESTART 有无时系统调用的两种命运；
- 能背出处理器两条铁律，并对「处理器里 printf 为什么会死锁」给出逐行时序分析；
- 能默写 reaper.c 的骨架，解释为什么要循环 waitpid、为什么要保护 errno。

## 本章总结

信号是发给进程的软件中断：产生、未决、递送三段旅程，处置表决定终止、忽略还是跳进处理器；SIGKILL 与 SIGSTOP 不可驯服，是系统的最后手段。signal 带着历史包袱，sigaction 把行为显式化，SA_RESTART 决定被信号打断的系统调用是自动重启还是返回 EINTR。处理器运行在被打断的半空中，两条铁律因此而生：只碰 volatile sig_atomic_t 或无锁原子（C17 7.14.1.1），只调异步信号安全函数——printf 与 malloc 不在清单上，偶发死锁与堆损坏是违者的账单。工程答案千篇一律：处理器只立标志，逻辑回主循环；SIGCHLD 收僵尸、SIGSEGV 记录赴死、sigaltstack 兜底烧穿的栈，是这套纪律的三个标准应用。

## 下一步

进入 [共享内存与信号量](/c/350-SharedMemorySemaphore)：信号解决了「通知」，没解决「传数据」——无亲缘进程之间共享一块内存并用信号量排队，是 System V IPC 的正戏。
