---
order: 380
title: nmap 端口扫描
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: Cybersecurity nmap 端口扫描 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## nmap 基本扫描

**基本写法：扫描单个主机**
`nmap <主机>`
```bash
# 扫描目标主机常用端口
nmap 192.168.1.1
```

**基本写法：扫描域名**
`nmap <域名>`
```bash
# 扫描域名
nmap example.com
```

**基本写法：扫描 IP 范围**
`nmap <起始IP>-<结束IP>`
```bash
# 扫描 IP 范围
nmap 192.168.1.1-100
```

**基本写法：扫描整个子网**
`nmap <网段>/<前缀>`
```bash
# 扫描 192.168.1.0/24 网段
nmap 192.168.1.0/24
```

**基本写法：从文件读取目标**
`nmap -iL <文件>`
```bash
# 从文件读取目标列表
nmap -iL targets.txt
```

---

## 主机发现

**基本写法：只发现存活主机**
`nmap -sn <目标>`
```bash
# Ping 扫描发现存活主机
nmap -sn 192.168.1.0/24
```

**基本写法：跳过主机发现**
`nmap -Pn <目标>`
```bash
# 跳过 Ping 直接扫描端口
nmap -Pn 192.168.1.1
```

**基本写法：使用 ARP 发现**
`nmap -PR <目标>`
```bash
# 使用 ARP 请求发现主机
nmap -PR 192.168.1.0/24
```

**基本写法：使用 ICMP 发现**
`nmap -PE <目标>`
```bash
# 使用 ICMP Echo 请求发现主机
nmap -PE 192.168.1.0/24
```

**基本写法：禁用 DNS 解析**
`nmap -n <目标>`
```bash
# 跳过 DNS 解析加快扫描
nmap -n 192.168.1.0/24
```

---

## 端口扫描技术

**基本写法：SYN 半开扫描**
`nmap -sS <目标>`
```bash
# SYN 半开扫描（需 root 权限）
nmap -sS 192.168.1.1
```

**基本写法：TCP 全连接扫描**
`nmap -sT <目标>`
```bash
# TCP 全连接扫描
nmap -sT 192.168.1.1
```

**基本写法：UDP 扫描**
`nmap -sU <目标>`
```bash
# UDP 端口扫描
nmap -sU 192.168.1.1
```

**基本写法：FIN 扫描**
`nmap -sF <目标>`
```bash
# FIN 扫描绕过防火墙
nmap -sF 192.168.1.1
```

**基本写法：Xmas 扫描**
`nmap -sX <目标>`
```bash
# Xmas 扫描（FIN+PSH+URG）
nmap -sX 192.168.1.1
```

**基本写法：Null 扫描**
`nmap -sN <目标>`
```bash
# Null 扫描（无标志位）
nmap -sN 192.168.1.1
```

---

## 端口指定

**基本写法：扫描指定端口**
`nmap -p <端口> <目标>`
```bash
# 扫描 80 端口
nmap -p 80 192.168.1.1
```

**基本写法：扫描多个端口**
`nmap -p <端口1>,<端口2> <目标>`
```bash
# 扫描 80 和 443 端口
nmap -p 80,443 192.168.1.1
```

**基本写法：扫描端口范围**
`nmap -p <起始>-<结束> <目标>`
```bash
# 扫描 1-1000 端口
nmap -p 1-1000 192.168.1.1
```

**基本写法：扫描所有端口**
`nmap -p- <目标>`
```bash
# 扫描所有 65535 个端口
nmap -p- 192.168.1.1
```

**基本写法：扫描常用端口**
`nmap -F <目标>`
```bash
# 快速扫描 100 个常用端口
nmap -F 192.168.1.1
```

**基本写法：扫描指定协议端口**
`nmap -p <协议>:<端口> <目标>`
```bash
# 扫描 TCP 80 和 UDP 53
nmap -p T:80,U:53 192.168.1.1
```

---

## 服务与版本探测

**基本写法：服务版本探测**
`nmap -sV <目标>`
```bash
# 探测端口运行的服务版本
nmap -sV 192.168.1.1
```

**基本写法：操作系统探测**
`nmap -O <目标>`
```bash
# 探测目标操作系统
nmap -O 192.168.1.1
```

**基本写法：全面扫描**
`nmap -A <目标>`
```bash
# 启用所有高级探测功能
nmap -A 192.168.1.1
```

**基本写法：设置版本探测强度**
`nmap -sV --version-intensity <级别> <目标>`
```bash
# 设置版本探测强度（0-9）
nmap -sV --version-intensity 9 192.168.1.1
```

**基本写法：轻量级版本探测**
`nmap -sV --version-light <目标>`
```bash
# 轻量级版本探测
nmap -sV --version-light 192.168.1.1
```

---

## 扫描时序与性能

**基本写法：设置时序模板**
`nmap -T<级别> <目标>`
```bash
# 使用 T4 时序模板（0-5）
nmap -T4 192.168.1.1
```

**基本写法：并行扫描**
`nmap --min-parallelism <数量> <目标>`
```bash
# 设置最小并行探测数
nmap --min-parallelism 10 192.168.1.1
```

**基本写法：限制扫描速率**
`nmap --max-rate <速率> <目标>`
```bash
# 限制每秒最大 100 个包
nmap --max-rate 100 192.168.1.1
```

