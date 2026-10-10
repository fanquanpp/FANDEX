---
order: 290
title: "计算机网络：在浏览器按下回车之后"
module: 'cs-fundamentals'
category: 计算机科学
difficulty: intermediate
description: "以「打开一个网页」引入：用 Python 亲手发一次裸 HTTP 请求、查一次 DNS、算一次子网，理解分层封装、DNS 解析、TCP 三次握手与挥手、可靠传输与拥塞控制、IP 与 NAT、HTTP 演进与 TLS，以及一套按层排障的调试工具箱。"
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cs-fundamentals/150-OperatingSystem'
  - 'cs-fundamentals/290-NetworkProtocolDeep'
  - 'cs-fundamentals/300-TCPControl'
  - 'cs-fundamentals/330-HTTPSHandshake'
  - 'cs-fundamentals/340-DNSFlow'
prerequisites:
  - 'cs-fundamentals/010-ComputerOverview'
---

## 前置知识

- 已完成 [计算机概述](/cs-fundamentals/010-ComputerOverview)；
- 会基本的 Python（本文实验用标准库 socket，无需安装任何包）；
- 建议先读过 [操作系统](/cs-fundamentals/150-OperatingSystem)——socket 正是它的「系统调用正门」在网络世界的入口。

## 学习目标

读完本文你将能够：

1. 用 30 行以内的 Python 裸发一次 HTTP 请求，并指出每一行对应网络分层的哪一层；
2. 讲清「回车之后」的完整旅程：DNS 解析、TCP 握手、请求响应、连接关闭；
3. 解释三次握手为什么是三次、TIME_WAIT 为什么存在；
4. 用 ipaddress 模块做子网计算，说清私有地址与 NAT 的关系；
5. 区分流量控制与拥塞控制，理解慢启动的「慢」其实不慢；
6. 掌握一套按层排障的工具箱（ping、tracert、netstat、DNS 查询）。

预计 75 到 105 分钟。

## 1. 你现在要解决什么问题

在地址栏敲下 `example.com` 按下回车，一秒后页面出现。这「一秒」里，你的请求可能穿过家里路由器、运营商、若干跨国节点，被翻译、被分段、被路由、被重组——而你和服务器上的程序，居然只是调用了几个「读写函数」。网络的全部魔法来自一个设计决定：**把复杂通信拆成一层一层，每层只做一件事、只跟相邻层打交道**。

理解这套分层，你就能回答日常问题的一半：「打不开网页是谁的错」——是域名解析坏了、是连接被拒、还是服务器本身挂了。另一半来自对 TCP 的理解：为什么视频电话用 UDP、下载文件用 TCP、网页越来越多地跑在 QUIC 上。

## 2. 最小可运行实验：亲手发一次裸 HTTP

不用浏览器、不用任何库，只用操作系统给的 socket 接口，把「发请求」压缩到最原始的形态：

```python
import socket

# 第一步：域名变 IP（应用层找 DNS）
print(socket.getaddrinfo("example.com", 80)[0][4])

# 第二步：建立 TCP 连接（传输层三次握手）
sock = socket.create_connection(("example.com", 80), timeout=5)

# 第三步：按 HTTP 协议格式手写请求（应用层）
request = (
    "GET / HTTP/1.1\r\n"
    "Host: example.com\r\n"
    "Connection: close\r\n"
    "\r\n"                          # 空行表示请求头结束
)
sock.sendall(request.encode())

# 第四步：把响应读到对端关闭为止
chunks = []
while True:
    part = sock.recv(4096)
    if not part:
        break
    chunks.append(part)
sock.close()

response = b"".join(chunks).decode(errors="replace")
head, _, body = response.partition("\r\n\r\n")
print(head.split("\r\n")[0])        # 状态行
print(body[:60])                    # 响应体开头
```

预期输出（第一行可能因网络环境不同而是 301，见下方说明）：

```text
('93.184.216.34', 80)
HTTP/1.1 200 OK
<!doctype html>
<html>
<head>
    <title>Example Domain</title>
```

这段代码就是网络的四层切片：`getaddrinfo` 是**应用层**的 DNS 查询；`create_connection` 在**传输层**完成了三次握手；`sendall` 发出的字符串是**应用层**的 HTTP 协议；而你完全不用管的「数据怎么变成电信号」发生在**物理层**。分段、寻址、重传这些脏活，全被 socket 接口下面的协议栈吃掉了——这就是抽象的力量，也是接下来要拆开看的东西。

## 3. 发生了什么：一次请求的完整旅程

接续实验，把「回车之后」按时间排开：

