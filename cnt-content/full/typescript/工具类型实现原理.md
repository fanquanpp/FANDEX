---
order: 66
title: 工具类型实现原理
module: typescript
category: TypeScript
difficulty: intermediate
description: 内置工具类型的实现与自定义
author: fanquanpp
updated: '2026-06-14'
related:
  - typescript/命名空间与模块
  - typescript/枚举进阶
  - typescript/条件类型分发
  - typescript/类型推断infer扩展
prerequisites:
  - typescript/语法速查
---

## 第一章 概述

### 1.1 为什么需要理解工具类型实现原理

TypeScript 内置了二十余种工具类型（Utility Types），它们位于 `lib.d.ts` 中，是日常类型编程的基础设施。许多开发者熟练使用 `Partial<T>`、`Pick<T, K>`、`Omit<T, K>`、`ReturnType<T>` 等工具类型，却很少深入思考它们是如何实现的。

理解工具类型的实现原理有三个层次的动机：

1. **认知层面**：工具类型是 TypeScript 类型系统原语（映射类型、条件类型、infer、模板字面量类型）的组合应用。理解它们就是理解类型系统的"语法词汇表"，是构建复杂类型的入门必经之路。
2. **工程层面**：当内置工具类型无法满足需求时，我们需要编写自定义工具类型。掌握内置工具类型的实现，能让我们以一致的风格编写自定义工具类型，保持代码库的类型代码风格统一。
3. **学术层面**：TypeScript 的工具类型设计参考了函数式编程中的组合子（Combinator）思想，每个工具类型都是一个"类型级函数"，它们之间通过组合可以表达极其复杂的类型变换。理解这些组合子的设计，是理解"类型即程序"（Types as Programs）范式的重要一步。

本教程将系统讲解 TypeScript 内置工具类型的实现原理，按功能分类剖析每一个工具类型的源码、设计动机、变体与陷阱，并展示如何基于相同的原理构建自定义工具类型。

### 1.2 学习目标

完成本教程后，读者将能够：

1. 复现 TypeScript 内置的全部工具类型实现，理解每一行代码的设计意图。
2. 区分同态映射与非同态映射在工具类型中的应用场景。
3. 掌握条件类型与 `infer` 在工具类型中的标准模式，能够独立编写 `ReturnType`、`Parameters` 这类基于 `infer` 的工具类型。
4. 理解分布式条件类型对 `Exclude`、`Extract`、`NonNullable` 的影响，避免常见陷阱。
5. 设计自定义工具类型，覆盖深度操作、键提取、值类型转换等常见需求。
6. 在大型项目中合理使用工具类型，避免性能陷阱与可读性灾难。

### 1.3 本教程的定位

本教程是 TypeScript 工具类型的"原理篇"，与《映射类型进阶》、《条件类型与 infer》等教程形成互补。前者侧重语法机制，本教程侧重"如何用这些语法机制构建可复用的工具"。

参考 Stanford CS107《计算机组织系统》对"抽象层次"的讲解方式：每一层抽象都建立在其下层之上，理解下层原理能让我们更有效地使用上层工具。工具类型是类型系统中的"中层抽象"——它封装了映射类型与条件类型的复杂细节，为业务代码提供简洁的接口。

### 1.4 工具类型的分类体系

TypeScript 内置工具类型可分为六大类：

| 类别 | 代表工具类型 | 核心机制 |
|------|-------------|---------|
| 属性修饰类 | `Partial`、`Required`、`Readonly`、`Mutable` | 同态映射 + 修饰符 |
| 对象变换类 | `Pick`、`Omit`、`Record` | 映射类型 + 键集合操作 |
| 联合类型类 | `Exclude`、`Extract`、`NonNullable` | 分布式条件类型 |
| 函数推断类 | `Parameters`、`ReturnType`、`ConstructorParameters`、`InstanceType` | `infer` 提取 |
| 字符串变换类 | `Uppercase`、`Lowercase`、`Capitalize`、`Uncapitalize` | 内置字符串类型 |
| 异步与上下文类 | `Awaited`、`ThisType` | 递归条件类型 + 类型上下文 |

本教程将按类别逐一讲解，每类都从基础实现到高级变体。

### 1.5 核心问题导引

阅读本教程时请带着以下问题：

1. **同态 vs 非同态**：为什么 `Partial<T>` 保留 `readonly`，而 `Record<keyof T, V>` 不保留？这背后的设计哲学是什么？
2. **分布式条件类型**：`Exclude<T, U>` 的实现是 `T extends U ? never : T`，为什么在 `T` 是联合类型时，这个表达式会"分发"？
3. **infer 的位置**：`Parameters<T>` 中 `infer P` 出现在 `(...args: infer P) => any` 的参数位置，这一位置的语义是什么？为什么不能写成 `(args: infer P) => any`？
4. **字符串类型的内置实现**：`Uppercase<S>` 是如何实现的？为什么它不需要我们手写递归？
5. **Awaited 的递归**：`Awaited<T>` 如何处理嵌套的 `Promise<Promise<T>>`？它的递归终止条件是什么？

## 第二章 基础概念

### 2.1 工具类型的本质：类型级函数

工具类型本质上是类型级的函数。以 `Partial<T>` 为例：

```typescript
type Partial<T> = {
  [P in keyof T]?: T[P];
};
```

它接受一个类型参数 `T`，返回一个新的类型。数学上，可以表示为：

$$
\mathrm{Partial}: \mathrm{Type} \to \mathrm{Type}
$$

这一定义与值级函数 `f: A \to B` 在结构上完全同构。TypeScript 的类型系统是图灵完备的，工具类型是其中的"标准库"——如同 JavaScript 的 `Array.prototype.map`、`Object.keys` 等内置方法。

### 2.2 工具类型的组合性

工具类型的强大之处在于其组合性（Composability）。多个工具类型可以组合使用，形成更复杂的变换：

```typescript
type ReadonlyPartial<T> = Readonly<Partial<T>>;           // 全只读 + 全可选
type PickPartial<T, K extends keyof T> = Partial<Pick<T, K>>; // 部分字段可选
type Nullable<T> = { [P in keyof T]: T[P] | null };       // 全字段可空
```

这种组合性源自函数式编程的组合子思想。每个工具类型都是一个小而专注的"类型变换函数"，通过组合可以表达任意复杂的类型关系。

### 2.3 同态性（Homomorphism）回顾

同态性是理解工具类型的关键概念。形如 `{ [P in keyof T]: ... }` 的映射类型是"同态"的，它会保留原类型的 `readonly` 与 `?` 修饰符。形如 `{ [P in K]: ... }`（其中 `K` 不是 `keyof T`）的映射类型是"非同态"的，不会保留任何修饰符。

| 工具类型 | 同态性 | 保留修饰符 |
|---------|-------|----------|
| `Partial<T>` | 同态 | 保留 `readonly`，新增 `?` |
| `Required<T>` | 同态 | 保留 `readonly`，移除 `?` |
| `Readonly<T>` | 同态 | 新增 `readonly`，保留 `?` |
| `Pick<T, K>` | 同态 | 完整保留 |
| `Record<K, V>` | 非同态 | 不保留任何 |
| `Omit<T, K>` | 非同态（实现为 `Pick<T, Exclude<keyof T, K>>`） | 不保留 |

理解这一区别能帮助我们预测工具类型的输出形态，避免意外的类型行为。

