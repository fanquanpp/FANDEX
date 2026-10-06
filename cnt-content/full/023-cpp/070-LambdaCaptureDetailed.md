---
order: 100
title: Lambda 捕获深水区：值、引用与这份「记住」的代价
module: 'cpp'
category: 计算机科学
difficulty: advanced
description: 承接 Lambda 入门的深水区：按值与按引用捕获的取值时机实验、悬垂引用的真实事故现场、C++14 初始化捕获与 move 捕获、mutable 与 const 传播、*this 捕获，附 use-after-capture 调试实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'cpp/060-LambdaExpression'
  - 'cpp/160-RAIIResourceManagement'
  - 'cpp/120-CppPointers'
prerequisites:
  - 'cpp/060-LambdaExpression'
---

## 前置知识

- 已完成 [Lambda 表达式](/cpp/060-LambdaExpression)：会五段语法、会配合 std::sort。**分工声明：060 建立「随写随用」的心智模型；本篇只回答一个问题——方括号里写下的那一刻，到底发生了什么。** 两篇示例不重复。

## 学习目标

读完本文你将能够：

1. 说出按值捕获与按引用捕获各自的取值时机（定义时 vs 调用时），并用实验证明；
2. 识别闭包比被捕获变量活得久的三类现场，并改写为安全版本；
3. 用 C++14 初始化捕获把 move-only 对象装进闭包；
4. 解释 mutable 与 const 传播的关系，以及为什么异步回调推荐 `[self = *this]`。

预计 60 到 90 分钟。

## 1. 你现在要解决什么问题

060 篇的排序 Lambda 活得很短：定义后立刻被 sort 调用、随即销毁，捕获什么都不会出事。但异步代码里的 Lambda 是「被记住」的——`std::function` 存下它、回调队列排着它，**闭包的寿命可能超过被捕获变量的寿命**。此刻方括号里的每一个字都是生死状：按值捕获安全但可能拷贝大对象，按引用捕获零成本但可能指向亡魂。本文教你为每种场景选对写法。

## 2. 最小可运行示例：取值时机

```cpp
#include <iostream>

int main() {
    int score = 60;
    auto byValue = [score]()  { return score; };   // 定义此刻复制一份
    auto byRef    = [&score]() { return score; };  // 只记地址，调用时去看
    score = 100;
    std::cout << byValue() << '\n';   // 60  —— 快照是旧的
    std::cout << byRef()    << '\n';  // 100 —— 看的是本尊
}
```

预期输出：

```text
60
100
```

一句话结论：**按值捕获在闭包创建时拷贝，按引用捕获在调用时解引用**。这张时序表是后面所有事故分析的总纲。

## 3. 发生了什么：闭包是一个匿名类对象

编译器把 Lambda 翻译成一个匿名类的实例：捕获的每个变量成为它的成员——按值捕获是成员变量（拷贝），按引用捕获是「被捕获变量的引用」成员（本质也是存地址，回收 [指针](/cpp/120-CppPointers) 的图）。调用 `operator()` 时用这些成员。理解这一点，三个推论不证自明：

1. 按值捕获的对象在闭包析构时才销毁——闭包活得久，拷贝就占得久；
2. 按引用捕获失效的条件与悬垂指针完全一致：被引用者先死；
3. `mutable` 修饰的必要性：`operator()` 默认是 const 的，按值捕获的副本默认只读，`mutable` 去掉这层 const。

## 4. 调试实录：闭包比变量活得久

事故现场（异步风格的同步演示）：回调延迟到作用域结束后才执行。

```cpp
#include <functional>
#include <iostream>

std::function<int()> make() {
    int local = 42;
    return [&local]() { return local; };   // 捕获局部变量的引用并逃逸
}

int main() {
    auto fn = make();     // make 返回，local 已销毁
    std::cout << fn() << '\n';   // 未定义行为：读到垃圾或崩溃
}
```

编译期就有警告（`-Wall`）：

```text
warning: address of local variable 'local' retained [-Wreturn-local-addr]
```

修复三选一：`[local]`（按值快照）；`[local = std::move(local)]`（C++14 初始化捕获，资源搬家而非拷贝）；或让被捕获对象的生命周期覆盖闭包（如用 `shared_ptr` 持有）。修完跑一遍 `-fsanitize=address`，你会发现同一份坏代码在 sanitizer 下得到明确报告——与 [指针](/cpp/120-CppPointers) 篇的悬垂实验同一处理流程。

## 5. 核心概念：初始化捕获与 move-only 对象

