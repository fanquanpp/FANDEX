---
order: 340
title: revert 与 reset：回滚一台往前走，一台往后抹
module: 'git'
category: 工具链
difficulty: intermediate
description: 以「线上事故回滚选 revert 还是 reset」引入两台机器的心智模型——revert 是反向补丁机（历史向前追加一条撤销提交），reset 是指针搬运机（分支指针后移、历史被甩出）；用三棵树视角逐档拆解 soft/mixed/hard 对 HEAD、暂存区、工作区的不同处置，覆盖 revert merge 提交、revert 的 revert、reflog 救援与「撤销后再合并不生效」经典面试题，附沙盒实验脚本与双人协作事故推演。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'git/060-ThreeTrees'
  - 'git/300-GitReset'
  - 'git/310-GitRevert'
  - 'git/260-GitReflog'
prerequisites:
  - 'git/060-ThreeTrees'
  - 'git/110-HEADPointerBranchEssence'
---

## 前置知识

- 已完成[三棵树](/git/060-ThreeTrees)：分得清 HEAD、暂存区（index）、工作区各自是什么——本文所有结论都能用三棵树推出来；
- 已完成[HEAD 指针与分支本质](/git/110-HEADPointerBranchEssence)：知道分支只是指向提交的引用，HEAD 指着某个提交。

## 学习目标

读完本文你将能够：

1. 用一句话说清两台「机器」的本质区别：revert 向历史**追加**反向补丁，reset 把分支指针**后移**甩掉提交；
2. 用三棵树逐档推演 `reset --soft / --mixed / --hard` 各自动了哪些树、留了什么；
3. 正确处理三个特殊情况：revert merge 提交（`-m` 参数）、revert 一个 revert、revert 后冲突；
4. 记住并执行那条铁律：**已推送共享的提交只用 revert，reset 只用于未共享的本地历史**；
5. 在误操作 `reset --hard` 后用 reflog 把提交找回来，并知道找回的时限。

预计 45 到 60 分钟。

## 1. 你现在要解决什么问题

周五下午，测试发现上线的 feature 出了 P0 事故，需要立刻回滚。仓库历史长这样：

```text
A──B──C──D      main（D 是出问题的 feature 提交，已推送，同事已经基于它干活）
```

你面前两条路：

```bash
git revert D     # 路线一：加一个"反向 D"
git reset B      # 路线二：把 main 搬回 B
```

选错路线的代价完全不同：选 reset 再强推，同事本地的 C、D 提交瞬间「无主」，他们下次 pull 会拉出一场合并灾难；选 revert，历史里多一条清晰的撤销记录，所有人无感知。本篇的目标是让你**在做选择之前就能推演出两条路各自的后果**，而不是靠背「revert 安全、reset 危险」这句话——能推演，才敢在生产环境做决定。

## 2. 心智模型：反向补丁机与指针搬运机

两台机器对同一份历史干的事完全不同：

```text
revert：历史向前走，多一条撤销提交
A──B──C──D──D'        D' 的内容是 D 的镜像补丁（把 D 改的改回去）

reset：指针向后搬，C、D 被甩出分支
A──B  ← main          C、D 不再被 main 引用（对象暂存于 reflog，90 天内可救）
```

| 维度 | revert（反向补丁机） | reset（指针搬运机） |
| --- | --- | --- |
| 历史形态 | 不变，追加新提交 | 改写，旧提交脱离分支 |
| 哈希 | 新哈希（D' 不等于 D） | 旧哈希从分支上消失 |
| 协作影响 | 零：别人 pull 即可 | 灾难：别人必须重新同步 |
| 冲突可能 | 有（后续提交动过同一处就要解冲突） | 无（指针直接搬） |
| 撤销范围 | 任意单个/多个提交，可在历史任意位置 | 只能以 HEAD 为锚点向后搬 |
| 可逆性 | 再 revert 一次即可 | 靠 reflog 找回 |

一个帮助记忆的类比：revert 是「在账本上加一行红字冲销」，账本从不撕页，审计线索完整；reset 是「把最近几页从账本上裁掉」，干干净净但撕掉就没了——好在 Git 的碎纸机（gc）要等 reflog 过期才真的销毁。

