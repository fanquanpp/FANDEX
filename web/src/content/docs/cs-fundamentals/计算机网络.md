---
title: 计算机网络
module: 'cs-fundamentals'
category: 'Computer Science / Networking'
description: 计算机网络核心原理：协议栈、TCP/IP、路由、应用层协议、网络安全。
author: fanquanpp
order: 40
tags:
  - 'cs-fundamentals'
  - 'computer-science---networking'
  - networking
difficulty: intermediate
related:
  - 'cs-fundamentals/计算机体系结构'
  - 'cs-fundamentals/操作系统'
  - 'cs-fundamentals/数字逻辑'
  - 'cs-fundamentals/离散数学'
prerequisites:
  - 'cs-fundamentals/计算机科学概述'
---

## 1. 网络体系结构

### 1.1 OSI七层模型 vs TCP/IP四层模型

```
OSI七层模型              TCP/IP四层模型          协议示例
+------------------+    +------------------+    +-----------+
| 7 Application    |    |                  |    | HTTP, DNS |
+------------------+    |  Application     |    | FTP, SMTP |
| 6 Presentation   |    |                  |    | TLS, JPEG |
+------------------+    +------------------+    +-----------+
| 5 Session        |    |                  |    | RPC, NFS  |
+------------------+    +------------------+    +-----------+
| 4 Transport      |    |  Transport       |    | TCP, UDP  |
+------------------+    +------------------+    +-----------+
| 3 Network        |    |  Internet        |    | IP, ICMP  |
+------------------+    +------------------+    +-----------+
| 2 Data Link      |    |  Network Access  |    | Ethernet  |
+------------------+    |                  |    | WiFi, PPP |
| 1 Physical       |    |                  |    | 光纤, 双绞线|
+------------------+    +------------------+    +-----------+

封装过程 (协议栈主线, 参见 [概述](overview) 4.2节):

  Application Data
       |
       v
  +---+---+---+---+---+---+
  | HTTP |   Data         |    应用层
  +---+---+---+---+---+---+
       |
       v
  +---+---+---+---+---+---+---+---+
  | TCP | HTTP |   Data           |    传输层
  +---+---+---+---+---+---+---+---+
       |
       v
  +---+---+---+---+---+---+---+---+---+---+
  | IP  | TCP | HTTP |   Data              |    网络层
  +---+---+---+---+---+---+---+---+---+---+
       |
       v
  +---+---+---+---+---+---+---+---+---+---+---+---+
  | ETH | IP  | TCP | HTTP |   Data          | FCS |    链路层
  +---+---+---+---+---+---+---+---+---+---+---+---+
```

### 1.2 协议栈的设计原则

```
协议栈设计的核心原则:

1. 分层抽象: 每层只关心本层的功能，通过接口与相邻层交互
2. 封装/解封: 发送方逐层封装头部，接收方逐层解封
3. 对等通信: 同一层的两个实体通过协议逻辑通信
4. 透明传输: 每层对上层隐藏本层的实现细节

端到端原则 (End-to-End Argument):
  功能应在最高可能层实现
  低层只提供最基本的传输服务
  例: 可靠性由TCP(传输层)保证，而非每个路由器重传
```

---

## 2. 物理层与数据链路层

### 2.1 以太网帧格式

```
Ethernet II 帧格式:

| Preamble | SFD | Dst MAC | Src MAC | Type | Payload      | FCS |
| 7B       | 1B  | 6B      | 6B      | 2B   | 46-1500B     | 4B  |

Preamble: 7字节前导码 (时钟同步)
SFD:      1字节帧起始定界符 (0xAB)
Type:     上层协议类型 (0x0800=IP, 0x0806=ARP, 0x86DD=IPv6)
FCS:      4字节CRC-32校验

最小帧长: 64B (防止冲突检测失败)
最大帧长: 1518B (标准) / 9022B (Jumbo Frame)
```

### 2.2 CSMA/CD协议

```
CSMA/CD (载波侦听多路访问/冲突检测):

  1. 先听后发: 检测信道空闲才发送
  2. 边发边听: 发送时持续检测冲突
  3. 冲突停止: 检测到冲突立即停止
  4. 随机重发: 等待随机时间后重试

  二进制指数退避:
    第k次冲突后, 从 [0, 2^k - 1] 中随机选择一个数r
    等待 r * 2t (t = 传播延迟)
    k 最大为16, 超过则放弃

  冲突域:
    共享同一信道的所有设备构成冲突域
    交换机隔离冲突域, 集线器不隔离
```

