---
order: 59
title: JavaIO与NIO
module: java
category: Java
difficulty: intermediate
description: BIO、NIO、AIO、零拷贝、Reactor模式与字节码层面原理
author: fanquanpp
updated: '2026-07-21'
related:
  - java/Java反射
  - java/Java序列化
  - java/Java新特性
  - java/运算符与表达式
prerequisites:
  - java/数据类型与类型转换
  - java/异常处理机制
  - java/集合框架详解
tags:
  - Java
  - IO
  - NIO
  - AIO
  - 零拷贝
  - Reactor
  - epoll
  - 字符编码
---

# Java IO 与 NIO 详解

> I/O（Input/Output）是计算机科学中最古老、最核心、也最被低估的主题之一。从打孔卡到磁盘，从 TCP socket 到 NVMe SSD，I/O 模型的演进映射着计算机系统的演进。Java 在 JDK 1.0 时提供了面向流的同步阻塞 BIO（Blocking I/O）API，在 JDK 1.4 引入了面向缓冲区的 NIO（New I/O）API，在 JDK 7 引入了异步 AIO（Asynchronous I/O）API。三大 I/O 体系并存，既是 Java 工程师必须跨越的认知门槛，也是理解 Netty、Tomcat、Kafka、Redis 客户端等高性能中间件的钥匙。

---

## 1. 学习目标（基于 Bloom 分类法）

### 1.1 认知层级目标

| 层级 | 行为动词 | 具体学习目标 |
|------|---------|-------------|
| 记忆 | 列举、识别 | 列举 `java.io` 与 `java.nio` 包的核心类层次，识别 BIO/NIO/AIO 三大 API 的代表类 |
| 理解 | 解释、对比 | 解释字节流与字符流的差异，对比 BIO 的阻塞语义与 NIO 的非阻塞语义，理解 `Channel`、`Buffer`、`Selector` 三件套的设计动机 |
| 应用 | 实现、演示 | 实现一个基于 `ServerSocket` 的 BIO echo 服务器，实现一个基于 `Selector` 的 NIO echo 服务器，演示 `transferTo` 零拷贝 |
| 分析 | 分解、推断 | 分解 `epoll_wait` 在 HotSpot 中的调用链，推断 `select` / `poll` / `epoll` 的复杂度差异 |
| 评价 | 评判、论证 | 评判 Reactor 与 Proactor 模式的优劣，论证 Netty 选择 NIO 而非 AIO 的理由 |
| 创造 | 设计、构建 | 设计一个支持多路复用的 HTTP 静态文件服务器，构建主从 Reactor 线程模型 |

### 1.2 学习成果自检清单

1. 在白板上画出 `InputStream`、`OutputStream`、`Reader`、`Writer` 的类继承图。
2. 用一段话向同事解释"为什么 NIO 比线程-per-连接的 BIO 模型更适合 C10K 场景"。
3. 在 Linux 终端使用 `strace` 跟踪 Java NIO 程序，识别 `epoll_create`、`epoll_ctl`、`epoll_wait` 系统调用。
4. 编写代码演示 `mmap` 与 `sendfile` 的差异。
5. 在 Netty 源码中定位 `NioEventLoop` 的核心 select 循环，并解释其优化策略。

### 1.3 前置知识地图

```
操作系统基础
    │
    ├── 文件描述符 (fd)
    ├── 内核态与用户态
    ├── 系统调用 (read/write/epoll)
    └── 虚拟内存与页缓存
            │
            ▼
Java 基础
    │
    ├── 异常处理 (IOException)
    ├── 集合框架
    ├── 多线程基础
    └── 字符编码 (UTF-8/UTF-16)
            │
            ▼
Java I/O 与 NIO（本章）
    │
    ├── java.io.* (BIO)
    ├── java.nio.* (NIO)
    ├── java.nio.channels (Channel/Selector)
    ├── java.nio.charset (Charset)
    └── 零拷贝 (transferTo/mmap/directbuffer)
```

### 1.4 章节阅读建议

- **零基础读者**：按顺序阅读第 2、3 节建立概念框架，配合第 5 节代码实操。
- **后端工程师**：重点关注第 4 节操作系统层面的 epoll/kqueue/iocp 原理，第 8 节性能调优。
- **中间件开发者**：直接阅读第 9 节 Netty、Kafka、Tomcat 的源码案例研究。

---

## 2. 历史动机与演化

### 2.1 I/O 模型演化的工程动机

I/O 模型的演化始终围绕一个核心矛盾：**CPU 速度远超 I/O 设备速度**。1960 年代，批处理系统通过磁带顺序读写回避了这一矛盾；1970 年代，多道程序设计通过进程切换让 CPU 等待 I/O 时切换执行其他进程；1980 年代，UNIX 引入了 `select` 系统调用，使得单个进程能"同时"等待多个文件描述符；2000 年代，Linux 2.6 引入 `epoll`，BSD 引入 `kqueue`，Windows 引入 IOCP，将多路复用推向新高度。

Java I/O 演化紧随其后：

| 时间 | JDK | API | 对应 OS 模型 |
|------|-----|-----|-------------|
| 1996-01 | JDK 1.0 | `java.io.*`（BIO） | 阻塞 read/write |
| 1997-05 | JDK 1.1 | `Reader/Writer` 字符流 | 同上，引入字符编码抽象 |
| 2002-09 | JDK 1.4 | `java.nio.*`（NIO） | `select` / `poll` / `epoll`（Linux 2.6 后） |
| 2011-07 | JDK 7 | NIO.2 / AIO | `epoll`（Linux）、IOCP（Windows）、kqueue（BSD） |
| 2017-09 | JDK 9 | 异步 HTTP Client | 基于 NIO |
| 2023-09 | JDK 21 | 虚拟线程 + BIO 回潮 | `epoll` + Loom 调度 |

### 2.2 关键里程碑

| 时间 | 事件 | 意义 |
|------|------|------|
| 1983 | UNIX 4.2BSD 引入 `select` | 第一个多路复用系统调用，但限制 fd 数量（FD_SETSIZE=1024） |
| 1999 | Linux 2.2 引入 `poll` | 移除 fd 数量限制，但仍 O(n) 扫描 |
| 2002 | Linux 2.6 引入 `epoll` | O(1) 事件通知，支持 C10K |
| 2002 | JDK 1.4 引入 NIO | JSR 51，第一次提供多路复用 API |
| 2003 | FreeBSD 引入 `kqueue` | BSD 系的事件通知机制 |
| 2008 | Netty 3.x 发布 | 基于 NIO 的高性能网络框架 |
| 2011 | JDK 7 引入 NIO.2 / AIO | JSR 203，异步 I/O（Linux 实现仍基于 epoll 模拟） |
| 2014 | Linux 3.15 引入 `io_uring` | 真正异步 I/O，无系统调用开销 |
| 2021 | JDK 21 GA | 虚拟线程正式发布，BIO 模式再次可用 |

### 2.3 Java I/O 三大体系对比

| 维度 | BIO | NIO | AIO |
|------|-----|-----|-----|
| 引入版本 | JDK 1.0 | JDK 1.4 | JDK 7 |
| 数据单位 | 字节流/字符流 | Buffer + Channel | ByteBuffer + AsynchronousChannel |
| 阻塞语义 | 阻塞 | 非阻塞（可配置） | 完全异步 |
| 编程模型 | 线程-per-连接 | Reactor | Proactor |
| 多路复用 | 无 | Selector | CompletionHandler |
| OS 支持 | 全平台 | 全平台 | Windows IOCP 原生；Linux 模拟 |
| 典型框架 | Tomcat Bio、旧 JDBC | Netty、Mina、Tomcat Nio | Netty AIO（已弃用） |

### 2.4 设计哲学：为什么 NIO 不是 BIO 的替代品

NIO 设计初衷是"为高性能服务器提供 I/O 多路复用能力"，而非替代 BIO。BIO 的简洁性（同步阻塞、流式语义）在低并发、文件 I/O、原型开发场景仍有优势。

具体而言：
- **BIO 适合**：每连接一线程、低并发（<1000）、文件 I/O、教程示例。
- **NIO 适合**：高并发（C10K+）、需要多路复用、零拷贝、长连接。
- **AIO 适合**：Windows 平台、需要完全异步语义、文件 I/O（Linux 下 NIO 文件 Channel 同步更快）。

JDK 21 的虚拟线程让 BIO 模式在高并发场景重新可用——一个虚拟线程的代价仅几百字节，可以"线程-per-连接"地处理数万连接。这被认为是 I/O 编程的"范式回潮"。

### 2.5 JEP 与 I/O 相关提案

| JEP | 标题 | 状态 |
|-----|------|------|
| JEP 51 | New I/O APIs for the Java Platform | Final (JDK 1.4) |
| JEP 203 | NIO.2 File Tree API | Final (JDK 7) |
| JEP 254 | Compact Strings | Final (JDK 9) |
| JEP 321 | HTTP Client (Standard) | Final (JDK 11) |
| JEP 353 | Foreign-Memory Access API (Incubator) | Incubator (JDK 14) |
| JEP 424 | Foreign Function & Memory API (Preview) | Preview (JDK 19) |
| JEP 454 | Foreign Function & Memory API | Final (JDK 22) |
| JEP 444 | Virtual Threads | Final (JDK 21) |

### 2.6 与操作系统的共生关系

Java I/O 是操作系统 I/O 系统调用的"包装层"：

