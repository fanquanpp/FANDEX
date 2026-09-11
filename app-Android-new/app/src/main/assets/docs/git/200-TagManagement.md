---
order: 200
title: 标签管理
module: 'git'
category: 工具链
difficulty: intermediate
description: Git标签管理：轻量标签与附注标签的创建、操作与发布流程。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/330-GitPrincipleObjectModel'
prerequisites: []
---

## 1. 标签概述

### 1.1 什么是标签

标签（Tag）是指向特定提交的**固定引用**，用于标记重要的版本节点。

### 1.2 两种标签

| 类型         | 创建方式          | 存储             | 包含信息                   |
| :----------- | :---------------- | :--------------- | :------------------------- |
| **轻量标签** | `git tag v1.0`    | 文件存储提交哈希 | 仅提交引用                 |
| **附注标签** | `git tag -a v1.0` | 创建 tag 对象    | 作者、日期、消息、GPG 签名 |

## 2. 创建标签

### 2.1 轻量标签

```bash
# 在当前提交创建
git tag v1.0.0

# 在指定提交创建
git tag v0.9.0 abc1234
```

### 2.2 附注标签

```bash
# 创建附注标签
git tag -a v1.0.0 -m "Release version 1.0.0"

# 在指定提交创建
git tag -a v0.9.0 abc1234 -m "Release version 0.9.0"
```

### 2.3 语义化版本标签

发布标签建议遵循语义化版本（SemVer）`v主.次.修订`：主版本号升级代表不兼容变更、次版本号代表向后兼容的新功能、修订号代表 Bug 修复。发布流水线常以 `v*` 标签作为触发器（见第 7 节）。

## 3. 查看标签

### 3.1 列出标签

```bash
# 列出所有标签
git tag

# 按模式过滤
git tag -l "v1.*"
git tag -l "v2.0*"

# 查看标签详情
git show v1.0.0
git cat-file -p v1.0.0
```

### 3.2 查看标签指向的提交

```bash
git rev-parse v1.0.0
git log v1.0.0 -1
```

## 4. 推送标签

### 4.1 推送单个标签

```bash
git push origin v1.0.0
```

### 4.2 推送所有标签

```bash
git push origin --tags
```

### 4.3 只推送附注标签

```bash
git push origin --follow-tags
```

## 5. 删除标签

### 5.1 删除本地标签

```bash
git tag -d v1.0.0
```

### 5.2 删除远程标签

```bash
git push origin --delete v1.0.0
# 或
git push origin :refs/tags/v1.0.0
```

## 6. 签名标签

### 6.1 GPG 签名

```bash
# 创建签名标签
git tag -s v1.0.0 -m "Release v1.0.0"

# 验证签名
git tag -v v1.0.0
```

### 6.2 SSH 签名

```bash
# Git 2.34+ 支持 SSH 签名
git tag -s v1.0.0 -m "Release v1.0.0"

# 配置 SSH 签名
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
```

## 7. 标签在 CI/CD 中的应用

```bash
# 基于标签触发部署
# .github/workflows/deploy.yml
# on:
#   push:
#     tags:
#       - 'v*'

# 创建发布标签
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
# → 触发自动部署
```
## 创建轻量标签

**基本写法：在当前提交创建标签**
`git tag <标签名>`
```bash
# 在当前提交创建 v1.0.0 标签
git tag v1.0.0;
```

**基本写法：在指定提交创建标签**
`git tag <标签名> <提交哈希>`
```bash
# 在 abc1234 提交创建 v0.9.0 标签
git tag v0.9.0 abc1234;
```

---

## 创建附注标签

**基本写法：创建附注标签**
`git tag -a <标签名> -m "<标签消息>"`
```bash
# 创建附注标签 v1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0";
```

**基本写法：在指定提交创建附注标签**
`git tag -a <标签名> <提交哈希> -m "<标签消息>"`
```bash
# 在 abc1234 提交创建附注标签 v0.9.0
git tag -a v0.9.0 abc1234 -m "Release version 0.9.0";
```

---

## 语义化版本

**基本写法：语义化版本格式**
`v<主版本号>.<次版本号>.<修订号>`
```text
# v1.2.3 含义
# 1 主版本号：不兼容的变更
# 2 次版本号：向后兼容的新功能
# 3 修订号：Bug 修复
v1.2.3
```

