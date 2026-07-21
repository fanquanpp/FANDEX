---
order: 80
title: TypeScript5新特性
module: typescript
category: TypeScript
difficulty: intermediate
description: TypeScript 5.x 全版本新特性、形式语义与生产环境迁移指南
author: fanquanpp
updated: '2026-07-20'
lastReviewed: 2026-07-20
reviewer: FANDEX Content Engineering Team
related:
  - typescript/类型安全的发布订阅
  - typescript/类型安全的环境变量
  - typescript/工程化配置
  - typescript/satisfies操作符
prerequisites:
  - typescript/语法速查
tags:
  - typescript
  - typescript-5
  - decorators
  - satisfies
  - const-type-parameters
  - module-resolution
  - enums
  - ecmascript
learningObjectives:
  - '理解 TypeScript 5.0 至 5.x 各版本的核心新特性、设计动机与底层实现原理'
  - '运用 const 类型参数、satisfies 操作符、Stage 3 装饰器解决实际工程问题'
  - '分析 moduleResolution: bundler 与 node/nodenext 的差异，选择最适配的模块解析策略'
  - '评估枚举现代化与 --erasableSyntaxOnly 对既有项目的兼容性影响，制定迁移策略'
  - '设计基于 Stage 3 装饰器的元编程框架，结合 reflect-metadata 实现依赖注入与 AOP'
  - '对比 ECMAScript 标准化装饰器与 experimentalDecorators 的语义差异'
exercises:
  fill-blank:
    - question: "TypeScript 5.0 引入的 const 类型参数语法为____，它会让类型参数推断为最窄的字面量类型。"
      answer: "const T extends ..."
      bloom: remember
    - question: "satisfies 操作符的语义是____。"
      answer: "校验表达式是否满足目标类型，同时保留表达式自身的更精确类型"
      bloom: understand
    - question: "TypeScript 5.0 实现的装饰器标准是 ECMAScript ____阶段提案。"
      answer: "Stage 3"
      bloom: remember
    - question: "moduleResolution: bundler 与 node16/nodenext 的核心差异在于 bundler 允许____和____。"
      answer: "相对路径不带扩展名；package.json 的 exports 字段解析更宽松"
      bloom: understand
    - question: "TypeScript 5.0 中 tsconfig.json 的 extends 字段支持____，按顺序合并。"
      answer: "数组（多配置继承）"
      bloom: remember
    - question: "TypeScript 5.8 引入的 ____ 配置选项只允许使用可擦除语法，禁止 enum 等。"
      answer: "--erasableSyntaxOnly"
      bloom: remember
  choice:
    - question: "关于 const 类型参数，下列说法正确的是？"
      options:
        - "const 类型参数会改变函数的运行时行为，使其参数被视为 const"
        - "const 类型参数仅影响类型推断，使推断结果保留更窄的字面量类型"
        - "const 类型参数等价于把参数声明为 readonly"
        - "const 类型参数只能用于函数，不能用于类型别名"
      answer: "B"
      explanation: "const 是类型层修饰符，只影响推断宽度，不产生任何运行时代码，也不强制 readonly。"
      bloom: evaluate
    - question: "下列关于 satisfies 操作符的描述，错误的是？"
      options:
        - "satisfies 不会拓宽字面量类型"
        - "satisfies 会触发类型校验，若不满足则编译错误"
        - "satisfies 等价于 as，仅做类型断言"
        - "satisfies 可用于对象字面量、数组、函数返回值等多种表达式"
      answer: "C"
      explanation: "as 是断言，不做校验；satisfies 是校验，校验失败会报错。两者语义完全不同。"
      bloom: evaluate
    - question: "TypeScript 5.0 装饰器与 experimentalDecorators 的核心差异是什么？"
      options:
        - "5.0 装饰器不支持方法装饰器"
        - "5.0 装饰器的 context 参数提供 metadata 字段，标准化元数据存储"
        - "5.0 装饰器只能用于类本身，不能用于类成员"
        - "5.0 装饰器在运行时会自动注入 reflect-metadata"
      answer: "B"
      explanation: "Stage 3 装饰器引入了 ClassMethodDecoratorContext 等上下文对象，并支持 context.metadata 用于存储元数据；不需要 reflect-metadata 包。"
      bloom: analyze
    - question: "关于 --moduleResolution: bundler，下列描述错误的是？"
      options:
        - "需要配合 --module: esnext 使用"
        - "允许相对路径导入不带扩展名"
        - "强制要求 package.json 必须包含 exports 字段"
        - "模拟 Vite/Webpack/Rollup 等打包工具的解析行为"
      answer: "C"
      explanation: "bundler 解析策略不强制要求 exports 字段，回退到 main 字段；它仅是更宽松的解析策略。"
      bloom: analyze
    - question: "TypeScript 5.4 引入的 NoInfer<T> 工具类型的作用是？"
      options:
        - "禁止类型推断，强制显式标注"
        - "把 T 从推导位置中排除，避免反向约束污染推导结果"
        - "等价于 unknown，但更明确"
        - "用于禁止某个泛型参数的使用"
      answer: "B"
      explanation: "NoInfer 主要用于解决「同位置参数互相污染推导」的问题，让某个参数不参与对泛型参数 T 的推导。"
      bloom: evaluate
    - question: "TypeScript 5.5 的 inferred type predicates 解决了什么问题？"
      options:
        - "自动为返回 boolean 的函数推断类型谓词 (x is T)"
        - "禁止使用 type predicates"
        - "让所有函数都自动成为类型守卫"
        - "替代 instanceof 操作符"
      answer: "A"
      explanation: "TS 5.5 之前，类型守卫函数必须显式声明返回值为 x is T；5.5 会根据函数体的控制流分析自动推断。"
      bloom: understand
  code-fix:
    - question: "下列代码无法保留 routes 数组的字面量类型。请修复（不修改函数体）："
      code: |
        function createRoutes<T extends readonly string[]>(routes: T): T {
          return routes;
        }
        const routes = createRoutes(['/home', '/about']);
        // routes 类型被推断为 string[]
      fix: |
        function createRoutes<const T extends readonly string[]>(routes: T): T {
          return routes;
        }
        const routes = createRoutes(['/home', '/about']);
        // routes 类型为 readonly ['/home', '/about']
      explanation: "在类型参数前加 const 修饰符，TypeScript 会推断最窄的字面量类型，而不是拓宽到 string。"
      bloom: apply
    - question: "下列代码用 as 做断言，缺乏编译期安全校验。请改用 satisfies："
      code: |
        const config = {
          port: 3000,
          host: 'localhost',
        } as Record<string, string | number>;
      fix: |
        const config = {
          port: 3000,
          host: 'localhost',
        } satisfies Record<string, string | number>;
        // 同时保留字面量类型 { port: 3000; host: 'localhost' }
      explanation: "satisfies 既校验是否满足目标类型，又保留原始字面量类型；as 只做断言不校验，且会拓宽字面量。"
      bloom: apply
    - question: "下列装饰器在 TS 5.0 标准下无法正确读取方法名，请修复："
      code: |
        function log(target: any, key: string, desc: PropertyDescriptor) {
          const orig = desc.value;
          desc.value = function (...args: any[]) {
            console.log(`calling ${key}`);
            return orig.call(this, ...args);
          };
        }
      fix: |
        function log(originalMethod: any, context: ClassMethodDecoratorContext) {
          return function (this: any, ...args: any[]) {
            console.log(`calling ${String(context.name)}`);
            return originalMethod.call(this, ...args);
          };
        }
      explanation: "Stage 3 装饰器签名是 (value, context)，context.name 是方法名；旧签名 (target, key, desc) 是 experimentalDecorators。"
      bloom: apply
  open-ended:
    - question: "请用 300 字以内论述：为什么 TypeScript 5.0 选择实现 Stage 3 装饰器标准，而不是继续维护 experimentalDecorators？这对生态会有什么影响？"
      reference: "考虑 TC39 标准化进程、与 Babel/SWC 等工具的协作、以及向后兼容性。"
      bloom: create
    - question: "假设你正在维护一个 50 万行代码的 TypeScript 项目，正在从 4.9 升级到 5.x。请制定详细的迁移计划，覆盖装饰器、模块解析、枚举、--verbatimModuleSyntax 等关键变化点。"
      reference: "考虑渐进式迁移策略、回滚机制、CI 验证、团队培训。"
      bloom: create
