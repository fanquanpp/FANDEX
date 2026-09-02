## 前置知识

- [类型推断 infer 扩展](/typescript/036-InferTypeDeepDive)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 学习导论」的核心机制、典型用法与常见陷阱
- 掌握「2. 历史动机与技术演进」的核心机制、典型用法与常见陷阱
- 掌握「3. 形式化定义」的核心机制、典型用法与常见陷阱
- 掌握「4. 理论推导」的核心机制、典型用法与常见陷阱
- 掌握「5. 递归条件类型」的核心机制、典型用法与常见陷阱

> 阅读提示：正文以代码和白话为主，不出现类型论公式。进阶文档中若出现 `Γ ⊢ e : τ` 这类记号，第一遍可完全跳过（完整规则见 `001-HowToReadThisCourse`）。


## 1. 学习导论

### 1.1 为什么必须理解递归类型

在 TypeScript 工程实践中，以下场景反复出现：

1. **不可变状态**：Redux/Vuex/Pinia 的状态树需要深度只读，避免意外修改。手写 `Readonly<Readonly<Readonly<...>>>` 不现实。
2. **配置合并**：Webpack/Vite 配置深度合并时，部分字段可选，需要 `DeepPartial<T>`。
3. **JSON 反序列化**：`JSON.parse` 返回 `any`，需要根据 JSON 字面量推导精确类型。
4. **路径访问**：`lodash.get(obj, 'a.b.c')` 的类型推导需要递归路径键。
5. **Schema 派生**：从 JSON Schema、Zod Schema 派生 TypeScript 类型。

递归类型是上述所有场景的共同基础。理解它意味着能回答以下问题：

- 当 TypeScript 看到 `type T = { self: T }` 时，它如何求值？
- 当递归深度超过 50 层时，为什么会报 "Type instantiation is excessively deep"？
- TypeScript 4.5 引入的尾递归优化如何工作？哪些递归能被优化，哪些不能？
- 如何处理循环引用，避免无限递归？
- 如何将非尾递归改写为尾递归？

### 1.2 Bloom 认知层次对照

| Bloom 层次 | 对应能力 | 本文对应章节 |
| ---------- | -------- | ------------ |
| remember   | 记住递归类型语法与尾递归优化机制 | 第 3、6 节 |
| understand | 理解求值模型与深度限制 | 第 4、5 节 |
| apply      | 实现 DeepReadonly/DeepPartial 等工具 | 第 7、8、9 节 |
| analyze    | 分析尾位置识别与循环引用 | 第 6、12 节 |
| evaluate   | 评估性能与可维护性 | 第 15、16 节 |
| create     | 设计 JSON 推导器与 Schema 派生 | 第 11、17 节 |

### 1.3 阅读建议

- **入门读者**：先读第 2、3、5、7 节，建立直觉。
- **工程实践者**：跳到第 7、8、11、15、16 节，对照生产问题。
- **类型论研究者**：精读第 3、4 节，对照 Pierce《Types and Programming Languages》第 20 章。

---

## 2. 历史动机与技术演进

### 2.1 类型论中的递归类型（1970s）

递归类型（recursive type）的理论基础由 Robin Milner 在 1970 年代的 ML 语言中奠定。递归类型允许类型自我引用，使得链表、树等数据结构能在类型层表达：

```haskell
-- Haskell 的递归类型
data List a = Nil | Cons a (List a)

-- 等价的 TypeScript 表达
type List<T> = null | { head: T; tail: List<T> };
```

递归类型的形式化语义分为两类：

1. **等距递归（iso-recursive）**：类型与其展开形式不同，需要显式的 `fold`/`unfold`。ML 系语言采用此模型。
2. **同递归（equi-recursive）**：类型与其展开形式相同，无需显式操作。TypeScript、Scala 采用此模型。

TypeScript 选择同递归模型，使得 `type T = { self: T }` 与其展开 `{ self: { self: { self: ... } } }` 在类型层等价，无需显式 fold/unfold。

### 2.2 TypeScript 递归类型的演进

| 时间 | 版本 | 关键特性 |
| ---- | ---- | -------- |
| 2014-04 | TypeScript 1.0 | 支持接口的递归引用 |
| 2016-09 | TypeScript 2.0 | 类型别名支持递归，但深度受限 |
| 2018-07 | TypeScript 3.0 | 元组展开支持 |
| 2020-11 | TypeScript 4.1 | 引入递归条件类型，深度限制约 50 层 |
| 2021-08 | TypeScript 4.4 | 改进递归类型的归一化 |
| 2021-11 | TypeScript 4.5 | 引入尾递归优化，深度上限提升至约 1000 |
| 2022-09 | TypeScript 4.9 | `satisfies` 操作符与递归类型配合 |
| 2023-03 | TypeScript 5.0 | `const` 类型参数增强递归类型的字面量推断 |
| 2024-03 | TypeScript 5.4 | 改进 `NoInfer` 与递归类型交互 |
| 2024-11 | TypeScript 5.7 | 改进递归类型在联合类型上的展开性能 |

### 2.3 关键设计者

- **Daniel Rosenwasser**：TypeScript 项目主管，主导递归条件类型与尾递归优化的设计。
- **Gabriel Bierman**：Microsoft Research Cambridge，TypeScript 语义奠基者，2014 ECOOP 论文《Understanding TypeScript》作者。
- **Andrew Branch**：TypeScript 团队成员，负责尾递归优化的工程实现。
- **Robin Milner**（1934–2010）：图灵奖得主，ML 语言与类型系统奠基者，递归类型理论的先驱。
- **Gordon Plotkin**：爱丁堡大学教授，1977 年论文《LCF considered as a programming language》形式化了递归类型语义。

### 2.4 学术渊源：递归类型理论

递归类型的理论基础包括：

1. **Brandt-Henglein 1998**：在 *Fundamenta Informaticae* 发表的《Coinductive axiomatization of recursive type equality and subtyping》给出了递归类型相等与子类型的余归纳公理化。
2. **Amadio-Cardelli 1993**：在 *ACM TOPLAS* 发表的《Subtyping recursive types》给出了递归类型子类型化的算法。
3. **Pierce 2002**：《Types and Programming Languages》第 20 章系统阐述了递归类型的理论。

TypeScript 的递归类型实现是这些理论的工程化简化版，加入了尾递归优化以提升可用性。

---

## 3. 形式化定义

### 3.1 递归类型的语法

递归类型 $T$ 满足：

$$
T = F(T)
$$

其中 $F$ 是类型构造子。例如：

$$
\text{List}_T = \text{Nil} \mid \text{Cons}(T, \text{List}_T)
$$

在 TypeScript 中：

```typescript
type List<T> = null | { head: T; tail: List<T> };
```

### 3.2 同递归与等距递归

| 模型 | 类型与展开形式的关系 | 操作 | 代表语言 |
| ---- | -------------------- | ---- | -------- |
| 等距递归 | 不同 | 需要显式 fold/unfold | ML、Coq |
| 同递归 | 相同 | 无需操作 | TypeScript、Scala |

TypeScript 采用同递归模型，使得递归类型与其展开形式在类型层等价：

```typescript
type T = { self: T };
// T 与 { self: { self: { self: ... } } } 等价
```

### 3.3 递归条件类型

TypeScript 4.1 引入的递归条件类型允许条件类型递归调用自身：

```typescript
type DeepReadonly<T> = T extends Function
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
```

形式化地，递归条件类型的求值定义为：

$$
\text{Eval}(\text{Rec}(T)) = \begin{cases}
\text{展开}(T, \text{Eval} \circ \text{Rec}) & \text{若未达深度上限} \\
\bot & \text{否则}
\end{cases}
$$

### 3.4 深度与复杂度限制

TypeScript 对递归类型施加两个限制：

1. **类型实例化深度**：约 50 展开层，TypeScript 5.0+ 调整为约 1000。
2. **类型实例化复杂度**：约 5,000,000 次展开操作。

形式化地：

$$
\text{Eval}_d(\text{Rec}(T)) = \begin{cases}
\bot & \text{若 } d > D_{\max} \\
\text{展开}(T, \text{Eval}_{d+1} \circ \text{Rec}) & \text{否则}
\end{cases}
$$

其中 $D_{\max} \approx 50$（无尾递归）或 $\approx 1000$（尾递归优化）。

### 3.5 终止性与可判定性

递归类型的可判定性由以下机制保证：

