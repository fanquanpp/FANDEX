---
order: 110
title: HEAD 指针与分支本质
module: 'git'
category: 工具链
difficulty: intermediate
description: HEAD 指针机制与分支的本质：符号引用、分离 HEAD、引用解析与底层操作原理。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/100-GitBranchManagement'
  - 'git/240-ObjectModel'
  - 'git/260-GitReflog'
prerequisites:
  - 'git/060-ThreeTrees'
---

## 前置知识与学习目标

**前置知识**：理解三棵树模型，会创建与切换分支。

学完本文你应当能够：

1. 说清 HEAD 是什么、附着与分离两种状态的区别；
2. 理解「分支只是 40 个十六进制字符的文本文件」；
3. 用 `rev-parse`、`show-ref`、`symbolic-ref` 在底层观察引用；
4. 安全地进出 detached HEAD，并知道悬空提交如何找回。

类比先行：**分支是便利贴，HEAD 是你的书签**。仓库的历史是一条提交链，便利贴贴在链的某个节点上并可随时撕下来重贴；HEAD 标记「你现在正读到哪里」。读懂这一节，`checkout`/`switch`/`reset`/`rebase` 的行为都会从魔法变成常识。

## 1. HEAD：你现在的位置

### 1.1 HEAD 是符号引用

HEAD 通常不直接存提交哈希，而是存「另一个引用的名字」，这叫**符号引用**（symbolic ref）：

```bash
cat .git/HEAD
# ref: refs/heads/main        ← 我在 main 分支上

# 解析到最终提交哈希
git rev-parse HEAD
# 9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8091
```

`@` 是 HEAD 的简写：`git log @~2` 等价于 `git log HEAD~2`。

### 1.2 两种状态

**附着 HEAD（attached）**：`HEAD → refs/heads/main → commit`。此时提交会推动分支指针一起前进，历史不丢。

**分离 HEAD（detached）**：`HEAD → commit`（中间没有分支）。此时提交只推动 HEAD 自己，不会更新任何分支——新提交随时可能变成无人引用的悬空对象。

```bash
git switch --detach v1.2.0     # 现代写法：进入分离 HEAD 查看历史版本
# Note: switching to 'v1.2.0'.
# You are in 'detached HEAD' state....

git log --oneline -1           # 在此提交上做实验
```

### 1.3 进入分离状态的常见场景与出路

| 场景                     | 说明                                   |
| :----------------------- | :-------------------------------------- |
| 检出提交 / 标签查看历史  | `git switch --detach <commit\|tag>`    |
| rebase 过程中            | rebase 内部临时分离，结束后自动附着    |
| 子模块默认状态           | 子模块仓库常处于分离 HEAD（见子模块篇） |

分离状态下产生的提交，离开前要么挂到分支上，要么记下哈希：

```bash
git switch -c fix-experiment      # 把当前工作变成新分支（推荐）
# 或事后凭 reflog 找回
git reflog -5
git branch rescue 3f4a5b6         # 手动给悬空提交立分支
```

## 2. 分支的本质：一个指针文件

### 2.1 40 个字符而已

```bash
cat .git/refs/heads/main
# 9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8091
```

分支就是 `.git/refs/heads/` 下一个文本文件，内容只有一个提交哈希（SHA-1 为 40 个十六进制字符；SHA-256 仓库则为 64 个）。没有任何「分支历史」数据结构——历史由提交的 parent 链定义（见 [对象模型](git/240-ObjectModel)），分支只是链末端的标签。

### 2.2 为什么创建分支快如闪电

创建分支 = 写入一个小文本文件，时间复杂度 O(1)，与仓库大小无关。对比 SVN 这类把分支实现为目录拷贝的系统，这正是 Git 分支模型「鼓励多开分支」的物理基础：

```bash
git branch feature            # 瞬间完成
# 底层等价于：把当前 HEAD 的哈希写进 .git/refs/heads/feature
```

提交时指针的推移也只有一步：新 commit 的 parent 指向旧 tip，再把分支文件改写成新哈希。

```text
提交前: A ← B ← C ← main          HEAD → main
提交后: A ← B ← C ← D ← main      HEAD → main   （D.parent = C）
```

### 2.3 分支操作在底层发生什么

| 操作            | 底层动作                                                        |
| :-------------- | :-------------------------------------------------------------- |
| 创建分支        | 新建引用文件，写入当前哈希                                      |
| 切换分支        | 改写 HEAD 的符号引用 + 按目标提交更新工作区与 index             |
| 删除分支        | 删除引用文件（提交对象仍在，reflog 可救）                       |
| 快进合并        | 只把当前分支文件的哈希改写为目标提交，不产生新提交              |

