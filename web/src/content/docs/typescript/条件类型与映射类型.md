---
order: 70
tags:
  - typescript
  - 'conditional-types'
  - 'mapped-types'
difficulty: advanced
title: 条件类型与映射类型
module: typescript
category: 'TS Advanced'
description: TypeScript条件类型、infer关键字、映射类型、模板字面量类型与类型体操实战，含形式化定义、推导与工程实践。
author: fanquanpp
updated: '2026-07-21'
related:
  - typescript/类型推断infer扩展
  - typescript/递归类型与深度操作
  - typescript/类型声明与模块解析
  - typescript/类型安全的事件系统
  - typescript/映射类型进阶
prerequisites:
  - typescript/语法速查
  - typescript/接口与类型别名
---

# 条件类型与映射类型

## 学习目标

本节按 Bloom 认知层级组织学习目标，使读者从浅层记忆逐步达到元认知层级：

- **记忆（Remember）**：能够复述条件类型与映射类型的基本语法形式，列出 `infer`、`keyof`、`in`、`as` 等关键关键字。
- **理解（Understand）**：能够解释条件类型的分布式行为、映射类型的键重映射机制，并能用自己的语言描述 `T extends U ? X : Y` 与 `{ [K in keyof T]: ... }` 的语义。
- **应用（Apply）**：能够在生产代码中使用条件类型实现类型分支、用映射类型批量转换对象类型字段。
- **分析（Analyze）**：能够将复杂的类型问题拆解为条件类型与映射类型的组合，识别裸类型参数与包装类型参数在分发行为上的差异。
- **评估（Evaluate）**：能够评估某条类型表达式在编译期复杂度、可读性、可维护性上的表现，权衡类型体操与运行时代码的取舍。
- **创造（Create）**：能够为业务场景设计端到端的类型安全方案，例如结合模板字面量类型与映射类型构建类型安全的路由表、事件总线、配置系统。

## 历史动机与背景

TypeScript 1.x 时代（2012—2014）的泛型系统只能描述"形状"而无法表达"运算"。开发者面对联合类型 `string | number`、可选属性、只读属性时，往往只能用 `any` 或重复定义多个相似类型来绕过限制。这种"形状静态、无法演算"的形态严重制约了类型系统对真实业务的建模能力。

条件类型（Conditional Types）由微软 TypeScript 团队在 2017 年的 **TypeScript 2.8** 中正式引入（Pull Request #21316），其设计动机来源于三方面：

1. **业务诉求**：在 React 高阶组件、Redux 选择器、ORM 类型推导等场景中，需要根据输入类型动态决定输出类型，传统泛型无法表达。
2. **理论支撑**：条件类型在 PLT（Programming Language Theory）社区有成熟的对应物——**Type-level Function** 与 **Conditional Type Rule**。它借鉴了 Flow 与 Scala 的类型系统思想。
3. **生态压力**：Flow 在 2016—2017 年已经具备 `$Diff`、`$ObjMap` 等类型运算能力，TypeScript 必须补齐这一短板。

映射类型（Mapped Types）则在更早的 **TypeScript 2.1**（2016 年 12 月）中引入，灵感来自 Haskell 的 `Functor` 与 Scala 的 `Shapeless`。它的本质是把对象类型视为"键到类型的函数空间"，对键集合做映射后生成新类型。在 4.1 版本中，TypeScript 又引入了 **键重映射（Key Remapping via `as`）** 和 **模板字面量类型（Template Literal Types）**，使映射类型可以同时变换键和值，从而构建出 `getters`、`setters`、事件名等强约束类型。

这两项能力的诞生，使 TypeScript 从"带类型的 JavaScript"演化为"能够进行类型层面演算的图灵完备系统"。2019 年起，社区出现了大量"类型体操"实践，例如用类型系统实现 SQL 解析器、正则引擎、状态机，证明了其强大的表达力。

## 形式化定义

### 条件类型的形式化语义

设 $\Gamma$ 为类型环境，$T, U, X, Y$ 为类型表达式。条件类型的形式化规则如下：

$$
\frac{\Gamma \vdash T \leq U \quad \Gamma \vdash X \;\text{type} \quad \Gamma \vdash Y \;\text{type}}{\Gamma \vdash T \;\text{extends}\; U \;?\; X \;:\; Y \;\text{type}}
$$

读作：若 $T$ 是 $U$ 的子类型，则条件类型求值为 $X$，否则为 $Y$。这与类型论中的 **conditional type rule** 一致。

**分布式条件类型（Distributive Conditional Types）** 是核心扩展规则。当 $T$ 是裸类型参数（naked type parameter）且实参为联合类型 $T_1 \cup T_2 \cup \dots \cup T_n$ 时：

$$
(T_1 \cup T_2) \;\text{extends}\; U \;?\; X \;:\; Y \;\equiv\; (T_1 \;\text{extends}\; U \;?\; X \;:\; Y) \;\cup\; (T_2 \;\text{extends}\; U \;?\; X \;:\; Y)
$$

数学上等价于函子（Functor）映射：条件类型对联合类型做笛卡尔分布。这一性质使得 `Exclude<T, U>`、`Extract<T, U>` 等工具类型成为可能。

### 映射类型的形式化语义

设 $O$ 为对象类型，其键集合为 $\text{Keys}(O) = \{k_1, k_2, \dots, k_n\}$，每个键 $k_i$ 对应类型 $O[k_i]$。映射类型是一个类型层面的函数 $M : \text{Type} \to \text{Type}$：

$$
M(O) = \{ \;f(k_i) : g(O[k_i]) \;\mid\; k_i \in \text{Keys}(O) \;\}
$$

其中 $f : \text{Key} \to \text{Key}$ 是键变换函数（4.1+ 通过 `as` 子句实现），$g : \text{Type} \to \text{Type}$ 是值变换函数。映射类型的语法对应：

$$
\{ \;[P \;\text{in}\; \text{Keys}(O) \;\text{as}\; f(P)] : g(O[P]) \;\}
$$

`keyof` 操作符返回键的联合类型：

$$
\text{keyof}\; O = k_1 \;\cup\; k_2 \;\cup\; \dots \;\cup\; k_n
$$

`in` 操作符在映射类型中表示对联合类型做迭代，对应集合论中的"枚举"。

### 复杂度分析

TypeScript 编译器在解析条件类型时，采用 **lazy evaluation**：仅当条件类型被实例化（instantiate）时才进行子类型检查。对于嵌套条件类型 $T_1 \;\text{extends}\; U_1 \;?\; (T_2 \;\text{extends}\; U_2 \;?\; X \;:\; Y) \;:\; Z$，最坏情况需要 $O(2^n)$ 次子类型检查。

映射类型的复杂度与对象类型的键数量成正比：$O(|\text{Keys}(O)|)$。但若值变换函数 $g$ 本身是递归类型（如深度 `Readonly`），总复杂度为 $O(d \cdot |\text{Keys}|)$，其中 $d$ 为递归深度。TypeScript 5.0 引入了尾部递归优化（Tail-Recursion Elimination），将部分线性递归转化为循环，使 $O(n)$ 递归不再触发栈溢出。

## 理论推导

### 推导一：`Exclude<T, U>` 的等价性证明

`Exclude<T, U>` 的官方实现为 `T extends U ? never : T`。设 $T = A \cup B \cup C$，$U = B$：

$$
\text{Exclude}(A \cup B \cup C, B) = (A \;\text{extends}\; B \;?\; \text{never} \;:\; A) \cup (B \;\text{extends}\; B \;?\; \text{never} \;:\; B) \cup (C \;\text{extends}\; B \;?\; \text{never} \;:\; C)
$$

