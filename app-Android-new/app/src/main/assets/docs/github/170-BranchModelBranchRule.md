---
order: 170
title: 分支模型与分支保护规则
module: 'github'
category: 工具链
difficulty: intermediate
description: 分支模型设计（GitHub Flow / Git Flow）、保护规则配置与强制策略。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'github/150-CollaborationDevelopmentStandard'
  - 'github/160-READMEFile'
  - 'github/070-GitignoreConfig'
  - 'github/260-OpenSourceLicense'
prerequisites:
  - 'github/010-GitHubOverview'
---


## 0. 从一个生活场景说起：主干道与支路

想象一座城市：**主干道（main 分支）** 必须时刻畅通，任何驶入主干道的车辆（代码）都要经过**收费站（Code Review）** 和**检查站（CI 状态检查）**；**支路（feature 分支）** 是施工区，工人们（开发者）在这里安心施工；**匝道（Pull Request）** 是支路汇入主干道的入口，不合格的车辆进不了主干道；**交警（分支保护规则）** 负责强制执行这一切——禁止直接从支路冲上主干道，违者拦下。

这个"交通模型"就是**分支模型 + 分支保护规则**：先用**模型**规划"道路怎么修"，再用**保护规则**确保"车辆不能乱闯"。本篇采用**模型驱动**的结构，先讲两种主流分支模型，再讲如何用保护规则把模型强制落地。

## 1. 原理讲解：为什么要分分支

### 1.1 不分分支的代价

如果 10 个人都直接往 `main` 推送：冲突频繁、代码不可审查、main 随时处于"半成品"状态——没人敢说"main 现在可以发布"。**分支的本质是把"开发中"和"可发布"两种状态隔离在不同的"车道"上**。

### 1.2 分支模型的角色

