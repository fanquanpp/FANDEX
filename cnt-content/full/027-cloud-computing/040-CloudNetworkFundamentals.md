---
order: 40
title: 云网络基础
module: 'cloud-computing'
category: 云与基础设施
difficulty: intermediate
description: 把一个三层应用安全放上云：动手划 VPC 与子网、收口安全组、理解 NAT 与路由，理解「能被公网访问的」与「绝不能被公网访问的」如何物理隔开。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cloud-computing/010-CloudComputingBasics'
  - 'cloud-computing/045-CloudStorageFundamentals'
  - 'cloud-computing/230-CloudSecurityService'
  - 'cloud-computing/460-AWSVPCCommands'
prerequisites: []
---

前置知识：知道 IP 地址和端口是什么；装好 AWS CLI 并配置过一个测试账号
（本文命令以 AWS 为例，概念在任何云上都一一对应）。会花钱的部分会在
文中明确标出，练习用免费额度即可完成。

读完本文你应当能够：从零划出一个"公网入口 + 私有应用 + 私有数据库"
的 VPC；解释为什么数据库不该有公网 IP。存储怎么选（块/对象/文件）与
CDN 见《云存储基础与 CDN》。

## 1. 场景：三台服务器裸奔上云的第一周

新手最常见的上云姿势：在控制台点三台虚拟机，全部勾选"分配公网 IP"，
防火墙全开，网站、API、数据库直接跑起来。第一周往往没事，直到某天：

- 安全群组里 `0.0.0.0/0:22`（对全世界开放 SSH）被扫描器爆破；
- 数据库 3306 端口对公网开放，弱口令在几小时内被打穿；
- 月账单里冒出"公网 IPv4 费用"——2024 年起 AWS 对每个公网 IP 按小时收费。

这三件事的解法是同一个：**上云第一步不是买机器，是先划网络**。
把"能被公网访问的"和"绝不能被公网访问的"物理隔开，这就是 VPC 与
子网要做的事。

## 2. 动手：划一个最小可用的 VPC

### 2.1 先想清楚图纸

目标结构：一个 VPC 是云上一块你专属的私网地址段；里面按"谁能接触
公网"分成两类子网：

```
VPC 10.0.0.0/16（65536 个地址）
  公有子网  10.0.1.0/24  → 负载均衡器、NAT 网关（需要进出公网）
  私有子网  10.0.10.0/24 → 应用服务器（只出不进）
  私有子网  10.0.20.0/24 → 数据库（连出站都不需要公网）
```

两个关键词提前解释：**可用区（AZ）**是同一区域内物理隔离的机房，
正式部署时每个子网都会在两个 AZ 各放一份防机房级故障；**路由表**
决定"发往某网段的包从哪个口出去"，子网靠它联网或不联网。

### 2.2 用 CLI 建出来

```bash
# 1. 创建 VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# 2. 创建三类子网（示例放同一 AZ，生产请在两个 AZ 各建一份）
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24  --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.10.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.20.0/24 --availability-zone us-east-1a

# 3. 创建互联网网关并挂到 VPC 上
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway --internet-gateway-id igw-xxx --vpc-id vpc-xxx

# 4. 公有子网的路由表加默认路由指向互联网网关
aws ec2 create-route --route-table-id rtb-public \
  --destination-cidr-block 0.0.0.0/0 --gateway-id igw-xxx
```

私有子网的路由表**不配**这条 igw 路由——这就是"私有"的全部秘密：
没有去公网的路，公网自然进不来。完整命令（NAT、对等连接、端点）
见《AWS VPC 命令》，本节只需建立"地址段 + 子网 + 路由"三层模型。

## 3. 安全组：每台机器的iptables，但更好用

### 3.1 先看反面教材

裸奔期的安全组规则长这样（等效写法）：

```json
{
  "Inbound": [
    { "Protocol": "TCP", "Port": 22,   "Source": "0.0.0.0/0" },
    { "Protocol": "TCP", "Port": 80,   "Source": "0.0.0.0/0" },
    { "Protocol": "TCP", "Port": 3306, "Source": "0.0.0.0/0" }
  ]
}
```

三条里两条是事故预定：22 对全世界开放等着被爆破；3306 是数据库端口，
对公网开放等于把数据拱手送人。收口后的 Web 服务器安全组：

```json
{
  "Inbound": [
    { "Protocol": "TCP", "Port": 443, "Source": "0.0.0.0/0",
      "Description": "HTTPS 入站" },
    { "Protocol": "TCP", "Port": 22,  "Source": "10.0.1.0/24",
      "Description": "SSH 仅允许堡垒机子网访问" }
  ]
}
```

