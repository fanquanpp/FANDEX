---
order: 20
title: Python 概述与环境搭建：给电脑装上翻译官
module: 'python'
category: 后端技术
difficulty: beginner
description: 用「给电脑雇翻译官」讲清解释器是什么、官网安装包与 uv/pyenv 版本管理器的分工、三系统安装要点与两条验证命令，附装机高频报错的真实调试实录与练习。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'python/030-PyenvUvManage'
  - 'python/040-PythonVirtualEnv'
  - 'python/050-ProgramStructureBasicSyntax'
  - 'shell/100-EnvVarPath'
prerequisites:
  - 'python/010-WhatIsPython'
---

## 前置知识

- 已完成 [Python 是什么](/python/010-WhatIsPython)：知道 Python 是解释型语言、见过两次「跑起来」的样子。

还没读完前一篇也没关系，只要知道：你写的 Python 代码需要一位「翻译官」来执行，本文负责把它请上你的电脑。

## 学习目标

读完本文你将能够：

1. 用一句话说清「解释器」是什么，以及 `python 文件名.py` 运行时背后发生了什么；
2. 独立完成 Windows / macOS / Linux 任一系统的 Python 安装，并用两条命令验证通过；
3. 判断什么时候用官网安装包、什么时候需要 uv/pyenv 版本管理器，说出两者的分工；
4. 看懂 `python --version` 的输出，判断版本是否达标（3.12 及以上）；
5. 遇到「python 不是内部或外部命令」「敲 python 弹出应用商店」这类装机高频现场，能按三步定位修复。

预计 40 到 60 分钟（含一次完整安装与验证），含 3 组修改实验与 4 道练习。

## 1. 你现在要解决什么问题

你在 010 篇看过两段能跑的 Python 代码，跃跃欲试想写自己的记账程序。打开终端敲下 `python --version`，屏幕上却是一行冷冰冰的中文：

```text
'python' 不是内部或外部命令，也不是可运行的程序
或批处理文件。
```

（macOS / Linux 上是另一副面孔：`zsh: command not found: python`。）

原因很直白：电脑只认 0 和 1。你写的 `print('你好')` 是人类语言，CPU 一个字都看不懂。**想让电脑替你干活，第一步是给它雇一位翻译官**——专门把 Python 代码逐条翻译成 CPU 能执行的指令。这位翻译官就是 **Python 解释器**，而你在终端敲的 `python` 这条命令，就是在呼叫它。

翻译官还没上岗，所以终端根本找不到这个人。本文解决三件事：解释器是什么、怎么把它装上、怎么确认它真的上岗了。

## 2. 先查岗，再安装

先别急着下载——很多电脑上其实已经有翻译官了（macOS 与多数 Linux 出厂自带）。在终端运行：

```bash
python --version
```

预期输出（数字随你装的版本不同，重点是 `Python 3` 开头）：

```text
Python 3.14.1
```

对照结果做判断：

- 看到 `Python 3.12` 及以上：翻译官已在岗，直接跳到第 6 节做全套验证；
- 看到 `Python 2.x`：这是「前任翻译官」，2020 年就停止维护了，必须新装新版；
- 看到本文开头的报错：确实没人上岗，继续往下装。

再补一条能真正「干活」的验证——让翻译官现场翻译一句话：

```bash
python -c "print('翻译官就位')"
```

`-c` 的意思是：把后面引号里的字符串当作 Python 代码，直接执行。预期输出：

```text
翻译官就位
```

两条都通过，环境已经可用；装的过程出了岔子，后面的调试实录全用得上。

## 3. 发生了什么：解释器与两种运行方式

`python --version` 和 `python -c` 背后是同一个程序：Windows 上叫 `python.exe`，macOS / Linux 上通常叫 `python3`。你从官网下载的就是 **CPython**——用 C 语言写的官方参考实现。解释器的实现不止一种（跑在 JVM 上的 Jython、给单片机用的 MicroPython），新人阶段一律用 CPython。

它的工作流程一句话讲完：把源码文本读进来，编译成中间指令（字节码），再在自己的虚拟机上逐条执行。「解释型语言」说的就是这个全自动的过程——你只管写代码，翻译的活它全包，改一行跑一次，不用手动编译。

010 篇见过的两种用法，对应解释器的两张面孔：

- `python`（不带参数）：进入交互模式，在 `>>>` 提示符后逐行喂代码，适合试语法；
- `python 文件名.py`：执行整个脚本文件，这是写程序的正常形态。

## 4. 两条安装路线：官网安装包与版本管理器

装翻译官有两条路，分工完全不同：

**路线一：官网安装包（本篇走这条）。** 打开 https://www.python.org/downloads/ ，网站会自动识别你的系统并推荐最新稳定版，下载、安装、完成。它一次安装一个固定版本，全局生效。入门期你只需要一个 Python，这条路线最短。

