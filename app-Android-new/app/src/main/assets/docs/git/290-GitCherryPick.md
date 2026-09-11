---
order: 290
title: git-cherry-pick 选择性移植提交
module: 'git'
category: 工具链
difficulty: intermediate
description: git cherry-pick 详解：选择性移植提交、范围语法、冲突处理与幂等性陷阱。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/130-MergeConflictResolution'
  - 'git/270-GitRebase'
  - 'git/400-GitFormatPatch'
prerequisites:
  - 'git/100-GitBranchManagement'
---

## 前置知识与学习目标

**前置知识**：分支的创建与切换、提交与合并冲突的基本处理。

学完本文你应当能够：

1. 用 cherry-pick 把任意提交「复印」到另一条分支；
2. 正确使用单个、多个、范围三种指定方式（尤其 `A..B` 不含 A 这个坑）；
3. 处理 cherry-pick 冲突、空提交、以及合并提交的 `-m` 语义；
4. 判断什么时候该用 cherry-pick、什么时候该用 merge / rebase。

类比先行：merge 是把整条支流并回干流，rebase 是把支流整体搬家，而 cherry-pick 是**复印机**——从历史里挑出一页提交，复印一份贴到当前分支末尾。副本内容相同，但哈希是全新的（父提交、时间戳都变了）。

## 1. cherry-pick 是什么

`git cherry-pick <提交>` 把指定提交引入的**变更**重放到当前分支顶端，生成一个内容等价的新提交：

```text
原始状态:
  A---B---C main
       \
        D---E feature

git switch main && git cherry-pick D
  A---B---C---D' main          ← D' 复制了 D 的变更
       \
        D---E feature          ← 原提交原封不动
```

### 1.1 典型场景

| 场景             | 说明                                             |
| :--------------- | :----------------------------------------------- |
| 热修复移植       | 把 main 上的安全修复复制到仍受支持的发布分支    |
| 版本回移植       | 发布分支上打磨出的修复带回主干                  |
| 误提交搬迁       | 提交到了错误分支，复制到正确分支后撤销原提交    |
| 按功能拣选       | 整条分支还没到合并时机，只取其中一两个提交      |

### 1.2 与近亲命令的边界

- **merge**：引入对方分支的全部提交，保留历史结构；
- **rebase**：把一系列提交整体重放到新基底；
- **cherry-pick**：只重放你点名的提交，产生哈希不同的副本。

副本与新原作在对象层面毫无关联，后续再合并两条分支时，Git 依靠**补丁 ID（patch-id）**识别「这是同一变更」，多数情况能自动去重，但不能保证——这正是「同一变更拣选两次会得到重复提交」的根源。

## 2. 基本用法

```bash
# 单个提交
git cherry-pick 3f4a5b6

# 多个提交（按给定顺序依次重放）
git cherry-pick 3f4a5b6 7c8d9e0

# 范围：不含起点 A，含终点 B —— 与 git log 的区间规则一致
git cherry-pick 3f4a5b6..7c8d9e0

# 想包含起点，从它的父提交开始
git cherry-pick 3f4a5b6^..7c8d9e0

# 按分支名拣选：该分支存在而当前分支不存在的全部提交
git cherry-pick feature
```

范围语法是最高频的错误来源：`A..B` **左开右闭**，漏掉 A 的修正写法是 `A^..B`。

### 2.1 常用选项

| 选项            | 作用                                                             |
| :-------------- | :--------------------------------------------------------------- |
| `-n`（`--no-commit`） | 只应用变更到工作区与暂存区，不自动提交，便于合并多个拣选   |
| `-x`            | 提交消息末尾追加 `(cherry picked from commit <哈希>)`，留审计线索 |
| `-e`（`--edit`）| 提交前打开编辑器修改消息                                          |
| `--signoff`     | 追加 `Signed-off-by:` 签名行（开源协作常见要求）                 |
| `-m <编号>`     | 拣选**合并提交**时必须指定，见 2.2 节                            |
| `--empty=drop`  | 重放后变空的提交直接丢弃（2.45 前为 `--keep-redundant-commits` 等）|

注意：**作者信息默认就会保留**（author 字段原样复制，committer 变为你），`-x` 与作者无关，它只是在消息里记录来源哈希。

### 2.2 拣选合并提交：-m 的含义

合并提交有两个父提交，diff 相对谁而言是二义的，必须指定「相对哪条主线」：

```bash
git cherry-pick -m 1 <merge-commit>
# 1 = 相对第一父（合并时所在的分支，通常是 main）
# 2 = 相对第二父（被合并进来的 feature）
```

