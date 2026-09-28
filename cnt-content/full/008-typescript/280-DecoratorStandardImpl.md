---
order: 290
title: 装饰器标准实现
module: 'typescript'
category: 前端技术
difficulty: advanced
description: 用 tsx 跑通第一批标准装饰器（TS 5.0+ 的 value + context 模型）：类、方法、字段、自动访问器四类签名，context 对象与元数据，2026 年生态现状（框架仍在 Legacy、Node 类型剥离不认装饰器），以及 this 绑定与混用等典型坑。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'typescript/270-DecoratorDetailed'
  - 'typescript/670-TypeScript5xNewFeatures'
  - 'typescript/360-TsconfigStrictMode'
  - 'typescript/130-EnumAdvanced'
prerequisites:
  - 'typescript/060-TSBasicsClasses'
  - 'typescript/360-TsconfigStrictMode'
---

## 学习目标

- [ ] 能写出标准装饰器的统一形状：`(value, context) => ...`，并说出四类装饰器各自的 value 与返回值
- [ ] 能用 `context.addInitializer` 实现方法自动绑定 this
- [ ] 能用 `context.metadata` 做类级元数据收集（路由表、校验规则注册）
- [ ] 能说清 2026 年装饰器生态现状：标准装饰器在 TS 5.0+ 无需标志即可用，但 NestJS/Angular 生态仍跑在 Legacy 装饰器上
- [ ] 能解释为什么 Node 类型剥离（type stripping）跑不了装饰器

## 一句话理解

> 标准装饰器就是一个「收到原值和一张说明卡（context），决定原样返回、换一个返回、还是只登记信息」的高阶函数。它和 Legacy 装饰器（`experimentalDecorators` 那套三参数签名）是**两套并存的系统**：新代码写标准的，老框架读的仍是 Legacy——读框架源码前先分清你在哪一套里。

## 0. 真实场景：FANDEX 里没有装饰器，但你要会读

FANDEX 是 React 19 + hooks 的项目，业务代码里找不到一个装饰器——函数式风格下，高阶组件和自定义 hooks 承担了同样的职责。它的 tsconfig 也没有开 `experimentalDecorators`，这意味着：**这套代码启用的正是 TS 5.0 起默认可用的标准装饰器**，只是没人用。

那为什么还要学？两个理由：

1. **读库**。Angular、NestJS、TypeORM、class-validator 这些框架的文档和源码铺满了装饰器，看懂 `@Injectable()`、`@Entity()` 在做什么，是排查问题的基本能力；
2. **写类**。当你确实在写有状态的类（解析器、连接池、命令行工具），标准装饰器能把日志、计时、绑定、注册这类横切逻辑从每个方法里抽出去。

## 1. 动手：用 tsx 跑通第一批标准装饰器

FANDEX 根目录的 devDependencies 里就有 `tsx`（TypeScript 直接运行器，走 esbuild 转译，支持标准装饰器）。建个最小项目：

```bash
mkdir deco-lab && cd deco-lab
pnpm init && pnpm add -D typescript tsx
```

```typescript
// timer.ts —— 方法装饰器：给方法计时
function timer(value: unknown, context: ClassMethodDecoratorContext) {
  const name = String(context.name);
  async function method(this: unknown, ...args: unknown[]) {
    const start = performance.now();
    try {
      // value 就是原方法本身，用 access 或直接调用都可以
      return await (value as (...a: unknown[]) => unknown).apply(this, args);
    } finally {
      console.log(`[timer] ${name} took ${performance.now() - start | 0}ms`);
    }
  }
  return method;
}

class Loader {
  @timer
  async fetchDocs(): Promise<string[]> {
    await new Promise((r) => setTimeout(r, 120));
    return ['a.md', 'b.md'];
  }
}

new Loader().fetchDocs();
```

```bash
npx tsx timer.ts
# [timer] fetchDocs took 120ms
```

跑通了。现在把 `console.log(context)` 加进装饰器，看看「说明卡」里有什么：

```text
{
  kind: 'method',
  name: 'fetchDocs',
  access: { get: [Function] },   // 安全读取成员的函数（不破坏私有性）
  static: false,
  private: false,
  metadata: {},                  // 类级共享元数据对象
  addInitializer: [Function]     // 注册初始化回调
}
```

`kind` 与 `name` 是所有装饰器上下文共有的；其余字段按装饰器类别增减。四类标准装饰器的签名一张表说清：

