---
order: 280
title: 多云与混合云架构
module: 'cloud-computing'
category: 云与基础设施
difficulty: intermediate
description: '多云与混合云架构：选型动因与代价、VPC 互联（Peering/VPN/专线）、Terraform 多 Provider、统一身份与监控、rclone 跨云数据同步。'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cloud-computing/170-Observability'
  - 'cloud-computing/270-AWSCore'
  - 'cloud-computing/250-LoadBalanceAutoScaling'
  - 'cloud-computing/260-ServerlessArchitecture'
prerequisites:
  - 'cloud-computing/010-CloudComputingBasics'
---

## 1. 多云与混合云：是什么、为什么

### 1.1 两个容易混淆的词

- **混合云（Hybrid Cloud）**：自建数据中心/私有云与**某一个**公有云通过专线或 VPN 打通，
  数据和应用可以两边调度。类比：你家（私有）和出租屋（公有）之间修了一条专用公路。
- **多云（Multi-Cloud）**：同时使用**两个及以上**公有云厂商（如 AWS + 阿里云），各云之间
  往往**不打通**，而是按业务切分——A 业务在甲云、B 业务在乙云。类比：在不同城市各租
  一套办公室，彼此并不连通，靠电话协作。

| 形态       | 连通性       | 典型动机                   | 主要难点           |
| ---------- | ------------ | -------------------------- | ------------------ |
| 单公有云   | -            | 简单、生态完整             | 厂商锁定           |
| 混合云     | 专线/VPN 连通 | 数据主权、存量机房利旧     | 网络与运维复杂     |
| 多云       | 多为业务切分 | 议价能力、避免锁定         | 重复建设、人才成本 |
| 多云+混合  | 部分连通     | 大型企业的常见终态         | 全部以上           |

### 1.2 企业选多云/混合云的真实动机

| 动机           | 说明                                       | 典型例子                     |
| -------------- | ------------------------------------------ | ---------------------------- |
| 合规与数据主权 | 法规要求数据留在境内或特定行业云           | 金融、政务上行业云           |
| 避免厂商锁定   | 关键业务保留第二供应商，谈判时有退路       | 核心数据库双云部署           |
| 容灾           | 单一云的 Region 级故障不再致命             | 主备分属两个云               |
| 成本与议价     | 用两家报价互相制衡，各取优势产品           | GPU 训练在 A 云，CDN 用 B 云 |
| 存量与弹性     | 老机房继续跑稳定负载，突发流量溢出到公有云 | 电商大促弹性扩容             |

### 1.3 必须诚实面对的代价

多云不是免费的午餐，**先想清楚代价再上船**：

- **人力成本翻倍不止**：两套 IAM、两套网络模型、两套账单体系，团队要同时精通；
- **安全面扩大**：跨云凭证管理与网络边界是新的高危区；
- **数据一致性**：跨云复制天然是异步的，一致性约束见《CAP 理论与最终一致性》；
- **互换成本被低估**：托管服务的 API（DynamoDB vs Cosmos DB vs FireStore）并不互通，
  「随时可搬走」往往只对纯 IaaS 部分成立。

> 实践建议：**先问业务问题是什么**。只有「合规/容灾/议价」三者至少中一个时才值得
> 付多云税；单纯「怕被锁定」而做的多云，多数最终退化为「两边各一堆没人敢动的系统」。

## 2. 网络互联：把不同地方的云连起来

### 2.1 三种基本连接方式

```mermaid
flowchart LR
    subgraph 同一云内
        VPA[VPC A] <-->|VPC Peering 点对点| VPB[VPC B]
    end
    subgraph 云到机房
        DC[本地数据中心] <-->|Site-to-Site VPN IPsec| VGW[VPN 网关]
        DC <-.->|专线 DX/ExpressRoute| DXG[专线网关]
    end
```

| 方式                | 带宽与延迟            | 开通周期 | 成本 | 适用                         |
| ------------------- | --------------------- | -------- | ---- | ---------------------------- |
| VPC Peering         | 无带宽瓶颈，内网延迟  | 分钟级   | 低   | 同云内 VPC 互联              |
| Transit Gateway     | 枢纽组网，支持传递    | 小时级   | 中   | 同云多 VPC 的中心化组网      |
| Site-to-Site VPN    | 单隧道约 1.25 Gbps，受公网抖动影响 | 小时级 | 低 | 测试联调、小流量、专线备份 |
| 专线（DX/ExpressRoute/高速通道） | 1-100 Gbps，延迟稳定  | 数天-数周 | 高  | 生产数据库同步、大流量混合云 |

