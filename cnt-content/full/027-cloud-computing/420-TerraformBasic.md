---
order: 420
title: Terraform 基础
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'Terraform 声明式 IaC 入门：HCL 语法、plan/apply 工作流、变量传递、模块复用与许可现状。'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cloud-computing/410-IaC'
  - 'cloud-computing/430-TerraformStateModule'
  - 'cloud-computing/530-PulumiCommands'
prerequisites:
  - 'cloud-computing/410-IaC'
---

## 前置知识与学习目标

Terraform 是 HashiCorp 出品的基础设施即代码（IaC）工具：你用 HCL 语言描述
「想要的资源长什么样」，Terraform 负责算出从现状到目标的步骤并执行。
类比：传统运维像「口头点菜」，Terraform 像「把菜谱存档」——每次改动都
先出预览（plan），可审查、可回滚、可复制到另一个环境。

背景事实（选型前须知）：2023 年 Terraform 许可证由 MPL 改为 BSL（BUSL），
社区据此分叉出 MPL 许可的 OpenTofu（CLI 兼容，命令基本一致）；撰写时
Terraform 稳定版为 1.1x 系列。本文示例对两者均适用。

学完本文你应当能够：写出包含 provider/variable/resource/output 的最小
配置；按 `init -> plan -> apply` 工作流安全地创建与销毁资源；用变量文件
区分环境；用模块复用配置。

## 1. 第一个可运行配置

```hcl
# main.tf —— 声明提供商：版本约束 + 区域
terraform {
  required_version = ">= 1.6"        # 锁定 Terraform 自身最低版本
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"             # 允许 5.x 内升级，禁止跨大版本
    }
  }
}

provider "aws" {
  region = "cn-north-1"
}

# 定义可由外部传入的变量（带描述与校验是好习惯）
variable "instance_type" {
  type    = string
  default = "t3.micro"
}

# 定义资源：AWS 上的 EC2 实例
resource "aws_instance" "example" {
  ami           = "ami-0abcdef1234567890"   # 示例 ID，请换成你区域的最新 AMI
  instance_type = var.instance_type         # 引用变量

  tags = {
    Name        = "tf-example"
    ManagedIron = "terraform"              # 标记资源归属，便于成本分摊
  }
}

# 输出资源属性：apply 后展示，也可被其他配置/模块引用
output "instance_id" {
  value = aws_instance.example.id
}
```

四类块的记忆口诀：`terraform` 管「工具链约束」、`provider` 管「连哪个云」、
`variable`/`output` 管「输入与出口」、`resource`/`data` 管「要什么与查什么」
（`data` 块查询已存在的资源，如最新的 AMI，见 `410-IaC`）。

## 2. 核心工作流：init -> plan -> apply

```bash
# 1. 初始化：下载 provider 插件、配置后端（首次必跑，换 provider 版本再跑）
terraform init
# 预期输出：
# Terraform has been successfully initialized!

# 升级 provider/模块到约束允许的最新版本
terraform init -upgrade

# 2. 预览：Terraform 计算差异但不执行，务必逐行阅读 + / - / ~ 符号
terraform plan
# 预期输出末尾：
# Plan: 1 to add, 0 to change, 0 to destroy.

# 3. 应用：真实创建资源（默认要求手动输入 yes 确认）
terraform apply
# 预期输出末尾：
# Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
# Outputs:
# instance_id = "i-0123456789abcdef0"
```

`plan` 输出里的符号就是「变更语言」：`+` 创建、`-` 销毁、`-/+` 先删后建
（大部分属性变更会导致替换，注意停机）、`~` 原地更新。看到意外出现的
`-` 就要停下来查原因。

```bash
# CI/CD 场景：免交互应用（生产慎用，建议改为 plan 人工审 + apply）
terraform apply -auto-approve

# 更稳妥的两段式：先保存计划文件，再精确应用「这份计划」
terraform plan -out=tf.tfplan
terraform apply tf.tfplan     # 应用的一定是刚才审过的那份，不会中途漂移

# 销毁全部资源（同样有 yes 确认）
terraform destroy

# 只销毁/重建指定资源（调试用，target 滥用会造成状态与配置脱节）
terraform destroy -target=aws_instance.example
```