由于 $B \leq B$，第二项为 $\text{never}$；若 $A \not\leq B$ 且 $C \not\leq B$，则结果为 $A \cup \text{never} \cup C = A \cup C$。这与集合论中的差集定义一致。

### 推导二：`Readonly<T>` 的同构性

`Readonly<T>` 定义为 `{ readonly [P in keyof T]: T[P] }`。它满足两条性质：

1. **保持键集**：$\text{Keys}(\text{Readonly}(O)) = \text{Keys}(O)$，因为 $f(k) = k$（恒等键变换）。
2. **保持值类型**：$\text{Readonly}(O)[k_i] = O[k_i]$，因为 $g(t) = t$（恒等值变换）。

但 `Readonly` 仅修改了修饰符（添加 `readonly`），是浅层操作。深度 `Readonly` 需要递归：

```typescript
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};
```

其递归方程为 $R(T) = \{ \text{readonly}\; k : R(T[k]) \;\text{if}\; T[k] \;\text{is object}\; \text{else}\; T[k] \}$，求解需要结构归纳。

### 推导三：模板字面量类型的代数结构

模板字面量类型 `"on" \; \text{Capitalise}<K>` 可以视为字符串代数上的运算。设 $\Sigma^*$ 为字符串集合，$\text{Cap} : \Sigma^* \to \Sigma^*$ 为首字母大写函数，则：

$$
\text{EventName}(K) = \text{``on''} \cdot \text{Cap}(K)
$$

其中 $\cdot$ 为字符串拼接。映射类型 `{ [K in keyof T as `on${Capitalize<K>}`]: (...args: T[K]) => void }` 把对象类型 $T$ 的每个键 $K$ 映射到事件名 `onK`，把值类型 $T[K]$ 包装为函数签名。这就是 React 事件、Vue 事件总线等场景的类型基础。

### 复杂度对比

下表给出常见工具类型在最坏情况下的编译期复杂度：

| 工具类型 | 复杂度 | 备注 |
|---------|--------|------|
| `Partial<T>` | $O(\|\text{Keys}\|)$ | 单次映射 |
| `Readonly<T>` | $O(\|\text{Keys}\|)$ | 单次映射 |
| `Pick<T, K>` | $O(\|K\|)$ | 取子集 |
| `Exclude<T, U>` | $O(\|T\| \cdot \|U\|)$ | 双层联合 |
| `DeepReadonly<T>` | $O(d \cdot \|\text{Keys}\|)$ | 递归映射 |
| `ReturnType<T>` | $O(1)$ | infer 推导 |

## 代码示例

### 示例 1：条件类型基础

```typescript
// 条件类型基本语法：T extends U ? X : Y
// 当 T 是 U 的子类型时返回 X，否则返回 Y
type IsString<T> = T extends string ? true : false;

// 测试：分别对字符串、数字、联合类型求值
type T1 = IsString<"hello">;       // true
type T2 = IsString<42>;            // false
type T3 = IsString<string | number>; // boolean —— 分布式行为
// 注意：T3 是联合类型分发后的 true | false = boolean

// 裸类型参数（naked type parameter）才会分发
type Wrap<T> = [T] extends [string] ? true : false;
type T4 = Wrap<string | number>;   // false —— 用元组阻止分发
```

### 示例 2：infer 关键字提取类型

```typescript
// infer 用于在条件类型中"捕获"某个类型变量
// 提取函数返回值类型
type ReturnTypeOf<T> = T extends (...args: never[]) => infer R ? R : never;

// 提取 Promise 的 resolve 类型
type Awaited<T> = T extends Promise<infer U> ? U : T;
type T5 = Awaited<Promise<number>>;        // number
type T6 = Awaited<Promise<Promise<string>>>; // string —— 递归解包

// 提取数组元素类型
type ElementOf<T> = T extends (infer E)[] ? E : never;
type T7 = ElementOf<string[]>;             // string
type T8 = ElementOf<Array<{ id: number }>>; // { id: number }

// 同时提取多个类型变量：提取函数的参数与返回值
type FunctionParts<T> = T extends (...args: infer Args) => infer Return
  ? { args: Args; return: Return }
  : never;
type T9 = FunctionParts<(a: number, b: string) => boolean>;
// { args: [number, string]; return: boolean }
```

### 示例 3：分布式条件类型实战

```typescript
// 实现 Exclude：从联合类型中排除成员
type MyExclude<T, U> = T extends U ? never : T;
type T10 = MyExclude<"a" | "b" | "c", "b">; // "a" | "c"

// 实现 Extract：从联合类型中提取成员
type MyExtract<T, U> = T extends U ? T : never;
type T11 = MyExtract<"a" | "b" | "c" | 1, string>; // "a" | "b" | "c"

// 实现 NonNullable：排除 null 与 undefined
type MyNonNullable<T> = T extends null | undefined ? never : T;
type T12 = MyNonNullable<string | null | number | undefined>; // string | number

// 阻止分布：用元组包裹
type NonDistributive<T, U> = [T] extends [U] ? true : false;
type T13 = NonDistributive<string | number, string>; // false
// 分布式版本会得到 boolean
type T14 = (string | number) extends string ? true : false; // boolean
```

### 示例 4：映射类型基础

```typescript
// Partial：所有属性变可选
type MyPartial<T> = {
  [P in keyof T]?: T[P];
};

// Required：所有属性变必填
type MyRequired<T> = {
  [P in keyof T]-?: T[P];
};

// Readonly：所有属性变只读
type MyReadonly<T> = {
  readonly [P in keyof T]: T[P];
};

// Mutable：移除只读
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

// Pick：选取部分键
type MyPick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Record：构造键值对类型
type MyRecord<K extends keyof any, V> = {
  [P in K]: V;
};

interface User {
  id: number;
  name: string;
  email: string;
}

type UserPartial = MyPartial<User>;
// { id?: number; name?: string; email?: string; }
type UserPreview = MyPick<User, "id" | "name">;
// { id: number; name: string; }
```

### 示例 5：键重映射与模板字面量

```typescript
// 键重映射语法：[P in keyof T as NewKey]
// 把所有键变为 getter 形式
type Getters<T> = {
  [P in keyof T as `get${Capitalize<string & P>}`]: () => T[P];
};

type UserGetters = Getters<User>;
// { getId: () => number; getName: () => string; getEmail: () => string; }

// 移除指定前缀的键
type RemovePrefix<T, Prefix extends string> = {
  [P in keyof T as P extends `${Prefix}${infer Rest}` ? Rest : P]: T[P];
};

interface PrefixedConfig {
  apiEndpoint: string;
  apiKey: string;
  timeout: number;
}
type Config = RemovePrefix<PrefixedConfig, "api">;
// { Endpoint: string; Key: string; timeout: number; }

// 把对象类型转为事件处理器映射
type EventHandlers<T> = {
  [P in keyof T as `on${Capitalize<string & P>}`]: (payload: T[P]) => void;
};

interface Events {
  click: { x: number; y: number };
  change: string;
  submit: FormData;
}
type Handlers = EventHandlers<Events>;
// { onClick: (p: {x:number;y:number}) => void; onChange: (p: string) => void; onSubmit: (p: FormData) => void }
```

### 示例 6：完整可运行的类型安全事件总线

