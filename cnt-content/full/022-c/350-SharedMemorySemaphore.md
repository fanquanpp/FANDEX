---
order: 390
title: 共享内存与信号量：System V IPC
module: 'c'
category: 计算机科学
difficulty: advanced
description: 两个互不相干的进程要共写一个计数器：ftok 造钥匙、shmget/shmat 挂接共享内存并用 ipcs 实地查看，先跑无保护计数器的竞态现场，再上 System V 信号量 P/V 封装，完整写者读者双进程示例，直面「进程退了段还在」的生命周期陷阱与 ipcrm 清理实录。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'c/360-ThreadConcurrency'
  - 'c/420-CPosixSystemCall'
  - 'c/390-SocketNetworkProgramming'
prerequisites:
  - 'c/330-ProcessAndPipe'
---

## 前置知识

- 已完成 [进程与管道](/c/330-ProcessAndPipe)：亲手用过 fork、pipe、wait，知道父子进程的地址空间互不相干、管道里流的是字节；
- 一台能跑 Linux 的机器（macOS 终端或 Windows 上的 WSL 都行）：System V IPC 是 Unix 世界的设施，Windows 原生没有这套接口。

没读过 330 也能往下读，本文用到 fork 与管道概念时会顺手带上背景。

> 分工说明：本模块围绕「进程之间怎么传数据、怎么不踩脚」分成三篇。330 讲进程本身与管道——管道是字节流，一头写一头读，亲缘进程之间最顺手；本篇讲 System V IPC——共享内存让数据可以被**随机访问**，信号量负责排它，无亲缘关系的进程也照样能用；[线程与并发](/c/360-ThreadConcurrency) 与 [POSIX 线程](/c/370-POSIXThread) 讲同一地址空间里的并发，那边根本不需要 IPC，因为线程本来就共享内存。POSIX 风格的共享内存（shm_open/mmap）不是本篇主线，第 7 节用一段概览交代去处。

## 学习目标

读完本文你将能够：

1. 说出共享内存为什么是进程间通信（IPC，inter-process communication）里最快的一档，以及它的代价是什么；
2. 用 ftok、shmget、shmat、shmdt、shmctl 五件套亲手建立并访问一块共享内存，用 ipcs 找到它、用 ipcrm 删掉它；
3. 解释 System V 信号量的 P/V 语义，封装出 sem_p/sem_v 并让两个进程安全地共写一个计数器；
4. 复现并修复「无保护共享计数器少于 200000」的竞态，说清同步为什么不能省；
5. 识别 System V IPC 的生命周期陷阱：进程退出后段还在，会查、会删、不泄漏。

预计 60 到 90 分钟，含 5 组动手实验、1 道预测题与 1 道挑战题。

## 1. 问题引入：两个互不相干的进程，怎么共享一个 int

设想一个具体需求：进程 A 是采集器，每收到一笔数据就给计数器加一；进程 B 是监控台，随时想知道计数器现在等于几。两个程序**互为陌生人**——不是谁 fork 出来的，甚至可能由不同的人编译、在不同时间启动。

学过的两招都不顺手。管道（[进程与管道](/c/330-ProcessAndPipe)）是**字节流**：B 想知道「现在的值」，就得让 A 不停地把数字写进管道，B 不停地读、自己拼状态——你要的是随机访问一个变量，管道却只给一条传送带。普通文件倒是可以随机读写，但每次都要 open/read/write/close，内核还要把改动落盘，又慢又要自己处理「读到半截」的问题。

我们需要的是：一块**两个进程都能直接摸到的内存**。这就是共享内存——把同一块物理内存映射进两个进程各自的地址空间，A 写进去的字节，B 立刻可见，快到与读写普通变量没有区别。先跑起来看看它长什么样：

