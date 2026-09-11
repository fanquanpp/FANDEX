---
order: 530
title: gh api 调用命令速查手册
module: 'github'
category: 工具链
difficulty: beginner
description: 原理驱动讲解 gh api：先讲清 REST 与 GraphQL API 是什么，再讲 gh api 如何完成认证请求、传参、输出处理、分页与 GraphQL 查询，配以错误对策。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---


## 开篇：把 API 想成"万能遥控器 + 电器说明书"

电视遥控器只能按预设按钮；而真正的"万能遥控器"能直接输入指令码，控制任何家电。GitHub 的 **API（应用程序接口）** 就是这样的万能遥控器：任何操作——查仓库、建 Issue、改标签、删发布——都可以不通过网页，而通过一段"指令"完成。

但万能遥控器要能工作，你得有一本**说明书**：哪个地址对应哪个功能？要传什么参数？这本说明书就是 GitHub 的 **API 文档**（REST 参考手册、GraphQL 参考手册）。

`gh api` 命令，就是"**已插好电池、已对准电视**"的万能遥控器：它自动携带你的登录凭证，你只需要照着说明书报指令码即可，不用再手动处理认证、请求头、JSON 解析这些琐事。

---

## 原理第一课：REST API 与 GraphQL API 是什么

### 1.1 直观理解：REST 像"查字典"，GraphQL 像"点菜"

- **REST API（GitHub API v3）**：每个资源都有一个固定网址（端点）。"仓库"在 `/repos/owner/repo`，"Issue 列表"在 `/repos/owner/repo/issues`。你想拿什么数据，就访问对应网址，返回一大坨 JSON。就像查字典：翻到固定页码，能看到这页的所有内容（可能有很多你不需要的）。

- **GraphQL API（GitHub API v4）**：只有一个入口，你在请求里"声明"你要什么字段。就像点菜：告诉服务员"只要这个菜、不加葱"，厨房只按你要的做。返回体更小、结构更精确。

### 1.2 实操层面的差别

| 对比项 | REST（v3） | GraphQL（v4） |
| --- | --- | --- |
| 入口 | 成百上千个网址（端点） | 单一入口 `graphql` |
| 请求方式 | GET / POST / PATCH / DELETE | POST（带查询语句） |
| 返回内容 | 固定结构的 JSON（可能多余） | 完全按你声明的字段返回 |
| 学习曲线 | 直观、文档多 | 需要学查询语法，但更灵活 |

`gh api` 对两者都支持：传一个路径就是 REST，传 `graphql` 就是 GraphQL。

### 1.3 几个"地基"概念

- **端点（endpoint）**：REST 里的网址路径，如 `repos/cli/cli`。
- **占位符**：`gh api` 支持在端点里写 `{owner}`、`{repo}`、`{branch}`，gh 会从当前目录的仓库自动替换。例如在 `cli/cli` 仓库里执行 `gh api repos/{owner}/{repo}` 等价于 `gh api repos/cli/cli`。注意：PowerShell 里含 `{}` 的值最好加引号。
- **认证**：`gh api` 自动使用 `gh auth login` 的凭证，无需手动加 token。
- **方法（method）**：GET（读）、POST（新建）、PATCH（部分修改）、PUT（整体覆盖）、DELETE（删除）。

---

## 原理第二课：gh api 的三个自动行为

理解了以下三点，大部分命令就不会写错：

1. **默认方法**：默认是 GET；**一旦你加了 `-f`/`-F` 参数，自动变为 POST**。想"带参数的 GET"，必须显式写 `--method GET`。
2. **参数类型**：`-f/--raw-field` 永远当**字符串**；`-F/--field` 有**魔法类型转换**（`true`/`false`/`null`/整数自动转成 JSON 类型；值以 `@` 开头则从文件读取）。
3. **输出**：默认打印完整 JSON；可用 `--jq`（jq 语法提取）、`--template`（Go 模板）、`--json`（配合部分命令）。

