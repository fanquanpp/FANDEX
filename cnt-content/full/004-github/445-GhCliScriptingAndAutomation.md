---
order: 500
title: gh CLI 脚本化与自动化
module: 'github'
category: 工具链
difficulty: advanced
description: gh CLI 脚本化与自动化组合：--json + jq 的输出字段选择与模板、shell 脚本与 GitHub Actions 中的自动化模式（gh pr checks 判定、gh run watch、批量 Issue 治理）、token 最小权限与脚本安全习惯、常见脚本错误对策。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'github/440-GitHubCLI'
  - 'github/450-GhCliAuth'
  - 'github/530-GhApi'
  - 'github/370-GitHubActionsCICD'
prerequisites:
  - 'github/440-GitHubCLI'
  - 'github/450-GhCliAuth'
---

# gh CLI 脚本化与自动化

## 知识点地图

- **知识类别**：自动化工具链——把 gh 从「人敲的命令」升级为「脚本与流水线的构件」。gh 各命令族的用法在 [gh CLI 总览](/github/440-GitHubCLI) 与 450-560 各速查篇；本篇只讲「组合与自动化」这一件事。
- **解决什么问题**：gh 的人机模式（彩色表格、交互提示）与机读模式（`--json`、`--jq`、`--yes`）是两副面孔——不知道这回事的人写脚本会撞上「提示卡住」「解析彩色输出失败」「权限莫名被拒」三连。本篇给出脚本化 gh 的完整形态：结构化输出、非交互参数、CI 中的判定模式、批量治理模式，以及 token 最小权限的安全习惯。
- **什么时候用到**：
  - 写 shell 脚本批量操作（治理过期 Issue、统计 PR 健康度、批量打标签）；
  - 在 GitHub Actions 里用 gh 代替第三方 action（发布制品、创建 Release、回写 PR 评论）；
  - 建立自动化看板（最久未响应的 PR、卡住的 PR checks）；
  - CI 中做「检查不过就失败」的门禁判定。
- **学完能做什么**：用一条 jq 管道统计仓库 open PR 里最久未响应的；在 release workflow 里用 `gh release upload` 替代第三方 action；写出无人值守、权限最小化的 gh 脚本。

## 1. 机读模式：--json + --jq

gh 默认输出**给人看的文本**（表格、颜色、提示语），加 `--json` 则输出**给程序消费的结构化数据**：

```bash
# 输出 PR 的编号、标题、状态（JSON 数组）
gh pr list --json number,title,state

# 用 jq 提取特定字段（--jq 是 gh 内置的 jq 入口，不必单独装管道）
gh pr list --json number,title --jq '.[] | "\(.number) \(.title)"'

# 输出仓库信息
gh repo view owner/repo --json name,visibility,defaultBranchRef

# 脚本中跳过交互（--yes、--repo 显式指定）
gh issue close 12 --repo owner/repo --comment "已修复" --yes
```

三条使用要领：

- **字段名先查再写**：每个命令支持的字段不同，`gh pr list --json` 不带值会报错并列出全部可用字段——这是最好的字段手册，比文档还准；
- **`--jq` 参数是 gh 内置的 jq 解释器**：不依赖系统装没装 jq，CI 镜像里少一个依赖；复杂变换才考虑「`--json` 落盘 + 独立 jq 管道」；
- **脚本里一律加 `--repo OWNER/REPO`**：gh 默认从当前目录猜仓库，脚本在错误目录执行时会操作到错误的仓库——显式指定是脚本安全的第一道保险。

官方常见用法示例：`gh issue list --assignee "@me"` 列出分配给你的议题，`gh pr list --author alice` 列出某人的 PR（人机模式同样适用，只是没有结构化输出）。

### 1.1 实战：统计最久未响应的 open PR

```bash
# 一条管道：列出 open PR 的编号/标题/更新时间，按更新时间升序取前 10
gh pr list --repo owner/repo --json number,title,updatedAt \
  --jq 'sort_by(.updatedAt)[0:10] | .[] | "\(.updatedAt)  #\(.number)  \(.title)"'
```