references:
  - author: Rosenwasser, Daniel
    title: "Announcing TypeScript 5.0"
    journal: "Microsoft Developer Blog"
    year: 2023
    url: "https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/"
    type: website
  - author: Rosenwasser, Daniel
    title: "Announcing TypeScript 5.4"
    journal: "Microsoft Developer Blog"
    year: 2024
    url: "https://devblogs.microsoft.com/typescript/announcing-typescript-5-4/"
    type: website
  - author: Rosenwasser, Daniel
    title: "Announcing TypeScript 5.5"
    journal: "Microsoft Developer Blog"
    year: 2024
    url: "https://devblogs.microsoft.com/typescript/announcing-typescript-5-5/"
    type: website
  - author: Ehrenberg, Ron and Voss, Gabriel
    title: "ECMAScript Decorators Proposal, Stage 3"
    journal: "TC39"
    year: 2023
    url: "https://github.com/tc39/proposal-decorators"
    type: website
  - author: Bierman, Gavin M. and Abadi, Martín and Torgersen, Mads
    title: "Understanding TypeScript"
    journal: "ECOOP 2014 — Object-Oriented Programming"
    year: 2014
    pages: "257-281"
    doi: "10.1007/978-3-662-44202-9_11"
    type: conference
  - author: Bracha, Gilad and Ungar, David
    title: "Mirrors: design principles for meta-level facilities of object-oriented programming languages"
    journal: "OOPSLA '04"
    year: 2004
    pages: "331-344"
    doi: "10.1145/1028976.1029004"
    type: conference
  - author: Pierce, Benjamin C.
    title: "Types and Programming Languages"
    journal: "MIT Press"
    year: 2002
    isbn: "978-0-262-16209-8"
    type: book
etymology:
  term: "Decorator（装饰器）"
  origin: "源自 Python 2.4 (PEP 318, 2004) 引入的 @decorator 语法，后被 Java Annotation、C# Attribute、JavaScript 装饰器提案借鉴。TC39 标准化进程自 2014 年 Yehuda Katz 提出 Stage 1 起历经多次重设计，至 2022 年由 Ron Ehrenberg 与 Peng Li 重写为 Stage 3 提案。"
---

## 引言：TypeScript 5.x 的时代意义

TypeScript 5.0 于 2023 年 3 月 16 日正式发布，是 TypeScript 历史上最大规模的一次重写。从 5.0 到 5.x 的演进，TypeScript 团队完成了三件关键工作：

1. **编译器现代化**：重写了代码库结构、模块化系统与诊断信息，使代码库更易维护。
2. **语言能力扩展**：引入 const 类型参数、Stage 3 装饰器、satisfies、枚举现代化等关键特性。
3. **生态对齐**：与 ECMAScript 标准化进程保持同步，逐步淘汰非标准语法。

本模块的目标是系统梳理 TypeScript 5.x 各版本的核心新特性，提供形式化语义、生产级代码示例、迁移指南与对比分析，达到 MIT/Stanford/CMU 课程级别。

## 1. 历史背景与版本时间线

### 1.1 TypeScript 5.x 演进时间线

| 版本 | 发布日期 | 核心特性 | 主要贡献者 |
| ---- | -------- | -------- | ---------- |
| 5.0 | 2023-03-16 | 重写编译器、Stage 3 装饰器、const 类型参数、枚举现代化、moduleResolution: bundler、extends 多配置继承、--verbatimModuleSyntax | Daniel Rosenwasser 等 |
| 5.1 | 2023-06-20 | 装饰器完善、union 类型 strict 检查、JSDoc 改进 | Microsoft |
| 5.2 | 2023-08-30 | 显式资源管理（using 声明）、Symbol.hasInstance 改进、装饰器 metadata 标准化 | Microsoft |
| 5.3 | 2023-11-20 | import attributes、resolution-mode 在 import type 中、优化 strict 检查 | Microsoft |
| 5.4 | 2024-03-06 | NoInfer 工具类型、Object.groupBy/Map.groupBy、保留联合类型 narrow | Microsoft |
| 5.5 | 2024-06-17 | 推断类型谓词（inferred type predicates）、配置变量解构、JSDoc 类型导入 | Microsoft |
| 5.6 | 2024-09-16 | 不允许 truthy 检查、迭代器助手方法、严格迭代器返回类型 | Microsoft |
| 5.7 | 2024-11-21 | --rewriteRelativeImportExtensions、Node 22 支持、--module preserve | Microsoft |
| 5.8 | 2025-03-04 | --erasableSyntaxOnly、--module nodenext 默认、增量模式改进 | Microsoft |

### 1.2 5.0 版本的工程意义

5.0 是自 2012 年 TypeScript 0.8 发布以来最重要的版本。它不仅是新特性的集合，更是编译器内核的现代化重写：

- **模块化编译器**：拆分巨型文件 `compiler/types.ts`（曾达 25,000 行）为多个语义清晰的模块。
- **统一诊断信息**：所有错误信息采用统一模板，可机器解析，便于 IDE 集成。
- **类型别名保留**：错误信息中保留类型别名而非展开，可读性大幅提升。
- **性能优化**：编译速度提升 10%、内存占用降低 20%、包体积减小 26%（从 63MB 到 47MB）。

## 2. const 类型参数（const Type Parameters）

### 2.1 形式化定义

TypeScript 5.0 引入的 const 类型参数语法为：

$$
\frac{\Gamma, \text{const } X \sqsubseteq \sigma \vdash e : \tau}{\Gamma \vdash \text{function}\; f\text{<const } X \text{ extends } \sigma\text{>}(x: X): \tau}
\quad
(\text{T-Const-Param})
$$

const 修饰符让 TypeScript 在推断 `X` 时采用最窄的字面量类型，而非拓宽到通用类型。形式语义上，它改变了类型推断的方向：

- 无 const：推断使用 widening，`'a'` → `string`，`1` → `number`。
- 有 const：推断使用 narrowing，`'a'` → `'a'`，`1` → `1`。

### 2.2 基础示例

```typescript
// 不使用 const：字面量被拓宽
function createRoutes<T extends readonly string[]>(routes: T): T {
  return routes;
}
const r1 = createRoutes(['/home', '/about']);
// r1 类型: readonly string[]

// 使用 const：保留字面量
function createRoutes2<const T extends readonly string[]>(routes: T): T {
  return routes;
}
const r2 = createRoutes2(['/home', '/about']);
// r2 类型: readonly ['/home', '/about']
```

### 2.3 与 as const 的对比

`as const` 是表达式级别的修饰，`const` 类型参数是参数级别的修饰。两者可以叠加：

```typescript
// 仅用 as const
function f1<T extends readonly string[]>(routes: T): T {
  return routes;
}
const r1 = f1(['/home', '/about'] as const);
// r1 类型: readonly ['/home', '/about']

// 仅用 const 类型参数
function f2<const T extends readonly string[]>(routes: T): T {
  return routes;
}
const r2 = f2(['/home', '/about']);
// r2 类型: readonly ['/home', '/about']

// 两者叠加（多余但合法）
const r3 = f2(['/home', '/about'] as const);
// r3 类型: readonly ['/home', '/about']
```

设计差异：

| 特性 | as const | const 类型参数 |
| ---- | -------- | -------------- |
| 作用范围 | 单个表达式 | 函数的所有调用点 |
| 调用方负担 | 每次调用都要写 as const | 函数定义一次，调用方自动受益 |
| 可读性 | 调用点稍显冗余 | 调用点更简洁 |
| 通用性 | 适用于任意表达式 | 仅适用于泛型函数与类 |

### 2.4 工程应用：路由表与配置

```typescript
// 路由表：保留字面量类型，便于后续类型推导
function defineRoutes<const T extends readonly (readonly [string, string])[]>(
  routes: T,
) {
  return {
    routes,
    getPath: (name: T[number][1]) =>
      routes.find(([, n]) => n === name)?.[0],
  };
}

const router = defineRoutes([
  ['/', 'home'],
  ['/about', 'about'],
  ['/contact', 'contact'],
] as const);

// 路径名在类型层已知
router.getPath('home'); // OK
router.getPath('foo'); // 编译错误
```

### 2.5 与条件类型结合

```typescript
// 类型层从路由数组提取路径名联合
type RouteNames<T extends readonly (readonly [string, string])[]> =
  T[number][1];

const router2 = defineRoutes([
  ['/', 'home'],
  ['/about', 'about'],
] as const);

type Names = RouteNames<typeof router2.routes>; // 'home' | 'about'
```

### 2.6 const 与默认参数

```typescript
// 默认参数会推断为参数类型，const 仍生效
function withDefault<const T extends string>(x: T = 'default' as T): T {
  return x;
}

const s = withDefault(); // 'default'
const s2 = withDefault('custom'); // 'custom'
```

## 3. satisfies 操作符

### 3.1 形式化定义

`satisfies` 操作符的语义可形式化为：

$$
\frac{\Gamma \vdash e : \tau_1 \quad \Gamma \vdash \tau_1 \sqsubseteq \tau_2}{\Gamma \vdash (e \;\text{satisfies}\; \tau_2) : \tau_1}
\quad
(\text{T-Satisfies})
$$

其语义是：

- 校验表达式 `e` 的类型是否是 `τ₂` 的子类型。
- 校验通过后，表达式类型仍为 `τ₁`，而非 `τ₂`。

对比 `as` 操作符：