| 装饰器 | value 收到什么 | 返回什么 | context 类型 |
| --- | --- | --- | --- |
| 类 | 类本身 | 新类或 void | `ClassDecoratorContext` |
| 方法 | 方法函数 | 新函数或 void | `ClassMethodDecoratorContext` |
| 字段 | `undefined`（字段还没值） | 初始化函数 `(v) => v` 或 void | `ClassFieldDecoratorContext` |
| 自动访问器 | `{ get, set }` 对象 | `{ get?, set?, init? }` | `ClassAccessorDecoratorContext` |

最容易懵的是**字段装饰器**：它拿不到「值」（声明时字段还没有值），所以它返回的是一个「初始化函数」，在每个实例字段初始化时被调用，可以对初始值做变换。TS 5.0 手册里的经典例子：

```typescript
function twice(value: undefined, context: ClassFieldDecoratorContext) {
  return function (initialValue: number) {
    return initialValue * 2;
  };
}

class C {
  @twice
  field = 21;
}

new C().field; // 42 —— 初始化函数在字段赋值时介入
```

对比 Legacy 属性装饰器（只拿到 target 和 key，完全改不了值），这是两代模型最实质的差异：**标准字段装饰器能参与初始化，Legacy 只能旁观。**

## 2. 讲为什么：三个核心机制

### 2.1 addInitializer：解决 this 绑定

React 时代长大的一代对 `this` 不敏感，但写类就绕不开它：把方法抽出来当回调传出去，`this` 就丢了。装饰器阵营的标准答案：

```typescript
function bound(value: Function, context: ClassMethodDecoratorContext) {
  context.addInitializer(function (this: unknown) {
    // 注意这里必须是 function：要拿到实例 this（箭头函数拿不到）
    this![context.name as string] = this![context.name as string].bind(this);
  });
  return value;
}

class Cli {
  @bound
  run(msg: string) { console.log(`${msg} on`, this); }
}

const { run } = new Cli(); // 解构出来当回调
run('hello');              // this 仍是实例 —— 不加 @bound 这里会崩
```

`addInitializer` 注册的函数在**实例化时**执行（类装饰器的 initializer 则在类定义后立即执行）。它把「构造后修一修实例」这个诉求变成了声明式的一行。

### 2.2 metadata：类级注册表

所有装饰器上下文里的 `metadata` 指向**同一个对象**（最终挂在 `Class[Symbol.metadata]` 上），适合做「扫描期收集」——框架的路由表、校验规则都这么攒出来：

```typescript
function route(path: string) {
  return (value: unknown, context: ClassMethodDecoratorContext) => {
    context.metadata.routes ??= {};
    context.metadata.routes[context.name as string] = path;
  };
}

class ApiController {
  @route('/docs/list')
  list() {}
  @route('/docs/:id')
  detail() {}
}

// 类定义完，路由表已经在元数据里
console.log((ApiController as any)[Symbol.metadata]?.routes);
// { list: '/docs/list', detail: '/docs/:id' }
```

### 2.3 求值与应用顺序：从上到下求值，从下到上应用

```typescript
@first
@second
class Order {}
```

规则一句话：**装饰器表达式从上到下求值（先拿到 first、second 这两个函数），应用时从下往上（先 second 作用在类上，再 first 作用在 second 的结果上）。** 即 `first(second(Order))`——像洋葱，最靠近类的先包。字段与方法的装饰则在类装饰器之前逐成员应用。

## 3. 2026 年现状：两套系统并存

这部分是本篇最重要的「地图」，防止你在错误的系统里找答案。

**标准装饰器（本篇主角）**

- TC39 提案 2022-03 进入 Stage 3（截至 2026-09 仍未到 Stage 4）；
- TS 5.0（2023-03）起无需任何编译选项直接支持；
- **没有参数装饰器**：NestJS 式的「构造函数参数注入」在标准形态里不存在，框架要么继续用 Legacy，要么改用字段装饰器方案；
- Node 的类型剥离（type stripping）**不支持装饰器**——装饰器需要真实的代码变换，删不掉。所以装饰器代码不能依赖 `node file.ts` 直跑，要走 tsx / tsup / Vite 这类带转译的工具链；`erasableSyntaxOnly`（TS 5.8，配合类型剥离的语法约束）的项目同样容不下装饰器（也不容 enum，见 [130](/typescript/130-EnumAdvanced)）。

