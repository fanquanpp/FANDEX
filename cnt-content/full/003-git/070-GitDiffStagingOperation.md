---
order: 70
title: git diff 与暂存区：提交前先看清自己改了什么
module: 'git'
category: 工具链
difficulty: intermediate
description: 用一次真实提交前的自检流程讲透 git diff：工作区/暂存区/提交三个视角、diff 输出逐行解读、--staged 语义、空白噪声与分支比较（双点三点），附误判「没改动」与「空 diff 提交」两个真实坑。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'git/050-GitBasicOperation'
  - 'git/060-ThreeTrees'
  - 'git/080-GitRestoreFileOperation'
  - 'git/180-GitLogDetailed'
prerequisites:
  - 'git/050-GitBasicOperation'
  - 'git/060-ThreeTrees'
---

## 前置知识

- 已完成 [Git 基础操作](/git/050-GitBasicOperation)：会 init、add、commit，能看懂 `git status`；
- 已完成 [三棵树模型](/git/060-ThreeTrees)：知道工作区、暂存区、仓库分别是什么。

缺第二篇也能跟，本文开头会把三棵树各用一句话带回来。

## 学习目标

读完本文你将能够：

1. 提交前用三条 diff 命令回答三个问题：我改了什么、哪些要进这次提交、最终提交里到底是什么；
2. 逐行读懂一段 diff 输出（`@@` 行号是什么、`-` 和 `+` 各代表谁）；
3. 解释为什么「`git diff` 显示空」不等于「没有改动」，并用 `--staged` 避开这个坑；
4. 用 `--stat`、`-w`、双点三点语法处理「改动太多看不过来」和「空白噪声」两类真实麻烦。

预计 40 分钟，全程在终端动手。

## 1. 问题：改了一下午，提交前你敢直接 add . 吗

真实场景：你在给一个项目修 bug，改了三四个文件。合上电脑前你要提交，但心里没底——

- 改动散在多个文件里，有没有顺手改坏了什么？
- 有几行是调试用的 `console.log`，不该进这次提交；
- 上周你学乖了不再无脑 `git add .`，可手动挑文件时，`git status` 只告诉你会被提交的**文件名**，不告诉你**内容**。

提交 = 永久写进历史。所以在敲 `git commit` 之前，你需要一个「回放键」，把即将提交的内容看清楚。这个回放键就是 `git diff`。三棵树各用一句话带回：**工作区**是你正在编辑的文件，**暂存区**是下一次提交的草稿清单，**仓库**（HEAD）是最近一次提交的快照。diff 家族的全部本领，就是在这三者之间两两对比。

## 2. 最小实验：一个文件，三个视角

建一个练习仓库，照抄即可：

```bash
mkdir diff-lab && cd diff-lab
git init
echo "function add(a, b) { return a + b }" > calc.js
git add calc.js
git commit -m "feat: add function"
```

现在改它，并且只暂存一部分——这是复刻真实场景的关键一步：

```bash
echo "function add(a, b) { return a + b }" > calc.js
echo "console.log('debug')" >> calc.js
echo "function sub(a, b) { return a - b }" >> calc.js
git add calc.js
echo "console.log('debug2')" >> calc.js
```

此刻的状态：`add` 与 `debug` 在暂存区，`debug2` 还在工作区。依次运行三条命令：

```bash
git diff
```

输出只有 `debug2` 那一行——`git diff` 默认比较**工作区 vs 暂存区**，只显示还没暂存的部分：

```diff
@@ -1,3 +1,4 @@
 function add(a, b) { return a + b }
 console.log('debug')
+console.log('debug2')
```

```bash
git diff --staged
```

输出是 `debug` 那一行——`--staged` 比较**暂存区 vs HEAD**，也就是「如果现在提交，会提交什么」：

```diff
@@ -1 +1,2 @@
 function add(a, b) { return a + b }
+console.log('debug')
```

```bash
git diff HEAD
```

输出包含 `debug` 和 `debug2` 两行——`HEAD` 比较**工作区 vs 最近提交**，是「从上次提交到现在，我总共干了什么」的全景：

```diff
@@ -1 +1,3 @@
 function add(a, b) { return a + b }
+console.log('debug')
+console.log('debug2')
```

