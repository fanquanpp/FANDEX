---
order: 190
title: NestJS 单元测试与端到端测试
module: 'nestjs'
category: 后端技术
difficulty: intermediate
description: '@nestjs/testing 替身注入做单元测试，Supertest 走真实 HTTP 做端到端测试，配合分层策略与 CI 让重构有安全网。'
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nestjs/180-DatabaseIntegration'
  - 'nestjs/200-GuardsAndLifecycle'
  - 'software-testing/240-JestBasics'
  - 'software-testing/120-APIAutomationTest'
prerequisites:
  - 'nestjs/180-DatabaseIntegration'
---

## 0. 一句话理解

> 单元测试只测"一个类"（服务），把数据库换成假的；端到端测试启动整个应用，用真实 HTTP 请求验证"从路由到响应"的完整链路。

NestJS 的依赖注入在测试里是"奖励"而不是"负担"：因为服务从不自己 `new` 依赖，测试就能通过 `@nestjs/testing` 把数据库、外部服务整体换成替身——类怎么写决定了它好不好测，这也是前几篇坚持"控制器一行调用服务、业务全在服务里"的回报时刻。

## 前置知识

- [接入数据库](/nestjs/180-DatabaseIntegration)：本篇的替身对象是 `PrismaService`，需要理解它在模块里的注册方式。
- [模块、控制器与服务](/nestjs/160-ModuleControllerService)：能独立写出一条"控制器 -> 服务"的完整链路。
- Jest 基础（`describe/it/expect` 与 mock 的含义）：见 software-testing 模块的 Jest 篇，本篇不展开语法。

## 学习目标

1. 会用 `Test.createTestingModule` 为服务与控制器写单元测试，并说出"替身注入"的两种形态（useValue / overrideProvider）。
2. 能编写 Supertest 端到端测试，覆盖正常路径、校验失败与鉴权三类场景。
3. 能说出单元测试与 e2e 测试的分工边界与数量配比。
4. 认识五个最常见的"测试假绿/翻车"陷阱并知道怎么防。

## 1. 服务单元测试：替身注入数据库

```typescript
// src/todos/todos.service.spec.ts
import { Test } from "@nestjs/testing"
import { TodosService } from "./todos.service"
import { PrismaService } from "../prisma/prisma.service"

describe("TodosService", () => {
  let service: TodosService
  let prisma: {
    todo: Record<"create" | "findMany" | "findUnique" | "delete", jest.Mock>
  }

  beforeEach(async () => {
    // 每个用例重建"假 Prisma"：只声明被测代码用到的四个方法，互不带脏状态
    prisma = {
      todo: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn()
      }
    }

    const moduleRef = await Test.createTestingModule({
      providers: [
        TodosService,
        { provide: PrismaService, useValue: prisma } // 替身注入：容器里没有真数据库
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

  it("删除不存在的记录时抛 404", async () => {
    // 模拟"数据库里查不到"：findOne 依赖的 findUnique 返回 null
    prisma.todo.findUnique.mockResolvedValue(null)

    await expect(service.remove(999)).rejects.toMatchObject({ status: 404 })
    expect(prisma.todo.delete).not.toHaveBeenCalled()
  })
})
```

**讲解：**

1. `Test.createTestingModule` 用测试模块替代真实应用，只加载被测服务；`.compile()` 之后容器里只有你声明的 Provider——这就是"单元"的物理边界。
2. `{ provide: PrismaService, useValue: prisma }` 是"替身注入"：注入令牌还是 `PrismaService`，但实例换成了 `jest.fn()` 组成的假对象，测试不碰真实数据库。
3. `mockResolvedValue` 设置假返回；`toHaveBeenCalledWith` 断言调用参数，防止服务悄悄改错了入参——即使不连库，"服务怎么用数据库"也被测试钉住了。
4. 第二个用例展示了替身的另一面：让 `findUnique` 返回 `null` 就能低成本制造"记录不存在"的分支，真实数据库反而难稳定构造这种场景。
5. `beforeEach` 里连同替身一起重建，保证每个用例拿到干净的 mock 状态；若用例较多，也可以在 `afterEach` 统一 `jest.clearAllMocks()`。

## 2. 控制器单元测试：验证"转交"逻辑

控制器测试的目标只有一个：路由方法把参数正确传给了服务。先拿到替身服务，再断言交互：