---

## 场景一：读数据（GET，最常用）

```bash
# 获取当前登录用户信息
gh api user

# 获取某个仓库的信息（在仓库目录内可省略 owner/repo，用占位符）
gh api repos/cli/cli
gh api repos/{owner}/{repo}

# 列出仓库的 issue（返回 JSON 数组）
gh api repos/cli/cli/issues

# 列出当前仓库的所有 release
gh api repos/{owner}/{repo}/releases

# 带查询参数的 GET（注意：必须显式 -X GET，否则会被当成 POST）
gh api -X GET search/issues -f q='repo:cli/cli is:open'

# 自定义请求头（例如获取原始文件内容）
gh api -H 'Accept: application/vnd.github.v3.raw+json' repos/{owner}/{repo}/readme
```

返回示例（`gh api repos/cli/cli` 的一段）：

```json
{
  "id": 212613049,
  "name": "cli",
  "full_name": "cli/cli",
  "description": "GitHub’s official command line tool",
  "stargazers_count": 38000,
  "html_url": "https://github.com/cli/cli"
}
```

---

## 场景二：写数据（POST / PATCH / DELETE）

### 2.1 创建 Issue（POST + 字符串参数）

```bash
# -f 传字符串参数；加了 -f 后自动变成 POST
gh api repos/{owner}/{repo}/issues \
  -f title="Bug 报告：登录闪退" \
  -f body="复现步骤：1. 点击登录 2. 页面闪退"

# 指定标签（某些端点接受 labels 数组；数组语法见 2.3）
gh api repos/{owner}/{repo}/issues \
  -f title="bug: 登录闪退" \
  -f body="详情描述" \
  -F 'labels[]=bug'
```

### 2.2 类型化参数（-F 魔法转换）

```bash
# milestone 是数字，用 -F 才能正确传成 JSON 数字
gh api repos/{owner}/{repo}/issues -F milestone=12 -f title="里程碑 12 的任务"

# 布尔值同样用 -F
gh api user/repos -F name=new-repo -F private=true -F auto_init=true

# 从文件读取字段值（@ 语法；- 表示标准输入）
gh api user/repos -f name=@repo-name.txt
gh api gists -F 'files[myfile.txt][content]=@myfile.txt'
```

### 2.3 嵌套与数组参数

```bash
# 嵌套对象：key[subkey]=value
gh api -X PATCH orgs/{org}/properties/schema \
  -F 'properties[][property_name]=environment' \
  -F 'properties[][default_value]=production'

# 数组：声明多个同名 key[]
gh api repos/{owner}/{repo}/issues -f title="任务" -F 'labels[]=bug' -F 'labels[]=help-wanted'

# 空数组：key[] 不带值
gh api repos/{owner}/{repo}/issues -f title="任务" -F 'assignees[]'
```

### 2.4 请求体从文件读取（--input）

```bash
# 请求体直接来自 JSON 文件（复杂 payload 的推荐做法）
gh api repos/{owner}/{repo}/labels --input labels.json

# 从标准输入读取请求体
echo '{"name":"bug","color":"d73a4a"}' | gh api repos/{owner}/{repo}/labels --input -
```

### 2.5 删除操作

```bash
# 删除（DELETE 方法）
gh api repos/{owner}/{repo}/issues/42 -X DELETE --silent
```

---

## 场景三：处理输出（--jq / --template）

API 返回的 JSON 往往很大，99% 的时候你只想要其中几个字段。

### 3.1 jq 语法提取

```bash
# 只取仓库的 full_name 字段
gh api user/repos --jq '.[].full_name'

# 只取 Issue 的标题与编号
gh api repos/{owner}/{repo}/issues --jq '.[] | "\(.number) \(.title)"'

# 统计数量（length）
gh api repos/{owner}/{repo}/issues --jq 'length'

# 条件过滤：只取被标记为 bug 的 issue 标题
gh api repos/{owner}/{repo}/issues --jq '.[] | select(.labels[].name == "bug") | .title'
```

