---
order: 104
title: 智能指针循环引用
module: cpp
category: 'dev-lang'
difficulty: advanced
description: C++智能指针循环引用问题与weak_ptr解决方案。
author: fanquanpp
updated: '2026-06-14'
related:
  - cpp/完美转发与引用折叠
  - cpp/虚函数表与多态内存布局
  - cpp/Lambda捕获详解
  - cpp/类型萃取与SFINAE
prerequisites:
  - cpp/概述与现代标准
---

## 概述

当两个或多个对象通过 `std::shared_ptr` 相互持有对方的引用时，就形成了循环引用。此时每个对象的引用计数都不会降为零，导致内存永远无法释放。这是 `shared_ptr` 最常见的陷阱，也是引入 `std::weak_ptr` 的主要原因。理解循环引用的产生条件和解决方案，是正确使用智能指针的关键。

## 基础概念

### 循环引用的本质

`shared_ptr` 使用引用计数管理生命周期。当引用计数降为零时，对象被销毁。但在循环引用中，A 持有 B 的 `shared_ptr`，B 也持有 A 的 `shared_ptr`，两者的引用计数始终至少为 1，永远不会被销毁。

### weak_ptr 的角色

`weak_ptr` 是 `shared_ptr` 的观察者，不增加引用计数。它可以从 `shared_ptr` 构造，但需要通过 `lock()` 方法提升为 `shared_ptr` 才能访问对象。如果对象已被销毁，`lock()` 返回空的 `shared_ptr`。

## 快速上手

### 循环引用示例

```cpp
#include <memory>
#include <iostream>

struct Node {
    std::string name;
    std::shared_ptr<Node> next;  // 强引用，增加引用计数

    Node(const std::string& n) : name(n) {
        std::cout << name << " 构造" << std::endl;
    }
    ~Node() {
        std::cout << name << " 析构" << std::endl;
    }
};

int main() {
    {
        auto a = std::make_shared<Node>("节点A");
        auto b = std::make_shared<Node>("节点B");

        a->next = b;  // b 的引用计数变为 2
        b->next = a;  // a 的引用计数变为 2，循环引用形成
    }
    // 离开作用域后，a 和 b 的引用计数各减 1，变为 1
    // 但两者都不会被销毁！内存泄漏！
    std::cout << "作用域结束，但节点未析构" << std::endl;
    return 0;
}
```

### 使用 weak_ptr 打破循环

```cpp
#include <memory>
#include <iostream>

struct Node {
    std::string name;
    std::shared_ptr<Node> next;   // 强引用：下一个节点
    std::weak_ptr<Node> prev;     // 弱引用：上一个节点，不增加引用计数

    Node(const std::string& n) : name(n) {
        std::cout << name << " 构造" << std::endl;
    }
    ~Node() {
        std::cout << name << " 析构" << std::endl;
    }
};

int main() {
    {
        auto a = std::make_shared<Node>("节点A");
        auto b = std::make_shared<Node>("节点B");

        a->next = b;  // b 的引用计数变为 2
        b->prev = a;  // a 的引用计数仍为 1（weak_ptr 不增加）
    }
    // 离开作用域后，a 的引用计数变为 0，a 被销毁
    // 然后 b 的引用计数也变为 0，b 被销毁
    std::cout << "作用域结束，节点已正确析构" << std::endl;
    return 0;
}
```

## 详细用法

### weak_ptr 的基本操作

```cpp
#include <memory>
#include <iostream>

void weakPtrOperations() {
    auto sp = std::make_shared<int>(42);
    std::weak_ptr<int> wp = sp;

    // 检查对象是否仍然存活
    std::cout << "是否过期: " << std::boolalpha << wp.expired() << std::endl;  // false

    // 获取引用计数
    std::cout << "引用计数: " << wp.use_count() << std::endl;  // 1

    // 安全访问：lock() 返回 shared_ptr
    if (auto locked = wp.lock()) {
        std::cout << "值: " << *locked << std::endl;  // 42
    } else {
        std::cout << "对象已被销毁" << std::endl;
    }

    // 销毁对象
    sp.reset();

    // 再次检查
    std::cout << "是否过期: " << wp.expired() << std::endl;  // true

    // lock() 返回空的 shared_ptr
    auto locked2 = wp.lock();
    std::cout << "lock 后是否为空: " << (locked2 == nullptr) << std::endl;  // true
}
```

### 双向链表

```cpp
#include <memory>
#include <string>
#include <iostream>

template<typename T>
class LinkedList {
    struct Node {
        T data;
        std::shared_ptr<Node> next;  // 强引用下一个节点
        std::weak_ptr<Node> prev;    // 弱引用上一个节点

        explicit Node(const T& val) : data(val) {}
    };

    std::shared_ptr<Node> head_;

public:
    void pushFront(const T& value) {
        auto newNode = std::make_shared<Node>(value);
        if (head_) {
            newNode->next = head_;
            head_->prev = newNode;  // weak_ptr 赋值，不增加引用计数
        }
        head_ = newNode;
    }

    void printAll() const {
        auto current = head_;
        while (current) {
            std::cout << current->data << " ";
            current = current->next;
        }
        std::cout << std::endl;
    }

    // 反向遍历（通过 weak_ptr）
    void printReverse() const {
        // 先找到尾节点
        auto tail = head_;
        while (tail && tail->next) {
            tail = tail->next;
        }
        // 从尾到头遍历
        auto current = tail;
        while (current) {
            std::cout << current->data << " ";
            if (auto prev = current->prev.lock()) {
                current = prev;
            } else {
                break;
            }
        }
        std::cout << std::endl;
    }
};
```

