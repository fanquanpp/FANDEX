---
order: 430
title: Socket 网络编程：从 echo 服务器开始
module: 'c'
category: 计算机科学
difficulty: advanced
description: 用 30 行代码写出 TCP echo 服务器并亲手连上它：socket 是文件描述符的网络版、字节序转换实验、TCP 五步流程与 accept 的新 fd 语义、UDP 无连接对比、粘包半包与 recv_n 封装、SIGPIPE 再现与 MSG_NOSIGNAL，附 bind 失败三因与 fd 泄漏的 /proc 自查实录。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'c/340-SignalHandling'
  - 'c/420-CPosixSystemCall'
  - 'c/410-CrossPlatformProgramming'
  - 'c/350-SharedMemorySemaphore'
prerequisites:
  - 'c/330-ProcessAndPipe'
  - 'c/430-StdioFileIO'
---

## 前置知识

- 已完成 [进程与管道](/c/330-ProcessAndPipe)：用过 pipe 的读写两端，知道文件描述符（fd）与 read/write 的基本姿势——本篇把同一套 fd 手法搬到网络上；
- 已完成 [文件 I/O](/c/430-StdioFileIO)：有「检查返回值」的肌肉记忆——socket API 每一步都可能失败，不查返回值等于闭眼开车。

> 分工说明：字节流的 transport 共三篇。[进程与管道](/c/330-ProcessAndPipe) 讲本机进程之间的单向字节流；本篇把字节流跨到网络：TCP 可靠流与 UDP 数据报，以及围绕它们的地址、字节序与连接管理；[POSIX 系统调用](/c/420-CPosixSystemCall) 是 read/write 循环与 EINTR 的速查底座，本篇直接引用不重复。跨平台差异（Windows Winsock）只在本篇点到，展开见 [跨平台编程](/c/410-CrossPlatformProgramming)。

## 学习目标

读完本文你将能够：

1. 写出并运行一个约 30 行的 TCP echo 服务器与客户端，用 nc 连上它收发数据；
2. 解释 socket 与文件描述符的关系，说出 socket/bind/listen/accept/connect 各自的返回值语义；
3. 用 htons/htonl 处理字节序，并能解释为什么端口号必须转换；
4. 实现「循环 read 补齐」的 recv_n，说清 TCP 字节流为什么没有消息边界；
5. 诊断 bind 失败、fd 泄漏、SIGPIPE 三类网络程序常见事故。

预计 60 到 80 分钟，含 4 组实验、2 道预测题与 1 道挑战题。

本文代码在 Linux/macOS（或 WSL）运行，链接时加 `-pthread` 的示例才需要它。Windows 的对应物 Winsock 有一套初始化与命名差异，第 9 节一句带过，完整对照见 [跨平台编程](/c/410-CrossPlatformProgramming)。

## 1. 问题引入：30 行的 echo 服务器

Echo（回声）是网络编程的「hello world」：收到什么就发回什么。麻雀虽小，TCP 服务器的完整骨架——建、绑、听、收、读写——一步不缺：

```c
/* echo_server.c */
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>

int main(void) {
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);        /* 1 建 */
    if (server_fd < 0) { perror("socket"); return 1; }

    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(8080);                            /* 2 绑 */
    addr.sin_addr.s_addr = INADDR_ANY;                      /*   本机所有网卡 */
    if (bind(server_fd, (struct sockaddr *)&addr, sizeof addr) < 0) {
        perror("bind"); return 1;
    }
    if (listen(server_fd, 16) < 0) { perror("listen"); return 1; }  /* 3 听 */
    printf("listening on 8080\n");

    while (1) {
        int conn = accept(server_fd, NULL, NULL);           /* 4 收 */
        if (conn < 0) { perror("accept"); continue; }

        char buf[1024];
        ssize_t n;
        while ((n = read(conn, buf, sizeof buf)) > 0) {     /* 5 读写 */
            if (write(conn, buf, (size_t)n) != n) { perror("write"); break; }
        }
        if (n == 0) printf("one connection closed\n");
        close(conn);
    }
}
```

```bash
gcc -Wall -Wextra -g echo_server.c -o echo_server
./echo_server
```

另开一个终端，用 nc（netcat，命令行的网络对讲机）连上去说话：

```bash
nc 127.0.0.1 8080
hello
hello
world
world
```

