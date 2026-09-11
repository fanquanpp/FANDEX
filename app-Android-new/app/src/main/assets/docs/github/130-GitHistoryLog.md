---
order: 130
title: GitHub 历史与日志
module: 'github'
category: 工具链
difficulty: beginner
description: 以侦探查案驱动方式讲解 git log 的各类查看姿势与 git diff、git show、git blame、git reflog 的取证技巧，覆盖历史筛选、差异对比与引用日志，适合零基础学习者。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## 开篇：像侦探查案一样翻阅历史

想象你是一名侦探，接手一桩"代码失踪案"：昨晚还能运行的程序，今天早上突然崩溃了。你需要回答三个问题：

1. **什么时候改的？**（哪一次提交让程序变坏的）
2. **谁改的？**（哪个同事的哪次操作）
3. **改成什么样了？**（具体是哪几行代码出了问题）

Git 的提交历史就是你的"案卷库"，而 `git log` 就是你的"查档系统"。Git 官方甚至把仓库描述为"内容寻址文件系统"——每次提交都是一个不可变的快照，你可以像翻档案一样回到任何一天。

本篇采用**侦探驱动**的叙事方式：以"破案"为线索，依次学习**看总览（log）、筛线索（filter）、对现场（diff）、看单份案卷（show）、追查每行来源（blame）、翻查活动记录（reflog）** 六种取证姿势。

---

## 一、第一招：看总览——git log 基础

### 1.1 完整案卷

```bash
# 查看完整提交历史（按时间倒序）
git log
```

输出示例：

```
commit 8f4b2c1e2d3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c
Author: 张三 <zhangsan@example.com>
Date:   Sat Aug 2 09:30:00 2026 +0800

    feat: 添加加法函数
```

每条提交包含：提交 ID（完整 SHA-1 哈希）、作者、日期、提交信息。

### 1.2 精简案卷

```bash
# 每条提交一行（最常用，一眼扫过全部历史）
git log --oneline
# 输出示例：
# 8f4b2c1 (HEAD -> main) feat: 添加加法函数
# a1b2c3d docs: 更新 README

# 只看最近 N 条
git log -5

# 单行 + 数量
git log -5 --oneline
```

### 1.3 画关系图

```bash
# 图形化显示分支合并历史（能看到 merge 的分叉与交汇）
git log --graph

# 最常用的组合：单行 + 图形 + 所有分支
git log --oneline --graph --all

# 只看合并提交
git log --merges

# 排除合并提交
git log --no-merges
```

`git log --oneline --graph --all` 输出示例：

```
* 8f4b2c1 (HEAD -> main) feat: 添加加法函数
* a1b2c3d docs: 更新 README
|\
| * e4f5g6h (feature) feat: 登录功能
|/
* 7a3f9c1 chore: 项目初始化
```

---

## 二、第二招：筛线索——git log 过滤参数

### 2.1 按作者筛选

```bash
# 查看指定作者的提交
git log --author="zhangsan"

# 模糊匹配（支持正则）
git log --author="zhang"
```

### 2.2 按提交信息搜索

```bash
# 搜索提交信息中包含"登录"的提交
git log --grep="登录"

# 不区分大小写
git log --grep="login" -i
```

### 2.3 按日期筛选

```bash
# 指定日期范围
git log --since="2026-01-01" --until="2026-07-31"

# 相对时间（最近 2 周）
git log --since="2 weeks ago"

# 等价写法：--after / --before
git log --after="2026-06-01" --before="2026-06-30"
```

### 2.4 按文件筛选

```bash
# 查看指定文件的提交历史（注意 -- 分隔）
git log -- src/index.js

# 查看指定目录的历史
git log -- src/

# 跟踪文件重命名前的历史
git log --follow src/index.js
```

### 2.5 按代码内容筛选（Pickaxe 挖掘）

```bash
# 找出"添加或删除过某段代码"的提交（-S 是次数变化）
git log -S "console.log"

# 按正则匹配行变化（-G 是行匹配）
git log -G "function\s+login"
```

### 2.6 提交范围筛选（双点语法）

```bash
# 在 feature 但不在 main 的提交（feature 独有提交）
git log main..feature

# 本地比远程多的提交（push 前检查）
git log origin/main..HEAD
```

---

## 三、第三招：对现场——git diff 差异对比

diff 是"案发现场对比"：同一个文件在提交前后差了什么。

```bash
# 工作区与暂存区的差异（还没 add 的改动）
git diff

# 暂存区与上次提交的差异（已 add 未 commit 的改动）
git diff --staged

# 工作区与上次提交的所有差异（add 没 add 都算）
git diff HEAD

# 指定文件
git diff src/index.js

# 两个提交之间
git diff abc1234 def5678

# 两个分支之间
git diff main..feature

# 三点比较：feature 相对两分支共同祖先的差异（更聚焦）
git diff main...feature

# 只看文件名
git diff --name-only

# 看改动统计
git diff --stat
```

`git diff --stat` 输出示例：

```
 src/index.js | 10 +++++-----
 README.md    |  2 +-
 2 files changed, 8 insertions(+), 4 deletions(-)
```

---

## 四、第四招：看单份案卷——git show

