---
title: 开发环境搭建
description: '搭建 Python、Node.js、Rust 工具链，配置虚拟环境和包管理器，验证 GPU 访问，理解四层技术栈'
module: 'ai-engineering'
difficulty: beginner
tags:
  - 开发环境
  - Python
  - Node.js
  - Rust
  - GPU
  - CUDA
related:
  - 'ai-engineering/矩阵变换'
  - 'ai-engineering/决策树与随机森林'
  - 'ai-engineering/链式法则与自动微分'
  - 'ai-engineering/流式语音对话'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 开发环境搭建

> 你的工具塑造你的思维。一次配好，终身受益。

**类型：** 构建
**语言：** Python, Node.js, Rust
**前置条件：** 无
**预计时间：** ~45 分钟

## 学习目标

- 从零搭建 Python 3.11+、Node.js 20+ 和 Rust 工具链
- 配置虚拟环境和包管理器，实现可复现的构建
- 验证 GPU 访问（CUDA/MPS）并运行测试张量运算
- 理解四层技术栈：系统层、包管理层、运行时层、AI 库层

## 问题所在

你即将在 200 多节课程中使用 Python、TypeScript、Rust 和 Julia 学习 AI 工程。如果你的环境有问题，每一节课都会变成与工具的搏斗，而不是学习。

大多数人跳过环境配置，然后花好几个小时调试 import 错误、版本冲突和缺失的 CUDA 驱动。我们只做一次，而且要做对。

## 核心概念

AI 工程环境有四个层次：

```mermaid
graph TD
    A["4. AI/ML 库\nPyTorch, JAX, transformers 等"] --> B["3. 语言运行时\nPython 3.11+, Node 20+, Rust, Julia"]
    B --> C["2. 包管理器\nuv, pnpm, cargo, juliaup"]
    C --> D["1. 系统基础\nOS, shell, git, 编辑器, GPU 驱动"]
```

我们自底向上安装。每一层都依赖于其下方的一层。

## 动手构建

### 第 1 步：系统基础

检查你的系统并安装基础工具。

```bash
# macOS
xcode-select --install
brew install git curl wget

# Ubuntu/Debian
sudo apt update && sudo apt install -y build-essential git curl wget

# Windows（使用 WSL2）
wsl --install -d Ubuntu-24.04
```

### 第 2 步：使用 uv 安装 Python

我们使用 `uv` —— 它比 pip 快 10-100 倍，并且自动处理虚拟环境。

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh

uv python install 3.12

uv venv
source .venv/bin/activate  # Windows 上使用 .venv\Scripts\activate

uv pip install numpy matplotlib jupyter
```

验证安装：

```python
import sys
print(f"Python {sys.version}")

import numpy as np
print(f"NumPy {np.__version__}")
a = np.array([1, 2, 3])
print(f"Vector: {a}, dot product with itself: {np.dot(a, a)}")
```

### 第 3 步：使用 pnpm 安装 Node.js

用于 TypeScript 课程（Agent、MCP 服务器、Web 应用）。

```bash
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 22
fnm use 22

npm install -g pnpm

node -e "console.log('Node', process.version)"
```

### 第 4 步：Rust

用于性能关键型课程（推理、系统编程）。

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

rustc --version
cargo --version
```

### 第 5 步：Julia（可选）

用于 Julia 擅长的数学密集型课程。

```bash
curl -fsSL https://install.julialang.org | sh

julia -e 'println("Julia ", VERSION)'
```

### 第 6 步：GPU 配置（如果你有 GPU）

```bash
# NVIDIA
nvidia-smi

# 安装支持 CUDA 的 PyTorch
uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

```python
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
```

没有 GPU？没关系。大多数课程可以在 CPU 上运行。对于训练密集型课程，使用 Google Colab 或云 GPU。

### 第 7 步：验证所有内容

运行验证脚本：

```bash
python phases/00-setup-and-tooling/01-dev-environment/code/verify.py
```

## 实际应用

你的环境现在已经为本课程的所有课程准备好了。以下是各语言的使用场景：

| 语言       | 使用阶段                                      | 包管理器 |
| ---------- | --------------------------------------------- | -------- |
| Python     | 阶段 1-12（ML, DL, NLP, Vision, Audio, LLMs） | uv       |
| TypeScript | 阶段 13-17（工具, Agent, Swarm, 基础设施）    | pnpm     |
| Rust       | 阶段 12, 15-17（性能关键型系统）              | cargo    |
| Julia      | 阶段 1（数学基础）                            | Pkg      |

## 交付成果

本课程产出一个验证脚本，任何人都可以运行它来检查自己的环境配置。

参见 `outputs/prompt-env-check.md`，这是一个帮助 AI 助手诊断环境问题的提示词。

## 练习

1. 运行验证脚本并修复所有失败项
2. 为本课程创建一个 Python 虚拟环境并安装 PyTorch
3. 用四种语言各写一个 "hello world" 并运行