$$
\frac{\Gamma \vdash e : \tau_1 \quad \tau_1 \sqsubseteq \tau_2 \lor \tau_2 \sqsubseteq \tau_1}{\Gamma \vdash (e \;\text{as}\; \tau_2) : \tau_2}
\quad
(\text{T-As})
$$

`as` 是断言，不做校验（仅要求两类型有子类型关系之一即可），且会改变类型为 `τ₂`。

### 3.2 基础示例

```typescript
type Colors = 'red' | 'green' | 'blue';
type RGB = [number, number, number];

const palette = {
  red: [255, 0, 0],
  green: '#00ff00',
  blue: [0, 0, 255],
} satisfies Record<Colors, string | RGB>;

// palette 的类型保留为字面量
palette.red[0]; // number，因为 red 是 [number, number, number]
palette.green.toUpperCase(); // string，因为 green 是 string
// palette.yellow; // 编译错误：'yellow' 不在 palette 类型中
```

### 3.3 与 as 的关键差异

```typescript
// 使用 as：丢失字面量信息
const palette1 = {
  red: [255, 0, 0],
  green: '#00ff00',
} as Record<'red' | 'green', string | RGB>;

palette1.red; // string | RGB（拓宽）

// 使用 satisfies：保留字面量信息
const palette2 = {
  red: [255, 0, 0],
  green: '#00ff00',
} satisfies Record<'red' | 'green', string | RGB>;

palette2.red; // number[]（保留精确类型）
palette2.green; // string（保留精确类型）
```

### 3.4 校验失败示例

```typescript
type Config = {
  port: number;
  host: string;
};

const config = {
  port: '3000', // 错误：string 不能赋值给 number
  host: 'localhost',
} satisfies Config;
// 编译错误：Type 'string' is not assignable to type 'number'.
```

这正是 satisfies 的核心价值：在保留精确类型的同时做编译期校验。

### 3.5 在对象字面量与联合类型中的应用

```typescript
type RouteHandler =
  | { method: 'GET'; handler: (req: Request) => Response }
  | { method: 'POST'; handler: (req: Request, body: unknown) => Response };

const route = {
  method: 'GET',
  handler: (req: Request) => new Response('ok'),
} satisfies RouteHandler;

// route.method 类型为 'GET'，可以做判别联合 narrow
if (route.method === 'GET') {
  // route.handler 类型已知
}
```

### 3.6 与 Record 工具类型的组合

```typescript
const themes = {
  light: { bg: '#fff', fg: '#000' },
  dark: { bg: '#000', fg: '#fff' },
} satisfies Record<string, { bg: string; fg: string }>;

// themes.light 类型保留为 { bg: string; fg: string }
// 但 themes.unknown 也会被允许，因为 Record<string, ...> 允许任意 key
```

如需更严格的 key 校验，使用 satisfies + 显式接口：

```typescript
interface ThemeMap {
  light: Theme;
  dark: Theme;
}

const themes = {
  light: { bg: '#fff', fg: '#000' },
  dark: { bg: '#000', fg: '#fff' },
} satisfies ThemeMap;

// themes.light 与 themes.dark 都已知
// themes.unknown 会编译错误
```

## 4. ECMAScript Stage 3 装饰器

### 4.1 历史与标准化

装饰器（Decorator）是 ECMAScript 标准化进程中最具争议的提案之一。其时间线：

| 年份 | 事件 | 提案者 |
| ---- | ---- | ------ |
| 2014 | Yehuda Katz 与 Brian Terlson 提出 Stage 1 | Yehuda Katz |
| 2015-2018 | 多次重写，与 TypeScript experimentalDecorators 分歧 | 多方 |
| 2019 | Stage 2 提案，引入 @deprecate 等示例 | Daniel Ehrenberg |
| 2022 | Ron Ehrenberg 与 Peng Li 重写为 Stage 3 | Ron Ehrenberg |
| 2023 | TypeScript 5.0 实现该 Stage 3 提案 | Microsoft |

### 4.2 与 experimentalDecorators 的核心差异

| 特性 | experimentalDecorators | Stage 3 装饰器 |
| ---- | ---------------------- | --------------- |
| 启用方式 | `--experimentalDecorators --emitDecoratorMetadata` | 默认支持，无需标志 |
| 签名 | `(target, key, descriptor)` | `(value, context)` |
| 元数据 | 依赖 `reflect-metadata` 包 | `context.metadata` 内建 |
| 初始化顺序 | 类成员先于类装饰器 | 与类初始化同步 |
| 标准化 | TS 专属，ECMAScript 不会采纳 | TC39 标准提案 |
| 兼容性 | 与 Babel 旧版兼容 | 与 Babel 7.21+ 兼容 |

### 4.3 Stage 3 装饰器签名

Stage 3 装饰器有四种上下文类型：

```typescript
type ClassDecorator = <T extends new (...args: any[]) => any>(
  value: T,
  context: ClassDecoratorContext<T>,
) => T | void;

type ClassMethodDecorator = (
  value: Function,
  context: ClassMethodDecoratorContext,
) => Function | void;

type ClassFieldDecorator = (
  value: undefined,
  context: ClassFieldDecoratorContext,
) => (initialValue: unknown) => unknown | void;

type ClassAccessorDecorator = (
  value: { get: () => unknown; set: (v: unknown) => void },
  context: ClassAccessorDecoratorContext,
) => { get: () => unknown; set: (v: unknown) => void } | void;
```

context 对象的关键字段：

- `kind`：'class' | 'method' | 'field' | 'accessor'，标识装饰位置。
- `name`：成员名（class 装饰器为 undefined）。
- `access`：仅 field/accessor，包含 `{ get, set }`。
- `static`：是否为静态成员。
- `private`：是否为私有成员。
- `metadata`：类级元数据对象，所有装饰器共享。

### 4.4 方法装饰器示例

```typescript
// 日志装饰器：自动记录方法调用
function logged<This, Args extends any[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>,
) {
  const methodName = String(context.name);
  return function (this: This, ...args: Args): Return {
    console.log(`[LOG] 调用 ${methodName}，参数：`, args);
    try {
      const result = target.call(this, ...args);
      console.log(`[LOG] ${methodName} 返回：`, result);
      return result;
    } catch (err) {
      console.error(`[LOG] ${methodName} 抛出异常：`, err);
      throw err;
    }
  };
}

class Calculator {
  @logged
  add(a: number, b: number): number {
    return a + b;
  }
}

const calc = new Calculator();
calc.add(1, 2);
// [LOG] 调用 add，参数：[1, 2]
// [LOG] add 返回：3
```

### 4.5 类装饰器示例

```typescript
// 注册类到 IoC 容器
function Injectable<T extends new (...args: any[]) => any>(
  value: T,
  context: ClassDecoratorContext<T>,
): T {
  // 把类注册到容器
  Container.register(value);
  // 返回类（可替换为子类）
  return value;
}

@Injectable
class UserService {
  findById(id: number) {
    return { id, name: 'Alice' };
  }
}
```

### 4.6 字段装饰器示例

```typescript
// 默认值装饰器
function defaultValue<T>(initial: T) {
  return function (
    _value: undefined,
    context: ClassFieldDecoratorContext,
  ) {
    return function (this: any, existing: T | undefined): T {
      return existing ?? initial;
    };
  };
}

class User {
  @defaultValue('Anonymous')
  name: string = '';

  @defaultValue(0)
  age: number = 0;
}

const u = new User();
console.log(u.name); // 'Anonymous'
```

### 4.7 accessor 装饰器（5.0 新关键字）

TypeScript 5.0 引入 `accessor` 关键字，配合 Stage 3 装饰器使用：

```typescript
class Counter {
  accessor count = 0;
}

// 等价于：
class Counter2 {
  #count = 0;
  get count() { return this.#count; }
  set count(v) { this.#count = v; }
}
```

`accessor` 自动把字段转换为 getter/setter，便于装饰器拦截：

```typescript
function traced<This, V>(
  target: ClassAccessorDecoratorTarget<This, V>,
  context: ClassAccessorDecoratorContext<This, V>,
): ClassAccessorDecoratorResult<This, V> {
  const { get, set } = target;
  return {
    get(this: This) {
      console.log('get');
      return get.call(this);
    },
    set(this: This, value: V) {
      console.log('set:', value);
      set.call(this, value);
    },
  };
}

class Counter {
  @traced
  accessor count = 0;
}
```

### 4.8 metadata：标准化的元数据存储

Stage 3 装饰器的 `context.metadata` 是一个对象，所有装饰器共享同一对象的引用：

```typescript
type RouteMeta = {
  path?: string;
  method?: string;
};

function route(path: string, method = 'GET') {
  return function (
    value: Function,
    context: ClassMethodDecoratorContext,
  ) {
    // 把路由信息写入 metadata
    const meta = (context.metadata as RouteMeta);
    meta.path = path;
    meta.method = method;
  };
}

class UserController {
  @route('/users/:id')
  getUser() {}

  @route('/users', 'POST')
  createUser() {}
}

// 反射读取 metadata
const meta = UserController.prototype[Symbol.metadata] as Map<string, RouteMeta>;
```

