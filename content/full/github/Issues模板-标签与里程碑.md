---
order: 60
tags:
  - github
difficulty: intermediate
title: 'Issues 模板、标签与里程碑'
module: github
category: 'GitHub Advanced'
description: 'Issues 模板配置、Labels、Milestones、自动化关闭关键词与项目板衔接。'
author: Anonymous
related:
  - github/AI编程助手
  - github/依赖自动更新
  - github/密钥扫描
  - github/CodeQL代码扫描
prerequisites:
  - github/GitHub概述
---

## 1. 背景

**Issue（议题）** 用于跟踪缺陷、功能请求与讨论。**模板（template）** 统一报告格式，降低沟通成本；**Labels（标签）** 分类与筛选；**Milestones（里程碑）** 聚合版本目标与进度。

## 2. Issue 模板详解

### 2.1 模板类型

GitHub 支持多种类型的 Issue 模板：

- **Bug 报告**：用于报告软件缺陷
- **功能请求**：用于提出新功能建议
- **问题讨论**：用于一般性讨论
- **文档更新**：用于文档相关的问题
- **自定义模板**：根据项目需求创建特定模板

### 2.2 模板配置

#### 2.2.1 文件结构

在仓库根目录创建 `.github/ISSUE_TEMPLATE/` 目录，然后添加相应的模板文件：

```
 .github/
 └── ISSUE_TEMPLATE/
  ├── bug_report.md
  ├── feature_request.md
  ├── question.md
  └── config.yml
```

#### 2.2.2 YAML 前置元数据

每个模板文件都需要包含 YAML 前置元数据：

```markdown
- name: 模板名称
  about: 模板用途
  title: "[前缀] 标题"
  labels: 标签1, 标签2
  assignees: 处理人
-
```

#### 2.2.3 完整模板示例

##### 2.2.3.1 Bug 报告模板

```markdown
- name: Bug 报告
  about: 报告可复现的缺陷
  title: "[BUG] "
  labels: bug
  templates: bug_report.md
  assignees: ""
-

## 环境

-
-
-

## 复现步骤

1.  打开应用
2.  点击 X 按钮
3.  输入 Y
4.  观察结果

## 期望行为

描述你期望看到的结果

## 实际行为

描述实际发生的情况

## 截图

如果适用，请添加截图来帮助解释问题

## 额外信息

任何其他相关信息
```

##### 2.2.3.2 功能请求模板

```markdown
- name: 功能请求
  about: 建议新功能
  title: "[FEATURE] "
  labels: enhancement
  templates: feature_request.md
  assignees: ""
-

## 功能描述

简要描述你希望添加的功能

## 问题背景

解释为什么需要这个功能，它解决了什么问题

## 实现建议

描述你希望如何实现这个功能

## 额外信息

任何其他相关信息
```

### 2.3 模板配置文件

使用 `config.yml` 文件可以自定义 Issue 模板选择界面：

```yaml
 blank_issues_enabled: false
 contact_links:
  - name: 社区支持
  url: https://github.com/org/repo/discussions
  about: 对于一般问题，请使用讨论区
  - name: 文档
  url: https://docs.example.com
  about: 查看官方文档
```

## 3. 标签管理

### 3.1 标签类型

常见的标签类型包括：

- **类型标签**：`bug`、`enhancement`、`documentation`、`question`
- **优先级标签**：`high-priority`、`medium-priority`、`low-priority`
- **状态标签**：`needs-triage`、`in-progress`、`review-needed`、`fixed`
- **难度标签**：`good-first-issue`、`help-wanted`、`difficult`
- **模块标签**：`frontend`、`backend`、`database`、`api`

### 3.2 标签最佳实践

- **命名规范**：使用小写字母，单词之间用连字符连接
- **颜色一致性**：为同类标签使用相似的颜色
- **描述清晰**：为每个标签添加描述，说明其用途
- **数量控制**：保持标签数量合理，避免过多标签
- **团队统一**：在组织内统一标签命名和使用规范

### 3.3 标签管理工具

- **GitHub 网页界面**：在仓库的 Issues 页面管理标签
- **GitHub CLI**：使用 `gh label` 命令管理标签
- **GitHub Actions**：使用自动化工具自动管理标签

## 4. 里程碑管理

### 4.1 里程碑创建

1. 访问仓库的 Issues 页面
2. 点击 **Milestones** 选项卡
3. 点击 **New milestone** 按钮
4. 填写里程碑名称、描述和截止日期
5. 点击 **Create milestone** 按钮

### 4.2 里程碑使用

- **关联 Issue**：在创建或编辑 Issue 时，选择相应的里程碑
- **关联 PR**：在创建或编辑 PR 时，选择相应的里程碑
- **跟踪进度**：里程碑页面会显示完成百分比
- **管理截止日期**：定期更新里程碑的截止日期

### 4.3 里程碑最佳实践

- **命名规范**：使用版本号（如 `v1.0.0`）或迭代名称（如 `Sprint 1`）
- **合理范围**：每个里程碑包含适量的 Issue，避免过多或过少
- **明确目标**：为每个里程碑设置明确的目标和交付物
- **定期检查**：定期检查里程碑进度，及时调整计划

## 5. 自动化工具

### 5.1 GitHub Actions 自动化

#### 5.1.1 自动打标签

```yaml
 name: Label issues and PRs
 on:
  issues:
  types: [opened, edited]
  pull_request:
  types: [opened, edited]
 jobs:
  label:
  runs-on: ubuntu-latest
  steps:
  - uses: actions/labeler@v5
  with:
  repo-token: "${{ secrets.GITHUB_TOKEN }}"
```

#### 5.1.2 自动分配 Issue

