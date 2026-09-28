---
order: 40
title: 云网络与存储
module: 'cloud-computing'
category: 云与基础设施
difficulty: intermediate
description: 把一个三层应用安全放上云：动手划 VPC 与子网、收口安全组、理解 NAT 与路由，选对块存储与对象存储并配自动快照。
author: fanquanpp
updated: '2026-09-13'
related:
  - 'cloud-computing/010-CloudComputingBasics'
  - 'cloud-computing/230-CloudSecurityService'
  - 'cloud-computing/310-AWSS3Command'
  - 'cloud-computing/460-AWSVPCCommands'
prerequisites: []
---

前置知识：知道 IP 地址和端口是什么；装好 AWS CLI 并配置过一个测试账号
（本文命令以 AWS 为例，概念在任何云上都一一对应）。会花钱的部分会在
文中明确标出，练习用免费额度即可完成。

读完本文你应当能够：从零划出一个"公网入口 + 私有应用 + 私有数据库"
的 VPC；解释为什么数据库不该有公网 IP；为一块数据盘配上自动快照策略。

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

## 5. 存储：选对类型比调优更重要

云存储三兄弟，选型一句话：**块存储挂盘、对象存储放文件、文件存储做
共享目录**。本文展开前两个（最常用），文件存储见《云存储服务》。

### 5.1 块存储：数据库的磁盘

块存储（AWS 叫 EBS）像一块可以插拔的硬盘，挂给虚拟机当磁盘用。
三种主流盘型的取舍：

| 盘型       | 特点               | 适用               |
| :--------- | :----------------- | :----------------- |
| 通用 SSD (gp3) | 基线 3000 IOPS，可独立加购 | 系统盘、一般应用，默认选它 |
| 高性能 SSD (io2) | IOPS 上不封顶        | 高负载数据库       |
| HDD (st1)  | 便宜、吞吐型       | 日志、冷数据       |

数据库最怕的不是丢，是**回不到昨天**。快照（snapshot）解决它：
增量备份、存进对象存储、可随时恢复成新盘。手动打快照靠人记性，
生产用 DLM（Data Lifecycle Manager）声明策略，机器执行：

```bash
aws dlm create-lifecycle-policy \
  --execution-role-arn arn:aws:iam::xxx:role/DLMRole \
  --description "Daily EBS backup" --state ENABLED \
  --policy-details '{
    "PolicyType": "EBS_SNAPSHOT_MANAGEMENT",
    "ResourceTypes": ["VOLUME"],
    "TargetTags": [{"Key": "Backup", "Value": "daily"}],
    "Schedules": [{
      "Name": "DailyBackup",
      "CreateRule": {"Interval": 24, "IntervalUnit": "HOURS", "Times": ["03:00"]},
      "RetainRule": {"Count": 7},
      "CopyTags": true
    }]
  }'
```

读这段策略的方式和读 YAML 声明一样：**每天 03:00 给所有带
`Backup=daily` 标签的卷打快照，保留最近 7 份**。标签是这套自动化的
锚点——忘记给数据卷打标签，策略就永远不会覆盖它。

### 5.2 对象存储：文件、备份与静态站点

对象存储（AWS 叫 S3）没有"目录和磁盘"的概念，就是一个巨大的
键值空间：每个对象一个 key、一份内容、若干元数据，通过 HTTP API
读写。三个决定性特征：容量无上限、按用量计费、数据持久性设计值
高达 99.999999999%（11 个 9，靠多副本/多设施实现）。

常用操作两条命令就够（更多见《AWS S3 命令》）：

```bash
aws s3 cp report.pdf s3://my-app-bucket/documents/report.pdf
aws s3 presign s3://my-app-bucket/documents/report.pdf --expires-in 3600
# presign 生成 1 小时有效的临时下载链接——客户端直传/直下都靠它
```

对象存储的省钱开关是**生命周期分层**：访问频率随时间下降的数据
（日志、备份、旧附件）自动在存储层级间搬家：

```json
{
  "Rules": [{
    "ID": "ArchiveOldLogs",
    "Status": "Enabled",
    "Filter": { "Prefix": "logs/" },
    "Transitions": [
      { "Days": 30,  "StorageClass": "STANDARD_IA" },
      { "Days": 90,  "StorageClass": "GLACIER" }
    ],
    "Expiration": { "Days": 365 }
  }]
}
```

语义：logs/ 前缀的对象，30 天后转低频层、90 天后转归档层、365 天删除。

## 6. CDN：把静态内容搬到用户门口

对象存储解决"存得下"，CDN 解决"取得快"：内容复制到全球边缘节点，
用户就近取，没命中才回源站。缓存规则的经验值：

| 资源         | 缓存时间   | 原因                     |
| :----------- | :--------- | :----------------------- |
| 图片/CSS/JS  | 天级到月级 | 内容不变，改版靠文件名带哈希 |
| HTML 页面    | 分钟级     | 更新频繁，太长会缓存住旧页面 |
| API 响应     | 不缓存     | 动态数据，除非明确可缓存   |

判断优化是否有效的第一个指标是**缓存命中率**。FANDEX 这类静态文档站
整站构建产物都是不可变文件，天然适合"对象存储 + CDN"的零服务器组合。
实操见《AWS CloudFront》。

## 7. 坑点与自检

1. **NAT 网关双计费**（按小时 + 按流量）。大流量走 NAT 很贵：私有事
   务如果只是访问 S3/对象存储，改用免费的 Gateway Endpoint 直连，
   流量不过 NAT。
2. **对象存储分层的"最短存储时间"陷阱**。低频层 30 天、归档层 90 天
   起存，提前删除照收费；频繁回迁的"冷"数据走归档反而更贵——先看
   访问模式再分层。
3. **安全组只收口入站不看出站**。出站默认全放行意味着主机被入侵后
   可以任意外传数据；高安全要求场景出站也按需收口。
4. **快照策略没绑对标签**。新建的数据卷忘了打 `Backup=daily`，
   DLM 永远不备份它。定期审计"有卷无标签"的资源。
5. **子网规划不留余量**。VPC 和子网 CIDR 建好后不可扩，/24 用满只能
   推倒重来。起步至少 /16（VPC）+ /24（子网），预留一层子网段。

自检清单：

- [ ] 数据库子网没有 igw/NAT 路由，实例无公网 IP
- [ ] SSH 不对 0.0.0.0/0 开放，来源限制到堡垒机子网
- [ ] 跨层访问用安全组引用而不是写 IP 段
- [ ] 数据卷打了备份标签且 DLM 策略在运行
- [ ] 能说出块存储/对象存储各自的典型用途

## 8. 练习

1. 在免费额度的测试账号里按第 2.2 节建出 VPC 与三个子网，用
   `aws ec2 describe-route-tables` 验证私有子网确实没有 igw 路由。
2. 起一台测试机，先加一条 0.0.0.0/0:22 规则，用手机热点尝试连接；
   再把来源收口到一个不包含你的网段，观察连接行为变化。
3. 给第 1 题的数据盘打上标签并创建 DLM 策略，次日检查快照是否生成。
4. 建一个 S3 桶，上传几个文件后配置第 5.2 节的生命周期规则，在
   控制台里核对规则是否生效。

## 9. 下一步

- VPC 进阶（对等连接、端点、Flow Logs）：见《AWS VPC 命令》。
- 块/对象/文件存储的完整对比与选型：见《云存储服务》。
- 云安全的完整版图（IAM、加密、审计）：见《云安全服务》。
- 这套网络拓扑怎么用代码管理而不是手点：见《IaC 基础》与《Terraform 入门》。
