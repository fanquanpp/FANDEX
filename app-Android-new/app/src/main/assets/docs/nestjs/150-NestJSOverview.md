---
order: 150
title: NestJS 概述与快速上手
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: 零基础第一课：理解模块/控制器/服务三层结构与依赖注入，用 CLI 五分钟创建第一个 NestJS 应用。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nestjs/160-ModuleControllerService'
  - 'nestjs/170-ValidationPipes'
  - 'typescript/030-TypeScriptOverviewEnvSetup'
prerequisites:
  - 'typescript/080-BasicTypeSystem'
---

## 0. 五分钟创建第一个接口（先读这里）

> 学习目标：跑起一个 NestJS 应用，并理解"模块-控制器-服务"三层结构。

```bash
npm i -g @nestjs/cli
nest new todo-api --package-manager pnpm
cd todo-api
npm run start:dev
```

**讲解：**

1. `@nestjs/cli` 是官方脚手架；`nest new` 会生成一个完整的 TypeScript 项目并安装依赖。
2. NestJS 12 的 CLI 会先问你选 CJS 还是 ESM：拿不准就选 CJS（传统默认，Jest 测试栈），想用最新模块体系选 ESM（Vitest 测试栈）；两种都能随时按官方迁移指南切换。
3. `start:dev` 以监听模式启动，默认端口 3000，改代码自动重启。
4. 浏览器打开 `http://localhost:3000` 会看到 `Hello World!`——它来自 `app.controller.ts`。

## 1. NestJS 是什么

NestJS 是一个用 TypeScript 编写的 Node.js 服务端框架，2017 年发布。它借鉴了 Angular 的架构思想（模块化、依赖注入、装饰器），把 Express/Fastify 的底层能力包装成一套**结构规范**，让团队代码风格统一、易于测试和维护。

用装修类比：Express 给你的是毛坯房（墙、水电随便走），小项目随手就装，大项目各装各的最后没人看得懂管线；NestJS 是精装修交付——哪里走线、哪里放插座都有规范，谁接手都能看懂图纸。代价是你要先学会读图纸（装饰器与依赖注入）。

### 1.1 核心设计：三件套

| 角色 | 文件名示例 | 职责 |
| --- | --- | --- |
| 模块 Module | `app.module.ts` | 组织边界，声明谁属于谁 |
| 控制器 Controller | `app.controller.ts` | 接收 HTTP 请求，路由分发 |
| 服务 Service | `app.service.ts` | 业务逻辑与数据访问 |

请求流向：**HTTP 请求 -> 控制器（校验参数）-> 服务（处理业务）-> 数据库 -> 响应**。这条线再往细里走还有守卫、管道、拦截器、异常过滤器（见[守卫与请求生命周期](/nestjs/200-GuardsAndLifecycle)），初学先记住主干。

### 1.2 版本现状（2026-09）

- NestJS 12 为当前稳定版（2026-08-28 发布）。要点：核心包 ESM-ready（存量 CJS 项目可继续运行、渐进迁移）；原生支持 Standard Schema 校验（zod、valibot、arktype 等统一接口）；CLI 现代化（Rspack 替代 webpack 构建选项、构建参数更丰富）；新增 `@nestjs/observe` 可观测 SDK；要求 Node.js 20.19+ 或 22.12+。
- NestJS 11（2025-01 发布）完成了 Express 5 与 Fastify 5 的默认升级，11.x 目前仍被广泛使用。
- 新项目直接用 CLI 创建即可，CLI 会安装当前稳定版；升级存量项目按官方迁移指南（Migrations to v12）在 CI 先行验证。

| 版本 | 发布 | 一句话记忆点 |
| --- | --- | --- |
| 11 | 2025-01 | Express 5 / Fastify 5 默认，Node 20+ |
| 12 | 2026-08 | ESM-ready、Standard Schema、Vitest 默认（ESM 项目）、Rspack |

对初学者的影响：本模块的代码示例在 11 与 12 上写法一致（装饰器、三层结构、DI 没有变化）；v12 的差异集中在模块格式（CJS/ESM）、测试运行器与校验库生态，遇到时文档会单独标注。

## 2. 认识项目骨架

```text
todo-api/
  src/
    main.ts               # 入口：创建应用并监听端口
    app.module.ts         # 根模块
    app.controller.ts     # 根控制器（Hello World）
    app.service.ts        # 根服务
    app.controller.spec.ts# 控制器测试
  test/                   # e2e 端到端测试
  nest-cli.json
  package.json
  tsconfig.json
```

```typescript
// src/main.ts
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
```

**讲解：**

