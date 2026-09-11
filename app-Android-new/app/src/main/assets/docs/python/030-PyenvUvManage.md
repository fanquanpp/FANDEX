---
order: 30
title: pyenv 与 uv 版本管理
module: 'python'
category: 后端技术
difficulty: beginner
description: 多版本 Python 管理两件套：pyenv/pyenv-win 版本切换与 uv 一体化（解释器、依赖、工具、锁文件）。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'python/040-PythonVirtualEnv'
  - 'python/730-PythonPackagingEvolution'
  - 'python/650-GILAndFreeThreading'
prerequisites:
  - 'shell/010-DevEnvSetup'
---

## 为什么需要版本管理

机器上同时存在"老项目要 3.10、新项目要 3.13、还想试试 3.14t 自由线程构建"是常态，系统自带的唯一解释器显然不够。两类工具各管一段：**pyenv 管"机器上装哪些解释器、当前用哪个"**；**uv 一件事管到底**——解释器安装、虚拟环境、依赖解析、锁文件乃至命令行工具，全部用 Rust 实现得极快。两者可以共存（pyenv 装解释器、uv 管依赖），也可以只用 uv 替代全家桶。本篇按"装什么、切版本、管项目"的顺序给出两套等价命令，日常按团队约定二选一即可。

## pyenv-win 安装

**基本写法：PowerShell 安装 pyenv-win**
`irm https://github.com/pyenv-win/pyenv-win/raw/master/pyenv-win/install-pyenv-win.ps1 | iex`
```bash
# 通过 PowerShell 脚本安装 pyenv-win
irm https://github.com/pyenv-win/pyenv-win/raw/master/pyenv-win/install-pyenv-win.ps1 | iex
```

---

**基本写法：查看可安装版本**
`pyenv install --list`
```bash
# 列出所有可安装的 Python 版本
pyenv install --list
```

---

**基本写法：安装指定版本**
`pyenv install <版本号>`
```bash
# 安装指定版本的 Python
pyenv install 3.13.0
```

---

**基本写法：查看已安装版本**
`pyenv versions`
```bash
# 列出所有已安装的 Python 版本
pyenv versions
```

---

## pyenv 版本切换

**基本写法：设置全局默认版本**
`pyenv global <版本号>`
```bash
# 设置全局默认 Python 版本
pyenv global 3.13.0
```

---

**基本写法：设置项目本地版本**
`pyenv local <版本号>`
```bash
# 在当前项目目录生成 .python-version 文件
pyenv local 3.11.9
```

---

**基本写法：设置当前 shell 版本**
`pyenv shell <版本号>`
```bash
# 仅在当前终端会话切换版本
pyenv shell 3.12.8
```

---

**基本写法：卸载版本**
`pyenv uninstall <版本号>`
```bash
# 删除指定版本的 Python
pyenv uninstall 3.9.5
```

---

## uv 安装

**基本写法：Windows 安装 uv**
`powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`
```bash
# 通过官方脚本安装 uv（Windows）
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

---

**基本写法：Linux/macOS 安装 uv**
`curl -LsSf https://astral.sh/uv/install.sh | sh`
```bash
# 通过官方脚本安装 uv（Linux/macOS）
curl -LsSf https://astral.sh/uv/install.sh | sh
```

---

**基本写法：通过 pip 安装 uv**
`pip install uv`
```bash
# 通过 pip 安装 uv
pip install uv
```

---

**基本写法：通过 Homebrew 安装 uv**
`brew install uv`
```bash
# macOS 通过 Homebrew 安装
brew install uv
```

---

## uv Python 版本管理

**基本写法：安装 Python 版本**
`uv python install <版本号>`
```bash
# 安装指定版本的 Python
uv python install 3.13
```

---

**基本写法：批量安装多个版本**
`uv python install <版本1> <版本2>`
```bash
# 一次安装多个版本
uv python install 3.13 3.12 3.11
```

---

**基本写法：查看可用版本**
`uv python list`
```bash
# 列出所有可用和已安装的版本
uv python list
```

---

**基本写法：为项目锁定版本**
`uv python pin <版本号>`
```bash
# 写入 .python-version 文件锁定项目版本
uv python pin 3.13
```

---

## uv 项目管理

**基本写法：初始化项目**
`uv init <项目名>`
```bash
# 创建标准 Python 项目结构
uv init myproject
```