```
Java Application
    │
    │  java.io.FileInputStream.read()
    ▼
JNI 调用 JVM 内部 native 方法
    │
    │  IO_Read (HotSpot 内部)
    ▼
Linux glibc
    │
    │  read(int fd, void *buf, size_t count)
    ▼
Linux Kernel
    │
    │  sys_read → vfs_read → ext4_file_read_iter
    ▼
Device Driver (NVMe / SATA / Network)
```

不同 JDK 版本的实现策略：
- **JDK 1.4–8**：NIO 通过 `sun.nio.ch` 包内部 native 调用 `epoll_create`、`epoll_ctl`、`epoll_wait`。
- **JDK 9+**：模块化封装了 `sun.nio.ch`，但底层调用未变。
- **JDK 18+**：JEP 424 FFM API 允许直接调用 `epoll_create` 等系统调用，绕过 JNI。

---

## 3. 形式化定义

### 3.1 I/O 操作的抽象模型

设 $D$ 为数据源（Source）或数据汇（Sink），$B$ 为内存缓冲区，$\tau$ 为时间。一次 I/O 操作可形式化为：

$$
\text{IO}: D \times B \times \mathbb{R}^+ \to \mathbb{N} \cup \{-1\}
$$

其中返回值为读写的字节数，$-1$ 表示 EOF（文件结束）或错误。

**定义 1（阻塞 I/O）**：阻塞 I/O 操作在数据未就绪时挂起调用线程，直到数据就绪并完成传输：

$$
\text{BlockingIO}(D, B, t_0) = \begin{cases}
\text{read}(D, B) & \text{if data ready at } t_0 \\
\text{block until data ready, then read}(D, B) & \text{otherwise}
\end{cases}
$$

**定义 2（非阻塞 I/O）**：非阻塞 I/O 在数据未就绪时立即返回 0 或错误码：

$$
\text{NonBlockingIO}(D, B, t_0) = \begin{cases}
\text{read}(D, B) & \text{if data ready at } t_0 \\
0 \text{ (or } EAGAIN \text{)} & \text{otherwise}
\end{cases}
$$

**定义 3（多路复用 I/O）**：多路复用允许单线程同时监控多个 fd 的就绪状态：

$$
\text{Multiplex}(F, \text{timeout}) = \{ f \in F \mid \text{ready}(f) \}
$$

其中 $F$ 为 fd 集合，返回就绪 fd 子集。

### 3.2 Buffer 的形式化定义

NIO Buffer 是一个固定容量的、可读写切换的内存区域。形式化为五元组：

$$
\text{Buffer} = \langle \text{capacity}, \text{position}, \text{limit}, \text{mark}, \text{data} \rangle
$$

满足不变量：

$$
0 \leq \text{mark} \leq \text{position} \leq \text{limit} \leq \text{capacity}
$$

操作语义：
- `clear()`：$\text{position} \leftarrow 0, \text{limit} \leftarrow \text{capacity}$
- `flip()`：$\text{limit} \leftarrow \text{position}, \text{position} \leftarrow 0$
- `rewind()`：$\text{position} \leftarrow 0$（limit 不变）
- `mark()`：$\text{mark} \leftarrow \text{position}$
- `reset()`：$\text{position} \leftarrow \text{mark}$

### 3.3 零拷贝的复杂度分析

传统 I/O 读取文件并通过网络发送，需要 4 次上下文切换 + 4 次数据拷贝：

$$
T_{\text{traditional}} = 4 \cdot T_{\text{ctx\_switch}} + 4 \cdot T_{\text{copy}}
$$

`sendfile`（Linux 2.2+）减少为 2 次上下文切换 + 2 次拷贝（其中 1 次为 DMA）：

$$
T_{\text{sendfile}} = 2 \cdot T_{\text{ctx\_switch}} + 2 \cdot T_{\text{copy}}
$$

`sendfile` + SG-DMA（Linux 2.4+，scatter-gather）进一步减少为 2 次上下文切换 + 1 次 DMA 拷贝（数据不进入 CPU）：

$$
T_{\text{sendfile\_sg}} = 2 \cdot T_{\text{ctx\_switch}} + T_{\text{dma}}
$$

`mmap` + `write` 是另一种零拷贝策略，将文件映射到用户空间内存：

$$
T_{\text{mmap}} = 2 \cdot T_{\text{ctx\_switch}} + 2 \cdot T_{\text{copy}}
$$

但 `mmap` 后数据可直接在用户态访问，无需 `read` 系统调用。

### 3.4 Reactor 模式的形式化定义

Reactor 模式由 Douglas Schmidt 在 1995 年的 POSA2 一书中系统化。其核心组件：

1. **Event Demultiplexer**：基于 OS 多路复用（`select`/`epoll`/`kqueue`）。
2. **Reactor**：事件循环，分发就绪事件。
3. **EventHandler**：应用层处理器，响应 I/O 事件。

形式化为：

$$
\text{Reactor}(\text{events}) = \bigcup_{e \in \text{events}} \text{dispatch}(e)
$$

其中 $\text{dispatch}(e) = \text{handler}_e.\text{handle}(e)$。

### 3.5 字符编码的数学模型

字符编码是从字符集到字节序列的映射：

$$
\text{Encoding}: \Sigma \to \{0, 1\}^*
$$

其中 $\Sigma$ 为字符集（如 Unicode），$\{0, 1\}^*$ 为字节序列。

UTF-8 是变长编码，长度 $L(c)$ 取决于码点 $U(c)$：

$$
L(c) = \begin{cases}
1 & \text{if } U(c) \in [0, 0x7F] \\
2 & \text{if } U(c) \in [0x80, 0x7FF] \\
3 & \text{if } U(c) \in [0x800, 0xFFFF] \\
4 & \text{if } U(c) \in [0x10000, 0x10FFFF]
\end{cases}
$$

UTF-16 对 BMP 字符（$U \leq 0xFFFF$）用 2 字节，辅助平面字符用 4 字节（代理对）。

---

## 4. 理论推导：操作系统层面的 I/O 模型

### 4.1 文件描述符与系统调用

Linux 一切皆文件，文件描述符（fd, file descriptor）是内核维护的整数索引。每个进程有一个 `files_struct`，包含指向 `file` 对象的指针数组。fd 就是该数组的下标。

```c
// Linux 内核简化结构
struct task_struct {
    struct files_struct *files; // 进程的文件描述符表
};

struct files_struct {
    struct file *fd_array[NR_OPEN_DEFAULT]; // fd 数组
};

struct file {
    struct path f_path;            // 文件路径
    const struct file_operations *f_op; // 操作函数表
    void *private_data;            // socket、pipe 等私有数据
};
```

每次 `read(fd, buf, n)` 系统调用：
1. 用户态陷入内核态（上下文切换）。
2. 内核根据 fd 找到 `file` 对象，调用 `f_op->read`。
3. 对于 socket，`f_op->read` 是 `sock_read_iter`，进一步调用协议栈 `tcp_recvmsg`。
4. 数据从内核缓冲区拷贝到用户缓冲区 `buf`。
5. 返回用户态（再次上下文切换）。

### 4.2 阻塞 I/O 的内核语义

对于阻塞 socket，当接收缓冲区无数据时，`tcp_recvmsg` 会调用 `wait_for_packet`，将当前进程加入 socket 的等待队列，并调用 `schedule()` 让出 CPU。当数据到达（网卡中断 → 协议栈 → 唤醒等待队列），进程被唤醒，继续执行 `tcp_recvmsg` 完成读取。

```
[用户态] read(fd, buf, n)
         │
         │ syscall
         ▼
[内核态] sys_read → vfs_read → sock_read_iter → tcp_recvmsg
         │
         │ 数据未就绪
         ▼
         wait_for_packet (进程加入等待队列)
         │
         │ schedule() (让出 CPU)
         ▼
         (进程休眠)
         │
         │ 网卡中断 → 数据到达 → 唤醒等待队列
         ▼
         tcp_recvmsg 继续，拷贝数据到用户 buf
         │
         │ 返回
         ▼
[用户态] read 返回
```

这种模型的问题是：**一个连接一个线程**。1 万个连接需要 1 万个线程，每个线程默认占用 1MB 栈空间，内存消耗 10GB+，且线程切换开销巨大。

### 4.3 非阻塞 I/O 与多路复用

非阻塞 I/O（`O_NONBLOCK`）的 `read` 在数据未就绪时立即返回 `EAGAIN`，但需要应用层不断轮询（busy loop），CPU 占用高。

多路复用（`select`/`poll`/`epoll`）让单线程能"等待"多个 fd 中的任意一个就绪：

#### 4.3.1 `select` 的实现

```c
int select(int nfds, fd_set *readfds, fd_set *writefds,
           fd_set *exceptfds, struct timeval *timeout);
```

`select` 内部遍历所有传入的 fd，对每个 fd 调用驱动程序的 `poll` 方法检查就绪状态。复杂度 $O(n)$，且：
- `nfds` 受 `FD_SETSIZE` 限制（默认 1024）。
- 每次调用需要重新传入 fd 集合（用户态 → 内核态拷贝）。
- 返回后需要再次遍历找出就绪 fd。

#### 4.3.2 `poll` 的改进

```c
int poll(struct pollfd *fds, nfds_t nfds, int timeout);
```

`poll` 移除了 `FD_SETSIZE` 限制，但其他问题依旧：$O(n)$ 扫描、无状态。

#### 4.3.3 `epoll` 的设计

`epoll` 通过三个系统调用解决 `select`/`poll` 的问题：

```c
int epoll_create(int size);           // 创建 epoll 实例
int epoll_ctl(int epfd, int op, int fd, struct epoll_event *event); // 添加/修改/删除 fd
int epoll_wait(int epfd, struct epoll_event *events, int maxevents, int timeout); // 等待事件
```

