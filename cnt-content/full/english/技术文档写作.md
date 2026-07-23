---
order: 42
title: 技术文档写作
module: english
category: 'comp-sci'
difficulty: intermediate
description: '英文技术文档写作指南，涵盖 README 写作、API 文档、CHANGELOG 及技术博客写作。'
author: fanquanpp
updated: '2026-06-14'
related:
  - english/学术论文阅读指南
  - english/学术写作规范
  - english/英译汉技巧
  - english/汉译英技巧
prerequisites:
  - english/计算机专业英语词汇
---

## 1. 技术文档写作原则

### 1.1 核心原则

| 原则 | 说明             | 示例                                      |
| ---- | ---------------- | ----------------------------------------- |
| 清晰 | 表达无歧义       | Click **Submit** to save.                 |
| 简洁 | 删除多余词       | Install the package → Install the package |
| 一致 | 术语和格式统一   | 始终用 "directory" 而非混用 "folder"      |
| 准确 | 技术描述正确     | 确认版本号和命令无误                      |
| 完整 | 覆盖所有必要信息 | 包含前置条件、步骤、结果                  |

### 1.2 技术写作的语气

| 应该              | 不应该              |
| ----------------- | ------------------- |
| 直接、专业        | 冗长、口语化        |
| 主动语态为主      | 过度使用被动语态    |
| 第二人称 (you)    | 第一人称 (we/I)     |
| 祈使句 (Click...) | Clicking... will... |

## 2. README 写作

### 2.1 README 模板

````markdown
# Project Name

[![Badge](url)](url)

Brief description of what the project does.

## Features

- Feature 1
- Feature 2
- Feature 3

## Prerequisites

- Node.js >= 18
- npm >= 9

## Installation

```bash
npm install project-name
```
````

## Quick Start

```javascript
import { createApp } from 'project-name';

const app = createApp({
  option: 'value',
});

app.start();
```

## Configuration

| Option | Type   | Default   | Description               |
| ------ | ------ | --------- | ------------------------- |
| option | string | 'default' | Description of the option |

## API Reference

See [API Documentation](link).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT © Author Name

````

### 2.2 README 写作要点

| 要点 | 说明 | 示例 |
|------|------|------|
| 一句话描述 | 开头一句话说清项目 | A fast, lightweight HTTP client for Node.js |
| 安装命令 | 提供可直接复制的命令 | `npm install axios` |
| 最小示例 | 提供可运行的最小代码 | 见 Quick Start |
| 版本徽章 | 显示项目状态 | ![npm version] ![build status] |
| 徽章不过度 | 3-5 个即可 | 不要堆砌过多徽章 |

### 2.3 常用表达

| 功能 | 表达 |
|------|------|
| 项目描述 | A [adjective] [category] for [platform] that [benefit] |
| 安装 | Install via [package manager]: `command` |
| 快速开始 | Get started in seconds: |
| 配置 | Configure [project] by setting the following options: |
| 贡献 | Contributions are welcome! Please read [guidelines]. |
| 许可证 | [Project] is released under the [License] License. |

## 3. API 文档写作

### 3.1 API 文档结构

每个 API 端点应包含：

| 要素 | 说明 | 示例 |
|------|------|------|
| HTTP 方法 | GET/POST/PUT/DELETE | `POST /api/v1/users` |
| 描述 | 端点功能说明 | Creates a new user account |
| 认证 | 是否需要认证 | Requires Bearer token |
| 请求参数 | 参数名、类型、必填、描述 | `name` (string, required) - User's full name |
| 请求体 | JSON 格式示例 | `{"name": "John", "email": "john@example.com"}` |
| 响应 | 状态码和响应体 | `201 Created` with user object |
| 错误响应 | 错误码和错误信息 | `400 Bad Request` - Invalid email format |
| 示例 | 完整请求/响应示例 | cURL 命令 |

### 3.2 API 文档示例

```markdown
### Create User

`POST /api/v1/users`

Creates a new user account.

**Authentication:** Requires a valid Bearer token.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | User's full name (2-100 characters) |
| email | string | Yes | Valid email address |
| role | string | No | User role. One of: `admin`, `user`. Default: `user` |

**Example Request:**

```bash
curl -X POST https://api.example.com/v1/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Doe", "email": "jane@example.com"}'
````

**Success Response (201 Created):**

```json
{
  "id": "usr_abc123",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "user",
  "created_at": "2026-06-14T10:00:00Z"
}
```

**Error Responses:**

| Status | Code          | Description                                 |
| ------ | ------------- | ------------------------------------------- |
| 400    | INVALID_EMAIL | The email format is invalid.                |
| 401    | UNAUTHORIZED  | Authentication token is missing or invalid. |
| 409    | EMAIL_EXISTS  | A user with this email already exists.      |

````

### 3.3 API 文档写作规范

