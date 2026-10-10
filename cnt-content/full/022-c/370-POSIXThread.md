---
order: 410
title: POSIX 线程：pthread 从创建到同步
module: 'c'
category: 计算机科学
difficulty: advanced
description: 把 360 的计数器事故亲手复现再亲手修复：-pthread 编译纪律、pthread_create 的错误码契约与传参陷阱、join 与 detach 的取舍、互斥锁四件套、条件变量的虚假唤醒与 while 重查，最终写完有界队列版生产者消费者，附 pthread_cancel 争议与同步原语全家福一瞥。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'c/350-SharedMemorySemaphore'
  - 'c/380-AtomicAndMemoryModel'
  - 'c/340-SignalHandling'
prerequisites:
  - 'c/360-ThreadConcurrency'
  - 'c/090-FunctionDetailed'
---

## 前置知识

- 已完成 [线程与并发](/c/360-ThreadConcurrency)：知道竞态条件与数据竞争的成因，理解临界区、互斥与生产者-消费者的思想——本文把那些「先混个眼熟」的调用逐行落地；
- 已完成 [函数详解](/c/090-FunctionDetailed)：知道函数是地址、可以作为参数传来传去——线程入口函数的本质就是一次回调。

没读过 360 也能跑通本文代码，但「为什么要锁」的推理都在那边，建议先补。

> 分工说明：线程三部曲在本篇收尾。360 是概念课（竞态、数据竞争是 UB、锁的思想），本篇是实操课：pthread 的创建、等待、分离、互斥锁、条件变量与完整的生产者消费者程序，外加 -pthread 编译纪律；[共享内存与信号量](/c/350-SharedMemorySemaphore) 负责更外面一圈——几个互不相干的**进程**之间怎么共享数据，那边用钥匙和内核信号量，本篇的线程们根本不需要。免锁计数与内存序的正解归 [原子操作与内存模型](/c/380-AtomicAndMemoryModel)。

## 学习目标

读完本文你将能够：

1. 用统一的 -pthread 选项完成 pthread 程序的编译与链接，说清这个开关在哪两头生效；
2. 亲手复现并修复四线程计数器实验，用 strerror 正确处理 pthread 系函数返回的错误码；
3. 为每个线程做出 join 或 detach 的取舍，说清忘 join 的资源后果与「返回栈地址」的经典坑；
4. 用互斥锁与条件变量写出有界队列版生产者-消费者完整程序，解释 wait 为什么必须配锁、条件为什么必须用 while 重查；
5. 认识 pthread_exit 与 pthread_cancel 的语义边界，能一眼认出线程池、读写锁这些深水区的常见形态。

预计 60 到 90 分钟，含 4 组动手实验、1 道预测题与 1 道挑战题。

## 1. 问题引入：复现一次，然后亲手修好

360 篇用两个线程让账目对不上；这次加码到四个，先把事故原样跑一遍：

```c
/* counter.c：四个线程，一个计数器（360 的实验加倍复现） */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <pthread.h>

int counter = 0;    /* 四个执行流共享，谁都能改 */

void *worker(void *arg) {
    (void)arg;
    for (int i = 0; i < 100000; i++) {
        counter++;    /* 无保护：360 已拆过为什么坏 */
    }
    return NULL;
}

int main(void) {
    pthread_t t[4];
    for (int i = 0; i < 4; i++) {
        int rc = pthread_create(&t[i], NULL, worker, NULL);
        if (rc != 0) {                       /* 错误处理写法第 3 节讲透，先照抄 */
            fprintf(stderr, "pthread_create: %s\n", strerror(rc));
            return 1;
        }
    }
    for (int i = 0; i < 4; i++) {
        pthread_join(t[i], NULL);            /* 等四个执行流都收工 */
    }
    printf("counter = %d\n", counter);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g -pthread counter.c -o counter
./counter
./counter
```

一次典型输出（每次运行都不同）：

```text
counter = 213478
counter = 302516
```

