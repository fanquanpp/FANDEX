---
order: 220
title: 配置与环境变量校验
module: 'nestjs'
category: 后端技术
difficulty: intermediate
description: '@nestjs/config 加分项：类型安全、启动即校验的配置体系。'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nestjs/170-ValidationPipes'
  - 'typescript/030-TypeScriptOverviewEnvSetup'
prerequisites:
  - 'nestjs/160-ModuleControllerService'
---

## 0. 配置为什么值得单独一章（先读这里）

> 学习目标：用 @nestjs/config 建立"命名空间配置文件 + 全局注入"的配置体系；用 zod 在应用启动时校验全部环境变量（fail fast）；通过 z.infer 与继承获得类型安全的 ConfigService；掌握 .env 多环境分层与生产密钥管理约定。

配置翻车三连：本地跑得好好的，上线才发现 `DATABASE_URL` 拼错；`PORT` 读出来是字符串 `"3000"`，与 `3000` 严格比较永远为 false；密钥被同事提交进了 git。本章一次性解决这三类问题：

| 问题 | 本章方案 | 小节 |
| --- | --- | --- |
| 配置散落、拼错 key 无提示 | registerAs 命名空间 | 2 |
| 坏配置到运行时才爆炸 | validate 函数 + zod，启动即失败 | 3 |
| 读取结果全是 any | z.infer + TypedConfigService | 4 |
| 密钥入库、环境混淆 | .env 分层与 .env.example 约定 | 5-6 |

## 1. 安装与 ConfigModule.forRoot

```bash
npm i @nestjs/config zod
```

[接入数据库](/nestjs/180-DatabaseIntegration)已经在用 `@nestjs/config` 读取 `DATABASE_URL`，现在把完整体系搭起来：

```typescript
// src/app.module.ts
import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { validate } from "./config/env.validation"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 全局模块：业务模块无需重复 imports
      envFilePath: [".env.local", ".env"], // 数组靠前的优先，命中即停
      validate // 启动即校验，失败直接拒绝启动
    })
  ]
})
export class AppModule {}
```

**讲解：**

1. `isGlobal: true` 让 `ConfigService` 在全应用可注入，等价于每个模块都 imports 一遍 `ConfigModule`，省去重复接线。
2. `envFilePath` 是数组时按顺序取第一个存在的文件，实现".env.local 本机覆盖 .env 团队默认"的约定。
3. `ignoreEnvFile: true` 用于生产：完全忽略 .env 文件，只认平台注入的真实环境变量（容器与 K8s 场景标配），第 6 节展开。

## 2. 自定义配置文件：registerAs 命名空间

散落的 `process.env.xxx` 是隐形全局变量；`registerAs` 把配置按域分组、以 Provider 形式注册：

```typescript
// src/config/app.config.ts
import { registerAs } from "@nestjs/config"

export default registerAs("app", () => ({
  name: process.env.APP_NAME ?? "fandex-api",
  port: Number(process.env.PORT ?? 3000)
}))
```

```typescript
// src/config/db.config.ts
import { registerAs } from "@nestjs/config"

export default registerAs("db", () => ({
  url: process.env.DATABASE_URL,
  maxPool: Number(process.env.DB_POOL_MAX ?? 10)
}))
```

```typescript
// src/config/config.module.ts —— 集中注册所有命名空间
import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import appConfig from "./app.config"
import dbConfig from "./db.config"

@Module({
  imports: [
    ConfigModule.forFeature(appConfig),
    ConfigModule.forFeature(dbConfig)
  ],
  exports: [ConfigModule]
})
export class AppConfigModule {}
```

```typescript
// 任意服务中按命名空间读取
constructor(private readonly config: ConfigService) {}

get appInfo() {
  return {
    name: this.config.get("app.name"),
    port: this.config.get("app.port")
  }
}
```

**讲解：**

1. `registerAs(key, factory)` 返回带 key 的 Provider 工厂，`forFeature` 把它注册进模块；工厂延迟求值，测试里可先改环境变量再实例化。
2. 读取时点是"命名空间.字段"，如 `app.port`；但拼错 key 不报错、只会返回 `undefined`——这正是第 4 节要类型化的原因。

## 3. 启动即校验：zod schema + validate（fail fast）

核心思想：把 `process.env` 当作"不可信的外部输入"，启动时用 zod 解析一遍，错一个变量就拒绝启动，并一次性列出所有问题：

```typescript
// src/config/env.validation.ts
import { z } from "zod"

// schema 即文档：需要哪些变量、什么类型、什么默认值，一目了然
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url("必须是合法的连接串"),
  JWT_SECRET: z.string().min(32, "至少 32 位，防暴力破解")
})

// 由 schema 反推出 TS 类型，第 4 节直接复用
export type Env = z.infer<typeof envSchema>

export function validate(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config)
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n")
    throw new Error(`环境变量校验失败，请对照 .env.example 检查：\n${detail}`)
  }
  return result.data // 校验通过后的强类型对象，PORT 已是 number
}
```

运行效果：

