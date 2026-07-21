---
order: 70
title: Python与自动化
module: python
category: Python
difficulty: advanced
description: 文件、任务调度、Web 与 DevOps 自动化的工程实践，覆盖 pathlib、APScheduler、Celery、Airflow、Playwright、Fabric、subprocess 等核心工具链。
author: fanquanpp
updated: '2026-07-20'
related:
- python/Python与计算机视觉
- python/Python与Web爬虫
- python/函数详解
- python/Python与测试
- python/Python与CLI
prerequisites:
- python/语法速查
- python/函数详解
- python/Python与异常处理
tags:
- python
- automation
- scheduling
- devops
- scripting
- etl
- rpa
learningObjectives:
- '{''remember'': ''复述 Python 自动化六大领域（文件、任务调度、系统、Web、DevOps、ETL）与对应工具链''}'
- '{''understand'': ''解释 APScheduler、Celery、Airflow、Prefect、Dagster 的工作原理与适用场景''}'
- '{''apply'': ''使用 pathlib、shutil、subprocess 编写生产级文件与系统自动化脚本''}'
- '{''apply'': ''使用 argparse、click、typer 构建可配置的命令行自动化工具''}'
- '{''analyze'': ''对比同步/异步、阻塞/非阻塞、单机/分布式任务调度方案的差异''}'
- '{''evaluate'': ''评估 ETL 工作流编排工具（Airflow vs Prefect vs Dagster）的工程权衡''}'
- '{''create'': ''设计一个端到端自动化流水线（采集、处理、调度、监控、告警）''}'
exercises:
- id: ex-auto-01
  type: fill-blank
  cognitiveLevel: remember
  question: Python 标准库中处理路径的推荐模块是 ______，它采用 ______ 编程风格，相比 os.path 更面向对象。
  hint: 参考 PEP 519 与 pathlib 文档。
  answer: '["pathlib", "面向对象"]'
  blankCount: 2
  caseSensitive: false
  explanation: pathlib 是 Python 3.4+ 标准库，使用 Path 对象封装路径操作；PEP 519 引入 os.PathLike 协议统一路径表示。
  difficulty: 1
  estimatedTime: 2
- id: ex-auto-02
  type: choice
  cognitiveLevel: understand
  question: 以下哪种调度器适合分布式、可水平扩展、含任务结果后端的场景？
  options:
  - APScheduler（单机进程内调度）
  - schedule（轻量级 cron 替代）
  - Celery（分布式任务队列）
  - time.sleep 轮询
  correctIndex: 2
  multiple: false
  explanation: Celery 基于 Redis/RabbitMQ 实现分布式任务队列，支持水平扩展、任务重试、结果后端、定时调度（Celery Beat）；APScheduler 与 schedule 仅适合单机；time.sleep 轮询既不准确也浪费资源。
  difficulty: 2
  estimatedTime: 3
  answer: C. Celery 基于 Redis/RabbitMQ 实现分布式任务队列，支持水平扩展、任务重试、结果后端、定时调度（Celery Beat）；APScheduler 与 schedule 仅适合单机；time.sleep 轮询既不准确也浪费资源。
- id: ex-auto-03
  type: code-fix
  cognitiveLevel: apply
  question: 以下脚本意图批量重命名 photos 目录下所有 .jpg 文件为 IMG_<时间戳>.jpg，但存在多处缺陷，请修正。
  buggyCode: "import os\nfor f in os.listdir('photos'):\n    if f.endswith('.jpg'):\n        os.rename(f, f'IMG_{time.time()}.jpg')\n"
  fixedCode: "import time\nfrom pathlib import Path\n\nsrc_dir = Path('photos')\nfor f in src_dir.iterdir():\n    if f.suffix.lower() == '.jpg':\n        # 缺陷 1: 未导入 time 模块\n        # 缺陷 2: listdir 返回文件名而非完整路径，rename 时找不到文件\n        # 缺陷 3: time.time() 浮点含小数点，作为文件名不安全\n        # 缺陷 4: 大小写敏感，应统一处理 .JPG 与 .jpg\n        new_name = f'IMG_{int(time.time())}_{f.stem}.jpg'\n        f.rename(src_dir / new_name)\n"
  errorDescription: 未导入 time 模块、路径处理错误、时间戳含小数点、大小写敏感。
  language: python
  explanation: 应使用 pathlib.Path 处理路径；时间戳应取 int 避免小数点；后缀比较应大小写不敏感；rename 需使用完整路径。
  difficulty: 3
  estimatedTime: 10
  answer: '未导入 time 模块、路径处理错误、时间戳含小数点、大小写敏感。 关键修复：# 缺陷 1: 未导入 time 模块 | # 缺陷 2: listdir 返回文件名而非完整路径，rename 时找不到文件 | # 缺陷 3: time.time() 浮点含小数点，作为文件名不安全'
- id: ex-auto-04
  type: open-ended
  cognitiveLevel: create
  question: 你需要为一家电商公司设计一个数据流水线，每日凌晨 2 点从 MySQL 抽取订单数据，清洗后写入 ClickHouse，并在完成后发送 Slack 通知。请详细描述你会使用哪些 Python 工具链、如何设计任务依赖（DAG）、如何处理失败重试与告警，以及如何保证幂等性。
  keyPoints:
  - 工具链：Airflow/Prefect + SQLAlchemy + clickhouse-driver + slack-sdk
  - DAG 设计：extract -> transform -> load -> notify
  - 幂等性：使用订单 ID 主键 + ON CONFLICT 或 ReplacingMergeTree
  - 重试策略：指数退避，最大 3 次
  - 告警：Slack webhook + Airflow on_failure_callback
  - 数据校验：行数对比、抽样检查
  - 调度：crontab 表达式 0 2 * * *
  - 时区处理：UTC 存储 + 本地展示
  minWords: 300
  difficulty: 5
  estimatedTime: 30
  answer: 工具链：Airflow/Prefect + SQLAlchemy + clickhouse-driver + slack-sdk；DAG 设计：extract -> transform -> load -> notify；幂等性：使用订单 ID 主键 + ON CONFLICT 或 ReplacingMergeTree；重试策略：指数退避，最大 3 次；告警：Slack webhook + Airflow on_failure_callback；数据校验：行数对比、抽样检查；调度：crontab 表达式 0 2 * * *；时区处理：UTC 存储 + 本地展示
references:
- type: standard
  authors:
  - Python Software Foundation
  year: 2026
  title: subprocess — Subprocess management
  venue: Python Documentation
  url: https://docs.python.org/3/library/subprocess.html
  accessedDate: '2026-07-20'
- type: standard
  authors:
  - Python Software Foundation
  year: 2026
  title: pathlib — Object-oriented filesystem paths (PEP 428/519)
  venue: Python Documentation
  url: https://docs.python.org/3/library/pathlib.html
  accessedDate: '2026-07-20'
- type: standard
  authors:
  - Apache Software Foundation
  year: 2026
  title: Apache Airflow Documentation (Version 2.10+)
  venue: Apache
  url: https://airflow.apache.org/docs/
  accessedDate: '2026-07-20'
- type: standard
  authors:
  - Celery Project
  year: 2026
  title: Celery 5.4 Documentation
  venue: Celery Project
  url: https://docs.celeryq.dev/
  accessedDate: '2026-07-20'
- type: conference
  authors:
  - Hinojosa, G.
  - Fowler, M.
  year: 2020
  title: 'Building data pipelines with Airflow and Prefect: A comparative study'
  venue: IEEE International Conference on Big Data
  pages: 4500-4508
  doi: 10.1109/BigData50022.2020.00048
- type: standard
  authors:
  - Prefect Technologies
  year: 2026
  title: Prefect 3.x Documentation
  venue: Prefect
  url: https://docs.prefect.io/
  accessedDate: '2026-07-20'
- type: standard
  authors:
  - Dagster Labs
  year: 2026
  title: Dagster 1.7+ Documentation
  venue: Dagster
  url: https://docs.dagster.io/
  accessedDate: '2026-07-20'
- type: standard
  authors:
  - Microsoft
  year: 2026
  title: Playwright for Python Documentation
  venue: Microsoft
  url: https://playwright.dev/python/
  accessedDate: '2026-07-20'
- type: standard
  authors:
  - PSF
  year: 2026
  title: concurrent.futures — Launching parallel tasks
  venue: Python Documentation
  url: https://docs.python.org/3/library/concurrent.futures.html
  accessedDate: '2026-07-20'
- type: book
  authors:
  - Lopez, N.
  year: 2022
  title: Python Automation Cookbook
  venue: Packt Publishing
  pages: 1-450
etymology:
- term: 自动化
  english: Automation
  origin: 1948 年福特汽车工程师 Hardrod 提出，源自希腊语 automatos（自我移动）。
- term: 调度器
  english: Scheduler
  origin: 拉丁语 schedula（小纸条），原指记录任务的小纸条。
- term: 守护进程
  english: Daemon
  origin: 希腊神话中的守护精灵，1963 年 MIT Project MAC 首次用于计算机术语。
- term: 幂等
  english: Idempotent
  origin: 数学用语，源自 idem（同一）+ potens（能力），意为多次执行结果一致。
- term: 流水线
  english: Pipeline
  origin: 借用石油工业的管道术语，由 Dennis Ritchie 引入 Unix。
lastReviewed: 2026-07-20
reviewer: FANDEX Content Engineering Team
estimatedReadingTime: 95
---

# Python 与自动化

> 自动化的本质不是消灭工作，而是把人从重复劳动中解放出来，专注于创造性的问题。Python 因其简洁语法、丰富生态与跨平台特性，是当今最受欢迎的自动化脚本语言之一。

## 1. 学习目标与全景图

学习本章后，你应当能够：

1. **记住（Remember）** Python 自动化的六大领域及其代表工具；
2. **理解（Understand）** 任务调度器、工作流引擎的内部原理；
3. **应用（Apply）** pathlib、subprocess、APScheduler、Celery、Airflow 等工具编写自动化脚本；
4. **分析（Analyze）** 同步、异步、阻塞、分布式任务调度的差异与权衡；
5. **评估（Evaluate）** 不同 ETL 工具链（Airflow/Prefect/Dagster）的适用场景；
6. **创造（Create）** 设计端到端自动化流水线，覆盖采集、处理、调度、监控、告警。

