---
order: 40
title: 忽略规则 .gitignore 深入
module: 'git'
category: 工具链
difficulty: beginner
description: 从零讲透 .gitignore：模式语法、匹配规则、已跟踪文件处理、排障与分层忽略体系。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'git/050-GitBasicOperation'
  - 'git/150-GitRemoteRepoOperation'
  - 'git/080-GitRestoreFileOperation'
prerequisites:
  - 'git/050-GitBasicOperation'
---

## 一句话理解

`.gitignore` 是一份「路径黑名单」：告诉 Git 哪些文件不要纳入版本控制——依赖目录、构建产物、本地配置和密钥都不该出现在提交里。

## 为什么需要

- `node_modules` 成千上万个文件提交进仓库，仓库会臃肿到无法协作。
- 密钥、`.env` 一旦提交等于公开泄露，且会永远留在历史里。
- 每个人本地的编辑器配置、操作系统杂物不该污染团队仓库。

## 模式语法速查

| 写法 | 含义 | 示例 |
| --- | --- | --- |
| `node_modules/` | 结尾 `/` 表示忽略整个目录（含内部全部内容） | `node_modules/` |
| `*.log` | 通配符匹配任意层级的 .log 文件 | `*.log` |
| `/dist` | 以 `/` 开头锚定仓库根目录，只匹配根下的 dist | `/dist` |
| `docs/**/*.tmp` | `**` 跨任意层级目录 | `docs/**/*.tmp` |
| `foo?bar` / `[ab]` | 单字符通配 / 字符集合 | `test?.log` |
| `!keep.txt` | 取反，把被忽略的路径重新纳入 | `!important.log` |

```gitignore
# 一个 Node 项目的典型 .gitignore
node_modules/
dist/
*.log
.env
.env.*
!.env.example      # 例外：示例环境文件要共享
.DS_Store
coverage/
```

两条底层规则先记住，后面所有怪现象都由它们解释：

1. **顺序即优先级**：后面的规则覆盖前面的（`*.log` 之后写 `!debug.log`，则 debug.log 被跟踪）。
2. **只对未跟踪文件生效**：已经提交过的文件，忽略规则完全不干涉。

## 匹配规则的两个易混细节

**目录锚定的写法差别**

- `build/`（尾斜杠）只匹配**任何层级**名为 build 的目录；
- `/build`（首斜杠）只匹配**仓库根目录**下的 build；
- `build` 无斜杠则目录与文件都匹配。想表达「只忽略根下的 build 目录」应写 `/build/`。

**空目录天然不可跟踪**

Git 只记录文件。想让空目录进仓库，惯例是放一个占位文件：

```bash
mkdir -p uploads
touch uploads/.gitkeep
```

## 最高频的坑：规则为何「不生效」

`.gitignore` 改完发现文件照样有改动提示？因为它已被跟踪。停止跟踪并保留本地文件：

```bash
git rm --cached config.local.json
echo "config.local.json" >> .gitignore
git commit -m "chore: 停止跟踪本地配置文件"
```

注意两个推论：

- `--cached` 后**同事拉取时该文件会从他们的工作区消失**（对他们是删除）；涉及本机专属配置时提前周知。
- 仓库里残留的历史版本仍可被检出；敏感文件要按「已泄露」处理（见下文）。

## 排障工具：让 Git 告诉你是哪条规则命中

```bash
git check-ignore -v debug.log
# .gitignore:3:*.log	debug.log      ← 第 3 行的 *.log 命中了它

git status --ignored                  # 列出被忽略的文件
git check-ignore -v --no-index secrets.env   # 还没跟踪的文件也检查
```

`check-ignore -v` 是调试忽略规则的唯一正道——不要靠肉眼在几百行规则里找。

## 分层忽略体系

忽略规则有三个生效位置，按场景分流：

```bash
# 1) 仓库级：.gitignore（随仓库共享，团队约定放这里）
# 2) 本仓库个人级：不进版本库的本地例外
echo "scratch-pad.md" >> .git/info/exclude

# 3) 全局：本机所有仓库共享（编辑器、系统杂物）
git config --global core.excludesFile ~/.gitignore_global
printf '.DS_Store\nThumbs.db\n*.swp\n' >> ~/.gitignore_global
```

