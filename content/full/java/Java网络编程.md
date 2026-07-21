---
order: 67
title: Java网络编程
module: java
category: Java
difficulty: intermediate
description: Socket与HTTP客户端
author: fanquanpp
updated: '2026-07-21'
related:
  - java/Java设计模式
  - java/Java函数式编程
  - java/Java日志系统
  - java/Java单元测试
  - java/JavaIO与NIO
prerequisites:
  - java/概述与开发环境
  - java/JavaIO与NIO
  - java/并发编程基础
tags:
  - java
  - network
  - socket
  - http
  - netty
---

# Java 网络编程

> 本文系统阐述 Java 网络编程的理论基础、API 演进、工程实践与生产级案例。从 BSD Socket 的历史源流出发，经过 `java.net` 阻塞 IO 模型，到 NIO 多路复用、Netty 事件驱动架构，再到现代 HTTP/2、HTTP/3 与虚拟线程（Project Loom）下的网络编程新范式，覆盖协议、模型、源码、陷阱与性能调优全链路。

## 1. 学习目标

本节按 Bloom 认知层级（Anderson & Krathwohl, 2001）组织学习目标，读者可逐层自检掌握程度。

### 1.1 记忆层（Remember）

- 复述 OSI 七层模型与 TCP/IP 四层模型的对应关系，列出各层典型协议。
- 列举 `java.net` 与 `java.nio.channels` 中至少 8 个核心类与接口。
- 描述 TCP 三次握手与四次挥手的报文序列号变化过程。

### 1.2 理解层（Understand）

- 解释阻塞 IO（BIO）、非阻塞 IO（NIO）、IO 多路复用（IO Multiplexing）、异步 IO（AIO）的语义差异。
- 用自己的语言说明 `Selector`、`SelectionKey`、`Channel` 三者协作机制。
- 阐述 Nagle 算法与延迟确认（Delayed ACK）的交互作用及其对延迟的影响。

### 1.3 应用层（Apply）

- 使用 `Socket` / `ServerSocket` 实现一个支持并发的回声（Echo）服务器。
- 基于 `Selector` 实现一个可同时处理 10000 连接的 HTTP 长连接服务。
- 使用 `java.net.http.HttpClient`（JDK 11+）发起 HTTP/2 请求并处理响应流。

### 1.4 分析层（Analyze）

- 对比 Reactor 与 Proactor 模式的本质差异，指出 Java NIO 属于哪一类。
- 分析 `Epoll` 边沿触发（ET）与水平触发（LT）的语义区别及其在 JVM 层的映射。
- 拆解 Netty 的 `EventLoop` 模型，指出 boss group 与 worker group 的职责边界。

### 1.5 评价层（Evaluate）

- 评估在微服务场景下使用原生 NIO 还是 Netty 的取舍维度。
- 评判虚拟线程（Virtual Thread, JEP 444）对传统 Reactor 模式的颠覆性影响。
- 论证连接池大小与吞吐量的关系，识别"连接越多越好"的反模式。

### 1.6 创造层（Create）

- 设计一个支持百万长连接的 IM 推送系统架构，并给出关键参数选型。
- 实现一个简易的 RPC 框架，覆盖序列化、长连接、心跳、重连等关键机制。
- 构建一个可观测的网络中间件，集成 metrics、tracing 与 connection dump 能力。

## 2. 历史动机与背景

### 2.1 网络编程的史前时代

1969 年，ARPANET 的诞生标志着计算机网络从理论走向实践。当时不同厂商的主机使用各异的应用层协议，开发者必须为每种主机编写定制的通信代码。这一时期网络编程是高度耦合、平台特定的工程活动。

1983 年 1 月 1 日，ARPANET 全面切换到 TCP/IP 协议族，这一天被业界称为"Flag Day"。统一的协议栈为可移植网络编程奠定了基础，但 API 仍然因操作系统而异。

### 2.2 BSD Socket 的诞生

1983 年，加州大学伯克利分校在 4.2BSD 中发布了 Socket API，由 Bill Joy 与 Samuel Leffler 设计。Socket API 将网络通信抽象为类似文件 IO 的操作，提供 `socket()`、`bind()`、`listen()`、`accept()`、`connect()`、`send()`、`recv()` 七个核心系统调用。

BSD Socket 的伟大之处在于其**双重抽象**：

1. **协议无关性**：同一套 API 既可操作 TCP、UDP，也可操作 Unix Domain Socket、IPX 等。
2. **地址族无关性**：通过 `sockaddr` 结构体统一封装 IPv4、IPv6 等地址格式。

这一设计深刻影响了此后四十年的网络编程范式。POSIX 标准、Windows Winsock、Linux glibc 均沿用此模型。

### 2.3 Java 网络编程的演进

Java 自 1995 年诞生之初便内置网络能力，但其 API 演进经历了若干重要阶段：

| 时间 | 版本 | 里程碑 | 核心特性 |
|------|------|--------|----------|
| 1996 | JDK 1.0 | `java.net.Socket` / `ServerSocket` | 阻塞 IO，thread-per-connection 模型 |
| 2002 | J2SE 1.4 | NIO（JSR 51） | `Channel`、`Buffer`、`Selector` 多路复用 |
| 2007 | Java SE 6 | 增强 NIO | `java.io.Console`、轻量级 HTTP server |
| 2011 | Java SE 7 | NIO.2（JSR 203） | `AsynchronousChannel`、真正的 AIO |
| 2018 | Java SE 11 | `java.net.http.HttpClient` | 内置 HTTP/2、WebSocket 客户端 |
| 2023 | Java SE 21 | 虚拟线程（JEP 444） | 用同步风格编写高并发网络代码 |

### 2.4 为什么需要 NIO

早期 `java.net.Socket` 是阻塞的：当线程调用 `InputStream.read()` 时，若对端没有数据，线程会被挂起直到数据到达或连接关闭。这意味着一个服务器要服务 N 个并发客户端，就必须开启 N 个线程。

线程是昂贵的资源：

- 每个线程在 64 位 JVM 上默认占用约 1 MB 栈空间。
- 线程上下文切换在 Linux 上约需 1-10 微秒，与系统调用、缓存命中率相关。
- JVM 线程映射为操作系统线程，调度由内核完成，用户态无法干预。

当连接数上升到万级（如 IM、推送、行情订阅），`thread-per-connection` 模型崩溃。这是 NIO 出现的根本动机：**用少量线程服务大量连接**。

### 2.5 Netty 的崛起

尽管 NIO 解决了伸缩性问题，但其 API 复杂、易用性差。开发者需要处理半包、粘包、断线重连、心跳、序列化、线程模型等大量样板代码。一个常见的误用是直接在 Selector 线程中执行业务逻辑，导致整个服务无响应。

2008 年，Trustin Lee 基于 NIO 创建了 Netty（前身为 JBoss Netty、Netty3）。Netty 在 NIO 之上构建了：

- **事件驱动模型**：将 IO 事件抽象为 `ChannelHandler` 链。
- **零拷贝**：通过 `CompositeByteBuf` 等减少内存复制。
- **内置编解码**：`LengthFieldBasedFrameDecoder`、`LineBasedFrameDecoder` 等解决半包问题。
- **池化 ByteBuf**：减少 GC 压力。

Netty 成为现代 Java 网络中间件的事实标准，被 Dubbo、gRPC-Java、Spring WebFlux、Spark、Cassandra 等项目采用。

### 2.6 虚拟线程的范式转变

JDK 21 正式发布虚拟线程（Project Loom）。虚拟线程是用户态调度的轻量级线程，创建成本接近普通对象，单 JVM 可承载数百万个。

虚拟线程的关键在于：**当调用阻塞 IO 时，JVM 自动将虚拟线程从载体线程（carrier thread）上卸下**，载体线程继续服务其他虚拟线程。这意味着开发者可以用同步阻塞风格（如 `socket.read()`）编写代码，但获得类似 Reactor 的伸缩性。

这是网络编程范式的重大转变：从"避免阻塞"回到"阻塞无所谓"，简化了心智模型。

## 3. 形式化定义

### 3.1 Socket 的代数语义

设 $\Sigma$ 为字节序集合 $\{0, 1, \dots, 255\}$，$\Sigma^*$ 为字节序列。一个 Socket 连接可形式化为五元组：

$$
\text{Conn} = (l_{addr}, l_{port}, r_{addr}, r_{port}, proto)
$$

其中 $l_{addr}, r_{addr} \in \text{IPv4} \cup \text{IPv6}$，$l_{port}, r_{port} \in [0, 65535] \cap \mathbb{Z}$，$proto \in \{TCP, UDP, SCTP, \ldots\}$。

Socket 的状态机可定义为：

$$
S: \{CLOSED, LISTEN, SYN\_SENT, SYN\_RECV, ESTABLISHED, FIN\_WAIT\_1, FIN\_WAIT\_2, CLOSE\_WAIT, CLOSING, LAST\_ACK, TIME\_WAIT\}
$$

状态转移函数 $\delta: S \times E \to S$，其中 $E$ 为事件集合（应用调用或网络报文）。

