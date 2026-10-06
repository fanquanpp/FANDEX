---
order: 210
title: git-log 取证实录：从「看历史」到「回答谁在什么时候改的什么」
module: 'git'
category: 工具链
difficulty: intermediate
description: 把 git log 从「浏览工具」升级为「取证显微镜」：先建立可达性遍历的心智模型解释 .. 与 ... 的区别，再按取证任务组织过滤手段——pickaxe（-S/-G）定位一段代码的引入与删除、-L 追踪某几行的完整变迁、--follow 穿越重命名、--author 与 author/committer 之别，附双点三点预测题与「定位 bug 引入提交」的完整推演。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'git/190-GitBlame'
  - 'git/360-GitBisect'
  - 'git/240-ObjectModel'
  - 'git/260-GitReflog'
prerequisites:
  - 'git/060-ThreeTrees'
  - 'git/100-GitBranchManagement'
---

## 前置知识

- 已完成[分支管理](/git/100-GitBranchManagement)与[三棵树](/git/060-ThreeTrees)：知道分支是指向提交的引用、提交之间存在父子关系；
- 读过[对象模型](/git/240-ObjectModel)更好：知道「提交 = 指向树的快照 + 父提交指针」，本文的可达性模型直接建在它上面。

## 学习目标

读完本文你将能够：

1. 用「可达性遍历」解释 `git log` 的输出顺序、`..` 与 `...` 的区别、以及 `--graph` 画的到底是什么；
2. 面对三个真实取证任务知道该掏哪把工具：「这段代码哪来的」（pickaxe）、「这几行的演变史」（`-L`）、「文件改名前的历史」（`--follow`）；
3. 解释 author 与 committer 的区别，避免 rebase/cherry-pick 之后用 `--author` 查漏了人；
4. 定制出顺手的 log 别名，并把「找 bug 引入提交」的完整链路（log 取证 + bisect 验证）跑通。

预计 45 到 60 分钟。

## 1. 你现在要解决什么问题

三个真实到不能再真实的取证任务：

1. 「测试说这个空指针是上周引入的，帮我查查是哪次提交改出来的」——你需要**按内容搜历史**，而不是按时间翻；
2. 「这个魔法数字 0.618 是谁、为什么写进去的」——你需要**按行追踪**；
3. 「feature 分支比 main 多了哪些提交？合并前再确认一遍」——你需要**按引用范围比较**。

`git log` 默认形态（按时间倒序列出提交）只能覆盖任务 3 的一半。这三个任务分别对应 log 的三组进阶能力：pickaxe、行级追踪、范围语法。本篇按「先建模型、再给工具」的顺序展开——模型不对，工具背得再多也用不对。

## 2. 心智模型：log 是一次可达性遍历

`git log` 做的事只有一件：**从你指定的起点（默认 HEAD）出发，沿着每个提交的 parent 指针向历史深处走，把能走到的提交都打出来**，按时间戳近的先显示。

这个模型一次解释三件事：

- **为什么 `git log` 只显示当前分支的历史**：因为遍历从 HEAD 所指的提交出发，别的分支的提交走不到；
- **为什么 `--all` 能显示全部分支**：它把所有分支引用都当作遍历起点；
- **`..` 与 `...` 的区别**——这是最值得用模型推演的一个：

```text
提交图：A──B──C（main）
              └──D──E（feature）

main..feature    = feature 可达、main 不可达的提交 = D, E
                   （遍历 feature，路过 main 时止步）
feature..main    = main 可达、feature 不可达 = C
main...feature   = 对称差 = C, D, E（两边各自独有的并集）
```

`--left-right main...feature` 会给每个提交标注 `<`（属于 main）或 `>`（属于 feature）。合并前看「feature 引入了什么」用双点；想看「两边分叉了多远」用三点。

`--graph` 画的则是**遍历时遇到的分叉与汇合**：merge 提交有两个 parent，图上就是两条线汇成一条。分支拓扑复杂时，`--graph --all --oneline --decorate` 是理解仓库现状的第一眼。

