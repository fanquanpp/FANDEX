---
order: 310
title: TCP 粘包与拆包
module: 'cs-fundamentals'
category: 计算机科学
difficulty: intermediate
description: TCP 粘包与拆包问题：Nagle 算法、CORK 选项与解决方案。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cs-fundamentals/330-HTTPSHandshake'
  - 'cs-fundamentals/300-TCPControl'
  - 'cs-fundamentals/340-DNSFlow'
  - 'cs-fundamentals/350-CDNPrinciple'
prerequisites:
  - 'cs-fundamentals/010-ComputerOverview'
---

## 前置知识

- TCP 是面向字节流的可靠传输协议，UDP 是面向数据报的（见 [TCP 连接管理](cs-fundamentals/300-TCPControl)）；
- 发送缓冲区与接收缓冲区的概念：socket 写入的数据先进内核缓冲区；
- MSS（最大报文段长度，以太网典型 1460 字节）与 MTU 的关系。

## 学习目标

- 说清"粘包"的本质：TCP 没有消息边界，这不是 bug 而是字节流语义的必然；
- 理解 Nagle 算法、TCP_NODELAY、TCP_CORK 各自解决什么问题、如何相互作用；
- 掌握四种应用层分帧方案（定长、分隔符、长度前缀、TLV）并能手写长度前缀解包；
- 知道主流框架（HTTP、Netty）分别选择了哪种方案。

## 1. 概念引入：水管里的水

一个类比：客户端往水管里倒了两桶水（两次 `send`），服务端打开龙头接水。接到的可能是一大盆（两桶合成一次读），也可能半桶就先舀走了（一次写被多次读）。**水管只保证水的总量与顺序，不保证"一桶水对应一次接水"**。

因此"粘包/拆包"这个流行说法其实有误导：TCP 从未承诺"你写一次，对端就读到你写的那个整体"。它是字节流协议，只有字节，没有消息；**消息是应用层的概念**。真正的命题是：**应用层如何在自己收到的字节流中切分出消息**——这个过程叫"分帧"或"解包"。

UDP 则不同：每个 `sendto` 就是一个独立数据报，接收方要么完整收到，要么收不到，天然无此问题（代价是不保证可靠与有序）。

## 2. 粘包与拆包为什么会发生

```mermaid
flowchart LR
    A["应用 write: msg1 + msg2"] --> B["TCP 发送缓冲区"]
    B -- "Nagle 合并 / MSS 切分 / 拥塞窗口" --> C["网络: 若干报文段"]
    C --> D["接收缓冲区"]
    D -- "recv 时机任意" --> E["应用 read: 任意字节长度"]
```

三个层面的因素叠加：

1. **发送端**：`write` 数据先进入内核发送缓冲区，TCP 按自己的节奏组包。Nagle 算法会攒小包，一次 `write` 大于 MSS 时会被拆成多个报文段；
2. **网络层**：每个报文段独立传输，先后到达顺序由 TCP 保证重组，但重组的对象是"字节流"而不是"你的消息"；
3. **接收端**：数据先落接收缓冲区，`recv(buf, N)` 取"当前缓冲区里有的、至多 N 字节"。应用读的时机和长度与对方写的次数毫无对应关系。

四种典型表现：两次写一次读（粘）、一次写两次读（拆）、多次写一次读、一次写一次读。全都正常，全都是 TCP 的合法行为。

## 3. Nagle 算法与它的两个开关

### 3.1 Nagle 算法：为小包而生

1984 年 John Nagle 提出，规则一句话：**有未确认的小段数据时，后续小数据先攒着，直到攒满一个 MSS 或收到此前数据的 ACK 才发**。动机是 telnet 这类交互应用每个按键都会产生几十字节的包，若不合并，40 字节内容加 40 字节头（IPv4 最小 20 + TCP 20），网络带宽几乎全付了包头。

代价是交互延迟：写 1 字节、ACK 还没回来时再写 1 字节，第二字节可能要等一个 RTT。对延迟敏感的应用这是不可接受的。

### 3.2 TCP_NODELAY：关闭 Nagle

```c
int on = 1;
setsockopt(fd, IPPROTO_TCP, TCP_NODELAY, &on, sizeof(on));  /* 禁用 Nagle，小包立发 */
```

Redis、MySQL 协议、游戏服务器等低延迟场景标配。现代趋势是默认关闭 Nagle（Linux 的 loopback 已默认关闭）。

### 3.3 TCP_CORK：主动攒大包

与 NODELAY 相反，`TCP_CORK`（Linux 特有）让内核**强制攒包**： cork 期间数据只进缓冲区不发送，直到取消 cork 或攒满 MSS。适合"我知道接下来要连续写一堆小块、最终是一个大块"的场景，如 HTTP 响应头+ 响应体连续写出：

```c
int on = 1;
setsockopt(fd, IPPROTO_TCP, TCP_CORK, &on, sizeof(on));  /* 塞住瓶口开始攒 */
write(fd, headers, hlen);   /* 头和体先落缓冲区 */
write(fd, body, blen);
setsockopt(fd, IPPROTO_TCP, TCP_CORK, &off, sizeof(off)); /* 拔塞，一次性发出 */
```

三者的关系：Nagle 是"自动攒但受 ACK 驱动"的启发式，CORK 是"应用显式控制攒与放"，NODELAY 是"别攒"。CORK 与 Nagle 互斥，同时设置时 Linux 以 CORK 优先。

## 4. 应用层分帧：四种方案

### 4.1 固定长度

每条消息填充到固定字节（如 64 字节定长指令帧）。接收方按长度循环读取。实现最简单，代价是内容短时浪费带宽，仅适合指令类短消息。

### 4.2 分隔符

