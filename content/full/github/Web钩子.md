---
order: 64
title: Webhooks
module: github
category: GitHub
difficulty: intermediate
description: 'GitHub Webhooks详解：事件订阅、负载格式与安全验证。'
author: fanquanpp
updated: '2026-06-14'
related:
  - github/命令行工具
  - 'github/REST与GraphQL-API'
  - github/包管理服务
  - github/在线开发环境
prerequisites:
  - github/GitHub概述
---

## 1. Webhooks 概述

### 1.1 什么是 Webhooks

Webhooks 是 GitHub 在特定事件发生时向指定 URL 发送的 **HTTP POST 请求**，实现事件驱动的集成。

### 1.2 工作原理

```
GitHub 事件 → Webhook → 你的服务器 → 处理逻辑
```

## 2. 创建 Webhook

### 2.1 通过界面创建

1. 仓库 Settings → Webhooks → Add webhook
2. 配置 Payload URL
3. 选择 Content type（JSON 推荐）
4. 选择 Secret
5. 选择触发事件
6. 保存

### 2.2 通过 API 创建

```bash
gh api repos/user/repo/hooks \
  -f name=web \
  -f active=true \
  -f "events[]=push" \
  -f "events[]=pull_request" \
  -f "config[url]=https://example.com/webhook" \
  -f "config[content_type]=json" \
  -f "config[secret]=my-secret-key"
```

## 3. 事件类型

### 3.1 常用事件

| 事件                  | 触发条件             |
| :-------------------- | :------------------- |
| `push`                | 代码推送             |
| `pull_request`        | PR 创建/更新/关闭    |
| `issues`              | Issue 创建/更新/关闭 |
| `issue_comment`       | Issue 评论           |
| `pull_request_review` | PR 审查              |
| `release`             | 发布创建             |
| `workflow_run`        | Actions 运行         |
| `star`                | 仓库被标星           |

### 3.2 选择事件

- **只选需要的事件**，减少不必要的请求
- 使用 `*` 订阅所有事件（不推荐）

## 4. 负载格式

### 4.1 push 事件示例

```json
{
  "ref": "refs/heads/main",
  "before": "abc1234",
  "after": "def5678",
  "repository": {
    "id": 123456,
    "name": "my-repo",
    "full_name": "user/my-repo",
    "html_url": "https://github.com/user/my-repo"
  },
  "sender": {
    "login": "username",
    "id": 789012
  },
  "commits": [
    {
      "id": "def5678",
      "message": "feat: add auth",
      "author": {
        "name": "Zhang San",
        "email": "zhang@example.com"
      }
    }
  ]
}
```

## 5. 安全验证

### 5.1 签名验证

```javascript
// Node.js 验证 Webhook 签名
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature =
    'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
```

### 5.2 安全最佳实践

- 始终设置 Secret 并验证签名
- 使用 HTTPS 端点
- 限制 IP 来源（GitHub IP 范围）
- 验证事件类型后再处理
- 处理超时和重试

## 6. 服务器实现

### 6.1 Express 示例

```javascript
const express = require('express');
const app = express();

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  if (!verifyWebhook(req.body, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.headers['x-github-event'];
  const payload = JSON.parse(req.body);

  switch (event) {
    case 'push':
      console.log(`Push to ${payload.ref}`);
      break;
    case 'pull_request':
      console.log(`PR #${payload.number} ${payload.action}`);
      break;
  }

  res.status(200).send('OK');
});

app.listen(3000);
```