TypeScript 5.2+ 通过 `Symbol.metadata` 把元数据存到类上，运行时可访问。

### 4.9 与 reflect-metadata 的关系

`experimentalDecorators` 时代依赖 `reflect-metadata` 包，需要：

```typescript
import 'reflect-metadata';

class UserService {
  @Inject
  private repo: UserRepository;
}

// reflect-metadata 把类型信息存储在 [[Metadata]] 内部槽
```

Stage 3 装饰器不需要 `reflect-metadata`，因为 `context.metadata` 是语言内建机制。但若要存储"类型本身"，仍需手动注入：

```typescript
function Type<T>(type: T) {
  return function (
    _value: undefined,
    context: ClassFieldDecoratorContext,
  ) {
    return function (this: any, initial: any) {
      // 注册类型信息
      Metadata.set(context.name, type);
      return initial;
    };
  };
}
```

### 4.10 装饰器组合顺序

多个装饰器按以下顺序应用：

1. 从上到下求值（装饰器工厂按顺序调用）。
2. 从下到上应用（结果按反序组合）。

```typescript
@A
@B
@C
class X {}

// 求值顺序：A、B、C
// 应用顺序：C(B(A(X)))
```

形式化为：

$$
\text{apply}(\text{@A @B @C}, X) = A(B(C(X)))
$$

## 5. moduleResolution: bundler

### 5.1 模块解析策略概览

TypeScript 5.0 之前支持三种模块解析策略：

| 策略 | 适用场景 | 特点 |
| ---- | -------- | ---- |
| `classic` | 历史遗留 | 不解析 node_modules，已废弃 |
| `node` (node10) | Node.js CommonJS | 经典 Node 解析，支持 `index.js` 与扩展名省略 |
| `node16` / `nodenext` | Node.js 现代模式 | 强制 `package.json` 的 `exports` 字段，相对路径必须带扩展名 |

5.0 新增 `bundler` 策略，模拟 Vite/Webpack/Rollup 等打包工具的宽松解析行为。

### 5.2 bundler 与 node16 的差异

| 行为 | node16/nodenext | bundler |
| ---- | --------------- | ------- |
| 相对路径必须带扩展名 | 是 | 否 |
| `package.json` 的 `exports` 强制 | 是 | 软支持 |
| `main` 字段回退 | 否（仅有 exports） | 是 |
| 自定义条件（customConditions） | 是 | 是 |
| `moduleSuffixes` | 否 | 是（5.0 新） |
| 必须配合 `--module: nodenext` | 是 | 必须配合 `--module: esnext` |

### 5.3 配置示例

```json
{
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

`bundler` 策略假定代码会被打包工具处理，因此 TypeScript 自身不输出代码（`noEmit: true`），仅做类型检查。

### 5.4 moduleSuffixes：平台特定模块解析

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "moduleSuffixes": [".web", ".native", ""]
  }
}
```

配置后，`import Button from './Button'` 会按以下顺序解析：

1. `./Button.web.ts`
2. `./Button.native.ts`
3. `./Button.ts`

适用于 React Native 等需要多平台代码共存的场景。

### 5.5 resolveJsonModule 与 bundler

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "resolveJsonModule": true
  }
}
```

启用后可直接 `import pkg from './package.json'`，TypeScript 会把 JSON 文件作为模块导入并推断类型。

### 5.6 allowImportingTsExtensions

`bundler` 配合 `allowImportingTsExtensions: true` 可允许显式写 `.ts` 扩展名：

```typescript
import { foo } from './utils.ts'; // 允许
```

这要求 `noEmit: true`，因为输出文件不能保留 `.ts` 扩展名。

### 5.7 自定义条件（customConditions）

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "customConditions": ["development"]
  }
}
```

`package.json` 的 `exports`：

```json
{
  "exports": {
    "development": "./src/index.ts",
    "default": "./dist/index.js"
  }
}
```

TypeScript 会优先匹配 `development` 条件，便于在开发时直接引用源码。

## 6. 枚举现代化

### 6.1 旧枚举的痛点

TypeScript 4.x 及之前的枚举存在多个工程痛点：

1. **数字枚举不安全**：任意数字都可赋值给数字枚举。
2. **reverse mapping**：数字枚举生成 `Enum[key] = value` 与 `Enum[value] = key` 双向映射，污染运行时对象。
3. **isLiteralKey 等工具类型复杂**：难以枚举枚举成员。
4. **const enum 难以跨包使用**：const enum 在 isolatedModules 下表现不稳定。

### 6.2 5.0 的枚举改进

5.0 对所有枚举（包括非 const enum）进行了现代化：

1. **所有枚举都是联合枚举**：每个枚举成员都是独立的字面量类型。
2. **禁止赋值越界**：不能把任意数字赋值给数字枚举。
3. **没有 reverse mapping**（仅字面量枚举）：减少运行时开销。

```typescript
enum Color {
  Red = 0xff0000,
  Green = 0x00ff00,
  Blue = 0x0000ff,
}

// 5.0+：每个成员是字面量类型
type ColorRed = Color.Red; // Color.Red（字面量）

// 旧版本：可以赋值任意数字
const c: Color = 123456; // 5.0+ 编译错误

// 5.0+：禁止
const c2: Color = Color.Red | Color.Green; // OK，联合类型
```

### 6.3 字符串枚举与字面量

```typescript
enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT',
}

// 5.0+：Direction 与 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' 等价
type DirectionValue = `${Direction}`; // 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
```

### 6.4 const enum 的现状

const enum 仍然存在，但官方推荐用 `as const` 对象替代：

```typescript
// 旧方式：const enum
const enum Color1 {
  Red,
  Green,
  Blue,
}

// 推荐方式：as const 对象
const Color2 = {
  Red: 0,
  Green: 1,
  Blue: 2,
} as const;

type Color2 = typeof Color2[keyof typeof Color2]; // 0 | 1 | 2
```

### 6.5 --erasableSyntaxOnly（5.8）

TypeScript 5.8 引入 `--erasableSyntaxOnly` 配置，仅允许使用可擦除语法（即只通过类型擦除即可移除的语法），禁止 enum、namespace、parameter properties 等需要代码生成的语法：

```json
{
  "compilerOptions": {
    "erasableSyntaxOnly": true
  }
}
```

这避免了 TypeScript 自身语法与 ECMAScript 标准的偏离，便于与 Node.js 22+ 内建 TypeScript 支持配合。

启用后，下列代码会编译错误：

```typescript
enum Color { Red, Green, Blue } // 错误：enum 不可擦除

namespace Utils { // 错误：namespace 不可擦除
  export function f() {}
}

class Foo {
  constructor(private x: number) {} // 错误：parameter property 不可擦除
}
```

替代方案：

```typescript
// 用 as const 对象替代 enum
const Color = { Red: 0, Green: 1, Blue: 2 } as const;

// 用模块替代 namespace
export function f() {}

// 显式声明字段
class Foo {
  x: number;
  constructor(x: number) {
    this.x = x;
  }
}
```

## 7. --verbatimModuleSyntax

### 7.1 历史背景

TypeScript 历史上有多个相关配置：

- `--importsNotUsedAsValues`：控制仅类型导入是否保留。
- `--preserveValueImports`：控制未使用值导入是否保留。
- `--isolatedModules`：保证每个文件可独立编译。

5.0 把这些合并为 `--verbatimModuleSyntax`：

```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true
  }
}
```

### 7.2 语义

启用后：

1. 仅类型导入必须用 `import type` 显式标注。
2. 混合导入必须用 `import { type X, Y }` 区分。
3. 未使用的导入不会被自动删除（让打包工具处理）。

```typescript
// 仅类型导入
import type { User } from './types';

// 混合导入
import { type User, createUser } from './api';

// 错误：未用 type 标注
import { User } from './types'; // 若 User 是类型，编译错误
```

### 7.3 与 isolatedModules 的关系

`verbatimModuleSyntax` 隐含开启 `isolatedModules`，因为类型与值必须明确区分，才能让 Babel/SWC 等工具单文件编译。

## 8. extends 多配置继承

### 8.1 语法

```json
// tsconfig.json
{
  "extends": ["./tsconfig.base.json", "./tsconfig.strict.json"],
  "compilerOptions": {
    "outDir": "./dist"
  }
}
```

数组按顺序合并，后者的配置覆盖前者的同名键。

### 8.2 应用场景

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "esnext",
    "strict": true,
    "skipLibCheck": true
  }
}

