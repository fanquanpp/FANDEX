---
order: 50
title: TS 前篇 02：函数基础
module: 'typescript'
category: 前端技术
difficulty: beginner
description: 零基础第二课：函数声明与箭头函数、参数与返回类型、可选/默认/剩余参数、this 陷阱入门，对齐官方 TypeScript Handbook。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'typescript/004-TSBasicsVariablesAndTypes'
  - 'typescript/006-TSBasicsClasses'
  - 'typescript/011-FunctionGeneric'
prerequisites:
  - 'typescript/004-TSBasicsVariablesAndTypes'
---

## 0. 学习目标（可验证）

- [ ] 能写带参数类型与返回类型的函数（声明式、表达式、箭头式）
- [ ] 能写出函数的完整类型签名（参数 + 箭头 + 返回类型）
- [ ] 会使用可选参数、默认参数与剩余参数

## 1. 一句话理解

> 函数 = "输入（参数）→ 处理（函数体）→ 输出（返回值）"。TypeScript 只是给输入输出加上类型，让调用时的错误提前暴露。

## 2. 三种函数写法

```typescript
// 命名函数
function add(x: number, y: number): number {
  return x + y;
}

// 匿名函数赋值给变量
let myAdd = function (x: number, y: number): number {
  return x + y;
};

// 箭头函数
let arrowAdd = (x: number, y: number): number => x + y;
```

**讲解：**

1. 参数类型写在参数名后（`x: number`），返回类型写在参数列表后（`: number`）。
2. 返回类型可以省略——TS 会根据 `return` 语句自动推断。
3. 箭头函数写法更短，且不绑定自己的 `this`（见第 5 节）。
4. 三种写法只是语法差异，类型能力完全一致。

## 3. 函数类型签名

```typescript
// 完整函数类型：参数列表 + => + 返回类型
let myAdd2: (x: number, y: number) => number = function (x, y) {
  return x + y;
};

// 参数名只是为了可读性，类型对齐即可
let myAdd3: (baseValue: number, increment: number) => number = (a, b) => a + b;

// 没有返回值用 void
let logIt: (msg: string) => void = (msg) => console.log(msg);
```

**讲解：**

1. 函数类型由两部分组成：参数类型和返回类型，中间用 `=>` 连接。
2. 一旦变量声明了函数类型，赋值时参数类型可由编译器**上下文推断**，无需重复标注。
3. 不返回任何值的函数，返回类型写 `void`。
4. 函数捕获的外部变量不体现在类型里——它们属于"隐藏状态"。

### 3.1 用 type 别名复用函数类型

函数类型在多处出现时，提炼成别名能显著降低维护成本：

```typescript
// 给"比较器"起名字：参数名 + 类型 + => + 返回类型
type Comparator<T> = (a: T, b: T) => number;

const byAge: Comparator<{ age: number }> = (a, b) => a.age - b.age;
const byName: Comparator<string> = (a, b) => a.localeCompare(b);

console.log(byAge({ age: 30 }, { age: 20 }));   // 10
console.log(byName("bob", "alice"));            // 1（b 排在 a 后面）
```

**讲解：**

1. `type Comparator<T> = ...` 与给变量标函数类型等价，但可复用、可带泛型、可导出，是工程首选；
2. 别名里的参数名（`a`、`b`）是文档：`Comparator` 一眼看懂"返回负数表示 a 在前"。

### 3.2 什么时候该手写返回值类型

返回值多数情况能推断，但三类场景建议显式写出：

```typescript
// 1. 公共 API：返回类型就是契约，推断结果变化不该悄悄破坏调用方
export function parseConfig(raw: string): { port: number } {
  return JSON.parse(raw);
}

// 2. 递归函数：推断器无法"预知"自己的返回类型，必须手写
function fib(n: number): number {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

// 3. 防手滑：写上注解后，return 错类型的分支当场报错
function findUser(id: number): { id: number } | undefined {
  return id > 0 ? { id } : undefined;
}
```

## 4. 可选、默认与剩余参数

```typescript
// 可选参数：末尾加 ?
function buildName(firstName: string, lastName?: string): string {
  return lastName ? firstName + " " + lastName : firstName;
}
buildName("Bob");            // 合法
buildName("Bob", "Adams");   // 合法
// buildName("Bob", "Adams", "Sr."); // 报错：参数多了

// 默认参数：不给值时用默认值
function greet(name: string = "World"): string {
  return `Hello, ${name}`;
}
greet();             // "Hello, World"
greet(undefined);    // 也走默认值

// 剩余参数：收集所有剩余实参为数组
function buildFullName(firstName: string, ...restOfName: string[]): string {
  return firstName + " " + restOfName.join(" ");
}
buildFullName("Joseph", "Samuel", "Lucas"); // "Joseph Samuel Lucas"
```

**讲解：**

1. TypeScript 默认要求实参个数与形参一致：少了、多了都会报错，这是与 JavaScript 最大的差异之一。
2. 可选参数必须放在必选参数之后；默认参数放在末尾时等价于可选参数。
3. `...restOfName: string[]` 把不定数量参数收进数组，适合日志、拼接、聚合类函数。
4. 默认参数在类型层面表现为可选（`lastName?: string`），默认值本身不出现在类型里。

### 4.1 回调函数"少写参数"是合法的

