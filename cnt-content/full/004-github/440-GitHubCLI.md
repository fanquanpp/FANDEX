---
order: 440
title: GitHub CLI
module: 'github'
category: 工具链
difficulty: intermediate
description: GitHub CLI（gh）详解：安装认证、仓库/PR/Issue/Actions 常用命令与工作流提速技巧。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'github/290-SecretScanning'
  - 'github/300-CodeQLCodeScanning'
  - 'github/320-RESTGraphQLAPI'
prerequisites:
  - 'github/010-GitHubOverview'
---


## 0. 从一个生活场景说起：GitHub 的"遥控器"

看电视时，你很少走到电视机前按物理按钮，而是用**遥控器（GitHub CLI）** 懒洋洋地换台、调音量。GitHub CLI（命令 `gh`）就是 GitHub 网页版的"遥控器"：不用在浏览器里点来点去，在终端里敲一行命令，就能完成建仓库、提 PR、管 Issue、查 Actions 等几乎全部操作。

本篇采用**工具驱动**的结构：先安装"遥控器"（安装认证），再逐个"换台"（仓库/PR/Issue/Actions 等常用命令），最后分享把"遥控器"调教得更顺手的技巧（别名、扩展）。与 046-057 篇的 gh 专项命令速查相呼应，本篇侧重**整体上手路径与组合使用**。

## 1. 安装与认证：拿到遥控器

### 1.1 安装

```bash
# Windows（winget）
winget install --id GitHub.cli

# macOS（Homebrew）
brew install gh

# Linux（Ubuntu/Debian）
sudo apt install gh

# 验证安装
gh --version
```

> Windows 除 winget 外，也可用 MSI 安装包或 Scoop 安装；macOS 还可通过第三方包管理器安装。安装后建议定期升级：Windows 用 `winget upgrade --id GitHub.cli`，macOS 用 `brew upgrade gh`，确保使用最新的命令与安全修复。

### 1.2 登录认证

```bash
# 启动交互式登录
gh auth login

# 按提示选择：
#   1) GitHub.com（或个人/企业服务器）
#   2) 认证方式：浏览器登录（推荐）或粘贴 Token
#   3) 选择 Git 操作协议：HTTPS 或 SSH

# 查看登录状态
gh auth status
```

> 认证成功后，gh 会自动接管 Git 凭据（选择 HTTPS 时），`git push`/`git pull` 不再需要单独配置 PAT 或 SSH。官方把这称为"无需单独的凭据管理器"。

### 1.3 获取帮助：--help 与官方手册

gh 有完善的帮助体系，遇到不确定的命令先查帮助：

```bash
# 顶层帮助（列出所有命令族）
gh help

# 具体命令帮助
gh pr create --help

# 查看命令手册页
gh help pr
```

> 官方资料：完整命令手册见 https://cli.github.com/manual/ ，每个子命令都有参数说明和示例。

## 2. 换台一：仓库操作（gh repo）

```bash
# 创建仓库（--clone 表示同时克隆到本地）
gh repo create my-project --public --clone
gh repo create my-project --private

# 克隆别人的仓库
gh repo clone octo-org/octo-repo

# 查看仓库信息（README 摘要）
gh repo view octo-org/octo-repo
# 在浏览器打开仓库
gh repo view octo-org/octo-repo --web

# Fork 仓库并克隆
gh repo fork octo-org/octo-repo --clone

# 列出自己的仓库
gh repo list --limit 50
gh repo list --language TypeScript

# 归档 / 删除（危险操作，谨慎使用）
gh repo archive OWNER/REPO --yes
gh repo delete OWNER/REPO --yes
```

## 3. 换台二：Pull Request（gh pr）

```bash
# 创建 PR（--fill 用提交信息自动填充标题与描述）
gh pr create --title "feat: add auth" --body "描述内容"
gh pr create --fill

# 列出 / 查看 PR
gh pr list --state open
gh pr view 123

# 检出某 PR 到本地（自动切换分支）
gh pr checkout 123

# 审查 PR
gh pr review 123 --approve
gh pr review 123 --request-changes -b "需要修改"

# 合并 PR（三种合并策略）
gh pr merge 123 --merge     # 合并提交
gh pr merge 123 --squash    # 压缩合并（推荐，历史干净）
gh pr merge 123 --rebase    # 变基合并

# 合并后自动删除远程分支
gh pr merge 123 --squash --delete-branch
```

