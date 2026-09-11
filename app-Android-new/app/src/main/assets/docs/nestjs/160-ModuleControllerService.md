---
order: 160
title: NestJS 模块、控制器与服务
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: 用待办事项示例完整走一遍 Module/Controller/Service/DTO 的分层写法、依赖注入与模块边界。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nestjs/150-NestJSOverview'
  - 'nestjs/170-ValidationPipes'
  - 'nestjs/180-DatabaseIntegration'
  - 'typescript/100-InterfaceTypeAlias'
prerequisites:
  - 'nestjs/150-NestJSOverview'
---

## 0. 一句话理解

> 一个功能单元 = 模块（组装）+ 控制器（接请求）+ 服务（写逻辑）+ DTO（定义入参）；控制器只负责"翻译 HTTP"，业务全部下沉到服务。

本篇用"待办事项 API"把四个文件从头写一遍，并回答两个初学高频问题：依赖注入到底发生了什么、模块之间怎么共享服务。

## 1. 生成功能模块

```bash
nest g module todos
nest g controller todos
nest g service todos
```

**讲解：**

1. `nest g` 是生成器命令，会自动创建文件并把类注册到对应模块。
2. 三条命令分别生成 `todos.module.ts`、`todos.controller.ts`、`todos.service.ts`，目录 `src/todos/`。
3. 生成后 `app.module.ts` 的 `imports` 会自动加入 `TodosModule`。
4. 目录习惯：一个功能一个目录，DTO 放在子目录 `dto/` 里——项目长大以后，"按功能分目录"比"按类型分目录"好找得多。

## 2. DTO：定义请求体

```typescript
// src/todos/dto/create-todo.dto.ts
export class CreateTodoDto {
  title: string
  done?: boolean
}
```

**讲解：**

1. DTO（Data Transfer Object）是"请求长什么样"的类型描述，控制器用它接收并校验参数。
2. `title` 必填、`done` 可选（`?`），先声明类型，下一篇再用装饰器做真正的运行时校验。
3. 类（class）比接口（interface）更适合 DTO：编译后仍存在，能配合装饰器做校验与文档生成；接口在运行时会消失，框架拿不到任何信息。

## 3. Service：业务逻辑

```typescript
// src/todos/todos.service.ts
import { Injectable } from "@nestjs/common"
import { CreateTodoDto } from "./dto/create-todo.dto"

export interface Todo {
  id: number
  title: string
  done: boolean
}

@Injectable()
export class TodosService {
  private todos: Todo[] = []
  private nextId = 1

  create(dto: CreateTodoDto): Todo {
    const todo: Todo = {
      id: this.nextId++,
      title: dto.title,
      done: dto.done ?? false
    }
    this.todos.push(todo)
    return todo
  }

  findAll(): Todo[] {
    return this.todos
  }

  findOne(id: number): Todo {
    const todo = this.todos.find((t) => t.id === id)
    if (!todo) {
      // 找不到时抛 Nest 内置异常，自动变成 404 响应
      throw new NotFoundException(`待办 ${id} 不存在`)
    }
    return todo
  }

  toggleDone(id: number): Todo {
    const todo = this.findOne(id) // 不存在时由 findOne 抛 404
    todo.done = !todo.done
    return todo
  }

  remove(id: number): void {
    this.todos = this.todos.filter((t) => t.id !== id)
  }
}
```

```typescript
// import 部分补充
import { Injectable, NotFoundException } from "@nestjs/common"
```

**讲解：**

1. `@Injectable()` 装饰器标记该类可以被依赖注入：Nest 会在需要时自动创建单例实例。
2. `private todos: Todo[]` 是内存存储，重启即清空；真实项目在这里换成数据库访问（见[接入数据库](/nestjs/180-DatabaseIntegration)）。
3. `dto.done ?? false`：空值合并运算符，`undefined` 时取默认值 `false`。
4. `NotFoundException` 是 Nest 内置 HTTP 异常：抛出它，框架自动返回 404 与消息 JSON，控制器一行都不用改——"业务语言表达错误，框架负责翻译成 HTTP"。
5. `remove` 用 `filter` 生成新数组再赋值，这是不可变更新风格，避免残留已删除项。

## 4. Controller：接收请求

```typescript
// src/todos/todos.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post
} from "@nestjs/common"
import { TodosService } from "./todos.service"
import { CreateTodoDto } from "./dto/create-todo.dto"

@Controller("todos")
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Post()
  create(@Body() dto: CreateTodoDto) {
    return this.todosService.create(dto) // POST 默认返回 201
  }

  @Get()
  findAll() {
    return this.todosService.findAll()
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.todosService.findOne(id)
  }

  @Patch(":id/done")
  toggleDone(@Param("id", ParseIntPipe) id: number) {
    return this.todosService.toggleDone(id)
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    this.todosService.remove(id)
  }
}
```

**讲解：**