### 2.4 分布式条件类型（Distributive Conditional Types）

条件类型 `T extends U ? X : Y` 在 `T` 是"裸类型参数"（naked type parameter）且是联合类型时，会"分发"应用：

$$
(A \cup B) \text{ extends } U ? X : Y \equiv (A \text{ extends } U ? X : Y) \cup (B \text{ extends } U ? X : Y)
$$

这一规则对工具类型至关重要。`Exclude<T, U>` 的实现是 `T extends U ? never : T`，正是利用了分布式条件类型：

```typescript
type Exclude<T, U> = T extends U ? never : T;

type Result = Exclude<"a" | "b" | "c", "a">;
// 分发过程：
// "a" extends "a" ? never : "a"  → never
// "b" extends "a" ? never : "b"  → "b"
// "c" extends "a" ? never : "c"  → "c"
// 联合：never | "b" | "c" = "b" | "c"
```

如果将 `T` 包裹在元组中（如 `[T] extends [U] ? ... : ...`），则不会分发。这是控制分发行为的关键技巧。

### 2.5 infer 的位置语义

`infer` 关键字用于在条件类型中"提取"类型。它的语义取决于出现的位置：

| 位置 | 提取内容 | 示例 |
|------|---------|------|
| 函数参数位置 | 参数元组 | `(...args: infer P) => any` → `P` 为参数元组 |
| 函数返回值位置 | 返回类型 | `(...args: any[]) => infer R` → `R` 为返回类型 |
| 数组元素位置 | 元素类型 | `(infer E)[]` → `E` 为元素类型 |
| Promise 内部 | 解析值 | `Promise<infer T>` → `T` 为解析值 |
| 模板字面量位置 | 字符串片段 | `` `${infer Head}${infer Tail}` `` → `Head`、`Tail` 为片段 |
| 元组特定位置 | 该位置元素 | `[infer A, infer B]` → `A`、`B` 为元组前两个元素 |

理解这些位置语义，是编写函数推断类工具类型的基础。

## 第三章 历史演变

### 3.1 TypeScript 2.1：工具类型的诞生

TypeScript 2.1（2016 年 12 月）引入映射类型时，同时发布了首批工具类型：`Partial`、`Readonly`、`Pick`、`Record`。这四个工具类型奠定了"基于映射类型的对象变换"范式。

### 3.2 TypeScript 2.8：条件类型带来的爆发

TypeScript 2.8（2018 年 3 月）引入条件类型与 `infer`，带来了第二批工具类型：`Exclude`、`Extract`、`NonNullable`、`Parameters`、`ReturnType`、`InstanceType`、`ConstructorParameters`。这一版本的发布使 TypeScript 的类型系统表达力实现了质的飞跃。

### 3.3 TypeScript 4.0：元组与模板字面量

TypeScript 4.0（2020 年 8 月）改进了元组类型，使可变元组（如 `[infer A, ...infer B]`）成为可能。这一改进使 `Parameters`、`ReturnType` 等工具类型能更精确地处理重载函数。

### 3.4 TypeScript 4.1：模板字面量工具类型

TypeScript 4.1（2020 年 11 月）引入模板字面量类型与 `Uppercase`、`Lowercase`、`Capitalize`、`Uncapitalize` 四个字符串工具类型。这四个工具类型是编译器内置的，不需要递归实现。

### 3.5 TypeScript 4.5：Awaited 的加入

TypeScript 4.5（2021 年 11 月）正式加入 `Awaited<T>` 工具类型，用于递归地解析 `Promise`。这一工具类型在 `async/await` 类型推断中扮演关键角色。

### 3.6 TypeScript 5.x：稳定与优化

TypeScript 5.0+ 对工具类型的实现进行了若干修复与优化，包括对 `Omit` 的严格化（保留 `readonly` 的争议性变更）以及对 `Awaited` 的边界情况修复。

## 第四章 设计哲学

### 4.1 最小原语原则

TypeScript 工具类型的设计遵循"最小原语原则"：每个工具类型只做一件事，且做到极致。例如 `Partial<T>` 只负责"让所有属性可选"，不涉及其他变换；`Pick<T, K>` 只负责"按键挑选"，不涉及值变换。

这一原则源自 Unix 哲学："Do one thing and do it well"。小工具通过组合产生大威力，比一个臃肿的"万能工具"更易理解、更易维护。

### 4.2 同态默认原则

TypeScript 的对象变换工具类型默认采用同态映射，以保留原类型的修饰符。这是"渐进式类型增强"（Gradual Typing）哲学的体现：类型变换应当是"加性的"（additive），而非"破坏性的"（destructive）。

例如 `Partial<T>` 在新增 `?` 修饰符的同时保留 `readonly`，是因为"部分化"语义不应破坏"只读"约束。如果 `Partial` 同时移除了 `readonly`，使用者会感到意外。

### 4.3 分布式优先原则

条件类型在裸类型参数上自动分发，这一设计使 `Exclude<T, U>`、`Extract<T, U>` 等联合类型操作工具类型能"自然地"工作，无需显式遍历联合。这是类型系统为"联合类型作为一等公民"提供便利的设计决策。

### 4.4 编译器内置优化

字符串工具类型（`Uppercase` 等）与 `Awaited` 是编译器内置的，不通过递归实现。这是因为字符串变换与 Promise 解析在类型层面计算成本高，编译器内置能显著提升性能。这一设计启示我们：自定义工具类型时应避免过度递归，必要时考虑代码生成。

## 第五章 属性修饰类工具类型

### 5.1 Partial：全属性可选

```typescript
type Partial<T> = {
  [P in keyof T]?: T[P];
};
```

**实现解析**：

- `[P in keyof T]`：同态映射，遍历 `T` 的所有键。
- `?`：在映射后追加可选修饰符。
- 同态映射保留原类型的 `readonly`，因此 `Partial<{ readonly id: number }>` 的结果为 `{ readonly id?: number }`。

**使用示例**：

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

type PartialUser = Partial<User>;
// { id?: number; name?: string; email?: string }

function updateUser(id: number, patch: Partial<User>) {
  // 只需传入部分字段
}
```

**变体：DeepPartial**

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
```

`DeepPartial` 递归地将所有嵌套属性可选化，常用于配置对象、PATCH 请求体等场景。

### 5.2 Required：全属性必选

```typescript
type Required<T> = {
  [P in keyof T]-?: T[P];
};
```

**实现解析**：

- `-?`：移除可选修饰符。这是 TypeScript 2.8 引入的"修饰符移除"语法。
- 同态映射保留 `readonly`。

**使用示例**：

```typescript
interface Config {
  port?: number;
  host?: string;
  debug?: boolean;
}

type RequiredConfig = Required<Config>;
// { port: number; host: string; debug: boolean }

function createServer(config: RequiredConfig>) {
  // 所有字段都是必选的，无需判断 undefined
}
```

### 5.3 Readonly：全属性只读

```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};
```

**实现解析**：

- `readonly`：在映射后追加只读修饰符。
- 同态映射保留 `?`。

**使用示例**：

```typescript
interface MutablePoint {
  x: number;
  y: number;
}

type Point = Readonly<MutablePoint>;
// { readonly x: number; readonly y: number }

const p: Point = { x: 0, y: 0 };
// p.x = 1; // 编译错误：只读属性
```

**变体：DeepReadonly**

```typescript
type DeepReadonly<T> = T extends object
  ? T extends Function
    ? T
    : { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T;
```

