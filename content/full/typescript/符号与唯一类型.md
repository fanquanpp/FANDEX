---
order: 64
title: 符号与唯一类型
module: typescript
category: TypeScript
difficulty: intermediate
description: Symbol、unique symbol 与品牌类型的类型论基础、形式语义与生产级模式
author: fanquanpp
updated: '2026-07-20'
lastReviewed: 2026-07-20
reviewer: FANDEX Content Engineering Team
related:
  - typescript/协变与逆变
  - typescript/this类型与多态
  - typescript/命名空间与模块
  - typescript/枚举进阶
  - typescript/类型体操实用模式
prerequisites:
  - typescript/语法速查
tags:
  - typescript
  - symbol
  - unique-symbol
  - branded-type
  - nominal-typing
  - well-known-symbols
  - metaprogramming
  - type-theory
learningObjectives:
  - '理解 Symbol 在 JavaScript 中的运行时唯一性与 TypeScript 中 unique symbol 的编译期唯一性差异'
  - '运用 unique symbol 实现品牌类型（branded type）与不透明类型（opaque type），模拟名义类型系统'
  - '分析 well-known symbols（Symbol.iterator、Symbol.asyncIterator、Symbol.hasInstance 等）的协议机制与元编程能力'
  - '评估 unique symbol 在泛型约束、映射类型、模板字面量类型中的局限性，选择合适的替代方案'
  - '设计基于 Symbol 的依赖注入容器、协议抽象、插件系统等高级架构模式'
  - '对比 TypeScript 结构子类型与 Rust/Scala/Haskell 名义子类型在类型安全与可组合性上的差异'
exercises:
  fill-blank:
    - question: "Symbol 在 JavaScript 中是第____种基本数据类型，与 number、string、boolean、null、undefined 并列。"
      answer: "七"
      bloom: remember
    - question: "TypeScript 中使用____关键字声明的 const 变量，其 Symbol 类型可被推断为 unique symbol。"
      answer: "const"
      bloom: understand
    - question: "unique symbol 与普通 symbol 的核心差异是：unique symbol 在____层具备唯一性，可作为类型的判别依据。"
      answer: "类型（编译期）"
      bloom: understand
    - question: "Symbol.iterator 是 well-known symbol 中用于实现____协议的入口，for...of 循环会调用该方法获取迭代器。"
      answer: "可迭代（iterable）"
      bloom: apply
    - question: "品牌类型（branded type）的典型实现是 `type Brand<T, B> = T & { readonly __brand: ____ }`，其中占位符应为 unique symbol。"
      answer: "unique symbol"
      bloom: apply
    - question: "Symbol.for('key') 与 Symbol('key') 的差异是：前者会登记在____中，相同 key 返回同一 Symbol；后者每次都创建新 Symbol。"
      answer: "全局 Symbol 注册表"
      bloom: remember
  choice:
    - question: "关于 TypeScript 中 unique symbol，下列说法正确的是？"
      options:
        - "unique symbol 是运行时概念，每个 Symbol 实例在运行时都是 unique 的"
        - "unique symbol 是编译期类型，两个不同的 const symbol 变量即使描述相同，其类型也不兼容"
        - "unique symbol 可以用 let 声明"
        - "unique symbol 可以作为函数参数的类型"
      answer: "B"
      explanation: "unique symbol 是 TypeScript 编译期的类型层概念；let 声明会推断为 symbol 而非 unique symbol；作为参数类型时必须用类型参数或具体常量。"
      bloom: evaluate
    - question: "下列哪种方式可以正确实现「不透明类型」（opaque type）？"
      options:
        - "type UserId = string"
        - "type UserId = string & { readonly __brand: unique symbol }"
        - "type UserId = { value: string }"
        - "type UserId = `user_${string}`"
      answer: "B"
      explanation: "选项 B 通过交叉类型与 unique symbol 添加「品牌」，使 UserId 与 string 在结构上不兼容，从而实现名义类型的效果。"
      bloom: evaluate
    - question: "关于 well-known symbols，下列描述错误的是？"
      options:
        - "Symbol.iterator 用于自定义对象的 for...of 行为"
        - "Symbol.asyncIterator 用于 for await...of 异步迭代"
        - "Symbol.hasInstance 用于自定义 instanceof 操作符的行为"
        - "Symbol.toPrimitive 用于对象的 JSON.stringify 序列化"
      answer: "D"
      explanation: "Symbol.toPrimitive 控制对象到原始值的转换（如 +obj、`${obj}`、obj == 1）；JSON.stringify 的行为由 toJSON 方法控制，与 Symbol 无关。"
      bloom: analyze
    - question: "下列代码中，哪一项的 typeof sym 推断结果与其他不同？"
      options:
        - "let sym = Symbol('a');"
        - "const sym = Symbol('a');"
        - "const sym: symbol = Symbol('a');"
        - "const sym = Symbol.for('a');"
      answer: "B"
      explanation: "选项 B 在 const 声明下会推断为 unique symbol 类型（带具体字面量标识）；其他三项均推断为 symbol 类型。"
      bloom: analyze
    - question: "关于品牌类型（branded type）的工程价值，下列说法错误的是？"
      options:
        - "防止 UserId 与 OrderId 等 structurally identical 类型混淆"
        - "运行时零开销，品牌属性不会被序列化"
        - "完全等同于 Rust 的新类型模式（newtype pattern）"
        - "需要类型断言或构造函数进行包装与解包"
      answer: "C"
      explanation: "Rust newtype 在运行时是真实存在的包装类型（有内存布局），TypeScript 品牌类型仅在编译期存在，运行时被完全擦除。两者语义类似但实现机制不同。"
      bloom: evaluate
    - question: "下列哪种场景不适合使用 Symbol 作为属性键？"
      options:
        - "私有属性模拟（避免与公开属性冲突）"
        - "实现协议（Symbol.iterator、Symbol.toPrimitive 等）"
        - "需要 JSON.stringify 序列化的对象"
        - "需要被 WeakMap 引用的键（Symbol 不可作 WeakMap 键）"
      answer: "C"
      explanation: "JSON.stringify 会忽略所有 Symbol 键；选项 D 描述有误——Symbol 实际上可以作 WeakMap 键（ES2023+），但仍是合理排除项。"
      bloom: analyze
  code-fix:
    - question: "下列品牌类型实现中，构造函数与解包函数无法通过类型校验，请修复："
      code: |
        type UserId = string & { readonly __brand: unique symbol };

        function createUserId(s: string): UserId {
          return s;
        }
      fix: |
        type UserId = string & { readonly __brand: unique symbol };

        function createUserId(s: string): UserId {
          return s as UserId;
        }
      explanation: "string 与 UserId 在结构上不兼容（缺 __brand 属性），需要类型断言跨越结构边界；这是品牌类型的标准构造模式，断言发生在「构造点」即视为可信。"
      bloom: apply
    - question: "下列 unique symbol 用法在类型层不兼容，请修复（保留 unique 语义）："
      code: |
        const KEY_A: unique symbol = Symbol('key');
        const KEY_B: unique symbol = Symbol('key');

        type T = typeof KEY_A;
        const x: T = KEY_B; // 编译错误
      fix: |
        const KEY_A: unique symbol = Symbol('key');
        const KEY_B: unique symbol = Symbol('key');

        type T = symbol;
        const x: T = KEY_B; // OK，但丢失 unique 语义

        // 若需保留 unique 语义，应使用 KEY_A 与 KEY_B 各自的类型
        const x2: typeof KEY_A = KEY_A;
        const x3: typeof KEY_B = KEY_B;
      explanation: "unique symbol 的「唯一性」体现在类型层：不同 const 变量的 unique symbol 类型互不兼容；若需统一类型，必须降级为 symbol，但这会丢失编译期唯一性校验。"
      bloom: apply
    - question: "下列 Iterable 实现在 for...of 中抛错，请修复："
      code: |
        class Range {
          constructor(private start: number, private end: number) {}
          [Symbol.iterator]() {
            return {
              next: () => ({ value: this.start++, done: this.start > this.end }),
            };
          }
        }
      fix: |
        class Range {
          private current: number;
          constructor(private start: number, private end: number) {
            this.current = start;
          }
          [Symbol.iterator](): Iterator<number> {
            const end = this.end;
            let current = this.current;
            return {
              next: (): IteratorResult<number> => {
                if (current <= end) {
                  return { value: current++, done: false };
                }
                return { value: undefined, done: true };
              },
            };
          }
        }
      explanation: "原实现复用 this.start 作为迭代状态，多次迭代或并发迭代会相互污染；正确做法是在每次 [Symbol.iterator]() 调用时创建独立的迭代状态（闭包或独立对象）。"
      bloom: apply
  open-ended:
    - question: "请用 300 字以内论述：TypeScript 选择结构子类型而非名义子类型的工程动机是什么？品牌类型如何在不修改语言的前提下补足名义类型的缺失？"
      reference: "考虑与 JavaScript 互操作、JSON 序列化、库 API 兼容性、类型推导成本等维度。"
      bloom: create
    - question: "如果让你为一家金融科技公司设计一个支持「金额不可混淆」的类型系统（如 USD 与 EUR 不可直接相加），请列出至少 4 个类型层的硬性约束，并说明每条约束的工程动机。考虑品牌类型、运算符重载、序列化、Schema 演化等。"
      reference: "可参考 Rust 的 phantom type、F# 的 units of measure、Haskell 的 newtype。"
      bloom: create
