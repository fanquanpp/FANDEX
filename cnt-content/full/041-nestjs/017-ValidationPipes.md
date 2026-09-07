---
order: 170
title: NestJS 管道校验与异常处理
module: 'nestjs'
category: 后端技术
difficulty: intermediate
description: ValidationPipe + class-validator 做请求校验，用异常过滤器统一错误响应，让接口从"能用"到"可靠"。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'nestjs/016-ModuleControllerService'
  - 'nestjs/018-DatabaseIntegration'
prerequisites:
  - 'nestjs/016-ModuleControllerService'
---

## 0. 一句话理解

> 管道（Pipe）在请求进入控制器前做"安检"：类型不对、字段缺失、格式错误，全部在门口拦截；异常过滤器负责把错误翻译成统一的 JSON 响应。

## 1. 安装校验依赖

```bash
npm i class-validator class-transformer
```

**讲解：**

1. `class-validator` 提供 `@IsString()`、`@IsInt()` 等声明式校验规则。
2. `class-transformer` 负责把普通请求对象转换成 DTO 类实例，校验规则才能真正生效。

## 2. 给 DTO 加校验规则

```typescript
// src/todos/dto/create-todo.dto.ts
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from "class-validator"

export class CreateTodoDto {
  @IsString()
  @MinLength(1, { message: "标题不能为空" })
  @MaxLength(100, { message: "标题最长 100 字" })
  title: string

  @IsOptional()
  @IsBoolean()
  done?: boolean
}
```

**讲解：**

1. 装饰器从上到下依次校验：先确认是字符串，再检查长度。
2. `message` 自定义错误文案；不写则返回英文默认消息。
3. `@IsOptional()` 表示字段可以缺省，缺省时跳过其余校验。

## 3. 全局启用 ValidationPipe

```typescript
// src/main.ts
import { NestFactory } from "@nestjs/core"
import { ValidationPipe } from "@nestjs/common"
import { AppModule } from "./app.module"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  )
  await app.listen(3000)
}
bootstrap()
```

**讲解：**

1. `whitelist: true`：自动删除 DTO 里没有声明属性的多余字段，防止"额外字段注入"。
2. `forbidNonWhitelisted: true`：出现多余字段直接报 400，适合严格接口。
3. `transform: true`：把请求对象转换成 DTO 实例，路径参数 `"1"` 也会按 DTO 类型转成数字。

## 4. 验证效果

```bash
# 缺 title：返回 400 与错误消息
curl -X POST http://localhost:3000/todos -H "Content-Type: application/json" -d '{}'

# 多余字段：返回 400
curl -X POST http://localhost:3000/todos -H "Content-Type: application/json" -d '{"title":"x","hack":1}'
```

**讲解：**

1. 第一句返回 `{ message: ["标题不能为空"], error: "Bad Request", statusCode: 400 }`，客户端可直接展示错误数组。
2. 第二句返回 `property hack should not exist`，把注入风险挡在业务逻辑之外。
3. 校验失败发生在管道层，服务方法根本不会被调用——这是"纵深防御"的第一道门。

## 5. 异常过滤器：统一错误格式

```typescript
// src/common/filters/http-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException
} from "@nestjs/common"
import { Response } from "express"

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const status = exception.getStatus()
    const body = exception.getResponse()

    response.status(status).json({
      code: status,
      message: typeof body === "string" ? body : (body as any).message,
      timestamp: new Date().toISOString()
    })
  }
}
```

**讲解：**

1. `@Catch(HttpException)` 声明这个过滤器只处理 HTTP 异常，其他异常继续走默认流程。
2. `host.switchToHttp()` 拿到底层请求/响应对象，`getResponse()` 是 Express 的 response。
3. 最终统一输出 `{ code, message, timestamp }` 结构，前端只需要解析一种错误格式。
4. 在 `main.ts` 用 `app.useGlobalFilters(new HttpExceptionFilter())` 注册为全局过滤器。

## 6. 动手试试

1. 给 `title` 加 `@Matches(/^[a-zA-Z0-9 ]+$/)` 规则，验证中文标题被拒绝。
2. 新建一个 `NotFoundException` 场景：查询不存在的 id 时抛 `new NotFoundException("待办不存在")`，确认响应格式。
3. 把过滤器注册为全局，测试校验失败的响应是否也走统一格式。

## 7. 一句话记住

> 校验交给管道、错误交给过滤器：入口越严格，业务代码越干净；全局统一错误结构，前端对接成本最低。
