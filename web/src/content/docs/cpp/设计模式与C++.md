---
order: 58
title: 设计模式与C++
module: cpp
category: C++
difficulty: intermediate
description: GoF设计模式的C++实现
author: fanquanpp
updated: '2026-06-14'
related:
  - cpp/constexpr与编译期计算
  - cpp/命名空间与链接
  - cpp/面向对象进阶
  - cpp/模板元编程
prerequisites:
  - cpp/概述与现代标准
---

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
