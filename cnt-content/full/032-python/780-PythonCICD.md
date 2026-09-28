---
order: 580
title: CI/CD：让机器替你守 main 分支
module: 'python'
category: 后端技术
difficulty: intermediate
description: 以「三人协作的仓库 main 反复被合坏」为场景，从零搭出第一条 GitHub Actions 流水线：触发条件、测试矩阵、依赖缓存、job 依赖，再按 PR 门禁快、夜间任务全的分层原则扩到完整流水线；附缓存键不完整、secrets 进日志、行尾差异等十个高频反模式。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'python/750-PythonTest'
  - 'python/770-PythonCodeQuality'
  - 'python/740-PackagePublish'
prerequisites:
  - 'python/750-PythonTest'
  - 'python/770-PythonCodeQuality'
---

## 前置知识

- [Python 测试](/python/750-PythonTest)：会写并运行 pytest；
- [代码质量](/python/770-PythonCodeQuality)：本地配好了 ruff 与 mypy 三道闸。

## 你现在要解决什么问题

slide-forge 有三个贡献者后，main 分支两周被合坏了三次。复盘每次事故，原因一模一样：改代码的人本地没跑测试，review 的人默认「对方肯定跑过了」。人靠不住的部分要交给机器：**每个 PR 自动跑测试，红了的 PR 合不进去**——这就是 CI（持续集成）。测试与质量闸门你已经会跑，本篇只做一件事：把它们搬进 GitHub Actions，并让流水线快到没人想绕过它。

## 先动手：一条够用的流水线

新建 `.github/workflows/ci.yml`，推上去就生效：

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  check:                      # 快闸：风格 + 类型 + 单测，一个 job 搞定
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip          # 官方动作自带依赖缓存
      - run: python -m pip install -e ".[dev]"
      - run: ruff format --check .
      - run: ruff check .
      - run: mypy src
      - run: pytest --cov=src -q
```

逐个拆开看：

- **`on`** 决定什么时候跑：PR 指向 main 时、以及合入 main 后各跑一次。前者是门禁，后者是回归确认；
- **`jobs.check.steps`** 从上到下顺序执行，任何一步非零退出，整个 job 变红。本地三道闸的命令原样搬进来，这就是「本地与 CI 同一套配置」的红利（都读 `pyproject.toml`）；
- **`cache: pip`**：runner 每次都是全新机器，不缓存的话装依赖占掉一半时长。setup-python 内置缓存按 `pyproject.toml`/锁文件的哈希做键，依赖没变就直接复用。

去仓库设置里把 `check` 设为必须通过的分支保护规则，门禁才算真正立起来——工作流会跑，但不挡合并，等于没闸。

## 扩到矩阵：多版本多平台

库要面向用户的多个 Python 版本，测试矩阵用声明式展开：

```yaml
  test:
    strategy:
      fail-fast: false          # 一个挂不影响别的继续跑，便于看全貌
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        python-version: ["3.12", "3.13", "3.14"]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: pip
      - run: python -m pip install -e ".[dev]"
      - run: pytest -q
```

3 个系统 x 3 个版本 = 9 个并行 job。 Windows 上跑一遍的意义比你想象的大：路径分隔符、行尾、文件锁，这些平台差异 bug 只有真跑才暴露。注意 `fail-fast: false`——默认行为是第一个失败就取消全场，排查时你反而想看每个组合各自的死法。

## 分层：PR 门禁要快，慢活放别处

流水线最贵的代价不是机器分钟数，是**贡献者等结果的耐心**。超过一刻钟的 PR 流水线，团队会开始找理由跳过。分层原则：

| 层 | 时机 | 内容 | 时长目标 |
| --- | --- | --- | --- |
| PR 门禁 | 每次 PR | format、lint、mypy、单测 | 10 分钟内 |
| 完整矩阵 | 合入 main / 每晚定时 | 全平台全版本、覆盖率、慢测试 | 不限 |
| 发布 | 打 tag | 构建、twine check、上传 PyPI | 见下 |

发布层直接复用 [发布到 PyPI](/python/740-PackagePublish) 里的 workflow：tag 触发、Trusted Publisher 免密钥，两篇拼起来就是完整交付链。夜间全量用 `schedule` 触发：

```yaml
on:
  schedule:
    - cron: "0 18 * * *"     # UTC 18 点，跑慢测试与依赖安全扫描
```

## 常见坑点

坑一：缓存键不完整。缓存按依赖清单的哈希做键才对；键里漏了锁文件或 Python 版本，会出现「CI 装的依赖和我本地不一样」的灵异问题。改动依赖后首次构建变慢是正常的——那是缓存失效重建。

坑二：secrets 进日志。`echo $PYPI_TOKEN`、异常堆栈里带连接串，都会把密钥写进公开可见的 CI 日志。GitHub Actions 会自动掩蔽 secrets 变量的明文，但拼出来的字符串掩不住。原则：secret 只进环境变量，日志里永远不打印环境。

坑三：行尾与编码差异。Windows runner checkout 默认可能带 CRLF，一个 `git config core.autocrlf` 的差异就能让测试集体报错。仓库里提交 `.gitattributes`（`* text=auto eol=lf`）一次性治本。

坑四：pin 不住版本。`pip install ruff` 不带版本号，三个月后流水线行为悄悄变了；`actions/checkout@v4` 这类主版本 tag 也要心里有数——CI 是「可复现」要求最高的地方，版本要钉。

坑五：流水线什么都塞。把性能压测、Docker 构建、文档部署全挂进 PR 门禁，20 分钟起步。分清「合并前必须对」和「合并后验证」的差别（Docker 镜像构建见 [Python 与 Docker](/python/790-PythonDocker)，属于后者）。

坑六：发布单点依赖人。只有某台机器、某个人的本子能发版，人一休假交付停摆。tag 触发的自动发布把流程从「人的记忆」搬进「仓库的配置」，这也是 [发布到 PyPI](/python/740-PackagePublish) 强调 Trusted Publisher 的原因。

## 自我检查

- 能默写一条最小 CI 的 YAML 骨架并解释 `on`、`jobs`、`steps`、`cache` 四个要素；
- 能说出分支保护规则与工作流的关系（会跑不等于会挡）；
- 能复述分层表：PR 门禁、全量矩阵、发布各自的时机与内容；
- 知道缓存键应该由什么构成；
- 看到一条流水线能指出它慢在哪一步。

## 练习

1. 预测题：把 `fail-fast` 注释掉前后，矩阵中一个 job 失败时其余 job 的命运有何不同？先写结论再实测。
2. 修改题：给本文流水线加一个 job——`deps-audit`，用 `pip-audit` 扫依赖漏洞，挂在 check 之后、合并门禁之内。
3. 实战题：给自己的任意仓库配上本篇的 `ci.yml` 与分支保护，提交一个故意失败的测试，截图确认 PR 确实被挡住，再修复。
4. 挑战题：流水线总时长 15 分钟，其中装依赖 6 分钟。列出三种把依赖安装压到 2 分钟以内的手段（提示：缓存、uv、依赖预装镜像），并说明各自的适用条件。

## 下一步

- 测试写法本身的进阶（fixture、参数化、mock）：[Python 测试](/python/750-PythonTest)；
- 交付的最后一站——容器化：[Python 与 Docker](/python/790-PythonDocker)；
- 发布环节的完整细节回看：[发布到 PyPI](/python/740-PackagePublish)。
