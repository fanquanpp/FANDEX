---
order: 210
title: Terraform 资源编排
module: 'devops'
category: 云与基础设施
difficulty: intermediate
description: Terraform 基础设施即代码：Provider、Resource、State、Module 与工作流。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'devops/200-IaC'
  - 'devops/090-KubernetesCoreDetailed'
  - 'devops/220-AnsiblePlaybookConfigManagement'
prerequisites:
  - 'devops/200-IaC'
---

## 0. 一句话理解

> Terraform 用声明式语言 HCL 描述"我想要哪些云资源"（VPC、虚拟机、K8s 集群……），
> 引擎自己算出创建/修改/删除的执行计划：**写意图，不写步骤**。
> 它管理"资源从无到有"，与 Ansible（管理"已存在机器上的配置"）互补而非竞争。

## 1. 核心概念

| 概念 | 是什么 | 类比 |
| :--- | :--- | :--- |
| Provider | 云厂商插件（AWS/Azure/GCP/阿里云/K8s） | 各国电源插座转换头 |
| Resource | 一个被管理的基础设施资源 | 采购清单上的一行 |
| Data Source | 读取已有资源（不创建） | 查询而不是下单 |
| State | Terraform 记住的"现实世界账本" | 账本丢了就得对不清账 |
| Plan / Apply | 预览差异 / 执行差异 | 施工图纸 / 开工 |

### 1.1 HCL 最小示例

```hcl
# main.tf：在阿里云创建一台 ECS（自包含示例）
terraform {
  required_version = ">= 1.10"
  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = "~> 1.235"
    }
  }
}

provider "alicloud" {
  region = "cn-hangzhou"
}

resource "alicloud_instance" "web" {
  instance_name        = "web-${var.environment}"
  instance_type        = "ecs.c7.xlarge"
  image_id             = "aliyun_3_x64_20G_alibase_20240528.vhd"
  security_groups      = [alicloud_security_group.sg.id] # 资源间引用自动推导依赖
  vswitch_id           = var.vswitch_id
  system_disk_category = "cloud_essd"
}

variable "environment" {
  description = "部署环境标识"
  type        = string
}

output "public_ip" {
  value = alicloud_instance.web.public_ip
}
```

关键点：`resource A` 引用 `resource B` 的属性时，Terraform 自动构建依赖图，
无需（也不应轻易）手写 `depends_on`。

## 2. State：最重要的概念

### 2.1 State 存什么、为什么危险

State 记录"我管理的每个资源与云上真实 ID 的映射 + 资源属性快照"。

1. **包含敏感信息**：数据库密码等会以明文进入 state——必须加密存储、不进 Git。
2. **单人/单进程写**：两人同时 apply 会互相覆盖——必须远程后端 + 锁。
3. **丢了很麻烦**：`terraform plan` 会把一切视为"新建"，可能重复创建资源。

### 2.2 远程后端与锁（1.10+ 原生锁）

```hcl
terraform {
  backend "s3" {
    bucket       = "tfstate-prod"
    key          = "prod/network.tfstate"
    region       = "ap-northeast-1"
    use_lockfile = true # Terraform 1.10+：S3 原生条件写锁，DynamoDB 不再必需
    encrypt      = true
  }
}
```

### 2.3 常用 state 命令

```bash
terraform state list                      # 我管了哪些资源
terraform state show alicloud_instance.web # 查看某资源属性
terraform state rm alicloud_instance.web   # 解除管理（不删云上资源）
terraform import alicloud_instance.web i-xxx123 # 收编手工创建的资源
```

提示：1.5+ 推荐用配置驱动的 `import` 块（import 进代码、可评审）替代命令行 import；
1.7+ 的 `moved` 块用于重命名/迁移资源而不用销毁重建。

## 3. 工作流：init → validate → plan → apply

```bash
terraform init        # 下载 provider、初始化后端（换后端/升级 provider 后重跑）
terraform fmt -recursive # 格式化（进 CI）
terraform validate    # 语法与引用校验
terraform plan -out=tfplan   # 预览并落盘计划
terraform apply tfplan       # 执行已评审的计划（避免"计划与执行不一致"）
terraform destroy     # 销毁整套资源（生产慎用，务必有锁与审批）
```

```text
plan 输出符号含义：
  + create   创建
  - destroy  销毁
  ~ update   就地更新
  -/+ replace 先销毁再重建（红色告警：有状态资源会丢数据！）
```