```
                Python 自动化生态
                      |
   +-----+-----+-----+-----+-----+-----+
   |     |     |     |     |     |     |
  文件  任务  系统  Web  DevOps  ETL  监控
 pathlib APScheduler subprocess Playwright Fabric Airflow Prometheus
 shutil  Celery     psutil     Selenium  Ansible Prefect  Grafana
 watchdog Airflow   asyncio    Puppeteer  Rundeck Dagster  Sentry
```

## 2. 历史动机：从 cron 到 DataOps

### 2.1 脚本自动化时代（1970 — 2000）

- **1970 年代**：Unix cron、at、batch 调度器诞生；
- **1980 年代**：Shell 脚本（sh/csh/ksh/bash）成为主流；
- **1989 年**：Python 0.9 发布，逐步替代 Shell 成为高级脚本语言；
- **1990 年代**：Perl 与 Python 并驾齐驱，应用于系统管理。

### 2.2 工作流引擎时代（2000 — 2015）

- **2005 年**：LinkedIn 开发 Azkaban；
- **2010 年**：Facebook 开源 Airflow 雏形；
- **2014 年**：Apache Oozie（Hadoop 生态）流行；
- **2015 年**：Airflow 开源，开启 DAG 即代码时代；
- **2016 年**：Luigi（Spotify）、Pinball（Pinterest）相继发布。

### 2.3 现代 DataOps 时代（2015 — 至今）

| 年份 | 事件 | 意义 |
| ---- | ---- | ---- |
| 2015 | Airflow 加入 Apache 孵化器 | DAG 即代码成为主流 |
| 2016 | Celery 4.0 发布 | 异步任务队列标准化 |
| 2018 | Prefect 1.0 发布 | 现代化工作流引擎 |
| 2019 | Dagster 0.6 发布 | 资产驱动数据流水线 |
| 2020 | GitHub Actions 普及 | CI/CD 自动化平民化 |
| 2022 | Playwright Python 稳定 | 取代 Selenium 趋势 |
| 2023 | Prefect 2.x 发布 | 简化 API |
| 2024 | Airflow 2.10 加入 AI/ML 算子 | LLMOps 集成 |
| 2025 | Dagster 1.7 引入 Unified Data Platform | 一体化数据平台 |
| 2026 | Prefect 3.x 与 Airflow 3.0 并存 | 数据编排新范式 |

### 2.4 Python 自动化生态演进

- **Python 2.x**：`os.system`、`commands.getoutput`；
- **Python 3.0 — 3.3**：引入 `subprocess` 模块；
- **Python 3.4**：引入 `pathlib`、`asyncio`；
- **Python 3.5**：`async/await` 语法；
- **Python 3.6**：`concurrent.futures` 完善，类型注解普及；
- **Python 3.11**：`asyncio.TaskGroup`、`ExceptionGroup`；
- **Python 3.12**：`Path.walk()`、`subprocess` 改进；
- **Python 3.13**：自由线程（PEP 703）、JIT 实验；
- **Python 3.14**：`subprocess` 增强超时控制、`asyncio` 改进。

## 3. 形式化定义

### 3.1 任务调度模型

定义任务为 $T = \langle I, O, f, D \rangle$，其中：
- $I$ 为输入集合；
- $O$ 为输出集合；
- $f: I \to O$ 为任务函数；
- $D$ 为依赖集合（DAG 边）。

调度器目标是寻找任务执行序列 $\sigma = (T_{i_1}, T_{i_2}, \dots, T_{i_n})$，满足：
1. **依赖性**：$\forall T_j \in D(T_i), T_j$ 在 $T_i$ 之前完成；
2. **资源约束**：同时运行任务数 $\leq R$；
3. **优化目标**：最小化完成时间 $\text{makespan}$ 或最大化吞吐量。

### 3.2 DAG 与拓扑排序

工作流表示为有向无环图（DAG）$G = (V, E)$，其中节点 $V$ 为任务，边 $E$ 表示依赖。合法调度序列是 $G$ 的拓扑排序。

Kahn 算法：

```python
def topological_sort(graph: dict[str, list[str]]) -> list[str]:
    """Kahn 算法计算 DAG 拓扑排序。

    Args:
        graph: 邻接表表示，graph[u] = [v1, v2, ...] 表示 u -> v1, u -> v2。

    Returns:
        拓扑排序后的节点列表。若图含环，抛出 ValueError。
    """
    from collections import defaultdict, deque
    in_degree = defaultdict(int)
    for u, neighbors in graph.items():
        for v in neighbors:
            in_degree[v] += 1
    queue = deque([u for u in graph if in_degree[u] == 0])
    result = []
    while queue:
        u = queue.popleft()
        result.append(u)
        for v in graph.get(u, []):
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.append(v)
    if len(result) != len(graph):
        raise ValueError("图中存在环")
    return result
```

### 3.3 任务幂等性

幂等任务 $f$ 满足：$f(f(x)) = f(x)$。在自动化中，幂等性意味着任务可重试而不产生副作用。

形式化：$\forall s \in S, \text{run}(s) = \text{run}(\text{run}(s))$，其中 $S$ 为系统状态。

### 3.4 at-least-once 与 exactly-once 语义

| 语义 | 含义 | 实现方式 |
| ---- | ---- | ---- |
| at-most-once | 任务可能不执行 | 不重试 |
| at-least-once | 任务至少执行一次 | 自动重试 |
| exactly-once | 任务恰好执行一次 | 重试 + 幂等 |
| effectively-once | 业务上等效执行一次 | 重试 + 业务幂等 |

## 4. 理论推导：异步与并发模型

### 4.1 进程 vs 线程 vs 协程

| 维度 | 进程 | 线程 | 协程 |
| ---- | ---- | ---- | ---- |
| 创建成本 | 高（~10MB） | 中（~1MB 栈） | 低（~KB） |
| 切换成本 | 高 | 中 | 低 |
| 通信方式 | IPC（队列、管道） | 共享内存 | 事件循环 |
| GIL 影响 | 无 | 受限 | 不受限（IO 时让出） |
| 适用场景 | CPU 密集 | 历史遗留 | IO 密集 |

### 4.2 Amdahl 定律

加速比 $S(n) = \frac{1}{(1-p) + p/n}$，其中 $p$ 为可并行比例，$n$ 为处理器数。

若 50% 任务可并行，4 核理论上限加速比 $S(4) = \frac{1}{0.5 + 0.5/4} = 1.6$。

### 4.3 Little 定律在任务队列中的应用

队列平均等待时间 $W = L / \lambda$，其中 $L$ 为队列长度，$\lambda$ 为到达速率。在 Celery 中用于估算任务延迟。

## 5. Python 自动化库全景

### 5.1 文件与目录操作

| 库 | 用途 | 维护方 | License |
| --- | --- | --- | --- |
| `pathlib` | 路径对象操作 | CPython | PSF |
| `shutil` | 高级文件操作 | CPython | PSF |
| `os` | 系统调用 | CPython | PSF |
| `glob` | 通配符匹配 | CPython | PSF |
| `watchdog` | 文件系统监控 | Yesudeva Mangalore | Apache-2.0 |
| `pathspec` | gitignore 风格匹配 | Coppyr | MPL-2.0 |

### 5.2 任务调度

| 库 | 类型 | 维护方 | License |
| --- | --- | --- | --- |
| `schedule` | 轻量级 cron 替代 | Dan Bader | MIT |
| `APScheduler` | 进程内调度 | Alex Grönholm | MIT |
| `Celery` | 分布式任务队列 | Celery Project | BSD |
| `RQ` | Redis 队列 | Vincent Driessen | BSD |
| `Dramatiq` | RabbitMQ/Redis 队列 | Bogdan Popa | LGPL-3.0 |
| `Huey` | 轻量级队列 | Charles Leifer | MIT |

### 5.3 工作流引擎

| 库 | 设计哲学 | 维护方 | License |
| --- | --- | --- | --- |
| `Airflow` | DAG 即代码 | Apache | Apache-2.0 |
| `Prefect` | Pythonic 工作流 | Prefect Technologies | Apache-2.0 |
| `Dagster` | 资产驱动 | Dagster Labs | Apache-2.0 |
| `Luigi` | 任务依赖图 | Spotify | Apache-2.0 |
| `Kedro` | 数据科学流水线 | QuantumBlack | Apache-2.0 |
| `Flyte` | 云原生工作流 | Flyte.org | Apache-2.0 |

### 5.4 系统自动化

| 库 | 用途 | 维护方 | License |
| --- | --- | --- | --- |
| `subprocess` | 子进程管理 | CPython | PSF |
| `psutil` | 进程与系统信息 | Giampaolo Rodola | BSD-3-Clause |
| `sh` | Shell 命令 Pythonic 封装 | Andrew Moffat | MIT |
| `plumbum` | Shell 风格脚本 | Tomer Filiba | MIT |
| `fabric` | 远程执行 SSH | Jeff Forcier | BSD |
| `paramiko` | SSH 协议 | Paramiko Project | LGPL |

### 5.5 Web 自动化

| 库 | 用途 | 维护方 | License |
| --- | --- | --- | --- |
| `Selenium` | 浏览器自动化 | Selenium HQ | Apache-2.0 |
| `Playwright` | 现代浏览器自动化 | Microsoft | Apache-2.0 |
| `requests` | HTTP 客户端 | Kenneth Reitz | Apache-2.0 |
| `httpx` | 现代 HTTP 客户端 | Encode | BSD-3-Clause |
| `aiohttp` | 异步 HTTP | aio-libs | MIT |

### 5.6 配置与 CLI

| 库 | 用途 | 维护方 | License |
| --- | --- | --- | --- |
| `argparse` | 标准库 CLI | CPython | PSF |
| `click` | 装饰器风格 CLI | Pallets | BSD-3-Clause |
| `typer` | 类型注解 CLI | Sebastián Ramírez | MIT |
| `rich` | 终端美化 | Textualize | MIT |
| `pydantic` | 数据验证 | Pydantic | MIT |
| `pydantic-settings` | 配置管理 | Pydantic | MIT |

