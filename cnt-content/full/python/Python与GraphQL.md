---
order: 84
title: Python与GraphQL
module: python
category: Python
difficulty: intermediate
description: GraphQL API开发
author: fanquanpp
updated: '2026-06-14'
related:
  - python/Python与FastAPI
  - python/Python与OAuth2
  - python/Python与Redis
  - python/Python与SQLAlchemy
prerequisites:
  - python/语法速查
---

## 什么是 GraphQL

GraphQL 是一种 API 查询语言，由 Facebook 开发。与 REST API 不同，GraphQL 让客户端自己决定需要哪些数据，不多不少。在 REST 中，一个接口返回固定的字段，你可能获取了太多不需要的数据，或者需要调用多个接口才能获取足够的数据。GraphQL 用一个接口解决了这个问题。

GraphQL 的核心思想是：客户端描述需要的数据结构，服务端返回完全匹配的数据。这避免了过度获取（获取了不需要的字段）和不足获取（需要调用多个接口）的问题。

## 基础概念

### Schema（模式）

Schema 定义了 API 的类型系统，描述了有哪些数据类型、每个类型有哪些字段、支持哪些查询和变更。Schema 是客户端和服务端之间的契约。

### Query（查询）

Query 是读取数据的操作，类似于 REST 的 GET 请求。客户端在 Query 中指定需要的字段，服务端只返回这些字段。

### Mutation（变更）

Mutation 是修改数据的操作，类似于 REST 的 POST/PUT/DELETE 请求。用于创建、更新、删除数据。

### Resolver（解析器）

Resolver 是服务端处理每个字段的函数。当客户端请求某个字段时，对应的 Resolver 被调用来获取数据。

### Type（类型）

GraphQL 有内置的标量类型（Int、Float、String、Boolean、ID），也支持自定义对象类型。每个类型有一组字段，字段可以有参数。

## 快速上手

### 安装

```bash
# 安装 Strawberry GraphQL（现代的 Python GraphQL 库）
pip install strawberry-graphql fastapi

# 或者安装 Graphene（老牌 GraphQL 库）
# pip install graphene
```

### 最简单的 GraphQL API

```python
# app.py
import strawberry
from strawberry.fastapi import GraphQLRouter
from fastapi import FastAPI

# 定义 GraphQL 类型
@strawberry.type
class User:
    name: str
    age: int
    email: str

# 模拟数据
users_db = [
    User(name="张三", age=25, email="zhangsan@example.com"),
    User(name="李四", age=30, email="lisi@example.com"),
]

# 定义 Query（查询操作）
@strawberry.type
class Query:
    @strawberry.field
    def users(self) -> list[User]:
        """获取所有用户"""
        return users_db

    @strawberry.field
    def user(self, name: str) -> User | None:
        """按名字查询用户"""
        for u in users_db:
            if u.name == name:
                return u
        return None

# 创建 GraphQL Schema
schema = strawberry.Schema(query=Query)

# 集成到 FastAPI
app = FastAPI()
graphql_app = GraphQLRouter(schema)
app.include_router(graphql_app, prefix="/graphql")
```

运行：

```bash
uvicorn app:app --reload
```

访问 http://localhost:8000/graphql 可以打开交互式查询界面（GraphQL Playground）。

### 查询示例

客户端发送以下查询：

```graphql
# 获取所有用户，但只要 name 和 age 字段
query {
  users {
    name
    age
  }
}
```

服务端返回：

```json
{
  "data": {
    "users": [
      { "name": "张三", "age": 25 },
      { "name": "李四", "age": 30 }
    ]
  }
}
```

注意：虽然 User 类型有 email 字段，但因为查询中没有请求 email，所以返回数据中不包含它。

```graphql
# 按名字查询用户
query {
  user(name: "张三") {
    name
    email
  }
}
```

## 详细用法

### 定义 Mutation（数据变更）

```python
import strawberry
from strawberry.fastapi import GraphQLRouter
from fastapi import FastAPI

@strawberry.type
class Article:
    id: int
    title: str
    content: str
    author: str

articles_db: list[Article] = []
next_id = 1

@strawberry.type
class Query:
    @strawberry.field
    def articles(self) -> list[Article]:
        """获取所有文章"""
        return articles_db

    @strawberry.field
    def article(self, article_id: int) -> Article | None:
        """按 ID 获取文章"""
        for a in articles_db:
            if a.id == article_id:
                return a
        return None

# 定义输入类型（用于 Mutation 的参数）
@strawberry.input
class ArticleInput:
    title: str
    content: str
    author: str

# 定义 Mutation
@strawberry.type
class Mutation:
    @strawberry.mutation
    def create_article(self, input: ArticleInput) -> Article:
        """创建文章"""
        global next_id
        article = Article(
            id=next_id,
            title=input.title,
            content=input.content,
            author=input.author,
        )
        articles_db.append(article)
        next_id += 1
        return article

    @strawberry.mutation
    def delete_article(self, article_id: int) -> bool:
        """删除文章"""
        for i, a in enumerate(articles_db):
            if a.id == article_id:
                articles_db.pop(i)
                return True
        return False

schema = strawberry.Schema(query=Query, mutation=Mutation)
app = FastAPI()
app.include_router(GraphQLRouter(schema), prefix="/graphql")
```

