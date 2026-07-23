---
order: 55
title: 包管理器
module: 'getting-started'
category: 入门指南
difficulty: beginner
description: 主流包管理器对比：npm、pip、apt、brew的工作原理与使用方法。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'getting-started/插件生态'
  - 'getting-started/命令行基础'
  - 'getting-started/版本控制系统选型'
  - 'getting-started/项目初始化'
prerequisites:
  - 'getting-started/入门指南'
---

## 1. 包管理器概述

### 1.1 什么是包管理器

包管理器是自动化软件**安装、更新、配置和卸载**的工具。它解决的核心问题：

- **依赖管理**：自动解析和安装依赖链
- **版本控制**：确保安装正确版本的软件包
- **安全验证**：校验包的完整性和来源
- **统一管理**：提供查询、更新、卸载的统一接口

### 1.2 包管理器分类

| 类型       | 代表            | 管理对象        | 作用域    |
| :--------- | :-------------- | :-------------- | :-------- |
| **系统级** | apt、yum、brew  | 系统软件        | 全局      |
| **语言级** | npm、pip、cargo | 语言库/框架     | 项目/全局 |
| **前端**   | npm、yarn、pnpm | 前端依赖        | 项目      |
| **容器**   | Helm            | Kubernetes 应用 | 集群      |

### 1.3 依赖解析原理

包管理器需要解决**依赖地狱**问题——不同包可能要求同一依赖的不同版本：

```
项目依赖 A@1.0 和 B@1.0
A@1.0 依赖 C@1.x
B@1.0 依赖 C@2.x
→ 冲突！C 不能同时是 1.x 和 2.x
```

解决策略：

- **扁平化**（npm v3+）：尽量将依赖提升到顶层
- **符号链接**（pnpm）：内容寻址存储，硬链接共享
- **锁定文件**：`package-lock.json`、`yarn.lock` 固定精确版本

## 2. npm（Node.js）

### 2.1 核心概念

npm 是 Node.js 的默认包管理器，拥有全球最大的开源注册表（超过 200 万个包）。

```bash
# 初始化项目
npm init                    # 交互式创建 package.json
npm init -y                 # 使用默认值

# 安装依赖
npm install                 # 安装所有依赖
npm install express         # 安装生产依赖
npm install -D jest         # 安装开发依赖
npm install -g typescript   # 全局安装

# 版本管理
npm update                  # 更新所有依赖
npm outdated                # 检查过时的依赖
npm audit                   # 安全审计
npm audit fix               # 自动修复安全漏洞

# 运行脚本
npm run dev                 # 运行 dev 脚本
npm run build               # 运行 build 脚本
npm start                   # 运行 start 脚本
```

### 2.2 package.json 详解

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "A sample project",
  "main": "index.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest",
    "lint": "eslint src/"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "eslint": "^8.50.0",
    "vitest": "^0.34.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 2.3 语义化版本（SemVer）

版本号格式：`主版本号.次版本号.修订号`（`MAJOR.MINOR.PATCH`）

| 符号 | 含义     | 示例      | 允许范围         |
| :--- | :------- | :-------- | :--------------- |
| `^`  | 兼容版本 | `^1.2.3`  | `>=1.2.3 <2.0.0` |
| `~`  | 近似版本 | `~1.2.3`  | `>=1.2.3 <1.3.0` |
| 无   | 精确版本 | `1.2.3`   | 仅 `1.2.3`       |
| `*`  | 任意版本 | `*`       | 任意版本         |
| `>=` | 最低版本 | `>=1.2.0` | `1.2.0` 及以上   |

### 2.4 npm 替代方案

| 工具     | 特点                      | 安装速度 | 磁盘占用 |
| :------- | :------------------------ | :------- | :------- |
| **npm**  | Node.js 自带              | 基准     | 基准     |
| **yarn** | Facebook 出品，确定性安装 | 快       | 相近     |
| **pnpm** | 内容寻址存储，硬链接      | 最快     | 最省     |

```bash
# pnpm 核心优势
pnpm install               # 硬链接共享，跨项目复用
pnpm add express           # 添加依赖
pnpm -r run build          # 在所有子包中运行

# pnpm 节省空间原理
# 所有包存储在全局 store
# 项目 node_modules 通过硬链接引用
# 10 个项目用同一版本的 lodash → 磁盘只存一份
```

## 3. pip（Python）

### 3.1 核心操作

```bash
# 安装包
pip install requests              # 安装最新版
pip install requests==2.31.0      # 安装指定版本
pip install requests>=2.28.0      # 安装最低版本

# 管理依赖
pip install -r requirements.txt   # 从文件安装
pip freeze > requirements.txt     # 导出当前依赖
pip list                          # 列出已安装的包
pip show requests                 # 查看包详情

# 更新与卸载
pip install --upgrade requests    # 升级包
pip uninstall requests            # 卸载包
```