### 观察者模式

```cpp
#include <memory>
#include <vector>
#include <algorithm>
#include <iostream>

class Subject;

// 观察者使用 weak_ptr 持有主题引用
class Observer {
    std::weak_ptr<Subject> subject_;
    std::string name_;
public:
    Observer(const std::string& name) : name_(name) {}

    void setSubject(std::shared_ptr<Subject> subj) {
        subject_ = subj;
    }

    void update();

    std::string name() const { return name_; }
};

class Subject : public std::enable_shared_from_this<Subject> {
    std::vector<std::weak_ptr<Observer>> observers_;
    int state_ = 0;
public:
    void attach(std::shared_ptr<Observer> obs) {
        observers_.push_back(obs);
    }

    void setState(int state) {
        state_ = state;
        notify();
    }

    void notify();

    int state() const { return state_; }
};

void Observer::update() {
    if (auto subj = subject_.lock()) {
        std::cout << name_ << " 收到更新: state=" << subj->state() << std::endl;
    } else {
        std::cout << name_ << " 主题已销毁" << std::endl;
    }
}

void Subject::notify() {
    // 清理已销毁的观察者
    auto it = observers_.begin();
    while (it != observers_.end()) {
        if (auto obs = it->lock()) {
            obs->update();
            ++it;
        } else {
            it = observers_.erase(it);
        }
    }
}
```

## 常见场景

### 缓存系统

```cpp
#include <memory>
#include <unordered_map>
#include <string>

template<typename T>
class Cache {
    std::unordered_map<std::string, std::weak_ptr<T>> entries_;
public:
    std::shared_ptr<T> get(const std::string& key) {
        auto it = entries_.find(key);
        if (it != entries_.end()) {
            if (auto cached = it->second.lock()) {
                return cached;  // 缓存命中
            }
            entries_.erase(it);  // 缓存已过期
        }
        return nullptr;
    }

    void put(const std::string& key, std::shared_ptr<T> value) {
        entries_[key] = value;  // weak_ptr 不阻止对象被回收
    }

    void cleanExpired() {
        for (auto it = entries_.begin(); it != entries_.end();) {
            if (it->second.expired()) {
                it = entries_.erase(it);
            } else {
                ++it;
            }
        }
    }
};
```

### 树结构

```cpp
#include <memory>
#include <vector>
#include <string>

class TreeNode {
    std::string name_;
    std::weak_ptr<TreeNode> parent_;  // 弱引用父节点
    std::vector<std::shared_ptr<TreeNode>> children_;  // 强引用子节点
public:
    explicit TreeNode(const std::string& name) : name_(name) {}

    void addChild(std::shared_ptr<TreeNode> child) {
        child->parent_ = shared_from_this();  // weak_ptr 赋值
        children_.push_back(std::move(child));
    }

    std::shared_ptr<TreeNode> parent() const {
        return parent_.lock();  // 安全获取父节点
    }

    const std::string& name() const { return name_; }
};
```

## 注意事项

- 循环引用不仅限于两个对象，三个或更多对象形成的引用环同样会导致泄漏
- `weak_ptr` 不能直接访问对象，必须通过 `lock()` 提升为 `shared_ptr`
- 在多线程环境中，`lock()` 返回后对象可能立即被其他线程销毁，应立即使用返回的 `shared_ptr`
- `enable_shared_from_this` 提供了 `shared_from_this()` 和 `weak_from_this()` 方法，在成员函数中安全获取自身的智能指针
- 不要在构造函数中调用 `shared_from_this()`，此时对象尚未被 `shared_ptr` 管理
- 使用 `weak_ptr` 观察对象时，应在同一次 `lock()` 后完成所有操作，不要多次 `lock()`

## 进阶用法

### enable_shared_from_this

```cpp
#include <memory>

class AsyncHandler : public std::enable_shared_from_this<AsyncHandler> {
public:
    void startAsync() {
        // 错误：使用 [this] 捕获裸指针
        // std::thread([this]() { process(); }).detach();

        // 正确：捕获 shared_ptr，确保对象存活
        auto self = shared_from_this();
        std::thread([self]() {
            self->process();  // self 保持对象存活
        }).detach();
    }

    void process() { /* 异步处理逻辑 */ }
};
```

### weak_ptr 与回调安全

```cpp
#include <functional>
#include <memory>

// 安全的回调绑定器：使用 weak_ptr 防止悬空回调
template<typename T>
std::function<void()> makeSafeCallback(std::weak_ptr<T> weakObj,
                                        void (T::*method)()) {
    return [weakObj, method]() {
        if (auto obj = weakObj.lock()) {
            (obj.get()->*method)();
        }
        // 如果对象已销毁，回调被静默忽略
    };
}

// 使用
class Service : public std::enable_shared_from_this<Service> {
public:
    void onTimer() { std::cout << "定时器触发" << std::endl; }

    void registerTimer() {
        auto callback = makeSafeCallback(weak_from_this(), &Service::onTimer);
        // 注册回调，即使 Service 被销毁也不会崩溃
    }
};
```
