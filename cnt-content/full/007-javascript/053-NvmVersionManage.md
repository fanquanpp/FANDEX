---
order: 530
title: nvm 版本管理
module: 'javascript'
category: 前端技术
difficulty: beginner
description: 使用 nvm/fnm 管理多版本 Node.js 的安装、切换与项目版本锁定。
author: fanquanpp
updated: '2026-08-29'
related:
  - 'javascript/052-NodeJsInstall'
  - 'javascript/054-NpmManager'
prerequisites:
  - 'shell/005-DevEnvSetup'
---

## nvm-windows 安装

**基本写法：查看 nvm 版本**
`nvm version`
```bash
# 验证 nvm-windows 是否安装成功
nvm version
```

---

**基本写法：安装指定 Node.js 版本**
`nvm install <版本号>`
```bash
# 安装指定版本的 Node.js
nvm install 24.18.1
```

---

**基本写法：安装最新 LTS 版本**
`nvm install lts`
```bash
# 安装最新长期支持版本
nvm install lts
```

---

**基本写法：安装最新稳定版**
`nvm install stable`
```bash
# 安装最新稳定版本
nvm install stable
```

---

## 版本切换

**基本写法：切换 Node.js 版本**
`nvm use <版本号>`
```bash
# 切换到已安装的指定版本
nvm use 24.18.1
```

---

**基本写法：查看已安装版本列表**
`nvm list`
```bash
# 列出所有已安装的 Node.js 版本
nvm list
```

---

**基本写法：设置默认版本**
`nvm alias default <版本号>`
```bash
# 设置默认使用的 Node.js 版本
nvm alias default 24.18.1
```

---

**基本写法：卸载 Node.js 版本**
`nvm uninstall <版本号>`
```bash
# 删除指定版本的 Node.js
nvm uninstall 14.21.3
```

---

## nvm（Linux/macOS）

**基本写法：安装 Node.js LTS**
`nvm install --lts`
```bash
# 安装最新 LTS 版本
nvm install --lts
```

---

**基本写法：使用指定版本**
`nvm use <版本号>`
```bash
# 在当前 shell 切换 Node.js 版本
nvm use 22
```

---

**基本写法：查看所有已安装版本**
`nvm ls`
```bash
# 列出本地已安装的所有版本
nvm ls
```

---

**基本写法：查看可安装版本**
`nvm ls-remote`
```bash
# 列出所有可安装的远程版本
nvm ls-remote
```

---

**基本写法：设置默认版本**
`nvm alias default <版本号>`
```bash
# 设置默认 Node.js 版本
nvm alias default 22
```

---

## 项目版本锁定

**基本写法：在项目目录锁定版本**
`nvm use <版本号>`
```bash
# 在项目根目录创建 .nvmrc 后自动切换
echo "22" > .nvmrc
```

---

**基本写法：自动使用 .nvmrc 中的版本**
`nvm use`
```bash
# 读取 .nvmrc 文件并切换到指定版本
nvm use
```

---

## fnm 替代方案

**基本写法：fnm 安装 Node.js LTS**
`fnm install --lts`
```bash
# 使用 fnm 安装 LTS 版本（跨平台更快）
fnm install --lts
```

---

**基本写法：fnm 切换版本**
`fnm use lts-latest`
```bash
# 切换到最新的 LTS 版本
fnm use lts-latest
```

---

**基本写法：fnm 设置默认版本**
`fnm default <别名>`
```bash
# 设置默认 Node.js 版本别名
fnm default lts-latest
```
