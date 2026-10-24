---
order: 250
title: OpenAPI/Swagger 文档生成
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: '@nestjs/swagger 装配、DTO 装饰器与 Mapped types、与 ValidationPipe 校验 schema 的一致性、鉴权 scheme 声明，以及 openapi.json 驱动的联调与代码生成。'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'nestjs/170-ValidationPipes'
  - 'nestjs/205-AuthJwtAndPassport'
  - 'nestjs/200-GuardsAndLifecycle'
prerequisites:
  - 'nestjs/160-ModuleControllerService'
  - 'nestjs/170-ValidationPipes'
---

## 知识点地图

- **知识类别**：接口文档自动化——用 @nestjs/swagger 从代码生成 OpenAPI 规范与可交互文档。
- **解决什么问题**：接口文档手写必然过时（代码改了文档忘改）；前后端联调靠嘴对齐字段；测试同学没有可自助调试的入口。文档从代码生成后，「代码即文档」——结构变化自动反映。
- **什么时候用到**：前后端分工的任何项目；提供 API 给外部/其他团队时；想给客户端生成类型定义（TS SDK）时。

前置：管道与 DTO 校验（nestjs/170-ValidationPipes）——本篇文档的 schema 与校验共用 DTO，这是「一致性」的来源；认证（nestjs/205-AuthJwtAndPassport）——文档里的 authorize 按钮对接它。

## 1. 心智模型：OpenAPI 是合同，Swagger 是查看器

两个词分清：**OpenAPI** 是接口描述规范（一个 JSON/YAML 格式），**Swagger UI** 是把 OpenAPI 渲染成可交互页面的工具。Nest 的 @nestjs/swagger 做的事：扫描你的控制器与 DTO，生成 OpenAPI 文档（`/docs-json`），并挂上 Swagger UI（`/docs`）。

「文档从代码生成」的价值排序：**不会过时**（重新构建即更新）> **可机器消费**（openapi.json 驱动代码生成、契约测试）> **可交互**（Swagger UI 直接发请求）。反过来它的代价也要清楚：文档粒度取决于装饰器投入——不写装饰器的 DTO 生成的文档只有字段名没有语义，生成的是「合法但没用」的文档。

## 2. 装配：五分钟接入

```bash
npm i @nestjs/swagger
```

```typescript
// src/main.ts
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const config = new DocumentBuilder()
    .setTitle("Todo API")
    .setDescription("待办事项服务接口文档")
    .setVersion("1.0")
    .addBearerAuth()                                // 声明 Bearer 鉴权（对接 205）
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup("docs", app, document)        // UI 挂在 /docs
  await app.listen(3000)
}
```

`/docs` 是给人看的交互页、`/docs-json` 是给机器消费的 OpenAPI JSON——**联调给前者，代码生成给后者**，一个来源两种出口。

## 3. DTO 装饰器：文档的语义层

### 3.1 基础装饰器

```typescript
// src/todos/dto/create-todo.dto.ts
import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsOptional, IsInt, Min, Max } from "class-validator"

export class CreateTodoDto {
  @ApiProperty({ description: "待办标题", example: "写周报", maxLength: 100 })
  @IsString()
  title: string

  @ApiPropertyOptional({ description: "优先级 1-5", example: 3, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number
}
```

注意 `@ApiProperty` 与校验装饰器的**同源关系**：两者描述同一个字段（title 是必填字符串、priority 是 1-5 的整数）， Swagger 的 `minimum/maximum` 与 class-validator 的 `@Min/@Max` 必须一致——**不一致时文档说一套、校验做另一套**，前端照文档写就收 400。这是「与 ValidationPipe 产出 schema 的一致性」问题的日常形态，治理手段是第 4 节的集成测试。

### 3.2 响应与端点装饰器

```typescript
import { ApiOkResponse, ApiCreatedResponse, ApiBearerAuth, ApiTags } from "@nestjs/swagger"

@ApiTags("todos")                                   // 文档分组
@ApiBearerAuth()                                    // 标记此组接口需要 Bearer token
@Controller("todos")
export class TodosController {
  @Post()
  @ApiCreatedResponse({ type: Todo })               // 201 返回的结构
  create(@Body() dto: CreateTodoDto) {}

  @Get()
  @ApiOkResponse({ type: [Todo] })                  // 数组返回
  findAll() {}
}
```

