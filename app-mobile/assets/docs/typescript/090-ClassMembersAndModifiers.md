---
order: 90
title: 类成员、修饰符与面向对象
module: 'typescript'
category: 前端技术
difficulty: beginner
description: TS 类的访问修饰符、构造函数简写、抽象类、静态成员、存取器、继承多态与混入等高级特性，装饰器已移至专篇。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：TypeScript 类（class）——面向对象在 TS 里的完整形态，是[类基础](/typescript/060-TSBasicsClasses)之后的进阶级。
- **解决什么问题**：控制类成员的可见性（public/private/protected/readonly）、减少构造样板（参数简写）、表达「不能实例化的基类」（抽象类）、组织类级别状态（静态成员）、给属性加验证入口（存取器）、复用行为（继承、混入、静态工厂、单例）。
- **什么时候用到**：写任何带状态的模型/服务/组件基类时；设计框架钩子与模板方法时（抽象类）；需要约束「只能通过工厂创建」时（私有构造函数）。装饰器已单列专篇（[装饰器详解](/typescript/270-DecoratorDetailed)），本篇不含装饰器内容；`this` 类型与多态深入见[This 类型与多态](/typescript/240-ThisTypePolymorphism)。

## 前置知识

- [TS 前篇 03：类基础](/typescript/060-TSBasicsClasses)：本篇的修饰符与继承建立在类基础之上

## 学习目标

- 掌握「1. 类成员修饰符 (Access Modifiers)」的核心机制、典型用法与常见陷阱
- 掌握「2. 构造函数简写」的核心机制、典型用法与常见陷阱
- 掌握「3. 抽象类 (Abstract Classes)」的核心机制、典型用法与常见陷阱
- 掌握「4. 静态成员」的核心机制、典型用法与常见陷阱
- 掌握「5. 类的存取器 (Getters & Setters)」的核心机制、典型用法与常见陷阱
- 掌握「6. 继承与多态」「7. 类的高级特性」的核心机制与典型用法

> 阅读提示：正文以代码和白话为主，不出现类型论公式。进阶文档中若出现 `Γ ⊢ e : τ` 这类记号，第一遍可完全跳过（完整规则见 `typescript/020-HowToReadThisCourse`）。

> 装饰器去哪了：本篇原为「类与装饰器」双主题，装饰器域已整体归并到[装饰器详解](/typescript/270-DecoratorDetailed)（执行顺序、装饰器工厂与综合应用见其 4.7 节，实验性装饰器速查见其附录 G）。

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
}
const employee = new Employee('Bob', 25, 'male', 67890, 'Developer');
console.log(employee.name); // 可以访问
console.log(employee.position); // 可以访问
console.log(employee.getEmployeeInfo()); // 可以访问，输出包含 gender
// console.log(employee.gender); // 编译错误，受保护成员不能在类外部访问
```

逐段拆解：

- `Person` 的四个字段覆盖了四种修饰符的组合场景：`name` 是对外契约，`age` 是纯内部状态，`gender` 是「子类需要、外部不需要」的典型（`Employee.getEmployeeInfo` 用到了它），`id` 是创建后不可变的标识。
- `calculateBirthYear` 是 `private` 方法：它只是 `getBirthYear` 的实现细节。写成 `public` 会让调用方依赖一个可能重构掉的函数——私有方法的本质是把「可以随意改名」的范围扩大。
- 易错点：`private` 是**编译期**约束，编译后的 JS 里字段照常可访问。需要运行时真私有（防止反射、防止属性名冲突）要用 ES 的 `#` 私有字段（见第 8 节速查的对比说明）。
- 易错点：`readonly` 只约束「赋值时机」，不等于深度不可变。`readonly list: number[]` 里的数组内容仍可 `push`——要深度不可变请用 `ReadonlyArray<T>` 或 `as const`。

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
}
// 构造函数简写
class User2 {
  constructor(
    public name: string,
    private age: number
  ) {}
}
// 使用示例
const user = new User2('Alice', 30);
console.log(user.name); // 输出: Alice
// console.log(user.age); // 编译错误，私有成员
```

为什么可以这样写：参数前带修饰符时，TypeScript 把它同时当成「字段声明 + 参数 + 构造函数内的赋值」三件事。换成普通参数（不带修饰符）则只是普通函数参数，`this.name` 会报「属性不存在」。

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
    private isActive: boolean = true
  ) {}
  public getStatus(): string {
    return this.isActive ? "Active" : "Inactive";
  }
}
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

接口与别名机制的完整展开见[接口与类型别名](/typescript/100-InterfaceTypeAlias)。

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

易错点：静态方法里的 `this` 指向**类本身**（`MathUtils.PI`），实例方法里的 `this` 指向实例。把 `calculateCircleArea` 改成实例方法后 `this.PI` 就找不到了——这是静态与实例混写时最常见的报错来源。

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

## 6. 类的继承与多态

TypeScript 支持类的继承，允许子类继承父类的属性和方法。

### 6.1 基本继承

```typescript
class Animal {
  constructor(public name: string) {}
  public makeSound(): void {
    console.log(`${this.name} makes a sound`);
  }
  public move(): void {
    console.log(`${this.name} moves`);
  }
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
});
```

### 6.2 方法重写与 super 关键字

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
}
// 使用示例
const car = new Car('Toyota', 'Corolla', 4);
car.start(); // 输出: Toyota Corolla starts, Car with 4 doors is ready
car.drive(); // 输出: Toyota Corolla drives
car.honk(); // 输出: Toyota Corolla honks
```

