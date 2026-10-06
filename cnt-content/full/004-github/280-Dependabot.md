---
order: 310
title: Dependabot 实战：三个职责、一份配置、一条自动合并流水线
module: 'github'
category: 工具链
difficulty: intermediate
description: 从「告警响了几个月，依赖却没人升级」这个真实问题切入，动手给 pnpm monorepo 写好 dependabot.yml，讲清 Alerts、Security Updates、Version Updates 三个职责的区别，最后配一条「CI 通过即合并」的自动化流水线。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'github/270-DependencySecurityOptions'
  - 'github/290-SecretScanning'
  - 'github/380-ActionsTrigger'
prerequisites:
  - 'github/270-DependencySecurityOptions'
---

## 前置知识

- 已按 [依赖安全选项](/github/270-DependencySecurityOptions) 启用 Dependabot alerts 与 security updates；
- 知道工作流文件放在 `.github/workflows/`（见 [GitHub Actions 与 CI/CD](/github/370-GitHubActionsCICD)）。

## 学习目标

读完全文你将能够：

1. 说清 Dependabot 三个职责（告警、安全更新、版本更新）各自的触发条件和控制方式；
2. 为 pnpm monorepo 写一份 `dependabot.yml`，让升级 PR 遵守 Conventional Commits；
3. 用 `groups` 把升级 PR 数量压到团队可以承受的水平；
4. 搭一条「 Dependabot PR 过了 CI 就自动合并」的工作流，并知道它会被什么卡住。

## 1. 问题：告警响了，没人动手

一个常见的真实处境：你启用了 Dependabot alerts，Security 标签页里躺着三条 High 告警，躺了三个月。复盘原因很朴素——**发现漏洞是自动的，修漏洞是手动的，而手动的事没人排期**。

Dependabot 的价值就是把「修」也自动化掉。它是 GitHub 的官方机器人（`dependabot[bot]`），三个职责互相独立：

| 职责 | 触发条件 | 动作 | 控制方式 |
| :--- | :--- | :--- | :--- |
| Dependabot Alerts | 依赖被披露漏洞 | Security 页生成告警 | 仓库设置开关，不能用配置文件 |
| Security Updates | 有告警且存在安全版本 | 自动开修复 PR | 仓库设置开关 |
| Version Updates | 按 schedule 定期检查 | 自动开升级 PR | **必须写 `.github/dependabot.yml`** |

先记住这个关键区别：**`dependabot.yml` 只控制版本更新**（个别选项也会影响安全更新 PR 的样式）。很多人配了文件发现告警没变化，原因就在这——告警归设置页管。

## 2. 动手：给 pnpm monorepo 写 dependabot.yml

FANDEX 这类 pnpm monorepo 的特点是：一个 `pnpm-lock.yaml` 锁住多个 package 目录。Dependabot 的 npm 生态支持 pnpm 锁定文件，monorepo 用 `directories` 通配多个目录。

在 `.github/dependabot.yml` 写入：

```yaml
version: 2
updates:
  # 根目录依赖与锁定文件
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'monday'
      timezone: 'Asia/Shanghai'
    directories:
      - '/packages/*'
      - '/apps/*'
    open-pull-requests-limit: 5
    labels:
      - 'dependencies'
    commit-message:
      prefix: 'chore'
      include: 'scope'

  # 工作流文件里的 action 版本也要保持最新
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
```

提交这个文件会立即触发一次检查，之后每周一跑。开出的 PR 长这样：`chore(deps): Bump vite from 6.x to 7.x`，正文列出变更的锁定文件与 release notes，并且会正常触发你的 CI。

`commit-message` 里的 `prefix: 'chore'` 不是可有可无的装饰：FANDEX 这类遵守 Conventional Commits 的仓库，用它让机器人 PR 的提交信息和人类提交保持同一套规范，changelog 工具才不会把依赖升级漏掉。

## 3. 讲原理：三个职责各自怎么工作

**Alerts**：依赖图谱扫描清单和锁定文件，与 GitHub Advisory Database 交叉比对；版本落在漏洞影响范围内就生成告警。触发时机有三种：新漏洞披露、已有公告更新（严重性或影响范围变化）、图谱变化引入新脆弱依赖。每条告警给出 CVSS 评分、传播路径和修复版本。

**Security Updates**：有告警且存在安全版本时，自动开 PR 把依赖升到修复版本，只做这一件事——不做多余的版本跳跃。没有安全版本就不开 PR，这时需要你手动升级或换包。它会读取 `dependabot.yml` 里的 `reviewers`、`labels`、`groups` 来修饰 PR。

**Version Updates**：不看漏洞库，看 SemVer。按 schedule 周期性地把每个依赖的最新版本和锁定版本比对，有新版本就开 PR。频率怎么选：

