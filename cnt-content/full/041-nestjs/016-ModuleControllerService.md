---
order: 160
title: NestJS 模块、控制器与服务
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: 用待办事项示例完整走一遍 Module/Controller/Service/DTO 的分层写法与依赖注入。
author: fanquanpp
updated: '2026-08-03'
related:
  - 'nestjs/015-NestJSOverview'
  - 'nestjs/017-ValidationPipes'
  - 'typescript/009-InterfaceTypeAlias'
prerequisites:
  - 'nestjs/015-NestJSOverview'
---

## 0. 一句话理解

> 一个功能单元 = 模块（组装）+ 控制器（接请求）+ 服务（写逻辑）+ DTO（定义入参）；控制器只负责"翻译 HTTP"，业务全部下沉到服务。

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
2. `title` 必填、`done` 可选（`?`），先声明类型，下一章再用装饰器做真正的运行时校验。
3. 类（class）比接口（interface）更适合 DTO：编译后仍存在，能配合装饰器做校验与文档生成。

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

  remove(id: number): void {
    this.todos = this.todos.filter((t) => t.id !== id)
  }
}
```

**讲解：**

1. `@Injectable()` 装饰器标记该类可以被依赖注入：Nest 会在需要时自动创建单例实例。
2. `private todos: Todo[]` 是内存存储，重启即清空；真实项目在这里换成数据库访问。
3. `dto.done ?? false`：空值合并运算符，`undefined` 时取默认值 `false`。
4. `remove` 用 `filter` 生成新数组再赋值，这是不可变更新风格，避免残留已删除项。

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
  Post
} from "@nestjs/common"
import { TodosService } from "./todos.service"
import { CreateTodoDto } from "./dto/create-todo.dto"

@Controller("todos")
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Post()
  create(@Body() dto: CreateTodoDto) {
    return this.todosService.create(dto)
  }

  @Get()
  findAll() {
    return this.todosService.findAll()
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
3. `@Body()` 取出请求体并交给 DTO；`@Param("id", ParseIntPipe)` 取出路径参数并自动转成数字，转失败返回 400。
4. 控制器里只有一行调用——业务逻辑全部在服务里，这是分层最重要的目的：控制器可测、服务可测、互不纠缠。

## 5. 手动接线：Module

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
2. `providers` 数组声明本模块可注入的服务；Nest 会解析 `TodosController` 构造函数里的依赖并自动注入。
3. 若其他模块也要用 `TodosService`，需要在 `providers` 里保留并加到 `exports` 数组。

## 6. 动手试试

1. 用 `curl` 测试接口：`curl -X POST http://localhost:3000/todos -H "Content-Type: application/json" -d '{"title":"学 NestJS"}'`，再 `curl http://localhost:3000/todos`。
2. 给 Todo 增加 `priority` 字段（DTO、Service、接口三处同步修改）。
3. 新增 `PATCH /todos/:id` 接口，把 `done` 置为 true（服务里加 `toggle` 方法）。

## 7. 一句话记住

> 控制器用装饰器声明路由、服务用类封装业务、模块把它们组装起来；依赖注入让"谁来实例化"这件事交给框架。
