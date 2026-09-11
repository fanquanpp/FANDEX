---
order: 290
title: 网络故障排查工具
module: 'networking'
category: 云与基础设施
difficulty: intermediate
description: 网络排障方法论：分层定位与二分思路、ping/traceroute/ss/tcpdump 关键用法、「网站打不开」完整案例与抓包分析流程。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'networking/190-NetworkDiagnosis'
  - 'networking/080-PingTraceroute'
  - 'networking/090-SSNetstat'
  - 'networking/270-Tcpdump'
prerequisites:
  - 'networking/010-NetworkBasicsAndProtocol'
---

前置知识：TCP/IP 分层模型（见 [网络基础与协议](networking/010-NetworkBasicsAndProtocol)）；各工具的
完整参数见 023~031 与 036 号工具专篇，本文讲「怎么组合它们定位问题」。

学习目标：

- 建立「分层定位 + 二分收缩」的排障框架，避免面对故障时东试一下西试一下；
- 掌握 ping / traceroute / ss / tcpdump 四个核心工具在排障场景中「看什么」；
- 完整走一遍「服务打不开」案例，每个步骤都知道预期输出与分支判断；
- 理解抓包分析的三层信息：交互过程、时延分布、重传异常。

## 1. 排障方法论：先框架，后命令

网络故障排查的核心不是背命令，而是**收缩问题空间**。两个基本策略：

- **分层定位（自底向上）**：物理/链路通不通（网卡、交换机）→ IP 可达（ping 网关）→ 路由
  （traceroute）→ 传输层（端口握手）→ 应用层（协议交互、日志）。上一层的失败往往由下层引
  起，先确认下层；
- **二分/对比**：在「正常」与「异常」之间找分界点——同网段其他机器正常吗？同机器其他目标正
  常吗？换 DNS、换端口、换路径再试一次，每次实验都把候选原因砍掉一半。

> 类比：查水管不通。先看总阀（链路），再看各楼层阀门（路由），最后拧开具体水龙头看是不是只
> 有这一个龙头坏了（应用端口）。

## 2. 分层工具箱

| 层次     | 问题                 | 首选工具                       | 详细文档                     |
| :------- | :------------------- | :----------------------------- | :--------------------------- |
| 链路层   | 网卡/线/交换机口     | `ip link`、`ethtool`、交换机日志 | [IP 命令](networking/050-IPCommands) |
| 网络层   | IP 可达、路由缺失    | `ping`、`traceroute`、`ip route` | [Ping 与 Traceroute](networking/080-PingTraceroute) |
| ARP/邻居 | 同网段二层解析       | `ip neigh`、arping             | [ARP 与路由](networking/060-ARPRouting) |
| 传输层   | 端口不通、连接堆积   | `ss -tlnp`、`nc`、nmap         | [SS 与 Netstat](networking/090-SSNetstat) |
| DNS      | 域名解析失败         | `dig`、`nslookup`              | [Dig 与 Nslookup](networking/110-DigNslookup) |
| 应用层   | 协议交互异常         | `curl -v`、应用日志            | [Curl](networking/130-CurlHTTPRequest) |
| 全链路   | 交互/时延/重传异常   | `tcpdump`、Wireshark           | [Tcpdump](networking/270-Tcpdump)、[Wireshark](networking/280-WiresharkCLI) |

## 3. 核心命令：排障时各看什么

### 3.1 ping：可达性与初步质量

```bash
ping -c 5 192.168.1.1
# 预期输出关键行：
# 64 bytes from 192.168.1.1: icmp_seq=1 ttl=64 time=0.42 ms
# --- 统计 ---: 5 transmitted, 5 received, 0% packet loss, time 4005ms
# rtt min/avg/max/mdev = 0.41/0.45/0.52/0.03 ms
```

三看：**丢包率**（0% 为基线）、**时延均值与抖动**（mdev 大说明不稳定）、**TTL**（Linux 初始
值 64：TTL=64 说明同网段直连，TTL=63 说明经过一跳）。注意 ping 通只证明 ICMP 可达——「能
ping 通但端口连不上」是最常见的误判（见陷阱 1）。

### 3.2 traceroute / mtr：路径与逐跳定位

```bash
traceroute -n 8.8.8.8        # -n 不做反解，速度快
#  1  192.168.1.1   0.5 ms  0.4 ms  0.4 ms     ← 网关
#  2  10.100.0.1    3.2 ms  3.1 ms  3.0 ms     ← 运营商城域网
#  3  * * *                                  ← 该跳不回 ICMP（常见，不代表故障）
#  4  142.250.196.110  8.9 ms  9.0 ms  8.8 ms
```

原理是 TTL 递增逼出每跳的 ICMP 超时消息。`mtr` 是 ping + traceroute 的动态融合版，看**持续**
丢包发生在哪一跳最有用：单跳丢包而后跳恢复是限速/不回 ICMP，后跳持续丢包才是真瓶颈。
`* * *` 一跳不响应很常见（设备禁了 ICMP TTL 超时应答），只要后续跳正常即无害。

### 3.3 ss：本机连接与端口状态

```bash
ss -tlnp | grep :8080
# LISTEN 0 128 0.0.0.0:8080  users:(("java",pid=1234))  ← 服务在听吗
ss -s
# TCP:  1203 (estab 1180, closed 0, orphaned 0)        ← 总量与堆积
ss -tn state time-wait | wc -l                          # TIME_WAIT 数量
```

排障三问：服务监听了吗（LISTEN 存在与否）？连接堆在哪（SYN-RECV 多=握手积压，CLOSE-WAIT 多=
对端关了我没关，TIME_WAIT 巨量=短连接风暴）？接收/发送队列是否卡住（`ss -tnm` 看 skmem）。