**为什么「已推送就不用 reset」？** 推送的本质是「告诉全世界 main 指向 D」。你本地把指针搬回 B，但全世界的账本上还写着 D；你只能强推覆盖，而强推之后，任何基于 D 开发的人都会发现「提交凭空消失」。revert 没有这个问题，因为它从不改变「main 曾指向 D」这个事实，只是继续向前记账。

## 3. 用三棵树推演 reset 的三个档位

[三棵树](/git/060-ThreeTrees)是理解 reset 的唯一正确姿势。假设当前状态：

```text
HEAD/分支 → D；暂存区 = D 的快照；工作区 = D 的文件
目标：git reset B（B 是历史中 D 的前两个提交）
```

三个档位的区别只有一句话：**reset 永远先搬指针，然后依次问「暂存区要不要跟着对齐？工作区要不要跟着对齐？」**

| 档位 | 分支指针 | 暂存区 | 工作区 | 一句话人话 |
| --- | --- | --- | --- | --- |
| `--soft` | 搬到 B | 不动（仍是 D 快照） | 不动 | 「提交别算数了，改动我收在暂存区重新提交」 |
| `--mixed`（默认） | 搬到 B | 对齐 B | 不动 | 「改动退回工作区，让我重新挑着 add」 |
| `--hard` | 搬到 B | 对齐 B | 对齐 B | 「这三个树全对齐 B，未提交的修改一并扔掉」 |

推演一遍 `--soft`：指针搬到 B 后，暂存区仍是 D 的快照，`git status` 会显示 D 相对 B 的全部差异处于「已暂存」状态——正好可以一次重新提交，所以 soft 是「合并零碎提交」的标准工具：

```bash
git reset --soft HEAD~3        # 撤掉最近三个提交，改动全部留在暂存区
git commit -m "feat: user module"   # 重新捏成一个提交
```

`--hard` 则是唯一会**摧毁工作区未提交修改**的档位。执行前永远问自己：工作区有没有没提交的东西？有的话先 `git stash`（见[git-stash](/git/120-GitStash)），再 reset。

### 3.1 reset 与 checkout 的分界线

两者都能「移动到某个提交」，分界在于动不动分支指针：

- `git checkout B`（或 `switch --detach`）：HEAD 自己搬到 B，分支指针原地不动，进入分离头状态；
- `git reset B`：分支指针搬到 B，HEAD 跟着分支走。

「我要改的是分支的历史」用 reset；「我只是想去某个提交看看」用 checkout/switch。

## 4. revert 的三个特殊情况

### 4.1 revert 一个 merge 提交：必须指明「撤销哪一侧」

merge 提交有两个父提交，revert 不知道你想退回哪一边，必须用 `-m` 指定「保留哪个父提交的方向」：

```bash
git revert -m 1 <merge-commit>
# -m 1：保留第 1 父（合并时你所在的分支，通常是 main）的方向
# -m 2：保留第 2 父（被合并进来的 feature 分支）的方向
```

### 4.2 经典面试题：revert 掉的 merge，之后重新合并为什么不生效

这是 Git 面试的高频题，值得完整推演：

```text
场景：main 合并了 feature（merge 提交 M），随后 revert -m 1 M 生成 R。
一个月后 feature 修复完毕，再次 merge 进 main——
Git 发现 feature 的那些提交在 main 的历史里"已经存在"（通过 M），判定"已合并"，
什么也不做。修好的代码进不来。
```

根因：merge 的「已合并」判定看的是**提交是否可达**，不是「内容是否在代码里」。R 只是内容上的反向补丁，历史里那些提交依然可达。

两种标准解法：

```bash
# 解法一：revert the revert——再撤销一次 R，把内容补回来（推荐，历史清晰）
git revert R

# 解法二：把 feature 的改动 rebase 成全新提交（哈希变了，"已合并"判定失效）
git checkout feature && git rebase main
```

工程结论：**revert 一个 merge 之前先想清楚「这个分支以后还要不要合并进来」**。要，就选解法二把分支重做；不要（分支废弃）才放心 revert。

### 4.3 revert 产生冲突

revert 本质是做一次三方合并（原始提交、它的父提交、当前工作树），所以后续提交若改过同样的行，照样冲突。处理方式与 merge 冲突一致：改文件、`git add`、`git revert --continue`；中途放弃用 `git revert --abort`。详见[合并冲突解决](/git/130-MergeConflictResolution)。

## 5. 沙盒实验：一次跑完两台机器

找任意目录跑这个脚本，亲手确认两条路的所有行为（每步都标注了预期）：

