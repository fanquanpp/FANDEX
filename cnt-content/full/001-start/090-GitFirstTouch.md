---
order: 90
title: 第一次把代码存进仓库：Git 起步
module: 'start'
category: 工具链
difficulty: beginner
description: 001-start 的真正收官：为什么学习笔记与练习代码从第一天就该进版本控制，git init 到首次 commit 的六条命令全流程，.gitignore 第一次亮相，以及把仓库推上 GitHub 的路径预告。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'git/010-Git'
  - 'git/020-GitInstallConfig'
  - 'start/080-LearningRouteOverview'
prerequisites:
  - 'start/030-DevEnvironmentSetup'
  - 'start/040-TerminalAndShellBasics'
---

## 0. 一句话理解

> Git 给你的代码一台"时光机"：每一次提交都是一个可以随时回去的存档点。从今天起，你的文件夹里不会再出现 `作业_最终版2_真的最终版.py`。

## 前置知识

- [终端与命令行入门](/start/040-TerminalAndShellBasics)：本篇全程在终端里操作，十个基本命令要先过关。
- [开发环境搭建](/start/030-DevEnvironmentSetup)：Git 已安装并通过 `git --version` 验证。

## 学习目标

1. 能说出"为什么第一天就用 Git"而不是"以后项目大了再说"。
2. 能用六条命令完成"初始化 -> 查状态 -> 暂存 -> 提交 -> 查历史"的完整闭环。
3. 能写出你的第一个 `.gitignore`，说出它拦住了什么。
4. 能看懂 `git status` 输出的三种状态区，知道下一步该敲什么。
5. 知道通往 GitHub 的路怎么走，以及为什么本篇不急着走完它。

## 1. 为什么从第一天就用 Git

初学者常把 Git 理解成"团队协作工具，等我进团队再用"。这个顺序是反的：**版本控制解决的第一批问题，全部发生在你独自学习的头一个月里**。

- **练习代码越写越乱**：改崩了想回到昨天的能跑版本，没有 Git 就只能靠复制文件夹，而文件夹存档很快就会变成 `v1、v2、final、final2` 的灾难；
- **教程代码想大胆改**：有了存档点，你敢把教程的例子拆开乱试——改坏了 `git checkout` 一下就回到原样。敢折腾，是学习速度的第一杠杆；
- **作品集从第一天开始积累**：GitHub 上一个持续提交的学习仓库，胜过简历上"熟悉 Git"四个字。三个月后你投出的每一个申请，链接点开都是提交历史的证据；
- **它是阶段 1 的必修**：本库路线图的阶段 1 明确要求"git 模块前 2 个学习阶段"，现在动手等于提前把地基打了。

本篇只负责让你的第一次提交真实发生。Git 的完整体系（配置、三棵树、分支、回退）在 [git 模块](/git/010-Git) 里有 10 篇系统教程，本篇末尾给你路线。

## 2. 六条命令的完整闭环

打开终端，进入你的练习目录（比如上一篇建好的 `my-code`），逐条执行：

```bash
git init                        # 1. 在当前目录初始化一个仓库
git status                      # 2. 查看当前状态
echo "print('hello git')" > hello.py
git status                      # 3. 新文件出现了，但处于"未跟踪"状态
git add hello.py                # 4. 把文件放进暂存区（下一枪的瞄准镜）
git commit -m "第一次提交：hello 脚本"   # 5. 拍下快照，写清这次改了什么
git log --oneline               # 6. 查看提交历史
```

**逐条讲解：**

1. `git init` 做的事只有一件：在目录里生成一个隐藏的 `.git` 文件夹——仓库的全部历史与配置都住在里面。**删除它等于删除整个版本历史**，除此之外它不影响任何文件，所以"误 init"不可怕，可怕的是手滑删错东西（见 [仓库初始化与误操作边界](/git/030-GitEnvConfigInit)）。
2. 第一次 `git status` 如果报错 `Please tell me who you are`，是 Git 在要求署名：`git config --global user.name "你的名字"` 与 `git config --global user.email "你的邮箱"`——每个提交都会带上这对信息，配置一次全局生效（原理见 [Git 安装与配置](/git/020-GitInstallConfig)）。
3. `git status` 是你最重要的一条命令：**不确定就先 status**。它把文件分成三区——工作区（你正在改的）、暂存区（`add` 过、等待拍快照的）、仓库区（已提交的）。报错不会发生在这条命令上，它只汇报事实。
4. `git add` 把文件从工作区放进暂存区。为什么要有这一步？因为它让你**挑选**这次提交包含什么：三个文件里只想提交两个，就只 `add` 两个。全都要时用 `git add .`（把当前目录所有变更加进去）。
5. `git commit -m "说明"` 拍下快照。说明写"这次改动是什么、为什么"，别写"update"、"修改"这种废话——三个月后翻历史时，说明就是你的检索索引。
6. `git log --oneline` 一行一个提交：提交号（一串十六进制，是快照的身份证）加说明。现在只有一条，等你提交十条后，它就是整条开发时间线。

**心智模型**：把每次 `commit` 想成游戏存档。`add` 是选存档位要带上哪些进度，`commit` 是按下保存，`git log` 是读档界面。以后你会学到"回到某个存档重新玩"（回退与分支），但今天的闭环已经覆盖日常八成的使用场景。

