---
order: 460
title: AWS VPC 网络命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: AWS VPC 网络命令 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## VPC 创建与管理

**基本写法：创建 VPC**
`aws ec2 create-vpc --cidr-block <CIDR> [--instance-tenancy <租期>]`
```bash
# 创建 10.0.0.0/16 网段的 VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --instance-tenancy default
```

---

**基本写法：列出所有 VPC**
`aws ec2 describe-vpcs`
```bash
# 查看账户所有 VPC
aws ec2 describe-vpcs
```

---

**基本写法：查看指定 VPC**
`aws ec2 describe-vpcs --vpc-ids <VPC ID>`
```bash
# 查看指定 VPC 详情
aws ec2 describe-vpcs --vpc-ids vpc-12345678
```

---

**基本写法：删除 VPC**
`aws ec2 delete-vpc --vpc-id <VPC ID>`
```bash
# 删除指定 VPC(必须先删除其下所有资源)
aws ec2 delete-vpc --vpc-id vpc-12345678
```

---

**基本写法：为 VPC 添加名称标签**
`aws ec2 create-tags --resources <资源ID> --tags Key=Name,Value=<名称>`
```bash
# 给 VPC 添加名称
aws ec2 create-tags \
  --resources vpc-12345678 \
  --tags Key=Name,Value=my-vpc
```

---

## 子网管理

**基本写法：创建子网**
`aws ec2 create-subnet --vpc-id <VPC ID> --cidr-block <CIDR> [--availability-zone <AZ>]`
```bash
# 在 VPC 中创建子网
aws ec2 create-subnet \
  --vpc-id vpc-12345678 \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a
```

---

**基本写法：列出子网**
`aws ec2 describe-subnets [--filters Name=vpc-id,Values=<VPC ID>]`
```bash
# 查看指定 VPC 下所有子网
aws ec2 describe-subnets \
  --filters Name=vpc-id,Values=vpc-12345678
```

---

**基本写法：删除子网**
`aws ec2 delete-subnet --subnet-id <子网ID>`
```bash
# 删除指定子网
aws ec2 delete-subnet --subnet-id subnet-12345678
```

---

**基本写法：为子网开启公网映射**
`aws ec2 modify-subnet-attribute --subnet-id <子网ID> --map-public-ip-on-launch`
```bash
# 让子网中的实例自动获取公网 IP
aws ec2 modify-subnet-attribute \
  --subnet-id subnet-12345678 \
  --map-public-ip-on-launch
```

---

**基本写法：分配 IPv6 CIDR**
`aws ec2 associate-subnet-cidr-block --subnet-id <子网ID> --ipv6-cidr-block <IPv6 CIDR>`
```bash
# 为子网分配 IPv6 网段
aws ec2 associate-subnet-cidr-block \
  --subnet-id subnet-12345678 \
  --ipv6-cidr-block 2600:1f18:4113:b200::/64
```

---

## 路由表

**基本写法：创建路由表**
`aws ec2 create-route-table --vpc-id <VPC ID>`
```bash
# 在指定 VPC 创建路由表
aws ec2 create-route-table --vpc-id vpc-12345678
```

---

**基本写法：添加路由**
`aws ec2 create-route --route-table-id <路由表ID> --destination-cidr-block <CIDR> --gateway-id <网关ID>`
```bash
# 添加 0.0.0.0/0 默认路由到 Internet 网关
aws ec2 create-route \
  --route-table-id rtb-12345678 \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id igw-12345678
```

---

**基本写法：添加 NAT 网关路由**
`aws ec2 create-route --route-table-id <路由表ID> --destination-cidr-block <CIDR> --nat-gateway-id <NAT ID>`
```bash
# 私有子网通过 NAT 网关访问外网
aws ec2 create-route \
  --route-table-id rtb-12345678 \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id nat-12345678
```

---

**基本写法：关联子网**
`aws ec2 associate-route-table --route-table-id <路由表ID> --subnet-id <子网ID>`
```bash
# 将路由表关联到子网
aws ec2 associate-route-table \
  --route-table-id rtb-12345678 \
  --subnet-id subnet-12345678
```

---

**基本写法：列出路由表**
`aws ec2 describe-route-tables [--filters Name=vpc-id,Values=<VPC ID>]`
```bash
# 查看指定 VPC 的路由表
aws ec2 describe-route-tables \
  --filters Name=vpc-id,Values=vpc-12345678
```

---

## 网关

**基本写法：创建 Internet 网关**
`aws ec2 create-internet-gateway`
```bash
# 创建 Internet Gateway
aws ec2 create-internet-gateway
```

---