理论值 400000，实得连一半都碰不到。本篇的路线图就是把这一行修到**每次都恰好 400000**：编译开关（第 2 节）、创建的契约（第 3 节）、等待与分离（第 4 节）、互斥锁（第 5 节）、条件变量（第 6 节），最后组装成完整的生产者消费者（第 7 节）。

## 2. -pthread：一个开关，两头生效

先立编译纪律：pthread 程序的每一条编译与链接命令都带 -pthread。

```bash
gcc -Wall -Wextra -g -pthread counter.c -o counter
```

这个选项两头生效。预处理一端，GCC 文档的口径是「定义使用 POSIX 线程库所需的附加宏」——这些宏让头文件与库函数启用线程安全的行为；链接一端，它把线程库接进最终可执行文件。手册侧 pthreads(7) 同样明确：在 Linux 上，使用 pthreads API 的程序应当用 cc -pthread 编译，并且**编译与链接要一致地使用**。多文件的工程（见 [多文件编译](/c/310-MultiFileCompilation)）里，每个编译单元与最终的链接命令都要带上，漏一处就埋雷。

较新的 glibc（2.34，2021 年发布）把 libpthread 等几个库并入了 libc 本体，许多系统上不加 -pthread 也能链接通过。但老环境（以及 musl、旧发行版）会当场报错：

```text
/usr/bin/ld: /tmp/ccAbCdEf.o: in function `main':
counter.c:(.text+0x2b): undefined reference to `pthread_create'
collect2: error: ld returned 1 exit status
```

`undefined reference to 'pthread_create'`——链接器找不到符号，因为线程库没接上。就算你的环境链得过，宏那一头的差异依旧存在，可移植性也不为省两个字符买单。修改实验一：去掉 -pthread 编译一次，看你的环境报不报错；无论报不报，把选项加回去并养成习惯。

## 3. pthread_create：四参数与错误码契约

拆开签名，四个参数各有一个要说清的点：

```c
int pthread_create(pthread_t *thread, const pthread_attr_t *attr,
                   void *(*start_routine)(void *), void *arg);
```

| 参数 | 要点 |
| --- | --- |
| thread | 输出参数：新线程的 ID 写回这里；失败时内容未定义 |
| attr | 线程属性，传 NULL 即默认（栈大小、分离状态等，第 8 节一瞥） |
| start_routine | 线程入口，签名固定为「收 void*，还 void*」的函数 |
| arg | 传给入口函数的唯一参数，只有一个 void* 的额度 |

第一件要练成反射的事：**pthread 系函数成功返回 0，失败直接返回错误号——不设置 errno**。这与第 1 节代码里的判法呼应：`int rc = pthread_create(...); if (rc != 0) { fprintf(stderr, "... %s\n", strerror(rc)); }`。`strerror(rc)` 把错误号翻成人话（如 EAGAIN 对应「资源暂时不可用」，典型成因是线程数超了系统限额）。为什么不是 perror？perror 读的是全局 errno，而 pthread 函数压根不写它——这个陷阱第 9 节实录给你看，`pthread_create: Success` 会刷新你的认知。

第二件事是**传参的额度管理**。只有一个 void*，惯用两招：

```c
long id = (long)arg;            /* 传值：小整数（线程编号等）直接穿过去 */
Config *cfg = (Config *)arg;    /* 传址：共享的大对象，注意生命周期归谁管 */
```

传址有一个致命前提：**被指的对象必须活得比线程久**。把局部变量的地址传进去，主线程一转身循环继续跑、变量被反复改写，线程读到的就是「当时」的幻影——完整的偶现错值实录在第 9 节，修改实验二先把能跑的版本跑熟：把 worker 改成打印 `(long)arg`，main 里传 `(void *)i`，四个线程报出各自编号。

## 4. pthread_join 与 pthread_detach：收尾的两条路

线程启动之后，主线程与它只有两种正常关系：**等它**（join）或**放它走**（detach），不许存在第三种悬而未决的状态。

