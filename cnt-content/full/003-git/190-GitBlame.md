---
order: 190
title: git-blame 追问每一行：它给你答案，也经常对你说谎
module: 'git'
category: 工具链
difficulty: intermediate
description: 以「这行代码为什么要这么写」引入 blame 的提问模型——对文件的每一行问「你最后一次被有意义地改动是哪次提交」；重点讲它说谎的三种方式（格式化提交、rebase 重放、移动的代码块）与对策（-w、-C/-M、--ignore-rev 与 .git-blame-ignore-revs 文件），并给出 blame、log -L、git show 组成的一套完整考古流程，附生成忽略文件与排查「全员背锅」的动手任务。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'git/180-GitLogDetailed'
  - 'git/280-InteractiveRebase'
  - 'git/230-CodeReviewBestPractice'
prerequisites:
  - 'git/100-GitBranchManagement'
---

## 前置知识

- 会用 `git log` 与 `git show` 的基本形态（见[git-log 取证实录](/git/180-GitLogDetailed)）；
- 知道提交哈希与提交信息怎么读即可。

## 学习目标

读完本文你将能够：

1. 准确说出 blame 回答的问题与它**不**回答的问题（「最后改动者」不等于「逻辑作者」）；
2. 用 `-L` 把 blame 限定到行区间，用 `-w` / `-C` / `-M` 穿透空白与搬移的干扰；
3. 解释 blame 为什么经常「指错人」：一次 prettier 格式化提交就能把整个文件的历史「据为己有」；
4. 在仓库里落地 `--ignore-rev` 与 `.git-blame-ignore-revs` 机制，让团队 blame 不再被格式化提交污染；
5. 跑通一套完整的代码考古流程：blame 定位提交、show 看现场、log -L 看演变。

预计 30 到 45 分钟。

## 1. 你现在要解决什么问题

读同事代码，撞到一行：

```javascript
const maxRetry = 3 + Math.floor(delay / 500);   // 为什么是 3？为什么要加 delay 的比例？
```

注释没写、测试没覆盖意图。你直接去问当事人，他说「上周写的，忘了」。这时唯一靠谱的证据来源是仓库本身：**这一行最后一次被谁、在哪次提交里改的？那次提交的信息与上下文能说明当初的意图吗？**

`git blame` 就是回答这个问题的工具。但初学者对它有两个常见误解：一是把它当「追责器」，查出来是谁就去找谁麻烦——这让 blame 的使用味道很怪；二是它给出的名字经常不符合直觉：明明是张三写的逻辑，blame 显示的却是李四。本篇讲清楚它回答什么、什么时候说谎、说谎了怎么办。

## 2. 心智模型：对每一行问同一个问题

blame 的工作方式：取**当前工作区**的文件内容，对每一行问——

> 「这行内容，最后一次在哪个提交里被改动？」

然后给每行打上「提交哈希 + 作者 + 日期」的标签：

```bash
git blame src/pay/retry.ts
# a1b2c3d (Zhang San 2026-03-01 42) export function calcRetry(delay) {
# e9f8e7c (Li Si     2026-07-15 43)   const maxRetry = 3 + Math.floor(delay / 500);
```

这个模型推出三条重要边界：

1. **blame 站在「现在」往回看**，它回答的是「现状的成因」，不是「历史的全貌」——后者是 `git log -L` 的事（见 180 篇）；
2. **「最后改动」不等于「逻辑作者」**：如果王五只是在张三的代码旁边补了个空格，这一行的 blame 就归属王五。行级粒度 + 最后一次改动的定义，决定了 blame 天然容易被无关提交「抢走功劳」；
3. **blame 依赖行的精确匹配**：行的任何字节变化（包括缩进、行尾空白）都算「改动」。

第 2、3 条正是「说谎」的根源，下一节展开。

## 3. 基本用法：先学会只看该看的行

