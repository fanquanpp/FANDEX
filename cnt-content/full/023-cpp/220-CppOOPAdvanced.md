---
order: 260
title: C++ 面向对象进阶
module: 'cpp'
category: 计算机科学
difficulty: advanced
description: 构造与析构、多重继承与虚继承、CRTP 静态多态、对象生命周期、拷贝与移动控制、接口设计——OOP 进阶本位；操作符重载/模板/STL/虚函数表见各自专篇。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'cpp/200-CppOOPBasics'
  - 'cpp/210-OperatorOverloading'
  - 'cpp/230-VTablePolymorphismMemoryLayout'
  - 'cpp/330-CppTemplate'
  - 'cpp/690-DesignPatternCpp'
prerequisites:
  - 'cpp/200-CppOOPBasics'
  - 'cpp/210-OperatorOverloading'
---


## 前置知识

- [C++ 面向对象基础](/cpp/200-CppOOPBasics) 与 [操作符重载](/cpp/210-OperatorOverloading)：类、构造/析构、运算符重载的基本写法；
- 模板语法在本文 CRTP 一节会用到，最小解释就地给出，系统学习见 [C++ 模板](/cpp/330-CppTemplate)。

## 学习目标

- 掌握构造函数（含初始化列表）与析构函数的完整规则；
- 掌握多重继承与虚继承解决菱形问题的机制；
- 掌握 CRTP 静态多态的写法与适用边界；
- 掌握对象生命周期、拷贝与移动控制的进阶控制手段；
- 能用 NVI 非虚接口等惯用法设计可维护的类接口。

> 拆分说明：本篇原第 2 节操作符重载（见 [210 专篇](/cpp/210-OperatorOverloading)）、第 3 节模板与泛型编程（见 [330 专篇](/cpp/330-CppTemplate)）、第 4 节 STL（见 [240 专篇](/cpp/240-CppSTLContainersIterators)）与虚函数表/RTTI 细节（见 [230 专篇](/cpp/230-VTablePolymorphismMemoryLayout)）已删冗归位，本篇聚焦 OOP 进阶本位。

## 1. 构造函数与析构函数

### 1.1 构造函数

构造函数用于初始化对象，与类同名，无返回类型。

```cpp
 class Person {
 private:
  std::string name;
  int age;
 public:
  // 默认构造函数
  Person() : name(""), age(0) {
  std::cout << "Default constructor" << std::endl;
  }
  // 带参数的构造函数
  Person(std::string n, int a) : name(n), age(a) {
  std::cout << "Parameterized constructor" << std::endl;
  }
  // 复制构造函数
  Person(const Person& other) : name(other.name), age(other.age) {
  std::cout << "Copy constructor" << std::endl;
  }
  // 移动构造函数 (C++11)
  Person(Person&& other) noexcept : name(std::move(other.name)), age(other.age) {
  std::cout << "Move constructor" << std::endl;
  }
 }
```

### 1.2 析构函数

析构函数用于清理对象资源，与类同名，前面加波浪号，无参数，无返回类型。

```cpp
 class Resource {
 private:
  int* data;
 public:
  Resource(int size) {
  data = new int[size];
  std::cout << "Resource allocated" << std::endl;
  }
  ~Resource() {
  delete[] data;
  std::cout << "Resource deallocated" << std::endl;
  }
 }
```

### 1.3 构造函数初始化列表

构造函数初始化列表用于初始化成员变量，比在构造函数体内赋值更高效。

```cpp
 class Point {
 private:
  int x;
  int y;
  const int z; // 常量成员必须在初始化列表中初始化
 public:
  // 使用初始化列表
  Point(int x_, int y_, int z_) : x(x_), y(y_), z(z_) {
  // 构造函数体
  }
 }
```

## 2. 面向对象编程最佳实践

### 2.1 设计原则