## 3. 变量传递：命令行、文件与默认值

```bash
# 命令行单变量
terraform plan -var "instance_type=t3.small"

# 变量文件：prod.tfvars（键值对），命名环境变体
terraform plan -var-file=prod.tfvars
# terraform.tfvars 是默认自动加载的文件名，无需 -var-file

# 查看输出值；-json 便于脚本解析
terraform output
terraform output -json
# 预期输出（json）：
# {"instance_id": {"sensitive": false, "type": "string", "value": "i-0123..."}}
```

优先级（从高到低）：`-var` > `*.auto.tfvars` 与 `-var-file` >
`terraform.tfvars` > 环境变量 `TF_VAR_name` > 变量默认值。敏感值（数据库
密码等）走 `TF_VAR_` 环境变量或密钥管理服务，绝不写进 tfvars 提交仓库。

## 4. 验证与格式化：进 CI 的第一步

```bash
# 语法与类型校验（不连云，速度快，适合 pre-commit）
terraform validate

# 格式化为官方风格（对齐等号、规范缩进）
terraform fmt -recursive

# CI 检查模式：有文件不规范则退出码 1，不修改
terraform fmt -check -recursive
```

## 5. 模块复用

模块是「带输入输出的配置目录」，是 Terraform 工程化的核心。来源可以是
本地目录、Git 仓库或官方 Registry：

```hcl
# 复用本地子目录模块：传参 cidr，取回输出 vpc_id
module "vpc" {
  source = "./modules/vpc"
  cidr   = "10.0.0.0/16"
}

# 复用官方 Registry 模块：务必锁版本，防止升级破坏
module "vpc_official" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.16.0"

  cidr = "10.1.0.0/16"
}

output "vpc_id" {
  value = module.vpc.vpc_id   # 引用模块输出
}
```

```bash
# 下载/更新模块（init 也会自动完成）
terraform get -update
```

> 陷阱：模块版本不锁（`version` 省略）会让不同人/不同时间的 init 拉到
> 不同版本，`plan` 结果「时好时坏」。Registry 模块一律锁版本号。

## 6. 陷阱与调试速查

| 现象/报错 | 原因 | 处理 |
| :--- | :--- | :--- |
| `terraform init` 报 provider 下载失败 | 网络/镜像源问题 | 配置 provider 镜像或代理后重试 |
| `Error: Failed to load plugin schemas` | provider 版本约束冲突 | `terraform init -upgrade` 后复现查看 |
| plan 里出现大量 `-/+` | 属性变更触发资源替换 | 检查 `prevent_destroy`/不可变字段，评估停机 |
| `Value for undeclared variable` | tfvars 里有变量没声明 | 补 `variable` 块或删多余键 |
| apply 卡在等待 | 资源依赖未就绪或网络不通 | 看超时提示；`terraform apply` 中断后先 `plan` 对账 |
| 状态被误删 | `.terraform` 或 state 丢失 | 立即用远端后端与版本化备份恢复（见 043） |

调试辅助：`TF_LOG=DEBUG terraform plan` 输出详细日志；单属性差异用
`terraform plan -target` 缩小范围排查。

## 小结

- 初学者要点：四个核心块（terraform/provider/variable/resource）+
  三个命令（init/plan/apply）；plan 是安全边界，apply 前必读；格式化与
  校验进 pre-commit；敏感值不落 tfvars。
- 进阶注意：provider 一律锁版本（`~>`），Registry 模块锁 `version`；
  `-/+` 意味着停机替换，高危；两段式 plan/apply 保证「审的就是跑的」；
  远端状态与锁是团队协作前提（见 `430-TerraformStateModule`）；选型时
  知道 BSL/OpenTofu 分叉的存在即可，语法层面两者目前高度一致。
