---
order: 67
title: 条件类型分发
module: typescript
category: 'dev-lang'
difficulty: advanced
description: 'TypeScript 分布式条件类型（Distributive Conditional Types）的形式语义、控制策略、类型级算法与生产级应用：裸类型参数、阻止分发、never 空集语义、IsUnion、类型过滤与排列组合。'
author: fanquanpp
updated: '2026-07-21'
related:
  - typescript/条件类型与infer
  - typescript/工具类型实现原理
  - typescript/类型推断infer扩展
  - typescript/递归类型与深度操作
  - typescript/映射类型与键重映射
  - typescript/枚举进阶
prerequisites:
  - typescript/语法速查
  - typescript/泛型约束与默认值
  - typescript/交叉类型与类型合并
tags:
  - typescript
  - distributive-conditional-types
  - naked-type-parameter
  - type-level-programming
  - union-types
---

# 条件类型分发

> 本文档对标 MIT 6.S192 与 Stanford CS143 课程标准，系统讲解 TypeScript 分布式条件类型（Distributive Conditional Types）的形式语义、控制策略、类型级算法与生产级应用。分布式条件类型是 TypeScript 类型系统的核心计算机制之一，它使联合类型能够像集合一样参与类型层面的映射与过滤。本文档面向零基础自学读者，从集合论的基本概念出发，逐步推导分发行为的设计动机、数学语义、控制技巧与实战模式，最终落地为可复用的类型工具库。

---

## 1. 学习目标

完成本文档学习后，读者应能在三个 Bloom 层次上达成以下能力：

### 1.1 认知层（Remembering / Understanding）

- **LO-1.1**：能够准确陈述分布式条件类型的触发条件——"裸类型参数"（Naked Type Parameter）直接出现在 `extends` 左侧，并区分裸类型参数与被包裹类型参数的行为差异。
- **LO-1.2**：能够描述分发的求值规则——对联合类型 $T = T_1 \cup T_2 \cup \cdots \cup T_n$，条件类型分别对每个 $T_i$ 求值，再合并为新的联合类型。
- **LO-1.3**：能够解释 `never` 类型在分布式条件类型中的"空集"语义，并说明 `never` 不触发分发的根本原因（空集无成员可分发）。
- **LO-1.4**：能够复述阻止分发的两种主要技巧——元组包裹 `[T] extends [U]` 与交叉类型包裹 `T & {} extends U`，并说明其形式语义依据。

### 1.2 应用层（Applying / Analyzing）

- **LO-2.1**：能够使用分布式条件类型实现类型过滤（`Filter<T, U>`）、类型排除（`Exclude<T, U>`）、类型提取（`Extract<T, U>`）三类基础模式。
- **LO-2.2**：能够使用 `[T] extends [U]` 阻止分发，实现 `IsNever`、`IsUnion`、`IsAny`、`IsUnknown` 等类型检测工具。
- **LO-2.3**：能够使用分布式条件类型与 `infer` 组合，实现 `Awaited`、`Flatten`、`DeepReadonly` 等递归工具类型。
- **LO-2.4**：能够诊断分发相关的编译错误，如"Type instantiation is excessively deep"、"boolean 分发为 true | false"等常见陷阱。
- **LO-2.5**：能够使用分布式条件类型实现类型级布尔运算（`And`、`Or`、`Not`、`Xor`）、排列组合（`Combine`）、类型级链表与树。

### 1.3 创造层（Evaluating / Creating）

- **LO-3.1**：能够设计一个类型安全的联合类型分解器，将复杂联合类型拆解为元组形式以便运行时遍历。
- **LO-3.2**：能够评估"分布式 vs 非分布式"两种方案在 API 设计中的权衡，并给出量化对比（编译时间、类型推断精度、错误信息质量）。
- **LO-3.3**：能够设计一个类型安全的状态机定义工具，利用分布式条件类型推导状态转移表的合法路径。

---

## 2. 历史动机与演化

### 2.1 联合类型的"分支困境"（2015-2017）

在 TypeScript 2.8 引入条件类型之前，开发者面对联合类型时无法在类型层面进行分支决策。例如，无法表达"如果 T 是字符串联合，则将每个成员转为数组"：

```typescript
// 早期 TypeScript（无条件类型）无法表达：
type ToArray<T> = /* T 是 string | number 时，结果应为 string[] | number[] */;
type Filter<T, U> = /* 从 T 中过滤出 U 的子类型成员 */;
type Exclude<T, U> = /* 从 T 中排除 U 的子类型成员 */;
```

开发者只能依赖函数重载或类型断言绕过这一限制，导致类型安全性大打折扣：

```typescript
// 旧方案：函数重载模拟分支（无法泛化）
function toArray(x: string): string[];
function toArray(x: number): number[];
function toArray(x: any): any[] {
  return [x];
}
// 无法处理 string | number 的联合
```

### 2.2 条件类型的诞生与分发语义（TypeScript 2.8, 2018）

TypeScript 2.8 引入条件类型，核心语法：

```typescript
type ToArray<T> = T extends any ? T[] : never;
type Result = ToArray<string | number>;
// 结果：string[] | number[]
```

设计团队（Daniel Rosenwasser 等）观察到：联合类型在数学上对应集合的并集，而条件类型在语义上对应集合的映射函数。因此，自然的设计是**对联合类型的每个成员分别应用条件类型，再合并结果**——这就是分布式条件类型的本质。

形式化地，这对应集合论中的**像映射**（Image under a function）：

$$
f(S) = \{ f(x) \mid x \in S \}
$$

其中 $S$ 是联合类型，$f$ 是条件类型 $T \texttt{ extends } U \texttt{ ? } X \texttt{ : } Y$。

### 2.3 分发控制的演化（TypeScript 2.8 - 5.0）

随着条件类型的广泛应用，开发者发现分发的"自动性"有时是负担而非便利。例如，检测 `never` 类型时：

```typescript
type IsNever<T> = T extends never ? true : false;
type A = IsNever<never>; // never —— 而非预期的 true！
```

这导致社区发展出多种"阻止分发"的技巧：

- **元组包裹**（TypeScript 2.8+）：`[T] extends [U]`，最经典的做法。
- **交叉类型包裹**（TypeScript 4.0+）：`T & {} extends U`，利用交叉类型破坏裸类型参数。
- **条件类型包裹**（TypeScript 4.5+）：使用 `extends infer` 重新绑定类型变量。

### 2.4 现代分布式条件类型的工程化应用

今天，分布式条件类型已成为 TypeScript 类型编程的核心基石：