三个视角各回答一个提交前必答的问题：

| 命令 | 比较对象 | 回答的问题 |
| :--- | :--- | :--- |
| `git diff` | 工作区 vs 暂存区 | 还有哪些改动没进暂存区？ |
| `git diff --staged` | 暂存区 vs HEAD | 这次提交会包含什么？ |
| `git diff HEAD` | 工作区 vs HEAD | 距离上次提交，我总共改了什么？ |

## 3. 为什么：暂存区是「提交的草稿」，diff 是草稿的校对镜

回想 [三棵树模型](/git/060-ThreeTrees)：`git add` 把改动从工作区誊进暂存区，`git commit` 把暂存区整体归档成快照。所以「这次提交的内容」在 commit 之前就完全确定了——就是暂存区当前的样子。`git diff --staged` 因此是提交前最重要的一条命令：**它看到什么，提交里就是什么**，一步都不差。

这也解释了本篇第一大坑的成因：`git diff`（不带参数）比较的是工作区和暂存区。你 `git add` 完所有文件，工作区和暂存区一模一样，`git diff` 自然输出为空。新手看到空输出，以为「没有改动」就放心关机——其实改动都好好躺在暂存区里，等着下次 commit 一起打包进一个莫名其妙的提交。

`--staged` 还有个别名 `--cached`，两者完全等价，老教程里常见 `--cached`，2026 年的新文档统一推荐更好读的 `--staged`。

## 4. 读懂一段 diff：五分钟认全所有记号

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

只需要记五个记号：

- `--- a/...` 与 `+++ b/...`：`a` 是旧版本，`b` 是新版本（对 `--staged` 来说，a 是 HEAD、b 是暂存区）；
- `@@ -10,7 +10,8 @@`：变更位置坐标。旧文件从第 10 行起 7 行，新文件从第 10 行起 8 行（7 行变 8 行，因为净增 1 行）。`@@` 后面那段 `function process(data)` 是 Git 猜的「所在函数名」，帮你定位；
- `-` 开头：从旧版本里删掉的行；`+` 开头：新版本里加上的行；
- 空格开头：上下文行，没变，只是贴在旁边帮你定位；
- 新增文件整个都是 `+`，删除的文件整个都是 `-`。

改动多到刷屏时，先看统计再钻细节：

```bash
git diff HEAD --stat
#  packages/cli/src/main.ts   | 12 ++++++------
#  packages/core/src/index.ts |  3 ++-
#  2 files changed, 9 insertions(+), 6 deletions(-)
```

在 pnpm monorepo 这类多包仓库里（比如本教程所在的 FANDEX 仓库，`cnt-content`、`apps`、`packages` 各管一摊），`--stat` 是你决定「这次 commit 只装哪些包的改动」的第一依据，然后配合路径过滤只看关心的部分：

```bash
git diff HEAD -- packages/core/          # 只看 core 包
git diff HEAD -- '*.spec.ts'             # 只看测试文件
git diff HEAD -- . ':(exclude)*.md'      # 全部，但排除 markdown
```

## 5. 坑点与自检

### 坑 1：diff 显示空，以为没改动

成因见第 3 节。自检动作：把 `git status` 和 `git diff --staged` 绑定成肌肉记忆——status 告诉你**哪些文件**会进提交，`--staged` 告诉你**内容**是什么。两个都看了再 commit。

### 坑 2：几百行「改动」，其实全是空格

换行符或编辑器自动格式化会把整个文件标红标绿，真实改动被淹没。两个对策：

```bash
git diff -w          # 忽略所有空白差异，看真实逻辑改动
git diff --stat -w   # 统计也忽略空白：如果 --stat 变短了，说明之前全是空白噪声
```

如果 `--stat` 前后差异巨大，先解决格式化配置（如统一 `.editorconfig`），再谈提交。

### 坑 3：比较分支时双点和三点拿到不同结果

```bash
git diff main...feature   # 三点：从分叉点至今，feature 上发生了什么（PR 里显示的就是它）
git diff main..feature    # 双点：两个分支当前快照的直接差异（也包含 main 在分叉后的变化）
```

记忆法：三个点的意思是「他走之后他改了啥」，两个点是「现在他俩差多少」。想预览一个 PR 会带来什么，用三点。

