---
order: 91
title: 网络协议深度
module: 'cs-fundamentals'
category: 计算机基础
difficulty: advanced
description: '网络协议深度剖析：TCP拥塞控制机制、QUIC协议设计、HTTP演进、TLS 1.3握手、DNS解析、CDN原理、WebSocket与网络编程模型。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cs-fundamentals/人机交互'
  - 'cs-fundamentals/编程语言理论'
  - 'cs-fundamentals/编译与运行时'
  - 'cs-fundamentals/进程PCB与线程TCB'
prerequisites:
  - 'cs-fundamentals/计算机科学概述'
---

## 1. TCP拥塞控制深度

### 1.1 拥塞控制全景

```
TCP拥塞控制四大算法:

  +------------------------------------------+
  |          拥塞状态机                       |
  |                                          |
  |  Open (正常)                             |
  |    |                                     |
  |    +-- 3个重复ACK --> Recovery (恢复)     |
  |    |                    |                |
  |    +-- RTO超时 --> Loss (丢失)            |
  |                         |                |
  |    +-- 新ACK ---------> Open             |
  +------------------------------------------+

  核心变量:
    cwnd:    拥塞窗口 (发送方限制)
    ssthresh: 慢启动阈值
    rtt:     往返时延
    rto:     重传超时

  发送窗口 = min(cwnd, rwnd)
  cwnd: 发送方根据网络拥塞程度调整
  rwnd: 接收方根据缓冲区大小调整
```

### 1.2 慢启动 (Slow Start)

```
慢启动算法:

  初始: cwnd = 1 MSS (通常1460B)
  每收到一个ACK: cwnd += 1 MSS
  每个RTT: cwnd翻倍 (指数增长)

  示例 (MSS=1, 初始cwnd=1):
    RTT 0: cwnd=1,  发送1个段
    RTT 1: cwnd=2,  发送2个段
    RTT 2: cwnd=4,  发送4个段
    RTT 3: cwnd=8,  发送8个段
    RTT 4: cwnd=16, 发送16个段

  cwnd增长:
    ^
  16|                    *
   8|               *
   4|          *
   2|     *
   1|*
    +--+--+--+--+--+--+---> RTT

  初始cwnd的演进:
    RFC 2581 (1999): cwnd = 1 MSS
    RFC 3390 (2002): cwnd = min(4*MSS, max(2*MSS, 4380B))
    RFC 6928 (2013): cwnd = 10 MSS (Linux 2.6.39+)

  退出条件:
    cwnd >= ssthresh -> 切换到拥塞避免
    检测到丢包 -> 进入恢复状态
```

### 1.3 拥塞避免 (Congestion Avoidance)

```
拥塞避免算法:

  每个RTT: cwnd += 1 MSS (线性增长, 加性增)
  每收到一个ACK: cwnd += MSS * MSS / cwnd

  示例 (cwnd=10 MSS):
    每个ACK: cwnd += 1460 * 1460 / (10 * 1460) = 146B
    一个RTT(10个ACK): cwnd += 1460B = 1 MSS

  cwnd变化:
    ^
    |                   /
    |                  /
    |                 /  (线性增长)
    |                /
    |               /
    |              /
    |             /
    |            /
    |     * * * /  (指数增长, 慢启动)
    |   *
    |  *
    | *
    +--+--+--+--+--+--+---> RTT

  ssthresh的动态调整:
    检测到丢包时: ssthresh = cwnd / 2 (乘性减)
    超时: ssthresh = cwnd / 2, cwnd = 1 MSS
    3个重复ACK: ssthresh = cwnd / 2
```

### 1.4 快速重传与快速恢复

```
快速重传 (Fast Retransmit):

  触发条件: 收到3个重复ACK (即总共4个相同ACK)
  立即重传丢失的段，不等RTO超时

  示例:
    发送: S1, S2, S3, S4, S5
    接收: S1, S2(丢失), -, -, -

    S1到达 -> ACK 2 (期望S2)
    S3到达 -> ACK 2 (重复ACK 1)
    S4到达 -> ACK 2 (重复ACK 2)
    S5到达 -> ACK 2 (重复ACK 3)

    收到3个重复ACK -> 立即重传S2

快速恢复 (Fast Recovery) - TCP Reno:

  1. ssthresh = cwnd / 2
  2. cwnd = ssthresh + 3 MSS
     (+3是因为已收到3个重复ACK, 说明3个段已离开网络)
  3. 每收到一个重复ACK: cwnd += 1 MSS
     (又有一个段离开网络, 可以发送新段)
  4. 收到新ACK (确认重传段):
     cwnd = ssthresh
     进入拥塞避免

  TCP Tahoe (旧版):
    3个重复ACK -> ssthresh = cwnd/2, cwnd = 1
    退回慢启动 (过于保守)

  TCP NewReno:
    改进: 一次恢复中处理多个丢包
    记住最高已确认序号
    在恢复期间持续检测部分ACK
    直到所有在窗口内的段都被确认
```