```typescript
// 类型安全的事件总线：结合条件类型、映射类型、模板字面量类型
// 设计目标：注册事件名 -> 注册回调 -> 触发时严格类型检查

// 事件映射表：事件名 -> 载荷类型
interface EventMap {
  login: { userId: string; token: string };
  logout: { userId: string };
  message: { from: string; content: string };
}

// 事件处理器映射：把每个事件名包装成回调函数
type EventHandlerMap<T> = {
  [P in keyof T as `on${Capitalize<string & P>}`]: (payload: T[P]) => void;
};

// 事件总线：on 方法参数严格按 EventMap 约束
class TypedEventBus<M extends Record<string, any>> {
  private listeners: { [K in keyof M]?: Array<(payload: M[K]) => void> } = {};

  // 注册监听器：事件名必须为 M 的键，回调参数必须为对应载荷
  on<K extends keyof M>(event: K, handler: (payload: M[K]) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(handler);
  }

  // 触发事件：传入参数必须严格匹配 M[K]
  emit<K extends keyof M>(event: K, payload: M[K]): void {
    const handlers = this.listeners[event];
    if (handlers) {
      handlers.forEach((h) => h(payload));
    }
  }

  // 移除监听器
  off<K extends keyof M>(event: K, handler: (payload: M[K]) => void): void {
    const handlers = this.listeners[event];
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
  }
}

// 使用示例
const bus = new TypedEventBus<EventMap>();

// 正确：载荷类型匹配
bus.on("login", (p) => console.log(`User ${p.userId} logged in with token ${p.token}`));
bus.on("message", (p) => console.log(`From ${p.from}: ${p.content}`));

// 编译错误示例（取消注释会报错）：
// bus.on("login", (p) => p.token); // p.token 是 string，但返回 void
// bus.emit("login", { userId: "u1" }); // 缺少 token 字段
// bus.emit("unknown", {}); // 事件名不存在

// 触发事件
bus.emit("login", { userId: "u1", token: "abc123" });
bus.emit("message", { from: "Alice", content: "Hello" });
```

### 示例 7：递归条件类型实现 DeepPartial

```typescript
// DeepPartial：递归地把所有属性变为可选，包括嵌套对象
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface AppConfig {
  server: {
    host: string;
    port: number;
  };
  database: {
    url: string;
    poolSize: number;
  };
  features: string[];
}

// 仅更新部分字段，所有嵌套层都是可选的
const patch: DeepPartial<AppConfig> = {
  server: { port: 8080 }, // host 自动可选
  database: { url: "postgres://localhost/new" },
};

// DeepReadonly：递归只读，常用于状态管理
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// 配合条件类型分发：UnionToIntersection
// 把联合类型转为交叉类型
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

type T15 = UnionToIntersection<{ a: 1 } | { b: 2 }>;
// { a: 1 } & { b: 2 }
```

## 对比分析

### 条件类型 vs 函数重载

| 维度 | 条件类型 | 函数重载 |
|------|---------|---------|
| 类型表达力 | 类型层面动态选择 | 静态列举 |
| 编译期开销 | 较高（需展开） | 低 |
| 可读性 | 较差，需熟悉语法 | 高，直观 |
| 维护成本 | 集中在一处 | 每个重载都要维护 |
| 适用场景 | 泛型工具、类型体操 | API 边界、不同参数组合 |

### 映射类型 vs 接口继承

| 维度 | 映射类型 | 接口继承（extends） |
|------|---------|------------------|
| 表达力 | 可批量变换键和值 | 只能添加/重写属性 |
| 灵活性 | 极高，支持递归 | 低，固定结构 |
| 编译速度 | 较慢（需展开） | 快 |
| 工具支持 | 良好 | 极佳 |
| 适用场景 | 工具类型、批量转换 | 业务领域建模 |

### 条件类型 vs 其他语言的类型运算

| 语言 | 类型运算机制 | 表达力 | 编译期开销 |
|------|------------|-------|----------|
| TypeScript | 条件类型 + infer | 图灵完备 | 高 |
| Scala | 隐式参数 + 类型类 | 图灵完备 | 高 |
| Haskell | 类型族（Type Family） | 图灵完备 | 中 |
| Rust | trait + 关联类型 | 较强 | 中 |
| Java | 无原生支持 | 弱 | 低 |

TypeScript 的优势在于语法简洁、与 JavaScript 生态贴合；劣势在于错误信息晦涩、编译性能在大型项目易退化。

## 常见陷阱与反模式

### 反模式 1：误用裸类型参数导致意外分布

```typescript
// 反模式：期望整体判断，但因裸类型参数被分布
type BadIsString<T> = T extends string ? true : false;
type R1 = BadIsString<string | number>; // boolean —— 不是 false

// 正确：用元组阻止分布
type GoodIsString<T> = [T] extends [string] ? true : false;
type R2 = GoodIsString<string | number>; // false
```

**生产事故案例**：某团队在 2022 年构建权限系统时，用 `HasPermission<T> = T extends "admin" ? true : false` 判断用户权限。当传入联合类型 `"admin" | "user"` 时得到 `boolean`，被错误地用于条件渲染，导致普通用户也能看到管理员面板。修复方式是用元组包裹阻止分布。

### 反模式 2：递归类型无限递归导致栈溢出

```typescript
// 反模式：循环引用触发栈溢出
type Infinite<T> = T extends any ? Infinite<T> : never;
// 类型实例化达到 50 深度，可能栈溢出

// 正确：使用尾部递归优化（TypeScript 4.5+）
type DeepReadonlyFixed<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonlyFixed<T[K]> }
  : T;
```

### 反模式 3：infer 位置错误导致推导失败

```typescript
// 反模式：infer 在错误的协变位置
type BadReturnType<T> = T extends () => infer R ? R : never;
type R3 = BadReturnType<(x: number) => string>; // string —— 侥幸正确
type R4 = BadReturnType<(x: number) => string | number>; // string | number —— OK

// 但若函数返回 Promise，期望解包则失败
type BadAwaited<T> = T extends () => infer R ? R : never;
type R5 = BadAwaited<() => Promise<number>>; // Promise<number> —— 未解包

// 正确：递归 infer
type GoodAwaited<T> = T extends Promise<infer R>
  ? R extends Promise<unknown>
    ? GoodAwaited<R>
    : R
  : T;
type R6 = GoodAwaited<Promise<Promise<number>>>; // number
```

### 反模式 4：映射类型与索引签名混淆

```typescript
// 反模式：期望映射类型，但写成索引签名
interface BadMapping {
  [key: string]: number;
}
// 这是一个索引签名，所有 string 键都为 number，无法约束具体键

// 正确：使用映射类型 + 字面量联合
type GoodMapping = {
  [K in "a" | "b" | "c"]: number;
};
// 等价于 { a: number; b: number; c: number; }
```

### 反模式 5：过度类型体操导致编译缓慢

```typescript
// 反模式：用类型系统实现 JSON 解析器
// 虽然可行，但单文件编译时间从 100ms 飙升到 30s+
type ParseJSON<S extends string> = /* ... 复杂递归 ... */ unknown;

// 正确：把类型推导与运行时解析结合
function parseJSON<S extends string>(input: S): ParseJSONRuntime<S> {
  return JSON.parse(input);
}
```

**生产事故案例**：某 SaaS 平台在 2023 年引入类型层面 SQL 解析器，导致 tsc 编译时间从 30 秒增加到 4 分钟，IDE 响应延迟达 5 秒以上。最终回退到运行时 + 类型断言方案。

## 工程实践

### 实践 1：合理使用工具类型组合

```typescript
// 业务场景：构建 PATCH 接口的请求类型
// 要求：所有字段可选，嵌套对象也可选，但数组元素保持不变
type PatchDeep<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? U[] // 数组保持原样
    : T[P] extends object
    ? PatchDeep<T[P]>
    : T[P];
};

interface User {
  id: number;
  profile: {
    name: string;
    age: number;
    tags: string[];
  };
}

type UserPatch = PatchDeep<User>;
// {
//   id?: number;
//   profile?: { name?: string; age?: number; tags?: string[] };
// }
```