```c
/* shm_first.c：第一块共享内存 */
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/ipc.h>
#include <sys/shm.h>

#define SHM_KEY 0x1234
#define SHM_SIZE 4096

int main(void) {
    /* 要一段：key 相当于「存包柜号」，权限 0666 */
    int shmid = shmget(SHM_KEY, SHM_SIZE, IPC_CREAT | 0666);
    if (shmid == -1) {
        perror("shmget");
        return 1;
    }
    printf("shmid = %d\n", shmid);

    /* 接进来：把这段内存挂到自己进程的地址空间 */
    char *area = shmat(shmid, NULL, 0);
    if (area == (void *)-1) {
        perror("shmat");
        return 1;
    }

    /* 用它：像普通内存一样读写 */
    snprintf(area, SHM_SIZE, "hello from pid %d", getpid());
    printf("read back: %s\n", area);

    shmdt(area);    /* 挂断。注意：这段代码故意不删除段，第 6 节见分晓 */
    return 0;
}
```

```bash
gcc -Wall -Wextra shm_first.c -o shm_first
./shm_first
ipcs -m
```

```text
shmid = 5
read back: hello from pid 4819
$ ipcs -m
------ Shared Memory Segments --------
key        shmid      owner      perms      bytes      nattch     status
0x00001234 5          fanquanpp  666        4096       0
```

（key、shmid、owner 每台机器不同。）程序已经退出，`ipcs -m` 列出的那段却还在——这不是泄漏演示的巧合，而是 System V IPC 的设计：**它的生命周期不跟随任何进程，从创建起活到被显式删除或重启为止**。这个特性第 6 节专门收拾，先把「两个进程怎么握手」讲完。

## 2. 五件套与一把钥匙：ftok、shmget、shmat、shmdt、shmctl

把第 1 节的四个调用放回问题里，各管一件事：

| 调用 | 干什么 | 类比 |
| --- | --- | --- |
| key | 双方约定的「柜号」 | 电话号码 |
| shmget | 按柜号找到（或新建）段 | 问管理员要柜子 |
| shmat | 把段挂进自己的地址空间 | 拿到柜子里那格的钥匙 |
| shmdt | 解除挂接 | 还钥匙（柜子还在） |
| shmctl | 管理动作：查询、改权限、删除 | 叫管理员封柜 |

`shmget(SHM_KEY, size, IPC_CREAT | 0666)` 的语义按手册页拆开：key 没有对应的段且带了 `IPC_CREAT` 就新建——新建的段**内容全为零**；size 会被向上取整到页面大小的整数倍；成功返回段的标识符 shmid，失败返回 -1 并设置 errno（`errno` 见 [信号处理](/c/340-SignalHandling) 一带的手法，`perror` 直接读它）。再加 `IPC_EXCL` 则变成「只许新建」：段已存在就报错，常用来做「我只当创建者」的约定。

固定常量当 key 能跑通教学示例，正解是 `ftok`——用「一个真实存在的路径 + 一个项目字符」生成 key，避免和系统里别的程序撞号：

```c
/* ftok_try.c：同一个路径，不同项目字符，key 不同 */
#include <stdio.h>
#include <sys/ipc.h>

int main(void) {
    printf("key(M) = 0x%08x\n", (unsigned int)ftok(".", 'M'));
    printf("key(S) = 0x%08x\n", (unsigned int)ftok(".", 'S'));
    return 0;
}
```

```text
key(M) = 0x4d021a7c
key(S) = 0x53021a7c
```

（具体值每台机器不同，但两个值一定不同。）三点手册口径，写代码前要心里有数：路径必须指向一个**真实存在且可访问**的文件或目录（`.` 是最省事的选择）；项目字符只有低 8 位参与运算，所以 `'a'`、`97`、`'\x61'` 是同一个；key 由 inode 与设备号的低位拼出来，**只保证「同一个文件 + 同一个字符得到同一个 key」，不保证全局唯一**——文件被删除重建后 inode 变了，key 就变了。两个不同项目字符正好让共享内存和信号量各拿一把钥匙，后文就这么用。

shmat 的返回值值得打印一次看看：

```c
    void *addr = shmat(shmid, NULL, 0);
    printf("attached at %p\n", addr);
```

