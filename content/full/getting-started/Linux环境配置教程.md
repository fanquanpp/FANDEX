---
order: 103
title: Linux环境配置教程
module: 'getting-started'
category: toolchain
difficulty: beginner
description: 'Linux 开发环境完整配置指南，涵盖 apt/yum/pacman 包管理器、Git、Node.js（nvm）、Python（pyenv）、Java JDK、Docker、VS Code 安装与配置。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'getting-started/Windows环境配置教程'
  - 'getting-started/macOS环境配置教程'
prerequisites:
  - 'getting-started/入门指南'
---

## 1. 包管理器

Linux 发行版使用不同的包管理器，选择与你发行版对应的章节。

### 1.1 APT（Debian / Ubuntu）

```bash
# 更新软件源
sudo apt update

# 升级已安装包
sudo apt upgrade -y

# 安装软件包
sudo apt install build-essential -y

# 搜索软件包
apt search nodejs

# 卸载软件包
sudo apt remove nodejs -y

# 清理无用依赖
sudo apt autoremove -y

# 查看已安装包
dpkg -l | grep nodejs
```

### 1.2 YUM / DNF（Fedora / RHEL / CentOS）

```bash
# DNF 是 YUM 的下一代替代（Fedora 22+ / RHEL 8+）
# 更新软件源
sudo dnf check-update

# 升级已安装包
sudo dnf upgrade -y

# 安装软件包
sudo dnf install gcc make -y

# 搜索软件包
dnf search nodejs

# 卸载软件包
sudo dnf remove nodejs -y

# 清理缓存
sudo dnf clean all

# RHEL/CentOS 7 仍使用 yum
sudo yum install gcc make -y
```

### 1.3 Pacman（Arch Linux / Manjaro）

```bash
# 更新系统
sudo pacman -Syu

# 安装软件包
sudo pacman -S base-devel

# 搜索软件包
pacman -Ss nodejs

# 卸载软件包
sudo pacman -R nodejs

# 卸载软件包及其依赖
sudo pacman -Rs nodejs

# 清理缓存
sudo pacman -Sc

# 查看已安装包
pacman -Q | grep nodejs
```

### 1.4 配置国内镜像源（可选）

**Ubuntu（清华镜像）**：

```bash
sudo cp /etc/apt/sources.list /etc/apt/sources.list.bak
sudo sed -i 's|archive.ubuntu.com|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list
sudo sed -i 's|security.ubuntu.com|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list
sudo apt update
```

**Fedora（清华镜像）**：

```bash
sudo sed -e 's|^metalink=|#metalink=|g' \
         -e 's|^#baseurl=http://download.example/pub/fedora/linux|baseurl=https://mirrors.tuna.tsinghua.edu.cn/fedora|g' \
         -i.bak /etc/yum.repos.d/fedora.repo /etc/yum.repos.d/fedora-updates.repo
sudo dnf makecache
```

**Arch Linux（清华镜像）**：

```bash
sudo sed -i 's|Server = .*|Server = https://mirrors.tuna.tsinghua.edu.cn/archlinux/$repo/os/$arch|g' /etc/pacman.d/mirrorlist
sudo pacman -Sy
```

## 2. 基础开发工具

安装编译工具链（C/C++ 编译器、make 等）：

```bash
# Debian / Ubuntu
sudo apt install build-essential -y

# Fedora / RHEL
sudo dnf groupinstall "Development Tools" -y

# Arch Linux
sudo pacman -S base-devel
```

安装其他常用工具：

```bash
# Debian / Ubuntu
sudo apt install curl wget git vim unzip software-properties-common -y

# Fedora
sudo dnf install curl wget git vim unzip -y

# Arch Linux
sudo pacman -S curl wget git vim unzip
```

## 3. Git 安装与配置

### 3.1 安装 Git

```bash
# Debian / Ubuntu
sudo apt install git -y

# Fedora / RHEL
sudo dnf install git -y

# Arch Linux
sudo pacman -S git
```

### 3.2 初始配置

```bash
# 设置用户名和邮箱
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 设置默认分支名
git config --global init.defaultBranch main

# 设置默认编辑器
git config --global core.editor vim
# 或使用 VS Code
git config --global core.editor "code --wait"

# 设置换行符处理
git config --global core.autocrlf input

# 查看所有配置
git config --list --show-origin
```

### 3.3 生成 SSH 密钥

```bash
# 生成 Ed25519 密钥
ssh-keygen -t ed25519 -C "your.email@example.com"

# 启动 ssh-agent
eval "$(ssh-agent -s)"

# 添加密钥
ssh-add ~/.ssh/id_ed25519

# 查看公钥（复制到 GitHub/GitLab）
cat ~/.ssh/id_ed25519.pub
```