| interval | 适用场景 |
| :--- | :--- |
| `daily` | 活跃开发、安全敏感项目 |
| `weekly` | 大多数项目（推荐默认） |
| `monthly` | 维护模式项目 |

`package-ecosystem` 常用取值：`npm`（含 pnpm/yarn）、`pip`、`maven`、`gradle`、`gomod`、`cargo`、`nuget`、`docker`、`github-actions`。排查「为什么没开 PR」去 Insights → Dependency graph → Dependabot 看作业日志。

## 4. 进阶：分组、忽略、自动合并

### 4.1 分组：把 20 个小 PR 变成 2 个

依赖一多，每周 20 个升级 PR 会淹没通知。用 `groups` 合并：

```yaml
    groups:
      minor-and-patch:
        applies-to: version-updates
        update-types:
          - 'minor'
          - 'patch'
      dev-tooling:
        patterns:
          - 'eslint*'
          - 'vitest*'
          - 'typescript'
```

策略上留一个口子：minor/patch 打包合并，major 保持单独 PR（破坏性变更值得单独审）。

### 4.2 忽略：对大版本说「先不」

```yaml
    ignore:
      - dependency-name: 'webpack'
        update-types: ['version-update:semver-major']
```

### 4.3 自动合并：CI 过了就让机器人 PR 自己走完

```yaml
# .github/workflows/auto-merge.yml
name: Auto Merge Dependabot PRs
on: pull_request

permissions:
  contents: write
  pull-requests: write

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    if: ${{ github.actor == 'dependabot[bot]' }}
    steps:
      - name: 查看 PR 元数据
        id: metadata
        uses: dependabot/fetch-metadata@v2

      - name: minor/patch 更新启用自动合并
        if: |
          contains(steps.metadata.outputs.update-type, 'semver-minor') ||
          contains(steps.metadata.outputs.update-type, 'semver-patch')
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`gh pr merge --auto` 的语义是「等所有检查通过后合并」，所以前提是仓库真的有 CI 在跑 Dependabot PR。major 升级不走这个分支，留给人工。

注意自动合并仍受[分支保护规则](/github/170-BranchModelBranchRule)约束：要求 CODEOWNERS 审查的地方照样会等批准，这是有意的安全兜底。

## 5. 坑点与自检

| 现象 | 原因 | 处理 |
| :--- | :--- | :--- |
| 提交配置后没有任何 PR | `directory`/`directories` 路径错、依赖已最新 | Insights → Dependabot 看作业日志 |
| `Dependabot couldn't parse the config file` | 缩进或键名错，`version` 不是 2 | 对照官方配置参考逐项核对 |
| PR 刷屏、邮件轰炸 | 没设 `open-pull-requests-limit`，或 interval 太密 | 限 5 个；weekly；开 `groups` |
| 升级后构建失败 | major 破坏性变更 | `ignore` 大版本；先读 release notes 再手动升 |
| 有告警但没有修复 PR | security updates 开关没开，或无安全版本 | 设置页启用；手动升级 |
| 自动合并一直不动 | 分支保护要审查/CI 没全绿；workflow 权限不足 | 查保护规则；补 `pull-requests: write` |
| 私有 npm 源 401 | Dependabot 访问不了私有 registry | 配置文件里加 `registries` 段 |

自检三问：

1. Security 页的告警和 Dependabot 页的作业日志，你分别知道在哪看吗？
2. 你的 `dependabot.yml` 里，`directories` 的通配路径真的匹配到了所有子包吗（拿真实目录名验证一次）？
3. 自动合并工作流里 `if` 条件是不是只放过了 minor/patch？

## 6. 练习

1. 给自己的仓库提交第二节那份 `dependabot.yml`，等第一次运行后数一数开了几个 PR，再决定怎么调 `groups`。
2. 故意把 `interval` 写成 `weakly`，提交后观察 Dependabot 页的报错信息，再改回来。
3. 把自动合并工作流加进仓库，用一个 patch 级别的依赖升级验证整条链路：PR 创建、CI 通过、自动合并。

## 下一步

- 依赖之外，泄露的密钥是更急的火：[密钥扫描与推送保护](/github/290-SecretScanning)
- 自动合并工作流里的 `on: pull_request` 是怎么触发的：[Actions 触发器](/github/380-ActionsTrigger)
- Dependabot PR 会被什么规则拦住：[分支保护规则](/github/170-BranchModelBranchRule)

### 官方文档

- dependabot.yml 配置参考：https://docs.github.com/zh/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file
- Dependabot alerts：https://docs.github.com/zh/code-security/dependabot/dependabot-alerts/about-dependabot-alerts
- fetch-metadata Action：https://github.com/dependabot/fetch-metadata
