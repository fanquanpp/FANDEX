---
order: 170
title: 依赖注入与 Provider 体系
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: NestJS 的 IoC 容器心智模型：Provider 四种配方（useClass/useValue/useFactory/useExisting）、注入令牌、三种作用域与传染代价、循环依赖与 forwardRef、生命周期钩子。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'nestjs/150-NestJSOverview'
  - 'nestjs/160-ModuleControllerService'
  - 'nestjs/190-Testing'
  - 'nestjs/202-MiddlewareCrossCutting'
  - 'nestjs/205-AuthJwtAndPassport'
  - 'nestjs/250-NestjsLearningSummary'
prerequisites:
  - 'nestjs/150-NestJSOverview'
  - 'nestjs/160-ModuleControllerService'
---

## 知识点地图

- **知识类别**：依赖注入（DI）与 Provider 体系——IoC 容器的配方（useClass/useValue/useFactory/useExisting）、注入令牌、作用域、循环依赖与生命周期钩子。
- **解决什么问题**：「`Nest can't resolve dependencies`」从哪来；换实现、测试替身、按环境组装怎么表达；单例之外的两种作用域什么时候用。
- **什么时候用到**：服务一多必然遇到；报 resolve 失败时的排查手册（第 7 节）；任何「同一抽象多实现」的选型场景（第 8 节）。

## 0. 为什么值得单独一篇（先读这里）

> 学习目标：建立 IoC 容器的心智模型（你声明"需要什么"，容器决定"怎么造"）；会用 Provider 的四种配方表达"怎么造"；分清类型令牌与字符串令牌；理解三种作用域的语义与传染代价；会用 forwardRef 解循环依赖并知道更好的出路。

[模块、控制器与服务](/nestjs/160-ModuleControllerService)让你用上了依赖注入：构造器里声明 `TodosService`，实例就"自动出现"。本篇把那句"自动"拆开——容器到底做了什么、你能控制它到什么程度。DI 机制在 NestJS 11 与 12 上完全一致（本模块版本基线见[总览篇](/nestjs/150-NestJSOverview)），这篇学一次管很多年。

## 1. 心智模型：容器是一座对象托儿所

没有容器的世界里，依赖关系靠手工组装：

```typescript
// 手工组装：每个使用者自己 new 依赖
const repo = new TodosRepository(config)
const service = new TodosService(repo)
const controller = new TodosController(service)
```

三个代价随项目增长爆发：**换实现要改所有调用方**（想把 repository 换成数据库版，得找到每一处 new）；**测试难**（替身没地方塞，new 是硬编码）；**生命周期没人管**（谁负责初始化连接、谁负责释放）。

依赖注入把"需要什么"与"怎么造"拆开：

```typescript
// 声明侧：只说需要什么（构造器参数类型）
@Injectable()
export class TodosService {
  constructor(private readonly repo: TodosRepository) {}
}

// 注册侧：容器决定怎么造（providers 数组就是配方表）
@Module({
  providers: [TodosRepository, TodosService]
})
export class TodosModule {}
```

**心智模型：容器是一座对象托儿所。** 你在 providers 里登记"配方"，在任何类的构造器里声明"我需要一个 XX"，容器启动时按配方把孩子生好、按声明单把人送到位。所有孩子默认在同一个托儿所里共享（单例），他们之间的接线由容器完成——你在任何地方都看不到一个 `new`。

有了模型，两条铁律立刻成立：

1. **凡是脱离容器的 `new`，都是把孩子抱回家自己养**——它身上的依赖没人喂（全部 undefined），测试替身也换不进去（[160 篇](/nestjs/160-ModuleControllerService)陷阱 3 的原理）；
2. **配方必须登记，声明才能兑现**——构造器要了 `TodosService` 而 providers 里没它，启动即报 `Nest can't resolve dependencies`。这个报错是"托儿所查无此娃"，排查入口永远是"配方表登记了吗、模块 imports/exports 通了吗"。

## 2. Provider 的四种配方

