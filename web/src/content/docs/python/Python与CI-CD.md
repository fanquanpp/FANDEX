---
order: 79
title: 'Python与CI-CD'
module: python
category: Python
difficulty: intermediate
description: Python项目CI/CD全流程详解：流水线设计、自动化测试、构建产物管理、镜像化交付、GitOps与渐进式发布
author: fanquanpp
updated: '2026-07-21'
related:
  - python/Python与gRPC
  - python/Python与WebSocket
  - python/Python与性能优化
  - python/内置数据结构
  - python/Python与测试
  - python/Python与Docker
prerequisites:
  - python/语法速查
  - python/Python与虚拟环境
---

## 1. 学习目标

本节依据 Bloom 分类法，从认知层级由低到高排列学习目标。读者完成本节后应能够：

### 1.1 记忆层（Remembering）

- 复述 CI（Continuous Integration）与 CD（Continuous Delivery / Continuous Deployment）的定义与差异。
- 列举至少 5 种主流 CI/CD 工具（GitHub Actions、GitLab CI、Jenkins、CircleCI、Drone、Buildkite、Azure Pipelines、Argo CD）。
- 识别 Python 项目构建链中的关键工具：`pip`、`pip-tools`、`Poetry`、`uv`、`hatch`、`build`、`twine`、`auditwheel`、`maturin`。

### 1.2 理解层（Understanding）

- 解释流水线（Pipeline）阶段（Stage）与作业（Job）的逻辑关系。
- 描述 Python 项目中"依赖锁定（lock）"的必要性及其与可复现构建的关系。
- 区分"持续交付"与"持续部署"在自动化程度上的差异。

### 1.3 应用层（Applying）

- 使用 GitHub Actions 编写一个完整的 Python 项目流水线：lint → type-check → test → build → publish。
- 使用 Poetry 或 uv 维护 `pyproject.toml` 与 `poetry.lock` / `uv.lock`。
- 配置矩阵构建（matrix strategy）跨 Python 3.10/3.11/3.12/3.13 多版本验证。

### 1.4 分析层（Analyzing）

- 分析流水线耗时瓶颈，定位慢测试、慢构建、慢依赖解析等问题。
- 对比"单仓库大流水线"与"多仓库微服务流水线"的工程权衡。
- 解构一个真实事故案例，识别 CI/CD 配置缺陷的根因。

### 1.5 评价层（Evaluating）

- 评价缓存策略（pip cache、 Poetry cache、Docker layer cache）的有效性。
- 评判"扁平化流水线"与"扇出-扇入（fan-out / fan-in）流水线"在特定场景下的优劣。
- 评估发布策略（蓝绿、金丝雀、影子流量）对线上稳定性的影响。

### 1.6 创造层（Creating）

- 设计一个支持多环境（dev/staging/prod）的 GitOps 发布系统。
- 构建一个自托管的 Python 包索引（PyPI 私服）并集成到 CI 流水线。
- 实现一个渐进式金丝雀发布控制器，基于指标自动决策晋升或回滚。

---

## 2. 历史动机与背景

### 2.1 软件交付的史前时代

在 1990 年代，软件交付是一个高度手工化、间歇性、低频的过程。开发者完成编码后，由"发布工程师"在指定时间点手工打包、传输、部署。这种模式存在三个根本性痛点：

1. **集成地狱（Integration Hell）**：多个开发者的代码长时间分叉，最终合并时产生大量冲突，集成阶段耗时数天甚至数周。
2. **环境漂移（Environment Drift）**：开发机、测试机、生产机的环境差异导致"在我机器上能跑"的现象频发。
3. **回滚困难**：缺乏自动化部署意味着回滚同样需要手工操作，事故恢复时间长。

### 2.2 持续集成的诞生

Martin Fowler 与 Matthew Foemmel 在 2000 年的论文《Continuous Integration》中正式提出 CI 概念。其核心思想可追溯至 Kent Beck 在极限编程（Extreme Programming）中的实践。CI 的核心主张是：

> 多次、频繁地将代码集成到主干，每次集成都通过自动化构建与测试验证。

这一思想在 2000 年代由 CruiseControl、Hudson（后 forks 为 Jenkins）等工具落地，成为现代软件工程的基石。

### 2.3 持续交付与持续部署

Jez Humble 与 David Farley 在 2010 年出版的《Continuous Delivery》一书系统化了 CD 概念，区分了两个层次：

- **持续交付（Continuous Delivery）**：每次通过 CI 的代码都处于"可发布状态"，但发布动作由人触发。
- **持续部署（Continuous Deployment）**：每次通过 CI 的代码自动部署到生产环境，无需人工干预。

形式化地，设 $C$ 为代码变更集合，$P(C)$ 为通过 CI 的子集，$R(C)$ 为实际部署到生产的子集，则：

- 持续交付：$P(C) \subseteq R_{\text{ready}}(C)$，但 $R(C) \subseteq P(C)$ 由人决策。
- 持续部署：$R(C) = P(C)$。

### 2.4 Python 生态的特殊挑战

Python 项目在 CI/CD 中面临若干独特挑战：

1. **依赖解析复杂**：Python 的依赖系统历史包袱沉重，`requirements.txt`、`setup.py`、`pyproject.toml`、`Pipfile`、`poetry.lock` 等多种格式并存，依赖解析算法在 PyPI 海量包空间中是 NP-hard 问题。
2. **C 扩展编译**：含 C/C++ 扩展的包需要跨平台编译，触发 manylinux、musllinux wheel 构建矩阵。
3. **GIL 与并发测试**：GIL 限制下的多线程测试可能产生假阴性，需要进程级并行。
4. **类型检查开销**：mypy / pyright 在大型项目上耗时数分钟，成为流水线瓶颈。
5. **打包格式多样**：sdist、bdist_wheel、bdist_egg、PEP 660 editable install 等多种格式共存。

这些挑战催生了 `cibuildwheel`、`uv`、`maturin`、`hatch` 等新一代工具，本节将深入讨论。

### 2.5 GitOps 与声明式发布

2017 年 Weaveworks 提出 GitOps 概念，将"期望状态"以声明式方式存储于 Git，由控制器（如 Argo CD、Flux）持续协调集群实际状态与期望状态。这一范式深刻影响了 Python 微服务的部署模式，是当前云原生 Python 项目的事实标准。

---

## 3. 形式化定义

### 3.1 流水线的形式化模型

一个 CI/CD 流水线可形式化为一个有向无环图（DAG）：

$$
\mathcal{P} = (V, E, \tau, \rho)
$$

其中：

- $V$ 是作业（Job）的有限集合，每个 $v \in V$ 表示一个原子任务。
- $E \subseteq V \times V$ 是依赖关系，$(u, v) \in E$ 表示 $v$ 依赖 $u$ 的输出。
- $\tau: V \to \mathbb{R}^+$ 是每个作业的执行时长估计。
- $\rho: V \to \mathcal{R}$ 是每个作业的资源需求（CPU、内存、磁盘、网络）。

流水线的总执行时间 $T(\mathcal{P})$ 由关键路径决定：

$$
T(\mathcal{P}) = \max_{\text{path } p \in \mathcal{P}} \sum_{v \in p} \tau(v)
$$

最小化 $T(\mathcal{P})$ 等价于调度问题，在一般情况下是 NP-hard。

### 3.2 缓存命中的概率模型

设缓存键为 $k$，缓存容量为 $C$，作业序列为 $J_1, J_2, \ldots, J_n$。缓存命中率 $H$ 可建模为：

$$
H = \Pr[\text{cache hit}] = \frac{|\{i : k(J_i) \in \text{Cache}_{i-1}\}|}{n}
$$

在 LRU 替换策略下，当缓存工作集 $W \leq C$ 时 $H \to 1$；当 $W > C$ 时 $H$ 急剧下降。Python CI 中，缓存键通常由 `pyproject.toml`、`poetry.lock`、Python 版本、操作系统 hash 组合而成。

### 3.3 测试覆盖率的形式化定义

设 $M$ 为代码库中可执行语句集合，$T$ 为测试用例集合，$\text{cov}(t) \subseteq M$ 为测试 $t$ 执行到的语句集合。则：

- **语句覆盖率**：$\displaystyle \text{Cov}_{\text{stmt}} = \frac{|\bigcup_{t \in T} \text{cov}(t)|}{|M|}$
- **分支覆盖率**：$\displaystyle \text{Cov}_{\text{branch}} = \frac{|\{b \in B : b \text{ covered}\}|}{|B|}$，其中 $B$ 是所有分支集合。
- **MC/DC 覆盖率**：$\displaystyle \text{Cov}_{\text{MC/DC}} = \frac{|\{d \in D : d \text{ independently affects decision}\}|}{|D|}$

工业实践通常要求 $\text{Cov}_{\text{branch}} \geq 0.80$ 作为流水线门禁。

### 3.4 依赖解析的复杂度

Python 依赖解析问题可形式化为：给定包需求集合 $\mathcal{R} = \{(p_i, c_i)\}$（包名 $p_i$ 与版本约束 $c_i$），求解满足所有约束的版本分配 $\sigma: \mathcal{P} \to \mathcal{V}$。

