---
order: 500
title: gh workflow 工作流命令速查手册
module: 'github'
category: 工具链
difficulty: beginner
description: '以"运行一个 workflow 的完整生命周期"为主线，讲解 gh workflow 系列命令，涵盖查看、手动触发、参数传递、启用与禁用，配以原理讲解、错误对策。'
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---


## 开篇：把 Workflow 想成工厂自动化流水线

想象一家饮料工厂。装瓶、贴标、装箱、码垛，每个环节都有机器在自动运转：原料一到（代码提交），传送带就启动，产品按顺序流向下一站，质检不合格的会被单独挑出来。这就是**自动化流水线**。

GitHub Actions 里的 **Workflow（工作流）** 就是这条流水线：它是一份 YAML 配置文件，里面写好了"什么事件发生时，按什么顺序跑哪些任务"。比如"每次有人提交代码，就自动跑测试、构建、发布"。

`gh workflow` 系列命令，就是给你一套**流水线控制台**：不开网页，就能在终端里查看流水线清单、手动按下启动按钮、给流水线传入原料参数、临时拉闸停线。

先明确一个概念：`gh workflow` 管理的是"流水线本身"（配置文件），而真正跑起来的"一批产品"叫做 **Run（运行实例）**，对应 `gh run` 系列命令。两者配合使用。

---

## 生命周期总览：运行一个 Workflow 的 5 个阶段

按一条流水线从"认识"到"退役"的生命周期，我们把 `gh workflow` 命令串起来：

| 阶段 | 你要做什么 | 对应命令 |
| --- | --- | --- |
| 阶段 1：认识流水线 | 看看仓库里有哪几条流水线、状态如何 | `gh workflow list` |
| 阶段 2：读懂流水线 | 查看某条流水线的定义与最近运行情况 | `gh workflow view` |
| 阶段 3：手动启动 | 按下启动按钮，传入选料参数 | `gh workflow run` |
| 阶段 4：跟踪运行 | 查看运行列表与单次运行的进度、日志 | `gh run list` / `gh run view` |
| 阶段 5：启停管理 | 临时禁用、恢复启用某条流水线 | `gh workflow disable` / `gh workflow enable` |

下面按这 5 个阶段逐步展开。**前提**：已 `gh auth login`，且仓库 `.github/workflows/` 目录下存在 workflow 文件（可参考《GitHubActionsCICD》《ActionsTrigger》文档）。

---

## 原理先讲清：Workflow 是被什么"启动"的

一条流水线要能被启动，必须回答两个问题：**谁来触发？怎么传参？**

- **触发方式（triggers）**：在 workflow 文件的 `on:` 字段里声明。常见的有 `push`（提交时）、`pull_request`（PR 时）、`schedule`（定时）、`workflow_dispatch`（手动触发）。**注意：`gh workflow run` 只能启动声明了 `workflow_dispatch` 的 workflow**——就像工厂只有装了"手动启动按钮"的产线才能被人工开动。

- **手动传参（inputs）**：在 `on.workflow_dispatch.inputs` 里声明参数，比如"发布环境（production/staging）""版本号"。声明之后，`gh workflow run` 才能通过 `-f` / `--json` 传入。

一个支持手动触发的最小示例（`deploy.yml`）：

```yaml
name: deploy                     # 流水线名称（可读名称，也可用文件名定位）
on:
  workflow_dispatch:             # 允许手动触发
    inputs:
      environment:               # 声明一个输入参数
        description: 部署环境
        required: true
        default: staging
      version:
        description: 发布版本
        required: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo "部署 ${{ github.event.inputs.version }} 到 ${{ github.event.inputs.environment }}"
```

---

## 阶段 1：认识流水线（gh workflow list）

```bash
# 列出仓库中所有 workflow
gh workflow list

# 只查看已启用的流水线
gh workflow list --all=false   # 等价于 gh workflow list --active

# 在另一个仓库中查看
gh workflow list -R owner/repo
```

典型输出：

```text
NAME                          STATE    ID
deploy                        active   254321
test                          active   254322
nightly-report                disabled 254323
```

- `active`：已启用，事件到来会正常触发；
- `disabled`：已被禁用（可能被 `gh workflow disable` 或页面操作禁用）。

> 提示：`gh workflow list` 默认只显示**启用中**的 workflow，加 `--all` 才显示全部。

---

## 阶段 2：读懂流水线（gh workflow view）

想确认某条流水线的定义、最近几次运行是否健康：

```bash
# 查看某条 workflow 的摘要（按文件名/ID/名称定位）
gh workflow view deploy.yml

# 用数字 ID 定位（从 list 输出中取得）
gh workflow view 254321

# 直接看它的 YAML 定义内容
gh workflow view deploy.yml --yaml

# 查看指定分支/标签上的版本
gh workflow view deploy.yml --ref main

# 在浏览器中打开该 workflow 页面
gh workflow view deploy.yml --web

# 不带参数时，gh 会弹出列表让你交互选择
gh workflow view
```

`--yaml` 的输出就是仓库里的原始配置文件，适合快速核对"这条流水线到底配了什么"。