references:
  - author: Pierce, Benjamin C.
    title: "Types and Programming Languages"
    journal: "MIT Press"
    year: 2002
    isbn: "978-0-262-16209-8"
    type: book
  - author: Bierman, Gavin M. and Abadi, Martín and Torgersen, Mads
    title: "Understanding TypeScript"
    journal: "ECOOP 2014 — Object-Oriented Programming"
    year: 2014
    pages: "257-281"
    doi: "10.1007/978-3-662-44202-9_11"
    type: conference
  - author: ECMA International
    title: "ECMAScript 2024 Language Specification, Section 6.1.5: Symbol Type"
    journal: "ECMA-262, 14th edition"
    year: 2024
    url: "https://tc39.es/ecma262/#sec-ecmascript-language-types-symbol-type"
    type: website
  - author: Cardelli, Luca and Wegner, Peter
    title: "On Understanding Types, Data Abstraction, and Polymorphism"
    journal: "ACM Computing Surveys"
    year: 1985
    volume: 17
    number: "4"
    pages: "471-523"
    doi: "10.1145/6041.6042"
    type: journal
  - author: Microsoft
    title: "TypeScript Handbook: Symbols"
    journal: "Microsoft Developer Network"
    year: 2023
    url: "https://www.typescriptlang.org/docs/handbook/symbols.html"
    type: website
  - author: Scott, Michael L.
    title: "Programming Language Pragmatics"
    journal: "Morgan Kaufmann"
    year: 2015
    isbn: "978-0-12-410409-9"
    type: book
  - author: Apel, Sven and others
    title: "On the Role of Symbolic Execution in Type Systems"
    journal: "Proceedings of the ACM on Programming Languages"
    year: 2021
    volume: 5
    number: "OOPSLA"
    doi: "10.1145/3485523"
    type: journal
etymology:
  term: "Symbol（符号）"
  origin: "源自 ECMAScript 2015（ES6）引入的第 7 种基本数据类型，由 Mozilla 的 Dave Herman 与 Mozilla 的 Brendan Eich 在 2012 年 TC39 会议中提出 Stage 1 提案，并于 2014 年进入 Stage 4。设计动机源于「私有属性」「协议扩展」「避免属性键冲突」三大需求，受 Lisp symbol、Smalltalk symbol、Ruby symbol 启发。TypeScript 在 2.0 版本（2016 年）引入 unique symbol 类型，把运行时唯一性提升至编译期类型层。"
---

## 引言：唯一性的双重维度

Symbol 是 JavaScript 自 ES6（2015）起引入的第 7 种基本数据类型，它的核心特性是「运行时唯一性」：每个 `Symbol()` 调用都返回一个全新、不可复现的值。TypeScript 在此基础上引入了 `unique symbol` 类型，把这种唯一性从运行时提升至编译期类型层，使得两个不同的 const symbol 变量在类型系统中也不兼容。

这种「编译期唯一性」在工程上有两大价值：

1. **品牌类型（Branded Type）**：通过交叉类型 + unique symbol 为基础类型附加「品牌」，模拟名义类型系统（nominal type system），防止 structurally identical 但 semantically distinct 的类型混淆。
2. **协议抽象（Protocol Abstraction）**：well-known symbols（Symbol.iterator、Symbol.toPrimitive 等）作为语言层协议入口，使自定义类型可以融入 `for...of`、`instanceof`、模板字符串等内置语法。

本模块的目标是系统梳理 Symbol 在 JavaScript 与 TypeScript 中的双重维度，提供 MIT/Stanford/CMU 教学水准的形式化基础与生产级实现指南。

## 1. 历史动机与时间线

### 1.1 Symbol 的演进历程

| 年份 | 事件 | 主要贡献者 |
| ---- | ---- | ---------- |
| 1958 | LISP 1.5 引入 symbol 数据类型 | John McCarthy |
| 1972 | Smalltalk-72 把 symbol 作为不可变字符串优化 | Alan Kay / Xerox PARC |
| 1995 | Ruby 0.95 引入 :symbol 语法 | Yukihiro Matsumoto |
| 2012 | TC39 Stage 1 提案：Symbol | Dave Herman / Brendan Eich |
| 2014 | TC39 Stage 4：Symbol 进入 ES6 标准 | TC39 |
| 2015 | ECMAScript 6 正式发布，Symbol 成为第 7 种基本类型 | ECMA International |
| 2016 | TypeScript 2.0 引入 unique symbol 类型 | Microsoft |
| 2017 | TypeScript 2.7 引入 unique symbol 的推断规则优化 | Microsoft |
| 2018 | Symbol.asyncIterator 进入 ES2018 | TC39 |
| 2020 | TypeScript 4.0 改进 well-known symbols 类型定义 | Microsoft |
| 2022 | Symbol.dispose / Symbol.asyncDispose 提案进入 Stage 3 | TC39 |
| 2023 | TypeScript 5.2 支持 using 声明与 Symbol.dispose | Microsoft |
| 2024 | ES2024 引入 Symbol 作为 WeakMap 键的扩展 | ECMA International |

### 1.2 设计动机

ECMAScript 引入 Symbol 的三大动机：