### 2.3 ARP协议

```
ARP (Address Resolution Protocol): IP地址 -> MAC地址映射

ARP请求/响应流程:

  Host A (192.168.1.1) 想与 Host B (192.168.1.2) 通信
  A不知道B的MAC地址

  1. A发送ARP请求 (广播):
     Dst MAC: FF:FF:FF:FF:FF:FF
     "谁有 192.168.1.2? 请告诉 192.168.1.1"

  2. B收到ARP请求, 发送ARP响应 (单播):
     Dst MAC: A的MAC地址
     "192.168.1.2 的MAC地址是 xx:xx:xx:xx:xx:xx"

  3. A将映射缓存到ARP表 (TTL通常20分钟)

ARP缓存表:
  IP Address        MAC Address         TTL
  192.168.1.2       00:11:22:33:44:55   1200s
```

### 2.4 交换机工作原理

```
交换机自学习算法:

  交换机维护: MAC地址表 (MAC -> Port映射)

  收到帧时:
    1. 学习: 记录源MAC -> 入端口
    2. 转发: 查找目的MAC
       - 找到: 转发到对应端口
       - 未找到: 泛洪到所有端口(除入端口)
       - 广播地址: 泛洪

  MAC地址表示例:
    MAC Address       Port   VLAN
    00:11:22:33:44:55  1     10
    AA:BB:CC:DD:EE:FF  3     10
    11:22:33:44:55:66  5     20

  生成树协议 (STP):
    防止环路, 通过阻塞冗余链路构建无环拓扑
    根桥选举 -> 最短路径计算 -> 阻塞非最短路径端口
```

---

## 3. 网络层

### 3.1 IP协议

```
IPv4头部格式:

| Version | IHL | DSCP/ECN | Total Length |
| Identification | Flags | Fragment Offset |
| TTL | Protocol | Header Checksum |
| Source IP Address (32b)          |
| Destination IP Address (32b)     |
| Options (variable)               |

关键字段:
  Version: 4 (IPv4)
  IHL: 头部长度 (以4字节为单位, 最小5=20B)
  TTL: 生存时间 (每经过一个路由器-1, 为0时丢弃)
  Protocol: 上层协议 (6=TCP, 17=UDP, 1=ICMP)

IPv6头部格式 (简化):

| Version | Traffic Class | Flow Label |
| Payload Length | Next Header | Hop Limit |
| Source Address (128b)                        |
| Destination Address (128b)                   |

IPv4 vs IPv6:
  地址长度: 32b vs 128b
  头部: 可变(20-60B) vs 固定(40B)
  分片: 路由器可分片 vs 仅源端分片
  校验和: 有 vs 无(交给链路层和传输层)
  配置: 手动/DHCP vs 自动(SLAAC)
```

### 3.2 子网划分与CIDR

```
IPv4地址分类:

  A类: 1.0.0.0 - 126.0.0.0     /8   (网络位8, 主机位24)
  B类: 128.0.0.0 - 191.255.0.0 /16  (网络位16, 主机位16)
  C类: 192.0.0.0 - 223.255.255.0 /24 (网络位24, 主机位8)

CIDR (无类域间路由):
  打破类别边界, 自由划分网络位和主机位

  例: 192.168.1.0/24
    网络位: 24位
    主机位: 8位 (可容纳254台主机)
    子网掩码: 255.255.255.0

  子网划分:
    192.168.1.0/24 划分为4个子网:
    192.168.1.0/26    (主机位6, 62台主机)
    192.168.1.64/26
    192.168.1.128/26
    192.168.1.192/26

  超网聚合:
    192.168.0.0/24 + 192.168.1.0/24 = 192.168.0.0/23
```

### 3.3 路由算法

```
路由算法分类:

1. 距离向量算法 (RIP):
   每个路由器维护到所有目的地的距离向量
   定期与邻居交换距离向量
   Bellman-Ford方程: D(x,y) = min{ c(x,v) + D(v,y) }

   RIP协议:
     度量: 跳数 (最大15, 16=不可达)
     更新: 每30秒
     问题: 慢收敛、计数到无穷
     解决: 水平分裂、毒性逆转

2. 链路状态算法 (OSPF):
   每个路由器维护完整的网络拓扑图
   使用Dijkstra算法计算最短路径

   OSPF协议:
     度量: 代价 (通常与带宽成反比)
     更新: 链路状态变化时立即泛洪
     区域: 骨干区域(Area 0) + 非骨干区域
     优点: 快速收敛、无环路

3. 路径向量算法 (BGP):
   用于自治系统(AS)间路由
   交换到达目的地的路径信息

   BGP协议:
     eBGP: AS间交换路由
     iBGP: AS内传播路由
     路径属性: AS-PATH, NEXT-HOP, LOCAL-PREF
     策略路由: 可基于商业策略选择路径
```