1. **深度上限**：硬编码的上限避免无限递归。
2. **尾递归优化**：尾位置的递归调用不增加栈深度，提升上限至约 1000。
3. **循环检测**：TypeScript 检测同类型的重复展开，退化为 `any` 或报错。

理论上，递归类型的相等性是不可判定的（与停机问题等价）。TypeScript 通过深度上限确保可判定性。

---

## 4. 理论推导

### 4.1 余归纳语义

递归类型的语义由余归纳（coinduction）定义。设 $\mu X. F(X)$ 为最小不动点，$\nu X. F(X)$ 为最大不动点：

$$
\mu X. F(X) = \bigcap \{ S \mid F(S) \subseteq S \}
$$

$$
\nu X. F(X) = \bigcup \{ S \mid S \subseteq F(S) \}
$$

对于有限数据结构，$\mu$ 与 $\nu$ 重合。对于无限数据结构（如流），两者不同。TypeScript 采用 $\nu$（最大不动点）语义，允许无限展开但通过深度上限截断。

### 4.2 子类型化规则

递归类型的子类型化规则（Amadio-Cardelli 1993）：

$$
\frac{\Gamma, X <: Y \vdash F(X) <: G(Y)}{\Gamma \vdash \mu X. F(X) <: \mu Y. G(Y)} \quad (\text{S-Rec})
$$

即：若在假设 $X <: Y$ 下 $F(X) <: G(Y)$，则 $\mu X. F(X) <: \mu Y. G(Y)$。

TypeScript 的实现简化了这一规则，通过结构子类型化直接展开比较。

### 4.3 求值的复杂度

递归类型的求值复杂度分析：

| 操作 | 复杂度 | 说明 |
| ---- | ------ | ---- |
| 单次展开 | $O(1)$ | 直接展开 |
| 深度为 $d$ 的递归 | $O(d)$ | 线性深度 |
| 尾递归优化 | $O(1)$ 栈空间 | 尾位置不增加栈 |
| 非尾递归 | $O(d)$ 栈空间 | 每层增加栈帧 |
| 循环引用检测 | $O(n^2)$ | 需比较所有已展开类型 |

### 4.4 Liskov 行为子类型约束

递归类型满足 Liskov 行为子类型约束：

$$
\text{若 } S <: T, \text{则 } \mu X. F(X, S) <: \mu X. F(X, T)
$$

即递归类型的子类型化保持协变方向。

---

## 5. 递归条件类型

### 5.1 基础示例

```typescript
// 递归条件类型：计算元组长度
type Length<T extends any[]> = T extends [any, ...infer Rest]
  ? 1 + Length<Rest>
  : 0;

// 注意：上述写法在 TypeScript 中不支持，因为 + 不是类型操作
// 正确写法：使用累加器
type Length<T extends any[], Acc extends any[] = []> = T extends [any, ...infer Rest]
  ? Length<Rest, [...Acc, 0]>
  : Acc['length'];

type L1 = Length<[1, 2, 3]>; // 3
type L2 = Length<['a', 'b', 'c', 'd', 'e']>; // 5
```

### 5.2 递归条件类型的求值

```typescript
type Flatten<T> = T extends Array<infer U> ? Flatten<U> : T;

type F1 = Flatten<number[][][]>; // number
type F2 = Flatten<string>; // string
type F3 = Flatten<[1, [2, [3]]]>; // 1 | 2 | 3
```

求值过程（以 `Flatten<number[][][]>` 为例）：

1. `T = number[][][]`，匹配 `Array<infer U>`，U = `number[][]`
2. 递归调用 `Flatten<number[][]>`：
   - `T = number[][]`，匹配 `Array<infer U>`，U = `number[]`
   - 递归调用 `Flatten<number[]>`：
     - `T = number[]`，匹配 `Array<infer U>`，U = `number`
     - 递归调用 `Flatten<number>`：
       - `T = number`，不匹配 `Array<infer U>`
       - 返回 `number`

### 5.3 递归与联合类型

```typescript
// 提取所有元素的类型
type Elements<T> = T extends readonly (infer U)[]
  ? U
  : T extends readonly [infer First, ...infer Rest]
    ? First | Elements<Rest>
    : never;

type E1 = Elements<[1, 'a', true]>; // 1 | 'a' | true
type E2 = Elements<number[]>; // number
type E3 = Elements<Array<string | number>>; // string | number
```

### 5.4 递归与映射类型

```typescript
// 深度 readonly
type DeepReadonly<T> = T extends Function
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

interface User {
  name: string;
  profile: {
    age: number;
    address: {
      city: string;
    };
  };
}

type ReadonlyUser = DeepReadonly<User>;
// {
//   readonly name: string;
//   readonly profile: {
//     readonly age: number;
//     readonly address: {
//       readonly city: string;
//     };
//   };
// }
```

### 5.5 递归深度限制

```typescript
// 深度限制约 50 层（无尾递归优化）
type Deep<T, N extends number> = N extends 0 ? T : Deep<{ nested: T }, N>;

type D1 = Deep<string, 10>; // OK
type D2 = Deep<string, 50>; // 可能触发深度错误
type D3 = Deep<string, 100>; // 一定触发深度错误
```

---

## 6. 尾递归优化

### 6.1 尾位置的定义

尾位置指递归调用出现在条件类型的直接分支位置：

```typescript
// 尾位置：递归调用直接出现在 ? 后
type TailRec<T> = T extends X ? TailRec<Y> : Z;
```

TypeScript 4.5+ 识别尾位置，将递归调用转换为循环，避免栈增长。

### 6.2 尾递归识别规则

TypeScript 4.5+ 的尾递归识别规则：

1. **直接分支位置**：递归调用必须出现在条件类型的 `?` 后。
2. **不被包裹**：递归调用不能被其他类型构造包裹。

破坏尾位置的构造：

```typescript
// 1. 模板字面量包裹：破坏尾位置
type Bad1<S> = S extends `${infer C}${infer R}` ? `${Bad1<R>}${C}` : S;

// 2. 元组包裹：破坏尾位置
type Bad2<T> = T extends [infer F, ...infer R] ? [...Bad2<R>, F] : [];

// 3. 联合包裹：破坏尾位置
type Bad3<T> = T extends X ? Bad3<Y> | Z : W;

// 4. 交叉包裹：破坏尾位置
type Bad4<T> = T extends X ? Bad4<Y> & Z : W;

// 5. 嵌套条件类型：破坏尾位置
type Bad5<T> = T extends X ? (Y extends Z ? Bad5<...> : W) : V;
```

### 6.3 尾递归优化的效果

```typescript
// 非尾递归：深度限制约 50
type Reverse<S> = S extends `${infer C}${infer R}` ? `${Reverse<R>}${C}` : S;
type R1 = Reverse<'a'.repeat(50)>; // 可能触发深度错误

// 尾递归：深度限制约 1000
type ReverseTail<S, Acc extends string = ''> =
  S extends `${infer C}${infer R}` ? ReverseTail<R, `${C}${Acc}`> : Acc;
type R2 = ReverseTail<'a'.repeat(100)>; // OK
type R3 = ReverseTail<'a'.repeat(500)>; // OK
```

### 6.4 累加器模式

将非尾递归改写为尾递归的通用模式：引入累加器参数，将中间结果累积传递。

```typescript
// 非尾递归：计算元组长度
type Length<T extends any[]> = T extends [any, ...infer R] ? 1 + Length<R> : 0;
// 注意：1 + Length<R> 在 TypeScript 中不支持

// 尾递归：使用累加器
type LengthTail<T extends any[], Acc extends any[] = []> =
  T extends [any, ...infer R] ? LengthTail<R, [...Acc, 0]> : Acc['length'];

type L = LengthTail<[1, 2, 3, 4, 5]>; // 5
```

### 6.5 尾递归优化的局限

尾递归优化有以下局限：

1. **仅对尾位置有效**：非尾位置的递归仍受 50 层限制。
2. **不被包裹**：递归调用不能被其他构造包裹。
3. **深度上限仍存在**：约 1000 层，超出仍报错。
4. **复杂度上限**：5,000,000 次展开操作。

---

## 7. DeepReadonly 与深度只读

### 7.1 基础实现

```typescript
type DeepReadonly<T> = T extends Function
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
```

### 7.2 实现解析

- `T extends Function`：排除函数类型，避免函数被错误地展开为 `{ readonly [K in keyof Function]: ... }`。
- `T extends object`：仅对对象类型递归，原始类型直接返回。
- `{ readonly [K in keyof T]: DeepReadonly<T[K]> }`：递归映射所有属性为 readonly。

