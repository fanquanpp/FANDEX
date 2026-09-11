---
order: 480
title: Angular 精要与 React 对照
module: 'react'
category: 前端技术
difficulty: intermediate
description: 用 React 的知识体系理解 Angular：组件三件套、Signals 响应式、依赖注入与全家桶生态的对应关系。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/170-StateManagementSolutionComparison'
  - 'react/050-ContextGlobalState'
  - 'react/070-RouteDataFetch'
prerequisites:
  - 'react/020-ComponentProps'
  - 'react/040-HooksDeep'
---

## 0. 一句话理解

> React 是"库 + 生态自由拼装"，Angular 是"全家桶框架"：组件、路由、表单、HTTP、测试、依赖注入全部内置。两者当前都收敛到 Signals 响应式模型，心智可以互相迁移。

## 1. Angular 是什么

Angular 是 Google 维护的企业级前端框架，2016 年发布（Angular 2，与 AngularJS 完全不同），提供完整解决方案，团队无需自行拼装路由、状态、表单与测试库。

版本现状（2026-08）：Angular 22 为当前稳定版（2026-06 发布），Signal Forms 与异步响应式 API 转正，新项目默认 zoneless（无 Zone.js）；`ng new` 生成的默认形态是 standalone 组件 + Signal + zoneless。

## 2. 五分钟跑起来

```bash
npm i -g @angular/cli
ng new my-app --style css --ssr false
cd my-app
ng serve
```

1. `ng new` 创建项目并自动安装依赖；`--ssr false` 先关闭服务端渲染，入门更简单。
2. `ng serve` 启动开发服务器（默认 `http://localhost:4200`），页面内容来自 `src/app/app.component.html`。

## 3. 组件对照：装饰器三件套对函数组件

React 用"函数 + JSX"描述组件；Angular 用一个类加 `@Component` 装饰器，把模板、样式与逻辑按文件约定分开。

```typescript
// src/app/app.component.ts
import { Component } from "@angular/core"

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"]
})
export class AppComponent {
  title = "我的 Angular 应用"
}
```

```html
<!-- src/app/app.component.html -->
<main>
  <h1>{{ title }}</h1>
</main>
```

对照要点：

1. `{{ title }}` 插值等价于 JSX 里的 `{title}`。
2. Angular 17+ 的 standalone 组件用 `imports` 数组显式声明依赖的子组件，模板里以 `<app-header />` 标签渲染；React 则是直接 `import` 后写进 JSX，概念相同，只是 Angular 需要在装饰器里登记。
3. 心智差异：React 是"UI = f(state)"的一切皆函数；Angular 是"组件 = 类（逻辑）+ 模板（视图）+ 样式"的工程化约定，更适合大型团队的强约束。

## 4. 响应式对照：Signals 对 Hooks

Angular 16 起引入 Signals，与 React 的 Hooks 解决同一个问题，但读取方式不同——信号是"显式调用读取"：

| Angular | React | 差异要点 |
| --- | --- | --- |
| `price = signal(100)` | `const [price, setPrice] = useState(100)` | 信号读取必须调用 `price()`，更新用 `.set()` 或 `.update()` |
| `total = computed(() => ...)` | `useMemo(() => ..., [deps])` | `computed` 自动追踪依赖，无需依赖数组 |
| `effect(() => { ... })` | `useEffect(() => { ... }, [deps])` | `effect` 自动追踪，同样不建议在内部反向写信号 |
| `input()` / `output()` | `props` / 回调函数 | 见第 5 节 |

```typescript
import { Component, computed, signal } from "@angular/core"

@Component({
  selector: "app-price",
  template: `
    <p>合计：{{ total() }}</p>
    <button (click)="qty.set(qty() + 1)">加一</button>
  `
})
export class PriceComponent {
  price = signal(100)
  qty = signal(2)
  total = computed(() => this.price() * this.qty())
}
```

1. `(click)="qty.set(qty() + 1)"` 是事件绑定，等价于 JSX 的 `onClick={() => setQty(qty() + 1)}`；注意 Angular 事件名用圆括号包裹。
2. 模板里调用 `total()` 时，Angular 只重渲染依赖变化的节点——这正是 Signals 相比"整组件重渲染 + Hooks 依赖数组"的性能优势来源，React 官方的编译器自动记忆化（见 `react/390-ReactCompilerAutoMemoization`）在朝同一方向收敛。
3. `effect` 适合日志上报、`localStorage` 同步、对接非响应式库；不要在 `effect` 里直接修改其他信号，避免循环依赖。

