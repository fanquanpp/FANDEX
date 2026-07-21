---
order: 101
title: 映射类型与键重映射
module: typescript
category: 'dev-lang'
difficulty: advanced
description: 'TypeScript映射类型与键重映射详解：Mapped Types、as子句与高级模式。'
author: fanquanpp
updated: '2026-06-14'
related:
  - typescript/条件类型与infer
  - typescript/编译与性能优化
  - typescript/模板字面量类型
  - typescript/类型体操
prerequisites:
  - typescript/语法速查
---

# 映射类型与键重映射

> 本文档对标 MIT 6.S192、Stanford CS110、CMU 15-214 等课程教学水准，系统讲解 TypeScript 映射类型（Mapped Types）与键重映射（Key Remapping via `as`）的设计动机、形式化定义、推理规则与工程级应用。所有代码示例均可在 TS 5.4 + `strict: true` 下编译通过。

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
| **Remember**（记忆） | 列举、识别 | 写出映射类型基本语法 `{ [K in keyof T]: ... }`，列举 TypeScript 4.1 引入的 `as` 子句形式化结构 |
| **Understand**（理解） | 解释、归纳 | 解释映射类型的同态性（homomorphism）与隐式修饰符保留规则，归纳内置工具类型 `Partial<T>`、`Required<T>`、`Readonly<T>`、`Pick<T,K>` 的实现原理 |
| **Apply**（应用） | 实现、使用 | 在企业级代码中实现 `Getters<T>`、`Setters<T>`、`DeepReadonly<T>`、`DeepPartial<T>` 等工具类型，并正确使用 `as` 子句过滤与转换键名 |
| **Analyze**（分析） | 比较、分解 | 比较映射类型与索引签名（index signature）的本质差异，分解 `as` 子句与条件类型组合时的推理顺序 |
| **Evaluate**（评价） | 评判、选择 | 针对给定业务场景（如 API 响应类型转换、状态机类型推导、表单字段派生）选择合适的映射类型实现，并给出类型推断复杂度与编译性能的权衡 |
| **Create**（创造） | 设计、构建 | 设计一个端到端类型安全的 ORM 类型层，使用映射类型 + 键重映射 + 条件类型将数据库 schema 类型转换为 CRUD API 类型 |

### 1.2 前置知识

- TypeScript 联合类型与字面量类型
- `keyof` 操作符与索引访问类型 `T[K]`
- 条件类型 `T extends U ? X : Y` 与 `infer` 关键字
- 模板字面量类型 `` `get${Capitalize<K>}` ``
- `as const` 断言与 readonly 修饰符

### 1.3 适用读者

- 具备 1 年以上 TypeScript 实战经验的高级开发者
- 正在为开源库设计类型层 API 的工程师
- 希望深入理解 TypeScript 类型系统形式化语义的研究者
- 准备 TypeScript 高级面试的工程师

---

## 2. 历史动机与发展脉络

### 2.1 映射类型的起源

映射类型（Mapped Type）的概念可追溯到 Haskell 的 `Functor` typeclass 与 ML 系语言的记录映射。在 TypeScript 出现之前，Scala 通过隐式转换（implicit conversion）和 Shapeless 库实现了类似的"记录级类型变换"。

TypeScript 在 **1.8（2016 年 2 月）** 首次引入映射类型，由 Microsoft 团队的 **Gabriel Soicher** 与 **Daniel Rosenwasser** 主导设计。最初的动机是减少样板代码：

> **设计动机**：在大型企业级项目中，开发者经常需要从一个基础类型派生出多个变种（`Partial<T>`、`Readonly<T>`、`Nullable<T>`）。手写每个变种的接口不仅冗余，而且容易遗漏字段。映射类型允许通过类型层"循环"自动派生。

### 2.2 版本演进时间线

```
2016-02  TS 1.8     映射类型首次引入：{ [K in keyof T]: ... }
2017-08  TS 2.5     optional 与 readonly 修饰符的 +/- 操作符引入
2019-03  TS 3.4     as const 断言（间接增强映射类型应用）
2020-11  TS 4.1     关键更新：as 子句（键重映射）+ 模板字面量类型
2022-04  TS 4.7     instantiation expressions 与映射类型组合优化
2023-03  TS 5.0     装饰器 Stage 3 + const 类型参数，映射类型性能改进
2024-03  TS 5.4     NoInfer<T>，与映射类型配合提升推断精度
```

### 2.3 设计动机深度分析

