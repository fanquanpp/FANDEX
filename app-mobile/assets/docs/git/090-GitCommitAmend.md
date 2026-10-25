---
order: 110
title: git commit --amend：提交后一分钟的后悔药
module: 'git'
category: 工具链
difficulty: intermediate
description: 用「刚提交就发现错了」的三个真实场景讲透 commit --amend：改信息、补文件、修敏感内容，讲清 amend 是造新提交而非修改旧提交、哈希为什么变、reflog 怎么救，以及已推送提交的黄金法则。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'git/050-GitBasicOperation'
  - 'git/260-GitReflog'
  - 'git/270-GitRebase'
  - 'github/060-GitCommitPush'
prerequisites:
  - 'git/050-GitBasicOperation'
  - 'git/060-ThreeTrees'
---

## 前置知识

- 已完成 [Git 基础操作](/git/050-GitBasicOperation)：会 add、commit，知道提交会永久写进历史；
- 已完成 [三棵树模型](/git/060-ThreeTrees)：知道暂存区与 HEAD 的关系。

## 学习目标

读完本文你将能够：

1. 用 `--amend` 修复刚犯的三类错误：提交信息写错、漏加文件、提交了不该提交的内容；
2. 解释 amend 的本质是「造一个新提交替换旧提交」，说出旧提交的去向与找回方法；
3. 执行黄金法则：判断一个提交能不能 amend，只看一件事——它推没推过；
4. 用 `--no-edit`、`reset --soft HEAD~1` 处理 amend 覆盖不到的情况。

预计 30 分钟，全程动手。

## 1. 问题：刚敲完回车，你就后悔了

三个高频翻车现场，你迟早都会遇上：

1. 敲完 `git commit -m "fix: 修复登陆页校验"`，回车键落下的瞬间发现——「登陆」是错别字，应该是「登录」。这条信息要跟着这个项目一辈子；
2. commit 完一跑测试，红了一个。修复文件忘了一起提交；
3. 更糟：把含密钥的 `.env.local` 一起提交了。

这三种情况都有同一个特点：**错误发生在最近一次提交里，而且还没推送**。这正是 `git commit --amend` 的适用场景——给最近一次提交开一扇一分钟的反悔窗。

## 2. 最小实验：三次反悔

建一个练习仓库：

```bash
mkdir amend-lab && cd amend-lab
git init
echo "console.log('hello')" > app.js
git add app.js
git commit -m "feat: 添加登陆日志"
```

### 场景 1：改提交信息

```bash
git commit --amend -m "feat: 添加登录日志"
```

Git 会打开默认编辑器让你确认（用 `-m` 则直接替换）。改完用 `git log --oneline -2` 对比：提交还是那个提交的功能，但哈希变了——比如从 `a1b2c3d` 变成 `e4f5g6h`。

### 场景 2：补漏掉的文件

先复现事故：

```bash
echo "function log(msg) { console.log(msg) }" > logger.js
git commit -m "feat: 抽取日志函数"        # 忘了 add logger.js
git status                               # 它还在工作区躺着
```

补救只需要两步：

```bash
git add logger.js
git commit --amend --no-edit    # --no-edit：信息保持原样，只补充内容
```

`--no-edit` 是场景 2 的关键：你只是补内容，不想动信息。漏掉 `--no-edit` 也不致命，编辑器里原样保存退出即可。

### 场景 3：提交了不该提交的东西

```bash
echo "API_KEY=sk-live-xxxxxxxx" > .env.local
git add .env.local
git commit -m "feat: 添加配置"    # 坏了，密钥进历史了
```

如果这是最近一次提交且未推送，amend 能救：

```bash
git rm --cached .env.local        # 从暂存区移除（保留本地文件）
echo ".env.local" >> .gitignore   # 补上忽略规则，防止下次再犯
git add .gitignore
git commit --amend --no-edit
```

注意边界：amend 只在「最近一次提交、尚未推送」时是好药。密钥一旦推送过，就算改写历史删除，也可能已被别人克隆或被缓存——那时该做的是**立刻作废这个密钥**，再清理历史（见 [git gc 与对象清理](/git/420-GitGc) 与 GitHub 侧的 [Secret scanning](/github/290-SecretScanning)）。

