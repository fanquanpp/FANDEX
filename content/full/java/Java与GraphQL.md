---
order: 75
title: Java与GraphQL
module: java
category: Java
difficulty: intermediate
description: 'GraphQL API开发'
author: fanquanpp
updated: '2026-06-14'
related:
  - java/Java与Redis
  - java/Java与Docker
  - java/Java性能调优
  - java/Java与AI
prerequisites:
  - java/概述与开发环境
---

## 概述

GraphQL 是一种 API 查询语言，由 Facebook 在 2015 年开源。与 REST 不同，GraphQL 允许客户端精确指定需要哪些数据，避免了过度获取（返回太多不需要的数据）和不足获取（需要多次请求才能拿到所有数据）的问题。

在 Java 生态中，Spring for GraphQL 是官方推荐的方案，它将 GraphQL 的能力与 Spring Boot 的开发体验结合在一起。你只需要定义 Schema、编写数据获取器（DataFetcher），Spring 就会帮你处理请求路由、参数解析、异常处理等细节。

## 基础概念

### GraphQL 核心概念

- **Schema**：GraphQL 的类型定义文件，描述了有哪些类型、查询和变更。Schema 是前后端的契约
- **Query**：查询操作，相当于 REST 的 GET，只读不修改数据
- **Mutation**：变更操作，相当于 REST 的 POST/PUT/DELETE，会修改数据
- **Subscription**：订阅操作，基于 WebSocket 实现实时数据推送
- **Resolver / DataFetcher**：解析器，为 Schema 中的每个字段提供数据获取逻辑

### GraphQL 与 REST 的区别

REST 按资源设计多个端点（/users、/users/1/posts），GraphQL 只有一个端点（/graphql），客户端通过查询语句决定返回什么数据。这意味着前端不需要后端新增接口就能获取不同组合的数据，减少了沟通成本。

### 类型系统

GraphQL 有自己的类型系统，包括标量类型（Int、String、Boolean、ID）和自定义对象类型。类型之间可以互相引用，形成图状结构，这也是 GraphQL 名称的由来。

## 快速上手

### 添加依赖

Maven 项目中添加 Spring for GraphQL 依赖：

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-graphql</artifactId>
</dependency>
```

Gradle 项目中：

```groovy
implementation 'org.springframework.boot:spring-boot-starter-graphql'
```

### 定义 Schema

在 src/main/resources/graphql/ 目录下创建 Schema 文件：

```graphql
# src/main/resources/graphql/schema.graphqls

# 定义用户类型
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

# 定义文章类型
type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}

# 查询入口
type Query {
  user(id: ID!): User
  users: [User!]!
  post(id: ID!): Post
}

# 变更入口
type Mutation {
  createUser(name: String!, email: String!): User!
  createPost(title: String!, content: String!, authorId: ID!): Post!
}
```

### 编写数据获取器

```java
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

@Controller
public class UserGraphQLController {

    private final UserService userService;
    private final PostService postService;

    public UserGraphQLController(UserService userService, PostService postService) {
        this.userService = userService;
        this.postService = postService;
    }

    // 处理 Query.user 查询
    @QueryMapping
    public User user(@Argument Long id) {
        return userService.getUser(id);
    }

    // 处理 Query.users 查询
    @QueryMapping
    public List<User> users() {
        return userService.getAllUsers();
    }

    // 处理 User.posts 字段（当查询用户的文章时调用）
    @SchemaMapping
    public List<Post> posts(User user) {
        return postService.getByUserId(user.getId());
    }
}
```

### 测试查询

启动应用后，访问 /graphql 端点，发送以下查询：

```json
{
  "query": "{ user(id: 1) { name email posts { title } } }"
}
```

返回结果只包含你请求的字段：

```json
{
  "data": {
    "user": {
      "name": "Alice",
      "email": "alice@example.com",
      "posts": [{ "title": "First Post" }, { "title": "Second Post" }]
    }
  }
}
```

## 详细用法

### 1. Mutation 变更操作

Mutation 用于创建、更新、删除数据：

```java
import org.springframework.graphql.data.method.annotation.MutationMapping;

