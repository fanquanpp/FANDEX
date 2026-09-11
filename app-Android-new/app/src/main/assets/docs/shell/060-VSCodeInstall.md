---
order: 60
title: VS Code 安装配置
module: 'shell'
category: 工具链
difficulty: beginner
description: VS Code 安装配置：三平台安装、code 命令行、扩展管理与 settings.json 常用配置
author: fanquanpp
updated: '2026-09-12'
related:
  - 'shell/050-IDEEditorSelection'
  - 'shell/070-PluginEcosystem'
  - 'shell/020-WindowsEnvConfigTutorial'
  - 'shell/030-MacOSEnvConfigTutorial'
  - 'shell/040-LinuxEnvConfigTutorial'
prerequisites:
  - 'shell/010-DevEnvSetup'
---


本篇是 VS Code 安装与配置的**速查手册**：先按平台装好并让 `code` 命令在终端可用，再掌握扩展管理与常用配置。VS Code 的选型对比见《IDE 与编辑器选型》，扩展生态详解见《插件生态》。

## 0. 先想清楚：装完要达到什么状态

1. 图标能点开（GUI 正常）；
2. 终端敲 `code .` 能打开当前目录（PATH 正常，本篇重点）；
3. 扩展能装、能同步（开发效率的来源）。

第 2 条是最常被忽略的——图形界面装好了，终端里 `code` 却"找不到命令"，后面学 CLI 开发时处处别扭。

## 1. 安装 VS Code

**Windows：winget 安装**

```bash
winget install Microsoft.VisualStudioCode    # 安装（含 PATH 注册）
winget upgrade Microsoft.VisualStudioCode    # 升级到最新版
```

用安装包（.exe）安装时注意**勾选"将'通过 Code 打开'操作添加到资源管理器"与"添加到 PATH"**，漏勾是 Windows 上 `code` 命令找不到的头号原因。

**macOS：Homebrew 安装**

```bash
brew install --cask visual-studio-code    # macOS 通过 Homebrew 安装
```

装完后在 VS Code 内按 `Cmd+Shift+P` 执行 **"Shell Command: Install 'code' command in PATH"**，macOS 的 cask 安装不会自动注册 `code` 命令。

**Ubuntu：apt 安装**

```bash
sudo apt install code    # Ubuntu 系统安装 VS Code（需已添加微软软件源）
```

微软官方源未配置时可先按官方文档添加（`wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor` 导入密钥等步骤），或直接下载官网 .deb 包安装。

**验证（三平台通用）**

```bash
code --version
# 预期输出类似：
# 1.9x.x
# 488a1f239235055e34e673291fb8d8c810886f81
# x64
```

## 2. 命令行工具：code 命令

```bash
code .                       # 用 VS Code 打开当前目录（最高频用法）
code index.html              # 打开指定文件
code -n .                    # 强制在新窗口打开（默认复用上次窗口）
code -d file1.txt file2.txt  # 以 diff 视图比较两个文件
code --goto app.js:42:8      # 打开文件并跳到 42 行第 8 列（报错定位神器）
```

```text
$ code --goto src/utils.js:10:3
# VS Code 打开 src/utils.js 并高亮第 10 行
```

`code --goto 行:列` 与测试框架/编译器的报错输出配合极佳，比鼠标滚半天快得多。

## 3. 扩展管理

扩展 ID 的格式是 `发布者.名称`（如 `ms-python.python`），命令行管理比点界面快：

```bash
code --install-extension ms-python.python        # 安装扩展
code --uninstall-extension ms-python.python      # 卸载扩展
code --list-extensions                           # 列出已安装扩展
code --list-extensions --show-versions           # 附版本号（复现环境时用）
```

**常用扩展一键配齐**（新机器脚本化安装）：

```bash
code --install-extension ms-python.python             # Python 语言支持
code --install-extension vscjava.vscode-java-pack     # Java 开发扩展包
code --install-extension dbaeumer.vscode-eslint       # ESLint 代码检查
code --install-extension eamodio.gitlens              # Git 增强工具
code --install-extension ritwickdey.liveserver        # 本地静态服务器（前端）
code --install-extension esbenp.prettier-vscode       # 代码格式化
```

把"列表 + 安装命令"存进仓库的 README 或 setup 脚本，换机器、带新人都能一键复现编辑器环境。

## 4. 用户配置

**打开设置（JSON）**：命令面板 `Ctrl+Shift+P`（macOS `Cmd+Shift+P`）输入 "Open User Settings (JSON)"，或直接编辑文件：

```bash
# Windows（PowerShell）
code $env:APPDATA\Code\User\settings.json

# macOS / Linux
code ~/.config/Code/User/settings.json
```

**高频 settings.json 片段**：

```json
{
  "editor.fontSize": 14,
  "editor.tabSize": 2,
  "editor.formatOnSave": true,
  "files.autoSave": "afterDelay",
  "files.exclude": {
    "**/node_modules": true
  },
  "terminal.integrated.defaultProfile.windows": "PowerShell"
}
```

**两个必会快捷键**（记熟比装十个扩展都提效）：

- `Ctrl+Shift+P`（macOS `Cmd+Shift+P`）：命令面板，一切功能的搜索入口
- ``Ctrl+` ``：打开/关闭集成终端，写代码与跑命令不用切窗口

## 5. 工作区配置

多项目协作时用工作区把多个文件夹组织在一个窗口：

```bash
code myproject.code-workspace    # 打开（不存在则创建骨架）多根工作区
code --add ./shared              # 把文件夹添加进当前工作区
```

`.code-workspace` 是 JSON 文件，可以放工作区级 settings（覆盖用户设置）与扩展推荐（`extensions.recommendations`），团队成员打开即收到"建议安装"提示。

## 6. 常见问题速查

| 症状 | 原因 | 解法 |
| :--- | :--- | :--- |
| `code: command not found` | 安装时未加 PATH / macOS 未注册 shell 命令 | 重装勾选 PATH；或执行 "Shell Command: Install 'code' command in PATH" |
| 扩展装不上 | 网络受限 | 设置里配置 `http.proxy`，或离线下载 .vsix 后 `code --install-extension 文件.vsix` |
| 设置改了不生效 | JSON 语法错误 | 打开 settings.json 看红色波浪线，修正逗号/引号 |
| 终端里 node 找不到 | VS Code 启动早于 PATH 修改 | 完全退出 VS Code 再打开（Windows 托盘也要退） |

## 7. 小结

**初学者要点**：

- 安装时勾选"添加到 PATH"，装完 `code --version` 验证
- `code .` 从终端直达项目，是 CLI 工作流的第一入口
- 扩展 ID 是 `发布者.名称`，命令行 `--install-extension` 可脚本化配齐环境
- `Ctrl+Shift+P` 命令面板 + ``Ctrl+` `` 集成终端是两大必会快捷键

**进阶注意**：

- macOS 的 cask 安装不会自动注册 `code` 命令，需手动执行一次 Shell Command
- settings.json 分"用户级"与"工作区级"，团队规范放工作区级并提交进仓库
- `code --goto 文件:行:列` 配合报错输出定位代码，是 CLI 与 GUI 结合的典型用法
