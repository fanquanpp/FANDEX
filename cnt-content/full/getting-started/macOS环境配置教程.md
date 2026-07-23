---
order: 102
title: macOS环境配置教程
module: 'getting-started'
category: toolchain
difficulty: beginner
description: 'macOS 开发环境完整配置指南，涵盖 Homebrew、Xcode Command Line Tools、Git、Node.js（nvm）、Python（pyenv）、Java JDK、Docker Desktop、VS Code 安装与配置。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'getting-started/软件下载地址汇总'
  - 'getting-started/Windows环境配置教程'
  - 'getting-started/Linux环境配置教程'
prerequisites:
  - 'getting-started/入门指南'
---

## 1. Homebrew 安装

Homebrew 是 macOS 上最流行的包管理器，是配置开发环境的基础。

### 1.1 安装 Homebrew

打开终端（Terminal），执行：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

对于 Apple Silicon（M1/M2/M3/M4）Mac，安装完成后需手动添加到 PATH：

```bash
# 添加到 shell 配置文件（zsh）
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
eval "$(/opt/homebrew/bin/brew shellenv)"
```

对于 Intel Mac，Homebrew 默认安装在 `/usr/local`，无需额外配置。

### 1.2 验证安装

```bash
brew --version
brew doctor
```

### 1.3 常用命令

```bash
# 搜索软件包
brew search node

# 安装软件包
brew install git
brew install wget
brew install tree

# 安装 GUI 应用（cask）
brew install --cask visual-studio-code
brew install --cask docker
brew install --cask google-chrome

# 更新 Homebrew 和所有已安装包
brew update && brew upgrade

# 查看已安装包
brew list

# 清理旧版本缓存
brew cleanup

# 查看包信息
brew info node

# 卸载包
brew uninstall node
```

### 1.4 配置国内镜像（可选）

```bash
# 设置中科大镜像
export HOMEBREW_API_DOMAIN="https://mirrors.ustc.edu.cn/homebrew-bottles/api"
export HOMEBREW_BOTTLE_DOMAIN="https://mirrors.ustc.edu.cn/homebrew-bottles"
export HOMEBREW_BREW_GIT_REMOTE="https://mirrors.ustc.edu.cn/brew.git"
export HOMEBREW_CORE_GIT_REMOTE="https://mirrors.ustc.edu.cn/homebrew-core.git"

# 永久生效（添加到 ~/.zshrc）
echo 'export HOMEBREW_API_DOMAIN="https://mirrors.ustc.edu.cn/homebrew-bottles/api"' >> ~/.zshrc
echo 'export HOMEBREW_BOTTLE_DOMAIN="https://mirrors.ustc.edu.cn/homebrew-bottles"' >> ~/.zshrc
echo 'export HOMEBREW_BREW_GIT_REMOTE="https://mirrors.ustc.edu.cn/brew.git"' >> ~/.zshrc
echo 'export HOMEBREW_CORE_GIT_REMOTE="https://mirrors.ustc.edu.cn/homebrew-core.git"' >> ~/.zshrc
```

## 2. Xcode Command Line Tools

Xcode Command Line Tools 包含 Git、make、gcc 等基础开发工具，无需安装完整 Xcode。

### 2.1 安装

```bash
xcode-select --install
```

弹出安装对话框，点击"安装"即可。

### 2.2 验证安装

```bash
xcode-select -p
# 应输出：/Library/Developer/CommandLineTools

# 验证 Git
git --version

# 验证编译工具
cc --version
```

### 2.3 完整 Xcode（可选）

如需进行 iOS/macOS 开发，从 App Store 安装完整 Xcode。

> [!note] 磁盘空间
> Xcode Command Line Tools 约需 1.5GB 磁盘空间，完整 Xcode 约需 12GB+。如不做 Apple 平台开发，仅安装 Command Line Tools 即可。

## 3. Git 配置

macOS 通过 Xcode Command Line Tools 自带 Git，无需单独安装。

### 3.1 初始配置

```bash
# 设置用户名和邮箱
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 设置默认分支名
git config --global init.defaultBranch main

# 设置默认编辑器
git config --global core.editor "code --wait"

# 设置换行符处理（macOS 推荐）
git config --global core.autocrlf input

# 查看所有配置
git config --list --show-origin
```

### 3.2 生成 SSH 密钥

```bash
# 生成 Ed25519 密钥（推荐）
ssh-keygen -t ed25519 -C "your.email@example.com"

# macOS 会自动启动 ssh-agent
# 将密钥添加到钥匙串（推荐，重启后无需重新输入密码）
ssh-add --apple-use-keychain ~/.ssh/id_ed25519

# 查看公钥（复制到 GitHub/GitLab）
cat ~/.ssh/id_ed25519.pub
```

