---
order: 370
title: 进程与管道：fork、exec 与字节流
module: 'c'
category: 计算机科学
difficulty: intermediate
description: 用「ls | grep .c 是怎么跑起来的」引出 fork/exec/wait/pipe 四件套：fork 返回两次与写时复制、printf 缓冲重复输出的事故现场、僵尸进程收尸、EOF 与 SIGPIPE 两种管道死锁，最后亲手实现一个支持单管道的迷你 shell。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'c/340-SignalHandling'
  - 'c/350-SharedMemorySemaphore'
  - 'c/420-CPosixSystemCall'
prerequisites:
  - 'c/430-StdioFileIO'
  - 'c/090-FunctionDetailed'
---

## 前置知识

- 已完成 [标准库文件 IO](/c/430-StdioFileIO)：知道 FILE 指针、缓冲区（全缓冲/行缓冲）这些词，用 fopen/fprintf 读写过文件；
- 已完成 [函数详解](/c/090-FunctionDetailed)：会写多函数程序、理解函数调用与返回。

没读过 430 也行，本文用到缓冲区概念时会就地解释一句。

> 分工说明：本模块围绕「进程」这个单位分工明确——本篇讲进程本身：怎么创建（fork）、怎么换身（exec）、怎么等它退出（wait）、父子之间怎么用管道传字节；[共享内存与信号量](/c/350-SharedMemorySemaphore) 讲 System V IPC（共享内存/信号量，适合无亲缘关系进程间的高频大数据）；[线程与并发](/c/360-ThreadConcurrency) 与 [POSIX 线程](/c/370-POSIXThread) 讲同一地址空间里的并发。读完后你会明白：线程之间的通信之所以不需要管道，是因为它们本来就共享内存。

本文所有代码在 Linux/macOS（或 Windows 上的 WSL）运行；Windows 原生没有 fork，进程创建走 CreateProcess 一步完成，对应关系见 [跨平台编程](/c/410-CrossPlatformProgramming)。

## 学习目标

读完本文你将能够：

1. 解释 `ls | grep .c` 背后发生的事：两个进程、一根管道、三次系统调用的接力；
2. 用 fork 创建子进程，说出「返回两次」的语义与写时复制为什么让这件事便宜；
3. 用 wait/waitpid 收尸，亲眼看到僵尸进程并亲手消灭它；
4. 用 exec 家族替换进程映像，说清 execve 与 execvp 的差异和「成功不返回」的后果；
5. 用 pipe 搭一条父子进程间的单向字节流，识别管道满阻塞与 SIGPIPE 两种死锁现场。

预计 60 到 80 分钟，含 4 组动手实验、1 个贯穿小项目、1 道预测题与 1 道挑战题。

## 1. 问题引入：ls | grep .c 到底发生了什么

在终端敲下这条命令：`ls | grep .c`，屏幕上只留下 `.c` 结尾的文件名。这条竖线背后没有魔法，只有三个动作：

```text
shell 进程
   |-- pipe()          建一根管道（内核缓冲区，一对描述符）
   |-- fork + exec     子进程 1 换身成 ls，标准输出接到管道写端
   |-- fork + exec     子进程 2 换身成 grep，标准输入接到管道读端
   |-- wait() x2       等两个子进程结束
```

「一个程序复制出另一个进程，再让这个进程脱胎换骨去跑别的程序，中间用一根管道传字节」——这就是本文的全部内容。这四个系统调用（pipe、fork、exec、wait）从 1973 年管道被引入 Unix 至今没有变过，shell、容器运行时、CI 流水线全都建立在它们之上。先看一件怪事热热身，它引出本文第一个知识点。

## 2. 程序如何变成进程

可执行文件躺在磁盘上，只是一个静态的机器码文件。你敲 `./a.out` 后，shell 替你完成 fork 与 exec：内核加载器把代码和数据铺进一块全新的地址空间，跑一小段 C 启动例程（准备 argv、envp，初始化运行时），然后才调用你的 main。所以「进程 = 装进内存正在运行的程序」，它在任一时刻有自己的 PID、自己的地址空间、自己的文件描述符表。