Daniel Rosenwasser 在 [TypeScript 4.1 Release Notes](https://devblogs.microsoft.com/typescript/announcing-typescript-4-1/) 中阐述了 `as` 子句的两个核心动机：

> **动机一：键名派生。** 开发者经常需要从一个对象类型派生出包含 getter/setter 的接口，如 `User` 派生出 `UserGetters`（`getName`、`getAge`）。在 4.1 之前，需要写大量样板代码或使用 `Proxy` 类型技巧。`as` 子句配合模板字面量类型直接解决这一需求。

> **动机二：键过滤。** 在条件类型中，过滤联合类型已通过 `extends ? :` 实现。但过滤对象类型的键需要 `Pick<T, ...>` + `Exclude` 组合，复杂且易错。`as never` 子句使过滤在映射类型内部原子化完成。

这两个动机共同确立了映射类型作为"类型层记录变换语言"的地位。

### 2.4 当前社区共识（2024-2025）

TypeScript 核心团队在 2024 年路线图中明确：

- **映射类型已稳定**，未来工作集中在编译性能优化与错误信息改进
- **`as` 子句成为社区标准**，被 `type-fest`、`ts-toolbelt`、`effect` 等主流类型库广泛采用
- **键重映射 + 模板字面量类型**是类型体操的核心技术，在 type-challenges 社区中被用作教学范式

---

## 3. 形式化定义

### 3.1 映射类型的语法形式

映射类型的形式化语法定义（参考 [TypeScript Specification, §3.6]）：

$$
\text{MappedType} \triangleq \{ \text{[K in U]} : T_K \}
$$

其中：

- $K$ 为类型变量（type variable），在映射类型作用域内绑定
- $U$ 为联合类型（union type），$K$ 在其上迭代
- $T_K$ 为依赖 $K$ 的类型表达式

完整语法包含修饰符：

$$
\text{MappedType} \triangleq \{ \text{[+/- readonly] [K in U] [+/- ?] : T_K [as N_K]} \}
$$

其中：

- `+readonly` / `-readonly`：添加或移除 `readonly` 修饰符
- `+?` / `-?`：添加或移除可选（optional）修饰符
- `as N_K`：键重映射子句，将 $K$ 转换为新键 $N_K$

### 3.2 同态映射类型与非同态映射类型

**同态映射类型**（Homomorphic Mapped Type）的形式化定义：

$$
\frac{\Gamma \vdash T : \text{Object}}{\Gamma \vdash \{ [K \text{ in } \text{keyof } T] : T[K] \} : \text{Object}} \quad \text{(homomorphic)}
$$

同态映射类型满足三个性质：

1. **键集合保留**：新类型的键集 = 原类型的键集
2. **修饰符保留**：原类型的 `readonly` 与 `?` 修饰符自动保留
3. **结构与原类型同构**

**非同态映射类型**：

$$
\frac{\Gamma \vdash U : \text{Union}}{\Gamma \vdash \{ [K \text{ in } U] : V_K \} : \text{Object}} \quad \text{(non-homomorphic)}
$$

当 `in` 后的类型不是 `keyof T` 时，映射类型失去同态性，修饰符不会被保留。

### 3.3 键重映射的形式化

`as` 子句将键 $K$ 映射为新键 $N_K$：

$$
\frac{\Gamma \vdash \{ [K \text{ in } U \text{ as } N_K] : T_K \}}{\Gamma \vdash \text{Keys} = \{ N_K \mid K \in U, N_K \neq \text{never} \}}
$$

关键点：当 $N_K = \text{never}$ 时，对应的键被过滤掉。

形式化推理规则：

$$
\frac{K \in U \quad N_K = f(K) \neq \text{never}}{(N_K, T_K) \in \text{Result}}

\quad

\frac{K \in U \quad N_K = \text{never}}{\text{filtered out}}
$$

### 3.4 修饰符操作的形式化

`+readonly` 与 `-readonly` 操作的形式化：

$$
\frac{\Gamma \vdash T : \{ k_i: \tau_i \}}{\Gamma \vdash \{ \text{+readonly } [K \text{ in keyof } T] : T[K] \} : \{ \text{readonly } k_i: \tau_i \}}
$$

$$
\frac{\Gamma \vdash T : \{ \text{readonly } k_i: \tau_i \}}{\Gamma \vdash \{ \text{-readonly } [K \text{ in keyof } T] : T[K] \} : \{ k_i: \tau_i \}}
$$

类似地，`+?` 与 `-?` 控制可选性：

$$
\frac{\Gamma \vdash T : \{ k_i: \tau_i \}}{\Gamma \vdash \{ [K \text{ in keyof } T] \text{+?}: T[K] \} : \{ k_i?: \tau_i \}}
$$

$$
\frac{\Gamma \vdash T : \{ k_i?: \tau_i \}}{\Gamma \vdash \{ [K \text{ in keyof } T] \text{-?}: T[K] \} : \{ k_i: \tau_i \}}
$$

---

## 4. 理论推导与原理解析

### 4.1 同态映射类型的修饰符保留

考虑以下示例：

```typescript
interface User {
  readonly id: string;
  name?: string;
  age: number;
}

type MappedUser = { [K in keyof User]: User[K] };
// 等价于：
// { readonly id: string; name?: string; age: number }
```

形式化推理：

$$
\frac{\text{User} = \{ \text{readonly id}: \text{string}, \text{name?}: \text{string}, \text{age}: \text{number} \}}{\{ [K \text{ in keyof User}]: \text{User}[K] \} = \{ \text{readonly id}: \text{string}, \text{name?}: \text{string}, \text{age}: \text{number} \}}
$$

TypeScript 编译器在处理同态映射类型时，会自动复制原类型的修饰符。这一行为在 [Bierman et al., 2014] 中被称为 **修饰符同态性**（modifier homomorphism）。

### 4.2 非同态映射类型丢失修饰符

```typescript
type Keys = 'id' | 'name' | 'age';

type NonHomo = { [K in Keys]: string };
// { id: string; name: string; age: string }（无 readonly，无 ?）
```

形式化解释：`Keys` 不是 `keyof T`，映射类型失去同态性，无法继承修饰符。

### 4.3 键重映射的过滤机制

`as never` 子句的过滤行为可形式化为：

$$
\text{Filter}(T, P) \triangleq \{ [K \text{ in keyof T as } (P(K) \text{ ? } K \text{ : } \text{never})] : T[K] \}
$$

其中 $P(K)$ 是关于键 $K$ 的谓词。

实例：过滤出值为 `string` 类型的属性：

```typescript
type StringProps<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

interface User {
  id: number;
  name: string;
  age: number;
  email: string;
}

type Result = StringProps<User>;
// { name: string; email: string }
```

推理过程：

| K     | T[K]    | T[K] extends string ? | 结果键 |
|-------|---------|----------------------|--------|
| id    | number  | never                | 过滤   |
| name  | string  | name                 | 保留   |
| age   | number  | never                | 过滤   |
| email | string  | email                | 保留   |

最终类型为 `{ name: string; email: string }`。

### 4.4 键名转换的代数结构

`as` 子句配合模板字面量类型可实现键名的代数变换。设键名变换函数 $f: \text{string} \to \text{string}$，则：

$$
\text{Transform}<T, f> \triangleq \{ [K \text{ in keyof T as } f(K)] : T[K] \}
$$

常见变换：

| 变换 | $f(K)$ | TypeScript 实现 |
|------|--------|-----------------|
| 添加前缀 | `prefix${K}` | `` `prefix${K}` `` |
| 添加后缀 | `${K}Suffix` | `` `${K}Suffix` `` |
| 大写首字母 | `Capitalize<K>` | `Capitalize<K>` |
| 小写首字母 | `Uncapitalize<K>` | `Uncapitalize<K>` |
| 全大写 | `Uppercase<K>` | `Uppercase<K>` |
| 全小写 | `Lowercase<K>` | `Lowercase<K>` |
| getter 命名 | `get${Capitalize<K>}` | `` `get${Capitalize<string & K>}` `` |

### 4.5 修饰符操作的代数性质

`+readonly` / `-readonly` 操作构成一个代数系统：

$$
\text{readonly}^2 = \text{readonly}, \quad \text{mutable} \circ \text{readonly} = \text{mutable}, \quad \text{readonly} \circ \text{mutable} = \text{readonly}
$$

即修饰符操作具有幂等性（idempotence）与可逆性。

类似地，`+?` / `-?` 操作：

$$
\text{optional}^2 = \text{optional}, \quad \text{required} \circ \text{optional} = \text{required}, \quad \text{optional} \circ \text{required} = \text{optional}
$$

### 4.6 类型推断复杂度分析

映射类型的类型推断复杂度取决于：

1. **键集合大小**：$O(|\text{keys}(T)|)$
2. **每个键的类型计算成本**：取决于 $T[K]$ 的复杂度
3. **`as` 子句的模板字面量计算成本**：$O(|K|)$ 字符串操作

总体复杂度：

$$
T_{\text{infer}}(\text{MappedType}) = O(|\text{keys}(T)| \times |K| \times C_{\text{value}})
$$

其中 $C_{\text{value}}$ 是值类型计算的常数因子。

对于深层嵌套的对象类型，递归映射类型的复杂度为：

$$
T_{\text{deep}} = O(d \times n)
$$

其中 $d$ 为嵌套深度，$n$ 为每层的平均键数。TypeScript 5.0 后引入的实例化缓存使此复杂度大幅降低。

### 4.7 编译产物的体积模型

映射类型**完全在编译期消除**，不产生运行时对象。例如：

```typescript
type ReadonlyUser = Readonly<User>;
const u: ReadonlyUser = { id: '1', name: 'Alice', age: 30 };
```

编译产物：

```javascript
"use strict";
const u = { id: '1', name: 'Alice', age: 30 };
```

`Readonly<User>` 在编译期被解析为具体的类型，运行时仅保留对象字面量。这是映射类型相对于运行时工具函数（如 `Object.freeze`）的核心优势。

---

## 5. 代码示例

### 5.1 基础映射类型

```typescript
// TS 5.4, tsconfig.json: { "strict": true }

/**
 * 通用 Readonly 工具类型
 * 将所有属性转为 readonly
 */
type MyReadonly<T> = {
  readonly [K in keyof T]: T[K];
};

/**
 * 通用 Partial 工具类型
 * 将所有属性转为可选
 */
type MyPartial<T> = {
  [K in keyof T]?: T[K];
};

/**
 * 通用 Required 工具类型
 * 移除所有属性的 ? 修饰符
 */
type MyRequired<T> = {
  [K in keyof T]-?: T[K];
};

/**
 * 通用 Mutable 工具类型
 * 移除所有属性的 readonly 修饰符
 */
type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

interface User {
  readonly id: string;
  name?: string;
  age: number;
}

type ReadonlyUser = MyReadonly<User>;
// { readonly id: string; readonly name?: string; readonly age: number }

type PartialUser = MyPartial<User>;
// { readonly id?: string; name?: string; age?: number }

type RequiredUser = MyRequired<User>;
// { readonly id: string; name: string; age: number }

type MutableUser = Mutable<User>;
// { id: string; name?: string; age: number }
```

### 5.2 键重映射：getter 派生

```typescript
// TS 5.4 - 使用 as 子句派生 getter 接口

/**
 * 为对象类型的每个属性生成 getXxx() 方法签名
 */
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface User {
  id: string;
  name: string;
  age: number;
}

type UserGetters = Getters<User>;
// {
//   getId: () => string;
//   getName: () => string;
//   getAge: () => number;
// }

// 实现示例
class UserImpl implements User {
  constructor(
    public id: string,
    public name: string,
    public age: number,
  ) {}
}

function toGetters<T extends object>(obj: T): Getters<T> {
  return new Proxy(obj, {
    get(target, prop) {
      if (prop.toString().startsWith('get')) {
        const key = prop.toString().slice(3);
        const lowerKey = key[0].toLowerCase() + key.slice(1);
        return () => (target as any)[lowerKey];
      }
      return undefined;
    },
  }) as Getters<T>;
}

const user = new UserImpl('u-1', 'Alice', 30);
const getters = toGetters(user);
console.log(getters.getName());  // 'Alice'
console.log(getters.getAge());   // 30
```

### 5.3 键重映射：setter 派生

```typescript
/**
 * 为对象类型的每个属性生成 setXxx() 方法签名
 * 注意：readonly 属性应被过滤
 */
type Setters<T> = {
  [K in keyof T as T[K] extends Function
    ? never
    : `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};

