---
order: 360
title: WebSocket 帧格式
module: 'cs-fundamentals'
category: 计算机科学
difficulty: intermediate
description: WebSocket 协议帧格式与心跳机制：帧结构、控制帧、数据帧与 Ping/Pong。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cs-fundamentals/340-DNSFlow'
  - 'cs-fundamentals/350-CDNPrinciple'
  - 'cs-fundamentals/370-QUIC'
  - 'cs-fundamentals/380-ARPProtocolSpoofing'
prerequisites:
  - 'cs-fundamentals/010-ComputerOverview'
---

## 前置知识

- HTTP 协议的"请求-响应"模型：客户端不请求、服务器就不能说话；
- TCP 字节流无消息边界（见 [TCP 粘包与拆包](cs-fundamentals/310-TCPMessageFraming)）——WebSocket 是在这条流上定义了边界的协议；
- Base64 与 SHA-1 的基本概念（握手用到）。

## 学习目标

- 描述从 HTTP 升级为 WebSocket 的握手过程与验证算法；
- 画出 WebSocket 帧头各字段（FIN/opcode/MASK/长度）的布局并解释设计动机；
- 理解客户端掩码为什么强制存在（代理缓存投毒防御）；
- 掌握数据帧与控制帧的分类、分片规则与 Ping/Pong 心跳、关闭流程。

## 1. 概念引入：从"每封信重新投递"到"专线贴标签"

一个类比：HTTP 像**平信**——每条消息都要完整写地址、贴邮票、走邮局（每次都带全量请求头，且只有你寄信对方才能回信）。聊天室这种"对方随时要说话"的场景下，平信模型只能靠轮询（每隔几秒寄一封"有新消息吗"，大多数信的答复是"没有"），浪费且延迟高。

WebSocket 相当于在两家之间**修了一条专递管道**：修管道只用一次 HTTP（升级请求），此后消息在管道里以"贴了标签的小包裹"（帧）双向流动，既省去重复的信封（头开销 2-14 字节），又让服务器能主动推送。

## 2. 握手升级：一次 HTTP，终身 WebSocket

客户端发起一个带升级头部的普通 HTTP GET：

```text
GET /chat HTTP/1.1
Host: server.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

服务器同意则返回 **101 Switching Protocols**：

```text
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

`Sec-WebSocket-Accept` 的算法是确定的：`Base64(SHA-1(Key + 固定GUID))`，GUID 为 `258EAFA5-E914-47DA-95CA-C5AB0DC85B11`。它的作用不是加密，而是**证明对端真的懂 WebSocket 协议**，避免普通 HTTP 代理把升级响应缓存或误应答。此后这条 TCP 连接上传输的就不再是 HTTP 报文，而是 WebSocket 帧。

## 3. 帧格式：2 字节起步的轻量信封