---

**基本写法：添加依赖**
`uv add <包名>`
```bash
# 添加包并自动更新 uv.lock
uv add requests
```

---

**基本写法：添加开发依赖**
`uv add --dev <包名>`
```bash
# 添加开发依赖包
uv add --dev pytest
```

---

**基本写法：运行脚本**
`uv run <脚本>`
```bash
# 自动激活虚拟环境并运行
uv run main.py
```

---

**基本写法：创建虚拟环境**
`uv venv`
```bash
# 在当前目录创建 .venv 虚拟环境
uv venv
```

---

**基本写法：指定 Python 版本创建环境**
`uv venv --python <版本号>`
```bash
# 使用指定 Python 版本创建虚拟环境
uv venv --python 3.11
```

---

**基本写法：同步依赖**
`uv sync`
```bash
# 根据 uv.lock 同步安装所有依赖
uv sync
```

---

**基本写法：升级与卸载 uv 自身**
`uv self update` | `uv self version`
```bash
# uv 自更新（独立安装版支持）
uv self update
```

---

## uv 命令行工具管理

**基本写法：全局安装 CLI 工具**
`uv tool install <工具>`
```bash
# 把 ruff 安装为独立工具（隔离环境，不污染项目）
uv tool install ruff
```

---

**基本写法：临时运行工具**
`uvx <工具> <参数>`
```bash
# uvx = uv tool run：不安装、拉起即用，用完即弃
uvx ruff check .
uvx pycowsay hello
```

---

## 自由线程构建的安装

**基本写法：安装带 t 后缀的构建**
`uv python install <版本>t`
```bash
# 安装 3.14 自由线程构建（无 GIL，详见 GIL 与自由线程一篇）
uv python install 3.14t

# 验证 GIL 状态
uv run --python 3.14t python -c "import sys; print(sys._is_gil_enabled())"  # False
```

---

## 常见陷阱与最佳实践

1. **pyenv-win 与 pyenv 命令不完全一致**：Windows 用 pyenv-win（PowerShell 脚本安装），macOS/Linux 用 pyenv（`brew install pyenv` 或 git 克隆），个别子命令与更新节奏有差异，报错先确认装的是哪个。
2. **pyenv 必须配置 shell 钩子**：安装后要把 `pyenv init` 写入 shell 配置文件（PowerShell profile / .bashrc），否则 `pyenv shell` 切换不生效——"装了没反应"九成是漏了这步。
3. **uv 创建的项目认 uv.lock**：`uv.lock` 要提交到仓库保证团队环境一致；但不要把 `.venv/` 提交进去。他人克隆后一句 `uv sync` 即可还原环境。
4. **全局工具与项目依赖分离**：`uv tool install` 的工具（ruff/pytest 等）在独立环境运行；项目自身的依赖走 `uv add`。混在一起会造成"在我机器上能跑"的版本漂移。
5. **别再手动 pip install 进系统 Python**：新版 Debian/Fedora 的系统 Python 受 PEP 668 保护，pip 直装会被拒绝（externally-managed-environment）。用 `uv pip install`（配合 venv）或 `uv tool install` 是合规路径。

## 本篇小结

1. 版本管理解决"多项目多解释器"冲突：pyenv 走"全局/本地/shell 三级切换"，uv 走"项目 .python-version + uv run 自动适配"。
2. uv 的四件事：`uv python` 管解释器、`uv venv` 管环境、`uv add/sync` 管依赖与锁、`uvx/uv tool` 管命令行工具——一套命令替代 pip+venv+pyenv+pipx。
3. 自由线程构建（`3.14t`）可以直接用 `uv python install 3.14t` 获得，与普通构建并存、互不干扰。
4. 团队协作的黄金组合：提交 `pyproject.toml` + `uv.lock`（+ `.python-version`），成员一句 `uv sync` 复现环境。

## 动手实践

1. 用 uv 从零创建一个项目：固定 Python 3.13、添加 `requests` 与开发依赖 `pytest`，查看生成的 pyproject.toml 与 uv.lock 各自承载了什么。
2. 安装 3.13 与 3.14t 两个构建，分别运行打印 `sys._is_gil_enabled()` 的脚本，记录输出差异。
3. 把现有的 pip + requirements.txt 项目迁移到 uv：`uv init` 后用 `uv add -r requirements.txt` 导入，运行测试验证行为一致。
