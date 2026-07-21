---
order: 55
title: 'git-restore与文件操作'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'git restore、rm、mv、clean等文件操作命令的详细用法与安全实践。'
author: fanquanpp
updated: '2026-06-14'
related:
  - git/三棵树
  - 'git/git-diff与暂存区操作'
  - 'git/git-log详解'
  - git/引用日志
prerequisites:
  - git/语法速查
---

## 1. git restore

### 1.1 概述

`git restore` 是 Git 2.23 引入的命令，用于**恢复工作区或暂存区的文件**，替代了 `git checkout` 的部分功能。

### 1.2 基本用法

```bash
# 恢复工作区文件（从暂存区）
git restore file.txt

# 恢复工作区文件（从指定提交）
git restore --source=HEAD~3 file.txt
git restore -s main file.txt

# 取消暂存（从仓库恢复到暂存区）
git restore --staged file.txt

# 同时恢复工作区和暂存区
git restore --staged --worktree file.txt
git restore -SW file.txt
```

### 1.3 restore vs checkout

| 操作           | `git restore`                | `git checkout`                |
| :------------- | :--------------------------- | :---------------------------- |
| 恢复工作区文件 | `git restore file`           | `git checkout -- file`        |
| 取消暂存       | `git restore --staged file`  | `git reset HEAD file`         |
| 切换分支       |                              | `git checkout branch`         |
| 恢复到指定提交 | `git restore -s commit file` | `git checkout commit -- file` |

## 2. git rm

### 2.1 基本用法

```bash
# 删除文件（工作区 + 暂存区）
git rm file.txt

# 只从暂存区删除（保留工作区文件）
git rm --cached file.txt

# 递归删除目录
git rm -r directory/

# 强制删除（忽略修改检查）
git rm -f file.txt

# 使用 glob 模式
git rm '*.log'
git rm 'src/**/*.test.js'
```

### 2.2 常见场景

```bash
# 从版本控制中移除但保留本地文件
git rm --cached .env          # 移除敏感文件
git rm --cached -r node_modules/  # 移除不应跟踪的目录

# 删除已删除的文件（已手动删除文件后）
git rm $(git ls-files --deleted)
```

## 3. git mv

### 3.1 基本用法

```bash
# 重命名文件
git mv old-name.txt new-name.txt

# 移动文件
git mv src/file.txt docs/file.txt

# 移动并重命名
git mv src/old.js lib/new.js
```

### 3.2 git mv 的本质

`git mv` 等价于以下三步操作：

```bash
mv old-name.txt new-name.txt    # 1. 文件系统重命名
git rm old-name.txt             # 2. Git 删除旧文件
git add new-name.txt            # 3. Git 添加新文件
```

Git 会自动检测重命名（通过内容相似度），不需要特殊操作。

### 3.3 重命名检测

```bash
# 查看重命名历史
git log --follow file.txt

# diff 时显示重命名
git diff -M                    # 检测重命名
git log --stat -M              # 日志中显示重命名
```

## 4. git clean

### 4.1 基本用法

```bash
# 查看将被删除的文件（干运行）
git clean -n

# 删除未跟踪的文件
git clean -f

# 删除未跟踪的文件和目录
git clean -fd

# 删除被忽略的文件
git clean -fX

# 删除未跟踪和被忽略的文件
git clean -fx

# 交互式删除
git clean -i
```

### 4.2 选项说明

| 选项 | 说明                         |
| :--- | :--------------------------- |
| `-n` | 干运行，只显示将被删除的文件 |
| `-f` | 强制删除                     |
| `-d` | 包含目录                     |
| `-X` | 只删除被忽略的文件           |
| `-x` | 删除未跟踪和被忽略的文件     |
| `-i` | 交互式确认                   |

### 4.3 常见场景

```bash
# 清理构建产物
git clean -fdx dist/

# 恢复到干净状态
git clean -fd && git reset --hard

# 只清理被忽略的文件
git clean -fX
```

## 5. 安全实践

### 5.1 防止数据丢失

```bash
# 在 clean 之前先查看
git clean -nfd                # 查看将被删除的内容

# 在 reset 之前先暂存
git stash                     # 保存当前修改
git reset --hard HEAD~3       # 重置
git stash pop                 # 恢复修改

# 使用 reflog 恢复误删的提交
git reflog                    # 查看操作历史
git reset --hard HEAD@{5}     # 恢复到指定操作
```

### 5.2 危险操作清单

| 命令                        | 风险等级 | 数据可恢复性                 |
| :-------------------------- | :------- | :--------------------------- |
| `git restore file`          | 低       | 暂存区或仓库有副本           |
| `git restore --staged file` | 低       | 仓库有副本                   |
| `git rm file`               | 中       | 提交历史中有                 |
| `git rm --cached file`      | 低       | 工作区保留                   |
| `git clean -f`              | **高**   | 未跟踪文件永久删除           |
| `git reset --hard`          | **高**   | reflog 可能恢复              |
| `git clean -fdx`            | **极高** | 所有未跟踪和忽略文件永久删除 |

### 5.3 保护措施

```bash
# 设置 clean 需要二次确认
git config --global clean.requireForce true

# 使用 .gitignore 防止重要文件被误删
echo "important-data/" >> .gitignore
```
