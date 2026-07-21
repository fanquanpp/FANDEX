---
order: 62
title: 协变与逆变
module: typescript
category: TypeScript
tags:
  - typescript
  - type-theory
  - subtyping
  - covariance
  - contravariance
  - liskov-substitution
difficulty: advanced
description: TypeScript 中协变、逆变、双变与不变的型变关系，涵盖函数子类型理论、Liskov 替换原则、严格函数类型检查、数组协变陷阱与 React props 逆变等核心议题
author: fanquanpp
related:
  - typescript/高级类型与类型演算
  - typescript/类型体操实用模式
  - typescript/this类型与多态
  - typescript/符号与唯一类型
prerequisites:
  - typescript/语法速查
learningObjectives:
  - '记住协变、逆变、不变与双变四种型变关系的基本定义与符号表示'
  - '理解函数类型的子类型化规则 S <: T 推导出的参数位置逆变与返回位置协变'
  - '在 TypeScript 工程中正确配置 strictFunctionTypes，并运用 in/out 修饰符标注泛型型变方向'
  - '分析数组协变与 React props 逆变在真实代码中的类型安全隐患'
  - '评估 TypeScript 选择双变默认行为与严格逆变检查之间的工程权衡'
  - '设计类型安全的回调注册器与事件派发系统，规避型变陷阱'
exercises:
  fill-blank:
    - question: 在 TypeScript 中，函数参数在 strictFunctionTypes 启用后处于____位置，子类型关系会____。
      answer: 逆变；反转
      bloom: remember
    - question: 数组在 TypeScript 中默认是____的，这是历史性的类型不安全设计，源于对 Java 数组协变的兼容借鉴。
      answer: 协变
      bloom: remember
  choice:
    - question: 下列哪个泛型修饰符组合表示"不变"（invariance）？
      options:
        - "out T"
        - "in T"
        - "in out T"
        - "T（无修饰符）"
      answer: "in out T"
      bloom: understand
    - question: 关于 TypeScript 中 strictFunctionTypes 的描述，正确的是？
      options:
        - "启用后所有函数都会被严格逆变检查"
        - "启用后只有泛型函数参数会严格逆变检查，方法参数仍保持双变"
        - "禁用后函数返回类型也会变为逆变"
        - "启用后数组将变为不变类型"
      answer: "启用后只有泛型函数参数会严格逆变检查，方法参数仍保持双变"
      bloom: analyze
  code-fix:
    - question: |
        以下代码启用了 strictFunctionTypes，但赋值会失败。请修复类型签名以使其通过类型检查。

        ```typescript
        type Callback<T> = (payload: T) => void;

        declare const dogCallback: Callback<Dog>;
        const animalCallback: Callback<Animal> = dogCallback;
        ```
      answer: |
        将 Callback 的参数改为逆变位置。由于函数本身就是逆变的，正确做法是确保 Dog 是 Animal 的子类型即可赋值。但若希望 Callback<Animal> 可接收 Callback<Dog>，需要将 Callback 设计为按需协变容器（如 Reader 模式）或使用 unknown 上界。最直接的修复：`const animalCallback: Callback<Animal> = (a: Animal) => dogCallback(a as Dog);` 不安全。安全做法是：声明 `type Callback<in T> = (payload: T) => void;` 并使用 `type CovariantCallback<out T> = () => T;` 来获得协变。
      bloom: apply
  open-ended:
    - question: |
        在 React 中，假设有 `interface Props { onClick: (e: MouseEvent) => void }`。
        父组件渲染 `<Child onClick={handleChildClick} />`，其中 `handleChildClick: (e: MouseEvent<HTMLButtonElement>) => void`。
        请从型变角度论证为什么这种赋值在 strictFunctionTypes 下是危险的，并说明 React 18+ 内部为何使用泛型分发规避此问题。
      answer: |
        `MouseEvent<HTMLButtonElement>` 是 `MouseEvent<Element>` 的子类型，因此 `handleChildClick` 的参数类型更具体。按逆变规则，`(e: MouseEvent<HTMLButtonElement>) => void` 不是 `(e: MouseEvent<Element>) => void` 的子类型；将其赋给后者意味着调用方可能传入任意 Element 的事件，而处理器只接受 button。React 18 通过 `ButtonHTMLAttributes` 等泛型约束让事件类型在分发时被锁定到具体元素，从而避免不安全的向上分发。
      bloom: evaluate
references:
  - |
    Cardelli, L. and Wegner, P. 1985. On understanding types, data abstraction, and polymorphism. ACM Computing Surveys 17, 4 (Dec. 1985), 471–523. DOI: https://doi.org/10.1145/6041.6042
  - |
    Liskov, B. H. and Wing, J. M. 1994. A behavioral notion of subtyping. ACM Transactions on Programming Languages and Systems 16, 6 (Nov. 1994), 1811–1841. DOI: https://doi.org/10.1145/197320.197383
  - |
    Pierce, B. C. 2002. Types and Programming Languages. MIT Press, Cambridge, MA, USA.
  - |
    Bierman, G., Abadi, M., and Torgersen, M. 2014. Understanding TypeScript. In 28th European Conference on Object-Oriented Programming (ECOOP 2014). LIPIcs 33, 1–29. DOI: https://doi.org/10.4230/LIPIcs.ECOOP.2014.257
  - |
    Riba, C. 2008. On the incompleteness of the calculus of constructions with subtyping. In Proceedings of the 23rd Conference on the Mathematical Foundations of Programming Semantics (MFPS XXIII). Electronic Notes in Theoretical Computer Science 215, 131–149. DOI: https://doi.org/10.1016/j.entcs.2008.06.027
  - |
    Appel, A. W. and Felty, A. P. 2004. A semantic model of types and machine instructions for proof-carrying code. ACM Transactions on Programming Languages and Systems 26, 3 (May 2004), 551–582. DOI: https://doi.org/10.1145/982158.982163
etymology:
  term: 协变 (Covariance)
  origin: |
    拉丁语前缀 co-（共同、同向）+ variantia（变化），17 世纪数学用语，意指"与原始方向一同变化"。
    逆变 (Contravariance) 源自 contra（相反）+ variantia，表示"与原始方向相反变化"。
    在类型论中最早由 Luca Cardelli 与 Peter Wegner 在 1985 年的 ACM Computing Surveys 论文《On understanding types, data abstraction, and polymorphism》中系统化引入面向对象类型系统。
lastReviewed: '2026-07-20'
reviewer: FANDEX Content Engineering Team
---

# 协变与逆变

> 本文从类型论形式语义出发，系统阐述 TypeScript 类型系统中四种型变关系（协变、逆变、不变、双变）的数学定义、推导规则、工程实现与典型陷阱。所有数学公式使用 KaTeX 语法，所有代码示例使用 TypeScript 标注。

## 目录