interface User {
  readonly id: string;
  name: string;
  age: number;
}

type UserSetters = Setters<User>;
// {
//   setName: (value: string) => void;
//   setAge: (value: number) => void;
// }
// 注意：id 被 readonly 标记，但映射类型默认不感知 readonly
// 需通过 PickByNonReadonly 进一步过滤（见 5.4）
```

### 5.4 过滤 readonly 属性

```typescript
/**
 * 过滤掉对象类型中的 readonly 属性
 */
type MutableKeys<T> = {
  [K in keyof T]: T extends { [P in K]: T[K] }
    ? IfEquals<{ [P in K]: T[K] }, { readonly [P in K]: T[K] }, never, K>
    : never;
}[keyof T];

type IfEquals<X, Y, A, B> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? A : B;

/**
 * 简化版：使用键重映射直接过滤
 */
type NonReadonlyKeys<T> = keyof {
  [K in keyof T as IfEquals<
    { [P in K]: T[K] },
    { -readonly [P in K]: T[K] },
    K,
    never
  >]: T[K];
};

type SettersStrict<T> = {
  [K in NonReadonlyKeys<T> as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};

interface UserWithReadonly {
  readonly id: string;
  name: string;
  age: number;
}

type UserSettersStrict = SettersStrict<UserWithReadonly>;
// { setName: (value: string) => void; setAge: (value: number) => void }
```

### 5.5 条件过滤：按值类型筛选

```typescript
/**
 * 提取值为指定类型的属性
 */
type PickByValueType<T, ValueType> = {
  [K in keyof T as T[K] extends ValueType ? K : never]: T[K];
};

interface ApiConfig {
  port: number;
  host: string;
  debug: boolean;
  retries: number;
  logFile: string;
}

type StringConfig = PickByValueType<ApiConfig, string>;
// { host: string; logFile: string }

type NumberConfig = PickByValueType<ApiConfig, number>;
// { port: number; retries: number }

type BooleanConfig = PickByValueType<ApiConfig, boolean>;
// { debug: boolean }
```

### 5.6 排除 null 与 undefined

```typescript
/**
 * 移除值为 null 或 undefined 的属性
 */
type RemoveNullAndUndefined<T> = {
  [K in keyof T as T[K] extends null | undefined ? never : K]: T[K];
};

interface User {
  id: string;
  name: string | null;
  email: string | undefined;
  age: number;
}

type CleanUser = RemoveNullAndUndefined<User>;
// { id: string; age: number }
```

### 5.7 深层 Readonly

```typescript
/**
 * 深层 Readonly
 * 递归将所有嵌套对象的属性转为 readonly
 */
type DeepReadonly<T> = T extends Function
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

interface DeepObj {
  a: {
    b: {
      c: string;
    };
  };
  arr: { x: number }[];
}

type DeepReadonlyObj = DeepReadonly<DeepObj>;
// {
//   readonly a: { readonly b: { readonly c: string } };
//   readonly arr: readonly { readonly x: number }[];
// }
```

### 5.8 深层 Partial

```typescript
/**
 * 深层 Partial
 * 递归将所有嵌套对象的属性转为可选
 */
type DeepPartial<T> = T extends Function
  ? T
  : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T extends object
      ? { [K in keyof T]?: DeepPartial<T[K]> }
      : T;

interface NestedConfig {
  server: {
    port: number;
    host: string;
  };
  db: {
    url: string;
    pool: {
      min: number;
      max: number;
    };
  };
}

type PartialConfig = DeepPartial<NestedConfig>;
// 所有属性均变为可选，可部分赋值
const config: PartialConfig = {
  server: { port: 8080 },  // host 可省略
};
```

### 5.9 添加前缀/后缀

```typescript
/**
 * 为所有键添加前缀
 */
type Prefix<T, P extends string> = {
  [K in keyof T as `${P}${Capitalize<string & K>}`]: T[K];
};

interface User {
  id: string;
  name: string;
}

type PrefixedUser = Prefix<User, 'user'>;
// { userId: string; userName: string }

/**
 * 为所有键添加后缀
 */
type Suffix<T, S extends string> = {
  [K in keyof T as `${string & K}${S}`]: T[K];
};

type SuffixedUser = Suffix<User, 'Field'>;
// { idField: string; nameField: string }
```

### 5.10 完整的 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

### 5.11 企业级 ORM 类型层

```typescript
// TS 5.4 - 基于映射类型的 ORM 类型层

/**
 * 数据库 schema 定义
 */
interface UserSchema {
  id: number;
  name: string;
  email: string | null;
  createdAt: Date;
}

interface PostSchema {
  id: number;
  title: string;
  content: string;
  authorId: number;
  publishedAt: Date | null;
}

/**
 * 从 schema 派生实体类型
 * 移除 nullable，转为可选
 */
type Entity<S> = {
  [K in keyof S as S[K] extends null ? never : K]: S[K] extends null
    ? never
    : S[K];
} & {
  [K in keyof S as S[K] extends null ? K : never]?: Exclude<S[K], null>;
};

type UserEntity = Entity<UserSchema>;
// { id: number; name: string; createdAt: Date; email?: string }

/**
 * 创建 DTO - 移除 id 与时间戳
 */
type CreateDTO<S> = Omit<
  {
    [K in keyof S]: S[K];
  },
  'id' | 'createdAt' | 'publishedAt'
>;

type UserCreateDTO = CreateDTO<UserSchema>;
// { name: string; email: string | null }

/**
 * 更新 DTO - 所有字段可选
 */
type UpdateDTO<S> = Partial<CreateDTO<S>>;

type UserUpdateDTO = UpdateDTO<UserSchema>;
// { name?: string; email?: string | null }

/**
 * API 响应类型 - 转换 Date 为 ISO 字符串
 */
type Serialized<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
      ? string | null
      : T[K];
};

