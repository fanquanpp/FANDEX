---
order: 610
title: 系统编程进阶：加载器、mmap 与守护进程
module: 'c'
category: 计算机科学
difficulty: advanced
description: ldd 看到的 .so 是谁加载的起步：ld.so 加载过程与 LD_DEBUG/LD_PRELOAD 实验，mmap 文件映射与匿名映射、MAP_SHARED 父子共享，getuid/geteuid 与 setuid 权限模型，守护进程化完整可跑版与 syslog，getrlimit 对照 ulimit，CLOCK_MONOTONIC 与 CLOCK_REALTIME 为什么不能混用。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'c/350-SharedMemorySemaphore'
  - 'c/250-FunctionCallStackFrame'
  - 'c/485-StaticAnalysisAndSanitizers'
  - 'c/320-DynamicStaticLibrary'
prerequisites:
  - 'c/330-ProcessAndPipe'
  - 'c/320-DynamicStaticLibrary'
---

## 前置知识

- 已完成 [进程与管道](/c/330-ProcessAndPipe)：亲手用过 fork/exec/wait，知道进程怎么被创建、孤儿进程被谁收养；
- 已完成 [动态库与静态库](/c/320-DynamicStaticLibrary)：造过 .so，记得链接器找库的三顺位。

> 分工说明：330 到 390 已把进程、信号、System V IPC、线程、网络各正门走完（420 是系统调用速查表），本篇收散在正门之外的系统级工具箱——加载器、mmap、UID 的两个面孔、守护进程模式、资源限制与两座时钟。库怎么造、怎么找归 320，本篇讲加载那一刻；IPC 正戏归 350，本篇给 mmap 对照版；定时器信号归 340，本篇给 timer_create 一句概览。内核模块与 eBPF 超出 C 语言主线，结尾一句带过。

## 学习目标

读完本文你将能够：

1. 用 LD_DEBUG 观察 ld.so 加载 .so 的全过程，说清 LD_PRELOAD 的机制与 setuid 程序为什么无视它；
2. 用 mmap 做文件映射与匿名映射，写出 fork 之前建映射的父子共享计数器，说出它与 System V IPC 的取舍；
3. 用 getuid/geteuid 解释 setuid 位怎么让普通用户临时拿到 root 身份，并说出这条通道为什么危险；
4. 写出完整可跑的守护进程化七步，并用 syslog 看到自己的日志；
5. 用 getrlimit 读出进程资源上限并与 ulimit 对照，解释测耗时为什么必须用 CLOCK_MONOTONIC。

预计 60 到 80 分钟，含 6 组实验、1 道预测题与 1 道挑战题。

## 1. 问题引入：ldd 看到的那串 .so 是谁加载的

```bash
gcc -o demo demo.c        # 随便一个 C 程序
ldd demo
```

一次典型输出：

```text
        linux-vdso.so.1 (0x00007ffe...)
        libc.so.6 => /lib/x86_64-linux-gnu/libc.so.6 (0x00007f...)
        /lib64/ld-linux-x86-64.so.2 (0x00007f...)
```

程序还没跑，libc 从哪来？列表里第三个条目——ld-linux-x86-64.so.2——就是答案：动态链接器（ld.so）。320 篇讲过链接器按什么顺序找库；本节看找到之后、main 之前的旅程：ld.so 把每个 .so 读进地址空间、配平符号、跑完各库的初始化，再把控制权交给 main。它是每个动态链接程序的真正入口。

## 2. 加载过程与 LD_PRELOAD：main 之前的暗房

ld.so 自带观察开关，加载过程可以现场直播：

```bash
LD_DEBUG=libs ./demo 2>&1 | head -20
```

典型输出（节选）：

```text
      1234:	find library=libc.so.6 [0]
      1234:	search path=/lib/x86_64-linux-gnu/tls/x86_64/...		(系统搜索路径)
      1234:	 trying file=/lib/x86_64-linux-gnu/libc.so.6
      1234:	 calling init: /lib/x86_64-linux-gnu/libc.so.6
      1234:	initialize program: ./demo
```

