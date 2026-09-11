---
order: 170
title: NestJS 管道校验与异常处理
module: 'nestjs'
category: 后端技术
difficulty: intermediate
description: ValidationPipe + class-validator 做请求校验，NestJS 12 Standard Schema 新路径，异常过滤器统一错误响应。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nestjs/160-ModuleControllerService'
  - 'nestjs/180-DatabaseIntegration'
  - 'nestjs/200-GuardsAndLifecycle'
prerequisites:
  - 'nestjs/160-ModuleControllerService'
---

## 0. 一句话理解

> 管道（Pipe）在请求进入控制器前做"安检"：类型不对、字段缺失、格式错误，全部在门口拦截；异常过滤器负责把错误翻译成统一的 JSON 响应。

TS 类型只在编译期存在，攻击者发来的 JSON 可不管你的 `title: string`——把 `{"title": 123, "hack": "..."}` 直接灌进服务是真实风险。管道就是运行时的类型与规则守门员。

## 1. 安装校验依赖

```bash
npm i class-validator class-transformer
```

**讲解：**

1. `class-validator` 提供 `@IsString()`、`@IsInt()` 等声明式校验规则。
2. `class-transformer` 负责把普通请求对象转换成 DTO 类实例，校验规则才能真正生效。
3. 这对组合是 NestJS 官方文档的传统推荐；NestJS 12 另提供 Standard Schema 标准路径（第 6 节），两者并存按团队选型。

## 2. 给 DTO 加校验规则

```typescript
// src/todos/dto/create-todo.dto.ts
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength
} from "class-validator"

export class CreateTodoDto {
  @IsString()
  @MinLength(1, { message: "标题不能为空" })
  @MaxLength(100, { message: "标题最长 100 字" })
  title: string

  @IsOptional() // 字段缺省时跳过后续校验
  @IsBoolean()
  done?: boolean

  @IsOptional()
  @IsIn(["low", "mid", "high"], { message: "优先级必须是 low/mid/high" })
  priority?: "low" | "mid" | "high"

  @IsOptional()
  @Type(() => Number) // 表单提交时数字也可能是字符串，先转换再校验
  @IsInt()
  @Min(1, { message: "预计小时数至少 1" })
  @Max(1000)
  estimatedHours?: number
}
```

```typescript
// import 部分补充：Type 来自 class-transformer
import { Type } from "class-transformer"
```

**讲解：**

1. 装饰器从上到下依次校验：先确认是字符串，再检查长度；一组规则表达一个字段的完整契约。
2. `message` 自定义错误文案；不写则返回英文默认消息。
3. `@IsOptional()` 表示字段可以缺省，缺省时跳过其余校验；没有它，`done` 不传就会被判为校验失败——初学最常见的"莫名其妙 400"。
4. `@Type(() => Number)` 先做类型转换再校验：JSON 数字没问题，但表单/查询串来的都是字符串，转换 + 校验要成对出现。
5. 嵌套对象与数组另有 `@ValidateNested()` + `@Type(() => 子Dto)` 与 `@ArrayMinSize()` 等，套路相同：形状复杂到哪，规则就跟到哪。

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
  await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
```

**讲解：**

1. `whitelist: true`：自动删除 DTO 里没有声明属性的多余字段，防止"额外字段注入"。
2. `forbidNonWhitelisted: true`：出现多余字段直接报 400，适合严格接口；两个一起开时后者生效（报错而非静默剥离）。
3. `transform: true`：把请求对象转换成 DTO 实例，路径参数 `"1"` 也会按类型转成数字；配合 `transformOptions: { enableImplicitConversion: true }` 还能按 TS 类型自动转换基础类型，但显式 `@Type` 更可控。
4. 全局注册一次全应用生效；也可以在控制器/方法上用 `@UsePipes(new ValidationPipe({...}))` 只对个别路由启用。

## 4. 验证效果

```bash
# 缺 title：返回 400 与错误消息
curl -X POST http://localhost:3000/todos -H "Content-Type: application/json" -d '{}'

# 多余字段：返回 400
curl -X POST http://localhost:3000/todos -H "Content-Type: application/json" -d '{"title":"x","hack":1}'
```

```json
// 第一条请求的响应体
{
  "message": ["标题不能为空"],
  "error": "Bad Request",
  "statusCode": 400
}
```

**讲解：**

1. `message` 是数组：一次把所有校验错误全部返回，客户端可直接展示，用户不用"改一个错再来一次"。
2. 第二条请求返回 `property hack should not exist`，把注入风险挡在业务逻辑之外。
3. 校验失败发生在管道层，服务方法根本不会被调用——这是"纵深防御"的第一道门。

## 5. 内置管道与自定义管道

除了校验整包的 `ValidationPipe`，Nest 还有一批单参数管道：

| 管道 | 作用 | 失败响应 |
| --- | --- | --- |
| `ParseIntPipe` | 路径/查询参数转整数 | 400 |
| `ParseBoolPipe` | 转布尔 | 400 |
| `ParseUUIDPipe` | 校验 UUID 格式 | 400 |
| `ParseArrayPipe` | 校验并拆分数组 | 400 |
| `DefaultValuePipe` | 缺省时给默认值 | - |

需要业务规则（如"标题不能重复"）时写自定义管道：

```typescript
// src/todos/unique-title.pipe.ts
import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common"

