---
order: 60
tags:
  - typescript
difficulty: advanced
title: 高级类型与类型演算
module: typescript
category: 'TS Advanced'
description: 映射类型、条件类型、模板字面量类型与类型体操。
author: Anonymous
related:
  - typescript/声明文件编写
  - typescript/模块解析策略
  - typescript/类型体操实用模式
  - typescript/协变与逆变
prerequisites:
  - typescript/语法速查
---

## 1. 类型断言 (Type Assertions)

类型断言允许我们手动告诉编译器一个值的具体类型，当我们比编译器更了解变量的类型时非常有用。

### 1.1 基本语法

TypeScript 提供了两种类型断言语法：

```typescript
// 推荐语法：as 语法
let someValue: unknown = 'this is a string';
let strLength: number = (someValue as string).length;
// 角括号语法（在 JSX 中不推荐使用）
let someValue: unknown = 'this is a string';
let strLength: number = (<string>someValue).length;
```

### 1.2 类型断言的使用场景

#### 1.2.1 从 unknown 类型断言为具体类型

```typescript
function processValue(value: unknown): void {
  // 类型断言为 string
  if (typeof value === 'string') {
    console.log((value as string).toUpperCase());
  }
  // 类型断言为 number
  if (typeof value === 'number') {
    console.log((value as number).toFixed(2));
  }
}
processValue('hello'); // 输出: HELLO
processValue(42); // 输出: 42.00
```

#### 1.2.2 从联合类型断言为具体类型

```typescript
interface Cat {
  meow(): void;
  ;
}
interface Dog {
  bark(): void;
  ;
}
type Animal = Cat | Dog;
function makeSound(animal: Animal): void {
  // 类型断言为 Cat
  if ((animal as Cat).meow) {
    (animal as Cat).meow();
  } else {
    // 类型断言为 Dog
    (animal as Dog).bark();
  }
  ;
}
const cat: Cat = { meow: () => console.log('Meow!') };
const dog: Dog = { bark: () => console.log('Woof!') };
makeSound(cat); // 输出: Meow!
makeSound(dog); // 输出: Woof!
```

#### 1.2.3 断言为更具体的类型

```typescript
interface Person {
  name: string;
  age: number;
}
interface Employee extends Person {
  employeeId: number;
  department: string;
}
function getEmployeeInfo(person: Person): void {
  // 断言为 Employee 类型
  const employee = person as Employee;
  console.log(`Name: ${employee.name}, ID: ${employee.employeeId}`);
}
const employee: Employee = {
  name: 'Alice',
  age: 30,
  employeeId: 12345,
  department: 'Engineering',
};
getEmployeeInfo(employee); // 输出: Name: Alice, ID: 12345
```

### 1.3 类型断言的最佳实践

- **只在必要时使用**: 类型断言会绕过 TypeScript 的类型检查，应谨慎使用。
- **结合类型守卫**: 在使用类型断言前，最好先进行类型检查。
- **使用 as 语法**: 优先使用 `as` 语法，特别是在 JSX 代码中。
- **避免过度断言**: 不要使用类型断言来掩盖真正的类型问题。

## 2. 非空断言 (`!`)

非空断言操作符 `!` 告诉编译器一个值不为 `null` 或 `undefined`，当我们确定一个值不会是 `null` 或 `undefined` 时使用。

### 2.1 基本用法

```typescript
// 非空断言
let maybeNull: string | null = 'Hello';
let definitelyString: string = maybeNull!; // 告诉编译器 maybeNull 不为 null
// 访问可能为 null 的对象属性
interface User {
  name: string;
  email?: string;
  ;
}
const user: User = { name: 'Alice' };
const email: string = user.email!; // 告诉编译器 user.email 存在
// 调用可能为 undefined 的方法
interface Greeter {
  greet?: () => void;
  ;
}
const greeter: Greeter = { greet: () => console.log('Hello!') };
greeter.greet!(); // 告诉编译器 greet 方法存在
```

### 2.2 非空断言的使用场景

#### 2.2.1 初始化后肯定存在的值