### 1.5 拥塞控制变体

```
TCP拥塞控制变体:

1. TCP Cubic (Linux默认, 2.6.19+):
   不依赖RTT的拥塞窗口增长
   使用三次函数调整cwnd:
     W(t) = C * (t - K)^3 + W_max
   t: 距上次丢包的时间
   W_max: 上次丢包时的窗口
   K: 窗口增长到W_max的时间

   优点: 公平性好(不依赖RTT), 适合高带宽长延迟网络
   缺点: 可能过于激进, 与Bufferbloat冲突

2. TCP BBR (Google, 2016):
   基于模型的拥塞控制
   不以丢包为拥塞信号

   测量两个参数:
     BtlBw: 瓶颈带宽
     RTprop: 最小RTT(传播延迟)

   状态机:
     Startup: 指数增长探测带宽
     Drain: 排空队列
     ProbeBW: 周期性探测带宽(8个相位)
     ProbeRTT: 周期性探测RTT(降低发送率)

   BBR vs Cubic:
     Cubic: 基于丢包, 填满缓冲区才减速
     BBR:   基于模型, 保持在最优点

3. TCP Vegas:
   基于延迟的拥塞控制
   比较实际吞吐率与期望吞吐率
   diff = Expected - Actual
   diff过大 -> 减小cwnd (网络拥塞)
   diff过小 -> 增大cwnd
   问题: 与Cubic竞争时处于劣势(带宽被抢占)
```

**BBR核心逻辑伪代码**：

```python
def bbr_update_model(acked, rtt):
    # 更新RTprop (最小RTT)
    if rtt < rtprop or rtprop_expired:
        rtprop = rtt
        rtprop_stamp = now()

    # 更新BtlBw (瓶颈带宽)
    bw_sample = acked / rtt
    if bw_sample > btlbw:
        btlbw = bw_sample

    # 计算发送速率
    pacing_rate = pacing_gain * btlbw

    # 计算在途数据量
    cwnd = btlbw * rtprop  # BDP (Bandwidth-Delay Product)
```

> 跨模块引用：[计算机网络](network)基础篇介绍了TCP基本机制和拥塞控制概述。[操作系统](os)的内核网络栈实现了这些算法。

---

## 2. UDP与QUIC协议

### 2.1 UDP深入

```
UDP适用场景分析:

1. 实时音视频 (WebRTC):
   丢包可容忍, 延迟不可容忍
   30fps视频: 每帧33ms, 重传来不及

2. DNS查询:
   请求小(通常<512B), 一次交互
   重传比建立连接更高效

3. 游戏同步:
   60fps游戏: 每帧16ms
   状态更新频繁, 旧数据无价值

4. IoT传感器:
   小数据包, 低功耗
   避免TCP连接维护开销

UDP可靠性扩展:
  应用层实现选择性重传
  前向纠错 (FEC): Reed-Solomon编码
  例: 发送10个数据包 + 2个冗余包
      丢失任意2个包可恢复
```

### 2.2 QUIC协议设计

```
QUIC (Quick UDP Internet Connections):

  设计目标: 解决TCP的固有缺陷

  +------------------------------------------+
  |              QUIC                         |
  |  +--------------------------------------+ |
  |  |  HTTP/3 (应用层)                      | |
  |  +--------------------------------------+ |
  |  |  可靠传输 | 流复用 | 加密 | 拥塞控制  | |
  |  +--------------------------------------+ |
  |  |  UDP                                  | |
  |  +--------------------------------------+ |
  +------------------------------------------+

  核心特性:

1. 解决队头阻塞 (Head-of-Line Blocking):
   TCP: 一个包丢失阻塞所有流
   QUIC: 每个流独立, 一个流丢包不影响其他流

   TCP (HTTP/2):
   Stream1: [D1] [D2] [D3] ...  <- D2丢失, D3被阻塞
   Stream2: [D4] [D5] [D6] ...  <- 也被阻塞!

   QUIC (HTTP/3):
   Stream1: [D1] [D2] [D3] ...  <- D2丢失, 仅Stream1等待
   Stream2: [D4] [D5] [D6] ...  <- 不受影响!

2. 连接迁移:
   TCP连接标识: (源IP, 源端口, 目的IP, 目的端口)
   WiFi切4G -> 四元组变化 -> TCP断开

   QUIC连接标识: Connection ID (64位随机数)
   WiFi切4G -> CID不变 -> 连接保持

3. 0-RTT握手:
   首次: 1-RTT (TLS 1.3 + QUIC握手合并)
   恢复: 0-RTT (使用缓存的会话票据)

4. 用户态实现:
   不依赖内核TCP栈
   快速迭代, 无需升级操作系统

QUIC帧类型:
  STREAM:     流数据
  ACK:        确认
  CRYPTO:     加密握手
  PING/PONG:  保活
  RESET_STREAM: 流重置
  CONNECTION_CLOSE: 连接关闭
  MAX_DATA:   流量控制
  NEW_CONNECTION_ID: 新CID
```