**第一站，DNS 解析**。浏览器先查本地缓存，没有就问操作系统配置的 DNS 服务器。一次完整的解析是「递归 + 迭代」的接力：你的电脑问本地 DNS（递归——你必须给我答案），本地 DNS 依次问根服务器、顶级域（.com）服务器、example.com 的权威服务器（迭代——本地 DNS 自己一步步问）。拿到 IP 后缓存起来（TTL 内不再问）。记录类型的常识：A 是域名对 IPv4，AAAA 对 IPv6，CNAME 是别名（很多 www 域名只是 CDN 的别名），MX 指邮件。完整解析流程与抓包分析在 [DNS 解析流程](/cs-fundamentals/340-DNSFlow)。

**第二站，TCP 三次握手**。拿到 IP 后，浏览器向服务器的 80/443 端口发起 TCP 连接：

```text
客户端                                   服务器
   |  1. SYN（seq=x）：我想连，我的序号从 x 开始  |
   |----------------------------------------->|
   |  2. SYN+ACK（seq=y, ack=x+1）：好，从 x+1  |
   |     接着发；我的序号从 y 开始               |
   |<-----------------------------------------|
   |  3. ACK（ack=y+1）：收到，从 y+1 接着发     |
   |----------------------------------------->|
```

为什么恰好三次？握手本质是**双向确认能力**：第三次之后，双方都确认了「我能发你能收」与「你能发我能收」，同时交换了初始序号（ISN）。两次不够——服务器无法确认自己的 SYN 确实送达；另外，两次握手会让网络上游荡的「旧连接请求」误建连。ISN 里掺了随机数，防的是序号预测攻击。

**第三站，请求与响应**。连接建好，实验中的 HTTP 字符串被 TCP 切成段（segment）、编号发送；网络层给每段套上 IP 头（写清源 IP 与目的 IP）、交路由器逐跳转发；链路层再套以太网头（写清下一跳的 MAC）送到下一个节点。服务器逐层拆封，把 HTTP 请求交给 Web 服务程序，处理后再把 HTML 按同样的路反向送回。

**第四站，挥手告别**。`Connection: close` 让任何一方可以发起关闭，需要**四次挥手**（比握手多一次）：因为 TCP 是全双工的，一方说「我发完了」（FIN）不代表另一方也发完了，所以两次单向关闭各需要 FIN + ACK。主动关闭方最后进入 **TIME_WAIT**，停留约 2 倍报文最大生存时间（MSL）：一是最后一个 ACK 丢了对方会重发 FIN，得留着应答；二是让本连接的迷路旧报文自然消亡，不污染下一个同端口的新连接。服务器侧高并发时大量 TIME_WAIT 占端口，就是这一设计留给运维的日常。

## 4. 核心概念一：分层与封装

把上面旅程中出现过的角色归位，就是 TCP/IP 四层（教学常用 OSI 七层做对照，后者多了表示层与会话层，工程上并入应用层）：

| 层 | 职责 | 代表协议 | 地址体系 |
| --- | --- | --- | --- |
| 应用层 | 决定「传什么、什么格式」 | HTTP、DNS、TLS、SSH | 域名 / URL |
| 传输层 | 进程到进程：端口、可靠性与顺序 | TCP、UDP | 端口号 |
| 网络层 | 主机到主机：跨网寻址与路由 | IP、ICMP | IP 地址 |
| 链路层 | 同一链路内一跳的传输 | 以太网、WiFi | MAC 地址 |

发送方逐层**封装**（HTTP 数据前加 TCP 头成段、加 IP 头成包、加以太网头成帧），接收方逐层**解封**。每层只认识自己这层的头——路由器只看 IP 头（所以它工作在网络层），交换机只看 MAC 头（链路层）。同一段数据在每一跳的链路层头都会被换掉（下一跳的 MAC 不同），但 IP 头里的源和目的地址全程不变（NAT 除外，见第 5 节）。

两个链路层常识先入袋：**ARP** 负责「IP 地址到 MAC 地址」的翻译——同一网段内广播一句「谁是 192.168.1.2」，对方单播应答自己的 MAC，结果缓存进 ARP 表（深水与攻击面见 [ARP 协议与欺骗](/cs-fundamentals/380-ARPProtocolSpoofing)）；**交换机**靠「源 MAC 自学习」建转发表，目的 MAC 未知就泛洪；跨网段的则交给路由器查路由表。早年共享网线靠 CSMA/CD「先听后发、冲突退避」抢信道，交换机普及后冲突域被隔离，这套协议只剩历史地位（WiFi 的 CSMA/CA 是它的近亲）。

## 5. 核心概念二：IP 地址、子网与 NAT

