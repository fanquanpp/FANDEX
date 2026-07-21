---
order: 58
title: 'GitHub-Copilot'
module: github
category: GitHub
difficulty: intermediate
description: 'GitHub Copilot详解：AI辅助编程工具的使用、配置与最佳实践。'
author: fanquanpp
updated: '2026-06-14'
related:
  - github/知识库
  - github/社区讨论
  - github/依赖自动更新
  - 'github/Issues模板-标签与里程碑'
prerequisites:
  - github/GitHub概述
---

## 1. Copilot 概述

### 1.1 什么是 GitHub Copilot

GitHub Copilot 是基于 AI 的**编程助手**，由 GitHub 和 OpenAI 合作开发，提供代码补全、聊天和生成功能。

### 1.2 Copilot 产品线

| 产品                   | 功能                     | 价格      |
| :--------------------- | :----------------------- | :-------- |
| **Copilot Free**       | 基础补全（2000次/月）    | 免费      |
| **Copilot Pro**        | 无限补全 + Chat + Claude | $10/月    |
| **Copilot Business**   | 团队管理 + 策略          | $19/月/人 |
| **Copilot Enterprise** | 企业知识库 + 自定义      | $39/月/人 |

## 2. 核心功能

### 2.1 代码补全

编辑代码时，Copilot 自动建议后续代码：

```javascript
// 输入函数签名
function fibonacci(n) {
  // Copilot 自动补全
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
```

### 2.2 Copilot Chat

在编辑器中与 AI 对话：

- 解释代码
- 生成测试
- 修复 Bug
- 重构代码

### 2.3 Copilot CLI

终端中的 AI 助手：

```bash
# 安装
gh extension install github/gh-copilot

# 使用
gh copilot suggest "find all js files modified in last week"
gh copilot explain "git rebase -i HEAD~5"
```

## 3. 配置与自定义

### 3.1 .github/copilot-instructions.md

在仓库中创建指令文件，定制 Copilot 的行为：

```markdown
# Copilot Instructions

## 项目概述

这是一个 Vue 3 + TypeScript 项目，使用 Pinia 状态管理。

## 编码规范

- 使用 Composition API，不使用 Options API
- 使用 `<script setup>` 语法
- 类型优先使用 interface 而非 type
- 组件名使用 PascalCase
- 文件名使用 kebab-case

## 测试要求

- 使用 Vitest 编写测试
- 每个组件至少有一个测试文件
```

### 3.2 忽略建议

```bash
# 临时忽略
# 按 Esc 拒绝建议

# 配置忽略文件
# .github/copilot-ignore
*.secret
.env
```

## 4. 最佳实践

### 4.1 有效使用

- 写清晰的注释和函数名，帮助 Copilot 理解意图
- 提供示例输入/输出，让 Copilot 生成更准确的代码
- 审查所有建议，不要盲目接受
- 使用 Copilot Chat 解释不熟悉的代码

### 4.2 安全注意事项

- 不要让 Copilot 处理敏感信息（密码、密钥）
- 审查生成的代码是否有安全漏洞
- 了解 Copilot 可能生成与训练数据相似的代码
- 使用 Copilot Business 的数据保护功能

### 4.3 提高建议质量

```javascript
//  模糊的注释
// 处理数据
function process(data) {

//  清晰的注释
// 将用户数据转换为 API 请求格式，过滤无效邮箱
function formatUserForAPI(users: User[]): APIUser[] {
```