### 2.3 QUIC vs TCP对比

```
QUIC vs TCP 详细对比:

| 特性         | TCP              | QUIC              |
|-------------|------------------|-------------------|
| 传输层       | 内核实现         | 用户态(基于UDP)   |
| 队头阻塞     | 有(传输层)       | 无(流独立)        |
| 连接建立     | 1-RTT+TLS       | 1-RTT(首次)/0-RTT |
| 连接迁移     | 不支持           | 支持(CID)         |
| 拥塞控制     | 内核固定         | 可插拔            |
| 流量控制     | 连接级           | 连接级+流级       |
| 加密         | 可选(TLS)        | 强制(TLS 1.3)     |
| 中间件兼容   | 广泛             | 部分不支持        |
| 调试         | tcpdump/Wireshark| 需要QUIC解析器    |
| 内核开销     | 低               | 略高(用户态)      |

QUIC面临的挑战:
  1. UDP可能被网络设备限速/阻断
  2. 中间件(NAT/防火墙)对UDP支持不完善
  3. 用户态实现性能优化(需要GSO/GRO等内核支持)
  4. 调试工具链不如TCP成熟
```

> 跨模块引用：[计算机网络](network)基础篇介绍了TCP/UDP基本概念。[操作系统](os)的内核网络栈是TCP实现的基础。

---

## 3. HTTP演进深度

### 3.1 HTTP/1.1的问题

```
HTTP/1.1性能瓶颈:

1. 队头阻塞 (应用层):
   一个TCP连接上, 前一个请求未完成, 后一个请求等待
   浏览器通常开6个并发连接缓解

2. 冗余头部:
   每个请求都携带完整头部
   Cookie可能达数KB
   User-Agent, Accept等重复传输

3. 无优先级:
   CSS/JS/图片同等优先级
   关键资源可能被非关键资源阻塞

4. 无服务器推送:
   客户端必须先请求HTML, 解析后才知道需要CSS/JS
   多一次RTT延迟

优化手段 (HTTP/1.1时代):
  - 合并文件 (CSS Sprites, JS Bundle)
  - 内联资源 (Data URI)
  - 域名分片 (多域名突破6连接限制)
  - 缓存 (ETag, Cache-Control)
```

### 3.2 HTTP/2核心机制

```
HTTP/2核心特性:

1. 二进制帧层 (Binary Framing):
   HTTP/1.1: 文本格式 (GET / HTTP/1.1\r\n)
   HTTP/2:   二进制帧

   帧格式:
   | Length(24) | Type(8) | Flags(8) | R(1) | StreamID(31) |
   | Payload (Length bytes)                           |

   帧类型:
     DATA:     请求/响应体
     HEADERS:  请求/响应头
     SETTINGS: 连接参数
     WINDOW_UPDATE: 流量控制
     PING:     保活
     GOAWAY:   关闭连接
     RST_STREAM: 终止流

2. 多路复用 (Multiplexing):
   一个TCP连接上并行多个流
   每个流有唯一Stream ID
   帧可以交错发送

   Stream1: [H1][D1][D1]
   Stream3: [H3][D3]
   Stream5: [H5][D5][D5]

   每个流独立, 互不阻塞(应用层)

3. 头部压缩 (HPACK):
   静态表: 61个常用头部字段
     :method GET = index 2
     :path / = index 4
     content-type text/html = index 55

   动态表: 连接级, 双方维护
     首次: custom-header: value -> 编码为字面量, 加入动态表
     后续: custom-header: value -> 编码为动态表索引

   哈夫曼编码: 压缩字符串值

4. 服务器推送 (Server Push):
   客户端请求 index.html
   服务器推送 style.css, app.js
   减少客户端等待和请求

5. 流优先级:
   权重(1-256)和依赖关系
   服务器据此分配资源
```

### 3.3 HTTP/3与QUIC

```
HTTP/3架构:

  +----------------------------------+
  |  HTTP/3                          |
  |  +----------------------------+  |
  |  | QPACK (头部压缩)           |  |
  |  +----------------------------+  |
  |  | HTTP语义 (请求/响应/推送)   |  |
  |  +----------------------------+  |
  |  | QUIC (传输层)               |  |
  |  |  流 | 加密 | 拥塞控制       |  |
  |  +----------------------------+  |
  |  | UDP                          |  |
  |  +----------------------------+  |
  +----------------------------------+

  HTTP/3 vs HTTP/2:

  | 特性       | HTTP/2          | HTTP/3          |
  |-----------|-----------------|-----------------|
  | 传输层     | TCP             | QUIC(UDP)       |
  | 队头阻塞   | TCP层有         | 无              |
  | 头部压缩   | HPACK           | QPACK           |
  | 连接建立   | TCP+TLS(2-3RTT) | QUIC(1-RTT)     |
  | 连接迁移   | 不支持          | 支持            |
  | 加密       | 可选            | 强制            |

  QPACK vs HPACK:
    HPACK依赖流的有序交付
    QUIC流可能乱序到达
    QPACK使用绝对索引 + 确认机制
    允许乱序编码/解码
```