1. **工具类型库**：`utility-types`、`type-fest` 提供数百个基于分发的工具。
2. **类型安全 ORM**：Prisma、Drizzle 利用分发推导查询结果的字段类型。
3. **类型安全路由**：Next.js、TanStack Router 利用分发推导路由参数。
4. **类型安全状态机**：XState、Robot3 利用分发生成合法状态转移路径。
5. **类型安全 i18n**：i18next、FormatJS 利用分发推导翻译键的联合类型。

---

## 3. 形式化定义

### 3.1 分布式条件类型的语法

条件类型的 BNF 文法：

$$
\begin{aligned}
\text{ConditionalType} &\to \text{Type} \ \texttt{extends} \ \text{Type} \ \texttt{?} \ \text{Type} \ \texttt{:} \ \text{Type} \\
\text{CheckType} &\to \text{Type} \mid \text{NakedTypeParameter} \mid \text{WrappedTypeParameter}
\end{aligned}
$$

其中：
- **NakedTypeParameter**：直接出现在 `extends` 左侧的类型参数 `T`。
- **WrappedTypeParameter**：被元组、数组、交叉类型等构造器包裹的类型参数，如 `[T]`、`T[]`、`T & {}`。

### 3.2 联合类型的集合语义

TypeScript 中的联合类型 $T_1 \cup T_2 \cup \cdots \cup T_n$ 对应集合论中的并集：

$$
T_1 \cup T_2 = \{ x \mid x \in T_1 \vee x \in T_2 \}
$$

特殊地，`never` 类型对应**空集** $\emptyset$：

$$
\texttt{never} = \emptyset = \{ \}
$$

### 3.3 分布式条件类型的求值规则

设 $T = T_1 \cup T_2 \cup \cdots \cup T_n$ 为联合类型，条件类型 $C = T \texttt{ extends } U \texttt{ ? } X \texttt{ : } Y$ 的求值规则为：

$$
\frac{T \text{ is naked} \quad T = \bigcup_{i=1}^{n} T_i}{C \Downarrow \bigcup_{i=1}^{n} (T_i \texttt{ extends } U \texttt{ ? } X \texttt{ : } Y)}
$$

关键前提"$T$ is naked"——$T$ 直接出现在 `extends` 左侧，未被元组、函数等构造器包裹。

### 3.4 非分布式条件类型的求值规则

若 $T$ 被包裹（如 $[T]$ extends $[U]$），则不分发：

$$
\frac{T \text{ is wrapped}}{C \Downarrow ([T] \texttt{ extends } [U] \texttt{ ? } X \texttt{ : } Y)}
$$

此时 $[T_1 \cup T_2] <: [U]$ 当且仅当 $(T_1 \cup T_2) <: U$（元组的协变规则）。

### 3.5 `never` 的空集语义

对于分布式条件类型：

$$
(\emptyset \texttt{ extends } U \texttt{ ? } X \texttt{ : } Y) \Downarrow \emptyset
$$

解释：`never` 是空联合类型，没有成员可以分发，因此结果为空联合类型，即 `never`。

对于非分布式条件类型（用元组包裹）：

$$
([\emptyset] \texttt{ extends } [U] \texttt{ ? } X \texttt{ : } Y) \Downarrow X
$$

解释：$[\emptyset]$ 是单元素元组，其元素类型为 `never`，但元组本身存在，因此仍参与条件判断。`[never] extends [any]` 为 `true`（因为 `never <: any`）。

### 3.6 分发的代数性质

分布式条件类型满足以下代数性质：

**分配律**（Distributivity）：

$$
f(T_1 \cup T_2) = f(T_1) \cup f(T_2)
$$

**空集律**（Empty Set）：

$$
f(\emptyset) = \emptyset
$$

**单元素律**（Singleton）：

$$
f(\{x\}) = \{ f(x) \}
$$

**幂等律**（Idempotence，当 $f$ 为恒等时）：

$$
f(f(T)) = f(T) \quad \text{若 } f = \text{identity}
$$

---

## 4. 理论推导与证明

### 4.1 分配律的证明

**命题 4.1**：分布式条件类型对联合类型满足分配律，即：

$$
(T_1 \cup T_2) \texttt{ extends } U \texttt{ ? } X \texttt{ : } Y = \big((T_1 \texttt{ extends } U \texttt{ ? } X \texttt{ : } Y) \cup (T_2 \texttt{ extends } U \texttt{ ? } X \texttt{ : } Y)\big)
$$

**证明**：根据分布式条件类型的求值规则（3.3 节），$T = T_1 \cup T_2$ 是裸类型参数，触发分发：

$$
(T_1 \cup T_2) \texttt{ extends } U \texttt{ ? } X \texttt{ : } Y \Downarrow (T_1 \texttt{ extends } U \texttt{ ? } X \texttt{ : } Y) \cup (T_2 \texttt{ extends } U \texttt{ ? } X \texttt{ : } Y)
$$

两边表达式恒等。$\blacksquare$

**工程含义**：分布式条件类型天然支持"类型过滤"——对于联合类型 $T$，可过滤出满足某条件的成员。

### 4.2 空集律的证明

**命题 4.2**：对于任意条件类型 $C = T \texttt{ extends } U \texttt{ ? } X \texttt{ : } Y$，若 $T = \texttt{never}$（空集），则 $C \Downarrow \texttt{never}$，无论 $U$、$X$、$Y$ 是什么。

**证明**：`never` 是空联合类型，分布式条件类型对空集的映射结果仍是空集：

$$
\texttt{never} = \bigcup_{i \in \emptyset} T_i
$$

因此：

$$
\texttt{never} \texttt{ extends } U \texttt{ ? } X \texttt{ : } Y = \bigcup_{i \in \emptyset} (\cdots) = \texttt{never}
$$

$\blacksquare$

**工程含义**：若想检测 $T$ 是否为 `never`，不能用裸类型参数，必须用元组包裹：

```typescript
type IsNever<T> = [T] extends [never] ? true : false;

type A = IsNever<never>; // true
type B = IsNever<string>; // false
```

### 4.3 `boolean` 的分解性

**命题 4.3**：`boolean` 类型在 TypeScript 中等价于 `true | false` 联合类型，因此在分布式条件类型中会分解为两个成员。

**证明**：TypeScript 规范明确将 `boolean` 视为 `true | false` 的别名。对于分布式条件类型：

$$
\texttt{boolean} \texttt{ extends } U \texttt{ ? } X \texttt{ : } Y = (\texttt{true} \texttt{ extends } U \texttt{ ? } X \texttt{ : } Y) \cup (\texttt{false} \texttt{ extends } U \texttt{ ? } X \texttt{ : } Y)
$$

