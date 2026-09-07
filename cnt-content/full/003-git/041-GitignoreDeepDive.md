---
order: 410
title: 忽略规则 .gitignore 深入
module: 'git'
category: 工具链
difficulty: beginner
description: 从零讲透 .gitignore：模式语法、目录匹配、已跟踪文件处理、全局忽略与团队共享规范。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'git/004-GitBasicOperation'
  - 'git/006-GitRemoteRepoOperation'
prerequisites:
  - 'git/004-GitBasicOperation'
---


## 一句话理解

`.gitignore` 是一份"路径黑名单"：告诉 Git 哪些文件不需要跟踪，
比如依赖目录、构建产物、本地配置和密钥。

## 为什么需要

- `node_modules` 成千上万个文件提交进仓库，仓库会臃肿到无法协作。
- 密钥、`.env` 提交后等于泄露。
- 每个人本地的编辑器配置不该污染团队仓库。

## 模式语法速查

| 写法 | 含义 | 示例 |
| --- | --- | --- |
| `node_modules/` | 忽略目录（含内部全部内容） | `node_modules/` |
| `*.log` | 匹配任意层级的 .log 文件 | `*.log` |
| `build/` | 只忽略根目录下的 build 目录 | `build/` |
| `/dist` | 以 `/` 开头锚定仓库根目录 | `/dist` |
| `**/temp` | 匹配任意层级的 temp | `**/temp` |
| `!keep.txt` | 取反，重新包含 | `!important.txt` |
| `foo?bar` / `[ab]` | 单字符通配 / 字符集合 | `test?.log` |

```gitignore
# 一个 Node 项目的典型 .gitignore
node_modules/
dist/
*.log
.env
.env.*
!.env.example
.DS_Store
coverage/
```

## 三个关键细节

**1. 只影响未跟踪文件**

已经被跟踪的文件，忽略规则不生效。要停止跟踪但不删本地文件：

```bash
git rm --cached config.local.json
echo "config.local.json" >> .gitignore
git commit -m "停止跟踪本地配置文件"
```

**2. 空目录不会被跟踪**

Git 只跟踪文件。想让空目录进仓库，惯例是放一个 `.gitkeep`：

```bash
mkdir -p uploads
touch uploads/.gitkeep
```

**3. 取反的边界**

如果父目录被忽略，`!` 无法重新包含其中的文件：

```gitignore
logs/                 # 整个 logs 目录被忽略
!logs/important.log   # 无效：父目录已忽略
```

## 全局与本地忽略

```bash
# 全局忽略（对所有仓库生效，例如系统文件）
git config --global core.excludesfile ~/.gitignore_global

# 单仓库本地忽略（不进版本库）
# 编辑 .git/info/exclude，语法与 .gitignore 相同
```

## 常见误区

| 误区 | 真相 |
| --- | --- |
| 加了 .gitignore 文件就自动从仓库消失 | 只对未跟踪文件生效，已跟踪文件要 `git rm --cached` |
| 用 `*` 忽略一切再取反 | 父目录忽略会让取反失效，维护成本高 |
| 忽略规则写得越全越好 | 团队项目优先用官方模板 + 项目实际需要，避免误伤 |
| `.env` 提交后再加忽略就安全了 | 提交过的密钥要视为已泄露，立即轮换 |

## 小结

`.gitignore` 的要点就三句话：忽略未跟踪的生成物、用 `git rm --cached` 处理存量、
把敏感文件挡在仓库门外。需要现成模板时，直接参考
[github/gitignore](https://github.com/github/gitignore) 起步。