```bash
mkdir rollback-lab && cd rollback-lab && git init -b main
for i in 1 2 3 4; do echo "v$i" > app.txt; git add .; git commit -m "c$i"; done
git log --oneline        # 4 个提交：c1..c4

# --- 实验 A：revert ---
git revert --no-edit HEAD        # 生成 "Revert c4"
git log --oneline                # 5 条：Revert c4 在最顶
git show HEAD --stat | head -3   # 确认新提交存在，app.txt 内容回退到 v3

# --- 实验 B：reset 三档 ---
git reset --soft HEAD~1          # 指针回退，改动躺在暂存区
git status                       # app.txt 显示 staged
git reset --mixed HEAD~1         # 改动退到工作区
git status                       # app.txt 显示 modified 未暂存
git reset --hard HEAD            # 三树对齐 HEAD，工作区改动全部丢弃
git status                       # clean

# --- 实验 C：hard 之后的救援 ---
git reflog                       # 找到 reset 之前所在的提交哈希
git reset --hard <那个哈希>      # 时间倒流，提交全回来了
```

实验 C 是本篇最重要的安全网：**reflog 记录了 HEAD 的每一次移动**，只要提交对象还没被 gc（可达提交的 reflog 默认保留 90 天，不可达对象 30 天），就都能用 `git reset --hard HEAD@{n}` 救回。深入机制见[git reflog](/git/260-GitReflog)。

## 6. 决策表：现场怎么选

```text
提交推到共享分支了吗？
├── 推了（或不确定）─────── revert。别赌，revert 永远是对的。
├── 没推，只在本地
│     ├── 想合并零碎提交 / 重新组织 ── reset --soft（或交互式 rebase）
│     ├── 想重新挑选暂存内容 ─────── reset（默认 mixed）
│     └── 想彻底丢弃本地实验 ─────── reset --hard（先确认工作区干净）
└── 撤销的不是提交而是工作区修改 ─── restore / checkout --（不是 reset 的活）
```

两条补充规则：

1. **确实要 reset 已推送的分支**（比如只有你一个人用的 feature 分支）：reset 后用 `git push --force-with-lease` 而不是 `--force`——前者会拒绝覆盖「远程有你没见过的新提交」，把双人事故拦在门外；
2. **撤销要留痕**：生产环境的回滚操作（revert 提交）本身是审计记录，CI/CD 回滚、事故复盘都依赖它，这也是 revert 在团队协作里占绝对主导地位的原因。

## 7. 常见坑与调试实录

- **`reset --hard` 连未提交的修改一起扔**：三档里只有 hard 动工作区，但它动起来不留情。执行前的自检口令：`git status` 确认干净，不干净先 stash。
- **`git reset` 之后找不到「丢掉」的提交**：提交没被删，只是不被引用。`git reflog` 或 `git fsck --lost-found` 都能找回，时限见第 5 节。
- **revert 了 merge 之后重新合并「没反应」**：4.2 的经典题。记住对策——revert the revert，或把分支 rebase 成新提交。
- **revert 半路卡在冲突就慌**：`git revert --abort` 能让你回到操作前的干净状态，冲突解决流程与 merge 完全一致。
- **`-m 1` 选错方向**：不确定哪个父提交是哪条线时，先 `git show <merge-commit>` 看两个 parent 的哈希与提交信息再选。
- **把「丢弃工作区修改」也交给 reset**：`git restore <file>` / `git restore --staged <file>` 才是文件级操作的对应工具（见[restore 与文件操作](/git/080-GitRestoreFileOperation)），reset 的主场是提交历史的移动。

## 8. 小练习

预测题（5 分钟，先写答案再运行）：在 5 节的沙盒仓库（c1..c4，外加 revert 产生的 Revert c4）上执行 `git revert --no-edit HEAD`，预测 HEAD 现在的提交信息与 app.txt 的内容。

提示：revert 一个 revert 是什么效果？答案：HEAD 的信息是 `Revert "Revert c4"`，app.txt 回到 v4——撤销的撤销等于恢复原内容。这是 4.2 解法一的原理。

修改题（15 分钟）：把 5 节实验 B 的三步重做成一条「把最近 2 个提交压成 1 个」的流程。验收：`git log --oneline` 少一条，工作区与暂存区干净。