## 5. 组件通信：input/output 对 props 与回调

```typescript
import { Component, input, output } from "@angular/core"

export interface Todo {
  id: number
  title: string
  done: boolean
}

@Component({
  selector: "app-todo-item",
  template: `
    <li>
      <input type="checkbox" [checked]="todo().done" (change)="onToggle()" />
      {{ todo().title }}
      <button (click)="onRemove()">删除</button>
    </li>
  `
})
export class TodoItemComponent {
  todo = input.required<Todo>()
  toggle = output()
  remove = output()

  onToggle() {
    this.toggle.emit()
  }

  onRemove() {
    this.remove.emit()
  }
}
```

1. `input.required<Todo>()` 声明必填输入，父组件用 `[todo]="item"` 传入——方括号绑定属性，对应 JSX 的 `todo={item}`。
2. `output()` 声明事件，子组件 `emit()` 通知父组件，父组件 `(toggle)="onToggle(item.id)"` 监听——对应 React 的回调 props。
3. 数据流同样是单向的：子组件不直接改父组件数据，只发事件；`model()` 信号（17.2+）提供双向绑定，等价于"受控组件 + onChange"的封装。

## 6. 依赖注入对 Context 与 Hooks

React 跨层级共享依赖靠 Context（`react/050-ContextGlobalState`）或组合；Angular 内置依赖注入（DI）：`inject()` 函数按类型从注入器取服务实例。

```typescript
import { Component, inject } from "@angular/core"
import { TodoStore } from "./todo.store"

@Component({ selector: "app-list", template: `...` })
export class ListComponent {
  // 等价于在 React 里用 Context 拿到全局 store
  private store = inject(TodoStore)

  todos = this.store.todos // Signal<Todo[]>
}
```

1. `inject(TodoStore)` 按类型解析服务，服务内部可以再用 `inject` 组合，形成可测试的依赖图。
2. 与 React 的对应关系：Provider 相当于注入器的层级作用域，Context 相当于注入令牌，自定义 Hook 相当于注入服务。
3. DI 是 Angular 与 React 架构差异最大的一处：React 靠函数组合，Angular 靠容器管理生命周期。

## 7. 全家桶对照表

| 能力 | Angular 内置 | React 生态常见选择 |
| --- | --- | --- |
| 路由 | `@angular/router` | React Router / TanStack Router（`react/070-RouteDataFetch`） |
| 表单 | Reactive Forms / Signal Forms | React Hook Form |
| HTTP | `HttpClient` | fetch / TanStack Query |
| 状态 | Signals + 服务 / RxJS | useState、Zustand、Redux 等（`react/170-StateManagementSolutionComparison`） |
| 测试 | Karma / Vitest / Angular Testing Library | Vitest + Testing Library（`react/090-TestEngineering`） |
| SSR | Angular Universal（内建） | Next.js（`react/100-NextJSFullStack`） |

## 8. 选型建议

1. 大团队、长周期、需要强约定与统一工具链的企业项目，Angular 的全家桶与 DI 能显著降低协作成本。
2. 已有 React 技术栈时迁移成本高：模板语法、DI、RxJS 都是新心智，建议只在独立新项目中评估。
3. 两端正快速趋同：Signals 响应式、zoneless 渲染、编译期优化、Server Components——掌握一侧的模型，另一侧只是换了语法。

## 9. 动手试试

1. 用 `ng new` 建项目，把 `react/020-ComponentProps` 的 Todo 列表用 standalone 组件 + `input/output` 重写。
2. 用 `computed` 派生"未完成数量"，对比 `useMemo` 写依赖数组的差异。
3. 把 `TodoStore` 改成注入服务，体会 DI 与 Context 提供全局状态的方式差异。

## 10. 一句话记住

> Angular 是全家桶版 React：装饰器组件对函数组件，signal/computed/effect 对 Hooks，input/output 对 props 与回调，DI 对 Context；数据同样单向流动。