### 3.4 测试 SSH 连接

```bash
ssh -T git@github.com
```

### 3.5 配置凭据缓存

```bash
# 缓存凭据 1 小时
git config --global credential.helper cache --timeout=3600

# 或使用 libsecret（GNOME 桌面环境）
sudo apt install libsecret-1-0 libsecret-1-dev -y  # Debian/Ubuntu
make -C /usr/share/doc/git/contrib/credential/libsecret
git config --global credential.helper /usr/share/doc/git/contrib/credential/libsecret/git-credential-libsecret
```

## 4. Node.js 安装（nvm）

### 4.1 安装 nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# 或使用 wget
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

加载 nvm：

```bash
source ~/.bashrc    # Bash 用户
source ~/.zshrc     # Zsh 用户
```

### 4.2 安装 Node.js

```bash
# 安装最新 LTS
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
```

### 4.3 项目级版本管理

在项目根目录创建 `.nvmrc`：

```bash
echo "20" > .nvmrc
```

进入项目时自动切换版本（需在 shell 配置中添加）：

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
cdnvm() {
  cd "$@" && nvm use 2>/dev/null
}
alias cd='cdnvm'
```

### 4.4 配置 npm 镜像

```bash
npm config set registry https://registry.npmmirror.com

# 安装 pnpm（推荐）
npm install -g pnpm
pnpm config set registry https://registry.npmmirror.com
```

## 5. Python 安装（pyenv）

### 5.1 安装构建依赖

```bash
# Debian / Ubuntu
sudo apt install -y make build-essential libssl-dev zlib1g-dev \
  libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm \
  libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev \
  libffi-dev liblzma-dev

# Fedora
sudo dnf install -y gcc make zlib-devel bzip2-devel readline-devel \
  sqlite-devel openssl-devel tk-devel libffi-devel xz-devel

# Arch Linux
sudo pacman -S --needed base-devel openssl zlib bzip2 readline \
  sqlite ncurses xz tk
```

### 5.2 安装 pyenv

```bash
# 使用官方安装脚本
curl https://pyenv.run | bash
```

添加到 shell 配置（`~/.bashrc` 或 `~/.zshrc`）：

```bash
export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"
```

重启终端或执行 `source ~/.bashrc`。

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

### 5.4 安装 pipx

```bash
pip install pipx
pipx ensurepath
```

### 5.5 配置 pip 镜像

```bash
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
```

## 6. Java JDK 安装

### 6.1 使用包管理器安装

```bash
# Debian / Ubuntu — 安装 OpenJDK 21
sudo apt install openjdk-21-jdk -y

# Fedora
sudo dnf install java-21-openjdk-devel -y

# Arch Linux
sudo pacman -S jdk-openjdk
```

### 6.2 手动安装（通用方法）

```bash
# 下载 Adoptium Temurin JDK
# https://adoptium.net/temurin/releases

# 解压到 /opt
sudo tar -xzf OpenJDK21U-jdk_x64_linux_hotspot_21*.tar.gz -C /opt/

# 创建符号链接
sudo ln -s /opt/jdk-21* /opt/jdk-21
```

### 6.3 配置环境变量

在 `~/.bashrc` 或 `~/.zshrc` 中添加：

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64  # Debian/Ubuntu
# 或
export JAVA_HOME=/opt/jdk-21  # 手动安装

export PATH="$JAVA_HOME/bin:$PATH"
```

生效配置：

```bash
source ~/.bashrc
```

### 6.4 使用 jenv 管理多版本

```bash
# 安装 jenv
git clone https://github.com/jenv/jenv.git ~/.jenv

# 添加到 shell 配置
echo 'export PATH="$HOME/.jenv/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(jenv init -)"' >> ~/.bashrc
source ~/.bashrc

# 添加 JDK 版本
jenv add /usr/lib/jvm/java-21-openjdk-amd64
jenv add /usr/lib/jvm/java-17-openjdk-amd64

# 设置全局版本
jenv global 21

# 设置项目局部版本
jenv local 17

# 查看已注册版本
jenv versions
```

### 6.5 验证安装

```bash
java -version
javac -version
echo $JAVA_HOME
```

## 7. Docker 安装

### 7.1 Ubuntu / Debian

```bash
# 卸载旧版本
sudo apt remove docker docker-engine docker.io containerd runc -y 2>/dev/null

# 安装依赖
sudo apt install ca-certificates curl gnupg -y

# 添加 Docker 官方 GPG 密钥
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 添加 Docker 仓库
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker Engine
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
```

### 7.2 Fedora

