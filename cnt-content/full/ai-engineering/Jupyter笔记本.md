---
title: Jupyter笔记本
description: '安装和启动 JupyterLab，使用魔法命令进行基准测试和可视化，区分笔记本与脚本的使用场景，避免常见笔记本陷阱'
module: 'ai-engineering'
difficulty: beginner
tags:
  - Jupyter
  - Notebook
  - 数据探索
  - 可视化
  - Colab
related:
  - 'ai-engineering/GPU自动伸缩与Kubernetes'
  - 'ai-engineering/JAX入门'
  - 'ai-engineering/KNN与距离度量'
  - 'ai-engineering/Linux与AI'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# Jupyter 笔记本

> 笔记本是 AI 工程的实验台。你在这里做原型，然后把可行的部分移到生产环境。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 0，第 01 课
**预计时间：** ~30 分钟

## 学习目标

- 安装和启动 JupyterLab、Jupyter Notebook 或带 Jupyter 扩展的 VS Code
- 使用魔法命令（`%timeit`、`%%time`、`%matplotlib inline`）进行基准测试和内联可视化
- 区分何时使用笔记本、何时使用脚本，践行"笔记本中探索，脚本中交付"的工作流
- 识别和避免常见笔记本陷阱：乱序执行、隐藏状态和内存泄漏

## 问题所在

每篇 AI 论文、每个教程、每场 Kaggle 比赛都使用 Jupyter 笔记本。它们让你分段运行代码、内联查看输出、混合代码与说明、快速迭代。如果你不用笔记本来学 AI，就像做数学作业没有草稿纸。

但笔记本也有真正的陷阱。人们用它做所有事情，包括它不擅长的事情。知道何时用笔记本、何时用脚本，能让你免受调试噩梦。

## 核心概念

笔记本是一个单元格列表。每个单元格要么是代码，要么是文本。

```mermaid
graph TD
    A["**Markdown 单元格**\n# 我的实验\n测试学习率 0.01"] --> B["**代码单元格** ► 运行\nmodel.fit(X, y, lr=0.01)\n---\n输出: loss = 0.342"]
    B --> C["**代码单元格** ► 运行\nplt.plot(losses)\n---\n输出: 内联图表"]
```

内核是一个在后台运行的 Python 进程。当你运行一个单元格时，它将代码发送给内核，内核执行代码并返回结果。所有单元格共享同一个内核，因此变量在单元格之间持久存在。

```mermaid
graph LR
    A[笔记本 UI] <--> B[内核\nPython 进程]
    B --> C[将变量保存在内存中]
    B --> D[按你点击的顺序运行单元格]
    B --> E[重启时消亡]
```

"按你点击的顺序运行"既是超能力，也是踩脚枪。

## 动手构建

### 第 1 步：选择你的界面

三种界面，一种格式：

| 界面             | 安装                                           | 适用于                                    |
| ---------------- | ---------------------------------------------- | ----------------------------------------- |
| JupyterLab       | `pip install jupyterlab` 然后 `jupyter lab`    | 完整 IDE 体验，多标签页，文件浏览器，终端 |
| Jupyter Notebook | `pip install notebook` 然后 `jupyter notebook` | 简单轻量，一次一个笔记本                  |
| VS Code          | 安装 "Jupyter" 扩展                            | 已在你的编辑器中，git 集成，调试          |

三种界面读写相同的 `.ipynb` 文件。选你喜欢的。JupyterLab 在 AI 工作中最常用。

```bash
pip install jupyterlab
jupyter lab
```

### 第 2 步：重要的键盘快捷键

你在两种模式下操作。按 `Escape` 进入命令模式（左侧蓝色条），按 `Enter` 进入编辑模式（绿色条）。

**命令模式（最常用的）：**

| 按键           | 操作                   |
| -------------- | ---------------------- |
| `Shift+Enter`  | 运行单元格，移到下一个 |
| `A`            | 在上方插入单元格       |
| `B`            | 在下方插入单元格       |
| `DD`           | 删除单元格             |
| `M`            | 转为 Markdown          |
| `Y`            | 转为代码               |
| `Z`            | 撤销单元格操作         |
| `Ctrl+Shift+H` | 显示所有快捷键         |

**编辑模式：**

| 按键        | 操作         |
| ----------- | ------------ |
| `Tab`       | 自动补全     |
| `Shift+Tab` | 显示函数签名 |
| `Ctrl+/`    | 切换注释     |

`Shift+Enter` 是你每天会用上千次的快捷键。先学这个。

### 第 3 步：单元格类型

**代码单元格**运行 Python 并显示输出：

```python
import numpy as np
data = np.random.randn(1000)
data.mean(), data.std()
```

输出：`(0.0032, 0.9987)`

**Markdown 单元格**渲染格式化文本。用它们记录你在做什么以及为什么。支持标题、粗体、斜体、LaTeX 数学公式（`$E = mc^2$`）、表格和图片。

### 第 4 步：魔法命令

这些不是 Python。它们是 Jupyter 特有的命令，以 `%`（行魔法）或 `%%`（单元格魔法）开头。

**计时你的代码：**

```python
%timeit np.random.randn(10000)
```

输出：`45.2 us +/- 1.3 us per loop`