// tsconfig.strict.json
{
  "compilerOptions": {
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}

// tsconfig.test.json
{
  "extends": ["./tsconfig.base.json"],
  "compilerOptions": {
    "types": ["jest", "node"]
  },
  "include": ["src", "test"]
}
```

### 8.3 与 monorepo 配合

```json
// apps/web/tsconfig.json
{
  "extends": ["../../tsconfig.base.json", "../../tsconfig.react.json"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM"]
  }
}

// apps/api/tsconfig.json
{
  "extends": ["../../tsconfig.base.json", "../../tsconfig.node.json"],
  "compilerOptions": {
    "lib": ["ES2022"],
    "types": ["node"]
  }
}
```

## 9. 其他重要新特性

### 9.1 lib 装箱

旧版本 TypeScript 通过 `lib` 数组分别引入 `ES2015.Core`、`ES2015.Collection` 等。5.0+ 引入整合的 `ES2020`、`ES2022`、`ESNext` 等：

```json
{
  "compilerOptions": {
    "lib": ["ES2023", "DOM", "DOM.Iterable"]
  }
}
```

### 9.2 lib.es2023.d.ts 更新

ES2023 引入的新 API：

- `Array.prototype.findLast` / `findLastIndex`
- `Array.prototype.toReversed` / `toSorted` / `toSpliced` / `with`
- `Hashbang` 语法支持
- `WeakRef.prototype.unregister`

```typescript
const arr = [1, 2, 3, 4, 5];
const last = arr.findLast(x => x > 3); // 5

const newArr = arr.with(0, 100); // [100, 2, 3, 4, 5]（不改原数组）
const sorted = arr.toSorted((a, b) => b - a); // [5, 4, 3, 2, 1]
```

### 9.3 using 声明（5.2）

`using` 是 TC39 Explicit Resource Management 提案引入的关键字，用于声明带清理逻辑的变量：

```typescript
class FileHandle implements Disposable {
  constructor(private path: string) {}
  [Symbol.dispose]() {
    console.log(`关闭 ${this.path}`);
  }
}

{
  using file = new FileHandle('/tmp/data');
  // 使用 file
} // 离开作用域自动调用 Symbol.dispose

// await using 用于异步资源
{
  await using conn = await pool.getConnection();
  // ...
} // 自动 await conn[Symbol.asyncDispose]()
```

### 9.4 NoInfer 工具类型（5.4）

`NoInfer<T>` 把类型从推导位置中排除：

```typescript
function createState<T>(initial: T, defaultState: T) {
  return { initial, defaultState };
}

// 旧版本：T 被推断为 string | number
const s1 = createState('hello', 123);

// 5.4+：用 NoInfer 限制 defaultState 的推导
function createState2<T>(initial: T, defaultState: NoInfer<T>) {
  return { initial, defaultState };
}

const s2 = createState2('hello', 123); // 编译错误：123 不能赋值给 'hello'
```

### 9.5 Object.groupBy / Map.groupBy（5.4）

```typescript
const items = [
  { kind: 'fruit', name: 'apple' },
  { kind: 'fruit', name: 'banana' },
  { kind: 'veggie', name: 'carrot' },
];

const grouped = Object.groupBy(items, item => item.kind);
// grouped: { fruit: [...], veggie: [...] }
```

### 9.6 推断类型谓词（5.5）

```typescript
// 5.5 之前：必须显式声明类型谓词
function isString(x: unknown): x is string {
  return typeof x === 'string';
}

// 5.5+：自动推断类型谓词
function isString2(x: unknown) {
  return typeof x === 'string';
}

const arr: unknown[] = ['a', 1, 'b'];
const strings = arr.filter(isString2);
// strings 类型在 5.5 自动推断为 string[]
```

### 9.7 迭代器助手方法（5.6）

ES2025 引入的 Iterator Helpers：

```typescript
function* naturals() {
  let i = 1;
  while (true) yield i++;
}

const squares = naturals()
  .map(x => x * x)
  .filter(x => x % 2 === 0)
  .take(5)
  .toArray();
// [4, 16, 36, 64, 100]
```

TypeScript 5.6 在 `lib.es2025.d.ts` 中提供了这些方法的类型定义。

## 10. 形式化语义与理论推导

### 10.1 const 类型参数的子类型关系

定义 widened 类型 $\text{widen}(\tau)$：

- $\text{widen}(\text{'a'}) = \text{string}$
- $\text{widen}(1) = \text{number}$
- $\text{widen}([1, 2]) = \text{number[]}$

const 类型参数的反向规则：

$$
\frac{\text{const } T \;\text{extends}\; \sigma \quad \Gamma \vdash e : \tau \quad \tau \sqsubseteq \sigma}{\Gamma \vdash T := \tau \;\text{(narrowing)}}
\quad
(\text{T-Const-Infer})
$$

而无 const 时：

$$
\frac{T \;\text{extends}\; \sigma \quad \Gamma \vdash e : \tau \quad \tau \sqsubseteq \sigma}{\Gamma \vdash T := \text{widen}(\tau) \;\text{(widening)}}
\quad
(\text{T-NoConst-Infer})
$$

### 10.2 satisfies 的推导规则

satisfies 操作符的推导规则：

$$
\frac{\Gamma \vdash e : \tau_1 \quad \Gamma \models \tau_1 \sqsubseteq \tau_2}{\Gamma \vdash (e \;\text{satisfies}\; \tau_2) : \tau_1}
\quad
(\text{T-Satisfies})
$$

其校验语义：

- 若 $\tau_1 \sqsubseteq \tau_2$，通过校验，返回 $\tau_1$。
- 若 $\tau_1 \not\sqsubseteq \tau_2$，编译错误。

与 as 的差异：

$$
\frac{\Gamma \vdash e : \tau_1 \quad (\tau_1 \sqsubseteq \tau_2 \lor \tau_2 \sqsubseteq \tau_1)}{\Gamma \vdash (e \;\text{as}\; \tau_2) : \tau_2}
\quad
(\text{T-As})
$$

as 不做严格校验（只要两类型有任意子类型关系即可），且改变类型为 $\tau_2$。

### 10.3 装饰器的代数语义

装饰器可视为类型层与运行时层的复合函数。设装饰器 $D$ 应用到类 $C$ 上：

$$
D(C) = C' \quad \text{其中}\; C' : \text{Class}
$$

多个装饰器按复合律组合：

$$
(A \circ B \circ C)(X) = A(B(C(X)))
$$

这与函数式编程中的函数复合一致。装饰器本质上是元编程层的 high-order function。

## 11. 对比分析

### 11.1 与 Java Annotation 的对比

| 特性 | TypeScript 装饰器 | Java Annotation |
| ---- | ----------------- | --------------- |
| 类型系统 | 强类型（context 类型化） | 弱类型（@Target 元注解） |
| 运行时 | 可修改类行为 | 仅元数据，需 reflect 处理 |
| 标准 | TC39 Stage 3 | Java SE 5+ |
| 处理器 | 装饰器函数本身 | Annotation Processor |
| 性能 | 装饰器在类定义时执行 | 编译期处理，运行时反射 |

### 11.2 与 Python decorator 的对比

| 特性 | TypeScript 装饰器 | Python decorator |
| ---- | ----------------- | ---------------- |
| 语法 | `@dec` | `@dec` |
| 应用范围 | 仅类与类成员 | 函数、类、方法均可 |
| 元数据 | context.metadata | 无内建，可用 `functools.wraps` |
| 参数 | (value, context) | 单参数（被装饰对象） |
| 标准 | TC39 Stage 3 | PEP 318（Python 2.4+） |

### 11.3 与 C# Attribute 的对比

C# Attribute 是元数据机制，不能修改被装饰对象的行为。TypeScript 装饰器可以返回新对象替换原对象，更接近元编程。

### 11.4 与 Rust attribute 的对比

Rust attribute（如 `#[derive(Debug)]`）是编译期宏，由编译器展开。TypeScript 装饰器在运行时执行，更灵活但性能略差。

## 12. 常见陷阱

### 12.1 const 类型参数与 readonly 的混淆

```typescript
// 错误理解：const 不会让参数变为 readonly
function f<const T extends unknown[]>(arr: T): T {
  return arr;
}

const r = f([1, 2, 3]);
r.push(4); // 5.0 之前：编译错误（推断为 readonly）
r.push(4); // 5.0+：编译通过（推断为非 readonly 数组）
```

const 类型参数仅影响推断宽度，不强制 readonly。要得到 readonly，需显式约束：

```typescript
function f<const T extends readonly unknown[]>(arr: T): T {
  return arr;
}
```

### 12.2 satisfies 与字面量推断的交互

```typescript
const x = { a: 1 } satisfies Record<string, number>;
// x.a 类型为 number（已拓宽）
```

虽然 satisfies 保留字面量，但对象字面量本身在初始化时已被拓宽。要保留字面量，需用 as const：

```typescript
const x = { a: 1 } as const satisfies Record<string, number>;
// x.a 类型为 1
```

### 12.3 Stage 3 装饰器与 experimentalDecorators 的兼容性

两者不能混用：

```json
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

启用 `experimentalDecorators` 后，TypeScript 仍按旧规则解析装饰器，5.0 的 Stage 3 装饰器签名不会生效。

### 12.4 装饰器返回值被忽略

```typescript
function wrong(value: Function, context: ClassMethodDecoratorContext) {
  return function (this: any, ...args: any[]) {
    console.log('called');
    return value.call(this, ...args);
  };
}
```

5.0 装饰器返回的新函数会**替换**原方法。但若装饰器返回 `void`（不返回任何值），原方法保持不变。这是 Stage 3 与 experimentalDecorators 的关键差异。

### 12.5 moduleResolution: bundler 与 node 混用

```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

`bundler` 假定代码由打包工具处理，不能直接用 `tsc` 输出代码。若项目需要 `tsc` 输出，应使用 `node16` 或 `nodenext`。

### 12.6 --verbatimModuleSyntax 与运行时副作用

```typescript
import './polyfill'; // 副作用导入
```

启用 `verbatimModuleSyntax` 后，未使用的导入不会被自动删除。如果导入有副作用（如 polyfill），需要保留。该配置让 TypeScript 不做删除决策，把删除工作交给打包工具。

### 12.7 枚举成员反向映射

```typescript
enum Color {
  Red,  // 0
  Green, // 1
}

// 旧版本：Color[0] === 'Red'，反向映射存在
// 5.0+：字面量枚举无反向映射，Color[0] 是 undefined
```

### 12.8 装饰器元数据与 Symbol.metadata

```typescript
class Foo {
  @someDecorator
  method() {}
}

// 5.2+：通过 Symbol.metadata 访问
const meta = Foo[Symbol.metadata];
```

但 `Symbol.metadata` 仅在启用 Stage 3 装饰器时存在。若项目仍用 experimentalDecorators，需要继续使用 `reflect-metadata`。

## 13. 工程实践

### 13.1 项目迁移策略

从 4.x 升级到 5.x 的推荐步骤：

1. **升级依赖**：
   ```bash
   npm install -D typescript@latest
   npm install -D @types/node@latest
   ```

2. **检查 tsconfig.json**：
   - 移除 `--importsNotUsedAsValues`、`--preserveValueImports`，改用 `--verbatimModuleSyntax`。
   - 评估是否启用 `moduleResolution: bundler`。
   - 评估是否启用 `--erasableSyntaxOnly`。

3. **修复编译错误**：
   - 枚举越界赋值。
   - 装饰器签名（若已启用 Stage 3）。
   - 模块解析差异。

4. **渐进式启用新特性**：
   - 第一阶段：仅升级 TS 版本，不启用新特性。
   - 第二阶段：在工具函数中引入 const 类型参数与 satisfies。
   - 第三阶段：在新建模块中引入 Stage 3 装饰器。
   - 第四阶段：评估枚举的替代方案。

### 13.2 tsconfig.json 推荐配置

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "strict": true,
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "useDefineForClassFields": true,
    "experimentalDecorators": false,
    "noEmit": true
  }
}
```

### 13.3 与构建工具集成

**Vite 配置示例**：

```typescript
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsconfigPaths(), // 自动应用 tsconfig.json 的 paths
  ],
  esbuild: {
    target: 'es2022',
    tsconfigRaw: {
      compilerOptions: {
        useDefineForClassFields: true,
      },
    },
  },
});
```

**Webpack 配置示例**：

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        options: {
          transpileOnly: true, // 只做转换，类型检查用 fork-ts-checker-webpack-plugin
        },
      },
    ],
  },
};
```