Mutation 查询示例：

```graphql
# 创建文章
mutation {
  createArticle(
    input: { title: "GraphQL 入门", content: "这是一篇关于 GraphQL 的教程", author: "张三" }
  ) {
    id
    title
  }
}

# 删除文章
mutation {
  deleteArticle(articleId: 1)
}
```

### 关联类型

```python
import strawberry

@strawberry.type
class Author:
    id: int
    name: str
    email: str

@strawberry.type
class Book:
    id: int
    title: str
    author_id: int

    # 关联字段：通过 Resolver 获取作者信息
    @strawberry.field
    def author(self, info) -> Author:
        """获取书籍的作者"""
        return get_author_by_id(self.author_id)

authors_db = [
    Author(id=1, name="张三", email="zhangsan@example.com"),
    Author(id=2, name="李四", email="lisi@example.com"),
]

books_db = [
    Book(id=1, title="Python 入门", author_id=1),
    Book(id=2, title="GraphQL 实战", author_id=1),
    Book(id=3, title="Web 开发指南", author_id=2),
]

def get_author_by_id(author_id: int) -> Author:
    for a in authors_db:
        if a.id == author_id:
            return a
    raise ValueError(f"作者 ID {author_id} 不存在")
```

查询关联数据：

```graphql
# 获取书籍及其作者信息
query {
  books {
    title
    author {
      name
      email
    }
  }
}
```

### 枚举类型

```python
import strawberry

@strawberry.enum
class Status:
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

@strawberry.type
class Post:
    id: int
    title: str
    status: Status

@strawberry.type
class Query:
    @strawberry.field
    def posts(self, status: Status | None = None) -> list[Post]:
        """按状态过滤文章"""
        if status:
            return [p for p in posts_db if p.status == status]
        return posts_db
```

### 分页查询

```python
import strawberry
from typing import Generic, TypeVar

T = TypeVar("T")

# 通用分页类型
@strawberry.type
class Pagination(Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int

@strawberry.type
class Query:
    @strawberry.field
    def articles(self, page: int = 1, page_size: int = 10) -> Pagination[Article]:
        """分页获取文章"""
        start = (page - 1) * page_size
        end = start + page_size
        items = articles_db[start:end]
        return Pagination(
            items=items,
            total=len(articles_db),
            page=page,
            page_size=page_size,
        )
```

## 常见场景

### 与 SQLAlchemy 集成

```python
import strawberry
from strawberry.fastapi import GraphQLRouter
from sqlalchemy import select
from sqlalchemy.orm import Session

# 将 SQLAlchemy 模型转换为 GraphQL 类型
@strawberry.type
class UserType:
    id: int
    name: str
    email: str

    @classmethod
    def from_orm(cls, user):
        """从 ORM 模型创建 GraphQL 类型"""
        return cls(id=user.id, name=user.name, email=user.email)

@strawberry.type
class Query:
    @strawberry.field
    def users(self, info) -> list[UserType]:
        """获取所有用户"""
        db: Session = info.context["db"]
        users = db.execute(select(User)).scalars().all()
        return [UserType.from_orm(u) for u in users]

    @strawberry.field
    def user(self, info, user_id: int) -> UserType | None:
        """按 ID 获取用户"""
        db: Session = info.context["db"]
        user = db.get(User, user_id)
        return UserType.from_orm(user) if user else None
```

## 注意事项与常见错误

### N+1 查询问题

GraphQL 的关联查询容易产生 N+1 问题。比如查询 10 本书及其作者，可能产生 1 次查书 + 10 次查作者 = 11 次数据库查询。解决方法是使用 DataLoader 批量加载。

### 查询深度限制

恶意客户端可能发送极深层嵌套的查询，消耗服务器资源。应该限制查询深度：

```python
from strawberry.extensions import QueryDepthLimiter

schema = strawberry.Schema(
    query=Query,
    extensions=[QueryDepthLimiter(max_depth=5)]
)
```

### 不要把 GraphQL 当数据库

GraphQL 是 API 层，不是数据库。不要把数据库表结构直接暴露为 GraphQL 类型。应该设计面向客户端的 API 类型，在 Resolver 中做数据转换。

## 进阶用法

### 使用 DataLoader 批量加载

```bash
pip install strawberry-graphql
```

```python
from strawberry.dataloader import DataLoader

async def load_authors(author_ids: list[int]) -> list[Author]:
    """批量加载作者"""
    authors = await batch_get_authors(author_ids)
    return [next((a for a in authors if a.id == aid), None) for aid in author_ids]

author_loader = DataLoader(load_authors)

@strawberry.type
class Book:
    id: int
    title: str
    author_id: int

    @strawberry.field
    async def author(self, info) -> Author:
        """使用 DataLoader 批量加载作者"""
        return await info.context["author_loader"].load(self.author_id)
```

### 订阅（Subscription）

GraphQL 订阅支持实时数据推送：

```python
import asyncio
import strawberry

@strawberry.type
class Subscription:
    @strawberry.subscription
    async def message_added(self, room_id: str) -> str:
        """订阅新消息"""
        while True:
            message = await get_new_message(room_id)
            if message:
                yield message
            await asyncio.sleep(1)
```
