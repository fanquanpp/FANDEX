---
order: 300
title: AWS CLI 配置
module: 'cloud-computing'
category: 云与基础设施
difficulty: beginner
description: 'AWS CLI v2 的安装、凭证体系（Profile/环境变量/SSO）、常用配置与排错实战。'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cloud-computing/270-AWSCore'
  - 'cloud-computing/310-AWSS3Command'
  - 'cloud-computing/340-AWSIAMCommand'
prerequisites:
  - 'cloud-computing/270-AWSCore'
---

## 前置知识与学习目标

AWS CLI 是操作 AWS 的命令行工具，相当于把控制台上的每一次点击翻译成一次 API 调用。
学习本文前，你只需要知道 IAM 用户/角色与访问密钥（Access Key）是什么（见
`340-AWSIAMCommand`）。

完成本文后，你应当能够：

1. 用**官方渠道**安装 AWS CLI v2，并确认版本；
2. 理解 AWS CLI 的**凭证查找顺序**，配置单账号与多账号（命名 Profile）；
3. 用 `sts get-caller-identity` 验证身份，用 `--query` 精确取值；
4. 识别常见的配置类报错并快速定位。

## 1. 安装：只用 v2，只用官方安装包

**首先要分清两个版本**：AWS CLI v2 是现行主版本；v1 早已停止新特性开发并被
官方宣布停止支持。包管理器里的 `pip install awscli`、老版本 `yum install awscli`
装的多是 v1，新环境不要再使用。

| 安装方式 | 版本 | 结论 |
| :--- | :--- | :--- |
| 官方安装包（Linux 捆绑包 / macOS PKG / Windows MSI） | v2 | 唯一推荐 |
| `pip install awscli` | v1 | 已停止支持，勿用于新环境 |
| Homebrew / apt / snap 中的包 | 多为社区打包 | 可用但非官方渠道，版本滞后 |

Linux x86_64 官方安装（摘自 AWS 文档，含预期输出）：

```bash
# 下载官方 v2 捆绑包并解压
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip

# 安装（sudo 安装到 /usr/local，需可写权限）
sudo ./aws/install

# 验证：输出 aws-cli/2.x.x 与内嵌 Python 版本
aws --version
# 预期输出（版本号随时间变化）：
# aws-cli/2.27.0 Python/3.13.6 Linux/6.8.0 exe/x86_64.ubuntu.24
```

已装过 v2 后升级，复用同一安装器加 `--update` 参数即可，无需卸载：

```bash
# 覆盖升级到新版本
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -o awscliv2.zip
sudo ./aws/install --update
```

macOS 用官方 PKG 或一条 curl 安装；Windows 下载官方 MSI 安装后重开终端：

```bash
# macOS（Apple Silicon 下载 awscli-exe-linux 即 macos 版的对应地址）
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Windows（PowerShell）下载 MSI 后安装
# https://awscli.amazonaws.com/AWSCLIV2.msi
```

> 陷阱：装完命令不存在。多半是 `/usr/local/bin` 不在 PATH 里，或装完后没有
> 重开终端（Windows 常见）。

## 2. 凭证配置：先理解查找顺序

### 2.1 最常用：`aws configure` 交互式向导

```bash
# 依次询问 Access Key、Secret Key、默认区域、输出格式
aws configure
# AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
# AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
# Default region name [None]: cn-north-1
# Default output format [None]: json
```

它只写两个纯文本文件，手动编辑效果完全相同：

```ini
# ~/.aws/credentials —— 存密钥（敏感文件，权限应为 600）
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# ~/.aws/config —— 存区域、输出格式等非敏感配置
[default]
region = cn-north-1
output = json
```

### 2.2 多账号：命名 Profile

类比：一个 Profile 就像浏览器里的一个「用户配置文件」，每个 Profile 对应
一个账号/角色。开发、测试、生产各建一个，避免误操作生产环境。

```bash
# 为生产账号创建独立 Profile（交互式输入该账号密钥）
aws configure --profile production

# 临时指定 Profile 执行命令
aws s3 ls --profile production

# 或者切换整个会话的默认 Profile（环境变量方式）
export AWS_PROFILE=production
```

配置文件中会多出对应段落：

```ini
# ~/.aws/credentials
[production]
aws_access_key_id = AKIAI44QH8DHBEXAMPLE
aws_secret_access_key = je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY

# ~/.aws/config —— 注意 Profile 写成 [profile 名字]
[profile production]
region = us-west-2
output = table
```

> 陷阱：`~/.aws/credentials` 里段落名直接写 `[production]`，而
> `~/.aws/config` 里必须写 `[profile production]`，漏掉 `profile` 前缀是
> 最常见的配置错误之一。

### 2.3 环境变量：容器与 CI 的首选

```bash
# 常用的四个环境变量（SDK 与 CLI 通用）
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_SESSION_TOKEN='...'   # 临时凭证（STS/角色扮演）才需要
export AWS_DEFAULT_REGION=cn-north-1
```

