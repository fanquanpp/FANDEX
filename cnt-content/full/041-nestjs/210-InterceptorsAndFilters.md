---
order: 220
title: 拦截器与异常过滤器
module: 'nestjs'
category: 后端技术
difficulty: intermediate
description: NestInterceptor 响应变换与耗时日志、超时拦截器、ExceptionFilter 全局兜底、拦截器常见坑与遮代码自检，验证管线执行顺序。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'nestjs/165-DiContainerAndProviders'
  - 'nestjs/170-ValidationPipes'
  - 'nestjs/200-GuardsAndLifecycle'
prerequisites:
  - 'nestjs/160-ModuleControllerService'
---

## 0. 环绕逻辑与错误兜底（先读这里）

> 学习目标：用 NestInterceptor 实现耗时日志、统一响应壳与超时保护，掌握 RxJS 的 map、tap、timeout、catchError 在拦截器中的分工；定义业务异常并编写全量异常过滤器；用实验验证整条管线的执行顺序，并能识别拦截器的四类典型坑。

上一篇的管线表里，守卫负责"能不能进"，而"进出来什么"（拦截器）与"出错怎么办"（异常过滤器）是本章主角。拦截器横跨处理前后两半，异常过滤器兜底所有未捕获异常，两者共同决定接口的最终输出形态。

先建立**流的心智模型**：`next.handle()` 返回的不是响应值，而是一条**响应流**（RxJS Observable，惰性——Nest 负责订阅）。于是拦截器的全部工作可以概括为一句话：**在前半段做请求侧的事，用管道操作符加工响应流做后半段的事**。`tap` 旁路观察不改数据、`map` 改数据、`timeout` 上闹钟、`catchError` 在流内接错——四个操作符分工清晰后，网上五花八门的拦截器你都能一眼看懂。

## 1. 拦截器：日志与耗时统计

```typescript
// src/common/interceptors/logging.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common"
import { Observable, tap } from "rxjs"

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest()
    const start = Date.now()
    console.log(`--> ${req.method} ${req.url}`)
    return next.handle().pipe(
      // tap 只做旁路观察不改数据；处理器成功返回后才打印耗时
      tap(() => console.log(`<-- ${req.method} ${req.url} ${Date.now() - start}ms`))
    )
  }
}
```

**讲解：**

1. `intercept` 返回什么流，Nest 就以什么作为响应：不调用 `next.handle()` 相当于短路（配合缓存、熔断场景）。
2. `tap` 用于副作用（日志、埋点），`map` 用于改数据，混用会让"谁改了返回值"难以追踪。
3. 拦截器与守卫一样支持方法级 `@UseInterceptors(X)`、控制器级与全局三种绑定，粒度记忆可以完全复用。

## 2. 拦截器：统一响应壳与错误转换

```typescript
// src/common/interceptors/transform.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common"
import { map, Observable } from "rxjs"

export interface ApiResponse<T> {
  code: number
  data: T
  timestamp: string
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      // map 把每个处理器的返回值包上统一外壳
      map((data) => ({ code: 0, data, timestamp: new Date().toISOString() }))
    )
  }
}
```

错误分支同样在流上处理，`catchError` 可以在异常进入过滤器之前先做一次转换：

```typescript
// 追加到 transform.interceptor.ts 的 pipe 中
import { catchError, throwError } from "rxjs"
import { HttpException, InternalServerErrorException } from "@nestjs/common"

return next.handle().pipe(
  catchError((err) => {
    // HttpException 原样放行给过滤器；未知异常统一转成 500
    if (err instanceof HttpException) return throwError(() => err)
    return throwError(() => new InternalServerErrorException("服务内部错误"))
  })
)
```

**讲解：**

1. 统一响应壳与[管道校验与异常处理](/nestjs/170-ValidationPipes)的统一错误结构是一对：成功走 `TransformInterceptor`，失败走 `ExceptionFilter`，前端只需要解析两种固定格式。
2. `catchError` 不是必须的：不处理时异常沿管线继续向后传，最终由异常过滤器接收；在这里先转换，适合"把第三方库的私有错误类型翻译成 HTTP 语义"。
3. RxJS 的 `Observable` 是惰性流，不订阅就不执行，Nest 负责订阅，你只管在管道里加工。
4. 全局注册方式与守卫一致：`{ provide: APP_INTERCEPTOR, useClass: TransformInterceptor }`，先注册的先执行；这一写法让拦截器留在容器里，内部依赖注入照常生效（原理见[依赖注入与 Provider 体系](/nestjs/165-DiContainerAndProviders)第 7 节）。

## 3. 业务异常与全量异常过滤器

[管道校验与异常处理](/nestjs/170-ValidationPipes)写过只处理 `HttpException` 的局部过滤器；进阶做法是定义业务异常 + 一个全量兜底过滤器：

