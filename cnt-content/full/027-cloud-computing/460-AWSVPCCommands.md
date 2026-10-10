---
order: 520
title: AWS VPC 网络命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'VPC 学习笔记：从零搭一个"公有子网 + 私有子网"的生产形网络，理解路由、网关、安全组每一层在干什么。'
author: fanquanpp
updated: '2026-10-11'
related:
  - 'cloud-computing/220-CloudNetworkService'
  - 'cloud-computing/450-AWSRDSCommands'
  - 'cloud-computing/300-AWSCliConfigure'
prerequisites:
  - 'cloud-computing/300-AWSCliConfigure'
  - 'cloud-computing/220-CloudNetworkService'
---

## 场景

你要在 AWS 上部署一个两台机器的小系统：一台 Web 服务器需要被公网访问，一台数据库只能内网访问。直接把两台 EC2 都丢进默认 VPC 并绑公网 IP 当然能跑，但数据库暴露公网等于裸奔。正确姿势是自己搭一个 VPC（Virtual Private Cloud）：公网子网放 Web，私有子网放数据库。

这一篇按搭网络的真实顺序操作。全程 AWS CLI，动手前先想清楚一件事——**"公有子网"和"私有子网"不是某种特殊子网类型，区别只在路由表**：有去往互联网的路由就是公有，没有就是私有。理解了这句，后面每条命令都知道自己在改哪一层。

## 第零步：规划网段

创建 VPC 前先画网段图，避免日后 subnet 打架：

```text
VPC:        10.0.0.0/16   （65536 个地址，一个 region 一个 VPC）
公有子网 a:  10.0.1.0/24   （AZ us-east-1a，放 Web/NAT）
私有子网 a:  10.0.11.0/24  （AZ us-east-1a，放数据库）
```

生产至少要两个 AZ 各一对子网；网段规划原则：给每个子网留足余量，VPC 创建后 CIDR 可以追加但不能改。

## 第一步：VPC 与子网

```bash
# 创建 VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --instance-tenancy default

# 给它起个人能读懂的名字（控制台里看的就是这个 Name 标签）
aws ec2 create-tags \
  --resources vpc-12345678 \
  --tags Key=Name,Value=my-vpc

# 在两个可用区创建子网
aws ec2 create-subnet \
  --vpc-id vpc-12345678 \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a

aws ec2 create-subnet \
  --vpc-id vpc-12345678 \
  --cidr-block 10.0.11.0/24 \
  --availability-zone us-east-1a

# 让公有子网里的实例启动时自动分配公网 IP（只对这个子网开）
aws ec2 modify-subnet-attribute \
  --subnet-id subnet-12345678 \
  --map-public-ip-on-launch

# 查看这个 VPC 下所有子网
aws ec2 describe-subnets \
  --filters Name=vpc-id,Values=vpc-12345678

# 查看与删除
aws ec2 describe-vpcs --vpc-ids vpc-12345678
aws ec2 delete-subnet --subnet-id subnet-12345678
```

需要 IPv6 时给子网追加网段（VPC 侧要先关联 IPv6 CIDR）：

```bash
aws ec2 associate-subnet-cidr-block \
  --subnet-id subnet-12345678 \
  --ipv6-cidr-block 2600:1f18:4113:b200::/64
```

## 第二步：Internet 网关与路由

VPC 默认与外界完全隔离。给它接一个 Internet Gateway（IGW，免费的边界网关），再在公有子网的路由表里指过去：

```bash
# 创建 IGW 并附加到 VPC（两步，IGW 创建时是"游离"状态）
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway \
  --internet-gateway-id igw-12345678 \
  --vpc-id vpc-12345678

# 创建路由表
aws ec2 create-route-table --vpc-id vpc-12345678

# 加默认路由：全宇宙流量都走 IGW
aws ec2 create-route \
  --route-table-id rtb-12345678 \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id igw-12345678

# 把这张路由表关联到公有子网（做完这步子网才"公有"）
aws ec2 associate-route-table \
  --route-table-id rtb-12345678 \
  --subnet-id subnet-12345678

# 查看路由表（每张表里默认有一条 VPC 本地路由 10.0.0.0/16 local，不要动它）
aws ec2 describe-route-tables \
  --filters Name=vpc-id,Values=vpc-12345678
```

私有子网什么都不用做：它保持默认主路由表的关联（只有 local 路由），出不了网。这就是"私有"的全部含义。

## 第三步：NAT 网关——让私有子网"只出不进"

数据库要打补丁、拉软件包，但不该被公网访问。NAT 网关就是"只出不进"的出口：私有子网的流量经它出去，外面的连接进不来。两个硬性前置：NAT 网关必须放在**公有子网**里，且需要一个弹性 IP（EIP）。