`epoll` 内部维护一个红黑树存储所有注册的 fd，以及一个就绪队列。当 fd 就绪时（驱动 `poll` 回调发现数据），内核将 fd 加入就绪队列。`epoll_wait` 只需从就绪队列取出事件，复杂度 $O(\text{ready})$。

`epoll` 的两种触发模式：
- **LT (Level Triggered, 水平触发)**：默认。只要 fd 处于就绪状态，`epoll_wait` 就会返回该事件。易于使用，但可能重复唤醒。
- **ET (Edge Triggered, 边沿触发)**：fd 从未就绪变为就绪时通知一次，需配合非阻塞 I/O，必须一次读完所有数据。性能更高但易出错。

Java NIO 的 `Selector` 在 Linux 下使用 ET 模式的 `epoll`（JDK 实现细节）。

### 4.4 Java NIO Selector 的字节码层实现

`Selector.open()` 内部调用链：

```
Selector.open()
    │
    ▼
SelectorProvider.provider().openSelector()
    │
    ▼
EPollSelectorImpl (Linux) / KQueueSelectorImpl (Mac) / WindowsSelectorImpl (Windows)
    │
    ▼
EPollArrayWrapper.epollCreate() (Linux)
    │
    │  epoll_create(256) syscall
    ▼
返回 epoll fd
```

`Selector.select()` 调用链：

```
Selector.select(timeout)
    │
    ▼
EPollSelectorImpl.doSelect(timeout)
    │
    ▼
EPollArrayWrapper.epollWait(timeout)
    │
    │  epoll_wait(epfd, events, maxevents, timeout) syscall
    ▼
处理就绪事件，更新 selectedKeys
```

### 4.5 异步 I/O (AIO) 与 `io_uring`

JDK 7 引入的 AIO 在 Linux 下并非真异步——其底层用 `epoll` 模拟，调用线程仍会被阻塞（只是包装为线程池异步执行回调）。Windows 下使用 IOCP，是真异步。

Linux 5.1（2019）引入的 `io_uring` 是真异步 I/O，通过共享内存环形队列避免系统调用开销：

```
[用户态]                           [内核态]
┌──────────────────┐              ┌──────────────────┐
│ SQ (提交队列)     │ ──────────→  │ 内核消费 SQ       │
└──────────────────┘              └──────────────────┘
┌──────────────────┐              ┌──────────────────┐
│ CQ (完成队列)     │ ←──────────  │ 内核填充 CQ       │
└──────────────────┘              └──────────────────┘
```

JDK 21+ 计划通过 Project Loom + FFM API 集成 `io_uring`，但目前（2024 年）尚未在主线 JDK 中启用。

### 4.6 Buffer 在 JVM 中的内存布局

`ByteBuffer` 有两种实现：

- **HeapByteBuffer**：分配在 Java 堆上，受 GC 管理。优点是分配快、可被 GC 自动回收；缺点是每次 I/O 都需要在堆缓冲区与原生内存之间拷贝数据。
- **DirectByteBuffer**：分配在原生内存（C `malloc`），绕过 Java 堆。优点是 I/O 时无需拷贝（零拷贝）；缺点是分配慢、手动回收（通过 `Cleaner` + `Unsafe.freeMemory`）。

```java
// JDK 内部简化
public abstract class ByteBuffer {
    final byte[] hb;           // 堆缓冲区（HeapByteBuffer 非空）
    final long address;        // 原生内存地址（DirectByteBuffer 非零）
}
```

`DirectByteBuffer` 的回收依赖 `Cleaner`（JDK 9+ 是 `jdk.internal.ref.Cleaner`，基于 `PhantomReference`），在 GC 时调用 `Unsafe.freeMemory(address)` 释放原生内存。

工程实践建议：
- 大块、长期复用的 buffer 用 `DirectByteBuffer`（如 Netty 的 `PooledByteBufAllocator`）。
- 小块、短生命周期的 buffer 用 `HeapByteBuffer`（如临时解析）。
- 默认 `ByteBuffer.allocate(n)` 是 Heap，`ByteBuffer.allocateDirect(n)` 是 Direct。

---

## 5. 代码示例（可运行 Java 代码）

### 5.1 环境准备

```bash
mkdir -p ~/java-io-demo
cd ~/java-io-demo
java -version  # 验证 JDK 17+
```

### 5.2 示例 1：BIO 文件读写

```java
// file: BioFileDemo.java
import java.io.*;

public class BioFileDemo {
    public static void main(String[] args) throws IOException {
        String src = "input.txt";
        String dst = "output.txt";

        // 写入文件
        try (FileOutputStream fos = new FileOutputStream(src);
             BufferedOutputStream bos = new BufferedOutputStream(fos)) {
            bos.write("Hello, Java IO!\n".getBytes("UTF-8"));
            bos.write("这是第二行\n".getBytes("UTF-8"));
        }

        // 读取文件
        try (FileInputStream fis = new FileInputStream(src);
             BufferedInputStream bis = new BufferedInputStream(fis);
             InputStreamReader isr = new InputStreamReader(bis, "UTF-8");
             BufferedReader br = new BufferedReader(isr)) {
            String line;
            while ((line = br.readLine()) != null) {
                System.out.println("读: " + line);
            }
        }

        // 复制文件
        try (FileInputStream in = new FileInputStream(src);
             FileOutputStream out = new FileOutputStream(dst)) {
            byte[] buf = new byte[4096];
            int n;
            while ((n = in.read(buf)) != -1) {
                out.write(buf, 0, n);
            }
        }

        System.out.println("文件复制完成");
    }
}
```

### 5.3 示例 2：BIO Echo 服务器（线程-per-连接）

```java
// file: BioEchoServer.java
import java.io.*;
import java.net.*;
import java.util.concurrent.*;

public class BioEchoServer {
    public static void main(String[] args) throws IOException {
        ExecutorService pool = Executors.newFixedThreadPool(200);
        try (ServerSocket server = new ServerSocket(8080)) {
            System.out.println("BIO Echo Server 监听 8080");
            while (true) {
                Socket client = server.accept(); // 阻塞
                pool.submit(() -> handle(client));
            }
        }
    }

    private static void handle(Socket client) {
        try (Socket s = client;
             BufferedReader in = new BufferedReader(
                 new InputStreamReader(s.getInputStream(), "UTF-8"));
             PrintWriter out = new PrintWriter(
                 new OutputStreamWriter(s.getOutputStream(), "UTF-8"), true)) {
            String line;
            while ((line = in.readLine()) != null) {
                System.out.println("收到: " + line + " from " + s.getRemoteSocketAddress());
                out.println("ECHO: " + line);
                if ("bye".equalsIgnoreCase(line)) break;
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```

测试：

```bash
# 终端 1
javac BioEchoServer.java && java BioEchoServer

# 终端 2
telnet localhost 8080
# 输入 hello, bye
```

### 5.4 示例 3：NIO Buffer 基础操作

```java
// file: NioBufferDemo.java
import java.nio.*;

public class NioBufferDemo {
    public static void main(String[] args) {
        ByteBuffer buf = ByteBuffer.allocate(10);
        System.out.println("初始: " + formatBuffer(buf));
        // capacity=10, position=0, limit=10

        buf.put((byte) 1);
        buf.put((byte) 2);
        buf.put((byte) 3);
        System.out.println("写入 3 字节: " + formatBuffer(buf));
        // capacity=10, position=3, limit=10

        buf.flip(); // 切换为读模式
        System.out.println("flip 后: " + formatBuffer(buf));
        // capacity=10, position=0, limit=3

        while (buf.hasRemaining()) {
            System.out.println("读取: " + buf.get());
        }
        System.out.println("读完: " + formatBuffer(buf));
        // capacity=10, position=3, limit=3

        buf.clear(); // 重置为写模式
        System.out.println("clear 后: " + formatBuffer(buf));
        // capacity=10, position=0, limit=10
    }

    static String formatBuffer(Buffer b) {
        return String.format("capacity=%d, position=%d, limit=%d",
                b.capacity(), b.position(), b.limit());
    }
}
```

### 5.5 示例 4：NIO 文件读写与零拷贝

```java
// file: NioFileDemo.java
import java.io.*;
import java.nio.*;
import java.nio.channels.*;
import java.nio.charset.*;
import java.nio.file.*;

public class NioFileDemo {
    public static void main(String[] args) throws IOException {
        Path src = Paths.get("input.txt");
        Path dst = Paths.get("output_nio.txt");

        // 1. 使用 FileChannel + ByteBuffer 读写
        try (FileChannel inCh = FileChannel.open(src, StandardOpenOption.READ);
             FileChannel outCh = FileChannel.open(dst,
                 StandardOpenOption.CREATE, StandardOpenOption.WRITE)) {

            ByteBuffer buf = ByteBuffer.allocateDirect(8192);
            while (inCh.read(buf) != -1) {
                buf.flip();
                outCh.write(buf);
                buf.clear();
            }
        }
        System.out.println("FileChannel 复制完成");

        // 2. 零拷贝：transferTo（底层使用 sendfile 系统调用）
        try (FileChannel inCh = FileChannel.open(src, StandardOpenOption.READ);
             FileChannel outCh = FileChannel.open(Paths.get("output_zerocopy.txt"),
                 StandardOpenOption.CREATE, StandardOpenOption.WRITE)) {
            inCh.transferTo(0, inCh.size(), outCh);
        }
        System.out.println("transferTo 零拷贝完成");

        // 3. mmap：将文件映射到内存
        try (FileChannel ch = FileChannel.open(src, StandardOpenOption.READ)) {
            MappedByteBuffer mbuf = ch.map(FileChannel.MapMode.READ_ONLY, 0, ch.size());
            byte[] data = new byte[mbuf.remaining()];
            mbuf.get(data);
            System.out.println("mmap 读取: " + new String(data, StandardCharsets.UTF_8));
        }
    }
}
```