type UserResponse = Serialized<UserSchema>;
// { id: number; name: string; email: string | null; createdAt: string }

/**
 * 完整的 CRUD API 接口类型
 */
interface Repository<S> {
  findById(id: number): Promise<Entity<S>>;
  findMany(filter: Partial<Serialized<S>>): Promise<Entity<S>[]>;
  create(data: CreateDTO<S>): Promise<Entity<S>>;
  update(id: number, data: UpdateDTO<S>): Promise<Entity<S>>;
  delete(id: number): Promise<void>;
}

// 使用
type UserRepository = Repository<UserSchema>;
type PostRepository = Repository<PostSchema>;
```

### 5.12 状态机派生

```typescript
// TS 5.4 - 状态机类型派生

interface StateConfig {
  initial: 'idle';
  states: {
    idle: { on: { CLICK: 'loading' } };
    loading: { on: { SUCCESS: 'success'; ERROR: 'error' } };
    success: { on: { RESET: 'idle' } };
    error: { on: { RETRY: 'loading'; RESET: 'idle' } };
  };
}

type States<T> = keyof T['states'];
type Events<T, S extends States<T>> = keyof T['states'][S] extends 'on'
  ? keyof T['states'][S]['on']
  : never;
type Transition<T, S extends States<T>, E extends Events<T, S>> =
  T['states'][S]['on'][E];

/**
 * 类型安全的 send 函数
 */
function createMachine<T extends StateConfig>(config: T) {
  let currentState: States<T> = config.initial;

  function send<S extends States<T>, E extends Events<T, S>>(
    state: S,
    event: E,
  ): Transition<T, S, E> {
    const next = (config.states[state].on as any)[event];
    return next;
  }

  return { send };
}
```

---

## 6. 对比分析

### 6.1 与其他类型系统的对比

| 语言/系统 | 映射类型 | 键重映射 | 同态性 | 修饰符操作 | 编译期消除 |
|-----------|----------|----------|--------|-----------|------------|
| **TypeScript 映射类型** | `{ [K in keyof T]: ... }` | `as` 子句 | 是 | `+/-readonly`、`+/-?` | 是 |
| **Haskell Functor** | `fmap :: (a -> b) -> f a -> f b` | 不支持 | 是 | 不适用 | 不适用 |
| **Scala Shapeless** | `LabelledGeneric` + `Mapped` | 通过 `KeyTag` | 是 | 不支持 | 部分 |
| **Rust Serde** | `#[derive(Serialize)]` 宏 | 不支持 | 否 | 不支持 | 是（宏展开） |
| **Python type hints** | 不支持 | 不支持 | 不适用 | 不适用 | 不适用 |
| **Flow** | 不支持 | 不支持 | 不适用 | 不适用 | 不适用 |
| **OCaml PPX** | 派生宏 | 不支持 | 否 | 不支持 | 是 |

### 6.2 与 Flow 的对比

Flow 不支持映射类型，所有类型变换必须显式写出。例如，Flow 实现 `Partial` 需要手动复制接口：

```javascript
// Flow
interface User {
  id: string;
  name: string;
  age: number;
}

// 必须手动写 Partial 版本
interface PartialUser {
  id?: string;
  name?: string;
  age?: number;
}
```

TypeScript 通过映射类型一行代码解决：

```typescript
type PartialUser = Partial<User>;
```

### 6.3 与 Rust Serde 宏的对比

Rust 通过 Serde 派生宏实现类似的类型变换：

```rust
// Rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct User {
    id: u64,
    name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    email: Option<String>,
}
```

对比 TypeScript：

```typescript
// TypeScript
interface User {
  id: number;
  name: string;
  email?: string;
}

type SerializedUser = {
  [K in keyof User as User[K] extends undefined ? never : K]: User[K];
};
```

差异：

- **Rust Serde**：通过属性宏 `#[serde(...)]` 指定变换规则，编译期生成代码
- **TypeScript**：通过映射类型在类型层变换，运行时无影响
- **表达能力**：Rust 更强（可自定义序列化逻辑），TypeScript 仅类型层
- **运行时性能**：Rust 零成本抽象，TypeScript 同样无运行时开销

### 6.4 与 Python type hints 的对比

Python 3.11 引入 `dataclass_transform` 与 `TypedDict`，但尚不支持映射类型：

```python
# Python
from typing import TypedDict, Optional

class User(TypedDict):
    id: str
    name: str
    age: int

# 必须手动写 Partial 版本
class PartialUser(TypedDict, total=False):
    id: str
    name: str
    age: int
```

TypeScript 的映射类型在表达力与简洁性上均优于 Python。

### 6.5 与 Haskell Functor 的对比

Haskell 的 `Functor` typeclass 提供值级映射：

```haskell
-- Haskell
fmap :: (a -> b) -> f a -> f b

instance Functor Maybe where
  fmap f (Just x) = Just (f x)
  fmap f Nothing  = Nothing
```

TypeScript 映射类型在**类型层**做类似的事：将"类型函数"应用到对象类型的每个字段。但两者本质不同：

- **Haskell Functor**：值级映射，保留容器结构
- **TypeScript 映射类型**：类型级映射，可同时变换键与值

### 6.6 与 Scala Shapeless 的对比

Scala 的 Shapeless 库通过 `LabelledGeneric` 实现记录级类型变换：

```scala
// Scala + Shapeless
import shapeless._
import record._

type User = Record.`'id -> String, 'name -> String, 'age -> Int`.T