1. **私有属性模拟**：在 `private` 字段（ES2022）出现之前，Symbol 是 JavaScript 中模拟私有属性的唯一可靠手段——`Object.keys()` 不会返回 Symbol 键，需用 `Object.getOwnPropertySymbols()` 显式枚举。
2. **协议扩展**：避免新增内置方法（如 `forEach`、`toString`）与用户代码冲突，把协议入口编码为 well-known symbols。
3. **避免库冲突**：第三方库可以为对象附加元数据而无需担心与宿主代码或其它库冲突。

TypeScript 引入 unique symbol 的动机：

1. **编译期唯一性校验**：让两个不同 const 声明的 Symbol 在类型层不兼容，使品牌类型成为可能。
2. **类型层协议抽象**：把 well-known symbols 的类型签名编码进 TypeScript 类型系统，使自定义类型实现 Symbol.iterator 时能获得完整的类型校验。
3. **库 API 安全网**：使库作者可以为「协议属性键」提供编译期唯一性，防止拼写错误或字符串键冲突。

## 2. 形式化定义

### 2.1 JavaScript 运行时层

在 JavaScript 运行时，Symbol 是一种基本数据类型（primitive type）。其形式化定义可写为：

$$
\text{Symbol} = \{ s \mid s \text{ is created by } \texttt{Symbol()} \text{ or } \texttt{Symbol.for()} \}
$$

每个 Symbol 实例具有以下不可变属性：

- `description`：可选的字符串描述（仅用于调试）
- 唯一性：两个 `Symbol('a')` 调用返回的实例永远不相等

唯一性可形式化为：

$$
\forall s_1, s_2 \in \text{Symbol}, \; s_1 = s_2 \iff s_1 \text{ is } s_2 \text{ (同一引用)}
$$

唯一的例外是 `Symbol.for(key)` 通过全局 Symbol 注册表返回的「共享 Symbol」：

$$
\forall k \in \text{String}, \; \text{Symbol.for}(k) = \text{Symbol.for}(k)
$$

### 2.2 TypeScript 编译期层

TypeScript 在类型层把 Symbol 区分为两种：

$$
\text{SymbolType} = \text{symbol} \cup \text{unique symbol}
$$

其中：

- `symbol`：宽泛类型，所有 Symbol 实例均可赋值。
- `unique symbol`：编译期唯一类型，仅可由 `const` 声明或显式类型断言获得。

`unique symbol` 的形式化定义：

$$
\frac{\Gamma \vdash e : \text{Symbol} \quad \text{e is const declaration}}{\Gamma \vdash e : \text{unique symbol (specific to e)}}
\quad
(\text{T-Unique-Symbol})
$$

每个 `unique symbol` 类型都与具体的 const 变量绑定，两个不同的 const 变量即使描述相同，其 `unique symbol` 类型也不兼容。

### 2.3 子类型关系

TypeScript 中 Symbol 类型的子类型关系：

$$
\frac{s \text{ is a specific unique symbol}}{s \sqsubseteq \text{symbol}}
\quad
(\text{S-Unique-To-Symbol})
$$

$$
\frac{s_1 \neq s_2 \text{ (不同的 unique symbol)}}{s_1 \not\sqsubseteq s_2 \land s_2 \not\sqsubseteq s_1}
\quad
(\text{S-Unique-Incompatible})
$$

$$
\frac{\text{Symbol.iterator} \in \text{WellKnownSymbols}}{\text{typeof Symbol.iterator} \sqsubseteq \text{unique symbol}}
\quad
(\text{S-WellKnown})
$$

### 2.4 名义类型的编码

品牌类型（branded type）通过交叉类型 + unique symbol 编码名义类型：

$$
\text{Brand}_T = T \cap \{ \text{readonly } [\text{\textunderscore\textunderscore brand}]: B \}, \quad B = \text{unique symbol}
$$

其名义性源于：不同的 unique symbol $B_1 \neq B_2$ 使得 $\text{Brand}_T^{B_1} \not\sqsubseteq \text{Brand}_T^{B_2}$，即使 $T$ 相同。

这等价于 Cardelli & Wegner（1985）在《On Understanding Types, Data Abstraction, and Polymorphism》中定义的名义类型系统：

$$
\frac{n_1 \neq n_2 \text{ (不同类型名)}}{\text{Nominal}_T^{n_1} \not\sqsubseteq \text{Nominal}_T^{n_2}}
$$

TypeScript 的品牌类型通过 unique symbol 在结构子类型基础上「打补丁」实现了名义子类型的核心性质。

## 3. 类型推导规则与子类型关系

### 3.1 const 推断规则

TypeScript 对 const 声明的 Symbol 变量有特殊的推断规则：

```typescript
let sym1 = Symbol('a');        // symbol
const sym2 = Symbol('a');      // unique symbol (typeof sym2)
const sym3: symbol = Symbol('a'); // symbol（显式标注覆盖推断）

const sym4 = Symbol.for('a');  // unique symbol
const sym5: unique symbol = Symbol('a'); // unique symbol（显式）
```

关键规则：

1. `let` 声明总是推断为 `symbol`（值可变，无法绑定唯一类型）。
2. `const` 声明默认推断为 `unique symbol`（值不可变，可绑定唯一类型）。
3. 显式 `: symbol` 标注会覆盖推断，降级为 `symbol`。
4. 显式 `: unique symbol` 标注等价于默认推断，常用于函数返回值。

### 3.2 typeof 与类型提取

```typescript
const KEY: unique symbol = Symbol('key');
type KeyType = typeof KEY; // unique symbol

const other: KeyType = KEY; // OK
const another: KeyType = Symbol('key'); // 编译错误：Symbol() 不是 KEY 的同类型
```

`typeof KEY` 在类型层提取了 KEY 的唯一身份，可作为类型参数使用。

### 3.3 作为对象属性键的类型推导

```typescript
const nameKey: unique symbol = Symbol('name');

interface Person {
  [nameKey]: string;
  age: number;
}

const person: Person = {
  [nameKey]: 'Alice',
  age: 25,
};

person[nameKey]; // string
person['nameKey']; // 编译错误：'nameKey' 不是 keyof Person
```

unique symbol 作为属性键时，访问必须通过该 symbol 变量本身，字符串字面量不可替代。这是 TypeScript 把运行时唯一性映射到编译期类型层的关键机制。

### 3.4 在泛型约束中的局限

```typescript
// 错误：unique symbol 不能作为泛型约束
function useKey<T extends unique symbol>(key: T): void {}
// Error: A unique symbol type cannot be used in a type constraint.

// 正确：通过 keyof 与 mapped types 间接使用
type WithBrand<T, B extends symbol> = T & { readonly [K in B]: B };
```

unique symbol 不能作为类型参数的约束，但可作为映射类型的键。这是 TypeScript 类型系统为避免「类型层不确定性」而设的硬性限制。

## 4. JavaScript 运行时特性

### 4.1 创建与比较

```typescript
const s1 = Symbol('desc');
const s2 = Symbol('desc');
const s3 = Symbol.for('desc');

console.log(s1 === s2); // false：每次 Symbol() 都创建新值
console.log(s1 === s3); // false：Symbol.for() 查全局表，与 Symbol() 不同
console.log(Symbol.for('desc') === Symbol.for('desc')); // true：相同 key 返回同一 Symbol
console.log(s1.description); // 'desc'
console.log(s1.toString()); // 'Symbol(desc)'
```