在两个终端分别运行第 1 节的程序（先把写入消息的行换成打印），两个 `%p` 的值**不一样**——每个进程把同一段物理内存挂到了自己虚拟地址空间的（可能）不同位置。所以约定只有一条：**只存相对偏移，不存裸指针**。段内部要用指针时，写 `area + 100` 这类相对地址，永远别把 `area` 本身的值存进段里传给对方。这件事的背景——进程地址空间本就独立——正是 [内存深水区](/c/210-ProcessMemoryLayoutAndErrors) 五段布局里 bss 与堆之上的事情。

修改实验一：把 `SHM_KEY` 改成任意别的值再跑，`ipcs -m` 里出现第二行——同一个 key 一段内存，换个号就是新柜子。玩完用 `ipcrm -m <shmid>` 把多余的段删掉（shmid 看输出），保持系统干净。

## 3. 没有锁的两个进程：竞态现场

现在让两个真正的陌生人共写一个计数器。程序用命令行参数分角色：`init` 清零，`worker` 自增十万次。

```c
/* shm_race.c：两个进程同时给同一个共享计数器自增 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/ipc.h>
#include <sys/shm.h>

#define SHM_KEY 0x2345

struct ShmArea {
    int counter;        /* 两个进程都要写的计数器 */
    char message[128];  /* 顺手放一条消息 */
};

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "用法: %s init|worker\n", argv[0]);
        return 1;
    }

    int shmid = shmget(SHM_KEY, sizeof(struct ShmArea), IPC_CREAT | 0666);
    if (shmid == -1) { perror("shmget"); return 1; }

    struct ShmArea *area = shmat(shmid, NULL, 0);
    if (area == (void *)-1) { perror("shmat"); return 1; }

    if (strcmp(argv[1], "init") == 0) {
        area->counter = 0;
        area->message[0] = '\0';
        printf("计数器已清零，shmid=%d\n", shmid);
    } else {
        for (int i = 0; i < 100000; i++) {
            area->counter++;      /* 没有任何保护 */
        }
        printf("worker %d 收工时看到 counter = %d\n", getpid(), area->counter);
    }

    shmdt(area);
    return 0;
}
```

```bash
gcc -Wall -Wextra shm_race.c -o shm_race
./shm_race init
./shm_race worker &
./shm_race worker &
wait
```

一次典型输出（每次运行都不同）：

```text
计数器已清零，shmid=8
worker 5121 收工时看到 counter = 152214
worker 5122 收工时看到 counter = 173409
```

200000 次自增，账面上少了三万多次，而且每跑一次数字都在变。原因与单进程世界如出一辙：`counter++` 不是一步，是「读出来、加一、写回去」三步；两个进程轮到谁执行由内核调度决定，写回可能踩掉对方刚写的值。每丢一次更新，总数就少一。这套三步拆解与「调度随时可能打断」的完整论述是 [线程与并发](/c/360-ThreadConcurrency) 的主题——那边用线程、这边用进程，**丢更新的机理一模一样**：只要两个执行流无同步地写同一块内存，账就一定对不上。区别只在于线程在同一地址空间里打架，进程通过共享内存把两块独立地址空间接到了一起。

修改实验二：把 `worker` 的循环次数改成 10 再跑，跑十次。次数少了碰撞概率小，偶尔能得到正确的 20——这不是修好了，是运气。真实系统的碰撞窗口每秒百万次，靠运气对不了账。

顺带看一眼 `nattch`：两个 worker 运行期间另开一个终端跑 `ipcs -m`，status 前面的 nattch 列显示 2——**当前正有两个进程挂着这段**，这是下一节信号量登场的舞台。

## 4. System V 信号量：内核里的计数器加一条等待队列

修法需要一个「裁判」：同一时刻只放一个进程进临界区（critical section，访问共享资源的代码段），别人在门外睡觉而不是空转。System V 信号量就是这个裁判——注意它不是「一块受保护的内存」，而是**内核维护的计数器，减到不够减时把调用者挂起排队，V 操作时再叫醒**。这套「等待时不占 CPU」的语义，比进程自己写「循环检查标志」高明得多——那样既烧 CPU 又有可见性陷阱。

