---
order: 220
title: 中间件与横切关注点
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: NestJS 中间件：NestMiddleware 类中间件、applyMiddleware 路由绑定、全局与函数式中间件，以及与守卫/拦截器/管道的职责分界——请求管线第 1 层的展开。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'nestjs/200-GuardsAndLifecycle'
  - 'nestjs/165-DiContainerAndProviders'
  - 'nestjs/205-AuthJwtAndPassport'
prerequisites:
  - 'nestjs/160-ModuleControllerService'
---

## 知识点地图

- **知识类别**：请求管线第 1 层——中间件（Middleware）：所有请求最早经过的预处理层。
- **解决什么问题**：日志、CORS、body 解析、租户上下文提取这类「每个请求都要、但跟任何业务都无关」的横切关注点，写进控制器就是重复代码；中间件让它们在管线最前端一次处理。
- **什么时候用到**：请求进业务逻辑之前需要「记录、改写、补充上下文」时；接手项目想搞懂「请求到达控制器之前发生了什么」时。

前置：《守卫与请求生命周期》（nestjs/200-GuardsAndLifecycle）的生命周期表——本篇是该表第 1 行的展开；依赖注入（nestjs/165-DiContainerAndProviders）——类中间件是可注入依赖的。

## 1. 心智模型：管线第一站，只做「预处理」

中间件在请求进入守卫之前执行（生命周期表的第 1 层），它有三个身份特征：

1. **最早执行**：看不到守卫的鉴权结果、管道的校验结果——只拿得到原始请求；
2. **不感知业务**：中间件拿不到「这个请求要进哪个控制器」（路由在更后面才解析完），所以它做不了业务决策；
3. **全链路通用**：CORS、日志这类能力跟具体业务无关——这就是「横切关注点」的含义。

与 Express 中间件的关系：NestJS 的中间件底层就是 Express（默认适配器）的中间件机制，`NestMiddleware` 接口只是给 Express 中间件加上了类型与依赖注入能力——你见过的 `app.use()` 心智完全适用。

## 2. 类中间件：NestMiddleware 与路由绑定

### 2.1 最小实现：请求日志

```typescript
// src/common/middleware/logger.middleware.ts
import { Injectable, Logger, NestMiddleware } from "@nestjs/common"
import { Request, Response, NextFunction } from "express"

@Injectable()                                    // 类中间件是 Provider：可注入依赖
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP")

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now()
    res.on("finish", () => {                     // finish 事件：响应发出后触发
      const ms = Date.now() - start
      this.logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`)
    })
    next()                                       // 必须调用：管线会卡在这里
  }
}
```

逐行讲关键决策：

- `@Injectable()` 不是摆设：类中间件注册到模块后由 Nest 实例化，构造函数可以注入任意 Provider（配置服务、追踪器）——这是它与 Express 裸函数中间件的本质区别；
- 日志记在 `res.on("finish")` 而不是 `next()` 之前：`next()` 前拿不到状态码与耗时——**预处理中间件常犯的错是「登记时间后就 next，响应就忘了」**，finish 事件让同一次日志带全「方法、路径、状态码、耗时」；
- `next()` 不调用，请求就悬挂（客户端等到超时）——这是中间件第一易错点，Express 时代如此，Nest 也如此。

### 2.2 绑定：模块内 applyMiddleware

```typescript
// src/app.module.ts
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common"
import { LoggerMiddleware } from "./common/middleware/logger.middleware"

@Module({
  imports: [TodosModule]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes("*")                            // 全部路由
  }
}
```

`forRoutes` 的三种粒度与排除写法：

```typescript
consumer
  .apply(LoggerMiddleware)
  .exclude({ path: "health", method: RequestMethod.GET })  // 健康端点不打日志
  .forRoutes(
    { path: "todos", method: RequestMethod.ALL },  // todos 的全部方法
    { path: "users/*", method: RequestMethod.GET } // users 下所有 GET（* 通配）
  )
