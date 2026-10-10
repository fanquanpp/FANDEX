---
order: 70
title: Git 基础操作：init、add、commit，人生第一次提交
module: 'git'
category: 工具链
difficulty: beginner
description: 把普通文件夹变成仓库并完成人生第一次提交：init、status、add、commit、log 全流程与工作区/暂存区/仓库的三层现场感，含 not a git repository、nothing added to commit、Please tell me who you are 三个真实报错实录与一个建仓小项目。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'git/010-Git'
  - 'git/020-GitInstallConfig'
  - 'git/030-GitEnvConfigInit'
  - 'git/040-GitignoreDeepDive'
  - 'git/060-ThreeTrees'
  - 'git/070-GitDiffStagingOperation'
prerequisites:
  - 'git/020-GitInstallConfig'
  - 'git/030-GitEnvConfigInit'
---

## 前置知识

- 已完成 [安装与配置](/git/020-GitInstallConfig)：Git 可用，`user.name`/`user.email` 已配好；
- 已完成 [环境配置与初始化](/git/030-GitEnvConfigInit)：见过 `git init`，`init.defaultBranch` 已配为 `main`。

没读过 030 也能跟：`git init` 本文会从零完整走一遍，只是不再解释配置项。

## 学习目标

读完本文你将能够：

1. 用 `git init` 把任意文件夹变成仓库，说出 `.git` 是什么、删掉它的后果；
2. 读 `git status` 的输出，说出未跟踪、已修改、已暂存各是哪个区的状态；
3. 完成 add → commit 循环，写出半年后仍看得懂的提交信息；
4. 亲手复现并修复 `nothing added to commit` 与 `Please tell me who you are` 两个真实报错；
5. 完成小项目：给自己的代码目录建仓并做出 3 次有意义的提交。

预计 60 到 90 分钟，含 1 个贯穿案例、3 组修改实验与 1 个小项目。

## 1. 问题：把一个文件夹变成仓库

你在写一个命令行记账程序。文件夹 `ledger/` 里目前只有一个 `ledger.txt`，记了两笔账：

```text
2026-09-27 早餐 -12
2026-09-27 地铁 -4
```

你打算长期写下去，改坏想回退、改到哪天有据可查——正是 [Git 是什么](/git/010-Git) 说的那三堵墙。现在动手让 Git 管住这个文件夹，并完成人生第一次提交。

先按直觉试试。进入文件夹，问 Git 一句「现在什么情况」：

```bash
cd ledger
git status
```

受挫了，Git 拒绝回答：

```text
fatal: not a git repository (or any of the parent directories): .git
```

## 2. git init：一次性的动作

报错在说：这里不是仓库。修法就是 `git init`：

```bash
git init
```

预期输出（路径随你的实际位置变化）：

```text
Initialized empty Git repository in C:/Users/you/projects/ledger/.git/
```

`git init` 只做一件事：在当前文件夹创建一个隐藏的 `.git` 目录。看一眼：

```bash
ls -a
```

```text
./  ../  .git/  ledger.txt
```
`.git` 就是 010 篇说的**账本**：历史快照、配置、暂存记录都住在里面。两条纪律：不要手动改里面的文件；不要删它（删了历史全没）。init 每个仓库只跑一次。

若 init 时冒出 `hint: Using 'master' ...`，说明 `init.defaultBranch` 没配，回 [安装与配置](/git/020-GitInstallConfig) 补一条命令即可。

## 3. git status：问 Git 现在什么情况

修好了再来一遍：

```bash
git status
```

预期输出：

```text
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        ledger.txt

nothing added to commit but untracked files present (use "git add" to track)
```

逐行读：`On branch main`——在 main 分支上（分支是 100 篇的主题，先混个眼熟）；`No commits yet`——仓库还没有提交；`Untracked files`——Git 看见了 `ledger.txt`，但还没开始管它。

现在补上 010 篇欠你的细节。`git status` 之所以重要，是它在逐层汇报三个地方的现状：

| 你的问题 | 回答的地方 | 谁在动它 |
| --- | --- | --- |
| 我改了什么、有什么新文件？ | **工作区**（眼前的文件） | 编辑器、程序 |
| 哪些改动准备进下一次快照？ | **暂存区**（add 放进去的清单） | `git add` |
| 历史上已经存了哪些快照？ | **仓库**（`.git` 里的提交历史） | `git commit` |

此刻：工作区一个新文件，暂存区空，仓库空。三层完整模型是 [三棵树](/git/060-ThreeTrees) 的主角，本文先建立现场感。

## 4. .gitignore：把杂物挡在门外

记账程序以后会生成临时备份，造一个模拟一下（Windows 下 `echo` 同样可用）：

```bash
echo "*.bak" > .gitignore
echo "2026-09-27 备份一下" > ledger.txt.bak
```