### 自检清单

提交前 30 秒走完这四条，基本不会翻车：

1. `git status`：改动都在意料之中？没有忘了忽略的日志文件？
2. `git diff`：未暂存的部分是故意留下的吗？
3. `git diff --staged`：暂存区就是我想提交的全部？没有混进调试代码？
4. `git diff HEAD --stat`：总量合理？某个几百行的大文件是不是改错了？

## 6. 进阶速查：本文没展开但迟早用得上

```bash
git diff --word-diff                 # 词语级对比，改长文案时极好用
git diff --color-words               # 同为词语级，但用高亮代替行内标记
git diff HEAD~3 -- src/index.ts      # 这个文件最近 3 次提交间改了什么
git diff main feature -- package.json # 两个分支的同一个文件差在哪
git diff --check                     # 扫尾：检查遗留的冲突标记与行尾空白
```

更多按需取用的选项，按「想解决什么问题」检索：

**统计与清单。** `--stat` 只给概况；要机器可读的增删行数用 `--numstat`（输出格式是「新增行数 制表符 删除行数 制表符 文件名」，脚本处理时比 `--stat` 好解析）；只要文件名清单用 `--name-only`，文件名加状态字母（M 修改 / A 新增 / D 删除）用 `--name-status`。

**上下文与空白。** 默认改动上下各显示 3 行，`-U5` 扩到 5 行（`-U0` 则完全不显示上下文）；`-w` 忽略所有空白差异，`--ignore-space-at-eol` 只忽略行尾空白；`-W` 把 diff 范围扩到所在函数的完整函数体，评审大函数内的局部改动时很有用。

**重命名与复制检测。** Git 存的是内容快照，本来不知道「改名」这回事，但 `git diff` 会启发式猜测：`-M` 检测重命名（默认相似度 50%，`-M90%` 提高到 90% 更严格），`-C` 追加检测复制，`-C -M` 两者同时开。这就是为什么 git status 里改名显示成 `renamed:` 而不是一删一增。

**diff 算法。** 默认 Myers 算法速度快；`--patience` 只锚定上下文中唯一出现的行，代码大幅重构时输出更符合人类直觉；`--histogram` 是 patience 的改进版，处理更复杂的变更。日常感觉 diff 排版乱时换 `--histogram` 试试，不需要改任何配置。

**别名。** 高频组合值得固化成快捷键，写进全局配置一次，处处生效：

```bash
git config --global alias.ds "diff --staged"
git config --global alias.dn "diff --name-only"
git config --global alias.dw "diff --color-words"
```

之后 `git ds` 等价于 `git diff --staged`。可换 GUI 查看的 `git difftool` 属于 [git mergetool](/git/140-GitMergetool) 的范围。

diff 工具换了更好读（VS Code、vimdiff 等）属于 [git difftool](/git/140-GitMergetool) 的范围；diff 能力在历史查询里的孪生兄弟是 `git log -p`，见 [git log 详解](/git/180-GitLogDetailed)。

## 7. 练习

1. 基础：在 diff-lab 里把 `debug2` 也 add 进去，然后不看任何输出预测——`git diff`、`git diff --staged`、`git diff HEAD` 各显示什么？跑一遍验证。
2. 挑剔：故意制造一个「整文件空白噪声」：把 calc.js 的缩进全部改动但不改逻辑，用 `-w` 和 `--stat -w` 验证你能识别出它是假改动。
3. 实战：在你自己的项目里，下一次提交前强制自己走完第 5 节的自检清单。如果第 3 步发现了不该提交的东西，用 `git restore --staged <文件>` 把它退回工作区（详见 [git restore 与文件操作](/git/080-GitRestoreFileOperation)）。
4. 思考：`git diff --staged` 和 `git diff --cached` 输出完全一样，为什么 Git 团队后来主推前者？（提示：staged 对应哪棵树？cached 对应哪个历史实现？）

## 下一步

- [git restore 与文件操作](/git/080-GitRestoreFileOperation)：diff 发现了不该有的改动，怎么精准撤销；
- [git log 详解](/git/180-GitLogDetailed)：diff 朝历史方向看，log 带你按提交回放；
- [git reset 三种重置模式](/git/300-GitReset)：当整个暂存区都需要推倒重来。