- **单一职责原则**: 一个类应该只有一个引起它变化的原因
- **开放封闭原则**: 类应该对扩展开放，对修改封闭
- **里氏替换原则**: 子类应该能够替换父类
- **依赖倒置原则**: 依赖抽象，而不是具体实现
- **接口隔离原则**: 客户端不应该依赖它不使用的接口

### 2.2 代码风格

- **命名规范**:
- 类名: `PascalCase`
- 成员变量: `camelCase` 或 `m_camelCase`
- 成员函数: `camelCase`
- 常量: `UPPER_CASE`
- **代码组织**:
- 头文件 (.h) 包含类声明
- 源文件 (.cpp) 包含类实现
- 使用命名空间避免命名冲突

### 2.3 性能考虑

- **避免不必要的拷贝**: 使用移动语义和引用
- **合理使用虚函数**: 虚函数调用有开销
- **内存管理**: 使用智能指针和 RAII
- **容器选择**: 根据使用场景选择合适的容器

## 3. 代码示例

### 3.1 类与对象的综合使用

```cpp
 #include <iostream>
 #include <string>
 #include <vector>
 class Student {
 private:
  std::string name;
  int id;
  double gpa;
 public:
  // 构造函数
  Student(std::string n, int i, double g) : name(n), id(i), gpa(g) {}
  // 成员方法
  std::string getName() const { return name; }
  int getId() const { return id; }
  double getGpa() const { return gpa; }
  void setGpa(double g) {
  if (g >= 0.0 && g <= 4.0) {
  gpa = g;
  }
  }
  void display() const {
  std::cout << "Name: " << name << ", ID: " << id << ", GPA: " << gpa << std::endl;
  }
 }
 class Course {
 private:
  std::string name;
  std::vector<Student> students;
 public:
  Course(std::string n) : name(n) {}
  void addStudent(const Student& student) {
  students.push_back(student);
  }
  void displayStudents() const {
  std::cout << "Course: " << name << std::endl;
  std::cout << "Students:" << std::endl;
  for (const auto& student : students) {
  student.display();
  }
  }
  double getAverageGpa() const {
  if (students.empty()) return 0.0;
  double total = 0.0;
  for (const auto& student : students) {
  total += student.getGpa();
  }
  return total / students.size();
  }
 }
 int main() {
  // 创建学生
  Student s1("Alice", 101, 3.8);
  Student s2("Bob", 102, 3.5);
  Student s3("Charlie", 103, 4.0);
  // 创建课程
  Course math("Mathematics");
  math.addStudent(s1);
  math.addStudent(s2);
  math.addStudent(s3);
  // 显示学生信息
  math.displayStudents();
  // 计算平均GPA
  std::cout << "Average GPA: " << math.getAverageGpa() << std::endl;
  return 0;
 }
```

### 3.2 继承与多态

```cpp
 #include <iostream>
 #include <string>
 // 基类
 class Employee {
 private:
  std::string name;
  int id;
 protected:
  double salary;
 public:
  Employee(std::string n, int i, double s) : name(n), id(i), salary(s) {}
  virtual ~Employee() {}
  // 虚函数
  virtual double calculateBonus() const {
  return salary * 0.1; // 默认奖金 10%
  }
  virtual void display() const {
  std::cout << "Name: " << name << ", ID: " << id << ", Salary: $" << salary << std::endl;
  }
 }
 // 派生类：经理
 class Manager : public Employee {
 private:
  double bonusPercentage;
 public:
  Manager(std::string n, int i, double s, double bp) :
  Employee(n, i, s), bonusPercentage(bp) {}
  double calculateBonus() const override {
  return salary * (bonusPercentage / 100);
  }
  void display() const override {
  Employee::display();
  std::cout << "Position: Manager, Bonus: $" << calculateBonus() << std::endl;
  }
 }
 // 派生类：工程师
 class Engineer : public Employee {
 private:
  std::string specialization;
 public:
  Engineer(std::string n, int i, double s, std::string spec) :
  Employee(n, i, s), specialization(spec) {}
  double calculateBonus() const override {
  return salary * 0.15; // 工程师奖金 15%
  }
  void display() const override {
  Employee::display();
  std::cout << "Position: Engineer, Specialization: " << specialization << ", Bonus: $" << calculateBonus() << std::endl;
  }
 }
 // 使用多态
 void printEmployeeInfo(const Employee& emp) {
  emp.display();
  std::cout << "------------------------" << std::endl;
 }
 int main() {
  Manager m("John", 101, 80000, 15); // 15% 奖金
  Engineer e("Alice", 102, 60000, "Software");
  std::cout << "Employee Information:" << std::endl;
  std::cout << "------------------------" << std::endl;
  printEmployeeInfo(m);
  printEmployeeInfo(e);
  return 0;
 }
```