读法：find library 是查，trying file 是命中，calling init 是执行库的初始化函数——搜索路径与 320 的三顺位一一对应，这里是它的运行时现场。

LD_PRELOAD 则能改写这个过程。写一个假 time：

```c
/* fake_time.c：拦截 time()，交回一个写死的「现在」 */
#include <time.h>

time_t time(time_t *t) {
    time_t fake = 1700000000;          /* 2023-11-14 前后 */
    if (t != NULL) *t = fake;
    return fake;
}
```

```bash
gcc -shared -fPIC fake_time.c -o fake_time.so   # -fPIC/-shared 正是 320 的造 .so 流程
date
LD_PRELOAD=./fake_time.so date
```

一次典型输出：

```text
2026年 09月 29日 星期二 18:41:07 CST
2023年 11月 15日 星期三 06:13:20 CST
```

机制：LD_PRELOAD 列出的 .so 会抢在所有其他共享库之前加载，动态链接按先到先得配平符号——date 想调的 time() 被你的版本截胡。这个能力一体两面：测试里注入桩函数（给 time、rand、socket 套假实现）是它最正当的用法；同一机制在安全领域叫符号劫持，恶意视角归安全模块，本篇只记原理。不改一行源码就给函数套壳观测的符号插桩，用的也是同一原理。防线也有一条，第 4 节揭晓：setuid 程序根本不理会 LD_PRELOAD。

## 3. 内存映射 mmap：把文件与内存的界线抹掉

`mmap(NULL, len, prot, flags, fd, offset)` 把文件（或一块匿名内存）直接映进地址空间，此后指针即字节：

```c
/* mmap_read.c：把文件映射进内存，像数组一样读 */
#include <fcntl.h>
#include <stdio.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>

int main(int argc, char *argv[]) {
    int fd = open(argv[1], O_RDONLY);
    if (fd < 0) { perror("open"); return 1; }
    struct stat st;
    if (fstat(fd, &st) < 0) { perror("fstat"); return 1; }

    char *p = mmap(NULL, st.st_size, PROT_READ, MAP_PRIVATE, fd, 0);
    if (p == MAP_FAILED) { perror("mmap"); return 1; }   /* 不是 NULL！ */

    printf("首字节 %c，末字节 %c\n", p[0], p[st.st_size - 1]);
    munmap(p, st.st_size);
    close(fd);
    return 0;
}
```

```bash
printf "hello mmap" > demo.txt
gcc mmap_read.c -o mmap_read && ./mmap_read demo.txt
```

```text
首字节 h，末字节 p
```

flags 是 mmap 的灵魂，三个最常用：

| flag | 含义 |
| --- | --- |
| MAP_PRIVATE | 写时复制：改动只属于本进程，不落盘 |
| MAP_SHARED | 改动对映射同一区域的其他进程可见，并回写文件 |
| MAP_ANONYMOUS | 不对应任何文件，内容清零，fd 传 -1 |

修改实验一：把 mmap_read 的循环补全（读一遍全部字节），再与直接 read 的版本各跑一个几百 MB 的文件，用 `/usr/bin/time -v` 对比缺页计数——会看到 mmap 的读是按需分页，只碰两个字节只有两个页的代价，全部读一遍则缺页数与文件大小成正比。选型结论与 [POSIX 系统调用](/c/420-CPosixSystemCall) 的一句话一致：顺序大文件 read 加大缓冲往往更快，mmap 的甜区是随机访问与共享。

MAP_SHARED 加 MAP_ANONYMOUS 就是一把进程通信的轻量钥匙——关键在 fork 之前建好：

