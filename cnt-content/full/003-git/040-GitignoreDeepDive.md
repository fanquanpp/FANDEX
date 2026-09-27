---
order: 40
title: 忽略规则：.gitignore 与「仓库的垃圾桶」
module: 'git'
category: 工具链
difficulty: beginner
description: 用逐条实验讲透 .gitignore：模式语法、只对未跟踪文件生效的第一大坑、check-ignore -v 排障、仓库级与全局忽略的分工，附真实规则失效现场与四类练习。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/030-GitEnvConfigInit'
  - 'git/050-GitBasicOperation'
  - 'git/070-GitDiffStagingOperation'
  - 'git/150-GitRemoteRepoOperation'
  - 'git/340-GitHookGitLFS'
prerequisites:
  - 'git/030-GitEnvConfigInit'
---

## 前置知识

- 已完成 [三级配置与仓库初始化](/git/030-GitEnvConfigInit)：会用 `git init` 建仓、会看 `git status`；
- 本文会用到 `git add` 与 `git commit`，它们的系统讲解在下一篇 [基础操作](/git/050-GitBasicOperation)。**此处先照抄即可**，命令含义不影响理解忽略规则本身。

## 学习目标

读完本文你将能够：

1. 读懂任何一份 .gitignore：说出每条模式命中的是谁、为什么不命中；
2. 解释并解决第一大坑——「规则写了却不生效」（文件已被跟踪）；
3. 用 `git status --ignored` 与 `check-ignore -v` 让 Git 自己告诉你命中了哪条规则；
4. 区分仓库级 .gitignore 与全局忽略的分工，给新项目写出第一份合格的忽略清单。

预计 40 到 60 分钟，全程动手。

## 1. 你现在要解决什么问题

三个即将发生（或已经发生）在你身上的事故：

1. `npm install` 之后，`node_modules` 里躺着两万个小文件。一次 `git add .`，你的仓库从此膨胀 200MB，队友拉取代码要下载这些他们自己装一遍的东西；
2. `.env` 里存着数据库密码，手一滑提交了。密码公开不说——**它永远留在历史里**，事后删除也无济于事；
3. 队友用 VS Code，你用 WebStorm，各人的编辑器配置文件在 `git status` 里刷屏。

三件事的共同根源：仓库里混进了「不该被版本控制的文件」。`.gitignore` 就是解决方案——一份放在仓库根目录的清单，告诉 Git「这些路径，装作不存在」。

## 2. 最小可运行实验

建一个干净的练习仓库，现场看看忽略规则的效果：

```bash
mkdir ignore-lab && cd ignore-lab
git init
echo "secret" > .env
echo "log data" > debug.log
mkdir -p logs
echo "server log" > logs/app.log
git status
```

预期输出：

```text
Untracked files:
  (use "git add <file>..." to include in what will be committed)
        .env
        debug.log
        logs/

nothing added to commit but untracked files present (add to stage)
```

三个垃圾都在候场。现在写第一份 .gitignore：

```bash
printf '.env\n*.log\nlogs/\n' > .gitignore
git status
```

预期输出：

```text
Untracked files:
  (use "git add <file>..." to include in what will be committed)
        .gitignore

nothing added to commit but untracked files present (add to stage)
```

垃圾从 `git status` 里消失了，只剩 .gitignore 自己等待提交。**.env、debug.log 和 logs/ 还在硬盘上**——忽略不是删除，只是「Git 不再谈论它们」。

## 3. 发生了什么：模式语法逐条验证

上面那份清单用了三种写法。Git 的匹配规则值得逐条动手验证（在 ignore-lab 里继续）：

| 写法 | 含义 | 验证方式 |
| --- | --- | --- |
| `.env` | 精确匹配仓库根下的这个文件 | `git check-ignore -v .env` |
| `*.log` | 星号匹配任意文件名的 .log（不跨目录） | 在子目录建 `logs/a.log` 试试——命中吗？ |
| `logs/` | 结尾带斜杠：忽略整个目录 | `git check-ignore -v logs/app.log` |
| `/build` | 开头带斜杠：只匹配仓库根下的 build，不匹配子目录里的同名物 | 根下建 `build/` 与 `src/build/` 对比 |
| `**/tmp` | 两个星号跨任意层级 | 任意深处建 tmp 都命中 |
| `!keep.log` | 取反：把已忽略的路径捞回来 | 见第 5 节的陷阱 |

