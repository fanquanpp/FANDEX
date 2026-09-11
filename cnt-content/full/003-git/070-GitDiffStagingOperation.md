---
order: 70
title: git-diff 与暂存区操作
module: 'git'
category: 工具链
difficulty: intermediate
description: git diff与diff --staged的详细用法：差异比较、输出格式与实用技巧。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/250-SHA1IntegrityCheck'
  - 'git/060-ThreeTrees'
  - 'git/080-GitRestoreFileOperation'
  - 'git/180-GitLogDetailed'
prerequisites: []
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
## diff 三种模式

**基本写法：工作区与暂存区差异**
`git diff`
```bash
# 查看工作区与暂存区的差异
git diff;
```

**基本写法：暂存区与最新提交差异**
`git diff --staged`
```bash
# 查看暂存区与 HEAD 的差异
git diff --staged;
```

**基本写法：工作区与指定提交差异**
`git diff <commit>`
```bash
# 查看工作区与 abc1234 提交的差异
git diff abc1234;
```

---

## 统计输出

**基本写法：统计差异**
`git diff --stat`
```bash
# 显示每个文件的增删行数统计
git diff --stat;
```

**基本写法：数字统计**
`git diff --numstat`
```bash
# 输出格式：新增行数 删除行数 文件名
git diff --numstat;
```

---

## 过滤选项

**基本写法：只看文件名**
`git diff --name-only`
```bash
# 列出所有变更的文件名
git diff --name-only;
```

**基本写法：只看文件名和状态**
`git diff --name-status`
```bash
# M 修改 / A 新增 / D 删除
git diff --name-status;
```

**基本写法：按目录路径过滤**
`git diff -- <路径>`
```bash
# 查看 src/ 目录的差异
git diff -- src/;
```

**基本写法：按文件类型过滤**
`git diff -- <模式>`
```bash
# 查看 JavaScript 文件的差异
git diff -- '*.js';
```

**基本写法：排除路径**
`git diff -- ':(exclude)<模式>'`
```bash
# 排除测试文件
git diff -- ':(exclude)*.test.js';
```

---

## 显示选项

**基本写法：增加上下文行数**
`git diff -U<行数>`
```bash
# 显示 5 行上下文（默认 3 行）
git diff -U5;
```

**基本写法：忽略空白**
`git diff -w`
```bash
# 忽略所有空白变化
git diff -w;
```

**基本写法：忽略行尾空白**
`git diff --ignore-space-at-eol`
```bash
# 只忽略行尾空白
git diff --ignore-space-at-eol;
```

**基本写法：词语级别差异**
`git diff --color-words`
```bash
# 词语级别的差异高亮
git diff --color-words;
```

**基本写法：词语差异标记**
`git diff --word-diff`
```bash
# 词语级别的差异标记
git diff --word-diff;
```

**基本写法：函数上下文**
`git diff -W`
```bash
# 显示完整函数的差异
git diff -W;
```

---

## 比较选项

**基本写法：比较两个分支**
`git diff <分支1>..<分支2>`
```bash
# 比较 main 与 feature 分支
git diff main..feature;
```

**基本写法：比较两个提交**
`git diff <提交1>..<提交2>`
```bash
# 比较 abc1234 与 def5678 提交
git diff abc1234..def5678;
```

**基本写法：比较分叉点以来的变化**
`git diff <基础分支>...<目标分支>`
```bash
# feature 相对于 main 的变更
git diff main...feature;
```

**基本写法：暂存区与 HEAD 差异**
`git diff --cached`
```bash
# 查看暂存区与 HEAD 的差异
git diff --cached;
```

---

## 比较特定文件

**基本写法：比较特定文件在不同提交间的差异**
`git diff <提交> -- <文件>`
```bash
# 查看 src/index.js 在最近 3 次提交的差异
git diff HEAD~3 -- src/index.js;
```

**基本写法：比较两个分支的特定文件**
`git diff <分支1> <分支2> -- <文件>`
```bash
# 比较 main 和 feature 分支的 package.json
git diff main feature -- package.json;
```

---

## 交互式 diff

**基本写法：使用 difftool**
`git difftool`
```bash
# 使用默认 diff 工具
git difftool;
```

**基本写法：指定 diff 工具**
`git difftool --tool=<工具名>`
```bash
# 使用 vimdiff 查看差异
git difftool --tool=vimdiff;
```

---

## 查看合并冲突差异

**基本写法：检查冲突标记**
`git diff --check`
```bash
# 检查冲突标记和空白错误
git diff --check;
```

**基本写法：合并冲突的三方差异**
`git diff HEAD...MERGE_HEAD`
```bash
# 查看合并冲突的三方差异
git diff HEAD...MERGE_HEAD;
```

---

## diff 算法

**基本写法：默认算法（Myers）**
`git diff`
```bash
# 使用默认 Myers 算法
git diff;
```

**基本写法：耐心算法**
`git diff --patience`
```bash
# 使用耐心算法，适合代码重构
git diff --patience;
```

**基本写法：直方图算法**
`git diff --histogram`
```bash
# 使用直方图算法，适合复杂变更
git diff --histogram;
```

---

## 重命名检测

**基本写法：检测文件重命名**
`git diff -M`
```bash
# 检测重命名（默认 50% 相似度）
git diff -M;
```

**基本写法：指定相似度阈值**
`git diff -M<百分比>`
```bash
# 90% 相似度阈值（更严格）
git diff -M90%;
```

**基本写法：检测文件复制**
`git diff -C`
```bash
# 检测文件复制
git diff -C;
```

**基本写法：同时检测重命名和复制**
`git diff -C -M`
```bash
# 同时检测重命名和复制
git diff -C -M;
```

---

## 实用别名

**基本写法：配置 diff 别名**
`git config --global alias.<别名> "<命令>"`
```bash
# 配置常用 diff 别名
git config --global alias.d "diff";
```

**基本写法：配置暂存区差异别名**
`git config --global alias.<别名> "<命令>"`
```bash
# 配置暂存区差异别名
git config --global alias.ds "diff --staged";
```

**基本写法：配置文件名差异别名**
`git config --global alias.<别名> "<命令>"`
```bash
# 配置文件名差异别名
git config --global alias.dn "diff --name-only";
```

**基本写法：配置词语差异别名**
`git config --global alias.<别名> "<命令>"`
```bash
# 配置词语差异别名
git config --global alias.dw "diff --color-words";
```

**基本写法：配置统计差异别名**
`git config --global alias.<别名> "<命令>"`
```bash
# 配置统计差异别名
git config --global alias.dst "diff --stat";
```