### 5.4 Mutable：移除只读（非内置）

TypeScript 未内置 `Mutable<T>`（与 `Readonly` 对偶），但实现很简单：

```typescript
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};
```

**使用场景**：测试代码中需要修改只读对象时，或需要将不可变数据结构转换为可变形式。

```typescript
interface ImmutableConfig {
  readonly port: number;
  readonly host: string;
}

type MutableConfig = Mutable<ImmutableConfig>;
// { port: number; host: string }

const config: MutableConfig = { port: 3000, host: "localhost" };
config.port = 8080; // OK
```

### 5.5 属性修饰类的组合

```typescript
// 全可选 + 全只读
type ReadonlyPartial<T> = Readonly<Partial<T>>;

// 必选 + 可变
type RequiredMutable<T> = Required<Mutable<T>>;

// 部分字段可选
type PartialPick<T, K extends keyof T> = Partial<Pick<T, K>>;

// 部分字段必选
type RequiredPick<T, K extends keyof T> = Required<Pick<T, K>>;
```

## 第六章 对象变换类工具类型

### 6.1 Pick：按键挑选

```typescript
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};
```

**实现解析**：

- `K extends keyof T`：约束 `K` 为 `T` 的键的子集。
- `[P in K]`：遍历 `K` 中的键。注意这里 `K` 是 `keyof T` 的子集，所以仍属同态映射，保留修饰符。

**使用示例**：

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
}

type SafeUser = Pick<User, "id" | "name" | "email">;
// { id: number; name: string; email: string }
```

### 6.2 Omit：按键排除

`Omit` 在 TypeScript 3.5 中正式加入内置工具类型。其实现为：

```typescript
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
```

**实现解析**：

- `Exclude<keyof T, K>`：从 `T` 的键集合中排除 `K`。
- `Pick<T, ...>`：从 `T` 中挑选剩余的键。

**注意**：`Omit` 是非同态的，不保留 `readonly` 修饰符。这是 TypeScript 的一个设计争议点，部分社区库（如 `type-fest`）提供了保留修饰符的 `OmitStrict` 变体。

**使用示例**：

```typescript
interface User {
  readonly id: number;
  name: string;
  email: string;
  passwordHash: string;
}

type SafeUser = Omit<User, "passwordHash">;
// { id: number; name: string; email: string }
// 注意：id 不再是 readonly
```

### 6.3 Record：键值对构造

```typescript
type Record<K extends keyof any, T> = {
  [P in K]: T;
};
```

**实现解析**：

- `K extends keyof any`：约束 `K` 为 `string | number | symbol` 的子集。
- `[P in K]`：遍历 `K` 中的键，每个键的值类型都是 `T`。
- 非同态映射，不保留任何修饰符。

**使用示例**：

```typescript
type UserRole = "admin" | "editor" | "viewer";

const roleLabels: Record<UserRole, string> = {
  admin: "管理员",
  editor: "编辑",
  viewer: "查看者",
};

// 字典映射
const userCache: Record<string, User> = {};
```

### 6.4 自定义对象变换工具类型

#### 6.4.1 PickByValue：按值类型挑选

```typescript
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

interface Example {
  a: string;
  b: number;
  c: string;
  d: boolean;
}

type StringProps = PickByValue<Example, string>;
// { a: string; c: string }
```

#### 6.4.2 OmitByValue：按值类型排除

```typescript
type OmitByValue<T, V> = {
  [K in keyof T as T[K] extends V ? never : K]: T[K];
};
```

#### 6.4.3 PickByValueExact：精确值类型匹配

```typescript
type PickByValueExact<T, V> = {
  [K in keyof T as [T[K]] extends [V] ? K : never]: T[K];
};

// 注意：[T[K]] extends [V] 是为了禁止分布式条件类型
// 这样可以精确匹配（如 string 不会匹配 string | undefined）
```

#### 6.4.4 Override：覆盖属性

```typescript
type Override<T, U> = Omit<T, keyof U> & U;

interface Original {
  id: number;
  name: string;
  email: string;
}

interface Overrides {
  name: string | null;
  age: number;
}

type Overridden = Override<Original, Overrides>;
// { id: number; email: string; name: string | null; age: number }
```

## 第七章 联合类型类工具类型

### 7.1 Exclude：从联合中排除

```typescript
type Exclude<T, U> = T extends U ? never : T;
```

**实现解析**：

- 利用分布式条件类型：当 `T` 是联合类型时，对每个成员分别判断。
- 如果成员 `T_i extends U`，返回 `never`；否则返回 `T_i`。
- `never` 在联合中被吸收，达到"排除"的效果。

**使用示例**：

```typescript
type AllEvents = "click" | "hover" | "scroll" | "keydown";
type MouseEvents = Exclude<AllEvents, "keydown">;
// "click" | "hover" | "scroll"

type T = string | number | boolean | null | undefined;
type NonNull = Exclude<T, null | undefined>;
// string | number | boolean
```

### 7.2 Extract：从联合中提取

```typescript
type Extract<T, U> = T extends U ? T : never;
```

**实现解析**：

- 与 `Exclude` 对偶：保留 `extends U` 的成员，排除其他。

**使用示例**：

```typescript
type T = string | number | boolean | null | undefined;
type StringOrNumber = Extract<T, string | number>;
// string | number

interface Dog { kind: "dog"; bark: () => void; }
interface Cat { kind: "cat"; meow: () => void; }
interface Fish { kind: "fish"; swim: () => void; }

type Animal = Dog | Cat | Fish;
type Pet = Extract<Animal, { kind: "dog" | "cat" }>;
// Dog | Cat
```

### 7.3 NonNullable：排除 null 与 undefined

```typescript
type NonNullable<T> = T extends null | undefined ? never : T;
```

**实现解析**：

- `NonNullable<T>` 等价于 `Exclude<T, null | undefined>`，但作为内置工具类型更早存在。

**使用示例**：

```typescript
type Maybe<T> = T | null | undefined;
type Definitely<T> = NonNullable<Maybe<T>>;
// T

function first<T>(arr: T[]): NonNullable<T> | undefined {
  return arr[0] ?? undefined;
}
```

### 7.4 分布式条件类型的陷阱

#### 7.4.1 陷阱一：裸类型参数才能分发

```typescript
type BadExclude<T, U> = [T] extends [U] ? never : T;
// 不会分发，T 是联合时整体判断

type Result = BadExclude<"a" | "b", "a">;
// "a" | "b"，没有排除 "a"
```

#### 7.4.2 陷阱二：never 不分发

```typescript
type Test<T> = T extends never ? "never" : "other";

type R1 = Test<never>;       // "never"（直接返回 never，不分发）
type R2 = Test<string>;      // "other"
type R3 = Test<string | never>; // "other"（never 被吸收）
```

#### 7.4.3 陷阱三：联合的分配律

```typescript
type R = Exclude<"a" | "b", "a" | "c">;
// 分发过程：
// "a" extends "a" | "c" ? never : "a" → never
// "b" extends "a" | "c" ? never : "b" → "b"
// 结果："b"
```

### 7.5 自定义联合类型工具类型

#### 7.5.1 IsUnion：判断是否为联合类型

```typescript
type IsUnion<T, U = T> = (
  T extends any ? [U] extends [T] ? false : true : never
) extends false ? false : true;
```

#### 7.5.2 UnionToIntersection：联合转交叉

```typescript
type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

