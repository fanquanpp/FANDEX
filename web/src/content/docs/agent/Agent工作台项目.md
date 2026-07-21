---
title: 'Agent工作台项目 — 可复用工作台包'
description: '将七种工作台表面打包为可复用的drop-in目录，实现一键安装、版本控制和跨项目复用'
module: agent
difficulty: intermediate
tags:
  - 工作台包
  - 可复用
  - 安装器
  - 版本控制
related:
  - agent/A2A协议深入
  - agent/Agent工作台为何模型失败
  - agent/Agent经济体与声誉
  - agent/Agent可观测性平台
prerequisites:
  - agent/概述与架构
---

# Agent工作台项目 — 可复用工作台包

> 迷你轨道以一个你可以放入任何仓库的包结束。十一课的表面压缩到一个你可以 `cp -r` 并让Agent第二天早上可靠工作的目录。项目是本课程交易的工件。

**类型：** 构建
**语言：** Python（标准库）
**前置条件：** Phase 14 · 31到14 · 41
**时间：** ~75分钟

## 学习目标

- 将七种工作台表面打包为一个drop-in目录。
- 固定Schema、脚本和模板，使新仓库获得已知良好基线。
- 添加一个幂等铺设包的单命令安装器脚本。
- 决定什么留在包内，什么留在外面，为每个切割辩护。

## 问题所在

存在于Google Doc、聊天历史和三个半记忆脚本中的工作台是每季度重建的工作台。修复是版本化包：一个带有表面、Schema、脚本和一键安装器的仓库或目录。

## 核心概念

### 包布局

```
agent-workbench-pack/
├── AGENTS.md
├── docs/
│   ├── agent-rules.md
│   ├── reliability-policy.md
│   ├── handoff-protocol.md
│   └── reviewer-rubric.md
├── schemas/
│   ├── agent_state.schema.json
│   ├── task_board.schema.json
│   └── scope_contract.schema.json
├── scripts/
│   ├── init_agent.py
│   ├── run_with_feedback.py
│   ├── verify_agent.py
│   └── generate_handoff.py
├── bin/
│   └── install.sh
└── README.md
```

### 什么留下，什么去掉

留下：表面Schema（它们是契约）、四个脚本（它们是运行时）、四个文档（它们是规则和评分标准）。

去掉：项目特定任务（任务属于目标仓库的板，不是包中）、供应商SDK调用（包是框架无关的）、入职散文（包存在于团队现有入职旁边，不是内部）。

### 安装器

一个简短的 `bin/install.sh`：拒绝在没有 `--force` 的情况下覆盖现有包安装、将包复制到目标仓库、如果存在 `.github/workflows/` 则连接CI、打印下一步。

### 版本控制

包携带 `VERSION` 文件。需要迁移的Schema升级和脚本变更提升主版本。仅文档变更提升补丁。目标仓库的 `agent_state.json` 记录它初始化时对应的包版本。

### 生产模式

- **`VERSION` 是契约，不是营销。** 主版本升级需要状态迁移。次版本升级需要检查器重跑。补丁升级仅文档。安装器在每次安装时写入 `.workbench-version`。
- **跨工具分发的单一来源。** Nx发布一个 `nx ai-setup`，从单一配置铺设 `AGENTS.md`、`CLAUDE.md`、`.cursor/rules/`、`.github/copilot-instructions.md` 和MCP服务器。包应该做同样的事；安装器发出符号链接，使单一真相来源扇出到每个编码Agent。
- **`uninstall.sh` 在非平凡状态上拒绝。** 卸载包绝不能删除用户的 `agent_state.json`、`task_board.json` 或 `outputs/`。卸载器移除Schema、脚本、文档和 `AGENTS.md`，如果状态文件有任何未提交变更则拒绝继续。
- **SkillKit风格分发。** 包作为SkillKit技能发布：`skillkit install agent-workbench-pack` 从单一来源跨32个AI Agent铺设它。

## 实践

`code/main.py`将包组装到 `outputs/agent-workbench-pack/`，用迷你轨道之前课程的Schema和脚本以及你已经写的文档作为种子。

## 交付

`outputs/skill-workbench-pack.md`生成项目调整的包：规则锐化到团队历史、范围glob匹配仓库、评分标准维度扩展一个领域特定条目。

## 练习

1. 决定哪个可选的第五文档值得提升到规范包中。辩护切割。
2. 将安装器重写为带 `--dry-run` 标志的Python。比较与bash的人体工程学。
3. 添加 `bin/uninstall.sh`，安全移除包并在状态文件有非平凡历史时拒绝。什么算非平凡？
4. 添加 `lint_pack.py`，在包从 `VERSION` 漂移时失败。将它连接到包自己仓库的CI。
5. 编写从手工作台到这个包的迁移手册。最小化停机时间的操作顺序是什么？

## 关键术语

| 术语       | 人们怎么说   | 实际含义                                      |
| ---------- | ------------ | --------------------------------------------- |
| 工作台包   | "入门套件"   | 携带所有七种表面的版本化目录                  |
| 安装器     | "设置脚本"   | 幂等铺设包的 `bin/install.sh`                 |
| 包版本     | "VERSION"    | Schema/脚本变更的主版本升级，仅文档的补丁     |
| Drop-in包  | "cp -r即可"  | 包在第一天无需每仓库自定义即可工作            |
| 可分叉模板 | "GitHub模板" | GitHub的"Use this template"可以克隆的公共仓库 |

## 延伸阅读

- [SkillKit](https://github.com/rohitg00/skillkit) — 跨32个AI Agent安装此技能
- [Nx Blog, Teach Your AI Agent How to Work in a Monorepo](https://nx.dev/blog/nx-ai-agent-skills) — 跨六个工具的单一来源生成器
- [agents.md — the open spec](https://agents.md/) — 你的包路由器必须实现的
- [Augment Code, A good AGENTS.md is a model upgrade](https://www.augmentcode.com/blog/how-to-write-good-agents-dot-md-files)
