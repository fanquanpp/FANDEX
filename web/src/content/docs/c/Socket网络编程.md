---
order: 66
title: Socket网络编程
module: c
category: C
difficulty: advanced
description: TCP/UDP套接字编程
author: fanquanpp
updated: '2026-06-14'
related:
  - c/复杂声明解析
  - c/POSIX线程
  - c/进程与管道
  - c/共享内存与信号量
prerequisites:
  - c/概述
---

## 概述

Socket（套接字）是网络通信的端点，由IP地址和端口号标识。C语言通过BSD Socket API提供网络编程接口，支持TCP（可靠传输）和UDP（快速传输）两种主要协议。Socket编程是构建网络服务器、客户端应用和分布式系统的基础。

## 基础概念

### TCP vs UDP

| 特性     | TCP                  | UDP               |
| -------- | -------------------- | ----------------- |
| 连接     | 面向连接（三次握手） | 无连接            |
| 可靠性   | 可靠传输，保证顺序   | 不保证可靠和顺序  |
| 速度     | 较慢（有确认和重传） | 较快              |
| 适用场景 | 文件传输、Web、邮件  | 视频流、DNS、游戏 |

### Socket 编程基本流程

TCP 服务器：`socket` -> `bind` -> `listen` -> `accept` -> `recv/send` -> `close`

TCP 客户端：`socket` -> `connect` -> `recv/send` -> `close`

UDP 服务器：`socket` -> `bind` -> `recvfrom/sendto` -> `close`

UDP 客户端：`socket` -> `sendto/recvfrom` -> `close`

### 核心数据结构

```c
#include <netinet/in.h>

// IPv4 地址结构
struct sockaddr_in {
    sa_family_t    sin_family; // AF_INET
    in_port_t      sin_port;   // 端口号（网络字节序）
    struct in_addr sin_addr;   // IP地址
    char           sin_zero[8];// 填充
};

// IPv6 地址结构
struct sockaddr_in6 {
    sa_family_t    sin6_family; // AF_INET6
    in_port_t      sin6_port;
    uint32_t       sin6_flowinfo;
    struct in6_addr sin6_addr;
    uint32_t       sin6_scope_id;
};
```

## 快速上手

### TCP 服务器

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <netinet/in.h>

int main(void) {
    // 创建套接字
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);

    // 允许地址复用
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    // 绑定地址和端口
    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_port = htons(8080),
        .sin_addr.s_addr = INADDR_ANY
    };
    bind(server_fd, (struct sockaddr *)&addr, sizeof(addr));

    // 开始监听
    listen(server_fd, 5);
    printf("服务器监听 8080 端口\n");

    // 接受客户端连接
    struct sockaddr_in client_addr;
    socklen_t client_len = sizeof(client_addr);
    int client_fd = accept(server_fd, (struct sockaddr *)&client_addr, &client_len);

    // 读取客户端数据
    char buf[1024] = {0};
    read(client_fd, buf, sizeof(buf));
    printf("收到: %s\n", buf);

    // 发送响应
    const char *response = "Hello from server";
    write(client_fd, response, strlen(response));

    // 关闭连接
    close(client_fd);
    close(server_fd);
    return 0;
}
```

### TCP 客户端

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <netinet/in.h>
#include <arpa/inet.h>

int main(void) {
    // 创建套接字
    int sock = socket(AF_INET, SOCK_STREAM, 0);

    // 设置服务器地址
    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_port = htons(8080),
        .sin_addr.s_addr = inet_addr("127.0.0.1")
    };

    // 连接服务器
    if (connect(sock, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("连接失败");
        return 1;
    }

    // 发送数据
    const char *msg = "Hello from client";
    write(sock, msg, strlen(msg));

    // 接收响应
    char buf[1024] = {0};
    read(sock, buf, sizeof(buf));
    printf("服务器响应: %s\n", buf);

    close(sock);
    return 0;
}
```

## 详细用法

### UDP 服务器

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <netinet/in.h>

int main(void) {
    int sock = socket(AF_INET, SOCK_DGRAM, 0);

    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_port = htons(9090),
        .sin_addr.s_addr = INADDR_ANY
    };
    bind(sock, (struct sockaddr *)&addr, sizeof(addr));

    printf("UDP 服务器监听 9090 端口\n");

    char buf[1024];
    struct sockaddr_in client_addr;
    socklen_t client_len = sizeof(client_addr);

    while (1) {
        // 接收数据
        ssize_t n = recvfrom(sock, buf, sizeof(buf) - 1, 0,
                              (struct sockaddr *)&client_addr, &client_len);
        buf[n] = '\0';
        printf("收到: %s\n", buf);

        // 发送响应
        const char *response = "UDP 响应";
        sendto(sock, response, strlen(response), 0,
               (struct sockaddr *)&client_addr, client_len);
    }

    close(sock);
    return 0;
}
```

### UDP 客户端

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <netinet/in.h>
#include <arpa/inet.h>

int main(void) {
    int sock = socket(AF_INET, SOCK_DGRAM, 0);

    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_port = htons(9090),
        .sin_addr.s_addr = inet_addr("127.0.0.1")
    };

    // 发送数据
    const char *msg = "UDP 请求";
    sendto(sock, msg, strlen(msg), 0, (struct sockaddr *)&addr, sizeof(addr));

    // 接收响应
    char buf[1024];
    recvfrom(sock, buf, sizeof(buf), 0, NULL, NULL);
    printf("响应: %s\n", buf);

    close(sock);
    return 0;
}
```