**Dijkstra算法伪代码**：

```python
def dijkstra(graph, source):
    dist = {v: float('inf') for v in graph}
    dist[source] = 0
    visited = set()
    while len(visited) < len(graph):
        u = min((v for v in graph if v not in visited), key=lambda v: dist[v])
        visited.add(u)
        for v, cost in graph[u]:
            if dist[u] + cost < dist[v]:
                dist[v] = dist[u] + cost
    return dist
```

### 3.4 ICMP协议

```
ICMP (Internet Control Message Protocol): 网络层差错报告

ICMP消息类型:
  Type 0  Echo Reply          (ping响应)
  Type 3  Destination Unreachable (目的不可达)
  Type 5  Redirect            (重定向)
  Type 8  Echo Request        (ping请求)
  Type 11 Time Exceeded       (TTL超时, traceroute利用此)

traceroute原理:
  发送TTL=1的UDP包 -> 第1跳返回ICMP Time Exceeded
  发送TTL=2的UDP包 -> 第2跳返回ICMP Time Exceeded
  ...
  直到到达目的地返回ICMP Port Unreachable
```

---

## 4. 传输层

### 4.1 TCP协议

```
TCP段格式:

| Source Port | Destination Port |
| Sequence Number (32b)              |
| Acknowledgment Number (32b)        |
| Data | Reserved | Flags | Window   |
| Checksum | Urgent Pointer          |
| Options (variable)                 |

关键字段:
  Sequence Number: 数据的字节流编号
  Ack Number:      期望收到的下一个字节编号
  Flags: URG|ACK|PSH|RST|SYN|FIN
  Window: 接收窗口大小 (流量控制)
```

### 4.2 TCP状态机

```
TCP连接状态机 (参见 [概述](overview) 4.3节):

                              +---------+
                      CLOSED  |         |
                              +---------+
                     passive  |    |   active
                      open    |    |   open
                              v    v
                       +----------+     SYN_SEND
                       |  LISTEN  |        |
                       +----------+        |
                  SYN    |     |   SYN     |
                 rcvd    |     |   sent    |
                         v     |           |
                   +----------+            |
                   | SYN_RCVD |            |
                   +----------+            |
                         |                 |
                         |   SYN+ACK       |
                         v                 v
                       +----------------------+
                       |     ESTABLISHED      |
                       +----------------------+
                         |     |     |
                    FIN  |     | FIN |  close
                   sent  |     | rcvd|
                         v     v     v
                   +---------+  +----------+
                   | FIN_WAIT|  | CLOSE_WAIT|
                   | 1       |  +----------+
                   +---------+        |
                         |       FIN  |
                    FIN  |      sent  |
                   rcvd  |            v
                         v     +----------+
                   +---------+ | LAST_ACK |
                   |FIN_WAIT2| +----------+
                   +---------+        |
                         |       FIN  |
                    FIN  |      rcvd  |
                   sent  |            |
                         v            v
                       +-----------+
                       | TIME_WAIT |
                       +-----------+
                             | 2MSL
                             v
                       +---------+
                       |  CLOSED |
                       +---------+
```

### 4.3 TCP三次握手

```
TCP三次握手:

  Client                          Server
  (CLOSED)                        (LISTEN)
     |                               |
     |  SYN, seq=x                   |
     |------------------------------->|  SYN_RCVD
     |                               |
     |  SYN+ACK, seq=y, ack=x+1      |
     |<-------------------------------|
     |                               |
     |  ACK, seq=x+1, ack=y+1        |
     |------------------------------->|  ESTABLISHED
     |                               |
  ESTABLISHED                     ESTABLISHED

为什么需要三次握手?
  1. 确认双方的发送和接收能力正常
  2. 同步双方的初始序列号(ISN)
  3. 防止旧连接的SYN导致误建连

ISN生成:
  ISN = 基于时钟的计数器 + 随机偏移
  防止序列号预测攻击
```