**路线二：版本管理器 pyenv 与 uv。** 什么时候才需要？当你同时维护两个项目——A 项目要求 3.10、B 项目要求 3.13——就需要一条命令切换版本的工具。现在不用装、不用学，知道有这回事即可，细节见 [pyenv 与 uv 版本管理](/python/030-PyenvUvManage)；与它配套的「每个项目一套独立依赖」叫虚拟环境，见 [Python 与虚拟环境](/python/040-PythonVirtualEnv)。

**版本怎么选：** 装 3.12 及以上的最新稳定版，当前稳定主线是 3.14.x。Python 每年 10 月发一个大版本，安全补丁只发给受支持的版本线，新项目不要用已停维护的旧版本——与 010 篇口径一致。

## 5. 三大系统安装要点

### Windows

1. 官网下载安装包，双击运行；
2. 安装器第一个界面，**必须勾选「Add python.exe to PATH」**——这一步是告诉 Windows「翻译官住在哪里」，是全文最重要的一次单击；
3. 点 Install Now，等进度条走完。

忘了勾怎么办：最省事的修法是卸载重装、这次勾上；手动改环境变量（PATH 是终端找程序的「地址簿」）的方法见 [环境变量与 PATH](/shell/100-EnvVarPath)。

另一个高频现象：没装 Python 的 Windows 机器上敲 `python`，弹出的是 Microsoft Store 商店页面——那是 Windows 预设的「应用执行别名」，不是安装成功。装了官网版仍弹商店的话，到「设置 → 应用 → 高级应用设置 → 应用执行别名」，把 python.exe 与 python3.exe 两项关掉，重开终端再试。

### macOS

系统自带的 python3 版本偏旧且由系统锁定，**不要动它**（部分系统工具依赖它）。装新版二选一：

- Homebrew 方式（前提是装过 brew）：

```bash
brew install python
```

- 或用官网安装包，双击走完向导。

### Linux（Ubuntu / Debian 为例）

