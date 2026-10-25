---
order: 470
title: infer 专题：在类型层占位与推导
module: 'typescript'
category: 前端技术
difficulty: advanced
description: 430 讲条件与分发，本篇专讲 infer：在 extends 右侧占位，从函数签名、数组、元组、Promise 中推出内部类型；四类经典推导模式与递归条件类型入门 DeepPromise，附 infer 位置错误与同名占位的真实报错调试实录。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'typescript/430-ConditionalTypeDistribute'
  - 'typescript/450-TypeCompositionPractice'
  - 'typescript/490-UtilityTypePrinciple'
  - 'typescript/510-RecursiveTypeDeepOperation'
prerequisites:
  - 'typescript/430-ConditionalTypeDistribute'
---

## 前置知识

- 已完成 [430 条件类型与分发](/typescript/430-ConditionalTypeDistribute)：会写 `T extends U ? X : Y`，知道裸类型参数在联合上会分发、`[T]` 包裹能阻止分发。

分工一句话：**430 讲条件类型怎么「问」怎么「分发」；本篇只讲 infer——在 extends 右侧占位，让编译器把对齐位置的类型填进来；组装成生产级工具是 [450 篇](/typescript/450-TypeCompositionPractice) 的任务。**

## 学习目标

读完本文你将能够：

1. 用 `infer V` 在 extends 右侧占位，从 Promise、函数、数组元组中提取内部类型；
2. 掌握返回值、参数、数组元组、Promise 四类经典推导模式；
3. 解释推导结果由占位位置决定，识别 infer 写错位置的报错；
4. 写出第一个递归条件类型 DeepPromise，指出递归出口；
5. 用 never 探针和真实报错调试 infer 问题。

预计 50 到 70 分钟，包含 3 组修改实验与 2 道练习。

## 1. 你现在要解决什么问题

你在给游戏接一个第三方战报 SDK，它只给你一个函数声明：

```typescript
type BattleReport = { winner: string; rounds: number };
declare function fetchBattleReport(): Promise<BattleReport>;
```

你想写带缓存的包装、给报告字段做映射，需要「fetchBattleReport 返回什么」这个类型。第一反应是手抄：

```typescript
type ReportAlias = BattleReport; // 手抄
```

能跑。但 SDK 升级把返回值改成 `Promise<BattleReport | null>` 那天，手抄的类型不会跟着变，编译器也不会提醒——两者没有任何联系。你需要的是把类型和 `Promise<...>` 模式对齐，从对齐位置**取**出里面的类型。430 的条件类型会问「是不是」，答不上「里面是什么」，infer 就为此而生。

## 2. infer：extends 右侧的占位符

```typescript
type UnwrapPromise<T> = T extends Promise<infer V> ? V : T;

type U1 = UnwrapPromise<Promise<number>>; // number
type U2 = UnwrapPromise<string>;          // string
```

读法：拿 T 和模式 `Promise<infer V>` 对齐。T 是 Promise 包着什么，就对齐成功，「什么」被填进占位符 V，取真分支；对不上走假分支。U1 的 V 填上 number；U2 对不上，原样返回。

类比解构赋值：`const { winner } = report` 从对象取值，条件类型从类型取类型。V 只在这个条件类型里有效，和函数形参一样是局部的。

## 3. 四类经典推导模式

### 3.1 函数返回值

```typescript
function rollDice(): number { return 6; }

type MyReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : never;

type D = MyReturnType<typeof rollDice>; // number
```

占位符在返回值位置，R 推出的就是返回值类型。两个 extends 有分工：泛型约束（070 篇）在门口拦下非函数，问句里的 extends 才做匹配。

### 3.2 函数参数

```typescript
type JoystickHandler = (dx: number, dy: number) => void;

type MyParameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never;

type J = MyParameters<JoystickHandler>; // [number, number]
```

占位符挪到参数位置，P 是参数元组。同一个模式，占位位置决定推什么。内置 ReturnType 与 Parameters 就是这两个写法（拆解见 [工具类型实现原理](/typescript/490-UtilityTypePrinciple)）。

### 3.3 数组与元组

```typescript
type ElementOf<T> = T extends (infer E)[] ? E : never;
type Head<T extends readonly any[]> = T extends readonly [infer F, ...any[]] ? F : never;
type Last<T extends readonly any[]> = T extends readonly [...any[], infer L] ? L : never;

type E1 = ElementOf<string[]>; // string
type H1 = Head<[1, 2, 3]>;     // 1
type L1 = Last<[1, 2, 3]>;     // 3
```

