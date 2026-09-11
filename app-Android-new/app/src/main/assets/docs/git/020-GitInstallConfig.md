---
order: 20
title: Git 安装配置
module: 'git'
category: 工具链
difficulty: beginner
description: Git 在三大系统下的安装、首次配置清单（身份/编辑器/默认分支）与凭据管理。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/030-GitEnvConfigInit'
  - 'shell/020-WindowsEnvConfigTutorial'
  - 'shell/030-MacOSEnvConfigTutorial'
prerequisites:
  - 'shell/010-DevEnvSetup'
---

## 安装前要知道的三件事

1. **装哪个渠道**：优先用系统包管理器（winget / brew / apt），升级方便、版本可控；「官网下载安装包」仅适合无法用包管理器的环境。
2. **装完先配什么**：Git 首次提交前必须配置 `user.name` 与 `user.email`（它们会写进每个提交的 author 字段），以及 `init.defaultBranch`（新仓库的默认分支名）。
3. **版本要求**：本教程假定较新版本（2.30+）；`git switch`/`git restore` 需要 2.23+，`git maintenance` 需要 2.36+。老版本（如 CentOS 7 自带的 1.8）建议通过包管理器或源码升级。

## 各系统安装

| 系统 | 推荐渠道 | 附带组件 | 备注 |
| :--- | :------- | :------- | :--- |
| Windows | winget（或官网安装包） | Git Bash、Git Credential Manager | 一并装好终端与凭据管理 |
| macOS | Homebrew | 无 | 系统自带 git 通常偏旧 |
| Ubuntu/Debian | apt | 无 | 需要新版时用 PPA |
| Fedora/RHEL | dnf / yum | 无 | EPEL 或源码编译取新版 |

**Windows：winget 一条命令**

```bash
winget install Git.Git        # Git for Windows：含 Git Bash 与 Git Credential Manager
winget upgrade Git.Git        # 后续升级
```

安装包自带 **Git Bash**（推荐终端环境）与**凭据管理器**（GCM，首次 push 时弹窗登录并安全存储凭据）。

**macOS：Homebrew**

```bash
brew install git              # 系统自带的老版本会被 /opt/homebrew/bin/git 优先
brew upgrade git
```

**Linux（Ubuntu/Debian 与 RHEL 系）**

```bash
sudo apt-get install git      # Ubuntu / Debian
sudo dnf install git          # Fedora / 新版 RHEL
sudo yum install git          # 旧版 CentOS / RHEL
```

## 安装验证

```bash
git --version
# git version 2.51.0           ← 主版本达到 2.30+ 即可跟上本教程
which git                      # 确认路径（Windows Git Bash / macOS 用 which，验证是否为包管理器版本）
```

## 首次配置清单

Git 配置分三级（system → global → 仓库级），就近覆盖，日常只用 global 与仓库级。新机器五分钟清单：

```bash
# 1) 身份：写进每个提交，务必真实可联系
git config --global user.name "张三"
git config --global user.email "zhangsan@example.com"

# 2) 默认分支名：新仓库不再出现 master 警告
git config --global init.defaultBranch main

# 3) 编辑器：交互式命令（rebase -i、commit 不带 -m）用得到
git config --global core.editor "code --wait"

# 4) 大小写敏感与行尾（按平台）
git config --global core.ignorecase false        # Linux/macOS 提醒大小写差异
git config --global core.autocrlf input          # macOS/Linux；Windows 用 true

# 5) 常用别名（可选但回报极高）
git config --global alias.st "status -sb"
git config --global alias.lg "log --oneline --graph --decorate --all"
```

验证配置并查看来源（排障时能看出哪一级在生效）：

```bash
git config --global --list     # 全局配置
git config user.email          # 当前生效值
git config --list --show-origin | grep user.email   # 值 + 来自哪个文件
```

三级配置的物理位置与用途：

| 级别 | 文件位置 | 典型内容 |
| :--- | :------- | :------- |
| system | `<安装目录>/etc/gitconfig` | 全机统一策略（一般不动） |
| global | `~/.gitconfig`（Windows 为 `%USERPROFILE%\.gitconfig`） | 个人身份、别名、全局忽略 |
| 仓库级 | `<仓库>/.git/config` | 该项目特例（如公司邮箱） |