```yaml
name: Auto assign issues
on:
  issues:
  types: [opened]
jobs:
  assign:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/assign@v1
  with:
  repo-token: '${{ secrets.GITHUB_TOKEN }}'
  assignees: 'username1, username2'
```

### 5.2 第三方工具

- **Dependabot**：自动检测和更新依赖
- **CodeQL**：自动代码质量检查
- **Probot**：可自定义的 GitHub 机器人
- **ZenHub**：增强的项目管理功能

## 6. 项目板与 Issues 集成

### 6.1 项目板创建

1. 访问仓库的 Projects 页面
2. 点击 **New project** 按钮
3. 选择模板或创建空白项目
4. 配置项目板列（如 To Do, In Progress, Review, Done）

### 6.2 工作流程

- **添加 Issue**：将 Issue 拖放到相应的列
- **设置状态**：通过移动卡片来更新 Issue 状态
- **跟踪进度**：查看项目板上的整体进度
- **团队协作**：团队成员可以实时看到项目状态

## 7. 常见问题与解决方案

### 7.1 Issue 模板问题

#### 7.1.1 模板不显示

- **问题**：创建 Issue 时看不到模板选项
- **解决方案**：

1.  检查模板文件路径是否正确（`.github/ISSUE_TEMPLATE/`）
2.  检查模板文件的 YAML 前置元数据是否正确
3.  确认仓库的 Issues 功能是否已启用
4.  尝试使用 GitHub 网页向导重新设置模板

#### 7.1.2 模板内容不完整

- **问题**：模板缺少必要的字段
- **解决方案**：

1.  检查模板文件内容是否完整
2.  根据项目需求添加或修改字段
3.  测试模板是否能正常使用

### 7.2 标签与里程碑问题

#### 7.2.1 标签过多

- **问题**：仓库中标签数量过多，难以管理
- **解决方案**：

1.  清理冗余或不常用的标签
2.  合并相似的标签
3.  建立标签使用规范

#### 7.2.2 里程碑进度不准确

- **问题**：里程碑的完成百分比与实际情况不符
- **解决方案**：

1.  确保所有相关 Issue 都已关联到里程碑
2.  及时更新 Issue 状态
3.  定期检查里程碑进度

### 7.3 自动化问题

#### 7.3.1 GitHub Actions 失败

- **问题**：自动打标签或分配 Issue 的 Actions 失败
- **解决方案**：

1.  检查 Actions 日志，了解失败原因
2.  确认 GITHUB_TOKEN 权限是否正确
3.  检查 workflow 文件语法是否正确

#### 7.3.2 自动关闭 Issue 不生效

- **问题**：使用关键词后 Issue 没有自动关闭
- **解决方案**：

1.  确认关键词格式是否正确
2.  确认 PR 是否合并到默认分支
3.  对于 fork 仓库，确认是否使用了正确的跨仓库引用格式

## 8. 最佳实践

### 8.1 Issue 管理

- **搜索先于创建**：创建新 Issue 前，先搜索是否已有相关 Issue
- **清晰描述**：提供详细、准确的 Issue 描述
- **及时更新**：定期更新 Issue 状态和进展
- **合理分类**：使用标签和里程碑对 Issue 进行分类
- **关闭策略**：定期清理已解决或过时的 Issue

### 8.2 团队协作

- **CONTRIBUTING.md**：提供贡献指南，说明如何报告 Issue
- **模板标准化**：使用统一的 Issue 模板
- **标签规范**：建立团队统一的标签使用规范
- **里程碑规划**：合理规划里程碑，避免过度承诺
- **定期回顾**：定期回顾 Issue 处理情况，改进流程

### 8.3 安全与隐私

- **安全漏洞**：使用 Security advisories 而非公开 Issue
- **敏感信息**：避免在 Issue 中包含敏感信息
- **隐私保护**：尊重用户隐私，不公开用户信息
- **访问控制**：合理设置仓库访问权限

## 9. 实际应用案例

### 9.1 开源项目案例

#### 9.1.1 案例描述

- **项目**：一个流行的开源库
- **规模**： hundreds of contributors
- **Issue 管理**：使用多种模板和标签

#### 9.1.2 实践

1. **模板**：使用 bug 报告、功能请求、文档更新等模板
2. **标签**：使用类型、优先级、状态等标签
3. **里程碑**：按版本号设置里程碑
4. **自动化**：使用 GitHub Actions 自动打标签和分配 Issue
5. **项目板**：使用项目板跟踪开发进度

### 9.2 企业项目案例

#### 9.2.1 案例描述

- **项目**：企业内部应用
- **团队**：10 人开发团队
- **流程**：敏捷开发

#### 9.2.2 实践

1. **模板**：定制化的 Issue 模板，包含项目特定字段
2. **标签**：与企业流程对应的标签
3. **里程碑**：按 sprint 设置里程碑
4. **自动化**：集成企业内部工具
5. **项目板**：与敏捷流程对应，包含 To Do, In Progress, Review, Done 等列

## 10. 延伸阅读

- [Configuring issue templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests) <!-- nofollow -->
- [Managing labels](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels) <!-- nofollow -->
- [Managing milestones](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-milestones) <!-- nofollow -->
- [About project boards](https://docs.github.com/en/issues/organizing-your-work-with-project-boards/about-project-boards) <!-- nofollow -->
- [GitHub Actions documentation](https://docs.github.com/en/actions) <!-- nofollow -->

## 更新日志

- **2026-04-05**：初版。
- **2026-05-03**：扩展内容，添加 Issue 模板的详细配置和类型、标签的最佳实践和管理、里程碑的创建和使用、自动化工具和工作流、项目板集成、实际应用案例、更多最佳实践和常见问题的解决方案。