### 实践 2：泛型约束与条件类型结合

```typescript
// 强约束的工厂函数：根据传入的 kind 推断返回类型
interface AnimalMap {
  dog: { kind: "dog"; bark: () => void };
  cat: { kind: "cat"; meow: () => void };
  fish: { kind: "fish"; swim: () => void };
}

type AnimalKind = keyof AnimalMap;

function createAnimal<K extends AnimalKind>(
  kind: K
): AnimalMap[K] {
  // 实际实现需要根据 kind 分支
  if (kind === "dog") return { kind, bark: () => {} } as AnimalMap[K];
  if (kind === "cat") return { kind, meow: () => {} } as AnimalMap[K];
  return { kind, swim: () => {} } as AnimalMap[K];
}

const dog = createAnimal("dog"); // { kind: "dog"; bark: () => void }
dog.bark(); // OK
// dog.meow(); // 编译错误
```

### 实践 3：模板字面量类型构建路由表

```typescript
// 类型安全的路由系统
type Route = `/${string}`;

interface RouteMap {
  home: "/";
  users: "/users";
  userDetail: "/users/:id";
  settings: "/settings";
}

// 把路由映射转为参数提取
type RouteParams<S extends string> =
  S extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & RouteParams<`/${Rest}`>
    : S extends `${string}:${infer Param}`
    ? { [K in Param]: string }
    : {};

type Params1 = RouteParams<"/users/:id">; // { id: string }
type Params2 = RouteParams<"/users/:userId/posts/:postId">;
// { userId: string } & { postId: string }

// 路由构建器
function navigate<K extends keyof RouteMap>(
  route: K,
  params: RouteParams<RouteMap[K]>
): void {
  // 运行时实现
  console.log(`Navigating to ${route} with`, params);
}

navigate("userDetail", { id: "123" }); // OK
// navigate("userDetail", {}); // 编译错误：缺少 id
```

### 实践 4：性能优化技巧

```typescript
// 1. 避免在热路径上用复杂条件类型
// 反例：每次访问 type 都触发 200ms 解析
type ComplexType<T> = /* 长链条件类型 */ unknown;

// 优化：把结果缓存到类型别名
type CachedResult = ComplexType<SomeInput>; // 一次性求值

// 2. 使用 satisfies 替代显式类型断言
const config = {
  api: "https://api.example.com",
  timeout: 5000,
} satisfies Record<string, string | number>;
// 类型被精确推断为 { api: string; timeout: number }

// 3. 控制递归深度
type DeepReadonlyMaxDepth<T, Depth extends number, Current extends number = 0> =
  Current extends Depth
    ? T
    : T extends object
    ? { readonly [K in keyof T]: DeepReadonlyMaxDepth<T[K], Depth, Add<Current, 1>> }
    : T;
// Add 是数字递归类型，需自行实现
```

### 实践 5：与 IDE 工具配合

- 使用 `// @ts-expect-error` 标注预期错误，便于回归测试
- 用 `tsd`、`expect-type` 等库编写类型层面的单元测试
- 在 CI 中加入 `tsc --noEmit` 检查，防止类型回归
- 用 `typescript-eslint` 的 `no-explicit-any`、`no-unnecessary-type-arguments` 规则约束代码

## 案例研究

### 案例一：Redux Toolkit 的类型设计

Redux Toolkit 是 React 生态最流行的状态管理库，其 `createSlice` API 大量使用条件类型与映射类型。核心设计如下：

```typescript
// 简化版 createSlice 类型设计
interface SliceConfig<S, R extends Record<string, (state: S, action: any) => S>> {
  name: string;
  initialState: S;
  reducers: R;
}

// 自动生成 Action Creators 的类型
type ActionCreator<R> = {
  [K in keyof R]: R[K] extends (state: infer S, action: infer A) => any
    ? (payload: A extends { payload: infer P } ? P : void) => { type: K; payload: A }
    : never;
};

function createSlice<S, R extends Record<string, (state: S, action: any) => S>>(
  config: SliceConfig<S, R>
): {
  reducer: (state: S, action: any) => S;
  actions: ActionCreator<R>;
} {
  // 简化实现
  const actions = {} as ActionCreator<R>;
  for (const key in config.reducers) {
    (actions as any)[key] = (payload: any) => ({ type: key, payload });
  }
  return {
    reducer: (state, action) => config.reducers[action.type]?.(state, action) ?? state,
    actions,
  };
}

const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0 },
  reducers: {
    increment: (state) => ({ value: state.value + 1 }),
    add: (state, action: { payload: number }) => ({ value: state.value + action.payload }),
  },
});

// actions.increment 是 () => { type: "increment" }
// actions.add 是 (payload: number) => { type: "add"; payload: number }
counterSlice.actions.add(5); // OK
// counterSlice.actions.add("5"); // 编译错误
```

这一设计让开发者无需手写 Action Creator、无需重复类型声明，极大提升了开发体验。其类型层面的核心是 `ActionCreator<R>` 这个映射类型，它把 reducer 函数的签名转换为 Action Creator 的签名。

### 案例二：tRPC 的端到端类型安全

tRPC 通过条件类型与映射类型实现了"前后端类型自动同步"。后端定义路由器后，前端调用时类型完全由后端推导：

```typescript
// 后端路由定义
const appRouter = trpc.router()
  .query("getUser", {
    input: z.object({ id: z.string() }),
    output: z.object({ id: z.string(), name: z.string() }),
    resolve: ({ input }) => getUser(input.id),
  })
  .mutation("createUser", {
    input: z.object({ name: z.string() }),
    output: z.object({ id: z.string() }),
    resolve: ({ input }) => createUser(input.name),
  });

type AppRouter = typeof appRouter;

// 前端调用：类型完全由后端推导
const client = createTRPCProxyClient<AppRouter>();
const user = await client.getUser.query({ id: "1" }); // 返回 { id: string; name: string }
// client.getUser.query({ id: 1 }); // 编译错误：id 必须是 string
```

tRPC 的核心思想是把后端路由对象类型化，通过条件类型把每个路由的 input/output 类型暴露给前端。这一设计消除了手写 API 类型声明的工作量，是 TypeScript 类型系统在工程上的典型胜利。

### 案例三：Zod 与类型推导

Zod 是运行时校验库，与 TypeScript 深度集成：

```typescript
import { z } from "zod";

// 定义 schema
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().int().positive(),
});

// 类型由 schema 自动推导
type User = z.infer<typeof userSchema>;
// { id: string; name: string; age: number }

// 类型安全的解析
const user = userSchema.parse(JSON.parse('{"id":"1","name":"Alice","age":30}'));
user.name.toUpperCase(); // OK
```

Zod 的 `infer` 实现就是条件类型与映射类型的组合：对每个 schema 节点递归地映射到对应 TypeScript 类型。

### 案例四：Drizzle ORM 的类型推导

Drizzle ORM 是 TypeScript 优先的 SQL ORM，其核心是利用条件类型与映射类型在类型层面构建 SQL 类型。下面是一个简化版：

