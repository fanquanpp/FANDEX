---
order: 101
title: Windows环境配置教程
module: 'getting-started'
category: toolchain
difficulty: beginner
description: 'Windows 开发环境完整配置指南，涵盖 WSL2、包管理器、环境变量、Git、Node.js、Python、Java JDK、Docker Desktop、VS Code 安装与配置。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'getting-started/软件下载地址汇总'
  - 'getting-started/macOS环境配置教程'
  - 'getting-started/Linux环境配置教程'
prerequisites:
  - 'getting-started/入门指南'
---

## 1. WSL2 安装与配置

WSL2（Windows Subsystem for Linux 2）在 Windows 上提供完整的 Linux 内核，是 Windows 开发者的必备工具。

### 1.1 系统要求

- Windows 10 版本 2004+（内部版本 19041 及更高）或 Windows 11
- 启用虚拟化（在任务管理器 → 性能 → CPU 中确认虚拟化已启用）

### 1.2 安装 WSL2

以管理员身份打开 PowerShell：

```powershell
wsl --install
```

此命令将自动完成以下操作：

- 启用"适用于 Linux 的 Windows 子系统"可选组件
- 启用"虚拟机平台"可选组件
- 下载并安装 WSL2 Linux 内核
- 下载并安装 Ubuntu（默认发行版）
- 将 WSL 2 设置为默认版本

安装完成后重启计算机。

### 1.3 安装其他发行版

```powershell
# 查看可用发行版
wsl --list --online

# 安装指定发行版
wsl --install -d Debian
wsl --install -d Ubuntu-24.04

# 查看已安装发行版
wsl --list --verbose
```

### 1.4 设置默认发行版

```powershell
wsl --set-default Ubuntu-24.04
```

### 1.5 WSL2 基本操作

```powershell
# 启动 WSL
wsl

# 在指定发行版中执行命令
wsl -d Debian -- ls -la

# 关闭所有 WSL 实例
wsl --shutdown

# 更新 WSL
wsl --update
```

> [!note] 文件系统互通
>
> - 从 Windows 访问 WSL 文件：在资源管理器地址栏输入 `\\wsl$`
> - 从 WSL 访问 Windows 文件：`/mnt/c/`、`/mnt/d/` 等
> - 建议项目文件放在 WSL 文件系统中以获得更好的 I/O 性能

## 2. Chocolatey 包管理器

Chocolatey 是 Windows 上最流行的命令行包管理器，类似 Linux 的 apt/yum。

### 2.1 安装 Chocolatey

以管理员身份打开 PowerShell：

```powershell
# 先设置执行策略
Set-ExecutionPolicy Bypass -Scope Process -Force

# 安装 Chocolatey
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

### 2.2 常用命令

```powershell
# 搜索软件包
choco search nodejs

# 安装软件包
choco install git -y
choco install vscode -y
choco install nodejs-lts -y

# 升级已安装的包
choco upgrade all -y

# 查看已安装的包
choco list --local-only

# 卸载软件包
choco uninstall nodejs -y
```

### 2.3 常用开发工具一键安装

```powershell
choco install git vscode nodejs-lts python openjdk docker-desktop -y
```

## 3. Scoop 包管理器

Scoop 是另一个 Windows 包管理器，无需管理员权限，专注于便携式开发工具。

### 3.1 安装 Scoop

```powershell
# 设置执行策略
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 安装 Scoop
irm get.scoop.sh | iex
```

### 3.2 添加常用 Bucket

```powershell
scoop bucket add extras
scoop bucket add versions
scoop bucket add java
scoop bucket add nerd-fonts
```

### 3.3 常用命令

```powershell
# 搜索软件
scoop search nodejs

# 安装软件
scoop install nodejs-lts
scoop install python
scoop install openjdk

# 更新所有软件
scoop update *

# 查看已安装软件
scoop list

# 卸载软件
scoop uninstall nodejs-lts
```

> [!tip] Chocolatey vs Scoop
>
> - **Chocolatey**：软件更全，系统级安装，需要管理员权限
> - **Scoop**：无需管理员权限，用户级安装，便携式管理，适合开发工具
> - 两者可以共存，按需选择

## 4. 环境变量配置

### 4.1 图形界面配置

1. 右键"此电脑" → "属性" → "高级系统设置" → "环境变量"
2. 在"用户变量"或"系统变量"中新建/编辑/删除

### 4.2 命令行配置

```powershell
# 查看当前环境变量
$env:JAVA_HOME

# 临时设置（仅当前会话有效）
$env:MY_VAR = "hello"

# 永久设置用户环境变量
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Java\jdk-21", "User")

