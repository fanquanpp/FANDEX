---
order: 390
title: GCP gcloud 配置
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'gcloud CLI 的安装初始化、账号与 ADC 认证、项目/区域默认值、多配置与组件管理。'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cloud-computing/400-GCPComputeStorage'
  - 'cloud-computing/510-GCPGKECommands'
prerequisites: []
---

## 前置知识与学习目标

Google Cloud CLI（核心命令 `gcloud`）是操作 GCP 的官方命令行工具。GCP 的
资源层级是「组织 -> 文件夹 -> 项目」，项目是资源与计费的基本单位——与
Azure 的订阅、AWS 的账号类似但粒度更小，实际工作中通常一个应用一个项目。

学完本文你应当能够：安装并初始化 gcloud；区分「gcloud 认证」与「应用
默认凭证（ADC）」这两个最易混淆的概念；用命名配置管理多项目；按需安装
kubectl 等组件。

## 1. 安装与初始化

```bash
# Ubuntu/Debian：先添加官方 apt 源（https://cloud.google.com/sdk/docs/install）
# 源配置完成后安装主包
sudo apt-get install -y google-cloud-cli

# macOS：brew install --cask google-cloud-sdk
# Windows：下载官方安装器或 winget install Google.CloudSDK

# 交互式初始化向导：登录账号、选默认项目、选默认区域
gcloud init

# 查看环境详情：安装路径、当前账号、项目、日志位置（排错入口）
gcloud info

# 查看版本：gcloud 主版本与各组件版本
gcloud version
# 预期输出：
# Google Cloud SDK 5xx.0.0
# gcloud 5xx.0.0
# ...

# 升级全部已安装组件（Debian apt 安装的除外，用 apt 升级）
gcloud components update
```

> 陷阱：通过 apt/yum 安装的 gcloud 由系统包管理器管理，
> `gcloud components update` 会提示不可用甚至报错——升级交给
> `sudo apt update && sudo apt upgrade` 即可，两种渠道不要混用。

## 2. 认证：两套凭证，各管一摊

这是 gcloud 新手最容易混淆的地方，用一张表分清：

| 命令 | 影响谁 | 写到哪 | 典型场景 |
| :--- | :--- | :--- | :--- |
| `gcloud auth login` | gcloud 自己 | 凭证缓存（gcloud 专用） | 你本人跑 gcloud 命令 |
| `gcloud auth application-default login` | 你写的程序/SDK/Terraform | ADC 文件 | 本地跑应用代码连 GCP API |
| 服务账号密钥 JSON | 程序 | `GOOGLE_APPLICATION_CREDENTIALS` | CI/服务器（能用 ADC 就别用密钥文件） |

```bash
# 浏览器登录 gcloud 自身
gcloud auth login

# 为本地应用配置应用默认凭证（ADC）——Terraform、应用代码读的是它
gcloud auth application-default login

# 列出已认证账号（带 * 为当前活跃账号）
gcloud auth list
# 预期输出：
#      Credentialed Accounts
# ACTIVE  ACCOUNT
# *       dev@example.com
#         ops@example.com

# 切换当前活跃账号
gcloud config set account ops@example.com

# 撤销认证（清理令牌，换岗/离职时必做）
gcloud auth revoke
```

> 陷阱：只跑了 `gcloud auth login` 就去跑 Terraform 或应用代码，报
> `...the credentials used are not authorized...` 或 403——因为代码读的
> 是 ADC，需要再执行 `application-default login`。两套凭证是分开的。

生产环境的标准答案不是密钥文件，而是**服务账号附加**：GCE/GKE/Cloud Run
上的负载自带身份，代码无需任何凭证；本地开发用 ADC + 身份伪装
（`gcloud auth application-default login --impersonate-service-account=...`）。

## 3. 项目与区域默认值