type R = UnionToIntersection<{ a: 1 } | { b: 2 }>;
// { a: 1 } & { b: 2 }
```

这一技巧利用了函数参数位置的"逆变换"（contravariant）性质：多个函数参数类型在推断时会被交叉合并。

#### 7.5.3 UnionToTuple：联合转元组（黑魔法）

```typescript
type LastOf<T> = UnionToIntersection<T extends any ? (x: T) => void : never> extends (x: infer L) => void ? L : never;

type UnionToTuple<T, Last = LastOf<T>> = [T] extends [never] ? [] : [...UnionToTuple<Exclude<T, Last>>, Last];

type R = UnionToTuple<"a" | "b" | "c">;
// ["a", "b", "c"]（顺序不保证）
```

注意：这是一个"黑魔法"实现，依赖于函数参数推断的内部规则，可能在未来的 TypeScript 版本中失效。生产环境中谨慎使用。

## 第八章 函数推断类工具类型

### 8.1 Parameters：提取函数参数

```typescript
type Parameters<T extends (...args: any[]) => any> =
  T extends (...args: infer P) => any ? P : never;
```

**实现解析**：

- `T extends (...args: any[]) => any`：约束 `T` 为函数类型。
- `infer P`：在参数位置提取参数元组。
- `Parameters<(a: string, b: number) => void>` 返回 `[string, number]`。

**使用示例**：

```typescript
function greet(name: string, age: number): string {
  return `Hello, ${name}, age ${age}`;
}

type GreetParams = Parameters<typeof greet>;
// [string, number]

const args: GreetParams = ["Alice", 30];
greet(...args);
```

### 8.2 ReturnType：提取函数返回值

```typescript
type ReturnType<T extends (...args: any[]) => any> =
  T extends (...args: any[]) => infer R ? R : any;
```

**实现解析**：

- `infer R`：在返回值位置提取返回类型。

**使用示例**：

```typescript
function getUser() {
  return { id: 1, name: "Alice" };
}

type User = ReturnType<typeof getUser>;
// { id: number; name: string }

const user: User = { id: 2, name: "Bob" };
```

### 8.3 ConstructorParameters：提取构造函数参数

```typescript
type ConstructorParameters<T extends new (...args: any[]) => any> =
  T extends new (...args: infer P) => any ? P : never;
```

**实现解析**：

- `new (...args: any[]) => any`：约束 `T` 为构造函数类型。
- `infer P`：提取构造函数的参数元组。

**使用示例**：

```typescript
class User {
  constructor(public id: number, public name: string) {}
}

type UserCtorParams = ConstructorParameters<typeof User>;
// [number, string]

const params: UserCtorParams = [1, "Alice"];
const user = new User(...params);
```

### 8.4 InstanceType：提取实例类型

```typescript
type InstanceType<T extends new (...args: any[]) => any> =
  T extends new (...args: any[]) => infer R ? R : any;
```

**实现解析**：

- `infer R`：在构造函数的返回值位置提取实例类型。

**使用示例**：

```typescript
class User {
  constructor(public id: number) {}
  greet() { console.log(`User ${this.id}`); }
}

type UserInstance = InstanceType<typeof User>;
// User

const u: UserInstance = new User(1);
```

### 8.5 处理重载函数的陷阱

```typescript
function overloaded(x: string): string;
function overloaded(x: number): number;
function overloaded(x: string | number): string | number {
  return x;
}

type Params = Parameters<typeof overloaded>;
// 重载情况下，仅匹配最后一个签名
// [number]

type Return = ReturnType<typeof overloaded>;
// number
```

TypeScript 对重载函数的 `infer` 推断只会匹配最后一个签名。这是已知的限制，处理重载函数时需要特别注意。

### 8.6 自定义函数推断工具类型

#### 8.6.1 FirstParameter：提取第一个参数

```typescript
type FirstParameter<T extends (...args: any[]) => any> =
  T extends (first: infer F, ...rest: any[]) => any ? F : never;

type R = FirstParameter<(a: string, b: number) => void>;
// string
```

#### 8.6.2 AsyncReturnType：异步函数返回值

```typescript
type AsyncReturnType<T extends (...args: any[]) => Promise<any>> =
  T extends (...args: any[]) => Promise<infer R> ? R : never;

async function fetchUser(): Promise<{ id: number; name: string }> {
  return { id: 1, name: "Alice" };
}

type User = AsyncReturnType<typeof fetchUser>;
// { id: number; name: string }
```

#### 8.6.3 Awaited：递归解析 Promise

```typescript
type Awaited<T> = T extends null | undefined
  ? T
  : T extends object & { then(onfulfilled: infer F, ...args: infer _): any }
  ? F extends (value: infer V, ...args: infer _) => any
    ? Awaited<V>
    : never
  : T;
```

**实现解析**：

- 通过 `then` 方法的存在判断是否为 Promise-like 对象。
- 递归地解析嵌套的 Promise，直到非 Promise 类型。
- 这一实现使 `Awaited<Promise<Promise<Promise<number>>>` 等于 `number`。

## 第九章 字符串变换类工具类型

### 9.1 Uppercase/Lowercase/Capitalize/Uncapitalize

```typescript
type Uppercase<S extends string> = intrinsic;
type Lowercase<S extends string> = intrinsic;
type Capitalize<S extends string> = intrinsic;
type Uncapitalize<S extends string> = intrinsic;
```

**实现解析**：

- `intrinsic` 是 TypeScript 编译器内部关键字，表示这些工具类型由编译器原生实现。
- 编译器在实例化时直接将字符串字面量转换，不需要递归。

**使用示例**：

```typescript
type R1 = Uppercase<"hello">;      // "HELLO"
type R2 = Lowercase<"WORLD">;      // "world"
type R3 = Capitalize<"foo">;       // "Foo"
type R4 = Uncapitalize<"Bar">;     // "bar"

// 应用于联合类型
type R5 = Uppercase<"a" | "b" | "c">; // "A" | "B" | "C"
```

### 9.2 字符串变换的局限

- 仅支持 ASCII 大小写转换，不支持 Unicode 的高级大小写规则（如德语 `ß` 的大写）。
- 应用于 `string` 类型时，结果仍为 `string`（无法泛化所有可能的字符串）。

### 9.3 自定义字符串工具类型

#### 9.3.1 SnakeToCamel

```typescript
type SnakeToCamel<S extends string> =
  S extends `${infer Before}_${infer After}`
    ? `${Before}${Capitalize<SnakeToCamel<After>>}`
    : S;

type R = SnakeToCamel<"user_first_name">;
// "userFirstName"
```

#### 9.3.2 CamelToSnake

```typescript
type CamelToSnake<S extends string> =
  S extends `${infer First}${infer Rest}`
    ? First extends Uppercase<First>
      ? First extends Lowercase<First>
        ? `${First}${CamelToSnake<Rest>}`
        : `_${Lowercase<First>}${CamelToSnake<Rest>}`
      : `${First}${CamelToSnake<Rest>}`
    : S;

type R = CamelToSnake<"userFirstName">;
// "user_first_name"
```

#### 9.3.3 Replace

```typescript
type Replace<S extends string, From extends string, To extends string> =
  From extends ""
    ? S
    : S extends `${infer Before}${From}${infer After}`
    ? `${Before}${To}${After}`
    : S;