元组模式按位置匹配：`[infer F, ...any[]]` 表示「至少一个元素，第一个是 F，剩下不关心」。readonly 为了兼容 `as const` 的只读元组。

### 3.4 Promise 与多占位

```typescript
type FunctionInfo<T> = T extends (...args: infer Args) => infer Return
  ? { args: Args; return: Return }
  : never;

type Info = FunctionInfo<(slot: number, tag: string) => boolean>;
// { args: [number, string]; return: boolean }
```

一个模式可以放多个占位符，各占各的位置——前提是名字不同。同名占位符见第 6 节错误三。

## 4. 修改实验

实验一：取第二个元素。

```typescript
type Second<T extends readonly any[]> = T extends readonly [any, infer S, ...any[]] ? S : never;

type S1 = Second<[1, 2, 3]>; // 预测：？
type S2 = Second<[1]>;       // 预测：？
```

参考结果：S1 是 2；S2 模式对不上，走假分支得 never。探针验证：`const probe: never = null as unknown as S2;` 不报错就对了。

实验二：一个类型同时拆 Promise 和数组。

```typescript
type UnwrapAll<T> =
  T extends Promise<infer V> ? V :
  T extends (infer E)[] ? E :
  T;

type W1 = UnwrapAll<Promise<string[]>>; // 预测：？
```

参考结果：string。嵌套结构只拆了一层——想拆到底，见第 5 节。

实验三：把 3.2 的 infer P 从参数位置搬到返回值位置，写成 `T extends (...args: any) => infer P ? P : never`，再悬停 MyParameters<JoystickHandler>。

参考结果：P 推出的是 void——占位符写在哪，就推哪里的类型。请真的动手做一次，第 6 节错误二就来自这里。

## 5. 递归条件类型入门：DeepPromise

先试着不用递归拆两层：

```typescript
type UnwrapTwice<T> = T extends Promise<infer V>
  ? V extends Promise<infer W> ? W : V
  : T;

type T3 = UnwrapTwice<Promise<Promise<Promise<number>>>>; // 悬停：Promise<number>
```

三层就拆不干净了，四层五层呢？手写嵌套没有尽头。规律：每层处理完全一样——「是 Promise 就拆，拆出来还是 Promise 就再来一遍」。把「再来一遍」写成调用自己，就是递归条件类型：

```typescript
type DeepPromise<T> = T extends Promise<infer V> ? DeepPromise<V> : T;

type R1 = DeepPromise<Promise<Promise<string>>>; // string
type R2 = DeepPromise<number>;                   // number
```

递归三要素：模式匹配（`Promise<infer V>`）每层拆包；递归调用（`DeepPromise<V>`）继续；**出口是假分支的 T**——不再是 Promise 就原样返回。忘了出口的递归类型，和忘了终止条件的 while 是同一种事故。

提醒：类型递归深度有限制，五十层上下就可能撞墙，报错与解法在 450 篇结合实战讲；系统化设计见 [递归类型深操作](/typescript/510-RecursiveTypeDeepOperation)。

## 6. 常见错误与调试实录

以下报错文本均为 TypeScript 6.0 实测，不同版本措辞可能微调。

错误一：infer 写在 extends 之外。

```typescript
type Q = { a: infer U };
```

```text
error TS1338: 'infer' declarations are only permitted in the 'extends' clause of a conditional type.
```

infer 只能在条件类型的 extends 右侧当占位符。想表达「取出 a 的类型」，改成 `T extends { a: infer U } ? U : never`。

错误二：infer 写在真分支里。

```typescript
type Bad<T> = T extends Array<infer E> ? Array<infer F> : never;
```

```text
error TS1338: 'infer' declarations are only permitted in the 'extends' clause of a conditional type.
```

同一个报错的第二种触发：真分支是「使用」占位符的地方（E 已推出，直接用），只有 extends 右侧能「声明」占位符。要第二个类型，就对 E 再推一层。

错误三：同名占位符的合并行为。

```typescript
type Both<T> = T extends [infer X, infer X] ? X : never;

type B1 = Both<[string, string]>; // string
type B2 = Both<[string, number]>; // 悬停：？
```