### 3.2 分层引用：规则跟着层走而不是跟着 IP 走

三层架构的正确姿势是每层一个安全组，**下游只允许上游的安全组访问**：

```
Internet → [LB 安全组: 443 对全网] → [App 安全组: 只允许 sg-lb]
         → [DB 安全组: 只允许 sg-app]
```

好处：应用服务器扩容 10 台，DB 规则一个字不用改——它放行的是
"sg-app 这个组"，不是一串 IP。这是安全组区别于普通防火墙的核心设计，
安全组之间可以互相引用。

补充一条概念辨析，面试和排障都常考：**安全组是有状态的实例级防火墙**
（回来的包自动放行，规则只写一边）；**NACL 是无状态的子网级防火墙**
（进出各写一遍，还要管顺序）。日常九成场景只用安全组，NACL 留给
"整个子网直接封禁某 IP"这类粗粒度需求。

## 4. 私有子网怎么打补丁：NAT 网关

私有子网没有公网路由，那里面的应用服务器要下载系统补丁、调用第三方
API 怎么办？在公有子网放一台 **NAT 网关**：私有子网发起的出站流量
经它转发去公网，公网主动进来的连接则被天然挡住——"只出不进"。

```bash
# 在公有子网创建 NAT 网关（绑定一个弹性 IP）
aws ec2 create-nat-gateway --subnet-id subnet-public-a \
  --allocation-id eipalloc-xxx

# 私有子网路由表加默认路由指向 NAT 网关
aws ec2 create-route --route-table-id rtb-private-a \
  --destination-cidr-block 0.0.0.0/0 --nat-gateway-id nat-xxx
```

方向辨析：Internet 网关管"双向"，NAT 网关管"只出不进"，数据库子网
通常两者都不配——它连应用服务器都在同一个 VPC 内部通信。

## 5. 坑点与自检

1. **NAT 网关双计费**（按小时 + 按流量）。大流量走 NAT 很贵：私有事
   务如果只是访问 S3/对象存储，改用免费的 Gateway Endpoint 直连，
   流量不过 NAT。
2. **安全组只收口入站不看出站**。出站默认全放行意味着主机被入侵后
   可以任意外传数据；高安全要求场景出站也按需收口。
3. **子网规划不留余量**。VPC 和子网 CIDR 建好后不可扩，/24 用满只能
   推倒重来。起步至少 /16（VPC）+ /24（子网），预留一层子网段。

自检清单：

- [ ] 数据库子网没有 igw/NAT 路由，实例无公网 IP
- [ ] SSH 不对 0.0.0.0/0 开放，来源限制到堡垒机子网
- [ ] 跨层访问用安全组引用而不是写 IP 段
- [ ] 能对着拓扑图说出 igw、NAT 网关各自管哪个方向的流量

## 6. 练习

1. 在免费额度的测试账号里按第 2.2 节建出 VPC 与三个子网，用
   `aws ec2 describe-route-tables` 验证私有子网确实没有 igw 路由。
2. 起一台测试机，先加一条 0.0.0.0/0:22 规则，用手机热点尝试连接；
   再把来源收口到一个不包含你的网段，观察连接行为变化。

参考实现（先自己动手，再对照）：

```bash
# 练习 1 的验证思路：私有子网关联的路由表里，不应有目的地 0.0.0.0/0
# 且 target 为 igw- 开头的路由；输出按路由表名过滤即可
aws ec2 describe-route-tables \
  --filters "Name=tag:Name,Values=rtb-private*" \
  --query 'RouteTables[].Routes[?DestinationCidrBlock==`0.0.0.0/0`]'

# 预期输出：[]（空列表）——私有子网没有任何默认路由，
# 若出现 {"DestinationCidrBlock": "0.0.0.0/0", "NatGatewayId": ...}
# 属正常（NAT 出站路由），只要 GatewayId 不是 igw- 开头即可。
```

对照要点：验证命令比建资源命令更重要——网络配置「配错了不报错」，只有
读回状态确认，才算配置完成。

## 7. 下一步

- 存储怎么选（块/对象/文件三类对比、快照与生命周期、CDN 加速）：
  见《云存储基础与 CDN》。
- VPC 进阶（对等连接、端点、Flow Logs）：见《AWS VPC 命令》。
- 云安全的完整版图（IAM、加密、审计）：见《云安全服务》。
- 这套网络拓扑怎么用代码管理而不是手点：见《IaC 基础》与《Terraform 入门》。