再看 `git status`：`ledger.txt.bak` 没有出现，但多了一个 `.gitignore`。规则一句话：**不想进仓库的文件，把文件名模式写进 `.gitignore`**，`*.bak` 即「所有以 .bak 结尾的文件」。`.gitignore` 本身需要入库——它保护的是整个团队的仓库整洁。模式语法、已被跟踪的文件怎么反悔，在 [忽略规则 .gitignore 深入](/git/040-GitignoreDeepDive)。

## 5. add 与 commit：人生第一次提交

```bash
git add ledger.txt
git add .gitignore
```

`add` 成功时没有任何输出（Unix 传统：没消息就是好消息）。再看 status：

```text
On branch main

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
        new file:   .gitignore
        new file:   ledger.txt
```

`Changes to be committed`——暂存区里躺着两个文件，等着进下一次快照。为什么不一步到位？因为**暂存让你决定这次快照装哪些**：可以只提交一半改动，把没写完的留在工作区。这是 Git 与「整个文件夹复制」最大的行为差异。

提交：

```bash
git commit -m "feat: 记账程序初版, 记下前两笔账"
```

预期输出：

```text
[main (root-commit) 3f2a1c9] feat: 记账程序初版, 记下前两笔账
 2 files changed, 3 insertions(+)
 create mode 100644 .gitignore
 create mode 100644 ledger.txt
```

读输出：`root-commit` 表示这是仓库第一个提交；`3f2a1c9` 是提交编号（哈希），以后指认它靠前几位；`2 files changed, 3 insertions(+)` 是这次快照装进 2 个新文件、共 3 行。注意编号旁的提交信息——**写什么信息，就是给半年后的你和同事留路标**。FANDEX 的惯例是前缀标类型：`feat:` 新功能、`fix:` 修 bug、`docs:` 改文档、`chore:` 杂务。没有团队规范就照这个来。

看历史：

```bash
git log --oneline
```

```text
3f2a1c9 (HEAD -> main) feat: 记账程序初版, 记下前两笔账
```

`HEAD -> main` 的含义 110 篇讲，先知道它指着「你现在在哪」。去掉 `--oneline` 的完整版 `git log` 会显示作者、邮箱、日期——[安装与配置](/git/020-GitInstallConfig) 配的署名就落在每一行这里。

## 6. 修改实验：一个文件的三种状态

实验一（改完不 add，2 分钟）：

```bash
echo "2026-09-27 晚饭 -25" >> ledger.txt
git status
```

```text
On branch main
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   ledger.txt

no changes added to commit (use "git add" and/or "git commit -a")
```

`modified`——Git 认识这个文件，且发现它和上一次快照不一样了。它与 `Untracked` 的区别：未跟踪是从没管过，已修改是管过之后又变了。

实验二（add 一半再改一半，3 分钟）：

```bash
git add ledger.txt
echo "2026-09-27 买墨水 -15" >> ledger.txt
git status
```

```text
On branch main
Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
        modified:   ledger.txt

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   ledger.txt
```

同一文件名出现两次不是 bug：暂存区存的是 `add` 那一瞬间的版本，之后的新改动还留在工作区——快照是暂存那一刻拍下的，不是提交那一刻。

实验三（收尾提交，1 分钟）：

```bash
git add ledger.txt
git commit -m "feat: 补记晚饭与买墨水两笔"
git status
```

```text
[main 8b4e2f1] feat: 补记晚饭与买墨水两笔
 1 file changed, 2 insertions(+)
On branch main
nothing to commit, working tree clean
```

`working tree clean`——三层一致，没有待处理的差异。这就是日常循环的完整一拍：**改 → add → commit → clean → 再改**。你每天与 Git 的相处，都是这一拍的重复。

## 7. 常见错误与调试实录

**错误一：只 commit 不 add。**

```text
nothing added to commit but untracked files present (use "git add" to track)
```

或在有已修改文件时：

```text
no changes added to commit (use "git add" and/or "git commit -a")
```

按读报错三步走：报错在说「没有东西可提交」；括号里的 `use "git add"...` 是 Git 把下一步命令写给了你；照做，`add` 后重新 commit。习惯：**Git 的报错末尾几乎总带着建议命令，先读完再动手**。

**错误二：没配身份就 commit。**

```text
Author identity unknown

*** Please tell me who you are.

Run

  git config --global user.email "you@example.com"
  git config --global user.name "Your Name"

to set your account's default identity.
Omit --global to set the identity only in this repository.

fatal: unable to auto-detect email address (got 'you@DESKTOP-ABC123.(none)')
```

同样先读再修：报错自己给出了两条命令，照抄、换成你的信息即可——正是 [安装与配置](/git/020-GitInstallConfig) 第 4 节那两条。撞上它说明 020 篇的出口检查没做，回去补。