整个文件全量 blame 输出上百行，几乎没法读。日常姿势是**先定位行号、再看 blame**：

```bash
git blame -L 42,48 src/pay/retry.ts             # 只看 42-48 行
git blame -L '/maxRetry/,+3' src/pay/retry.ts   # 从匹配 maxRetry 的行开始往下 3 行

git blame -e -L 42,48 src/pay/retry.ts          # 显示邮箱而不是名字
git blame --date=short -L 42,48 src/pay/retry.ts  # 日期只显示年月日

git blame -w -L 42,48 src/pay/retry.ts          # 忽略纯空白改动再追
```

拿到可疑提交的哈希后，**立刻展开现场**：

```bash
git show <哈希> -- src/pay/retry.ts   # 这次提交完整改了什么
git log -1 <哈希>                     # 完整提交信息（正文里常写着 why）
```

提交信息正文（`%b`）才是意图的第一现场——好的提交信息会把「为什么改成 3」写在那里。blame 只是带你找到入口，考古靠的是 blame + show 的组合。

## 4. blame 为什么说谎：三种现场与对策

### 4.1 现场一：格式化提交洗劫全场

这是 blame 失真的头号原因。某人跑了一次 prettier/eslint --fix，整个文件的缩进、引号、换行全部变化——**每一行都「被改动」了**，blame 全部指向他：

```text
a1b2c3d (zhang  2026-03-01) 42) const maxRetry = 3;      ← 实际是张三的旧逻辑
e9f8e7c (li     2026-07-15) 43) const maxRetry = 3 + Math.floor(delay / 500);
```

如果格式化和逻辑改动混在同一个提交里，blame 显示的「作者」可能是**只动了格式的那个人**，真正的逻辑作者被顶掉了。

对策分三层：

**个人层**——穿透无意义的改动再看：

```bash
git blame -w src/pay/retry.ts           # 忽略空白
git blame -M src/pay/retry.ts           # 识别文件内部搬移的行（拷贝检测）
git blame -C src/pay/retry.ts           # 识别跨文件搬移的行
```

`-C` 在重构（代码从一个文件搬到另一个文件）场景特别有用：搬到新文件后 blame 会告诉你这段代码原来出自哪个提交。

**仓库层**——让整个团队永远忽略格式化提交。Git 2.23 起支持忽略指定修订：

```bash
# 1. 找出那次格式化提交的哈希，写进仓库根目录的 .git-blame-ignore-revs
echo "# prettier 全量格式化" >> .git-blame-ignore-revs
git rev-parse HEAD >> .git-blame-ignore-revs     # 换成格式化提交的真实哈希
git add .git-blame-ignore-revs && git commit -m "chore: ignore format commit in blame"

# 2. 团队成员配置一次（或写进仓库 config 自动生效）
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

配置后，本地的 blame 与 GitHub / GitLab 的行级标注都会跳过名单里的提交，直接把功劳记给上一次「有意义」的改动。

**规范层**——从源头预防：格式化永远单独提交、不与逻辑改动混合。这是成本最低的治本方案，属于团队协作规范的一部分（见[Code Review 最佳实践](/git/230-CodeReviewBestPractice)）。

### 4.2 现场二：rebase 重放改写身份

提交经 rebase / cherry-pick 重放后，committer 变成执行重放的人，author 不变——blame 显示的 author 通常仍是原作者，这一点 blame 比 log 友好；但如果是 squash merge 落库，author 会变成合并执行者，blame 就真的「指错人」了。判别方法：

```bash
git log --format="%h %an %cn %s" -1 <哈希>
# author 与 committer 不一致 → 这个提交被重放过，真正的历史要看 PR 或原始分支
```

这与 180 篇讲的 author/committer 之别是同一件事在 blame 场景的投影。

### 4.3 现场三：答案不在最后一次改动里

blame 给你「最后改动」，但很多问题的答案在**更早的某个提交**里——一行代码可能被三个人先后修改过。最后改动者往往只知其然。此时升级工具：

```bash
git log -L 42,48:src/pay/retry.ts   # 这几行的完整演变史，每个节点带 diff
```

`-L` 输出每个历史节点的提交与对应片段，顺着看就能找到「3 这个数字最初是谁、为什么写进去的」。blame 找入口，`-L` 看全程，两者是同一条时间轴的两种切片。

## 5. 完整考古流程

把上面的工具串成固定流程，遇到「这行为什么这样写」时照着走：

```bash
# 1) 定位：这行最后一次被谁改的
git blame -w -L 42,48 src/pay/retry.ts

