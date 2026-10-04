---
order: 570
title: 打包演进与 pyproject.toml：把仓库现代化
module: 'python'
category: 后端技术
difficulty: intermediate
description: 以「接手一个 setup.py 老仓库」为场景，讲清 Python 打包从 setup.py 到 PEP 517/518/621 标准化的演进，动手把老仓库改造成 pyproject.toml + src 布局，理清 sdist 与 wheel、构建后端选型、PEP 440 版本号与 PEP 508 依赖声明的最小规则集。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'python/740-PackagePublish'
  - 'python/045-PythonEnvToolsLandscape'
  - 'python/720-ModulePackageEngineering'
prerequisites:
  - 'python/040-PythonVirtualEnv'
  - 'python/045-PythonEnvToolsLandscape'
---

## 前置知识

- [虚拟环境](/python/040-PythonVirtualEnv)：会用 venv 装依赖；
- [环境工具全景](/python/045-PythonEnvToolsLandscape)：分得清 pip、uv、poetry 各自管什么；
- [模块与包](/python/720-ModulePackageEngineering)：知道 import 找的是目录与文件。

## 你现在要解决什么问题

你接手作者自己的老仓库 slide-forge 的前身：根目录躺着 `setup.py`、`setup.cfg`、`requirements.txt`、`MANIFEST.in` 四件套，装依赖靠 `pip install -r`，同事 clone 下来第一次运行必报 ModuleNotFoundError。你想把它收拾成 2026 年的标准样子：一个 `pyproject.toml` 管全部，`pip install -e .` 一条命令可开发。要动手，得先知道这几十年堆积的文件各自是谁、哪些已经过时。

## 三分钟史：从 setup.py 到 pyproject.toml

老仓库那堆文件是一层层历史：

1. **setup.py 时代（2004 起）**：包的元数据（名字、版本、依赖）写在 Python 代码里。弊端立现——想读个依赖列表得先执行一段代码，工具之间互相踩；
2. **标准化三步（PEP 518 / 517 / 621，2016-2021）**：社区把「构建怎么发生」「元数据写在哪」拆成独立标准。`pyproject.toml` 一个 TOML 文件接管一切：声明构建工具（PEP 518）、声明构建接口（PEP 517）、声明项目元数据（PEP 621）；
3. **2026 年现状**：`pyproject.toml` 是唯一入口，`setup.py` 只在极老的项目里作为兼容残留。前端工具（负责安装的 pip、uv）与后端工具（负责把源码变成包的 setuptools、hatchling）彻底分工——你在 [环境工具全景](/python/045-PythonEnvToolsLandscape) 见过的 uv，快就快在前端把依赖解析与下载重写了。

一句话记住分工：**pyproject.toml 是「声明」，构建后端照着声明造出 wheel，前端（pip/uv）把 wheel 装进环境**。

## 先动手：把老仓库改造成 pyproject.toml

新建 `pyproject.toml`，最小可用版就这么多：

```toml
[build-system]
requires = ["hatchling>=1.21"]          # 造包用的后端及其依赖
build-backend = "hatchling.build"

[project]
name = "slide-forge"
version = "0.3.1"
description = "从大纲生成幻灯片骨架的命令行工具"
readme = "README.md"
requires-python = ">=3.12"
license = "MIT"
authors = [{ name = "fanquanpp" }]
dependencies = [
    "rich>=13.0",
    "typer>=0.12",
]

[project.optional-dependencies]
dev = ["pytest>=8.0", "ruff>=0.6", "mypy>=1.11"]

[project.scripts]
slideforge = "slide_forge.cli:app"

[tool.hatch.build.targets.wheel]
packages = ["src/slide_forge"]
```

同时把代码挪进 src 布局——这是现代 Python 项目的标准形状：

```text
slide-forge/
├── pyproject.toml
├── README.md
├── src/
│   └── slide_forge/
│       ├── __init__.py
│       └── cli.py
└── tests/
    └── test_cli.py
```

然后一条命令验证：

```bash
python -m pip install -e ".[dev]"
slideforge --help
```

`-e` 是可编辑安装：装的包指向你的源码目录，改完代码立即生效，不用重装（机制是 PEP 660 定义的可编辑 wheel，底层仍是一个真安装）。`.[dev]` 表示连同可选依赖组 `dev` 一起装。src 布局有个隐性好处：测试时 import 的是安装好的包而不是当前目录里那个同名文件夹——packaging 没配好时，旧式平铺布局会把源码目录直接塞进 `sys.path`，掩盖「忘了装包」的问题。

删掉过时文件：`setup.py`、`setup.cfg` 的内容已全部并入 pyproject.toml；`requirements.txt` 在应用仓库里可以继续存在（作为锁定依赖的清单），在库仓库里应删除，依赖的唯一真相是 `pyproject.toml` 的 `dependencies`。

## 产物：sdist 与 wheel

构建后端把源码变成两种产物：

```bash
python -m pip install build
python -m build
```

```text
dist/
├── slide_forge-0.3.1.tar.gz      # sdist：源码分发包
└── slide_forge-0.3.1-py3-none-any.whl   # wheel：预构建分发包
```

