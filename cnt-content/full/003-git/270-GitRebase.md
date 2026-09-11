---
order: 270
title: git-rebase 变基与改写历史
module: 'git'
category: 工具链
difficulty: advanced
description: git rebase 详解：变基语义、冲突处理、交互式改写、黄金法则与 force-with-lease 安全推送。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/130-MergeConflictResolution'
  - 'git/280-InteractiveRebase'
  - 'git/320-GitRevertResetComparison'
  - 'git/210-GitFlowGitHubFlow'
prerequisites:
  - 'git/110-HEADPointerBranchEssence'
---

## 前置知识与学习目标

**前置知识**：理解提交链、合并冲突的基本处理、远程跟踪分支。

学完本文你应当能够：

1. 说清 rebase 与 merge 在历史结构、冲突粒度、可逆性上的本质差异；
2. 独立完成变基、解决逐提交冲突、安全推送；
3. 用 `--onto` 处理复杂迁移，用 `pull --rebase` 保持本地提交整洁；
4. 牢记黄金法则，知道 force push 什么时候安全。

类比先行：merge 是**把两条道路并成路口**（保留来路，加一个路标式合并提交）；rebase 是**把你的小路整段平移到大路尽头**——小路的每块砖（提交）被拆下来重新铺过，砖的编号（哈希）全变了，但路面内容不变。

## 1. rebase 是什么

`git rebase <新基底>` 把「当前分支相对于基底分支独有的提交」摘下来，**逐个重放**到基底分支的最新提交之后：

```text
变基前:
  A---B---C main
       \
        D---E feature          git switch feature && git rebase main

变基后:
  A---B---C---D'---E' main, feature
```

重放产生的 D'、E' 是**全新提交**（新哈希），内容等价于原提交但父链不同。原提交对象在 reflog 过期前仍可找回（见 [git reflog](git/260-GitReflog)）。

### 1.1 rebase vs merge 的本质差异

| 维度       | merge                        | rebase                             |
| :--------- | :--------------------------- | :--------------------------------- |
| 历史结构   | 保留分叉，产生合并提交       | 削平分叉，线性历史                 |
| 提交对象   | 原提交不变                   | 生成哈希不同的副本                 |
| 冲突       | 一次性解决所有分叉差异       | 逐提交解决（可能同一处反复出现）   |
| 可逆性     | 删掉合并提交即可             | 需 reflog 或 force push 补救       |
| 对协作者   | 无影响                       | 已推送提交被改写，必须 force push  |
| 典型用途   | 功能合入主干（保留集成点）   | 功能分支同步主干更新、发布前整理   |

两者不是对手而是分工：**私有提交先 rebase 整形，汇入共享分支用 merge**（或团队约定 squash merge）。

## 2. 基本变基

```bash
# 把 feature 变基到 main 最新
git switch feature
git fetch origin
git rebase main
# Successfully rebased and updated refs/heads/feature.

# 合写形式：先把 feature 切出来再变基
git rebase main feature
```

内部过程五步：找共同祖先 → 把独有提交逐个存为补丁 → 把当前分支指到 main 顶端 → 按序重放补丁 → 每个补丁落为新提交。

### 2.1 逐提交冲突

与 merge 的一次性冲突不同，rebase 的冲突出现在「正在重放的那个提交」上：

```bash
git rebase main
# CONFLICT (content): Merge conflict in src/auth.js
# error: could not apply 8c9d0e1... fix: token refresh

# 1) 解决冲突标记
vim src/auth.js

# 2) 标记解决（rebase 中 add 即视为接受当前提交的内容）
git add src/auth.js

# 3) 继续重放剩余提交
git rebase --continue

# 或者：这个提交与基底重复，跳过它
git rebase --skip

# 或者：全部放弃，回到 rebase 前的原始状态
git rebase --abort
```

变基进行中 Git 处于分离 HEAD，`.git/rebase-merge/` 记录队列进度；`ORIG_HEAD` 与 reflog 都记着起点，任何时刻都能全身而退。

### 2.2 脏工作区怎么办

rebase 要求工作区干净。有未提交改动时，让 Git 自动 stash / pop：

```bash
git rebase --autostash main
# 或设为默认：git config rebase.autoStash true
```

## 3. 拉取也变基：pull --rebase

本地有提交、远程又有新提交时，普通 `git pull` 会制造一个「拉取合并提交」；变基式拉取把你的本地提交搬到远程提交之后，历史保持线性：