### 6.3 多态的应用

```typescript
interface Shape {
  getArea(): number;
}
class Circle implements Shape {
  constructor(private radius: number) {}
  getArea(): number {
    return Math.PI * this.radius * this.radius;
  }
}
class Rectangle implements Shape {
  constructor(
    private width: number,
    private height: number
  ) {}
  getArea(): number {
    return this.width * this.height;
  }
}
class Triangle implements Shape {
  constructor(
    private base: number,
    private height: number
  ) {}
  getArea(): number {
    return 0.5 * this.base * this.height;
  }
}
// 使用多态
function calculateTotalArea(shapes: Shape[]): number {
  return shapes.reduce((total, shape) => total + shape.getArea(), 0);
}
// 使用示例
const shapes: Shape[] = [new Circle(5), new Rectangle(4, 6), new Triangle(3, 8)];
console.log(`Total area: ${calculateTotalArea(shapes)}`); // 输出: Total area: 78.53981633974483 + 24 + 12 = 114.53981633974483
```

## 7. 类的高级特性

### 7.1 类的混入 (Mixins)

混入是一种在 TypeScript 中实现多重继承的方式，允许我们将多个类的功能组合到一个类中。

```typescript
// 定义混入
function CanEat<T extends new (...args: any[]) => {}>(Base: T) {
  return class extends Base {
    eat(): void {
      console.log('Eating');
    }
  };
}
function CanSleep<T extends new (...args: any[]) => {}>(Base: T) {
  return class extends Base {
    sleep(): void {
      console.log('Sleeping');
    }
  };
}
// 基础类
class Animal {
  constructor(public name: string) {}
}
// 应用混入
const LivingAnimal = CanSleep(CanEat(Animal));
// 使用示例
const animal = new LivingAnimal('Buddy');
console.log(animal.name); // 输出: Buddy
animal.eat(); // 输出: Eating
animal.sleep(); // 输出: Sleeping
```

泛型约束 `T extends new (...args: any[]) => {}` 是混入的关键：它限定「只能包构造函数」，保证 `class extends Base` 合法。

### 7.2 类的静态工厂方法

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

`private constructor` + 静态工厂的组合语义是：**构造入口只有我列出的这几个**，每个工厂方法名都表达了一种构造意图（成人/儿童/从对象还原），比单一构造函数 + 运行时分支更可读。