```bash
# 查看指定提交的详情和改动
git show abc1234

# 只看提交改动的文件列表
git show --stat abc1234

# 查看指定提交中某文件的内容（取证"这个版本里这个文件长什么样"）
git show abc1234:src/index.js

# 查看最近一次提交
git show HEAD

# 查看倒数第二次提交
git show HEAD~1
```

`git show HEAD` 输出结构：提交元信息 + 改动 diff。

---

## 五、第五招：追查每行来源——git blame

"这行代码到底是谁写的？"——`git blame` 就是干这个的，它能告诉你**文件每一行最后一次被谁、在哪个提交、什么时候修改**：

```bash
# 显示文件每行的最后修改者
git blame src/index.js

# 只看 10 到 20 行（定位嫌疑区间）
git blame -L 10,20 src/index.js

# 忽略纯空格改动（避免把格式化也算作"修改者"）
git blame -w src/index.js
```

`git blame` 输出示例：

```
8f4b2c1 (张三 2026-08-02 09:30:00 +0800  1) function add(a, b) {
a1b2c3d (李四 2026-07-25 14:20:00 +0800  2)   return a + b;
```

---

## 六、第六招：翻活动记录——git reflog（时光机）

`git log` 只记录**提交历史**，而 `git reflog` 记录**你所有的操作足迹**——包括 reset、checkout、rebase、merge 这些"移动指针"的动作。它是找回"丢失提交"的最后防线：

```bash
# 查看 HEAD 的所有操作历史
git reflog
```

输出示例：

```
8f4b2c1 (HEAD -> main) HEAD@{0}: commit: feat: 添加加法函数
7a3f9c1 HEAD@{1}: reset: moving to HEAD~1
a1b2c3d HEAD@{2}: commit: docs: 更新 README
9fceb02 HEAD@{3}: checkout: moving from feature to main
```

```bash
# 查看指定分支的引用日志
git reflog feature

# 查看所有引用日志
git reflog --all

# 用 reflog 找回误删的提交（reset 之后救命的操作）
git reset --hard HEAD@{2}

# 查看 reflog 中第 N 个状态的提交内容
git show HEAD@{3}
```

> 原理与警告：reflog 是 Git 的"本地保险丝"——只要操作发生在本地，它就留有足迹。但 reflog **不会推送到远程**，且仓库 GC（垃圾回收）后会过期清理（默认 90 天）。所以"误删提交后的急救"要趁早。

### 6.1 自定义输出格式（让案卷按你的口味排版）

`git log` 支持用 `--pretty=format:` 自定义每条提交的排版，适合写进别名长期使用：

```bash
# 自定义格式：哈希 + 分支标记 + 作者 + 相对时间 + 提交信息
git log --pretty=format:'%h %d %an %ar %s'

# 美化版（带颜色）：
git log --pretty=format:'%Cred%h%Creset - %C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --graph

# 配置成别名（一劳永逸）
git config --global alias.lg "log --oneline --graph --all --decorate"
git lg
```

常用格式占位符速查：`%h` 短哈希、`%an` 作者名、`%ae` 作者邮箱、`%ar` 相对时间、`%s` 提交信息、`%d` 引用名（分支/标签）、`%Cred/%Cgreen` 颜色控制。

### 6.2 提交范围语法补充（双点与三点）

```bash
# 双点 A..B：在 B 但不在 A 的提交（B 独有）
git log main..feature

# 三点 A...B：A 和 B 各自独有的提交（对称差）
git log main...feature

# 结合 --left-right 显示每行属于哪一边
git log --left-right --oneline main...feature
```

`--left-right` 输出中 `<` 表示属于左边分支（main），`>` 表示属于右边分支（feature），方便一眼看清两边的分叉内容。

---

## 七、常见错误与对策表

| 错误现象 | 报错信息（节选） | 原因分析 | 解决办法 |
| --- | --- | --- | --- |
| 查文件历史没结果 | `git log <文件>` 输出为空 | 路径写错，或未用 `--` 分隔（与分支名歧义） | 用 `git log -- <路径>` 明确是路径 |
| log 输出太长 | 刷屏看不到重点 | 默认输出全部历史 | 用 `--oneline`、`-10` 等参数限制 |
| diff 无输出 | `git diff` 什么都没显示 | 改动已全部暂存（diff 默认只看工作区） | 改用 `git diff --staged` 或 `git diff HEAD` |
| blame 显示不了 | `fatal: no such path` | 文件路径不在当前提交中 | 确认文件存在；旧文件用 `git blame <提交ID> -- <路径>` |
| 误 reset 后提交"消失" | `git log` 找不到那个提交 | 指针移走了，但提交对象还在 | 用 `git reflog` 找到原 ID，`git reset --hard <ID>` 找回 |
| reflog 里找不到记录 | 想找的记录不在了 | 超过 90 天或仓库 GC 过 | 无解；养成"危险操作前先备份分支"的习惯 |
| 想查删除文件的历史 | `git log -- <删除文件>` 没反应 | 默认不追踪删除 | 用 `git log --all --diff-filter=D -- <路径>` 或先定位删除提交 |

---

## 九、一句话记忆

**查历史像破案：`git log` 看总览（--oneline 精简、--graph 画图），`--author/--since/-S` 筛线索，`git diff` 对现场，`git show` 看单份案卷，`git blame` 追每行来源，`git reflog` 是最后保险丝——误删别慌，reflog 里找回来。**
