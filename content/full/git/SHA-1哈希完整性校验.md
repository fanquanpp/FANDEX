---
order: 52
title: 'SHA-1哈希完整性校验'
module: git
category: 'Git Basics'
difficulty: intermediate
description: 'Git中SHA-1哈希的工作原理：内容寻址、完整性校验与碰撞问题。'
author: fanquanpp
updated: '2026-06-14'
related:
  - git/分布式版本控制原理
  - git/对象模型
  - git/三棵树
  - 'git/git-diff与暂存区操作'
prerequisites:
  - git/语法速查
---

## 1. SHA-1 在 Git 中的作用

### 1.1 内容寻址

Git 使用 SHA-1 哈希作为对象的**唯一标识符**。SHA-1 生成 160 位（20 字节）的哈希值，通常表示为 40 位十六进制字符串。

$$
\text{SHA-1}(x) = h, \quad h \in \{0,1\}^{160}
$$

```bash
# 计算字符串的 SHA-1
echo -n "hello" | openssl sha1
# aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d

# 计算 Git 对象的 SHA-1（包含类型和长度前缀）
echo "hello" | git hash-object --stdin
# ce013625030ba8dba906f756967f9e9ca394464a
```

### 1.2 三大作用

| 作用     | 说明                           |
| :------- | :----------------------------- |
| **标识** | 每个对象有唯一 ID              |
| **去重** | 相同内容产生相同哈希，只存一份 |
| **校验** | 任何数据变化都会导致哈希变化   |

## 2. 哈希计算过程

### 2.1 Git 对象的哈希

Git 在计算哈希时，会在内容前添加**类型和长度前缀**：

```
SHA-1("blob " + size + "\0" + content)
```

```bash
# 手动计算 blob 的 SHA-1
printf "blob 6\0hello\n" | openssl sha1
# ce013625030ba8dba906f756967f9e9ca394464a

# 与 git hash-object 结果一致
echo "hello" | git hash-object --stdin
# ce013625030ba8dba906f756967f9e9ca394464a
```

### 2.2 各对象类型的哈希

| 对象       | 格式                                | 示例     |
| :--------- | :---------------------------------- | :------- |
| **blob**   | `"blob " + size + "\0" + content`   | 文件内容 |
| **tree**   | `"tree " + size + "\0" + entries`   | 目录条目 |
| **commit** | `"commit " + size + "\0" + content` | 提交信息 |
| **tag**    | `"tag " + size + "\0" + content`    | 标签信息 |

## 3. 完整性校验

### 3.1 哈希链

Git 的对象形成一条**哈希链**，任何篡改都会被检测到：

```
commit (hash = SHA-1(tree + parent + author + message))
  │
  ├── tree (hash = SHA-1(entries))
  │     ├── blob (hash = SHA-1(content))
  │     └── blob (hash = SHA-1(content))
  │
  └── parent commit (hash = SHA-1(...))
```

修改任何一个对象 → 其哈希变化 → 引用它的父对象哈希也变化 → 连锁反应直到根提交

### 3.2 fsck 校验

```bash
# 检查仓库完整性
git fsck

# 常见输出
# dangling blob abc1234...  ← 未被引用的 blob
# dangling commit def5678... ← 未被引用的 commit
# missing tree ghi9012...    ← 缺失的 tree 对象
# corrupt object jkl3456...  ← 损坏的对象
```

### 3.3 网络传输校验

```bash
# fetch 时自动校验
git fetch origin
# remote: Enumerating objects: 42, done.
# remote: Counting objects: 100% (42/42), done.
# remote: Compressing objects: 100% (20/20), done.
# remote: Total 42 (delta 15), reused 30 (delta 10), pack-reused 0

# 如果传输中数据损坏，Git 会拒绝接收
# error: object file .git/objects/xx/yyy is empty
# fatal: loose object xxx (expected yyy) is corrupt
```

## 4. 碰撞问题

### 4.1 SHA-1 碰撞

2017 年，Google 和 CWI 研究人员首次实现了 SHA-1 碰撞攻击（SHAttered），成本约 11,000 GPU 年。

$$
P(\text{collision}) \approx \frac{n^2}{2 \times 2^{160}}
$$

对于 Git 来说，碰撞的实际风险极低，因为：

- 需要构造**有意义**的碰撞内容
- Git 对象包含类型前缀，增加了构造难度
- 碰撞攻击需要大量计算资源

### 4.2 Git 的应对

```bash
# Git 2.13+ 检测碰撞攻击
git config --global transfer.shallowHiding true

# 未来可能迁移到 SHA-256
git init --object-format=sha256 my-repo
```

Git 正在开发 SHA-256 支持，但迁移需要兼容期。

## 5. 短哈希

### 5.1 使用短哈希

Git 允许使用哈希的前缀来引用对象：

```bash
# 使用完整哈希
git show 9a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t

# 使用短哈希（通常7位足够）
git show 9a1b2c3

# 自动选择不歧义的最短长度
git log --abbrev-commit
```

### 5.2 歧义检测

```bash
# 检查短哈希是否有歧义
git rev-parse --disambiguate=9a1b2c3

# 查看需要的最短长度
git rev-parse --short=7 HEAD
```

## 6. 实用命令

```bash
# 查看对象的 SHA-1
git rev-parse HEAD              # 当前提交的完整哈希
git rev-parse --short HEAD      # 短哈希
git rev-parse HEAD~3            # 第3个父提交的哈希

# 查看引用指向的哈希
git show-ref                    # 所有引用
git rev-parse --verify main     # main 分支的哈希

# 验证对象完整性
git fsck --full                 # 完整检查
git fsck --connectivity-only    # 只检查连通性（更快）
```
