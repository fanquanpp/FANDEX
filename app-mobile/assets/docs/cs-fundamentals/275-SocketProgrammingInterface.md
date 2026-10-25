---
order: 300
title: Socket 网络编程接口
module: 'cs-fundamentals'
category: 计算机科学
difficulty: beginner
description: socket/bind/listen/accept 五步与 UDP 无连接对照：为什么服务端有两个 socket、网络字节序陷阱、手写 TCP 回显服务与局域网 UDP 广播发现协议，附粘包复现与练习
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---


## 知识点地图

- **知识类别**：网络编程接口（socket API）。它是 270-290 网络理论篇
  （协议、握手、状态机）与 025-networking 运维工具篇（命令、抓包、组网）
  之间缺的那座桥：协议怎么变成代码。
- **解决什么问题**：内核已经实现了 TCP/UDP 协议栈，应用程序需要一套系统调用
  把数据交进去、取出来。socket 就是进程与内核网络栈之间的门。
- **什么时候用到**：写任何自定义协议的服务（游戏服、设备网关、代理）；
  排查「端口被占用」「连接被拒绝」「收到的数据黏成一团」这类问题时，
  必须知道每个报错发生在哪一步系统调用；面试手写 server 也是常考题。

## 真实场景：局域网里「发现」游戏房间

speed-rouge 项目（025-networking 素材第 1 条）需要一个功能：玩家点「加入房间」，
界面上直接列出同一局域网里所有开着的主机——没有中央服务器可查，怎么找到它们？

答案是 `scripts/net/lan_beacon.gd` 用 UDP 广播实现的服务发现协议，四段式结构：

1. 主机端 `start_host` 绑定固定信标端口 24566 等包；
2. 客户端每 0.5 秒向本网段广播地址发一个魔数包 `SRNET1?DISCOVER`；
3. 主机收到后回一个 JSON offer（房间名/版本/内容哈希/人数/端口）；
4. 客户端按来源 IP 记录房间，带 TTL=3 秒过期——主机退出了，列表 3 秒内消失。

这个 60 行的脚本同时用上了本文全部核心概念：UDP 的无连接、bind 的端口绑定、
广播地址、应用层协议设计（魔数 + 结构化负载 + 超时）。学完本文你可以亲手写出它。

## 1. 心智模型：socket 是进程插进内核协议栈的插座

操作系统教材（270 篇）讲的是「两台机器之间字节怎么可靠到达」；
socket API 回答的是「**我这台机器上的进程，怎么参与这件事**」：

```
进程 A（发送方）                              进程 B（接收方）
   应用缓冲                                     应用缓冲
      |  send()                                   ^  recv()
      v                                           |
   内核 TCP 发送缓冲  ---IP 网络--->   内核 TCP 接收缓冲
        \___ socket fd = 这条链路在本进程的句柄 ___/
```

三个必须建立的第一直觉：

1. **socket 对进程就是一个文件描述符**。`read`/`write` 语法上都可用，
   但网络编程一律用 `recv`/`send`——它们多一个 flags 参数
   （如 `MSG_PEEK` 窥视、`MSG_DONTWAIT` 非阻塞），而且语义只针对 socket；
2. **send 返回成功不等于对方收到**。数据只是进了内核发送缓冲，之后丢在
   重传队列里还是对方机器，进程无从得知（除非应用层自己回执）——
   这正是 TCP「可靠」的边界：可靠的是链路，不是你的 send 调用；
3. **recv 拿到的长度与 send 的长度没有对应关系**。TCP 是字节流，
   三次 send 可能一次 recv 全到（粘包），也可能一次 send 分多次到（拆包）。
   分帧方案见 310-TCPMessageFraming，本文第 5 节会现场复现。

## 2. TCP 服务端五步：为什么需要两个 socket

以最经典的回显（echo）服务为例，先看全貌再逐行拆：

```python
# echo_server.py —— TCP 回显服务
import socket

listen_fd = socket.socket(socket.AF_INET, socket.SOCK_STREAM)   # 1
listen_fd.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1) # 2
listen_fd.bind(("0.0.0.0", 9000))                               # 3
listen_fd.listen(16)                                            # 4
print("listening on 9000")
while True:
    conn, addr = listen_fd.accept()                             # 5
    data = conn.recv(4096)                                      # 6
    if not data:            # 对端正常关闭时 recv 返回空串
        conn.close()
        continue
    conn.sendall(data)      # sendall 保证全部发出，send 只保证进入缓冲
    conn.close()
```

