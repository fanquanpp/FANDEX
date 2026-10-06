---
order: 40
title: TCP 与 UDP 传输层机制
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: 面向运维排障的 TCP/UDP——握手挥手、状态机、TIME_WAIT/CLOSE_WAIT 治理、可靠传输与选型
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：传输层协议机制——TCP/UDP 如何建立与断开连接、如何保证（或放弃）可靠传输。**本文与 021-cs-fundamentals 模块的分工**：协议理论推导、报文格式逐字段考点与拥塞控制数学在 021-300-TCPControl、021-310-TCPMessageFraming 与 021-370-QUIC 展开；本篇面向运维与排障场景——状态机异常的识别与治理、工具观察、弱网选型决策，拥塞控制只讲工程结论不展开数学。
- **解决什么问题**：服务端 `ss -s` 里几万个 TIME_WAIT 把端口耗尽；连接堆了上千个 CLOSE_WAIT 查不出是谁忘了关；弱网环境视频卡顿，纠结该用 TCP 还是 UDP。
- **什么时候用到**：排查线上连接堆积；容量规划算端口与文件描述符；为游戏/音视频/物联网选传输协议。

## 1. 三次握手与四次挥手：过程速览

协议教科书重点，这里只保留排障需要的骨架。

**三次握手**（SYN -> SYN+ACK -> ACK）：

```text
客户端                服务端
  │ ── SYN, seq=x ────────→ │   服务端进入 SYN_RCVD
  │ ←─ SYN+ACK, seq=y ───── │
  │ ── ACK ───────────────→ │   双方 ESTABLISHED
```

为什么是三次：让双方都确认「我发的对方能收到、对方发的我能收到」；两次的话服务端无法确认自己发的 SYN+ACK 被收到。排障视角：大量 `SYN-SENT` 是对端无响应或网络不通；服务端 `SYN-RECV` 堆积是被 SYN Flood 攻击或 backlog 队列太小。

**四次挥手**（FIN -> ACK -> FIN -> ACK）：

```text
主动方                      被动方
  │ ── FIN ───────────────→ │  主动方 FIN_WAIT_1
  │ ←─ ACK ──────────────── │  主动方 FIN_WAIT_2 / 被动方 CLOSE_WAIT
  │   （被动方处理完数据）   │
  │ ←─ FIN ──────────────── │  被动方 LAST_ACK
  │ ── ACK ───────────────→ │  主动方 TIME_WAIT（2MSL）
```

## 2. 11 态状态机与两个「积压重灾区」

TCP 连接从 CLOSED 到 ESTABLISHED 再回 CLOSED 共 11 个状态。日常排障盯两个：

| 状态       | 挂在谁身上   | 成因                                | 治理                                    |
| :--------- | :----------- | :---------------------------------- | :-------------------------------------- |
| TIME_WAIT  | 主动关闭方   | 等待 2MSL（Linux 60 秒）让迷路报文消亡 | 高并发短连接服务是重灾区：连接复用、调大端口范围 |
| CLOSE_WAIT | 被动关闭方   | 对端发了 FIN，本端一直不调 close()   | 几乎总是**应用代码 bug**：忘记关闭连接  |

**TIME_WAIT 为什么是主动关闭方的宿命**：主动关闭方最后发的 ACK 可能丢——若对端重发 FIN，主动方必须还在并能重发 ACK；同时旧连接的迟到报文必须等它们在网络里自然死亡（MSL = 报文最大存活时间），否则污染复用同端口的新连接。所以 2MSL 的等待是可靠性设计，不是缺陷。

```bash
# 状态统计：一眼看清连接健康度
ss -s
# TCP:   1250 (estab 180, closed 0, orphaned 0, timewait 830)
#        ↑ 总数      ↑活跃        ↑TIME_WAIT 积压量

# 按状态分组统计
ss -tan | awk 'NR>1 {print $1}' | sort | uniq -c | sort -rn

# 找出 CLOSE_WAIT 归属的进程（谁忘了关连接）
ss -tanp state close-wait
```