你每敲一行，服务器原样弹回一行。Ctrl+C 退出 nc 后，服务器打印 `one connection closed`。两个问题贯穿全文：**read 返回 0 是什么意思**（对端关闭，刚演示过了）；**一次 write 的 100 个字节，对端一定一次 read 收齐吗**（不一定，第 6 节揭底）。

## 2. socket 心智模型：文件描述符的网络版

[文件 I/O](/c/430-StdioFileIO) 的 `FILE*` 与 [进程与管道](/c/330-ProcessAndPipe) 的管道 fd 有一个共同点：read/write 一套手法通吃。socket 延续这个传统——`socket()` 返回的就是一个文件描述符，往里 write 就是发数据，从里 read 就是收数据。管道把字节流从本机一个进程送进另一个进程；socket 把字节流送出机器、跨过网络送进另一台机器上的进程。学过 330 再学本篇，真正的增量只有三件事：**地址怎么写、字节序怎么排、连接怎么管**。

创建 socket 的两个关键参数：

```c
int fd = socket(AF_INET, SOCK_STREAM, 0);   /* IPv4 + TCP：可靠字节流 */
int fd = socket(AF_INET, SOCK_DGRAM, 0);    /* IPv4 + UDP：数据报 */
int fd = socket(AF_UNIX,  SOCK_STREAM, 0);  /* 本机进程间，管道的替代品 */
```

第一个参数是协议族（AF_INET = IPv4，AF_INET6 = IPv6，AF_UNIX = 本机），第二个是服务类型：

| | SOCK_STREAM（TCP） | SOCK_DGRAM（UDP） |
| --- | --- | --- |
| 连接 | 先 connect，像打电话 | 不连接，像寄明信片 |
| 可靠性 | 不丢、不乱、不重 | 尽力而为，可能丢、可能乱 |
| 边界 | 无（纯字节流） | 有（一次 sendto 一个包） |
| 典型场景 | 网页、文件、API | DNS、游戏心跳、直播流 |

地址写在 `struct sockaddr_in` 里（netinet/in.h）：

```c
struct sockaddr_in addr = {0};
addr.sin_family = AF_INET;            /* 协议族，同 socket 第一参数 */
addr.sin_port   = htons(8080);        /* 端口：必须转网络字节序 */
addr.sin_addr.s_addr = INADDR_ANY;    /* 0.0.0.0：监听本机所有网卡 */
```

`(struct sockaddr *)&addr` 这个别扭的强转值得一句解释：socket API 诞生早于 void*，`struct sockaddr` 是各类地址结构的公共「表头」，靠第一个成员 sin_family 区分后面跟的是 IPv4、IPv6 还是 UNIX 地址——C 里的多态。

### 2.1 字节序实验：为什么端口要 htons

多字节整数在内存里的字节排列，x86 是小端（低位字节在前），网络协议约定一律大端（高位字节在前）——这与 [对齐与内存布局](/c/230-AlignmentMemoryLayout) 讲的是同一枚硬币的两面：230 管「存进文件/内存时按什么字节序编码」，本篇管「发上网络时按什么字节序编码」，答案是网络序固定大端，转换函数四个：

```c
htons(n)  /* host to network short：16 位，端口号用它 */
htonl(n)  /* host to network long ：32 位，IPv4 地址用它 */
ntohs(n)  /* 反向：网络到主机，16 位 */
ntohl(n)  /* 反向：网络到主机，32 位 */
```

空口无凭，把字节打印出来看：

```c
/* endian.c */
#include <stdio.h>
#include <stdint.h>
#include <arpa/inet.h>

int main(void) {
    uint32_t v = 0x12345678;
    unsigned char *p = (unsigned char *)&v;
    printf("本机内存: %02x %02x %02x %02x\n", p[0], p[1], p[2], p[3]);

    uint32_t n = htonl(v);
    p = (unsigned char *)&n;
    printf("htonl 后: %02x %02x %02x %02x\n", p[0], p[1], p[2], p[3]);
    printf("port: %d -> htons -> %04x\n", 8080, htons(8080));
    return 0;
}
```

x86-64 上的预期输出：

```text
本机内存: 78 56 34 12
htonl 后: 12 34 56 78
port: 8080 -> htons -> 901f
```

低位字节 78 排在最前——小端；htonl 之后高位 12 在前——大端，正是网络要的顺序。8080 即 0x1f90， htons 后变 0x901f。修改实验：把 endian.c 里的 htons 全部删掉再跑 echo_server，用 nc 连 8080 端口——连不上（服务器实际绑到了 0x901f 即 36895 端口上，`ss -tlnp` 可见）。少一个 htons，端口就变成了另一个数：这类 bug 编译器不报、逻辑「正常」，只有连不上时才暴露。