### 5.6 示例 5：NIO Selector Echo 服务器

```java
// file: NioEchoServer.java
import java.io.*;
import java.net.*;
import java.nio.*;
import java.nio.channels.*;
import java.nio.charset.*;
import java.util.*;

public class NioEchoServer {
    private static final Charset UTF8 = StandardCharsets.UTF_8;

    public static void main(String[] args) throws IOException {
        Selector selector = Selector.open();
        ServerSocketChannel server = ServerSocketChannel.open();
        server.bind(new InetSocketAddress(8080));
        server.configureBlocking(false);
        server.register(selector, SelectionKey.OP_ACCEPT);
        System.out.println("NIO Echo Server 监听 8080");

        while (true) {
            selector.select(1000); // 阻塞最多 1 秒
            Iterator<SelectionKey> keys = selector.selectedKeys().iterator();
            while (keys.hasNext()) {
                SelectionKey key = keys.next();
                keys.remove();
                try {
                    if (key.isAcceptable()) handleAccept(key, selector);
                    else if (key.isReadable()) handleRead(key);
                } catch (IOException e) {
                    System.err.println("连接异常: " + e.getMessage());
                    key.cancel();
                    key.channel().close();
                }
            }
        }
    }

    private static void handleAccept(SelectionKey key, Selector selector) throws IOException {
        ServerSocketChannel server = (ServerSocketChannel) key.channel();
        SocketChannel client = server.accept();
        client.configureBlocking(false);
        client.register(selector, SelectionKey.OP_READ);
        System.out.println("新连接: " + client.getRemoteAddress());
    }

    private static void handleRead(SelectionKey key) throws IOException {
        SocketChannel client = (SocketChannel) key.channel();
        ByteBuffer buf = ByteBuffer.allocate(1024);
        int n = client.read(buf);
        if (n == -1) {
            System.out.println("连接关闭: " + client.getRemoteAddress());
            client.close();
            return;
        }
        buf.flip();
        String msg = UTF8.decode(buf).toString();
        System.out.println("收到: " + msg.trim() + " from " + client.getRemoteAddress());

        ByteBuffer echo = UTF8.encode("ECHO: " + msg);
        client.write(echo);
        if ("bye\n".equalsIgnoreCase(msg)) client.close();
    }
}
```

### 5.7 示例 6：字符编码与乱码分析

```java
// file: EncodingDemo.java
import java.nio.*;
import java.nio.charset.*;

public class EncodingDemo {
    public static void main(String[] args) {
        String s = "中文ABC";
        System.out.println("原文: " + s);

        // 不同编码的字节长度
        byte[] utf8 = s.getBytes(StandardCharsets.UTF_8);
        byte[] utf16 = s.getBytes(StandardCharsets.UTF_16);
        byte[] gbk = s.getBytes(Charset.forName("GBK"));

        System.out.println("UTF-8 字节数: " + utf8.length);    // 9 (3*3 + 3)
        System.out.println("UTF-16 字节数: " + utf16.length);  // 14 (BOM 2 + 5*2 + 2)
        System.out.println("GBK 字节数: " + gbk.length);       // 7 (2*2 + 3)

        // 演示乱码
        String wrong = new String(utf8, Charset.forName("GBK"));
        System.out.println("UTF-8 字节按 GBK 解码: " + wrong); // 浣犲ソ涓枃

        // 修复乱码
        String fixed = new String(wrong.getBytes(Charset.forName("GBK")), StandardCharsets.UTF_8);
        System.out.println("修复后: " + fixed); // 中文ABC

        // CharsetEncoder/Decoder 用法
        CharsetEncoder encoder = StandardCharsets.UTF_8.newEncoder();
        CharsetDecoder decoder = StandardCharsets.UTF_8.newDecoder();

        try {
            CharBuffer cb = CharBuffer.wrap("Hello 世界");
            ByteBuffer bb = encoder.encode(cb);
            System.out.println("编码后字节: " + bb.remaining());

            bb.flip();
            CharBuffer decoded = decoder.decode(bb);
            System.out.println("解码后: " + decoded);
        } catch (CharacterCodingException e) {
            e.printStackTrace();
        }
    }
}
```

### 5.8 示例 7：直接缓冲区 vs 堆缓冲区性能对比

```java
// file: BufferBenchmark.java
import java.nio.*;

public class BufferBenchmark {
    public static void main(String[] args) {
        int iterations = 100_000;
        int size = 64 * 1024; // 64KB

        // Heap ByteBuffer
        long s1 = System.nanoTime();
        for (int i = 0; i < iterations; i++) {
            ByteBuffer buf = ByteBuffer.allocate(size);
            buf.put((byte) 1);
        }
        long heapTime = System.nanoTime() - s1;

        // Direct ByteBuffer
        long s2 = System.nanoTime();
        for (int i = 0; i < iterations; i++) {
            ByteBuffer buf = ByteBuffer.allocateDirect(size);
            buf.put((byte) 1);
        }
        long directTime = System.nanoTime() - s2;

        System.out.printf("Heap ByteBuffer   100K 次分配: %d ms%n", heapTime / 1_000_000);
        System.out.printf("Direct ByteBuffer 100K 次分配: %d ms%n", directTime / 1_000_000);
        System.out.printf("Direct / Heap = %.2fx%n", (double) directTime / heapTime);
    }
}
```

### 5.9 示例 8：AIO 异步文件读写

```java
// file: AioFileDemo.java
import java.io.*;
import java.nio.*;
import java.nio.channels.*;
import java.nio.file.*;
import java.util.concurrent.*;

public class AioFileDemo {
    public static void main(String[] args) throws Exception {
        Path file = Paths.get("input.txt");
        AsynchronousFileChannel ch = AsynchronousFileChannel.open(
            file, StandardOpenOption.READ);

        ByteBuffer buf = ByteBuffer.allocate(1024);
        Future<Integer> f = ch.read(buf, 0);
        int n = f.get();
        buf.flip();
        System.out.println("AIO 读取 " + n + " 字节: " +
            new String(buf.array(), 0, n));

        // 使用 CompletionHandler
        CountDownLatch latch = new CountDownLatch(1);
        ch.read(buf, 0, null, new CompletionHandler<Integer, Object>() {
            public void completed(Integer result, Object attachment) {
                System.out.println("CompletionHandler 完成: " + result);
                latch.countDown();
            }
            public void failed(Throwable exc, Object attachment) {
                exc.printStackTrace();
                latch.countDown();
            }
        });
        latch.await();
        ch.close();
    }
}
```

### 5.10 示例 9：AIO 异步服务器

```java
// file: AioEchoServer.java
import java.io.*;
import java.net.*;
import java.nio.*;
import java.nio.channels.*;
import java.nio.charset.*;
import java.util.concurrent.*;

public class AioEchoServer {
    public static void main(String[] args) throws IOException {
        AsynchronousServerSocketChannel server =
            AsynchronousServerSocketChannel.open().bind(new InetSocketAddress(8080));
        System.out.println("AIO Echo Server 监听 8080");

        server.accept(null, new CompletionHandler<AsynchronousSocketChannel, Object>() {
            public void completed(AsynchronousSocketChannel client, Object attachment) {
                server.accept(null, this); // 继续接受新连接
                handle(client);
            }
            public void failed(Throwable exc, Object attachment) {
                exc.printStackTrace();
            }
        });

        // 主线程阻塞
        Thread.currentThread().join();
    }

    private static void handle(AsynchronousSocketChannel client) {
        ByteBuffer buf = ByteBuffer.allocate(1024);
        client.read(buf, buf, new CompletionHandler<Integer, ByteBuffer>() {
            public void completed(Integer n, ByteBuffer b) {
                if (n == -1) {
                    try { client.close(); } catch (IOException ignored) {}
                    return;
                }
                b.flip();
                try {
                    String msg = StandardCharsets.UTF_8.decode(b).toString().trim();
                    System.out.println("收到: " + msg + " from " + client.getRemoteAddress());
                    ByteBuffer echo = StandardCharsets.UTF_8.encode("ECHO: " + msg + "\n");
                    client.write(echo, null, new CompletionHandler<Integer, Object>() {
                        public void completed(Integer result, Object attachment) {
                            ByteBuffer nb = ByteBuffer.allocate(1024);
                            client.read(nb, nb, this);
                        }
                        public void failed(Throwable exc, Object attachment) {
                            exc.printStackTrace();
                        }
                    });
                } catch (IOException e) { e.printStackTrace(); }
            }
            public void failed(Throwable exc, ByteBuffer b) {
                exc.printStackTrace();
            }
        });
    }
}
```

### 5.11 示例 10：使用 `strace` 跟踪 NIO 系统调用

```bash
# 编译运行 NioEchoServer
javac NioEchoServer.java
strace -f -e trace=epoll_create,epoll_ctl,epoll_wait,accept4,read,write \
    java NioEchoServer 2>&1 | head -50
```

预期输出（Linux）：

```
epoll_create(256) = 5
epoll_ctl(5, EPOLL_CTL_ADD, 4, ...) = 0
epoll_wait(5, ..., 256, 1000) = 0
...
accept4(4, ..., SOCK_NONBLOCK) = 7
epoll_ctl(5, EPOLL_CTL_ADD, 7, ...) = 0
read(7, ..., 1024) = 12
write(7, ..., 18) = 18
```