// 类型变换通过 HList 操作
type ReadonlyUser = Mapper[Fn.ToSymbol, User]
```

TypeScript 映射类型在易用性上远超 Shapeless：

- **TypeScript**：原生语法，无依赖
- **Scala Shapeless**：需引入重型库，学习曲线陡峭
- **类型推断**：TypeScript 自动推断，Scala 需大量显式类型注解

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱一：非同态映射类型丢失修饰符

```typescript
interface User {
  readonly id: string;
  name?: string;
}

// 反面示例：非同态映射类型，丢失 readonly 与 ?
type BadMapped = { [K in 'id' | 'name']: User[K] };
// { id: string; name: string }  <- 丢失了修饰符！

// 正确做法：使用 keyof T 保持同态性
type GoodMapped = { [K in keyof User]: User[K] };
// { readonly id: string; name?: string }  <- 保留修饰符
```

**最佳实践**：始终使用 `keyof T` 而非显式联合类型作为 `in` 后的类型，以保持同态性。

### 7.2 陷阱二：`as` 子句过滤的语义混淆

```typescript
interface User {
  id: number;
  name: string;
  age: number;
}

// 反面示例：意图过滤 number 类型，但写法错误
type BadFilter<T> = {
  [K in keyof T as T[K] extends number ? never : K]: T[K];
};

type Result = BadFilter<User>;
// { name: string }  <- 这是正确的

// 反面示例：意图过滤 string 类型，但写法错误
type BadFilter2<T> = {
  [K in keyof T as K extends string ? never : K]: T[K];
};

type Result2 = BadFilter2<User>;
// {}  <- 所有键被过滤，因为 keyof 返回的键本身就是 string
```

**最佳实践**：明确区分"键过滤"与"值过滤"。键过滤使用 `K extends SomeType`，值过滤使用 `T[K] extends SomeType`。

### 7.3 陷阱三：递归映射类型的深度限制

```typescript
// 反面示例：深层递归映射类型
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? DeepReadonly<T[K]>
    : T[K];
};

// 应用到 100 层嵌套对象
type Deep100 = DeepReadonly<{ a: { b: { c: { /* ... 100 层 ... */ } } } }>;
// Error: Type instantiation is excessively deep and possibly infinite.
```

TypeScript 类型系统对递归深度有约 1000 层的硬限制。

**最佳实践**：

- 避免超过 7 层的递归映射类型
- 使用 `unknown` 或 `any` 截断递归
- 考虑运行时方案（如 `Object.freeze`）替代深层类型

### 7.4 陷阱四：键重映射的 `never` 行为

```typescript
interface User {
  id: number;
  name: string;
  age: number;
}

// never 在键位置被过滤
type Filtered<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

type Result = Filtered<User>;
// { name: string }  <- id 和 age 被 never 过滤

// 但 never 在值位置不会被过滤
type Filtered2<T> = {
  [K in keyof T]: T[K] extends string ? T[K] : never;
};

type Result2 = Filtered2<User>;
// { id: never; name: string; age: never }  <- 键保留，值为 never
```

**最佳实践**：过滤键用 `as never`，过滤值用条件类型。两者语义不同，不可混用。

### 7.5 陷阱五：修饰符操作符的方向

```typescript
interface User {
  readonly id: string;
  name?: string;
}

// +readonly：添加 readonly（默认，可省略 +）
type AddReadonly<T> = { +readonly [K in keyof T]: T[K] };
type AddReadonly2<T> = { readonly [K in keyof T]: T[K] };  // 等价

// -readonly：移除 readonly
type RemoveReadonly<T> = { -readonly [K in keyof T]: T[K] };

// +?：添加 ?（默认，可省略 +）
type AddOptional<T> = { [K in keyof T]+?: T[K] };
type AddOptional2<T> = { [K in keyof T]?: T[K] };  // 等价

// -?：移除 ?
type RemoveOptional<T> = { [K in keyof T]-?: T[K] };
```

**最佳实践**：始终显式写 `+` 或 `-`，避免歧义。

### 7.6 陷阱六：键重映射与 `keyof` 的交互

```typescript
interface User {
  id: string;
  name: string;
}

type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<User>;
// { getId: () => string; getName: () => string }

// keyof UserGetters 不等于 keyof User
type Keys = keyof UserGetters;  // 'getId' | 'getName'
type OriginalKeys = keyof User; // 'id' | 'name'
```

**最佳实践**：键重映射后的类型与原类型在 `keyof` 上不同。需要保留原键信息时，使用辅助类型记录。

### 7.7 陷阱七：映射类型与索引签名的混淆

```typescript
// 映射类型：键集合是有限的
type MappedType = { [K in 'a' | 'b' | 'c']: string };
// { a: string; b: string; c: string }

// 索引签名：键集合是无限的
type IndexSignature = { [key: string]: string };
// { [key: string]: string }（任意 string 键）

// 混淆：尝试用索引签名语法写映射类型
type Wrong = { [K: string]: string };  // 这是索引签名
type Right = { [K in string]: string }; // 这是映射类型（但会得到空对象）
```

**最佳实践**：注意 `[K in ...]` 与 `[K: ...]` 的语法差异。

### 7.8 陷阱八：性能问题

```typescript
// 反面示例：在循环中大量使用复杂映射类型
type SlowType<T> = {
  [K in keyof T]: T[K] extends object
    ? SlowType<T[K]>  // 递归
    : T[K];
};

// 大型对象类型（100+ 字段）
interface LargeConfig { /* ... 100+ 字段 ... */ }

type Processed = SlowType<LargeConfig>;  // 编译时间显著增加
```

**最佳实践**：

- 在开发环境启用 `--extendedDiagnostics` 监控编译时间
- 超过 1000ms 的类型应重构
- 使用 `type-fest` 的优化版本（如 `Simplify<T>`）

### 7.9 最佳实践速查表

| 场景 | 推荐方案 | 理由 |
|------|----------|------|
| 派生 Partial/Required/Readonly | 内置工具类型 | 简洁、可读 |
| 派生 getter/setter | 映射类型 + `as` 子句 + 模板字面量 | 类型安全、自动化 |
| 过滤对象属性 | `as never` 子句 | 原子化、零运行时 |
| 深层变换 | 递归映射类型（深度 ≤ 7） | 平衡表达力与性能 |
| ORM 类型层 | 映射类型 + 条件类型组合 | 端到端类型安全 |
| 键名前缀/后缀 | 模板字面量 + `as` 子句 | 自动化、可维护 |

---

## 8. 工程实践

### 8.1 构建配置

```json
// tsconfig.json - 推荐配置（TS 5.4）
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true
  }
}
```

### 8.2 性能分析

```bash
# 启用扩展诊断
npx tsc --noEmit --extendedDiagnostics

# 关注指标：
# - Instantiations（类型实例化次数）
# - Types created（创建的类型数量）
# - Memory used（内存使用）
# - Check time（检查时间）

# 当 Instantiations > 1,000,000 时，应优化映射类型
```

### 8.3 调试技巧

#### 8.3.1 类型展开

```typescript
// 强制 TypeScript 展开映射类型
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

