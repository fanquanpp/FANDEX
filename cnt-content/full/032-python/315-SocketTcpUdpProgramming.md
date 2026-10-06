---
order: 340
title: socket 与 socketserver：TCP/UDP 网络编程
module: 'python'
category: 后端技术
difficulty: beginner
description: Python 标准库网络编程地基——TCP 客户端/服务器最小回路、UDP 收发、粘包与分帧（recv 循环与长度前缀）、socketserver 的 ThreadingMixIn 并发模型；逐行解释 setsockopt、shutdown 与 close 的语义差异，内网探活、设备心跳、HTTP 客户端底层地基三个工程场景。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Python 标准库的「套接字编程」——`socket`（操作系统网络接口的薄封装）与 `socketserver`（把 accept/线程管理模板化的服务器脚手架）。它是 HTTP 之下的一层：所有「发请求」「起服务」的库，最底层都在调这两个模块。
- **解决什么问题**：`http.client` 只能说 HTTP 这一种方言，但内网探活、设备心跳、自定义二进制协议（游戏、IoT、行情）没有现成协议可用；排查「为什么 requests 偶发 ConnectionResetError」「为什么recv 到的数据不完整」这类问题时，不懂 socket 层就无从下手。此外 HTTP 服务「请求-响应」的心智模型盖不住「服务端主动推送」的场景，那需要自己管理一条长连接——这正是本篇要给的底层地基。
- **什么时候用到**：写探活/心跳/端口扫描类运维脚本、实现私有 TCP 协议、给上层 HTTP 库的异常找到根因、理解 Web 框架与数据库驱动最终依赖的网络模型。上层封装的分工：HTTP 客户端见 [HTTP 客户端](/python/320-HttpClient)，TLS 层见 [SSL 与加密](/python/360-SslCrypto)，异步 socket（asyncio 的 `open_connection`/`start_server`）见 [协程与 asyncio](/python/660-CoroutineAsyncio)；线程模型细节见 [多线程与多进程](/python/630-MultiprocessingMultithreading)。

## TCP 最小回路：六步生命周期

### 心智模型：socket 是「文件句柄式的通信端点」

socket 是操作系统提供的一个通信端点，API 刻意模仿文件：创建、读写（send/recv）、关闭。TCP 的一对连接由**五元组**（源 IP、源端口、目的 IP、目的端口、协议）唯一标识——这就是一台服务器 80 端口能同时服务成千上万个客户端的原因：每个客户端的五元组不同。理解了这一点，`accept()` 返回**新** socket 而不是复用监听 socket 这件事就顺理成章：监听 socket 只负责「接电话」，每个来电生成一个专属「通话线路」。

TCP 客户端与服务器的最小回路（先用单次收发建立直觉，缺陷后文逐个修）：

```python
# server.py —— 最小 TCP 服务器
import socket

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
    server.bind(("127.0.0.1", 9000))       # 绑定本机地址与端口
    server.listen()                        # 进入监听，内核开始排队握手
    print("listening on 9000")
    conn, addr = server.accept()           # 阻塞直到一个客户端完成握手
    with conn:
        print("connected by", addr)
        data = conn.recv(1024)             # 最多读 1024 字节
        conn.sendall(data.upper())         # 原样回写（echo）

# client.py —— 最小 TCP 客户端
import socket

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as client:
    client.connect(("127.0.0.1", 9000))    # 三次握手在这里发生
    client.sendall(b"hello socket")
    echo = client.recv(1024)
    print(echo)                            # b'HELLO SOCKET'
```

逐行解释服务器侧：`socket.AF_INET`（IPv4 地址族）与 `SOCK_STREAM`（字节流语义 = TCP）的组合是九成场景的固定搭配；换成 `AF_INET6` 得到 IPv6、`SOCK_DGRAM` 得到 UDP。`bind` 声明「这个端口归我」；`listen()` 让内核开始完成三次握手并把完成的连接放进**就绪队列**（队列长度即 `listen(n)` 的 n）；`accept()` 从队列取出一条，返回 `(连接专用 socket, 对方地址)`。客户端侧 `connect` 返回即握手完成，之后双方在这个 socket 上对等收发。为什么两端都要 `with`：socket 句柄与文件句柄一样是有限资源，异常路径漏关会泄漏，多次泄漏后 `OSError: [Errno 24] Too many open files`。