1. `NestFactory.create(AppModule)` 从根模块构建整个应用：Nest 会扫描模块里的装饰器元数据，自动组装依赖。
2. `app.listen(process.env.PORT ?? 3000)` 启动 HTTP 服务；端口从环境变量读取并给默认值，避免本地写死 3000 与其他服务冲突。
3. `bootstrap()` 是异步函数，顶层调用即可，这是 Nest 项目的固定入口写法。

```typescript
// src/app.service.ts —— 最小服务
import { Injectable } from "@nestjs/common"

@Injectable()
export class AppService {
  getHello(): string {
    return "Hello World!"
  }
}

// src/app.controller.ts —— 最小控制器
import { Controller, Get } from "@nestjs/common"
import { AppService } from "./app.service"

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }
}
```

**讲解：**

1. `@Injectable()` 与 `@Controller()` 是装饰器——附加在类上的元数据标签，Nest 靠它们知道"谁可以被注入、谁处理路由"。
2. `constructor(private readonly appService: AppService)` 是依赖注入（DI）：你没有 `new AppService()`，Nest 在启动时自动创建实例并传入。类比餐厅：你不认识厨师（服务），只管向服务员（控制器）点单，后厨人员安排是餐厅经理（DI 容器）的事。
3. 控制器只做"翻译 HTTP"这一件事，业务全部下沉到服务——这个纪律是后续一切可测试性的基础。

## 3. 生态位：NestJS 适合什么

| 需求 | 官方/配套包 |
| --- | --- |
| 配置与环境变量 | @nestjs/config |
| 数据库 ORM | @nestjs/typeorm、@nestjs/mongoose、Prisma/Drizzle 直连 |
| 认证 | @nestjs/passport、@nestjs/jwt |
| 接口文档 | @nestjs/swagger（OpenAPI） |
| 队列任务 | @nestjs/bullmq |
| 缓存 | @nestjs/cache-manager |
| 微服务与通信 | @nestjs/microservices |
| 健康检查 | @nestjs/terminus |

**讲解：**

1. NestJS 的定位是"后端应用的架构骨架 + 官方生态覆盖常见需求"：校验、配置、认证、文档、队列、微服务都有官方包，风格统一。
2. 换来的是约束：类 + 装饰器的写法有一定仪式感。写几十行的小服务它是负资产，写几万行的团队项目它是正资产——工具没有高下，只有合身不合身。
3. 企业级特性（模块隔离、依赖注入作用域、生命周期钩子、拦截器管线）会在本模块后续各篇逐一展开。

## 4. 常见陷阱

1. **把业务写在控制器里**：一时省事，之后无法单测、无法复用。控制器一行调用服务，从第一个接口开始坚持。
2. **忘了注册 Provider**：报错 `Nest can't resolve dependencies of ...`，多半是服务没写进所在模块的 `providers` 数组——DI 容器只认识注册过的东西。
3. **循环依赖**：A 注入 B、B 又注入 A，启动即报错。先靠重新分层（提取共同依赖到第三个服务）解决，解决不了再用官方的 `forwardRef`（进阶手段，慎用）。
4. **端口写死**：测试、同事机器、服务器端口各不相同，`process.env.PORT ?? 3000` 是底线习惯。
5. **一上来追求全部特性**：守卫、拦截器、微服务、CQRS 一股脑上，项目还没跑起来就先被概念淹没。正确节奏：三层结构 -> 校验 -> 数据库 -> 测试，其余按需求再学。

## 5. 动手试试

1. 修改 `app.controller.ts` 的 `getHello()` 返回你自己的名字，刷新页面确认生效。
2. 用 `nest g controller hello` 生成一个 `hello` 控制器，访问自动生成的路由。
3. 阅读 `app.module.ts`，找到 `controllers` 与 `providers` 数组，理解模块如何声明依赖。
4. 把 `AppService.getHello` 的返回值改成从 `process.env.APP_NAME` 读取，重启后验证环境变量生效。

## 6. 本篇小结

**初学者要点：**

- NestJS = TypeScript + 模块化 + 依赖注入：控制器管请求、服务管业务、模块管组装，三个文件构成一个功能单元。
- CLI 五分钟起步；`start:dev` 监听模式是日常开发的主循环。
- 依赖注入的直觉：不 new，声明要什么，框架负责给。

**进阶注意：**

- v12（2026-08）已完成 ESM 化与工具链现代化，但核心编程模型与 v11 一致；先掌握三层结构与 DI，版本差异留给迁移文档。
- NestJS 的价值随项目规模放大：小脚本用 Hono/裸 Bun 更轻，长生命周期的团队后端才是它的主场。
