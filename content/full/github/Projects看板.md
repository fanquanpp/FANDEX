---
order: 55
title: Projects看板
module: github
category: GitHub
difficulty: intermediate
description: 'GitHub Projects看板：项目管理、自动化工作流与视图配置。'
author: fanquanpp
updated: '2026-06-14'
related:
  - github/依赖安全选项
  - github/Fork工作流
  - github/知识库
  - github/社区讨论
prerequisites:
  - github/GitHub概述
---

## 1. Projects 概述

### 1.1 什么是 GitHub Projects

GitHub Projects 是内置的**项目管理工具**，支持看板视图、表格视图和路线图，可以关联 Issue、PR 和草稿。

### 1.2 Projects V2 特性

| 特性           | 说明                         |
| :------------- | :--------------------------- |
| **多视图**     | 看板、表格、路线图           |
| **自定义字段** | 文本、数字、日期、单选、迭代 |
| **自动化**     | 状态变更自动移动卡片         |
| **过滤器**     | 按字段筛选和分组             |
| **跨仓库**     | 聚合多个仓库的 Issue         |

## 2. 创建项目

### 2.1 创建组织项目

1. 组织页面 → Projects → New project
2. 选择模板（Board / Table / Roadmap）
3. 添加仓库和团队

### 2.2 创建仓库项目

1. 仓库 → Projects → New project
2. 自动关联当前仓库

## 3. 自定义字段

### 3.1 字段类型

| 类型              | 说明     | 示例               |
| :---------------- | :------- | :----------------- |
| **Text**          | 自由文本 | 备注、描述         |
| **Number**        | 数字     | 优先级、故事点     |
| **Date**          | 日期     | 截止日期           |
| **Single select** | 单选     | 状态、类型         |
| **Iteration**     | 迭代周期 | Sprint 1、Sprint 2 |

### 3.2 推荐字段配置

```
Status: Backlog → Todo → In Progress → In Review → Done
Priority:  Critical →  High →  Medium →  Low
Type:  Bug →  Feature →  Chore →  Docs
Sprint: Sprint 1, Sprint 2, Sprint 3...
Estimate: 1, 2, 3, 5, 8, 13
```

## 4. 自动化工作流

### 4.1 内置自动化

| 触发条件   | 自动操作                  |
| :--------- | :------------------------ |
| Issue 创建 | 添加到项目，状态设为 Todo |
| PR 创建    | 状态设为 In Review        |
| PR 合并    | 状态设为 Done             |
| Issue 关闭 | 状态设为 Done             |

### 4.2 GitHub Actions 自动化

```yaml
# .github/workflows/project-automation.yml
name: Project Automation
on:
  issues:
    types: [opened, labeled]
  pull_request:
    types: [opened]

jobs:
  add-to-project:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/add-to-project@v1.0.2
        with:
          project-url: https://github.com/orgs/myorg/projects/1
          github-token: ${{ secrets.PROJECT_TOKEN }}
          labeled: bug, feature
```

### 4.3 GraphQL 自动化

```graphql
mutation {
  addProjectV2ItemById(input: { projectId: "PROJECT_ID", contentId: "ISSUE_ID" }) {
    item {
      id
    }
  }
}
```

## 5. 视图配置

### 5.1 看板视图

按状态分列的拖拽式看板：

```
| Backlog | Todo | In Progress | In Review | Done |
|---------|------|-------------|-----------|------|
| Issue#5 | #3   | #1          | #2        | #4   |
| Issue#8 | #6   |             |           | #7   |
```

### 5.2 表格视图

类似电子表格，支持排序、筛选和分组：

```
| Title | Status | Priority | Sprint | Assignee |
|-------|--------|----------|--------|----------|
| Auth  | Done   | High     | S1     | Alice    |
| API   | Active | Medium   | S2     | Bob      |
```

### 5.3 路线图视图

按时间线展示项目进度，适合展示里程碑。

## 6. Insights 与报告

### 6.1 项目统计

- 完成率
- 燃尽图
- 按标签/类型分布
- 按成员工作量

### 6.2 导出数据

```bash
# 使用 GitHub CLI 导出
gh project item-list 1 --owner myorg --format json > project.json
```