**示例**：

```typescript
type ToArray<T> = T extends any ? T[] : never;
type Result = ToArray<boolean>; // true[] | false[]，而非 boolean[]
```

$\blacksquare$

**工程含义**：处理 `boolean` 时需特别小心，若不希望分解，需用元组包裹。

### 4.4 阻止分发的正确性

**命题 4.4**：使用元组包裹 `[T] extends [U]` 可以正确阻止分发，且不改变子类型判定结果。

**证明**：分两步：

1. **阻止分发**：`[T]` 不是裸类型参数（被元组构造器包裹），因此不触发 3.3 节的分发规则。

2. **保持子类型语义**：元组是协变的（Covariant），即 $[S] <: [T] \iff S <: T$。因此：

$$
[T_1 \cup T_2] <: [U] \iff (T_1 \cup T_2) <: U \iff T_1 <: U \wedge T_2 <: U
$$

这正是不分发的预期行为。$\blacksquare$

### 4.5 `IsUnion` 的正确性

**命题 4.5**：以下 `IsUnion` 实现能正确检测联合类型：

```typescript
type IsUnion<T> = [T] extends [never]
  ? false
  : T extends any
    ? [T] extends [T]
      ? false
      : true
    : never;
```

**证明**：分情况讨论：

**情况 1**：$T = \texttt{never}$。第一个条件 `[T] extends [never]` 为 `true`，返回 `false`。正确（`never` 不是联合类型）。

**情况 2**：$T$ 不是联合类型，例如 $T = \texttt{string}$。触发分发（$T$ 是裸类型参数），但只有一个成员 `string`。内层 `[string] extends [string]` 为 `true`，返回 `false`。正确。

**情况 3**：$T$ 是联合类型，例如 $T = \texttt{string} \cup \texttt{number}$。触发分发，对每个成员分别求值：
- 对于 `string`：内层 `[string] extends [string | number]` 为 `true`（`string <: string | number`），返回 `false`。
- 对于 `number`：内层 `[number] extends [string | number]` 为 `true`，返回 `false`。

等等，这似乎不对。让我们重新分析。

实际上，分发后 `T` 被替换为单个成员，但内层的 `[T] extends [T]` 中的 `T` 仍然是**原始的联合类型**（因为 TypeScript 的分发只替换裸类型参数，而内层的 `T` 在 `[T] extends [T]` 中是被包裹的，不会分发，但仍引用原始类型）。

修正分析：
- 分发后，外层 `T` 被替换为 `string`（第一次迭代）。
- 内层 `[T] extends [T]` 中的 `T` 是**原始类型** `string | number`（因为分发只影响裸类型参数的求值，但类型别名中的 `T` 仍绑定原始值）。
- 因此 `[string] extends [string | number]` 为 `true`，返回 `false`。

这仍然不对。实际上，TypeScript 的分发行为是：在 `T extends any ? ... : ...` 中，`T` 被替换为联合的每个成员，因此内层的 `T` 也是成员而非原始联合。

正确的实现应该是：

```typescript
type IsUnion<T, C = T> = [T] extends [never]
  ? false
  : T extends any
    ? [C] extends [T]
      ? false
      : true
    : never;
```

这里 `C` 保存原始类型，内层 `[C] extends [T]` 检查原始联合是否是单个成员的子类型。若 $T$ 是联合，则 `[C] = [string | number]` 不是 `[string]` 的子类型（因为 `number` 不是 `string`），返回 `true`。$\blacksquare$

**工程含义**：实现 `IsUnion` 时需引入额外参数保存原始类型，否则分发后丢失联合信息。

---

## 5. 代码示例

### 5.1 分发行为演示

#### 5.1.1 自动分发

```typescript
type ToArray<T> = T extends any ? T[] : never;

type Result1 = ToArray<string | number>;
// 等价于：ToArray<string> | ToArray<number>
// 结果：string[] | number[]

type Result2 = ToArray<boolean>;
// boolean 是 true | false，分发后为 true[] | false[]

type Result3 = ToArray<'a' | 'b' | 'c'>;
// 'a'[] | 'b'[] | 'c'[]
```

#### 5.1.2 阻止分发

```typescript
type ToArrayNoDistribute<T> = [T] extends [any] ? T[] : never;

type Result1 = ToArrayNoDistribute<string | number>;
// 结果：(string | number)[] —— 不分发

type Result2 = ToArrayNoDistribute<boolean>;
// 结果：boolean[] —— 不分解为 true[] | false[]
```

#### 5.1.3 `never` 的行为

```typescript
type ToArray<T> = T extends any ? T[] : never;

type Result1 = ToArray<never>; // never —— 空集无成员可分发

type Result2 = ToArray<string | never>; // string[] —— never 被吸收
// 等价于 ToArray<string>
```

### 5.2 类型过滤

#### 5.2.1 基础过滤

```typescript
type Filter<T, U> = T extends U ? T : never;

// 只保留字符串类型
type OnlyStrings = Filter<string | number | boolean, string>;
// string

// 只保留函数类型
type OnlyFunctions = Filter<string | number | (() => void) | object, (...args: any[]) => any>;
// () => void

// 排除 null 和 undefined（等价于内置 NonNullable）
type NonNull<T> = Filter<T, null | undefined>;

type Result = NonNull<string | null | number | undefined>;
// string | number
```

#### 5.2.2 类型排除（Exclude）

```typescript
type MyExclude<T, U> = T extends U ? never : T;

type Result1 = MyExclude<'a' | 'b' | 'c', 'a'>;
// 'b' | 'c'

type Result2 = MyExclude<string | number | boolean, string>;
// number | boolean

type Result3 = MyExclude<string | number | (() => void), Function>;
// string | number
```

#### 5.2.3 类型提取（Extract）

```typescript
type MyExtract<T, U> = T extends U ? T : never;

type Result1 = MyExtract<'a' | 'b' | 'c', 'a' | 'b'>;
// 'a' | 'b'

type Result2 = MyExtract<string | number | boolean, string | boolean>;
// string | boolean
```

#### 5.2.4 复杂过滤

```typescript
// 过滤出对象类型
type OnlyObjects<T> = T extends object ? T : never;

type Result = OnlyObjects<string | number | { id: number } | { name: string } | boolean>;
// { id: number } | { name: string }

// 过滤出字面量类型
type OnlyLiterals<T> = T extends string | number | boolean
  ? [T] extends [string | number | boolean]
    ? never
    : T
  : T;

type Result2 = OnlyLiterals<'hello' | string | 42 | number | true>;
// 'hello' | 42 | true
```

