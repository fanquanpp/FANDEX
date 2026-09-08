---
order: 250
title: CODEOWNERS
module: 'github'
category: 工具链
difficulty: intermediate
description: CODEOWNERS文件详解：以大型团队代码审查场景讲代码所有权、自动指派审查、语法规则与分支保护集成。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'github/026-CommunityHealthFile'
  - 'github/027-PullRequestCompleteCollaborationFlow'
prerequisites:
  - 'github/001-GitHubOverview'
---


## 0. 先来一个生活场景：小区的楼栋长

你住的小区有 10 栋楼、30 个单元、上百户人家。物业公司收到报修单后，怎么处理最高效？

- 如果所有报修都堆给物业经理一个人，他既不懂 A 栋的水管问题，也不了解 C 栋的电路老化，处理又慢又容易出错。
- 于是小区选了**楼栋长**：每栋楼选一位熟悉本楼情况的负责人。水管问题找 A 栋长，电路问题找 C 栋长，门禁问题找物业工程部——**谁的问题找谁，专业的人管专业的事**。

大型软件仓库和小区一样：一个仓库可能包含前端、后端、数据库、DevOps、文档等多个模块。如果没有分工，所有 PR 都堆给仓库管理员一个人审查，就会：

- 前端改一行 CSS，也要等管理员有空才能合并。
- 后端的安全相关改动，管理员可能看不出问题。

**CODEOWNERS** 就是 GitHub 的"楼栋长制度"。它在仓库里定义一份"责任分工表"：**哪些文件由哪些人或团队负责**。当 PR 修改了这些文件时，GitHub 自动把对应负责人加为审查者（Reviewer），关键文件甚至要求**必须获得负责人批准**才能合并。

GitHub 官方定义：CODEOWNERS 文件用于定义仓库中代码的**负责人（Code Owners）**——当有人打开修改这些代码的 PR 时，会自动请求负责人审查。

本文采用**场景驱动**的结构：从"大型团队代码审查"的真实场景出发，一步步搭建自己的"楼栋长制度"——先写职责表（语法），再分工（路径匹配），然后加保险（分支保护集成），最后给出全套示例。

## 1. 场景：一个 20 人团队仓库的审查困境

### 1.1 没有 CODEOWNERS 时

```
张三（仓库管理员）收到 PR #123：修改了 /src/auth/ 的登录逻辑
      ↓
张三自己审查？—— 他是前端组长，看不懂 Go 的认证实现
      ↓
改到第 3 轮才合并 —— 浪费 2 天

同时，PR #124（前端按钮样式）也在等张三
张三忙不过来 —— 前端同学排队等待
```

### 1.2 有了 CODEOWNERS 之后

```
PR #123：修改 /src/auth/ → GitHub 自动指派安全团队 + 后端团队审查
PR #124：修改 /src/components/ → GitHub 自动指派前端团队审查
PR #125：修改 .github/workflows/ → GitHub 自动指派 DevOps 团队审查
```

每个 PR 一打开，**最懂这块代码的人**立刻出现在审查者列表里，不再依赖人工派单。

### 1.3 CODEOWNERS 解决的三个问题

| 问题 | 没有 CODEOWNERS | 有 CODEOWNERS |
| :--- | :--- | :--- |
| 审查者指派 | 管理员手动找，靠记忆 | 按文件自动匹配，不会漏 |
| 关键代码把关 | 谁来审不确定 | 安全/核心代码固定由指定团队把关 |
| 责任边界 | 模糊 | 文件级归属清晰，可审计 |

## 2. 搭建制度：CODEOWNERS 文件基础

### 2.1 文件放在哪里（按优先级）

GitHub 官方规定，`CODEOWNERS` 文件可放在三个位置之一，若多处存在则按以下顺序**只使用第一个找到的**：

1. 仓库根目录 `CODEOWNERS`
2. `docs/CODEOWNERS`
3. `.github/025-CODEOWNERS`（**推荐**）

官方推荐放在 `.github/` 目录，与 CI 配置、模板文件放在一起。注意：**文件在哪个分支，就对该分支的 PR 生效**——可以为不同分支配置不同的负责人（如 main 分支与 gh-pages 分支）。