## 4. 换台三：Issue（gh issue）

```bash
# 创建 Issue
gh issue create --title "Bug: login fails" --body "描述"
# 从文件读取描述
gh issue create --title "Bug" --body-file bug-template.md

# 列出 / 查看
gh issue list
gh issue list --label bug
gh issue list --assignee @me
gh issue view 123

# 关闭 / 重新打开
gh issue close 123
gh issue reopen 123
```

## 5. 换台四：Actions 与 Workflow（gh workflow / gh run）

```bash
# 列出仓库的工作流
gh workflow list

# 手动触发工作流（可指定分支）
gh workflow run ci.yml
gh workflow run ci.yml --ref feature-branch

# 查看运行记录
gh run list
gh run view 123456

# 实时跟随日志（Ctrl+C 停止）
gh run watch

# 只看失败日志
gh run view 123456 --log-failed
```

## 6. 换台五：其他高频命令

```bash
# Gist（代码片段）
gh gist create file.txt
gh gist list

# Release 发布
gh release create v1.0.0 --title "v1.0.0" --notes "Release notes"
gh release list
gh release download v1.0.0

# 直接调用 REST API
gh api repos/owner/repo/issues
# 调用 GraphQL
gh api graphql -f query='{ viewer { login } }'

# 搜索代码 / 仓库 / Issue
gh search code "TODO" --repo owner/repo
gh search repos --topic machine-learning --limit 20

# 扩展（如 Copilot CLI）
gh extension install github/gh-copilot
gh extension list
```

### 6.1 输出格式化与脚本化：--json + jq

gh 默认输出给人看的文本，加 `--json` 可输出结构化数据，配合 `jq` 处理，适合脚本自动化：

```bash
# 输出 PR 的编号、标题、状态
gh pr list --json number,title,state

# 用 jq 提取特定字段
gh pr list --json number,title --jq '.[] | "\(.number) \(.title)"'

# 输出仓库信息
gh repo view owner/repo --json name,visibility,defaultBranchRef

# 脚本中跳过交互（--yes、--repo 显式指定）
gh issue close 12 --repo owner/repo --comment "已修复" --yes
```

> 官方常见用法示例：`gh issue list --assignee "@me"` 列出分配给你的议题，`gh pr list --author alice` 列出某人的 PR。

### 6.2 gh search 搜索详解

站内搜索也能在命令行完成，适合脚本化筛选：

```bash
# 搜索代码片段
gh search code "TODO" --repo owner/repo

# 搜索仓库（按语言/星标/主题筛选）
gh search repos --language python --stars ">1000" --limit 20
gh search repos --topic machine-learning --limit 10

# 搜索 Issue 与 PR
gh search issues --label bug --state open --repo owner/repo
gh search prs --author alice --state merged

# 结构化输出配合 jq
gh search repos --topic golang --json fullName,stargazersCount \
  --jq 'sort_by(-.stargazersCount)[0:5] | .[].fullName'
```

## 7. 把遥控器调顺手：别名与组合拳

### 7.1 设置别名

```bash
gh alias set pc 'pr create --fill'
gh alias set pm 'pr merge --squash --delete-branch'
gh alias set il 'issue list'

# 使用别名
gh pc    # 等价于 gh pr create --fill
```

### 7.2 工作流组合示例

日常"开 PR"一条龙：

```bash
# 1. 从 main 创建分支
git switch -c feat/add-login
# 2. 开发提交后推送
git push -u origin feat/add-login
# 3. 一键创建 PR 并合并时删除分支
gh pr create --fill
gh pr merge --squash --delete-branch
```

"看板式"查看自己手头所有工作：

```bash
gh status
# 汇总：你创建的/分配给你的 PR 与 Issue 概览
```

