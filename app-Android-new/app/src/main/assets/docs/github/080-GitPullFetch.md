---
order: 80
title: GitHub 拉取与获取
module: 'github'
category: 工具链
difficulty: beginner
description: 以对比驱动方式讲解 git pull 与 git fetch 的区别与适用场景，覆盖远程更新同步、远程跟踪分支与拉取冲突处理，适合零基础学习者。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## 开篇：像收发室取件一样拉取更新

想象你所在的小区有个收发室，快递员把新包裹送到收发室后，会发短信通知你。这时你有两种取件方式：

- **方式 A（先看一眼再决定）**：到收发室看到包裹的**面单信息**（谁寄的、什么时候到的），不着急拆开，先回家想想这份快递要不要、怎么处理，想清楚了再拆；
- **方式 B（直接拆开用）**：到了收发室直接拆包，把东西用起来——如果里面的东西和你家里的旧家具摆放冲突，就得现场重新摆放。

对应到 Git：

- **`git fetch`（方式 A）**：只把远程仓库的**新提交信息**下载到本地（更新 `origin/main` 这类"远程跟踪分支"），**你的工作区代码完全不动**，可以慢慢看、对比、确认后再决定要不要合并；
- **`git pull`（方式 B）**：`fetch` 完**自动执行合并**（默认是 merge），直接把远程更新并进你的当前分支，一步到位，但也可能当场触发冲突。

官方文档说得更直白：**`git pull` 本质就是 `git fetch` 加 `git merge` 的简写**。本篇采用**对比驱动**的叙事方式，把这两个命令放在同一张桌子上逐项对照，让你彻底分清"什么时候用 fetch、什么时候用 pull"。

---

## 一、先看结论：一张表分清 fetch 与 pull

| 对比维度 | `git fetch` | `git pull` |
| --- | --- | --- |
| 本质 | 只下载远程新提交，更新远程跟踪分支 | `git fetch` + 自动合并（merge 或 rebase） |
| 是否修改工作区 | 不修改，本地代码纹丝不动 | 立即合并进当前分支，可能改动代码 |
| 是否可能冲突 | 不会（不合并） | 可能触发合并冲突 |
| 安全性 | 高，完全可控 | 中，自动合并有风险 |
| 典型场景 | 先看远程改了什么再决定 | 快速同步最新代码 |
| 命令组合 | fetch 后手动 `git merge origin/main` | 一步完成 |

一句话记忆版：**fetch 是"只看不拆"，pull 是"拆了就用"**。

---

## 二、原理讲解：远程跟踪分支是什么

要理解 fetch 和 pull，必须先搞懂"远程跟踪分支"（remote-tracking branch）。它的原理可以这样理解：

Git 在本地仓库里为远程的每个分支保存了一个**"分身"**，命名规则是 `远程名/分支名`，例如 `origin/main`。这个分身记录的是"**我上次从远程同步时，远程分支长什么样**"。它只是一个引用（指针），不是你工作区里的真实文件。

```bash
# 查看远程跟踪分支（克隆后自动生成）
git branch -r
# 输出示例：
#   origin/HEAD -> origin/main
#   origin/main

# 查看本地 + 远程全部分支
git branch -a
```

`git fetch` 干的事就是：**把这个分身更新到远程的最新状态**——`origin/main` 指向最新的提交，但你的本地分支 `main` 和工作区文件保持不变。

图解（fetch 前后）：

```
fetch 前：                     fetch 后：
本地 main --- A --- B          本地 main --- A --- B
远程 origin/main --- A         远程 origin/main --- A --- B --- C   (C 是远程新增)
工作区文件：仍是 A/B 版本        工作区文件：仍是 A/B 版本（没变！）
```

只有你手动执行 `git merge origin/main` 或 `git pull`，本地分支和工作区才会前进到 C。

---

## 三、git fetch 全解

### 3.1 基本用法

```bash
# 获取默认远程（origin）所有分支的更新（只更新分身，不合并）
git fetch

# 获取指定远程的更新
git fetch origin

# 获取指定远程的指定分支
git fetch origin main

# 获取所有远程仓库的更新
git fetch --all

# 获取更新并清理远程已删除分支的本地引用
git fetch --prune

# 获取指定标签
git fetch origin v1.0.0

# 获取所有标签
git fetch --tags
```

### 3.2 fetch 之后能做什么

fetch 的完整价值在于"先侦查，后决策"：

```bash
# 1. 查看远程 main 比你本地多哪些提交
git log --oneline main..origin/main

# 2. 对比本地与远程的差异
git diff origin/main

# 3. 确认无误后，手动合并（这才是真正把更新并进来）
git merge origin/main

# 4. 或者用 rebase 方式整合（历史更线性）
git rebase origin/main
```

### 3.3 典型输出解读

```bash
git fetch origin
```

输出示例：