### 5.3 类型映射

#### 5.3.1 成员替换

```typescript
type MapType<T, U, V> = T extends U ? V : T;

// 将 number 替换为 null
type ReplaceNumber = MapType<string | number | boolean, number, null>;
// string | null | boolean

// 将所有函数替换为字符串描述
type DescribeFunctions<T> = T extends (...args: any[]) => any
  ? `function`
  : T;

type Result = DescribeFunctions<string | (() => void) | number | ((x: number) => string)>;
// string | "function" | number | "function"
```

#### 5.3.2 类型包装

```typescript
type Wrap<T> = T extends any ? { value: T } : never;

type Result = Wrap<string | number>;
// { value: string } | { value: number }

// 条件包装：只包装字面量类型
type WrapLiterals<T> = T extends string | number | boolean
  ? [T] extends [string | number | boolean]
    ? T  // 非字面量，不包装
    : { value: T }  // 字面量，包装
  : T;

type Result2 = WrapLiterals<'hello' | string | 42>;
// { value: 'hello' } | string | { value: 42 }
```

### 5.4 控制分发

#### 5.4.1 元组包裹阻止分发

```typescript
type NoDistribute<T> = [T] extends [never] ? true : false;

type A = NoDistribute<string | number>; // false（联合类型不是 never）
type B = NoDistribute<never>; // true（never 是 never）
type C = NoDistribute<string>; // false
```

#### 5.4.2 交叉类型包裹阻止分发

```typescript
type NoDistribute2<T> = T & {} extends never ? true : false;

type A = NoDistribute2<string | number>; // false
type B = NoDistribute2<never>; // true（never & {} 仍为 never）
```

#### 5.4.3 条件分发

```typescript
// 只对非 never 分发
type Wrap<T> = [T] extends [never] ? never : T extends any ? { value: T } : never;

type A = Wrap<string | number>;
// { value: string } | { value: number }

type B = Wrap<never>; // never
```

### 5.5 检测类型

#### 5.5.1 IsNever

```typescript
type IsNever<T> = [T] extends [never] ? true : false;

type A = IsNever<never>; // true
type B = IsNever<string>; // false
type C = IsNever<string | never>; // false（never 被吸收）
```

#### 5.5.2 IsUnion

```typescript
type IsUnion<T, C = T> = [T] extends [never]
  ? false
  : T extends any
    ? [C] extends [T]
      ? false
      : true
    : never;

type A = IsUnion<string>; // false
type B = IsUnion<string | number>; // true
type C = IsUnion<never>; // false
type D = IsUnion<boolean>; // true（boolean 是 true | false）
```

#### 5.5.3 IsAny

```typescript
type IsAny<T> = 0 extends 1 & T ? true : false;

type A = IsAny<any>; // true（any 可赋值给任何类型，包括 1 & any = any）
type B = IsAny<string>; // false
type C = IsAny<unknown>; // false
type D = IsAny<never>; // false
```

#### 5.5.4 IsUnknown

```typescript
type IsUnknown<T> = IsAny<T> extends true
  ? false
  : unknown extends T
    ? true
    : false;

type A = IsUnknown<unknown>; // true
type B = IsUnknown<any>; // false
type C = IsUnknown<string>; // false
```

### 5.6 递归展开

#### 5.6.1 Flatten

```typescript
type Flatten<T> = T extends Array<infer U> ? Flatten<U> : T;

type Nested = string[][][];
type Flat = Flatten<Nested>; // string

// 通用版本：同时处理数组和 Promise
type DeepUnwrap<T> = T extends Array<infer U>
  ? DeepUnwrap<U>
  : T extends Promise<infer U>
    ? DeepUnwrap<U>
    : T;

type Deep = Array<Promise<Array<Promise<number>>>>;
type Unwrapped = DeepUnwrap<Deep>; // number
```

#### 5.6.2 Awaited

```typescript
type Awaited<T> = T extends Promise<infer U>
  ? U extends Promise<unknown>
    ? Awaited<U>  // 递归解包
    : U
  : T;

type A = Awaited<Promise<string>>; // string
type B = Awaited<Promise<Promise<number>>>; // number
type C = Awaited<string | Promise<number>>; // string | number
```

### 5.7 类型级布尔运算

```typescript
type And<A extends boolean, B extends boolean> = A extends true
  ? B extends true ? true : false
  : false;

type Or<A extends boolean, B extends boolean> = A extends true
  ? true
  : B extends true ? true : false;

type Not<A extends boolean> = A extends true ? false : true;

type Xor<A extends boolean, B extends boolean> = A extends true
  ? Not<B>
  : B;

type Test1 = And<true, true>;   // true
type Test2 = And<true, false>;  // false
type Test3 = Or<false, true>;   // true
type Test4 = Not<true>;         // false
type Test5 = Xor<true, false>;  // true
```

### 5.8 联合类型排列组合

```typescript
// 生成两个联合类型的笛卡尔积
type Combine<A, B> = A extends any ? (B extends any ? [A, B] : never) : never;

type Pair = Combine<'a' | 'b', 1 | 2>;
// ['a', 1] | ['a', 2] | ['b', 1] | ['b', 2]

// 生成对象键值对
type ObjectFromEntries<T extends [PropertyKey, any]> = {
  [K in T[0]]: Extract<T, [K, any]>[1];
};

type Entries = ['name', string] | ['age', number] | ['active', boolean];
type Obj = ObjectFromEntries<Entries>;
// { name: string; age: number; active: boolean }
```

### 5.9 条件类型链

```typescript
// 多层条件类型链，类似模式匹配
type Match<T> = T extends string
  ? { type: 'string'; value: T }
  : T extends number
    ? { type: 'number'; value: T }
    : T extends boolean
      ? { type: 'boolean'; value: T }
      : T extends Array<any>
        ? { type: 'array'; value: T }
        : T extends object
          ? { type: 'object'; value: T }
          : { type: 'unknown'; value: T };

type StringMatch = Match<'hello'>;   // { type: 'string'; value: 'hello' }
type NumberMatch = Match<42>;        // { type: 'number'; value: 42 }
type ArrayMatch = Match<string[]>;   // { type: 'array'; value: string[] }
type ObjectMatch = Match<{ id: 1 }>; // { type: 'object'; value: { id: 1 } }
```

### 5.10 类型级链表

