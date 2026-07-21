---
order: 70
title: C++网络编程
module: cpp
category: C++
difficulty: intermediate
description: Socket编程与网络协议
author: fanquanpp
updated: '2026-06-14'
related:
  - cpp/C++图形编程
  - cpp/C++序列化
  - cpp/C++23与C++26新特性
  - cpp/C++与Python交互
prerequisites:
  - cpp/概述与环境配置
---

## 概述

C++ 网络编程是使用 C++ 通过网络协议进行数据通信的技术。最基础的方式是使用操作系统提供的 Socket API，它允许程序通过网络发送和接收数据。更高级的方式是使用第三方库如 Boost.Asio、libcurl 等，它们封装了底层细节，提供了更易用的接口。

为什么需要网络编程？几乎所有现代应用都需要网络通信。聊天应用需要收发消息，游戏需要同步玩家状态，Web 服务需要处理 HTTP 请求。C++ 网络编程让你能够构建高性能的网络应用，从简单的 TCP 客户端到高并发的服务器。

## 基础概念

**Socket**：网络通信的端点，由 IP 地址和端口号标识。可以理解为网络中的"插座"，程序通过它发送和接收数据。

**TCP**：传输控制协议，提供可靠的、有序的数据传输。适合需要确保数据完整性的场景，如文件传输、Web 请求。

**UDP**：用户数据报协议，提供不可靠但快速的数据传输。适合对实时性要求高但允许丢包的场景，如视频流、游戏。

**字节序**：多字节数据在内存中的存储顺序。网络传输使用大端序（Network Byte Order），而 x86 架构使用小端序。需要使用 `htonl`、`ntohl` 等函数转换。

**阻塞与非阻塞**：阻塞模式下，网络操作会等待完成才返回；非阻塞模式下，操作立即返回，需要轮询或使用事件通知机制。

## 快速上手

### TCP 客户端

```cpp
#include <iostream>
#include <string>
#include <cstring>

#ifdef _WIN32
    #include <winsock2.h>
    #include <ws2tcpip.h>
    #pragma comment(lib, "ws2_32.lib")
#else
    #include <sys/socket.h>
    #include <arpa/inet.h>
    #include <unistd.h>
    #include <netdb.h>
#endif

// 跨平台初始化和清理
class SocketInit {
public:
    SocketInit() {
#ifdef _WIN32
        WSADATA wsaData;
        WSAStartup(MAKEWORD(2, 2), &wsaData);
#endif
    }
    ~SocketInit() {
#ifdef _WIN32
        WSACleanup();
#endif
    }
};

int main() {
    SocketInit socketInit;  // 自动初始化和清理

    // 创建 TCP Socket
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock < 0) {
        std::cerr << "创建 Socket 失败" << std::endl;
        return -1;
    }

    // 设置服务器地址
    sockaddr_in serverAddr{};
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(8080);  // 端口号，转换为网络字节序
    inet_pton(AF_INET, "127.0.0.1", &serverAddr.sin_addr);  // IP 地址

    // 连接服务器
    if (connect(sock, (sockaddr*)&serverAddr, sizeof(serverAddr)) < 0) {
        std::cerr << "连接服务器失败" << std::endl;
        return -1;
    }

    std::cout << "已连接到服务器" << std::endl;

    // 发送数据
    std::string message = "你好，服务器！";
    send(sock, message.c_str(), message.size(), 0);

    // 接收数据
    char buffer[1024] = {};
    int bytesReceived = recv(sock, buffer, sizeof(buffer) - 1, 0);
    if (bytesReceived > 0) {
        buffer[bytesReceived] = '\0';
        std::cout << "收到回复: " << buffer << std::endl;
    }

    // 关闭 Socket
#ifdef _WIN32
    closesocket(sock);
#else
    close(sock);
#endif

    return 0;
}
```

### TCP 服务器