每个 WebSocket 帧的头两字节布局如下（RFC 6455）：

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-------+-------+-------------------------------+---------------+
|F|R|R|R| opcode|M| Payload len |  扩展长度(16位)  |  扩展长度(64位) |  掩码密钥(32位，可选) |
|I|S|S|S|  (4)  |A|    (7)      |                |                |                |
|N|V|V|V|       |S|             |                |                |                |
+-+-+-------+-------+-------------------------------+---------------+
```

| 字段 | 位数 | 含义 |
| ---- | ---- | ---- |
| FIN | 1 | 1 = 消息的最后一帧（0 表示后面还有分片） |
| RSV1-3 | 3 | 保留位（扩展协议使用，如 permessage-deflate 压缩用 RSV1） |
| opcode | 4 | 帧类型（见下节） |
| MASK | 1 | 是否掩码；**客户端发给服务端必须为 1** |
| Payload len | 7/7+16/7+64 | 长度三级编码：<126 直接存；126 时后跟 2 字节（16 位）；127 时后跟 8 字节（64 位） |
| Masking-Key | 0 或 32 | 掩码密钥，仅客户端->服务端方向出现 |
| Payload Data | 变长 | 扩展数据（若协商）+ 应用数据 |

长度采用"小消息头内嵌、大消息扩展"的三级编码，让绝大多数小消息（聊天、信令）只花 2 字节头——对比 HTTP 每次数百字节的头部，这就是 WebSocket 适合高频小消息的根源。注意这也是一个"长度前缀"协议（见 [TCP 粘包与拆包](cs-fundamentals/310-TCPMessageFraming)），WS 的分帧逻辑由协议自带，应用层无需再设计。

### 3.1 掩码：一个防投毒的安全设计

客户端发出的所有帧必须用随机 32 位密钥逐字节异或掩码（服务端->客户端不掩码）。这个看似多余的操作，防御的是**代理缓存投毒**：早期某些透明代理会"顺手"解析并缓存它以为的 HTTP 内容，攻击者可借此把伪造响应注入其他用户的缓存。随机化后的字节流让中间设备无法猜测内容结构，只能老老实实转发。它是协议层的强制要求，实现时漏掉会被对端直接断连（1002 协议错误）。

## 4. 帧类型：数据帧与控制帧

opcode 划分出两大类：

| opcode | 类型 | 说明 |
| ------ | ---- | ---- |
| 0x0 | 连续帧 | 分片消息的非首片 |
| 0x1 | 文本帧 | 载荷是 UTF-8 文本 |
| 0x2 | 二进制帧 | 载荷是任意二进制 |
| 0x8 | Close | 发起关闭 |
| 0x9 | Ping | 心跳探测（载荷 <=125 字节） |
| 0xA | Pong | 心跳应答（内容回拷 Ping 的载荷） |

**分片规则**：一条大消息可以拆成多个帧发送——首帧 FIN=0 且 opcode 为 0x1/0x2，中间帧 FIN=0 且 opcode=0x0，末帧 FIN=1 且 opcode=0x0。作用是消息传输中途就能开始发送（服务端不必等整条消息生成完毕），也便于代理逐帧转发。**控制帧必须一帧完成（FIN=1）且长度 <=125**，但不允许对控制帧再分片，保证心跳与关闭的即时性。

## 5. 心跳与关闭

### 5.1 Ping/Pong：协议层心跳

任何一端都可发 Ping，对端**必须**尽快回 Pong（载荷原样带回）。价值有二：探活（对端还活着吗）与**防止中间设备掐断空闲连接**——NAT 网关、LVS、公司防火墙对无流量的 TCP 连接的静默超时从几十秒到几分钟不等，长连接服务必须在超时窗口内制造流量。浏览器 JS API 不暴露 Ping/Pong（由实现自动应答），所以浏览器端长连接通常还需应用层心跳。

### 5.2 应用层心跳

```js
// ws-heartbeat.js：浏览器端应用层心跳与断线重连骨架
const ws = new WebSocket('wss://server.example.com/chat');
let alive = true;

setInterval(() => {
  if (!alive) { ws.close(); return; }  // 上个周期没收到 Pong，判定死链
  alive = false;
  ws.send(JSON.stringify({ type: 'ping' }));  // 应用层心跳
}, 15000);  // 小于常见 NAT 静默超时

ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'pong') { alive = true; return; }
  // ……业务消息处理
});
```

### 5.3 关闭流程：四次挥手式的优雅告别

任一端发 Close 帧（可带状态码如 1000 正常关闭、1001 服务端离开），对端收到后回 Close 帧，随后各自关 TCP。双方都收到对方的 Close 才算完整关闭，避免单方面断开造成消息未知丢失。

## 6. 完整示例：手工解析一帧

用 Node.js 从原始字节解析客户端帧（理解协议的最佳练习）：

```js
// frame-parse.js：解析一个客户端发来的未分片文本帧
// 原始字节（十六进制）：81 89 37 fa 21 3d 7f 9f 48 52 de d2 5d 49
const buf = Buffer.from('81 89 37 fa 21 3d 7f 9f 48 52 de d2 5d 49'.replace(/ /g, ''), 'hex');