### 3.4 tcpdump：终极裁判

```bash
# 抓 80 端口与某客户端的 TCP 交互，写文件供 Wireshark 分析
sudo tcpdump -i any -nn -w /tmp/http.pcap \
  'tcp port 80 and host 192.168.8.11'
# 交互模式快速判断握手
sudo tcpdump -i eth0 -nn 'tcp[tcpflags] & (tcp-syn|tcp-ack) != 0'
# 预期正常握手序列: Flags [S] → [S.] → [.]
# 只见 [S] 无 [S.]  →  对端无响应（防火墙 DROP 或服务未听）
# 对端回 [R]       →  端口未监听（REJECT/连接拒绝）
```

BPF 过滤表达式的完整语法与更多范式见 [Tcpdump 抓包分析](networking/270-Tcpdump)；拿到 .pcap
后的图形化分析见 [Wireshark CLI](networking/280-WiresharkCLI)。

## 4. 完整案例：「网页打不开」的收缩式排查

现象：用户反馈 `https://app.example.com` 打不开。按固定流程走，每步记录结论：

```bash
# ① 应用层复现：拿到第一手错误形态（区别于「打不开」的模糊描述）
curl -v --max-time 5 https://app.example.com/api/healthz
#   解析失败→ DNS 分支；卡在 TLS→ 证书/中间设备分支；
#   Connection timed out→ 网络/端口分支；HTTP 5xx→ 服务端分支

# ② DNS 分支（若 ① 卡在解析）
dig app.example.com +short          # 有返回地址吗？
dig @223.5.5.5 app.example.com +short   # 换公共 DNS 对比：定位本地 DNS 还是权威
# 结论模板：本地 DNS 超时且公共 DNS 正常 → 本地解析器问题

# ③ 网络分支：从客户端逐层确认
ping -c 3 <解析到的IP>              # IP 层可达吗？
traceroute -n <IP>                  # 断在哪一跳？后跳恢复=限速，持续断=真断
nc -vz -w 3 <IP> 443                # 传输层端口通吗
#   Connection refused  → 到了服务端但端口没开：去服务器查
#   超时                → 路上被 DROP：查安全组/防火墙/ACL

# ④ 服务端分支（能登机器时）
ss -tlnp | grep :443                # 服务在听吗？听 0.0.0.0 还是 127.0.0.1？
sudo iptables -L INPUT -n | head    # 本机防火墙放行了吗
sudo tcpdump -i any -nn port 443 and host <客户端IP>
#   抓不到包   → 流量根本没进来（上游安全组/负载均衡问题）
#   抓到 [S] 回 [S.] 后无下文 → 出方向被拦：检查本机出站规则与回程路由
```

这套流程的价值在于**每一步都有明确的分支出口**：任何一步「符合预期」就向下一层走，不符则进
入对应分支，全程不超过十个命令就能把「打不开」收敛到具体层、具体设备。

## 5. 抓包分析的三层信息

拿到 pcap 后按固定顺序读，避免在几十万包里迷路：

1. **交互过程**：三次握手是否完整、请求响应是否成对、四次挥手有无异常（大量 RST？谁先发起
   的？）；
2. **时延分布**：Wireshark `Statistics → Conversations` 看吞吐与 RTT；关注「请求发出到首字节
   回来」的间隔，网络慢还是应用慢在这里分家；
3. **重传与乱序**：`tcp.analysis.flags` 过滤器直接列出 TCP 重传、乱序、零窗口——大量重传说明
   链路质量或接收端过载，零窗口说明对端应用处理不动。

## 6. 陷阱与经验

1. **「ping 通 = 网络没问题」是错觉**：ICMP 与 TCP 端口常被区别对待，ping 通而端口不通排查
   方向是安全组/防火墙/服务监听，而不是继续 ping；
2. **traceroute 的 `*` 不等于断**：多数核心设备限制 ICMP 速率或不回超时消息，看后续跳是否可
   达与 mtr 的持续统计再下结论；
3. **NAT 环境双向都要抓**：经过 SNAT/DNAT 后，客户端侧和服务端侧看到的五元组不同，只抓一侧
   会得出「包消失了」的错误结论；两侧同时抓再比对；
4. **netstat 已过时**：Linux 上它的部分输出不再维护，统一用 ss（参数映射：`netstat -tlnp` ≈
   `ss -tlnp`）；
5. **先过滤再抓包**：生产机上裸抓 `tcpdump -i eth0` 会瞬间产生海量数据与 CPU 压力；用 BPF
   收窄 + `-c` 限量 + `-w` 落盘是标准姿势；
6. **时间是排障证据链的主线**：多机排查时先对时（NTP），否则各设备日志与抓包无法按时间对齐。

## 7. 小结

**初学者要点**

- 排障框架：分层定位（链路→IP→传输→应用）+ 二分对比（换目标/换路径/换解析）；
- 五个最常用动作：`curl -v` 复现、`dig` 查解析、`ping`/`traceroute` 查路径、`ss` 查端口与连
  接、`nc` 探端口；
- 抓包先过滤再落盘，读包按「交互 → 时延 → 重传」三层信息顺序看。

**进阶注意**

- 「ping 通但端口不通」与「traceroute 星号」是两大经典误判，别用单一工具下结论；
- NAT、代理、LB 环境里同一连接在不同观测点长得不一样，多点同时抓包对时间轴是唯一可靠手段；
- 把本文流程固化成团队的故障排查 runbook，配合 mtr 报告与 pcap 归档，问题复盘才有据可查。
