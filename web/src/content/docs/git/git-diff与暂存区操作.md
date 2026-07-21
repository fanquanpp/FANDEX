---
order: 54
title: 'git-diff与暂存区操作'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'git diff与diff --staged的详细用法：差异比较、输出格式与实用技巧。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'git/SHA-1哈希完整性校验'
  - git/三棵树
  - 'git/git-restore与文件操作'
  - 'git/git-log详解'
prerequisites:
  - git/语法速查
---

## 1. git diff 概述

### 1.1 diff 的三种模式

| 命令                | 比较对象           | 用途                 |
| :------------------ | :----------------- | :------------------- |
| `git diff`          | 工作区 vs 暂存区   | 查看未暂存的修改     |
| `git diff --staged` | 暂存区 vs 最新提交 | 查看已暂存的修改     |
| `git diff <commit>` | 工作区 vs 指定提交 | 查看与指定提交的差异 |

## 2. diff 输出格式

### 2.1 标准输出

```diff
diff --git a/src/index.js b/src/index.js
index abc1234..def5678 100644
--- a/src/index.js
+++ b/src/index.js
@@ -10,7 +10,8 @@ function process(data) {
   const result = transform(data);
   if (result.isValid) {
-    return result.value;
+    const processed = enhance(result.value);
+    return processed;
   }
   return null;
 }
```

### 2.2 输出解读

| 部分                     | 含义                                             |
| :----------------------- | :----------------------------------------------- |
| `diff --git a/... b/...` | 比较的文件路径                                   |
| `index abc1234..def5678` | 对象哈希范围                                     |
| `100644`                 | 文件模式                                         |
| `--- a/src/index.js`     | 原文件                                           |
| `+++ b/src/index.js`     | 新文件                                           |
| `@@ -10,7 +10,8 @@`      | 变更位置（旧文件第10行起7行，新文件第10行起8行） |
| `-` 前缀                 | 删除的行                                         |
| `+` 前缀                 | 新增的行                                         |
| 空格前缀                 | 上下文行                                         |

### 2.3 统计输出

```bash
git diff --stat
#  src/index.js    | 3 ++-
#  src/utils.js    | 5 +++--
#  2 files changed, 4 insertions(+), 4 deletions(-)

git diff --numstat
# 2       1       src/index.js
# 3       2       src/utils.js
# ↑新增行  ↑删除行
```

## 3. 常用 diff 选项

### 3.1 过滤选项

```bash
# 只看文件名
git diff --name-only

# 只看文件名和状态
git diff --name-status
# M  src/index.js      ← Modified
# A  src/new.js        ← Added
# D  src/old.js        ← Deleted

# 按路径过滤
git diff -- src/
git diff -- '*.js'
git diff -- ':(exclude)*.test.js'
```

### 3.2 显示选项

```bash
# 增加上下文行数
git diff -U5              # 5行上下文（默认3行）

# 忽略空白
git diff -w               # 忽略所有空白变化
git diff --ignore-space-at-eol  # 只忽略行尾空白

# 彩色输出
git diff --color-words    # 词语级别的差异高亮
git diff --word-diff      # 词语级别的差异标记

# 函数上下文
git diff -W               # 显示完整函数
```

### 3.3 比较选项

```bash
# 比较两个分支
git diff main..feature

# 比较两个提交
git diff abc1234..def5678

# 比较分支分叉点以来的变化
git diff main...feature   # feature 相对于 main 的变更

# 只看暂存区与 HEAD 的差异
git diff --staged
git diff --cached         # 同上
```

## 4. 高级用法

### 4.1 比较特定文件

```bash
# 比较特定文件在不同提交间的差异
git diff HEAD~3 -- src/index.js

# 比较两个分支的特定文件
git diff main feature -- package.json
```

### 4.2 交互式 diff

```bash
# 逐文件查看 diff
git diff --stat | fzf | xargs -I{} git diff -- {}

# 使用 difftool
git difftool              # 使用配置的 diff 工具
git difftool --tool=vimdiff
```

### 4.3 查看合并冲突的差异

```bash
# 查看冲突标记
git diff --check          # 标记空白错误和冲突标记

# 合并冲突的三方差异
git diff HEAD...MERGE_HEAD
```

## 5. diff 算法

### 5.1 算法选择

```bash
# 默认算法（Myers diff）
git diff

# 耐心算法（更好的人类可读性）
git diff --patience

# 直方图算法
git diff --histogram
```

| 算法          | 特点            | 适用场景 |
| :------------ | :-------------- | :------- |
| **Myers**     | 默认，快速      | 通用     |
| **Patience**  | 关注唯一行匹配  | 代码重构 |
| **Histogram** | Patience 的改进 | 复杂变更 |

### 5.2 重命名检测

```bash
# 检测文件重命名
git diff -M               # 检测重命名（默认50%相似度）
git diff -M50%             # 50%相似度阈值
git diff -M90%             # 90%相似度阈值（更严格）

# 检测文件复制
git diff -C               # 检测复制
git diff -C -M             # 同时检测重命名和复制
```

## 6. 实用别名

```bash
# .gitconfig
[alias]
    d = diff
    ds = diff --staged
    dn = diff --name-only
    dns = diff --staged --name-only
    dw = diff --color-words
    dws = diff --staged --color-words
    dst = diff --stat
    dsts = diff --staged --stat
```