```

为什么中间件绑定在**模块**而不是全局单点：模块是 Nest 的组织单位，`configure` 让「哪些路由经过哪些预处理」成为模块的可读契约——对比 Express 在 main.ts 里堆十几行 `app.use()` 的写法，Nest 的绑定关系跟着模块走、随模块测试。

### 2.3 全局中间件与函数式中间件

```typescript
// main.ts —— 函数式中间件做全局注册
export function requestContext(req: Request, res: Response, next: NextFunction) {
  req["requestId"] = crypto.randomUUID()        // 给每个请求一个追踪 ID
  res.setHeader("X-Request-Id", req["requestId"])
  next()
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.use(requestContext)                       // 等价 Express 的 app.use
  await app.listen(3000)
}
```

**两种形态的取舍**：函数式中间件（`app.use`）零开销、适合不依赖注入的简单逻辑（requestId、安全头）；类中间件（`configure` + `apply`）能注入依赖、能按模块路由，逻辑一复杂就换类。判据一句话：**要注入就用类，纯函数处理用函数式**。

`forRoutes("*")` 与 `app.use` 的区别要分清：`forRoutes("*")` 仍受模块注册顺序影响且可被 exclude 排除；`app.use` 是 Express 层的全局、先于一切 Nest 中间件执行。跨模块的全局预处理优先 `app.use`（或 `configure` 里配在 AppModule）。

## 3. 与守卫/拦截器/管道的职责分界

生命周期表（nestjs/200）的七层里，最容易混的是前四层的分界。用「多租户请求」串一遍每层该做什么、不该做什么：

| 关注点 | 正确归属 | 为什么不放在中间件 |
| :--- | :--- | :--- |
| 从 header 提取 tenant-id 放到 request 上 | 中间件 | 纯预处理，与业务规则无关 |
| 校验 tenant-id 是否合法 | 守卫 | 是「能不能进」的决策，要在鉴权层统一拦 |
| 把租户上下文注入 Service | 拦截器/自定义装饰器 + DI | 中间件无法给 Service 传参 |
| 校验 body 的形状（tenantId 是字符串吗） | 管道 | 校验归 ValidationPipe |

分界口诀：**中间件改写请求（加上下文）、守卫裁决进退（能不能过）、管道校验参数（形状对不对）、拦截器包夹响应（计时/映射）**。把「校验」写进中间件是最常见的错位——中间件在守卫之前，它的校验结果守卫看不到，同一逻辑会在两层重复。

## 4. 工程场景

### 4.1 场景一：请求日志与慢请求告警

第 2.1 节的 LoggerMiddleware 上线后通常再进一步：超过阈值（如 1 秒）的请求升级为 warn 日志并带上 requestId，接入日志平台后可按 requestId 串联同一请求的所有日志（中间件生成、全局异常过滤器与拦截器沿用）。**易错点**：日志中间件用 `forRoutes("*")` 但忘了 exclude `/health`——探针每 5 秒打一次日志，日志量被探针吃掉一半（nestjs/242 的健康端点因此永远要排除在日志外）。

### 4.2 场景二：CORS 与 body 解析的内幕

「为什么浏览器报 CORS 错」「为什么 req.body 是 undefined」——答案都在中间件层。Nest 的 `app.enableCors()` 本质是注册 CORS 中间件（在所有路由之前响应 OPTIONS 预检、追加 CORS 头）；body 解析同样由 Express 的 `json()` 中间件完成（Nest 默认开启），`Content-Type` 不对（如 `text/plain`）或 body 超过默认 100KB 限制时，`req.body` 就是空对象——排查姿势是 `app.use(json({ limit: "2mb" }))` 显式放大，或用 curl 带对 Content-Type 复现。理解这两件事都是中间件，调 CORS/上传问题时才知道「该在哪一层修」而不是乱试装饰器。

### 4.3 场景三：多租户 header 预处理

SaaS 应用的每个请求带 `X-Tenant-Id`，中间件做三件事：提取、规范化（trim、小写）、挂到 `req["tenantId"]`，同时把非法格式（空值、超长）直接 400 掉——「格式合法性」在中间件拦（纯格式判断），「租户是否存在」留给守卫查库（业务判断）。下游控制器与 Service 通过自定义装饰器取租户：

```typescript
// 中间件里规范化后：
export const TenantId = createParamDecorator(
  (_, ctx: ExecutionContext) => ctx.switchToHttp().getRequest()["tenantId"]
)