接口三件套：`semget` 建信号量集（一次建一组，常用组里只放一个）、`semctl` 做管理与初始化、`semop` 执行真正的 P/V 操作。语义按手册页口径：

| sem_op 取值 | 名字 | 行为 |
| --- | --- | --- |
| 负数（如 -1） | P（申请） | 计数够减就减掉继续跑；不够减就挂起，直到有人加 |
| 0 | 等零 | 计数不为 0 就挂起，等到变 0 |
| 正数（如 +1） | V（归还） | 计数加上；有等待者就叫醒 |

初值定含义：初值 1 配 P/V 就是互斥锁（一次只放一个进程进）；初值 N 就是资源池（最多放 N 个进程进）。System V 信号量挂在内核里、进程都退出后依然存在（同第 6 节的生命周期），所以它天生就是给**进程间**用的。先封装两个动作，之后的代码再也不用碰裸的 semop：

```c
/* P：申请。信号量减 1，不够减就睡到有人 V 为止 */
int sem_p(int semid) {
    struct sembuf op = { 0, -1, 0 };   /* 第 0 个信号量，减 1，无特殊标志 */
    return semop(semid, &op, 1);
}

/* V：归还。信号量加 1，有等待者就唤醒一个 */
int sem_v(int semid) {
    struct sembuf op = { 0, 1, 0 };
    return semop(semid, &op, 1);
}
```

`struct sembuf` 三个字段：操作哪个信号量（集合里的下标）、加减多少、标志位。标志位里最值得一提的是 `SEM_UNDO`：带上它，进程**异常终止**时内核会替它把改过的信号量退回去，否则一个进程拿着锁崩溃，别的进程就在门口睡到天荒地老。多写一句 `SEM_UNDO`，多一分抗崩性；本节示例从简不带它，挑战题里补上。另一个要习惯的动作是初始化：`semctl(semid, 0, SETVAL, arg)` 把第 0 个信号量的值设为 arg.val，arg 是个必须由使用者自己定义的联合体（Linux 手册的口径，照抄即可）——信号量的初值**不会自己变 1**：Linux 上新建的信号量集值是 0，手册同时提醒可移植程序不能依赖这一点，必须显式 SETVAL。忘了初始化的信号量，P 一下就睡死，这是新手第一大坑。

## 5. 完整闭环：互斥保护的写者与读者

把前面的零件装起来。一个程序三个角色：`init` 建好共享内存与信号量并初始化，`writer` 在锁保护下自增计数器并留下消息，`reader` 读走现场。

```c
/* shm_lock.c：信号量护住的共享区，写者与读者 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/ipc.h>
#include <sys/shm.h>
#include <sys/sem.h>

/* Linux 手册要求：semctl 的第四个参数是这个联合体，由使用者定义 */
union semun {
    int val;
    struct semid_ds *buf;
    unsigned short *array;
};

struct ShmArea {
    int counter;
    char message[128];
};

/* P：申请资源，信号量减 1；不够减就睡到有人 V 为止 */
int sem_p(int semid) {
    struct sembuf op = { 0, -1, 0 };
    return semop(semid, &op, 1);
}

/* V：归还资源，信号量加 1；有等待者就唤醒一个 */
int sem_v(int semid) {
    struct sembuf op = { 0, 1, 0 };
    return semop(semid, &op, 1);
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "用法: %s init|writer|reader\n", argv[0]);
        return 1;
    }

    key_t shm_key = ftok(".", 'M');   /* 共享内存一把钥匙 */
    key_t sem_key = ftok(".", 'S');   /* 信号量另一把，项目字符不同 */
    if (shm_key == -1 || sem_key == -1) { perror("ftok"); return 1; }

    int shmid = shmget(shm_key, sizeof(struct ShmArea), IPC_CREAT | 0666);
    int semid = semget(sem_key, 1, IPC_CREAT | 0666);
    if (shmid == -1 || semid == -1) { perror("shmget/semget"); return 1; }

    struct ShmArea *area = shmat(shmid, NULL, 0);
    if (area == (void *)-1) { perror("shmat"); return 1; }

    if (strcmp(argv[1], "init") == 0) {
        union semun arg = { .val = 1 };   /* 初值 1：一次只放一个进程进临界区 */
        if (semctl(semid, 0, SETVAL, arg) == -1) { perror("semctl"); return 1; }
        area->counter = 0;
        area->message[0] = '\0';
        printf("就绪：shmid=%d semid=%d\n", shmid, semid);
    } else if (strcmp(argv[1], "writer") == 0) {
        int n = (argc > 2) ? atoi(argv[2]) : 1;
        for (int i = 0; i < n; i++) {
            sem_p(semid);
            area->counter++;          /* 临界区：只摸共享数据，快进快出 */
            sem_v(semid);
        }
        sem_p(semid);
        snprintf(area->message, sizeof(area->message),
                 "writer %d 完成 %d 次自增", getpid(), n);
        printf("%s\n", area->message);
        sem_v(semid);
    } else {
        sem_p(semid);
        printf("读到: counter=%d message=%s\n", area->counter, area->message);
        sem_v(semid);
    }

    shmdt(area);
    return 0;
}
```