### 常用套接字选项

```c
#include <stdio.h>
#include <unistd.h>
#include <netinet/in.h>
#include <netinet/tcp.h>

int main(void) {
    int sock = socket(AF_INET, SOCK_STREAM, 0);

    // 地址复用：服务器重启时可以立即绑定同一端口
    int reuse = 1;
    setsockopt(sock, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));

    // 发送超时
    struct timeval timeout = { .tv_sec = 5, .tv_usec = 0 };
    setsockopt(sock, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));

    // 接收超时
    setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));

    // 接收缓冲区大小
    int bufsize = 65536;
    setsockopt(sock, SOL_SOCKET, SO_RCVBUF, &bufsize, sizeof(bufsize));

    // 禁用 Nagle 算法（减少延迟）
    int nodelay = 1;
    setsockopt(sock, IPPROTO_TCP, TCP_NODELAY, &nodelay, sizeof(nodelay));

    // 保持连接
    int keepalive = 1;
    setsockopt(sock, SOL_SOCKET, SO_KEEPALIVE, &keepalive, sizeof(keepalive));

    close(sock);
    return 0;
}
```

## 常见场景

### 场景一：HTTP 服务器

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <netinet/in.h>
#include <signal.h>

#define PORT 8080

int main(void) {
    signal(SIGCHLD, SIG_IGN);

    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_port = htons(PORT),
        .sin_addr.s_addr = INADDR_ANY
    };
    bind(server_fd, (struct sockaddr *)&addr, sizeof(addr));
    listen(server_fd, 10);

    printf("HTTP 服务器运行在 http://localhost:%d\n", PORT);

    while (1) {
        int client_fd = accept(server_fd, NULL, NULL);
        if (client_fd < 0) continue;

        char buf[4096] = {0};
        read(client_fd, buf, sizeof(buf));

        // 构造 HTTP 响应
        const char *body = "<html><body><h1>Hello, World!</h1></body></html>";
        char response[4096];
        snprintf(response, sizeof(response),
                 "HTTP/1.1 200 OK\r\n"
                 "Content-Type: text/html; charset=utf-8\r\n"
                 "Content-Length: %zu\r\n"
                 "Connection: close\r\n"
                 "\r\n%s",
                 strlen(body), body);

        write(client_fd, response, strlen(response));
        close(client_fd);
    }

    return 0;
}
```

### 场景二：多线程并发服务器

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <netinet/in.h>
#include <pthread.h>

#define PORT 8080

void *handle_client(void *arg) {
    int client_fd = *(int *)arg;
    free(arg);

    char buf[1024];
    while (1) {
        ssize_t n = read(client_fd, buf, sizeof(buf) - 1);
        if (n <= 0) break;
        buf[n] = '\0';
        printf("收到: %s\n", buf);

        // 回显
        write(client_fd, buf, n);
    }

    close(client_fd);
    return NULL;
}

int main(void) {
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_port = htons(PORT),
        .sin_addr.s_addr = INADDR_ANY
    };
    bind(server_fd, (struct sockaddr *)&addr, sizeof(addr));
    listen(server_fd, 10);

    printf("回显服务器运行在端口 %d\n", PORT);

    while (1) {
        int client_fd = accept(server_fd, NULL, NULL);
        if (client_fd < 0) continue;

        int *fd_ptr = malloc(sizeof(int));
        *fd_ptr = client_fd;

        pthread_t tid;
        pthread_create(&tid, NULL, handle_client, fd_ptr);
        pthread_detach(tid);
    }

    return 0;
}
```

### 场景三：域名解析

```c
#include <stdio.h>
#include <string.h>
#include <netdb.h>
#include <arpa/inet.h>

int main(void) {
    const char *hostname = "www.example.com";

    struct addrinfo hints = {0};
    hints.ai_family = AF_INET;    // IPv4
    hints.ai_socktype = SOCK_STREAM;

    struct addrinfo *result;
    int ret = getaddrinfo(hostname, "80", &hints, &result);
    if (ret != 0) {
        fprintf(stderr, "域名解析失败: %s\n", gai_strerror(ret));
        return 1;
    }

    for (struct addrinfo *rp = result; rp != NULL; rp = rp->ai_next) {
        struct sockaddr_in *addr = (struct sockaddr_in *)rp->ai_addr;
        char ip_str[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &addr->sin_addr, ip_str, sizeof(ip_str));
        printf("IP 地址: %s\n", ip_str);
    }

    freeaddrinfo(result);
    return 0;
}
```

