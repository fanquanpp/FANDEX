---
order: 360
title: Azure CLI 配置
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'Azure CLI（az）的安装、登录认证、订阅管理、默认配置与 JMESPath 输出控制实战。'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cloud-computing/370-AzureGroupVMCommand'
  - 'cloud-computing/380-AzureStorageCommand'
  - 'cloud-computing/500-AzureAKSCommands'
prerequisites: []
---

## 前置知识与学习目标

Azure CLI（命令名 `az`）是微软官方的 Azure 命令行工具。与 AWS 不同，Azure
的资源模型多一层「租户（Tenant）- 订阅（Subscription）」结构：登录的是
身份，资源挂在订阅下计费。类比：租户像公司，订阅像公司里的独立账套，
资源组（Resource Group）才是资源的最小管理单元。

学习本文后，你应当能够：安装并升级 `az`；区分用户登录与服务主体登录；
在多个订阅间切换；用默认配置减少重复参数；用 `--query` 精确取值。

## 1. 安装与升级

```bash
# Windows（官方推荐 winget）
winget install -e --id Microsoft.AzureCLI

# Ubuntu/Debian（微软官方 apt 源）
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# macOS（Homebrew）
brew install azure-cli

# 查看版本：输出 JSON 形式的 CLI 与各依赖库版本
az version
# 预期输出：
# { "azure-cli": "2.7x.0", "azure-cli-core": "2.7x.0", ... }

# CLI 自带的自升级命令（会列出变更并确认）
az upgrade
```

> 陷阱：`az upgrade` 在 Windows 上需要以管理员身份运行终端；在 Linux 上
> 如果是 apt 装的，用系统包管理器升级更稳（`sudo apt update && sudo apt
> install azure-cli`），避免两套安装渠道互相覆盖。

### 1.1 帮助系统：自解释的命令树

Azure CLI 的命令结构是 `az <服务> <操作组> <动作>`，帮助非常完善：

```bash
# 查看虚拟机命令组的所有子命令
az vm --help

# 官方示例检索器：按关键词给出真实可跑的示例
az find "az role"

# 创建 VM 的完整参数说明
az vm create --help
```

记住 `--help` 就不需要背参数，`az find` 相当于内置的示例搜索引擎。

## 2. 登录认证：三种方式对应三种场景

```bash
# 方式一：默认浏览器交互登录（本地开发首选）
az login
# 预期输出：JSON 数组，列出你身份可见的订阅（isDefault: true 为当前订阅）

# 方式二：设备码登录（SSH 远程终端/无图形界面环境）
az login --use-device-code
# 预期输出：提示打开 https://microsoft.com/devicelogin 并输入设备码

# 方式三：服务主体登录（CI/CD 与脚本，密钥最小权限）
az login --service-principal \
  -u 00000000-0000-0000-0000-000000000000 \
  -p "********" \
  --tenant 00000000-0000-0000-0000-000000000000

# 登出
az logout
```

三种方式的分工：日常开发用 `az login`；跳板机/无浏览器环境用设备码；
流水线用服务主体（生产上更推荐 Managed Identity——VM/AKS 自带身份，
完全不需要管理密码）。

> 陷阱：服务主体密码属于密钥。`az ad sp create-for-rbac` 创建时输出的
> password 只显示一次，且不要写进代码仓库；CI 里用环境变量或
> `AZURE_CLIENT_ID`/`AZURE_TENANT_ID`/`AZURE_CLIENT_SECRET` 三件套注入。

## 3. 订阅管理：先看清楚再操作

```bash
# 列出当前身份可见的所有订阅（表格更易读）
az account list --output table
# 预期输出：Name、CloudName、SubscriptionId、State、IsDefault 等列

# 切换当前订阅（后续所有命令都作用在该订阅）
az account set --subscription "0ad021f2-9dde-4cb1-8aa4-d71018aaeec8"

# 确认当前订阅——操作资源前必做
az account show --query "{name:name, id:id}" --output table
# 预期输出：
# Name              Id
# ----------------  --------------------------------
# My-Production     0ad021f2-9dde-4cb1-8aa4-d71018aaeec8

# 列出订阅可用的区域（部署前确认目标区域已开放）
az account list-locations --query "[].{name:name, displayName:displayName}" -o table
```