### 5.12 示例 11：基于虚拟线程的 BIO Echo Server（JDK 21+）

```java
// file: VirtualThreadEchoServer.java
import java.io.*;
import java.net.*;

public class VirtualThreadEchoServer {
    public static void main(String[] args) throws IOException {
        try (ServerSocket server = new ServerSocket(8080)) {
            System.out.println("Virtual Thread Echo Server 监听 8080");
            while (true) {
                Socket client = server.accept();
                // 每个连接一个虚拟线程，开销极小
                Thread.startVirtualThread(() -> handle(client));
            }
        }
    }

    private static void handle(Socket client) {
        try (Socket s = client;
             BufferedReader in = new BufferedReader(
                 new InputStreamReader(s.getInputStream(), "UTF-8"));
             PrintWriter out = new PrintWriter(
                 new OutputStreamWriter(s.getOutputStream(), "UTF-8"), true)) {
            String line;
            while ((line = in.readLine()) != null) {
                out.println("ECHO: " + line);
                if ("bye".equalsIgnoreCase(line)) break;
            }
        } catch (IOException ignored) {}
    }
}
```

虚拟线程版本结合了 BIO 的简洁与 NIO 的高并发——单 JVM 可轻松处理数万并发连接。

---

## 6. 对比分析

### 6.1 总体对比表

| 特性 | Java BIO | Java NIO | Java AIO | C libuv | Go net | Rust tokio |
|------|---------|---------|---------|---------|--------|-----------|
| 引入版本 | JDK 1.0 | JDK 1.4 | JDK 7 | Node.js 0.x | Go 1.0 | Tokio 0.1 |
| 数据抽象 | 流（Stream） | Buffer + Channel | Buffer + AsyncChannel | uv_buf_t | []byte | Bytes |
| 阻塞语义 | 阻塞 | 可选 | 异步 | 异步 | 阻塞/异步混用 | 异步 |
| 多路复用 | 无 | Selector | CompletionHandler | uv_loop_t | runtime poller | mio |
| 编程模型 | Thread-per-Conn | Reactor | Proactor | Event Loop | Goroutine | Future/async |
| 平台一致性 | 一致 | 一致 | 不一致（Linux 模拟） | 一致 | 一致 | 一致 |
| 零拷贝 | 不支持 | transferTo/mmap | 支持 | 支持 | 支持 | 支持 |

### 6.2 Java NIO vs Go net

Go 的 `net` 包采用"同步语义 + 异步实现"的设计：API 看起来是阻塞的（`conn.Read(buf)` 会阻塞当前 goroutine），但 Go runtime 在底层将 fd 设为非阻塞，并使用 netpoller（Linux 下是 epoll）监控 fd 就绪。当 fd 未就绪时，runtime 将当前 goroutine 挂起，让出 P 给其他 goroutine 运行。

```go
// Go 代码
ln, _ := net.Listen("tcp", ":8080")
for {
    conn, _ := ln.Accept()
    go func(c net.Conn) {
        buf := make([]byte, 1024)
        c.Read(buf)
        c.Write(buf)
        c.Close()
    }(conn)
}
```

对比 Java NIO：
- Go 的 API 更简洁（看起来同步），Java NIO 需要显式管理 `Selector` 与状态机。
- Java NIO 提供更细粒度控制（如 `SelectionKey` 兴趣集）。
- Go 的 goroutine 切换开销（~100ns）远小于 Java 平台线程（~1µs），但与虚拟线程（~100ns）相当。
- Go 的 netpoller 是 runtime 内置的，Java 需要借助 Netty 等框架。

### 6.3 Java NIO vs Rust tokio + mio

Rust 的 tokio 是基于 mio（Linux epoll / BSD kqueue）的异步运行时：

```rust
// Rust 代码
async fn echo_server() -> io::Result<()> {
    let listener = TcpListener::bind("127.0.0.1:8080").await?;
    loop {
        let (mut socket, _) = listener.accept().await?;
        tokio::spawn(async move {
            let mut buf = [0; 1024];
            loop {
                let n = socket.read(&mut buf).await.unwrap();
                if n == 0 { return; }
                socket.write_all(&buf[..n]).await.unwrap();
            }
        });
    }
}
```

对比：
- Rust 的零成本抽象使异步代码与手写状态机性能相当。
- Java NIO 受 GC 与字节码解释/JIT 影响峰值性能略低，但 JIT 优化后差距 <10%。
- Rust 的 `async/await` 语法比 Java 的回调式 AIO 更易读。
- Java 的 `CompletableFuture` + 虚拟线程（JDK 21）在异步编程体验上已接近 Rust。

### 6.4 Java NIO vs libuv (Node.js)

libuv 是 Node.js 的底层 I/O 引擎，跨平台事件循环：

```javascript
// Node.js 代码
const net = require('net');
const server = net.createServer((socket) => {
  socket.on('data', (data) => socket.write(data));
  socket.on('end', () => socket.end());
});
server.listen(8080);
```

对比：
- libuv 在 Windows 用 IOCP，Linux 用 epoll，macOS 用 kqueue——跨平台一致性优于 Java AIO（Java AIO 在 Linux 下是 epoll 模拟）。
- Node.js 单线程事件循环适合 I/O 密集型，CPU 密集型需用 worker_threads。
- Java NIO 可以配合线程池处理 CPU 密集型任务，灵活性更高。
- 性能：Java NIO + Netty 在大多数基准测试中略优于 Node.js（V8 与 JVM JIT 优化差距小，但 JVM 的 GC pause 是劣势）。

### 6.5 Java NIO vs Java AIO

| 维度 | NIO | AIO |
|------|-----|-----|
| Linux 实现 | epoll | epoll 模拟（非真异步） |
| Windows 实现 | select | IOCP（真异步） |
| macOS 实现 | kqueue | kqueue 模拟 |
| 编程模型 | 主动 select + 回调 | 注册 CompletionHandler |
| 复杂度 | 中（需管理 Selector） | 高（回调嵌套） |
| 适用场景 | 通用网络编程 | Windows 平台、文件 I/O |
| Netty 支持 | 主流 | 已弃用 |

Netty 在 Netty 4 移除了 AIO 支持，原因是 Linux 下 AIO 与 NIO 性能相当，但 AIO API 复杂度更高。这是 Java I/O 生态的重要决策——业界共识是 NIO + Reactor 模式足够强大。

---

## 7. 常见陷阱与反模式

### 7.1 反模式 1：忽略字节流与字符流的区别

```java
// 反模式：用字节流读取中文文本，可能乱码
try (FileInputStream fis = new FileInputStream("中文.txt")) {
    byte[] buf = new byte[1024];
    int n = fis.read(buf);
    String s = new String(buf, 0, n); // 默认平台编码，可能不是 UTF-8
}

// 正确：明确指定字符编码
try (InputStreamReader isr = new InputStreamReader(
        new FileInputStream("中文.txt"), StandardCharsets.UTF_8);
     BufferedReader br = new BufferedReader(isr)) {
    String line = br.readLine();
}
```

### 7.2 反模式 2：BIO 服务器无连接数限制

```java
// 反模式：每个连接创建一个线程，1 万连接耗尽内存
while (true) {
    Socket client = server.accept();
    new Thread(() -> handle(client)).start(); // 线程数无上限
}

// 正确：使用固定大小线程池 + 队列
ExecutorService pool = Executors.newFixedThreadPool(200);
while (true) {
    Socket client = server.accept();
    pool.submit(() -> handle(client));
}
```

### 7.3 反模式 3：NIO 中忘记 `flip()` 或 `clear()`

```java
// 反模式：Buffer 状态错误
ByteBuffer buf = ByteBuffer.allocate(1024);
channel.read(buf);
// 忘记 flip，buf.position = n, limit = 1024，写入 channel 会写出 1024 字节
channel.write(buf);

// 正确：读后写要 flip
channel.read(buf);
buf.flip();
channel.write(buf);
buf.clear(); // 重置为写模式
```

### 7.4 反模式 4：Selector 空轮询 bug

JDK 7 前，Linux 下 NIO Selector 存在 epoll bug：`epoll_wait` 错误返回 0 但不阻塞，导致 CPU 100%。Netty 通过"重建 Selector"绕过此 bug。

```java
// Netty 源码片段
if (selectedKeys != 0 && oldWakenUp) {
    // 正常
} else if (selectedKeys == 0) {
    // 可能是 bug，重建 Selector
    rebuildSelector();
}
```

### 7.5 反模式 5：忘记关闭 Channel

```java
// 反模式：Channel 不关闭，导致 fd 泄漏
SocketChannel client = SocketChannel.open(new InetSocketAddress("localhost", 8080));
// ... 使用后忘记关闭
// 最终 fd 耗尽，抛出 Too many open files

// 正确：try-with-resources
try (SocketChannel client = SocketChannel.open(
        new InetSocketAddress("localhost", 8080))) {
    // ...
}
```

### 7.6 反模式 6：DirectByteBuffer 滥用

```java
// 反模式：小块数据用 DirectByteBuffer，分配开销大
ByteBuffer buf = ByteBuffer.allocateDirect(64); // 64 字节用 Direct 浪费

// 正确：小块用 Heap，大块用 Direct
ByteBuffer small = ByteBuffer.allocate(64);
ByteBuffer large = ByteBuffer.allocateDirect(64 * 1024);
```

### 7.7 反模式 7：误用 `read()` 返回值