```bash
git pull --rebase origin main

# 团队推荐的全局配置（Git 2.27+ 会提示你显式选择）
git config --global pull.rebase true
```

这是 rebase 最日常的用法——它只重放**未推送的本地提交**，天然不触碰黄金法则。

## 4. 交互式变基（概要）

`git rebase -i <基底>` 会打开编辑器列出待重放提交，允许改写、合并、删除、调序：

```text
pick  8c9d0e1 feat: add login form
pick  5e6f7a8 fix: typo
pick  3f4a5b6 fixup: address review

# 常用指令：
# p/pick 保留   r/reword 改消息   e/edit 暂停修改
# s/squash 并入前一提交并合并消息   f/fixup 并入并丢弃消息
# d/drop 删除提交
```

详细的指令、autosquash 与实战编排见 [交互式 rebase](git/280-InteractiveRebase)。这里给出最常用的配套工作流：

```bash
# 随手记下的修复提交，最后自动归并到目标提交
git commit --fixup=8c9d0e1
git rebase -i --autosquash main     # fixup 提交自动排到 8c9d0e1 之后并标记 f
```

## 5. --onto：精确控制重放范围

完整形式是 `git rebase --onto <新基底> <排除起点> <分支>`，含义为「把 `<排除起点>..<分支>` 的提交重放到 `<新基底>` 上」。它解决「只想搬一部分提交」的问题：

```text
变基前:
  A---B---C---D main
       \
        E---F---G feature      其中 F、G 才是想要的

git rebase --onto main E feature

变基后:
  A---B---C---D main
       \         \
        E---F     F'---G' feature
```

```bash
# 把 feature 上 E 之后的提交搬到 main 顶上
git rebase --onto main E feature
```

典型场景：功能分支从过时的基底长出来、或要把某段提交从一条链上「截下」接到另一条链上。

## 6. 黄金法则与安全推送

### 6.1 不要 rebase 已推送给他人使用的提交

rebase 改写历史。若这些提交已被别人拉取，对方历史与你分叉，合并将产生重复提交、协作直接混乱：

```bash
# 危险：改写公共分支
git switch main
git rebase feature
git push --force        # 覆盖远程 main，灾难

# 安全：只 rebase 自己未推送/独占的提交
git switch feature      # 个人功能分支
git rebase main
git push
```

经验法则：**rebase 只用于「只存在于你自己仓库里的提交」**；共享分支上的纠错用 revert（见 [git revert](git/310-GitRevert)）。

### 6.2 force push 一律用 --force-with-lease

改写自己独占分支的历史后，普通 push 会被拒绝，需要 force。`--force-with-lease` 只在「远程分支仍停留在你上次看到的位置」时才覆盖——若期间有他人推送（或你在别处的推送），它会拒绝，防止误删别人工作：

```bash
git push --force-with-lease
# 被拒时先 fetch 检查远程发生了什么，再决定
```

## 7. 陷阱与调试

- **变基后 push 被拒（non-fast-forward）**：历史已被改写，属预期行为；独占分支用 `--force-with-lease`，共享分支停手改用 revert。
- **同一冲突反复出现**：重放是逐提交的，多个提交改同一区域就会多次冲突；解决后可考虑 `git rebase --continue` 前用 `git rerere`（复用已记录的解决方案）自动重放。
- **`rebase -i` 打开了错误的提交列表**：基准写多了一格（如 `HEAD~3` 想改最近 2 个）；任何时候 `--abort` 退出重来。
- **变基后 diff 看起来不对**：你在比较副本与原件的父链差异；用 `git log --oneline main..feature` 确认重放结果。
- **嵌套分支栈断裂**：基于 feature 又开了 feature2，变基 feature 后 feature2 还挂在旧链上；变基时开启 `rebase.updateRefs`（较新版本默认开启）可让栈内分支指针一起前移。

## 小结

**初学者要点**

- rebase = 摘下独有提交、逐个重放到新基底，哈希全新、历史线性。
- 冲突三键：`--continue` / `--skip` / `--abort`；脏工作区加 `--autostash`。
- 日常首选 `git pull --rebase` 整理本地提交，几乎无风险。

**进阶注意**

- 黄金法则：不 rebase 他人可能拉取过的提交；force push 只用 `--force-with-lease`。
- `--onto <新基底> <排除起点> <分支>` 是精确搬运提交区间的钥匙。
- 团队模型建议：私有提交 rebase 整形 → 合入共享分支用 merge 或 squash merge；共享分支纠错一律 revert。