该问题是 SAT 问题实例，NP-complete。PubGrub 算法（Dart 生态原创，被 Poetry 与 uv 借鉴）通过冲突驱动子句学习大幅减少搜索空间，平均复杂度接近多项式。

---

## 4. 理论推导

### 4.1 流水线并行度上界

设流水线 DAG 的最大宽度为 $W$（即任意拓扑层级上的最大节点数），可用并行执行器数为 $P$，则并行加速比上界为：

$$
S(P) \leq \min\left(\frac{W_{\text{total}}}{T_{\text{seq}}}, P\right)
$$

其中 $W_{\text{total}}$ 是所有作业总工作量，$T_{\text{seq}}$ 是串行执行时长。当 $P > W$ 时，额外并行度无法转化为加速比。

**推论**：GitHub Actions 单 workflow 默认并发 180 个 job，但 Python 项目实际可并行度受限于测试可分片性。`pytest-xdist` 通过 `--numprocesss=N` 实现进程内并行，受 GIL 影响较小。

### 4.2 缓存有效性证明

考虑缓存键 $k$ 与文件 $f$ 的关系。当且仅当 $k$ 是 $f$ 内容的双射函数时，缓存严格正确：

$$
k(f_1) = k(f_2) \iff f_1 = f_2
$$

实践中使用哈希函数 $h$ 作为 $k$。对于密码学哈希（SHA-256），碰撞概率 $\approx 2^{-128}$（生日界），可视为双射。

**反例**：若缓存键仅使用 `requirements.txt` 而忽略 Python 版本，则不同 Python 版本可能安装不同的 wheel，缓存命中会导致环境不一致。

### 4.3 测试用例隔离性

定义测试用例 $t_1, t_2$ 的隔离性为：

$$
\text{Iso}(t_1, t_2) = \Pr[\text{pass}(t_1 \cup t_2) | \text{pass}(t_1) \we \text{pass}(t_2)]
$$

若 $\text{Iso} < 1$，则存在测试顺序依赖。pytest 默认按文件定义顺序执行，使用 `pytest-randomly` 插件可随机化顺序以暴露隔离性问题。

### 4.4 不可变工件与可复现构建

可复现构建（Reproducible Build）要求：相同输入产生字节级相同的输出工件。形式化地，构建函数 $B$ 应满足：

$$
\forall t_1, t_2: \text{input}(t_1) = \text{input}(t_2) \implies B(t_1) = B(t_2)
$$

Python 项目实现可复现构建的难点：

- `setup.py` 中嵌入构建时间戳。
- 字节码 `.pyc` 文件包含 mtime。
- wheel 文件内部的 ZIP 时间戳。
- C 扩展链接器嵌入构建路径。

可通过 `SOURCE_DATE_EPOCH` 环境变量统一时间戳，配合 `python -X pyc_only=0` 等选项逼近可复现性。

---

## 5. 代码示例

### 5.1 最小化 GitHub Actions 流水线

```yaml
# .github/workflows/ci.yml
# 最小化 Python CI 流水线：lint / type-check / test / build / publish
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

# 全局环境变量：统一 Python 与 Poetry 版本，避免漂移
env:
  PYTHON_VERSION: '3.12'
  POETRY_VERSION: '1.8.3'

jobs:
  lint:
    # 代码风格检查：ruff 是 Rust 实现的超快 linter
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: 安装 Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      - name: 安装 ruff
        run: pip install ruff==0.5.0
      - name: 执行 lint
        run: ruff check src tests
      - name: 格式检查
        run: ruff format --check src tests

  typecheck:
    # 类型检查：mypy 静态分析
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      - name: 缓存 mypy
        uses: actions/cache@v4
        with:
          path: .mypy_cache
          key: mypy-${{ runner.os }}-${{ env.PYTHON_VERSION }}-${{ hashFiles('pyproject.toml') }}
      - name: 安装依赖
        run: pip install -e ".[dev]"
      - name: 运行 mypy
        run: mypy src

  test:
    # 单元测试与覆盖率收集，跨平台矩阵
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        python-version: ['3.10', '3.11', '3.12', '3.13']
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - name: 缓存 pip
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: pip-${{ runner.os }}-${{ matrix.python-version }}-${{ hashFiles('pyproject.toml') }}
      - name: 安装依赖
        run: pip install -e ".[test]"
      - name: 运行测试
        run: pytest --cov=src --cov-report=xml --junitxml=report.xml
      - name: 上传覆盖率
        if: matrix.os == 'ubuntu-latest' && matrix.python-version == '3.12'
        uses: codecov/codecov-action@v4

  build:
    # 构建 wheel 与 sdist
    needs: [lint, typecheck, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      - name: 安装 build
        run: pip install build
      - name: 构建工件
        run: python -m build
      - name: 上传工件
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  publish:
    # 发布到 PyPI（仅 tag 触发）
    if: startsWith(github.ref, 'refs/tags/v')
    needs: build
    runs-on: ubuntu-latest
    environment: pypi
    steps:
      - name: 下载工件
        uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      - name: 发布
        uses: pypa/gh-action-pypi-publish@release/v1
        with:
          password: ${{ secrets.PYPI_API_TOKEN }}
```

### 5.2 pyproject.toml 现代化配置

```toml
# pyproject.toml
# 遵循 PEP 517 / 518 / 621 的现代 Python 项目配置
[build-system]
requires = ["hatchling>=1.21"]
build-backend = "hatchling.build"

[project]
name = "fandex-demo"
version = "1.0.0"
description = "示例项目：演示现代化 CI/CD 配置"
readme = "README.md"
license = { text = "MIT" }
requires-python = ">=3.10"
authors = [
    { name = "fanquanpp", email = "fanquanpp@example.com" }
]
# 运行时依赖：使用版本区间而非精确版本，留给下游解析空间
dependencies = [
    "httpx>=0.27,<1.0",
    "pydantic>=2.6,<3.0",
    "structlog>=24.1,<25.0",
]

# 可选依赖：按场景分组，便于 CI 与下游使用
[project.optional-dependencies]
test = [
    "pytest>=8.0",
    "pytest-cov>=5.0",
    "pytest-xdist>=3.5",
    "pytest-asyncio>=0.23",
    "hypothesis>=6.100",
]
dev = [
    "ruff==0.5.0",
    "mypy>=1.10",
    "pre-commit>=3.7",
]
docs = [
    "mkdocs-material>=9.5",
    "mkdocstrings[python]>=0.25",
]

[project.scripts]
fandex-demo = "fandex_demo.cli:main"

[project.urls]
Homepage = "https://github.com/fanquanpp/fandex-demo"
Documentation = "https://fandex-demo.readthedocs.io"
Repository = "https://github.com/fanquanpp/fandex-demo"
Changelog = "https://github.com/fanquanpp/fandex-demo/blob/main/CHANGELOG.md"

# hatchling 构建配置
[tool.hatch.build.targets.wheel]
packages = ["src/fandex_demo"]

# ruff 配置：lint + formatter 一体化
[tool.ruff]
line-length = 100
target-version = "py310"
src = ["src", "tests"]

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort
    "B",   # bugbear
    "C4",  # comprehensions
    "UP",  # pyupgrade
    "RUF", # ruff-specific
    "SIM", # simplify
    "TID", # tidy-imports
]
ignore = ["E501"]  # 行长由 formatter 处理

[tool.ruff.lint.isort]
known-first-party = ["fandex_demo"]

# mypy 严格配置
[tool.mypy]
python_version = "3.10"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
disallow_untyped_decorators = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true
warn_no_return = true
warn_unreachable = true

[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false

# pytest 配置
[tool.pytest.ini_options]
minversion = "8.0"
testpaths = ["tests"]
addopts = [
    "-ra",
    "--strict-markers",
    "--strict-config",
    "--cov=fandex_demo",
    "--cov-report=term-missing",
    "--cov-report=html",
    "--cov-fail-under=80",
]
asyncio_mode = "auto"
markers = [
    "slow: 标记慢测试，可用 -m 'not slow' 跳过",
    "integration: 集成测试，需要外部服务",
]

# coverage 配置
[tool.coverage.run]
source = ["src"]
branch = true
parallel = true

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "raise NotImplementedError",
    "if TYPE_CHECKING:",
    "if __name__ == .__main__.:",
]
```

### 5.3 跨平台 wheel 构建（cibuildwheel）