### setsockopt：SO_REUSEADDR 为什么几乎是必写项

服务器重启时常见 `OSError: [WinError 10048] Only one usage of each socket address`（Linux 上是 `Address already in use`）——上一次的连接可能还有残留的 TIME_WAIT 状态占着端口。解决方式是在 `bind` 之前设置选项：

```python
server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)   # bind 前设置
server.bind(("0.0.0.0", 9000))
```

逐段解释：`SOL_SOCKET` 表示选项作用于 socket 层本身；`SO_REUSEADDR` 告诉内核「允许复用处于 TIME_WAIT 的本地地址」。为什么必须在 `bind` 前：选项改变的是绑定阶段的判定规则，绑定之后再设就晚了。两个易错点要标注：其一，这个选项**不是**「允许两个进程同时监听一个端口」（那是 `SO_REUSEPORT`，语义不同）；其二，它只在调试/频繁重启的服务进程上有意义，Linux 上某些发行版默认已开启等效行为，Windows 上绝大多数时候必需。换个写法会发生什么：不写它，开发时每次 Ctrl-C 重启都有概率绑不上端口，非常消磨耐心；写 `SO_REUSEPORT` 则会静默让多个进程负载均衡同一端口，行为差异巨大且难排查。

另外两个常用的传输层选项：`TCP_NODELAY`（禁用 Nagle 小包合并算法，交互式协议低延迟必备）与 `SO_KEEPALIVE`（空闲连接的心跳探测，见下文心跳例子）。

### recv 的真相：它不保证读满

TCP 是**字节流**协议：它只保证字节按序到达，不保证「一次 send 对应一次 recv」。`recv(1024)` 的语义是「**最多**返回 1024 字节」，返回多少取决于内核缓冲区当下有多少。因此「读一条完整消息」必须循环：

```python
def recv_until(conn: socket.socket, terminator: bytes) -> bytes:
    """读到出现终止符为止（面向行/分隔符协议）。"""
    buf = bytearray()
    while True:
        chunk = conn.recv(4096)
        if not chunk:                      # 返回 b''：对端关闭了连接
            raise ConnectionError("对端提前断开")
        buf += chunk
        if terminator in buf:
            payload, _, rest = bytes(buf).partition(terminator)
            return payload

# 返回 b'' 之外，recv 还可能在阻塞中抛 ConnectionResetError
# （对端崩溃、中间设备 RST）或 socket.timeout（设置了超时后没等到数据）
```

逐段解释：`if not chunk` 是 TCP 编程第一守则——**`recv` 返回空字节串的唯一含义是对端正常关闭**；把它当成「暂时没数据」继续循环，就是 CPU 空转死循环的经典来源。`socket.timeout`（3.10 起别名 `TimeoutError`）需要配合 `conn.settimeout(5.0)` 才会发生：不设超时的 socket 是无限阻塞的，探活脚本里一个不回包的目标就能卡死整个线程。

### 粘包与分帧：长度前缀协议

「粘包」不是 TCP 的 bug，而是它的本性：发送方两次 `send` 的数据可能被合并成一次到达（发送端 Nagle 合并、接收端缓冲堆积）。应用层必须自己定义「消息边界」，两种标准方案——分隔符（如 `\n`，Redis 协议风格）与**长度前缀**（先 4 字节长度、再正文，HTTP/2 与大多数二进制协议的风格）。长度前缀的完整实现：