1. `@Controller("todos")` 声明路由前缀：`POST /todos`、`GET /todos`、`DELETE /todos/1`。
2. 构造器参数 `private readonly todosService: TodosService` 就是依赖注入：Nest 自动把服务实例传进来，不需要手动 new。
3. `@Body()` 取出请求体并交给 DTO；`@Param("id", ParseIntPipe)` 取出路径参数并自动转成数字，转失败返回 400——`ParseIntPipe` 是内置管道，下一篇系统学。
4. 方法返回什么，Nest 就把它序列化成什么 JSON；`@Post()` 默认状态码 201（资源已创建），`@Delete()` 默认 200，可用 `@HttpCode(204)` 覆盖。
5. 控制器里只有一行调用——业务逻辑全部在服务里，这是分层最重要的目的：控制器可测、服务可测、互不纠缠。

## 5. 手动接线：Module 与依赖注入

```typescript
// src/todos/todos.module.ts
import { Module } from "@nestjs/common"
import { TodosController } from "./todos.controller"
import { TodosService } from "./todos.service"

@Module({
  controllers: [TodosController],
  providers: [TodosService]
})
export class TodosModule {}
```

**讲解：**

1. `controllers` 数组声明本模块对外提供哪些路由。
2. `providers` 数组声明本模块可注入的服务；Nest 启动时会解析 `TodosController` 构造函数里的依赖并自动注入。
3. 注入的过程值得看穿一层：启动时 Nest 扫描装饰器元数据 -> 发现控制器需要 `TodosService` -> 在 providers 里找到它 -> 创建单例 -> 按类型匹配传入构造器。全程没有魔法，靠的是 TS 装饰器把类型信息留到了运行时（`emitDecoratorMetadata`，tsconfig 默认已开）。
4. 默认作用域是单例：整个应用共享一个 `TodosService` 实例，`todos` 数组因此能在请求之间保留。多数场景单例正确；请求级隔离（每个请求新实例）是进阶话题，遇到"实例间状态串了"再查官方 Scope 文档。

## 6. 跨模块共享服务

报表模块也要读待办列表，直接注入 `TodosService` 会报错——服务默认只属于声明它的模块：

```typescript
// src/todos/todos.module.ts —— 导出服务
@Module({
  controllers: [TodosController],
  providers: [TodosService],
  exports: [TodosService] // 加这一行，其他模块才能注入
})
export class TodosModule {}

// src/report/report.module.ts —— 导入模块后即可注入
import { Module } from "@nestjs/common"
import { TodosModule } from "../todos/todos.module"

@Module({
  imports: [TodosModule]
})
export class ReportModule {}
```

**讲解：**

1. 模块是依赖的"海关"：想用别的模块的服务，先 `imports` 那个模块，且对方必须 `exports` 该服务——边界显式，依赖关系一眼可查。
2. 报错 `Nest can't resolve dependencies` 十有八九是这一节的问题：要么忘了放 providers，要么忘了 imports + exports。
3. 反过来，`app.module.ts` 是根模块，所有功能模块都要被它（直接或间接）imports，应用才能把它们组装起来。

## 7. 常见陷阱

1. **服务忘了写进 providers**：启动报 `can't resolve dependencies`；生成器会自动注册，手写文件时最容易漏。
2. **接口当 DTO**：interface 编译后消失，校验与 OpenAPI 文档全部失效；DTO 一律用 class。
3. **在控制器里 `new TodosService()`**：绕过 DI 容器，服务里的其他注入全部失效，测试也没法替换替身。
4. **单例服务里存了不该共享的状态**：`todos` 数组是"应用级数据"，故意放的没问题；但把"当前请求用户"这类请求级数据存在服务字段里，多用户并发时必然串数据——请求级信息放 `request` 对象（见守卫篇）。
5. **改了服务没重启**：`start:dev` 只监听文件变化；偶尔装饰器元数据缓存导致行为滞后，重启一次能排除一半"灵异问题"。

## 8. 动手试试

1. 用 `curl` 测试接口：`curl -X POST http://localhost:3000/todos -H "Content-Type: application/json" -d '{"title":"学 NestJS"}'`，再 `curl http://localhost:3000/todos`。
2. 给 Todo 增加 `priority` 字段（DTO、Service、接口三处同步修改）。
3. 补全 `toggleDone` 方法（服务里翻转 `done`），验证 `PATCH /todos/1/done`。
4. 故意把 `TodosService` 从 providers 里删掉，观察启动报错，再恢复——把报错认脸是排障的第一步。

## 9. 本篇小结

**初学者要点：**

- 控制器用装饰器声明路由、服务用类封装业务、模块把它们组装起来；依赖注入让"谁来实例化"这件事交给框架。
- 四文件心法：DTO 定形状、服务写逻辑、控制器翻译 HTTP、模块画边界。
- `Nest can't resolve dependencies` = 注册链断了，检查 providers 与 imports/exports。

**进阶注意：**

- 单例是默认作用域，服务字段是"应用级状态"；请求级数据走 request 对象，不要落进服务。
- class DTO 是校验（下一篇）与文档（@nestjs/swagger）的地基，用 interface 会两头落空。