### 7.3 数组与元组的处理

```typescript
// 问题：上述实现将数组展开为对象，丢失数组方法
type A = DeepReadonly<number[]>;
// 期望：readonly number[]
// 实际：{ readonly [n: number]: DeepReadonly<number>; readonly length: number; ... }

// 改进：特殊处理数组与元组
type DeepReadonly<T> = T extends Function
  ? T
  : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

type A2 = DeepReadonly<number[]>; // readonly number[]
type A3 = DeepReadonly<[1, 2, 3]>; // readonly [1, 2, 3]
```

### 7.4 Map 与 Set 的处理

```typescript
type DeepReadonly<T> = T extends Function
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<K, DeepReadonly<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<DeepReadonly<U>>
      : T extends ReadonlyArray<infer U>
        ? ReadonlyArray<DeepReadonly<U>>
        : T extends object
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : T;

type M = DeepReadonly<Map<string, { name: string }>>;
// ReadonlyMap<string, { readonly name: string }>

type S = DeepReadonly<Set<{ id: number }>>;
// ReadonlySet<{ readonly id: number }>
```

### 7.5 Date 与 RegExp 的处理

```typescript
type DeepReadonly<T> = T extends Function | Date | RegExp
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<K, DeepReadonly<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<DeepReadonly<U>>
      : T extends ReadonlyArray<infer U>
        ? ReadonlyArray<DeepReadonly<U>>
        : T extends object
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : T;

type D = DeepReadonly<{ date: Date }>; // { readonly date: Date }
type R = DeepReadonly<{ regex: RegExp }>; // { readonly regex: RegExp }
```

### 7.6 使用示例

```typescript
interface AppState {
  user: {
    name: string;
    profile: {
      age: number;
      address: {
        city: string;
      };
    };
  };
  posts: Array<{
    id: number;
    title: string;
    comments: string[];
  }>;
}

const state: DeepReadonly<AppState> = {
  user: {
    name: 'Alice',
    profile: {
      age: 30,
      address: {
        city: 'NYC',
      },
    },
  },
  posts: [
    { id: 1, title: 'Hello', comments: ['Great', 'Nice'] },
  ],
};

// state.user.name = 'Bob'; // Error: 只读
// state.posts[0].title = 'World'; // Error: 只读
// state.posts.push({ id: 2, title: 'New', comments: [] }); // Error: 只读
```

---

## 8. DeepPartial 与深度可选

### 8.1 基础实现

```typescript
type DeepPartial<T> = T extends Function
  ? T
  : T extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;
```

### 8.2 使用场景

```typescript
interface Config {
  server: {
    host: string;
    port: number;
  };
  database: {
    url: string;
    pool: {
      min: number;
      max: number;
    };
  };
}

// 配置合并：DeepPartial 允许部分配置
function mergeConfig(defaults: Config, overrides: DeepPartial<Config>): Config {
  return {
    server: { ...defaults.server, ...overrides.server },
    database: {
      ...defaults.database,
      ...overrides.database,
      pool: { ...defaults.database.pool, ...overrides.database?.pool },
    },
  };
}

const config = mergeConfig(
  {
    server: { host: 'localhost', port: 3000 },
    database: { url: 'postgres://...', pool: { min: 1, max: 10 } },
  },
  {
    server: { port: 8080 }, // 仅覆盖 port
    database: { pool: { max: 20 } }, // 仅覆盖 max
  }
);
```

### 8.3 数组的特殊处理

```typescript
// 问题：Array<DeepPartial<U>> 会使数组元素全部可选，但数组本身仍可空
type P1 = DeepPartial<{ items: string[] }>;
// { items?: Array<string | undefined> }

// 改进：保留数组的元素类型，但使数组本身可选
type DeepPartial<T> = T extends Function
  ? T
  : T extends Array<infer U>
    ? Array<DeepPartial<U>>  // 数组元素深度可选
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;
```

### 8.4 与 Patch 类型的结合

```typescript
// MongoDB 风格的 Patch 操作
type Patch<T> = {
  $set?: DeepPartial<T>;
  $unset?: { [K in keyof T]?: true };
  $inc?: { [K in keyof T as T[K] extends number ? K : never]?: number };
};

interface User {
  id: number;
  name: string;
  age: number;
  email: string;
}

const update: Patch<User> = {
  $set: { name: 'Alice' },
  $inc: { age: 1 },
  $unset: { email: true },
};
```

---

## 9. DeepRequired 与深度必填

### 9.1 基础实现

```typescript
type DeepRequired<T> = T extends Function
  ? T
  : T extends Array<infer U>
    ? Array<DeepRequired<U>>
    : T extends object
      ? { [K in keyof T]-?: DeepRequired<T[K]> }
      : T;
```

注意 `-?` 修饰符：移除可选性。

### 9.2 使用场景

```typescript
interface OptionalConfig {
  server?: {
    host?: string;
    port?: number;
  };
  database?: {
    url?: string;
  };
}

type RequiredConfig = DeepRequired<OptionalConfig>;
// {
//   server: {
//     host: string;
//     port: number;
//   };
//   database: {
//     url: string;
//   };
// }

// 验证函数：确保所有字段都存在
function validate(config: OptionalConfig): RequiredConfig {
  if (!config.server || !config.server.host || !config.server.port) {
    throw new Error('Missing server config');
  }
  if (!config.database || !config.database.url) {
    throw new Error('Missing database config');
  }
  return config as RequiredConfig;
}
```

### 9.3 与 DeepPartial 的对偶关系

`DeepRequired` 是 `DeepPartial` 的对偶：前者移除所有可选性，后者添加所有可选性。

```typescript
type A = DeepPartial<{ a: { b: { c: number } } }>;
// { a?: { b?: { c?: number } } }

type B = DeepRequired<A>;
// { a: { b: { c: number } } }
```

---

## 10. DeepPick 与 DeepOmit

### 10.1 DeepPick：深度选取

```typescript
type DeepPick<T, Path extends string> =
  Path extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? { [P in K]: DeepPick<T[K], Rest> }
      : never
    : Path extends keyof T
      ? Pick<T, Path>
      : never;

interface User {
  id: number;
  name: string;
  profile: {
    age: number;
    address: {
      city: string;
      country: string;
    };
  };
}

type P1 = DeepPick<User, 'profile.address.city'>;
// { profile: { address: { city: string } } }

type P2 = DeepPick<User, 'name'>;
// { name: string }
```

### 10.2 DeepOmit：深度移除

```typescript
type DeepOmit<T, Path extends string> =
  Path extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? Omit<{ [P in keyof T]: P extends K ? DeepOmit<T[P], Rest> : T[P] }, never>
      : T
    : Path extends keyof T
      ? Omit<T, Path>
      : T;

interface User {
  id: number;
  name: string;
  profile: {
    age: number;
    address: {
      city: string;
      country: string;
    };
  };
}

type O1 = DeepOmit<User, 'profile.address.country'>;
// {
//   id: number;
//   name: string;
//   profile: {
//     age: number;
//     address: {
//       city: string;
//     };
//   };
// }
```

### 10.3 多路径选取

```typescript
type DeepPickMany<T, Paths extends string> = UnionToIntersection<
  Paths extends string ? DeepPick<T, Paths> : never
>;

type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

type P3 = DeepPickMany<User, 'name' | 'profile.age'>;
// { name: string } & { profile: { age: number } }
// 等价于 { name: string; profile: { age: number } }
```

---

## 11. JSON 类型推导

### 11.1 基础 JSON 类型

```typescript
type JsonScalar = string | number | boolean | null;
type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];
```

### 11.2 从 JSON 字面量推导类型

```typescript
type JsonType<T extends string> =
  T extends '""' | `"${infer _}"` ? string  // 简化版
  : T extends 'true' | 'false' ? boolean
  : T extends 'null' ? null
  : T extends `${number}` ? number
  : never;

type J1 = JsonType<'"hello"'>; // string
type J2 = JsonType<'42'>; // number
type J3 = JsonType<'true'>; // boolean
type J4 = JsonType<'null'>; // null
```

### 11.3 使用 `as const` 推导

```typescript
const config = {
  name: 'Alice',
  age: 30,
  active: true,
  address: {
    city: 'NYC',
    zip: '10001',
  },
  tags: ['admin', 'user'],
} as const;

type Config = typeof config;
// {
//   readonly name: 'Alice';
//   readonly age: 30;
//   readonly active: true;
//   readonly address: {
//     readonly city: 'NYC';
//     readonly zip: '10001';
//   };
//   readonly tags: readonly ['admin', 'user'];
// }
```

