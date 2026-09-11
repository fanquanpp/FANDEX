---
order: 130
title: 合并冲突解决
module: 'git'
category: 工具链
difficulty: intermediate
description: Git合并冲突的产生机制、解决策略与预防方法。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/110-HEADPointerBranchEssence'
  - 'git/340-GitHookGitLFS'
prerequisites: []
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

### 1.3 会不会冲突的判定

- 修改不同文件 → 自动合并
- 修改同一文件的不同位置（互不相邻）→ 自动合并
- 同一位置双方都改 → 冲突（内容冲突）
- 一方修改、另一方删除同一文件 → 冲突（modify/delete 冲突，Git 不敢替你决定留哪个）

共同祖先是判定基准：Git 对「你的版本 / 对方版本 / 共同祖先」做三方比较，只有**同一位置相对祖先各改各的**才无法仲裁。

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

### 3.3 策略化批量取舍

```bash
# 冲突处一律采用当前分支（谨慎：会静默丢弃对方改动）
git merge -X ours feature

# 冲突处一律采用对方分支
git merge -X theirs feature
```

注意 `-X ours/-X theirs` 只在**冲突行**上偏向一侧，非冲突改动仍会正常合并；与 `git merge -s ours`（整体忽略对方全部内容）是两回事。

「双方修改都保留」（如变更日志类逐行追加的文件）要用 **union 合并驱动**——通过 `.gitattributes` 声明，而不是 `-X` 选项：

```bash
echo "CHANGELOG.md merge=union" >> .gitattributes   # 声明该文件用 union 驱动
git merge feature
```

union 驱动把双方的行都保留下来，不做语义判断，仅适合「只增不改」的纯追加型文本文件。

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
## 冲突标记格式

**基本写法：冲突标记结构**
`<<<<<<< HEAD ... ======= ... >>>>>>> <分支名>`
```text
# 冲突标记格式
<<<<<<< HEAD
当前分支的内容
=======
合并分支的内容
>>>>>>> feature
```

---

## 冲突解决标准流程

**基本写法：尝试合并**
`git merge <分支名>`
```bash
# 合并 feature 分支到当前分支
git merge feature;
```

**基本写法：查看冲突文件**
`git status`
```bash
# 查看冲突状态
git status;
```

**基本写法：标记冲突已解决**
`git add <file>`
```bash
# 将解决冲突后的文件加入暂存区
git add src/index.js;
```

**基本写法：完成合并提交**
`git commit`
```bash
# 提交合并结果
git commit;
```

---

## 查看冲突详情

**基本写法：列出冲突文件**
`git diff --name-only --diff-filter=U`
```bash
# 列出所有冲突文件
git diff --name-only --diff-filter=U;
```

**基本写法：查看冲突内容**
`git diff`
```bash
# 查看冲突内容
git diff;
```

**基本写法：使用合并工具**
`git mergetool`
```bash
# 启动配置的合并工具
git mergetool;
```

---

## 选择一方版本

**基本写法：采用当前分支版本**
`git checkout --ours <file>`
```bash
# 采用当前分支版本的 src/config.js
git checkout --ours src/config.js;
```

**基本写法：采用合并分支版本**
`git checkout --theirs <file>`
```bash
# 采用合并分支版本的 src/styles.css
git checkout --theirs src/styles.css;
```

---

## 合并策略选项

**基本写法：冲突时采用当前分支**
`git merge -X ours <分支名>`
```bash
# 冲突行偏向当前分支，非冲突改动仍正常合并
git merge -X ours feature
```

**基本写法：冲突时采用合并分支**
`git merge -X theirs <分支名>`
```bash
# 冲突行偏向对方分支
git merge -X theirs feature
```

**基本写法：双方修改都保留（union 合并驱动）**
`echo "<文件> merge=union" >> .gitattributes`
```bash
# 适合纯追加型文件（如变更日志）：双方新增行都保留
echo "CHANGELOG.md merge=union" >> .gitattributes
```

---

## 放弃合并

**基本写法：放弃当前合并**
`git merge --abort`
```bash
# 放弃当前合并操作
git merge --abort;
```

**基本写法：硬重置放弃合并**
`git reset --hard HEAD`
```bash
# 强制回到合并前的 HEAD 状态
git reset --hard HEAD;
```

---

## 多文件冲突处理

**基本写法：批量采用 ours**
`git checkout --ours .`
```bash
# 批量采用当前分支版本
git checkout --ours .;
```

**基本写法：批量采用 theirs**
`git checkout --theirs .`
```bash
# 批量采用合并分支版本
git checkout --theirs .;
```

**基本写法：逐文件处理冲突**
`for file in $(git diff --name-only --diff-filter=U)`
```bash
# 遍历所有冲突文件逐个处理
for file in $(git diff --name-only --diff-filter=U); do
    echo "Conflict in: $file"
done
```

---

## 重命名冲突

**基本写法：查看重命名情况**
`git diff --name-status --diff-filter=R`
```bash
# 查看重命名的文件
git diff --name-status --diff-filter=R;
```

---

## 子模块冲突

**基本写法：查看子模块指向的提交**
`git ls-tree HEAD <子模块路径>`
```bash
# 查看子模块指向的提交
git ls-tree HEAD path/to/submodule;
```

**基本写法：进入子模块目录**
`cd <子模块路径>`
```bash
# 进入子模块目录
cd path/to/submodule;
```

**基本写法：切换到正确的提交**
`git checkout <提交哈希>`
```bash
# 切换到正确的提交
git checkout correct-commit;
```

**基本写法：返回主仓库**
`cd ..`
```bash
# 返回主仓库
cd ..;
```

**基本写法：添加子模块**
`git add <子模块路径>`
```bash
# 添加子模块
git add path/to/submodule;
```

---

## 预合并检查

**基本写法：测试合并（不提交）**
`git merge --no-commit --no-ff <分支名>`
```bash
# 测试合并但不提交
git merge --no-commit --no-ff feature;
```

**基本写法：检查冲突标记**
`git diff --check`
```bash
# 检查空白错误和冲突标记
git diff --check;
```

**基本写法：放弃测试合并**
`git merge --abort`
```bash
# 放弃测试合并
git merge --abort;
```
