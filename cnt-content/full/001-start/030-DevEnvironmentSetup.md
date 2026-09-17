---
order: 30
title: 开发环境搭建：VS Code、Git 与运行时一次装齐
description: 手把手完成零基础阶段的全部开发环境安装：VS Code 编辑器配置、Git 版本控制、Node.js 与 Python 运行时，每一步都含安装验证与故障排查。
module: 'start'
category: 工具链
difficulty: beginner
prerequisites:
  - 'start/020-ComputerBasicsForBeginners'
author: fanquanpp
updated: '2026-09-18'
related:
  - 'start/040-TerminalAndShellBasics'
  - 'git/010-Git'
  - 'python/020-PythonOverviewEnvSetup'
---

## 学习目标

本篇是全教程的"装备关"。完成后你的电脑将具备：

1. 一个专业代码编辑器（VS Code），配置为中文界面并装好核心扩展；
2. 版本控制工具 Git，能用 `git --version` 验证；
3. 两个运行时：Node.js（跑 JavaScript）与 Python（跑 Python 脚本）；
4. 掌握"安装 → 验证 → 排错"的标准流程，以后装任何开发工具都套用这个流程。

预计耗时：网络通畅时 40 到 60 分钟。

## 前置知识

- 已阅读 [零基础计算机常识](/start/020-ComputerBasicsForBeginners)，知道什么是路径、扩展名、管理员权限；
- 知道如何打开终端（Windows：开始菜单搜 "PowerShell"；macOS：启动台搜 "终端"）。终端的详细用法下一篇专门讲，本篇只需要会"打开并粘贴命令"。

## 安装的总原则

先记住三条，能避开 90% 的安装事故：

1. **只用官网**：每款软件本篇都给出官方地址，不要用搜索引擎结果里的"高速下载"站点；
2. **装完必须验证**：每装一个工具，立刻在终端运行它的版本命令，看到版本号才算完成；
3. **报错先读后搜**：把报错最后几行读一遍，通常它直接告诉你缺了什么。

## 第一步：VS Code 编辑器

**它是什么**：Visual Studio Code（简称 VS Code）是微软出品的免费开源编辑器，当前全球使用率最高的开发工具。它的本体很轻，功能靠扩展按需添加——这个设计让初学者不会被界面吓到。

**安装**：

1. 访问官网 `https://code.visualstudio.com`，下载对应系统版本（Windows 选 User Installer x64；Apple 芯片的 mac 选 ARM64 版）；
2. Windows 安装时**务必勾选"添加到 PATH"与"右键菜单：通过 Code 打开"**两项（默认已勾选，确认不要取消）；macOS 把图标拖入"应用程序"；
3. 首次启动后，按 `Ctrl+Shift+P`（macOS `Cmd+Shift+P`）打开命令面板，输入 `display language`，选择"中文(简体)"安装语言包并重启——**命令面板是 VS Code 的万能入口**，记住这个快捷键。

**必装扩展**（左侧活动栏第 5 个图标"扩展"，搜索名称安装）：

| 扩展名 | 作用 |
| --- | --- |
| Chinese (Simplified) | 中文界面（上一步已装） |
| Prettier | 保存时自动把代码排版整齐 |
| Code Spell Checker | 拼写检查，避免变量名拼错的低级错误 |

再多就先不装了。扩展是工具不是装备竞赛，需要时再加。

**动手验证**：在桌面右键 →"通过 Code 打开"（macOS：VS Code 内 `文件 → 打开`），选择上一篇建的 `my-code` 文件夹。在 `week1` 里新建文件 `hello.txt`，输入任意文字，按 `Ctrl+S` 保存。左上角文件名旁的小圆点消失表示已保存——**小圆点是"未保存"标记，以后每天见面**。

## 第二步：Git 版本控制

**它是什么**：Git 记录代码的每一次修改历史，让你能随时回退、比较差异、与协作。它和 GitHub 的关系：Git 是工具（装在你电脑上），GitHub 是存放 Git 仓库的网站。本仓库有完整的 [Git 模块](/git/010-Git)，零基础阶段只装不用，先混个脸熟。

**安装**：

- Windows：官网 `https://git-scm.com/downloads` 下载安装。安装向导几十个选项全部保持默认即可（默认配置已是社区共识的最佳实践）。特别注意其中一页"Choosing the default editor"选 VS Code；
- macOS：终端输入 `git --version`，若未安装系统会弹出安装提示，点"安装"即可（这是苹果提供的 Git，够用）；想装新版可用 Homebrew（见本篇末尾选学）。

**验证**（新开一个终端窗口——刚装的软件对已开窗口可能不可见）：

```bash
git --version
# 期望输出类似：git version 2.47.0
```