**基本写法：附加到 VPC**
`aws ec2 attach-internet-gateway --internet-gateway-id <网关ID> --vpc-id <VPC ID>`
```bash
# 将 IGW 附加到 VPC
aws ec2 attach-internet-gateway \
  --internet-gateway-id igw-12345678 \
  --vpc-id vpc-12345678
```

---

**基本写法：创建 NAT 网关**
`aws ec2 create-nat-gateway --subnet-id <子网ID> --allocation-id <EIP ID>`
```bash
# 在公有子网创建 NAT 网关
aws ec2 create-nat-gateway \
  --subnet-id subnet-12345678 \
  --allocation-id eipalloc-12345678
```

---

**基本写法：创建 VPC 端点**
`aws ec2 create-vpc-endpoint --vpc-id <VPC ID> --service-name <服务名> --route-table-ids <路由表ID>`
```bash
# 创建 S3 Gateway 端点
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-12345678 \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids rtb-12345678
```

---

**基本写法：创建接口端点**
`aws ec2 create-vpc-endpoint --vpc-id <VPC ID> --vpc-endpoint-type Interface --service-name <服务名> --subnet-ids <子网ID>`
```bash
# 创建 PrivateLink 接口端点
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-12345678 \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.us-east-1.ec2 \
  --subnet-ids subnet-12345678
```

---

## 安全组

**基本写法：创建安全组**
`aws ec2 create-security-group --group-name <组名> --description <描述> --vpc-id <VPC ID>`
```bash
# 在 VPC 中创建安全组
aws ec2 create-security-group \
  --group-name my-sg \
  --description "My security group" \
  --vpc-id vpc-12345678
```

---

**基本写法：添加入站规则**
`aws ec2 authorize-security-group-ingress --group-id <组ID> --protocol <协议> --port <端口> --cidr <CIDR>`
```bash
# 允许 0.0.0.0/0 访问 80 端口
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0
```

---

**基本写法：添加 SSH 入站规则**
`aws ec2 authorize-security-group-ingress --group-id <组ID> --protocol tcp --port 22 --cidr <CIDR>`
```bash
# 仅允许指定 IP 访问 22 端口
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 22 \
  --cidr 203.0.113.0/24
```

---

**基本写法：移除入站规则**
`aws ec2 revoke-security-group-ingress --group-id <组ID> --protocol <协议> --port <端口> --cidr <CIDR>`
```bash
# 移除 80 端口的入站规则
aws ec2 revoke-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0
```

---

**基本写法：引用其他安全组**
`aws ec2 authorize-security-group-ingress --group-id <组ID> --protocol tcp --port <端口> --source-group <源组ID>`
```bash
# 允许其他安全组中的实例访问本组 3306 端口
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 3306 \
  --source-group sg-87654321
```

---

## 网络访问控制列表

**基本写法：创建网络 ACL**
`aws ec2 create-network-acl --vpc-id <VPC ID>`
```bash
# 在 VPC 中创建网络 ACL
aws ec2 create-network-acl --vpc-id vpc-12345678
```

---

**基本写法：添加 ACL 规则**
`aws ec2 create-network-acl-entry --network-acl-id <ACL ID> --rule-number <序号> --protocol <协议> --rule-action <动作> --cidr-block <CIDR> --port-range From=<起>,To=<止>`
```bash
# 添加允许 HTTP 入站的 ACL 规则
aws ec2 create-network-acl-entry \
  --network-acl-id acl-12345678 \
  --rule-number 100 \
  --protocol 6 \
  --rule-action allow \
  --cidr-block 0.0.0.0/0 \
  --port-range From=80,To=80 \
  --egress false
```

---

**基本写法：关联子网**
`aws ec2 replace-network-acl-association --association-id <关联ID> --network-acl-id <ACL ID>`
```bash
# 将 ACL 关联到子网
aws ec2 replace-network-acl-association \
  --association-id aclassoc-12345678 \
  --network-acl-id acl-12345678
```

---

**基本写法：查看网络 ACL**
`aws ec2 describe-network-acls [--filters Name=vpc-id,Values=<VPC ID>]`
```bash
# 列出指定 VPC 的所有 ACL
aws ec2 describe-network-acls \
  --filters Name=vpc-id,Values=vpc-12345678
```

---

## 弹性 IP

**基本写法：分配弹性 IP**
`aws ec2 allocate-address --domain <域>`
```bash
# 为 VPC 分配弹性 IP
aws ec2 allocate-address --domain vpc
```

---

**基本写法：关联到实例**
`aws ec2 associate-address --instance-id <实例ID> --allocation-id <EIP ID>`
```bash
# 将弹性 IP 关联到 EC2 实例
aws ec2 associate-address \
  --instance-id i-1234567890abcdef0 \
  --allocation-id eipalloc-12345678
```