# 永久设置系统环境变量（需管理员权限）
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Java\jdk-21", "Machine")
```

### 4.3 PATH 变量配置

PATH 变量决定了系统在哪些目录中搜索可执行文件。

```powershell
# 查看当前 PATH
$env:PATH -split ";"

# 添加到用户 PATH（永久）
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
[Environment]::SetEnvironmentVariable("PATH", "$currentPath;C:\Tools\bin", "User")
```

> [!warning] PATH 顺序
> PATH 中的目录按顺序搜索，先找到的先使用。如果安装了多个版本的同一工具，PATH 顺序决定了使用哪个版本。建议将自定义路径放在 PATH 前面。

## 5. Git 安装与配置

### 5.1 安装 Git

```powershell
# 方式一：Chocolatey
choco install git -y

# 方式二：Scoop
scoop install git

# 方式三：官网下载
# https://git-scm.com/download/win
```

### 5.2 初始配置

```bash
# 设置用户名和邮箱
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 设置默认分支名为 main
git config --global init.defaultBranch main

# 设置默认编辑器
git config --global core.editor "code --wait"

# 设置换行符处理（Windows 推荐）
git config --global core.autocrlf true

# 查看所有配置
git config --list --show-origin
```

### 5.3 生成 SSH 密钥

```bash
# 生成 Ed25519 密钥（推荐）
ssh-keygen -t ed25519 -C "your.email@example.com"

# 启动 ssh-agent
eval $(ssh-agent -s)

# 添加密钥到 agent
ssh-add ~/.ssh/id_ed25519
```

将 `~/.ssh/id_ed25519.pub` 的内容添加到 GitHub/GitLab 的 SSH Keys 中。

### 5.4 配置凭据管理器

```bash
# 安装 Git Credential Manager（Windows 通常自带）
git config --global credential.helper manager
```

## 6. Node.js 安装

### 6.1 使用 fnm 管理多版本（推荐）

fnm（Fast Node Manager）是 Rust 编写的 Node.js 版本管理器，速度极快。

```powershell
# 安装 fnm
winget install Schniz.fnm

# 或通过 Scoop
scoop install fnm

# 配置 Shell 集成（在 PowerShell 配置文件中添加）
fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression

# 安装 LTS 版本
fnm install --lts

# 安装指定版本
fnm install 20
fnm install 22

# 切换版本
fnm use 20

# 设置默认版本
fnm default 20

# 查看已安装版本
fnm list
```

### 6.2 使用 Chocolatey/Scoop 安装

```powershell
# Chocolatey
choco install nodejs-lts -y

# Scoop
scoop install nodejs-lts
```

### 6.3 配置 npm 镜像

```bash
# 设置淘宝镜像
npm config set registry https://registry.npmmirror.com

# 验证
npm config get registry

# 使用 pnpm 替代 npm（可选但推荐）
npm install -g pnpm
pnpm config set registry https://registry.npmmirror.com
```

## 7. Python 安装

### 7.1 官网安装

1. 访问 <https://www.python.org/downloads>
2. 下载最新稳定版
3. 安装时**务必勾选** "Add Python to PATH"
4. 选择 "Customize installation" 可自定义安装路径

### 7.2 使用包管理器安装

```powershell
# Chocolatey
choco install python -y

# Scoop
scoop install python
```

### 7.3 使用 pyenv-win 管理多版本

```powershell
# 安装 pyenv-win
pip install pyenv-win --target "$HOME\.pyenv"

# 或通过 Scoop
scoop install pyenv

# 安装指定版本
pyenv install 3.12.4
pyenv install 3.11.9

# 设置全局版本
pyenv global 3.12.4

# 设置项目局部版本
pyenv local 3.11.9

# 查看已安装版本
pyenv versions
```

### 7.4 配置 pip 镜像

```bash
# 设置清华镜像
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 验证
pip config list
```

## 8. Java JDK 安装与配置

### 8.1 安装 JDK

```powershell
# Chocolatey 安装 OpenJDK 21
choco install openjdk21 -y

# Scoop 安装
scoop install openjdk21

# Oracle JDK 官网下载
# https://www.oracle.com/java/technologies/downloads

# GraalVM 官网下载
# https://www.graalvm.org/downloads
```

### 8.2 配置环境变量

```powershell
# 设置 JAVA_HOME（根据实际安装路径调整）
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Java\jdk-21", "Machine")

# 添加到 PATH
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
[Environment]::SetEnvironmentVariable("PATH", "$currentPath;%JAVA_HOME%\bin", "Machine")
```

### 8.3 验证安装

```bash
java -version
javac -version
```

### 8.4 管理多个 JDK 版本

如果需要同时安装多个 JDK 版本，可以通过修改 `JAVA_HOME` 指向不同版本来切换，或使用工具：

```powershell
# 使用 jabba 管理 JDK 版本
# https://github.com/shyiko/jabba
```

## 9. Docker Desktop 安装

### 9.1 系统要求

- Windows 10/11 Pro/Enterprise/Education（支持 Hyper-V）
- 或 Windows 10/11 Home（通过 WSL2 后端）
- 启用 WSL2

### 9.2 安装步骤

```powershell
# 方式一：Chocolatey
choco install docker-desktop -y

