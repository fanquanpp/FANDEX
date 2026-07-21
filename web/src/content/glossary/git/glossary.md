---
title: 'Git-专有名词注释查阅表 | Git'
module: 'git'
category: 'Git Basics'
description: 'Git-专有名词注释查阅表 | Git'
author: 'fanquanpp'
updated: 2026-05-03
---

## 1. 基础概念

### 1.1 Git

**名称**：Git（分布式版本控制系统）

**首次出现位置**：C07_101-Git概述.md
**定义**：

Git 是由 Linus Torvalds 于 2005 年创建的分布式版本控制系统，用于追踪文件变化、协调多人协作开发。

**详解**：
Git 的核心特性：分布式（每个开发者有完整仓库副本）、完整性（使用 SHA-1 哈希保证数据完整性）、分支管理（轻量级分支和合并）、性能高效。Git 的设计哲学：快照而非差异（大多数版本控制系统存储文件变化，Git 存储项目快照）。应用场景：代码版本管理、开源项目协作、团队开发、代码备份。Git 与其他 VCS：SVN（集中式）、Mercurial（分布式，Git 主要竞争对手）。

---

### 1.2 Linus Torvalds（林纳斯·托瓦兹）

**名称**：林纳斯·托瓦兹（Linus Torvalds）

**首次出现位置**：C07_101-Git概述.md
**定义**：

Linus Torvalds 是芬兰计算机科学家，Git 的创始人和主要开发者，同时也是 Linux 内核的创建者。

**详解**：
1991 年开始开发 Linux 内核，2005 年开始开发 Git 用于管理 Linux 内核代码开发。Git 的设计目标：速度、简单设计、对非线性开发的强力支持、完全分布式。Git 名字的由来：Linus 自嘲 "I'm an egotistical bastard, and I name all my projects after myself."，Git 在英式英语中意为"混蛋"。

---

### 1.3 版本控制

**名称**：版本控制（Version Control / Source Control）

**首次出现位置**：C07_101-Git概述.md
**定义**：

版本控制是管理文件随时间变化的系统，允许追踪修改历史、恢复到早期版本、比较不同版本差异。

**详解**：
版本控制类型：本地 VCS（本地存储）、集中式 VCS（如 SVN，多人共用服务器）、分布式 VCS（如 Git，每人本地有完整仓库）。核心功能：追踪变化、恢复旧版本、比较差异、协同开发、分支管理。适用场景：代码、文档、配置文件、设计稿等任何需要追踪变化的文件。

---

### 1.4 仓库（Repository）

**名称**：仓库（Repository）

**首次出现位置**：C07_101-Git概述.md
**定义**：

仓库是 Git 存储项目历史和元数据的目录，包含所有文件的完整历史记录。

**详解**：
本地仓库：开发者本地机器上的完整项目副本。远程仓库：托管在服务器上的仓库，如 GitHub、GitLab。裸仓库：没有工作目录的仓库（.git 目录直接可见），用于共享。克隆：`git clone url` 复制远程仓库到本地。仓库内容：.git 目录包含所有版本信息，工作目录是当前看到的文件。

---

### 1.5 工作目录（Working Directory）

**名称**：工作目录（Working Directory）

**首次出现位置**：C07_103-基本操作.md
**定义**：

工作目录是仓库中检出（checkout）到本地的某个版本的文件，用户实际编辑文件的位置。

**详解**：
工作目录 = 工作树（Working Tree）= 工作区。工作目录中的文件是 Git 追踪对象的"快照"。文件状态：未追踪（untracked）、已修改（modified）、已暂存（staged）。工作目录与 .git 同级，存放项目源文件。Git 操作影响工作目录：checkout 更新文件、reset 改变暂存区、merge 合并更改。

---

### 1.6 Git 对象

**名称**：Git 对象（Git Object）

**首次出现位置**：G07_201-Git原理与对象模型.md
**定义**：

Git 使用四种类型的对象存储数据：blob（二进制文件内容）、tree（目录结构）、commit（提交快照）、tag（标签引用）。

**详解**：
blob 对象：存储文件内容（无文件名、无历史信息）。tree 对象：存储目录结构，包含文件名和 blob/tree 引用。commit 对象：指向 tree，记录提交信息、作者、时间、父提交。tag 对象：指向 commit，通常用于版本标记。每个对象通过 SHA-1 哈希值（40位十六进制）唯一标识。对象存储在 .git/objects 目录。

---

## 2. Git 区域