```bash
gcc -Wall -Wextra shm_lock.c -o shm_lock
./shm_lock init
./shm_lock writer 100000 &
./shm_lock writer 100000 &
wait
./shm_lock reader
```

一次典型输出：

```text
就绪：shmid=9 semid=3
writer 5310 完成 100000 次自增
writer 5311 完成 100000 次自增
读到: counter=200000 message=writer 5311 完成 100000 次自增
```

counter 稳定等于 200000，跑多少次都一样——这就是第 3 节欠的账。两条写消息撞在一起也不会互相撕碎：snprintf 与读取都排在同一把 P/V 后面，谁先进谁写完。注意临界区的纪律：**里面只放碰共享数据的那几行**，printf 这类慢活挪到锁外——锁的粒度越小，等待的人越少。

修改实验三：把 writer 里的 `sem_p/sem_v` 注释掉再跑，回到第 3 节的乱象；再把初值 `1` 改成 `2` 跑一遍，counter 重新对不上——初值 2 意味着「最多同时放两个写者进」，互斥就破了。信号量的正确性取决于初值与 P/V 是否成对，三处坏一处全盘崩。

## 6. 生命周期陷阱：进程退了，段还在

System V IPC 与普通内存最大的不同，手册页在 shmctl 的 IPC_RMID 条目里说得直白：删除动作只是**打上销毁标记**，要等最后一个挂接的进程 detach（nattch 归零）段才真正消失；而如果**没人负责删除**，段的物理页会一直留在内存或交换区里，`ipcs` 里永远挂着一行——直到机器重启。信号量、消息队列同样如此。这就是本文开头那个「程序退了段还在」的完整解释：这套设施被设计成**独立于进程的生命周期**，好处是服务崩溃重启后数据还在，代价是**没人打扫就永远在那**。

动手体验一遍。先确认现场（第 5 节跑完的状态）：

```bash
ipcs -m
ipcs -s
```

```text
------ Shared Memory Segments --------
key        shmid      owner      perms      bytes      nattch     status
0x4d021a7c 9          fanquanpp  666        132        0

------ Semaphore Arrays --------
key        semid      owner      perms      nsems
0x53021a7c 3          fanquanpp  666        1
```

两个键值对得整整齐齐（都来自同一个目录的 ftok，项目字符 M 与 S）。清理有两条路。手工路：`ipcrm` 按编号删，`-m` 删共享内存段、`-s` 删信号量集：

```bash
ipcrm -m 9
ipcrm -s 3
ipcs -m    # 列表里那一行消失了
```

程序路：由「最后走的人」调用 `shmctl` 与 `semctl` 删除：

```c
    if (shmctl(shmid, IPC_RMID, NULL) == -1) { perror("shmctl shm"); return 1; }
    if (semctl(semid, 0, IPC_RMID) == -1)    { perror("semctl sem"); return 1; }
```

