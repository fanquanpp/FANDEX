---
order: 160
title: 类型推断深入（拓宽与收窄）
module: 'typescript'
category: 前端技术
difficulty: intermediate
description: TypeScript 类型推断的完整规则：字面量拓宽、const 与 let 差异、最佳公共类型、上下文类型推断与泛型推断。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'typescript/170-ConstAssertion'
  - 'typescript/110-LiteralUnionTypes'
  - 'typescript/180-SatisfiesOperator'
  - 'typescript/360-TsconfigStrictMode'
prerequisites:
  - 'typescript/080-BasicTypeSystem'
  - 'typescript/110-LiteralUnionTypes'
---

## 0. 学习目标（可验证）

- [ ] 能解释为什么 `let x = 1` 推断为 `number`，而 `const x = 1` 推断为 `1`
- [ ] 能说出字面量拓宽（literal widening）发生的三种常见位置
- [ ] 能解释"最佳公共类型"如何决定数组推断结果
- [ ] 能用上下文类型推断解释事件回调参数为什么自动有类型
- [ ] 能说出 `noImplicitAny` 开启后隐式 any 的来源与修法

## 1. 一句话理解

> 类型推断 = 编译器当侦探：**从值本身找线索**（上行推断），**从使用场景找线索**（下行推断），两边证据合起来得出最合理的类型。

## 2. 两条推断路线

```typescript
// 上行推断：从初始化值推断
let age = 30; // age: number
const name = "Alice"; // name: "Alice"

// 下行推断：从使用场景推断（上下文类型）
const nums = [1, 2, 3];
nums.forEach((n) => n.toFixed(2)); // n 自动是 number，因为数组元素是 number

// 混合：参数类型来自上下文，返回值类型来自函数体
const doubled = nums.map((n) => n * 2); // doubled: number[]
```

**拆解化讲解：**

（1）`let age = 30` 没有类型注解，编译器看初始值是数字字面量 `30`，但 `let` 声明"以后可能改"，所以拓宽成 `number`；

（2）`const name = "Alice"` 永远不能重新赋值，编译器保留最精确的字面量类型 `"Alice"`；

（3）`forEach` 的回调参数 `n` 的类型来自"数组元素是 number"这个上下文，不需要手写注解；

（4）真实项目中大多数代码都不需要类型注解，靠的就是这两条推断路线。

## 3. 字面量拓宽（literal widening）

**拓宽**指编译器把精确的字面量类型（`1`、`"hi"`、`true`）放宽为对应的基础类型（`number`、`string`、`boolean`）。

```typescript
// 场景一：let 声明的变量
let count = 1; // count: number（不是 1）
count = 2; // 合法

// 场景二：对象属性
const config = { mode: "dev" };
// config.mode 的类型是 string，不是 "dev"

// 场景三：数组元素
const directions = ["up", "down"]; // directions: string[]，不是 ("up" | "down")[]
```

**拆解化讲解：**

（1）`let` 变量以后可以改，保留 `1` 这种类型会让 `count = 2` 报错，所以拓宽成 `number` 是合理的默认；

（2）对象属性同理：属性可以被重新赋值，`config.mode` 拓宽成 `string`；

（3）数组元素会被拓宽，因为元素可能被替换；这常让初学者困惑"为什么我的字面量数组变成 string[] 了"。

**控制拓宽的三种手段**：类型注解（`const mode: "dev" = "dev"`）、`as const` 断言（见 `ConstAssertion`）、`satisfies`（见 `049-SatisfiesOperator`）。注意：`as const` 不只阻止拓宽，还会递归地把属性变成 readonly、数组变成元组。

## 4. const 与 let 推断差异对照表

| 声明方式 | 初始值 | 推断结果 | 原因 |
| --- | --- | --- | --- |
| `const a = 1` | `1` | `1`（字面量） | 不可重新赋值，保留最精确类型 |
| `let b = 1` | `1` | `number` | 可重新赋值，需要宽松类型 |
| `const c = { x: 1 }` | 对象 | `{ x: number }` | 属性可变，属性值拓宽 |
| `const d = [1, 2]` | 数组 | `number[]` | 元素可变，元素类型拓宽 |
| `const e = [1, 2] as const` | 数组 | `readonly [1, 2]` | 断言禁止拓宽与修改 |

**最容易被忽略的一点**：`const` 只保证"变量本身不能重新赋值"，不保证"对象属性不能改"。所以对象的属性类型照样拓宽，想同时锁死属性要用 `as const`。

