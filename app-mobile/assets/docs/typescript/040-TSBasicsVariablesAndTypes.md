---
order: 40
title: TS 前篇 01：变量与基础类型
module: 'typescript'
category: 前端技术
difficulty: beginner
description: 零基础第一课：let/const 与 var 的区别、基础类型注解、解构赋值，知识点对齐官方 TypeScript Handbook。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'typescript/050-TSBasicsFunctions'
  - 'typescript/030-TypeScriptOverviewEnvSetup'
prerequisites: []
---

## 0. 学习目标（可验证）

- [ ] 能用 `let` 和 `const` 声明变量，并说出与 `var` 的关键区别
- [ ] 能给变量标注 number/string/boolean/数组/对象类型
- [ ] 能写数组与对象的解构赋值

## 1. 一句话理解

> TypeScript 的变量语法 = JavaScript 的变量语法 + 类型标注。你只需要记住三件事：优先用 `const`、能推断就不写类型、`let` 管可变、`const` 管不可重新赋值。

## 2. let 与 const：现代变量声明

### 2.1 基础写法

```typescript
let count = 0;            // 可变变量
const MAX_SIZE = 100;     // 常量：不能重新赋值

count = 1;                // 合法
// MAX_SIZE = 200;        // 报错：常量不能重新赋值
```

**讲解：**

1. `let` 声明可变变量，`const` 声明"绑定不可变"的常量——`const` 变量不能重新赋值。
2. `const` 不等于"内容不可变"：对象的属性仍然可以修改（如 `user.name = "新名字"`），被锁住的只是"变量指向谁"。
3. 官方 Handbook 的建议：**能不重新赋值的都用 `const`**，让代码更容易推理。

### 2.2 块级作用域：let/const 与 var 的核心区别

```typescript
function demo(input: boolean) {
  let a = 100;
  if (input) {
    let b = a + 1;   // 合法：b 在 if 块内
    return b;
  }
  // return b;       // 报错：b 只在 if 块内可见
}

// var 的对比：var 是"函数级作用域"，if 块挡不住它
function varDemo(flag: boolean) {
  if (flag) {
    var x = 10;
  }
  return x;          // var 可以；换成 let 会报错
}
```

**讲解：**

1. `let`/`const` 是块级作用域：变量只在最近的 `{}` 块内可见；`var` 是函数级作用域，会"漏"出 if/for 块。
2. `let`/`const` 还存在"暂时性死区"：声明之前访问会报错，而不是得到 `undefined`。
3. `let` 不允许在同一作用域重复声明，`var` 允许——重复声明是经典 bug 来源。
4. 结论：新代码一律用 `let`/`const`，不再使用 `var`。

### 2.3 循环中的经典陷阱

```typescript
// var：循环结束后 i 已经是 10，所有回调打印 10
for (var i = 0; i < 10; i++) {
  setTimeout(() => console.log(i), 100 * i);
}

// let：每次迭代创建独立作用域，打印 0-9
for (let j = 0; j < 10; j++) {
  setTimeout(() => console.log(j), 100 * j);
}
```

**讲解：**

1. `var` 只有一个共享的 `i`，异步回调执行时循环早已结束，所以全打印 10。
2. `let` 每次迭代都创建一个新环境，每个回调捕获自己的 `j`，所以打印 0-9。
3. 这是 Handbook 强调的"变量捕获"问题，也是面试高频题；用 `let` 即可避免。

## 3. 基础类型注解

```typescript
let name: string = "Alice";        // 字符串
let age: number = 30;              // 数字（整数、小数都是 number）
let isActive: boolean = true;      // 布尔
let tags: string[] = ["ts", "web"]; // 字符串数组
let mixed: (string | number)[] = [1, "a"]; // 联合类型数组
let user: { name: string; age: number } = { name: "Alice", age: 30 };
```

**讲解：**

1. 写法是"变量名 + `: 类型`"，类型在冒号后。
2. `string[]` 与 `Array<string>` 等价，推荐前者。
3. 对象类型用花括号描述"形状"：字段名 + 类型。
4. 多数情况下可以省略注解——TS 会根据值自动推断（`let name = "Alice"` 自动是 string）。

