---
order: 190
title: satisfies 的形式语义与类型论视角
module: 'typescript'
category: 前端技术
difficulty: advanced
description: 把 satisfies 的行为写成严格规则：语法位置约束、三条求值规则（注解 / 断言 / satisfies）、子类型关系与记忆性质，面向想理解「编译器为什么这样判」的读者。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'typescript/180-SatisfiesOperator'
  - 'typescript/710-TypeScriptTheory'
  - 'typescript/190-NeverTypeSemantics'
  - 'typescript/260-CovarianceContravariance'
prerequisites:
  - 'typescript/180-SatisfiesOperator'
  - 'typescript/160-TypeInferenceDeepDive'
---

## 学习目标

- [ ] 能写出 `: T`、`as T`、`satisfies T` 三条求值规则，并说清三者结果类型的差异
- [ ] 能用「子类型方向」解释为什么 satisfies 只允许单向、而 as 允许双向
- [ ] 能说出 satisfies 的语法位置约束（哪些地方能写、哪些地方不能写）
- [ ] 能用三条记忆性质推导组合写法（如 `as const satisfies T`）的类型结果

> 本文是 [180：satisfies 操作符](/typescript/180-SatisfiesOperator) 的严格版。记号采用类型论惯用写法：`Γ ⊢ e : T` 读作「在环境 Γ 下，表达式 e 的类型是 T」；`S <: T` 读作「S 是 T 的子类型」。第一遍阅读可以只看每节的「人话版」。

## 0. 为什么需要一份严格版

180 篇给了结论：satisfies「只验证、不拓宽」。但只要多问一个「为什么」，结论就不够用了：

- 为什么 `as` 能双向转，satisfies 只能单向？
- 为什么 satisfies 的结果类型是「原类型」，注解的结果类型是「注解类型」？
- `as const satisfies T` 为什么必须这个顺序？

这些问题的答案都写在编译器的类型规则里。本文把规则摆出来，让 180 篇的现象变成可推导的必然。

## 1. 语法位置约束

`satisfies` 是中缀表达式操作符，左侧是表达式，右侧是类型：

```text
SatisfiesExpression → Expression "satisfies" Type
```

由此推出它能出现与不能出现的位置：

| 位置 | 能否使用 | 原因 |
| --- | --- | --- |
| 变量初始化 `const x = e satisfies T` | 可以 | 右侧是表达式 |
| 对象 / 数组字面量之后 | 可以 | 同上 |
| `return e satisfies T` | 可以 | return 后是表达式 |
| 函数返回类型注解 `function f(): T satisfies U` | 不可以 | 该位置语法上只接受类型，不是表达式 |
| 类型别名定义 `type A = B satisfies C` | 不可以 | 类型层没有 satisfies，它只作用于值表达式 |
| 泛型参数约束 `<T extends X>` | 不可以 | 约束用 `extends`，语义不同 |

**人话版**：satisfies 只活在「值的world」，类型的world里没有它。所以函数签名上想「验证 + 保留」，只能把 satisfies 写进函数体的 return 里。

## 2. 三条求值规则

设 `e` 的推断类型为 `Tₑ`，目标类型为 `T`。三种写法的规则可以写成统一格式（前提条件 → 结果类型）：

```text
类型注解    (e: T)      前提：Tₑ <: T            结果类型：T
类型断言    (e as T)    前提：Tₑ <: T 或 T <: Tₑ  结果类型：T
satisfies   (e satisfies T)  前提：Tₑ <: T        结果类型：Tₑ
```

三组对照读法：

1. **注解与 satisfies 的前提完全相同**（都要求 `Tₑ <: T`，即只允许「向上」通过赋值兼容检查），唯一差别是结果类型：注解返回 `T`，satisfies 返回 `Tₑ`。这就是「satisfies = 注解减去替换」。
2. **断言的前提是析取**（两个方向有一个成立即可），所以它允许「向下转型」，代价是放弃了检查强度；同时结果类型被覆盖为 `T`。
3. 检查强度排序：`satisfies` 与 `: T` 同级且最强，`as` 最弱。**安全性排序同理**——`as` 是唯一能掩盖真实类型错误的写法。

一个完整推导例子：

```typescript
type Shape = { kind: 'circle'; r: number } | { kind: 'square'; s: number };

const c = { kind: 'circle', r: 2 } satisfies Shape;
// Tₑ = { kind: "circle"; r: number }（对象字面量的推断类型）
// 检查：Tₑ <: Shape —— 是（Shape 的第一个成员方向兼容）
// 结果类型：Tₑ，于是 typeof c.kind 收窄为 "circle"

const c2 = { kind: 'circle', r: 2 } as Shape;
// 检查：Tₑ <: Shape 成立，通过；但结果类型被覆盖为 Shape
// 代价：typeof c2.kind 是 "circle" | "square"，信息反而变少了
```

注意第二点：当 `Tₑ` 本来就是 `T` 的子类型时，`as` 不仅不安全，还会**主动丢失信息**——这是很多人没想到的：断言的「类型变宽了」。

## 3. 子类型关系速览

satisfies 的检查建立在 TypeScript 的结构化子类型关系上，与本篇相关的最小规则集：

