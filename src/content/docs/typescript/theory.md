---
title: 'TypeScript 理论知识点'
module: 'typescript'
order: 130
tags:
  - 'typescript'
  - 'theory'
  - 'oop'
  - 'design-patterns'
  - 'devops'
difficulty: 'intermediate'
description: '类型系统原理、编译流程与结构化类型机制。'
---

y: number;
}

interface Coordinate {
x: number;
y: number;
}

const p: Point2D = { x: 1, y: 2 };
const c: Coordinate = p; // 合法：结构相同

function distance(p: Point2D): number {
return Math.sqrt(p.x _ p.x + p.y _ p.y);
}

distance(c); // 合法：Coordinate 结构兼容 Point2D

````

结构化类型的子类型规则：如果 S 的结构包含 T 的所有成员（且类型兼容），则 S 是 T 的子类型。这被称为"宽度子类型化"（width subtyping）。

### 标称化类型（Nominal Typing）

标称化类型系统（如 Java、C#、Rust）中，类型兼容性基于类型的显式声明和名称。即使两个类型结构完全相同，如果名称不同，它们也不兼容。

```java
// Java 示例
class Point2D { int x; int y; }
class Coordinate { int x; int y; }

Point2D p = new Coordinate();  // 编译错误：类型不兼容
````

### 结构化类型的优势与劣势

| 特性   | 结构化类型           | 标称化类型           |
| ------ | -------------------- | -------------------- |
| 灵活性 | 高（鸭子类型）       | 低（需显式声明）     |
| 安全性 | 较低（可能意外兼容） | 较高（显式声明关系） |
| 重构   | 可能遗漏不兼容       | 编译器捕获所有不兼容 |
| 互操作 | JSON/JS 天然适配     | 需要类型转换         |
| 表达力 | 侧重"能做什么"       | 侧重"是什么"         |

### 在 TypeScript 中模拟标称化类型

方法一：品牌类型（Branded Type）

```typescript
type Brand<T, B> = T & { __brand: B };

type USD = Brand<number, 'USD'>;
type EUR = Brand<number, 'EUR'>;

function processUSD(amount: USD): void {
  /* ... */
}

const usd = 100 as USD;
const eur = 100 as EUR;

processUSD(usd); // 合法
processUSD(eur); // 类型错误：EUR 不能赋值给 USD
```

方法二：类 + 私有属性

```typescript
class USD {
  private __brand: 'USD' = 'USD';
  constructor(public value: number) {}
}

class EUR {
  private __brand: 'EUR' = 'EUR';
  constructor(public value: number) {}
}

function processUSD(amount: USD): void {
  /* ... */
}

processUSD(new USD(100)); // 合法
processUSD(new EUR(100)); // 类型错误
```

---

## 协变与逆变（Covariance and Contravariance）

### 基本概念

协变和逆变描述了泛型类型参数在子类型关系中的变化方向。

设 `Sub` 是 `Super` 的子类型：

- **协变（Covariant）**：`Container<Sub>` 是 `Container<Super>` 的子类型。方向一致。
- **逆变（Contravariant）**：`Container<Super>` 是 `Container<Sub>` 的子类型。方向相反。
- **不变（Invariant）**：`Container<Sub>` 和 `Container<Super>` 没有子类型关系。
- **双变（Bivariant）**：`Container<Sub>` 和 `Container<Super>` 互为子类型。

### 函数参数的逆变

函数参数在类型安全的前提下应该是逆变的：

```typescript
class Animal {
  name: string = 'animal';
}

class Dog extends Animal {
  breed: string = 'dog';
}

type AnimalHandler = (animal: Animal) => void;
type DogHandler = (dog: Dog) => void;

// DogHandler 可以安全地当作 AnimalHandler 使用吗？
// 不能！因为 AnimalHandler 可能传入任意 Animal（如 Cat）
// 而 DogHandler 期望接收 Dog，可能访问 Dog 特有的属性

