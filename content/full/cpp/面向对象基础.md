---
order: 60
tags:
  - cpp
  - oop
difficulty: intermediate
title: 'C++ 面向对象基础'
module: cpp
category: 'C++ Basics'
description: 类与对象、封装、继承、多态与虚函数。
author: Anonymous
related:
  - cpp/RAII与资源管理
  - cpp/运算符重载
  - cpp/STL算法详解
  - cpp/字符串处理
prerequisites:
  - cpp/概述与现代标准
---

## 1. 类与对象 (Class & Object)

### 1.1 类的定义

类是面向对象编程的基本单位，它封装了数据和操作数据的方法。

```cpp
 class Person {
 private:
  // 私有成员变量
  std::string name;
  int age;
 public:
  // 构造函数
  Person() : name(""), age(0) {}
  Person(std::string n, int a) : name(n), age(a) {}
  // 成员方法
  void setName(std::string n) { name = n; }
  void setAge(int a) { age = a; }
  std::string getName() const { return name; }
  int getAge() const { return age; }
  // 成员方法
  void introduce() const {
  std::cout << "My name is " << name << " and I am " << age << " years old." << std::endl;
  }
 }
```

### 1.2 对象的创建与使用

```cpp
 int main() {
  // 栈上创建对象
  Person person1; // 默认构造函数
  person1.setName("Alice");
  person1.setAge(25);
  person1.introduce();
  // 栈上创建对象（带参数）
  Person person2("Bob", 30);
  person2.introduce();
  // 堆上创建对象
  Person* person3 = new Person("Charlie", 35);
  person3->introduce();
  delete person3; // 释放堆内存
  return 0;
 }
```

### 1.3 类的成员

| 成员类型     | 描述                 | 访问权限                   |
| :----------- | :------------------- | :------------------------- |
| **成员变量** | 存储对象状态         | public, private, protected |
| **成员函数** | 操作对象状态         | public, private, protected |
| **构造函数** | 初始化对象           | public                     |
| **析构函数** | 清理对象资源         | public                     |
| **静态成员** | 属于类，而非对象     | public, private, protected |
| **友元**     | 允许外部访问私有成员 | -                          |

## 2. 封装 (Encapsulation)

封装是将数据和操作数据的方法捆绑在一起，对外部隐藏实现细节。

### 2.1 访问修饰符

| 修饰符      | 访问权限 | 描述           |
| :---------- | :------- | :------------- |
| `public`    | 公共     | 外部可访问     |
| `private`   | 私有     | 仅类内访问     |
| `protected` | 保护     | 类及派生类访问 |

### 2.2 封装示例

```cpp
 class BankAccount {
 private:
  // 私有成员变量，外部不可直接访问
  std::string accountNumber;
  double balance;
 public:
  // 构造函数
  BankAccount(std::string accNum, double initialBalance) :
  accountNumber(accNum), balance(initialBalance) {}
  // 公共接口
  void deposit(double amount) {
  if (amount > 0) {
  balance += amount;
  std::cout << "Deposited: $" << amount << std::endl;
  }
  }
  void withdraw(double amount) {
  if (amount > 0 && amount <= balance) {
  balance -= amount;
  std::cout << "Withdrawn: $" << amount << std::endl;
  } else {
  std::cout << "Insufficient funds" << std::endl;
  }
  }
  double getBalance() const {
  return balance;
  }
  std::string getAccountNumber() const {
  return accountNumber;
  }
 }
 // 使用示例
 int main() {
  BankAccount acc("123456", 1000.0);
  acc.deposit(500.0);
  acc.withdraw(200.0);
  std::cout << "Balance: $" << acc.getBalance() << std::endl;
  return 0;
 }
```

## 3. 继承 (Inheritance)

继承是一种创建新类的方式，新类继承现有类的属性和方法。

### 3.1 继承的基本语法