### 7.3 类的单例模式

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

## 8. 类速查附录

> 以下为类语法速查。`this` 类型与「类作为类型」两节与[This 类型与多态](/typescript/240-ThisTypePolymorphism)互为补充——那里讲 `this` 类型为什么能实现「返回子类实例」的多态 this，本节只给写法。

## 类定义

**换行写法：定义基本类**
`class <类名> {`
`    <属性>: <类型>`
`    <方法>(<参数>): <返回类型> { <语句> }`
`}`

```typescript
// 定义基本类
class User {
    name: string
    age: number

    greet(): string {
        return `Hello, ${this.name}`
    }
}
```

---

**基本写法：创建类实例**
`let <变量> = new <类名>(<参数>)`

```typescript
// 创建类实例
let user = new User()
```

---

## 构造函数

**换行写法：定义构造函数**
`class <类名> {`
`    constructor(<参数>: <类型>) { <语句> }`
`}`

```typescript
// 定义构造函数
class User {
    name: string

    constructor(name: string) {
        this.name = name
    }
}
```

---

**基本写法：构造函数参数简写**
`class <类名> {`
`    constructor(public <属性>: <类型>) {}`
`}`

```typescript
// 构造函数参数简写（自动创建属性）
class User {
    constructor(public name: string, public age: number) {}
}
```

---

## 属性修饰符

**换行写法：public 公有属性**
`class <类名> {`
`    public <属性>: <类型>`
`}`

```typescript
// public 公有属性（默认）
class User {
    public name: string = "Alice"
}
```

---

**换行写法：private 私有属性**
`class <类名> {`
`    private <属性>: <类型>`
`}`

```typescript
// private 私有属性
class User {
    private age: number = 30
}
```

---

**换行写法：protected 受保护属性**
`class <类名> {`
`    protected <属性>: <类型>`
`}`

```typescript
// protected 受保护属性
class User {
    protected id: number = 1
}
```

---

**换行写法：readonly 只读属性**
`class <类名> {`
`    readonly <属性>: <类型>`
`}`

```typescript
// readonly 只读属性
class User {
    readonly id: number

    constructor(id: number) {
        this.id = id
    }
}
```

---

**换行写法：static 静态属性**
`class <类名> {`
`    static <属性>: <类型>`
`}`

```typescript
// static 静态属性
class User {
    static count: number = 0
}
```

---

**基本写法：访问静态属性**
`<类名>.<静态属性>`

```typescript
// 访问静态属性
console.log(User.count)
```

---

## 方法

**换行写法：定义实例方法**
`class <类名> {`
`    <方法>(<参数>: <类型>): <返回类型> { <语句> }`
`}`

```typescript
// 定义实例方法
class User {
    greet(name: string): string {
        return `Hello, ${name}`
    }
}
```

---

**换行写法：定义静态方法**
`class <类名> {`
`    static <方法>(<参数>: <类型>): <返回类型> { <语句> }`
`}`

```typescript
// 定义静态方法
class User {
    static create(name: string): User {
        return new User(name)
    }
}
```

---

**换行写法：定义 getter**
`class <类名> {`
`    get <属性>(): <类型> { <语句> }`
`}`

```typescript
// 定义 getter
class User {
    private _name: string = ""

    get name(): string {
        return this._name
    }
}
```

---

**换行写法：定义 setter**
`class <类名> {`
`    set <属性>(<值>: <类型>) { <语句> }`
`}`

```typescript
// 定义 setter
class User {
    private _name: string = ""

    set name(value: string) {
        this._name = value
    }
}
```

---

## 继承

**换行写法：类继承**
`class <子类> extends <父类> {`
`    constructor(<参数>) { super(<参数>) }`
`}`

```typescript
// 类继承
class Animal {
    constructor(public name: string) {}
}

class Dog extends Animal {
    constructor(name: string, public breed: string) {
        super(name)
    }
}
```

---