```c
/* shared_counter.c：fork 前建好匿名共享映射，父子真共享一个 int */
#include <stdio.h>
#include <sys/mman.h>
#include <sys/wait.h>
#include <unistd.h>

int main(void) {
    int *counter = mmap(NULL, sizeof(int), PROT_READ | PROT_WRITE,
                        MAP_SHARED | MAP_ANONYMOUS, -1, 0);
    if (counter == MAP_FAILED) { perror("mmap"); return 1; }
    *counter = 0;

    pid_t pid = fork();
    if (pid < 0) { perror("fork"); return 1; }
    if (pid == 0) {                        /* 子进程：加一百万次 */
        for (int i = 0; i < 1000000; i++) (*counter)++;
        return 0;
    }
    waitpid(pid, NULL, 0);                 /* 父进程等子进程收工 */
    printf("counter = %d\n", *counter);
    munmap(counter, sizeof(int));
    return 0;
}
```

```bash
gcc shared_counter.c -o shared_counter && ./shared_counter
```

```text
counter = 1000000
```

fork 出来的进程本是两份独立地址空间（330），这块映射却是同一份物理内存的两扇窗——数据真的通了。对照 [共享内存与信号量](/c/350-SharedMemorySemaphore)：同一件事 SysV IPC 要 shmget、shmat、shmdt 三步外加一个 key；mmap 版不要 key、没有删除仪式（进程退出映射自动消失），是亲缘进程间的现代首选。无亲缘进程要共享，用 350 末尾提到的 shm_open 命名对象再 mmap。一条提醒：如果父子同时 `++`，这里的 100 万立刻缩水——那就是 [线程与并发](/c/360-ThreadConcurrency) 的数据竞争，共享内存只共享数据，不共享纪律。mprotect 一句：mmap 给的内存可以运行中改权限（PROT_READ/PROT_WRITE/PROT_EXEC），JIT 与沙箱的地基，用到这里再查手册。

## 4. 权限模型：真实 UID 与有效 UID

```c
/* whoami.c：两个 UID 各报各的 */
#include <stdio.h>
#include <unistd.h>

int main(void) {
    printf("real=%d effective=%d\n", getuid(), geteuid());
    return 0;
}
```

```bash
gcc whoami.c -o whoami
./whoami
sudo chown root ./whoami        # 属主换成 root（需要 sudo）
sudo chmod u+s ./whoami         # 置 set-user-ID 位
./whoami
```

一次典型输出：

```text
real=1000 effective=1000
real=1000 effective=0
```

读法：真实 UID 回答「谁启动了这个进程」；有效 UID 是内核做权限检查时用的身份——打开文件、发信号、绑端口都看它。setuid 位的机制在 credentials 手册里写得直白：exec 一个置了 setuid 位的程序时，有效 UID（与保存设置 UID）换成文件属主的 UID，真实 UID 保持不变。passwd 能改只有 root 可写的 /etc/shadow，靠的就是这一下。这也回答了开篇的另一个问题：sudo 跑的程序为什么有特权——sudo 是被授权的启动器，它直接把子进程两个 UID 都设成 0。

危险面随之而来：一个以 root 有效身份运行的程序，任何一处被诱入歧途的代码都是全局破口——所以第 2 节的 LD_PRELOAD 对它必须失灵。ld.so 手册的规则：真实与有效 UID 不同的程序以 secure-execution 模式运行，LD_LIBRARY_PATH 被整体剥离，LD_PRELOAD 只认标准目录里同样置了 setuid 位的库。最小权限原则由此可操作：能用普通身份做的事绝不留给特权进程，特权段越短越好，做完立刻降回去（seteuid 一族为此存在）。

## 5. 终端与守护进程：把自己藏进后台

终端一行命令启动的进程，天然属于一个进程组、挂在启动它的终端（控制终端）上；终端一关，内核向整组发 SIGHUP（[信号处理](/c/340-SignalHandling) 讲过它的默认动作是终止），前台进程全灭。守护进程（daemon）要的就是与终端彻底断绝关系。330 的 fork、340 的 SIGHUP、以及会话与进程组的常识，拧成一个固定模式（步骤依据 daemon(7) 手册）：