```typescript
// 类型级链表
type List<T = any> = Nil | Cons<T>;

interface Nil { readonly _tag: 'Nil'; }
interface Cons<T> { readonly _tag: 'Cons'; readonly head: T; readonly tail: List<T>; }

// 链表长度
type Length<L extends List> = L extends Cons<any>
  ? 1 + Length<L['tail']>
  : 0;

// 链表反转
type Reverse<L extends List, Acc extends List = Nil> = L extends Cons<infer H>
  ? Reverse<L['tail'], Cons<H, Acc>>
  : Acc;

// 链表映射
type MapList<L extends List, F> = L extends Cons<infer H>
  ? Cons<Apply<F, H>, MapList<L['tail'], F>>
  : Nil;

type Apply<F, X> = F extends (x: X) => infer R ? R : never;
```

---

## 6. 对比分析

### 6.1 与 Flow 的对比

| 维度 | TypeScript 分布式条件类型 | Flow |
|------|--------------------------|------|
| **分支机制** | `T extends U ? X : Y` | 无等价语法 |
| **联合处理** | 自动分发 | 需手动枚举 |
| **类型过滤** | `Exclude`、`Extract` | 不支持 |
| **`infer`** | 支持 | 不支持 |
| **类型级编程** | 图灵完备 | 有限 |
| **学习曲线** | 陡峭 | 平缓 |

**分析**：Flow 的类型系统更保守，不提供条件类型与分发机制。开发者需依赖函数重载或 `union` 手动处理，类型安全性较弱。

### 6.2 与 Rust Traits 的对比

| 维度 | TypeScript 分布式条件类型 | Rust Traits |
|------|--------------------------|-------------|
| **分支依据** | 子类型关系 | Trait 实现 |
| **分发对象** | 联合类型成员 | 无联合概念 |
| **编译期计算** | 类型级函数 | Const Generic |
| **性能影响** | 编译变慢 | 无影响 |
| **运行时行为** | 无（类型擦除） | 单态化 |

**分析**：Rust 的 Trait 系统更严格，但缺乏 TypeScript 的灵活性。TypeScript 的分发机制适合动态语言的类型增强，Rust 的 Trait 适合零成本抽象。

### 6.3 与 Haskell Type Families 的对比

| 维度 | TypeScript 分布式条件类型 | Haskell Type Families |
|------|--------------------------|----------------------|
| **语义** | 类型级函数 | 类型族 |
| **分发依据** | 子类型 | 模式匹配 |
| **开放性** | 开放（可扩展） | 关闭（封闭族） |
| **一致性检查** | 无 | 编译器检查 |
| **复杂度** | 中等 | 高 |

**分析**：Haskell 的 Type Families 更形式化，有编译器一致性检查。TypeScript 的条件类型更灵活但安全性较低。

### 6.4 与纯 JavaScript 的对比

| 维度 | TypeScript 分布式条件类型 | 纯 JavaScript |
|------|--------------------------|---------------|
| **类型安全** | 编译期保证 | 运行时错误 |
| **重构支持** | 类型引导 | 无 |
| **IDE 支持** | 自动补全、跳转 | 有限 |
| **运行时开销** | 零（类型擦除） | 零 |
| **学习成本** | 高 | 低 |

**分析**：TypeScript 的分布式条件类型为 JavaScript 提供了编译期类型安全，零运行时开销。

---

## 7. 常见陷阱与反模式

### 7.1 `never` 检测陷阱

**陷阱**：使用裸类型参数检测 `never` 总是返回 `never`。

```typescript
type IsNever<T> = T extends never ? true : false;
type A = IsNever<never>; // never —— 而非预期的 true！
```

**原因**：`never` 是空联合类型，触发分发后无成员可迭代，结果为空联合 `never`。

**修复**：用元组包裹阻止分发：

```typescript
type IsNever<T> = [T] extends [never] ? true : false;
type A = IsNever<never>; // true
```

### 7.2 `boolean` 分解陷阱

**陷阱**：`boolean` 在分发中会分解为 `true | false`。

```typescript
type ToArray<T> = T extends any ? T[] : never;
type Result = ToArray<boolean>; // true[] | false[] —— 而非 boolean[]
```

**原因**：TypeScript 将 `boolean` 视为 `true | false` 的别名。

**修复**：用元组包裹阻止分解：

```typescript
type ToArrayNoDistribute<T> = [T] extends [any] ? T[] : never;
type Result = ToArrayNoDistribute<boolean>; // boolean[]
```

### 7.3 函数重载 `infer` 陷阱

**陷阱**：对函数重载使用 `infer` 只能提取最后一个签名。

```typescript
type ReturnOf<T> = T extends (...args: any[]) => infer R ? R : never;

type Fn = {
  (x: string): number;
  (x: number): string;
};

type R = ReturnOf<Fn>; // string —— 只取最后一个签名的返回值
```

**原因**：TypeScript 的 `infer` 对重载函数选择最后一个签名（实现签名）。

**修复**：无法直接修复，需重构为联合类型或使用其他模式。

### 7.4 递归深度陷阱

**陷阱**：深度递归条件类型会触发编译器限制。

```typescript
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// 深度嵌套类型会报错：Type instantiation is excessively deep
type Deep = { a: { b: { c: { d: { e: { f: string } } } } } };
type ReadonlyDeep = DeepReadonly<Deep>; // 可能报错
```

**原因**：TypeScript 默认递归深度限制为 50 层（4.5+ 调整为 1000 层尾递归）。

**修复**：限制递归深度或使用尾递归优化：

```typescript
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
```

### 7.5 分发与映射类型交互陷阱

**陷阱**：映射类型中的条件类型也会触发分发。

```typescript
type Wrap<T> = {
  [K in keyof T]: T[K] extends string ? 'string' : 'other';
};

type Result = Wrap<{ a: string; b: number; c: string | number }>;
// { a: 'string'; b: 'other'; c: 'string' | 'other' }
// c 的结果是联合，因为 string | number 触发了分发
```

**修复**：若不希望分发，用元组包裹：

```typescript
type Wrap<T> = {
  [K in keyof T]: [T[K]] extends [string] ? 'string' : 'other';
};

type Result = Wrap<{ a: string; b: number; c: string | number }>;
// { a: 'string'; b: 'other'; c: 'other' }
```

### 7.6 `any` 交互陷阱

**陷阱**：`any` 在条件类型中有特殊行为。

```typescript
type IsAny<T> = T extends any ? true : false;
type A = IsAny<any>; // boolean —— 而非 true
```

**原因**：`any` 可赋值给任何类型，也兼容任何类型。`any extends any` 触发分发，但 `any` 既像 `true` 又像 `false`，结果为 `boolean`。