消息之间用约定分隔符（如 `\r\n`）。HTTP/1.1 的头部、Redis 的 RESP 协议、SMTP 都是分隔符风格。文本协议可读性好、telnet 可调试；代价是**内容里出现分隔符必须转义**，且解析器要处理跨读缓冲的分隔符断在两半的情形。

### 4.3 长度前缀：二进制协议的主流

消息头部用固定几字节声明消息体长度，接收方先读头、按长度读体。gRPC（HTTP/2 帧内含长度）、绝大多数游戏/物联网二进制协议都是此风格。无转义问题、解析 O(1)，是自定义二进制协议的首选。

### 4.4 TLV

Type-Length-Value 的嵌套结构：每段消息由"类型 + 长度 + 值"构成，Value 里还可以再嵌 TLV。扩展性好（新增类型不影响旧解析器），是 TLS 握手消息、SNMP 等协议的组织方式。

## 5. 完整示例：复现粘包并实现长度前缀解包

```python
# sticky_demo.py：复现粘包现象，并用长度前缀协议正确分帧
import socket, struct, threading

def server():
    srv = socket.socket()
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(('127.0.0.1', 9000)); srv.listen(1)
    conn, _ = srv.accept()
    buf = b''
    while True:
        data = conn.recv(1024)           # 一次 recv 可能拿到多条或半条消息
        if not data:
            break
        buf += data
        print('服务端本次收到原始字节:', data)   # 观察"粘"在一起的现象
        while len(buf) >= 4:             # 至少要有 4 字节长度头
            msg_len = struct.unpack('!I', buf[:4])[0]  # 网络字节序取长度
            if len(buf) < 4 + msg_len:   # 消息体不完整，等待下次数据（半包）
                break
            payload = buf[4:4 + msg_len] # 完整取出一条消息
            print('服务端解析出消息:', payload.decode())
            buf = buf[4 + msg_len:]      # 从缓冲区移除已处理部分
    srv.close()

threading.Thread(target=server, daemon=True).start()

cli = socket.socket(); cli.connect(('127.0.0.1', 9000))
def send(msg: bytes):
    cli.sendall(struct.pack('!I', len(msg)) + msg)  # 4 字节大端长度 + 内容
send(b'hello')     # 两次连续 send，
send(b'world')     # 服务端大概率一次收到全部字节：粘包现场
import time; time.sleep(0.2); cli.close()
```

运行 `python sticky_demo.py`，典型输出：

```text
服务端本次收到原始字节: b'\x00\x00\x00\x05hello\x00\x00\x00\x05world'
服务端解析出消息: hello
服务端解析出消息: world
```

两次 `send` 确实被合并成了一次 `recv`——但长度前缀协议让解析器毫发无损地切出两条消息。把 `send` 中间加上 `time.sleep(0.1)` 再跑，还能观察到一次 `send` 对应一次 `recv` 的"假象"；这正说明分帧逻辑必须独立于读写时机。生产级实现（如 Netty 的 `LengthFieldBasedFrameDecoder`、Go 的 `bufio.Scanner` 自定义 split）都是这段代码的工程化版本，额外处理了长度上限校验（防恶意超大包）与缓冲区增长。

## 6. 常见陷阱与调试

- **在 TCP 上"以写入次数为单位"设计协议**：最常见的架构级错误。任何基于"一次 send 一条消息"假设的代码，换网络环境（跨机房、移动网络）后必然随机出错。
- **长度前缀没校验上限**：恶意客户端发送"长度 2GB"的头，服务端按此预分配内存直接 OOM。解析前必须校验 `msg_len <= MAX`。
- **分隔符协议忽略转义**：日志上报用 `\n` 分隔，日志内容里混入换行即串包。文本协议要定义转义规则或改用长度前缀。
- **关了 Nagle 就以为解决了粘包**：NODELAY 只改变"何时发"，不改变"收到的是字节流"。分帧逻辑无论如何都要有，两者是不同层面的问题。
- **半包与粘包是同一问题**：测试时用小消息容易只见粘包、用大消息只见半包，协议解析器两者都必须正确处理（上面示例的 `while` + 长度检查即为此设计）。

## 7. 实战场景

- **网关与长连接服务**：IM、推送、IoT 接入层普遍采用"4 字节长度头 + protobuf 体"的自定义二进制协议，兼顾压缩率与解析速度。
- **HTTP 各版本的选择**：HTTP/1.1 头部用分隔符、实体用 `Content-Length` 或 chunked 分块（本质还是长度）；HTTP/2 全面转向帧结构（帧头自带长度），从协议层终结了粘包问题。
- **性能调优**：高吞吐写入端（如代理回源）可用 CORK/`writev` 把头体合并成一次发送，减少小包；低延迟链路（行情、游戏）默认 NODELAY。

## 小结

初学者要点：

- TCP 是字节流，不保存消息边界，"粘包/拆包"是应用层视角的现象而非协议错误；UDP 是数据报语义，无此问题。
- Nagle 算法合并小包省带宽但有延迟代价，`TCP_NODELAY` 关闭它；`TCP_CORK` 是显式攒包开关。
- 分帧四法：定长、分隔符、长度前缀、TLV；二进制协议首选长度前缀。

进阶注意：

- 分帧代码必须同时正确处理粘包（缓冲区一次含多条）与半包（一条消息跨多次 recv），并校验长度字段防内存攻击。
- Nagle/CORK 属于传输层"何时发"的问题，与分帧属于应用层"如何切"的问题，正交且都要考虑。
- 参考成熟协议：Redis 的分隔符风格利于调试，gRPC/HTTP2 的长度风格利于机器解析——协议设计的可读性与效率权衡从一开始就要选定。
