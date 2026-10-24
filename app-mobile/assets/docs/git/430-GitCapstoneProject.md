---
order: 460
title: Git 毕业项目：像团队一样管理一个真实仓库
description: Git 模块出口项目：把自己的学习代码目录升级为规范仓库——功能分支工作流、约定式提交信息、仓库级与全局两级 .gitignore、一次真实的合并冲突解决与一次附注标签打版，以 FANDEX 仓库为参照，附可逐条勾选的验收断言。
module: 'git'
category: 工具链
difficulty: intermediate
author: fanquanpp
updated: '2026-10-11'
related:
  - 'git/040-GitignoreDeepDive'
  - 'git/100-GitBranchManagement'
  - 'git/130-MergeConflictResolution'
  - 'git/150-GitRemoteRepoOperation'
  - 'git/180-GitLogDetailed'
  - 'git/200-TagManagement'
  - 'git/210-GitFlowGitHubFlow'
prerequisites:
  - 'git/050-GitBasicOperation'
  - 'git/150-GitRemoteRepoOperation'
---

## 前置知识

- 已完成 [Git 基础操作](/git/050-GitBasicOperation)：能独立完成 init → add → commit 循环，写得出半年后仍看得懂的提交信息；
- 分支（[100 篇](/git/100-GitBranchManagement)）、合并冲突（[130 篇](/git/130-MergeConflictResolution)）、标签（[200 篇](/git/200-TagManagement)）在对应里程碑开始前按需读，每步开头会指路；
- 远程只用最基础的 push（[150 篇](/git/150-GitRemoteRepoOperation)）：命令可先照抄跑通、回头再补理解，故 150 篇可后补。

## 背景与目标

050 篇的小项目里，你给自己的代码目录建了仓、做了 3 次提交。那是「一个人随手记账」的水平。真实团队里，仓库远不止是备份：分支隔离开发让 main 始终可用，提交信息可按类型检索，历史能讲故事，版本能打标发布。

本项目的对象是你**真实在用的**那个代码目录——课程作业、脚本、练手项目都行。把它升级为规范仓库。你不写新功能，而是给已有目录建立秩序——这正是接手团队旧仓库时每天都在发生的事。

学完本项目你新增的能力：

1. 用功能分支工作流开发，main 分支始终处于可用状态；
2. 写出全仓库统一的约定式提交信息，历史可按类型检索；
3. 用仓库级加全局两层 `.gitignore` 把杂物挡在门外；
4. 制造、定位、解决一次真实的合并冲突，并说清取舍理由；
5. 打附注标签、配置远端备份，让仓库「可发布、可复现」。

预计 3 到 5 小时，跨多天完成更佳——像样的提交历史需要时间沉淀。

### 参照物：一个真实仓库长什么样

以 FANDEX 仓库为参照（你正在读的课程库本身就是一座生产级仓库）：

- 根目录 `README.md` 的「贡献」一节写明了分支模型：`main`（受保护发布主线）+ `dev`（协作集成分支）——个人项目不必这么重，但「main 保持可用、改动走分支」的原则一致；
- 根目录 `CONTRIBUTING.md` 第 5 节规定了提交信息遵循 Conventional Commits：格式为 `type(scope): 描述`，type 取 feat / fix / docs / content / refactor / chore / ci / perf / test，描述中文、动词开头、结尾不加句号，示例 `fix(content): 修正 go 模块并发章节的代码示例错误`；
- 它的首条提交（050 篇引用过）是 `feat: initialize FANDEX monorepo with web/desktop/android subprojects`——项目从第一笔就守规矩。

你的项目不必照搬双分支模型，但提交纪律照抄：本文 user stories 的合规标准以 `CONTRIBUTING.md` 第 5 节为准。

## User stories（必做 9 条）

每条都是可检查的断言，逐条勾掉。