```c
/* daemonize.c：完整可跑的守护进程 */
#include <fcntl.h>
#include <stdio.h>
#include <sys/stat.h>
#include <syslog.h>
#include <unistd.h>

int main(void) {
    /* 1. 第一次 fork，父进程退出：转入后台，子进程被 init 收养 */
    pid_t pid = fork();
    if (pid < 0) { perror("fork"); return 1; }
    if (pid > 0) return 0;

    /* 2. setsid：自立新会话，甩掉控制终端 */
    if (setsid() < 0) { perror("setsid"); return 1; }

    /* 3. 第二次 fork：此后不再是会话首进程，永远无法重新获得终端 */
    pid = fork();
    if (pid < 0) { perror("fork"); return 1; }
    if (pid > 0) return 0;

    /* 4. umask(0)：此后 open/mkdir 的权限完全由自己说了算 */
    umask(0);

    /* 5. 换根目录：避免占住挂载点让它卸不掉 */
    if (chdir("/") < 0) { perror("chdir"); return 1; }

    /* 6. 标准三流接 /dev/null：没有终端可写，读也不挂起 */
    close(STDIN_FILENO); close(STDOUT_FILENO); close(STDERR_FILENO);
    if (open("/dev/null", O_RDONLY) < 0) return 1;
    if (open("/dev/null", O_WRONLY) < 0) return 1;
    if (open("/dev/null", O_WRONLY) < 0) return 1;

    /* 7. 工作体：每 5 秒向系统日志报一次平安 */
    openlog("mydaemon", LOG_PID, LOG_DAEMON);
    while (1) {
        syslog(LOG_INFO, "still alive");
        sleep(5);
    }
}
```

```bash
gcc -Wall -Wextra daemonize.c -o daemonize
./daemonize
ps -o pid,ppid,tty,cmd -C daemonize
```

一次典型输出：

```text
    PID    PPID TT       CMD
   4523       1 ?        ./daemonize
```

验收两条：PPID 是 1——两个父进程都退了场，它是 init 的孩子；TT 是 ?——没有任何控制终端。日志去系统日志里看，daemon 没有终端可打印，openlog 挂上程序名、syslog 像 printf 一样写日志（%m 还能自动带上 errno 的文字），由系统日志进程统一收转：

```bash
journalctl -t mydaemon -n 3      # 老系统：grep mydaemon /var/log/syslog
```

```text
Sep 29 18:41:32 host mydaemon[4523]: still alive
```

三点收尾：真实服务还要处理「只起一份」（第 8 节挑战题）与优雅退出（信号纪律归 340）；glibc 的 daemon() 库函数只实现了这套步骤的一个子集，手册明确提醒慎用；现代系统更推荐 systemd 托管、进程保持前台由 init 管理日志，这套七步是给「不依赖 init 体系」的场景留的手艺。

## 6. 资源限制：ulimit 的系统调用本体

```c
/* limits.c：读自己进程的资源上限 */
#include <stdio.h>
#include <sys/resource.h>

static void show(int res, const char *name) {
    struct rlimit rl;
    if (getrlimit(res, &rl) < 0) { perror(name); return; }
    if (rl.rlim_cur == RLIM_INFINITY) {
        printf("%-10s soft=unlimited hard=%s\n", name,
               rl.rlim_max == RLIM_INFINITY ? "unlimited" : "capped");
    } else {
        printf("%-10s soft=%lu hard=%lu\n", name,
               (unsigned long)rl.rlim_cur, (unsigned long)rl.rlim_max);
    }
}

int main(void) {
    show(RLIMIT_STACK, "stack");
    show(RLIMIT_NOFILE, "nofile");
    return 0;
}
```

```bash
gcc limits.c -o limits && ./limits
ulimit -s
ulimit -n
grep -E "Max stack|Max open" /proc/self/limits
```

一次典型输出（常见默认值，随发行版浮动）：

```text
stack      soft=8388608 hard=unlimited
nofile     soft=1024 hard=1048576
8192
1024
Max stack size            8388608      unlimited            bytes
Max open files            1024         1048576              files
```

三条读法：