## 6. 代码示例

### 6.1 文件自动化：pathlib + shutil

```python
"""
文件自动化示例：使用 pathlib 与 shutil 完成常见文件操作。

设计原则:
1. 优先使用 pathlib 而非 os.path
2. 大文件使用 shutil.copyfileobj 流式拷贝
3. 涉及元数据时使用 shutil.copy2 保留时间戳
"""
import hashlib
import shutil
from pathlib import Path


def list_files_by_extension(directory: Path, extension: str) -> list[Path]:
    """按扩展名列出文件。

    Args:
        directory: 目录路径。
        extension: 扩展名（不含点，如 'jpg'）。

    Returns:
        文件路径列表，按文件名排序。
    """
    return sorted(
        p for p in directory.rglob(f'*.{extension}')
        if p.is_file()
    )


def batch_rename(directory: Path, pattern: str, replacement: str,
                  dry_run: bool = True) -> list[tuple[Path, Path]]:
    """批量重命名文件。

    Args:
        directory: 目录路径。
        pattern: 旧文件名中的模式（正则）。
        replacement: 替换字符串。
        dry_run: True 表示仅预览不执行。

    Returns:
        (旧路径, 新路径) 列表。
    """
    import re
    renamed = []
    for f in directory.iterdir():
        if f.is_file():
            new_name = re.sub(pattern, replacement, f.name)
            if new_name != f.name:
                new_path = f.parent / new_name
                renamed.append((f, new_path))
                if not dry_run:
                    f.rename(new_path)
    return renamed


def batch_resize_images(src_dir: Path, dst_dir: Path,
                         sizes: list[tuple[int, int]]):
    """批量调整图片大小。

    Args:
        src_dir: 源目录。
        dst_dir: 目标目录。
        sizes: 目标尺寸列表，如 [(800, 600), (400, 300)]。
    """
    from PIL import Image
    dst_dir.mkdir(parents=True, exist_ok=True)
    for img_path in src_dir.glob('*.[jJ][pP][gG]'):
        with Image.open(img_path) as img:
            for w, h in sizes:
                resized = img.resize((w, h), Image.LANCZOS)
                out_path = dst_dir / f'{img_path.stem}_{w}x{h}.jpg'
                resized.save(out_path, quality=85)


def file_sha256(path: Path, chunk_size: int = 65536) -> str:
    """计算文件 SHA-256 摘要。"""
    h = hashlib.sha256()
    with path.open('rb') as f:
        while chunk := f.read(chunk_size):
            h.update(chunk)
    return h.hexdigest()


def incremental_backup(src: Path, dst: Path, manifest_path: Path):
    """增量备份：仅复制哈希变化的文件。

    Args:
        src: 源目录。
        dst: 目标目录。
        manifest_path: 哈希清单文件路径。
    """
    import json
    manifest = {}
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
    new_manifest = {}
    dst.mkdir(parents=True, exist_ok=True)
    for src_file in src.rglob('*'):
        if src_file.is_file():
            rel = src_file.relative_to(src)
            sha = file_sha256(src_file)
            new_manifest[str(rel)] = sha
            if manifest.get(str(rel)) != sha:
                dst_file = dst / rel
                dst_file.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src_file, dst_file)
                print(f'已备份: {rel}')
    manifest_path.write_text(json.dumps(new_manifest, indent=2))
```

### 6.2 文件系统监控：watchdog

```python
"""
文件系统监控示例。

应用场景:
- 自动化测试触发
- 日志收集
- 实时同步
- 代码热重载
"""
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent
from pathlib import Path
import time


class LogChangeHandler(FileSystemEventHandler):
    """日志文件变化处理器。"""

    def __init__(self, watch_dir: Path):
        self.watch_dir = watch_dir

    def on_modified(self, event: FileSystemEvent):
        """文件被修改时触发。"""
        if not event.is_directory and event.src_path.endswith('.log'):
            print(f'日志文件变化: {event.src_path}')

    def on_created(self, event: FileSystemEvent):
        """文件被创建时触发。"""
        if not event.is_directory:
            print(f'新文件创建: {event.src_path}')


def start_watching(directory: Path, recursive: bool = True):
    """启动文件系统监控。"""
    observer = Observer()
    observer.schedule(
        LogChangeHandler(directory),
        str(directory),
        recursive=recursive,
    )
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()


def main():
    import sys
    target = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
    start_watching(target)
```

### 6.3 子进程管理：subprocess

```python
"""
子进程管理示例。

设计原则:
1. 使用 subprocess.run 而非 os.system
2. 优先使用列表参数而非 shell=True
3. 处理超时与异常
4. 流式读取大输出
"""
import subprocess
from typing import Optional


def run_command(cmd: list[str], cwd: Optional[str] = None,
                 timeout: int = 60, capture: bool = True) -> subprocess.CompletedProcess:
    """运行命令并返回结果。

    Args:
        cmd: 命令列表，如 ['git', 'status']。
        cwd: 工作目录。
        timeout: 超时秒数。
        capture: 是否捕获 stdout/stderr。

    Returns:
        subprocess.CompletedProcess 实例。

    Raises:
        subprocess.TimeoutExpired: 超时。
        subprocess.CalledProcessError: 退出码非零（需 check=True）。
    """
    return subprocess.run(
        cmd,
        cwd=cwd,
        capture_output=capture,
        text=True,
        timeout=timeout,
        check=False,  # 不抛 CalledProcessError
        encoding='utf-8',
        errors='replace',
    )


def stream_command(cmd: list[str]) -> None:
    """实时输出命令的 stdout/stderr。"""
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,  # 行缓冲
        encoding='utf-8',
        errors='replace',
    )
    assert process.stdout is not None
    for line in process.stdout:
        print(line, end='')
    process.wait()
    if process.returncode != 0:
        raise subprocess.CalledProcessError(
            process.returncode, cmd,
        )


def run_in_background(cmd: list[str], output_file: str) -> subprocess.Popen:
    """在后台运行命令，输出重定向到文件。"""
    with open(output_file, 'w', encoding='utf-8') as f:
        return subprocess.Popen(
            cmd,
            stdout=f,
            stderr=subprocess.STDOUT,
            text=True,
            start_new_session=True,  # 脱离父进程会话
        )


def git_clone_or_pull(repo_url: str, target_dir: str) -> bool:
    """克隆或更新 Git 仓库。"""
    from pathlib import Path
    target = Path(target_dir)
    if target.exists():
        # 已存在则 pull
        result = run_command(['git', 'pull', '--rebase'], cwd=str(target))
    else:
        result = run_command(['git', 'clone', repo_url, str(target)])
    return result.returncode == 0
```

### 6.4 任务调度：APScheduler

```python
"""
APScheduler 示例。

特性:
- 支持 cron、interval、date 三种触发器
- 单机进程内调度，简单易用
- 支持持久化存储（SQLAlchemyJobStore）
- 支持异步任务（AsyncIOScheduler）
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.date import DateTrigger
from datetime import datetime, timedelta
import logging


def daily_report():
    """每日报告任务。"""
    print(f'[{datetime.now()}] 生成日报...')


def hourly_cleanup():
    """每小时清理任务。"""
    print(f'[{datetime.now()}] 清理临时文件...')


def setup_scheduler() -> BackgroundScheduler:
    """配置调度器。"""
    logging.basicConfig()
    logging.getLogger('apscheduler').setLevel(logging.DEBUG)

    scheduler = BackgroundScheduler(timezone='Asia/Shanghai')

    # 每天凌晨 2 点执行
    scheduler.add_job(
        daily_report,
        trigger=CronTrigger(hour=2, minute=0),
        id='daily_report',
        replace_existing=True,
        misfire_grace_time=3600,  # 1 小时容错
        coalesce=True,  # 合并错过的执行
    )

    # 每小时执行
    scheduler.add_job(
        hourly_cleanup,
        trigger=IntervalTrigger(hours=1),
        id='hourly_cleanup',
        replace_existing=True,
    )

    # 5 分钟后执行一次
    scheduler.add_job(
        lambda: print('一次性任务'),
        trigger=DateTrigger(run_date=datetime.now() + timedelta(minutes=5)),
        id='one_shot',
    )

    return scheduler


def main():
    scheduler = setup_scheduler()
    scheduler.start()
    try:
        # 主线程保持运行
        import time
        while True:
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown(wait=False)


if __name__ == '__main__':
    main()
```

### 6.5 分布式任务队列：Celery

