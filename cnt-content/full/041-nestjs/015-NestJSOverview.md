---
order: 150
title: NestJS 概述与快速上手
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: 零基础第一课：理解模块/控制器/服务三层结构，用 CLI 五分钟创建第一个 NestJS 应用。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'nestjs/016-ModuleControllerService'
  - 'nestjs/017-ValidationPipes'
  - 'typescript/003-TypeScriptOverviewEnvSetup'
prerequisites:
  - 'typescript/008-BasicTypeSystem'
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
2. `start:dev` 以监听模式启动，默认端口 3000，改代码自动重启。
3. 浏览器打开 `http://localhost:3000` 会看到 `Hello World!`——它来自 `app.controller.ts`。

## 1. NestJS 是什么

NestJS 是一个用 TypeScript 编写的 Node.js 服务端框架，2017 年发布。它借鉴了 Angular 的架构思想（模块化、依赖注入、装饰器），把 Express/Fastify 的底层能力包装成一套**结构规范**，让团队代码风格统一、易于测试和维护。

### 1.1 核心设计：三件套

| 角色 | 文件名示例 | 职责 |
| --- | --- | --- |
| 模块 Module | `app.module.ts` | 组织边界，声明谁属于谁 |
| 控制器 Controller | `app.controller.ts` | 接收 HTTP 请求，路由分发 |
| 服务 Service | `app.service.ts` | 业务逻辑与数据访问 |

请求流向：**HTTP 请求 → 控制器（校验参数）→ 服务（处理业务）→ 数据库 → 响应**。

### 1.2 版本现状（2026-08）

- NestJS 11.x 为当前稳定版（11.1.x）；v12 计划 2026 年 Q3 发布，将全面迁移到 ESM，并默认使用 Vitest、oxlint、Rspack 等现代工具链。
- 新项目直接用 CLI 创建即可，CLI 会安装当前稳定版。

## 2. 认识项目骨架

```text
todo-api/
  src/
    main.ts               # 入口：创建应用并监听端口
    app.module.ts         # 根模块
    app.controller.ts     # 根控制器（Hello World）
    app.service.ts        # 根服务
  test/                   # 单元测试与 e2e 测试
  nest-cli.json
  tsconfig.json
```

```typescript
// src/main.ts
import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  await app.listen(3000)
}
bootstrap()
```

**讲解：**

1. `NestFactory.create(AppModule)` 从根模块构建整个应用：Nest 会扫描模块里的装饰器元数据，自动组装依赖。
2. `app.listen(3000)` 启动 HTTP 服务；生产环境端口从环境变量读取（如 `process.env.PORT`）。
3. `bootstrap()` 是异步函数，顶层调用即可，这是 Nest 项目的固定入口写法。

## 3. 动手试试

1. 修改 `app.controller.ts` 的 `getHello()` 返回你自己的名字，刷新页面确认生效。
2. 用 `nest g controller hello` 生成一个 `hello` 控制器，访问自动生成的路由。
3. 阅读 `app.module.ts`，找到 `controllers` 与 `providers` 数组，理解模块如何声明依赖。

## 4. 一句话记住

> NestJS = TypeScript + 模块化 + 依赖注入：控制器管请求、服务管业务、模块管组装，三个文件构成一个功能单元。