type R = Replace<"hello world", "world", "TS">;
// "hello TS"
```

#### 9.3.4 ReplaceAll

```typescript
type ReplaceAll<S extends string, From extends string, To extends string> =
  From extends ""
    ? S
    : S extends `${infer Before}${From}${infer After}`
    ? `${Before}${To}${ReplaceAll<After, From, To>}`
    : S;

type R = ReplaceAll<"a-b-c-d", "-", "_">;
// "a_b_c_d"
```

#### 9.3.5 Trim

```typescript
type TrimLeft<S extends string> =
  S extends ` ${infer Rest}` ? TrimLeft<Rest> : S;

type TrimRight<S extends string> =
  S extends `${infer Rest} ` ? TrimRight<Rest> : S;

type Trim<S extends string> = TrimLeft<TrimRight<S>>;

type R = Trim<"  hello  ">; // "hello"
```

## 第十章 异步与上下文类工具类型

### 10.1 Awaited：递归解析 Promise

详见 8.6.3 节。

**使用示例**：

```typescript
type R1 = Awaited<Promise<number>>;            // number
type R2 = Awaited<Promise<Promise<string>>>;   // string
type R3 = Awaited<number | Promise<string>>;   // number | string
```

### 10.2 ThisType：this 类型标记

```typescript
interface ThisType<T> {
  this: T;
}
```

**实现解析**：

- `ThisType<T>` 是一个特殊的"标记接口"，本身不产生类型变换。
- 当对象字面量的类型注解为 `ThisType<T>` 时，编译器会将该对象的 `this` 类型设为 `T`。
- 需要在 `tsconfig.json` 中开启 `noImplicitThis: true` 才能生效。

**使用示例**：

```typescript
type Foo = {
  bar(): void;
  baz: number;
};

const foo: ThisType<Foo> = {
  bar() {
    this.baz = 42; // this 被推断为 Foo
  },
};
```

### 10.3 自定义异步工具类型

#### 10.3.1 IsPromise

```typescript
type IsPromise<T> = T extends Promise<unknown> ? true : false;

type R1 = IsPromise<Promise<number>>; // true
type R2 = IsPromise<number>;          // false
```

#### 10.3.2 UnwrapPromise

```typescript
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type R = UnwrapPromise<Promise<string>>; // string
type R2 = UnwrapPromise<number>;          // number
```

## 第十一章 内部原理

### 11.1 工具类型的实例化过程

TypeScript 编译器在实例化工具类型时，会执行以下步骤：

1. **类型参数绑定**：将传入的类型参数绑定到工具类型的类型变量。
2. **约束检查**：验证类型参数是否满足约束（如 `K extends keyof T`）。
3. **条件类型求值**：对于基于条件类型的工具类型，逐个求值分支。
4. **映射类型实例化**：对于基于映射类型的工具类型，遍历键集合并实例化每个成员。
5. **infer 提取**：对于使用 `infer` 的工具类型，从匹配的位置提取类型变量。
6. **结果简化**：对结果类型进行简化（如吸收 `never`、合并联合类型）。

### 11.2 同态映射的修饰符查询

当编译器实例化 `{ [P in keyof T]: T[P] }` 时，会查询原类型 `T` 的修饰符：

```
for each key P in keyof T:
  new_type[P] = {
    type: T[P],
    readonly: T's readonly at P (if homomorphic),
    optional: T's optional at P (if homomorphic),
  }
```

对于非同态映射 `{ [P in K]: V }`，由于 `K` 不来自 `keyof T`，编译器无法关联原类型，修饰符均为默认（非 readonly、必选）。

### 11.3 分布式条件类型的实现

分布式条件类型的实现伪代码：

```
function evaluateConditional(T, U, X, Y):
  if T is naked type parameter and T is union:
    return union(evaluateConditional(t_i, U, X, Y) for t_i in T)
  else:
    return T extends U ? X : Y
```

裸类型参数的判断是关键：只有当 `T` 是直接出现在 `extends` 左侧的类型参数（未被包裹），才会触发分发。

### 11.4 infer 的内部机制

`infer` 的实现是编译器内部的"类型变量捕获"机制：

```
function evaluateInfer(pattern, target):
  if pattern matches target:
    bind captured types to infer variables
    return inferred types
  else:
    return never (or the else branch)
```

对于函数类型 `(...args: infer P) => any`，编译器会检查目标类型是否为函数，如果是，则将参数元组绑定到 `P`。

### 11.5 字符串工具类型的内置实现

`Uppercase`、`Lowercase`、`Capitalize`、`Uncapitalize` 的实现是编译器内部的"内置原语"（intrinsic）。编译器在实例化时直接调用运行时的字符串变换函数，无需类型层面的递归。这一设计的原因是：

- 字符串变换在类型层面递归成本极高（每个字符一次递归）。
- 编译器内置可以显著提升性能。
- 字符串变换是确定性的算法，无需类型系统的复杂推导。

## 第十二章 最佳实践

### 12.1 优先使用内置工具类型

```typescript
// 推荐
type R = Pick<User, "id" | "name">;

// 不推荐：重复造轮子
type R = { [K in "id" | "name"]: User[K] };
```

### 12.2 为自定义工具类型添加文档

```typescript
/**
 * PickByValue - 按值类型挑选属性
 *
 * @example
 * type R = PickByValue<{ a: string; b: number; c: string }, string>;
 * // { a: string; c: string }
 */
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};
```

### 12.3 避免过度嵌套

```typescript
// 不推荐：嵌套过深
type R = Partial<Readonly<Pick<Omit<User, "password">, "id" | "name">>>;

// 推荐：拆分为多个别名
type SafeUser = Omit<User, "password">;
type SafeUserFields = Pick<SafeUser, "id" | "name">;
type ReadonlySafeUser = Readonly<SafeUserFields>;
type OptionalReadonlySafeUser = Partial<ReadonlySafeUser>;
```

### 12.4 谨慎使用黑魔法

```typescript
// 不推荐：UnionToTuple 依赖内部规则
type R = UnionToTuple<"a" | "b" | "c">;

// 推荐：显式声明元组
const events = ["a", "b", "c"] as const;
type R = typeof events; // readonly ["a", "b", "c"]
```

### 12.5 注意性能

```typescript
// 慢：每次调用都重新实例化
function process<T>(data: T): DeepReadonly<T> { ... }

// 快：缓存类型别名
type ReadonlyData<T> = DeepReadonly<T>;
function process<T>(data: T): ReadonlyData<T> { ... }
```

## 第十三章 常见陷阱

### 13.1 陷阱一：Omit 不保留 readonly

```typescript
interface Original {
  readonly id: number;
  name: string;
}

type Omitted = Omit<Original, "name">;
// { id: number } —— id 不再是 readonly！
```

解决：使用自定义 `OmitStrict`：

```typescript
type OmitStrict<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
type R = OmitStrict<Original, "name">;
// { readonly id: number }
```

### 13.2 陷阱二：Partial 不递归

```typescript
interface Nested {
  outer: { inner: string };
}

type P = Partial<Nested>;
// { outer?: { inner: string } } —— inner 不是可选的

const p: P = { outer: {} }; // 编译错误：缺少 inner
```

解决：使用 `DeepPartial`。

### 13.3 陷阱三：Record 的键约束

```typescript
type R = Record<"a" | "b", number>;
// { a: number; b: number }

