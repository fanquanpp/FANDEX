---
order: 180
title: NestJS 接入数据库（Prisma + PostgreSQL）
module: 'nestjs'
category: 后端技术
difficulty: intermediate
description: Prisma 定义模型并完成建表、CRUD、事务与模块注入；环境变量由 @nestjs/config 统一管理。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nestjs/170-ValidationPipes'
  - 'nestjs/220-ConfigEnvValidation'
  - 'postgresql/010-OverviewInstallConfig'
  - 'typescript/220-FunctionGeneric'
prerequisites:
  - 'nestjs/170-ValidationPipes'
  - 'postgresql/010-OverviewInstallConfig'
---

## 0. 一句话理解

> 数据库接入 = 环境变量管连接串 + ORM 管模型与查询 + 模块管注入；NestJS 里 Prisma 是最主流的组合。

ORM（对象关系映射）的角色像"翻译官"：你用 TypeScript 对象和方法表达意图（`prisma.todo.findMany()`），它翻译成 SQL 并把结果行翻译回对象。翻译官的价值不是"不会 SQL 也能干活"，而是类型安全——字段拼错在编译期就报错，而不是上线后 500。

## 1. 安装与初始化

```bash
npm i @prisma/client prisma @nestjs/config
npx prisma init --datasource-provider postgresql
```

**讲解：**

1. `@prisma/client` 是运行时客户端，`prisma` 是命令行工具，`@nestjs/config` 提供环境变量读取（完整配置体系见[配置与环境变量校验](/nestjs/220-ConfigEnvValidation)）。
2. `prisma init` 生成 `prisma/schema.prisma` 与 `.env`（含 `DATABASE_URL`）。
3. 本地开发用 Docker 起 PostgreSQL：`docker run -d --name pg-dev -p 5432:5432 -e POSTGRES_PASSWORD=dev123 postgres:18`。
4. `.env` 不要提交 git（prisma init 生成的 .gitignore 已包含）；团队用 `.env.example` 交流变量清单。

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
4. schema 文件是唯一的模型事实源：改表就是改这个文件，然后跑迁移。

```bash
npx prisma migrate dev --name init
```

**讲解：**

1. `migrate dev` 根据 schema 生成 SQL 迁移文件并执行，同时重新生成 Prisma Client。
2. 生产环境用 `prisma migrate deploy` 执行已提交的迁移文件，保证多环境结构一致；`migrate dev` 只属于开发机。
3. 每次修改 schema 后都要重新跑迁移，否则 Prisma Client 的 TS 类型不更新，代码里感知不到新字段。

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

```typescript
// src/prisma/prisma.module.ts —— 全局模块：注册一次，全应用可注入
import { Global, Module } from "@nestjs/common"
import { PrismaService } from "./prisma.service"

@Global() // 等价于每个模块都 imports 一遍 PrismaModule
@Module({
  providers: [PrismaService],
  exports: [PrismaService]
})
export class PrismaModule {}

// src/app.module.ts 的 imports 中加入 PrismaModule（只加一次）
```

**讲解：**

1. `PrismaService` 继承 `PrismaClient`，让应用里所有服务共用同一个数据库连接池。
2. `OnModuleInit/OnModuleDestroy` 生命周期钩子：应用启动时连接、关闭时断开，避免连接泄漏。
3. 把 `PrismaService` 放进 `providers + exports`，其他模块 `imports` 后即可注入；`@Global()` 让它注册一次全应用可用——数据库连接天然是全局资源，适合用全局模块。
4. `extends PrismaClient` 的写法省去了逐个转发属性；如果团队规范不喜欢继承宿主，也可以组合（service 里持有一个 client 实例），思路相同。

## 4. Service 使用 Prisma

```typescript
// src/todos/todos.service.ts
import { Injectable, NotFoundException } from "@nestjs/common"
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

  async findOne(id: number) {
    const todo = await this.prisma.todo.findUnique({ where: { id } })
    if (!todo) throw new NotFoundException(`待办 ${id} 不存在`)
    return todo
  }

  async remove(id: number) {
    await this.findOne(id) // 先确保存在，把"删除不存在"翻译成 404 而不是 Prisma 报错
    return this.prisma.todo.delete({ where: { id } })
  }
}
```

**讲解：**

