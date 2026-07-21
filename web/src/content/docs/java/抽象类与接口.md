---
order: 120
tags:
  - java
difficulty: intermediate
title: 抽象类与接口
module: java
category: 'Java Basics'
description: 抽象类设计、接口定义、默认方法与函数式接口。
author: Anonymous
related:
  - java/分代ZGC详解
  - java/面向对象编程
  - java/异常处理机制
  - java/泛型详解
prerequisites:
  - java/概述与开发环境
---

## 1. 抽象类 (Abstract Class)

### 1.1 抽象类的定义

抽象类是使用 `abstract` 修饰的类，不能直接实例化，用于定义子类的共同行为。

```java
 public abstract class Animal {
  // 成员变量
  protected String name;
  // 构造器
  public Animal(String name) {
  this.name = name;
  }
  // 抽象方法（无方法体）
  public abstract void makeSound();
  // 普通方法（有方法体）
  public void eat() {
  System.out.println(name + " is eating.");
  }
 }
```

### 1.2 抽象类的特点

- **不能实例化**: 不能使用 `new` 关键字创建抽象类的实例
- **可以包含抽象方法**: 抽象方法没有方法体，使用 `abstract` 修饰
- **可以包含普通方法**: 抽象类可以有实现了的方法
- **可以有构造器**: 供子类调用
- **子类必须实现所有抽象方法**: 如果子类不实现所有抽象方法，子类也必须是抽象类

### 1.3 抽象类的继承

```java
 // 子类实现抽象类
 public class Dog extends Animal {
  public Dog(String name) {
  super(name);
  }
  @Override
  public void makeSound() {
  System.out.println(name + " barks.");
  }
 }
 public class Cat extends Animal {
  public Cat(String name) {
  super(name);
  }
  @Override
  public void makeSound() {
  System.out.println(name + " meows.");
  }
 }
```

### 1.4 抽象类的使用场景

- **模板方法模式**: 定义算法的骨架，子类实现具体步骤
- **代码复用**: 提取子类的共同代码到抽象类
- **层次结构**: 表示类之间的 "is-a" 关系

## 2. 接口 (Interface)

### 2.1 接口的定义

接口是使用 `interface` 关键字定义的，是一组行为规范的集合。

```java
 public interface Shape {
  // 常量（默认 public static final）
  double PI = 3.14159;
  // 抽象方法（默认 public abstract）
  double calculateArea();
  double calculatePerimeter();
 }
```

### 2.2 接口的成员规则

- **属性**: 默认 `public static final`，必须初始化
- **方法**:
- Java 8 前：默认 `public abstract`
- Java 8+：可以有默认方法和静态方法
- Java 9+：可以有私有方法

### 2.3 Java 8+ 接口新特性

#### 2.3.1 默认方法

默认方法使用 `default` 修饰，提供方法的默认实现。

```java
 public interface Vehicle {
  void start();
  void stop();
  // 默认方法
  default void honk() {
  System.out.println("Beep beep!");
  }
 }
```

#### 2.3.2 静态方法

静态方法使用 `static` 修饰，提供工具方法。

```java
 public interface MathUtils {
  // 静态方法
  static int add(int a, int b) {
  return a + b;
  }
  static int subtract(int a, int b) {
  return a - b;
  }
 }
```

#### 2.3.3 私有方法

Java 9+ 支持私有方法，供接口内部使用。

```java
 public interface StringUtils {
  default String reverse(String str) {
  return reverseImpl(str);
  }
  default boolean isPalindrome(String str) {
  String reversed = reverseImpl(str);
  return str.equals(reversed);
  }
  // 私有方法
  private String reverseImpl(String str) {
  return new StringBuilder(str).reverse().toString();
  }
 }
```

### 2.4 接口的实现

```java
 public class Circle implements Shape {
  private double radius;
  public Circle(double radius) {
  this.radius = radius;
  }
  @Override
  public double calculateArea() {
  return PI * radius * radius;
  }
  @Override
  public double calculatePerimeter() {
  return 2 * PI * radius;
  }
 }
 public class Rectangle implements Shape {
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
 }
```

### 2.5 接口的多继承

接口可以继承多个接口。

```java
 public interface Movable {
  void move();
 }
 public interface Flyable {
  void fly();
 }
 // 多继承接口
 public interface Bird extends Movable, Flyable {
  void sing();
 }
```

## 3. 实现与继承的规则

### 3.1 类的继承与实现

- **单继承**: 一个类只能继承一个父类
- **多实现**: 一个类可以实现多个接口

```java
 // 继承一个类，实现多个接口
 public class Eagle extends Animal implements Bird, Predator {
  // 实现所有抽象方法
 }
```

### 3.2 接口的继承

- **多继承**: 接口可以继承多个接口
- **接口链**: 形成接口的继承链

## 4. 抽象类 vs. 接口 (详细对比)

