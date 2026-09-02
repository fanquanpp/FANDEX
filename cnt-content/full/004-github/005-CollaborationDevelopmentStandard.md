---
order: 50
title: 协作开发规范
module: 'github'
category: 工具链
difficulty: intermediate
description: 协作开发规范：Commit Message 约定、分支命名、PR 模板、代码审查清单与 CLA/DCO 合规。
author: fanquanpp
updated: '2026-08-02'
related:
  - 'github/003-RepositoryCreateCloneArchiveDelete'
  - 'github/004-SSHHTTPS'
  - 'github/006-READMEFile'
  - 'github/007-BranchModelBranchRule'
prerequisites:
  - 'github/001-GitHubOverview'
---


## 0. 从一个生活场景说起：团队协作公约

想象一个 10 人合租的厨房：如果每个人用完厨具随手乱放、做完菜不贴标签、买了食材不登记，厨房很快会乱成一团。于是大家制定一份**协作公约**：刀具放哪、调料贴标签、垃圾谁倒。公约不是限制自由，而是让每个人都知道"该怎么做"，减少摩擦、提高效率。

软件团队的协作开发也是同一个道理。**GitHub 协作开发规范**就是团队的"厨房公约"：统一的提交信息格式、分支命名规则、PR 模板、代码审查清单、贡献授权协议。本篇采用**规范驱动**的结构，围绕"约定（Convention）→ 落地（Practice）→ 合规（Compliance）"三层讲解。

## 1. 原理讲解：为什么需要协作规范

### 1.1 三个痛点

- **提交历史不可读**：`fix bug`、`update`、`asdf` 这类提交信息三个月后没人看得懂，无法回溯"这次改了什么、为什么改"。
- **审查低效**：没有 PR 模板，审查者要反复追问背景、影响范围、测试情况。
- **法律风险**：开源项目接收外部贡献，若不明确知识产权归属，日后可能引发版权纠纷。

### 1.2 规范解决什么

| 痛点 | 对应规范 | 效果 |
| :--- | :--- | :--- |
| 提交历史混乱 | Commit Message 约定 | 可检索、可自动生成 CHANGELOG |
| 分支混乱 | 分支命名规范 | 见名知义，知道分支在做什么 |
| PR 信息缺失 | PR 模板 | 审查者一次拿到所有上下文 |
| 审查走过场 | 代码审查清单 | 正确性、安全性、可维护性全覆盖 |
| 贡献权属不明 | CLA / DCO | 明确代码知识产权归属 |

## 2. Commit Message 约定：让历史可读

### 2.1 标准格式（Conventional Commits）

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 2.2 类型（Type）说明

| 类型 | 含义 | 示例 |
| :--- | :--- | :--- |
| feat | 新功能 | `feat(auth): add refresh token rotation` |
| fix | 修复 bug | `fix(api): handle 429 from upstream` |
| docs | 文档更新 | `docs(readme): clarify install steps` |
| style | 代码风格（不影响功能） | `style: format code with prettier` |
| refactor | 重构（不加功能不修 bug） | `refactor: extract common utility` |
| test | 测试相关 | `test: add unit tests for auth module` |
| chore | 构建/工具变动 | `chore: update dependencies` |
| perf | 性能优化 | `perf: optimize database query` |
| revert | 回滚 | `revert: revert commit abc123` |

### 2.3 撰写要点

- **Subject（主题）**：不超过 50 字符，用祈使句（"add" 而非 "added"），英文小写开头，结尾不加句号。
- **Scope（作用域）**：可选，标出模块名，如 `auth`、`api`、`ui`。
- **Body（正文）**：每行不超过 72 字符，说明变更的原因和影响。
- **Footer（页脚）**：`BREAKING CHANGE:` 标记破坏性变更；`Closes #123` 关联 Issue；`Signed-off-by:` 用于 DCO 签名。

### 2.4 完整示例

```text
feat(auth): add refresh token rotation

Implement refresh token rotation to improve security.
Clients must now handle token rotation properly.

BREAKING CHANGE: Clients must now handle refresh token rotation.
Closes #456
Signed-off-by: John Doe <john@example.com>
```

### 2.5 配套工具

- **commitizen**：交互式生成规范提交信息。
- **commitlint**：提交时校验格式，不符合即拦截。
- **standard-version / semantic-release**：根据提交类型自动生成 CHANGELOG 与版本号。

## 3. 分支命名与 PR 规范

### 3.1 分支命名规范

```
<type>/<description>
```

示例：`feat/add-login`、`fix/api-error-handling`、`docs/update-readme`。

> 分支规范与 Commit 类型保持一致，看到分支名就知道它在做什么、属于哪类改动。

### 3.2 PR 模板：放在 `.github/pull_request_template.md`

```markdown
## 背景
简要描述本次 PR 的背景和目的。

## 关联 Issue
- Closes #123

## 变更说明
- 新增登录接口
- 修复 token 刷新逻辑

## 测试情况
- 单元测试：通过
- 手工验证：本地启动验证登录流程

## 检查清单
- [ ] 代码符合项目规范
- [ ] 无敏感信息（密钥/密码）
- [ ] 测试已补充
- [ ] README 已同步更新
```

创建模板后，仓库中的每个新 PR 都会自动预填该结构，审查者不必反复追问基本信息。

### 3.3 PR 标题与描述最佳实践

- 标题沿用 `feat(auth): ...` 格式，便于自动生成 CHANGELOG。
- 描述说明"改了什么 + 为什么改 + 怎么验证"。
- 用 `Closes #123` 关联 Issue，合并时自动关闭对应 Issue。
- 涉及 UI 改动附截图；破坏性变更明确标注。

## 4. 代码审查（Code Review）规范

### 4.1 审查者职责

