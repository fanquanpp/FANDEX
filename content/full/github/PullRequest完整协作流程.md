---
order: 70
tags:
  - github
difficulty: intermediate
title: 'Pull Request 完整协作流程'
module: github
category: 'GitHub Advanced'
description: 'Pull Request 完整生命周期：Fork、分支、提交、推送、审查、合并到同步上游。'
author: Anonymous
related:
  - github/代码所有者
  - github/社区健康文件
  - github/GitHubPages多站点方案
  - github/GitHubActions与CICD
prerequisites:
  - github/GitHub概述
---

## 1. 背景

**PR（Pull Request，拉取请求）** 是 GitHub 上请求将某分支合并入目标分支的审查单元，承载 **diff（差异）**、**讨论**、**审查意见** 与 **CI 结果**。开源常见流程：**Fork（复刻）** 上游仓库到个人空间，在 **fork** 上开发后向上游提 PR。

## 2. PR 生命周期详解

### 2.1 准备阶段

#### 2.1.1 Fork 仓库

1. 访问上游仓库页面
2. 点击右上角的 **Fork** 按钮
3. 选择要 Fork 到的目标账号
4. 等待 Fork 完成，得到 `your-user/upstream-repo` 副本

#### 2.1.2 克隆仓库

```bash
 # 使用 SSH 克隆（推荐）
 git clone git@github.com:your-user/upstream-repo.git
 # 或使用 HTTPS 克隆
 git clone https://github.com/your-user/upstream-repo.git
 # 进入仓库目录
 cd upstream-repo
```

#### 2.1.3 添加上游远程

```bash
 git remote add upstream https://github.com/ORIGINAL_OWNER/REPO.git
 # 验证远程仓库配置
 git remote -v
```

#### 2.1.4 创建功能分支

```bash
 # 确保本地 main 分支是最新的
 git checkout main
 git pull upstream main
 # 创建并切换到功能分支
 git checkout -b feature/功能描述
```

### 2.2 开发阶段

#### 2.2.1 提交代码

```bash
 # 添加修改的文件
 git add .
 # 提交代码（遵循提交信息规范）
 git commit -m "feat: 添加登录功能"
 # 推送到远程 fork
 git push -u origin feature/功能描述
```

### 2.3 PR 创建阶段

#### 2.3.1 打开 PR

1. 访问你的 fork 仓库页面
2. 点击 **Compare & pull request** 按钮
3. 选择 **base** 分支（上游仓库的目标分支，通常是 main）
4. 选择 **compare** 分支（你的功能分支）
5. 填写 PR 标题和描述
6. 点击 **Create pull request** 按钮

#### 2.3.2 PR 描述模板

```markdown
## 功能描述

简要描述本次 PR 的功能或修复内容。

## 实现细节

-
-
-

## 关联 Issue

-
-

## 测试说明

-
-

## 其他信息

任何其他需要说明的信息。
```

### 2.4 代码审查阶段

#### 2.4.1 审查流程

1. 维护者收到 PR 通知
2. 维护者或指定的审查者进行代码审查
3. 审查者可以：

- 批准 PR（Approve）
- 请求修改（Request Changes）
- 发表评论（Comment）

4. 作者根据审查意见进行修改
5. 修改后推送到同一分支，PR 会自动更新
6. 重复上述过程，直到 PR 被批准

#### 2.4.2 审查技巧

**审查者**：

- 关注代码质量和安全性
- 检查是否符合项目规范
- 提供具体的改进建议
- 及时回复评论
  **作者**：
- 积极响应审查意见
- 提供清晰的修改说明
- 保持 PR 专注于一个功能
- 及时更新 PR 描述

### 2.5 合并阶段

#### 2.5.1 合并策略

GitHub 提供三种合并策略：

1. **Create a merge commit**：创建一个新的合并提交，保留所有提交历史
2. **Squash and merge**：将所有提交压缩为一个提交，保持历史简洁
3. **Rebase and merge**：将提交重新基于目标分支，创建线性历史

#### 2.5.2 合并操作

1. 确保所有状态检查通过
2. 确保所有审查都已批准
3. 选择合适的合并策略
4. 点击 **Merge pull request** 按钮
5. 可选：删除已合并的功能分支

### 2.6 后续阶段

#### 2.6.1 清理分支

```bash
 # 删除本地已合并分支
 git checkout main
 git branch -d feature/功能描述
 # 删除远程 fork 上的功能分支
 git push origin --delete feature/功能描述
```

#### 2.6.2 同步上游

```bash
 # 拉取上游最新代码
 git fetch upstream
 git checkout main
 git merge upstream/main
 # 更新你的 fork
 git push origin main
```

## 3. PR 描述最佳实践

### 3.1 标题规范

- 简洁明了，概括 PR 的主要内容
- 使用语义化前缀，如 `feat:`, `fix:`, `docs:`, `chore:` 等
- 长度控制在 50 个字符以内

### 3.2 内容规范

- 详细描述 PR 的目的和实现
- 提供足够的上下文信息
- 关联相关的 Issue
- 说明测试情况
- 提供截图或演示（如果适用）

