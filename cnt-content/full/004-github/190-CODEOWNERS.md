---
order: 190
title: CODEOWNERS：让每个 PR 自动找到最懂这块代码的人
module: 'github'
category: 工具链
difficulty: intermediate
description: 从「20 人团队的 PR 全堆给管理员一个人审」这个真实问题切入，动手写一份 CODEOWNERS 并用分支保护让审查意见有强制力，讲清路径匹配规则、优先级语义与常见的「负责人没被指派」排查路径。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'github/170-BranchModelBranchRule'
  - 'github/180-PullRequestCompleteCollaborationFlow'
  - 'github/250-CommunityHealthFile'
prerequisites:
  - 'github/010-GitHubOverview'
---

## 前置知识

- 知道 PR 的审查流程（见 [Pull Request 完整协作流程](/github/180-PullRequestCompleteCollaborationFlow)）；
- 团队仓库最好有组织，能用 `@org/team` 形式指派（个人仓库只能指派单个用户）。

## 学习目标

读完全文你将能够：

1. 写一份 CODEOWNERS，让 PR 按改动路径自动指派审查人；
2. 理解「最后匹配的规则优先」这条语义，安排兜底规则与具体规则的顺序；
3. 用分支保护的 Require review from Code Owners 让审查从「礼貌」变成「门禁」；
4. 排查「负责人没被自动加进审查者」的三类常见原因。

## 1. 问题：所有 PR 都在等同一个人

一个 20 人仓库没有 CODEOWNERS 时的真实景象：仓库管理员是唯一的默认审查人。前端改一行 CSS 等他审，`src/auth/` 的认证逻辑也等他审——而他可能根本不是后端或安全的人。结果是双输：简单改动排队两天，关键改动审不出问题。

CODEOWNERS 解决的就是「派单」这一层：它是仓库里的一份**文件级责任表**，声明哪些路径由哪些人负责。PR 一旦改到这些路径，GitHub 自动把负责人加为审查者；配合分支保护，还能强制要求负责人批准才能合并。

它一鸡三吃：

| 能力 | 效果 |
| :--- | :--- |
| 自动指派 | 按文件路径找审查者，不靠人记 |
| 关键把关 | 安全、支付等核心目录固定由指定团队审 |
| 责任边界 | 每个文件都有归属，出问题可追溯 |

## 2. 动手：十分钟写一份 CODEOWNERS

### 第一步：放对位置

文件名叫 `CODEOWNERS`（没有扩展名），只能放在三个位置之一，多处存在时**只认找到的第一个**：

1. 仓库根目录 `CODEOWNERS`
2. `docs/CODEOWNERS`
3. `.github/CODEOWNERS`（推荐，和 CI、Issue 模板住一起）

注意：文件在哪个分支，就对那个分支的 PR 生效。

### 第二步：写规则

一行一条：`路径模式 所有者`。以一个 monorepo 为例：

```text
# .github/CODEOWNERS
# 规则从上到下，后面的规则优先级更高

# 兜底：其余所有文件归核心团队
*                                       @myorg/core-team

# 前端
/app-web/src/**                         @myorg/web-team
*.css                                   @myorg/web-team

# 内容层
/cnt-content/**                         @myorg/content-team

# 安全关键路径：最高优先级，单独指派
/shd-shared/auth/**                     @myorg/security-team
.github/workflows/**                    @myorg/devops-team

# 文档
README.md                               @myorg/docs-team
```

所有者三种写法：`@username`（个人，需仓库写权限）、`@org/team-name`（组织团队，推荐）、`user@example.com`（绑定了 GitHub 账号的邮箱）。一行可以写多个所有者，任一人批准即可（除非保护规则要求所有人）。

### 第三步：在 PR 里验证

打开一个改动多个目录的 PR，Files Changed 视图里每个文件能看到归谁审；审查者列表会自动出现对应团队。在仓库里浏览文件时，悬停文件图标也能看到负责人。

## 3. 讲原理：路径匹配与优先级