### 3.3 测试 SSH 连接

```bash
ssh -T git@github.com
# 首次连接需确认指纹，输入 yes
```

### 3.4 配置凭据管理

macOS 可以使用系统钥匙串存储 Git 凭据：

```bash
git config --global credential.helper osxkeychain
```

## 4. Node.js 安装（nvm）

nvm（Node Version Manager）是管理 Node.js 版本的标准工具。

### 4.1 安装 nvm

```bash
# 使用官方安装脚本
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# 或使用 Homebrew
brew install nvm
```

安装完成后，重启终端或执行：

```bash
source ~/.zshrc
```

### 4.2 安装 Node.js

```bash
# 安装最新 LTS 版本
nvm install --lts

# 安装指定版本
nvm install 20
nvm install 22

# 切换版本
nvm use 20

# 设置默认版本
nvm alias default 20

# 查看已安装版本
nvm list

# 查看可安装版本
nvm ls-remote --lts
```

### 4.3 项目级版本管理

在项目根目录创建 `.nvmrc` 文件：

```bash
echo "20" > .nvmrc
```

进入项目目录时执行：

```bash
nvm use
```

### 4.4 配置 npm 镜像

```bash
# 设置淘宝镜像
npm config set registry https://registry.npmmirror.com

# 使用 pnpm 替代 npm（推荐）
npm install -g pnpm
pnpm config set registry https://registry.npmmirror.com
```

## 5. Python 安装（pyenv）

pyenv 是管理多版本 Python 的最佳工具，不会破坏系统自带的 Python。

### 5.1 安装 pyenv

```bash
# 使用 Homebrew
brew install pyenv

# 添加到 shell 配置
echo 'export PYENV_ROOT="$HOME/.pyenv"' >> ~/.zshrc
echo '[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(pyenv init -)"' >> ~/.zshrc

# 重启终端
source ~/.zshrc
```

### 5.2 安装构建依赖

```bash
brew install openssl readline sqlite3 xz zlib tcl-tk
```

### 5.3 安装 Python

```bash
# 查看可安装版本
pyenv install --list | grep "  3\."

# 安装指定版本
pyenv install 3.12.4
pyenv install 3.11.9

# 设置全局版本
pyenv global 3.12.4

# 设置项目局部版本
pyenv local 3.11.9

# 查看已安装版本
pyenv versions

# 验证
python --version
which python
```

### 5.4 安装 pipx（推荐）

pipx 用于在隔离环境中安装 Python CLI 工具：

```bash
brew install pipx
pipx ensurepath
```

### 5.5 配置 pip 镜像

```bash
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
```

## 6. Java JDK 安装

### 6.1 使用 Homebrew 安装

```bash
# 安装 OpenJDK（最新 LTS）
brew install openjdk@21

# 安装其他版本
brew install openjdk@17
brew install openjdk@11

# 创建符号链接
sudo ln -sfn $(brew --prefix openjdk@21)/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk
```

### 6.2 配置环境变量

```bash
# 添加到 ~/.zshrc
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 21)' >> ~/.zshrc
source ~/.zshrc
```

### 6.3 使用 jenv 管理多版本

```bash
# 安装 jenv
brew install jenv

# 添加到 shell 配置
echo 'export PATH="$HOME/.jenv/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(jenv init -)"' >> ~/.zshrc
source ~/.zshrc

# 添加已安装的 JDK
jenv add /Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home
jenv add /Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home

# 设置全局版本
jenv global 21

# 设置项目局部版本
jenv local 17

# 查看已注册版本
jenv versions
```

### 6.4 验证安装

```bash
java -version
javac -version
echo $JAVA_HOME
```

## 7. Docker Desktop 安装

### 7.1 安装

```bash
# 使用 Homebrew Cask
brew install --cask docker

# 或从官网下载
# https://www.docker.com/products/docker-desktop
```

### 7.2 启动与配置

1. 从"应用程序"或 Launchpad 启动 Docker
2. 首次启动需输入密码授权
3. 等待 Docker Engine 启动完成（菜单栏鲸鱼图标稳定）

### 7.3 配置镜像加速

点击 Docker Desktop → Settings → Docker Engine，添加：

```json
{
  "registry-mirrors": ["https://mirror.ccs.tencentyun.com", "https://docker.mirrors.ustc.edu.cn"]
}
```

### 7.4 验证安装

```bash
docker --version
docker run hello-world
```

