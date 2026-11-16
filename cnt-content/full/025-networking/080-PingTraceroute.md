---
order: 110
title: 连通性检测
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: ping 与 traceroute：ICMP 可达性测试、TTL 与路径追踪原理、mtr 持续监测与输出解读。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'networking/290-NetworkTroubleshootTools'
  - 'networking/050-IPCommands'
  - 'networking/270-Tcpdump'
prerequisites: []
---

## ping 不通是故障还是正常

ping 与 traceroute 的价值不在命令本身，而在「分层解读」。ping 用 ICMP Echo，回答「IP 层
可达吗」；traceroute 利用 TTL 逐跳递减触发中间设备回 Time Exceeded，回答「路径经过谁」。
但两者都大量误报，新手最常见的三个误判：

- **ping 不通 ≠ 主机宕机**：大量主机与防火墙策略丢弃 ICMP（云厂商安全组默认如此），先用
  端口探测（nc/telnet）或 arping（二层验证）交叉确认；
- **traceroute 出现 `* * *` ≠ 路径断了**：中间路由器可能只是不回 ICMP TTL 超时报文
  （常见于运营商骨干），后续跳若能显示则路径正常；
- **ICMP 被限速 ≠ 丢包**：多数设备对 ICMP 做速率限制，traceroute 的丢包统计在高跳数处
  不可靠——持续定位丢包用 mtr 的 TCP 模式更接近真实业务路径。

泛洪类选项（`ping -f`、fping 高频扫描）是主动探测，只对自己的实验环境使用。

## ping 连通性测试

**基本写法：测试主机连通性**
`ping <目标>`
```bash
# 测试与 example.com 的连通性
ping example.com
```

**基本写法：指定发送次数**
`ping -c <次数> <目标>`
```bash
# 发送 4 个包后停止
ping -c 4 example.com
```

**基本写法：指定包大小**
`ping -s <大小> <目标>`
```bash
# 发送 1000 字节的包
ping -s 1000 example.com
```

**基本写法：指定间隔时间**
`ping -i <秒数> <目标>`
```bash
# 每 2 秒发送一个包
ping -i 2 example.com
```

**基本写法：设置超时时间**
`ping -W <秒数> <目标>`
```bash
# 设置 3 秒超时
ping -W 3 example.com
```

**基本写法：设置总超时**
`ping -w <秒数> <目标>`
```bash
# 10 秒后自动停止
ping -w 10 example.com
```

**基本写法：泛洪 ping**
`ping -f <目标>`
```bash
# 高速发送 ping 包（需 root）
ping -f example.com
```

---

## IPv6 ping

**基本写法：ping IPv6 地址**
`ping6 <目标>`
```bash
# 测试 IPv6 连通性
ping6 -c 4 2001:4860:4860::8888
```

**基本写法：指定接口 ping6**
`ping6 -I <接口> <目标>`
```bash
# 通过 eth0 接口 ping IPv6
ping6 -I eth0 fe80::1
```

---

## traceroute 路径追踪

**基本写法：追踪路由路径**
`traceroute <目标>`
```bash
# 追踪到 example.com 的网络路径
traceroute example.com
```

**基本写法：指定最大跳数**
`traceroute -m <跳数> <目标>`
```bash
# 最多追踪 20 跳
traceroute -m 20 example.com
```

**基本写法：指定每跳探测次数**
`traceroute -q <次数> <目标>`
```bash
# 每跳探测 3 次
traceroute -q 3 example.com
```

**基本写法：指定等待时间**
`traceroute -w <秒数> <目标>`
```bash
# 每跳等待 2 秒
traceroute -w 2 example.com
```

**基本写法：使用 TCP 模式**
`traceroute -T <目标>`
```bash
# 使用 TCP SYN 探测（绕过 ICMP 限制）
traceroute -T -p 80 example.com
```

**基本写法：指定源 IP**
`traceroute -s <源IP> <目标>`
```bash
# 指定源 IP 地址
traceroute -s 192.168.1.100 example.com
```

---

## tracepath 路径 MTU 发现

**基本写法：发现路径 MTU**
`tracepath <目标>`
```bash
# 发现到 example.com 的路径 MTU
tracepath example.com
```

**基本写法：指定端口**
`tracepath -p <端口> <目标>`
```bash
# 指定目标端口
tracepath -p 8080 example.com
```

