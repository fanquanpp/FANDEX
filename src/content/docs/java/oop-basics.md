---
order: 110
tags:
  - 'java'
  - 'oop'
  - 'memory'
  - 'data-structure'
difficulty: 'intermediate'
title: '面向对象编程'
module: 'java'
category: 'Java Basics'
description: '类与对象、封装、继承、多态与抽象类。'
author: 'fanquanpp'
updated: 2026-05-03
---

## 1. 类与对象 (Class & Object)

### 1.1 类的定义

类是对象的模板，定义了对象的属性和行为。

```java
 public class Student {
  // 属性 (成员变量)
  private String name;
  private int age;
  private String major;
  // 行为 (方法)
  public void study() {
  System.out.println(name + " is studying.");
  }
  public void introduce() {
  System.out.println("I'm " + name + ", " + age + " years old, major in " + major);
  }
 True}
```

### 1.2 类的结构

- **成员变量** (Fields): 类的属性，存储对象的状态
- **方法** (Methods): 类的行为，定义对象的操作
- **构造器** (Constructors): 用于创建对象的特殊方法
- **代码块** (Blocks): 静态代码块和实例代码块
- **内部类** (Inner Classes): 类中定义的类

### 1.3 对象的创建与使用

#### 1.3.1 对象的创建

使用 `new` 关键字创建对象。

```java
 // 创建对象
 Student student = new Student();
 // 访问对象的属性和方法
 student.setName("Alice");
 student.setAge(20);
 student.setMajor("Computer Science");
 student.study();
 student.introduce();
```

#### 1.3.2 对象的内存布局

- **栈 (Stack)**: 存放对象引用变量
- **堆 (Heap)**: 存放对象的实际数据

```
 栈 堆
 True┌──────────┐ ┌────────────┐
 │ student │─────→│ name: null │
 └──────────┘ │ age: 0 │
  │ major: null│
  └────────────┘
```

### 1.4 构造器 (Constructors)

构造器用于初始化对象，与类同名，无返回值。

#### 1.4.1 默认构造器

如果类中没有定义构造器，编译器会自动生成一个无参构造器。

```java
 public class Student {
  // 默认构造器（由编译器生成）
  public Student() {
  }
 True}
```

#### 1.4.2 自定义构造器

可以定义多个构造器，实现方法重载。

```java
 public class Student {
  private String name;
  private int age;
  private String major;
  // 无参构造器
  public Student() {
  }
  // 带参数的构造器
  public Student(String name, int age) {
  this.name = name;
  this.age = age;
  }
  // 全参构造器
  public Student(String name, int age, String major) {
  this.name = name;
  this.age = age;
  this.major = major;
  }
 True}
```

#### 1.4.3 构造器的调用

```java
 // 使用无参构造器
 Student student1 = new Student();
 // 使用带参数的构造器
 Student student2 = new Student("Bob", 21);
 // 使用全参构造器
 Student student3 = new Student("Charlie", 22, "Software Engineering");
```

## 2. 封装 (Encapsulation)

### 2.1 封装的概念

封装是指将对象的状态和行为封装起来，只暴露必要的接口，隐藏实现细节。

### 2.2 访问修饰符

| 修饰符      | 类内 | 同包 | 子类 | 任意位置 |
| ----------- | ---- | ---- | ---- | -------- |
| `private`   |      |      |      |          |
| `default`   |      |      |      |          |
| `protected` |      |      |      |          |
| `public`    |      |      |      |          |

### 2.3 封装的实现

使用 `private` 修饰符隐藏属性，通过 getter/setter 方法暴露接口。

```java
 public class Student {
  // 私有属性
  private String name;
  private int age;
  private String major;
  // Getter 方法
  public String getName() {
  return name;
  }
  public int getAge() {
  return age;
  }
  public String getMajor() {
  return major;
  }
  // Setter 方法
  public void setName(String name) {
  this.name = name;
  }
  public void setAge(int age) {
  if (age >= 0 && age <= 150) {
  this.age = age;
  } else {
  System.out.println("Invalid age");
  }
  }
  public void setMajor(String major) {
  this.major = major;
  }
 True}
```

### 2.4 封装的优点

- **安全性**: 防止外部直接修改对象状态
- **可维护性**: 内部实现可以自由修改，不影响外部使用
- **可读性**: 明确对象的接口和职责
- **灵活性**: 可以在 setter 中添加验证逻辑