### 4.4 TCP四次挥手

```
TCP四次挥手:

  Client                          Server
  (ESTABLISHED)                   (ESTABLISHED)
     |                               |
     |  FIN, seq=u                   |
     |------------------------------->|  CLOSE_WAIT
     |                               |
     |  ACK, ack=u+1                  |
     |<-------------------------------|
     |                               |
     |          (Server发送剩余数据)    |
     |                               |
     |  FIN, seq=w                   |
     |<-------------------------------|  LAST_ACK
     |                               |
     |  ACK, ack=w+1                 |
     |------------------------------->|
     |                               |
  TIME_WAIT                       CLOSED
  (等待2MSL)                         |
     |                               |
  CLOSED

为什么需要TIME_WAIT?
  1. 确保最后一个ACK能到达对方 (若丢失, 对方重发FIN)
  2. 等待本连接的延迟报文消亡 (2MSL后旧报文必然被丢弃)

MSL (Maximum Segment Lifetime): 报文最大生存时间, 通常2分钟
```

### 4.5 TCP可靠传输

```
TCP可靠传输机制:

1. 序列号与确认:
   每个字节有序列号
   累积确认: ACK=n 表示n之前的所有数据已收到

2. 超时重传:
   RTO (Retransmission Timeout) 动态计算
   RTO = SRTT + 4 * RTTVAR
   SRTT = (1-a) * SRTT + a * RTT_sample  (a=1/8)
   RTTVAR = (1-b) * RTTVAR + b * |SRTT - RTT_sample|  (b=1/4)

3. 快速重传:
   收到3个重复ACK -> 立即重传 (不等超时)
   比超时重传更快检测丢包

4. 选择确认 (SACK):
   TCP选项, 允许接收方告知已收到的非连续块
   避免不必要的重传

滑动窗口:

  发送窗口:
  |---------- 已发送已确认 ----------|---- 已发送未确认 ----|---- 可发送 ----|---- 不可发送 ----|
                                    |<--- 发送窗口 --->|

  接收窗口:
  |---------- 已接收确认 ----------|---- 可接收 ----|---- 不可接收 ----|
                                   |<-- 接收窗口 -->|
```

### 4.6 TCP流量控制与拥塞控制

```
流量控制 (Flow Control): 防止发送方淹没接收方

  接收方通过Window字段告知可用缓冲区
  零窗口探测: 收到Window=0时, 发送方定期发1字节探测

拥塞控制 (Congestion Control): 防止网络过载

  四个算法:

  1. 慢启动 (Slow Start):
     cwnd从1 MSS开始, 每RTT翻倍 (指数增长)
     直到cwnd达到ssthresh -> 切换到拥塞避免

  2. 拥塞避免 (Congestion Avoidance):
     每RTT cwnd增加1 MSS (线性增长)
     直到检测到丢包

  3. 快速重传 (Fast Retransmit):
     3个重复ACK -> 立即重传丢失段
     ssthresh = cwnd / 2
     cwnd = ssthresh + 3 (TCP Reno)

  4. 快速恢复 (Fast Recovery):
     每收到一个重复ACK, cwnd增加1 MSS
     收到新ACK -> cwnd = ssthresh, 进入拥塞避免

  拥塞窗口变化图:
  cwnd
    ^
    |         /\    /\
    |        /  \  /  \
    |       /    \/    \
    |      /             \
    |     /               \
    |    /                 \
    |   /                   \
    +--+---+---+---+---+---+---> time
     SS  CA  SS  CA  SS  CA
         3dupACK  timeout
```

### 4.7 UDP协议

```
UDP数据报格式:

| Source Port | Destination Port |
| Length      | Checksum         |
| Data                          |

UDP vs TCP:

| 特性     | TCP              | UDP           |
|----------|------------------|---------------|
| 连接     | 面向连接          | 无连接        |
| 可靠性   | 可靠              | 不可靠        |
| 顺序     | 有序              | 无序          |
| 流量控制 | 有               | 无            |
| 拥塞控制 | 有               | 无            |
| 头部大小 | 20-60B           | 8B            |
| 传输效率 | 低               | 高            |
| 适用场景 | 文件/网页/邮件    | 视频/DNS/游戏 |

QUIC协议 (HTTP/3):
  基于UDP实现的可靠传输
  集成TLS 1.3, 0-RTT握手
  连接迁移 (基于Connection ID而非四元组)
  解决TCP的队头阻塞问题
```

