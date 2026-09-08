---
order: 310
title: nc 与 nmap
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: Networking nc 与 nmap 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## nc 基本用法

**基本写法：连接 TCP 端口**
`nc <主机> <端口>`
```bash
# 连接到 example.com 的 80 端口
nc example.com 80
```

**基本写法：监听端口**
`nc -l <端口>`
```bash
# 监听 8080 端口
nc -l 8080
```

**基本写法：指定超时**
`nc -w <秒数> <主机> <端口>`
```bash
# 设置 5 秒超时
nc -w 5 example.com 80
```

**基本写法：UDP 连接**
`nc -u <主机> <端口>`
```bash
# UDP 模式连接
nc -u example.com 53
```

**基本写法：UDP 监听**
`nc -ul <端口>`
```bash
# 监听 UDP 端口
nc -ul 8080
```

---

## nc 端口扫描

**基本写法：扫描单个端口**
`nc -zv <主机> <端口>`
```bash
# 扫描 80 端口
nc -zv example.com 80
```

**基本写法：扫描端口范围**
`nc -zv <主机> <起始>-<结束>`
```bash
# 扫描 1-1000 端口范围
nc -zv example.com 1-1000
```

**基本写法：指定超时扫描**
`nc -zvw <秒数> <主机> <端口>`
```bash
# 设置 2 秒超时扫描
nc -zvw 2 example.com 1-1000
```

**基本写法：使用 IPv6**
`nc -6 -zv <主机> <端口>`
```bash
# 使用 IPv6 扫描
nc -6 -zv example.com 80
```

---

## nc 文件传输

**基本写法：接收文件**
`nc -l <端口> > <文件>`
```bash
# 监听 8080 端口接收文件
nc -l 8080 > received.txt
```

**基本写法：发送文件**
`nc <主机> <端口> < <文件>`
```bash
# 发送文件到远程主机
nc 192.168.1.100 8080 < file.txt
```

**基本写法：传输目录**
`tar czf - <目录> | nc <主机> <端口>`
```bash
# 压缩并传输目录
tar czf - /data | nc 192.168.1.100 8080
```

**基本写法：接收并解压**
`nc -l <端口> | tar xzf -`
```bash
# 接收并解压目录
nc -l 8080 | tar xzf - -C /backup
```

---

## nc 高级用法

**基本写法：保持监听**
`nc -lk <端口>`
```bash
# 持续监听 8080 端口
nc -lk 8080
```

**基本写法：HTTP 请求**
`echo -e "GET / HTTP/1.1\r\nHost: example.com\r\n\r\n" | nc example.com 80`
```bash
# 通过 nc 发送 HTTP 请求
echo -e "GET / HTTP/1.1\r\nHost: example.com\r\n\r\n" | nc example.com 80
```

**基本写法：聊天服务器**
`nc -l <端口>`
```bash
# 在主机 A 启动监听
nc -l 8080
# 在主机 B 连接
nc 192.168.1.1 8080
```

**基本写法：端口转发**
`nc -l <本地端口> -c 'nc <目标> <端口>'`
```bash
# 端口转发
nc -l 8080 -c 'nc example.com 80'
```

---

## nmap 基本扫描

**基本写法：扫描单个主机**
`nmap <主机>`
```bash
# 扫描 example.com 常用端口
nmap example.com
```

**基本写法：扫描 IP 范围**
`nmap <起始IP>-<结束IP>`
```bash
# 扫描 192.168.1.1 到 192.168.1.100
nmap 192.168.1.1-100
```

**基本写法：扫描网段**
`nmap <网段>/<前缀>`
```bash
# 扫描 192.168.1.0/24 网段
nmap 192.168.1.0/24
```

**基本写法：从文件读取目标**
`nmap -iL <文件>`
```bash
# 从文件读取目标列表扫描
nmap -iL targets.txt
```

**基本写法：排除指定主机**
`nmap <网段> --exclude <IP>`
```bash
# 排除指定主机扫描
nmap 192.168.1.0/24 --exclude 192.168.1.1
```

---

## nmap 端口扫描

**基本写法：扫描指定端口**
`nmap -p <端口> <主机>`
```bash
# 扫描 80 端口
nmap -p 80 example.com
```

**基本写法：扫描端口范围**
`nmap -p <起始>-<结束> <主机>`
```bash
# 扫描 1-1000 端口
nmap -p 1-1000 example.com
```

**基本写法：扫描所有端口**
`nmap -p- <主机>`
```bash
# 扫描所有 65535 个端口
nmap -p- example.com
```

**基本写法：扫描指定协议端口**
`nmap -p <协议>:<端口> <主机>`
```bash
# 扫描 UDP 53 端口
nmap -p U:53 example.com
```