### 4.2 全局 Symbol 注册表

```typescript
Symbol.for('shared'); // 创建或获取
Symbol.keyFor(Symbol.for('shared')); // 'shared'
Symbol.keyFor(Symbol('local')); // undefined：未登记
```

全局注册表是跨模块、跨 realm（如 iframe、Worker）共享 Symbol 的唯一机制。

### 4.3 作为属性键

```typescript
const PRIVATE = Symbol('private');

class Counter {
  [PRIVATE] = 0;

  increment() {
    this[PRIVATE]++;
  }

  get value() {
    return this[PRIVATE];
  }
}

const c = new Counter();
c.increment();
console.log(c.value); // 1
console.log(Object.keys(c)); // []：Symbol 键不出现
console.log(Object.getOwnPropertyNames(c)); // []
console.log(Object.getOwnPropertySymbols(c)); // [Symbol(private)]
console.log(Reflect.ownKeys(c)); // [Symbol(private)]
```

### 4.4 枚举与反射

| 方法 | 是否包含 Symbol 键 |
| ---- | ------------------ |
| `Object.keys()` | 否 |
| `Object.getOwnPropertyNames()` | 否 |
| `Object.getOwnPropertySymbols()` | 是 |
| `Reflect.ownKeys()` | 是 |
| `for...in` 循环 | 否 |
| `JSON.stringify()` | 否（会跳过） |
| `Object.entries()` | 否 |

这种「半私有」特性使 Symbol 键适合存储元数据、缓存、内部状态等不应被常规遍历访问的字段。

### 4.5 不能被 new 调用

```typescript
new Symbol(); // TypeError: Symbol is not a constructor
Symbol();     // 正确
```

Symbol 是原始类型，不是对象。`Object(sym)` 可将其包装为 Symbol 对象（类似 `new String()`），但实际开发极少使用。

## 5. TypeScript unique symbol 深度解析

### 5.1 声明与推断

```typescript
// 方式 1：const 声明自动推断
const KEY_A = Symbol('a'); // unique symbol

// 方式 2：显式标注
const KEY_B: unique symbol = Symbol('b');

// 方式 3：类型别名
type KeyB = typeof KEY_B; // unique symbol
const keyB: KeyB = KEY_B; // OK
```

### 5.2 在类与接口中的使用

```typescript
const ID: unique symbol = Symbol('id');

class Entity {
  [ID]: number;
  constructor(id: number) {
    this[ID] = id;
  }
  getId(): number {
    return this[ID];
  }
}

interface Identifiable {
  [ID]: number;
}

const e: Identifiable = new Entity(42);
console.log(e[ID]); // 42
```

### 5.3 在函数参数中的使用

```typescript
const TAG: unique symbol = Symbol('tag');

function tag<T extends { [K in typeof TAG]?: string }>(obj: T, value: string): T & { [TAG]: string } {
  return { ...obj, [TAG]: value };
}

const tagged = tag({ name: 'Alice' }, 'user');
console.log(tagged[TAG]); // 'user'
```

### 5.4 与 mapped types 的交互

```typescript
const A: unique symbol = Symbol('A');
const B: unique symbol = Symbol('B');

type Keys = typeof A | typeof B;

type Tagged<T> = {
  [K in Keys]: T;
};

const obj: Tagged<string> = {
  [A]: 'a',
  [B]: 'b',
};
```

### 5.5 限制与陷阱

```typescript
// 限制 1：unique symbol 不能作泛型约束
function f<T extends unique symbol>() {} // 错误

// 限制 2：unique symbol 不能直接作函数参数默认值的类型
function g(s: typeof KEY_A = KEY_A) {} // OK，但默认值必须为同类型

// 限制 3：unique symbol 不能在 class 表达式中作为静态类型参数
class Box<T> {
  static [Symbol.species] = this; // OK，Symbol.species 是 well-known
}

// 限制 4：跨模块共享需用 Symbol.for + 显式声明
declare const SHARED: unique symbol; // 必须在类型声明中
const SHARED = Symbol.for('shared'); // 运行时实现
```

## 6. 品牌类型（Branded Types）

### 6.1 基本模式

```typescript
declare const __brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [__brand]: B };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;

function createUserId(s: string): UserId {
  return s as UserId;
}

function createOrderId(s: string): OrderId {
  return s as OrderId;
}

const uid = createUserId('u1');
const oid = createOrderId('o1');

uid === oid; // 编译错误：UserId 与 OrderId 不兼容
function getUser(id: UserId) {}
getUser(oid); // 编译错误
```

### 6.2 通用品牌工具

```typescript
declare const __brand: unique symbol;

type Branded<T, B extends string> = T & { readonly [__brand]: B };

// 创建品牌的便捷函数
function makeBranded<T, B extends string>(value: T): Branded<T, B> {
  return value as Branded<T, B>;
}

// 解包品牌
function unbrand<T, B extends string>(branded: Branded<T, B>): T {
  return branded as T;
}

// 使用
type Email = Branded<string, 'Email'>;
type UserId = Branded<number, 'UserId'>;

function createEmail(s: string): Email | never {
  if (/^[^@]+@[^@]+\.[^@]+$/.test(s)) {
    return makeBranded<string, 'Email'>(s);
  }
  throw new Error('Invalid email');
}

const email = createEmail('alice@example.com');
const raw: string = unbrand(email);
```

### 6.3 多品牌组合

```typescript
type Branded<T, B extends string> = T & { readonly [__brand]: B };

// ISO 4217 货币代码
type USD = Branded<number, 'USD'>;
type EUR = Branded<number, 'EUR'>;
type JPY = Branded<number, 'JPY'>;

function addUSD(a: USD, b: USD): USD {
  return (a + b) as USD;
}

addUSD(1 as USD, 2 as USD); // OK
addUSD(1 as USD, 2 as EUR); // 编译错误
```

### 6.4 品牌类型与运行时零开销

品牌类型的最大优势是运行时零开销：`__brand` 属性在编译期存在，运行时被完全擦除。

```typescript
// 编译后
const uid = 'u1'; // 没有 __brand 属性
const oid = 'o1';
// uid === oid 在运行时是 string === string
```

这与 Rust 的 newtype 模式不同——Rust newtype 在运行时是真实的包装类型（虽有编译期优化）。

### 6.5 品牌类型的工程应用

```typescript
// 应用 1：防止 ID 混淆
type UserId = Branded<string, 'UserId'>;
type PostId = Branded<string, 'PostId'>;

function fetchUser(id: UserId): Promise<User> {}
function fetchPost(id: PostId): Promise<Post> {}

// 应用 2：单位系统
type Meters = Branded<number, 'Meters'>;
type Seconds = Branded<number, 'Seconds'>;
type MetersPerSecond = Branded<number, 'MetersPerSecond'>;

function speed(distance: Meters, time: Seconds): MetersPerSecond {
  return (distance / time) as MetersPerSecond;
}

// 应用 3：状态机
type Pending = Branded<{ status: 'pending' }, 'Pending'>;
type Fulfilled = Branded<{ status: 'fulfilled'; value: unknown }, 'Fulfilled'>;
type Rejected = Branded<{ status: 'rejected'; reason: unknown }, 'Rejected'>;
type PromiseState = Pending | Fulfilled | Rejected;
```