main 返回之后呢？`return 0;` 等价于 `exit(0)`：exit 会刷新并关闭所有 stdio 流（printf 缓冲区里的内容此刻真正写到屏幕/文件），再按注册逆序调用 atexit 函数，最后把退出码交给内核。而系统调用 `_exit` 跳过这一切——不刷新缓冲、不跑 atexit，立刻消失。两者的差异平时看不出来，fork 之后就是事故现场：

```c
/* dup_buf.c：fork 之后 printf 输出重复了 */
#include <stdio.h>
#include <unistd.h>

int main(void) {
    printf("before fork");        /* 注意：没有换行符 */
    pid_t pid = fork();
    if (pid == -1) { perror("fork"); return 1; }
    printf(" %s\n", pid == 0 ? "child" : "parent");
    return 0;
}
```

```bash
gcc -Wall -Wextra -g dup_buf.c -o dup_buf
./dup_buf
```

预期输出（两行里 "before fork" 出现了两次）：

```text
before fork child
before fork parent
```

读出事实：printf 的输出先进用户态缓冲区，没遇到换行不刷新（终端是行缓冲，可 `printf("before fork");` 后面没有换行，所以这段文字还躺在缓冲区里）。fork 复制整个地址空间——**缓冲区里的内容也被复制了一份**。于是父子进程各自的缓冲区里都躺着 "before fork"，各自追加后缀、各自在换行处刷新，屏幕上出现两份。修复：fork 之前把缓冲区清空，让子进程继承一个空的缓冲区。

```c
    fflush(stdout);            /* 或者把上面的 printf 加上换行符 */
    fork();
```

修改实验：把 `dup_buf.c` 的输出重定向到文件 `./dup_buf > out.txt` 再看。重定向后 stdout 变成全缓冲，行为只会更夸张。这条「fork 前先 fflush」的纪律，写出真实程序（日志 + fork）时就是保命的。

exit 与 _exit 的分工由此清楚：正常路径用 exit（或 main 的 return），缓冲与清理各归其位；fork 之后子进程若不走 exec（比如 exec 失败的善后），用 _exit 退出，避免把继承来的缓冲区再刷一遍、避免重复执行父进程的 atexit 清理。

## 3. fork：一次调用，返回两次

fork 复制当前进程，产生一个几乎一模一样的子进程：地址空间内容相同（包括第 2 节看到的缓冲区）、文件描述符表相同、运行位置相同——都停在 fork 这一行。接下来两个进程各自独立运行，谁也不管谁。

区分他们的唯一办法是 fork 的返回值：

| 返回值 | 谁拿到了 | 含义 |
| --- | --- | --- |
| 子进程的 PID | 父进程 | 你当爹了，这是孩子 |
| 0 | 子进程 | 你是那个复制品 |
| -1 | 父进程 | 失败（进程数到上限、内存不足），检查 errno |

「调用一次，返回两次」不是两个返回值，而是 fork 之后系统里存在两个进程，各自从 fork 处继续跑，各拿到各的返回值。同一个判断 `pid == 0` 在两个进程里走向不同分支：

```c
/* two_paths.c：一个进程分身成两个，各走各路 */
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int main(void) {
    printf("before fork (pid=%d)\n", getpid());
    fflush(stdout);

    pid_t pid = fork();
    if (pid == -1) { perror("fork"); return 1; }
    if (pid == 0) {
        printf("child:  my pid=%d, my parent=%d\n", getpid(), getppid());
    } else {
        printf("parent: my pid=%d, my child=%d\n", getpid(), pid);
        wait(NULL);
    }
    return 0;
}
```

预期输出（PID 每次不同；两行的先后顺序也不保证）：

```text
before fork (pid=8123)
parent: my pid=8123, my child=8124
child:  my pid=8124, my parent=8123
```

复制整个地址空间听起来昂贵，实际便宜：fork 用写时复制（copy-on-write，COW）实现——父子最初共享同一批物理内存页，只复制页表；任何一方真正写入某页时，内核才把那一页复制一份。如果子进程 fork 后立刻 exec 换成新程序，那批共享页几乎一页都不用复制。Redis 做快照持久化正是靠这一点：fork 一个子进程去写盘，父进程毫发无损地继续服务。代价是两个进程的执行顺序没有任何保证——调度器说谁跑谁跑。