```python
# scripts/build_wheels.py
"""跨平台 wheel 构建脚本：使用 cibuildwheel 自动化 manylinux / musllinux / macOS / Windows 构建。

本脚本在 CI 中被调用，本地一般不直接运行。它封装了 cibuildwheel 的复杂参数，
使得在 GitHub Actions 中只需一行命令即可触发完整的跨平台构建矩阵。
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def build_wheels(output_dir: str = "wheelhouse") -> None:
    """调用 cibuildwheel 构建跨平台 wheel。

    参数:
        output_dir: 输出目录，构建好的 wheel 文件将存放于此。

    说明:
        cibuildwheel 会自动检测项目类型（pyproject.toml / setup.py），
        并在隔离环境中构建 wheel。对于 C 扩展项目，它会在 Docker 容器中
        运行 manylinux / musllinux 镜像以构建兼容性广的 wheel。
    """
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)

    # cibuildwheel 通过环境变量配置，避免在 pyproject.toml 中污染构建配置
    env = {
        **dict(__import__("os").environ),
        # 指定要构建的 Python 版本
        "CIBW_BUILD": "cp310-* cp311-* cp312-* cp313-*",
        # 跳过 32 位 Linux 与 PyPy
        "CIBW_SKIP": "*-win32 *_i686-* pp*",
        # manylinux 版本：使用 manylinux_2_28 兼容 CentOS 7+
        "CIBW_MANYLINUX_X86_64_IMAGE": "manylinux_2_28",
        "CIBW_MANYLINUX_AARCH64_IMAGE": "manylinux_2_28",
        # musllinux 版本：基于 Alpine 3.19
        "CIBW_MUSLLINUX_X86_64_IMAGE": "musllinux_1_2",
        # 测试命令：构建后立即测试 wheel
        "CIBW_TEST_COMMAND": "pytest {project}/tests",
        "CIBW_TEST_REQUIRES": "pytest hypothesis",
        # 修复 macOS ARCH：同时构建 x86_64 与 arm64
        "CIBW_ARCHS_MACOS": "x86_64 arm64",
        # 在 aarch64 上启用 QEMU 模拟（用于跨架构构建）
        "CIBW_ARCHS_LINUX": "x86_64 aarch64",
    }

    cmd = [sys.executable, "-m", "cibuildwheel", "--output-dir", str(output_path)]
    result = subprocess.run(cmd, env=env, check=False)
    if result.returncode != 0:
        print("cibuildwheel 失败，请检查日志", file=sys.stderr)
        sys.exit(result.returncode)


if __name__ == "__main__":
    build_wheels()
```

对应的 GitHub Actions 配置：

```yaml
# .github/workflows/wheels.yml
# 跨平台 wheel 构建与发布
name: Build Wheels

on:
  workflow_dispatch:
  release:
    types: [published]

jobs:
  build_sdist:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: 构建 sdist
        run: pip install build && python -m build --sdist
      - uses: actions/upload-artifact@v4
        with:
          name: sdist
          path: dist/*.tar.gz

  build_wheels:
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4
      - name: 构建 wheels
        uses: pypa/cibuildwheel@v2.19
      - uses: actions/upload-artifact@v4
        with:
          name: wheels-${{ matrix.os }}
          path: wheelhouse/*.whl

  publish:
    needs: [build_sdist, build_wheels]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - name: 合并工件
        run: |
          mkdir -p dist
          cp -r wheels-*/*.whl dist/
          cp -r sdist/*.tar.gz dist/
      - name: 发布到 PyPI
        uses: pypa/gh-action-pypi-publish@release/v1
        with:
          password: ${{ secrets.PYPI_API_TOKEN }}
```

### 5.4 Docker 多阶段构建

```dockerfile
# Dockerfile
# Python 项目多阶段构建：构建阶段与运行阶段分离，最小化最终镜像体积

# ===== 阶段 1: 构建阶段 =====
FROM python:3.12-slim AS builder

# 设置工作目录
WORKDIR /app

# 启用不可缓冲模式，确保日志实时输出
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# 安装系统依赖（仅构建时需要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 安装 uv（极快的依赖解析器）
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# 先复制依赖清单以利用 Docker 层缓存
COPY pyproject.toml uv.lock ./

# 使用 uv 安装依赖到虚拟环境
RUN uv venv /app/.venv && \
    uv pip install --no-deps -r <(uv export --format requirements-txt)

# 复制源码
COPY src ./src
COPY README.md ./

# 安装项目本身
RUN uv pip install --no-deps .

# ===== 阶段 2: 运行阶段 =====
FROM python:3.12-slim AS runtime

# 创建非 root 用户
RUN groupadd -r app && useradd -r -g app app

WORKDIR /app

# 仅复制必要文件
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/src /app/src

# 设置环境变量
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

USER app

EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health')" || exit 1

CMD ["python", "-m", "fandex_demo"]
```

### 5.5 Pytest 并行测试与分片

```python
# tests/conftest.py
"""pytest 全局配置：自定义 fixture、标记、插件配置。"""

from __future__ import annotations

import os
import pytest
from pathlib import Path


def pytest_configure(config: pytest.Config) -> None:
    """注册自定义标记，避免 unknown marker 警告。"""
    config.addinivalue_line("markers", "slow: 标记慢测试")
    config.addinivalue_line("markers", "integration: 集成测试，依赖外部服务")
    config.addinivalue_line("markers", "benchmark: 性能基准测试")


def pytest_collection_modifyitems(
    session: pytest.Session,
    config: pytest.Config,
    items: list[pytest.Item],
) -> None:
    """根据 CI 环境变量自动跳过特定标记的测试。

    在 CI 中通常希望跳过慢测试与集成测试以加速反馈，
    但在 nightly build 中又希望全部运行。本钩子根据
    PYTEST_MARKERS_TO_SKIP 环境变量动态过滤。
    """
    skip_markers = os.environ.get("PYTEST_MARKERS_TO_SKIP", "").split(",")
    skip_markers = [m.strip() for m in skip_markers if m.strip()]
    if not skip_markers:
        return

    skip = pytest.mark.skip(reason=f"CI 中跳过标记: {skip_markers}")
    for item in items:
        for marker in skip_markers:
            if marker in item.keywords:
                item.add_marker(skip)


@pytest.fixture(scope="session")
def tmp_workspace(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """会话级临时工作目录：用于需要持久化文件的测试。"""
    return tmp_path_factory.mktemp("workspace")
```

```python
# tests/test_smoke.py
"""冒烟测试：验证核心功能可正常运行。"""

import pytest
from fanquan_demo import __version__
from fanquan_demo.cli import main


def test_version() -> None:
    """版本号应符合语义化版本规范。"""
    # 严格匹配 semver: MAJOR.MINOR.PATCH[-prerelease][+build]
    import re
    semver_pattern = r"^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?(?:\+[a-zA-Z0-9.]+)?$"
    assert re.match(semver_pattern, __version__), f"非法版本号: {__version__}"


@pytest.mark.slow
def test_slow_operation() -> None:
    """慢测试：用于演示 -m 'not slow' 的过滤效果。"""
    import time
    time.sleep(5)
    assert True


def test_cli_help(capsys: pytest.CaptureFixture[str]) -> None:
    """CLI help 子命令应正常输出。"""
    with pytest.raises(SystemExit) as exc_info:
        main(["--help"])
    assert exc_info.value.code == 0
    captured = capsys.readouterr()
    assert "usage" in captured.out.lower()


# 参数化测试：使用 hypothesis 进行基于属性的测试
from hypothesis import given, strategies as st


@given(st.integers(min_value=0, max_value=1000))
def test_fibonacci_property(n: int) -> None:
    """属性测试：Fibonacci 数列应满足递推关系 F(n+2) = F(n+1) + F(n)。"""
    from fanquan_demo.math_utils import fib

    if n < 2:
        return  # 边界情况跳过
    a, b, c = fib(n), fib(n + 1), fib(n + 2)
    assert c == a + b
```

### 5.6 GitOps 发布工作流

```yaml
# .github/workflows/deploy.yml
# GitOps 发布：合并 main 后自动同步到部署仓库
name: Deploy

on:
  push:
    branches: [main]

jobs:
  sync_to_deploy_repo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: 提取版本
        id: version
        run: |
          VERSION=$(grep -oP '^version = "\K[^"]+' pyproject.toml)
          echo "version=$VERSION" >> $GITHUB_OUTPUT
      - name: 同步到部署仓库
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_REPO_TOKEN }}
        run: |
          # 克隆部署仓库
          git clone https://x-access-token:${DEPLOY_TOKEN}@github.com/org/deploy.git deploy
          cd deploy

          # 更新镜像 tag
          yq -i ".services.fandex-demo.image = \"ghcr.io/org/fandex-demo:${{ steps.version.outputs.version }}\"" \
            environments/staging/fandex-demo.yaml

          # 提交并推送
          git config user.name "ci-bot"
          git config user.email "ci-bot@example.com"
          git add .
          git commit -m "chore(staging): bump fanquan-demo to ${{ steps.version.outputs.version }}"
          git push origin main
```

```yaml
# deploy/manifests/staging/fandex-demo.yaml
# Kustomize 风格的声明式部署清单
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fanquan-demo
  namespace: staging
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: fanquan-demo
  template:
    metadata:
      labels:
        app: fanquan-demo
    spec:
      containers:
        - name: app
          image: ghcr.io/org/fandex-demo:1.0.0
          ports:
            - containerPort: 8000
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5
```

### 5.7 渐进式金丝雀发布控制器