### 3.2 IO 模型的形式化

设 $I$ 为输入操作，$t_0$ 为发起时刻，$t_1$ 为完成时刻。$I$ 的总耗时为 $T = t_1 - t_0$，由两部分组成：

$$
T = T_{wait} + T_{copy}
$$

- $T_{wait}$：等待数据到达内核缓冲区的时间。
- $T_{copy}$：将数据从内核缓冲区复制到用户空间的时间。

阻塞 IO 满足：调用方在 $[t_0, t_1]$ 整个区间被挂起。

非阻塞 IO 满足：若数据未就绪，立即返回 $EAGAIN$；调用方需轮询。

IO 多路复用满足：调用方在 `select/poll/epoll_wait` 上阻塞，当任一 fd 就绪时被唤醒。

异步 IO 满足：调用方发起后立即返回，内核在 $t_1$ 时刻通过回调或信号通知完成。

### 3.3 吞吐量上界

设 RTT 为 $R$（秒），拥塞窗口为 $W$（字节），$MSS$ 为最大段长度。则 TCP 单连接吞吐量上界（忽略接收窗口限制）为：

$$
\text{Throughput}_{max} = \frac{W}{R}
$$

考虑 $N$ 个并发连接，理论总吞吐量为：

$$
\text{Throughput}_{total} = \sum_{i=1}^{N} \frac{W_i}{R_i}
$$

实际中受限于：

- 网卡带宽 $B$（如 10 Gbps）。
- CPU 处理能力 $P$（每秒可处理的包数）。
- 中断合并、上下文切换开销。

故实际吞吐量：

$$
\text{Throughput}_{actual} = \min\left(\sum_{i=1}^{N} \frac{W_i}{R_i}, B, P \cdot \text{payload}_{avg}\right)
$$

### 3.4 Reactor 模式形式化

Reactor 模式可形式化为五元组：

$$
\text{Reactor} = (E, S, H, D, M)
$$

- $E$：事件集合 $\{$READ, WRITE, ACCEPT, CONNECT$\}$。
- $S$：被监听的 Source 集合（如 `SelectableChannel`）。
- $H: E \times S \to \text{Action}$：事件处理函数。
- $D: S \to P$：分发器，将 Source 分配到工作池 $P$。
- $M: P \to 2^E$：多路复用器，对每个工作单元注册感兴趣的事件。

Reactor 的核心不变量：**所有 IO 事件由统一的 demultiplexer 收集，再分发到对应的 handler**。

## 4. 理论推导

### 4.1 TCP 三次握手的时序分析

设客户端发送 SYN 时刻为 $t_0$，服务端收到 SYN 时刻为 $t_1 = t_0 + \text{RTT}/2$。服务端回送 SYN+ACK 时刻为 $t_1 + \epsilon$（$\epsilon$ 为处理时间）。客户端收到 SYN+ACK 时刻为 $t_2 = t_1 + \epsilon + \text{RTT}/2 = t_0 + \text{RTT} + \epsilon$。

客户端发送 ACK 时刻为 $t_2$，服务端收到 ACK 时刻为 $t_3 = t_2 + \text{RTT}/2 = t_0 + \frac{3}{2}\text{RTT} + \epsilon$。

握手总耗时：

$$
T_{handshake} = t_3 - t_0 = \frac{3}{2}\text{RTT} + \epsilon \approx 1.5 \cdot \text{RTT}
$$

这是连接池减少延迟的理论依据：复用已建立连接可节省约 $1.5 \cdot \text{RTT}$ 的握手开销。对于跨洲 200ms RTT，这意味着每次请求节省 300ms。

### 4.2 TIME_WAIT 状态的数学分析

四次挥手后，主动关闭方进入 TIME_WAIT 状态，持续 $2 \cdot \text{MSL}$（Maximum Segment Lifetime）。MSL 在 RFC 793 中定义为 2 分钟，现代 Linux 默认为 30 秒。

为何需要 TIME_WAIT？两个理由：

1. **保证最后的 ACK 能到达对端**：若对端重发 FIN，本端需能回复 ACK。若本端直接 CLOSED，对端会收到 RST 导致连接异常。
2. **防止旧报文污染新连接**：让旧连接的迷途报文在 2MSL 内自然消亡。

设每秒新建连接数为 $C$，TIME_WAIT 持续时间为 $T_{tw} = 2 \cdot \text{MSL}$，则系统中 TIME_WAIT 套接字数量为：

$$
N_{tw} = C \cdot T_{tw}
$$

若 $C = 10000$，$T_{tw} = 60$s，则 $N_{tw} = 600000$。每个套接字占用约 1.5 KB 内核内存，共约 900 MB。这解释了高并发短连接场景下为何要使用长连接或调小 `tcp_max_tw_buckets`。

### 4.3 Epoll 的复杂度分析

不同 IO 多路复用机制的时间复杂度：

| 机制 | 注册复杂度 | 就绪返回复杂度 | 总复杂度（N 个 fd） |
|------|------------|----------------|---------------------|
| `select` | $O(1)$ | $O(N)$（需遍历 fd_set） | $O(N)$ |
| `poll` | $O(1)$ | $O(N)$ | $O(N)$ |
| `epoll_wait` | $O(1)$ | $O(k)$（k 为就绪数） | $O(k)$ |
| `kqueue` | $O(1)$ | $O(k)$ | $O(k)$ |

epoll 优势的核心来自两点：

1. **就绪列表**：内核维护一个就绪 fd 链表，`epoll_wait` 只复制就绪 fd，无需遍历所有 fd。
2. **红黑树索引**：注册的 fd 存于红黑树，查找/插入/删除均为 $O(\log N)$。

当连接数 $N \gg k$（活跃数）时，epoll 性能远超 select。这是 C10K 问题在 Linux 上的解决方案。

### 4.4 Netty Reactor 模型的吞吐量模型

设 boss 线程数为 $B$，worker 线程数为 $W$，每个 worker 处理连接数为 $L$，则总连接数为：

$$
N_{conn} = W \cdot L
$$

设单 worker 处理单请求平均耗时 $\mu$，请求到达率 $\lambda$，根据 Little 定律：

$$
L = \lambda \cdot \mu
$$

系统稳定条件：

$$
\lambda \cdot \mu < W \cdot L_{max}
$$

其中 $L_{max}$ 为单 worker 可承载的连接数上限（受线程栈、堆内存、IO 带宽限制）。

### 4.5 虚拟线程的内存模型

虚拟线程的栈存储在堆上的 `Stacklet` 结构中，按需分配与释放。设虚拟线程初始栈大小为 $s_0$（通常 256 B），最大栈大小为 $s_{max}$（受 `jdk.virtualThreadMaxStackSize` 控制，默认无上限）。

JVM 载体线程数为 CPU 核数 $C$。设虚拟线程数为 $V$，每虚拟线程平均栈大小为 $\bar{s}$，则：

- 虚拟线程本身占用堆内存：$V \cdot \bar{s}$。
- 载体线程占用栈内存：$C \cdot \text{stack}_{carrier}$（通常 1 MB）。

若 $V = 10^6$，$\bar{s} = 10$ KB，则堆内存约 10 GB，可承受。而传统平台线程 $10^6$ 个需 $10^6 \cdot 1$ MB = 1 TB，不可能。

这是虚拟线程支撑百万长连接的理论基础。

## 5. 代码示例

### 5.1 示例一：阻塞式 Echo Server（thread-per-connection）

本示例展示最基础的 TCP 服务，每连接一线程。代码经详细注释，便于理解 Socket API 与线程模型。

