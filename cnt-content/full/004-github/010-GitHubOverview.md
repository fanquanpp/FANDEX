---
order: 10
title: GitHub 概述
module: 'github'
category: 工具链
difficulty: beginner
description: GitHub 平台核心功能与协作开发流程：从注册账户、创建仓库到第一次提交的完整旅程。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'github/020-AccountRegister2FA'
  - 'github/030-RepositoryCreateCloneArchiveDelete'
prerequisites: []
---


## 0. 从一个生活场景说起：GitHub 就像一座"代码图书馆"

想象你第一次走进一家大型图书馆：有图书上架区（存放书籍）、检索台（查找书籍）、阅览室（阅读书籍）、以及"读者留言墙"（讨论书籍）。**GitHub 就是为程序员建造的这座图书馆**，只不过"书籍"换成了代码仓库，"读者留言"换成了 Issue 和 Pull Request。

但 GitHub 又比图书馆多了一样东西——**它是活的**。图书馆里的书只能读不能改，而 GitHub 上的代码仓库可以被复制、修改、合并，还能记录每一次修改是谁、在什么时候、为什么做的。这正是它被称为"程序员社交平台"的原因：全球超过 1 亿开发者在这里存放代码、协作开发、交流学习。

本文将以**一位新手开发者"小明"的完整旅程**为主线：注册账户 → 认识首页 → 创建第一个仓库 → 完成第一次提交 → 发起第一个 Pull Request，带你走一遍 GitHub 的核心功能。

## 1. 第一站：GitHub 是什么

### 1.1 直观理解

- **代码托管**：把你的代码"上传"到云端，随时随地可以下载，不用担心硬盘损坏。
- **版本记录**：每一次修改都留下"快照"，改坏了可以随时回退到任意历史版本。
- **协作平台**：多个人可以同时在同一个项目上工作，互不干扰，最后合并成果。
- **开源社区**：全球大量知名项目（Linux、React、Vue、Python 等）都托管在 GitHub 上，你可以免费阅读、学习甚至参与贡献。

### 1.2 原理讲解：Git 与 GitHub 的分工

先理解两个容易混淆的概念：

| 方面 | Git | GitHub |
| :--- | :--- | :--- |
| 本质 | 分布式版本控制系统（软件） | 基于 Git 的代码托管平台（云服务） |
| 运行位置 | 本地命令行工具 | 互联网上的网站服务 |
| 核心能力 | 在本地记录文件每次修改、支持分支与合并 | 在云端保存仓库、提供协作/CI/CD 等能力 |
| 是否需要联网 | 否，纯本地操作 | 是，拉取与推送需要联网 |

可以这样理解：**Git 是你的"日记本"（本地记录），GitHub 是"图书馆"（云端的公共/私有存档）**。你平时写代码用 Git 在本地记账，需要分享或备份时再推送到 GitHub。

### 1.3 发展历程快览

| 时间 | 里程碑 |
| :--- | :--- |
| 2008 | GitHub 成立，提供 Git 仓库托管服务 |
| 2018 | 微软以 75 亿美元收购 GitHub；同年公布 GitHub Actions |
| 2019 | GitHub Actions 正式商用（CI/CD 自动化） |
| 2022 | GitHub Copilot 正式发布（AI 编程助手） |
| 2023 | 开发者数量突破 1 亿；要求贡献代码的用户启用 2FA 双因素认证 |
| 2024 | 仓库总数超过 4 亿（Octoverse 年度报告） |
| 2025 | AI 编码智能体与统一管理界面（Agent HQ）成为平台主推方向 |

## 2. 第二站：注册账户（旅程起点）

打开 https://github.com/ ，点击 **Sign up**，依次填写邮箱、密码、用户名即可完成注册（详细步骤见 002 篇《账户注册与双因素认证》）。

注册完成后建议立即做三件事：

