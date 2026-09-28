---
order: 720
title: Jupyter Notebook：边写边看的数据工作台
module: 'python'
category: 后端技术
difficulty: beginner
description: 以「拿到一份陌生设备日志要快速看分布」为场景，从安装到跑通第一个 Notebook：内省问号、魔法命令、DataFrame 速览与一张图；讲清内核常驻进程的心智模型与乱序执行的坑，给出 Restart & Run All、nbstripout、jupytext 等可复现纪律与 papermill/Voila 进阶出口。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'python/970-PythonProjectExampleWebCrawlerDataAnalysis'
  - 'python/980-PythonAutomationCookbook'
  - 'python/690-PythonPerformance'
prerequisites:
  - 'python/070-BasicDataType'
---

## 前置知识

- [基本数据类型](/python/070-BasicDataType)：会在 REPL 或脚本里跑 Python；
- 用 pip 或 uv 安装过包。

## 你现在要解决什么问题

同事扔来一份 `readings.csv`，几十万行设备读数，让你「快速看一眼有没有异常」。打开普通 REPL：打一行、回车、print，看不到图；写成脚本：每改一行都要重跑全量读文件。这个「改一点、立刻看到结果、结果还带图」的活，专用工具就是 Jupyter Notebook：一个浏览器里的工作台，代码切块执行、输出（包括图表）直接钉在代码下方，还能插文字笔记。数据探索、画原型、写教程，它都是第一选择。

## 先动手：十分钟跑通

```bash
pip install notebook pandas matplotlib
jupyter notebook
```

浏览器自动打开，右上方新建 Notebook（Python 3 内核），得到一排空格子（cell）。第一个格子写：

```python
import pandas as pd

df = pd.read_csv("readings.csv")
df.head()
```

`Shift+Enter` 运行。输出不是 print 出来的文字，而是一张排好版的表格——这就是 Notebook 与 REPL 的第一个区别：**表达式的值自动富显示**。再补一个格子看分布：

```python
df["value"].plot.hist(bins=50)
```

直方图直接嵌在输出区。到此你已经完成了一次完整的数据速览：读入、看头几行、看分布，全程没有写过一个 `print`。

## 交互利器：问号与魔法命令

Notebook 的内核是增强版 Python（IPython），自带一套桌面工具：

```python
len?            # 任意对象后跟问号：弹出文档
df.readings??   # 两个问号：尽量弹出源码
```

```python
%timeit sum(range(10_000))     # 这行跑多次取统计值，测小段代码耗时
```

```text
95.4 us +- 1.2 us per loop (mean +- std. dev. of 7 runs, 10,000 loops each)
```

更多高频魔法：`%who` 列出当前所有变量（内核跑了半天不知道内存里有什么时救命）；`%history` 看执行过的代码；`!pip install xxx` 在格子里直接执行 shell 命令（`!` 前缀）。性能测量的完整方法论见 [性能优化](/python/690-PythonPerformance)，`%timeit` 是其中最快的随手一测。

## 为什么：内核是常驻进程

Notebook 文件（`.ipynb`）只是 JSON 文档，真正干活的是背后的**内核进程**：变量、import、打开的文件都活在内核内存里，cell 只是往这个进程里投递代码。这个模型解释了它的一切优点与一切坑：

- 优点：`pd.read_csv` 跑一次，后续每个格子都直接用 `df`，探索成本极低；
- 坑的根源：**格子在文档里的顺序，不等于它们在内核里的执行顺序**。

你会真实撞上这个坑：把定义 `data = [...]` 的格子挪到文件末尾再运行一次中间的格子，中间格子居然还能跑——因为定义还留在内核里。换个同事拿到文件从头跑，当场报 `NameError`。于是有了一条铁律级的操作：**交出去之前 `Kernel -> Restart & Run All`**，从零按文档顺序跑通全篇，才算真的可复现。

## 常见坑点

坑一：乱序执行与隐式状态。上面已演示，纪律只有 Restart & Run All 一条；团队协作时可以配 CI 自动跑一遍 Notebook（nbconvert 执行模式）。

坑二：输出全量进 git。`.ipynb` 把输出（包括大图表的 base64）存在文件里，随手 commit 一次几 MB，diff 完全没法看。方案三选一：提交前跑 `nbstripout` 清输出；用 `jupytext` 把 Notebook 与纯 `.py` 同步、只版本管理后者；或者干脆约定产物（图表）单独存文件。

坑三：把 Notebook 当生产服务。定时任务、Web 后端写进 `.ipynb` 里靠人手点运行，等于把生产交给最不可靠的执行者。Notebook 的终点是「探索出正确的逻辑」，然后把逻辑**搬进 `.py` 模块**进正常的工程流程（测试与 CI 见 [Python 测试](/python/750-PythonTest) 与 [CI/CD](/python/780-PythonCICD)）。

坑四：内存只增不减。大 DataFrame 读进内核就驻留，试错过程中反复读入不同版本，几 GB 内存悄悄蒸发，最后 OOM。习惯：换数据前 `del df` 主动丢弃；发现卡顿先 `%who` 盘点变量。

坑五：魔法命令写进脚本。`%timeit`、`!ls` 离开 Notebook 就是语法错误。探索代码转正式模块时记得替换（`time.perf_counter`、`pathlib`、`subprocess`）。

## 进阶出口

Notebook 生态的常见下一步，按需取用：

- **参数化执行**：papermill 把 Notebook 当函数调，传参数批量跑（给 50 个设备各生成一份报告）；
- **变成网页**：Voila 把 Notebook 一键变成纯输出的交互页面，给不写代码的同事看；
- **转脚本**：`jupyter nbconvert --to script demo.ipynb` 一条命令出 `.py`；
- **团队平台**：多人共用算力用 JupyterHub，云上托管方案（SageMaker、Vertex AI）都是它的包装。

## 自我检查

- 能说清 `.ipynb` 文件与内核进程的关系，以及「乱序也能跑」的原因；
- 会用 `?`、`%timeit`、`%who` 三件套；
- 能复述「交付前 Restart & Run All」及其理由；
- 知道提交输出、生产服务、魔法命令残留三个坑各自的对策。

## 练习

1. 预测题：格子里只写 `df.head()` 不写 print，输出与 `print(df.head())` 有何不同？（提示：富显示的 repr 通道。）
2. 修改题：把「读 CSV、看分布、画直方图」三步改造为读任意文件名的参数化流程，用 papermill 跑两个不同数据文件。
3. 实战题：拿任意一份自己的数据（导出的账单、日志都行）建 Notebook 完成一次速览：行数、缺失值、一个数值列的分布图，然后 Restart & Run All 验证可复现。
4. 挑战题：用 jupytext 把一份 Notebook 配对成 `.py`，改 `.py` 再同步回 `.ipynb`，体验「git 只看 py」的工作流；记录一次它帮你避免的 diff 灾难。

## 下一步

- 完整的数据分析项目实战（爬取到报表）：[爬虫项目实战](/python/970-PythonProjectExampleWebCrawlerDataAnalysis)；
- Notebook 里最常写的 pandas 之外的自动化脚本：[自动化手册](/python/980-PythonAutomationCookbook)；
- `%timeit` 背后的测量方法论：[性能优化](/python/690-PythonPerformance)。