## 3. TCP 服务器五步与 accept 的语义

第 1 节的代码按「建、绑、听、收、读写」五步走，每步的返回值契约如下：

| 步骤 | 函数 | 成功返回 | 失败返回 |
| --- | --- | --- | --- |
| 建 | socket() | 新文件描述符 | -1 且设 errno |
| 绑 | bind() | 0 | -1 且设 errno |
| 听 | listen(fd, backlog) | 0 | -1 且设 errno |
| 收 | accept() | **新连接**的文件描述符 | -1 且设 errno |
| 连（客户端） | connect() | 0 | -1 且设 errno |

契约背后最重要的概念是 **accept 的返回值是一个新的 fd**。监听 fd 与连接 fd 是两回事：server_fd 像前台电话总机，永远只干一件事——接进线；每接入一个客户端，accept 交给你一部新的「分机」conn，之后的 read/write/close 全部作用在分机上，总机继续接下一个。关掉分机不影响总机，总机挂了就再也接不进新线。第 8 节的 fd 泄漏事故正是栽在这对关系上。

backlog 参数（第 1 节的 16）是「已完成握手、等待你 accept 的连接」的排队上限。满了之后新连接的行为依实现而定（被拒或滞留），教学阶段给个够用的数即可。

**客户端**没有绑定与监听，socket 之后直接 connect：

```c
/* echo_client.c */
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

int main(void) {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) { perror("socket"); return 1; }

    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(8080);
    if (inet_pton(AF_INET, "127.0.0.1", &addr.sin_addr) != 1) {
        fprintf(stderr, "bad address\n"); return 1;
    }
    if (connect(sock, (struct sockaddr *)&addr, sizeof addr) < 0) {
        perror("connect"); return 1;
    }

    const char *msg = "hello, socket\n";
    if (write(sock, msg, strlen(msg)) < 0) { perror("write"); return 1; }

    char buf[1024];
    ssize_t n = read(sock, buf, sizeof buf - 1);
    if (n < 0) { perror("read"); return 1; }
    buf[n] = '\0';
    printf("echo: %s", buf);
    close(sock);
    return 0;
}
```

inet_pton 把点分十进制字符串转成二进制地址（「presentation to network」），是 inet_addr 的现代替代；反向转换用 inet_ntop。connect 返回 0 意味着 TCP 三次握手完成，这条连接从此可靠有序。

**read 的三态**要背下来（`recv(fd, buf, n, 0)` 与 read 同义，多一个 flags 参数）：返回大于 0，收到这么多字节；返回 0，对端关闭了这条连接——这是网络的 EOF；返回 -1，出错查 errno（EINTR 见 [POSIX 系统调用](/c/420-CPosixSystemCall) 的循环模板）。echo 服务器的内层循环正是靠「read 返回 0 才跳出」知道客户端走了。

### 3.1 常用套接字选项速览

setsockopt 在第 1 节露过一面（SO_REUSEADDR），常用选项列全如下，用法同一模板：

| 选项 | 作用 | 一句话场合 |
| --- | --- | --- |
| SO_REUSEADDR | 允许绑定处于 TIME_WAIT 的地址 | 服务器几乎总该设，见第 8 节实录一 |
| SO_RCVTIMEO / SO_SNDTIMEO | 收/发超时 | 防止 read 永久阻塞在死连接上 |
| SO_KEEPALIVE | 空闲连接周期探活 | 检测对端拔网线式的半开连接 |
| TCP_NODELAY | 关闭 Nagle 算法，小包立即发出 | 交互式、低延迟协议 |

## 4. UDP：另一种世界观

TCP 像打电话：先接通再说，说漏了你以为没说漏。UDP 像寄明信片：写好地址直接寄，不保证到、不保证只到一次、不保证按寄出顺序到。代码上，UDP 没有 bind 后的 listen/accept/connect 长流程，一对 sendto/recvfrom 走天下：

