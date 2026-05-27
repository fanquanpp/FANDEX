# 基础类型系统 (Basic Types)
 False
 False> @Version: v3.5.0
 False
 False> @Author: Anonymous
 False> @Category: TS Advanced
 False> @Description: TS 基础类型、字面量类型、联合类型及 Any/Unknown/Never。 | Primitive, Literal, Union types, Any, Unknown, and Never.
 False
 False---
 False
 False## 目录
 False
 False1. [基础类型](#基础类型)
 False2. [特殊类型](#特殊类型)
 False3. [联合类型与交叉类型](#联合类型与交叉类型)
 False4. [类型别名](#类型别名)
 False5. [字面量类型](#字面量类型)
 False6. [类型断言](#类型断言)
 False7. [类型守卫](#类型守卫)
 False8. [类型推断](#类型推断)
 False9. [最佳实践](#最佳实践)
 False10. [实际应用示例](#实际应用示例)
 False11. [常见问题与解决方案](#常见问题与解决方案)
 False12. [总结](#总结)
 False
 False---
 False
 False## 1. 基础类型 (Basic Types)
 False
 FalseTypeScript 提供了丰富的类型系统，包括 JavaScript 原有的类型和 TypeScript 增强的类型。
 False
 False### 1.1 原始类型 (Primitive Types)
 False
 False| 类型 | 描述 | 示例 |
 False| :--- | :--- | :--- |
 False| **`boolean`** | 布尔值 | `let isDone: boolean = false;` |
 False| **`number`** | 数字 (包括整数和浮点数) | `let count: number = 42; let pi: number = 3.14;` |
 False| **`string`** | 字符串 | `let name: string = "TypeScript"; let message: string = \`Hello, ${name}!\`;` |
 False| **`symbol`** | 唯一标识符 | `let sym1: symbol = Symbol("key"); let sym2: symbol = Symbol("key");` |
 False| **`bigint`** | 大整数 | `let big: bigint = 100n; let big2: bigint = BigInt("9007199254740991");` |
 False
 False### 1.2 复合类型 (Composite Types)
 False
 False#### 1.2.1 数组 (Array)
 False
```typescript
 True// 方式 1: 类型[]
 Truelet numbers: number[] = [1, 2, 3, 4, 5];
 Truelet strings: string[] = ["a", "b", "c"];
 True
 True// 方式 2: Array<类型>
 Truelet numbers2: Array<number> = [1, 2, 3, 4, 5];
 Truelet strings2: Array<string> = ["a", "b", "c"];
 True
 True// 多维数组
 Truelet matrix: number[][] = [[1, 2], [3, 4]];
 True```

 False#### 1.2.2 元组 (Tuple)
 False
 False元组是固定长度和类型的数组，每个位置的类型可以不同。
 False
```typescript
 True// 基本元组
 Truelet person: [string, number] = ["John", 30];
 True
 True// 访问元组元素
 Truelet name: string = person[0];
 Truelet age: number = person[1];
 True
 True// 元组越界访问
 True// person[2] = "Smith"; // 错误: 元组长度为 2
 True
 True// 可选元素
 Truelet optionalTuple: [string, number?] = ["John"];
 True
 True// 剩余元素
 Truelet restTuple: [string, ...number[]] = ["John", 1, 2, 3];
 True
 True// 只读元组
 Truelet readonlyTuple: readonly [string, number] = ["John", 30];
 True// readonlyTuple[0] = "Jane"; // 错误: 只读元组
 True```

 False#### 1.2.3 枚举 (Enum)
 False
 False枚举是一组命名的常量，默认从 0 开始递增。
 False
```typescript
 True// 基本枚举
 Trueenum Direction {
 True Up,
 True Down,
 True Left,
 True Right
 True}
 True
 Truelet dir: Direction = Direction.Up; // 0
 True
 True// 自定义枚举值
 Trueenum Color {
 True Red = 1,
 True Green = 2,
 True Blue = 4
 True}
 True
 Truelet color: Color = Color.Green; // 2
 True
 True// 字符串枚举
 Trueenum Status {
 True Active = "ACTIVE",
 True Inactive = "INACTIVE",
 True Pending = "PENDING"
 True}
 True
 Truelet status: Status = Status.Active; // "ACTIVE"
 True
 True// 常量枚举 (编译时会被内联)
 Trueconst enum Weekday {
 True Monday,
 True Tuesday,
 True Wednesday,
 True Thursday,
 True Friday,
 True Saturday,
 True Sunday
 True}
 True
 Truelet day: Weekday = Weekday.Monday;
 True```

 False### 1.3 对象类型 (Object Types)
 False
```typescript
 True// 内联对象类型
 Truelet user: { name: string; age: number } = {
 True name: "John",
 True age: 30
 True};
 True
 True// 可选属性
 Truelet user2: { name: string; age?: number } = {
 True name: "John"
 True};
 True
 True// 只读属性
 Truelet user3: { readonly name: string; age: number } = {
 True name: "John",
 True age: 30
 True};
 True// user3.name = "Jane"; // 错误: 只读属性
 True
 True// 索引签名
 Truelet map: { [key: string]: number } = {
 True a: 1,
 True b: 2
 True};
 Truemap.c = 3; // 允许添加新属性
 True```

 False## 2. 特殊类型
 False
 False### 2.1 `any` 类型
 False
 False`any` 类型会绕过所有类型检查，使用时需谨慎。
 False
```typescript
 True// 任何值都可以赋值给 any 类型
 Truelet anyValue: any = 42;
 TrueanyValue = "Hello";
 TrueanyValue = true;
 True
 True// any 类型的变量可以访问任何属性或方法
 Truelet anyObj: any = { name: "John" };
 Trueconsole.log(anyObj.name); // 没问题
 Trueconsole.log(anyObj.age); // 没问题，运行时会是 undefined
 TrueanyObj.method(); // 没问题，运行时会报错
 True
 True// 避免使用 any
 True// 推荐使用具体类型或 unknown
 True```

 False### 2.2 `unknown` 类型
 False
 False`unknown` 是安全的 `any` 类型，在使用前必须进行类型缩小。
 False
```typescript
 True// 任何值都可以赋值给 unknown 类型
 Truelet unknownValue: unknown = 42;
 TrueunknownValue = "Hello";
 TrueunknownValue = true;
 True
 True// unknown 类型的变量不能直接访问属性或方法
 Truelet unknownObj: unknown = { name: "John" };
 True// console.log(unknownObj.name); // 错误: 类型 'unknown' 不能访问属性
 True
 True// 需要进行类型缩小
 Trueif (typeof unknownObj === "object" && unknownObj !== null) {
 True console.log((unknownObj as { name: string }).name);
 True}
 True
 True// 或使用类型守卫
 Truefunction isPerson(obj: unknown): obj is { name: string; age: number } {
 True return (
 True typeof obj === "object" &&
 True obj !== null &&
 True "name" in obj &&
 True "age" in obj
 True );
 True}
 True
 Trueif (isPerson(unknownObj)) {
 True console.log(unknownObj.name);
 True console.log(unknownObj.age);
 True}
 True```

 False### 2.3 `void` 类型
 False
 False`void` 表示没有返回值的函数。
 False
```typescript
 True// 无返回值的函数
 Truefunction logMessage(message: string): void {
 True console.log(message);
 True // 不需要 return 语句
 True}
 True
 True// 可以返回 undefined
 Truefunction returnUndefined(): void {
 True return undefined;
 True}
 True
 True// 不能返回其他值
 True// function returnNumber(): void {
 True// return 42; // 错误: 不能返回 number 类型
 True// }
 True
 True// void 类型的变量只能赋值 undefined 或 null (在 strictNullChecks 为 false 时)
 Truelet voidVar: void = undefined;
 True// let voidVar2: void = null; // 错误: 在 strictNullChecks 为 true 时
 True```

 False### 2.4 `never` 类型
 False
 False`never` 表示永远不会有值的类型，如抛出异常的函数或无限循环的函数。
 False
```typescript
 True// 抛出异常的函数
 Truefunction throwError(message: string): never {
 True throw new Error(message);
 True}
 True
 True// 无限循环的函数
 Truefunction infiniteLoop(): never {
 True while (true) {
 True // 无限循环
 True }
 True}
 True
 True// never 类型可以赋值给任何类型
 Truelet num: number = throwError("Error");
 Truelet str: string = throwError("Error");
 True
 True// 没有类型可以赋值给 never 类型 (除了 never 本身)
 True// let neverVar: never = 42; // 错误: 不能赋值 number 类型
 Truelet neverVar: never = throwError("Error"); // 正确
 True```

 False### 2.5 `null` 和 `undefined` 类型
 False
 False`null` 和 `undefined` 是 TypeScript 中的基本类型。
 False
```typescript
 True// null 类型
 Truelet nullValue: null = null;
 True
 True// undefined 类型
 Truelet undefinedValue: undefined = undefined;
 True
 True// 在 strictNullChecks 为 false 时，null 和 undefined 是所有类型的子类型
 True// let num: number = null; // 在 strictNullChecks 为 false 时允许
 True
 True// 在 strictNullChecks 为 true 时，需要明确指定
 Truelet numWithNull: number | null = null;
 Truelet numWithUndefined: number | undefined = undefined;
 Truelet numWithBoth: number | null | undefined = 42;
 True
 True// 可选属性和参数会自动包含 undefined
 Truefunction greet(name?: string) {
 True // name 类型为 string | undefined
 True console.log(`Hello, ${name || "Guest"}!`);
 True}
 True```

 False## 3. 联合类型与交叉类型 (Unions & Intersections)
 False
 False### 3.1 联合类型 (Union Types)
 False
 False联合类型使用 `|` 符号，表示值可以是其中之一。
 False
```typescript
 True// 基本联合类型
 Truelet id: string | number;
 Trueid = "123";
 Trueid = 456;
 True
 True// 联合类型的类型缩小
 Truefunction processId(id: string | number) {
 True if (typeof id === "string") {
 True // id 类型缩小为 string
 True console.log(`String ID: ${id.toUpperCase()}`);
 True } else {
 True // id 类型缩小为 number
 True console.log(`Number ID: ${id.toFixed(2)}`);
 True }
 True}
 True
 True// 联合类型与字面量类型
 Truetype Status = "active" | "inactive" | "pending";
 Truelet userStatus: Status = "active";
 True
 True// 联合类型与对象类型
 Trueinterface Cat {
 True type: "cat";
 True meow: () => void;
 True}
 True
 Trueinterface Dog {
 True type: "dog";
 True bark: () => void;
 True}
 True
 Truetype Pet = Cat | Dog;
 True
 Truefunction makeSound(pet: Pet) {
 True if (pet.type === "cat") {
 True pet.meow();
 True } else {
 True pet.bark();
 True }
 True}
 True```

 False### 3.2 交叉类型 (Intersection Types)
 False
 False交叉类型使用 `&` 符号，表示值必须同时满足所有类型。
 False
```typescript
 True// 基本交叉类型
 Trueinterface Person {
 True name: string;
 True age: number;
 True}
 True
 Trueinterface Serializable {
 True serialize: () => string;
 True}
 True
 Truetype SerializablePerson = Person & Serializable;
 True
 Truelet person: SerializablePerson = {
 True name: "John",
 True age: 30,
 True serialize: function() {
 True return JSON.stringify(this);
 True }
 True};
 True
 True// 交叉类型与类型别名
 Trueinterface A {
 True a: number;
 True}
 True
 Trueinterface B {
 True b: string;
 True}
 True
 Truetype C = A & B;
 True
 Truelet c: C = {
 True a: 1,
 True b: "hello"
 True};
 True
 True// 交叉类型与联合类型
 Trueinterface X {
 True x: number;
 True}
 True
 Trueinterface Y {
 True y: string;
 True}
 True
 Trueinterface Z {
 True z: boolean;
 True}
 True
 Truetype XY = X & Y;
 Truetype XYZ = XY & Z;
 True
 Truelet xyz: XYZ = {
 True x: 1,
 True y: "hello",
 True z: true
 True};
 True```

 False## 4. 类型别名 (`type`)
 False
 False类型别名使用 `type` 关键字为类型创建一个新名称。
 False
```typescript
 True// 基本类型别名
 Truetype ID = string | number;
 Truelet userId: ID = "123";
 Truelet productId: ID = 456;
 True
 True// 联合类型别名
 Truetype Status = "active" | "inactive" | "pending";
 Truelet userStatus: Status = "active";
 True
 True// 对象类型别名
 Truetype User = {
 True id: ID;
 True name: string;
 True email: string;
 True age?: number;
 True};
 True
 Truelet user: User = {
 True id: "123",
 True name: "John",
 True email: "john@example.com"
 True};
 True
 True// 函数类型别名
 Truetype AddFunction = (a: number, b: number) => number;
 Trueconst add: AddFunction = (a, b) => a + b;
 True
 True// 泛型类型别名
 Truetype Container<T> = {
 True value: T;
 True getValue: () => T;
 True};
 True
 Truelet numberContainer: Container<number> = {
 True value: 42,
 True getValue: function() {
 True return this.value;
 True }
 True};
 True
 Truelet stringContainer: Container<string> = {
 True value: "Hello",
 True getValue: function() {
 True return this.value;
 True }
 True};
 True
 True// 递归类型别名
 Truetype TreeNode<T> = {
 True value: T;
 True children: TreeNode<T>[];
 True};
 True
 Truelet tree: TreeNode<number> = {
 True value: 1,
 True children: [
 True {
 True value: 2,
 True children: []
 True },
 True {
 True value: 3,
 True children: [
 True {
 True value: 4,
 True children: []
 True }
 True ]
 True }
 True ]
 True};
 True```

 False## 5. 字面量类型 (Literal Types)
 False
 False字面量类型表示具体的值，而不是类型范围。
 False
 False### 5.1 字符串字面量类型
 False
```typescript
 True// 单个字符串字面量类型
 Truetype Direction = "North" | "South" | "East" | "West";
 Truelet move: Direction = "North";
 True// move = "Northwest"; // 错误: 不在字面量类型中
 True
 True// 字符串字面量类型与联合类型
 Truetype HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
 Truefunction fetchData(url: string, method: HttpMethod) {
 True // 实现
 True}
 True
 TruefetchData("/api/users", "GET"); // 正确
 True// fetchData("/api/users", "PATCH"); // 错误: 不在字面量类型中
 True```

 False### 5.2 数字字面量类型
 False
```typescript
 True// 数字字面量类型
 Truetype DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;
 Truelet roll: DiceRoll = 4;
 True// roll = 7; // 错误: 不在字面量类型中
 True
 True// 数字字面量类型与联合类型
 Truetype HttpStatus = 200 | 400 | 401 | 404 | 500;
 Truefunction handleResponse(status: HttpStatus) {
 True switch (status) {
 True case 200:
 True return "Success";
 True case 404:
 True return "Not Found";
 True case 500:
 True return "Internal Server Error";
 True default:
 True return "Error";
 True }
 True}
 True```

 False### 5.3 布尔字面量类型
 False
```typescript
 True// 布尔字面量类型
 Truetype TrueOnly = true;
 Truetype FalseOnly = false;
 True
 Truelet isActive: TrueOnly = true;
 True// isActive = false; // 错误: 只能是 true
 True
 Truelet isInactive: FalseOnly = false;
 True// isInactive = true; // 错误: 只能是 false
 True
 True// 布尔字面量类型的应用
 Truefunction assert(condition: boolean, message: string): asserts condition {
 True if (!condition) {
 True throw new Error(message);
 True }
 True}
 True
 Truefunction processValue(value: string | null) {
 True assert(value !== null, "Value cannot be null");
 True // 此时 value 类型缩小为 string
 True console.log(value.length);
 True}
 True```

 False### 5.4 字面量类型的组合
 False
```typescript
 True// 字符串和数字字面量组合
 Truetype Action = "add" | "remove" | 0 | 1;
 Truelet action: Action = "add";
 Trueaction = 0;
 True
 True// 对象字面量类型
 Truetype Point = { x: 0; y: 0 } | { x: 1; y: 1 };
 Truelet point: Point = { x: 0, y: 0 };
 True
 True// 字面量类型与类型守卫
 Truetype Shape = 
 True | { kind: "circle"; radius: number }
 True | { kind: "square"; sideLength: number }
 True | { kind: "rectangle"; width: number; height: number };
 True
 Truefunction getArea(shape: Shape): number {
 True switch (shape.kind) {
 True case "circle":
 True return Math.PI * shape.radius ** 2;
 True case "square":
 True return shape.sideLength ** 2;
 True case "rectangle":
 True return shape.width * shape.height;
 True default:
 True return 0;
 True }
 True}
 True```

 False## 6. 类型断言
 False
 False类型断言允许你告诉 TypeScript 编译器你知道变量的实际类型。
 False
 False### 6.1 尖括号语法
 False
```typescript
 Truelet someValue: any = "this is a string";
 Truelet strLength: number = (<string>someValue).length;
 True```

 False### 6.2 as 语法 (推荐)
 False
```typescript
 Truelet someValue: any = "this is a string";
 Truelet strLength: number = (someValue as string).length;
 True
 True// 双重断言
 Truelet value: unknown = "hello";
 Truelet str: string = (value as any) as string;
 True
 True// 非空断言 (使用 ! 操作符)
 Truefunction getElement(id: string): HTMLElement | null {
 True return document.getElementById(id);
 True}
 True
 Truelet element = getElement("myElement")!;
 True// 告诉 TypeScript 元素不会是 null
 Trueconsole.log(element.textContent);
 True```

 False### 6.3 类型断言的最佳实践
 False
 False- **只在你确定类型时使用**：类型断言不会在运行时进行检查
 False- **优先使用类型守卫**：类型守卫更安全，会在运行时检查类型
 False- **避免过度使用**：过多的类型断言可能表明类型设计有问题
 False- **使用 as const**：为字面量类型提供更精确的类型
 False
```typescript
 True// as const 断言
 Trueconst config = {
 True apiUrl: "https://api.example.com",
 True timeout: 5000
 True} as const;
 True
 True// config.apiUrl 类型为 "https://api.example.com"
 True// config.timeout 类型为 5000
 True
 True// 数组 as const
 Trueconst numbers = [1, 2, 3] as const;
 True// numbers 类型为 readonly [1, 2, 3]
 True```

 False## 7. 类型守卫
 False
 False类型守卫是运行时检查，用于确定变量的具体类型。
 False
 False### 7.1 `typeof` 类型守卫
 False
```typescript
 Truefunction processValue(value: string | number) {
 True if (typeof value === "string") {
 True // value 类型缩小为 string
 True console.log(value.toUpperCase());
 True } else {
 True // value 类型缩小为 number
 True console.log(value.toFixed(2));
 True }
 True}
 True```

 False### 7.2 `instanceof` 类型守卫
 False
```typescript
 Trueclass Animal {
 True name: string;
 True constructor(name: string) {
 True this.name = name;
 True }
 True}
 True
 Trueclass Dog extends Animal {
 True bark() {
 True console.log("Woof!");
 True }
 True}
 True
 Trueclass Cat extends Animal {
 True meow() {
 True console.log("Meow!");
 True }
 True}
 True
 Truefunction makeSound(animal: Animal) {
 True if (animal instanceof Dog) {
 True // animal 类型缩小为 Dog
 True animal.bark();
 True } else if (animal instanceof Cat) {
 True // animal 类型缩小为 Cat
 True animal.meow();
 True }
 True}
 True```

 False### 7.3 自定义类型守卫
 False
```typescript
 Trueinterface Person {
 True name: string;
 True age: number;
 True}
 True
 Trueinterface Animal {
 True species: string;
 True sound: string;
 True}
 True
 Truetype LivingBeing = Person | Animal;
 True
 Truefunction isPerson(being: LivingBeing): being is Person {
 True return "name" in being && "age" in being;
 True}
 True
 Truefunction isAnimal(being: LivingBeing): being is Animal {
 True return "species" in being && "sound" in being;
 True}
 True
 Truefunction processBeing(being: LivingBeing) {
 True if (isPerson(being)) {
 True console.log(`Person: ${being.name}, ${being.age} years old`);
 True } else if (isAnimal(being)) {
 True console.log(`Animal: ${being.species}, makes ${being.sound}`);
 True }
 True}
 True```

 False### 7.4 判别式联合类型
 False
```typescript
 Trueinterface Square {
 True kind: "square";
 True size: number;
 True}
 True
 Trueinterface Rectangle {
 True kind: "rectangle";
 True width: number;
 True height: number;
 True}
 True
 Trueinterface Circle {
 True kind: "circle";
 True radius: number;
 True}
 True
 Truetype Shape = Square | Rectangle | Circle;
 True
 Truefunction getArea(shape: Shape): number {
 True switch (shape.kind) {
 True case "square":
 True return shape.size ** 2;
 True case "rectangle":
 True return shape.width * shape.height;
 True case "circle":
 True return Math.PI * shape.radius ** 2;
 True default:
 True // 类型保护，确保所有情况都被处理
 True const exhaustiveCheck: never = shape;
 True return 0;
 True }
 True}
 True```

 False## 8. 类型推断
 False
 FalseTypeScript 会根据上下文自动推断类型，减少显式类型注解的需要。
 False
 False### 8.1 变量类型推断
 False
```typescript
 True// 类型推断为 number
 Truelet num = 42;
 True
 True// 类型推断为 string
 Truelet str = "Hello";
 True
 True// 类型推断为 boolean
 Truelet isTrue = true;
 True
 True// 类型推断为 string[]
 Truelet arr = ["a", "b", "c"];
 True
 True// 类型推断为 { name: string; age: number }
 Truelet obj = { name: "John", age: 30 };
 True```

 False### 8.2 函数返回类型推断
 False
```typescript
 True// 返回类型推断为 number
 Truefunction add(a: number, b: number) {
 True return a + b;
 True}
 True
 True// 返回类型推断为 string
 Truefunction greet(name: string) {
 True return `Hello, ${name}!`;
 True}
 True
 True// 返回类型推断为 void
 Truefunction log(message: string) {
 True console.log(message);
 True}
 True```

 False### 8.3 泛型类型推断
 False
```typescript
 Truefunction identity<T>(value: T): T {
 True return value;
 True}
 True
 True// T 推断为 number
 Truelet num = identity(42);
 True
 True// T 推断为 string
 Truelet str = identity("Hello");
 True
 True// T 推断为 { name: string }
 Truelet obj = identity({ name: "John" });
 True```

 False### 8.4 上下文类型推断
 False
```typescript
 True// 上下文类型推断
 Trueconst names = ["John", "Jane", "Bob"];
 True
 True// 回调函数参数类型推断为 string
 Truenames.forEach(name => {
 True console.log(name.toUpperCase());
 True});
 True
 True// 事件处理函数类型推断
 Trueconst button = document.getElementById("myButton");
 Truebutton?.addEventListener("click", (event) => {
 True // event 类型推断为 MouseEvent
 True console.log(event.clientX, event.clientY);
 True});
 True```

 False## 9. 最佳实践
 False
 False### 9.1 类型定义最佳实践
 False
 False- **使用具体类型**：尽量避免使用 `any` 类型
 False- **使用接口定义对象结构**：清晰描述对象的形状
 False- **使用类型别名**：为复杂类型创建有意义的名称
 False- **使用泛型**：提高代码复用性和类型安全性
 False- **使用枚举**：为一组相关常量提供有意义的名称
 False- **使用字面量类型**：限制变量的取值范围
 False
 False### 9.2 类型守卫最佳实践
 False
 False- **使用 `typeof` 检查原始类型**：`string`, `number`, `boolean`, `symbol`
 False- **使用 `instanceof` 检查类实例**：类和构造函数
 False- **使用 `in` 操作符检查对象属性**：对象类型
 False- **使用判别式联合类型**：带有共同属性的联合类型
 False- **使用自定义类型守卫**：复杂类型检查
 False
 False### 9.3 类型断言最佳实践
 False
 False- **只在必要时使用**：优先使用类型守卫
 False- **使用 `as` 语法**：比尖括号语法更通用
 False- **避免双重断言**：除非确实需要
 False- **使用 `as const`**：为字面量类型提供更精确的类型
 False- **使用非空断言 `!`**：只在确定值不为 null 或 undefined 时使用
 False
 False### 9.4 性能优化
 False
 False- **避免过度使用联合类型**：联合类型会增加类型检查的复杂度
 False- **避免过度使用交叉类型**：交叉类型会增加类型计算的复杂度
 False- **使用 `readonly` 修饰符**：减少不必要的类型检查
 False- **使用 `const` 断言**：为字面量类型提供更精确的类型
 False- **避免循环依赖**：循环依赖会导致类型检查缓慢
 False
 False## 10. 实际应用示例
 False
 False### 10.1 表单验证
 False
```typescript
 True// 表单数据类型
 Truetype FormData = {
 True name: string;
 True email: string;
 True age: number;
 True agree: boolean;
 True};
 True
 True// 表单验证函数
 Truefunction validateForm(data: Partial<FormData>): string[] {
 True const errors: string[] = [];
 True 
 True if (!data.name) {
 True errors.push("Name is required");
 True }
 True 
 True if (!data.email) {
 True errors.push("Email is required");
 True } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
 True errors.push("Email is invalid");
 True }
 True 
 True if (data.age !== undefined && (data.age < 18 || data.age > 120)) {
 True errors.push("Age must be between 18 and 120");
 True }
 True 
 True if (!data.agree) {
 True errors.push("You must agree to the terms");
 True }
 True 
 True return errors;
 True}
 True
 True// 使用示例
 Trueconst formData: Partial<FormData> = {
 True name: "John",
 True email: "john@example.com",
 True age: 30,
 True agree: true
 True};
 True
 Trueconst errors = validateForm(formData);
 Trueif (errors.length === 0) {
 True console.log("Form is valid");
 True} else {
 True console.log("Form errors:", errors);
 True}
 True```

 False### 10.2 API 响应处理
 False
```typescript
 True// API 响应类型
 Truetype ApiResponse<T> = {
 True success: boolean;
 True data?: T;
 True error?: string;
 True};
 True
 True// 用户类型
 Trueinterface User {
 True id: number;
 True name: string;
 True email: string;
 True}
 True
 True// 处理 API 响应
 Truefunction handleResponse(response: ApiResponse<User>) {
 True if (response.success && response.data) {
 True console.log("User:", response.data);
 True } else {
 True console.error("Error:", response.error || "Unknown error");
 True }
 True}
 True
 True// 模拟 API 响应
 Trueconst successResponse: ApiResponse<User> = {
 True success: true,
 True data: {
 True id: 1,
 True name: "John",
 True email: "john@example.com"
 True }
 True};
 True
 Trueconst errorResponse: ApiResponse<User> = {
 True success: false,
 True error: "User not found"
 True};
 True
 TruehandleResponse(successResponse);
 TruehandleResponse(errorResponse);
 True```

 False### 10.3 状态管理
 False
```typescript
 True// 状态类型
 Truetype State = {
 True user: User | null;
 True loading: boolean;
 True error: string | null;
 True};
 True
 True// 动作类型
 Truetype Action =
 True | { type: "SET_USER"; payload: User }
 True | { type: "SET_LOADING"; payload: boolean }
 True | { type: "SET_ERROR"; payload: string }
 True | { type: "CLEAR_ERROR" }
 True | { type: "LOGOUT" };
 True
 True// 状态更新函数
 Truefunction reducer(state: State, action: Action): State {
 True switch (action.type) {
 True case "SET_USER":
 True return {
 True ...state,
 True user: action.payload,
 True error: null
 True };
 True case "SET_LOADING":
 True return {
 True ...state,
 True loading: action.payload
 True };
 True case "SET_ERROR":
 True return {
 True ...state,
 True error: action.payload,
 True loading: false
 True };
 True case "CLEAR_ERROR":
 True return {
 True ...state,
 True error: null
 True };
 True case "LOGOUT":
 True return {
 True ...state,
 True user: null
 True };
 True default:
 True return state;
 True }
 True}
 True
 True// 初始状态
 Trueconst initialState: State = {
 True user: null,
 True loading: false,
 True error: null
 True};
 True
 True// 使用示例
 Truelet state = initialState;
 True
 Truestate = reducer(state, { type: "SET_LOADING", payload: true });
 Trueconsole.log("Loading state:", state);
 True
 Truestate = reducer(state, { 
 True type: "SET_USER", 
 True payload: { id: 1, name: "John", email: "john@example.com" } 
 True});
 Trueconsole.log("User set:", state);
 True
 Truestate = reducer(state, { type: "SET_ERROR", payload: "Something went wrong" });
 Trueconsole.log("Error state:", state);
 True
 Truestate = reducer(state, { type: "LOGOUT" });
 Trueconsole.log("Logged out:", state);
 True```

 False## 11. 常见问题与解决方案
 False
 False### 11.1 类型错误
 False
 False| 错误 | 原因 | 解决方案 |
 False| :--- | :--- | :--- |
 False| **Type 'X' is not assignable to type 'Y'** | 类型不匹配 | 检查变量类型，确保类型一致 |
 False| **Property 'X' does not exist on type 'Y'** | 属性不存在 | 检查对象结构，确保属性存在或使用可选属性 |
 False| **Cannot find name 'X'** | 变量未定义 | 检查变量是否已声明，或添加类型定义 |
 False| **Object is possibly 'null' or 'undefined'** | 可能为 null 或 undefined | 使用非空断言或类型守卫 |
 False| **Type 'any' is not assignable to type 'X'** | any 类型不能直接赋值给具体类型 | 使用类型断言或类型守卫 |
 False
 False### 11.2 类型推断问题
 False
 False| 问题 | 原因 | 解决方案 |
 False| :--- | :--- | :--- |
 False| **Type inference is too narrow** | 类型推断过于狭窄 | 使用类型注解或类型断言 |
 False| **Type inference is too wide** | 类型推断过于宽泛 | 使用字面量类型或 as const 断言 |
 False| **Type inference fails for complex types** | 复杂类型的推断失败 | 使用显式类型注解 |
 False
 False### 11.3 类型守卫问题
 False
 False| 问题 | 原因 | 解决方案 |
 False| :--- | :--- | :--- |
 False| **Type guard not narrowing type** | 类型守卫没有正确缩小类型 | 检查类型守卫的实现，确保返回类型正确 |
 False| **Discriminated union not working** | 判别式联合类型不工作 | 确保所有联合成员都有共同的判别属性 |
 False| **Type guard performance** | 类型守卫执行缓慢 | 优化类型守卫逻辑，避免复杂检查 |
 False
 False## 12. 总结
 False
 FalseTypeScript 的类型系统是其最强大的特性之一，它提供了丰富的类型定义和检查机制，帮助开发者在编译时发现错误，提高代码质量和可维护性。通过理解和使用 TypeScript 的基础类型、联合类型、交叉类型、类型别名、字面量类型等特性，开发者可以构建更加可靠、类型安全的应用程序。
 False
 False### 12.1 关键要点
 False
 False- **类型安全**：TypeScript 的核心价值在于提供静态类型检查，减少运行时错误
 False- **类型推断**：TypeScript 会根据上下文自动推断类型，减少显式类型注解的需要
 False- **类型守卫**：运行时检查，用于确定变量的具体类型
 False- **类型断言**：告诉 TypeScript 编译器你知道变量的实际类型
 False- **字面量类型**：限制变量的取值范围，提高类型安全性
 False- **联合类型和交叉类型**：组合多个类型，提高代码灵活性
 False
 False### 12.2 学习建议
 False
 False- **从基础开始**：学习 TypeScript 的基本类型和语法
 False- **实践项目**：通过实际项目练习 TypeScript 类型系统
 False- **阅读文档**：参考官方文档和最佳实践
 False- **使用类型守卫**：优先使用类型守卫而不是类型断言
 False- **避免使用 any**：尽量使用具体类型或 unknown
 False- **使用类型别名**：为复杂类型创建有意义的名称
 False
 FalseTypeScript 的类型系统是一个强大的工具，掌握它可以帮助开发者构建更加可靠、可维护的应用程序，提高开发效率和代码质量。
 False
 False## 延伸阅读
 False
 False- [[javascript/variables-and-data-types|JS 数据类型]]
 False
 False---
 False
 False### 更新日志 (Changelog)
 False
 False- 2026-04-05: 细化 TS 基础类型与特殊类型用法。
 False- 2026-04-05: 扩写内容，增加详细的类型系统内容、示例和最佳实践。
 False