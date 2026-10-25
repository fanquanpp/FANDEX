---
order: 160
title: 合并冲突解决：从「CONFLICT 提示别慌」到五分钟解完
module: 'git'
category: 工具链
difficulty: intermediate
description: 以「两个人同时改了同一个组件」这个必经场景切入，动手走一遍冲突标记的阅读、三种解决路径与放弃合并的出口，讲清三方比较的判定原理，并补上 rebase 时 ours/theirs 语义反转和 pnpm-lock 冲突这两个实战大坑。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'git/110-HEADPointerBranchEssence'
  - 'git/270-GitRebase'
  - 'github/100-GitConflictResolve'
prerequisites:
  - 'git/100-GitBranchManagement'
---

## 前置知识

- 会开分支、合并（见 [Git 分支管理](/git/100-GitBranchManagement)）；
- 知道工作区 / 暂存区 / 仓库三棵树的分工（见 [三棵树模型](/git/060-ThreeTrees)）。

## 学习目标

读完全文你将能够：

1. 判断哪些改动会冲突、哪些不会（三方比较的判定规则）；
2. 按「读标记 → 改文件 → add → commit」的流程解掉一次真实冲突；
3. 知道 `--ours` / `--theirs`、`-X ours` / `-X theirs`、`merge=union` 各自的适用边界；
4. 避开两个大坑：rebase 中 ours/theirs 语义反转、`pnpm-lock.yaml` 冲突不该手解。

## 1. 问题：你们改了同一个文件

必经场景：你在 `fix/reader` 分支上改了 `Reader.tsx` 的头部布局，同事在 `feat/search` 分支也改了同一个位置，他先合进了 main。你合并时：

```bash
git merge main
# Auto-merging app-web/src/Reader.tsx
# CONFLICT (content): Merge conflict in app-web/src/Reader.tsx
# Automatic merge failed; fix conflicts and then commit the result.
```

先理解 Git 什么时候才会把问题扔给你：

| 情况 | 结果 |
| :--- | :--- |
| 改了不同文件 | 自动合并 |
| 同一文件的不同位置 | 自动合并 |
| 同一位置双方都改了 | 内容冲突 |
| 一方改、一方删同一个文件 | modify/delete 冲突 |

判定基准是**共同祖先**：Git 拿「你的版本 / 对方版本 / 分叉前的共同版本」做三方比较。同一位置只有一方改了，Git 采纳改动；两边各改各的，Git 不敢仲裁，标记冲突交给你。

打开冲突文件，会看到这样的标记：

```text
<<<<<<< HEAD
const HEADER_HEIGHT = 64;      // 你的版本（当前分支）
=======
const HEADER_HEIGHT = 72;      // 对方的版本（被合进来的）
>>>>>>> main
```

三行的含义：`<<<<<<<` 到 `=======` 是当前分支内容，`=======` 到 `>>>>>>>` 是对方内容。你的任务只有一个：把这三块标记替换成最终想要的那份内容。

## 2. 动手：五步解掉一次冲突

```bash
# 1. 看哪些文件在冲突状态
git status
# Unmerged paths:
#   both modified:   app-web/src/Reader.tsx

# 2. 打开文件，逐处处理标记，保留正确内容
#    （编辑器装上冲突高亮插件，VS Code 自带「Accept Current/Incoming」按钮）

# 3. 标记该文件已解决
git add app-web/src/Reader.tsx

# 4. 所有冲突文件 add 完，提交完成合并
git commit

# 随时想反悔：
git merge --abort
```

三个常用辅助命令：

```bash
git diff --name-only --diff-filter=U   # 只列冲突文件
git diff                               # 冲突现场上下文
git mergetool                          # 起三方合并 GUI 工具
```

## 3. 讲原理：几种「批量取舍」的边界

### checkout --ours / --theirs：整个文件选一边

```bash
git checkout --ours   src/config.js   # 整个文件用当前分支版本
git checkout --theirs src/config.js   # 整个文件用对方版本
git add src/config.js                 # 别忘了 add
```

粒度是整个文件，不是冲突行。适合锁文件之外的二进制、生成物。

