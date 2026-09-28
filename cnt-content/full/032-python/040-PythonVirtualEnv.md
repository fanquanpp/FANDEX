---
order: 40
title: 虚拟环境：让每个项目各用各的包
module: 'python'
category: 后端技术
difficulty: beginner
description: 以两个项目抢同一个包的真实冲突切入，动手创建并管理第一个 venv：创建、激活、装包、导出 requirements、删除重建，再用 uv 走一遍等价的现代路线，附 Windows 激活报错实录与四类练习。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'python/030-PyenvUvManage'
  - 'python/045-PythonEnvToolsLandscape'
  - 'python/020-PythonOverviewEnvSetup'
  - 'python/730-PythonPackagingEvolution'
  - 'python/975-PythonCapstoneProject'
prerequisites:
  - 'python/020-PythonOverviewEnvSetup'
---

## 前置知识

- 已完成 [Python 概述与环境搭建](/python/020-PythonOverviewEnvSetup)：终端里 `python --version` 能正常回应；
- 建议先看一眼 [pyenv 与 uv 版本管理](/python/030-PyenvUvManage)：知道"多版本解释器"这个概念即可，本文不依赖它。

还不会写 Python 语法？完全没关系——本文全程只敲命令，一行 Python 代码都不用写。这是语法主线（050 篇起）之前最后一次纯环境操作。

## 学习目标

读完本文你将能够：

1. 说清虚拟环境解决什么问题：让 A、B 两个项目各用各的包，互不干扰；
2. 独立完成一次完整循环：创建 `.venv`、激活、装包、退出、删除重建；
3. 用 `pip freeze > requirements.txt` 把项目依赖"存档"，并在别处一键恢复；
4. 遇到「无法加载文件 Activate.ps1，因为在此系统上禁止运行脚本」时知道怎么修；
5. 判断什么时候用 `python -m venv` 裸命令、什么时候用 uv 一条龙。

预计 30 到 45 分钟（含两轮完整的创建与删除），含 3 组修改实验与 4 道练习。

## 1. 你现在要解决什么问题

设想两个月后的你，手上同时有活儿的两个项目：

- 项目 A：去年的爬虫脚本，用的是 `requests 2.31`——升级到新版后它的某个老接口没了；
- 项目 B：今天新建的日记工具，想用 `requests` 的最新版。

`pip install` 默认把包装进**同一个全局位置**（site-packages）。装来装去你会发现：升级 B 需要的新版，A 就坏；保住 A 的旧版，B 就装不上。这不是你操作失误，是"全局只有一份包"这个默认设定天生不适合多项目。

虚拟环境的解法朴素得可爱：**给每个项目一个独立的包目录**。项目 A 的包放在 A 的文件夹里，项目 B 的放在 B 的文件夹里，同一个包想装几个版本都行。Python 内置的 `venv` 模块就是干这个的，本文带你把它跑通。

## 2. 先不要看解释，先试试看

打开终端，建一个练习目录，然后三步走。Windows（PowerShell）：