1. **验证邮箱**：GitHub 会发送验证邮件，未验证邮箱将无法创建仓库等基础操作。
2. **设置 2FA**：2023 年 3 月起 GitHub 要求贡献代码的用户必须启用双因素认证，这是保护账户的第一道防线。
3. **完善个人资料**：设置头像、姓名和简介，让他人更容易识别你。

## 3. 第三站：认识你的首页

登录后的首页包含几个关键区域：

- **个人 Profile**：展示你的头像、简介、置顶仓库和贡献图（contributions graph，绿色小格子记录你每天的提交活跃度）。
- **News Feed**：展示你关注的用户和仓库的最新动态。
- **顶部分区**：`Pull requests`（待审查的拉取请求）、`Issues`（分配给你或你参与的问题）、`Notifications`（通知）、`Explore`（探索发现）。

## 4. 第四站：创建第一个仓库（hello-world）

按照 GitHub 官方"你好，世界"教程，创建第一个仓库：

### 4.1 网页端创建

1. 点击页面右上角的 **+** → **New repository**。
2. 仓库名称输入 `hello-world`，描述输入"我的第一个仓库"。
3. 可见性选择 **Public**（公开）或 **Private**（私有）。
4. 勾选 **Add a README file**（初始化一个说明文档）。
5. 点击 **Create repository**。

创建成功后，你会进入仓库主页。**仓库（repository）就是项目容器**，里面可以放代码文件、文档、图片，同时绑定 Issue、Pull Request、Actions 等协作功能。

### 4.2 认识仓库关键文件

| 文件 | 作用 |
| :--- | :--- |
| `README.md` | 项目说明文档，自动显示在仓库首页，是访客的第一印象 |
| `.gitignore` | 声明哪些文件不需要 Git 跟踪（如编译产物、密钥文件） |
| `LICENSE` | 开源许可证，规定他人如何使用你的代码 |
| `CONTRIBUTING.md` | 贡献指南，告诉他人如何参与项目 |
| `.github/` | 存放 GitHub 特殊配置（Actions 工作流、Issue 模板等） |

### 4.3 命令行创建（GitHub CLI 方式）

如果你已安装 `gh`（见 020 篇），也可以直接在终端创建：

```bash
# 创建公开仓库并克隆到本地
gh repo create hello-world --public --clone
# 或创建私有仓库
gh repo create hello-world --private
```

## 5. 第五站：完成第一次提交（Commit）

**提交（commit）** 就像给当前所有文件拍一张"快照"，并写下"这张快照改了什么"。以下用命令行完成第一次提交：

```bash
# 1. 进入仓库目录
cd hello-world

# 2. 配置本地身份（邮箱必须是 GitHub 已验证邮箱）
git config --global user.name "xiaoming"
git config --global user.email "xiaoming@example.com"

# 3. 新建一个文件
echo "# Hello World" > hello.md

# 4. 把文件加入暂存区（staging area）
git add hello.md

# 5. 提交，-m 后面是提交说明
git commit -m "docs: add hello markdown file"

# 6. 推送到 GitHub 远程仓库（-u 建立本地与远程的关联）
git push -u origin main
```

执行完第 6 步，刷新 GitHub 仓库页面，就能看到 `hello.md` 文件了。**本地 → 暂存区 → 本地仓库 → 远程仓库**，这就是一次完整的提交旅程。

## 6. 第六站：发起第一个 Pull Request（协作核心）

Pull Request（PR，拉取请求）是 GitHub 协作的精髓：**你请求把某个分支的改动合并进另一个分支**，合并前可以讨论、审查、跑自动化检查。

### 6.1 PR 协作流程（简明版）

```bash
# 1. 从 main 创建功能分支（详细见 007 篇分支模型）
git checkout -b feature/add-intro

# 2. 修改代码并提交
git add .
git commit -m "feat: add project intro"
git push -u origin feature/add-intro
```

3. 在 GitHub 仓库页面点击 **Compare & pull request**。
4. 确认 `base`（目标分支，通常是 main）和 `compare`（来源分支）正确。
5. 填写标题和描述，点击 **Create pull request**。
6. 邀请同事审查，审查通过后点击 **Merge pull request** 合并。

