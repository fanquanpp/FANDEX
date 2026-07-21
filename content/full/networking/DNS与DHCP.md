---
order: 58
title: DNS与DHCP
module: networking
category: 网络技术
difficulty: intermediate
description: DNS与DHCP：域名解析体系、DNSSEC、DHCP协议与IP地址管理
author: fanquanpp
updated: '2026-06-14'
related:
  - networking/网络故障诊断
  - networking/网络设计与规划
  - networking/负载均衡技术
  - networking/网络自动化
prerequisites:
  - networking/网络基础与协议
---

## 1. DNS 体系

### 1.1 域名层次

```
根域(.)
├── 顶级域(.com, .net, .org, .cn)
│   ├── 二级域(example.com)
│   │   ├── 子域(www.example.com)
```

### 1.2 解析流程

```
客户端 → 本地DNS → 根DNS → 顶级域DNS → 权威DNS → 结果
```

递归查询 vs 迭代查询。

### 1.3 记录类型

| 类型  | 说明       | 示例                    |
| ----- | ---------- | ----------------------- |
| A     | IPv4地址   | 1.2.3.4                 |
| AAAA  | IPv6地址   | 2001:db8::1             |
| CNAME | 别名       | www → example.com       |
| MX    | 邮件交换   | 10 mail.example.com     |
| NS    | 名称服务器 | ns1.example.com         |
| TXT   | 文本记录   | SPF/DKIM                |
| SRV   | 服务定位   | \_sip.\_tcp.example.com |

### 1.4 DNSSEC

使用数字签名保护DNS响应：

- RRSIG：资源记录签名
- DNSKEY：公钥
- DS：委托签名者
- NSEC/NSEC3：不存在证明

## 2. DHCP

### 2.1 DORA 流程

```
客户端 → Discover(广播) → 服务器
客户端 ← Offer ← 服务器
客户端 → Request(广播) → 服务器
客户端 ← Ack ← 服务器
```

### 2.2 DHCP 中继

```bash
# 配置DHCP中继
interface Vlan10
  ip helper-address 10.0.0.100
```

### 2.3 IPAM

IP地址管理：统一管理IP分配、子网划分、DNS记录。
