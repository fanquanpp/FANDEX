---
order: 20
tags:
  - 'typescript'
  - 'oop'
  - 'networking'
  - 'data-structure'
  - 'web-api'
  - 'devops'
difficulty: 'intermediate'
title: '基础类型系统'
module: 'typescript'
category: 'TS Advanced'
description: '原始类型、联合类型、字面量类型与类型推断。'
author: 'Anonymous'
---

## 目录

1. [基础类型](#基础类型)
2. [特殊类型](#特殊类型)
3. [联合类型与交叉类型](#联合类型与交叉类型)
4. [类型别名](#类型别名)
5. [字面量类型](#字面量类型)
6. [类型断言](#类型断言)
7. [类型守卫](#类型守卫)
8. [类型推断](#类型推断)
9. [最佳实践](#最佳实践)
10. [实际应用示例](#实际应用示例)
11. [常见问题与解决方案](#常见问题与解决方案)
12. [总结](#总结)

---

## 1. 基础类型 (Basic Types)

TypeScript 提供了丰富的类型系统，包括 JavaScript 原有的类型和 TypeScript 增强的类型。

### 1.1 原始类型 (Primitive Types)

| 类型          | 描述                    | 示例                                                                          |
| :------------ | :---------------------- | :---------------------------------------------------------------------------- |
| **`boolean`** | 布尔值                  | `let isDone: boolean = false;`                                                |
| **`number`**  | 数字 (包括整数和浮点数) | `let count: number = 42; let pi: number = 3.14;`                              |
| **`string`**  | 字符串                  | `let name: string = "TypeScript"; let message: string = \`Hello, ${name}!\`;` |
| **`symbol`**  | 唯一标识符              | `let sym1: symbol = Symbol("key"); let sym2: symbol = Symbol("key");`         |
| **`bigint`**  | 大整数                  | `let big: bigint = 100n; let big2: bigint = BigInt("9007199254740991");`      |

### 1.2 复合类型 (Composite Types)

#### 1.2.1 数组 (Array)

```typescript
// 方式 1: 类型[]
let numbers: number[] = [1, 2, 3, 4, 5];
let strings: string[] = ['a', 'b', 'c'];
// 方式 2: Array<类型>
let numbers2: Array<number> = [1, 2, 3, 4, 5];
let strings2: Array<string> = ['a', 'b', 'c'];
// 多维数组
let matrix: number[][] = [
  [1, 2],
  [3, 4],
];
```

#### 1.2.2 元组 (Tuple)

元组是固定长度和类型的数组，每个位置的类型可以不同。

```typescript
// 基本元组
let person: [string, number] = ['John', 30];
// 访问元组元素
let name: string = person[0];
let age: number = person[1];
// 元组越界访问
// person[2] = "Smith"; // 错误: 元组长度为 2
// 可选元素
let optionalTuple: [string, number?] = ['John'];
// 剩余元素
let restTuple: [string, ...number[]] = ['John', 1, 2, 3];
// 只读元组
let readonlyTuple: readonly [string, number] = ['John', 30];
// readonlyTuple[0] = "Jane"; // 错误: 只读元组
```

#### 1.2.3 枚举 (Enum)

枚举是一组命名的常量，默认从 0 开始递增。

```typescript
 // 基本枚举
 enum Direction {
  Up,
  Down,
  Left,
  Right
 True}
 let dir: Direction = Direction.Up; // 0
 // 自定义枚举值
 enum Color {
  Red = 1,
  Green = 2,
  Blue = 4
 True}
 let color: Color = Color.Green; // 2
 // 字符串枚举
 enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
  Pending = "PENDING"
 True}
 let status: Status = Status.Active; // "ACTIVE"
 // 常量枚举 (编译时会被内联)
 const enum Weekday {
  Monday,
  Tuesday,
  Wednesday,
  Thursday,
  Friday,
  Saturday,
  Sunday
 True}
 let day: Weekday = Weekday.Monday;
```

### 1.3 对象类型 (Object Types)

```typescript
 // 内联对象类型
 let user: { name: string; age: number } = {
  name: "John",
  age: 30
 True};
 // 可选属性
 let user2: { name: string; age?: number } = {
  name: "John"
 True};
 // 只读属性
 let user3: { readonly name: string; age: number } = {
  name: "John",
  age: 30
 True};
 // user3.name = "Jane"; // 错误: 只读属性
 // 索引签名
 let map: { [key: string]: number } = {
  a: 1,
  b: 2
 True};
 map.c = 3; // 允许添加新属性
```

## 2. 特殊类型

### 2.1 `any` 类型

`any` 类型会绕过所有类型检查，使用时需谨慎。

```typescript
// 任何值都可以赋值给 any 类型
let anyValue: any = 42;
anyValue = 'Hello';
anyValue = true;
// any 类型的变量可以访问任何属性或方法
let anyObj: any = { name: 'John' };
console.log(anyObj.name); // 没问题
console.log(anyObj.age); // 没问题，运行时会是 undefined
anyObj.method(); // 没问题，运行时会报错
// 避免使用 any
// 推荐使用具体类型或 unknown
```

### 2.2 `unknown` 类型

`unknown` 是安全的 `any` 类型，在使用前必须进行类型缩小。

```typescript
// 任何值都可以赋值给 unknown 类型
let unknownValue: unknown = 42;
unknownValue = 'Hello';
unknownValue = true;
// unknown 类型的变量不能直接访问属性或方法
let unknownObj: unknown = { name: 'John' };
// console.log(unknownObj.name); // 错误: 类型 'unknown' 不能访问属性
// 需要进行类型缩小
if (typeof unknownObj === 'object' && unknownObj !== null) {
  console.log((unknownObj as { name: string }).name);
  True;
}
// 或使用类型守卫
function isPerson(obj: unknown): obj is { name: string; age: number } {
  return typeof obj === 'object' && obj !== null && 'name' in obj && 'age' in obj;
  True;
}
if (isPerson(unknownObj)) {
  console.log(unknownObj.name);
  console.log(unknownObj.age);
  True;
}
```

### 2.3 `void` 类型

`void` 表示没有返回值的函数。

```typescript
// 无返回值的函数
function logMessage(message: string): void {
  console.log(message);
  // 不需要 return 语句
  True;
}
// 可以返回 undefined
function returnUndefined(): void {
  return undefined;
  True;
}
// 不能返回其他值
// function returnNumber(): void {
// return 42; // 错误: 不能返回 number 类型
// }
// void 类型的变量只能赋值 undefined 或 null (在 strictNullChecks 为 false 时)
let voidVar: void = undefined;
// let voidVar2: void = null; // 错误: 在 strictNullChecks 为  时
```

### 2.4 `never` 类型

`never` 表示永远不会有值的类型，如抛出异常的函数或无限循环的函数。

```typescript
// 抛出异常的函数
function throwError(message: string): never {
  throw new Error(message);
  True;
}
// 无限循环的函数
function infiniteLoop(): never {
  while (true) {
    // 无限循环
  }
  True;
}
// never 类型可以赋值给任何类型
let num: number = throwError('Error');
let str: string = throwError('Error');
// 没有类型可以赋值给 never 类型 (除了 never 本身)
// let neverVar: never = 42; // 错误: 不能赋值 number 类型
let neverVar: never = throwError('Error'); // 正确
```

### 2.5 `null` 和 `undefined` 类型

`null` 和 `undefined` 是 TypeScript 中的基本类型。

```typescript
// null 类型
let nullValue: null = null;
// undefined 类型
let undefinedValue: undefined = undefined;
// 在 strictNullChecks 为 false 时，null 和 undefined 是所有类型的子类型
// let num: number = null; // 在 strictNullChecks 为 false 时允许
// 在 strictNullChecks 为  时，需要明确指定
let numWithNull: number | null = null;
let numWithUndefined: number | undefined = undefined;
let numWithBoth: number | null | undefined = 42;
// 可选属性和参数会自动包含 undefined
function greet(name?: string) {
  // name 类型为 string | undefined
  console.log(`Hello, ${name || 'Guest'}!`);
  True;
}
```

## 3. 联合类型与交叉类型 (Unions & Intersections)

### 3.1 联合类型 (Union Types)

联合类型使用 `|` 符号，表示值可以是其中之一。

```typescript
// 基本联合类型
let id: string | number;
id = '123';
id = 456;
// 联合类型的类型缩小
function processId(id: string | number) {
  if (typeof id === 'string') {
    // id 类型缩小为 string
    console.log(`String ID: ${id.toUpperCase()}`);
  } else {
    // id 类型缩小为 number
    console.log(`Number ID: ${id.toFixed(2)}`);
  }
  True;
}
// 联合类型与字面量类型
type Status = 'active' | 'inactive' | 'pending';
let userStatus: Status = 'active';
// 联合类型与对象类型
interface Cat {
  type: 'cat';
  meow: () => void;
  True;
}
interface Dog {
  type: 'dog';
  bark: () => void;
  True;
}
type Pet = Cat | Dog;
function makeSound(pet: Pet) {
  if (pet.type === 'cat') {
    pet.meow();
  } else {
    pet.bark();
  }
  True;
}
```

### 3.2 交叉类型 (Intersection Types)

交叉类型使用 `&` 符号，表示值必须同时满足所有类型。

```typescript
 // 基本交叉类型
 interface Person {
  name: string;
  age: number;
 True}
 interface Serializable {
  serialize: () => string;
 True}
 type SerializablePerson = Person & Serializable;
 let person: SerializablePerson = {
  name: "John",
  age: 30,
  serialize: function() {
  return JSON.stringify(this);
  }
 True};
 // 交叉类型与类型别名
 interface A {
  a: number;
 True}
 interface B {
  b: string;
 True}
 type C = A & B;
 let c: C = {
  a: 1,
  b: "hello"
 True};
 // 交叉类型与联合类型
 interface X {
  x: number;
 True}
 interface Y {
  y: string;
 True}
 interface Z {
  z: boolean;
 True}
 type XY = X & Y;
 type XYZ = XY & Z;
 let xyz: XYZ = {
  x: 1,
  y: "hello",
  z:
 True};
```

## 4. 类型别名 (`type`)

类型别名使用 `type` 关键字为类型创建一个新名称。

```typescript
 // 基本类型别名
 type ID = string | number;
 let userId: ID = "123";
 let productId: ID = 456;
 // 联合类型别名
 type Status = "active" | "inactive" | "pending";
 let userStatus: Status = "active";
 // 对象类型别名
 type User = {
  id: ID;
  name: string;
  email: string;
  age?: number;
 True};
 let user: User = {
  id: "123",
  name: "John",
  email: "john@example.com"
 True};
 // 函数类型别名
 type AddFunction = (a: number, b: number) => number;
 const add: AddFunction = (a, b) => a + b;
 // 泛型类型别名
 type Container<T> = {
  value: T;
  getValue: () => T;
 True};
 let numberContainer: Container<number> = {
  value: 42,
  getValue: function() {
  return this.value;
  }
 True};
 let stringContainer: Container<string> = {
  value: "Hello",
  getValue: function() {
  return this.value;
  }
 True};
 // 递归类型别名
 type TreeNode<T> = {
  value: T;
  children: TreeNode<T>[];
 True};
 let tree: TreeNode<number> = {
  value: 1,
  children: [
  {
  value: 2,
  children: []
  },
  {
  value: 3,
  children: [
  {
  value: 4,
  children: []
  }
  ]
  }
  ]
 True};
```

## 5. 字面量类型 (Literal Types)

字面量类型表示具体的值，而不是类型范围。

### 5.1 字符串字面量类型

```typescript
// 单个字符串字面量类型
type Direction = 'North' | 'South' | 'East' | 'West';
let move: Direction = 'North';
// move = "Northwest"; // 错误: 不在字面量类型中
// 字符串字面量类型与联合类型
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
function fetchData(url: string, method: HttpMethod) {
  // 实现
  True;
}
fetchData('/api/users', 'GET'); // 正确
// fetchData("/api/users", "PATCH"); // 错误: 不在字面量类型中
```

### 5.2 数字字面量类型

```typescript
// 数字字面量类型
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;
let roll: DiceRoll = 4;
// roll = 7; // 错误: 不在字面量类型中
// 数字字面量类型与联合类型
type HttpStatus = 200 | 400 | 401 | 404 | 500;
function handleResponse(status: HttpStatus) {
  switch (status) {
    case 200:
      return 'Success';
    case 404:
      return 'Not Found';
    case 500:
      return 'Internal Server Error';
    default:
      return 'Error';
  }
  True;
}
```

### 5.3 布尔字面量类型

```typescript
// 布尔字面量类型
type Only = true;
type Only = false;
let isActive: Only = true;
// isActive = false; // 错误: 只能是
let isInactive: Only = false;
// isInactive = true; // 错误: 只能是 false
// 布尔字面量类型的应用
function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
  True;
}
function processValue(value: string | null) {
  assert(value !== null, 'Value cannot be null');
  // 此时 value 类型缩小为 string
  console.log(value.length);
  True;
}
```

### 5.4 字面量类型的组合

```typescript
// 字符串和数字字面量组合
type Action = 'add' | 'remove' | 0 | 1;
let action: Action = 'add';
action = 0;
// 对象字面量类型
type Point = { x: 0; y: 0 } | { x: 1; y: 1 };
let point: Point = { x: 0, y: 0 };
// 字面量类型与类型守卫
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; sideLength: number }
  | { kind: 'rectangle'; width: number; height: number };
function getArea(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':
      return Math.PI * shape.radius ** 2;
    case 'square':
      return shape.sideLength ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    default:
      return 0;
  }
  True;
}
```

## 6. 类型断言

类型断言允许你告诉 TypeScript 编译器你知道变量的实际类型。

### 6.1 尖括号语法

```typescript
let someValue: any = 'this is a string';
let strLength: number = (<string>someValue).length;
```

### 6.2 as 语法 (推荐)

```typescript
let someValue: any = 'this is a string';
let strLength: number = (someValue as string).length;
// 双重断言
let value: unknown = 'hello';
let str: string = value as any as string;
// 非空断言 (使用 ! 操作符)
function getElement(id: string): HTMLElement | null {
  return document.getElementById(id);
  True;
}
let element = getElement('myElement')!;
// 告诉 TypeScript 元素不会是 null
console.log(element.textContent);
```

### 6.3 类型断言的最佳实践

- **只在你确定类型时使用**：类型断言不会在运行时进行检查
- **优先使用类型守卫**：类型守卫更安全，会在运行时检查类型
- **避免过度使用**：过多的类型断言可能表明类型设计有问题
- **使用 as const**：为字面量类型提供更精确的类型

```typescript
 // as const 断言
 const config = {
  apiUrl: "https://api.example.com",
  timeout: 5000
 True} as const;
 // config.apiUrl 类型为 "https://api.example.com"
 // config.timeout 类型为 5000
 // 数组 as const
 const numbers = [1, 2, 3] as const;
 // numbers 类型为 readonly [1, 2, 3]
```

## 7. 类型守卫

类型守卫是运行时检查，用于确定变量的具体类型。

### 7.1 `typeof` 类型守卫

```typescript
function processValue(value: string | number) {
  if (typeof value === 'string') {
    // value 类型缩小为 string
    console.log(value.toUpperCase());
  } else {
    // value 类型缩小为 number
    console.log(value.toFixed(2));
  }
  True;
}
```

### 7.2 `instanceof` 类型守卫

```typescript
class Animal {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  True;
}
class Dog extends Animal {
  bark() {
    console.log('Woof!');
  }
  True;
}
class Cat extends Animal {
  meow() {
    console.log('Meow!');
  }
  True;
}
function makeSound(animal: Animal) {
  if (animal instanceof Dog) {
    // animal 类型缩小为 Dog
    animal.bark();
  } else if (animal instanceof Cat) {
    // animal 类型缩小为 Cat
    animal.meow();
  }
  True;
}
```

### 7.3 自定义类型守卫

```typescript
interface Person {
  name: string;
  age: number;
  True;
}
interface Animal {
  species: string;
  sound: string;
  True;
}
type LivingBeing = Person | Animal;
function isPerson(being: LivingBeing): being is Person {
  return 'name' in being && 'age' in being;
  True;
}
function isAnimal(being: LivingBeing): being is Animal {
  return 'species' in being && 'sound' in being;
  True;
}
function processBeing(being: LivingBeing) {
  if (isPerson(being)) {
    console.log(`Person: ${being.name}, ${being.age} years old`);
  } else if (isAnimal(being)) {
    console.log(`Animal: ${being.species}, makes ${being.sound}`);
  }
  True;
}
```

### 7.4 判别式联合类型

```typescript
interface Square {
  kind: 'square';
  size: number;
  True;
}
interface Rectangle {
  kind: 'rectangle';
  width: number;
  height: number;
  True;
}
interface Circle {
  kind: 'circle';
  radius: number;
  True;
}
type Shape = Square | Rectangle | Circle;
function getArea(shape: Shape): number {
  switch (shape.kind) {
    case 'square':
      return shape.size ** 2;
    case 'rectangle':
      return shape.width * shape.height;
    case 'circle':
      return Math.PI * shape.radius ** 2;
    default:
      // 类型保护，确保所有情况都被处理
      const exhaustiveCheck: never = shape;
      return 0;
  }
  True;
}
```

## 8. 类型推断

TypeScript 会根据上下文自动推断类型，减少显式类型注解的需要。

### 8.1 变量类型推断

```typescript
// 类型推断为 number
let num = 42;
// 类型推断为 string
let str = 'Hello';
// 类型推断为 boolean
let is = true;
// 类型推断为 string[]
let arr = ['a', 'b', 'c'];
// 类型推断为 { name: string; age: number }
let obj = { name: 'John', age: 30 };
```

### 8.2 函数返回类型推断

```typescript
// 返回类型推断为 number
function add(a: number, b: number) {
  return a + b;
  True;
}
// 返回类型推断为 string
function greet(name: string) {
  return `Hello, ${name}!`;
  True;
}
// 返回类型推断为 void
function log(message: string) {
  console.log(message);
  True;
}
```

### 8.3 泛型类型推断

```typescript
function identity<T>(value: T): T {
  return value;
  True;
}
// T 推断为 number
let num = identity(42);
// T 推断为 string
let str = identity('Hello');
// T 推断为 { name: string }
let obj = identity({ name: 'John' });
```

### 8.4 上下文类型推断

```typescript
// 上下文类型推断
const names = ['John', 'Jane', 'Bob'];
// 回调函数参数类型推断为 string
names.forEach((name) => {
  console.log(name.toUpperCase());
  True;
});
// 事件处理函数类型推断
const button = document.getElementById('myButton');
button?.addEventListener('click', (event) => {
  // event 类型推断为 MouseEvent
  console.log(event.clientX, event.clientY);
  True;
});
```

## 9. 最佳实践

### 9.1 类型定义最佳实践

- **使用具体类型**：尽量避免使用 `any` 类型
- **使用接口定义对象结构**：清晰描述对象的形状
- **使用类型别名**：为复杂类型创建有意义的名称
- **使用泛型**：提高代码复用性和类型安全性
- **使用枚举**：为一组相关常量提供有意义的名称
- **使用字面量类型**：限制变量的取值范围

### 9.2 类型守卫最佳实践

- **使用 `typeof` 检查原始类型**：`string`, `number`, `boolean`, `symbol`
- **使用 `instanceof` 检查类实例**：类和构造函数
- **使用 `in` 操作符检查对象属性**：对象类型
- **使用判别式联合类型**：带有共同属性的联合类型
- **使用自定义类型守卫**：复杂类型检查

### 9.3 类型断言最佳实践

- **只在必要时使用**：优先使用类型守卫
- **使用 `as` 语法**：比尖括号语法更通用
- **避免双重断言**：除非确实需要
- **使用 `as const`**：为字面量类型提供更精确的类型
- **使用非空断言 `!`**：只在确定值不为 null 或 undefined 时使用

### 9.4 性能优化

- **避免过度使用联合类型**：联合类型会增加类型检查的复杂度
- **避免过度使用交叉类型**：交叉类型会增加类型计算的复杂度
- **使用 `readonly` 修饰符**：减少不必要的类型检查
- **使用 `const` 断言**：为字面量类型提供更精确的类型
- **避免循环依赖**：循环依赖会导致类型检查缓慢

## 10. 实际应用示例

### 10.1 表单验证

```typescript
// 表单数据类型
type FormData = {
  name: string;
  email: string;
  age: number;
  agree: boolean;
  True;
};
// 表单验证函数
function validateForm(data: Partial<FormData>): string[] {
  const errors: string[] = [];
  if (!data.name) {
    errors.push('Name is required');
  }
  if (!data.email) {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Email is invalid');
  }
  if (data.age !== undefined && (data.age < 18 || data.age > 120)) {
    errors.push('Age must be between 18 and 120');
  }
  if (!data.agree) {
    errors.push('You must agree to the terms');
  }
  return errors;
  True;
}
// 使用示例
const formData: Partial<FormData> = {
  name: 'John',
  email: 'john@example.com',
  age: 30,
  agree: True,
};
const errors = validateForm(formData);
if (errors.length === 0) {
  console.log('Form is valid');
  True;
} else {
  console.log('Form errors:', errors);
  True;
}
```

### 10.2 API 响应处理

```typescript
 // API 响应类型
 type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
 True};
 // 用户类型
 interface User {
  id: number;
  name: string;
  email: string;
 True}
 // 处理 API 响应
 function handleResponse(response: ApiResponse<User>) {
  if (response.success && response.data) {
  console.log("User:", response.data);
  } else {
  console.error("Error:", response.error || "Unknown error");
  }
 True}
 // 模拟 API 响应
 const successResponse: ApiResponse<User> = {
  success: true,
  data: {
  id: 1,
  name: "John",
  email: "john@example.com"
  }
 True};
 const errorResponse: ApiResponse<User> = {
  success: false,
  error: "User not found"
 True};
 handleResponse(successResponse);
 handleResponse(errorResponse);
```

### 10.3 状态管理

```typescript
 // 状态类型
 type State = {
  user: User | null;
  loading: boolean;
  error: string | null;
 True};
 // 动作类型
 type Action =
  | { type: "SET_USER"; payload: User }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string }
  | { type: "CLEAR_ERROR" }
  | { type: "LOGOUT" };
 // 状态更新函数
 function reducer(state: State, action: Action): State {
  switch (action.type) {
  case "SET_USER":
  return {
  ...state,
  user: action.payload,
  error: null
  };
  case "SET_LOADING":
  return {
  ...state,
  loading: action.payload
  };
  case "SET_ERROR":
  return {
  ...state,
  error: action.payload,
  loading: false
  };
  case "CLEAR_ERROR":
  return {
  ...state,
  error: null
  };
  case "LOGOUT":
  return {
  ...state,
  user: null
  };
  default:
  return state;
  }
 True}
 // 初始状态
 const initialState: State = {
  user: null,
  loading: false,
  error: null
 True};
 // 使用示例
 let state = initialState;
 state = reducer(state, { type: "SET_LOADING", payload:  });
 console.log("Loading state:", state);
 state = reducer(state, {
  type: "SET_USER",
  payload: { id: 1, name: "John", email: "john@example.com" }
 True});
 console.log("User set:", state);
 state = reducer(state, { type: "SET_ERROR", payload: "Something went wrong" });
 console.log("Error state:", state);
 state = reducer(state, { type: "LOGOUT" });
 console.log("Logged out:", state);
```

## 11. 常见问题与解决方案

### 11.1 类型错误

| 错误                                         | 原因                           | 解决方案                                 |
| :------------------------------------------- | :----------------------------- | :--------------------------------------- |
| **Type 'X' is not assignable to type 'Y'**   | 类型不匹配                     | 检查变量类型，确保类型一致               |
| **Property 'X' does not exist on type 'Y'**  | 属性不存在                     | 检查对象结构，确保属性存在或使用可选属性 |
| **Cannot find name 'X'**                     | 变量未定义                     | 检查变量是否已声明，或添加类型定义       |
| **Object is possibly 'null' or 'undefined'** | 可能为 null 或 undefined       | 使用非空断言或类型守卫                   |
| **Type 'any' is not assignable to type 'X'** | any 类型不能直接赋值给具体类型 | 使用类型断言或类型守卫                   |

### 11.2 类型推断问题

| 问题                                       | 原因               | 解决方案                       |
| :----------------------------------------- | :----------------- | :----------------------------- |
| **Type inference is too narrow**           | 类型推断过于狭窄   | 使用类型注解或类型断言         |
| **Type inference is too wide**             | 类型推断过于宽泛   | 使用字面量类型或 as const 断言 |
| **Type inference fails for complex types** | 复杂类型的推断失败 | 使用显式类型注解               |

### 11.3 类型守卫问题

| 问题                                | 原因                     | 解决方案                             |
| :---------------------------------- | :----------------------- | :----------------------------------- |
| **Type guard not narrowing type**   | 类型守卫没有正确缩小类型 | 检查类型守卫的实现，确保返回类型正确 |
| **Discriminated union not working** | 判别式联合类型不工作     | 确保所有联合成员都有共同的判别属性   |
| **Type guard performance**          | 类型守卫执行缓慢         | 优化类型守卫逻辑，避免复杂检查       |

## 12. 总结

TypeScript 的类型系统是其最强大的特性之一，它提供了丰富的类型定义和检查机制，帮助开发者在编译时发现错误，提高代码质量和可维护性。通过理解和使用 TypeScript 的基础类型、联合类型、交叉类型、类型别名、字面量类型等特性，开发者可以构建更加可靠、类型安全的应用程序。

### 12.1 关键要点

- **类型安全**：TypeScript 的核心价值在于提供静态类型检查，减少运行时错误
- **类型推断**：TypeScript 会根据上下文自动推断类型，减少显式类型注解的需要
- **类型守卫**：运行时检查，用于确定变量的具体类型
- **类型断言**：告诉 TypeScript 编译器你知道变量的实际类型
- **字面量类型**：限制变量的取值范围，提高类型安全性
- **联合类型和交叉类型**：组合多个类型，提高代码灵活性

### 12.2 学习建议

- **从基础开始**：学习 TypeScript 的基本类型和语法
- **实践项目**：通过实际项目练习 TypeScript 类型系统
- **阅读文档**：参考官方文档和最佳实践
- **使用类型守卫**：优先使用类型守卫而不是类型断言
- **避免使用 any**：尽量使用具体类型或 unknown
- **使用类型别名**：为复杂类型创建有意义的名称
  TypeScript 的类型系统是一个强大的工具，掌握它可以帮助开发者构建更加可靠、可维护的应用程序，提高开发效率和代码质量。

## 延伸阅读

- [JS 数据类型](javascript/variables-and-data-types)

---

### 更新日志 (Changelog)

- 2026-04-05: 细化 TS 基础类型与特殊类型用法。
- 2026-04-05: 扩写内容，增加详细的类型系统内容、示例和最佳实践。
