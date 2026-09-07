---
order: 40
title: TS 前篇 01：变量与基础类型
module: 'typescript'
category: 前端技术
difficulty: beginner
description: 零基础第一课：let/const 与 var 的区别、基础类型注解、解构赋值，知识点对齐官方 TypeScript Handbook。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'typescript/005-TSBasicsFunctions'
  - 'typescript/003-TypeScriptOverviewEnvSetup'
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

## 5. 动手试试

### 入门版（必做）

1. 声明一个 `const` 数组 `["a", "b", "c"]`，用解构取出前两个元素。
2. 把 `for (var i...)` 改成 `for (let i...)`，在浏览器 Console 观察 setTimeout 输出差异。
3. 给一个对象字面量标注类型：`{ title: string; done: boolean }`。

### 进阶版（选做）

1. 写一个函数，参数是 `{ a: string; b?: number }` 并在函数内解构，体会可选属性 `b?`。
2. 用对象解构 + 默认值：`let { a, b = 1001 } = wholeObject`，思考 `b` 何时取默认值。

## 6. 一句话记住

> 变量三原则：能用 `const` 就不用 `let`，能用 `let` 就不用 `var`；类型写在冒号后，能推断就不写；解构是"按位置/按名字快速取值的语法糖"。

下一篇进入函数基础。
