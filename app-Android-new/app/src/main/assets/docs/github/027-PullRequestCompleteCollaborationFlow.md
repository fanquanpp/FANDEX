---
order: 270
title: Pull Request 完整协作流程
module: 'github'
category: 工具链
difficulty: intermediate
description: Pull Request 完整生命周期：创建分支、提交推送、发起 PR、审查、合并到关闭与同步上游。
author: fanquanpp
updated: '2026-08-02'
related:
  - 'github/026-CommunityHealthFile'
  - 'github/028-GitHubPagesMultiSolution'
  - 'github/029-GitHubActionsCICD'
prerequisites:
  - 'github/001-GitHubOverview'
---


## 0. 从一个生活场景说起：完整走一遍"交作业"流程

想象你写一篇小组报告：先把草稿放到共享文件夹的**独立子文件夹**（创建分支）→ 写完初稿（提交推送）→ 通过系统提交"审阅申请"（创建 PR）→ 老师批注修改意见（代码审查）→ 你逐条修改后重新提交（更新 PR）→ 老师签字通过（批准）→ 归档进主文件夹（合并）→ 关闭审阅记录（关闭 Issue）。

**Pull Request（PR）就是软件开发里的这套"交作业"流程**。本篇采用**流程驱动**的结构，按照"创建分支 → 提交推送 → 发起 PR → 审查 → 修改 → 合并 → 关闭清理 → 同步上游"的真实顺序，完整走一遍 PR 协作全流程。

## 1. 原理讲解：PR 到底是什么

### 1.1 直观理解

PR（拉取请求）是**请求把某个分支的改动合并进另一个分支**的"审查单元"。它承载：

- **diff（差异）**：改动了哪些文件、哪些行。
- **讨论区**：审查者与作者的对话记录。
- **审查意见**：逐行评论、批准/请求修改。
- **CI 结果**：自动化检查（测试、构建）的通过情况。

### 1.2 两种典型场景

| 场景 | 流程 | 适用 |
| :--- | :--- | :--- |
| 团队内部 | 直接在同一仓库建分支 → PR 合并到 main | 有写权限的成员 |
| 开源贡献 | Fork 上游仓库 → 在 fork 开发 → 跨仓库 PR | 外部贡献者 |

> 开源贡献的 Fork 流程详见 011 篇《Fork 工作流》，本篇以**团队内部**为主线，结尾补充 Fork 差异点。

### 1.3 为什么不用直接推送

直接推 main 没有审查、没有讨论记录、无法拦截低级错误。PR 把"开发中"与"可合并"之间加了一道**人工 + 自动化双重闸门**。

## 2. 阶段一：准备（分支与远程）

```bash
# 1. 确保本地 main 最新
git checkout main
git pull origin main

# 2. 创建功能分支（命名规范见 005 篇）
git checkout -b feat/add-login

# 3. 开发完成，提交（使用约定式提交）
git add .
git commit -m "feat: add login page"

# 4. 推送并设置上游追踪
git push -u origin feat/add-login
```

> 分支从**最新的 main** 创建，能大幅减少合并冲突。推送后 GitHub 仓库页会显示黄色横幅"Compare & pull request"。

## 3. 阶段二：发起 PR

### 3.1 网页操作

1. 点击 **Compare & pull request**（或 Pull requests → New pull request）。
2. **base** 选目标分支（上游的 `main`），**compare** 选功能分支（`feat/add-login`）——这一步最容易出错，务必确认页面顶部的 base repository 和 base branch。
3. 填写标题与描述（参考模板见 005 篇）。
4. 右侧栏可：指派审查者（Reviewers）、关联 Issue（Development）、打标签、选里程碑。
5. 点击 **Create pull request**。

### 3.2 关联 Issue 自动关闭

在描述中写入 `Closes #12`，合并时会自动关闭 Issue #12。

### 3.3 用 gh 创建

```bash
gh pr create --title "feat: add login" --body "Closes #12"
# 或 --fill 用提交信息自动填充
gh pr create --fill
```

## 4. 阶段三：代码审查

### 4.1 审查者的操作

1. 收到 PR 通知，进入 PR 页面看 **Files changed** 标签页。
2. 逐行阅读 diff，在具体行上留下评论。
3. 对 PR 做出三种结论之一：

| 结论 | 含义 | 后续 |
| :--- | :--- | :--- |
| Comment | 仅评论，不阻塞 | 作者可选择性回复 |
| Approve | 批准合并 | 满足其他条件即可合并 |
| Request changes | 请求修改 | 作者必须修改后重新请求审查 |

### 4.2 作者的配合

- 对每条评论**逐条回复**：修改说明或解释原因。
- 修改代码后推送到**同一分支**，PR 自动更新，审查者重新审查。
- 回复评论时可用 `@用户名` 通知审查者"已修改，请复核"。

```bash
# 作者根据意见修改
git add .
git commit -m "fix: address review feedback"
git push
```

> 小提示：功能分支合入前，如果 main 有了新提交，先 `git pull origin main` 同步再推，可避免合并时冲突。

## 5. 阶段四：合并

### 5.1 三种合并策略

| 策略 | 效果 | 适用 |
| :--- | :--- | :--- |
| Create a merge commit | 保留全部提交历史，多一个合并提交 | 希望保留开发过程 |
| Squash and merge | 全部压缩成一个提交，历史最干净 | 功能分支提交琐碎时（最常用） |
| Rebase and merge | 线性历史，不产生合并提交 | 追求整洁线性历史 |