选型经验：**先 VPN 起步验证，流量与 SLA 要求上来后再切专线，专线稳定后 VPN 降级为备份路径**
——两条路径同时发布路由，用 BGP 属性控制主备，专线抖动时自动切换。

### 2.2 跨云互联的现实

云与云之间的「专线」通常不是云厂商直连，而是经第三方骨干（如 Equinix、Megaport）
或同宿主机的托管机房转接；预算有限时，跨云同步走公网 TLS 加密（本文末尾的 rclone
方案）也完全可行，代价是带宽与稳定性受公网影响。

### 2.3 避坑清单

- Peering **不支持传递路由**：A-B、B-C 打通不代表 A-C 可达，超过 3 个 VPC 直接上 Transit Gateway；
- CIDR 冲突是迁移期最常见的坑：两地内网网段规划**上线前必须错开**（如云端统一 10.x，机房 172.16.x）；
- 跨云流量走公网时务必加密并限速，避免拖垮业务带宽或产生巨额出站流量费
  （出站流量计费模型见《云成本优化》）。

## 3. Terraform 多 Provider 管理

多云 IaC 的关键是用 **provider 别名（alias）** 在一份配置里描述多个云，同时**每朵云
独立维护自己的 state**，避免一个后端故障拖垮所有云。

```hcl
# AWS 与阿里云双 Provider 声明
terraform {
  required_version = ">= 1.10"
  required_providers {
    aws        = { source = "hashicorp/aws",        version = "~> 5.0" }
    alicloud   = { source = "aliyun/alicloud",      version = "~> 1.0" }
  }
  # 远程 state：Terraform 1.10+ 推荐 S3 原生锁文件（use_lockfile）
  backend "s3" {
    bucket       = "myapp-tfstate"
    key          = "multicloud/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = "us-east-1"
  alias  = "global"
}

provider "alicloud" {
  region = "cn-hangzhou"
}
```

```hcl
# 资源通过 provider = "别名" 指定落在哪朵云
resource "aws_s3_bucket" "backup" {
  provider = aws.global
  bucket   = "myapp-multicloud-backup"
}

resource "alicloud_oss_bucket" "backup" {
  provider = alicloud
  bucket   = "myapp-multicloud-backup-cn"
}
```

工程建议：

- **state 按云拆分**：`aws/` 与 `alicloud/` 各自独立目录与后端，爆炸半径互不影响；
- **模块只做单云**：不要写「跨云抽象模块」，两朵云的参数模型差异会把模块搅成泥球；
- 同名资源在两朵云部署时，用 `for_each` + 命名约定保证一致性，差异部分显式声明。

## 4. 统一身份与统一监控

### 4.1 跨云身份：OIDC 联合登录

多云下最忌讳的是「每个云一套静态 AccessKey」。现代做法是让企业 IdP（或 CI 系统）
通过 **OIDC** 换取各云的短期临时凭证：

```mermaid
flowchart LR
    DEV[开发者/CI] -->|OIDC 令牌| IDP[企业 IdP]
    IDP -->|联合身份| A1[AWS STS 临时凭证]
    IDP -->|工作负载身份联合| A2[GCP WIF]
    IDP -->|联合登录| A3[Azure Entra ID]
```

各云叫法不同（AWS IAM OIDC Federation、GCP Workload Identity Federation、Azure
Workload Identity），本质一致：**不落盘长期密钥，用短时凭证 + 最小权限角色**。
单云内的权限模型细节见《云安全服务》。

### 4.2 统一监控的两条路线

| 路线             | 做法                                       | 适用                         |
| ---------------- | ------------------------------------------ | ---------------------------- |
| 商业平台收敛     | Datadog/New Relic 等在各云部署采集端       | 预算充足、要开箱即用         |
| 开源自建收敛     | Prometheus 每云一个实例 + Thanos/Mimir 全局聚合，OTel 统一采集 | 已有平台团队 |