治理顺序：先看 CLOSE_WAIT——它几乎必然是应用 bug（连接池没归还、异常路径漏 close），调内核参数是掩盖不是修复。TIME_WAIT 堆积的工程解：优先客户端连接复用（HTTP keep-alive、长连接池）；其次调大本地端口范围 `net.ipv4.ip_local_port_range`；`tcp_tw_reuse` 只对客户端出站方向安全（依赖时间戳选项），`tcp_tw_recycle` 因 NAT 环境出错已在 Linux 4.12 移除——老博客还在推荐它，别照抄。

## 3. 可靠传输：序号、确认与重传

TCP 可靠性的三根柱子，全部为排障服务地压缩在这里：

1. **序号与确认**：每个字节有序号，接收方用 ACK 告知「下一个期望的字节号」。抓包时「TCP ACKed unseen segment」提示中间有报文没抓到；
2. **超时重传与快速重传**：超时 RTO 未收到确认则重发；收到 3 个重复 ACK 立即重发缺失段（不必等超时）。`ss -ti` 里看 `retrans` 计数——重传率高=丢包或对端过载；
3. **滑动窗口**：接收方用窗口字段告诉发送方「还能收多少」，发送方在窗口内连续发送不必逐个等确认——这是吞吐量的来源。窗口为 0 时发送方暂停，抓包看 `TCP ZeroWindow` 即对端应用读得太慢。

**Nagle 与 keepalive 两个工程开关**：Nagle 算法把小包攒大（提吞吐但加延迟），交互式协议（SSH、游戏）禁用它 `TCP_NODELAY`；keepalive 让空闲连接定期发探测包，用于剔除半死连接（默认 2 小时才探测，线上必须调小，应用层心跳通常更可控）。

## 4. 拥塞控制：四算法的工程结论

慢启动、拥塞避免、快速重传、快速恢复四算法（数学推导与 AIMD 分析见 021-300-TCPControl）。运维需要的结论：

- 新建连接从慢启动开始，速度是「爬坡」而非全速——短连接多的小请求场景，握手加慢启动让每个连接都很慢，长连接复用的收益在此；
- 丢包被 TCP 视为拥塞信号，窗减半——弱网（无线）本来丢包就多，TCP 在弱网会自我压制，这是弱网选 UDP 的根本原因之一；
- 拥塞算法可选（`sysctl net.ipv4.tcp_congestion_control`），BBR 改用带宽时延积估计而非丢包信号，跨洋高延迟链路收益明显。

## 5. UDP：放弃可靠换什么

UDP 只做「把数据报发出去」：无连接、无确认、无序、无拥塞控制。换来的是低延迟与完全的应用可控性。适用判据一句话：**丢了宁可不要、时序比完整重要的流量用 UDP**。

| 场景           | 选型 | 原因                                       |
| :------------- | :--- | :----------------------------------------- |
| DNS 查询       | UDP  | 一问一答超时即重发，应用层自带重试         |
| 视频/语音直播  | UDP  | 丢一帧只是花屏，等重传则全程卡顿           |
| 游戏实时对战   | UDP  | 旧状态无价值，重传 200ms 前的位置毫无意义  |
| 文件传输/网页  | TCP  | 一字节不能丢，可靠性由传输层代劳           |
| QUIC（HTTP/3） | UDP 上重建 | 在 UDP 上重新实现可靠+有序+加密，避开 TCP 队头阻塞（详见 021-370-QUIC） |

**易错点**：「UDP 不可靠」不等于「UDP 丢包率高」——局域网内 UDP 丢包率同样极低；它不可靠是指**不承诺**。应用必须自答三个问题：消息边界（UDP 天然保留报文边界，TCP 没有——这是 UDP 常被忽略的优势）、丢包怎么办（忽略或应用层重传）、发多了怎么办（自己限速，否则路由器丢的比谁都狠）。

## 6. 不同场景下的例子

**例一：服务端大量 TIME_WAIT 拖垮端口（真实工程场景）**。压测一个 HTTP 短连接接口，`ss -s` 显示 timewait 30000+，新请求报 `Cannot assign requested address`。排查链：确认 TIME_WAIT 都在客户端侧（主动关闭方是客户端）-> 改造调用方使用 keep-alive 连接池 -> 压测 timewait 归零。若 TIME_WAIT 在服务端（服务端主动关闭，如 HTTP/1.0 风格响应完即断），则查应用为什么不让客户端先关。

