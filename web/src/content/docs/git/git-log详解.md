---
order: 56
title: 'git-log详解'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'git log多种格式与过滤选项：自定义输出、搜索过滤与可视化。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'git/git-diff与暂存区操作'
  - 'git/git-restore与文件操作'
  - git/引用日志
  - git/代码追溯
prerequisites:
  - git/语法速查
---

## 1. git log 基础

### 1.1 基本用法

```bash
git log                       # 查看完整日志
git log -5                    # 最近5条
git log --oneline             # 单行格式
git log --oneline -10         # 最近10条，单行格式
```

### 1.2 输出格式

```bash
# 默认格式
git log
# commit 9a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t
# Author: Zhang San <zhang@example.com>
# Date:   Sat Jun 14 10:00:00 2026 +0800
#
#     feat: add user authentication

# 单行格式
git log --oneline
# 9a1b2c3 feat: add user authentication

# 简短格式
git log --abbrev-commit
```

## 2. 自定义输出格式

### 2.1 预定义格式

```bash
# 单行
git log --oneline

# 紧凑
git log --oneline --graph --decorate

# 详细
git log --format=full

# 完整
git log --format=fuller

# 邮箱格式
git log --format=email

# 原始格式
git log --format=raw
```

### 2.2 自定义格式字符串

```bash
# 常用占位符
git log --format="%h - %an, %ar : %s"
# 9a1b2c3 - Zhang San, 2 hours ago : feat: add user auth

# 占位符参考
```

| 占位符 | 说明                 | 示例                |
| :----- | :------------------- | :------------------ |
| `%H`   | 完整哈希             | `9a1b2c3d4e5f...`   |
| `%h`   | 短哈希               | `9a1b2c3`           |
| `%T`   | 完整 tree 哈希       | —                   |
| `%t`   | 短 tree 哈希         | —                   |
| `%an`  | 作者名               | `Zhang San`         |
| `%ae`  | 作者邮箱             | `zhang@example.com` |
| `%ad`  | 作者日期             | —                   |
| `%ar`  | 作者相对日期         | `2 hours ago`       |
| `%cn`  | 提交者名             | —                   |
| `%s`   | 提交消息首行         | `feat: add auth`    |
| `%b`   | 提交消息正文         | —                   |
| `%d`   | 引用装饰             | `(HEAD -> main)`    |
| `%f`   | 消息的文件名安全版本 | —                   |

### 2.3 实用格式

```bash
# 美观的单行格式
git log --format="%C(yellow)%h%C(reset) %C(green)(%ar)%C(reset) %s %C(blue)<%an>%C(reset)"

# 图表格式
git log --oneline --graph --all --decorate

# 变更统计
git log --stat

# 每次提交的差异
git log -p

# 每次提交的差异（仅文件名）
git log --name-only

# 每次提交的差异（文件名+状态）
git log --name-status
```

## 3. 过滤选项

### 3.1 按数量

```bash
git log -5                    # 最近5条
git log -1                   # 最近1条
```

### 3.2 按日期

```bash
git log --since="2026-01-01"         # 2026年1月1日以来
git log --after="2026-01-01"         # 同上
git log --until="2026-06-14"         # 2026年6月14日之前
git log --before="2026-06-14"        # 同上
git log --since="2 weeks ago"        # 最近2周
git log --since="3 days ago"         # 最近3天
git log --after="yesterday"          # 昨天
```

### 3.3 按作者

```bash
git log --author="Zhang San"         # 按作者名
git log --author="zhang@example.com" # 按邮箱
git log --author="zhang"             # 模糊匹配
```

### 3.4 按提交消息

```bash
git log --grep="feat"                # 消息包含 "feat"
git log --grep="fix\|bug"            # 正则匹配
git log --grep="auth" -i             # 忽略大小写
git log --all-match --grep="feat" --grep="auth"  # 同时匹配
```

### 3.5 按文件

```bash
git log -- file.txt                  # 涉及指定文件的提交
git log -- src/                      # 涉及指定目录的提交
git log -p -- file.txt               # 显示文件差异
git log --follow file.txt            # 跟踪重命名
```

### 3.6 按引用范围

```bash
git log main..feature                # feature 有而 main 没有的提交
git log feature..main                # main 有而 feature 没有的提交
git log main...feature               # 两边独有的提交
git log --left-right main...feature  # 标注属于哪边
```

## 4. 图形化显示

### 4.1 内置图形

```bash
# ASCII 图形
git log --oneline --graph

# 带分支标签
git log --oneline --graph --decorate

# 所有分支
git log --oneline --graph --all

# 带日期和作者
git log --graph --format="%h %ad %an %s" --date=short
```

### 4.2 图形化工具

| 工具                  | 类型 | 特点                    |
| :-------------------- | :--- | :---------------------- |
| **gitk**              | 内置 | 基础图形界面            |
| **tig**               | 终端 | 终端中的交互式查看器    |
| **GitKraken**         | 桌面 | 专业 Git 客户端         |
| **SourceTree**        | 桌面 | 免费的 Atlassian 客户端 |
| **VS Code Git Graph** | 插件 | VS Code 内集成          |

## 5. 实用别名

```bash
[alias]
    lg = log --oneline --graph --decorate
    lga = log --oneline --graph --all --decorate
    ll = log --format="%C(yellow)%h%C(reset) %s %C(cyan)(%cr)%C(reset) %C(blue)<%an>%C(reset)"
    ls = log --stat
    lp = log -p
    lf = log --follow
    recent = log --since='2 weeks ago' --oneline
    who = shortlog -sn
```