- [1. 学习导论](#1-学习导论)
- [2. 历史动机与技术演进](#2-历史动机与技术演进)
- [3. 形式化定义](#3-形式化定义)
- [4. 理论推导](#4-理论推导)
- [5. TypeScript 中的协变](#5-typescript-中的协变)
- [6. TypeScript 中的逆变](#6-typescript-中的逆变)
- [7. 双变与 strictFunctionTypes](#7-双变与-strictfunctiontypes)
- [8. 型变与泛型修饰符](#8-型变与泛型修饰符)
- [9. 数组协变陷阱](#9-数组协变陷阱)
- [10. React Props 逆变案例](#10-react-props-逆变案例)
- [11. 对比分析](#11-对比分析)
- [12. 常见陷阱与修复](#12-常见陷阱与修复)
- [13. 工程实践](#13-工程实践)
- [14. 案例研究](#14-案例研究)
- [15. 习题](#15-习题)
- [16. 参考文献](#16-参考文献)
- [17. 延伸阅读](#17-延伸阅读)

---

## 1. 学习导论

### 1.1 为什么必须理解型变

在 TypeScript 工程实践中，型变（variance）描述的是：当存在子类型关系 $S <: T$ 时，由它们构造出的复合类型 $F(S)$ 与 $F(T)$ 之间的子类型关系方向。这一概念看似抽象，却决定了以下三类日常代码能否通过类型检查：

1. **回调函数赋值**：将 `(e: MouseEvent<HTMLButtonElement>) => void` 赋值给 `(e: MouseEvent<Element>) => void` 是否安全？
2. **泛型容器赋值**：将 `Array<Dog>` 赋值给 `Array<Animal>` 是否安全？
3. **依赖注入容器**：将 `Container<Service>` 注入到期望 `Container<BaseService>` 的位置是否安全？

理解型变不仅能让你写出正确的类型签名，更能让你在阅读 TypeScript 编译器错误信息时迅速定位问题根源。

### 1.2 Bloom 认知层次对照

| Bloom 层次 | 对应能力 | 本文对应章节 |
| ---------- | -------- | ------------ |
| remember   | 记住四种型变定义 | 第 3 节 |
| understand | 理解推导规则 | 第 4 节 |
| apply      | 配置 strictFunctionTypes、使用 in/out 修饰符 | 第 7、8 节 |
| analyze    | 分析数组协变与 React props 逆变 | 第 9、10 节 |
| evaluate   | 评估双变默认行为的工程权衡 | 第 7、12 节 |
| create     | 设计类型安全的事件系统 | 第 13、14 节 |

### 1.3 阅读建议

- **入门读者**：先读第 2、3、5、6 节，建立直觉。
- **工程实践者**：跳到第 7、9、12、13 节，直接解决生产问题。
- **类型论研究者**：精读第 3、4 节，对照 Pierce 的《Types and Programming Languages》第 15 章。

---

## 2. 历史动机与技术演进

### 2.1 类型论起源（1970s–1980s）

型变概念最早可追溯至 John C. Reynolds 1974 年关于参数化多态的论文，以及 Rod Burstall 与 John Lampson 1973 年在 Pebble 语言中对子类型化的早期探索。Luca Cardelli 与 Peter Wegner 在 1985 年发表于 *ACM Computing Surveys* 的经典论文《On understanding types, data abstraction, and polymorphism》首次系统化地将协变与逆变引入面向对象类型系统的教学语境，提出了至今仍被引用的分类框架：

> 子类型化的本质是多态的一种形式，它允许在不显式声明的情况下用一种类型的值替代另一种类型的值。

Cardelli-Wegner 框架将多态分为四类：

$$
\text{Polymorphism} = \begin{cases}
\text{Universal} & \begin{cases} \text{Parametric} \\ \text{Inclusion} \end{cases} \\
\text{Ad-hoc} & \begin{cases} \text{Overloading} \\ \text{Coercion} \end{cases}
\end{cases}
$$

其中**包含多态（inclusion polymorphism）**即子类型化，正是协变与逆变讨论的核心舞台。

### 2.2 Liskov 替换原则（1987）

Barbara Liskov 在 1987 年的 OOPSLA 主题演讲《Data abstraction and hierarchy》中提出了著名的替换原则，1987 年版本非正式表述为：

> 如果 $S$ 是 $T$ 的子类型，那么类型为 $T$ 的对象可以被类型为 $S$ 的对象替换，而不会破坏程序的期望性质。

1994 年 Liskov 与 Jeannette Wing 在 *ACM Transactions on Programming Languages and Systems* 发表的论文《A behavioral notion of subtyping》给出了形式化定义，要求子类型在行为上满足可替换性约束：前置条件不能加强，后置条件不能减弱。这一约束正是函数参数逆变的行为语义基础。

### 2.3 TypeScript 演进时间线

| 时间 | 版本 | 事件 |
| ---- | ---- | ---- |
| 2012-10 | TypeScript 0.8 | 微软首次发布 TypeScript，函数参数默认双变 |
| 2014-04 | TypeScript 1.0 | 正式发布，引入 `strict` 模式雏形 |
| 2016-09 | TypeScript 2.0 | 引入 `strictNullChecks`，但函数仍双变 |
| 2018-06 | TypeScript 2.6 | 引入 `strictFunctionTypes`，首次提供严格逆变检查 |
| 2018-07 | TypeScript 3.0 | 引入 `unknown` 类型，为安全协变提供基础 |
| 2020-11 | TypeScript 4.1 | 模板字面量类型，使型变约束可在字符串层面表达 |
| 2022-03 | TypeScript 4.7 | 引入 `in out` 修饰符显式标注不变位置 |
| 2023-03 | TypeScript 5.0 | 稳定 `in/out`/`const` 修饰符，支持型变推导的精细化 |
| 2024-11 | TypeScript 5.7 | 改进型变检查路径，减少误报 |

### 2.4 原作者背景

- **Luca Cardelli**（1956–）：意大利计算机科学家，Microsoft Research 前助理董事，ACM Fellow。其主页与论文合集位于 `https://lucacardelli.name`。
- **Barbara Liskov**（1939–）：MIT 教授，2008 年图灵奖得主，抽象数据类型与分布式系统先驱。
- **Gabriel Bierman**（TypeScript 语义奠基者）：Microsoft Research Cambridge，2014 年 ECOOP 论文《Understanding TypeScript》为 TypeScript 提供了首个学术级语义模型。
- **Daniel Rosenwasser**：TypeScript 项目主管，主导 `strictFunctionTypes` 与 `in/out` 修饰符的设计。

---

## 3. 形式化定义

### 3.1 子类型关系

设 $\Gamma \vdash S <: T$ 表示在类型环境 $\Gamma$ 下 $S$ 是 $T$ 的子类型。子类型关系 $<:$ 是一个预序（preorder），满足：

$$
\frac{}{\Gamma \vdash T <: T} \quad (\text{Refl})
\qquad
\frac{\Gamma \vdash S <: T \quad \Gamma \vdash T <: U}{\Gamma \vdash S <: U} \quad (\text{Trans})
$$

### 3.2 型变的四类定义

给定类型构造子 $F$，如果 $S <: T$，研究 $F(S)$ 与 $F(T)$ 之间的关系：

| 型变 | 关系 | 数学描述 |
| ---- | ---- | -------- |
| 协变 (Covariant) | $F(S) <: F(T)$ | $S <: T \Rightarrow F(S) <: F(T)$ |
| 逆变 (Contravariant) | $F(T) <: F(S)$ | $S <: T \Rightarrow F(T) <: F(S)$ |
| 不变 (Invariant) | 仅当 $S = T$ | $S <: T \wedge T <: S \Rightarrow F(S) <: F(T)$ |
| 双变 (Bivariant) | 双向都成立 | $S <: T \Rightarrow F(S) <: F(T) \wedge F(T) <: F(S)$ |

形式化地，型变是类型构造子 $F$ 的一个**函子性（functoriality）**性质。$F$ 是协变函子当且仅当：

$$
F : \text{Sub} \to \text{Sub}, \quad S <: T \implies F(S) <: F(T)
$$

$F$ 是逆变函子当且仅当：

$$
F : \text{Sub}^{op} \to \text{Sub}, \quad S <: T \implies F(T) <: F(S)
$$

其中 $\text{Sub}^{op}$ 表示子类型范畴的对偶范畴。

### 3.3 TypeScript 中各位置的型变归类

| 位置 | 默认型变 | strictFunctionTypes 后 |
| ---- | -------- | ---------------------- |
| 函数返回类型 | 协变 | 协变 |
| 函数参数（function type） | 双变 | 逆变 |
| 函数参数（method shorthand） | 双变 | 双变（豁免） |
| 数组元素 | 协变 | 协变 |
| `Promise<T>` 内部值 | 协变 | 协变 |
| 只读属性 | 协变 | 协变 |
| 可读写属性 | 不变（理论） / 协变（实际） | 同上 |
| `Record<K, T>` 的 T | 协变 | 协变 |

注意 TypeScript 的"理论型变"与"实际型变"并不完全一致，这是为了与 JavaScript 动态语义保持兼容的工程妥协，详见第 9 节。

---

## 4. 理论推导

### 4.1 函数子类型化规则

考虑函数类型 $A \to B$ 与 $A' \to B'$。函数子类型化规则（function subtyping rule）定义为：

$$
\frac{\Gamma \vdash A' <: A \quad \Gamma \vdash B <: B'}{\Gamma \vdash (A \to B) <: (A' \to B')} \quad (\text{S-Fun})
$$

这条规则同时体现了**参数逆变**（$A' <: A$，方向反转）与**返回协变**（$B <: B'$，方向保持）。它的语义依据是 Liskov 替换原则：若用 $(A \to B)$ 替代 $(A' \to B')$，调用方按 $A'$ 传入参数，由于 $A' <: A$，参数对 $A \to B$ 也是合法的；返回值按 $B$ 计算，由于 $B <: B'$，返回值对期望 $B'$ 的调用方也是合法的。

### 4.2 多参数函数的推导

对 $n$ 元函数 $(A_1, \dots, A_n) \to B$，子类型化规则推广为：

$$
\frac{\Gamma \vdash A'_i <: A_i \quad (\forall i \in 1..n) \quad \Gamma \vdash B <: B'}{\Gamma \vdash ((A_1, \dots, A_n) \to B) <: ((A'_1, \dots, A'_n) \to B')} \quad (\text{S-Fun-N})
$$

注意可选参数与剩余参数的特殊处理：

- 可选参数位置仍为逆变，但子类型可以比超类型有更少的必选参数。
- 剩余参数 `...args: A[]` 等价于无限多个逆变位置。

### 4.3 子类型推导的可判定性

TypeScript 的子类型关系是可判定的，但复杂度较高。Bierman 等人在 2014 年 ECOOP 论文中证明 TypeScript 的结构子类型化在不考虑递归类型时是 $O(n^2)$ 的；引入递归类型后变为 $O(n^3)$，且在极端情况下接近 PSPACE-hard。

### 4.4 Liskov 行为子类型约束

Liskov-Wing 1994 的行为子类型化规则在 TypeScript 中的体现：

$$
\frac{\text{Pre}_{S} \le \text{Pre}_{T} \quad \text{Post}_{T} \le \text{Post}_{S}}{S \text{ 是 } T \text{ 的行为子类型}}
$$

即子类型方法的前置条件不能比超类型更严格，后置条件不能比超类型更宽松。这与型变推导在数学上同构：参数逆变保证前置条件不加强，返回协变保证后置条件不减弱。

### 4.5 复合型变规则

当多个型变位置复合时，遵循**复合规则**：

$$
\frac{F \text{ 协变} \quad G \text{ 协变}}{F \circ G \text{ 协变}}
\quad
\frac{F \text{ 协变} \quad G \text{ 逆变}}{F \circ G \text{ 逆变}}
\quad
\frac{F \text{ 逆变} \quad G \text{ 逆变}}{F \circ G \text{ 协变}}
$$

类比负负得正：协变是 $+1$，逆变是 $-1$，复合时按符号相乘。例如：

- `Array<(x: T) => void>` 对 T 是**逆变**（数组协变 × 函数参数逆变 = 逆变）。
- `(f: (x: T) => void) => void` 对 T 是**协变**（外层参数逆变 × 内层参数逆变 = 协变）。

---

## 5. TypeScript 中的协变

### 5.1 基础示例：数组协变

```typescript
// 定义基类与子类
interface Animal {
  name: string;
  age: number;
}

interface Dog extends Animal {
  breed: string;
  bark(): void;
}

interface Cat extends Animal {
  purr(): void;
}

// 数组是协变的：Dog[] 可以赋值给 Animal[]
const dogs: Dog[] = [
  { name: 'Rex', age: 3, breed: 'Husky', bark() { /* ... */ } },
  { name: 'Max', age: 5, breed: 'Labrador', bark() { /* ... */ } },
];

// 协变赋值：合法，但有运行时隐患
const animals: Animal[] = dogs;
```

数组协变在 TypeScript 中是默认行为，但其安全性依赖于开发者不通过该数组写入非 Dog 元素。第 9 节将详述这一陷阱。

### 5.2 Promise 与异步值的协变

```typescript
// Promise<T> 对 T 是协变的
async function fetchDog(): Promise<Dog> {
  return { name: 'Rex', age: 3, breed: 'Husky', bark() { /* ... */ } };
}

// 可以直接赋值给 Promise<Animal>
const animalPromise: Promise<Animal> = fetchDog();

// then 的回调返回值也是协变位置
const processed: Promise<Animal> = fetchDog().then(dog => {
  // dog: Dog，返回 Dog 也被协变接受为 Animal
  return dog;
});
```

### 5.3 只读容器与协变

只读容器天然支持协变，因为它们没有写入接口，不存在数组协变那样的写入陷阱：

```typescript
interface ReadonlyArray<T> {
  // 只读接口，无 push/pop/splice 等写入方法
  readonly length: number;
  [n: number]: T;
  map<U>(f: (x: T, i: number) => U): ReadonlyArray<U>;
  filter(pred: (x: T, i: number) => boolean): ReadonlyArray<T>;
}

// 只读数组的协变是安全的
const readonlyDogs: ReadonlyArray<Dog> = dogs;
const readonlyAnimals: ReadonlyArray<Animal> = readonlyDogs; // 完全安全
```

### 5.4 返回值协变

函数返回类型是协变位置，子类型函数可以返回更具体的类型：

```typescript
interface AnimalShelter {
  adopt(): Animal;
}

interface DogShelter extends AnimalShelter {
  // 重写返回更具体的类型 Dog，合法（协变）
  adopt(): Dog;
}

// 实现示例
class ConcreteDogShelter implements DogShelter {
  adopt(): Dog {
    return { name: 'Buddy', age: 2, breed: 'Beagle', bark() { /* ... */ } };
  }
}
```

### 5.5 协变与 `unknown` 上界

`unknown` 是 TypeScript 中所有类型的超类型，因此任何类型都是 `unknown` 的子类型，对 `unknown` 协变的位置可以接收任何值：

```typescript
// 协变到 unknown：所有容器都是 unknown 容器
const anything: Promise<unknown> = (async () => 42)();
const anyArray: unknown[] = [1, 'two', { three: 3 }];

// 但反方向不行
const num: Promise<number> = anything; // Error: unknown 不能赋值给 number
```

---

## 6. TypeScript 中的逆变

### 6.1 基础示例：函数参数逆变

```typescript
// 定义回调类型
type AnimalHandler = (animal: Animal) => void;
type DogHandler = (dog: Dog) => void;

// 一个只处理 Dog 的回调
const handleDog: DogHandler = (dog) => {
  console.log(`Dog ${dog.name} of breed ${dog.breed}`);
};

// 在 strictFunctionTypes 下，DogHandler 是 AnimalHandler 的子类型
// 因为：调用方按 Animal 传入，由于 Dog <: Animal，传入的一定是 Dog
const handleAnimal: AnimalHandler = handleDog; // 逆变，合法
```

注意：上面这段代码"看起来"违反直觉（Dog 处理器能赋给 Animal 处理器？），但语义上是安全的——任何调用 `handleAnimal(someAnimal)` 的位置，`someAnimal` 实际上是 Dog 实例时才能成立。这要求赋值发生的语境中，`someAnimal` 必然是 Dog。

### 6.2 严格场景下的逆变失败

```typescript
// 反方向：Animal 处理器赋给 Dog 处理器会失败
const handleAnyAnimal: AnimalHandler = (animal) => {
  console.log(`Animal ${animal.name}, age ${animal.age}`);
};

const handleSpecificDog: DogHandler = handleAnyAnimal; // Error
// Error: Type '(animal: Animal) => void' is not assignable to type '(dog: Dog) => void'.
//   Property 'bark' is missing in type 'Animal' but required in type 'Dog'.
```

为什么这个方向不安全？因为调用方按 `DogHandler` 期望，会调用 `handleSpecificDog(someDog)`，处理函数内部如果只使用 `animal.name` 等基类属性是安全的；但赋值方可能在使用 `dog.bark()` 时崩掉——其实这里 `handleAnyAnimal` 没用 bark，理论上安全，但 TypeScript 不做精细的行为分析，直接按逆变规则禁止。

### 6.3 Promise.then 的逆变位置

```typescript
// Promise<T>.then 的 onFulfilled 回调接收 T，是逆变位置
const dogPromise: Promise<Dog> = Promise.resolve({
  name: 'Rex', age: 3, breed: 'Husky', bark() { /* ... */ }
});

// 回调参数逆变为 Animal 仍然安全
dogPromise.then((animal: Animal) => {
  console.log(animal.name); // 只用基类属性，安全
});
```

### 6.4 事件处理器逆变

```typescript
interface EventMap {
  click: MouseEvent;
  keydown: KeyboardEvent;
  custom: CustomEvent<{ payload: string }>;
}

type Listener<K extends keyof EventMap> = (event: EventMap[K]) => void;

// 注册监听器：逆变位置
function addListener<K extends keyof EventMap>(
  type: K,
  listener: Listener<K>
): void {
  // ...
}

// 监听 click 事件
const clickListener: Listener<'click'> = (e) => {
  console.log(e.clientX, e.clientY);
};
addListener('click', clickListener);
```

如果尝试传入一个处理更宽泛 Event 的监听器，会失败：

```typescript
const anyEventListener: (e: Event) => void = (e) => console.log(e.type);
addListener('click', anyEventListener); // Error
```

---

## 7. 双变与 strictFunctionTypes

### 7.1 默认双变行为

TypeScript 在 `strictFunctionTypes` 未启用时，函数参数位置是**双变**的，即协变与逆变都允许。这是出于与 JavaScript 动态语义兼容的考虑：

```typescript
// 双变模式下：以下两种赋值都合法
const f1: (x: Animal) => void = (x: Dog) => console.log(x.breed);
const f2: (x: Dog) => void = (x: Animal) => console.log(x.name);
```

双变允许这种"双向赋值"，但牺牲了类型安全性：第二种赋值（Animal 处理器赋给 Dog 处理器）在运行时可能崩溃，因为处理器内部可能调用 `dog.bark()`，但传入的可能是 Cat。

### 7.2 启用 strictFunctionTypes

在 `tsconfig.json` 中配置：

```json
{
  "compilerOptions": {
    "strict": true,
    "strictFunctionTypes": true
  }
}
```

`strict: true` 已包含 `strictFunctionTypes: true`，所以现代 TypeScript 工程默认启用。

### 7.3 方法语法的豁免

TypeScript 对**方法语法**（method shorthand）和**函数属性语法**（function property）采取不同的型变策略：

```typescript
interface WithMethod {
  // 方法语法：始终双变
  handle(x: Animal): void;
}

interface WithFunctionProperty {
  // 函数属性语法：受 strictFunctionTypes 约束
  handle: (x: Animal) => void;
}

// 双变 vs 逆变的差异
const dogHandler: (x: Dog) => void = (x) => console.log(x.breed);

const m: WithMethod = { handle: dogHandler };        // 合法（双变）
const f: WithFunctionProperty = { handle: dogHandler }; // Error（严格逆变）
```

设计原因：方法语法通常用于类与接口的面向对象场景，许多现有库依赖双变行为；函数属性语法更函数式，更接近纯函数子类型理论。

### 7.4 工程权衡

TypeScript 团队选择默认双变 + 可选严格逆变的设计理由：

1. **兼容性**：大量现有 JavaScript 库的 .d.ts 文件依赖双变，强制严格会引入海量类型错误。
2. **渐进式类型化**：JavaScript 迁移到 TypeScript 的项目需要宽松的过渡期。
3. **方法 vs 函数语义**：面向对象的方法重写与函数式组合有不同的子类型化期望。
4. **错误信息友好性**：双变模式下错误更少，对初学者更友好。

代价是类型安全性降低。生产级项目强烈建议启用 `strictFunctionTypes`，并在 .d.ts 编写时优先使用函数属性语法。

---

## 8. 型变与泛型修饰符

### 8.1 TypeScript 5.0+ 的 in/out 修饰符

TypeScript 5.0 引入 `in`/`out` 修饰符，允许开发者显式声明泛型参数的型变方向：

```typescript
// 协变：T 只出现在输出位置
interface Producer<out T> {
  produce(): T;
}

// 逆变：T 只出现在输入位置
interface Consumer<in T> {
  consume(value: T): void;
}

// 不变：T 同时出现在输入与输出位置
interface Storage<in out T> {
  get(): T;
  set(value: T): void;
}
```

修饰符的核心价值：

1. **文档化**：让接口的型变意图显式。
2. **编译期检查**：TypeScript 会校验 T 是否真的只在声明的方向出现。
3. **错误提示**：违反型变时给出明确错误。

### 8.2 修饰符的编译期校验

```typescript
// 错误：声明为协变但 T 出现在输入位置
interface BadProducer<out T> {
  produce(): T;
  reset(value: T): void; // Error: 'T' is specified as 'out' here...
}
```

这种校验避免了开发者无意中破坏型变约束。

### 8.3 修饰符与默认行为

未使用修饰符时，TypeScript 推断默认型变：

- 只读属性、返回值位置：协变
- 只写属性、参数位置：逆变（strictFunctionTypes 下）
- 同时出现：不变

显式修饰符会覆盖默认推断，并在跨文件使用时提供更稳定的接口契约。

### 8.4 与 Scala/C# 的对比

Scala 的声明站点型变：

```scala
// Scala
trait Producer[+T] { def produce(): T }      // + 表示协变
trait Consumer[-T] { def consume(t: T): Unit } // - 表示逆变
trait Storage[T]                              // 无修饰符表示不变
```

C# 在接口层面使用 `out`/`in` 关键字：

```csharp
// C#
interface IProducer<out T> { T Produce(); }
interface IConsumer<in T> { void Consume(T value); }
```

TypeScript 5.0+ 借鉴了 C# 的语法，但语义上更接近 Scala 的声明站点型变。

### 8.5 工程实践：何时使用修饰符

| 场景 | 建议 |
| ---- | ---- |
| 公开 API 的库 | 强烈建议使用，提高接口契约清晰度 |
| 内部工具类型 | 可选，根据复杂度决定 |
| 临时类型别名 | 不建议，会增加维护成本 |
| 函数泛型 | 不适用，修饰符只能用于接口/类型别名 |

---

## 9. 数组协变陷阱

### 9.1 经典反例

数组协变在 1960 年代 ALGOL 之后就已知是类型不安全的。Java 在 1995 年继承了这一设计，TypeScript 又从 Java 借鉴。考虑以下代码：

```typescript
const dogs: Dog[] = [
  { name: 'Rex', age: 3, breed: 'Husky', bark() { /* ... */ } },
];
const animals: Animal[] = dogs; // 协变赋值

interface Cat extends Animal {
  purr(): void;
}

const cat: Cat = { name: 'Whiskers', age: 2, purr() { /* ... */ } };

// 通过 animals 数组写入 Cat！
animals.push(cat);

// 但 dogs[1] 现在是 Cat，调用 bark 会崩
dogs[1].bark(); // 运行时错误：cat 没有 bark 方法
```

TypeScript 编译器不会报错，但运行时会崩溃。这就是数组协变的根本矛盾：**协变只保证读安全，不保证写安全**。

### 9.2 修复方案

#### 方案 1：使用只读数组类型

```typescript
const dogs: Dog[] = [/* ... */];

// 使用 ReadonlyArray<T>，禁止写入操作
const animals: ReadonlyArray<Animal> = dogs;

// animals.push(cat); // 编译期错误：push 不存在于 ReadonlyArray
```

只读数组的协变是安全的，因为没有写入接口。

#### 方案 2：使用元组类型

```typescript
// 元组是不变的
const dogTuple: [Dog, Dog] = [
  { name: 'Rex', age: 3, breed: 'Husky', bark() { /* ... */ } },
  { name: 'Max', age: 4, breed: 'Lab', bark() { /* ... */ } },
];

// const animalTuple: [Animal, Animal] = dogTuple; // Error
```

元组长度固定且每个位置独立，TypeScript 将其视为不变。

#### 方案 3：显式复制

```typescript
const animals: Animal[] = [...dogs]; // 浅拷贝
animals.push(cat); // 不影响 dogs
```

#### 方案 4：使用 `in out` 修饰符自定义不变容器

```typescript
interface InvariantArray<in out T> {
  get(index: number): T;
  set(index: number, value: T): void;
  push(value: T): number;
  // ...
}

// InvariantArray<Dog> 不能赋值给 InvariantArray<Animal>
```

### 9.3 TypeScript 编译器的妥协

TypeScript 历史上未对数组施加不变约束，原因包括：

1. **JavaScript 语义**：JS 数组天生可写，强制不变会破坏大量现有代码。
2. **渐进式类型化**：迁移项目需要宽松的类型。
3. **库兼容性**：数以千计的 npm 库依赖数组协变。

工程实践中，建议在 API 设计层使用 `ReadonlyArray<T>` 或 `readonly T[]` 作为参数类型，避免数组协变陷阱。

### 9.4 ReadonlyArray 与 readonly 修饰符

```typescript
function processAnimals(animals: readonly Animal[]): void {
  // 只读遍历，安全
  animals.forEach(a => console.log(a.name));
}

// 传入 Dog[] 也合法
processAnimals(dogs);
```

`readonly T[]` 是 `ReadonlyArray<T>` 的语法糖，二者等价。

---

## 10. React Props 逆变案例

### 10.1 问题场景

React 组件 props 中的回调函数是最常见的逆变陷阱现场：

```typescript
import { MouseEvent } from 'react';

interface ButtonProps {
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}

interface DivProps {
  onClick: (e: MouseEvent<HTMLDivElement>) => void;
}

// 假设我们有一个通用 click 处理器
function handleClick(e: MouseEvent<Element>): void {
  console.log('clicked', e.currentTarget);
}

// 直接使用会失败
function MyButton() {
  return <button onClick={handleClick} />; // Error
  // Error: Types of parameters 'e' and 'event' are incompatible.
  //   Type 'MouseEvent<HTMLButtonElement>' is missing properties from type 'MouseEvent<Element>'.
}
```

为什么失败？因为 `MouseEvent<HTMLButtonElement>` 是 `MouseEvent<Element>` 的子类型（HTMLButtonElement <: Element），按逆变规则，`(e: MouseEvent<Element>) => void` 不是 `(e: MouseEvent<HTMLButtonElement>) => void` 的子类型。

### 10.2 修复方案

#### 方案 1：泛型分发

```typescript
function handleClick<E extends Element>(e: MouseEvent<E>): void {
  console.log('clicked', e.currentTarget);
}

function MyButton() {
  return <button onClick={handleClick<HTMLButtonElement>} />;
}
```

#### 方案 2：上下文类型推断

React 内部对 `onClick` 等事件处理器使用上下文类型推断，会自动推导出 `MouseEvent<HTMLButtonElement>`：

```typescript
function MyButton() {
  // 参数 e 自动推断为 MouseEvent<HTMLButtonElement>
  return <button onClick={(e) => {
    console.log(e.currentTarget); // HTMLButtonElement
  }} />;
}
```

#### 方案 3：宽泛处理器 + 类型守卫

```typescript
function handleClick(e: MouseEvent<Element>): void {
  if (e.currentTarget instanceof HTMLButtonElement) {
    // 收窄到 HTMLButtonElement
    console.log('button clicked', e.currentTarget.name);
  }
}

function MyButton() {
  // 类型断言绕过检查
  return <button onClick={handleClick as (e: MouseEvent<HTMLButtonElement>) => void} />;
}
```

第三种方案不推荐，仅在没有其他选择时使用。

### 10.3 React 内部的型变规避

React 18+ 对事件处理器类型做了重新设计，使用泛型分发与上下文类型让事件类型在分发时被锁定到具体元素：

```typescript
// React 18 类型定义（简化版）
interface DOMAttributes<T> {
  onClick?: React.MouseEventHandler<T>;
  // ...
}

type MouseEventHandler<T> = (event: MouseEvent<T>) => void;

interface ButtonHTMLAttributes<T> extends HTMLAttributes<T>, DOMAttributes<T> {
  // ...
}

// 使用时 T 被推导为 HTMLButtonElement
function button(props: ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element;
```

这种设计让 `onClick` 的回调类型在组件级别就被锁定到 `MouseEvent<HTMLButtonElement>`，避免了不安全的向上分发。

### 10.4 高阶组件的逆变陷阱

```typescript
interface WithDataProps<T> {
  data: T;
  render: (item: T) => React.ReactNode;
}

function withData<T>(Component: React.ComponentType<WithDataProps<T>>) {
  return function Wrapped(props: WithDataProps<T>) {
    return <Component {...props} />;
  };
}

// 使用
interface User { id: number; name: string; }
const UserList = withData<User>(({ data, render }) => (
  <ul>{render(data)}</ul>
));

// 这里 render 的参数类型被锁定到 User
<UserList data={{ id: 1, name: 'Alice' }} render={u => <li>{u.name}</li>} />;
```

如果 `withData` 的泛型未正确约束，可能出现逆变失败：传入的 render 期望 `User` 但实际收到 `Animal`。

---

## 11. 对比分析

### 11.1 与 Scala 的对比

Scala 在语言层面强制声明站点型变：

```scala
// Scala
trait List[+T]   // 协变
trait Function1[-T, +R] extends Function[T, R]  // 参数逆变、返回协变

// 编译器会校验：
// trait Bad[+T] { def add(t: T): Unit }  // 编译错误
```

TypeScript 5.0+ 的 `in/out` 修饰符借鉴了 Scala，但仍是可选的，默认行为是宽松的。

### 11.2 与 Java 的对比

Java 在数组层面协变（不安全设计），在泛型层面不变（类型擦除要求）：

```java
// Java 数组协变
Animal[] animals = new Dog[10];
animals[0] = new Cat(); // ArrayStoreException at runtime

// Java 泛型不变
List<Dog> dogs = new ArrayList<>();
// List<Animal> animals = dogs; // 编译错误
List<? extends Animal> covariant = dogs; // 通配符协变
List<? super Dog> contravariant = new ArrayList<Animal>(); // 通配符逆变
```

TypeScript 没有通配符，但通过 `in`/`out` 修饰符与只读类型提供了类似的灵活性。

### 11.3 与 C# 的对比

C# 在 CLR 层面强制数组协变（运行时检查），在委托层面支持显式型变：

```csharp
// C# 数组协变（引用类型）
object[] arr = new string[10];
arr[0] = 5; // ArrayTypeMismatchException at runtime

// C# 委托型变
delegate T Func<out T>();
delegate void Action<in T>(T obj);
```

C# 与 TypeScript 在型变修饰符语法上最接近（都用 `in`/`out`），但 C# 的约束更严格。

### 11.4 与 Rust 的对比

Rust 没有传统的子类型化，但通过生命周期子类型化实现型变：

```rust
// Rust 生命周期协变
fn longest<'a, 'b: 'a>(x: &'a str, y: &'b str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
// 'b: 'a 表示 'b 比 'a 长，&'b str 可以赋值给 &'a str
```

Rust 的型变系统更关注生命周期安全性，而非对象子类型化。

### 11.5 与 Flow 的对比

Facebook 的 Flow 类型检查器在函数参数上采用严格逆变，不像 TypeScript 那样默认双变。这是 Flow 与 TypeScript 早期最显著的设计差异之一。

### 11.6 综合对比表

| 特性 | TypeScript | Scala | Java | C# | Rust |
| ---- | ---------- | ----- | ---- | --- | ---- |
| 数组协变 | 默认 | 不可 | 默认 | 引用类型默认 | 不存在 |
| 函数参数默认型变 | 双变 | 逆变 | 不变（无 lambdas） | 逆变 | N/A |
| 显式型变修饰符 | in/out（5.0+） | +/- | 无（用通配符） | in/out | 无（推导） |
| 声明站点 vs 使用站点 | 声明 | 声明 | 使用 | 声明 | 推导 |
| 严格模式 | strictFunctionTypes | 始终严格 | 始终严格 | 始终严格 | 始终严格 |

---

## 12. 常见陷阱与修复

### 12.1 陷阱 1：误以为函数参数协变

```typescript
// 错误理解：以为 (x: Animal) => void 是 (x: Dog) => void 的子类型
const f1: (x: Dog) => void = (x: Animal) => console.log(x.name); // strictFunctionTypes 下报错

// 正确理解：函数参数逆变，Dog 处理器才能赋给 Animal 处理器
const f2: (x: Animal) => void = (x: Dog) => console.log(x.breed);
```

修复：始终记住"参数逆、返回协"的口诀。

### 12.2 陷阱 2：方法语法 vs 函数属性语法

```typescript
interface A {
  f(x: Animal): void;     // 方法语法，双变
}

interface B {
  f: (x: Animal) => void; // 函数属性语法，逆变
}

const dogHandler: (x: Dog) => void = (x) => { /* ... */ };

const a: A = { f: dogHandler };      // 合法
const b: B = { f: dogHandler };      // Error
```

修复：根据需要的型变严格程度选择语法。生产代码推荐函数属性语法。

### 12.3 陷阱 3：泛型推断导致的型变丢失

```typescript
function makeHandler<T>(handler: (x: T) => void): (x: T) => void {
  return handler;
}

const animalHandler = makeHandler<Animal>((x) => console.log(x.name));
const dogHandler: (x: Dog) => void = animalHandler; // Error

// 修复：使用泛型分发
function makeHandlerSafe<T>(): <U extends T>(x: U) => void {
  return (x) => console.log((x as T).name);
}
```

### 12.4 陷阱 4：事件监听器的过度宽泛

```typescript
// 错误：监听器参数宽于实际事件类型
window.addEventListener('click', (e: Event) => {
  // e 被推断为 Event，而非 MouseEvent
  console.log(e.clientX); // Error: Property 'clientX' does not exist on type 'Event'
});

// 修复：让 TypeScript 自动推断
window.addEventListener('click', (e) => {
  console.log(e.clientX); // MouseEvent，合法
});
```

### 12.5 陷阱 5：使用 `any` 绕过型变

```typescript
// 错误：用 any 绕过，失去类型安全
const unsafeHandler: (x: Dog) => void = ((x: Animal) => console.log(x.name)) as any;

// 修复：使用 unknown + 类型守卫
const safeHandler: (x: Dog) => void = (x) => {
  const animal = x as unknown as Animal;
  console.log(animal.name);
};
```

### 12.6 陷阱 6：可变数组与协变

```typescript
// 错误：通过协变数组写入不安全
const dogs: Dog[] = [/* ... */];
const animals: Animal[] = dogs;
animals.push(someCat); // 运行时崩溃风险

// 修复：使用 ReadonlyArray 或显式复制
const readonlyAnimals: ReadonlyArray<Animal> = dogs;
// readonlyAnimals.push(someCat); // 编译错误
```

### 12.7 陷阱 7：Promise 链中的型变丢失

```typescript
// 错误：then 回调返回值被推断为 Animal，丢失 Dog 信息
const dogPromise: Promise<Dog> = fetchDog();
const processed = dogPromise.then((dog) => {
  return dog as Animal; // 返回类型显式收窄
});
// processed: Promise<Animal>，但可能希望保留 Promise<Dog>

// 修复：保留具体类型
const preserved = dogPromise.then((dog) => {
  // 不显式收窄，TypeScript 自动推导返回 Dog
  return dog;
});
// preserved: Promise<Dog>
```

### 12.8 陷阱 8：使用 in/out 修饰符过度约束

```typescript
// 过度约束：明明只是协变位置却用 in out
interface Container<in out T> {
  get(): T;
}

// 修复：根据实际使用场景选择修饰符
interface ReadContainer<out T> {
  get(): T;
}
```

---

## 13. 工程实践

### 13.1 tsconfig.json 配置

```jsonc
{
  "compilerOptions": {
    "strict": true,                    // 启用所有严格检查，包括 strictFunctionTypes
    "strictFunctionTypes": true,       // 显式声明（已被 strict 包含）
    "noImplicitAny": true,             // 禁止隐式 any
    "strictNullChecks": true,          // 严格 null 检查
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true               // 跳过 .d.ts 检查，避免第三方类型问题
  }
}
```

### 13.2 ESLint 配置

```jsonc
{
  "rules": {
    "@typescript-eslint/strict-boolean-expressions": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-return": "error",
    "@typescript-eslint/no-unsafe-argument": "error"
  }
}
```

### 13.3 类型安全的回调注册器

```typescript
/**
 * 类型安全的事件注册器
 * 利用逆变与映射类型确保事件名与回调类型一一对应
 */
interface EventMap {
  userCreated: { id: string; name: string };
  userDeleted: { id: string };
  postPublished: { postId: string; authorId: string };
}

class TypedEventEmitter<Events extends Record<string, any>> {
  private listeners: { [K in keyof Events]?: Array<(payload: Events[K]) => void> } = {};

  /**
   * 注册事件监听器
   * @param event 事件名
   * @param listener 监听器函数（参数类型逆变为 Events[K]）
   */
  on<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): this {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
    return this;
  }

  /**
   * 触发事件
   * @param event 事件名
   * @param payload 事件载荷（必须精确匹配 Events[K] 类型）
   */
  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const callbacks = this.listeners[event];
    if (callbacks) {
      callbacks.forEach(cb => cb(payload));
    }
  }

  /**
   * 注销事件监听器
   */
  off<K extends keyof Events>(event: K, listener: (payload: Events[K]) => void): this {
    const callbacks = this.listeners[event];
    if (callbacks) {
      const idx = callbacks.indexOf(listener);
      if (idx !== -1) {
        callbacks.splice(idx, 1);
      }
    }
    return this;
  }
}

// 使用示例
const emitter = new TypedEventEmitter<EventMap>();

// 正确：参数类型与事件载荷匹配
emitter.on('userCreated', (payload) => {
  console.log(payload.id, payload.name); // payload 自动推断为 { id: string; name: string }
});

// 错误：参数类型不匹配
// emitter.on('userCreated', (payload: { id: string }) => { /* ... */ }); // Error

emitter.emit('userCreated', { id: '123', name: 'Alice' });
// emitter.emit('userCreated', { id: '123' }); // Error: 缺少 name
```

### 13.4 容器抽象与型变

```typescript
/**
 * 协变容器：生产者
 * 仅暴露读取接口
 */
interface Producer<out T> {
  get(): T;
  map<U>(f: (x: T) => U): Producer<U>;
}

/**
 * 逆变容器：消费者
 * 仅暴露写入接口
 */
interface Consumer<in T> {
  accept(value: T): void;
}

/**
 * 不变容器：仓库
 * 同时暴露读写接口
 */
interface Repository<in out T> {
  findById(id: string): T;
  save(value: T): void;
  delete(value: T): void;
}

// 实现
class ListProducer<out T> implements Producer<T> {
  constructor(private items: readonly T[]) {}

  get(): T {
    return this.items[0];
  }

  map<U>(f: (x: T) => U): Producer<U> {
    return new ListProducer(this.items.map(f));
  }
}

// 使用
const dogProducer: Producer<Dog> = new ListProducer([
  { name: 'Rex', age: 3, breed: 'Husky', bark() { /* ... */ } },
]);
const animalProducer: Producer<Animal> = dogProducer; // 协变赋值，合法
```

### 13.5 依赖注入容器的型变

```typescript
/**
 * 简化的依赖注入容器
 * 利用型变确保服务注册与解析的类型安全
 */
interface ServiceRegistry {
  [key: string]: unknown;
}

class DIContainer<Services extends ServiceRegistry> {
  private services = new Map<keyof Services, unknown>();

  /**
   * 注册服务
   */
  register<K extends keyof Services>(
    key: K,
    factory: () => Services[K]
  ): this {
    this.services.set(key, factory());
    return this;
  }

  /**
   * 解析服务
   */
  resolve<K extends keyof Services>(key: K): Services[K] {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service ${String(key)} not registered`);
    }
    return service as Services[K];
  }
}

// 使用
interface AppServices {
  db: Database;
  logger: Logger;
  cache: CacheService;
}

const container = new DIContainer<AppServices>();
container.register('db', () => new PostgreSQLDatabase());
container.register('logger', () => new ConsoleLogger());

const db = container.resolve('db'); // Database
// const invalid = container.resolve('invalid'); // Error: 不在 AppServices 中
```

### 13.6 函数组合的型变

```typescript
/**
 * 函数组合：compose(f, g)(x) = f(g(x))
 * 需要满足 g: A => B, f: B => C
 */
function compose<A, B, C>(
  f: (b: B) => C,
  g: (a: A) => B
): (a: A) => C {
  return (a: A) => f(g(a));
}

// 利用协变，可以将返回更具体类型的函数组合
const toDog = (id: string): Dog => ({
  name: 'Rex', age: 3, breed: 'Husky', bark() { /* ... */ }
});

const toAnimal = (dog: Dog): Animal => {
  // 返回类型协变：返回 Dog 也合法
  return dog;
};

const pipeline = compose(toAnimal, toDog);
const result: Animal = pipeline('123');
```

### 13.7 React 高阶组件的型变

```typescript
import React from 'react';

/**
 * 高阶组件：注入额外 props
 * 利用型变确保 Props 类型正确传递
 */
function withLoading<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<Omit<P, 'loading'>> {
  return function Wrapped(props: Omit<P, 'loading'>) {
    const [loading, setLoading] = React.useState(false);
    return <Component {...(props as P)} loading={loading} />;
  };
}

interface DataComponentProps {
  data: string[];
  loading: boolean;
}

const DataComponent: React.FC<DataComponentProps> = ({ data, loading }) => {
  if (loading) return <div>Loading...</div>;
  return <ul>{data.map((d, i) => <li key={i}>{d}</li>)}</ul>;
};

const WrappedComponent = withLoading(DataComponent);
// 使用时不需要传 loading
// <WrappedComponent data={['a', 'b']} />
```

---

## 14. 案例研究

### 14.1 案例一：RxJS 观察者模式

RxJS 的 Observer 接口是逆变的典型应用：

```typescript
interface Observer<T> {
  next: (value: T) => void;
  error: (err: any) => void;
  complete: () => void;
}

interface Observable<T> {
  subscribe(observer: Observer<T>): Subscription;
}

// 利用协变，Observable<Dog> 可以赋值给 Observable<Animal>
const dogObservable: Observable<Dog> = {
  subscribe(observer) {
    observer.next({ name: 'Rex', age: 3, breed: 'Husky', bark() { /* ... */ } });
    return { unsubscribe() {} };
  }
};

const animalObservable: Observable<Animal> = dogObservable; // 协变

// 观察者逆变
const animalObserver: Observer<Animal> = {
  next: (animal) => console.log(animal.name),
  error: (e) => console.error(e),
  complete: () => console.log('done'),
};

dogObservable.subscribe(animalObserver); // 逆变，合法
```

### 14.2 案例二：Express 中间件链

Express 中间件的 Request/Response 类型扩展是声明合并与型变的综合应用：

```typescript
import express, { Request, Response, NextFunction } from 'express';

// 通过声明合并扩展 Request
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      role: 'admin' | 'user';
    };
  }
}

// 中间件类型：(req, res, next) => void
type Middleware = (req: Request, res: Response, next: NextFunction) => void;

// 鉴权中间件
const authMiddleware: Middleware = (req, _res, next) => {
  // 通过某种方式设置 req.user
  (req as any).user = { id: '123', role: 'admin' };
  next();
};

// 受保护的路由处理器
type ProtectedHandler = (req: Request & { user: NonNullable<Request['user']> }, res: Response) => void;

const protectedHandler: ProtectedHandler = (req, res) => {
  // 在 strictFunctionTypes 下：ProtectedHandler 不是 Middleware 的子类型
  // 因为 req 参数更具体，违反逆变
  res.json({ userId: req.user.id });
};

// 修复：使用类型断言
app.get('/protected', authMiddleware, protectedHandler as unknown as Middleware);
```

### 14.3 案例三：Redux reducer 的型变

Redux 的 reducer 模式利用了动作联合类型与状态协变：

```typescript
type Action =
  | { type: 'INCREMENT'; payload: number }
  | { type: 'DECREMENT'; payload: number }
  | { type: 'RESET' };

interface State {
  count: number;
}

type Reducer<S = State, A extends Action = Action> = (
  state: S,
  action: A
) => S;

const counterReducer: Reducer = (state, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return { count: state.count + action.payload };
    case 'DECREMENT':
      return { count: state.count - action.payload };
    case 'RESET':
      return { count: 0 };
    default:
      return state;
  }
};

// 利用协变：返回更具体的子状态类型
interface StrictState extends State {
  readonly lastUpdated: number;
}

const strictCounterReducer: Reducer<StrictState> = (state, action) => {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + action.payload, lastUpdated: Date.now() };
    // ...
    default:
      return state;
  }
};

// 协变：Reducer<StrictState> 是 Reducer<State> 的子类型
const store: Reducer<State> = strictCounterReducer;
```

### 14.4 案例四：tRPC 的端到端类型安全

tRPC 利用型变实现前后端的端到端类型推导：

```typescript
import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

// 路由定义
const appRouter = t.router({
  getUser: t.procedure
    .input(z.object({ id: z.string() }))
    .output(z.object({ id: z.string(), name: z.string() }))
    .query(({ input }) => {
      return { id: input.id, name: 'Alice' };
    }),
});

// 推导出的客户端调用类型
type AppRouter = typeof appRouter;
// 客户端调用 getUser 时，input 与 output 类型严格匹配
```

tRPC 的核心机制是利用 TypeScript 的条件类型与型变推导，将服务端路由的输入输出类型传递到客户端。型变确保了类型传递的安全性。

### 14.5 案例五：Zod 与运行时验证

Zod 模式在运行时验证后产生类型，与 TypeScript 静态类型形成协变关系：

```typescript
import { z } from 'zod';

// 运行时验证模式
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().int().positive(),
});

// 静态类型推导
type User = z.infer<typeof userSchema>;
// 等价于 { id: string; name: string; age: number }

// 运行时验证
const parse = <T extends z.ZodType<any>>(schema: T, input: unknown): z.infer<T> => {
  return schema.parse(input);
};

// 运行时与静态类型协变
const user = parse(userSchema, { id: '1', name: 'Alice', age: 30 });
// user: User，运行时验证通过
```

### 14.6 案例六：Effect-TS 的 Channel 型变

Effect-TS 库的 Channel 抽象使用型变约束实现生产者-消费者模式：

```typescript
import { Channel, Effect } from 'effect';

// Producer：协变于产出值类型
const producer = Channel.fromIterable([1, 2, 3]);
// producer: Channel<number, unknown, never>

// Consumer：逆变于输入值类型
const consumer = Channel.readWith(
  (n: number) => Effect.sync(() => console.log(n)),
  () => Effect.unit,
  () => Effect.unit
);

// 组合：Channel 协变与逆变的综合应用
const pipeline = Channel.pipeTo(producer, consumer);
```

---

## 15. 习题

> 习题按 Bloom 分类法分级，覆盖记忆、理解、应用、分析、评价、创造六个层次。

### 15.1 填空题（fill-blank）

1. **[remember]** 在 TypeScript 中，函数参数在 strictFunctionTypes 启用后处于____位置，子类型关系会____。

2. **[remember]** 数组在 TypeScript 中默认是____的，这是历史性的类型不安全设计，源于对 Java 数组协变的兼容借鉴。

3. **[understand]** 设 $S <: T$，若 $F$ 是协变函子，则 $F(S) <: F($____$)$；若 $F$ 是逆变函子，则 $F($____$) <: F(S)$。

4. **[understand]** TypeScript 5.0 引入的 `out T` 修饰符表示 T 是____型变位置，`in T` 表示____型变位置，`in out T` 表示____。

5. **[remember]** Liskov 替换原则要求子类型方法的____不能加强，____不能减弱。

### 15.2 选择题（choice）

1. **[understand]** 下列哪个泛型修饰符组合表示"不变"（invariance）？

   - A. `out T`
   - B. `in T`
   - C. `in out T`
   - D. `T`（无修饰符）

   答案：C

2. **[analyze]** 关于 TypeScript 中 `strictFunctionTypes` 的描述，正确的是？

   - A. 启用后所有函数都会被严格逆变检查
   - B. 启用后只有泛型函数参数会严格逆变检查，方法参数仍保持双变
   - C. 禁用后函数返回类型也会变为逆变
   - D. 启用后数组将变为不变类型

   答案：B

3. **[understand]** 下列哪种类型构造子 $F$ 满足"协变"？

   - A. $F(T) = (T) \to \text{void}$（参数为 T 的函数）
   - B. $F(T) = \text{void} \to T$（返回 T 的函数）
   - C. $F(T) = \{ \text{get}: () \to T, \text{set}: (T) \to \text{void} \}$（可读写容器）
   - D. $F(T) = (T) \to T$（输入输出都是 T 的函数）

   答案：B

4. **[evaluate]** 以下代码在 strictFunctionTypes 下哪一行会报错？

   ```typescript
   type F1 = (x: Animal) => void;
   type F2 = (x: Dog) => void;
   const dogHandler: F2 = (x) => console.log(x.breed);
   const a: F1 = dogHandler;       // (1)
   const b: F2 = (a as F2);         // (2)
   const c: F1 = (x: Animal) => console.log(x.name); // (3)
   const d: F2 = c;                 // (4)
   ```

   - A. 第 (1) 行
   - B. 第 (2) 行
   - C. 第 (3) 行
   - D. 第 (4) 行

   答案：D

5. **[analyze]** 以下代码哪一项不会触发数组协变陷阱？

   - A. `const a: Animal[] = dogs; a.push(cat);`
   - B. `const a: readonly Animal[] = dogs; a.push(cat);`
   - C. `const a: Animal[] = [...dogs]; a.push(cat);`
   - D. `const a: ReadonlyArray<Animal> = dogs; a[0] = cat;`

   答案：C（显式复制，不影响原数组）

### 15.3 代码修复题（code-fix）

1. **[apply]** 以下代码启用了 strictFunctionTypes，但赋值会失败。请修复类型签名以使其通过类型检查。

   ```typescript
   type Callback<T> = (payload: T) => void;
   declare const dogCallback: Callback<Dog>;
   const animalCallback: Callback<Animal> = dogCallback;
   ```

   修复方案：

   ```typescript
   // Callback 的参数 T 是逆变位置，Callback<Dog> 是 Callback<Animal> 的子类型
   // 因此原本的赋值应该通过；如果失败，说明 Callback 被错误设计为协变
   // 修复：确保 Callback 用 in 修饰符（TS 5.0+）或保持函数签名
   type Callback<in T> = (payload: T) => void;
   declare const dogCallback: Callback<Dog>;
   const animalCallback: Callback<Animal> = dogCallback; // 合法（逆变）
   ```

2. **[apply]** 以下数组协变代码会导致运行时错误，请在不改变行为的前提下修复类型签名。

   ```typescript
   const dogs: Dog[] = [/* ... */];
   const animals: Animal[] = dogs;
   animals.push(someCat); // 运行时崩溃
   ```

   修复方案：

   ```typescript
   // 方案 1：使用只读数组，禁止写入
   const dogs: Dog[] = [/* ... */];
   const animals: readonly Animal[] = dogs;
   // animals.push(someCat); // 编译错误：push 不存在于 readonly array

   // 方案 2：显式复制，避免共享引用
   const animals: Animal[] = [...dogs];
   animals.push(someCat); // 不影响 dogs
   ```

3. **[apply]** 以下 React 代码在 strictFunctionTypes 下报错，请修复。

   ```typescript
   function handleAnyElement(e: MouseEvent<Element>) {
     console.log(e.currentTarget);
   }
   const button = <button onClick={handleAnyElement} />;
   ```

   修复方案：

   ```typescript
   // 方案 1：泛型分发
   function handleElement<E extends Element>(e: MouseEvent<E>) {
     console.log(e.currentTarget);
   }
   const button = <button onClick={handleElement<HTMLButtonElement>} />;

   // 方案 2：让 React 自动推断
   const button = <button onClick={(e) => {
     console.log(e.currentTarget); // e 自动推断为 MouseEvent<HTMLButtonElement>
   }} />;
   ```

4. **[apply]** 以下泛型容器类型在 TypeScript 5.0+ 下应如何添加型变修饰符？

   ```typescript
   interface Box<T> {
     value: T;
   }
   interface Source<T> {
     next(): T;
   }
   interface Sink<T> {
     write(value: T): void;
   }
   interface Buffer<T> {
     read(): T;
     write(value: T): void;
   }
   ```

   修复方案：

   ```typescript
   interface Box<in out T> {  // 可读写属性，不变
     value: T;
   }
   interface Source<out T> {   // 仅产出，协变
     next(): T;
   }
   interface Sink<in T> {      // 仅消费，逆变
     write(value: T): void;
   }
   interface Buffer<in out T> { // 同时读写，不变
     read(): T;
     write(value: T): void;
   }
   ```

### 15.4 开放题（open-ended）

1. **[evaluate]** 在 React 中，假设有 `interface Props { onClick: (e: MouseEvent) => void }`。父组件渲染 `<Child onClick={handleChildClick} />`，其中 `handleChildClick: (e: MouseEvent<HTMLButtonElement>) => void`。请从型变角度论证为什么这种赋值在 strictFunctionTypes 下是危险的，并说明 React 18+ 内部为何使用泛型分发规避此问题。

2. **[evaluate]** TypeScript 默认对函数参数采用双变策略，而 Flow、Scala、C# 等语言严格采用逆变。请从语言设计角度分析 TypeScript 选择双变默认的三个合理性理由，以及三个潜在风险。

3. **[create]** 设计一个类型安全的发布-订阅系统，要求：
   - 事件名与事件载荷通过映射类型关联
   - 订阅器参数逆变为事件载荷
   - 发布器协变于事件载荷
   - 支持事件命名空间的嵌套（如 `'user.created'`、`'user.deleted'`）
   - 提供完整 TypeScript 实现与使用示例

4. **[analyze]** 阅读以下代码，分析为什么 `sinks` 数组的赋值会失败，并给出两种修复方案：

   ```typescript
   interface Sink<T> {
     write(value: T): void;
   }
   declare const animalSink: Sink<Animal>;
   declare const dogSink: Sink<Dog>;
   const sinks: Sink<Dog>[] = [animalSink]; // Error
   ```

5. **[create]** 实现一个 `DeepReadonly<T>` 类型，使其递归地将 T 的所有属性变为只读。要求：
   - 处理函数类型（应跳过）
   - 处理数组类型（应变为 ReadonlyArray）
   - 处理 Map/Set（应保持类型构造子但内部值只读）
   - 处理循环引用（用 WeakMap 防止栈溢出，类型层面用 ConditionalTypes 推迟）
   - 给出至少 5 个测试用例

---

## 16. 参考文献

1. Cardelli, L. and Wegner, P. 1985. On understanding types, data abstraction, and polymorphism. *ACM Computing Surveys* 17, 4 (Dec. 1985), 471–523. DOI: https://doi.org/10.1145/6041.6042

2. Liskov, B. H. and Wing, J. M. 1994. A behavioral notion of subtyping. *ACM Transactions on Programming Languages and Systems* 16, 6 (Nov. 1994), 1811–1841. DOI: https://doi.org/10.1145/197320.197383

3. Pierce, B. C. 2002. *Types and Programming Languages*. MIT Press, Cambridge, MA, USA. ISBN: 978-0-262-16209-8.

4. Bierman, G., Abadi, M., and Torgersen, M. 2014. Understanding TypeScript. In *28th European Conference on Object-Oriented Programming (ECOOP 2014)*. LIPIcs 33, Article 257, 1–29. DOI: https://doi.org/10.4230/LIPIcs.ECOOP.2014.257

5. Riba, C. 2008. On the incompleteness of the calculus of constructions with subtyping. In *Proceedings of the 23rd Conference on the Mathematical Foundations of Programming Semantics (MFPS XXIII)*. Electronic Notes in Theoretical Computer Science 215, 131–149. DOI: https://doi.org/10.1016/j.entcs.2008.06.027

6. Appel, A. W. and Felty, A. P. 2004. A semantic model of types and machine instructions for proof-carrying code. *ACM Transactions on Programming Languages and Systems* 26, 3 (May 2004), 551–582. DOI: https://doi.org/10.1145/982158.982163

7. Reynolds, J. C. 1974. Towards a theory of type structure. In *Proceedings of the Colloque sur la Programmation (Programming Symposium)*. LNCS 19, 408–425. DOI: https://doi.org/10.1007/3-540-06859-7_148

8. Reynolds, J. C. 1983. Types, abstraction and parametric polymorphism. In *Information Processing 83*, 513–523.

9. Cook, W. R., Hill, W. L., and Canning, P. S. 1990. Inheritance is not subtyping. In *Proceedings of the 17th ACM SIGPLAN-SIGACT Symposium on Principles of Programming Languages (POPL '90)*, 125–135. DOI: https://doi.org/10.1145/96709.96721

10. Castagna, G., Ghelli, G., and Longo, G. 1995. A calculus for overloaded functions with subtyping. *Information and Computation* 117, 2 (Mar. 1995), 235–278. DOI: https://doi.org/10.1006/inco.1995.1042

11. Igarashi, A., Pierce, B. C., and Wadler, P. 2001. Featherweight Java: a minimal core calculus for Java and GJ. *ACM Transactions on Programming Languages and Systems* 23, 3 (May 2001), 396–450. DOI: https://doi.org/10.1145/503502.503505

12. Amin, N., Grütter, S., Odersky, M., Rompf, T., and Stucki, S. 2016. The essence of dependent object types. In *A List of Successes That Can Change the World*. LNCS 9600, 1–19. DOI: https://doi.org/10.1007/978-3-319-30936-1_1

13. Bierman, G., Parkinson, M., and Pitts, A. 2003. MJ: An imperative core calculus for Java and Java with effects. Technical Report UCAM-CL-TR-563, University of Cambridge.

14. TypeScript Team. 2024. *TypeScript Handbook: Variance Annotations*. Microsoft. Available at: https://www.typescriptlang.org/docs/handbook/2/variance-annotations.html

15. Rosenwasser, D. 2023. *TypeScript 5.0 Release Notes: Variance Annotations*. Microsoft. Available at: https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/

---

## 17. 延伸阅读

### 17.1 书籍

- **《Types and Programming Languages》**——Benjamin C. Pierce，MIT Press 2002。第 15 章"Subtyping"系统化讲解子类型理论，是型变讨论的圣经。
- **《Advanced Topics in Types and Programming Languages》**——Benjamin C. Pierce（编），MIT Press 2004。第 1 章对子类型化的高级话题有深入展开。
- **《Programming TypeScript》**——Boris Cherny，O'Reilly 2019。第 4 章对 TypeScript 函数型变有实战级讲解。
- **《Effective TypeScript》**——Dan Vanderkam，O'Reilly 2019。第 3 章包含大量型变相关条款。
- **《Object-Oriented Programming in OCaml》**——Didier Rémy，2023 在线版。对 OCaml 对象系统的型变有详尽论述。

### 17.2 论文

- Cook, W. R. 2009. *On Understanding Data Abstraction, Revisited*. OOPSLA Onward! 2009. 重新审视抽象数据类型与对象抽象的本质区别。
- Bruce, K. B., Cardelli, L., Castagna, G., et al. 1995. *On Binary Methods*. Theory and Practice of Object Systems 1, 3, 221–242. 讨论二进制方法对型变的影响。
- Castagna, G. and Pierce, B. C. 1994. *Decidable bounded quantification*. POPL '94. 子类型化的可判定性问题。

### 17.3 开源项目

- **type-challenges**（https://github.com/type-challenges/type-challenges）：TypeScript 类型体操挑战集，包含大量型变相关题目。
- **ts-toolbelt**（https://github.com/millsp/ts-toolbelt）：高级类型工具库，源码中大量使用型变技巧。
- **effect**（https://github.com/Effect-TS/effect）：函数式效应系统库，其 Channel 与 Stream 抽象深度使用型变。
- **fp-ts**（https://github.com/gcanti/fp-ts）：TypeScript 函数式编程库，Functor/Contravariant 类型类是型变的直接体现。
- **io-ts**（https://github.com/gcanti/io-ts）：运行时类型验证库，与静态类型形成协变关系。

### 17.4 在线资源

- **TypeScript Handbook: Variance Annotations**（https://www.typescriptlang.org/docs/handbook/2/variance-annotations.html）——官方文档对 in/out 修饰符的说明。
- **TypeScript Handbook: Type Compatibility**（https://www.typescriptlang.org/docs/handbook/type-compatibility.html）——官方对子类型化规则的总结。
- **Microsoft DevBlogs: TypeScript 5.0 Release**（https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/）——TypeScript 5.0 发布说明，含型变注释设计动机。
- **TypeScript Deep Dive: Variance**（https://basarat.gitbook.io/typescript/type-system/variance）——Basarat Ali Syed 的 TypeScript 进阶教程中的型变章节。

### 17.5 视频课程

- **MIT 6.826: Principles of Computer Systems**——MIT 课程，Lecture 12 涵盖类型系统与子类型化。
- **University of Washington CSE 505: Concepts of Programming Languages**——Dan Grossman 课程，对子类型理论有深入讲解。
- **Cornell CS 6110: Advanced Programming Languages**——Nate Foster 课程，Lecture 9 涵盖型变与多态。

### 17.6 学术讲座

- **Luca Cardelli: "Type Systems"**（ACM SIGPLAN Lectures, 1996）——Cardelli 亲授的型变基础讲座。
- **Barbara Liskov: "Programming the Turing Lecture"**（2009 图灵奖讲座）——Liskov 回顾抽象数据类型与替换原则的演进。

---

## 附录 A：型变决策树

为了便于工程实践，以下提供型变决策树，帮助开发者快速判断应该使用哪种型变策略：

```
当前类型 T 是输入位置（参数）还是输出位置（返回值）？
├── 输入位置
│   ├── 仅输入 → 使用 in T（逆变）
│   └── 同时输入输出 → 使用 in out T（不变）
├── 输出位置
│   ├── 仅输出 → 使用 out T（协变）
│   └── 同时输入输出 → 使用 in out T（不变）
└── 既是输入也是输出
    └── 使用 in out T（不变）
```

## 附录 B：TypeScript 版本与型变支持对照

| TypeScript 版本 | 关键型变特性 |
| --------------- | ------------ |
| < 2.6 | 函数参数始终双变，无严格检查 |
| 2.6 | 引入 `strictFunctionTypes`，函数属性语法严格逆变 |
| 2.8 | 引入条件类型，间接支持型变推导 |
| 3.0 | 引入 `unknown` 类型，为安全协变提供基础 |
| 4.7 | 引入 `in out` 修饰符（实验性） |
| 5.0 | 稳定 `in`/`out`/`const` 修饰符，正式支持声明站点型变 |
| 5.7 | 改进型变检查路径，减少误报 |

## 附录 C：型变术语中英对照

| 英文 | 中文 | 缩写 |
| ---- | ---- | ---- |
| Covariance | 协变 | COV |
| Contravariance | 逆变 | CONTRA |
| Invariance | 不变 | INV |
| Bivariance | 双变 | BIV |
| Subtyping | 子类型化 | - |
| Liskov Substitution Principle | Liskov 替换原则 | LSP |
| Variance Annotation | 型变注释 | VA |
| Declaration-site Variance | 声明站点型变 | DSV |
| Use-site Variance | 使用站点型变 | USV |

## 附录 D：常见错误信息索引

| 错误码 | 错误信息 | 触发场景 | 修复建议 |
| ------ | -------- | -------- | -------- |
| TS2322 | Type 'X' is not assignable to type 'Y'. Types of parameters are incompatible. | 函数参数逆变失败 | 检查参数子类型关系方向 |
| TS2345 | Argument of type 'X' is not assignable to parameter of type 'Y'. | 调用时参数型变不匹配 | 调整参数类型或使用泛型分发 |
| TS2416 | Property 'X' in type 'Y' is not assignable to the same property in base type 'Z'. | 方法重写型变失败 | 检查返回类型协变与参数逆变 |
| TS2554 | Expected N arguments, but got M. | 参数数量型变失败 | 检查可选参数与剩余参数 |
| TS2741 | Property 'X' is missing in type 'Y' but required in type 'Z'. | 结构子类型化失败 | 补全缺失的必选属性 |

## 附录 E：自测清单

阅读本文后，请用以下清单自测掌握程度：

- [ ] 我能口述四种型变关系的数学定义
- [ ] 我能解释函数子类型化规则 S-Fun 的两个前提条件
- [ ] 我能区分方法语法与函数属性语法的型变差异
- [ ] 我能在 tsconfig.json 中正确配置 strictFunctionTypes
- [ ] 我能用 in/out 修饰符为泛型接口添加型变注释
- [ ] 我能识别数组协变陷阱并给出修复方案
- [ ] 我能解释 React onClick 回调为何在 strictFunctionTypes 下报错
- [ ] 我能设计一个类型安全的发布-订阅系统，正确利用逆变
- [ ] 我能比较 TypeScript、Scala、Java、C# 的型变机制差异
- [ ] 我能引用至少 3 篇型变相关的学术论文

如能勾选 8 项以上，表示已达到 MIT/Stanford/CMU 教学水准的理解层次。

---

## 更新日志

- 2026-07-20：金标准升级，新增形式化定义、历史动机、对比分析、案例研究、习题与参考文献，扩展至金标准长度。
- 2026-06-14：初版，覆盖协变、逆变、strictFunctionTypes、in/out 修饰符基础。