// 控制器里直接使用：
@Get("items")
list(@TenantId() tenantId: string) {
  return this.itemsService.list(tenantId)
}
```

中间件负责「请求 -> 干净的上下文」，装饰器负责「上下文 -> 业务参数」——两层组合让租户逻辑只在两个文件出现，而不是散在每个控制器。

## 5. 动手实践

**任务一**：实现带慢请求告警的日志中间件，并排除健康端点。要求：普通请求 info 日志、超过 800ms 的 warn 日志（带耗时与 requestId）、`/health` 不打日志。

<details>
<summary>任务一参考实现</summary>

```typescript
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP")

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now()
    const requestId = req["requestId"] ?? "-"
    res.on("finish", () => {
      const ms = Date.now() - start
      const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms [${requestId}]`
      if (req.originalUrl.startsWith("/health")) return  // 静默健康探针
      if (ms > 800) this.logger.warn(line)
      else this.logger.log(line)
    })
    next()
  }
}

// AppModule.configure：
consumer.apply(LoggerMiddleware)
  .exclude({ path: "health", method: RequestMethod.GET })
  .forRoutes("*")
```

要点自查：exclude 与中间件内部的 startsWith 双保险——exclude 挡得住标准探针路径，内部判断挡得住带子路径的变体（/health/ready）。只做一层也能用，但探针路径一旦变化，双保险的维护成本更低。
</details>

**任务二**：把「校验租户格式」误放进中间件与正确放进守卫各写一遍，观察差异。要求：中间件版本拦截非法格式（400）、守卫版本用 `Reflector` 读取「哪些路由需要租户」的元数据后做同样校验。回答：两个版本的行为差异会出现在哪个场景？

<details>
<summary>任务二参考观察</summary>

差异出现在「公开路由」：中间件版本对**所有**请求拦格式（公开的营销页 API 也必须带租户头，不合理）；守卫版本可以按装饰器只对标记 `@RequireTenant()` 的路由校验。这验证了第 3 节的口诀：中间件无差别作用于它绑定的路由，守卫有元数据机制做条件裁决——「有条件的检查」属于守卫，无差别的规范化才属于中间件。
</details>

**任务三**：给项目做一个「中间件清单」审计。列出你项目里（或 nestjs 演示项目）main.ts 与各模块 configure 里的全部中间件，按「函数式/类」分类，逐个标注它做的判断里有没有「校验类」逻辑错位（对照第 3 节口诀）。

<details>
<summary>任务三参考方法</summary>

审计输出形如：`requestContext（函数式，加 requestId，合规）；TenantNormalize（类，规范化，合规）；ApiKeyCheck（类，校验 key 是否有效——错位：这是「能不能进」，应迁到守卫，迁移后还能享受 @Public 元数据机制）`。审计的价值在于发现「越写越厚的中间件」：中间件超过 50 行通常意味着它已经在做守卫或拦截器的活了。
</details>

## 6. 下一步与延伸阅读

- 《守卫与请求生命周期》（nestjs/200-GuardsAndLifecycle）：管线第 2 层，守卫与声明式鉴权；
- 《认证与授权：Passport 与 JWT》（nestjs/205-AuthJwtAndPassport）：本篇多租户场景的同族问题——身份识别的完整落地；
- 《依赖注入与 Providers》（nestjs/165-DiContainerAndProviders）：类中间件注入依赖的机制基础；
- 《校验管道与异常响应》（nestjs/170-ValidationPipes）：管线第 4 层。

## 参考与致谢

- NestJS 官方文档 Middleware：<https://docs.nestjs.com/middleware>；
- 本篇正文为教学重写；官方文档中类中间件与路由绑定的示例语义经重写后收进第 2 节。
