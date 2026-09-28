---
order: 230
title: Code Review 最佳实践：让审查真的拦得住问题
module: 'git'
category: 工具链
difficulty: intermediate
description: 从「PR 秒批 LGTM，上线照样出事故」这个真实失效场景切入，动手搭起「CI 前置 + PR 粒度 + CODEOWNERS 强制审查」的完整 Review 制度，给出分级评论规范与常见的五个反模式。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/280-InteractiveRebase'
  - 'github/180-PullRequestCompleteCollaborationFlow'
  - 'github/190-CODEOWNERS'
prerequisites:
  - 'git/210-GitFlowGitHubFlow'
---

## 前置知识

- 走完一次 PR 流程（见 [Git Flow 与 GitHub Flow](/git/210-GitFlowGitHubFlow) 或 [Pull Request 完整协作流程](/github/180-PullRequestCompleteCollaborationFlow)）；
- 知道分支保护规则在哪配（见 [分支模型与分支保护规则](/github/170-BranchModelBranchRule)）。

## 学习目标

读完全文你将能够：

1. 说出 Review 拦不住问题的三个常见原因（橡皮图章、CI 后置、PR 过大）；
2. 配好「CI 绿灯是审查前置条件」的保护规则；
3. 用分级标记写出让作者能直接执行的审查意见；
4. 识别自己团队的 Review 反模式并对症下药。

## 1. 问题：LGTM 三秒批完的 PR

一个普遍的失效模式：团队「有」Review 制度——每个 PR 都有人点 Approve，但上线照样出事故。复盘时常见三个根源：

1. **CI 后置**：审查者先看代码，测试合完才跑。人审的是「能不能跑」，机器该管的格式与测试却排在后面，审查注意力被浪费；
2. **PR 过大**：一个 2000 行的 PR，审查者只能扫一眼「架构没大问题」就放行。研究表明审查效率在 200-400 行变更时最高；
3. **无差别意见**：「这里写得不好」这种评论既不能执行也不阻塞，作者不知道改不改、怎么改。

Review 的价值从来不只是找 bug：质量把关、知识传播（降低「只有一个人懂这块」的风险）、风格统一、以审代教。但前提是制度设计能让注意力花在刀刃上。

## 2. 动手：把制度搭起来

### 第一步：CI 前置，红灯不进审查

```yaml
# .github/workflows/pr-check.yml
name: PR Check
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  lint:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6
      - run: pnpm install --frozen-lockfile && pnpm -r lint
  test:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v6
      - run: pnpm install --frozen-lockfile && pnpm -r test
```

再到分支保护规则里把检查设为 required：CI 不绿的 PR，连请求审查的资格都没有。

### 第二步：用保护规则给审查加强制力

```yaml
# GitHub 分支保护规则的关键项
required_pull_request_reviews:
  required_approving_review_count: 1    # 小团队 1 个足够，重在有真审
  dismiss_stale_reviews: true           # 作者推新提交后，旧批准作废
  require_code_owner_reviews: true      # 改到谁的地盘谁必须批
required_status_checks:
  strict: true                          # 合并前必须基于最新 main
  contexts: [ci/lint, ci/test]
```

`dismiss_stale_reviews` 是最容易被忽略的一项：没有它，「批准后偷偷再推一版」就绕过了审查。

### 第三步：把「谁审什么」写进 CODEOWNERS

```text
# .github/CODEOWNERS
*                    @team-lead
/src/core/           @architect
/src/auth/           @security-team
/src/models/         @dba-team
```

配合保护规则的 `require_code_owner_reviews`，关键模块的审查就从「看谁有空」变成「必须有资格的人批准」（完整语法见 [CODEOWNERS](/github/190-CODEOWNERS)）。

### 第四步：PR 描述模板

在 `.github/PULL_REQUEST_TEMPLATE.md` 放一份模板，作者填、审查者读：

```markdown
## 变更描述
<!-- 一句话说清做了什么，关联 Issue 写 Fixes #123 -->

## 验证方式
<!-- 怎么测试的：跑了哪些用例 / 手动验证步骤 -->

## 自检清单
- [ ] 自测通过，新增了测试
- [ ] 无硬编码密钥、无调试代码
- [ ] 文档与注释已同步
```