```typescript
// src/common/exceptions/business.exception.ts
import { HttpException, HttpStatus } from "@nestjs/common"

// 业务异常：携带业务错误码，HTTP 状态固定 422
export class BusinessException extends HttpException {
  constructor(
    message: string,
    private readonly bizCode: number
  ) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY)
  }

  getBizCode(): number {
    return this.bizCode
  }
}
```

```typescript
// src/common/filters/all-exceptions.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common"
import { Response } from "express"

@Catch() // 不带参数 = 捕获所有类型的异常
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const body = exception.getResponse()
      return res.status(status).json({
        code: status,
        message:
          typeof body === "string" ? body : ((body as any).message ?? "请求失败")
      })
    }
    // 未知异常：完整堆栈只留在服务端，不泄露给客户端
    console.error(exception)
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 500,
      message: "服务内部错误"
    })
  }
}
```

全局注册推荐走模块 Provider，这样过滤器内部也能依赖注入：

```typescript
// src/app.module.ts（节选）
import { APP_FILTER } from "@nestjs/core"

providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }]
```

**讲解：**

1. `exception: unknown` 的类型签名是刻意设计：强制你显式处理"不是 HttpException 的情况"，而不是假设一切皆 Http。
2. `@Catch(HttpException)` 的局部过滤器与 `@Catch()` 全量过滤器可以共存，Nest 会挑最匹配的过滤器执行，全量兜底只负责"漏网之鱼"。
3. 服务类里 `throw new BusinessException("余额不足", 40001)`，客户端拿到 422 与业务码，比直接抛 Error 更有契约感。
4. 未知异常日志务必打在服务端（含堆栈），客户端只收到笼统的 500——这是安全与排障的平衡点。

## 4. 超时拦截器：给慢请求上闹钟

下游一次抖动就能拖死整条线程池——"每个请求最多等多久"是环绕逻辑的本职工作。`timeout` 操作符给流上闹钟，`catchError` 把到时的流转成 HTTP 语义：

```typescript
// src/common/interceptors/timeout.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException
} from "@nestjs/common"
import { catchError, Observable, throwError, timeout } from "rxjs"

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(3000), // 3 秒内没有产出就算超时
      catchError((err) => {
        // TimeoutError 只能按名字辨认：rxjs 不导出它的类
        if (err && err.name === "TimeoutError") {
          return throwError(() => new RequestTimeoutException("请求超时"))
        }
        return throwError(() => err) // 其余异常原样放行给过滤器
      })
    )
  }
}

// 挂载在明知可能慢的路由上（报表、外部数据源），或全局注册
@UseInterceptors(TimeoutInterceptor)
@Get("report")
report() {
  return this.slowService.compute()
}
```

**讲解：**

1. `timeout` 到点后**中断的是等待，不是下游任务**——慢查询仍会在后台跑完（数据库侧需要自己的 statement timeout 才能真正止血）。超时保护的完整方案是"外层掐流 + 下游自限"，缺一半就只是自欺；
2. 判断超时用 `err.name === "TimeoutError"`：rxjs 的 TimeoutError 随版本导出方式不稳定，按名字辨认最抗变动；
3. `RequestTimeoutException` 是 Nest 内置异常（HTTP 408），进过滤器后自然转成标准错误结构——拦截器只管"识别 + 翻译"，输出形态统一交给过滤器，职责不越界；
4. 阈值别一刀切：导出报表类路由给宽阈值，普通 CRUD 全局给紧阈值——全局注册一个、路由级覆盖一个，两者并存时路由级优先。

## 5. 执行顺序验证实验

给同一接口挂上全部组件，每个组件打一行日志：

```typescript
// 临时实验：probe.guard.ts / probe.interceptor.ts / probe.filter.ts
// 各自 console.log 标识自身，全部注册后请求 POST /todos 观察输出
```

```bash
# 请求 POST /todos（body 合法），控制台输出顺序：
# [guard] AuthGuard
# [guard] RolesGuard
# [interceptor] 前半
# [pipe] ValidationPipe 校验通过
# [handler] TodosController.create
# [interceptor] 后半

# 把 body 改成非法数据再请求：
# [guard]、[interceptor] 前半、[pipe] 校验失败、[filter] 兜底
# —— handler 与拦截器后半消失，管道失败直接跳到过滤器
```

**讲解：**

1. 成功路径按上一篇的七层表严格递进；异常路径中，守卫抛异常时拦截器与管道都不会执行，处理器抛异常时拦截器的 `catchError` 先收到、过滤器最后兜底。
2. 把这套实验写进学习笔记：将来排查"过滤器没生效""拦截器跑了两次"类问题时，按时序逐层断点即可定位。

