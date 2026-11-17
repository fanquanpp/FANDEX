---
order: 710
title: 设计模式与 C++
module: 'cpp'
category: 计算机科学
difficulty: intermediate
description: GoF设计模式的C++实现
author: fanquanpp
updated: '2026-11-17'
related:
  - 'cpp/340-ConstexprCompileTime'
  - 'cpp/050-NamespaceLinkage'
  - 'cpp/220-CppOOPAdvanced'
  - 'cpp/390-TemplateMetaprogramming'
prerequisites:
  - 'cpp/020-CppOverviewAndModernStandard'
---

## 前置知识

- [C++20 模块](/cpp/660-Cpp20Module)：建议先完成前一篇的学习

## 学习目标

- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱
- 掌握「常见场景」的核心机制、典型用法与常见陷阱


## 概述

设计模式是面向对象编程中经过验证的解决方案模板，用于解决常见的软件设计问题。GoF（Gang of Four）定义了 23 种经典设计模式，分为创建型、结构型和行为型三大类。C++ 的多态、模板、RAII 和智能指针等特性为设计模式的实现提供了丰富的手段，使得许多模式在 C++ 中有比传统面向对象语言更优雅的实现方式。

## 基础概念

### 设计模式分类

| 类别   | 说明         | 典型模式             |
| ------ | ------------ | -------------------- |
| 创建型 | 对象创建机制 | 单例、工厂、建造者   |
| 结构型 | 对象组合方式 | 适配器、装饰器、代理 |
| 行为型 | 对象间通信   | 观察者、策略、命令   |

### C++ 实现设计模式的独特优势

- RAII 替代复杂的资源管理模式
- 智能指针简化对象生命周期管理
- 模板实现编译期多态（CRTP）
- Lambda 简化策略和命令模式

## 快速上手

### 单例模式

```cpp
// C++11 线程安全的 Meyer's Singleton
class Database {
public:
    static Database& instance() {
        static Database db;  // C++11 保证线程安全
        return db;
    }

    void query(const std::string& sql) { /* 查询逻辑 */ }

private:
    Database() = default;
    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;
};

// 使用
Database::instance().query("SELECT * FROM users");
```

### 工厂模式

```cpp
#include <memory>
#include <string>

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

class Circle : public Shape {
    double radius_;
public:
    explicit Circle(double r) : radius_(r) {}
    double area() const override { return 3.14159 * radius_ * radius_; }
};

class Rectangle : public Shape {
    double width_, height_;
public:
    Rectangle(double w, double h) : width_(w), height_(h) {}
    double area() const override { return width_ * height_; }
};

// 工厂函数
std::unique_ptr<Shape> createShape(const std::string& type, double a, double b = 0) {
    if (type == "circle") return std::make_unique<Circle>(a);
    if (type == "rectangle") return std::make_unique<Rectangle>(a, b);
    throw std::invalid_argument("未知形状");
}
```

### 策略模式（使用 Lambda）

```cpp
#include <functional>
#include <vector>
#include <algorithm>

class Sorter {
    std::function<bool(int, int)> comparator_;
public:
    explicit Sorter(std::function<bool(int, int)> comp) : comparator_(std::move(comp)) {}

    void sort(std::vector<int>& data) {
        std::sort(data.begin(), data.end(), comparator_);
    }
};

// 使用 Lambda 替代策略类
Sorter ascSorter([](int a, int b) { return a < b; });
Sorter descSorter([](int a, int b) { return a > b; });

std::vector<int> data = {3, 1, 4, 1, 5};
ascSorter.sort(data);   // 升序
descSorter.sort(data);  // 降序
```

## 详细用法

### 观察者模式