```python
"""
Celery 分布式任务队列示例。

架构:
- Producer: 任务发布方
- Broker: Redis/RabbitMQ
- Worker: 任务执行方
- Backend: 结果存储

启动 worker:
    celery -A tasks worker --loglevel=info
启动 beat:
    celery -A tasks beat --loglevel=info
"""
from celery import Celery, Task, chain, group
from celery.result import AsyncResult
from celery.schedules import crontab

app = Celery(
    'fandex_tasks',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/1',
    include=['tasks'],
)

app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Shanghai',
    enable_utc=True,
    task_acks_late=True,  # 任务完成后才 ack，防丢失
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,  # 长任务避免预取太多
    task_track_started=True,
    task_time_limit=60 * 30,  # 30 分钟硬超时
    task_soft_time_limit=60 * 25,  # 25 分钟软超时
    task_default_retry_delay=60,
    task_default_max_retries=3,
    beat_schedule={
        'daily-report': {
            'task': 'tasks.daily_report',
            'schedule': crontab(hour=2, minute=0),
        },
        'hourly-cleanup': {
            'task': 'tasks.cleanup_temp',
            'schedule': crontab(minute=0),
        },
    },
)


class BaseTaskWithRetry(Task):
    """带重试的任务基类。"""
    autoretry_for = (Exception,)
    retry_kwargs = {'max_retries': 3}
    retry_backoff = True  # 指数退避
    retry_backoff_max = 600  # 最大间隔 10 分钟
    retry_jitter = True  # 添加随机抖动


@app.task(bind=True, base=BaseTaskWithRetry)
def process_order(self, order_id: str):
    """处理订单任务。"""
    try:
        # 模拟业务逻辑
        import time
        time.sleep(5)
        return {'status': 'success', 'order_id': order_id}
    except Exception as exc:
        # 重试前可记录日志
        raise self.retry(exc=exc)


@app.task
def send_email(to: str, subject: str, body: str):
    """发送邮件任务。"""
    import smtplib
    # 略: SMTP 发送逻辑
    return {'status': 'sent', 'to': to}


@app.task
def generate_report(date: str):
    """生成报告任务。"""
    import time
    time.sleep(10)
    return {'report': f'report_{date}.pdf'}


@app.task
def upload_to_s3(file_path: str):
    """上传 S3 任务。"""
    import time
    time.sleep(3)
    return {'url': f's3://bucket/{file_path}'}


def chain_example(report_date: str):
    """任务链: 生成报告 -> 上传 S3 -> 发送邮件。"""
    workflow = chain(
        generate_report.s(report_date),
        upload_to_s3.s(),
        send_email.s('admin@example.com', '报告就绪'),
    )
    result = workflow.apply_async()
    return result.id


def group_example(orders: list[str]):
    """任务组: 并行处理多个订单。"""
    job = group(process_order.s(oid) for oid in orders)
    result = job.apply_async()
    return result.id


def get_task_status(task_id: str) -> dict:
    """查询任务状态。"""
    result = AsyncResult(task_id, app=app)
    return {
        'task_id': task_id,
        'status': result.status,
        'result': result.result if result.ready() else None,
        'date_done': result.date_done,
    }
```

### 6.6 工作流引擎：Airflow

```python
"""
Airflow DAG 示例。

特性:
- DAG 即代码（Python）
- 任务依赖图显式声明
- 内置 80+ operators
- 强大的 UI 与监控
"""
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.operators.empty import EmptyOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.providers.snowflake.operators.snowflake import SnowflakeOperator
from airflow.utils.task_state import TaskState


default_args = {
    'owner': 'data_team',
    'depends_on_past': False,
    'email': ['data@example.com'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'retry_exponential_backoff': True,
    'max_retry_delay': timedelta(minutes=60),
    'priority_weight_default': 1,
    'execution_timeout': timedelta(hours=2),
    'sla': timedelta(hours=3),
}


def extract(**context):
    """从 MySQL 抽取数据。"""
    import pymysql
    from datetime import datetime
    execution_date = context['ds']
    conn = pymysql.connect(host='mysql', user='reader', password='...')
    with conn.cursor() as cur:
        cur.execute(
            'SELECT * FROM orders WHERE DATE(created_at) = %s',
            (execution_date,)
        )
        rows = cur.fetchall()
    # 暂存到本地或 S3
    return len(rows)


def transform(**context):
    """数据清洗与转换。"""
    import pandas as pd
    ti = context['task_instance']
    count = ti.xcom_pull(task_ids='extract')
    print(f'处理 {count} 行数据')
    # 略: Pandas 转换逻辑
    return {'transformed_count': count}


def load(**context):
    """加载到 ClickHouse。"""
    from clickhouse_driver import Client
    client = Client(host='clickhouse', port=9000)
    # 略: 批量插入逻辑
    return {'loaded': True}


def notify_slack(**context):
    """Slack 通知。"""
    import requests
    webhook_url = 'https://hooks.slack.com/services/...'
    message = {
        'text': f"DAG {context['dag'].dag_id} 完成！"
    }
    requests.post(webhook_url, json=message)


with DAG(
    dag_id='etl_orders',
    default_args=default_args,
    description='订单数据 ETL 流水线',
    schedule='0 2 * * *',  # 每天凌晨 2 点
    start_date=datetime(2024, 1, 1),
    catchup=False,  # 不回填历史
    max_active_runs=1,  # 避免并发执行
    max_active_tasks=4,
    tags=['etl', 'orders', 'daily'],
    doc_md=__doc__,
) as dag:

    start = EmptyOperator(task_id='start')
    end = EmptyOperator(task_id='end')

    extract_task = PythonOperator(
        task_id='extract',
        python_callable=extract,
    )

    transform_task = PythonOperator(
        task_id='transform',
        python_callable=transform,
    )

    load_task = PythonOperator(
        task_id='load',
        python_callable=load,
    )

    notify_task = PythonOperator(
        task_id='notify',
        python_callable=notify_slack,
        trigger_rule='all_success',  # 仅全部成功才通知
    )

    notify_failure_task = PythonOperator(
        task_id='notify_failure',
        python_callable=notify_slack,
        trigger_rule='one_failed',  # 任一失败则触发
    )

    # 依赖关系
    start >> extract_task >> transform_task >> load_task >> notify_task >> end
    [extract_task, transform_task, load_task] >> notify_failure_task
```

### 6.7 现代工作流：Prefect

```python
"""
Prefect 3.x 示例。

特性:
- Pythonic API（装饰器风格）
- 内置缓存、重试、超时
- 强类型（基于 Pydantic）
- 现代化 UI
"""
from prefect import flow, task, get_run_logger
from datetime import timedelta
import asyncio


@task(
    retries=3,
    retry_delay_seconds=[10, 30, 60],  # 渐进重试
    retry_jitter_factor=0.5,
    timeout_seconds=300,
    cache_key_fn=lambda ctx, args: f"extract-{args['date']}",
    cache_expiration=timedelta(hours=12),
)
async def extract_data(date: str) -> list[dict]:
    """异步抽取数据（带缓存）。"""
    logger = get_run_logger()
    logger.info(f'抽取 {date} 数据...')
    await asyncio.sleep(2)
    return [{'id': i, 'date': date} for i in range(100)]


@task
async def transform_data(rows: list[dict]) -> list[dict]:
    """数据转换。"""
    logger = get_run_logger()
    logger.info(f'转换 {len(rows)} 行数据')
    return [{**r, 'transformed': True} for r in rows]


@task
async def load_data(rows: list[dict]) -> int:
    """加载数据。"""
    logger = get_run_logger()
    logger.info(f'加载 {len(rows)} 行')
    return len(rows)


@flow(name='daily_etl', log_prints=True)
async def daily_etl_pipeline(date: str):
    """完整 ETL 流水线。"""
    raw = await extract_data(date=date)
    transformed = await transform_data(raw)
    loaded_count = await load_data(transformed)
    return loaded_count


@flow(name='scheduled_etl')
async def scheduled_etl():
    """定时调度的 ETL。"""
    from datetime import datetime
    date = datetime.now().strftime('%Y-%m-%d')
    await daily_etl_pipeline(date)


if __name__ == '__main__':
    # 本地运行
    asyncio.run(daily_etl_pipeline('2026-07-20'))

    # 部署到 Prefect Cloud/Server
    # from prefect.deployments.runner import DeploymentImage
    # await scheduled_etl.serve(
    #     name='daily-etl-deployment',
    #     tags=['production'],
    #     cron='0 2 * * *',
    #     timezone='Asia/Shanghai',
    # )
```

### 6.8 资产驱动：Dagster

```python
"""
Dagster 资产驱动示例。

特性:
- 数据资产而非任务为核心
- 自动追踪数据血缘
- 强类型与配置
- Software-defined Asset
"""
from dagster import (
    asset, Definitions, ScheduleDefinition, define_asset_job,
    AssetExecutionContext, MaterializeResult, MetadataValue,
)
import pandas as pd


@asset(
    group_name='raw',
    description='从 MySQL 抽取的原始订单数据',
    io_manager_key='mysql_io_manager',
)
def raw_orders(context: AssetExecutionContext) -> pd.DataFrame:
    """从 MySQL 抽取订单。"""
    context.log.info('抽取订单...')
    return pd.DataFrame({'id': [1, 2, 3], 'amount': [100, 200, 300]})


@asset(group_name='staging', deps=[raw_orders])
def cleaned_orders(context: AssetExecutionContext) -> pd.DataFrame:
    """清洗后的订单数据。"""
    df = raw_orders()
    # 略: 清洗逻辑
    df['amount'] = df['amount'].astype(float)
    return df


@asset(group_name='marts')
def daily_revenue(context: AssetExecutionContext) -> MaterializeResult:
    """日收入汇总。"""
    df = cleaned_orders()
    total = df['amount'].sum()
    context.log.info(f'当日总收入: {total}')
    return MaterializeResult(
        metadata={
            'total_revenue': MetadataValue.float(total),
            'row_count': MetadataValue.int(len(df)),
        }
    )


daily_etl_job = define_asset_job(
    name='daily_etl_job',
    selection=['raw_orders', 'cleaned_orders', 'daily_revenue'],
)

daily_schedule = ScheduleDefinition(
    name='daily_schedule',
    job=daily_etl_job,
    cron_schedule='0 2 * * *',
)

defs = Definitions(
    assets=[raw_orders, cleaned_orders, daily_revenue],
    jobs=[daily_etl_job],
    schedules=[daily_schedule],
)
```

### 6.9 Web 自动化：Playwright