---

## 列出标签

**基本写法：列出所有标签**
`git tag`
```bash
# 列出所有标签
git tag;
```

**基本写法：按模式过滤标签**
`git tag -l "<模式>"`
```bash
# 列出 v1. 开头的标签
git tag -l "v1.*";
```

**基本写法：查看标签详情**
`git show <标签名>`
```bash
# 查看 v1.0.0 标签的详情
git show v1.0.0;
```

**基本写法：查看标签对象内容**
`git cat-file -p <标签名>`
```bash
# 查看 v1.0.0 标签对象内容
git cat-file -p v1.0.0;
```

---

## 查看标签指向的提交

**基本写法：获取标签指向的提交哈希**
`git rev-parse <标签名>`
```bash
# 获取 v1.0.0 指向的提交哈希
git rev-parse v1.0.0;
```

**基本写法：查看标签指向的提交日志**
`git log <标签名> -1`
```bash
# 查看 v1.0.0 标签指向的提交
git log v1.0.0 -1;
```

---

## 推送标签

**基本写法：推送单个标签**
`git push <远程仓库名> <标签名>`
```bash
# 推送 v1.0.0 标签到 origin
git push origin v1.0.0;
```

**基本写法：推送所有标签**
`git push <远程仓库名> --tags`
```bash
# 推送所有标签到 origin
git push origin --tags;
```

**基本写法：只推送附注标签**
`git push <远程仓库名> --follow-tags`
```bash
# 推送所有附注标签到 origin
git push origin --follow-tags;
```

---

## 删除标签

**基本写法：删除本地标签**
`git tag -d <标签名>`
```bash
# 删除本地 v1.0.0 标签
git tag -d v1.0.0;
```

**基本写法：删除远程标签**
`git push <远程仓库名> --delete <标签名>`
```bash
# 删除 origin 上的 v1.0.0 标签
git push origin --delete v1.0.0;
```

**基本写法：删除远程标签（refs 写法）**
`git push <远程仓库名> :refs/tags/<标签名>`
```bash
# 使用 refs 写法删除远程标签
git push origin :refs/tags/v1.0.0;
```

---

## 签名标签

**基本写法：创建 GPG 签名标签**
`git tag -s <标签名> -m "<标签消息>"`
```bash
# 创建 GPG 签名的 v1.0.0 标签
git tag -s v1.0.0 -m "Release v1.0.0";
```

**基本写法：验证签名标签**
`git tag -v <标签名>`
```bash
# 验证 v1.0.0 标签的签名
git tag -v v1.0.0;
```

---

## 配置 SSH 签名

**基本写法：配置 SSH 签名格式**
`git config --global gpg.format ssh`
```bash
# 配置使用 SSH 签名
git config --global gpg.format ssh;
```

**基本写法：配置签名密钥**
`git config --global user.signingkey <密钥路径>`
```bash
# 指定 ed25519 密钥作为签名密钥
git config --global user.signingkey ~/.ssh/id_ed25519.pub;
```

---

## 检出标签

**基本写法：检出标签对应的提交（分离 HEAD；现代命令 git switch --detach）**
`git switch --detach <标签名>`
```bash
# 查看 v1.0.0 版本的代码（处于分离 HEAD，不建分支时提交会悬空）
git switch --detach v1.0.0;
# 需要在此基础上开发时先建分支：git switch -c hotfix-from-v1.0.0 v1.0.0
```

## 小结

**初学者要点**

- 发布版本用附注标签（`-a -m`）：有独立的作者、日期与消息；轻量标签只适合本地临时锚点。
- 标签不会随 `git push` 自动上传，需 `git push origin <标签>`；`--follow-tags` 只推送推送提交可达的附注标签。
- 语义化版本命名（v主.次.修订）配合 CI 的 `v*` 触发器是发布流水的标准姿势。

**进阶注意**

- 附注标签是 tag 对象（`cat-file -p` 可见），轻量标签只是引用；对账时注意 `rev-parse` 对两者的剥壳差异。
- 重要发布用 `-s` 签名标签并用 `git tag -v` 验证（见签名提交篇）。
- 删除远程标签用 `git push origin --delete <标签>`；删除他人正在依赖的标签属于破坏性操作，先周知。