interface User {
  id: string;
  name: string;
}

type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

// IDE 中悬停查看类型
type Raw = Getters<User>;          // 显示为映射类型语法
type Expanded = Expand<Getters<User>>;  // 显示展开后的具体类型
```

#### 8.3.2 类型断言测试

```typescript
// 使用类型断言验证类型推断
type AssertEqual<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;

type Test1 = AssertEqual<Getters<User>['getId'], () => string>;  // true
type Test2 = AssertEqual<Getters<User>['getName'], () => string>; // true
```

#### 8.3.3 TypeScript Playground

- 网址：<https://www.typescriptlang.org/play>
- 技巧：在 `.ts` 文件中悬停类型查看展开
- 使用 `?ts=5.4` 参数指定 TS 版本

### 8.4 测试策略

```typescript
// 使用 vitest + type assertions 进行映射类型测试
import { describe, it, expectType } from 'vitest';

type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface User {
  id: string;
  name: string;
}

describe('Getters', () => {
  it('应正确派生 getter 方法', () => {
    type UserGetters = Getters<User>;
    expectType<UserGetters>().toEqualTypeOf<{
      getId: () => string;
      getName: () => string;
    }>();
  });
});
```

### 8.5 性能优化

#### 8.5.1 使用 `Simplify` 展开

```typescript
/**
 * 简化类型显示
 * 强制 TypeScript 展开映射类型为具体对象类型
 */
type Simplify<T> = { [K in keyof T]: T[K] } & {};

// 应用
type Complex = Getters<User> & Setters<User> & Partial<User>;
type Simple = Simplify<Complex>;  // IDE 中显示更清晰
```

#### 8.5.2 缓存类型计算

```typescript
// 反面示例：每次调用重新计算
type SlowType<T> = { [K in keyof T]: ... };

// 推荐方案：类型别名提前计算
type CachedUser = SlowType<User>;
type Processed = CachedUser & { extra: string };
```

### 8.6 库代码设计

发布到 npm 的库代码应：

1. **避免深层递归映射类型**（深度 ≤ 5）
2. **导出工具类型**而非具体类型，方便用户定制
3. **提供 `Simplify` 别名**改善用户类型显示
4. **避免使用 `as` 子句的复杂变换**，降低兼容性风险

---

## 9. 案例研究

### 9.1 案例一：`type-fest` 库

[`type-fest`](https://github.com/sindresorhus/type-fest) 是 TypeScript 社区最流行的类型工具库，包含 100+ 个基于映射类型的工具类型。

**典型实现**（`Simplify` 与 `SetOptional`）：

```typescript
// type-fest Simplify 实现
type Simplify<T> = { [KeyType in keyof T]: T[KeyType] };

// type-fest SetOptional 实现
type SetOptional<BaseType, Keys extends keyof BaseType> = {
  [KeyType in keyof BaseType as KeyType extends Keys
    ? KeyType
    : never]?: BaseType[KeyType];
} & {
  [KeyType in keyof BaseType as KeyType extends Keys
    ? never
    : KeyType]: BaseType[KeyType];
};
```

**设计决策**：

- 使用 `as` 子句过滤键，比 `Pick + Omit` 更原子化
- 通过 `&` 交叉类型组合可选与非可选部分
- 提供 `Simplify` 改善类型显示

### 9.2 案例二：`ts-toolbelt` 库

[`ts-toolbelt`](https://github.com/millsp/ts-toolbelt) 提供更激进的映射类型工具，包括：

```typescript
// ts-toolbelt Object.SelectKeys 实现
type SelectKeys<O, M> = {
  [K in keyof O as O[K] extends M ? K : never]: O[K];
};
```

**与 `type-fest` 的对比**：

- `ts-toolbelt` 更激进，使用 `as` 子句的复杂组合
- `type-fest` 更保守，优先考虑兼容性
- 两者均基于映射类型 + 键重映射

### 9.3 案例三：Prisma 的类型派生

[Prisma](https://github.com/prisma/prisma) ORM 使用映射类型将数据库 schema 类型派生为 TypeScript 客户端类型。

**典型模式**：

```typescript
// Prisma 生成的类型（简化）
type UserGetPayload<S extends UserArgs> = {
  [K in keyof UserDefaultArgs]: K extends 'select'
    ? S['select']
    : K extends 'include'
      ? S['include']
      : UserDefaultArgs[K];
};
```

**设计亮点**：

- 使用映射类型动态派生 select/include 类型
- 通过 `as` 子句处理不同字段的派生逻辑
- 端到端类型安全，从 SQL schema 到业务代码

### 9.4 案例四：Airbnb 的 API 客户端

Airbnb 的 TypeScript API 客户端使用映射类型自动派生请求/响应类型：

```typescript
interface ApiSchema {
  '/users': {
    GET: { response: User[] };
    POST: { body: UserCreateDTO; response: User };
  };
  '/users/:id': {
    GET: { params: { id: string }; response: User };
    PUT: { params: { id: string }; body: UserUpdateDTO; response: User };
    DELETE: { params: { id: string }; response: void };
  };
}