1. 每种资源一对值：软限（rlim_cur）是内核实际执行的额度——超了，栈溢出得 SIGSEGV、开文件得 EMFILE；硬限（rlim_max）是软限的天花板，普通进程可以把软限提到硬限，硬限只能降不能升；
2. ulimit 是 shell 内建命令，背后就是 getrlimit/setrlimit——shell 的限额会被子进程继承。250 篇的「默认 8 MB 栈」在此对上号：RLIMIT_STACK 软限 8388608 字节，递归深度那道除法的分母就是它；
3. /proc/self/limits 是内核视角的同一张表。排查「线上进程的限额和 shell 里不一样」时它说了算——systemd 之类的启动器改过限额，shell 的 ulimit 不作数。

setrlimit 的用法一句：服务启动早期把 RLIMIT_NOFILE 提到硬限、或主动把 RLIMIT_CORE 置 0 禁 core dump，都是一行 setrlimit 的事。

## 7. 时间与定时器：两座时钟不能混用

```c
/* two_clocks.c：同一份代码，读两座钟 */
#include <stdio.h>
#include <time.h>
#include <unistd.h>

static double now(clockid_t c) {
    struct timespec ts;
    clock_gettime(c, &ts);
    return (double)ts.tv_sec + (double)ts.tv_nsec / 1e9;
}

int main(void) {
    double r0 = now(CLOCK_REALTIME), m0 = now(CLOCK_MONOTONIC);
    sleep(2);
    double r1 = now(CLOCK_REALTIME), m1 = now(CLOCK_MONOTONIC);
    printf("REALTIME  elapsed = %.3f\n", r1 - r0);
    printf("MONOTONIC elapsed = %.3f\n", m1 - m0);
    return 0;
}
```

```bash
gcc two_clocks.c -o two_clocks && ./two_clocks
```

```text
REALTIME  elapsed = 2.000
MONOTONIC elapsed = 2.000
```

岁月静好时两座钟量出的间隔一样。差别在系统时间被改的那一刻。手册的定性（clock_gettime(3)）：CLOCK_REALTIME 会被系统时间的非连续跳变影响（管理员手动改时间、NTP 大步校准），也会被 adjtime 的渐进调节影响；CLOCK_MONOTONIC 不受非连续跳变影响——Linux 上它是自开机起的单调时间（不计入休眠，要计休眠另有 CLOCK_BOOTTIME）。

修改实验（需要能改时间的环境，虚拟机最合适）：程序跑到一半，在另一个终端执行 `sudo date -s "-1 hour"` 隔几秒再改回来。你会看到：

```text
REALTIME  elapsed = -3598.204
MONOTONIC elapsed = 2.001
```

负耗时不是玄学：REALTIME 被回拨，末读数小于初读数。规则由此立下：测耗时用 CLOCK_MONOTONIC，报日历时间才用 CLOCK_REALTIME。

timer_create 一句概览：340 篇的 alarm 只有秒级精度、到点只发 SIGALRM；POSIX 的 timer_create 一族提供毫秒级精度、一个进程可挂多个定时器、到期行为可选（发指定信号或开线程），接口细节用到这里再查手册。

## 8. 常见错误与调试实录

### 事故一：mmap 之后忘 munmap 的映射泄漏

```c
/* leak_map.c：每轮都映射，谁也不解除 */
#include <stdio.h>
#include <sys/mman.h>

int main(void) {
    for (int i = 0; i < 100000; i++) {
        void *p = mmap(NULL, 4096, PROT_READ | PROT_WRITE,
                       MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
        if (p == MAP_FAILED) { perror("mmap"); return 1; }
        /* 忘了 munmap：地址空间每轮涨 4 KB */
    }
    return 0;
}
```

malloc 泄漏盯 RSS，mmap 泄漏盯地址空间。自查工具就在 /proc：

```bash
./leak_map &
sleep 2
grep -c "" /proc/$!/maps      # 几万行映射条目——泄漏实锤
```

