---
order: 2
title: 云网络与存储
module: 'cloud-computing'
category: 云计算
difficulty: intermediate
description: 'VPC 虚拟私有云、子网规划、安全组配置、NAT 网关、弹性计算服务、镜像管理、块存储与对象存储、CDN 加速。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cloud-computing/云计算基础'
  - 'cloud-computing/容器与编排'
  - 'cloud-computing/基础设施即代码'
prerequisites: []
---

## 1. VPC 虚拟私有云

### 1.1 VPC 概述

VPC（Virtual Private Cloud）是在公有云上创建的**逻辑隔离的虚拟网络**，用户可自定义网络拓扑、IP 地址范围、路由表和网关。

### 1.2 VPC 核心组件

```
┌────────────────────────────────────────────────────────────┐
│                         VPC 10.0.0.0/16                    │
│  ┌──────────────────────┐  ┌──────────────────────────────┐│
│  │  公有子网 10.0.1.0/24 │  │  私有子网 10.0.2.0/24       ││
│  │  ┌──────┐ ┌──────┐   │  │  ┌──────┐ ┌──────┐         ││
│  │  │ ALB  │ │ NAT  │   │  │  │ App  │ │ DB   │         ││
│  │  │      │ │ GW   │   │  │  │      │ │      │         ││
│  │  └──────┘ └──────┘   │  │  └──────┘ └──────┘         ││
│  └──────────┬───────────┘  └──────────────────────────────┘│
│             │                                              │
└─────────────┼──────────────────────────────────────────────┘
              │
         Internet GW
              │
         ────────── Internet
```

| 组件            | 说明                             |
| :-------------- | :------------------------------- |
| **VPC**         | 虚拟网络容器，定义 CIDR 地址范围 |
| **子网**        | VPC 内的网段，关联可用区         |
| **Internet GW** | 互联网网关，提供公网访问         |
| **NAT GW**      | NAT 网关，私有子网访问公网       |
| **路由表**      | 控制网络流量走向                 |
| **安全组**      | 实例级防火墙，控制入站出站规则   |
| **NACL**        | 子网级无状态防火墙               |

### 1.3 子网规划

```python
# 子网规划示例
subnet_planning = {
    "vpc_cidr": "10.0.0.0/16",       # 65536 个地址
    "subnets": {
        # 公有子网 - 面向互联网
        "public-web-a": {
            "cidr": "10.0.1.0/24",    # 256 个地址
            "az": "us-east-1a",
            "type": "public",
            "purpose": "负载均衡、NAT网关"
        },
        "public-web-b": {
            "cidr": "10.0.2.0/24",
            "az": "us-east-1b",
            "type": "public",
            "purpose": "负载均衡、NAT网关"
        },
        # 私有子网 - 应用层
        "private-app-a": {
            "cidr": "10.0.10.0/24",
            "az": "us-east-1a",
            "type": "private",
            "purpose": "应用服务器"
        },
        "private-app-b": {
            "cidr": "10.0.11.0/24",
            "az": "us-east-1b",
            "type": "private",
            "purpose": "应用服务器"
        },
        # 私有子网 - 数据层
        "private-db-a": {
            "cidr": "10.0.20.0/24",
            "az": "us-east-1a",
            "type": "private",
            "purpose": "数据库"
        },
        "private-db-b": {
            "cidr": "10.0.21.0/24",
            "az": "us-east-1b",
            "type": "private",
            "purpose": "数据库"
        }
    }
}
```

### 1.4 路由表配置

| 路由表         | 目标        | 下一跳  | 说明         |
| :------------- | :---------- | :------ | :----------- |
| **公有路由表** | 10.0.0.0/16 | local   | VPC 内部通信 |
|                | 0.0.0.0/0   | igw-xxx | 互联网网关   |
| **私有路由表** | 10.0.0.0/16 | local   | VPC 内部通信 |
|                | 0.0.0.0/0   | nat-xxx | NAT 网关     |

## 2. 安全组配置

### 2.1 安全组规则

```json5
// 安全组规则示例 - Web 服务器
{
  SecurityGroupId: 'sg-web',
  Rules: {
    Inbound: [
      {
        Protocol: 'TCP',
        Port: 443,
        Source: '0.0.0.0/0',
        Description: 'HTTPS 入站',
      },
      {
        Protocol: 'TCP',
        Port: 80,
        Source: '0.0.0.0/0',
        Description: 'HTTP 入站（重定向到 HTTPS）',
      },
      {
        Protocol: 'TCP',
        Port: 22,
        Source: '10.0.1.0/24',
        Description: 'SSH 仅限堡垒机子网',
      },
    ],
    Outbound: [
      {
        Protocol: 'TCP',
        Port: 443,
        Destination: '0.0.0.0/0',
        Description: 'HTTPS 出站（API 调用）',
      },
      {
        Protocol: 'TCP',
        Port: 3306,
        Destination: 'sg-db',
        Description: '访问数据库安全组',
      },
    ],
  },
}
```