### 3.2 Go 模板输出

```bash
# 用模板格式化（适合生成报告文本）
gh api repos/{owner}/{repo}/issues --template \
  '{{range .}}{{.title}} ({{.number}}){{"\n"}}{{end}}'
```

### 3.3 静默模式

```bash
# 不打印响应体（只看操作是否成功，用于脚本）
gh api repos/{owner}/{repo}/issues/42 -X PATCH -f state=closed --silent
```

---

## 场景四：分页（--paginate）

列表接口默认每页最多 100 条，数据多时只返回第一页。`--paginate` 自动翻完所有页：

```bash
# 自动获取所有页的 issue 标题
gh api repos/{owner}/{repo}/issues --paginate --jq '.[].title'

# 把多页数组合并成一个外层数组（--slurp）
gh api user/repos --paginate --slurp --jq 'length'
```

---

## 场景五：GraphQL 查询

GraphQL 请求把查询语句放在 `-f query=...` 中，其余字段作为变量传入：

```bash
# 查当前用户最近 3 个仓库的名字
gh api graphql -f query='
  query {
    viewer {
      repositories(first: 3) {
        nodes { name }
      }
    }
  }
'

# 带变量（-F 传入变量值，注意不是字符串）
gh api graphql -F owner='{owner}' -F name='{repo}' -f query='
  query($name: String!, $owner: String!) {
    repository(owner: $owner, name: $name) {
      releases(last: 3) { nodes { tagName } }
    }
  }
'

# GraphQL 分页（查询中需声明 $endCursor 并返回 pageInfo）
gh api graphql --paginate -f query='
  query($endCursor: String) {
    viewer {
      repositories(first: 100, after: $endCursor) {
        nodes { nameWithOwner }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
'
```

---

## 场景六：调试与排查（--include / --verbose）

```bash
# 显示响应头与状态码（看限流、看缓存头）
gh api user --include

# 显示完整请求与响应（排查参数传错等）
gh api user --verbose

# 开启响应缓存（--cache，例如缓存 1 小时，减少重复请求）
gh api user --cache 1h
```

`--include` 输出示例（前面是响应头，空行后是响应体）：

```text
HTTP/2.0 200 OK
content-type: application/json; charset=utf-8
x-ratelimit-remaining: 4999
...

{"login":"fanquanpp", ...}
```

---

## 常见错误与对策

| 新手常见错误 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 加了 -f 却想要 GET | 报方法不允许或行为异常 | 加参数后自动变 POST | 显式写 `-X GET` |
| 数字/布尔传错类型 | 接口提示类型错误 | 用了 `-f`（一律按字符串） | 改用 `-F` 触发类型转换 |
| 未登录调用 | `authentication failed` | 没有凭证 | 先 `gh auth login` |
| PowerShell 中 { } 报错 | 端点被 shell 展开或报错 | `{}` 有特殊含义 | 用引号包裹端点：`gh api "repos/{owner}/{repo}"` |
| 404 找不到资源 | `HTTP 404` | 端点路径写错或资源私有 | 核对 REST 参考手册路径；检查资源可见性 |
| 403 限流 | `rate limit exceeded` | 请求过于频繁 | 查看 `--include` 的 `x-ratelimit-remaining`；稍后重试或加 `--cache` |
| 把 query 当普通字段传 | GraphQL 报语法错误 | GraphQL 的查询必须放在 `query` 字段 | 用 `-f query=...` 传递查询语句 |
| 分页结果重复/不全 | 只有部分数据 | 未理解分页机制 | 加 `--paginate`；多页数组合并用 `--slurp` |

---

## 一句话记忆

**gh api 是带认证的"万能遥控器"：路径是 REST、`graphql` 是 v4，加 `-f` 自动变 POST，`-F` 自动转类型，`--jq` 裁剪输出，`--paginate` 翻页——一切以官方 API 手册为准。**