`providers: [TodosService]` 是简写，完整形式是 `{ provide, ...配方 }`。`provide` 是**令牌**（谁要用的凭据），后面是**配方**（容器怎么造）。四种配方覆盖所有场景：

### 2.1 useClass：默认配方

```typescript
providers: [
  { provide: TodosService, useClass: TodosService }  // 简写即此
]
```

按类实例化。它真正的价值在**替换实现**：令牌不变、类可换——

```typescript
// 生产用真实实现
providers: [{ provide: NotifierService, useClass: EmailNotifierService }]

// 测试/灰度换实现，所有注入 NotifierService 的代码一行不改
providers: [{ provide: NotifierService, useClass: SmsNotifierService }]
```

注意替换实现的前提是**抽象稳定**：两个类实现同一个接口/抽象基类，消费方依赖的是令牌而不是具体类。这就是"依赖倒置"在 Nest 里的落地形态。

### 2.2 useValue：现成的值

```typescript
providers: [
  { provide: "APP_CONFIG", useValue: { env: "prod", maxRetries: 3 } }
]

// 消费方用 @Inject 按令牌取（见第 3 节）
constructor(@Inject("APP_CONFIG") private readonly config: AppConfig) {}
```

非类的值——配置对象、常量、第三方客户端实例——都走这条。**测试替身是 useValue 的头号用途**（[测试篇](/nestjs/190-Testing)的 `useValue(fakePrisma)` 就是它）：容器里真实依赖的位置上放一个假货，消费方毫无察觉。

### 2.3 useFactory：需要过程才能造出来

造法本身就是逻辑时（读环境变量、异步拉配置、条件选择实现），用工厂函数：

```typescript
providers: [
  {
    provide: "DB_POOL",
    // inject 数组声明工厂的原料（可以是其他 provider 的令牌）
    inject: [ConfigService],
    useFactory: async (config: ConfigService) => {
      const pool = new Pool({ connectionString: config.get("DATABASE_URL") })
      await pool.query("SELECT 1") // 启动即验证连通，失败 fail-fast
      return pool
    }
  }
]
```

工厂可以是 async 的，容器会等 Promise 落定再继续组装——这是"启动期做异步初始化"的官方姿势。工厂里也能做条件逻辑：

```typescript
{
  provide: NotifierService,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    config.get("NOTIFY_CHANNEL") === "sms"
      ? new SmsNotifierService()
      : new EmailNotifierService()
}
```

工厂里 `new` 的类**不享受 DI**（它们的依赖你得手工传）——需要"有依赖的实现切换"时，让工厂返回 `useClass` 的思路改为：工厂只返回开关值，分支交给多个 useClass provider 或让两个实现类都注册进容器。

### 2.4 useExisting：别名

```typescript
providers: [
  CacheService,                       // 真身
  { provide: "LegacyCache", useExisting: CacheService }  // 别名指向同一实例
]
```

新老代码迁移期最常用：旧代码按 `LegacyCache` 令牌注入，新代码按 `CacheService` 注入，两个令牌拿到的是**同一个实例**——不是复制品，是同一只孩子。

## 3. 注入令牌：类型令牌与字符串令牌

`provide` 可以是两类东西，消费侧写法随之不同：

| 令牌类型 | 写法 | 适用 | 消费方式 |
| --- | --- | --- | --- |
| 类型令牌 | 类本身（`TodosService`） | 有对应 class 的依赖 | 构造器直接写参数类型，无需装饰器 |
| 字符串/符号令牌 | `"APP_CONFIG"`、`Symbol()` | 值、工厂产物、接口形状 | 构造器参数加 `@Inject("APP_CONFIG")` |

类型令牌能省掉 `@Inject`，靠的是 TypeScript 装饰器元数据（`emitDecoratorMetadata`）：`@Injectable()` 把构造器参数类型留到运行时，容器按类型当令牌查找——160 篇讲过的那层机制。

字符串令牌的两条纪律：

1. **令牌用导出的常量，别在两个文件里裸写字符串**——拼写错一处，启动报"查无此娃"，而且错误信息里只有字符串看不出是谁拼错了：

