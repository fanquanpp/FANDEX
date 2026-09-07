---
order: 190
title: NestJS 单元测试与端到端测试
module: 'nestjs'
category: 后端技术
difficulty: intermediate
description: Jest 单元测试服务逻辑，Supertest 端到端测试真实 HTTP 接口，让重构有安全网。
author: fanquanpp
updated: '2026-08-03'
related:
  - 'nestjs/018-DatabaseIntegration'
  - 'software-testing/023-JestBasics'
  - 'software-testing/013-APIAutomationTest'
prerequisites:
  - 'nestjs/018-DatabaseIntegration'
---

## 0. 一句话理解

> 单元测试只测"一个类"（服务），把数据库换成假的；端到端测试启动整个应用，用真实 HTTP 请求验证"从路由到响应"的完整链路。

## 1. 服务单元测试

```typescript
// src/todos/todos.service.spec.ts
import { Test } from "@nestjs/testing"
import { TodosService } from "./todos.service"
import { PrismaService } from "../prisma/prisma.service"

describe("TodosService", () => {
  let service: TodosService
  const prisma = {
    todo: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn()
    }
  }

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TodosService,
        { provide: PrismaService, useValue: prisma }
      ]
    }).compile()

    service = moduleRef.get(TodosService)
  })

  it("创建待办时调用 prisma.todo.create", async () => {
    prisma.todo.create.mockResolvedValue({
      id: 1,
      title: "测试",
      done: false
    })

    const result = await service.create({ title: "测试" })

    expect(prisma.todo.create).toHaveBeenCalledWith({
      data: { title: "测试", done: false }
    })
    expect(result.id).toBe(1)
  })
})
```

**讲解：**

1. `Test.createTestingModule` 用测试模块替代真实应用，只加载被测服务。
2. `{ provide: PrismaService, useValue: prisma }` 是"替身注入"：用 `jest.fn()` 假对象替换数据库，测试不碰真实数据库。
3. `mockResolvedValue` 设置假返回；`toHaveBeenCalledWith` 断言调用参数，防止服务悄悄改错了入参。
4. 单元测试的关键：只测 `TodosService` 自己的逻辑，数据库行为由 `expect` 调用参数来约束。

## 2. 控制器单元测试

```typescript
// src/todos/todos.controller.spec.ts
import { Test } from "@nestjs/testing"
import { TodosController } from "./todos.controller"
import { TodosService } from "./todos.service"

describe("TodosController", () => {
  let controller: TodosController

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TodosController],
      providers: [
        {
          provide: TodosService,
          useValue: { create: jest.fn(), findAll: jest.fn(), remove: jest.fn() }
        }
      ]
    }).compile()

    controller = moduleRef.get(TodosController)
  })

  it("findAll 返回服务结果", async () => {
    jest
      .spyOn(controller as any, "todosService")
      .mockReturnValue({ findAll: () => [] })

    // 更常见做法：先拿到 service 替身再断言
    const service = moduleRef.get(TodosService)
    service.findAll = jest.fn().mockResolvedValue([])
    await expect(controller.findAll()).resolves.toEqual([])
  })
})
```

**讲解：**

1. 控制器测试同样注入替身服务，验证"路由方法把参数正确传给服务"。
2. `useValue` 里的三个方法都是 `jest.fn()`，未被调用的方法不会影响测试。
3. 注意：真实测试里应通过 `moduleRef.get(TodosService)` 拿到替身再设置返回值，不要在私有属性上做手脚。

## 3. 端到端测试

```typescript
// test/todos.e2e-spec.ts
import { Test } from "@nestjs/testing"
import { INestApplication, ValidationPipe } from "@nestjs/common"
import request from "supertest"
import { AppModule } from "../src/app.module"

describe("Todos (e2e)", () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile()

    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }))
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it("POST /todos 创建并返回 201", async () => {
    const res = await request(app.getHttpServer())
      .post("/todos")
      .send({ title: "写测试" })
      .expect(201)

    expect(res.body.title).toBe("写测试")
  })

  it("校验失败返回 400", async () => {
    await request(app.getHttpServer())
      .post("/todos")
      .send({})
      .expect(400)
  })
})
```

**讲解：**

1. e2e 测试加载 `AppModule` 完整应用，`app.init()` 后通过 `app.getHttpServer()` 接收真实 HTTP 请求。
2. `supertest` 的 `.expect(201)` 断言状态码，`.send({...})` 发送请求体——与真实客户端行为一致。
3. `beforeAll/afterAll` 启动与关闭应用；测试间共享状态时注意用 `beforeEach` 清理数据。
4. e2e 测试可以连真实测试数据库，也可以注入内存实现；连真实库时每个用例后要清理数据，避免用例互相污染。

## 4. 测试策略建议

| 层级 | 覆盖内容 | 速度 | 数量 |
| --- | --- | --- | --- |
| 单元测试 | 服务、工具函数、管道逻辑 | 毫秒级 | 多 |
| 控制器测试 | 参数传递、状态码 | 毫秒级 | 中 |
| e2e 测试 | 完整链路、校验、数据库 | 秒级 | 少 |

## 5. 动手试试

1. 为 `TodosService.remove` 写单元测试：删除不存在记录时，Prisma 抛错被转换成 404。
2. 为 `POST /todos` 补充 e2e 用例：发送 101 个字符的标题，断言 400。
3. 运行 `npm test` 与 `npm run test:e2e`，把两个失败用例修到全绿。

## 6. 一句话记住

> 单元测试用替身隔离依赖、测逻辑；e2e 测试起真应用、走真 HTTP；两者配合，重构时才有底气。
