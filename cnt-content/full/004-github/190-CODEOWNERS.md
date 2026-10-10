---
order: 200
title: CODEOWNERS：让每个 PR 自动找到最懂这块代码的人
module: 'github'
category: 工具链
difficulty: intermediate
description: 从「20 人团队的 PR 全堆给管理员一个人审」这个真实问题切入，动手写一份 CODEOWNERS 并用分支保护让审查意见有强制力，讲清路径匹配规则、优先级语义与常见的「负责人没被指派」排查路径。
author: fanquanpp
updated: '2026-10-11'
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

## 5. 底层机制：负责人是怎么被算出来的

理解计算过程，排查「该来的人没来」就不用猜：

1. **触发时机**：PR 创建与每次推送新提交时，服务端计算 `base...head` 的**改动文件清单**（注意是差异文件，不是全部文件）；
2. **逐文件匹配**：对每个改动文件跑一遍 CODEOWNERS 规则，按第 3 节的优先级语义得出它的所有者集合；
3. **汇总请求审查**：全部文件的所有者去重后，生成一批 review requests；已批准过的人不会被重复打扰；
4. **门禁判定**：分支保护勾了 Require review from Code Owners 后，合并检查逐文件核验「该文件的代码所有者是否在最新提交上批准过」。开启 Dismiss stale approvals 时，新提交会把旧批准作废，所有者必须再看一遍——防止「批准后偷偷塞提交」。

两个推论：改 CODEOWNERS 文件本身也算改动文件，它会命中自己的规则（通常把 `.github/CODEOWNERS` 的所有者设为核心团队，形成「改规则的规则」）；负责人计算只认**默认分支上的 CODEOWNERS 版本**，在功能分支里改规则不会立即影响该分支自己 PR 的门禁判定。

## 6. 与相邻知识的关系

- [分支模型与分支保护规则](/github/170-BranchModelBranchRule)：CODEOWNERS 负责自动**派单**，保护规则负责让派单结果**有强制力**——两者是「名单」与「门禁」的关系；
- [Pull Request 完整协作流程](/github/180-PullRequestCompleteCollaborationFlow)：负责人审批是 PR 状态机里 request-changes / approve 语义的前置输入；
- [gh pr 实战](/github/460-GhPrManage)：命令行视角查看与催办负责人指派的 PR；
- [社区健康文件](/github/250-CommunityHealthFile)：CONTRIBUTING 写「怎么贡献」，CODEOWNERS 写「谁来把关」，一软一硬配套。

## 7. 面试题思路

**「为什么推荐用团队而不是个人当代码所有者？」** 从两个失败模式答：个人所有者是单点故障（离职、休假时 PR 卡死，只能管理员强合）；团队把「人」抽象成「职责」，成员变更不用改 CODEOWNERS。延伸到大型组织的分层：目录级团队 + 最终把关人（最具体规则）的两级结构。

**「CODEOWNERS 的优先级语义是什么，怎么安排规则顺序？」** 先说清「多规则叠加、最具体规则决定必须批准的人」，再给排版惯例（通用在前、具体在后），最后补「目录必须 `**` 才覆盖子内容」这个高频坑。能提到 Draft PR 不派单、3 MB 上限属经验加分。

**「如何防止代码所有者机制形同虚设？」** 三个抓手：保护规则勾 Require review from Code Owners（否则只是礼貌）；开启 Dismiss stale approvals（否则批准后可塞提交）；定期审计所有者名单与团队权限（僵尸团队会让规则静默失效）。

## 8. 坑点与自检

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

## 9. 练习

先看任务与提示，自己写完再看参考实现。

1. 给自己的仓库写一份 `.github/CODEOWNERS`：先只写一条 `* @你的用户名`，开个 PR 看自动指派是否生效。

   提示：文件无扩展名；位置选 `.github/`；验证用 `gh pr view` 看 reviewRequests。

   参考实现：

   ```text
   # .github/CODEOWNERS
   *   @your-username
   ```

   ```bash
   gh pr create --fill
   gh pr view --json reviewRequests,number \
     --jq '"PR #\(.number) 等待审查：\([.reviewRequests[].login] | join(", "))"'
   ```

2. 加一条具体规则（比如 `.github/workflows/**` 指派给另一个人），验证优先级语义。

   提示：具体规则写在 `*` 之后；改一个 workflow 文件开 PR，观察审查者是否「两人都在、以具体规则的人为准」。

   参考实现：

   ```text
   # .github/CODEOWNERS（顺序：通用在前，具体在后）
   *                               @your-username
   .github/workflows/**            @teammate-devops
   ```

   ```bash
   # 改动一个 workflow 文件后开 PR，核对门禁归属
   gh pr view --json reviewRequests,files \
     --jq '{files: [.files[].path], reviewers: [.reviewRequests[].login]}'
   ```

3. 在分支保护里勾选 Require review from Code Owners，然后用一个没有负责人批准的 PR 试试合并，确认被拦。

   提示：入口在 Settings → Branches；被拦时 `gh pr merge` 的报错信息与 `mergeStateStatus` 都能当证据。

   参考实现：

   ```bash
   gh pr merge --squash
   # 预期报错：Pull request is not mergeable: the base branch policy prohibits the merge
   # 查看精确阻塞原因：
   gh pr view --json mergeable,mergeStateStatus \
     --jq '"mergeable=\(.mergeable) state=\(.mergeStateStatus)"'
   # 典型输出：mergeable=BLOCKED state=BLOCKED（等负责人批准后再试）
   ```

## 下一步

- 保护规则本身的完整配置：[分支模型与分支保护规则](/github/170-BranchModelBranchRule)
- 审查通过的 PR 怎么合、怎么自动化：[Pull Request 完整协作流程](/github/180-PullRequestCompleteCollaborationFlow)
- CONTRIBUTING、SECURITY 等配套社区文件：[社区健康文件](/github/250-CommunityHealthFile)

### 官方文档

- 关于代码所有者：https://docs.github.com/zh/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- 保护分支：https://docs.github.com/zh/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