---

**基本写法：释放弹性 IP**
`aws ec2 release-address --allocation-id <EIP ID>`
```bash
# 释放未使用的弹性 IP
aws ec2 release-address --allocation-id eipalloc-12345678
```

---

**基本写法：查看所有弹性 IP**
`aws ec2 describe-addresses`
```bash
# 列出账户所有弹性 IP
aws ec2 describe-addresses
```

---

## Peering 与 VPN

**基本写法：创建 VPC Peering**
`aws ec2 create-vpc-peering-connection --vpc-id <本端VPC> --peer-vpc-id <对端VPC>`
```bash
# 创建 VPC 对等连接
aws ec2 create-vpc-peering-connection \
  --vpc-id vpc-12345678 \
  --peer-vpc-id vpc-87654321
```

---

**基本写法：接受 Peering 请求**
`aws ec2 accept-vpc-peering-connection --vpc-peering-connection-id <连接ID>`
```bash
# 接收 VPC 对等连接请求
aws ec2 accept-vpc-peering-connection \
  --vpc-peering-connection-id pcx-12345678
```

---

**基本写法：创建客户网关**
`aws ec2 create-customer-gateway --type ipsec.1 --public-ip <公网IP> --bgp-asn <ASN>`
```bash
# 创建 VPN 客户网关
aws ec2 create-customer-gateway \
  --type ipsec.1 \
  --public-ip 203.0.113.10 \
  --bgp-asn 65000
```

---

**基本写法：创建 VPN 连接**
`aws ec2 create-vpn-connection --customer-gateway-id <CGW ID> --vpn-gateway-id <VGW ID> --type ipsec.1`
```bash
# 建立 Site-to-Site VPN 连接
aws ec2 create-vpn-connection \
  --customer-gateway-id cgw-12345678 \
  --vpn-gateway-id vgw-12345678 \
  --type ipsec.1
```

---

## 流日志与网络监控

**基本写法：启用 VPC 流日志**
`aws ec2 create-flow-logs --resource-ids <资源ID> --resource-type <类型> --traffic-type <流量> --log-group-name <日志组>`
```bash
# 为 VPC 启用流日志记录所有流量
aws ec2 create-flow-logs \
  --resource-ids vpc-12345678 \
  --resource-type VPC \
  --traffic-type ALL \
  --log-group-name /aws/vpc/flowlogs \
  --deliver-logs-permission-arn arn:aws:iam::123456789012:role/FlowLogsRole
```

---

**基本写法：查看流日志**
`aws ec2 describe-flow-logs`
```bash
# 列出所有流日志配置
aws ec2 describe-flow-logs
```

---

**基本写法：删除流日志**
`aws ec2 delete-flow-logs --flow-log-ids <流日志ID>`
```bash
# 删除指定流日志
aws ec2 delete-flow-logs --flow-log-ids fl-12345678
```

---

**基本写法：启用 Reachability Analyzer**
`aws ec2 create-network-insights-path --source <资源ID> --destination <资源ID> --protocol <协议>`
```bash
# 创建路径分析(检查网络可达性)
aws ec2 create-network-insights-path \
  --source i-1234567890abcdef0 \
  --destination i-abcdef1234567890 \
  --protocol tcp
```

---

## Transit Gateway

**基本写法：创建 Transit Gateway**
`aws ec2 create-transit-gateway [--description <描述>]`
```bash
# 创建中转网关用于多 VPC 互联
aws ec2 create-transit-gateway --description "my-tgw"
```

---

**基本写法：附加 VPC 到 TGW**
`aws ec2 create-transit-gateway-vpc-attachment --transit-gateway-id <TGW ID> --vpc-id <VPC ID> --subnet-ids <子网ID列表>`
```bash
# 将 VPC 附加到中转网关
aws ec2 create-transit-gateway-vpc-attachment \
  --transit-gateway-id tgw-12345678 \
  --vpc-id vpc-12345678 \
  --subnet-ids subnet-12345678 subnet-87654321
```

---

**基本写法：查看 TGW 附件**
`aws ec2 describe-transit-gateway-attachments`
```bash
# 列出所有 TGW 附件
aws ec2 describe-transit-gateway-attachments
```

---

**基本写法：创建 TGW 路由**
`aws ec2 create-transit-gateway-route --destination-cidr-block <CIDR> --transit-gateway-route-table-id <表ID> --transit-gateway-attachment-id <附件ID>`
```bash
# 在 TGW 路由表中添加路由
aws ec2 create-transit-gateway-route \
  --destination-cidr-block 10.0.0.0/16 \
  --transit-gateway-route-table-id tgw-rtb-12345678 \
  --transit-gateway-attachment-id tgw-attach-12345678
```