join 是「等 + 收尸 + 收遗物」一条龙：阻塞到目标线程终止，顺带通过 `pthread_join(t, &retval)` 取回它 return 的那个 void*。它还承担一件看不见的活——手册口径很直白：可 join 的线程终止后，**只有被 join 过，最后的资源（栈等）才归还系统**。忘了 join，每个死掉的线程都留着一整套尸检现场，长跑进程的内存只涨不跌，像极了 330 篇里没 wait 的僵尸进程——只不过僵尸躺着不动，这个会占着几百 KB 到几 MB 的栈。

detach 是「即发即弃」：线程终止后资源自动回收，代价是**你再也收不到它的返回值，也不能再对它 join**。

```c
pthread_t tid;
pthread_create(&tid, NULL, backup_task, NULL);
pthread_detach(tid);      /* 后台任务：不打算等，也不收返回值 */
```

用属性还能「出生即分离」（attr 设 PTHREAD_CREATE_DETACHED），省掉 create 与 detach 之间的窗口。选哪条路看用途：要结果、要确认跑完（比如并行计算的分块）就 join；纯后台（日志落盘、心跳上报）就 detach。想「创建即分离」又图省事不改 attr，也可以对刚创建的线程立刻 pthread_detach。

还有一个容易踩空的主线程特例：**main 一 return，整个进程终止，所有还在跑的线程被一并处决**——手册把「main 函数的 return 等价于 exit、终结所有线程」写得很明白。所以 detach 的后台线程能不能干完活，取决于主线程等多久；想让其余线程跑完再退出，主线程可以用 `pthread_exit(NULL)` 代替 return 先退自己。至于线程的「遗物」，两种安全写法：小整数按值穿 `(void *)(intptr_t)42`，join 方还原；大对象在线程里 malloc、join 方 free。**绝不要 return 一个指向线程自己栈的指针**——手册原文警告：线程终止后其栈的内容无定义，join 方拿到的是悬空指针，这个坑与 [内存深水区](/c/210-ProcessMemoryLayoutAndErrors) 的 use-after-free 同宗同源，只是尸体换成了栈帧。

修改实验三：第 1 节的程序里把第二个 pthread_join 删掉再跑。多数时候看不出异常——main 还是会等第一个、第二个线程……但最后一个没被 join 的线程，其资源就不会归还；如果再把 main 的结尾改成「打印后立刻 return」，还会看到打印缺斤少两：没 join 的线程可能还没跑完就被进程退出一锅端。

## 5. 互斥锁：四件套与临界区纪律

锁就是 360 篇「一次只过一个人的门」。pthread 给了两种上膛方式：

```c
pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;   /* 静态：全局变量、编译期就定好 */
pthread_mutex_t m2;
pthread_mutex_init(&m2, NULL);                   /* 动态：结构体成员、运行时才存在 */
/* ...用完 */
pthread_mutex_destroy(&m2);                      /* 动态初始化的才需要销毁 */
```

全局锁用静态初始化器一行搞定；锁住在结构体里（比如队列）就得 init/destroy 成对。现在兑现第 1 节的承诺——给 counter.c 上锁，只改两处：

```c
pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;    /* 新增：一把全局锁 */

void *worker(void *arg) {
    (void)arg;
    for (int i = 0; i < 100000; i++) {
        pthread_mutex_lock(&lock);
        counter++;                     /* 临界区：一次只放一个线程进来 */
        pthread_mutex_unlock(&lock);
    }
    return NULL;
}
```

```text
counter = 400000
counter = 400000
```

每次都是 400000，账目封案。除了 lock/unlock 还有两位配角：`pthread_mutex_trylock` 拿不到就立刻返回忙（EBUSY）而不是睡——360 死锁对策里的「退避」靠它；属性里选 `PTHREAD_MUTEX_RECURSIVE` 可以让同一线程重复加锁不卡死（递归函数里实用，能用「拆函数」替代就别用）。锁的纪律在 360 立过规矩，这里补上 pthread 语境的最后一条：**忘 unlock 不会崩、不会报错，只会让后续所有 lock 永久阻塞**——程序看起来「卡住了」，排查时先想「谁拿了锁没还」，TSan 与代码评审是仅有的两道防线。

