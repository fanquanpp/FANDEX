---
order: 78
title: 类型安全的发布订阅
module: typescript
category: TypeScript
difficulty: advanced
description: 发布订阅模式的形式语义、TypeScript 类型级实现、与主流事件库对比及生产级工程实践
author: fanquanpp
updated: '2026-07-20'
lastReviewed: 2026-07-20
reviewer: FANDEX Content Engineering Team
related:
- typescript/类型安全的配置系统
- typescript/类型安全的数据库查询
- typescript/协变与逆变
- typescript/字面量类型与联合类型
- typescript/TypeScript5新特性
prerequisites:
- typescript/语法速查
- typescript/泛型与类型约束
- typescript/字面量类型与联合类型
tags:
- typescript
- publish-subscribe
- observer-pattern
- event-driven
- type-safety
- covariance
- contravariance
learningObjectives:
- 复述观察者模式与发布订阅模式的差异，识别 GoF 设计模式原始论文中的核心定义
- 解释 TypeScript EventMap 设计中协变与逆变的角色，理解函数参数位置上的双变妥协带来的类型安全漏洞
- 实现一个生产级类型安全 PubSub，覆盖 subscribe/once/off/emit/onceWithPriority 等接口，并保证 unsubscribe 类型精确
- 分析 Node.js EventEmitter、RxJS Subject、VS Code Emitter 与自研 PubSub 在类型签名上的差异，识别各自的类型安全边界
- 评估事件循环顺序、错误处理策略、内存泄漏风险对生产环境发布订阅系统的综合影响，给出权衡决策
- 设计一个支持事件过滤、优先级队列、命名空间、生命周期管理的可扩展类型安全事件总线架构
exercises:
- id: ex-pubsub-01
  type: fill-blank
  cognitiveLevel: remember
  question: GoF《设计模式》一书于____年由 Erich Gamma、Richard Helm、Ralph Johnson、John Vlissides 出版，首次将观察者模式形式化为 23 种经典设计模式之一。
  hint: 回顾 1.1 节时间线
  answer: '1994'
  blankCount: 1
  answers:
  - '1994'
  caseSensitive: false
  difficulty: 1
  explanation: 'Design Patterns: Elements of Reusable Object-Oriented Software 于 1994 年由 Addison-Wesley 出版，ISBN 0-201-63361-2。'
  estimatedTime: 1
- id: ex-pubsub-02
  type: fill-blank
  cognitiveLevel: understand
  question: TypeScript 中函数参数位置默认采用____变，这是为了兼容 JavaScript 现存代码而做出的工程妥协；启用 strictFunctionTypes 后切换为严格的____变。
  hint: 参考 3.2 节子类型关系
  answer: 双
  blankCount: 1
  answers:
  - 双
  caseSensitive: false
  difficulty: 2
  explanation: '默认双变（bivariance），strictFunctionTypes: true 后切换为逆变（contravariance），后者符合函数子类型的理论规则。'
  estimatedTime: 2
- id: ex-pubsub-03
  type: choice
  cognitiveLevel: analyze
  question: 下列哪种事件处理器签名在 strictFunctionTypes 下是类型安全的？
  options:
  - 'type Handler<K> = (payload: Events[K]) => void; subscribe<K>(event: K, handler: Handler<K>)'
  - 'type Handler<K> = (payload: Events[K]) => void | Promise<void>; subscribe<K>(event: K, handler: Handler<K>)'
  - 'type Handler = (payload: any) => void; subscribe(event: string, handler: Handler)'
  - 'type Handler<K> = (payload: unknown) => void; subscribe<K>(event: K, handler: Handler<K>)'
  correctIndex: 0
  multiple: false
  difficulty: 3
  explanation: A 用具体类型 Events[K] 约束 payload，类型最精确；B 引入 Promise 联合改变返回值类型但参数不变；C 用 any 丧失类型；D 用 unknown 比 A 更宽松但仍类型安全，但不如 A 精确（无法访问具体字段）。
  estimatedTime: 3
  answer: A. A 用具体类型 Events[K] 约束 payload，类型最精确；B 引入 Promise 联合改变返回值类型但参数不变；C 用 any 丧失类型；D 用 unknown 比 A 更宽松但仍类型安全，但不如 A 精确（无法访问具体字段）。
- id: ex-pubsub-04
  type: choice
  cognitiveLevel: evaluate
  question: 关于 once 的实现，下列哪种策略最稳健？
  options:
  - 在 handler 内部调用 unsubscribe，依赖闭包捕获
  - 维护一个独立的 onceHandlers Set，emit 前先移除
  - 包装一层 wrapper，调用后立即从 subscribers 中删除 wrapper
  - 使用 WeakRef 持有 handler，让 GC 自动回收
  correctIndex: 2
  multiple: false
  difficulty: 4
  explanation: wrapper 策略确保即使 handler 抛错也能正确清理（配合 try/finally），且对外暴露的还是 unsubscribe 接口；A 在 handler 内部 unsubscribe 会破坏当前迭代；B 增加额外数据结构维护成本；D 的 GC 时机不可控。
  estimatedTime: 4
  answer: C. wrapper 策略确保即使 handler 抛错也能正确清理（配合 try/finally），且对外暴露的还是 unsubscribe 接口；A 在 handler 内部 unsubscribe 会破坏当前迭代；B 增加额外数据结构维护成本；D 的 GC 时机不可控。
- id: ex-pubsub-05
  type: code-fix
  cognitiveLevel: apply
  question: 下列 once 实现在 handler 抛错时会导致处理器泄漏（无法移除）。请修复：
  buggyCode: "once<K extends keyof Events & string>(event: K, handler: (p: Events[K]) => void) {\n  const unsub = this.subscribe(event, (p) => {\n    handler(p);\n    unsub();\n  });\n  return unsub;\n}\n"
  language: typescript
  fixedCode: "once<K extends keyof Events & string>(event: K, handler: (p: Events[K]) => void) {\n  const wrapper = (p: Events[K]) => {\n    try {\n      handler(p);\n    } finally {\n      this.off(event, wrapper);\n    }\n  };\n  this.on(event, wrapper);\n  return () => this.off(event, wrapper);\n}\n"
  errorDescription: 原实现中 unsub() 在 handler(p) 之后调用，若 handler 抛错则 unsub 永不执行，导致处理器永久驻留订阅表，最终引发内存泄漏与重复触发。
  difficulty: 4
  explanation: 通过 try/finally 保证无论 handler 成功与否都能从订阅表移除 wrapper；同时返回对外稳定的 unsubscribe 句柄。
  estimatedTime: 6
  answer: 原实现中 unsub() 在 handler(p) 之后调用，若 handler 抛错则 unsub 永不执行，导致处理器永久驻留订阅表，最终引发内存泄漏与重复触发。 通过 try/finally 保证无论 handler 成功与否都能从订阅表移除 wrapper；同时返回对外稳定的 unsubscribe 句柄。
- id: ex-pubsub-06
  type: code-fix
  cognitiveLevel: analyze
  question: 下列 emit 实现遍历订阅者时若某处理器抛错会中断后续处理器。请修复为全部执行后聚合错误：
  buggyCode: "emit<K extends keyof Events & string>(event: K, payload: Events[K]) {\n  const set = this.subscribers.get(event);\n  if (!set) return;\n  for (const fn of set) fn(payload);\n}\n"
  language: typescript
  fixedCode: "emit<K extends keyof Events & string>(event: K, payload: Events[K]) {\n  const set = this.subscribers.get(event);\n  if (!set) return;\n  const errors: unknown[] = [];\n  for (const fn of set) {\n    try { fn(payload); }\n    catch (e) { errors.push(e); }\n  }\n  if (errors.length === 1) throw errors[0];\n  if (errors.length > 1) throw new AggregateError(errors, `emit \"${event}\" failed`);\n}\n"
  errorDescription: 原实现中处理器异常直接冒泡，导致后续订阅者永远不被调用，违反发布订阅的独立性原则。
  difficulty: 4
  explanation: 用 try/catch 收集所有错误，遍历完成后再抛 AggregateError（ES2021+），既保证全部订阅者执行，又保留错误信息供上层处理。
  estimatedTime: 6
  answer: 原实现中处理器异常直接冒泡，导致后续订阅者永远不被调用，违反发布订阅的独立性原则。 用 try/catch 收集所有错误，遍历完成后再抛 AggregateError（ES2021+），既保证全部订阅者执行，又保留错误信息供上层处理。
- id: ex-pubsub-07
  type: open-ended
  cognitiveLevel: create
  question: 请设计一个支持事件过滤（filter）、优先级（priority）与命名空间（namespace）的事件总线类型签名（200 字以内）。要求：filter 在订阅时声明、priority 为整数、namespace 用于批量 unsubscribe。讨论类型约束如何防止过滤函数越权访问。
  keyPoints:
  - '类型签名应包含 namespace: string、priority: number、filter?: (p: Events[K]) => boolean 三个可选配置'
  - Events[K] 类型参数化保证 filter 只能访问合法事件字段，避免 any 越权
  - namespace 应在 unsubscribe 时支持前缀匹配或精确匹配两种模式
  - priority 应在 emit 时按降序排序，同优先级保持插入顺序
  - 讨论 filter 应是纯函数，避免副作用污染事件流
  difficulty: 5
  minWords: 100
  estimatedTime: 15
  answer: '类型签名应包含 namespace: string、priority: number、filter?: (p: Events[K]) => boolean 三个可选配置；Events[K] 类型参数化保证 filter 只能访问合法事件字段，避免 any 越权；namespace 应在 unsubscribe 时支持前缀匹配或精确匹配两种模式；priority 应在 emit 时按降序排序，同优先级保持插入顺序；讨论 filter 应是纯函数，避免副作用污染事件流'
references:
- type: book
  authors:
  - Gamma, Erich
  - Helm, Richard
  - Johnson, Ralph
  - Vlissides, John
  year: 1994
  title: 'Design Patterns: Elements of Reusable Object-Oriented Software'
  venue: Addison-Wesley Professional
  pages: 293-303
  doi: 10.5555/186897
