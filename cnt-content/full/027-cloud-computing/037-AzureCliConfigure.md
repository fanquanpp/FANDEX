---
order: 370
title: Azure CLI 配置
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 云计算 Azure CLI 配置 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## 安装与版本

**基本写法：安装 Azure CLI**
`az` 或通过包管理器安装
```bash
# Windows 通过 winget 安装
winget install -e --id Microsoft.AzureCLI
```

---

**基本写法：查看版本**
`az version`
```bash
# 输出 CLI 版本与依赖库版本
az version
```

---

**基本写法：升级 CLI**
`az upgrade`
```bash
# 升级到最新版本
az upgrade
```

---

**基本写法：查看帮助**
`az [<命令组>] --help`
```bash
# 查看 vm 子命令帮助
az vm --help
```

---

**基本写法：模糊查找命令**
`az find "<关键词>"`
```bash
# 查找 role 相关命令
az find "az role"
```

---

## 登录认证

**基本写法：浏览器交互登录**
`az login`
```bash
# 通过浏览器进行交互式登录
az login
```

---

**基本写法：使用设备码登录**
`az login --use-device-code`
```bash
# 通过设备码进行双因素认证登录
az login --use-device-code
```

---

**基本写法：服务主体登录**
`az login --service-principal -u <应用ID> -p <密码或证书> --tenant <租户ID>`
```bash
# 通过服务主体登录便于脚本化
az login --service-principal -u 00000000-0000-0000-0000-000000000000 -p myPassword --tenant 00000000-0000-0000-0000-000000000000
```

---

**基本写法：登出**
`az logout [--username <用户名>]`
```bash
# 登出当前账号
az logout
```

---

## 订阅管理

**基本写法：列出订阅**
`az account list`
```bash
# 列出当前账号下所有订阅
az account list
```

---

**基本写法：列出订阅（简洁版）**
`az account subscription list`
```bash
# 列出租户下所有可用订阅
az account subscription list
```

---

**基本写法：设置当前订阅**
`az account set --subscription <订阅ID或名称>`
```bash
# 切换到指定订阅
az account set --subscription 0ad021f2-9dde-4cb1-8aa4-d71018aaeec8
```

---

**基本写法：查看当前订阅**
`az account show`
```bash
# 查看当前激活的订阅
az account show
```

---

## 配置管理

**基本写法：查看当前配置**
`az config get`
```bash
# 列出本地配置项
az config get
```

---

**基本写法：设置默认资源组**
`az config set defaults.group=<资源组名>`
```bash
# 设置默认资源组避免每次指定
az config set defaults.group=MyResourceGroup
```

---

**基本写法：关闭区域建议提示**
`az config set core.display_region_identified=no`
```bash
# 关闭区域推荐消息
az config set core.display_region_identified=no
```

---

## 输出格式

**基本写法：指定输出格式**
`az <命令> --output <json|table|tsv|yaml>`
```bash
# 以表格形式输出资源组
az group list --output table
```

---

**基本写法：使用 JMESPath 查询**
`az <命令> --query '<JMESPath 表达式>'`
```bash
# 仅提取资源组名称
az group list --query "[].name" --output tsv
```

---

**基本写法：列出可用区域**
`az account list-locations`
```bash
# 列出当前订阅支持的所有区域
az account list-locations
```

---

## 扩展管理

**基本写法：列出已安装扩展**
`az extension list`
```bash
# 查看已安装的 CLI 扩展
az extension list
```

---

**基本写法：安装扩展**
`az extension add --name <扩展名>`
```bash
# 安装特定扩展
az extension add --name azure-devops
```

---

**基本写法：移除扩展**
`az extension remove --name <扩展名>`
```bash
# 移除不再需要的扩展
az extension remove --name azure-devops
```