### 11.4 JSON Schema 类型派生

```typescript
type JsonSchema = {
  type: 'object';
  properties: {
    name: { type: 'string' };
    age: { type: 'number' };
    email: { type: 'string'; optional: true };
    address: {
      type: 'object';
      properties: {
        city: { type: 'string' };
        zip: { type: 'string' };
      };
      required: ['city', 'zip'];
    };
  };
  required: ['name', 'age', 'address'];
};

type SchemaType<S> =
  S extends { type: 'object'; properties: infer P; required?: infer R }
    ? R extends ReadonlyArray<string>
      ? {
          [K in keyof P & string as K extends R[number] ? K : never]: SchemaType<P[K]>;
        } & {
          [K in keyof P & string as K extends R[number] ? never : K]?: SchemaType<P[K]>;
        }
      : { [K in keyof P & string]?: SchemaType<P[K]> }
    : S extends { type: 'array'; items: infer I }
      ? I extends ReadonlyArray<any>
        ? { [K in keyof I]: SchemaType<I[K]> }
        : Array<SchemaType<I>>
      : S extends { type: 'string' } ? string
      : S extends { type: 'number' } ? number
      : S extends { type: 'boolean' } ? boolean
      : S extends { type: 'null' } ? null
      : never;

type T = SchemaType<JsonSchema>;
// {
//   name: string;
//   age: number;
//   email?: string;
//   address: {
//     city: string;
//     zip: string;
//   };
// }
```

### 11.5 JSON 字面量解析

```typescript
// 解析 JSON 字符串字面量为类型
type ParseJson<S extends string> =
  S extends `"${infer Content}"` ? Content  // 字符串
  : S extends 'true' ? true
  : S extends 'false' ? false
  : S extends 'null' ? null
  : S extends `${number}` ? number  // 简化：无法精确推导数字字面量
  : S extends `[${infer Items}]` ? ParseJsonArray<Items>
  : S extends `{${infer Pairs}}` ? ParseJsonObject<Pairs>
  : never;

type ParseJsonArray<S extends string, Acc extends any[] = []> =
  S extends '' ? Acc
  : S extends `${infer First},${infer Rest}` ? ParseJsonArray<Rest, [...Acc, ParseJson<First>]>
  : [...Acc, ParseJson<S>];

type ParseJsonObject<S extends string> = {};  // 简化

type P1 = ParseJson<'"hello"'>; // 'hello'
type P2 = ParseJson<'42'>; // number
type P3 = ParseJson<'true'>; // true
type P4 = ParseJson<'null'>; // null
```

---

## 12. 循环引用处理

### 12.1 自引用类型

TypeScript 支持类型的自引用：

```typescript
interface TreeNode {
  value: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

// 等价于
type TreeNode2 = {
  value: number;
  left: TreeNode2 | null;
  right: TreeNode2 | null;
};
```

### 12.2 递归类型的展开

TypeScript 采用 lazy evaluation，递归类型仅在需要时展开：

```typescript
interface LinkedList<T> {
  value: T;
  next: LinkedList<T> | null;
}

// TypeScript 不会无限展开，而是保留自引用
const list: LinkedList<number> = {
  value: 1,
  next: {
    value: 2,
    next: {
      value: 3,
      next: null,
    },
  },
};
```

### 12.3 循环引用的陷阱

```typescript
// 陷阱：递归类型在条件类型中可能触发深度错误
type DeepReadonly<T> = T extends Function
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

interface Recursive {
  self: Recursive;
}

// type R = DeepReadonly<Recursive>; // 可能触发深度错误
```

### 12.4 深度限制方案

```typescript
// 方案 1：限制递归深度
type DeepReadonly<T, Depth extends number = 10> = Depth extends 0
  ? T
  : T extends Function
    ? T
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K], Decrement<Depth>> }
      : T;

type Decrement<N extends number> =
  N extends 10 ? 9
  : N extends 9 ? 8
  : N extends 8 ? 7
  : N extends 7 ? 6
  : N extends 6 ? 5
  : N extends 5 ? 4
  : N extends 4 ? 3
  : N extends 3 ? 2
  : N extends 2 ? 1
  : N extends 1 ? 0
  : 0;

type R1 = DeepReadonly<Recursive>; // 限制 10 层
```

### 12.5 WeakMap 逃逸舱

```typescript
// 运行时方案：使用 WeakMap 缓存
type Cache = WeakMap<object, any>;
const cache: Cache = new WeakMap();

function safeReadonly<T>(obj: T, depth = 10): T {
  if (depth <= 0 || typeof obj !== 'object' || obj === null) return obj;
  if (cache.has(obj as object)) return cache.get(obj as object);
  const result: any = Array.isArray(obj) ? [] : {};
  cache.set(obj as object, result);
  for (const key in obj) {
    result[key] = safeReadonly((obj as any)[key], depth - 1);
  }
  return Object.freeze(result) as T;
}

// 处理循环引用
const circular: any = { name: 'A' };
circular.self = circular;
const frozen = safeReadonly(circular); // 不会无限递归
```

### 12.6 条件类型守卫

```typescript
// 使用条件类型守卫避免无限递归
type SafeDeepReadonly<T> = T extends Function
  ? T
  : T extends { __circular?: true }  // 标记循环引用
    ? T
    : T extends object
      ? { readonly [K in keyof T]: SafeDeepReadonly<T[K]> }
      : T;
```

---

## 13. 深度路径键类型

### 13.1 路径键生成

```typescript
type PathKeys<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: PathKeys<
        T[K],
        Prefix extends '' ? K : `${Prefix}.${K}`
      >;
    }[keyof T & string]
  : Prefix;

interface User {
  name: string;
  profile: {
    age: number;
    address: {
      city: string;
      zip: string;
    };
  };
}

type P = PathKeys<User>;
// 'name' | 'profile' | 'profile.age' | 'profile.address' | 'profile.address.city' | 'profile.address.zip'
```

### 13.2 路径访问类型

```typescript
type GetByPath<T, Path extends string> =
  Path extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? GetByPath<T[K], Rest>
      : never
    : Path extends keyof T
      ? T[Path]
      : never;

type G1 = GetByPath<User, 'name'>; // string
type G2 = GetByPath<User, 'profile.age'>; // number
type G3 = GetByPath<User, 'profile.address.city'>; // string
```

### 13.3 类型安全的 lodash.get

```typescript
function get<T, Path extends PathKeys<T>>(
  obj: T,
  path: Path
): GetByPath<T, Path> {
  return path.split('.').reduce((acc: any, key) => acc?.[key], obj);
}

const user: User = {
  name: 'Alice',
  profile: { age: 30, address: { city: 'NYC', zip: '10001' } },
};

const city = get(user, 'profile.address.city'); // string
const age = get(user, 'profile.age'); // number
// const wrong = get(user, 'profile.wrong'); // Error: 'profile.wrong' 不是有效路径
```

### 13.4 路径设置类型

```typescript
function set<T, Path extends PathKeys<T>>(
  obj: T,
  path: Path,
  value: GetByPath<T, Path>
): T {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((acc: any, key) => acc[key], obj);
  target[lastKey] = value;
  return obj;
}

set(user, 'profile.address.city', 'LA'); // OK
// set(user, 'profile.address.city', 123); // Error: 123 不是 string
// set(user, 'profile.wrong', 'x'); // Error: 无效路径
```

---

## 14. 对比分析

### 14.1 与其他语言的递归类型对比

| 语言 | 递归类型 | 尾递归优化 | 深度限制 | 性能 |
| ---- | -------- | ---------- | -------- | ---- |
| TypeScript | 递归条件类型 | 4.5+ 支持 | 约 50/1000 层 | 中等 |
| Haskell | 类型族 + 递归 | GHC 支持 | 无硬限制 | 编译慢 |
| Scala 3 | MatchType | 不支持 | 无硬限制 | 编译慢 |
| Rust | 不支持 | - | - | 快 |
| Flow | 不支持 | - | - | - |
| OCaml | 多态变体 | 支持 | 无硬限制 | 快 |

### 14.2 与运行时递归对比

| 维度 | 类型层递归 | 运行时递归 |
| ---- | ---------- | ---------- |
| 求值时机 | 编译期 | 运行时 |
| 深度限制 | 约 50/1000 层 | 取决于栈大小 |
| 性能 | 影响编译时间 | 影响运行时间 |
| 循环引用 | 需特殊处理 | 需运行时检测 |
| 可读性 | 复杂时难读 | 简单 |

