---
order: 310
title: tcpdump 抓包
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: tcpdump 抓包学习笔记：从服务器上一次「连接超时」排查出发，学会读抓包输出、用 BPF 过滤器三步定位问题，掌握 TCP 标志过滤、pcap 保存回放与 DNS/HTTP 实战。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'networking/290-NetworkTroubleshootTools'
  - 'networking/280-WiresharkCLI'
  - 'networking/020-OSITCPIPModel'
prerequisites: []
---

## 场景：服务器上接口超时，你只有一条 SSH

凌晨告警：应用连不上数据库，curl 一直卡到超时。生产服务器没有图形界面，Wireshark
用不上——这时候 tcpdump 是唯一的「透视镜」。它回答三个问题：

1. 我的包**发出去了**吗？
2. 对方**回了**吗？回的是正常响应还是 RST？
3. 卡在**哪一层**（连接都没建立？还是应用层慢）？

本文所有命令以 Linux 为例，需要 root 或 `cap_net_admin` 能力。

## 动手：第一次抓包，先学会读输出

开两个终端。终端 A 抓包：

```bash
tcpdump -n -i any icmp
# -n 不做域名/端口名反解（又快又不产生新的 DNS 流量）
# -i any 监听所有接口，默认只抓第一个接口，漏包经常是接口选错
```

终端 B 发一个 ping：

```bash
ping -c 2 223.5.5.5
```

终端 A 会出现这样的行：

```text
14:32:07.123456 IP 192.168.1.10 > 223.5.5.5: ICMP echo request, id 5, seq 1, length 64
14:32:07.134567 IP 223.5.5.5 > 192.168.1.10: ICMP echo reply, id 5, seq 1, length 64
```

一行一个包：`时间戳 协议 源 > 目标: 细节`。发一个收一个，ICMP 通了。
这个「一眼对上请求和响应」的读法，就是后面所有排查的基础。

## 三步定位「连接超时」

假设超时的目标是 `10.0.0.5:3306`（MySQL）。逐步收紧过滤器：

### 第 1 步：我的 SYN 出去了吗

```bash
tcpdump -n -i any 'host 10.0.0.5 and tcp port 3306'
```

正常情况下应看到典型的三次握手序列：

```text
IP 192.168.1.10.52114 > 10.0.0.5.3306: Flags [S], seq ..., win ...
IP 10.0.0.5.3306 > 192.168.1.10.52114: Flags [S.], seq ..., win ...
IP 192.168.1.10.52114 > 10.0.0.5.3306: Flags [.], ack ...
```

`Flags` 里的字母就是 TCP 标志：`S`=SYN、`S.`=SYN+ACK、`.`=ACK、`F`=FIN、`R`=RST。

### 第 2 步：对方回了什么——DROP 与 REJECT 的现场证据

抓包最大的价值在这里，curl 的报错是模糊的，网线上的包不会说谎：

| 抓到的现象                     | 结论                                                       |
| :----------------------------- | :--------------------------------------------------------- |
| 只有 `[S]` 反复重传，无任何回应 | 路径上有设备**静默丢弃**（DROP）——查防火墙、路由、安全组   |
| 对方回 `[R]`（RST）            | 明确拒绝（REJECT 或端口无进程监听）——查服务是否启动        |
| 握手完整 `[S] [S.] [.]` 后才卡 | 连接没问题，是**应用层**慢——去查应用日志与数据库状态       |

### 第 3 步：量化重传与卡顿

```bash
# 只看重传（同一 seq 反复出现）与 RST
tcpdump -n 'host 10.0.0.5 and (tcp[tcpflags] & tcp-rst != 0)'
```

## BPF 过滤器：tcpdump 的查询语言

上面的引号表达式叫 BPF（Berkeley Packet Filter）。语法像极简 SQL：
**协议 + 方向 + 类型** 三类词自由组合，`and/or/not` 连接：

```bash
tcpdump host 192.168.1.100              # 按主机
tcpdump src host 192.168.1.100          # 源地址
tcpdump dst host 192.168.1.100          # 目标地址
tcpdump host 192.168.1.1 and host 192.168.1.2   # 两台机器之间的互访

tcpdump port 80                         # 按端口
tcpdump src port 8080                   # 源端口
tcpdump dst port 443                    # 目标端口
tcpdump portrange 8080-8090             # 端口区间

tcpdump tcp                             # 按协议：tcp / udp / icmp / arp / ip6
tcpdump ip6                             # 只看 IPv6
```

组合与括号（shell 里括号要转义）：

```bash
tcpdump host 192.168.1.100 and port 80                  # AND
tcpdump port 80 or port 443                             # OR
tcpdump not port 22                                     # NOT：排除自己的 SSH，防刷屏
tcpdump host 192.168.1.100 and \( port 80 or port 443 \)
```

### TCP 标志位过滤：读懂那个位运算

```bash
tcpdump 'tcp[tcpflags] & tcp-syn != 0'    # 含 SYN 的包（含 SYN+ACK）
tcpdump 'tcp[tcpflags] & tcp-ack != 0'    # 含 ACK 的包
tcpdump 'tcp[tcpflags] & tcp-fin != 0'    # 含 FIN（正常关闭）
tcpdump 'tcp[tcpflags] & tcp-rst != 0'    # 含 RST（异常拒绝）
tcpdump 'tcp[tcpflags] & (tcp-syn|tcp-ack) != 0'
```

原理：`tcp[tcpflags]` 取 TCP 头里 1 字节的标志位字段，`&` 按位与判断某一位是否为 1。
想只抓「裸 SYN」（握手第一步、排除 ACK 已置位的包），再加一个 `= 0` 条件：
`tcp[tcpflags] & tcp-syn != 0 and tcp[tcpflags] & tcp-ack = 0`——排查 SYN 洪泛或半开连接时用。

