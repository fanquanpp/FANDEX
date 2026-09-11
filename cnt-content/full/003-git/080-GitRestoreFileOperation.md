---
order: 80
title: git-restore 与文件操作
module: 'git'
category: 工具链
difficulty: intermediate
description: git restore / rm / mv / clean 文件级操作详解：语义、安全边界与恢复手段。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/060-ThreeTrees'
  - 'git/070-GitDiffStagingOperation'
  - 'git/300-GitReset'
  - 'git/260-GitReflog'
prerequisites:
  - 'git/060-ThreeTrees'
---

## 前置知识与学习目标

**前置知识**：理解三棵树模型（工作区 / 暂存区 / 仓库）。

学完本文你应当能够：

1. 用 `git restore` 精确恢复工作区或暂存区，替代易误伤的 `checkout --` 老写法；
2. 正确使用 `rm`、`mv` 管理跟踪状态，理解 Git 的重命名检测；
3. 安全使用 `clean` 清理未跟踪文件，并清楚每条命令「最多能丢什么」。

一句话定位：这组命令都工作在**文件粒度**，不动分支指针、不改历史。真正的危险不在「改历史」而在「丢工作」，所以每节都会标注数据可恢复性。

## 1. git restore：文件级恢复的现代标准

Git 2.23（2019）把老 `checkout` 的两副面孔拆开：切分支交给 `git switch`，恢复文件交给 `git restore`。restore 只做一件事——**从指定来源把文件复制到指定目的地**：

```bash
# 来源默认是暂存区，目的地默认是工作区
git restore file.txt                    # 用暂存区版本覆盖工作区（丢弃未暂存修改）

git restore --staged file.txt           # 目的地改为暂存区：用 HEAD 版本覆盖暂存区（取消暂存）

git restore --source=HEAD~3 file.txt    # 来源改为任意提交
git restore -s main -- file.txt

# 工作区与暂存区一起恢复到 HEAD
git restore -s HEAD --staged --worktree file.txt
git restore -SW file.txt                # 短选项等价写法
```

| 老写法                       | 现代写法                        |
| :--------------------------- | :------------------------------ |
| `git checkout -- file`       | `git restore file`              |
| `git reset HEAD file`        | `git restore --staged file`     |
| `git checkout <commit> -- f` | `git restore -s <commit> file`  |
| `git checkout <branch>`      | `git switch <branch>`（语义不同）|

注意 `restore` 默认不碰**未跟踪**文件，也永远不会移动分支指针——把它当作「带方向的三棵树复制器」理解即可。

## 2. git rm：让「删除」进入版本控制

工作区里 `rm` 掉文件后，Git 只会显示未暂存的删除；`git rm` 则一次完成「删文件 + 记录删除」：

```bash
git rm file.txt               # 删除工作区文件并暂存该删除
git rm -r legacy/             # 递归删除目录
git rm -f file.txt            # 文件有未暂存修改时需强制
git rm --cached secret.env    # 只移出跟踪，保留本地文件（停用跟踪）
```

`--cached` 的高频场景是「跟踪了不该跟踪的东西」——补好 `.gitignore` 后移出跟踪：

```bash
git rm -r --cached node_modules/    # 停止跟踪（本地目录保留）
git commit -m "chore: stop tracking node_modules"
```

已手动删除一堆文件时，一条命令批量暂存删除：

```bash
git rm $(git ls-files --deleted)
# 或者更简单：git add -u 会把删除也暂存
```

## 3. git mv：重命名 = 删旧加新

```bash
git mv old-name.txt new-name.txt      # 重命名
git mv src/util.js lib/util.js        # 移动到别的目录
```

`git mv` 不是特殊能力，等价于三步组合：

```bash
mv old-name.txt new-name.txt
git rm old-name.txt
git add new-name.txt
```

### 3.1 重命名检测：内容相似度，而非记录

Git **不存储**「这个文件被改名了」的事实。提交后它通过比较内容相似度推断重命名（默认阈值 50%）：

```bash
git diff -M                  # diff 中显示 rename 检测
git log --follow app.js      # 跨越改名继续追踪历史（-M 阈值可用 -M90% 调整）
```

推论：大改内容的同时重命名，可能识别不出 rename，历史会「断链」。分两个提交（先改名、再改内容）能保住 `--follow` 的可读性。

