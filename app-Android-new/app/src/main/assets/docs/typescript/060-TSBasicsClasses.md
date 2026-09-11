---
order: 60
title: TS 前篇 03：类基础
module: 'typescript'
category: 前端技术
difficulty: beginner
description: 零基础第三课：类成员、继承与 super、public/private/protected、readonly、参数属性、访问器与抽象类，对齐官方 TypeScript Handbook。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'typescript/050-TSBasicsFunctions'
  - 'typescript/070-TSBasicsGenerics'
  - 'typescript/090-ClassAndDecorators'
prerequisites:
  - 'typescript/050-TSBasicsFunctions'
---

## 0. 学习目标（可验证）

- [ ] 能定义一个带属性、构造函数、方法的类并实例化
- [ ] 能用 extends 继承并用 super 调用父类构造函数
- [ ] 能区分 public/private/protected 并理解 readonly

## 1. 一句话理解

> 类 = "图纸"：属性是零件、构造函数是组装流程、方法是功能。`new` 一次就按图纸造出一个实例对象。

## 2. 第一个类

```typescript
class Greeter {
  greeting: string;

  constructor(message: string) {
    this.greeting = message;
  }

  greet(): string {
    return "Hello, " + this.greeting;
  }
}

let greeter = new Greeter("world");
console.log(greeter.greet()); // "Hello, world"
```

**讲解：**

1. `class` 声明类；`greeting: string` 是属性声明（要写类型）。
2. `constructor` 是构造函数：`new` 时自动执行，负责初始化属性。
3. `greet(): string` 是方法；类内访问成员必须写 `this.`。
4. `new Greeter("world")` 创建实例：先分配对象，再执行构造函数。

## 3. 继承：extends 与 super

```typescript
class Animal {
  name: string;

  constructor(theName: string) {
    this.name = theName;
  }

  move(distanceInMeters: number = 0): void {
    console.log(`${this.name} moved ${distanceInMeters}m.`);
  }
}

class Snake extends Animal {
  constructor(name: string) {
    super(name); // 必须先调用父类构造函数
  }

  move(distanceInMeters = 5): void {
    console.log("Slithering...");
    super.move(distanceInMeters);
  }
}

let sam = new Snake("Sammy");
sam.move(); // Slithering... Sammy moved 5m.
```

**讲解：**

1. `extends` 让子类继承父类的属性与方法。
2. 子类有构造函数时**必须**先调用 `super(...)`，且在访问 `this` 之前调用。
3. 子类可以重写（override）父类方法；`super.move(...)` 显式调用父类版本。
4. 声明为父类类型的变量可以装子类实例（`let a: Animal = new Snake("S")`），调用方法时执行的是子类版本。

## 4. 访问修饰符：public / private / protected

```typescript
class Person {
  public name: string;        // 默认就是 public，可省略
  private secret: string;     // 仅本类内部可访问
  protected title: string;    // 本类与子类可访问，外部不可

  constructor(name: string, secret: string, title: string) {
    this.name = name;
    this.secret = secret;
    this.title = title;
  }
}

class Employee extends Person {
  getTitle(): string {
    return this.title;        // protected：子类可以访问
  }
}

let howard = new Employee("Howard", "s3cr3t", "Engineer");
console.log(howard.name);     // 合法
// console.log(howard.secret); // 报错：private
// console.log(howard.title);  // 报错：protected
```

**讲解：**

1. 三个修饰符控制可见性：`public` 谁都能访问（默认）、`private` 只有本类、`protected` 本类 + 子类。
2. TypeScript 的 `private` 是编译期约束；运行时字段仍然存在，但编译器阻止外部访问。
3. `private`/`protected` 成员参与类型兼容判断：两个形状相同的类，private 字段来源不同则不兼容。

## 5. readonly 与参数属性

```typescript
// readonly：初始化后不可再赋值
class Octopus {
  readonly name: string;
  readonly numberOfLegs: number = 8;

  constructor(theName: string) {
    this.name = theName;
  }
}

// 参数属性：声明 + 赋值一步完成
class Octopus2 {
  readonly numberOfLegs: number = 8;
  constructor(readonly name: string) {}
}
```

**讲解：**

1. `readonly` 属性必须在声明处或构造函数里初始化，之后不可赋值。
2. 构造函数参数前加 `readonly`/`private`/`public`/`protected`，就自动变成同名的类属性——这叫"参数属性"，少写两行代码。
3. `constructor(readonly name: string)` 等价于"声明 `name` 属性 + 在构造函数里 `this.name = name`"。

## 6. 访问器（get/set）、静态成员与抽象类

```typescript
// getter/setter：拦截属性读写
class Employee2 {
  private _fullName: string = "";

  get fullName(): string {
    return this._fullName;
  }

  set fullName(newName: string) {
    if (newName.length > 10) throw new Error("名字太长");
    this._fullName = newName;
  }
}

// static：挂在类上而不是实例上
class Grid {
  static origin = { x: 0, y: 0 };
}
console.log(Grid.origin); // 通过类名访问

// abstract：抽象类不能 new，抽象方法必须由子类实现
abstract class Department {
  constructor(public name: string) {}
  abstract printMeeting(): void;
}

class AccountingDepartment extends Department {
  constructor() {
    super("Accounting");
  }
  printMeeting(): void {
    console.log("Meeting at 10am.");
  }
}
```

**讲解：**

1. `get`/`set` 把"读属性"和"写属性"变成可控逻辑（如长度校验）；只有 `get` 没有 `set` 的属性自动视为只读。
2. `static` 成员属于类本身，用 `类名.成员` 访问，不随实例复制。
3. `abstract class` 是"半成品图纸"：抽象方法只写签名，子类必须实现；抽象类本身不能被 `new`。
4. `constructor(public name: string)` 是参数属性与修饰符的组合写法。

## 7. 动手试试

### 入门版（必做）

1. 写一个 `Animal` 类 + `Dog extends Animal`（带 `bark()` 方法），验证继承的方法与属性。
2. 给一个类加 `private` 字段，尝试从类外访问，观察编译错误。
3. 用参数属性重写一个"构造函数里赋值"的类。

### 进阶版（选做）

1. 写一个带 `set fullName` 长度校验的类，并测试超长赋值抛错。
2. 写一个抽象类 `Shape`（抽象方法 `area(): number`），用两个子类实现并计算面积。

## 8. 一句话记住

> 类 = 属性 + 构造函数 + 方法；继承用 `extends` 且先 `super()`；`private` 藏起来、`protected` 传后代、`readonly` 定死、`abstract` 留作业。

下一篇进入泛型基础。