```typescript
// src/todos/todos.controller.spec.ts
import { Test } from "@nestjs/testing"
import { TodosController } from "./todos.controller"
import { TodosService } from "./todos.service"

describe("TodosController", () => {
  let controller: TodosController
  let service: Record<"create" | "findAll" | "remove", jest.Mock>

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      remove: jest.fn()
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [TodosController],
      providers: [{ provide: TodosService, useValue: service }]
    }).compile()

    controller = moduleRef.get(TodosController)
  })

  it("findAll 把调用转交给服务并返回其结果", async () => {
    service.findAll.mockResolvedValue([{ id: 1, title: "写测试", done: false }])

    await expect(controller.findAll()).resolves.toEqual([
      { id: 1, title: "写测试", done: false }
    ])
    expect(service.findAll).toHaveBeenCalledTimes(1)
  })

  it("create 把 DTO 原样传给服务", () => {
    const dto = { title: "学 NestJS" }
    controller.create(dto)
    expect(service.create).toHaveBeenCalledWith(dto)
  })
})
```

**讲解：**

1. 与服务测试同一套路：容器里放控制器与替身服务，用 `moduleRef.get` 同时取出两者——`get(TodosService)` 拿到的就是注入给控制器的同一个替身实例，设置返回值与断言调用都对着它操作。
2. 控制器测试不需要复刻 HTTP 语义（状态码、序列化），那是 e2e 的职责；单测只回答"转交是否正确"。
3. 反面做法是在 `controller` 的私有属性上 `spyOn` 偷换服务：能跑，但绕过了注入机制，重构（改名、改注入方式）时测试先碎。一切通过容器取替身。
4. 控制器逻辑极薄的项目里，这类测试数量可以少——把预算留给服务单测与 e2e，配比见第 5 节。

## 3. 端到端测试：真实 HTTP 全链路

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
    // 关键：全局管道要手工复刻 main.ts 的配置——e2e 不会自动读取启动文件
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

  it("未携带登录态访问受守卫保护的接口返回 401", async () => {
    await request(app.getHttpServer())
      .delete("/todos/1")
      .expect(401)
  })
})
```

**讲解：**

1. e2e 测试加载 `AppModule` 完整应用：守卫、拦截器、管道全部就位。`app.init()` 初始化应用但**不监听端口**，`app.getHttpServer()` 返回内部 server 供 Supertest 直连——比真实监听快且不吃端口；只有需要跨进程访问（如 WebSocket 握手、真实网络策略）时才改用 `app.listen()`。
2. `supertest` 的 `.expect(201)` 断言状态码，`.send({...})` 发送请求体——与真实客户端行为一致；`app.getHttpServer()` 是固定搭子。
3. 最经典的 e2e 翻车：`main.ts` 里的全局管道、全局过滤器没有在测试里复刻，导致"手工测试会 400，e2e 却 201"。要么在测试里同步配置，要么把配置抽成 `createApp()` 工厂函数让 `main.ts` 与测试共用——推荐后者。
4. 鉴权场景两种做法：直接带 `Authorization` 头（`.set("Authorization", "Bearer token")`，token 用测试专用密钥现签一个）；或在测试模块里 `overrideProvider` 把 `JwtService` 换成总是通过的替身。前者顺带验证了守卫接线，后者更快。
5. 连真实测试数据库时，用 `beforeEach` 清理表数据避免用例互相污染；更轻的做法是把 PrismaService 换成内存替身：

```typescript
// test/todos.e2e-spec.ts（片段）—— 整库替换成替身，e2e 依旧全链路但不碰真库
import { PrismaService } from "../src/prisma/prisma.service"

const prismaStub = {
  todo: {
    create: jest.fn().mockImplementation(({ data }) => ({
      id: Date.now(),
      ...data
    })),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    delete: jest.fn()
  }
}

