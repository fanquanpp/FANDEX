---
order: 68
title: 社区健康文件
module: github
category: GitHub
difficulty: beginner
description: GitHub社区健康文件：贡献指南、行为准则与支持资源。
author: fanquanpp
updated: '2026-06-14'
related:
  - github/在线开发环境
  - github/代码所有者
  - github/PullRequest完整协作流程
  - github/GitHubPages多站点方案
prerequisites:
  - github/GitHub概述
---

## 1. 社区健康文件概述

### 1.1 什么是社区健康文件

社区健康文件帮助开源项目建立**规范和期望**，让贡献者知道如何参与、行为准则和获取帮助。

### 1.2 核心文件

| 文件                   | 位置                | 用途       |
| :--------------------- | :------------------ | :--------- |
| **CONTRIBUTING.md**    | 根目录或 `.github/` | 贡献指南   |
| **CODE_OF_CONDUCT.md** | 根目录或 `.github/` | 行为准则   |
| **SUPPORT.md**         | 根目录或 `.github/` | 支持资源   |
| **SECURITY.md**        | 根目录或 `.github/` | 安全策略   |
| **CODEOWNERS**         | 根目录或 `.github/` | 代码所有权 |

### 1.3 社区标准检查

仓库 → Insights → Community standards，查看文件完备度。

## 2. CONTRIBUTING.md

### 2.1 模板

```markdown
# 贡献指南

感谢你对本项目的关注！以下是参与贡献的指南。

## 如何贡献

### 报告 Bug

1. 搜索现有 Issue，确认没有重复
2. 使用 Bug 报告模板创建新 Issue
3. 提供完整的复现步骤

### 提交功能请求

1. 描述你期望的功能
2. 说明使用场景
3. 如果可能，提供实现思路

### 提交代码

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交变更 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 开发设置

\`\`\`bash
git clone https://github.com/user/repo.git
cd repo
npm install
npm run dev
\`\`\`

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档更新
- `style:` 代码格式
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建/工具

## 代码风格

- 使用 ESLint + Prettier
- 运行 `npm run lint` 检查
- 运行 `npm run format` 格式化

## 测试

- 运行 `npm test`
- 新功能必须包含测试
- Bug 修复应包含回归测试
```

## 3. CODE_OF_CONDUCT.md

### 3.1 为什么需要行为准则

行为准则定义了社区的**行为期望**，保护参与者免受骚扰，营造包容的环境。

### 3.2 推荐模板

GitHub 推荐使用 [Contributor Covenant](https://www.contributor-covenant.org/)：

```markdown
# Contributor Covenant Code of Conduct

## 我们的承诺

为了营造开放和友好的环境，我们作为贡献者和维护者承诺：
无论年龄、体型、残疾、种族、性别认同和表达、经验水平、
教育程度、社会经济地位、国籍、外貌、种族、宗教或性取向如何，
参与我们的社区都将为每个人提供无骚扰的体验。

## 我们的标准

积极行为包括：

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

不可接受的行为包括：

- 使用性化的语言或图像
- 挑衅、侮辱/贬损评论和人身或政治攻击
- 公开或私下的骚扰
- 未经许可发布他人的私人信息
- 其他在专业环境中可能被合理认为不适当的行为

## 执行

违反行为准则可通过 contact@example.com 报告。
```

### 3.3 添加行为准则

1. 仓库 → Add file → Create new file
2. 输入 `CODE_OF_CONDUCT.md`
3. GitHub 提供模板选择

## 4. SECURITY.md

### 4.1 安全策略模板

```markdown
# 安全策略

## 支持的版本

| 版本  | 支持状态   |
| ----- | ---------- |
| 2.x   | 安全更新   |
| 1.x   | 仅关键修复 |
| < 1.0 | 不再支持   |

## 报告安全漏洞

**请不要通过公开 Issue 报告安全漏洞。**

请发送邮件至 security@example.com，包含：

1. 漏洞描述
2. 复现步骤
3. 影响范围
4. 可能的修复方案（如有）

我们将在 48 小时内回复，7 天内提供修复方案。
```

## 5. SUPPORT.md

```markdown
# 获取帮助

## 文档

- [快速开始](docs/getting-started.md)
- [API 文档](docs/api.md)
- [常见问题](docs/faq.md)

## 社区

- [GitHub Discussions](../../discussions) - 问答和讨论
- [Discord](https://discord.gg/xxxxx) - 实时聊天

## 报告问题

- [Bug 报告](../../issues/new?template=bug_report.md)
- [功能请求](../../issues/new?template=feature_request.md)
```

## 6. 最佳实践

- 所有社区文件放在 `.github/` 目录下
- 定期更新贡献指南反映最新流程
- 行为准则提供明确的举报渠道
- 安全策略提供私密的报告方式
- 使用 GitHub 的模板功能快速创建