B2 是 `string | number`——不是报错也不是传闻中的 never：同名占位符的多个推导结果合并成联合。探针验证：

```typescript
const probe: never = null as unknown as B2;
```

```text
error TS2322: Type 'string | number' is not assignable to type 'never'.
  Type 'string' is not assignable to type 'never'.
```

报错把真实结果直接打印出来——探针的另一层用法：让编译器替你把类型「说」出来。要两个独立占位符就起两个名字（3.4 节 FunctionInfo）。

错误四：忘了传类型参数。

```typescript
type UnwrapPromise<T> = T extends Promise<infer V> ? V : T;
type R = UnwrapPromise;
```

```text
error TS2314: Generic type 'UnwrapPromise' requires 1 type argument(s).
```

条件类型也是泛型，必须给实参。常见于漏写尖括号：看 TS2314 的类型名，找到使用处，补上实参。

## 7. 实际项目中的使用场景

- 挖三方库的内部类型：返回结构没导出声明时，`MyReturnType<typeof fn>` 一条挖出来；
- 包装与转发：写装饰器、事件总线时用 MyParameters 保住参数签名；
- 异步链清洗：UnwrapPromise 拆一层，配合 NonNullable（430 篇）收掉 null；
- 什么时候不用：类型触手可及时别硬推，直接 import 官方导出的类型更便宜。

## 8. 小练习

预测题（5 分钟，先写答案，再悬停验证）：

```typescript
type Box<V> = { value: V };
type Open<T> = T extends Box<infer V> ? V : never;

type P1 = Open<Box<"gold" | "silver">>; // 预测：？
type P2 = Open<Box<Box<number>>>;       // 预测：？
```

挑战题（30 分钟）：实现两个类型，用断言自测（不报错即通过）。

1. `Tail<T>`：去掉元组第一个元素，返回剩下的元组。验收断言：

```typescript
const t: [2, 3] = null as unknown as Tail<[1, 2, 3]>;
```

2. `DeepArray<T>`：递归拆掉任意层嵌套数组，返回元素类型。验收断言：

```typescript
const s: string = "" as unknown as DeepArray<string[][][]>;
```

提示（先想再做）：Tail 的模式和 Head 相反，占位符放在 rest 位置收集「剩下的」；DeepArray 和 DeepPromise 同构，把 Promise 换成数组、拆包换成取元素。展开提示：`type Tail<T extends readonly any[]> = T extends readonly [any, ...infer R] ? R : never;` 与 `type DeepArray<T> = T extends (infer E)[] ? DeepArray<E> : T;`。

## 9. 与之前和之后的知识的关系

- 往前：430 的分发在本篇继续生效——UnwrapPromise 传 `Promise<string> | number` 会分发成 `string | number`，模式匹配逐成员做；
- 往后：450 篇把推导模式和分发组装成 DeepReadonly、MyAwaited、ParametersToObject，并讨论递归深度与可维护性边界；
- 更远：510 篇系统化递归设计；490 篇用 infer 拆解全部内置工具类型。

## 10. 官方文档

- infer 官方章节（Inferring Within Conditional Types）：https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#inferring-within-conditional-types
- 条件类型总览：https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
- 内置工具类型（ReturnType/Parameters 定义）：https://www.typescriptlang.org/docs/handbook/utility-types.html

## 11. 自我检查

- 能口述 infer 的机制：extends 右侧占位、模式对齐、对齐位置填占位符；
- 能徒手写出 MyReturnType、MyParameters、Head、UnwrapPromise 四个模式；
- 拿到 TS1338 能立刻说出「infer 位置错了」并改正；
- 能写出 DeepPromise 并指出递归出口；
- 知道同名 infer 会合并成联合，会用 never 探针让编译器把类型「说」出来。

## 本章总结

infer 让条件类型从「选答案」升级为「取内容」：extends 右侧占位，编译器拿实参和模式对齐，把对齐位置的类型填进占位符。四个必会模式：返回值、参数、数组元组、Promise。递归条件类型 = 模式匹配 + 自调用 + 假分支出口。两个坑：infer 只能活在 extends 右侧（TS1338），同名占位符合并为联合而不是报错。

## 下一步

进入 [450 组合实战](/typescript/450-TypeCompositionPractice)。预告分工：430 的分发、本篇的 infer 在那里被组装成三个真实工具，并划出「什么时候不该写复杂类型」的边界。
