---
order: 120
title: 类型兼容性（结构化类型系统）
module: 'typescript'
category: 前端技术
difficulty: beginner
description: TypeScript 结构化类型系统的赋值兼容规则：对象、函数、联合、交叉与特殊类型的兼容判断。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'typescript/013-LiteralUnionTypes'
  - 'typescript/018-IntersectionTypeMerge'
  - 'typescript/029-CovarianceContravariance'
prerequisites:
  - 'typescript/008-BasicTypeSystem'
  - 'typescript/009-InterfaceTypeAlias'
  - 'typescript/011-FunctionGeneric'
---

## 0. 学习目标（可验证）

- [ ] 能用自己的话解释"结构化类型"与"名义类型"的区别
- [ ] 能判断任意两个对象类型能否互相赋值，并说出依据
- [ ] 能解释"为什么对象字面量多一个属性会报错，而变量多一个属性不报错"
- [ ] 能判断函数类型赋值时参数与返回值分别按什么规则兼容
- [ ] 能说出 any、unknown、never 在兼容性中的特殊地位

## 1. 一句话理解

> 类型兼容性回答一个问题："这份值能不能放进这个格子里？" TypeScript 的答案是：**看形状，不看名字**——只要值的形状满足格子的要求，就放得进去。

## 2. 结构化类型：看形状，不看名字

JavaScript 是一门"鸭子类型"语言：一个对象像鸭子（有鸭子的属性和方法），它就是鸭子。TypeScript 继承了这种思想，但把它搬到了编译期。

```typescript
// 两个接口结构完全相同，但名字不同
interface Point2D {
  x: number;
  y: number;
}

interface Coordinate {
  x: number;
  y: number;
}

const p: Point2D = { x: 1, y: 2 };
// 名字不同，但结构相同，赋值合法
const c: Coordinate = p;
```

**拆解化讲解：**

（1）在 Java、C# 这类**名义类型系统**（nominal typing）里，`Point2D` 和 `Coordinate` 即使长得一模一样也不能互相赋值，因为类型由"名字"决定；

（2）TypeScript 是**结构化类型系统**（structural typing），兼容性只看成员形状：`p` 拥有 `Coordinate` 要求的 `x` 和 `y`，所以赋值合法；

（3）这条规则是 TypeScript 与普通 JavaScript 对象交互时"几乎不用写转换代码"的根本原因。

## 3. 赋值兼容的核心规则

判断 `source` 能否赋值给 `target`，规则只有一条：**source 必须包含 target 要求的全部成员，且每个成员的类型兼容**。

```typescript
interface User {
  name: string;
  age: number;
}

// 合法：多出来的 email 不影响
const extra = { name: "Alice", age: 30, email: "a@b.c" };
const u: User = extra;

// 非法：缺少 age
const missing = { name: "Bob" };
// const u2: User = missing; // 报错：缺少属性 age

// 非法：age 的类型不兼容
const wrongType = { name: "Carol", age: "三十" };
// const u3: User = wrongType; // 报错：string 不能赋值给 number
```

**拆解化讲解：**

（1）目标类型 `User` 是"格子"，要求两个成员；`extra` 除了这两个成员还多一个 `email`，多余成员不影响赋值；

（2）`missing` 缺了 `age`，格子没填满，报错；

（3）`wrongType` 的 `age` 是字符串，成员存在但类型不对，同样报错。

**一句话记忆：目标类型的每个成员，源类型都得有，而且类型得兼容；源类型多出来的成员无所谓。**

## 4. 对象字面量的"多余属性检查"

注意一个看似矛盾的现象：

```typescript
interface User {
  name: string;
  age: number;
}

// 场景一：直接写字面量，多余属性报错
// const u1: User = { name: "Alice", age: 30, email: "a@b.c" };
// 报错：对象字面量只能指定已知属性，email 不在 User 中

// 场景二：先存进变量，再赋值，不报错
const person = { name: "Alice", age: 30, email: "a@b.c" };
const u2: User = person; // 合法
```

**拆解化讲解：**

（1）场景一叫**多余属性检查**（excess property check）：给一个"新鲜"的字面量直接标注类型时，编译器会额外检查有没有多余属性，这是为了防止拼写错误（比如把 `name` 写成 `nmae`）；

（2）场景二通过变量中转时，变量已经有自己的推断类型，编译器只做结构化兼容检查，不再检查多余属性；

