---
order: 58
title: 'git-blame'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'git blame详解：逐行追溯代码作者、时间与提交，辅助代码审查与问题定位。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'git/git-log详解'
  - git/引用日志
  - git/HEAD指针与分支本质
  - git/Git钩子与GitLFS
prerequisites:
  - git/语法速查
---

## 1. git blame 概述

### 1.1 什么是 git blame

`git blame` 逐行显示文件的**最后修改信息**，包括提交哈希、作者、时间和行内容。

```bash
git blame README.md
# abc1234d (Zhang San 2026-06-10 10:00:01 +0800  1) # My Project
# def5678e (Li Si     2026-06-12 14:30:22 +0800  2)
# abc1234d (Zhang San 2026-06-10 10:00:01 +0800  3) ## Getting Started
```

### 1.2 输出格式

```
哈希前缀 (作者 日期 时间 时区 行号) 行内容
```

## 2. 基本用法

### 2.1 常用选项

```bash
# 显示完整哈希
git blame -l file.txt

# 只显示邮箱
git blame -e file.txt

# 显示行号
git blame -n file.txt

# 从指定行开始
git blame -L 10,20 file.txt       # 第10到20行
git blame -L 10,+5 file.txt       # 第10行起5行
git blame -L :function file.txt   # 函数范围（需语言支持）

# 忽略空白变更
git blame -w file.txt

# 忽略移动/复制
git blame -M file.txt             # 检测行移动
git blame -C file.txt             # 检测行复制
git blame -C -C file.txt          # 更严格的复制检测
```

### 2.2 指定版本

```bash
# 查看指定提交时的 blame
git blame abc1234 -- file.txt

# 查看指定分支的 blame
git blame main -- file.txt
```

## 3. 高级用法

### 3.1 追踪重命名

```bash
# 跟踪文件重命名
git blame -M --follow file.txt
```

### 3.2 忽略特定提交

```bash
# 忽略格式化提交
git blame --ignore-rev abc1234 file.txt

# 从文件读取忽略列表
git blame --ignore-revs-file .git-blame-ignore-revs file.txt
```

### 3.3 增量 blame

```bash
# 只看最近 N 次提交的 blame
git blame --since="2 weeks ago" file.txt
```

## 4. 实际应用

### 4.1 定位 Bug 引入者

```bash
# 找到问题行的提交
git blame -L 42,42 src/auth.ts
# abc1234 (Zhang San 2026-05-20)  const token = getPassword();

# 查看该提交的详情
git show abc1234
```

### 4.2 代码审查辅助

```bash
# 找出最近修改的行
git blame --since="1 month ago" src/index.ts

# 找出某作者的修改
git blame -e src/index.ts | grep "zhang@example.com"
```

### 4.3 统计贡献

```bash
# 按作者统计行数
git blame file.txt | awk '{print $2}' | sort | uniq -c | sort -rn
```

## 5. blame 替代工具

| 工具                  | 特点                |
| :-------------------- | :------------------ |
| **git annotate**      | `git blame` 的别名  |
| **VS Code GitLens**   | 行级 blame 内联显示 |
| **GitHub blame view** | 在线 blame 界面     |