- type: journal
  authors:
  - Bainomugisha, Engineer
  - Carreton, Alvise L.
  - Cutsem, Tom Van
  - Mostinckx, Stijn
  - Meuter, Wolfgang De
  year: 2013
  title: A Survey on Reactive Programming
  venue: ACM Computing Surveys (CSUR)
  volume: 45
  issue: 4
  pages: 1-34
  doi: 10.1145/2501654.2501666
- type: conference
  authors:
  - Bierman, Gavin M.
  - Abadi, Martín
  - Torgersen, Mads
  year: 2014
  title: Understanding TypeScript
  venue: ECOOP 2014 — Object-Oriented Programming
  pages: 257-281
  doi: 10.1007/978-3-662-44202-9_11
- type: journal
  authors:
  - Elliott, Conal
  - Hudak, Paul
  year: 1997
  title: Functional Reactive Animation
  venue: ACM SIGPLAN Notices
  volume: 32
  issue: 8
  pages: 263-273
  doi: 10.1145/258949.258973
- type: technical-report
  authors:
  - Salvaneschi, Guido
  - Mezini, Mira
  year: 2014
  title: Towards a Theory of Refactoring for Reactive Programming
  venue: arXiv preprint arXiv:1409.5441
  doi: 10.48550/arXiv.1409.5441
- type: journal
  authors:
  - Hejlsberg, Anders
  - Torgersen, Mads
  year: 2018
  title: 'TypeScript 2.8 Release Notes: Conditional Types'
  venue: Microsoft Developer Network
  url: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html
- type: documentation
  authors:
  - Node.js Foundation
  year: 2024
  title: Node.js EventEmitter Documentation
  venue: Node.js v22 Official Docs
  url: https://nodejs.org/api/events.html
- type: documentation
  authors:
  - Microsoft Corporation
  year: 2024
  title: VS Code Emitter API Reference
  venue: Visual Studio Code API
  url: https://code.visualstudio.com/api/references/vscode-api#EventEmitter
- type: documentation
  authors:
  - Reactive Extensions Team
  year: 2024
  title: RxJS Subject Documentation
  venue: RxJS 7.x Official Documentation
  url: https://rxjs.dev/guide/subject
- type: journal
  authors:
  - Okasaki, Chris
  year: 1999
  title: Purely Functional Data Structures
  venue: Cambridge University Press
  isbn: 978-0-521-66350-2
- type: conference
  authors:
  - Cardelli, Luca
  - Martini, Simone
  year: 1992
  title: An Extension of System F with Subtyping
  venue: Information and Computation
  volume: 109
  issue: 1-2
  pages: 4-56
  doi: 10.1016/0890-5401(92)90018-G
- type: journal
  authors:
  - Pierce, Benjamin C.
  year: 2002
  title: Types and Programming Languages
  venue: MIT Press
  isbn: 978-0-262-16209-8
- type: conference
  authors:
  - Jeffrey, Alan
  year: 1998
  title: A Distributed Object-Oriented Calculus with Subtyping
  venue: Electronic Notes in Theoretical Computer Science
  volume: 16
  issue: 1
  pages: 47-72
  doi: 10.1016/S1571-0661(04)00054-3
- type: standard
  authors:
  - Ecma International
  year: 2024
  title: ECMAScript 2024 Language Specification (ECMA-262 15th Edition)
  venue: Ecma International Standard
  url: https://tc39.es/ecma262/
etymology:
- term: 发布订阅（Publish-Subscribe）
  english: Publish-Subscribe Pattern
  origin: 起源于 1987 年 Birman 与 Joseph 在 Cornell 大学提出的 ISIS 系统中的虚拟同步组通信原语，后由 GoF《设计模式》（1994）正式纳入观察者模式的变体形式；现代事件总线实现源自 Java JMS（Java Message Service, 1998）规范。
- term: 观察者（Observer）
  english: Observer Pattern
  origin: Smalltalk-80 时代的 Model-View-Controller（MVC）框架中已隐含观察者模式，GoF 1994 将其形式化为独立设计模式，与之相关的 dependents（依赖者）与 publish-subscribe 在 GoF 原书中作为同义术语出现。
- term: 事件总线（Event Bus）
  english: Event Bus
  origin: 2008 年 Spring Framework 推出的 ApplicationEvent 类与 Guava EventBus（2010）使事件总线成为 Java 生态的通用术语；前端框架 Backbone.Events（2010）、Node.js EventEmitter（2009）将这一概念普及至 JavaScript 生态。
- term: Subject
  english: RxJS Subject
  origin: 源自 ReactiveX 项目（Microsoft 2012），借用 Observer 模式的 dual concept（对偶概念）— 同时具备 Observable 与 Observer 双重身份的对象，其类型论基础可追溯至 Elliott & Hudak 1997 年的 Functional Reactive Animation 论文。
---

## 引言：为什么需要类型安全的发布订阅

发布订阅（Publish-Subscribe，简称 PubSub）是事件驱动架构的基础原语，自 1987 年 ISIS 系统的虚拟同步组通信原语到 1994 年 GoF《设计模式》将其形式化为观察者模式的变体，再到 2009 年 Node.js EventEmitter 把事件驱动模型推上 JavaScript 生态主流舞台，这一模式贯穿了几乎所有现代分布式系统与 UI 框架。

然而在 TypeScript 时代，传统的 `any`-typed 事件总线暴露出三个严重的类型安全缺陷：

1. **事件名失检**：`bus.emit('user:login', payload)` 中事件名字符串拼写错误不会被编译器捕获。
2. **payload 失配**：同一事件名在不同调用点可能传入不同形状的 payload，运行时崩溃。
3. **处理器签名漂移**：订阅者期望的字段与发布者实际传递的字段不一致，重构时无类型守护。

本模块的目标是用 TypeScript 类型系统在编译期消灭以上三类错误，达到 MIT 6.5810（Software Construction）与 Stanford CS107（Programming Paradigms）课程所要求的"类型驱动开发"标准。

## 1. 历史动机与技术演进

### 1.1 时间线

| 年份 | 事件 | 主要贡献者 |
| ---- | ---- | ---------- |
| 1972 | Smalltalk-72 引入 MVC，隐含观察者思想 | Alan Kay, Dan Ingalls |
| 1987 | ISIS 系统提出虚拟同步组通信 | Birman & Joseph, Cornell |
| 1994 | GoF《设计模式》出版，形式化观察者模式 | Gamma, Helm, Johnson, Vlissides |
| 1998 | Java JMS 1.0 规范发布 | Sun Microsystems |
| 2009 | Node.js 发布，EventEmitter 成为核心模块 | Ryan Dahl |
| 2010 | Backbone.Events 与 Guava EventBus 发布 | Jeremy Ashkenas / Google |
| 2012 | ReactiveX 引入 RxJS，Subject 类型问世 | Microsoft |
| 2014 | TypeScript 2.8 引入条件类型与 `infer`，为类型安全事件总线奠基 | Anders Hejlsberg |
| 2015 | VS Code 发布，Emitter API 成为前端类型安全事件参考实现 | Microsoft |
| 2018 | TypeScript 3.0 引入元组展开（spread types） | Microsoft |
| 2020 | TypeScript 4.1 引入模板字面量类型，支持 `'user:' + string` 形式事件名 | Microsoft |
| 2022 | Effect-Ts 发布，typed pubsub 成为 Schema-driven 的核心组件 | Effect Team |
| 2023 | TypeScript 5.0 重写解析器，复杂条件类型性能大幅提升 | Microsoft |
| 2024 | TC39 Stage 2 提案：Explicit Resource Management 与 Symbol.dispose | TC39 |

### 1.2 GoF 观察者模式原始定义

Gamma 等人在 1994 年出版的《Design Patterns: Elements of Reusable Object-Oriented Software》（ISBN 0-201-63361-2, DOI 10.5555/186897）第 293-303 页给出了观察者模式的经典定义：

> "Define a one-to-many dependency between objects so that when one object changes state, all its dependents are notified and updated automatically."

其中 Subject（被观察者）维护一个 Observer 列表，状态变更时调用每个 Observer 的 `update()` 方法。GoF 同时区分了两种变体：

- **Pull 模型**：Observer 收到通知后主动调用 `subject.getState()` 获取数据。
- **Push 模型**：Subject 在 `notify()` 时直接把数据作为参数传给 `update(data)`。

现代发布订阅系统通常采用 Push 模型，因为它更符合事件驱动语义，且 payload 类型可以在签名中显式声明，是类型安全的天然载体。

### 1.3 观察者 vs 发布订阅

二者常被混用，但在分布式系统与软件架构语境下有显著区别：

| 维度 | 观察者模式 | 发布订阅模式 |
| ---- | ---------- | ------------ |
| 解耦层级 | Subject 与 Observer 直接引用 | Publisher 与 Subscriber 通过 Broker 间接通信 |
| 通信方式 | 同步方法调用 | 通常异步（消息队列/事件总线） |
| 适用场景 | 进程内对象状态同步 | 跨进程、跨服务、跨组件通信 |
| 实例 | MVC 中 View 监听 Model | Kafka, RabbitMQ, Node.js EventEmitter |

TypeScript 中的"类型安全 PubSub"通常指**进程内观察者模式**，但借鉴了发布订阅的解耦哲学，因此术语混用在工程实践中可接受，本模块统一称"发布订阅"。

### 1.4 Node.js EventEmitter 的类型局限

`@types/node` 中 `EventEmitter` 的 `emit` 与 `on` 签名为：

```typescript
class EventEmitter {
  on(event: string | symbol, listener: (...args: any[]) => void): this;
  emit(event: string | symbol, ...args: any[]): boolean;
}
```

`any[]` 使得：

- 调用 `emit('user:login', { userId: 123 })`（漏掉 timestamp）不报错；
- 调用 `on('user:login', (p: { userId: string }) => ...)` 时编译器无法校验 listener 签名是否匹配 emit 端的 payload；
- 拼写事件名 `bus.emit('user:lgin', ...)` 不会触发任何编译错误。