（3）两者并不矛盾：多余属性检查是兼容规则之上的"新鲜字面量特例"，目的是在代码最容易写错的地方多设一道防线。

## 5. 函数类型的兼容

函数类型兼容分两部分：**参数**和**返回值**。

```typescript
// 返回值：协变（covariant）——返回更具体的类型可以赋值给返回更泛化的类型
type Animal = { name: string };
type Dog = { name: string; bark(): void };

const getAnimal: () => Animal = () => ({ name: "a" });
const getDog: () => Dog = () => ({ name: "d", bark() {} });

// 合法：getDog 的返回值 Dog 是 Animal 的子集（多了一个 bark，但 Animal 只需要 name）
const fn1: () => Animal = getDog;

// 参数：strictFunctionTypes 下逆变（contravariant）——参数类型要"更宽"才能替代
type Handler = (e: { id: number }) => void;
const handleNumber: Handler = (e: { id: number }) => console.log(e.id);

// 合法：参数要求更宽（接收 unknown 的函数可以处理任何入参）
const wide: (e: unknown) => void = (e) => console.log(e);
const fn2: Handler = wide;

// 非法（strictFunctionTypes 下）：参数要求更窄
// const narrow: (e: { id: number; name: string }) => void = (e) => {};
// const fn3: Handler = narrow; // 报错：窄参数函数不能替代宽参数函数
```

**拆解化讲解：**

（1）返回值按"协变"判断：`Dog` 是 `Animal` 的子类型，返回 `Dog` 的函数可以赋值给返回 `Animal` 的函数；

（2）参数按"逆变"判断：函数 `A` 要替代函数 `B`，`A` 的参数类型必须比 `B` 的参数类型"更宽"，因为调用方可能传入 `B` 能接受的所有值；

（3）`strictFunctionTypes` 开启前参数按双变（bivariant）判断，两条路都通；开启后只认逆变。方法语法（method）默认仍双变，函数属性语法（property）受 strict 约束。

**参数个数规则**：目标函数参数更少时，源函数参数多也合法，因为多出来的参数在调用时会被忽略；反之不合法。

```typescript
type OneArg = (x: number) => void;
const twoArgs = (x: number, y: string) => console.log(x, y);
const f: OneArg = twoArgs; // 合法：少用参数没问题

// const g: (x: number, y: string) => void = (x: number) => {};
// 报错：目标要求两个参数，源只接受一个
```

## 6. 联合类型与交叉类型的兼容

```typescript
type A = { a: number };
type B = { b: string };

// A 可以赋值给 A | B（联合是"或"：只要属于其中一个即可）
const a: A = { a: 1 };
const u: A | B = a; // 合法

// A | B 不能赋值给 A（除非值确实收窄成 A）
// const a2: A = u; // 报错：u 可能是 B

// A & B 可以赋值给 A，也可以赋值给 B（交叉是"且"：两个都满足）
const both: A & B = { a: 1, b: "x" };
const a3: A = both; // 合法
```

**拆解化讲解：**

（1）联合类型 `A | B` 表示"非此即彼"，给它的格子填 `A` 或 `B` 都行，但反过来不确定是哪一个，所以不能直接填进 `A`；

（2）交叉类型 `A & B` 表示"两个都满足"，它同时是 `A` 和 `B` 的子类型，所以可以填进任何一个；

（3）这正是"联合是上界、交叉是下界"的直觉来源：越收越窄的交叉类型兼容面越大。

## 7. 特殊类型的兼容地位

| 类型 | 在兼容性中的角色 | 说明 |
| --- | --- | --- |
| `any` | 万能类型 | 可以赋值给任何类型，任何类型也可以赋值给它（关闭检查） |
| `unknown` | 顶部类型（top） | 任何类型都能赋值给 `unknown`，但 `unknown` 只能赋值给 `unknown` 或 `any` |
| `never` | 底部类型（bottom） | 可以赋值给任何类型，但没有值能赋值给 `never` |
| `void` | 特殊空类型 | 函数返回 `void` 时，返回 `undefined` 或其他值通常可兼容（取决于上下文） |

```typescript
let anyValue: any = 1;
const num: number = anyValue; // 合法（any 关闭了检查）

let unknownValue: unknown = 1;
// const num2: number = unknownValue; // 报错：unknown 必须先收窄

function fail(): never {
  throw new Error("必然失败");
}
const num3: number = fail(); // 合法：never 可以赋给任何类型
```