## 3. 为什么：amend 不是修改，是替换

这是理解 amend 安全性的钥匙。Git 的提交对象**不可变**——没有任何命令能修改一个已存在的提交。`--amend` 做的事是：

```text
amend 前:  A---B---C   (HEAD -> main)
amend 后:  A---B---C'  (HEAD -> main)     C' 是全新提交，哈希不同
```

分支指针从 C 挪到 C'，旧提交 C 不再被任何分支指向，变成「悬空对象」。它没有立刻消失——默认还在 reflog 里躺 90 天（见 [git reflog](/git/260-GitReflog)），随时可以找回：

```bash
git reflog
# e4f5g6h HEAD@{0}: commit (amend): feat: 添加登录日志
# a1b2c3d HEAD@{1}: commit: feat: 添加登陆日志    <- amend 前的旧提交还在

git reset --soft a1b2c3d    # 反悔 amend：退回旧提交（改动会回到暂存区）
```

所以 amend 是**安全的**，前提是你理解「替换」这个模型。它和另一条等价路子的区别值得想清楚：`git reset --soft HEAD~1` 再重新 commit 也能达到同样效果（撤销提交、重新组织、重新提交），amend 本质上就是这条路的快捷方式，只是不经过「暂存区大洗牌」，更不容易手滑。

## 4. 黄金法则：推没推过，决定能不能 amend

只看一件事：**这个提交推送（push）到共享远程了吗？**

- **没推送**：随便 amend。这是 amend 的专属时间窗；
- **推送了**：默认不要 amend。amend 产生新哈希，本地历史和远程分叉，再推送就必须 `--force`，会把其他人的提交基座直接抽掉。

如果确实是自己独占的分支（比如你个人的 PR 分支，确认没人基于它开发），改写后用 `--force-with-lease` 而不是裸 `--force`：

```bash
git commit --amend -m "feat: 补充边界校验"
git push --force-with-lease    # 远程若在你不注意时被更新过，推送会被拒绝而不是覆盖
```

`--force-with-lease` 多了一道「远程还停在我上次看到的位置吗」的检查。团队仓库的 main 分支永远适用默认值：推送过，就用一次新提交去修正，而不是改写历史。

## 5. 顺手把信息写规范：Conventional Commits 速记

既然 amend 最大的用途之一是修提交信息，值得顺手记住本仓库（FANDEX）实际在用的约定式提交格式：

```text
<类型>(可选作用域): <一句话描述>

feat(auth): 支持 OAuth2 登录
fix(login): 修正登录超时判断
docs: 更新安装文档
```

常用类型：`feat` 新功能、`fix` 修 bug、`docs` 文档、`refactor` 重构、`test` 测试、`chore` 杂务。标题之后空一行可以写正文，用第二个 `-m` 传入：

```bash
git commit -m "fix(login): 修正登录超时判断" -m "Closes #42"
```

团队项目里通常用 commitlint 加 Git 钩子强制校验格式，规则细节见 [Git Hook 与 Git LFS](/git/340-GitHooks)。信息写错了、忘了标类型，`--amend` 在推送前都能救。

## 5.5 amend 的冷门参数与多行信息

改的不仅是信息，作者与日期也能修——最常见于「用公司电脑忘了切邮箱」：

```bash
git commit --amend --author="Atian <me@personal.dev>" --no-edit
git commit --amend --date="2026-09-28T10:00:00" --no-edit
```

注意 `--author` 只改这一个提交的作者字段，不改全局配置；要长期切换身份还是得改 `user.email`（见 [安装与配置](/git/020-GitInstallConfig)）。

复杂提交信息不该挤在一行 `-m` 里。三种写法按场景选：