### 3.3 关联 Issue

使用关键词自动关闭 Issue：

- `Closes #123`
- `Fixes #123`
- `Resolves #123`
- `Closes #123, #456`（同时关闭多个 Issue）

## 4. 代码审查指南

### 4.1 审查内容

- **代码质量**：可读性、可维护性、性能
- **功能正确性**：是否实现了预期功能
- **安全性**：是否存在安全漏洞
- **测试覆盖**：是否有足够的测试
- **规范符合性**：是否符合项目规范

### 4.2 审查评论类型

- **问题（Problem）**：需要修复的问题
- **建议（Suggestion）**：改进代码的建议
- **疑问（Question）**：对代码的疑问
- **赞赏（Praise）**：对好代码的肯定

### 4.3 审查评论格式

```markdown
-
-
-
```

## 5. 常见问题与解决方案

### 5.1 PR 相关问题

#### 5.1.1 Base 分支选择错误

- **问题**：PR 对到了 fork 的 `main` 而非上游，导致合错仓库
- **解决方案**：

1.  关闭当前 PR
2.  重新打开 PR，确保选择正确的 base 分支
3.  检查 PR 页面顶部的 `base repository` 和 `base branch` 是否正确

#### 5.1.2 大范围无关改动

- **问题**：格式化整库会使 diff 不可读，审查困难
- **解决方案**：

1.  撤销格式化改动
2.  单独创建一个 PR 用于格式化
3.  确保当前 PR 只包含相关功能改动

#### 5.1.3 合并冲突

- **问题**：PR 与目标分支存在冲突
- **解决方案**：

```bash
 # 在本地解决冲突
 git checkout feature/功能描述
 git pull upstream main
 # 解决冲突
 git add .
 git commit -m "Resolve merge conflicts"
 git push
```

#### 5.1.4 状态检查失败

- **问题**：CI 检查失败，导致 PR 无法合并
- **解决方案**：

1.  查看 CI 日志，了解失败原因
2.  修复问题
3.  重新推送代码，触发 CI 检查

### 5.2 协作相关问题

#### 5.2.1 审查延迟

- **问题**：PR 提交后长时间没有审查
- **解决方案**：

1.  礼貌地提醒审查者
2.  检查是否有未解决的评论
3.  确保 PR 描述清晰完整

#### 5.2.2 审查意见分歧

- **问题**：审查者和作者对代码有不同意见
- **解决方案**：

1.  进行讨论，理解对方的观点
2.  寻找共同点，达成共识
3.  如果无法达成共识，寻求第三方调解

## 6. 最佳实践

### 6.1 PR 管理

- **保持小而专注**：每个 PR 只解决一个问题或实现一个功能
- **使用 Draft PR**：对于未完成但需要早期反馈的工作
- **及时更新**：根据审查意见及时修改代码
- **定期同步**：保持本地分支与上游同步，避免冲突

### 6.2 审查流程

- **设定审查时间**：为审查者设定合理的审查时间
- **使用 CODEOWNERS**：自动分配审查者
- **提供上下文**：在 PR 描述中提供足够的上下文信息
- **鼓励讨论**：积极参与代码审查讨论

### 6.3 团队协作

- **建立 PR 模板**：为团队创建标准化的 PR 模板
- **制定审查指南**：明确审查标准和流程
- **定期回顾**：定期回顾 PR 流程，寻找改进空间
- **鼓励贡献**：对贡献者表示感谢，鼓励更多贡献

## 7. 实际应用案例

### 7.1 开源项目贡献

#### 7.1.1 案例描述

- **项目**：一个流行的前端库
- **贡献者**：首次贡献的开发者
- **PR**：修复一个 bug

#### 7.1.2 流程

1. Fork 项目仓库
2. 克隆到本地
3. 创建 bugfix 分支
4. 修复 bug
5. 编写测试
6. 推送代码
7. 打开 PR
8. 响应审查意见
9. PR 被合并
10. 同步上游代码

### 7.2 团队内部协作

#### 7.2.1 案例描述

- **团队**：一个 5 人的开发团队
- **项目**：内部 Web 应用
- **PR**：实现一个新功能

#### 7.2.2 流程

1. 从 main 分支创建 feature 分支
2. 实现功能
3. 推送代码
4. 打开 PR，指定审查者
5. 审查者进行代码审查
6. 作者根据审查意见修改
7. 所有审查通过后合并
8. 部署到测试环境
9. 测试通过后部署到生产环境
10. 清理分支

## 8. 延伸阅读

- [About pull requests](https://docs.github.com/en/pull-requests) <!-- nofollow -->
- [Creating a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request) <!-- nofollow -->
- [About code review](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews) <!-- nofollow -->
- [Merging a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/merging-a-pull-request) <!-- nofollow -->

## 更新日志

- **2026-04-05**：初版。
- **2026-05-03**：扩展内容，添加 PR 生命周期的详细阶段、PR 描述的最佳实践和模板、代码审查的详细流程和技巧、合并策略的详细介绍、常见问题的解决方案、实际应用案例和更多最佳实践。
