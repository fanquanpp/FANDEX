---
order: 60
title: 合并冲突解决
module: git
category: 'Git Basics'
difficulty: intermediate
description: Git合并冲突的产生机制、解决策略与预防方法。
author: fanquanpp
updated: '2026-06-14'
related:
  - git/HEAD指针与分支本质
  - git/Git钩子与GitLFS
  - git/合并工具
  - git/变基操作
prerequisites:
  - git/语法速查
---

## 1. 冲突概述

### 1.1 什么是合并冲突

当两个分支修改了**同一文件的同一位置**时，Git 无法自动决定采用哪个版本，就会产生合并冲突。

### 1.2 冲突标记

```text
<<<<<<< HEAD
当前分支的内容
=======
合并分支的内容
>>>>>>> feature
```

| 标记              | 含义             |
| :---------------- | :--------------- |
| `<<<<<<< HEAD`    | 当前分支内容开始 |
| `=======`         | 分隔线           |
| `>>>>>>> feature` | 合并分支内容结束 |

### 1.3 不会冲突的情况

- 修改不同文件 → 自动合并
- 修改同一文件的不同位置 → 自动合并
- 一方修改、一方删除 → 自动合并（采用修改版）

## 2. 冲突解决流程

### 2.1 标准流程

```bash
# 1. 尝试合并
git merge feature
# CONFLICT (content): Merge conflict in src/index.js

# 2. 查看冲突文件
git status
# Unmerged paths:
#   both modified:   src/index.js

# 3. 打开冲突文件，手动解决
vim src/index.js

# 4. 标记为已解决
git add src/index.js

# 5. 完成合并
git commit
```

### 2.2 查看冲突详情

```bash
# 列出冲突文件
git diff --name-only --diff-filter=U

# 查看冲突内容
git diff

# 查看三方视图
git mergetool
```

## 3. 解决策略

### 3.1 手动解决

编辑冲突文件，删除冲突标记，保留正确内容：

```text
<!-- 冲突内容 -->
<<<<<<< HEAD
const API_URL = "https://api.example.com/v2";
=======
const API_URL = "https://api.staging.com/v2";
>>>>>>> feature

<!-- 解决后 -->
const API_URL = "https://api.example.com/v2";
```

### 3.2 选择一方

```bash
# 采用当前分支版本
git checkout --ours file.txt

# 采用合并分支版本
git checkout --theirs file.txt

# 对特定文件选择
git checkout --ours src/config.js
git checkout --theirs src/styles.css
```

### 3.3 合并双方

```bash
# 使用 union 策略（合并双方修改）
git merge -X union feature

# 使用 ours 策略（冲突时总是采用当前分支）
git merge -X ours feature

# 使用 theirs 策略（冲突时总是采用合并分支）
git merge -X theirs feature
```

### 3.4 放弃合并

```bash
# 放弃当前合并，回到合并前状态
git merge --abort

# 如果已经部分解决
git reset --hard HEAD
```

## 4. 复杂冲突场景

### 4.1 多文件冲突

```bash
# 批量选择 ours/theirs
git checkout --ours .
git checkout --theirs .

# 逐文件处理
for file in $(git diff --name-only --diff-filter=U); do
    echo "Conflict in: $file"
    # 手动处理每个文件
done
```

### 4.2 重命名冲突

```bash
# 一方重命名、一方修改内容
# CONFLICT (modify/delete): ...

# 查看重命名情况
git diff --name-status --diff-filter=R
```

### 4.3 子模块冲突

```bash
# 子模块指向不同提交
git ls-tree HEAD path/to/submodule
# 选择正确的提交
cd path/to/submodule
git checkout correct-commit
cd ..
git add path/to/submodule
```

## 5. 预防冲突

### 5.1 工作流策略

| 策略               | 说明                  |
| :----------------- | :-------------------- |
| **频繁同步**       | 经常从主分支拉取更新  |
| **小步提交**       | 每次提交只做一件事    |
| **短生命周期分支** | 功能分支尽快合并      |
| **模块化代码**     | 减少多人修改同一文件  |
| **代码所有者**     | CODEOWNERS 指定负责人 |

### 5.2 减少冲突的编码习惯

- 避免大范围格式化修改
- 将公共配置与业务逻辑分离
- 使用接口/抽象减少直接依赖
- 新增代码而非修改共享代码

### 5.3 预合并检查

```bash
# 合并前检查是否有冲突
git merge --no-commit --no-ff feature
git diff --check     # 检查冲突标记
git merge --abort    # 放弃测试合并
```
