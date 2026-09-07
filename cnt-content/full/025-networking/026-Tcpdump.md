---
order: 260
title: tcpdump 抓包
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: Networking tcpdump 抓包 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## tcpdump 基本用法

**基本写法：抓取所有流量**
`tcpdump`
```bash
# 抓取默认接口的所有流量
tcpdump
```

**基本写法：指定接口抓包**
`tcpdump -i <接口>`
```bash
# 抓取 eth0 接口的流量
tcpdump -i eth0
```

**基本写法：抓取所有接口**
`tcpdump -i any`
```bash
# 抓取所有接口的流量
tcpdump -i any
```

**基本写法：不解析主机名和端口名**
`tcpdump -n`
```bash
# 快速抓包不解析名称
tcpdump -n
```

**基本写法：详细输出**
`tcpdump -v`
```bash
# 显示详细信息
tcpdump -v
```

**基本写法：更详细的输出**
`tcpdump -vv`
```bash
# 显示更详细的信息
tcpdump -vv
```

**基本写法：显示数据链路层信息**
`tcpdump -e`
```bash
# 显示 MAC 地址信息
tcpdump -e
```

---

## 保存与读取抓包文件

**基本写法：保存到文件**
`tcpdump -w <文件>`
```bash
# 保存抓包结果到 capture.pcap
tcpdump -w capture.pcap
```

**基本写法：从文件读取**
`tcpdump -r <文件>`
```bash
# 读取并显示抓包文件
tcpdump -r capture.pcap
```

**基本写法：限制抓包大小**
`tcpdump -C <大小> -w <文件>`
```bash
# 每个文件最大 10MB
tcpdump -C 10 -w capture.pcap
```

**基本写法：限制抓包文件数量**
`tcpdump -W <数量> -C <大小> -w <文件>`
```bash
# 最多保留 5 个文件，每个 10MB
tcpdump -W 5 -C 10 -w capture.pcap
```

**基本写法：限制抓包数量**
`tcpdump -c <数量>`
```bash
# 抓取 100 个包后停止
tcpdump -c 100
```

---

## 主机过滤

**基本写法：按主机过滤**
`tcpdump host <IP>`
```bash
# 抓取指定主机的所有流量
tcpdump host 192.168.1.100
```

**基本写法：按源主机过滤**
`tcpdump src host <IP>`
```bash
# 抓取源 IP 为 192.168.1.100 的流量
tcpdump src host 192.168.1.100
```

**基本写法：按目标主机过滤**
`tcpdump dst host <IP>`
```bash
# 抓取目标 IP 为 192.168.1.100 的流量
tcpdump dst host 192.168.1.100
```

**基本写法：多主机过滤**
`tcpdump host <IP1> and host <IP2>`
```bash
# 抓取两台主机之间的流量
tcpdump host 192.168.1.1 and host 192.168.1.2
```

---

## 端口过滤

**基本写法：按端口过滤**
`tcpdump port <端口>`
```bash
# 抓取 80 端口的所有流量
tcpdump port 80
```

**基本写法：按源端口过滤**
`tcpdump src port <端口>`
```bash
# 抓取源端口为 8080 的流量
tcpdump src port 8080
```

**基本写法：按目标端口过滤**
`tcpdump dst port <端口>`
```bash
# 抓取目标端口为 443 的流量
tcpdump dst port 443
```

**基本写法：端口范围过滤**
`tcpdump portrange <起始>-<结束>`
```bash
# 抓取 8080-8090 端口范围的流量
tcpdump portrange 8080-8090
```

---

## 协议过滤

**基本写法：按协议过滤**
`tcpdump <协议>`
```bash
# 只抓取 TCP 流量
tcpdump tcp
```

**基本写法：抓取 UDP 流量**
`tcpdump udp`
```bash
# 只抓取 UDP 流量
tcpdump udp
```

**基本写法：抓取 ICMP 流量**
`tcpdump icmp`
```bash
# 抓取 ICMP 流量（如 ping）
tcpdump icmp
```

**基本写法：抓取 ARP 流量**
`tcpdump arp`
```bash
# 抓取 ARP 协议流量
tcpdump arp
```

**基本写法：抓取 IPv6 流量**
`tcpdump ip6`
```bash
# 抓取 IPv6 流量
tcpdump ip6
```

---

## 组合过滤

**基本写法：AND 组合**
`tcpdump <条件1> and <条件2>`
```bash
# 抓取主机 192.168.1.100 的 80 端口流量
tcpdump host 192.168.1.100 and port 80
```

**基本写法：OR 组合**
`tcpdump <条件1> or <条件2>`
```bash
# 抓取 80 或 443 端口流量
tcpdump port 80 or port 443
```