工程纪律随之而来：**创建者负责初始化，最后一个退出的进程负责 IPC_RMID**——哪个进程是「最后一个」要靠约定（比如读者进程读完顺手删），或者退而求其次在服务启动脚本里先 `ipcrm` 清一遍旧账再启动。调试期的「灵异现象」多半源于旧段没删：改了结构体定义重跑，程序却还在读旧布局的数据——先 `ipcs` 再 `ipcrm`，当场破案。

修改实验四：把第 5 节 reader 角色的末尾加上那两行 IPC_RMID，重跑完整流程，结束后 `ipcs -m` 与 `ipcs -s` 应当双双干净。这一步做完，本文的所有示例就都不留垃圾了。

## 7. 一段概览：System V 之外的路线

System V IPC 只是 Unix 进程间共享内存的一个门派。写代码时你会遇到的另外几条路，这里各给一句话定位，避免拿着本篇的 API 去套别的世界：

- **POSIX 共享内存**：`shm_open` 建命名对象（名字必须以斜杠开头、不能带二级路径，如 `/myshm`）、`ftruncate` 定大小、`mmap` 映射进地址空间、`shm_unlink` 删除；生命周期同样是「创建后独立存在直到 unlink 或重启」。文件映射与 mmap 的完整语义在 [POSIX 系统调用](/c/420-CPosixSystemCall) 展开。
- **匿名共享映射**：`mmap` 时带 `MAP_SHARED | MAP_ANONYMOUS`，不需要 key 也不需要名字，fork 之前建好、父子天然共享——亲缘进程之间的轻量首选（fork 见 [进程与管道](/c/330-ProcessAndPipe)）。
- **POSIX 信号量**：命名版 `sem_open("/mysem", ...)` 配 sem_wait/sem_post，天生能与 POSIX 共享内存搭档；无名版 `sem_init` 只能用于同一进程内的线程之间。C 标准本身至今没有信号量，这些都是 POSIX 扩展。
- **System V 消息队列**：msgget/msgsnd/msgrcv 三件套，SysV IPC 家族里按消息（而不是字节流）收发的第三个兄弟，适合「一条一条结构化消息」的场景；进程间字节流的选择题（管道还是消息队列还是套接字）在 [套接字网络编程](/c/390-SocketNetworkProgramming) 里有系统对照。

生产者-消费者模式同样可以跨进程实现——用共享内存当队列、三根信号量分别当互斥、空槽计数、满货计数，思想与 [线程与并发](/c/360-ThreadConcurrency) 讲的是同一套；线程版完整实现在 [POSIX 线程](/c/370-POSIXThread)，进程版只是把锁换成信号量、把线程换成进程，本篇不重复展开。

## 实际项目中的使用场景

- 高频共享状态：行情终端把最新报价放进共享内存，多个看板进程零拷贝随机读取——管道要复制、轮询文件要落盘，共享内存一步到位；
- 服务与监控解耦：服务进程持续更新共享区里的健康指标（计数器、时间戳），监控进程随时来读，两边无亲缘、各自独立发布与重启，正好用得上 key 约定与 0666 权限；
- 桌面应用的多进程架构：浏览器多进程模型里，各进程把渲染统计写进共享区供主进程汇总，配合信号量做读改写互斥。

## 小练习

预测题（5 分钟）：换一套新 key 编译（或先 `ipcrm` 清掉旧对象），直接跑 `./shm_lock reader`（不跑 init），输出什么？先写答案再验证。

参考答案（先写再看）：什么也不输出——程序卡死在 sem_p 里。Linux 上新创建的信号量集值是 0（手册提醒可移植程序不能依赖这一点），reader 的 P 操作要把计数减 1，0 减不动，只好睡到有人 V 为止。这正好现场复现第 4 节警告过的「忘 SETVAL，P 一下就睡死」第一大坑：Ctrl-C 退出，老老实实先跑 init。共享内存那边倒是省心：新建的段全为零，若绕过信号量直接读，counter 就是 0。两条事实——「信号量初值为 0」「共享内存初值为零」——在这里一正一反地交汇。