**换行写法：方法重写**
`class <子类> extends <父类> {`
`    <方法>(<参数>): <返回类型> { <新语句> }`
`}`

```typescript
// 方法重写
class Animal {
    speak(): string {
        return "sound"
    }
}

class Dog extends Animal {
    speak(): string {
        return "Woof!"
    }
}
```

---

**基本写法：调用父类方法**
`super.<方法>(<参数>)`

```typescript
// 调用父类方法
class Dog extends Animal {
    speak(): string {
        return `${super.speak()} - Woof!`
    }
}
```

---

## 抽象类

**换行写法：定义抽象类**
`abstract class <类名> {`
`    abstract <方法>(<参数>): <返回类型>`
`}`

```typescript
// 定义抽象类
abstract class Animal {
    abstract speak(): string

    eat(): void {
        console.log("eating")
    }
}
```

---

**换行写法：实现抽象类**
`class <子类> extends <抽象类> {`
`    <方法>(<参数>): <返回类型> { <语句> }`
`}`

```typescript
// 实现抽象类
class Dog extends Animal {
    speak(): string {
        return "Woof!"
    }
}
```

---

## 接口实现

**换行写法：类实现接口**
`interface <接口> { <方法>(<参数>): <返回类型> }`
`class <类名> implements <接口> { <语句> }`

```typescript
// 类实现接口
interface Comparable {
    compare(other: any): number
}

class Number implements Comparable {
    constructor(public value: number) {}

    compare(other: Number): number {
        return this.value - other.value
    }
}
```

---

## 泛型类

**换行写法：定义泛型类**
`class <类名><<T>> {`
`    private <属性>: <T>[]`
`    <方法>(<参数>: <T>): void { <语句> }`
`}`

```typescript
// 定义泛型类
class Stack<T> {
    private items: T[] = []

    push(item: T): void {
        this.items.push(item)
    }

    pop(): T | undefined {
        return this.items.pop()
    }
}
```

---

**基本写法：使用泛型类**
`let <变量> = new <类名><<类型>>()`

```typescript
// 使用泛型类
let stack = new Stack<number>()
stack.push(1)
```

---

## 访问器

**换行写法：使用 getter 和 setter**
`class <类名> {`
`    private _<属性>: <类型>`
`    get <属性>(): <类型> { return this._<属性> }`
`    set <属性>(<值>: <类型>) { this._<属性> = <值> }`
`}`

```typescript
// 使用 getter 和 setter 实现属性访问控制
class User {
    private _age: number = 0

    get age(): number {
        return this._age
    }

    set age(value: number) {
        if (value < 0 || value > 150) {
            throw new Error("Invalid age")
        }
        this._age = value
    }
}
```

---

## 静态块

**换行写法：静态初始化块**
`class <类名> {`
`    static <属性>: <类型>`
`    static { <语句> }`
`}`

```typescript
// 静态初始化块
class Config {
    static settings: Record<string, string>

    static {
        Config.settings = {
            host: "localhost",
            port: "8080",
        }
    }
}
```

---

## 私有字段

**换行写法：使用 # 私有字段**
`class <类名> {`
`    #<属性>: <类型>`
`}`

```typescript
// 使用 # 私有字段（ES2022+）
class User {
    #age: number

    constructor(age: number) {
        this.#age = age
    }

    get_age(): number {
        return this.#age
    }
}
```

`private` 与 `#` 的选择：`private` 是类型层约定（编译后可访问、运行时零开销、子类不可声明同名）；`#` 是语言级真私有（运行时确实访问不到、不同类可以有同名字段）。除非需要运行时强隔离，默认 `private`。

---

## 类表达式

**基本写法：类表达式**
`const <变量> = class <类名> { <语句> }`

```typescript
// 类表达式
const User = class {
    constructor(public name: string) {}
}
```

---

## 抽象属性

**换行写法：抽象属性**
`abstract class <类名> {`
`    abstract <属性>: <类型>`
`}`

```typescript
// 抽象属性
abstract class Animal {
    abstract name: string

    abstract speak(): string
}
```