```bash
# 缺 JWT_SECRET 且 DATABASE_URL 格式错误时，启动直接失败
Error: 环境变量校验失败，请对照 .env.example 检查：
  - DATABASE_URL: 必须是合法的连接串
  - JWT_SECRET: 至少 32 位，防暴力破解
```

**讲解：**

1. `z.coerce.number()` 一步完成"字符串转数字 + 校验"，修掉 `"3000" === 3000` 的经典 bug。
2. `safeParse` 不抛异常，方便把所有 issue 汇总成一次报错；用 `parse` 遇到第一个错误就中断，排查体验差。
3. 返回的 `result.data` 会成为 ConfigModule 内部的配置源：`get("PORT")` 拿到的是转换后的 number。
4. NestJS 12 原生支持 Standard Schema（zod、valibot、arktype 等实现的统一校验接口），schema 可直接交给框架消费，写法更简洁，细节以官方文档为准；本节的 validate 函数写法在 NestJS 11 与 12 上都可用。

## 4. 类型安全读取：infer 出来的 ConfigService

`get("app.port")` 返回 any、字符串 key 拼错无提示——用继承补一层强类型门面：

```typescript
// src/config/typed-config.service.ts
import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import type { Env } from "./env.validation"

@Injectable()
export class TypedConfigService extends ConfigService<Env, true> {
  // 每个变量一个 getter：调用方拿到精确类型，无需记忆字符串 key
  get port(): number {
    return this.get("PORT", { infer: true })!
  }

  get databaseUrl(): string {
    return this.get("DATABASE_URL", { infer: true })!
  }

  get jwtSecret(): string {
    return this.get("JWT_SECRET", { infer: true })!
  }
}
```

```typescript
// src/app.module.ts providers 中注册
providers: [TypedConfigService]

// 业务代码里注入 TypedConfigService
constructor(private readonly cfg: TypedConfigService) {}
```

**讲解：**

1. `ConfigService<Env, true>` 的第二个泛型开启 infer 模式：`this.get("PORT", { infer: true })` 直接返回 number 而不是 any。
2. `Env` 来自 `z.infer`，schema 改了类型自动跟着变，配置文件与 TS 类型永远同步，这正是 TypeScript 泛型推导的价值。
3. getter 门面的额外收益：全局搜索使用点即可评估改动影响，重命名重构才敢下手；`!` 非空断言是安全的，因为启动校验已保证字段存在。

## 5. .env 多环境与 .env.example 约定

| 文件 | 是否提交 git | 用途 |
| --- | --- | --- |
| .env.example | 提交 | 变量清单 + 示例值，新人克隆后照着填 |
| .env | 不提交 | 本地团队默认环境 |
| .env.local | 不提交 | 本机个人覆盖（真实密钥），优先级最高 |
| 平台注入 | 无文件 | 生产环境由容器、K8s、云平台注入 |

```bash
# .gitignore 追加
.env
.env.local
```

```bash
# .env.example
# 应用
APP_NAME=fandex-api
PORT=3000
# 数据库
DATABASE_URL=postgresql://postgres:dev123@localhost:5432/fandex
# 认证密钥（生成命令见下）
JWT_SECRET=replace-me-with-32-bytes-random-string!!
```

```bash
# 生成强随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**讲解：**

1. `envFilePath: [".env.local", ".env"]` 保证本地覆盖优先；每人一个 `.env.local`，互不踩脚，团队默认值沉淀在 `.env`。
2. `.env.example` 是"配置的接口文档"，配合第 3 节的启动校验形成闭环：缺什么、错什么，启动时全部告诉你。

## 6. 生产配置要点

1. 密钥不入库：`JWT_SECRET`、数据库密码等只存在于密钥管理系统或平台注入；git 历史无法靠删除提交挽回，一旦泄露必须轮换密钥。
2. 生产环境关闭 env 文件读取，只认平台注入：

```typescript
// src/app.module.ts（节选）
ConfigModule.forRoot({
  isGlobal: true,
  ignoreEnvFile: process.env.NODE_ENV === "production", // 生产只认真实环境变量
  validate
})
```

3. 最小权限与凭证分离：数据库账号、对象存储凭证分开发放，一份泄露不至于全盘失守。
4. 敏感配置不进日志：拦截器、过滤器里打印配置前先做掩码（如只保留后 4 位）；校验失败报错只含字段名，不含值。
5. 配置变更要有记录：平台注入的变量随部署清单（docker-compose、Helm values、CI 变量组）进版本库，形成"配置即代码"，可审计、可回滚。

## 7. 小结与延伸

- 配置体系三板斧：命名空间（registerAs）管组织、zod 校验管正确性、类型化门面管开发体验。
- fail fast 是配置校验的灵魂：坏配置撑不过启动那一秒，比运行时偶发 500 便宜得多。
- 环境分层口诀：example 进库、local 覆盖、生产注入、密钥轮换。
- 延伸：validate 函数也可用 class-validator + `plainToInstance` 或 Joi 实现，思路相同；NestJS 12 的 Standard Schema 集成与 Configuration 自定义 getter 的进阶写法，以官方文档为准。