**replace 是最大事故来源**：很多属性（如实例规格、子网 ID）修改只能重建。
生产工作流必须逐行评审 plan，对 `-/+` 行追查 `prevent_destroy` 生命周期保护：

```hcl
resource "alicloud_db_instance" "main" {
  # ...
  lifecycle {
    prevent_destroy = true # 阻止任何导致数据库销毁的计划
  }
}
```

## 4. Variable / Output / Module

### 4.1 变量与校验

```hcl
variable "environment" {
  description = "环境名"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment 只允许 dev/staging/prod。"
  }
}
```

多环境参数用 `terraform.tfvars` 或 `-var-file=prod.tfvars` 提供；
敏感值用环境变量 `TF_VAR_db_password` 或密钥管理服务注入，**绝不写进代码**。

### 4.2 Module：复用的单位

```text
environments/
├── dev/main.tf, prod.tfvars
modules/
└── network/
    ├── main.tf       # 资源定义
    ├── variables.tf  # 输入
    └── outputs.tf    # 输出
```

```hcl
# environments/prod/main.tf
module "network" {
  source    = "../../modules/network"
  cidr_block = "10.0.0.0/16"
  environment = "prod"
}

output "vpc_id" {
  value = module.network.vpc_id
}
```

原则：模块用远程 source（Git tag）固定版本；官方 registry 的成熟模块
（如 terraform-aws-modules）优先于自研造轮子。

## 5. 团队协作与 CI/CD

| 实践 | 说明 |
| :--- | :--- |
| PR 中贴 plan 输出 | 变更评审的核心材料 |
| plan/apply 分离 | CI 生成 plan，人工批准后同一份 plan 被 apply |
| 目录/工作区隔离环境 | dev/prod 分 state 分权限，杜绝误伤 |
| 策略即代码 | Conftest/Sentinel 对 plan 做 OPA 策略检查 |
| 漂移检测 | 定期 `terraform plan -detailed-exitcode` 发现手工改动 |

```yaml
# GitHub Actions 最小流水线（骨架）
jobs:
  plan:
    runs-on: ubuntu-latest
    permissions: { id-token: write, contents: read } # OIDC 免长期密钥
    steps:
      - uses: actions/checkout@v6
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init
      - run: terraform plan -out=tfplan
      - uses: actions/upload-artifact@v4
        with: { name: tfplan, path: tfplan }
  apply:
    needs: plan
    environment: production # 配合 GitHub 环境审批
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - run: terraform apply tfplan
```

## 6. 常见陷阱

| 陷阱 | 后果 | 对策 |
| :--- | :--- | :--- |
| state 进 Git | 泄漏敏感信息 | 远程后端 + 加密 |
| 无锁并行 apply | state 损坏/资源重复 | `use_lockfile`/后端锁 |
| 忽视 plan 中 `-/+` | 数据库被销毁重建 | `prevent_destroy` + 评审 |
| 手工改控制台 | 配置漂移 | 漂移检测 + 制度约束 |
| 单个根模块管理全部资源 | plan 巨慢、爆炸半径大 | 按层/域拆分目录与 state |
| provider 版本不固定 | 升级引入破坏性变更 | `~>` 约束 + 锁定 lock 文件 |

## 7. 动手试试

1. 用 `local` 后端 + Docker provider（`kreuzwerker/docker`）本地体验 plan/apply 全流程，
   零云成本。
2. 故意在控制台改一个资源属性，再跑 `terraform plan`，观察漂移如何被表达。
3. 把第 1.1 节示例改造成 `modules/` 结构，用两个 tfvars 部署 dev 与 prod。

## 8. 小结

**初学者要点**

1. Terraform 管声明式资源编排：Provider 是插件，State 是账本，Plan 是安全带。
2. 永远先 plan 后 apply；`-/+`（replace）行必须逐个确认。
3. State 必须远程化、加锁、加密——这是团队化的第一前提。

**进阶注意**

1. 1.7+ 的 moved 块与配置驱动 import 让重构不再"销毁重建"。
2. 1.10+ 临时资源/可变写参数让密钥可以全程不落 state。
3. 许可证为 BUSL：合规敏感场景可评估开源协议的 OpenTofu（示例语法基本通用）。
4. 按域拆分根模块与 state，配 CI 策略检查，才能支撑多团队规模。