**Legacy 装饰器（框架世界）**

- `experimentalDecorators: true` 下的三参数签名（`(target, key, descriptor)`），2015 年 TS 1.5 引入，TS 5.x 仍支持但已非主线；
- Angular、NestJS、TypeORM 等至今依赖它，通常还要配 `emitDecoratorMetadata` + `reflect-metadata` polyfill（做「设计时类型」反射）；
- esbuild（因而 Vite/Rolldown 的兼容层）**不支持** Legacy 装饰器——全 Legacy 项目绕不开 tsc/Babel/SWC 转译。

一句话判断法：看到 `(target, key, descriptor)` 三参数是 Legacy；看到 `(value, context)` 是标准。读源码前先认这个签名。

## 4. 坑点与自检

### 坑一：装饰器写法决定 this 语义

`@bound run = (msg) => {...}`（箭头函数字段）和 `@bound run(msg) {}`（方法）行为不同：字段装饰器拿到的 value 是 undefined、要返回初始化函数；方法装饰器拿到的才是函数。给箭头函数字段套方法装饰器的写法，会在编译期被类型系统拦下——这是标准装饰器类型化带来的好处，报错时别急着 `as any`，先检查装饰器与目标的类别是否匹配。

### 坑二：Legacy 与标准混用

`experimentalDecorators` 是**全程序开关**：开了它，整个项目的装饰器都按 Legacy 解析。一个仓库里既想用 NestJS（Legacy）又想写标准装饰器，编译行为会互相污染。解法是拆包：monorepo 里框架代码一个包（开 Legacy），其余一个包（标准）。

### 坑三：metadata 需要读取方配合

`context.metadata` 由 TS 编译输出自动创建（内部用 `Symbol.metadata`），但**框架读取它时**若运行时环境较老，需要确认 `Symbol.metadata` 存在。自己写工具时，用 `??= {}` 兜底初始化（如 2.2 节所示），不要假设对象一定非空。

### 坑四：类装饰器返回新类时，静态成员与私有成员的类型会断

`return class extends value { ... }` 这种包装写法，TypeScript 推断的新类与原类在私有字段上不兼容，往往需要 `T extends new (...args: any[]) => any` 泛型 + 谨慎处理。能用 `addInitializer`（不换类）解决的，优先不换类。

### 自检清单

- [ ] 你写的装饰器签名是 `(value, context)` 还是 `(target, key, descriptor)`？和目标框架一致吗？
- [ ] 需要「构造后修实例」的场合，用的是 addInitializer 而不是换掉整个类吗？
- [ ] 项目的运行链路（tsx / esbuild / tsc）支持你这套装饰器吗？Node 直跑会不会炸？
- [ ] 有没有在一个 tsconfig 里同时喂两种装饰器？

## 5. 练习

1. 把第 1 节的 `@timer` 改造成带参数的工厂 `@timer(阈值)`：只有耗时超过阈值的调用才打日志。
2. 写一个 `@memoize` 方法装饰器：按参数缓存返回值（提示：装饰器体内用 `Map`，返回包装函数前先查缓存）。
3. 用 `@route` + `context.metadata` 写一个 `collectRoutes(klass)` 工具函数：接收一个控制器类，返回 `{ method: path }` 路由表。
4. 给 `@bound` 加上对静态方法的处理：静态方法绑定的 this 是类本身而不是实例（提示：`context.addInitializer` 的回调在类装饰器语境下拿到的 this 不同，验证一下行为）。
5. 在 NestJS 文档里找一个 `@Injectable()` 用例，对照本文第 3 节判断：它属于哪套装饰器系统？为什么标准装饰器形态下「参数注入」做不了？

## 6. 下一步

- [270：装饰器详解](/typescript/270-DecoratorDetailed)：Legacy（experimentalDecorators）体系的完整拆解，读 Angular/NestJS 源码前的必修；
- [670：TypeScript 5.x 新特性演进](/typescript/670-TypeScript5xNewFeatures)：TS 5.0 落地标准装饰器的版本脉络；
- [360：tsconfig 严格模式](/typescript/360-TsconfigStrictMode)：`experimentalDecorators` 与 `emitDecoratorMetadata` 的配置语境；
- [130：枚举进阶](/typescript/130-EnumAdvanced)：同为「非可擦除语法」，enum 与装饰器在 erasableSyntaxOnly 下的共同命运。