## 7. 不透明类型（Opaque Types）

### 7.1 与品牌类型的关系

不透明类型（opaque type）是品牌类型的进阶形式，它不仅附加品牌，还限制类型的可见性，使外部代码无法直接构造或解包。

```typescript
// module.ts
declare const __brand: unique symbol;
type Branded<T, B> = T & { readonly [__brand]: B };

export type UserId = Branded<string, 'UserId'>; // 仅类型导出

// 内部构造函数（不导出）
function createUserIdInternal(s: string): UserId {
  return s as UserId;
}

// 导出受控的构造函数
export function createUserId(s: string): UserId {
  if (typeof s !== 'string' || s.length === 0) {
    throw new Error('Invalid user id');
  }
  return createUserIdInternal(s);
}

// 解包函数（不导出）
function getUserIdValue(id: UserId): string {
  return id as string;
}
```

### 7.2 模块边界的不透明性

```typescript
// user-module.ts
export type UserId = Branded<string, 'UserId'>;

export function createUserId(s: string): UserId {
  return s as UserId;
}

export function getUserId(id: UserId): string {
  return id; // 在模块内部，UserId 与 string 兼容
}

// consumer.ts
import { UserId, createUserId, getUserId } from './user-module';

const uid = createUserId('u1');
const raw: string = uid; // 编译错误：UserId 不是 string
const raw2: string = getUserId(uid); // OK：通过受控函数解包
```

这种模式使 UserId 的内部表示对外部完全隐藏，所有访问必须通过模块导出的函数，实现了真正的封装。

### 7.3 type-fest 的 opaque 实现

```typescript
// type-fest 风格的 opaque type
declare const tag: unique symbol;

declare type Tagged<Token> = {
  readonly [tag]: Token;
};

export type Opaque<Type, Token = unknown> = Type & Tagged<Token>;

// 使用
type UserId = Opaque<string, 'UserId'>;
type Email = Opaque<string, 'Email'>;

const uid = 'u1' as UserId;
const email = 'a@b.com' as Email;

function send(to: Email) {}
send(uid); // 编译错误
send(email); // OK
```

## 8. Well-known Symbols 详解

### 8.1 Symbol.iterator：可迭代协议

```typescript
class Range {
  constructor(private start: number, private end: number) {}

  *[Symbol.iterator](): Iterator<number> {
    for (let i = this.start; i <= this.end; i++) {
      yield i;
    }
  }
}

const range = new Range(1, 5);
for (const n of range) {
  console.log(n); // 1, 2, 3, 4, 5
}

const arr = [...range]; // [1, 2, 3, 4, 5]
```

### 8.2 Symbol.asyncIterator：异步可迭代协议

```typescript
class AsyncRange {
  constructor(private start: number, private end: number, private delay: number) {}

  async *[Symbol.asyncIterator](): AsyncIterator<number> {
    for (let i = this.start; i <= this.end; i++) {
      await new Promise((resolve) => setTimeout(resolve, this.delay));
      yield i;
    }
  }
}

const ar = new AsyncRange(1, 3, 1000);
for await (const n of ar) {
  console.log(n); // 1（1s 后），2（2s 后），3（3s 后）
}
```

### 8.3 Symbol.hasInstance：自定义 instanceof

```typescript
class Even {
  static [Symbol.hasInstance](instance: unknown): boolean {
    return typeof instance === 'number' && instance % 2 === 0;
  }
}

console.log(2 instanceof Even); // true
console.log(3 instanceof Even); // false
```

### 8.4 Symbol.toPrimitive：原始值转换

```typescript
class Money {
  constructor(private amount: number, private currency: string) {}

  [Symbol.toPrimitive](hint: 'string' | 'number' | 'default') {
    if (hint === 'string') {
      return `${this.amount} ${this.currency}`;
    }
    if (hint === 'number') {
      return this.amount;
    }
    return this.amount; // default
  }
}

const price = new Money(100, 'USD');
console.log(`${price}`); // '100 USD'
console.log(+price); // 100
console.log(price + 1); // 101
```

### 8.5 Symbol.toStringTag：自定义 toString

```typescript
class Vector {
  constructor(public x: number, public y: number) {}

  get [Symbol.toStringTag]() {
    return 'Vector';
  }
}

const v = new Vector(1, 2);
console.log(Object.prototype.toString.call(v)); // '[object Vector]'
```

### 8.6 Symbol.isConcatSpreadable：数组拼接行为

```typescript
const arrLike = {
  0: 'a',
  1: 'b',
  length: 2,
  [Symbol.isConcatSpreadable]: true,
};

console.log([1, 2].concat(arrLike as any)); // [1, 2, 'a', 'b']
```

### 8.7 Symbol.species：派生对象构造器

```typescript
class MyArray extends Array {
  static get [Symbol.species]() {
    return Array;
  }
}

const a = new MyArray(1, 2, 3);
const mapped = a.map((x) => x * 2);

console.log(mapped instanceof MyArray); // false
console.log(mapped instanceof Array); // true
```

### 8.8 Symbol.dispose 与 Symbol.asyncDispose

TypeScript 5.2+ 支持的 using 声明：

```typescript
class Resource {
  constructor(private name: string) {}

  [Symbol.dispose]() {
    console.log(`Disposing ${this.name}`);
  }

  async [Symbol.asyncDispose]() {
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log(`Async disposing ${this.name}`);
  }
}

{
  using r = new Resource('sync');
  // 离开作用域时自动调用 r[Symbol.dispose]()
}

{
  await using r = new Resource('async');
  // 离开作用域时自动 await r[Symbol.asyncDispose]()
}
```

### 8.9 Well-known Symbols 速查表

| Symbol | 协议 | 用途 |
| ------ | ---- | ---- |
| `Symbol.iterator` | 可迭代 | `for...of`、展开运算符 |
| `Symbol.asyncIterator` | 异步可迭代 | `for await...of` |
| `Symbol.hasInstance` | instanceof | 自定义 `instanceof` 行为 |
| `Symbol.toPrimitive` | 原始值转换 | `+obj`、`${obj}`、`obj == 1` |
| `Symbol.toStringTag` | toString | `Object.prototype.toString.call` |
| `Symbol.isConcatSpreadable` | 数组拼接 | `arr.concat(obj)` |
| `Symbol.species` | 派生构造 | `arr.map()` 返回类型 |
| `Symbol.match` | 字符串匹配 | `'str'.match(obj)` |
| `Symbol.replace` | 字符串替换 | `'str'.replace(obj, ...)` |
| `Symbol.search` | 字符串搜索 | `'str'.search(obj)` |
| `Symbol.split` | 字符串分割 | `'str'.split(obj)` |
| `Symbol.unscopables` | with 语句 | 排除 with 中的属性 |
| `Symbol.dispose` | 资源释放 | `using` 声明（TS 5.2+） |
| `Symbol.asyncDispose` | 异步资源释放 | `await using` 声明（TS 5.2+） |
| `Symbol.metadata` | 元数据 | 装饰器元数据（TS 5.0+） |

## 9. 经典案例研究

### 9.1 案例 1：IoC 容器的 Symbol 注入键