### 2.1 暂存区（Staging Area）

**名称**：暂存区（Staging Area / Index）

**首次出现位置**：C07_103-基本操作.md
**定义**：

暂存区是 Git 的核心概念之一，是 .git/index 文件，记录下次提交将包含的文件信息。

**详解**：
暂存区 = Index = Staging Area。暂存操作：`git add file` 将文件添加到暂存区。暂存区内容：文件名、blob 指针、工作目录状态。暂存区作用：选择性地提交更改、控制每次提交的内容。查看暂存区：`git ls-files --stage`。重置暂存区：`git reset` 清空暂存区。暂存区与提交：提交创建 commit 对象，记录 tree 和暂存区内容。

---

### 2.2 HEAD

**名称**：头部指针（HEAD）

**首次出现位置**：C07_103-基本操作.md
**定义**：

HEAD 是 Git 的特殊指针，指向当前分支的最新提交，标识你正在工作的提交位置。

**详解**：
HEAD 文件在 .git/HEAD，内容如 `ref: refs/heads/main`。分离 HEAD：checkout 到非分支提交，HEAD 直接指向提交。分离 HEAD 警告：在此状态下提交会导致新分支创建，需小心处理。HEAD 移动：`git checkout`、`git reset` 会移动 HEAD。前一个 HEAD：`HEAD^` 或 `HEAD~1` 指向前一个提交。

---

### 2.3 分支（Branch）

**名称**：分支（Branch）

**首次出现位置**：C07_104-分支管理.md
**定义**：

分支是指向提交对象的可变指针，Git 的分支是轻量级且高效的，允许在同一仓库中并行开发。

**详解**：
分支文件在 .git/refs/heads/ 下的文本文件，内容是提交哈希。创建分支：`git branch name`（仅创建）。切换分支：`git checkout name` 或 `git switch name`。当前分支：HEAD 指向的分支。当前分支指针随提交推进。分支合并后可以删除：`git branch -d name`。常用分支：main/master（主分支）、develop（开发分支）、feature（功能分支）、hotfix（紧急修复分支）。

---

### 2.4 标签（Tag）

**名称**：标签（Tag）

**首次出现位置**：C07_104-分支管理.md
**定义**：

标签是对特定提交的永久引用，通常用于标记版本发布点，如 v1.0.0。

**详解**：
轻量标签：`git tag v1.0.0` 仅是指向提交的指针。附注标签：`git tag -a v1.0.0 -m "message"` 创建带注释的标签对象。标签对象：包含标签信息、标签者、日期、注释。列出标签：`git tag`、`git tag -l "v1.*"`。删除标签：`git tag -d tagname`。推送标签：`git push origin tagname`、`git push --tags`。

---

## 3. 基本操作

### 3.1 git init

**名称**：初始化仓库（git init）

**首次出现位置**：C07_102-环境配置与初始化.md
**定义**：

git init 命令在当前目录创建一个新的 Git 仓库，生成 .git 子目录和必要的配置文件。

**详解**：
执行后生成：.git 目录（仓库数据）、初始化默认分支（通常是 main）。选项：`git init --bare` 创建裸仓库（无工作目录）。目录要求：空目录或有文件都可以，init 不会删除现有文件。重新初始化：`git init` 可在已有仓库上重新初始化。模板：`git init --template=<template-directory>` 指定模板。

---

### 3.2 git clone

**名称**：克隆仓库（git clone）

**首次出现位置**：C07_103-基本操作.md
**定义**：

git clone 复制远程仓库到本地，创建工作目录并自动配置 remote 指向远程仓库。

**详解**：
语法：`git clone <url>` 或 `git clone <url> <directory>`。协议支持：https://、git://、ssh://（<git@github.com>:user/repo.git）。克隆内容：完整的仓库历史、所有分支（除 HEAD）、工作目录。自动配置：remote origin 自动添加、本地分支与远程分支关联。浅克隆：`git clone --depth 1` 只克隆最近一次提交。子模块：`git clone --recursive` 同时克隆子模块。

---

### 3.3 git add

**名称**：添加文件到暂存区（git add）

**首次出现位置**：C07_103-基本操作.md
**定义**：

git add 将工作目录中的变更添加到暂存区，决定哪些更改将包含在下一次提交中。

**详解**：
文件操作：`git add <file>` 暂存特定文件。目录操作：`git add .` 暂存所有变更（不包括删除）。交互式：`git add -i` 进入交互模式。预览：`git add -n` 预览将要添加的文件。删除操作：`git add -u` 暂存已删除的文件。暂存行为：添加文件快照，而非文件本身。