```python
"""
Playwright Web 自动化示例。

特性:
- 自动等待元素
- 多浏览器（Chromium、Firefox、WebKit）
- 网络拦截
- 视频录制
- 同步与异步 API
"""
from playwright.sync_api import sync_playwright, Browser, Page


def scrape_quotes():
    """爬取 quotes.toscrape.com 的引言。"""
    quotes = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('https://quotes.toscrape.com/')

        while True:
            quote_elements = page.query_selector_all('.quote')
            for q in quote_elements:
                text = q.query_selector('.text').inner_text()
                author = q.query_selector('.author').inner_text()
                quotes.append({'text': text, 'author': author})

            next_btn = page.query_selector('.next a')
            if not next_btn:
                break
            next_btn.click()
            page.wait_for_load_state('networkidle')

        browser.close()
    return quotes


def fill_form(url: str, form_data: dict):
    """自动化填写表单。"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # 可视化调试
        page = browser.new_page()
        page.goto(url)

        for selector, value in form_data.items():
            page.fill(selector, value)

        page.click('button[type="submit"]')
        page.wait_for_url('**/success**')
        browser.close()


def screenshot_page(url: str, output: str, full_page: bool = True):
    """截图保存。"""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})
        page.goto(url)
        page.screenshot(path=output, full_page=full_page)
        browser.close()


def intercept_network(url: str):
    """拦截网络请求示例。"""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # 拦截所有请求
        def handle_route(route):
            print(f'{route.request.method} {route.request.url}')
            route.continue_()

        page.route('**', handle_route)
        page.goto(url)
        browser.close()


async def async_scrape(urls: list[str]):
    """异步并发爬取多个页面。"""
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context()

        async def scrape_one(url: str):
            page = await context.new_page()
            await page.goto(url)
            title = await page.title()
            await page.close()
            return title

        tasks = [scrape_one(url) for url in urls]
        titles = await asyncio.gather(*tasks)
        await browser.close()
        return titles


import asyncio
if __name__ == '__main__':
    print(scrape_quotes()[:3])
```

### 6.10 命令行工具：Click + Typer

```python
"""
Typer 示例：构建现代 CLI 工具。

特性:
- 基于类型注解自动生成参数
- 自动生成 --help
- 子命令支持
- 与 Click 兼容
"""
import typer
from pathlib import Path
from typing import Optional
from enum import Enum

app = typer.Typer(help='文件自动化工具集', add_completion=False)


class SortBy(str, Enum):
    name = 'name'
    size = 'size'
    modified = 'modified'


@app.command()
def list_files(
    directory: Path = typer.Argument('.', help='目标目录'),
    extension: str = typer.Option(None, '--ext', '-e', help='按扩展名过滤'),
    sort_by: SortBy = typer.Option(SortBy.name, '--sort', '-s'),
    recursive: bool = typer.Option(False, '--recursive', '-r'),
):
    """列出目录文件。"""
    pattern = f'*.{extension}' if extension else '*'
    files = (
        list(directory.rglob(pattern)) if recursive
        else list(directory.glob(pattern))
    )
    files = [f for f in files if f.is_file()]
    if sort_by == SortBy.name:
        files.sort(key=lambda f: f.name)
    elif sort_by == SortBy.size:
        files.sort(key=lambda f: f.stat().st_size, reverse=True)
    elif sort_by == SortBy.modified:
        files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
    for f in files:
        typer.echo(f'{f.stat().st_size:>10}  {f}')


@app.command()
def rename(
    directory: Path = typer.Argument(...),
    pattern: str = typer.Option(..., '--pattern', '-p'),
    replacement: str = typer.Option('', '--replacement', '-r'),
    dry_run: bool = typer.Option(True, '--dry-run/--no-dry-run'),
):
    """批量重命名。"""
    import re
    for f in directory.iterdir():
        if f.is_file():
            new_name = re.sub(pattern, replacement, f.name)
            if new_name != f.name:
                typer.echo(f'{f.name} -> {new_name}')
                if not dry_run:
                    f.rename(f.parent / new_name)


@app.command()
def backup(
    source: Path = typer.Argument(...),
    destination: Path = typer.Argument(...),
    compress: bool = typer.Option(False, '--compress', '-z'),
):
    """备份目录。"""
    import shutil
    if compress:
        shutil.make_archive(str(destination), 'zip', source)
    else:
        shutil.copytree(source, destination)


if __name__ == '__main__':
    app()
```

### 6.11 配置管理：pydantic-settings

```python
"""
pydantic-settings 配置管理示例。

特性:
- 类型安全
- 支持环境变量、.env 文件、JSON
- 嵌套配置
- 数据验证
"""
from pydantic import Field, SecretStr, validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseConfig(BaseSettings):
    """数据库配置。"""
    host: str = 'localhost'
    port: int = 5432
    name: str = 'fandex'
    user: str = 'postgres'
    password: SecretStr
    pool_size: int = 10
    max_overflow: int = 20

    model_config = SettingsConfigDict(env_prefix='DB_')

    @validator('port')
    def validate_port(cls, v):
        if not 1 <= v <= 65535:
            raise ValueError('port must be in [1, 65535]')
        return v


class RedisConfig(BaseSettings):
    """Redis 配置。"""
    host: str = 'localhost'
    port: int = 6379
    db: int = 0
    password: SecretStr | None = None

    model_config = SettingsConfigDict(env_prefix='REDIS_')


class AppConfig(BaseSettings):
    """应用主配置。"""
    env: str = 'development'
    debug: bool = False
    secret_key: SecretStr
    database: DatabaseConfig
    redis: RedisConfig
    log_level: str = 'INFO'

    model_config = SettingsConfigDict(
        env_file='.env',
        env_nested_delimiter='__',
        env_prefix='APP_',
    )


# 使用示例
if __name__ == '__main__':
    # 假设 .env 包含:
    # APP_SECRET_KEY=abc123
    # APP_DATABASE__PASSWORD=db_pass
    # APP_REDIS__PASSWORD=redis_pass
    config = AppConfig()
    print(f'环境: {config.env}')
    print(f'数据库: {config.database.host}:{config.database.port}')
    print(f'Redis: {config.redis.host}:{config.redis.port}')
```

### 6.12 异步并发：asyncio

```python
"""
asyncio 异步编程示例。

适用场景:
- 高并发 IO 密集任务
- HTTP 爬虫
- WebSocket 服务
- 数据库连接池
"""
import asyncio
from typing import Any
import aiohttp


async def fetch_url(session: aiohttp.ClientSession, url: str) -> dict:
    """异步获取 URL。"""
    async with session.get(url) as response:
        return {
            'url': url,
            'status': response.status,
            'body': await response.text(),
        }


async def fetch_all(urls: list[str], concurrency: int = 10) -> list[dict]:
    """并发获取多个 URL，限制并发数。

    Args:
        urls: URL 列表。
        concurrency: 最大并发数。

    Returns:
        结果列表。
    """
    semaphore = asyncio.Semaphore(concurrency)

    async def bounded_fetch(session, url):
        async with semaphore:
            return await fetch_url(session, url)

    timeout = aiohttp.ClientTimeout(total=30)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        results = await asyncio.gather(
            *[bounded_fetch(session, url) for url in urls],
            return_exceptions=True,
        )
    return results


async def process_queue():
    """生产者-消费者模式。"""
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)

    async def producer(idx: int):
        for i in range(10):
            await queue.put((idx, i))
            await asyncio.sleep(0.1)

    async def consumer(name: str):
        while True:
            item = await queue.get()
            print(f'消费者 {name} 处理: {item}')
            queue.task_done()
            await asyncio.sleep(0.05)

    # 启动 2 个生产者与 3 个消费者
    producers = [producer(i) for i in range(2)]
    consumers = [consumer(f'C{i}') for i in range(3)]

    await asyncio.gather(*producers)
    await queue.join()
    # 取消消费者
    for c in consumers:
        c.cancel()


async def main():
    """主入口。"""
    urls = [
        'https://httpbin.org/delay/1',
        'https://httpbin.org/delay/2',
        'https://httpbin.org/get',
    ]
    results = await fetch_all(urls)
    print(f'获取 {len(results)} 个结果')


if __name__ == '__main__':
    # Python 3.7+
    asyncio.run(main())

    # Python 3.11+ 推荐使用 TaskGroup
    async def with_task_group():
        async with asyncio.TaskGroup() as tg:
            task1 = tg.create_task(fetch_url(None, 'url1'))
            task2 = tg.create_task(fetch_url(None, 'url2'))
        # 此处两个任务都已完成
        return task1.result(), task2.result()
```

### 6.13 系统监控：psutil

```python
"""
psutil 系统监控示例。

应用场景:
- 资源监控（CPU/内存/磁盘/网络）
- 进程管理
- 系统健康检查
"""
import psutil
import time
from datetime import datetime


def system_health_check() -> dict:
    """系统健康检查。"""
    return {
        'timestamp': datetime.now().isoformat(),
        'cpu': {
            'percent': psutil.cpu_percent(interval=1),
            'count': psutil.cpu_count(),
            'freq': psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None,
        },
        'memory': psutil.virtual_memory()._asdict(),
        'swap': psutil.swap_memory()._asdict(),
        'disk': {p.mountpoint: p._asdict() for p in psutil.disk_partitions()},
        'network': psutil.net_io_counters()._asdict(),
        'boot_time': datetime.fromtimestamp(
            psutil.boot_time()
        ).isoformat(),
    }


def find_top_processes(n: int = 10, by: str = 'memory') -> list[dict]:
    """查找资源占用最高的进程。

    Args:
        n: 返回前 N 个进程。
        by: 'memory' 或 'cpu'。
    """
    procs = []
    for p in psutil.process_iter(['pid', 'name', 'username', 'memory_percent', 'cpu_percent']):
        procs.append(p.info)

    key = 'memory_percent' if by == 'memory' else 'cpu_percent'
    procs.sort(key=lambda x: x.get(key, 0), reverse=True)
    return procs[:n]


def kill_process_by_name(name: str, force: bool = False) -> int:
    """按名称杀死进程。

    Args:
        name: 进程名。
        force: True 表示 SIGKILL，False 表示 SIGTERM。

    Returns:
        被杀死的进程数。
    """
    killed = 0
    for p in psutil.process_iter(['name']):
        if p.info['name'] == name:
            try:
                if force:
                    p.kill()
                else:
                    p.terminate()
                killed += 1
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    return killed


def monitor_resource_usage(interval: float = 1.0, duration: float = 60.0):
    """监控资源使用率。

    Args:
        interval: 采样间隔。
        duration: 总时长。
    """
    samples = []
    end = time.time() + duration
    while time.time() < end:
        samples.append({
            'time': datetime.now().isoformat(),
            'cpu': psutil.cpu_percent(),
            'memory': psutil.virtual_memory().percent,
        })
        time.sleep(interval)
    return samples
```

## 7. 对比分析

### 7.1 与 Shell (Bash) 对比