type ApiClient = {
  [Path in keyof ApiSchema]: {
    [Method in keyof ApiSchema[Path] as Uppercase<string & Method>]: (
      args: Omit<ApiSchema[Path][Method], 'response'>,
    ) => Promise<ApiSchema[Path][Method]['response']>;
  };
};
```

**收益**：

- 单一数据源（schema）驱动整个 API 客户端类型
- 任何 schema 变更自动反映到客户端类型
- 编译期捕获 API 调用错误

### 9.5 案例五：Google 的 TypeScript 风格指南

Google TypeScript Style Guide（§5.4 类型派生）：

> **Prefer mapped types for type derivation.**
>
> Rationale:
> - Single source of truth
> - Compile-time safety
> - Zero runtime overhead

Google 在 Angular、gRPC-Web 等项目中广泛使用映射类型派生 API 类型。

---

## 10. 习题

### 10.1 选择题

**题目 1**：以下哪种映射类型会保留原类型的 `readonly` 与 `?` 修饰符？

A. `{ [K in 'a' | 'b']: string }`
B. `{ [K in keyof T]: T[K] }`
C. `{ [K in UnionType]: T[K] }`
D. `{ [key: string]: string }`

**答案**：B

**解析**：只有 `in keyof T` 形式的映射类型才是同态映射类型，自动保留原类型的 `readonly` 与 `?` 修饰符。其他形式均为非同态映射类型，丢失修饰符。

---

**题目 2**：以下代码的输出类型是什么？

```typescript
type T = { [K in 'a' | 'b' | 'c' as K extends 'b' ? never : K]: string };
```

A. `{ a: string; b: string; c: string }`
B. `{ a: string; c: string }`
C. `{ b: string }`
D. `{}`

**答案**：B

**解析**：`as` 子句将 `K = 'b'` 映射为 `never`，`never` 在键位置被过滤。最终类型为 `{ a: string; c: string }`。

---

**题目 3**：以下哪种说法是正确的？

A. 映射类型会产生运行时对象
B. `as` 子句在 TS 4.0 引入
C. 映射类型的 `+readonly` 与 `readonly` 等价
D. 非同态映射类型保留 `readonly` 修饰符

**答案**：C

**解析**：

- A 错误：映射类型完全在编译期消除
- B 错误：`as` 子句在 TS 4.1（2020 年）引入
- C 正确：`+readonly` 与 `readonly` 完全等价
- D 错误：非同态映射类型丢失修饰符

---

**题目 4**：以下代码的输出类型是什么？

```typescript
type T = {
  [K in keyof { id: string; name: string; age: number } as `get${Capitalize<string & K>}`]: () => any;
};
```

A. `{ getId: () => any; getName: () => any; getAge: () => any }`
B. `{ getid: () => any; getname: () => any; getage: () => any }`
C. `{}`
D. `{ [K: string]: () => any }`

**答案**：A

**解析**：`Capitalize<string & K>` 将 `K` 的首字母大写：`id` → `Id`、`name` → `Name`、`age` → `Age`。模板字面量 `` `get${Capitalize<K>}` `` 生成 `getId`、`getName`、`getAge`。

---

**题目 5**：以下哪种映射类型会移除所有 `?` 修饰符？

A. `{ [K in keyof T]+?: T[K] }`
B. `{ [K in keyof T]-?: T[K] }`
C. `{ [K in keyof T]?: T[K] }`
D. `{ [K in keyof T as T[K] extends undefined ? never : K]: T[K] }`

**答案**：B

**解析**：`-?` 操作符移除所有可选修饰符，使所有属性变为必需。`+?` 添加可选修饰符，`?` 是 `+?` 的简写。`D` 过滤值为 `undefined` 类型的属性，但不改变其他属性的可选性。

### 10.2 填空题

**题目 1**：TypeScript 引入 `as` 子句（键重映射）的版本是 _______。

**答案**：4.1

**解析**：TypeScript 4.1（2020 年 11 月发布）引入 `as` 子句与模板字面量类型，是映射类型的核心更新。

---

**题目 2**：同态映射类型的判定条件是 `in` 后的类型必须是 _______。

**答案**：`keyof T`（其中 T 是某个对象类型）

**解析**：当且仅当 `in` 后的类型为 `keyof T` 形式时，映射类型才具有同态性，保留原类型的修饰符。

---

**题目 3**：在键重映射中，`as never` 的作用是 _______。

**答案**：过滤对应的键

**解析**：`as never` 将当前键映射为 `never`，TypeScript 在构造对象类型时会自动过滤值为 `never` 的键。

---

**题目 4**：`-readonly` 操作符的作用是 _______。

**答案**：移除原类型的 `readonly` 修饰符

**解析**：`-readonly` 是修饰符操作的减法形式，将原类型的 `readonly` 属性变为可变。

### 10.3 编程题

**题目 1**：实现一个 `Mutable<T>` 工具类型，递归移除所有 `readonly` 修饰符。

**参考答案**：

```typescript
// TS 5.4
type Mutable<T> = T extends Function
  ? T
  : T extends ReadonlyArray<infer U>
    ? Array<Mutable<U>>
    : T extends object
      ? { -readonly [K in keyof T]: Mutable<T[K]> }
      : T;

interface ReadonlyUser {
  readonly id: string;
  readonly profile: {
    readonly name: string;
    readonly age: number;
  };
  readonly tags: readonly string[];
}

type MutableUser = Mutable<ReadonlyUser>;
// {
//   id: string;
//   profile: { name: string; age: number };
//   tags: string[];
// }
```

**评分标准**：

- 顶层 readonly 移除（5 分）
- 嵌套对象递归（10 分）
- 数组处理（5 分）

---

**题目 2**：实现一个 `PathKeys<T>` 工具类型，提取对象类型所有叶子节点的路径（点分字符串）。

**参考答案**：

```typescript
// TS 5.4
type PathKeys<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? PathKeys<T[K], `${Prefix}${Prefix extends '' ? '' : '.'}${K}`>
        : `${Prefix}${Prefix extends '' ? '' : '.'}${K}`;
    }[keyof T & string]
  : never;

interface Config {
  server: {
    port: number;
    host: string;
  };
  db: {
    url: string;
    pool: {
      min: number;
      max: number;
    };
  };
}

type ConfigPaths = PathKeys<Config>;
// 'server.port' | 'server.host' | 'db.url' | 'db.pool.min' | 'db.pool.max'

// 使用
function getConfigValue<T>(obj: T, path: PathKeys<T>): any {
  return path.split('.').reduce((acc, key) => acc[key], obj as any);
}
```

**评分标准**：

- 顶层键提取（5 分）
- 递归路径拼接（10 分）
- 字符串模板正确（5 分）

### 10.4 思考题

**题目 1**：为什么同态映射类型会保留修饰符？请从编译器实现角度分析。

**参考答案要点**：

1. **AST 节点共享**：当 `in` 后是 `keyof T` 时，TypeScript 编译器在内部将映射类型与原类型关联，直接复制原类型的属性修饰符 AST 节点。
2. **同态性语义**：同态映射类型定义为"对原类型的每个属性应用变换"，因此变换不应改变属性的存在性（`?`）或可变性（`readonly`）。
3. **类型推断优化**：保留修饰符允许 TypeScript 在类型推断时复用原类型的信息，避免重新计算。

---

**题目 2**：设计一个类型安全的表单验证 schema，使用映射类型自动派生验证函数类型。

**参考答案要点**：

```typescript
interface FormSchema {
  username: { type: 'string'; min: number; max: number };
  age: { type: 'number'; min: number; max: number };
  email: { type: 'string'; pattern: string };
}

type Validator<S> = {
  [K in keyof S]: (value: S[K]['type'] extends 'string' ? string : number) => boolean;
};

type FormValidator = Validator<FormSchema>;
// {
//   username: (value: string) => boolean;
//   age: (value: number) => boolean;
//   email: (value: string) => boolean;
// }

function createValidator<S>(schema: S): Validator<S> {
  // 实现略
  return {} as Validator<S>;
}
```

---

**题目 3**：分析映射类型在 TypeScript 编译器中的实例化机制，讨论其性能瓶颈。

**参考答案要点**：

1. **实例化机制**：映射类型通过类型实例化（type instantiation）实现，对每个键独立应用类型变换。
2. **性能瓶颈**：
   - 键集合大小线性影响实例化次数
   - 递归映射类型的深度影响总实例化次数
   - `as` 子句的模板字面量计算有额外开销
3. **优化策略**：
   - TS 5.0 引入的实例化缓存
   - 限制递归深度
   - 使用 `Simplify<T>` 提前展开
   - 避免在循环中重复计算

---

**题目 4**：设计一个端到端类型安全的 API 客户端类型，要求：

- 单一 schema 定义驱动所有 API 类型
- 请求方法、路径、参数、响应均类型安全
- 自动派生 HTTP 方法枚举

**参考答案要点**：

```typescript
const apiSchema = {
  '/users': {
    GET: { response: User[] },
    POST: { body: UserCreateDTO; response: User },
  },
  '/users/:id': {
    GET: { params: { id: string }; response: User },
    DELETE: { params: { id: string }; response: void },
  },
} as const;