无论哪条路线，**告警规则与 Runbook 必须以服务为中心而不是以云为中心**——值班同学
收到告警时不应需要先想「这个服务在哪个云」。

## 5. 数据层：跨云同步与迁移

多云的数据面通常是「一份主数据 + 异步复制副本」。结构化数据走各云数据库的原生复制
或 CDC 工具（对比见《云数据库服务》）；对象存储的跨云同步，`rclone` 是最常用的
瑞士军刀——它支持 S3/Azure Blob/GCS/OSS/COS 等数十种后端，统一命令行操作。

下面的命令手册按「安装 → 配置远程 → 同步 → 校验 → 迁移」组织，示例凭证均为占位符，
生产环境请优先使用各云 IAM 角色（`env_auth = true`）而非明文密钥。

## 小结

- **初学者要点**：多云 = 多个公有云按业务切分，混合云 = 私有机房与公有云专线打通；
  连接方式按「VPN 验证 → 专线生产 → VPN 备份」演进；跨云同步先想清楚 RPO 与出站流量成本。
- **进阶注意**：Peering 不传递路由，超过 3 个 VPC 用 Transit Gateway；Terraform 多云按云
  拆 state，模块不做跨云抽象；身份走 OIDF/WIF 短时凭证，杜绝跨云静态 AK/SK；监控告警
  以服务为中心组织。多云税真实存在——每次新增一朵云前，重新对照第 1.3 节的代价清单。

## 多云工具安装

**基本写法：安装 rclone**
`curl https://rclone.org/install.sh | sudo bash`
```bash
# 安装 rclone 跨云同步工具
curl https://rclone.org/install.sh | sudo bash
```

---

**基本写法：Windows 安装 rclone**
`winget install Rclone.Rclone`
```bash
# Windows 通过 winget 安装
winget install Rclone.Rclone
```

---

**基本写法：查看版本**
`rclone version`
```bash
# 查看 rclone 版本
rclone version
```

---

**基本写法：交互式配置**
`rclone config`
```bash
# 进入交互式配置新增远程存储
rclone config
```

---

**基本写法：查看已配置远程**
`rclone listremotes`
```bash
# 列出所有已配置的远程存储
rclone listremotes
```

---

## 远程存储配置

**基本写法：配置 AWS S3**
```ini
# ~/.config/rclone/rclone.conf 配置 S3
[mys3]
type = s3
provider = AWS
env_auth = false
access_key_id = AKIAIOSFODNN7EXAMPLE
secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
region = us-east-1
endpoint =
location_constraint = us-east-1
```

---

**基本写法：配置 Azure Blob**
```ini
# 配置 Azure Blob Storage
[myazure]
type = azureblob
account = mystorageaccount
key = MyStorageKey1234567890ABCDEF==
endpoint =
```

---

**基本写法：配置 GCS**
```ini
# 配置 Google Cloud Storage
[mygcs]
type = google cloud storage
client_id = your-client-id
client_secret = your-client-secret
project_number = 123456789012
service_account_file = /path/to/key.json
object_acl = private
bucket_acl = private
```

---

**基本写法：配置阿里云 OSS**
```ini
# 配置阿里云 OSS
[myoss]
type = s3
provider = Alibaba
env_auth = false
access_key_id = LTAI4your-access-key
secret_access_key = your-secret-key
endpoint = oss-cn-hangzhou.aliyuncs.com
acl = private
```

---

**基本写法：配置腾讯云 COS**
```ini
# 配置腾讯云 COS
[mycos]
type = s3
provider = TencentCOS
env_auth = false
access_key_id = AKIDyour-access-key
secret_access_key = your-secret-key
endpoint = cos.ap-guangzhou.myqcloud.com
```

---

## 数据同步

**基本写法：同步目录**
`rclone sync <源> <目标> [--progress]`
```bash
# 从 S3 同步到 Azure Blob
rclone sync mys3:my-bucket myazure:my-container --progress
```

---

**基本写法：复制文件**
`rclone copy <源> <目标>`
```bash
# 复制 S3 文件到 GCS(保留原文件)
rclone copy mys3:my-bucket/data mygcs:my-bucket/data --progress
```