```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

CentOS / RHEL 把第一条换成 `sudo dnf install python3 python3-pip python3-venv` 即可。`python3-pip` 用来装第三方库，`python3-venv` 用来建虚拟环境，040 篇会用到，一并装上省事。

**命令名差异：** Windows 装完后命令是 `python`（还有个等价短命令 `py`）；macOS 与 Linux 通常是 `python3`。为避免混乱，下文统一写 `python`，macOS / Linux 读者请自动替换。

## 6. 验证：两条命令与预期输出

安装完成后，**重开一个终端**（别用安装前就开着的旧窗口，它读不到新配置），做全套验证。

第一条，查版本：

```bash
python --version
```

预期输出（你的数字可能更新）：

```text
Python 3.14.1
```

第二条，让它真干活：

```bash
python -c "print('环境就绪')"
```

预期输出：

```text
环境就绪
```

顺带确认随行的 pip（安装第三方库用，用法详见 040 篇）：

```bash
pip --version
```

预期输出（路径与数字因机器而异，关键是括号里显示的 Python 版本与你刚装的对得上）：

```text
pip 26.1.2 from C:\Users\you\...\site-packages\pip (python 3.14)
```

判断标准一句话：**版本号是 Python 3 开头且不低于 3.12，三条命令都正常回应——环境合格，随时开工。**

## 7. 修改实验

以下每条都**先预测输出，再运行验证**。

实验一：把 `-c` 里的内容换成算式（`**` 是乘方，010 篇见过）：

```bash
python -c "print(2 ** 10)"
```

实验二：拼接两个词：

```bash
python -c "print('Py' + 'thon')"
```

实验三：故意运行一个不存在的文件，认识你的第一个运行期报错：

```bash
python ledger.py
```

预期输出（路径随你的机器与所在目录变化）：

```text
python: can't open file 'C:\Users\you\ledger.py': [Errno 2] No such file or directory
```

按「读报错三步」走一遍：最后一行 `[Errno 2] No such file or directory` 说明「找不到文件」；引号里是它去找的完整路径——盯着看，常能发现文件名打错了、或人不在文件所在目录。修法：先 `cd` 到文件所在目录再运行，或补全文件名。

## 8. 常见错误与调试实录

**错误一：`'python' 不是内部或外部命令`（Windows）或 `command not found: python`（macOS / Linux）。**
定位三步：第一步，认清这不是 Python 报的错，是**终端**说「我找不到叫 python 的程序」；第二步，问自己翻译官装没装，没装先装；第三步，装了还报错，就是 PATH 里没有它——Windows 十有八九是漏勾了「Add python.exe to PATH」，卸载重装勾上最快，手动补配置走 [环境变量与 PATH](/shell/100-EnvVarPath)。

**错误二：敲 `python` 弹出 Microsoft Store。**
判断标志：弹出来的是商店窗口而非版本号。这不是 Python 的问题，是 Windows 的应用执行别名在抢戏，按第 5 节的步骤关掉两个别名项即可。

**错误三：`python --version` 显示 `Python 2.7.18`。**
老服务器（如 CentOS 7）和老教材里常见。Python 2 已于 2020 年停止维护，不要在它上面练习。修法：安装 Python 3，用 `python3` 命令调用新版；**不要卸载系统自带的旧版**——有些系统工具依赖它，让新旧共存、各叫各名才是正解。

## 9. 实际项目中的使用场景

- 你今天装的这套解释器，与生产环境里跑的是同一个概念：服务器用 Docker 镜像（比如 `python:3.14`）部署时，镜像里装的就是这位翻译官，你的代码原样能跑；
- 团队里「为什么你机器上好好的」这类纠纷，一半源于两人 Python 版本不同——排查的第一句话永远是互报 `python --version`；
- CI 流水线（如 GitHub Actions 的 setup-python 步骤）做的事和本文一样：报一个版本号，把解释器装到构建机上。

## 10. 本模块学习地图

一句话路线：你刚装好的解释器，接下来先交给 [pyenv 与 uv 版本管理](/python/030-PyenvUvManage) 与 [虚拟环境](/python/040-PythonVirtualEnv) 管理成体系，然后在 [程序结构基本语法](/python/050-ProgramStructureBasicSyntax) 写下你的第一个程序、经 [控制流](/python/060-ControlFlow) 与 [基本数据类型](/python/070-BasicDataType) 打牢语法地基，再由 [变量与常量](/python/090-VariableConstant) 与 [函数详解](/python/100-FunctionDetailed) 教你把代码组织成型——本模块之后的全部篇目都长在这条主线上。

## 11. 小练习

**预测题**（5 分钟）：不运行，先写下你预测的输出，再用 `python -c` 验证：

```bash
python -c "print('3' + '14')"
```

答案（先写完再看）：输出是 `314` 而不是 `17`——加号用在字符串上是拼接，不是加法。

**修改题**（5 分钟）：把验证命令改成一次输出两行文字。提示：字符串里的 `\n` 表示换行。预期输出是上下两行你指定的内容。

**修 Bug 题**（10 分钟）：同事的 Windows 电脑刚用官网安装包装完 Python，运行 `python --version` 仍然报「'python' 不是内部或外部命令」。请说出：问题出在哪一步、漏掉的那次单击是什么、两步内的修复方案。

**挑战题**（15 分钟）：为自己建一张「环境验证卡」：写下验证版本与验证执行能力的两条命令、各自的预期输出，实际运行核对后存进笔记；并在卡片上回答——如果版本号低于 3.12，你应该做什么。

## 12. 与之前和之后的知识的关系

- 往前：010 篇说 Python 是「解释型语言」，本文把「解释型」落到一个具体的程序上——把它装上、验证它、看懂它的两张面孔；
- 往后：030 与 040 接手版本与依赖管理；050 起你将在自己的机器上写程序，本文这两条验证命令会变成你的每日晨检。

## 13. 官方文档

- 下载页：https://www.python.org/downloads/
- Windows 平台使用说明：https://docs.python.org/zh-cn/3/using/windows.html
- macOS 平台使用说明：https://docs.python.org/zh-cn/3/using/mac.html
- Unix / Linux 平台使用说明：https://docs.python.org/zh-cn/3/using/unix.html

## 14. 自我检查

- 能不看笔记说出解释器是什么、`-c` 参数的作用；
- 在自己的机器上三条验证命令一次跑通，且知道达标线是 3.12 及以上；
- 能说出官网安装包与 pyenv / uv 的分工边界，以及什么时候才需要后者；
- 「不是内部或外部命令」「弹出商店」「显示 Python 2.7」三种现场，都知道第一步查什么。

## 本章总结

电脑不认识 Python 代码，认识它的是解释器——一个装进电脑的翻译官程序。入门期用官网安装包装一个 3.12 及以上的稳定版（当前主线 3.14.x）即可，Windows 记住勾选「Add python.exe to PATH」，macOS 与 Linux 用 `python3` 呼叫且不动系统自带版本；`python --version` 与 `python -c "print(...)"` 两条命令是你的验证标准；多版本与依赖管理是 uv/pyenv 和虚拟环境的分工，需要时再去学。

## 下一步

进入 [pyenv 与 uv 版本管理](/python/030-PyenvUvManage)：把「只有一个 Python」升级成「要哪个版本就有哪个版本」。如果你暂时用不上多版本，也可以直奔 [程序结构基本语法](/python/050-ProgramStructureBasicSyntax) 写下第一个程序，需要时再回来补这一课。
