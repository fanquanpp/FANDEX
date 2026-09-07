---
order: 160
title: never 类型完整语义
module: 'typescript'
category: 前端技术
difficulty: intermediate
description: never 作为空类型的完整语义：联合吸收、交叉吸收、穷尽检查、与 unknown 的对偶关系及其在泛型中的应用。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'typescript/013-LiteralUnionTypes'
  - 'typescript/018-IntersectionTypeMerge'
  - 'typescript/019-TypeGuardCustomGuard'
  - 'typescript/034-UtilityTypePrinciple'
prerequisites:
  - 'typescript/008-BasicTypeSystem'
  - 'typescript/013-LiteralUnionTypes'
---

## 0. 学习目标（可验证）

- [ ] 能说出 never 与 undefined、void、null 的本质区别
- [ ] 能解释为什么 `T | never` 等于 `T`，`T & never` 等于 `never`
- [ ] 能用 never 实现穷尽性检查
- [ ] 能说明 never 与 unknown 的对偶关系
- [ ] 能在自定义工具类型中正确使用 never

## 1. 一句话理解

> never 是"空类型"：它描述的是**一个值都不存在**的集合。不是"没有类型"，而是"类型里没有任何值"。

## 2. never 不是什么

初学者最容易把 never 和 undefined、void、null 混在一起，它们完全不同：

| 类型 | 集合中的值 | 白话 | 典型来源 |
| --- | --- | --- | --- |
| `undefined` | 只有 `undefined` 一个值 | "没给值" | 未初始化变量、可选属性缺省 |
| `null` | 只有 `null` 一个值 | "显式空" | 数据库空值、手动置空 |
| `void` | 只有 `undefined`（严格说） | "函数没有返回值" | 无返回值的函数 |
| `never` | 空集，一个值都没有 | "根本到不了这里" | 必然抛错、死循环、穷尽分支 |

```typescript
// undefined 是一个真实存在的值
let u: undefined = undefined;

// void 表示函数不返回有意义的值
function log(msg: string): void {
  console.log(msg);
}

// never 表示函数永不返回（必然抛异常或死循环）
function fail(message: string): never {
  throw new Error(message);
}

function loopForever(): never {
  while (true) {}
}
```

**拆解化讲解：**

（1）`undefined` 和 `null` 是"有一个值"，只是这个值表示空；

（2）`void` 表示"返回值没有意义"，调用 `log("x")` 仍会正常返回 `undefined`；

（3）`never` 表示"函数永远到不了正常返回"：要么抛异常中断，要么死循环。既然永远没有返回值，它就可以赋给任何类型。

## 3. 联合与交叉中的吸收规则

never 有两个在类型演算中极其重要的性质：

```typescript
// 规则一：联合吸收（union identity）
// T | never 化简为 T
type A = string | never; // 等价于 string

// 规则二：交叉吸收（intersection absorption）
// T & never 化简为 never
type B = { a: number } & never; // 等价于 never
```

**拆解化讲解：**

（1）联合是"或"：`string | never` 表示"要么 string，要么不可能"，不可能的分支被去掉，剩下 `string`；

（2）交叉是"且"：`{ a: number } & never` 表示"同时满足有 a 属性和没有任何值"，这不可能，所以结果是 `never`；

（3）这两条规则是条件类型分发（见 `032-ConditionalTypeDistribute`）和 `Exclude` 等工具类型能工作的基础。

## 4. 穷尽性检查（exhaustiveness check）

穷尽性检查是 never 最实用的场景：**把所有分支处理完，剩下的一定是 never**；如果漏了分支，剩下的就不是 never，编译器会报错。

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.side ** 2;
    default: {
      // 所有分支处理完，shape 在这里的类型是 never
      const exhaustive: never = shape;
      return exhaustive; // 永远不会执行到这里
    }
  }
}
```

**拆解化讲解：**

（1）`switch` 走完所有 case 后，`shape` 被收窄为"不在任何 case 中的部分"，也就是空集 `never`；

（2）`const exhaustive: never = shape` 是一个"类型级断言"：如果未来给 `Shape` 增加 `triangle` 分支但忘记处理，`shape` 在这里变成 `{ kind: "triangle" }`，赋值给 `never` 立即报错；

（3）这相当于把"漏分支"从运行时的静默错误变成编译期错误。

## 5. 类型守卫中的 never

自定义类型守卫返回 `x is never` 表示"这个检查永远为假"，常用于表达不可达分支；更常见的是用 never 配合收窄排除不可能的情况：

```typescript
function assertNever(value: never): never {
  throw new Error(`意外的值: ${JSON.stringify(value)}`);
}

type Event =
  | { type: "click"; x: number; y: number }
  | { type: "key"; key: string };

function handle(e: Event) {
  switch (e.type) {
    case "click":
      console.log(e.x, e.y);
      break;
    case "key":
      console.log(e.key);
      break;
    default:
      // 新增事件类型但忘记处理时，这里会报错
      assertNever(e);
  }
}
```

**拆解化讲解：**

（1）`assertNever(value: never)` 只接受 never；

（2）default 分支中 `e` 的类型收窄为 never 时才能调用；

（3）一旦联合类型新增成员，default 分支的 `e` 不再是 never，调用 `assertNever(e)` 报错，提醒你补分支。这是比"手动检查"更安全的模式。

## 6. never 与 unknown 的对偶

类型系统里 `unknown` 是"顶部类型"（所有类型的父类型），`never` 是"底部类型"（所有类型的子类型），二者互为对偶：

| 视角 | unknown（top） | never（bottom） |
| --- | --- | --- |
| 集合 | 所有值的全集 | 空集 |
| 赋值关系 | 任何类型都能赋给它 | 它能赋给任何类型 |
| 读取 | 必须先收窄才能用 | 永远不会有值可读 |
| 联合 | `T \| unknown` 化简为 `unknown` | `T \| never` 化简为 `T` |
| 交叉 | `T & unknown` 化简为 `T` | `T & never` 化简为 `never` |

```typescript
let top: unknown = 1; // 任何值都能赋给 unknown
const bottom: never = fail("boom"); // never 能赋给任何类型