```java
package com.fandex.network.bio;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * 阻塞式 Echo 服务器。
 *
 * <p>本实现演示 thread-per-connection 模型：
 * <ul>
 *   <li>主线程阻塞在 {@link ServerSocket#accept()} 等待新连接</li>
 *   <li>每个新连接提交到线程池处理</li>
 *   <li>工作线程阻塞读取输入并回写，直到客户端断开</li>
 * </ul>
 *
 * <p>适用场景：连接数 < 1000，请求处理较重（如数据库查询）。
 * 不适用场景：万级长连接、推送、IM。
 *
 * <p>潜在问题：
 * <ul>
 *   <li>线程数随连接数线性增长，内存压力大</li>
 *   <li>上下文切换开销显著</li>
 *   <li>线程池满后新连接被拒绝</li>
 * </ul>
 */
public class BioEchoServer {

    private static final Logger LOGGER = Logger.getLogger(BioEchoServer.class.getName());
    private static final int DEFAULT_PORT = 8080;
    private static final int DEFAULT_POOL_SIZE = 200;

    /** 已处理连接计数器，用于监控 */
    private static final AtomicLong CONNECTION_COUNT = new AtomicLong(0);

    private final int port;
    private final ExecutorService workerPool;

    public BioEchoServer(int port, int poolSize) {
        this.port = port;
        // 使用固定大小线程池，避免无界创建线程导致 OOM
        this.workerPool = Executors.newFixedThreadPool(poolSize, r -> {
            Thread t = new Thread(r, "bio-worker-" + CONNECTION_COUNT.incrementAndGet());
            t.setDaemon(false);
            return t;
        });
    }

    /**
     * 启动服务器主循环。
     *
     * @throws IOException 若 ServerSocket 绑定失败
     */
    public void start() throws IOException {
        try (ServerSocket serverSocket = new ServerSocket(port)) {
            LOGGER.info("BIO Echo Server 启动，监听端口: " + port);
            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                LOGGER.info("接收到关闭信号，关闭服务器...");
                workerPool.shutdownNow();
            }));

            // 主循环：阻塞等待新连接
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    Socket clientSocket = serverSocket.accept();
                    configureSocket(clientSocket);
                    workerPool.submit(() -> handleClient(clientSocket));
                } catch (IOException e) {
                    if (Thread.currentThread().isInterrupted()) {
                        break;
                    }
                    LOGGER.log(Level.WARNING, "accept 失败", e);
                }
            }
        } finally {
            workerPool.shutdownNow();
            LOGGER.info("服务器已关闭，累计连接数: " + CONNECTION_COUNT.get());
        }
    }

    /**
     * 配置 Socket 参数，优化性能与行为。
     *
     * @param socket 待配置的客户端 Socket
     * @throws IOException 配置失败
     */
    private void configureSocket(Socket socket) throws IOException {
        // 启用 TCP_NODELAY，禁用 Nagle 算法，降低小包延迟
        socket.setTcpNoDelay(true);
        // 启用 SO_KEEPALIVE，让内核定期探测对端是否存活
        socket.setKeepAlive(true);
        // 设置 SO_TIMEOUT，避免读取永久阻塞
        socket.setSoTimeout(60_000);
        // 设置接收缓冲区大小（实际值由内核调整）
        socket.setReceiveBufferSize(64 * 1024);
    }

    /**
     * 处理单个客户端连接。
     *
     * <p>逐行读取客户端输入并原样回写，直到客户端断开或超时。
     *
     * @param socket 客户端 Socket
     */
    private void handleClient(Socket socket) {
        String clientAddr = socket.getRemoteSocketAddress().toString();
        LOGGER.fine("新连接: " + clientAddr);

        try (BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
             PrintWriter out = new PrintWriter(socket.getOutputStream(), true)) {

            String line;
            while ((line = in.readLine()) != null) {
                LOGGER.fine("[" + clientAddr + "] 收到: " + line);
                out.println("ECHO: " + line);
                if ("bye".equalsIgnoreCase(line.trim())) {
                    break;
                }
            }
        } catch (IOException e) {
            LOGGER.log(Level.FINE, "连接 " + clientAddr + " 异常关闭", e);
        } finally {
            try {
                socket.close();
            } catch (IOException e) {
                LOGGER.log(Level.FINE, "关闭 Socket 失败", e);
            }
            LOGGER.fine("连接关闭: " + clientAddr);
        }
    }

    public static void main(String[] args) throws IOException {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : DEFAULT_PORT;
        int poolSize = args.length > 1 ? Integer.parseInt(args[1]) : DEFAULT_POOL_SIZE;
        new BioEchoServer(port, poolSize).start();
    }
}
```

测试客户端：

```java
package com.fandex.network.bio;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;

/**
 * Echo 客户端，向服务器发送若干消息并接收回声。
 */
public class BioEchoClient {

    public static void main(String[] args) throws IOException {
        String host = args.length > 0 ? args[0] : "localhost";
        int port = args.length > 1 ? Integer.parseInt(args[1]) : 8080;

        try (Socket socket = new Socket(host, port);
             BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
             PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
             BufferedReader stdin = new BufferedReader(new InputStreamReader(System.in))) {

            System.out.println("已连接到 " + host + ":" + port + "，输入消息（bye 退出）");
            String userInput;
            while ((userInput = stdin.readLine()) != null) {
                out.println(userInput);
                System.out.println("服务器响应: " + in.readLine());
                if ("bye".equalsIgnoreCase(userInput)) {
                    break;
                }
            }
        }
    }
}
```

### 5.2 示例二：NIO 多路复用 HTTP Server

本示例使用 `Selector` 实现单线程服务多连接。代码刻意保持简洁但功能完整，包含连接建立、读取、解析、响应全流程。

```java
package com.fandex.network.nio;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.SelectionKey;
import java.nio.channels.Selector;
import java.nio.channels.ServerSocketChannel;
import java.nio.channels.SocketChannel;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * 基于 NIO Selector 的单线程 HTTP 服务器。
 *
 * <p>核心机制：
 * <ul>
 *   <li>单 Selector 管理所有 Channel 的 IO 事件</li>
 *   <li>事件循环不断轮询就绪的 SelectionKey</li>
 *   <li>对每个就绪事件分派到对应处理逻辑</li>
 * </ul>
 *
 * <p>本实现仅作教学演示，未处理半包、粘包问题。生产环境请使用 Netty。
 */
public class NioHttpServer {

    private static final Logger LOGGER = Logger.getLogger(NioHttpServer.class.getName());
    private static final int BUFFER_SIZE = 4 * 1024;
    private static final String CRLF = "\r\n";

    private final int port;
    private final Map<SocketChannel, ByteBuffer> readBuffers = new HashMap<>();
    private Selector selector;

    public NioHttpServer(int port) {
        this.port = port;
    }

    public void start() throws IOException {
        selector = Selector.open();
        ServerSocketChannel serverChannel = ServerSocketChannel.open();
        serverChannel.configureBlocking(false);
        serverChannel.bind(new InetSocketAddress(port));
        // 注册 OP_ACCEPT 事件，关注新连接
        serverChannel.register(selector, SelectionKey.OP_ACCEPT);

        LOGGER.info("NIO HTTP Server 启动，监听端口: " + port);

        while (!Thread.currentThread().isInterrupted()) {
            // 阻塞等待至少一个事件就绪，返回就绪 key 数量
            int readyCount = selector.select();
            if (readyCount == 0) {
                continue;
            }

            Set<SelectionKey> readyKeys = selector.selectedKeys();
            Iterator<SelectionKey> iterator = readyKeys.iterator();
            while (iterator.hasNext()) {
                SelectionKey key = iterator.next();
                iterator.remove(); // 必须显式移除，否则下次仍会返回
                try {
                    if (key.isAcceptable()) {
                        handleAccept(key);
                    } else if (key.isReadable()) {
                        handleRead(key);
                    }
                } catch (IOException e) {
                    LOGGER.log(Level.WARNING, "处理事件失败", e);
                    cleanup(key);
                }
            }
        }
    }

    /**
     * 处理新连接：accept 后注册 OP_READ。
     */
    private void handleAccept(SelectionKey key) throws IOException {
        ServerSocketChannel serverChannel = (ServerSocketChannel) key.channel();
        SocketChannel clientChannel = serverChannel.accept();
        clientChannel.configureBlocking(false);
        clientChannel.register(selector, SelectionKey.OP_READ);
        readBuffers.put(clientChannel, ByteBuffer.allocate(BUFFER_SIZE));
        LOGGER.fine("新连接: " + clientChannel.getRemoteAddress());
    }

    /**
     * 处理读事件：累积读取并尝试解析 HTTP 请求。
     */
    private void handleRead(SelectionKey key) throws IOException {
        SocketChannel channel = (SocketChannel) key.channel();
        ByteBuffer buffer = readBuffers.get(channel);
        int bytesRead = channel.read(buffer);

        if (bytesRead == -1) {
            // 对端正常关闭
            cleanup(key);
            return;
        }

        // 检查请求是否完整（以 \r\n\r\n 结尾表示 header 结束）
        buffer.flip();
        byte[] data = new byte[buffer.remaining()];
        buffer.get(data);
        buffer.compact();

        String request = new String(data, StandardCharsets.UTF_8);
        if (request.contains(CRLF + CRLF)) {
            String response = buildResponse(request);
            ByteBuffer responseBuf = ByteBuffer.wrap(response.getBytes(StandardCharsets.UTF_8));
            // 简化处理：阻塞写入完整响应（教学代码，生产应使用 OP_WRITE 异步写）
            while (responseBuf.hasRemaining()) {
                channel.write(responseBuf);
            }
            cleanup(key);
        }
    }

    private String buildResponse(String request) {
        String body = "Hello from NIO Server at " + System.currentTimeMillis() + "\n";
        return "HTTP/1.1 200 OK" + CRLF +
                "Content-Type: text/plain; charset=UTF-8" + CRLF +
                "Content-Length: " + body.getBytes(StandardCharsets.UTF_8).length + CRLF +
                "Connection: close" + CRLF + CRLF +
                body;
    }

    private void cleanup(SelectionKey key) {
        SocketChannel channel = (SocketChannel) key.channel();
        readBuffers.remove(channel);
        try {
            channel.close();
        } catch (IOException e) {
            LOGGER.log(Level.FINE, "关闭 Channel 失败", e);
        }
        key.cancel();
    }

    public static void main(String[] args) throws IOException {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 8080;
        new NioHttpServer(port).start();
    }
}
```

### 5.3 示例三：JDK 11 HttpClient 发起 HTTP/2 请求