## 8. VS Code 安装与配置

### 8.1 安装

```bash
# 使用 Homebrew Cask
brew install --cask visual-studio-code

# 或从官网下载
# https://code.visualstudio.com
```

### 8.2 命令行集成

安装后打开 VS Code，按 `Cmd + Shift + P`，输入 "Shell Command: Install 'code' command in PATH"。

之后可在终端中使用：

```bash
code .          # 打开当前目录
code file.txt   # 打开指定文件
code --diff a.txt b.txt  # 对比文件
```

### 8.3 推荐插件

**通用工具**：

| 插件                  | 用途           |
| --------------------- | -------------- |
| Chinese Language Pack | 中文界面       |
| GitLens               | Git 增强       |
| Prettier              | 代码格式化     |
| EditorConfig          | 统一编辑器配置 |
| Error Lens            | 行内显示错误   |
| Thunder Client        | 轻量 API 测试  |

**前端开发**：

| 插件                      | 用途               |
| ------------------------- | ------------------ |
| ESLint                    | JS/TS 代码检查     |
| Vue - Official            | Vue 3 语言支持     |
| Tailwind CSS IntelliSense | Tailwind 智能提示  |
| Auto Rename Tag           | 自动重命名配对标签 |

**后端开发**：

| 插件                    | 用途            |
| ----------------------- | --------------- |
| Python                  | Python 语言支持 |
| Pylance                 | Python 类型检查 |
| Go                      | Go 语言支持     |
| Extension Pack for Java | Java 开发套件   |
| Docker                  | 容器管理        |

### 8.4 推荐配置

在 `settings.json` 中添加：

```json
{
  "editor.fontSize": 14,
  "editor.lineHeight": 1.8,
  "editor.fontFamily": "'JetBrains Mono', 'Noto Sans SC', Menlo, monospace",
  "editor.fontLigatures": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.minimap.enabled": false,
  "editor.bracketPairColorization.enabled": true,
  "files.autoSave": "afterDelay",
  "terminal.integrated.defaultProfile.osx": "zsh"
}
```

## 9. 终端增强

### 9.1 Oh My Zsh

macOS 默认使用 Zsh，Oh My Zsh 提供丰富的主题和插件：

```bash
# 安装 Oh My Zsh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

### 9.2 推荐插件

在 `~/.zshrc` 中配置：

```bash
plugins=(
  git
  zsh-autosuggestions
  zsh-syntax-highlighting
  z
  sudo
  copypath
  dirhistory
)
```

安装第三方插件：

```bash
# zsh-autosuggestions（命令自动建议）
git clone https://github.com/zsh-users/zsh-autosuggestions ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-autosuggestions

# zsh-syntax-highlighting（语法高亮）
git clone https://github.com/zsh-users/zsh-syntax-highlighting ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
```

### 9.3 推荐主题

```bash
# Powerlevel10k（最流行的 Zsh 主题）
git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/themes/powerlevel10k
```

在 `~/.zshrc` 中设置：

```bash
ZSH_THEME="powerlevel10k/powerlevel10k"
```

重启终端后按向导配置主题样式。

> [!tip] 字体支持
> Powerlevel10k 等主题需要 Nerd Font 才能正确显示图标。推荐安装 MesloLGS NF：
>
> ```bash
> brew install --cask font-meslo-lg-nerd-font
> ```
>
> 然后在 VS Code 设置中将终端字体设为 `MesloLGS NF`。

## 10. 一键环境搭建脚本

将以下内容保存为 `setup-macos.sh` 并执行：

```bash
#!/bin/bash
set -e

echo "==> 安装 Xcode Command Line Tools..."
xcode-select --install 2>/dev/null || echo "已安装"

echo "==> 安装 Homebrew..."
if ! command -v brew &> /dev/null; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh.sh)"
fi

echo "==> 安装基础工具..."
brew install git wget curl tree jq

echo "==> 安装 Node.js (nvm)..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.zshrc
nvm install --lts

echo "==> 安装 Python (pyenv)..."
brew install pyenv openssl readline sqlite3 xz zlib
pyenv install 3.12.4
pyenv global 3.12.4

echo "==> 安装 Java JDK..."
brew install openjdk@21
sudo ln -sfn $(brew --prefix openjdk@21)/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-21.jdk

echo "==> 安装 Docker Desktop..."
brew install --cask docker

echo "==> 安装 VS Code..."
brew install --cask visual-studio-code

echo "==> 环境搭建完成！"
echo "请重启终端使所有配置生效。"
```

```bash
chmod +x setup-macos.sh
./setup-macos.sh
```