---

**基本写法：移动文件**
`rclone move <源> <目标>`
```bash
# 移动文件并删除源(用于迁移)
rclone move mys3:old-bucket myazure:new-container --progress
```

---

**基本写法：增量同步**
`rclone sync <源> <目标> --update --verbose`
```bash
# 仅同步修改过的文件
rclone sync mys3:my-bucket mygcs:my-bucket --update --verbose
```

---

**基本写法：带过滤同步**
`rclone sync <源> <目标> --include <模式> --exclude <模式>`
```bash
# 仅同步 images 目录下的 jpg 文件
rclone sync mys3:my-bucket myazure:my-container \
  --include "images/*.jpg" \
  --exclude "*"
```

---

## 数据查看与校验

**基本写法：列出文件**
`rclone ls <远程>:<路径>`
```bash
# 列出 S3 桶内所有文件
rclone ls mys3:my-bucket
```

---

**基本写法：列出大小**
`rclone lsl <远程>:<路径>`
```bash
# 列出文件含大小和修改时间
rclone lsl mygcs:my-bucket/data
```

---

**基本写法：树形显示**
`rclone tree <远程>:<路径>`
```bash
# 树形结构展示目录
rclone tree mys3:my-bucket
```

---

**基本写法：计算大小**
`rclone size <远程>:<路径>`
```bash
# 计算目录总大小与文件数
rclone size mys3:my-bucket
```

---

**基本写法：校验数据完整性**
`rclone check <源> <目标>`
```bash
# 校验源和目标文件是否一致
rclone check mys3:my-bucket myazure:my-container --download
```

---

**基本写法：对比差异**
`rclone check <源> <目标> --one-way`
```bash
# 仅检查源比目标多的文件
rclone check mys3:my-bucket myazure:my-container --one-way
```

---

## 跨云迁移实战

**基本写法：AWS 到 GCP 迁移**
`rclone sync mys3:source-bucket mygcs:target-bucket --transfers <并发> --checkers <并发>`
```bash
# 高并发迁移大量文件
rclone sync mys3:source-bucket mygcs:target-bucket \
  --transfers 32 \
  --checkers 16 \
  --progress \
  --stats 30s
```

---

**基本写法：Azure 到 AWS 迁移**
`rclone sync myazure:container mys3:bucket --retries <次数>`
```bash
# 带重试机制的迁移
rclone sync myazure:my-container mys3:my-bucket \
  --retries 5 \
  --low-level-retries 10 \
  --progress
```

---

**基本写法：迁移带带宽限制**
`rclone sync <源> <目标> --bwlimit <带宽>`
```bash
# 限制带宽 10MB/s 避免影响业务
rclone sync mys3:my-bucket myazure:my-container \
  --bwlimit 10M \
  --progress
```

---

**基本写法：迁移大型数据集**
`rclone sync <源> <目标> --s3-chunk-size <大小> --s3-upload-concurrency <并发>`
```bash
# 优化大文件迁移
rclone sync mys3:source mygcs:target \
  --s3-chunk-size 256M \
  --s3-upload-concurrency 8 \
  --transfers 16 \
  --progress
```

---

**基本写法：迁移并保留元数据**
`rclone sync <源> <目标> --metadata`
```bash
# 保留所有元数据(ACL、时间戳)
rclone sync mys3:my-bucket myazure:my-container \
  --metadata \
  --progress
```

---

## 数据备份策略

**基本写法：定时备份脚本**
```bash
#!/bin/bash
# daily-backup.sh 每日备份脚本
set -e

DATE=$(date +%Y%m%d)
SOURCE="mys3:production-data"
DEST="myazure:backup/$DATE"

# 执行同步备份
rclone sync $SOURCE $DEST \
  --progress \
  --log-file /var/log/rclone-backup.log \
  --transfers 16

# 删除 30 天前的备份
rclone delete myazure:backup/ --min-age 30d
echo "Backup completed: $DATE"
```

---

**基本写法：使用 systemd timer 调度**
```ini
# /etc/systemd/system/rclone-backup.timer
[Unit]
Description=Daily rclone backup

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

---

**基本写法：服务定义**
```ini
# /etc/systemd/system/rclone-backup.service
[Unit]
Description=Run rclone backup
After=network-online.target