### 13.4 装饰器框架集成

**TypeDI 集成**：

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

```typescript
import { Service, Inject } from 'typedi';

@Service()
class UserRepository {
  findById(id: number) {
    return { id, name: 'Alice' };
  }
}

@Service()
class UserService {
  @Inject()
  private repo!: UserRepository;

  getUser(id: number) {
    return this.repo.findById(id);
  }
}
```

注：TypeDI 目前仍依赖 experimentalDecorators。若用 Stage 3 装饰器，需选用支持新标准的框架，如 `@microsoft/dependency-injection` 或自行实现。

### 13.5 CI 配置

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run build
```

```json
// package.json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "vite build"
  }
}
```

## 14. 案例研究

### 14.1 NestJS：装饰器驱动的 IoC 框架

NestJS 是 TypeScript 装饰器在生产环境最典型的应用案例。它通过装饰器声明：

- 控制器与路由（`@Controller`、`@Get`、`@Post`）
- 依赖注入（`@Injectable`、`@Inject`）
- 中间件与守卫（`@UseGuards`）
- 参数提取（`@Body`、`@Query`、`@Param`）

```typescript
@Controller('users')
@Injectable()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @UseGuards(AuthGuard)
  async getUser(@Param('id') id: string): Promise<User> {
    return this.userService.findById(Number(id));
  }
}
```

NestJS 当前仍依赖 experimentalDecorators，但官方已宣布将在 v11 中迁移到 Stage 3 装饰器。

### 14.2 tRPC：满足类型安全的 RPC

tRPC 在 5.x 时代广泛使用 satisfies：

```typescript
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

export const appRouter = t.router({
  getUser: t.procedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      return { id: input.id, name: 'Alice' };
    }),
  createUser: t.procedure
    .input(z.object({ name: z.string() }))
    .mutation(({ input }) => {
      return { id: '1', name: input.name };
    }),
}) satisfies TRPCRouterRecord;
```

satisfies 让路由表的类型既满足框架约束，又保留具体方法的精确类型。

### 14.3 React Router：const 类型参数与路由推断

```typescript
function defineRoutes<const T extends readonly (readonly [string, string])[]>(
  routes: T,
) {
  return {
    routes,
    navigate: (name: T[number][1]) => {
      const route = routes.find(([, n]) => n === name);
      if (route) window.location.href = route[0];
    },
  };
}

const router = defineRoutes([
  ['/', 'home'],
  ['/about', 'about'],
] as const);

router.navigate('home'); // OK
router.navigate('foo'); // 编译错误
```

const 类型参数让路由名在类型层被严格约束，拼写错误在编译期发现。

### 14.4 Drizzle ORM：satisfies 在 schema 定义中

```typescript
import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
}) satisfies PgTable<'users'>;
```

satisfies 确保表定义满足 Drizzle ORM 的接口约束，同时保留每个字段的精确类型，便于后续查询推导。

### 14.5 Fastify：JSON Schema 与 satisfies

```typescript
import Fastify from 'fastify';

const opts = {
  schema: {
    body: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
    },
  },
} satisfies FastifyRouteOptions;

const app = Fastify();
app.post('/users', opts, async (req, reply) => {
  // req.body 类型为 { name: string; age?: number }
  return { id: 1, ...req.body };
});
```

## 15. 与 ECMAScript 标准化的关系

### 15.1 TypeScript 与 TC39 的协作

TypeScript 团队与 TC39 保持紧密协作。TypeScript 通常在提案进入 Stage 3 后立即提供类型支持：

| TC39 提案 | Stage | TypeScript 支持 |
| --------- | ----- | --------------- |
| Decorators | Stage 3 (2022) | 5.0 (2023) |
| Explicit Resource Management | Stage 3 (2023) | 5.2 (2023) |
| Import Attributes | Stage 3 (2023) | 5.3 (2023) |
| Iterator Helpers | Stage 3 (2024) | 5.6 (2024) |
| Set Methods | Stage 3 (2024) | 5.6 (2024) |

### 15.2 --erasableSyntaxOnly 的标准化意义

5.8 引入 `--erasableSyntaxOnly` 是 TypeScript 与 ECMAScript 标准对齐的关键一步。它要求 TypeScript 代码仅使用"可擦除语法"，即只通过类型擦除即可移除的语法：

- 允许：`interface`、`type`、`as`、`satisfies`、`import type`
- 禁止：`enum`、`namespace`、`parameter properties`

这与 Node.js 22+ 内建 TypeScript 支持（type stripping）的需求一致。Node.js 22 仅做类型擦除，不执行代码生成，因此要求 TypeScript 代码必须可擦除。

### 15.3 TypeScript 在标准化进程中的角色

TypeScript 不仅是 ECMAScript 标准的实现者，也是参与者。多个 TC39 提案（如 const type parameters）最初在 TypeScript 中实验，再进入 TC39 流程。

## 16. 性能与编译器优化

### 16.1 5.0 的性能提升

5.0 相比 4.9 的主要性能改进：

- 编译速度提升 10-15%
- 内存占用降低 20%
- 包体积减小 26%（从 63MB 到 47MB）
- IDE 增量响应时间提升 30%

### 16.2 性能优化策略

**策略 1：模块化编译器**

旧版本 `compiler/types.ts` 单文件 25,000 行，难以优化。5.0 拆分为多个语义模块，便于 tree-shaking 与缓存。

**策略 2：诊断信息延迟生成**

旧版本在每次类型检查时即时生成诊断信息字符串，5.0 改为延迟生成（仅在错误实际发生时）。

**策略 3：类型缓存改进**

5.0 改进了类型缓存策略，减少重复计算。对大型项目，缓存命中率从 60% 提升到 75%。

### 16.3 监控编译性能

```bash
tsc --extendedDiagnostics
```

输出关键指标：

```
Files:                          1240
Lines of TypeScript:          215634
Identifiers:                  887651
Symbols:                     1234567
Types:                       4567890
Instantiations:             12345678
Memory used:               1234.56 MB
Check time:                 8.45s
Total time:                 11.45s
```

`Instantiations` 反映类型体操的总计算量，5.0+ 对相同代码的 Instantiations 通常比 4.9 减少 10-20%。

## 17. 常见问题与故障排查

### 17.1 装饰器不工作

**症状**：装饰器在运行时未被调用。

**原因 1**：未启用装饰器。

```json
// 旧版（experimentalDecorators）
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}