```cpp
#include <iostream>
#include <cstring>
#include <vector>

int main() {
    SocketInit socketInit;

    // 创建监听 Socket
    int serverSock = socket(AF_INET, SOCK_STREAM, 0);
    if (serverSock < 0) {
        std::cerr << "创建 Socket 失败" << std::endl;
        return -1;
    }

    // 设置地址复用（避免重启时端口被占用）
    int opt = 1;
    setsockopt(serverSock, SOL_SOCKET, SO_REUSEADDR, (const char*)&opt, sizeof(opt));

    // 绑定地址和端口
    sockaddr_in serverAddr{};
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;  // 监听所有网络接口
    serverAddr.sin_port = htons(8080);

    if (bind(serverSock, (sockaddr*)&serverAddr, sizeof(serverAddr)) < 0) {
        std::cerr << "绑定端口失败" << std::endl;
        return -1;
    }

    // 开始监听，backlog 为等待连接的队列长度
    if (listen(serverSock, 5) < 0) {
        std::cerr << "监听失败" << std::endl;
        return -1;
    }

    std::cout << "服务器已启动，等待连接..." << std::endl;

    while (true) {
        // 接受客户端连接
        sockaddr_in clientAddr{};
        int clientAddrLen = sizeof(clientAddr);
        int clientSock = accept(serverSock, (sockaddr*)&clientAddr, &clientAddrLen);

        if (clientSock < 0) {
            std::cerr << "接受连接失败" << std::endl;
            continue;
        }

        // 获取客户端地址
        char clientIP[INET_ADDRSTRLEN];
        inet_ntop(AF_INET, &clientAddr.sin_addr, clientIP, INET_ADDRSTRLEN);
        std::cout << "客户端连接: " << clientIP << ":" << ntohs(clientAddr.sin_port) << std::endl;

        // 接收数据
        char buffer[1024] = {};
        int bytesReceived = recv(clientSock, buffer, sizeof(buffer) - 1, 0);
        if (bytesReceived > 0) {
            buffer[bytesReceived] = '\0';
            std::cout << "收到消息: " << buffer << std::endl;

            // 发送回复
            std::string reply = "服务器已收到你的消息";
            send(clientSock, reply.c_str(), reply.size(), 0);
        }

        // 关闭客户端连接
#ifdef _WIN32
        closesocket(clientSock);
#else
        close(clientSock);
#endif
    }

    return 0;
}
```

## 详细用法

### UDP 通信

```cpp
// UDP 服务器
void udpServer() {
    int sock = socket(AF_INET, SOCK_DGRAM, 0);  // SOCK_DGRAM 表示 UDP

    sockaddr_in serverAddr{};
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;
    serverAddr.sin_port = htons(9090);

    bind(sock, (sockaddr*)&serverAddr, sizeof(serverAddr));

    std::cout << "UDP 服务器已启动" << std::endl;

    while (true) {
        char buffer[1024] = {};
        sockaddr_in clientAddr{};
        int clientAddrLen = sizeof(clientAddr);

        // 接收数据（同时获取发送方地址）
        int bytesReceived = recvfrom(sock, buffer, sizeof(buffer) - 1, 0,
            (sockaddr*)&clientAddr, &clientAddrLen);

        if (bytesReceived > 0) {
            buffer[bytesReceived] = '\0';
            std::cout << "收到: " << buffer << std::endl;

            // 向发送方回复
            std::string reply = "UDP 回复";
            sendto(sock, reply.c_str(), reply.size(), 0,
                (sockaddr*)&clientAddr, clientAddrLen);
        }
    }
}

// UDP 客户端
void udpClient() {
    int sock = socket(AF_INET, SOCK_DGRAM, 0);

    sockaddr_in serverAddr{};
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(9090);
    inet_pton(AF_INET, "127.0.0.1", &serverAddr.sin_addr);

    // UDP 不需要连接，直接发送
    std::string message = "UDP 你好";
    sendto(sock, message.c_str(), message.size(), 0,
        (sockaddr*)&serverAddr, sizeof(serverAddr));

    // 接收回复
    char buffer[1024] = {};
    recvfrom(sock, buffer, sizeof(buffer) - 1, 0, nullptr, nullptr);
    std::cout << "收到: " << buffer << std::endl;
}
```

### 使用 Boost.Asio

Boost.Asio 是 C++ 最流行的异步网络库：