> 跨模块引用：[计算机网络](network)基础篇介绍了HTTP基本概念和版本演进概述。[操作系统](os)的Socket接口是HTTP客户端/服务器的编程基础。

---

## 4. TLS 1.3握手

### 4.1 TLS 1.3握手流程

```
TLS 1.3完整握手 (1-RTT):

  Client                                Server
     |  ClientHello                        |
     |  + key_share (ECDHE公钥)            |
     |  + supported_groups                 |
     |  + signature_algorithms             |
     |  + supported_versions = TLS 1.3     |
     |------------------------------------->|
     |                                     |
     |  ServerHello                        |
     |  + key_share (ECDHE公钥)            |
     |  + supported_versions = TLS 1.3     |
     |  EncryptedExtensions                |
     |  Certificate                        |
     |  CertificateVerify                  |
     |  Finished                           |
     |<-------------------------------------|
     |                                     |
     |  Finished                           |
     |------------------------------------->|
     |                                     |
     |  Application Data <===============> |

  关键改进:
    1. ClientHello携带key_share -> 节省1-RTT
    2. ServerHello后所有消息加密 -> 更安全
    3. 握手从2-RTT减少到1-RTT

TLS 1.3 0-RTT (恢复会话):

  Client                                Server
     |  ClientHello                        |
     |  + key_share                        |
     |  + early_data (应用数据)             |
     |  + pre_shared_key                   |
     |------------------------------------->|
     |                                     |
     |  ServerHello                        |
     |  + pre_shared_key                   |
     |  EncryptedExtensions                |
     |  + early_data确认                   |
     |  Finished                           |
     |<-------------------------------------|
     |                                     |
     |  Application Data <===============> |

  0-RTT: 客户端利用缓存的PSK立即发送数据
  安全限制: 0-RTT数据无前向保密, 可能受重放攻击
  仅适用于幂等请求(GET等)
```

### 4.2 TLS 1.3密码套件

```
TLS 1.3精简的密码套件:

  密钥交换: 仅ECDHE (前向保密)
    x25519 (推荐, Curve25519)
    secp256r1 (P-256)
    secp384r1 (P-384)

  对称加密: 仅AEAD
    TLS_AES_128_GCM_SHA256
    TLS_AES_256_GCM_SHA384
    TLS_CHACHA20_POLY1305_SHA256

  签名算法:
    rsa_pss_rsae_sha256
    rsa_pss_rsae_sha384
    ecdsa_secp256r1_sha256
    ed25519

  TLS 1.3移除的:
    - RSA密钥交换 (无前向保密)
    - CBC模式 (BEAST/Lucky13攻击)
    - RC4 (已破解)
    - SHA-1 (碰撞攻击)
    - MD5 (已破解)
    - 压缩 (CRIME攻击)
    - renegotiation (漏洞多)
    - 非AEAD密码套件

  HKDF (HMAC-based Key Derivation):
    用于从共享密钥派生所有会话密钥

    Extract: PRK = HMAC-Hash(salt, IKM)
    Expand:  OKM = HMAC-Hash(PRK, info || 0x01)
```

### 4.3 证书链验证

```
TLS证书链验证流程:

  End Entity Certificate (服务器证书)
       |
       v  签发者
  Intermediate CA Certificate
       |
       v  签发者
  Root CA Certificate (自签名, 内置在浏览器/OS中)

  验证步骤:
    1. 证书签名验证: 用CA公钥验证证书签名
    2. 证书有效期: notBefore <= now <= notAfter
    3. 证书用途: Key Usage, Extended Key Usage
    4. 主机名匹配: SAN/CN与请求域名匹配
    5. 吊销检查: CRL / OCSP / OCSP Stapling
    6. 证书链完整性: 从End Entity到Root CA逐级验证

  OCSP Stapling:
    服务器主动获取OCSP响应并附加到TLS握手
    客户端无需单独查询OCSP服务器
    减少延迟, 保护隐私

  Certificate Transparency (CT):
    所有公开信任的证书必须记录在CT日志中
    允许域名所有者监控未授权的证书签发
```

> 跨模块引用：[计算机网络](network)基础篇介绍了TLS基本概念。[数制与编码](encoding)的加密算法是TLS的理论基础。

---

## 5. DNS解析流程

### 5.1 DNS解析完整流程