提示（思路方向）：soft 只搬指针、暂存区保留全部差异，配合一次 commit 即可。展开（关键 API）：`reset --soft`、`commit`。参考实现：

```bash
git reset --soft HEAD~2
git commit -m "feat: squash last two"
```

修 Bug 题（20 分钟）：同事慌张地找你：「我 reset --hard HEAD~5 还 push --force 了，本地五个提交没了，远程也没了！」给出完整的救援命令序列，并说明每一步在找什么。

提示：本地丢的提交从哪找？远程在被覆盖前的指向从哪找？答案：

```bash
git reflog                                # 1) 本地：HEAD 移动历史里找 reset 前的哈希
git reset --hard HEAD@{1}                 #    或直接用该哈希恢复分支
git reflog show origin/main               # 2) 远程：本地的远程跟踪分支也有 reflog，
                                          #    找 push --force 之前 origin/main 指向的哈希
git branch recovered <那个哈希>           # 3) 先建分支保住对象，再决定合并策略
```

最后与团队对齐：同事需重新基于 recovered 分支拉取。时限提醒：可达提交的 reflog 默认保留 90 天，不可达对象被 gc 后（默认 30 天）就真的没了，救援要趁早。

挑战题（40 分钟，脱离示例）：用脚本模拟一次双人协作事故并自救——克隆同一仓库两份（sim-a、sim-b），A 在 main 推了提交 X，B 基于本地 main 开发；A revert 了 X 并推送；B push 时发现落后。要求：写出 B 正确的同步命令序列，并解释为什么不报错。验收：两边 main 的 `git log --oneline` 完全一致，且都包含「X、Revert X」两条记录。

提示（思路方向）：B 需要先 fetch 再 rebase 或 merge 自己的本地提交到最新远程 main 上。展开（关键 API）：`git fetch`、`git rebase origin/main`、`git push`。参考实现：

```bash
# B 侧：
git fetch origin
git rebase origin/main    # 把本地未推送的提交搬到最新 main 之上
git push
# 不报错的原因：A 用的是 revert（历史向前追加），远程 main 没有被改写，
# B 的本地提交与远程历史不存在分叉冲突，rebase 只是普通的快进式重放。
```

## 9. 与之前和之后的知识的关系

- 往前：三棵树（[060](/git/060-ThreeTrees)）是本文的推演工具，HEAD 与分支本质（[110](/git/110-HEADPointerBranchEssence)）解释了 reset 搬的究竟是什么；
- 往后：reset 与 revert 的单项深入分别在 [reset 详解](/git/300-GitReset)与[revert 详解](/git/310-GitRevert)；误操作救援的完整机制在[git reflog](/git/260-GitReflog)；「改写共享历史」的完整纪律（force-with-lease、团队规范）见[Code Review 与协作规范](/git/230-CodeReviewBestPractice)。

## 10. 官方文档

- git-revert：https://git-scm.com/docs/git-revert
- git-reset：https://git-scm.com/docs/git-reset
- 官方事故案例 How-to（revert-a-faulty-merge）：https://git-scm.com/docs/howto/revert-a-faulty-merge

## 自我检查

- 能不看资料画出 revert 与 reset 各自操作后的历史示意图，并说出「为什么已推送的提交只能 revert」；
- 能用三棵树逐档推演 soft/mixed/hard 各自的状态变化，并说出哪个档位会摧毁工作区未提交修改；
- 能解释 revert merge 要用 `-m`、以及「revert 后重新合并不生效」的根因与两种解法；
- 误 reset --hard 后能独立完成 reflog 救援，并说出对象被 gc 前的时限；
- 知道 force-with-lease 与 force 的区别及其拦下的事故形态。

## 本章总结

revert 是反向补丁机：向历史追加一条内容相反的提交，账本从不撕页，协作零影响，是共享分支回滚的唯一正解；特殊形态只有三个——merge 提交要 -m 指方向、revert 的 revert 等于恢复、冲突按 merge 流程走。reset 是指针搬运机：分支指针后移，按档位决定暂存区与工作区要不要跟着对齐，soft 留改动在暂存区、mixed 退回工作区、hard 连未提交修改一起清——只用于未推送的本地历史。撤销过的 merge 分支想再合并，必须 revert the revert 或重做提交，否则 Git 会判定「已合并」而拒绝带入改动。误操作的救命稻草是 reflog：可达提交默认保留 90 天，救援要趁早。