- **A1** 仓库就位：项目目录下 `git status` 不再报 `not a git repository`，且 `git log --oneline` 的首条提交是 root-commit，信息以 type 开头。
- **A2** 仓库级忽略生效：`.gitignore` 至少排除两类杂物（如 `*.bak`、`__pycache__/`），且对一个造出来的匹配文件，`git check-ignore -v 文件名` 能指认到具体规则行。
- **A3** 全局忽略就位：`git config --global --get core.excludesFile` 指向一个真实存在的文件，编辑器与系统杂物（如 `.DS_Store`、`desktop.ini`、`Thumbs.db`）写在里面，同样能用 `check-ignore -v` 验证。
- **A4** 提交信息全部合规：`git log --oneline` 的每一行，去掉哈希后都以 type 或 type(scope) 开头，type 只取 `CONTRIBUTING.md` 第 5 节清单内的值，描述没有句号结尾。数一数，违规条数为 0。
- **A5** 分支工作流走通：历史中至少有一条合并提交（`git log --merges --oneline` 至少 1 行），该功能在分支上至少提交 2 次，且你能指认出哪几条提交属于哪条分支。
- **A6** 冲突被真实解决一次：两个分支改同一行制造冲突后完成合并。断言：`git grep "<<<<<<<"` 无输出（HEAD 中无冲突标记残留），且你能口头说出冲突双方各想表达什么、你为什么这样取舍。
- **A7** 版本已打标：`git tag -l` 含 `v0.1.0`；`git show v0.1.0` 能看到附注标签的 tagger 与说明；标签指向你认定「当前可用」的那个提交。
- **A8** 远端可复现：`git remote -v` 列出 origin；推送后 `git status` 显示 up to date with 'origin/main'；用浏览器打开远端仓库页，能看到完整历史与 README。
- **A9** 仓库会自我介绍：根目录 `README.md` 已入库（`git ls-files` 可见），首屏至少有「这是什么」「怎么跑起来」两段。

## Extra credit（选做 3 条）

- **E1** scope 纪律：功能分支以 `type/短名` 命名（如 `feat/export-csv`），提交信息带 scope（如 `feat(ledger): ...`）。断言：历史中带 scope 的提交至少 3 条。
- **E2** 历史会讲故事：把 `git log --graph --oneline --all` 的输出贴进学习笔记，主干清晰，每处分叉与合并都对应一个你还记得的功能。
- **E3** 模拟第二个人：clone 一份仓库到另一个目录，改同一行提交并推送，体验一次被拒绝的 push，再按报错提示 pull 合并后推送成功——150 篇的 pull 在此登场。

## 里程碑拆解（4 步）

### 里程碑 1：建仓与两层忽略（对应 A1 至 A3）

先读：[040 篇](/git/040-GitignoreDeepDive)「仓库级与全局忽略的分工」一节。

方向：`git init`，写首个提交；仓库级 `.gitignore` 从最小可用开始，踩到杂物再补；全局忽略文件配一次管所有仓库。

完成后应看到：`git check-ignore -v __pycache__/demo.pyc` 输出指认到命中的规则；`git log --oneline` 至少 1 行；`core.excludesFile` 读回值指向存在的文件。

### 里程碑 2：把历史喂出来（对应 A4）

先读：FANDEX 根目录 `CONTRIBUTING.md` 第 5 节；想自定义输出格式再读 [180 篇](/git/180-GitLogDetailed)。

方向：接下来几天正常使用这个目录，每个逻辑单元一次提交，信息按 type 开头；提交前先 `git status` 核对清单。现在就可开始，不必等里程碑 3。

完成后应看到：`git log --oneline` 一屏读完，每条一眼知道干了什么；A4 检查违规为 0。

### 里程碑 3：分支、合并与冲突（对应 A5、A6）

先读：[100 篇](/git/100-GitBranchManagement)分支创建与合并、[130 篇](/git/130-MergeConflictResolution)冲突解决。

方向：挑一个真实小功能开分支；为体验冲突，在分支与 main 上各改同一行（比如同一个配置值、同一个统计口径），然后合并并解决。

完成后应看到：

```bash
git log --graph --oneline | head -8
```

输出出现分叉与合并节点；`git grep "<<<<<<<"` 无输出；冲突的取舍理由你能复述。

