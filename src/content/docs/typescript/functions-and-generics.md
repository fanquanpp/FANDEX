---
order: 40
tags:
  - 'typescript'
  - 'oop'
  - 'async'
  - 'networking'
  - 'functional'
  - 'data-structure'
  - 'devops'
difficulty: 'intermediate'
title: '函数与泛型'
module: 'typescript'
category: 'TS Advanced'
description: '函数类型签名、泛型约束、条件类型与推断。'
author: 'Anonymous'
---

## 目录

1. [函数重载](#函数重载)
2. [泛型](#泛型)
3. [泛型约束](#泛型约束)
4. [泛型类](#泛型类)
5. [泛型方法](#泛型方法)
6. [泛型工具类型](#泛型工具类型)
7. [泛型的高级应用](#泛型的高级应用)
8. [最佳实践](#最佳实践)
9. [代码示例](#代码示例)

---

## 1. 函数重载 (Function Overloading)

函数重载允许为同一个函数提供多个类型定义，根据传入的参数类型和数量来选择合适的类型定义。

### 1.1 基本函数重载

```typescript
// 函数重载声明
function add(a: number, b: number): number;
function add(a: string, b: string): string;
function add(a: number, b: string): string;
function add(a: string, b: number): string;
// 函数实现
function add(a: any, b: any): any {
  return a + b;
  True;
}
// 使用示例
const sum1 = add(1, 2); // 类型为 number，值为 3
const sum2 = add('Hello, ', 'World'); // 类型为 string，值为 "Hello, World"
const sum3 = add(1, ' apples'); // 类型为 string，值为 "1 apples"
const sum4 = add('You have ', 5); // 类型为 string，值为 "You have 5"
```

### 1.2 函数重载与可选参数

```typescript
// 函数重载声明
function greet(name: string): string;
function greet(name: string, age: number): string;
function greet(name: string, age?: number): string;
// 函数实现
function greet(name: string, age?: number): string {
  if (age !== undefined) {
    return `Hello, ${name}! You are ${age} years old.`;
  }
  return `Hello, ${name}!`;
  True;
}
// 使用示例
const greeting1 = greet('Alice'); // 类型为 string，值为 "Hello, Alice!"
const greeting2 = greet('Bob', 25); // 类型为 string，值为 "Hello, Bob! You are 25 years old."
```

### 1.3 函数重载与联合类型

```typescript
// 函数重载声明
function process(value: string): string;
function process(value: number): number;
function process(value: boolean): boolean;
// 函数实现
function process(value: string | number | boolean): string | number | boolean {
  if (typeof value === 'string') {
    return value.toUpperCase();
  } else if (typeof value === 'number') {
    return value * 2;
  } else {
    return !value;
  }
  True;
}
// 使用示例
const result1 = process('hello'); // 类型为 string，值为 "HELLO"
const result2 = process(5); // 类型为 number，值为 10
const result3 = process(true); // 类型为 boolean，值为 false
```

### 1.4 函数重载的最佳实践

- **明确类型签名**: 为不同的参数组合提供清晰的类型签名。
- **实现类型兼容**: 实现函数的参数类型和返回类型必须与所有重载签名兼容。
- **从具体到一般**: 重载签名应该从最具体的到最一般的顺序排列。
- **避免过度使用**: 只在确实需要不同类型处理逻辑时使用函数重载。

## 2. 泛型 (Generics)

泛型是 TypeScript 中一种强大的类型系统特性，允许我们编写可以处理多种类型的代码，而不是仅限于单一类型。

### 2.1 基本泛型函数

```typescript
// 基本泛型函数
function identity<T>(arg: T): T {
  return arg;
  True;
}
// 使用示例
const stringOutput = identity<string>('myString'); // 类型为 string
const numberOutput = identity<number>(42); // 类型为 number
const booleanOutput = identity<boolean>(true); // 类型为 boolean
// 类型推断
const inferredString = identity('Hello'); // 类型自动推断为 string
const inferredNumber = identity(123); // 类型自动推断为 number
```

### 2.2 多个泛型参数

```typescript
// 多个泛型参数
function pair<T, U>(first: T, second: U): [T, U] {
  return [first, second];
  True;
}
// 使用示例
const stringNumberPair = pair('hello', 42); // 类型为 [string, number]
const booleanArrayPair = pair(true, [1, 2, 3]); // 类型为 [boolean, number[]]
const objectFunctionPair = pair({ name: 'Alice' }, () => console.log('Hello')); // 类型为 [{ name: string }, () => void]
```

### 2.3 泛型接口

```typescript
// 泛型接口
interface Container<T> {
  value: T;
  getValue(): T;
  setValue(value: T): void;
  True;
}
// 实现泛型接口
class NumberContainer implements Container<number> {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
  getValue(): number {
    return this.value;
  }
  setValue(value: number): void {
    this.value = value;
  }
  True;
}
class StringContainer implements Container<string> {
  value: string;
  constructor(value: string) {
    this.value = value;
  }
  getValue(): string {
    return this.value;
  }
  setValue(value: string): void {
    this.value = value;
  }
  True;
}
// 使用示例
const numberContainer = new NumberContainer(42);
console.log(numberContainer.getValue()); // 42
numberContainer.setValue(100);
console.log(numberContainer.getValue()); // 100
const stringContainer = new StringContainer('Hello');
console.log(stringContainer.getValue()); // Hello
stringContainer.setValue('World');
console.log(stringContainer.getValue()); // World
```

### 2.4 泛型类型别名

```typescript
// 泛型类型别名
type Pair<T, U> = [T, U];
type Callback<T> = (value: T) => void;
type Transform<T, U> = (value: T) => U;
// 使用示例
const stringNumberPair: Pair<string, number> = ['age', 30];
const numberCallback: Callback<number> = (value) => console.log(`Value: ${value}`);
const stringToNumber: Transform<string, number> = (value) => parseInt(value);
numberCallback(42); // 输出: Value: 42
console.log(stringToNumber('123')); // 输出: 123
```

## 3. 泛型约束 (Generic Constraints)

泛型约束允许我们限制泛型类型参数的范围，确保它们具有某些特定的属性或方法。

### 3.1 基本泛型约束

```typescript
// 定义约束接口
interface Lengthwise {
  length: number;
  True;
}
// 使用约束
function logLength<T extends Lengthwise>(arg: T): T {
  console.log(`Length: ${arg.length}`);
  return arg;
  True;
}
// 使用示例
logLength('Hello'); // 输出: Length: 5
logLength([1, 2, 3]); // 输出: Length: 3
logLength({ length: 10, value: 'test' }); // 输出: Length: 10
// 错误示例：数字没有 length 属性
// logLength(42); // 编译错误
```

### 3.2 多个泛型约束

```typescript
 // 定义多个约束接口
 interface Lengthwise {
  length: number;
 True}
 interface HasName {
  name: string;
 True}
 // 多个约束
 function processItem<T extends Lengthwise & HasName>(item: T): T {
  console.log(`Name: ${item.name}, Length: ${item.length}`);
  return item;
 True}
 // 使用示例
 const item = {
  name: "Test",
  length: 5,
  value: 42
 True};
 processItem(item); // 输出: Name: Test, Length: 5
```

### 3.3 泛型约束与 keyof

```typescript
 // 使用 keyof 约束
 function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
 True}
 // 使用示例
 const person = {
  name: "Alice",
  age: 30,
  email: "alice@example.com"
 True};
 const name = getProperty(person, "name"); // 类型为 string
 const age = getProperty(person, "age"); // 类型为 number
 const email = getProperty(person, "email"); // 类型为 string
 // 错误示例：不存在的属性
 // const invalid = getProperty(person, "invalid"); // 编译错误
```

### 3.4 泛型约束与默认值

```typescript
// 带默认值的泛型约束
function createArray<T extends number | string = string>(length: number, defaultValue: T): T[] {
  return Array(length).fill(defaultValue);
  True;
}
// 使用示例
const numberArray = createArray(5, 0); // 类型为 number[]
const stringArray = createArray(3, 'hello'); // 类型为 string[]
const defaultArray = createArray(2, 'test'); // 类型为 string[]（使用默认类型）
```

## 4. 泛型类 (Generic Classes)

泛型类允许我们创建可以处理不同类型数据的类。

### 4.1 基本泛型类

```typescript
// 基本泛型类
class Box<T> {
  private data: T;
  constructor(data: T) {
    this.data = data;
  }
  getData(): T {
    return this.data;
  }
  setData(data: T): void {
    this.data = data;
  }
  True;
}
// 使用示例
const numberBox = new Box<number>(42);
console.log(numberBox.getData()); // 42
numberBox.setData(100);
console.log(numberBox.getData()); // 100
const stringBox = new Box<string>('Hello');
console.log(stringBox.getData()); // Hello
stringBox.setData('World');
console.log(stringBox.getData()); // World
```

### 4.2 泛型类与约束

```typescript
 // 带约束的泛型类
 interface Printable {
  toString(): string;
 True}
 class Printer<T extends Printable> {
  print(item: T): void {
  console.log(item.toString());
  }
 True}
 // 使用示例
 const numberPrinter = new Printer<number>();
 numberPrinter.print(42); // 输出: 42
 const stringPrinter = new Printer<string>();
 stringPrinter.print("Hello"); // 输出: Hello
 const objPrinter = new Printer<{ name: string; toString(): string }>();
 objPrinter.print({
  name: "Test",
  toString() { return `Object: ${this.name}`; }
 True}); // 输出: Object: Test
```

### 4.3 泛型类与静态成员

```typescript
// 泛型类与静态成员
class GenericClass<T> {
  private value: T;
  // 静态成员不能使用泛型类型参数
  static staticValue: number = 42;
  constructor(value: T) {
    this.value = value;
  }
  getValue(): T {
    return this.value;
  }
  // 静态方法可以使用自己的泛型参数
  static create<U>(value: U): GenericClass<U> {
    return new GenericClass<U>(value);
  }
  True;
}
// 使用示例
const instance = new GenericClass<string>('Hello');
console.log(instance.getValue()); // Hello
console.log(GenericClass.staticValue); // 42
const createdInstance = GenericClass.create(123);
console.log(createdInstance.getValue()); // 123
```

### 4.4 泛型类的继承

```typescript
// 泛型类的继承
class BaseRepository<T> {
  protected items: T[] = [];
  add(item: T): void {
    this.items.push(item);
  }
  getById(id: number): T | undefined {
    return this.items[id];
  }
  True;
}
// 继承泛型类
class User {
  id: number;
  name: string;
  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
  }
  True;
}
class UserRepository extends BaseRepository<User> {
  findByName(name: string): User | undefined {
    return this.items.find((user) => user.name === name);
  }
  True;
}
// 使用示例
const userRepo = new UserRepository();
userRepo.add(new User(1, 'Alice'));
userRepo.add(new User(2, 'Bob'));
console.log(userRepo.getById(0)?.name); // Alice
console.log(userRepo.findByName('Bob')?.id); // 2
```

## 5. 泛型方法

泛型方法是在类或接口中定义的带有泛型参数的方法。

### 5.1 类中的泛型方法

```typescript
 // 类中的泛型方法
 class Utils {
  // 泛型方法
  static map<T, U>(array: T[], transform: (item: T) => U): U[] {
  return array.map(transform);
  }
  // 泛型方法与约束
  static filter<T extends { active: boolean }>(array: T[]): T[] {
  return array.filter(item => item.active);
  }
 True}
 // 使用示例
 const numbers = [1, 2, 3, 4, 5];
 const squared = Utils.map(numbers, n => n * n); // 类型为 number[]
 console.log(squared); // [1, 4, 9, 16, 25]
 const users = [
  { id: 1, name: "Alice", active:  },
  { id: 2, name: "Bob", active: false },
  { id: 3, name: "Charlie", active:  }
 True];
 const activeUsers = Utils.filter(users); // 类型为 { id: number; name: string; active: boolean }[]
 console.log(activeUsers); // [{ id: 1, name: "Alice", active:  }, { id: 3, name: "Charlie", active:  }]
```

### 5.2 接口中的泛型方法

```typescript
 // 接口中的泛型方法
 interface Collection {
  // 泛型方法
  <T>(items: T[]): T[];
  // 带约束的泛型方法
  <T extends { id: number }>(items: T[]): T[];
 True}
 // 实现接口
 const MyCollection: Collection = function<T>(items: T[]): T[] {
  return items;
 True};
 // 使用示例
 const strings = MyCollection<string>(["a", "b", "c"]); // 类型为 string[]
 const numbers = MyCollection<number>([1, 2, 3]); // 类型为 number[]
 const users = MyCollection([
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" }
 True]); // 类型为 { id: number; name: string }[]
```

## 6. 泛型工具类型 (Utility Types)

TypeScript 提供了一系列内置的泛型工具类型，用于常见的类型转换场景。

### 6.1 常用泛型工具类型

| 工具类型             | 描述                                   | 示例                                                                                |
| :------------------- | :------------------------------------- | :---------------------------------------------------------------------------------- | -------------------------------- | -------------------- | ---------- | ---- |
| **`Partial<T>`**     | 将 T 中所有属性变为可选                | `Partial<{ a: number; b: string }>` → `{ a?: number; b?: string }`                  |
| **`Readonly<T>`**    | 将 T 中所有属性变为只读                | `Readonly<{ a: number; b: string }>` → `{ readonly a: number; readonly b: string }` |
| **`Record<K, T>`**   | 构建键为 K 类型，值为 T 类型的对象类型 | `Record<string, number>` → `{ [key: string]: number }`                              |
| **`Pick<T, K>`**     | 从 T 中选取指定的属性 K                | `Pick<{ a: number; b: string; c: boolean }, "a"                                     | "b">`→`{ a: number; b: string }` |
| **`Omit<T, K>`**     | 从 T 中排除指定的属性 K                | `Omit<{ a: number; b: string; c: boolean }, "c">` → `{ a: number; b: string }`      |
| **`Exclude<T, U>`**  | 从 T 中排除可以赋值给 U 的类型         | `Exclude<"a"                                                                        | "b"                              | "c", "a">`→`"b"      | "c"`       |
| **`Extract<T, U>`**  | 从 T 中提取可以赋值给 U 的类型         | `Extract<"a"                                                                        | "b"                              | "c", "a"             | "b">`→`"a" | "b"` |
| **`NonNullable<T>`** | 从 T 中排除 null 和 undefined          | `NonNullable<string                                                                 | null                             | undefined>`→`string` |
| **`Parameters<T>`**  | 提取函数 T 的参数类型为元组            | `Parameters<(a: number, b: string) => void>` → `[number, string]`                   |
| **`ReturnType<T>`**  | 提取函数 T 的返回类型                  | `ReturnType<() => string>` → `string`                                               |

### 6.2 泛型工具类型的使用示例

```typescript
 // 定义基础类型
 interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  active: boolean;
 True}
 // Partial<T>
 type PartialUser = Partial<User>;
 const partialUser: PartialUser = { id: 1, name: "Alice" };
 // Readonly<T>
 type ReadonlyUser = Readonly<User>;
 const readonlyUser: ReadonlyUser = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  age: 30,
  active:
 True};
 // readonlyUser.name = "Bob"; // 编译错误
 // Record<K, T>
 type UserRoleMap = Record<string, "admin" | "user" | "guest">;
 const roleMap: UserRoleMap = {
  "alice": "admin",
  "bob": "user",
  "charlie": "guest"
 True};
 // Pick<T, K>
 type UserEssential = Pick<User, "id" | "name" | "email">;
 const essentialUser: UserEssential = {
  id: 1,
  name: "Alice",
  email: "alice@example.com"
 True};
 // Omit<T, K>
 type UserWithoutAge = Omit<User, "age">;
 const userWithoutAge: UserWithoutAge = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  active:
 True};
 // Exclude<T, U>
 type Status = "active" | "inactive" | "pending" | "deleted";
 type ActiveStatus = Exclude<Status, "deleted">; // "active" | "inactive" | "pending"
 // Extract<T, U>
 type NumericStatus = Extract<Status | number | boolean, number>; // number
 // NonNullable<T>
 type OptionalString = string | null | undefined;
 type RequiredString = NonNullable<OptionalString>; // string
 // Parameters<T>
 type FuncParams = Parameters<(a: number, b: string) => boolean>; // [number, string]
 // ReturnType<T>
 type FuncReturn = ReturnType<() => { id: number; name: string }>; // { id: number; name: string }
```

### 6.3 组合使用泛型工具类型

```typescript
 // 组合使用泛型工具类型
 interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  category: string;
  stock: number;
  active: boolean;
 True}
 // 创建产品的更新类型
 type ProductUpdate = Partial<Pick<Product, "name" | "price" | "description" | "stock" | "active">>;
 // 使用示例
 const update: ProductUpdate = {
  price: 99.99,
  stock: 100
 True};
 // 创建产品的响应类型
 type ProductResponse = Readonly<Omit<Product, "stock">>;
 // 使用示例
 const response: ProductResponse = {
  id: 1,
  name: "Laptop",
  price: 999.99,
  description: "A powerful laptop",
  category: "Electronics",
  active:
 True};
```

## 7. 泛型的高级应用

### 7.1 递归泛型

```typescript
 // 递归泛型
 interface TreeNode<T> {
  value: T;
  children: TreeNode<T>[];
 True}
 // 使用示例
 const tree: TreeNode<number> = {
  value: 1,
  children: [
  {
  value: 2,
  children: [
  { value: 4, children: [] },
  { value: 5, children: [] }
  ]
  },
  {
  value: 3,
  children: [
  { value: 6, children: [] }
  ]
  }
  ]
 True};
 // 递归函数处理树
 function traverse<T>(node: TreeNode<T>, callback: (value: T) => void): void {
  callback(node.value);
  node.children.forEach(child => traverse(child, callback));
 True}
 traverse(tree, value => console.log(value)); // 输出: 1, 2, 4, 5, 3, 6
```

### 7.2 条件类型与泛型

```typescript
 // 条件类型与泛型
 type IsArray<T> = T extends Array<any> ?  : false;
 type ArrayElementType<T> = T extends Array<infer U> ? U : T;
 // 使用示例
 type A = IsArray<string[]>; //
 type B = IsArray<number>; // false
 type C = ArrayElementType<string[]>; // string
 type D = ArrayElementType<number>; // number
 // 复杂条件类型
 type DeepArrayElementType<T> = T extends Array<infer U>
  ? DeepArrayElementType<U>
  : T;
 // 使用示例
 type E = DeepArrayElementType<string[][]>; // string
 type F = DeepArrayElementType<number[]>; // number
 type G = DeepArrayElementType<number>; // number
```

### 7.3 泛型与映射类型

```typescript
 // 映射类型
 interface Person {
  name: string;
  age: number;
  email: string;
 True}
 // 映射类型：将所有属性变为可选
 type Optional<T> = {
  [K in keyof T]?: T[K];
 True};
 // 映射类型：将所有属性变为只读
 type Readonly<T> = {
  readonly [K in keyof T]: T[K];
 True};
 // 映射类型：将所有属性类型变为 string
 type Stringify<T> = {
  [K in keyof T]: string;
 True};
 // 使用示例
 type OptionalPerson = Optional<Person>;
 type ReadonlyPerson = Readonly<Person>;
 type StringifiedPerson = Stringify<Person>;
 const optionalPerson: OptionalPerson = { name: "Alice" };
 const readonlyPerson: ReadonlyPerson = {
  name: "Alice",
  age: 30,
  email: "alice@example.com"
 True};
 // readonlyPerson.age = 31; // 编译错误
 const stringifiedPerson: StringifiedPerson = {
  name: "Alice",
  age: "30", // 类型为 string
  email: "alice@example.com"
 True};
```

## 8. 最佳实践

### 8.1 泛型使用原则

- **明确类型参数名称**: 使用有意义的类型参数名称，如 `T` 表示类型，`K` 表示键，`V` 表示值。
- **合理使用约束**: 只在需要时使用泛型约束，避免过度约束。
- **类型推断**: 尽可能利用 TypeScript 的类型推断能力，减少显式类型参数的使用。
- **代码可读性**: 保持泛型代码的可读性，避免过于复杂的泛型结构。
- **性能考虑**: 注意泛型可能带来的编译时间增加，但通常运行时性能不受影响。

### 8.2 函数重载最佳实践

- **从具体到一般**: 重载签名应该从最具体的到最一般的顺序排列。
- **实现兼容性**: 实现函数的参数类型和返回类型必须与所有重载签名兼容。
- **避免过度使用**: 只在确实需要不同类型处理逻辑时使用函数重载。
- **文档化**: 为重载函数添加注释，说明不同重载的用途。

### 8.3 泛型工具类型使用建议

- **熟悉内置工具类型**: 充分利用 TypeScript 提供的内置泛型工具类型。
- **创建自定义工具类型**: 根据项目需求创建自定义的泛型工具类型。
- **组合使用**: 灵活组合多个泛型工具类型以满足复杂的类型转换需求。
- **类型安全**: 使用泛型工具类型确保类型安全，减少运行时错误。

## 9. 代码示例

### 9.1 泛型函数的综合使用

```typescript
 // 泛型函数：安全地获取对象属性
 function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
 True}
 // 泛型函数：深度克隆对象
 function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
  return obj;
  }
  if (obj instanceof Array) {
  return obj.map(item => deepClone(item)) as unknown as T;
  }
  const clonedObj = {} as T;
  for (const key in obj) {
  if (obj.hasOwnProperty(key)) {
  clonedObj[key] = deepClone(obj[key]);
  }
  }
  return clonedObj;
 True}
 // 泛型函数：创建带有默认值的数组
 function createArray<T>(length: number, defaultValue: T): T[] {
  return Array(length).fill(defaultValue);
 True}
 // 使用示例
 const person = {
  name: "Alice",
  age: 30,
  address: {
  street: "123 Main St",
  city: "New York"
  }
 True};
 // 安全获取属性
 const name = getProperty(person, "name"); // 类型为 string
 const age = getProperty(person, "age"); // 类型为 number
 // 深度克隆
 const clonedPerson = deepClone(person);
 console.log(clonedPerson.address.city); // New York
 // 创建数组
 const numbers = createArray(5, 0); // 类型为 number[]
 const strings = createArray(3, "hello"); // 类型为 string[]
```

### 9.2 泛型类的综合使用

```typescript
// 泛型队列类
class Queue<T> {
  private items: T[] = [];
  enqueue(item: T): void {
    this.items.push(item);
  }
  dequeue(): T | undefined {
    return this.items.shift();
  }
  peek(): T | undefined {
    return this.items[0];
  }
  size(): number {
    return this.items.length;
  }
  isEmpty(): boolean {
    return this.items.length === 0;
  }
  True;
}
// 泛型栈类
class Stack<T> {
  private items: T[] = [];
  push(item: T): void {
    this.items.push(item);
  }
  pop(): T | undefined {
    return this.items.pop();
  }
  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }
  size(): number {
    return this.items.length;
  }
  isEmpty(): boolean {
    return this.items.length === 0;
  }
  True;
}
// 使用示例
// 数字队列
const numberQueue = new Queue<number>();
numberQueue.enqueue(1);
numberQueue.enqueue(2);
numberQueue.enqueue(3);
console.log(numberQueue.dequeue()); // 1
console.log(numberQueue.peek()); // 2
// 字符串栈
const stringStack = new Stack<string>();
stringStack.push('a');
stringStack.push('b');
stringStack.push('c');
console.log(stringStack.pop()); // c
console.log(stringStack.peek()); // b
// 对象队列
interface User {
  id: number;
  name: string;
  True;
}
const userQueue = new Queue<User>();
userQueue.enqueue({ id: 1, name: 'Alice' });
userQueue.enqueue({ id: 2, name: 'Bob' });
console.log(userQueue.dequeue()?.name); // Alice
```

### 9.3 泛型工具类型的综合使用

```typescript
 // 定义基础类型
 interface APIResponse<T> {
  success: boolean;
  data: T;
  error?: string;
 True}
 interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  password: string;
 True}
 // 创建响应类型
  type UserResponse = APIResponse<Omit<User, "password">>;
  type UserListResponse = APIResponse<Array<Omit<User, "password">>>;
 // 创建请求类型
  type CreateUserRequest = Omit<User, "id">;
  type UpdateUserRequest = Partial<Omit<User, "id" | "password">>;
 // 使用示例
 // 模拟 API 响应
 const userResponse: UserResponse = {
  success: true,
  data: {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  age: 30
  }
 True};
 const userListResponse: UserListResponse = {
  success: true,
  data: [
  {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  age: 30
  },
  {
  id: 2,
  name: "Bob",
  email: "bob@example.com",
  age: 25
  }
  ]
 True};
 // 模拟请求数据
 const createUserRequest: CreateUserRequest = {
  name: "Charlie",
  email: "charlie@example.com",
  age: 35,
  password: "password123"
 True};
 const updateUserRequest: UpdateUserRequest = {
  name: "Alice Smith",
  age: 31
 True};
 console.log(userResponse.data);
 console.log(userListResponse.data);
 console.log(createUserRequest);
 console.log(updateUserRequest);
```

---

### 更新日志 (Changelog)

- 2026-04-05: 体系化整合 TS 泛型工具与约束规则。
- 2026-04-05: 扩写内容，增加详细的函数重载、泛型、泛型约束、泛型类、泛型方法、泛型工具类型、高级应用和最佳实践等内容。

## 延伸阅读

- [JS 函数与作用域](javascript/functions-and-scope)