```
DNS解析完整流程 (递归+迭代):

  用户浏览器                    本地DNS              根DNS
     |                            |                    |
     | 1.查询 www.example.com     |                    |
     |--------------------------->|                    |
     |                            | 2.查询 .com NS     |
     |                            |------------------->|
     |                            |                    |
     |                            | 3.返回.com NS IP   |
     |                            |<-------------------|
     |                            |                    |
     |                            | 4.查询example.com NS
     |                            |---------> .com TLD DNS
     |                            |<--------- 返回NS记录
     |                            |
     |                            | 5.查询www.example.com
     |                            |---------> example.com权威DNS
     |                            |<--------- 返回A记录 93.184.216.34
     |                            |
     | 6.返回 93.184.216.34       |
     |<---------------------------|
     |                            |
     | 7.建立TCP连接到93.184.216.34:443

DNS缓存层次:
  1. 浏览器DNS缓存 (约60s)
  2. OS DNS缓存 (Windows: ipconfig /displaydns)
  3. 路由器DNS缓存
  4. 本地DNS服务器缓存 (ISP提供)
  5. 权威DNS服务器 (TTL控制)

DNS记录类型详解:
  A      : 域名 -> IPv4
  AAAA   : 域名 -> IPv6
  CNAME  : 域名别名 (www.example.com -> example.com)
  MX     : 邮件服务器 (优先级 + 服务器名)
  NS     : 权威DNS服务器
  TXT    : 文本记录 (SPF, DKIM, DMARC)
  SOA    : 区域起始授权 (主DNS + 管理员邮箱 + 序列号 + TTL)
  SRV    : 服务定位 (_service._proto.name -> host:port)
  CAA    : 证书颁发授权 (指定允许的CA)
```

### 5.2 DNS安全与隐私

```
DNS安全问题:

1. DNS劫持:
   修改DNS响应, 将用户导向恶意网站
   防御: DNSSEC

2. DNS缓存投毒:
   伪造DNS响应注入缓存
   Kaminsky攻击 (2008): 利用事务ID预测
   防御: 源端口随机化, DNSSEC

3. DNS放大攻击:
   利用DNS服务器进行DDoS
   小查询(60B) -> 大响应(4000B), 放大比~70:1
   防御: 限制递归查询来源, BCP38

4. DNS隐私泄露:
   DNS查询明文传输
   ISP可监控用户访问的域名
   防御: DoH, DoT, DoQ

DNS加密协议:
  DoT (DNS over TLS):    853端口, TLS加密
  DoH (DNS over HTTPS):  443端口, HTTPS加密
  DoQ (DNS over QUIC):   853端口, QUIC加密

  DoH vs DoT:
    DoH: 与Web流量混合, 难以过滤
    DoT: 独立端口, 企业可选择性阻断

DNSSEC:
  对DNS记录进行数字签名
  保证: 来源真实性 + 数据完整性
  不保证: 机密性 (查询仍明文)

  新记录类型:
    DNSKEY: 区域签名公钥
    RRSIG:  资源记录签名
    DS:     委派签名者(父区域验证子区域)
    NSEC/NSEC3: 不存在证明(防枚举)
```

> 跨模块引用：[计算机网络](network)基础篇介绍了DNS基本概念和记录类型。[操作系统](os)的/etc/resolv.conf配置DNS服务器。

---

## 6. CDN原理

### 6.1 CDN架构

```
CDN (Content Delivery Network) 架构:

  +----------------------------------------------------------+
  |  用户 (北京)                                               |
  |     |                                                      |
  |     v                                                      |
  |  +------------------+                                      |
  |  | 边缘节点 (北京)   | <-- 命中: 直接返回                    |
  |  +------------------+                                      |
  |     | 未命中                                                |
  |     v                                                      |
  |  +------------------+                                      |
  |  | 区域节点 (华北)   | <-- 命中: 缓存到边缘, 返回            |
  |  +------------------+                                      |
  |     | 未命中                                                |
  |     v                                                      |
  |  +------------------+                                      |
  |  | 中心节点/源站     | <-- 回源获取                          |
  |  +------------------+                                      |
  +----------------------------------------------------------+

CDN路由 (用户如何到达最近的边缘节点):

1. DNS路由 (最常用):
   用户查询 cdn.example.com
   CDN的权威DNS根据用户IP返回最近的边缘节点IP
   GSLB (Global Server Load Balancing)

2. Anycast路由:
   所有边缘节点使用相同IP
   BGP路由自动选择最近的节点
   网络层路由, 更精确

3. HTTP重定向:
   中心节点返回302重定向到边缘节点
   增加一次RTT, 较少使用
```

### 6.2 CDN缓存策略