```typescript
// config-tokens.ts —— 令牌常量集中定义，生产与消费都 import 它
export const APP_CONFIG = "APP_CONFIG"
export const DB_POOL = "DB_POOL"
```

2. 令牌按"值域"命名（`DB_POOL`、`MAILER_OPTIONS`），别按用途命名（`my-helper`）——令牌是"存取键"，不是角色名。

## 4. 作用域：默认单例，但单例不是唯一答案

| Scope | 实例数 | 语义 | 代价 |
| --- | --- | --- | --- |
| `Scope.DEFAULT` | 全应用 1 个 | 单例，请求间共享 | 无 |
| `Scope.REQUEST` | 每请求 1 个 | 请求级隔离 | 每请求重建整条依赖链 |
| `Scope.TRANSIENT` | 每注入点 1 个 | 谁注入谁一份 | 最贵，实例数不可控 |

```typescript
import { Injectable, Scope } from "@nestjs/common"

@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  private userId?: string
  setUserId(id: string) { this.userId = id }
  get userId() { return this.userId ?? "anonymous" }
}
```

**默认用单例**——无状态服务（绝大多数 service）单例既快又省。真正需要 request scope 的信号只有一个：**服务要存"当前请求"的状态**（trace id、当前用户）。但动笔前先想两件事：

1. **传染性**：request scope 沿依赖链向上传染——单例 Controller 注入了 request-scoped 服务，Controller 自己也变成每请求重建。请求热点路径上一旦沾上，性能陡增（每次请求都要重建对象图）。它天生与性能敏感区互斥；
2. **替代方案**：请求级上下文更常见的做法是挂在 request 对象上（[守卫与请求生命周期](/nestjs/200-GuardsAndLifecycle)的自定义装饰器）或用 AsyncLocalStorage 贯穿调用链（社区 CLS 方案）——两者都不传染作用域。**把 request scope 当"最后手段"而不是默认开关**。

`Scope.TRANSIENT` 用于"每个消费者必须独立"的场景（如带独立内部状态的计数器/生成器），日常业务极少用到。

## 5. 循环依赖与 forwardRef

A 注入 B、B 又注入 A，模块系统按序实例化时会有一方拿到 `undefined`——TypeScript 类的循环引用在运行时表现为"先声明的一方还没就绪"。Nest 提供的逃生门是 `forwardRef`：

```typescript
// a.service.ts
import { forwardRef, Inject, Injectable } from "@nestjs/common"
import { BService } from "./b.service"

@Injectable()
export class AService {
  constructor(@Inject(forwardRef(() => BService)) private readonly b: BService) {}
}

// b.service.ts —— 两侧都要 forwardRef，只改一边不够
import { forwardRef, Inject, Injectable } from "@nestjs/common"
import { AService } from "./a.service"

@Injectable()
export class BService {
  constructor(@Inject(forwardRef(() => AService)) private readonly a: AService) {}
}
```

模块层的循环（两个模块互相 imports）同样用 `forwardRef(() => BModule)` 解。但要把 forwardRef 当**绷带**而不是治疗方案：互相依赖通常说明职责边界切错了。更健康的解法是**抽出第三个共同依赖**——把 A、B 都需要的那部分逻辑提为 CService，A→C、B→C，环自然解开。复盘时问一句"A 和 B 到底共享什么"，答案往往就是 C。

## 6. 生命周期钩子：容器组装的时序表

容器的组装不是瞬间完成的，理解时序才知道代码该写在哪儿：

```text
模块注册 → 解析所有依赖 → onModuleInit（依赖已就绪）
        → onApplicationBootstrap（应用就绪，可对外服务）
...运行...
→ onApplicationShutdown / onModuleDestroy（收尾信号，配合 enableShutdownHooks）
```

```typescript
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common"

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.pool.query("SELECT 1")  // 连接预检：此时所有依赖已注入完毕
  }
  async onModuleDestroy() {
    await this.pool.end()              // 释放资源
  }
}
```

**分工纪律**：