### 2.2 基本语法：一行一条"职责"

```
# 格式：<路径模式> <一个或多个所有者>

# 模式（前面） + 所有者（后面，用 @ 提及）
*                       @octocat
/src/auth/              @org/security-team
*.js                    @org/frontend-team
```

三个要素：

| 要素 | 语法 | 说明 |
| :--- | :--- | :--- |
| **路径模式** | 与 `.gitignore` 语法一致 | 支持 `*`、`**`、`?`、`[a-z]` 通配符 |
| **所有者** | `@username` | 单个用户（需有仓库写权限） |
| **所有者** | `@org/team-name` | 组织团队（需可见且有写权限） |
| **所有者** | `user@example.com` | 邮箱（绑定了 GitHub 账号） |

### 2.3 三个注意事项（官方强调）

- **所有者必须有仓库写权限**：即使是团队，也必须是"可见且有写权限"的团队——即使所有成员已经通过其他途径拥有权限。
- **草案 PR 不自动通知**：把 PR 标记为草案（Draft）时不会自动请求负责人审查；转为正式后才会通知。
- **文件大小限制**：CODEOWNERS 文件过大（超过 3 MB）会失效，保持精简。

## 3. 分工细则：路径匹配规则

### 3.1 匹配规则（与 .gitignore 同源）

| 模式 | 匹配对象 | 示例 |
| :--- | :--- | :--- |
| `*` | 所有文件（默认兜底） | `* @org/core-team` |
| `*.js` | 任意层级的 .js 文件 | `*.js @org/frontend-team` |
| `/src/` | 仅根目录的 src 目录 | `/src/ @org/backend-team` |
| `src/` | 任意层级的 src 目录 | `src/ @org/backend-team` |
| `**/auth/**` | 任意层级的 auth 目录 | `**/auth/** @org/security-team` |
| `docs/README.md` | 精确文件 | `docs/README.md @org/docs-team` |

### 3.2 优先级：具体规则覆盖通用规则

与 .gitignore 不同，CODEOWNERS 的规则是**所有匹配的规则都会生效**（每个匹配的规则都添加审查者），但**后面的规则优先级更高**（更具体的匹配会额外添加所有者）。GitHub 官方明确：**最后一个匹配文件的规则（以及任何更具体的规则）决定了文件的代码所有者**。

```gitignore
# 兜底：所有文件默认由核心团队负责
*                              @org/core-team

# 更具体：auth 目录的 JS 文件额外由安全团队负责
/src/auth/*.js                 @org/security-team

# 最具体：特定的关键文件由安全负责人直接负责
/src/auth/AdminAuth.js         @security-lead
```

修改 `AdminAuth.js` 时，审查者包括：core-team（兜底）+ security-team（目录规则）+ security-lead（文件规则）。规则越具体、越靠后，越能"加人"。

### 3.3 只匹配目录时

`/src/` 只匹配目录本身，不含子目录内容。要匹配整个目录树：

```gitignore
# 只匹配 src 目录本身（不含子目录）——容易漏
/src/             @org/backend-team

# 推荐：匹配 src 下所有内容（目录 + 子目录 + 文件）
/src/**           @org/backend-team
```

## 4. 加保险：与分支保护规则集成

仅自动指派审查还不够——如果有权合并的人强行跳过审查，制度就形同虚设。**分支保护规则**给 CODEOWNERS 加上"法律强制力"。

### 4.1 配置步骤

```
仓库 → Settings → Branches → Branch protection rules → 编辑 main 分支规则
    [x] Require a pull request before merging
        [x] Require review from Code Owners
```

### 4.2 效果对比

| 配置 | 效果 |
| :--- | :--- |
| 仅 CODEOWNERS | 自动添加审查者，但任何人可以批准合并 |
| CODEOWNERS + Require review from Code Owners | **必须获得代码所有者批准**才能合并，即使其他审查者已批准 |

这意味着：修改 `src/auth/` 的 PR，如果没有安全团队的批准，**任何方式都无法合并**（包括仓库管理员直接合并，除非有管理员豁免权限）。

### 4.3 与 CI 检查的配合

在同一个分支保护规则中，还可以要求：