### 3.2 虚拟环境

虚拟环境是 Python 的**项目隔离机制**，每个项目拥有独立的包目录：

```bash
# venv（Python 内置）
python -m venv .venv             # 创建虚拟环境
source .venv/bin/activate        # 激活（Linux/macOS）
.venv\Scripts\activate           # 激活（Windows）
deactivate                       # 退出虚拟环境

# conda（数据科学常用）
conda create -n myenv python=3.12  # 创建环境
conda activate myenv               # 激活
conda env export > environment.yml # 导出
```

### 3.3 pyproject.toml（现代标准）

```toml
# pyproject.toml - PEP 621 标准
[project]
name = "my-project"
version = "1.0.0"
description = "A sample Python project"
requires-python = ">=3.10"
dependencies = [
    "requests>=2.28.0",
    "fastapi>=0.100.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "ruff>=0.1.0",
]

[tool.ruff]
line-length = 88
```

### 3.4 pip 替代方案

| 工具       | 特点                 | 速度    |
| :--------- | :------------------- | :------ |
| **pip**    | Python 官方包管理器  | 基准    |
| **uv**     | Rust 编写，极快      | 10-100x |
| **poetry** | 依赖管理与打包一体化 | 中等    |
| **pipenv** | Pipfile + 虚拟环境   | 中等    |

## 4. apt（Debian/Ubuntu）

### 4.1 核心操作

```bash
# 更新软件源
sudo apt update                  # 刷新包索引

# 安装与卸载
sudo apt install nginx           # 安装包
sudo apt remove nginx            # 卸载包（保留配置）
sudo apt purge nginx             # 卸载包（删除配置）
sudo apt autoremove              # 清理不再需要的依赖

# 搜索与查询
apt search nginx                 # 搜索包
apt show nginx                   # 查看包详情
apt list --installed             # 列出已安装的包

# 更新系统
sudo apt upgrade                 # 升级所有可升级的包
sudo apt full-upgrade            # 升级并处理依赖变更
```

### 4.2 软件源配置

```bash
# /etc/apt/sources.list
deb http://archive.ubuntu.com/ubuntu/ jammy main restricted
deb http://archive.ubuntu.com/ubuntu/ jammy-updates main restricted
deb http://security.ubuntu.com/ubuntu/ jammy-security main restricted

# 添加第三方 PPA
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install python3.12
```

## 5. Homebrew（macOS/Linux）

### 5.1 核心操作

```bash
# 安装
brew install node                # 安装包
brew install --cask firefox      # 安装 GUI 应用

# 管理
brew update                      # 更新 Homebrew 自身和索引
brew upgrade                     # 升级所有过时的包
brew upgrade node                # 升级指定包
brew uninstall node              # 卸载包

# 查询
brew search node                 # 搜索包
brew info node                   # 查看包详情
brew list                        # 列出已安装的包
brew outdated                    # 查看过时的包

# 维护
brew cleanup                     # 清理旧版本缓存
brew doctor                      # 诊断问题
```

### 5.2 Brewfile 批量管理

```ruby
# Brewfile
tap "homebrew/cask"
tap "homebrew/core"

# 命令行工具
brew "git"
brew "node"
brew "python"
brew "ffmpeg"

# GUI 应用
cask "visual-studio-code"
cask "firefox"
cask "docker"

# 执行: brew bundle install
# 导出: brew bundle dump
```

## 6. 最佳实践

### 6.1 通用原则

1. **锁定版本**：始终使用锁定文件（`package-lock.json`、`yarn.lock`）
2. **最小依赖**：只安装必要的包，减少攻击面
3. **定期更新**：及时更新依赖，修复安全漏洞
4. **安全审计**：定期运行 `npm audit` / `pip audit`
5. **私有源**：企业环境使用私有注册表（Verdaccio、Nexus）

### 6.2 依赖安全

```bash
# npm 安全检查
npm audit                       # 检查已知漏洞
npm audit fix                   # 自动修复
npx npm-check-updates -u        # 交互式更新

# Python 安全检查
pip audit                       # 检查已知漏洞
safety check                    # 另一个安全检查工具
```

### 6.3 Monorepo 依赖管理

```bash
# pnpm workspace
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'

# 工作区操作
pnpm -r install                 # 安装所有子项目依赖
pnpm -r run build               # 在所有子项目运行构建
pnpm --filter app1 run dev      # 只运行指定项目
```