const fin    = (buf[0] & 0x80) !== 0;          // 取最高位
const opcode = buf[0] & 0x0f;                  // 低 4 位
const masked = (buf[1] & 0x80) !== 0;          // 掩码位
let len      = buf[1] & 0x7f;                  // 低 7 位；本例 0x09=9，无需扩展长度
let offset   = 2;
const mask   = buf.subarray(offset, offset + 4); offset += 4;   // 32 位掩码密钥
const data   = buf.subarray(offset, offset + len);
const unmasked = Buffer.from(data);            // 逐字节异或还原
for (let i = 0; i < unmasked.length; i++) unmasked[i] ^= mask[i % 4];

console.log({ fin, opcode, masked, len, payload: unmasked.toString() });
```

运行输出：

```text
{ fin: true, opcode: 1, masked: true, len: 9, payload: 'Hello WS' }
```

逐字段核对：`0x81` = 1000_0001，即 FIN=1、opcode=0x1（文本帧）；`0x89` = 1000_1001，即 MASK=1、长度 9。异或掩码后还原出明文。生产环境不会手写解析（用 `ws` 等库），但读懂帧结构后，抓包（Wireshark 过滤 `websocket`）排查协议问题会非常顺畅。

## 7. 常见陷阱与调试

- **连接"无故"断开**：多数是中间设备的空闲超时。上线心跳（Ping/Pong 或应用层），周期取"最严格超时的一半"，如网关 60 秒超时就 25-30 秒跳一次。
- **忘记处理半包与粘包**：自己基于 TCP 实现服务端时，帧可能跨 TCP 报文到达，必须先缓冲到"帧头声明的完整长度"再解析——WS 分帧不豁免字节流问题（同 [TCP 粘包与拆包](cs-fundamentals/310-TCPMessageFraming)）。
- **服务端->客户端也加了掩码**：协议只要求客户端方向掩码，服务端带掩码会被标准客户端视为协议错误断开（1002）。
- **单帧长度误判**：长度字段为 126/127 时不要把 126/127 本身当长度用，要继续读 2 或 8 字节扩展字段（64 位长度还需要处理大端序）。
- **误用 wss 端口**：`wss://` 走 TLS（同 [HTTPS 握手](cs-fundamentals/330-HTTPSHandshake)），端口与证书都是 HTTPS 那一套；`ws://` 在 HTTPS 页面里会被浏览器混合内容策略拒绝。

## 8. 实战场景

- **IM 与实时协作**：文本帧承载 JSON 信令，二进制帧传输媒体或 protobuf；分片用于超大消息（如整段文档同步）。
- **行情/监控推送**：服务端毫秒级主动推送，心跳保活 + 断线指数退避重连是标准组合。
- **网关与负载均衡**：长连接意味着会话粘滞（LB 需按连接而非按请求分发），节点发布时靠 Close 帧 + 客户端重连实现平滑迁移。

## 小结

初学者要点：

- WebSocket 用一次 HTTP 升级握手（101 + Accept 校验）换取全双工长连接，消息以轻量帧（最小 2 字节头）双向流动。
- 帧头核心字段：FIN（分片结束）、opcode（类型）、MASK（客户端方向必须掩码）、三级长度编码。
- 控制帧三类：Close、Ping、Pong；Ping/Pong 既探活又防中间设备掐断空闲连接。

进阶注意：

- 掩码是防代理缓存投毒的安全设计而非加密；方向、长度上限（控制帧 125）都是协议硬约束。
- WS 在 TCP 字节流上定义了帧边界，自研服务端仍需完整实现缓冲、分片重组与 UTF-8 校验。
- 工程侧关注点在心跳参数（按链路超时折半）、重连退避、发布期平滑迁移，以及 wss 场景下的 TLS 与证书管理。