逐行解释，每一步对应一次内核动作：

1. `socket(AF_INET, SOCK_STREAM)`：向内核申请一个插座。`AF_INET` 选地址族
   （IPv4），`SOCK_STREAM` 选协议语义（流式，内核帮你配 TCP）。换成
   `SOCK_DGRAM` 就是 UDP——**协议的选择在这一行就定死了**；
2. `SO_REUSEADDR`：TIME_WAIT 状态（300 篇）下端口仍被占用，重启服务会报
   `Address already in use`。这个选项告诉内核允许复用。**易错点**：它要
   在 `bind` 之前设置——socket 选项有生效时机，绑完再设为时已晚；
3. `bind(("0.0.0.0", 9000))`：把插座钉在「所有网卡的 9000 端口」上。
   写 `127.0.0.1` 则只有本机能连。speed-rouge 的信标绑 `0.0.0.0:24566`
   就是为了让局域网设备都能把包送进来；
4. `listen(16)`：把插座从「主动连接」切到「被动监听」，16 是**半连接/全连接
   队列长度提示**（内核实际取两个队列的较大值再向上取整）。队列满时新连接
   会被丢弃或拒绝——压测时偶发 `connection timed out` 而服务进程毫无反应，
   多半就是队列爆了，而不是「卡了」；
5. `accept()`：从已完成三次握手的连接队列里取出一条，**返回一个全新的
   描述符** `conn`。这就回答了标题的问题：
   - 监听 socket 只负责「接电话」，永不收发业务数据；
   - 连接 socket 才对应一条具体链路，每个客户端一个。
   如果只有一个 socket，服务器同时只能跟一个人说话；且内核需要区分
   「这条数据来自哪条连接」——描述符本身就是区分手段；
6. `recv(4096)` 的 4096 是**本次最多读多少**，不是「必须读满」。
   返回值小于 4096 是常态不是错误。`sendall` 与 `send` 的区别见注释：
   `send` 可能只送进缓冲区一部分（发送缓冲满了），回显服务偷懒用
   `sendall` 是因为数据量小，长连接服务必须处理部分写（配合 120-190 篇
   的非阻塞 IO 与事件循环）。

验证方式用 025-networking 的 netcat（260-NetcatNmap 篇）：

```bash
python echo_server.py          # 终端 1
echo "hello" | nc 127.0.0.1 9000   # 终端 2，应原样收到 hello
```

客户端五步是它的镜像：`socket -> connect -> send -> recv -> close`，
没有 bind（内核自动分配临时端口）、没有 listen/accept。**易错点**：客户端
不 bind 不是「省略」，而是语义上不需要——服务端口要固定公示，客户端端口
随机即可，这正是 270 篇讲过的熟知端口与临时端口之分。

## 3. UDP：无连接的对照面

同样功能的 UDP 版只有三步，没有 listen/accept/connect：

```python
# udp_echo.py —— UDP 回显
import socket

s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)    # 无 SOCK_STREAM
s.bind(("0.0.0.0", 9000))
while True:
    data, addr = s.recvfrom(4096)     # 每个"包"自带来源地址
    s.sendto(data, addr)              # 按地址原路返回
```

- `recvfrom` 返回 `(数据, 对端地址)`——**UDP 没有「连接」这个概念，
  每个数据报独立携带来源**，服务端凭地址回包。这就是 speed-rouge 信标
  选 UDP 的原因之一：主机同时回应多个探测器，不需要为每个探测器维护连接；
- 代价是三无：无握手（包可能被丢弃、乱序、重复）、无流控、无拥塞控制。
  `sendto` 返回成功只代表包进了网卡队列，出了门生死自负。

### TCP 与 UDP 选型对照

| 需求特征 | 选择 | 例 |
| --- | --- | --- |
| 字节必须全部按序到达 | TCP | 文件传输、HTTP、数据库连接 |
| 一问一答、丢一个无所谓 | UDP | DNS 查询、房间广播、游戏心跳 |
| 延迟优先于完整 | UDP | 实时语音（丢帧比等待强） |
| 广播/组播 | 仅 UDP | 局域网服务发现（TCP 无法广播） |