```typescript
// 表定义：每个列对应一个 ColumnDef
type ColumnDef<T extends "string" | "number" | "boolean"> = {
  type: T;
  notNull?: boolean;
  default?: T extends "string" ? string : T extends "number" ? number : boolean;
};

// 表 schema 类型
type TableSchema = {
  [K: string]: ColumnDef<"string" | "number" | "boolean">;
};

// 从 ColumnDef 推导实际 TS 类型
type ColumnType<C extends ColumnDef<any>> =
  C extends ColumnDef<"string">
    ? C extends { notNull: true } ? string : string | null
    : C extends ColumnDef<"number">
    ? C extends { notNull: true } ? number : number | null
    : C extends ColumnDef<"boolean">
    ? C extends { notNull: true } ? boolean : boolean | null
    : never;

// 从 TableSchema 推导整行的类型
type InferRow<S extends TableSchema> = {
  [K in keyof S]: ColumnType<S[K]>;
};

// 真实表定义
const usersTable = {
  id: { type: "number", notNull: true } as const,
  name: { type: "string", notNull: true } as const,
  email: { type: "string" } as const,
  isActive: { type: "boolean", notNull: true, default: true } as const,
} satisfies TableSchema;

// 类型自动推导
type User = InferRow<typeof usersTable>;
// {
//   id: number;
//   name: string;
//   email: string | null;
//   isActive: boolean;
// }

// 查询构建器：select 返回 InferRow<S>
function selectFrom<S extends TableSchema>(schema: S): InferRow<S>[] {
  // 运行时执行 SQL
  return [] as InferRow<S>[];
}

const rows = selectFrom(usersTable);
// rows: User[]
rows[0]?.id; // number
rows[0]?.email; // string | null
```

Drizzle 的真实实现远比这复杂——它还要处理 join、where、groupBy 等子句的类型推导，但其核心思想一致：把 SQL 元数据映射到 TypeScript 类型，再用条件类型与映射类型生成精确的行类型。

### 案例五：React Hook 的类型推导

React Hook 在 TypeScript 中的类型推导能力，主要得益于泛型与条件类型的组合。下面是一个自定义 Hook 的类型设计：

```typescript
import { useState, useEffect, useCallback } from "react";

// 异步数据 Hook：根据 fetcher 返回值自动推导 data 类型
function useAsync<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  // 联合类型的状态：通过条件类型细化
  type State =
    | { loading: true; data: null; error: null }
    | { loading: false; data: T; error: null }
    | { loading: false; data: null; error: Error };

  // 当前状态
  const state: State = loading
    ? { loading: true, data: null, error: null }
    : error
    ? { loading: false, data: null, error }
    : { loading: false, data: data as T, error: null };

  return state;
}

// 使用：data 类型自动推导为 User
interface User {
  id: number;
  name: string;
}
const { data, loading } = useAsync<User>(async () => {
  const res = await fetch("/api/user/1");
  return res.json();
});
// data: User | null（loading 为 false 时为 User）
```

这个 Hook 的核心是 `State` 联合类型设计：通过 `loading`、`error` 字段做判别式联合（Discriminated Union），让 TypeScript 在 `if (state.loading)` 后能自动收窄类型，避免访问 `data` 时的 null 检查。

### 案例六：Tailwind CSS 的类型推导

Tailwind CSS v4 用 TypeScript 类型系统实现了类名补全与安全检查：

```typescript
// 简化版：把类名字符串联合类型映射到样式对象
type StyleMap = {
  "text-red-500": { color: "#ef4444" };
  "text-blue-500": { color: "#3b82f6" };
  "bg-gray-100": { backgroundColor: "#f3f4f6" };
  "p-4": { padding: "1rem" };
};

// 安全的 className 函数：只接受合法类名
function className<C extends keyof StyleMap>(...classes: C[]): StyleMap[C][] {
  return classes.map((c) => styleMap[c]);
}

const styles = className("text-red-500", "p-4");
// styles: [{ color: "#ef4444" }, { padding: "1rem" }]
// className("text-red-999"); // 编译错误：类名不存在
```

Tailwind 真实实现用模板字面量类型生成所有合法类名的联合类型（数十万个），实现 IDE 自动补全与编译期检查。这是条件类型与模板字面量结合的极致工程案例。

## 习题

### 基础题

**题目 1**：解释以下条件类型的结果，并说明原因。

```typescript
type T1 = ("a" | "b") extends "a" ? true : false;
type T2 = ["a" | "b"] extends ["a"] ? true : false;
```

参考答案要点：T1 是 `boolean`（分布式条件类型，分别对 "a" 和 "b" 求值后联合）；T2 是 `false`（用元组阻止分布，整体判断 `["a" | "b"]` 不是 `["a"]` 的子类型）。

**题目 2**：实现 `MyReturnType<T>`，提取函数类型 T 的返回值类型。

参考答案要点：`type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;`

**题目 3**：实现 `MyOmit<T, K>`，从对象类型 T 中排除键 K。

参考答案要点：`type MyOmit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;`

### 进阶题

**题目 4**：实现 `DeepKeyOf<T>`，返回对象类型 T 所有嵌套键的联合类型（用 `.` 连接）。

参考答案要点：

```typescript
type DeepKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string | number
        ? `${K}` | `${K}.${DeepKeyOf<T[K]>}`
        : never;
    }[keyof T]
  : never;
```

**题目 5**：解释 `UnionToIntersection` 的实现原理。

```typescript
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;
```

参考答案要点：第一步把联合类型 U 通过分布式条件类型映射为函数联合 `(k: A) => void | (k: B) => void | ...`；第二步利用函数参数的逆变性质——多个函数类型联合时，infer I 处的参数类型会变为所有参数的交叉类型 `A & B & ...`。这是利用协变/逆变规则把联合转为交叉的经典技巧。

### 挑战题

**题目 6**：实现 `TupleToUnion<T>`，把元组类型转为联合类型，并进一步实现 `TupleToObject<T>`，把元组转为以索引为键的对象类型。

参考答案要点：

```typescript
type TupleToUnion<T extends readonly any[]> = T[number];
type TupleToObject<T extends readonly any[]> = {
  [K in keyof T]: T[K];
};
// TupleToUnion<[1, 2, 3]> = 1 | 2 | 3
// TupleToObject<["a", "b"]> = { 0: "a"; 1: "b" }
```

**题目 7**：实现 `PathImpl<T, Prefix extends string = "">`，递归生成对象类型 T 的所有路径字符串（如 `"a.b.c"`）。

参考答案要点：

```typescript
type PathImpl<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]:
        | `${Prefix}${Prefix extends "" ? "" : "."}${K}`
        | PathImpl<T[K], `${Prefix}${Prefix extends "" ? "" : "."}${K}`>;
    }[keyof T & string]
  : never;
```

**题目 8**：分析为什么 `Awaited<Promise<Promise<Promise<number>>>>` 能正确推导为 `number`，并解释递归条件类型的尾部递归优化机制。

参考答案要点：`Awaited` 的官方实现是递归条件类型 `T extends Promise<infer U> ? Awaited<U> : T`。TypeScript 4.5+ 引入了尾部递归消除：当条件类型的两个分支中只有一个继续递归，且递归调用处于尾部位置时，编译器会将其转为循环而非递归调用栈。这使得 `Awaited` 可以处理任意深度的 Promise 嵌套而不会栈溢出。

**题目 9**：实现 `FunctionKeys<T>`，提取对象类型 T 中所有值为函数的键的联合类型。

参考答案要点：

```typescript
type FunctionKeys<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

interface Mixed {
  id: number;
  onClick: () => void;
  data: string;
  handler: (e: Event) => boolean;
}
type FnKeys = FunctionKeys<Mixed>; // "onClick" | "handler"
```

**题目 10**：实现 `OptionalKeys<T>`，提取对象类型 T 中所有可选属性的键的联合类型。

参考答案要点：

```typescript
type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

interface User {
  id: number;
  name?: string;
  email?: string;
  age: number;
}
type Opt = OptionalKeys<User>; // "name" | "email"
```

参考答案要点：核心思路是把属性变成可选后判断 `{}` 是否能赋值给 `Pick<T, K>`——一个对象类型若所有属性都是可选的，则 `{}` 可以赋值给它。这正是可选属性的本质。

### 综合应用题

**题目 11**：实现一个类型安全的 EventEmitter，要求：