路径语法和 `.gitignore` 同源，支持 `*`、`**`、`?`、`[a-z]`。两个最容易写错的点：

**目录要带 `**` 才能覆盖子内容：**

```text
/src/             @org/backend-team    # 只匹配 src 目录本身，子目录不归它——容易漏
/src/**           @org/backend-team    # src 下所有内容，推荐写法
```

**优先级是「后面的规则加上/覆盖」，不是「只有一个赢」**。GitHub 的语义：一个文件会命中多条规则时，这些规则的所有者**都会被加进审查者**，而最后（最具体）的规则决定谁是「必须批准」的代码所有者。所以排版惯例是通用规则在前、具体规则在后：

```text
*                                @org/core-team       # 兜底
/src/auth/*.js                   @org/security-team   # 更具体，加人
/src/auth/AdminAuth.js           @org/security-lead   # 最具体，最终把关人
```

改 `AdminAuth.js` 的 PR 会同时拉上 core-team 和 security-team，且必须拿到 security-lead 批准。

三个官方强调的边界：所有者必须有写权限（团队还要可见）；Draft PR 不自动请求负责人审查，转正后才通知；文件超过 3 MB 会失效，别把几千行规则堆进去。

## 4. 让制度有牙齿：分支保护集成

只有自动指派的话，制度是「礼貌」——有权限的人不看审查也能点合并。去[分支保护规则](/github/170-BranchModelBranchRule)里加一条，它才变成「门禁」：

```
Settings → Branches → main 保护规则
  [x] Require a pull request before merging
      [x] Require review from Code Owners
```

勾上之后：改 `src/auth/` 的 PR，没有安全团队批准就无法合并，其他审查者批了也不算数。再叠加 required status checks（CI 必须绿，见 [CodeQL 扫描](/github/300-CodeQLCodeScanning)），合并门槛就是完整的三层：**CI 通过 + 代码所有者批准 + 审查通过**。

## 5. 坑点与自检

| 现象 | 原因 | 处理 |
| :--- | :--- | :--- |
| 负责人没被自动指派 | 所有者无写权限，或团队不可见 | 授 write 权限；检查团队可见性 |
| 完全不生效 | 文件不在三个规定位置，或文件名拼错 | 挪到 `.github/CODEOWNERS` |
| 部分文件没人负责 | 目录规则没加 `/**` | 改成 `dir/**` |
| 没有所有者批准也能合并 | 保护规则没勾 Require review from Code Owners | 补勾选 |
| 草案 PR 没通知 | 官方行为：Draft 不请求负责人 | `Ready for review` 后自动通知 |
| 该加的人没加上 | 具体规则写在了兜底规则前面 | 通用在前、具体在后 |
| 负责人离职后 PR 卡死 | 单个用户当所有者，单点故障 | 用 `@org/team` 替代个人 |

自检三问：

1. 随便指一个仓库文件，你能说出它归谁审吗（去 PR 页验证）？
2. 兜底规则 `*` 和最具体规则，谁在上面？
3. 「必须由代码所有者批准」这个开关，你的 main 保护规则里勾了吗？

## 6. 练习

1. 给自己的仓库写一份 `.github/CODEOWNERS`：先只写一条 `* @你的用户名`，开个 PR 看自动指派是否生效。
2. 加一条具体规则（比如 `.github/workflows/**` 指派给另一个人），验证优先级语义。
3. 在分支保护里勾选 Require review from Code Owners，然后用一个没有负责人批准的 PR 试试合并，确认被拦。

## 下一步

- 保护规则本身的完整配置：[分支模型与分支保护规则](/github/170-BranchModelBranchRule)
- 审查通过的 PR 怎么合、怎么自动化：[Pull Request 完整协作流程](/github/180-PullRequestCompleteCollaborationFlow)
- CONTRIBUTING、SECURITY 等配套社区文件：[社区健康文件](/github/250-CommunityHealthFile)

### 官方文档

- 关于代码所有者：https://docs.github.com/zh/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- 保护分支：https://docs.github.com/zh/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
