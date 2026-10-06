---
order: 190
title: Pull Request 完整协作流程：从分支到合并的全生命周期
module: 'github'
category: 工具链
difficulty: intermediate
description: 以「给 FANDEX 仓库提交一个真实 PR」为主线走完 PR 全生命周期：建分支、推送、创建（含 Draft 与自动合并）、三种审查结论、三种合并策略、清理关闭，附 Fork 场景的 upstream 同步与四个专属坑，以及审查者安全清单。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'github/060-GitCommitPush'
  - 'github/190-CODEOWNERS'
  - 'github/200-ForkWorkflow'
  - 'github/170-BranchModelBranchRule'
prerequisites:
  - 'github/060-GitCommitPush'
---

## 前置知识

- 已完成 [Git 提交与推送](/github/060-GitCommitPush)：会建分支、提交、推送；
- 知道 Conventional Commits 的基本格式（[commit --amend](/git/090-GitCommitAmend) 第 5 节的速记即可）。

## 学习目标

读完本文你将能够：

1. 独立走完 PR 全生命周期：分支 → 推送 → 创建 → 审查 → 合并 → 清理；
2. 说清 base 与 compare 的方向含义，避免「合错方向」这个最高频事故；
3. 理解三种合并策略的差异，知道 Squash 为什么最常用；
4. 处理 Fork 场景的 upstream 同步，并按安全清单完成一次像样的代码审查。

预计 60 分钟，建议拿自己的任意仓库边读边做。

## 1. 问题：直接 push 到 main 会发生什么

假设你独自维护一个仓库，一直直接 `git push origin main`。某天你把一处「顺手重构」和「修 bug」混在一次推送里推了上去，CI 红了，但你已经分不清是哪半边出的问题——回退只能整包退。

直接推 main 的结构性缺陷：**改动进入主干之前，没有任何人（包括你自己）对它做过一次整体检阅**。Pull Request（PR）补的就是这道闸门：改动先待在自己的分支里，以「diff + 讨论区 + CI 结果」的形式完整呈现，人工批准且检查全绿后才放行。FANDEX 仓库就是这样运作的——所有文档与代码改动都经 PR 合入 main，Actions 在合并前自动跑构建校验。

本篇以一个真实场景走完全程：你发现 FANDEX 某篇文档有一处错字，要提交一个修正 PR。

## 2. 阶段一：分支与提交

```bash
git clone https://github.com/fanquanpp/FANDEX.git
cd FANDEX
git pull                                  # 从最新 main 出发，能大幅减少冲突

git switch -c docs/fix-quickstart-typo    # 从 main 拉出功能分支
# ……修正那处错字……
git add cnt-content/full/001-start/010-xxx.md
git commit -m "docs(start): 修正快速上手章节错字"
git push -u origin docs/fix-quickstart-typo
```

两条纪律决定 PR 的质量：

- **一个 PR 只装一件事**。错字修正就别捎带格式化——审查者面对 3 行 diff 会认真看，面对 300 行会直接点 Approve；
- **分支从最新 main 拉出**。分支名用 `类型/短描述`（docs/、feat/、fix/），和提交信息的 Conventional Commits 前缀保持同一套词汇。

## 3. 阶段二：创建 PR

推送后，仓库页会出现黄色横幅 **Compare & pull request**，点击进入创建表单。表单顶部两个下拉框是全流程最容易出错的地方：

- **base**：改动要合**进**哪里的哪个分支（本例：`fanquanpp/FANDEX` 的 `main`）；
- **compare**：改动**来自**哪个分支（本例：`docs/fix-quickstart-typo`）。

读法是从右到左：「把 compare 的改动合进 base」。方向反了，diff 会显示出一些莫名其妙的内容——看到时先回来核对这两个框。

标题写清「改了什么」，描述写清「为什么改、怎么验证」。两件事让 PR 不好写也值得写：

```markdown
Closes #42
```

描述里写上 `Closes #42`（同义还有 Fixes / Resolves），合并时 GitHub 会自动关闭 42 号 Issue——Issue 与 PR 的账目就此对上。

命令行党全程不碰浏览器（[GitHub CLI](/github/440-GitHubCLI)）：

```bash
gh pr create --fill          # --fill：用首个提交的标题与正文自动填充表单
gh pr create --draft         # 还没写完？先建草稿 PR，明确「暂不可合并」， early feedback 用
gh pr merge --auto --squash  # 标记为：条件满足（审查通过 + CI 绿）就自动合并
```

Draft 和 auto-merge 是两个大幅减少等待的机制：草稿 PR 让你敢于早开工早讨论；自动合并让你不用蹲守最后一个绿灯。大型团队还有合并队列（merge queue），把待合 PR 排队逐个验证，避免「合一个、坏一批」，用到了再研究。

## 4. 阶段三：审查

审查者进入 PR 的 **Files changed** 标签页，逐行读 diff，可以在任意行上留评论。对整个 PR 的结论只有三种：

| 结论 | 含义 | 后续 |
| :--- | :--- | :--- |
| Comment | 只评论，不表态 | 作者自行斟酌 |
| Approve | 批准 | 满足其他条件即可合并 |
| Request changes | 要求修改 | 必须改完重新请求审查 |

作者这边的配合动作只有一条原则：**把新提交推到同一个分支**，PR 会自动更新，审查者只需看增量。不需要关掉 PR 重开一个。

```bash
# 根据审查意见修改后
git add .
git commit -m "docs(start): 按审查意见补充示例"
git push
```