---

### 3.4 git commit

**名称**：提交更改（git commit）

**首次出现位置**：C07_103-基本操作.md
**定义**：

git commit 创建新提交，将暂存区内容永久记录为仓库历史中的一个节点。

**详解**：
基本用法：`git commit -m "commit message"`。提交信息：应简洁描述本次更改。空提交：`git commit --allow-empty`。提交哈希：自动生成由 SHA-1 哈希值标识提交。提交内容：tree 对象（快照）、提交信息、作者提交者信息、父提交。修补提交：`git commit --amend` 修改最后一次提交。跳过钩子：`git commit --no-verify`。

---

### 3.5 git status

**名称**：查看状态（git status）

**首次出现位置**：C07_103-基本操作.md
**定义**：

git status 显示工作目录和暂存区的当前状态，包括已修改、已暂存、未追踪的文件。

**详解**：
输出信息：当前分支、暂存区状态、工作目录变更。简洁模式：`git status -s` 或 `git status --short`。标记含义：M（修改）、A（新增）、D（删除）、R（重命名）、??（未追踪）。忽略文件：.gitignore 匹配的文件不显示。长格式 vs 短格式：长格式更详细，短格式适合脚本。

---

### 3.6 git diff

**名称**：比较差异（git diff）

**首次出现位置**：C07_103-基本操作.md
**定义**：

git diff 显示文件之间的差异，用于查看未暂存的修改或已暂存与提交的差异。

**详解**：
工作区 vs 暂存区：`git diff`（默认）。暂存区 vs HEAD：`git diff --staged` 或 `git diff --cached`。工作区 vs HEAD：`git diff HEAD`。比较两个提交：`git diff commit1 commit2`。比较分支：`git diff branch1..branch2`。统计：`git diff --stat` 只显示统计信息。逐字差异：`git diff --word-diff` 显示词语级别变化。

---

### 3.7 git log

**名称**：查看提交历史（git log）

**首次出现位置**：C07_103-基本操作.md
**定义**：

git log 显示仓库的提交历史，默认从最新到最早显示各提交的哈希、作者、日期和提交信息。

**详解**：
常用选项：`--oneline`（单行简洁）、`--graph`（分支图形）、`--all`（所有分支）、`--author=name`（特定作者）、`--since="2 weeks ago"`（时间范围）、`-n`（限制数量）。搜索：`--grep="keyword"` 搜索提交信息。文件历史：`git log --follow file` 追踪文件历史。格式：`--pretty=format:"%h %s"` 自定义格式。

---

### 3.8 git stash

**名称**：暂存工作现场（git stash）

**首次出现位置**：C07_103-基本操作.md
**定义**：

git stash 临时保存工作目录和暂存区的变更，让工作目录回到干净状态，以便切换分支或进行其他操作。

**详解**：
保存暂存：`git stash` 或 `git stash save "message"`。查看列表：`git stash list`。恢复暂存：`git stash apply`（保留暂存）或 `git stash pop`（恢复并删除）。删除暂存：`git stash drop`。恢复特定：`git stash apply stash@{0}`。包含暂存区：`git stash -u`（包含未追踪）、`git stash --keep-index`（保留暂存）。

---

## 4. 分支操作

### 4.1 git branch

**名称**：分支管理（git branch）

**首次出现位置**：C07_104-分支管理.md
**定义**：

git branch 命令用于创建、列出、删除和重命名分支。

**详解**：
创建分支：`git branch branchname`。列出分支：`git branch`（本地）、`git branch -a`（包含远程）、`git branch -r`（远程）。删除分支：`git branch -d branchname`（安全删除）、`git branch -D branchname`（强制删除）。重命名：`git branch -m oldname newname`。查看最近提交：`git branch -v`。设置上游：`git branch --set-upstream-to=origin/branch`。

---

### 4.2 git checkout

**名称**：切换分支（git checkout）

**首次出现位置**：C07_104-分支管理.md
**定义**：

git checkout 切换分支或恢复工作目录文件，是 Git 最常用的命令之一。

**详解**：
切换分支：`git checkout branchname`。创建并切换：`git checkout -b branchname`（等同于 git branch + checkout）。分离 HEAD：`git checkout <commit-hash>`。放弃修改：`git checkout -- file`（用 HEAD 版本覆盖工作目录）。放弃暂存：`git checkout -- file` 用暂存区版本覆盖工作目录。新命令：`git switch`（切换分支）、`git restore`（恢复文件）更语义化。