每个 4 KB 匿名映射占一行，十万轮后 maps 文件本身就有几万行，内核遍历与 TLB 都跟着遭殃。修复：用完 munmap，或复用同一块映射。注意 ASan 抓不到这类泄漏——它盯的是 malloc 的账本，不是 mmap 的账本；[静态分析与 Sanitizers](/c/485-StaticAnalysisAndSanitizers) 的工具箱之外，这一类要靠 /proc/self/maps 自查。

### 事故二：setuid 程序「不认」你的 LD_PRELOAD

```bash
sudo chown root ./demo && sudo chmod u+s ./demo
LD_PRELOAD=./fake_time.so ./demo    # fake_time 没生效，程序行为如常
```

不是 bug：第 4 节引过的 ld.so 规则——secure-execution 模式下，带斜杠路径的 LD_PRELOAD 直接被忽略，LD_LIBRARY_PATH 整个剥离。这条安全纪律反过来也是排查线索：「setuid 程序怎么不加载我配置的库」，第一嫌疑就是它。想给特权程序做测试注入，改走受控通道（程序自身的测试钩子、独立的测试身份），别与安全机制对抗。

### 事故三：用 REALTIME 计时被时钟回拨坑出负耗时

```c
double elapsed = end_realtime - start_realtime;  /* NTP 一校准：-0.5 */
double rate = count / elapsed;                   /* 速率变负，限速窗口失灵 */
```

复现路径见第 7 节的修改实验。修复：测耗时一律 CLOCK_MONOTONIC；REALTIME 只用于要给人看、要跨机器对时的时间戳，并且比较逻辑容忍回退。一条经验法则收口：REALTIME 回答「现在几点」，MONOTONIC 回答「过了多久」。

## 实际项目中的使用场景

- 服务端老三样：daemon 化、syslog、rlimit 是经典服务模板的标配，容器与嵌入式里至今常见；
- 存储与缓存：把索引文件 mmap 进地址空间是 SQLite（提供 mmap 访问模式）与许多存储引擎的常规操作，按需分页让「整个文件当数组」的成本可承受；
- 安全敏感程序：setuid 程序的环境消毒清单（secure-execution 行为）是安全审计的固定考点，恶意视角归安全模块；
- 性能测量：任何 benchmark 框架的第一行都是 clock_gettime(CLOCK_MONOTONIC)，490 篇的量化调试同样立在单调钟上。

## 小练习

预测题（5 分钟）：把第 3 节 shared_counter.c 里的 MAP_SHARED 换成 MAP_PRIVATE，程序输出什么？先写答案再运行。

参考答案（先写再看）：大概率 0。私有映射写时复制——子进程的一百万次 ++ 全落在它自己的私有副本上，父进程的 counter 分毫未动。共享与私有一字之差，数据通不通就此分野。

挑战题（30 分钟，不看提示先动手）：给 daemonize.c 加「只起一份」保护——用 PID 文件独占创建：`open("/var/run/mydaemon.pid", O_CREAT | O_EXCL | O_WRONLY, 0644)`，创建失败说明已有实例在跑，打印提示退出；守护进程收到 SIGTERM 时删掉文件再退。

提示（思路方向）：O_EXCL 的「存在即失败」是原子动作；千万别写成「先判断文件存在、再创建」两步——检查与创建之间有竞态窗口。

展开（关键点）：信号处理器里只能调异步信号安全函数——unlink 可以，printf 不行，规则出处见 340；PID 文件内容写 getpid() 的十进制值，方便运维 kill。验收清单：起第二份实例被拒；kill 掉第一份后能再次正常启动；/var/run/mydaemon.pid 不残留。

## 与之前和之后的知识的关系