```cpp
#include <boost/asio.hpp>
#include <iostream>

using boost::asio::ip::tcp;

// 同步 TCP 客户端
void syncClient() {
    boost::asio::io_context ioContext;

    // 解析主机名和端口
    tcp::resolver resolver(ioContext);
    auto endpoints = resolver.resolve("127.0.0.1", "8080");

    // 连接服务器
    tcp::socket socket(ioContext);
    boost::asio::connect(socket, endpoints);

    std::cout << "已连接到服务器" << std::endl;

    // 发送数据
    std::string message = "你好，Boost.Asio！";
    boost::asio::write(socket, boost::asio::buffer(message));

    // 接收数据
    char reply[1024] = {};
    size_t replyLength = socket.read_some(boost::asio::buffer(reply));
    std::cout << "收到: " << std::string(reply, replyLength) << std::endl;
}

// 异步 TCP 服务器
class Session : public std::enable_shared_from_this<Session> {
    tcp::socket socket_;
    char buffer_[1024];

public:
    Session(tcp::socket socket) : socket_(std::move(socket)) {}

    void start() {
        doRead();  // 开始异步读取
    }

private:
    void doRead() {
        auto self = shared_from_this();
        socket_.async_read_some(boost::asio::buffer(buffer_),
            [this, self](boost::system::error_code ec, size_t length) {
                if (!ec) {
                    std::cout << "收到: " << std::string(buffer_, length) << std::endl;
                    doWrite(length);  // 回显数据
                }
            });
    }

    void doWrite(size_t length) {
        auto self = shared_from_this();
        boost::asio::async_write(socket_, boost::asio::buffer(buffer_, length),
            [this, self](boost::system::error_code ec, size_t) {
                if (!ec) {
                    doRead();  // 继续读取
                }
            });
    }
};

class AsyncServer {
    boost::asio::io_context& ioContext_;
    tcp::acceptor acceptor_;

public:
    AsyncServer(boost::asio::io_context& ioContext, short port)
        : ioContext_(ioContext)
        , acceptor_(ioContext, tcp::endpoint(tcp::v4(), port))
    {
        doAccept();  // 开始接受连接
    }

private:
    void doAccept() {
        acceptor_.async_accept(
            [this](boost::system::error_code ec, tcp::socket socket) {
                if (!ec) {
                    // 为每个连接创建一个 Session
                    std::make_shared<Session>(std::move(socket))->start();
                }
                doAccept();  // 继续接受下一个连接
            });
    }
};

// 使用异步服务器
int main() {
    boost::asio::io_context ioContext;
    AsyncServer server(ioContext, 8080);
    std::cout << "异步服务器已启动" << std::endl;
    ioContext.run();  // 运行事件循环
    return 0;
}
```

### HTTP 请求（使用 libcurl）

```cpp
#include <curl/curl.h>
#include <iostream>
#include <string>

// 回调函数：处理接收到的数据
size_t writeCallback(void* contents, size_t size, size_t nmemb, std::string* userp) {
    size_t totalSize = size * nmemb;
    userp->append((char*)contents, totalSize);
    return totalSize;
}

// 发送 GET 请求
std::string httpGet(const std::string& url) {
    CURL* curl = curl_easy_init();
    std::string response;

    if (curl) {
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);  // 超时 10 秒

        CURLcode res = curl_easy_perform(curl);
        if (res != CURLE_OK) {
            std::cerr << "请求失败: " << curl_easy_strerror(res) << std::endl;
        }

        curl_easy_cleanup(curl);
    }

    return response;
}

// 发送 POST 请求
std::string httpPost(const std::string& url, const std::string& data) {
    CURL* curl = curl_easy_init();
    std::string response;

    if (curl) {
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_POST, 1L);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, writeCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);

        // 设置请求头
        struct curl_slist* headers = nullptr;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

        curl_easy_perform(curl);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }

    return response;
}

int main() {
    curl_global_init(CURL_GLOBAL_DEFAULT);

    // GET 请求
    std::string response = httpGet("https://httpbin.org/get");
    std::cout << "GET 响应: " << response << std::endl;

    // POST 请求
    std::string postResponse = httpPost("https://httpbin.org/post",
        "{\"name\":\"张三\",\"age\":25}");
    std::cout << "POST 响应: " << postResponse << std::endl;

    curl_global_cleanup();
    return 0;
}
```