```
From https://github.com/user/repo
 * [new branch]      feature/login -> origin/feature/login
   8f4b2c1..c9d3e7a  main         -> origin/main
```

看懂输出：第一行表示远程出现了新分支；第二行表示 `main` 从 `8f4b2c1` 推进到 `c9d3e7a`。**注意：你的本地 main 和工作区没有任何变化**。

---

## 四、git pull 全解

### 4.1 基本用法

```bash
# 拉取并合并（默认 merge 方式）：fetch + merge
git pull

# 指定远程和分支
git pull origin main

# 拉取并使用 rebase 方式整合（避免多余的合并提交）
git pull --rebase

# 指定分支 + rebase
git pull --rebase origin main
```

### 4.2 默认合并 vs --rebase

同样是 `git pull`，内部可以选择两种整合策略：

```bash
# 默认：merge（生成一个合并提交，历史会出现分叉）
git pull

# 推荐给个人分支：--rebase（把本地提交"垫到"远程提交之后，历史呈直线）
git pull --rebase
```

两条路线的区别与取舍，在 040-GitMergeRebase 篇有详细对比，这里只需记住：**团队要求历史整洁就用 `git pull --rebase`，想保留完整合并记录就用默认 `git pull`**。也可以在配置里一劳永逸：

```bash
# 全局设置 pull 默认使用 rebase
git config --global pull.rebase true
```

### 4.3 特殊参数

```bash
# 允许合并不相关历史（例如：本地 init 的仓库首次和远程仓库合并时）
git pull origin main --allow-unrelated-histories

# 拉取但不自动创建合并提交（先检查再自己提交）
git pull --no-commit
```

> 场景说明：如果你在本地 `git init` 建了仓库并提交过，再 `git remote add origin` 关联远程，此时本地与远程没有任何共同祖先，直接 `git pull` 会报 `refusing to merge unrelated histories`。加上 `--allow-unrelated-histories` 才能强行合并。

---

## 五、拉取冲突处理（提前预告）

`git pull` 合并时若双方改了同一处代码，就会停下等你解决。完整解法见 041 篇，这里先给出"止血三板斧"：

```bash
# 合并冲突：中止（回到 pull 之前的状态）
git merge --abort

# 变基冲突：中止
git rebase --abort

# 解决完冲突后：继续合并
git merge --continue

# 解决完冲突后：继续变基
git rebase --continue

# 变基时跳过当前有问题的提交
git rebase --skip
```

---

## 六、远程分支操作补充

```bash
# 查看远程分支及其追踪关系
git branch -vv
# 输出示例：* main 8f4b2c1 [origin/main] feat: 添加加法函数

# 基于远程分支创建本地分支并切换
git switch -c feature origin/feature

# 本地分支自动追踪同名远程分支（远程存在时才有效）
git switch feature

# 查看远程仓库详情（含分支、落后/领先状态）
git remote show origin

# 列出远程仓库的所有引用
git ls-remote origin

# 查看远程默认分支名
git remote show origin | grep "HEAD branch"
```

---

## 七、常见错误与对策表

| 错误现象 | 报错信息（节选） | 原因分析 | 解决办法 |
| --- | --- | --- | --- |
| 工作区有未提交改动时 pull | `Your local changes to the following files would be overwritten by merge` | 本地未提交改动与远程更新重叠 | 先 `git stash` 暂存改动，pull 后再 `git stash pop` 恢复（见 045 篇） |
| pull 报不相关历史 | `refusing to merge unrelated histories` | 本地 init 仓库与远程仓库没有共同祖先 | 加 `--allow-unrelated-histories`（首次合并时用） |
| pull 后出现冲突标记 | `Automatic merge failed; fix conflicts and then commit the result` | 双方修改了同一处代码 | 按 041 篇解决：编辑文件 → `git add` → `git merge --continue` |
| 误以为 fetch 后代码更新了 | fetch 后本地代码没变化 | 对 fetch 的认知偏差——它只更新 origin/main 分身 | 主动执行 `git merge origin/main` 或改用 `git pull` |
| pull --rebase 冲突后不会收场 | 变基进行中，不知道下一步 | 没掌握 continue/abort/skip | 解决冲突后 `git add` + `git rebase --continue`；想放弃就 `git rebase --abort` |
| 远程分支列表有"幽灵分支" | `git branch -r` 里出现远程已删除的分支 | 远程分支被删，但本地引用未清理 | `git fetch --prune` 或 `git remote prune origin` |
| 拉取慢/卡住 | fetch/pull 长时间无响应 | 大仓库全量下载或网络受限 | 用 `git fetch --depth 1` 浅获取，或检查网络代理 |

---

## 九、一句话记忆

**`git fetch` 只更新远程"分身"（origin/main）不碰你的代码，`git pull` 是 fetch 加 merge（或 rebase）一步到位——先侦查用 fetch，快同步用 pull，冲突了记得 abort 或 continue。**
