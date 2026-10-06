---
order: 120
title: 提交信息规范
module: 'git'
category: 工具链
difficulty: beginner
description: Conventional Commits、原子提交与提交粒度——让历史可读、可检索、可自动化
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：提交信息规范与提交卫生（commit message standards）——「提交」这一操作的信息质量维度。提交怎么改内容（amend/rebase）是 090 与 270/280 篇的主题；本篇只讲「提交应该长什么样、多大一坨」。
- **解决什么问题**：三个月后排查线上事故，`git log` 里满屏 `update`、`fix bug`、`123`，谁也说不清哪个提交动了支付逻辑。规范化的提交信息让历史可读、可检索，更是 changelog 自动生成、commitlint 校验、语义化发版这些自动化的输入。
- **什么时候用到**：写每一次提交时；接入 commit-msg 钩子或 CI 校验（钩子机制见 340-GitHooks）；配置 release 工具按提交生成版本号；整理 WIP 提交准备发 PR（交互式 rebase 操作见 280 篇）。

## 1. Conventional Commits 格式

本仓库 CONTRIBUTING 采用的正是这套约定。格式：

```text
<type>(<scope>): <subject>

<body>

<footer>
```

一行实例：

```text
feat(auth): 支持短信验证码登录

新增 verifyCode 字段与倒计时组件，复用现有 otp 接口。
涉及表单校验逻辑调整。

Closes #428
```

各段职责：

| 段落     | 规则                                             | 作用                         |
| -------- | ------------------------------------------------ | ---------------------------- |
| type     | feat / fix / docs / style / refactor / test / chore / perf / ci / build | 机器可读的变更类别 |
| scope    | 可选，括号内写模块名                             | 定位影响面                   |
| subject  | 祈使句、不加句号、首行 50-72 字符内              | `git log --oneline` 里能读完 |
| body     | 可选，说明 why 与取舍                            | 三个月后唯一能救你的信息     |
| footer   | `Closes #123`、`BREAKING CHANGE: ...`            | 关联工单、标记破坏性变更     |

**type 为什么是这些词**：它们是约定俗成的机器词汇——`feat` 对应 minor 版本号、`fix` 对应 patch、`BREAKING CHANGE` footer 对应 major，semantic-release 类工具直接按此计算下一个版本号。换成自造词（`added xxx`）自动化链路全部失效。

### subject 的写法细节

- 用祈使句：`add` 而非 `added`/`adds`——补全成句恰好是「if applied, this commit will add xxx」；
- 首字母不大写、结尾不加句号（英文惯例；中文 subject 不受影响，但同样不加句号）；
- 行宽：subject 50 字符左右、硬上限 72（git log、GitHub UI 的排版都按这个宽度设计，超出会折行）。

## 2. 原子提交：一个提交只做一件事

规范格式解决「怎么写」，原子性解决「提交多大」。原子提交的定义：**每个提交自身可构建、可测试、可回滚，且只承载一个逻辑变更**。

**反例**：一次提交里同时出现「修复登录超时 bug + 升级三个依赖 + 顺手改了 20 个文件格式」。三个月后要 revert 那个 bug 修复——做不到，它和依赖升级缠在一起，回滚就得整体回滚。

**判断标准**：`git revert <hash>` 后代码依然健康，这个提交才配得上「原子」二字。格式化、重构、功能三类变更混在一起是原子性的头号杀手，对策是把 `git add -p`（按块暂存）当作日常习惯，把「styles: format」类提交单独拆出来。

**为什么这样要求**：bisect（360 篇）按提交二分定位 bug，前提是每个提交都是可运行状态——混入「改了一半」的提交会让二分结果指向无关的中间态。

## 3. 提交粒度与 WIP 的整理时机

粒度没有数字标准，按「逻辑完整性」判断：一个功能拆成「数据层接口 + UI 组件 + 集成」三个提交是恰当的；把三个提交合成一个巨型提交则丢掉了 review 与 revert 的粒度。

开发中随手 `git commit -m "wip"` 完全正常——提交是存档点不是出版品。整理时机是**开 PR 之前**：

```bash
# 交互式 rebase 把 WIP 压平、改写信息（详细操作见 280 篇）
git rebase -i HEAD~5
```

在编辑器里把 `pick` 改 `squash`/`fixup` 合并碎提交、`reword` 重写信息。**易错点**：已推送并被人拉取的提交不要 rebase 改写；WIP 压平前先打个 tag 或记下 reflog 位置，改坏了还能回来。

## 4. 提交信息与钩子的呼应

340-GitHooks 篇的 commit-msg 钩子用正则 `^(feat|fix|docs|style|refactor|test|chore): .+` 拦截不合规范的提交。工程上通常用 commitlint 栈：

```bash
npm install --save-dev @commitlint/config-conventional @commitlint/cli
echo "extends: ['@commitlint/config-conventional']" > commitlint.config.mjs
npx husky add .husky/commit-msg "npx commitlint --edit \$1"
```

