---
order: 780
title: Python 毕业项目：个人记账与统计 CLI 工具的完整工程化
description: Python 模块出口项目：把 start 模块的记账原型升级为正式工程——argparse 子命令、JSON 与 SQLite 双存储、异常处理、pytest 单元测试、logging、pyproject.toml 打包、README 与 Git 管理，五个里程碑从高提示走到无提示，附可逐条勾选的验收断言。
module: 'python'
category: 后端技术
difficulty: advanced
author: fanquanpp
updated: '2026-09-27'
related:
  - 'python/720-ModulePackageEngineering'
  - 'python/100-FunctionDetailed'
  - 'python/810-PythonCLI'
  - 'python/300-FileIOContextManager'
  - 'python/130-ExceptionHandling'
  - 'python/750-PythonTest'
  - 'python/430-PythonLog'
  - 'python/730-PythonPackagingEvolution'
  - 'python/030-PyenvUvManage'
  - 'python/770-PythonCodeQuality'
  - 'python/830-PythonSQLAlchemy'
  - 'git/430-GitCapstoneProject'
prerequisites:
  - 'python/780-PythonCICD'
  - 'start/070-FirstProgramPython'
---

## 前置知识

- 已走完 Python 模块主线，至少完成到 [Python 与 CI/CD](/python/780-PythonCICD)（该篇只影响选做的 CI 一条，标注**可后补**，不阻塞开工）；
- 手里有 [start 模块的记账原型](/start/070-FirstProgramPython)：一个 `ledger.py`，交互式录入、JSON 存文件、退出时打印汇总。原型代码可以丢，里面的历史账目数据留着，本文会把它迁进新工程。

## 背景与目标

start/070 的记账程序 60 行代码解决了「记下账、不丢失」，但它是个原型：单文件、交互式 while 循环、逻辑与输入输出搅在一起、没有测试、不能安装。它能证明你会 Python，却不能证明你能交付软件。