## 6. 条件变量：把忙等换成睡觉等叫醒

互斥锁解决「谁先进」，解决不了「条件没到怎么办」。轮询版是 `while (count == 0) { }`——烧着 CPU 空转，而且别忘了它多半还得反复抢锁。条件变量（condition variable）给出正解：**睡在条件上，被叫醒再查**。等待方与通知方的标准姿势：

```c
/* 等待方：必须持锁进入，必须用 while */
pthread_mutex_lock(&m);
while (!ready) {
    pthread_cond_wait(&cv, &m);   /* 原子地「放开 m + 睡着」；醒来前重新拿好 m */
}
/* 走到这里：ready 为真，且锁在手里 */
pthread_mutex_unlock(&m);

/* 通知方：先改条件再叫人，全程持锁 */
pthread_mutex_lock(&m);
ready = 1;
pthread_cond_signal(&cv);         /* 叫醒一个等待者；pthread_cond_broadcast 叫醒全部 */
pthread_mutex_unlock(&m);
```

两个「必须」是条件变量的全部难点。**必须配互斥锁**：pthread_cond_wait 的契约是「调用时持有锁」，它原子地做两件事——放开锁并入睡（若两步分开，「条件恰好在这时变了」的窗口就会漏掉唤醒）；被唤醒后、返回前，它重新把锁拿好再交还给你。**必须用 while 重查**：唤醒不代表条件成立——手册明说虚假唤醒（spurious wakeup，没被 signal 也可能醒）允许发生；就算真的被 signal 了，从醒到抢到锁的间隙里，条件也可能被别的线程消耗掉。所以醒来第一件事是再查一遍，不成立接着睡。写 if 是条件变量第一大坑，实测很难触发、一旦触发就是偶现卡死，纪律要长在手上。

通知侧的两句话：signal 叫一个（有多个同类等待者、每次事件只养活一个时用），broadcast 叫全部（条件是「池子空了/批次到了」这类集体事件时用）；先改条件、后发通知，且两者都在锁内，是最不容易出错的顺序。限时等待的变体 pthread_cond_timedwait 最后一个参数是**绝对时间点**（当前时刻加超时量，clock_gettime 取现值），不是相对时长——照抄相对秒数会等到地老天荒。

## 7. 完整示例：有界队列上的生产者消费者

把第 5、6 节的零件组装成 360 篇预告的完整程序：环形有界队列做缓冲，一把锁护住队列，两个条件变量分别管「没满」「不空」。

```c
/* prod_cons.c：互斥锁 + 两个条件变量的生产者消费者 */
#include <stdio.h>
#include <pthread.h>
#include <unistd.h>

#define CAP 4                     /* 队列容量 */

int queue[CAP];
int head = 0, tail = 0, count = 0;

pthread_mutex_t lock      = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t  not_full  = PTHREAD_COND_INITIALIZER;
pthread_cond_t  not_empty = PTHREAD_COND_INITIALIZER;

void *producer(void *arg) {
    long id = (long)arg;
    for (int i = 1; i <= 8; i++) {
        pthread_mutex_lock(&lock);
        while (count == CAP) {            /* 满了：放下货盘，睡在 not_full 上 */
            pthread_cond_wait(&not_full, &lock);
        }
        queue[tail] = i;
        tail = (tail + 1) % CAP;
        count++;
        printf("生产者%ld 放入 %d（余 %d）\n", id, i, count);
        pthread_cond_signal(&not_empty);  /* 叫醒一个等货的 */
        pthread_mutex_unlock(&lock);
        usleep(100000);                   /* 生产一件耗时 0.1 秒 */
    }
    return NULL;
}

void *consumer(void *arg) {
    long id = (long)arg;
    for (int i = 1; i <= 8; i++) {
        pthread_mutex_lock(&lock);
        while (count == 0) {              /* 空了：睡在 not_empty 上 */
            pthread_cond_wait(&not_empty, &lock);
        }
        int item = queue[head];
        head = (head + 1) % CAP;
        count--;
        printf("消费者%ld 取走 %d（余 %d）\n", id, item, count);
        pthread_cond_signal(&not_full);   /* 叫醒一个等空位的 */
        pthread_mutex_unlock(&lock);
        usleep(150000);                   /* 消费一件耗时 0.15 秒 */
    }
    return NULL;
}

int main(void) {
    pthread_t p, c;
    pthread_create(&p, NULL, producer, (void *)1L);
    pthread_create(&c, NULL, consumer, (void *)1L);
    pthread_join(p, NULL);
    pthread_join(c, NULL);
    pthread_mutex_destroy(&lock);
    pthread_cond_destroy(&not_full);
    pthread_cond_destroy(&not_empty);
    return 0;
}
```