## 3. 取证工具一：pickaxe——按内容搜历史

任务一「哪次提交改出来的」，要搜的是**提交之间的 diff 内容**，pickaxe（镐子）就是干这个的：

```bash
git log -S "0.618"                # 找"0.618 出现次数发生变化"的提交
git log -G "def compress\("       # 找 diff 中匹配该正则的提交
git log -S "TODO" --oneline       # 精简输出
```

- `-S`（字符串）：统计该字符串在文件中的出现次数，次数**发生变化**的提交入选——所以一次「引入」和一次「删除」都会被抓到，输出成对出现；
- `-G`（正则）：diff 里**新增或删除的行**匹配正则的提交入选。

两者怎么选？找具体字符串（常量、函数名、配置项）用 `-S` 语义最准；要匹配模式（比如「所有以 `handle` 开头的调用」）只能用 `-G`。

组合路径限定，威力翻倍：

```bash
git log -S "0.618" -- src/config.py        # 只在某个文件的历史里找
git log -S "0.618" --oneline --since="2 months ago"
```

找到提交后，`git show <哈希>` 看完整改动、`git log --follow <file>` 看这个文件的前世今生，必要时直接丢给 [git bisect](/git/360-GitBisect) 做二分验证。

## 4. 取证工具二：行级追踪与重命名追踪

### 4.1 -L：某几行的时间轴

```bash
git log -L 10,20:src/utils.js     # 追踪 10-20 行的完整演变史
git log -L :parseDate:src/date.js # 追踪 parseDate 函数的演变史
```

`-L` 输出的是**每个相关提交 + 对应版本的文件片段**，一行一行串成时间轴。与下一行的 [git blame](/git/190-GitBlame) 互补：blame 回答「现在这行最后一次被谁改」，`-L` 回答「这几行从头到尾经历过什么」。

### 4.2 --follow：追着改名跑

```bash
git log --follow -- src/auth/login.js
```

文件被 `git mv` 或改名重构后，普通 `git log <file>` 在改名点就断了——Git 按路径索引历史，旧路径下没有新提交。`--follow` 让 Git 检测重命名并穿过去，把改名前的历史接上。注意它是 log 的选项，`blame` 也会自动做类似的改名检测。

### 4.3 按文件过滤的语法细节

```bash
git log -- src/                   # 路径过滤要放在 -- 之后（有歧义时必须）
git log --stat                    # 每个提交动了哪些文件、增删多少行
git log --name-status             # 只列文件名与操作类型（A/M/D/R）
git log -p -- package.json        # 只看某个文件的完整 diff
```

`--stat` 与 `-p` 的区别是「摘要」与「全文」：先 `--stat` 定位可疑提交，再 `git show` 看细节，比一上来 `-p` 翻几百屏高效得多。

## 5. 取证工具三：按人、按时间过滤——author 与 committer 之别

每个提交记录着两个身份：

| 字段 | 含义 | 何时被改 |
| --- | --- | --- |
| author 作者 | 写出这段代码的人 | commit 时定下，之后**不变** |
| committer 提交者 | 把提交放进历史的人 | rebase、cherry-pick、amend 时会**变成执行操作的人** |

后果：同事 rebase 完推上来的提交，committer 全是他本人，author 不变。于是：

```bash
git log --author="zhang"          # 按 author 过滤：能找到张三写的全部提交（含被 rebase 过的）
git log --committer="zhang"       # 按 committer 过滤：只显示张三亲手放进历史的
git log --format="%h %an %cn %s"  # 两个身份并排看，一秒钟理解上面两行
```

审计场景想问「谁写的」用 author；想问「谁在什么时候操作的」用 committer。混用是查漏人的最常见原因。时间同理：`%ad` / `--author-date` 是作者写作时间，`%cd` / `--committer-date` 是落库时间，rebase 后两者可能差出几周。

## 6. 输出定制与常用别名