| 概念 | 生活类比 | 作用 |
| :--- | :--- | :--- |
| main | 主干道 | 始终可部署的稳定分支 |
| feature/* | 施工支路 | 功能开发，完成后经 PR 并入主线 |
| release/* | 试运行线路 | 发布前的测试与修复 |
| hotfix/* | 应急抢险通道 | 线上紧急缺陷修复 |
| develop | 汇集线路 | 集成所有已完成功能的开发分支 |

## 2. 模型一：GitHub Flow（轻量，推荐起步）

### 2.1 核心思想

GitHub 官方推荐的模型，**只有一个长期分支 `main`**，且始终可部署：

1. 从 `main` 创建功能分支 → 2. 在功能分支开发并提交 → 3. 推送到远程 → 4. 发起 PR 审查 → 5. 合并回 `main` → 6. 合并后立即部署。

### 2.2 适用场景

持续交付的 Web 服务、中小团队、快速迭代项目。优点是简单易学、部署频率高；缺点是不适合需要长期维护多个版本的项目。

### 2.3 GitHub Flow 实操

```bash
# 1. 确保本地 main 最新
git checkout main
git pull origin main

# 2. 创建并切换到功能分支
git checkout -b feature/add-login

# 3. 开发、提交、推送
git add .
git commit -m "feat: add login"
git push -u origin feature/add-login

# 4. 在 GitHub 上创建 PR，审查合并
# 5. 合并后清理本地分支
git checkout main
git pull origin main
git branch -d feature/add-login
```

## 3. 模型二：Git Flow（完整，适合版本发布）

### 3.1 核心分支

| 分支 | 说明 |
| :--- | :--- |
| `main` | 生产环境稳定代码，只接受 release/hotfix 合并 |
| `develop` | 开发集成分支，feature 合并到这里 |
| `feature/*` | 从 develop 创建，完成后合并回 develop |
| `release/*` | 从 develop 创建，用于发布前测试，完成后合并回 main 和 develop |
| `hotfix/*` | 从 main 创建，紧急修复生产问题，完成后合并回 main 和 develop |

### 3.2 工作流程

1. 从 `develop` 创建 `feature/*` → 2. 开发完成合并回 `develop` → 3. 积累足够功能后从 `develop` 切 `release/*` → 4. 在 release 分支测试修复 → 5. 合并回 `main` 并打 tag → 6. 同时合并回 `develop` → 7. 线上紧急问题从 `main` 切 `hotfix/*` 修复。

### 3.3 Git Flow 实操

```bash
# 从 develop 创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/add-login

# 开发完成后合并回 develop
git checkout develop
git merge feature/add-login

# 准备发布
git checkout -b release/v1.0.0
# 测试修复后合并到 main 并打标签
git checkout main
git merge release/v1.0.0
git tag v1.0.0
git checkout develop
git merge release/v1.0.0

# 线上紧急热修复
git checkout main
git checkout -b hotfix/security-patch
# 修复后合并回 main 和 develop，打 tag v1.0.1
```

## 4. 模型对比：怎么选

| 特性 | GitHub Flow | Git Flow |
| :--- | :--- | :--- |
| 长期分支数量 | 1（main） | 2（main + develop） |
| 分支复杂度 | 低 | 高 |
| 学习成本 | 低 | 高 |
| 部署频率 | 高（持续部署） | 较低（版本节奏发布） |
| 多版本并行维护 | 困难 | 支持（release/hotfix） |
| 适用项目 | Web 服务、快速迭代 | 有明确发布周期的软件 |

**选择建议**：团队新起步、项目持续部署 → GitHub Flow；产品有版本节奏、需长期维护多个版本 → Git Flow。

### 4.1 其他分支策略一览

除两大主流模型外，还有两种常见策略值得了解：

| 策略 | 核心思想 | 适用场景 |
| :--- | :--- | :--- |
| Trunk-Based（主干开发） | 所有人都直接开发 main，用特性开关（feature flag）控制上线 | 高频发布、大规模团队协作 |
| Release Flow（发布流） | 在 GitHub Flow 基础上增加 release 分支管理发布周期 | 有明确发布节奏且需快速迭代的产品 |

- **Trunk-Based** 优点是无合并负担、部署频繁；缺点是依赖完善的测试与特性开关体系，不适合初学者团队。
- **Release Flow** 是 GitHub 官方在 GitHub Flow 之外推荐的另一种模式：功能开发合入 main，需要发版时从 main 切 release 分支做版本化发布。

## 5. 分支保护规则：让模型强制落地

光有模型不执行等于没有。**分支保护规则（branch protection rules）** 在 GitHub 上强制执行：

路径：仓库 **Settings → Branches → Branch protection rules → Add rule**。

### 5.1 常用规则项

| 规则 | 作用 |
| :--- | :--- |
| Branch name pattern | 匹配要保护的分支（如 `main`、`release/*`，支持 fnmatch 通配符） |
| Require a pull request before merging | 禁止直接推送，所有改动必须走 PR |
| Require approvals | 至少 N 人批准才能合并 |
| Require status checks to pass | 所有 CI 检查通过才能合并 |
| Require branches to be up to date | 合并前必须与基础分支同步 |
| Require review from Code Owners | 需要 CODEOWNERS 指定的人审查 |
| Restrict who can push | 限制谁可以直接推送 |
| Allow force pushes / deletions | 是否允许强推与删除（生产分支建议禁用） |

### 5.2 推荐配置模板

**main 分支（最严格）**：

- 必须 PR 合并 + 至少 2 人批准 + 所有状态检查通过 + 禁止强推 + 禁止删除 + 对管理员同样生效。

**develop 分支（中等）**：

- 必须 PR 合并 + 至少 1 人批准 + 状态检查通过。

**feature/* 分支（宽松）**：

- 不设保护，开发者自由操作，合并后自动删除。

> 注意：状态检查只能选**已运行过至少一次**的检查，否则下拉框里看不到该检查项；GitHub 官方也提醒，各工作流中 job 名称必须唯一，否则状态检查结果会歧义、卡住合并。

### 5.3 其他保护机制：Rulesets 与 CODEOWNERS

- **Rulesets（规则集）**：官方推出的新一代分支治理方案，正在逐步取代传统的单条 branch protection rule。与传统保护规则相比：

| 维度 | Branch protection（传统） | Rulesets（规则集） |
| :--- | :--- | :--- |
| 作用范围 | 逐分支单独配置 | 按模式（`main`、`release/*`）批量匹配，可同时覆盖分支与标签 |
| 管理层级 | 仅仓库级 | 仓库级与**组织级**（一次下发到多个仓库） |
| 规则叠加 | 多条规则间优先级模糊 | 多个规则集可叠加生效，状态页可查看每条规则的命中情况 |
| 绕过机制 | "对管理员生效"等简单开关 | 精细的 bypass 名单（指定角色/团队/App 在何种场景下绕过） |
| 额外能力 | — | 标签规则（限制标签名/格式）、推送规则（限制文件路径与文件大小）、合并队列、必需署名提交等 |

  入口：仓库 **Settings → Rules → Rulesets → New branch ruleset**（组织级在组织设置的同名菜单）。老项目不必急于迁移，但新项目与多仓库治理场景，官方推荐直接用规则集。
- **CODEOWNERS**：在 `.github/CODEOWNERS` 文件（或仓库根目录、`docs/` 下）按路径指定负责人，改动该路径的 PR 自动请求对应负责人审查，配合保护规则中的 "Require review from Code Owners" 强制生效（详见 github/190-CODEOWNERS）：

```text
# .github/CODEOWNERS
# 整个仓库的默认所有者
* @maintainer
# src/ 目录需要前端团队审查
/src/ @frontend-team
# 安全相关文件必须安全负责人审查
SECURITY.md @security-lead
```

### 5.4 合并策略：与保护规则配套的最后一环

分支保护管"能不能合"，合并策略管"怎么合"，两者配套使用：

| 策略 | 历史形态 | 使用建议 |
| :--- | :--- | :--- |
| Create a merge commit | 保留全部提交 + 一个合并提交 | 需要保留完整开发过程 |
| Squash and merge | 压缩为一个提交 | 功能分支提交琐碎时最常用 |
| Rebase and merge | 线性历史，无合并提交 | 追求干净线性的提交图 |

在仓库 **Settings → General → Merge button** 中可以只开放允许的策略（例如团队统一只用 Squash）。配合保护规则中的 "Require branches to be up to date"，能保证合入 main 的代码永远基于最新主干。

## 6. 常见错误与对策

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| :--- | :--- | :--- | :--- |
| 直接推送 main 被拒 | `GH006: Protected branch update failed`（推送被拒） | main 开启了"必须 PR 合并"保护 | 创建功能分支 → 发起 PR → 审查通过后合并 |
| 状态检查名称不匹配 | PR 永远等不到绿灯 | Actions job 改名后保护规则仍是旧名称 | 在 PR 页面查看实际检查名称，更新保护规则 |
| 强制推送被禁止 | `You're not allowed to force push` | 保护规则禁用了 force push | 遵守规则走 PR 流程；确需强推时联系管理员评估后放开 |
| 无法批准自己的 PR | GitHub 界面无 Approve 按钮 | GitHub 不允许作者自审自批 | 邀请团队成员审查；配置 CODEOWNERS 指定审查者 |
| 保护规则不生效 | 管理员仍能绕过 | 未勾选 "Include administrators" | 在规则中勾选"对管理员同样生效" |
| 找不到所需检查项 | 状态检查下拉列表没有目标项 | 该检查从未运行过 | 先推送代码让检查运行一次，之后即可勾选为 required |

## 7. 一句话记忆

**分支模型决定"路怎么修"（GitHub Flow 轻、Git Flow 全），分支保护决定"车怎么管"（PR 是收费站，CI 是检查站，强推与直推都被拦下），模型 + 规则共同保证 main 始终安全可用。**

### 延伸阅读

- 分支命令操作速查（创建/切换/删除/重命名），见 037-045 篇 Git 模块文档。
- 团队协作规范（提交信息/PR 模板/审查清单），见 005 篇《协作开发规范》。
- 代码所有者自动分配审查，见 025 篇《CODEOWNERS》。