`ApiProperty`/`ApiPropertyOptional` 与校验装饰器配套的约定：**可选字段在文档与校验里同时可选**——DTO 类上 TypeScript 的 `?` 只影响编译期，Swagger 与 class-validator 都不读它，两层装饰器要各自声明 optional。

## 4. Mapped types：从基类派生而不是复制

一组 DTO 里大量重复（创建/更新/查询字段几乎一样），@nestjs/swagger 的 Mapped types 从基类派生：

```typescript
import { PartialType, PickType, OmitType } from "@nestjs/swagger"

// UpdateTodoDto：全字段可选（PATCH 语义）
export class UpdateTodoDto extends PartialType(CreateTodoDto) {}

// 查询参数：只取 title 与 priority，且全部可选
export class QueryTodoDto extends PartialType(PickType(CreateTodoDto, ["title", "priority"] as const)) {}

// 管理视图：多一个 ownerEmail 字段
export class AdminTodoDto extends OmitType(CreateTodoDto, ["priority"]) {
  @ApiProperty({ description: "创建人邮箱" })
  ownerEmail: string
}
```

为什么必须用 Mapped types 而不是手写重复 DTO：继承链保留了父类的**校验装饰器与 ApiProperty**——手写副本时「基类加了个 @Max(5)」不会同步到副本，文档与校验的双重漂移就发生了。PartialType/PickType/OmitType 是「继承装饰器」的唯一可靠方式（TypeScript 的 extends 只继承字段不继承装饰器元数据）。

## 5. 一致性保障与鉴权声明

### 5.1 文档与校验的一致性测试

「文档说一套校验做一套」的根治是把一致性变成测试：

```typescript
// test/docs-consistency.e2e-spec.ts（思路示意）
it("文档与校验行为一致", async () => {
  const dto = new CreateTodoDto()
  dto.title = "x".repeat(200)                       // 文档 maxLength: 100
  const res = await request(app.getHttpServer())
    .post("/todos").send(dto)
  expect(res.status).toBe(400)                      // 校验拒绝 → 与文档一致
  // 反例：若这里返回 201，说明校验没 maxLength，文档与行为已漂移
})
```

更省力的习惯：**改校验装饰器时同步改 ApiProperty 的注释值**（同一个 PR 里相邻两行），code review 时「校验与文档装饰器同改」作为检查项——测试兜底，习惯防微。

### 5.2 鉴权 scheme 与 authorize 按钮

`addBearerAuth()`（第 2 节）+ `@ApiBearerAuth()`（第 3.2 节）装配后，Swagger UI 右上角出现 Authorize 按钮，粘贴登录拿到的 token 后，后续请求自动带 `Authorization: Bearer ...`：

```typescript
// 联调工作流：先调 /auth/login 拿 token → 点 Authorize 粘贴 → 之后所有受保护接口可直接试调
```

没有这套声明时，Swagger UI 调受保护接口永远 401——文档「能看不能试」，联调价值折半。对接细节（token 从哪来）见《认证与授权》nestjs/205 的登录端点。

## 6. 工程场景

### 6.1 场景一：前后端契约联调

新接口的设计流程：后端先写 DTO + 空实现 → 生成的 /docs 给前端 → 前端照文档 mock 开发 → 后端补实现，字段即契约。**易错点**：DTO 里漏标 `@ApiProperty` 的字段不出现在文档里，前端「不知道有这个字段」——评审 DTO 时把「文档预览」打开对照（本地 /docs 实时刷新），漏标当场暴露。枚举与联合类型用 `@ApiProperty({ enum: PriorityEnum, enumName: "Priority" })` 显式声明，否则文档里只是 number，前端拿到合法值域之外还得问。

### 6.2 场景二：swagger-ui 自检页与联调环境