- **sdist**（`.tar.gz`）：源码 + 打包配置。安装时要在用户机器上现场走一遍构建，慢，还可能因为缺编译器而失败；
- **wheel**（`.whl`）：构建好的成品，本质是个 zip。安装就是解压到位，秒装、不需要构建后端。文件名本身是协议：`py3-none-any` 表示「纯 Python、不依赖特定平台、不依赖特定 ABI」，含 C 扩展的包文件名里会带平台标签（如 `cp312-cp312-win_amd64`），每个平台要各发一个。

**pip 能装 wheel 就绝不装 sdist**，所以发布时两种都传（上传环节见 [发布到 PyPI](/python/740-PackagePublish)）。wheel 的存在是 Python 安装体验这些年在变快的核心原因。

## 构建后端怎么选

`[build-system]` 里的后端按项目形态挑：

| 后端 | 适合 | 特点 |
| --- | --- | --- |
| hatchling | 多数新项目（本文选择） | 配置简洁、快、纯 Python |
| setuptools | 老项目迁移、含复杂 C 扩展 | 兼容性最广，配置最啰嗦 |
| flit_core | 单模块小工具 | 极简，不支持 C 扩展 |
| poetry-core | 已用 Poetry 管理的项目 | 与 Poetry 锁文件生态一体 |
| pdm-backend | 已用 PDM 的项目 | 同上 |

后端可以随时换，`pyproject.toml` 其余部分不用动——这是标准化的红利。选型纠结成本应该趋近于零：新项目 hatchling，迁移老项目 setuptools，够了。放眼其他语言，npm 与 cargo 早已是「一个清单文件 + 一个工具」的形态，Python 的 pyproject.toml 时代补上的正是这一课。

## 版本号与依赖声明的最小规则

元数据里两样东西有官方语法，写错会被 PyPI 拒收：

**版本号（PEP 440）**。合法样例：`0.3.1`、`1.0.0rc1`、`1.2.3.post1`、`0.1.0a2`。核心形态就是 `N.N.N` 三段数字，预发布用 `a/b/rc` 后缀，日期式 `2026.9.28` 也合法。不合法的 `v1.0`（带 v 前缀）、`1.0 FINAL` 会被工具直接报错。

**依赖声明（PEP 508）**。四个常用形态：

```toml
dependencies = [
    "rich>=13.0",            # 下限约束：最常用
    "httpx>=0.27,<1.0",      # 区间：防大版本破坏
    "typer",                 # 无约束：不推荐，装到什么都行
    "numpy>=2.0; python_version>='3.12'",   # 环境标记：条件依赖
]
```

约束哲学：**库写宽（`>=X` 即可），应用写严（靠锁文件钉死）**。库作者把上限定死会逼得下游无法一起升级，这是依赖地狱最常见的源头；应用则相反，用 `uv lock`、`pip freeze` 生成锁文件保证可复现部署。

## 常见坑点

坑一：setup.py 与 pyproject.toml 并存且内容不一致。工具行为取决于读哪个、怎么读，出现「我这里装出来的依赖和你不一样」就先查有没有双份元数据。迁移完成后删干净旧文件。

坑二：版本号随手写。`1.0.beta`、`v2` 都会被 `python -m build` 拒绝。写版本前对照 PEP 440，或直接用 `hatch version`、`uv version` 这类命令工具代管。

坑三：把不该发的东西打进包。构建产物、本地配置、密钥文件混进 wheel 是真实发生过的事故（包名公开后任何人都能下载查看）。src 布局 + 只把 `src/slide_forge` 声明进 wheel，天然把杂物关在包外。

坑四：漏写 `requires-python`。不写意味着「任何 Python 都行」，用户的 3.8 装上你用了 3.12 语法的包，运行时才炸。写上它，老解释器的 pip 会自动选旧版本。

坑五：开发依赖混进运行时依赖。pytest 出现在 `dependencies` 里，所有用户被迫安装测试框架。开发工具进 `[project.optional-dependencies]` 的 `dev` 组。

坑六：还在用 `python setup.py install`。这条路径已被废弃多年，构建用 `python -m build`，安装用 pip/uv，`setup.py` 不再需要被手工执行。

## 自我检查

- 能说出 pyproject.toml 三个标准段（build-system、project、工具配置）各自管什么；
- 能解释 pip 为什么优先装 wheel，sdist 什么时候才被用到；
- 能默写 `>=X`、`>=X,<Y`、环境标记三种依赖声明；
- 知道 src 布局防住的是什么问题；
- 看到版本号报错能对照 PEP 440 找出违规处。

## 练习

1. 预测题：`pip install -e .` 之后删掉 `src/slide_forge/cli.py` 再运行 `slideforge`，会怎样？先猜再验证，解释原因。
2. 修改题：给本文的 pyproject.toml 加一个 `cli` 可选依赖组（含 `textual`），并写出本地安装命令。
3. 实战题：找任意一个自己写过 `requirements.txt` 的项目，按本篇改造为 pyproject.toml + src 布局，跑通 `pip install -e ".[dev]"` 与测试。
4. 挑战题：用 `python -m build` 构建本篇项目，解开 `dist/` 里的 wheel（zip 即可），列出里面的文件，确认没有多余文件混入。

## 下一步

- 包造好了，发上 PyPI 与版本自动化：[发布到 PyPI](/python/740-PackagePublish)；
- import 系统在运行时如何找到包：[模块与包](/python/720-ModulePackageEngineering)；
- 项目工具链（ruff、mypy、pytest）的统一配置也写进 pyproject.toml：[代码质量工具链](/python/770-PythonCodeQuality)。