## 8. 常见错误与修正（错-对对比）

**错误 1：把可选属性当必填用**

```typescript
interface Config {
  url: string;
  retries?: number;
}

// 错：把 retries 当必填使用
// const c1: Config = { url: "x" }; 这是对的；错误用法是在读取时假设它一定存在
// const n: number = c1.retries; // 报错：retries 可能是 undefined

// 对：读取可选属性前先收窄
const c2: Config = { url: "x" };
const n2: number = c2.retries ?? 3;
```

**错误 2：函数参数方向搞反**

```typescript
type EventHandler = (e: Event) => void;

// 错：以为参数越具体越安全
// const bad: EventHandler = (e: MouseEvent) => console.log(e.clientX);
// 报错：EventHandler 的调用方可能传入任意 Event，而 MouseEvent 没有 clientX

// 对：参数放宽到 Event 的父级或同级
const good: EventHandler = (e: unknown) => console.log(e);
```

**错误 3：认为名字不同就不能互相赋值**

```typescript
// 错：Java 思维，认为 Point2D 不能赋给 Coordinate
// 对：TypeScript 只看结构，两者结构一致即可互赋
```

## 9. 动手试试

**入门版**：定义 `interface Book { title: string; pages: number }`，分别尝试：

1. 把 `{ title: "A", pages: 100 }` 直接赋给 `Book`；
2. 把 `{ title: "B", pages: 200, isbn: "x" }` 先存变量再赋给 `Book`；
3. 把 `{ title: "C" }` 赋给 `Book`，观察报错信息。

**进阶版**：定义 `type F1 = (x: number) => string` 和 `type F2 = (x: number | string) => string`，用 `strictFunctionTypes` 开关分别验证 `F1` 与 `F2` 能否互相赋值，并解释原因。

## 10. 常见疑问 FAQ

**Q1：为什么"接口长得一样"就能互相赋值？**

因为 TypeScript 是结构化类型系统，兼容性只看成员形状。这是有意的设计：它让 TypeScript 能和普通的 JavaScript 对象、JSON 数据无缝协作。

**Q2：多余属性检查什么时候触发？**

只在给"新鲜的对象字面量"直接标注类型时触发；先赋值给变量再传递时不做这个检查。需要绕开时可用中间变量，但更推荐修正真实的多余属性。

**Q3：函数参数到底按什么规则？**

`strictFunctionTypes` 开启时，函数属性语法按逆变；方法语法按双变；关闭时全部按双变。工程上建议开启 strict，按逆变理解。

**Q4：any 和 unknown 在赋值上有什么区别？**

`any` 双向通吃且关闭检查；`unknown` 只进不出——任何值能进，但使用前必须收窄。详见 `TypeScriptFAQ`。

**Q5：泛型类型怎么判断兼容？**

泛型参数相同的两个实例化类型按普通规则判断；泛型参数不同时，还要看类型参数本身是否兼容（例如 `Box<Dog>` 能否赋给 `Box<Animal>` 取决于 `Box<T>` 中 `T` 出现的位置，详见 `029-CovarianceContravariance`）。

## 11. 自测（小测验）

**第 1 题（判断）**：`interface A { x: number }` 与 `interface B { x: number; y: number }`，`B` 能否赋值给 `A`？

**第 2 题（填空）**：`const f: () => { a: number } = () => ({ a: 1, b: 2 })` 是否合法？为什么？

**第 3 题（单选）**：`type U = string | number`，`const v: U = 1` 后，`v` 能否直接赋给 `number`？

<details>
<summary>点击查看答案</summary>

1. 能。`B` 包含 `A` 的全部成员，多出的 `y` 不影响。
2. 合法。返回值按结构化兼容，多出的 `b` 不违反 `{ a: number }` 的要求。
3. 不能。`v` 的类型是 `U`（可能是 string），需要先收窄成 `number`。

</details>

## 12. 一句话记住

> TypeScript 看形状不看名字：目标要求的成员，源都得有且类型兼容；参数逆变、返回值协变；新鲜字面量会被额外检查。

## 扩展阅读

- `029-CovarianceContravariance`：型变理论的完整展开与工程案例；
- `018-IntersectionTypeMerge`：交叉类型合并时的属性冲突（冲突属性变成 never）；
- `013-LiteralUnionTypes`：类型收窄如何让联合类型"变成"单类型；
- `014-TypeInferenceDeepDive`：推断与兼容性如何配合工作。