分层原则：**团队必须一致的放 `.gitignore`，纯个人习惯放 excludesFile，个别仓库的私货放 `.git/info/exclude`**。团队规则个人化（各自 exclude 一堆同名文件）是协作事故的常见来源。

## 与 clean 的安全关系

`.gitignore` 还决定 `git clean` 的行为边界：

- `git clean -fd`（不带 `-x`）**不会**删除被忽略的文件——这是 `.env` 这类文件的一道软保护；
- 但 `git clean -fX` / `-fx` 会**专门清理被忽略文件**，`.env` 同样会没。

所以「写进 .gitignore = 绝对安全」是错觉，执行 clean 前永远先 `-n` 预览（见 [git restore 与文件操作](git/080-GitRestoreFileOperation)）。

## 常见误区

| 误区 | 真相 |
| --- | --- |
| 加了 .gitignore 文件就自动从仓库消失 | 只对未跟踪文件生效，已跟踪文件要 `git rm --cached` |
| 用 `*` 忽略一切再逐个取反 | 父目录被忽略后取反失效（见下），且维护成本极高 |
| `.env` 提交后再加忽略就安全了 | 提交过的密钥要视为已泄露：立即轮换密钥，再用 git-filter-repo 清理历史（见 [git-gc](git/420-GitGc)） |
| 取反 `!` 总能救回文件 | 若其父目录整目录被忽略，`!` 无效；需改成忽略目录内通配而非目录本身 |
| 忽略规则越全越好 | 团队项目优先参考 [github/gitignore](https://github.com/github/gitignore) 官方模板，再按实际需要增删 |

取反失效的典型与正确写法：

```gitignore
# 无效：logs/ 整目录忽略后，内部无法取反
logs/
!logs/keep.log

# 正确：忽略目录内容通配，保留需要的
logs/*
!logs/keep.log
```

## 完整会话：给项目补忽略体系

```bash
# 1) 起步：套用官方模板
curl -o .gitignore https://raw.githubusercontent.com/github/gitignore/main/Node.gitignore

# 2) 补项目特有规则与例外
cat >> .gitignore <<'EOF'
/dist/
*.local.json
!config.example.json
EOF

# 3) 清理已被误跟踪的产物
git rm -r --cached dist/
git add .gitignore && git commit -m "chore: 完善忽略规则并停止跟踪构建产物"

# 4) 验证
git status                  # dist 消失
git check-ignore -v dist/app.js
```

## 常用语言模板片段

```gitignore
# Node
node_modules/
dist/
*.log
.env*

# Python
__pycache__/
*.py[cod]
.venv/
*.egg-info/

# Java/构建系
target/
build/
.gradle/

# 编辑器与系统
.idea/
.vscode/
.DS_Store
Thumbs.db
```

与忽略规则配套的还有 `.gitattributes`：它管「跟踪时怎么对待文件」（行尾规范化、diff 展示方式、合并驱动），管不了「要不要跟踪」；两者一起构成仓库的文件策略（行尾配置见 [环境配置与初始化](git/030-GitEnvConfigInit)，union 驱动见 [合并冲突解决](git/130-MergeConflictResolution)）。

## 性能与规范建议

- 规则从上到下逐条匹配，把**最常命中的规则放前面**、复杂的 glob 放后面，可降低超大仓库的匹配开销；
- 能用目录忽略（`dir/`）就不用 `dir/**`；能用根锚定（`/dist`）就不要裸名——语义更准且更快；
- 避免「`*` 忽略一切再取反」的反转式写法：每加一个文件都要补 `!` 规则，协作时极易误伤；
- 规则文件随仓库提交，评审时留一句注释说明「为什么忽略」，半年后没人记得 `!keep.txt` 是干嘛的。

## 小结

`.gitignore` 的要点就四句话：忽略未跟踪的生成物、`git rm --cached` 处理存量、
`check-ignore -v` 排障、密钥提交过就当泄露处理。需要现成模板时，直接参考
[github/gitignore](https://github.com/github/gitignore) 起步。