## 5. 最佳公共类型（best common type）

当编译器需要为一个数组或一组表达式推断类型时，它会寻找所有元素类型的"最佳公共类型"——通常是最窄的父类型。

```typescript
const a = [1, 2, 3]; // number[]
const b = [1, "two", true]; // (string | number | boolean)[]
const c = [null, undefined]; // (null | undefined)[]（strictNullChecks 开启时）

// 有共同父类型时取父类型
interface Animal { name: string }
interface Dog extends Animal { bark(): void }
interface Cat extends Animal { meow(): void }

const pets: Animal[] = [dog, cat]; // 手动注解时按 Animal 收拢
```

**拆解化讲解：**

（1）同类型元素数组直接推断为该类型数组；

（2）不同类型元素推断为联合类型数组；如果存在共同父类型且目标位置需要，编译器会向上收拢；

（3）实践中"手动注解数组类型"比"依赖编译器找公共类型"更可控，尤其是对象数组。

## 6. 上下文类型推断（contextual typing）

推断不只看"值"，也看"值被放到哪里"。

```typescript
// 事件回调：参数类型由 DOM 事件上下文提供
document.querySelector("button")?.addEventListener("click", (event) => {
  event.clientX; // event 自动是 MouseEvent
});

// 类型注解的位置提供上下文
const handler: (x: number) => void = (x) => x.toFixed(2);

// 泛型调用：参数和返回值互相提供线索
function pick<T>(obj: T, key: keyof T): T[keyof T] {
  return obj[key];
}
const user = { name: "Alice", age: 30 };
const result = pick(user, "name"); // result: string
```

**拆解化讲解：**

（1）`addEventListener` 的回调参数 `event` 没有注解，但事件类型注册表提供了 `MouseEvent` 上下文，所以不用手写；

（2）`handler` 的箭头函数参数 `x` 从左侧注解获得 `number`；

（3）`pick(user, "name")` 通过实参推断出 `T = { name: string; age: number }`，再结合 `"name"` 推断返回值类型 `string`；改传 `"age"`，返回值自动变成 `number`——这就是泛型推断的价值。

## 7. 返回类型推断与递归

```typescript
// 返回值推断
function add(a: number, b: number) {
  return a + b; // 返回类型自动推断为 number
}

// 递归函数需要显式注解返回类型
function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}
```

**拆解化讲解：**

（1）普通函数返回类型可以从 `return` 语句推断，不必手写；

（2）递归函数如果不注解返回类型，编译器无法在自引用处确定类型，会产生隐式 any 或推断失败，所以递归函数必须写返回类型；

（3）库作者通常显式写返回类型，因为这是公共 API 的一部分，推断结果变化会破坏调用方。

## 8. 泛型推断的候选与约束

```typescript
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

const n = first([1, 2, 3]); // T 推断为 number，n: number | undefined
const s = first(["a", "b"]); // T 推断为 string，s: string | undefined

// 带约束的泛型：候选类型必须满足约束
function nameOf<T extends { name: string }>(obj: T): string {
  return obj.name;
}
nameOf({ name: "A", age: 1 }); // T = { name: string; age: number }
// nameOf({ age: 1 }); // 报错：缺少 name，不满足约束
```

**拆解化讲解：**

（1）泛型参数 `T` 由调用实参推断，多个位置互相约束（`T[]` 与 `T`）；

（2）`extends` 约束是"下限门槛"：候选类型必须至少具备约束要求的成员；

（3）推断失败时编译器会退化为约束本身或报错，宁可在推断处明确注解，也不要依赖隐式行为。

## 9. noImplicitAny 与隐式 any

`noImplicitAny` 开启（strict 模式默认开启）后，编译器会拒绝"推断不出来、又没有注解"的 any。

```typescript
// 报错（noImplicitAny）：参数类型无法推断
// function log(item) {
//   console.log(item);
// }

// 修法一：显式注解
function log(item: unknown) {
  console.log(item);
}

// 修法二：泛型
function log2<T>(item: T): T {
  console.log(item);
  return item;
}
```

**拆解化讲解：**

（1）"隐式 any"指没有注解、编译器也无法推断的 any，它会悄悄关闭类型检查；

（2）`noImplicitAny` 把这种沉默变成报错，逼你显式选择；

（3）修法优先 `unknown` 或泛型，而不是直接写 `any`，这样既保留检查又保持灵活性。

## 10. 收窄（narrowing）与推断的关系

收窄是**运行时分支后**对类型的细化，与推断互补：推断决定"一开始是什么类型"，收窄决定"走到这里是什么类型"。

