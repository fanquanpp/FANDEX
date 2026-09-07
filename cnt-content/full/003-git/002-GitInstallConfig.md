---
order: 20
title: Git 安装配置
module: 'git'
category: 工具链
difficulty: beginner
description: Git 在主流系统下的安装与用户信息、别名等基础配置。
author: fanquanpp
updated: '2026-08-29'
related:
  - 'shell/006-WindowsEnvConfigTutorial'
  - 'shell/007-MacOSEnvConfigTutorial'
  - 'shell/008-LinuxEnvConfigTutorial'
prerequisites:
  - 'shell/005-DevEnvSetup'
---

## Windows 安装

**基本写法：winget 安装 Git**
`winget install Git.Git`
```bash
# 通过 Windows 包管理器安装 Git
winget install Git.Git
```

---

**基本写法：winget 安装指定版本**
`winget install Git.Git -v <版本号>`
```bash
# 安装指定版本的 Git
winget install Git.Git -v 2.45.0
```

---

**基本写法：升级 Git**
`winget upgrade Git.Git`
```bash
# 升级 Git 到最新版本
winget upgrade Git.Git
```

---

## macOS 安装

**基本写法：Homebrew 安装 Git**
`brew install git`
```bash
# 通过 Homebrew 安装 Git
brew install git
```

---

**基本写法：升级 Git（macOS）**
`brew upgrade git`
```bash
# 通过 Homebrew 升级 Git
brew upgrade git
```

---

## Linux 安装

**基本写法：apt 安装 Git（Ubuntu/Debian）**
`sudo apt-get install git`
```bash
# 通过 apt 安装 Git
sudo apt-get install git
```

---

**基本写法：yum 安装 Git（CentOS/RHEL）**
`sudo yum install git`
```bash
# 通过 yum 安装 Git
sudo yum install git
```

---

**基本写法：dnf 安装 Git（Fedora）**
`sudo dnf install git`
```bash
# 通过 dnf 安装 Git
sudo dnf install git
```

---

## 用户信息配置

**基本写法：设置全局用户名**
`git config --global user.name "<用户名>"`
```bash
# 设置 Git 提交者用户名
git config --global user.name "张三"
```

---

**基本写法：设置全局邮箱**
`git config --global user.email "<邮箱>"`
```bash
# 设置 Git 提交者邮箱
git config --global user.email "zhangsan@example.com"
```

---

**基本写法：设置仓库级用户名**
`git config user.name "<用户名>"`
```bash
# 仅对当前仓库设置用户名
git config user.name "李四"
```

---

**基本写法：查看所有配置**
`git config --list`
```bash
# 查看所有 Git 配置项
git config --list
```

---

**基本写法：查看特定配置**
`git config user.name`
```bash
# 查看当前用户名配置
git config user.name
```

---

## 编辑器与默认分支配置

**基本写法：设置默认编辑器**
`git config --global core.editor "<编辑器命令>"`
```bash
# 设置 VS Code 为默认编辑器
git config --global core.editor "code --wait"
```

---

**基本写法：设置默认分支名**
`git config --global init.defaultBranch <分支名>`
```bash
# 设置新仓库默认分支为 main
git config --global init.defaultBranch main
```

---

**基本写法：设置 vim 为编辑器**
`git config --global core.editor "vim"`
```bash
# 设置 vim 为默认编辑器
git config --global core.editor "vim"
```

---

## 命令别名配置

**基本写法：设置命令别名**
`git config --global alias.<别名> "<命令>"`
```bash
# 为 status 命令设置别名 st
git config --global alias.st status
```

---

**基本写法：常用别名批量设置**
`git config --global alias.<别名> "<命令>"`
```bash
# 设置常用命令别名
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
```

---

**基本写法：删除别名**
`git config --global --unset alias.<别名>`
```bash
# 删除已设置的命令别名
git config --global --unset alias.st
```

---

## 安装验证

**基本写法：验证 Git 安装**
`git --version`
```bash
# 应输出 git version 2.45.0 类似信息
git --version
```

---

**基本写法：查看 Git 帮助**
`git --help`
```bash
# 查看 Git 顶层帮助文档
git --help
```

---

**基本写法：查看特定命令帮助**
`git help <命令>`
```bash
# 查看 commit 命令的详细帮助
git help commit
```