读法：`sort_by(.updatedAt)` 升序排列（最旧在前—— updatedAt 越旧说明越久没人动）；`[0:10]` 截前 10 条；模板字符串拼成报表行。把它挂成 cron 每天发到团队频道，「最久未响应的 PR」就不再靠人肉翻页发现。

## 2. 脚本化模式：从命令到流水线

### 2.1 CI 中判定：gh pr checks

等待并判定某 PR 的所有 checks 是否通过，是门禁脚本的原子操作：

```bash
# 等待 PR 的全部 checks 完成并以退出码报告结果（0 = 全过）
gh pr checks 123 --repo owner/repo --watch

# 在脚本里：
if gh pr checks 123 --repo owner/repo --watch; then
  gh pr merge 123 --squash --repo owner/repo --yes
else
  echo "checks 未全过，跳过合并" >&2
  exit 1
fi
```

`--watch` 让命令阻塞到全部检查结束，退出码即结论——比「轮询 + grep 文本」干净得多。批量场景（合并所有绿的 PR）：

```bash
gh pr list --repo owner/repo --json number \
  --jq '.[].number' | while read -r n; do
    if gh pr checks "$n" --repo owner/repo 2>/dev/null; then
      gh pr merge "$n" --squash --auto --repo owner/repo --yes
    fi
  done
```

### 2.2 盯运行：gh run watch

```bash
# 提交后盯住最新一次 workflow run 直到结束
gh run watch $(gh run list --workflow=ci.yml --limit 1 --json databaseId --jq '.[0].databaseId')

# 失败时只看失败步骤的日志
gh run view 123456 --log-failed
```

`gh run list --json databaseId --jq ...` 拿到 run ID 再交给 `gh run watch`——「机读取值、人机执行」的典型两段式。

### 2.3 在 GitHub Actions 里用 gh

Actions 的 runner 自带 gh 与临时 `GITHUB_TOKEN`，很多场景一条 gh 命令就能替代一个第三方 action：

```yaml
# release workflow 节选：上传构建产物并创建 Release
- name: Create Release
  env:
    GH_TOKEN: ${{ github.token }}        # gh 读取 GH_TOKEN 环境变量即完成认证
  run: |
    gh release create "v${{ github.ref_name }}" \
      --repo "$GITHUB_REPOSITORY" \
      --title "v${{ github.ref_name }}" \
      --notes "Automated release from ${{ github.sha }}"
    gh release upload "v${{ github.ref_name }}" \
      --repo "$GITHUB_REPOSITORY" \
      dist/*.zip dist/*.sha256
```

四个要点：

- **认证走环境变量**：`GH_TOKEN`（或 `GITHUB_TOKEN`）一设，gh 在 CI 里免交互认证，不需要 `gh auth login`； Actions 里用内置的 `${{ github.token }}`（权限自动最小化到当前仓库）；
- **第三方 action 的取舍**：一个 `gh release upload` 就能省掉一个第三方 release action——第三方 action 是供应链攻击面（见 [Actions 复用与安全](/github/435-ActionsReuseAndSecurity)），能用 gh 一行命令做到的就别引依赖；
- **仍需要 `permissions:` 声明**：workflow 级或 job 级的 `permissions: contents: write` 是 Release 创建的前提，token 再小权限不够也办不成事；
- **`--repo "$GITHUB_REPOSITORY"`**：保持第 1 节的纪律，脚本永远显式指定仓库。

## 3. 批量治理：Issue 治理示例

把「过期无活动 Issue 打上 stale 标签」这类治理写成脚本：

```bash
#!/usr/bin/env bash
# stale-issues.sh：给 90 天无活动的 open Issue 打 stale 标签
set -euo pipefail

REPO="owner/repo"
CUTOFF=$(date -d "90 days ago" +%Y-%m-%dT%H:%M:%SZ)

gh issue list --repo "$REPO" --state open --json number,updatedAt \
  --jq --arg cutoff "$CUTOFF" \
  '.[] | select(.updatedAt < $cutoff) | .number' |
while read -r n; do
  gh issue edit "$n" --repo "$REPO" --add-label "stale"
  gh issue comment "$n" --repo "$REPO" \
    --body "该 Issue 已 90 天无活动，标记为 stale；两周后无跟进将自动关闭。"
  echo "stale: #$n"
done
```