## 保存与回放：把现场带回去

抓包吃 CPU 和磁盘，生产环境的正确姿势是「收紧过滤 + 存文件 + 拿去别处分析」：

```bash
tcpdump -w capture.pcap                       # 存原始包（pcap 格式，Wireshark 可直接打开）
tcpdump -r capture.pcap                       # 回读显示（回读时仍可用 BPF 过滤）
tcpdump -c 100                                # 抓满 100 个包自动停
timeout 60 tcpdump -w capture.pcap            # 限时 60 秒（配合 nohup 可挂后台取证）

# 滚动留存：每个文件最大 10MB，最多 5 个（适合长时间守株待兔）
tcpdump -C 10 -W 5 -w capture.pcap

# 实战组合：抓某主机的 HTTP 存下来
tcpdump -w http.pcap host 192.168.1.100 and port 80
```

## 看内容：明文协议与加密协议

```bash
tcpdump -A -n port 80                 # ASCII 显示载荷：明文 HTTP 直接可读
tcpdump -X -n port 80                 # 十六进制 + ASCII 对照
tcpdump -XX -n port 80                # 连链路层头一起给十六进制
tcpdump -s 0 -A -n port 80            # -s 0 抓完整包不截断（老版本默认 snaplen 有限）
tcpdump -tttt -i any                  # 完整日期时间戳，对日志时必备
```

### HTTP 抓包：按载荷首字节精确抓 GET/POST

经典的「读 TCP 载荷前 4 字节」技巧——`0x47455420` 就是 ASCII 的 `"GET "`：

```bash
# 抓所有 HTTP GET（0x47 45 54 20 = "GET "）
tcpdump -A -s 0 'tcp port 80 and tcp[((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)):4] = 0x47455420'

# 抓 HTTP POST（0x50 4f 53 54 = "POST"）
tcpdump -A -s 0 'tcp port 80 and tcp[((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)):4] = 0x504f5354'
```

表达式读法：`ip[2:2]` 是 IP 总长，减去 IP 头长、再减 TCP 头长，得到**载荷起始偏移**，
从这里取 4 字节比对。日常简单场景直接 `tcpdump -A -s 0 -i eth0 'tcp port 80'` 就够。

### HTTPS 抓包：能看到什么，看不到什么

2026 年的现实是流量几乎全走 TLS。抓 443 端口：

```bash
tcpdump -n port 443
```

你**看不到**任何请求内容（URL、头部、正文全是密文），但仍然能看到：握手往返时序
（RTT 有多大）、有无重传、RST、以及 ClientHello 里的 SNI——用 `-A` 在输出里翻，
能直接看到明文域名（除非站点启用了 ECH 加密 SNI）。TLS 细节分析交给
cybersecurity/090-HTTPSPrinciple 与 networking/280-WiresharkCLI。

### DNS 抓包与 2026 年的新坑

```bash
tcpdump -vv -n port 53        # 明文 DNS：查询的域名、类型、响应的记录都清晰可见
```

坑点：现代系统与浏览器越来越多默认走 **DoH/DoT（DNS over HTTPS/TLS）**——域名解析
不再出现在 53 端口，而是混在 443 的 TLS 流量里。你在 53 端口抓了个寂寞，别急着下
「没有 DNS 查询」的结论；排查域名解析问题时，先确认系统解析器配置，必要时在
测试环境临时禁用加密 DNS 再对照抓包。

## 坑点与自检

| 坑点 | 事实 |
| :--- | :--- |
| 忘加 `-n` | tcpdump 对每个地址做反向 DNS，自己产生流量污染抓包还拖慢 |
| 忘指定 `-i` | 默认抓第一个接口，多网卡机器上永远抓不到目标流量 |
| 生产环境裸抓 `tcpdump` | 全量流量瞬间吃满磁盘/CPU；先收紧 BPF，配 `-c` 或 `timeout` |
| 只在抓包机上看结论 | `-w` 存 pcap 回传用 Wireshark 分析，时序图、流重组比命令行强得多 |
| 用 53 端口判断「有没有 DNS」 | 加密 DNS 时代 53 端口可能是空的，先看系统解析器配置 |
| 把「没有响应包」当成对方挂了 | 也可能是中间防火墙 DROP；换路径抓（两端同时抓）才能切割责任 |

自检清单：能不看文档写出「抓某 IP 的 443 端口、排除 SSH、存成文件」的完整命令吗？
能从 Flags 序列读出三次握手各步吗？能解释「无响应」与「回 RST」的排查方向差异吗？

## 练习

1. 两终端配合：A 抓 `icmp`，B `ping -c 3` 某公网地址，数清 request/reply 是否成对；
   再 ping 一个不存在的内网地址，观察 ARP 或无响应的表现。
2. 用 curl 访问一个 HTTP 站点（如自建 nginx），用 `-A` 抓出完整的请求头与响应头文本。
3. 访问 `https://fanquanpp.github.io/FANDEX/` 的同时抓 443 端口，从 `-A` 输出里找出
   ClientHello 的 SNI 域名；体会「看得到域名、看不到内容」的边界。
4. 故意 `telnet 10.255.255.1 9999`（不存在的地址），对照本文学会区分「重传无回应」与「RST」。
5. `tcpdump -w test.pcap -c 50` 抓 50 个包，回传本机用 Wireshark 打开，找到一次完整的
   TCP 三次握手。

## 下一步

- networking/280-WiresharkCLI：pcap 文件的进阶分析（流跟踪、时序图、协议解码）。
- networking/080-PingTraceroute：连通性问题的第一反应工具，与抓包互补。
- networking/060-ARPRouting：看懂抓包输出里 ARP 与路由行为的底层逻辑。