修改实验：让父子各打印 3 行再观察顺序。

```c
/* order.c：fork 之后谁先跑？ */
#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int main(void) {
    pid_t pid = fork();
    if (pid == -1) { perror("fork"); return 1; }
    for (int i = 1; i <= 3; i++) {
        printf("%s line %d\n", pid == 0 ? "child " : "parent", i);
    }
    if (pid > 0) wait(NULL);
    return 0;
}
```

多跑几次：有时 parent 三行连着，有时 child 插进中间。fork 只保证「从这一行起有两个进程」，从不保证「谁先执行第几条指令」。两个进程写同一份数据没有先后约定就是竞态——需要同步时，用本文的 wait/pipe，或线程篇的锁。

## 4. wait：僵尸进程与收尸

子进程退出后，内核不会立刻抹掉它：退出码、资源统计这些「身后事」要等父进程来取。这段「已经死了但户口没注销」的状态叫僵尸进程（zombie）。父进程调用 wait/waitpid 领取退出状态，内核才能彻底释放这个进程。

不收尸会怎样？做一个实验：

```c
/* zombie.c：父进程 30 秒不收尸 */
#include <stdio.h>
#include <unistd.h>

int main(void) {
    pid_t pid = fork();
    if (pid == -1) { perror("fork"); return 1; }
    if (pid == 0) { printf("child %d exits now\n", getpid()); return 42; }
    printf("parent %d sleeps 30s...\n", getpid());
    sleep(30);
    return 0;
}
```

运行后另开一个终端查看：

```bash
./zombie
ps -o pid,ppid,stat,cmd
```

预期输出（STAT 列的 Z 就是僵尸）：

```text
  PID  PPID STAT CMD
 8201   900  S   ./zombie
 8202   8201 Z   [zombie] <defunct>
```

僵尸不占内存、不占 CPU，但占一个进程表槽位和 PID。日志收集这类长期 fork 短命子进程的服务如果从不 wait，僵尸会越积越多，最终进程表满掉，整个系统无法再创建任何新进程。收尸是父进程的责任。

wait 阻塞等任意一个子进程；waitpid 可以指定等谁、可以不阻塞：

```c
#include <sys/wait.h>

int status;
pid_t got = waitpid(pid, &status, 0);      /* 阻塞等指定子进程 */
/* 三种返回值：
   > 0  领到了这个子进程的退出状态
   = 0  加 WNOHANG 时：孩子还活着，先不等了
   - 1  出错（孩子不存在 ECHILD，或被信号打断 EINTR）*/
```

退出状态本身是个打包好的整数，用宏拆包：`WIFEXITED(status)` 为真表示正常退出，`WEXITSTATUS(status)` 取出退出码（就是 main 的 return 值）；`WIFSIGNALED(status)` 为真表示被信号杀死，`WTERMSIG(status)` 是信号编号（第 8 节的调试实录会用到它）。

修改实验：给 zombie.c 的父进程加上

```c
    int status;
    waitpid(pid, &status, 0);
    if (WIFEXITED(status)) printf("child exit code: %d\n", WEXITSTATUS(status));
```

再跑一遍 ps：僵尸消失了，退出码 42 被父进程领走。WNOHANG 的用法在轮询场景：`while (waitpid(-1, NULL, WNOHANG) > 0);` 把所有已退出的孩子一口气领完，一个都不等——下一篇会把它装进 SIGCHLD 处理器，做成子进程一退出就自动收尸的形态。

## 5. exec：让子进程脱胎换骨

fork 出来的子进程跑的还是父进程的代码。要执行别的程序，需要 exec 家族：用磁盘上的新程序**替换**当前进程的映像——代码、数据全换，但 PID 不变、已打开的文件描述符默认保留。这就是「fork + exec」二段式：fork 负责复制出一个干净的分身，exec 负责让分身变成目标程序。

家族里最需要分清的两个：

| 函数 | 程序怎么给 | 参数怎么给 | 环境变量 |
| --- | --- | --- | --- |
| execve | 完整路径 `/bin/ls` | 数组 `char *argv[]` | 显式传 envp |
| execvp | 文件名 `ls`，按 PATH 逐目录查找 | 数组，末尾必须 NULL | 继承当前 environ |