`commitlint --edit $1` 读 Git 传入的信息文件（`$1`）逐条规则校验，违规即非零退出拦截提交。**为什么校验放钩子而不是靠 review**：格式错误零成本机器判定，人只该看语义——把机器能管的事交出去， reviewer 才有时间看 body 里写的理由。

changelog 自动生成是同一约定的下游收益：工具扫 `git log`，按 type 分组（feat 进 Features、fix 进 Bug Fixes），footer 里的 issue 号自动转链接——前提是历史提交全都规范。一个 `update` 就在 changelog 里留下一个黑洞。

## 5. 不同场景下的例子

**例一：回溯上线事故（真实工程场景）**。某次支付回调失败，值班工程师在 `git log --oneline --since="2026-03-01" --until="2026-03-02" -- app/payment/` 里翻到 `fix(payment): 超时后未释放分布式锁`——type、scope、路径三重过滤两分钟锁定嫌疑提交，`git show` 看改动确认根因。若当时的提交叫 `bug fix`，这场排查只能靠记忆和 blame 逐文件考古。

**例二：changelog 自动生成**。开源库维护者全部按 Conventional Commits 提交，发布时跑 `npx conventional-changelog -p angular`，工具按 feat/fix 分组生成 `CHANGELOG.md`，BREAKING CHANGE footer 自动标进 major 区块——发版文档从半天手写变成十秒钟生成加人工润色。

**例三：PR review 的粒度红利**。同一功能的两个 PR：A 是 1 个提交改 87 个文件；B 是 6 个提交，分别为「接口定义」「实现」「单测」「文档」「格式化」「依赖升级」。reviewer 逐提交读 B 的历史，先看接口定义再看实现，30 分钟给出意见；A 只能整体扫一遍，靠工单描述补上下文。

**例四：错误提交的现场补救**。手滑把调试日志提交进 main：尚未推送时 `git commit --amend` 直接改；已推送自己分支则 rebase 改写后 force-push；已进共享 main 则 `git revert` 生成反向提交而不是改写历史（选择逻辑详见 310/320 篇）。

## 动手实践

**练习 1**：在本仓库（或任一仓库）跑 `git log --oneline -30`，按 Conventional Commits 给每条打分：type 是否合规、subject 是否在一行内说清「做了什么」、能否不看 diff 判断影响面。找出 3 条最差的信息并写出改进版本。

**提示**：`git log --format="%h %s" -30` 输出更干净；改进版要具体到模块与行为，而不是把「update」写成「update code」。

**练习 2**：人为制造一个混合提交（格式化 + 一个小功能），用 `git add -p` 把它拆成两个原子提交，然后 `git log --stat` 验证拆分结果。

**提示**：`git add -p` 里 `y` 收下当前块、`n` 跳过、`s` 把当前块再切细；拆完先 `git diff --cached` 确认暂存内容符合预期。

**练习 3**：给测试仓库装 commitlint + husky，分别用合规与不合规的信息提交，验证拦截效果；再把 `type-enum` 规则改成只允许 `feat|fix|chore`，测试 `docs:` 会被拒。

<details>
<summary>参考实现（先自己动手，再看这里）</summary>

```bash
# 练习 2：拆分混合提交
# 假设工作区已有未提交的格式化改动与新功能
git stash                      # 先存起来，避免干扰
git stash pop                  # 取回
git add -p                     # 只收下功能相关块
git commit -m "feat(search): 支持按标签过滤结果"
git add -A
git commit -m "style: run prettier on src/"

# 练习 3
npm install --save-dev husky @commitlint/cli @commitlint/config-conventional
npx husky init
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
cat > commitlint.config.mjs << 'EOF'
export default { extends: ['@commitlint/config-conventional'] };
EOF
git commit -m "feat: add filter"     # 通过
git commit -m "随便写的"             # 被 commitlint 拦截，退出码非零
# 收紧规则
cat > commitlint.config.mjs << 'EOF'
export default {
  extends: ['@commitlint/config-conventional'],
  rules: { 'type-enum': [2, 'always', ['feat', 'fix', 'chore']] },
};
EOF
git commit -m "docs: readme"        # 被拦截：type 不在白名单
```

</details>

## 参考与致谢

- Conventional Commits 1.0.0：<https://www.conventionalcommits.org/zh-hans/v1.0.0/>（CC-BY 4.0）
- commitlint 官方文档：<https://commitlint.js.org/>（MIT）
- 「How to Write a Git Commit Message」 by Chris Beams（祈使句与七条规则的思想来源，参考后重写）：<https://cbea.ms/git-commit/>
- 本文 commit-msg 正则钩子示例整理自本仓库原 340 篇既有内容与本仓库 CONTRIBUTING 约定（仓库内部素材）。