- 理解 PR 目的，先读描述再读代码。
- 按清单检查正确性、安全性、可维护性、性能、测试覆盖。
- 给出**具体可执行**的反馈，而不是空泛的"看不懂"。
- 确认 CI 状态检查通过后再批准。

### 4.2 审查清单（可直接复制使用）

**正确性**：逻辑正确、边界情况处理、错误处理完善、并发安全。

**安全性**：无注入漏洞、无路径遍历、无敏感信息泄露、依赖无已知漏洞、权限控制正确。

**可维护性**：风格一致、命名规范、注释充分、无重复代码、模块化设计。

**测试**：单元/集成测试覆盖、测试用例合理、边界用例存在。

### 4.3 反馈类型

| 反馈类型 | 含义 | 示例 |
| :--- | :--- | :--- |
| 必须修改 | 存在严重问题，不修不能合并 | "这里缺少空指针判断，会崩溃" |
| 建议修改 | 可优化，不阻塞合并 | "建议把这段提取为公共函数" |
| 疑问 | 需要作者解释 | "这里的超时时间是刻意设置的吗？" |
| 赞赏 | 值得肯定 | "这个错误处理写得很严谨" |

### 4.4 审查流程（七步）

1. 分配审查者（CODEOWNERS 自动分配或手动指定）→ 2. 检查 PR 描述与变更范围 → 3. 逐行审查 → 4. 跑测试验证无回归 → 5. 反馈并等待修改 → 6. 复核确认 → 7. 选择合并策略合并。

## 5. CLA 与 DCO：贡献授权的两种方案

### 5.1 概念对比

| 特性 | CLA（贡献者许可协议） | DCO（开发者来源证书） |
| :--- | :--- | :--- |
| 本质 | 正式法律协议，明确知识产权归属 | 轻量声明，签名确认有权提交 |
| 复杂度 | 高（需律师参与起草） | 低（一个 `Signed-off-by` 签名） |
| 法律约束力 | 强 | 中等 |
| 适用场景 | 大型项目、企业项目 | 开源项目、中小型项目 |

### 5.2 CLA 落地

- 使用 **CLA Assistant** 等 GitHub App：贡献者首次提 PR 时自动弹出协议，签署后才可合并。
- 分为**个人 CLA** 与**企业 CLA**（员工代表公司贡献时签署）。

### 5.3 DCO 落地

1. 提交时用 `git commit -s` 自动附加签名行：

```bash
git commit -s -m "feat(auth): add refresh token rotation"
# 提交信息中自动包含：
# Signed-off-by: 你的名字 <your@email.com>
```

2. 用 GitHub Action（如 `actions/dco`）在 CI 中校验每个提交是否带签名，未签名则检查失败。

```yaml
# .github/workflows/dco.yml
name: DCO Check
on:
  pull_request:
    types: [opened, synchronize]
jobs:
  dco:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/dco@v2
```

> 补签历史提交：`git rebase --signoff` 可给旧提交补上签名。

### 5.4 文档规范与团队落地清单

规范要落地，配套文档不可少。在仓库中维护以下"健康文件"（详见 026 篇《社区健康文件》）：

| 文件 | 作用 |
| :--- | :--- |
| `README.md` | 项目概述、安装、使用说明 |
| `CONTRIBUTING.md` | 贡献指南：如何提 Issue、如何开发、如何提交 PR |
| `CODE_OF_CONDUCT.md` | 社区行为准则 |
| `SECURITY.md` | 安全漏洞上报流程 |
| `CODEOWNERS` | 按模块指定代码审查负责人（详见 025 篇） |

**团队落地五步**：

1. 先定 Commit 规范与分支命名规范，写入 README 或 CONTRIBUTING。
2. 配置 PR 模板与 Issue 模板，用工具（commitlint/DCO Action）强制校验。
3. 主分支开启保护规则，要求 PR 合并 + 审查 + CI 通过（详见 007 篇）。
4. 用 CODEOWNERS 把关键模块的审查责任落到具体人。
5. 每季度回顾一次流程，根据痛点迭代规范。

## 6. 常见错误与对策

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| :--- | :--- | :--- | :--- |
| 提交信息不规范 | 被 commitlint 拦截 | 未遵循约定式提交格式 | 按 `<type>(<scope>): <subject>` 重写；用 commitizen 交互生成 |
| PR 描述太敷衍 | 审查者反复追问 | 没写背景、影响、测试 | 使用 PR 模板，按"背景/变更/测试/清单"填写 |
| DCO 检查失败 | CI 红叉：missing Signed-off-by | 提交未加签名 | `git commit -s` 重新提交；历史提交用 `git rebase --signoff` 补签 |
| 分支命名随意 | 分支堆积难维护 | 无命名规范 | 统一 `<type>/<description>`；合并后及时删除分支 |
| 审查意见无回应 | PR 长时间无人跟进 | 作者未回复或修改 | 作者及时回复每条评论；设置提醒；必要时礼貌催促 |
| 合并冲突反复出现 | PR 冲突不断 | 功能分支长期未同步 main | 定期 `git pull origin main` 同步；保持 PR 小而聚焦 |

## 8. 一句话记忆

**协作规范就是团队的"厨房公约"：提交信息让历史可读，PR 模板让审查高效，审查清单把好质量关，CLA/DCO 明确权属，四者共同支撑可持续的团队协作。**

### 延伸阅读

- 分支模型与保护规则落地，见 007 篇《分支模型与分支保护规则》。
- 团队健康文件（CONTRIBUTING/CODE_OF_CONDUCT），见 026 篇《社区健康文件》。
- 代码所有者（CODEOWNERS）自动分配审查者，见 025 篇。
- PR 全流程实操，见 027 篇《Pull Request 完整协作流程》。