type BadR = Record<string | number, number>;
// { [x: string]: number; [x: number]: number }
// 数值键被字符串键吸收
```

### 13.4 陷阱四：Exclude 对对象的处理

```typescript
type T = { a: 1 } | { b: 2 };
type R = Exclude<T, { a: 1 }>;
// { b: 2 }
// 看似正确，但要注意：分布式条件类型会判断每个成员

type R2 = Exclude<T, { a: 1; b?: undefined }>;
// 仍然是 { b: 2 }，因为 { a: 1 } 与 { a: 1; b?: undefined } 结构等价
```

### 13.5 陷阱五：ReturnType 对重载的限制

```typescript
function f(x: string): string;
function f(x: number): number;
function f(x: string | number): string | number { return x; }

type R = ReturnType<typeof f>;
// number —— 仅最后一个签名
```

### 13.6 陷阱六：infer 的位置必须精确

```typescript
// 错误：infer 在数组元素位置
type BadParams<T> = T extends (args: infer P) => any ? P : never;
// P 被推断为第一个参数的类型，而非参数元组

// 正确：infer 在 rest 参数位置
type GoodParams<T> = T extends (...args: infer P) => any ? P : never;
// P 被推断为参数元组
```

### 13.7 陷阱七：Awaited 对非 Promise 的处理

```typescript
type R1 = Awaited<number>;     // number
type R2 = Awaited<string>;     // string
type R3 = Awaited<undefined>;  // undefined
// Awaited 对非 Promise 类型直接返回原类型
```

## 第十四章 性能分析

### 14.1 工具类型的复杂度

| 工具类型 | 时间复杂度 | 备注 |
|---------|----------|------|
| `Partial<T>` | $\mathcal{O}(\|T\|)$ | 遍历所有键 |
| `Pick<T, K>` | $\mathcal{O}(\|K\|)$ | 遍历指定键 |
| `Omit<T, K>` | $\mathcal{O}(\|T\|)$ | 内部 Pick |
| `Exclude<T, U>` | $\mathcal{O}(\|T\| \times \|U\|)$ | 分布式 + 比对 |
| `ReturnType<T>` | $\mathcal{O}(1)$ | 单次 infer |
| `Awaited<T>` | $\mathcal{O}(d)$ | $d$ 为 Promise 嵌套深度 |
| `DeepReadonly<T>` | $\mathcal{O}(n \cdot d)$ | $n$ 总属性数，$d$ 深度 |

### 14.2 性能优化策略

1. 缓存类型别名，避免重复实例化。
2. 限制递归深度。
3. 避免在大型联合类型上应用复杂工具类型。
4. 使用 `--generateTrace` 分析性能瓶颈。

### 14.3 编译器优化

TypeScript 5.0+ 引入了多项编译器优化：

- 类型别名缓存
- 同态映射的快速路径
- 分布式条件类型的并行求值
- `infer` 提取的优化

这些优化使得大型项目中的工具类型实例化性能显著提升。

## 第十五章 对比其他语言

### 15.1 与 Haskell 的对比

Haskell 的标准库提供了丰富的类型类（Functor、Foldable、Traversable 等），与 TypeScript 的工具类型在精神上类似。但 Haskell 的类型类基于隐式解析，而 TypeScript 的工具类型基于显式实例化。

### 15.2 与 Rust 的对比

Rust 通过 `derive` 宏实现 `Clone`、`Debug`、`Serialize` 等 trait，与 TypeScript 工具类型的目的相似。但 Rust 的方式是编译期代码生成，而 TypeScript 是类型系统内的计算。

### 15.3 与 Scala 的对比

Scala 的 `shapeless` 库提供了类似 `LabelledGeneric`、`Generic` 等工具类型，通过隐式派生实现。TypeScript 的工具类型无需隐式解析，直接通过类型表达式计算。

### 15.4 与 Python 的对比

Python 的 `@dataclass` 装饰器提供了有限的类型变换能力，但无法在类型层面表达 `ReturnType`、`Parameters` 等推断。这是静态类型系统与动态类型系统的本质区别。

## 第十六章 总结与扩展

### 16.1 核心要点回顾

1. **工具类型是类型级函数**：以类型为输入，以类型为输出。
2. **同态映射保留修饰符**：`Partial`、`Pick` 等保留原类型的 `readonly` 与 `?`。
3. **分布式条件类型是联合操作的基础**：`Exclude`、`Extract`、`NonNullable` 都依赖它。
4. **infer 的位置决定语义**：参数位置、返回值位置、数组元素位置等。
5. **字符串工具类型是编译器内置**：`Uppercase` 等无需递归实现。
6. **Awaited 递归解析 Promise**：处理嵌套 Promise 的标准方式。

### 16.2 知识体系串联

- **映射类型**：`Partial`、`Readonly`、`Pick`、`Record` 的基础。
- **条件类型**：`Exclude`、`Extract`、`NonNullable` 的基础。
- **infer**：`Parameters`、`ReturnType`、`ConstructorParameters`、`InstanceType` 的基础。
- **模板字面量类型**：自定义字符串工具类型的基础。
- **递归类型**：`DeepReadonly`、`DeepPartial`、`Awaited` 的基础。

### 16.3 进阶学习路径

1. 阅读 `lib.d.ts` 中工具类型的实际定义。
2. 探索 `type-fest`、`utility-types` 等社区工具类型库。
3. 挑战 type-challenges 中的中等与困难题目。
4. 在实际项目中编写自定义工具类型，解决领域特定的类型变换需求。

### 16.4 推荐阅读

- TypeScript Handbook: Utility Types
- TypeScript Handbook: Mapped Types
- TypeScript Handbook: Conditional Types
- "Effective TypeScript"（Dan Vanderkam）：第二版第 3 章
- `type-fest` 仓库（GitHub）：社区工具类型集合

### 16.5 实践练习

1. 实现 `Mutable<T>`，移除所有 `readonly`。
2. 实现 `DeepReadonly<T>`，递归地只读化。
3. 实现 `PickByValue<T, V>`，按值类型挑选。
4. 实现 `SnakeToCamel<S>`，字符串转换。
5. 实现 `UnionToIntersection<U>`，联合转交叉。
6. 实现 `IsUnion<T>`，判断是否为联合类型。
7. 实现 `AsyncReturnType<T>`，异步函数返回值。

### 16.6 总结

工具类型是 TypeScript 类型系统的"标准库"。理解其实现原理，不仅能让我们更有效地使用内置工具类型，更能让我们以一致的风格编写自定义工具类型，扩展类型系统的表达力。

工具类型的设计体现了"小工具组合"的哲学：每个工具类型只做一件事，通过组合产生大威力。这与函数式编程的组合子思想一脉相承。当我们把工具类型视为类型级的高阶函数时，许多看似复杂的类型技巧都会变得清晰可解。

## 附录 A：内置工具类型速查表

### A.1 属性修饰类

| 工具类型 | 实现 | 说明 |
|---------|------|------|
| `Partial<T>` | `{ [P in keyof T]?: T[P] }` | 全属性可选 |
| `Required<T>` | `{ [P in keyof T]-?: T[P] }` | 全属性必选 |
| `Readonly<T>` | `{ readonly [P in keyof T]: T[P] }` | 全属性只读 |
| `Mutable<T>` | `{ -readonly [P in keyof T]: T[P] }` | 移除只读（非内置） |

### A.2 对象变换类

| 工具类型 | 实现 | 说明 |
|---------|------|------|
| `Pick<T, K>` | `{ [P in K]: T[P] }` | 按键挑选 |
| `Omit<T, K>` | `Pick<T, Exclude<keyof T, K>>` | 按键排除 |
| `Record<K, V>` | `{ [P in K]: V }` | 键值对构造 |

### A.3 联合类型类

| 工具类型 | 实现 | 说明 |
|---------|------|------|
| `Exclude<T, U>` | `T extends U ? never : T` | 从联合中排除 |
| `Extract<T, U>` | `T extends U ? T : never` | 从联合中提取 |
| `NonNullable<T>` | `T extends null \| undefined ? never : T` | 排除 null/undefined |

### A.4 函数推断类

| 工具类型 | 实现 | 说明 |
|---------|------|------|
| `Parameters<T>` | `T extends (...args: infer P) => any ? P : never` | 提取参数元组 |
| `ReturnType<T>` | `T extends (...args: any[]) => infer R ? R : any` | 提取返回值 |
| `ConstructorParameters<T>` | `T extends new (...args: infer P) => any ? P : never` | 提取构造参数 |
| `InstanceType<T>` | `T extends new (...args: any[]) => infer R ? R : any` | 提取实例类型 |

### A.5 字符串变换类

| 工具类型 | 实现 | 说明 |
|---------|------|------|
| `Uppercase<S>` | `intrinsic` | 转大写 |
| `Lowercase<S>` | `intrinsic` | 转小写 |
| `Capitalize<S>` | `intrinsic` | 首字母大写 |
| `Uncapitalize<S>` | `intrinsic` | 首字母小写 |

### A.6 异步与上下文类

| 工具类型 | 实现 | 说明 |
|---------|------|------|
| `Awaited<T>` | 递归条件类型 | 递归解析 Promise |
| `ThisType<T>` | 标记接口 | this 类型标记 |

## 附录 B：自定义工具类型集合

### B.1 深度操作

```typescript
type DeepReadonly<T> = T extends object
  ? T extends Function ? T
  : { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T;

type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

type DeepMutable<T> = T extends object
  ? T extends Function ? T
  : { -readonly [P in keyof T]: DeepMutable<T[P]> }
  : T;

type DeepNonNullable<T> = T extends object
  ? { [P in keyof T]: DeepNonNullable<T[P]> }
  : NonNullable<T>;
```

### B.2 键值过滤

```typescript
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};