```
CDN缓存层次:

  浏览器缓存 -> CDN边缘缓存 -> CDN区域缓存 -> 源站

  缓存键 (Cache Key):
    URL + Query String + Vary头部
    Vary: Accept-Encoding -> 不同编码分别缓存

  缓存状态:
    HIT:     命中边缘节点
    MISS:    未命中, 回源
    EXPIRED: 缓存过期, 需验证
    STALE:   缓存过期但仍可用(后台刷新)

  缓存控制:
    Cache-Control: max-age=3600     (缓存1小时)
    Cache-Control: s-maxage=3600    (CDN缓存1小时)
    Cache-Control: no-store         (不缓存)
    Cache-Control: stale-while-revalidate=60 (过期后60s内可返回旧内容)

  缓存刷新:
    1. 被动: TTL过期后下次请求刷新
    2. 主动: CDN API强制刷新 (PURGE)
    3. 版本化: /v1.2/app.js (新版本新URL)

  回源优化:
    请求合并 (Request Coalescing):
      多个用户请求同一未缓存资源
      CDN只回源一次, 结果分发给所有等待者

    源站保护 (Origin Shield):
      设置一个中间层缓存
      所有回源请求先经过Shield
      减少源站压力
```

### 6.3 CDN动态加速

```
CDN动态加速 (DCN - Dynamic Content Network):

  静态内容: 缓存即可
  动态内容: API响应, 实时数据, 无法缓存

  加速技术:

1. 路由优化:
   默认: 用户 -> 公网 -> 源站 (可能绕路)
   CDN:  用户 -> 边缘 -> CDN骨干网 -> 源站 (优化路径)
   CDN骨干网: 专线/优化路由, 减少跳数和延迟

2. TCP优化:
   边缘节点与源站之间:
   - 更大的初始cwnd
   - 优化的拥塞控制算法
   - TCP连接复用 (Keep-Alive)

3. TLS优化:
   边缘节点: TLS终端 (减少源站TLS开销)
   边缘->源站: TLS连接复用, 会话票据

4. 数据压缩:
   Brotli压缩 (比gzip小15-25%)
   边缘节点压缩/解压

5. 预连接:
   边缘节点与源站保持TCP+TLS连接池
   用户请求到达时直接使用, 无需建连
```

> 跨模块引用：[计算机网络](network)基础篇介绍了DNS和HTTP缓存。[操作系统](os)的页缓存机制与CDN缓存在原理上相似(局部性原理)。

---

## 7. WebSocket协议

### 7.1 WebSocket握手

```
WebSocket握手 (基于HTTP升级):

  Client                                Server
     |  GET /chat HTTP/1.1                 |
     |  Host: server.example.com           |
     |  Upgrade: websocket                 |
     |  Connection: Upgrade                |
     |  Sec-WebSocket-Key: dGhlIH...       |
     |  Sec-WebSocket-Version: 13          |
     |------------------------------------->|
     |                                     |
     |  HTTP/1.1 101 Switching Protocols    |
     |  Upgrade: websocket                 |
     |  Connection: Upgrade                |
     |  Sec-WebSocket-Accept: s3pP...      |
     |<-------------------------------------|
     |                                     |
     |  WebSocket Frame <================> |

  Sec-WebSocket-Accept计算:
    key = "dGhlIH..." (客户端随机Base64)
    accept = Base64(SHA1(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))
    防止非WebSocket客户端误连
```

### 7.2 WebSocket帧格式

```
WebSocket帧格式:

    0                   1                   2                   3
    0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
   +-+-+-+-+-------+-+-------------+-------------------------------+
   |F|R|R|R| opcode|M| Payload len |    Extended payload length     |
   |I|S|S|S|  (4)  |A|     (7)     |            (16/64)             |
   |N|V|V|V|       |S|             |   (if payload len==126/127)    |
   | |1|2|3|       |K|             |                               |
   +-+-+-+-+-------+-+-------------+-------------------------------+
   |     Extended payload length continued, if payload len == 127   |
   +-------------------------------+-------------------------------+
   |                               |Masking-key, if MASK set to 1  |
   +-------------------------------+-------------------------------+
   | Masking-key (continued)       |          Payload Data         |
   +-------------------------------- - - - - - - - - - - - - - - - +

  关键字段:
    FIN:     是否为最后一帧
    opcode:  帧类型
      0x0: Continuation
      0x1: Text (UTF-8)
      0x2: Binary
      0x8: Close
      0x9: Ping
      0xA: Pong
    MASK:    是否掩码(客户端发送必须掩码)
    Payload len: 7位(0-125) / 16位(126+2字节) / 64位(127+8字节)

  掩码算法 (客户端->服务器):
    for i in range(payload_len):
        decoded[i] = encoded[i] ^ mask_key[i % 4]
    防止缓存投毒攻击
```

### 7.3 WebSocket vs HTTP长轮询

```
实时通信方案对比:

1. HTTP短轮询:
   客户端定期发送请求
   延迟: 轮询间隔
   开销: 大量无效请求

2. HTTP长轮询:
   服务器有数据才响应
   延迟: 低
   开销: 每次消息需建连(HTTP/1.1)或发请求(HTTP/2)

3. Server-Sent Events (SSE):
   服务器->客户端单向推送
   基于HTTP, 自动重连
   仅文本数据
   不支持二进制

4. WebSocket:
   全双工通信
   低延迟, 低开销(帧头2-14字节)
   支持二进制数据
   需要额外的心跳维护

  对比:
  | 特性     | 短轮询 | 长轮询 | SSE    | WebSocket |
  |---------|-------|-------|--------|-----------|
  | 方向     | 拉取   | 拉取   | 服务器推| 双向      |
  | 延迟     | 高     | 中     | 低     | 最低      |
  | 开销     | 高     | 中     | 低     | 最低      |
  | 二进制   | 是     | 是     | 否     | 是        |
  | 连接     | 短连接 | 长连接 | 长连接  | 长连接    |
  | 代理兼容 | 好     | 好     | 好     | 部分问题  |
```

