---
order: 70
title: TS 前篇 04：泛型基础
module: 'typescript'
category: 前端技术
difficulty: beginner
description: 零基础第四课：泛型函数与推断、泛型接口与类、约束 extends、keyof 与工厂函数，对齐官方 TypeScript Handbook。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'typescript/006-TSBasicsClasses'
  - 'typescript/011-FunctionGeneric'
  - 'typescript/022-GenericConstraintDefault'
prerequisites:
  - 'typescript/006-TSBasicsClasses'
---

## 0. 学习目标（可验证）

- [ ] 能写 `identity<T>` 泛型函数并说出与 `any` 的区别
- [ ] 能写泛型接口与泛型类
- [ ] 会用 `extends` 给泛型加约束

## 1. 一句话理解

> 泛型 = "类型占位符"。`<T>` 就像给函数留了一个"等你来填"的类型空位：调用时传入什么类型，函数就按什么类型工作，并且**不丢失类型信息**。

## 2. 泛型的 Hello World：identity 函数

```typescript
// 反模式：用 any，返回类型变成 any，丢失信息
function identityBad(arg: any): any {
  return arg;
}

// 正解：用类型变量 T 连接参数与返回值
function identity<T>(arg: T): T {
  return arg;
}

// 显式指定类型参数
let output1 = identity<string>("myString");
// 自动推断（更常用）
let output2 = identity("myString"); // T 自动是 string
```

**讲解：**

1. `<T>` 声明一个"类型变量"：它代表调用时传入的类型。
2. `identity<T>(arg: T): T` 保证"传什么类型进来，就返回什么类型出去"。
3. 用 `any` 会丢失信息（返回值变成 any，后续使用没有类型提示）；泛型不会。
4. 调用时可以显式写 `identity<string>(...)`，也可以让编译器从实参推断——日常以推断为主。

## 3. 泛型与数组

```typescript
// 错误：编译器不知道 T 有 .length
// function loggingIdentity<T>(arg: T): T {
//   console.log(arg.length);
//   return arg;
// }

// 正解：参数是 T 的数组，数组一定有 .length
function loggingIdentity<T>(arg: T[]): T[] {
  console.log(arg.length);
  return arg;
}

// 等价写法：Array<T>
function loggingIdentity2<T>(arg: Array<T>): Array<T> {
  console.log(arg.length);
  return arg;
}
```

**讲解：**

1. 泛型参数"可以是任何类型"，所以编译器不允许你假设它有 `.length`。
2. 把 `T` 放进容器（`T[]` 或 `Array<T>`）后，容器本身的能力（如 length）就可以使用。
3. 两种数组写法完全等价，`T[]` 更常见。

## 4. 泛型接口与泛型类

```typescript
// 泛型接口：T 放在调用签名上（每次调用可不同）
interface GenericIdentityFn {
  <T>(arg: T): T;
}

// 泛型接口：T 放在整个接口上（实例化时锁定）
interface GenericIdentityFn2<T> {
  (arg: T): T;
}
let myIdentity: GenericIdentityFn2<number> = identity;

// 泛型类：注意静态成员不能使用 T
class GenericNumber<T> {
  zeroValue: T;
  add: (x: T, y: T) => T;
}

let myGenericNumber = new GenericNumber<number>();
myGenericNumber.zeroValue = 0;
myGenericNumber.add = (x, y) => x + y;

let stringNumeric = new GenericNumber<string>();
stringNumeric.zeroValue = "";
stringNumeric.add = (x, y) => x + y;
```

**讲解：**

1. T 放在"调用签名上"还是"接口本身"决定了锁定时机：前者每次调用可换类型，后者实例化时锁定。
2. 泛型类与泛型接口写法类似；同一个 `GenericNumber<T>` 可以实例化成 number 版或 string 版。
3. **静态成员不能使用类的类型参数 T**（T 只在实例层面存在）。

## 5. 泛型约束：extends

```typescript
// 约束：T 必须有 length 属性
interface Lengthwise {
  length: number;
}

function loggingIdentity3<T extends Lengthwise>(arg: T): T {
  console.log(arg.length); // 现在编译器知道有 length
  return arg;
}

// loggingIdentity3(3);                    // 报错：number 没有 length
loggingIdentity3({ length: 10, value: 3 }); // 合法

// keyof 约束：K 必须是 T 的键
function getProperty<T, K extends keyof T>(obj: T, key: K) {
  return obj[key];
}
let x = { a: 1, b: 2 };
getProperty(x, "a"); // 合法
// getProperty(x, "m"); // 报错：m 不是 x 的键
```

**讲解：**

1. `<T extends Lengthwise>` 表示"T 必须满足 Lengthwise 这个形状"，换来函数体内可以安全使用 `.length`。
2. 约束之后，不满足约束的类型会在调用处直接报错。
3. `K extends keyof T` 是"键名约束"：K 只能是 T 的属性名之一，从根上杜绝拼错键名。

## 6. 工厂函数：引用类类型

```typescript
// 泛型工厂：约束参数是"能 new 出 T 的构造函数"
function create<T>(c: { new (): T }): T {
  return new c();
}

class BeeKeeper {
  hasMask: boolean = true;
}

class Bee {
  keeper: BeeKeeper = new BeeKeeper();
}

function createInstance<A extends Bee>(c: new () => A): A {
  return new c();
}

let bee = createInstance(Bee);
console.log(bee.keeper.hasMask); // true
```

**讲解：**

1. `{ new (): T }` 描述"构造函数签名"：调用它（`new c()`）能得到 T。
2. 泛型约束也可以建立在类继承关系上（`A extends Bee`），工厂返回类型自动精确。
3. 这是依赖注入、对象工厂等模式的基础写法。

## 7. 动手试试

### 入门版（必做）

1. 写 `identity<T>` 并用 `identity("hi")` 与 `identity<number>(42)` 各调一次，验证返回类型。
2. 写 `firstElement<T>(arr: T[]): T`，返回数组第一项。
3. 给一个 `Stack<T>` 泛型类写 `push/pop`，分别用 number 与 string 实例化。

### 进阶版（选做）

1. 用 `T extends { length: number }` 写一个 `longest(a, b)`，返回较长的参数。
2. 用 `K extends keyof T` 写 `getProperty`，并故意传错键名观察报错。

## 8. 一句话记住

> 泛型用 `<T>` 占住类型空位，调用时自动填上；需要"能力"就先 `extends` 约束，需要"键"就用 `keyof`；静态成员不碰 T。

前篇到此结束。下一篇进入 `006-BasicTypeSystem`（基础类型系统），系统学习类型规则；如果环境还没有搭好，先回头读完 `001-TypeScriptOverviewEnvSetup`（概述与环境配置）再继续。
