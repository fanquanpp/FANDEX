---
order: 410
title: git-worktree 多工作树并行
module: 'git'
category: 工具链
difficulty: intermediate
description: git worktree 详解：多工作目录并行检出、链接原理、锁定与清理管理。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/100-GitBranchManagement'
  - 'git/120-GitStash'
  - 'git/220-GitFlowGitHubFlowComparison'
prerequisites:
  - 'git/110-HEADPointerBranchEssence'
---

## 前置知识与学习目标

**前置知识**：理解分支、工作区与 HEAD 的关系。

学完本文你应当能够：

1. 为不同分支建立并行的独立工作目录，替代「stash + 切分支」的来回横跳；
2. 管理工作树的生命周期（列出、移动、锁定、删除、清理）；
3. 理解链接工作树与主仓库共享什么、隔离什么。

类比先行：普通的多分支开发像**只有一张桌子的办公室**——换任务就要把桌上的东西全部收进抽屉（stash）再摆另一套。worktree 相当于给每个任务**单独配一张桌子**，所有桌子共用同一个文件柜（`.git` 对象库），走过去坐下就能干活。

## 1. worktree 是什么

`git worktree` 让同一个仓库检出多个工作目录，每个目录停在各自的分支（或提交）上：

```text
~/project/            主工作树 → main
~/project-feature/    链接工作树 → feature
~/project-hotfix/     链接工作树 → hotfix/bug-123
                 ↑
        三者共享 ~/project/.git/ 中的对象库与引用
```

与「克隆两份仓库」相比，worktree 共享全部对象与引用：分支列表、tag、远程配置完全一致，磁盘只多占检出文件的成本。

## 2. 基本用法

```bash
# 为已有分支建工作树
git worktree add ../project-feature feature

# 新建分支并检出（紧急修复场景一步到位）
git worktree add -b hotfix/bug-123 ../hotfix main

# 检出到指定提交/标签（分离 HEAD，只读查看场景）
git worktree add --detach ../project-v1 v1.0.0

git worktree list
# /home/user/project           8c9d0e1 [main]
# /home/user/project-feature   5e6f7a8 [feature]
# /home/user/hotfix            3f4a5b6 [hotfix/bug-123]
```

每个工作树内就是正常的 Git 环境：独立的工作区、暂存区、HEAD；`git log`、`git commit`、`git push` 照常用。

### 2.1 生命周期管理

```bash
git worktree remove ../project-feature        # 干净的工作树直接删
git worktree remove --force ../project-feature # 有未提交修改时强制删
git worktree move ../hotfix ~/work/hotfix      # 换个盘符/目录继续用
git worktree lock ../release-checkout          # 锁定，防止 prune 误清（部署挂载常用）
git worktree unlock ../release-checkout

# 手动删了目录之后，清掉主仓库里的登记
git worktree prune --dry-run     # 先看会清理谁
git worktree prune
```

## 3. 典型场景

### 3.1 紧急修复不打断当前任务

```bash
# 正在 feature 上写代码，线上出了 P0
git worktree add ../hotfix -b hotfix/bug-123 main
cd ../hotfix
# 修复、测试
git commit -m "fix: resolve bug 123"
git push origin hotfix/bug-123
cd ../project && git worktree remove ../hotfix
```

对比 stash 流程：不中断思路、不留「忘了 pop」的隐患，且 feature 的工作区全程原样。

### 3.2 审查与验证他人代码

```bash
# 把同事的 PR 分支检出到独立目录跑测试
git fetch origin
git worktree add ../review origin/colleague/feature
cd ../review && npm install && npm test
```

审查环境与你手头工作完全隔离，测完 `worktree remove` 即可。

### 3.3 长任务并行与版本对照

```bash
# 长期挂着的发布验证目录
git worktree add ../release-checkout release/2.1
git worktree lock ../release-checkout

# 两个版本并排对比（IDE 同时开两个目录）
git worktree add --detach ../v1-compare v1.0.0
```