```powershell
mkdir venv-lab
cd venv-lab
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

macOS / Linux（bash 或 zsh）：

```bash
mkdir venv-lab
cd venv-lab
python3 -m venv .venv
source .venv/bin/activate
```

成功后最直观的信号是**命令行提示符前面多了一个 `(.venv)`**：

```text
(.venv) PS C:\Atian\Project\venv-lab>
```

它表示：从现在起，你敲的 `python` 和 `pip` 都指向 `.venv` 这个独立小天地，不再是全局那一份。验证一下：

```bash
pip list
```

```text
Package Version
------- -------
pip     24.0
```

一个刚出生的虚拟环境里几乎什么都没有——这正是它的意义：干净，从零开始装。

## 3. 装第一个包，确认隔离真的存在

环境已激活，装个第三方库（比如 `requests`，很多教程的第一个外部依赖）：

```bash
pip install requests
```

然后回答一个关键问题：**这个包装到哪了？** 用 pip 自己来交代：

```bash
pip show requests
```

```text
Name: requests
Version: 2.32.3
Location: c:\atian\project\venv-lab\.venv\lib\site-packages
```

看 `Location`：它落在 `.venv` 文件夹**里面**。用文件管理器打开 `venv-lab\.venv` 看一眼，你的两个包（requests 和它依赖的 charset-normalizer、urllib3 等）全在这里。

现在做隔离实验：

1. 另开一个**新的**终端窗口（不要激活环境），运行 `pip list`——里面没有 requests。全局是全局，环境是环境；
2. 回到激活了环境的窗口，再运行 `pip list`——requests 在。

同一个电脑，两个 pip，看到两个世界。以后每个项目都这么各过各的日子。

修改实验一：在激活状态下把 requests 升级或降级（`pip install "requests==2.31.0"`），观察版本号变化；再开一个未激活的终端查全局版本，确认互不影响。

## 4. 退出与回来：激活只是一层"皮肤"

 deactivate 命令退出环境：

```bash
deactivate
```

提示符前面的 `(.venv)` 消失，pip 又变回全局那一份。

这里有个新手最容易懵的点，值得单独一节：**所谓"进入环境"，只是临时改了 PATH 环境变量，让 `python`/`pip` 先找到 `.venv` 里的那一份**。它不改任何系统设置，关掉终端就自动失效。所以：

- 换一个终端窗口 = 忘了激活状态，需要重新激活；
- `.venv` 文件夹本身一直在原地，激活只是"戴上"它，删除文件夹就是彻底删除环境；
- 环境损坏或想重来？`deactivate` 之后直接删掉 `.venv` 文件夹，再 `python -m venv .venv` 重建，一分钟的事，不要心疼。

修改实验二：激活环境后直接关掉终端，重开一个新终端进入同一目录，运行 `pip list`。观察 requests 不见了（因为新窗口没激活），然后重新激活再看。

## 5. requirements.txt：把依赖清单存档

项目能跑，靠的是「Python 3.12 + 这几个第三方包和版本」。前一半记在自己脑子里，后一半交给 `pip freeze`：

```bash
pip freeze > requirements.txt
```

打开这个文件，长这样：

```text
charset-normalizer==3.4.0
idna==3.10
requests==2.32.3
urllib3==2.2.3
```

每一行「包名==精确版本」。这就是项目的**依赖存档**。换电脑、发给别人、部署到服务器，恢复只需一条命令：

```bash
pip install -r requirements.txt
```

先激活目标环境再执行。别人拿到你的项目代码 + 这份清单，就能装出一模一样的依赖组合——这就是「可复现」的最小实现。注意一个细节：`pip freeze` 会把**间接依赖**（requests 依赖的 urllib3 等）也全部列出。简单项目无所谓；进阶后可以用 `pyproject.toml` 只声明直接依赖，把间接依赖交给锁文件管理，那是 [打包演进史与工程化](/python/730-PythonPackagingEvolution) 的内容。

## 6. 常见坑点与真实报错

坑一：Windows PowerShell 报「禁止运行脚本」。

```text
.\.venv\Scripts\Activate.ps1 : 无法加载文件 ...因为在此系统上禁止运行脚本。
```

Windows 默认禁止 PowerShell 运行脚本。修复（当前用户级，一次性）：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

不想改策略也行：改用 cmd 的 `.\.venv\Scripts\activate.bat`，或 Git Bash 的 `source .venv/Scripts/activate`。

坑二：忘了激活就 `pip install`。包装进了全局，环境里却没有，代码一跑就 `ModuleNotFoundError`。排查看两点：提示符前有没有 `(.venv)`；`pip show 包名` 的 Location 在不在 `.venv` 里。

坑三：把 `.venv` 提交进 Git。它动辄几十上百 MB，且跨系统不通用。在 `.gitignore` 里加一行 `.venv/`，仓库里只留 `requirements.txt`（或以后的锁文件）。

坑四：`sudo pip install`（macOS / Linux）。往系统 Python 里塞第三方包，可能弄坏操作系统自带的工具。原则：**永远不往全局装包，装包先进环境**。

坑五：升级系统 Python 后旧环境打不开。环境的 Python 版本在创建那一刻就焊死了，系统解释器大版本变动可能让环境失效。处理方式同上：删掉重建。

## 7. uv 路线：同样的活，更快的刀

030 篇介绍过的 uv 可以把本文整套动作压缩：

```bash
uv venv                      # 创建 .venv（比 python -m venv 快得多）
uv pip install requests      # 无需手动激活，uv 自动找到 .venv
uv pip freeze > requirements.txt
uv pip install -r requirements.txt
```

uv 的显著差别：`uv pip install` 不要求你先激活，它会自动发现当前目录（或父目录）的 `.venv`。日常二选一即可：学原理、求通用用 `python -m venv` + `pip`（任何 Python 环境都有）；讲效率、团队统一用 uv。两者创建的环境是同一个格式，随时混用、随时换。

修改实验三：删掉 `.venv`，用 uv 重建并恢复 requests，对比两条路线的耗时。

## 8. 什么时候应该 / 不应该

应该：每开一个新项目，第一件事就是 `python -m venv .venv` 并写好 `.gitignore`；装任何第三方包之前先确认环境已激活（或用 uv）；依赖变化后及时更新 `requirements.txt`。

不应该：往全局 site-packages 里装项目依赖；把 `.venv` 提交进 Git 或拷贝给别人（给依赖清单，不给环境本身）；一个环境供多个项目共用——那就回到了原点问题。

## 9. 与之前和之后的知识的关系

- 往前：[Python 概述与环境搭建](/python/020-PythonOverviewEnvSetup) 装好了全局解释器，本文给它套上按项目隔离的一层；[pyenv 与 uv](/python/030-PyenvUvManage) 解决"多个 Python 版本"，本文解决"多套第三方包"，合起来才是完整的环境管理；
- 往后：语法主线（[第一个程序](/python/050-ProgramStructureBasicSyntax) 起）写出的每个项目都应住在这种环境里；[模块、包与工程化](/python/720-ModulePackageEngineering) 与 [打包演进](/python/730-PythonPackagingEvolution) 会把 requirements.txt 升级为 `pyproject.toml` + 锁文件；[毕业项目](/python/975-PythonCapstoneProject) 从第一天就要求环境、依赖清单、Git 三件套齐备。

## 10. 官方文档

- venv 模块（标准库参考）：https://docs.python.org/zh-cn/3/library/venv.html
- pip 用户指南：https://pip.pypa.io/en/stable/user_guide/
- uv 官方文档：https://docs.astral.sh/uv/

## 11. 自我检查

- 能不查资料默写「创建、激活、退出、删除」四步的命令（Windows 与 macOS / Linux 各一套）；
- 能说清激活前后 `pip` 分别指向哪里，并用 `pip show` 验证；
- 能解释 requirements.txt 是什么、怎么生成、怎么恢复；
- 拿到「禁止运行脚本」报错知道三种出路；
- 能说清为什么不提交 `.venv`、为什么不 `sudo pip install`。

## 练习

预测题：激活环境装好 `rich` 后，执行 `pip uninstall rich` 再 `python -c "import rich"`，会输出什么？换了未激活的终端再 import 一次呢？（自己跑一遍验证。）

修改题：新建第二个目录 `venv-lab-2`，建自己的环境，装 `rich==13.7.1`，并导出 requirements.txt。然后回答：两个目录里的 requests / rich 版本互相影响吗？

排错题：队友克隆了你的项目，直接运行 `python -m venv .venv` 后立刻 `python -c "import requests"`，报 `ModuleNotFoundError: No module named 'requests'`。列出他漏掉的步骤（至少两处）。

挑战题：写一个 `reset-env.sh`（或 `reset-env.ps1`）脚本：删除 `.venv`、重建环境、从 requirements.txt 恢复依赖。提示：Windows PowerShell 脚本里激活环境用 `& .\.venv\Scripts\Activate.ps1`，或者干脆跳过激活直接用 `.venv 里的 python -m pip install -r requirements.txt`。

## 本章总结

虚拟环境给每个项目一份独立的包目录，解决「两个项目抢同一个包」的死结；`python -m venv .venv` 创建，激活只是临时改 PATH，`deactivate` 或关终端即摘掉；`pip freeze > requirements.txt` 存档依赖，`pip install -r requirements.txt` 一键复原；`.venv` 永不进 Git，依赖清单永远要进；uv 是同一件事的加速版。从下一篇起，每个项目都先建环境再动手。

## 下一步

环境已就位，进入语法主线第一课 [程序结构基本语法：写下你的第一个程序](/python/050-ProgramStructureBasicSyntax)——在这次建好的环境里，写出你的记账程序。