**例二：弱网下视频卡顿为何选 UDP**。远程会议产品早期用 TCP 传音视频，地铁里全员幻灯片。原因：TCP 的重传让「迟到半秒的旧帧」插队，播放器卡等；拥塞控制在无线高丢包环境下把窗口压到底。改 RTP/UDP 后：旧帧直接丢，编码器降码率自适应带宽，卡顿消失。这就是「实时流量宁可丢不可等」的工程化。

**例三：游戏状态同步的频率折衷**。多人对战游戏把玩家位置以固定频率广播（如 20 次/秒），服务器与带宽之间做折衷：频率翻倍流畅度上升但带宽翻倍，且小包过密时 Nagle 类攒包反而加延迟。这类「状态同步频率 x 带宽」的常量通常在项目网络配置里集中定义（本仓库 c-projects 素材项目的 `net_config.gd` 即以 20Hz 常量约束状态同步），改它之前必须先测带宽预算。

**例四：CLOSE_WAIT 抓 bug**。某服务 `ss -tanp state close-wait` 显示对某下游 API 的连接稳定堆积不释放，且 CLOSE_WAIT 的进程是网关。review 发现异常分支里 HTTP 客户端 response body 没 close，连接不归还池。修复：defer close 统一收口。CLOSE_WAIT 数量与某条代码路径强相关，是定位内存外「连接泄漏」的最快路径。

## 动手实践

**练习 1（状态观察）**：本机起一个短连接压测（循环 `curl` 同一端口 100 次），用 `ss -tan | awk '{print $1}' | sort | uniq -c` 观察 TIME_WAIT 生成与 60 秒后的消亡；再改用带 keep-alive 的压测对比。

**提示**：TIME_WAIT 挂在主动关闭方，先想清楚 curl 场景里谁是主动方。

**练习 2（握手抓包）**：用 tcpdump 抓一次 `curl http://example.com` 的三次握手与四次挥手（`tcpdump -i any -n port 80`），数一数 SYN/SYN+ACK/FIN 报文；再看 `ss -tan` 里这条连接的状态变化。

**提示**：加 `-w lab.pcap` 保存后可用 Wireshark（280 篇）复盘；四次挥手可能合并成三次（FIN+ACK 捎带）。

**练习 3（UDP 对照）**：用 nc 起一个 UDP echo（`nc -ul 9999`），客户端发消息观察「无连接」语义——客户端不用握手直接发、服务端重启后消息照发不报错；对比 TCP 版本（`nc -l 9999`）断开后发送的报错行为。

<details>
<summary>参考实现（先自己动手，再看这里）</summary>

```bash
# 练习 1
for i in $(seq 1 100); do curl -s http://127.0.0.1:8080/ -o /dev/null; done
ss -tan | grep 8080 | awk '{print $1}' | sort | uniq -c
# 可见大量 time-wait；60 秒后重查已清零
# keep-alive 版本（curl 复用连接）
for i in $(seq 1 100); do curl -s http://127.0.0.1:8080/ -o /dev/null \
  --keepalive-time 30; done    # 或一次请求带 -Z 多路复用，timewait 显著减少

# 练习 2
sudo tcpdump -i any -n -w handshake.pcap tcp port 80 &
curl -s http://example.com/ -o /dev/null
sleep 2; kill %1
tcpdump -n -r handshake.pcap        # S / S. / . 序列为握手；F 序列为挥手

# 练习 3
# 终端 A（UDP 服务端）
nc -ul 9999
# 终端 B（客户端，无连接直接发）
echo hello | nc -u -w1 127.0.0.1 9999
# 杀掉 A 后再发：客户端不报连接错误（无连接），消息只是消失
# TCP 对照：nc -l 9999 断开后，echo hi | nc 127.0.0.1 9999 立即报 refused
```

</details>

## 参考与致谢

- RFC 9293「Transmission Control Protocol (TCP)」（取代 RFC 793）：<https://www.rfc-editor.org/rfc/rfc9293>（IETF 开放标准文档）
- RFC 768「User Datagram Protocol」：<https://www.rfc-editor.org/rfc/rfc768>
- Pro Git 式运维参考：Linux 内核文档 ip-sysctl.txt（tcp_tw_reuse 语义与 tcp_tw_recycle 移除说明）
- 本文 TIME_WAIT/CLOSE_WAIT 治理与工具观察为运维实践视角整理；协议状态机定义以 RFC 9293 为准。