speed-rouge 选 UDP 的完整理由现在可以说清：**服务发现的包是周期性重复的**
（0.5 秒一发），丢一个包等下一个即可，TCP 的重传与连接管理反而全是负担；
而且「向全网段喊话」只有 UDP 广播做得到。

## 4. 网络字节序：htons 陷阱

多字节整数在网络上传输必须用**大端序**（高字节在前），而 x86/ARM 主机
内存里是小端序。C 的 socket API 为此提供转换函数：

```c
struct sockaddr_in addr;
addr.sin_family = AF_INET;
addr.sin_port = htons(9000);                  // host to network short
addr.sin_addr.s_addr = htonl(INADDR_ANY);     // host to network long
```

**易错点**：忘了 `htons` 是最经典的 socket bug。9000 的十六进制是 `0x2328`，
小端内存里是 `28 23`；不转换直接赋值，内核按大端解读成 `0x2823 = 10275`，
于是服务「莫名监听在 10275 端口」——程序不报错，只是端口对不上。

Python/Go 等高级语言在 `bind`/`connect` 时已内部转换（Python 传字符串端口，
Go 用 `net.Listen` 的字符串参数），所以现代开发常常感知不到这个问题。
但两类场景仍然要亲手处理字节序：**自己设计协议**时（speed-rouge 的魔数包
之后如果带长度字段或版本号字段，就必须约定字节序并显式转换）与
**读抓包数据**时（025 的 tcpdump 输出里端口是大端显示）。

推论：跨机器的自定义协议要么「全大端」（网络序惯例），要么在协议头里
带一个魔数字段让接收方探测对端字节序——随便选一种，**别选「不处理」**。

## 5. 完整示例：复现粘包现场

把第 1 节的直觉变成可运行的实验——证明「三次 send 可能一次收到」：

```python
# sender.py —— 连发三条消息
import socket
s = socket.create_connection(("127.0.0.1", 9000))
for msg in (b"alpha|", b"beta|", b"gamma|"):
    s.sendall(msg)
s.close()
```

用第 2 节的 echo 服务接收，`data` 极大概率是 `b"alpha|beta|gamma|"` 一整块
——三条消息黏成一条。这就是 310-TCPMessageFraming 整篇要解决的问题，
此处用「竖线分隔符」做最简分帧演示：

```python
# 在 echo 服务 recv 之后加两行
parts = data.split(b"|")
print(parts)    # [b'alpha', b'beta', b'gamma', b'']  尾部空串是分隔符结尾
```

**为什么这样写**：分隔符分帧适合文本协议（Redis 的 RESP、HTTP 头部都是
这个思路），二进制协议用 310 篇的长度前缀法。顺带一提 speed-rouge 的
信标包是「定长魔数 + 变长 JSON」的混合结构——魔数本身既是协议标识
（防止别的程序误连）也天然是分帧锚点。

## 常见陷阱与调试

- **坑 1：`Address already in use`。** TIME_WAIT 未过（约 2MSL，见 300 篇）
  或另一个进程占着端口。前者用 `SO_REUSEADDR`，后者用
  `lsof -i :9000`（或 Windows `netstat -ano | findstr 9000`）找占用者。
- **坑 2：`Connection refused`。** 目标端口无人监听，或防火墙以 RST 拒绝。
  注意这是内核行为，发生得很快；而包被防火墙静默丢弃时表现是超时——
  refused 与 timeout 的区别本身就是排查线索。
- **坑 3：短连接 for 循环压测打爆队列。** 每次请求新建连接，服务端
  `accept` 速度跟不上时全连接队列溢出。先调大 backlog 是缓解，根治是
  连接复用（HTTP keep-alive 或长连接协议）。
- **坑 4：recv 后忘记检查空串。** TCP 对端 `close` 后 recv 返回 `b""`，
  死循环里不判空会变成空转烧 CPU。UDP 的等价信号是 ICMP 端口不可达
  引发的 `ConnectionRefusedError`（对已 connect 的 UDP socket）。