# 2) 展开现场：那次提交的完整 diff 与提交信息正文
git show <哈希>

# 3) 溯源：这几行的完整演变史（最后一次不是答案时）
git log -L 42,48:src/pay/retry.ts

# 4) 旁证：同一时期这个文件还有什么变动（判断改动的语境）
git log --oneline -20 -- src/pay/retry.ts

# 5) 定性：author 与 committer 是否一致（判断是否被重放过）
git log --format="%h %an %cn %s" -1 <哈希>
```

五个动作的成本加起来不到两分钟，产出的结论却比「猜」和「问」可靠一个量级。

## 6. 常见坑与调试实录

- **把 blame 当追责器**：blame 显示的可能是格式化提交的执行者。先看提交哈希对应的提交信息再下结论；团队层面直接上 `.git-blame-ignore-revs`。
- **全文件 blame 刷屏**：永远 `-L` 限定行区间；配合 IDE 的行内 blame（VS Code GitLens 等）日常零成本。
- **重构后 blame 全指向重构者**：用 `-C` 让 Git 检测跨文件搬移，追到搬移前的原始提交。
- **squash merge 之后 blame 认不出作者**：这是合并策略的代价，无法用 blame 参数修复；规范上重要分支禁用 squash、或在 squash 提交信息里保留原作者信息（`Co-authored-by`）。
- **大文件 blame 很慢**：blame 需要逐提交回溯行状态，十万行级别的历史文件会明显耗时；先用 `-L` 限定范围，或接受首次慢、依赖 IDE 缓存。
- **误把「行还在」当「逻辑没变」**：行的字节匹配极敏感，缩进调整就算改动。看到 blame 归属意外，先怀疑格式化而不是人的行为。

## 7. 小练习

预测题（5 分钟，先写答案再运行）：在任意仓库的任意文件上执行 `git blame -w -L 1,5 <file>` 与不带 `-w` 的版本，猜测两者输出可能有什么差异，并构造一个最小样例验证（先把第 3 行行尾加两个空格并提交）。

提示：行尾空白算不算「改动」？答案：不带 `-w` 的版本第 3 行归属那个加空格的提交；带 `-w` 的版本穿透它，归属上一次实质性改动。这正是格式化提交洗劫 blame 的微观版本。

修改题（20 分钟）：给你的仓库落地 blame 忽略机制。验收：找到一个历史上的格式化/机械性提交（全文件 diff 但无逻辑变化），写进 `.git-blame-ignore-revs` 并配置 `blame.ignoreRevsFile`，对比配置前后该文件 blame 输出的差异。

提示（思路方向）：怎么找到「机械性提交」？看提交信息含 format/lint/style 的、或 `git log --stat` 里「改动行数极大但文件数极少」的可疑提交。展开（关键 API）：`git rev-parse`、`git config blame.ignoreRevsFile`。参考实现：

```bash
# 找嫌疑提交
git log --oneline --grep="format" --grep="prettier" -i

# 确认它确实没有逻辑变化（diff 全是空白/引号类调整）
git show <哈希> --stat
git show <哈希> -w --stat        # -w 后 stat 归零或大幅缩小 → 纯格式化