### 7.3 多账户切换

```bash
# 查看当前账户
gh auth status
# 切换账户（按需登录第二个账号后）
gh auth switch
```

### 7.4 命令补全与全局配置

- **命令补全**：按 shell 生成补全脚本，Tab 键补全子命令与参数：

```bash
# bash
gh completion -s bash > ~/.gh_completion
echo 'source ~/.gh_completion' >> ~/.bashrc
# zsh
gh completion -s zsh > "${fpath[1]}/_gh"
# PowerShell
gh completion -s powershell >> $PROFILE
```

- **全局配置**：`gh config` 管理默认设置（如默认仓库所有者、首选编辑器、Git 协议）。

```bash
# 设置默认 Git 协议为 SSH
gh config set git_protocol ssh
# 设置首选编辑器
gh config set editor "code --wait"
# 查看全部配置
gh config list
```

### 7.5 与 046-057 系列的关系

本篇是 gh 的**整体上手路径**；046-057 篇按命令族给出速查手册：

| 主题 | 对应篇目 |
| :--- | :--- |
| 认证与多账户 | 046《Gh CLI 认证》 |
| PR 管理 | 047《Gh PR 管理》 |
| Issue 管理 | 048《Gh Issue 管理》 |
| 仓库管理 | 049《Gh Repo 管理》 |
| Release / Workflow / Gist | 050-052 |
| 扩展 / API / 搜索 / 标签 / 别名 | 053-057 |

遇到具体命令的完整参数时，查对应篇目或 `gh <命令> --help`。

### 7.6 安全使用习惯

- **不要用 sudo**：gh 认证信息存在用户目录，用 sudo 反而可能读到错误的配置。
- **危险命令加确认**：`gh repo delete`、`gh release delete` 等破坏性命令习惯性带 `--yes` 前先确认仓库名。
- **最小 scope**：认证时按需授权，`gh auth refresh` 只补缺的权限（如 `-s repo`、`-s workflow`），不图省事全选。
- **secrets 不落地**：敏感信息通过仓库 secrets / 环境变量注入，不要写进 gh 脚本。
- **定期检查**：`gh auth status` 定期查看账户与 scope，离职或换机后 `gh auth logout` 清理。

## 8. 常见错误与对策

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| :--- | :--- | :--- | :--- |
| 未认证执行命令 | `To use GitHub CLI, run gh auth login` | 尚未登录 | 运行 `gh auth login` 完成浏览器或 Token 认证 |
| 权限不足 | `GraphQL: Resource not accessible` / 403 | 令牌 scope 不足（如未含 `repo`） | 用 `gh auth refresh -s repo,workflow` 重新授权所需 scope |
| 命令作用域不对 | 提示 `no GitHub repository found` | 不在仓库目录内执行仓库相关命令 | `cd` 进入仓库目录，或用 `--repo OWNER/REPO` 显式指定 |
| 推送需要 workflow 权限 | `gh auth status` 提示 scope 缺失 | 首次创建 workflow 文件推送被拒 | 重新登录时授权 `workflow` scope：`gh auth refresh -s workflow` |
| 别名冲突 | `alias` 设置失败 | 别名与现有命令同名 | 换一个别名，或用 `gh alias delete <名称>` 清理 |
| 交互提示卡住 | 脚本中命令等待输入 | 缺少 `--yes`/`--confirm` 等非交互参数 | 脚本化时补充 `--yes`、`--json` 等参数跳过交互 |

## 10. 一句话记忆

**gh 是 GitHub 的"遥控器"：一条命令搞定仓库、PR、Issue、Actions，认证一次长期免密，别名与扩展让它越用越顺手。**

### 延伸阅读

- gh 认证与多账户详解，见 046 篇《Gh CLI 认证》。
- gh PR 管理速查，见 047 篇《Gh PR 管理》。
- gh Issue 管理速查，见 048 篇《Gh Issue 管理》。
- gh 仓库/Release/Workflow/Gist/扩展/API 命令，见 049-057 篇。
- 凭据与 PAT 的底层原理，见 002/004 篇。