Node.js 自 Node 14 起提供 `EventEmitter` 的子类化钩子 `Symbol.for('nodejs.rejection')` 与异步事件探测，但仍未提供类型级事件名约束。`@types/node` 通过 `EventEmitter.EventEmitter<T extends Record<string, any[]>>` 的泛型重载提供了部分类型支持，但 payload 仍是 `any[]`，无法表达"事件 A 的 payload 是 `{ userId: string }`"这样的形状约束。

### 1.5 类型安全事件库的演进

主流类型安全事件库的设计取向可分为三类：

1. **Keyof-based**（如 `typed-emitter`、`@typescript-eslint/types`-internal）：用 `keyof Events` 约束事件名，payload 由 `Events[K]` 推导。
2. **Map-based**（如 mitt、tiny-emitter 类型扩展）：运行时 `Map<string, Set<Function>>`，类型层在订阅时统一为 `(payload: unknown) => void`，宽松但可扩展。
3. **Reactive**（如 RxJS Subject、Effect-Ts PubSub）：基于 Observable/Observer 对偶模型，借助协变/逆变规则实现类型传递。

本模块以 **Keyof-based** 为主线，因为它在类型精确性与运行时简单性之间取得了最佳平衡。

## 2. 形式化定义

### 2.1 事件类型代数

设 $\mathcal{E}$ 为事件标识符的全集，$\mathcal{P}$ 为 payload 类型的全集。一个事件映射（EventMap）$\mathcal{M}$ 是从事件标识符到 payload 类型的全函数：

$$
\mathcal{M} : \mathcal{E} \rightharpoonup \mathcal{P}
$$

TypeScript 中通过 `Record<string, any>` 或具体接口类型表达：

```typescript
type EventMap = {
  'user:login': { userId: string; timestamp: Date };
  'user:logout': { userId: string };
  'cart:add': { productId: string; quantity: number };
};
```

事件名集合 $\text{dom}(\mathcal{M})$ 即 `keyof EventMap`。

### 2.2 处理器类型

对于事件 $K \in \text{dom}(\mathcal{M})$，其处理器（Handler）类型为：

$$
\text{Handler}_K = \mathcal{M}(K) \to \mathbf{1}
$$

其中 $\mathbf{1}$ 表示 TypeScript 的 `void` 类型（unit type）。在 TypeScript 中：

```typescript
type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;
```

### 2.3 订阅表类型

订阅表（Subscriber Table）是从事件名到处理器集合的映射：

$$
\text{Subscribers} : \text{dom}(\mathcal{M}) \to \mathcal{P}(\text{Handler}_K)
$$

在 TypeScript 中使用 `Map<keyof Events, Set<Function>>` 实现，类型层用 `Set<Handler<K>>` 表达。由于 TypeScript 的 `Map` 类型不支持依赖键的 value 类型，实际运行时只能用 `Set<Function>`，类型安全由 `subscribe` 与 `emit` 入口签名保证。

### 2.4 Unsubscribe 类型

订阅返回一个取消订阅的回调：

$$
\text{Unsubscribe} = \mathbf{1} \to \mathbf{1}
$$

```typescript
type Unsubscribe = () => void;
```

### 2.5 子类型关系

处理器类型上的子类型关系遵循函数类型的协变/逆变规则（参见 Cardelli & Martini 1992, *An Extension of System F with Subtyping*, DOI 10.1016/0890-5401(92)90018-G）：

$$
\frac{\sigma_2 \sqsubseteq \sigma_1 \quad \tau_1 \sqsubseteq \tau_2}{(\sigma_1 \to \tau_1) \sqsubseteq (\sigma_2 \to \tau_2)}
\quad
(\text{S-Fun})
$$

即：

- 返回值协变（covariant）：可返回更具体的类型；
- 参数逆变（contravariant）：可接收更宽泛的类型。

对于 Handler `(payload: Events[K]) => void`：

- 返回值固定为 `void`，无协变空间；
- 参数位置 `Events[K]` 是逆变位置。

### 2.6 严格模式下的类型安全保证

启用 `strictFunctionTypes: true` 后，TypeScript 严格按 S-Fun 校验函数子类型，使得：

```typescript
type Animal = { name: string };
type Dog = { name: string; breed: string };

let fnAnimal: (a: Animal) => void;
let fnDog: (d: Dog) => void;

fnAnimal = fnDog;  // 错误：strictFunctionTypes 下 Dog 不是 Animal 的超类型
fnDog = fnAnimal;  // 正确：Animal 是 Dog 的超类型，参数逆变允许
```

这保证了一个期望 `{ userId: string; timestamp: Date }` 的事件总线不会接受只读 `{ userId: string }` 的处理器，从而避免运行时访问 `timestamp.getTime()` 时的 `undefined` 异常。

## 3. 理论推导

### 3.1 协变与逆变的角色

考虑两个事件 $K_1$ 与 $K_2$，其 payload 满足 $\mathcal{M}(K_1) \sqsubseteq \mathcal{M}(K_2)$（即 $K_1$ 的 payload 是 $K_2$ 的子类型）。那么：

- **Handler 是逆变的**：$\text{Handler}_{K_2} \sqsubseteq \text{Handler}_{K_1}$（处理更宽泛 payload 的处理器可以替换为处理更具体 payload 的处理器）。
- **订阅表是协变的**：可以订阅 $\mathcal{M}(K_1)$ 的处理器到 $K_2$ 事件，因为 $K_2$ 发出的 payload 必然满足 $K_1$ 处理器的期望。

这条推导意味着：在严格模式下，类型系统会拒绝"为子类型事件订阅更具体的处理器"这种潜在不安全操作，但允许"为父类型事件订阅更宽泛的处理器"这种安全操作。

### 3.2 双变妥协的历史成因

TypeScript 默认对方法参数位置采用双变（bivariance），即同时允许协变与逆变。原因有二：

1. **Array 的兼容性**：内置 `Array<T>` 的方法 `push(item: T)` 在双变下允许 `Array<Animal>` 被赋值给 `Array<Dog>`，这对 JavaScript 现存代码至关重要。
2. **DOM 事件处理的常见模式**：`element.addEventListener('click', (e: MouseEvent) => ...)` 在双变下允许传 `(e: Event) => ...`，因为 MouseEvent 是 Event 的子类型。

但双变带来类型安全漏洞：

```typescript
interface Animal { name: string; }
interface Dog extends Animal { bark(): void; }

let dogHandler = (d: Dog) => d.bark();
let animalHandler: (a: Animal) => void = dogHandler;  // 双变下允许
animalHandler({ name: 'cat' });  // 运行时崩溃：cat 没有 bark()
```

`strictFunctionTypes` 启用后，这种赋值会报错，但仅对**函数类型字面量**与**方法签名（method shorthand）区分对待**：方法签名仍允许双变（兼容 DOM 事件 API），函数类型字面量严格执行逆变。

### 3.3 EventMap 设计的形式化推导

设 $\mathcal{M}$ 是 EventMap，我们要设计 `subscribe` 与 `emit` 的类型规则。

**规则 S1（subscribe 类型）**：

$$
\frac{K \in \text{dom}(\mathcal{M}) \quad h : \mathcal{M}(K) \to \mathbf{1}}{\text{subscribe}(K, h) : \mathbf{1} \to \mathbf{1}}
\quad
(\text{S-Sub})
$$

即事件名必须是 EventMap 的键，处理器参数类型必须是该事件对应的 payload。

**规则 S2（emit 类型）**：

$$
\frac{K \in \text{dom}(\mathcal{M}) \quad p : \mathcal{M}(K)}{\text{emit}(K, p) : \mathbf{1}}
\quad
(\text{S-Emit})
$$

**规则 S3（once 类型）**：

$$
\frac{K \in \text{dom}(\mathcal{M}) \quad h : \mathcal{M}(K) \to \mathbf{1}}{\text{once}(K, h) : \mathbf{1} \to \mathbf{1}}
\quad
(\text{S-Once})
$$

**规则 S4（off 类型）**：

$$
\frac{K \in \text{dom}(\mathcal{M}) \quad h : \mathcal{M}(K) \to \mathbf{1}}{\text{off}(K, h) : \mathbf{1}}
\quad
(\text{S-Off})
$$

### 3.4 复杂度分析

发布订阅核心操作的时间复杂度如下表：

| 操作 | 平均时间复杂度 | 最坏时间复杂度 | 空间复杂度 | 备注 |
| ---- | -------------- | -------------- | ---------- | ---- |
| subscribe | $O(1)$ | $O(1)$ | $O(1)$ | Map.get + Set.add |
| unsubscribe | $O(1)$ | $O(1)$ | $O(1)$ | Set.delete |
| emit (n 个订阅者) | $O(n)$ | $O(n)$ | $O(1)$ | 遍历 Set |
| once (单次触发) | $O(1)$ + 触发后的 $O(1)$ 删除 | $O(1)$ | $O(1)$ | wrapper 模式 |
| removeAllListeners | $O(1)$ | $O(1)$ | $O(1)$ | Map.delete |

注意：上述复杂度假设 Set 基于 hash table。V8 中 `Set` 在小规模（< 100 元素）时退化为线性查找，但仍为 $O(1)$ 均摊。大规模订阅者场景需要考虑分片（sharding）或分层（hierarchical）订阅表。

### 3.5 推导的工程意义

形式化推导告诉我们：

1. **类型层只需 EventMap 一个参数**：所有事件相关接口的类型都可从 EventMap 推导。
2. **运行时只需一个 Map<keyof Events, Set<Function>>**：所有操作的复杂度均为 $O(1)$ 或 $O(n)$，无需复杂数据结构。
3. **处理器类型必须是逆变位置**：TypeScript 必须启用 `strictFunctionTypes` 才能享受完整类型安全保证。

## 4. 类型安全 PubSub 的实现

### 4.1 基础版本