> 跨模块引用：[操作系统](os)的Socket接口是传输层的编程抽象。[Java](java/overview)的NIO/Netty框架封装了TCP/UDP的异步IO操作。[C语言](c/overview)的Berkeley Socket API是最底层的网络编程接口。

---

## 5. 应用层

### 5.1 DNS协议

```
DNS (Domain Name System): 域名 -> IP地址

DNS层次结构:
  根域 (.)
  +-- 顶级域 (.com, .org, .net, .cn)
      +-- 二级域 (google.com, baidu.com)
          +-- 子域 (mail.google.com, www.baidu.com)

DNS解析流程 (递归+迭代):

  Client -> Local DNS -> Root DNS -> .com TLD DNS -> google.com权威DNS
  Client <- Local DNS <- (缓存结果)

DNS记录类型:
  A     : 域名 -> IPv4地址
  AAAA  : 域名 -> IPv6地址
  CNAME : 域名别名
  MX    : 邮件服务器
  NS    : 权威DNS服务器
  TXT   : 文本记录 (SPF, DKIM)
  SOA   : 区域起始授权

DNS报文格式:
  | Header | Question | Answer | Authority | Additional |
  Header: ID | Flags | QDCOUNT | ANCOUNT | NSCOUNT | ARCOUNT
```

### 5.2 HTTP协议

```
HTTP请求/响应模型:

  Client                              Server
     |  Request (GET /index.html)       |
     |---------------------------------->|
     |                                  |
     |  Response (200 OK + Body)        |
     |<----------------------------------|

HTTP/1.1 请求格式:
  GET /index.html HTTP/1.1
  Host: www.example.com
  Connection: keep-alive
  Accept: text/html

HTTP/1.1 响应格式:
  HTTP/1.1 200 OK
  Content-Type: text/html
  Content-Length: 1234
  Connection: keep-alive

  <html>...</html>

HTTP方法:
  GET:    获取资源
  POST:   提交数据
  PUT:    替换资源
  DELETE: 删除资源
  HEAD:   获取头部
  OPTIONS: 查询支持的方法

HTTP状态码:
  1xx: 信息 (100 Continue)
  2xx: 成功 (200 OK, 201 Created, 204 No Content)
  3xx: 重定向 (301 永久, 302 临时, 304 未修改)
  4xx: 客户端错误 (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found)
  5xx: 服务器错误 (500 Internal, 502 Bad Gateway, 503 Unavailable)
```

### 5.3 HTTP演进

```
HTTP版本演进:

HTTP/1.0:
  短连接, 每个请求需要新建TCP连接
  问题: 连接建立开销大

HTTP/1.1:
  长连接 (Connection: keep-alive)
  管道化 (pipelining, 但存在队头阻塞)
  分块传输 (Transfer-Encoding: chunked)
  缓存机制 (Cache-Control, ETag)

HTTP/2:
  二进制帧 (替代文本格式)
  多路复用 (一个连接上并行多个流)
  头部压缩 (HPACK)
  服务器推送
  解决: 应用层队头阻塞
  未解决: TCP层队头阻塞 (一个包丢失阻塞所有流)

HTTP/3 (QUIC):
  基于UDP, 解决TCP队头阻塞
  0-RTT连接建立
  连接迁移 (移动网络切换不断连)
  内置TLS 1.3
```

### 5.4 TLS协议

```
TLS 1.3握手流程:

  Client                              Server
     |  ClientHello                     |
     |  (supported_versions, key_share) |
     |---------------------------------->|
     |                                  |
     |  ServerHello                     |
     |  (key_share, certificate,        |
     |   certificate_verify, finished)  |
     |<----------------------------------|
     |                                  |
     |  Finished                        |
     |---------------------------------->|
     |                                  |
     |  Application Data (encrypted)    |
     |<---------------------------------->|

TLS 1.3 vs 1.2:
  握手: 2-RTT -> 1-RTT
  恢复: 1-RTT -> 0-RTT
  密码套件: 精简为AEAD (AES-GCM, ChaCha20-Poly1305)
  密钥交换: 仅支持ECDHE (前向保密)
  移除: RSA密钥交换, CBC模式, SHA-1, 压缩
```

---

## 6. 网络安全

### 6.1 加密基础