```c
/* udp_echo.c：UDP 回显服务器 */
#include <stdio.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>

int main(void) {
    int sock = socket(AF_INET, SOCK_DGRAM, 0);      /* 注意 SOCK_DGRAM */
    if (sock < 0) { perror("socket"); return 1; }

    struct sockaddr_in addr = {0};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(9090);
    addr.sin_addr.s_addr = INADDR_ANY;
    if (bind(sock, (struct sockaddr *)&addr, sizeof addr) < 0) {
        perror("bind"); return 1;
    }

    char buf[1500];
    while (1) {
        struct sockaddr_in from;
        socklen_t fromlen = sizeof from;
        ssize_t n = recvfrom(sock, buf, sizeof buf, 0,
                             (struct sockaddr *)&from, &fromlen);  /* 收：顺带知道谁寄来的 */
        if (n < 0) { perror("recvfrom"); continue; }
        sendto(sock, buf, (size_t)n, 0,
               (struct sockaddr *)&from, fromlen);                 /* 原路寄回 */
    }
}
```

```bash
nc -u 127.0.0.1 9090        # -u 走 UDP
```

与 TCP 版对比，三个语义变化：没有 accept，每个数据报自带发件人地址（recvfrom 的最后两个参数填回来）；没有连接状态，一个 socket 就能「同时」跟任意多个对端说话；**一次 recvfrom 恰好对应一次 sendto**，数据报有边界——TCP 粘包的烦恼在 UDP 天然不存在，代价是 1500 字节左右（以太网 MTU 上下）以上的包要自己做分片与重组，丢了中间一片整个包作废。

何时选 UDP：一帧丢得起、时延丢不起的流量（游戏位置同步、语音、直播）；一来一回即完成、不值得建连接的查询（DNS）。要可靠就自己在应用层补（确认、重传、序号），QUIC 协议正是这条路——选 UDP 的理由从来不是「省事」，是「我不要 TCP 的代价」。

## 5. 并发伺候多个连接

echo_server 有个致命限制：内层 read 循环不退出，accept 就不会执行——第二个客户端连得上却永远没人理。解法三选一，按演进顺序：

**每连接一线程**（最直观，pthread 全套见 [POSIX 线程](/c/370-POSIXThread)）：

```c
static void *handler(void *arg) {
    int conn = *(int *)arg;
    free(arg);                               /* fd 堆上传递，用完即还 */
    char buf[1024];
    ssize_t n;
    while ((n = read(conn, buf, sizeof buf)) > 0) {
        if (write(conn, buf, (size_t)n) != n) break;
    }
    close(conn);                             /* 线程对自己的分机负责 */
    return NULL;
}

/* 主循环里替换第 4、5 步 */
int conn = accept(server_fd, NULL, NULL);
if (conn < 0) { perror("accept"); continue; }
int *fd = malloc(sizeof *fd);
if (fd == NULL) { close(conn); continue; }
*fd = conn;
pthread_t tid;
pthread_create(&tid, NULL, handler, fd);
pthread_detach(tid);                         /* 结束后自动回收线程资源 */
```

**select/poll**：单线程盯着一批 fd，谁就绪读写谁。select 用 fd_set 位图登记关心的 fd，`select(maxfd+1, &readfds, NULL, NULL, NULL)` 阻塞到任一就绪，`FD_ISSET` 逐个检查；poll 用 pollfd 数组，语义相同、fd 数不受位图限制。它们适合几十个连接的教学与工具场景。

**epoll**（Linux 专属）：连接上千后的正解。`epoll_create1(0)` 建实例，`epoll_ctl(epfd, EPOLL_CTL_ADD, fd, &ev)` 注册关心的 fd，`epoll_wait(epfd, events, MAX_EVENTS, -1)` 只返回就绪的那几个——不像 select 每轮全量扫描。跨平台对应物是 BSD/macOS 的 kqueue，Windows 的 IOCP；多路复用的深入对比是网络服务专题，本篇建立「单线程也能伺候多连接」的心智即可。

线程模型与多路复用之争没有标准答案：连接数少而逻辑重，线程直白；连接多而逻辑轻，事件循环高效。Nginx 用后者，传统数据库连接池用前者。

## 6. 字节流的坑：TCP 没有消息边界

这是从 pipe 带过来的最大思维惯性。管道有「一次 write 对应一次 read」的错觉是因为数据量小；TCP 是**字节流**：你 write 两次各 50 字节，对端可能一次 read 收到 100 个（粘包），也可能第一次只收到 30 个、第二次收到 70 个（半包）。发送方的一次 write 只是把字节交给本机发送缓冲区，TCP 按网络状况自行打包——**「消息」是应用层的概念，TCP 只负责字节顺序正确**。