```typescript
type EventMap = {
  'user:login': { userId: string; timestamp: Date };
  'user:logout': { userId: string };
  'cart:add': { productId: string; quantity: number };
  'cart:remove': { productId: string };
  'order:create': { orderId: string; total: number };
};

type EventHandler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

class PubSub<Events extends Record<string, any>> {
  private subscribers = new Map<keyof Events, Set<Function>>();

  subscribe<K extends keyof Events & string>(
    event: K,
    handler: EventHandler<K>
  ): () => void {
    let set = this.subscribers.get(event);
    if (!set) {
      set = new Set();
      this.subscribers.set(event, set);
    }
    set.add(handler);
    return () => {
      set!.delete(handler);
      if (set!.size === 0) {
        this.subscribers.delete(event);
      }
    };
  }

  publish<K extends keyof Events & string>(event: K, payload: Events[K]): void {
    const set = this.subscribers.get(event);
    if (!set) return;
    for (const fn of set) {
      (fn as EventHandler<K>)(payload);
    }
  }
}
```

### 4.2 增加 once 与 off

```typescript
class TypedPubSub<Events extends Record<string, any>> {
  private subscribers = new Map<keyof Events, Set<Function>>();

  on<K extends keyof Events & string>(event: K, handler: EventHandler<K>): () => void {
    let set = this.subscribers.get(event);
    if (!set) {
      set = new Set();
      this.subscribers.set(event, set);
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  off<K extends keyof Events & string>(event: K, handler: EventHandler<K>): void {
    const set = this.subscribers.get(event);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
      this.subscribers.delete(event);
    }
  }

  once<K extends keyof Events & string>(event: K, handler: EventHandler<K>): () => void {
    const wrapper = (payload: Events[K]) => {
      try {
        handler(payload);
      } finally {
        this.off(event, wrapper as EventHandler<K>);
      }
    };
    this.on(event, wrapper as EventHandler<K>);
    return () => this.off(event, wrapper as EventHandler<K>);
  }

  emit<K extends keyof Events & string>(event: K, payload: Events[K]): void {
    const set = this.subscribers.get(event);
    if (!set) return;
    // 复制一份避免迭代过程中订阅者修改导致迭代失效
    const listeners = [...set];
    const errors: unknown[] = [];
    for (const fn of listeners) {
      try {
        (fn as EventHandler<K>)(payload);
      } catch (e) {
        errors.push(e);
      }
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, `emit "${String(event)}" failed`);
  }
}
```

### 4.3 支持事件名命名空间

```typescript
type EventsWithNamespace = {
  'user:login': { userId: string; timestamp: Date };
  'user:logout': { userId: string };
  'cart:add': { productId: string; quantity: number };
  'cart:remove': { productId: string };
};

type NamespaceFilter<K extends string> = K;
type EventsWithPrefix<Prefix extends string> = {
  [K in keyof EventsWithNamespace as K extends `${Prefix}${string}` ? K : never]: EventsWithNamespace[K]
};

// 批量取消命名空间下所有订阅
class NamespacePubSub<Events extends Record<string, any>> {
  private subscribers = new Map<keyof Events, Set<Function>>();

  offByNamespace<Prefix extends string>(prefix: Prefix): void {
    for (const event of this.subscribers.keys()) {
      if (String(event).startsWith(prefix)) {
        this.subscribers.delete(event);
      }
    }
  }
}
```

### 4.4 支持优先级

```typescript
interface SubscriptionOptions {
  priority?: number;
}

interface Subscription {
  handler: Function;
  priority: number;
  order: number;
}

class PriorityPubSub<Events extends Record<string, any>> {
  private subscribers = new Map<keyof Events, Subscription[]>();
  private orderCounter = 0;

  on<K extends keyof Events & string>(
    event: K,
    handler: EventHandler<K>,
    options: SubscriptionOptions = {}
  ): () => void {
    const priority = options.priority ?? 0;
    const sub: Subscription = { handler, priority, order: this.orderCounter++ };
    let arr = this.subscribers.get(event);
    if (!arr) {
      arr = [];
      this.subscribers.set(event, arr);
    }
    arr.push(sub);
    arr.sort((a, b) => b.priority - a.priority || a.order - b.order);

    return () => {
      const current = this.subscribers.get(event);
      if (!current) return;
      const idx = current.indexOf(sub);
      if (idx >= 0) current.splice(idx, 1);
      if (current.length === 0) this.subscribers.delete(event);
    };
  }

  emit<K extends keyof Events & string>(event: K, payload: Events[K]): void {
    const arr = this.subscribers.get(event);
    if (!arr) return;
    // 复制避免迭代中修改
    const snapshot = [...arr];
    const errors: unknown[] = [];
    for (const sub of snapshot) {
      try {
        (sub.handler as EventHandler<K>)(payload);
      } catch (e) {
        errors.push(e);
      }
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, `emit "${String(event)}" failed`);
  }
}
```

### 4.5 支持事件过滤

```typescript
interface FilterSubscriptionOptions<K extends string, Events extends Record<string, any>> {
  filter?: (payload: Events[K]) => boolean;
  priority?: number;
  once?: boolean;
}

class FilterPubSub<Events extends Record<string, any>> {
  private subscribers = new Map<keyof Events, Array<{ handler: Function; filter?: (p: any) => boolean; once: boolean }>>();

  on<K extends keyof Events & string>(
    event: K,
    handler: EventHandler<K>,
    options: FilterSubscriptionOptions<K, Events> = {}
  ): () => void {
    const sub = {
      handler,
      filter: options.filter as ((p: any) => boolean) | undefined,
      once: options.once ?? false,
    };
    let arr = this.subscribers.get(event);
    if (!arr) {
      arr = [];
      this.subscribers.set(event, arr);
    }
    arr.push(sub);
    return () => {
      const current = this.subscribers.get(event);
      if (!current) return;
      const idx = current.indexOf(sub);
      if (idx >= 0) current.splice(idx, 1);
      if (current.length === 0) this.subscribers.delete(event);
    };
  }

  emit<K extends keyof Events & string>(event: K, payload: Events[K]): void {
    const arr = this.subscribers.get(event);
    if (!arr) return;
    const toRemove: typeof arr = [];
    const errors: unknown[] = [];
    for (const sub of [...arr]) {
      if (sub.filter && !sub.filter(payload)) continue;
      try {
        (sub.handler as EventHandler<K>)(payload);
      } catch (e) {
        errors.push(e);
      }
      if (sub.once) toRemove.push(sub);
    }
    for (const sub of toRemove) {
      const idx = arr.indexOf(sub);
      if (idx >= 0) arr.splice(idx, 1);
    }
    if (toRemove.length > 0 && arr.length === 0) {
      this.subscribers.delete(event);
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, `emit "${String(event)}" failed`);
  }
}
```

### 4.6 异步事件总线

```typescript
class AsyncPubSub<Events extends Record<string, any>> {
  private subscribers = new Map<keyof Events, Set<Function>>();

  on<K extends keyof Events & string>(event: K, handler: EventHandler<K> | ((p: Events[K]) => Promise<void>)): () => void {
    let set = this.subscribers.get(event);
    if (!set) {
      set = new Set();
      this.subscribers.set(event, set);
    }
    set.add(handler);
    return () => {
      set!.delete(handler);
      if (set!.size === 0) this.subscribers.delete(event);
    };
  }

  async emit<K extends keyof Events & string>(event: K, payload: Events[K]): Promise<void> {
    const set = this.subscribers.get(event);
    if (!set) return;
    const listeners = [...set];
    const errors: unknown[] = [];
    for (const fn of listeners) {
      try {
        await (fn as (p: Events[K]) => unknown | Promise<unknown>)(payload);
      } catch (e) {
        errors.push(e);
      }
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, `emit "${String(event)}" failed`);
  }
}
```

### 4.7 完整生产级实现

将上述特性整合，得到完整生产级 PubSub：

```typescript
export type EventHandler<P> = (payload: P) => void | Promise<void>;

export interface SubscribeOptions<P> {
  priority?: number;
  once?: boolean;
  filter?: (payload: P) => boolean;
}

interface InternalSubscription {
  handler: Function;
  priority: number;
  order: number;
  once: boolean;
  filter?: (payload: any) => boolean;
}

export class TypedEventBus<Events extends Record<string, any>> {
  private subscribers = new Map<keyof Events, InternalSubscription[]>();
  private orderCounter = 0;

  on<K extends keyof Events & string>(
    event: K,
    handler: EventHandler<Events[K]>,
    options: SubscribeOptions<Events[K]> = {}
  ): () => void {
    const sub: InternalSubscription = {
      handler,
      priority: options.priority ?? 0,
      order: this.orderCounter++,
      once: options.once ?? false,
      filter: options.filter,
    };
    let arr = this.subscribers.get(event);
    if (!arr) {
      arr = [];
      this.subscribers.set(event, arr);
    }
    arr.push(sub);
    this.sortSubscribers(arr);

    return () => this.removeSubscription(event, sub);
  }

  once<K extends keyof Events & string>(
    event: K,
    handler: EventHandler<Events[K]>,
    options: Omit<SubscribeOptions<Events[K]>, 'once'> = {}
  ): () => void {
    return this.on(event, handler, { ...options, once: true });
  }

  off<K extends keyof Events & string>(
    event: K,
    handler: EventHandler<Events[K]>
  ): void {
    const arr = this.subscribers.get(event);
    if (!arr) return;
    const idx = arr.findIndex((s) => s.handler === handler);
    if (idx >= 0) arr.splice(idx, 1);
    if (arr.length === 0) this.subscribers.delete(event);
  }

  offAll<K extends keyof Events & string>(event?: K): void {
    if (event !== undefined) {
      this.subscribers.delete(event);
    } else {
      this.subscribers.clear();
    }
  }

  offByNamespace<Prefix extends string>(prefix: Prefix): void {
    for (const event of [...this.subscribers.keys()]) {
      if (String(event).startsWith(prefix)) {
        this.subscribers.delete(event);
      }
    }
  }

  emit<K extends keyof Events & string>(event: K, payload: Events[K]): void {
    const arr = this.subscribers.get(event);
    if (!arr) return;
    const snapshot = [...arr];
    const toRemove: InternalSubscription[] = [];
    const errors: unknown[] = [];

    for (const sub of snapshot) {
      if (sub.filter && !sub.filter(payload)) continue;
      try {
        const result = (sub.handler as (p: Events[K]) => unknown)(payload);
        // 异步结果不等待，错误由 Promise.catch 处理
        if (result instanceof Promise) {
          result.catch((e) => console.error(`[EventBus] async handler error for "${event}":`, e));
        }
      } catch (e) {
        errors.push(e);
      }
      if (sub.once) toRemove.push(sub);
    }

    for (const sub of toRemove) {
      const idx = arr.indexOf(sub);
      if (idx >= 0) arr.splice(idx, 1);
    }
    if (arr.length === 0) this.subscribers.delete(event);

    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, `emit "${String(event)}" failed`);
  }

  async emitAsync<K extends keyof Events & string>(event: K, payload: Events[K]): Promise<void> {
    const arr = this.subscribers.get(event);
    if (!arr) return;
    const snapshot = [...arr];
    const toRemove: InternalSubscription[] = [];
    const errors: unknown[] = [];

    for (const sub of snapshot) {
      if (sub.filter && !sub.filter(payload)) continue;
      try {
        await (sub.handler as (p: Events[K]) => unknown | Promise<unknown>)(payload);
      } catch (e) {
        errors.push(e);
      }
      if (sub.once) toRemove.push(sub);
    }

    for (const sub of toRemove) {
      const idx = arr.indexOf(sub);
      if (idx >= 0) arr.splice(idx, 1);
    }
    if (arr.length === 0) this.subscribers.delete(event);

    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, `emit "${String(event)}" failed`);
  }

  listenerCount<K extends keyof Events & string>(event: K): number {
    return this.subscribers.get(event)?.length ?? 0;
  }

  eventNames(): Array<keyof Events> {
    return [...this.subscribers.keys()];
  }

  private sortSubscribers(arr: InternalSubscription[]): void {
    arr.sort((a, b) => b.priority - a.priority || a.order - b.order);
  }

  private removeSubscription<K extends keyof Events & string>(
    event: K,
    sub: InternalSubscription
  ): void {
    const arr = this.subscribers.get(event);
    if (!arr) return;
    const idx = arr.indexOf(sub);
    if (idx >= 0) arr.splice(idx, 1);
    if (arr.length === 0) this.subscribers.delete(event);
  }
}
```