```cpp
 // 基类
 class Animal {
 protected:
  std::string name;
 public:
  Animal(std::string n) : name(n) {}
  virtual void makeSound() {
  std::cout << "Generic animal sound" << std::endl;
  }
  virtual ~Animal() {}
 }
 // 派生类
 class Dog : public Animal {
 public:
  Dog(std::string n) : Animal(n) {}
  // 覆盖基类方法
  void makeSound() override {
  std::cout << name << " barks: Woof! Woof!" << std::endl;
  }
 }
 // 派生类
 class Cat : public Animal {
 public:
  Cat(std::string n) : Animal(n) {}
  // 覆盖基类方法
  void makeSound() override {
  std::cout << name << " meows: Meow! Meow!" << std::endl;
  }
 }
```

### 3.2 继承类型

| 继承类型    | 基类成员在派生类中的访问权限                  |
| :---------- | :-------------------------------------------- |
| `public`    | 保持基类成员的访问权限                        |
| `protected` | 基类的 public 和 protected 成员变为 protected |
| `private`   | 基类的所有成员变为 private                    |

### 3.3 多继承

C++ 支持多继承，一个类可以从多个基类继承。

```cpp
 // 基类 1
 class Printable {
 public:
  virtual void print() const = 0; // 纯虚函数
 }
 // 基类 2
 class Serializable {
 public:
  virtual std::string serialize() const = 0; // 纯虚函数
 }
 // 派生类，多继承
 class Person : public Printable, public Serializable {
 private:
  std::string name;
  int age;
 public:
  Person(std::string n, int a) : name(n), age(a) {}
  // 实现 Printable 接口
  void print() const override {
  std::cout << "Name: " << name << ", Age: " << age << std::endl;
  }
  // 实现 Serializable 接口
  std::string serialize() const override {
  return "{\"name\": \"" + name + "\", \"age\": " + std::to_string(age) + "}";
  }
 }
```

### 3.4 菱形继承问题

菱形继承是多继承中的一个问题，当两个派生类继承自同一个基类，而另一个类又同时继承这两个派生类时，会导致基类成员的重复。

```cpp
 // 基类
 class Animal {
 public:
  Animal() { std::cout << "Animal constructor" << std::endl; }
  ~Animal() { std::cout << "Animal destructor" << std::endl; }
 }
 // 派生类 1
 class Mammal : public Animal {
 public:
  Mammal() { std::cout << "Mammal constructor" << std::endl; }
  ~Mammal() { std::cout << "Mammal destructor" << std::endl; }
 }
 // 派生类 2
 class Bird : public Animal {
 public:
  Bird() { std::cout << "Bird constructor" << std::endl; }
  ~Bird() { std::cout << "Bird destructor" << std::endl; }
 }
 // 派生类 3，多继承
 class Bat : public Mammal, public Bird {
 public:
  Bat() { std::cout << "Bat constructor" << std::endl; }
  ~Bat() { std::cout << "Bat destructor" << std::endl; }
 }
 // 问题：Bat 会有两个 Animal 子对象
 // 解决方案：使用虚继承
```

### 3.5 虚继承

虚继承可以解决菱形继承问题，确保基类只被继承一次。

```cpp
 // 基类
 class Animal {
 public:
  Animal() { std::cout << "Animal constructor" << std::endl; }
  ~Animal() { std::cout << "Animal destructor" << std::endl; }
 }
 // 派生类 1，虚继承
 class Mammal : virtual public Animal {
 public:
  Mammal() { std::cout << "Mammal constructor" << std::endl; }
  ~Mammal() { std::cout << "Mammal destructor" << std::endl; }
 }
 // 派生类 2，虚继承
 class Bird : virtual public Animal {
 public:
  Bird() { std::cout << "Bird constructor" << std::endl; }
  ~Bird() { std::cout << "Bird destructor" << std::endl; }
 }
 // 派生类 3，多继承
 class Bat : public Mammal, public Bird {
 public:
  Bat() { std::cout << "Bat constructor" << std::endl; }
  ~Bat() { std::cout << "Bat destructor" << std::endl; }
 }
 // 现在 Bat 只有一个 Animal 子对象
```

## 4. 多态 (Polymorphism)

多态是指同一操作作用于不同的对象时，会产生不同的行为。C++ 支持两种类型的多态：静态多态和动态多态。

### 4.1 静态多态

静态多态是在编译时确定的，通过函数重载和模板实现。