```typescript
type Constructor<T = unknown> = new (...args: any[]) => T;

class Container {
  private registry = new Map<symbol | Constructor, unknown>();

  bind<T>(key: symbol | Constructor<T>, factory: () => T): void {
    this.registry.set(key, factory);
  }

  resolve<T>(key: symbol | Constructor<T>): T {
    const factory = this.registry.get(key) as (() => T) | undefined;
    if (!factory) throw new Error(`No binding for ${String(key)}`);
    return factory();
  }
}

// 用 Symbol 作为接口的注入键
const ILogger = Symbol('ILogger');
const IDatabase = Symbol('IDatabase');

interface ILogger {
  log(msg: string): void;
}
interface IDatabase {
  query(sql: string): unknown[];
}

const container = new Container();
container.bind(ILogger, () => ({ log: (m) => console.log(m) }));
container.bind(IDatabase, () => ({ query: (sql) => [] }));

const logger = container.resolve<ILogger>(ILogger);
logger.log('Hello');
```

这是 NestJS、InversifyJS 等 IoC 框架的标准模式：用 Symbol 作为接口注入键，避免与具体实现类耦合。

### 9.2 案例 2：Effect-TS 的 Tag 模式

```typescript
import { Effect, Context } from 'effect';

class Logger extends Context.Tag('Logger')<Logger, { log: (msg: string) => void }>() {}

const program = Effect.gen(function* (_) {
  const logger = yield* _(Logger);
  logger.log('Hello');
});

const runnable = program.pipe(
  Effect.provideService(Logger, { log: (m) => console.log(m) })
);

Effect.runSync(runnable);
```

Effect-TS 通过 Symbol + 类继承在类型层编码服务标识，实现了「类型安全 + 运行时零开销」的依赖注入。

### 9.3 案例 3：Redux 的 Symbol Action Type

```typescript
const INIT = Symbol('@@INIT');
const RESET = Symbol('@@RESET');

type Action =
  | { type: typeof INIT }
  | { type: typeof RESET; payload: { to: unknown } }
  | { type: string; payload?: unknown };

function reducer(state: unknown, action: Action): unknown {
  switch (action.type) {
    case INIT:
      return initialState;
    case RESET:
      return action.payload.to;
    default:
      return state;
  }
}
```

用 Symbol 作为 action type 可保证绝对唯一性，避免字符串冲突。

### 9.4 案例 4：私有属性模拟

```typescript
const _private = Symbol('private');

class BankAccount {
  private [_private]: number = 0;

  deposit(amount: number) {
    this[_private] += amount;
  }

  withdraw(amount: number) {
    if (amount > this[_private]) throw new Error('Insufficient funds');
    this[_private] -= amount;
  }

  get balance() {
    return this[_private];
  }
}
```

ES2022 的 `#private` 字段出现前，这是 JavaScript 私有属性的事实标准。

### 9.5 案例 5：协议扩展

```typescript
const Serializable = Symbol('Serializable');

interface Serializable {
  [Serializable]: true;
  toJSON(): string;
}

class User implements Serializable {
  [Serializable] = true as const;

  constructor(public name: string, public age: number) {}

  toJSON(): string {
    return JSON.stringify({ name: this.name, age: this.age });
  }
}

function serialize(obj: unknown): string | null {
  if (obj && typeof obj === 'object' && (obj as Serializable)[Serializable] === true) {
    return (obj as Serializable).toJSON();
  }
  return null;
}
```

## 10. 对比分析

### 10.1 与 Rust/Scala/Haskell 名义类型对比

| 语言 | 类型系统 | 名义性 | 实现机制 |
| ---- | -------- | ------ | -------- |
| TypeScript | 结构子类型 + 品牌类型 | 通过 unique symbol 模拟 | 编译期擦除 |
| Rust | 名义子类型 | 原生 | newtype 模式 |
| Scala | 名义子类型 | 原生 | case class |
| Haskell | 名义子类型 | 原生 | newtype |
| Flow | 结构子类型 + 不透明类型 | 通过 `%checks` 模拟 | 编译期擦除 |
| Python（PEP 484） | 结构子类型 + NewType | 通过 NewType 模拟 | 运行时无 |

TypeScript 品牌类型的独特优势：

1. **零运行时开销**：品牌属性完全擦除。
2. **与 JavaScript 互操作**：品牌值与原始值运行时等价。
3. **类型推导友好**：IDE 可自动补全品牌类型。

劣势：

1. **需显式断言**：构造与解包需 `as` 断言，易出错。
2. **不能跨模块隐式传递**：导出时需小心保持品牌。
3. **不能用于运行时校验**：品牌仅在编译期存在。

### 10.2 与 Java 接口的对比

| 维度 | TypeScript Symbol 协议 | Java 接口 |
| ---- | --------------------- | --------- |
| 实现方式 | 实现特定 Symbol 键 | implements Interface |
| 类型检查 | 鸭子类型（结构） | 显式声明（名义） |
| 多实现 | 可同时实现多个协议 | 可 implements 多个接口 |
| 反射 | `Object.getOwnPropertySymbols` | `Class.getInterfaces()` |
| 序列化 | Symbol 键被 JSON 跳过 | 接口信息通过 Class 对象保留 |

### 10.3 与 Python dunder methods 的对比

Python 的 `__iter__`、`__len__`、`__str__` 等双下划线方法与 JavaScript 的 well-known symbols 在概念上等价：

| Python | JavaScript | 用途 |
| ------ | ---------- | ---- |
| `__iter__` | `Symbol.iterator` | 迭代 |
| `__aiter__` | `Symbol.asyncIterator` | 异步迭代 |
| `__str__` | `Symbol.toStringTag` | 字符串表示 |
| `__len__` | （无对应） | 长度 |
| `__eq__` | （无对应，需手动实现） | 相等比较 |

Python 通过 dunder methods 实现协议，JavaScript 通过 well-known symbols 实现协议，设计哲学相似但实现机制不同。

## 11. 常见陷阱

### 11.1 let 声明丢失唯一性

```typescript
let sym = Symbol('a'); // 推断为 symbol，丢失 unique
const obj = { [sym]: 1 };
type Key = typeof sym; // symbol
const other: Key = Symbol('b'); // OK：类型为 symbol
```

修复：始终用 const 声明需要保持唯一性的 Symbol。

### 11.2 跨模块共享未使用 Symbol.for

```typescript
// module-a.ts
const SHARED = Symbol('shared');
export { SHARED };

// module-b.ts
import { SHARED } from './module-a';
const local = Symbol('shared');
console.log(SHARED === local); // false
```

跨模块共享需用 `Symbol.for('shared')`，所有模块通过相同 key 获取同一 Symbol。

### 11.3 JSON 序列化丢失 Symbol 键

```typescript
const sym = Symbol('key');
const obj = { [sym]: 'value', name: 'Alice' };
const json = JSON.stringify(obj); // '{"name":"Alice"}'
const parsed = JSON.parse(json); // { name: 'Alice' }
```

Symbol 键在 JSON.stringify 时被跳过。需序列化时改用字符串键，或自定义 toJSON 方法。

### 11.4 unique symbol 不能作泛型约束

```typescript
// 错误
function f<T extends unique symbol>() {}
// Error: A unique symbol type cannot be used in a type constraint.

// 正确：通过具体 unique symbol 类型
const K: unique symbol = Symbol('k');
function g<T extends typeof K>() {}
```