---

### 4.3 git merge

**名称**：合并分支（git merge）

**首次出现位置**：C07_104-分支管理.md
**定义**：

git merge 将一个分支的更改合并到当前分支，创建新的提交（合并提交）表示合并操作。

**详解**：
基本用法：`git checkout main && git merge feature`。快进合并：目标分支无新提交时，直接移动指针。合并冲突：同一文件被双方修改时需要手动解决。合并提交：三方合并时自动创建合并提交。合并信息：`Merge branch 'feature' into main`。中止合并：`git merge --abort`。

---

### 4.4 git rebase

**名称**：变基（git rebase）

**首次出现位置**：C07_104-分支管理.md
**定义**：

git rebase 将提交在另一分支基础上重新应用，产生更线性的历史记录。

**详解**：
变基原理：找到共同祖先、提取当前分支提交、在目标分支上重新应用。命令：`git rebase main`（将当前分支变基到 main）。黄金规则：不要对已推送的公共分支变基。交互式变基：`git rebase -i HEAD~3` 修改/合并/删除过去3个提交。变基 vs 合并：变基历史更线性，合并历史更真实。冲突解决：解决冲突后 `git rebase --continue`。

---

### 4.5 合并冲突

**名称**：合并冲突（Merge Conflict）

**首次出现位置**：C07_104-分支管理.md
**定义**：

合并冲突发生于 Git 无法自动合并时，同一文件的同一位置被不同分支修改。

**详解**：
冲突标记：`<<<<<<< HEAD`、`=======`、`>>>>>>>` 分隔冲突内容。解决冲突：手动编辑文件，保留需要的内容，删除标记。标记冲突文件：`git add file` 表示已解决。完成合并：`git commit` 完成合并提交流程。中止合并：`git merge --abort` 放弃合并。预防冲突：小步提交、频繁合并、良好的分支策略。

---

## 5. 远程操作

### 5.1 git remote

**名称**：远程仓库（Remote）

**首次出现位置**：C07_105-远程仓库操作.md
**定义**：

remote 是本地仓库与远程仓库之间的连接，通过名称和 URL 定义，常见名称为 origin。

**详解**：
列出远程：`git remote -v`（显示 URL）。添加远程：`git remote add name url`。删除远程：`git remote remove name`。重命名：`git remote rename old new`。查看详情：`git remote show name`。URL 格式：HTTPS（<https://github.com/user/repo.git）、SSH（git@github.com:user/repo.git）。>

---

### 5.2 git push

**名称**：推送到远程（git push）

**首次出现位置**：C07_105-远程仓库操作.md
**定义**：

git push 将本地分支提交发送到远程仓库，同步本地仓库的更改到远程。

**详解**：
基本用法：`git push origin branchname`。设置上游：`git push -u origin branchname`（后续可直接 git push）。推送标签：`git push origin tagname`、`git push --tags`。删除远程分支：`git push origin --delete branchname`。强制推送：`git push --force`（危险！）。推送所有：`git push --all`。

---

### 5.3 git fetch

**名称**：获取远程更新（git fetch）

**首次出现位置**：C07_105-远程仓库操作.md
**定义**：

git fetch 从远程仓库获取最新提交到本地，更新远程跟踪分支，但不自动合并。

**详解**：
基本用法：`git fetch origin`。获取所有：`git fetch --all`。只取特定分支：`git fetch origin branchname`。与 pull 的区别：fetch 只获取不合并，给予用户选择权。查看差异：`git log HEAD..origin/main`。合并远程跟踪：`git merge origin/main`。FETCH_HEAD：记录刚获取的分支。

---

### 5.4 git pull

**名称**：拉取并合并（git pull）

**首次出现位置**：C07_105-远程仓库操作.md
**定义**：

git pull 从远程仓库获取并合并到当前分支，是 fetch 和 merge 的组合操作。

**详解**：
等价操作：`git pull` = `git fetch` + `git merge`。拉取方式：`git pull origin main`。变基拉取：`git pull --rebase` = fetch + rebase。冲突处理：拉取时如有冲突需要解决。自动变基：`git config pull.rebase ` 全局默认变基。prune：`git pull --prune` 清理已删除的远程分支。

---

### 5.5 origin

**名称**：远程仓库默认名称（origin）

**首次出现位置**：C07_105-远程仓库操作.md
**定义**：

