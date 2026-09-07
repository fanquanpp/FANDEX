---
order: 110
title: VS Code 安装配置
module: 'shell'
category: 工具链
difficulty: beginner
description: VS Code 的安装、命令行工具、扩展管理与常用配置。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'shell/009-IDEEditorSelection'
  - 'shell/010-PluginEcosystem'
  - 'shell/006-WindowsEnvConfigTutorial'
  - 'shell/007-MacOSEnvConfigTutorial'
  - 'shell/008-LinuxEnvConfigTutorial'
prerequisites:
  - 'shell/005-DevEnvSetup'
---

## 安装 VS Code

**基本写法：winget 安装 VS Code**
`winget install Microsoft.VisualStudioCode`
```bash
# 通过 Windows 包管理器安装 VS Code
winget install Microsoft.VisualStudioCode
```

---

**基本写法：Homebrew 安装 VS Code**
`brew install --cask visual-studio-code`
```bash
# macOS 通过 Homebrew 安装
brew install --cask visual-studio-code
```

---

**基本写法：apt 安装 VS Code（Ubuntu）**
`sudo apt install code`
```bash
# Ubuntu 系统安装 VS Code
sudo apt install code
```

---

**基本写法：升级 VS Code**
`winget upgrade Microsoft.VisualStudioCode`
```bash
# 升级到最新版本
winget upgrade Microsoft.VisualStudioCode
```

---

## 命令行工具

**基本写法：从命令行打开 VS Code**
`code <路径>`
```bash
# 用 VS Code 打开当前目录
code .
```

---

**基本写法：打开指定文件**
`code <文件名>`
```bash
# 用 VS Code 打开指定文件
code index.html
```

---

**基本写法：在新窗口打开**
`code -n <路径>`
```bash
# 强制在新窗口打开
code -n .
```

---

**基本写法：比较两个文件**
`code -d <文件1> <文件2>`
```bash
# 在 VS Code 中比较文件差异
code -d file1.txt file2.txt
```

---

## 扩展管理

**基本写法：安装扩展**
`code --install-extension <扩展ID>`
```bash
# 通过命令行安装扩展
code --install-extension ms-python.python
```

---

**基本写法：卸载扩展**
`code --uninstall-extension <扩展ID>`
```bash
# 卸载指定的扩展
code --uninstall-extension ms-python.python
```

---

**基本写法：列出已安装扩展**
`code --list-extensions`
```bash
# 列出所有已安装的扩展
code --list-extensions
```

---

**基本写法：显示扩展版本**
`code --list-extensions --show-versions`
```bash
# 列出扩展及其版本号
code --list-extensions --show-versions
```

---

## 常用扩展安装

**基本写法：安装 Python 扩展**
`code --install-extension ms-python.python`
```bash
# 安装 Python 语言支持扩展
code --install-extension ms-python.python
```

---

**基本写法：安装 Java 扩展包**
`code --install-extension vscjava.vscode-java-pack`
```bash
# 安装 Java 开发扩展包
code --install-extension vscjava.vscode-java-pack
```

---

**基本写法：安装 ESLint 扩展**
`code --install-extension dbaeumer.vscode-eslint`
```bash
# 安装 ESLint 代码检查扩展
code --install-extension dbaeumer.vscode-eslint
```

---

**基本写法：安装 GitLens 扩展**
`code --install-extension eamodio.gitlens`
```bash
# 安装 Git 增强工具扩展
code --install-extension eamodio.gitlens
```

---

**基本写法：安装 Live Server 扩展**
`code --install-extension ritwickdey.liveserver`
```bash
# 安装本地服务器扩展用于前端开发
code --install-extension ritwickdey.liveserver
```

---

## 用户配置

**基本写法：打开用户设置（JSON）**
`code $env:APPDATA\Code\User\settings.json`
```bash
# 直接编辑用户设置文件
code $env:APPDATA\Code\User\settings.json
```

---

**基本写法：打开命令面板**
`Ctrl+Shift+P`
```bash
# 快捷键打开命令面板执行命令
Ctrl+Shift+P
```

---

**基本写法：打开终端**
`Ctrl+``
```bash
# 快捷键在 VS Code 中打开集成终端
Ctrl+`
```

---

## 工作区配置

**基本写法：创建工作区文件**
`code <工作区名>.code-workspace`
```bash
# 创建多根工作区配置文件
code myproject.code-workspace
```

---

**基本写法：添加文件夹到工作区**
`code --add <文件夹路径>`
```bash
# 将文件夹添加到当前工作区
code --add ./shared
```