#### 4.1.1 函数重载

函数重载是指在同一作用域内定义多个同名函数，但它们的参数列表不同（参数类型、参数个数或参数顺序不同）。

```cpp
 class Calculator {
 public:
  // 重载：参数类型不同
  int add(int a, int b) {
  return a + b;
  }
  double add(double a, double b) {
  return a + b;
  }
  // 重载：参数个数不同
  int add(int a, int b, int c) {
  return a + b + c;
  }
  // 重载：参数顺序不同
  void print(int a, double b) {
  std::cout << "int: " << a << ", double: " << b << std::endl;
  }
  void print(double a, int b) {
  std::cout << "double: " << a << ", int: " << b << std::endl;
  }
 }
 // 使用示例
 int main() {
  Calculator calc;
  std::cout << "add(int, int): " << calc.add(1, 2) << std::endl;
  std::cout << "add(double, double): " << calc.add(1.5, 2.5) << std::endl;
  std::cout << "add(int, int, int): " << calc.add(1, 2, 3) << std::endl;
  calc.print(1, 2.5);
  calc.print(1.5, 2);
  return 0;
 }
```

#### 4.1.2 模板

模板是 C++ 支持泛型编程的核心机制，通过模板可以编写通用的函数和类。

```cpp
 // 函数模板
 template <typename T>
 T add(T a, T b) {
  return a + b;
 }
 // 类模板
 template <typename T>
 class Stack {
 private:
  std::vector<T> elements;
 public:
  void push(T element) {
  elements.push_back(element);
  }
  T pop() {
  if (elements.empty()) {
  throw std::runtime_error("Stack is empty");
  }
  T top = elements.back();
  elements.pop_back();
  return top;
  }
  bool empty() const {
  return elements.empty();
  }
  size_t size() const {
  return elements.size();
  }
 }
 // 使用示例
 int main() {
  // 使用函数模板
  int i = add(10, 20);
  double d = add(3.14, 2.71);
  std::string s = add(std::string("Hello"), std::string(" World"));
  std::cout << "add(int, int): " << i << std::endl;
  std::cout << "add(double, double): " << d << std::endl;
  std::cout << "add(string, string): " << s << std::endl;
  // 使用类模板
  Stack<int> intStack;
  intStack.push(1);
  intStack.push(2);
  intStack.push(3);
  while (!intStack.empty()) {
  std::cout << intStack.pop() << " ";
  }
  std::cout << std::endl;
  Stack<std::string> stringStack;
  stringStack.push("Hello");
  stringStack.push("World");
  while (!stringStack.empty()) {
  std::cout << stringStack.pop() << " ";
  }
  std::cout << std::endl;
  return 0;
 }
```

### 4.2 动态多态

动态多态是在运行时确定的，通过虚函数实现。

```cpp
 // 基类
 class Shape {
 public:
  virtual void draw() const {
  std::cout << "Drawing a shape" << std::endl;
  }
  virtual double area() const = 0; // 纯虚函数
  virtual ~Shape() {}
 }
 // 派生类
 class Circle : public Shape {
 private:
  double radius;
 public:
  Circle(double r) : radius(r) {}
  void draw() const override {
  std::cout << "Drawing a circle" << std::endl;
  }
  double area() const override {
  return M_PI * radius * radius;
  }
 }
 // 派生类
 class Rectangle : public Shape {
 private:
  double width;
  double height;
 public:
  Rectangle(double w, double h) : width(w), height(h) {}
  void draw() const override {
  std::cout << "Drawing a rectangle" << std::endl;
  }
  double area() const override {
  return width * height;
  }
 }
 // 派生类
 class Triangle : public Shape {
 private:
  double base;
  double height;
 public:
  Triangle(double b, double h) : base(b), height(h) {}
  void draw() const override {
  std::cout << "Drawing a triangle" << std::endl;
  }
  double area() const override {
  return 0.5 * base * height;
  }
 }
 // 使用多态
 void printShapeInfo(const Shape& shape) {
  shape.draw();
  std::cout << "Area: " << shape.area() << std::endl;
 }
 int main() {
  Circle circle(5.0);
  Rectangle rectangle(4.0, 6.0);
  Triangle triangle(3.0, 8.0);
  printShapeInfo(circle); // 传递 Circle 对象
  printShapeInfo(rectangle); // 传递 Rectangle 对象
  printShapeInfo(triangle); // 传递 Triangle 对象
  // 使用基类指针数组
  Shape* shapes[3];
  shapes[0] = new Circle(2.0);
  shapes[1] = new Rectangle(3.0, 4.0);
  shapes[2] = new Triangle(5.0, 6.0);
  for (int i = 0; i < 3; i++) {
  printShapeInfo(*shapes[i]);
  delete shapes[i];
  }
  return 0;
 }
```