@Controller
public class UserGraphQLController {

    // 处理 Mutation.createUser
    @MutationMapping
    public User createUser(@Argument String name, @Argument String email) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        return userService.save(user);
    }

    // 处理 Mutation.createPost
    @MutationMapping
    public Post createPost(
            @Argument String title,
            @Argument String content,
            @Argument Long authorId) {
        Post post = new Post();
        post.setTitle(title);
        post.setContent(content);
        post.setAuthorId(authorId);
        return postService.save(post);
    }
}
```

客户端调用 Mutation：

```graphql
mutation {
  createUser(name: "Bob", email: "bob@example.com") {
    id
    name
  }
}
```

### 2. 输入类型 Input Type

当 Mutation 的参数较多时，使用 Input Type 封装：

```graphql
# Schema 中定义输入类型
input CreateUserInput {
  name: String!
  email: String!
  age: Int
}

type Mutation {
  createUser(input: CreateUserInput!): User!
}
```

```java
// Java 中用记录类接收输入参数
public record CreateUserInput(String name, String email, Integer age) {}

@Controller
public class UserGraphQLController {

    @MutationMapping
    public User createUser(@Argument CreateUserInput input) {
        User user = new User();
        user.setName(input.name());
        user.setEmail(input.email());
        user.setAge(input.age());
        return userService.save(user);
    }
}
```

### 3. 分页查询

GraphQL 社区定义了分页规范（Cursor Connection），Spring for GraphQL 支持开箱即用：

```graphql
# Schema 中定义分页
type Query {
  users(first: Int, after: String): UserConnection!
}

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
```

```java
import org.springframework.data.domain.ScrollPosition;
import org.springframework.data.domain.Window;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;

@Controller
public class UserGraphQLController {

    @QueryMapping
    public Window<User> users(
            @Argument int first,
            @Argument String after) {
        // Spring Data 的 Window 类型自动映射为 Connection
        ScrollPosition position = after != null
            ? ScrollPosition.keyset(after)
            : ScrollPosition.keyset();
        return userRepository.findTop10By(position);
    }
}
```

### 4. 异常处理

GraphQL 的错误处理与 REST 不同，即使部分字段出错，也会返回 HTTP 200，错误信息放在 errors 数组中：

```java
import graphql.GraphQLError;
import graphql.GraphqlErrorBuilder;
import org.springframework.graphql.execution.DataFetcherExceptionResolver;
import org.springframework.stereotype.Component;
import java.util.List;

@Component
public class GraphQLExceptionResolver implements DataFetcherExceptionResolver {

    @Override
    public List<GraphQLError> resolveException(Throwable exception) {
        // 将业务异常转换为 GraphQL 错误
        if (exception instanceof UserNotFoundException) {
            GraphQLError error = GraphqlErrorBuilder.newError()
                .message("用户不存在: " + exception.getMessage())
                .errorType(ErrorType.NOT_FOUND)
                .build();
            return List.of(error);
        }

        // 未处理的异常返回 null，由默认处理器处理
        return null;
    }
}
```

### 5. 自定义标量类型

GraphQL 默认不支持 Date 类型，需要注册自定义标量：

```java
import graphql.schema.GraphQLScalarType;
import graphql.schema.Coercing;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Bean
public GraphQLScalarType dateScalar() {
    return GraphQLScalarType.newScalar()
        .name("Date")
        .description("日期类型，格式 yyyy-MM-dd")
        .coercing(new Coercing<LocalDate, String>() {
            @Override
            public String serialize(Object dataFetcherResult) {
                // 将 LocalDate 序列化为字符串
                return ((LocalDate) dataFetcherResult)
                    .format(DateTimeFormatter.ISO_LOCAL_DATE);
            }

            @Override
            public LocalDate parseValue(Object input) {
                // 从字符串解析为 LocalDate
                return LocalDate.parse(input.toString());
            }

            @Override
            public LocalDate parseLiteral(Object input) {
                // 从 GraphQL 字面量解析
                return LocalDate.parse(input.toString());
            }
        })
        .build();
}
```

在 Schema 中使用自定义标量：

```graphql
scalar Date