**基本写法：快速扫描常用端口**
`nmap -F <主机>`
```bash
# 快速扫描 100 个常用端口
nmap -F example.com
```

---

## nmap 扫描类型

**基本写法：SYN 半开扫描**
`nmap -sS <主机>`
```bash
# SYN 半开扫描（需 root）
nmap -sS example.com
```

**基本写法：TCP 全连接扫描**
`nmap -sT <主机>`
```bash
# TCP 全连接扫描
nmap -sT example.com
```

**基本写法：UDP 扫描**
`nmap -sU <主机>`
```bash
# UDP 端口扫描
nmap -sU example.com
```

**基本写法：Ping 扫描**
`nmap -sn <网段>`
```bash
# 只发现存活主机
nmap -sn 192.168.1.0/24
```

**基本写法：无 Ping 扫描**
`nmap -Pn <主机>`
```bash
# 跳过主机发现直接扫描端口
nmap -Pn example.com
```

---

## nmap 服务与版本探测

**基本写法：服务版本探测**
`nmap -sV <主机>`
```bash
# 探测端口对应的服务版本
nmap -sV example.com
```

**基本写法：操作系统探测**
`nmap -O <主机>`
```bash
# 探测目标操作系统
nmap -O example.com
```

**基本写法：全面扫描**
`nmap -A <主机>`
```bash
# 启用所有高级探测功能
nmap -A example.com
```

**基本写法：指定版本探测强度**
`nmap -sV --version-intensity <级别> <主机>`
```bash
# 设置版本探测强度为 9
nmap -sV --version-intensity 9 example.com
```

---

## nmap 时间与性能

**基本写法：设置扫描时序**
`nmap -T<级别> <主机>`
```bash
# 使用激进时序模板（0-5）
nmap -T4 example.com
```

**基本写法：设置并发速率**
`nmap --max-rate <速率> <主机>`
```bash
# 限制最大每秒 100 个包
nmap --max-rate 100 example.com
```

**基本写法：设置并行数**
`nmap --min-parallelism <数量> <主机>`
```bash
# 设置最小并行探测数
nmap --min-parallelism 10 example.com
```

**基本写法：设置超时**
`nmap --host-timeout <时间> <主机>`
```bash
# 设置每主机超时 30 分钟
nmap --host-timeout 30m example.com
```

---

## nmap 脚本引擎

**基本写法：使用默认脚本**
`nmap -sC <主机>`
```bash
# 使用默认脚本集合扫描
nmap -sC example.com
```

**基本写法：指定脚本扫描**
`nmap --script <脚本> <主机>`
```bash
# 使用 vuln 脚本扫描漏洞
nmap --script vuln example.com
```

**基本写法：HTTP 标题枚举**
`nmap --script http-title -p <端口> <主机>`
```bash
# 获取 HTTP 服务标题
nmap --script http-title -p 80,443 example.com
```

**基本写法：SSL 证书枚举**
`nmap --script ssl-cert -p 443 <主机>`
```bash
# 获取 SSL 证书信息
nmap --script ssl-cert -p 443 example.com
```

**基本写法：列举脚本**
`nmap --script-help <类别>`
```bash
# 列出所有 vuln 类别脚本
nmap --script-help vuln
```

---

## nmap 输出格式

**基本写法：输出到文件**
`nmap -oN <文件> <主机>`
```bash
# 输出标准格式到文件
nmap -oN scan.txt example.com
```

**基本写法：输出 XML 格式**
`nmap -oX <文件> <主机>`
```bash
# 输出 XML 格式便于程序解析
nmap -oX scan.xml example.com
```

**基本写法：输出 Grep 格式**
`nmap -oG <文件> <主机>`
```bash
# 输出 grep 友好格式
nmap -oG scan.gnmap example.com
```

**基本写法：输出所有格式**
`nmap -oA <文件名> <主机>`
```bash
# 同时输出所有格式
nmap -oA scanresult example.com
```

---

## 实用扫描组合

**基本写法：快速存活主机发现**
`nmap -sn -T4 <网段>`
```bash
# 快速扫描网段存活主机
nmap -sn -T4 192.168.1.0/24
```

**基本写法：全面扫描单主机**
`nmap -sS -sV -O -A -T4 -p- <主机>`
```bash
# 全面扫描所有端口和服务
nmap -sS -sV -O -A -T4 -p- example.com
```

**基本写法：扫描并保存结果**
`nmap -sV -oA <文件名> -p- <主机>`
```bash
# 扫描所有端口并保存结果
nmap -sV -oA fullscan -p- 192.168.1.1
```