> 完整流程见 027 篇《Pull Request 完整协作流程》。

### 6.2 与 PR 配套的协作功能

| 功能 | 一句话说明 |
| :--- | :--- |
| Issues | 记录 Bug、功能需求、任务（详见 017 篇） |
| Actions | 自动化 CI/CD，如推送后自动跑测试（详见 029 篇） |
| Projects | 看板式项目管理，可视化任务进度 |
| Discussions | 社区讨论区，适合长期话题沉淀 |
| Wiki | 项目文档中心 |
| Releases | 发布版本，附下载包与更新说明 |

## 7. 第七站：GitHub 的账户类型与订阅计划

### 7.1 账户类型

- **个人账户（Personal account）**：每个开发者的身份标识，可以属于多个组织。
- **组织账户（Organization）**：适合团队与企业，支持成员管理、权限分级、审计日志。

### 7.2 订阅计划（个人账户）

| 计划 | 价格 | 核心特性 |
| :--- | :--- | :--- |
| Free | 免费 | 无限公开/私有仓库，2,000 Actions 分钟/月，Codespaces 120 核心小时/月 |
| Pro | $4/月 | 高级代码审查工具，3,000 Actions 分钟/月 |
| Team | $4/用户/月 | 组织权限管理，代码所有者（CODEOWNERS）等 |
| Enterprise | $21/用户/月 | SAML SSO、审计日志、更多安全合规能力 |

### 7.3 高效探索：搜索语法与快捷键

GitHub 的站内搜索能力非常强大，学会几招就能快速找到目标代码或仓库：

```text
language:python stars:>1000        # Python 项目，星标超过 1000
topic:react fork:true              # React 主题，且包含 Fork
owner:facebook path:src            # Facebook 仓库的 src 目录下
is:pr is:merged author:alice       # alice 已合并的 PR
```

网页端常用的键盘快捷键：

| 快捷键 | 功能 |
| :--- | :--- |
| `.` | 在 Web 编辑器中打开当前仓库 |
| `T` | 文件搜索 |
| `W` | 分支切换 |
| `L` | 跳转到指定行 |
| `B` | 查看 Blame（每行代码的最后修改者） |
| `?` | 显示全部快捷键帮助 |

## 8. 常见错误与对策

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| :--- | :--- | :--- | :--- |
| 提交者身份未配置 | `Please tell me who you are` | 未设置 `user.name` 和 `user.email` | 执行 `git config --global user.name "你的名字"` 和 `git config --global user.email "你的邮箱"` |
| 推送被拒绝 | `Authentication failed` | 使用了旧密码而非 PAT，或令牌过期 | 生成新的个人访问令牌（PAT）代替密码（详见 002/004 篇） |
| 邮箱未验证 | 无法创建仓库 | 注册后未点击邮件验证链接 | 检查收件箱，点击 GitHub 发送的验证链接 |
| 提交没显示在贡献图上 | 贡献图空白 | 本地 `user.email` 与 GitHub 账户邮箱不一致 | 使用 GitHub 已验证邮箱重新配置并提交 |
| 推错分支 | PR 合到了错误的 base | 未确认 base/compare 分支 | 创建 PR 时检查页面顶部的 base repository 和 branch |
| 仓库找不到 | `Repository not found` | 仓库私有、URL 错误或已被删除 | 确认 URL 拼写、检查可见性与访问权限 |

## 10. 一句话记忆

**GitHub 是程序员存放代码、记录版本、协作开发的"代码图书馆"：Git 负责本地记账，GitHub 负责云端存档与协作，而 Pull Request 是协作的大门。**

### 延伸阅读

- 账户安全与 2FA，见 002 篇《账户注册与双因素认证》。
- 仓库的创建、克隆、归档与删除，见 003 篇。
- 分支模型与分支保护规则，见 007 篇。
- Pull Request 完整协作流程，见 027 篇。
- GitHub CLI 命令行操作，见 020 篇。
