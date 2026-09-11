---
order: 320
title: REST 与 GraphQL API
module: 'github'
category: 工具链
difficulty: advanced
description: GitHub API详解：REST与GraphQL双路线对比（餐厅点餐类比）、认证方式、curl/gh api调用与速率限制。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'github/300-CodeQLCodeScanning'
prerequisites:
  - 'github/010-GitHubOverview'
---


## 0. 先来一个生活场景：餐厅点餐菜单

去餐厅吃饭，你有两种点餐方式：

**方式一：套餐菜单（REST API）**

服务员递给你一本固定菜单，每个套餐都写好了内容：A 套餐（饭 + 汤 + 小菜），B 套餐（面 + 饮料）。你想吃"只要饭和汤，不要小菜"？抱歉，套餐是固定的——你只能点 A 套餐，然后**浪费掉**不想要的小菜，或者再点一个 B 套餐多付一份钱。想要完整信息，你可能要点好几个套餐。

**方式二：自助点餐（GraphQL API）**

餐厅提供一张"食材清单"，你想怎么搭配就怎么搭配：饭 + 汤，只要这两个。一份订单（一次请求），精确拿到你要的东西，不多不少。

这就是 **REST API** 与 **GraphQL API** 的本质区别：

| 维度 | REST（套餐菜单） | GraphQL（自助点餐） |
| :--- | :--- | :--- |
| 端点数量 | 多个固定端点 | 一个统一端点 |
| 返回内容 | 服务器固定，可能多余 | 你指定要什么字段，返回什么 |
| 请求次数 | 复杂数据常需多次请求 | 通常一次请求搞定 |
| 灵活度 | 低 | 高 |
| 学习门槛 | 低 | 中 |

GitHub 同时提供这两种 API，供不同场景选用。本文采用**对比驱动**的结构：从点餐类比出发，先对比两条路线的核心差异，再分别实战（REST 用 curl、GraphQL 用查询语句，两者都用 `gh api`），最后讲清楚认证与速率限制这两个绕不开的话题。

## 1. 两条路线总览

### 1.1 核心差异表

| 特性 | REST API | GraphQL API |
| :--- | :--- | :--- |
| 版本 | v3 | v4 |
| 基础 URL | `https://api.github.com` | `https://api.github.com/graphql` |
| 数据格式 | JSON | JSON |
| 获取数据 | 按端点固定返回 | 按需声明字段 |
| 组合数据 | 多次请求拼装 | 一次请求嵌套获取 |
| 变更操作 | POST / PATCH / DELETE | mutation |
| 文档形态 | 端点清单 | 交互式 Schema 浏览器 |

### 1.2 直观理解：一个例子看出差距

需求："获取我最近 5 个仓库的名称、Star 数和最近一次提交信息。"

**REST 方式**（至少两次请求）：

```bash
# 第一次：拿仓库列表
curl -H "Authorization: Bearer ghp_xxx" \
  "https://api.github.com/user/repos?sort=updated&per_page=5"
# 返回：5 个仓库 + 每个仓库的几十个字段（大量用不到）

# 第二次：对每个仓库再查最近提交（5 次额外请求）
curl -H "Authorization: Bearer ghp_xxx" \
  "https://api.github.com/repos/{owner}/{repo}/commits?per_page=1"
```

**GraphQL 方式**（一次请求）：

```graphql
query {
  viewer {
    repositories(first: 5, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes {
        name
        stargazerCount
        defaultBranchRef {
          target {
            ... on Commit {
              messageHeadline
            }
          }
        }
      }
    }
  }
}
```

对比结论：REST 适合简单、直接的单资源操作；GraphQL 适合"一次拿全关联数据"的复杂场景。

## 2. 认证：进入餐厅的"会员卡"

调用 API 前必须先认证。GitHub 支持四类凭据：

| 凭据类型 | 适用场景 | 权限控制 |
| :--- | :--- | :--- |
| **Personal Access Token（Classic）** | 个人脚本、命令行 | 粗粒度（scope，如 `repo`） |
| **Personal Access Token（Fine-grained）** | 个人使用（官方推荐） | 细粒度（限定仓库 + 精确权限） |
| **GitHub App Token** | 应用/机器人长期集成 | 按安装授权 |
| **OAuth App Token** | 第三方网站/应用 | 用户授权 |

### 2.1 创建 Token

1. GitHub → Settings → Developer settings → Personal access tokens。
2. 选择 Fine-grained（推荐）或 Classic。
3. 配置权限范围（如仓库读写、Issue 管理）。
4. 生成后**立即复制保存**（只显示一次）。

### 2.2 使用 Token