## 3. 第一个 .gitignore：有些文件不该进仓库

在仓库里新建一个名为 `.gitignore` 的文本文件（没有扩展名）：

```text
# 注释行：井号开头
# 系统文件
.DS_Store
Thumbs.db
# 临时与日志
*.log
*.tmp
# 以后会遇到的：依赖目录、密钥
node_modules/
.env
```

```bash
git add .gitignore
git commit -m "添加 .gitignore"
```

**讲解：**

1. `.gitignore` 里列出的文件，`git add .` 会自动跳过——它是"不许拍进快照"的黑名单。
2. 为什么重要：`node_modules/`（一个前端项目的依赖文件夹，动辄几万个文件）进仓库会让仓库膨胀到无法使用；`.env` 里住着数据库密码，进仓库等于把钥匙挂在大门口（040 篇的 [gitignore 深入](/git/040-GitignoreDeepDive) 会系统讲）。
3. 验证方法：新建一个 `test.log`，运行 `git status`——它不会出现在"未跟踪文件"里。黑名单生效了。

## 4. 通往 GitHub 的路（预告）

本地仓库是自留地，GitHub 是把它变成"作品集"的舞台。把本地仓库推上去的标准路径是：在 GitHub 建一个空仓库 -> `git remote add origin <仓库地址>` 把两者连起来 -> `git push -u origin main` 推送第一次提交。

本篇**不要求你完成这一步**，原因有二：其一，推送要处理账号与认证（HTTPS 令牌或 SSH 密钥），那是独立的半小时课题，git 模块有专门的篇幅；其二，本地闭环（init/add/commit/log）本身已经完整解决"代码安全"的问题——推送解决的是"备份与展示"。学到 [git 模块的后半段](/git/050-GitBasicOperation) 时再回来走完它，水到渠成。

## 5. 动手实践

**任务一：完成一次真实的闭环。** 为你最近写的任意一个练习（哪怕只有一个文件）建立仓库，完成"init -> add -> commit -> log"四步，提交说明按"做了什么"来写。提示：如果 `commit` 报"who you are"，回到第 2 节讲解第 2 条配署名。

**任务二：三区观察实验。** 在已提交的仓库里依次做三件事，每件后运行 `git status` 并记录输出差异：修改一个已提交的文件；`git add` 它；再修改它一次。提示：第三次 status 会同时出现两种颜色——同一文件一部分在暂存区（你 add 时的样子）、一部分还在工作区（后来的修改），这证明暂存的是"快照那一刻"而不是文件本身。

**任务三：黑名单验证。** 按第 3 节建好 `.gitignore` 后，新建 `debug.log` 与 `notes.md`，运行 `git status`：前者应隐身，后者应现身。然后把 `notes.md` 也提交掉。提示：`.gitignore` 只拦"未跟踪"的文件，已经提交过的文件要另外处理（git 模块的恢复篇讲）。

先自己操作，再对照参考流程：

<details>
<summary>任务一参考流程（含预期输出形态）</summary>

```bash
cd ~/my-code/week1        # 你的练习目录
git init
# 输出：Initialized empty Git repository in .../week1/.git/

git add notes.txt
git commit -m "第一周笔记初稿"
# 输出形如：[main (root-commit) a1b2c3d] 第一周笔记初稿
#          1 file changed, 5 insertions(+)

git log --oneline
# 输出：a1b2c3d (HEAD -> main) 第一周笔记初稿
```

读输出：`a1b2c3d` 是提交号缩写（完整的更长），`(root-commit)` 表示这是仓库第一个提交，`HEAD -> main` 表示你正站在 main 分支的最新提交上——分支的概念 git 模块会展开，现在混个眼熟即可。
</details>

<details>
<summary>任务二参考观察记录</summary>

```bash
echo "补充一行" >> notes.txt
git status
# 红色区：modified:   notes.txt        ← 只在工作区

git add notes.txt
git status
# 绿色区：modified:   notes.txt        ← 进入暂存区

echo "又改了一次" >> notes.txt
git status
# 同一个文件同时出现两行：
# 绿色：modified:   notes.txt（暂存的是 add 那一刻）
# 红色：modified:   notes.txt（后来的修改还在工作区）
```

此刻 `git commit` 提交的是绿色那份（add 时的内容），红色的第二次修改仍留在工作区等下一次 add——亲手撞见一次，"暂存区是快照选择器"就不再是概念。
</details>

## 6. 检验清单

- 能不看教程走完 init/add/commit/log 四步；
- 能说出三区（工作区、暂存区、仓库区）各自装着什么；
- 能解释 `.gitignore` 拦的是哪一类文件，并举出两个必须拦的名字；
- 遇到 `Please tell me who you are` 知道是署名没配。

## 7. 下一步

001-start 模块到此真正收官。接下来进入 [git 模块](/git/010-Git) 把版本控制学透（阶段 1 必修的前两个学习阶段），或直接进入 [全库学习路线总览](/start/080-LearningRouteOverview) 选定的主线语言模块——无论哪条路，你的每一段练习代码从今天起都有存档点了。