```java
// 反模式：假设 read 一定读满
byte[] buf = new byte[1024];
int n = in.read(buf);
String s = new String(buf); // 用了 1024 字节，实际可能只读了 100

// 正确：用实际读取的字节数
String s = new String(buf, 0, n);
```

### 7.8 反模式 8：BufferedReader 读二进制

```java
// 反模式：BufferedReader 处理二进制文件，会破坏字节
try (BufferedReader br = new BufferedReader(
        new FileReader("image.jpg"))) {
    int c;
    while ((c = br.read()) != -1) { ... }
}

// 正确：二进制用 InputStream
try (InputStream is = new FileInputStream("image.jpg")) {
    byte[] buf = new byte[8192];
    int n;
    while ((n = is.read(buf)) != -1) { ... }
}
```

### 7.9 反模式 9：在 ET 模式下未读完数据

NIO Selector 默认是 ET 模式，fd 就绪通知一次后必须一次读完所有数据，否则会"丢失"事件。

```java
// 反模式：ET 模式只读一次
if (key.isReadable()) {
    ByteBuffer buf = ByteBuffer.allocate(1024);
    client.read(buf); // 只读 1024 字节，剩余数据丢失
}

// 正确：循环读到返回 0 或 EAGAIN
if (key.isReadable()) {
    ByteBuffer buf = ByteBuffer.allocate(1024);
    int n;
    while ((n = client.read(buf)) > 0) {
        buf.clear();
    }
    if (n == -1) client.close();
}
```

### 7.10 反模式 10：忽视字符集 BOM

UTF-8 文件可能带 BOM（Byte Order Mark，`\uFEFF`），直接用 `BufferedReader` 读取会保留 BOM 字符。

```java
// 反模式：BOM 出现在字符串开头
String s = Files.readString(Path.of("with-bom.txt"));
System.out.println(s.startsWith("\uFEFF")); // true

// 正确：使用 BOM 检测工具类或显式跳过
// Apache Commons IO 的 BOMInputStream 可处理
```

---

## 8. 工程实践与最佳实践

### 8.1 缓冲区大小选择

| 场景 | 推荐 Buffer 大小 | 理由 |
|------|----------------|------|
| 网络读取 | 4KB–16KB | 兼顾内存与 syscall 次数 |
| 文件复制 | 64KB–256KB | 接近 DMA 传输单元 |
| 大文件传输 | 1MB+ 或 Direct | 减少 syscall 次数 |
| HTTP 响应 | 8KB | 接近 TCP MSS 的整数倍 |

### 8.2 文件 I/O 最佳实践

```java
// 1. 小文件读取：Files.readString 简洁
String content = Files.readString(Path.of("config.json"));

// 2. 大文件按行读取：Files.lines 惰性流
try (Stream<String> lines = Files.lines(Path.of("huge.log"))) {
    lines.filter(l -> l.contains("ERROR"))
         .limit(100)
         .forEach(System.out::println);
}

// 3. 二进制文件：Files.readAllBytes
byte[] data = Files.readAllBytes(Path.of("image.png"));

// 4. 大文件复制：transferTo 零拷贝
try (var in = FileChannel.open(src, READ);
     var out = FileChannel.open(dst, CREATE, WRITE)) {
    in.transferTo(0, in.size(), out);
}
```

### 8.3 网络编程最佳实践

1. **服务端**：优先使用 Netty / Vert.x 等成熟框架，避免手写 Selector。
2. **客户端**：HTTP 用 `java.net.http.HttpClient`（JDK 11+）或 OkHttp。
3. **超时**：连接超时、读超时、写超时必须显式设置。
4. **背压**：异步框架需处理背压，避免 OOM。
5. **TLS**：使用 `SSLEngine` 或框架封装，注意协议版本（TLS 1.3 优先）。

### 8.4 Reactor 模式实现

```java
public class SimpleReactor implements Runnable {
    private final Selector selector;
    private final ServerSocketChannel server;

    public SimpleReactor(int port) throws IOException {
        selector = Selector.open();
        server = ServerSocketChannel.open();
        server.bind(new InetSocketAddress(port));
        server.configureBlocking(false);
        server.register(selector, SelectionKey.OP_ACCEPT);
    }

    public void run() {
        try {
            while (!Thread.interrupted()) {
                selector.select();
                Iterator<SelectionKey> it = selector.selectedKeys().iterator();
                while (it.hasNext()) {
                    SelectionKey key = it.next();
                    it.remove();
                    dispatch(key);
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private void dispatch(SelectionKey key) {
        // ... 调用对应 handler
    }
}
```

### 8.5 主从 Reactor 模式（Netty 模型）

```java
public class MainSubReactor {
    public static void main(String[] args) throws IOException {
        // 主 Reactor：处理 Accept
        Selector mainSelector = Selector.open();
        ServerSocketChannel server = ServerSocketChannel.open();
        server.bind(new InetSocketAddress(8080));
        server.configureBlocking(false);
        server.register(mainSelector, SelectionKey.OP_ACCEPT);

        // 从 Reactor 线程池：处理 Read/Write
        Selector[] subSelectors = new Selector[4];
        for (int i = 0; i < 4; i++) {
            subSelectors[i] = Selector.open();
            new Thread(new SubReactor(subSelectors[i])).start();
        }

        // 主 Reactor 接受连接后，分发给从 Reactor
        int idx = 0;
        while (true) {
            mainSelector.select();
            SocketChannel client = server.accept();
            client.configureBlocking(false);
            client.register(subSelectors[idx++ % 4], SelectionKey.OP_READ);
        }
    }
}
```

### 8.6 性能监控与诊断

```bash
# 查看 fd 使用情况
lsof -p <pid> | wc -l
cat /proc/<pid>/limits | grep "open files"

# 查看网络连接状态
ss -s
netstat -an | awk '/tcp/ {print $6}' | sort | uniq -c

# 使用 strace 跟踪系统调用
strace -p <pid> -f -e trace=epoll_wait,read,write

# 使用 perf 分析热点
perf top -p <pid>

# jstack 查看线程栈
jstack <pid> | grep -A 20 "epollWait"
```

---

## 9. 案例研究

### 9.1 案例研究 1：Netty 的 NIO 实现

Netty 是 Java NIO 的工业级封装。其核心架构：

```
EventLoopGroup (boss) ──→ accept
    │
    ▼
EventLoopGroup (worker)
    │
    ├── EventLoop-1 (Selector + Thread)
    │     └── Channel A, B, C
    ├── EventLoop-2 (Selector + Thread)
    │     └── Channel D, E, F
    └── ...
```

`NioEventLoop` 的核心 select 循环：

```java
// Netty 源码简化版
protected void run() {
    for (;;) {
        long deadline = nextScheduledTask();
        int selectedKeys = selector.select(deadline);
        if (selectedKeys != 0) {
            processSelectedKeys();
        }
        runAllTasks();
    }
}
```

Netty 的优化策略：
1. **优化 Selector**：替换 `selectedKeys` 为 `HashSet`，避免数组遍历。
2. **空轮询保护**：检测 epoll bug，重建 Selector。
3. **ioRatio**：控制 I/O 与任务执行时间比例（默认 50:50）。
4. **ByteBuf 池化**：`PooledByteBufAllocator` 复用 DirectByteBuffer。

### 9.2 案例研究 2：Kafka 的零拷贝传输

Kafka 用 `FileChannel.transferTo` 实现零拷贝：

```java
// Kafka 源码简化版
public class FileRecords {
    public long writeTo(GatheringByteChannel channel, long position, int length) throws IOException {
        FileChannel fileChannel = fileRecords.channel();
        return fileChannel.transferTo(position, length, channel);
    }
}
```

Kafka 还使用 `sendfile` 直接将日志段从磁盘发送到网卡，无需进入用户空间。这是 Kafka 高吞吐的核心原因之一。

### 9.3 案例研究 3：Tomcat 的 NioEndpoint

Tomcat 的 NIO Connector 使用主从 Reactor：

```java
// Tomcat 源码简化版
public class NioEndpoint {
    private Poller[] pollers; // 从 Reactor
    private Acceptor acceptor; // 主 Reactor

    public void start() {
        acceptor = new Acceptor();
        new Thread(acceptor).start();
        for (Poller p : pollers) new Thread(p).start();
    }

    class Acceptor implements Runnable {
        public void run() {
            while (running) {
                SocketChannel client = serverSock.accept();
                client.configureBlocking(false);
                Poller p = pollers[pollerIndex++ % pollers.length];
                p.register(client);
            }
        }
    }

    class Poller implements Runnable {
        Selector selector;
        public void run() {
            while (running) {
                selector.select();
                // 处理就绪事件
            }
        }
    }
}
```

### 9.4 案例研究 4：Redis 客户端 Lettuce 的 NIO

Lettuce 是基于 Netty 的 Redis 客户端：

```java
// Lettuce 源码简化版
public class LettuceClient {
    private EventLoopGroup eventLoopGroup;
    private Channel channel;

    public void connect(String host, int port) {
        Bootstrap b = new Bootstrap();
        b.group(eventLoopGroup)
         .channel(NioSocketChannel.class)
         .handler(new ChannelInitializer<SocketChannel>() {
             protected void initChannel(SocketChannel ch) {
                 ch.pipeline().addLast(new RedisEncoder(), new RedisDecoder(),
                     new CommandHandler());
             }
         });
        channel = b.connect(host, port).sync().channel();
    }
}
```

### 9.5 案例研究 5：Elasticsearch 的 Lucene 段文件