### 里程碑 4：打版与远端备份（对应 A7、A8、A9）

先读：[200 篇](/git/200-TagManagement)标签管理；push 命令可照抄 [150 篇](/git/150-GitRemoteRepoOperation)。

方向：为当前可用状态打附注标签 `v0.1.0`；在 GitHub 或 Gitee 建空仓库，关联 origin 并推送 main；写 README 入库。

完成后应看到：`git show v0.1.0` 有 tagger 与说明；`git status` 显示 up to date；浏览器打开远端仓库，历史与 README 完整可读。

## 提示区

本文不给操作序列，只给命令清单方向——每个命令的细节都在对应篇章：init、status、add、commit、log（`--oneline` / `--graph` / `--pretty=format:%s`）、branch、`switch -c`、merge、`merge --abort`、`check-ignore -v`、`tag -a`、`remote add`、`push -u`。

常见坑：

- `core.excludesFile` 只改了文件忘了 `git config --global` 指向它——用 `--get` 读回验证；
- 已经被跟踪的文件不会被新忽略规则救下——这是 040 篇的第一大坑，需先取消跟踪；
- 功能改完了才想起没开分支——先切分支再提交，补救手段见 [090 篇](/git/090-GitCommitAmend)与 100 篇；
- 附注标签默认不随 push 上传，需要显式推送（200 篇）；`push -u` 只在首次建立关联时需要；
- 管道命令（`grep`、`head`）在 Windows 上请用 Git Bash 执行，CMD 与 PowerShell 不认；
- `merge --abort` 是后悔药，不是失败——冲突解不下去时先回退，读 130 篇再来。

## 验收清单

- [ ] A1 `git status` 正常，首条提交是 root-commit
- [ ] A2 仓库级规则两类以上，`check-ignore -v` 指认成功
- [ ] A3 全局忽略文件存在且被 `core.excludesFile` 指向
- [ ] A4 提交信息违规条数为 0
- [ ] A5 `git log --merges --oneline` 至少 1 行，分支上提交至少 2 次
- [ ] A6 `git grep "<<<<<<<"` 无输出，冲突取舍说得清
- [ ] A7 `git tag -l` 含 v0.1.0，附注信息完整
- [ ] A8 `git status` 显示 up to date with 'origin/main'
- [ ] A9 README 已入库且含「这是什么」「怎么跑起来」
- [ ] E1 带 scope 的提交至少 3 条（选做）
- [ ] E2 --graph 历史图已入笔记（选做）
- [ ] E3 完成一次 pull 后成功的 push（选做）

## 常见弯路

- **先写完功能再一次性补历史**：补出来的历史是假的，按里程碑推进，让提交跟着开发自然生长；
- **冲突造得太假**：两个分支改不同文件根本撞不上，必须同一行才学得到东西；
- **追求一次写全 `.gitignore`**：从最小可用开始，撞到杂物、用 `check-ignore -v` 定位、再补规则，这本身就是工作流；
- **把远端当成第一优先级**：没有网络条件时 A8 可延后，本地里程碑先行——但最终必须备份，完成标志是「仓库可复现」，不是「代码写完了」；
- **把提交纪律当负担**：提交信息是给半年后的你和协作者看的路标，FANDEX 五百多次提交仍自解释，靠纪律而非记性。

## 完成后你能做什么

- 任何一个代码目录，10 分钟内升级为规范仓库，历史半年后仍可读、可检索、可回退；
- 团队分支模型（[210 篇](/git/210-GitFlowGitHubFlow)）的每个动作你都在小尺度上亲手走过一遍；
- 下一步到 [GitHub 模块](/github/010-GitHubOverview) 把仓库变成协作现场：Pull Request、Issue 与 Actions（[180 篇](/github/180-PullRequestCompleteCollaborationFlow)）都在等这座仓库。
- 这套仓库纪律不挑技术栈：无论此后走 [Python 后端与 AI 路线](/roadmap/050-BackendPythonAIRoute)还是 [DevOps 与云路线](/roadmap/090-DevOpsCloudRoute)，每个项目的第一个动作都是 `git init`。