**基本写法：指定最大跳数**
`tracepath -m <跳数> <目标>`
```bash
# 最多 20 跳
tracepath -m 20 example.com
```

---

## mtr 综合网络诊断

**基本写法：实时诊断**
`mtr <目标>`
```bash
# 实时显示 ping 和 traceroute 结果
mtr example.com
```

**基本写法：报告模式**
`mtr --report <目标>`
```bash
# 生成报告模式（发送 10 次后退出）
mtr --report example.com
```

**基本写法：指定报告次数**
`mtr --report --report-cycles <次数> <目标>`
```bash
# 发送 20 次后生成报告
mtr --report --report-cycles 20 example.com
```

**基本写法：使用 TCP 模式**
`mtr --tcp <目标>`
```bash
# 使用 TCP 模式探测
mtr --tcp -P 80 example.com
```

**基本写法：使用 UDP 模式**
`mtr --udp <目标>`
```bash
# 使用 UDP 模式探测
mtr --udp example.com
```

---

## arp 地址解析

**基本写法：查看 ARP 表**
`arp -a`
```bash
# 查看所有 ARP 缓存条目
arp -a
```

**基本写法：查看指定主机 ARP**
`arp <主机>`
```bash
# 查看指定 IP 的 ARP 条目
arp 192.168.1.1
```

**基本写法：删除 ARP 条目**
`arp -d <主机>`
```bash
# 删除指定 IP 的 ARP 条目
arp -d 192.168.1.1
```

**基本写法：添加静态 ARP**
`arp -s <IP> <MAC>`
```bash
# 添加静态 ARP 绑定
arp -s 192.168.1.1 00:11:22:33:44:55
```

---

## arping ARP 请求

**基本写法：发送 ARP 请求**
`arping <IP>`
```bash
# 发送 ARP 请求检测主机
arping 192.168.1.1
```

**基本写法：指定次数**
`arping -c <次数> <IP>`
```bash
# 发送 3 次 ARP 请求
arping -c 3 192.168.1.1
```

**基本写法：指定接口**
`arping -I <接口> <IP>`
```bash
# 通过 eth0 发送 ARP 请求
arping -I eth0 192.168.1.1
```

**基本写法：检测 IP 冲突**
`arping -D <IP>`
```bash
# 检测 IP 是否被占用（重复地址检测）
arping -D 192.168.1.100
```

---

## hostname 主机名管理

**基本写法：查看主机名**
`hostname`
```bash
# 查看当前主机名
hostname
```

**基本写法：查看 FQDN**
`hostname -f`
```bash
# 查看完全限定域名
hostname -f
```

**基本写法：查看所有 IP 地址**
`hostname -I`
```bash
# 查看主机所有 IP 地址
hostname -I
```

**基本写法：临时设置主机名**
`hostname <名称>`
```bash
# 临时设置主机名
hostname myserver
```

---

## fping 批量 ping

**基本写法：批量 ping 多个主机**
`fping <IP1> <IP2> <IP3>`
```bash
# 批量 ping 多个主机
fping 192.168.1.1 192.168.1.2 192.168.1.3
```

**基本写法：扫描网段**
`fping -g <网段>`
```bash
# 扫描 192.168.1.0/24 网段
fping -g 192.168.1.0/24
```

**基本写法：只显示存活主机**
`fping -a -g <网段>`
```bash
# 只显示存活的主机
fping -a -g 192.168.1.0/24 2>/dev/null
```

**基本写法：从文件读取目标**
`fping -f <文件>`
```bash
# 从文件读取 IP 列表
fping -f iplist.txt
```

## 教学自检

按遮码自检法：遮住上文代码块，先自己写命令或推演答案，再对照。

- traceroute 依赖 TTL 的什么行为？中间路由器靠哪种报文暴露自己？什么设备会让该跳显示 `*`？
- 为什么 traceroute -T（TCP SYN 探测）在 HTTP 服务路径上比 ICMP 版更真实？
- ping 通但 curl 不通，三类最常见原因怎么按顺序验证？（ICMP 放行 vs TCP 放行 vs 服务监听）
- mtr 相比「traceroute + ping」解决了什么问题？--report 模式为什么比实时看更常用在工单里？
- arping -D 检测 IP 冲突的原理是什么？它为什么只能在同二层内使用？
- `-w 10` 与 `-W 3` 都带超时语义，差别是什么？（总时长 vs 单包等待）