- 往前：[进程与管道](/c/330-ProcessAndPipe) 的 fork/exec/wait 是第 4、5 节的底座；[动态库与静态库](/c/320-DynamicStaticLibrary) 的搜索顺序在第 2 节进入运行时现场；[信号处理](/c/340-SignalHandling) 的 SIGHUP 与异步安全清单在第 5、8 节两度复用；
- 旁支：[共享内存与信号量](/c/350-SharedMemorySemaphore) 的 SysV IPC 与第 3 节互为对照；栈限额接 [函数调用栈帧](/c/250-FunctionCallStackFrame) 的递归深度除法；/proc/self/maps 的地址空间视角接 [内存深水区](/c/210-ProcessMemoryLayoutAndErrors) 的五段地图；
- 往后：链表与二叉树那类数据结构由 [结构体与联合](/c/130-StructAndUnion)、[指针深度解析](/c/140-PointerDeep)、[函数指针与回调](/c/170-FunctionPointerCallback) 的积木拼装，本篇不再重复；[C 语言项目实战](/c/580-CProjectExampleStudentGradeSystem) 把本模块的系统件用最朴素的方式组装成完整项目。

## 官方文档

- ld.so(8)：动态链接器、搜索顺序、LD_DEBUG/LD_PRELOAD 与 secure-execution：https://man7.org/linux/man-pages/man8/ld.so.8.html
- mmap(2)：MAP_SHARED/MAP_PRIVATE/MAP_ANONYMOUS 与 MAP_FAILED：https://man7.org/linux/man-pages/man2/mmap.2.html
- credentials(7)：真实/有效/保存设置 UID 与 set-user-ID 机制：https://man7.org/linux/man-pages/man7/credentials.7.html
- daemon(7)：守护进程实现步骤清单：https://man7.org/linux/man-pages/man7/daemon.7.html
- syslog(3)：openlog/syslog 与日志级别：https://man7.org/linux/man-pages/man3/syslog.3.html
- getrlimit(2)：软限/硬限、RLIMIT_STACK 与 /proc/pid/limits：https://man7.org/linux/man-pages/man2/getrlimit.2.html
- clock_gettime(3)：CLOCK_REALTIME 与 CLOCK_MONOTONIC 的精确语义：https://man7.org/linux/man-pages/man3/clock_gettime.3.html

## 自我检查

- 能对着 LD_DEBUG 的输出说出 ld.so 加载 .so 的四个阶段，并解释 LD_PRELOAD 抢注符号的原理；
- 能不看资料写出 MAP_SHARED 加 MAP_ANONYMOUS 的 mmap 调用，并说出为什么映射要建在 fork 之前；
- 能说出 getuid 与 geteuid 各回答什么问题，setuid 位在 exec 时改变了什么、没改变什么；
- 能默写守护进程化七步各自的理由，并说出为什么第二次 fork 之后「永远拿不回终端」；
- 能解释软限与硬限的关系、ulimit 与 getrlimit 的对应，以及「线上限额与 shell 不一致」该看哪个文件。

## 本章总结

ld.so 是每个动态程序的隐藏入口：按 320 的顺序找到库、映进内存、跑初始化、再交棒 main；LD_PRELOAD 用抢先加载改写符号配平，setuid 程序的 secure-execution 模式把这条路封死。mmap 把文件与匿名内存映成指针：MAP_PRIVATE 写时复制、MAP_SHARED 进程互通、MAP_ANONYMOUS 清零内存，fork 前建好的共享映射是亲缘进程的现代 IPC。UID 有两张面孔：真实 UID 记谁启动、有效 UID 管权限检查，setuid 位在 exec 时交换后者——权力与危险同源。守护进程七步（fork、setsid、再 fork、umask、chdir、接 /dev/null、syslog）把进程藏进没有终端的后台。getrlimit 是 ulimit 的本体，软限执行、硬限封顶，/proc/self/limits 说了算。最后是两座钟的分工：REALTIME 会回拨、只管日历，MONOTONIC 只进不退、专管耗时——测速用错钟，负耗时会替你记住这一课。

## 下一步

进入 [C 语言项目实战](/c/580-CProjectExampleStudentGradeSystem)：机制攒了一路，终于到组装——一个完整的学生成绩管理系统，把结构体、动态数组、文件 I/O 与一路攒下的工程纪律拼进同一个项目。