```typescript
class User {
  private name: string | null = null;
  constructor(name: string) {
    this.setName(name);
  }
  private setName(name: string): void {
    this.name = name;
  }
  public getName(): string {
    // 构造函数中已初始化，肯定不为 null
    return this.name!;
  }
}
const user = new User('Alice');
console.log(user.getName()); // 输出: Alice
```

#### 2.2.2 经过类型检查后的值

```typescript
function processValue(value: string | null | undefined): void {
  if (value) {
    // 经过检查后，value 肯定不为 null 或 undefined
    console.log(value!.length); // 非空断言
  }
}
processValue('Hello'); // 输出: 5
processValue(null); // 无输出
processValue(undefined); // 无输出
```

### 2.3 非空断言的注意事项

- **运行时风险**: 非空断言只在编译时有效，运行时如果值为 `null` 或 `undefined`，会导致运行时错误。
- **谨慎使用**: 只在确定值不为 `null` 或 `undefined` 时使用。
- **替代方案**: 优先使用类型守卫或可选链操作符 (`?.`) 来处理可能为 `null` 或 `undefined` 的值。

## 3. 类型守卫 (Type Guards)

类型守卫是一种运行时检查，用于确定变量的具体类型，帮助编译器进行类型缩小。

### 3.1 内置类型守卫

#### 3.1.1 typeof 类型守卫

```typescript
function processValue(value: string | number | boolean): void {
  if (typeof value === 'string') {
    // 类型缩小为 string
    console.log(value.toUpperCase());
  } else if (typeof value === 'number') {
    // 类型缩小为 number
    console.log(value.toFixed(2));
  } else if (typeof value === 'boolean') {
    // 类型缩小为 boolean
    console.log(value ? '' : 'false');
  }
}
processValue('hello'); // 输出: HELLO
processValue(42); // 输出: 42.00
processValue(true); // 输出:
```

#### 3.1.2 instanceof 类型守卫

```typescript
class Animal {
  move(): void {
    console.log('Moving...');
  }
}
class Dog extends Animal {
  bark(): void {
    console.log('Woof!');
  }
}
class Cat extends Animal {
  meow(): void {
    console.log('Meow!');
  }
}
function makeSound(animal: Animal): void {
  if (animal instanceof Dog) {
    // 类型缩小为 Dog
    animal.bark();
  } else if (animal instanceof Cat) {
    // 类型缩小为 Cat
    animal.meow();
  } else {
    animal.move();
  }
}
const dog = new Dog();
const cat = new Cat();
const animal = new Animal();
makeSound(dog); // 输出: Woof!
makeSound(cat); // 输出: Meow!
makeSound(animal); // 输出: Moving...
```

#### 3.1.3 in 操作符类型守卫

```typescript
interface Cat {
  meow: () => void;
  ;
}
interface Dog {
  bark: () => void;
  ;
}
type Animal = Cat | Dog;
function makeSound(animal: Animal): void {
  if ('meow' in animal) {
    // 类型缩小为 Cat
    animal.meow();
  } else if ('bark' in animal) {
    // 类型缩小为 Dog
    animal.bark();
  }
  ;
}
const cat: Cat = { meow: () => console.log('Meow!') };
const dog: Dog = { bark: () => console.log('Woof!') };
makeSound(cat); // 输出: Meow!
makeSound(dog); // 输出: Woof!
```

### 3.2 自定义类型守卫

自定义类型守卫使用 `is` 关键字来定义一个函数，该函数返回一个布尔值，用于确定变量的类型。

```typescript
// 自定义类型守卫
function isString(value: any): value is string {
  return typeof value === 'string';
}
function isNumber(value: any): value is number {
  return typeof value === 'number';
}
function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}
function processValue(value: unknown): void {
  if (isString(value)) {
    // 类型缩小为 string
    console.log(value.toUpperCase());
  } else if (isNumber(value)) {
    // 类型缩小为 number
    console.log(value.toFixed(2));
  } else if (isBoolean(value)) {
    // 类型缩小为 boolean
    console.log(value ? '' : 'false');
  } else {
    console.log('Unknown type');
  }
}
processValue('hello'); // 输出: HELLO
processValue(42); // 输出: 42.00
processValue(true); // 输出:
processValue(null); // 输出: Unknown type
```