// createTestingModule({ imports: [AppModule] }) 后串联：
//   .overrideProvider(PrismaService)
//   .useValue(prismaStub)
// overrideProvider 会覆盖 AppModule 里注册的原实现，其余组件照常生效
```

## 4. 运行与覆盖率

```bash
npm test                 # 跑全部 *.spec.ts 单元测试（Jest 默认配置）
npm test -- --coverage   # 收集覆盖率报告（Jest）
npm run test:e2e         # 跑 test/*.e2e-spec.ts（CLI 生成的独立 Jest 配置）
npm test -- --watch      # 监听模式，只重跑受影响的用例
```

**讲解：**

1. CLI 生成的项目自带两套 Jest 配置：单元测试匹配 `*.spec.ts`，e2e 匹配 `test/*.e2e-spec.ts`——两层的超时、环境与报告互相独立，`test:e2e` 脚本指向后者。
2. 覆盖率看"服务层行覆盖"比看全局数字更有意义：控制器与 `main.ts` 这类薄胶水不必追求覆盖。
3. NestJS 12 起，新建的 ESM 项目模板默认搭配 Vitest（CJS 项目仍是 Jest）：API 高度相似，`jest.fn()` 换成 `vi.fn()`、配置换到 `vitest.config.ts`，本篇的分层思路与替身手法完全通用；以官方迁移指南为准。

## 5. 测试策略建议

| 层级 | 覆盖内容 | 速度 | 数量 |
| --- | --- | --- | --- |
| 单元测试 | 服务、工具函数、管道逻辑 | 毫秒级 | 多 |
| 控制器测试 | 参数传递、状态码 | 毫秒级 | 中 |
| e2e 测试 | 完整链路、校验、鉴权、数据库 | 秒级 | 少 |

配比的经验法则：新增一个服务方法，先配 2-4 条单测覆盖正常与异常分支；每个业务端点配 1-2 条 e2e 验证"路由 + 管道 + 守卫"的接线正确。e2e 只测关键路径，不在协议层复刻所有分支——它贵，要花在刀刃上。CI 里先跑单测再跑 e2e：单测挂了连应用都起不起得来都存疑，没必要浪费 e2e 的启动时间。

## 6. 常见陷阱

1. **e2e 忘记复刻 `main.ts` 的全局配置**：全局管道/过滤器/拦截器只存在于启动文件里，测试模块不会自动继承。校验类 e2e 用例"该 400 却 201"十有八九是这个。把应用配置抽成工厂函数（`createApp()`）两端共用是根治方案。
2. **替身对象在用例间共享状态**：`mockResolvedValue` 设了一次返回值，后续用例全部读到脏数据。`beforeEach` 重建模块或统一 `jest.clearAllMocks()`，别让用例顺序影响结果。
3. **在私有属性上 spyOn 换依赖**：绕开 DI 容器、耦合实现细节，重构即碎。依赖替换永远走 `useValue` 或 `overrideProvider`。
4. **连真库的 e2e 不清理数据**：用例 A 创建的记录让用例 B 断言"列表长度为 1"失败，单独跑又是绿的——顺序依赖是测试最隐蔽的坏味道。每个用例自建数据或 `beforeEach` 清表。
5. **断言了 mock 却忘了 `toHaveBeenCalledTimes`**：只断言返回值时，"服务根本没被调用"也会假绿（替身默认返回 undefined）。交互型用例把"调用次数与参数"一起钉住。
6. **异步断言丢 `await`**：`expect(service.remove(999)).rejects...` 前面少了 `await`，失败不会传导给测试框架，测试"假绿"。断言一律 return 或 await。

## 7. 动手试试

1. 为 `TodosService.remove` 写单元测试：删除不存在记录时，Prisma 抛错被转换成 404。
2. 为 `POST /todos` 补充 e2e 用例：发送 101 个字符的标题，断言 400；再删掉测试里的全局管道配置，观察它如何变成 201——亲手复现第 6 节第一条陷阱。
3. 把 `PrismaService` 换成 `overrideProvider` 替身后重跑 e2e，对比连真库与替身两种模式的耗时差异。
4. 运行 `npm test -- --coverage`，找出服务层覆盖率最低的分支并为它补一条用例。

## 8. 一句话记住

**初学者要点：**

- 单元测试用替身隔离依赖、测逻辑；e2e 测试起真应用、走真 HTTP；两者配合，重构时才有底气。
- 替身注入两条路：单测在 `providers` 里 `useValue`，e2e 用 `overrideProvider` 覆盖。
- e2e 的全局配置要与 `main.ts` 同步——抽工厂函数是最省心的做法。

**进阶注意：**

- 分层配比：服务单测多而快，e2e 少而重；CI 先单测后 e2e，失败信号分层。
- NestJS 12 的 ESM 模板默认 Vitest：写法差异只在 mock 前缀与配置文件，分层策略与替身思想跨运行器通用。