> 跨模块引用：[计算机网络](network)基础篇介绍了HTTP协议。[操作系统](os)的I/O多路复用是WebSocket服务器的基础。

---

## 8. 网络编程模型

### 8.1 Socket编程

```
Socket API (Berkeley Socket):

  TCP服务器流程:
    socket() -> bind() -> listen() -> accept() -> recv()/send() -> close()

  TCP客户端流程:
    socket() -> connect() -> send()/recv() -> close()

  服务器伪代码:
    int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    bind(server_fd, (struct sockaddr*)&addr, sizeof(addr));
    listen(server_fd, backlog);
    while (1) {
        int client_fd = accept(server_fd, NULL, NULL);
        // 处理client_fd...
        close(client_fd);
    }

  关键参数:
    backlog: listen队列长度
      SYN_RCVD + ESTABLISHED状态连接数
      Linux: /proc/sys/net/ipv4/tcp_max_syn_backlog
             /proc/sys/net/core/somaxconn

    SO_REUSEADDR: 允许绑定TIME_WAIT状态的地址
    SO_REUSEPORT: 允许多个socket绑定同一端口(多进程)
    TCP_NODELAY:  禁用Nagle算法(小包立即发送)
    TCP_CORK:     等待更多数据再发送(批量发送)
```

### 8.2 I/O多路复用深入

```
select/poll/epoll/kqueue对比:

1. select:
   int select(int nfds, fd_set *readfds, fd_set *writefds,
              fd_set *exceptfds, struct timeval *timeout);

   限制:
     - FD_SETSIZE = 1024 (编译时固定)
     - 每次调用需要复制fd_set (用户态<->内核态)
     - 返回后需线性扫描所有fd O(n)
     - 水平触发 (Level Triggered)

2. poll:
   int poll(struct pollfd *fds, nfds_t nfds, int timeout);

   改进:
     - 无fd数量限制
     - 使用pollfd数组, 更灵活
   仍需:
     - 每次调用复制整个数组
     - 线性扫描 O(n)

3. epoll (Linux):
   int epoll_create(int size);
   int epoll_ctl(int epfd, int op, int fd, struct epoll_event *event);
   int epoll_wait(int epfd, struct epoll_event *events,
                  int maxevents, int timeout);

   优势:
     - 仅返回就绪fd O(1)获取就绪事件
     - fd注册一次, 不需每次复制
     - 无fd数量限制 (仅受内存)
     - 支持边缘触发 (Edge Triggered)

   LT (水平触发) vs ET (边缘触发):
     LT: fd就绪时持续通知, 直到处理完
         编程简单, 不会漏事件
     ET: fd从非就绪变就绪时通知一次
         高效, 但需一次性读完所有数据
         必须用非阻塞I/O

4. kqueue (BSD/macOS):
   int kqueue(void);
   int kevent(int kq, const struct kevent *changelist, int nchanges,
              struct kevent *eventlist, int nevents, const struct timespec *timeout);

   优势:
     - 类似epoll, 事件驱动
     - 支持更多事件类型 (文件, 进程, 信号)
     - 可监听文件系统事件 (EVFILT_VNODE)
```

**epoll ET模式服务器伪代码**：

```c
// 设置非阻塞
int flags = fcntl(fd, F_GETFL, 0);
fcntl(fd, F_SETFL, flags | O_NONBLOCK);

// 注册epoll事件 (ET模式)
struct epoll_event ev;
ev.events = EPOLLIN | EPOLLET;  // 边缘触发
ev.data.fd = fd;
epoll_ctl(epfd, EPOLL_CTL_ADD, fd, &ev);

// 事件循环
while (1) {
    int n = epoll_wait(epfd, events, MAX_EVENTS, -1);
    for (int i = 0; i < n; i++) {
        if (events[i].data.fd == listen_fd) {
            // 接受所有新连接 (ET模式可能只通知一次)
            while ((client_fd = accept(listen_fd, NULL, NULL)) > 0) {
                set_nonblocking(client_fd);
                add_to_epoll(epfd, client_fd, EPOLLIN | EPOLLET);
            }
        } else {
            // 一次性读完所有数据 (ET模式必须)
            while (1) {
                int count = read(events[i].data.fd, buf, sizeof(buf));
                if (count == -1) {
                    if (errno == EAGAIN || errno == EWOULDBLOCK) {
                        break;  // 数据读完
                    }
                    // 错误处理
                } else if (count == 0) {
                    // 连接关闭
                    break;
                }
                // 处理数据
            }
        }
    }
}
```