origin 是克隆仓库时 Git 自动创建的默认远程仓库名称，指向被克隆的仓库 URL。

**详解**：
origin 只是约定俗成的名称，不是关键字。可以修改或添加多个远程仓库。显示 origin URL：`git remote -v`。修改 origin：`git remote set-url origin newurl`。添加额外远程：`git remote add upstream url`（常见于 Fork 工作流）。origin 命名：克隆本地时也可以用其他名称。

---

## 6. 撤销与重置

### 6.1 git reset

**名称**：重置分支（git reset）

**首次出现位置**：C07_103-基本操作.md
**定义**：

git reset 移动分支指针和 HEAD 位置，可以选择性地修改暂存区和工作目录。

**详解**：
三种模式：--soft（保留暂存和工作目录）、--mixed（默认，保留工作目录）、--hard（丢弃更改）。软重置：`git reset --soft HEAD~1` 撤销提交但保留暂存区。混合重置：`git reset HEAD file` 取消暂存文件。硬重置：`git reset --hard HEAD~1` 完全丢弃更改（危险！）。重置 vs checkout：reset 移动分支指针，checkout 移动 HEAD。

---

### 6.2 git revert

**名称**：反转提交（git revert）

**首次出现位置**：C07_103-基本操作.md
**定义**：

git revert 创建一个新提交，撤销指定提交引入的更改，是安全的撤销方式。

**详解**：
原理：不像 reset 移动指针，而是生成一个新提交反转更改。安全撤销：revert 保留完整历史，适用于已推送的提交。典型用法：`git revert HEAD`、`git revert commit-hash`。冲突处理：如有冲突需要解决后提交。多人协作：revert 是推荐的安全撤销方式。

---

### 6.3 git restore

**名称**：恢复文件（git restore）

**首次出现位置**：C07_103-基本操作.md
**定义**：

git restore 是 Git 2.23 引入的新命令，用于恢复工作目录或暂存区文件，比 checkout -- 更明确。

**详解**：
恢复工作目录：`git restore file`。恢复暂存区：`git restore --staged file`。恢复两者：`git restore -SW file`。等同于旧命令：`git restore file` = `git checkout -- file`。与 reset 区别：restore 只恢复文件，不移动分支指针。

---

## 7. Git 高级特性

### 7.1 .gitignore

**名称**：忽略文件（.gitignore）

**首次出现位置**：C07_102-环境配置与初始化.md
**定义**：

.gitignore 文件指定 Git 应忽略的文件和目录，这些文件不会被跟踪、暂存或提交。

**详解**：
语法：支持 glob 模式（`**` 匹配零或多字符、`*` 匹配目录、`?` 匹配单字符）。注释：`#` 开头。否定：`!pattern` 不忽略匹配的文件。示例：`*.log`、`node_modules/`、`build/`。全局忽略：`git config --global core.excludesfile ~/.gitignore`。已追踪文件：添加到 .gitignore 前已追踪的文件不受影响，需要先删除。

---

### 7.2 git cherry-pick

**名称**：挑选提交（git cherry-pick）

**首次出现位置**：C07_104-分支管理.md
**定义**：

git cherry-pick 将指定提交（一个或多个）在当前分支上重新应用，产生新的提交。

**详解**：
基本用法：`git cherry-pick commit-hash`。多个提交：`git cherry-pick commit1 commit2`。范围：`git cherry-pick commit1..commit2`。继续：`git cherry-pick --continue`。中止：`git cherry-pick --abort`。冲突处理：解决冲突后 add + cherry-pick --continue。用途：紧急修复 cherry-pick 到发布分支、功能选择性地合并。

---

### 7.3 git submodule

**名称**：子模块（git submodule）

**首次出现位置**：G07_202-Git钩子与Git LFS.md
**定义**：

submodule 允许在一个 Git 仓库中嵌入另一个独立的 Git 仓库，保持子仓库的版本独立控制。

**详解**：
添加：`git submodule add url path`。克隆含子模块：`git clone --recursive` 或普通 clone + `git submodule update --init`。更新子模块：`git submodule update --remote`。初始化：`git submodule update --init`。删除子模块：较复杂，需手动编辑 .gitmodules 和 .git/config。用途：共享库、项目依赖、开源组件。

---

### 7.4 Git Hooks

**名称**：Git 钩子（Git Hooks）

**首次出现位置**：G07_202-Git钩子与Git LFS.md
**定义**：