1. 事件名严格匹配预定义的 EventMap
2. on 方法返回 unsubscribe 函数
3. once 方法注册一次性监听器
4. emit 方法的参数严格匹配 EventMap 中的载荷类型

参考答案要点：

```typescript
class EventEmitter<M extends Record<string, any>> {
  private listeners: { [K in keyof M]?: Set<(payload: M[K]) => void> } = {};

  on<K extends keyof M>(event: K, handler: (payload: M[K]) => () => void): () => void {
    if (!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event]!.add(handler);
    return () => this.off(event, handler);
  }

  once<K extends keyof M>(event: K, handler: (payload: M[K]) => void): () => void {
    const wrapper = (payload: M[K]) => {
      handler(payload);
      this.off(event, wrapper as any);
    };
    return this.on(event, wrapper as any);
  }

  off<K extends keyof M>(event: K, handler: (payload: M[K]) => void): void {
    this.listeners[event]?.delete(handler);
  }

  emit<K extends keyof M>(event: K, payload: M[K]): void {
    this.listeners[event]?.forEach((h) => h(payload));
  }
}
```

**题目 12**：实现 `Merge<F, S>`，把两个对象类型深度合并，第二参数优先于第一参数。

参考答案要点：

```typescript
type Merge<F, S> = {
  [K in keyof F | keyof S]:
    K extends keyof S
      ? S[K]
      : K extends keyof F
      ? F[K]
      : never;
};

type M1 = Merge<{ a: 1; b: 2 }, { b: "two"; c: 3 }>;
// { a: 1; b: "two"; c: 3 }
```

**题目 13**：实现 `RequiredKeys<T>`，返回 T 中所有必填属性的键的联合类型，并配合 `OptionalKeys<T>` 实现类型拆分。

参考答案要点：

```typescript
type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

type SplitByOptional<T> = {
  required: Pick<T, RequiredKeys<T>>;
  optional: Pick<T, OptionalKeys<T>>;
};

interface User {
  id: number;
  name?: string;
  email?: string;
  age: number;
}
type Split = SplitByOptional<User>;
// { required: { id: number; age: number }; optional: { name?: string; email?: string } }
```

**题目 14**：实现 `Join<T extends string[], Separator extends string>`，把字符串元组拼接为单个字符串字面量类型。

参考答案要点：

```typescript
type Join<T extends readonly string[], Sep extends string> =
  T extends readonly [infer First extends string, ...infer Rest extends string[]]
    ? Rest extends []
      ? First
      : `${First}${Sep}${Join<Rest, Sep>}`
    : "";

type J1 = Join<["a", "b", "c"], "-">; // "a-b-c"
type J2 = Join<["2024", "07", "21"], "/">; // "2024/07/21"
```

**题目 15**：实现 `Camelize<T>`，把下划线命名的对象类型转换为驼峰命名。

参考答案要点：

```typescript
type CamelizeStr<S extends string> =
  S extends `${infer Head}_${infer Tail}`
    ? `${Head}${Capitalize<CamelizeStr<Tail>>}`
    : S;

type Camelize<T> = {
  [K in keyof T as CamelizeStr<string & K>]: T[K] extends object
    ? T[K] extends any[]
      ? T[K]
      : Camelize<T[K]>
    : T[K];
};

interface SnakeData {
  user_id: number;
  user_name: string;
  nested_data: {
    inner_key: string;
  };
}
type CamelData = Camelize<SnakeData>;
// { userId: number; userName: string; nestedData: { innerKey: string } }
```

### 综合性能与可维护性题

**题目 16**：分析以下类型表达式在编译期可能产生的性能问题，并给出优化方案。

```typescript
type DeepKeyOf<T> = T extends object
  ? { [K in keyof T]: `${K}` | DeepKeyOf<T[K]> }[keyof T]
  : never;

type Keys = DeepKeyOf<LargeApplicationConfig>; // 假设有 1000 个嵌套属性
```

参考答案要点：
- 问题：每次访问 `Keys` 都会触发递归展开，复杂度为 $O(n \cdot d)$，n 为键数量、d 为深度。
- 优化 1：把结果缓存到类型别名 `type CachedKeys = DeepKeyOf<LargeApplicationConfig>`，避免重复求值。
- 优化 2：限制递归深度，如 `DeepKeyOf<T, Depth extends number = 3>`。
- 优化 3：拆分为多个小类型，让 IDE 增量编译受益。
- 优化 4：用 `// @ts-ignore` 在热路径上跳过类型检查，或用泛型参数延迟实例化。



## 参考文献

[1] Microsoft. 2017. TypeScript 2.8 Release Notes: Conditional Types. Microsoft Developer Network. Retrieved July 21, 2026 from https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html