```bash
gcc -Wall -Wextra -g -pthread prod_cons.c -o prod_cons
./prod_cons
```

一次典型输出（节奏与余量每次略不同）：

```text
生产者1 放入 1（余 1）
生产者1 放入 2（余 2）
生产者1 放入 3（余 3）
生产者1 放入 4（余 4）
消费者1 取走 1（余 3）
生产者1 放入 5（余 4）
消费者1 取走 2（余 3）
...
消费者1 取走 8（余 0）
```

消费比生产慢（0.15 秒对 0.1 秒），所以队列很快顶到容量 4，生产者从此「放一件、被叫醒、再放一件」地跟着消费者的节奏走——这正是第 6 节两个「必须」在真实调度下的样子：生产者睡在 not_full 上等消费者叫，while 保证它醒来时容量真的降了。程序结束前两个线程的 for 上限相同，队列最终归零，无泄漏无死等。

修改实验四：再开一个消费者（两个线程各消费 4 件），观察「余」字段的跳动与偶发的顺序颠倒；把两处 while 改成 if 再多跑几次，小概率出现某个消费者永久睡眠——这就是虚假唤醒与「醒来条件已被抢走」的联合现场，改回 while 恢复正常。最后用 360 篇的 TSan 命令（-fsanitize=thread）编译跑一遍，报告安静才算验收。

## 8. 结束方式、取消与深水一瞥

线程的三种正常终局：从入口函数 return（等价于隐式调用 pthread_exit，返回值交给 join 方）；显式 pthread_exit（可以在入口函数深处提前退出）；被别的线程 pthread_cancel 取消。取消是最需要敬畏的一个：默认是**延迟取消**——线程跑到取消点（如 sleep、read 这类可能阻塞的库调用）才响应；用 pthread_cleanup_push 注册的清理函数会在取消时执行，用来还锁、free 内存。但它与「取消瞬间手里正拿着哪些锁」纠缠不清，库代码几乎无法安全穿越任意取消点，**不少项目干脆禁用 pthread_cancel，改用协作式的退出标志加条件变量**（worker 每轮循环检查标志）。初学阶段：知道它存在，用退出标志干活。

几个常见形态各认一眼，深水不展开：线程属性（pthread_attr_t）能调栈大小、设定出生即分离；读写锁（pthread_rwlock_rdlock/wrlock）让多个读者并行、写者独占，读多写少时替代互斥锁；屏障（pthread_barrier_wait）是「全队到齐再开饭」的集合点；pthread_once 保证一段初始化整个进程只执行一次；线程局部数据用 `__thread` 关键字或 pthread_key_t（析构时机在 360 讲线程模型时提过，私有的才线程安全）；线程池 = 一组固定 worker 线程循环地从任务队列取活干，队列就是第 7 节的有界队列，再加一个「收工」标志让 worker 醒来后发现没活就退出。另外补一句分工：线程之间还能用 POSIX 无名信号量（sem_init/sem_wait/sem_post），进程之间的命名信号量与共享内存在 [共享内存与信号量](/c/350-SharedMemorySemaphore)，C 标准本身至今没有信号量。线程里处理信号是另一个雷区（异步信号投给哪个线程不确定），纪律见 [信号处理](/c/340-SignalHandling)。