拆解四个细节：

- **`set -euo pipefail`**：任一步失败立即停——批量写操作必须 fail-fast，半途而废的批量治理比不治理更混乱；
- **日期比较交给 jq**：`--arg cutoff` 把日期传进 jq 的 `select(.updatedAt < $cutoff)`，比 shell 字符串比较可靠（ISO 8601 字符串恰好可字典序比较）；
- **逐条动作可观测**：循环里每条 Issue 打标签 + 评论 + 回显，中断时一眼知道处理到哪；
- **真实项目可挂 schedule workflow**：把脚本放进 Actions 的 cron 触发，配合第 2.3 节的 `GITHUB_TOKEN`，治理完全无人值守。

## 4. 脚本安全习惯

- **不要用 sudo**：gh 认证信息存在用户目录，用 sudo 反而可能读到错误的配置。
- **危险命令加确认**：`gh repo delete`、`gh release delete` 等破坏性命令习惯性带 `--yes` 前先确认仓库名——脚本里的 `--yes` 只该出现在「目标来自可信输入」的场景。
- **最小 scope**：认证时按需授权，`gh auth refresh` 只补缺的权限（如 `-s repo`、`-s workflow`），不图省事全选。CI 场景则优先用 workflow 内置 token，它比 PAT 权限小得多。
- **secrets 不落地**：敏感信息通过仓库 secrets / 环境变量注入，不要写进 gh 脚本；脚本进版本库，secrets 进仓库设置，两条线永不相交（secrets 机制见 [Secret Scanning 与安全选项](/github/270-DependencySecurityOptions)）。
- **定期检查**：`gh auth status` 定期查看账户与 scope，离职或换机后 `gh auth logout` 清理。
- **输出即是日志**：脚本里的 gh 命令输出会进 CI 日志，注意 `--json` 里不要带上含敏感信息的字段。

## 5. 常见脚本错误与对策

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| :--- | :--- | :--- | :--- |
| 交互提示卡住 | 脚本中命令等待输入 | 缺少 `--yes`/`--confirm` 等非交互参数 | 脚本化时补充 `--yes`、`--json` 等参数跳过交互 |
| 权限不足 | `GraphQL: Resource not accessible` / 403 | 令牌 scope 不足（如未含 `repo`） | 用 `gh auth refresh -s repo,workflow` 重新授权；CI 中检查 workflow 的 `permissions:` 声明 |
| 命令作用域不对 | 提示 `no GitHub repository found` | 不在仓库目录内执行仓库相关命令 | `cd` 进入仓库目录，或（脚本推荐）用 `--repo OWNER/REPO` 显式指定 |
| 解析输出失败 | grep/awk 拿不到预期字段 | 解析了人读的表格输出 | 改用 `--json` + `--jq` 的机读模式 |
| 限流（rate limit） | `API rate limit exceeded` | 脚本高频调用 REST API | 批量操作加 sleep 或改用 GraphQL 一次取多（见 [gh API](/github/530-GhApi)） |

## 6. 动手实践

### 练习一：写一个「PR 健康度」日报脚本

任务：输出仓库 open PR 的三项统计——总数、缺 reviewer 的数量、最久未更新的一条。
提示：三项都从 `gh pr list --json number,reviews,updatedAt` 的一次取值里算；缺 reviewer 用 jq 的 `select((.reviews | length) == 0)`。

参考实现（先自己写，写完再对照）：

```bash
gh pr list --repo owner/repo --json number,reviews,updatedAt,author \
  --jq '
  {
    total: length,
    no_reviewer: [.[] | select((.reviews | length) == 0)] | length,
    stalest: (sort_by(.updatedAt)[0] | "#\(.number) by \(.author.login) at \(.updatedAt)")
  } | "总 open PR: \(.total)\n缺 reviewer: \(.no_reviewer)\n最久未更新: \(.stalest)"
  '
```

### 练习二：替代一个第三方 action

