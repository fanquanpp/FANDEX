---
order: 330
title: 网络故障排查工具
module: 'networking'
category: 云与基础设施
difficulty: intermediate
description: 网络排障方法论：分层定位与二分思路、ping/traceroute/ss/tcpdump 关键用法、「网站打不开」完整案例与抓包分析流程。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'networking/080-PingTraceroute'
  - 'networking/090-SSNetstat'
  - 'networking/270-Tcpdump'
prerequisites:
  - 'networking/020-OSITCPIPModel'
---

## 知识点地图

- **知识类别**：网络故障排查方法论与工具组合——本模块排障知识的唯一主篇（原方法论篇与工具篇已归并于此）。
- **解决什么问题**：面对「打不开」「连不上」「时好时坏」三类模糊现象，用固定框架快速收敛到具体层、具体设备、具体原因，避免东试一下西试一下。
- **什么时候用到**：值班接故障；应用连不上数据库时的快速定位；性能问题（慢）与连通问题（断）的分界判断；写团队排障 runbook。

前置知识：TCP/IP 分层模型（见 [OSI 与 TCP/IP 模型](networking/020-OSITCPIPModel)）；各工具的
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

## 3. 分层排障检查单

工具箱告诉你「每层用什么」，本节是自底向上的检查单——从物理层往上逐层排除，改编自网络故障诊断的标准分层目录。分段定位思想贯穿始终：`客户端 → 接入交换机 → 汇聚 → 核心 → 防火墙 → 服务器`，故障必卡在链上某一段；「与正常配置对比」是最快的方法——有正常同事机器/备用链路时先 diff 配置。

### 3.1 物理层

| 问题       | 现象       | 排查         |
| ---------- | ---------- | ------------ |
| 网线断     | 接口 down  | 换线测试     |
| 光纤衰减   | 丢包       | 光功率计     |
| 接口协商   | 速度不匹配 | 查看接口状态 |
| 双工不匹配 | 性能差     | 强制双工模式 |

```bash
# 交换机侧查看接口状态（Cisco 风格语法）
show interface GigabitEthernet0/1
show interface status

# 三种典型状态读法
GigabitEthernet0/1 is up, line protocol is up      # 正常
GigabitEthernet0/1 is down, line protocol is down   # 物理故障（线/光模块/对端断电）
GigabitEthernet0/1 is up, line protocol is down     # 数据链路问题（封装/协商不一致）
```

第二行 up 而第三行 down 是最容易误判的状态：网线是好的（物理 up），但二层协议没起来——先查两端的封装与协商配置，而不是继续换线。

### 3.2 数据链路层

```bash
# MAC 地址表：这个 MAC 从哪个口学到的
show mac address-table
show mac address-table dynamic address xxxx.xxxx.xxxx
```

| VLAN 问题    | 原因         | 解决             |
| ------------ | ------------ | ---------------- |
| 跨 VLAN 不通 | 缺少路由     | 检查 SVI/路由    |
| 同 VLAN 不通 | Trunk 问题   | 检查允许的 VLAN  |
| 端口不通     | VLAN 配置错误 | 检查 access/trunk |

STP 相关（环路/根桥异常）：`show spanning-tree` 看根桥位置与端口角色——根桥被抢占改优先级、端口被异常阻塞查拓扑、真环路查 STP 是否在新交换机上被禁用。交换网络排查的「万能第一问」：两端端口的 VLAN 与 trunk 放行列表一致吗？

### 3.3 网络层

```bash
# 路由表：去往目标走哪条路
show ip route
show ip route ospf        # 只看 OSPF 学到的
traceroute 10.0.0.1       # 断在第几跳

# ARP 表：IP 与 MAC 的映射
show ip arp
show ip arp 10.0.0.1      # 同一 IP 出现多个 MAC → IP 冲突

# ACL 命中计数（ denies 计数增长 = 有流量被它拦）
show access-lists OUTSIDE_IN
```

三类经典网络层故障的判别：路由缺失（`show ip route` 查无此网段，查路由协议/静态路由）、路由环路（traceroute 出现 TTL 循环抖动，查路由汇总）、非对称路由（去回路径不同，状态防火墙会拦回程，查双向路径）。

### 3.4 传输层

```bash
# 本机连接状态
ss -tnp
# 交换机/防火墙侧
show tcp brief

# NAT 转换表与统计
show ip nat translations
show ip nat statistics
```

判读对应关系：SYN 发出无响应 -> 防火墙/ACL 丢弃（连接拒绝）；连接被立即 RST -> 服务未启动；大量 TIME_WAIT -> 短连接风暴（治理见 025-TCPUDPProtocolMechanics）；NAT 转换失败查匹配的 ACL 与出接口；端口耗尽（`show ip nat statistics` 里分配率接近 100%）扩 NAT 地址池。

### 3.5 经典故障速查

三个跨层的经典模式，现象直接指向病因：

```text
MTU 问题
  现象：小包通，大包不通
  原因：路径上 MTU 不一致，且 ICMP 被过滤（黑洞）
  排查：ping -s 1472 -M do <target>（1472+28 字节头=1500）
  解决：调整接口 MTU 或放行 ICMP 不可达（PMTU 依赖它）

路由环路
  现象：traceroute 显示 TTL 递减后在同几跳间打转超时
  原因：路由汇总/重分发导致环路
  排查：show ip route 检查指向；在环上各点看同一目的的下一跳
  解决：修正汇总或添加黑洞路由（null0）吸掉错误网段

间歇性丢包
  现象：偶尔超时，大部分正常
  原因：链路质量差/接口错误/双工协商
  排查：show interface 看 CRC/输入错误计数是否持续增长；mtr 跑 10 分钟
  解决：更换线缆/光模块/固定协商速率
```