**错误三：在仓库外面运行 Git 命令。** 即第 1 节的 `fatal: not a git repository ...`：当前目录和它的所有上级目录里都找不到 `.git`。处理：`cd` 回仓库目录；目录还没建仓就先 `git init`。

小贴士：`git commit` 忘带 `-m` 会弹出编辑器（默认常是 vim），写完按 `Esc` 输入 `:wq` 回车即提交；不想再见到 vim 就配 `core.editor`（020 篇第 5 节）。

## 8. 实际项目场景

- FANDEX 仓库 2900 多个文件、500 多次提交，日常工作流就是本文这一拍的放大版：改 → `git status` 核对 → `git add` 挑文件 → `git commit` 写信息。它的首条提交是 `feat: initialize FANDEX monorepo with web/desktop/android subprojects`（2026-07-22），半年后读历史，每条提交仍然自解释；
- 它根目录 `.gitignore` 的第一段就是「密钥与签名材料，最高优先级，严禁入库」——忽略规则在生产仓库的第一用途是防事故，与第 4 节防 `.bak` 是同一件事的严重版；
- 提交粒度：一次提交只做一件事。改坏了，靠提交编号能精确定位到「哪次改动引入的」。

## 9. 小项目：给自己的代码目录建仓

（30 分钟）挑一个你已有的文件夹——课程作业、脚本、笔记都行，别挑包含超大文件的——完成建仓与 3 次提交。

验收清单：

1. `git init` 后 `ls -a` 能看到 `.git`；
2. 有 `.gitignore` 且至少排除一种临时文件（造一个匹配文件，`git status` 里不出现它）；
3. `git log --oneline` 恰好 3 行，每行信息能独立说清做了什么（禁止 `1`、`update`）；
4. 最后一次 `git status` 显示 `working tree clean`。

提示：每次提交前先 `git status` 确认进快照的清单。展开：第 2、3 次提交之间记得至少改一个已跟踪文件，否则会撞上错误一。

## 10. 练习

预测题（5 分钟，先写答案再验证）：在刚 init 的空仓库里依次运行 `touch a.txt`、`git add a.txt`、`touch b.txt`、`git status`。问：输出里会有哪几个区块？各列出哪个文件？

修改题（10 分钟）：把实验二重来一遍，但 `add` 后**不再改动文件**——先预测 `git status` 显示几个区块再验证；然后补 add 并提交，用 `git log --oneline` 确认历史变成 3 行。

修 Bug 题（15 分钟）：故意复现错误二——用 `git config --global --unset user.name` 和 `git config --global --unset user.email` 清掉身份，再做一次提交。撞上报错后按读报错三步修复（不许翻回第 7 节，答案就在报错文本里），最后用 `git config user.email` 读回验证。

挑战题：即第 9 节小项目，四条验收清单全过为完成。

## 与之前和之后的知识的关系

本模块按 010 → 020 → 030 → 040 → 050 → 060 推进。本文是前四篇的会师点：[Git 是什么](/git/010-Git) 的三个词全部落地，[安装与配置](/git/020-GitInstallConfig) 的署名出现在每条 `git log` 里，[环境配置与初始化](/git/030-GitEnvConfigInit) 的 `init` 支起第 2 节，[忽略规则](/git/040-GitignoreDeepDive) 在第 4 节只用了最简模式。往后：[三棵树](/git/060-ThreeTrees) 把三层现场感拆到机制层——为什么同一文件能同时出现在两个区；[git-diff 与暂存区操作](/git/070-GitDiffStagingOperation) 教你看「到底改了哪几行」；分支（100 篇）与远程（150 篇）在这套循环之上扩展。

## 官方文档

- 官方入门教程（与本文同路线）：https://git-scm.com/docs/gittutorial
- Pro Git 中文版第 2 章「Git 基础」：https://git-scm.com/book/zh/v2

## 自我检查

- 不看笔记，能说出 `status` 三个区块各对应哪一层；
- 能解释 add 与 commit 为什么分两步、同一文件为何能同时出现在两个区块；
- 撞上 `nothing added to commit` 时，30 秒内说出缺的那一步；
- 知道删掉 `.git` 目录意味着什么。

## 本章总结

`git init` 造账本；`git status` 汇报工作区、暂存区、仓库三层现状；`.gitignore` 把杂物挡在门外；`git add` 决定快照装哪些；`git commit -m` 拍下带署名的快照并写清说明；`git log --oneline` 读历史。日常循环就是「改 → add → commit → clean」。报错先读末尾：Git 几乎总把下一步命令写给你。

## 下一步

进入 [三棵树](/git/060-ThreeTrees)：三层现场感只是水面之上。下一篇拆开三层，你会明白实验二「同一文件出现两次」的机制，`reset` 与 `restore` 的行为也将变得可预测。