```bash
# 分配弹性 IP（NAT 网关的固定出口地址）
aws ec2 allocate-address --domain vpc

# 在公有子网创建 NAT 网关
aws ec2 create-nat-gateway \
  --subnet-id subnet-12345678 \
  --allocation-id eipalloc-12345678

# 在私有子网的路由表里加默认路由指向 NAT
aws ec2 create-route \
  --route-table-id rtb-87654321 \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id nat-12345678
```

成本提醒：NAT 网关按小时 + 按流量计费，跨可用区走 NAT 还有跨区流量费。多 AZ 部署时每个 AZ 各放一个 NAT 并指向本 AZ 的，避免流量跨区绕行。

## 第四步：安全组——实例级的防火墙

网络通了，现在收口"谁能连什么"。安全组（Security Group）挂在实例/网卡上，是有状态防火墙：入站规则放行的连接，响应流量自动放行，不用配出站。

```bash
# 给 Web 创建安全组
aws ec2 create-security-group \
  --group-name my-sg \
  --description "My security group" \
  --vpc-id vpc-12345678

# 放行公网 HTTP
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# SSH 只放行自己办公室的网段，绝不要 0.0.0.0/0
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 22 \
  --cidr 203.0.113.0/24

# 数据库安全组的精髓：不写 IP，引用"Web 安全组"
# 含义是"挂着 sg-87654321 的机器可以连我的 3306"
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 3306 \
  --source-group sg-87654321

# 收回某条规则
aws ec2 revoke-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0
```

SG 引用（`--source-group`）是最值得养成的习惯：实例换了 IP 规则不用跟着改，规则本身就成了架构文档。

## 补充：网络 ACL——子网级的第二道闸

NACL 挂在子网上，按规则编号从上到下匹配，**无状态**（入站放行不代表出站放行，要各配一条）。默认 NACL 全放行，多数团队不深用它，但要知道怎么动它：

```bash
# 创建与查看
aws ec2 create-network-acl --vpc-id vpc-12345678
aws ec2 describe-network-acls \
  --filters Name=vpc-id,Values=vpc-12345678

# 加规则：允许 HTTP 入站（协议 6 = TCP，编号越小优先级越高）
aws ec2 create-network-acl-entry \
  --network-acl-id acl-12345678 \
  --rule-number 100 \
  --protocol 6 \
  --rule-action allow \
  --cidr-block 0.0.0.0/0 \
  --port-range From=80,To=80 \
  --egress false

# 关联到子网
aws ec2 replace-network-acl-association \
  --association-id aclassoc-12345678 \
  --network-acl-id acl-12345678
```

| 维度 | 安全组 | NACL |
| :--- | :--- | :--- |
| 作用层 | 实例/网卡 | 子网 |
| 状态 | 有状态 | 无状态 |
| 规则顺序 | 全部求值（都允许才放行） | 按编号先到先得 |
| 典型用途 | 日常访问控制 | 明确封禁某段 IP、临时止血 |

## 弹性 IP 的正确用法

EIP 是"可编程的固定公网 IP"：实例挂了换新机器，把 EIP 重新关联过去，DNS 不用改。

```bash
aws ec2 allocate-address --domain vpc
aws ec2 associate-address \
  --instance-id i-1234567890abcdef0 \
  --allocation-id eipalloc-12345678
aws ec2 describe-addresses
aws ec2 release-address --allocation-id eipalloc-12345678
```

注意：**关联着的 EIP 不收费，闲置的 EIP 收费**——测试完不释放，月底账单会给你惊喜。排查"不明流量费"时 `describe-addresses` 先看有没有闲置 EIP。

## 私有子网访问 AWS 服务的正道：VPC 端点

私有子网里的机器要访问 S3，走 NAT 出公网再回来既贵又绕。VPC 端点让流量走 AWS 内网直达服务：

```bash
# Gateway 型端点（S3/DynamoDB 专用，免费，挂在路由表上）
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-12345678 \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids rtb-12345678

# Interface 型端点（其他服务用，按小时计费，在子网里起 ENI）
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-12345678 \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.us-east-1.ec2 \
  --subnet-ids subnet-12345678
```

## 连不上时怎么排查

网络是分层叠出来的，问题也分层藏。两个利器：

```bash
# Reachability Analyzer：回答"A 能不能到 B"，直接给出被哪条规则挡住
aws ec2 create-network-insights-path \
  --source i-1234567890abcdef0 \
  --destination i-abcdef1234567890 \
  --protocol tcp

# VPC Flow Logs：把所有经过的包记录成日志（排障与审计）
aws ec2 create-flow-logs \
  --resource-ids vpc-12345678 \
  --resource-type VPC \
  --traffic-type ALL \
  --log-group-name /aws/vpc/flowlogs \
  --deliver-logs-permission-arn arn:aws:iam::123456789012:role/FlowLogsRole

aws ec2 describe-flow-logs
aws ec2 delete-flow-logs --flow-log-ids fl-12345678
```