# 写入忽略名单并启用
printf '# format-only commits\n%s\n' <哈希> > .git-blame-ignore-revs
git config blame.ignoreRevsFile .git-blame-ignore-revs
git add .git-blame-ignore-revs && git commit -m "chore: ignore format commit in blame"
```

修 Bug 题（15 分钟）：同事说「blame 显示支付重试上限是李四 7 月 15 日改的，但那次改动看起来夹了很多无关调整」。给出完整的甄别命令序列，判断这次改动的真实作者与提交语境。

提示：先看这次提交的完整 diff 与信息正文；再看同文件同期的提交队列。答案：

```bash
git show e9f8e7c                          # 完整 diff + 提交信息：能看出提交里除了这行还改了什么
git log --format="%h %an %cn %s" -5 -- src/pay/retry.ts   # 同文件提交队列：是否混入格式化提交
git log -L '/maxRetry/,+1:src/pay/retry.ts'               # 这行的演变史：这个值最早出现在哪
```

甄别标准：若 e9f8e7c 的 diff 里这行是**实质性**改动且 author == committer，那么 blame 没说谎；若 diff 里夹着大量无关格式调整，真实归属要用 `-w` 重跑 blame 或追更早的历史。

挑战题（40 分钟，脱离示例）：为你的团队写一份「blame 不说谎三公约」：格式化提交的命名规范、`.git-blame-ignore-revs` 的维护责任、重要提交信息正文必须回答 why。验收：写进团队文档不超过 200 字，并附一条 CI 检查思路（如：提交信息含 format 关键词时 diff 的 `-w` 版本必须为空）。

提示（思路方向）：CI 侧可用 `git show <提交> -w --numstat` 与原 numstat 对比，差值过大说明夹带了逻辑改动。展开（关键 API）：`git show -w`、`--numstat`、pre-receive 钩子或流水线脚本均可实现。

## 8. 与之前和之后的知识的关系

- 往前：blame 是 [git-log 取证实录](/git/180-GitLogDetailed)的行级切片，author/committer 之别在那里已铺垫；
- 往后：rebase 与 squash merge 造成的历史重写，机制见[交互式 rebase](/git/280-InteractiveRebase)；把「提交信息写清楚 why」变成团队纪律，见[Code Review 最佳实践](/git/230-CodeReviewBestPractice)。

## 9. 官方文档

- git-blame 全量选项：https://git-scm.com/docs/git-blame
- 忽略修订与 .git-blame-ignore-revs：https://git-scm.com/docs/git-config#Documentation/git-config.txt-blameignoreRevsFile
- GitHub blame 视图说明：https://docs.github.com/en/repositories/working-with-files/using-files/viewing-a-file

## 自我检查

- 能说出 blame 回答的问题（每行最后一次有意义改动）与它的三条边界（站在现在往回看、最后改动者不等于逻辑作者、字节级敏感）；
- 能用 `-L`、`-w`、`-C`、`-M` 分别应对行区间、空白干扰、跨文件搬移三类场景；
- 能解释格式化提交为什么会让 blame 全线失真，并在仓库层用 `.git-blame-ignore-revs` 治理；
- 能跑通五步考古流程，并判断一个提交是否被 rebase/squash 重放过；
- 知道 blame 的正确用法是「定位提交 + 展开现场」，而不是给人贴标签。

## 本章总结

git blame 对文件的每一行回答「你最后一次被有意义地改动是哪次提交」，是代码考古的入口而非终点。它天然容易被三种现场欺骗：格式化提交抢走整文件历史、rebase/squash 重写身份、以及「答案不在最后一次改动里」——分别用 `-w`/`-C`/`-M`、author/committer 对照、`git log -L` 全程追踪来破解。团队层面的治本是三件事：格式化单独提交、`.git-blame-ignore-revs` 忽略名单、提交信息正文写清 why。blame 定位提交、show 展开证据、log -L 看演变——两分钟的固定流程，换来的结论比猜测可靠得多。
