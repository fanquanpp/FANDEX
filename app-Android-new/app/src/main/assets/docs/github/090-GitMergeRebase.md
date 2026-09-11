---
order: 90
title: GitHub 合并与变基
module: 'github'
category: 工具链
difficulty: beginner
description: 以对比驱动方式讲解 git merge 与 git rebase 两种分支整合路线的原理、适用场景与选择原则，覆盖快进合并、三方合并与交互式变基，适合零基础学习者。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## 开篇：像双人写作合并一样整合分支

假设你和同事合写一本书：你负责"第 1-3 章"，他负责"第 4-6 章"。你俩在各自的文档副本上写作，最后要把两份稿子合成一本完整的书。此时有两条路线：

- **路线一（merge，合并）**：把两份稿子**原样装订在一起**，加上一个"合并页"记录"本书由两份稿件合成"。书的正文里，你的章节和同事的章节**完整保留各自历史**，合订本能清楚看到每个章节各自的发展过程，缺点是目录结构有分叉，读起来略乱。
- **路线二（rebase，变基）**：把同事写完的第 4-6 章作为"基准"，把你的第 1-3 章**拆散重写**，按顺序重新誊抄到基准之上。最终书稿是一份**连续、直线**的完整稿子，历史干净，但你的原始草稿（原提交）被"重写"了——誊抄稿和原稿不是同一份。

对应到 Git：**`git merge` 保留双方完整历史并生成合并提交；`git rebase` 把你的提交"重放"到对方最新提交之后，历史呈一条直线**。本篇采用**对比驱动**方式，把这两条路线掰开揉碎，讲清原理、场景和选择原则。

---

## 一、先看结论：merge 与 rebase 速览表

| 对比维度 | `git merge` | `git rebase` |
| --- | --- | --- |
| 本质 | 三方合并，生成合并提交 | 提取提交补丁，在目标基底上重放 |
| 历史形态 | 有分叉（能看到分支合并痕迹） | 直线（历史整洁） |
| 是否改写已有提交 | 否，原提交不变 | 是，生成全新提交（ID 改变） |
| 对共享分支的风险 | 无，安全 | 高，禁止对已推送的共享分支使用 |
| 可追溯性 | 强，合并提交记录两个父提交 | 较弱，分支独立开发过程被抹平 |
| 适用场景 | 长期分支、公共分支、保留合并记录 | 个人功能分支、push 前整理历史 |
| 命令形态 | `git merge <分支>` | `git rebase <基底>` |

官方结论（Pro Git）：**两种方式整合的最终代码快照完全一样，区别只在提交历史**。变基让历史更整洁，合并让历史更完整。

---

## 二、原理讲解：从"共同祖先"说起

### 2.1 分支为什么会分叉

Git 的分支本质上是一个**指向提交的可移动指针**。当两个分支从同一个提交（共同祖先）各自前进时，历史就分叉了：

```
A --- B --- C   (main)
       \
        D --- E   (feature)
```

### 2.2 merge 的三方合并原理

`git merge feature`（在 main 上执行）时，Git 取三个点做三方合并：

1. **我方**（ours）：当前分支 main 的最新提交 C；
2. **对方**（theirs）：要合并进来的分支 feature 的最新提交 E；
3. **共同祖先**（base）：两个分支最近共同祖先 B。

Git 逐文件比较三个版本：只有一方改的，自动采用；双方改了同一处且不一致的，标记为冲突等你裁决。合并成功后生成**合并提交 M**（有两个父提交），历史变成：

```
A --- B --- C --- M   (main)
       \         /
        D --- E   (feature)
```

### 2.3 快进合并（fast-forward）的特殊情况

如果被合并的分支是当前分支的**直接后代**（没分叉），Git 不需要创建合并提交，直接把指针往前移即可：

```bash
# 前提：main 在 B，feature 在 C，且 C 直接继承 B
git merge feature
# 输出：Updating a1b2c3d..e4f5g6h (Fast-forward)
```

### 2.4 rebase 的"重放"原理

`git rebase main`（在 feature 上执行）分四步走（官方文档描述）：

1. **找分叉点**：定位 feature 与 main 的共同祖先 B；
2. **提取补丁**：把 feature 自 B 以来的提交（D、E）的修改内容存为临时补丁；
3. **移动基底**：把 feature 指针指向 main 的最新提交 C；
4. **依次重放**：把补丁按原顺序应用到 C 之上，生成新提交 D'、E'。

结果：

```
A --- B --- C           (main)
             \
              D' --- E'   (feature)
```

> 关键区别再强调：merge 后 D、E 原封不动；rebase 后 D'、E' 是**全新的提交**（哈希 ID 变了，作者信息保留）。所以 rebase 等于"重写了自己这一侧的历史"。

---

## 三、git merge 命令全解

### 3.1 基本用法

```bash
# 把 feature 分支合并到当前分支
git switch main
git merge feature

# 强制创建合并提交（即使可以快进也创建一个，保留"分支曾存在"的记录）
git merge --no-ff feature

# 仅当可以快进时才合并，否则报错退出（适合不想产生合并提交的场景）
git merge --ff-only feature

# 压缩合并：把 feature 的所有提交压成一个改动，暂存到暂存区（需再 commit）
git merge --squash feature
git commit -m "feat: 用户登录功能"

# 合并时打开编辑器修改合并信息
git merge -e feature
```