```cpp
#include <functional>
#include <vector>
#include <string>
#include <algorithm>

class EventBus {
    std::unordered_map<std::string, std::vector<std::function<void(const std::string&)>>> handlers_;
public:
    void subscribe(const std::string& event, std::function<void(const std::string&)> handler) {
        handlers_[event].push_back(std::move(handler));
    }

    void publish(const std::string& event, const std::string& data) {
        auto it = handlers_.find(event);
        if (it != handlers_.end()) {
            for (auto& handler : it->second) {
                handler(data);
            }
        }
    }
};

// 使用
EventBus bus;
bus.subscribe("user.login", [](const std::string& user) {
    std::cout << user << " 已登录" << std::endl;
});
bus.publish("user.login", "张三");
```

### 装饰器模式

```cpp
#include <memory>
#include <string>

class Coffee {
public:
    virtual ~Coffee() = default;
    virtual double cost() const = 0;
    virtual std::string description() const = 0;
};

class Espresso : public Coffee {
public:
    double cost() const override { return 10.0; }
    std::string description() const override { return "浓缩咖啡"; }
};

class MilkDecorator : public Coffee {
    std::unique_ptr<Coffee> coffee_;
public:
    explicit MilkDecorator(std::unique_ptr<Coffee> c) : coffee_(std::move(c)) {}
    double cost() const override { return coffee_->cost() + 3.0; }
    std::string description() const override { return coffee_->description() + " + 牛奶"; }
};

class SugarDecorator : public Coffee {
    std::unique_ptr<Coffee> coffee_;
public:
    explicit SugarDecorator(std::unique_ptr<Coffee> c) : coffee_(std::move(c)) {}
    double cost() const override { return coffee_->cost() + 1.0; }
    std::string description() const override { return coffee_->description() + " + 糖"; }
};

// 使用
auto coffee = std::make_unique<SugarDecorator>(
    std::make_unique<MilkDecorator>(
        std::make_unique<Espresso>()));
std::cout << coffee->description() << ": " << coffee->cost() << "元" << std::endl;
// 浓缩咖啡 + 牛奶 + 糖: 14元
```

### 命令模式

```cpp
#include <vector>
#include <memory>
#include <functional>

class Command {
public:
    virtual ~Command() = default;
    virtual void execute() = 0;
    virtual void undo() = 0;
};

class CommandManager {
    std::vector<std::unique_ptr<Command>> history_;
    size_t current_ = 0;
public:
    void execute(std::unique_ptr<Command> cmd) {
        // 删除当前位置之后的历史
        history_.resize(current_);
        cmd->execute();
        history_.push_back(std::move(cmd));
        ++current_;
    }

    void undo() {
        if (current_ > 0) {
            --current_;
            history_[current_]->undo();
        }
    }

    void redo() {
        if (current_ < history_.size()) {
            history_[current_]->execute();
            ++current_;
        }
    }
};

// 使用 Lambda 实现轻量命令
class LambdaCommand : public Command {
    std::function<void()> do_;
    std::function<void()> undo_;
public:
    LambdaCommand(std::function<void()> d, std::function<void()> u)
        : do_(std::move(d)), undo_(std::move(u)) {}
    void execute() override { do_(); }
    void undo() override { undo_(); }
};
```

### 适配器模式

```cpp
#include <string>

// 第三方库的接口
class LegacyLogger {
public:
    void logMessage(int level, const char* msg) {
        std::cout << "[" << level << "] " << msg << std::endl;
    }
};

// 目标接口
class Logger {
public:
    virtual ~Logger() = default;
    virtual void info(const std::string& msg) = 0;
    virtual void error(const std::string& msg) = 0;
};

// 适配器
class LoggerAdapter : public Logger {
    LegacyLogger legacy_;
public:
    void info(const std::string& msg) override {
        legacy_.logMessage(0, msg.c_str());
    }
    void error(const std::string& msg) override {
        legacy_.logMessage(3, msg.c_str());
    }
};
```

## 常见场景

### Pimpl 惯用法（编译防火墙）

```cpp
// widget.h
class Widget {
public:
    Widget();
    ~Widget();
    void process();
private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

// widget.cpp
struct Widget::Impl {
    std::vector<int> data;
    void process() { /* 复杂实现 */ }
};

Widget::Widget() : impl_(std::make_unique<Impl>()) {}
Widget::~Widget() = default;
void Widget::process() { impl_->process(); }
```