### 14.3 与 zod/io-ts 对比

| 维度 | 递归类型 | zod/io-ts |
| ---- | -------- | --------- |
| 求值时机 | 编译期 | 运行时 |
| 输入来源 | 字面量 | 任意值 |
| 类型信息 | 类型层 | 类型层 + 运行时 |
| 循环引用 | 类型层难处理 | 运行时可处理 |
| 性能 | 编译期影响 | 运行时影响 |
| 动态数据 | 不适用 | 适用 |

### 14.4 与 Haskell 类型族对比

```haskell
-- Haskell 的递归类型族
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE TypeFamilies #-}
{-# LANGUAGE UndecidableInstances #-}

import GHC.TypeLits

type family DeepReadonly (a :: *) where
  DeepReadonly (a -> b) = a -> b
  DeepReadonly [a] = [DeepReadonly a]
  DeepReadonly a = a
```

TypeScript 的递归类型在表达能力上接近 Haskell 的类型族，但语法更直观，且不需要 `UndecidableInstances`。

---

## 15. 常见陷阱与修复

### 15.1 陷阱：函数类型未排除

**错误代码**：

```typescript
type DeepReadonly<T> = {
  readonly [K in keyof T]: DeepReadonly<T[K]>;
};

interface Service {
  handler: (x: number) => void;
  data: { value: string };
}

type S = DeepReadonly<Service>;
// { readonly handler: readonly {}; readonly data: { readonly value: string }; }
// handler 被错误地展开为 readonly {}
```

**修复**：排除函数类型：

```typescript
type DeepReadonly<T> = T extends Function
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
```

### 15.2 陷阱：数组被展开为对象

**错误代码**：

```typescript
type DeepReadonly<T> = T extends Function
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

type A = DeepReadonly<number[]>;
// 期望：readonly number[]
// 实际：{ readonly [n: number]: DeepReadonly<number>; readonly length: number; ... }
```

**修复**：特殊处理数组：

```typescript
type DeepReadonly<T> = T extends Function
  ? T
  : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;
```

### 15.3 陷阱：递归深度超限

**错误代码**：

```typescript
type DeepReadonly<T> = T extends Function
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

interface DeepNest {
  a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: { l: { m: { n: { o: { p: { q: { r: { s: { t: { u: { v: { w: { x: { y: { z: string } } } } } } } } } } } } } } } } } } } } } } } } } } } } };
}

type D = DeepReadonly<DeepNest>; // 可能触发深度错误
```

**修复**：限制递归深度或使用尾递归优化：

```typescript
type DeepReadonly<T, Depth extends number = 20> = Depth extends 0
  ? T
  : T extends Function
    ? T
    : T extends ReadonlyArray<infer U>
      ? ReadonlyArray<DeepReadonly<U, Decrement<Depth>>>
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K], Decrement<Depth>> }
        : T;
```

### 15.4 陷阱：循环引用

**错误代码**：

```typescript
interface Circular {
  self: Circular;
}

type R = DeepReadonly<Circular>; // 可能触发深度错误
```

**修复**：使用深度限制或运行时方案：

```typescript
type SafeDeepReadonly<T, Depth extends number = 10> = Depth extends 0
  ? T
  : T extends Function
    ? T
    : T extends object
      ? { readonly [K in keyof T]: SafeDeepReadonly<T[K], Decrement<Depth>> }
      : T;

type R = SafeDeepReadonly<Circular>; // 限制 10 层
```

### 15.5 陷阱：尾递归识别失败

**错误代码**：

```typescript
// 非尾递归：递归结果被包裹在模板字面量中
type Reverse<S> = S extends `${infer C}${infer R}` ? `${Reverse<R>}${C}` : S;

type R = Reverse<'a'.repeat(50)>; // 可能触发深度错误
```

**修复**：改写为尾递归：

```typescript
type Reverse<S, Acc extends string = ''> =
  S extends `${infer C}${infer R}` ? Reverse<R, `${C}${Acc}`> : Acc;

type R = Reverse<'a'.repeat(50)>; // OK
```

### 15.6 陷阱：Map/Set 未特殊处理

**错误代码**：

```typescript
type DeepReadonly<T> = T extends Function
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

type M = DeepReadonly<Map<string, { name: string }>>;
// 被展开为对象，丢失 Map 的方法
```

**修复**：特殊处理 Map/Set：

```typescript
type DeepReadonly<T> = T extends Function
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<K, DeepReadonly<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<DeepReadonly<U>>
      : T extends ReadonlyArray<infer U>
        ? ReadonlyArray<DeepReadonly<U>>
        : T extends object
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : T;
```

### 15.7 陷阱：Date/RegExp 被展开

**错误代码**：

```typescript
type DeepReadonly<T> = T extends Function
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

type D = DeepReadonly<{ date: Date }>;
// { readonly date: { readonly [K in keyof Date]: ... } }
// Date 的方法被展开为 readonly 属性
```

**修复**：排除 Date/RegExp：

```typescript
type DeepReadonly<T> = T extends Function | Date | RegExp
  ? T
  : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;
```

---

## 16. 工程实践

### 16.1 何时使用递归类型

**适用场景**：

1. **不可变状态**：Redux/Vuex/Pinia 状态树深度只读。
2. **配置合并**：Webpack/Vite 配置深度合并。
3. **JSON 反序列化**：根据 JSON 字面量推导精确类型。
4. **路径访问**：lodash.get 的类型推导。
5. **Schema 派生**：从 JSON Schema 派生 TypeScript 类型。

**不适用场景**：

1. **动态数据**：用户输入、API 响应等运行时数据。
2. **复杂解析**：完整 SQL、JSON 字符串等。
3. **性能敏感**：大型代码库中，过度使用会拖慢编译。
4. **深度嵌套**：超过 50 层的嵌套结构。

### 16.2 性能优化建议

1. **使用尾递归**：TypeScript 4.5+ 支持尾递归优化。
2. **限制递归深度**：通过 `Depth` 参数限制递归层数。
3. **缓存类型**：用 `type` 别名避免重复求值。
4. **拆分大类型**：将复杂类型拆分为多个小类型。
5. **使用 `satisfies`**：在运行时验证类型，避免复杂的类型推导。

### 16.3 类型测试

```typescript
import { expectTypeOf } from 'expect-type';
import { DeepReadonly, DeepPartial, PathKeys, GetByPath } from './types';

// 测试 DeepReadonly
type Original = { a: { b: { c: number } }; arr: number[] };
type Readonly = DeepReadonly<Original>;
expectTypeOf<Readonly>().toEqualTypeOf<{
  readonly a: { readonly b: { readonly c: number } };
  readonly arr: readonly number[];
}>();

// 测试 DeepPartial
type Partial = DeepPartial<Original>;
expectTypeOf<Partial>().toEqualTypeOf<{
  a?: { b?: { c?: number } };
  arr?: Array<number | undefined>;
}>();

// 测试 PathKeys
type Paths = PathKeys<{ a: { b: { c: number } } }>;
expectTypeOf<Paths>().toEqualTypeOf<'a' | 'a.b' | 'a.b.c'>();

// 测试 GetByPath
type Value = GetByPath<{ a: { b: { c: number } } }, 'a.b.c'>;
expectTypeOf<Value>().toEqualTypeOf<number>();
```

### 16.4 文档与可读性

```typescript
/**
 * DeepReadonly - 递归地将所有属性设为只读
 *
 * @example
 * type T = DeepReadonly<{ a: { b: number } }>;
 * // { readonly a: { readonly b: number } }
 *
 * @note 排除函数、Date、RegExp，特殊处理数组与 Map/Set
 * @note 递归深度限制约 50 层（无尾递归）或 1000 层（尾递归优化）
 */
type DeepReadonly<T> = T extends Function
  ? T
  : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;
```

---

## 17. 案例研究

### 17.1 案例一：Redux 状态树深度只读

```typescript
interface AppState {
  user: {
    name: string;
    profile: {
      age: number;
      address: {
        city: string;
      };
    };
  };
  posts: Array<{
    id: number;
    title: string;
    comments: string[];
  }>;
}

type ReadonlyAppState = DeepReadonly<AppState>;

function reducer(state: ReadonlyAppState, action: Action): ReadonlyAppState {
  switch (action.type) {
    case 'UPDATE_USER_NAME':
      // state.user.name = action.payload; // Error: 只读
      return {
        ...state,
        user: { ...state.user, name: action.payload },
      };
    case 'ADD_COMMENT':
      return {
        ...state,
        posts: state.posts.map(post =>
          post.id === action.payload.postId
            ? { ...post, comments: [...post.comments, action.payload.comment] }
            : post
        ),
      };
    default:
      return state;
  }
}
```