```python
# scripts/canary_controller.py
"""金丝雀发布控制器：基于 Prometheus 指标自动决策晋升或回滚。

工作流程:
    1. 创建金丝雀 Deployment（少量副本）
    2. 等待指标稳定
    3. 比较金丝雀与基线的关键指标（错误率、延迟、吞吐）
    4. 若指标劣化超过阈值，触发回滚；否则逐步扩大金丝雀流量比例
    5. 重复直至 100% 流量切换到新版本

本脚本为概念演示，生产环境推荐使用 Argo Rollouts 或 Flagger。
"""

from __future__ import annotations

import time
import logging
from dataclasses import dataclass
from typing import Literal
import httpx

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class CanaryConfig:
    """金丝雀发布配置。

    Attributes:
        max_steps: 最大扩容步数，每步将流量比例提升 1/max_steps。
        error_rate_threshold: 错误率阈值，超过即回滚。
        p99_latency_threshold_ms: P99 延迟阈值，超过即回滚。
        step_duration_seconds: 每步观察时长。
        service_name: 服务名，用于查询 Prometheus。
    """

    max_steps: int = 10
    error_rate_threshold: float = 0.01
    p99_latency_threshold_ms: float = 500.0
    step_duration_seconds: int = 60
    service_name: str = "fandex-demo"


class CanaryController:
    """金丝雀发布控制器核心逻辑。"""

    def __init__(
        self,
        config: CanaryConfig,
        prometheus_url: str = "http://prometheus:9090",
    ) -> None:
        self.config = config
        self.prometheus_url = prometheus_url
        self.client = httpx.Client(timeout=10)

    def query_metric(self, query: str) -> float:
        """查询 Prometheus 指标。

        参数:
            query: PromQL 查询表达式。

        返回:
            指标值。若查询失败或无数据，返回 0.0。

        异常:
            httpx.HTTPError: 网络错误时抛出。
        """
        response = self.client.get(
            f"{self.prometheus_url}/api/v1/query",
            params={"query": query},
        )
        response.raise_for_status()
        data = response.json()
        if data["status"] != "success":
            return 0.0
        result = data["data"]["result"]
        if not result:
            return 0.0
        return float(result[0]["value"][1])

    def get_canary_error_rate(self) -> float:
        """获取金丝雀实例的错误率。"""
        query = (
            f'sum(rate(http_requests_total{{service="{self.config.service_name}",'
            f'canary="true",code=~"5.."}}[1m])) / '
            f'sum(rate(http_requests_total{{service="{self.config.service_name}",'
            f'canary="true"}}[1m]))'
        )
        return self.query_metric(query)

    def get_canary_p99_latency(self) -> float:
        """获取金丝雀实例的 P99 延迟（毫秒）。"""
        query = (
            f'histogram_quantile(0.99, '
            f'sum(rate(http_request_duration_seconds_bucket{{service="{self.config.service_name}",'
            f'canary="true"}}[1m])) by (le)) * 1000'
        )
        return self.query_metric(query)

    def run_canary(self) -> Literal["promote", "rollback"]:
        """执行金丝雀发布流程。

        返回:
            "promote" 表示晋升成功，"rollback" 表示回滚。

        说明:
            本方法为阻塞式调用，整个金丝雀过程可能持续数分钟。
        """
        for step in range(1, self.config.max_steps + 1):
            traffic_percent = int(step / self.config.max_steps * 100)
            logger.info(
                f"金丝雀步骤 {step}/{self.config.max_steps}: "
                f"流量比例 {traffic_percent}%"
            )

            # 设置流量比例（实际通过 Istio VirtualService 或 Nginx Ingress 实现）
            self._set_traffic_percent(traffic_percent)

            # 等待指标稳定
            time.sleep(self.config.step_duration_seconds)

            # 检查指标
            error_rate = self.get_canary_error_rate()
            p99_latency = self.get_canary_p99_latency()

            logger.info(
                f"步骤 {step} 指标: error_rate={error_rate:.4f}, "
                f"p99_latency={p99_latency:.1f}ms"
            )

            if error_rate > self.config.error_rate_threshold:
                logger.error(
                    f"错误率 {error_rate:.4f} 超过阈值 {self.config.error_rate_threshold}, "
                    "触发回滚"
                )
                self._set_traffic_percent(0)
                return "rollback"

            if p99_latency > self.config.p99_latency_threshold_ms:
                logger.error(
                    f"P99 延迟 {p99_latency:.1f}ms 超过阈值 "
                    f"{self.config.p99_latency_threshold_ms}ms, 触发回滚"
                )
                self._set_traffic_percent(0)
                return "rollback"

        logger.info("金丝雀发布成功，晋升为新版本")
        return "promote"

    def _set_traffic_percent(self, percent: int) -> None:
        """设置金丝雀流量比例（此处为占位实现）。"""
        # 实际实现应通过 kubectl 或 Kubernetes API 修改 Istio VirtualService
        logger.info(f"设置金丝雀流量比例为 {percent}%")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    config = CanaryConfig(
        max_steps=5,
        error_rate_threshold=0.005,
        p99_latency_threshold_ms=300.0,
        step_duration_seconds=30,
        service_name="fandex-demo",
    )
    controller = CanaryController(config)
    result = controller.run_canary()
    print(f"金丝雀结果: {result}")
```

### 5.8 预提交钩子配置

```yaml
# .pre-commit-config.yaml
# 预提交钩子：在 commit 前自动运行 lint / format / type-check / 安全扫描
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-toml
      - id: check-added-large-files
        args: ['--maxkb=500']
      - id: check-merge-conflict
      - id: detect-private-key

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.5.0
    hooks:
      - id: ruff
        args: [--fix, --exit-non-zero-on-fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.10.0
    hooks:
      - id: mypy
        additional_dependencies:
          - pydantic>=2.6
          - httpx>=0.27
        args: [--strict]

  - repo: https://github.com/PyCQA/bandit
    rev: 1.7.9
    hooks:
      - id: bandit
        args: ['-c', 'pyproject.toml', '-r', 'src']
        additional_dependencies: ['bandit[toml]']

  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.5.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

### 5.9 Makefile 流水线本地化

```makefile
# Makefile
# 将常用 CI 命令封装为 make target，确保本地与 CI 环境使用相同命令

PYTHON := python
POETRY := poetry
PYTEST := $(PYTHON) -m pytest
RUFF := ruff
MYPY := mypy

.PHONY: install lint typecheck test build clean ci

install:  ## 安装开发依赖
	$(PYTHON) -m pip install -e ".[dev,test]"
	pre-commit install

lint:  ## 运行 ruff lint
	$(RUFF) check src tests
	$(RUFF) format --check src tests

lint-fix:  ## 自动修复 lint 问题
	$(RUFF) check --fix src tests
	$(RUFF) format src tests

typecheck:  ## 运行 mypy 类型检查
	$(MYPY) src

test:  ## 运行单元测试
	$(PYTEST) -m "not slow and not integration"

test-all:  ## 运行所有测试（含慢测试与集成测试）
	$(PYTEST)

test-parallel:  ## 并行运行测试
	$(PYTEST) -n auto -m "not slow and not integration"

coverage:  ## 生成覆盖率报告
	$(PYTEST) --cov=src --cov-report=html

build:  ## 构建 wheel 与 sdist
	$(PYTHON) -m build

clean:  ## 清理构建产物
	rm -rf dist build *.egg-info .mypy_cache .pytest_cache .ruff_cache htmlcov
	find . -type d -name __pycache__ -exec rm -rf {} +

ci: lint typecheck test build  ## 本地模拟 CI 全流程