## 3. 继承 (Inheritance)

### 3.1 继承的概念

继承是指一个类（子类）继承另一个类（父类）的属性和方法，实现代码复用。

### 3.2 继承的语法

使用 `extends` 关键字。

```java
 // 父类
 public class Animal {
  protected String name;
  public void eat() {
  System.out.println(name + " is eating.");
  }
  public void sleep() {
  System.out.println(name + " is sleeping.");
  }
 True}
 // 子类
 public class Dog extends Animal {
  public void bark() {
  System.out.println(name + " is barking.");
  }
 True}
```

### 3.3 继承的特性

- **单继承**: Java 只支持单继承，一个类只能有一个直接父类
- **传递性**: 如果 A 继承 B，B 继承 C，则 A 间接继承 C
- **方法重写**: 子类可以重写父类的方法
- **super 关键字**: 用于访问父类的成员和构造器

### 3.4 super 关键字的使用

#### 3.4.1 访问父类的成员变量

```java
 public class Dog extends Animal {
  private String breed;
  public Dog(String name, String breed) {
  super.name = name; // 访问父类的成员变量
  this.breed = breed;
  }
 True}
```

#### 3.4.2 调用父类的方法

```java
 public class Dog extends Animal {
  @Override
  public void eat() {
  super.eat(); // 调用父类的 eat 方法
  System.out.println("Dog eats bones.");
  }
 True}
```

#### 3.4.3 调用父类的构造器

```java
 public class Animal {
  protected String name;
  public Animal(String name) {
  this.name = name;
  }
 True}
 public class Dog extends Animal {
  private String breed;
  public Dog(String name, String breed) {
  super(name); // 调用父类的构造器
  this.breed = breed;
  }
 True}
```

### 3.5 方法重写 (Override)

#### 3.5.1 方法重写的规则

- **方法名相同**
- **参数列表相同**
- **返回类型相同或为子类类型** (协变返回类型)
- **访问修饰符不能更严格**
- **不能抛出比父类方法更多的异常**

#### 3.5.2 方法重写的示例

```java
 public class Animal {
  public void makeSound() {
  System.out.println("Animal makes sound.");
  }
 True}
 public class Cat extends Animal {
  @Override
  public void makeSound() {
  System.out.println("Cat meows.");
  }
 True}
 public class Dog extends Animal {
  @Override
  public void makeSound() {
  System.out.println("Dog barks.");
  }
 True}
```

## 4. 多态 (Polymorphism)

### 4.1 多态的概念

多态是指同一行为在不同对象上有不同的表现形式。

### 4.2 多态的必要条件

1. **继承关系**
2. **方法重写**
3. **父类引用指向子类对象**

### 4.3 多态的示例

```java
 // 父类引用指向子类对象
 Animal animal1 = new Cat();
 animal1.makeSound(); // 输出: Cat meows.
 Animal animal2 = new Dog();
 animal2.makeSound(); // 输出: Dog barks.
```

### 4.4 多态的原理

- **编译时类型**: 变量声明的类型（父类类型）
- **运行时类型**: 变量实际指向的对象类型（子类类型）
- **方法调用**: 编译时检查父类是否有该方法，运行时执行子类重写的方法

### 4.5 多态的优点

- **可扩展性**: 新增子类不影响现有代码
- **代码复用**: 统一使用父类引用处理不同子类对象
- **灵活性**: 运行时动态绑定方法实现

## 5. this 关键字

### 5.1 this 关键字的作用

- **指向当前对象**
- **区分成员变量和局部变量**
- **调用本类的其他构造器**
- **返回当前对象**

### 5.2 this 关键字的使用

#### 5.2.1 区分成员变量和局部变量

```java
 public class Student {
  private String name;
  public void setName(String name) {
  this.name = name; // this.name 指成员变量，name 指局部变量
  }
 True}
```

#### 5.2.2 调用本类的其他构造器

```java
 public class Student {
  private String name;
  private int age;
  public Student() {
  this("Unknown", 0); // 调用带两个参数的构造器
  }
  public Student(String name) {
  this(name, 0); // 调用带两个参数的构造器
  }
  public Student(String name, int age) {
  this.name = name;
  this.age = age;
  }
 True}
```

