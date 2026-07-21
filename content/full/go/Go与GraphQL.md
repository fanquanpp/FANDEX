---
order: 62
title: Go与GraphQL
module: go
category: Go
difficulty: intermediate
description: 'gqlgen GraphQL框架'
author: fanquanpp
updated: '2026-06-14'
related:
  - go/内存对齐
  - go/Go与gRPC
  - go/Go与Docker
  - go/Go与Kubernetes
prerequisites:
  - go/概述与环境配置
---

## 概述

GraphQL 是一种 API 查询语言，由 Facebook 开发。与 REST API 不同，GraphQL 允许客户端精确指定需要的数据字段，避免过度获取或获取不足。Go 社区中最成熟的 GraphQL 框架是 gqlgen，它采用代码优先（schema-first）的方式，先定义 GraphQL Schema，然后自动生成类型安全的 Go 代码。

## 基础概念

在开始编码之前，需要理解 GraphQL 的几个核心概念：

- **Schema**：GraphQL 的类型定义文件，描述了 API 支持哪些查询、变更和类型。
- **Query**：读取数据的操作，类似 REST 的 GET。
- **Mutation**：修改数据的操作，类似 REST 的 POST/PUT/DELETE。
- **Resolver**：解析器函数，负责为 Schema 中的每个字段提供实际数据。
- **类型（Type）**：GraphQL 中的数据模型，类似 Go 的结构体。
- **输入类型（Input）**：用于 Mutation 参数的特殊类型。

GraphQL 的优势在于：客户端按需获取字段、一次请求获取多个资源、强类型系统自动生成文档。

## 快速上手

### 初始化项目

```bash
# 创建项目目录
mkdir mygraph && cd mygraph
go mod init mygraph

# 安装 gqlgen
go get github.com/99designs/gqlgen

# 初始化 gqlgen 项目
go run github.com/99designs/gqlgen init
```

初始化后，项目结构如下：

```
mygraph/
  graph/
    schema.graphqls    # GraphQL Schema 定义
    resolver.go        # 根解析器
    model/             # 自动生成的模型
    generated.go       # 自动生成的代码（不要手动修改）
  server.go            # HTTP 服务器入口
```

### 定义 Schema

编辑 `graph/schema.graphqls`：

```graphql
# 定义数据类型
type User {
  id: ID!
  name: String!
  email: String!
  age: Int
}

# 查询：获取用户列表
type Query {
  users: [User!]!
  user(id: ID!): User
}

# 变更：创建用户
input NewUser {
  name: String!
  email: String!
  age: Int
}

type Mutation {
  createUser(input: NewUser!): User!
}
```

### 重新生成代码

每次修改 Schema 后，需要重新生成代码：

```bash
go run github.com/99designs/gqlgen generate
```

### 实现 Resolver

编辑 `graph/resolver.go`，实现具体的业务逻辑：

```go
package graph

import (
    "context"
    "fmt"
    "mygraph/graph/model"
)

// 用户数据存储（实际项目中使用数据库）
var users []*model.User
var nextID int = 1

// 查询所有用户
func (r *queryResolver) Users(ctx context.Context) ([]*model.User, error) {
    return users, nil
}

// 根据 ID 查询用户
func (r *queryResolver) User(ctx context.Context, id string) (*model.User, error) {
    for _, u := range users {
        if u.ID == id {
            return u, nil
        }
    }
    return nil, fmt.Errorf("用户不存在: %s", id)
}

// 创建用户
func (r *mutationResolver) CreateUser(ctx context.Context, input model.NewUser) (*model.User, error) {
    user := &model.User{
        ID:    fmt.Sprintf("%d", nextID),
        Name:  input.Name,
        Email: input.Email,
        Age:   input.Age,
    }
    nextID++
    users = append(users, user)
    return user, nil
}
```

### 运行服务器

```bash
go run server.go
```

访问 `http://localhost:8080/` 可以打开 GraphQL Playground，在其中执行查询：

```graphql
# 创建用户
mutation {
  createUser(input: { name: "小明", email: "ming@example.com", age: 25 }) {
    id
    name
    email
  }
}

# 查询所有用户
query {
  users {
    id
    name
    email
    age
  }
}

# 只查询名字（按需获取字段）
query {
  users {
    name
  }
}
```

## 详细用法

### 1. 关联类型

GraphQL 支持类型之间的关联关系：

```graphql
type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}

type User {
  id: ID!
  name: String!
  posts: [Post!]!
}

type Query {
  posts: [Post!]!
}
```

对应的 Resolver：

```go
// 查询文章列表
func (r *queryResolver) Posts(ctx context.Context) ([]*model.Post, error) {
    return posts, nil
}

// 查询文章的作者（关联查询）
func (r *postResolver) Author(ctx context.Context, obj *model.Post) (*model.User, error) {
    for _, u := range users {
        if u.ID == obj.AuthorID {
            return u, nil
        }
    }
    return nil, fmt.Errorf("作者不存在")
}

// 查询用户的文章列表
func (r *userResolver) Posts(ctx context.Context, obj *model.User) ([]*model.Post, error) {
    var result []*model.Post
    for _, p := range posts {
        if p.AuthorID == obj.ID {
            result = append(result, p)
        }
    }
    return result, nil
}
```

### 2. 分页查询

使用 GraphQL 的 Connection 模式实现分页：