**修复**：用交叉类型检测 `any`：

```typescript
type IsAny<T> = 0 extends 1 & T ? true : false;
type A = IsAny<any>; // true
```

### 7.7 `unknown` 推断陷阱

**陷阱**：`unknown` 不触发分发，但也不匹配大多数条件。

```typescript
type IsString<T> = T extends string ? true : false;
type A = IsString<unknown>; // false
type B = IsString<string | unknown>; // boolean —— unknown 吸收 string
```

**修复**：显式处理 `unknown`：

```typescript
type IsString<T> = [T] extends [never]
  ? false
  : T extends string
    ? unknown extends T
      ? false
      : true
    : false;
```

### 7.8 分发性能陷阱

**陷阱**：大型联合类型的分发会显著拖慢编译。

```typescript
type BigUnion = 'a' | 'b' | 'c' | ... | 'z'; // 26 个成员
type Mapped = { [K in BigUnion]: K extends `a${string}` ? 'starts-with-a' : K };
// 编译时间随成员数线性增长
```

**修复**：使用映射类型替代分发，或限制联合规模。

---

## 8. 工程实践与最佳实践

### 8.1 标准工具类型实现

```typescript
// 基于分发的标准工具类型
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type NonNullable<T> = T extends null | undefined ? never : T;

// 阻止分发的工具类型
type IsNever<T> = [T] extends [never] ? true : false;
type IsAny<T> = 0 extends 1 & T ? true : false;
type IsUnknown<T> = IsAny<T> extends true ? false : unknown extends T ? true : false;
type IsUnion<T, C = T> = [T] extends [never]
  ? false
  : T extends any
    ? [C] extends [T] ? false : true
    : never;
```

### 8.2 深度操作工具

```typescript
// 深度只读
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

// 深度可变
type DeepMutable<T> = T extends object
  ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
  : T;

// 深度可选
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

// 深度 Required
type DeepRequired<T> = T extends object
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T;
```

### 8.3 类型过滤器

```typescript
// 按值类型过滤属性
type PickByValue<T, V> = Pick<T, {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T]>;

type OmitByValue<T, V> = Pick<T, {
  [K in keyof T]: T[K] extends V ? never : K;
}[keyof T]>;

// 示例
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  active: boolean;
}

type StringProps = PickByValue<User, string>;
// { name: string; email: string }

type NonStringProps = OmitByValue<User, string>;
// { id: number; age: number; active: boolean }
```

### 8.4 路径工具

```typescript
// 获取对象所有路径
type Path<T, P extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: Path<T[K], `${P}${P extends '' ? '' : '.'}${K}`>;
    }[keyof T & string] | P
  : P;

interface Config {
  api: { baseURL: string; timeout: number };
  ui: { theme: string; locale: string };
}

type ConfigPaths = Path<Config>;
// '' | 'api' | 'api.baseURL' | 'api.timeout' | 'ui' | 'ui.theme' | 'ui.locale'
```

### 8.5 类型安全 API

```typescript
// 类型安全的 API 响应处理
type ApiResponse<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };

type ExtractData<T> = T extends { success: true; data: infer D } ? D : never;
type ExtractError<T> = T extends { success: false; error: infer E } ? E : never;

function handleResponse<T, E>(response: ApiResponse<T, E>): T {
  if (response.success) {
    return response.data;
  }
  throw new Error(response.error);
}

const res: ApiResponse<{ id: number; name: string }, { code: number; message: string }> = {
  success: true,
  data: { id: 1, name: 'Alice' }
};

const data = handleResponse(res); // { id: number; name: string }
```

### 8.6 类型安全 SQL 查询构建器

```typescript
// 类型安全的 SQL 查询构建器（简化版）
type Column<T extends string> = T;
type Table<T extends string, C extends string> = { name: T; columns: C[] };

type Users = Table<'users', 'id' | 'name' | 'email' | 'age'>;
type Posts = Table<'posts', 'id' | 'title' | 'content' | 'userId'>;

type SelectResult<T extends Table<string, infer C>, S extends C> = {
  [K in S]: K extends 'id' ? number : K extends 'age' ? number : string;
};

function select<T extends Table<string, string>, S extends T['columns'][number]>(
  table: T,
  columns: S[]
): SelectResult<T, S>[] {
  // 运行时实现省略
  return [] as any;
}

const users: Users = { name: 'users', columns: ['id', 'name', 'email', 'age'] };
const result = select(users, ['id', 'name']);
// SelectResult<Users, 'id' | 'name'>[] = { id: number; name: string }[]
```

### 8.7 性能优化

```typescript
// 避免深度递归
type ShallowReadonly<T> = { readonly [K in keyof T]: T[K] };

// 使用尾递归
type Flatten<T> = T extends Array<infer U> ? Flatten<U> : T;

// 限制联合规模
type LimitedUnion = 'a' | 'b' | 'c'; // 不超过 10 个成员

// 使用映射类型替代分发
type Mapped<T> = { [K in keyof T]: T[K] };
```

---

## 9. 案例研究

### 9.1 SetRequired 工具

**需求**：将对象的部分属性从可选改为必选。

```typescript
type SetRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// 简化实现，保留原始顺序
type SetRequired2<T, K extends keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P];
} & {
  [P in K]-?: T[P];
};

interface User {
  id: number;
  name?: string;
  email?: string;
  age: number;
}

type RequiredUser = SetRequired<User, 'name' | 'email'>;
// { id: number; age: number; name: string; email: string }
```

**分析**：使用 `Omit` 与 `Required` 组合实现，分发行为用于 `K extends keyof T` 的过滤。

### 9.2 Path 类型工具

**需求**：获取对象所有嵌套路径。

```typescript
type Path<T, P extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: Path<T[K], `${P}${P extends '' ? '' : '.'}${K}`>;
    }[keyof T & string] | P
  : P;

interface Config {
  api: { baseURL: string; timeout: number };
  ui: { theme: string; locale: string };
}

type ConfigPaths = Path<Config>;
// '' | 'api' | 'api.baseURL' | 'api.timeout' | 'ui' | 'ui.theme' | 'ui.locale'

// 获取路径对应的值类型
type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

type TimeoutType = PathValue<Config, 'api.timeout'>; // number
```

**分析**：利用分发与模板字面量类型组合，递归遍历对象结构。

### 9.3 React Router 参数提取

**需求**：从路由模式提取参数名。