IPv4 地址是 32 位，写成四段点分十进制。/24 这种写法（CIDR）表示前 24 位是网络号、后 8 位是主机号——子网计算不该手算，让标准库代劳：

```python
import ipaddress

net = ipaddress.ip_network("192.168.1.0/24")
print(net.netmask, net.num_addresses - 2)   # 255.255.255.0 254

# 切成 4 个 /26 子网，每个 62 台可用主机
for sub in net.subnets(new_prefix=26):
    print(sub, "可用主机:", sub.num_addresses - 2)
```

预期输出：

```text
255.255.255.0 254
192.168.1.0/26 可用主机: 62
192.168.1.64/26 可用主机: 62
192.168.1.128/26 可用主机: 62
192.168.1.192/26 可用主机: 62
```

减 2 是因为网络地址（全 0 主机位）与广播地址（全 1）不可分配给主机。32 位 IPv4 只有约 43 亿个地址，早就不够全球设备分，两招续命：**私有地址段 + NAT**。三个私有段（10.0.0.0/8、172.16.0.0/12、192.168.0.0/16）可以在千家万户的内网里重复使用，出门时由路由器做**网络地址转换**：内网多台设备共享一个公网 IP，靠「端口映射表」区分谁是谁——你家的路由器此刻就在干这事。代价是外网无法主动连进来（破坏了端到端），视频通话与 P2P 需要 STUN/TURN 这类「打洞」技术绕行。终极方案是 128 位地址的 IPv6，头更简洁、免 NAT，普及仍在路上。

跨网选路（路由）的核心算法也在算法模块见过：距离向量（RIP，与邻居交换「到各地的距离」表，简单但收敛慢）、链路状态（OSPF，全网拓扑图上跑 Dijkstra）、路径向量（BGP，自治系统之间按商业策略选路，互联网的骨架）。Dijkstra 的完整实现见[图算法](/algorithm/110-GraphAlgorithms)，BGP 专题见 [BGP 路由](/cs-fundamentals/390-BGPRoute)。

## 6. 核心概念三：TCP 的可靠，与它的克制

UDP 的头只有 8 字节，发了就不管；TCP 多出的那几十字节与全部复杂性，都在兑现一个承诺：**字节流不丢、不重、不乱序**。实现靠四件事：

- **编号与确认**：每个字节有序列号，ACK = n 表示「n 之前的全收到了」（累积确认）；
- **超时重传**：发出后迟迟没等到确认就重发，超时时长按实测往返时间（RTT）动态调整；
- **快速重传**：连续收到 3 个重复 ACK，不等超时立刻重发（丢包信号更强）；
- **滑动窗口**：不用「发一个等一个」地空等，未确认的数据可以同时飞一批，窗口就是「在飞的上限」。

窗口同时受两股力量约束，务必分清：

- **流量控制**是对**接收方**的保护：对方通过窗口字段告诉你「我缓冲区只剩多少」，防止把接收方淹没；
- **拥塞控制**是对**网络**的保护：发送方维护一个拥塞窗口 cwnd，探测网络的承受力。慢启动阶段每个往返翻倍（指数增长，其实一点也不慢），到达阈值后改为线性加一（拥塞避免）；一旦判定丢包，快速重传把窗口砍半重探，超时则直接回到慢启动。这条「指数冲高、线性爬坡、丢包砍半」的锯齿曲线，是互联网没有在被洪流挤爆的原因。

深挖确认机制与拥塞算法（Reno、CUBIC、BBR）见 [TCP 控制](/cs-fundamentals/300-TCPControl)，报文结构与抓包见 [TCP 报文与粘包](/cs-fundamentals/310-TCPMessageFraming)。

UDP 没有这些承诺，换来低延迟与简单，适合「丢一点无所谓、旧数据没意义」的场景：直播、游戏、DNS 查询。TCP 与 UDP 的选型口诀：**要完整找 TCP，要实时找 UDP**。而 HTTP/3 的 QUIC 协议（[QUIC 专篇](/cs-fundamentals/370-QUIC)）给出了第三种答案：在 UDP 上自己实现可靠与加密，甩掉 TCP 队头阻塞、把握手与加密合并省往返、切换 WiFi 时连接不断——这是 2026 年新协议的事实方向。

## 7. 核心概念四：应用层三件套

**DNS**（第 3 节已走完主流程）：记住三层角色（根、顶级域、权威）与两种查询（递归替你问到底、迭代告诉你下一步问谁），配 DNS 记录常识即可，抓包级细节在 [DNS 流程](/cs-fundamentals/340-DNSFlow)。