## 4. 核心命令：排障时各看什么

### 4.1 ping：可达性与初步质量

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

### 4.2 traceroute / mtr：路径与逐跳定位

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

### 4.3 ss：本机连接与端口状态

```bash
ss -tlnp | grep :8080
# LISTEN 0 128 0.0.0.0:8080  users:(("java",pid=1234))  ← 服务在听吗
ss -s
# TCP:  1203 (estab 1180, closed 0, orphaned 0)        ← 总量与堆积
ss -tn state time-wait | wc -l                          # TIME_WAIT 数量
```

排障三问：服务监听了吗（LISTEN 存在与否）？连接堆在哪（SYN-RECV 多=握手积压，CLOSE-WAIT 多=
对端关了我没关，TIME_WAIT 巨量=短连接风暴）？接收/发送队列是否卡住（`ss -tnm` 看 skmem）。

### 4.4 tcpdump：终极裁判

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

## 5. 完整案例：「网页打不开」的收缩式排查

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

## 6. 抓包分析的三层信息

拿到 pcap 后按固定顺序读，避免在几十万包里迷路：

1. **交互过程**：三次握手是否完整、请求响应是否成对、四次挥手有无异常（大量 RST？谁先发起
   的？）；
2. **时延分布**：Wireshark `Statistics → Conversations` 看吞吐与 RTT；关注「请求发出到首字节
   回来」的间隔，网络慢还是应用慢在这里分家；
3. **重传与乱序**：`tcp.analysis.flags` 过滤器直接列出 TCP 重传、乱序、零窗口——大量重传说明
   链路质量或接收端过载，零窗口说明对端应用处理不动。

## 7. 陷阱与经验

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

## 8. 小结

**初学者要点**

- 排障框架：分层定位（链路→IP→传输→应用）+ 二分对比（换目标/换路径/换解析）；
- 五个最常用动作：`curl -v` 复现、`dig` 查解析、`ping`/`traceroute` 查路径、`ss` 查端口与连
  接、`nc` 探端口；
- 抓包先过滤再落盘，读包按「交互 → 时延 → 重传」三层信息顺序看。

**进阶注意**

- 「ping 通但端口不通」与「traceroute 星号」是两大经典误判，别用单一工具下结论；
- NAT、代理、LB 环境里同一连接在不同观测点长得不一样，多点同时抓包对时间轴是唯一可靠手段；
- 把本文流程固化成团队的故障排查 runbook，配合 mtr 报告与 pcap 归档，问题复盘才有据可查。

## 动手实践

**练习 1（收缩演练）**：在本机用容器或第二台机器搭「客户端 -> 服务端」最小环境，人为制造三档故障各排查一次：网络级（iptables DROP 全部 443）、端口级（服务只听 127.0.0.1）、DNS 级（hosts 指错地址）。每次必须从 `curl -v` 开始按第 5 节流程走到定位。

**提示**：三档故障在 curl 上的第一现象各不相同（超时/refused/证书域名不匹配），这是分支判断的入口。

**练习 2（检查单走查）**：按 3.1-3.4 检查单对你自己的电脑做一次「全身体检」：物理（网卡 link）、链路（网关 MAC）、网络（路由表默认路由）、传输（监听端口清单），每层记录一条命令与输出结论。

**提示**：Linux 上对应 `ip link`、`ip neigh`、`ip route`、`ss -tlnp`；交换机语法版用模拟器（035 篇）练。

**练习 3（MTU 案例复现）**：用 `ping -M do -s 1472 <网关>` 与 `-s 1500` 各测一次，观察大包被拒的现象；再用 `ip link` 查本机 MTU，把结论写成一段「小包通大包不通」的排查记录。

<details>
<summary>参考实现（先自己动手，再看这里）</summary>

```bash
# 练习 1（本机模拟，需 root）
# 档一：网络级阻断
sudo iptables -A OUTPUT -p tcp --dport 443 -j DROP
curl -v --max-time 5 https://example.com        # 现象：超时
sudo iptables -D OUTPUT -p tcp --dport 443 -j DROP

# 档二：端口级（起一个只听回环的 http 服务）
python3 -m http.server 8080 --bind 127.0.0.1 &
curl -v --max-time 5 http://<本机局域网IP>:8080   # 现象：连接被拒/超时
ss -tlnp | grep 8080                              # 只见 127.0.0.1:8080 → 定位

# 档三：DNS 级
echo "127.0.0.1 example.com" >> /etc/hosts
curl -v https://example.com                     # 现象：证书域名不匹配
dig example.com +short                           # 返回 127.0.0.1 → 解析被劫改
# 练习完记得清掉 hosts 行

# 练习 2
ip link show eth0            # 物理层：state UP、mtu 大小
ip neigh show                # 链路层：网关的 MAC（REACHABLE）
ip route show                # 网络层：default via <网关>
ss -tlnp                     # 传输层：本机在监听什么

# 练习 3
ping -c 3 -M do -s 1472 192.168.1.1    # =接口 MTU 时应通
ping -c 3 -M do -s 1500 192.168.1.1    # 超出 MTU：message too long
ip link show eth0 | grep mtu
```

</details>

<!-- 恢复自 cnt-content/full/025-networking/190-NetworkDiagnosis.md（实施前 HEAD 62c90663308c7d6ea5a29bd1c1bb97cd40884710 版本）；拆分时该小节未随迁，2026-10-07 内容保全核对恢复 -->

## 流量镜像


```bash
# 本地镜像
monitor session 1 source interface Gi0/1 both
monitor session 1 destination interface Gi0/2

# ERSPAN（远程镜像）
monitor session 1 type erspan-source
  source interface Gi0/1 rx
  destination
    erspan-id 1
    ip address 10.0.0.100
    origin ip address 10.0.0.1
```