验证它不用等网络抖动，修改实验：客户端循环 `for (int i = 0; i < 100; i++) write(sock, "A", 1);` 连发 100 个字节，服务器每收到一次就打印 `got %zd bytes`。本机回环上大概率一次收齐 100；挂到两台真实机器、或加一个小发送间隔再跑，会看到 40、37、23 这样的碎收——**把 read 的返回值当消息长度用，是网络程序最经典的协议事故**（实录三）。

解法是约定边界。两种协议形态：定长消息直接用「恰好收满 n 字节」的封装；变长消息用「长度前缀」——每条消息开头放自己的长度。两者的地基都是同一个 recv_n：

```c
/* 恰好收满 n 字节；返回实收数，0 表示对端中途关闭 */
static ssize_t recv_n(int fd, void *buf, size_t n) {
    char *p = buf;
    size_t got = 0;
    while (got < n) {
        ssize_t r = read(fd, p + got, n - got);
        if (r == 0) return (ssize_t)got;     /* 对端关闭：拿到多少算多少 */
        if (r < 0) return -1;                /* EINTR 循环模板见 420 */
        got += (size_t)r;
    }
    return (ssize_t)got;
}
```

短读循环的通用形态（含 EINTR 处理）在 [POSIX 系统调用](/c/420-CPosixSystemCall) 已有速查，网络版的增量只在「r == 0 不是错误、是 EOF」这一条语义。写侧同理：write 可能只送出一半（发送缓冲区满），大块数据也要循环补齐。

### 6.1 SIGPIPE 在 socket 上的再现

对端已关闭的连接上继续 write，内核不会温和地返回错误——它默认向你的进程发 SIGPIPE，默认动作是终止。[信号处理](/c/340-SignalHandling) 的实录二抓过这个现形：长跑服务给断开的对端写数据后整进程无声消失，退出码 141（128 + 13）。网络服务是重灾区，修法三选一（详见 340）：sigaction 忽略 SIGPIPE 后改查 write 的 EPIPE 返回；全局安装一次，一劳永逸；或按连接精确控制——**send 加 MSG_NOSIGNAL 标志**，这一条写法失败时不发信号、只返回 -1 且 errno 为 EPIPE：

```c
if (send(conn, buf, (size_t)n, MSG_NOSIGNAL) < 0) {
    if (errno == EPIPE) { /* 对端已关，收尾这条连接 */ }
}
```

MSG_NOSIGNAL 是 POSIX 扩展（Linux/BSD 均支持）；macOS 还提供 SO_NOSIGPIPE 套接字选项，Windows 的 Winsock 根本没有 SIGPIPE。平台差异的汇总在 [跨平台编程](/c/410-CrossPlatformProgramming)。

## 7. 工具与调试

- **nc（netcat）**：本篇的测试客户端，`nc host port` 走 TCP、`-u` 走 UDP；**socat** 是它的瑞士军刀版，能两头接任意东西（管道、文件、socket）做协议胶水；
- **ss / netstat**：看监听与连接。`ss -tlnp 'sport = :8080'` 列出 8080 上的监听进程，`-t` TCP、`-n` 不解析域名、`-p` 带进程名；bind 失败的第一反应就是它；
- **tcpdump**：抓包看线上真相（`tcpdump -i lo port 8080 -X` 能逐字节看到三次握手与你的数据），深水区工具，本篇只立此存照；
- **getaddrinfo**：把「www.example.com」这样的主机名加服务名解析成可用的地址链表——DNS 查询加端口服务的统一入口，配 freeaddrinfo 释放、gai_strerror 报错。示例代码里手写 IP 是教学简化，真实客户端一律先过它。

## 8. 常见错误与调试实录

### 实录一：bind: Address already in use

```text
bind: Address already in use
```

服务器重启时最常见的死法，三种病因按概率排查：

1. **上一个实例还活着**。`ss -tlnp 'sport = :8080'` 一查便知，找到进程 kill 掉；
2. **TIME_WAIT 占着端口**。主动关闭连接的一方（往往是服务器）在连接关闭后还要停留约一两分钟，期间端口对普通 bind 不可用。这正是 echo_server 里 SO_REUSEADDR 的用途——设了它，绑定 TIME_WAIT 的地址不再报错。开发期每改一行代码就要重启服务器，没有这个选项会痛苦不堪；
3. **特权端口**。绑 80、443 等小于 1024 的端口需要 root 权限，普通用户得到 Permission denied——报错文案不同，容易与前面两种区分。

