---
order: 70
title: 第二门语言体验：Python 与第一个实用工具
description: 用 Python 从零写出记账小程序：REPL 交互、脚本文件、列表与字典、文件读写，并与 JavaScript 对比，帮助零基础学习者选定主线语言。
module: 'start'
category: 工具链
difficulty: beginner
prerequisites:
  - 'start/060-FirstProgramJavaScript'
author: fanquanpp
updated: '2026-09-18'
related:
  - 'python/010-WhatIsPython'
  - 'start/080-LearningRouteOverview'
---

## 学习目标

体验第二门语言的目的不是"多学一门"，而是**对照选择主线**。读完本篇你将：

1. 跑通 Python 的两种玩法：交互式 REPL 与脚本文件；
2. 认识 Python 两个主力数据结构：列表与字典；
3. 独立写出一个真正有用的小工具：命令行记账程序（数据存文件，关了不丢）；
4. 对照 JS 与 Python 的手感差异，结合方向目标选定主线语言。

预计 60 到 90 分钟。

## 前置知识

- 已完成 [第一门语言体验](/start/060-FirstProgramJavaScript)，理解变量、条件、循环、函数四个构件；
- Python 已安装并通过 `python --version` 验证（[开发环境搭建](/start/030-DevEnvironmentSetup)）。

## REPL：边问边答的计算器

终端输入 `python`（macOS 输入 `python3`）回车，进入 **REPL**（交互式解释器：你输一行，它答一行），提示符变成 `>>>`：

```python
>>> 2 + 3 * 4
14
>>> 10 % 3
1
>>> "Python" * 3
'PythonPythonPython'
```

注意最后一行：字符串乘 3 是复制三遍——Python 允许这种"直觉式"操作，这是它手感的第一印象。退出 REPL：`exit()` 或 `Ctrl+Z` 回车（Windows）/ `Ctrl+D`（macOS）。

REPL 的正确用途：**试验单个语法、验证函数行为**，像随手可用的草稿纸。正式代码写进文件，下面开始。

## 脚本文件与中文输出

在 `my-code/week1` 新建 `hello.py`：

```python
print("你好，Python")
name = "小明"
age = 25
print(f"{name} 今年 {age} 岁")
```

终端运行（在 week1 目录下）：

```bash
python hello.py      # macOS: python3 hello.py
```

输出两行。第四行用了 **f-string**：字符串前加 `f`，花括号里的变量会被替换成值——这是 Python 推荐的拼接写法，比 JS 的加号拼接清爽。

**逐点对比 JS**：语句结尾没有分号；代码块不用大括号 `{}` 而用**缩进（通常 4 个空格）**——缩进就是语法本身，缩错直接报错。这两点是 Python 极简手感的来源，也是新手报错高发区（`IndentationError` 就是缩进错误）。

## 条件与循环：同样的骨架，更短的皮肤

```python
score = 85

if score >= 90:
    print("优秀")
elif score >= 60:
    print("及格")
else:
    print("不及格")

for i in range(1, 6):
    print(f"第 {i} 次循环")
```

对照 JS 的差异点：

- 分支用 `elif`（不是 `else if`），条件后是**冒号加缩进**，没有大括号和括号；
- 循环写作 `for i in range(1, 6)`：`range(1, 6)` 产生 1,2,3,4,5（含头不含尾），意思是"对序列里的每个元素循环一遍"——Python 的 for 本质是"遍历"，比 JS 的计数式 for 更常用；
- 取余 `%`、比较 `==` 与 `!=` 与 JS 相同（Python 用 `==` 判等即可）。

## 列表与字典：Python 的两大容器

**列表（list）**——一排有序的盒子：

```python
scores = [90, 85, 77]
print(scores[0])        # 90，下标从 0 开始
print(len(scores))      # 3，列表长度
scores.append(60)       # 尾部添加
print(sum(scores) / len(scores))   # 求和再除以个数：平均分 78.0
```

**字典（dict）**——键值对，用名字取东西：

```python
student = {"name": "小明", "age": 25}
print(student["name"])       # 小明
student["city"] = "北京"      # 新增一键
print(student)
# {'name': '小明', 'age': 25, 'city': '北京'}
```

这两个结构覆盖日常开发 80% 的数据组织需求：列表管"一批同类东西"，字典管"一个东西的多项属性"。后续 Python 模块会展开更多玩法，本篇会组合它们就够了。

## 实战项目：命令行记账程序

目标：运行程序后可反复录入"用途 + 金额"，输入 `q` 退出，退出时打印账单汇总，并把记录保存到文件（下次启动还在）。