type OmitByValue<T, V> = {
  [K in keyof T as T[K] extends V ? never : K]: T[K];
};

type PickByValueExact<T, V> = {
  [K in keyof T as [T[K]] extends [V] ? K : never]: T[K];
};

type FunctionProperties<T> = PickByValue<T, Function>;
type NonFunctionProperties<T> = OmitByValue<T, Function>;
type FunctionPropertyNames<T> = keyof FunctionProperties<T>;
type NonFunctionPropertyNames<T> = keyof NonFunctionProperties<T>;
```

### B.3 键名变换

```typescript
type SnakeToCamel<S extends string> =
  S extends `${infer Before}_${infer After}`
    ? `${Before}${Capitalize<SnakeToCamel<After>>}`
    : S;

type CamelToSnake<S extends string> =
  S extends `${infer First}${infer Rest}`
    ? First extends Uppercase<First>
      ? First extends Lowercase<First>
        ? `${First}${CamelToSnake<Rest>}`
        : `_${Lowercase<First>}${CamelToSnake<Rest>}`
      : `${First}${CamelToSnake<Rest>}`
    : S;

type SnakeKeys<T> = { [K in keyof T as K extends string ? CamelToSnake<K> : K]: T[K] };
type CamelKeys<T> = { [K in keyof T as K extends string ? SnakeToCamel<K> : K]: T[K] };
```

### B.4 路径访问

```typescript
type PathImpl<T, K extends keyof T> = K extends string
  ? T[K] extends Record<string, any>
    ? `${K}` | `${K}.${PathImpl<T[K], keyof T[K]>}`
    : `${K}`
  : never;

type Path<T> = PathImpl<T, keyof T>;

type PathValue<T, P extends Path<T>> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Rest extends Path<T[K]>
      ? PathValue<T[K], Rest>
      : never
    : never
  : P extends keyof T
  ? T[P]
  : never;
```

### B.5 联合操作

```typescript
type IsUnion<T, U = T> = (
  T extends any ? [U] extends [T] ? false : true : never
) extends false ? false : true;

type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void ? I : never;

type LastOf<T> = UnionToIntersection<
  T extends any ? (x: T) => void : never
> extends (x: infer L) => void ? L : never;

type UnionToTuple<T, Last = LastOf<T>> = [T] extends [never]
  ? []
  : [...UnionToTuple<Exclude<T, Last>>, Last];
```

### B.6 函数推断

```typescript
type FirstParameter<T extends (...args: any[]) => any> =
  T extends (first: infer F, ...rest: any[]) => any ? F : never;

type LastParameter<T extends (...args: any[]) => any> =
  T extends (...args: [...any[], infer L]) => any ? L : never;

type AsyncReturnType<T extends (...args: any[]) => Promise<any>> =
  T extends (...args: any[]) => Promise<infer R> ? R : never;

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

type IsPromise<T> = T extends Promise<unknown> ? true : false;
```

## 附录 C：术语表

| 术语 | 英文 | 释义 |
|------|------|------|
| 工具类型 | Utility Type | TypeScript 内置的类型变换函数 |
| 同态映射 | Homomorphic Mapping | 保留修饰符的映射类型 |
| 非同态映射 | Non-Homomorphic Mapping | 不保留修饰符的映射类型 |
| 分布式条件类型 | Distributive Conditional Type | 联合类型上的自动分发 |
| 裸类型参数 | Naked Type Parameter | 直接出现在 extends 左侧的类型参数 |
| 修饰符 | Modifier | readonly、? 等类型修饰 |
| 类型推断 | Type Inference | 编译器自动推导类型 |
| 不动点 | Fixed Point | 递归类型的终止点 |
| 组合子 | Combinator | 小而专注的函数，通过组合产生复杂行为 |

## 附录 D：版本兼容性表

| 工具类型 | 引入版本 | 备注 |
|---------|---------|------|
| `Partial`、`Readonly`、`Pick`、`Record` | 2.1 | 映射类型首批 |
| `Exclude`、`Extract`、`NonNullable` | 2.8 | 条件类型引入 |
| `Parameters`、`ReturnType`、`InstanceType`、`ConstructorParameters` | 2.8 | infer 引入 |
| `Omit` | 3.5 | 正式加入 |
| `Uppercase` 等 | 4.1 | 模板字面量类型引入 |
| `Awaited` | 4.5 | 异步处理 |
| `ThisType` | 2.0 | 早期引入 |

## 附录 E：常见问题解答

### E.1 为什么 `Partial<T>` 不递归？

`Partial<T>` 的设计是"最小原语"，只做一件事：让顶层属性可选。如果需要递归，使用 `DeepPartial<T>`。这遵循 Unix 哲学：每个工具只做一件事，通过组合实现复杂需求。

### E.2 为什么 `Omit<T, K>` 不保留 `readonly`？

`Omit` 实现为 `Pick<T, Exclude<keyof T, K>>`。`Exclude<keyof T, K>` 产生一个键的联合类型，`Pick<T, ...>` 在遍历这个联合时是非同态的（因为不是 `keyof T` 的形式），所以不保留修饰符。这是 TypeScript 的设计选择，部分社区库提供了 `OmitStrict` 变体。

### E.3 如何让 `ReturnType` 处理重载函数？

TypeScript 对重载函数的 `infer` 推断只能匹配最后一个签名。如果需要处理重载，需要手动遍历所有签名，或使用函数重载的特定技巧。这在实践中较少见，多数情况下应当避免重载与 `ReturnType` 的组合。

### E.4 `Awaited<T>` 与 `UnwrapPromise<T>` 的区别？

`UnwrapPromise<T>` 是单层解析：`Promise<Promise<number>>` 解析为 `Promise<number>`。`Awaited<T>` 是递归解析：`Promise<Promise<number>>` 解析为 `number`。`Awaited` 是更通用的工具类型。

### E.5 如何在自定义工具类型中禁用分布式条件类型？

将类型参数包裹在元组中：`[T] extends [U] ? ... : ...`。这会阻止编译器将 `T` 视为裸类型参数，从而禁用分发。

## 附录 F：练习题参考答案

### F.1 Mutable

```typescript
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};
```

### F.2 DeepReadonly

```typescript
type DeepReadonly<T> = T extends Primitive
  ? T
  : T extends Function
  ? T
  : T extends Date | RegExp
  ? T
  : { readonly [P in keyof T]: DeepReadonly<T[P]> };