type User {
  name: String!
  birthday: Date
}
```

## 常见场景

### 场景一：多表关联查询

GraphQL 的优势在于关联查询，一次请求获取多层关联数据：

```graphql
# 一次请求获取用户及其文章和评论
query {
  user(id: 1) {
    name
    posts {
      title
      comments {
        content
        author {
          name
        }
      }
    }
  }
}
```

### 场景二：接口联合类型

当查询可能返回不同类型时，使用接口或联合类型：

```graphql
interface Node {
  id: ID!
}

type User implements Node {
  id: ID!
  name: String!
}

type Post implements Node {
  id: ID!
  title: String!
}

type Query {
  node(id: ID!): Node
}
```

```java
@QueryMapping
public Node node(@Argument Long id) {
    // 根据ID前缀判断返回哪种类型
    if (id.startsWith("user:")) {
        return userService.getUser(extractId(id));
    } else {
        return postService.getPost(extractId(id));
    }
}
```

## 注意事项与常见错误

### N+1 查询问题

GraphQL 最常见的问题是 N+1 查询：查询 10 个用户，每个用户再查文章，就会执行 1+10 次数据库查询。解决方法是使用 DataLoader 批量加载：

```java
import org.dataloader.DataLoader;
import org.dataloader.DataLoaderRegistry;
import java.util.concurrent.CompletableFuture;

// 注册 DataLoader
@Bean
public DataLoaderRegistry dataLoaderRegistry() {
    DataLoaderRegistry registry = new DataLoaderRegistry();
    registry.register("posts", DataLoader.newMappedDataLoader(userIds -> {
        // 一次性查询所有用户的文章，避免 N+1
        Map<Long, List<Post>> postsByUserId = postService.findByUserIds(userIds);
        return CompletableFuture.completedFuture(postsByUserId);
    }));
    return registry;
}

// 在 Controller 中使用 DataLoader
@SchemaMapping
public CompletableFuture<List<Post>> posts(User user, DataLoader<Long, List<Post>> dataLoader) {
    return dataLoader.load(user.getId());
}
```

### Schema 设计原则

Schema 应该以业务领域为中心设计，而不是照搬数据库表结构。GraphQL 类型可以和数据库实体不同，一个 GraphQL 字段可能聚合多个数据源的数据。

### 不要把 GraphQL 当数据库查询语言

GraphQL 查询的深度和复杂度需要限制，否则客户端可能发送极其复杂的查询导致服务端资源耗尽。可以通过配置最大查询深度来防护：

```yaml
spring:
  graphql:
    schema:
      max-query-depth: 10 # 限制查询最大深度
```

## 进阶用法

### Subscription 实时数据

GraphQL Subscription 基于 WebSocket，适合实时通知、聊天等场景：

```graphql
type Subscription {
  onNewPost: Post!
}
```

```java
import org.springframework.graphql.data.method.annotation.SubscriptionMapping;
import reactor.core.publisher.Flux;

@Controller
public class PostSubscriptionController {

    @SubscriptionMapping
    public Flux<Post> onNewPost() {
        return postService.newPostStream();
    }
}
```

### 批量加载 @BatchMapping

Spring for GraphQL 提供了 @BatchMapping 注解，简化 DataLoader 的使用：

```java
import org.springframework.graphql.data.method.annotation.BatchMapping;
import java.util.List;
import java.util.Map;

// 批量加载用户文章，自动处理 N+1 问题
@BatchMapping
public Map<User, List<Post>> posts(List<User> users) {
    // 一次查询所有用户的文章
    List<Long> userIds = users.stream().map(User::getId).toList();
    Map<Long, List<Post>> postsByUserId = postService.findByUserIds(userIds);

    // 返回用户到文章列表的映射
    return users.stream().collect(java.util.stream.Collectors.toMap(
        user -> user,
        user -> postsByUserId.getOrDefault(user.getId(), List.of())
    ));
}
```

### GraphQL Federation

在微服务架构中，GraphQL Federation 允许多个服务各自定义 Schema 的一部分，由网关合并为统一的 Schema。Spring for GraphQL 支持 Federation 规范，适合大型微服务项目的 API 统一。