Lucene 使用 NIO 读写倒排索引段文件：

```java
// Lucene 源码简化版
public class MMapDirectory extends FSDirectory {
    public IndexInput openInput(String name) throws IOException {
        FileChannel fc = FileChannel.open(path, READ);
        MappedByteBuffer mbuf = fc.map(MapMode.READ_ONLY, 0, fc.size());
        return new MMapIndexInput(mbuf);
    }
}
```

`mmap` 让 Lucene 能像访问内存一样访问索引文件，避免 `read` syscall 开销。

### 9.6 案例研究 6：Cassandra 的零拷贝 SSTable 传输

Cassandra 使用 `FileChannel.transferTo` 在节点间传输 SSTable：

```java
// Cassandra 源码简化版
public class StreamSession {
    public void stream(File sstable) throws IOException {
        try (FileChannel fc = FileChannel.open(sstable.toPath(), READ);
             SocketChannel sc = SocketChannel.open(remoteAddr)) {
            fc.transferTo(0, fc.size(), sc);
        }
    }
}
```

### 9.7 案例研究 7：Hadoop HDFS 的数据节点

HDFS DataNode 用 NIO 与客户端传输块数据：

```java
// Hadoop 源码简化版
public class DataXceiver {
    public void readBlock(OutputStream out) throws IOException {
        try (FileInputStream fis = new FileInputStream(blockFile);
             FileChannel fc = fis.getChannel()) {
            // 使用零拷贝
            fc.transferTo(0, fc.size(), 
                Channels.newChannel(out));
        }
    }
}
```

### 9.8 案例研究 8：Nginx 与 OpenResty 的零拷贝

虽然 Nginx 是 C 实现，但其零拷贝思路与 Java NIO 一致：

```c
// Nginx 简化
ssize_t sendfile(int out_fd, int in_fd, off_t *offset, size_t count);
```

OpenResty 通过 Lua 调用 Nginx 的零拷贝 API，常用于静态文件加速。

### 9.9 案例研究 9：Spring WebFlux 的 Netty 集成

Spring WebFlux 默认使用 Netty 作为 HTTP 服务器：

```java
// WebFlux 配置
@Bean
public NettyReactiveWebServerFactory serverFactory() {
    NettyReactiveWebServerFactory factory = new NettyReactiveWebServerFactory();
    factory.addServerCustomizers(builder -> {
        // 配置 EventLoop
        builder.runOn(LoopResources.create("http", 4, 16, true));
        return builder;
    });
    return factory;
}
```

---

## 10. 习题与思考题

### 10.1 基础题

**习题 1**：解释 `Buffer.flip()` 与 `Buffer.rewind()` 的区别。

**参考答案**：
- `flip()`：limit 设为当前 position，position 设为 0。用于读模式切换。
- `rewind()`：position 设为 0，limit 不变。用于重新读已读过的数据。

**习题 2**：为什么 `Selector.select()` 必须搭配非阻塞 Channel？

**参考答案**：`select()` 监控多个 fd 的就绪状态。若 Channel 是阻塞的，`read` 会阻塞当前线程，违反"单线程处理多连接"的设计。

### 10.2 应用题

**习题 3**：实现一个 NIO 文件复制方法，要求支持 1GB 以上大文件。

**参考答案**：

```java
public static void copyLarge(Path src, Path dst) throws IOException {
    try (FileChannel in = FileChannel.open(src, StandardOpenOption.READ);
         FileChannel out = FileChannel.open(dst, StandardOpenOption.CREATE,
             StandardOpenOption.WRITE)) {
        long size = in.size();
        long transferred = 0;
        while (transferred < size) {
            transferred += in.transferTo(transferred, size - transferred, out);
        }
    }
}
```

**习题 4**：实现一个基于 Selector 的端口扫描器，扫描 1–1024 端口。

**参考答案**：

```java
public static List<Integer> scan(String host) throws IOException {
    List<Integer> open = new ArrayList<>();
    Selector selector = Selector.open();
    for (int port = 1; port <= 1024; port++) {
        try {
            SocketChannel ch = SocketChannel.open();
            ch.configureBlocking(false);
            ch.connect(new InetSocketAddress(host, port));
            ch.register(selector, SelectionKey.OP_CONNECT, port);
        } catch (IOException ignored) {}
    }
    while (selector.keys().stream().anyMatch(k -> k.isValid())) {
        selector.select(1000);
        Iterator<SelectionKey> it = selector.selectedKeys().iterator();
        while (it.hasNext()) {
            SelectionKey key = it.next();
            it.remove();
            if (key.isConnectable()) {
                SocketChannel ch = (SocketChannel) key.channel();
                int port = (int) key.attachment();
                try {
                    if (ch.finishConnect()) {
                        open.add(port);
                        ch.close();
                    }
                } catch (IOException e) {
                    ch.close();
                }
            }
        }
    }
    return open;
}
```

### 10.3 分析题

**习题 5**：分析以下代码为何会丢失数据，并修复。

```java
ByteBuffer buf = ByteBuffer.allocate(1024);
socketChannel.read(buf);
socketChannel.write(buf); // 可能写入空数据
```

**参考答案**：缺少 `flip()`。`read` 后 position 在末尾，`write` 会从 position 写到 limit，但 limit 仍为 1024，写入空数据。修复：

```java
ByteBuffer buf = ByteBuffer.allocate(1024);
socketChannel.read(buf);
buf.flip();
socketChannel.write(buf);
```

**习题 6**：为什么 Netty 在 Linux 下选择 NIO 而非 AIO？

**参考答案**：
1. Linux AIO 是 epoll 模拟，性能与 NIO 相当。
2. AIO API 回调嵌套复杂，编程体验差。
3. NIO 生态成熟，框架支持完善。
4. Windows AIO 用 IOCP，但 Java 服务器主流是 Linux。

### 10.4 评价题

**习题 7**：评价"JDK 21 虚拟线程发布后，NIO Selector 模式将被淘汰"这一观点。

**参考答案**：
部分正确但不完全：
- 虚拟线程让 BIO 模式可处理高并发，简化编程模型。
- 但 NIO Selector 在以下场景仍有优势：
  - 极高并发（百万连接），虚拟线程的内存开销仍可观。
  - 需要精细控制 I/O 事件（如自定义协议解析状态机）。
  - 已有 NIO 框架生态（Netty）成熟稳定。
- 实际趋势：BIO + 虚拟线程适合大多数业务场景；NIO 适合高性能中间件。

### 10.5 创造题

**习题 8**：设计一个基于 NIO 的简易 HTTP 服务器，支持 GET 请求返回静态文件。

**参考答案**：参考示例 5.6 的 NioEchoServer，扩展协议解析与文件响应逻辑。

**习题 9**：设计一个零拷贝日志收集系统，从多个节点收集日志并发送到中央节点。

**参考答案**：客户端使用 `FileChannel.transferTo` 直接将日志文件通过 socket 发送；服务端使用 `FileChannel.transferFrom` 接收并写入磁盘。

---

## 11. 参考文献

采用 ACM Reference Format：

[1] Gosling, J., Joy, B., Steele, G., Bracha, G., and Buckley, A. 2018. *The Java Language Specification, Java SE 10 Edition*. Addison-Wesley Professional.

[2] Lindholm, T., Yellin, F., Bracha, G., and Buckley, A. 2018. *The Java Virtual Machine Specification, Java SE 10 Edition*. Addison-Wesley Professional.

[3] Schmidt, D. C., Stal, M., Rohnert, H., and Buschmann, F. 2000. *Pattern-Oriented Software Architecture, Volume 2: Patterns for Concurrent and Networked Objects*. Wiley.

[4] Stevens, W. R., Fenner, B., and Rudoff, A. M. 2003. *UNIX Network Programming, Volume 1: The Sockets Networking API* (3rd ed.). Addison-Wesley.

[5] Becker, J. 2002. JSR 51: New I/O APIs for the Java Platform. Sun Microsystems.

[6] Watson, R. N. M. 2018. *The Design and Implementation of the FreeBSD Operating System* (2nd ed.). Addison-Wesley.

[7] Bovet, D. P., and Cesati, M. 2005. *Understanding the Linux Kernel* (3rd ed.). O'Reilly Media.

[8] Appel, A. W., and MacQueen, D. B. 1991. Standard ML of New Jersey. In *Proceedings of the 1991 International Workshop on ML*.

[9] Paxson, V., and Floyd, S. 1997. Wide area traffic: The failure of Poisson modeling. *IEEE/ACM Transactions on Networking* 3, 3 (June 1995), 226–244.

[10] Welch, I., and McNamara, J. 2018. *Java NIO: High Performance I/O for the Java Platform*. O'Reilly Media.

[11] Eder, M. 2018. *Netty in Action*. Manning Publications.

[12] Korhonen, J., and Wang, Y. 2013. Effect of suboptimal TCP buffer size on throughput. In *Proceedings of the 2013 IEEE International Conference on Communications (ICC)*, 2487–2492.

[13] Axboe, J. 2019. *io_uring: Linux asynchronous I/O interface*. Linux Kernel documentation. https://kernel.dk/io_uring.pdf

[14] Oracle Corporation. 2021. *Java NIO Tutorial*. https://docs.oracle.com/javase/tutorial/essential/io/

[15] Free Software Foundation. 2023. *The GNU C Library Reference Manual*. https://www.gnu.org/software/libc/manual/

---

## 12. 延伸阅读

### 12.1 官方资源