### 3.3 类型守卫的最佳实践

- **明确类型检查**: 类型守卫应该明确检查变量的类型，避免模糊的检查。
- **组合使用**: 可以组合使用多种类型守卫来处理复杂的类型场景。
- **可读性**: 自定义类型守卫函数应该有清晰的名称，说明其检查的类型。
- **性能考虑**: 类型守卫在运行时执行，应避免过于复杂的检查逻辑。

## 4. 映射类型 (Mapped Types)

映射类型允许我们根据现有类型创建新类型，通过遍历现有类型的属性并应用转换。

### 4.1 基本映射类型

```typescript
// 基本映射类型
interface Person {
  name: string;
  age: number;
  email: string;
}
// 只读映射类型
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};
// 可选映射类型
type Partial<T> = {
  [P in keyof T]?: T[P];
};
// 必需映射类型
type Required<T> = {
  [P in keyof T]-?: T[P];
};
// 使用示例
const readonlyPerson: Readonly<Person> = {
  name: 'Alice',
  age: 30,
  email: 'alice@example.com',
};
// readonlyPerson.name = "Bob"; // 编译错误
const partialPerson: Partial<Person> = {
  name: 'Bob',
};
const requiredPerson: Required<Partial<Person>> = {
  name: 'Charlie',
  age: 25,
  email: 'charlie@example.com',
};
```

### 4.2 映射类型修饰符

TypeScript 提供了三种映射类型修饰符：

1. **`readonly`**: 使属性变为只读
2. **`?`**: 使属性变为可选
3. **`-`**: 移除修饰符（如 `-readonly` 或 `-?`）

```typescript
interface Person {
  readonly name: string;
  age?: number;
  email: string;
}
// 移除 readonly 修饰符
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};
// 移除可选修饰符
type Required<T> = {
  [P in keyof T]-?: T[P];
};
// 同时移除 readonly 和可选修饰符
type MutableRequired<T> = {
  -readonly [P in keyof T]-?: T[P];
};
// 使用示例
const mutablePerson: Mutable<Person> = {
  name: 'Alice',
  email: 'alice@example.com',
};
mutablePerson.name = 'Bob'; // 现在可以修改
const requiredPerson: Required<Person> = {
  name: 'Charlie',
  age: 30, // 现在必需
  email: 'charlie@example.com',
};
```

### 4.3 键重映射

TypeScript 4.1+ 支持键重映射，允许我们在映射类型中修改属性键。

```typescript
interface Person {
  name: string;
  age: number;
  email: string;
}
// 键重映射：添加前缀
type Prefixed<T, Prefix extends string> = {
  [K in keyof T as `${Prefix}${Capitalize<string & K>}`]: T[K];
};
// 键重映射：过滤属性
type OmitByType<T, U> = {
  [K in keyof T as T[K] extends U ? never : K]: T[K];
};
// 使用示例
const prefixedPerson: Prefixed<Person, 'user'> = {
  userName: 'Alice',
  userAge: 30,
  userEmail: 'alice@example.com',
};
const noNumbers: OmitByType<Person, number> = {
  name: 'Bob',
  email: 'bob@example.com',
};
```

### 4.4 映射类型的应用场景

#### 4.4.1 创建 API 响应类型

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}
// API 响应类型（移除敏感字段）
type UserResponse = Omit<User, 'password'>;
// API 请求类型（可选字段）
type UserRequest = Partial<Omit<User, 'id'>>;
// 使用示例
const userResponse: UserResponse = {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
};
const userRequest: UserRequest = {
  name: 'Bob',
  email: 'bob@example.com',
};
```

#### 4.4.2 创建配置类型

```typescript
interface Config {
  apiUrl: string;
  timeout: number;
  debug: boolean;
}
// 只读配置类型
type ReadonlyConfig = Readonly<Config>;
// 部分配置类型
type PartialConfig = Partial<Config>;
// 使用示例
const defaultConfig: ReadonlyConfig = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  debug: false,
};
const customConfig: PartialConfig = {
  apiUrl: 'https://api.custom.com',
  timeout: 10000,
};
```

### 4.5 映射类型的最佳实践

- **复用现有类型**: 利用映射类型基于现有类型创建新类型，减少重复定义。
- **清晰命名**: 为映射类型选择清晰、描述性的名称。
- **合理使用修饰符**: 根据需要使用 `readonly`、`?` 和 `-` 修饰符。
- **键重映射**: 在需要修改属性键时使用键重映射功能。

## 5. 条件类型 (Conditional Types)

条件类型允许我们根据类型之间的关系创建新类型，语法为 `T extends U ? X : Y`。

### 5.1 基本条件类型

```typescript
 // 基本条件类型
 type IsString<T> = T extends string ?  : false;
 type A = IsString<string>; //
 type B = IsString<number>; // false
 type C = IsString<string | number>; // boolean ( | false)
 // 条件类型与泛型
 function processValue<T>(value: T): T extends string ? string : number {
  if (typeof value === "string") {
  return value.toUpperCase() as any;
  } else {
  return 42 as any;
  }
 }
 const result1 = processValue("hello"); // 类型为 string
 const result2 = processValue(42); // 类型为 number