## 5. 与其他语言/库对比

### 5.1 Node.js EventEmitter

| 维度 | Node.js EventEmitter | TypedEventBus |
| ---- | -------------------- | -------------- |
| 事件名类型 | `string \| symbol` | `keyof Events & string` |
| payload 类型 | `any[]` | `Events[K]`（精确） |
| 错误处理 | 抛 `error` 事件或冒泡至 `process` | AggregateError 聚合 |
| 同步/异步 | 同步（监听器可异步但 emit 不等待） | emit 同步、emitAsync 异步 |
| 性能 | C++ 实现底层 + Set | 纯 JS + Array |
| 内存 | 默认 10 监听器上限警告 | 无上限（生产配置应自加上限） |
| API 完整度 | on/once/off/emit/listenerCount/prependListener/rawListeners | on/once/off/offAll/offByNamespace/emit/emitAsync/listenerCount/eventNames |

### 5.2 RxJS Subject

RxJS Subject 同时实现 Observable 与 Observer，支持响应式组合：

```typescript
import { Subject } from 'rxjs';

const login$ = new Subject<{ userId: string; timestamp: Date }>();

login$.subscribe(({ userId }) => console.log('login:', userId));
login$.next({ userId: '123', timestamp: new Date() });
```

| 维度 | RxJS Subject | TypedEventBus |
| ---- | ------------ | -------------- |
| 类型安全 | 通过泛型参数精确 | 通过 EventMap 多事件名 |
| 多事件支持 | 需要多个 Subject 实例 | 一个总线管理多事件 |
| 操作符 | filter/map/debounceTime 等丰富 | 仅 filter |
| 冷启动 | Subject 默认 hot | 热事件 |
| 内存管理 | Subscription 链 | unsubscribe 函数 |
| 学习曲线 | 高（需理解 reactive 编程） | 低（经典 EventEmitter API） |

### 5.3 VS Code Emitter

VS Code 的 `vscode.EventEmitter` API 是前端类型安全事件的参考实现：

```typescript
import { Emitter, Event } from 'vscode';

interface LoginPayload { userId: string; timestamp: Date; }

const onLoginEmitter = new Emitter<LoginPayload>();
const onLogin: Event<LoginPayload> = onLoginEmitter.event;

onLogin((payload) => console.log(payload.userId));
onLoginEmitter.fire({ userId: '123', timestamp: new Date() });
```

特点：

- 单事件单 Emitter，类型精确；
- `event` 是只读 Event 接口，外部只能订阅不能 fire；
- 内部 `fire` 才能触发，分离生产者与消费者；
- 支持 `Event.debounce`、`Event.any` 等高阶组合。

### 5.4 Haskell reactive-banana

Haskell 的 reactive-banana 库基于箭头（Arrow）与 Monad 实现 FRP：

```haskell
import Reactive.Banana

network :: MomentIO ()
network = do
  loginEvent <- fromAddHandler loginHandler
  reactimate $ putStrLn . ("login: " ++) . show <$> loginEvent
```

类型层用 `Event t a` 表达事件流，`a` 是 payload 类型。由于 Haskell 类型系统强，事件组合在编译期完全类型安全。TypeScript 的 EventMap 模型与之相比：

- TypeScript 用对象字面量聚合多事件，Haskell 用多个 `Event t a` 值；
- TypeScript 的 `emit` 在运行时执行副作用，Haskell 的 `reactimate` 在 MomentIO monad 中调度；
- TypeScript 无类型级时间（time）概念，Haskell 的 `t` 类型参数表达时间线。

### 5.5 Scala Akka

Akka 的 Actor 模型用消息传递代替事件订阅：

```scala
import akka.actor._

case class Login(userId: String, timestamp: java.util.Date)

class UserService extends Actor {
  def receive = {
    case Login(userId, ts) => println(s"login: $userId")
  }
}

val system = ActorSystem("my-system")
val service = system.actorOf(Props[UserService](), "user-service")
service ! Login("123", new java.util.Date())
```

与 TypedEventBus 相比：

- Akka 通过 case class 实现类型安全消息；
- Actor 是有状态的，PubSub 是无状态的（仅维护订阅表）；
- Actor 模型适合分布式，PubSub 适合进程内事件路由；
- Akka 提供 at-least-once 投递保证，PubSub 默认无投递保证。

### 5.6 对比总结

| 库/语言 | 类型安全 | 多事件支持 | 异步 | 错误处理 | 适用场景 |
| ------- | -------- | ---------- | ---- | -------- | -------- |
| Node.js EventEmitter | 弱（any[]） | 强（string） | 同步 | error 事件 | 通用 Node.js |
| TypedEventBus | 强（EventMap） | 强 | 同步 + 异步 | AggregateError | TypeScript 进程内 |
| RxJS Subject | 强（单泛型） | 弱（每事件一实例） | 异步流 | Observable 错误通道 | 响应式 UI |
| VS Code Emitter | 强（单泛型） | 弱（每事件一实例） | 同步 | 抛异常 | 编辑器扩展 |
| Haskell reactive-banana | 极强 | 中 | Monad 调度 | MonadError | FRP |
| Scala Akka | 强（case class） | 强（Actor 多消息） | 异步 | Actor 监督 | 分布式 |

## 6. 常见陷阱与修复

### 6.1 陷阱 1：this 绑定丢失

```typescript
class UserService {
  private userId = 'unknown';

  constructor(private bus: TypedEventBus<EventMap>) {
    // 错误：handler 内部 this 不指向 UserService
    this.bus.on('user:login', this.handleLogin);
  }

  private handleLogin(payload: { userId: string; timestamp: Date }) {
    console.log(this.userId);  // undefined
  }
}
```

**修复**：使用箭头函数或 `.bind(this)`：

```typescript
constructor(private bus: TypedEventBus<EventMap>) {
  this.bus.on('user:login', (payload) => this.handleLogin(payload));
}
```

### 6.2 陷阱 2：内存泄漏

订阅者持有 `this` 引用，若忘记 unsubscribe，对象无法被 GC：

```typescript
class Chart {
  constructor(bus: TypedEventBus<EventMap>) {
    bus.on('cart:add', this.onCartAdd);  // 永久订阅，Chart 实例无法释放
  }
  private onCartAdd = (p: { productId: string; quantity: number }) => { /* ... */ };
}

// 修复：实现 Disposable 接口
class Chart implements Disposable {
  private unsubscribe: (() => void) | null = null;

  constructor(bus: TypedEventBus<EventMap>) {
    this.unsubscribe = bus.on('cart:add', this.onCartAdd);
  }

  [Symbol.dispose]() {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private onCartAdd = (p: { productId: string; quantity: number }) => { /* ... */ };
}

// 使用
using chart = new Chart(bus);  // 作用域结束自动 dispose
```

### 6.3 陷阱 3：事件顺序依赖

```typescript
bus.on('user:login', () => console.log('A'));
bus.on('user:login', () => console.log('B'));
bus.on('user:login', () => console.log('C'));
bus.emit('user:login', payload);
// 期望：A B C，实际可能：C B A（若内部用 Set 且迭代顺序不稳定）
```

**修复**：用 Array 替代 Set，并显式按 priority + order 排序（参见 4.4）。

### 6.4 陷阱 4：错误冒泡中断

```typescript
bus.on('event', () => { throw new Error('boom'); });
bus.on('event', () => console.log('after boom'));  // 永远不执行
bus.emit('event', payload);
```

**修复**：用 try/catch 包裹每个 handler，错误聚合后抛 AggregateError（参见 4.2）。

### 6.5 陷阱 5：迭代中修改订阅表

```typescript
bus.on('event', () => bus.off('event', otherHandler));  // 迭代中删除
bus.emit('event', payload);  // 可能跳过其他订阅者
```

**修复**：emit 前复制一份 `[...arr]`，在副本上迭代（参见 4.2）。

### 6.6 陷阱 6：异步处理器返回值丢失