任务：找一个你在用的第三方 action（如自动打标签、发布 Release），用等价的 gh 命令重写，对比两者的工作流 diff 行数。
提示：优先改写「创建 Release/上传产物/评论 PR」这三类——它们与第 2.3 节的形态最接近；改写后记得补 `permissions:` 声明。

### 练习三（综合）：无人值守的周度治理

任务：把第 3 节的 stale 脚本升级成 schedule workflow：每周一跑一次，结束后用 gh 在固定 Issue 下留一条运行记录（成功几条、失败几条）。
提示：治理脚本放 `scripts/`，workflow 用 `on: schedule`；运行记录用 `gh issue comment` 写到一个专门的 meta Issue——「自动化要有留痕」是治理可信的前提。

参考骨架（先自己写，再看）：

```yaml
on:
  schedule:
    - cron: "0 3 * * 1"        # 每周一 03:00 UTC
permissions:
  issues: write                 # 最小权限：只写 issues
jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - env:
          GH_TOKEN: ${{ github.token }}
        run: |
          bash scripts/stale-issues.sh | tee /tmp/run.log
          gh issue comment 1 --repo "$GITHUB_REPOSITORY" \
            --body "本周 stale 治理完成：$(grep -c '^stale:' /tmp/run.log) 条被标记。"
```

## 7. 与之前和之后的知识的关系

- 往前：[GitHub CLI 总览](/github/440-GitHubCLI) 的遥控器心智模型与本篇各命令的组合形态；[gh CLI 认证配置](/github/450-GhCliAuth) 的 Token 模式是 CI 中 gh 认证的基础；
- 旁支：`gh api` 直调 REST/GraphQL（[gh API](/github/530-GhApi)）是 jq 变换的另一个数据源；Actions workflow 语法在 [GitHub Actions CI/CD](/github/370-GitHubActionsCICD)，第三方依赖的安全取舍在 [Actions 复用与安全](/github/435-ActionsReuseAndSecurity)；
- 往后：批量治理的告警与观测延伸到仓库安全配置（[Dependabot](/github/280-Dependabot)）与 Webhooks 自动化（[Webhooks](/github/330-Webhooks)）。

## 8. 官方文档

- gh CLI 手册（含各命令 --json 字段列表）：https://cli.github.com/manual/
- gh 与 GitHub Actions 的官方集成指南：https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/using-github-cli-in-workflows
- jq 手册（过滤器语法）：https://jqlang.github.io/jq/manual/

## 9. 自我检查

- 能说清 gh 的人机模式与机读模式的差异，并默写 `--json` + `--jq` 的基本组合；
- 能解释脚本里为什么必须显式 `--repo`，以及 CI 中 `GH_TOKEN` 的认证方式；
- 能写出「等 checks 通过就合并」的判定脚本，并说出 `--watch` 的退出码语义；
- 能指出第三方 action 相对 gh 命令多出的供应链风险，以及 gh 方案仍需补的 `permissions:` 声明；
- 能列出批量治理脚本的四个工程细节（fail-fast、jq 内比较、逐条可观测、留痕）。

## 本章总结

gh 脚本化的一句话是「**切到机读模式，然后一切照工程规矩来**」：`--json` + `--jq` 拿结构化数据（字段列表用空 `--json` 查），`--yes`/`--repo` 消灭交互与歧义，CI 里 `GH_TOKEN` 免登录、`permissions:` 定权限，判定用退出码（`gh pr checks --watch`）而不是解析文本。批量治理脚本的工程四件套——fail-fast、比较逻辑进 jq、逐条可观测、运行留痕——让自动化既高效又可信。用一行 gh 命令能替代的第三方 action，就是一条可以删掉的供应链风险。

## 参考与致谢

- 本文 `--json + jq` 输出脚本化、工作流组合示例、安全使用习惯、脚本相关错误对策四部分整体承接自本仓库 [GitHub CLI 总览](/github/440-GitHubCLI) 原第 6.1、7.2、7.6 节与第 8 节脚本相关行（内容重组并扩写 CI 判定、批量治理与 Actions 集成场景）；
- 命令行为（--jq 内置解释器、GH_TOKEN 认证、--watch 退出码）依据 gh CLI 官方手册与 GitHub Actions 官方文档；
- 其余内容为原创。