`p` 后缀的意思就是 PATH：execvp("ls", ...) 会翻遍 PATH 里的每个目录找 ls，shell 执行你敲的命令用的正是它。所有 exec 函数有一条铁律：**成功不返回**——旧程序已经没了，无「返回」可言；只有失败（文件不存在、权限不够）才返回 -1。所以 exec 后面那几行是善后代码，必须立刻 _exit：

```c
pid_t pid = fork();
if (pid == 0) {
    char *argv[] = {"ls", "-l", NULL};
    execvp(argv[0], argv);            /* 成功：这行之后的代码永远不会执行 */
    fprintf(stderr, "exec failed\n"); /* 走到这里说明 exec 失败了 */
    _exit(127);                       /* 惯例：127 = 命令找不到；用 _exit 不刷缓冲 */
}
```

为什么是 _exit 而不是 exit？第 2 节的缓冲区事故在这里重演：子进程继承了父进程的 stdio 缓冲，exec 失败走 exit 会把继承来的缓冲再刷一遍。顺带一提，库函数 system("ls -l") 内部就是 shell 解释执行，命令字符串拼上用户输入会被注入任意命令；生产代码一律 fork + execvp，把参数放进数组，注入面就没了。环境变量的读取（getenv）与设置（setenv）是 exec 的另一半：execve 显式传的 envp 就是新程序的 PATH、HOME 的来源，shell 的「环境」正是这么代代相传的。

## 6. pipe：一根单向字节流

管道是内核里的一段固定容量的缓冲区（Linux 默认 64 KB），带两个描述符：`fd[0]` 读端、`fd[1]` 写端。数据从写端进、读端出，先进先出，像一根水管——**只朝一个方向流**。要点都在 read/write 的行为上：

| 场景 | 行为 |
| --- | --- |
| 管道空、写端还开着 | read 阻塞，等数据 |
| 管道空、写端全部关闭 | read 返回 0——这就是管道的 EOF |
| 管道没满 | write 直接放入，立刻返回 |
| 管道满 | write 阻塞，等读端取走数据 |
| 读端全部关闭还去写 | 内核发 SIGPIPE，默认动作杀死进程 |

 pipe（管道）创建时给的两个描述符属于当前进程，fork 之后子进程各持有一套副本——所以 pipe 总是先建、后 fork，父子各关一端，剩下的就是一条单向通道：

```c
/* pipe_demo.c：父写子读 */
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/wait.h>

int main(void) {
    int fd[2];
    if (pipe(fd) == -1) { perror("pipe"); return 1; }

    pid_t pid = fork();
    if (pid == -1) { perror("fork"); return 1; }

    if (pid == 0) {                              /* 子进程：读端 */
        close(fd[1]);                            /* 关掉不用的写端 */
        char buf[64]; ssize_t n;
        while ((n = read(fd[0], buf, sizeof buf)) > 0) {
            printf("[child] got %zd bytes: %.*s", n, (int)n, buf);
        }
        printf("[child] read returned 0, that is EOF\n");
        close(fd[0]);
        return 0;
    }

    close(fd[0]);                                /* 父进程：写端 */
    write(fd[1], "hello via pipe\n", 15);
    write(fd[1], "second line\n", 12);
    close(fd[1]);                                /* 关写端，子进程将读到 EOF */
    wait(NULL);
    return 0;
}
```

预期输出（两次 write 可能被一次 read 全部取走，拆分方式不保证）：

```text
[child] got 16 bytes: hello via pipe
[child] got 12 bytes: second line
[child] read returned 0, that is EOF
```

三个动作串起了 EOF 语义：父进程 `close(fd[1])`、子进程自己的 fork 副本也在 exec/退出路径上关闭、于是**全系统再无写端**，read 返回 0。第 1 行的例子反过来说明为什么双方都要关闭不用的端——只要任何一个进程还攥着写端，读端就永远等不到 EOF，只能一直阻塞。这就是第一种死锁：父进程忘关写端，子进程的 read 循环永不结束。第二种死锁更隐蔽：数据量超过 64 KB 容量时写端阻塞，而读端正忙着往回写自己的管道（两根管道互发大数据的典型死法），双方互相等待。另外提一句方向：要双向通信就开两根管道各管一个方向；UNIX 域套接字、共享内存是更合适的双向方案（后者见 [共享内存与信号量](/c/350-SharedMemorySemaphore)，套接字见 [Socket 网络编程](/c/390-SocketNetworkProgramming)）。