### 4.3 虚函数与纯虚函数

#### 4.3.1 虚函数

虚函数是在基类中声明的，允许派生类覆盖的函数。

```cpp
 class Base {
 public:
  virtual void func() {
  std::cout << "Base::func()" << std::endl;
  }
  virtual ~Base() {}
 }
 class Derived : public Base {
 public:
  void func() override {
  std::cout << "Derived::func()" << std::endl;
  }
 }
 int main() {
  Base* b = new Derived();
  b->func(); // 调用 Derived::func()
  delete b;
  return 0;
 }
```

#### 4.3.2 纯虚函数

纯虚函数是在基类中声明的，没有实现的虚函数，派生类必须实现它。

```cpp
 class AbstractShape {
 public:
  virtual void draw() const = 0; // 纯虚函数
  virtual double area() const = 0; // 纯虚函数
  virtual ~AbstractShape() {}
 }
 class Square : public AbstractShape {
 private:
  double side;
 public:
  Square(double s) : side(s) {}
  void draw() const override {
  std::cout << "Drawing a square" << std::endl;
  }
  double area() const override {
  return side * side;
  }
 }
 int main() {
  // AbstractShape shape; // 错误：不能实例化抽象类
  Square square(5.0);
  square.draw();
  std::cout << "Area: " << square.area() << std::endl;
  return 0;
 }
```

### 4.4 多态的实现原理

多态的实现依赖于虚函数表（VTable）和虚指针（vptr）。

1. **虚函数表（VTable）**：每个包含虚函数的类都有一个虚函数表，存储了该类所有虚函数的地址。
2. **虚指针（vptr）**：每个对象都有一个虚指针，指向该类的虚函数表。
3. **运行时绑定**：当通过基类指针或引用调用虚函数时，会通过虚指针找到虚函数表，然后调用相应的函数。

```cpp
 // 基类
 class Base {
 public:
  virtual void func1() { std::cout << "Base::func1()" << std::endl; }
  virtual void func2() { std::cout << "Base::func2()" << std::endl; }
  void nonVirtual() { std::cout << "Base::nonVirtual()" << std::endl; }
 }
 // 派生类
 class Derived : public Base {
 public:
  void func1() override { std::cout << "Derived::func1()" << std::endl; }
  // func2() 继承自 Base
  void nonVirtual() { std::cout << "Derived::nonVirtual()" << std::endl; }
 }
 int main() {
  Base* b = new Derived();
  b->func1(); // 调用 Derived::func1()（多态，运行时绑定）
  b->func2(); // 调用 Base::func2()（多态，运行时绑定）
  b->nonVirtual(); // 调用 Base::nonVirtual()（非虚函数，编译时绑定）
  delete b;
  return 0;
 }
```

## 5. 虚函数与虚函数表 (VTable)

### 5.1 虚函数

虚函数是在基类中声明的，允许派生类覆盖的函数。虚函数是实现动态多态的核心机制。