const dogHandler: DogHandler = (dog) => console.log(dog.breed);
const animalHandler: AnimalHandler = dogHandler; // 不安全！
animalHandler(new Animal()); // dog.breed 是 undefined
```

TypeScript 的函数参数默认是双变的（为了实用性），但开启 `strictFunctionTypes` 后变为逆变。

### 函数返回值的协变

函数返回值是协变的，这是类型安全的：

```typescript
type AnimalFactory = () => Animal;
type DogFactory = () => Dog;

const dogFactory: DogFactory = () => new Dog();
const animalFactory: AnimalFactory = dogFactory; // 安全：Dog 是 Animal 的子类型
```

### TypeScript 中的协变/逆变规则

| 位置         | 默认行为 | strictFunctionTypes | 说明               |
| ------------ | -------- | ------------------- | ------------------ |
| 函数参数     | 双变     | 逆变                | 严格模式下更安全   |
| 函数返回值   | 协变     | 协变                | 始终协变           |
| 属性（只读） | 协变     | 协变                | 只读属性安全       |
| 属性（可写） | 不变     | 不变                | 可写属性需双向兼容 |
| 数组         | 协变     | 协变                | 数组作为只读容器   |

### 条件类型中的协变/逆变推断

TypeScript 的 `infer` 关键字在条件类型中遵循协变/逆变规则：

```typescript
type ReturnTypeOf<T> = T extends (...args: any[]) => infer R ? R : never;
// R 在返回值位置，协变推断

type ParamTypeOf<T> = T extends (arg: infer P) => any ? P : never;
// P 在参数位置，逆变推断

// 多个推断位置时，协变位置取联合类型，逆变位置取交叉类型
type FlattenedReturnType<T> = T extends (...args: any[]) => infer R extends any[]
  ? R[number]
  : never;
```

协变位置多个推断 -> 联合类型（union）

逆变位置多个推断 -> 交叉类型（intersection）

```typescript
type CovariantInfer<T> = T extends {
  a: infer R;
  b: infer R;
}
  ? R
  : never;

type Result = CovariantInfer<{ a: string; b: number }>;
// string | number（协变位置，取联合类型）

type ContravariantInfer<T> = T extends {
  a: (x: infer R) => void;
  b: (x: infer R) => void;
}
  ? R
  : never;

type Result2 = ContravariantInfer<{
  a: (x: string) => void;
  b: (x: number) => void;
}>;
// string & number（逆变位置，取交叉类型，此处为 never）
```

---

## 类型擦除（Type Erasure）

### TypeScript 的编译模型

TypeScript 在编译时执行类型检查，然后将类型信息完全擦除，输出纯 JavaScript 代码。运行时不存在任何类型信息。

```typescript
// TypeScript 源码
interface User {
  name: string;
  age: number;
}

function greet(user: User): string {
  return `Hello, ${user.name}`;
}