```typescript
type ExtractParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? { [K in Param]: string } & ExtractParams<Rest>
  : T extends `${string}:${infer Param}`
    ? { [K in Param]: string }
    : {};

type RouteParams = ExtractParams<'/users/:userId/posts/:postId'>;
// { userId: string; postId: string }

// 更完整的实现，支持可选参数
type ExtractParams2<T extends string> = T extends `${string}:${infer Param}?/${infer Rest}`
  ? { [K in Param]?: string } & Partial<ExtractParams2<Rest>>
  : T extends `${string}:${infer Param}/${infer Rest}`
    ? { [K in Param]: string } & ExtractParams2<Rest>
    : T extends `${string}:${infer Param}?`
      ? { [K in Param]?: string }
      : T extends `${string}:${infer Param}`
        ? { [K in Param]: string }
        : {};

type Params = ExtractParams2<'/users/:userId/posts/:postId?'>;
// { userId: string; postId?: string }
```

**分析**：利用条件类型与模板字面量类型的组合，实现路由参数的类型推导。

### 9.4 Zod 风格类型推导

**需求**：从运行时模式推导编译期类型。

```typescript
// 简化的 Zod 风格模式
type Schema =
  | { type: 'string' }
  | { type: 'number' }
  | { type: 'boolean' }
  | { type: 'array'; element: Schema }
  | { type: 'object'; properties: Record<string, Schema> };

type InferType<S extends Schema> = S extends { type: 'string' }
  ? string
  : S extends { type: 'number' }
    ? number
    : S extends { type: 'boolean' }
      ? boolean
      : S extends { type: 'array'; element: infer E }
        ? E extends Schema
          ? InferType<E>[]
          : never
        : S extends { type: 'object'; properties: infer P }
          ? { [K in keyof P]: P[K] extends Schema ? InferType<P[K]> : never }
          : never;

const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
    tags: { type: 'array', element: { type: 'string' } }
  }
} as const;

type User = InferType<typeof userSchema>;
// { name: string; age: number; tags: string[] }
```

**分析**：利用条件类型链与递归，从运行时模式推导编译期类型。

### 9.5 React useState 泛型推导

**需求**：根据初始值推导状态类型。

```typescript
// 模拟 React.useState 的类型推导
type InferState<T> = T extends () => infer R
  ? R  // 函数形式：惰性初始化
  : T;

function useState<T>(initial: T): [InferState<T>, (value: InferState<T>) => void] {
  let state = initial as any;
  const setState = (value: any) => { state = value; };
  return [state, setState];
}

// 数值初始值
const [count, setCount] = useState(0);
// count: number, setCount: (value: number) => void

// 函数初始值（惰性初始化）
const [expensive, setExpensive] = useState(() => computeExpensiveValue());
// expensive: ReturnType<typeof computeExpensiveValue>
```

**分析**：利用条件类型区分函数与值，实现 `useState` 的重载语义。

---

## 10. 练习与答案

### 10.1 基础练习

**练习 10.1**：实现 `Includes<T, U>`，判断联合类型 `T` 是否包含类型 `U`。

```typescript
type Includes<T, U> = /* 你的实现 */;

type Test1 = Includes<'a' | 'b' | 'c', 'a'>; // true
type Test2 = Includes<'a' | 'b' | 'c', 'd'>; // false
```

**答案**：

```typescript
type Includes<T, U> = [U] extends [T] ? true : false;
```

注意：这里不能用裸类型参数 `U extends T`，因为 `U` 可能是联合类型，需要用元组包裹阻止分发。

**练习 10.2**：实现 `IsString<T>`，判断 `T` 是否为字符串类型。

```typescript
type IsString<T> = /* 你的实现 */;

type Test1 = IsString<string>; // true
type Test2 = IsString<number>; // false
type Test3 = IsString<'hello'>; // true
type Test4 = IsString<string | number>; // boolean
```

**答案**：

```typescript
type IsString<T> = T extends string ? true : false;
```

注意：`string | number` 会分发为 `true | false = boolean`。

### 10.2 中级练习

**练习 10.3**：实现 `UnionToTuple<T>`，将联合类型转为元组（简化版，不保证顺序）。

```typescript
type UnionToTuple<T> = /* 你的实现 */;

type Result = UnionToTuple<'a' | 'b' | 'c'>;
// 期望：['a', 'b', 'c']（顺序可能不同）
```

**答案**：

```typescript
type UnionToTuple<T, U = T> = [T] extends [never]
  ? []
  : U extends any
    ? [U, ...UnionToTuple<Exclude<T, U>>]
    : never;
```

注意：这是一个高级技巧，利用分发与 `Exclude` 的组合。

**练习 10.4**：实现 `LastOfUnion<T>`，获取联合类型的最后一个成员。

```typescript
type LastOfUnion<T> = /* 你的实现 */;

type Result = LastOfUnion<'a' | 'b' | 'c'>;
// 期望：'c'（顺序可能不同）
```

**答案**：

```typescript
type LastOfUnion<T, U = T> = [T] extends [never]
  ? never
  : U extends any
    ? [U] extends [Exclude<T, U>]
      ? never
      : U
    : never;
```

### 10.3 高级练习

**练习 10.5**：实现 `TupleToUnion<T>`，将元组转为联合类型。

```typescript
type TupleToUnion<T extends any[]> = /* 你的实现 */;

type Result = TupleToUnion<['a', 'b', 'c']>;
// 期望：'a' | 'b' | 'c'
```

**答案**：

```typescript
type TupleToUnion<T extends any[]> = T[number];
```

**练习 10.6**：实现 `Without<T, U>`，从联合类型 `T` 中排除 `U` 的成员（支持 `U` 为联合）。

```typescript
type Without<T, U> = /* 你的实现 */;

type Test1 = Without<'a' | 'b' | 'c', 'a'>; // 'b' | 'c'
type Test2 = Without<'a' | 'b' | 'c', 'a' | 'b'>; // 'c'
```

**答案**：

```typescript
type Without<T, U> = T extends U ? never : T;
```

这就是内置的 `Exclude`。

### 10.4 思考题

**思考题 10.7**：为什么 `IsUnion` 需要引入额外参数 `C = T`？如果去掉 `C` 会发生什么？

**答案**：分发后 `T` 被替换为联合的单个成员，丢失了"是否为联合"的信息。引入 `C` 保存原始类型，内层 `[C] extends [T]` 检查原始联合是否是单个成员的子类型。

**思考题 10.8**：为什么 `IsAny` 使用 `0 extends 1 & T` 而不是 `T extends any`？

**答案**：`any extends any` 会触发分发（`any` 被视为联合），结果为 `boolean` 而非 `true`。而 `0 extends 1 & T` 中，`1 & any = any`，`0 extends any` 为 `true`；对于非 `any` 类型，`1 & T` 不包含 `0`，结果为 `false`。