`-m 1` 表示「把这个合并引入的、相对主线的变更」重放出来。多数「把 feature 分支的合并整体复制」需求用 `main..feature` 范围逐个拣选更直观。

## 3. 冲突与异常处理

cherry-pick 的冲突处理与 merge 同构，但有几个专属细节。

### 3.1 标准冲突流程

```bash
git cherry-pick 3f4a5b6
# error: could not apply 3f4a5b6... fix: token refresh
# hint: After resolving the conflicts, mark them with "git add/rm <pathspec>"

# 1) 手工解决冲突标记
vim src/auth.js

# 2) 标记已解决
git add src/auth.js

# 3) 继续（以当前解决的成果完成本提交）
git cherry-pick --continue

# 或者：跳过这个提交继续后面的
git cherry-pick --skip

# 或者：整体放弃，回到操作前的状态
git cherry-pick --abort
```

### 3.2 幂等性：重复拣选的两种结局

```bash
git cherry-pick 3f4a5b6
# The previous cherry-pick is now empty, possibly due to conflict resolution.
# 如果你坚持再拣一次已存在的变更：
#   * 若变更完全一致：Git 提示空提交并建议 drop / skip
#   * 若上下文已变：产生一个「内容重复但补丁不同」的冗余提交
```

判断某分支有哪些提交还没进入当前分支，用 `git cherry`（`+` 表示未应用，`-` 表示等价补丁已存在）：

```bash
git cherry -v main feature
# + 3f4a5b6 fix: token refresh      ← 尚未进入 main
# - 7c8d9e0 docs: update README     ← main 里已有等价补丁
```

### 3.3 中断状态的现场与恢复

cherry-pick 进行中，Git 在 `.git/sequencer/` 记录队列进度，并设置 `CHERRY_PICK_HEAD` 指向正在重放的提交；冲突解决到一半可以 `git cherry-pick --abort` 全部回退。若 abort 因冲突现场被污染而失败，`git reset --merge` 是兜底手段（配合 reflog 永远能回到起点）。

## 4. 完整会话：热修复移植

```bash
# 场景：main 上刚修复了一个登录崩溃 Bug，需要带给已发布的 release/2.1
git switch main
git log --oneline -3
# 8c9d0e1 (HEAD -> main) fix: guard null token in login
# 7b8c9d0 feat: remember me checkbox
# 6a7b8c9 ...

git switch release/2.1
git cherry-pick -x 8c9d0e1
# [release/2.1 4e5f6a7] fix: guard null token in login
#  (cherry picked from commit 8c9d0e1...)

git push origin release/2.1       # 发布分支的修复独立发版
```

反向场景「提交错了分支」：

```bash
# 误把功能提交推到了 main，想搬到 feature 上
git switch feature
git cherry-pick <误提交哈希>      # 1) 复制到正确分支

git switch main
git revert <误提交哈希>           # 2) 已推送：用 revert 撤销而非 reset（不改写共享历史）
git push                          # 3) 推送 revert
```

## 5. 陷阱与调试

- **`A..B` 丢起点**：与 `git log A..B` 同为左开右闭；要含 A 写 `A^..B`。
- **`-x` 被当成「保留作者」**：作者默认保留；`-x` 只追加来源哈希注释。
- **拣选合并提交报错 `is a merge but no -m option was given`**：补上 `-m 1` 或 `-m 2`，先想清楚相对哪条主线。
- **拣选后哈希与原提交不同**：这是设计而非事故；追溯来源靠 `-x` 留下的注释或 `git log --cherry-pick --left-right main...feature`。
- **长期互相 cherry-pick 两条分支**：会造成补丁漂移，后续正式合并时冲突翻倍；它适合偶发移植，不适合当同步手段（那是 rebase / merge 的职责）。
- **拣选产生空提交**：变更已存在时默认建议跳过；确需保留用 `--empty=keep`（旧版本为 `--keep-redundant-commits`）。

## 小结

**初学者要点**

- cherry-pick = 复印提交：内容相同、哈希全新、原提交不受影响。
- 范围 `A..B` 不含 A；单个、多个、`分支名` 三种指定方式按需选用。
- 冲突流程与 merge 一致：改文件 → `add` → `--continue`；`--abort` 随时全身而退。

**进阶注意**

- `-m` 用于合并提交，编号是「相对第几个父提交」；`-x` 是审计线索，不是作者选项。
- 重复拣选受补丁 ID 匹配影响，可能空提交也可能冗余提交；`git cherry` 是对账工具。
- 已推送的误提交用 revert 撤销；cherry-pick 是点对点的移植工具，不是分支同步策略。