**HTTP**：请求响应的文本协议。方法语义（GET 读、POST 交、PUT 整体替换、DELETE 删）、状态码分段（2xx 成功、3xx 重定向、4xx 客户端的错、5xx 服务器的错）是排障第一词汇。三个版本的演进各解决一个瓶颈：1.1 的长连接解决「每个请求一次握手」，2 的多路复用解决「排队等前一个响应」（应用层队头阻塞），3 的 QUIC 解决 TCP 层的队头阻塞。缓存与压缩的完整策略在 [HTTP 缓存策略](/cs-fundamentals/320-HTTPCacheStrategy)。

**TLS**：HTTP 之上的一层加密壳（HTTPS = HTTP over TLS）。它用非对称加密（RSA/ECC）安全地交换对称密钥，之后用对称加密（AES 等）传数据——两全其美：密钥分发安全、传输速度快。证书由 CA 签名背书，浏览器验证证书链确认「对方真是 example.com」。TLS 1.3 把握手从 2 个往返压到 1 个、废掉一批老旧算法，完整握手流程在 [HTTPS 握手](/cs-fundamentals/330-HTTPSHandshake)，原理基础见 [网络安全基础](/cs-fundamentals/550-InformationSecurityBasics)。

## 8. 调试实录：按层排障的工具箱

网络故障的黄金法则：**从底层往上排查，先确定坏在哪一层**。

- **链路/网络层**：`ping IP地址`（ICMP Echo）通不通。通，说明链路与路由没问题，往下查应用；不通，查网线、WiFi、路由器（Windows 的 `tracert IP` / macOS 与 Linux 的 `traceroute IP` 能看到在第几跳断掉——它利用 TTL 递增，每一跳路由器返回 ICMP 超时消息）；
- **DNS 层**：`ping 域名` 不通但 `ping IP` 通，就是 DNS 坏了。验证：`nslookup 域名` 或 Python 的 `socket.getaddrinfo`；换公共 DNS（如 223.5.5.5 或 8.8.8.8）再试；
- **传输层**：能 ping 通但连接被拒/超时，查端口。`netstat -an | findstr :443`（Windows）或 `ss -tlnp`（Linux）看本机监听；远程端口用 `Test-NetConnection host -Port 443`（Windows PowerShell）或 `nc -zv host 443` 探测。大量 TIME_WAIT 或 CLOSE_WAIT 堆积是服务端高并发的经典病象：前者是主动关闭方在等 2MSL，后者是「对方已关闭、你忘了关」，通常是代码漏了 `close()`；
- **应用层**：连接全通但页面不对，读响应状态码：4xx 查客户端请求（404 路径错、401/403 权限），5xx 查服务端日志，3xx 查重定向配置。

一个真实案例的走法：「网站打不开」→ ping 域名失败 → ping IP 成功 → 结论是 DNS 问题 → nslookup 发现域名解析到过期 IP → 清缓存或换 DNS，恢复。**五分钟定位，靠的是心里那张分层图。**

## 9. 修改实验

1. 把裸 HTTP 实验改成向 `http://example.com` 发送 `HEAD / HTTP/1.1`（只要响应头），观察 Content-Type、Content-Length 等头字段；再把路径换成不存在的 `/nope`，记录状态码变化；
2. 用 `ipaddress` 把 `10.0.0.0/8` 依次切成 /16 与 /24，打印子网数量与每个子网的可用主机数，验证「前缀每加 1 位、子网数翻倍、每网主机减半」；
3. 用 socket 对 `example.com` 的 443 端口 `create_connection`（不发任何数据），确认 TCP 握手能成功；再连一个肯定不存在的端口（如 81），对比「连接被拒」与「超时」两种异常——前者说明主机在但服务不在，后者可能在半路就被丢了；
4. 查本机到任意网站的往返时间：`ping` 连发 10 次记录平均 RTT，估算「一次 TCP 握手 + 一次请求 + 一次响应」至少需要几个 RTT（答案藏在第 3 节里）。

## 10. 小练习

预测题（先写答案再验证）：`172.20.1.77/24` 的网络地址、广播地址、可用主机范围各是什么？把 `172.20.1.0/24` 再划出至少 50 个子网，前缀至少要多少位？

修改题：把裸 HTTP 实验包成一个函数 `fetch(host, path)`，返回状态码与响应体；用它连续请求同一域名 5 次，并用 `time.perf_counter` 对比「每次新建连接」与「改用 HTTP/1.1 长连接（Connection: keep-alive，发多个请求）」的总耗时——亲眼看长连接省下几次握手。

