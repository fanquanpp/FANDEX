---
order: 10
title: 开发环境搭建
module: 'shell'
category: 工具链
difficulty: beginner
description: 开发环境搭建：操作系统与终端选择、编辑器、Git、运行时工具链安装与统一验证
author: fanquanpp
updated: '2026-09-12'
related:
  - 'shell/140-CrossPlatformCommandLine'
  - 'shell/110-EnvVerificationChecklist'
  - 'shell/120-TroubleshootingGuide'
prerequisites: []
---


## 1. 从"厨房开火"说起

写程序之前先得有个能做饭的厨房：**操作系统是厨房，终端是灶台，编辑器是菜板，工具链是锅碗瓢盆**。本篇带你把厨房一次性配齐，并且每一步都有"验证动作"——装完就能确认能不能用，而不是等到第一次写代码才发现缺东西。

搭建顺序遵循依赖关系：**终端（跑命令的地方）-> 编辑器（写代码的地方）-> 版本管理（保存代码的地方）-> 语言运行时（跑代码的地方）**。

## 2. 选择操作系统

三大主流操作系统均可用于开发：

| 系统    | 优势                     | 适合场景                     |
| ------- | ------------------------ | ---------------------------- |
| Windows | 软件生态丰富, 游戏兼容好 | .NET 开发、企业办公、通用开发 |
| macOS   | Unix 底层, 前端工具链完善 | 前端开发、iOS 开发、设计      |
| Linux   | 免费开源, 服务器环境一致 | 后端开发、运维、嵌入式       |

> 如果你是零基础，用当前电脑即可，不需要专门更换操作系统。Windows 用户通过 WSL（Windows Subsystem for Linux）即可获得完整 Linux 环境，两者兼得。

## 3. 终端：跑命令的地方

### 3.1 打开终端

| 系统    | 方式                         |
| ------- | ---------------------------- |
| Windows | `Win + R` 输入 `powershell`（推荐改装 Windows Terminal） |
| macOS   | `Cmd + 空格` 输入 `terminal` |
| Linux   | `Ctrl + Alt + T`（多数发行版） |

### 3.2 基础命令验证

打开终端后敲几条命令热身：

```bash
pwd           # 显示当前目录
ls            # 列出文件 (Windows CMD: dir)
cd Documents  # 进入目录
cd ..         # 返回上级目录
mkdir project # 创建目录
clear         # 清屏 (Windows CMD: cls)
```

任何一条没反应或报"找不到命令"，先解决终端本身（见《"我卡住了"指南》第 1 条）。

### 3.3 Windows 用户：启用 WSL

WSL 让你在 Windows 上直接运行 Linux 环境（Ubuntu 等），是 Windows 开发者的标准配置：

```powershell
wsl --install
```

安装后重启电脑，开始菜单出现 Ubuntu 终端即成功。项目文件建议放在 WSL 内部（`~/`）而不是 `/mnt/c/`，文件 IO 性能差距很大。

## 4. 编辑器：写代码的地方

推荐 **Visual Studio Code**（免费、跨平台、生态最大）。

### 4.1 下载安装

1. 访问 https://code.visualstudio.com
2. 下载对应系统版本
3. 运行安装程序，**勾选"添加到 PATH"**（Windows），这样终端里才能用 `code` 命令

### 4.2 验证

```bash
code --version
# 预期输出类似：
# 1.9x.x
# 488a1f239235055e34e673291fb8d8c810886f81
# x64
```

`code` 命令找不到？Windows 重装时勾选 PATH；macOS 在 VS Code 里按 `Cmd+Shift+P` 执行 "Shell Command: Install 'code' command in PATH"。

### 4.3 必装扩展

打开扩展面板（`Ctrl+Shift+X`），搜索安装：

- **Chinese Language Pack** - 中文界面
- **GitLens** - Git 增强工具
- **Prettier** - 代码格式化
- **ESLint** - JavaScript 代码检查

扩展管理命令速查（安装/列出/卸载）见《VS Code 安装配置》。

## 5. Git：保存代码的地方

版本控制的基础工具，后续 Git 模块会详细讲解，先装好并验证：

### 5.1 安装

| 系统    | 方式                     |
| ------- | ------------------------ |
| Windows | 下载 https://git-scm.com（安装项保持默认即可） |
| macOS   | `brew install git`（或首次 `git` 时按提示装 Xcode Command Line Tools） |
| Linux   | `sudo apt install git`   |

### 5.2 验证与初始配置

```bash
git --version
# 预期输出：git version 2.4x.x

# 首次使用先声明身份（提交记录的署名）
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
git config --global user.name   # 回显刚配置的值即成功
```

## 6. 语言运行时：跑代码的地方

按你要学的语言选装，**每个都装的话逐个验证**：

```bash
node --version      # Node.js（前端/后端 JS 运行时），预期 v22+（LTS）
npm --version       # Node 随附的包管理器
python3 --version   # Python（Windows 试 python 或 py），预期 3.1x+
pip --version       # Python 包管理器（或 python3 -m pip --version）
java -version       # JDK（企业后端），预期 17/21/25 等 LTS
docker --version    # Docker（容器，可选）
```

```text
预期输出示例：
$ node --version
v22.11.0
$ python3 --version
Python 3.12.3
```

包管理器生态速览：npm/pnpm/yarn 服务 Node.js（pnpm 是高性能后起之秀）；pip/uv 服务 Python（uv 是 Rust 实现的新一代工具）。版本号命令是环境健康的"体温计"，任何工具装完先敲一次 `--version`。

## 7. 系统信息与环境检查

排障或提问时经常要报系统信息：

```bash
uname -m              # Linux/macOS：处理器架构（x86_64 / arm64）
cat /etc/os-release   # Linux：发行版信息

# Windows（CMD/PowerShell）：
systeminfo | findstr /B /C:"OS"     # 系统版本
echo %PROCESSOR_ARCHITECTURE%       # 架构（CMD）
$env:PATH                           # PowerShell 查看 PATH
Get-ChildItem Env:                  # PowerShell 列出全部环境变量
```

环境变量（PATH 等）的查看与配置详见《环境变量与配置文件》与各平台配置教程（Windows/macOS/Linux 三篇）。

## 8. 一次性验收：验证清单

全部装完后跑一遍迷你清单（完整版见《开发环境验证清单》）：

- [ ] 终端能打开并执行 `echo hello`
- [ ] `code --version` 有输出
- [ ] `git --version` 有输出且身份已配置
- [ ] 所学语言的 `--version` 有输出
- [ ] 以上命令在**新开的终端窗口**里依然可用（证明 PATH 持久生效）

最后一条最容易漏：PATH 修改只对新终端生效，验证时务必重开一个窗口。

## 9. 下一步

环境就绪后建议按以下顺序开始学习：

1. **命令行基础** - 熟悉终端操作（本模块《命令行基础：文件与目录操作》）
2. **Markdown** - 学习文档编写基础
3. **Git** - 掌握版本控制
4. **GitHub** - 学会代码协作