```bash
#!/bin/bash
# Bash: 文件批量重命名
for f in *.jpg; do
    mv "$f" "IMG_$(date +%s)_$f"
done

# 调度任务
(crontab -l 2>/dev/null; echo "0 2 * * * /path/to/script.sh") | crontab -
```

**对比要点**：
- Bash 简单快速，但跨平台性差、错误处理弱；
- Python 跨平台、库生态丰富、可测试、可维护；
- Python 适合复杂业务逻辑，Bash 适合简单系统操作；
- 现代 DevOps 推荐将 Bash 脚本迁移到 Python。

### 7.2 与 Ruby (Capistrano) 对比

```ruby
# Ruby: Capistrano 部署脚本
task :deploy do
  on roles(:app) do
    execute :git, :pull
    execute :bundle, :install
    execute :rake, 'db:migrate'
    execute :sudo, :systemctl, :restart, 'puma'
  end
end
```

**对比要点**：
- Capistrano 是 Ruby 经典部署工具，DSL 简洁；
- Python Fabric 提供类似能力，且与 Python 生态集成更好；
- 现代基础设施即代码（IaC）已转向 Ansible/Terraform。

### 7.3 与 Go 对比

```go
// Go: 后台任务调度
package main

import (
    "fmt"
    "time"
    "github.com/robfig/cron/v3"
)

func main() {
    c := cron.New()
    c.AddFunc("0 2 * * *", func() {
        fmt.Println("Daily task")
    })
    c.Start()
    time.Sleep(time.Hour)
}
```

**对比要点**：
- Go 编译为单二进制，部署简单，启动快；
- Python 依赖解释器，但开发效率高；
- Go 适合高性能后端，Python 适合数据处理与 ETL；
- Go 在 K8s Operator 场景中更受欢迎（Kubebuilder）。

### 7.4 与 JavaScript (Node.js) 对比

```javascript
// Node.js: 定时任务
import cron from 'node-cron';

cron.schedule('0 2 * * *', () => {
    console.log('Daily task');
});

// 异步任务队列
import { Worker } from 'bullmq';
const worker = new Worker('queue', async (job) => {
    return processJob(job.data);
});
```

**对比要点**：
- Node.js 异步 IO 性能优秀，事件驱动；
- Python asyncio 与之相当，但语法更清晰；
- Node.js 在 Web 后端自动化（npm scripts、gulp）流行；
- Python 在数据科学、AI 自动化中无可替代。

## 8. 常见陷阱

### 8.1 使用 os.system 而非 subprocess

```python
import os
os.system('rm -rf /tmp/*')  # 不安全，易被注入！
```

应使用 `subprocess.run` 配合列表参数。

### 8.2 Shell 注入

```python
import subprocess
user_input = '; rm -rf /'
subprocess.run(f'echo {user_input}', shell=True)  # 危险！
```

应使用列表参数 `subprocess.run(['echo', user_input])`，避免 `shell=True`。

### 8.3 异常未处理导致任务静默失败

```python
# 错误示例
def task():
    result = some_operation()  # 可能抛异常
    save_to_db(result)  # 永远不会执行
```

应使用 try-except 包裹，并通过日志或重试机制处理。

### 8.4 阻塞主线程

```python
# 错误: 在 GUI 或 Web 中调用阻塞任务
@app.route('/long_task')
def long_task():
    result = long_running_operation()  # 阻塞整个 worker
    return result
```

应使用 Celery、BackgroundTasks、asyncio 等异步处理。

### 8.5 全局可变状态

```python
# 错误
counter = 0
def increment():
    global counter
    counter += 1  # 多线程不安全
```

应使用 `threading.Lock`、`multiprocessing.Value` 或原子操作。

### 8.6 忽略幂等性

```python
# 错误: 多次执行结果不一致
def transfer(amount, from_account, to_account):
    from_account.balance -= amount
    to_account.balance += amount
    # 失败重试会重复扣款
```

应使用事务与唯一请求 ID 实现幂等。

### 8.7 时区处理错误

```python
# 错误
from datetime import datetime
schedule_at = datetime(2024, 1, 1, 2, 0)  # 没有指定时区
```

应使用 `timezone.utc` 或 `ZoneInfo('Asia/Shanghai')`。

### 8.8 资源泄露

```python
# 错误: 未关闭文件与连接
def read_data():
    f = open('data.txt')
    return f.read()  # f 永远不会关闭
```

应使用 `with` 上下文管理器。

### 8.9 日志缺失或过度

```python
# 错误 1: 没有日志
def task(): pass

# 错误 2: 日志过多
def task():
    for item in items:
        print(item)  # 高频调用拖慢性能
```

应使用 `logging` 模块并合理设置级别。

### 8.10 任务超时未设置

```python
# 错误: 网络请求可能永远阻塞
response = requests.get(url)  # 无超时
```

应设置 `timeout=30` 或在 Celery 配置 `task_time_limit`。

## 9. 工程实践

### 9.1 项目结构建议

```
my_automation/
├── pyproject.toml
├── README.md
├── .env.example
├── src/
│   └── my_automation/
│       ├── __init__.py
│       ├── cli.py              # CLI 入口
│       ├── config.py           # 配置管理
│       ├── tasks/
│       │   ├── __init__.py
│       │   ├── file_ops.py     # 文件操作
│       │   ├── etl.py          # ETL 任务
│       │   └── monitoring.py   # 监控任务
│       ├── pipelines/
│       │   ├── __init__.py
│       │   └── daily_etl.py    # Airflow/Prefect DAG
│       ├── notifications/
│       │   ├── __init__.py
│       │   ├── slack.py
│       │   └── email.py
│       └── utils/
│           ├── __init__.py
│           ├── logging.py
│           └── retry.py
├── tests/
│   ├── test_file_ops.py
│   └── test_etl.py
├── docker/
│   └── Dockerfile
└── k8s/
    └── deployment.yaml
```

### 9.2 日志最佳实践

```python
"""
结构化日志配置。

特性:
- JSON 格式便于机器解析
- 包含任务 ID、时间戳、级别
- 按级别输出到不同目标
"""
import logging
import json
import sys
from datetime import datetime, timezone


class JSONFormatter(logging.Formatter):
    """JSON 格式化器。"""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
        }
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
        if hasattr(record, 'task_id'):
            log_entry['task_id'] = record.task_id
        return json.dumps(log_entry, ensure_ascii=False)


def setup_logging(level: str = 'INFO', json_output: bool = False):
    """配置全局日志。

    Args:
        level: 日志级别。
        json_output: 是否输出 JSON 格式。
    """
    handler = logging.StreamHandler(sys.stdout)
    if json_output:
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
            )
        )

    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(handler)

    # 文件日志
    file_handler = logging.FileHandler('app.log', encoding='utf-8')
    file_handler.setFormatter(JSONFormatter())
    file_handler.setLevel(logging.WARNING)
    root.addHandler(file_handler)
```

### 9.3 重试装饰器

```python
"""
带指数退避的重试装饰器。

特性:
- 可配置最大重试次数
- 指数退避 + 抖动
- 仅对特定异常重试
"""
import asyncio
import functools
import logging
import random
import time
from typing import Callable, Type, Tuple

logger = logging.getLogger(__name__)


def retry(
    max_retries: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    jitter: float = 0.1,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
):
    """同步重试装饰器。

    Args:
        max_retries: 最大重试次数。
        delay: 初始延迟秒数。
        backoff: 退避乘数。
        jitter: 抖动比例（0-1）。
        exceptions: 触发重试的异常类型。
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            current_delay = delay
            for attempt in range(1, max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_retries:
                        logger.error(
                            f'{func.__name__} 重试 {max_retries} 次后仍失败: {e}'
                        )
                        raise
                    jitter_delay = current_delay * random.uniform(
                        1 - jitter, 1 + jitter
                    )
                    logger.warning(
                        f'{func.__name__} 第 {attempt} 次失败，'
                        f'{jitter_delay:.2f}s 后重试: {e}'
                    )
                    time.sleep(jitter_delay)
                    current_delay *= backoff
        return wrapper
    return decorator


def async_retry(
    max_retries: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
):
    """异步重试装饰器。"""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            current_delay = delay
            for attempt in range(1, max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_retries:
                        raise
                    await asyncio.sleep(current_delay)
                    current_delay *= backoff
        return wrapper
    return decorator


# 使用示例
@retry(max_retries=5, exceptions=(ConnectionError, TimeoutError))
def fetch_data(url: str):
    import requests
    return requests.get(url, timeout=10).json()


@async_retry(max_retries=3)
async def async_fetch(url: str):
    import aiohttp
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()
```

### 9.4 通知集成：Slack / 钉钉 / 邮件

```python
"""
通知模块：Slack、钉钉、邮件。
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests


def send_slack(webhook_url: str, message: str, channel: str = None):
    """发送 Slack 消息。"""
    payload = {'text': message}
    if channel:
        payload['channel'] = channel
    response = requests.post(webhook_url, json=payload, timeout=10)
    response.raise_for_status()


def send_dingtalk(webhook_url: str, message: str, at_all: bool = False):
    """发送钉钉消息。"""
    payload = {
        'msgtype': 'text',
        'text': {'content': message},
        'at': {'isAtAll': at_all},
    }
    response = requests.post(webhook_url, json=payload, timeout=10)
    response.raise_for_status()


def send_email(
    smtp_host: str,
    smtp_port: int,
    username: str,
    password: str,
    to: str,
    subject: str,
    body: str,
    use_tls: bool = True,
):
    """发送邮件。"""
    msg = MIMEMultipart()
    msg['From'] = username
    msg['To'] = to
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain', 'utf-8'))

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        if use_tls:
            server.starttls()
        server.login(username, password)
        server.send_message(msg)
```

### 9.5 Docker 化部署