**首次配置**（把你的名字和邮箱写进 Git，以后每次提交都会署名）：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
git config --global init.defaultBranch main
```

## 第三步：Node.js 运行时

**它是什么**：Node.js 让 JavaScript 脱离浏览器、直接在你的电脑上运行，同时它自带 `npm` 包管理器（下载别人写好的代码库）。前端开发必装，也是第一门语言体验篇的运行环境。

**安装**：官网 `https://nodejs.org`，选择标有 **LTS** 的版本（LTS = 长期支持，稳定、适配期长；不要选 Current——它是尝鲜版）。Windows 下载 `.msi` 一路下一步；macOS 下载 `.pkg` 安装。

**验证**（同样新开终端）：

```bash
node --version
# 期望输出类似：v22.14.0（22 开头即 LTS 系列）

npm --version
# 期望输出类似：10.9.0
```

两个命令都有正常版本号输出，Node.js 就装好了。

## 第四步：Python 运行时

**它是什么**：Python 是语法最接近自然语言的编程语言，写小工具、处理数据、入门算法都靠它。macOS 自带一个旧版 Python（仅系统内部使用），**开发必须另装新版**。

**安装**：官网 `https://www.python.org/downloads/`。

- Windows：下载最新版安装包。**安装第一屏最底部务必勾选 "Add python.exe to PATH"**，再点 Install Now。这是 Windows 上 Python 新手第一大坑：漏勾会导致终端找不到 `python` 命令。漏勾了怎么办：卸载重装一遍并勾上，比手动改环境变量简单可靠；
- macOS：下载安装包或用 Homebrew：`brew install python`。

**验证**（注意 Windows 上验证命令是 `python`，macOS 是 `python3`）：

```bash
python --version     # Windows
python3 --version    # macOS
# 期望输出类似：Python 3.13.2
```

如果 Windows 提示"python 不是内部或外部命令"，回到安装步骤检查 PATH 勾选；仍不行可重启电脑让环境变量生效。

## 环境变量与 PATH：看懂"命令找不到"类报错

刚才反复出现的 PATH 值得一分钟讲透，因为它是新手报错榜第一名。

**环境变量（environment variable）**是操作系统层面的全局设置。其中 **PATH** 是一个目录列表：当你在终端输入 `node` 时，系统按 PATH 里列出的目录挨个找名为 `node` 的程序，找到就执行，全部找不到就报 `命令找不到 / command not found`。

```text
你在终端输入: node --version
    ↓
系统查 PATH: C:\Program Files\nodejs\ 里有 node.exe 吗？ 有 → 执行
    ↓（若所有目录都没有）
报错: 'node' 不是内部或外部命令（Windows）
      command not found（macOS/Linux）
```

所以"命令找不到"只有两种可能：**软件没装**，或**装了但它的目录不在 PATH 里**。前者重装，后者改 PATH（Windows：开始菜单搜"编辑系统环境变量" → 环境变量 → Path → 新建，填入软件安装目录；macOS 写入 shell 配置文件，零基础阶段遇到再搜具体教程）。理解了这个机制，这类报错从"玄学"变成了"查表题"。

## 故障排查速查表

| 症状 | 原因 | 处理 |
| --- | --- | --- |
| 命令找不到 | 未安装，或 PATH 未包含 | 重装并勾选 PATH 选项；或手动加 PATH |
| 刚装完就验证失败 | 终端是安装前打开的 | 关闭终端重开 |
| 版本号输出但很旧 | 电脑里有旧版本占先 | `where 命令名`（Win）/ `which 命令名`（mac）定位后清理 |
| 安装包打不开（macOS） | 系统安全拦截 | 系统设置 → 隐私与安全性 → 仍要打开 |
| 下载速度极慢 | 网络到官网慢 | 换时间段，或使用官方镜像（如 Node 用 npmmirror，Python 用淘宝镜像） |

## 选学：包管理器 Homebrew 与 winget

图形安装够了，但了解"开发者式安装"能打开新世界：

- **macOS Homebrew**：官网 `https://brew.sh` 复制安装命令到终端执行。之后装软件变成一行：`brew install git`；
- **Windows winget**：Windows 11 自带。`winget install Git.Git` 即可无人值守安装。

零基础阶段不强制使用，知道有这条路即可。

## 检验清单

在终端里逐条执行并记录输出：

- `git --version` 有输出，且 `git config --global user.name` 能读回你的名字；
- `node --version` 与 `npm --version` 都有输出；
- `python --version`（mac 用 python3）输出 3.10 以上版本；
- VS Code 能打开 `my-code` 文件夹并新建、保存文件；
- 能用自己的话解释：为什么会出现"命令找不到"，以及两个可能原因。

## 下一步

装备齐了，下一篇学会驾驶它们：进入 [终端与命令行入门](/start/040-TerminalAndShellBasics)。