`git check-ignore -v 路径` 是本文最重要的排障命令——它不改变任何东西，只回答「这个路径被哪份规则的哪一行命中了」：

```bash
git check-ignore -v logs/app.log
```

预期输出：

```text
.gitignore:3:logs/      logs/app.log
```

读法：`.gitignore` 第 3 行的 `logs/` 模式命中了 `logs/app.log`。以后任何「规则为什么不生效/为什么误伤」的问题，先跑它。

## 4. 调试实录：规则写了，为什么不生效

这是 .gitignore 的第一大坑，值得完整走一遍事故现场。昨天你提交了 `debug.log`，今天才想起来写规则：

```bash
git add debug.log
git commit -m "add debug log"        # 此处 add/commit 先照抄，050 篇讲透
printf '*.log\n' > .gitignore
git status
```

预期输出：

```text
On branch main
Changes not staged for commit:
  (use "git add ..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   .gitignore
        modified:   debug.log

no changes added to commit
```

怪事：`*.log` 已经写了，`debug.log` 的修改却仍然出现在「待提交」里。原因：**.gitignore 只对「未被跟踪」的文件生效**。debug.log 在第一次提交时已被 Git 正式收编，忽略规则对它形同虚设。

解法是让仓库「忘记」这个文件——从暂存区移除但保留硬盘上的实体：

```bash
git rm --cached debug.log            # 先照抄：--cached 表示只动索引不删文件
git commit -m "stop tracking debug log"
git status
```

预期输出：`debug.log` 从 status 消失（工作区文件还在），从此 `*.log` 对它生效。记住这个组合拳：**加规则 + `git rm --cached` + 提交**，这是给「已提交的垃圾」补办手续的标准流程。

## 5. 修改实验：取反规则的深水区

忽略整个目录再捞回一个文件，是新手最容易写错的场景。两组写法，先预测哪组能达到目的：

写法一：

```gitignore
logs/
!logs/keep.log
```

写法二：

```gitignore
logs/*
!logs/keep.log
```

动手验证：分别改写 .gitignore 后跑 `git check-ignore -v logs/keep.log`。结果：**写法一失败，写法二成功**。原因在官方文档的一句话：*It is not possible to re-include a file if a parent directory of that file is excluded*——`logs/` 把整个目录从 Git 的视野里剔除了，Git 根本不会走进去看到 keep.log，取反无从谈起；`logs/*` 忽略的是目录里的内容而非目录本身，Git 仍会扫描目录，取反才有机会生效。

第二个实验：规则冲突谁赢？在 .gitignore 末尾追加 `!debug.log`，跑 `git check-ignore -v debug.log`——**后面的规则覆盖前面的**（同文件多规则时，最后一匹配获胜）。这就是为什么复杂项目的 .gitignore 习惯把例外清单写在文件末尾。

## 6. 核心概念：仓库级与全局的分工

忽略体系其实有两层，职责不同：

- **仓库级 `.gitignore`**（放在仓库根，随仓库提交）：管「这个项目」的垃圾——`node_modules/`、`dist/`、`*.log`。团队每人都有，进版本控制；
- **全局忽略**（只在你机器上生效，不进仓库）：管「你个人」的杂物——编辑器配置（`.idea/`、`.vscode/`）、系统文件（`.DS_Store`、`Thumbs.db`）。一次性配置：

```bash
git config --global core.excludesFile ~/.gitignore-global
printf '.DS_Store\nThumbs.db\n.idea/\n' > ~/.gitignore-global
```

分工原则一句话：**与项目有关的进仓库级，与你的电脑有关的进全局**。把 `.idea/` 写进项目 .gitignore 的团队，通常是因为没人配全局——能跑就行，但全局方案更干净。

现成的真实范例就在本仓库：FANDEX 根目录的 .gitignore 按区块组织（密钥与签名材料、依赖目录、构建产物、系统杂物），并用注释写明设计原则——「敏感文件采用最严格策略，前置排除避免误提交」。写自己的第一份忽略清单前，值得打开它读一遍（仓库根的 `.gitignore`）。

## 7. 常见错误与调试实录

错误一：「我加了规则但它还在 status 里」——第 4 节的已跟踪问题，`git rm --cached` 三连解决。