```graphql
type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}

type Query {
  users(first: Int, after: String): UserConnection!
}
```

### 3. 订阅（Subscription）

Subscription 用于实时推送数据更新：

```graphql
type Subscription {
  userCreated: User!
}
```

Resolver 实现：

```go
func (r *subscriptionResolver) UserCreated(ctx context.Context) (<-chan *model.User, error) {
    ch := make(chan *model.User)
    // 监听用户创建事件
    r.userCreatedCh <- ch
    go func() {
        <-ctx.Done()
        close(ch)
    }()
    return ch, nil
}
```

### 4. 认证中间件

在 Resolver 中获取请求上下文进行认证：

```go
// 在 HTTP 中间件中设置用户信息
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        if token != "" {
            user := validateToken(token)
            ctx := context.WithValue(r.Context(), "user", user)
            r = r.WithContext(ctx)
        }
        next.ServeHTTP(w, r)
    })
}

// 在 Resolver 中获取用户
func (r *mutationResolver) CreateUser(ctx context.Context, input model.NewUser) (*model.User, error) {
    user := ctx.Value("user")
    if user == nil {
        return nil, fmt.Errorf("未认证")
    }
    // ... 创建用户逻辑
}
```

### 5. 错误处理

GraphQL 有自己的错误格式：

```go
import "github.com/99designs/gqlgen/graphql"

func (r *mutationResolver) CreateUser(ctx context.Context, input model.NewUser) (*model.User, error) {
    if input.Name == "" {
        // 返回带错误码的 GraphQL 错误
        return nil, graphql.ErrorOnPath(ctx, fmt.Errorf("用户名不能为空"))
    }
    // ...
}
```

### 6. 自定义标量

GraphQL 默认支持 Int、Float、String、Boolean、ID。可以自定义标量类型：

```graphql
scalar Time

type Event {
  id: ID!
  name: String!
  createdAt: Time!
}
```

在 gqlgen.yml 中配置映射：

```yaml
models:
  Time:
    model: github.com/99designs/gqlgen/graphql.Time
```

## 常见场景

### 场景一：REST 迁移到 GraphQL

逐步迁移，先包装现有 REST API：

```go
func (r *queryResolver) Users(ctx context.Context) ([]*model.User, error) {
    // 调用现有的 REST API
    resp, err := http.Get("http://api.internal/users")
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var users []*model.User
    json.NewDecoder(resp.Body).Decode(&users)
    return users, nil
}
```

### 场景二：多数据源聚合

GraphQL 的优势之一是可以在一个请求中聚合多个数据源：

```go
func (r *userResolver) Posts(ctx context.Context, obj *model.User) ([]*model.Post, error) {
    // 从文章服务获取
    return postService.GetByAuthor(ctx, obj.ID)
}

func (r *userResolver) Orders(ctx context.Context, obj *model.User) ([]*model.Order, error) {
    // 从订单服务获取
    return orderService.GetByUser(ctx, obj.ID)
}
```

### 场景三：N+1 查询优化

使用 DataLoader 批量加载数据，避免 N+1 问题：

```go
import "github.com/graph-gophers/dataloader/v7"

// 创建 DataLoader
userLoader := dataloader.NewBatchedLoader(func(ctx context.Context, keys []string) []*dataloader.Result[*model.User] {
    // 批量查询所有用户
    users := db.GetUsersByIDs(keys)
    results := make([]*dataloader.Result[*model.User], len(keys))
    for i, key := range keys {
        results[i] = &dataloader.Result[*model.User]{Data: users[key]}
    }
    return results
})

// 在 Resolver 中使用
func (r *postResolver) Author(ctx context.Context, obj *model.Post) (*model.User, error) {
    thunk := userLoader.Load(ctx, obj.AuthorID)
    result, err := thunk()
    return result, err
}
```

## 注意事项与常见错误

1. **不要手动修改 generated.go**：这个文件由 gqlgen 自动生成，修改后会在下次生成时被覆盖。所有自定义逻辑写在 resolver.go 中。

2. **Schema 变更后必须重新生成**：修改 `schema.graphqls` 后，必须运行 `go run github.com/99designs/gqlgen generate` 更新代码。

3. **N+1 查询问题**：如果 User 有一个 posts 字段，查询 10 个用户时会触发 10 次文章查询。使用 DataLoader 批量加载解决。

4. **Context 传递**：GraphQL 的 Context 与 HTTP 的 Context 是同一个，可以在中间件中设置值，在 Resolver 中读取。

5. **空值处理**：Schema 中带 `!` 的字段表示非空，Resolver 必须返回非 nil 值。不带 `!` 的字段可以返回 nil。

## 进阶用法

### 自定义模型

默认情况下 gqlgen 会根据 Schema 自动生成模型。如果需要使用自定义模型，在 `gqlgen.yml` 中配置：

```yaml
models:
  User:
    model: myapp/models.User
```

### 指令（Directive）

自定义指令实现横切关注点：

```graphql
directive @auth(role: String!) on FIELD_DEFINITION

type Query {
  adminData: String! @auth(role: "admin")
}
```

### Federation（联邦）

多个 GraphQL 服务可以组合成一个统一的 API：

```bash
go get github.com/99designs/gqlgen/plugin/federation
```

在 `gqlgen.yml` 中启用：

```yaml
federation:
  filename: graph/federation.go
  package: graph
```
