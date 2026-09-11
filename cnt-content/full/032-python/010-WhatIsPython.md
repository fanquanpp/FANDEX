---
order: 10
title: Python 是什么：最友好的第一门通用语言
module: 'python'
category: 后端技术
difficulty: beginner
description: 面向零基础读者介绍 Python 的定位、应用版图与语法气质，并完成第一次运行。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'python/020-PythonOverviewEnvSetup'
prerequisites: []
---

## Python 在技术版图中的位置

如果说 JavaScript 统治浏览器，**Python 统治的则是"人与数据"之间的地带**：脚本自动化、数据分析、人工智能、Web 后台、爬虫、科学计算——它都是默认语言之一。语法接近自然英文，是公认的入门门槛最低的通用语言。

```python
# 同样是"从 1 加到 100"，Python 长这样
total = 0
for i in range(1, 101):
    total = total + i
print(total)   # 5050
```

对比 JavaScript 版本你会发现：少了一堆分号与括号，**用缩进表示代码块**是 Python 的标志性设计——逼着你写出整洁的结构。

## 应用版图

| 方向 | 代表库 | 说明 |
| --- | --- | --- |
| 自动化脚本 | 标准库 | 批量改文件、定时任务、办公自动化 |
| 数据分析 | pandas | 表格处理、统计汇总 |
| 人工智能 | PyTorch | 深度学习事实标准 |
| Web 后台 | FastAPI、Flask | 快速搭建接口服务 |
| 爬虫 | requests | 采集公开网页数据 |

## 它如何运行

Python 是**解释型语言**：安装官方解释器后，用 `python 文件名.py` 即可运行，没有编译步骤，改一行看一次结果，非常适合初学者建立即时反馈。安装步骤见 [Python 概述与环境搭建](/python/020-PythonOverviewEnvSetup)。

## 当前版本怎么选

直接装 **Python 3.12 及以上**的最新稳定版即可。版本节奏是每年 10 月发一个大版本：3.12（2023）带来更好的报错提示与泛型新语法，3.13（2024）换了全新交互式解释器并首次提供实验性的"自由线程"构建，3.14（2025）自由线程转为正式支持并新增模板字符串。新特性不用急着用，但**新项目不要再用已停止维护的旧版本**——安全补丁只发给受支持的版本线。多版本共存交给工具，见 [pyenv 与 uv 版本管理](/python/030-PyenvUvManage)。

## 动手环节：两次运行

安装完成后打开终端：

第一次，交互模式——输入 `python` 回车，进入 `>>>` 提示符，逐行输入：

```python
>>> name = '学习者'
>>> print('你好，' + name)
你好，学习者
>>> 2 ** 10
1024
```

`**` 是乘方运算符。交互模式是试语法的好地方，输入 `exit()` 退出。

第二次，脚本模式——新建 `hello.py` 写入：

```python
def greet(name: str) -> str:
    """向指定的人打招呼"""
    return f'你好，{name}'

print(greet('学习者'))
```

执行 `python hello.py`。这里的 `def` 定义函数、`f'...'` 是格式化字符串——先混个眼熟，本模块第二篇起逐一讲透。

## 常见困惑

**"Python 2 与 Python 3 是什么关系？"**——直接学 Python 3，Python 2 已于 2020 年停止维护，网上教程若基于 Python 2 直接跳过。

**"听说 Python 很慢？"**——它的确不是性能冠军，但绝大多数场景瓶颈在硬盘与网络而非语言本身；需要极致性能的部分由 C 实现的底层库承担。

**"缩进错了会怎样？"**——会直接报 `IndentationError`。统一用 4 个空格缩进，不要混用 Tab，编辑器设置里锁定这一条。

**"听说 GIL 让多线程没用？"**——半截话。GIL 确实让纯计算无法多核并行，但网络等待、文件读写时 GIL 会释放，多线程照样有效；需要 CPU 并行还有进程池等方案。详细见 [GIL 与自由线程](/python/650-GILAndFreeThreading)。

## 本模块怎么学

主线四步走：**环境与语法**（002-003、020、071）建立语言直觉 -> **函数与面向对象**（028、065、072-073）学会组织代码 -> **进阶机制**（装饰器、生成器、异步、类型注解）理解 Python 的独特设计 -> **工程与生态**（打包、测试、Web 框架、并发）走向真实项目。每篇都配可运行示例，学完一篇跑通一篇，比囤积式收藏有效得多。

## 下一步

进入 [Python 概述与环境搭建](/python/020-PythonOverviewEnvSetup) 系统开始语法主线；装环境遇到问题先查 [Python 安装](/python/020-PythonOverviewEnvSetup) 与 [环境验证清单](/shell/110-EnvVerificationChecklist)。