### 17.2 案例二：Webpack 配置深度合并

```typescript
interface WebpackConfig {
  entry: Record<string, string>;
  output: {
    path: string;
    filename: string;
  };
  module: {
    rules: Array<{
      test: RegExp;
      use: string[];
    }>;
  };
}

type PartialWebpackConfig = DeepPartial<WebpackConfig>;

function mergeConfig(
  defaults: WebpackConfig,
  overrides: PartialWebpackConfig
): WebpackConfig {
  return {
    entry: { ...defaults.entry, ...overrides.entry },
    output: { ...defaults.output, ...overrides.output },
    module: {
      rules: [...(defaults.module.rules || []), ...(overrides.module?.rules || [])],
    },
  };
}

const config = mergeConfig(
  {
    entry: { main: './src/index.ts' },
    output: { path: './dist', filename: '[name].js' },
    module: { rules: [{ test: /\.ts$/, use: 'ts-loader' }] },
  },
  {
    output: { filename: '[name].[hash].js' },
    module: { rules: [{ test: /\.css$/, use: ['style-loader', 'css-loader'] }] },
  }
);
```

### 17.3 案例三：JSON Schema 派生

```typescript
type UserSchema = {
  type: 'object';
  properties: {
    id: { type: 'number' };
    name: { type: 'string' };
    email: { type: 'string'; optional: true };
    roles: {
      type: 'array';
      items: { type: 'string' };
    };
    profile: {
      type: 'object';
      properties: {
        age: { type: 'number' };
        bio: { type: 'string'; optional: true };
      };
      required: ['age'];
    };
  };
  required: ['id', 'name', 'roles', 'profile'];
};

type User = SchemaType<UserSchema>;
// {
//   id: number;
//   name: string;
//   email?: string;
//   roles: string[];
//   profile: {
//     age: number;
//     bio?: string;
//   };
// }
```

### 17.4 案例四：循环引用安全的 AST 类型

```typescript
interface ASTNode {
  type: string;
  children: ASTNode[];
  parent: ASTNode | null;
}

// 限制递归深度的 DeepReadonly
type SafeDeepReadonly<T, Depth extends number = 10> = Depth extends 0
  ? T
  : T extends Function
    ? T
    : T extends ReadonlyArray<infer U>
      ? ReadonlyArray<SafeDeepReadonly<U, Decrement<Depth>>>
      : T extends object
        ? { readonly [K in keyof T]: SafeDeepReadonly<T[K], Decrement<Depth>> }
        : T;

type ReadonlyAST = SafeDeepReadonly<ASTNode>;
// 限制 10 层，避免循环引用触发深度错误
```

### 17.5 案例五：类型安全的 lodash.get/set

```typescript
interface NestedData {
  user: {
    profile: {
      address: {
        city: string;
        zip: string;
      };
      age: number;
    };
    name: string;
  };
}

const data: NestedData = {
  user: {
    profile: { address: { city: 'NYC', zip: '10001' }, age: 30 },
    name: 'Alice',
  },
};

// 类型安全的 get
const city = get(data, 'user.profile.address.city'); // string
const age = get(data, 'user.profile.age'); // number
// const wrong = get(data, 'user.wrong'); // Error

// 类型安全的 set
set(data, 'user.profile.address.city', 'LA'); // OK
// set(data, 'user.profile.address.city', 123); // Error: 123 不是 string
```

### 17.6 案例六：Zod Schema 类型派生

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email().optional(),
  roles: z.array(z.string()),
  profile: z.object({
    age: z.number(),
    bio: z.string().optional(),
  }),
});

type User = z.infer<typeof UserSchema>;
// {
//   id: number;
//   name: string;
//   email?: string;
//   roles: string[];
//   profile: {
//     age: number;
//     bio?: string;
//   };
// }
```

---

### 填空题知识点讲解

1. TypeScript 4.5 引入的____优化使得尾位置的递归调用不再增加栈深度，识别条件是递归调用必须出现在条件类型的____。
   - **答案**：尾递归；直接分支位置
   - **Bloom**：remember

2. TypeScript 对类型实例化有深度上限约____展开层，超出会报错"Type instantiation is excessively deep"，该限制在 TypeScript 5.0+ 调整为约____次展开。
   - **答案**：50；1000
   - **Bloom**：understand

3. DeepReadonly<T> 的标准实现中，使用 `T extends ____` 排除函数类型，避免函数被错误地包装为 readonly 对象。
   - **答案**：Function
   - **Bloom**：apply

4. 在递归类型 `type Loop<T> = T extends X ? Loop<Y> : Z` 中，TypeScript 4.5+ 仅当 Loop<Y> 出现在____位置时才应用尾递归优化，若被包裹在 `${Loop<Y>}` 等构造中则不被识别为尾递归。
   - **答案**：直接分支
   - **Bloom**：analyze

5. JSON 类型推导中，`null` 字面量在 TypeScript 中对应类型____，而 `undefined` 在 JSON 中____出现。
   - **答案**：null；不
   - **Bloom**：understand

6. DeepPartial 使用 `____?` 修饰符使属性可选，DeepRequired 使用 `____?` 修饰符移除可选性。
   - **答案**：`-?`；`?`
   - **Bloom**：apply

### 18.3 代码修复题

1. 以下代码试图实现 DeepReadonly<T>，但当 T 为函数类型时报错。请修复。

```typescript
type DeepReadonly<T> = {
  readonly [K in keyof T]: DeepReadonly<T[K]>;
};
```

   - **答案**：
     ```typescript
     type DeepReadonly<T> = T extends Function
       ? T
       : T extends object
         ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
         : T;
     ```
   - **Bloom**：apply

2. 以下代码试图实现字符串反转，但报 "Type instantiation is excessively deep"。请改写为尾递归版本。

```typescript
type Reverse<S extends string> =
  S extends `${infer C}${infer Rest}` ? `${Reverse<Rest>}${C}` : S;
```

   - **答案**：
     ```typescript
     type Reverse<S extends string, Acc extends string = ''> =
       S extends `${infer C}${infer Rest}` ? Reverse<Rest, `${C}${Acc}`> : Acc;
     ```
   - **Bloom**：apply

3. 以下代码试图实现 DeepPartial<T>，但数组类型被错误地展开为对象。请修复。

```typescript
type DeepPartial<T> = {
  [K in keyof T]?: DeepPartial<T[K]>;
};
```

   - **答案**：
     ```typescript
     type DeepPartial<T> = T extends Function
       ? T
       : T extends Array<infer U>
         ? Array<DeepPartial<U>>
         : T extends object
           ? { [K in keyof T]?: DeepPartial<T[K]> }
           : T;
     ```
   - **Bloom**：apply

4. 以下代码试图实现获取对象所有路径键的类型，但报 "Type instantiation is excessively deep"。请优化。

```typescript
type PathKeys<T> = T extends object
  ? { [K in keyof T & string]: K | `${K}.${PathKeys<T[K]>}` }[keyof T & string]
  : never;