修 Bug 题：同事说「服务器宕机了」，你 ping 服务器 IP 通、`nc -zv 服务器 80` 也通，但浏览器打开超时。按第 8 节的分层法继续排查，指出「宕机」结论哪里不成立，并给出下一步两步操作（提示：本机代理或防火墙规则；响应头是否异常）。

挑战题（不看提示）：用 UDP（`socket.socket(socket.AF_INET, socket.SOCK_DGRAM)`）实现一个迷你 DNS 查询：向公共 DNS（如 223.5.5.5）的 53 端口发送一个 A 记录查询报文并解析出 IP。允许查 RFC 1035 或用现成报文构造说明——重点体会「UDP 之上自己拼协议」与 QUIC 的动机同源。

## 11. 什么时候你会需要这些知识

写代码时：选 TCP 还是 UDP（要不要完整性）、要不要长连接（高频小请求）、超时与重试怎么设（RTT 的量级）。排障时：第 8 节的分层工具箱是从「打不开」到「定位到层」的固定动作。读架构文章时：CDN（[CDN 原理](/cs-fundamentals/350-CDNPrinciple)）、WebSocket（[帧格式](/cs-fundamentals/360-WebSocketFrameFormat)）、QUIC、HTTPS 全是本文概念的延伸，先有骨架再看分支，事半功倍。

## 12. 与之前和之后的知识的关系

- 往前：socket 是操作系统系统调用的一员（[操作系统](/cs-fundamentals/150-OperatingSystem)）；TCP 的滑动窗口与 040 篇的队列、070 篇的「空间换时间」思想同源；
- 往后：深水十一篇按需取用——[网络进阶](/cs-fundamentals/280-ComputerNetworkAdvanced)、[协议深潜](/cs-fundamentals/290-NetworkProtocolDeep)、[TCP 控制](/cs-fundamentals/300-TCPControl)、[TCP 报文与粘包](/cs-fundamentals/310-TCPMessageFraming)、[HTTP 缓存](/cs-fundamentals/320-HTTPCacheStrategy)、[HTTPS 握手](/cs-fundamentals/330-HTTPSHandshake)、[DNS 流程](/cs-fundamentals/340-DNSFlow)、[CDN](/cs-fundamentals/350-CDNPrinciple)、[WebSocket](/cs-fundamentals/360-WebSocketFrameFormat)、[QUIC](/cs-fundamentals/370-QUIC)、[ARP 与欺骗](/cs-fundamentals/380-ARPProtocolSpoofing)、[BGP](/cs-fundamentals/390-BGPRoute)、[网络安全](/cs-fundamentals/400-NetworkSecurity)；
- 更远：Dijkstra 最短路是 OSPF 的心脏（[图算法](/algorithm/110-GraphAlgorithms)）；拥塞窗口的「指数试探、失败回退」与算法模块的贪心与均摊思想一脉相承。

## 13. 官方文档

- Python socket 库（本文实验的全部接口）：https://docs.python.org/zh-cn/3/library/socket.html
- MDN HTTP 文档（方法、状态码、头部权威参考）：https://developer.mozilla.org/zh-CN/docs/Web/HTTP
- RFC 9110（HTTP 语义，最新标准）：https://httpwg.org/specs/rfc9110.html

## 14. 自我检查

- 能不看书画出「回车之后」的六步旅程，并标注每步发生在哪一层；
- 能解释三次握手为什么不能是两次、TIME_WAIT 为什么存在；
- 能用 ipaddress 完成子网划分并解释为什么减 2；
- 能区分流量控制与拥塞控制的对象，说出慢启动到拥塞避免的切换条件；
- 遇到「打不开网页」能按层报出排查动作与对应工具。

## 本章总结

网络是分层的艺术：应用层定格式（DNS、HTTP、TLS），传输层保进程对话（TCP 可靠、UDP 快捷），网络层管跨网寻址（IP、路由、NAT），链路层管一跳可达（以太网、ARP、交换机）。一次「回车」是 DNS 找人、TCP 握手、HTTP 对话、挥手告别四幕剧；而拥塞控制的锯齿曲线，是互联网上亿设备共享带宽却相安无事的隐形契约。排障的秘诀只有一条：按层而上，工具见第 8 节。

## 下一步

主线继续：[网络进阶](/cs-fundamentals/280-ComputerNetworkAdvanced)与[协议深潜](/cs-fundamentals/290-NetworkProtocolDeep)把各层协议摊开细讲；被 TCP 的锯齿曲线勾起兴趣就直接跳 [TCP 控制](/cs-fundamentals/300-TCPControl)。想换换口味，也可以切到 [分布式系统](/cs-fundamentals/410-DistributedSystem)，看单机网络长成跨机器系统之后的故事。