JDK 11 引入的 `java.net.http.HttpClient` 内置支持 HTTP/2 与 WebSocket，是现代 Java 应用的首选 HTTP 客户端。

```java
package com.fandex.network.http;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * JDK 11+ HttpClient 示例，演示同步、异步与流式响应。
 *
 * <p>HttpClient 是线程安全的，可在多线程间共享，建议作为单例使用。
 */
public class ModernHttpClientDemo {

    public static void main(String[] args) throws Exception {
        // 自定义线程池，避免使用 ForkJoinPool.commonPool 导致资源争抢
        ExecutorService executor = Executors.newFixedThreadPool(
                Runtime.getRuntime().availableProcessors(),
                r -> {
                    Thread t = new Thread(r, "http-client-worker");
                    t.setDaemon(true);
                    return t;
                });

        // 构建可复用的 HttpClient 实例
        HttpClient client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_2)             // 优先使用 HTTP/2
                .connectTimeout(Duration.ofSeconds(10))         // 连接超时
                .followRedirects(HttpClient.Redirect.NORMAL)    // 跟随重定向
                .executor(executor)                              // 自定义线程池
                .build();

        // 1. 同步请求
        syncGet(client, "https://httpbin.org/get");

        // 2. 异步请求（CompletableFuture）
        asyncGet(client, "https://httpbin.org/get");

        // 3. POST JSON
        postJson(client, "https://httpbin.org/post", "{\"name\":\"fandex\",\"role\":\"developer\"}");

        // 4. 流式响应（如 SSE 场景）
        streamResponse(client, "https://httpbin.org/stream/5");

        executor.shutdown();
    }

    /**
     * 同步 GET 请求。
     */
    private static void syncGet(HttpClient client, String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .header("User-Agent", "FandexJava/1.0")
                .GET()
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println("[Sync] Status: " + response.statusCode());
        System.out.println("[Sync] Version: " + response.version());
        System.out.println("[Sync] Body (first 200 chars): "
                + response.body().substring(0, Math.min(200, response.body().length())));
    }

    /**
     * 异步 GET 请求，使用 CompletableFuture 链式处理。
     */
    private static void asyncGet(HttpClient client, String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .GET()
                .build();

        CompletableFuture<HttpResponse<String>> future =
                client.sendAsync(request, HttpResponse.BodyHandlers.ofString());

        future.thenApply(HttpResponse::statusCode)
              .thenAccept(status -> System.out.println("[Async] Status: " + status))
              .exceptionally(e -> {
                  System.err.println("[Async] 请求失败: " + e.getMessage());
                  return null;
              })
              .join(); // 等待完成，仅用于演示
    }

    /**
     * POST JSON 请求体。
     */
    private static void postJson(HttpClient client, String url, String json) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        System.out.println("[POST] Status: " + response.statusCode());
        System.out.println("[POST] Body (first 200 chars): "
                + response.body().substring(0, Math.min(200, response.body().length())));
    }

    /**
     * 流式响应处理，适用于大响应体或 SSE。
     */
    private static void streamResponse(HttpClient client, String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(60))
                .GET()
                .build();

        // BodyHandlers.ofLines 返回 Stream<String>，逐行处理
        client.send(request, HttpResponse.BodyHandlers.ofLines())
              .body()
              .limit(3)  // 仅取前 3 行演示
              .forEach(line -> System.out.println("[Stream] " + line));
    }
}
```

### 5.4 示例四：Netty 实现的高性能 TCP 服务

Netty 简化了 NIO 的样板代码，提供优雅的事件链模型。

```java
package com.fandex.network.netty;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInboundHandlerAdapter;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelOption;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.DelimiterBasedFrameDecoder;
import io.netty.handler.codec.string.StringDecoder;
import io.netty.handler.codec.string.StringEncoder;
import io.netty.handler.logging.LogLevel;
import io.netty.handler.logging.LoggingHandler;
import io.netty.handler.timeout.IdleStateHandler;
import io.netty.util.CharsetUtil;

import java.util.concurrent.TimeUnit;

/**
 * Netty TCP Echo Server。
 *
 * <p>采用经典主从 Reactor 模型：
 * <ul>
 *   <li>bossGroup：接受新连接（通常 1 个线程足够）</li>
 *   <li>workerGroup：处理 IO 读写与业务（默认 CPU 核数 * 2）</li>
 * </ul>
 *
 * <p>关键 Pipeline 设计：
 * <ul>
 *   <li>{@link IdleStateHandler}：60 秒无读事件触发心跳检测</li>
 *   <li>{@link DelimiterBasedFrameDecoder}：以 \n 为分隔符解决半包</li>
 *   <li>{@link StringDecoder}/{@link StringEncoder}：自动编解码字符串</li>
 *   <li>{@link EchoServerHandler}：业务处理</li>
 * </ul>
 */
public class NettyEchoServer {

    private final int port;

    public NettyEchoServer(int port) {
        this.port = port;
    }

    public void start() throws InterruptedException {
        // bossGroup 接受连接，workerGroup 处理 IO
        EventLoopGroup bossGroup = new NioEventLoopGroup(1);
        EventLoopGroup workerGroup = new NioEventLoopGroup();

        try {
            ServerBootstrap bootstrap = new ServerBootstrap();
            bootstrap.group(bossGroup, workerGroup)
                    .channel(NioServerSocketChannel.class)
                    .option(ChannelOption.SO_BACKLOG, 1024)             // 连接队列大小
                    .option(ChannelOption.SO_REUSEADDR, true)          // 端口重用
                    .childOption(ChannelOption.TCP_NODELAY, true)      // 禁用 Nagle
                    .childOption(ChannelOption.SO_KEEPALIVE, true)     // 启用 keepalive
                    .childOption(ChannelOption.SO_RCVBUF, 64 * 1024)   // 接收缓冲区
                    .childOption(ChannelOption.SO_SNDBUF, 64 * 1024)   // 发送缓冲区
                    .handler(new LoggingHandler(LogLevel.INFO))
                    .childHandler(new ChannelInitializer<SocketChannel>() {
                        @Override
                        protected void initChannel(SocketChannel ch) {
                            ByteBuf delimiter = Unpooled.copiedBuffer("\n", CharsetUtil.UTF_8);
                            ch.pipeline()
                              .addLast("idleState", new IdleStateHandler(60, 30, 0, TimeUnit.SECONDS))
                              .addLast("framer", new DelimiterBasedFrameDecoder(8192, delimiter))
                              .addLast("decoder", new StringDecoder(CharsetUtil.UTF_8))
                              .addLast("encoder", new StringEncoder(CharsetUtil.UTF_8))
                              .addLast("echoHandler", new EchoServerHandler());
                        }
                    });

            ChannelFuture future = bootstrap.bind(port).sync();
            System.out.println("Netty Echo Server 启动，端口: " + port);
            future.channel().closeFuture().sync();
        } finally {
            // 优雅关闭，等待正在处理的请求完成
            bossGroup.shutdownGracefully();
            workerGroup.shutdownGracefully();
        }
    }

    /**
     * 业务 Handler，处理读、心跳超时等事件。
     */
    public static class EchoServerHandler extends ChannelInboundHandlerAdapter {

        @Override
        public void channelActive(ChannelHandlerContext ctx) {
            System.out.println("客户端连接: " + ctx.channel().remoteAddress());
        }

        @Override
        public void channelRead(ChannelHandlerContext ctx, Object msg) {
            String line = (String) msg;
            System.out.println("[" + ctx.channel().remoteAddress() + "] 收到: " + line);
            // 直接写回，StringEncoder 会自动编码
            ctx.writeAndFlush("ECHO: " + line + "\n");
        }

        @Override
        public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
            if (evt instanceof IdleStateEvent) {
                IdleStateEvent event = (IdleStateEvent) evt;
                switch (event.state()) {
                    case READER_IDLE:
                        System.out.println("[" + ctx.channel().remoteAddress() + "] 60 秒无数据，关闭连接");
                        ctx.close();
                        break;
                    case WRITER_IDLE:
                        // 30 秒未写数据，发送心跳
                        ctx.writeAndFlush("HEARTBEAT\n");
                        break;
                    default:
                        break;
                }
            } else {
                super.userEventTriggered(ctx, evt);
            }
        }

        @Override
        public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
            cause.printStackTrace();
            ctx.close();
        }

        @Override
        public void channelInactive(ChannelHandlerContext ctx) {
            System.out.println("客户端断开: " + ctx.channel().remoteAddress());
        }
    }

    public static void main(String[] args) throws InterruptedException {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 8080;
        new NettyEchoServer(port).start();
    }
}
```

### 5.5 示例五：基于虚拟线程的 HTTP 服务器

JDK 21 虚拟线程让"thread-per-connection"模型在高并发下重新可用。