> 陷阱：多订阅账号最常见的翻车是「在错误的订阅里建了资源」——计费和
> 权限全乱。脚本中固定显式传 `--subscription`，不要依赖会话默认值。

## 4. 默认配置：减少重复参数

Azure CLI 允许把「每次都要写的参数」固化为默认值，显著缩短命令：

```bash
# 设置默认资源组：之后命令可省略 -g 参数
az config set defaults.group=MyResourceGroup
# 之后等价：az vm list 与 az vm list -g MyResourceGroup 相同

# 设置默认位置
az config set defaults.location=chinanorth3

# 查看全部本地配置
az config get

# 关闭首次使用时的区域建议提示
az config set core.display_region_identified=no

# 删除某个默认值
az config unset defaults.group
```

这套默认值存在 `~/.azure/config`（INI 格式），可随 dotfiles 分发，但注意
defaults 段落里若含资源组名，换项目时记得改。

## 5. 输出控制：--output 与 --query

```bash
# 四种格式：json（默认）、jsonc（带颜色）、table（人读）、tsv（脚本取值）、yaml
az group list --output table

# JMESPath 提取：只拿资源组名字列表
az group list --query "[].name" --output tsv
# 预期输出（每行一个名字，无引号，适合 for 循环）：
# MyResourceGroup
# MyOtherGroup

# 过滤 + 投影：列出北区所有正在运行的 VM 名称与 IP
az vm list --query "[?location=='chinanorth3' && powerState=='VM running'].{name:name, ip:publicIps}" -o table
```

脚本取值的黄金组合是 `--query ... --output tsv`：tsv 输出无引号、无对齐
空白，可以直接赋值给 shell 变量：

```bash
# 用一行命令拿到资源组所在的地理位置
LOCATION=$(az group show -n MyResourceGroup --query location -o tsv)
echo "资源组位于: $LOCATION"
```

## 6. 扩展管理

Azure CLI 的新服务特性常以「扩展」形式先行发布，首次用到会自动提示安装：

```bash
# 列出已安装扩展
az extension list --query "[].name" -o tsv

# 手动安装/更新扩展
az extension add --name azure-devops --upgrade

# 移除扩展
az extension remove --name azure-devops
```

> 陷阱：扩展内的命令可能是实验性 API，字段名与稳定版不同；生产脚本里
> 依赖扩展命令时，固定 `--extension-version` 并在 CI 中显式安装。

## 7. 实战：一条命令建一个可登录的 VM

把默认配置与查询组合起来，体会 `az` 的简洁：

```bash
# 使用默认资源组创建 Ubuntu VM，并自动生成 SSH 密钥
az vm create \
  --name web-vm-01 \
  --image Ubuntu2204 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --output json
# 预期输出核心字段：
# { "publicIp": "203.0.113.10", "powerState": "VM running", ... }

# 开放 80 端口（操作 VM 关联的网络安全组）
az vm open-port --name web-vm-01 --port 80 --priority 1001

# 清理：删除整个资源组即删除其中所有资源
az group delete --name MyResourceGroup --yes --no-wait
```

## 小结

- 初学者要点：`az login` 登录后先 `az account show` 确认订阅；把高频的
  资源组/区域设成 `az config set defaults.*`；取值用
  `--query + --output tsv`；帮助靠 `--help` 与 `az find`，不用死记参数。
- 进阶注意：多订阅脚本显式传 `--subscription`；CI 用服务主体或托管
  标识，密钥只走环境变量；扩展命令注意版本固定；升级渠道保持单一
  （包管理器或 `az upgrade` 二选一），混用易出现版本错乱。