把 /docs 挂在联调环境（staging），测试同学自助构造请求、验证边界值，减少「找后端复现」的沟通成本。部署决策两个：**生产环境关掉文档**（`if (config.get("NODE_ENV") !== "production") SwaggerModule.setup(...)`）或挂在内网域名加 Basic Auth——文档暴露接口全集是攻击者的地图，这是文档安全的第一原则。

### 6.3 场景三：导出 openapi.json 驱动代码生成

```bash
# CI 里导出契约
curl http://staging.internal/docs-json > openapi.json
```

openapi.json 的下游消费：

1. **客户端 SDK 生成**：openapi-typescript / orval 生成带类型的请求函数，前端不再手写接口层——后端改字段，前端类型检查直接报错（契约破坏在编译期暴露）；
2. **契约测试**：CI 对比新旧 openapi.json 的 breaking change（删字段、改类型），破坏性变更强制走版本升级评审；
3. **Mock 服务**：按 schema 生成 mock server，前端在后端完成前就能并行开发。

「一次生成、三处消费」是 openapi.json 的复利——也是「文档要从代码生成」的最终理由：手工文档给不了机器可消费的契约。

## 7. 动手实践

**任务一**：给项目接入 Swagger 并补全一个 CRUD 资源的文档。要求：每个 DTO 字段有 description 与 example；列表接口标出 200 与 404 两种响应；受保护接口带 @ApiBearerAuth。完成后打开 /docs 自查三处：分组是否清晰、能否试调、返回结构是否展示。

<details>
<summary>任务一参考自查点</summary>

常见遗漏：分页响应直接 `type: [Todo]` 丢了分页元信息——包装类（`data/tota/limit`）要单独建响应 DTO（如 `PaginatedTodoDto`）；`@ApiTags` 忘了打导致全部接口堆在 default 组；example 缺失导致试调时字段全空。自查口诀：「每组有 Tag、每字段有 example、每接口有响应类型」。
</details>

**任务二**：制造一次「文档与校验漂移」并测试捕获。要求：给 DTO 的某字段文档写 `maxLength: 50`、校验装饰器写 `@MaxLength(100)`，跑第 5.1 节的一致性测试思路（用 60 字符的值），观察「文档说拒绝、实际通过」的漂移；修复后确认测试变绿。

<details>
<summary>任务二参考观察</summary>

60 字符的值在文档口径下应 400、在真实校验下 201 通过——测试断言失败暴露漂移。这个练习的意义：一致性测试的断言方向是「行为符合文档」而不是「文档符合行为」，谁为谁是主要在团队约定（推荐：**校验是主、文档跟随**，因为校验才真正执行）。
</details>

**任务三**：导出 openapi.json 并用 openapi-typescript 生成前端类型。要求：对比手写接口类型与生成类型的差异，找出至少一处「后端已改、前端类型没跟上」的不一致（没有就构造一处）。

<details>
<summary>任务三参考观察</summary>

典型不一致：后端把 `priority: number` 改成了枚举字符串，前端手写类型还是 number——生成类型直接是 `"low" | "medium" | "high"`，编译期立刻报错。这验证了第 6.3 节的价值：契约破坏从「联调时炸」前移到「编译时炸」。工程化收尾：把导出与类型生成挂进 CI，契约变更以 diff 形式出现在 PR 里供评审。
</details>

## 8. 下一步与延伸阅读

- 《校验管道与异常响应》（nestjs/170-ValidationPipes）：与文档共享 DTO 的校验层；
- 《认证与授权：Passport 与 JWT》（nestjs/205-AuthJwtAndPassport）：@ApiBearerAuth 对接的登录端点；
- 《守卫与请求生命周期》（nestjs/200-GuardsAndLifecycle）：受保护接口的守卫机制。

## 参考与致谢

- NestJS 官方文档 OpenAPI (Swagger)：<https://docs.nestjs.com/openapi/introduction>；
- OpenAPI Specification：<https://spec.openapis.org/oas/latest.html>（Apache 2.0 许可的规范文本）；
- 本篇正文为教学重写；Mapped types 的派生语义沿用官方文档的通行用法。
