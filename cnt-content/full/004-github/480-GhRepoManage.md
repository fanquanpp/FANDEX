---
order: 480
title: GitHub CLI 仓库管理
module: 'github'
category: 工具链
difficulty: beginner
description: '用 gh 命令行管理仓库生命周期：创建与本地项目发布、克隆、Fork 与同步、元信息编辑、归档、转移与删除。'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'github/450-GhCliAuth'
  - 'github/030-RepositoryCreateCloneArchiveDelete'
  - 'github/200-ForkWorkflow'
prerequisites:
  - 'github/450-GhCliAuth'
---

## 0. 开始之前：一条命令走完仓库的前世今生

仓库（repository）是 GitHub 世界里的"项目集装箱"。网页端建仓要经过表单、勾选、跳转；`gh repo` 把这些动作压缩成一条命令：**创建、克隆、Fork、改设置、归档、删除**，全在终端完成。如果说网页端是"到柜台办业务"，`gh repo` 就是"手机 App 自助办理"。

前置知识：仓库的网页端操作（创建/克隆/归档/删除的完整语义）见 github/030-RepositoryCreateCloneArchiveDelete；Fork 协作模型见 github/200-ForkWorkflow。本篇讲解命令本身，开始前请完成 gh 认证（github/450-GhCliAuth）。

## 1. 创建仓库：gh repo create

### 1.1 在 GitHub 上新建空仓库

```bash
# 创建公开仓库
gh repo create myproject --public

# 创建私有仓库，并写上描述
gh repo create myproject --private --description "内部工具集"

# 创建并立即克隆到本地（一步到位）
gh repo create myproject --public --clone
```

`--public`/`--private`/`--internal` 三种可见性；不加默认会进入交互式询问。组织仓库用 `org-name/repo-name` 全名指定归属。

### 1.2 把本地已有项目发布为远程仓库（高频）

本地已经写了一个项目、还没建远程仓库？一条命令完成"建仓 + 关联 remote + 首次推送"：

```bash
cd ./my-local-project

# 把当前目录发布为新的私有仓库，remote 命名为 origin 并推送
gh repo create myproject --private --source=. --remote=origin --push
```

`--source=.` 指向本地项目根目录（需已是 git 仓库），`--remote=origin` 建立关联，`--push` 推送当前分支。这是"从零到远程"的最短路径，省去网页建仓再 `git remote add` 的两步。

## 2. 克隆、查看与列表

```bash
# 克隆：支持 owner/repo 缩写（不必写完整 URL）
gh repo clone owner/repo

# 查看仓库详情（描述、语言、star、默认分支等）
gh repo view owner/repo

# 直接看 README
gh repo view owner/repo --web   # 在浏览器打开仓库主页

# 列出自己/某主体的仓库
gh repo list --limit 30
gh repo list owner --language python --limit 10
```

`gh repo clone` 与 `git clone` 的区别：gh 允许 `owner/repo` 缩写，并且克隆 fork 时会自动把上游（upstream）也配好远程——对参与开源项目特别省心。

## 3. Fork 与同步：为贡献开源而生

```bash
# Fork 到自己账户（--clone 同时克隆到本地）
gh repo fork owner/upstream --clone

# Fork 时自动配置 upstream 远程（新版本 gh 默认执行）
gh repo fork owner/upstream

# 同步自己 fork 的默认分支到上游最新（避免"落后上游"的陈旧 fork）
gh repo sync owner-fork/repo-fork

# 在 fork 仓库目录里，直接同步上游 main
cd repo-fork && gh repo sync --source owner/upstream
```

Fork 工作流里最容易出问题的就是"fork 里的 main 落后上游很多"。过去要手动 `git fetch upstream && git merge upstream/main`，现在 `gh repo sync` 一条命令完成。完整协作流程见 github/200-ForkWorkflow。

## 4. 编辑仓库设置：gh repo edit

```bash
# 改描述与主页
gh repo edit owner/repo --description "容器化部署工具" --homepage "https://example.com"

# 改默认分支（如从 main 切回 master 或反向操作）
gh repo edit owner/repo --default-branch main

# 调整可见性（公开转私有等敏感操作，新版 gh 会要求确认后果）
gh repo edit owner/repo --visibility private --accept-visibility-change-consequences

# 开关 Wiki / Issues / Discussions 等功能
gh repo edit owner/repo --enable-wiki=false
gh repo edit owner/repo --enable-discussions
```