- **构造器只做轻量赋值**：参数存字段、默认值计算。构造器执行时依赖虽已传入，但整个对象图还在组装中，重活放这里会让"半成品对象"参与初始化；
- **连接验证、预热、缓存加载**放 `onModuleInit`/`onApplicationBootstrap`；
- **释放**放 destroy 钩子，生产环境记得在 `main.ts` 调 `app.enableShutdownHooks()` 让 SIGTERM 触发它们（优雅停机的前提）。

## 7. 常见陷阱

1. **手动 `new` 一个服务**：脱离容器，它声明的依赖全是 undefined，测试也换不了替身。看到业务代码里出现 `new XxxService()` 就该警觉（工厂函数 useFactory 内部 new 是例外，那是在替容器打工）；
2. **useGlobalGuards/useGlobalFilters 注册**：全局组件脱离模块容器，内部 DI 断裂。用 `APP_GUARD`/`APP_FILTER`/`APP_INTERCEPTOR` 令牌在 providers 注册（[守卫篇](/nestjs/200-GuardsAndLifecycle)、[总结篇](/nestjs/250-NestjsLearningSummary)均有专述）；
3. **字符串令牌裸写两处**：拼写不一致 → 启动报 resolve 失败。令牌一律导出常量（第 3 节）；
4. **request scope 当默认品味**：热路径被传染成每请求重建，压测时才暴露。单例 + request 对象/CLS 优先（第 4 节）；
5. **构造器里做 IO**：慢启动、半成品对象参与组装、出错难定位。挪进 onModuleInit（第 6 节）；
6. **用 forwardRef 硬扛所有循环**：能跑但债越滚越大。forwardRef 是绷带，抽公共服务才是治疗（第 5 节）。

## 8. 动手试试（遮代码自检）

先只读任务与提示，自己写完再对照参考实现。

**任务**：给待办应用加"完成提醒"能力，要求——

1. 定义抽象 `NotifierPort`（接口：`send(msg: string): Promise<void>`）与两个实现 `EmailNotifier`、`SmsNotifier`；
2. 容器按环境变量 `NOTIFY_CHANNEL`（email/sms）选择实现，**消费方只注入 `NotifierPort` 令牌，对具体实现无感**；
3. 通知内容前缀 `PREFIX` 令牌（useValue 注入，默认值 `"TODO"`）由 EmailNotifier/SmsNotifier 共同消费；
4. 测试中用 useValue 注入一个把消息存进数组的假 Notifier，验证"服务确实发了通知"。

**提示**：两个实现要能互相替换 → 抽象里只有 send；按环境选择实现是 useFactory 的本职（第 2.3 节），分支返回的是**注册进容器的两个实现类实例**——工厂里 new 失去 DI，而这两个实现只依赖 PREFIX（useValue 值），手工传入即可，这正是工厂合理的场景；测试替身是 useValue 的头号用途（第 2.2 节）。

**参考实现**（先自己写完再看）：

```typescript
// notifier.port.ts —— 抽象与令牌
export abstract class NotifierPort {
  abstract send(msg: string): Promise<void>
}
export const PREFIX = "NOTIFY_PREFIX"

// notifiers.ts —— 两个实现
import { Inject, Injectable } from "@nestjs/common"
import { NotifierPort, PREFIX } from "./notifier.port"

@Injectable()
export class EmailNotifier implements NotifierPort {
  constructor(@Inject(PREFIX) private readonly prefix: string) {}
  async send(msg: string) { console.log(`[email] ${this.prefix}: ${msg}`) }
}

@Injectable()
export class SmsNotifier implements NotifierPort {
  constructor(@Inject(PREFIX) private readonly prefix: string) {}
  async send(msg: string) { console.log(`[sms] ${this.prefix}: ${msg}`) }
}

// app.module.ts —— 注册配方
providers: [
  { provide: PREFIX, useValue: process.env.NOTIFY_PREFIX ?? "TODO" },  // 配方 1：useValue
  EmailNotifier,
  SmsNotifier,
  {
    provide: NotifierPort,                                             // 配方 2：useFactory 选实现
    inject: [PREFIX],
    useFactory: (prefix: string) =>
      process.env.NOTIFY_CHANNEL === "sms"
        ? new SmsNotifier(prefix)
        : new EmailNotifier(prefix)
  }
]

// todos.service.ts —— 消费方只认抽象
constructor(private readonly notifier: NotifierPort) {}   // 类型令牌：抽象类也能当令牌
```

