---
order: 580
title: 代码质量：给仓库装上三道闸门
module: 'python'
category: 后端技术
difficulty: intermediate
description: '以「接手一个没有任何门禁的仓库」为场景，动手接入 2026 年的 Python 质量三件套：ruff 格式化与静态检查、mypy 类型检查、pre-commit 本地闸门；讲清覆盖率是下限不是目标，附 type ignore 滥用、bare except、格式化大爆炸等高频坑点。'
author: fanquanpp
updated: '2026-09-29'
related:
  - 'python/530-TypeAnnotationMypy'
  - 'python/730-PythonPackagingEvolution'
  - 'python/780-PythonCICD'
prerequisites:
  - 'python/530-TypeAnnotationMypy'
---

## 前置知识

- [类型注解与 mypy](/python/530-TypeAnnotationMypy)：会写基本注解；
- [打包演进与 pyproject.toml](/python/730-PythonPackagingEvolution)：知道 `[tool.xxx]` 段是工具配置的家。

## 你现在要解决什么问题

你接手了组里一个没有质量门禁的仓库：缩进两种风格混用、没人删的死代码、`except:` 裸接一切、函数签名没有注解，code review 每天在「这个空格该不该有」上空转。你不打算靠说服力改变所有人，打算靠工具——装三道闸门，让烂代码在进主干之前被机器拦下：

1. **格式化闸**：代码长什么样，机器说了算（ruff format）；
2. **静态检查闸**：未用变量、未定义名字、可疑写法（ruff check）；
3. **类型闸**：函数接的参数对不对（mypy）。

三道闸全部落在 `pyproject.toml` 里，一次配置，本地与 CI 共用。

## 先动手：ruff 十分钟接管前两道闸

```bash
python -m pip install ruff
```

在 `pyproject.toml` 里写上配置。起点要克制，别一上来勾选三十个规则集把同事吓跑：

```toml
[tool.ruff]
line-length = 100
target-version = "py312"
src = ["src", "tests"]

[tool.ruff.lint]
select = [
    "E", "W",    # pycodestyle：基础风格
    "F",         # pyflakes：未用变量、未定义名
    "I",         # isort：import 排序
    "UP",        # pyupgrade：旧语法升级提示
    "B",         # bugbear：常见 bug 模式
    "SIM",       # simplify：可简化的写法
    "PTH",       # pathlib：建议用 Path 代替 os.path
]
ignore = ["E501"]    # 行长交给 formatter，不重复报

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["S101"]  # 测试里允许 assert（若启用了 bandit 系规则）

[tool.ruff.format]
quote-style = "double"
```

跑起来：

```bash
ruff format .          # 直接改文件，全仓库风格统一
ruff check .           # 只报不改
ruff check --fix .     # 报告中可自动修的顺手修掉
```

典型现场输出：

```text
src/legacy.py:12:8: F841 Local variable `result` is assigned to but never used
src/legacy.py:47:1: E722 Do not use bare `except`
Found 2 errors.
```

逐条解释价值：F841 的 `result` 是死代码，运行时毫无作用；E722 的裸 `except` 会连 `KeyboardInterrupt` 一起吞掉，`Ctrl+C` 都杀不死程序。这两类问题 review 人工看最容易漏，机器一秒扫完。曾经要装 flake8、isort、pyupgrade、black 四个工具的活，2026 年一个 ruff 全包了（它用 Rust 写的，快到可以每次保存都跑）。

## 第二道闸：mypy 渐进收紧

类型闸不能一夜上严——老仓库一开 `strict = true` 会报出几千个错，团队直接放弃。渐进三步：

第一步，先只查源码目录，宽松起步：

```toml
[tool.mypy]
python_version = "3.12"
files = ["src"]
check_untyped_defs = true    # 没注解的函数体也查
```

第二步，处理批量报错的高频三连：

```bash
mypy
```

```text
src/legacy.py:30: error: Item "None" of "str | None" has no attribute "strip"  [union-attr]
src/legacy.py:58: error: Skipping analyzing "sklearn": module is installed, but missing library stubs [import-untyped]
src/legacy.py:73: error: Function is missing a return type annotation [no-untyped-def]
```