### 3.1 先理解"类型是变量的说明书"

把变量想象成一个贴了标签的收纳盒：类型注解就是标签上写的"本盒只收字符串"。放错东西时，收银员（编译器）在**收货时**就拦下你，而不是等顾客（运行时）用到时才炸。TypeScript 的所有检查都发生在编译期，产物里的类型标注会被擦除，运行时还是纯 JavaScript。

### 3.2 null 与 undefined：最容易踩坑的两个值

```typescript
let maybe: string | null = null;   // 联合类型：可能是字符串，也可能"没有值"

function greetUser(name: string | null): string {
  // 错误写法：直接当字符串用
  // return name.toUpperCase();      // 报错：name 可能为 null

  // 正确写法：先收窄再使用
  if (name === null) {
    return "Hello, guest";
  }
  return `Hello, ${name.toUpperCase()}`;  // 收窄后这里是 string
}

console.log(greetUser("Alice")); // "Hello, Alice"
console.log(greetUser(null));    // "Hello, guest"
```

**讲解：**

1. 开启 `strictNullChecks`（`strict` 家族成员）后，`null`/`undefined` 不再能赋给普通类型，"Cannot read properties of null" 这类运行时崩溃在编译期就被拦下；
2. "先收窄再使用"是 TypeScript 的核心工作流：`if` 判断、`??`、`?.` 都能让编译器明白"这里一定有值"；
3. 初学阶段记住：显式写出"可能为空"（`string | null`），比让它悄悄是 `any` 安全得多。

### 3.3 特殊类型速览（初学者认脸即可）

| 类型 | 含义 | 初学者建议 |
| --- | --- | --- |
| `any` | 关闭类型检查，什么都能放 | 能不用就不用，用了等于没写 TS |
| `unknown` | "安全版 any"：什么都能收，用之前必须先检查 | 接外来数据（接口返回、JSON）优先用它 |
| `void` | "没有有意义的返回值" | 只用于函数返回类型 |
| `never` | "永远不会发生" | 先认识即可，详见进阶篇 |

```typescript
// any 与 unknown 的直观对比
let a: any = JSON.parse('{"x":1}');
a.foo.bar;                     // 不报错：any 关闭了检查（危险）

let u: unknown = JSON.parse('{"x":1}');
// u.foo.bar;                  // 报错：unknown 必须先收窄
if (typeof u === "object" && u !== null && "foo" in u) {
  // 收窄后才能继续访问
}
```

### 3.4 能推断就不写注解

```typescript
let city = "Hangzhou";      // 推断为 string（鼠标悬停可见），无需写 : string
const level = 3;            // const 且字面量：推断为字面量类型 3
let items = ["a", "b"];     // 推断为 string[]

// 需要写注解的三种典型场景：
let score: number | null = null;          // 1. 初始值不能代表全部取值时
let user: { name: string; age: number } = { name: "Alice", age: 30 };  // 2. 想让"多余属性"报错时
function area(w: number, h: number): number { return w * h; }          // 3. 函数边界（入参/出参）处
```

**讲解：**

1. 注解写多了是噪音，写少了丢防线；社区共识是"**边界处写、内部靠推断**"；
2. `const level = 3` 推断为字面量类型 `3` 而非 `number`，这是 const 的类型层福利，后续学联合类型时会反复用到。

## 4. 解构赋值

```typescript
// 数组解构
let input = [1, 2];
let [first, second] = input;       // first=1, second=2
let [head, ...rest] = [1, 2, 3, 4]; // head=1, rest=[2,3,4]

// 元组解构：类型会跟随对应位置
let tuple: [number, string] = [7, "hello"];
let [num, str] = tuple;            // num: number, str: string

// 对象解构
let obj = { a: "foo", b: 12, c: "bar" };
let { a, b } = obj;                // a="foo", b=12

// 对象解构 + 重命名
let { a: newName, b: newName2 } = obj;

// 函数参数解构（带类型标注）
function f({ a, b }: { a: string; b?: number }): void {
  console.log(a, b);
}
```