```python
%%time
model.fit(X_train, y_train, epochs=10)
```

输出：`Wall time: 2.34 s`

`%timeit` 多次运行代码取平均值。`%%time` 只运行一次。微基准测试用 `%timeit`，训练运行用 `%%time`。

**启用内联图表：**

```python
%matplotlib inline
```

每个 `plt.plot()` 或 `plt.show()` 现在都直接在笔记本中渲染。

**不离开笔记本安装包：**

```python
!pip install scikit-learn
```

`!` 前缀可以运行任何 shell 命令。

**检查环境变量：**

```python
%env CUDA_VISIBLE_DEVICES
```

### 第 5 步：内联显示富输出

笔记本自动显示单元格中最后一个表达式。但你可以控制它：

```python
import pandas as pd

df = pd.DataFrame({
    "model": ["Linear", "Random Forest", "Neural Net"],
    "accuracy": [0.72, 0.89, 0.94],
    "training_time": [0.1, 2.3, 45.6]
})
df
```

这会渲染一个格式化的 HTML 表格，而不是文本转储。图表也一样：

```python
import matplotlib.pyplot as plt

plt.figure(figsize=(8, 4))
plt.plot([1, 2, 3, 4], [1, 4, 2, 3])
plt.title("Inline Plot")
plt.show()
```

图表直接显示在单元格下方。这就是笔记本主导 AI 工作的原因。你可以同时看到数据、图表和代码。

显示图片：

```python
from IPython.display import Image, display
display(Image(filename="architecture.png"))
```

### 第 6 步：Google Colab

Colab 是云端的免费 Jupyter 笔记本。它提供 GPU、预安装的库和 Google Drive 集成。无需配置。

1. 访问 [colab.research.google.com](https://colab.research.google.com)
2. 上传本课程的任何 `.ipynb` 文件
3. 运行时 > 更改运行时类型 > T4 GPU（免费）

Colab 与本地 Jupyter 的区别：

- 文件在会话之间不持久（保存到 Drive 或下载）
- 预安装：numpy, pandas, matplotlib, torch, tensorflow, sklearn
- `from google.colab import files` 上传/下载文件
- `from google.colab import drive; drive.mount('/content/drive')` 持久存储
- 免费版会话在 90 分钟不活动后超时

## 实际应用

### 笔记本 vs 脚本：何时用哪个

| 用笔记本     | 用脚本                        |
| ------------ | ----------------------------- |
| 探索数据集   | 训练流水线                    |
| 原型开发模型 | 可复用工具                    |
| 可视化结果   | 任何需要 `if __name__` 的场景 |
| 解释你的工作 | 定时运行的代码                |
| 快速实验     | 生产代码                      |
| 课程练习     | 包和库                        |

原则：**笔记本中探索，脚本中交付**。

AI 中的常见工作流：

1. 在笔记本中探索数据
2. 在笔记本中做模型原型
3. 一旦可行，将代码移到 `.py` 文件
4. 将 `.py` 文件导入回笔记本进行进一步实验

### 常见陷阱

**乱序执行。** 你先运行单元格 5，然后单元格 2，然后单元格 7。笔记本在你的机器上能工作，但别人从头到尾运行就出问题。修复方法：分享前执行 Kernel > Restart & Run All。

**隐藏状态。** 你删除了一个单元格，但它创建的变量仍在内存中。笔记本看起来很干净，但依赖于一个幽灵单元格。修复方法：定期重启内核。

**内存泄漏。** 加载一个 4GB 的数据集，训练一个模型，再加载另一个数据集。什么都没释放。修复方法：`del variable_name` 和 `gc.collect()`，或者重启内核。

## 交付成果

本课程产出：

- `outputs/prompt-notebook-helper.md` 用于调试笔记本问题

## 练习

1. 打开 JupyterLab，创建一个笔记本，使用 `%timeit` 比较列表推导式和 numpy 创建 100,000 个随机数的数组
2. 创建一个包含 Markdown 和代码单元格的笔记本，加载 CSV、显示 DataFrame、绘制图表。然后运行 Kernel > Restart & Run All 验证从头到尾都能工作
3. 将 `code/notebook_tips.py` 中的代码粘贴到 Colab 笔记本中，使用免费 GPU 运行

## 关键术语

| 术语          | 通俗说法               | 实际含义                                                    |
| ------------- | ---------------------- | ----------------------------------------------------------- |
| Kernel        | "运行我代码的那个东西" | 一个独立的 Python 进程，执行单元格并将变量保存在内存中      |
| Cell          | "代码块"               | 笔记本中可独立运行的单元，可以是代码或 Markdown             |
| Magic command | "Jupyter 技巧"         | 以 `%` 或 `%%` 开头的特殊命令，控制笔记本环境               |
| `.ipynb`      | "笔记本文件"           | 包含单元格、输出和元数据的 JSON 文件。全称 IPython Notebook |

## 延伸阅读

- [JupyterLab 文档](https://jupyterlab.readthedocs.io/) 了解完整功能
- [Google Colab FAQ](https://research.google.com/colaboratory/faq.html) 了解 Colab 特有的限制和功能
- [28 Jupyter Notebook 技巧](https://www.dataquest.io/blog/jupyter-notebook-tips-tricks-shortcuts/) 进阶快捷键