@Injectable()
export class UniqueTitlePipe implements PipeTransform {
  // 管道也是 Provider，可以在这里注入服务查重
  transform(value: unknown) {
    if (typeof value === "object" && value !== null && "title" in value) {
      // 真实实现：注入 TodosService 查库比对
    }
    return value // 返回值继续传给下一个管道与控制器
  }
}

// 用法：@Post() create(@Body(new UniqueTitlePipe()) dto: CreateTodoDto)
```

**讲解：**

1. 内置管道解决"类型与格式"，ValidationPipe 解决"DTO 契约"，自定义管道解决"业务规则"——三层各司其职。
2. 管道可以注入依赖（`@Injectable()` + 构造器注入），所以"查数据库查重"这类逻辑也不必下沉到服务之前的手写 if。

## 6. NestJS 12：Standard Schema 校验路径

v12 原生支持 Standard Schema——zod、valibot、arktype 等校验库的统一接口。schema 直接交给参数装饰器，框架用内置的 `StandardSchemaValidationPipe` 完成校验：

```typescript
// NestJS 12：zod schema 直接挂在 @Body 上（概念示例，API 以官方文档为准）
import { z } from "zod"

const createTodoSchema = z.object({
  title: z.string().min(1).max(100),
  done: z.boolean().optional()
})

@Post()
create(@Body({ schema: createTodoSchema }) dto: unknown) {
  // 校验失败由框架自动返回 400；团队已有 zod schema 可直接复用
  return this.todosService.create(dto as { title: string })
}
```

**讲解：**

1. 价值在于"一套 schema 三处用"：配置校验（见[配置与环境变量校验](/nestjs/220-ConfigEnvValidation)）、请求校验、前端表单复用同一份定义。
2. class-validator 没有被取代：官方文档仍以它为默认示例，存量项目不必迁移；新团队若已深度使用 zod，v12 的路径更顺手。
3. 本模块示例主线保持 class-validator（兼容 11/12 两代），涉及 v12 专有 API 时已标注"以官方文档为准"。

## 7. 异常过滤器：统一错误格式

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

1. `@Catch(HttpException)` 声明这个过滤器只处理 HTTP 异常，其他异常继续走默认流程；`@Catch()` 不带参数则兜底一切异常（进阶见[拦截器与异常过滤器](/nestjs/210-InterceptorsAndFilters)）。
2. `host.switchToHttp()` 拿到底层请求/响应对象，`getResponse()` 是 Express 的 response；换 Fastify 适配器时这里要跟随调整。
3. 最终统一输出 `{ code, message, timestamp }` 结构，前端只需要解析一种错误格式。
4. 在 `main.ts` 用 `app.useGlobalFilters(new HttpExceptionFilter())` 注册为全局过滤器；要注入依赖则用 `APP_FILTER` Provider 方式注册。

## 8. 常见陷阱

1. **写了校验装饰器却没启用 ValidationPipe**：装饰器全部静默失效，非法数据直接进服务。装了依赖只是第一步，`useGlobalPipes` 才通电。
2. **忘写 `@IsOptional()`**：可选字段不传直接 400，报错信息还让人摸不着头脑。
3. **whitelist 与 forbidNonWhitelisted 同时开**：后者优先（报 400），预期"静默剥离"的团队会奇怪为什么开始报错——二选一，按接口严格程度定。
4. **只校验不转换**：查询串里 `"12"` 与数字 `12` 严格比较不等；`transform: true` + `@Type` 是成对动作。
5. **过滤器里访问不到请求上下文**：过滤器处理的是"异常时刻"，想拿请求信息用 `host.switchToHttp().getRequest()`，而不是把 request 存到全局变量（并发下必然串）。
6. **class-transformer 与 Nest 版本不配套**：升级 Nest 后出现转换行为异常，先核对两个校验库的 peer 版本要求再排查自己的代码。

## 9. 动手试试

1. 给 `title` 加 `@Matches(/^[a-zA-Z0-9 ]+$/)` 规则，验证中文标题被拒绝。
2. 查询不存在的 id 时抛 `new NotFoundException("待办不存在")`（服务里已有 `findOne`），确认响应走统一格式。
3. 把过滤器注册为全局，测试校验失败的响应是否也带 `timestamp`。
4. 如果团队用 zod：把第 2 节的 DTO 用 zod 重写一遍，对比两种表达方式的错误信息质量。

## 10. 本篇小结

**初学者要点：**

- 校验交给管道、错误交给过滤器：入口越严格，业务代码越干净；全局统一错误结构，前端对接成本最低。
- 三件套缺一不可：依赖安装、DTO 装饰器、全局启用 ValidationPipe。
- `@IsOptional()` 与 `transform: true` 是两个最高频的坑位开关。

**进阶注意：**

- NestJS 12 的 Standard Schema 打通 zod 生态，"配置、请求、文档共享 schema"成为可能；存量 class-validator 项目无需迁移。
- 校验管"形状"，业务规则管道管"语义"，过滤器管"输出"——三层边界清楚，接口才可靠。