```bash
git switch feature            # Git 2.23+ 的切换专用命令（推荐）
git branch -d feature         # 安全删除：未合并会拒绝
```

`switch` 与老牌 `checkout` 的分工：`checkout` 同时管「切分支」和「恢复文件」两件事，容易误操作；`switch` 只切分支、`restore` 只恢复文件，语义各自单一。

## 3. 引用体系与解析规则

### 3.1 引用的家谱

| 类型         | 路径                        | 例子                      |
| :----------- | :-------------------------- | :------------------------ |
| 本地分支     | `refs/heads/`               | `refs/heads/main`         |
| 远程跟踪分支 | `refs/remotes/<remote>/`    | `refs/remotes/origin/main`|
| 标签         | `refs/tags/`                | `refs/tags/v1.0.0`        |
| 特殊引用     | `.git` 根下                 | `HEAD`、`ORIG_HEAD`、`MERGE_HEAD` |

`ORIG_HEAD` 在 merge / rebase / reset 等大幅移动前自动记录旧位置，是悔棋的快捷入口；`MERGE_HEAD` 在合并进行中指向对侧分支。

### 3.2 简写解析顺序

写 `main`、`origin/main`、`v1.0.0` 时，Git 按固定优先级在四个命名空间中查找（同一名字多处存在时可能命中意外目标）。需要精确时写全路径，用 `git rev-parse --symbolic-full-name main` 查看实际解析到哪个命名空间。

### 3.3 打包引用与 reftable

引用多了以后，部分引用会被收进单一文本文件 `.git/packed-refs` 提高效率：

```text
9a1b2c3d... refs/heads/main
3f4a5b6c... refs/tags/v1.0.0
^2a3b4c5d...                  ← 附注标签的剥壳行，指向真实 commit
```

更新的方向是 **reftable** 后端（Git 2.45 起可用，`git init --ref-format=reftable`），以日志结构存储引用并内置变更历史，主要服务于大型仓库与 JGit 生态互通；传统 files 后端仍是默认，日常无需关心。

## 4. 底层观察工具箱

```bash
git show-ref                      # 列出全部引用及哈希
git symbolic-ref HEAD             # 查看 HEAD 指向的分支名
git rev-parse main feature        # 批量把名字解析成哈希
git rev-parse HEAD~3 HEAD^2       # 支持相对表达（~第一父回溯，^2第二父）
git merge-base main feature       # 两分支的最近共同祖先
git log main..feature --oneline   # feature 独有的提交
```

这些命令在脚本与排障里出场率极高：例如部署脚本常用 `git rev-parse --short HEAD` 把当前提交号写进构建产物。

## 5. 陷阱与调试

- **分离 HEAD 上提交完就 `git switch main`**：提交会「消失」。其实对象还在，`git reflog` 里能找到哈希，按 1.3 节立分支即可救回；养成「先建分支再实验」的习惯。
- **`git branch -D` 之后以为历史被删**：删除的只是指针文件，提交仍被 reflog 引用至过期（默认 90 天，见 [git reflog](git/260-GitReflog)）。
- **`HEAD^` 与 `HEAD~` 混淆**：`^n` 选「第 n 个父提交」（合并提交有多父），`~n` 沿第一父回溯 n 步；`HEAD~2` 等于 `HEAD~~`，但 `HEAD^2` 不是 `HEAD^^`。
- **同名引用歧义**：本地分支、远程分支、标签同名时简写解析可能不符合预期，脚本中一律写全路径（`refs/heads/...`）。
- **手动 `echo` 写 refs 文件**：能跑但不更新 reflog、不校验，仅限理解原理；真实操作用 `git update-ref`。

## 小结

**初学者要点**

- HEAD = 书签（符号引用），分支 = 便利贴（指针文件），提交链才存储真正的历史。
- 分支创建 O(1)、删除不删历史，放心多开分支。
- 切换分支用 `switch`，恢复文件用 `restore`，`checkout` 留给兼容场景。

**进阶注意**

- 分离 HEAD 上的提交不挂分支，出路是 `switch -c` 或事后 reflog 救援。
- `~` 与 `^` 是两套相对寻址；合并提交语境下切勿混用。
- `ORIG_HEAD` / `MERGE_HEAD` / `packed-refs` / reftable 是引用体系的进阶细节，排障与脚本中会用到。