```

### 5.2 条件类型与 infer 关键字

`infer` 关键字允许我们在条件类型中推断类型，通常用于从复杂类型中提取部分类型。

```typescript
// 推断函数返回类型
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;
// 推断数组元素类型
type ElementType<T> = T extends Array<infer E> ? E : T;
// 推断元组类型
type First<T> = T extends [infer U, ...any[]] ? U : never;
type Last<T> = T extends [...any[], infer U] ? U : never;
// 使用示例
function add(a: number, b: number): number {
  return a + b;
}
type AddReturnType = ReturnType<typeof add>; // number
type ArrayElement = ElementType<string[]>; // string
type NonArrayElement = ElementType<number>; // number
type FirstElement = First<[string, number, boolean]>; // string
type LastElement = Last<[string, number, boolean]>; // boolean
```

### 5.3 条件类型的分发特性

当条件类型的左侧是一个联合类型时，条件类型会自动分发到联合类型的每个成员上。

```typescript
 // 分发条件类型
 type IsString<T> = T extends string ?  : false;
 type D = IsString<string | number | boolean>; //  | false | false
 // 阻止分发（使用方括号）
 type IsStringNoDistribute<T> = [T] extends [string] ?  : false;
 type E = IsStringNoDistribute<string | number | boolean>; // false