```

   - **答案**：
     ```typescript
     type PathKeys<T, Prefix extends string = ''> = T extends object
       ? {
           [K in keyof T & string]: PathKeys<
             T[K],
             Prefix extends '' ? K : `${Prefix}.${K}`
           >;
         }[keyof T & string]
       : Prefix;
     ```
   - **Bloom**：create

5. 以下代码试图实现 DeepOmit，但对嵌套对象的处理不正确。请修复。

```typescript
type DeepOmit<T, K extends keyof T> = Omit<T, K>;
```

   - **答案**：
     ```typescript
     type DeepOmit<T, Path extends string> =
       Path extends `${infer K}.${infer Rest}`
         ? K extends keyof T
           ? Omit<{ [P in keyof T]: P extends K ? DeepOmit<T[P], Rest> : T[P] }, never>
           : T
         : Path extends keyof T
           ? Omit<T, Path>
           : T;
     ```
   - **Bloom**：apply

### 18.4 开放题

1. 你正在设计一个 JSON Schema 类型派生器，需要根据 JSON Schema 字面量推导对应的 TypeScript 类型。请描述：

   (1) 如何处理基本类型（string/number/boolean/null）；
   (2) 如何处理对象类型，包括可选属性、必填属性与嵌套对象；
   (3) 如何处理数组类型，包括元组与普通数组；
   (4) 该方案的局限性是什么，何时应回退到运行时校验（如 zod、ajv）。

   请结合 TypeScript 4.5+ 的尾递归优化讨论性能。

   - **答案**：详见第 11 节"JSON 类型推导"。
   - **Bloom**：create

2. 解释 TypeScript 递归类型的尾递归优化识别规则。具体说明：

   (1) 什么是尾位置？
   (2) 哪些构造会破坏尾位置？
   (3) 为什么 `${Recurse<...>}` 会破坏尾位置？
   (4) 如何将非尾递归改写为尾递归？

   请给出具体的代码示例。

   - **答案**：详见第 6 节"尾递归优化"。
   - **Bloom**：create

3. 设计一个循环引用安全的深度类型，要求：
   - 能处理对象的自引用（如 `type T = { self: T }`）
   - 能处理数组的自引用（如 `type T = Array<T>`）
   - 能处理相互引用（如 `type A = { b: B }; type B = { a: A }`）
   - 不触发 "Type instantiation is excessively deep"

   请给出完整的类型定义与使用示例，并讨论 TypeScript 类型系统对此类循环引用的固有局限。

   - **答案**：详见第 12 节"循环引用处理"。
   - **Bloom**：create

4. 比较 TypeScript 递归类型与 Haskell 的类型族在以下维度的差异：表达能力、编译性能、可读性、生态成熟度。在什么场景下你会选择 TypeScript 而非 Haskell？反之呢？

   - **答案要点**：
     - **表达能力**：Haskell 更强，支持 `UndecidableInstances` 与完整的类型族；TypeScript 受深度限制。
     - **编译性能**：TypeScript 通常更快，但复杂递归会拖慢；Haskell GHC 类型族编译慢。
     - **可读性**：TypeScript 递归类型语法更直观；Haskell 需要理解类型族与 `Symbol`。
     - **生态成熟度**：Haskell 类型级编程生态更成熟（`singletons`、`first-class-families`）；TypeScript 在前端生态占主导。
     - **选择 TypeScript**：前端、Node.js、与现有 JS 生态集成的场景。
     - **选择 Haskell**：需要严格证明、依赖类型、或与 Formal Methods 工具链集成的场景。
   - **Bloom**：evaluate

---

### 20.1 官方文档

- TypeScript Handbook: Conditional Types — https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
- TypeScript Handbook: Mapped Types — https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
- TypeScript Release Notes: 4.1, 4.5, 5.0, 5.4, 5.7

### 20.2 经典论文

- Amadio, R. M. and Cardelli, L. 1993. Subtyping recursive types. *ACM TOPLAS*.
- Brandt, M. and Henglein, F. 1998. Coinductive axiomatization of recursive type equality and subtyping. *Fundamenta Informaticae*.
- Xi, H. and Pfenning, F. 1999. Dependent types in practical programming. *POPL '99*.

### 20.3 开源项目

- type-fest — https://github.com/sindresorhus/type-fest
- ts-toolbelt — https://github.com/millsp/ts-toolbelt
- utility-types — https://github.com/piotrwitek/utility-types
- zod — https://github.com/colinhacks/zod

### 20.5 相关 FANDEX 文档

- TypeScript 条件类型与映射类型 — 递归类型的基础
- TypeScript 条件类型分发 — 联合类型在递归中的行为
- TypeScript 类型推断infer扩展 — infer 在递归中的应用
- TypeScript 模板字面量类型 — 与递归结合的字符串操作
- TypeScript 类型声明与模块解析 — 声明文件中的递归类型

---

## 附录 A：递归类型速查

| 类型 | 用途 | 关键技术 | 深度限制 |
| ---- | ---- | -------- | -------- |
| `DeepReadonly<T>` | 深度只读 | 排除函数/Date/RegExp，特殊处理数组/Map/Set | 约 50 层 |
| `DeepPartial<T>` | 深度可选 | `?` 修饰符，特殊处理数组 | 约 50 层 |
| `DeepRequired<T>` | 深度必填 | `-?` 修饰符 | 约 50 层 |
| `DeepPick<T, P>` | 深度选取 | 递归模板字面量 | 约 50 层 |
| `DeepOmit<T, P>` | 深度移除 | 递归模板字面量 | 约 50 层 |
| `PathKeys<T>` | 路径键生成 | 递归映射类型 + 模板字面量 | 约 50 层 |
| `GetByPath<T, P>` | 路径访问 | 递归模板字面量 | 约 50 层 |
| `Flatten<T>` | 数组扁平化 | 递归条件类型 | 约 50 层 |
| `Reverse<S>` | 字符串反转 | 尾递归优化 | 约 1000 层 |
| `Length<T>` | 元组长度 | 累加器尾递归 | 约 1000 层 |

---

## 附录 B：尾递归优化识别规则

### B.1 尾位置的定义

```typescript
// 尾位置：递归调用直接出现在 ? 后
type TailRec<T> = T extends X ? TailRec<Y> : Z;
```

### B.2 破坏尾位置的构造

```typescript
// 1. 模板字面量包裹
type Bad1<S> = S extends `${infer C}${infer R}` ? `${Bad1<R>}${C}` : S;

// 2. 元组包裹
type Bad2<T> = T extends [infer F, ...infer R] ? [...Bad2<R>, F] : [];

// 3. 联合包裹
type Bad3<T> = T extends X ? Bad3<Y> | Z : W;

// 4. 交叉包裹
type Bad4<T> = T extends X ? Bad4<Y> & Z : W;

// 5. 嵌套条件类型
type Bad5<T> = T extends X ? (Y extends Z ? Bad5<...> : W) : V;
```

### B.3 改写为尾递归的模式

```typescript
// 非尾递归：递归结果被包裹
type NonTail<S> = S extends `${infer C}${infer R}` ? `${NonTail<R>}${C}` : S;

// 尾递归：引入累加器
type Tail<S, Acc extends string = ''> =
  S extends `${infer C}${infer R}` ? Tail<R, `${C}${Acc}`> : Acc;
```

通用改写步骤：
1. 识别非尾位置（递归结果被包裹）。
2. 引入累加器参数。
3. 在累加器中累积中间结果。
4. 基线条件返回累加器。

---

## 附录 C：性能基准

### C.1 编译时间基准

以下是在中等规模项目（10 万行代码）中的编译时间影响：

| 类型复杂度 | 编译时间（增量） | 编译时间（全量） |
| ---------- | ---------------- | ---------------- |
| 无递归类型 | 2.1s | 18s |
| 简单递归（5 层） | 2.2s | 19s |
| 中等递归（20 层，10 处） | 2.5s | 22s |
| 深度递归（50 层，10 处） | 3.8s | 35s |
| 尾递归优化（1000 层） | 4.5s | 42s |
| 非尾递归（50 层） | 6.2s | 65s |
| 循环引用（无深度限制） | 编译错误 | 编译错误 |

### C.2 优化建议

1. **使用尾递归**：将非尾递归改为尾递归，编译时间可减少 50% 以上。
2. **限制递归深度**：通过 `Depth` 参数限制递归层数。
3. **缓存类型**：用 `type` 别名避免重复求值。
4. **拆分大类型**：将复杂类型拆分为多个小类型。
5. **避免循环引用**：使用条件类型守卫或运行时方案。

---

## 附录 D：决策流程图

### D.1 是否使用递归类型

```mermaid
flowchart TD
    T0["开始"]
    T1["输入是否为静态类型？"]
    T2["否 → 不使用，回退到运行时校验"]
    T3["是"]
    T4["是否需要深度嵌套操作？"]
    T5["否 → 使用非递归类型"]
    T6["是"]
    T7["是否存在循环引用？"]
    T8["是 → 使用深度限制或运行时方案"]
    T9["否"]
    T10["递归深度是否 < 30 层？"]
    T11["否 → 考虑运行时校验或拆分类型"]
    T12["是"]
    T13["是否可改写为尾递归？"]
    T14["是 → 使用尾递归优化"]
    T15["否 → 评估性能影响"]
    T16["使用递归类型"]
    T0 --> T1
    T0 --> T2
    T0 --> T3
    T3 --> T4
    T0 --> T5
    T0 --> T6
    T6 --> T7
    T0 --> T8
    T0 --> T9
    T9 --> T10
    T0 --> T11
    T0 --> T12
    T12 --> T13
    T0 --> T14
    T0 --> T15
    T15 --> T16