## 多重继承

**基本写法：多继承**
`struct <类> : <访问> <基类1>, <访问> <基类2> ...`
```cpp
// 一个类继承多个基类
struct Drawable { virtual void draw() = 0; virtual ~Drawable() = default; };
struct Clickable { virtual void click() = 0; virtual ~Clickable() = default; };
struct Button : Drawable, Clickable {
    void draw() override {}
    void click() override {}
};
```

---

**基本写法：虚继承解决菱形**
`virtual <访问> <基类>`
```cpp
// 菱形继承：虚继承避免二义性
struct Base { int value; };
struct A : virtual Base {};
struct B : virtual Base {};
struct C : A, B {
    // 只有一份 Base::value
};
```

---

## CRTP 静态多态

**基本写法：CRTP 模式**
`template <typename <派生>> struct <基类> { ... };`
```cpp
// 奇异递归模板模式（编译期多态）
template <typename Derived>
struct Shape {
    double area() { return static_cast<Derived*>(this)->areaImpl(); }
};
struct Circle : Shape<Circle> {
    double areaImpl() { return 3.14 * r * r; }
    double r;
};
Circle c; c.r = 2;
c.area(); // 编译期分发，无虚函数开销
```

---

## 对象生命周期

**基本写法：构造/析构顺序**
`基类构造 → 成员构造 → 派生类构造 → 派生类析构 → 成员析构 → 基类析构`
```cpp
struct Base { Base(){ log("B+"); } ~Base(){ log("B-"); } };
struct Member { Member(){ log("M+"); } ~Member(){ log("M-"); } };
struct Derived : Base {
    Member m;
    Derived(){ log("D+"); }
    ~Derived(){ log("D-"); }
};
// 构造 Derived 时输出：B+ M+ D+
// 析构时输出：D- M- B-
```

---

**基本写法：委托构造**
`<类>(<参数>) : <类>(<其他参数>) {}`
```cpp
// 构造函数调用另一构造函数
struct Point {
    int x, y;
    Point() : Point(0, 0) {}          // 委托
    Point(int a) : Point(a, 0) {}     // 委托
    Point(int a, int b) : x(a), y(b) {}
};
```

---

**基本写法：继承构造**
`using <基类>::<基类>;`
```cpp
// C++11 继承基类构造函数
struct Base {
    Base(int);
    Base(int, int);
};
struct Derived : Base {
    using Base::Base; // 继承所有构造函数
};
```

---

## 拷贝与移动控制

**基本写法：Rule of Five**
`<类>(const <类>&); <类>(<类>&&); operator=; ~<类>();`
```cpp
// 自定义资源管理时需定义五个
struct Buffer {
    int* data; size_t size;
    Buffer(size_t n) : data(new int[n]), size(n) {}
    ~Buffer() { delete[] data; }
    Buffer(const Buffer& o) : data(new int[o.size]), size(o.size) {
        std::copy(o.data, o.data+size, data);
    }
    Buffer& operator=(const Buffer& o) {
        Buffer tmp(o); swap(tmp); return *this;
    }
    Buffer(Buffer&& o) noexcept : data(o.data), size(o.size) {
        o.data = nullptr; o.size = 0;
    }
    Buffer& operator=(Buffer&& o) noexcept {
        swap(o); return *this;
    }
    void swap(Buffer& o) noexcept {
        std::swap(data, o.data); std::swap(size, o.size);
    }
};
```