help:  ## 显示帮助
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
```

---

## 6. 对比分析

### 6.1 CI/CD 平台对比

| 平台 | 部署模式 | YAML 风格 | 并发上限 | 缓存机制 | 自托管 Runner | Python 生态支持 | 价格模型 |
|------|----------|-----------|----------|----------|----------------|------------------|----------|
| GitHub Actions | SaaS / 自托管 | workflow yaml | 180 / repo | actions/cache | 支持 | setup-python / pypi-publish | 按分钟计费 |
| GitLab CI | 自托管 / SaaS | .gitlab-ci.yml | 无硬上限 | cache key | 支持 | 极佳 | 按用户计费 |
| Jenkins | 自托管 | Jenkinsfile (Groovy) | 受节点数限制 | workspace | 支持 | 插件丰富 | 免费 |
| CircleCI | SaaS / 自托管 | config.yml | 80 / org | cache restore_save | 支持 | 良好 | 按学分计费 |
| Buildkite | SaaS 控制面 + 自托管 Agent | pipeline.yml | 无上限 | agent cache | 必须自托管 | 良好 | 按用户计费 |
| Azure Pipelines | SaaS / 自托管 | azure-pipelines.yml | 1000 / org | cache task | 支持 | 良好 | 按分钟计费 |
| Drone | 自托管 | .drone.yml | 受节点数限制 | volume | 支持 | 一般 | 免费 |
| Argo Workflows | K8s 原生 | workflow yaml | 无上限 | PVC | K8s 原生 | 一般 | 免费 |

**讨论**：GitHub Actions 因其与 GitHub 深度集成、YAML 简洁、社区 Action 海量，已成为开源 Python 项目的事实标准。GitLab CI 在企业内部 DevOps 平台占优，自托管能力更强。Jenkins 因其成熟度与插件生态，仍在传统企业占据重要地位，但 Jenkinsfile 的 Groovy DSL 学习曲线较陡。Buildkite 的"控制面 SaaS + Agent 自托管"模式在数据敏感型企业（如金融）中受欢迎。

### 6.2 Python 依赖管理工具对比

| 工具 | 锁文件格式 | 解析器 | 速度 | PEP 621 支持 | 多版本 Python | UV 替代 | 维护活跃度 |
|------|------------|--------|------|--------------|----------------|---------|------------|
| pip + requirements.txt | 无 | 回溯 | 慢 | 部分 | 否 | 否 | 极高 |
| pip-tools | requirements.lock | 回溯 | 慢 | 部分 | 否 | 否 | 中 |
| Poetry | poetry.lock | PubGrub 改进 | 中 | 是 | 是 | 部分 | 高 |
| PDM | pdm.lock | PubGrub 改进 | 中 | 是 | 是 | 否 | 中 |
| hatch | 无（可选 hatch-pip-compile） | pip | 中 | 是 | 否 | 否 | 高 |
| uv | uv.lock | PubGrub 改进 | 极快 | 是 | 是 | - | 极高 |
| pipenv | Pipfile.lock | 回溯 | 慢 | 否 | 否 | 否 | 低 |

**讨论**：`uv` 由 Astral（ruff 作者）开发，使用 Rust 实现依赖解析与安装，比 pip 快 10-100 倍，且兼容 `pip` 接口，是 2024 年以来 Python 生态的颠覆性工具。`Poetry` 因其成熟度与友好 CLI 仍是默认选择。`pip-tools` 在已有 `requirements.txt` 的项目中仍是平滑升级路径。`hatch` 由 PyPA 维护，是 PEP 621 的参考实现，更适合作为构建后端而非依赖管理器。

### 6.3 测试框架对比

| 框架 | 测试发现 | 参数化 | fixture | 并行 | 插件生态 | 异步支持 | 学习曲线 |
|------|----------|----------|---------|------|----------|----------|----------|
| pytest | 极佳 | 极佳 | 极佳 | xdist | 极丰富 | asyncio | 平缓 |
| unittest | 内置 | parameterized | 一般 | 无 | 一般 | 异步 | 平缓 |
| nose2 | 良好 | 良好 | 一般 | 是 | 一般 | 一般 | 平缓 |
| Hypothesis | 配合 pytest | 极佳 | 良好 | 配合 | 一般 | 良好 | 陡峭 |
| Robot Framework | 关键字驱动 | 良好 | 良好 | 是 | 一般 | 一般 | 平缓 |

**讨论**：pytest 凭借 fixture、参数化、丰富插件生态，是 Python 测试的事实标准。Hypothesis 不是替代品而是补充，它提供基于属性的测试（property-based testing），能在 pytest 框架内运行，是发现边界 bug 的利器。

### 6.4 发布策略对比

| 策略 | 停机时间 | 回滚难度 | 资源开销 | 复杂度 | 适用场景 |
|------|----------|----------|----------|--------|----------|
| 滚动发布（Rolling） | 无 | 中 | 低 | 低 | 无状态服务 |
| 蓝绿发布（Blue-Green） | 无 | 极易（切流量） | 高（双倍） | 中 | 数据库无关服务 |
| 金丝雀发布（Canary） | 无 | 易 | 中 | 高 | 关键业务服务 |
| 影子流量（Shadow） | 无 | N/A | 高 | 极高 | 重构验证 |
| A/B 测试 | 无 | 易 | 中 | 高 | 用户行为实验 |
| 功能开关（Feature Flag） | 无 | 极易 | 低 | 中 | 渐进式功能推出 |

**讨论**：金丝雀发布是当前云原生环境的事实标准，结合 Argo Rollouts 或 Flagger 可实现自动化指标驱动决策。功能开关（Feature Flag）与发布策略正交，可作为补充手段实现代码级灰度。蓝绿发布在 K8s 环境下可通过双 Deployment + Service selector 切换实现，但资源开销是滚动发布的 2 倍。

---

## 7. 常见陷阱与反模式

### 7.1 反模式：缓存键不完整

**事故案例**：某团队在 GitHub Actions 中使用 `hashFiles('requirements.txt')` 作为 pip 缓存键，但 `requirements.txt` 仅包含直接依赖。当间接依赖（如 `pydantic` 依赖 `pydantic-core`）的版本漂移时，缓存命中导致不同 Python 版本安装了不兼容的 wheel，测试在 3.13 上偶发失败。

**根因**：缓存键不是依赖文件内容的双射函数。

**修复方案**：
```yaml
- name: 缓存 pip
  uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: pip-${{ runner.os }}-${{ matrix.python-version }}-${{ hashFiles('requirements*.txt', 'pyproject.toml', 'poetry.lock', 'uv.lock') }}
```

注意键中包含 `runner.os` 与 `matrix.python-version`，确保不同环境不共享缓存。

### 7.2 反模式：在 CI 中使用 `latest` 标签

**事故案例**：某项目 Dockerfile 使用 `FROM python:latest`，某天 Python 3.13 发布后 CI 突然失败，原因是项目依赖 `numpy<2.0` 而 3.13 上 numpy 2.0 才有 wheel。

**根因**：`latest` 标签破坏了可复现构建。

**修复方案**：固定基础镜像版本，并使用 Dependabot / Renovate 自动升级。
```dockerfile
FROM python:3.12.4-slim AS builder
```

### 7.3 反模式：测试覆盖率门禁过严

**事故案例**：某团队设置 `--cov-fail-under=95` 作为流水线门禁，开发者为了达到覆盖率编写大量无意义的 getter/setter 测试，反而掩盖了真正重要的边界测试。

**根因**：覆盖率是必要非充分条件，过高阈值会扭曲激励。

**修复方案**：设置 `--cov-fail-under=80` 作为下限，结合变更覆盖率（diff coverage）作为 PR 评审依据，强制新增代码 100% 覆盖。

### 7.4 反模式：在 `__init__.py` 中执行网络请求

**事故案例**：某包在 `__init__.py` 中调用 `requests.get(...)` 检查新版本，导致 CI 在无网络环境的隔离网段中 `import` 失败。

**根因**：`__init__.py` 应保持副作用最小化。

**修复方案**：
```python
# 错误示范
# __init__.py
import requests
__version__ = requests.get("https://api.github.com/repos/org/repo/releases/latest").json()["tag_name"]

# 正确做法
# __init__.py
__version__ = "1.0.0"  # 静态字符串，由 CI 在构建时替换
```

### 7.5 反模式：CI 中使用 root 用户构建 Docker 镜像

**事故案例**：某团队 Docker 镜像默认以 root 运行，攻击者通过 SSRF 漏洞获得容器内 root 权限，进而通过容器逃逸攻击宿主机。

**根因**：最小权限原则被忽视。

**修复方案**：在 Dockerfile 中显式创建非 root 用户（见 5.4 节）。

### 7.6 反模式：长流水线阻塞 PR 反馈

**事故案例**：某团队流水线包含 12 个串行 job，总耗时 45 分钟，开发者频繁切换上下文导致生产力下降。

**根因**：流水线 DAG 未充分利用并行度。

**修复方案**：
- 将 lint、typecheck、test、build 改为并行执行。
- 使用 `pytest-xdist` 并行测试。
- 引入 test split：将慢测试与快测试分离，PR 流水线只跑快测试，nightly 跑全部。

### 7.7 反模式：秘密泄露到日志

**事故案例**：某开发者使用 `echo $PYPI_TOKEN` 调试 CI，token 被记录到 GitHub Actions 日志，攻击者爬取后上传恶意包。

**根因**：未使用 `::add-mask::` 掩码机制。

**修复方案**：
```yaml
- name: 安全使用 token
  env:
    PYPI_TOKEN: ${{ secrets.PYPI_API_TOKEN }}
  run: |
    echo "::add-mask::$PYPI_TOKEN"
    # 实际使用
    twine upload -u __token__ -p "$PYPI_TOKEN" dist/*
```

### 7.8 反模式：未使用 `actions/checkout` 的 `fetch-depth`

**事故案例**：某项目使用 `actions/checkout@v4` 默认浅克隆（`fetch-depth=1`），导致依赖 git history 的工具（如 `setuptools_scm`、`hatch-vcs`）无法计算版本号，构建出 `0.0.0` 版本的 wheel。

**根因**：浅克隆丢失 tag 与 history。

**修复方案**：
```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # 完整克隆，确保 versioning 工具可用
```

### 7.9 反模式：忽视 Windows 与 Linux 行尾差异

**事故案例**：某团队主力开发在 Windows，CI 在 Linux。pre-commit 钩子 `end-of-file-fixer` 在本地（CRLF）通过，但在 CI（LF）失败，因为 git 配置 `core.autocrlf=true` 自动转换行尾导致 diff。

**根因**：未统一行尾规范。

**修复方案**：在仓库根目录添加 `.gitattributes`：
```
* text=auto eol=lf
*.bat text eol=crlf
*.ps1 text eol=crlf
*.png binary
```

### 7.10 反模式：发布流程依赖单点人工

**事故案例**：某项目发布流程需要工程师手工执行 17 步操作，某次操作员跳过了"更新 CHANGELOG"步骤，导致下游用户无法追踪变更。

**根因**：未实现 release as code。

**修复方案**：使用 `release-please` 或 `release-drafter` 自动生成 release notes，结合 `semantic-release` 实现全自动发布。

---

## 8. 工程实践

### 8.1 流水线分层架构

推荐采用"快速反馈层 + 完整验证层 + 发布层"三层架构：

| 层级 | 触发时机 | 目标 | 耗时目标 |
|------|----------|------|----------|
| 快速反馈层 | 每次 push / PR | lint + 类型检查 + 单元测试（不含 slow） | < 5 分钟 |
| 完整验证层 | PR 合并前 | 集成测试 + 端到端测试 + 安全扫描 | < 30 分钟 |
| 发布层 | main 合并 / tag | 构建 + 发布 + 部署 | < 10 分钟 |

```yaml
# 三层流水线示例
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  # 快速反馈层：并行执行
  lint:
    runs-on: ubuntu-latest
    steps: [/* ruff */]
  typecheck:
    runs-on: ubuntu-latest
    steps: [/* mypy */]
  unit-test:
    runs-on: ubuntu-latest
    steps: [/* pytest -m "not slow" */]

  # 完整验证层：依赖快速反馈层
  integration-test:
    needs: [lint, typecheck, unit-test]
    runs-on: ubuntu-latest
    services:
      postgres: { /* ... */ }
      redis: { /* ... */ }
    steps: [/* pytest -m integration */]

  security-scan:
    needs: [lint]
    runs-on: ubuntu-latest
    steps:
      - uses: snyk/actions/python@master
      - uses: github/codeql-action/init@v3
      - uses: github/codeql-action/analyze@v3

  # 发布层：仅 main 分支
  release:
    if: github.ref == 'refs/heads/main'
    needs: [integration-test, security-scan]
    runs-on: ubuntu-latest
    steps: [/* build, publish, deploy */]