## 6. 拦截器常见坑

**坑一：忘了返回 `next.handle()`。** `intercept` 里只写了前半段日志就结束，返回 undefined——客户端永远等不到响应。拦截器的返回值就是响应流，函数结尾必然是 `return next.handle().pipe(...)`。

**坑二：`catchError` 里"接住就吞"。** 捕获后既不 rethrow 也不返回兜底值，流归于完结，过滤器收不到异常，客户端拿到 200 空响应。`catchError` 的纪律：**要么翻译后 `throwError(() => ...)` 继续抛，要么返回一个合法的回退值（如缓存数据）**——不许静默吞。

**坑三：`tap` 里改数据。** `tap((data) => data.items = [])` 一样能改对象（引用语义），于是"只观察"的约定被悄悄破坏。改数据用 `map`，`tap` 里只打日志、埋点。

**坑四：全局 + 路由级重复挂载。** 同一个拦截器既在 `APP_INTERCEPTOR` 全局注册，又在路由上 `@UseInterceptors` 挂了一次——跑两遍，日志翻倍、缓存写两次。排查口诀：**先查全局注册表，再查装饰器**；全局已覆盖的路由级挂载全部删掉。

**坑五：在拦截器里 console.log 上生产。** 高 QPS 下每请求两行日志先拖垮磁盘。用 `nestjs-pino` 等结构化日志库（或按日志级别判断），把第 1 节的 LoggingInterceptor 当教学版。

## 7. 动手实践：遮代码自检

先只读任务与提示，自己写完再对照参考实现。

**任务**：写一个 `SlowRequestInterceptor`，要求——

1. 处理耗时超过阈值（构造器可配，默认 1000ms）的请求时，打印 `[SLOW] POST /todos 耗时 2340ms`（走 `Logger.warn` 而不是 console.log）；
2. 未超时的请求不打印任何内容（别让正常流量刷屏）；
3. 在 TodosController 上以带阈值的方式挂载（如 500ms），并说明它与全局 LoggingInterceptor 同时存在时的执行顺序。

**提示**：耗时判断天然属于响应流的"后半"——tap 的回调在处理器成功返回后才执行，那里正是 `Date.now() - start` 出结果的地方；阈值经构造器传入（第 165 篇 useFactory 的思路），挂载时用 `@UseInterceptors(new SlowRequestInterceptor(500))` 传实例。

**参考实现**（先自己写完再看）：

```typescript
// src/common/interceptors/slow-request.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor
} from "@nestjs/common"
import { Observable, tap } from "rxjs"

@Injectable()
export class SlowRequestInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SlowRequestInterceptor.name)

  constructor(private readonly thresholdMs = 1000) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest()
    const start = Date.now()
    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - start
        if (elapsed > this.thresholdMs) {
          // 只在超阈值时发声：异常才值得日志
          this.logger.warn(`[SLOW] ${req.method} ${req.url} 耗时 ${elapsed}ms`)
        }
      })
    )
  }
}
```

```typescript
// todos.controller.ts —— 挂载
@UseInterceptors(new SlowRequestInterceptor(500))
@Controller("todos")
export class TodosController {}
```

要点自查：

- 判断与打印都在 `tap` 回调里，"后半段"由流驱动，不需要定时器；
- `Logger.warn` 带上下文名（Interceptor 类名），比裸 console.log 多了可过滤性（坑五的最低成本解法）；
- 与全局 LoggingInterceptor 并存时顺序固定：请求进入先跑全局前半、再跑路由级前半，返回时**后挂载的后半先执行**（洋葱模型，先进后出）——所以 `[SLOW]` 出现在访问日志 `<--` 行之前；
- 若这个拦截器将来需要注入配置服务（如从 ConfigService 读阈值），就不能再 `new`——改回类挂载并用模块 providers + useFactory 组装（第 165 篇第 2.3 节）。

## 8. 小结与延伸

- 拦截器答"进出来什么"：`tap` 做副作用、`map` 做响应变换、`timeout` 上闹钟、`catchError` 做错误转换；响应是流，前半段做请求侧、管道做响应侧。
- 异常过滤器答"出错怎么办"：`BusinessException` 携带业务码，`@Catch()` 全量兜底统一错误结构。
- 全局组件用 `APP_GUARD` / `APP_INTERCEPTOR` / `APP_FILTER` 注册，支持 DI 且顺序可控；注册机制原理见[依赖注入与 Provider 体系](/nestjs/165-DiContainerAndProviders)。
- 拦截器四坑：忘返回流、catchError 吞错、tap 改数据、全局路由双重挂载。
- 延伸：`@nestjs/terminus` 健康检查见官方 Interceptors 章节；RxJS 学习重点先掌握 tap、map、timeout、catchError 四个操作符即可覆盖九成场景。