```python
"""
Docker 部署示例。

Dockerfile 内容:
    FROM python:3.13-slim
    WORKDIR /app
    COPY pyproject.toml .
    RUN pip install --no-cache-dir poetry && poetry install --no-dev
    COPY src/ ./src/
    CMD ["python", "-m", "my_automation.cli", "run"]
"""
# docker-compose.yml 中可定义:
# version: '3.9'
# services:
#   scheduler:
#     build: .
#     command: celery -A tasks worker --loglevel=info
#     environment:
#       - DB_PASSWORD=${DB_PASSWORD}
#     restart: unless-stopped
#     depends_on:
#       - redis
#       - postgres
#   beat:
#     build: .
#     command: celery -A tasks beat --loglevel=info
#   redis:
#     image: redis:7-alpine
#   postgres:
#     image: postgres:16-alpine
#     environment:
#       - POSTGRES_PASSWORD=${DB_PASSWORD}
```

### 9.6 Kubernetes 部署

```yaml
# k8s/deployment.yaml 示例
apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: celery-worker
  template:
    metadata:
      labels:
        app: celery-worker
    spec:
      containers:
      - name: worker
        image: my-automation:latest
        command: ["celery", "-A", "tasks", "worker", "--loglevel=info"]
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          exec:
            command: ["celery", "-A", "tasks", "inspect", "ping"]
          initialDelaySeconds: 60
          periodSeconds: 60
```

## 10. 案例研究

### 10.1 案例一：Netflix 的 Mesos 调度

Netflix 使用 Apache Mesos 与 Chronos 调度数千个数据处理任务。后来迁移到 Airflow，并开发自己的扩展（Pantom）。

**启示**：
- 工作流引擎需考虑多租户与权限；
- 监控与告警是生产关键；
- 数据血缘有助于调试。

### 10.2 案例二：Airbnb 的 Airflow 诞生

Airbnb 在 2014 年开源 Airflow，解决其内部数据管道管理问题。

**核心设计**：
- DAG 即代码，版本控制友好；
- 调度器、Worker、Web Server 三层架构；
- Executer 抽象（LocalExecutor、CeleryExecutor、KubernetesExecutor）。

### 10.3 案例三：Dropbox 的 Python 自动化

Dropbox 大量使用 Python 自动化文件同步、备份与监控。

**关键设计**：
- 客户端用 Python 实现增量同步；
- 服务端使用 Python 编写 ETL；
- 自研工具 Magic Pocket 用于冷存储。

### 10.4 案例四：YouTube 的视频处理流水线

YouTube 使用 Python 编排视频转码、缩略图生成、字幕处理等任务。

**关键设计**：
- 任务队列基于自研系统；
- 工作流引擎处理 DAG；
- 自动重试与降级机制。

### 10.5 案例五：Instagram 的 Celery 应用

Instagram 使用 Celery 处理图片处理、Feed 更新、推送通知等异步任务。

**关键设计**：
- 单一大型 Celery 集群；
- 自定义 Broker 优化（基于 Cassandra）；
- 任务优先级队列与限流。

### 10.6 案例六：Uber 的 Prefect 迁移

Uber 从 Airflow 迁移到 Prefect 以提升开发体验。

**原因**：
- Prefect Pythonic API 更易上手；
- 动态 DAG 支持；
- 更好的本地开发体验。

## 11. 性能调优

### 11.1 并发模型选择

| 场景 | 推荐方案 | 原因 |
| ---- | ---- | ---- |
| CPU 密集 | multiprocessing | 绕过 GIL |
| IO 密集 | asyncio / threading | 不阻塞主线程 |
| 混合 | concurrent.futures | 统一 API |
| 分布式 | Celery / RQ | 多机扩展 |

### 11.2 性能基准

| 任务类型 | 单线程 | 多线程 | 多进程 | asyncio |
| --- | --- | --- | --- | --- |
| CPU 密集（100M 累加） | 5s | 5s | 1.5s | 5s |
| IO 密集（100 HTTP） | 50s | 5s | 5s | 1s |
| 混合 | 30s | 8s | 5s | 3s |

### 11.3 优化技巧

```python
"""
性能优化技巧。
"""
import asyncio
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor


def cpu_bound_task(n: int) -> int:
    """CPU 密集任务。"""
    total = 0
    for i in range(n):
        total += i ** 2
    return total


def run_cpu_bound_parallel(tasks: list[int]) -> list[int]:
    """并行执行 CPU 密集任务。"""
    with ProcessPoolExecutor() as executor:
        results = list(executor.map(cpu_bound_task, tasks))
    return results


async def io_bound_task(url: str) -> str:
    """IO 密集任务。"""
    import aiohttp
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            return await resp.text()


async def run_io_bound_concurrent(urls: list[str]) -> list[str]:
    """并发执行 IO 密集任务。"""
    semaphore = asyncio.Semaphore(100)  # 限制并发数

    async def bounded(url):
        async with semaphore:
            return await io_bound_task(url)

    return await asyncio.gather(*[bounded(u) for u in urls])


# 批处理优化
def batch_process(items: list, batch_size: int = 100):
    """分批处理，避免内存爆炸。"""
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        yield process_batch(batch)


def process_batch(batch: list):
    """处理一批数据。"""
    return [item * 2 for item in batch]
```

## 12. 监控与告警

### 12.1 Prometheus 集成

```python
"""
Prometheus 监控集成。
"""
from prometheus_client import Counter, Histogram, Gauge, start_http_server


# 定义指标
TASKS_TOTAL = Counter(
    'automation_tasks_total',
    'Total tasks executed',
    ['task_name', 'status'],
)

TASK_DURATION = Histogram(
    'automation_task_duration_seconds',
    'Task execution duration',
    ['task_name'],
    buckets=(0.1, 0.5, 1, 5, 10, 30, 60, 300, 600),
)

ACTIVE_TASKS = Gauge(
    'automation_active_tasks',
    'Currently running tasks',
)


def monitored_task(func):
    """任务监控装饰器。"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        ACTIVE_TASKS.inc()
        start = time.time()
        try:
            result = func(*args, **kwargs)
            TASKS_TOTAL.labels(
                task_name=func.__name__,
                status='success',
            ).inc()
            return result
        except Exception as e:
            TASKS_TOTAL.labels(
                task_name=func.__name__,
                status='failure',
            ).inc()
            raise
        finally:
            duration = time.time() - start
            TASK_DURATION.labels(
                task_name=func.__name__,
            ).observe(duration)
            ACTIVE_TASKS.dec()
    return wrapper


import functools
import time
```

### 12.2 Sentry 异常追踪

```python
"""
Sentry 异常追踪集成。
"""
import sentry_sdk
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.logging import LoggingIntegration


def init_sentry(dsn: str, environment: str = 'production'):
    """初始化 Sentry。"""
    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        integrations=[
            CeleryIntegration(),
            LoggingIntegration(
                level=logging.INFO,
                event_level=logging.ERROR,
            ),
        ],
        traces_sample_rate=0.1,  # 10% 性能采样
        send_default_pii=False,  # 不发送 PII
        before_send=scrub_sensitive_data,
    )


def scrub_sensitive_data(event, hint):
    """脱敏处理。"""
    if 'request' in event:
        headers = event['request'].get('headers', {})
        for key in list(headers.keys()):
            if 'auth' in key.lower() or 'token' in key.lower():
                headers[key] = '[REDACTED]'
    return event
```

## 13. 测试与验证

### 13.1 单元测试

```python
"""
自动化脚本的单元测试。
"""
import pytest
from pathlib import Path
from my_automation.file_ops import (
    list_files_by_extension,
    batch_rename,
    incremental_backup,
)


class TestFileOps:
    """文件操作测试。"""

    def test_list_files_by_extension(self, tmp_path: Path):
        """测试按扩展名列出文件。"""
        (tmp_path / 'a.jpg').write_text('')
        (tmp_path / 'b.png').write_text('')
        (tmp_path / 'c.jpg').write_text('')

        files = list_files_by_extension(tmp_path, 'jpg')
        assert len(files) == 2
        assert all(f.suffix == '.jpg' for f in files)

    def test_batch_rename_dry_run(self, tmp_path: Path):
        """测试批量重命名预览模式。"""
        (tmp_path / 'old_1.txt').write_text('content')
        (tmp_path / 'old_2.txt').write_text('content')

        renamed = batch_rename(
            tmp_path, r'old_', 'new_', dry_run=True
        )
        assert len(renamed) == 2
        # 文件未被实际重命名
        assert (tmp_path / 'old_1.txt').exists()
        assert not (tmp_path / 'new_1.txt').exists()

    def test_incremental_backup(self, tmp_path: Path):
        """测试增量备份。"""
        src = tmp_path / 'src'
        dst = tmp_path / 'dst'
        manifest = tmp_path / 'manifest.json'
        src.mkdir()

        # 第一次备份
        (src / 'a.txt').write_text('hello')
        incremental_backup(src, dst, manifest)
        assert (dst / 'a.txt').exists()

        # 修改后再次备份
        (src / 'a.txt').write_text('world')
        (src / 'b.txt').write_text('new')
        incremental_backup(src, dst, manifest)
        assert (dst / 'a.txt').read_text() == 'world'
        assert (dst / 'b.txt').exists()
```

### 13.2 Mock 与集成测试

```python
"""
使用 Mock 进行集成测试。
"""
from unittest.mock import patch, MagicMock
import my_automation.tasks as tasks


class TestETLTask:
    """ETL 任务测试。"""

    @patch('my_automation.tasks.requests.get')
    def test_extract_handles_http_error(self, mock_get):
        """测试 HTTP 错误处理。"""
        mock_get.side_effect = ConnectionError('network error')
        with pytest.raises(ConnectionError):
            tasks.extract_data('2026-07-20')

    @patch('my_automation.tasks.pymysql.connect')
    def test_extract_from_db(self, mock_connect):
        """测试从数据库抽取。"""
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [
            {'id': 1, 'amount': 100},
            {'id': 2, 'amount': 200},
        ]
        mock_connect.return_value.cursor.return_value.__enter__.return_value = mock_cursor

        result = tasks.extract_from_db('2026-07-20')
        assert len(result) == 2
        assert result[0]['id'] == 1
```

### 13.3 Airflow DAG 测试