```text
自反：  T <: T
传递：  S <: T 且 T <: U  则 S <: U
底类型：never <: T（对一切 T 成立）
顶类型：T <: unknown（对一切 T 成立）
联合：  T <: U 且 T <: V   则 T <: U | V
字面量："hello" <: string，42 <: number，true <: boolean
对象：  { a: S } <: { a: T } 当且仅当 S <: T（字段类型逐个兼容，
        且源对象不能「多出」目标没有的属性——仅对新鲜字面量成立）
```

最后一条「新鲜字面量不能有多余属性」正是 180 篇里「多写键名会报错」的形式来源；赋值给变量后再传（不新鲜的字面量）则不再检查多余属性。这条不对称是「 excess property check（多余属性检查）」，属于赋值兼容性检查的一部分，satisfies 同样执行它。

## 4. 三条记忆性质

以下「性质」不是编译器规范条文，而是从第 2 节规则直接推出的推论，用于快速心算组合写法的结果类型。命名是记忆用的类比，不保证在任何形式系统中有对应定理。

**性质一（验证无感）**：若 `Tₑ <: T`，则 `e satisfies T` 的类型恒等于 `e` 的类型。satisfies 对合法表达式是「恒等变换」——它只可能让你编译失败，不可能改变类型。

推论：`(e satisfies T₁) satisfies T₂` 的类型就是 `e` 的类型，检查却要做两次。所以链式 satisfies 没有意义，一个就够。

**性质二（顺序固定）**：`as const` 改变表达式的类型（收窄 + 只读），satisfies 只做检查。要让检查发生在收窄之后，必须先收窄：

```text
(e as const) satisfies T   —— 合法：先得到 DeepReadonlyLiteral(Tₑ)，再检查它 <: T
e satisfies T as const     —— 语法上不存在：as const 不能挂在 satisfies 表达式之后
```

所以 `as const satisfies` 不是「两种操作的组合」，而是唯一的合法顺序。

**性质三（不加深）**：satisfies 的前提检查 `Tₑ <: T` 中，`Tₑ` 取的是「拓宽后的推断类型」。对象属性里的字面量在推断阶段就已拓宽为基类型，所以：

```typescript
{ x: 42 } satisfies { x: number }
// Tₑ = { x: number }（属性已拓宽），检查 trivially 通过，结果仍为 { x: number }
```

想让 `Tₑ` 本身携带字面量，唯一的入口是在推断阶段动手——也就是 `as const`。这解释了 180 篇的坑一：**satisfies 保留的是推断结果，而推断结果本身可能已经被拓宽过了。**

## 5. 与泛型推断的交互（形式视角）

泛型函数调用时，实参的类型参与 `T` 的推断。satisfies 表达式作为实参时，参与推断的是 `Tₑ`（验证后的保留类型）：

```typescript
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

const a = first([1, 2, 3] satisfies number[]);
// T 推断为 number —— 元组信息在推断前已被数组字面量的拓宽规则抹掉

const b = first([1, 2, 3] as const satisfies readonly [1, 2, 3]);
// 实参类型 readonly [1, 2, 3]，但参数类型是 T[]（可变数组），
// readonly 元组不能赋给可变数组——这里反而编译失败，
// 正确目标是 readonly 参数，或改用 ReadonlyArray<T>
```

这个例子给出两条实用规则：

1. `satisfies` **不会**帮泛型推断「加深」类型，加深要靠 `as const` 或 `const` 类型参数（TS 5.0 的 `<const T>`，见 670 篇）；
2. `as const` 产生的只读类型，与期望可变数组的参数不兼容——「保留字面量」和「随便传」不可兼得，写库 API 时要在参数类型上预留 `readonly`。

## 6. 自检

- [ ] 不看第 2 节，能默写出三条规则的「前提 + 结果类型」吗？
- [ ] `{ kind: 'circle' } as Shape` 为什么比 satisfies **信息更少**？能用 Tₑ 与 T 的方向解释吗？
- [ ] `as const satisfies` 为什么只有一个合法顺序？（提示：性质二 + 语法位置）
- [ ] 新鲜字面量「不能多写属性」的检查叫什么名字？它属于哪一步？

## 7. 练习

1. 用第 2 节的规则推导：`'yellow' satisfies 'red' | 'green' | 'blue'` 的检查在哪一条子类型规则上失败。
2. 设 `e = { a: 1 }`，`T = { a?: number }`。分别写出 `: T`、`as T`、`satisfies T` 的前提是否成立与结果类型。
3. 解释为什么 `({ x: 42 } as const) satisfies { readonly x: 42 }` 能通过，而 `({ x: 42 } as const) satisfies { x: number }` 也能通过——两个目标类型的差异在哪里？

## 8. 下一步

- [710：TypeScript 类型理论](/typescript/710-TypeScriptTheory)：类型系统的整体形式框架，本文记号在那里有系统版；
- [260：协变与逆变](/typescript/260-CovarianceContravariance)：`Tₑ <: T` 在函数类型上的展开方向；
- [190：never 类型的语义](/typescript/190-NeverTypeSemantics)：底类型规则 `never <: T` 的完整展开。