```bash
# 列出你可见的所有项目
gcloud projects list
# 预期输出：PROJECT_ID、NAME、PROJECT_NUMBER 三列

# 创建项目（项目 ID 全局唯一，只能小写字母数字连字符）
gcloud projects create my-app-prod-2026

# 查看项目元数据（编号、生命周期状态等）
gcloud projects describe my-app-prod-2026

# 删除项目（进入 30 天待删除期，可恢复）
gcloud projects delete my-app-prod-2026

# 把最常用的三项设为默认值，之后命令可省略对应 flag
gcloud config set project my-app-prod-2026
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a

# 单独读取某个默认值（脚本里常用）
gcloud config get-value project
# 预期输出：my-app-prod-2026

# 查看当前全部生效配置
gcloud config list
# 预期输出：
# [compute]
# region = us-central1
# zone = us-central1-a
# [core]
# account = dev@example.com
# project = my-app-prod-2026
```

> 陷阱：compute/region 与 compute/zone 是两个独立配置。GKE 创建命令若
> 只给了 region，gcloud 会按「区域集群」理解；若同时残留一个旧的 zone
> 默认值，可能出现「以为建了区域集群，实际建在了别的可用区」。改完默认
> 值后用 `gcloud config list` 复查一遍。

## 4. 多配置：多项目/多身份切换

命名配置（configuration）相当于 gcloud 的多套「档案」，每套记住各自的
账号、项目与区域：

```bash
# 创建一套新配置（创建后自动切换为活跃）
gcloud config configurations create my-config

# 列出所有配置（IS_ACTIVE 列标出当前激活项）
gcloud config configurations list

# 在配置间切换
gcloud config configurations activate default

# 查看某套配置的详情
gcloud config configurations describe my-config
```

> 陷阱：`gcloud init` 也可以新建配置，向导里选「Create a new
> configuration」即可；但注意 ADC（application-default）是**全局唯一**
> 的，不随配置切换——多项目开发时如果 ADC 归属错了项目权限，仍要去重新
> 登录 ADC。

## 5. 组件管理：按需安装

```bash
# 查看已安装与可安装的组件
gcloud components list

# 安装 kubectl（也可以让 GKE 命令自动装）
gcloud components install kubectl

# 安装 beta/galpha 命令组
gcloud components install beta

# 移除不用的组件
gcloud components remove kubectl
```

> 陷阱：gcloud 自带的 kubectl 与系统其他渠道（如 brew、apt）安装的
> kubectl 可能互相遮蔽，执行 `which kubectl` 确认版本来源，避免
> 「版本对不上 API」的诡异问题。

## 6. 实战：从零到能用的一条龙

```bash
# 1. 安装后初始化（选默认项目）
gcloud init

# 2. 开启所需 API（新项目常用第一步）
gcloud services enable compute.googleapis.com container.googleapis.com

# 3. 验证：列出当前项目的 VM（应为空列表或已有实例）
gcloud compute instances list

# 4. 试创建一个最小的 VM（默认区域生效，无需 -zone）
gcloud compute instances create test-vm --machine-type=e2-micro

# 5. 用完即删，避免持续计费
gcloud compute instances delete test-vm --quiet
```

`gcloud services enable` 是新项目最常见的「卡点」：第一次调用任何服务的
API 前必须启用对应 API，否则报
`Access Not Configured. Compute Engine API has not been used...`。

## 小结

- 初学者要点：`gcloud init` 一条命令完成账号/项目/区域三件事；记住
  `config set project|compute/region|compute/zone` 三个默认值；
  `gcloud auth list` 随时确认当前身份；新项目先 `gcloud services enable`。
- 进阶注意：gcloud 认证与 ADC 是两套独立凭证，跑 Terraform/应用代码用
  `application-default login`；生产负载用服务账号附加而非密钥文件；
  apt/yum 安装的 gcloud 由系统包管理器升级；多项目用命名配置切换，但
  ADC 全局唯一；实例用完即删，`e2-micro` 也有持续计费。