修改实验：把子进程开头改成 `close(fd[0]); return 0;`（立刻关掉读端），父进程再写时就会撞上第二种死锁的变种——SIGPIPE。会发生什么，第 8 节实录见分晓。管道还有一条细节：一次写入不超过 PIPE_BUF（Linux 上 4096 字节）时，内核保证这批字节原子地进入管道，不会被其他写者插队；跨进程写同一根管道的日志程序靠这条保证行完整性。

## 7. 贯穿小项目：迷你 shell

四件套齐了，把它们串成第 1 节那个问题的答案：一个支持「执行单命令」和「一条竖线管道」的迷你 shell。先看流程图，再对代码：

```text
run_pipeline("ls", "wc -l")
  pipe(fd)
   |-- fork --> 子进程1: close(fd[0]); dup2(fd[1],1); exec ls    stdout 接写端
   |-- fork --> 子进程2: close(fd[1]); dup2(fd[0],0); exec wc    stdin 接读端
   |-- close(fd[0]); close(fd[1]); waitpid x2    父进程两端都关再收尸
```

```c
/* minishell.c：单命令 + 单管道的迷你 shell
 * 编译：gcc -Wall -Wextra -g minishell.c -o minishell
 */
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/wait.h>

/* 执行单条命令：fork + execvp + waitpid */
static void run_command(char *argv[]) {
    pid_t pid = fork();
    if (pid == -1) { perror("fork"); return; }
    if (pid == 0) {
        execvp(argv[0], argv);            /* 成功不返回 */
        fprintf(stderr, "minishell: %s: command not found\n", argv[0]);
        _exit(127);
    }
    int status;
    waitpid(pid, &status, 0);
}

/* 执行 left | right */
static void run_pipeline(char *left[], char *right[]) {
    int fd[2];
    if (pipe(fd) == -1) { perror("pipe"); return; }

    pid_t p1 = fork();
    if (p1 == 0) {                        /* 左命令：stdout 接到管道写端 */
        close(fd[0]);
        dup2(fd[1], STDOUT_FILENO);       /* 1 号描述符现在指向写端 */
        close(fd[1]);                     /* dup2 后原描述符要关 */
        execvp(left[0], left);
        _exit(127);
    }
    pid_t p2 = fork();
    if (p2 == 0) {                        /* 右命令：stdin 接到管道读端 */
        close(fd[1]);
        dup2(fd[0], STDIN_FILENO);        /* 0 号描述符现在指向读端 */
        close(fd[0]);
        execvp(right[0], right);
        _exit(127);
    }
    close(fd[0]);                         /* 父进程两端都关：否则 wc 等 EOF 等到天荒地老 */
    close(fd[1]);
    waitpid(p1, NULL, 0);
    waitpid(p2, NULL, 0);
}

static int split(char *s, char *argv[], int max) {
    int n = 0;
    for (char *t = strtok(s, " "); t && n < max - 1; t = strtok(NULL, " "))
        argv[n++] = t;
    argv[n] = NULL;
    return n;
}

int main(void) {
    char line[256];
    while (1) {
        printf("mini$ ");
        fflush(stdout);
        if (fgets(line, sizeof line, stdin) == NULL) break;
        line[strcspn(line, "\n")] = '\0';
        if (strcmp(line, "exit") == 0) break;
        if (line[0] == '\0') continue;

        char *bar = strchr(line, '|');
        if (bar == NULL) {                /* 单命令 */
            char *argv[32];
            if (split(line, argv, 32) > 0) run_command(argv);
        } else {                          /* 单管道 */
            *bar = '\0';
            char *left[16], *right[16];
            if (split(line, left, 16) > 0 && split(bar + 1, right, 16) > 0) {
                run_pipeline(left, right);
            }
        }
    }
    return 0;
}
```