**大坑：rebase 时语义是反的。** rebase 的本质是把你的提交重放到新基底上，重放过程中「当前分支」是基底（别人的提交），你的改动反而是 incoming。所以在 rebase 冲突里，`--ours` 指基底、`--theirs` 指**你自己的改动**。手快选错，丢的正是你自己刚写的代码。拿不准就 `git log --merge --oneline` 看看两边各是哪些提交。

### merge -X ours / -X theirs：只在冲突行偏向一边

```bash
git merge -X ours main      # 冲突行用我的，其余改动照常合并
git merge -X theirs main
```

注意它和 `git merge -s ours`（策略级）完全不同：`-s ours` 会**整体丢弃对方全部内容**，历史显示合并了但代码一行没进来，是著名的翻车选项。

### merge=union：双方都保留

变更日志这类「只追加」的文件，冲突手解毫无意义：

```bash
echo "CHANGELOG.md merge=union" >> .gitattributes
```

union 驱动把双方新增的行都保留，不做语义判断，只适合纯追加文本。

### 特殊冲突：锁文件不要手解

monorepo 里最常见的冲突文件是 `pnpm-lock.yaml`——两个人各自 `pnpm install` 都会改它。手解哈希块必然出错，正确做法是**冲突后重新生成**：

```bash
git checkout --theirs pnpm-lock.yaml   # 先随便选一边，恢复可解析状态
pnpm install                            # 依据所有 package.json 重新生成锁文件
git add pnpm-lock.yaml
```

同样的思路适用于 `package-lock.json`、`Cargo.lock` 等一切锁文件：它们是生成物，重生成永远比手解可靠。

## 4. 预防：冲突是流程问题，不是技术问题

| 策略 | 做法 |
| :--- | :--- |
| 频繁同步 | 功能分支每天从 main 拉一次 |
| 小步提交 | 提交只做一件事，PR 只解决一个问题 |
| 短命分支 | 分支活不过两三天 |
| 别做全库格式化 | 一次格式化提交毁掉所有人的 blame 和合并 |
| 文件分工 | 用 [CODEOWNERS](/github/190-CODEOWNERS) 明确归属，减少两人同改一个文件 |

合并前还可以做一次「演习」：

```bash
git merge --no-commit --no-ff main   # 试合并但不提交
git diff --check                     # 检查冲突标记与空白错误
git merge --abort                    # 放弃演习
```

## 5. 坑点与自检

| 现象 | 原因 | 处理 |
| :--- | :--- | :--- |
| 解完冲突 `git status` 还显示 unmerged | 忘了 `git add` | add 后再 commit |
| 提交时提示 conflict markers 还在 | 文件里残留 `<<<<<<<` | `grep -rn "<<<<<<<" .` 找出来清掉 |
| rebase 时把别人的改动当成自己的丢了 | ours/theirs 语义反转 | `git log --merge` 核对两边；丢了去 [reflog](/git/260-GitReflog) 找回 |
| 合并后 main 上没拿到对方代码 | 误用了 `merge -s ours` | 检查历史里的合并策略，重新合并 |
| 手解 `pnpm-lock.yaml` 后 install 报错 | 锁文件哈希块拼错 | 删掉重生成：`pnpm install` |
| 冲突越解越乱 | 手里混了多个操作 | `git merge --abort` 回到干净起点重来 |

自检三问：

1. 冲突标记的四行里（`<<<<<<<`、`=======`、`>>>>>>>`），哪两行之间是对方的内容？
2. rebase 冲突里的 `--ours` 指谁？
3. 你项目里冲突最多的文件是哪个？它该手解还是重生成？

## 6. 练习

1. 制造一次冲突：开两个分支改同一行，合并触发冲突，完整走一遍五步流程。
2. 在一个测试仓库里分别执行 `git merge -X ours` 和 `git merge -s ours`，`git diff` 对比两种结果，亲眼看到 `-s ours` 丢代码。
3. 给你的仓库加一条 `.gitattributes`：把锁文件和 CHANGELOG 声明成合适的合并策略。

## 下一步

- rebase 流程中的冲突与历史改写：[git rebase](/git/270-GitRebase)
- 冲突解砸了怎么救：[git reflog](/git/260-GitReflog)
- 平台上带审查的冲突处理：[GitHub 冲突解决](/github/100-GitConflictResolve)