排查顺序固定：先 ss 看谁占着，再看是不是 TIME_WAIT（ss 输出里状态列），最后才怀疑权限。

### 实录二：accept 之后忘 close，fd 悄悄漏光

文件描述符是有限资源（默认每进程 1024 个左右），echo_server 若在某个分支 return 而漏掉 close(conn)，每来一个客户端就漏一个 fd。平时毫无症状，直到某天 accept 突然返回 -1 且 errno 为 EMFILE——fd 表满了，新连接再也接不进来。/proc 自查实验两步定位：

```bash
./fdleak &                       /* 跑一个会泄漏的服务器 */
ls /proc/$(pidof fdleak)/fd | wc -l
nc 127.0.0.1 8080 < /dev/null    /* 来一个连接 */
ls /proc/$(pidof fdleak)/fd | wc -l   /* 数字涨 1，再不来连接也不回落 */
```

正常的 echo_server 每次连接关闭后 fd 数回落，泄漏版只涨不跌。纪律与 [内存深水区](/c/210-ProcessMemoryLayoutAndErrors) 的 free 后置 NULL 同源：**谁 accept 谁 close**，错误路径（perror 之后）尤其要复查每个 return 前资源都还了；accept 出的 conn 与 malloc 出的指针是同一类东西——拿了必须还。

### 实录三：把 read 的返回值当消息边界用

事故现场：聊天协议约定每条消息是一行文本，客户端逐条 write，服务器 `read(conn, buf, 1024)` 后直接按「一条完整消息」解析。内网测试一切正常；上线后用户报告偶尔出现「消息被拆成两半」「两条消息黏成一条」——第 6 节的粘包/半包在真实网络延迟下开始发作，解析器把半行文本当成完整命令执行，协议彻底错乱。这类事故的隐蔽性在于它依赖时序：本机与内网几乎复现不了，人一多、网一慢必现。

修复按第 6 节办：协议升级为「4 字节长度前缀（htonl 编码）+ 定长 recv_n 收满 + 按长度解析」，服务器从此不猜边界。复盘一句话：**TCP 只保证字节顺序，消息边界永远是应用层协议自己的责任**。

## 9. IPv6 与可移植性一句概览

IPv4 地址 32 位早已耗尽，IPv6 用 128 位地址接棒。代码层面增量很小：协议族换 AF_INET6，地址结构换 `struct sockaddr_in6`（sin6_port 之外是 16 字节的 sin6_addr），转换函数 inet_pton/inet_ntop 不变（第二个参数换 AF_INET6，字符串形如 fe80::1）。更友好的做法是 getaddrinfo 配 AF_UNSPEC 提示，同一份代码自动兼容双栈。sizeof 与对齐等平台细节、以及 Windows Winsock 的整套差异（winsock2.h 头文件、启动先调 WSAStartup、关闭用 closesocket、fd 类型 SOCKET）都在 [跨平台编程](/c/410-CrossPlatformProgramming) 展开，本篇不重复。

## 10. 实际项目中的使用场景

- echo 服务器换成「读请求、拼响应」，就是一切网络服务的原型：Web 后端回 JSON，游戏服回状态同步，本质都是「协议 + 收发循环」；
- 代理与网关：两端各一条连接，把 A 收到的转发给 B——echo 的进阶形态，练习双向 fd 管理；
- 监控采集与心跳上报：UDP 数据报一条条发，丢一帧等下一帧，正是 UDP 的舒适区；
- 长跑服务的三个标配动作：SO_REUSEADDR、忽略 SIGPIPE（或 MSG_NOSIGNAL）、read/write 全查返回值——本篇三项实录各对应一条。

## 11. 小练习

预测题（5 分钟）：echo_server 里如果把内层循环改成 `while (1)` 永不检查 read 返回值，客户端 Ctrl+C 断开后会发生什么？服务器还能接受新客户端吗？

参考答案（先写再看）：read 对已关闭连接返回 0，代码不判零就继续循环——read 会立刻又返回 0（或 -1），服务器陷入空转刷屏；由于线程卡在死循环里，accept 永远执行不到，新客户端连上却无人理。返回值三态一个都不能省。

预测题二（5 分钟）：accept 返回的 fd 和监听用的 server_fd 是同一个吗？close(server_fd) 之后，已经建立的连接还能通信吗？

