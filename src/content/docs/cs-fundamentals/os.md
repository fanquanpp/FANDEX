---
order: 30
tags:
  - 'cs-fundamentals'
  - 'oop'
  - 'design-patterns'
  - 'networking'
  - 'memory'
  - 'concurrency'
  - 'data-structure'
difficulty: 'intermediate'
title: '操作系统'
module: 'cs-fundamentals'
category: 'Computer Science / Operating System'
description: '操作系统核心原理：进程管理、内存管理、文件系统、I/O系统、并发与同步。'
author: 'fanquanpp'
---

## 目录

- [1. 操作系统概述](#1-操作系统概述)
- [2. 进程与线程](#2-进程与线程)
- [3. 进程调度](#3-进程调度)
- [4. 同步与互斥](#4-同步与互斥)
- [5. 内存管理](#5-内存管理)
- [6. 文件系统](#6-文件系统)
- [7. I/O系统](#7-io系统)
- [8. 速查表](#8-速查表)
- [延伸阅读](#延伸阅读)

---

## 1. 操作系统概述

### 1.1 操作系统的定义与角色

操作系统是硬件与应用之间的**中间层**，提供三个核心抽象：

| 抽象     | 对应硬件资源    | 接口                  |
| -------- | --------------- | --------------------- |
| 进程     | CPU + 寄存器    | fork/exec/wait        |
| 虚拟内存 | 物理内存 + 磁盘 | mmap/brk/malloc       |
| 文件     | 磁盘/设备       | open/read/write/close |

```
操作系统在抽象层级中的位置 (参见 [概述](overview) 3.1节):

Layer 6: Application
         |  API
Layer 5: Language Runtime
         |  ABI / System Call
Layer 4: Operating System  <-- 本章节
         |  ISA / Driver Interface
Layer 3: Hardware

操作系统的双重角色:
  1. 面向上层: 提供简洁的抽象接口 (What)
  2. 面向下层: 管理复杂的硬件资源 (How)
```

### 1.2 内核架构

```
内核架构分类:

1. 宏内核 (Monolithic Kernel) [Linux]:
   所有服务运行在内核态
   +----------------------------------+
   |          User Space              |
   +----------------------------------+
   |  Syscall Interface               |
   +----------------------------------+
   |  VFS | TCP/IP | Scheduler | ...  |  <-- 全部在内核态
   +----------------------------------+
   |  Hardware                        |
   +----------------------------------+
   优点: 性能高(无进程切换开销)
   缺点: 代码耦合，一个Bug可崩溃整个系统

2. 微内核 (Microkernel) [seL4, MINIX]:
   仅最基本服务在内核态
   +----------------------------------+
   |  FS Server | Net Server | ...    |  <-- 用户态服务进程
   +----------------------------------+
   |  IPC Interface                   |
   +----------------------------------+
   |  Schedule | VM | IPC            |  <-- 最小内核
   +----------------------------------+
   |  Hardware                        |
   +----------------------------------+
   优点: 安全、可靠、可扩展
   缺点: IPC开销大

3. 混合内核 (Hybrid) [Windows NT, macOS]:
   关键服务在内核态，其余在用户态
```

### 1.3 系统调用机制

```
系统调用流程 (用户态 -> 内核态 -> 用户态):

User Space                          Kernel Space
+-----------+                       +-----------+
| Application|                      |           |
|   call    |                      |           |
|  syscall  |  1. 保存用户上下文     |           |
|  instruction ----+              |           |
|           |      |  2. 切换到内核栈 |           |
|           |      +-------------->|  syscall  |
|           |                      |  handler  |
|           |                      |  (检查参数)|
|           |                      |  (执行操作)|
|           |  4. 恢复用户上下文     |           |
|           |<--------------------+|  返回结果  |
|  继续执行   |  3. 切换回用户栈     |           |
+-----------+                       +-----------+

系统调用开销:
  x86-64 (syscall): ~200-1000 cycles
  ARM (SVC):        ~100-500 cycles
  主要开销: 上下文保存/恢复 + TLB冲刷 + 分支预测失效
```

> 跨模块引用：[体系结构](architecture)的特权级（Ring 0/3, EL0/EL1）是系统调用机制的基础。[C语言](c/overview)的标准库(glibc)封装了系统调用接口。

---

## 2. 进程与线程

### 2.1 进程的状态机模型

进程是操作系统对运行程序的抽象，其生命周期可用状态机描述：

```
进程状态机 (五状态模型):

                    admitted
                       |
                       v
                 +----------+
          ------>|  Created  |
         |       +----------+
         |            | fork/exec
         |            v
         |       +----------+  scheduler  +---------+
         |       |   Ready  |----------->| Running |
         |       +----------+            +---------+
         |            ^                      |  |
         |            |     preempt/         |  |
         |            +------yield-----------+  |
         |                                       |
         |            +----------+               |
         |            | Blocked  |<--IO/wait-----+
         |            +----------+               |
         |                  |                    |
         |            IO完成/wakeup              |
         |                  v                    |
         |            +----------+               |
         +----------- |  Ready   |               |
                      +----------+               |
                                                    exit
                                                      |
                                                      v
                                                +----------+
                                                | Terminated|
                                                +----------+

状态转移条件:
  Created -> Ready:    进程被接纳
  Ready -> Running:    调度器选择
  Running -> Ready:    时间片用完 / 被抢占
  Running -> Blocked:  等待I/O / 等待锁 / sleep
  Blocked -> Ready:    I/O完成 / 锁释放 / wakeup
  Running -> Terminated: exit / 被杀死
```

### 2.2 进程控制块 (PCB)

```
进程控制块 (task_struct in Linux) 关键字段:

struct task_struct {
    pid_t               pid;          // 进程ID
    volatile long        state;        // 进程状态
    int                  prio;         // 优先级
    struct mm_struct    *mm;           // 内存管理信息
    struct files_struct *files;        // 打开文件表
    struct signal_struct*signal;       // 信号处理
    struct thread_info   thread_info;  // 底层线程信息
    struct sched_entity  se;           // 调度实体
    struct list_head     tasks;        // 进程链表
    void                *stack;        // 内核栈
    // ... 数百个字段
};
```

### 2.3 进程创建: fork()

```
fork() 执行流程:

  Parent Process                    Child Process
  +-----------+                     +-----------+
  | pid = 100 |                     | pid = 101 |
  | ppid = 1  |                     | ppid = 100|
  |           |                     |           |
  | fork()    |                     |           |
  |  - 分配PCB|                     |           |
  |  - 复制页表(COW)|               |           |
  |  - 复制fd表|                    |           |
  |  - 设置ppid|                    |           |
  |  - 加入调度队列|                 |           |
  |  return 101 (child_pid)         | return 0  |
  +-----------+                     +-----------+

COW (Copy-On-Write) 优化:
  fork()时不复制物理页，只复制页表
  父子进程共享所有物理页(标记为只读)
  任一方写入时触发Page Fault -> 才复制该页
```

**fork伪代码**：

```c
pid_t fork(void) {
    struct task_struct *child = alloc_task_struct();
    copy_process(current, child);       // 复制PCB
    dup_mm(child, current->mm);         // 复制页表(COW)
    dup_fd(child, current->files);      // 复制文件描述符表
    wake_up_process(child);             // 加入调度队列
    if (current == child) return 0;     // 子进程返回0
    else return child->pid;             // 父进程返回子PID
}
```

### 2.4 线程模型

```
线程 vs 进程:

  进程 = 资源分配单位 (独立地址空间)
  线程 = 调度执行单位 (共享地址空间)

  +----------------------------------+
  |  Process                         |
  |  +------+ +------+ +------+     |
  |  |Thread| |Thread| |Thread|     |
  |  |  栈  | |  栈  | |  栈  |     |
  |  +------+ +------+ +------+     |
  |  共享: 代码段 | 数据段 | 堆 | fd表 |
  +----------------------------------+

线程实现模型:

1. 1:1模型 (Linux pthreads):
   每个用户线程对应一个内核线程
   优点: 真正并行，一个线程阻塞不影响其他
   缺点: 创建开销大

2. N:1模型 (Green Threads):
   多个用户线程映射到一个内核线程
   优点: 创建快
   缺点: 无法利用多核，一个阻塞全部阻塞

3. M:N模型 (Go goroutines, Erlang):
   M个用户线程映射到N个内核线程
   优点: 兼顾两者优势
   缺点: 调度器复杂
```

> 跨模块引用：[Java](java/overview)的Thread类在Linux上使用1:1模型(pthread)。[C++](cpp/overview)的std::thread同样映射到OS线程。Go的goroutine使用M:N模型。

---

## 3. 进程调度

### 3.1 调度算法

```
调度算法对比:

1. FCFS (先来先服务):
   队列: P1(24) -> P2(3) -> P3(3)
   等待时间: P1=0, P2=24, P3=27
   平均等待: (0+24+27)/3 = 17
   缺点: 护航效应 (短作业等长作业)

2. SJF (最短作业优先):
   队列: P2(3) -> P3(3) -> P1(24)
   等待时间: P2=0, P3=3, P1=6
   平均等待: (0+3+6)/3 = 3
   缺点: 长作业饥饿，需预知执行时间

3. RR (时间片轮转):
   时间片 q=4
   P1(24): run 4 -> run 4 -> run 4 -> ... -> run 4
   P2(3):  run 3 -> done
   P3(3):  run 3 -> done
   优点: 公平，响应快
   缺点: 时间片大小影响性能

4. 优先级调度:
   每个进程有优先级，高优先级先执行
   可配合: 老化(aging)防止饥饿
```

### 3.2 Linux CFS调度器

```
CFS (Completely Fair Scheduler) 核心思想:

  目标: 公平分配CPU时间给所有可运行进程

  虚拟运行时间 (vruntime):
    vruntime += 实际运行时间 * (NICE_0_LOAD / 进程权重)

    权重越高(优先级越高) -> vruntime增长越慢
    -> 被调度的机会越多

  红黑树:
    所有可运行进程按vruntime排序
    左下角 = vruntime最小 = 下一个被调度

  调度决策:
    1. 选择红黑树最左节点
    2. 运行直到vruntime不再是最小
    3. 重新插入红黑树

  时间片计算:
    time_slice = (调度周期 * 进程权重) / 总权重
```

**CFS伪代码**：

```python
def cfs_schedule(rq):
    leftmost = rq.rbtree.leftmost()
    next_task = leftmost.task
    current_task = rq.current

    if current_task.state == RUNNING:
        update_vruntime(current_task)
        rbtree_insert(rq.rbtree, current_task)

    rq.current = next_task
    rbtree_remove(rq.rbtree, next_task)
    context_switch(current_task, next_task)
```

### 3.3 上下文切换

```
上下文切换流程:

  Process A (Running)              Process B (Ready)
  +-----------+                    +-----------+
  | 用户态上下文 |                    | 用户态上下文 |
  |  寄存器    |                    |  寄存器    |
  |  栈指针    |                    |  栈指针    |
  |  PC       |                    |  PC       |
  +-----------+                    +-----------+
       |                                ^
       | 1. 保存A的上下文到A的内核栈       |
       | 2. 切换内核栈(A -> B)           |
       | 3. 从B的内核栈恢复B的上下文       |
       +--------------------------------+

  上下文切换开销:
    直接开销: 寄存器保存/恢复 ~100-1000 cycles
    间接开销: TLB冲刷、缓存失效 ~1000-10000 cycles
    总计: ~1-10 us
```

---

## 4. 同步与互斥

### 4.1 临界区问题

```
临界区问题的三个条件:

1. 互斥 (Mutual Exclusion):  同一时刻只有一个进程进入临界区
2. 前进 (Progress):          临界区空闲时，等待进程应能进入
3. 有限等待 (Bounded Wait):  进程等待进入临界区的时间有限

Peterson算法 (两进程互斥的软件方案):

  // 进程 Pi (i=0, j=1-i)
  flag[i] = true;
  turn = j;
  while (flag[j] && turn == j) { /* wait */ }
  // --- 临界区 ---
  flag[i] = false;
  // --- 剩余区 ---
```

### 4.2 硬件同步原语

```
Test-And-Set (TAS):

  boolean TestAndSet(boolean *target) {
    boolean rv = *target;
    *target = true;
    return rv;
  }

  // 使用TAS实现互斥锁
  while (TestAndSet(&lock)) { /* spin */ }
  // --- 临界区 ---
  lock = false;

Compare-And-Swap (CAS):

  boolean CAS(int *addr, int expected, int new_val) {
    if (*addr == expected) {
      *addr = new_val;
      return true;
    }
    return false;
  }

  // 使用CAS实现无锁计数器
  do {
    old = counter;
    new = old + 1;
  } while (!CAS(&counter, old, new));
```

### 4.3 信号量

```
信号量定义 (Dijkstra, 1965):

  semaphore S = integer value;

  P(S) / wait(S) / down(S):     // Proberen (尝试)
    while (S <= 0) { block(); }
    S--;

  V(S) / signal(S) / up(S):     // Verhogen (增加)
    S++;
    wakeup_one_waiter();

信号量的两种用途:
  1. 互斥: 初值 = 1 (二元信号量 = 互斥锁)
  2. 同步: 初值 = 0 (事件通知)

生产者-消费者问题:

  semaphore mutex = 1;    // 互斥访问缓冲区
  semaphore empty = N;    // 空槽位数
  semaphore full  = 0;    // 已占槽位数

  Producer:                      Consumer:
    produce(item);                 P(full);
    P(empty);                      P(mutex);
    P(mutex);                      item = remove();
    insert(item);                  V(mutex);
    V(mutex);                      V(empty);
    V(full);                       consume(item);
```

### 4.4 经典同步问题

**读者-写者问题**：

```
读者优先:

  semaphore rw_mutex = 1;   // 读写互斥
  semaphore mutex = 1;      // 保护read_count
  int read_count = 0;

  Reader:                        Writer:
    P(mutex);                      P(rw_mutex);
    read_count++;                  // 写操作
    if (read_count == 1)           V(rw_mutex);
      P(rw_mutex);
    V(mutex);
    // 读操作
    P(mutex);
    read_count--;
    if (read_count == 0)
      V(rw_mutex);
    V(mutex);

问题: 写者可能饥饿
解决: 写者优先变体 (增加写者等待计数)
```

**哲学家就餐问题**：

```
5个哲学家，5根筷子，左右各一根

死锁方案 (每人先拿左筷子):
  Philosopher i:
    P(chopstick[i]);         // 拿左筷子
    P(chopstick[(i+1)%5]);   // 拿右筷子
    eat();
    V(chopstick[i]);
    V(chopstick[(i+1)%5]);

防死锁方案:
  1. 最多4人同时拿筷子
  2. 奇数先拿左、偶数先拿右 (破坏循环等待)
  3. 仅当两根筷子都可用时才拿 (AND信号量)
```

### 4.5 死锁

```
死锁四个必要条件:

1. 互斥: 资源不能共享
2. 占有并等待: 持有资源同时等待其他资源
3. 不可抢占: 已获得的资源不能被强制剥夺
4. 循环等待: 存在进程的循环等待链

破坏条件 -> 预防:
  破坏2: 一次性申请所有资源
  破坏3: 允许抢占
  破坏4: 资源有序分配

死锁检测 (资源分配图):

  进程 P1 --请求--> 资源 R1 <--占有-- 进程 P2
  进程 P2 --请求--> 资源 R2 <--占有-- 进程 P1

  图中存在环 -> 死锁

银行家算法 (避免死锁):

  Available[1..m]:  每类资源可用数
  Max[1..n][1..m]:  每个进程最大需求
  Allocation[1..n][1..m]: 每个进程已分配
  Need[i][j] = Max[i][j] - Allocation[i][j]

  安全性检查:
    1. 找到 Need[i] <= Work 的进程
    2. 假设它完成，释放资源: Work += Allocation[i]
    3. 重复直到所有进程完成(安全) 或无法继续(不安全)
```

> 跨模块引用：[Java](java/overview)的synchronized和ReentrantLock是信号量/互斥锁的语言级封装。[C++](cpp/overview)的std::mutex和std::condition_variable对应OS的互斥锁和条件变量。[设计模式](design-patterns)中的Singleton模式需要考虑多线程同步。

---

## 5. 内存管理

### 5.1 内存管理演进

```
内存管理方案演进:

1. 单一连续分配: 一次只运行一个程序
2. 固定分区:      内存划分为固定大小分区
3. 动态分区:      按需分配，产生外部碎片
4. 分页:          固定大小页帧，消除外部碎片
5. 分段:          按逻辑单位划分，消除内部碎片
6. 段页式:        结合分段和分页的优点
7. 虚拟内存:      按需调页，突破物理内存限制
```

### 5.2 分页机制

```
分页地址翻译 (参见 [体系结构](architecture) 4.5节):

  虚拟地址 = [页号 VPN | 偏移 Offset]
  物理地址 = [帧号 PPN | 偏移 Offset]

  页表项 (PTE):
  |--- Frame Number ---| V | R | W | X | D | A |
                        |   |   |   |   |   |
                        |   |   |   |   |   +-- Accessed
                        |   |   |   |   +------ Dirty
                        |   |   |   +---------- Execute
                        |   |   +-------------- Write
                        |   +------------------ Read
                        +---------------------- Valid

页大小选择:
  小页(4KB):  内部碎片少，页表大
  大页(2MB):  页表小，TLB覆盖更多内存
  巨页(1GB):  数据库/虚拟化场景
```

### 5.3 页面置换算法

```
页面置换算法对比:

1. OPT (最优):  置换最远将来才使用的页
   缺页率最低，但无法实现(需预知未来)
   作为理论下界

2. FIFO:  置换最早进入内存的页
   简单，但可能置换频繁使用的页
   Belady异常: 更多帧反而更多缺页

3. LRU (最近最少使用):  置换最久未访问的页
   近似OPT，但精确实现代价高(需记录访问时间戳)

4. Clock (时钟算法):  LRU的近似
   使用引用位 + 循环链表

   Clock算法:
     +---+---+---+---+---+
     | 1 | 0 | 1 | 0 | 1 |  引用位
     +---+---+---+---+---+
          ^
          |  时钟指针

     置换时:
       指针扫描，遇到ref=1则清零并前进
       遇到ref=0则置换该页

5. LFU (最不经常使用):  置换访问次数最少的页
   问题: 早期频繁访问但后来不用的页不会被置换
```

**Clock算法伪代码**：

```python
def clock_replace(frames, clock_hand):
    while True:
        frame = frames[clock_hand]
        if frame.reference_bit == 0:
            victim = clock_hand
            clock_hand = (clock_hand + 1) % len(frames)
            return victim
        else:
            frame.reference_bit = 0
            clock_hand = (clock_hand + 1) % len(frames)
```

### 5.4 虚拟内存与按需调页

```
按需调页流程:

  1. 进程访问虚拟地址
  2. MMU查找页表
  3. PTE Valid = 0 -> Page Fault
  4. 陷入内核态
  5. 检查地址合法性 (是否在进程地址空间内)
  6. 若合法:
     a. 选择一个空闲帧 (或置换一个已占帧)
     b. 从磁盘读取页面到该帧
     c. 更新页表 (PTE Valid = 1, Frame Number)
     d. 刷新TLB
     e. 重新执行触发缺页的指令
  7. 若非法:
     发送SIGSEGV (段错误)

写时复制 (COW):
  fork()后父子共享页面(标记只读)
  任一方写入 -> Page Fault
  内核检测到COW标志 -> 复制该页
  修改页表为可写
  重新执行写入指令
```

### 5.5 进程地址空间布局

```
Linux进程地址空间 (x86-64):

  高地址
  +---------------------------+ 0xFFFFFFFFFFFFFFFF (内核空间)
  |  Kernel Space             |  (所有进程共享)
  +---------------------------+ 0x7FFFFFFFFFFF
  |  Stack (向下增长)          |
  |  v                        |
  |                           |
  |  Memory Mapping Region    |  mmap区域 (共享库等)
  |                           |
  |  ^                        |
  |  Heap (向上增长)           |
  +---------------------------+
  |  BSS (未初始化全局变量)     |
  +---------------------------+
  |  Data (已初始化全局变量)    |
  +---------------------------+
  |  Text (代码段)             |
  +---------------------------+ 0x400000 (典型)
  低地址
```

> 跨模块引用：[体系结构](architecture)的TLB和页表是虚拟内存的硬件基础。[C语言](c/overview)的malloc/free操作堆区，栈区由编译器自动管理。[编译原理](compiler)的代码生成决定了Text/Data/BSS段的布局。

---

## 6. 文件系统

### 6.1 文件系统层次

```
文件系统层次结构:

+----------------------------------+
|  Application                     |
+----------------------------------+
|  VFS (Virtual File System)       |  <-- 统一接口层
+----------------------------------+
|  Ext4 | XFS | Btrfs | FAT32 |...|  <-- 具体文件系统
+----------------------------------+
|  Block Device Layer              |  <-- 块设备抽象
+----------------------------------+
|  Device Driver                   |  <-- 硬件驱动
+----------------------------------+
|  HDD / SSD                       |
+----------------------------------+

VFS四大对象:
  superblock: 文件系统元信息
  inode:      文件元数据(权限/大小/数据块指针)
  dentry:     目录项(文件名 -> inode映射)
  file:       打开文件的实例(偏移量/模式)
```

### 6.2 Ext4文件系统

```
Ext4磁盘布局:

  | Boot | Block | Block | Block | ... | Block |
  | Block| Group0| Group1| Group2|     | GroupN|

  每个Block Group:
  +------------------------------------------+
  | Superblock (备份)                         |
  | Group Descriptor Table                    |
  | Block Bitmap                             |
  | Inode Bitmap                             |
  | Inode Table                              |
  | Data Blocks                              |
  +------------------------------------------+

Ext4 Inode结构:
  | Mode | UID | Size | Timestamps | Blocks | Links |
  | Direct Blocks [0-11]                     |  -- 直接指针
  | Indirect Block                           |  -- 一级间接
  | Double Indirect Block                    |  -- 二级间接
  | Triple Indirect Block                    |  -- 三级间接

  寻址能力 (4KB块, 4B指针):
    直接: 12 * 4KB = 48KB
    一级: (4KB/4B) * 4KB = 4MB
    二级: 1024 * 4MB = 4GB
    三级: 1024 * 4GB = 4TB

Ext4扩展:
  使用Extent替代间接块:
    一个Extent = {起始块, 长度}
    一次描述连续的块范围，减少指针层级
```

### 6.3 文件操作流程

```
读取文件的完整路径:

  open("/home/user/file.txt", O_RDONLY)

  1. VFS解析路径:
     root dentry -> "home" -> dentry -> "user" -> dentry -> "file.txt" -> inode
     每级需要读取目录项 (可能触发磁盘IO)

  2. 创建file对象:
     file->inode = 目标inode
     file->pos = 0
     file->mode = O_RDONLY

  3. 分配文件描述符:
     fd = 3 (0=stdin, 1=stdout, 2=stderr)

  read(fd, buf, count)

  1. 通过fd找到file对象
  2. 检查权限 (file->mode允许读?)
  3. 计算逻辑块号: block = file->pos / block_size
  4. 通过inode的块映射找到物理块号
  5. 若页缓存命中 -> 直接返回
  6. 若未命中 -> 提交块IO请求
  7. 更新file->pos
```

### 6.4 页缓存

```
页缓存 (Page Cache):

  原理: 利用内存缓存磁盘数据，利用时间局部性

  读流程:
    read() -> 检查页缓存 -> 命中 -> 返回
                            未命中 -> 磁盘IO -> 加入缓存 -> 返回

  写流程:
    write() -> 写入页缓存 -> 标记为脏页 -> 返回
    脏页回写:
      - 定期 (kupdate内核线程, 30s)
      - 内存压力时 (pdflush)
      - sync/fsync强制回写

  页缓存查找:
    address_space -> radix_tree/xarray -> 按页索引查找
```

---

## 7. I/O系统

### 7.1 I/O层次

```
I/O系统层次:

+----------------------------------+
|  User Application                |
+----------------------------------+
|  System Call Interface           |  read/write/ioctl
+----------------------------------+
|  VFS / Block Layer               |  通用块层
+----------------------------------+
|  I/O Scheduler                   |  请求合并与排序
+----------------------------------+
|  Device Driver                   |  硬件操作
+----------------------------------+
|  Device Controller               |  寄存器/DMA
+----------------------------------+
|  Physical Device                 |
+----------------------------------+
```

### 7.2 I/O调度算法

```
I/O调度算法:

1. NOOP (No Operation):
   简单FIFO队列，仅合并相邻请求
   适用: SSD (随机访问延迟均匀)

2. Deadline:
   每个请求有截止时间
   维护: 排序队列(按扇区) + FIFO队列(按时间)
   读请求优先(500ms超时)，写请求次之(5s超时)

3. CFQ (Completely Fair Queue):
   每个进程一个队列，轮转服务
   分配时间片给每个队列
   适合桌面系统

4. BFQ (Budget Fair Queue):
   CFQ的改进版，基于预算
   更好的吞吐量和延迟平衡
```

### 7.3 DMA与零拷贝

```
传统数据传输 (4次拷贝):

  磁盘 -> 内核缓冲区 -> 用户缓冲区 -> Socket缓冲区 -> 网卡
  [DMA拷贝]  [CPU拷贝]    [CPU拷贝]     [DMA拷贝]

零拷贝技术:

1. sendfile():
   磁盘 -> 内核缓冲区 -> Socket缓冲区 -> 网卡
   [DMA拷贝]             [CPU拷贝]      [DMA拷贝]
   省去: 内核->用户的一次CPU拷贝

2. sendfile() + DMA Scatter-Gather:
   磁盘 -> 内核缓冲区 -> 网卡
   [DMA拷贝]             [DMA拷贝]
   省去: 所有CPU拷贝

3. mmap():
   文件映射到进程地址空间
   直接操作内核缓冲区，无需read/write
   注意: 信号处理、页面错误等复杂情况
```

> 跨模块引用：[计算机网络](network)的高性能网络框架(Netty/DPDK)大量使用零拷贝技术。[Java](java/overview)的NIO使用DirectByteBuffer减少拷贝。[C语言](c/overview)的mmap系统调用直接映射文件到内存。

---

## 8. 速查表

### 8.1 进程状态速查

| 状态       | 含义     | 转移条件                         |
| ---------- | -------- | -------------------------------- |
| Created    | 刚创建   | fork()                           |
| Ready      | 可运行   | 被调度器选中 -> Running          |
| Running    | 正在执行 | 时间片完 -> Ready; IO -> Blocked |
| Blocked    | 等待事件 | 事件完成 -> Ready                |
| Terminated | 已终止   | exit()                           |

### 8.2 同步原语速查

| 原语     | 作用         | 开销             |
| -------- | ------------ | ---------------- |
| 自旋锁   | 忙等待互斥   | 低(无上下文切换) |
| 互斥锁   | 睡眠等待互斥 | 中(上下文切换)   |
| 信号量   | 计数同步     | 中               |
| 条件变量 | 等待条件     | 中               |
| 读写锁   | 读共享写互斥 | 中               |
| RCU      | 读无锁写延迟 | 低(读)高(写)     |

### 8.3 页面置换速查

| 算法  | 策略             | 优缺点               |
| ----- | ---------------- | -------------------- |
| OPT   | 置换最远将来使用 | 理论最优，不可实现   |
| FIFO  | 置换最早进入     | 简单，有Belady异常   |
| LRU   | 置换最久未用     | 近似最优，实现代价高 |
| Clock | LRU近似          | 实用，性能接近LRU    |
| LFU   | 置换最少使用     | 适合热点数据，需老化 |

### 8.4 系统调用速查

| 类别 | 系统调用                          | 功能                |
| ---- | --------------------------------- | ------------------- |
| 进程 | fork/exec/wait/exit               | 创建/替换/等待/退出 |
| 文件 | open/read/write/close/mmap        | 文件操作            |
| 目录 | mkdir/rmdir/chdir/getcwd          | 目录操作            |
| 内存 | brk/mmap/munmap/mprotect          | 内存管理            |
| 信号 | kill/signal/sigaction             | 信号处理            |
| 网络 | socket/bind/listen/accept/connect | 网络通信            |
| 管道 | pipe/dup2                         | 进程间通信          |

---

## 延伸阅读

- _Operating System Concepts_ -- Silberschatz, Galvin, Gagne
- _Modern Operating Systems_ -- Andrew S. Tanenbaum
- _Understanding the Linux Kernel_ -- Bovet & Cesati
- _The Design and Implementation of the FreeBSD Operating System_ -- McKusick et al.
