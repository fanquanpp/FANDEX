---
order: 400
title: git-format-patch 补丁协作
module: 'git'
category: 工具链
difficulty: intermediate
description: git format-patch 详解：邮件补丁格式、am 应用工作流、版本迭代与离线协作。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/290-GitCherryPick'
  - 'git/170-DistributedVCSPrinciple'
  - 'git/230-CodeReviewBestPractice'
prerequisites:
  - 'git/090-GitCommitAmend'
---

## 前置知识与学习目标

**前置知识**：会创建规范的提交；理解「补丁」指一组文件变更。

学完本文你应当能够：

1. 把提交导出为标准邮件补丁，并在另一仓库用 `git am` 完整还原；
2. 区分 `format-patch + am` 与 `diff + apply` 两条管线的能力差异；
3. 走通「v1 → 评审 → v2」的补丁迭代流程（Linux 内核式工作流的骨架）；
4. 处理补丁应用失败（冲突、三方补丁）。

类比先行：`git diff` 导出的像**没有抬头的复印件**（只有改动内容），而 `format-patch` 导出的是**带完整信封的挂号信**——作者、日期、提交说明、哈希引用俱全，收件人 `git am` 拆信后能得到一个「和原件几乎相同的提交」。

## 1. format-patch 是什么

`git format-patch` 把提交序列渲染为 mbox 格式的邮件补丁——这也是 Linux 内核社区沿用二十余年的协作载体。一封补丁邮件的结构：

```text
From 8c9d0e1a Mon Sep 17 00:00:00 2001     ← 原提交哈希
From: Zhang San <zhang@example.com>        ← 作者（am 后原样保留）
Date: Sat, 14 Jun 2026 10:00:00 +0800
Subject: [PATCH] feat: add authentication  ← 提交标题

---
 src/auth.ts | 20 ++++++++++++++++++++
 1 file changed, 20 insertions(+)

diff --git a/src/auth.ts b/src/auth.ts     ← 统一 diff 正文
...
--
2.49.0                                     ← 版本尾签
```

与 `git diff` 管线的能力对比：

| 能力             | `format-patch` + `am` | `diff` + `apply`     |
| :--------------- | :-------------------- | :------------------- |
| 保留作者与日期   | 是                    | 否                   |
| 保留提交说明     | 是                    | 否                   |
| 自动创建提交     | 是                    | 否（只改文件）       |
| 失败时的处理命令 | `am --continue/skip/abort` | 手动处理        |
| 典型场景         | 邮件评审、离线搬迁提交 | 临时同步几处改动    |

## 2. 生成补丁

```bash
git format-patch -1                       # 最近 1 个提交 → 0001-xxx.patch
git format-patch -3                       # 最近 3 个
git format-patch main..feature            # feature 独有的全部提交
git format-patch v1.0.0..v1.1.0           # 两个发布之间的提交
git format-patch -3 -o out/patches/       # 指定输出目录
git format-patch -3 --stdout > all.patch  # 全部合并为单一文件（方便传输）
```

文件名自动生成自提交说明：`0001-feat-add-authentication.patch`，天然按序排列。

## 3. 应用补丁：git am

```bash
# 先验证能否干净应用（不落盘）
git apply --check 0001-feat-add-authentication.patch

# 正式应用：还原变更并直接创建提交（作者/消息来自补丁信封）
git am 0001-feat-add-authentication.patch
git am out/patches/*.patch        # 按文件名顺序批量应用
git am --3way all.patch           # 失败时启用三方合并重试（见 3.2）
```

应用后用 `git log --format='%h %an %s' -3` 复核：作者是补丁原件的作者，committer 是你——这正是 commit 对象 author/committer 双字段设计的用武之地（见 [对象模型](git/240-ObjectModel)）。

### 3.1 应用失败与冲突

```bash
git am patches/*.patch
# Applying: feat: add auth
# error: patch failed: src/auth.ts:12

# 与 rebase 同构的处理循环：
vim src/auth.ts          # 手工解决冲突
git add src/auth.ts
git am --continue        # 以解决后的内容继续

git am --skip            # 跳过当前补丁继续后续
git am --abort           # 全部放弃，回到 am 之前
```