```java
package com.fandex.network.vthread;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * 基于虚拟线程的 HTTP 服务器。
 *
 * <p>JDK 21+ 引入虚拟线程（JEP 444），允许以同步阻塞风格编写高并发网络代码。
 * 每个虚拟线程占用 KB 级内存，单 JVM 可承载数百万。
 *
 * <p>本示例展示如何用 `Executors.newVirtualThreadPerTaskExecutor` 处理连接。
 */
public class VirtualThreadHttpServer {

    private static final Logger LOGGER = Logger.getLogger(VirtualThreadHttpServer.class.getName());
    private static final AtomicLong COUNTER = new AtomicLong();

    public static void main(String[] args) throws IOException {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 8080;
        // 虚拟线程执行器：每个任务一个虚拟线程
        var executor = Executors.newVirtualThreadPerTaskExecutor();

        try (ServerSocket server = new ServerSocket(port)) {
            LOGGER.info("虚拟线程 HTTP Server 启动，端口: " + port);
            while (!Thread.currentThread().isInterrupted()) {
                Socket socket = server.accept();
                // 提交到虚拟线程执行器，无需关心线程数
                executor.submit(() -> handle(socket));
            }
        } finally {
            executor.close();
        }
    }

    /**
     * 处理单个连接。阻塞 IO 在虚拟线程上会自动让出载体线程。
     */
    private static void handle(Socket socket) {
        long id = COUNTER.incrementAndGet();
        Instant start = Instant.now();
        try (socket;
             BufferedReader in = new BufferedReader(new InputStreamReader(
                     socket.getInputStream(), StandardCharsets.UTF_8));
             PrintWriter out = new PrintWriter(socket.getOutputStream(), true)) {

            // 简单 HTTP 解析
            String requestLine = in.readLine();
            if (requestLine == null) return;
            // 跳过 headers
            while (in.readLine() != null && !in.readLine().isEmpty()) {
                // 略
            }

            String body = "Hello from virtual thread #" + id + "\n";
            out.print("HTTP/1.1 200 OK\r\n");
            out.print("Content-Type: text/plain; charset=UTF-8\r\n");
            out.print("Content-Length: " + body.getBytes(StandardCharsets.UTF_8).length + "\r\n");
            out.print("Connection: close\r\n\r\n");
            out.print(body);
            out.flush();
        } catch (IOException e) {
            LOGGER.log(Level.FINE, "连接 #" + id + " 异常", e);
        } finally {
            LOGGER.fine("连接 #" + id + " 完成，耗时 "
                    + Duration.between(start, Instant.now()).toMillis() + " ms");
        }
    }
}
```

### 5.6 示例六：UDP 客户端与服务端

UDP 无连接，适用于 DNS、视频流、游戏等场景。

```java
package com.fandex.network.udp;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetSocketAddress;
import java.net.SocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * UDP Echo 服务端与客户端示例。
 *
 * <p>UDP 不保证可靠传输，但延迟低、无连接建立开销。
 * 适用于 DNS、视频流、心跳、游戏等场景。
 */
public class UdpEchoExample {

    /**
     * UDP 服务端：阻塞接收数据报并原样回送。
     */
    public static class UdpServer {
        public static void main(String[] args) throws IOException {
            int port = args.length > 0 ? Integer.parseInt(args[0]) : 9090;
            try (DatagramSocket socket = new DatagramSocket(port)) {
                System.out.println("UDP Server 启动，端口: " + port);
                byte[] buf = new byte[1024];
                while (true) {
                    DatagramPacket packet = new DatagramPacket(buf, buf.length);
                    socket.receive(packet); // 阻塞接收
                    // 立即回送
                    socket.send(new DatagramPacket(
                            packet.getData(), packet.getLength(), packet.getAddress(), packet.getPort()));
                    String msg = new String(packet.getData(), 0, packet.getLength(), StandardCharsets.UTF_8);
                    System.out.println("收到: " + msg + " from " + packet.getSocketAddress());
                }
            }
        }
    }

    /**
     * UDP 客户端：发送数据报并等待响应。
     */
    public static class UdpClient {
        public static void main(String[] args) throws IOException {
            String host = args.length > 0 ? args[0] : "localhost";
            int port = args.length > 1 ? Integer.parseInt(args[1]) : 9090;
            try (DatagramSocket socket = new DatagramSocket()) {
                socket.setSoTimeout(2000);
                SocketAddress server = new InetSocketAddress(host, port);
                // 并发发送 10 条消息
                var executor = Executors.newFixedThreadPool(10);
                for (int i = 0; i < 10; i++) {
                    final int idx = i;
                    executor.submit(() -> {
                        try {
                            String msg = "ping-" + idx;
                            byte[] data = msg.getBytes(StandardCharsets.UTF_8);
                            socket.send(new DatagramPacket(data, data.length, server));
                            byte[] buf = new byte[1024];
                            DatagramPacket resp = new DatagramPacket(buf, buf.length);
                            socket.receive(resp);
                            System.out.println("收到响应: "
                                    + new String(resp.getData(), 0, resp.getLength(), StandardCharsets.UTF_8));
                        } catch (IOException e) {
                            e.printStackTrace();
                        }
                    });
                }
                executor.shutdown();
                try {
                    executor.awaitTermination(5, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }
    }
}
```

## 6. 对比分析

### 6.1 IO 模型对比

| 维度 | BIO | NIO | AIO | 虚拟线程 |
|------|-----|-----|-----|----------|
| 编程模型 | thread-per-connection | Reactor | Proactor | thread-per-connection |
| 线程数 | 等于连接数 | CPU 核数 | CPU 核数 | 虚拟线程（百万级） |
| API 复杂度 | 低 | 高 | 高 | 低 |
| 内核依赖 | 无 | epoll/kqueue | io_uring/IOCP | 调度器 |
| 调试难度 | 简单 | 复杂 | 极复杂 | 简单 |
| 适用连接数 | < 1000 | 任意 | 任意 | 任意 |
| Java 版本 | 1.0+ | 1.4+ | 7+ | 21+ |
| 调优空间 | 有限 | 大 | 大 | 有限 |
| 生态支持 | 全部 | Netty/原生 | Netty/原生 | 全部 |

**结论**：在新项目且 JDK 21+ 可用时，优先考虑虚拟线程模型；如需精细控制或追求极致性能，使用 Netty；遗留系统或简单场景，BIO 仍可用。

### 6.2 HTTP 客户端对比

| 客户端 | HTTP/2 | 异步 | WebSocket | 内存占用 | 维护状态 |
|--------|--------|------|-----------|----------|----------|
| `java.net.HttpClient` | 是 | 是 | 是（独立 API） | 低 | 官方活跃 |
| OkHttp | 是 | 是 | 否（需扩展） | 中 | 活跃 |
| Apache HttpClient 5 | 是 | 否 | 否 | 中 | 活跃 |
| Netty Http client | 是 | 是 | 是 | 低 | 活跃 |
| Spring WebClient | 是 | 是 | 是 | 中 | 活跃 |

**选型建议**：

- 单体应用、无需 Spring：`java.net.HttpClient`（无第三方依赖）。
- Spring 全家桶：WebClient（与生态契合）。
- 极致性能、需要细粒度控制：Netty 直接编程。
- 兼容老系统：Apache HttpClient 5（API 设计成熟）。

### 6.3 主流网络框架对比

| 框架 | 核心模型 | 性能 | 易用性 | 典型用户 |
|------|----------|------|--------|----------|
| 原生 NIO | Reactor | 高 | 低 | 中间件开发者 |
| Netty | 主从 Reactor | 极高 | 中 | Dubbo/gRPC/Spark |
| Vert.x | Multi-Reactor | 极高 | 高 | 响应式应用 |
| Akka HTTP | Actor + Stream | 高 | 中 | 高并发系统 |
| Spring WebFlux | Reactor | 高 | 高 | Spring 应用 |
| Undertow | XNIO | 高 | 中 | WildFly/JBoss |

### 6.4 Reactor 与 Proactor 的本质差异

**Reactor**（同步 IO 多路复用）：

- 内核通知"可读"，应用主动 `read()`。
- 应用感知"就绪"，数据仍在内核。
- Linux 的 epoll、Java NIO Selector 属此类。

**Proactor**（异步 IO）：

- 应用发起 `read()`，内核完成读取后回调通知。
- 应用感知"完成"，数据已在用户空间。
- Windows IOCP、Linux io_uring 属此类。

Java NIO.2 的 `AsynchronousChannel` 在 Linux 上其实是用 epoll 模拟的，并非真正的 AIO。这也是 Netty 在 Linux 上推荐使用 NIO 而非 AIO 的原因。

## 7. 常见陷阱与反模式

### 7.1 反模式一：Selector 线程执行耗时业务

**事故案例**：某电商订单服务使用 NIO，开发者将订单处理逻辑（含数据库查询、远程调用）直接写在 `SelectionKey` 处理回调中。大促时数据库慢查询导致 Selector 线程阻塞 5 秒，整个服务无法 accept 新连接，最终雪崩。

**正确做法**：

```java
// 错误：在 Selector 线程执行耗时业务
if (key.isReadable()) {
    String request = readFromChannel(...);
    String response = orderService.process(request); // 数据库查询 200ms
    writeToChannel(response);
}

// 正确：将业务分发到工作线程池
if (key.isReadable()) {
    String request = readFromChannel(...);
    workerPool.submit(() -> {
        String response = orderService.process(request);
        // 通过 OP_WRITE 或 ctx.write 异步回写
        enqueueResponse(key, response);
    });
}
```

