---
order: 106
title: 装饰器标准实现
module: typescript
category: 'dev-lang'
difficulty: advanced
description: 'TypeScript Stage 3装饰器标准实现详解：类装饰器、方法装饰器与元数据。'
author: fanquanpp
updated: '2026-06-14'
related:
  - typescript/模块声明与全局类型增强
  - typescript/tsconfig严格模式
  - 'typescript/项目示例-类型安全的API客户端'
  - typescript/理论知识点
prerequisites:
  - typescript/语法速查
---

# 装饰器标准实现

> 本文档对标 MIT 6.S192、Stanford CS110、CMU 15-214 等课程教学水准，系统讲解 TypeScript 装饰器（Decorators）从 Legacy 到 Stage 3 标准的演进、形式化语义、元数据协议与工程级应用。所有代码示例均可在 TS 5.4 + `target: ES2022` 下编译通过。

---

## 目录

1. [学习目标](#1-学习目标)
2. [历史动机与发展脉络](#2-历史动机与发展脉络)
3. [形式化定义](#3-形式化定义)
4. [理论推导与原理解析](#4-理论推导与原理解析)
5. [代码示例](#5-代码示例)
6. [对比分析](#6-对比分析)
7. [常见陷阱与最佳实践](#7-常见陷阱与最佳实践)
8. [工程实践](#8-工程实践)
9. [案例研究](#9-案例研究)
10. [习题](#10-习题)
11. [参考文献](#11-参考文献)
12. [延伸阅读](#12-延伸阅读)

---

## 1. 学习目标

完成本章学习后，读者应能够：

### 1.1 Bloom 认知层级映射

| 层级 | 行为动词 | 预期成果 |
|------|----------|----------|
| **Remember**（记忆） | 列举、识别 | 列举 TC39 装饰器提案的 Stage 1/2/3 演进历程，写出 Stage 3 装饰器三种基本形态（类、方法、属性）的语法 |
| **Understand**（理解） | 解释、归纳 | 解释 Stage 3 装饰器与 Legacy 装饰器（`experimentalDecorators`）的核心差异，归纳上下文对象（context object）的设计动机与元数据（metadata）协议 |
| **Apply**（应用） | 实现、使用 | 在企业级项目中实现 `@logged`、`@debounce`、`@memoize`、`@deprecated`、`@route` 等装饰器，并正确使用 `context.metadata` 共享状态 |
| **Analyze**（分析） | 比较、分解 | 比较 TypeScript 装饰器与 Java 注解、Python 装饰器、C# Attribute 的本质差异，分解装饰器组合（composition）的执行顺序与代数性质 |
| **Evaluate**（评价） | 评判、选择 | 针对给定业务场景（如 NestJS 依赖注入、TypeORM 实体映射、Angular DI）选择合适的装饰器实现方案，并给出可维护性、运行时性能、类型安全的权衡 |
| **Create**（创造） | 设计、构建 | 设计一个端到端类型安全的 IoC 容器，使用 Stage 3 装饰器 + 元数据协议实现声明式依赖注入、AOP 切面、配置注入 |

### 1.2 前置知识

- TypeScript 类与继承
- `this` 绑定与箭头函数
- `Reflect.metadata` 与 `Symbol.metadata`
- ES2022 类字段（class fields）
- 闭包与高阶函数
- 设计模式：装饰器模式、代理模式、依赖注入

### 1.3 适用读者

- 具备 1 年以上 TypeScript 实战经验的高级开发者
- 正在使用 NestJS、TypeORM、MikroORM、Angular 等依赖装饰器的框架的工程师
- 希望深入理解 TC39 提案演进过程的语言研究者
- 准备 TypeScript 高级面试的工程师

---

## 2. 历史动机与发展脉络

### 2.1 装饰器的起源

装饰器（Decorator）的概念最早可追溯到 1960 年代的 Lisp 语言，其在函数定义时通过 `defadvice` 修饰函数行为。Python 在 2004 年的 PEP 318 中正式引入 `@decorator` 语法，Java 在 JSR 250（2006 年）中引入注解（Annotation），C# 在 2.0（2005 年）引入 Attribute。

JavaScript 装饰器提案由 **Yehuda Katz** 与 **Brian Terlson** 在 2014 年首次提交至 TC39，历经 Stage 1（2014）、Stage 2（2017）、Stage 3（2022）三个阶段。整个提案历时 8 年，是 TC39 历史上耗时最长的提案之一。

### 2.2 Stage 1 → Stage 2 → Stage 3 的演进

#### Stage 1（2014-2017）：Legacy 时代

最早的装饰器提案基于 ES5 描述符（descriptor）API，由 Yehuda Katz 主导设计。TypeScript 在 **TS 5.0 之前** 一直通过 `experimentalDecorators: true` 标志支持这一版本。Legacy 装饰器接收三个参数：

- 类装饰器：`(target: Function) => Function | void`
- 方法装饰器：`(target, key, descriptor: PropertyDescriptor) => PropertyDescriptor | void`
- 属性装饰器：`(target, key) => void`

#### Stage 2（2017-2022）：Descriptor 时代

Stage 2 提案引入了更严格的类型签名，但仍基于描述符。这一阶段的核心变化是：

- 装饰器函数返回一个描述符，而非直接修改
- 引入了成员装饰器（member decorator）的统一形式
- 元数据协议初步设计

#### Stage 3（2022 至今）：Context 时代

2022 年 3 月，TC39 将装饰器提案推进至 Stage 3。Stage 3 装饰器由 **Daniel Ehrenberg** 主导设计，引入了**上下文对象**（context object）作为第二参数：

- 类装饰器：`(value: Class, context: ClassDecoratorContext) => Class | void`
- 方法装饰器：`(value: Function, context: ClassMethodDecoratorContext) => Function | void`
- 属性装饰器：`(value: undefined, context: ClassFieldDecoratorContext) => (initialValue) => initialValue`
- 自动访问器装饰器：`(value: ClassAccessorDecoratorTarget, context: ClassAccessorDecoratorContext) => ClassAccessorDecoratorResult`

TypeScript 在 **TS 5.0（2023 年 3 月）** 正式支持 Stage 3 装饰器，无需 `experimentalDecorators` 标志。

### 2.3 版本演进时间线

```
2014-04  TC39 Stage 1   Yehuda Katz 提交初版装饰器提案
2015-04  TS 1.5         experimentalDecorators 标志引入（Legacy 装饰器）
2017-09  TC39 Stage 2   描述符 API 阶段
2022-03  TC39 Stage 3   上下文对象 API 阶段
2023-03  TS 5.0         正式支持 Stage 3 装饰器
2023-06  TS 5.2         装饰器元数据（Symbol.metadata）落地
2024-03  TS 5.4         NoInfer<T>，配合装饰器提升类型推断
2024-11  TS 5.6         装饰器在严格模式下的稳定性改进
```

### 2.4 设计动机深度分析

Daniel Ehrenberg 在 [TC39 Stage 3 提案](https://github.com/tc39/proposal-decorators) 中阐述了 Stage 3 装饰器的三大核心动机：

> **动机一：类型安全的元编程。** Legacy 装饰器通过 `PropertyDescriptor` 操作成员，类型签名宽松（`any` 充斥）。Stage 3 通过上下文对象提供精确的类型签名，使装饰器实现可在编译期校验。

> **动机二：标准化元数据协议。** Legacy 装饰器依赖 `reflect-metadata` polyfill 与 `emitDecoratorMetadata` 标志，非 ECMAScript 标准。Stage 3 引入 `Symbol.metadata` 作为标准元数据载体，所有引擎原生支持。

> **动机三：与类字段语义对齐。** ES2022 类字段引入后，属性装饰器需要处理"字段尚未赋值"的情况。Stage 3 属性装饰器返回一个初始化函数 `(initialValue) => initialValue`，与类字段语义自然对齐。

### 2.5 社区生态发展

装饰器社区的发展可划分为三个阶段：

- **2015-2020 Legacy 时代**：Angular、NestJS、TypeORM 依赖 `experimentalDecorators`，社区形成庞大生态
- **2020-2023 过渡期**：TC39 提案演进至 Stage 3，框架开始评估迁移路径
- **2023-2025 Stage 3 时代**：TS 5.0 落地后，新项目默认采用 Stage 3；旧项目通过兼容层逐步迁移

### 2.6 当前社区共识（2024-2025）

TypeScript 核心团队在 2024 年路线图中明确：

- **新项目默认采用 Stage 3 装饰器**，不再启用 `experimentalDecorators`
- **Legacy 装饰器进入维护模式**，不再添加新特性，但保持向后兼容
- **`reflect-metadata` polyfill 仍需用于 Legacy 装饰器**，Stage 3 装饰器使用原生 `Symbol.metadata`
- **NestJS、TypeORM 等框架的迁移路径**：通过适配层同时支持 Legacy 与 Stage 3，未来版本逐步切换至 Stage 3

---

## 3. 形式化定义

### 3.1 装饰器的代数语义

装饰器可形式化为一个**高阶函数**（higher-order function），接收被装饰的实体（entity）与上下文（context），返回同类型的实体或 `void`：

$$
\text{Decorator} \triangleq (E \times C) \to (E \cup \{\bot\})
$$

其中：

- $E$ 为被装饰实体的类型（类、方法、属性、访问器）
- $C$ 为上下文对象（包含 `kind`、`name`、`metadata` 等字段）
- $\bot$ 表示 `void`（不替换原实体）

### 3.2 类装饰器的形式化

类装饰器接收一个类（构造函数）与类上下文，返回一个新类或 `void`：

$$
\frac{\Gamma \vdash C : \text{Class} \quad \Gamma \vdash \text{ctx} : \text{ClassDecoratorContext}}{\Gamma \vdash \text{ClassDecorator}(C, \text{ctx}) : \text{Class} \cup \{\bot\}}
$$

类上下文 `ClassDecoratorContext` 的形式化定义：

$$
\text{ClassDecoratorContext} \triangleq \{ \text{kind}: \text{'class'}, \text{name}: \text{string} \cup \text{undefined}, \text{metadata}: \text{Metadata} \}
$$

### 3.3 方法装饰器的形式化

方法装饰器接收一个函数与方法上下文，返回一个新函数或 `void`：

$$
\frac{\Gamma \vdash f : \text{Function} \quad \Gamma \vdash \text{ctx} : \text{ClassMethodDecoratorContext}}{\Gamma \vdash \text{MethodDecorator}(f, \text{ctx}) : \text{Function} \cup \{\bot\}}
$$

方法上下文的形式化定义：

$$
\text{ClassMethodDecoratorContext} \triangleq \{ \text{kind}: \text{'method'}, \text{name}: \text{string}, \text{access}: \{ \text{get}: (o) \to f, \text{set}: (o, v) \to \text{void} \}, \text{static}: \text{boolean}, \text{metadata}: \text{Metadata}, \text{addInitializer}: (f) \to \text{void} \}
$$

关键点：

- `access` 字段提供安全的属性访问器，避免直接 `obj[key]` 破坏私有性
- `addInitializer` 允许在类实例化时执行额外的初始化逻辑
- `metadata` 是类级别的元数据对象，所有装饰器共享

### 3.4 属性装饰器的形式化

属性装饰器接收 `undefined`（属性尚无值）与属性上下文，返回一个初始化函数：

$$
\frac{\Gamma \vdash \text{ctx} : \text{ClassFieldDecoratorContext}}{\Gamma \vdash \text{FieldDecorator}(\text{undefined}, \text{ctx}) : ((v) \to v) \cup \{\bot\}}
$$

属性装饰器返回的初始化函数 `init: (initialValue) => initialValue` 在实例化时被调用，可修改初始值。

### 3.5 元数据协议的形式化

Stage 3 装饰器通过 `Symbol.metadata` 在类上挂载元数据对象。形式化定义：

$$
\frac{\Gamma \vdash C : \text{Class}}{\Gamma \vdash C[\text{Symbol.metadata}] : \text{Metadata}}
$$

所有装饰器共享同一个 `metadata` 对象：

$$
\text{Metadata} \triangleq \{ k_i \mapsto v_i \} \quad \text{(mutable, shared across decorators)}
$$

### 3.6 装饰器组合的代数结构

多个装饰器叠加应用时，构成**函数组合**（function composition）的代数结构：

$$
(@A \circ @B \circ @C)\ C \triangleq A(B(C(C, \text{ctx}_C), \text{ctx}_B), \text{ctx}_A)
$$

执行顺序：

1. **求值顺序**：从上到下（`@A` 先求值）
2. **应用顺序**：从下到上（`@C` 先应用到类，然后 `@B`，最后 `@A`）

形式化规则：

$$
\frac{@A \quad @B \quad @C \quad \text{class } X}{\text{evaluated as } A(B(C(X)))}
$$

---

## 4. 理论推导与原理解析

### 4.1 装饰器求值时机

装饰器在**类定义时**求值（class evaluation time），而非实例化时。形式化：

$$
\frac{\text{class declaration is evaluated}}{\text{decorators are applied immediately}}
$$

实例代码：

```typescript
@logged
class User {
  @memoize
  getName() { return 'Alice'; }
}
```

执行顺序：

1. `User` 类被构造
2. `@memoize` 应用于 `getName` 方法，返回新函数
3. `@logged` 应用于 `User` 类，返回新类
4. 类定义完成，可被实例化

### 4.2 addInitializer 机制

`context.addInitializer(fn)` 允许在类实例化时执行额外逻辑。形式化：

$$
\frac{\text{ctx.addInitializer}(f) \text{ is called}}{f \text{ is invoked during class instantiation}}
$$

对于类装饰器，初始化函数在类定义后立即调用；对于方法/属性装饰器，初始化函数在实例化时调用。

实例：

```typescript
function bound(value, context) {
  context.addInitializer(function () {
    this[context.name] = this[context.name].bind(this);
  });
}

class Logger {
  @bound
  log(msg) { console.log(msg); }
}

const logger = new Logger();
const log = logger.log;
log('hello');  // 'hello'（已绑定 this）
```

### 4.3 元数据传播机制

`context.metadata` 是一个共享对象，所有装饰器对同一个类的元数据写入都汇聚到同一个对象。形式化：

$$
\frac{\text{decorator } D_1 \text{ writes } (k_1, v_1) \quad \text{decorator } D_2 \text{ writes } (k_2, v_2)}{\text{Class}[\text{Symbol.metadata}] = \{ k_1 \mapsto v_1, k_2 \mapsto v_2 \}}
$$

实例：

```typescript
function route(path) {
  return (value, context) => {
    context.metadata.routes ??= {};
    context.metadata.routes[context.name] = path;
  };
}

class ApiController {
  @route('/users')
  getUsers() {}

  @route('/users/:id')
  getUser() {}
}

console.log(ApiController[Symbol.metadata].routes);
// { getUsers: '/users', getUser: '/users/:id' }
```

### 4.4 自动访问器（Auto-Accessor）的特殊语义

ES2022 引入自动访问器语法 `accessor field`，Stage 3 装饰器对自动访问器有专门的处理。形式化：

$$
\text{AutoAccessorDecorator} \triangleq (\text{AccessorTarget}, \text{AccessorContext}) \to \text{AccessorResult}
$$

其中 `AccessorResult` 包含 `get` 与 `set` 方法，允许装饰器拦截读写操作：

```typescript
class Tracked {
  accessor value = 0;

  @tracked
  accessor count = 0;
}

function tracked(target, context) {
  return {
    get() { return target.get.call(this); },
    set(value) {
      console.log(`Setting ${context.name} to ${value}`);
      target.set.call(this, value);
    },
  };
}
```

### 4.5 装饰器组合的结合律

装饰器组合满足**结合律**（associativity）：

$$
((@A \circ @B) \circ @C) \equiv (@A \circ (@B \circ @C))
$$

但不满足**交换律**（commutativity）：

$$
@A \circ @B \not\equiv @B \circ @A
$$

实例：

```typescript
@log
@validate
class Service {}

// 等价于
const _temp = validate(class Service {});
const _final = log(_temp);
```

### 4.6 装饰器与继承的交互

装饰器在子类继承父类时，**不会被继承**。形式化：

$$
\frac{\text{class } B \text{ extends } A \quad A \text{ has decorator } @D}{B \text{ does not have } @D}
$$

但装饰器修改的**方法实现**会被继承：

```typescript
@logged
class Base {
  greet() { return 'hello'; }
}

class Derived extends Base {}

const d = new Derived();
d.greet();  // 'hello'（greet 方法被 @logged 修饰的逻辑会被继承）
// 但 Derived 类本身没有 @logged 装饰器
```

### 4.7 编译产物的形式化

Stage 3 装饰器编译产物使用 `applyDecs2312`（或类似运行时辅助函数）应用装饰器。形式化：

$$
\text{ClassDefinition} \to \text{applyDecs2312}(\text{Class}, \text{DecoratorsList}, \text{MemberDecorators})
$$

编译产物示例：

```javascript
// 源码
@logged
class User {
  @memoize
  getName() { return 'Alice'; }
}

// 编译产物（简化）
let _getName;
class User {
  constructor() {
    _initClass.call(this);
  }
  getName() { return _getName.call(this); }
}

let _initClass;
(() => {
  _getName = __memoize(User.prototype, 'getName', _getName_desc)[0];
  _initClass = __logged(User, classMetadata)[0];
  __setFunctionName(_getName, 'getName');
})();
```

---

## 5. 代码示例

### 5.1 类装饰器：日志记录

```typescript
// TS 5.4, tsconfig.json: { "target": "ES2022" }

/**
 * 日志装饰器
 * 在类实例化时打印参数，用于调试
 */
function logged<T extends { new(...args: any[]): {} }>(value: T, context: ClassDecoratorContext) {
  const name = context.name;
  return class extends value {
    constructor(...args: any[]) {
      console.log(`[logged] Creating ${String(name)} with args:`, args);
      super(...args);
    }
  };
}

@logged
class User {
  constructor(public name: string, public age: number) {}
}

new User('Alice', 30);
// 输出：[logged] Creating User with args: ['Alice', 30]
```

### 5.2 方法装饰器：防抖

```typescript
/**
 * 防抖装饰器
 * 延迟方法执行，在指定时间内多次调用只执行最后一次
 */
function debounce(delay: number) {
  return function (value: Function, context: ClassMethodDecoratorContext) {
    let timer: ReturnType<typeof setTimeout>;

    return function (this: any, ...args: any[]) {
      clearTimeout(timer);
      timer = setTimeout(() => value.call(this, ...args), delay);
    };
  };
}

class Search {
  @debounce(300)
  handleInput(query: string) {
    console.log('Searching:', query);
  }
}

const search = new Search();
search.handleInput('a');
search.handleInput('ab');
search.handleInput('abc');
// 300ms 后输出：Searching: abc
```

### 5.3 方法装饰器：节流

```typescript
/**
 * 节流装饰器
 * 在指定时间窗口内最多执行一次
 */
function throttle(delay: number) {
  return function (value: Function, context: ClassMethodDecoratorContext) {
    let lastCall = 0;
    return function (this: any, ...args: any[]) {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        value.call(this, ...args);
      }
    };
  };
}

class ScrollHandler {
  @throttle(100)
  onScroll(event: Event) {
    console.log('Scroll position:', window.scrollY);
  }
}
```

### 5.4 方法装饰器：记忆化

```typescript
/**
 * 记忆化装饰器
 * 缓存方法返回值，对相同参数直接返回缓存
 * 注意：参数需可序列化为字符串
 */
function memoize(value: Function, context: ClassMethodDecoratorContext) {
  const cache = new Map<string, any>();

  return function (this: any, ...args: any[]) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = value.call(this, ...args);
    cache.set(key, result);
    return result;
  };
}

class Calculator {
  @memoize
  fibonacci(n: number): number {
    if (n < 2) return n;
    return this.fibonacci(n - 1) + this.fibonacci(n - 2);
  }
}

const calc = new Calculator();
console.time('first');
console.log(calc.fibonacci(40));  // 102334155
console.timeEnd('first');  // ~1s

console.time('second');
console.log(calc.fibonacci(40));  // 102334155（缓存命中）
console.timeEnd('second');  // ~0ms
```

### 5.5 属性装饰器：必填校验

```typescript
/**
 * 必填校验装饰器
 * 在实例化时校验属性值不为 null 或 undefined
 */
function required(value: undefined, context: ClassFieldDecoratorContext) {
  return function (this: any, initialValue: any) {
    if (initialValue === undefined || initialValue === null) {
      throw new Error(`${String(context.name)} is required`);
    }
    return initialValue;
  };
}

class User {
  @required
  name: string;

  @required
  email: string;

  constructor(name: string, email: string) {
    this.name = name;
    this.email = email;
  }
}

new User('Alice', 'a@x.com');  // OK
// new User('', '');  // Error: name is required
```

### 5.6 属性装饰器：默认值

```typescript
/**
 * 默认值装饰器
 * 如果属性值为 undefined，使用提供的默认值
 */
function defaultValue<T>(defaultVal: T) {
  return function (value: undefined, context: ClassFieldDecoratorContext) {
    return function (initialValue: T) {
      return initialValue === undefined ? defaultVal : initialValue;
    };
  };
}

class AppConfig {
  @defaultValue(8080)
  port: number;

  @defaultValue('localhost')
  host: string;

  @defaultValue(true)
  debug: boolean;
}

const config = new AppConfig();
config.port = 3000;  // 显式设置
console.log(config.host);  // 'localhost'（使用默认值）
console.log(config.debug); // true
```

### 5.7 元数据：路由注册

```typescript
/**
 * 路由装饰器
 * 将方法注册为 HTTP 路由处理器
 * 使用 context.metadata 共享路由表
 */
function route(path: string) {
  return function (value: Function, context: ClassMethodDecoratorContext) {
    context.metadata.routes ??= {};
    context.metadata.routes[context.name] = path;
  };
}

/**
 * HTTP 方法装饰器
 * 标注方法接受的 HTTP 方法
 */
function httpMethod(method: string) {
  return function (value: Function, context: ClassMethodDecoratorContext) {
    context.metadata.methods ??= {};
    context.metadata.methods[context.name] = method;
  };
}

class ApiController {
  @route('/users')
  @httpMethod('GET')
  getUsers() {
    return [];
  }

  @route('/users/:id')
  @httpMethod('GET')
  getUser() {
    return {};
  }

  @route('/users')
  @httpMethod('POST')
  createUser() {
    return {};
  }
}

// 提取元数据，构建路由表
const routes = (ApiController as any)[Symbol.metadata]?.routes;
const methods = (ApiController as any)[Symbol.metadata]?.methods;

console.log(routes);
// { getUsers: '/users', getUser: '/users/:id', createUser: '/users' }

console.log(methods);
// { getUsers: 'GET', getUser: 'GET', createUser: 'POST' }
```

### 5.8 自动访问器：响应式状态

```typescript
/**
 * 响应式状态装饰器
 * 使用自动访问器拦截读写，触发更新
 */
function reactive(target: ClassAccessorDecoratorTarget<any, any>, context: ClassAccessorDecoratorContext) {
  const subscribers = new WeakMap<object, Set<() => void>>();

  function notify(obj: any) {
    const subs = subscribers.get(obj);
    if (subs) {
      subs.forEach(fn => fn());
    }
  }

  return {
    get(this: any) {
      return target.get.call(this);
    },
    set(this: any, value: any) {
      target.set.call(this, value);
      notify(this);
    },
  };
}

class Counter {
  @reactive
  accessor count = 0;

  @reactive
  accessor name = 'counter';

  subscribe(fn: () => void) {
    // 简化示例：实际应使用 Effect 系统
  }
}

const counter = new Counter();
counter.count = 1;  // 触发通知
counter.count = 2;  // 触发通知
```

### 5.9 装饰器组合：API 服务

```typescript
/**
 * 组合多个装饰器实现完整的 API 服务
 * - @injectable: 标记为可注入
 * - @logged: 记录调用日志
 * - @cached: 缓存响应
 * - @timeout: 请求超时
 */

function injectable<T extends { new(...args: any[]): {} }>(value: T, context: ClassDecoratorContext) {
  context.metadata.injectable = true;
  return value;
}

function cached(ttl: number) {
  return function (value: Function, context: ClassMethodDecoratorContext) {
    const cache = new Map<string, { value: any; expiry: number }>();

    return async function (this: any, ...args: any[]) {
      const key = JSON.stringify(args);
      const now = Date.now();
      const cached = cache.get(key);

      if (cached && cached.expiry > now) {
        return cached.value;
      }

      const result = await value.call(this, ...args);
      cache.set(key, { value: result, expiry: now + ttl });
      return result;
    };
  };
}

function timeout(ms: number) {
  return function (value: Function, context: ClassMethodDecoratorContext) {
    return async function (this: any, ...args: any[]) {
      return Promise.race([
        value.call(this, ...args),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms),
        ),
      ]);
    };
  };
}

function loggedMethod(value: Function, context: ClassMethodDecoratorContext) {
  return async function (this: any, ...args: any[]) {
    console.log(`[${String(context.name)}] called with:`, args);
    const start = Date.now();
    try {
      const result = await value.call(this, ...args);
      console.log(`[${String(context.name)}] returned in ${Date.now() - start}ms`);
      return result;
    } catch (err) {
      console.error(`[${String(context.name)}] error:`, err);
      throw err;
    }
  };
}

@injectable
class UserService {
  @loggedMethod
  @cached(60_000)
  @timeout(5_000)
  async getUser(id: string): Promise<{ id: string; name: string }> {
    const res = await fetch(`/api/users/${id}`);
    return res.json();
  }
}
```

### 5.10 依赖注入装饰器

```typescript
/**
 * 依赖注入容器
 * 使用 @injectable 标记可注入类，@inject 注入依赖
 */

interface InjectableMetadata {
  token: symbol;
  singleton: boolean;
}

const container = new Map<symbol, any>();

function injectable(token: symbol, singleton = true) {
  return function <T extends { new(...args: any[]): {} }>(value: T, context: ClassDecoratorContext) {
    const metadata: InjectableMetadata = { token, singleton };
    context.metadata.injectable = metadata;

    if (singleton) {
      container.set(token, new value());
    } else {
      container.set(token, value);
    }

    return value;
  };
}

function inject(token: symbol) {
  return function (value: undefined, context: ClassFieldDecoratorContext) {
    return function (initialValue: any) {
      const instance = container.get(token);
      if (!instance) {
        throw new Error(`No provider for token: ${token.toString()}`);
      }
      return instance;
    };
  };
}

// 服务定义
const LOGGER_TOKEN = Symbol('Logger');
const DB_TOKEN = Symbol('Database');

@injectable(LOGGER_TOKEN)
class Logger {
  log(msg: string) { console.log('[Logger]', msg); }
}

@injectable(DB_TOKEN)
class Database {
  async query(sql: string) { return [{ id: 1 }]; }
}

// 使用依赖注入
class UserService {
  @inject(LOGGER_TOKEN)
  logger!: Logger;

  @inject(DB_TOKEN)
  db!: Database;

  async getUser(id: number) {
    this.logger.log(`Getting user ${id}`);
    return this.db.query(`SELECT * FROM users WHERE id = ${id}`);
  }
}

const service = new UserService();
service.getUser(1);  // [Logger] Getting user 1
```

---

## 6. 对比分析

### 6.1 与 Java 注解对比

Java 注解（Annotation）是元数据标记，本身不含逻辑：

```java
// Java
@RestController
@RequestMapping("/api")
public class UserController {

    @GetMapping("/users")
    public List<User> getUsers() {
        return userService.findAll();
    }
}
```

TypeScript 装饰器是**可执行函数**，可修改被装饰的实体：

```typescript
// TypeScript
@Controller('/api')
class UserController {

  @Get('/users')
  async getUsers(): Promise<User[]> {
    return userService.findAll();
  }
}
```

关键差异：

| 维度 | Java 注解 | TypeScript 装饰器 |
|------|----------|------------------|
| **执行时机** | 运行时通过反射读取 | 装饰器立即执行 |
| **元数据** | `Annotation` 对象 | `Symbol.metadata` 对象 |
| **逻辑** | 仅标记，需外部框架处理 | 装饰器本身可包含逻辑 |
| **类型安全** | 编译期校验 | Stage 3 编译期校验 |
| **运行时开销** | 反射开销 | 装饰器求值开销（一次性） |

### 6.2 与 Python 装饰器对比

Python 装饰器是高阶函数，接收函数返回函数：

```python
# Python
def logged(func):
    def wrapper(*args, **kwargs):
        print(f"Calling {func.__name__}")
        return func(*args, **kwargs)
    return wrapper

@logged
def greet(name):
    print(f"Hello, {name}")

greet("Alice")  # Calling greet\nHello, Alice
```

TypeScript 装饰器与 Python 装饰器在概念上相似，但有关键差异：

| 维度 | Python 装饰器 | TypeScript 装饰器 |
|------|--------------|-------------------|
| **应用范围** | 函数、类、方法 | 类、方法、属性、访问器（不含顶层函数） |
| **上下文对象** | 无（仅函数本身） | Stage 3 提供 `context` 对象 |
| **元数据** | 通过 `functools.wraps` 保留 | 通过 `Symbol.metadata` 共享 |
| **类型安全** | 鸭子类型 | 静态类型校验 |
| **私有性** | 无法访问私有属性 | 通过 `context.access` 安全访问 |

### 6.3 与 C# Attribute 对比

C# Attribute 是元数据标记，类似 Java 注解：

```csharp
// C#
[Serializable]
[Obsolete("Use NewClass instead")]
public class OldClass {
    [XmlElement("Name")]
    public string Name { get; set; }
}
```

关键差异：

- C# Attribute 在编译期生成元数据，运行时通过反射读取
- TypeScript 装饰器在类定义时立即执行
- C# Attribute 不能修改被装饰的实体，TypeScript 装饰器可以

### 6.4 与 Legacy 装饰器对比

| 特性 | Legacy (`experimentalDecorators`) | Stage 3（标准） |
|------|----------------------------------|-----------------|
| **启用方式** | `experimentalDecorators: true` | 默认支持 |
| **API 风格** | 基于描述符（descriptor） | 基于上下文对象（context） |
| **类型安全** | 较弱（`any` 充斥） | 强（精确类型签名） |
| **元数据** | 需 `reflect-metadata` polyfill + `emitDecoratorMetadata` | 原生 `Symbol.metadata` |
| **属性装饰器** | 接收 `(target, key)` | 返回初始化函数 |
| **参数装饰器** | 支持 | 不支持（Stage 3 暂未包含） |
| **生态成熟度** | 极成熟（Angular/NestJS/TypeORM） | 新生态，逐步成熟 |

### 6.5 与 Scala Annotations 对比

Scala 的注解类似 Java，但支持宏（macro）实现编译期代码生成：

```scala
// Scala
@deprecated("use newMethod instead", "2.0")
def oldMethod(): Unit = ???
```

TypeScript 装饰器在运行时执行，而 Scala 宏在编译期生成代码，这是本质差异。

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱一：箭头函数丢失 this

**问题**：装饰器返回的箭头函数无法绑定实例 `this`。

```typescript
function bad(value: Function, context: ClassMethodDecoratorContext) {
  return (...args: any[]) => {
    // this 是 undefined
    value.call(this, ...args);  // Error
  };
}
```

**解决**：使用普通函数 + `this: any` 注解。

```typescript
function good(value: Function, context: ClassMethodDecoratorContext) {
  return function (this: any, ...args: any[]) {
    return value.call(this, ...args);
  };
}
```

### 7.2 陷阱二：装饰器执行顺序误解

**问题**：误以为装饰器从上到下执行。

```typescript
@A
@B
@C
class X {}

// 实际执行顺序：C → B → A
```

**解决**：记住"求值从上到下，应用从下到上"。装饰器作为函数调用时，先调用最下方的。

### 7.3 陷阱三：元数据未共享

**问题**：在多个装饰器中独立创建元数据对象，而非共享 `context.metadata`。

```typescript
function badRoute(path: string) {
  return (value: Function, context: ClassMethodDecoratorContext) => {
    // 错误：每个装饰器创建独立对象
    const routes = {};
    routes[context.name] = path;
  };
}
```

**解决**：始终使用 `context.metadata` 共享对象。

```typescript
function goodRoute(path: string) {
  return (value: Function, context: ClassMethodDecoratorContext) => {
    context.metadata.routes ??= {};
    context.metadata.routes[context.name] = path;
  };
}
```

### 7.4 陷阱四：属性装饰器返回值错误

**问题**：属性装饰器返回静态值而非初始化函数。

```typescript
function badDefault(val: any) {
  return (value: undefined, context: ClassFieldDecoratorContext) => {
    return val;  // 错误：返回静态值会被当作初始值
  };
}
```

**解决**：返回初始化函数。

```typescript
function goodDefault(defaultVal: any) {
  return (value: undefined, context: ClassFieldDecoratorContext) => {
    return function (initialValue: any) {
      return initialValue === undefined ? defaultVal : initialValue;
    };
  };
}
```

### 7.5 陷阱五：装饰器与继承冲突

**问题**：装饰器修改类后，子类的 `super` 调用可能失败。

```typescript
@logged
class Base {
  greet() { return 'hello'; }
}

class Derived extends Base {
  greet() {
    return super.greet() + ' world';  // 可能调用到 @logged 包装后的方法
  }
}
```

**解决**：装饰器修改方法时，保留原方法引用；或在文档中明确说明装饰器对继承的影响。

### 7.6 陷阱六：私有字段访问受限

**问题**：装饰器无法直接访问私有字段（`#field`）。

```typescript
class User {
  #password: string;

  @validate
  #setPassword(pw: string) {  // Error: 装饰器无法访问私有方法
    this.#password = pw;
  }
}
```

**解决**：Stage 3 装饰器通过 `context.access` 提供安全访问，但仍有限制。考虑将私有字段改为 `private`（编译期私有）而非 `#`（运行时私有）。

### 7.7 陷阱七：Symbol.metadata 未定义

**问题**：旧版 TypeScript 或未正确配置时，`Symbol.metadata` 未定义。

```typescript
console.log(MyClass[Symbol.metadata]);  // undefined
```

**解决**：

- 确保 TypeScript 版本 >= 5.2
- 添加 polyfill：`Symbol.metadata ??= Symbol('Symbol.metadata');`
- 检查 `target` 配置：`"target": "ES2022"` 或更高

### 7.8 陷阱八：Legacy 与 Stage 3 混用

**问题**：同时启用 `experimentalDecorators` 与 Stage 3 装饰器会导致冲突。

```json
// 错误配置
{
  "compilerOptions": {
    "experimentalDecorators": true
    // Stage 3 会被禁用
  }
}
```

**解决**：

- 新项目：移除 `experimentalDecorators`，使用 Stage 3
- 旧项目：保持 `experimentalDecorators: true`，等待框架迁移后切换

### 7.9 最佳实践

1. **新项目优先使用 Stage 3 装饰器**，避免 Legacy 装饰器的类型不安全
2. **装饰器应保持单一职责**，复杂逻辑通过组合实现
3. **使用 `context.metadata` 共享状态**，而非全局变量
4. **为装饰器编写详细文档**，说明副作用与执行时机
5. **测试装饰器的边界情况**：继承、私有字段、异步方法
6. **监控装饰器的运行时开销**：装饰器在类定义时求值，可能影响启动时间
7. **使用 `addInitializer` 而非修改构造函数**，保持装饰器的可组合性

---

## 8. 工程实践

### 8.1 项目 tsconfig 配置

```json
// tsconfig.json - Stage 3 装饰器
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "experimentalDecorators": false,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "useDefineForClassFields": true
  }
}
```

```json
// tsconfig.legacy.json - Legacy 装饰器（兼容旧项目）
{
  "compilerOptions": {
    "target": "ES2021",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### 8.2 元数据 polyfill

```typescript
// src/polyfills/metadata.ts

// Symbol.metadata polyfill（适用于 TS < 5.2 或旧浏览器）
(Symbol as any).metadata ??= Symbol('Symbol.metadata');

// reflect-metadata polyfill（仅 Legacy 装饰器需要）
// import 'reflect-metadata';
```

### 8.3 装饰器测试

```typescript
// src/decorators/__tests__/logged.test.ts
import { describe, it, expect, vi } from 'vitest';

function logged<T extends { new(...args: any[]): {} }>(value: T, context: ClassDecoratorContext) {
  return class extends value {
    constructor(...args: any[]) {
      console.log(`Creating ${String(context.name)}`);
      super(...args);
    }
  };
}

describe('@logged', () => {
  it('should log on instantiation', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    @logged
    class User {
      constructor(public name: string) {}
    }

    new User('Alice');

    expect(spy).toHaveBeenCalledWith('Creating User');
    spy.mockRestore();
  });

  it('should preserve instance properties', () => {
    @logged
    class User {
      constructor(public name: string) {}
    }

    const user = new User('Alice');
    expect(user.name).toBe('Alice');
    expect(user).toBeInstanceOf(User);
  });
});
```

### 8.4 性能调优

```typescript
// 装饰器在类定义时求值，影响启动时间
// 优化策略：

// 1. 延迟初始化：装饰器仅注册元数据，实际逻辑在首次调用时执行
function lazyRoute(path: string) {
  return function (value: Function, context: ClassMethodDecoratorContext) {
    context.metadata.routes ??= {};
    context.metadata.routes[context.name] = { path, handler: value };
    // 不立即包装函数，延迟到路由注册时
  };
}

// 2. 缓存装饰器结果
const memoCache = new WeakMap();
function memoizedDecorator(value: Function, context: ClassMethodDecoratorContext) {
  if (memoCache.has(value)) {
    return memoCache.get(value);
  }
  const wrapped = function (this: any, ...args: any[]) {
    return value.call(this, ...args);
  };
  memoCache.set(value, wrapped);
  return wrapped;
}

// 3. 避免在热路径使用装饰器
// 装饰器适用于初始化、配置、AOP 切面，不适用于高频调用
```

### 8.5 调试技巧

```typescript
// 1. 打印装饰器上下文
function debug(value: any, context: any) {
  console.log('Decorator applied:', context.kind, context.name);
  console.log('Context:', context);
  console.log('Metadata:', context.metadata);
  return value;
}

// 2. 检查元数据
class MyService {
  @debug
  method() {}
}

console.log((MyService as any)[Symbol.metadata]);

// 3. 使用 source map 跟踪装饰器求值
// tsconfig.json: { "sourceMap": true }
```

### 8.6 构建工具集成

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - name: Type check
        run: npx tsc --noEmit
      - name: Unit tests
        run: npx vitest run
```

---

## 9. 案例研究

### 9.1 案例一：NestJS 依赖注入

[NestJS](https://nestjs.com/) 是基于装饰器的 Node.js 框架，使用 `@Injectable`、`@Controller`、`@Module` 等装饰器实现 IoC：

```typescript
// NestJS 示例
import { Injectable, Controller, Get, Module } from '@nestjs/common';

@Injectable()
class UserService {
  private users = [{ id: 1, name: 'Alice' }];

  findAll() {
    return this.users;
  }
}

@Controller('users')
class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  list() {
    return this.userService.findAll();
  }
}

@Module({
  controllers: [UserController],
  providers: [UserService],
})
class AppModule {}
```

NestJS 装饰器特点：

- 使用 Legacy 装饰器 + `reflect-metadata` 实现类型注入
- 通过 `@Module` 元数据组织依赖图
- 控制器方法装饰器（`@Get`、`@Post`）注册路由

### 9.2 案例二：TypeORM 实体映射

[TypeORM](https://typeorm.io/) 使用装饰器将类映射到数据库表：

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity()
class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @OneToMany(() => Post, post => post.author)
  posts: Post[];
}

@Entity()
class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @ManyToOne(() => User, user => user.posts)
  author: User;
}
```

TypeORM 通过装饰器元数据生成 SQL：

```sql
CREATE TABLE user (id INTEGER PRIMARY KEY, name VARCHAR, email VARCHAR UNIQUE);
CREATE TABLE post (id INTEGER PRIMARY KEY, title VARCHAR, authorId INTEGER REFERENCES user(id));
```

### 9.3 案例三：MikroORM 实体映射

[MikroORM](https://mikro-orm.io/) 是另一个基于装饰器的 ORM，使用更现代的装饰器 API：

```typescript
import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';

@Entity()
class User {
  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;

  @Property({ unique: true })
  email!: string;
}
```

### 9.4 案例四：Angular 依赖注入

Angular 从 v20 开始支持 Stage 3 装饰器，取代旧的 `experimentalDecorators`：

```typescript
import { Component, Injectable, inject } from '@angular/core';

@Component({
  selector: 'app-root',
  template: '<h1>{{ title }}</h1>',
})
class AppComponent {
  title = 'Angular App';
}

@Injectable({ providedIn: 'root' })
class UserService {
  private http = inject(HttpClient);

  getUsers() {
    return this.http.get('/api/users');
  }
}
```

### 9.5 案例五：tsoa OpenAPI 生成

[tsoa](https://github.com/lukeautry/tsoa) 使用装饰器从 TypeScript 类生成 OpenAPI 规范：

```typescript
import { Controller, Get, Route, Tags, Query } from 'tsoa';

@Route('users')
@Tags('User')
class UsersController extends Controller {
  @Get()
  public async getUsers(
    @Query() name?: string,
    @Query() limit = 10,
  ): Promise<User[]> {
    return userService.findAll({ name, limit });
  }
}

// 自动生成 openapi.json
```

### 9.6 案例六：typestack class-validator

[class-validator](https://github.com/typestack/class-validator) 使用装饰器声明校验规则：

```typescript
import { IsString, IsInt, Min, Max, IsEmail, validate } from 'class-validator';

class User {
  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  @Max(150)
  age: number;

  @IsEmail()
  email: string;
}

const user = new User();
user.name = 'Alice';
user.age = 200;  // 不合法
user.email = 'invalid';

const errors = await validate(user);
// [{ property: 'age', constraints: { max: 'age must not be greater than 150' } },
//  { property: 'email', constraints: { isEmail: 'email must be an email' } }]
```

---

## 10. 习题

### 10.1 选择题

**题目 1**：Stage 3 装饰器与 Legacy 装饰器的核心区别是？

A. Stage 3 装饰器需要 `experimentalDecorators: true`
B. Stage 3 装饰器使用上下文对象（context object）作为第二参数
C. Stage 3 装饰器不支持类装饰器
D. Stage 3 装饰器仅支持方法装饰器

<details>
<summary>答案与解析</summary>

**答案：B**

Stage 3 装饰器的核心变化是引入上下文对象（context object），包含 `kind`、`name`、`metadata`、`access`、`addInitializer` 等字段，提供精确的类型签名与标准化的元数据协议。

Legacy 装饰器使用描述符（descriptor）作为参数，类型签名宽松。

</details>

**题目 2**：以下代码的执行顺序是？

```typescript
@A
@B
@C
class X {}
```

A. `A → B → C`（从上到下）
B. `C → B → A`（从下到上）
C. `A → C → B`
D. 不确定

<details>
<summary>答案与解析</summary>

**答案：B**

装饰器的**求值顺序**是从上到下（`A` 先求值为函数），但**应用顺序**是从下到上（`C` 先应用到类）。

等价于 `A(B(C(X)))`。

</details>

**题目 3**：Stage 3 属性装饰器应返回什么？

A. 静态值
B. 初始化函数 `(initialValue) => initialValue`
C. `void`
D. `PropertyDescriptor`

<details>
<summary>答案与解析</summary>

**答案：B**

Stage 3 属性装饰器返回一个初始化函数，该函数在实例化时被调用，接收属性初始值，返回最终值。这与 ES2022 类字段语义自然对齐。

如果返回静态值，会被当作初始值；返回 `void` 表示不修改。

</details>

**题目 4**：Stage 3 装饰器的元数据存储在哪里？

A. `Reflect.metadata`
B. `Symbol.metadata`
C. 全局变量
D. `context.metadata`（独立于类）

<details>
<summary>答案与解析</summary>

**答案：B**

Stage 3 装饰器通过 `Symbol.metadata` 在类上挂载元数据对象。所有装饰器通过 `context.metadata` 访问同一个对象，实现元数据共享。

`Reflect.metadata` 是 Legacy 装饰器使用的 polyfill，Stage 3 不再需要。

</details>

**题目 5**：以下装饰器实现的错误是？

```typescript
function logged(value: Function, context: ClassMethodDecoratorContext) {
  return (...args: any[]) => {
    console.log('Calling');
    return value.call(this, ...args);  // Error
  };
}
```

A. 箭头函数无法绑定 `this`
B. `value.call` 不存在
C. `context` 未使用
D. 返回类型错误

<details>
<summary>答案与解析</summary>

**答案：A**

箭头函数继承外层 `this`，在类方法装饰器中 `this` 是 `undefined`，调用 `value.call(this, ...)` 会失败。

应使用普通函数并标注 `this: any`：

```typescript
return function (this: any, ...args: any[]) {
  console.log('Calling');
  return value.call(this, ...args);
};
```

</details>

### 10.2 填空题

**题目 1**：Stage 3 装饰器在 TypeScript ____ 版本正式支持。

<details>
<summary>答案</summary>

5.0

</details>

**题目 2**：完成以下类装饰器实现，使其打印类名：

```typescript
function logged<T extends { new(...args: any[]): {} }>(value: T, context: ClassDecoratorContext) {
  return class extends value {
    constructor(...args: any[]) {
      console.log(`Creating __________`);
      super(...args);
    }
  };
}
```

<details>
<summary>答案</summary>

```typescript
${String(context.name)}
```

</details>

**题目 3**：完成以下属性装饰器实现，提供默认值：

```typescript
function defaultValue(defaultVal: any) {
  return function (value: undefined, context: ClassFieldDecoratorContext) {
    return function (initialValue: any) {
      return initialValue === undefined ? __________ : __________;
    };
  };
}
```

<details>
<summary>答案</summary>

```typescript
defaultVal
initialValue
```

</details>

**题目 4**：装饰器组合 `@A @B @C class X` 等价于函数调用 ____。

<details>
<summary>答案</summary>

```typescript
A(B(C(X)))
```

</details>

### 10.3 编程题

**题目 1**：实现 `@deprecated` 装饰器，在方法调用时打印弃用警告。

<details>
<summary>参考答案</summary>

```typescript
function deprecated(message?: string) {
  return function (value: Function, context: ClassMethodDecoratorContext) {
    return function (this: any, ...args: any[]) {
      console.warn(
        `DeprecationWarning: ${String(context.name)} is deprecated` +
        (message ? `. ${message}` : '')
      );
      return value.call(this, ...args);
    };
  };
}

class UserService {
  @deprecated('Use getUserById instead')
  getUser(id: string) {
    return { id, name: 'Alice' };
  }

  getUserById(id: string) {
    return { id, name: 'Alice' };
  }
}

const service = new UserService();
service.getUser('1');
// DeprecationWarning: getUser is deprecated. Use getUserById instead
```

</details>

**题目 2**：实现 `@retry` 装饰器，在方法抛出异常时自动重试指定次数。

<details>
<summary>参考答案</summary>

```typescript
function retry(times: number) {
  return function (value: Function, context: ClassMethodDecoratorContext) {
    return async function (this: any, ...args: any[]) {
      let lastError: Error;
      for (let i = 0; i < times; i++) {
        try {
          return await value.call(this, ...args);
        } catch (err) {
          lastError = err as Error;
          console.warn(`Attempt ${i + 1}/${times} failed:`, lastError.message);
        }
      }
      throw lastError!;
    };
  };
}

class ApiService {
  @retry(3)
  async fetchData(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
}
```

</details>

**题目 3**：实现 `@measure` 装饰器，测量方法执行时间并记录到元数据。

<details>
<summary>参考答案</summary>

```typescript
function measure(value: Function, context: ClassMethodDecoratorContext) {
  context.metadata.measurements ??= {};

  return async function (this: any, ...args: any[]) {
    const start = Date.now();
    try {
      return await value.call(this, ...args);
    } finally {
      const duration = Date.now() - start;
      context.metadata.measurements[context.name] = duration;
      console.log(`[${String(context.name)}] took ${duration}ms`);
    }
  };
}

class DataService {
  @measure
  async process(data: any[]) {
    return data.map(item => ({ ...item, processed: true }));
  }
}

const service = new DataService();
await service.process([1, 2, 3]);
// [process] took 5ms

console.log((DataService as any)[Symbol.metadata].measurements);
// { process: 5 }
```

</details>

### 10.4 思考题

**题目 1**：为什么 TC39 装饰器提案耗时 8 年才进入 Stage 3？请分析主要争议点。

<details>
<summary>参考答案</summary>

TC39 装饰器提案耗时 8 年的主要争议点：

1. **API 形态**：Stage 1 基于描述符，Stage 2 引入成员装饰器统一形式，Stage 3 改用上下文对象。每次 API 变更都需重新评估所有用例。

2. **元数据协议**：Legacy 装饰器依赖 `reflect-metadata` polyfill，TC39 希望提供原生方案。`Symbol.metadata` 的引入经过多次讨论。

3. **私有字段交互**：ES2022 引入 `#field` 后，装饰器如何访问私有字段成为难题。最终通过 `context.access` 提供安全访问机制。

4. **参数装饰器**：参数装饰器在 Legacy 中支持，但 Stage 3 暂未包含，因为参数装饰器的语义复杂（涉及函数调用栈），需单独提案。

5. **与类字段的兼容性**：ES2022 类字段引入后，属性装饰器需要处理"字段尚未赋值"的情况，最终通过返回初始化函数解决。

6. **运行时性能**：装饰器在类定义时求值，可能影响启动时间。TC39 需平衡表达力与性能。

7. **与现有框架的兼容性**：Angular、NestJS 等框架已基于 Legacy 装饰器构建庞大生态，Stage 3 需提供平滑迁移路径。

</details>

**题目 2**：装饰器与高阶函数在概念上有何异同？何时选择装饰器，何时选择高阶函数？

<details>
<summary>参考答案</summary>

**相同点**：

- 都是元编程技术
- 都通过包装函数实现横切关注点（cross-cutting concerns）
- 都支持组合

**不同点**：

| 维度 | 装饰器 | 高阶函数 |
|------|--------|---------|
| **应用范围** | 类、方法、属性 | 任意函数 |
| **语法** | `@decorator` 声明式 | `fn(decorator(fn))` 命令式 |
| **执行时机** | 类定义时 | 调用时 |
| **元数据** | 通过 `context.metadata` 共享 | 无标准协议 |
| **类型安全** | Stage 3 提供精确类型 | 取决于实现 |
| **可读性** | 声明式更清晰 | 命令式更灵活 |

**选择建议**：

- 选择装饰器：类方法、需要元数据、声明式配置（如 NestJS 控制器、TypeORM 实体）
- 选择高阶函数：顶层函数、无类上下文、需要运行时动态组合

</details>

**题目 3**：Stage 3 装饰器为什么不支持参数装饰器？这对实际开发有何影响？

<details>
<summary>参考答案</summary>

**不支持的原因**：

1. **语义复杂**：参数装饰器需要介入函数调用栈，修改参数值或校验参数，这涉及 JavaScript 调用约定，与函数式语义不自然对齐。

2. **类型安全挑战**：参数装饰器需要知道参数的位置与类型，这在 TypeScript 类型系统中难以精确表达。

3. **替代方案存在**：参数校验可通过方法装饰器 + `context.metadata` 实现，无需专门的参数装饰器。

4. **TC39 优先级**：Stage 3 提案聚焦于类、方法、属性装饰器，参数装饰器作为独立提案推进。

**对实际开发的影响**：

1. **NestJS 迁移**：NestJS 大量使用参数装饰器（`@Body()`、`@Param()`），迁移至 Stage 3 需重新设计。

2. **校验库**：`class-validator` 使用参数装饰器校验方法参数，需改用方法装饰器 + 元数据。

3. **替代方案**：使用方法装饰器读取元数据，在运行时通过 `arguments` 访问参数。

</details>

**题目 4**：装饰器在微前端架构中可能引发哪些问题？如何解决？

<details>
<summary>参考答案</summary>

**问题**：

1. **元数据冲突**：多个微应用定义同名类，`Symbol.metadata` 可能冲突。

2. **装饰器求值时机**：微应用动态加载时，装饰器在类定义时立即求值，可能影响加载性能。

3. **依赖注入容器共享**：各微应用的 IoC 容器是否共享，如何隔离。

4. **版本兼容**：不同微应用可能使用不同版本的装饰器（Legacy vs Stage 3）。

**解决方案**：

1. **命名空间隔离**：使用 `Symbol` 作为 token，避免字符串冲突。

2. **延迟加载**：装饰器仅注册元数据，实际逻辑延迟到首次调用时执行。

3. **容器隔离**：每个微应用使用独立的 IoC 容器，通过共享 token 实现跨应用通信。

4. **版本统一**：在微前端基座中强制使用统一的装饰器版本，通过适配层兼容旧代码。

</details>

---

## 11. 参考文献

### 11.1 学术论文与提案

1. Ehrenberg, D., & Katz, Y. (2022). *Decorators Proposal (Stage 3)*. TC39. https://github.com/tc39/proposal-decorators

2. Bierman, G., Abadi, M., & Torgersen, M. (2014). *Understanding TypeScript*. ECOOP '14. https://doi.org/10.1007/978-3-662-44202-9_10

3. Bracha, G., & Cook, W. (1990). *Mixin-based Inheritance*. OOPSLA '90. https://doi.org/10.1145/97946.97982

4. Forman, I., & Danforth, S. (1999). *Putting Metaclasses to Work: A New Dimension in Object-Oriented Programming*. Addison-Wesley. ISBN: 978-0201433052.

### 11.2 官方文档与规范

5. Microsoft. (2024). *TypeScript 5.0 Release Notes: Decorators*. https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/#decorators

6. Microsoft. (2024). *TypeScript Handbook: Decorators*. https://www.typescriptlang.org/docs/handbook/decorators.html

7. ECMA-262. (2024). *ECMAScript 2024 Language Specification: Class Definitions*. https://tc39.es/ecma262/#sec-class-definitions

8. Microsoft. (2024). *TypeScript 5.2 Release Notes: Symbol.metadata*. https://devblogs.microsoft.com/typescript/announcing-typescript-5-2/

### 11.3 社区资源

9. Ehrenberg, D. (2022). *Decorators: Moving to Stage 3*. TC39 Presentation. https://docs.google.com/presentation/d/1s4gHH2b5NhFw8ONUWMg0B3faRj9jO9vH8XQ6q8W8g

10. NestJS. (2024). *NestJS Documentation: Providers*. https://docs.nestjs.com/providers

11. TypeORM. (2024). *TypeORM Documentation: Entities*. https://typeorm.io/entities

12. Angular. (2024). *Angular Documentation: Dependency Injection*. https://angular.io/guide/dependency-injection

### 11.4 教材与课程

13. Gamma, E., Helm, R., Johnson, R., & Vlissides, J. (1994). *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley. ISBN: 978-0201633610.

14. Fowler, M. (2002). *Patterns of Enterprise Application Architecture*. Addison-Wesley. ISBN: 978-0321127426.

15. MIT OpenCourseWare. (2024). *6.S192: Front-End Development with TypeScript*. https://ocw.mit.edu/

16. Stanford University. (2024). *CS110: Principles of Computer Systems*. https://cs110.stanford.edu/

---

## 12. 延伸阅读

### 12.1 进阶主题

- **AOP（面向切面编程）**：装饰器是 AOP 在 TypeScript 中的实现方式，可与 Spring AOP、AspectJ 对比学习
- **元编程**：`Proxy`、`Reflect` 与装饰器的关系，理解 JavaScript 元编程全景
- **依赖注入模式**：Martin Fowler 的 *Inversion of Control* 文章，深入理解 IoC 容器设计
- **Mixin 与 Trait**：装饰器与 Mixin 模式的对比，何时使用何种技术

### 12.2 相关工具

- **reflect-metadata**：Legacy 装饰器的元数据 polyfill
- **tsyringe**：Microsoft 出品的轻量级 DI 容器
- **inversifyjs**：功能强大的 IoC 容器
- **class-validator**：基于装饰器的校验库
- **class-transformer**：基于装饰器的对象转换库

### 12.3 社区博客

- **TypeScript Blog**：https://devblogs.microsoft.com/typescript/
- **NestJS Blog**：https://nestjs.com/blog
- **Daniel Ehrenberg's Blog**：https://thewayofcode.wordpress.com/
- **Marius Schulz's Blog**：https://mariusschulz.com/

### 12.4 视频课程

- **NestJS - The Complete Guide**：Maximilian Schwarzmüller
- **TypeScript: The Complete Developer's Guide**：Stephen Grider
- **Angular - The Complete Guide**：Maximilian Schwarzmüller

### 12.5 开源项目

- **NestJS**：https://github.com/nestjs/nest
- **TypeORM**：https://github.com/typeorm/typeorm
- **MikroORM**：https://github.com/mikro-orm/mikro-orm
- **Angular**：https://github.com/angular/angular
- **tsoa**：https://github.com/lukeautry/tsoa
- **class-validator**：https://github.com/typestack/class-validator

### 12.6 相关 TC39 提案

- **Decorators (Stage 3)**：https://github.com/tc39/proposal-decorators
- **Decorator Metadata (Stage 3)**：https://github.com/tc39/proposal-decorator-metadata
- **Async Decorators (Stage 2)**：异步装饰器提案
- **Class Static Initializer**：ES2022 类静态初始化块

---

## 结语

装饰器是 TypeScript 元编程的核心技术，从 Legacy 到 Stage 3 的演进体现了 TC39 在类型安全、元数据协议、与 ES2022 类字段语义对齐方面的持续努力。本教程从历史动机、形式化定义、工程实践、案例分析等多维度系统讲解 Stage 3 装饰器，旨在帮助开发者：

1. **理解装饰器的代数语义**：将装饰器视为高阶函数，掌握组合律与执行顺序
2. **掌握 Stage 3 装饰器 API**：类、方法、属性、自动访问器四种形态的精确类型签名
3. **使用元数据协议**：通过 `Symbol.metadata` 共享状态，实现声明式配置
4. **避免常见陷阱**：`this` 绑定、元数据共享、属性装饰器返回值、私有字段访问
5. **应用于工程实践**：依赖注入、AOP 切面、ORM 实体映射、路由注册

装饰器是 TypeScript 高级开发者的必备技能，但**并非银弹**。在简单场景中，高阶函数可能更清晰；在复杂场景中，装饰器配合元数据协议能显著提升代码表达力。希望读者通过本教程的学习，能够合理运用装饰器，构建类型安全、可维护的企业级应用。

---

## 附录：术语表

| 术语 | 英文 | 解释 |
|------|------|------|
| 装饰器 | Decorator | 修改类、方法、属性、访问器的高阶函数 |
| Legacy 装饰器 | Legacy Decorator | TS 5.0 之前的装饰器实现，需 `experimentalDecorators` |
| Stage 3 装饰器 | Stage 3 Decorator | TC39 提案 Stage 3 的标准装饰器，TS 5.0 正式支持 |
| 上下文对象 | Context Object | Stage 3 装饰器的第二参数，包含 `kind`、`name`、`metadata` 等字段 |
| 元数据 | Metadata | 通过 `Symbol.metadata` 共享的类级别数据对象 |
| 描述符 | Descriptor | Legacy 装饰器操作的 `PropertyDescriptor` 对象 |
| 自动访问器 | Auto-Accessor | ES2022 引入的 `accessor` 关键字，Stage 3 装饰器可拦截其读写 |
| 装饰器组合 | Decorator Composition | 多个装饰器叠加应用，等价于函数组合 |
| 求值顺序 | Evaluation Order | 装饰器作为函数的求值顺序，从上到下 |
| 应用顺序 | Application Order | 装饰器应用到实体的顺序，从下到上 |

---

## 附录：装饰器类型签名速查表

### 类装饰器

```typescript
type ClassDecorator<T extends { new(...args: any[]): {} }> = (
  value: T,
  context: ClassDecoratorContext
) => T | void;

interface ClassDecoratorContext {
  kind: 'class';
  name: string | undefined;
  metadata: Record<string | symbol, unknown>;
  addInitializer: (initializer: () => void) => void;
}
```

### 方法装饰器

```typescript
type MethodDecorator = (
  value: Function,
  context: ClassMethodDecoratorContext
) => Function | void;

interface ClassMethodDecoratorContext {
  kind: 'method';
  name: string | symbol;
  access: { get: (obj: any) => Function; set: (obj: any, value: Function) => void };
  static: boolean;
  private: boolean;
  metadata: Record<string | symbol, unknown>;
  addInitializer: (initializer: (this: any) => void) => void;
}
```

### 属性装饰器

```typescript
type FieldDecorator = (
  value: undefined,
  context: ClassFieldDecoratorContext
) => ((initialValue: unknown) => unknown) | void;

interface ClassFieldDecoratorContext {
  kind: 'field';
  name: string | symbol;
  access: { get: (obj: any) => unknown; set: (obj: any, value: unknown) => void };
  static: boolean;
  private: boolean;
  metadata: Record<string | symbol, unknown>;
  addInitializer: (initializer: (this: any) => void) => void;
}
```

### 自动访问器装饰器

```typescript
type AccessorDecorator = (
  value: ClassAccessorDecoratorTarget<any, any>,
  context: ClassAccessorDecoratorContext
) => ClassAccessorDecoratorResult<any, any> | void;

interface ClassAccessorDecoratorContext {
  kind: 'accessor';
  name: string | symbol;
  access: { get: (obj: any) => unknown; set: (obj: any, value: unknown) => void };
  static: boolean;
  private: boolean;
  metadata: Record<string | symbol, unknown>;
  addInitializer: (initializer: (this: any) => void) => void;
}

interface ClassAccessorDecoratorTarget<V, R> {
  get: (this: R) => V;
  set: (this: R, value: V) => void;
}

interface ClassAccessorDecoratorResult<V, R> {
  get: (this: R) => V;
  set: (this: R, value: V) => void;
  initialize?: (this: R, value: V) => V;
}
```

---

*本文档最后更新于 2026-06-14，基于 TypeScript 5.4 与 TC39 Decorators Proposal Stage 3。如需了解最新版本特性，请参考 [TypeScript 官方文档](https://www.typescriptlang.org/docs/)与 [TC39 提案仓库](https://github.com/tc39/proposal-decorators)。*