```python
import socket
import struct

HEADER = struct.Struct("!I")           # ! 网络字节序（大端），I 4 字节无符号整数

def send_msg(conn: socket.socket, payload: bytes) -> None:
    conn.sendall(HEADER.pack(len(payload)) + payload)

def recv_exact(conn: socket.socket, n: int) -> bytes:
    """精确读 n 字节——recv 不保证读满，必须循环凑。"""
    buf = bytearray()
    while len(buf) < n:
        chunk = conn.recv(min(n - len(buf), 65536))
        if not chunk:
            raise ConnectionError(f"对端断开，还差 {n - len(buf)} 字节")
        buf += chunk
    return bytes(buf)

def recv_msg(conn: socket.socket) -> bytes:
    raw_len = recv_exact(conn, HEADER.size)      # 先读 4 字节头
    (length,) = HEADER.unpack(raw_len)
    if length > 64 * 1024 * 1024:                # 长度上限：防伪造头部耗尽内存
        raise ValueError(f"消息过长: {length}")
    return recv_exact(conn, length)
```

逐段讲解每个「为什么」：`"!I"` 的 `!` 是网络字节序——跨机器通信必须约定字节序，x86 是小端、网络协议标准是大端，两端平台不同又不写 `!` 时，同样 4 字节解出的长度差着数量级，这是协议联调时「我发的 10 你收到 167772160」的元凶。`sendall` 与 `send` 的区别：`send` 可能只发出去一部分（缓冲区满时返回已发字节数），`sendall` 内部循环保证全部发出——业务代码永远用 `sendall`。`recv_exact` 为什么要 `min(n - len(buf), 65536)`：上限 65536 防止对端声明一个大长度而实际慢慢挤牙膏时，`recv(n)` 一直阻塞到凑满——分块读让超时机制（`settimeout` 作用于每次 recv）有机会生效。长度上限检查为什么必须有：如果不检查，攻击者（或有 bug 的对端）发一个声明 4 GB 长度的头，`recv_exact` 会试图为它攒 4 GB 缓冲——「不可信输入不决定内存大小」，与 [归档与压缩](/python/305-FileArchiveCompression) 里防 zip 炸弹是同一条原则。换成换行符分帧会发生什么：实现更简单（`makefile` 一行就有），但正文含 `\n`（二进制、序列化数据）时协议直接失效——长度前缀对字节内容零假设，是二进制协议的默认选型。

### 例子一（真实工程）：内网服务探活脚本

运维巡检要批量确认一组内网端口的存活与响应耗时。TCP 探活的本质是「握手成功即存活」——不需要任何应用层对话：

```python
import socket
import time

def check_tcp(host: str, port: int, timeout: float = 2.0) -> tuple[bool, float]:
    """返回 (是否存活, 握手耗时 ms)。探活专用 socket 用完即关。"""
    start = time.perf_counter()
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True, (time.perf_counter() - start) * 1000
    except (ConnectionRefusedError, socket.timeout, OSError):
        # refused = 端口没人听；timeout = 网络不通或防火墙丢包；OSError 兜 DNS 失败等
        return False, (time.perf_counter() - start) * 1000

SERVICES = [("db-01.internal", 3306), ("cache-01.internal", 6379),
            ("web-01.internal", 8080)]
for host, port in SERVICES:
    alive, ms = check_tcp(host, port)
    print(f"{host}:{port} -> {'存活' if alive else '失联'} ({ms:.0f} ms)")
```

逐段解释：`socket.create_connection` 是比裸 `socket()` + `connect` 更推荐的高层入口——它内部处理了 `getaddrinfo` 解析（同一主机名可能解析出 IPv4/IPv6 多个地址并依次尝试），裸写法只试第一个地址，IPv6 环境下容易「本机好的、同事机器连不上」。`timeout` 同时约束解析与握手两个阶段。易错点：探活 socket 只握了个手就关，对端（尤其某些 TCP 栈）会在日志里记一条「连接后未发数据即断开」——探活风暴会污染应用日志；规范的探活协议（如 Redis 的 PING、MySQL 的握手包）应该探到应用层。为什么异常分开写而不是一个 `except OSError`：refused、timeout、DNS 失败三种根因的处置完全不同（服务挂了 vs 网络断了 vs 配置错了），巡检报表要区分它们。

### 例子二（真实工程）：设备心跳服务器（socketserver + ThreadingMixIn）