数组方法的回调经常只用到部分参数，TypeScript 特意允许"实现比签名少"：

```typescript
// forEach 的回调签名是 (value, index, array)，但只写 value 完全合法
["a", "b"].forEach((value) => console.log(value));
// 输出: a
// 输出: b

// 错误方向：实现比签名"多"参数则报错
// ["a"].forEach((value, extra: number) => console.log(value, extra));  // 报错
```

**讲解：**

1. 规则是"**实现的参数可以比要求少，不能多**"——多出来的参数在调用时本来就没人传；
2. 这正是 012 类型兼容性"函数参数双变/逆变"的日常体验，先记住现象即可。

## 5. this 陷阱与箭头函数

```typescript
let deck = {
  suits: ["hearts", "spades"],
  createCardPicker: function () {
    // 反模式：返回普通函数，调用时 this 丢失
    // return function () { return this.suits[0]; };

    // 正解：箭头函数捕获定义位置的 this
    return () => this.suits[0];
  },
};

let picker = deck.createCardPicker();
console.log(picker()); // "hearts"
```

**讲解：**

1. 普通函数的 `this` 由"调用方式"决定：`picker()` 单独调用时 `this` 不是 `deck`。
2. 箭头函数在**定义时**捕获外层 `this`，与调用方式无关。
3. 回调、事件监听、setTimeout 里传函数时，优先箭头函数。
4. 想更严格地检查 `this` 用法，开启 tsconfig 的 `noImplicitThis`。

## 6. 常见陷阱（错-对对比）

**陷阱 1：`void` 与 `undefined` 混为一谈。**

```typescript
type Logger = (msg: string) => void;

// 合法：返回类型声明为 void 时，实现"顺手"返回了值也不报错（调用方不应用它）
const logWithTs: Logger = (msg) => console.log(`${Date.now()} ${msg}`);
const logged = logWithTs("hi");      // logged 的类型是 void：告诉调用方"别用返回值"

// 但显式写 : undefined 就必须真的返回 undefined
function noop(): undefined {
  // return;                          // 报错：声明 : undefined 必须有 return undefined
  return undefined;
}
```

**讲解：** `void` 的语义是"调用方不该使用返回值"，`undefined` 是"返回值恰好是 undefined"。给回调声明 `void` 是库设计中最常见的宽松手段。

**陷阱 2：可选参数与 `undefined` 的边界。**

```typescript
function greet(name?: string): string {
  return `Hello, ${name ?? "World"}`;   // 用 ?? 处理"没传"与"传了 undefined"两种情况
}
console.log(greet());             // "Hello, World"
console.log(greet(undefined));    // "Hello, World"（显式传 undefined 等价于没传）
console.log(greet("TS"));         // "Hello, TS"
```

**讲解：** `name?: string` 实际类型是 `string | undefined`，直接 `.toUpperCase()` 会报错；`??`、`if`、`?.` 都是合法的收窄手段。

**陷阱 3：回调里把 `this` 想当然。**

```typescript
const timer = {
  seconds: 0,
  // 错误写法：普通函数作为回调，this 不再指向 timer
  // startBad() { setInterval(function () { this.seconds++; }, 1000); }
  start() {
    setInterval(() => { this.seconds++; }, 1000);   // 箭头函数捕获外层 this
  },
};
timer.start();
setTimeout(() => console.log(timer.seconds), 1200); // 输出: 1
```

## 7. 常见疑问 FAQ

**Q1：箭头函数和普通函数除了 this 还有什么区别？**

箭头函数不能用作构造函数、没有 `arguments` 对象、不能 `yield`。类型层面二者的类型签名写法完全一致。

**Q2：函数重载是什么？这里为什么不讲？**

同一个函数对不同的参数组合给出不同的"门面签名"。它依赖"签名 + 实现"的分离写法，属于进阶内容，见 `typescript/011-FunctionGeneric` 中的完整展开。

**Q3：参数解构的函数怎么写类型？**

类型标在**整个解构模式**之后：`function f({ a, b = 0 }: { a: string; b?: number })`。解构默认值 `b = 0` 让 `b` 自动成为可选。

## 8. 动手试试

### 入门版（必做）

1. 写一个 `multiply(a: number, b: number): number`，再写它的箭头函数版本。
2. 给一个变量标注函数类型 `(name: string, times?: number) => string`，并赋一个实现。
3. 写一个 `sumAll(...nums: number[])`，返回总和。

### 进阶版（选做）

1. 把"deck 发牌"示例补完整：返回随机花色与点数，验证箭头函数的 this 捕获。
2. 开启 `noImplicitThis`（见 `typescript/051-TypeScriptEngineeringConfig`），观察普通函数版本是否被编译器警告。
3. 用 `type Comparator<T>` 重写一个排序调用，并尝试给 `Comparator` 换参数名观察提示变化。

## 9. 一句话记住

> **初学者记住这三点**：函数类型 = `(参数: 类型) => 返回类型`；参数个数默认必须匹配，可选加 `?`、默认值直接赋、剩余用 `...`；回调里用箭头函数保住 `this`。
>
> **进阶者还需注意**：回调实现"参数可以少、不能多"；`void` 是"别用我的返回值"、`undefined` 是"我精确返回 undefined"；公共 API、递归函数与多分支函数建议手写返回类型注解，把返回类型当契约锁住。

下一篇进入类基础。