- **Java NIO Tutorial**（Oracle）：https://docs.oracle.com/javase/tutorial/essential/io/
- **JEP 51: New I/O APIs**：https://openjdk.org/jeps/51
- **JEP 203: NIO.2 File Tree API**：https://openjdk.org/jeps/203
- **Linux man pages**：`man 2 epoll`, `man 2 select`, `man 2 sendfile`, `man 2 mmap`

### 12.2 进阶书籍

- *UNIX Network Programming*（W. Richard Stevens）：socket 编程圣经。
- *Java NIO*（Ron Hitchens, 2002）：基于 JDK 1.4，概念清晰。
- *Netty in Action*（Norman Maurer, 2015）：Netty 框架权威指南。
- *Understanding the Linux Kernel*（Bovet & Cesati）：内核 I/O 子系统深度解析。
- *The Linux Programming Interface*（Michael Kerrisk）：系统调用百科全书。

### 12.3 开源项目源码

- **Netty**：`io.netty.channel.nio.NioEventLoop`、`io.netty.channel.socket.nio.NioSocketChannel`
- **Tomcat**：`org.apache.coyote.http11.Http11NioProtocol`、`org.apache.tomcat.util.net.NioEndpoint`
- **Kafka**：`org.apache.kafka.common.network.Selector`、`org.apache.kafka.common.utils.Utils.transferBytes`
- **Cassandra**：`org.apache.cassandra.io.util.FileUtils`
- **Hadoop**：`org.apache.hadoop.hdfs.server.datanode.DataXceiver`
- **Lettuce**（Redis 客户端）：`io.lettuce.core.RedisChannelHandler`

### 12.4 学术论文

- Schmidt, D. C. 1995. *Reactor: An Object Behavioral Pattern for Concurrent Event Demultiplexing and Dispatching*. Washington University.
- Banga, G., Druschel, P., and Mogul, J. C. 1998. Better operating system features for faster network servers. *ACM SIGMETRICS Performance Evaluation Review* 26, 3, 23–30.
- Behren, R. von, Condit, J., and Brewer, E. 2003. Why events are a bad idea (for high-concurrency servers). In *Proceedings of the 9th Workshop on Hot Topics in Operating Systems (HotOS IX)*.

### 12.5 演进趋势

1. **io_uring 集成**：JDK 未来版本可能通过 FFM API 集成 `io_uring`，提供真异步 I/O。
2. **虚拟线程**：JDK 21 虚拟线程让 BIO 模式重新可用，简化高并发编程。
3. **Foreign Memory Access API**：替代 `DirectByteBuffer`，提供更安全的原生内存访问。
4. **Vector API**（JEP 339）：与 I/O 结合，实现 SIMD 加速的数据处理。
5. **TLS 1.3**：JDK 11+ 支持，性能优于 TLS 1.2。

---

## 附录 A：I/O API 速查表

### A.1 `java.io` 主要类

| 类 | 描述 |
|----|------|
| `InputStream` | 字节输入流抽象基类 |
| `OutputStream` | 字节输出流抽象基类 |
| `FileInputStream` | 文件字节输入流 |
| `FileOutputStream` | 文件字节输出流 |
| `BufferedInputStream` | 缓冲字节输入流 |
| `BufferedOutputStream` | 缓冲字节输出流 |
| `Reader` | 字符输入流抽象基类 |
| `Writer` | 字符输出流抽象基类 |
| `InputStreamReader` | 字节流 → 字符流桥接 |
| `OutputStreamWriter` | 字符流 → 字节流桥接 |
| `FileReader` | 文件字符输入流（默认编码） |
| `FileWriter` | 文件字符输出流（默认编码） |
| `BufferedReader` | 缓冲字符输入流，支持 `readLine()` |
| `BufferedWriter` | 缓冲字符输出流 |
| `PrintWriter` | 格式化字符输出流 |
| `ObjectInputStream` | 对象反序列化 |
| `ObjectOutputStream` | 对象序列化 |
| `RandomAccessFile` | 随机访问文件（独立于流体系） |
| `PipedInputStream` / `PipedOutputStream` | 管道流（线程间通信） |

### A.2 `java.nio` 主要类

| 类 | 描述 |
|----|------|
| `ByteBuffer` | 字节缓冲区 |
| `CharBuffer` | 字符缓冲区 |
| `IntBuffer` / `LongBuffer` / `DoubleBuffer` | 基本类型缓冲区 |
| `MappedByteBuffer` | 内存映射文件缓冲区 |
| `DirectByteBuffer` | 堆外内存缓冲区（内部 API） |
| `Channel` | 通道接口 |
| `FileChannel` | 文件通道 |
| `SocketChannel` | TCP 客户端通道 |
| `ServerSocketChannel` | TCP 服务端通道 |
| `DatagramChannel` | UDP 通道 |
| `Selector` | 多路复用器 |
| `SelectionKey` | 通道注册到 Selector 的令牌 |
| `Charset` | 字符编码 |
| `CharsetEncoder` / `CharsetDecoder` | 编码器/解码器 |
| `Paths` / `Path` / `Files` | NIO.2 文件 API |

### A.3 `java.nio.channels` 主要类（AIO）

| 类 | 描述 |
|----|------|
| `AsynchronousChannel` | 异步通道接口 |
| `AsynchronousFileChannel` | 异步文件通道 |
| `AsynchronousSocketChannel` | 异步 TCP 客户端 |
| `AsynchronousServerSocketChannel` | 异步 TCP 服务端 |
| `CompletionHandler` | 异步操作完成回调 |

---

## 附录 B：常见异常类

| 异常 | 触发场景 | 处理建议 |
|------|---------|---------|
| `IOException` | I/O 操作失败 | 检查文件存在、权限、网络连通 |
| `FileNotFoundException` | 文件不存在 | 创建文件或检查路径 |
| `EOFException` | 读到流末尾仍调用 read | 检查读取循环条件 |
| `SocketTimeoutException` | socket 超时 | 调整超时时间或重试 |
| `ClosedChannelException` | 通道已关闭仍操作 | 检查 try-with-resources |
| `CharacterCodingException` | 字符编码错误 | 检查输入字节是否符合编码规范 |
| `BufferOverflowException` | Buffer 已满仍 put | 调用 `clear()` 或增大 capacity |
| `BufferUnderflowException` | Buffer 已空仍 get | 调用 `flip()` 或检查 `hasRemaining()` |
| `CancelledKeyException` | SelectionKey 已取消仍使用 | 检查 `key.isValid()` |

---

## 附录 C：操作系统 I/O 模型对照表

| OS | 多路复用 | 异步 I/O | 文件事件 | 网络事件 |
|----|---------|---------|---------|---------|
| Linux | `select`、`poll`、`epoll` | `io_uring`（5.1+）、libaio（仅文件） | inotify | epoll |
| FreeBSD / macOS | `select`、`poll`、`kqueue` | kqueue（半异步） | fsevents | kqueue |
| Windows | `select`（受限） | IOCP | ReadDirectoryChangesW | IOCP |
| Solaris | `select`、`poll`、`/dev/poll`、event ports | event ports | - | event ports |

---

## 附录 D：术语对照表

| 中文 | 英文 | 缩写 | 含义 |
|------|------|------|------|
| 阻塞 I/O | Blocking I/O | BIO | read/write 阻塞调用线程 |
| 非阻塞 I/O | Non-blocking I/O | NIO | read/write 立即返回 |
| 异步 I/O | Asynchronous I/O | AIO | 完成后回调通知 |
| 多路复用 | Multiplexing | - | 单线程监控多 fd |
| 文件描述符 | File Descriptor | fd | 进程级 fd 表索引 |
| 通道 | Channel | - | NIO 双向数据流抽象 |
| 缓冲区 | Buffer | - | NIO 内存容器 |
| 选择器 | Selector | - | NIO 多路复用器 |
| 零拷贝 | Zero Copy | - | 减少数据拷贝次数 |
| 内存映射 | Memory Map | mmap | 文件映射到用户空间 |
| 水平触发 | Level Triggered | LT | 就绪态持续通知 |
| 边沿触发 | Edge Triggered | ET | 状态变化时通知一次 |
| 反应堆模式 | Reactor Pattern | - | 同步事件分发模式 |
| 前摄器模式 | Proactor Pattern | - | 异步事件分发模式 |
| 字节顺序 | Byte Order | - | 大端/小端 |

---

## 附录 E：本文档结构概览

本篇文档严格遵循 12 项金标准教学结构：

1. **学习目标**（Bloom 分类法）：第 1 节
2. **历史动机与演化**：第 2 节
3. **形式化定义**（含 KaTeX 公式）：第 3 节
4. **理论推导**（操作系统层面）：第 4 节
5. **代码示例**（可运行 Java 代码）：第 5 节
6. **对比分析**（Java NIO vs Go/Rust/libuv/AIO）：第 6 节
7. **常见陷阱与反模式**：第 7 节
8. **工程实践与最佳实践**：第 8 节
9. **案例研究**（Netty/Kafka/Tomcat/Lettuce/Elasticsearch/Cassandra/Hadoop）：第 9 节
10. **习题与思考题**（含参考答案）：第 10 节
11. **参考文献**（ACM Reference Format）：第 11 节
12. **延伸阅读**：第 12 节

---

> **结语**：Java I/O 的演化史，是一部计算机系统演化的缩影——从同步阻塞到多路复用，从内核优化到语言层抽象。理解 BIO、NIO、AIO 的差异，掌握零拷贝与 Reactor 模式，是成为高性能 Java 工程师的必经之路。在虚拟线程时代，BIO 的简洁性与 NIO 的高性能并非二选一，而是各擅胜场——选对工具，方能游刃有余。

