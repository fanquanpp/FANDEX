---
order: 260
title: git-reflog
module: 'git'
category: 工具链
difficulty: intermediate
description: git reflog 详解：引用日志原理、恢复误操作安全网、过期机制与悬空对象救援。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/080-GitRestoreFileOperation'
  - 'git/180-GitLogDetailed'
  - 'git/110-HEADPointerBranchEssence'
  - 'git/300-GitReset'
prerequisites:
  - 'git/060-ThreeTrees'
---

## 前置知识与学习目标

**前置知识**：理解 HEAD、分支指针与三棵树模型。

学完本文你应当能够：

1. 解释 reflog 与 log 的区别，读懂每条 reflog 记录；
2. 用 reflog 恢复 hard reset、误删分支、失败 rebase、误操作 stash 等各类「事故」；
3. 知道 reflog 的保存期限，以及什么时候连 reflog 也救不回来。

类比先行：`git log` 是**道路本身**（从当前位置沿 parent 回溯的提交链），reflog 是**行车记录仪**——不管你后来怎么倒车、掉头、换车道，每一次「HEAD 所在位置的变化」都被逐帧录下。只要录像还在，任何位置都能回去。

## 1. reflog 是什么

reflog（reference log）是 Git 为本地引用自动维护的**变更日志**。HEAD、每个分支的指针每次移动（提交、切换、重置、合并、变基……），Git 都会追加一条记录，存储在 `.git/logs/` 下：

```bash
git reflog
# 8c9d0e1 (HEAD -> main) HEAD@{0}: commit: feat: add login
# 5e6f7a8 HEAD@{1}: checkout: moving from feature to main
# 3f4a5b6 HEAD@{2}: commit: fix: token refresh
# 1a2b3c4 HEAD@{3}: reset: moving to HEAD~3
```

每条记录自右向左四段：**提交哈希 → 相对下标 `HEAD@{n}`（0 是最近）→ 动作描述 → 说明**。注意首列哈希是「移动后到达的位置」，不是离开的位置。

### 1.1 reflog 与 log 的区别

| 特性         | `git log`                    | `git reflog`                     |
| :----------- | :--------------------------- | :------------------------------- |
| 记录内容     | 提交历史（沿 parent 链）     | 引用指针的移动历史               |
| 能否看到丢弃的提交 | 不能（不可达即不显示） | 能（只要还在保留期内）           |
| 是否同步远程 | 推送后共享                   | 仅本地，每个仓库独立             |
| 默认保留期   | 永久（可达对象）             | 90 天（不可达条目 30 天）        |

「reflog 仅本地」这一属性同时是优点（无人窥探你的倒车记录）与风险（换机器、克隆新仓库都没有旧 reflog）。

## 2. 常见操作在 reflog 中的样子

| 操作                | 典型记录                              |
| :------------------ | :------------------------------------ |
| `git commit`        | `commit: feat: xxx`                   |
| `git switch`        | `checkout: moving from A to B`        |
| `git reset --hard`  | `reset: moving to HEAD~3`             |
| `git merge`         | `merge feature: Merge made by ...`    |
| `git rebase`        | `rebase (start)`、`rebase (pick): ...`|
| `git cherry-pick`   | `cherry-pick: fix: xxx`               |
| `git commit --amend`| `commit (amend): ...`                 |
| `git clone`         | `clone: from https://...`             |

除了 HEAD，分支也有自己的 reflog（分支被删后日志文件会保留一段时间，但引用名已不可解析，见 3.2）：

```bash
git reflog show main       # 查看 main 的移动历史
git reflog stash           # stash 栈的进出记录
git reflog --all           # 汇总查看所有引用的日志
```

## 3. 实战救援手册

### 3.1 恢复 reset --hard 丢掉的提交

```bash
git reset --hard HEAD~3        # 事故发生

git reflog
# 5e6f7a8 HEAD@{0}: reset: moving to HEAD~3    ← 这次事故本身
# 8c9d0e1 HEAD@{1}: commit: feat: real work    ← 事故前的位置

git reset --hard HEAD@{1}      # 回去
# 或者利用 reset 自动留下的书签一步恢复：
git reset --hard ORIG_HEAD
```

### 3.2 恢复误删的分支

`git branch -D` 删除的只是指针文件；找到它最后指向的提交即可重建：

```bash
git reflog
# 3f4a5b6 HEAD@{5}: checkout: moving from feature to main   ← 离开 feature 前的位置

git switch -c feature 3f4a5b6   # 重建分支（或 git branch feature 3f4a5b6）
```

已删除分支的日志在 `.git/logs/refs/heads/feature` 中保留至过期；但 `git reflog show feature` 在分支重建前无法按名解析，所以上面用 HEAD 日志定位。

### 3.3 恢复搞砸的 rebase