- 必须通过 CI 状态检查（如 CodeQL、Dependency Review，见 019、010 文档）。
- 必须通过 Dependabot 自动合并前的检查。

三层叠加后，PR 合并的完整门槛为：**CI 通过 + 代码所有者批准 + 常规审查通过**。

## 5. 完整示例：一个全栈仓库的 CODEOWNERS

```gitignore
# .github/025-CODEOWNERS
# 规则说明：后面的规则优先级更高；匹配的规则都会添加审查者

# ========== 兜底规则 ==========
# 未匹配到任何其他规则的文件，由核心团队负责
*                                                @myorg/core-team

# ========== 前端 ==========
/src/components/                                 @myorg/frontend-team
/src/styles/                                     @myorg/frontend-team
*.vue                                            @myorg/frontend-team
*.css                                            @myorg/frontend-team
*.tsx                                            @myorg/frontend-team

# ========== 后端 ==========
/src/api/                                        @myorg/backend-team
/src/services/                                   @myorg/backend-team
*.py                                             @myorg/backend-team

# ========== 安全（关键代码，最高优先级） ==========
/src/auth/**                                     @myorg/security-team
/src/payment/**                                  @myorg/security-team
.env.example                                     @myorg/security-team
security/**                                      @myorg/security-team

# ========== DevOps ==========
Dockerfile                                       @myorg/devops-team
docker-compose*.yml                              @myorg/devops-team
.github/workflows/**                             @myorg/devops-team

# ========== 文档 ==========
/docs/**                                         @myorg/docs-team
README.md                                        @myorg/docs-team

# ========== 数据库迁移 ==========
/db/migrations/**                                @myorg/backend-team
```

**验证技巧**：在 PR 的 "Files Changed" 选项卡中，可以预览每个文件归属哪些负责人；在仓库中浏览文件时，悬停文件图标也可看到负责人提示。

## 6. 常见错误与对策

| 错误现象 | 报错/表现 | 原因 | 解决办法 |
| :--- | :--- | :--- | :--- |
| 负责人没被自动添加 | PR 审查者为空 | 所有者没有仓库写权限；或团队不可见 | 给用户/团队授予 write 权限；确认团队可见性 |
| 文件位置写错导致不生效 | 完全没有任何效果 | CODEOWNERS 不在三个规定位置 | 移到根目录、docs/ 或 .github/（推荐后者） |
| 规则漏匹配 | 部分文件没人负责 | 目录规则未加 `/**`，只匹配了目录本身 | 目录用 `dir/**` 覆盖子内容 |
| 必须所有者批准不生效 | 无所有者批准也能合并 | 分支保护未勾选 "Require review from Code Owners" | 在分支保护规则中勾选该选项 |
| 草案 PR 无通知 | 转正式前没通知 | 官方行为：草案 PR 不自动请求负责人 | 转正式（Ready for review）后即自动通知 |
| 规则顺序混乱 | 该加的人没加上 | 具体规则写在兜底规则之前被覆盖 | 把通用规则放前面、具体规则放后面 |
| 单个用户作为负责人 | 请假/离职后无人审查 | 单点故障 | 用团队（@org/team-name）代替单用户 |

## 8. 一句话记忆

> **CODEOWNERS 是仓库的"楼栋长制度"——一行规则把文件划给最懂它的人，PR 一开自动指派审查，再配合分支保护的"必须经代码所有者批准"，让专业的人把关专业的代码。**

### 官方文档

- 关于代码所有者（GitHub 官方中文文档）：https://docs.github.com/zh/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- 分支保护与强制审查（About protected branches）：https://docs.github.com/zh/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- Gitignore 语法（CODEOWNERS 的路径模式同源）：https://git-scm.com/docs/gitignore

### 延伸阅读
- 分支模型与分支保护规则（保护规则完整配置），见 004-github 模块 007 文档。
- Pull Request 完整协作流程，见 004-github 模块 027 文档。
- 社区健康文件（CONTRIBUTING、SECURITY 等配套文件），见 004-github 模块 026 文档。
- GitHub Actions CI/CD（与代码所有者审查配合的合并门槛），见 004-github 模块 029 文档。