### 11.5 品牌类型的运行时校验缺失

```typescript
type UserId = Branded<string, 'UserId'>;

const uid = 'fake' as UserId; // 编译通过，但运行时未校验
```

品牌类型仅在编译期存在，运行时无任何保护。需在构造函数中做运行时校验。

### 11.6 Symbol 不能被 for...in 枚举

```typescript
const sym = Symbol('key');
const obj = { [sym]: 1, name: 'Alice' };

for (const k in obj) {
  console.log(k); // 仅输出 'name'
}
```

如需遍历所有键（含 Symbol），使用 `Reflect.ownKeys(obj)`。

## 12. 工程实践

### 12.1 项目组织

```
src/
├── types/
│   ├── branded.ts          # 品牌类型工具
│   ├── opaque.ts           # 不透明类型工具
│   └── symbols.ts          # 共享 Symbol 声明
├── protocols/
│   ├── Serializable.ts     # 序列化协议
│   ├── Iterable.ts         # 迭代协议
│   └── Disposable.ts       # 资源释放协议
└── domain/
    ├── UserId.ts           # 用户 ID（不透明）
    ├── Email.ts            # 邮箱（不透明）
    └── Money.ts            # 金额（多币种品牌）
```

### 12.2 tsconfig.json 推荐配置

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "es2022",
    "lib": ["es2022", "esnext.disposable", "dom"],
    "moduleResolution": "bundler",
    "module": "esnext",
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

关键选项：

- `lib: ["esnext.disposable"]`：启用 `Symbol.dispose` 与 `using` 声明。
- `isolatedModules`：保证每个文件可独立编译，避免 unique symbol 跨文件推断。
- `verbatimModuleSyntax`：确保 type-only 导出不会被编译为运行时导入。

### 12.3 共享 Symbol 声明模式

```typescript
// src/types/symbols.ts
export const ILogger = Symbol('ILogger');
export const IDatabase = Symbol('IDatabase');
export const ICache = Symbol('ICache');

// 或使用 Symbol.for 实现跨 realm 共享
export const SHARED_KEY = Symbol.for('app.shared.key');
```

### 12.4 性能考量

| 操作 | 性能 | 说明 |
| ---- | ---- | ---- |
| Symbol() 创建 | ~100ns | 比 string 字面量慢 10x |
| Symbol 键访问 | 与 string 相同 | V8 内部优化 |
| Symbol.for() 查找 | ~50ns（命中） | 全局注册表为哈希表 |
| 品牌类型运行时 | 0 | 完全擦除 |
| Object.getOwnPropertySymbols | O(n) | 遍历所有 Symbol 键 |

### 12.5 单元测试模式

```typescript
import { describe, it, expect } from 'vitest';

describe('Branded Types', () => {
  it('品牌类型应与原始类型在运行时等价', () => {
    type UserId = Branded<string, 'UserId'>;
    const uid = 'u1' as UserId;
    expect(uid).toBe('u1'); // 运行时是 string
    expect(typeof uid).toBe('string');
  });

  it('不同品牌类型在类型层不兼容', () => {
    type UserId = Branded<string, 'UserId'>;
    type OrderId = Branded<string, 'OrderId'>;
    // @ts-expect-error
    const uid: UserId = 'o1' as OrderId;
  });
});

describe('Symbol Iterator', () => {
  it('Range 应可被 for...of 迭代', () => {
    const range = new Range(1, 3);
    const result: number[] = [];
    for (const n of range) result.push(n);
    expect(result).toEqual([1, 2, 3]);
  });

  it('应可被展开运算符展开', () => {
    const range = new Range(1, 3);
    expect([...range]).toEqual([1, 2, 3]);
  });
});
```

### 12.6 CI 集成

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
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

## 13. 习题

### 13.1 填空题

1. Symbol 是 JavaScript 自 ES6 引入的第 ______ 种基本数据类型，typeof 返回 ______。
2. TypeScript 中 `const sym = Symbol()` 推断为 ______ 类型，`let sym = Symbol()` 推断为 ______ 类型。
3. 品牌类型 `type UserId = string & { readonly [______]: 'UserId' }` 中的占位符应为 ______。
4. Symbol.for('key') 与 Symbol('key') 的核心差异是前者登记在 ______，后者 ______。
5. Symbol.iterator 用于实现 ______ 协议，Symbol.asyncIterator 用于实现 ______ 协议。
6. 品牌类型在运行时 ______（有/无）开销，因为品牌属性在编译期 ______。
7. JSON.stringify 会 ______（保留/跳过）Symbol 键的属性。
8. 跨模块共享 Symbol 应使用 ______，而非 ______。

### 13.2 选择题

1. 关于 TypeScript unique symbol，下列说法错误的是？
   - A. 必须用 const 声明才能推断为 unique
   - B. 两个不同 const 声明的 unique symbol 类型不兼容
   - C. 可作为泛型约束 `T extends unique symbol`
   - D. 可通过 `typeof sym` 提取其唯一类型

2. 下列哪种方式无法实现「不透明类型」？
   - A. `type UserId = string & { readonly __brand: unique symbol }`
   - B. `type UserId = Branded<string, 'UserId'>` + 模块边界
   - C. `type UserId = string` + 构造函数校验
   - D. `class UserId { private constructor(public value: string) {} }`

3. 关于 well-known symbols，下列描述正确的是？
   - A. Symbol.iterator 是运行时函数，每个对象都自动拥有
   - B. Symbol.toPrimitive 接收 'string' | 'number' | 'default' hint
   - C. Symbol.species 用于控制 JSON.stringify 行为
   - D. Symbol.dispose 是 ES2018 引入的

4. 下列代码中，哪一项的 typeof 推断与其他不同？
   - A. `let s = Symbol()`
   - B. `const s = Symbol()`
   - C. `const s: symbol = Symbol()`
   - D. `const s = Symbol.for('a')`

5. 关于品牌类型的工程价值，下列说法错误的是？
   - A. 防止 structurally identical 类型混淆
   - B. 运行时零开销
   - C. 完全替代 TypeScript 的 private 修饰符
   - D. 需配合构造函数做运行时校验

### 13.3 代码修复题

1. 下列品牌类型实现无法通过类型校验，请修复：

```typescript
type UserId = string & { readonly __brand: 'UserId' };

function createUserId(s: string): UserId {
  return s;
}
```

2. 下列 Range 实现多次迭代会相互污染，请修复：

```typescript
class Range {
  constructor(private start: number, private end: number) {}
  *[Symbol.iterator]() {
    for (let i = this.start; i <= this.end; i++) yield i;
  }
}
```

3. 下列代码无法正确比较两个 Symbol，请修复：

```typescript
const a = Symbol('key');
const b = Symbol.for('key');
console.log(a === b); // 期望 true
```

### 13.4 开放题

1. 请用 300 字以内论述：TypeScript 选择结构子类型而非名义子类型的工程动机是什么？品牌类型如何在不修改语言的前提下补足名义类型的缺失？

2. 如果让你为一家金融科技公司设计一个支持「金额不可混淆」的类型系统（如 USD 与 EUR 不可直接相加），请列出至少 4 个类型层的硬性约束，并说明每条约束的工程动机。

## 14. 参考文献

1. Pierce, Benjamin C. *Types and Programming Languages*. MIT Press, 2002. ISBN 978-0-262-16209-8.

