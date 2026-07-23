---
order: 67
title: 'git-commit-amend'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'git commit --amend详解：修改最近提交的消息、内容与安全注意事项。'
author: fanquanpp
updated: '2026-06-14'
related:
  - git/远程跟踪分支
  - 'git/Git-Flow与GitHub-Flow'
  - git/重置与回退
  - git/撤销提交
prerequisites:
  - git/语法速查
---

## 1. amend 概述

### 1.1 什么是 amend

`git commit --amend` 用于**修改最近一次提交**，可以修改提交消息或追加文件变更。

### 1.2 amend 的本质

amend 并非"修改"提交，而是**创建新提交替换旧提交**：

```
修改前: A---B---C (HEAD)
修改后: A---B---C' (HEAD)  ← C' 是新提交，C 变为不可达
```

## 2. 基本用法

### 2.1 修改提交消息

```bash
git commit --amend -m "新的提交消息"
```

### 2.2 追加文件变更

```bash
# 忘记添加文件
git add forgotten-file.js
git commit --amend --no-edit    # 不修改消息，只追加文件
```

### 2.3 同时修改消息和内容

```bash
git add new-file.js
git commit --amend -m "feat: add auth with new file"
```

### 2.4 修改作者信息

```bash
# 修改作者
git commit --amend --author="New Name <new@email.com>"

# 修改日期
git commit --amend --date="2026-06-14T10:00:00"
```

## 3. 安全注意事项

### 3.1 黄金法则

**不要 amend 已推送到远程的提交！**

```bash
#  危险
git push
git commit --amend
git push --force    # 会覆盖远程历史

#  安全
git commit --amend  # amend 未推送的提交
git push            # 正常推送
```

### 3.2 恢复 amend 前的提交

```bash
# 通过 reflog 找到 amend 前的提交
git reflog
# abc1234 HEAD@{0}: commit (amend): new message
# def5678 HEAD@{1}: commit: old message  ← amend 前

# 恢复
git reset --soft def5678
```

## 4. 实际场景

### 4.1 修复拼写错误

```bash
git commit -m "feat: add authnetication"    # 拼写错误
git commit --amend -m "feat: add authentication"
```

### 4.2 追加遗漏文件

```bash
git commit -m "feat: add auth"
git add test/auth.test.js                   # 忘记的测试文件
git commit --amend --no-edit
```

### 4.3 修改敏感信息

```bash
# 不小心提交了密码
git add config.js
git commit -m "feat: add config"
# 发现 config.js 包含密码
# 修改文件移除密码
git add config.js
git commit --amend --no-edit
# 注意：旧提交仍存在于 reflog 中，需要 git gc 清理
```