### CRTP 静态多态

```cpp
// CRTP 替代虚函数实现多态，零运行时开销
template<typename Derived>
class ShapeBase {
public:
    double area() const {
        return static_cast<const Derived*>(this)->computeArea();
    }
};

class Circle : public ShapeBase<Circle> {
    double radius_;
public:
    explicit Circle(double r) : radius_(r) {}
    double computeArea() const { return 3.14159 * radius_ * radius_; }
};

class Square : public ShapeBase<Square> {
    double side_;
public:
    explicit Square(double s) : side_(s) {}
    double computeArea() const { return side_ * side_; }
};
```

## 注意事项

- 不要为了使用模式而使用模式，模式是解决特定问题的工具，不是目标
- C++ 的 RAII 和智能指针可以替代许多传统模式中的资源管理代码
- Lambda 表达式可以简化策略、命令和观察者模式的实现
- 模板和 CRTP 可以在编译期实现某些模式，避免虚函数开销
- 单例模式应谨慎使用，全局状态会增加耦合和测试难度
- 过度使用设计模式会导致代码过度抽象，增加理解成本

## 进阶用法

### 类型擦除（现代 C++ 风格）

```cpp
#include <memory>
#include <functional>

// 使用类型擦除实现类似 std::function 的效果
class Drawable {
    struct Concept {
        virtual ~Concept() = default;
        virtual void draw() const = 0;
    };

    template<typename T>
    struct Model : Concept {
        T obj_;
        Model(T obj) : obj_(std::move(obj)) {}
        void draw() const override { obj_.draw(); }
    };

    std::shared_ptr<const Concept> impl_;
public:
    template<typename T>
    Drawable(T obj) : impl_(std::make_shared<Model<T>>(std::move(obj))) {}

    void draw() const { impl_->draw(); }
};

// 任何有 draw() 方法的类型都可以使用
struct Circle { void draw() const { std::cout << "画圆" << std::endl; } };
struct Square { void draw() const { std::cout << "画方" << std::endl; } };

Drawable d1 = Circle{};
Drawable d2 = Square{};
d1.draw();  // 画圆
d2.draw();  // 画方
```

### 依赖注入

```cpp
#include <memory>

// 接口
class ILogger {
public:
    virtual ~ILogger() = default;
    virtual void log(const std::string& msg) = 0;
};

// 具体实现
class ConsoleLogger : public ILogger {
public:
    void log(const std::string& msg) override {
        std::cout << "[LOG] " << msg << std::endl;
    }
};

// 依赖注入
class Service {
    std::shared_ptr<ILogger> logger_;
public:
    explicit Service(std::shared_ptr<ILogger> logger) : logger_(std::move(logger)) {}

    void doWork() {
        logger_->log("开始工作");
        // ...
        logger_->log("工作完成");
    }
};

// 使用
auto logger = std::make_shared<ConsoleLogger>();
Service svc(logger);
svc.doWork();
```
## 单例模式 Singleton

**基本写法：Meyers 单例**
`static <类型>& <实例>()`
```cpp
// 线程安全的局部静态变量
class Logger {
public:
    static Logger& instance() {
        static Logger inst; // C++11 起线程安全
        return inst;
    }
    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;
private:
    Logger() = default;
};
```

---

## 工厂模式 Factory

**基本写法：简单工厂**
`static <基类指针> create(<类型标识>)`
```cpp
// 根据参数创建不同子类
struct Shape { virtual void draw() = 0; virtual ~Shape() = default; };
struct Circle : Shape { void draw() override {} };
struct Square : Shape { void draw() override {} };

struct ShapeFactory {
    static std::unique_ptr<Shape> create(const std::string& kind) {
        if (kind == "circle") return std::make_unique<Circle>();
        if (kind == "square") return std::make_unique<Square>();
        return nullptr;
    }
};
```

---