```bash
sudo dnf install dnf-plugins-core -y
sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
sudo dnf install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
```

### 7.3 Arch Linux

```bash
sudo pacman -S docker docker-compose
```

### 7.4 配置用户权限

```bash
# 将当前用户添加到 docker 组（免 sudo）
sudo usermod -aG docker $USER

# 重新登录或执行以下命令使组变更生效
newgrp docker
```

### 7.5 启动 Docker 服务

```bash
# 启动
sudo systemctl start docker

# 设置开机自启
sudo systemctl enable docker

# 验证
docker --version
docker run hello-world
```

### 7.6 配置镜像加速

创建或编辑 `/etc/docker/daemon.json`：

```bash
sudo tee /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.mirrors.ustc.edu.cn"
  ]
}
EOF

# 重启 Docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

## 8. VS Code 安装

### 8.1 通过包管理器安装

**Debian / Ubuntu**：

```bash
# 添加 Microsoft GPG 密钥和仓库
sudo apt install wget gpg -y
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -D -o root -g root -m 644 packages.microsoft.gpg /etc/apt/keyrings/packages.microsoft.gpg
echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list
rm -f packages.microsoft.gpg

sudo apt update
sudo apt install code -y
```

**Fedora**：

```bash
sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc
sudo tee /etc/yum.repos.d/vscode.repo <<EOF
[code]
name=Visual Studio Code
baseurl=https://packages.microsoft.com/yumrepos/vscode
enabled=1
gpgcheck=1
gpgkey=https://packages.microsoft.com/keys/microsoft.asc
EOF

sudo dnf install code -y
```

**Arch Linux**：

```bash
# AUR 安装（使用 yay 或 paru）
yay -S visual-studio-code-bin
```

### 8.2 直接下载安装

```bash
# 下载 .deb 包（Debian/Ubuntu）
wget -O code.deb "https://code.visualstudio.com/sha/download?build=stable&os=linux-deb-x64"
sudo dpkg -i code.deb
sudo apt -f install -y

# 下载 .rpm 包（Fedora/RHEL）
wget -O code.rpm "https://code.visualstudio.com/sha/download?build=stable&os=linux-rpm-x64"
sudo rpm -i code.rpm
```

### 8.3 命令行集成

安装后可在终端使用：

```bash
code .          # 打开当前目录
code file.txt   # 打开指定文件
```

### 8.4 推荐插件

与 macOS/Windows 相同，常用插件包括：

| 插件                  | 用途            |
| --------------------- | --------------- |
| Chinese Language Pack | 中文界面        |
| GitLens               | Git 增强        |
| Prettier              | 代码格式化      |
| ESLint                | JS/TS 代码检查  |
| Python                | Python 语言支持 |
| Go                    | Go 语言支持     |
| Docker                | 容器管理        |
| Remote - SSH          | 远程开发        |

### 8.5 推荐配置

在 `settings.json` 中添加：

```json
{
  "editor.fontSize": 14,
  "editor.lineHeight": 1.8,
  "editor.fontFamily": "'JetBrains Mono', 'Noto Sans SC', 'Droid Sans Mono', monospace",
  "editor.fontLigatures": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.minimap.enabled": false,
  "editor.bracketPairColorization.enabled": true,
  "files.autoSave": "afterDelay",
  "terminal.integrated.defaultProfile.linux": "bash"
}
```

## 9. 常见问题排查

### 9.1 权限问题

```bash
# 修复文件所有者
sudo chown -R $USER:$USER ~/project

# 修复 npm 全局目录权限
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### 9.2 端口占用

```bash
# 查看端口占用
sudo lsof -i :3000
sudo ss -tlnp | grep 3000

# 终止占用进程
kill -9 <PID>
```

### 9.3 磁盘空间不足

```bash
# 查看磁盘使用
df -h

# 清理包管理器缓存
sudo apt clean          # Debian/Ubuntu
sudo dnf clean all      # Fedora
sudo pacman -Sc         # Arch

# 清理 Docker 资源
docker system prune -a
```

### 9.4 中文乱码

```bash
# 安装中文语言包
sudo apt install language-pack-zh-hans -y    # Debian/Ubuntu
sudo dnf install glibc-langpack-zh -y        # Fedora

# 设置系统语言
export LANG=zh_CN.UTF-8
echo 'export LANG=zh_CN.UTF-8' >> ~/.bashrc
```

> [!tip] 远程开发
> 如果你的开发环境在远程 Linux 服务器上，推荐使用 VS Code 的 **Remote - SSH** 扩展。本地 VS Code 通过 SSH 连接远程服务器，获得与本地开发相同的体验，而代码编译运行都在服务器端完成。