// 5.0+（Stage 3 装饰器，无需配置）
```

**原因 2**：装饰器签名错误。

```typescript
// 错误：使用旧签名
function dec(target: any, key: string) {}

// 正确：Stage 3 签名
function dec(value: Function, context: ClassMethodDecoratorContext) {}
```

### 17.2 satisfies 与 as 的选择

**规则**：能用 satisfies 就不用 as。

| 场景 | 推荐用法 |
| ---- | -------- |
| 校验对象字面量满足接口 | `satisfies` |
| 类型断言（如 `unknown as string`） | `as` |
| 显式拓宽类型 | `as` |
| 保留字面量类型 | `satisfies` |

### 17.3 moduleResolution: bundler 报错

**常见错误**：`Cannot find module './foo' or its corresponding type declarations.`

**原因**：相对路径未带扩展名，但项目使用 node 解析。

**解决**：切换到 `bundler` 或显式带扩展名。

### 17.4 --verbatimModuleSyntax 报错

**错误**：`'User' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.`

**修复**：

```typescript
// 修改前
import { User } from './types';

// 修改后
import type { User } from './types';
// 或
import { type User } from './types';
```

## 18. 习题

### 18.1 填空题（fill-blank）

1. TypeScript 5.0 引入的 const 类型参数语法为____，它会让类型参数推断为最窄的字面量类型。
2. satisfies 操作符的语义是____。
3. TypeScript 5.0 实现的装饰器标准是 ECMAScript ____阶段提案。
4. moduleResolution: bundler 与 node16/nodenext 的核心差异在于 bundler 允许____和____。
5. TypeScript 5.0 中 tsconfig.json 的 extends 字段支持____，按顺序合并。
6. TypeScript 5.8 引入的 ____ 配置选项只允许使用可擦除语法，禁止 enum 等。
7. --verbatimModuleSyntax 隐含启用了 ____ 配置。
8. Stage 3 装饰器的 context.metadata 通过 ____ 符号暴露到类本身。
9. 5.4 引入的 NoInfer<T> 工具类型的作用是____。
10. 5.5 的 inferred type predicates 解决了____问题。

### 18.2 选择题（choice）

1. 关于 const 类型参数，下列说法正确的是？
   - A. const 类型参数会改变函数的运行时行为，使其参数被视为 const
   - B. const 类型参数仅影响类型推断，使推断结果保留更窄的字面量类型
   - C. const 类型参数等价于把参数声明为 readonly
   - D. const 类型参数只能用于函数，不能用于类型别名

2. 下列关于 satisfies 操作符的描述，错误的是？
   - A. satisfies 不会拓宽字面量类型
   - B. satisfies 会触发类型校验，若不满足则编译错误
   - C. satisfies 等价于 as，仅做类型断言
   - D. satisfies 可用于对象字面量、数组、函数返回值等多种表达式

3. TypeScript 5.0 装饰器与 experimentalDecorators 的核心差异是什么？
   - A. 5.0 装饰器不支持方法装饰器
   - B. 5.0 装饰器的 context 参数提供 metadata 字段，标准化元数据存储
   - C. 5.0 装饰器只能用于类本身，不能用于类成员
   - D. 5.0 装饰器在运行时会自动注入 reflect-metadata

4. 关于 --moduleResolution: bundler，下列描述错误的是？
   - A. 需要配合 --module: esnext 使用
   - B. 允许相对路径导入不带扩展名
   - C. 强制要求 package.json 必须包含 exports 字段
   - D. 模拟 Vite/Webpack/Rollup 等打包工具的解析行为

5. TypeScript 5.4 引入的 NoInfer<T> 工具类型的作用是？
   - A. 禁止类型推断，强制显式标注
   - B. 把 T 从推导位置中排除，避免反向约束污染推导结果
   - C. 等价于 unknown，但更明确
   - D. 用于禁止某个泛型参数的使用

6. 关于 --erasableSyntaxOnly，下列说法正确的是？
   - A. 仅适用于库开发
   - B. 禁止使用 enum、namespace、parameter properties
   - C. 自动删除未使用的导入
   - D. 与 verbatimModuleSyntax 等价

7. 关于 5.5 的 inferred type predicates，下列说法错误的是？
   - A. 自动为返回 boolean 的函数推断类型谓词 (x is T)
   - B. 仅在控制流分析能确定时推断
   - C. 推断的类型谓词不可靠，仅用于提示
   - D. 兼容旧的显式类型谓词

8. 关于 --verbatimModuleSyntax，下列说法正确的是？
   - A. 自动删除未使用的导入
   - B. 强制类型导入必须用 import type
   - C. 与 isolatedModules 互斥
   - D. 仅适用于 ESM 项目

### 18.3 代码修复题（code-fix）

1. 下列代码无法保留 routes 数组的字面量类型。请修复（不修改函数体）：

```typescript
function createRoutes<T extends readonly string[]>(routes: T): T {
  return routes;
}
const routes = createRoutes(['/home', '/about']);
// routes 类型被推断为 string[]
```

2. 下列代码用 as 做断言，缺乏编译期安全校验。请改用 satisfies：

```typescript
const config = {
  port: 3000,
  host: 'localhost',
} as Record<string, string | number>;
```

3. 下列装饰器在 TS 5.0 标准下无法正确读取方法名，请修复：

```typescript
function log(target: any, key: string, desc: PropertyDescriptor) {
  const orig = desc.value;
  desc.value = function (...args: any[]) {
    console.log(`calling ${key}`);
    return orig.call(this, ...args);
  };
}
```

4. 下列枚举有越界赋值问题，请用 5.0 的枚举现代化特性修复：

```typescript
enum Status {
  Active = 1,
  Inactive = 2,
}