```typescript
function show(input: string | number) {
  if (typeof input === "string") {
    // 这里 input 收窄为 string
    console.log(input.toUpperCase());
  } else {
    // 这里 input 收窄为 number
    console.log(input.toFixed(2));
  }
}
```

收窄的完整机制（typeof、in、instanceof、类型谓词、穷尽检查）见 `010-LocalTypeInference` 与 `016-TypeGuardCustomGuard`。本篇只需要记住：**收窄不改变推断，只改变某个代码位置上的可见类型**。

## 11. 常见错误与修正（错-对对比）

**错误 1：以为 const 对象的属性也是字面量类型**

```typescript
const config = { mode: "dev" };
// config.mode 是 string，不是 "dev"
// 对：需要精确类型时用 as const
const config2 = { mode: "dev" } as const; // mode: "dev"
```

**错误 2：数组推断比预期宽**

```typescript
const dirs = ["up", "down"];
// dirs 是 string[]；如果希望是 ("up" | "down")[]：
const dirs2 = ["up", "down"] as const; // readonly ["up", "down"]
```

**错误 3：递归函数不写返回类型**

```typescript
// 错：递归自引用导致返回类型推断为 any 或失败
// function factorial(n: number) {
//   return n <= 1 ? 1 : n * factorial(n - 1);
// }
// 对：显式写返回类型
function factorialOk(n: number): number {
  return n <= 1 ? 1 : n * factorialOk(n - 1);
}
```

**错误 4：把上下文类型推断当成万能**

```typescript
// 错：脱离上下文后参数失去类型
// const fn = (x) => x.toFixed(2); // 报错：x 隐式 any
// 对：没有上下文时显式注解
const fn = (x: number) => x.toFixed(2);
```

## 12. 动手试试

**入门版**：依次声明 `let a = 1`、`const b = 1`、`const c = { n: 1 }`、`const d = [1, 2]`，用编辑器的悬浮提示查看各自类型，并解释差异。

**进阶版**：实现 `function merge<T extends object, U extends object>(a: T, b: U): T & U`，调用 `merge({ a: 1 }, { b: "x" })`，验证返回值类型为 `{ a: number } & { b: string }`，再尝试传入不含对象的参数观察约束报错。

## 13. 常见疑问 FAQ

**Q1：为什么 `let x = 1` 不推断成字面量 `1`？**

因为 `let` 允许重新赋值，字面量类型会让 `x = 2` 报错。编译器默认"变量会变"，所以拓宽；`const` 不会变，才保留字面量。

**Q2：想保留字面量类型有什么办法？**

三种：显式类型注解、`as const`、`satisfies`。三者的差别见 `ConstAssertion` 与 `049-SatisfiesOperator`。

**Q3：为什么我的数组推断成 `string[]` 而不是联合字面量？**

数组元素可被替换，默认拓宽。想精确控制用 `as const`，想只读用 `readonly` 元组注解。

**Q4：函数参数什么时候可以省略注解？**

回调参数在调用点有上下文类型时可以不写；顶层独立函数、没有上下文的箭头函数必须写，否则触发 `noImplicitAny`。

**Q5：上下文类型推断会影响返回值吗？**

会。例如 `const f: () => number = () => 1` 中返回值 `1` 被上下文 `number` 约束，但函数体自身推断通常优先；两者冲突时以函数体推断为准并检查是否兼容上下文。

## 14. 自测（小测验）

**第 1 题（填空）**：`let x = "a"` 的推断类型是____；`const x2 = "a"` 的推断类型是____。

**第 2 题（单选）**：`const arr = [1, "a"]` 的推断类型是？

**第 3 题（判断）**：递归函数可以不写返回类型吗？

<details>
<summary>点击查看答案</summary>

1. `string`；`"a"`。
2. `(string | number)[]`（联合类型数组）。
3. 不建议且通常不行：递归自引用需要显式返回类型，否则会产生隐式 any 或推断失败。

</details>

## 15. 一句话记住

> let 拓宽、const 保留；值给线索（上行）、场景给线索（下行）；数组取公共类型，递归必须注解。

## 扩展阅读

- `ConstAssertion`：as const 如何彻底阻止拓宽；
- `049-SatisfiesOperator`：既要校验又要保留精确类型的第三条路；
- `010-LocalTypeInference`：字面量类型、联合类型与收窄的完整讲解；
- `057-TsconfigStrictMode`：noImplicitAny 与其他 strict 开关。