### 2.2 安全组最佳实践

| 原则               | 说明                              |
| :----------------- | :-------------------------------- |
| **最小权限**       | 仅开放必要的端口和来源            |
| **安全组引用**     | 安全组之间引用而非 IP 段          |
| **分层设计**       | Web → App → DB 各层独立安全组     |
| **禁止 0.0.0.0/0** | 管理端口（SSH/RDP）不应对公网开放 |
| **默认拒绝**       | 出站规则也应限制                  |

### 2.3 安全组分层架构

```
Internet → [ALB 安全组: 80/443] → [Web 安全组: 仅 ALB] → [App 安全组: 仅 Web] → [DB 安全组: 仅 App]
```

## 3. NAT 网关

### 3.1 NAT 网关作用

私有子网中的实例需要访问公网（如下载补丁、调用外部 API），但不允许公网主动访问这些实例。NAT 网关提供**出站公网访问能力**。

### 3.2 NAT 网关配置

```bash
# AWS 创建 NAT 网关
aws ec2 create-nat-gateway \
  --subnet-id subnet-public-a \
  --allocation-id eipalloc-xxx \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=nat-gw-a}]'

# 更新私有子网路由表
aws ec2 create-route \
  --route-table-id rtb-private-a \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id nat-xxx
```

## 4. 弹性计算服务

### 4.1 实例类型选型

| 类型         | 特点         | 适用场景               | AWS 类型 | 阿里云类型 |
| :----------- | :----------- | :--------------------- | :------- | :--------- |
| **通用型**   | CPU/内存均衡 | Web 服务器、中小数据库 | M6i      | g7         |
| **计算优化** | 高 CPU       | 批处理、科学计算       | C6i      | c7         |
| **内存优化** | 大内存       | 数据库、缓存           | R6i      | r7         |
| **存储优化** | 高 I/O       | 数据仓库、日志处理     | I4i      | i3         |
| **GPU 型**   | GPU 加速     | AI 训练、渲染          | P5       | gn7        |

### 4.2 实例生命周期

```
启动中 → 运行中 → 停止 → 停止中 → 运行中
  ↓                    ↓
  └──→ 终止（数据丢失）──┘
```

| 状态           | 计费   | 说明               |
| :------------- | :----- | :----------------- |
| **pending**    | 计费   | 正在启动           |
| **running**    | 计费   | 正在运行           |
| **stopping**   | 计费   | 正在停止           |
| **stopped**    | 不计费 | 已停止（EBS 保留） |
| **terminated** | 不计费 | 已终止（不可恢复） |

### 4.3 User Data 启动脚本

```bash
#!/bin/bash
# EC2 User Data - 实例启动时自动执行

# 更新系统
yum update -y

# 安装 Docker
amazon-linux-extras install docker -y
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

# 拉取并运行应用
docker pull myapp:latest
docker run -d -p 8080:8080 \
  -e DB_HOST=${DB_HOST} \
  -e DB_PASSWORD=${DB_PASSWORD} \
  --restart=always \
  myapp:latest

# 注册到负载均衡
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --targets Id=$(ec2-metadata --instance-id | cut -d' ' -f2)
```

## 5. 镜像管理

### 5.1 镜像类型

| 类型           | 说明                     | 适用         |
| :------------- | :----------------------- | :----------- |
| **公共镜像**   | 云商提供的官方镜像       | 标准化部署   |
| **自定义镜像** | 基于实例创建的私有镜像   | 快速复制环境 |
| **共享镜像**   | 其他账号共享的镜像       | 跨账号协作   |
| **市场镜像**   | 第三方发布的预装软件镜像 | 快速搭建     |

### 5.2 镜像构建最佳实践

```dockerfile
# 构建应用镜像
FROM python:3.12-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 多阶段构建 - 减小镜像体积
FROM python:3.12-slim

WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /app .

EXPOSE 8080
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8080", "app:app"]
```

### 5.3 镜像生命周期

```bash
# 创建自定义镜像
aws ec2 create-image \
  --instance-id i-xxx \
  --name "myapp-v2.3.1" \
  --description "Application image v2.3.1" \
  --no-reboot

# 跨区域复制镜像
aws ec2 copy-image \
  --source-region us-east-1 \
  --source-image-id ami-xxx \
  --region us-west-2 \
  --name "myapp-v2.3.1-west"

# 共享镜像给其他账号
aws ec2 modify-image-attribute \
  --image-id ami-xxx \
  --launch-permission "Add=[{UserId=123456789012}]"
```

## 6. 块存储服务

### 6.1 存储类型

| 类型           | IOPS   | 吞吐量    | 适用场景         | AWS 类型 |
| :------------- | :----- | :-------- | :--------------- | :------- |
| **标准 HDD**   | ~500   | ~90 MB/s  | 冷数据、日志     | st1      |
| **通用 SSD**   | 16,000 | 250 MB/s  | 系统盘、通用应用 | gp3      |
| **高性能 SSD** | 64,000 | 1000 MB/s | 数据库、高 I/O   | io2      |