| 规范 | 说明 |
|------|------|
| 使用一致的大小写 | API → API (非 api) |
| 参数用反引号 | `user_id` 而非 user_id |
| 示例用真实数据 | 避免用 foo/bar |
| 标注必填/可选 | required/optional |
| 版本号明确 | /api/v1/ |
| 包含边界条件 | 最大长度、取值范围 |

## 4. CHANGELOG 写作

### 4.1 CHANGELOG 格式

遵循 [Keep a Changelog](https://keepachangelog.com/) 规范：

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-06-14

### Added
- New `batch()` method for bulk operations
- Support for TypeScript 5.5

### Changed
- Updated minimum Node.js version to 18
- Improved error messages for validation failures

### Deprecated
- `oldMethod()` will be removed in v2.0.0

### Removed
- Dropped support for Node.js 16

### Fixed
- Memory leak in long-running connections
- Incorrect timezone handling in date formatting

### Security
- Patched CVE-2026-1234 in dependency `lodash`
````

### 4.2 CHANGELOG 写作要点

| 要点       | 说明                                            |
| ---------- | ----------------------------------------------- |
| 按版本组织 | 每个版本一个段落                                |
| 按类型分类 | Added/Changed/Deprecated/Removed/Fixed/Security |
| 日期标注   | 每个版本标注发布日期                            |
| 面向用户   | 描述用户可见的变化                              |
| 关联 Issue | 可关联 Issue 编号                               |

## 5. 技术博客写作

### 5.1 技术博客结构

```
标题 → 吸引读者，点明主题
    ↓
引言 → 问题背景，为什么写这篇文章
    ↓
正文 → 解决方案/教程步骤
    ↓
代码示例 → 可运行的完整代码
    ↓
总结 → 回顾要点，展望未来
```

### 5.2 技术博客写作技巧

**标题写作：**

| 类型   | 格式                                 | 示例                                         |
| ------ | ------------------------------------ | -------------------------------------------- |
| 教程型 | How to [do something] with [tool]    | How to Build a REST API with Express.js      |
| 列表型 | [Number] [Tips/Tools] for [purpose]  | 10 VS Code Extensions for Python Developers  |
| 对比型 | [A] vs [B]: Which Should You Choose? | React vs. Vue: A Comprehensive Comparison    |
| 问题型 | Solving [problem] in [context]       | Solving Memory Leaks in Node.js Applications |

**代码示例：**

| 规范       | 说明                 |
| ---------- | -------------------- |
| 完整可运行 | 代码应可直接复制运行 |
| 添加注释   | 关键步骤加注释说明   |
| 渐进式     | 从简单到复杂逐步展开 |
| 标注版本   | 注明依赖版本号       |
| 提供仓库   | 链接完整代码仓库     |

**排版规范：**

| 规范       | 说明             |
| ---------- | ---------------- |
| 短段落     | 每段 2-4 句      |
| 多用列表   | 步骤和要点用列表 |
| 加粗关键词 | 重要术语加粗     |
| 配图说明   | 代码配合截图     |
| 目录导航   | 长文加目录       |

## 6. 技术写作常用句式

### 6.1 描述操作步骤

| 句式                  | 示例                                       |
| --------------------- | ------------------------------------------ |
| To [do X], [do Y]     | To install the package, run `npm install`. |
| [Do X] to [achieve Y] | Click **Save** to apply your changes.      |
| Use [tool] to [do X]  | Use the CLI to generate a new project.     |
| [Action] the [object] | Open the configuration file.               |

### 6.2 描述功能特性

| 句式                                   | 示例                                         |
| -------------------------------------- | -------------------------------------------- |
| [Feature] enables/allows you to [do X] | The plugin enables syntax highlighting.      |
| With [feature], you can [do X]         | With caching, you can reduce response times. |
| [Feature] provides [benefit]           | The API provides real-time data access.      |
| [Tool] supports [feature]              | Express supports middleware-based routing.   |

### 6.3 描述错误和解决方案

| 句式                                  | 示例                                                      |
| ------------------------------------- | --------------------------------------------------------- |
| If [error] occurs, [solution]         | If the connection times out, increase the timeout value.  |
| [Error] indicates that [cause]        | A 404 error indicates that the resource was not found.    |
| To resolve [error], [solution]        | To resolve the dependency conflict, update the package.   |
| Make sure [condition] before [action] | Make sure Node.js is installed before running the script. |

### 6.4 描述版本变更

| 句式                                                    | 示例                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| [Version] adds/introduces [feature]                     | v2.0 adds support for WebSocket connections.                 |
| [Feature] has been deprecated in favor of [alternative] | `oldMethod()` has been deprecated in favor of `newMethod()`. |
| [Version] removes [feature]                             | v3.0 removes the legacy authentication module.               |
| [Version] fixes [issue]                                 | v1.1.1 fixes a critical security vulnerability.              |

```

```