审查意见建议逐条回复（哪怕是「已按建议修改」加 commit 链接），这是团队的知识沉淀；配置了 [CODEOWNERS](/github/190-CODEOWNERS) 的仓库会自动把对应目录的负责人拉进审查，不用手动 @。

审查者除了看功能对不对，还有一份安全清单值得逐项过：diff 里有没有密钥、token、连接串？依赖升级有没有破坏性变更？新增接口有没有权限校验？字符串拼 SQL / 命令 / HTML 的地方参数化了吗？异常是不是被静默吞了？功能正确而安全翻车的 PR，比功能没写完的 PR 危害大得多。

## 5. 阶段四：合并

合并按钮亮起的条件（配置了[分支保护](/github/170-BranchModelBranchRule)的仓库）：CI 检查全绿 + 要求的审查已批准。届时从三种策略里选：

| 策略 | 效果 | 适用 |
| :--- | :--- | :--- |
| Create a merge commit | 保留分支全部提交 + 一个合并提交 | 提交本身有叙事价值 |
| Squash and merge | 整个分支压成主干上的一个提交 | 分支里一堆 "fix typo" 琐碎提交（最常用） |
| Rebase and merge | 提交逐个垫到 main 后，无合并提交 | 追求线性历史 |

选型的判断标准就一条：**主干历史是给未来的人看的**。功能分支上的「wip」「fix again」没人想看，所以琐碎提交的分支用 Squash 压成一个干净的提交；只有每个提交都值得留名的分支才用 merge commit。FANDEX 的文档 PR 基本都走 Squash。

```bash
gh pr merge --squash --delete-branch    # 合并并顺手删除远程分支
```

## 6. 阶段五：清理与收尾

合并后本地同步并删掉已完成的分支，防止下次误用：

```bash
git switch main
git pull
git branch -d docs/fix-quickstart-typo    # -d 只删已合并分支，误删未合并的会被拒绝
```

PR 被关闭而未合并（需求取消等）：页面上 Close pull request 即可，分支清理同上。已合并的 PR 不能重开——要改动就开新 PR。

## 7. Fork 场景：多一个 upstream 的差异点

没有仓库写权限的外部贡献者走 [Fork 工作流](/github/200-ForkWorkflow)：先把仓库 Fork 到自己账号，流程与上面完全相同，唯一区别是本地要多配一个「上游」远程：

```bash
git clone https://github.com/你的用户名/FANDEX.git
cd FANDEX
git remote add upstream https://github.com/fanquanpp/FANDEX.git
git remote -v     # origin 指向你的 fork，upstream 指向原仓库

# 每次开工前同步上游
git fetch upstream
git switch main
git merge upstream/main
git push origin main
```

Fork 场景的四个专属坑：

1. **忘了同步上游**：fork 落后于原仓库就提 PR，diff 会夹带大量过时代码，维护者第一眼就是劝你先同步；
2. **base 选错仓库**：跨仓库 PR 的 base 必须是**原仓库**的 main，compare 才是你的分支——创建页会默认填好，但自己 Fork 的同名仓库容易选串；
3. **CI 不跑**：首次向开源项目提 PR 时，Actions 默认要维护者手动批准才会执行，红灯迟迟不来不是你的问题；
4. **贡献统计丢失**：Fork 里提交的 `user.email` 与 GitHub 账号不一致时，PR 照常能合，但你的头像不会出现在贡献者列表。

## 8. 坑点与自检

| 现象 | 原因 | 对策 |
| :--- | :--- | :--- |
| PR 合进了错误分支/仓库 | base 没核对 | 关闭重开；创建时读一遍 base/compare 的方向 |
| diff 几百个文件 | 格式化或重构混进了功能 PR | 无关改动撤出；格式化单独开 PR |
| `This branch has conflicts` | 与 main 改动重叠 | 本地 `git pull origin main` 解决冲突后推送，或用网页冲突编辑器 |
| Merge 按钮灰色 | 保护规则未满足 | 缺批准补审查、缺绿灯修 CI；确认分支已同步 main |
| CI 失败无法合并 | 测试或构建红了 | 点进 Checks 看 Actions 日志定位（见 [Actions 入门](/github/370-GitHubActionsCICD)） |
| PR 长期无人审查 | 未指派或描述不清 | 指派 Reviewers；描述里写清动机与验证方式 |

自检四问：

1. 这个 PR 是不是只有一件事？
2. base 和 compare 我各说出仓库名和分支名了吗？
3. 描述里写了动机和验证方式吗？该关联的 Issue 关了吗？
4. 合并选的策略，主干历史会因此更好读还是更难读？

## 9. 练习

1. 基础：在自己的任意仓库走完全流程——分支、两个提交、PR、自己给自己 Approve（个人仓库允许）、Squash 合并、清理分支。
2. 场景：创建一个 Draft PR，观察它和普通 PR 在列表里的标识差异，然后 `gh pr ready` 将其转正。
3. 实验：往 PR 分支再推一个提交，回 PR 页面确认 diff 增量更新了；再把 main 前进一格（本地改 main 并推送），观察 PR 出现冲突提示并用本地解决。
4. 实战：给一个你使用的开源项目提一个真实的小 PR（文档错字即可），亲历 Fork、同步上游、跨仓库 base 的完整链路。

## 下一步

- [Fork 工作流](/github/200-ForkWorkflow)：第 7 节只是差异点，完整的开源协作模型在那边展开；
- [分支模型与分支保护规则](/github/170-BranchModelBranchRule)：合并按钮亮起的条件是怎么配置出来的；
- [GitHub Actions 入门](/github/370-GitHubActionsCICD)：PR 里那盏绿灯背后是什么在工作。
