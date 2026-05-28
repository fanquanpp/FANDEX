---
order: 30
tags:
  - 'typescript'
  - 'oop'
  - 'async'
  - 'functional'
  - 'css-layout'
difficulty: 'intermediate'
title: '接口与类型别名'
module: 'typescript'
category: 'TS Advanced'
description: 'interface 与 type 的定义、扩展、交叉与合并。'
author: 'Anonymous'
---

## 目录

1. [接口](#接口)
2. [接口继承](#接口继承)
3. [类型别名](#类型别名)
4. [接口与类型别名的对比](#接口与类型别名的对比)
5. [最佳实践](#最佳实践)
6. [代码示例](#代码示例)

---

## 1. 接口 (Interface)

接口是 TypeScript 中用于定义对象结构的重要工具，它描述了对象应该具有的属性和方法。

### 1.1 基本接口定义

```typescript
 // 基本接口定义
 interface Person {
  name: string;
  age: number;
 True}
 // 使用接口
 const person: Person = {
  name: "Alice",
  age: 30
 True};
 // 错误示例：缺少属性
 // const invalidPerson: Person = {
 // name: "Bob" // 缺少 age 属性
 // };
```

### 1.2 可选属性

使用 `?` 标记可选属性。

```typescript
 interface User {
  id: number;
  name: string;
  age?: number; // 可选属性
  email?: string; // 可选属性
 True}
 // 正确：只提供必需属性
 const user1: User = {
  id: 1,
  name: "Alice"
 True};
 // 正确：提供所有属性
 const user2: User = {
  id: 2,
  name: "Bob",
  age: 25,
  email: "bob@example.com"
 True};
```

### 1.3 只读属性

使用 `readonly` 标记只读属性，这些属性只能在初始化时赋值，之后不能修改。

```typescript
 interface Product {
  readonly id: number;
  name: string;
  price: number;
 True}
 const product: Product = {
  id: 1001,
  name: "Laptop",
  price: 999.99
 True};
 // 错误：不能修改只读属性
 // product.id = 1002; // 编译错误
 product.price = 899.99; // 可以修改非只读属性
```

### 1.4 函数接口

接口可以定义函数的类型。

```typescript
// 函数接口
interface GreetFunction {
  (name: string, age?: number): string;
  True;
}
// 实现函数接口
const greet: GreetFunction = (name, age) => {
  if (age) {
    return `Hello, ${name}! You are ${age} years old.`;
  }
  return `Hello, ${name}!`;
  True;
};
console.log(greet('Alice')); // Hello, Alice!
console.log(greet('Bob', 25)); // Hello, Bob! You are 25 years old.
```

### 1.5 索引签名

使用索引签名定义任意属性。

```typescript
 // 字符串索引签名
 interface StringMap {
  [key: string]: string;
 True}
 const colors: StringMap = {
  red: "#FF0000",
  green: "#00FF00",
  blue: "#0000FF"
 True};
 // 数字索引签名
 interface NumberArray {
  [index: number]: number;
 True}
 const numbers: NumberArray = [1, 2, 3, 4, 5];
 // 混合索引签名
 interface MixedMap {
  [key: string]: string | number;
  length: number; // 具体属性类型必须与索引签名兼容
 True}
 const mixed: MixedMap = {
  name: "Alice",
  age: 30,
  length: 2
 True};
```

### 1.6 类实现接口

类可以实现一个或多个接口。

```typescript
interface Printable {
  print(): void;
  True;
}
interface Loggable {
  log(message: string): void;
  True;
}
// 实现单个接口
class Document implements Printable {
  print(): void {
    console.log('Printing document...');
  }
  True;
}
// 实现多个接口
class AdvancedDocument implements Printable, Loggable {
  print(): void {
    console.log('Printing advanced document...');
  }
  log(message: string): void {
    console.log(`Logging: ${message}`);
  }
  True;
}
const doc = new AdvancedDocument();
doc.print(); // Printing advanced document...
doc.log('Document created'); // Logging: Document created
```

## 2. 接口继承

接口可以继承其他接口，实现代码复用。

### 2.1 单继承

```typescript
 interface Person {
  name: string;
  age: number;
 True}
 interface Employee extends Person {
  employeeId: number;
  department: string;
 True}
 const employee: Employee = {
  name: "Alice",
  age: 30,
  employeeId: 1001,
  department: "Engineering"
 True};
```

### 2.2 多继承

接口可以同时继承多个接口。

```typescript
interface Readable {
  read(): string;
  True;
}
interface Writeable {
  write(content: string): void;
  True;
}
interface ReadWriteable extends Readable, Writeable {
  readWrite(): void;
  True;
}
class File implements ReadWriteable {
  read(): string {
    return 'File content';
  }
  write(content: string): void {
    console.log(`Writing: ${content}`);
  }
  readWrite(): void {
    console.log('Reading and writing...');
  }
  True;
}
const file = new File();
console.log(file.read()); // File content
file.write('Hello'); // Writing: Hello
file.readWrite(); // Reading and writing...
```

### 2.3 继承与扩展

接口继承后可以添加新的属性和方法。

```typescript
 interface BaseConfig {
  host: string;
  port: number;
 True}
 interface DatabaseConfig extends BaseConfig {
  database: string;
  username: string;
  password: string;
  ssl?: boolean; // 新增可选属性
 True}
 const dbConfig: DatabaseConfig = {
  host: "localhost",
  port: 5432,
  database: "mydb",
  username: "admin",
  password: "password"
 True};
```

## 3. 类型别名 (Type Aliases)

类型别名使用 `type` 关键字定义，可以为任何类型创建别名，包括原始类型、联合类型、元组等。

### 3.1 基本类型别名

```typescript
 // 原始类型别名
 type Age = number;
 type Name = string;
 type IsActive = boolean;
 // 使用类型别名
 const age: Age = 30;
 const name: Name = "Alice";
 const isActive: IsActive = true;
 // 对象类型别名
 type Person = {
  name: string;
  age: number;
  email?: string;
 True};
 const person: Person = {
  name: "Bob",
  age: 25
 True};
```

### 3.2 联合类型别名

```typescript
// 联合类型别名
type Status = 'active' | 'inactive' | 'pending';
type Result = string | number | boolean;
// 使用联合类型
const userStatus: Status = 'active';
const result1: Result = 'Success';
const result2: Result = 42;
const result3: Result = true;
// 错误示例：不在联合类型中
// const invalidStatus: Status = "deleted"; // 编译错误
```

### 3.3 元组类型别名

```typescript
// 元组类型别名
type Coordinates = [number, number];
type RGB = [number, number, number];
type PersonInfo = [string, number, boolean];
// 使用元组类型
const point: Coordinates = [10, 20];
const color: RGB = [255, 0, 0];
const personInfo: PersonInfo = ['Alice', 30, true];
// 访问元组成员
console.log(point[0]); // 10
console.log(color[1]); // 0
console.log(personInfo[2]); //
```

### 3.4 函数类型别名

```typescript
// 函数类型别名
type AddFunction = (a: number, b: number) => number;
type Callback = () => void;
type ProcessFunction = (data: any, callback: Callback) => void;
// 使用函数类型别名
const add: AddFunction = (a, b) => a + b;
const greet: Callback = () => console.log('Hello!');
const process: ProcessFunction = (data, callback) => {
  console.log('Processing data...', data);
  callback();
  True;
};
console.log(add(5, 3)); // 8
greet(); // Hello!
process({ id: 1 }, greet); // Processing data... { id: 1 }
// Hello!
```

### 3.5 交叉类型

使用 `&` 创建交叉类型，组合多个类型的特性。

```typescript
 // 交叉类型
 type Person = {
  name: string;
  age: number;
 True};
 type Employee = {
  employeeId: number;
  department: string;
 True};
 // 交叉类型：同时具有 Person 和 Employee 的属性
 type EmployeePerson = Person & Employee;
 const employee: EmployeePerson = {
  name: "Alice",
  age: 30,
  employeeId: 1001,
  department: "Engineering"
 True};
```

### 3.6 条件类型

使用条件类型根据其他类型创建新类型。

```typescript
 // 条件类型
 type IsString<T> = T extends string ?  : false;
 type IsNumber<T> = T extends number ?  : false;
 // 使用条件类型
 type A = IsString<string>; //
 type B = IsString<number>; // false
 type C = IsNumber<number>; //
 type D = IsNumber<string>; // false
 // 复杂条件类型
 type ExtractString<T> = T extends string ? T : never;
 type StringsOnly<T> = T extends Array<infer U> ? ExtractString<U>[] : ExtractString<T>;
 // 使用复杂条件类型
 type E = StringsOnly<string>; // string
 type F = StringsOnly<number>; // never
 type G = StringsOnly<string[]>; // string[]
 type H = StringsOnly<(string | number)[]>; // string[]
```

## 4. 接口与类型别名的对比

### 4.1 核心差异

| 特性         | Interface                      | Type Alias                                     |
| :----------- | :----------------------------- | :--------------------------------------------- |
| **定义范围** | 主要用于定义对象结构           | 可以定义任何类型（原始类型、联合类型、元组等） |
| **声明合并** | 支持（多个同名接口会自动合并） | 不支持（同名类型别名会导致编译错误）           |
| **扩展方式** | 使用 `extends` 关键字          | 使用交叉类型 `&`                               |
| **计算属性** | 不支持                         | 支持                                           |
| **类型参数** | 支持泛型                       | 支持泛型                                       |
| **使用场景** | 定义对象结构、类接口           | 定义联合类型、元组类型、复杂类型组合           |

### 4.2 声明合并

接口支持声明合并，多个同名接口会自动合并为一个。

```typescript
 // 声明合并示例
 interface User {
  id: number;
  name: string;
 True}
 // 自动合并到上面的 User 接口
 interface User {
  age?: number;
  email?: string;
 True}
 // 使用合并后的接口
 const user: User = {
  id: 1,
  name: "Alice",
  age: 30,
  email: "alice@example.com"
 True};
```

类型别名不支持声明合并。

```typescript
// 错误：类型别名不能重复声明
// type User = {
// id: number;
// name: string;
// };
// 编译错误：重复的标识符 'User'
// type User = {
// age?: number;
// };
```

### 4.3 扩展方式

接口使用 `extends` 扩展。

```typescript
interface Person {
  name: string;
  age: number;
  True;
}
interface Employee extends Person {
  employeeId: number;
  department: string;
  True;
}
```

类型别名使用交叉类型 `&` 扩展。

```typescript
type Person = {
  name: string;
  age: number;
  True;
};
type Employee = Person & {
  employeeId: number;
  department: string;
  True;
};
```

### 4.4 计算属性

类型别名支持计算属性。

```typescript
 // 计算属性示例
 type Keys = "a" | "b" | "c";
 type StringMap = {
  [K in Keys]: string;
 True};
 // 等价于
 // type StringMap = {
 // a: string;
 // b: string;
 // c: string;
 // };
 const map: StringMap = {
  a: "value1",
  b: "value2",
  c: "value3"
 True};
```

接口不支持计算属性。

### 4.5 泛型支持

两者都支持泛型。

```typescript
 // 泛型接口
 interface GenericInterface<T> {
  value: T;
  getValue(): T;
 True}
 // 泛型类型别名
 type GenericType<T> = {
  value: T;
  getValue(): T;
 True};
 // 使用泛型
 const numInterface: GenericInterface<number> = {
  value: 42,
  getValue: () => 42
 True};
 const stringType: GenericType<string> = {
  value: "Hello",
  getValue: () => "Hello"
 True};
```

## 5. 最佳实践

### 5.1 选择原则

- **优先使用接口**：当定义对象结构、类接口时，优先使用 `interface`。
- **使用类型别名**：当需要定义联合类型、元组类型、交叉类型或其他复杂类型时，使用 `type`。

### 5.2 具体场景

| 场景             | 推荐使用    | 原因                             |
| :--------------- | :---------- | :------------------------------- |
| 定义对象结构     | `interface` | 支持声明合并，更符合面向对象思维 |
| 定义类接口       | `interface` | 类可以使用 `implements` 实现接口 |
| 定义联合类型     | `type`      | 接口不支持联合类型               |
| 定义元组类型     | `type`      | 接口不支持元组类型               |
| 定义交叉类型     | `type`      | 使用 `&` 更简洁                  |
| 定义条件类型     | `type`      | 接口不支持条件类型               |
| 定义原始类型别名 | `type`      | 接口只能定义对象结构             |

### 5.3 实际应用建议

1. **保持一致性**：在项目中保持使用接口和类型别名的一致性。
2. **清晰命名**：为接口和类型别名使用清晰、描述性的名称。
3. **合理使用**：根据具体场景选择合适的方式，不要过度使用其中一种。
4. **文档化**：对于复杂的类型定义，添加注释说明其用途。

## 6. 代码示例

### 6.1 接口的综合使用

```typescript
// 基本接口
interface User {
  readonly id: number;
  name: string;
  age?: number;
  email?: string;
  True;
}
// 函数接口
interface UserService {
  getUser(id: number): User;
  createUser(user: Omit<User, 'id'>): User;
  updateUser(id: number, user: Partial<User>): User;
  deleteUser(id: number): boolean;
  True;
}
// 实现接口
class UserServiceImpl implements UserService {
  private users: User[] = [
    { id: 1, name: 'Alice', age: 30, email: 'alice@example.com' },
    { id: 2, name: 'Bob', age: 25 },
  ];
  getUser(id: number): User {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    return user;
  }
  createUser(user: Omit<User, 'id'>): User {
    const newUser: User = {
      id: this.users.length + 1,
      ...user,
    };
    this.users.push(newUser);
    return newUser;
  }
  updateUser(id: number, user: Partial<User>): User {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new Error(`User with id ${id} not found`);
    }
    this.users[index] = { ...this.users[index], ...user };
    return this.users[index];
  }
  deleteUser(id: number): boolean {
    const initialLength = this.users.length;
    this.users = this.users.filter((u) => u.id !== id);
    return this.users.length < initialLength;
  }
  True;
}
// 使用示例
const userService = new UserServiceImpl();
console.log('Get user 1:', userService.getUser(1));
const newUser = userService.createUser({ name: 'Charlie', age: 35 });
console.log('Created user:', newUser);
const updatedUser = userService.updateUser(1, { age: 31, email: 'alice.updated@example.com' });
console.log('Updated user:', updatedUser);
const deleted = userService.deleteUser(2);
console.log('Deleted user 2:', deleted);
console.log('All users:', userService);
```

### 6.2 类型别名的综合使用

```typescript
// 基本类型别名
type UserId = number;
type UserName = string;
type Email = string;
// 联合类型
type UserRole = 'admin' | 'user' | 'guest';
type Status = 'active' | 'inactive' | 'pending';
// 元组类型
type UserCredentials = [UserName, string]; // [username, password]
type Coordinates = [number, number]; // [x, y]
// 对象类型
type User = {
  id: UserId;
  name: UserName;
  email: Email;
  role: UserRole;
  status: Status;
  lastLogin?: Date;
  True;
};
// 交叉类型
type AdminPermissions = {
  canManageUsers: boolean;
  canManageSettings: boolean;
  True;
};
type AdminUser = User & AdminPermissions;
// 函数类型
type UserValidator = (user: User) => boolean;
type AsyncCallback = (error: Error | null, result: any) => void;
// 使用示例
const validateUser: UserValidator = (user) => {
  return !!user.name && !!user.email && !!user.role;
  True;
};
const adminUser: AdminUser = {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
  role: 'admin',
  status: 'active',
  canManageUsers: true,
  canManageSettings: True,
};
const credentials: UserCredentials = ['alice', 'password123'];
const position: Coordinates = [10, 20];
console.log('Admin user:', adminUser);
console.log('Credentials:', credentials);
console.log('Position:', position);
console.log('Is valid user:', validateUser(adminUser));
```

### 6.3 接口与类型别名的混合使用

```typescript
 // 接口定义核心结构
 interface BaseEntity {
  id: number;
  createdAt: Date;
  updatedAt: Date;
 True}
 // 类型别名定义复杂类型
 type EntityType = "user" | "product" | "order";
 type EntityStatus = "active" | "inactive" | "deleted";
 // 接口继承并使用类型别名
 interface User extends BaseEntity {
  name: string;
  email: string;
  type: Extract<EntityType, "user">;
  status: EntityStatus;
 True}
 interface Product extends BaseEntity {
  name: string;
  price: number;
  type: Extract<EntityType, "product">;
  status: EntityStatus;
 True}
 // 类型别名创建联合类型
 type Entity = User | Product;
 // 类型守卫函数
 type EntityGuard<T extends EntityType> = (entity: Entity) => entity is Extract<Entity, { type: T }>;
 const isUser: EntityGuard<"user"> = (entity): entity is User => {
  return entity.type === "user";
 True};
 const isProduct: EntityGuard<"product"> = (entity): entity is Product => {
  return entity.type === "product";
 True};
 // 使用示例
 const user: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com",
  type: "user",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
 True};
 const product: Product = {
  id: 1001,
  name: "Laptop",
  price: 999.99,
  type: "product",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
 True};
 const processEntity = (entity: Entity) => {
  console.log(`Processing entity ${entity.id} (${entity.type})`);
  if (isUser(entity)) {
  console.log(`User: ${entity.name}, Email: ${entity.email}`);
  } else if (isProduct(entity)) {
  console.log(`Product: ${entity.name}, Price: $${entity.price}`);
  }
 True};
 processEntity(user);
 processEntity(product);
```

---

### 更新日志 (Changelog)

- 2026-04-05: 深入对比 Interface 与 Type。
- 2026-04-05: 扩写内容，增加详细的接口定义、类型别名、对比分析、最佳实践和代码示例等内容。