```

### 8.2 缓存策略最佳实践

| 缓存对象 | 缓存键 | 路径 | 失效策略 |
|----------|--------|------|----------|
| pip | OS + Python 版本 + lock 文件 hash | `~/.cache/pip` | lock 文件变更 |
| Poetry | OS + Python 版本 + poetry.lock hash | `~/.cache/pypoetry` | poetry.lock 变更 |
| uv | OS + Python 版本 + uv.lock hash | `~/.cache/uv` | uv.lock 变更 |
| mypy | OS + Python 版本 + 源码 hash | `.mypy_cache` | 源码变更 |
| pytest | OS + Python 版本 + 测试源码 hash | `.pytest_cache` | 测试源码变更 |
| Docker layer | Dockerfile + 依赖清单 hash | Docker layer | 文件变更 |
| pre-commit | pre-commit 配置 + hook 版本 | `~/.cache/pre-commit` | 配置变更 |

### 8.3 矩阵构建策略

```yaml
strategy:
  fail-fast: false  # 不要因一个失败就取消所有矩阵
  matrix:
    include:
      # 主力矩阵：所有平台 + 主流 Python 版本
      - os: ubuntu-latest
        python: '3.12'
        coverage: true
      - os: ubuntu-latest
        python: '3.10'
      - os: ubuntu-latest
        python: '3.11'
      - os: ubuntu-latest
        python: '3.13'
        experimental: true  # 标记为实验性，失败不阻断
      - os: macos-latest
        python: '3.12'
      - os: windows-latest
        python: '3.12'
      # ARM64 架构
      - os: ubuntu-24.04-arm
        python: '3.12'
```

### 8.4 流水线耗时优化清单

1. **并行化**：所有独立 job 并行执行。
2. **缓存**：pip / Poetry / uv / mypy / Docker layer 全部缓存。
3. **测试分片**：使用 `pytest-xdist --numprocesss=auto` 并行测试。
4. **测试选择**：使用 `pytest-testmon` 仅运行受影响的测试。
5. **增量类型检查**：mypy daemon 模式减少冷启动。
6. **依赖预装**：使用自定义 runner image 预装常用依赖。
7. **Docker BuildKit**：启用 `--mount=type=cache` 共享 apt / pip 缓存。
8. **uv 替代 pip**：依赖安装提速 10-100 倍。
9. **避免重复 checkout**：artifact 在 job 间传递，避免重复克隆。
10. **条件触发**：使用 `paths` 过滤器，仅相关变更才触发流水线。

```yaml
on:
  pull_request:
    paths:
      - 'src/**'
      - 'tests/**'
      - 'pyproject.toml'
      - '.github/workflows/**'
