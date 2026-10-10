---
order: 10
title: GitHub 是什么：把本地仓库放进全世界的协作网络
module: 'github'
category: 工具链
difficulty: beginner
description: 从「写好的项目只存在自己电脑上」的真实焦虑讲起，用 gh 与网页两条路完成建仓、首次推送与第一次 PR 预览，讲清 Git 与 GitHub 的分工、账户体系与首页导航，并给出新手最常见的六个报错对照表。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'github/020-AccountRegister2FA'
  - 'github/030-RepositoryCreateCloneArchiveDelete'
  - 'github/180-PullRequestCompleteCollaborationFlow'
  - 'git/010-Git'
prerequisites: []
---

## 知识点地图

- **知识类别**：GitHub 平台概览——它是什么、与 Git 的分工、账户与仓库的基本形态。本模块全部 50 余篇文档的地基。
- **解决什么问题**：「项目只活在自己电脑上」的三个焦虑（单点丢失、换机迁移、无法协作），以及「学了 Git 为什么还要 GitHub」这个高频困惑。
- **什么时候用到**：第一次注册 GitHub、第一次建仓推送之前；或者用了一阵子 GitHub 却说不清它比网盘/裸 Git 多了什么的时候。先读完本篇再进入后续任何专题，事半功倍。

## 前置知识

- 最好已完成 [Git 是什么](/git/010-Git) 与 [安装与配置](/git/020-GitInstallConfig)：本地 Git 可用，`user.name` / `user.email` 已配置；
- 没装 Git 也能读完本文，动手环节会标注哪几步依赖本地 Git。

## 学习目标

读完本文你将能够：

1. 一句话分清 Git 与 GitHub 的分工，说出哪些事非 GitHub 不可；
2. 用网页和 `gh` 两条路创建自己的第一个仓库，并把本地项目推上去；
3. 看懂 GitHub 仓库页的五大区域与个人主页的贡献图；
4. 对照报错表解决新手前两周最常见的六类问题。

预计 30 到 40 分钟，含一次完整的建仓推送实操。

## 1. 问题：你的项目只活在一台电脑上

假设你写了一个小工具，本地 Git 用得很顺：提交历史清清楚楚，改坏了随时回退。然后你遇到三件 Git 本身解决不了的事：

1. **硬盘坏了怎么办？** 本地仓库再完整，也只是房间里的一份拷贝；
2. **换电脑怎么办？** 难道靠 U 盘拷 `.git` 目录？
3. **想让人看一眼代码、报个 bug、甚至一起写？** 总不能把整个文件夹打包发微信。

这三件事指向同一个需求：把仓库的**一份完整副本放到网上**，并且让这份副本天然长出协作能力（讨论、审查、自动化）。GitHub 就是全球最主流的这朵「云」——Git 是你电脑上的版本控制工具，GitHub 是托管仓库并围绕仓库提供协作服务的平台。

一句话分工：**Git 负责本地记账，GitHub 负责云端存档与协作**。两者是火腿和三明治的关系，不是二选一。

### 心智模型：Git 是 Word，GitHub 是腾讯文档

把两者放回你熟悉的工具里，分工立刻清晰：

| 维度 | Git | GitHub |
| :--- | :--- | :--- |
| 本质 | 本地版本控制工具 | 云端托管与协作平台 |
| 类比 | 电脑上的 Word | 腾讯文档 |
| 强项 | 改到哪一步都有据可查、随时回退 | 多人同时作业、评论与共享、历史云端保留 |
| 界面 | 命令行为主 | 网页 + 社交化交互 |

类比也有边界，值得点破：Word 存的是「最后一份文档」，Git 存的是「每一次改动的完整快照」——所以 Git 比多存几个备份强大得多。这也是那句值得抄在笔记本扉页的话：**Git 不是备份工具，是版本控制工具**。备份只关心「现在的文件在不在」，版本控制关心「每个版本怎么来的、怎么回去」。

换用「游戏存档」的视角看价值，痛点三连恰好对应三个存档能力：一键回退到昨天能跑的版本（读档）；多人改同一项目不冲突（联机不覆盖队友进度）；每一行代码成果永久留痕（成就系统自动记录）。国内课堂常用 GitHub 的替代平台还有 Gitee（访问快）、GitLab（企业常自建），本文以 GitHub 为例，概念完全互通。

## 2. 动手：两条路建仓库，把项目推上去

先完成一次最小闭环。假设你已注册账号（流程与 2FA 设置见 [账户注册与双因素认证](/github/020-AccountRegister2FA)）。

### 路 A：gh 命令行（2026 年推荐首选）

[GitHub CLI](/github/440-GitHubCLI) 把整个流程压进终端。首次使用先登录：

```bash
gh auth login
# 按提示选 GitHub.com，浏览器登录，协议选 HTTPS
```

然后在你的项目目录里：

```bash
cd my-project
git init 2>/dev/null || true          # 已经是仓库就跳过
gh repo create my-project --private --source=. --push
```

这一条命令做了三件事：在 GitHub 上创建私有仓库 `my-project`；把当前目录设为它的本地源；把现有提交全部推上去。回浏览器刷新 `https://github.com/你的用户名/my-project`，仓库已经在了。

### 路 B：网页点击

1. 登录后点右上角 **+** → **New repository**；
2. 仓库名用小写加连字符（如 `my-project`），选择 Public（公开）或 Private（私有）；
3. 勾选 **Add a README file**，点 **Create repository**；
4. 回到本地，把两个仓库接起来：

```bash
git remote add origin https://github.com/你的用户名/my-project.git
git branch -M main
git push -u origin main
```

