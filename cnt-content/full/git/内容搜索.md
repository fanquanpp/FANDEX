---
order: 75
title: 'git-grep'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'git grep详解：在Git仓库中高效搜索代码，比grep更快的搜索方式。'
author: fanquanpp
updated: '2026-06-14'
related:
  - git/稀疏检出
  - git/补丁与邮件工作流
  - git/工作树管理
  - git/垃圾回收
prerequisites:
  - git/语法速查
---

## 1. git grep 概述

### 1.1 什么是 git grep

`git grep` 在 Git 仓库的**跟踪文件**中搜索，不需要索引文件，比普通 grep 更快。

### 1.2 优势

| 特性         | git grep            | 普通 grep  |
| :----------- | :------------------ | :--------- |
| **搜索范围** | 只搜跟踪文件        | 所有文件   |
| **速度**     | 快                  | 较慢       |
| **忽略文件** | 自动忽略 .gitignore | 需手动排除 |
| **指定版本** |                     |            |
| **并行搜索** |                     | 需配置     |

## 2. 基本用法

### 2.1 搜索当前工作区

```bash
# 搜索关键词
git grep "TODO"
git grep "function auth"

# 显示行号
git grep -n "TODO"

# 只显示文件名
git grep -l "TODO"

# 统计匹配数
git grep -c "TODO"

# 忽略大小写
git grep -i "todo"
```

### 2.2 搜索指定版本

```bash
# 在指定提交中搜索
git grep "TODO" HEAD~3
git grep "TODO" v1.0.0
git grep "TODO" main

# 在两个版本间搜索
git grep "TODO" main..feature
```

### 2.3 搜索指定文件

```bash
# 只搜特定文件
git grep "TODO" -- '*.js'
git grep "TODO" -- 'src/'

# 排除文件
git grep "TODO" -- ':!*.test.js'
```

## 3. 高级用法

### 3.1 正则搜索

```bash
# 基本正则
git grep -E "TODO|FIXME|HACK"

# Perl 正则
git grep -P "function\s+\w+\(" -- '*.js'

# 匹配整个单词
git grep -w "auth"
```

### 3.2 上下文显示

```bash
# 显示匹配行前后各2行
git grep -C 2 "TODO"

# 只显示后续行
git grep -A 5 "function auth"

# 只显示前面行
git grep -B 2 "return"
```

### 3.3 搜索多个模式

```bash
# 匹配任一模式
git grep -e "TODO" -e "FIXME"

# 必须同时匹配
git grep -e "import" --and -e "from"
```

## 4. 实际场景

### 4.1 查找所有 TODO

```bash
git grep -n "TODO\|FIXME\|HACK" -- '*.ts' '*.js'
```

### 4.2 查找废弃 API 使用

```bash
git grep -n "oldMethod\|deprecatedAPI" -- 'src/'
```

### 4.3 查找安全敏感代码

```bash
git grep -n "eval(\|innerHTML\|dangerouslySetInnerHTML" -- '*.js' '*.jsx' '*.ts' '*.tsx'
```

### 4.4 比较版本间的变更

```bash
# 查找新增的 TODO
git diff HEAD~5..HEAD | git grep "^+.*TODO"
```