## 4. git clean：清扫未跟踪文件

`clean` 是唯一会删除**未跟踪**文件的常规命令，也是本篇最危险的命令——这些文件没有任何 Git 副本，删了就是真没了：

```bash
git clean -n                 # 干运行：只列出将删除的内容（必做第一步）
git clean -fd                # 删除未跟踪文件与目录
git clean -fX                # 只删除被 .gitignore 忽略的文件（如构建产物）
git clean -fx                # 未跟踪 + 被忽略的全删（核弹档）
git clean -i                 # 交互式逐项确认
```

| 选项 | 含义                                          |
| :--- | :-------------------------------------------- |
| `-n` | dry run，只看不删                             |
| `-f` | 强制执行（`clean.requireForce` 默认开启，无 `-f` 直接拒绝运行） |
| `-d` | 连未跟踪的**目录**一起处理                    |
| `-X` | 仅删除被忽略的文件                            |
| `-x` | 未跟踪与被忽略都删（忽略规则失效）            |

典型「恢复出厂」组合：

```bash
git clean -fdx -n            # 先预览
git clean -fdx               # 清掉构建产物、日志、依赖目录
git reset --hard             # 已跟踪文件回到 HEAD
```

## 5. 完整会话：整理一个失控的工作区

```bash
git status -s
#  M app.js          ← 未暂存修改（想丢弃）
# M  config.js       ← 误暂存（想退回）
# ?? tmp/            ← 临时目录（想删除）

git restore --staged config.js   # 退回误暂存
git restore app.js               # 丢弃未暂存修改
git clean -nd                    # 预览将删除的未跟踪内容
git clean -fd                    # 执行清理
git status                       # working tree clean
```

## 6. 陷阱与调试

- **restore 丢弃的未暂存修改找不回来**：这些内容从未进入对象库，Git 层面无副本；靠 IDE Local History 或先 `git stash` 兜底。
- **`git rm --cached` 后文件出现在别人的未跟踪列表**：这是停用跟踪的正常结果；确认 `.gitignore` 已补上对应规则，否则同事一提交又回来了。
- **`git clean -fX` 把本地配置文件删了**：`-X`/`-x` 会无视 ignore 保护直接删除被忽略文件（含 `.env` 这类），执行前必跑 `-n` 预览。
- **重命名没被识别**：改名同时大改内容超出相似度阈值；用 `git log --follow -M90%` 放宽检测，或今后拆成两个提交。
- **`git restore .` 误伤**：路径写 `.` 会丢弃整个目录树的未暂存修改，务必先用 `git status` 与 `git diff` 复核。

## 丢弃/清理决策表

「想把某些改动弄没」时按这张表选命令，可避免九成误操作：

| 想丢弃的东西                     | 命令                          | 可恢复性             |
| :------------------------------- | :---------------------------- | :------------------- |
| 工作区未暂存改动                 | `git restore <file>`          | 不可恢复（先想清楚）|
| 暂存区的错误暂存                 | `git restore --staged <file>` | 完全可恢复           |
| 未跟踪的新文件                   | `git clean -fd`（先 `-n`）    | 不可恢复             |
| 被忽略的构建产物                 | `git clean -fX`               | 可重新生成           |
| 未推送的提交                     | `git reset --hard HEAD~n`     | reflog 可救          |
| 已推送的提交                     | `git revert <commit>`         | 历史完整保留         |

通用保命符：任何「丢弃」前跑一次 `git stash -u`，改动进栈后工作区即干净，事后 `git stash drop` 即等效丢弃——代价只是一条栈记录。

## 小结

**初学者要点**

- restore = 「从来源复制到目的地」：默认暂存区 → 工作区；`--staged` 改目的地，`-s` 改来源。
- 删除跟踪用 `git rm`（`--cached` 保留本地文件），重命名用 `git mv`。
- `clean` 前必跑 `-n` 预览；`-f` 是强制令，`-x` 连忽略文件一起删。

**进阶注意**

- restore 不动分支指针、不碰未跟踪文件；「清空本地一切」是 clean + reset --hard 的组合拳。
- 重命名是推断而非记录，`--follow` 依赖相似度，改名与改内容分两次提交最稳。
- 危险度排序：`clean -fx` > `clean -fX` > `reset --hard` > `rm` > restore 系列；每一步都先想「丢了还能不能回来」。