```bash
# REST：Authorization 头（推荐 Bearer 前缀）
curl -H "Authorization: Bearer ghp_xxxxx" https://api.github.com/user

# GraphQL：同样是 Bearer，但必须用 POST
curl -H "Authorization: Bearer ghp_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ viewer { login } }"}' \
  https://api.github.com/graphql

# gh CLI：登录一次，自动带 Token
gh auth login
gh api user
```

### 2.3 Token 安全要点

- Token 等同于密码，**不要提交到仓库**（见 018 文档密钥扫描）。
- 用环境变量或 `gh auth` 管理，而不是写进脚本。
- 泄露后立即在 Developer settings 中撤销重建。

## 3. 路线一：REST API 实战

### 3.1 常用端点速查

| 操作 | 方法 | 端点 |
| :--- | :--- | :--- |
| 获取当前用户 | GET | `/user` |
| 列出我的仓库 | GET | `/user/repos` |
| 获取仓库详情 | GET | `/repos/{owner}/{repo}` |
| 列出 Issue | GET | `/repos/{owner}/{repo}/issues` |
| 创建 Issue | POST | `/repos/{owner}/{repo}/issues` |
| 列出 PR | GET | `/repos/{owner}/{repo}/pulls` |
| 合并 PR | PUT | `/repos/{owner}/{repo}/pulls/{n}/merge` |
| 创建 Release | POST | `/repos/{owner}/{repo}/releases` |

### 3.2 用 curl 调用（带注释）

```bash
# 获取用户信息
curl -H "Authorization: Bearer ghp_xxxxx" \
  https://api.github.com/user

# 列出仓库（分页参数 per_page，默认 30，最大 100）
curl -H "Authorization: Bearer ghp_xxxxx" \
  "https://api.github.com/user/repos?per_page=10&sort=updated"

# 创建 Issue（POST + JSON 请求体）
curl -X POST \
  -H "Authorization: Bearer ghp_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"title":"Bug report","body":"描述一下问题","labels":["bug"]}' \
  https://api.github.com/repos/octocat/Hello-World/issues
```

### 3.3 用 gh api 调用（推荐）

`gh api` 是 GitHub 官方 CLI 对 REST API 的封装，自动处理认证、JSON 格式化、错误输出：

```bash
# 等价于上面的操作，语法更简洁
gh api user
gh api "user/repos?per_page=10&sort=updated"
gh api repos/octocat/Hello-World/issues \
  -f title="Bug report" \
  -f body="描述一下问题" \
  -f labels='["bug"]'

# 处理 JSON 结果（配合 jq 提取字段）
gh api user --jq '.login, .followers'
```

### 3.4 分页处理

REST API 的分页是新手常踩的坑：默认一页 30 条，超过部分不返回。

```bash
# 方式1：手动翻页（Link 响应头）
curl -I "https://api.github.com/user/repos"
# 响应头中的 Link 字段包含 next 页 URL

# 方式2：gh api 自动翻页（--paginate）
gh api --paginate "user/repos" --jq '.[].name'
```

## 4. 路线二：GraphQL API 实战

### 4.1 基本查询语法

GraphQL 三个基本操作：`query`（查询）、`mutation`（变更）、`subscription`（订阅，GitHub 未提供）。结构为"要什么写什么"：

```graphql
# 查询：获取当前用户及其前 10 个仓库
query {
  viewer {
    login
    repositories(first: 10, orderBy: { field: UPDATED_AT, direction: DESC }) {
      nodes {
        name
        description
        stargazerCount
      }
    }
  }
}
```

要点：

- `viewer`：代表当前认证用户。
- `first: 10`：连接分页参数（REST 用 per_page，GraphQL 用 first/after 游标）。
- 字段嵌套即关联查询：仓库里直接带出 Star 数，不用二次请求。

### 4.2 变更操作（mutation）

```graphql
# 创建 Issue
mutation {
  createIssue(input: {
    repositoryId: "R_kgXXXXX"
    title: "Bug report"
    body: "描述一下问题"
    labelIds: ["LA_XXXX"]
  }) {
    issue {
      number
      url
    }
  }
}
```

注意：mutation 通常需要**对象 ID**（如 `repositoryId`），而对象 ID 一般要通过查询先拿到：

```graphql
query {
  repository(owner: "octocat", name: "Hello-World") {
    id          # 拿到的 ID 再传给 mutation
  }
}
```

### 4.3 用 gh api 调用 GraphQL

```bash
# -F 传变量（比字符串拼接安全）
gh api graphql -F query='
  query($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      name
      stargazerCount
    }
  }
' -f owner=octocat -f name=Hello-World

# 简单查询直接内联
gh api graphql -f query='{ viewer { login repositories(first: 5) { nodes { name } } } }'
```

### 4.4 什么时候选 GraphQL

- 需要一次获取多层关联数据（仓库 + Star + 最近提交）。
- 希望减少网络请求次数、按需取字段。
- 移动端/低带宽场景（省流量）。

