---
order: 68
title: 'git-reset'
module: git
category: 'Git Basics'
difficulty: advanced
description: 'git reset三种模式详解：soft、mixed、hard的区别与安全使用。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'git/Git-Flow与GitHub-Flow'
  - git/修改提交
  - git/撤销提交
  - git/Git原理与对象模型
prerequisites:
  - git/语法速查
---

## 1. reset 概述

### 1.1 什么是 reset

`git reset` 将当前分支的 HEAD 移动到指定位置，根据模式决定是否影响暂存区和工作区。

### 1.2 三种模式对比

| 模式               | HEAD | 暂存区 | 工作区 | 安全性 |
| :----------------- | :--- | :----- | :----- | :----- |
| **--soft**         | 移动 | 不变   | 不变   | 最安全 |
| **--mixed** (默认) | 移动 | 重置   | 不变   | 安全   |
| **--hard**         | 移动 | 重置   | 重置   | 危险   |

## 2. --soft 模式

### 2.1 效果

只移动 HEAD 指针，暂存区和工作区保持不变。

```
重置前: A---B---C---D (HEAD, main)
                    ↑ 暂存区和工作区

git reset --soft B

重置后: A---B---C---D (工作区和暂存区仍有 D 的内容)
        ↑ HEAD, main
```

### 2.2 使用场景

```bash
# 合并多个提交为一个
git reset --soft HEAD~3
git commit -m "feat: complete feature"

# 撤销提交但保留暂存
git reset --soft HEAD~1
# 修改后重新提交
```

## 3. --mixed 模式（默认）

### 3.1 效果

移动 HEAD 指针，重置暂存区，工作区保持不变。

```
重置前: A---B---C---D (HEAD, main)
                    ↑ 暂存区
                    ↑ 工作区

git reset --mixed B
# 或 git reset B

重置后: A---B (HEAD, main)
             ↑ 暂存区
        C和D的变更保留在工作区（未暂存状态）
```

### 3.2 使用场景

```bash
# 撤销提交，变更回到未暂存状态
git reset HEAD~1

# 取消暂存
git reset file.txt

# 重置到指定提交
git reset abc1234
```

## 4. --hard 模式

### 4.1 效果

移动 HEAD 指针，重置暂存区和工作区。**所有未提交的变更都会丢失！**

```
重置前: A---B---C---D (HEAD, main)
                    ↑ 暂存区
                    ↑ 工作区

git reset --hard B

重置后: A---B (HEAD, main)
             ↑ 暂存区
             ↑ 工作区
        C和D的变更全部丢失
```

### 4.2 使用场景

```bash
# 完全丢弃所有修改
git reset --hard HEAD

# 回到指定提交
git reset --hard abc1234

# 丢弃所有本地修改，同步远程
git fetch origin
git reset --hard origin/main
```

### 4.3 恢复 hard reset

```bash
# 通过 reflog 恢复
git reflog
# abc1234 HEAD@{0}: reset: moving to B
# def5678 HEAD@{1}: commit: D  ← reset 前的提交

git reset --hard def5678
```

## 5. 路径 reset

### 5.1 重置特定文件

```bash
# 将文件从暂存区移除（不改变工作区）
git reset file.txt

# 将文件恢复到指定提交的版本（放入暂存区）
git reset abc1234 -- file.txt
```

## 6. 安全实践

### 6.1 操作前检查

```bash
# 查看将要丢弃的内容
git stash                     # 先保存当前修改
git reset --hard HEAD~3       # 再执行 reset
git stash pop                 # 需要时恢复
```

### 6.2 使用 restore 替代

```bash
# Git 2.23+ 推荐使用 restore 替代 reset 的部分功能
git restore --staged file.txt  # 替代 git reset file.txt
git restore file.txt           # 替代 git checkout -- file.txt
```