```
对称加密:
  加密解密使用同一密钥
  AES (128/192/256位)
  速度快, 密钥分发困难

非对称加密:
  公钥加密, 私钥解密 (或反过来)
  RSA, ECC
  速度慢, 解决密钥分发问题

数字签名:
  发送方用私钥签名, 接收方用公钥验证
  保证: 完整性 + 不可否认性

数字证书:
  CA (证书颁发机构) 签名绑定公钥和身份
  证书链: Root CA -> Intermediate CA -> End Entity
```

### 6.2 防火墙与NAT

```
NAT (Network Address Translation):

  私有地址范围:
    10.0.0.0/8
    172.16.0.0/12
    192.168.0.0/16

  NAT转换表:
    内部地址:端口        外部地址:端口
    192.168.1.5:1234  ->  203.0.113.1:5678

  NAT类型:
    SNAT (源NAT): 内网访问外网时转换源地址
    DNAT (目的NAT): 外网访问内网时转换目的地址
    PAT (端口地址转换): 多个内网地址共享一个公网IP

  NAT穿越问题:
    NAT破坏了端到端通信
    解决: STUN, TURN, ICE
```

> 跨模块引用：[操作系统](os)的iptables/nftables实现了NAT和防火墙功能。[离散数学](discrete-math)的数论基础是RSA/ECC加密算法的理论支撑。[编译原理](compiler)的TLS实现涉及证书解析和协议状态机。

---

## 7. 速查表

### 7.1 协议栈速查

| 层次 | 协议     | 端口 | 功能       |
| ---- | -------- | ---- | ---------- |
| 应用 | HTTP     | 80   | 网页       |
| 应用 | HTTPS    | 443  | 安全网页   |
| 应用 | DNS      | 53   | 域名解析   |
| 应用 | SMTP     | 25   | 邮件发送   |
| 应用 | SSH      | 22   | 远程登录   |
| 传输 | TCP      | -    | 可靠传输   |
| 传输 | UDP      | -    | 快速传输   |
| 网络 | IP       | -    | 寻址路由   |
| 网络 | ICMP     | -    | 差错报告   |
| 网络 | ARP      | -    | 地址解析   |
| 链路 | Ethernet | -    | 局域网     |
| 链路 | WiFi     | -    | 无线局域网 |

### 7.2 TCP状态速查

| 状态        | 含义               | 转移                       |
| ----------- | ------------------ | -------------------------- |
| LISTEN      | 等待连接           | 收到SYN -> SYN_RCVD        |
| SYN_SENT    | 已发SYN            | 收到SYN+ACK -> ESTABLISHED |
| SYN_RCVD    | 已收SYN并发SYN+ACK | 收到ACK -> ESTABLISHED     |
| ESTABLISHED | 连接建立           | 发FIN -> FIN_WAIT_1        |
| FIN_WAIT_1  | 已发FIN            | 收ACK -> FIN_WAIT_2        |
| FIN_WAIT_2  | 等待对方FIN        | 收FIN -> TIME_WAIT         |
| CLOSE_WAIT  | 收到FIN            | 发FIN -> LAST_ACK          |
| TIME_WAIT   | 等待2MSL           | 超时 -> CLOSED             |

### 7.3 拥塞控制速查

| 阶段     | 触发条件         | cwnd变化                |
| -------- | ---------------- | ----------------------- |
| 慢启动   | cwnd < ssthresh  | 指数增长                |
| 拥塞避免 | cwnd >= ssthresh | 线性增长                |
| 快速重传 | 3个重复ACK       | ssthresh=cwnd/2         |
| 快速恢复 | 快速重传后       | cwnd=ssthresh+3         |
| 超时重传 | RTO超时          | ssthresh=cwnd/2, cwnd=1 |

### 7.4 HTTP状态码速查

| 码段 | 含义       | 常见码                              |
| ---- | ---------- | ----------------------------------- |
| 2xx  | 成功       | 200 OK, 201 Created, 204 No Content |
| 3xx  | 重定向     | 301 永久, 302 临时, 304 未修改      |
| 4xx  | 客户端错误 | 400 Bad Request, 401/403/404        |
| 5xx  | 服务端错误 | 500/502/503/504                     |

---

## 延伸阅读

- _Computer Networking: A Top-Down Approach_ -- Kurose & Ross
- _TCP/IP Illustrated, Volume 1_ -- W. Richard Stevens
- _Unix Network Programming_ -- W. Richard Stevens
- _High Performance Browser Networking_ -- Ilya Grigorik