跑起来验收：

```bash
./minishell
mini$ ls -l
mini$ ls | wc -l
mini$ exit
```

对照第 1 节：真 shell 做的事一模一样，只是它 fork 多个命令接成长管道、处理重定向（`>` 是 open 文件后 dup2 到 1 号描述符）、还要管作业控制与信号——最后一件正是下一篇的主题。dup2 的纪律再强调一遍：重定向后关闭多余的原始描述符，任何一方（包括父进程）多攥一个端，EOF 就晚到一步甚至永远不到。

## 8. 常见错误与调试实录

实录一：fork 后输出重复。现象：`./dup_buf` 打出两份 "before fork"（第 2 节现场）。根因链：printf 先进用户态缓冲区 → fork 连缓冲内容一起复制 → 父子各刷各的。修复：fork 前 fflush(stdout) 或 setbuf(stdout, NULL)。凡是「fork 后日志重复」「重定向后输出错乱」，第一嫌疑人都是它。

实录二：忘了 wait，进程表里冒出 defunct。现象：ps 看到 STAT 为 Z 的条目（第 4 节现场），短期无害、长期积累耗尽进程表。修复：父进程路径上加 waitpid；并发 fork 多个子进程的场景装 SIGCHLD 处理器循环 waitpid(WNOHANG)，做法在 [信号处理](/c/340-SignalHandling) 的进阶专题。

实录三：SIGPIPE 默认终止程序。把第 6 节修改实验做完整：

```c
/* sigpipe.c：读端没了还在写 */
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/wait.h>

int main(void) {
    int fd[2];
    pipe(fd);
    pid_t pid = fork();
    if (pid == 0) { close(fd[1]); close(fd[0]); _exit(0); }  /* 读端也关 */
    close(fd[0]);
    sleep(1);                         /* 确保子进程已经退出 */
    ssize_t r = write(fd[1], "anyone there?", 13);
    printf("write returned %zd\n", r);/* 这行可能永远打不出来 */
    wait(NULL);
    return 0;
}
```

```bash
./sigpipe; echo "exit status: $?"
```

预期输出（进程根本没走到 printf，退出状态 141 = 128 + 13，13 是 SIGPIPE 的编号）：

```text
exit status: 141
```

默认动作下，SIGPIPE 直接杀死进程，连一句遗言都没有。这是长跑服务（向断开的对端写数据）的经典死法，写网络服务前必须决定对策：忽略该信号改查 write 的 EPIPE，或按连接局部处理。信号的捕获、忽略与 SA_RESTART 语义是下一篇的主菜。

## 9. 实际项目中的使用场景

- 服务器与运维脚本：管道组合 `tail -f app.log | grep ERROR | wc -l` 是排障日常；程序里跑外部命令并取回输出，fork + exec + pipe 是底座，popen("cmd", "r") 是它的 shell 版封装（同样有注入风险，只能喂可信字符串）；
- 隔离与并发：Nginx 的 master/worker 多进程模型靠 fork 出一群 worker、用 SIGCHLD 监控重启；CI 系统在容器里跑不可信代码，容器本质是加了命名空间与资源限制的进程隔离——都建立在本文的四件套上；
- 守护进程（后台长跑服务）用「fork 两次 + setsid + 关闭继承的文件描述符」脱离终端，模式固定但细节多，完整流程与代码见 [C 高级系统编程](/c/570-CAdvancedSystemProgramming)；
- 进程池、批量任务分发（父进程向一群 worker 的管道写任务）是管道 + fork 的直接放大，性能敏感时用 splice 类零拷贝或调大管道容量（fcntl 的 F_SETPIPE_SZ）。

## 10. 小练习

预测题（5 分钟）：先写答案再运行。

```c
printf("hello\n");        /* 终端上运行，stdout 是行缓冲 */
fork();
printf("world\n");
```

终端上输出几行 "world"？换成 `./a.out > out.txt`（全缓冲）后文件里有几行 "world"、几行 "hello"？

参考答案（先写再看）：终端 2 行 world（fork 前的 hello 已随换行刷新，缓冲区是空的，没有复制物）；重定向后 hello 在 fork 时还躺在缓冲区里，被复制两份，所以文件里 hello 两行、world 两行——「行缓冲/全缓冲 + fork 复制缓冲」两条事实的合奏。