## 常见错误与调试实录

实录一：线程创建失败，报错却打印 Success。

```c
if (pthread_create(&tid, NULL, worker, NULL) == -1) {  /* 错一：成功是 0，不是 -1 */
    perror("pthread_create");                          /* 错二：errno 根本没被设置 */
}
```

把每线程的栈需求调大、线程开到系统限额之外，运行得到：

```text
pthread_create: Success
```

明明失败了，报错却说一切正常。两处错叠加的结果：pthread 系函数失败**返回错误号**（不是 -1）且**不写 errno**，perror 读到的是别人留下的旧值。正确姿势第 3 节已立：`int rc = pthread_create(...); if (rc != 0) fprintf(stderr, "pthread_create: %s\n", strerror(rc));`——strerror 把错误号翻成人话。这套契约适用于 pthread 家族绝大多数函数。

实录二：向线程传栈上变量的地址，打印出幻影值。

```c
for (int i = 0; i < 4; i++) {
    pthread_create(&t[i], NULL, worker, &i);   /* 四个线程共享同一个 i */
}
```

worker 里 `int *p = (int *)arg; printf("got %d\n", *p);`，期望 0 到 3 各一份，实际常见连排四个 4，或重复的 3——pthread_create 返回只代表「线程已登记」，它什么时候真正开始跑无人担保；主线程的循环一骑绝尘，i 早已变成 4，新线程才慢悠悠地来读它。更糟的是主线程的写与线程的读撞在一起还是一次数据竞争（360 的 TSan 有时会当场点破）。修法两选一：按值传 `(void *)(intptr_t)i`，worker 里 `(intptr_t)j = (intptr_t)arg` 还原；或给每个线程 malloc 一份专属参数，约定 join 方释放。原则一句话：**传给线程的指针，生命周期必须覆盖线程的一生**。

## 实际项目中的使用场景

- 服务器每连接一线程（或线程池）：accept 出新连接就 pthread_create 一个处理线程，[套接字网络编程](/c/390-SocketNetworkProgramming) 的服务端骨架就是它；
- 后台任务线程：日志批量落盘、指标定时上报，detach 掉不用管收尸，退出时用标志位通知收尾；
- 并行计算的分块汇总：N 个线程各算一段、join 收结果，锁只保护最后的合计；
- 任务队列与线程池：第 7 节的生产者消费者加一层「任务即函数指针加参数」，就是多数服务框架的内核形态。

## 小练习

预测题（5 分钟）：第 1 节的程序里删掉全部四个 pthread_join，main 打印后立即 return。程序的输出有保证吗？没被 join 的线程留下了什么？

参考答案（先写再看）：没有任何保证——main 一 return 整个进程终止，四个线程随时可能被一锅端，counter 打出来可能是任何值（甚至循环还没跑完）；每个未被 join 的线程终止后资源不归还，在长跑进程里就是持续泄漏。规则重申：join 或 detach，二选一，不留悬案。

修改题（15 分钟）：给 prod_cons 增加第二个消费者。验收：8 件货恰好被消费 8 次、两个消费者合计取完、程序正常退出；跑几遍观察分配极不均匀的情况（一个消费者可能抢走几乎全部），想想这算 bug 吗——提示：消费者处理速度不同时，「能者多劳」通常是特性。

挑战题（半小时到一小时，不看答案先动手）：把 prod_cons 改造成线程池雏形：4 个 worker 线程常驻，主线程投入 20 个「任务」（打印自己的编号即可），全部完成后线程池收工。

提示（思路方向）：worker 的循环从「消费 8 件」改成「一直取任务，直到看到收工标志」；收工标志与队列同受一把锁保护，置位后要 broadcast 把所有睡着的 worker 叫醒。

