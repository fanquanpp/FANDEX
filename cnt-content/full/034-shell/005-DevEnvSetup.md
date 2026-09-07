---
order: 50
title: 开发环境搭建
module: 'shell'
category: 工具链
difficulty: beginner
description: 从零开始选择操作系统、安装编辑器和配置终端环境。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'cs-fundamentals/002-ComputerArchitectureBasics'
prerequisites: []
---

## 1. 选择操作系统

三大主流操作系统均可用于开发:

| 系统    | 优势                     | 适合场景                     |
| ------- | ------------------------ | ---------------------------- |
| Windows | 软件生态丰富, 游戏兼容好 | .NET开发、企业办公、通用开发 |
| macOS   | Unix底层, 前端工具链完善 | 前端开发、iOS开发、设计      |
| Linux   | 免费开源, 服务器环境一致 | 后端开发、运维、嵌入式       |

> 如果你是0基础, 使用当前电脑即可, 不需要专门更换操作系统. Windows用户可以通过WSL获得Linux环境.

## 2. 安装代码编辑器

推荐使用 **Visual Studio Code** (VS Code), 免费且功能强大.

### 2.1 下载安装

1. 访问 https://code.visualstudio.com
2. 点击下载对应系统版本
3. 运行安装程序, 勾选"添加到PATH"选项

### 2.2 必装扩展

安装完成后, 点击左侧扩展图标, 搜索并安装:

- **Chinese Language Pack** - 中文界面
- **GitLens** - Git增强工具
- **Prettier** - 代码格式化
- **ESLint** - JavaScript代码检查

## 3. 终端基础

终端是开发者最重要的工具之一.

### 3.1 打开终端

| 系统    | 方式                         |
| ------- | ---------------------------- |
| Windows | `Win + R` 输入 `powershell`  |
| macOS   | `Cmd + 空格` 输入 `terminal` |
| Linux   | `Ctrl + Alt + T`             |

### 3.2 常用命令

```bash
pwd           # 显示当前目录
ls            # 列出文件 (Windows: dir)
cd Documents  # 进入目录
cd ..         # 返回上级目录
mkdir project # 创建目录
clear         # 清屏 (Windows: cls)
```

### 3.3 Windows用户: 启用WSL

WSL (Windows Subsystem for Linux) 让你在Windows上运行Linux环境:

```powershell
wsl --install
```

安装后重启电脑, 即可使用Ubuntu终端.

## 4. 安装Git

Git是版本控制的基础工具, 后续模块会详细讲解.

### 4.1 安装方式

| 系统    | 命令                     |
| ------- | ------------------------ |
| Windows | 下载 https://git-scm.com |
| macOS   | `brew install git`       |
| Linux   | `sudo apt install git`   |

### 4.2 验证安装

```bash
git --version
```

显示版本号即安装成功.

## 5. 下一步

环境准备完成后, 建议按以下顺序开始学习:

1. **Markdown** - 学习文档编写基础
2. **Git** - 掌握版本控制
3. **GitHub** - 学会代码协作
## 工具链组成

**基本写法：查看 Node.js 版本**
`node --version`
```bash
# 验证 Node.js 是否安装成功
node --version
```

---

**基本写法：查看 Python 版本**
`python --version`
```bash
# 验证 Python 是否安装成功
python --version
```

---

**基本写法：查看 Java 版本**
`java -version`
```bash
# 验证 JDK 是否安装成功
java -version
```

---

**基本写法：查看 Git 版本**
`git --version`
```bash
# 验证 Git 是否安装成功
git --version
```

---

**基本写法：查看 Docker 版本**
`docker --version`
```bash
# 验证 Docker 是否安装成功
docker --version
```

---

**基本写法：查看 VS Code 版本**
`code --version`
```bash
# 验证 VS Code 命令行工具是否可用
code --version
```

---

## 包管理器识别

**基本写法：查看 npm 版本**
`npm --version`
```bash
# Node.js 默认包管理器
npm --version
```

---

**基本写法：查看 pnpm 版本**
`pnpm --version`
```bash
# 高性能 Node.js 包管理器
pnpm --version
```

---

**基本写法：查看 pip 版本**
`pip --version`
```bash
# Python 默认包管理器
pip --version
```

---

**基本写法：查看 uv 版本**
`uv --version`
```bash
# 新一代 Rust 实现的 Python 包管理器
uv --version
```

---

## 系统信息查询

**基本写法：查看操作系统信息（Windows）**
`systeminfo | findstr /B /C:"OS"`
```bash
# 查看 Windows 系统版本
systeminfo | findstr /B /C:"OS"
```

---

**基本写法：查看系统架构（Windows）**
`echo %PROCESSOR_ARCHITECTURE%`
```bash
# 查看处理器架构（x64 或 ARM64）
echo %PROCESSOR_ARCHITECTURE%
```

---

**基本写法：查看系统架构（跨平台）**
`uname -m`
```bash
# Linux/macOS 查看处理器架构
uname -m
```

---

## 环境变量检查

**基本写法：查看 PATH 环境变量（Windows）**
`echo %PATH%`
```bash
# 查看当前 PATH 环境变量
echo %PATH%
```

---

**基本写法：查看 PATH 环境变量（PowerShell）**
`$env:PATH`
```bash
# PowerShell 方式查看 PATH
$env:PATH
```

---

**基本写法：查看 JAVA_HOME**
`echo %JAVA_HOME%`
```bash
# 查看 Java 主目录环境变量
echo %JAVA_HOME%
```

---

**基本写法：查看所有环境变量（Windows）**
`set`
```bash
# 列出所有环境变量
set
```

---

**基本写法：查看所有环境变量（PowerShell）**
`Get-ChildItem Env:`
```bash
# PowerShell 列出所有环境变量
Get-ChildItem Env:
```