## 注意事项

### 字节序转换

网络传输使用大端字节序（网络字节序），主机可能使用小端字节序。必须使用转换函数：

```c
// 主机序转网络序
uint16_t net_port = htons(8080);   // 端口
uint32_t net_addr = htonl(0x7F000001); // IP地址

// 网络序转主机序
uint16_t host_port = ntohs(net_port);
uint32_t host_addr = ntohl(net_addr);
```

### 处理部分读写

TCP 是字节流协议，`read` 和 `write` 可能只处理部分数据：

```c
// 安全读取指定字节数
ssize_t read_full(int fd, void *buf, size_t count) {
    size_t total = 0;
    while (total < count) {
        ssize_t n = read(fd, (char *)buf + total, count - total);
        if (n <= 0) return n == 0 ? total : -1;
        total += n;
    }
    return total;
}

// 安全写入指定字节数
ssize_t write_full(int fd, const void *buf, size_t count) {
    size_t total = 0;
    while (total < count) {
        ssize_t n = write(fd, (const char *)buf + total, count - total);
        if (n <= 0) return -1;
        total += n;
    }
    return total;
}
```

### TIME_WAIT 状态

TCP 连接关闭后，主动关闭方会进入 TIME_WAIT 状态，持续约2分钟。在此期间端口无法复用。使用 `SO_REUSEADDR` 选项可以解决：

```c
int opt = 1;
setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
```

## 进阶用法

### I/O 多路复用（select）

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <netinet/in.h>
#include <sys/select.h>

#define MAX_CLIENTS 64

int main(void) {
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_port = htons(8080),
        .sin_addr.s_addr = INADDR_ANY
    };
    bind(server_fd, (struct sockaddr *)&addr, sizeof(addr));
    listen(server_fd, 10);

    int clients[MAX_CLIENTS] = {0};
    fd_set readfds;

    printf("select 服务器运行在端口 8080\n");

    while (1) {
        FD_ZERO(&readfds);
        FD_SET(server_fd, &readfds);
        int max_fd = server_fd;

        for (int i = 0; i < MAX_CLIENTS; i++) {
            if (clients[i] > 0) {
                FD_SET(clients[i], &readfds);
                if (clients[i] > max_fd) max_fd = clients[i];
            }
        }

        if (select(max_fd + 1, &readfds, NULL, NULL, NULL) < 0) continue;

        // 新连接
        if (FD_ISSET(server_fd, &readfds)) {
            int client_fd = accept(server_fd, NULL, NULL);
            for (int i = 0; i < MAX_CLIENTS; i++) {
                if (clients[i] == 0) { clients[i] = client_fd; break; }
            }
        }

        // 客户端数据
        for (int i = 0; i < MAX_CLIENTS; i++) {
            if (clients[i] > 0 && FD_ISSET(clients[i], &readfds)) {
                char buf[1024];
                ssize_t n = read(clients[i], buf, sizeof(buf));
                if (n <= 0) {
                    close(clients[i]);
                    clients[i] = 0;
                } else {
                    write(clients[i], buf, n); // 回显
                }
            }
        }
    }

    return 0;
}
```

### I/O 多路复用（epoll）

```c
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <netinet/in.h>
#include <sys/epoll.h>

#define MAX_EVENTS 64

int main(void) {
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in addr = {
        .sin_family = AF_INET,
        .sin_port = htons(8080),
        .sin_addr.s_addr = INADDR_ANY
    };
    bind(server_fd, (struct sockaddr *)&addr, sizeof(addr));
    listen(server_fd, 10);

    // 创建 epoll 实例
    int epfd = epoll_create1(0);

    // 注册服务器套接字
    struct epoll_event ev = { .events = EPOLLIN, .data.fd = server_fd };
    epoll_ctl(epfd, EPOLL_CTL_ADD, server_fd, &ev);

    struct epoll_event events[MAX_EVENTS];
    printf("epoll 服务器运行在端口 8080\n");

    while (1) {
        int nfds = epoll_wait(epfd, events, MAX_EVENTS, -1);

        for (int i = 0; i < nfds; i++) {
            if (events[i].data.fd == server_fd) {
                // 新连接
                int client_fd = accept(server_fd, NULL, NULL);
                ev.events = EPOLLIN;
                ev.data.fd = client_fd;
                epoll_ctl(epfd, EPOLL_CTL_ADD, client_fd, &ev);
            } else {
                // 客户端数据
                char buf[1024];
                ssize_t n = read(events[i].data.fd, buf, sizeof(buf));
                if (n <= 0) {
                    epoll_ctl(epfd, EPOLL_CTL_DEL, events[i].data.fd, NULL);
                    close(events[i].data.fd);
                } else {
                    write(events[i].data.fd, buf, n);
                }
            }
        }
    }

    return 0;
}
```