几十台采集设备各建一条长连接，周期性上报心跳，服务端要同时伺候所有连接。手写 accept 循环 + 每连接一线程能做，但 `socketserver` 把这套模板（accept、线程池、异常兜底）已经写好了：

```python
import socketserver
import threading
import time

class HeartbeatHandler(socketserver.BaseRequestHandler):
    """每个连接一个实例，setup/handle/finish 由框架按序调用。"""

    def handle(self) -> None:
        addr = self.request.getpeername()
        print(f"[{addr}] 设备上线")
        self.request.settimeout(35.0)           # 心跳周期 30s，超时给 5s 余量
        while True:
            try:
                data = self.request.recv(1024)
            except socket.timeout:
                print(f"[{addr}] 35 秒无心跳，判离线")
                break
            if not data:                        # 对端正常下线
                break
            print(f"[{addr}] 心跳 {data.decode(errors='replace').strip()}")

    def finish(self) -> None:
        print(f"[{self.request.getpeername()}] 连接清理")

class HeartbeatServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True                  # 等效 SO_REUSEADDR（见前文）
    daemon_threads = True                       # 主进程退出时不等这些线程

if __name__ == "__main__":
    with HeartbeatServer(("0.0.0.0", 9100), HeartbeatHandler) as server:
        print(f"心跳服务器就绪，主线程 {threading.current_thread().name}")
        server.serve_forever()                  # 阻塞在 accept 循环
```

逐段解释并发模型：`ThreadingMixIn` 的作用是把「每 accept 一个连接就为它起一个线程跑 Handler」混入 `TCPServer`——没有它，`TCPServer` 是**单连接串行**的（`serve_forever` 在 `handle` 返回前不会 accept 下一个），第二个设备永远等不到上线。这就是「MixIn 并发模型」：基类管生命周期、MixIn 管并发策略，还有 `ForkingMixIn`（每连接一进程，Windows 不可用）与 `UnixStreamServer`（域套接字）等组合。`daemon_threads = True` 的取舍：主进程退出时直接弃掉所有连接线程——心跳场景无所谓（设备会重连），但涉及事务的服务绝不能这样（半途连接被腰斩）。逐行看超时设计：`settimeout(35)` 把「设备掉线但 TCP 未感知」的死连接问题转成了可处理的异常——TCP 只有在主动断开时才通知应用，拔网线这类静默失联必须靠**应用层心跳超时**兜底（内核层的 `SO_KEEPALIVE` 默认两小时才动手，通常来不及）。为什么 handler 里 `while True`：一条连接的服务期就是 handler 的生命周期，返回即断连——设备每 30 秒发一次心跳、连接保持长连，而不是每心跳建一次连接（TCP 握手 + TLS（若加密）的开销在低功耗设备上不可忽视）。

规模边界要诚实标注：线程模型的并发上限在几百到一两千连接（每线程默认栈 8 MB 级别），设备量级再往上要换 epoll 模型（`selectors` 模块）或 asyncio（见 [协程与 asyncio](/python/660-CoroutineAsyncio)）——`socketserver` 是中小规模与脚手架教学的最优解，不是无限扩展方案。

### 例子三（真实工程）：给 HTTP 客户端补底层地基

320 篇的 `http.client` 抛出 `ConnectionResetError` / `RemoteDisconnected` 时，日志里往往没有更多信息。写一个「裸 HTTP GET」看穿封装，之后遇到上层异常就能定位到是握手、发送还是等待响应阶段出的问题：

```python
import socket

def raw_get(host: str, path: str, timeout: float = 5.0) -> str:
    """手写一次 HTTP/1.0 GET：看清 HTTP 在 TCP 上长什么样。"""
    with socket.create_connection((host, 80), timeout=timeout) as sock:
        request = (
            f"GET {path} HTTP/1.0\r\n"
            f"Host: {host}\r\n"
            f"Connection: close\r\n"
            f"\r\n"
        )
        sock.sendall(request.encode("ascii"))       # 请求头即普通字节
        response = bytearray()
        while True:
            chunk = sock.recv(4096)
            if not chunk:                            # Connection: close：对端关连接即响应结束
                break
            response += chunk
    text = bytes(response).decode("utf-8", errors="replace")
    head, _, body = text.partition("\r\n\r\n")       # 空行分隔头部与正文
    status = head.splitlines()[0]
    print(status)                                    # HTTP/1.1 200 OK
    return body

# body = raw_get("httpbin.org", "/get")
```