// 对偶的实用含义：
// 收窄 unknown 的过程，就是把"全集"一步步缩小；
// 收窄联合类型到 never，说明"所有可能都被排除了"。
```

## 7. never 在泛型与工具类型中的角色

never 经常作为"过滤条件"参与类型计算：

```typescript
// Exclude<T, U> 的本质：把 U 中的类型从 T 中剔除
// 实现原理：T extends U ? never : T
type MyExclude<T, U> = T extends U ? never : T;

type Result = MyExclude<"a" | "b" | "c", "a">;
// 分发后：never | "b" | "c"，化简为 "b" | "c"

// 手动写一遍分发过程
// "a" extends "a" ? never : "a"  →  never
// "b" extends "a" ? never : "b"  →  "b"
// "c" extends "a" ? never : "c"  →  "c"
// never | "b" | "c" → "b" | "c"
```

**拆解化讲解：**

（1）条件类型对裸类型参数自动分发，命中条件的成员变成 `never`；

（2）再借助"联合吸收"规则，所有 `never` 自动消失，剩下的就是过滤结果；

（3）`Exclude`、`NonNullable`、`Omit`（内部用 Exclude）等工具类型都依赖这个机制，详见 `031-UtilityTypePrinciple`。

## 8. 常见错误与修正（错-对对比）

**错误 1：把 never 当成"没有类型"用**

```typescript
// 错：想表达"变量可能没有值"
// let x: never; // 没有任何值能赋给它，x 永远无法使用

// 对：表达"可能没有值"用 undefined 或联合
let y: string | undefined;
```

**错误 2：函数抛异常时返回类型写 void**

```typescript
// 错：函数必然抛错，却声明返回 void
// function die(): void {
//   throw new Error("bye");
// }

// 对：声明 never，调用方知道后续代码不可达
function die(): never {
  throw new Error("bye");
}
```

**错误 3：穷尽检查时漏掉 default 分支**

```typescript
// 错：没有 default，新增联合成员时没有编译期提醒
// 对：default 分支把收窄结果赋给 never，未来改动立刻报错
```

**错误 4：在联合类型里手动写 never**

```typescript
// 错：多此一举
// type T = string | never;
// 对：直接写 string，never 会被自动吸收
```

## 9. 动手试试

**入门版**：

1. 写一个 `function error(message: string): never`，在 `const n: number = error("x")` 中验证 never 能赋给 number；
2. 写 `type U = "a" | "b" | never`，用编辑器查看 U 化简后的类型。

**进阶版**：给 `area` 示例的 `Shape` 增加一个 `{ kind: "triangle"; base: number; height: number }` 成员，但不修改 `area`，观察穷尽性检查在哪里报错，再补全分支。

## 10. 常见疑问 FAQ

**Q1：never 和 void 能互换吗？**

不能。`void` 表示"函数正常返回但没有有意义的值"，`never` 表示"函数永不返回"。把抛异常函数声明成 `void` 会让调用方误以为后续代码会执行。

**Q2：为什么 `string | never` 是 string？**

联合是"或"，而 never 是空集；"要么字符串，要么空集里的值（不存在）"就等于"字符串"。

**Q3：never 能作为泛型默认值吗？**

可以，且常用：`type MyType<T = never> = ...` 表示"默认没有提供类型参数"，之后用 `T extends never` 之类判断是否显式传参。

**Q4：`assertNever` 一定要抛异常吗？**

不一定，也可以返回任意值（因为 never 可以赋给任何类型），但抛异常能让运行时问题可见，是最常用做法。

**Q5：条件类型里 never 为什么不分发？**

`never extends U` 本身成立（never 是任何类型的子类型），所以直接判断时结果为 true 分支；但 `never` 作为裸类型参数参与分发时不会产生任何成员（空集分发还是空集）。这是工具类型里常见的行为差异，详见 `032-ConditionalTypeDistribute`。

## 11. 自测（小测验）

**第 1 题（填空）**：`type A = number | never` 化简为____；`type B = number & never` 化简为____。

**第 2 题（单选）**：函数体是 `while (true) {}`，返回类型应声明为？

**第 3 题（判断）**：给联合类型新增成员后，带 default 穷尽检查的 switch 会不会报错？

<details>
<summary>点击查看答案</summary>

1. `number`；`never`。
2. `never`（死循环永不返回）。
3. 会。default 分支中收窄结果不再是 never，赋值给 never 或调用 assertNever 都会报错。

</details>

## 12. 一句话记住

> never 是空集：联合里自动消失、交叉里吞噬一切；函数永不返回用它，分支穷尽用它，工具类型过滤也靠它。

## 扩展阅读

- `010-LocalTypeInference`：可辨识联合与穷尽检查的入门；
- `016-TypeGuardCustomGuard`：类型守卫与收窄的完整机制；
- `015-IntersectionTypeMerge`：交叉类型与 never 的相遇（属性冲突）；
- `031-UtilityTypePrinciple`：Exclude、NonNullable 等工具类型的实现；
- `032-ConditionalTypeDistribute`：条件类型分发与 never 的交互。