```

### 5.4 条件类型的应用场景

#### 5.4.1 类型过滤

```typescript
// 从联合类型中过滤出指定类型
type Filter<T, U> = T extends U ? T : never;
type Numbers = Filter<number | string | boolean, number>; // number
type Strings = Filter<number | string | boolean, string>; // string
// 从联合类型中排除指定类型
type Exclude<T, U> = T extends U ? never : T;
type NonNumbers = Exclude<number | string | boolean, number>; // string | boolean
```

#### 5.4.2 类型转换

```typescript
// 类型转换
type ToArray<T> = T extends any ? T[] : never;
type NumberArray = ToArray<number>; // number[]
type StringArray = ToArray<string>; // string[]
type UnionArray = ToArray<number | string>; // number[] | string[]
// 递归类型转换
type DeepArray<T> = T extends Array<infer U> ? DeepArray<U>[] : T;
type DeepNumberArray = DeepArray<number>; // number
type DeepArrayOfArrays = DeepArray<number[][]>; // number[][][]
```

### 5.5 条件类型的最佳实践

- **类型推断**: 使用 `infer` 关键字从复杂类型中提取信息。
- **类型过滤**: 使用条件类型过滤联合类型中的成员。
- **类型转换**: 使用条件类型将一种类型转换为另一种类型。
- **递归类型**: 使用条件类型创建递归类型定义。
- **分发特性**: 利用条件类型的分发特性处理联合类型。

## 6. 高级类型组合

### 6.1 交叉类型 (Intersection Types)

交叉类型使用 `&` 符号，将多个类型合并为一个类型。

```typescript
interface Person {
  name: string;
  age: number;
}
interface Employee {
  employeeId: number;
  department: string;
}
// 交叉类型
type EmployeePerson = Person & Employee;
// 使用示例
const employee: EmployeePerson = {
  name: 'Alice',
  age: 30,
  employeeId: 12345,
  department: 'Engineering',
};
console.log(employee.name); // 输出: Alice
console.log(employee.employeeId); // 输出: 12345
```

### 6.2 联合类型 (Union Types)

联合类型使用 `|` 符号，表示一个值可以是多种类型中的一种。

```typescript
// 联合类型
type StringOrNumber = string | number;
type BooleanOrNull = boolean | null;
type ComplexUnion = string | number | boolean | null | undefined;
// 使用示例
function processValue(value: StringOrNumber): void {
  if (typeof value === 'string') {
    console.log(value.toUpperCase());
  } else {
    console.log(value.toFixed(2));
  }
}
processValue('hello'); // 输出: HELLO
processValue(42); // 输出: 42.00
```

### 6.3 类型别名与接口的结合

```typescript
// 接口定义
interface Base {
  id: number;
  name: string;
}
// 类型别名与接口结合
type WithTimestamp = Base & {
  createdAt: Date;
  updatedAt: Date;
};
type OptionalBase = Partial<Base>;
type ReadonlyBase = Readonly<Base>;
// 使用示例
const withTimestamp: WithTimestamp = {
  id: 1,
  name: 'Alice',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const optionalBase: OptionalBase = {
  name: 'Bob',
};
const readonlyBase: ReadonlyBase = {
  id: 2,
  name: 'Charlie',
};
// readonlyBase.name = "David"; // 编译错误
```

## 7. 类型工具

TypeScript 提供了许多内置的类型工具，用于常见的类型操作。

### 7.1 常用内置类型工具

| 类型工具                   | 描述                                   | 示例                                                                                  |
| :------------------------- | :------------------------------------- | :------------------------------------------------------------------------------------ | -------------------------------- | -------------------- | ---------- | ---- |
| **`Partial<T>`**           | 将 T 中所有属性变为可选                | `Partial<{ a: number; b: string }>` → `{ a?: number; b?: string }`                    |
| **`Required<T>`**          | 将 T 中所有属性变为必需                | `Required<{ a?: number; b?: string }>` → `{ a: number; b: string }`                   |
| **`Readonly<T>`**          | 将 T 中所有属性变为只读                | `Readonly<{ a: number; b: string }>` → `{ readonly a: number; readonly b: string }`   |
| **`Record<K, T>`**         | 构建键为 K 类型，值为 T 类型的对象类型 | `Record<string, number>` → `{ [key: string]: number }`                                |
| **`Pick<T, K>`**           | 从 T 中选取指定的属性 K                | `Pick<{ a: number; b: string; c: boolean }, "a"                                       | "b">`→`{ a: number; b: string }` |
| **`Omit<T, K>`**           | 从 T 中排除指定的属性 K                | `Omit<{ a: number; b: string; c: boolean }, "c">` → `{ a: number; b: string }`        |
| **`Exclude<T, U>`**        | 从 T 中排除可以赋值给 U 的类型         | `Exclude<"a"                                                                          | "b"                              | "c", "a">`→`"b"      | "c"`       |
| **`Extract<T, U>`**        | 从 T 中提取可以赋值给 U 的类型         | `Extract<"a"                                                                          | "b"                              | "c", "a"             | "b">`→`"a" | "b"` |
| **`NonNullable<T>`**       | 从 T 中排除 null 和 undefined          | `NonNullable<string                                                                   | null                             | undefined>`→`string` |
| **`Parameters<T>`**        | 提取函数 T 的参数类型为元组            | `Parameters<(a: number, b: string) => void>` → `[number, string]`                     |
| **`ReturnType<T>`**        | 提取函数 T 的返回类型                  | `ReturnType<() => string>` → `string`                                                 |
| **`InstanceType<T>`**      | 提取构造函数 T 的实例类型              | `InstanceType<typeof Date>` → `Date`                                                  |
| **`ThisParameterType<T>`** | 提取函数 T 的 this 参数类型            | `ThisParameterType<(this: { x: number }, y: number) => void>` → `{ x: number }`       |
| **`OmitThisParameter<T>`** | 从函数 T 中移除 this 参数              | `OmitThisParameter<(this: { x: number }, y: number) => void>` → `(y: number) => void` |

### 7.2 自定义类型工具

```typescript
 // 自定义类型工具
 // 深度只读
 type DeepReadonly<T> = T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T;
 // 深度可选
 type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;
 // 深度必填
 type DeepRequired<T> = T extends object
  ? { [P in keyof T]-?: DeepRequired<T[P]> }
  : T;
 // 类型是否为联合类型
 type IsUnion<T> = [T] extends [infer U] ? U extends T ? false :  : false;
 // 获取对象的键类型
 type Keys<T> = keyof T;
 // 获取对象的值类型
 type Values<T> = T[keyof T];
 // 使用示例
 interface ComplexObject {
  name: string;
  age: number;
  address: {
  street: string;
  city: string;
  country: string;
  };
  hobbies: string[];
 }
 const deepReadonly: DeepReadonly<ComplexObject> = {
  name: "Alice",
  age: 30,
  address: {
  street: "123 Main St",
  city: "New York",
  country: "USA"
  },
  hobbies: ["reading", "coding"]
 }
 // deepReadonly.address.city = "Boston"; // 编译错误
 const deepPartial: DeepPartial<ComplexObject> = {
  name: "Bob",
  address: {
  city: "London"
  }
 }
 const deepRequired: DeepRequired<DeepPartial<ComplexObject>> = {
  name: "Charlie",
  age: 25,
  address: {
  street: "456 Oak Ave",
  city: "Paris",
  country: "France"
  },
  hobbies: []
 }
 type TestUnion = IsUnion<string | number>; //
 type TestNonUnion = IsUnion<string>; // false
 type ComplexKeys = Keys<ComplexObject>; // "name" | "age" | "address" | "hobbies"
 type ComplexValues = Values<ComplexObject>; // string | number | { street: string; city: string; country: string; } | string[]
```

## 8. 类型编程

类型编程是使用 TypeScript 的类型系统来执行编译时计算和类型操作的技术。

### 8.1 类型级别的计算

```typescript
// 类型级别的计算
// 数字类型的计算
type Add<T extends number, U extends number> = T extends 0 ? U : U extends 0 ? T : never;
type Multiply<T extends number, U extends number> = T extends 0 ? 0 : U extends 0 ? 0 : never;
// 字符串类型的操作
type Concat<T extends string, U extends string> = `${T}${U}`;
type Uppercase<T extends string> = T extends `${infer L}${infer R}`
  ? `${Uppercase<L>}${Uppercase<R>}`
  : T;
// 数组类型的操作
type Reverse<T extends any[]> = T extends [infer F, ...infer R] ? [...Reverse<R>, F] : [];
type Length<T extends any[]> = T['length'];
// 使用示例
type Result1 = Concat<'Hello', ' World'>; // "Hello World"
type Result2 = Reverse<[1, 2, 3, 4, 5]>; // [5, 4, 3, 2, 1]
type Result3 = Length<[1, 2, 3]>; // 3
```

### 8.2 类型级别的逻辑

```typescript
 // 类型级别的逻辑
 // 类型相等性检查
 type IsEqual<T, U> = [T] extends [U] ? [U] extends [T] ?  : false : false;
 // 类型包含性检查
 type Includes<T extends any[], U> = T extends [infer F, ...infer R]
  ? IsEqual<F, U> extends
  ?
  : Includes<R, U>
  : false;
 // 类型条件逻辑
 type If<C extends boolean, T, F> = C extends  ? T : F;
 // 使用示例
 type TestEqual1 = IsEqual<string, string>; //
 type TestEqual2 = IsEqual<string, number>; // false
 type TestIncludes1 = Includes<[1, 2, 3, 4, 5], 3>; //
 type TestIncludes2 = Includes<[1, 2, 3, 4, 5], 6>; // false
 type TestIf1 = If<true, string, number>; // string
 type TestIf2 = If<false, string, number>; // number
```

## 9. 最佳实践

### 9.1 类型设计原则

- **类型安全**: 优先考虑类型安全，避免使用 `any` 类型。
- **可读性**: 设计清晰、易于理解的类型。
- **可维护性**: 复用类型定义，避免重复。
- **性能考虑**: 注意复杂类型可能导致编译时间增加。
- **渐进式类型**: 从简单类型开始，逐步添加复杂度。

### 9.2 类型断言与非空断言

- **谨慎使用**: 只在确定类型时使用类型断言和非空断言。
- **结合类型守卫**: 在使用断言前进行类型检查。
- **替代方案**: 优先使用可选链 (`?.`) 和空值合并 (`??`) 操作符。

### 9.3 类型守卫

- **明确检查**: 类型守卫应该明确检查变量的类型。
- **自定义守卫**: 为复杂类型创建自定义类型守卫。
- **组合使用**: 组合多种类型守卫来处理复杂场景。

### 9.4 映射类型与条件类型

- **复用现有类型**: 使用映射类型基于现有类型创建新类型。
- **类型推断**: 使用 `infer` 关键字从复杂类型中提取信息。
- **类型过滤**: 使用条件类型过滤和转换类型。
- **递归类型**: 合理使用递归类型处理嵌套结构。

### 9.5 类型工具

- **熟悉内置工具**: 充分利用 TypeScript 提供的内置类型工具。
- **创建自定义工具**: 根据项目需求创建自定义类型工具。
- **组合使用**: 灵活组合多个类型工具以满足复杂需求。

## 10. 代码示例

### 10.1 类型断言与非空断言

```typescript
// 类型断言示例
function processUnknown(value: unknown): void {
  // 类型断言为 string
  if (typeof value === 'string') {
    const str = value as string;
    console.log(`String length: ${str.length}`);
  }
  // 类型断言为 number
  if (typeof value === 'number') {
    const num = value as number;
    console.log(`Number squared: ${num * num}`);
  }
  // 类型断言为对象
  if (typeof value === 'object' && value !== null) {
    const obj = value as { name: string; age: number };
    console.log(`Object: ${obj.name}, ${obj.age}`);
  }
}
// 非空断言示例
interface User {
  id: number;
  name: string;
  email?: string;
  address?: {
    street: string;
    city: string;
  };
}
function getUserEmail(user: User): string {
  // 非空断言
  return user.email!;
}
function getStreet(user: User): string {
  // 链式非空断言
  return user.address!.street!;
}
// 使用示例
const user: User = {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
  address: {
    street: '123 Main St',
    city: 'New York',
  },
};
processUnknown('Hello'); // 输出: String length: 5
processUnknown(42); // 输出: Number squared: 1764
processUnknown(user); // 输出: Object: Alice, 1
console.log(getUserEmail(user)); // 输出: alice@example.com
console.log(getStreet(user)); // 输出: 123 Main St
```

### 10.2 类型守卫

```typescript
// 类型守卫示例
// 自定义类型守卫
function isString(value: any): value is string {
  return typeof value === 'string';
  ;
}
function isNumber(value: any): value is number {
  return typeof value === 'number';
  ;
}
function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
  ;
}
function isObject(value: any): value is object {
  return typeof value === 'object' && value !== null;
  ;
}
function isArray(value: any): value is any[] {
  return Array.isArray(value);
  ;
}
// 接口类型守卫
interface Person {
  name: string;
  age: number;
  ;
}
function isPerson(value: any): value is Person {
  return isObject(value) && isString((value as Person).name) && isNumber((value as Person).age);
  ;
}
// 使用示例
function processValue(value: unknown): void {
  if (isString(value)) {
    console.log(`String: ${value.toUpperCase()}`);
  } else if (isNumber(value)) {
    console.log(`Number: ${value.toFixed(2)}`);
  } else if (isBoolean(value)) {
    console.log(`Boolean: ${value}`);
  } else if (isArray(value)) {
    console.log(`Array length: ${value.length}`);
  } else if (isPerson(value)) {
    console.log(`Person: ${value.name}, ${value.age}`);
  } else {
    console.log(`Unknown type`);
  }
  ;
}
processValue('Hello'); // 输出: String: HELLO
processValue(42); // 输出: Number: 42.00
processValue(true); // 输出: Boolean:
processValue([1, 2, 3]); // 输出: Array length: 3
processValue({ name: 'Alice', age: 30 }); // 输出: Person: Alice, 30
processValue(null); // 输出: Unknown type
```

### 10.3 映射类型与条件类型

```typescript
 // 映射类型与条件类型示例
 // 基础接口
 interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  inStock: boolean;
 }
 // 映射类型
 // 只读产品
 type ReadonlyProduct = Readonly<Product>;
 // 可选产品
 type OptionalProduct = Partial<Product>;
 // 产品ID和名称
 type ProductInfo = Pick<Product, "id" | "name">;
 // 产品不含描述
 type ProductWithoutDescription = Omit<Product, "description">;
 // 条件类型
 // 提取字符串属性
 type StringProperties<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
 }
 // 提取数字属性
 type NumberProperties<T> = {
  [K in keyof T as T[K] extends number ? K : never]: T[K];
 }
 // 提取布尔属性
 type BooleanProperties<T> = {
  [K in keyof T as T[K] extends boolean ? K : never]: T[K];
 }
 // 使用示例
 const readonlyProduct: ReadonlyProduct = {
  id: 1,
  name: "Laptop",
  price: 999.99,
  description: "A powerful laptop",
  inStock:
 }
 // readonlyProduct.price = 899.99; // 编译错误
 const optionalProduct: OptionalProduct = {
  id: 2,
  name: "Mouse"
 }
 const productInfo: ProductInfo = {
  id: 3,
  name: "Keyboard"
 }
 const productWithoutDescription: ProductWithoutDescription = {
  id: 4,
  name: "Monitor",
  price: 199.99,
  inStock: false
 }
 const stringProps: StringProperties<Product> = {
  name: "Laptop",
  description: "A powerful laptop"
 }
 const numberProps: NumberProperties<Product> = {
  id: 1,
  price: 999.99
 }
 const booleanProps: BooleanProperties<Product> = {
  inStock:
 }
 console.log(readonlyProduct);
 console.log(optionalProduct);
 console.log(productInfo);
 console.log(productWithoutDescription);
 console.log(stringProps);
 console.log(numberProps);
 console.log(booleanProps);
