---
order: 50
title: TS 前篇 02：函数基础
module: 'typescript'
category: 前端技术
difficulty: beginner
description: 零基础第二课：函数声明与箭头函数、参数与返回类型、可选/默认/剩余参数、this 陷阱入门，对齐官方 TypeScript Handbook。
author: fanquanpp
updated: '2026-08-30'
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

## 6. 动手试试

### 入门版（必做）

1. 写一个 `multiply(a: number, b: number): number`，再写它的箭头函数版本。
2. 给一个变量标注函数类型 `(name: string, times?: number) => string`，并赋一个实现。
3. 写一个 `sumAll(...nums: number[])`，返回总和。

### 进阶版（选做）

1. 把"deck 发牌"示例补完整：返回随机花色与点数，验证箭头函数的 this 捕获。
2. 开启 `noImplicitThis`（见 043 工程配置），观察普通函数版本是否被编译器警告。

## 7. 一句话记住

> 函数类型 = `(参数: 类型) => 返回类型`；参数个数默认必须匹配，可选参数加 `?`、剩余参数用 `...`；回调里用箭头函数保住 `this`。

下一篇进入类基础。