挑战题（45 分钟，不看答案先动手）：给迷你 shell 加两条内建命令与一个新能力：

1. `cd 目录`——注意 cd 必须由 shell 进程自己执行 chdir，放进子进程毫无效果（子进程换完目录就退出了）；
2. `!!` 重复上一条命令（保存上一条的 argv 即可）；
3. 双管道 `a | b | c`（提示：n 个命令需要 n-1 根管道；第 i 个命令把 stdin 接第 i-1 根管道的读端、stdout 接第 i 根管道的写端；所有多余描述符逐一关闭）。

验收清单：`cd /tmp` 后 `pwd` 显示 /tmp；`ls | wc | wc` 输出 3 行；管道中任何一个命令不存在时，shell 本身不退出、报 command not found 后继续接受输入。

## 11. 与之前和之后的知识的关系

- 往前：[标准库文件 IO](/c/430-StdioFileIO) 的缓冲区概念在第 2 节的事故现场兑现；dup2 与文件描述符是 [POSIX 系统调用](/c/420-CPosixSystemCall) 主题的入口；
- 旁支：管道只是 IPC 的一种，共享内存/信号量在 [共享内存与信号量](/c/350-SharedMemorySemaphore)，跨主机的套接字在 [Socket 网络编程](/c/390-SocketNetworkProgramming)；同一地址空间里的并发不靠管道，见 [线程与并发](/c/360-ThreadConcurrency)；
- 往后：本文两次撞上信号——SIGPIPE 杀死写端、僵尸的自动收尸靠 SIGCHLD。信号是什么、怎么捕获、处理器里有哪些纪律，下一篇展开。

## 12. 官方文档

- fork 手册页（返回值、写时复制、继承清单）：https://man7.org/linux/man-pages/man2/fork.2.html
- pipe(7)（EOF/SIGPIPE/PIPE_BUF/容量，管道行为全集）：https://man7.org/linux/man-pages/man7/pipe.7.html
- wait 手册页（僵尸进程、WNOHANG、状态宏）：https://man7.org/linux/man-pages/man2/wait.2.html
- exit 与 _exit 的对照（刷新 stdio、atexit 语义）：https://man7.org/linux/man-pages/man3/exit.3.html
- _Exit/_exit 的 POSIX 规范（不刷新流、不跑 atexit）：https://pubs.opengroup.org/onlinepubs/9699919799/functions/_Exit.html

进阶书目：W. Richard Stevens《UNIX 环境高级编程》第 8 章（进程）与 Michael Kerrisk《Linux/UNIX 系统编程手册》第 24 至 28 章，是本文主题的两部权威参考。

## 13. 自我检查

- 能对别人讲清 `ls | grep .c` 从敲下回车到屏幕出字的全过程，指认每一步用了哪个系统调用；
- 能默写「fork 返回三种值各给谁」，并解释为什么 fork 前要 fflush；
- 给一张 STAT 为 Z 的 ps 截图，能说出成因、后果与两种修法；
- 能不看书写出 pipe + fork + dup2 + exec + waitpid 的管道样板，并指出「谁必须关闭哪个描述符」。

## 本章总结

shell 的一条竖线 = pipe + 两轮 fork/exec + wait。fork 一次调用返回两次，写时复制让分身近乎免费，但缓冲区也随之复制——fork 前先 fflush，exec 失败善后用 _exit。子进程退出后先变僵尸，wait/waitpid 领走状态它才真正消失，WNOHANG 让父进程不阻塞地收尸。管道是内核里的单向字节流：写端全关读端见 EOF，读端全关写端挨 SIGPIPE，写满则阻塞——三种行为对应三种必须烂熟于心的故障。迷你 shell 把四件套串成一条完整的因果链，下一篇补上最后一块拼图：信号。

## 下一步

进入 [信号处理](/c/340-SignalHandling)：SIGPIPE 为什么能无声杀死你的程序、Ctrl+C 到底给内核发了什么、处理器函数里哪些事绝对不能做——进程世界的异步事件与它的纪律。