逐段解释：HTTP 报文就是 `\r\n` 分行的文本 + 空行分界——「应用层协议是字节流上的约定」在这里具象化。`HTTP/1.0` + `Connection: close` 是刻意简化：1.0 默认响应完就关连接，响应结束的判定退化为「`recv` 到空」，躲开了 1.1 keep-alive 的 `Content-Length`/`chunked` 分帧复杂度（那正是 320 篇里 `http.client` 替你做的事）。这个实验同时解释了一个高频线上问题：**为什么 requests 偶发 `ConnectionResetError`**——服务端 keep-alive 超时主动关闭与客户端恰好复用连接存在竞态，裸 socket 视角下这是「对端在 recv 中途发了 RST」的正常现象，重试即可。把这套理解接回 320：`http.client` 的超时参数、重试边界、连接池行为，全部建立在今天这些原语之上。

## UDP：无连接的数据报

UDP 没有 connect/accept、没有顺序与重传保证，`sendto`/`recvfrom` 直接与地址对话：

```python
import socket

# 接收方
def udp_receiver() -> None:
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        s.bind(("0.0.0.0", 9200))
        while True:
            data, addr = s.recvfrom(2048)      # 数据报有边界，一次 recv 一条
            print(f"[{addr}] {data.decode(errors='replace')}")

# 发送方
def udp_sender() -> None:
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
        for i in range(3):
            s.sendto(f"metric cpu={50 + i}".encode(), ("127.0.0.1", 9200))
```

心智模型与选型：UDP 数据报有**边界**（一次 send 一条 recv，天然不粘包——注意这与 TCP 相反），但**不保证送达、不保证顺序**。选它的场景：周期性、可容忍丢失的数据（指标上报、心跳、DNS、游戏位置同步）——丢一帧无所谓，下一帧马上来；选 TCP 的场景：内容不能丢的传输（文件、请求-响应、日志归档）。UDP 上想要可靠，就得自己实现重传与排序（QUIC 做的事），工程上通常不如直接用 TCP。两个易错点：其一，UDP 的 `recvfrom` 缓冲区小于数据报时**多出部分直接丢弃**且无告警，2048 是对内网指标类报文的稳妥值；其二，UDP 没有「连接」，`recvfrom` 会收到**任何人**发到这个端口的包，来源校验（addr 白名单或报文内认证字段）是协议自己的责任。

### shutdown 与 close：半关闭的语义差异

`close()` 与 `shutdown()` 的区别是 socket 面试高频题，也是真实协议实现里的必要知识：

```python
# close(s)：引用计数减一，减到零才真正关闭；两端双向通道全拆
# shutdown(HOW)：立即施加，不管还有多少引用
import socket

SHUT_WR = socket.SHUT_WR

def demo_half_close(host: str, port: int) -> None:
    with socket.create_connection((host, port)) as s:
        s.sendall(b"final request")
        s.shutdown(socket.SHUT_WR)     # 发送侧关闭：对端 recv 到 b''（收到 EOF）
        # 但接收侧还开着：还能继续收对端的响应
        reply = bytearray()
        while True:
            chunk = s.recv(4096)
            if not chunk:
                break
            reply += chunk
        print(bytes(reply).decode(errors="replace"))
```

逐段对比：`shutdown(SHUT_WR)` 只关「我不再发」，对端会立刻 `recv` 到 `b''`（流式 EOF），但我方仍可收——这叫**半关闭**，是「请求完就告诉服务端我发完了，但响应还没收完」类协议的标准手法（如某些邮件/文件传输协议）。`close()` 则是双向全关。另一个关键差异：`close` 受引用计数影响（多线程共享 socket 时一处 close 别处仍持有），`shutdown` 立即生效于线路。换成只调 `close` 会发生什么：对端若依赖「EOF 表示请求结束」的协议（比如一些按流读取的服务），收不到 EOF 就一直等，最后双方互相等待超时——很多「明明发完了对方却说超时」的 bug 根因在此。