### 3.2 合并输出示例

```bash
git merge feature
```

输出示例：

```
Merge made by the 'ort' strategy.
 app.py | 3 ++-
 1 file changed, 2 insertions(+), 1 deletion(-)
```

### 3.3 合并后清理

```bash
# 删除已合并的本地分支（-d 只允许删除已合并的分支，安全）
git branch -d feature

# 删除远程分支
git push origin --delete feature

# 查看已合并到 main 的分支（可用于批量清理）
git branch --merged main

# 查看尚未合并的分支（-d 会拒绝删除它们）
git branch --no-merged
```

### 3.4 cherry-pick：只摘取某个提交

不是整条分支合并，而是只把某一个提交"移植"过来：

```bash
# 把指定提交应用到当前分支
git cherry-pick abc1234

# 一次移植多个提交
git cherry-pick abc1234 def5678

# 遇到冲突时：解决后继续
git cherry-pick --continue

# 放弃整个 cherry-pick
git cherry-pick --abort
```

---

## 四、git rebase 命令全解

### 4.1 基本用法

```bash
# 把当前分支变基到 main 之上
git switch feature
git rebase main

# 简写形式：直接指定分支（等价于 switch + rebase）
git rebase main feature

# 把当前分支变基到远程分支
git rebase origin/main

# 变基时保留空提交
git rebase --keep-empty main
```

### 4.2 变基冲突处理三板斧

```bash
# 解决冲突后继续
git rebase --continue

# 跳过当前有问题的提交
git rebase --skip

# 中止变基，回到变基前状态
git rebase --abort
```

### 4.3 交互式变基：整理自己的历史

`git rebase -i` 是重写本地历史的利器，常用于 push 前把多个零碎提交合并成一个清晰提交：

```bash
# 交互式整理最近 5 次提交
git rebase -i HEAD~5

# 从指定提交开始整理
git rebase -i abc1234
```

执行后会打开编辑器，列出待办清单，常用命令：

```
pick abc1234 添加登录功能
reword def5678 修改提交说明
squash e9f0123 修复样式       # 合并到上一个提交，并合并说明
fixup f1a2b3c 小修复          # 合并到上一个提交，丢弃说明
drop g4h5i6j 废弃的实验代码    # 删除该提交
edit 7k8l9m0 需要暂停修改      # 在该提交处暂停
```

> 使用原则：交互式变基**只允许用于还没推送到共享远程的本地提交**。已 push 的提交被改写，会让拉取过它的队友陷入历史冲突。

### 4.4 常用变体

```bash
# --onto：把 A 分支上基于 X 的提交，改放到 Y 之上
git rebase --onto main server client

# 编辑变基待办列表（进行中时用）
git rebase --edit-todo

# 查看当前变基正在应用的补丁
git rebase --show-current-patch
```

---

## 五、merge vs rebase：怎么选

| 场景 | 推荐 | 理由 |
| --- | --- | --- |
| main 合并功能分支（发布） | `git merge --no-ff` | 保留"功能曾独立开发"的合并记录 |
| 个人功能分支同步 main | `git rebase main` | 历史整洁，push 前顺手整理 |
| 多人协作的共享分支同步 | `git merge` | 不改写他人可能已拉取的提交 |
| PR 合并到 main | GitHub 默认 Squash 或 Merge | 平台内配置，避免本地操作 |
| 本地提交太碎想合并 | `git rebase -i` | 交互式压缩提交 |
| 只想要别人的某一个提交 | `git cherry-pick` | 精准移植 |

**黄金原则（Pro Git 原话）**：**不要对已推送到远程、且可能被别人拉取的提交执行 rebase**。变基是"重写历史"，只能用于自己还没共享的提交。

---

## 六、常见错误与对策表

| 错误现象 | 报错信息（节选） | 原因分析 | 解决办法 |
| --- | --- | --- | --- |
| merge 想快进却被拒绝 | `fatal: Not possible to fast-forward, aborting.` | 用了 `--ff-only` 但两分支已分叉 | 去掉 `--ff-only`，接受普通三方合并 |
| rebase 后 push 被拒 | `! [rejected] feature -> feature (non-fast-forward)` | 改写历史后与远程分叉 | 个人分支可用 `--force-with-lease`；共享分支禁止 |
| merge 出现冲突 | `Automatic merge failed; fix conflicts...` | 双方改同一处 | 按 041 篇解决：编辑 → `git add` → `git merge --continue` |
| rebase 到一半想反悔 | 变基进行中 | 不知道可以中止 | `git rebase --abort` 一键回到起点 |
| 删分支被拒 | `error: The branch 'feature' is not fully merged` | `git branch -d` 只删已合并分支 | 确认内容不要后改用 `git branch -D` 强删 |
| 交互式变基里填错命令 | 编辑器里看到 `pick` 等命令不知道干嘛 | 不熟悉 rebase -i 指令 | 查阅 4.3 节命令表；`drop` 删提交、`squash` 合并、`reword` 改信息 |
| 对已推送提交 amend/rebase | 队友拉取后历史混乱 | 改写公共历史 | 只重写未推送提交；已推送的用新提交修正（如 revert） |

---

## 八、一句话记忆

**merge 保留双方历史、生成合并提交（安全、适合共享分支）；rebase 把提交重放成直线（整洁、只用于未推送的本地提交）——快进是特权，公共历史禁改写，push 前整理用 rebase -i。**