```typescript
// todos.service.spec.ts —— 测试里换假货
const sent: string[] = {
  send: async (msg: string) => { sent.push(msg) }
} as any

Test.createTestingModule({
  providers: [
    TodosService,
    { provide: NotifierPort, useValue: sent },   // 配方 3：useValue 替身
    { provide: PREFIX, useValue: "TEST" }
  ]
})
```

要点自查：

- 消费方依赖 `NotifierPort` 抽象，email/sms 切换零改动——依赖倒置落地；
- 工厂里 `new` 的两个类只依赖 `PREFIX`，手工传入不损失任何 DI——判断"工厂里 new 是否可接受"的标准就是看它丢不丢依赖；
- 抽象类 `NotifierPort` 同时是类型与类型令牌（编译后 class 仍存在，这是第 160 篇"DTO 用 class 不用 interface"的同一原理）；
- 测试里 `useValue` 的假货形态随意（哪怕 `as any`），容器只认令牌不看实现。

### 8.1 来自认证场景的工厂注入：JwtModule.registerAsync

官方包同样按这套配方设计。认证篇（nestjs/205）的 JWT 密钥来自环境配置——配置服务初始化后才能读到，这正是 `registerAsync` 工厂的用武之地：

```typescript
JwtModule.registerAsync({
  inject: [ConfigService],                        // 工厂的依赖：声明单
  useFactory: (config: ConfigService) => ({       // 配方：配置就绪后怎么造
    secret: config.get("JWT_SECRET"),
    signOptions: { expiresIn: "15m" }
  })
})
```

对照第 2 节的配方表：`inject` 是工厂的构造依赖、`useFactory` 是有过程的构造（等价配方 3 的工厂形态，只是「产品」换成了 JwtModule 的配置）。为什么不用静态 `register({ secret: "hard-coded" })`：密钥进代码等于进 Git 历史，且测试环境换密钥要改代码——工厂把「怎么拿到密钥」交给容器按环境决定。同类用例还有数据库连接（等 Prisma/TypeORM 客户端就绪再装配）与队列连接（nestjs/235 的 `BullModule.forRoot`），看到 `xxxModule.registerAsync` 就按工厂心智读。

## 9. 小结与延伸

- 心智模型：容器是对象托儿所，providers 是配方表，构造器是声明单；`Nest can't resolve dependencies` = 配方表缺项或模块边界没打通。
- 四种配方：useClass（默认/换实现）、useValue（值/测试替身）、useFactory（有过程的构造，可 async）、useExisting（别名同实例）。
- 令牌：类型令牌免 @Inject，字符串令牌必须导出常量；抽象用 abstract class 而非 interface，才能兼任令牌。
- 作用域：默认单例；request scope 沿依赖链传染且有性能代价，请求级上下文优先 request 对象/CLS；transient 罕用。
- 循环依赖：forwardRef 两侧都要写，但它只是绷带，抽公共服务才是治疗。
- 延伸：参数装饰器与 request 级数据见[守卫与请求生命周期](/nestjs/200-GuardsAndLifecycle)；类中间件是可注入 Provider 的另一个用例（[中间件与横切关注点](/nestjs/202-MiddlewareCrossCutting)）；测试中的 DI 替身体系见[测试篇](/nestjs/190-Testing)。

## 参考与致谢

- NestJS 官方文档 Custom Providers：<https://docs.nestjs.com/fundamentals/custom-providers>、Injection Scopes：<https://docs.nestjs.com/fundamentals/injection-scopes>、Lifecycle Events：<https://docs.nestjs.com/fundamentals/lifecycle-events>；
- 本篇正文为教学重写；四种配方与作用域语义沿用官方文档的通行定义，第 8.1 节的 JwtModule 用例对接认证篇（nestjs/205）的场景。