## 动手实践

练习一（预测题）：客户端连续两次 `sendall`（各 10 字节）后，服务器一次 `recv(65536)` 会读到多少字节？`recv(8)` 呢？

提示：TCP 是字节流，边界由谁决定？

<details>
<summary>参考实现</summary>

第一次：**最多 20 字节**——两次 send 的数据大概率已在内核缓冲区合流，一次 recv 把现有内容全带走（也可能只有 10 字节，取决于调度时机——这正是「粘包」不确定性的体现）。第二次：恰好 8 字节，剩下的 12 字节留在缓冲区等下一次 recv。结论：TCP 的 recv 返回量只取决于「当下有多少」与「你要多少」的较小值，消息边界必须应用层自己定义。若把两端换成 UDP，答案完全不同：两个数据报必然对应两次 recvfrom，且 `recv(8)` 会把第二个数据报截断成 8 字节、其余 2 字节**直接丢弃**。
</details>

练习二（实战题）：实现一个基于长度前缀协议的网络时间服务：客户端发一条空消息，服务器回 `struct` 打包的当前时间戳；客户端解析并打印。写全 send_msg/recv_msg 两端代码并自测。

提示：复用本篇 `HEADER`/`recv_exact`/`recv_msg`；时间戳用 `time.time()` 的 8 字节 double（`struct` 格码 `!d`）。

<details>
<summary>参考实现</summary>

```python
import socket
import struct
import threading
import time

HEADER = struct.Struct("!I")
TS = struct.Struct("!d")

def recv_exact(conn: socket.socket, n: int) -> bytes:
    buf = bytearray()
    while len(buf) < n:
        chunk = conn.recv(min(n - len(buf), 65536))
        if not chunk:
            raise ConnectionError("对端断开")
        buf += chunk
    return bytes(buf)

def recv_msg(conn: socket.socket) -> bytes:
    (length,) = HEADER.unpack(recv_exact(conn, HEADER.size))
    return recv_exact(conn, length)

def send_msg(conn: socket.socket, payload: bytes) -> None:
    conn.sendall(HEADER.pack(len(payload)) + payload)

def server() -> None:
    with socket.socket() as srv:
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        srv.bind(("127.0.0.1", 9300))
        srv.listen()
        conn, _ = srv.accept()
        with conn:
            recv_msg(conn)                       # 收到请求（内容不关心）
            send_msg(conn, TS.pack(time.time()))

def client() -> float:
    with socket.create_connection(("127.0.0.1", 9300), timeout=3) as c:
        send_msg(c, b"now")
        return TS.unpack(recv_msg(c))[0]

t = threading.Thread(target=server, daemon=True)
t.start()
time.sleep(0.3)                                  # 等服务器就绪
print(f"服务器时间: {time.ctime(client())}")
```

验证点：两端对长度头都用 `!I`、对时间戳都用 `!d`——字节序与格式码是协议双方的合同，任何一端换了写法（比如 `d` 不带 `!`），解出的就是乱码而非报错，联调时要先核对 struct 格式。
</details>

练习三（实战题）：给心跳服务器加「在线设备表」：`HeartbeatHandler` 上线时登记设备，超时/下线时移除，另起线程每 10 秒打印当前在线列表。注意多线程并发访问注册表的锁。

提示：注册表用 `dict` + `threading.Lock`（线程模型见 630 篇）；`setup()` 与 `finish()` 分别是上线/下线的钩子。

<details>
<summary>参考实现</summary>