---

## 实现多个接口

**换行写法：实现多个接口**
`class <类名> implements <接口1>, <接口2> { <语句> }`

```typescript
// 实现多个接口
interface Comparable {
    compare(other: any): number
}

interface Serializable {
    serialize(): string
}

class User implements Comparable, Serializable {
    compare(other: User): number {
        return 0
    }

    serialize(): string {
        return "User"
    }
}
```

---

## this 类型

**换行写法：使用 this 类型**
`class <类名> {`
`    <方法>(<参数>: <类型>): this { return this }`
`}`

```typescript
// 使用 this 类型实现链式调用
class Calculator {
    private value = 0

    add(n: number): this {
        this.value += n
        return this
    }

    multiply(n: number): this {
        this.value *= n
        return this
    }
}
```

---

## 类与类型

**基本写法：类作为类型**
`let <变量>: <类名> = <实例>`

```typescript
// 类作为类型使用
class User {
    constructor(public name: string) {}
}

let user: User = new User("Alice")
```

---

**基本写法：使用 typeof 获取构造函数类型**
`type <别名> = typeof <类名>`

```typescript
// 获取类的构造函数类型
type UserConstructor = typeof User
```

---

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

### 9.3 性能与结构建议

- **避免过度继承**: 继承层次不宜过深，避免钻石继承问题；横向能力组合优先考虑混入或组合。
- **合理使用抽象类**: 只在需要强制子类实现特定方法时使用抽象类。
- **静态成员**: 对于不依赖实例状态的方法和属性，使用静态成员。
- **内存管理**: 注意及时释放不再使用的对象，避免内存泄漏。

## 10. 代码示例：完整的类实现

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
}
// 应用类
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

这个示例把本篇的知识点串成一条线：`Vehicle` 抽象类（abstract 方法 + protected 字段 + 具体公共方法）、三个实现类的构造函数简写与 `super` 调用、各自新增的行为方法。原版示例在此处还有一个 `logVehicle` 类装饰器（实验性签名包装构造函数打日志），装饰器域已归并到[装饰器详解](/typescript/270-DecoratorDetailed)的 4.7 节与附录 G，此处不再重复。

## 11. 练习

1. **修饰符选择**：为一个「购物车」写 `Cart` 类：`items` 对外只读（getter 暴露副本）、`addItem`/`removeItem` 公共、折扣计算为私有方法、`createdAt` 为 readonly。用 `tsc --noEmit` 验证外部不能直接改 `items`。
2. **抽象模板方法**：写抽象类 `ReportGenerator`（抽象方法 `fetchData(): string[]` 与 `format(rows: string[]): string`，具体方法 `generate(): string` 固定调用两者），再实现 `CsvReport` 与 `HtmlReport` 两个子类，体会模板方法模式。
3. **静态工厂**：把练习 1 的 `Cart` 构造函数改为 `private`，提供 `Cart.empty()` 与 `Cart.fromItems(items: Item[])` 两个静态工厂，编译验证 `new Cart()` 报错。
4. **混入组合**：用 7.1 节的混入写法组合出 `Loggable` 与 `Serializable` 两个混入，套在一个 `Session` 类上，调用组合后的方法。
5. **自检**：不看正文，画出 `private` / `protected` / `public` 的可访问范围表，再说明 `readonly` 与 `#` 私有字段的区别。

## 12. 参考与致谢

- **TypeScript 官方手册：Classes**（https://www.typescriptlang.org/docs/handbook/2/classes.html，文档许可 CC-BY 4.0）：修饰符、抽象类、静态成员语义的基准来源。
- **TypeScript 官方手册：Mixins**（https://www.typescriptlang.org/docs/handbook/2/mixins.html，文档许可 CC-BY 4.0）。
- 本篇装饰器域原内容已归并至 [装饰器详解](/typescript/270-DecoratorDetailed)（4.7 节与附录 G），归并关系见该篇对应小节的说明。