本项目把这份原型升级为**正式工程**：一个名叫 `ledger` 的命令行工具，装进环境后在任何目录敲 `ledger` 就能用，带子命令、双存储后端、单元测试、日志与打包配置。做完后它不是「一份代码」，而是一个可发布、可复现、可继续生长的作品——与本库 [FANDEX 仓库](https://github.com/fanquanpp/FANDEX) 走的是同一条工程链：需求 → 实现 → 测试 → 打包 → README → Git 管理。

学完本项目你新增的能力：

1. 把脚本感程序重构为包结构，业务逻辑与命令行界面分离；
2. 用 argparse 设计子命令接口，用自定义异常把崩溃变成体面的报错；
3. 面向存储接口编程，JSON 与 SQLite 两套后端随时切换；
4. 用 pytest 建立安全网，让每次重构都有底气；
5. 用 pyproject.toml 打包、写像样的 README、用 Git 管理全程。

预计两天（对应 Level 6 到 7）。项目名、命令名、数据文件位置、SQLite 表结构、统计口径与输出格式均由你自己决定——这是你的作品，不是抄写题。

## User stories（必做 12 条）

每条都是可检查的断言。示例命令假定工具名是 `ledger`，换成你起的名字同理。

- **P1** 可安装：`pip install -e .` 成功后，在任意目录运行 `ledger --help` 能打印用法——工具是安装出来的，不是 `python xxx.py` 跑出来的。
- **P2** 一条命令记一笔：`ledger add 早饭 12.5` 写入一条账目；执行 `ledger add 早饭 abc` 时以非 0 退出码结束，stderr 有可读错误、全程无 Traceback 字样。
- **P3** 查询可用：`ledger list` 列出全部账目，各列对齐可读；`ledger list` 输出的条数与实际存储条数一致。
- **P4** 双存储后端：默认用 JSON 文件存储；加参数（如 `--db sqlite`）切换 SQLite 后，add 与 list 行为完全不变——两套实现共用同一存储接口，命令层无感。
- **P5** 模块化：代码是包结构，命令层、存储层、统计层各自独立文件；统计与存储函数不依赖 `input` 与 `print`，可以被 `import` 后直接调用。
- **P6** 统计正确：`ledger stats` 至少输出三项——总支出、最大单笔、按用途小计；手工用几条已知账目核对，数字正确。
- **P7** 崩溃变报错：把数据文件手工改成非法 JSON 后运行 `ledger list`，程序以非 0 退出码结束、提示文件损坏或如何恢复，而非抛出 Traceback。
- **P8** 测试安全网：`pytest -q` 全绿，测试条数不少于 10，其中统计层与存储层各至少 2 条；全套测试 5 秒内跑完（不碰网络、不依赖真实数据文件）。
- **P9** 日志克制：加 `--verbose` 时输出 DEBUG 级日志（记录每次读写与关键分支）；默认运行没有任何日志噪音；实现用 logging 模块，不是 print。
- **P10** 打包规范：`pyproject.toml` 声明了项目名、版本与依赖；本项目可以只依赖标准库——依赖声明哪怕为空也要写清楚。
- **P11** 仓库纪律：Git 仓库就位，`.gitignore` 排除 `__pycache__/`、`.pytest_cache/`、`dist/`；提交信息符合约定式格式（参照 [Git 毕业项目](/git/430-GitCapstoneProject) 的 A4）。
- **P12** README 可复现：README 至少含「这是什么」「安装」「用法」「示例输出」「如何运行测试」五段；照 README 从 clone 到跑通不超过 5 分钟。

## Extra credit（选做 3 条）

- **E1** pipx 可安装：`pipx install` 你的 wheel 后，全局任何目录 `ledger --help` 可用（工具安装见 [030 篇](/python/030-PyenvUvManage)）。
- **E2** 月度统计：`ledger stats --month 2026-09` 只统计当月账目，跨月数据不被计入；用两条不同月份的账目验证。
- **E3** CI 全绿：GitHub Actions 在每次 push 时自动跑 pytest 并显示通过徽章（780 篇，可后补）。

## 里程碑拆解（5 步）

提示逐级递减：前两步告诉你读哪篇的哪一节，最后一步只给验收断言。

### 里程碑 1：从原型到包（对应 P5、P11）

高提示：读 [模块、包与工程化](/python/720-ModulePackageEngineering) 的包结构一节与 [函数详解](/python/100-FunctionDetailed) 的拆分原则——把 60 行原型按「命令层、存储层、统计层」切开；同时 `git init`、写最小 `.gitignore`，让仓库与代码一起生长。

完成后应看到：`python -m 包名` 仍能完成原型记账的全部功能；历史 JSON 数据迁入新位置后不丢；`git log --oneline` 已有第一条提交。

### 里程碑 2：argparse 子命令（对应 P2、P3、P6）

高提示：读 [Python 与 CLI](/python/810-PythonCLI) 的 argparse 一节，用 subparsers 搭 `add`、`list`、`stats` 三条子命令；while 交互循环退役，录入方式从「问一句答一句」变成一条命令。

完成后应看到：

```bash
ledger add 早饭 12.5
ledger list
ledger stats
```

三条命令各自产出正确结果；`ledger --help` 一屏说清全部用法。

### 里程碑 3：存储接口与异常（对应 P4、P7）

中提示：读 [文件 I/O](/python/300-FileIOContextManager) 的 json 一节与 [异常处理](/python/130-ExceptionHandling) 的自定义异常一节。JSON 用标准库 `json`，SQLite 用标准库 `sqlite3`——表结构、存储接口长什么样，你自己设计；SQLite 的进阶 ORM 路线见 [830 篇](/python/830-PythonSQLAlchemy)，本项目不需要。

完成后应看到：两种后端下 add、list、stats 结果一致；对坏文件运行时退出码非 0 且无 Traceback。这一步起，每个存储函数先写两条 pytest 再写实现（750 篇的节奏）。

### 里程碑 4：测试与日志（对应 P8、P9）

低提示：只指路——pytest 的组织方式读 [Python 与测试](/python/750-PythonTest) 入门小节，logging 的基本配置读 [Python 与日志](/python/430-PythonLog) 前两节；测什么、测几条，按 P8 的断言自己列。

完成后应看到：

```bash
pytest -q
```

末行全绿且条数达标；`ledger --verbose` 下日志逐条出现，去掉参数后恢复安静。

### 里程碑 5：打包、README 与打版（对应 P1、P10、P12）

无提示。验收断言：`pip install -e .` 后任意目录 `ledger --help` 可用；`pyproject.toml` 三要素齐备；README 五段俱全且新人 5 分钟可复现；`pytest -q` 依然全绿；`git status` 干净、历史合规、打上 `v1.0.0` 附注标签并推送远端。所有卡壳点都在上一节链接矩阵里。

## 提示区：功能到文档的对照矩阵

| 卡在哪 | 去哪篇找答案 |
| --- | --- |
| 包结构、`python -m` 运行 | [/python/720-ModulePackageEngineering](/python/720-ModulePackageEngineering) |
| 函数拆分、默认参数、docstring | [/python/100-FunctionDetailed](/python/100-FunctionDetailed) |
| argparse 与子命令 | [/python/810-PythonCLI](/python/810-PythonCLI) |
| JSON 读写、with 语句 | [/python/300-FileIOContextManager](/python/300-FileIOContextManager) |
| 自定义异常、退出码 | [/python/130-ExceptionHandling](/python/130-ExceptionHandling) |
| pytest 组织与断言 | [/python/750-PythonTest](/python/750-PythonTest) |
| logging 基本配置 | [/python/430-PythonLog](/python/430-PythonLog) |
| pyproject.toml 与构建 | [/python/730-PythonPackagingEvolution](/python/730-PythonPackagingEvolution) |
| pipx 与 uv 安装工具 | [/python/030-PyenvUvManage](/python/030-PyenvUvManage) |
| SQLite 进阶（ORM） | [/python/830-PythonSQLAlchemy](/python/830-PythonSQLAlchemy) |
| 代码风格与 Ruff | [/python/770-PythonCodeQuality](/python/770-PythonCodeQuality) |
| Git 仓库纪律、打标 | [/git/430-GitCapstoneProject](/git/430-GitCapstoneProject) |

两条通用提示：测试断言优先于实现（先写「stats 对已知数据必须输出什么」，再写实现）；存储层测试用临时目录与临时文件，绝不读写你的真实账本。

## 验收清单

- [ ] P1 `pip install -e .` 后任意目录 `ledger --help` 可用
- [ ] P2 add 正常，非法金额非 0 退出且无 Traceback
- [ ] P3 list 对齐完整，条数与存储一致
- [ ] P4 JSON 与 SQLite 两后端行为一致
- [ ] P5 包结构分层，业务函数可 import 复用
- [ ] P6 stats 三项数字与手工核对一致
- [ ] P7 坏文件不崩溃，给出恢复提示
- [ ] P8 pytest 全绿不少于 10 条，5 秒内
- [ ] P9 --verbose 有 DEBUG 日志，默认安静
- [ ] P10 pyproject.toml 三要素齐备
- [ ] P11 .gitignore 到位，提交信息合规
- [ ] P12 README 五段俱全，5 分钟可复现
- [ ] E1 pipx 全局可用（选做）
- [ ] E2 --month 月度统计正确（选做）
- [ ] E3 CI 徽章绿（选做）

## 常见弯路

- **功能蔓延**：导出 CSV、多币种、图表、GUI……每一样都在诱你偏航。主线 12 条验收完之前不加任何功能，想法记进 README 的「路线图」一节；
- **跳过测试**：攒到里程碑 4 再补，重构成本已翻倍。从存储层开始测试先行，是本项目最便宜的一张保险；
- **没有 README**：仓库不可复现等于没完成。「代码写完了」不是完成标志，「照 README 五分钟能装能用能测」才是；
- **舍不得交互原型**：原型的使命已经完成。`add` 子命令取代 while 循环是升级而非倒退，历史数据手工迁一份即可；
- **依赖越装越多**：本项目零第三方依赖也能满分，标准库就是「自带电池」；每加一个依赖前先问「标准库真的做不到吗」；
- **边写边弃**：卡住时回到提示矩阵按篇找答案，而不是推倒重来——毕业项目练的就是在既有工程上继续前进。

## 完成后你能做什么

- 任何「脚本感」程序，你都有能力把它升级为可安装、可测试、可发布的正式工具——这套动作与 FANDEX 的工程链完全同构；
- 你拥有了一个可继续生长的真实作品：接数据库迁移（800 篇）、接 FastAPI 把账本暴露成接口（880 篇）、接爬虫自动导账（970 篇），都是现成的续集；
- 在 [Python 后端与 AI 路线](/roadmap/050-BackendPythonAIRoute) 上，这个项目就是你简历里的第一个工程作品——下一步无论是 Web API 还是数据方向，起点都是它。