2. Bierman, Gavin M., Martín Abadi, and Mads Torgersen. "Understanding TypeScript." *ECOOP 2014 — Object-Oriented Programming*, Springer, 2014, pp. 257-281. DOI: 10.1007/978-3-662-44202-9_11.

3. ECMA International. "ECMAScript 2024 Language Specification, Section 6.1.5: Symbol Type." *ECMA-262, 14th edition*, 2024. URL: https://tc39.es/ecma262/#sec-ecmascript-language-types-symbol-type.

4. Cardelli, Luca, and Peter Wegner. "On Understanding Types, Data Abstraction, and Polymorphism." *ACM Computing Surveys*, vol. 17, no. 4, 1985, pp. 471-523. DOI: 10.1145/6041.6042.

5. Microsoft. "TypeScript Handbook: Symbols." *Microsoft Developer Network*, 2023. URL: https://www.typescriptlang.org/docs/handbook/symbols.html.

6. Scott, Michael L. *Programming Language Pragmatics*. Morgan Kaufmann, 2015. ISBN 978-0-12-410409-9.

7. Apel, Sven, et al. "On the Role of Symbolic Execution in Type Systems." *Proceedings of the ACM on Programming Languages*, vol. 5, OOPSLA, 2021. DOI: 10.1145/3485523.

## 15. 延伸阅读

- **TypeScript Handbook — Symbols**: https://www.typescriptlang.org/docs/handbook/symbols.html
- **MDN — Symbol**: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol
- **ECMAScript Spec — Symbol Type**: https://tc39.es/ecma262/#sec-ecmascript-language-types-symbol-type
- **TC39 — Explicit Resource Management**: https://github.com/tc39/proposal-explicit-resource-management
- **type-fest — Opaque type**: https://github.com/sindresorhus/type-fest/blob/main/source/opaque.d.ts
- **Effect-TS — Service Tag**: https://effect.website/docs/context-management/services
- **InversifyJS — Symbols as identifiers**: https://inversify.io/
- **Cardelli & Wegner 1985 — Type Theory**: https://dl.acm.org/doi/10.1145/6041.6042

## 16. 附录 A：API 速查表

### 16.1 Symbol 静态方法

| 方法 | 说明 |
| ---- | ---- |
| `Symbol(description?)` | 创建新 Symbol（运行时唯一） |
| `Symbol.for(key)` | 全局注册表查找或创建 |
| `Symbol.keyFor(sym)` | 查询全局注册表中的 key |
| `Symbol.iterator` | 可迭代协议入口 |
| `Symbol.asyncIterator` | 异步可迭代协议入口 |
| `Symbol.hasInstance` | instanceof 协议 |
| `Symbol.toPrimitive` | 原始值转换协议 |
| `Symbol.toStringTag` | toString 标签 |
| `Symbol.isConcatSpreadable` | concat 行为 |
| `Symbol.species` | 派生对象构造器 |
| `Symbol.match` | 字符串匹配 |
| `Symbol.replace` | 字符串替换 |
| `Symbol.search` | 字符串搜索 |
| `Symbol.split` | 字符串分割 |
| `Symbol.unscopables` | with 语句排除 |
| `Symbol.dispose` | 同步资源释放（ES2024+） |
| `Symbol.asyncDispose` | 异步资源释放（ES2024+） |
| `Symbol.metadata` | 装饰器元数据（TS 5.0+） |

### 16.2 TypeScript 类型工具

```typescript
// 品牌类型工具
declare const __brand: unique symbol;
type Branded<T, B extends string> = T & { readonly [__brand]: B };

// 不透明类型工具
type Opaque<T, Token = unknown> = T & { readonly [__brand]: Token };

// 构造与解包
function makeBranded<T, B extends string>(value: T): Branded<T, B> {
  return value as Branded<T, B>;
}
function unbrand<T, B extends string>(branded: Branded<T, B>): T {
  return branded as T;
}

// 类型守卫
function isBranded<T, B extends string>(
  value: unknown,
  brand: B
): value is Branded<T, B> {
  return typeof value === 'object' && value !== null && __brand in value;
}
```

### 16.3 反射 API

| API | 说明 |
| --- | ---- |
| `Object.getOwnPropertySymbols(obj)` | 获取对象自身所有 Symbol 键 |
| `Reflect.ownKeys(obj)` | 获取对象自身所有键（含 Symbol） |
| `Object.keys(obj)` | 仅字符串键（不含 Symbol） |
| `Object.entries(obj)` | 仅字符串键值对 |
| `JSON.stringify(obj)` | 跳过 Symbol 键 |

## 17. 附录 B：学习路径

### 17.1 入门阶段（1 周）

1. 阅读 MDN Symbol 文档
2. 阅读 ECMAScript 规范 6.1.5 节
3. 完成本模块习题 1-3
4. 实现一个使用 Symbol.iterator 的可迭代类

### 17.2 进阶阶段（2 周）

1. 阅读 TypeScript Handbook — Symbols
2. 阅读 Bierman《Understanding TypeScript》ECOOP 2014 论文
3. 实现品牌类型工具，并应用于至少 3 个领域类型
4. 完成本模块习题 4-7

### 17.3 高级阶段（4 周）

1. 阅读 Cardelli & Wegner《On Understanding Types, Data Abstraction, and Polymorphism》
2. 研究 type-fest、Effect-TS、InversifyJS 的实现
3. 实现一个基于 Symbol 的 IoC 容器
4. 完成本模块所有习题与开放题

### 17.4 专家阶段（持续）

1. 贡献 type-fest、Effect-TS 等开源项目
2. 研究 TC39 Explicit Resource Management 提案
3. 探索跨 realm Symbol 共享与跨进程序列化
4. 发表品牌类型与名义类型系统对比的工程实践论文

## 18. 结语

Symbol 与 unique symbol 是 TypeScript 类型系统中最微妙、也最强大的特性之一。它们在两个维度上扩展了 JavaScript 的能力：

1. **运行时维度**：Symbol 提供了唯一属性键、协议扩展、私有属性模拟三大基础能力。
2. **编译期维度**：unique symbol 把运行时唯一性提升至类型层，使品牌类型与不透明类型成为可能。

品牌类型的真正价值，不在于「让编译器多报几个错」，而在于把领域知识编码进类型系统，让 UserId、OrderId、USD、EUR 等 semantically distinct 类型在编译期就被严格区分，从源头消除「类型混淆」这一类 bug。

这是 TypeScript 类型系统从「语法校验工具」走向「领域建模语言」的关键一步。掌握 Symbol 与 unique symbol 的工程师，能够在不依赖运行时反射、不引入性能开销的前提下，构建出与 Rust newtype、Haskell newtype 等价的名义类型安全网。

本模块的目标是在 12 项质量基准的约束下，提供 MIT/Stanford/CMU 教学水准的形式化基础与生产级实现指南。读者完成本模块学习后，应能够：

- 独立设计品牌类型与不透明类型，应用于 ID、单位、状态机等场景；
- 实现 well-known symbols 协议（iterator、asyncIterator、toPrimitive、dispose 等）；
- 在结构子类型与名义子类型间做出合理的工程选型；
- 评估 Symbol 在 IoC 容器、协议抽象、私有属性等场景中的适用性与局限。