---

## 阶段 3：手动启动（gh workflow run）

这是最常用、也最容易出错的命令。它做的事情是：向 GitHub 发送一个 `workflow_dispatch` 事件，让流水线跑起来。

### 3.1 基础启动

```bash
# 按文件名启动（会使用远端默认分支上的 workflow 版本）
gh workflow run deploy.yml

# 带参数与分支指定
gh workflow run deploy.yml --ref my-branch
```

启动成功后，gh 会返回本次运行的信息；之后可用 `gh run watch` 实时观察进度，或用 `gh run list` 查看。

### 3.2 传入输入参数

```bash
# 用 -f 传字符串参数（key=value）
gh workflow run deploy.yml -f environment=production -f version=1.2.3

# 用 -F 传参数（值支持 @文件 语法，从文件读取）
gh workflow run deploy.yml -F config=@config.json

# 用标准输入传 JSON 参数（适合脚本自动化）
echo '{"environment":"production","version":"1.2.3"}' | gh workflow run deploy.yml --json
```

### 3.3 注意事项

- 目标 workflow 必须声明了 `on.workflow_dispatch`，否则会报错；
- 参数名必须与 `inputs` 中声明的键一致；
- 不传 `--ref` 时使用默认分支上的 workflow 文件版本。

---

## 阶段 4：跟踪运行（gh run list / view / watch）

流水线启动后，要看它跑到哪一步了。`gh run` 系列命令是"监控摄像头"：

```bash
# 查看最近运行记录
gh run list

# 只查看某条 workflow 的运行记录
gh run list --workflow deploy.yml

# 查看某次运行的详细状态（job 列表、结论）
gh run view 123456789

# 实时跟随某次运行，直到结束（按 Ctrl+C 可退出跟随）
gh run watch 123456789

# 直接看失败的步骤日志
gh run view 123456789 --log-failed
```

典型输出（`gh run list`）：

```text
STATUS  CONCLUSION TITLE           WORKFLOW   AGE
completed success   部署到 production deploy     3m ago
in_progress  -     部署到 production deploy     12s ago
completed failure   nightly-report nightly    1d ago
```

---

## 阶段 5：启停管理（gh workflow enable / disable）

```bash
# 临时禁用一条流水线（拉闸停线，事件到来也不会启动）
gh workflow disable deploy.yml

# 恢复启用
gh workflow enable deploy.yml

# 在其他仓库操作
gh workflow disable deploy.yml -R owner/repo
```

典型应用场景：

- 深夜发现发布流水线配置有问题，先 `disable` 止血；
- 暂停不重要的定时任务（如每日报告），降低资源消耗；
- 排查"为什么自动部署没触发"时，检查是否被 `disable`。

---

## 完整生命周期串联：一次实战演练

```bash
# 1. 认识：仓库里有哪几条流水线
gh workflow list

# 2. 读懂：查看 deploy 流水线的定义
gh workflow view deploy.yml --yaml

# 3. 启动：手动触发，传入环境与版本参数
gh workflow run deploy.yml -f environment=production -f version=2.1.0

# 4. 跟踪：列出最近运行，找到刚启动的那条
gh run list --workflow deploy.yml

# 5. 监控：实时跟随运行进度（替换为实际 run ID）
gh run watch 987654321

# 6. 维护：发现问题后临时禁用流水线
gh workflow disable deploy.yml

# 7. 恢复：修复后重新启用
gh workflow enable deploy.yml
```

---

## 常见错误与对策

| 新手常见错误 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 对无 workflow_dispatch 的流水线执行 run | `workflow does not have "workflow_dispatch" trigger` | 目标 workflow 未声明手动触发 | 在 workflow 文件 `on:` 中增加 `workflow_dispatch:` 并提交 |
| 传入未声明的参数 | 运行记录中参数缺失或提示无法找到输入 | 参数名与 `inputs` 声明不一致 | 核对 `on.workflow_dispatch.inputs` 中的键名 |
| 传参时 shell 特殊字符出错 | 参数值被截断或报语法错误 | 值包含空格、`&` 等未加引号 | 用引号包裹：`-f msg="hello world"` |
| 在非仓库目录执行 | `could not determine current repo` | gh 无法确定当前仓库 | `cd` 进仓库目录，或加 `-R owner/repo` |
| 找不到 workflow | `no workflows found in repository` | 仓库没有 `.github/workflows/` 下有效文件 | 确认 YAML 文件名以 `.yml/.yaml` 结尾且语法正确 |
| 启动后看不到运行 | `gh run list` 无记录 | 刚触发尚未注册，或查看的 workflow 不对 | 稍等几秒重试，用 `--workflow <name>` 精确过滤 |
| 误禁用导致不触发 | 明明 push 了代码却没跑 | 流水线处于 disabled 状态 | `gh workflow list` 检查状态，用 `enable` 恢复 |

---

## 一句话记忆

**Workflow 是流水线配置文件，`gh workflow run` 是启动按钮（只对声明了 workflow_dispatch 的流水线有效），`list/view` 负责检查，`disable/enable` 负责拉闸与送电。**