```bash
# 多个 -m：每段之间自动空行，适合「标题 + 正文」
git commit -m "feat: 添加导出功能" -m "支持 CSV 与 JSON 两种格式，见 #42"

# HEREDOC：正文多段、带脚注时最可靠，不怕 shell 转义
git commit -F - <<'EOF'
feat(api)!: 响应结构改为统一信封格式

返回体从裸数据改为 { code, data, message } 信封。
BREAKING CHANGE: 所有客户端需同步更新解析逻辑
Closes #128
EOF

# 不带 -m：Git 打开编辑器，第一行是标题，空一行后写正文
git commit
```

`feat!` 里的感叹号与正文里的 `BREAKING CHANGE:` 脚注是 Conventional Commits 标记破坏性变更的两种等价方式，前者醒目、后者能写细节，常用组合是两个都写。

## 5.6 让规范自动落地：commitlint 与钩子

格式靠自觉维持不了一周，工程做法是钩子里自动校验。以 pnpm 项目为例：

```bash
pnpm add -D @commitlint/cli @commitlint/config-conventional
echo "export default { extends: ['@commitlint/config-conventional'] }" > commitlint.config.mjs
echo "fix: 修正登录超时" | pnpm commitlint     # 先手动试一条，无输出即通过
```

再配合 husky 的 `commit-msg` 钩子（安装见 [Git Hook 与 Git LFS](/git/340-GitHooks)），钩子文件里只需一行：

```bash
pnpm commitlint --edit "$1"
```

之后每次 commit 自动校验，不合格直接拒绝。真有紧急情况可以 `git commit --no-verify` 跳过钩子——这是逃生门不是日常通道，用了要在事后补一条规范的提交说明。

顺带交代工具现状：早期教程常见 `standard-version` 自动生成 CHANGELOG，该工具已停止维护，2026 年的继任者是 release-please 与 semantic-release，思路相同（按提交类型自动定版本、写日志、发 Release）。想改更早提交的规范问题则超出 amend 能力，走 [交互式 rebase](/git/280-InteractiveRebase) 的 reword。

## 6. 坑点与自检

- **坑 1：对已推送提交 amend 后 push 被拒**。哈希分叉了，属正常保护。先确认分支确实归你独占，再 `--force-with-lease`；不确定就 `git reset --soft HEAD~1` 重新做一次正常提交。
- **坑 2：amend 之后「丢」了半天改动**。大概率是把别的改动暂存进去一起吞了。amend 会把**当前整个暂存区**与上一提交合并，动手前先 `git status` 看清暂存区里装了什么（见 [git diff 与暂存区](/git/070-GitDiffStagingOperation)）。
- **坑 3：想改的不是最近一次提交**。amend 只够得着 HEAD。更早的提交要用交互式 rebase 的 `reword`，见 [交互式 rebase](/git/280-InteractiveRebase)。

自检三问：

1. 这个提交推送过吗？（没推 → 可以 amend）
2. 暂存区里现在装的是什么？（`git status` + `git diff --staged`）
3. 我记得 amend 前的哈希在哪找吗？（`git reflog`）

## 7. 练习

1. 基础：在 amend-lab 里连续做一次「错字提交 + amend 修正」，用 `git reflog` 找到旧提交并 `reset --soft` 回去，再 amend 一次，体会旧提交并未消失。
2. 场景：复现「漏了文件」的事故并用 `--no-edit` 修复；然后故意漏掉 `--no-edit`，观察编辑器行为。
3. 思考：`git commit --amend` 和「`reset --soft HEAD~1` + 重新 commit」结果有什么细小差别？（提示：作者日期。amend 默认保留原作者日期，会更新 committer 日期。）
4. 实战：翻翻你自己项目的 `git log --oneline -5`，找一条想改的信息——如果它还没推送，现在就 amend 掉；推送过的话，写一条 `docs:` 或 `fix:` 的新提交修正认知。

## 下一步

- [git reflog](/git/260-GitReflog)：amend、reset、rebase 的万能后悔药，本文只用了它一成功力；
- [交互式 rebase](/git/280-InteractiveRebase)：改写更早的提交、合并多个提交；
- [git reset 三种重置模式](/git/300-GitReset)：理解 `--soft` 为什么是 amend 的孪生兄弟。