**基本写法：抽象工厂**
`struct <抽象工厂接口> { virtual <产品> create() = 0; };`
```cpp
// 工厂接口与具体工厂
struct GUIFactory {
    virtual std::unique_ptr<class Button> makeButton() = 0;
    virtual ~GUIFactory() = default;
};
struct WinFactory : GUIFactory {
    std::unique_ptr<Button> makeButton() override;
};
struct MacFactory : GUIFactory {
    std::unique_ptr<Button> makeButton() override;
};
```

---

## 观察者模式 Observer

**基本写法：订阅/通知**
`<subject>.attach(<observer>); <subject>.notify();`
```cpp
#include <functional>
#include <vector>
struct Subject {
    using Slot = std::function<void(int)>;
    std::vector<Slot> observers;
    void attach(Slot s) { observers.push_back(std::move(s)); }
    void notify(int value) {
        for (auto& s : observers) s(value);
    }
};
// 使用
Subject s;
s.attach([](int v){ std::cout << v; });
s.notify(42);
```

---

## 策略模式 Strategy

**基本写法：函数对象策略**
`std::function<<签名>> <策略>`
```cpp
// 用 std::function 持有策略
struct Context {
    std::function<int(int, int)> strategy;
    int execute(int a, int b) { return strategy(a, b); }
};
Context c;
c.strategy = [](int a, int b){ return a + b; };
c.execute(2, 3); // 5
c.strategy = [](int a, int b){ return a * b; };
c.execute(2, 3); // 6
```

---

## RAII 资源管理

**基本写法：RAII 包装**
`struct <包装类> { <资源> res; ~<类>() { <释放>; } };`
```cpp
// 构造获取资源，析构释放
struct FileGuard {
    FILE* fp;
    explicit FileGuard(const char* path) : fp(fopen(path, "r")) {}
    ~FileGuard() { if (fp) fclose(fp); }
    FileGuard(const FileGuard&) = delete;
    FileGuard& operator=(const FileGuard&) = delete;
};
```

---

## Pimpl 惯用法

**基本写法：指针隐藏实现**
`struct <类> { struct Impl; std::unique_ptr<Impl> pimpl; };`
```cpp
// 头文件 widget.h
class Widget {
public:
    Widget();
    ~Widget(); // 需在源文件定义（因 unique_ptr 完整类型要求）
    void doWork();
private:
    struct Impl;
    std::unique_ptr<Impl> pimpl;
};
// 源文件 widget.cpp 中实现 Impl
```

---

## 模板方法模式

**基本写法：非虚接口模式**
`<基类> { public: void <模板方法>() final; private: virtual void <步骤>() = 0; };`
```cpp
// 基类定义算法骨架
struct Task {
    void run() {        // 模板方法
        step1();
        step2();
    }
    virtual ~Task() = default;
private:
    virtual void step1() = 0;
    virtual void step2() = 0;
};
struct MyTask : Task {
    void step1() override { /* */ }
    void step2() override { /* */ }
};
```

---

## 适配器模式 Adapter

**基本写法：对象适配器**
`struct <适配器> : <目标接口> { <被适配者> adaptee; };`
```cpp
// 适配不同接口
struct Target { virtual void request() = 0; virtual ~Target() = default; };
struct Adaptee { void specificRequest() {} };

struct Adapter : Target {
    Adaptee adaptee;
    void request() override { adaptee.specificRequest(); }
};
```

---

## 装饰器模式 Decorator

**基本写法：包装增强**
`struct <装饰器> : <组件> { <组件*> wrapped; };`
```cpp
// 递归包装
struct Component { virtual void op() = 0; virtual ~Component() = default; };
struct Decorator : Component {
    std::unique_ptr<Component> inner;
    void op() override { inner->op(); }
};
struct LoggingDecorator : Decorator {
    void op() override { std::cout << "log"; Decorator::op(); }
};
```

---

## 命令模式 Command

