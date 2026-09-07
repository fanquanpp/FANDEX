---
order: 380
title: Azure 资源组与 VM
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 云计算 Azure 资源组与 VM 的完整教学讲解。
author: fanquanpp
updated: '2026-08-01'
---

## 资源组管理

**基本写法：创建资源组**
`az group create --name <资源组名> --location <区域>`
```bash
# 在 eastus 区域创建资源组
az group create --name MyResourceGroup --location eastus
```

---

**基本写法：列出所有资源组**
`az group list [--output table]`
```bash
# 以表格形式列出资源组
az group list --output table
```

---

**基本写法：查看资源组详情**
`az group show --name <资源组名>`
```bash
# 查看指定资源组信息
az group show --name MyResourceGroup
```

---

**基本写法：删除资源组**
`az group delete --name <资源组名> [--yes] [--no-wait]`
```bash
# 删除资源组及所有资源不等待
az group delete --name MyResourceGroup --yes --no-wait
```

---

**基本写法：按名称过滤资源组**
`az group list --query "[?starts_with(name, 'msdocs') == \`true\`].name" -o table`
```bash
# 列出以 msdocs 开头的资源组
az group list --query "[?starts_with(name, 'msdocs') == \`true\`].name" -o table
```

---

## 虚拟机创建

**基本写法：创建 Ubuntu VM**
`az vm create --resource-group <资源组名> --name <VM名> --image Ubuntu2204 [--admin-username <用户名>] [--generate-ssh-keys]`
```bash
# 创建 Ubuntu 22.04 VM 并自动生成 SSH 密钥
az vm create --resource-group MyResourceGroup --name my-vm --image Ubuntu2204 --admin-username azureuser --generate-ssh-keys
```

---

**基本写法：指定镜像与大小创建**
`az vm create --resource-group <资源组名> --name <VM名> --image <镜像> --size <VM大小>`
```bash
# 创建 Standard_B2s 大小的 VM
az vm create --resource-group MyResourceGroup --name my-vm --image Ubuntu2204 --size Standard_B2s
```

---

**基本写法：在 VNet 子网中创建**
`az vm create --resource-group <资源组名> --name <VM名> --image <镜像> --vnet-name <VNet名> --subnet <子网名>`
```bash
# 指定虚拟网络与子网创建 VM
az vm create --resource-group test-rg --name vm-public --image Ubuntu2204 --vnet-name vnet-1 --subnet subnet-public
```

---

**基本写法：使用已有 SSH 公钥**
`az vm create --resource-group <资源组名> --name <VM名> --image <镜像> --ssh-key-values <公钥路径>`
```bash
# 使用本地公钥创建 VM
az vm create --resource-group MyResourceGroup --name my-vm --image Ubuntu2204 --ssh-key-values ~/.ssh/id_rsa.pub
```

---

## VM 查询

**基本写法：列出所有 VM**
`az vm list [--resource-group <资源组名>] [-d]`
```bash
# 列出所有 VM 并显示电源状态
az vm list -d
```

---

**基本写法：查看 VM 详情**
`az vm show --resource-group <资源组名> --name <VM名>`
```bash
# 查看 VM 完整配置
az vm show --resource-group MyResourceGroup --name my-vm
```

---

**基本写法：按创建时间过滤 VM**
`az vm list -d --query "[?timeCreated >= '2024-01-01'].[name, powerState]"`
```bash
# 查询 2024 年后创建的 VM
az vm list -d --query "[?timeCreated >= '2024-01-01'].[name, powerState]"
```

---

## VM 生命周期

**基本写法：启动 VM**
`az vm start --resource-group <资源组名> --name <VM名>`
```bash
# 启动已停止的 VM
az vm start --resource-group MyResourceGroup --name my-vm
```

---

**基本写法：停止 VM**
`az vm stop --resource-group <资源组名> --name <VM名>`
```bash
# 停止运行中的 VM
az vm stop --resource-group MyResourceGroup --name my-vm
```

---

**基本写法：分配（释放计算资源）**
`az vm deallocate --resource-group <资源组名> --name <VM名>`
```bash
# 释放 VM 不再产生计算费用
az vm deallocate --resource-group MyResourceGroup --name my-vm
```

---

**基本写法：重启 VM**
`az vm restart --resource-group <资源组名> --name <VM名>`
```bash
# 重启指定 VM
az vm restart --resource-group MyResourceGroup --name my-vm
```

---

**基本写法：删除 VM**
`az vm delete --resource-group <资源组名> --name <VM名> [--yes]`
```bash
# 删除 VM 不询问确认
az vm delete --resource-group MyResourceGroup --name my-vm --yes
```

---

## VM 连接

**基本写法：获取 SSH 连接信息**
`az vm show --resource-group <资源组名> --name <VM名> -d --query publicIps -o tsv`
```bash
# 获取 VM 公网 IP 用于 SSH 连接
az vm show --resource-group MyResourceGroup --name my-vm -d --query publicIps -o tsv
```

---

**基本写法：打开端口**
`az vm open-port --resource-group <资源组名> --name <VM名> --port <端口>`
```bash
# 打开 80 端口入站
az vm open-port --resource-group MyResourceGroup --name my-vm --port 80
```

---

**基本写法：执行远程命令**
`az vm run-command invoke --resource-group <资源组名> --name <VM名> --command-id RunShellScript --scripts "<命令>"`
```bash
# 远程执行 shell 命令
az vm run-command invoke --resource-group MyResourceGroup --name my-vm --command-id RunShellScript --scripts "uptime"
```

---

## 磁盘管理

**基本写法：列出磁盘**
`az disk list --resource-group <资源组名>`
```bash
# 列出资源组下所有托管磁盘
az disk list --resource-group MyResourceGroup
```

---

**基本写法：创建磁盘**
`az disk create --resource-group <资源组名> --name <磁盘名> --size-gb <GB>`
```bash
# 创建 20GB 数据磁盘
az disk create --resource-group MyResourceGroup --name my-disk --size-gb 20
```

---

**基本写法：附加磁盘到 VM**
`az vm disk attach --resource-group <资源组名> --vm-name <VM名> --name <磁盘名>`
```bash
# 将现有磁盘附加到 VM
az vm disk attach --resource-group MyResourceGroup --vm-name my-vm --name my-disk
```
