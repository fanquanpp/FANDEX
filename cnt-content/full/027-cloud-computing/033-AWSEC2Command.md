---
order: 330
title: AWS EC2 命令
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 云计算 AWS EC2 命令 的完整教学讲解。
author: fanquanpp
updated: '2026-08-01'
---

## 实例查询

**基本写法：列出所有实例**
`aws ec2 describe-instances [--filters <过滤器>]`
```bash
# 列出当前账号所有 EC2 实例
aws ec2 describe-instances
```

---

**基本写法：过滤运行中实例**
`aws ec2 describe-instances --filters "Name=instance-state-name,Values=running"`
```bash
# 仅列出 running 状态的实例
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running"
```

---

**基本写法：查询指定字段**
`aws ec2 describe-instances --query '<JMESPath>' --output table`
```bash
# 提取实例 ID 类型状态公网 IP
aws ec2 describe-instances --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name,PublicIpAddress]' --output table
```

---

## 实例生命周期

**基本写法：启动新实例**
`aws ec2 run-instances --image-id <AMI> --instance-type <类型> [--key-name <密钥名>] [--security-group-ids <安全组ID>]`
```bash
# 启动一台 t2.micro 实例
aws ec2 run-instances --image-id ami-0c55b159cbfafe1f0 --instance-type t2.micro --key-name my-key-pair
```

---

**基本写法：在 VPC 子网中启动**
`aws ec2 run-instances --image-id <AMI> --instance-type <类型> --subnet-id <子网ID> --security-group-ids <安全组ID>`
```bash
# 指定子网与安全组启动实例
aws ec2 run-instances --image-id ami-12345 --instance-type t3.small --subnet-id subnet-abc123 --security-group-ids sg-12345
```

---

**基本写法：启动已停止的实例**
`aws ec2 start-instances --instance-ids <实例ID>`
```bash
# 启动停止状态的实例
aws ec2 start-instances --instance-ids i-1234567890abcdef0
```

---

**基本写法：停止实例**
`aws ec2 stop-instances --instance-ids <实例ID>`
```bash
# 停止实例保留 EBS 卷
aws ec2 stop-instances --instance-ids i-1234567890abcdef0
```

---

**基本写法：终止实例**
`aws ec2 terminate-instances --instance-ids <实例ID>`
```bash
# 永久终止实例并删除 EBS
aws ec2 terminate-instances --instance-ids i-1234567890abcdef0
```

---

**基本写法：重启实例**
`aws ec2 reboot-instances --instance-ids <实例ID>`
```bash
# 重启指定实例
aws ec2 reboot-instances --instance-ids i-1234567890abcdef0
```

---

## 密钥对

**基本写法：创建密钥对**
`aws ec2 create-key-pair --key-name <密钥名> --query 'KeyMaterial' --output text > <文件>`
```bash
# 创建密钥对并保存私钥到本地
aws ec2 create-key-pair --key-name my-new-key --query 'KeyMaterial' --output text > my-new-key.pem
```

---

**基本写法：列出密钥对**
`aws ec2 describe-key-pairs`
```bash
# 查看所有密钥对
aws ec2 describe-key-pairs
```

---

**基本写法：删除密钥对**
`aws ec2 delete-key-pair --key-name <密钥名>`
```bash
# 删除指定密钥对
aws ec2 delete-key-pair --key-name my-old-key
```

---

## 安全组

**基本写法：创建安全组**
`aws ec2 create-security-group --group-name <名称> --description <描述> [--vpc-id <VPC ID>]`
```bash
# 在指定 VPC 中创建安全组
aws ec2 create-security-group --group-name my-sg --description "My security group" --vpc-id vpc-12345
```

---

**基本写法：开放 SSH 端口**
`aws ec2 authorize-security-group-ingress --group-id <安全组ID> --protocol tcp --port 22 --cidr 0.0.0.0/0`
```bash
# 允许任意 IP 访问 22 端口
aws ec2 authorize-security-group-ingress --group-id sg-12345 --protocol tcp --port 22 --cidr 0.0.0.0/0
```

---

**基本写法：开放 HTTP 端口**
`aws ec2 authorize-security-group-ingress --group-id <安全组ID> --protocol tcp --port 80 --cidr 0.0.0.0/0`
```bash
# 允许任意 IP 访问 80 端口
aws ec2 authorize-security-group-ingress --group-id sg-12345 --protocol tcp --port 80 --cidr 0.0.0.0/0
```

---

**基本写法：撤销入站规则**
`aws ec2 revoke-security-group-ingress --group-id <安全组ID> --protocol tcp --port 22 --cidr 0.0.0.0/0`
```bash
# 撤销 SSH 入站规则
aws ec2 revoke-security-group-ingress --group-id sg-12345 --protocol tcp --port 22 --cidr 0.0.0.0/0
```

---

## EBS 卷

**基本写法：列出卷**
`aws ec2 describe-volumes [--filters <过滤器>]`
```bash
# 列出所有 EBS 卷
aws ec2 describe-volumes
```

---

**基本写法：创建卷**
`aws ec2 create-volume --availability-zone <可用区> --size <GB>`
```bash
# 在 us-east-1a 创建 100GB 卷
aws ec2 create-volume --availability-zone us-east-1a --size 100
```

---

**基本写法：附加卷到实例**
`aws ec2 attach-volume --volume-id <卷ID> --instance-id <实例ID> --device <设备名>`
```bash
# 将卷附加为 /dev/sdf
aws ec2 attach-volume --volume-id vol-12345 --instance-id i-1234567890abcdef0 --device /dev/sdf
```

---

**基本写法：创建快照**
`aws ec2 create-snapshot --volume-id <卷ID> [--description <描述>]`
```bash
# 为卷创建快照备份
aws ec2 create-snapshot --volume-id vol-12345 --description "Volume backup"
```

---

## 弹性 IP

**基本写法：分配弹性 IP**
`aws ec2 allocate-address --domain vpc`
```bash
# 在 VPC 中分配弹性 IP
aws ec2 allocate-address --domain vpc
```

---

**基本写法：关联弹性 IP 到实例**
`aws ec2 associate-address --instance-id <实例ID> --allocation-id <分配ID>`
```bash
# 将弹性 IP 绑定到实例
aws ec2 associate-address --instance-id i-1234567890abcdef0 --allocation-id eipalloc-12345
```

---

**基本写法：释放弹性 IP**
`aws ec2 release-address --allocation-id <分配ID>`
```bash
# 释放未使用的弹性 IP
aws ec2 release-address --allocation-id eipalloc-12345
```