## 4. 链接工作树的原理

在链接工作树的根目录，`.git` 不再是目录而是一个**指针文件**：

```bash
cat ../hotfix/.git
# gitdir: /home/user/project/.git/worktrees/hotfix
```

主仓库的 `.git/worktrees/<名字>/` 下存放该工作树的 HEAD、index 与检出的引用。这解释了两条限制：

- **同一分支不能同时检出在两个工作树**：分支指针只有一份，两个 HEAD 同时推动它会互相覆盖；Git 会直接拒绝（报 `already checked out`）。确需两处同分支调试可给其中一个用 `--detach`；
- **prune 依据登记清理**：目录被手动删除后登记仍在，需要 `git worktree prune`；反过来 `prune` 不会动 `lock` 着的工作树。

## 5. 陷阱与调试

- **`fatal: '<分支>' is already checked out`**：想检出的分支已在另一个工作树；换分支、或对该工作树用 `--detach`。
- **依赖目录跟着翻倍**：`node_modules`、构建产物每棵工作树各一份；用 pnpm 等内容寻址包管理器，或在工作树里软链回主工作树的依赖目录。
- **忘了工作树的存在**：几个月后 `branch -D` 报错说分支被占用，先 `git worktree list` 盘点。
- **在链接工作树里 clone / init 了新仓库**：会把共享优势清零；新仓库需求请直接 `git clone`。
- **子模块不会自动就位**：链接工作树需要单独 `git submodule update --init`。
- **IDE 全局搜索跨目录污染**：搜索范围限定在当前工作树根目录，避免搜到兄弟工作树的同名文件。

## 与替代方案的对比

| 方案                 | 切换成本 | 磁盘占用     | 中断恢复         | 适用场景                     |
| :------------------- | :------- | :----------- | :--------------- | :--------------------------- |
| `git switch` 切分支  | 需先安顿工作区 | 一份     | 依赖 stash/提交  | 单任务顺序开发               |
| `git stash` + 切换   | 中       | 一份         | stash 栈管理     | 偶发插队                     |
| **worktree**         | 无       | 每树一份检出 | 天然隔离，零恢复 | 并行长任务、审查、版本对照   |
| 额外 clone           | 无       | 整仓 × N     | 天然隔离         | 需要完全隔离的环境（如 CI 模拟）|

选型直觉：中断成本高的任务（装依赖、跑构建）值得一张「专桌」；随手的小插队 stash 即可。配合 IDE 时，把各工作树目录分别作为工作区打开，Windows 下注意杀毒软件对多份 `node_modules` 的扫描开销，可把链接工作树建在同一物理盘的高速目录。

## 借用场景：CI 与多版本构建

worktree 同样适合无人值守场景：

```bash
# 同一仓库内一次检出两个版本并行构建（如对比性能/出双渠道包）
git worktree add ../build-v1 v1.4.0
git worktree add ../build-v2 v2.0.0
(cd ../build-v1 && ./build.sh) & (cd ../build-v2 && ./build.sh) & wait
git worktree remove ../build-v1 ../build-v2
```

相比再 clone 一份省去对象传输；构建产物各树独立，互不覆盖。CI 缓存目录按工作树路径区分即可。

## 小结

**初学者要点**

- worktree = 一仓多桌：每桌一个分支、共享一个对象库。
- 紧急修复用 `worktree add -b <分支> <路径> <基底>` 三合一，完事 remove。
- `list` 盘点、`prune` 清登记、`lock` 防误清。

**进阶注意**

- 同名分支不可双检出，是单指针设计而非 bug；用 detach 绕行只读场景。
- 链接工作树的 `.git` 是指向 `.git/worktrees/<名>/` 的指针文件，理解它即可自行排障。
- 依赖安装成本是 worktree 的主要代价，配套包管理器或软链策略后体验最佳。