展开（关键 API）：队列里存 `void (*func)(int)` 与参数的小结构体；worker 醒来先查标志再查队列；主线程置标志后 pthread_cond_broadcast，再逐个 join 四个 worker。

验收清单：20 条任务输出各出现一次且仅一次；程序退出、无死等；TSan 编译运行无报告。

## 与之前和之后的知识的关系

- 往前：竞态、临界区与同步思想全部出自 [线程与并发](/c/360-ThreadConcurrency)，本文是它的实操回声；线程入口的本质是「函数当参数传」，语法根基在 [函数详解](/c/090-FunctionDetailed) 与 [函数指针与回调](/c/170-FunctionPointerCallback)；「返回栈指针」的坑与 [内存深水区](/c/210-ProcessMemoryLayoutAndErrors) 的悬空指针同源；
- 旁支：跨进程共享换一套兵器，见 [共享内存与信号量](/c/350-SharedMemorySemaphore)；线程里等信号、处理信号的特殊纪律在 [信号处理](/c/340-SignalHandling)；忘 join 与僵尸进程的对照在 [进程与管道](/c/330-ProcessAndPipe)；
- 往后：无锁计数、内存序与伪共享的严格正解在 [原子操作与内存模型](/c/380-AtomicAndMemoryModel)——下一篇回答「counter++ 到底能不能不加锁」。

## 官方文档

- pthread_create 手册页（错误码契约、joinable 与资源回收、线程终止模式）：https://man7.org/linux/man-pages/man3/pthread_create.3.html
- pthread_join 手册页（收返回值与失败语义）：https://man7.org/linux/man-pages/man3/pthread_join.3.html
- pthread_cond_wait 手册页（持锁契约、虚假唤醒与 while 示例）：https://man7.org/linux/man-pages/man3/pthread_cond_wait.3.html
- pthread_exit 手册页（返回值不得指向线程栈、主线程退场方式）：https://man7.org/linux/man-pages/man3/pthread_exit.3.html
- pthreads 总览（线程共享模型、ID 复用、-pthread 编译口径）：https://man7.org/linux/man-pages/man7/pthreads.7.html
- GCC -pthread 选项（预处理与链接两头生效的官方口径）：https://gcc.gnu.org/onlinedocs/gcc/Preprocessor-Options.html
- glibc 2.34 发布说明（libpthread 并入 libc 的来龙去脉）：https://sourceware.org/glibc/wiki/Release/2.34

## 自我检查

- 能默写 pthread_create 的四参数表，并用 strerror 写出正确的错误处理；
- 能向同事讲清 join 与 detach 的取舍、忘 join 的资源后果、main return 对所有线程意味着什么；
- 能徒手写出「等待方 while 加 wait、通知方先改条件再 signal」的条件变量骨架，并解释两个「必须」；
- 拿到一份生产者消费者代码，能逐行指出锁、两个条件变量各自的等待方与通知方，并用 TSan 验收。

## 本章总结

pthread 的每一步都有契约：-pthread 两头生效且全工程统一；pthread_create 成功返回 0、失败返回错误号而不碰 errno，传参只有一个 void* 且对象必须活得比线程久；join 等待并回收，detach 放手，main 一 return 全体终结，二选一不许悬案；互斥锁静态初始化最省事，忘 unlock 不报错只卡死；条件变量必须持锁等待、必须 while 重查，signal 叫一个 broadcast 叫全部。四线程计数器从 213478 修到 400000，有界队列把锁与两个条件变量组装成完整的生产者消费者——这套骨架再加任务队列就是线程池。counter++ 想彻底免锁，是下一篇原子操作与内存模型的正题。

## 下一步

进入 [原子操作与内存模型](/c/380-AtomicAndMemoryModel)：锁能护住 counter++，但每次都抢门太贵——硬件保证不可分割的原子操作、内存序与伪共享，把并发的最后一层地基打穿。