```python
import socketserver
import threading
import time

DEVICES: dict[str, float] = {}
LOCK = threading.Lock()

def register(addr: tuple, ) -> None:
    with LOCK:
        DEVICES[f"{addr[0]}:{addr[1]}"] = time.time()

def unregister(addr: tuple) -> None:
    with LOCK:
        DEVICES.pop(f"{addr[0]}:{addr[1]}", None)

def reporter() -> None:
    while True:
        time.sleep(10)
        with LOCK:
            print(f"在线设备 {len(DEVICES)} 台: {sorted(DEVICES)}")

class Handler(socketserver.BaseRequestHandler):
    def setup(self) -> None:
        register(self.request.getpeername())     # 上线钩子

    def handle(self) -> None:
        self.request.settimeout(35.0)
        try:
            while self.request.recv(1024):
                register(self.request.getpeername())   # 刷新活跃时间
        except socket.timeout:
            pass

    def finish(self) -> None:
        unregister(self.request.getpeername())   # 下线钩子（含超时路径）

class Srv(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

if __name__ == "__main__":
    threading.Thread(target=reporter, daemon=True).start()
    with Srv(("0.0.0.0", 9100), Handler) as srv:
        srv.serve_forever()
```

为什么处处要锁：每个连接在独立线程里跑，`DEVICES` 是共享可变状态——无锁并发下「登记与打印」可能交错，dict 虽然单个操作原子（GIL 保证），但「检查再修改」的复合逻辑仍会竞态（并发理论见 630 篇与 640 篇）。用 `finish()` 统一收口的好处：正常下线、超时退出、handler 内异常三条路径都会走到它，不需要在每个 break 前手工反注册。
</details>

练习四（找错题）：这个 UDP 广播接收器有两处问题，先找再修：

```python
import socket

s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.bind(("0.0.0.0", 9400))
while True:
    data = s.recv(1024)
    print("收到:", data.decode())
    s.sendto(b"ack", ("<broadcast>", 9400))   # 收到就广播回执
```

提示：单机回环上 broadcast 不可用；再想想「收到包就回包给广播地址」会让谁难受。

<details>
<summary>参考实现</summary>

```python
import socket

s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)   # 广播需要显式开启
s.bind(("0.0.0.0", 9400))
while True:
    data, addr = s.recvfrom(1024)
    print(f"来自 {addr}: {data.decode()}")
    s.sendto(b"ack", addr)                    # 回给发送者，而不是广播
```

两处问题：其一，在多数平台发送广播前必须 `setsockopt(SOL_SOCKET, SO_BROADCAST, 1)`，否则 `sendto` 抛 `PermissionError`（Windows 上报 10013）；其二，`recv` 丢了来源地址，回执发给 `<broadcast>` 会让**同网段所有监听者**（包括自己）都收到 ack，若大家都这么做就是广播风暴。修复版用 `recvfrom` 拿到 `addr` 定向回复——UDP 的「会话」是应用层用地址模拟出来的，每一对收发都要自己带上下文。
</details>

练习五（实战题）：给 `recv_msg` 加超时与优雅退出：客户端连接后 3 秒内没收到完整消息就放弃并关闭连接，服务器要能感知到客户端消失（而不是傻等下一次收发）。写测试验证两端行为。

提示：客户端用 `settimeout`；服务器侧让它在 `recv` 里感知 EOF（客户端要 shutdown 而不是直接 close）。

<details>
<summary>参考实现</summary>

```python
import socket
import struct
import threading

HEADER = struct.Struct("!I")

def recv_exact(conn: socket.socket, n: int) -> bytes:
    buf = bytearray()
    while len(buf) < n:
        chunk = conn.recv(min(n - len(buf), 65536))
        if not chunk:
            raise ConnectionError("EOF")
        buf += chunk
    return bytes(buf)

def impatient_client() -> None:
    with socket.create_connection(("127.0.0.1", 9500), timeout=3) as c:
        c.settimeout(3.0)                        # 覆盖每一次 recv
        try:
            HEADER.unpack(recv_exact(c, HEADER.size))
        except socket.timeout:
            print("客户端: 3 秒没等到响应，放弃")
        c.shutdown(socket.SHUT_WR)               # 半关闭：服务器 recv 到 EOF

def patient_server() -> None:
    with socket.socket() as srv:
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        srv.bind(("127.0.0.1", 9500))
        srv.listen()
        conn, _ = srv.accept()
        with conn:
            try:
                recv_exact(conn, HEADER.size)
            except ConnectionError:
                print("服务器: 感知到客户端 EOF（shutdown 触发），清理连接")

threading.Thread(target=patient_server, daemon=True).start()
impatient_client()
```

