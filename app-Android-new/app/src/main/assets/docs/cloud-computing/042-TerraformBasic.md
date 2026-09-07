---
order: 420
title: Terraform 基础
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 云计算 Terraform 基础 的完整教学讲解。
author: fanquanpp
updated: '2026-08-01'
---

## 模板语法

**基本写法：provider 声明**
```hcl
# 声明使用的云提供商与区域
provider "aws" {
  region = "us-east-1"
}
```

---

**基本写法：resource 资源块**
```hcl
# 定义 EC2 实例资源
resource "aws_instance" "example" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
}
```

---

**基本写法：variable 输入变量**
```hcl
# 定义可由外部传入的变量
variable "instance_type" {
  type    = string
  default = "t2.micro"
}
```

---

**基本写法：output 输出值**
```hcl
# 输出资源属性供其他模块引用
output "instance_id" {
  value = aws_instance.example.id
}
```

---

**基本写法：引用变量与资源**
```hcl
# 在资源中引用变量
resource "aws_instance" "example" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = var.instance_type
}
```

---

## 核心工作流

**基本写法：初始化工作目录**
`terraform init`
```bash
# 下载 provider 插件并初始化后端
terraform init
```

---

**基本写法：升级初始化**
`terraform init -upgrade`
```bash
# 升级 provider 与模块到允许的最新版本
terraform init -upgrade
```

---

**基本写法：预览变更**
`terraform plan`
```bash
# 预览将要创建修改销毁的资源
terraform plan
```

---

**基本写法：保存计划到文件**
`terraform plan -out=<文件名>`
```bash
# 将计划保存到文件供 apply 使用
terraform plan -out=tf.tfplan
```

---

**基本写法：应用变更**
`terraform apply`
```bash
# 应用配置变更需手动确认
terraform apply
```

---

**基本写法：自动确认应用**
`terraform apply -auto-approve`
```bash
# 应用变更无需确认适合 CI/CD
terraform apply -auto-approve
```

---

**基本写法：应用指定计划**
`terraform apply <计划文件>`
```bash
# 应用预先保存的计划文件
terraform apply tf.tfplan
```

---

**基本写法：销毁所有资源**
`terraform destroy`
```bash
# 销毁当前配置管理的所有资源
terraform destroy
```

---

**基本写法：销毁单个资源**
`terraform destroy -target=<资源类型>.<资源名>`
```bash
# 仅销毁指定资源
terraform destroy -target=aws_instance.example
```

---

## 验证与格式化

**基本写法：语法校验**
`terraform validate`
```bash
# 检查配置语法与一致性
terraform validate
```

---

**基本写法：格式化代码**
`terraform fmt`
```bash
# 将配置文件格式化为规范风格
terraform fmt
```

---

**基本写法：递归格式化**
`terraform fmt -recursive`
```bash
# 递归格式化所有子目录文件
terraform fmt -recursive
```

---

**基本写法：检查格式但不修改**
`terraform fmt -check`
```bash
# 检查格式不规范则退出码 1
terraform fmt -check
```

---

## 变量传递

**基本写法：命令行传变量**
`terraform plan -var "<键>=<值>"`
```bash
# 通过命令行传入变量值
terraform plan -var "instance_type=t3.small"
```

---

**基本写法：使用变量定义文件**
`terraform plan -var-file=<文件>`
```bash
# 通过 tfvars 文件传入多个变量
terraform plan -var-file=prod.tfvars
```

---

**基本写法：查看所有输出**
`terraform output`
```bash
# 查看应用后的输出值
terraform output
```

---

**基本写法：查看 JSON 格式输出**
`terraform output -json`
```bash
# 以 JSON 格式输出便于脚本解析
terraform output -json
```

---

## 模块管理

**基本写法：使用本地模块**
```hcl
# 引用本地子模块
module "vpc" {
  source = "./modules/vpc"
  cidr   = "10.0.0.0/16"
}
```

---

**基本写法：使用 Registry 模块**
```hcl
# 引用 Terraform Registry 上的官方模块
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
  cidr    = "10.0.0.0/16"
}
```

---

**基本写法：下载与更新模块**
`terraform get [-update]`
```bash
# 下载引用的模块
terraform get -update
```