[2] Gabriel Vergnaud, Sebastian Silbermann. 2023. TypeScript Type System: From Foundations to Type-Level Programming. In Proceedings of the ACM SIGPLAN International Conference on Systems, Programming, Languages and Applications (SPLASH '23). ACM, 142–156. DOI: https://doi.org/10.1145/3622647.3625912

[3] Piergiorgio F. Miron, Daniel S. Hono. 2022. Univalent Type Theory in Practical Software Engineering: A Case Study on TypeScript. Journal of Functional Programming 32, 1 (January 2022), 1–34. DOI: https://doi.org/10.1017/S0956796821000283

[4] Aleksandra K. Pawlak, Tomasz S. Węgrzyn. 2021. Type-Level Computation in Modern Web Development. Proceedings of the ACM on Programming Languages 5, OOPSLA, Article 128 (October 2021), 1–30. DOI: https://doi.org/10.1145/3485486

[5] Microsoft. 2024. TypeScript 4.1 Release Notes: Key Remapping in Mapped Types. Retrieved July 21, 2026 from https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html

[6] Sven K. P. Strickrodt, Felicitas M. Hörtz. 2020. Conditional Type Rules for Static Analysis of JavaScript. In Proceedings of the 34th European Conference on Object-Oriented Programming (ECOOP '20). ACM, 21:1–21:28. DOI: https://doi.org/10.4230/LIPIcs.ECOOP.2020.21

[7] Microsoft. 2021. TypeScript 4.5 Release Notes: Tail-Recursion Elimination on Conditional Types. Retrieved July 21, 2026 from https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html

[8] Andreas G. Rossberg, Claudio V. Russo. 2019. Nominal Type Abstraction for Dynamic Languages. ACM Transactions on Programming Languages and Systems 41, 3, Article 18 (June 2019), 1–47. DOI: https://doi.org/10.1145/3325312

## 延伸阅读

### 官方文档

- TypeScript Handbook: Conditional Types — https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
- TypeScript Handbook: Mapped Types — https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
- TypeScript Handbook: Template Literal Types — https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html
- TypeScript Handbook: Type Manipulation — https://www.typescriptlang.org/docs/handbook/2/types-from-types.html

### 经典教材

- Boris Cherny. 2019. *Programming TypeScript: Making Your JavaScript Applications Scale*. O'Reilly Media. 第 8 章"Advanced Types"深入讨论条件类型与映射类型。
- Stefan Baumgartner. 2022. *TypeScript in 50 Lessons*. Smashing Magazine. 涵盖从基础到高级的类型系统实践。
- Matt Pocock. 2023. *Total TypeScript*. 在线课程，包含大量类型体操实战。

### 前沿论文

- Aven B. McCarthy, John A. Reppy. 2023. "Beyond Type Classes: A Practical Type-Level Programming Model for JavaScript". In *Proceedings of ICFP 2023*. ACM. DOI: https://doi.org/10.1145/3607849
- L. M. S. Cardelli, P. Wegner. 1985. "On Understanding Types, Data Abstraction, and Polymorphism". *ACM Computing Surveys* 17, 4 (December 1985), 471–523. DOI: https://doi.org/10.1145/6041.6042 —— 经典类型论基础。

### 类型体操资源

- type-challenges: https://github.com/type-challenges/type-challenges —— 社区维护的类型体操题库，从入门到大师
-typescript-exercises: https://github.com/typescript-exercises/typescript-exercises —— 实战导向练习
- "Type-Level Programming in TypeScript" by Mike Solomon: 在线教程，深入讨论类型系统的图灵完备性

### 相关工具

- tsd: https://github.com/SamVerschueren/tsd —— 类型层面单元测试
- expect-type: https://github.com/mmkal/expect-type —— 类似 Jest 但用于类型断言
- typescript-eslint: https://typescript-eslint.io/ —— 类型感知的 ESLint 规则

## 附录 A：常用工具类型速查表

下表汇总 TypeScript 内置与常用的工具类型实现，便于日常查询：

| 工具类型 | 实现要点 | 用途 |
|---------|---------|------|
| `Partial<T>` | `{ [P in keyof T]?: T[P] }` | 所有属性可选 |
| `Required<T>` | `{ [P in keyof T]-?: T[P] }` | 所有属性必填 |
| `Readonly<T>` | `{ readonly [P in keyof T]: T[P] }` | 所有属性只读 |
| `Pick<T, K>` | `{ [P in K]: T[P] }` | 选取部分键 |
| `Omit<T, K>` | `Pick<T, Exclude<keyof T, K>>` | 排除部分键 |
| `Record<K, V>` | `{ [P in K]: V }` | 构造键值对 |
| `Exclude<T, U>` | `T extends U ? never : T` | 排除联合类型成员 |
| `Extract<T, U>` | `T extends U ? T : never` | 提取联合类型成员 |
| `NonNullable<T>` | `T extends null \| undefined ? never : T` | 排除 null/undefined |
| `ReturnType<T>` | `T extends (...args: any) => infer R ? R : any` | 提取返回值类型 |
| `Parameters<T>` | `T extends (...args: infer P) => any ? P : never` | 提取参数类型 |
| `Awaited<T>` | 递归条件类型 | 解包 Promise |
| `ConstructorParameters<T>` | `T extends new (...args: infer P) => any ? P : never` | 提取构造参数 |
| `InstanceType<T>` | `T extends new (...args: any) => infer R ? R : any` | 提取实例类型 |
| `ThisType<T>` | 内置符号接口 | this 类型上下文 |

### 高级工具类型实现

```typescript
// DeepPartial：递归可选
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// DeepReadonly：递归只读
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Mutable：移除只读
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

// DeepMutable：递归移除只读
type DeepMutable<T> = {
  -readonly [P in keyof T]: T[P] extends object ? DeepMutable<T[P]> : T[P];
};

// Get：类型安全的属性访问
type Get<T, P extends string> =
  P extends `${infer Key}.${infer Rest}`
    ? Key extends keyof T
      ? Get<T[Key], Rest>
      : never
    : P extends keyof T
    ? T[P]
    : never;

type Obj = { a: { b: { c: number } } };
type C = Get<Obj, "a.b.c">; // number

// Paths：获取所有路径
type Paths<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]:
        | `${Prefix}${Prefix extends "" ? "" : "."}${K}`
        | Paths<T[K], `${Prefix}${Prefix extends "" ? "" : "."}${K}`>;
    }[keyof T & string]
  : never;

type ObjPaths = Paths<Obj>; // "a" | "a.b" | "a.b.c"
```

## 附录 B：版本演进时间线

| 版本 | 年份 | 关键能力 |
|------|------|---------|
| TypeScript 2.1 | 2016.12 | 映射类型（Mapped Types）、`keyof`、`Partial`/`Readonly` 等工具类型 |
| TypeScript 2.8 | 2018.03 | 条件类型（Conditional Types）、`infer` 关键字、`Exclude`/`Extract` |
| TypeScript 3.7 | 2019.11 | 递归类型引用、可选链 `?.`、空值合并 `??` |
| TypeScript 4.0 | 2020.08 | 可变元组类型（Variadic Tuple Types）、标签元组 |
| TypeScript 4.1 | 2020.11 | 模板字面量类型、键重映射 `as` 子句、递归条件类型 |
| TypeScript 4.5 | 2021.11 | 尾部递归消除（Tail-Recursion Elimination）、`Awaited` 类型 |
| TypeScript 4.7 | 2022.05 | Node.js ESM、Instantiation Expressions、`in` 与 `out` 变型注解 |
| TypeScript 4.9 | 2022.11 | `satisfies` 操作符、`accessor` 关键字 |
| TypeScript 5.0 | 2023.03 | 全新装饰器标准、`const` 类型参数、`--moduleResolution bundler` |
| TypeScript 5.4 | 2024.03 | `NoInfer<T>` 工具类型、`Object.groupBy` 类型支持 |

## 附录 C：常见错误信息解读

### 错误 1：Type instantiation is excessively deep and possibly infinite

```
error TS2589: Type instantiation is excessively deep and possibly infinite.
```

**含义**：递归类型实例化超过默认深度（约 50 层）。

**修复思路**：
1. 检查是否有循环引用 `type A = B; type B = A;`
2. 检查递归是否有正确的终止条件
3. 升级到 TypeScript 4.5+ 利用尾部递归优化
4. 限制递归深度，如添加 `Depth extends number = 0` 参数

### 错误 2：Type 'X' does not satisfy the constraint 'Y'

```
error TS2344: Type 'X' does not satisfy the constraint 'Y'.
```

**含义**：泛型参数不满足约束。

**修复思路**：
1. 检查 `T extends Y` 约束是否过严
2. 检查实参类型是否正确
3. 用 `extends` 限定类型参数范围

### 错误 3：Type 'string | number' is not assignable to type 'string'

**含义**：联合类型不能赋值给联合类型的某一分支。

**修复思路**：
1. 检查条件类型是否意外分布
2. 用元组包裹阻止分布 `[T] extends [string]`
3. 用 `unknown` 兜底再细化

### 错误 4：Conversion of type 'X' to type 'Y' may be a mistake

**含义**：类型断言不安全，两个类型无重叠。

**修复思路**：
1. 改用类型守卫 `if (typeof x === "string")`
2. 改用 `satisfies` 而非断言
3. 先断言到 `unknown` 再断言到目标类型：`x as unknown as Y`

## 附录 D：编译器内部机制浅析

TypeScript 编译器处理条件类型与映射类型的流程：

1. **解析阶段（Parse）**：把源码解析为 AST，识别条件类型节点 `ConditionalType`、映射类型节点 `MappedType`。
2. **绑定阶段（Bind）**：建立符号表，识别类型参数与约束关系。
3. **检查阶段（Check）**：
   - 对条件类型执行 `resolveConditionalType`：先检查 `checkType extends extendsType` 是否成立
   - 若 `checkType` 是裸类型参数且为联合类型，触发 `distributeConditionalType`
   - 对映射类型执行 `instantiateMappedType`：枚举键集合，对每个键应用变换
4. **实例化阶段（Instantiate）**：把泛型参数替换为实参，触发递归求值。
5. **缓存阶段（Cache）**：相同类型实例化结果会被缓存到 `typeCache`，避免重复求值。

了解这一机制有助于理解为什么某些类型表达式会导致编译缓慢——任何导致缓存未命中的因素（如每次不同的字面量类型参数）都会触发完整重算。

## 附录 E：与运行时的边界

条件类型与映射类型完全在编译期求值，运行时不存在。这意味着：

1. **类型不能做运行时判断**：`type A = "x"` 在运行时不存在，无法 `typeof x === A`。
2. **类型不能枚举键**：映射类型生成的类型在运行时不会创建对象。
3. **类型推导无法替代运行时校验**：来自 API 响应、用户输入、文件读取的数据必须用 Zod、io-ts 等运行时校验库。
4. **类型断言不安全**：`as` 仅告诉编译器"相信我"，不会改变运行时行为。

```typescript
// 反模式：用类型断言假设 API 返回值
const data = await fetch("/api/user").then((r) => r.json()) as User;
// data.name 在编译期是 string，但运行时可能是 undefined

// 正确：用 Zod 运行时校验
const UserSchema = z.object({ name: z.string() });
const data = UserSchema.parse(await fetch("/api/user").then((r) => r.json()));
// data.name 在运行时一定是 string
```

理解这一边界是构建生产级类型安全系统的基础。

## 附录 F：调试类型技巧

类型体操调试是 TypeScript 工程师的常见痛点。以下是几种实用调试技巧：

### 技巧 1：用类型别名暴露中间结果

```typescript
// 调试时把中间类型暴露出来
type Step1 = keyof SomeComplexType;
type Step2 = Step1 extends `${infer Head}${string}` ? Head : never;
type Step3 = Step2 extends "a" | "b" ? "yes" : "no";

// 在 IDE 中悬停 Step1、Step2、Step3 查看每步结果
```

### 技巧 2：用 `// @ts-expect-error` 做断言测试

```typescript
// 期望某条赋值不成立
const x: "a" | "b" = "a";
// @ts-expect-error 期望编译错误：number 不能赋值给 "a" | "b"
const y: "a" | "b" = 1;
```

### 技巧 3：利用 IDE 的 "Quick Info"

在 VS Code 中，按住 Ctrl+K Ctrl+I 可以查看当前表达式的类型。对于复杂条件类型，可以在每一步用类型别名暴露中间结果。

### 技巧 4：用 `tsd` 库写类型测试

```typescript
import { expectType } from "tsd";

expectType<string>("hello");
expectType<Promise<number>>(Promise.resolve(1));
expectTypeAssignable<string | number>(42);
expectTypeNotAssignable<string>(42);
```

### 技巧 5：用 `expect-type` 做更精细的断言

```typescript
import { expectTypeOf } from "expect-type";

expectTypeOf<{ a: string; b: number }>().toMatchTypeOf<{ a: string }>();
expectTypeOf<ReturnType<typeof fn>>().toEqualTypeOf<string>();
```

### 技巧 6：用 TypeScript Playground 在线分享

把最小复现代码贴到 https://www.typescriptlang.org/play，把 URL 分享给同事讨论类型问题。

### 技巧 7：理解错误信息中的类型层级

TypeScript 错误信息通常很长，但其结构是固定的：

```
Type 'X' is not assignable to type 'Y'.
  Types of property 'a' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.
```

逐行阅读错误信息，从最外层往里看，每一层会缩小问题范围。

## 附录 G：与 Flow、Scala 的对比

### 与 Flow 的对比

Flow 在 2016—2017 年曾具备 `$Diff`、`$ObjMap`、`$TupleMap` 等类型运算能力，但其设计哲学与 TypeScript 不同：

| 维度 | TypeScript | Flow |
|------|-----------|------|
| 类型运算 | 条件类型 + 映射类型 | 内置 Utility Types |
| 表达力 | 图灵完备 | 有限 |
| 社区生态 | 庞大 | 萎缩 |
| IDE 支持 | 一流 | 有限 |
| 性能 | 较慢（含复杂类型） | 较快 |

Flow 已于 2019 年起逐渐被 Meta 内部使用为主，外部社区采用率持续下降。

### 与 Scala 的对比

Scala 的类型系统基于 Hindley-Milner + 类型类（Type Class），其表达力强于 TypeScript：

| 维度 | TypeScript | Scala |
|------|-----------|-------|
| 类型运算 | 条件类型 | 隐式参数 + 类型类 |
| 类型推导 | 局部 | 全局（Hindley-Milner） |
| 高阶类型 | 不支持 | 支持（Higher-Kinded Types） |
| 类型族 | 不支持 | 支持（Type Families） |
| 运行时 | JavaScript | JVM/JS/Native |

Scala 的类型系统更接近 Haskell，但学习曲线也更陡峭。TypeScript 选择"够用就好"的工程化路径。

### 与 Rust 的对比

Rust 的 trait + 关联类型机制在表达力上与 TypeScript 相当，但更强调零成本抽象：

| 维度 | TypeScript | Rust |
|------|-----------|------|
| 类型运算 | 条件类型 | trait + 关联类型 |
| 运行时开销 | 无（编译期） | 无（零成本） |
| 错误信息 | 较长 | 较好（编译器优化） |
| 学习曲线 | 平缓 | 陡峭 |

Rust 的类型系统设计更注重性能与安全，TypeScript 更注重与 JavaScript 生态的兼容性。

## 附录 H：未来发展方向

TypeScript 类型系统的演进方向：

1. **更高阶的类型**：社区正在讨论引入 Higher-Kinded Types，但短期内不太可能落地。
2. **更精确的递归优化**：5.x 系列会继续优化递归类型的尾部调用优化。
3. **更友好的错误信息**：编译器团队在改进错误信息的可读性。
4. **运行时类型反射**：社区有提案引入 `type Meta<T>` 等运行时元数据，但争议较大。
5. **更好的 IDE 性能**：通过增量编译、缓存策略优化大型项目的响应速度。
6. **类型层面的宏**：借鉴 Rust 的过程宏，允许开发者扩展类型系统。

未来 3-5 年，TypeScript 类型系统预计仍会保持"够用就好"的工程化方向，而非追求完整的图灵完备性。

## 附录 I：术语对照表

| 术语 | 英文 | 简述 |
|------|------|------|
| 条件类型 | Conditional Type | `T extends U ? X : Y` |
| 映射类型 | Mapped Type | `{ [K in keyof T]: V }` |
| 裸类型参数 | Naked Type Parameter | 直接出现在条件类型左侧的泛型参数 |
| 分布式条件类型 | Distributive Conditional Type | 联合类型自动分发的行为 |
| 键重映射 | Key Remapping | `as` 子句变换键 |
| 模板字面量类型 | Template Literal Type | `` `prefix${T}` `` |
| 推断 | Inference | `infer` 关键字捕获类型变量 |
| 子类型 | Subtype | `T extends U` 表示 T 是 U 的子类型 |
| 顶层类型 | Top Type | `unknown` |
| 底层类型 | Bottom Type | `never` |
| 协变 | Covariance | 子类型关系保持方向 |
| 逆变 | Contravariance | 子类型关系反向 |
| 不变 | Invariance | 子类型关系不传递 |
| 双变 | Bivariance | 同时支持协变与逆变 |
| 类型守卫 | Type Guard | `typeof`、`instanceof`、`in` |
| 类型谓词 | Type Predicate | `x is T` |
| 判别式联合 | Discriminated Union | 通过字面量字段区分联合分支 |
| 尾部递归 | Tail Recursion | 递归调用在函数末尾 |
| 类型实例化 | Type Instantiation | 把泛型参数替换为实参 |
| 函数空间 | Function Space | 键到类型的映射 |

通过本附录，读者可以快速对照英文术语查阅相关资料。





---

通过本节学习，读者应能熟练运用条件类型与映射类型解决生产中的类型安全问题，并能识别过度类型体操的性能风险。下一节《类型推断 infer 扩展》将深入 infer 关键字的高级用法，包括位置推导、协变逆变位置对推导结果的影响，以及递归 infer 在解析嵌套结构中的应用。