```typescript
bus.on('event', async (payload) => {
  await fetch('/api/track', { method: 'POST', body: JSON.stringify(payload) });
});
bus.emit('event', payload);  // fetch 可能未完成
console.log('done');  // 在 fetch 完成前打印
```

**修复**：使用 `emitAsync`：

```typescript
await bus.emitAsync('event', payload);
console.log('done');  // 确保所有异步处理器完成
```

### 6.7 陷阱 7：循环事件

```typescript
bus.on('a', () => bus.emit('b', payload));
bus.on('b', () => bus.emit('a', payload));  // 死循环
bus.emit('a', payload);
```

**修复**：

- 在事件名中加入触发源标记，避免自循环；
- 用 `Set` 跟踪正在 emit 的事件链，检测循环时抛错；
- 设计阶段明确事件依赖图，避免环路。

```typescript
class CycleDetectBus<Events extends Record<string, any>> {
  private emitting = new Set<keyof Events>();

  emit<K extends keyof Events & string>(event: K, payload: Events[K]): void {
    if (this.emitting.has(event)) {
      throw new Error(`Event cycle detected: ${String(event)}`);
    }
    this.emitting.add(event);
    try {
      // ... 正常 emit 逻辑
    } finally {
      this.emitting.delete(event);
    }
  }
}
```

## 7. 工程实践

### 7.1 tsconfig 配置

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "strictFunctionTypes": true,  // 必须，保证 Handler 逆变
    "noImplicitAny": true,
    "exactOptionalPropertyTypes": true,  // 区分 undefined 与缺失
    "noUncheckedIndexedAccess": true
  }
}
```

### 7.2 项目结构

```
src/
  events/
    event-map.ts           // 全局 EventMap 类型定义
    typed-event-bus.ts     // TypedEventBus 实现
    index.ts               // 导出
  modules/
    user/
      user-service.ts      // 使用 bus.on('user:login', ...)
```

`event-map.ts` 示例：

```typescript
export interface AppEventMap {
  'user:login': { userId: string; timestamp: Date };
  'user:logout': { userId: string };
  'cart:add': { productId: string; quantity: number };
  'cart:remove': { productId: string };
  'order:create': { orderId: string; total: number };
  'order:paid': { orderId: string; paidAt: Date };
}

// 类型增强：允许局部模块声明自己的事件
declare module '../events/event-map' {
  interface AppEventMap {
    'analytics:track': { event: string; properties: Record<string, unknown> };
  }
}
```

### 7.3 测试策略

```typescript
import { describe, it, expect, vi } from 'vitest';
import { TypedEventBus } from './typed-event-bus';
import type { AppEventMap } from './event-map';

describe('TypedEventBus', () => {
  it('should call subscribers with correct payload type', () => {
    const bus = new TypedEventBus<AppEventMap>();
    const handler = vi.fn();
    bus.on('user:login', handler);
    bus.emit('user:login', { userId: '123', timestamp: new Date() });
    expect(handler).toHaveBeenCalledWith({ userId: '123', timestamp: expect.any(Date) });
  });

  it('should remove subscriber after unsubscribe', () => {
    const bus = new TypedEventBus<AppEventMap>();
    const handler = vi.fn();
    const unsubscribe = bus.on('user:login', handler);
    unsubscribe();
    bus.emit('user:login', { userId: '123', timestamp: new Date() });
    expect(handler).not.toHaveBeenCalled();
  });

  it('should fire once handler only once', () => {
    const bus = new TypedEventBus<AppEventMap>();
    const handler = vi.fn();
    bus.once('user:login', handler);
    bus.emit('user:login', { userId: '123', timestamp: new Date() });
    bus.emit('user:login', { userId: '456', timestamp: new Date() });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should call handlers in priority order', () => {
    const bus = new TypedEventBus<AppEventMap>();
    const order: string[] = [];
    bus.on('user:login', () => order.push('low'), { priority: 0 });
    bus.on('user:login', () => order.push('high'), { priority: 10 });
    bus.on('user:login', () => order.push('mid'), { priority: 5 });
    bus.emit('user:login', { userId: '123', timestamp: new Date() });
    expect(order).toEqual(['high', 'mid', 'low']);
  });

  it('should filter events by predicate', () => {
    const bus = new TypedEventBus<AppEventMap>();
    const handler = vi.fn();
    bus.on('cart:add', handler, { filter: (p) => p.quantity > 1 });
    bus.emit('cart:add', { productId: 'a', quantity: 1 });
    bus.emit('cart:add', { productId: 'b', quantity: 5 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ productId: 'b', quantity: 5 });
  });

  it('should aggregate errors from multiple handlers', () => {
    const bus = new TypedEventBus<AppEventMap>();
    bus.on('user:login', () => { throw new Error('A'); });
    bus.on('user:login', () => { throw new Error('B'); });
    expect(() => bus.emit('user:login', { userId: '1', timestamp: new Date() }))
      .toThrow(AggregateError);
  });
});
```

### 7.4 性能优化

1. **避免 emit 中复制数组**：对于大规模订阅者，用 immutable 持久化数据结构（如 Immer）替换 `[...arr]`。
2. **批处理 emit**：使用 microtask 队列批处理多个 emit，减少遍历次数。

```typescript
class BatchedEventBus<Events extends Record<string, any>> {
  private pending = new Map<keyof Events, Events[keyof Events][]>();
  private scheduled = false;

  emit<K extends keyof Events & string>(event: K, payload: Events[K]): void {
    let arr = this.pending.get(event);
    if (!arr) {
      arr = [];
      this.pending.set(event, arr);
    }
    arr.push(payload);
    if (!this.scheduled) {
      this.scheduled = true;
      queueMicrotask(() => this.flush());
    }
  }

  private flush(): void {
    this.scheduled = false;
    const batch = this.pending;
    this.pending = new Map();
    for (const [event, payloads] of batch) {
      for (const payload of payloads) {
        // 实际分发逻辑
      }
    }
  }
}
```

3. **弱引用订阅**：用 `WeakRef` 持有 handler，允许 GC 自动回收（仅适用于不关心稳定性的场景）。

### 7.5 调试工具

```typescript
class DebugEventBus<Events extends Record<string, any>> extends TypedEventBus<Events> {
  private logEnabled = false;

  enableLog(): void { this.logEnabled = true; }
  disableLog(): void { this.logEnabled = false; }

  override on<K extends keyof Events & string>(
    event: K,
    handler: EventHandler<Events[K]>,
    options: SubscribeOptions<Events[K]> = {}
  ): () => void {
    if (this.logEnabled) {
      console.log(`[EventBus] subscribe "${String(event)}"`, options);
    }
    const unsubscribe = super.on(event, handler, options);
    return () => {
      if (this.logEnabled) {
        console.log(`[EventBus] unsubscribe "${String(event)}"`);
      }
      unsubscribe();
    };
  }

  override emit<K extends keyof Events & string>(event: K, payload: Events[K]): void {
    if (this.logEnabled) {
      console.log(`[EventBus] emit "${String(event)}"`, payload);
    }
    super.emit(event, payload);
  }
}
```

## 8. 案例研究

### 8.1 VS Code Editor 事件系统

VS Code 的文本编辑器是类型安全事件系统的典范。`vscode.TextDocument` 暴露 `onDidChangeContent`、`onWillSave`、`onDidSave` 等事件，每个事件都有精确的 payload 类型：

```typescript
interface TextDocument {
  onDidChangeContent(listener: (e: TextDocumentChangeEvent) => any): Disposable;
  onWillSaveWaitUntil(listener: (e: TextDocumentWillSaveEvent) => Thenable<TextEdit[]>): Disposable;
  onDidSave(listener: (e: TextDocumentSaveEvent) => any): Disposable;
}
```

设计要点：

- 每个事件独立 Emitter，类型由 `Event<T>` 泛型参数约束；
- `Disposable` 接口统一资源清理；
- `onWillSaveWaitUntil` 支持异步拦截，等待监听器返回 `TextEdit[]` 后再保存；
- 事件名遵循 `on + PastTense` 命名约定（已发生）或 `on + FutureTense`（将发生，可拦截）。

### 8.2 React State Management（自研轻量状态管理）

用类型安全 PubSub 可实现一个 30 行的 React 状态管理库：

```typescript
import { useSyncExternalStore } from 'react';

class Store<T> {
  private bus = new TypedEventBus<{ change: { state: T } }>();
  constructor(private state: T) {}

  getState = (): T => this.state;

  subscribe = (listener: () => void): (() => void) => {
    return this.bus.on('change', listener);
  };

  setState(updater: (prev: T) => T): void {
    this.state = updater(this.state);
    this.bus.emit('change', { state: this.state });
  }
}

function useStore<T, U>(store: Store<T>, selector: (state: T) => U): U {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState())
  );
}