## 5. 速率限制：餐厅的"限流规则"

为了防止滥用，GitHub 对 API 调用有明确配额。**配额按认证方式计算**，未认证的请求与匿名用户无异。

### 5.1 REST 主速率限制

| 认证状态 | 限制 |
| :--- | :--- |
| 未认证 | 60 次/小时（按 IP 计） |
| 个人访问 Token / OAuth / GitHub App | 5,000 次/小时 |
| GitHub Enterprise Cloud 组织拥有的应用 | 15,000 次/小时 |

### 5.2 GraphQL 点数限制

GraphQL 不用"次数"，而是**点数（points）**：每个查询按复杂度计分，普通查询通常 1 点。认证用户限额 **5,000 点/小时**。一次复杂查询可能消耗多点数，但远低于多次 REST 请求的消耗。

### 5.3 检查剩余配额

```bash
# REST：查看响应头
curl -I https://api.github.com/user
# X-RateLimit-Limit: 5000
# X-RateLimit-Remaining: 4999
# X-RateLimit-Reset: 1785638400   （UTC 时间戳）

# REST：专用端点（认证后）
gh api rate_limit

# GraphQL：查询 rateLimit 字段
gh api graphql -f query='{ rateLimit { limit cost remaining resetAt } }'
```

### 5.4 避免触发限制的五个习惯

1. **总是认证**：未认证只有 60 次/小时，很快耗尽。
2. **用条件请求**：利用 ETag / If-Modified-Since 头，未变化时返回 304，不消耗配额。
3. **优先 GraphQL**：一次请求代替多次 REST 请求。
4. **用 Webhooks 替代轮询**：让 GitHub 主动推送事件，而不是反复查询（见 022 文档）。
5. **处理好 403/429**：遇到 `rate limit exceeded` 时，按 `Retry-After` 头或 `X-RateLimit-Reset` 等待后重试。

## 6. 场景选型：REST 还是 GraphQL？

| 场景 | 推荐 | 理由 |
| :--- | :--- | :--- |
| 简单单资源操作（查用户、建 Issue） | REST | 端点直接，文档清晰 |
| 脚本化批量操作 | REST + gh api | 语法简单，易调试 |
| 一次拿全关联数据 | GraphQL | 减少请求数，按需取字段 |
| 移动端应用 | GraphQL | 省流量、省电量 |
| 实时事件推送 | Webhooks | 比任何轮询都高效 |

## 7. 常见错误与对策

| 错误现象 | 报错/表现 | 原因 | 解决办法 |
| :--- | :--- | :--- | :--- |
| 401 Unauthorized | `Bad credentials` | Token 无效、过期或权限不足 | 重新生成 Token；检查 scope 是否覆盖目标操作 |
| 403 rate limit | `API rate limit exceeded` | 配额耗尽（常见于未认证或循环调用） | 认证后调用；用 `rate_limit` 端点查看；等待 Reset 时间 |
| 404 找不到资源 | `Not Found` | 常见原因：Token 无该仓库权限（GitHub 对无权限返回 404 而非 403） | 检查 Token 权限范围；确认仓库名/路径拼写 |
| GraphQL 报 `Field must not have selection` | 语法错误 | 查询了对象字段但未展开子字段 | 为对象字段补充 `{ ... }` 子选择集 |
| 只想取部分数据却拿到一大包 | 响应体积大、慢 | 用了 REST 套餐端点 | 改用 GraphQL 按需声明字段 |
| 分页只返回一页 | 数据不全 | REST 默认 per_page=30 且未处理分页 | 用 `per_page=100` + `--paginate` 或 Link 头翻页 |
| Token 误提交到仓库 | 密钥扫描告警 | Token 硬编码进代码 | 撤销 Token；改用环境变量或 gh auth |

## 9. 一句话记忆

> **REST 是"套餐菜单"，端点固定、简单直接；GraphQL 是"自助点餐"，一次请求按需取字段——记住：简单操作用 REST，关联数据用 GraphQL，实时事件用 Webhooks，所有调用都要带上认证并留意速率限制。**

### 官方文档

- REST API 速率限制（官方）：https://docs.github.com/zh/rest/using-the-rest-api/rate-limits-for-the-rest-api
- GraphQL 速率限制与查询限制（官方）：https://docs.github.com/zh/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api
- REST API 认证：https://docs.github.com/zh/rest/authentication/authenticating-to-the-rest-api
- GraphQL 文档与 Schema 浏览器：https://docs.github.com/zh/graphql

### 延伸阅读
- Webhooks（事件驱动的另一种数据获取方式），见 004-github 模块 022 文档。
- GitHub CLI（gh api 的完整语法），见 004-github 模块 020 与 054 文档。
- 密钥扫描（Token 的安全管理），见 004-github 模块 018 文档。