const u: User = { name: 'Alice', age: 30 };
console.log(greet(u));
```

编译输出：

```javascript
// JavaScript 输出
function greet(user) {
  return `Hello, ${user.name}`;
}
const u = { name: 'Alice', age: 30 };
console.log(greet(u));
```

所有类型标注（interface、type、泛型参数、类型断言）在编译后完全消失。

### 类型擦除的影响

1. **无运行时类型检查**

   ```typescript
   function isString(value: unknown): value is string {
     return typeof value === 'string'; // 必须手动实现
   }
   // 不能用 value instanceof string 或 typeof value === "String"
   ```

2. **泛型不保留**

   ```typescript
   class Container<T> {
     constructor(public value: T) {}
   }
   const c = new Container<number>(42);
   // 运行时无法判断 c 的泛型参数是 number
   ```

3. **枚举的特殊处理**

   ```typescript
   enum Direction {
     Up = 'UP',
     Down = 'DOWN',
   }
   // 枚举会编译为 JavaScript 对象，是少数保留运行时信息的类型构造
   ```

4. **类部分保留**
   ```typescript
   class Person {
     constructor(public name: string) {}
   }
   // class 声明保留（JavaScript 类），但类型标注擦除
   // instanceof Person 在运行时可用
   ```

### 运行时类型信息的替代方案

1. **Zod / io-ts / class-validator** -- 运行时类型验证库

   ```typescript
   import { z } from 'zod';

   const UserSchema = z.object({
     name: z.string(),
     age: z.number().min(0).max(150),
   });

   type User = z.infer<typeof UserSchema>; // 从 schema 推断类型

   const result = UserSchema.parse(unknownData); // 运行时验证
   ```

2. **自定义类型守卫**

   ```typescript
   function isUser(value: unknown): value is User {
     return (
       typeof value === 'object' &&
       value !== null &&
       'name' in value &&
       typeof (value as User).name === 'string'
     );
   }
   ```

3. **装饰器元数据** -- `reflect-metadata`

   ```typescript
   import 'reflect-metadata';

   class UserService {
     @Reflect.metadata('design:type', String)
     name: string;
   }
   ```

### 类型擦除的设计哲学

TypeScript 选择类型擦除的原因：

1. **与 JavaScript 完全兼容** -- 编译输出是标准 JavaScript，可在任何 JS 环境运行
2. **零运行时开销** -- 类型检查只在编译时执行，不影响运行时性能
3. **渐进式采用** -- 可以在现有 JavaScript 项目中逐步添加类型
4. **工具链友好** -- 类型信息仅用于编辑器和编译器，不改变运行时行为

这与 Java/C# 的泛型擦除不同。Java 的泛型擦除是在 JVM 层面，而 TypeScript 的类型擦除是在编译层面，彻底移除所有类型构造。

---

## 其他高级类型理论

### 类型宽度与深度

TypeScript 的类型兼容性采用"宽度"子类型化：子类型可以比父类型有更多属性。

```typescript
interface Point2D {
  x: number;
  y: number;
}
interface Point3D {
  x: number;
  y: number;
  z: number;
}

const p3: Point3D = { x: 1, y: 2, z: 3 };
const p2: Point2D = p3; // 合法：Point3D 是 Point2D 的超集
```

这在函数参数中产生了反直觉但正确的行为：

```typescript
function setPoint(point: Point2D): void {
  /* ... */
}

setPoint({ x: 1, y: 2, z: 3 }); // 合法（多余属性被忽略）
setPoint({ x: 1, y: 2, z: 3 } as Point3D); // 合法

// 但直接传字面量时，多余属性检查会报错
setPoint({ x: 1, y: 2, z: 3 }); // 错误：对象字面量只能指定已知属性
```

多余属性检查（Excess Property Check）是 TypeScript 的特殊行为，仅在将对象字面量直接赋值给目标类型时触发。

### 类型级别的编程

TypeScript 的类型系统是图灵完备的，可以在类型级别进行计算：

```typescript
type Fibonacci<
  N extends number,
  T extends number[] = [1],
  U extends number[] = [],
> = T['length'] extends N ? U['length'] : Fibonacci<N, [...T, 1], [...U, ...T]>;

type Fib5 = Fibonacci<5>; // 5
```

但类型级别的编程应谨慎使用，过度使用会降低编译速度和代码可读性。

---

## 理论速查表

| 概念         | 核心要点                       | 关键细节                                |
| ------------ | ------------------------------ | --------------------------------------- |
| 结构化类型   | 基于结构而非名称的兼容性       | 可用品牌类型模拟标称化                  |
| 标称化类型   | 基于名称的兼容性               | Java/C#/Rust 采用                       |
| 协变         | 子类型方向一致                 | 函数返回值、只读属性                    |
| 逆变         | 子类型方向相反                 | 函数参数（strictFunctionTypes）         |
| 不变         | 无子类型关系                   | 可写属性                                |
| 双变         | 双向兼容                       | TS 函数参数默认行为                     |
| 类型擦除     | 编译后类型信息完全移除         | 运行时无类型检查                        |
| 条件类型推断 | 协变位置取联合，逆变位置取交叉 | infer 关键字                            |
| 品牌类型     | 模拟标称化类型                 | `type Brand<T, B> = T & { __brand: B }` |
| 多余属性检查 | 对象字面量的额外属性检查       | 仅直接赋值时触发                        |