1. `this.prisma.todo.create({ data: {...} })` 对应 `INSERT`，返回完整的新记录。
2. `findMany({ orderBy })` 对应带排序的 `SELECT`；Prisma 查询对象有完整类型提示，字段拼错在编译期就报错。
3. `delete` 对应 `DELETE`，`where: { id }` 里的 id 必须是唯一键；删除不存在记录会抛 Prisma 的 P2025 错误——在服务层先查一次，把数据库错误翻译成 404，比在过滤器里解析 Prisma 错误码更直观。
4. 之前内存数组的 `nextId` 与 `Todo` 接口全部删除——模型的类型由 Prisma 根据 schema 自动生成（`import type { Todo } from "@prisma/client"`），schema 与代码永不脱节。

## 5. 事务：多步写要么全成要么全败

```typescript
async createWithTags(dto: CreateTodoDto, tags: string[]) {
  // $transaction 保证两条写同生共死：任一步失败全部回滚
  return this.prisma.$transaction(async (tx) => {
    const todo = await tx.todo.create({
      data: { title: dto.title, done: dto.done ?? false }
    })
    await tx.tag.createMany({
      data: tags.map((name) => ({ name, todoId: todo.id }))
    })
    return todo
  })
}
```

**讲解：**

1. 典型场景：创建订单 + 扣库存、建用户 + 建档案——两步写之间失败会留下半截数据。
2. 交互式事务（传回调）里用 `tx` 而不是 `this.prisma` 执行语句，才能保证在同一事务内。
3. 事务要短：回调里不要放 HTTP 调用或长时间计算，连接会被占住，连接池耗尽整个应用就挂了。

## 6. 常见陷阱

1. **改了 schema 忘了迁移或忘了生成**：类型没更新、表结构不对。固定节奏：改 schema -> `migrate dev` -> 代码补齐。
2. **`migrate dev` 跑在生产**：它可能重置开发数据库；生产只认 `migrate deploy`。CI/CD 脚本里把这条写成硬约束。
3. **PrismaService 没导出**：其他模块注入报 `can't resolve dependencies`；全局模块 + exports 是标准解法。
4. **N+1 查询**：列表页循环里逐条查关联数据（100 条待办发 101 条 SQL）。Prisma 用 `include: { tags: true }` 一次带出关联，列表接口务必检查这条。
5. **连接串硬编码**：`new PrismaClient({ datasources: ... })` 里写死密码等于把密钥提交进 git；连接串只存在于环境变量。
6. **忘了 catch 用户可见错误**：数据库唯一键冲突（重复标题）默认返回 500；在服务层捕获 `P2002` 转成 `ConflictException`（409），错误语义才对。

## 7. ORM 选型备注

| ORM | 风格 | 适合 |
| --- | --- | --- |
| Prisma | schema 文件 + 生成客户端 | 类型安全优先，新项目主流选择 |
| TypeORM | 装饰器实体 + Active Record/Data Mapper | 习惯 Spring/Hibernate 风格的团队 |
| MikroORM | 装饰器实体 + 身份映射 | 需要 DataMapper 与更好的变更追踪 |
| Drizzle | 贴近 SQL 的轻量查询构建 | 想保留 SQL 手感又要类型 |

**讲解：**

1. NestJS 对 TypeORM/MikroORM 有官方集成包；Prisma/Drizzle 以普通 Provider 方式接入（本篇写法）。
2. 迁移方式、类型生成机制各家不同，但"模型即事实源 + 连接生命周期集中在 Provider"的架构模式完全一致——学会本篇，换 ORM 只是换语法。

## 8. 动手试试

1. 给 Todo 加 `priority` 字段（String，默认 "mid"），重新迁移，验证类型提示自动更新。
2. 把 `remove` 改成软删除：加 `deletedAt DateTime?` 字段，查询时过滤 `deletedAt: null`。
3. 用 `@nestjs/config` 的 `ConfigService` 读取 `DATABASE_URL` 并打日志确认非空（不打全文，只打前 20 字符）。
4. 制造一次唯一键冲突，观察默认 500 响应，然后捕获 P2002 转成 409，对比错误语义。

## 9. 本篇小结

**初学者要点：**

- Prisma 把数据库变成类型安全的模型：`create/findMany/update/delete` 就是增删改查，连接生命周期交给 PrismaService 统一管理。
- 改表三步：改 schema -> `migrate dev` -> 让生成的类型带着代码走；生产只认 `migrate deploy`。
- "删除/查询不存在"翻译成 404、唯一冲突翻译成 409——数据库错误必须翻译成 HTTP 语义再出门。

**进阶注意：**

- 全局模块承载全局资源（数据库连接）是 Nest 的惯用模式；`@Global()` 别滥用，业务服务仍走显式 imports/exports。
- 事务要短、列表要防 N+1、连接串只进环境变量——这三条纪律比 ORM 选型更影响线上质量。