| 特性           | 抽象类 (Abstract Class)      | 接口 (Interface)                                  |
| -------------- | ---------------------------- | ------------------------------------------------- |
| **关键字**     | `abstract class`             | `interface`                                       |
| **实例化**     | 不能直接实例化               | 不能实例化                                        |
| **继承关系**   | 单继承                       | 多实现                                            |
| **接口继承**   | 可以实现多个接口             | 可以继承多个接口                                  |
| **成员变量**   | 任意访问修饰符，非 final     | 只能是 `public static final`                      |
| **构造器**     | 有构造器                     | 无构造器                                          |
| **方法类型**   | 抽象方法、普通方法、静态方法 | 抽象方法、默认方法、静态方法、私有方法            |
| **访问修饰符** | 任意访问修饰符               | 方法默认 `public`，属性默认 `public static final` |
| **设计意图**   | "is-a" 关系（本质）          | "like-a" / "has-a" 关系（能力）                   |
| **使用场景**   | 代码复用、模板方法           | 行为规范、多态、解耦                              |

## 5. 实际应用案例

### 5.1 抽象类的应用 - 模板方法模式

```java
 public abstract class AbstractProcessor {
  // 模板方法
  public final void process() {
  initialize();
  doProcess();
  cleanup();
  }
  // 抽象方法，由子类实现
  protected abstract void doProcess();
  // 普通方法，子类可以覆盖
  protected void initialize() {
  System.out.println("Initializing...");
  }
  protected void cleanup() {
  System.out.println("Cleaning up...");
  }
 }
 public class FileProcessor extends AbstractProcessor {
  @Override
  protected void doProcess() {
  System.out.println("Processing file...");
  }
 }
 public class DatabaseProcessor extends AbstractProcessor {
  @Override
  protected void doProcess() {
  System.out.println("Processing database...");
  }
  @Override
  protected void initialize() {
  System.out.println("Connecting to database...");
  }
 }
```

### 5.2 接口的应用 - 策略模式

```java
 public interface PaymentStrategy {
  void pay(double amount);
 }
 public class CreditCardPayment implements PaymentStrategy {
  private String cardNumber;
  public CreditCardPayment(String cardNumber) {
  this.cardNumber = cardNumber;
  }
  @Override
  public void pay(double amount) {
  System.out.println("Paying " + amount + " with credit card: " + cardNumber);
  }
 }
 public class PayPalPayment implements PaymentStrategy {
  private String email;
  public PayPalPayment(String email) {
  this.email = email;
  }
  @Override
  public void pay(double amount) {
  System.out.println("Paying " + amount + " with PayPal: " + email);
  }
 }
 public class ShoppingCart {
  private PaymentStrategy paymentStrategy;
  public void setPaymentStrategy(PaymentStrategy paymentStrategy) {
  this.paymentStrategy = paymentStrategy;
  }
  public void checkout(double amount) {
  paymentStrategy.pay(amount);
  }
 }
```

### 5.3 接口默认方法的应用

```java
 public interface Collection {
  void add(Object item);
  int size();
  // 默认方法
  default void clear() {
  // 实现清空集合的逻辑
  }
  default boolean isEmpty() {
  return size() == 0;
  }
 }
```

## 6. 最佳实践

### 6.1 抽象类的最佳实践

- **提取共性**: 将子类的共同代码提取到抽象类
- **模板方法**: 使用模板方法模式定义算法骨架
- **层次设计**: 合理设计类的继承层次，避免过深
- **有限使用**: 不要为了使用抽象类而创建抽象类，只有当确实需要时才使用

### 6.2 接口的最佳实践

- **单一职责**: 一个接口只定义一组相关的行为
- **命名规范**: 接口名使用形容词或动词形式（如 `Runnable`, `Serializable`）
- **默认方法**: 谨慎使用默认方法，避免破坏接口的契约
- **静态方法**: 使用静态方法提供工具函数，提高接口的实用性

### 6.3 抽象类与接口的选择

- **使用抽象类**:
- 需要代码复用
- 定义模板方法
- 表示 "is-a" 关系
- 需要构造器和实例变量
- **使用接口**:
- 定义行为规范
- 实现多态
- 表示 "has-a" 能力
- 需要多继承
- 解耦设计

## 7. 常见陷阱

### 7.1 抽象类的陷阱

- **继承层次过深**: 导致代码难以维护
- **过度使用**: 为了代码复用而滥用抽象类
- **构造器调用**: 子类构造器必须调用父类构造器

### 7.2 接口的陷阱

- **默认方法冲突**: 实现多个接口时，默认方法可能冲突
- **接口膨胀**: 接口定义过多方法，导致实现类负担过重
- **版本兼容性**: 修改接口会影响所有实现类

### 7.3 默认方法冲突的解决

```java
 public interface A {
  default void method() {
  System.out.println("A.method()");
  }
 }
 public interface B {
  default void method() {
  System.out.println("B.method()");
  }
 }
 // 解决冲突：重写默认方法
 public class C implements A, B {
  @Override
  public void method() {
  // 可以选择调用其中一个接口的默认方法
  A.super.method();
  // 或提供自己的实现
  System.out.println("C.method()");
  }
 }
```

## 8. 设计模式中的应用

### 8.1 抽象类的应用

- **模板方法模式**: 定义算法骨架
- **工厂方法模式**: 创建对象的接口
- **适配器模式**: 转换接口

### 8.2 接口的应用

- **策略模式**: 定义算法族
- **观察者模式**: 定义对象间的依赖关系
- **命令模式**: 封装请求
- **迭代器模式**: 遍历集合

---

### 更新日志 (Changelog)

- 2026-04-05: 补充 Java 8+ 接口新特性与二者详细对比。
- 2026-05-03: 扩展内容，添加抽象类与接口的具体实现、实际应用案例、最佳实践和常见陷阱。