---

**基本写法：Rule of Zero**
`<类>() = default;`
```cpp
// 让编译器自动生成，最简
struct Widget {
    std::vector<int> v;
    std::string name;
    std::unique_ptr<int> p;
    // 无需定义任何特殊成员函数
};
```

---

## 接口设计

**基本写法：NVI 非虚接口**
`public: <接口方法> final { <调用私有虚函数>; }`
```cpp
// 公开非虚方法，私有虚函数实现
struct Widget {
    void work() final {     // 公开接口固定
        beforeWork();
        doWork();            // 私有可覆盖
        afterWork();
    }
    virtual ~Widget() = default;
private:
    virtual void doWork() = 0;
    void beforeWork() {}
    void afterWork() {}
};
```

## 动手实践：遮代码自检

先只读任务与提示，遮住参考实现自己写，写完再对照答案。

**任务一**：用 NVI（非虚接口）惯用法重构下面的「全虚公开」设计：把 `process` 改成公开非虚函数，负责日志与计时；把真正的定制点收进**受保护的纯虚** `doWork`。要求说明每一步为什么这么做。

```cpp
class Task {
public:
    virtual void process() = 0;   // 派生类必须重写，且直接暴露给用户
};
```

**提示**：NVI 的核心是「接口（能不能调）与定制点（怎么定制）分离」——不变式由基类在 `process` 里集中维护，派生类只能覆盖受保护的 `doWork`，无法绕过前后处理。

**参考实现**（先自己写完再看）：

```cpp
class Task {
public:
    void process() {              // 公开非虚：模板方法
        beforeWork();
        doWork();                 // 定制点
        afterWork();
    }
    virtual ~Task() = default;
protected:
    virtual void doWork() = 0;    // 受保护：只给派生类覆盖，不给外部调用
private:
    void beforeWork() { /* 计时/日志等不变式 */ }
    void afterWork()  { /* 清理/统计 */ }
};
```

要点自查：虚函数放进 protected 甚至 private 都合法（虚机制看的是动态类型，不是访问级别）；`process` 非虚保证「前后处理无法被绕过」，这正是模板方法模式的骨架。

**任务二**：解释下面两种写法的差异——`dynamic_cast` 向下转型与 `static_cast` 向下转型各在什么前提下安全？`dynamic_cast` 转换失败返回什么（指针版与引用版）？

```cpp
struct Base { virtual ~Base() = default; };
struct Derived : Base { int extra = 42; };

void f(Base* p, Base& r) {
    auto* d1 = dynamic_cast<Derived*>(p);   // 指针版
    auto& d2 = dynamic_cast<Derived&>(r);   // 引用版
    auto* d3 = static_cast<Derived*>(p);    // 无检查
}
```

**提示**：`static_cast` 向下转型的安全前提是「你**确定**动态类型确实是 Derived」；`dynamic_cast` 靠 RTTI 在运行时查——指针失败给 `nullptr`，引用失败抛 `std::bad_cast`。

**参考实现**（先自己写完再看）：

```text
- static_cast<Derived*>(p)：编译期强转，前提由程序员保证（通常出现在「上游已判定类型」的分支）；判断错了是 UB。
- dynamic_cast<Derived*>(p)：运行时检查，p 指向的不是 Derived（含其派生）时返回 nullptr——适合「试一试」语义。
- dynamic_cast<Derived&>(r)：引用没有空值，失败只能抛 std::bad_cast——适合「必须是 Derived」的契约语义。
- 前提条件：基类必须多态（至少一个虚函数，通常即虚析构），否则 dynamic_cast 编译不通过。
```

要点自查：先问「失败可不可能」再选 cast——可能失败且需要分支处理的用指针版 `dynamic_cast`；不可能失败的用 `static_cast` 并留注释；代码里成片的 `dynamic_cast` 是「该用虚函数而不是 switch 类型判断」的信号。