`std::unique_ptr` 不能拷贝，`[ptr]` 直接编译失败：

```text
error: call to deleted constructor of 'std::unique_ptr<int>'
```

C++14 的初始化捕获解决它：方括号里写「新名字 = 表达式」，用 move 把所有权装进闭包：

```cpp
auto task = [ptr = std::move(ptr)]() { return ptr->get(); };
```

两个配套规则：捕获 `unique_ptr` 的闭包自身是 move-only 的（`std::function` 装不下，需要 `auto` 或 `std::move_only_function`（C++23））；`[*this]`（C++17）捕获对象的**拷贝**，与 `[this]` 捕获指针不同——异步成员回调里后者是悬垂重灾区，前者以拷贝换安全。

## 6. 修改实验

1. 把第 4 节的 `[&local]` 依次改成 `[local]`、`[local = std::move(local)]`（local 换成 `std::string` 以观察 move），各自预测输出并验证；
2. 给按值捕获的计数器 Lambda 加递增语句，观察 const 报错，再加 `mutable` 修复——连续调用两次，观察副本计数「各自为政」；
3. 把 `[&]` 全捕获的大 Lambda 改成显式列出捕获名，用编译错误清单反查「我到底用了哪些外部量」。

## 7. 小练习

预测题（先写答案再运行）：

```cpp
int a = 1;
auto f = [a]() mutable { return ++a; };
auto g = f;
f();
f();
g();
std::cout << f() << ' ' << g() << '\n';
```

（提示：g 是 f 的拷贝——闭包拷贝连捕获副本一起拷。）

修改题：把一个按引用捕获 `std::vector` 的过滤回调改为初始化捕获 + move，使回调自带数据、可安全投递到其他线程；用断言验证回调内数据完整。

修 Bug 题：下面的类成员回调在对象销毁后被队列调用而崩溃，给出两种修复（`[*this]` 拷贝捕获 / 外部 `shared_ptr` 生命周期保证），并说明各自适用的场景：

```cpp
class Worker {
    int id;
public:
    std::function<int()> job() { return [this]() { return id; }; }
};
```

挑战题（不看提示）：实现 `makeAccumulator()`，返回一个可调用对象，每次调用把内部总和增加传入值并返回总和。要求：内部状态不污染外部、闭包可拷贝且各副本独立（与预测题结论呼应）、提供 const 与非 const 两种调用行为说明。

## 8. 什么时候应该 / 不应该按引用捕获

应该：闭包确定在同一作用域内即刻调用（sort 的比较器、for_each）——`[&]` 便捷且无悬垂风险。

不应该：任何逃逸当前作用域的闭包（异步回调、存入容器、跨线程）——显式按值或初始化捕获；捕获大对象仅为读几个字段（按值拷贝浪费，改捕获字段或用视图）。

## 9. 与之前和之后的知识的关系

- 往前：060 的五段语法与 sort 配合是本文的全部前提；120 篇的悬垂指针纪律在「按引用捕获」上原样生效；
- 往后：[RAII](/cpp/160-RAIIResourceManagement) 与智能指针决定「生命周期保证」的工程解；[异步编程](/cpp/420-Cpp20Coroutine)（若走该路线）中回调捕获是每日战场；
- 更远：模板与泛型 Lambda（370 篇起）让闭包成为算法库的胶水。

## 10. 官方文档

- cppreference Lambda 捕获：https://en.cppreference.com/w/cpp/language/lambda#Lambda_capture
- 初始化捕获（C++14）：https://en.cppreference.com/w/cpp/language/lambda#Lambda_capture

## 11. 自我检查

- 能画出「闭包 = 匿名类对象 + 捕获成员」的翻译图；
- 能背出取值时机表并为三类场景选对捕获方式；
- 能复述 move-only 闭包为何装不进 std::function 及两条出路；
- 拿到 use-after-capture 现场知道用 sanitizer 与警告清单定位。

## 本章总结

方括号是契约：按值捕获是创建时的快照（安全、可 mutable、各副本独立），按引用捕获是调用时的回看（零成本、悬垂自负）。闭包活得比变量久的那一刻，初始化捕获与 `[*this]` 是现代 C++ 给你的两条生路。写完方括号，先问一句：**这个闭包会活多久？**

## 下一步

进入 [引用类型](/cpp/080-CppReferenceTypes) 的系统复习与 [移动语义](/cpp/090-RvalueReferenceMoveSemantics)：捕获里频繁出现的 move，正是下一站的主角。