### 7.2 反模式二：忽略半包粘包

**事故案例**：某 IM 服务使用 NIO 直接按字节流读取消息，未做帧解析。客户端发送的两条消息被合并为一次 `read()`，导致 JSON 解析失败。生产环境 30% 消息丢失。

**根因**：TCP 是字节流协议，无消息边界。一次 `read()` 可能返回半条、一条、或多条消息。

**解决方案**：

1. **长度前缀**：每条消息前加 4 字节长度字段（如 `LengthFieldBasedFrameDecoder`）。
2. **分隔符**：以特定字符（如 `\n`）分隔（如 `LineBasedFrameDecoder`）。
3. **定长**：每条消息固定长度。

```java
// Netty 中使用 LengthFieldBasedFrameDecoder
ch.pipeline().addLast(new LengthFieldBasedFrameDecoder(
    1024 * 1024,  // 最大长度 1MB
    0,             // 长度字段偏移
    4,             // 长度字段长度
    0,             // 长度调整
    4              // 跳过长度字段本身
));
```

### 7.3 反模式三：未设置 SO_TIMEOUT 导致永久阻塞

**事故案例**：某支付回调服务接收客户端 Socket 但未设置 `SO_TIMEOUT`。攻击者建立连接后不发任何数据，线程永久阻塞。数千个连接耗尽线程池，正常请求无法处理。

**正确做法**：

```java
socket.setSoTimeout(30_000); // 30 秒超时
// 同时配合心跳机制，空闲连接主动关闭
```

### 7.4 反模式四：连接泄漏未关闭

**事故案例**：某爬虫服务使用 `HttpURLConnection` 但异常路径未关闭连接，导致 CLOSE_WAIT 堆积，最终 `Too many open files`。

**正确做法**：使用 try-with-resources 或 try-finally 确保关闭。

```java
// 错误
Socket socket = new Socket(host, port);
String response = doRequest(socket); // 若抛异常，socket 永不关闭

// 正确
try (Socket socket = new Socket(host, port)) {
    String response = doRequest(socket);
}
```

### 7.5 反模式五：在 Selector 上空轮询

**事故案例**：某服务在 Linux 上遭遇 JDK epoll bug，`selector.select()` 立即返回 0 但不阻塞，CPU 飙到 100%。Netty 通过重建 Selector 解决此问题。

**正确做法**：使用 Netty 等成熟框架，或在自研代码中检测空轮询并重建 Selector。

```java
long selectStart = System.nanoTime();
int ready = selector.select();
long elapsed = System.nanoTime() - selectStart;
if (ready == 0 && elapsed < 100_000) { // < 100 微秒，疑似空轮询
    rebuildSelector();
}
```

### 7.6 反模式六：未配置 SO_BACKLOG 导致连接拒绝

**事故案例**：某秒杀服务默认 `SO_BACKLOG=50`，瞬时大量 SYN 到达，连接队列溢出，内核回送 RST，客户端报 `Connection reset`。

**正确做法**：根据峰值 QPS 与处理耗时调整 `SO_BACKLOG`。

```java
// Netty
bootstrap.option(ChannelOption.SO_BACKLOG, 8192);

// 原生
ServerSocket server = new ServerSocket();
server.setReuseAddress(true);
server.bind(new InetSocketAddress(port), 8192); // backlog = 8192
```

### 7.7 反模式七：错误的线程模型

**事故案例**：某中间件在 Netty worker 线程中调用 `Thread.sleep` 模拟业务延迟，导致 worker 线程被占用，其他连接饥饿。

**正确做法**：耗时操作必须从 IO 线程卸载到业务线程池。Netty 提供 `EventExecutorGroup` 隔离机制。

```java
ch.pipeline().addLast(ioGroup, new IoHandler());
ch.pipeline().addLast(bizGroup, new BusinessHandler()); // 单独的业务线程组
```

### 7.8 反模式八：ByteBuf 泄漏

**事故案例**：某服务直接使用 `ByteBuf` 但未释放，长期运行后堆内存耗尽。Netty 通过 `ResourceLeakDetector` 检测泄漏。

**正确做法**：遵循"谁创建谁释放"或"谁最后处理谁释放"原则。Netty 内置 `SimpleChannelInboundHandler` 自动释放。

```java
public class MyHandler extends SimpleChannelInboundHandler<ByteBuf> {
    @Override
    protected void channelRead0(ChannelHandlerContext ctx, ByteBuf msg) {
        // 处理完毕后 SimpleChannelInboundHandler 自动释放 msg
        // 无需手动调用 msg.release()
    }
}
```

## 8. 工程实践

### 8.1 连接池设计

连接池是降低握手开销的关键。设计要点：

```java
/**
 * 简易连接池实现，演示核心思路。
 * 生产环境推荐使用 Apache Commons Pool 或 HikariCP 等成熟方案。
 */
public class SocketConnectionPool {
    private final BlockingQueue<Socket> pool;
    private final String host;
    private final int port;
    private final int maxSize;
    private final AtomicLong created = new AtomicLong();

    public SocketConnectionPool(String host, int port, int initialSize, int maxSize) {
        this.host = host;
        this.port = port;
        this.maxSize = maxSize;
        this.pool = new LinkedBlockingQueue<>(maxSize);
        for (int i = 0; i < initialSize; i++) {
            pool.offer(createConnection());
        }
    }

    public Socket borrow() throws InterruptedException, IOException {
        Socket socket = pool.poll();
        if (socket != null) {
            // 验证连接是否仍然有效
            if (isStale(socket)) {
                closeQuietly(socket);
                socket = createConnection();
            }
            return socket;
        }
        if (created.get() < maxSize) {
            return createConnection();
        }
        // 阻塞等待归还
        return pool.take();
    }

    public void release(Socket socket) {
        if (socket == null || !socket.isConnected() || socket.isClosed()) {
            closeQuietly(socket);
            return;
        }
        if (!pool.offer(socket)) {
            closeQuietly(socket);
        }
    }

    private Socket createConnection() throws IOException {
        Socket socket = new Socket(host, port);
        socket.setTcpNoDelay(true);
        socket.setKeepAlive(true);
        socket.setSoTimeout(5000);
        created.incrementAndGet();
        return socket;
    }

    private boolean isStale(Socket socket) {
        try {
            // 发送 1 字节探测，若失败说明连接已断
            socket.setSoTimeout(100);
            socket.getOutputStream().write(0);
            return false;
        } catch (IOException e) {
            return true;
        } finally {
            try {
                socket.setSoTimeout(5000);
            } catch (IOException ignore) {}
        }
    }

    private void closeQuietly(Socket socket) {
        if (socket != null) {
            try { socket.close(); } catch (IOException ignored) {}
            created.decrementAndGet();
        }
    }
}
```

### 8.2 性能优化清单

**JVM 层**：

- 使用 `-XX:+UseG1GC` 或 `-XX:+UseZGC` 降低 GC 停顿。
- 调大直接内存 `-XX:MaxDirectMemorySize=2g`（Netty 使用 ByteBuf.allocateDirect）。
- 监控直接内存使用，避免 OOM。

**OS 层**：

- 调高 `ulimit -n` 到 1000000+。
- 调整 `net.core.somaxconn`、`net.ipv4.tcp_max_syn_backlog`。
- 启用 `tcp_tw_reuse=1` 缓解 TIME_WAIT 短连接问题。
- 关闭 `tcp_slow_start_after_idle=0` 避免长连接被重置拥塞窗口。

**应用层**：

- 使用 `EpollEventLoopGroup` 替代 `NioEventLoopGroup`（仅 Linux）。
- 启用 Netty 的 `PoolingAllocator`（默认启用）。
- 合理设置 worker 线程数，默认 `CPU * 2` 在 IO 密集场景偏多。
- 业务线程池与 IO 线程池隔离。

### 8.3 监控指标

关键监控指标：

- 连接数：当前活跃、TIME_WAIT、CLOSE_WAIT、ESTABLISHED。
- 流量：上行、下行字节/秒。
- 延迟：P50/P95/P99 请求处理时间。
- 错误：连接拒绝、超时、reset、read/write 失败。
- 池：连接池利用率、等待时间、创建/销毁速率。

Netty 内置 `ChannelTrafficShapingHandler` 可统计流量。Prometheus + Micrometer 可暴露指标。

### 8.4 安全实践

- **TLS 必选**：内部服务也建议启用 mTLS（双向认证）。
- **协议版本**：禁用 SSLv3、TLS 1.0/1.1，仅启用 TLS 1.2/1.3。
- **密码套件**：使用强密码套件，禁用弱算法。
- **证书轮换**：自动化证书管理，定期轮换。
- **输入校验**：所有网络输入需校验长度、格式、内容。