> 陷阱：环境变量优先级高于配置文件，调试时容易「明明改了配置文件却没生效」，
> 先 `env | grep AWS` 检查是否有残留变量。

### 2.4 CLI 如何决定用哪套凭证（查找顺序）

按顺序尝试，取第一个命中的来源，这是排错的核心知识：

```text
1. 命令行参数            （少数命令支持）
2. 环境变量              AWS_ACCESS_KEY_ID 等
3. 容器/EC2 角色凭证      （容器 credential_process、IMDS）
4. 命名 Profile          ~/.aws/credentials 与 ~/.aws/config
5. IAM Identity Center   aws configure sso 配置的 SSO 缓存
6. 临时失败              报 Unable to locate credentials
```

生产环境的推荐姿势其实是「不要长期密钥」：给 EC2/ECS/Lambda 挂 IAM 角色，
或用 IAM Identity Center（`aws configure sso` + `aws sso login`），本地开发
用 `credential_process` 调用 `aws signout`/SSO 缓存，密钥不落盘。

## 3. 身份验证与常用配置命令

```bash
# 验证当前凭证对应的账号、用户/角色与 ARN——任何配置改动后先跑这一条
aws sts get-caller-identity
# 预期输出：
# {
#     "UserId": "AIDAXAMPLE2345EXAMPLE",
#     "Account": "123456789012",
#     "Arn": "arn:aws:iam::123456789012:user/dev-user"
# }

# 查看当前生效配置（来源、区域、Profile）
aws configure list

# 非交互式设置单项配置（脚本友好）
aws configure set region us-west-2
aws configure set default.output json

# 列出全部命名 Profile
aws configure list-profiles
# 预期输出：
# default
# production
```

## 4. 输出控制：--output 与 --query

```bash
# 三种输出格式：json（默认、可解析）、table（人读）、text（配合 shell）
aws ec2 describe-instances --output table

# 用 JMESPath 表达式只取所需字段（客户端过滤）
aws ec2 describe-instances \
  --query 'Reservations[].Instances[].[InstanceId,State.Name]' \
  --output text
# 预期输出（每行一个实例）：
# i-0abc1234defg running
# i-0hijk5678lmn stopped

# 单值提取：第一个实例的 ID
aws ec2 describe-instances \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text
```

> 陷阱（v2 特有）：v2 默认启用分页器（pager），长输出会被截停在交互界面，
> 脚本里表现为「命令卡住」。加 `--no-cli-pager` 或设置
> `export AWS_PAGER=""` 关闭。

## 5. 陷阱与调试速查

| 现象/报错 | 原因 | 处理 |
| :--- | :--- | :--- |
| `Unable to locate credentials` | 无任何凭证来源 | 检查第 2.4 节查找顺序 |
| `You must specify a region` | 未配置区域 | `aws configure set region ...` 或设 `AWS_DEFAULT_REGION` |
| `The security token included in the request is expired` | 临时凭证过期 | 重新 `aws sso login` 或重新 assume-role |
| `AccessDenied` 但密钥正确 | IAM 权限不足或 region 不对 | 对比控制台 URL 的区域；用 `--debug` 看请求 |
| 命令挂住不动 | v2 分页器等待交互 | `--no-cli-pager` 或 `AWS_PAGER=""` |
| 服务器返回 `RequestTimeTooSkewed` | 本机时钟漂移 | 同步系统时间（NTP） |

排错万能开关：给任意命令加 `--debug`，可看到实际请求的区域、签名版本与
HTTP 状态，是把「玄学失败」变成「明确报错」的第一工具。

## 6. 进阶：跨账号角色（assume-role）

多账号体系下的标准做法不是复制密钥，而是「用基础账号的凭证扮演目标角色」，
直接写在配置文件里即可自动续期：

```ini
# ~/.aws/config —— production Profile 自动扮演跨账号角色
[profile base]
region = cn-north-1

[profile production]
region = us-west-2
role_arn = arn:aws:iam::987654321098:role/OpsRole
source_profile = base        # 用 base 的凭证去换 production 的角色凭证
mfa_serial = arn:aws:iam::123456789012:mfa/dev-user   # 可选：强制 MFA
```

```bash
# 之后正常调用，CLI 自动完成 assume-role 与临时凭证刷新
aws sts get-caller-identity --profile production
# 预期输出的 Arn 形如：
# arn:aws:sts::987654321098:assumed-role/OpsRole/...
```

## 小结

- 初学者要点：用**官方安装包装 v2**（`pip install awscli` 是已停更的 v1）；
  `aws configure` 写的是 `~/.aws/credentials` 与 `~/.aws/config` 两个文件；
  多账号用命名 Profile，配置段落要带 `profile` 前缀；改完配置先跑
  `aws sts get-caller-identity` 验证。
- 进阶注意：记住凭证查找顺序才能解释「改了不生效」；生产优先用 IAM 角色
  与 Identity Center 而非长期密钥；`source_profile` + `role_arn` 是跨账号
  标准姿势；脚本环境记得关 v2 分页器；密钥文件权限收紧为 600，绝不进 git。
