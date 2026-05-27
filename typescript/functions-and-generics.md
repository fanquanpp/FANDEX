# 函数与泛型 (Functions & Generics)
 False
 False> @Version: v3.5.0
 False
 False> @Author: Anonymous
 False> @Category: TS Advanced
 False> @Description: 函数重载、泛型约束、泛型类及泛型方法深度解析。 | Function overloading, Generics, constraints, and classes.
 False
 False---
 False
 False## 目录
 False
 False1. [函数重载](#函数重载)
 False2. [泛型](#泛型)
 False3. [泛型约束](#泛型约束)
 False4. [泛型类](#泛型类)
 False5. [泛型方法](#泛型方法)
 False6. [泛型工具类型](#泛型工具类型)
 False7. [泛型的高级应用](#泛型的高级应用)
 False8. [最佳实践](#最佳实践)
 False9. [代码示例](#代码示例)
 False
 False---
 False
 False## 1. 函数重载 (Function Overloading)
 False
 False函数重载允许为同一个函数提供多个类型定义，根据传入的参数类型和数量来选择合适的类型定义。
 False
 False### 1.1 基本函数重载
 False
```typescript
 True// 函数重载声明
 Truefunction add(a: number, b: number): number;
 Truefunction add(a: string, b: string): string;
 Truefunction add(a: number, b: string): string;
 Truefunction add(a: string, b: number): string;
 True
 True// 函数实现
 Truefunction add(a: any, b: any): any {
 True return a + b;
 True}
 True
 True// 使用示例
 Trueconst sum1 = add(1, 2); // 类型为 number，值为 3
 Trueconst sum2 = add("Hello, ", "World"); // 类型为 string，值为 "Hello, World"
 Trueconst sum3 = add(1, " apples"); // 类型为 string，值为 "1 apples"
 Trueconst sum4 = add("You have ", 5); // 类型为 string，值为 "You have 5"
 True```

 False### 1.2 函数重载与可选参数
 False
```typescript
 True// 函数重载声明
 Truefunction greet(name: string): string;
 Truefunction greet(name: string, age: number): string;
 Truefunction greet(name: string, age?: number): string;
 True
 True// 函数实现
 Truefunction greet(name: string, age?: number): string {
 True if (age !== undefined) {
 True return `Hello, ${name}! You are ${age} years old.`;
 True }
 True return `Hello, ${name}!`;
 True}
 True
 True// 使用示例
 Trueconst greeting1 = greet("Alice"); // 类型为 string，值为 "Hello, Alice!"
 Trueconst greeting2 = greet("Bob", 25); // 类型为 string，值为 "Hello, Bob! You are 25 years old."
 True```

 False### 1.3 函数重载与联合类型
 False
```typescript
 True// 函数重载声明
 Truefunction process(value: string): string;
 Truefunction process(value: number): number;
 Truefunction process(value: boolean): boolean;
 True
 True// 函数实现
 Truefunction process(value: string | number | boolean): string | number | boolean {
 True if (typeof value === "string") {
 True return value.toUpperCase();
 True } else if (typeof value === "number") {
 True return value * 2;
 True } else {
 True return !value;
 True }
 True}
 True
 True// 使用示例
 Trueconst result1 = process("hello"); // 类型为 string，值为 "HELLO"
 Trueconst result2 = process(5); // 类型为 number，值为 10
 Trueconst result3 = process(true); // 类型为 boolean，值为 false
 True```

 False### 1.4 函数重载的最佳实践
 False
 False- **明确类型签名**: 为不同的参数组合提供清晰的类型签名。
 False- **实现类型兼容**: 实现函数的参数类型和返回类型必须与所有重载签名兼容。
 False- **从具体到一般**: 重载签名应该从最具体的到最一般的顺序排列。
 False- **避免过度使用**: 只在确实需要不同类型处理逻辑时使用函数重载。
 False
 False## 2. 泛型 (Generics)
 False
 False泛型是 TypeScript 中一种强大的类型系统特性，允许我们编写可以处理多种类型的代码，而不是仅限于单一类型。
 False
 False### 2.1 基本泛型函数
 False
```typescript
 True// 基本泛型函数
 Truefunction identity<T>(arg: T): T {
 True return arg;
 True}
 True
 True// 使用示例
 Trueconst stringOutput = identity<string>("myString"); // 类型为 string
 Trueconst numberOutput = identity<number>(42); // 类型为 number
 Trueconst booleanOutput = identity<boolean>(true); // 类型为 boolean
 True
 True// 类型推断
 Trueconst inferredString = identity("Hello"); // 类型自动推断为 string
 Trueconst inferredNumber = identity(123); // 类型自动推断为 number
 True```

 False### 2.2 多个泛型参数
 False
```typescript
 True// 多个泛型参数
 Truefunction pair<T, U>(first: T, second: U): [T, U] {
 True return [first, second];
 True}
 True
 True// 使用示例
 Trueconst stringNumberPair = pair("hello", 42); // 类型为 [string, number]
 Trueconst booleanArrayPair = pair(true, [1, 2, 3]); // 类型为 [boolean, number[]]
 Trueconst objectFunctionPair = pair({ name: "Alice" }, () => console.log("Hello")); // 类型为 [{ name: string }, () => void]
 True```

 False### 2.3 泛型接口
 False
```typescript
 True// 泛型接口
 Trueinterface Container<T> {
 True value: T;
 True getValue(): T;
 True setValue(value: T): void;
 True}
 True
 True// 实现泛型接口
 Trueclass NumberContainer implements Container<number> {
 True value: number;
 True 
 True constructor(value: number) {
 True this.value = value;
 True }
 True 
 True getValue(): number {
 True return this.value;
 True }
 True 
 True setValue(value: number): void {
 True this.value = value;
 True }
 True}
 True
 Trueclass StringContainer implements Container<string> {
 True value: string;
 True 
 True constructor(value: string) {
 True this.value = value;
 True }
 True 
 True getValue(): string {
 True return this.value;
 True }
 True 
 True setValue(value: string): void {
 True this.value = value;
 True }
 True}
 True
 True// 使用示例
 Trueconst numberContainer = new NumberContainer(42);
 Trueconsole.log(numberContainer.getValue()); // 42
 TruenumberContainer.setValue(100);
 Trueconsole.log(numberContainer.getValue()); // 100
 True
 Trueconst stringContainer = new StringContainer("Hello");
 Trueconsole.log(stringContainer.getValue()); // Hello
 TruestringContainer.setValue("World");
 Trueconsole.log(stringContainer.getValue()); // World
 True```

 False### 2.4 泛型类型别名
 False
```typescript
 True// 泛型类型别名
 Truetype Pair<T, U> = [T, U];
 Truetype Callback<T> = (value: T) => void;
 Truetype Transform<T, U> = (value: T) => U;
 True
 True// 使用示例
 Trueconst stringNumberPair: Pair<string, number> = ["age", 30];
 Trueconst numberCallback: Callback<number> = (value) => console.log(`Value: ${value}`);
 Trueconst stringToNumber: Transform<string, number> = (value) => parseInt(value);
 True
 TruenumberCallback(42); // 输出: Value: 42
 Trueconsole.log(stringToNumber("123")); // 输出: 123
 True```

 False## 3. 泛型约束 (Generic Constraints)
 False
 False泛型约束允许我们限制泛型类型参数的范围，确保它们具有某些特定的属性或方法。
 False
 False### 3.1 基本泛型约束
 False
```typescript
 True// 定义约束接口
 Trueinterface Lengthwise {
 True length: number;
 True}
 True
 True// 使用约束
 Truefunction logLength<T extends Lengthwise>(arg: T): T {
 True console.log(`Length: ${arg.length}`);
 True return arg;
 True}
 True
 True// 使用示例
 TruelogLength("Hello"); // 输出: Length: 5
 TruelogLength([1, 2, 3]); // 输出: Length: 3
 TruelogLength({ length: 10, value: "test" }); // 输出: Length: 10
 True
 True// 错误示例：数字没有 length 属性
 True// logLength(42); // 编译错误
 True```

 False### 3.2 多个泛型约束
 False
```typescript
 True// 定义多个约束接口
 Trueinterface Lengthwise {
 True length: number;
 True}
 True
 Trueinterface HasName {
 True name: string;
 True}
 True
 True// 多个约束
 Truefunction processItem<T extends Lengthwise & HasName>(item: T): T {
 True console.log(`Name: ${item.name}, Length: ${item.length}`);
 True return item;
 True}
 True
 True// 使用示例
 Trueconst item = {
 True name: "Test",
 True length: 5,
 True value: 42
 True};
 True
 TrueprocessItem(item); // 输出: Name: Test, Length: 5
 True```

 False### 3.3 泛型约束与 keyof
 False
```typescript
 True// 使用 keyof 约束
 Truefunction getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
 True return obj[key];
 True}
 True
 True// 使用示例
 Trueconst person = {
 True name: "Alice",
 True age: 30,
 True email: "alice@example.com"
 True};
 True
 Trueconst name = getProperty(person, "name"); // 类型为 string
 Trueconst age = getProperty(person, "age"); // 类型为 number
 Trueconst email = getProperty(person, "email"); // 类型为 string
 True
 True// 错误示例：不存在的属性
 True// const invalid = getProperty(person, "invalid"); // 编译错误
 True```

 False### 3.4 泛型约束与默认值
 False
```typescript
 True// 带默认值的泛型约束
 Truefunction createArray<T extends number | string = string>(length: number, defaultValue: T): T[] {
 True return Array(length).fill(defaultValue);
 True}
 True
 True// 使用示例
 Trueconst numberArray = createArray(5, 0); // 类型为 number[]
 Trueconst stringArray = createArray(3, "hello"); // 类型为 string[]
 Trueconst defaultArray = createArray(2, "test"); // 类型为 string[]（使用默认类型）
 True```

 False## 4. 泛型类 (Generic Classes)
 False
 False泛型类允许我们创建可以处理不同类型数据的类。
 False
 False### 4.1 基本泛型类
 False
```typescript
 True// 基本泛型类
 Trueclass Box<T> {
 True private data: T;
 True 
 True constructor(data: T) {
 True this.data = data;
 True }
 True 
 True getData(): T {
 True return this.data;
 True }
 True 
 True setData(data: T): void {
 True this.data = data;
 True }
 True}
 True
 True// 使用示例
 Trueconst numberBox = new Box<number>(42);
 Trueconsole.log(numberBox.getData()); // 42
 TruenumberBox.setData(100);
 Trueconsole.log(numberBox.getData()); // 100
 True
 Trueconst stringBox = new Box<string>("Hello");
 Trueconsole.log(stringBox.getData()); // Hello
 TruestringBox.setData("World");
 Trueconsole.log(stringBox.getData()); // World
 True```

 False### 4.2 泛型类与约束
 False
```typescript
 True// 带约束的泛型类
 Trueinterface Printable {
 True toString(): string;
 True}
 True
 Trueclass Printer<T extends Printable> {
 True print(item: T): void {
 True console.log(item.toString());
 True }
 True}
 True
 True// 使用示例
 Trueconst numberPrinter = new Printer<number>();
 TruenumberPrinter.print(42); // 输出: 42
 True
 Trueconst stringPrinter = new Printer<string>();
 TruestringPrinter.print("Hello"); // 输出: Hello
 True
 Trueconst objPrinter = new Printer<{ name: string; toString(): string }>();
 TrueobjPrinter.print({ 
 True name: "Test", 
 True toString() { return `Object: ${this.name}`; } 
 True}); // 输出: Object: Test
 True```

 False### 4.3 泛型类与静态成员
 False
```typescript
 True// 泛型类与静态成员
 Trueclass GenericClass<T> {
 True private value: T;
 True 
 True // 静态成员不能使用泛型类型参数
 True static staticValue: number = 42;
 True 
 True constructor(value: T) {
 True this.value = value;
 True }
 True 
 True getValue(): T {
 True return this.value;
 True }
 True 
 True // 静态方法可以使用自己的泛型参数
 True static create<U>(value: U): GenericClass<U> {
 True return new GenericClass<U>(value);
 True }
 True}
 True
 True// 使用示例
 Trueconst instance = new GenericClass<string>("Hello");
 Trueconsole.log(instance.getValue()); // Hello
 Trueconsole.log(GenericClass.staticValue); // 42
 True
 Trueconst createdInstance = GenericClass.create(123);
 Trueconsole.log(createdInstance.getValue()); // 123
 True```

 False### 4.4 泛型类的继承
 False
```typescript
 True// 泛型类的继承
 Trueclass BaseRepository<T> {
 True protected items: T[] = [];
 True 
 True add(item: T): void {
 True this.items.push(item);
 True }
 True 
 True getById(id: number): T | undefined {
 True return this.items[id];
 True }
 True}
 True
 True// 继承泛型类
 Trueclass User {
 True id: number;
 True name: string;
 True 
 True constructor(id: number, name: string) {
 True this.id = id;
 True this.name = name;
 True }
 True}
 True
 Trueclass UserRepository extends BaseRepository<User> {
 True findByName(name: string): User | undefined {
 True return this.items.find(user => user.name === name);
 True }
 True}
 True
 True// 使用示例
 Trueconst userRepo = new UserRepository();
 TrueuserRepo.add(new User(1, "Alice"));
 TrueuserRepo.add(new User(2, "Bob"));
 True
 Trueconsole.log(userRepo.getById(0)?.name); // Alice
 Trueconsole.log(userRepo.findByName("Bob")?.id); // 2
 True```

 False## 5. 泛型方法
 False
 False泛型方法是在类或接口中定义的带有泛型参数的方法。
 False
 False### 5.1 类中的泛型方法
 False
```typescript
 True// 类中的泛型方法
 Trueclass Utils {
 True // 泛型方法
 True static map<T, U>(array: T[], transform: (item: T) => U): U[] {
 True return array.map(transform);
 True }
 True 
 True // 泛型方法与约束
 True static filter<T extends { active: boolean }>(array: T[]): T[] {
 True return array.filter(item => item.active);
 True }
 True}
 True
 True// 使用示例
 Trueconst numbers = [1, 2, 3, 4, 5];
 Trueconst squared = Utils.map(numbers, n => n * n); // 类型为 number[]
 Trueconsole.log(squared); // [1, 4, 9, 16, 25]
 True
 Trueconst users = [
 True { id: 1, name: "Alice", active: true },
 True { id: 2, name: "Bob", active: false },
 True { id: 3, name: "Charlie", active: true }
 True];
 True
 Trueconst activeUsers = Utils.filter(users); // 类型为 { id: number; name: string; active: boolean }[]
 Trueconsole.log(activeUsers); // [{ id: 1, name: "Alice", active: true }, { id: 3, name: "Charlie", active: true }]
 True```

 False### 5.2 接口中的泛型方法
 False
```typescript
 True// 接口中的泛型方法
 Trueinterface Collection {
 True // 泛型方法
 True <T>(items: T[]): T[];
 True 
 True // 带约束的泛型方法
 True <T extends { id: number }>(items: T[]): T[];
 True}
 True
 True// 实现接口
 Trueconst MyCollection: Collection = function<T>(items: T[]): T[] {
 True return items;
 True};
 True
 True// 使用示例
 Trueconst strings = MyCollection<string>(["a", "b", "c"]); // 类型为 string[]
 Trueconst numbers = MyCollection<number>([1, 2, 3]); // 类型为 number[]
 True
 Trueconst users = MyCollection([
 True { id: 1, name: "Alice" },
 True { id: 2, name: "Bob" }
 True]); // 类型为 { id: number; name: string }[]
 True```

 False## 6. 泛型工具类型 (Utility Types)
 False
 FalseTypeScript 提供了一系列内置的泛型工具类型，用于常见的类型转换场景。
 False
 False### 6.1 常用泛型工具类型
 False
 False| 工具类型 | 描述 | 示例 |
 False| :--- | :--- | :--- |
 False| **`Partial<T>`** | 将 T 中所有属性变为可选 | `Partial<{ a: number; b: string }>` → `{ a?: number; b?: string }` |
 False| **`Readonly<T>`** | 将 T 中所有属性变为只读 | `Readonly<{ a: number; b: string }>` → `{ readonly a: number; readonly b: string }` |
 False| **`Record<K, T>`** | 构建键为 K 类型，值为 T 类型的对象类型 | `Record<string, number>` → `{ [key: string]: number }` |
 False| **`Pick<T, K>`** | 从 T 中选取指定的属性 K | `Pick<{ a: number; b: string; c: boolean }, "a" | "b">` → `{ a: number; b: string }` |
 False| **`Omit<T, K>`** | 从 T 中排除指定的属性 K | `Omit<{ a: number; b: string; c: boolean }, "c">` → `{ a: number; b: string }` |
 False| **`Exclude<T, U>`** | 从 T 中排除可以赋值给 U 的类型 | `Exclude<"a" | "b" | "c", "a">` → `"b" | "c"` |
 False| **`Extract<T, U>`** | 从 T 中提取可以赋值给 U 的类型 | `Extract<"a" | "b" | "c", "a" | "b">` → `"a" | "b"` |
 False| **`NonNullable<T>`** | 从 T 中排除 null 和 undefined | `NonNullable<string | null | undefined>` → `string` |
 False| **`Parameters<T>`** | 提取函数 T 的参数类型为元组 | `Parameters<(a: number, b: string) => void>` → `[number, string]` |
 False| **`ReturnType<T>`** | 提取函数 T 的返回类型 | `ReturnType<() => string>` → `string` |
 False
 False### 6.2 泛型工具类型的使用示例
 False
```typescript
 True// 定义基础类型
 Trueinterface User {
 True id: number;
 True name: string;
 True email: string;
 True age: number;
 True active: boolean;
 True}
 True
 True// Partial<T>
 Truetype PartialUser = Partial<User>;
 Trueconst partialUser: PartialUser = { id: 1, name: "Alice" };
 True
 True// Readonly<T>
 Truetype ReadonlyUser = Readonly<User>;
 Trueconst readonlyUser: ReadonlyUser = { 
 True id: 1, 
 True name: "Alice", 
 True email: "alice@example.com", 
 True age: 30, 
 True active: true 
 True};
 True// readonlyUser.name = "Bob"; // 编译错误
 True
 True// Record<K, T>
 Truetype UserRoleMap = Record<string, "admin" | "user" | "guest">;
 Trueconst roleMap: UserRoleMap = {
 True "alice": "admin",
 True "bob": "user",
 True "charlie": "guest"
 True};
 True
 True// Pick<T, K>
 Truetype UserEssential = Pick<User, "id" | "name" | "email">;
 Trueconst essentialUser: UserEssential = {
 True id: 1,
 True name: "Alice",
 True email: "alice@example.com"
 True};
 True
 True// Omit<T, K>
 Truetype UserWithoutAge = Omit<User, "age">;
 Trueconst userWithoutAge: UserWithoutAge = {
 True id: 1,
 True name: "Alice",
 True email: "alice@example.com",
 True active: true
 True};
 True
 True// Exclude<T, U>
 Truetype Status = "active" | "inactive" | "pending" | "deleted";
 Truetype ActiveStatus = Exclude<Status, "deleted">; // "active" | "inactive" | "pending"
 True
 True// Extract<T, U>
 Truetype NumericStatus = Extract<Status | number | boolean, number>; // number
 True
 True// NonNullable<T>
 Truetype OptionalString = string | null | undefined;
 Truetype RequiredString = NonNullable<OptionalString>; // string
 True
 True// Parameters<T>
 Truetype FuncParams = Parameters<(a: number, b: string) => boolean>; // [number, string]
 True
 True// ReturnType<T>
 Truetype FuncReturn = ReturnType<() => { id: number; name: string }>; // { id: number; name: string }
 True```

 False### 6.3 组合使用泛型工具类型
 False
```typescript
 True// 组合使用泛型工具类型
 Trueinterface Product {
 True id: number;
 True name: string;
 True price: number;
 True description: string;
 True category: string;
 True stock: number;
 True active: boolean;
 True}
 True
 True// 创建产品的更新类型
 Truetype ProductUpdate = Partial<Pick<Product, "name" | "price" | "description" | "stock" | "active">>;
 True
 True// 使用示例
 Trueconst update: ProductUpdate = {
 True price: 99.99,
 True stock: 100
 True};
 True
 True// 创建产品的响应类型
 Truetype ProductResponse = Readonly<Omit<Product, "stock">>;
 True
 True// 使用示例
 Trueconst response: ProductResponse = {
 True id: 1,
 True name: "Laptop",
 True price: 999.99,
 True description: "A powerful laptop",
 True category: "Electronics",
 True active: true
 True};
 True```

 False## 7. 泛型的高级应用
 False
 False### 7.1 递归泛型
 False
```typescript
 True// 递归泛型
 Trueinterface TreeNode<T> {
 True value: T;
 True children: TreeNode<T>[];
 True}
 True
 True// 使用示例
 Trueconst tree: TreeNode<number> = {
 True value: 1,
 True children: [
 True {
 True value: 2,
 True children: [
 True { value: 4, children: [] },
 True { value: 5, children: [] }
 True ]
 True },
 True {
 True value: 3,
 True children: [
 True { value: 6, children: [] }
 True ]
 True }
 True ]
 True};
 True
 True// 递归函数处理树
 Truefunction traverse<T>(node: TreeNode<T>, callback: (value: T) => void): void {
 True callback(node.value);
 True node.children.forEach(child => traverse(child, callback));
 True}
 True
 Truetraverse(tree, value => console.log(value)); // 输出: 1, 2, 4, 5, 3, 6
 True```

 False### 7.2 条件类型与泛型
 False
```typescript
 True// 条件类型与泛型
 Truetype IsArray<T> = T extends Array<any> ? true : false;
 Truetype ArrayElementType<T> = T extends Array<infer U> ? U : T;
 True
 True// 使用示例
 Truetype A = IsArray<string[]>; // true
 Truetype B = IsArray<number>; // false
 Truetype C = ArrayElementType<string[]>; // string
 Truetype D = ArrayElementType<number>; // number
 True
 True// 复杂条件类型
 Truetype DeepArrayElementType<T> = T extends Array<infer U> 
 True ? DeepArrayElementType<U> 
 True : T;
 True
 True// 使用示例
 Truetype E = DeepArrayElementType<string[][]>; // string
 Truetype F = DeepArrayElementType<number[]>; // number
 Truetype G = DeepArrayElementType<number>; // number
 True```

 False### 7.3 泛型与映射类型
 False
```typescript
 True// 映射类型
 Trueinterface Person {
 True name: string;
 True age: number;
 True email: string;
 True}
 True
 True// 映射类型：将所有属性变为可选
 Truetype Optional<T> = {
 True [K in keyof T]?: T[K];
 True};
 True
 True// 映射类型：将所有属性变为只读
 Truetype Readonly<T> = {
 True readonly [K in keyof T]: T[K];
 True};
 True
 True// 映射类型：将所有属性类型变为 string
 Truetype Stringify<T> = {
 True [K in keyof T]: string;
 True};
 True
 True// 使用示例
 Truetype OptionalPerson = Optional<Person>;
 Truetype ReadonlyPerson = Readonly<Person>;
 Truetype StringifiedPerson = Stringify<Person>;
 True
 Trueconst optionalPerson: OptionalPerson = { name: "Alice" };
 Trueconst readonlyPerson: ReadonlyPerson = { 
 True name: "Alice", 
 True age: 30, 
 True email: "alice@example.com" 
 True};
 True// readonlyPerson.age = 31; // 编译错误
 True
 Trueconst stringifiedPerson: StringifiedPerson = {
 True name: "Alice",
 True age: "30", // 类型为 string
 True email: "alice@example.com"
 True};
 True```

 False## 8. 最佳实践
 False
 False### 8.1 泛型使用原则
 False
 False- **明确类型参数名称**: 使用有意义的类型参数名称，如 `T` 表示类型，`K` 表示键，`V` 表示值。
 False- **合理使用约束**: 只在需要时使用泛型约束，避免过度约束。
 False- **类型推断**: 尽可能利用 TypeScript 的类型推断能力，减少显式类型参数的使用。
 False- **代码可读性**: 保持泛型代码的可读性，避免过于复杂的泛型结构。
 False- **性能考虑**: 注意泛型可能带来的编译时间增加，但通常运行时性能不受影响。
 False
 False### 8.2 函数重载最佳实践
 False
 False- **从具体到一般**: 重载签名应该从最具体的到最一般的顺序排列。
 False- **实现兼容性**: 实现函数的参数类型和返回类型必须与所有重载签名兼容。
 False- **避免过度使用**: 只在确实需要不同类型处理逻辑时使用函数重载。
 False- **文档化**: 为重载函数添加注释，说明不同重载的用途。
 False
 False### 8.3 泛型工具类型使用建议
 False
 False- **熟悉内置工具类型**: 充分利用 TypeScript 提供的内置泛型工具类型。
 False- **创建自定义工具类型**: 根据项目需求创建自定义的泛型工具类型。
 False- **组合使用**: 灵活组合多个泛型工具类型以满足复杂的类型转换需求。
 False- **类型安全**: 使用泛型工具类型确保类型安全，减少运行时错误。
 False
 False## 9. 代码示例
 False
 False### 9.1 泛型函数的综合使用
 False
```typescript
 True// 泛型函数：安全地获取对象属性
 Truefunction getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
 True return obj[key];
 True}
 True
 True// 泛型函数：深度克隆对象
 Truefunction deepClone<T>(obj: T): T {
 True if (obj === null || typeof obj !== "object") {
 True return obj;
 True }
 True 
 True if (obj instanceof Array) {
 True return obj.map(item => deepClone(item)) as unknown as T;
 True }
 True 
 True const clonedObj = {} as T;
 True for (const key in obj) {
 True if (obj.hasOwnProperty(key)) {
 True clonedObj[key] = deepClone(obj[key]);
 True }
 True }
 True 
 True return clonedObj;
 True}
 True
 True// 泛型函数：创建带有默认值的数组
 Truefunction createArray<T>(length: number, defaultValue: T): T[] {
 True return Array(length).fill(defaultValue);
 True}
 True
 True// 使用示例
 Trueconst person = {
 True name: "Alice",
 True age: 30,
 True address: {
 True street: "123 Main St",
 True city: "New York"
 True }
 True};
 True
 True// 安全获取属性
 Trueconst name = getProperty(person, "name"); // 类型为 string
 Trueconst age = getProperty(person, "age"); // 类型为 number
 True
 True// 深度克隆
 Trueconst clonedPerson = deepClone(person);
 Trueconsole.log(clonedPerson.address.city); // New York
 True
 True// 创建数组
 Trueconst numbers = createArray(5, 0); // 类型为 number[]
 Trueconst strings = createArray(3, "hello"); // 类型为 string[]
 True```

 False### 9.2 泛型类的综合使用
 False
```typescript
 True// 泛型队列类
 Trueclass Queue<T> {
 True private items: T[] = [];
 True 
 True enqueue(item: T): void {
 True this.items.push(item);
 True }
 True 
 True dequeue(): T | undefined {
 True return this.items.shift();
 True }
 True 
 True peek(): T | undefined {
 True return this.items[0];
 True }
 True 
 True size(): number {
 True return this.items.length;
 True }
 True 
 True isEmpty(): boolean {
 True return this.items.length === 0;
 True }
 True}
 True
 True// 泛型栈类
 Trueclass Stack<T> {
 True private items: T[] = [];
 True 
 True push(item: T): void {
 True this.items.push(item);
 True }
 True 
 True pop(): T | undefined {
 True return this.items.pop();
 True }
 True 
 True peek(): T | undefined {
 True return this.items[this.items.length - 1];
 True }
 True 
 True size(): number {
 True return this.items.length;
 True }
 True 
 True isEmpty(): boolean {
 True return this.items.length === 0;
 True }
 True}
 True
 True// 使用示例
 True// 数字队列
 Trueconst numberQueue = new Queue<number>();
 TruenumberQueue.enqueue(1);
 TruenumberQueue.enqueue(2);
 TruenumberQueue.enqueue(3);
 Trueconsole.log(numberQueue.dequeue()); // 1
 Trueconsole.log(numberQueue.peek()); // 2
 True
 True// 字符串栈
 Trueconst stringStack = new Stack<string>();
 TruestringStack.push("a");
 TruestringStack.push("b");
 TruestringStack.push("c");
 Trueconsole.log(stringStack.pop()); // c
 Trueconsole.log(stringStack.peek()); // b
 True
 True// 对象队列
 Trueinterface User {
 True id: number;
 True name: string;
 True}
 True
 Trueconst userQueue = new Queue<User>();
 TrueuserQueue.enqueue({ id: 1, name: "Alice" });
 TrueuserQueue.enqueue({ id: 2, name: "Bob" });
 Trueconsole.log(userQueue.dequeue()?.name); // Alice
 True```

 False### 9.3 泛型工具类型的综合使用
 False
```typescript
 True// 定义基础类型
 Trueinterface APIResponse<T> {
 True success: boolean;
 True data: T;
 True error?: string;
 True}
 True
 Trueinterface User {
 True id: number;
 True name: string;
 True email: string;
 True age: number;
 True password: string;
 True}
 True
 True// 创建响应类型
 True type UserResponse = APIResponse<Omit<User, "password">>;
 True type UserListResponse = APIResponse<Array<Omit<User, "password">>>;
 True
 True// 创建请求类型
 True type CreateUserRequest = Omit<User, "id">;
 True type UpdateUserRequest = Partial<Omit<User, "id" | "password">>;
 True
 True// 使用示例
 True// 模拟 API 响应
 Trueconst userResponse: UserResponse = {
 True success: true,
 True data: {
 True id: 1,
 True name: "Alice",
 True email: "alice@example.com",
 True age: 30
 True }
 True};
 True
 Trueconst userListResponse: UserListResponse = {
 True success: true,
 True data: [
 True {
 True id: 1,
 True name: "Alice",
 True email: "alice@example.com",
 True age: 30
 True },
 True {
 True id: 2,
 True name: "Bob",
 True email: "bob@example.com",
 True age: 25
 True }
 True ]
 True};
 True
 True// 模拟请求数据
 Trueconst createUserRequest: CreateUserRequest = {
 True name: "Charlie",
 True email: "charlie@example.com",
 True age: 35,
 True password: "password123"
 True};
 True
 Trueconst updateUserRequest: UpdateUserRequest = {
 True name: "Alice Smith",
 True age: 31
 True};
 True
 Trueconsole.log(userResponse.data);
 Trueconsole.log(userListResponse.data);
 Trueconsole.log(createUserRequest);
 Trueconsole.log(updateUserRequest);
 True```

 False---
 False
 False### 更新日志 (Changelog)
 False
 False- 2026-04-05: 体系化整合 TS 泛型工具与约束规则。
 False- 2026-04-05: 扩写内容，增加详细的函数重载、泛型、泛型约束、泛型类、泛型方法、泛型工具类型、高级应用和最佳实践等内容。

## 延伸阅读

- [[javascript/functions-and-scope|JS 函数与作用域]]
 False