```java
// 配置 TLS 1.3
SSLContext sslContext = SSLContext.getInstance("TLSv1.3");
sslContext.init(keyManagerFactory.getKeyManagers(),
                trustManagerFactory.getTrustManagers(),
                new SecureRandom());

SSLEngine engine = sslContext.createSSLEngine();
engine.setUseClientMode(false);
engine.setNeedClientAuth(true); // 启用客户端证书认证
engine.setEnabledProtocols(new String[]{"TLSv1.3"});
engine.setEnabledCipherSuites(new String[]{
    "TLS_AES_256_GCM_SHA384",
    "TLS_AES_128_GCM_SHA256"
});
```

## 9. 案例研究

### 9.1 案例一：某电商订单服务从 BIO 迁移到 Netty

**背景**：日订单量 5000 万，原有 BIO 服务使用 2000 线程，单机 QPS 上限 5000，集群 30 台机器。机器成本高，扩容频繁。

**问题诊断**：

- 线程数随连接数线性增长，GC 频繁。
- 线程上下文切换占用 15% CPU。
- 大量 TIME_WAIT 占用内存。

**改造方案**：

1. 通信层从 BIO 迁移到 Netty 4。
2. 使用 `LengthFieldBasedFrameDecoder` 解决半包。
3. boss=1，worker=CPU*2=8，业务线程池=200。
4. 引入连接复用，每个客户端仅 1 长连接。

**结果**：

- 单机 QPS 提升到 30000，集群缩减到 6 台。
- CPU 利用率从 70% 降到 40%。
- GC 频率降低 60%。

**关键代码片段**：

```java
EventLoopGroup boss = new NioEventLoopGroup(1);
EventLoopGroup worker = new NioEventLoopGroup(8);
EventExecutorGroup bizGroup = new DefaultEventExecutorGroup(200);

bootstrap.group(boss, worker)
         .channel(NioServerSocketChannel.class)
         .childHandler(new ChannelInitializer<SocketChannel>() {
             @Override
             protected void initChannel(SocketChannel ch) {
                 ch.pipeline()
                   .addLast(new LengthFieldBasedFrameDecoder(1024 * 1024, 0, 4, 0, 4))
                   .addLast(new ProtobufDecoder(OrderRequest.getDefaultInstance()))
                   .addLast(bizGroup, new OrderServiceHandler());
             }
         });
```

### 9.2 案例二：某 IM 系统支撑百万长连接

**背景**：社交 IM，峰值在线 500 万，需要长连接保持消息推送。

**架构设计**：

- 接入层：Netty + Linux，单机 50 万长连接。
- 路由层：基于用户 ID 哈希到接入层节点。
- 存储层：Redis 集群存储在线状态与消息队列。

**关键调优**：

1. **操作系统**：`ulimit -n 1048576`、`net.ipv4.ip_local_port_range = 1024 65535`。
2. **JVM**：`-Xmx32g -Xms32g -XX:+UseG1GC -XX:MaxGCPauseMillis=200`。
3. **Netty**：
   - 使用 `EpollEventLoopGroup` 与 `EpollServerSocketChannel`。
   - `bootstrap.option(ChannelOption.SO_BACKLOG, 32768)`。
   - `bootstrap.childOption(ChannelOption.TCP_NODELAY, true)`。
   - `bootstrap.childOption(ChannelOption.SO_KEEPALIVE, true)`。
   - `bootstrap.childOption(EpollChannelOption.TCP_QUICKACK, true)`。
4. **业务**：
   - 心跳 60 秒，超时 180 秒主动关闭。
   - 消息推送异步化，避免阻塞 worker。
   - 使用 `WriteBufferWaterMark` 防止发送队列积压。

**监控**：

- 每节点活跃连接数（实时上报）。
- 在线用户分布（按地域、版本）。
- 推送成功率、延迟分布。

**结果**：

- 单机稳定承载 50 万长连接，CPU 利用率 < 60%。
- 集群 10 台机器支撑 500 万在线。
- 单条消息推送延迟 P99 < 100ms。

### 9.3 案例三：从 Netty Reactor 迁移到虚拟线程

**背景**：内部 RPC 框架基于 Netty，业务代码以回调风格编写，可读性差、调试困难。JDK 21 GA 后考虑迁移到虚拟线程。

**动机**：

- 业务代码以同步风格更直观。
- 异常传播、上下文传递更简单。
- 调试体验提升（虚拟线程栈完整可见）。

**迁移策略**：

1. 保留 Netty 作为 IO 层（Netty 已支持虚拟线程执行器）。
2. 业务逻辑使用虚拟线程执行器。

```java
// Netty 4.1.86+ 支持虚拟线程
EventLoopGroup boss = new NioEventLoopGroup(1);
// worker 仍为平台线程，处理 IO
EventLoopGroup worker = new NioEventLoopGroup();
// 业务使用虚拟线程执行器
EventExecutorGroup bizGroup = new VirtualThreadEventExecutorGroup();

bootstrap.group(boss, worker)
         .childHandler(new ChannelInitializer<SocketChannel>() {
             @Override
             protected void initChannel(SocketChannel ch) {
                 ch.pipeline()
                   .addLast(new ProtobufDecoder())
                   .addLast(bizGroup, new SyncStyleBizHandler());
             }
         });
```

**结果**：

- 代码行数减少 30%。
- 业务异常排查时间从平均 1 小时降到 10 分钟。
- 性能持平（虚拟线程在 IO 密集场景下与 Reactor 相当）。

### 9.4 案例四：HTTP/2 多路复用优化微服务通信

**背景**：微服务集群内部调用频繁，使用 HTTP/1.1 短连接，每次调用握手开销 50ms（跨可用区）。

**改造**：使用 JDK 11 HttpClient 启用 HTTP/2 多路复用。

```java
HttpClient client = HttpClient.newBuilder()
        .version(HttpClient.Version.HTTP_2)
        .connectTimeout(Duration.ofSeconds(5))
        .build();
// 共享同一 client，内部维护连接池与多路复用
```

**结果**：

- 单连接承载多并发请求，握手开销摊薄。
- 头部压缩（HPACK）减少约 80% 头部字节。
- 端到端延迟 P99 从 80ms 降到 25ms。

## 10. 习题

### 10.1 基础题

**题 1**：解释 TCP 三次握手为什么不是两次或四次。

**参考答案要点**：

- 两次握手无法确认客户端的接收能力（SYN 后立即 ESTABLISHED）。
- 三次握手是双向确认最小次数：客户端确认服务端发送能力，服务端确认客户端发送与接收能力。
- 四次是冗余的，第三次握手已携带数据可同时作为客户端的发送确认。

**题 2**：什么是 TIME_WAIT？为什么持续 2MSL？

**参考答案要点**：

- 主动关闭方进入 TIME_WAIT，持续 2MSL。
- 两个目的：(1) 保证最后的 ACK 能到达对端；(2) 防止旧报文污染新连接。
- 2MSL 保证一个方向上的报文最大生存周期 + 反向 ACK 的最大生存周期。

**题 3**：阻塞 IO 与非阻塞 IO 的核心区别是什么？

**参考答案要点**：

- 阻塞 IO：数据未就绪时调用方被挂起，直到数据到达。
- 非阻塞 IO：数据未就绪时立即返回 EAGAIN，需轮询。
- 非阻塞本身不能节省 CPU，但配合多路复用可避免无效轮询。

### 10.2 进阶题

**题 4**：分析 Netty 主从 Reactor 模型中 boss 与 worker 的线程数该如何选择。

**参考答案要点**：

- boss 线程负责 accept，1 个即可（除非绑定多个端口）。
- worker 线程负责 IO 读写，默认 CPU*2。
- IO 密集型可适当增加（如 CPU*4）。
- 业务耗时操作必须从 worker 卸载到业务线程池，否则 worker 数量再多也无效。
- 实际需通过压测确定最优值。

**题 5**：实现一个简易的连接池，要求支持连接验证、最大连接数限制、空闲连接回收。

**参考答案要点**：

```java
public class SimplePool<T> {
    private final BlockingQueue<T> idle;
    private final Set<T> borrowed = ConcurrentHashMap.newKeySet();
    private final Supplier<T> factory;
    private final Predicate<T> validator;
    private final Consumer<T> destroyer;
    private final int maxSize;
    private final AtomicInteger total = new AtomicInteger();

    public T borrow(long timeoutMs) throws InterruptedException, TimeoutException {
        T obj = idle.poll();
        if (obj != null && validator.test(obj)) {
            borrowed.add(obj);
            return obj;
        }
        if (obj != null) {
            destroyer.accept(obj);
            total.decrementAndGet();
        }
        if (total.get() < maxSize) {
            T newObj = factory.get();
            total.incrementAndGet();
            borrowed.add(newObj);
            return newObj;
        }
        T waited = idle.poll(timeoutMs, TimeUnit.MILLISECONDS);
        if (waited == null) throw new TimeoutException("Pool exhausted");
        if (!validator.test(waited)) {
            destroyer.accept(waited);
            total.decrementAndGet();
            return borrow(timeoutMs);
        }
        borrowed.add(waited);
        return waited;
    }

    public void release(T obj) {
        if (obj == null) return;
        borrowed.remove(obj);
        if (!idle.offer(obj)) {
            destroyer.accept(obj);
            total.decrementAndGet();
        }
    }
}
```