关键点：客户端放弃时若直接 `close`（with 退出），服务器正在阻塞的 `recv` 通常也能因 RST 解除阻塞（抛 `ConnectionResetError`），但 **`shutdown(SHUT_WR)` 是确定性协议**——服务器明确收到 EOF 而不是依赖 RST 的平台差异行为。超时异常在 3.10+ 就是 `TimeoutError`，捕获时可两个名字一起写以兼容旧版。
</details>

## 常见坑点速记

- `recv` 返回 `b''` 唯一含义是对端关闭——把它当「没数据」继续循环是最常见的死循环来源；
- 一次 `sendall` 不对应一次 `recv`：消息边界自己定（长度前缀或分隔符），长度头必须带字节序（`!`）与上限校验；
- 服务器 `bind` 前设 `SO_REUSEADDR`（或 `allow_reuse_address = True`）防 TIME_WAIT 占端口；
- 不设 `settimeout` 的 socket 无限阻塞——探活/协议客户端一律显式超时；
- `shutdown(SHUT_WR)` 与 `close()` 不同：前者半关闭且立即生效，依赖 EOF 的协议必须用前者；
- `ThreadingMixIn` 缺席时 `TCPServer` 单连接串行；`daemon_threads=True` 只适用于可随时丢弃的连接；
- 设备静默掉线 TCP 不会通知你——应用层心跳超时是唯一可靠的离线判定；
- UDP 报文有边界（不粘包）但会丢、会乱序、来源不可信，`recvfrom` 缓冲区不足部分直接丢弃。

## 与之前和之后的知识的关系

- 往前：字节与编码的转换规则见 [字符串格式化](/python/120-StringFormattingMethods)；`struct` 打包的细节见 [数据结构与对象模型](/python/490-DataTypeObjectModelDeepDive)；线程与 GIL 的并发基础见 [多线程与多进程](/python/630-MultiprocessingMultithreading)。
- 往后：HTTP 客户端（今天这套原语的上层封装）见 [HTTP 客户端](/python/320-HttpClient)；TLS 握手与证书（在 connect 之后包裹加密层）见 [SSL 与加密](/python/360-SslCrypto)；epoll 模型与协程化 socket 见 [协程与 asyncio 入门](/python/660-CoroutineAsyncio) 与 [异步编程进阶](/python/670-AsyncProgrammingDetailed)；日志归档等运维场景的落地见 [Python 自动化手册](/python/980-PythonAutomationCookbook)。

## 参考与致谢

- socket —— Low-level networking interface：https://docs.python.org/3/library/socket.html（PSF License）
- socketserver —— A framework for network servers：https://docs.python.org/3/library/socketserver.html（PSF License）
- Socket Programming HOWTO（Gordon McMillan，Python 官方 HOWTO）：https://docs.python.org/3/howto/sockets.html（PSF License）
- 本篇 API 语义、MixIn 组合行为与 `create_connection` 的地址族处理均以以上官方文档为依据。

## 自我检查

- 能不查资料写出 TCP 服务器六步（socket/bind/listen/accept/recv/sendall）并解释 accept 为什么返回新 socket；
- 能解释 `SO_REUSEADDR` 与 `SO_REUSEPORT` 的语义差异及设置时机；
- 能说出 `recv` 返回值的三种可能（数据、EOF 空串、异常）及各自的处置；
- 能独立实现长度前缀分帧（含网络字节序、长度上限、recv 循环）并解释三个防线的攻击面；
- 能区分 `shutdown(SHUT_WR)` 半关闭与 `close()` 全关闭的适用协议场景；
- 能描述 `ThreadingMixIn` 的并发模型及其规模边界（何时该换 selectors/asyncio）。