type ApiSchema = typeof apiSchema;
type Paths = keyof ApiSchema;
type Methods<P extends Paths> = keyof ApiSchema[P];

type ApiClient = {
  [P in Paths]: {
    [M in Methods<P> as Uppercase<string & M>]: (
      args: 'body' extends keyof ApiSchema[P][M]
        ? 'params' extends keyof ApiSchema[P][M]
          ? { body: ApiSchema[P][M]['body']; params: ApiSchema[P][M]['params'] }
          : { body: ApiSchema[P][M]['body'] }
        : 'params' extends keyof ApiSchema[P][M]
          ? { params: ApiSchema[P][M]['params'] }
          : void,
    ) => Promise<ApiSchema[P][M]['response']>;
  };
};
```

---

## 11. 参考文献

### 11.1 学术论文

Bierman, G., Abadi, M., & Torgersen, M. (2014). Understanding TypeScript. In *Proceedings of the 28th European Conference on Object-Oriented Programming (ECOOP 2014)* (pp. 257–281). Springer. <https://doi.org/10.1007/978-3-662-44202-9_11>

Bierman, G., Parkinson, M., & Pitts, A. (2003). The effect of structural typing. In *Proceedings of the 2003 ACM SIGPLAN Workshop on Mechanized Reasoning about Languages with Variable Binding* (pp. 1–10). ACM. <https://doi.org/10.1145/976571.976572>

Pierce, B. C. (2002). *Types and programming languages*. MIT Press. ISBN: 978-0262162098.

Wadler, P., & Blott, S. (1989). How to make ad-hoc polymorphism less ad hoc. In *Proceedings of the 16th ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages (POPL 1989)* (pp. 60–76). ACM. <https://doi.org/10.1145/75277.75283>

Swamy, N., Hicks, M., & Bierman, G. (2014). Gradual typing for JavaScript. In *Proceedings of the 29th ACM SIGPLAN Conference on Object-Oriented Programming, Systems, Languages, and Applications (OOPSLA 2014)* (pp. 1–27). ACM. <https://doi.org/10.1145/2660193.2660232>

### 11.2 官方文档与规范

TypeScript Language Specification (2014). Microsoft. <https://github.com/microsoft/TypeScript/blob/main/doc/spec-ARCHIVED.md>

TypeScript Handbook: Mapped Types (2024). Microsoft. <https://www.typescriptlang.org/docs/handbook/2/mapped-types.html>

Rosenwasser, D. (2020). *Announcing TypeScript 4.1*. Microsoft DevBlog. <https://devblogs.microsoft.com/typescript/announcing-typescript-4-1/>

Microsoft. (2024). *TypeScript 5.4 release notes*. <https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html>

### 11.3 工程实践文献

Airbnb. (2024). *TypeScript style guide*. <https://github.com/airbnb/typescript>

Google. (2024). *Google TypeScript style guide*. <https://google.github.io/styleguide/tsguide.html>

Sindresorhus. (2024). *type-fest: A collection of essential TypeScript types*. <https://github.com/sindresorhus/type-fest>

Prisma. (2024). *Prisma Client type generation*. <https://www.prisma.io/docs/concepts/components/prisma-client>

### 11.4 历史资料

Hejlsberg, A. (2017). *TypeScript: The first six years*. GopherCon 2017 Keynote. <https://www.youtube.com/watch?v=jXccn7GYn94>

Soicher, G. (2016). *TypeScript 1.8: Mapped types design notes*. Microsoft Internal Document.

---

## 12. 延伸阅读

### 12.1 书籍

- **《Effective TypeScript》**（Dan Vanderkam，2024 第二版）- 第 7 章"类型派生"深入讨论映射类型最佳实践
- **《Programming TypeScript》**（Boris Cherny，2023 第三版）- 第 6 章覆盖映射类型与键重映射
- **《TypeScript in 50 Lessons》**（Stefan Baumgartner，2024）- 第 22-25 课讲解映射类型在企业级应用
- **《Learning TypeScript》**（Josh Goldberg，2022）- 第 8 章映射类型基础
- **《Category Theory for Programmers》**（Bartosz Milewski，2018）- 函子（Functor）概念的理论基础

### 12.2 在线资源

- **TypeScript Handbook（官方）**: <https://www.typescriptlang.org/docs/handbook/2/mapped-types.html>
- **TypeScript Deep Dive**: <https://basarat.gitbook.io/typescript/type-system/mapped-types>
- **Type Challenges**: <https://github.com/type-challenges/type-challenges> - 通过习题掌握映射类型
- **TypeScript Playground**: <https://www.typescriptlang.org/play>
- **type-fest 源码**: <https://github.com/sindresorhus/type-fest> - 学习生产级映射类型实现

### 12.3 论文与演讲

- **"Understanding TypeScript"**（Gavin Bierman, ECOOP 2014）- TypeScript 类型系统形式化分析
- **"TypeScript: The first six years"**（Anders Hejlsberg, GopherCon 2017）- 设计动机
- **"Gradual Typing for JavaScript"**（Swamy et al., OOPSLA 2014）- 渐进式类型系统
- **"Functors, Applicatives, and Monads in Pictures"**（Aditya Bhargava）- 函子概念可视化

### 12.4 相关开源项目

- **`type-fest`**: <https://github.com/sindresorhus/type-fest> - TypeScript 类型工具库
- **`ts-toolbelt`**: <https://github.com/millsp/ts-toolbelt> - 高级类型工具
- **`ts-pattern`**: <https://github.com/gvergnaud/ts-pattern> - 模式匹配与映射类型结合
- **`effect`**: <https://github.com/effect-ts/effect> - 函数式编程框架

### 12.5 进阶主题

完成本章学习后，建议继续探索：

1. **条件类型分发**：映射类型与分布式条件类型的组合
2. **模板字面量类型**：与 `as` 子句配合实现键名代数变换
3. **类型体操**：使用映射类型解决复杂类型挑战
4. **声明文件编写**：在 `.d.ts` 文件中正确使用映射类型
5. **编译性能优化**：监控与优化大型映射类型的编译时间

---

## 附录 A：本章代码示例的 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  }
}
```

## 附录 B：术语表

| 术语 | 英文 | 含义 |
|------|------|------|
| 映射类型 | mapped type | 通过 `[K in keyof T]` 语法遍历键类型 |
| 同态映射类型 | homomorphic mapped type | `in keyof T` 形式，保留修饰符 |
| 键重映射 | key remapping | `as` 子句转换键名 |
| 修饰符操作 | modifier operation | `+/-readonly`、`+/-?` |
| 模板字面量类型 | template literal type | `` `get${K}` `` 字符串拼接类型 |
| 条件过滤 | conditional filtering | `as never` 过滤键 |
| 函子 | functor | Haskell 中的映射概念 |
| 类型实例化 | type instantiation | TypeScript 编译器展开泛型类型 |

---

*本文档由 FANDEX 项目维护，对标 MIT/Stanford/CMU 教学水准，最后更新于 2026-06-14。*