## 3. 讲原理：审查者的注意力怎么分配

审查清单很长，但真正该花时间的是前三类：

**功能正确性**：实现是否符合描述、边界条件、错误路径、并发安全。

**安全性**：输入是否校验、注入与 XSS 风险、密钥是否硬编码、权限检查是否完整。

**可维护性**：有没有测试、注释解释的是「为什么」、是否破坏 API 兼容。

格式、命名这类机械问题**不该人眼盯**——交给 lint。审查者看到格式问题还在逐条评论，说明自动化缺位。

意见要分级，让作者能直接执行：

```text
[must]     必须改，阻塞合并：逻辑错误、安全漏洞、数据丢失风险
[suggest]  建议改，不阻塞：更好的写法、缺失的测试
[nit]      吹毛求疵：命名、风格，可批量处理
[quest]    提问：先解释，再决定改不改
[praise]   明确表扬值得学的代码
```

配套一条评论规范：对事不对人、给方案不只给判断、说清为什么、好代码要表扬。对比：

```text
反例：「这段代码写得不好。」

正例：「[must] 这里拼接 SQL 有注入风险，建议参数化：
query = "SELECT * FROM users WHERE id = %s"
cursor.execute(query, (user_id,))」
```

### PR 粒度与时效

- 200-400 行是黄金区间；超过 800 行必须拆（先数据层后 UI 层、先基础设施后业务）；
- 时效承诺：紧急修复 1 小时内、普通功能 4 小时内、重构 1 个工作日内。没有 SLA 的 Review 必然堆积；
- 审查瓶颈的解法是「每个模块至少 2-3 人可审 + 每天固定 Review 时间块」，而不是指望某位万能审查者。

## 4. 反模式对照表

| 反模式 | 问题 | 解法 |
| :--- | :--- | :--- |
| 橡皮图章（秒批 LGTM） | 审查流于形式 | 保护规则强制 code owner 批准；CI 前置让人只审逻辑 |
| PR 堆积无人审 | 作者阻塞，心态崩 | SLA + 超时提醒 + 轮转 |
| 大 PR 恐惧 | 审查者只扫不看 | 强制拆分；>800 行拒审 |
| 无休止设计争论 | PR 变成论坛 | 设计分歧移到 Issue/会议，PR 只谈实现 |
| 批准后再推代码 | 绕过审查 | 开 `dismiss_stale_reviews` |

## 5. 坑点与自检

| 现象 | 原因 | 处理 |
| :--- | :--- | :--- |
| 批准了还是合不了 | 缺 code owner 批准 | 去 PR 页看缺谁，@对应团队 |
| 新提交没触发重审 | `dismiss_stale_reviews` 没开 | 补开保护规则 |
| 审查全是 nit，逻辑没人看 | 注意力错配 | 格式交给 lint；意见按 must/suggest 分级 |
| PR 大到没人肯审 | 没有粒度约束 | 团队约定 >800 行拆分 |
| Review 意见石沉大海 | 没有 SLA 与提醒 | 约定时效，超时自动 ping |

自检三问：

1. 你最近一次 Review 花了多久？变更多少行？超过 400 行吗？
2. 你的意见里，作者能直接照做吗？
3. 批准之后，作者还能再推代码而不作废批准吗？

## 6. 练习

1. 给自己的仓库配齐第二步的三条保护规则，用两个账号（或小号）验证「未批准不能合、新提交作废批准」。
2. 拿一段你写过的旧代码让同事审，要求对方用 [must]/[suggest]/[nit] 分级，体会分级评论的执行效率差异。
3. 统计团队最近 10 个 PR 的变更行数，超过 800 的复盘拆分策略。

## 下一步

- Review 中要求 rebase / 改提交历史的操作：[交互式 rebase](/git/280-InteractiveRebase)
- 审查通过后怎么合并：[Pull Request 完整协作流程](/github/180-PullRequestCompleteCollaborationFlow)
- 谁审什么文件的自动化：[CODEOWNERS](/github/190-CODEOWNERS)
