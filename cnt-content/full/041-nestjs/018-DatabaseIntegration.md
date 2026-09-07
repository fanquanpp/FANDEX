---
order: 180
title: NestJS 接入数据库（Prisma + PostgreSQL）
module: 'nestjs'
category: 后端技术
difficulty: intermediate
description: ConfigModule 管理环境变量，Prisma 定义模型并完成建表、CRUD 与模块注入。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'nestjs/017-ValidationPipes'
  - 'postgresql/001-OverviewInstallConfig'
  - 'typescript/011-FunctionGeneric'
prerequisites:
  - 'nestjs/017-ValidationPipes'
  - 'postgresql/001-OverviewInstallConfig'
---

## 0. 一句话理解

> 数据库接入 = 环境变量管连接串 + ORM 管模型与查询 + 模块管注入；NestJS 里 Prisma 是最主流的组合。

## 1. 安装与初始化

```bash
npm i @prisma/client prisma @nestjs/config
npx prisma init --datasource-provider postgresql
```

**讲解：**

1. `@prisma/client` 是运行时客户端，`prisma` 是命令行工具，`@nestjs/config` 提供环境变量读取。
2. `prisma init` 生成 `prisma/schema.prisma` 与 `.env`（含 `DATABASE_URL`）。
3. 本地开发用 Docker 起 PostgreSQL：`docker run -d --name pg-dev -p 5432:5432 -e POSTGRES_PASSWORD=dev123 postgres:18`。

## 2. 定义模型

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Todo {
  id        Int      @id @default(autoincrement())
  title     String   @db.VarChar(100)
  done      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

**讲解：**

1. `@id @default(autoincrement())` 声明自增主键，对应 SQL 的 `PRIMARY KEY AUTO_INCREMENT`。
2. `@db.VarChar(100)` 指定数据库列类型，与 DTO 的 `MaxLength(100)` 形成双保险。
3. `@default(now())` 让数据库填默认创建时间，应用层不用管。

```bash
npx prisma migrate dev --name init
```

**讲解：**

1. `migrate dev` 根据 schema 生成 SQL 迁移并执行，同时重新生成 Prisma Client。
2. 生产环境用 `prisma migrate deploy` 执行已提交的迁移文件，保证多环境结构一致。
3. 每次修改 schema 后都要重新跑迁移，否则 Prisma Client 类型不更新。

## 3. 模块注入 PrismaService

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common"
import { PrismaClient } from "@prisma/client"

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
```

**讲解：**

1. `PrismaService` 继承 `PrismaClient`，让应用里所有服务共用同一个数据库连接池。
2. `OnModuleInit/OnModuleDestroy` 生命周期钩子：应用启动时连接、关闭时断开，避免连接泄漏。
3. 把 `PrismaService` 放进模块的 `providers + exports`，其他模块 `imports` 后即可注入。

## 4. Service 使用 Prisma

```typescript
// src/todos/todos.service.ts
import { Injectable } from "@nestjs/common"
import { PrismaService } from "../prisma/prisma.service"
import { CreateTodoDto } from "./dto/create-todo.dto"

@Injectable()
export class TodosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTodoDto) {
    return this.prisma.todo.create({
      data: { title: dto.title, done: dto.done ?? false }
    })
  }

  findAll() {
    return this.prisma.todo.findMany({ orderBy: { createdAt: "desc" } })
  }

  remove(id: number) {
    return this.prisma.todo.delete({ where: { id } })
  }
}
```

**讲解：**

1. `this.prisma.todo.create({ data: {...} })` 对应 `INSERT`，返回完整的新记录。
2. `findMany({ orderBy })` 对应带排序的 `SELECT`；Prisma 查询对象有完整类型提示，字段拼错在编译期就报错。
3. `delete` 对应 `DELETE`，`where: { id }` 里的 id 必须是唯一键；删除不存在记录会抛异常，可捕获后转成 404。
4. 之前的 `nextId` 与数组存储全部删除——业务代码只关心"做什么"，不关心 SQL 细节。

## 5. 动手试试

1. 给 Todo 加 `priority` 字段（枚举 Int），重新迁移，验证类型提示自动更新。
2. 把 `remove` 改成软删除：加 `deletedAt DateTime?` 字段，查询时过滤 `deletedAt: null`。
3. 在 `TodosModule` 里 `imports: [PrismaModule]`，确认 `PrismaService` 可注入。

## 6. 一句话记住

> Prisma 把数据库变成类型安全的模型：`create/findMany/update/delete` 就是增删改查，连接生命周期交给 PrismaService 统一管理。