Flow Logs 里看 `REJECT` 记录的端口和方向，八成是安全组或 NACL 挡了。

## VPC 之间怎么连

### Peering：两个 VPC 直连

```bash
# 发起对等连接
aws ec2 create-vpc-peering-connection \
  --vpc-id vpc-12345678 \
  --peer-vpc-id vpc-87654321

# 对端账户/区域接受
aws ec2 accept-vpc-peering-connection \
  --vpc-peering-connection-id pcx-12345678
```

接受只是第一步，两边的路由表还要各加一条指向对端网段的路由，流量才真正通。Peering 不传递（A-B、B-C 通不代表 A-C 通），网段重叠的 VPC 不能 Peering。

### Site-to-Site VPN：连回公司机房

```bash
# 描述公司侧的 VPN 设备
aws ec2 create-customer-gateway \
  --type ipsec.1 \
  --public-ip 203.0.113.10 \
  --bgp-asn 65000

# 建立隧道
aws ec2 create-vpn-connection \
  --customer-gateway-id cgw-12345678 \
  --vpn-gateway-id vgw-12345678 \
  --type ipsec.1
```

### Transit Gateway：三个以上 VPC 的星型组网

VPC 一多，Peering 会变成 O(n^2) 的网状迷宫，这时换 Transit Gateway（TGW）做中心路由器：

```bash
aws ec2 create-transit-gateway --description "my-tgw"

# 把 VPC 挂到 TGW（选两个子网做挂载点，通常每个 AZ 一个）
aws ec2 create-transit-gateway-vpc-attachment \
  --transit-gateway-id tgw-12345678 \
  --vpc-id vpc-12345678 \
  --subnet-ids subnet-12345678 subnet-87654321

aws ec2 describe-transit-gateway-attachments

# TGW 路由表里加路由
aws ec2 create-transit-gateway-route \
  --destination-cidr-block 10.0.0.0/16 \
  --transit-gateway-route-table-id tgw-rtb-12345678 \
  --transit-gateway-attachment-id tgw-attach-12345678
```

选型：两三个 VPC 用 Peering 够了；VPC 数量会增长、或要连 VPN/专线，直接上 TGW。

## 清理与坑点

删除 VPC 必须先删光里面的资源（实例、子网、网关、Peering……），顺序反过来最省事：

```text
EIP/实例 → NAT 网关 → IGW 分离并删除 → 子网（先解除路由表关联）→ 路由表 → VPC
```

| 坑 | 现象 | 对策 |
| :--- | :--- | :--- |
| 给私有子网加了 IGW 路由还以为它私有 | 实例可被公网直达 | 公/私由路由表决定，定期审计默认路由 |
| NAT 网关放进了私有子网 | 状态卡 pending/失败，不出网 | NAT 必须在公有子网 + EIP |
| 安全组改了没生效 | 连接仍被拒 | 检查实例挂的是不是这个 SG；SG 改动实时生效，NACL 看关联 |
| NACL 加了入站忘了出站 | 请求进得去回不来 | 无状态：出入都要配 |
| EIP 闲置没释放 | 每月固定一笔小账单 | 用完 release |
| 删除 VPC 报依赖错误 | 里面还有隐藏资源 | 先 `describe-subnets`/`describe-internet-gateways` 清单式排查 |

## 自检

1. 一个子网里既有能上公网又有不能上公网的实例，问题出在哪一层？（提示：安全组 vs 路由）
2. 数据库安全组的入站规则应该写 IP 还是引用安全组？为什么？
3. 私有子网访问 S3 有几种路径？成本从高到低排个序。

## 练习

1. 完整搭出本篇的两子网网络，启动一台 EC2 验证：公有子网能 SSH、私有子网能 `yum update`（走 NAT）但不能被 ping。
2. 故意删掉私有子网路由表的 NAT 路由，再用 Reachability Analyzer 或 SSH 排查"为什么上不了网"，体验分层排查。
3. 开启 Flow Logs，在安全组里封掉某个端口的入站，去日志里找到对应的 REJECT 记录。
4. 清理全部资源，然后核对 `describe-addresses` 为空、账单没有残留项。

## 下一步

- 把 RDS 放进私有子网：见 [AWS RDS 命令](/cloud-computing/450-AWSRDSCommands)。
- 网络服务全景（Global Accelerator、CloudFront 回源等）见 [云网络服务](/cloud-computing/220-CloudNetworkService)。
- 命令要固化成代码：Terraform 版本的同一套网络见 [Terraform 基础](/cloud-computing/420-TerraformBasic)。
