---
order: 430
title: Terraform 状态与模块
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 云计算 Terraform 状态与模块 的完整教学讲解。
author: fanquanpp
updated: '2026-08-01'
---

## 状态查看

**基本写法：列出状态中所有资源**
`terraform state list`
```bash
# 列出当前状态文件中所有资源
terraform state list
```

---

**基本写法：查看资源详情**
`terraform state show <资源类型>.<资源名>`
```bash
# 查看指定资源的状态属性
terraform state show aws_instance.example
```

---

**基本写法：以人类可读格式查看**
`terraform show`
```bash
# 显示整个状态文件
terraform show
```

---

**基本写法：以 JSON 输出状态**
`terraform show -json`
```bash
# 输出 JSON 格式状态便于程序解析
terraform show -json
```

---

**基本写法：查看所有输出值**
`terraform output`
```bash
# 显示所有 output 块的值
terraform output
```

---

**基本写法：查看单个输出**
`terraform output <输出名>`
```bash
# 查看指定输出值
terraform output instance_id
```

---

## 状态管理

**基本写法：拉取远程状态**
`terraform state pull`
```bash
# 从后端拉取状态到标准输出
terraform state pull
```

---

**基本写法：推送本地状态**
`terraform state push <状态文件>`
```bash
# 推送本地状态文件到远程后端
terraform state push terraform.tfstate
```

---

**基本写法：从状态中移除资源**
`terraform state rm <资源类型>.<资源名>`
```bash
# 移除资源但不销毁实际基础设施
terraform state rm aws_instance.example
```

---

**基本写法：重命名状态中的资源**
`terraform state mv <旧地址> <新地址>`
```bash
# 重命名状态中的资源地址
terraform state mv aws_instance.old aws_instance.new
```

---

**基本写法：替换资源**
`terraform apply -replace=<资源类型>.<资源名>`
```bash
# 强制销毁并重建指定资源
terraform apply -replace=aws_instance.example
```

---

**基本写法：检测漂移**
`terraform plan -refresh-only`
```bash
# 仅刷新状态检测实际漂移
terraform plan -refresh-only
```

---

## 资源导入

**基本写法：导入现有资源**
`terraform import <资源类型>.<资源名> <远程ID>`
```bash
# 将现有 EC2 实例导入到 Terraform 管理
terraform import aws_instance.example i-1234567890abcdef0
```

---

**基本写法：声明式导入块**
```hcl
# Terraform 1.5+ 支持的声明式导入
import {
  to = aws_instance.example
  id = "i-1234567890abcdef0"
}
```

---

**基本写法：生成导入配置**
`terraform plan -generate-config-out=<文件>`
```bash
# 为导入的资源生成配置代码
terraform plan -generate-config-out=generated.tf
```

---

## 工作空间

**基本写法：列出工作空间**
`terraform workspace list`
```bash
# 列出所有工作空间
terraform workspace list
```

---

**基本写法：创建工作空间**
`terraform workspace new <工作空间名>`
```bash
# 创建新的工作空间用于多环境管理
terraform workspace new production
```

---

**基本写法：切换工作空间**
`terraform workspace select <工作空间名>`
```bash
# 切换到指定工作空间
terraform workspace select production
```

---

**基本写法：查看当前工作空间**
`terraform workspace show`
```bash
# 输出当前激活的工作空间名
terraform workspace show
```

---

**基本写法：删除工作空间**
`terraform workspace delete <工作空间名>`
```bash
# 删除非当前激活的工作空间
terraform workspace delete staging
```

---

**基本写法：在配置中引用工作空间**
```hcl
# 根据工作空间区分环境配置
resource "aws_instance" "example" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = terraform.workspace == "production" ? "t3.medium" : "t3.micro"
}
```

---

## 后端配置

**基本写法：本地后端**
```hcl
# 默认本地后端
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
```

---

**基本写法：S3 远程后端**
```hcl
# 使用 S3 与 DynamoDB 实现远程状态与锁
terraform {
  backend "s3" {
    bucket         = "my-tfstate-bucket"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tf-locks"
    encrypt        = true
  }
}
```

---

**基本写法：后端初始化迁移**
`terraform init -migrate-state`
```bash
# 切换后端时迁移现有状态
terraform init -migrate-state
```

---

**基本写法：强制重新配置后端**
`terraform init -reconfigure`
```bash
# 忽略已有配置重新初始化后端
terraform init -reconfigure
```

---

## 模块引用

**基本写法：引用模块输出**
```hcl
# 引用子模块的输出值
resource "aws_instance" "example" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
  subnet_id     = module.vpc.public_subnet_id
}
```

---

**基本写法：从 Git 仓库引用模块**
```hcl
# 引用 Git 仓库中的模块
module "vpc" {
  source = "git::https://github.com/example/terraform-modules.git//vpc?ref=v1.2.0"
  cidr   = "10.0.0.0/16"
}
```