**基本写法：NOT 排除**
`tcpdump not <条件>`
```bash
# 排除 SSH 流量
tcpdump not port 22
```

**基本写法：复杂组合**
`tcpdump <条件1> and ( <条件2> or <条件3> )`
```bash
# 抓取主机 192.168.1.100 的 80 或 443 端口
tcpdump host 192.168.1.100 and \( port 80 or port 443 \)
```

---

## TCP 标志过滤

**基本写法：抓取 SYN 包**
`tcpdump 'tcp[tcpflags] & tcp-syn != 0'`
```bash
# 抓取 TCP SYN 包
tcpdump 'tcp[tcpflags] & tcp-syn != 0'
```

**基本写法：抓取 ACK 包**
`tcpdump 'tcp[tcpflags] & tcp-ack != 0'`
```bash
# 抓取 TCP ACK 包
tcpdump 'tcp[tcpflags] & tcp-ack != 0'
```

**基本写法：抓取 FIN 包**
`tcpdump 'tcp[tcpflags] & tcp-fin != 0'`
```bash
# 抓取 TCP FIN 包
tcpdump 'tcp[tcpflags] & tcp-fin != 0'
```

**基本写法：抓取 RST 包**
`tcpdump 'tcp[tcpflags] & tcp-rst != 0'`
```bash
# 抓取 TCP RST 包
tcpdump 'tcp[tcpflags] & tcp-rst != 0'
```

**基本写法：抓取 SYN 和 ACK**
`tcpdump 'tcp[tcpflags] & (tcp-syn|tcp-ack) != 0'`
```bash
# 抓取 SYN 或 ACK 包
tcpdump 'tcp[tcpflags] & (tcp-syn|tcp-ack) != 0'
```

---

## 数据包内容查看

**基本写法：以 ASCII 显示**
`tcpdump -A`
```bash
# 以 ASCII 显示数据包内容
tcpdump -A
```

**基本写法：以十六进制和 ASCII 显示**
`tcpdump -X`
```bash
# 以十六进制和 ASCII 显示数据包
tcpdump -X
```

**基本写法：完整十六进制输出**
`tcpdump -XX`
```bash
# 包含链路层头的十六进制输出
tcpdump -XX
```

**基本写法：指定抓取长度**
`tcpdump -s <长度>`
```bash
# 抓取每个包的前 256 字节
tcpdump -s 256
```

**基本写法：抓取完整数据包**
`tcpdump -s 0`
```bash
# 抓取完整数据包（默认 65535 字节）
tcpdump -s 0
```

---

## HTTP 抓包实战

**基本写法：抓取 HTTP 请求**
`tcpdump -A -s 0 'tcp port 80 and tcp[((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)):4] = 0x47455420'`
```bash
# 抓取 HTTP GET 请求
tcpdump -A -s 0 'tcp port 80 and tcp[((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)):4] = 0x47455420'
```

**基本写法：简单 HTTP 流量抓取**
`tcpdump -A -s 0 -i eth0 'tcp port 80'`
```bash
# 抓取 80 端口并显示内容
tcpdump -A -s 0 -i eth0 'tcp port 80'
```

**基本写法：抓取 HTTP POST 请求**
`tcpdump -A -s 0 'tcp port 80 and tcp[((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)):4] = 0x504f5354'`
```bash
# 抓取 HTTP POST 请求
tcpdump -A -s 0 'tcp port 80 and tcp[((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)):4] = 0x504f5354'
```

---

## DNS 抓包

**基本写法：抓取 DNS 查询**
`tcpdump -i eth0 'port 53'`
```bash
# 抓取所有 DNS 查询和响应
tcpdump -i eth0 'port 53'
```

**基本写法：详细显示 DNS 内容**
`tcpdump -vv -i eth0 'port 53'`
```bash
# 详细显示 DNS 查询内容
tcpdump -vv -i eth0 'port 53'
```

---

## 实用抓包组合

**基本写法：抓取指定主机的 HTTP 流量并保存**
`tcpdump -w <文件> host <IP> and port 80`
```bash
# 抓取指定主机的 HTTP 流量并保存
tcpdump -w http.pcap host 192.168.1.100 and port 80
```

**基本写法：排除 SSH 和 DNS 流量**
`tcpdump -n 'not port 22 and not port 53'`
```bash
# 抓取除 SSH 和 DNS 外的流量
tcpdump -n 'not port 22 and not port 53'
```

**基本写法：按时间限制抓包**
`timeout <秒数> tcpdump -w <文件>`
```bash
# 抓取 60 秒的流量
timeout 60 tcpdump -w capture.pcap
```

**基本写法：实时显示带时间戳**
`tcpdump -tttt`
```bash
# 显示带完整时间戳的数据包
tcpdump -tttt -i eth0
```