# 方式二：官网下载安装包
# https://www.docker.com/products/docker-desktop

# 方式三：winget
winget install Docker.DockerDesktop
```

### 9.3 配置 WSL2 后端

安装完成后，在 Docker Desktop → Settings → General 中：

- 勾选 "Use the WSL 2 based engine"
- 在 Resources → WSL Integration 中选择要集成的发行版

### 9.4 配置镜像加速

在 Docker Desktop → Settings → Docker Engine 中添加：

```json
{
  "registry-mirrors": ["https://mirror.ccs.tencentyun.com", "https://docker.mirrors.ustc.edu.cn"]
}
```

### 9.5 验证安装

```bash
docker --version
docker run hello-world
```

## 10. VS Code 安装与插件推荐

### 10.1 安装 VS Code

```powershell
# Chocolatey
choco install vscode -y

# Scoop
scoop install vscode

# winget
winget install Microsoft.VisualStudioCode

# 官网下载
# https://code.visualstudio.com
```

### 10.2 命令行集成

安装时勾选以下选项：

- 添加"通过 Code 打开"操作到 Windows 资源管理器文件上下文菜单
- 添加"通过 Code 打开"操作到 Windows 资源管理器目录上下文菜单
- 将 Code 注册为支持的文件类型的编辑器
- 添加到 PATH

安装完成后可在终端中使用：

```bash
code .          # 打开当前目录
code file.txt   # 打开指定文件
code --diff a.txt b.txt  # 对比两个文件
```

### 10.3 WSL 远程开发

安装 **WSL** 扩展后，可以在 WSL 环境中进行开发：

1. 安装扩展：在扩展面板搜索 "WSL" 并安装
2. 连接 WSL：按 `F1` → 输入 "WSL: Connect to WSL"
3. 或在 WSL 终端中输入 `code .` 自动连接

### 10.4 推荐插件

**通用工具**：

| 插件                       | 用途                            |
| -------------------------- | ------------------------------- |
| Chinese Language Pack      | 中文界面                        |
| GitLens — Git supercharged | Git 增强，查看代码作者、历史    |
| Prettier - Code formatter  | 代码格式化                      |
| EditorConfig for VS Code   | 统一编辑器配置                  |
| Error Lens                 | 行内显示错误信息                |
| Project Manager            | 快速切换项目                    |
| Thunder Client             | 轻量级 API 测试（替代 Postman） |

**前端开发**：

| 插件                      | 用途                           |
| ------------------------- | ------------------------------ |
| ESLint                    | JavaScript/TypeScript 代码检查 |
| Vue - Official            | Vue 3 语言支持（原 Volar）     |
| Tailwind CSS IntelliSense | Tailwind CSS 智能提示          |
| Auto Rename Tag           | 自动重命名配对标签             |
| CSS Peek                  | 快速跳转 CSS 定义              |
| Path Intellisense         | 路径自动补全                   |

**后端开发**：

| 插件                    | 用途                                            |
| ----------------------- | ----------------------------------------------- |
| Python                  | Python 语言支持                                 |
| Pylance                 | Python 类型检查与智能提示                       |
| Go                      | Go 语言支持                                     |
| Extension Pack for Java | Java 开发套件                                   |
| Docker                  | Docker 容器管理                                 |
| Database Client         | 数据库客户端（支持 MySQL/PostgreSQL/SQLite 等） |

**效率提升**：

| 插件                 | 用途              |
| -------------------- | ----------------- |
| GitHub Copilot       | AI 代码补全       |
| GitHub Pull Requests | PR 管理与代码审查 |
| Live Share           | 实时协作编程      |
| Remote - SSH         | 远程 SSH 开发     |
| Dev Containers       | 开发容器          |

### 10.5 推荐配置

在 `settings.json` 中添加：

```json
{
  "editor.fontSize": 14,
  "editor.lineHeight": 1.8,
  "editor.fontFamily": "'JetBrains Mono', 'Noto Sans SC', Consolas, monospace",
  "editor.fontLigatures": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.minimap.enabled": false,
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": "active",
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000,
  "terminal.integrated.defaultProfile.windows": "PowerShell",
  "workbench.iconTheme": "material-icon-theme"
}
```

> [!tip] 配置同步
> VS Code 支持 Settings Sync，通过 GitHub 或 Microsoft 账号同步你的设置、插件和快捷键到云端，换设备时一键恢复。
