---
order: 520
title: Node.js 安装
module: 'javascript'
category: 前端技术
difficulty: beginner
description: Node.js 在 Windows、macOS、Linux 下的安装、版本管理与安装验证。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'shell/006-WindowsEnvConfigTutorial'
  - 'shell/007-MacOSEnvConfigTutorial'
  - 'shell/008-LinuxEnvConfigTutorial'
  - 'javascript/054-NpmManager'
  - 'javascript/053-NvmVersionManage'
prerequisites:
  - 'shell/005-DevEnvSetup'
---

## Windows 安装

**基本写法：winget 安装 Node.js LTS**
`winget install OpenJS.NodeJS.LTS`
```bash
# 通过 Windows 包管理器安装 LTS 版本
winget install OpenJS.NodeJS.LTS
```

---

**基本写法：winget 安装指定版本**
`winget install OpenJS.NodeJS -v <版本号>`
```bash
# 安装指定版本（如 22.11.0）
winget install OpenJS.NodeJS -v 22.11.0
```

---

**基本写法：升级 Node.js**
`winget upgrade OpenJS.NodeJS`
```bash
# 升级到最新版本
winget upgrade OpenJS.NodeJS
```

---

## macOS 安装

**基本写法：Homebrew 安装 Node.js**
`brew install node`
```bash
# 通过 Homebrew 安装最新版
brew install node
```

---

**基本写法：Homebrew 安装 LTS 版本**
`brew install node@22`
```bash
# 安装 LTS 长期支持版本
brew install node@22
```

---

**基本写法：升级 Node.js（macOS）**
`brew upgrade node`
```bash
# 通过 Homebrew 升级 Node.js
brew upgrade node
```

---

## Linux 安装（NodeSource）

**基本写法：Ubuntu/Debian 安装 LTS**
`curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -`
```bash
# 添加 NodeSource LTS 源（第一步）
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
```

---

**基本写法：apt 安装 Node.js**
`sudo apt-get install -y nodejs`
```bash
# 安装 Node.js 和 npm（第二步）
sudo apt-get install -y nodejs
```

---

## nvm 安装方式

**基本写法：nvm 安装脚本（Linux/macOS）**
`curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.6/install.sh | bash`
```bash
# 安装 nvm 版本管理器
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.6/install.sh | bash
```

---

**基本写法：加载 nvm**
`\. "$HOME/.nvm/nvm.sh"`
```bash
# 在当前 shell 中加载 nvm
\. "$HOME/.nvm/nvm.sh"
```

---

**基本写法：nvm 安装指定版本**
`nvm install <版本号>`
```bash
# 安装指定 Node.js 版本
nvm install 24
```

---

**基本写法：nvm 安装 LTS 版本**
`nvm install --lts`
```bash
# 安装最新 LTS 版本
nvm install --lts
```

---

## 安装验证

**基本写法：验证 Node.js 安装**
`node -v`
```bash
# 应输出 v24.18.1 类似版本号
node -v
```

---

**基本写法：验证 npm 安装**
`npm -v`
```bash
# 应输出 11.16.0 类似版本号
npm -v
```

---

**基本写法：运行测试脚本**
`node -e "console.log('Node.js 运行正常')"`
```bash
# 直接执行 Node.js 代码验证运行时
node -e "console.log('Node.js 运行正常')"
```