```bash
git log --format="%h %ad %an %s" --date=short     # 短哈希 日期 作者 标题
git log --oneline --graph --all --decorate        # 仓库全景图
git log -5 --oneline                              # 最近五条
git log --merges --oneline                        # 只看合并提交（找合并点专用）
```

高频占位符速记：`%h/%H` 短/全哈希、`%an/%ae` 作者名/邮箱、`%ad/%ar` 作者日期绝对/相对、`%s/%b` 标题/正文、`%d` 引用装饰（如 `(HEAD -> main)`）、`%C(yellow)...%C(reset)` 上色。

把高频组合固化成别名（写入 `~/.gitconfig`）：

```ini
[alias]
    lg  = log --oneline --graph --decorate
    lga = log --oneline --graph --all --decorate
    ll  = log --stat -5
    lp  = log -p -3
    who = shortlog -sn            # 按提交数排的贡献榜
```

`who` 用的 `shortlog` 值得一提：它按 author 分组统计，是「这个模块主要谁在维护」类问题的秒答工具。

## 7. 取证实战：定位 bug 引入提交的完整链路

把工具串成一条链。症状：搜索结果排序从上周开始变得奇怪。

```bash
# 第一步：锁定范围——排序相关代码的历史
git log --oneline --since="3 weeks ago" -- src/search/sort.ts

# 第二步：按内容搜——排序算法的关键字
git log -G "score\b" --oneline -- src/search/sort.ts
# 输出：a1b2c3d feat: support multi-field sorting

# 第三步：验证嫌疑
git show a1b2c3d -- src/search/sort.ts     # 看 diff，确认改了排序逻辑

# 第四步：坐实——用 bisect 二分验证（输入 bad 提交与已知好提交）
git bisect start HEAD a1b2c3d~1            # 从引入提交的前一个开始二分
# ... bisect 自动检出中间提交，逐个测试后
git bisect reset
```

log 负责「提出嫌疑名单」，bisect 负责「逐个排除坐实」，两者配合是定位回归 bug 的标准动作。如果嫌疑提交里夹着重命名或格式化提交，别忘了 `--follow` 与下一节 author/committer 的坑。

## 8. 常见坑与调试实录

- **`--author` 查漏人**：rebase/cherry-pick 只改 committer 不改 author，按 committer 过滤会漏掉被重放过历史的真实作者。先想清楚问的是「谁写的」还是「谁提交的」（5 节）。
- **双点三点用反**：`main..feature` 是「feature 独有」，方向反了结论全反。口诀：`A..B` 读作「B 有 A 没有」。
- **路径过滤漏了 `--`**：`git log src/` 在分支名与路径同名时会歧义报错，`git log -- src/` 永远安全。
- **`--grep` 多个条件默认是「或」**：想「同时包含」要加 `--all-match`。同理 `--author` 与 `--grep` 之间默认也是「或」，要「且」加 `--all-match`。
- **`-S` 结果成对出现看不懂**：一次引入 + 一次删除各是一条提交，这是设计行为不是重复输出；加 `--oneline` 看标题即知各自意图。
- **重命名后历史「断头」**：忘了 `--follow`。凡是按文件查历史，先问一句「这文件改过名吗」。
- **log 只显示当前分支**：想看全仓库用 `--all`；想看「某个提交到底在不在别的分支」用 `git branch --contains <哈希>`。

## 9. 小练习

预测题（5 分钟，先写答案再运行）：仓库提交图如下，写出下列命令各输出哪些提交（用字母）：

```text
A──B──C（main）
      └──D──E（feature）
```

1. `git log --oneline main..feature`
2. `git log --oneline feature..main`
3. `git log --oneline --left-right main...feature`

提示：用可达性定义逐个推，别背口诀。答案：1）D E；2）C；3）`<C`、`>D`、`>E`（顺序按时间，箭头标注归属）。

修改题（15 分钟）：给 1 号取证任务（「这段代码哪来的」）配一个专用别名 `lf`，要求：输入文件路径即可看到该文件的图形化历史且能穿越重命名。验收：`git lf src/utils.js` 输出带 graph 的单行历史。