---

## 11. 参考文献

1. Rosenwasser, D. (2018). Conditional types. Microsoft TypeScript Blog. https://devblogs.microsoft.com/typescript/announcing-typescript-2-8/

2. Bierman, G., Abadi, M., & Torgersen, M. (2014). Understanding TypeScript. In Proceedings of the 28th European Conference on Object-Oriented Programming (ECOOP 2014). https://doi.org/10.1007/978-3-662-44202-9_10

3. Pierce, B. C. (2002). Types and programming languages. MIT Press.

4. Microsoft. (2026). TypeScript handbook: Conditional types. https://www.typescriptlang.org/docs/handbook/2/conditional-types.html

5. Microsoft. (2026). TypeScript handbook: Distributive conditional types. https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types

6. type-fest. (2026). type-fest: A collection of essential TypeScript types. https://github.com/sindresorhus/type-fest

7. utility-types. (2026). utility-types: Collection of utility types for TypeScript. https://github.com/piotrwitek/utility-types

8. Haskell Wiki. (2026). Type families. https://wiki.haskell.org/GHC/Type_families

9. Rust Reference. (2026). Traits. https://doc.rust-lang.org/reference/traits.html

10. Flow. (2026). Flow type system documentation. https://flow.org/en/docs/lang/

---

## 12. 延伸阅读

### 12.1 官方文档

- [TypeScript Handbook: Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [TypeScript Handbook: Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
- [TypeScript Handbook: Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- [TypeScript Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html)

### 12.2 社区资源

- [Type Challenges](https://github.com/type-challenges/type-challenges) - 类型体操练习
- [type-fest](https://github.com/sindresorhus/type-fest) - 实用工具类型库
- [utility-types](https://github.com/piotrwitek/utility-types) - 工具类型集合
- [ts-toolbelt](https://github.com/millsp/ts-toolbelt) - 类型工具集

### 12.3 课程与教程

- [MIT 6.S192: Software Construction](https://ocw.mit.edu/) - 软件构造
- [Stanford CS143: Compilers](https://web.stanford.edu/class/cs143/) - 编译原理
- [CMU 15-411: Compiler Design](https://www.cs.cmu.edu/~fp/courses/15411-f08/) - 编译器设计
- [Total TypeScript](https://www.totaltypescript.com/) - TypeScript 进阶教程

### 12.4 进阶主题

- [TypeScript Type Gymnastics](https://type-level-typescript.com/) - 类型体操
- [Recursive Types in TypeScript](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#inferring-within-conditional-types) - 递归类型
- [Tail-Recursive Type Inference](https://devblogs.microsoft.com/typescript/announcing-typescript-4-5/#tail-rec-recursive-inference) - 尾递归类型推断
- [Variance in TypeScript](https://github.com/microsoft/TypeScript/issues/9825) - 变型

### 12.5 相关论文

- Bierman, G., Abadi, M., & Torgersen, M. (2014). Understanding TypeScript. ECOOP 2014.
- Pierce, B. C., & Turner, D. N. (2000). Local type inference. ACM TOPLAS.
- Appel, A. W. (1998). Modern compiler implementation. Cambridge University Press.

---

## 附录 A：速查表

### A.1 分发行为速查

| 写法 | 是否分发 | 示例 |
|------|----------|------|
| `T extends U` | 是 | `ToArray<string \| number>` → `string[] \| number[]` |
| `[T] extends [U]` | 否 | `ToArrayNoDist<string \| number>` → `(string \| number)[]` |
| `T & {} extends U` | 否 | 同上 |
| `T extends any` | 是 | 触发分发 |
| `T extends never` | 是 | `never` 输入返回 `never` |

### A.2 常用工具类型

```typescript
// 分发型
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;
type NonNullable<T> = T extends null | undefined ? never : T;

// 非分发型（检测）
type IsNever<T> = [T] extends [never] ? true : false;
type IsAny<T> = 0 extends 1 & T ? true : false;
type IsUnion<T, C = T> = [T] extends [never]
  ? false
  : T extends any
    ? [C] extends [T] ? false : true
    : never;

// 递归型
type Awaited<T> = T extends Promise<infer U>
  ? U extends Promise<unknown> ? Awaited<U> : U
  : T;
type Flatten<T> = T extends Array<infer U> ? Flatten<U> : T;
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
```

---

## 附录 B：错误诊断

### B.1 常见错误信息

| 错误信息 | 原因 | 解决方案 |
|----------|------|----------|
| `Type instantiation is excessively deep and possibly infinite` | 递归深度超过限制 | 简化递归或使用尾递归 |
| `Type 'T' does not satisfy the constraint 'U'` | 泛型约束不满足 | 添加约束或调整类型 |
| `Type 'boolean' is not assignable to type 'true'` | `boolean` 分解为 `true \| false` | 用元组包裹阻止分发 |
| `Type 'never' has no property 'X'` | 分发导致结果为 `never` | 检查 `never` 处理 |

### B.2 调试技巧

1. **逐步简化**：将复杂类型拆解为简单步骤，逐步验证。
2. **使用 `Expect` 工具**：

```typescript
type Expect<T extends true> = T;
type Equal<A, B> = [A] extends [B] ? [B] extends [A] ? true : false : false;

// 验证类型
type Test1 = Expect<Equal<IsUnion<string | number>, true>>;
type Test2 = Expect<Equal<IsUnion<string>, false>>;
```

3. **查看类型推断**：将鼠标悬停在类型别名上，TypeScript 会显示展开后的类型。

---

## 附录 C：术语表

| 术语 | 英文 | 释义 |
|------|------|------|
| 分布式条件类型 | Distributive Conditional Type | 对联合类型每个成员分别求值的条件类型 |
| 裸类型参数 | Naked Type Parameter | 直接出现在 `extends` 左侧的类型参数 |
| 阻止分发 | Prevent Distribution | 用元组等包裹阻止分发的技巧 |
| 空集 | Empty Set | `never` 类型的集合论语义 |
| 分配律 | Distributivity | $f(A \cup B) = f(A) \cup f(B)$ |
| 子类型 | Subtype | $S <: T$ 表示 $S$ 是 $T$ 的子类型 |
| 协变 | Covariance | $S <: T \Rightarrow F<S> <: F<T>$ |
| 不动点 | Fixed Point | $f(x) = x$ 的解 |
| 类型族 | Type Family | Haskell 中的类型级函数 |
| 类型擦除 | Type Erasure | 运行时移除类型信息 |