- **坑 5：广播包发不出去。** 发广播前必须 `setsockopt(SOL_SOCKET,
  SO_BROADCAST, 1)`，否则 `sendto` 报 `Permission denied`——内核默认
  禁止普通 socket 发广播，防止程序误伤全网段。speed-rouge 的
  `start_seek` 开启了这个选项，并按 025 素材向 `x.x.x.255` 与
  `255.255.255.255` **双地址发送**：定向广播在部分路由器上被过滤，
  受限广播（255.255.255.255）不出路由器但一定达本网段，双保险。

## 动手实践

**任务**：把第 2 节的 echo 服务改造成一个「局域网房间信标」，验证本文全部知识点。

1. 主机端：UDP socket 绑 `0.0.0.0:24566`，收到以 `SRNET1?DISCOVER` 开头的
   包时，回 `{"room": "demo", "port": 9000}`；
2. 客户端：每 0.5 秒向 `255.255.255.255:24566` 发现包，收到应答后按
   来源 IP 打印房间，3 秒没再收到就标记离线；
3. 用两台机器（或一台机器配 Docker 双容器）验证发现与过期。

**提示**：客户端要 `SO_BROADCAST`；「3 秒过期」用一个字典存
`{ip: 最后收到时间}`，主循环里每轮清理超时项——不要给每条记录起定时器。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```python
# beacon.py —— 单文件既是主机端也是客户端，用命令行切换
import socket, json, time, sys

MAGIC = b"SRNET1?DISCOVER"

def serve():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.bind(("0.0.0.0", 24566))                 # 固定公示端口，服务端要 bind
    while True:
        data, addr = s.recvfrom(1024)
        if data == MAGIC:                      # 魔数校验：防误连 + 天然分帧
            s.sendto(json.dumps({"room": "demo",
                                 "port": 9000}).encode(), addr)

def seek():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)  # 坑 5
    s.settimeout(0.5)
    rooms = {}                                 # {ip: 最后在线时刻}
    while True:
        s.sendto(MAGIC, ("255.255.255.255", 24566))
        deadline = time.time() + 0.5
        while time.time() < deadline:          # 窗口内收集本轮应答
            try:
                data, addr = s.recvfrom(1024)
                rooms[addr[0]] = time.time()
                print(addr[0], json.loads(data))
            except socket.timeout:
                break
        rooms = {ip: t for ip, t in rooms.items()
                 if time.time() - t < 3}       # TTL=3s 过期
        print("alive:", sorted(rooms))

if __name__ == "__main__":
    serve() if sys.argv[1] == "serve" else seek()
```

**逐段讲解**：serve 端与第 3 节的 UDP echo 结构相同，只多一个魔数判断；
seek 端的内层 `while` 是 UDP 服务发现的典型「收集窗口」模式——一轮广播后
等 0.5 秒收应答，`settimeout` 让 recvfrom 在窗口结束时抛出超时以退出；
过期逻辑用「时间戳字典 + 每轮过滤」实现，不引入任何定时器线程。
对照真实工程：speed-rouge 还在每个 offer 里带版本号与内容哈希做兼容双闸门
（025 素材第 2 条），收包后校验不一致的房间直接不进列表——
你可以在 `json.loads` 之后加一个 `if offer.get("v") != MY_VERSION: continue`
体验这个设计。

</details>

## 小结与下一步

- socket 是进程与内核协议栈之间的门：TCP 五步（socket/bind/listen/accept
  + connect）里，服务端的两个 socket 分工是「监听接客、连接干活」；
- UDP 三步、无连接、每包带地址，适合周期性、容忍丢失、需要广播的场景；
- 字节序陷阱在现代语言里被隐藏但没消失：自定义协议必须显式约定；
- send 成功不是送达、recv 长度不是消息长度——流式语义的两大推论。

**下一步**：三次握手与状态机见 300-TCPControl；粘包的完整解法（长度前缀、
定长、分隔符、协议升级）见 310-TCPMessageFraming；命令行工具化验证见
025-networking 的 260-NetcatNmap。

## 参考与致谢

- man 2 socket / man 2 bind / man 2 listen / man 2 accept / man 2 recvfrom
  （Linux 手册页，man-pages 项目许可证，GPL+BSD 双许可）
- Beej's Guide to Network Programming（https://beej.us/guide/bgnet/ ，开放许可）
- 场景素材：本仓库 .workflow-tmp/scan/c-projects.md 025-networking 条目
  （speed-rouge lan_beacon.gd 局域网广播发现协议）