### 5.2 合并操作

1. 确认所有**状态检查（CI）通过**（绿灯）。
2. 确认所有审查已批准（若配置了分支保护）。
3. 点击 **Merge pull request**，可选勾选 **Delete branch** 自动删除已合并分支。
4. 合并后，PR 描述中关联的 Issue 自动关闭。

### 5.3 命令行合并

```bash
gh pr merge 12 --squash --delete-branch
```

### 5.4 进阶合并机制：Draft PR、自动合并与合并队列

- **Draft PR（草稿 PR）**：功能还没完成时创建，标记为草稿，明确"暂不可合并"。适合早期征求反馈。准备就绪后点 **Ready for review** 转正。

```bash
# 创建草稿 PR
gh pr create --title "feat: big refactor" --body "WIP" --draft
```

- **自动合并（Auto-merge）**：PR 满足全部合并条件（审查通过、CI 通过）后自动执行合并，不用人等按钮。

```bash
# 标记 PR 在条件满足时自动合并
gh pr merge 12 --squash --auto
```

- **合并队列（Merge queue）**：团队协作繁忙时，PR 全部汇入队列，按序逐个验证合并，避免"合一个、坏一批"。

> 这些机制与分支保护规则配合使用（见 007 篇）：保护规则定义"什么条件能合"，自动合并/合并队列负责"条件满足就合"。

## 6. 阶段五：关闭与清理

```bash
# 删除本地已合并分支
git checkout main
git pull origin main
git branch -d feat/add-login

# 删除远程分支（若合并时未自动删除）
git push origin --delete feat/add-login
```

> 若 PR 最终**未合并而被关闭**（如需求取消）：直接在 PR 页面点 **Close pull request** 即可，本地分支删除同理。

## 7. 阶段六：Fork 场景的差异与同步上游

Fork 场景与团队内部唯一区别在于**远程来源**：

```bash
# 1. Fork 后克隆自己的 fork
git clone git@github.com:your-name/upstream-repo.git
cd upstream-repo

# 2. 添加"上游"远程（原始仓库）
git remote add upstream git@github.com:original-owner/upstream-repo.git
git remote -v   # origin=你的 fork，upstream=原仓库

# 3. 开发前先同步上游最新
git fetch upstream
git checkout main
git merge upstream/main
git push origin main

# 4. 创建分支开发，推送后到 GitHub 点 "Compare & pull request"
# 5. 提交 PR 时 base 选原仓库 main，compare 选你的分支
```

### 7.1 Fork PR 的常见坑

- **忘了同步上游**：fork 落后于上游时提 PR，diff 可能包含大量过时代码——先 `git fetch upstream` 再合并同步。
- **base 选错仓库**：Fork 场景的 base 是**原仓库**（不是你的 fork），compare 才是你的分支。
- **CI 权限受限**：部分开源项目要求维护者批准后才能运行 fork 的 Actions 工作流（"first-time contributor" 场景）。
- **提交身份**：确保 fork 仓库提交邮箱与你 GitHub 账户一致，避免贡献统计丢失。

## 8. 常见错误与对策

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| :--- | :--- | :--- | :--- |
| base 分支选错 | PR 合并进了错误仓库/分支 | 未核对页面顶部的 base repository/branch | 关闭错误 PR，重新创建；确认 base 是目标仓库的目标分支 |
| 大范围无关改动 | diff 几百个文件，审查困难 | 把格式化/重构混进了功能 PR | 撤销无关改动；格式化单独开一个 PR |
| 合并冲突 | `This branch has conflicts` | 与目标分支改动重叠 | 本地 `git pull origin main` 解决冲突后 `git push`；或用网页冲突编辑器 |
| CI 检查失败 | 状态检查红叉，无法合并 | 测试/构建/语法未通过 | 查看 CI 日志定位问题，修复后重新推送 |
| 无法合并 | Merge 按钮灰色 | 分支保护规则未满足（缺批准/缺检查） | 补齐审查与状态检查；确认分支与 main 已同步 |
| 审查长期无回应 | PR 无人问津 | 未指派审查者或描述不清 | 明确指派 Reviewers；补全 PR 描述与测试说明 |

### 8.1 安全审查要点（供审查者使用）

审查时除了功能正确性，重点检查以下安全隐患：

- **敏感信息**：diff 中是否出现 `.env`、密钥、Token、连接串、个人信息。
- **依赖风险**：依赖升级是否引入破坏性变更或已知漏洞（配合 Dependabot 提醒，见 016 篇）。
- **权限控制**：新接口/新功能是否缺少权限校验，是否存在越权访问。
- **注入风险**：字符串拼接 SQL/命令/HTML 的地方是否做了参数化或转义。
- **错误处理**：异常是否被静默吞掉，是否会泄露内部堆栈信息。

## 10. 一句话记忆

**PR 全流程六步走：分支开发 → 推送 → 发起 PR（核对 base）→ 审查修改 → 合并（Squash 最常用）→ 清理关闭；Fork 场景多配一个 upstream 远程同步即可。**

### 延伸阅读

- Fork 工作流详解，见 011 篇《Fork 工作流》。
- 分支模型与保护规则（PR 的闸门配置），见 007 篇《分支模型与分支保护规则》。
- 协作规范（Commit 信息/PR 模板/审查清单），见 005 篇《协作开发规范》。
- CODEOWNERS 自动指派审查者，见 025 篇。
- gh 命令行操作 PR 速查，见 047 篇《Gh PR 管理》。