参考答案（先写再看）：不是同一个，accept 每次返回新 fd；close 总机只影响接新线，已建立的分机（conn）照常读写——直到它们也被各自 close。

挑战题（45 分钟，不看答案先动手）：把 echo 服务器升级成最小 HTTP 服务器：浏览器访问 http://127.0.0.1:8080 能看到一个标题页。提示两级如下。

提示（思路方向）：不用解析请求，读进来的内容先原样打印观察格式；响应按 HTTP/1.1 拼一段固定文本，关键在头部要告诉浏览器正文多长。

展开（关键 API）：响应骨架 `HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: %zu\r\nConnection: close\r\n\r\n` 后接正文，Content-Length 必须等于正文字节数（snprintf 先量后拼）；回完 close(conn) 让浏览器知道响应结束。

验收清单：curl 或浏览器看到标题页；多次刷新不出错；响应结束后服务器继续 accept 新请求。做完对照：你实现了「请求-响应」协议的第一条边界约定——正文长度自报家门，正是实录三长度前缀思想的官方版。

## 12. 与之前和之后的知识的关系

- 往前：[进程与管道](/c/330-ProcessAndPipe) 的 fd 手法与 EOF 语义原样适用，管道变双工、跨了机器，就是 socket；[文件 I/O](/c/430-StdioFileIO) 的「查返回值」纪律在网络编程里升级为生存必需；[对齐与内存布局](/c/230-AlignmentMemoryLayout) 的字节序编码视角在 2.1 完成传输侧闭环；
- 旁支：SIGPIPE 的信号机制在 [信号处理](/c/340-SignalHandling)，MSG_NOSIGNAL 只是它的套接字特例；并发服务器的线程细节在 [POSIX 线程](/c/370-POSIXThread)，线程安全计数在 [原子操作与内存模型](/c/380-AtomicAndMemoryModel)；本机双向低开销 IPC 还有 UNIX 域套接字与 [共享内存与信号量](/c/350-SharedMemorySemaphore)；
- 往后：[文件系统操作](/c/400-FileSystemOperation) 继续在 fd 世界里走——从 socket 转向文件与目录的元数据操作，read/write 之外的工具箱。

## 13. 官方文档

- socket(2)（创建与参数矩阵）：https://man7.org/linux/man-pages/man2/socket.2.html
- accept(2)（新 fd 语义与 backlog 细节）：https://man7.org/linux/man-pages/man2/accept.2.html
- bind(2)（地址绑定与错误码）：https://man7.org/linux/man-pages/man2/bind.2.html
- send(2)（MSG_NOSIGNAL 与 EPIPE）：https://man7.org/linux/man-pages/man2/send.2.html
- htonl(3)（字节序转换四函数与 endianness 背景）：https://man7.org/linux/man-pages/man3/htonl.3.html
- getaddrinfo(3)（主机名与服务解析）：https://man7.org/linux/man-pages/man3/getaddrinfo.3.html

## 14. 自我检查

- 能不看资料默写 socket/bind/listen/accept 五步服务器，并说出每个函数成功与失败时的返回值；
- 能向同事解释 accept 返回新 fd 的语义，以及监听 fd 与连接 fd 的分工；
- 能复述 read 三态（正数、0、-1）各自的含义，并写出 recv_n；
- 面对 Address already in use，能按三因顺序排查；面对「偶现消息错乱」，能指出消息边界必须由应用层协议约定。

## 本章总结

socket 是文件描述符的网络版：建（socket）、绑（bind，端口记得 htons）、听（listen，排队上限 backlog）、收（accept，每连接一个新 fd）、读写（read/write，三态返回值）。TCP 给你可靠有序的字节流，但从不给你「消息」——边界靠应用层协议（定长或长度前缀）配 recv_n 自己维护；UDP 一次 sendto 一个有边界的数据报，代价是可能丢、可能乱。SIGPIPE 会杀死给断开对端写数据的进程，MSG_NOSIGNAL 是套接字上的精确解法。bind 失败按「进程还在、TIME_WAIT、特权端口」三因排查，accept 后忘 close 的 fd 泄漏去 /proc/self/fd 数一数便知。下一步离开网络，回到文件系统。

## 下一步

进入 [文件系统操作](/c/400-FileSystemOperation)：读写字节的本事已经齐了，接下来看文件的另一面——目录、权限、属性与监控，把 fd 世界里剩下的工具箱补全。