## 常见场景

### 简单的聊天服务器

```cpp
// 多客户端聊天服务器（使用 select 多路复用）
#include <set>

void chatServer() {
    int serverSock = socket(AF_INET, SOCK_STREAM, 0);

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_addr.s_addr = INADDR_ANY;
    addr.sin_port = htons(8080);

    bind(serverSock, (sockaddr*)&addr, sizeof(addr));
    listen(serverSock, 5);

    std::set<int> clients;  // 所有已连接的客户端

    while (true) {
        fd_set readFds;
        FD_ZERO(&readFds);
        FD_SET(serverSock, &readFds);  // 监听服务器 Socket

        int maxFd = serverSock;
        for (int client : clients) {
            FD_SET(client, &readFds);
            maxFd = std::max(maxFd, client);
        }

        // 等待任一 Socket 有数据可读
        select(maxFd + 1, &readFds, nullptr, nullptr, nullptr);

        // 检查是否有新连接
        if (FD_ISSET(serverSock, &readFds)) {
            int clientSock = accept(serverSock, nullptr, nullptr);
            clients.insert(clientSock);
            std::cout << "新客户端连接，当前人数: " << clients.size() << std::endl;
        }

        // 检查各客户端是否有消息
        char buffer[1024];
        for (auto it = clients.begin(); it != clients.end(); ) {
            if (FD_ISSET(*it, &readFds)) {
                int bytes = recv(*it, buffer, sizeof(buffer) - 1, 0);
                if (bytes <= 0) {
                    // 客户端断开
                    it = clients.erase(it);
                    continue;
                }
                buffer[bytes] = '\0';

                // 广播给所有其他客户端
                for (int other : clients) {
                    if (other != *it) {
                        send(other, buffer, bytes, 0);
                    }
                }
            }
            ++it;
        }
    }
}
```

## 注意事项

**字节序转换**：网络传输多字节整数时必须使用 `htonl`/`ntohl`/`htons`/`ntohs` 进行字节序转换，否则在不同架构的机器间通信会出错。

**粘包问题**：TCP 是流式协议，不保证一次 `recv` 对应一次 `send`。需要在应用层定义消息边界，如使用长度前缀或分隔符。

**资源释放**：Socket 是系统资源，使用完毕后必须关闭。建议使用 RAII 封装 Socket 的生命周期。

**跨平台差异**：Windows 和 Linux 的 Socket API 有细微差异（如 `closesocket` vs `close`，`SOCKADDR` vs `sockaddr`）。使用条件编译或跨平台库处理。

**并发安全**：多线程环境下操作同一 Socket 需要加锁。推荐使用 Boost.Asio 的异步模型，避免多线程竞争。

## 进阶用法

### 使用 io_uring（Linux 5.1+）

```cpp
// io_uring 是 Linux 的高性能异步 I/O 接口
// 比 epoll 更高效，适合高并发网络服务

#include <liburing.h>

void ioUringServer() {
    struct io_uring ring;
    io_uring_queue_init(256, &ring, 0);

    // 创建监听 Socket
    int serverSock = socket(AF_INET, SOCK_STREAM, 0);
    // ... bind, listen ...

    // 提交 accept 请求
    struct io_uring_sqe* sqe = io_uring_get_sqe(&ring);
    io_uring_prep_accept(sqe, serverSock, nullptr, nullptr, 0);
    io_uring_submit(&ring);

    // 等待完成
    struct io_uring_cqe* cqe;
    io_uring_wait_cqe(&ring, &cqe);
    int clientSock = cqe->res;
    io_uring_cqe_seen(&ring, cqe);

    // 提交 recv 请求
    char buffer[1024];
    sqe = io_uring_get_sqe(&ring);
    io_uring_prep_recv(sqe, clientSock, buffer, sizeof(buffer), 0);
    io_uring_submit(&ring);

    io_uring_queue_exit(&ring);
}
```