- `union-attr`：可空值没判空就用，这是 mypy 拦下的第一类真 bug，修法是加 `if x is None: ...`；
- `import-untyped`：第三方库没带类型存根，装官方存根（`pip install types-requests` 这类 `types-*` 包）或对该库 `ignore_missing_imports = True`；
- `no-untyped-def`：缺注解，按优先级逐步补。

第三步，注解覆盖上来后再切 `strict = true`，并把 `per-module-override` 当减震器：老模块先降级，新代码必须全严。

## 本地闸门：pre-commit

闸门要在**提交之前**响，而不是等 CI 十分钟后打回。pre-commit 用一个 YAML 声明提交时自动跑哪些钩子：

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.9
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
```

```bash
pre-commit install        # 一次性，写入 git hooks
pre-commit run --all-files
```

之后每次 `git commit`，改动的文件先过一遍格式化与检查，不过关提交直接失败。mypy 因为慢，通常不放 pre-commit 而放 CI——本地闸管快，远端闸管全。

## 覆盖率：下限，不是 KPI

pytest-cov 告诉你测试跑了哪些行：

```bash
pytest --cov=src --cov-report=term-missing
```

```text
Name                       Stmts   Miss  Cover   Missing
--------------------------------------------------------
src/slide_forge/cli.py        85      9    89%   40-44, 71-73
--------------------------------------------------------
```

正确用法是把覆盖率当**探漏器**：`term-missing` 的行号列告诉你哪些分支从未被测试经过，`40-44` 十有八九藏着没人想到的边界。错误用法是把 90% 当指标：为凑数给 getter 写断言、删掉难测但必要的代码，覆盖率上去了，质量下去了。数字要看趋势（这个 PR 有没有让覆盖下降），不要看绝对值。

## 常见坑点

坑一：`# type: ignore` 滥用。mypy 报错就贴 ignore，等于把闸门拆了。纪律：每条 ignore 必须带错误码和原因（`# type: ignore[union-attr]  # 第三方回调可能传 None，已在上游校验`），CI 里可以配合 `warn_unused_ignores = true` 把失效的 ignore 报出来。

坑二：裸 `except:` 与 `except Exception: pass`。前者连系统退出信号都吞，后者把 bug 静默埋掉。真要兜底，`except Exception as e: logger.exception(...)` 留下现场（日志写法见 [Python 日志](/python/430-PythonLog)）。

坑三：格式化大爆炸。给老仓库第一次跑 `ruff format`，几千行 diff 淹没所有功能变更，谁也没法 review。正确姿势：单独一个「纯格式化」PR 提前合入，且通知全员暂停手上的未提交改动，之后 rebase。

坑四：pre-commit 拦了正事就绕。`git commit --no-verify` 绕过闸门不是不可以，但每次绕过都应该带着愧疚感——如果团队天天在绕，说明规则配错了，改配置而不是养习惯。

坑五：规则集贪多。一口气 select 三十个规则集，报错雨点般落下，团队第一反应是全部 ignore 掉。从六七个规则集起步，团队消化了再加。

## 自我检查

- 能说出三道闸各拦什么，以及为什么格式化要交给机器而不是人；
- 能写出一段克制的 ruff 起步配置，并解释 select 里每个字母管什么；
- 遇到 mypy 的 `union-attr`、`import-untyped` 能直接说出修法；
- 知道 pre-commit 管快、CI 管全的分工；
- 能说出覆盖率作为探漏器与作为 KPI 的差别。

## 练习

1. 预测题：`def f(:` 这类语法错误，ruff check、ruff format、mypy 谁会先报？报的是什么级别的信息？
2. 修改题：给本文的 ruff 配置加一条——`tests/` 下允许行长 120；想清楚该用哪个配置节。
3. 实战题：找任意自己的旧项目，完整走一遍：ruff format、ruff check --fix、补三处 mypy 报错，把修复前后的 diff 行数记录下来。
4. 挑战题：写一个 10 行以内的函数，让它恰好触发 F841、E722、B006（可变默认参数）三个错误，再用 `ruff check --fix` 观察哪些能自动修、哪些必须人改，并解释为什么。

## 下一步

- 三道闸如何进 CI 流水线并在失败时挡住合并：[Python 与 CI/CD](/python/780-PythonCICD)；
- 测试本身怎么写才有效：[Python 测试](/python/750-PythonTest)；
- 类型注解体系的完整展开：[类型注解与 mypy](/python/530-TypeAnnotationMypy)。