提示（思路方向）：别名可以带参数占位符。展开（关键 API）：`--follow`、`--oneline --graph`。参考实现：

```ini
[alias]
    lf = log --oneline --graph --decorate --follow
```

修 Bug 题（15 分钟）：同事执行 `git log --author="zhang" --since="2026-08-01"` 统计张三八月的工作量，结果明显偏少。给出两个最可能的原因与对应的验证命令。

提示：想 5 节的 author/committer 之别，以及工作量的载体是什么。答案：原因一，张三的提交被别人（或自己）rebase 重放过，committer 变了但 author 没变时此命令不受影响，**反之如果团队流程是 squash merge，落库提交的 author 变成了合并执行者，张三的原始 author 记录只存在于 PR 的本地历史**——用 `git log --author="zhang" --all` 对照远程全部分支验证；原因二，提交都在其他分支未合入 main，当前分支不可达，用 `git log --author="zhang" --all --oneline` 即可看到全部。总结：统计工作量用 `shortlog -sn --all` 加分支范围限定。

挑战题（45 分钟，脱离示例）：用 pickaxe + `-L` 复盘一次「函数行为变更」：找一个你项目的函数，先 `git log -L :<函数名>:<文件>` 看完整演变史，再回答三个问题——这函数最老的形态长什么样、中间哪次提交改变了返回值语义、现在的签名是谁引入的。验收：写一段 100 字以内的演变小结，并标注每一步用的命令。

提示（思路方向）：`-L :函数名:文件` 需要函数名唯一可定位，先 `grep -n` 确认；演变史的每个节点用 `git show <哈希>` 展开看 diff；引入人看 author，落库人看 committer，注意区分。

## 10. 与之前和之后的知识的关系

- 往前：可达性模型直接建在[对象模型](/git/240-ObjectModel)的「提交 = 父指针 + 快照」之上；范围语法是[分支管理](/git/100-GitBranchManagement)里「分支即引用」的直接应用；
- 往后：单行级的「谁改的」交给 [git blame](/git/190-GitBlame)；「逐个提交验证行为」的 bisect 在[git bisect 二分定位](/git/360-GitBisect)展开；reflog 提供的是「连可达性都丢了的提交」的最后一层兜底，见[git reflog](/git/260-GitReflog)。

## 11. 官方文档

- git-log 全量选项：https://git-scm.com/docs/git-log
- 历史查看指南（修订范围语法）：https://git-scm.com/book/zh/v2/Git-%E5%B7%A5%E5%85%B7-%E4%BF%AE%E8%AE%A2%E9%80%89%E6%8B%A9
- diff 搜索（pickaxe）：https://git-scm.com/docs/git-diff#Documentation/git-diff.txt--Sltstringgt

## 自我检查

- 能用「可达性遍历」解释 log 的默认行为、`--all`、双点与三点语法，而不靠背口诀；
- 能为「这段代码哪来的」「这几行怎么演变的」「文件改名前的历史」三个任务分别选出 pickaxe、`-L`、`--follow` 并说出适用差别；
- 能说出 author 与 committer 的区别，并解释为什么按 committer 统计作者会查漏；
- 能跑通「log 提出嫌疑 → show 验证 → bisect 坐实」的定位链路；
- 手上有一套自己维护的 log 别名。

## 本章总结

git log 的本体是一次从引用出发沿 parent 指针的可达性遍历——所有过滤都是在裁剪这次遍历的起点与路径。取证三件套按任务选型：按内容搜历史用 pickaxe（`-S` 找字符串、`-G` 找正则 diff），按行看演变用 `git log -L`，按文件追重命名用 `--follow`。范围语法 `A..B` 是「B 有 A 没有」，三点加 `--left-right` 看两边分叉。author 是「谁写的」、committer 是「谁放进历史的」，rebase 与 squash merge 都会让两者分家，统计与审计时必须分清。log 提出嫌疑、show 展开证据、bisect 坐实引入点——这条链路是回归 bug 定位的标准动作。