**基本写法：命令封装**
`struct <命令> { virtual void execute() = 0; };`
```cpp
// 将操作封装为对象
struct Command {
    virtual void execute() = 0;
    virtual ~Command() = default;
};
struct LightOnCmd : Command {
    void execute() override { /* 开灯 */ }
};
// 调用者持有命令
std::vector<std::unique_ptr<Command>> cmds;
cmds.push_back(std::make_unique<LightOnCmd>());
cmds.back()->execute();
```

---

## 现代模式速查

**基本写法：用 lambda 替代策略**
`auto <策略> = [](<参数>) { ... };`
```cpp
// 现代 C++ 倾向用 lambda/std::function 替代部分模式
std::vector<int> v = {3, 1, 4, 1, 5};
std::sort(v.begin(), v.end(), [](int a, int b){ return a > b; });
// 命令模式也可用 std::function
std::vector<std::function<void()>> actions;
actions.push_back([]{ std::cout << "hi"; });
```

## 动手实践：遮代码自检

先只读任务与提示，遮住参考实现自己写，写完再对照答案。

**任务一**：用 C++20 的现代写法重写两个经典模式——策略模式不用继承（`std::function` 或 concepts 约束的模板参数二选一），工厂不用 new（`std::unique_ptr<Shape>` + `make_unique`）；写出策略版「不同税率计算」与工厂版「按名字创建形状」，并回答：`std::function` 版与模板版的取舍（运行时切换 vs 编译期定死、二进制体积）。

**提示**：策略模式的核心是「把变化的算法参数化」——`std::function<double(double)>` 是运行时换绑，`template <TaxPolicy P>` 是编译期换绑（零开销 + 每策略一份代码）。

**参考实现**（先自己写完再看）：

```cpp
#include <functional>
#include <memory>
#include <print>

// 策略（运行时版）
double taxWith(std::function<double(double)> policy, double income) {
    return policy(income);
}
auto flat   = [](double x) { return x * 0.1; };
auto tiered = [](double x) { return x <= 5000 ? 0.0 : (x - 5000) * 0.2; };

// 工厂（RAII 版）
struct Shape { virtual ~Shape() = default; virtual const char* name() const = 0; };
struct Circle : Shape { const char* name() const override { return "circle"; } };
struct Square : Shape { const char* name() const override { return "square"; } };

std::unique_ptr<Shape> makeShape(std::string_view n) {
    if (n == "circle") return std::make_unique<Circle>();
    if (n == "square") return std::make_unique<Square>();
    return nullptr;
}
```

要点自查：`std::function` 的代价（类型擦除 + 可能的堆）换来运行时灵活；模板策略零开销但「策略在编译期写死」——按「策略会不会在运行时换」来选；工厂返回 `unique_ptr` 把所有权责任一起交出去。

**任务二**：反模式辨析——单例在本篇为什么被列为「慎用」？写出线程安全的最小单例（Meyers singleton，C++11 起线程安全）与它的三个问题（全局状态、测试隔离、初始化顺序），再给出「何时仍然合理」的判断（日志、配置这类「天然全局」是否豁免）。

**提示**：C++11 起局部静态变量初始化是线程安全的（magic static），双检锁手写版反而不必再写；单例的本质问题不是「实现难」而是「调用点无法注入替身」。

**参考实现**（先自己写完再看）：

```cpp
class Config {
    Config() = default;
public:
    Config(const Config&) = delete;
    Config& operator=(const Config&) = delete;
    static Config& get() {
        static Config inst;      // C++11 起初始化线程安全
        return inst;
    }
    int timeout() const { return 30; }
};

// 三个问题：调用点 Config::get() 硬编码 → 测试无法注入假配置；
// 全局可变状态 → 多线程竞态风险集中在暗处；析构顺序跨翻译单元不可控。
// 合理场景：真正全局且无状态可替换的基础设施（日志门面、进程级缓存）；
// 业务配置等「理论上会变」的依赖用参数传递，别用单例。
```

要点自查：Meyers singleton 四行写法（私有构造 + delete 拷贝 + 静态局部 get）是面试高频；「能不能给测试造个假的」是单例合理性的最终判据——答不上就别用。