错误二：「目录名拼错，规则静默无效」。写成 `log/` 而实际目录叫 `logs/`，Git 不报错也不忽略——路径匹配失败永远静默。排查动作固定为两步：`git status --ignored`（列出所有被忽略的文件，确认目标在不在）→ `git check-ignore -v 目标路径`（不在输出里 = 没有规则命中，检查拼写）。

错误三：「把 .gitignore 自己忽略了」。有人手滑在清单里写 `.gitignore`，从此清单改动 Git 视而不见，队友拿到的永远是你上一版的规则。`.gitignore` 必须进版本控制——它是给整个团队用的，不是你的私人设置。

错误四：指望忽略规则保护已提交的密钥。`.gitignore` 只防止「下一次」误提交；密钥已经进了历史的话，删文件没用，必须换密钥并清理历史（进阶操作见 `git filter-repo`，现在只需要记住结论：**先防住，比事后清理便宜一百倍**）。

## 8. 小练习

预测题（先写答案再验证）：.gitignore 内容为写法一 `logs/` + `!logs/keep.log` 时，`git status` 里能看到 keep.log 吗？换成写法二 `logs/*` + `!logs/keep.log` 呢？用 `git check-ignore -v` 逐组验证你的答案。

修改题：给第 2 节的 ignore-lab 增加需求——忽略所有 `.tmp` 文件、忽略根目录的 `scratch/` 但不忽略 `src/scratch/`、保留 `logs/` 下最新的 `app.log`。写出完整 .gitignore 并用 check-ignore 逐条自证。

修 Bug 题：同事抱怨「我明明写了 `node_modules/`，为什么它还是出现在 git status 里」，`git log --oneline` 显示 `node_modules/keep.js` 曾被提交。给出完整修复命令序列，并解释每一步在做什么。

挑战题（不看提示）：从零给一个将要上线的 Node 项目写 .gitignore，要求覆盖依赖目录、构建产物、环境变量文件、日志与编辑器杂物，每条规则后写一行注释说明理由。验收标准：随便往项目里扔一个 `secrets.env` 和 `debug.log`，`git status` 里都看不到它们，而 `git status --ignored` 能列出来。

## 9. 什么时候应该 / 不应该忽略

应该：依赖目录（node_modules、vendor）、构建产物（dist、build）、本地环境文件（.env）、日志与缓存、编辑器与系统杂物。

不应该：源代码与配置模板（`.env.example` 应该提交——队友要知道要配哪些变量）；「暂时不想提交但以后要」的代码（那是分支和 stash 的活，见 120 篇）；用忽略来隐藏大文件的体积问题（那是 Git LFS 的活，见 340 篇）。

## 10. 与之前和之后的知识的关系

- 往前：030 篇建好了仓库，本篇是「仓库出生后的第一件正事」——把垃圾挡在门外；`git rm --cached` 里出现的「暂存区」概念将在 070 篇正式展开；
- 往后：050 篇开始，`git add` 会尊重你的忽略清单；130 篇的合并冲突、340 篇的大文件方案都会回响本篇的规则；
- 更远：CI/CD 与开源协作里，「没忽略密钥」是真实世界最常见的仓库事故，本篇是它的全部防线。

## 11. 官方文档

- gitignore 官方手册（含全部模式规则与取反限制）：https://git-scm.com/docs/gitignore
- 社区模板库（按语言起步）：https://github.com/github/gitignore
- 本仓库活教材：仓库根 `.gitignore`

## 12. 自我检查

- 能不查资料写出包含目录、通配、取反三种写法的最小 .gitignore；
- 能解释「规则不生效」的原因并背出修复三连；
- 会用 `git status --ignored` 与 `check-ignore -v` 排障；
- 能说出仓库级与全局忽略的分工原则。

## 本章总结

.gitignore 是仓库的垃圾桶规划：只对未跟踪文件生效（已跟踪的用 `git rm --cached` 补办），`logs/` 剔除整个目录使取反失效（用 `logs/*` 才能捞回单个文件），多规则冲突时后面的赢。排障两件套 `git status --ignored` 与 `check-ignore -v` 让 Git 自己交代命中原因。清单进版本控制、个人杂物进全局——从下一个项目开始，第一笔提交之前先写它。

## 下一步

垃圾已挡在门外，进入 [基础操作](/git/050-GitBasicOperation)：正式学会 add、commit 与人生第一次提交。