[Service]
Type=oneshot
ExecStart=/opt/scripts/daily-backup.sh
User=backup
```

---

**基本写法：加密备份**
`rclone sync <源> <加密目标> --crypt-remote <远程> --crypt-directory-name <目录>`
```ini
# rclone.conf 配置加密远程
[backup-encrypted]
type = crypt
remote = myazure:encrypted-backup
filename_encryption = standard
directory_name_encryption = true
password = MyEncryptedPassword123
password2 = MySaltForEncryption123
```

---

**基本写法：解密恢复**
`rclone copy <加密远程>:<路径> <本地路径>`
```bash
# 从加密备份恢复数据
rclone copy backup-encrypted:2026-07-31 /tmp/restored --progress
```

---

## Velero 跨云 K8s 迁移

**基本写法：安装 Velero**
`velero install --provider <提供者> --bucket <桶> --secret-file <凭证文件>`
```bash
# 安装 Velero 备份工具
velero install \
  --provider aws \
  --bucket velero-backups \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --secret-file credentials-velero
```

---

**基本写法：创建备份**
`velero backup create <备份名> [--include-namespaces <命名空间>]`
```bash
# 备份指定命名空间
velero backup create my-backup --include-namespaces production
```

---

**基本写法：查看备份状态**
`velero backup describe <备份名>`
```bash
# 查看备份详情
velero backup describe my-backup --details
```

---

**基本写法：从备份恢复**
`velero restore create --from-backup <备份名>`
```bash
# 在目标集群恢复备份
velero restore create --from-backup my-backup
```

---

**基本写法：跨集群迁移**
```bash
# 源集群:创建备份到对象存储
velero backup create cluster-migration --include-cluster-resources=true

# 目标集群:配置相同的备份位置后恢复
velero restore create --from-backup cluster-migration
```

---

## 跨云镜像迁移

**基本写法：拉取镜像**
`docker pull <源镜像>`
```bash
# 拉取 Docker Hub 镜像
docker pull nginx:1.25
```

---

**基本写法：打标签到目标仓库**
`docker tag <源镜像> <目标仓库>/<镜像>:<标签>`
```bash
# 为推送到 ECR 准备标签
docker tag nginx:1.25 123456789012.dkr.ecr.us-east-1.amazonaws.com/nginx:1.25
```

---

**基本写法：推送镜像**
`docker push <目标仓库>/<镜像>:<标签>`
```bash
# 推送到 AWS ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/nginx:1.25
```

---

**基本写法：使用 skopeo 跨仓库复制**
`skopeo copy docker://<源> docker://<目标>`
```bash
# 直接在仓库间复制镜像(无需本地拉取)
skopeo copy \
  docker://docker.io/nginx:1.25 \
  docker://123456789012.dkr.ecr.us-east-1.amazonaws.com/nginx:1.25
```

---

**基本写法：跨云批量迁移镜像**
```bash
#!/bin/bash
# migrate-images.sh 批量迁移镜像
IMAGES=(
  "nginx:1.25"
  "redis:7.2"
  "postgres:16"
)
SOURCE="docker.io"
TARGET="123456789012.dkr.ecr.us-east-1.amazonaws.com"

for img in "${IMAGES[@]}"; do
  echo "Migrating $img..."
  skopeo copy \
    docker://$SOURCE/$img \
    docker://$TARGET/$img \
    --dest-creds AWS:$(aws ecr get-login-password)
done
```

---

## 跨云数据库迁移

**基本写法：AWS DMS 创建复制实例**
`aws dms create-replication-instance --replication-instance-identifier <ID> --replication-instance-class <类>`
```bash
# 创建 DMS 复制实例
aws dms create-replication-instance \
  --replication-instance-identifier my-dms \
  --replication-instance-class dms.r5.large \
  --allocated-storage 100
```

---

**基本写法：创建端点**
`aws dms create-endpoint --endpoint-identifier <ID> --endpoint-type <类型> --engine-name <引擎> --server-name <服务器> --port <端口>`
```bash
# 创建源端 PostgreSQL 端点
aws dms create-endpoint \
  --endpoint-identifier source-pg \
  --endpoint-type source \
  --engine-name postgres \
  --server-name pg.source.com \
  --port 5432 \
  --database-name mydb \
  --username admin \
  --password 'Pass123!'
```

