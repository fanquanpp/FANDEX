---
order: 210
title: git-cherry-pick
module: 'git'
category: 工具链
difficulty: intermediate
description: git cherry-pick详解：选择性移植提交、跨分支应用与冲突处理。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'git/023-RemoteTrackingBranch'
prerequisites: []
---

## 1. cherry-pick 概述

### 1.1 什么是 cherry-pick

`git cherry-pick` 将指定的提交**移植**到当前分支，创建新的提交（新哈希）。

```
原始状态:
  A---B---C main
       \
        D---E feature

cherry-pick D 到 main:
  A---B---C---D' main
       \
        D---E feature
```

### 1.2 适用场景

| 场景           | 说明                                 |
| :------------- | :----------------------------------- |
| **热修复**     | 将修复提交从开发分支移植到发布分支   |
| **选择性合并** | 只合并特定功能，不合并整个分支       |
| **补丁回移**   | 将维护分支的修复回移到主分支         |
| **误提交修正** | 将误提交到错误分支的提交移到正确分支 |

## 2. 基本用法

### 2.1 单个提交

```bash
git cherry-pick abc1234
```

### 2.2 多个提交

```bash
# 多个提交
git cherry-pick abc1234 def5678

# 提交范围
git cherry-pick abc1234..def5678    # 不包含 abc1234
git cherry-pick abc1234^..def5678   # 包含 abc1234
```

### 2.3 常用选项

```bash
# 只应用变更但不提交
git cherry-pick -n abc1234

# 保留原始作者信息
git cherry-pick -x abc1234    # 在消息中添加原始提交哈希

# 修改提交消息
git cherry-pick -e abc1234

# 保留提交的父提交信息（用于合并提交）
git cherry-pick -m 1 abc1234
```

## 3. 冲突处理

### 3.1 解决冲突

```bash
git cherry-pick abc1234
# CONFLICT: ...

# 解决冲突
vim conflicted-file.js
git add .
git cherry-pick --continue
```

### 3.2 跳过提交

```bash
git cherry-pick --skip
```

### 3.3 放弃 cherry-pick

```bash
git cherry-pick --abort
```

## 4. 实际场景

### 4.1 热修复

```bash
# 在 develop 分支修复了 Bug
git checkout develop
git commit -m "fix: resolve critical bug"

# 将修复移植到 release 分支
git checkout release/v2.0
git cherry-pick abc1234
```

### 4.2 误提交修正

```bash
# 误提交到 main
git checkout main
git log --oneline -3
# abc1234 feat: should be in feature branch

# 移植到正确分支
git checkout feature
git cherry-pick abc1234

# 从 main 移除
git checkout main
git revert abc1234
```

### 4.3 批量移植

```bash
# 将 feature 分支的最近3个提交移植
git checkout main
git cherry-pick feature~3..feature
```

## 5. 注意事项

- cherry-pick 创建**新提交**（新哈希），不是移动原提交
- 同一变更 cherry-pick 两次会产生重复提交
- 合并提交的 cherry-pick 需要指定父提交编号
- cherry-pick 后可能需要解决上下文冲突
## 基本用法

**基本写法：应用单个提交到当前分支**
`git cherry-pick <提交>`
```bash
# 将指定提交应用到当前分支
git cherry-pick abc1234
```

---

**基本写法：应用多个提交**
`git cherry-pick <提交1> <提交2>`
```bash
# 按顺序应用多个提交
git cherry-pick abc1234 def5678
```

---

**基本写法：应用提交范围**
`git cherry-pick <起点>..<终点>`
```bash
# 应用从起点之后到终点的提交（不含起点）
git cherry-pick v1.0.0..v1.1.0
```

---

**基本写法：应用包含起点的范围**
`git cherry-pick <起点>^..<终点>`
```bash
# 应用从起点到终点的所有提交
git cherry-pick v1.0.0^..v1.1.0
```

---

## 保留信息

**基本写法：保留原提交作者**
`git cherry-pick -x <提交>`
```bash
# 在提交信息中追加原提交哈希
git cherry-pick -x abc1234
```

---

**基本写法：保留原提交哈希引用**
`git cherry-pick --edit <提交>`
```bash
# 应用时打开编辑器修改提交信息
git cherry-pick --edit abc1234
```

---

**基本写法：使用原提交信息**
`git cherry-pick --no-commit <提交>`
```bash
# 应用变更但不立即提交
git cherry-pick --no-commit abc1234
```

---

**基本写法：自定义提交信息**
`git cherry-pick --signoff <提交>`
```bash
# 添加 Signed-off-by 签名
git cherry-pick --signoff abc1234
```

---

## 冲突处理

**基本写法：继续 cherry-pick**
`git cherry-pick --continue`
```bash
# 解决冲突后继续
git cherry-pick --continue
```

---

**基本写法：放弃当前 cherry-pick**
`git cherry-pick --abort`
```bash
# 取消并回到操作前状态
git cherry-pick --abort
```

---

**基本写法：跳过当前提交**
`git cherry-pick --skip`
```bash
# 跳过当前冲突提交继续下一个
git cherry-pick --skip
```

---

**基本写法：保留冲突标记的合并提交**
`git cherry-pick --keep-redundant-commits <提交>`
```bash
# 即使变更已被包含也保留提交
git cherry-pick --keep-redundant-commits abc1234
```

---

## 策略选项

**基本写法：指定合并策略**
`git cherry-pick -X <策略> <提交>`
```bash
# 使用 theirs 策略优先采用被应用提交
git cherry-pick -X theirs abc1234
```

---

**基本写法：使用 ours 策略**
`git cherry-pick -X ours <提交>`
```bash
# 冲突时优先保留当前分支内容
git cherry-pick -X ours abc1234
```

---

## 主分支回退场景

**基本写法：从 hotfix 分支拣选修复到 main**
`git cherry-pick <修复提交>`
```bash
# 切到 main 后应用 hotfix 提交
git cherry-pick hotfix-9a3b1c2
```

---

**基本写法：从 main 拣选到发布分支**
`git cherry-pick <提交>`
```bash
# 将 main 上的修复同步到 release 分支
git cherry-pick release-1.2.3
```

---

## 批量操作

**基本写法：批量拣选多分支提交**
`git cherry-pick <分支A>^..<分支B>`
```bash
# 拣选 A 到 B 范围内的所有提交
git cherry-pick feature^..release
```

---

**基本写法：从 git log 拣选**
`git cherry-pick $(git log --grep="<关键字>" --format=%H)`
```bash
# 拣选所有匹配关键字的提交
git cherry-pick $(git log --grep="fix:" --format=%H)
```

---

## 验证与查询

**基本写法：查看哪些提交尚未应用**
`git cherry -v <上游分支>`
```bash
# 显示尚未合并到上游的提交
git cherry -v main
```

---

**基本写法：显示带 + 或 - 的可拣选提交**
`git cherry <上游> <分支>`
```bash
# 列出指定分支相对上游的可拣选状态
git cherry main feature
```