```

### 10.4 高级类型组合

```typescript
// 高级类型组合示例
// 基础类型
interface User {
  id: number;
  name: string;
  email: string;
}
interface Address {
  street: string;
  city: string;
  country: string;
}
interface Order {
  id: number;
  userId: number;
  total: number;
  items: OrderItem[];
}
interface OrderItem {
  productId: number;
  quantity: number;
  price: number;
}
// 高级类型
// 带地址的用户
type UserWithAddress = User & { address: Address };
// 订单详情（包含用户信息）
type OrderWithUser = Order & {
  user: User;
};
// 可选订单项
type OptionalOrderItem = Partial<OrderItem>;
// 只读订单
type ReadonlyOrder = Readonly<Order>;
// 条件类型：提取订单中的产品ID
type ProductIdsFromOrder<T extends Order> = T['items'][number]['productId'];
// 使用示例
const userWithAddress: UserWithAddress = {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
  address: {
    street: '123 Main St',
    city: 'New York',
    country: 'USA',
  },
};
const orderWithUser: OrderWithUser = {
  id: 101,
  userId: 1,
  total: 1299.98,
  items: [
    { productId: 1, quantity: 1, price: 999.99 },
    { productId: 2, quantity: 2, price: 149.995 },
  ],
  user: {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
  },
};
const optionalOrderItem: OptionalOrderItem = {
  productId: 3,
  quantity: 1,
};
const readonlyOrder: ReadonlyOrder = {
  id: 102,
  userId: 2,
  total: 499.99,
  items: [{ productId: 4, quantity: 1, price: 499.99 }],
};
// readonlyOrder.total = 399.99; // 编译错误
// 类型级别提取产品ID
type ProductIds = ProductIdsFromOrder<Order>; // number
console.log(userWithAddress);
console.log(orderWithUser);
console.log(optionalOrderItem);
console.log(readonlyOrder);
```

---

### 更新日志 (Changelog)

- 2026-04-05: 深入细化 TS 类型演算与条件类型机制。
- 2026-04-05: 扩写内容，增加详细的类型断言、非空断言、类型守卫、映射类型、条件类型、高级类型组合、类型工具、类型编程、最佳实践和代码示例等内容。