---

**基本写法：创建迁移任务**
`aws dms create-replication-task --replication-task-identifier <ID> --source-endpoint-arn <源> --target-endpoint-arn <目标> --replication-instance-arn <实例> --migration-type <类型>`
```bash
# 创建全量+CDC 迁移任务
aws dms create-replication-task \
  --replication-task-identifier my-migration \
  --source-endpoint-arn arn:aws:dms:us-east-1:123456789012:endpoint:ABC \
  --target-endpoint-arn arn:aws:dms:us-east-1:123456789012:endpoint:DEF \
  --replication-instance-arn arn:aws:dms:us-east-1:123456789012:rep:GHI \
  --migration-type full-load-and-cdc \
  --table-mappings file://mappings.json
```

---

**基本写法：启动迁移任务**
`aws dms start-replication-task --replication-task-arn <ARN> --start-replication-task-type start-replication`
```bash
# 启动数据库迁移任务
aws dms start-replication-task \
  --replication-task-arn arn:aws:dms:us-east-1:123456789012:task:XYZ \
  --start-replication-task-type start-replication
```

---

**基本写法：查看任务状态**
`aws dms describe-replication-tasks`
```bash
# 查看所有迁移任务
aws dms describe-replication-tasks
```

---

## 跨云 IaC 工具

**基本写法：Terraform 多云 provider 配置**
```hcl
# 多云部署的 Terraform 配置
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

provider "azurerm" {
  features {}
}

provider "google" {
  project = "my-project-123"
  region  = "us-central1"
}
```

---

**基本写法：跨云相同资源定义**
```hcl
# 在三云创建相同规格的虚拟机
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  tags = { Name = "web-server" }
}

resource "azurerm_linux_virtual_machine" "web" {
  name                = "web-server"
  resource_group_name = azurerm_resource_group.main.name
  location            = "East US"
  size                = "Standard_B1s"
  admin_username      = "adminuser"
}

resource "google_compute_instance" "web" {
  name         = "web-server"
  machine_type = "e2-medium"
  zone         = "us-central1-a"
}
```

---

**基本写法：使用 Terragrunt 多环境管理**
```hcl
# env/prod/terragrunt.hcl
terraform {
  source = "../../modules/web-server"
}

inputs = {
  instance_count = 5
  instance_type  = "t3.large"
  environment    = "production"
}
```

---

**基本写法：跨云状态后端**
```hcl
# 使用 HCP Terraform Cloud 作为统一后端
terraform {
  cloud {
    organization = "my-org"
    workspaces {
      name = "multi-cloud-prod"
    }
  }
}
```

---

## 监控与告警

**基本写法：rclone 同步状态检查脚本**
```bash
#!/bin/bash
# check-sync.sh 检查同步状态
LOG_FILE="/var/log/rclone-backup.log"
ERROR_COUNT=$(grep -c "ERROR" $LOG_FILE)
SUCCESS_COUNT=$(grep -c "Sync successful" $LOG_FILE)

if [ $ERROR_COUNT -gt 0 ]; then
  echo "WARNING: $ERROR_COUNT errors found in last sync"
  exit 1
fi
echo "OK: Last sync completed successfully"
```

---

**基本写法：跨云成本对比**
```bash
# 使用 Infracost 估算多云成本
infracost breakdown --path . --format json > costs.json
# 查看各云资源成本
jq '.projects[].breakdown.resources[] | {address, monthlyCost}' costs.json
```

---

**基本写法：Cloud Custodian 多云策略**
```yaml
# custodian.yml 多云资源策略
policies:
  - name: aws-unused-eips
    resource: aws.elastic-ip
    filters:
      - AssociationId: absent
    actions:
      - delete
  - name: azure-unattached-disks
    resource: azure.disk
    filters:
      - type: value
        key: managedBy
        value: null
    actions:
      - type: delete
```

---

**基本写法：运行 Custodian**
`custodian run -s <输出> <策略文件>`
```bash
# 执行多云合规策略
custodian run -s output custodian.yml
```