`--3way` 值得常备：它利用补丁中的 blob 哈希到对象库里找原始内容做三方合并，上下文对不上的补丁也常能自动合并（要求你的仓库里有相关历史对象，通常 fetch 过上游即可满足）。

### 3.2 只想要「改动」不想要「提交」

```bash
git apply 0001-xxx.patch         # 只把变更写入工作区，不建提交
git apply --stat 0001-xxx.patch  # 先看涉及的文件统计
git apply -R 0001-xxx.patch      # 反向应用 = 撤销该补丁
```

## 4. 评审迭代：v1 到 v2

补丁工作流的核心是**版本化重发**，Subject 前缀就是版本号：

```bash
# 收到评审意见后修改代码，重新提交，然后：
git format-patch main..feature -v2 --cover-letter -o v2/
# [PATCH v2 0/3] *** SUBJECT HERE ***   ← cover letter：给评审者的总说明
# [PATCH v2 1/3] feat: add auth
# [PATCH v2 2/3] ...
# [PATCH v2 3/3] ...

# 在 cover letter 或单个补丁下补充 change log（编辑邮件正文）
```

维护者侧用 `git am` 收入后，`git log` 里的作者始终是最初的贡献者——这就是「补丁保留作者」在开源署名上的意义。

## 5. 典型场景

### 5.1 离线协作（无网络/无共享平台）

```bash
# A 机器：导出
git format-patch main..feature -o /usb/

# B 机器（另一网络/隔离环境）：
git fetch origin && git switch -c feature
git am --3way /usb/*.patch
```

隔离网络（产线、涉密环境）迁移代码，`format-patch`/`bundle` 是官方通道（bundle 见 [分布式原理](git/170-DistributedVCSPrinciple)）。

### 5.2 交付「干净」的贡献给上游

不希望暴露 WIP 提交碎片时，先在本地整形（squash/reword），再导出最终补丁——补丁里只有你想让人看到的历史。

## 6. 陷阱与调试

- **`git am` 报 `Patch is empty` / 格式错乱**：邮件客户端把补丁当富文本改写了（换行、引号、HTML）。传输补丁用附件或纯文本通道；验证可用 `git am --show-current-patch` 查看 Git 眼中的原文。
- **上下文对不上而失败**：先 `git am --abort`，改用 `git am --3way`；仍失败说明对象库缺原始 blob，先 fetch 相关仓库。
- **把 format-patch 的产物用 git am 之外的方式应用**（如复制粘贴 diff）：作者与消息全丢，退化为普通改动。
- **忘了 `-v2` 重发**：评审线程里新旧版本混淆，谁也不知道该 review 哪份。
- **误以为补丁文件可逆向出完整仓库**：单个补丁只是增量；整仓离线交换用 `git bundle`。

## 与 cherry-pick 的选择

| 需求                                       | 用哪个        |
| :----------------------------------------- | :------------ |
| 两仓库可互相访问（有共同远程）             | cherry-pick / merge |
| 完全离线、通过文件/邮件传递                | format-patch + am |
| 需要保留作者且经人工评审再入库             | format-patch（邮件评审流） |
| 快速把一个提交搬到另一分支（同仓库内）     | cherry-pick   |

同一仓库内 cherry-pick 更顺手（直接引用提交）；一旦离开共享网络的语境（隔离网、邮件列表、跨组织交付），format-patch 是唯一保真通道。

## 小结

**初学者要点**

- format-patch 导出「带信封的提交」，git am 原样重建（作者、消息、日期全保留）。
- 只要改动不要提交时，退回 `git apply` 管线；`--check` 永远先行。
- 冲突循环与 rebase 同构：改文件 → add → `--continue`；`--3way` 是救场利器。

**进阶注意**

- `-v<N>` + `--cover-letter` 是补丁评审迭代的标准礼仪（内核工作流骨架）。
- author/committer 分离设计正是为这条管线服务的，署名争议时用它对账。
- 空仓库、整仓迁移场景改用 bundle 或 clone；补丁适合「提交粒度」的搬运。