可见性变更影响面大（公开转私有会解除 fork 关系、影响 Pages 与包服务），gh 由此增加了二次确认参数；具体后果见 github/030-RepositoryCreateCloneArchiveDelete。

## 5. 重命名、归档与转移

```bash
# 重命名（GitHub 自动为旧名做跳转，但本地 remote 建议更新）
gh repo rename new-name

# 归档：仓库变只读，明确告知"项目已停止维护"
gh repo archive owner/repo

# 解除归档
gh repo unarchive owner/repo

# 把仓库转移给另一个用户或组织
gh repo transfer owner/repo new-owner
```

归档是比删除温和得多的"项目落幕"方式：代码继续可读可克隆，Issue/PR 冻结为只读。转移前确保新所有者接受（组织可能有转移审批），转移后原 URL 同样保留跳转。

## 6. 删除：最后的手段

```bash
# 删除仓库（不可恢复，需 --yes 确认）
gh repo delete owner/repo --yes
```

删除前自查三点：是否有未合并的分支与 Issue 需要导出；是否有 Release 附件需要备份；协作者与 CI 是否已通知。要"下线但不消失"，优先归档。

## 7. 发布 Release（概览）

`gh release` 子命令负责版本发布：创建带说明的 Release、上传构建产物（二进制、安装包）、下载与删除等。因内容较多且与 CI 发版紧密相关，已独立成篇，见 github/490-GhRelease；在 Actions 工作流中自动发版见 github/370-GitHubActionsCICD。

## 8. 常见错误与对策

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 仓库名已存在 | `name already exists on this account` | 同名仓库冲突 | 换名，或 `gh repo view` 确认是否复用 |
| --source 报错 | `not a git repository` | 当前目录未 git init | 先 `git init && git commit` 再执行 create |
| push 无内容 | 远程仓库为空 | 忘了 `--push` 或没有提交 | 补 `git push -u origin main` |
| fork 后推送 403 | `permission denied` | 推到了上游仓库 | 推到自己 fork（origin），PR 再合入上游 |
| 删除没反应 | 提示需要确认 | 缺少 `--yes` | 加 `--yes`；同时确认删除的是正确仓库 |
| 转移失败 | `validation failed` | 目标所有者不存在或已同名 | 核对目标账户/组织与仓库唯一性 |
| 可见性变更被拦 | 要求确认后果参数 | 公开转私有属敏感操作 | 按提示加确认参数并知悉 fork/Pages 影响 |

## 9. 实战场景：三种常见开局

```bash
# 场景 A：从零开始一个新项目
gh repo create blog --public --clone && cd blog
echo "# My Blog" > README.md && git add . && git commit -m "init" && git push -u origin main

# 场景 B：给本地项目补远程
cd ./ready-project
gh repo create ready-project --private --source=. --remote=origin --push

# 场景 C：给开源项目提 PR
gh repo fork owner/cool-lib --clone && cd cool-lib
git checkout -b fix/typo && git commit -am "docs: fix typo" && git push -u origin fix/typo
gh pr create --fill
```

## 10. 小结

**初学者要点**

- 新项目首选 `gh repo create <名> --clone`；本地项目用 `--source=. --push` 一条龙发布。
- 克隆与 Fork 用 `owner/repo` 缩写；fork 用 `gh repo sync` 保持新鲜。
- 项目停更用 `gh repo archive` 而不是删除；删除必须 `--yes` 且不可恢复。

**进阶注意**

- 公开转私有等敏感变更需要显式确认参数，且会牵连 fork 关系、Pages、Packages。
- 重命名/转移后旧地址会跳转，但本地与 CI 里的 remote、webhook 配置要主动更新。
- `gh repo list --json` 支持脚本化盘点，适合清理僵尸仓库前的资料收集。

### 延伸阅读

- 仓库网页端操作与可见性语义，见 github/030-RepositoryCreateCloneArchiveDelete。
- Fork 协作与同步详解，见 github/200-ForkWorkflow。
- Release 发布命令详解，见 github/490-GhRelease。
