---
order: 210
title: 拦截器与异常过滤器
module: 'nestjs'
category: 后端技术
difficulty: intermediate
description: NestInterceptor 响应变换与耗时日志，ExceptionFilter 全局兜底，验证管线执行顺序。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nestjs/170-ValidationPipes'
prerequisites:
  - 'nestjs/160-ModuleControllerService'
---

## 0. 环绕逻辑与错误兜底（先读这里）

> 学习目标：用 NestInterceptor 实现耗时日志与统一响应壳，掌握 RxJS 的 map、tap、catchError 在拦截器中的分工；定义业务异常并编写全量异常过滤器；用实验验证整条管线的执行顺序。

上一篇的管线表里，守卫负责"能不能进"，而"进出来什么"（拦截器）与"出错怎么办"（异常过滤器）是本章主角。拦截器横跨处理前后两半，异常过滤器兜底所有未捕获异常，两者共同决定接口的最终输出形态。

## 1. 拦截器：日志与耗时统计

拦截器是函数式思维：`next.handle()` 返回响应流（RxJS Observable），写在 `handle()` 之前的逻辑是"前半"，用操作符加工返回流的是"后半"。

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
4. 全局注册方式与守卫一致：`{ provide: APP_INTERCEPTOR, useClass: TransformInterceptor }`，先注册的先执行。

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

## 4. 执行顺序验证实验

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

## 5. 小结与延伸

- 拦截器答"进出来什么"：`tap` 做副作用、`map` 做响应变换、`catchError` 做错误转换。
- 异常过滤器答"出错怎么办"：`BusinessException` 携带业务码，`@Catch()` 全量兜底统一错误结构。
- 全局组件用 `APP_GUARD` / `APP_INTERCEPTOR` / `APP_FILTER` 注册，支持 DI 且顺序可控。
- 延伸：`@nestjs/terminus` 健康检查与超时控制 `TimeoutInterceptor` 见官方 Interceptors 章节；RxJS 学习重点先掌握 tap、map、catchError 三个操作符即可覆盖八成场景。