**题 6**：分析 Netty ByteBuf 的引用计数机制，说明为何需要 `SimpleChannelInboundHandler`。

**参考答案要点**：

- Netty 使用池化 ByteBuf 降低 GC 压力，需手动释放。
- 引用计数：retain() +1，release() -1，归零时归还池。
- 若忘记 release 导致泄漏，长期运行 OOM。
- `SimpleChannelInboundHandler` 在 `channelRead0` 完成后自动 release。
- 对出站 ByteBuf，需在 ChannelPipeline 末尾由 HeadContext 释放。

### 10.3 挑战题

**题 7**：设计一个支持百万长连接的 IM 推送系统，画出架构图并说明关键技术选型。

**参考答案要点**：

- 接入层：Netty + Linux，单机 50 万连接，水平扩展。
- 路由层：用户 ID → 接入节点的路由表，存储在 Redis。
- 消息层：Kafka 异步解耦发送方与接收方。
- 存储层：用户在线状态（Redis）、离线消息（MongoDB）。
- 监控：Prometheus + Grafana，监控连接数、推送成功率、延迟。
- 容灾：多机房部署，DNS 调度，跨机房消息同步。

**题 8**：JDK 21 虚拟线程会取代 Netty Reactor 吗？请论证你的观点。

**参考答案要点**：

- 不会完全取代，但会改变应用层编程模型。
- 虚拟线程优势：同步风格、易调试、生态兼容。
- Netty 优势：精细控制、极致性能、生态成熟。
- Netty 已支持虚拟线程作为业务执行器，二者可共存。
- 在 IO 密集且对延迟不极端的场景，虚拟线程更优。
- 在需要零拷贝、内存池、自定义协议的场景，Netty 仍是首选。

**题 9**：分析 Linux io_uring 对 Java AIO 的潜在影响。

**参考答案要点**：

- io_uring 是 Linux 5.1+ 引入的真正异步 IO 接口。
- Java NIO.2 在 Linux 上是 epoll 模拟，并非真异步。
- io_uring 可让 Java 实现真正 AIO，性能与 IOCP 相当。
- JDK 社区已有 JEP 草案讨论 io_uring 集成。
- 短期内 Netty 仍主导，长期看 io_uring 可能改变底层 IO 抽象。

**题 10**：实现一个支持 SSE（Server-Sent Events）的 HTTP/2 服务器。

**参考答案要点**：

- 使用 `java.net.http.HttpClient` 客户端消费 SSE。
- 服务端用 Netty 或 Spring WebFlux 实现。
- SSE 在 HTTP/2 上自然多路复用，无需多连接。
- 关键点：响应头 `Content-Type: text/event-stream`，按 `data: ...\n\n` 格式发送。

## 11. 参考文献

[1] Postel, J. 1981. *Transmission Control Protocol* (RFC 793). Internet Engineering Task Force. DOI: https://doi.org/10.17487/RFC0793

[2] Postel, J. 1980. *User Datagram Protocol* (RFC 768). Internet Engineering Task Force. DOI: https://doi.org/10.17487/RFC0768

[3] Stevens, W. R., Fenner, B., and Rudoff, A. M. 2003. *UNIX Network Programming, Volume 1: The Sockets Networking API* (3rd ed.). Addison-Wesley Professional.

[4] Bish, C. 2014. *Netty in Action*. Manning Publications.

[5] The Linux Kernel Documentation. 2024. *The epoll(7) manual page and kernel internals*. https://www.kernel.org/doc/html/latest/networking/epoll.html

[6] McCanna, J. 2003. *JSR 51: New I/O APIs for the Java Platform*. Java Community Process. https://jcp.org/en/jsr/detail?id=51

[7] Watson, G. 2008. *JSR 203: More New I/O APIs for the Java Platform ("NIO.2")*. Java Community Process. https://jcp.org/en/jsr/detail?id=203

[8] Pressler, R. 2023. *JEP 444: Virtual Threads*. OpenJDK. https://openjdk.org/jeps/444

[9] Bishop, J. 2020. *JSR 353: Java API for JSON Processing*. Java Community Process. https://jcp.org/en/jsr/detail?id=353

[10] Belshe, M., Peon, R., and Thomson, M. (Eds.) 2015. *Hypertext Transfer Protocol Version 2 (HTTP/2)* (RFC 7540). IETF. DOI: https://doi.org/10.17487/RFC7540

[11] Fielding, R., Reschke, J. (Eds.) 2014. *Hypertext Transfer Protocol (HTTP/1.1): Semantics and Content* (RFC 7231). IETF. DOI: https://doi.org/10.17487/RFC7231

[12] Anderson, L. W., Krathwohl, D. R. (Eds.) 2001. *A Taxonomy for Learning, Teaching, and Assessing: A Revision of Bloom's Taxonomy of Educational Objectives*. Longman.

[13] Schmidt, D. C. 1995. *Reactor: An Object Behavioral Pattern for Concurrent Event Demultiplexing and Event Handler Dispatching*. In *Pattern Languages of Program Design* (Vol. 2). Addison-Wesley.

[14] Narayan, S., Sheppard, B. 2012. *Pro Java 7 NIO.2*. Apress. DOI: https://doi.org/10.1007/978-1-4302-4018-0

[15] inner, B. 1995. *Reactor: An Object Behavioral Pattern for Demultiplexing and Dispatching Handles for Synchronous Events*. Washington University St. Louis.

[16] Marow, A. (Ed.) 2022. *The C10K Problem*. https://www.kegel.com/c10k.html (经典问题页面，持续维护)

## 12. 延伸阅读

### 12.1 官方文档

- Oracle Java Tutorials: *Custom Networking*. https://docs.oracle.com/en/java/javase/21/docs/api/java.net/module-summary.html
- Netty Official Documentation. https://netty.io/wiki/
- OpenJDK Project Loom. https://openjdk.org/projects/loom/
- Linux epoll(7) man page. https://man7.org/linux/man-pages/man7/epoll.7.html
- Linux io_uring documentation. https://unixism.net/loti/

### 12.2 经典教材

- W. Richard Stevens, Bill Fenner, Andrew M. Rudoff. *UNIX Network Programming, Volume 1: The Sockets Networking API* (3rd ed.). Addison-Wesley, 2003.
- W. Richard Stevens. *TCP/IP Illustrated, Volume 1: The Protocols*. Addison-Wesley, 1994.
- Christian W. Dawson. *Java Networking*. IBM Redbooks, 2004.
- Elliotte Rusty Harold. *Java Network Programming* (4th ed.). O'Reilly, 2013.
- Norman Maurer, Marvin Allen Wolfthal. *Netty in Action*. Manning, 2014.

### 12.3 前沿论文

- Pressler, R., Bolshy, A. 2022. *JEP 425: Virtual Threads (Preview)*. OpenJDK. https://openjdk.org/jeps/425
- Pressler, R. 2022. *JEP 428: Structured Concurrency (Incubator)*. OpenJDK. https://openjdk.org/jeps/428
- Axboe, J. 2019. *Efficient IO with io_uring*. Linux Kernel documentation. https://kernel.dk/io_uring.pdf
- Marow, D. Kegel. 1999. *The C10K Problem*. https://www.kegel.com/c10k.html
- Welsh, M., Culler, D., Brewer, E. 2001. *SEDA: An Architecture for Well-Conditioned, Scalable Internet Services*. SOSP 2001. DOI: https://doi.org/10.1145/502034.502023

### 12.4 优秀博客与开源项目

- Netty Source Code. https://github.com/netty/netty
- Project Loom Early-Access Builds. https://jdk.java.net/loom/
- Aleksey Shipilev. *JVM Anatomy Quark*. https://shipilev.net/jvm/anatomy-quark/
- Martin Thompson. *Mechanical Sympathy* blog. https://mechanical-sympathy.blogspot.com/
- Jean-Philippe Bempel. *NIO.2 Async Channel* deep dive. https://www.javaadvent.com/

### 12.5 进阶主题

- **JEP 428 结构化并发**：简化并发错误处理与取消传播。
- **JEP 453 作用域值（Scoped Values）**：替代 ThreadLocal 的不可变共享机制。
- **Netty 5 演进**：API 简化与虚拟线程深度集成。
- **QUIC / HTTP/3**：基于 UDP 的下一代传输协议，Java 生态已有 quiche4j 等绑定。
- **零拷贝深入**：`sendfile`、`splice`、`mmap` 在 JVM 中的可用性。
- **eBPF 与网络可观测性**：Cilium、Pixie 等基于 eBPF 的网络监控方案。

---

**总结**：Java 网络编程经历了从 BIO 到 NIO、Netty Reactor、再到虚拟线程的演进。每种模型都有其适用场景，理解其背后的 IO 模型、协议语义、内核机制是选择合适方案的前提。在 JDK 21 之后，虚拟线程为高并发网络编程带来了范式转变，但 Netty 等成熟框架在精细控制、协议设计、生态兼容方面仍不可替代。开发者应根据场景、团队能力、生态依赖综合选型，避免陷入"唯技术先进论"的陷阱。