type Primitive = string | number | boolean | symbol | bigint | null | undefined;
```

### F.3 PickByValue

```typescript
type PickByValue<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K];
};
```

### F.4 SnakeToCamel

```typescript
type SnakeToCamel<S extends string> =
  S extends `${infer Before}_${infer After}`
    ? `${Before}${Capitalize<SnakeToCamel<After>>}`
    : S;
```

### F.5 UnionToIntersection

```typescript
type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void ? I : never;
```

### F.6 IsUnion

```typescript
type IsUnion<T, U = T> = (
  T extends any ? [U] extends [T] ? false : true : never
) extends false ? false : true;
```

### F.7 AsyncReturnType

```typescript
type AsyncReturnType<T extends (...args: any[]) => Promise<any>> =
  T extends (...args: any[]) => Promise<infer R> ? R : never;
```

## 附录 G：真实世界案例研究

### G.1 React 组件 Props 类型派生

```typescript
interface BaseProps {
  id: string;
  className?: string;
  onClick?: (e: MouseEvent) => void;
}

type OptionalProps = Partial<BaseProps>;
type RequiredProps = Required<BaseProps>;
type EventHandlerProps = PickByValue<BaseProps, Function>;
type NonEventHandlerProps = OmitByValue<BaseProps, Function>;
```

### G.2 API 类型派生

```typescript
interface UserAPI {
  getUser(id: number): Promise<User>;
  updateUser(id: number, patch: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;
}

type APIReturnTypes = {
  [K in keyof UserAPI]: ReturnType<UserAPI[K]>;
};

type APIParams = {
  [K in keyof UserAPI]: Parameters<UserAPI[K]>;
};
```

### G.3 表单状态派生

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

type FormState<T> = {
  [K in keyof T]: {
    value: T[K];
    error: string | null;
    touched: boolean;
  };
};

type UserFormState = FormState<User>;
```

### G.4 Redux Action 类型生成

```typescript
type ActionMap = {
  increment: { amount: number };
  decrement: { amount: number };
  reset: undefined;
};

type Action = {
  [K in keyof ActionMap]: {
    type: K;
    payload: ActionMap[K];
  };
}[keyof ActionMap];
```

### G.5 数据库模型派生

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

type SafeUser = Omit<User, "passwordHash">;
type CreateUserDTO = Omit<User, "id" | "createdAt" | "updatedAt">;
type UpdateUserDTO = Partial<CreateUserDTO>;
type UserColumns = keyof User;
type UserColumnTypes = { [K in keyof User]: User[K] };
```

## 附录 H：与函数式编程的对应

| 函数式概念 | TypeScript 工具类型对应 |
|----------|------------------------|
| `map` | `Partial`、`Readonly` 等映射类型 |
| `filter` | `PickByValue`、`OmitByValue` |
| `reduce` | `DeepReadonly`、`Awaited` 等递归类型 |
| `compose` | 工具类型的组合 |
| `curry` | `FirstParameter`、`LastParameter` |
| `Functor` | `Awaited`（Promise 的 fmap） |
| `Monad` | `Awaited` 的递归解析 |

## 附录 I：类型系统的形式化基础

### I.1 工具类型作为类型级函数

每个工具类型对应一个类型级函数 $f: \mathrm{Type} \to \mathrm{Type}$。例如：

$$
\mathrm{Partial}: \mathrm{Type} \to \mathrm{Type}, \quad T \mapsto \{ k?: T[k] \mid k \in \mathrm{keys}(T) \}
$$

### I.2 分布式条件类型的代数结构

分布式条件类型对应集合运算：

$$
\mathrm{Exclude}(T, U) = T \setminus U = \{ t \in T \mid t \notin U \}
$$

$$
\mathrm{Extract}(T, U) = T \cap U = \{ t \in T \mid t \in U \}
$$

### I.3 同态映射作为函子

同态映射 `Partial<T>` 是一个函子（Functor）：

$$
\mathrm{Partial}(\mathrm{readonly} \, T) = \mathrm{readonly} \, \mathrm{Partial}(T)
$$

$$
\mathrm{Partial}(T?) = \mathrm{Partial}(T)?
$$

### I.4 Awaited 作为不动点

`Awaited<T>` 是递归类型的不动点：

$$
\mathrm{Awaited}(T) = \begin{cases}
\mathrm{Awaited}(V) & \text{if } T = \mathrm{Promise}<V> \\
T & \text{otherwise}
\end{cases}
$$

## 附录 J：教学资源推荐

### J.1 官方资源

- TypeScript Handbook: Utility Types
- TypeScript Handbook: Mapped Types
- TypeScript Handbook: Conditional Types
- TypeScript Handbook: Type Inference

### J.2 社区资源

- type-challenges（GitHub）：从入门到困难的类型体操练习
- type-fest（GitHub）：社区工具类型集合
- utility-types（GitHub）：另一个工具类型集合
- TypeScript Deep Dive：在线书籍

### J.3 学术参考

- Pierce, B. C. (2002). *Types and Programming Languages*. MIT Press.
- "Functional Programming in Scala"（Paul Chiusano）：函数式组合子的思想
- "Haskell Programming from First Principles"（Miran Lipovača）：Functor / Applicative / Monad

## 附录 K：本教程的写作背景

本教程参考了以下教学资源：

- MIT 6.102《软件构造》：抽象与类型的工程化使用
- Stanford CS107《计算机组织系统》：抽象层次的设计
- CMU 15-312《编程语言基础》：类型论的形式化基础
- "Effective TypeScript"（Dan Vanderkam）：第二版第 3 章
- TypeScript 官方源码 `lib.d.ts`

本教程的目标是既提供工程化的实用指南，又揭示工具类型背后的设计哲学与数学结构。希望读者不仅能学会"怎么用"，更能理解"为什么"。

---

**本教程到此结束。** 希望通过本教程的系统学习，读者能够建立起对 TypeScript 工具类型实现原理的深度理解，并在实际工程中自信地运用这些类型工具。记住：工具类型不仅是语法糖，更是类型系统的"标准库"——理解它们的实现，就是理解 TypeScript 类型系统的"词汇表"。