**基本写法：设置超时**
`nmap --host-timeout <时间> <目标>`
```bash
# 设置每主机超时 30 分钟
nmap --host-timeout 30m 192.168.1.1
```

**基本写法：设置重试次数**
`nmap --max-retries <次数> <目标>`
```bash
# 设置最大重试次数
nmap --max-retries 2 192.168.1.1
```

---

## NSE 脚本引擎

**基本写法：使用默认脚本**
`nmap -sC <目标>`
```bash
# 使用默认脚本集合
nmap -sC 192.168.1.1
```

**基本写法：指定脚本扫描**
`nmap --script <脚本> <目标>`
```bash
# 使用 vuln 类脚本扫描漏洞
nmap --script vuln 192.168.1.1
```

**基本写法：使用多个脚本**
`nmap --script <脚本1>,<脚本2> <目标>`
```bash
# 同时使用多个脚本
nmap --script http-title,ssl-cert 192.168.1.1
```

**基本写法：HTTP 标题枚举**
`nmap --script http-title -p <端口> <目标>`
```bash
# 获取 HTTP 服务标题
nmap --script http-title -p 80,443 192.168.1.1
```

**基本写法：SSL 证书枚举**
`nmap --script ssl-cert -p 443 <目标>`
```bash
# 获取 SSL 证书信息
nmap --script ssl-cert -p 443 example.com
```

**基本写法：检测弱密码套件**
`nmap --script ssl-enum-ciphers -p 443 <目标>`
```bash
# 枚举 SSL 支持的密码套件
nmap --script ssl-enum-ciphers -p 443 example.com
```

**基本写法：脚本参数设置**
`nmap --script <脚本> --script-args <参数>=<值> <目标>`
```bash
# 给脚本传递参数
nmap --script http-enum --script-args http-enum.basepath=/admin/ -p 80 192.168.1.1
```

---

## 防火墙与 IDS 规避

**基本写法：分片发送数据包**
`nmap -f <目标>`
```bash
# 使用小分片绕过 IDS
nmap -f 192.168.1.1
```

**基本写法：设置 MTU**
`nmap --mtu <大小> <目标>`
```bash
# 设置自定义 MTU 大小
nmap --mtu 24 192.168.1.1
```

**基本写法：使用诱饵**
`nmap -D <诱饵1>,<诱饵2> <目标>`
```bash
# 使用诱饵 IP 隐藏真实源
nmap -D 192.168.1.100,192.168.1.101,ME 192.168.1.1
```

**基本写法：随机诱饵**
`nmap -D RND:<数量> <目标>`
```bash
# 使用 5 个随机诱饵
nmap -D RND:5 192.168.1.1
```

**基本写法：伪造源端口**
`nmap --source-port <端口> <目标>`
```bash
# 使用 53 端口作为源端口
nmap --source-port 53 192.168.1.1
```

**基本写法：随机化目标顺序**
`nmap --randomize-hosts <目标>`
```bash
# 随机化扫描顺序
nmap --randomize-hosts 192.168.1.0/24
```

---

## 输出格式

**基本写法：标准输出到文件**
`nmap -oN <文件> <目标>`
```bash
# 输出标准格式到文件
nmap -oN scan.txt 192.168.1.1
```

**基本写法：XML 格式输出**
`nmap -oX <文件> <目标>`
```bash
# 输出 XML 格式便于程序解析
nmap -oX scan.xml 192.168.1.1
```

**基本写法：Grep 格式输出**
`nmap -oG <文件> <目标>`
```bash
# 输出 grep 友好格式
nmap -oG scan.gnmap 192.168.1.1
```

**基本写法：输出所有格式**
`nmap -oA <文件名> <目标>`
```bash
# 同时输出所有格式
nmap -oA scanresult 192.168.1.1
```

**基本写法：追加到输出文件**
`nmap --append-output -oN <文件> <目标>`
```bash
# 追加结果到已有文件
nmap --append-output -oN scan.txt 192.168.1.2
```

---

## 实用扫描组合

**基本写法：快速发现存活主机**
`nmap -sn -T4 <网段>`
```bash
# 快速扫描网段存活主机
nmap -sn -T4 192.168.1.0/24
```

**基本写法：全面扫描单主机**
`nmap -sS -sV -O -A -T4 -p- <主机>`
```bash
# 全面扫描所有端口和服务
nmap -sS -sV -O -A -T4 -p- 192.168.1.1
```

**基本写法：扫描并保存结果**
`nmap -sV -oA <文件名> -p- <主机>`
```bash
# 扫描所有端口并保存结果
nmap -sV -oA fullscan -p- 192.168.1.1
```

**基本写法：隐蔽扫描**
`nmap -sS -f -T2 -D RND:3 --randomize-hosts <目标>`
```bash
# 慢速隐蔽扫描
nmap -sS -f -T2 -D RND:3 --randomize-hosts 192.168.1.1
```

**基本写法：扫描 Web 服务**
`nmap -p 80,443,8080,8443 -sV --script http-title,http-headers <目标>`
```bash
# 扫描常见 Web 端口并获取标题
nmap -p 80,443,8080,8443 -sV --script http-title,http-headers 192.168.1.1
```