Git Hooks 是在特定 Git 操作（如 commit、push、merge）前后自动执行的脚本，用于自动化检查或处理。

**详解**：
位置在 .git/hooks/ 目录。客户端钩子：pre-commit、prepare-commit-msg、commit-msg、post-commit 等。服务端钩子：pre-receive、update、post-receive 等。示例：pre-commit 运行测试、commit-msg 规范提交信息、pre-push 运行 lint。启用：给钩子脚本添加执行权限。模板钩子：`git config --global init.templateDir dir` 设置模板目录。

---

### 7.5 Git LFS

**名称**：Git 大文件存储（Git Large File Storage）

**首次出现位置**：G07_202-Git钩子与Git LFS.md
**定义**：

Git LFS 是 Git 扩展，用于高效管理仓库中的大文件，将大文件内容存储在 LFS 服务器，仓库只保存指针引用。

**详解**：
安装：`git lfs install`。追踪：`git lfs track "*.psd"`。追踪后提交 .gitattributes 记录追踪模式。指针文件：实际文件替换为指针（文本文件）。克隆：`git lfs clone` 或普通 clone + `git lfs pull`。优势：大文件不拖慢仓库克隆。免费额度：GitHub 提供免费存储和带宽。

---

## 8. 配置与别名

### 8.1 git config

**名称**：Git 配置（git config）

**首次出现位置**：C07_102-环境配置与初始化.md
**定义**：

git config 用于设置 Git 配置选项，包括用户信息、行为偏好、别名等。

**详解**：
作用域：--local（仓库级，默认）、--global（用户级）、--system（系统级）。用户信息：`git config --global user.name "name"`、`git config --global user.email "email"`。查看配置：`git config --list`。查看特定：`git config user.name`。编辑器：`git config --global core.editor vim`。合并工具：`git config --global merge.tool vimdiff`。

---

### 8.2 SSH 配置

**名称**：SSH 配置（SSH Config）

**首次出现位置**：C07_102-环境配置与初始化.md
**定义**：

SSH 配置文件用于配置 SSH 连接参数、多账户、密钥文件等，Git 远程操作常用 SSH 协议。

**详解**：
位置：~/.ssh/config。配置格式：Host 定义主机别名，HostName 实际主机，User 用户名，IdentityFile 密钥文件。配置示例：

```
 Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519
```

## 多账户：为不同 GitHub 账户配置不同密钥和 Host 别名。权限：config 文件权限应为 600。

## 9. 协作与工作流

### 9.1 Fork

**名称**：派生（Fork）

**首次出现位置**：C07_105-远程仓库操作.md
**定义**：

Fork 是在 GitHub/GitLab 等平台创建他人仓库的副本到自己的账户下。

**详解**：
平台操作：网页按钮创建，不涉及 Git 命令。双向同步：Fork 与原仓库相互独立，可添加 upstream 远程跟踪原仓库。贡献流程：Fork → Clone → 修改 → Push → Pull Request。保持同步：`git fetch upstream` 获取原仓库更新。Fork vs Clone：Fork 在服务器创建副本，Clone 复制到本地。

---

### 9.2 Pull Request

**名称**：拉取请求（Pull Request）

**缩写**：PR
**首次出现位置**：C07_105-远程仓库操作.md

**定义**：

Pull Request 是向原仓库提交代码审查和合并请求的机制，是开源协作的核心流程。

**详解**：
创建方式：在 Fork 的仓库页面点击 "New Pull Request"。代码审查：审查者可以评论、提出修改建议。检查通过：CI/CD 检查、至少一个审查者批准后才能合并。合并策略：Merge、Squash、Rebase。关闭 PR：未准备好可创建 draft PR。术语：在 GitLab 称为 Merge Request（MR）。

---

### 9.3 Git Flow

**名称**：Git 工作流（Git Flow）

**首次出现位置**：C07_104-分支管理.md
**定义**：

Git Flow 是一种 Git 分支管理策略，通过主分支、开发分支、功能分支、发布分支、热修复分支组织开发流程。

**详解**：
分支类型：main（生产）、develop（开发）、feature/_（功能）、release/_（发布）、hotfix/\*（热修复）。常用分支：develop 集成开发中的功能，main 保持稳定可发布。热修复：直接从 main 创建 hotfix 分支，修复后合并到 main 和 develop。工具：git-flow 插件简化操作。适用场景：需要严格发布周期的团队项目。

---

## 更新日志

- 2026-04-30：创建专有名词解释文档，v1.0.0