```cpp
 class Base {
 public:
  virtual void func() {
  std::cout << "Base::func()" << std::endl;
  }
  virtual void anotherFunc() {
  std::cout << "Base::anotherFunc()" << std::endl;
  }
  virtual ~Base() {}
 }
 class Derived : public Base {
 public:
  void func() override {
  std::cout << "Derived::func()" << std::endl;
  }
  // anotherFunc() 继承自 Base
 }
 class Derived2 : public Base {
 public:
  void func() override {
  std::cout << "Derived2::func()" << std::endl;
  }
  void anotherFunc() override {
  std::cout << "Derived2::anotherFunc()" << std::endl;
  }
 }
 // 使用示例
 int main() {
  Base* b1 = new Base();
  Base* b2 = new Derived();
  Base* b3 = new Derived2();
  b1->func(); // Base::func()
  b1->anotherFunc(); // Base::anotherFunc()
  b2->func(); // Derived::func()
  b2->anotherFunc(); // Base::anotherFunc()
  b3->func(); // Derived2::func()
  b3->anotherFunc(); // Derived2::anotherFunc()
  delete b1;
  delete b2;
  delete b3;
  return 0;
 }
```

### 5.2 虚函数表

虚函数表（VTable）是实现动态多态的关键机制。

- **虚函数表**：每个包含虚函数的类都有一个虚函数表，存储了该类所有虚函数的地址。
- **虚指针（vptr）**：每个对象都有一个虚指针，指向该类的虚函数表。
- **运行时绑定**：当通过基类指针或引用调用虚函数时，会通过虚指针找到虚函数表，然后调用相应的函数。

### 5.3 虚函数表原理

```cpp
 // 基类
 class Base {
 public:
  virtual void func1() { std::cout << "Base::func1()" << std::endl; }
  virtual void func2() { std::cout << "Base::func2()" << std::endl; }
  void nonVirtual() { std::cout << "Base::nonVirtual()" << std::endl; }
 }
 // 派生类
 class Derived : public Base {
 public:
  void func1() override { std::cout << "Derived::func1()" << std::endl; }
  // func2() 继承自 Base
  void nonVirtual() { std::cout << "Derived::nonVirtual()" << std::endl; }
 }
 int main() {
  Base* b = new Derived();
  b->func1(); // 调用 Derived::func1()（多态，运行时绑定）
  b->func2(); // 调用 Base::func2()（多态，运行时绑定）
  b->nonVirtual(); // 调用 Base::nonVirtual()（非虚函数，编译时绑定）
  delete b;
  return 0;
 }
```

### 5.4 虚函数表的结构

虚函数表是一个函数指针数组，存储了类的虚函数地址。当派生类覆盖基类的虚函数时，会在自己的虚函数表中替换对应的函数指针。

```cpp
 // 基类虚函数表
 // Base VTable:
 // [0] -> Base::func1()
 // [1] -> Base::func2()
 // 派生类虚函数表
 // Derived VTable:
 // [0] -> Derived::func1() // 覆盖基类的func1()
 // [1] -> Base::func2() // 继承基类的func2()
```

### 5.5 虚函数的性能影响

虚函数调用比普通函数调用慢，因为需要通过虚指针和虚函数表进行间接调用。但这种开销通常很小，对于大多数应用来说可以忽略不计。

### 5.6 虚函数的使用注意事项

1. **虚析构函数**：基类的析构函数应该声明为虚函数，以确保派生类的析构函数被正确调用。
2. **虚函数与构造函数**：构造函数不能是虚函数，因为在构造对象时，虚函数表还未完全建立。
3. **虚函数与内联函数**：虚函数通常不能被内联，因为需要运行时绑定。
4. **虚函数与静态函数**：静态函数不能是虚函数，因为静态函数属于类而不是对象。
5. **虚函数与私有成员**：私有虚函数也可以被派生类覆盖，但派生类无法直接调用基类的私有虚函数。

```cpp
 class Base {
 private:
  virtual void privateFunc() {
  std::cout << "Base::privateFunc()" << std::endl;
  }
 public:
  void publicFunc() {
  privateFunc(); // 可以调用私有虚函数
  }
 }
 class Derived : public Base {
 private:
  void privateFunc() override {
  std::cout << "Derived::privateFunc()" << std::endl;
  }
 }
 int main() {
  Base* b = new Derived();
  b->publicFunc(); // 调用 Derived::privateFunc()
  delete b;
  return 0;
 }
```

---

### 更新日志 (Changelog)

- 2026-05-27: 从 C13_104 拆分，专注于面向对象基础（类与对象、封装、继承、多态、虚函数）。