```

### 8.5 安全最佳实践

1. **最小权限 Token**：`GITHUB_TOKEN` 使用 `permissions: contents: read` 最小权限。
2. **第三方 Action 固定 SHA**：避免 tag 被劫持。
   ```yaml
   - uses: actions/checkout@9bb56186c3b09b4f86b1c65136769dd318469633  # v4.1.2
   ```
3. **Secret 扫描**：CI 中集成 `trufflehog` 或 `detect-secrets`。
4. **依赖审计**：使用 `pip-audit` 或 `safety` 扫描已知 CVE。
5. **SAST**：集成 `bandit` 与 GitHub CodeQL。
6. **SBOM**：生成 CycloneDX 或 SPDX 格式的软件物料清单。
7. **镜像签名**：使用 `cosign` 对发布的 Docker 镜像签名。
8. **环境隔离**：敏感环境（pypi、prod）使用 `environment` 强制审批。

```yaml
publish:
  environment:
    name: pypi
    url: https://pypi.org/project/fandex-demo/
  steps:
    - run: twine upload dist/*
```

### 8.6 可观测性

1. **测试报告**：使用 `pytest-reporter` 生成 HTML 报告并上传为 artifact。
2. **覆盖率趋势**：Codecov / Coveralls 跟踪覆盖率历史。
3. **流水线指标**：使用 GitHub Actions REST API 收集 job 耗时，导出到 Prometheus。
4. **失败告警**：失败 job 自动发送 Slack / 钉钉通知。
5. **可重试性**：失败 job 使用 `actions/cache` 保存中间状态，便于重试。

```yaml
- name: 失败通知
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    slack-message: |
      流水线失败: ${{ github.workflow }} / ${{ github.ref }}
      提交: ${{ github.sha }}
      作者: ${{ github.actor }}
```

---

## 9. 案例研究

### 9.1 案例：FastAPI 项目的流水线演进

**项目背景**：一个使用 FastAPI 的内部 API 服务，代码量约 5 万行，测试用例约 2000 个。团队 8 人，每日合并 PR 约 5 个。

**初始状态（v1）**：
- 单一 workflow，串行执行 lint → test → build → deploy。
- 总耗时 28 分钟。
- 测试覆盖率 65%。
- 月度生产事故 2-3 次。

**演进阶段 1：并行化**
- 拆分 lint / test / build 为并行 job。
- 引入 `pytest-xdist` 并行测试。
- 耗时降至 12 分钟。

**演进阶段 2：缓存**
- 缓存 pip、mypy、Docker layer。
- 耗时降至 7 分钟。

**演进阶段 3：分阶段测试**
- PR 流水线仅运行 unit test（不含 slow/integration）。
- main 流水线运行完整测试。
- nightly 运行集成测试与性能基准。
- PR 反馈时间降至 4 分钟。

**演进阶段 4：金丝雀发布**
- 引入 Argo Rollouts 实现 K8s 金丝雀发布。
- 5 步金丝雀，每步观察 1 分钟。
- 自动回滚机制使月度事故降至 0-1 次。

**演进阶段 5：迁移到 uv**
- pip 替换为 uv，依赖安装提速 30 倍。
- 流水线总耗时降至 3 分钟。

**关键经验**：
1. 性能优化应优先并行化，再缓存，再工具替换。
2. 测试分阶段是降低 PR 反馈时间的最有效手段。
3. 金丝雀发布对生产稳定性的提升远超想象。
4. 工具迁移（如 pip → uv）应作为最后一步，前几步的架构改进不可跳过。

### 9.2 案例：含 C 扩展的包跨平台发布

**项目背景**：`fandex-accel` 是一个包含 Cython 扩展的高性能计算库，需在 Linux / macOS / Windows 上支持 Python 3.10-3.13，并兼顾 x86_64 与 ARM64。

**挑战**：
1. manylinux 镜像版本选择：manylinux_2_28 不支持 CentOS 7。
2. macOS universal2 wheel 需要同时构建 x86_64 与 arm64。
3. Windows MSVC 与 mingw 编译结果不兼容。
4. PyPy 兼容性需要单独测试矩阵。

**解决方案**：
```yaml
# cibuildwheel 配置（pyproject.toml）
[tool.cibuildwheel]
build = "cp310-* cp311-* cp312-* cp313-*"
skip = "*-win32 *_i686-* pp*"

[tool.cibuildwheel.linux]
archs = ["x86_64", "aarch64"]
manylinux-x86_64-image = "manylinux_2_28"
manylinux-aarch64-image = "manylinux_2_28"

[tool.cibuildwheel.macos]
archs = ["x86_64", "arm64", "universal2"]

[tool.cibuildwheel.windows]
archs = ["AMD64"]
```

**结果**：构建出 24 个 wheel（4 Python 版本 × 6 平台组合），总耗时约 25 分钟。通过 GitHub Releases 自动发布，PyPI 上传后用户 `pip install fanquan-accel` 自动选择对应 wheel，无需本地编译。

### 9.3 案例：事故复盘 - 缓存中毒

**事件**：某次 PR 流水线在本地通过，但 CI 中测试失败，报错 `ImportError: cannot import name 'BaseModel' from 'pydantic'`。

**调查**：
- 本地 `pydantic==2.7.0`，CI 中 `pydantic==1.10.13`。
- `pyproject.toml` 写的是 `pydantic>=2.0`，CI 中为何装了 1.x？

**根因**：
- 缓存键为 `hashFiles('pyproject.toml')`。
- 团队之前曾临时降级到 `pydantic>=1.0`，缓存中保存了 1.x 版本。
- 升级回 `pydantic>=2.0` 后，`pyproject.toml` hash 变化，新缓存键生成。
- 但缓存键未包含 Python 版本，不同 Python 版本共享了同一缓存。
- 在 Python 3.13 上，pip 解析时回退到了缓存中的 1.x wheel。

**修复**：
1. 缓存键加入 Python 版本。
2. 使用 `uv` 替代 pip，避免依赖解析回退。
3. 在 PR 流水线中加入 `pip check` 验证依赖一致性。

**经验**：缓存是双刃剑，错误的缓存比无缓存更危险。缓存键必须严格反映所有影响输出的因素。

### 9.4 案例：迁移到 GitOps 后的部署频率提升

**项目背景**：某团队原使用 Jenkins + 手工 kubectl 部署，每周发布 1-2 次，部署窗口需提前 1 天申请。

**迁移过程**：
1. 将 K8s 清单从 Jenkins 仓库迁移到独立 `deploy` 仓库。
2. CI 流水线合并 main 后自动更新 `deploy` 仓库中的镜像 tag。
3. 部署 Argo CD 监听 `deploy` 仓库。
4. Argo CD 检测到变更后自动同步到 K8s 集群。

**结果**：
- 部署频率从每周 1-2 次提升到每日 5-10 次。
- 部署窗口概念消失，任何时间均可发布。
- 回滚从 30 分钟降至 1 分钟（git revert + Argo CD 同步）。
- 审计能力增强，所有部署变更都有 git commit 记录。

**关键收益**：GitOps 将"部署"从"运维操作"转变为"代码变更"，使得部署流程可审计、可回滚、可自动化。

---

## 10. 习题

### 10.1 基础题

**习题 1**：以下 GitHub Actions 配置有何错误？

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r requirements.txt
      - run: pytest
```

**参考答案要点**：
- 未固定 Python 版本（应使用 `actions/setup-python`）。
- 未缓存 pip 依赖。
- 未使用 `pip install -e .` 测试项目本身。
- 未上传测试报告 artifact。
- 未设置 `permissions` 最小权限。

**习题 2**：解释为什么 `actions/checkout@v4` 默认 `fetch-depth=1`，以及在什么场景下需要改为 `0`。

**参考答案要点**：
- 默认浅克隆是为了加速流水线。
- 需要完整 history 的场景：使用 `setuptools_scm` / `hatch-vcs` 自动版本号；运行 `git log` 生成 CHANGELOG；执行 `git diff` 检测变更范围；CODEQL 等需要 history 的安全工具。

**习题 3**：以下 Dockerfile 有何问题？

```dockerfile
FROM python:latest
WORKDIR /app
COPY . /app
RUN pip install -r requirements.txt
CMD ["python", "app.py"]
```

**参考答案要点**：
- 使用 `latest` 标签破坏可复现性。
- 未使用多阶段构建，镜像体积大。
- `COPY .` 在 `pip install` 之前，导致每次代码变更都重新安装依赖。
- 未创建非 root 用户。
- 未设置 `PYTHONUNBUFFERED`。
- 未使用 `.dockerignore`。

### 10.2 进阶题

**习题 4**：设计一个流水线，在 PR 中只运行受影响的测试，但在 main 分支运行全部测试。

**参考答案要点**：
- 使用 `pytest-testmon` 或 `diff-cover` 检测变更文件。
- 在 PR 流水线中执行 `pytest --testmon`。
- 在 main 流水线中执行 `pytest`。
- 使用 `paths` 过滤器避免无关变更触发流水线。
- 使用 `workflow_dispatch` 支持手动触发完整测试。

**习题 5**：某 Python 包在 PyPI 上发布后，用户 `pip install` 时报错 `ERROR: Cannot install fanquan-demo==1.0.0 because these package versions have conflicting dependencies`。请分析可能原因。

**参考答案要点**：
- 依赖约束过紧（如 `pydantic==2.7.0` 而非 `pydantic>=2.0`）。
- 间接依赖冲突（A 依赖 `httpx<0.28`，B 依赖 `httpx>=0.28`）。
- 平台特定依赖未正确声明（如 `tensorflow` 在 Python 3.13 上不可用）。
- 解决方案：使用 `pip-audit` / `pip-tools` 验证依赖图；使用 `uv` 解析器；发布前在干净环境测试安装。

**习题 6**：解释 `--cov-fail-under=80` 与 `diff-cover --compare-branch=main --fail-under=100` 的区别。

**参考答案要点**：
- `--cov-fail-under=80` 是绝对覆盖率门禁，要求总体覆盖率不低于 80%。
- `diff-cover` 是变更覆盖率门禁，要求新增/修改代码 100% 覆盖。
- 前者允许"低质量历史代码"存在，后者强制"新增代码高质量"。
- 两者结合是最佳实践：绝对下限 + 增量严格。

### 10.3 挑战题

**习题 7**：设计一个金丝雀发布系统，要求：
- 支持 5 步金丝雀（5%, 25%, 50%, 75%, 100%）。
- 每步观察 1 分钟。
- 错误率 > 0.5% 或 P99 > 500ms 自动回滚。
- 回滚后通知 oncall 工程师。
- 支持手动暂停/恢复。

**参考答案要点**：
- 使用 Argo Rollouts 的 `AnalysisTemplate` 定义指标查询。
- 使用 Prometheus 作为指标源。
- 通过 Slack Incoming Webhook 发送通知。
- 使用 `kubectl argo rollouts pause|promote|abort` 实现手动控制。
- 实现详见 5.7 节的 CanaryController 示例。

**习题 8**：某 Python 项目在 GitHub Actions 上耗时 35 分钟，请设计优化方案将耗时降至 5 分钟以内。

**参考答案要点**：
- 现状分析：分别测量 lint / typecheck / test / build 各阶段耗时。
- 优化优先级：
  1. 并行化所有独立 job（-15 分钟）。
  2. 缓存 pip / Poetry / mypy / Docker layer（-10 分钟）。
  3. 迁移到 uv（-3 分钟）。
  4. 测试分片（`pytest-xdist -n auto`）（-3 分钟）。
  5. PR 仅跑 unit test，main 跑完整（PR -5 分钟）。
  6. 自定义 runner image 预装依赖（-2 分钟）。
- 最终预估：3-5 分钟。

**习题 9**：分析以下流水线的安全风险：

```yaml
on:
  pull_request_target:
    types: [opened]

jobs:
  comment:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
      - run: npm install
      - run: npm run build
```

**参考答案要点**：
- `pull_request_target` 触发器使用 base 分支的 workflow 文件，但 checkout 了 PR head。
- `npm install` 与 `npm run build` 会执行 PR 中的恶意代码。
- 攻击者可在 package.json 的 `postinstall` 脚本中植入恶意命令。
- 由于 `pull_request_target` 使用了 `GITHUB_TOKEN` 写权限，攻击者可借此修改仓库。
- 修复：避免在 `pull_request_target` 中执行 PR 代码；改用 `pull_request` 触发器。

**习题 10**：设计一个支持回滚的发布流水线，要求：
- 每次发布自动生成版本号（语义化版本）。
- 发布记录自动生成。
- 支持一键回滚到任意历史版本。
- 回滚操作需双人审批。

**参考答案要点**：
- 使用 `release-please` 自动管理版本号与 CHANGELOG。
- 使用 GitOps 模式，每次发布提交一个 commit 到 `deploy` 仓库。
- 回滚即 `git revert` deploy 仓库的对应 commit。
- 使用 GitHub Environment Protection Rules 实现双人审批。
- 使用 Argo CD 的 `appHistory` 功能列出可回滚版本。

---

## 11. 参考文献

[1] Fowler, M. and Foemmel, M. 2006. Continuous Integration. ThoughtWorks. Available at: https://martinfowler.com/articles/originalContinuousIntegration.html

[2] Humble, J. and Farley, D. 2010. Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation. Addison-Wesley Professional, Boston, MA, USA. DOI: https://doi.org/10.5555/1868164

[3] Beck, K. 2004. Extreme Programming Explained: Embrace Change (2nd ed.). Addison-Wesley Professional, Boston, MA, USA. DOI: https://doi.org/10.5555/1087400

[4] Ford, N., Parsons, R., and Kua, P. 2017. Building Evolutionary Architectures: Support Constant Change. O'Reilly Media, Sebastopol, CA, USA. DOI: https://doi.org/10.5555/3291296

[5] Klimov, A. and Brinkmann, M. 2023. PEP 660 – Editable installs for pyproject.toml based projects (wheel based). Python Enhancement Proposals. Available at: https://peps.python.org/pep-0660/

[6] Eustace, S. 2024. PEP 621 – Storing project metadata in pyproject.toml. Python Enhancement Proposals. Available at: https://peps.python.org/pep-0621/

[7] Smith, D. 2024. cibuildwheel: Build wheels for all Python versions and platforms. Available at: https://github.com/pypa/cibuildwheel

[8] Scherlis, W. L. and Graham, S. L. 2023. Reproducible builds: Principles and practices. Communications of the ACM 66, 4 (Apr. 2023), 44-53. DOI: https://doi.org/10.1145/3583684

[9] Burns, B., Grant, B., Oppenheimer, D., Brewer, E., and Wilkes, J. 2016. Borg, omega, and Kubernetes. Communications of the ACM 59, 5 (Apr. 2016), 50-57. DOI: https://doi.org/10.1145/2890784

[10] Savor, T., Douglas, M., Gentili, M., Williams, L., Beck, K., and Stumm, M. 2016. Continuous deployment at Facebook and OANDA. In Proceedings of the 38th International Conference on Software Engineering Companion (ICSE '16). ACM, New York, NY, USA, 21-30. DOI: https://doi.org/10.1145/2889160.2889213

[11] Rahman, A., Mahdavi-Hezaveh, R., and Williams, L. 2019. A systematic mapping study of infrastructure as code research. Information and Software Technology 108 (Apr. 2019), 65-77. DOI: https://doi.org/10.1016/j.infsof.2018.12.004

[12] Cito, J., Schermann, G., Moreira, J. E., Leitner, P., Nagel, F., Harman, M., and Gall, H. C. 2017. An empirical study of continuous integration and delivery practices. In Proceedings of the 2017 11th Joint Meeting on Foundations of Software Engineering (ESEC/FSE 2017). ACM, New York, NY, USA, 755-766. DOI: https://doi.org/10.1145/3106237.3106259

[13] Laukkanen, E., Itkonen, J., and Lassenius, C. 2017. Problems, causes and solutions when adopting continuous delivery—A systematic literature review. Information and Software Technology 82 (Feb. 2017), 55-79. DOI: https://doi.org/10.1016/j.infsof.2016.10.001

[14] Driessen, V. 2010. A successful Git branching model. nvie.com. Available at: https://nvie.com/posts/a-successful-git-branching-model/

[15] PyPA. 2024. Python Packaging User Guide. Python Packaging Authority. Available at: https://packaging.python.org/en/latest/

---

## 12. 延伸阅读

### 12.1 官方文档

- GitHub Actions 官方文档: https://docs.github.com/actions
- GitLab CI/CD 文档: https://docs.gitlab.com/ee/ci/
- cibuildwheel 文档: https://cibuildwheel.pypa.io/
- Poetry 文档: https://python-poetry.org/docs/
- uv 文档: https://docs.astral.sh/uv/
- hatch 文档: https://hatch.pypa.io/
- PyPA 打包指南: https://packaging.python.org/en/latest/tutorials/packaging-projects/
- Argo CD 文档: https://argo-cd.readthedocs.io/
- Argo Rollouts 文档: https://argo-rollouts.readthedocs.io/
- Flagger 文档: https://flagger.app/

### 12.2 经典教材

- Humble, J., Farley, D. 《Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation》(2010)
- Kim, G., Humble, J., Debois, P., Willis, J. 《The DevOps Handbook: How to Create World-Class Agility, Reliability, and Security in Technology Organizations》(2021, 2nd ed.)
- Beyer, B., Jones, C., Petoff, J., Murphy, N. R. 《Site Reliability Engineering: How Google Runs Production Systems》(2016)
- Ford, N., Parsons, R., Kua, P. 《Building Evolutionary Architectures》(2017)
- Bass, L., Weber, I., Zhu, L. 《DevOps: A Software Architect's Perspective》(2015)
- Schedlbauer, J. 《Release It! Design and Deploy Production-Ready Software》(2018, 2nd ed.)

### 12.3 前沿论文与博客

- Schermann, G. et al. "Quality Is Belief Belief Is Experience: Experiences with Trusted CI/CD". IEEE Software (2018)
- Rahman, A. et al. "Characterizing the Influence of Continuous Integration: Empirical Results from 250+ Open Source and Proprietary Projects". ESEM (2018)
- Hilton, M. et al. "Usage, Costs, and Benefits of Continuous Integration in Open-source Projects". ESEM (2016)
- Vasilescu, B. et al. "Quality and Productivity Outcomes Relating to Continuous Integration in GitHub". FSE (2015)
- Weaveworks GitOps 原则白皮书: https://opengitops.dev/
- Charney, D. "Pull Request Target: The Most Dangerous GitHub Action". GitHub Security Blog (2024)

### 12.4 相关视频与课程

- GitHub Universe 2023: Building Reliable CI/CD Pipelines
- KubeCon 2024: Progressive Delivery with Argo Rollouts
- PyCon 2024: Modern Python Packaging with pyproject.toml
- Continuous Delivery YouTube 频道 (David Farley): https://www.youtube.com/@ContinuousDelivery

### 12.5 实战参考仓库

- FastAPI 项目模板: https://github.com/tiangolo/full-stack-fastapi-template
- Hypermodern Python Cookiecutter: https://github.com/cjolowicz/cookiecutter-hypermodern-python
- Poetry 官方示例: https://github.com/python-poetry/poetry
- cibuildwheel 示例: https://github.com/pypa/cibuildwheel/tree/main/examples
- Argo Rollouts 示例: https://github.com/argoproj/argo-rollouts/tree/master/examples

---

## 附录 A：流水线模板速查

### A.1 最小化 Python 项目 CI

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -e ".[test]"
      - run: pytest
```

### A.2 含 Docker 构建的 CI

```yaml
jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### A.3 含 K8s 部署的 CD

```yaml
jobs:
  deploy:
    needs: [test, docker]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/setup-kubectl@v4
      - run: |
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > kubeconfig
          kubectl --kubeconfig kubeconfig apply -f deploy/manifests/
          kubectl --kubeconfig kubeconfig rollout status deploy/fandex-demo
```

---

## 附录 B：常见命令速查

| 任务 | 命令 |
|------|------|
| 安装开发依赖 | `pip install -e ".[dev,test]"` |
| 运行 lint | `ruff check src tests` |
| 自动修复 lint | `ruff check --fix src tests` |
| 格式化代码 | `ruff format src tests` |
| 类型检查 | `mypy src` |
| 运行测试 | `pytest` |
| 并行测试 | `pytest -n auto` |
| 生成覆盖率 | `pytest --cov=src --cov-report=html` |
| 构建 wheel | `python -m build` |
| 发布到 PyPI | `twine upload dist/*` |
| 构建跨平台 wheel | `cibuildwheel --output-dir wheelhouse` |
| 锁定依赖（uv） | `uv lock` |
| 同步依赖（uv） | `uv sync` |
| 添加依赖（Poetry） | `poetry add httpx` |
| 预提交钩子 | `pre-commit run --all-files` |

---

## 附录 C：故障排查清单

### C.1 流水线突然失败但代码无变更

1. 检查依赖是否升级（PyPI 上游变更）。
2. 检查基础镜像是否更新（`python:3.12-slim` 滚动更新）。
3. 检查 GitHub Actions runner 镜像是否更新。
4. 检查缓存是否过期或中毒。
5. 检查第三方 Action 是否升级（应固定 SHA）。

### C.2 测试在 CI 中失败但本地通过

1. 检查 Python 版本是否一致。
2. 检查依赖版本是否一致（使用 `pip freeze` 对比）。
3. 检查环境变量是否一致。
4. 检查测试是否依赖文件系统路径（Windows 大小写不敏感 vs Linux 敏感）。
5. 检查测试是否依赖网络（CI 可能限制网络）。
6. 检查测试是否有顺序依赖（使用 `pytest-randomly` 暴露）。

### C.3 Docker 镜像构建失败

1. 检查基础镜像版本是否可用。
2. 检查 apt 镜像源是否可达。
3. 检查 pip 镜像源是否可达。
4. 检查 Docker layer 缓存是否中毒。
5. 检查 BuildKit