const s: Status = 999; // 期望编译错误
```

5. 下列代码在 --verbatimModuleSyntax 启用时编译错误，请修复：

```typescript
import { User, createUser } from './api';
// User 是类型，createUser 是值
```

### 18.4 开放题（open-ended）

1. 请用 300 字以内论述：为什么 TypeScript 5.0 选择实现 Stage 3 装饰器标准，而不是继续维护 experimentalDecorators？这对生态会有什么影响？

2. 假设你正在维护一个 50 万行代码的 TypeScript 项目，正在从 4.9 升级到 5.x。请制定详细的迁移计划，覆盖装饰器、模块解析、枚举、--verbatimModuleSyntax 等关键变化点。

3. 比较以下三种定义路由表的方案，从类型安全、性能、可维护性三个维度评估：
   - 方案 A：使用 const 类型参数 + 字面量元组
   - 方案 B：使用 as const 对象
   - 方案 C：使用 enum

4. 在 GitHub 上找出一个仍在使用 experimentalDecorators 的开源项目，分析其迁移到 Stage 3 装饰器的难点，提出迁移建议。

5. 描述如何利用 Stage 3 装饰器的 context.metadata 实现一个轻量级依赖注入框架。要求：
   - 不依赖 reflect-metadata
   - 支持构造函数注入
   - 支持生命周期管理（singleton/transient）

## 19. 参考文献

[1] Rosenwasser, D. 2023. Announcing TypeScript 5.0. Microsoft Developer Blog. Retrieved July 20, 2026 from https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/

[2] Rosenwasser, D. 2024. Announcing TypeScript 5.4. Microsoft Developer Blog. Retrieved July 20, 2026 from https://devblogs.microsoft.com/typescript/announcing-typescript-5-4/

[3] Rosenwasser, D. 2024. Announcing TypeScript 5.5. Microsoft Developer Blog. Retrieved July 20, 2026 from https://devblogs.microsoft.com/typescript/announcing-typescript-5-5/

[4] Ehrenberg, R. and Voss, G. 2023. ECMAScript Decorators Proposal, Stage 3. TC39. https://github.com/tc39/proposal-decorators

[5] Bierman, G. M., Abadi, M., and Torgersen, M. 2014. Understanding TypeScript. In *ECOOP 2014 — Object-Oriented Programming* (pp. 257-281). Springer. DOI: 10.1007/978-3-662-44202-9_11

[6] Bracha, G. and Ungar, D. 2004. Mirrors: design principles for meta-level facilities of object-oriented programming languages. In *OOPSLA '04* (pp. 331-344). DOI: 10.1145/1028976.1029004

[7] Pierce, B. C. 2002. *Types and Programming Languages*. MIT Press. ISBN 978-0-262-16209-8.

[8] Katz, Y. 2014. Decorators Proposal, Stage 1. TC39. https://github.com/wycats/javascript-decorators

[9] Ehrenberg, D. 2019. Decorators Proposal, Stage 2. TC39. https://github.com/tc39/proposal-decorators/tree/7d4add9d04e6c8d558c4c8b16d53c92bdfac12ec

[10] Microsoft. 2023. TypeScript 5.2: Explicit Resource Management. https://devblogs.microsoft.com/typescript/announcing-typescript-5-2/

[11] Microsoft. 2023. TypeScript 5.3: Import Attributes. https://devblogs.microsoft.com/typescript/announcing-typescript-5-3/

[12] Microsoft. 2024. TypeScript 5.6: Iterator Helpers. https://devblogs.microsoft.com/typescript/announcing-typescript-5-6/

[13] Microsoft. 2025. TypeScript 5.8: Erasable Syntax Only. https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/

[14] Fu, A. 2020. type-challenges: Collection of TypeScript type challenges. GitHub. https://github.com/type-challenges/type-challenges

[15] ECMA International. 2024. ECMAScript 2024 Language Specification. ECMA-262, 15th Edition. https://tc39.es/ecma262/

[16] Hosoya, H. and Pierce, B. C. 2003. Regular expression pattern matching for XML. *Journal of Functional Programming* 13(6), 961-1004. DOI: 10.1017/S0956796803001131

## 20. 延伸阅读

### 20.1 书籍

- Boris Cherny. *Programming TypeScript*. O'Reilly Media, 2nd Edition, 2023.
- Stefan Baumgartner. *TypeScript in 50 Lessons*. Smashing Magazine, 2020.
- Matt Pocock. *Total TypeScript: The Essentials*. 2024.

### 20.2 论文

- Bierman, G., Abadi, M., Torgersen, M. "Understanding TypeScript." ECOOP 2014.
- Bracha, G., Ungar, D. "Mirrors: design principles for meta-level facilities." OOPSLA 2004.

### 20.3 开源项目

- TypeScript: https://github.com/microsoft/TypeScript
- TC39 Decorators Proposal: https://github.com/tc39/proposal-decorators
- NestJS: https://github.com/nestjs/nest
- tRPC: https://github.com/trpc/trpc
- Drizzle ORM: https://github.com/drizzle-team/drizzle-orm
- type-fest: https://github.com/sindresorhus/type-fest

### 20.4 在线资源

- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/
- TypeScript 5.0 Release Notes: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html
- TypeScript 5.4 Release Notes: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html
- TypeScript 5.5 Release Notes: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html
- Total TypeScript: https://www.totaltypescript.com/
- Matt Pocock's Blog: https://www.totaltypescript.com/articles

### 20.5 视频课程

- Anders Hejlsberg. *TypeScript 5.0: A New Era*. Microsoft Build 2023.
- Daniel Rosenwasser. *TypeScript 5.x: What's New*. TSConf 2024.
- Matt Pocock. *Total TypeScript: Pro Workflows*. 2024.

## 21. 附录：TypeScript 5.x 配置速查表

### 21.1 tsconfig.json 完整推荐配置

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],

    "strict": true,
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,

    "verbatimModuleSyntax": true,
    "isolatedModules": true,

    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "useDefineForClassFields": true,

    "allowImportingTsExtensions": true,
    "noEmit": true,

    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 21.2 装饰器配置对比

| 配置 | experimentalDecorators | Stage 3 装饰器 |
| ---- | ---------------------- | --------------- |
| `experimentalDecorators` | `true` | `false` 或不设置 |
| `emitDecoratorMetadata` | `true`（可选） | 无需 |
| `useDefineForClassFields` | `false` 推荐 | `true` 推荐 |
| 依赖包 | `reflect-metadata` | 无 |

### 21.3 模块解析策略对比

```json
// node16/nodenext
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext"
  }
}

// bundler
{
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}

// classic（不推荐）
{
  "compilerOptions": {
    "module": "amd",
    "moduleResolution": "classic"
  }
}
```

### 21.4 常用工具类型与操作符

```typescript
// satisfies
const x = { a: 1 } satisfies Record<string, number>;

// const 类型参数
function f<const T extends readonly string[]>(arr: T): T {
  return arr;
}

// NoInfer（5.4+）
function createState<T>(initial: T, defaultState: NoInfer<T>) {
  return { initial, defaultState };
}

// import type
import type { User } from './types';
import { type User, createUser } from './api';
```

### 21.5 Stage 3 装饰器模板

```typescript
// 方法装饰器
function methodDecorator<This, Args extends any[], Return>(
  value: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This>,
) {
  return function (this: This, ...args: Args): Return {
    console.log(`Calling ${String(context.name)}`);
    return value.call(this, ...args);
  };
}

// 类装饰器
function classDecorator<T extends new (...args: any[]) => any>(
  value: T,
  context: ClassDecoratorContext<T>,
): T {
  return class extends value {
    constructor(...args: any[]) {
      super(...args);
      console.log(`Instantiating ${context.name}`);
    }
  };
}

// 字段装饰器
function fieldDecorator(
  value: undefined,
  context: ClassFieldDecoratorContext,
) {
  return function (initialValue: unknown) {
    console.log(`Field ${String(context.name)} initialized with`, initialValue);
    return initialValue;
  };
}

// accessor 装饰器
function accessorDecorator<This, V>(
  target: ClassAccessorDecoratorTarget<This, V>,
  context: ClassAccessorDecoratorContext<This, V>,
): ClassAccessorDecoratorResult<This, V> {
  const { get, set } = target;
  return {
    get(this: This) {
      console.log(`get ${String(context.name)}`);
      return get.call(this);
    },
    set(this: This, value: V) {
      console.log(`set ${String(context.name)} =`, value);
      set.call(this, value);
    },
  };
}
```

## 22. 学习路径建议

### 22.1 入门阶段（1-2 周）

1. 阅读 TypeScript 5.0 官方 release notes。
2. 在测试项目中尝试 const 类型参数与 satisfies。
3. 编写一个简单的 Stage 3 装饰器（如日志装饰器）。

### 22.2 进阶阶段（3-4 周）

1. 阅读每个版本的 release notes（5.0 到 5.8）。
2. 在实际项目中引入 moduleResolution: bundler。
3. 评估项目是否适合启用 --erasableSyntaxOnly。
4. 尝试把一个 experimentalDecorators 装饰器迁移到 Stage 3。

### 22.3 高级阶段（2-3 个月）

1. 阅读 TC39 装饰器提案与相关讨论。
2. 实现一个基于 Stage 3 装饰器的依赖注入框架。
3. 关注 TypeScript GitHub issues 中的设计讨论。
4. 参与开源项目的 5.x 升级工作。

### 22.4 精通阶段（持续）

1. 阅读 TypeScript 编译器源码（`src/compiler/checker.ts`）。
2. 关注 TC39 后续提案（如 Iterator Helpers、Set Methods 的标准化进程）。
3. 参与 TypeScript 设计会议的公开讨论。
4. 撰写技术博客，分享迁移经验与最佳实践。

## 23. 结语

TypeScript 5.x 是 TypeScript 语言史上的一个分水岭。它不仅是新特性的集合，更是语言设计哲学的转向：

- **从 TS 专属到 ECMAScript 标准对齐**：const 类型参数、Stage 3 装饰器、--erasableSyntaxOnly 都体现了这一趋势。
- **从松散到严格**：枚举现代化、--verbatimModuleSyntax、NoInfer 等让类型系统更精确。
- **从单体到模块化**：编译器内部模块化、tsconfig 多配置继承让大型项目更易管理。
- **从工具到生态**：与 Vite/SWC/Babel 等工具的协作更加紧密。

掌握 TypeScript 5.x 的核心要点：

- **const 类型参数**：让泛型推断更精确，避免字面量拓宽。
- **satisfies**：在不丢失字面量类型的前提下做编译期校验。
- **Stage 3 装饰器**：与 ECMAScript 标准对齐的元编程机制。
- **moduleResolution: bundler**：与现代打包工具协作的模块解析策略。
- **枚举现代化**：枚举成员成为独立字面量类型，越界赋值被禁止。
- **--verbatimModuleSyntax**：类型与值显式分离，便于工具链处理。

掌握本模块后，读者应能：

- 在生产项目中正确使用 TypeScript 5.x 的新特性。
- 制定从 4.x 升级到 5.x 的迁移计划。
- 评估新特性对项目可维护性与性能的影响。
- 跟进 TC39 标准化进程，预判 TypeScript 的未来演进方向。

TypeScript 5.x 标志着这门语言从"JavaScript 的类型层"向"ECMAScript 的标准化参与者"的蜕变。理解 5.x 不仅是理解新特性，更是理解现代 JavaScript 生态的演进脉络。