新建 `ledger.py`，完整代码如下，**建议先自己按注释骨架写一版再对照**：

```python
import json
import os

FILE = "ledger.json"

# 读取历史账目（文件不存在则从空账本开始）
if os.path.exists(FILE):
    with open(FILE, "r", encoding="utf-8") as f:
        records = json.load(f)
else:
    records = []

print("欢迎使用记账本，输入用途和金额，输入 q 退出")

while True:
    purpose = input("用途：").strip()
    if purpose == "q":
        break
    amount_text = input("金额：").strip()
    try:
        amount = float(amount_text)
    except ValueError:
        print("金额必须是数字，这条没记上")
        continue
    records.append({"purpose": purpose, "amount": amount})

# 保存
with open(FILE, "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

# 汇总
print(f"\n本次共 {len(records)} 笔：")
total = 0
for r in records:
    print(f"  {r['purpose']}：{r['amount']}")
    total += r["amount"]
print(f"合计：{total} 元")
```

运行 `python ledger.py`，录几笔，`q` 退出看汇总；再运行一次，录新账——旧账还在，因为数据存进了 `ledger.json` 文件。用 VS Code 打开这个 json 看一眼，你会发现它是人类可读的——这就是为什么 json 是最通用的数据交换格式。

代码里的新面孔逐个说明：

- `import json` / `import os`：引入标准库模块（json 处理 json 数据，os 提供操作系统相关功能），Python 的" batteries included"（自带电池）哲学——常用能力不用装任何东西；
- `open(FILE, "r", encoding="utf-8")` 打开文件，`with` 块结束时自动关闭；`json.load` 读、`json.dump` 写；
- `input()` 等待用户输入一行；`.strip()` 去掉首尾空格；
- `try / except ValueError`：捕获"金额不是数字"的崩溃，转成友好提示——这是**异常处理**的第一次亮相，后续模块的主角之一；
- `while True` + `break`：无限循环直到主动退出。

**动手变体（按方法论梯度）**：加一个"删除最后一笔"的功能；加"按用途筛选合计"；把提示语全部改成你自己的风格。改完每个变体都完整测试一遍。

## 选主线：JS 还是 Python

两门语言各 90 分钟体验后，给出选型决策表（结合 2026 年市场数据）：

| 维度 | JavaScript | Python |
| --- | --- | --- |
| 运行环境 | 浏览器自带 + Node | 需安装，但系统常见 |
| 上手手感 | 规则多但反馈极快（F12 即玩） | 语法最简，适合写工具脚本 |
| 就业主战场 | 前端/全栈（React+TS+Node 需求最大） | 后端/数据/AI/自动化 |
| 对应本库路线 | [前端路线](/roadmap/020-FrontendRoute)、[Node 全栈](/roadmap/060-FullStackNodeRoute) | [Python 后端与 AI 路线](/roadmap/050-BackendPythonAIRoute) |

**决策原则**：想做网页界面 → JS；想做数据/AI/自动化工具 → Python；完全没想法 → 选 JS（市场容量最大，且 TS/前端生态对新人岗位更友好）。**选定后 6 个月内不再摇摆**——双线并行的代价是两条都不精，这是转行者最常见的翻车姿势。另一门语言作为第二技能在主线站稳后再补。

## 常见困惑

**"`IndentationError` 一堆，怎么破？"**——统一用 4 个空格缩进，VS Code 会自动处理；不要空格与 Tab 混用。看到缩进报错先检查那一行的行首。

**"`ModuleNotFoundError: No module named 'json'`？"**——基本不会发生（json 是内置库）；若出现在第三方库（如 requests），说明需要 `pip install 库名`，Python 模块的包管理章节会系统讲。

**"两门语言怕记混？"**——会混两周，然后自动分清。诀窍是**按概念记而不是按语法记**：变量/条件/循环/函数/容器这五个概念在任何语言里都存在，语法只是"方言"。

## 检验清单

- REPL 里验证过字符串乘法与取余；
- 记账程序能跑通：录入、异常输入提示、退出汇总、二次启动历史保留；
- 至少完成一个动手变体；
- 能说出两门语言的三点差异，并且已经定下自己的主线。

## 下一步

带着你的主线选择，进入 [全库学习路线总览](/start/080-LearningRouteOverview)，把 12 个月的地图铺开；随后到 [技术栈路线图](/roadmap/010-RoadmapOverview) 找到你的专属路线，正式开始阶段 1。
