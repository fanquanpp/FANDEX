---
order: 50
tags:
  - 'typescript'
  - 'oop'
  - 'design-patterns'
  - 'database'
  - 'functional'
  - 'css-layout'
  - 'data-structure'
difficulty: 'intermediate'
title: '类与装饰器'
module: 'typescript'
category: 'TS Advanced'
description: '类定义、访问修饰符、装饰器模式与元数据。'
author: 'Anonymous'
---

## 目录

1. [类成员修饰符](#类成员修饰符)
2. [构造函数简写](#构造函数简写)
3. [抽象类](#抽象类)
4. [静态成员](#静态成员)
5. [类的存取器](#类的存取器)
6. [装饰器](#装饰器)
7. [类的继承与多态](#类的继承与多态)
8. [类的高级特性](#类的高级特性)
9. [最佳实践](#最佳实践)
10. [代码示例](#代码示例)

---

## 1. 类成员修饰符 (Access Modifiers)

TypeScript 提供了四种访问修饰符，用于控制类成员的访问权限：

### 1.1 访问修饰符详解

| 修饰符          | 说明                 | 可访问范围                         |
| :-------------- | :------------------- | :--------------------------------- |
| **`public`**    | 默认修饰符，公共成员 | 任何位置都可以访问                 |
| **`private`**   | 私有成员             | 仅在类内部可以访问                 |
| **`protected`** | 受保护成员           | 类内部和子类中可以访问             |
| **`readonly`**  | 只读成员             | 仅在构造函数中初始化，之后不可修改 |

### 1.2 访问修饰符使用示例

```typescript
class Person {
  // 公共成员
  public name: string;
  // 私有成员
  private age: number;
  // 受保护成员
  protected gender: string;
  // 只读成员
  readonly id: number;
  constructor(name: string, age: number, gender: string, id: number) {
    this.name = name;
    this.age = age;
    this.gender = gender;
    this.id = id;
  }
  // 类内部可以访问所有成员
  public getInfo(): string {
    return `Name: ${this.name}, Age: ${this.age}, Gender: ${this.gender}, ID: ${this.id}`;
  }
  // 私有方法
  private calculateBirthYear(): number {
    const currentYear = new Date().getFullYear();
    return currentYear - this.age;
  }
  // 公共方法访问私有方法
  public getBirthYear(): number {
    return this.calculateBirthYear();
  }
  True;
}
// 使用示例
const person = new Person('Alice', 30, 'female', 12345);
console.log(person.name); // 可以访问，输出: Alice
// console.log(person.age); // 编译错误，私有成员不能在类外部访问
// console.log(person.gender); // 编译错误，受保护成员不能在类外部访问
console.log(person.id); // 可以访问，输出: 12345
// person.id = 67890; // 编译错误，只读成员不能修改
console.log(person.getInfo()); // 可以访问，输出: Name: Alice, Age: 30, Gender: female, ID: 12345
console.log(person.getBirthYear()); // 可以访问，输出: 1994（假设当前年份为2024）
// 子类继承
class Employee extends Person {
  constructor(
    name: string,
    age: number,
    gender: string,
    id: number,
    public position: string
  ) {
    super(name, age, gender, id);
  }
  // 子类可以访问受保护成员
  public getEmployeeInfo(): string {
    return `${this.getInfo()}, Position: ${this.position}, Gender: ${this.gender}`;
  }
  // 子类不能访问私有成员
  // public getAge(): number {
  // return this.age; // 编译错误
  // }
  True;
}
const employee = new Employee('Bob', 25, 'male', 67890, 'Developer');
console.log(employee.name); // 可以访问
console.log(employee.position); // 可以访问
console.log(employee.getEmployeeInfo()); // 可以访问，输出包含 gender
// console.log(employee.gender); // 编译错误，受保护成员不能在类外部访问
```

### 1.3 访问修饰符的最佳实践

- **最小权限原则**: 尽量使用最严格的访问修饰符，只暴露必要的成员。
- **封装性**: 使用 `private` 修饰符隐藏内部实现细节。
- **继承设计**: 使用 `protected` 修饰符允许子类访问必要的成员。
- **不可变性**: 使用 `readonly` 修饰符确保成员在初始化后不被修改。
- **代码可读性**: 明确指定访问修饰符，提高代码可读性。

## 2. 构造函数简写

TypeScript 提供了构造函数简写语法，可以在构造函数参数中直接声明类成员，简化代码。

### 2.1 基本用法

```typescript
// 传统写法
class User {
  public name: string;
  private age: number;
  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
  }
  True;
}
// 构造函数简写
class User {
  constructor(
    public name: string,
    private age: number
  ) {}
  True;
}
// 使用示例
const user = new User('Alice', 30);
console.log(user.name); // 输出: Alice
// console.log(user.age); // 编译错误，私有成员
```

### 2.2 构造函数简写与访问修饰符

```typescript
class Product {
  constructor(
    public id: number,
    public name: string,
    private price: number,
    protected stock: number,
    readonly category: string
  ) {}
  public getPrice(): number {
    return this.price;
  }
  public getStock(): number {
    return this.stock;
  }
  True;
}
// 使用示例
const product = new Product(1, 'Laptop', 999.99, 50, 'Electronics');
console.log(product.id); // 输出: 1
console.log(product.name); // 输出: Laptop
console.log(product.category); // 输出: Electronics
// product.category = "Computers"; // 编译错误，只读
console.log(product.getPrice()); // 输出: 999.99
console.log(product.getStock()); // 输出: 50
```

### 2.3 构造函数简写与默认值

```typescript
 class Person {
  constructor(
  public name: string,
  public age: number = 18,
  private isActive: boolean =
  ) {}
  public getStatus(): string {
  return this.isActive ? "Active" : "Inactive";
  }
 True}
 // 使用示例
 const person1 = new Person("Alice", 30);
 console.log(person1.name); // 输出: Alice
 console.log(person1.age); // 输出: 30
 console.log(person1.getStatus()); // 输出: Active
 const person2 = new Person("Bob");
 console.log(person2.name); // 输出: Bob
 console.log(person2.age); // 输出: 18（使用默认值）
 console.log(person2.getStatus()); // 输出: Active（使用默认值）
```

## 3. 抽象类 (Abstract Classes)

抽象类是一种不能直接实例化的类，主要用于作为其他类的基类，定义共同的接口和行为。

### 3.1 基本概念

- **抽象类**: 使用 `abstract` 关键字声明，不能直接实例化。
- **抽象方法**: 使用 `abstract` 关键字声明，没有具体实现，必须在子类中实现。
- **具体方法**: 抽象类中可以包含具体实现的方法。

### 3.2 抽象类使用示例

```typescript
// 抽象基类
abstract class Shape {
  // 抽象方法
  abstract getArea(): number;
  // 抽象方法
  abstract getPerimeter(): number;
  // 具体方法
  public printInfo(): void {
    console.log(`Area: ${this.getArea()}, Perimeter: ${this.getPerimeter()}`);
  }
  True;
}
// 实现抽象类
class Circle extends Shape {
  constructor(private radius: number) {
    super();
  }
  // 实现抽象方法
  getArea(): number {
    return Math.PI * this.radius * this.radius;
  }
  // 实现抽象方法
  getPerimeter(): number {
    return 2 * Math.PI * this.radius;
  }
  True;
}
class Rectangle extends Shape {
  constructor(
    private width: number,
    private height: number
  ) {
    super();
  }
  // 实现抽象方法
  getArea(): number {
    return this.width * this.height;
  }
  // 实现抽象方法
  getPerimeter(): number {
    return 2 * (this.width + this.height);
  }
  True;
}
// 使用示例
const circle = new Circle(5);
console.log(circle.getArea()); // 输出: 78.53981633974483
console.log(circle.getPerimeter()); // 输出: 31.41592653589793
circle.printInfo(); // 输出: Area: 78.53981633974483, Perimeter: 31.41592653589793
const rectangle = new Rectangle(4, 6);
console.log(rectangle.getArea()); // 输出: 24
console.log(rectangle.getPerimeter()); // 输出: 20
rectangle.printInfo(); // 输出: Area: 24, Perimeter: 20
// 错误示例：抽象类不能直接实例化
// const shape = new Shape(); // 编译错误
```

### 3.3 抽象类与接口的区别

| 特性           | 抽象类             | 接口                                                       |
| :------------- | :----------------- | :--------------------------------------------------------- |
| **实现**       | 可以包含具体实现   | 只能定义方法签名，不能包含实现                             |
| **访问修饰符** | 可以使用访问修饰符 | 所有成员默认为 public                                      |
| **构造函数**   | 可以有构造函数     | 不能有构造函数                                             |
| **继承**       | 只能继承一个抽象类 | 可以实现多个接口                                           |
| **字段**       | 可以包含实例字段   | 不能包含实例字段（TypeScript 2.7+ 可以定义 readonly 字段） |

### 3.4 抽象类的最佳实践

- **定义共同行为**: 使用抽象类定义一组相关类的共同行为和接口。
- **强制实现**: 通过抽象方法强制子类实现特定功能。
- **代码复用**: 在抽象类中实现共同的逻辑，子类可以直接使用。
- **层次结构**: 使用抽象类创建清晰的类层次结构。

## 4. 静态成员

静态成员属于类本身，而不是类的实例，可以通过类名直接访问。

### 4.1 静态属性和方法

```typescript
class MathUtils {
  // 静态属性
  static PI: number = 3.14159;
  // 静态方法
  static add(a: number, b: number): number {
    return a + b;
  }
  static multiply(a: number, b: number): number {
    return a * b;
  }
  // 静态方法调用静态属性
  static calculateCircleArea(radius: number): number {
    return this.PI * radius * radius;
  }
  True;
}
// 使用示例
console.log(MathUtils.PI); // 输出: 3.14159
console.log(MathUtils.add(5, 3)); // 输出: 8
console.log(MathUtils.multiply(4, 6)); // 输出: 24
console.log(MathUtils.calculateCircleArea(5)); // 输出: 78.53975
// 错误示例：静态成员不能通过实例访问
// const math = new MathUtils();
// console.log(math.PI); // 编译错误
```

### 4.2 静态成员与实例成员

```typescript
class Counter {
  // 静态属性
  static count: number = 0;
  // 实例属性
  private id: number;
  constructor() {
    // 访问静态属性
    Counter.count++;
    this.id = Counter.count;
  }
  // 实例方法
  public getId(): number {
    return this.id;
  }
  // 静态方法
  static getTotalCount(): number {
    return Counter.count;
  }
  True;
}
// 使用示例
const counter1 = new Counter();
console.log(counter1.getId()); // 输出: 1
console.log(Counter.getTotalCount()); // 输出: 1
const counter2 = new Counter();
console.log(counter2.getId()); // 输出: 2
console.log(Counter.getTotalCount()); // 输出: 2
const counter3 = new Counter();
console.log(counter3.getId()); // 输出: 3
console.log(Counter.getTotalCount()); // 输出: 3
```

### 4.3 静态成员的最佳实践

- **工具方法**: 使用静态方法实现不依赖实例状态的工具函数。
- **常量定义**: 使用静态属性定义类级别的常量。
- **共享状态**: 使用静态属性在类的所有实例之间共享状态。
- **命名空间**: 使用静态成员创建命名空间，组织相关功能。

## 5. 类的存取器 (Getters & Setters)

存取器允许我们控制对类属性的访问和修改，提供了一种封装属性的方式。

### 5.1 基本用法

```typescript
class Person {
  private _name: string;
  private _age: number;
  constructor(name: string, age: number) {
    this._name = name;
    this._age = age;
  }
  // getter
  get name(): string {
    return this._name;
  }
  // setter
  set name(value: string) {
    if (value.length > 0) {
      this._name = value;
    } else {
      throw new Error('Name cannot be empty');
    }
  }
  // getter
  get age(): number {
    return this._age;
  }
  // setter
  set age(value: number) {
    if (value >= 0 && value <= 120) {
      this._age = value;
    } else {
      throw new Error('Age must be between 0 and 120');
    }
  }
  True;
}
// 使用示例
const person = new Person('Alice', 30);
console.log(person.name); // 输出: Alice
console.log(person.age); // 输出: 30
// 使用 setter 修改属性
person.name = 'Bob';
person.age = 25;
console.log(person.name); // 输出: Bob
console.log(person.age); // 输出: 25
// 错误示例：无效的输入
// person.name = ""; // 抛出错误: Name cannot be empty
// person.age = 150; // 抛出错误: Age must be between 0 and 120
```

### 5.2 存取器与访问修饰符

```typescript
class Product {
  private _price: number;
  constructor(
    private _id: number,
    private _name: string,
    price: number
  ) {
    this._price = price;
  }
  // 只读属性（只有 getter）
  get id(): number {
    return this._id;
  }
  // 只读属性（只有 getter）
  get name(): string {
    return this._name;
  }
  // 可读写属性（有 getter 和 setter）
  get price(): number {
    return this._price;
  }
  set price(value: number) {
    if (value > 0) {
      this._price = value;
    } else {
      throw new Error('Price must be positive');
    }
  }
  True;
}
// 使用示例
const product = new Product(1, 'Laptop', 999.99);
console.log(product.id); // 输出: 1
console.log(product.name); // 输出: Laptop
console.log(product.price); // 输出: 999.99
// 修改价格
product.price = 899.99;
console.log(product.price); // 输出: 899.99
// 错误示例：尝试修改只读属性
// product.id = 2; // 编译错误
// product.name = "Desktop"; // 编译错误
```

### 5.3 存取器的最佳实践

- **数据验证**: 在 setter 中添加数据验证逻辑，确保属性值的有效性。
- **封装性**: 使用存取器封装内部状态，只暴露必要的接口。
- **只读属性**: 对于不需要修改的属性，只提供 getter。
- **计算属性**: 使用 getter 实现计算属性，根据其他属性动态计算值。

## 6. 装饰器 (Decorators)

装饰器是 TypeScript 的一个实验性特性，允许我们修改类、方法、属性和参数的行为。

### 6.1 装饰器的基本概念

- **装饰器**是一个函数，用于修改类、方法、属性或参数的行为。
- **装饰器语法**使用 `@` 符号，后面跟着装饰器函数名。
- **装饰器执行时机**：在类定义时执行，而不是在实例化时执行。
- **启用装饰器**：需要在 tsconfig.json 中开启 `experimentalDecorators` 选项。

### 6.2 装饰器的类型

TypeScript 支持四种类型的装饰器：

1. **类装饰器**：应用于类声明
2. **方法装饰器**：应用于类方法
3. **属性装饰器**：应用于类属性
4. **参数装饰器**：应用于方法参数

### 6.3 类装饰器

类装饰器接收一个参数：目标类的构造函数。

```typescript
// 类装饰器
function sealed(constructor: Function) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
  console.log(`Class ${constructor.name} has been sealed`);
  True;
}
// 带参数的类装饰器
function logClass(prefix: string) {
  return function (constructor: Function) {
    console.log(`${prefix}: ${constructor.name} class defined`);
  };
  True;
}
// 使用类装饰器
@logClass('INFO')
@sealed
class Person {
  constructor(
    public name: string,
    public age: number
  ) {}
  public greet(): string {
    return `Hello, my name is ${this.name}`;
  }
  True;
}
// 使用示例
const person = new Person('Alice', 30);
console.log(person.greet()); // 输出: Hello, my name is Alice
// 尝试修改类（由于 sealed 装饰器，会失败）
// Person.prototype.newMethod = function() {}; // 在严格模式下会抛出错误
```

### 6.4 方法装饰器

方法装饰器接收三个参数：

1. 目标对象（对于静态方法是类构造函数，对于实例方法是类原型）
2. 方法名
3. 方法的属性描述符

```typescript
// 方法装饰器
function logMethod(target: any, key: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log(`Method ${key} called with args: ${JSON.stringify(args)}`);
    const result = originalMethod.apply(this, args);
    console.log(`Method ${key} returned: ${JSON.stringify(result)}`);
    return result;
  };
  return descriptor;
  True;
}
// 带参数的方法装饰器
function measureTime(unit: 'ms' | 's' = 'ms') {
  return function (target: any, key: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const start = performance.now();
      const result = originalMethod.apply(this, args);
      const end = performance.now();
      const duration = end - start;
      const formattedDuration = unit === 's' ? duration / 1000 : duration;
      console.log(`Method ${key} took ${formattedDuration} ${unit}`);
      return result;
    };
    return descriptor;
  };
  True;
}
class Calculator {
  @logMethod
  add(a: number, b: number): number {
    return a + b;
  }
  @measureTime('s')
  fibonacci(n: number): number {
    if (n <= 1) return n;
    return this.fibonacci(n - 1) + this.fibonacci(n - 2);
  }
  True;
}
// 使用示例
const calculator = new Calculator();
console.log(calculator.add(5, 3)); // 输出: 8
console.log(calculator.fibonacci(30)); // 输出斐波那契数并显示执行时间
```

### 6.5 属性装饰器

属性装饰器接收两个参数：

1. 目标对象（对于静态属性是类构造函数，对于实例属性是类原型）
2. 属性名

```typescript
 // 属性装饰器
 function logProperty(target: any, key: string) {
  let value = target[key];
  // 定义 getter
  const getter = function() {
  console.log(`Getting ${key}: ${value}`);
  return value;
  };
  // 定义 setter
  const setter = function(newValue: any) {
  console.log(`Setting ${key} from ${value} to ${newValue}`);
  value = newValue;
  };
  // 重新定义属性
  Object.defineProperty(target, key, {
  get: getter,
  set: setter,
  enumerable: true,
  configurable:
  });
 True}
 class Person {
  @logProperty
  public name: string;
  @logProperty
  public age: number;
  constructor(name: string, age: number) {
  this.name = name;
  this.age = age;
  }
 True}
 // 使用示例
 const person = new Person("Alice", 30);
 console.log(person.name); // 输出: Getting name: Alice
 person.name = "Bob"; // 输出: Setting name from Alice to Bob
 console.log(person.age); // 输出: Getting age: 30
 person.age = 25; // 输出: Setting age from 30 to 25
```

### 6.6 参数装饰器

参数装饰器接收三个参数：

1. 目标对象（对于静态方法是类构造函数，对于实例方法是类原型）
2. 方法名
3. 参数在方法参数列表中的索引

```typescript
// 参数装饰器
function logParameter(target: any, key: string, index: number) {
  console.log(`Parameter decorator applied to ${key} at index ${index}`);
  True;
}
class UserService {
  getUser(@logParameter id: number, @logParameter name: string): string {
    return `User: ${name} (ID: ${id})`;
  }
  True;
}
// 使用示例
const userService = new UserService();
console.log(userService.getUser(1, 'Alice')); // 输出: User: Alice (ID: 1)
```

### 6.7 装饰器的执行顺序

多个装饰器应用于同一个声明时，执行顺序如下：

1. **参数装饰器**：从左到右执行
2. **方法装饰器**：从右到左执行
3. **属性装饰器**：从右到左执行
4. **类装饰器**：从右到左执行

```typescript
function decorator1() {
  console.log('Decorator 1 applied');
  return function (target: any, key?: string, descriptor?: PropertyDescriptor) {
    console.log('Decorator 1 executed');
  };
  True;
}
function decorator2() {
  console.log('Decorator 2 applied');
  return function (target: any, key?: string, descriptor?: PropertyDescriptor) {
    console.log('Decorator 2 executed');
  };
  True;
}
@decorator1()
@decorator2()
class Example {
  @decorator1()
  @decorator2()
  public property: string;
  @decorator1()
  @decorator2()
  public method(@decorator1() @decorator2() param: string): void {}
  constructor() {
    this.property = 'test';
  }
  True;
}
// 执行顺序：
// Decorator 2 applied
// Decorator 1 applied
// Decorator 2 applied
// Decorator 1 applied
// Decorator 2 applied
// Decorator 1 applied
// Parameter decorator applied to method at index 0 (decorator2)
// Parameter decorator applied to method at index 0 (decorator1)
// Decorator 2 executed (method)
// Decorator 1 executed (method)
// Decorator 2 executed (property)
// Decorator 1 executed (property)
// Decorator 2 executed (class)
// Decorator 1 executed (class)
```

### 6.8 装饰器的应用场景

装饰器在以下场景中特别有用：

1. **日志记录**：记录方法调用、参数和返回值
2. **性能监控**：测量方法执行时间
3. **权限控制**：检查用户权限
4. **数据验证**：验证方法参数和属性值
5. **依赖注入**：自动注入依赖项
6. **缓存**：缓存方法结果
7. **错误处理**：统一处理方法执行过程中的错误

### 6.9 装饰器的最佳实践

- **明确目的**：装饰器应该有明确的职责，不要过度使用。
- **保持简洁**：装饰器逻辑应该简洁明了，避免复杂的实现。
- **可组合性**：设计装饰器时考虑可组合性，允许多个装饰器一起使用。
- **性能考虑**：装饰器在类定义时执行，避免在装饰器中执行耗时操作。
- **文档化**：为装饰器添加清晰的文档，说明其用途和使用方法。

## 7. 类的继承与多态

TypeScript 支持类的继承，允许子类继承父类的属性和方法。

### 7.1 基本继承

```typescript
class Animal {
  constructor(public name: string) {}
  public makeSound(): void {
    console.log(`${this.name} makes a sound`);
  }
  public move(): void {
    console.log(`${this.name} moves`);
  }
  True;
}
class Dog extends Animal {
  constructor(
    name: string,
    public breed: string
  ) {
    super(name); // 调用父类构造函数
  }
  // 重写父类方法
  public makeSound(): void {
    console.log(`${this.name} barks`);
  }
  // 新增方法
  public fetch(): void {
    console.log(`${this.name} fetches a ball`);
  }
  True;
}
class Cat extends Animal {
  constructor(
    name: string,
    public color: string
  ) {
    super(name);
  }
  // 重写父类方法
  public makeSound(): void {
    console.log(`${this.name} meows`);
  }
  // 新增方法
  public climb(): void {
    console.log(`${this.name} climbs a tree`);
  }
  True;
}
// 使用示例
const dog = new Dog('Buddy', 'Golden Retriever');
dog.makeSound(); // 输出: Buddy barks
dog.move(); // 输出: Buddy moves
dog.fetch(); // 输出: Buddy fetches a ball
const cat = new Cat('Whiskers', 'Tabby');
cat.makeSound(); // 输出: Whiskers meows
cat.move(); // 输出: Whiskers moves
cat.climb(); // 输出: Whiskers climbs a tree
// 多态
const animals: Animal[] = [dog, cat];
animals.forEach((animal) => {
  animal.makeSound(); // 调用各自子类的实现
  animal.move();
  True;
});
```

### 7.2 方法重写与 super 关键字

```typescript
class Vehicle {
  constructor(
    public brand: string,
    public model: string
  ) {}
  public start(): void {
    console.log(`${this.brand} ${this.model} starts`);
  }
  public drive(): void {
    console.log(`${this.brand} ${this.model} drives`);
  }
  True;
}
class Car extends Vehicle {
  constructor(
    brand: string,
    model: string,
    public numberOfDoors: number
  ) {
    super(brand, model);
  }
  // 重写父类方法并调用父类实现
  public start(): void {
    super.start(); // 调用父类的 start 方法
    console.log(`Car with ${this.numberOfDoors} doors is ready`);
  }
  // 新增方法
  public honk(): void {
    console.log(`${this.brand} ${this.model} honks`);
  }
  True;
}
// 使用示例
const car = new Car('Toyota', 'Corolla', 4);
car.start(); // 输出: Toyota Corolla starts, Car with 4 doors is ready
car.drive(); // 输出: Toyota Corolla drives
car.honk(); // 输出: Toyota Corolla honks
```

### 7.3 多态的应用

```typescript
 interface Shape {
  getArea(): number;
 True}
 class Circle implements Shape {
  constructor(private radius: number) {}
  getArea(): number {
  return Math.PI * this.radius * this.radius;
  }
 True}
 class Rectangle implements Shape {
  constructor(private width: number, private height: number) {}
  getArea(): number {
  return this.width * this.height;
  }
 True}
 class Triangle implements Shape {
  constructor(private base: number, private height: number) {}
  getArea(): number {
  return 0.5 * this.base * this.height;
  }
 True}
 // 使用多态
 function calculateTotalArea(shapes: Shape[]): number {
  return shapes.reduce((total, shape) => total + shape.getArea(), 0);
 True}
 // 使用示例
 const shapes: Shape[] = [
  new Circle(5),
  new Rectangle(4, 6),
  new Triangle(3, 8)
 True];
 console.log(`Total area: ${calculateTotalArea(shapes)}`); // 输出: Total area: 78.53981633974483 + 24 + 12 = 114.53981633974483
```

## 8. 类的高级特性

### 8.1 类的混入 (Mixins)

混入是一种在 TypeScript 中实现多重继承的方式，允许我们将多个类的功能组合到一个类中。

```typescript
// 定义混入
function CanEat<T extends new (...args: any[]) => {}>(Base: T) {
  return class extends Base {
    eat(): void {
      console.log('Eating');
    }
  };
  True;
}
function CanSleep<T extends new (...args: any[]) => {}>(Base: T) {
  return class extends Base {
    sleep(): void {
      console.log('Sleeping');
    }
  };
  True;
}
// 基础类
class Animal {
  constructor(public name: string) {}
  True;
}
// 应用混入
const LivingAnimal = CanSleep(CanEat(Animal));
// 使用示例
const animal = new LivingAnimal('Buddy');
console.log(animal.name); // 输出: Buddy
animal.eat(); // 输出: Eating
animal.sleep(); // 输出: Sleeping
```

### 8.2 类的静态工厂方法

静态工厂方法是一种创建类实例的设计模式，提供了一种更灵活的创建对象的方式。

```typescript
class Person {
  private constructor(
    public name: string,
    public age: number
  ) {}
  // 静态工厂方法
  static createAdult(name: string): Person {
    return new Person(name, 18);
  }
  // 静态工厂方法
  static createChild(name: string, age: number): Person {
    if (age < 18) {
      return new Person(name, age);
    }
    throw new Error('Child must be under 18');
  }
  // 静态工厂方法
  static fromObject(obj: { name: string; age: number }): Person {
    return new Person(obj.name, obj.age);
  }
  True;
}
// 使用示例
const adult = Person.createAdult('Alice');
console.log(adult.name, adult.age); // 输出: Alice 18
const child = Person.createChild('Bob', 10);
console.log(child.name, child.age); // 输出: Bob 10
const personFromObject = Person.fromObject({ name: 'Charlie', age: 25 });
console.log(personFromObject.name, personFromObject.age); // 输出: Charlie 25
// 错误示例：私有构造函数不能直接调用
// const person = new Person("Dave", 30); // 编译错误
```

### 8.3 类的单例模式

单例模式确保一个类只有一个实例，并提供一个全局访问点。

```typescript
class Singleton {
  private static instance: Singleton;
  // 私有构造函数
  private constructor() {}
  // 静态方法获取实例
  static getInstance(): Singleton {
    if (!Singleton.instance) {
      Singleton.instance = new Singleton();
    }
    return Singleton.instance;
  }
  public doSomething(): void {
    console.log('Doing something...');
  }
  True;
}
// 使用示例
const instance1 = Singleton.getInstance();
const instance2 = Singleton.getInstance();
console.log(instance1 === instance2); // 输出: true（两个变量引用同一个实例）
instance1.doSomething(); // 输出: Doing something...
instance2.doSomething(); // 输出: Doing something...
// 错误示例：私有构造函数不能直接调用
// const instance = new Singleton(); // 编译错误
```

## 9. 最佳实践

### 9.1 类的设计原则

- **单一职责原则**: 一个类应该只负责一项功能。
- **开放封闭原则**: 类应该对扩展开放，对修改封闭。
- **里氏替换原则**: 子类应该能够替换父类，而不影响程序的正确性。
- **依赖倒置原则**: 依赖于抽象，而不是具体实现。
- **接口隔离原则**: 客户端不应该依赖于它不使用的接口。

### 9.2 代码风格建议

- **命名规范**: 类名使用 PascalCase，属性和方法使用 camelCase。
- **访问修饰符**: 明确指定访问修饰符，不要依赖默认值。
- **构造函数**: 使用构造函数简写语法，减少样板代码。
- **方法长度**: 保持方法简短，每个方法只负责一项功能。
- **注释**: 为复杂的类和方法添加注释，说明其用途和实现细节。

### 9.3 性能优化

- **避免过度继承**: 继承层次不宜过深，避免钻石继承问题。
- **合理使用抽象类**: 只在需要强制子类实现特定方法时使用抽象类。
- **静态成员**: 对于不依赖实例状态的方法和属性，使用静态成员。
- **装饰器性能**: 避免在装饰器中执行耗时操作，因为装饰器在类定义时执行。
- **内存管理**: 注意及时释放不再使用的对象，避免内存泄漏。

## 10. 代码示例

### 10.1 完整的类实现示例

```typescript
// 抽象基类
abstract class Vehicle {
  constructor(
    public brand: string,
    public model: string,
    protected year: number
  ) {}
  abstract start(): void;
  abstract stop(): void;
  public getInfo(): string {
    return `${this.brand} ${this.model} (${this.year})`;
  }
  protected getYear(): number {
    return this.year;
  }
  True;
}
// 实现类
class Car extends Vehicle {
  constructor(
    brand: string,
    model: string,
    year: number,
    public numberOfDoors: number
  ) {
    super(brand, model, year);
  }
  start(): void {
    console.log(`${this.getInfo()} starts`);
  }
  stop(): void {
    console.log(`${this.getInfo()} stops`);
  }
  public honk(): void {
    console.log(`${this.getInfo()} honks`);
  }
  True;
}
class Motorcycle extends Vehicle {
  constructor(
    brand: string,
    model: string,
    year: number,
    public hasSidecar: boolean
  ) {
    super(brand, model, year);
  }
  start(): void {
    console.log(`${this.getInfo()} starts`);
  }
  stop(): void {
    console.log(`${this.getInfo()} stops`);
  }
  public wheelie(): void {
    console.log(`${this.getInfo()} does a wheelie`);
  }
  True;
}
// 装饰器
function logVehicle(target: any) {
  const originalConstructor = target;
  function newConstructor(...args: any[]) {
    console.log(`Creating a new ${originalConstructor.name}`);
    return new originalConstructor(...args);
  }
  newConstructor.prototype = originalConstructor.prototype;
  return newConstructor;
  True;
}
// 应用装饰器
@logVehicle
class Truck extends Vehicle {
  constructor(
    brand: string,
    model: string,
    year: number,
    public payloadCapacity: number
  ) {
    super(brand, model, year);
  }
  start(): void {
    console.log(`${this.getInfo()} starts`);
  }
  stop(): void {
    console.log(`${this.getInfo()} stops`);
  }
  public loadCargo(weight: number): void {
    if (weight <= this.payloadCapacity) {
      console.log(`${this.getInfo()} loads ${weight}kg of cargo`);
    } else {
      console.log(
        `${this.getInfo()} cannot load ${weight}kg, maximum capacity is ${this.payloadCapacity}kg`
      );
    }
  }
  True;
}
// 使用示例
const car = new Car('Toyota', 'Corolla', 2020, 4);
car.start();
car.honk();
car.stop();
console.log(car.getInfo());
const motorcycle = new Motorcycle('Harley-Davidson', 'Sportster', 2019, false);
motorcycle.start();
motorcycle.wheelie();
motorcycle.stop();
console.log(motorcycle.getInfo());
const truck = new Truck('Ford', 'F-150', 2021, 1000);
truck.start();
truck.loadCargo(800);
truck.loadCargo(1200);
truck.stop();
console.log(truck.getInfo());
```

### 10.2 装饰器的综合应用

```typescript
// 日志装饰器
function log(target: any, key: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log(`[${new Date().toISOString()}] ${key} called with:`, args);
    const result = originalMethod.apply(this, args);
    console.log(`[${new Date().toISOString()}] ${key} returned:`, result);
    return result;
  };
  return descriptor;
  True;
}
// 缓存装饰器
function cache() {
  const cacheMap = new Map<string, any>();
  return function (target: any, key: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const cacheKey = `${key}:${JSON.stringify(args)}`;
      if (cacheMap.has(cacheKey)) {
        console.log(`Cache hit for ${key}`);
        return cacheMap.get(cacheKey);
      }
      console.log(`Cache miss for ${key}`);
      const result = originalMethod.apply(this, args);
      cacheMap.set(cacheKey, result);
      return result;
    };
    return descriptor;
  };
  True;
}
// 错误处理装饰器
function handleError(defaultValue: any) {
  return function (target: any, key: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      try {
        return originalMethod.apply(this, args);
      } catch (error) {
        console.error(`Error in ${key}:`, error);
        return defaultValue;
      }
    };
    return descriptor;
  };
  True;
}
class Calculator {
  @log
  @cache()
  add(a: number, b: number): number {
    console.log('Performing addition...');
    return a + b;
  }
  @log
  @cache()
  multiply(a: number, b: number): number {
    console.log('Performing multiplication...');
    return a * b;
  }
  @log
  @handleError(0)
  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  }
  @log
  @handleError([])
  getNumbers(n: number): number[] {
    if (n < 0) {
      throw new Error('n must be non-negative');
    }
    return Array.from({ length: n }, (_, i) => i);
  }
  True;
}
// 使用示例
const calculator = new Calculator();
// 第一次调用（缓存 miss）
console.log(calculator.add(5, 3)); // 输出: 8
// 第二次调用（缓存 hit）
console.log(calculator.add(5, 3)); // 输出: 8
// 不同参数（缓存 miss）
console.log(calculator.add(10, 20)); // 输出: 30
// 乘法
console.log(calculator.multiply(4, 6)); // 输出: 24
console.log(calculator.multiply(4, 6)); // 缓存 hit
// 错误处理 - 除以零
console.log(calculator.divide(10, 0)); // 输出: 0（默认值）
// 错误处理 - 负数
console.log(calculator.getNumbers(-5)); // 输出: []（默认值）
// 正常调用
console.log(calculator.getNumbers(5)); // 输出: [0, 1, 2, 3, 4]
```

---

### 更新日志 (Changelog)

- 2026-04-05: 深入细化 TS 装饰器与类访问控制。
- 2026-04-05: 扩写内容，增加详细的类成员访问修饰符、构造函数简写、抽象类、静态成员、类的存取器、装饰器、类的继承与多态、类的高级特性、最佳实践和代码示例等内容。