### 8.3 Reactor与Proactor模式

```
Reactor模式 (同步I/O):

  主循环等待I/O事件 -> 分发给Handler处理

  +------------------------------------------+
  |  Reactor (epoll_wait)                    |
  |     |                                    |
  |     +-- 可读事件 --> ReadHandler          |
  |     +-- 可写事件 --> WriteHandler         |
  |     +-- 连接事件 --> AcceptHandler        |
  +------------------------------------------+

  流程:
    1. 注册感兴趣的事件
    2. 事件循环等待事件
    3. 事件就绪时分发给Handler
    4. Handler执行I/O操作(可能阻塞)

  代表: Netty (Java), libevent (C), Twisted (Python)

Proactor模式 (异步I/O):

  发起异步I/O -> 完成时回调

  +------------------------------------------+
  |  Proactor (io_getevents/aio)             |
  |     |                                    |
  |     +-- 读完成 --> ReadCompletionHandler  |
  |     +-- 写完成 --> WriteCompletionHandler |
  +------------------------------------------+

  流程:
    1. 发起异步I/O操作
    2. 操作系统在后台执行I/O
    3. I/O完成时通知Proactor
    4. Proactor调用CompletionHandler

  代表: IOCP (Windows), Boost.Asio (C++)

  Reactor vs Proactor:
    Reactor:  I/O就绪时通知 -> 应用执行I/O
    Proactor: I/O完成时通知 -> 应用处理结果
    Reactor更简单, Proactor更高效(真正的异步)
```

> 跨模块引用：[操作系统](os)的I/O模型和中断机制是网络编程的基础。[软件工程](software-engineering)的Reactor模式是高并发服务器的核心设计模式。

---

## 9. 速查表

### 9.1 拥塞控制速查

| 阶段     | 触发条件         | cwnd变化               | 算法      |
| -------- | ---------------- | ---------------------- | --------- |
| 慢启动   | cwnd < ssthresh  | 指数增长               | RFC 5681  |
| 拥塞避免 | cwnd >= ssthresh | 线性增长               | RFC 5681  |
| 快速重传 | 3个重复ACK       | ssthresh=cwnd/2        | TCP Reno  |
| 快速恢复 | 快速重传后       | cwnd=ssthresh+3        | TCP Reno  |
| 超时重传 | RTO超时          | ssthresh=cwnd/2,cwnd=1 | TCP Tahoe |

### 9.2 HTTP版本速查

| 特性       | HTTP/1.1 | HTTP/2    | HTTP/3    |
| ---------- | -------- | --------- | --------- |
| 传输层     | TCP      | TCP       | QUIC(UDP) |
| 头部       | 文本     | HPACK压缩 | QPACK压缩 |
| 多路复用   | 无       | 流        | 流        |
| 队头阻塞   | 应用+TCP | TCP层     | 无        |
| 服务器推送 | 无       | 有        | 有        |
| 加密       | 可选     | 可选      | 强制      |
| 连接建立   | 1-RTT    | 1+1-RTT   | 1/0-RTT   |

### 9.3 I/O模型速查

| 模型     | 系统调用         | 优势        | 劣势          |
| -------- | ---------------- | ----------- | ------------- |
| select   | select()         | 跨平台      | 1024限制,O(n) |
| poll     | poll()           | 无fd限制    | O(n)          |
| epoll    | epoll_wait()     | O(1),ET/LT  | 仅Linux       |
| kqueue   | kevent()         | O(1),多功能 | 仅BSD/macOS   |
| IOCP     | GetQueued...()   | 真异步      | 仅Windows     |
| io_uring | io_uring_enter() | 零拷贝,高效 | Linux 5.1+    |

### 9.4 DNS记录速查

| 类型  | 功能       | 示例                                 |
| ----- | ---------- | ------------------------------------ |
| A     | IPv4地址   | example.com -> 93.184.216.34         |
| AAAA  | IPv6地址   | example.com -> 2606:2800:220:1:...   |
| CNAME | 别名       | www.example.com -> example.com       |
| MX    | 邮件服务器 | example.com -> 10 mail.example.com   |
| NS    | DNS服务器  | example.com -> ns1.example.com       |
| TXT   | 文本记录   | "v=spf1 include:..."                 |
| SRV   | 服务定位   | \_sip.\_tcp -> 10 60 5060 sip.server |

---

## 延伸阅读

- _TCP/IP Illustrated, Volume 1_ (2nd Edition) -- Kevin Fall, W. Richard Stevens
- _High Performance Browser Networking_ -- Ilya Grigorik
- _Unix Network Programming, Volume 1_ (3rd Edition) -- W. Richard Stevens
- _Computer Networking: A Top-Down Approach_ (8th Edition) -- Kurose & Ross
- RFC 9000: QUIC Protocol
- RFC 9114: HTTP/3