// 使用
const counterStore = new Store({ count: 0 });
function Counter() {
  const count = useStore(counterStore, (s) => s.count);
  return <button onClick={() => counterStore.setState((s) => ({ count: s.count + 1 }))}>{count}</button>;
}
```

### 8.3 Redux 内部事件

Redux 内部使用一个简化的事件总线来通知 store 订阅者：

```typescript
// Redux 4.x 简化版
function createStore(reducer, preloadedState) {
  let state = preloadedState;
  const listeners = new Set<() => void>();

  function dispatch(action) {
    state = reducer(state, action);
    listeners.forEach((l) => l());
    return action;
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getState() { return state; }

  return { dispatch, subscribe, getState };
}
```

TypeScript 版本可改造为 TypedEventBus：

```typescript
class TypedReduxStore<State, Action extends { type: string }> {
  private state: State;
  private bus = new TypedEventBus<{ change: { prevState: State; nextState: State; action: Action } }>();

  constructor(
    private reducer: (state: State, action: Action) => State,
    initialState: State
  ) {
    this.state = initialState;
  }

  dispatch(action: Action): void {
    const prevState = this.state;
    this.state = this.reducer(this.state, action);
    this.bus.emit('change', { prevState, nextState: this.state, action });
  }

  subscribe(listener: (payload: { prevState: State; nextState: State; action: Action }) => void): () => void {
    return this.bus.on('change', listener);
  }

  getState(): State { return this.state; }
}
```

### 8.4 Cal.com 调度系统

Cal.com 用类型安全事件总线协调多个服务（邮件、短信、视频会议）：

```typescript
interface BookingEventMap {
  'booking:created': { bookingId: string; userId: string; startTime: Date; endTime: Date };
  'booking:cancelled': { bookingId: string; reason: string };
  'booking:rescheduled': { bookingId: string; newStartTime: Date; newEndTime: Date };
}

const bus = new TypedEventBus<BookingEventMap>();

// 邮件服务订阅
bus.on('booking:created', async ({ bookingId, userId }) => {
  await sendConfirmationEmail(bookingId, userId);
});

// 日历同步订阅
bus.on('booking:created', async ({ bookingId, startTime, endTime }) => {
  await syncToGoogleCalendar(bookingId, startTime, endTime);
});

// 视频会议创建订阅
bus.on('booking:created', async ({ bookingId, startTime, endTime }) => {
  await createZoomMeeting(bookingId, startTime, endTime);
}, { priority: 10 });  // 优先创建会议链接，邮件中包含
```

### 8.5 Effect-Ts PubSub

Effect-Ts 库的 PubSub 是 Schema 驱动的类型安全事件总线：

```typescript
import { PubSub, Effect, Schema } from 'effect';

const LoginEvent = Schema.Struct({
  userId: Schema.String,
  timestamp: Schema.DateFromString,
});

type LoginEvent = Schema.Schema.Type<typeof LoginEvent>;

const program = Effect.gen(function* (_) {
  const pubsub = yield* _(PubSub.make<LoginEvent>(100));
  yield* _(PubSub.publish(pubsub, { userId: '123', timestamp: new Date() }));
  const event = yield* _(PubSub.take(pubsub));
  console.log(event.userId);
});

Effect.runSync(program);
```

特点：

- 内置容量限制（bounded queue）；
- 与 Effect 生态（Stream、Queue、Schema）深度集成；
- 运行时校验与编译时类型对齐。

## 9. 进阶主题

### 9.1 事件溯源（Event Sourcing）

将所有状态变更记录为不可变事件流，配合 PubSub 实现可重放的系统：

```typescript
interface DomainEvent {
  type: string;
  payload: unknown;
  timestamp: Date;
  aggregateId: string;
  version: number;
}

class EventStore<Events extends Record<string, any>> {
  private bus = new TypedEventBus<Events>();
  private events: Array<{ type: keyof Events; payload: Events[keyof Events]; timestamp: Date; version: number }> = [];

  append<K extends keyof Events & string>(aggregateId: string, type: K, payload: Events[K]): void {
    const event = { type, payload, timestamp: new Date(), version: this.events.length + 1 };
    this.events.push(event);
    this.bus.emit(type, payload);
  }

  replay(fromVersion: number = 0): void {
    for (const event of this.events.slice(fromVersion)) {
      this.bus.emit(event.type as keyof Events & string, event.payload);
    }
  }
}
```

### 9.2 CQRS（Command Query Responsibility Segregation）

将写模型（Command）与读模型（Query）分离，通过事件总线同步：

```typescript
interface CommandMap {
  'create-user': { userId: string; name: string };
  'delete-user': { userId: string };
}

interface QueryMap {
  'get-user': { userId: string };
}

class CommandBus extends TypedEventBus<CommandMap> {}
class QueryBus extends TypedEventBus<QueryMap> {}

// 写侧订阅命令、发布事件
const commandBus = new CommandBus();
const eventBus = new TypedEventBus<AppEventMap>();

commandBus.on('create-user', (cmd) => {
  // 写入数据库
  // 发布事件
  eventBus.emit('user:login', { userId: cmd.userId, timestamp: new Date() });
});

// 读侧订阅事件、更新读模型
eventBus.on('user:login', ({ userId }) => {
  // 更新读模型缓存
});
```

### 9.3 分布式事件总线

跨进程事件总线需要序列化 payload：

```typescript
import { WebSocket } from 'ws';

interface SerializedEnvelope<T> {
  event: string;
  payload: T;
  timestamp: number;
  source: string;
}

class DistributedEventBus<Events extends Record<string, any>> {
  private localBus = new TypedEventBus<Events>();
  private ws: WebSocket;

  constructor(private nodeId: string, wsUrl: string) {
    this.ws = new WebSocket(wsUrl);
    this.ws.on('message', (data) => {
      const env: SerializedEnvelope<unknown> = JSON.parse(data.toString());
      // 只处理来自其他节点的事件
      if (env.source !== this.nodeId) {
        this.localBus.emit(env.event as keyof Events & string, env.payload as Events[keyof Events]);
      }
    });
  }

  emit<K extends keyof Events & string>(event: K, payload: Events[K]): void {
    this.localBus.emit(event, payload);
    const env: SerializedEnvelope<Events[K]> = {
      event,
      payload,
      timestamp: Date.now(),
      source: this.nodeId,
    };
    this.ws.send(JSON.stringify(env));
  }

  on<K extends keyof Events & string>(event: K, handler: EventHandler<Events[K]>): () => void {
    return this.localBus.on(event, handler);
  }
}
```

注意：序列化会丢失 Date、Map、Set 等非 JSON 类型，需要在 payload 类型中显式标注为可序列化类型（如 ISO 字符串代替 Date）。

### 9.4 类型安全的事件元数据

事件可携带元数据（trace ID、用户上下文等）：

```typescript
interface EventMetadata {
  traceId: string;
  userId?: string;
  timestamp: Date;
  source: string;
}

type EventWithMeta<P> = { payload: P; meta: EventMetadata };

class MetadataEventBus<Events extends Record<string, any>> {
  private bus = new TypedEventBus<{ [K in keyof Events]: EventWithMeta<Events[K]> }>();

  emit<K extends keyof Events & string>(
    event: K,
    payload: Events[K],
    meta: Omit<EventMetadata, 'timestamp'> & { timestamp?: Date }
  ): void {
    this.bus.emit(event, {
      payload,
      meta: { timestamp: meta.timestamp ?? new Date(), ...meta },
    });
  }

  on<K extends keyof Events & string>(
    event: K,
    handler: (payload: Events[K], meta: EventMetadata) => void
  ): () => void {
    return this.bus.on(event, ({ payload, meta }) => handler(payload, meta));
  }
}
```

## 10. 与其他模式的关系

### 10.1 与 Promise 的关系

Promise 是一次性、单消费者的事件。PubSub 是多次性、多消费者的事件。

```typescript
// Promise 一次性
const p = new Promise<string>((resolve) => setTimeout(() => resolve('done'), 100));
p.then(console.log);  // done
p.then(console.log);  // done（同一个值，但已 resolve）

// PubSub 多次多消费者
bus.on('task:done', (p) => console.log(p.taskId));
bus.on('task:done', (p) => console.log(p.duration));
bus.emit('task:done', { taskId: '1', duration: 100 });
bus.emit('task:done', { taskId: '2', duration: 200 });
```

### 10.2 与 Iterator 的关系

Iterator 是 pull 模型（消费者主动 next），PubSub 是 push 模型（生产者主动 emit）。

```typescript
// Iterator pull
async function* eventStream() {
  while (true) {
    const event = await getNextEvent();
    yield event;
  }
}

// PubSub push
bus.on('event', (event) => handle(event));
```

可以用 `AsyncQueue` 桥接二者：

```typescript
class AsyncQueue<T> {
  private items: T[] = [];
  private resolvers: ((value: T) => void)[] = [];

  enqueue(item: T): void {
    const resolver = this.resolvers.shift();
    if (resolver) resolver(item);
    else this.items.push(item);
  }

  async dequeue(): Promise<T> {
    const item = this.items.shift();
    if (item !== undefined) return item;
    return new Promise<T>((resolve) => this.resolvers.push(resolve));
  }
}

// 桥接
const queue = new AsyncQueue<Payload>();
bus.on('event', (p) => queue.enqueue(p));

// 消费
async function consume() {
  for await (const p of {
    [Symbol.asyncIterator]: async function* () {
      while (true) yield await queue.dequeue();
    }
  }) {
    handle(p);
  }
}
```

### 10.3 与 Observable 的关系

Observable 是 PubSub 的拉取式延迟版本。RxJS 提供了 `fromEventPattern` 将 PubSub 转 Observable：

```typescript
import { fromEventPattern, Observable } from 'rxjs';

function fromBusEvent<K extends keyof Events & string>(
  bus: TypedEventBus<Events>,
  event: K
): Observable<Events[K]> {
  return fromEventPattern(
    (handler) => bus.on(event, handler),
    (handler) => bus.off(event, handler)
  );
}

const login$ = fromBusEvent(bus, 'user:login');
login$.subscribe(({ userId }) => console.log(userId));
```

## 11. 类型体操进阶

### 11.1 事件名前缀过滤

```typescript
type EventsWithPrefix<E extends Record<string, any>, Prefix extends string> = {
  [K in keyof E as K extends `${Prefix}${string}` ? K : never]: E[K]
};

type UserEvents = EventsWithPrefix<EventMap, 'user:'>;
// { 'user:login': ...; 'user:logout': ... }
```

### 11.2 Payload 字段提取

```typescript
type PayloadField<E extends Record<string, any>, Field extends string> = {
  [K in keyof E]: E[K] extends { [F in Field]: infer V } ? V : never
}[keyof E];

type AllUserIds = PayloadField<EventMap, 'userId'>;
// string
```

### 11.3 事件名自动生成

```typescript
type EventNames<Events extends Record<string, any>> = keyof Events & string;

function createTypedBus<Events extends Record<string, any>>(
  events: readonly EventNames<Events>[]
): TypedEventBus<Events> {
  console.log('Registered events:', events);
  return new TypedEventBus<Events>();
}

const bus = createTypedBus<EventMap>(['user:login', 'user:logout', 'cart:add']);
```

### 11.4 处理器组合

```typescript
type ComposedHandler<P> = (payload: P) => void;

function composeHandlers<P>(...handlers: ComposedHandler<P>[]): ComposedHandler<P> {
  return (payload) => {
    for (const h of handlers) h(payload);
  };
}

const combined = composeHandlers(
  (p: { userId: string }) => console.log('A', p.userId),
  (p: { userId: string }) => console.log('B', p.userId)
);
bus.on('user:login', combined);
```

### 11.5 类型安全的事件过滤

```typescript
type FilterPredicate<E extends Record<string, any>, K extends keyof E> = (
  payload: E[K]
) => boolean;

class FilteredBus<Events extends Record<string, any>> {
  private bus = new TypedEventBus<Events>();

  onFiltered<K extends keyof Events & string>(
    event: K,
    predicate: FilterPredicate<Events, K>,
    handler: (payload: Events[K]) => void
  ): () => void {
    return this.bus.on(event, (payload) => {
      if (predicate(payload)) handler(payload);
    });
  }
}
```

## 12. 测试与验证

### 12.1 类型层测试（tsd）

```typescript
import { expectType } from 'tsd';
import { TypedEventBus } from './typed-event-bus';

interface TestEvents {
  'test:a': { value: number };
  'test:b': { name: string; active: boolean };
}

const bus = new TypedEventBus<TestEvents>();

// 事件名必须是合法 key
// @ts-expect-error - 'test:c' 不在 TestEvents 中
bus.on('test:c', () => {});

// payload 类型精确
bus.on('test:a', (payload) => {
  expectType<number>(payload.value);
});

// emit payload 类型校验
bus.emit('test:a', { value: 42 });
// @ts-expect-error - 缺少 value 字段
bus.emit('test:a', {});
// @ts-expect-error - 类型错误
bus.emit('test:a', { value: 'string' });
```

### 12.2 运行时测试覆盖率

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('TypedEventBus - error handling', () => {
  it('should continue calling handlers after one throws', () => {
    const bus = new TypedEventBus<{ test: { value: number } }>();
    const calls: number[] = [];
    bus.on('test', () => { calls.push(1); throw new Error('boom'); });
    bus.on('test', () => calls.push(2));
    expect(() => bus.emit('test', { value: 1 })).toThrow();
    expect(calls).toEqual([1, 2]);
  });
});
```

### 12.3 压力测试

```typescript
describe('TypedEventBus - performance', () => {
  it('should handle 100k subscribers', () => {
    const bus = new TypedEventBus<{ test: { n: number } }>();
    const handlers = Array.from({ length: 100000 }, (_, i) => vi.fn());
    handlers.forEach((h) => bus.on('test', h));

    const start = performance.now();
    bus.emit('test', { n: 1 });
    const duration = performance.now() - start;

    handlers.forEach((h) => expect(h).toHaveBeenCalled());
    expect(duration).toBeLessThan(100);  // < 100ms
  });
});
```

## 13. 设计决策记录

### 13.1 为什么用 Map 而非对象作为订阅表

| 维度 | `Map<keyof Events, Set<Function>>` | `Record<keyof Events, Set<Function>>` |
| ---- | ---------------------------------- | ------------------------------------- |
| 键类型 | 任意（含 symbol） | 仅 string/number |
| 原型污染 | 无 | 有（`__proto__` 等） |
| 迭代顺序 | 插入顺序 | 非确定（数字键升序 + 字符串键插入序） |
| 性能（V8） | 优化为 hash table | 优化为 hidden class |
| 删除 | `delete` 后无副作用 | `delete` 留下 hole，可能退 hidden class |

Map 是更安全的选择。

### 13.2 为什么用 Set 而非 Array 存储订阅者

| 维度 | `Set<Function>` | `Function[]` |
| ---- | --------------- | ------------ |
| 去重 | 自动 | 手动 |
| 删除 | $O(1)$ | $O(n)$ |
| 迭代 | 稳定插入序 | 数组序 |
| 排序 | 不支持 | 支持（priority 需求） |

对于带 priority 的版本必须用 Array。基础版本用 Set 即可。

### 13.3 为什么 emit 中复制订阅者数组

避免迭代过程中订阅者调用 unsubscribe 导致迭代器失效。复制后即使原数组变化也不影响当前 emit。

### 13.4 为什么默认抛 AggregateError 而非吞错

聚合错误保证所有订阅者都执行后错误不被丢失，便于上层捕获与日志。Node.js 12+ 与所有现代浏览器原生支持 `AggregateError`。

## 14. 参考资料

### 14.1 经典论文

1. Gamma, E., Helm, R., Johnson, R., & Vlissides, J. (1994). *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley. DOI: 10.5555/186897
2. Bainomugisha, E., Carreton, A. L., Cutsem, T. V., Mostinckx, S., & Meuter, W. D. (2013). *A Survey on Reactive Programming*. ACM Computing Surveys, 45(4), 1-34. DOI: 10.1145/2501654.2501666
3. Elliott, C., & Hudak, P. (1997). *Functional Reactive Animation*. ACM SIGPLAN Notices, 32(8), 263-273. DOI: 10.1145/258949.258973
4. Bierman, G. M., Abadi, M., & Torgersen, M. (2014). *Understanding TypeScript*. ECOOP 2014, 257-281. DOI: 10.1007/978-3-662-44202-9_11
5. Cardelli, L., & Martini, S. (1992). *An Extension of System F with Subtyping*. Information and Computation, 109(1-2), 4-56. DOI: 10.1016/0890-5401(92)90018-G

### 14.2 类型论基础

6. Pierce, B. C. (2002). *Types and Programming Languages*. MIT Press. ISBN: 978-0-262-16209-8
7. Salvaneschi, G., & Mezini, M. (2014). *Towards a Theory of Refactoring for Reactive Programming*. arXiv:1409.5441. DOI: 10.48550/arXiv.1409.5441

### 14.3 官方文档

8. Microsoft. (2024). *TypeScript Handbook: Conditional Types*. https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
9. Node.js Foundation. (2024). *Node.js EventEmitter Documentation*. https://nodejs.org/api/events.html
10. Microsoft. (2024). *VS Code Emitter API Reference*. https://code.visualstudio.com/api/references/vscode-api#EventEmitter
11. Reactive Extensions Team. (2024). *RxJS Subject Documentation*. https://rxjs.dev/guide/subject

### 14.4 规范与标准

12. Ecma International. (2024). *ECMAScript 2024 Language Specification (ECMA-262 15th Edition)*. https://tc39.es/ecma262/
13. Jeffrey, A. (1998). *A Distributed Object-Oriented Calculus with Subtyping*. Electronic Notes in Theoretical Computer Science, 16(1), 47-72. DOI: 10.1016/S1571-0661(04)00054-3
14. Okasaki, C. (1999). *Purely Functional Data Structures*. Cambridge University Press. ISBN: 978-0-521-66350-2

## 15. 延伸阅读

### 15.1 书籍

- Pierce, B. C. *Types and Programming Languages*（第 11 章 Subtyping）
- Freeman, E., Robson, E. *Head First Design Patterns*（观察者模式章节）
- Bainomugisha, E. et al. *A Survey on Reactive Programming*（响应式编程综述）

### 15.2 论文

- Salvaneschi, G., et al. (2014). *Towards a Theory of Refactoring for Reactive Programming*
- Jeffrey, A. (1998). *A Distributed Object-Oriented Calculus with Subtyping*

### 15.3 开源项目

- [mitt](https://github.com/developit/mitt)：200 字节的极简事件总线
- [tiny-emitter](https://github.com/scottcorgan/tiny-emitter)：轻量级事件发射器
- [eventemitter3](https://github.com/primus/eventemitter3)：高性能 Node.js EventEmitter 替代
- [typed-emitter](https://github.com/andywer/typed-emitter)：TypeScript 类型安全 EventEmitter 包装器
- [Effect-Ts PubSub](https://effect.website/docs/infra/pubsub)：Schema 驱动的事件总线

### 15.4 在线资源

- TypeScript Handbook: [Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- TypeScript Handbook: [Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- MDN: [EventTarget](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget)
- MDN: [AggregateError](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError)

### 15.5 视频课程

- MIT 6.5810: Software Construction - [Lecture on Events and Callbacks](https://ocw.mit.edu/)
- Stanford CS107: Programming Paradigms - [Event-Driven Programming](https://see.stanford.edu/Course/CS107)
- Cornell CS 3110: Data Structures and Functional Programming - [Reactive Programming](https://cs3110.github.io/textbook/)

## 16. 总结

类型安全的发布订阅系统是 TypeScript 工程实践中的核心基础设施。本模块从 GoF 经典观察者模式出发，系统梳理了：

1. **历史脉络**：从 Smalltalk-80 MVC 到现代 Effect-Ts PubSub 的演进路径。
2. **形式语义**：协变/逆变、EventMap 代数、Handler 类型推导规则。
3. **实现细节**：从基础 PubSub 到生产级 TypedEventBus（支持 priority、once、filter、namespace、async）。
4. **跨语言对比**：Node.js EventEmitter、RxJS Subject、VS Code Emitter、Haskell reactive-banana、Scala Akka 各自的类型安全边界。
5. **工程陷阱**：this 绑定、内存泄漏、事件顺序、错误冒泡、循环检测七大陷阱及修复方案。
6. **实践指导**：tsconfig 配置、项目结构、测试策略、性能优化、调试工具。
7. **案例研究**：VS Code 编辑器、React 状态管理、Redux、Cal.com、Effect-Ts 五个真实系统的事件设计。

核心设计原则：

- **EventMap 是单一类型参数**，所有接口类型都可从中推导；
- **strictFunctionTypes 是类型安全的硬性前提**，关闭后将失去 Handler 逆变保证；
- **emit 必须复制订阅者数组**，避免迭代中修改；
- **错误必须聚合后抛出**，保证所有订阅者执行且错误不丢失；
- **生产环境必须提供 Disposable 接口**，避免内存泄漏。

掌握类型安全发布订阅系统的设计与实现，是构建大型 TypeScript 应用（编辑器、IDE、状态管理库、分布式系统）的关键基础。后续模块将基于这一基础设施，探讨更高级的事件驱动架构（事件溯源、CQRS、Saga 模式）。
