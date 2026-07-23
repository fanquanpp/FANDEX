---
order: 61
title: 'git-mergetool'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'git mergetool配置与使用：可视化冲突解决工具的集成与自定义。'
author: fanquanpp
updated: '2026-06-14'
related:
  - git/Git钩子与GitLFS
  - git/合并冲突解决
  - git/变基操作
  - git/摘取提交
prerequisites:
  - git/语法速查
---

## 1. mergetool 概述

### 1.1 什么是 mergetool

`git mergetool` 启动一个**可视化合并工具**来帮助解决冲突，比手动编辑冲突标记更直观。

### 1.2 工作原理

```
冲突文件 → mergetool → 本地版本 / 基础版本 / 远程版本 → 合并结果
```

mergetool 展示三方视图：

- **LOCAL**：当前分支版本
- **BASE**：共同祖先版本
- **REMOTE**：合并分支版本
- **MERGED**：合并结果

## 2. 配置 mergetool

### 2.1 选择工具

```bash
# 查看支持的工具
git mergetool --tool-help

# 设置默认工具
git config --global merge.tool vimdiff
git config --global merge.tool vscode
git config --global merge.tool meld

# 临时使用指定工具
git mergetool --tool=meld
```

### 2.2 常用工具配置

**VS Code**：

```bash
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'
```

**Vimdiff**：

```bash
git config --global merge.tool vimdiff
# 内置支持，无需额外配置
```

**Meld**：

```bash
git config --global merge.tool meld
# Linux/macOS: sudo apt install meld / brew install meld
```

**Beyond Compare**：

```bash
git config --global merge.tool bc
git config --global mergetool.bc.cmd 'bcompare $LOCAL $REMOTE $BASE $MERGED'
```

### 2.3 常用选项

```bash
# 不提示就启动工具
git config --global mergetool.prompt false

# 合并后保留备份文件
git config --global mergetool.keepBackup true

# 自动检测工具路径
git config --global mergetool.autoResolve true
```

## 3. 使用 mergetool

### 3.1 基本流程

```bash
# 1. 合并产生冲突
git merge feature

# 2. 启动 mergetool
git mergetool

# 3. 在工具中解决冲突
# 4. 保存并退出
# 5. Git 自动标记为已解决

# 6. 完成合并
git commit
```

### 3.2 指定文件

```bash
# 只解决特定文件的冲突
git mergetool src/index.js

# 解决所有冲突文件
git mergetool
```

## 4. 工具对比

| 工具               | 平台        | 特点                    | 推荐度 |
| :----------------- | :---------- | :---------------------- | :----- |
| **VS Code**        | 跨平台      | 内置合并编辑器，直观    | ⭐⭐⭐ |
| **Vimdiff**        | 跨平台      | 终端内使用，需 Vim 技能 | ⭐⭐   |
| **Meld**           | Linux/macOS | 三方对比，免费开源      | ⭐⭐⭐ |
| **Beyond Compare** | 跨平台      | 功能最强，付费          | ⭐⭐⭐ |
| **KDiff3**         | 跨平台      | 免费，自动合并          | ⭐⭐   |
| **P4Merge**        | 跨平台      | Perforce 免费           | ⭐⭐   |