同名配置就近覆盖：仓库级 > global > system。详细的配置项讲解（行尾、凭据缓存、reftable 等）见 [环境配置与初始化](git/030-GitEnvConfigInit)。

行尾处理（`core.autocrlf`）按平台一次配好，能省掉团队里大半「整文件被改动」的噪音：

| 取值 | 行为 | 适合 |
| :--- | :--- | :--- |
| `true` | 检出转 CRLF，提交转 LF | Windows |
| `input` | 检出不变，提交转 LF | macOS / Linux |
| `false` | 完全不转换（需配 `.gitattributes` 管控） | 全 Linux 团队或严格仓库 |

公司项目要求工位邮箱时，用仓库级覆盖全局：

```bash
cd work-project
git config user.email "zhangsan@company.com"    # 不带 --global 即仓库级
```

## 凭据与拉取认证

```bash
# HTTPS + 凭据管理器（Git for Windows 默认自带）
git config --global credential.helper manager

# SSH（推荐长期方案）：生成密钥并把公钥加到平台
ssh-keygen -t ed25519 -C "zhangsan@example.com"
cat ~/.ssh/id_ed25519.pub      # 复制到 GitHub/Gitee/GitLab 的 SSH Keys 设置
ssh -T git@github.com          # 验证连通
```

## 完整会话：新机器五分钟初始化

把本文浓缩成一段可整体粘贴执行的脚本（按需替换身份信息）：

```bash
# 1) 安装（按平台三选一）
winget install Git.Git            # Windows；macOS: brew install git；Debian: sudo apt-get install git

# 2) 验证
git --version

# 3) 身份与默认行为
git config --global user.name "张三"
git config --global user.email "zhangsan@example.com"
git config --global init.defaultBranch main
git config --global core.editor "code --wait"

# 4) 顺手配置：行尾、别名、全局忽略
git config --global core.autocrlf input      # Windows 改为 true
git config --global alias.st "status -sb"
git config --global alias.lg "log --oneline --graph --decorate --all"
printf '.DS_Store\nThumbs.db\n*.swp\n' > ~/.gitignore_global
git config --global core.excludesFile ~/.gitignore_global

# 5) 凭据（SSH）
ssh-keygen -t ed25519 -C "zhangsan@example.com"
cat ~/.ssh/id_ed25519.pub                    # 添加到平台的 SSH Keys
ssh -T git@github.com

# 6) 冒烟测试
git config --list --show-origin | head       # 检查配置来源
git clone git@github.com:github/gitignore.git /tmp/gi && rm -rf /tmp/gi
```

跑完第 6 步无报错，即可进入日常开发（下一站：[环境配置与初始化](git/030-GitEnvConfigInit) 深入各项配置）。

## 常见问题

- **提交时报 `Please tell me who you are`**：没配 user.name/email，按上面清单补齐后重新 commit。
- **clone/push 反复要求密码**：HTTPS 走凭据管理器或改用 SSH 远程（`git remote set-url origin git@github.com:user/repo.git`）。
- **`git init` 警告 `hint: Using 'master' as the name...`**：未配 `init.defaultBranch`；配置后新仓库默认为 main（存量仓库改名见分支管理篇）。
- **Windows 中文乱码**：`git config --global core.quotepath false`（文件名转义）并使用 Git Bash。

## 命令速查

**安装**

`winget install Git.Git`
```bash
winget install Git.Git                     # Windows
brew install git                           # macOS
sudo apt-get install git                   # Ubuntu/Debian
```

**身份配置**

`git config --global user.name "<用户名>"`
```bash
git config --global user.name "张三"
git config --global user.email "zhangsan@example.com"
git config user.name "李四"                 # 仅当前仓库生效
```

**默认分支与编辑器**

`git config --global init.defaultBranch main`
```bash
git config --global init.defaultBranch main
git config --global core.editor "code --wait"
```

**别名**

`git config --global alias.<别名> "<命令>"`
```bash
git config --global alias.st "status -sb"
git config --global --unset alias.st       # 删除别名
```

**查看与验证**

`git config --list --show-origin`
```bash
git --version
git config --list --show-origin
git config user.email
```

**凭据与 SSH**

`ssh-keygen -t ed25519 -C "<邮箱>"`
```bash
ssh-keygen -t ed25519 -C "zhangsan@example.com"
ssh -T git@github.com
```