#### 5.2.3 返回当前对象

```java
 public class Student {
  private String name;
  private int age;
  public Student setName(String name) {
  this.name = name;
  return this; // 返回当前对象，支持链式调用
  }
  public Student setAge(int age) {
  this.age = age;
  return this; // 返回当前对象，支持链式调用
  }
 True}
 // 链式调用
 Student student = new Student().setName("Alice").setAge(20);
```

## 6. 面向对象的设计原则

### 6.1 单一职责原则 (SRP)

一个类应该只负责一项职责。

### 6.2 开放-封闭原则 (OCP)

软件实体应该对扩展开放，对修改封闭。

### 6.3 里氏替换原则 (LSP)

子类应该能够替换父类而不影响程序的正确性。

### 6.4 依赖倒置原则 (DIP)

高层模块不应该依赖低层模块，两者都应该依赖抽象。

### 6.5 接口隔离原则 (ISP)

客户端不应该依赖它不需要的接口。

## 7. 实际应用案例

### 7.1 简单的学生管理系统

```java
 // 基类
 public class Person {
  private String name;
  private int age;
  // 构造器、getter/setter 方法
 True}
 // 子类
 public class Student extends Person {
  private String studentId;
  private String major;
  // 构造器、getter/setter 方法
  public void study() {
  System.out.println(getName() + " is studying " + major);
  }
 True}
 // 子类
 public class Teacher extends Person {
  private String teacherId;
  private String subject;
  // 构造器、getter/setter 方法
  public void teach() {
  System.out.println(getName() + " is teaching " + subject);
  }
 True}
 // 测试
 public class Test {
  public static void main(String[] args) {
  Student student = new Student();
  student.setName("Alice");
  student.setAge(20);
  student.setStudentId("S12345");
  student.setMajor("Computer Science");
  student.study();
  Teacher teacher = new Teacher();
  teacher.setName("Mr. Smith");
  teacher.setAge(35);
  teacher.setTeacherId("T67890");
  teacher.setSubject("Java Programming");
  teacher.teach();
  }
 True}
```

### 7.2 形状类的多态示例

```java
 // 抽象基类
 public abstract class Shape {
  public abstract double calculateArea();
  public abstract double calculatePerimeter();
 True}
 // 子类
 public class Circle extends Shape {
  private double radius;
  public Circle(double radius) {
  this.radius = radius;
  }
  @Override
  public double calculateArea() {
  return Math.PI * radius * radius;
  }
  @Override
  public double calculatePerimeter() {
  return 2 * Math.PI * radius;
  }
 True}
 // 子类
 public class Rectangle extends Shape {
  private double width;
  private double height;
  public Rectangle(double width, double height) {
  this.width = width;
  this.height = height;
  }
  @Override
  public double calculateArea() {
  return width * height;
  }
  @Override
  public double calculatePerimeter() {
  return 2 * (width + height);
  }
 True}
 // 测试
 public class Test {
  public static void main(String[] args) {
  Shape[] shapes = new Shape[2];
  shapes[0] = new Circle(5);
  shapes[1] = new Rectangle(4, 6);
  for (Shape shape : shapes) {
  System.out.println("Area: " + shape.calculateArea());
  System.out.println("Perimeter: " + shape.calculatePerimeter());
  System.out.println();
  }
  }
 True}
```

## 8. 常见陷阱

### 8.1 构造器调用顺序

- 父类构造器总是在子类构造器之前执行
- 如果子类构造器没有显式调用父类构造器，会自动调用父类的无参构造器
- 如果父类没有无参构造器，子类必须显式调用父类的有参构造器

### 8.2 方法重写与方法重载的区别

- **方法重写**：发生在父子类之间，方法名、参数列表相同
- **方法重载**：发生在同一类中，方法名相同，参数列表不同

### 8.3 多态的局限性

- 多态只适用于方法，不适用于属性
- 父类引用不能直接调用子类特有的方法，需要强制类型转换

### 8.4 继承的滥用

- 不要为了代码复用而滥用继承
- 优先考虑组合关系而不是继承关系
- 遵循里氏替换原则

---

### 更新日志 (Changelog)

- 2026-04-05: 体系化整合 Java 面向对象三大特性。
- 2026-10-20: 扩展内容，添加类的结构、构造器、封装实现、继承机制、多态深入理解和实际应用案例。