两条路终点相同。区别是路 A 顺手把认证也解决了（gh 登录后自动接管 Git 凭据），路 B 需要你自己搞定 HTTPS 凭据或 SSH 密钥（见 [SSH 与 HTTPS](/github/040-SSHHTTPS)）。

## 3. 看懂两个页面：仓库页与个人主页

**仓库页**是项目的门面，五个区域值得认识：

- **Code**：文件浏览器，右上角绿色 Code 按钮藏着克隆地址与 Codespaces 入口；
- **Issues**：bug 与需求的管理区；
- **Pull requests**：代码审查的入口，协作的核心；
- **Actions**：自动化流水线（CI/CD）的运行记录；
- **Settings**：分支保护、协作权限、Pages 部署都在这里。

**个人主页**上最值得关注的是贡献图（那片绿格子）：它统计的是「署名邮箱与你账号绑定的邮箱一致的提交」。这就是为什么 [安装与配置](/git/020-GitInstallConfig) 反复强调 `user.email` 必须是 GitHub 已验证邮箱——配错了，提交照常成功，但贡献图一片灰。

仓库里的几个特殊文件也值得点名：`README.md` 自动渲染在仓库首页；`LICENSE` 决定别人能怎么用你的代码；`.github/` 目录存放工作流、Issue 模板等平台配置。

## 4. 为什么：GitHub 之上还长了什么

一句话定位：**GitHub 是代码的云端家园**——不只是仓库的寄存处，而是围绕仓库长出协作、评审、自动化与社区生态的完整家园。如果只看「云端备份」，GitLab、Gitea 等平台都能做。GitHub 真正的护城河是围绕仓库生长的协作网络：

| 能力 | 一句话说明 | 深入阅读 |
| :--- | :--- | :--- |
| Pull Request | 改动合并前必须经过审查与讨论 | [PR 完整协作流程](/github/180-PullRequestCompleteCollaborationFlow) |
| Issues | bug、需求、任务的跟踪中心 | [Issue 模板与里程碑](/github/210-IssuesTemplateTagMilestone) |
| Actions | 推送代码后自动跑测试、构建、部署 | [GitHub Actions 入门](/github/370-GitHubActionsCICD) |
| Pages | 直接把仓库发布成网站 | [GitHub Pages 多方案](/github/360-GitHubPagesMultiSolution) |
| Fork 与开源协作 | 任何人都能复制你的项目、改完提交回来 | [Fork 工作流](/github/200-ForkWorkflow) |

本教程所在的 FANDEX 仓库就是一个活样本：文档改动的合并走 PR，提交信息遵循 Conventional Commits，站点通过 Actions 自动构建部署到 Pages。你在后面的篇目里会把这条链路亲手走一遍。

个人账户免费档就包含无限公开与私有仓库，学习阶段完全够用；组织账户多出来的是成员权限、审计等团队管理能力，需要时再看官方 pricing 页，本文不抄价格数字——它们会变。

## 5. 坑点与自检

新手前两周最常撞上的六个问题，先存档备用：

| 现象 | 原因 | 对策 |
| :--- | :--- | :--- |
| `Authentication failed`，推送要密码 | GitHub 自 2021 年起不接受账号密码做 Git 认证 | 用 `gh auth login`，或配置 SSH / PAT（见 [SSH 与 HTTPS](/github/040-SSHHTTPS)） |
| 提交成功但贡献图全灰 | 本地 `user.email` 与账号邮箱不一致 | `git config --global user.email` 改为已验证邮箱（旧提交不会追溯） |
| `Repository not found` | 仓库私有、URL 打错或无权限 | 核对 URL 与可见性；私有仓库先完成认证 |
| push 被拒 `fetch first` | 远程有你本地没有的提交 | 先 `git pull --rebase` 再推（见 [pull 与 fetch](/github/080-GitPullFetch)） |
| 分支名是 `master` 不是 `main` | 本地 Git 未配置默认分支名 | `git config --global init.defaultBranch main`（本教程 [030 篇](/git/030-GitEnvConfigInit) 已配） |
| 找不到仓库页上的按钮 | 界面改版或权限不足 | 功能入口以 Settings 里能否找到为准，本文截图类描述不作数 |

自检三问：

1. 我能不看笔记说出 Git 和 GitHub 各管什么吗？
2. 我的 `user.email` 和 GitHub 账号邮箱一致吗？
3. 我的第一个仓库推上去了吗？浏览器里能看到 README 吗？

## 6. 练习

1. 基础：用 `gh repo create` 建一个名为 `playground` 的私有仓库，本地提交一个 `README.md` 推上去，浏览器确认可见。
2. 观察：打开 github.com 上任意一个你喜欢的开源仓库（比如 VS Code 的仓库），只做一件事：找出它的默认分支名、Issues 数量和 `.github/` 目录里有哪些文件。
3. 预演：给自己的 `playground` 建一个分支、提交一行改动、推送，然后走一遍创建 PR 的界面（不必真的合并，感受一下 PR 表单即可，完整流程下一篇专题讲）。
4. 思考：为什么 GitHub 要求 2FA？结合「仓库 = 你的工程资产」想一想，哪些操作一旦账号被盗就再也追不回来。

## 下一步

- [仓库创建、克隆、归档、删除](/github/030-RepositoryCreateCloneArchiveDelete)：本文只开了店，生命周期四件事在这里讲全；
- [Git 提交与推送](/github/060-GitCommitPush)：把「推上去」背后的四步流程拆开细讲；
- [Pull Request 完整协作流程](/github/180-PullRequestCompleteCollaborationFlow)：练习 3 那个表单背后的完整世界。