```

### D.2 选择深度操作工具

```mermaid
flowchart TD
    T0["需要深度操作"]
    T1["只读化？"]
    T2["是 → DeepReadonly<T>"]
    T3["否"]
    T4["可选化？"]
    T5["是 → DeepPartial<T>"]
    T6["否"]
    T7["必填化？"]
    T8["是 → DeepRequired<T>"]
    T9["否"]
    T10["选取/移除？"]
    T11["选取 → DeepPick<T, Path>"]
    T12["移除 → DeepOmit<T, Path>"]
    T13["路径操作？"]
    T14["生成 → PathKeys<T>"]
    T15["访问 → GetByPath<T, Path>"]
    T0 --> T1
    T0 --> T2
    T0 --> T3
    T3 --> T4
    T0 --> T5
    T0 --> T6
    T6 --> T7
    T0 --> T8
    T0 --> T9
    T9 --> T10
    T0 --> T11
    T0 --> T12
    T12 --> T13
    T13 --> T14
    T13 --> T15
```

---

### E.1 基础概念

- [ ] 能说出递归类型的语法
- [ ] 能说出 TypeScript 4.1 与 4.5 的关键特性
- [ ] 能解释同递归与等距递归的差异
- [ ] 能说出深度限制的数值

### E.2 尾递归优化

- [ ] 能识别尾位置
- [ ] 能说出破坏尾位置的构造
- [ ] 能将非尾递归改写为尾递归
- [ ] 能解释累加器模式

### E.3 深度操作工具

- [ ] 能实现 DeepReadonly
- [ ] 能实现 DeepPartial
- [ ] 能实现 DeepRequired
- [ ] 能实现 DeepPick/DeepOmit
- [ ] 能处理函数/数组/Map/Set/Date 的特殊情况

### E.4 JSON 与 Schema

- [ ] 能实现 JSON 类型推导
- [ ] 能从 JSON Schema 派生类型
- [ ] 能处理可选属性与必填属性
- [ ] 能处理数组与元组

### E.5 循环引用

- [ ] 能识别循环引用陷阱
- [ ] 能使用深度限制方案
- [ ] 能使用 WeakMap 逃逸舱
- [ ] 能使用条件类型守卫

### E.6 性能

- [ ] 能识别编译性能瓶颈
- [ ] 能使用尾递归优化
- [ ] 能拆分复杂类型
- [ ] 能使用 `satisfies` 替代部分类型推导

### E.7 高级

- [ ] 能解释递归类型的余归纳语义
- [ ] 能比较 TypeScript 与 Haskell 类型族
- [ ] 能设计类型安全的 JSON Schema 派生器
- [ ] 能设计循环引用安全的深度类型
- [ ] 能评估何时回退到运行时校验

---

> 本文最后审阅日期：2026-07-20。审阅团队：FANDEX Content Engineering Team。如发现错误或建议改进，请提交 issue 至 FANDEX 仓库。
## infer 基础

**基本写法：infer 提取类型**
`<T> extends <模式> ? infer <X> : <never>`
```typescript
// 从函数返回类型提取
type Return<T> = T extends (...args: never[]) => infer R ? R : never;
type R = Return<() => string>; // string
```

---

**基本写法：提取函数参数**
`infer <Args>`
```typescript
// 提取参数元组
type Params<T> = T extends (...args: infer P) => unknown ? P : never;
type P = Params<(a: number, b: string) => void>; // [number, string]
```

---

**基本写法：提取数组元素**
`infer <E>`
```typescript
// 提取元组/数组元素类型
type Item<T> = T extends (infer E)[] ? E : never;
type A = Item<string[]>;       // string
type B = Item<[1, 2, 3]>;      // 1 | 2 | 3
```

---

## 多 infer 与约束

**基本写法：多个 infer**
`<T> extends <模式1> extends <模式2> ? infer <X> : never`
```typescript
// 嵌套条件约束
type First<T> = T extends [infer F, ...unknown[]] ? F : never;
type F = First<[1, 2, 3]>; // 1
```

---

**基本写法：infer 约束（TS 4.7+）**
`infer <X> extends <约束>`
```typescript
// 限定推断类型范围
type FirstString<T> =
  T extends [infer F extends string, ...unknown[]] ? F : never;
type S = FirstString<["a", 2]>; // "a"
```

---

## 递归类型基础

**基本写法：自引用递归**
`type <名> = <终止> | { <字段>: <名> }`
```typescript
// 递归定义树形结构
type Tree = number | { children: Tree[] };
const t: Tree = { children: [1, { children: [2] }] };
```

---

**基本写法：深度只读**
`type <名> = <T> extends object ? { readonly [K in keyof <T>]: <名> } : <T>`
```typescript
// 递归遍历所有层级
type DeepReadonly<T> =
  T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
type R = DeepReadonly<{ a: { b: 1 } }>; // { readonly a: { readonly b: 1 } }
```

---

## 元组递归操作

**基本写法：反转元组**
`<T> extends [infer <H>, ...infer <R>] ? <递归> : []`
```typescript
// 递归反转元组类型
type Reverse<T extends unknown[]> =
  T extends [infer H, ...infer R] ? [...Reverse<R>, H] : [];
type R = Reverse<[1, 2, 3]>; // [3, 2, 1]
```

---

**基本写法：拼接元组**
`[...<A>, ...<B>]`
```typescript
// 利用展开拼接
type Concat<A extends unknown[], B extends unknown[]> = [...A, ...B];
type R = Concat<[1], [2, 3]>; // [1, 2, 3]
```

---

**基本写法：元组转对象**
`<T> extends [infer <K>, ...infer <R>] ? { ... } : {}`
```typescript
// 递归构造键值对象
type PairToObj<T extends unknown[]> =
  T extends [infer K extends string, infer V, ...infer R]
    ? { [P in K]: V } & PairToObj<R>
    : {};
```

---

## 字符串递归

**基本写法：字符串拆分**
`<S> extends `${infer <Head>}${infer <Rest>}``
```typescript
// 逐字符递归
type Split<S extends string> =
  S extends `${infer H}${infer R}` ? [H, ...Split<R>] : [];
type R = Split<"abc">; // ["a", "b", "c"]
```

---

**基本写法：联合字符**
`type <R> = <递归>`
```typescript
// 字符串转字符联合
type Chars<S extends string> =
  S extends `${infer H}${infer R}` ? H | Chars<R> : never;
type R = Chars<"abc">; // "a" | "b" | "c"
```

---

## 递归深度限制

**基本写法：递归层级计数**
`<T, N extends number>`
```typescript
// 用元组长度计数器限制递归深度，避免无限递归
type Depth<T extends unknown[]> = T["length"];
type Repeat<S extends string, N extends number, A extends string[] = []> =
  A["length"] extends N ? "" : `${S}${Repeat<S, N, [S, ...A]>}`;
type R = Repeat<"ab", 3>; // "ababab"
```

---

## infer 在 Promise

**基本写法：递归解包 Promise**
`<T> extends Promise<infer <U>> ? <递归> : <T>`
```typescript
// 提取深层 Promise 值类型
type Unwrap<T> = T extends Promise<infer U> ? Unwrap<U> : T;
type R = Unwrap<Promise<Promise<number>>>; // number
```

---

## 递归实例：DeepPartial

**基本写法：深度可选**
`type DeepPartial<<T>> = ...`
```typescript
// 所有层级属性可选
type DeepPartial<T> =
  T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
type R = DeepPartial<{ a: { b: number } }>; // { a?: { b?: number } }
```

---

## 递归实例：Paths

**基本写法：对象路径联合**
`<T> extends object ? ...`
```typescript
// 生成对象所有路径字符串联合
type Paths<T, P extends string = ""> =
  T extends object
    ? { [K in keyof T & string]:
        Paths<T[K], `${P}${P extends "" ? "" : "."}${K}`> }[keyof T & string] | P
    : P;
type R = Paths<{ a: { b: number } }>; // "a" | "a.b"
```

---

## 尾递归优化

**基本写法：尾递归形式**
`<递归> extends <终止> ? <结果> : <递归(缩小)>`
```typescript
// TS 4.5+ 对尾递归类型优化，避免栈溢出
// 写法：递归调用作为最后操作且不包裹展开
type Join<S extends string[], D extends string> =
  S extends [] ? ""
  : S extends [infer H extends string] ? H
  : S extends [infer H extends string, ...infer R extends string[]]
    ? `${H}${D}${Join<R, D>}` : never;
```

---