**讲解：**

1. 数组解构按位置取值，`...rest` 收集剩余项。
2. 元组解构时每个变量自动获得对应位置的类型。
3. 对象解构按属性名取值；想换变量名用 `属性名: 新名字`（注意这里冒号不是类型）。
4. 函数参数解构时，类型标注写在**整个解构模式之后**。

## 5. 常见陷阱（错-对对比）

**陷阱 1：注解写了，赋值时随意。**

```typescript
let price: number = 100;
// price = "一百";            // 报错：string 不能赋给 number
// 类型注解是承诺，写上就要遵守；靠 TS 拦住这一类"手滑"正是它的价值
```

**陷阱 2：const 对象被误认为"完全只读"。**

```typescript
const user = { name: "Alice" };
user.name = "Bob";             // 合法！const 锁的是"变量指向"，不是"对象内容"
// 真正要深度只读，用 as const：
const config = { host: "localhost", port: 8080 } as const;
// config.port = 3000;         // 报错：属性是只读的
```

**陷阱 3：`var` 残留导致变量提升困惑。**

```typescript
console.log(typeof legacy);    // "undefined" 而不是报错：var 被提升
var legacy = 1;
// 用 let/const 时，声明前访问直接报错（暂时性死区），问题更早暴露
```

**陷阱 4：解构时把"重命名"当"类型标注"。**

```typescript
let { a: newName } = { a: "foo" };   // newName: string —— 冒号是重命名，不是类型
// 想同时重命名并标注类型：
let { a: alsoNew }: { a: string } = { a: "foo" };
```

## 6. 常见疑问 FAQ

**Q1：`let` 与 `const` 到底选哪个？**

默认 `const`；只有确实需要重新赋值（计数器、循环变量、缓存槽位）时才用 `let`。代码评审里"能 const 而 var/let"通常被视为坏味道。

**Q2：写了类型注解，运行时会变慢吗？**

不会。所有类型信息在编译产物中被擦除，运行时就是等价的 JavaScript。类型系统的成本全在编译期。

**Q3：什么时候必须写注解？**

三类场景：变量初始值不能覆盖全部取值（如先 `null` 后赋值）、希望对字面量做严格检查（函数边界、对象字面量）、以及导出公共 API 时的显式契约。其余交给推断。

**Q4：`any` 和 `unknown` 都"什么都能放"，选哪个？**

数据从外部进来（接口、JSON.parse、事件对象）用 `unknown`，逼自己先检查再使用；`any` 只在逐步迁移遗留代码等迫不得已时临时使用，并尽快消除。

## 7. 动手试试

### 入门版（必做）

1. 声明一个 `const` 数组 `["a", "b", "c"]`，用解构取出前两个元素。
2. 把 `for (var i...)` 改成 `for (let i...)`，在浏览器 Console 观察 setTimeout 输出差异。
3. 给一个对象字面量标注类型：`{ title: string; done: boolean }`。

### 进阶版（选做）

1. 写一个函数，参数是 `{ a: string; b?: number }` 并在函数内解构，体会可选属性 `b?`。
2. 用对象解构 + 默认值：`let { a, b = 1001 } = wholeObject`，思考 `b` 何时取默认值。
3. 把 3.2 节的 `greetUser` 改成用 `??` 与 `?.` 实现同样逻辑，对比两种收窄风格的差异。

## 8. 一句话记住

> **初学者记住这三点**：能用 `const` 就不用 `let`，能用 `let` 就不用 `var`；类型写在冒号后、能推断就不写；null/undefined 要先收窄再使用。
>
> **进阶者还需注意**：类型在运行时被擦除，一切检查都在编译期；`const` 锁绑定不锁内容，深度只读要 `as const`；外来数据用 `unknown` 而非 `any`，`as const` 的字面量推断会在联合类型章节反复登场。

下一篇进入函数基础。
