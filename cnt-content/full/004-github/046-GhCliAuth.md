---
order: 460
title: GitHub CLI 认证配置
module: 'github'
category: 工具链
difficulty: beginner
description: GitHub CLI 认证配置 的完整教学讲解。
author: fanquanpp
updated: '2026-08-02'
related: []
prerequisites: []
---

## gh 安装

**基本写法：winget 安装 gh**
`winget install GitHub.cli`
```bash
# 通过 Windows 包管理器安装 GitHub CLI
winget install GitHub.cli
```

---

**基本写法：Homebrew 安装 gh**
`brew install gh`
```bash
# macOS 通过 Homebrew 安装
brew install gh
```

---

**基本写法：apt 安装 gh（Ubuntu）**
`sudo apt install gh`
```bash
# Ubuntu 系统安装 GitHub CLI
sudo apt install gh
```

---

**基本写法：升级 gh**
`winget upgrade GitHub.cli`
```bash
# 升级到最新版本
winget upgrade GitHub.cli
```

---

**基本写法：验证安装**
`gh --version`
```bash
# 查看 gh 版本验证安装
gh --version
```

---

## 认证登录

**基本写法：交互式登录**
`gh auth login`
```bash
# 通过浏览器交互式登录 GitHub
gh auth login
```

---

**基本写法：使用 token 登录**
`gh auth login --with-token < <token文件>`
```bash
# 通过 token 文件登录（适合脚本）
gh auth login --with-token < token.txt
```

---

**基本写法：通过环境变量登录**
`export GH_TOKEN=<token>`
```bash
# 设置环境变量后 gh 自动认证
export GH_TOKEN=ghp_xxxxxxxxxxxx
```

---

**基本写法：指定企业版登录**
`gh auth login --hostname <企业域名>`
```bash
# 登录 GitHub 企业版
gh auth login --hostname github.example.com
```

---

## 认证状态

**基本写法：查看认证状态**
`gh auth status`
```bash
# 查看当前登录状态和账户
gh auth status
```

---

**基本写法：查看 token**
`gh auth status --show-token`
```bash
# 查看认证状态并显示 token
gh auth status --show-token
```

---

**基本写法：获取当前 token**
`gh auth token`
```bash
# 输出当前 token 用于脚本
gh auth token
```

---

**基本写法：刷新 token 权限**
`gh auth refresh`
```bash
# 刷新凭证添加新的权限范围
gh auth refresh
```

---

**基本写法：添加指定权限**
`gh auth refresh -s <权限>`
```bash
# 添加 repo 和 workflow 权限
gh auth refresh -s repo,workflow
```

---

## 账户管理

**基本写法：切换账户**
`gh auth switch`
```bash
# 交互式切换到其他账户
gh auth switch
```

---

**基本写法：切换到指定账户**
`gh auth switch --user <用户名>`
```bash
# 切换到指定用户账户
gh auth switch --user alice
```

---

**基本写法：登出**
`gh auth logout`
```bash
# 登出当前 GitHub 账户
gh auth logout
```

---

**基本写法：登出指定账户**
`gh auth logout --user <用户名>`
```bash
# 登出指定用户账户
gh auth logout --user alice
```

---

## SSH 密钥管理

**基本写法：上传 SSH 密钥**
`gh ssh-key add <密钥文件>`
```bash
# 上传公钥到 GitHub 账户
gh ssh-key add ~/.ssh/id_ed25519.pub
```

---

**基本写法：上传并添加标题**
`gh ssh-key add <密钥文件> --title "<标题>"`
```bash
# 上传公钥并设置标题
gh ssh-key add ~/.ssh/id_ed25519.pub --title "我的笔记本"
```

---

**基本写法：查看已上传的密钥**
`gh ssh-key list`
```bash
# 列出 GitHub 账户中的所有 SSH 密钥
gh ssh-key list
```

---

**基本写法：删除 SSH 密钥**
`gh ssh-key delete <密钥ID>`
```bash
# 删除指定的 SSH 密钥
gh ssh-key delete 12345
```

---

## 配置管理

**基本写法：设置默认编辑器**
`gh config set editor "<编辑器命令>"`
```bash
# 设置 VS Code 为默认编辑器
gh config set editor "code --wait"
```

---

**基本写法：设置默认浏览器**
`gh config set browser "<浏览器>"`
```bash
# 设置 Firefox 为默认浏览器
gh config set browser firefox
```

---

**基本写法：设置默认协议**
`gh config set git_protocol <协议>`
```bash
# 设置默认 Git 协议为 SSH
gh config set git_protocol ssh
```

---

**基本写法：查看配置**
`gh config get <配置项>`
```bash
# 查看指定配置项的值
gh config get editor
```

---

**基本写法：查看所有配置**
`gh config list`
```bash
# 列出所有 gh 配置
gh config list
```

---

## 帮助与参考

**基本写法：查看 gh 帮助**
`gh --help`
```bash
# 查看 gh 顶层帮助
gh --help
```

---

**基本写法：查看命令帮助**
`gh <命令> --help`
```bash
# 查看指定命令的详细帮助
gh pr --help
```

---

**基本写法：查看命令参考**
`gh reference`
```bash
# 输出所有命令的完整参考
gh reference
```

---

**基本写法：在浏览器中打开**
`gh <命令> --web`
```bash
# 在浏览器中打开对应页面
gh repo view --web
```