挑战题（半小时，不看答案先动手）：给 shm_lock 加抗崩性——写者进程可能在临界区里被 kill，其余进程不能被永远卡在门外。

提示（思路方向）：第 4 节的 `SEM_UNDO` 标志就是为此而生：进程退出时内核代为回退它对信号量的修改。

展开（关键 API）：把两个封装里 sembuf 的第三个字段从 0 改成 `SEM_UNDO`；注意 init 角色的 SETVAL 不需要它，而 P/V 双方语义仍要成对。

验收清单：运行 writer 时对它 `kill -9`，另一个 writer 仍能正常完成计数；`ipcs -s` 里 semid 还在（没人删），`ipcrm -s` 手工清掉。

## 与之前和之后的知识的关系

- 往前：[进程与管道](/c/330-ProcessAndPipe) 建立的「进程地址空间独立」是共享内存存在的原因；fork 与 wait 在匿名映射路线里仍是主角；
- 旁支：shmat 挂进来的地址长什么样，对应 [内存深水区](/c/210-ProcessMemoryLayoutAndErrors) 的虚拟地址空间；mmap 的完整用法在 [POSIX 系统调用](/c/420-CPosixSystemCall)；跨机器共享的下一层是 [套接字网络编程](/c/390-SocketNetworkProgramming)；
- 往后：本文的竞态只拆了「是什么」，「为什么调度随时打断、数据竞争在 C11 下意味着什么」在 [线程与并发](/c/360-ThreadConcurrency) 系统讲；同一地址空间里的并发（线程）是 [POSIX 线程](/c/370-POSIXThread) 的主场，那里的互斥锁与条件变量是信号量思想的近亲。

## 官方文档

- shmget 手册页（IPC_CREAT 语义、全零初始化、页对齐）：https://man7.org/linux/man-pages/man2/shmget.2.html
- shmctl 手册页（IPC_RMID 的销毁时机与泄漏警示）：https://man7.org/linux/man-pages/man2/shmctl.2.html
- semop 手册页（P/V/等零三种语义、SEM_UNDO）：https://man7.org/linux/man-pages/man2/semop.2.html
- ftok 手册页（路径要求、项目字符、碰撞可能）：https://man7.org/linux/man-pages/man3/ftok.3.html
- ipcs 手册页（查看 System V IPC 设施）：https://man7.org/linux/man-pages/man1/ipcs.1.html

## 自我检查

- 能不看资料说出 key、shmid、挂接地址三者各是什么，为什么不能把裸指针存进共享区；
- 能亲手完成「init、两个 writer 并发自增、reader 读结果」的完整编排，并解释 counter 为什么恒等于 200000；
- 能向同事讲清信号量 P/V 与「进程自己写循环检查标志」的差别，以及 SEM_UNDO 防的是什么；
- 拿到一台「灵异现象」频出的机器，会用 ipcs/ipcrm 排查与清理遗留的 System V IPC 对象。

## 本章总结

共享内存把同一块物理内存挂进多个进程的地址空间，是进程间通信里最快、也最危险的一档：快在零拷贝随机访问，危险在没有同步时写必踩脚。五件套各司其职——ftok 造钥匙、shmget 找段、shmat 挂接、shmdt 解挂、shmctl 管理；信号量是内核里的计数器加等待队列，P 申请 V 归还，初值定含义，SETVAL 不能忘。System V IPC 的生命周期独立于进程：删除只是标记、最后一个 detach 才真消失，没人负责就永远留在 ipcs 里——创建者初始化、最后走的人删除，是这套设施的使用纪律。竞态的机理、临界区与互斥的思想，下一篇在同一个地址空间里接着讲。

## 下一步

进入 [线程与并发](/c/360-ThreadConcurrency)：刚才两个进程为一块内存打的架，在同一个进程的两个线程之间天天发生——线程为什么天生共享内存、数据竞争在 C11 标准里意味着什么、锁与同步的思想地基，一次打牢。