### 6.2 EBS 卷操作

```bash
# 创建 EBS 卷
aws ec2 create-volume \
  --availability-zone us-east-1a \
  --size 100 \
  --volume-type gp3 \
  --iops 3000 \
  --throughput 125

# 附加到实例
aws ec2 attach-volume \
  --volume-id vol-xxx \
  --instance-id i-xxx \
  --device /dev/sdf

# 创建快照
aws ec2 create-snapshot \
  --volume-id vol-xxx \
  --description "Daily backup"

# 从快照恢复
aws ec2 create-volume \
  --snapshot-id snap-xxx \
  --availability-zone us-east-1a
```

### 6.3 快照策略

```bash
# 创建快照生命周期策略
aws dlm create-lifecycle-policy \
  --execution-role-arn arn:aws:iam::xxx:role/DLMRole \
  --description "Daily EBS backup" \
  --state ENABLED \
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

## 7. 对象存储服务

### 7.1 对象存储概述

| 特性          | 说明                     |
| :------------ | :----------------------- |
| **无限容量**  | 存储空间无上限           |
| **高可用**    | 99.999999999% 数据持久性 |
| **HTTP 访问** | 通过 RESTful API 读写    |
| **分层存储**  | 标准/低频/归档/冷归档    |

### 7.2 存储类型对比

| 存储类型   | 访问频率 | 存储成本 | 访问成本 | 最短存储时间 |
| :--------- | :------- | :------- | :------- | :----------- |
| **标准**   | 频繁     | 高       | 低       | 无           |
| **低频**   | 不频繁   | 中       | 中       | 30 天        |
| **归档**   | 极少     | 低       | 高       | 60 天        |
| **冷归档** | 极少     | 最低     | 最高     | 90 天        |

### 7.3 S3 基本操作

```python
import boto3

s3 = boto3.client('s3')

# 创建存储桶
s3.create_bucket(
    Bucket='my-app-bucket',
    CreateBucketConfiguration={'LocationConstraint': 'us-east-1'}
)

# 上传文件
s3.upload_file(
    'local_file.pdf',
    'my-app-bucket',
    'documents/report.pdf',
    ExtraArgs={
        'ContentType': 'application/pdf',
        'Metadata': {'author': 'fanquanpp'}
    }
)

# 下载文件
s3.download_file('my-app-bucket', 'documents/report.pdf', '/tmp/report.pdf')

# 列出对象
response = s3.list_objects_v2(Bucket='my-app-bucket', Prefix='documents/')
for obj in response.get('Contents', []):
    print(f"{obj['Key']} - {obj['Size']} bytes - {obj['LastModified']}")

# 生成预签名 URL（临时访问）
url = s3.generate_presigned_url(
    'get_object',
    Params={'Bucket': 'my-app-bucket', 'Key': 'documents/report.pdf'},
    ExpiresIn=3600  # 1小时有效
)
```

### 7.4 生命周期管理

```json5
// S3 生命周期规则
{
  Rules: [
    {
      ID: 'ArchiveOldLogs',
      Status: 'Enabled',
      Filter: { Prefix: 'logs/' },
      Transitions: [
        {
          Days: 30,
          StorageClass: 'STANDARD_IA', // 30天后转低频
        },
        {
          Days: 90,
          StorageClass: 'GLACIER', // 90天后转归档
        },
      ],
      Expiration: {
        Days: 365, // 365天后删除
      },
    },
  ],
}
```

## 8. CDN 加速

### 8.1 CDN 工作原理

```
用户请求 → 边缘节点（命中缓存）→ 返回内容
              ↓（未命中）
           回源到源站 → 缓存到边缘 → 返回内容
```

### 8.2 CDN 配置

```bash
# 阿里云 CDN 配置
aliyun cdn AddCdnDomain \
  --DomainName cdn.example.com \
  --CdnType web \
  --Sources '[{"Content":"oss.example.com","Type":"oss","Priority":20}]'

# 缓存规则
# .html  → 缓存 10 分钟
# .jpg/.png → 缓存 30 天
# .css/.js  → 缓存 7 天
# /api/*    → 不缓存
```

### 8.3 CDN 缓存策略

| 资源类型      | 缓存时间 | 说明             |
| :------------ | :------- | :--------------- |
| **静态资源**  | 30 天    | 图片、CSS、JS    |
| **HTML 页面** | 10 分钟  | 页面更新频率较高 |
| **API 响应**  | 不缓存   | 动态数据         |
| **视频文件**  | 90 天    | 大文件长期缓存   |

### 8.4 CDN 性能优化

| 优化项         | 方法                           |
| :------------- | :----------------------------- |
| **缓存命中率** | 合理设置缓存规则和过期时间     |
| **回源优化**   | 回源跟随 301/302、回源超时配置 |
| **压缩**       | Gzip/Brotli 压缩传输           |
| **HTTPS**      | 全链路 HTTPS 加密              |
| **智能路由**   | 就近接入、智能 DNS 解析        |