```bash
git rebase main                 # 处理冲突时乱了阵脚
git rebase --abort              # 第一选择：原地放弃

# 若已经 continue 完成但结果不对：
git reflog
# 9b8c7d6 HEAD@{0}: rebase (finish): returning to refs/heads/feature
# 1a2b3c4 HEAD@{1}: rebase (start): checkout main     ← 变基前的状态

git reset --hard HEAD@{1}       # 整个变基回滚
```

### 3.4 恢复 amend 之前的提交

```bash
git commit --amend -m "new message"

git reflog
# 8c9d0e1 HEAD@{0}: commit (amend): new message
# 5e6f7a8 HEAD@{1}: commit: old message      ← amend 前的原提交

git reset --soft HEAD@{1}       # soft 回去：旧提交内容回到暂存区
```

### 3.5 恢复误删的 stash

stash 本身也是一个引用（`refs/stash`），同样有 reflog。`stash drop` 之后按 `stash@{n}` 找回：

```bash
git reflog stash
# 4d5e6f7 stash@{0}: WIP on main: 8c9d0e1 feat: login
# 2c3d4e5 stash@{1}: WIP on main: ...        ← 被 drop 掉的那条

git stash apply 2c3d4e5         # 按哈希应用即可恢复
```

### 3.6 reflog 也找不到时：fsck 搜悬空对象

reflog 过期（或对象从未被引用过，例如 add 后未提交就被 --hard 覆盖的 blob）时，用对象库扫描兜底：

```bash
git fsck --lost-found
# dangling commit 7d8e9f0...
# dangling blob 6c7d8e9...

git show 7d8e9f0                # 逐个查看，找到后 cherry-pick / 手动恢复
```

## 4. 保留期与清理

### 4.1 默认过期规则

| 规则                         | 默认值 | 配置项                        |
| :--------------------------- | :----- | :---------------------------- |
| 一般条目过期                 | 90 天  | `gc.reflogExpire`             |
| 不可达条目过期               | 30 天  | `gc.reflogExpireUnreachable`  |

「不可达」指该位置已不被任何分支/标签引用（如被 reset 丢弃的提交）。过期由 `git gc` 及后台自动维护执行；清理 reflog 后对应对象在下次 gc 时被真正删除（见 [git-gc](git/420-GitGc)）。

```bash
# 自定义保留期（含引号写法均可）
git config --global gc.reflogExpire "90 days"
git config --global gc.reflogExpireUnreachable "30 days"

# 立即清除全部 reflog（慎用：毁掉所有后悔药，一般仅用于敏感信息清理）
git reflog expire --expire=now --expire-unreachable=now --all

# 删除单条记录
git reflog delete 'HEAD@{5}'
```

reflog 的写入由 `core.logAllRefUpdates` 控制（非裸仓库默认开启）；一般不要关闭，否则失去安全网。

## 5. 时间寻址与 diff

```bash
git reflog --date=iso                  # 带具体时间显示
git show 'HEAD@{yesterday}'            # 昨天此时 HEAD 所在的提交
git show 'HEAD@{2026-06-10 10:00:00}'  # 指定时刻的 HEAD 位置

git diff 'HEAD@{3}'                    # 当前与 3 步前的工作区差异
git diff 'HEAD@{5}' 'HEAD@{3}'         # 两个历史位置之间的差异
git show 'HEAD@{2}:src/app.js'         # 某历史位置上某个文件的内容
```

**时间语法务必加引号**：`HEAD@{...}` 中的花括号会被 bash 等 shell 做花括号展开，裸写可能报 `unknown revision` 或被拆成多个参数。

## 6. 陷阱与调试

- **「reflog 里怎么没有我刚丢的改动」**：reflog 只记录**已提交**（或已入对象库）内容的位置变化；从未 add/commit 的工作区修改无处可录。
- **`HEAD@{n}` 与 `branch@{n}` 混淆**：前者是 HEAD 的移动史，后者是该分支指针的移动史，同一 n 指向不同提交。
- **时间寻址没加引号**：shell 花括号展开导致诡异报错，一律 `'HEAD@{...}'`。
- **换机器后想恢复**：reflog 不随 push/clone 传输；跨设备救援靠提前推送分支或 bundle。
- **以为 expire = 立即删除对象**：过期只是标记，对象在 gc 后才物理消失；紧急找回就是与这两个时钟赛跑。

## 小结

**初学者要点**

- reflog 是本地指针移动的行车记录仪，`HEAD@{n}` 是回放控件。
- reset --hard、删分支、搞砸 rebase、丢 stash，恢复套路一致：查 reflog → 定位哈希 → reset --hard 或重建引用。
- 结束救援动作别忘 `reset` 到正确分支，避免滞留在分离 HEAD。

**进阶注意**

- 默认 90/30 天过期；过期后还有 `git fsck --lost-found` 搜悬空对象这条最后防线。
- 时间寻址 `HEAD@{iso 时间}` 强大但必须加引号；`reflog show <分支>` 只对现存引用有效。
- 敏感信息清理时才考虑 `reflog expire --expire=now --all` 配合 gc；日常保留默认配置即可。