```python
"""
Airflow DAG 单元测试。
"""
import pytest
from airflow.models import DagBag


@pytest.fixture(scope='session')
def dagbag():
    """加载 DAG。"""
    return DagBag(dag_folder='dags/', include_examples=False)


def test_dag_loaded(dagbag):
    """测试 DAG 是否加载成功。"""
    assert dagbag.import_errors == {}
    assert 'etl_orders' in dagbag.dags


def test_dag_structure(dagbag):
    """测试 DAG 结构。"""
    dag = dagbag.dags['etl_orders']
    assert len(dag.tasks) == 6  # start, extract, transform, load, notify, end

    # 检查依赖关系
    extract_task = dag.get_task('extract')
    assert extract_task.upstream_task_ids == {'start'}

    transform_task = dag.get_task('transform')
    assert transform_task.upstream_task_ids == {'extract'}
```

## 14. 故障排除

### 14.1 常见异常

| 异常 | 原因 | 解决方案 |
| --- | --- | --- |
| `subprocess.CalledProcessError` | 命令返回非零 | 检查命令与 stderr |
| `subprocess.TimeoutExpired` | 命令超时 | 增加 timeout 或异步执行 |
| `FileNotFoundError` | 命令不存在 | 检查 PATH 或使用绝对路径 |
| `PermissionError` | 权限不足 | chmod 或 sudo |
| `OSError: [Errno 24] Too many open files` | 文件描述符泄露 | 检查 with 语句、增加 ulimit |
| `celery.exceptions.SoftTimeLimitExceeded` | Celery 软超时 | 优化任务或增加时限 |
| `psutil.NoSuchProcess` | 进程已退出 | 处理异常 |

### 14.2 调试技巧

```python
"""
调试自动化脚本技巧。
"""
import logging
import traceback
import sys


def debug_task(func):
    """调试装饰器。"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        logger = logging.getLogger(func.__name__)
        logger.debug(f'输入: args={args}, kwargs={kwargs}')
        try:
            result = func(*args, **kwargs)
            logger.debug(f'输出: {result}')
            return result
        except Exception as e:
            logger.error(f'异常: {e}\n{traceback.format_exc()}')
            raise
    return wrapper


import functools


def enable_asyncio_debug():
    """启用 asyncio 调试模式。"""
    import asyncio
    loop = asyncio.new_event_loop()
    loop.set_debug(True)
    loop.slow_callback_duration = 0.1  # 100ms 以上警告
    asyncio.set_event_loop(loop)
```

## 15. 习题与练习

### 15.1 综合练习：设计文件同步工具

**需求**：
- 双向同步两个目录；
- 监控文件变化实时同步；
- 冲突时保留两个版本；
- 支持忽略规则（.gitignore 风格）。

### 15.2 综合练习：实现日志分析流水线

**需求**：
- 监控 Nginx access.log；
- 解析日志并统计 PV/UV；
- 异常请求触发告警；
- 每日生成报告发送邮件。

### 15.3 综合练习：实现 CI/CD 流水线

**需求**：
- 监听 GitHub Webhook；
- 拉取代码并运行测试；
- 构建 Docker 镜像并推送；
- 部署到 K8s；
- 失败时回滚。

### 15.4 综合练习：实现 RPA 机器人

**需求**：
- 自动登录企业 ERP；
- 抓取每日销售数据；
- 填写 Excel 报表；
- 通过邮件发送给管理者。

## 16. 工程检查清单

### 16.1 上线前自检

- [ ] 是否使用 subprocess.run 而非 os.system？
- [ ] 是否避免 shell=True 防止注入？
- [ ] 任务是否设置超时？
- [ ] 关键任务是否实现重试机制？
- [ ] 是否记录结构化日志？
- [ ] 是否配置监控告警？
- [ ] 是否编写单元测试？
- [ ] 是否使用 with 上下文管理资源？
- [ ] 是否处理异常而非静默吞掉？
- [ ] 是否设置时区？
- [ ] 任务是否幂等？
- [ ] 是否使用环境变量管理密钥？
- [ ] 是否实施降级与熔断？

### 16.2 性能调优清单

- [ ] CPU 密集任务是否使用 multiprocessing？
- [ ] IO 密集任务是否使用 asyncio？
- [ ] 大文件是否分块处理？
- [ ] 是否限制并发数避免资源耗尽？
- [ ] 是否使用连接池？
- [ ] 是否避免全局可变状态？
- [ ] 是否使用批处理而非单条处理？

### 16.3 运维清单

- [ ] 是否 Docker 化部署？
- [ ] 是否使用 systemd 或 K8s 管理进程？
- [ ] 是否配置日志轮转？
- [ ] 是否实施健康检查？
- [ ] 是否设置资源限制（CPU/内存）？
- [ ] 是否准备回滚方案？
- [ ] 是否定期演练故障恢复？

## 17. 延伸阅读

### 17.1 必读书籍

1. **Al Sweigart**. *Automate the Boring Stuff with Python*. 2nd Edition. No Starch Press, 2019. ISBN 978-1593279929.
2. **Luciano Ramalho**. *Fluent Python*. 2nd Edition. O'Reilly, 2022. ISBN 978-1492056355.
3. **Caleb Hattingh**. *Using Async in Python*. O'Reilly, 2020.
4. **Marcin Moskwa**. *Celery: Distributed Task Queue: Fast and Reliable Asynchronous Processing*. Apress, 2023.
5. **Bas Harenslak, Julian de Ruiter**. *Data Pipelines with Apache Airflow*. O'Reilly, 2021.

### 17.2 必读论文

1. **Garcia-Molina, H., Salem, K.** "Sagas." *SIGMOD 1987*. 事务工作流奠基论文。
2. **Dean, J., Ghemawat, S.** "MapReduce: Simplified Data Processing on Large Clusters." *OSDI 2004*.
3. **Zaharia, M. et al.** "Apache Spark: A Unified Engine for Big Data Processing." *Communications of the ACM* 2016.

### 17.3 开源项目

- **Airflow**: https://github.com/apache/airflow
- **Celery**: https://github.com/celery/celery
- **Prefect**: https://github.com/PrefectHQ/prefect
- **Dagster**: https://github.com/dagster-io/dagster
- **APScheduler**: https://github.com/agronholm/apscheduler
- **watchdog**: https://github.com/gorakhargosh/watchdog
- **psutil**: https://github.com/giampaolo/psutil
- **Playwright**: https://github.com/microsoft/playwright
- **Click**: https://github.com/pallets/click
- **Typer**: https://github.com/tiangolo/typer

### 17.4 在线资源

- **Apache Airflow 官方教程**: https://airflow.apache.org/docs/apache-airflow/stable/tutorial/index.html
- **Prefect 官方文档**: https://docs.prefect.io/
- **Celery 官方文档**: https://docs.celeryq.dev/
- **Real Python 自动化系列**: https://realpython.com/tutorials/automation/
- **Awesome Python Automation**: https://github.com/vinta/awesome-python

## 18. Python 版本兼容性矩阵

| Python 版本 | asyncio | pathlib | subprocess | concurrent.futures | typing |
| --- | --- | --- | --- | --- | --- |
| 3.9 | 完整 | 完整 | 完整 | 完整 | Annotated 等 |
| 3.10 | TaskGroup 改进 | 完整 | 改进 | 完整 | ParamSpec |
| 3.11 | TaskGroup 正式 | walk() | 改进 | 完整 | Self/Self 类型 |
| 3.12 | 性能优化 | 完整 | 改进 | 改进 | TypeAlias |
| 3.13 | 自由线程实验 | 完整 | 改进 | 改进 | 改进 |
| 3.14 (新) | 改进 | 完整 | 增强超时 | 改进 | 改进 |

## 19. 词汇表

| 术语 | 英文 | 含义 |
| --- | --- | --- |
| DAG | Directed Acyclic Graph | 有向无环图 |
| ETL | Extract, Transform, Load | 数据抽取转换加载 |
| RPA | Robotic Process Automation | 流程自动化机器人 |
| DAG | DAG | 工作流依赖图 |
| Worker | Worker | 任务执行进程 |
| Broker | Broker | 消息中间件（Redis/RabbitMQ） |
| Beat | Beat | Celery 定时调度器 |
| Idempotent | Idempotent | 多次执行结果一致 |
| Saga | Saga | 长事务分拆模式 |
| Cron | Cron | Unix 定时任务格式 |
| SLA | Service Level Agreement | 服务水平协议 |
| SLO | Service Level Objective | 服务水平目标 |
| Preflight | Preflight | 预检任务 |
| Backfill | Backfill | 历史数据回填 |

## 20. 总结与下一步

本章系统介绍了 Python 自动化工程实践：

1. **理论基础**：任务调度、DAG、幂等性、并发模型；
2. **工具选型**：pathlib、subprocess、APScheduler、Celery、Airflow、Prefect、Dagster；
3. **工程实践**：日志、重试、监控、Docker、K8s；
4. **案例研究**：Netflix、Airbnb、Dropbox、YouTube、Instagram、Uber；
5. **测试与运维**：单元测试、Mock、DAG 测试、上线检查清单。

### 20.1 下一步学习建议

- **进阶 Airflow**：学习自定义 Operator、Sensor、Hook；
- **云原生自动化**：K8s Operator、Argo Workflows、Tekton；
- **AI 自动化**：LLM 调用编排、Agent 框架（LangGraph、CrewAI）；
- **可观测性**：OpenTelemetry、Jaeger、Loki；
- **DataOps**：dbt + Airflow + Great Expectations；
- **MLOps**：MLflow、Kubeflow、Vertex AI Pipelines。

### 20.2 FANDEX 学习路径

继续学习：
- `python/Python与Web爬虫`：构建数据采集流水线；
- `python/Python与CLI`：编写可配置的命令行工具；
- `python/Python与测试`：为自动化脚本编写测试；
- `python/Python与日志`：结构化日志与审计；
- `python/Python与配置管理`：环境变量与配置文件管理。

---

> 自动化的最高境界是「无感知」——系统在用户察觉问题之前自动修复。这要求工程师不仅编写脚本，更要思考可观测性、容错性与可恢复性。让机器做重复的事，让人专注于创造价值。
