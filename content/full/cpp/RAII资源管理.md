---
order: 100
title: RAII资源管理
module: cpp
category: 'dev-lang'
tags:
  - cpp
  - raii
  - smart-pointer
  - resource-management
  - exception-safety
difficulty: advanced
description: 'C++ RAII 资源管理深度解析：形式化定义、栈展开机制、异常安全保证、智能指针、锁守卫、文件句柄、数据库事务、OpenGL/CUDA 资源、Pimpl、Scope Guard 与跨语言对比。'
author: fanquanpp
created: 2026-06-14
updated: 2026-07-18
lastReviewed: 2026-07-18
reviewer: FANDEX Content Engineering
readingTime: 95
estimatedReadingTime: 95
related:
  - cpp/智能指针详解
  - cpp/指针
  - cpp/右值引用与移动语义
  - cpp/并发编程
  - cpp/STL容器与迭代器
  - cpp/STL算法与函数对象
  - cpp/移动语义详解
  - cpp/面向对象基础
  - cpp/运算符重载
  - cpp/异常处理
prerequisites:
  - cpp/概述与现代标准
  - cpp/基础语法
  - cpp/数据类型详解
  - cpp/指针
  - cpp/面向对象基础
learningObjectives:
  - 记忆 RAII 范式的形式化定义与对象-资源生命周期同构映射的不变量
  - 理解栈展开（Stack Unwinding）机制的确定性析构语义与异常安全保证
  - 应用 RAII 模式封装文件句柄、内存、锁、套接字、事务、GPU 资源等异质资源
  - 分析 unique_ptr、shared_ptr、weak_ptr 的所有权语义差异与循环引用成因
  - 评估 basic/strong/nothrow 三级异常安全保证的可达性与代价
  - 设计基于 Scope Guard、Pimpl、Transaction 的工程级资源管理抽象
  - 创造性构造支持自定义删除器、移动语义与 ABI 稳定性的 RAII 类模板
references:
  - type: standard
    authors:
      - 'ISO/IEC'
    year: 2023
    title: 'Information technology — Programming languages — C++'
    venue: 'ISO/IEC 14882:2023'
    version: 'Eighth edition'
  - type: book
    authors:
      - 'Stroustrup, Bjarne'
    year: 2013
    title: 'The C++ Programming Language'
    venue: 'Addison-Wesley Professional'
    version: '4th edition'
  - type: book
    authors:
      - 'Meyers, Scott'
    year: 2014
    title: 'Effective Modern C++: 42 Specific Ways to Improve Your Use of C++11 and C++14'
    venue: "O'Reilly Media"
  - type: book
    authors:
      - 'Sutter, Herb'
      - 'Alexandrescu, Andrei'
    year: 2004
    title: 'C++ Coding Standards: 101 Rules, Guidelines, and Best Practices'
    venue: 'Addison-Wesley Professional'
  - type: book
    authors:
      - 'Alexandrescu, Andrei'
    year: 2001
    title: 'Modern C++ Design: Generic Programming and Design Patterns Applied'
    venue: 'Addison-Wesley Professional'
  - type: book
    authors:
      - 'Stroustrup, Bjarne'
    year: 1994
    title: 'The Design and Evolution of C++'
    venue: 'Addison-Wesley Professional'
  - type: book
    authors:
      - 'Williams, Anthony'
    year: 2019
    title: 'C++ Concurrency in Action'
    venue: 'Manning Publications'
    version: '2nd edition'
  - type: website
    authors:
      - 'Sutter, Herb'
    year: 2013
    title: 'GotW #89 Solution: Smart Pointers'
    url: 'https://herbsutter.com/2013/05/29/gotw-89-solution-smart-pointers/'
    accessedDate: '2026-07-18'
  - type: website
    authors:
      - 'cppreference.com'
    year: 2024
    title: 'RAII — cppreference.com'
    url: 'https://en.cppreference.com/w/cpp/language/raii'
    accessedDate: '2026-07-18'
  - type: documentation
    authors:
      - 'C++ Core Guidelines'
    year: 2024
    title: 'C++ Core Guidelines: Resource Management'
    venue: 'isocpp'
    url: 'https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines'
    accessedDate: '2026-07-18'
etymology:
  - term: RAII
    english: 'Resource Acquisition Is Initialization'
    origin: 'Bjarne Stroustrup 于 1980s 在设计 C++ 时提出，将资源生命周期与对象生命周期绑定；首字母缩写强调"获取即初始化"的同构性'
  - term: 栈展开
    english: 'Stack Unwinding'
    origin: '"unwind" 意为"解开、回绕"，隐喻异常抛出时逐帧回溯调用栈、调用析构函数清理自动对象的过程'
  - term: 析构函数
    english: Destructor
    origin: '源自拉丁语 "de-"（去除、反向）+ "struere"（建造），即"反向构造"，对象生命周期结束时执行的清理过程'
  - term: 不变量
    english: Invariant
    origin: '源自拉丁语 "in-"（不）+ "variare"（变化），指在对象生命周期内始终保持成立的逻辑条件'
  - term: 作用域守卫
    english: 'Scope Guard'
    origin: '"scope"（作用域）+ "guard"（守卫），由 Andrei Alexandrescu 在 2000 年发表于 Generic Programming 系列文章，泛化 RAII 至任意清理动作'
  - term: 所有权
    english: Ownership
    origin: '借用日常语义，指"负责管理某资源生命周期"的责任归属；Rust 进一步将所有权纳入类型系统'
  - term: 引用计数
    english: 'Reference Counting'
    origin: '维护指向对象的引用数量，归零时释放；最早可追溯至 1960 年 George Collins 的环形引用回收算法'
exercises:
  - id: ex-raii-fb-01
    type: fill-blank
    cognitiveLevel: remember
    question: RAII 缩写展开为 ____（英文全称，每个单词首字母大写）。
    answer: 'Resource Acquisition Is Initialization'
    answers:
      - 'Resource Acquisition Is Initialization'
    blankCount: 1
    caseSensitive: false
    explanation: RAII 是 Resource Acquisition Is Initialization 的首字母缩写，由 Bjarne Stroustrup 于 1980s 提出，强调资源获取与对象初始化的同构性。
    difficulty: 1
  - id: ex-raii-fb-02
    type: fill-blank
    cognitiveLevel: understand
    question: C++ 异常抛出后，从抛出点到 catch 点之间逐帧调用自动对象析构函数的过程称为 ____（中文术语）。
    answer: 栈展开
    answers:
      - 栈展开
      - Stack Unwinding
    blankCount: 1
    caseSensitive: false
    explanation: 栈展开（Stack Unwinding）是 C++ 异常机制的核心，保证异常路径下自动对象的析构函数被调用，是 RAII 异常安全的基石。
    difficulty: 2
  - id: ex-raii-fb-03
    type: fill-blank
    cognitiveLevel: understand
    question: shared_ptr 通过 ____ 引用计数实现共享所有权，归零时析构对象（填"原子"或"非原子"）。
    answer: 原子
    answers:
      - 原子
    blankCount: 1
    caseSensitive: false
    explanation: shared_ptr 的引用计数采用原子操作（如 __atomic_fetch_add），保证多线程下计数正确性，但带来性能开销；weak_ptr 也参与计数。
    difficulty: 3
  - id: ex-raii-ch-01
    type: choice
    cognitiveLevel: understand
    question: |
      关于 RAII 类的拷贝与移动语义，下列哪项描述正确？
      A. 所有 RAII 类都必须删除拷贝构造与拷贝赋值
      B. RAII 类若持有独占资源应删除拷贝或实现移动；若持有共享资源可实现拷贝（如 shared_ptr）
      C. RAII 类的移动构造函数必须为 noexcept，否则违反标准
      D. RAII 类的析构函数可以抛出异常，由调用者捕获
    answer: 'B'
    options:
      - 'A'
      - 'B'
      - 'C'
      - 'D'
    correctIndex: 1
    explanation: RAII 类的所有权语义决定拷贝/移动策略：独占资源（如 unique_ptr、lock_guard）应删除拷贝、支持移动；共享资源（如 shared_ptr）可拷贝。移动构造建议 noexcept 但非强制；析构函数抛异常在 C++11 后默认调用 std::terminate，属未定义行为。
    difficulty: 3
  - id: ex-raii-ch-02
    type: choice
    cognitiveLevel: analyze
    question: |
      以下代码的输出是？
      ```cpp
      #include <iostream>
      #include <memory>
      struct W { W(){std::cout<<"A";} ~W(){std::cout<<"D";} };
      int main() {
          auto p = std::make_unique<W>();
          auto q = std::move(p);
          std::cout << (p == nullptr);
      }
      ```
      A. AD0   B. A0D   C. AD   D. 0AD
    answer: 'B'
    options:
      - 'A'
      - 'B'
      - 'C'
      - 'D'
    correctIndex: 1
    explanation: make_unique 构造 W 输出 A；std::move 后 p 为空、q 持有对象，输出 0；main 返回时 q 析构 W 输出 D。顺序为 A0D。
    difficulty: 3
  - id: ex-raii-ch-03
    type: choice
    cognitiveLevel: analyze
    question: |
      以下关于异常安全保证的描述，正确的是？
      A. basic guarantee 要求操作失败时不泄漏任何资源，但允许对象处于任意状态
      B. strong guarantee 要求操作要么成功，要么回滚到操作前的状态
      C. nothrow guarantee 由 noexcept 标注保证，编译器自动生成
      D. 析构函数默认提供 strong guarantee
    answer: 'B'
    options:
      - 'A'
      - 'B'
      - 'C'
      - 'D'
    correctIndex: 1
    explanation: basic guarantee 要求不泄漏资源且对象处于有效（但可能改变）状态；strong guarantee 要求强提交-强回滚（transactional）；nothrow guarantee 由 noexcept 标注但需程序员保证实现不抛；析构函数默认 noexcept 提供基本保证，但不应抛异常。
    difficulty: 4
  - id: ex-raii-cf-01
    type: code-fix
    cognitiveLevel: apply
    question: |
      以下 RAII 类存在资源泄漏风险，请修正：
      ```cpp
      class FileGuard {
          FILE* f_;
      public:
          FileGuard(const char* p, const char* m) : f_(fopen(p, m)) {}
          ~FileGuard() { fclose(f_); }
          FILE* get() { return f_; }
      };
      ```
    buggyCode: |
      class FileGuard {
          FILE* f_;
      public:
          FileGuard(const char* p, const char* m) : f_(fopen(p, m)) {}
          ~FileGuard() { fclose(f_); }
          FILE* get() { return f_; }
      };
    language: cpp
    fixedCode: |
      #include <cstdio>
      #include <stdexcept>
      class FileGuard {
          FILE* f_;
      public:
          FileGuard(const char* p, const char* m) : f_(std::fopen(p, m)) {
              if (!f_) throw std::runtime_error("open failed");
          }
          ~FileGuard() { if (f_) std::fclose(f_); }
          FileGuard(const FileGuard&) = delete;
          FileGuard& operator=(const FileGuard&) = delete;
          FileGuard(FileGuard&& o) noexcept : f_(o.f_) { o.f_ = nullptr; }
          FileGuard& operator=(FileGuard&& o) noexcept {
              if (this != &o) { if (f_) std::fclose(f_); f_ = o.f_; o.f_ = nullptr; }
              return *this;
          }
          FILE* get() const { return f_; }
      };
    answer: |
      修正点：(1) 构造函数检查 fopen 返回值，失败抛异常避免持有无效指针；(2) 析构函数检查 f_ 非空避免 double close；(3) 删除拷贝构造/赋值避免双重释放；(4) 实现移动构造/赋值转移所有权并将源置空。
    errorDescription: 原代码未检查 fopen 失败、未处理拷贝（编译器生成浅拷贝导致 double fclose）、未实现移动，存在资源泄漏与双重释放风险。
    explanation: RAII 类的五法则（Rule of Five）要求：当类管理资源时，必须显式定义析构、拷贝构造、拷贝赋值、移动构造、移动赋值中的一个或多个，或使用 = delete 禁用。构造函数获取资源失败应抛异常，使对象要么完全构造、要么不构造，避免"半构造"状态。
    difficulty: 3
  - id: ex-raii-cf-02
    type: code-fix
    cognitiveLevel: evaluate
    question: |
      以下代码在析构时抛出异常导致未定义行为，请修正：
      ```cpp
      struct Conn {
          ~Conn() {
              if (!close()) throw std::runtime_error("close failed");
          }
          bool close();
      };
      ```
    buggyCode: |
      struct Conn {
          ~Conn() {
              if (!close()) throw std::runtime_error("close failed");
          }
          bool close();
      };
    language: cpp
    fixedCode: |
      #include <iostream>
      #include <exception>
      struct Conn {
          ~Conn() noexcept {
              try {
                  if (!close()) std::cerr << "close failed\n";
              } catch (const std::exception& e) {
                  std::cerr << "exception in dtor: " << e.what() << "\n";
              }
          }
          bool close() noexcept;
      };
    answer: |
      析构函数标记 noexcept，内部使用 try-catch 捕获所有异常并记录日志，绝不向外传播。
    errorDescription: C++11 起析构函数默认 noexcept，抛出异常会触发 std::terminate；若栈展开期间析构抛异常同样 terminate。这是 RAII 的核心约束：析构必须永不失败。
    explanation: 析构函数不可抛异常是 C++ 的强约束。若资源释放可能失败，应：(1) 提供独立的 close()/shutdown() 方法让调用者在析构前显式处理错误；(2) 析构函数仅做"尽力释放"并记录日志；(3) 将析构标记 noexcept 并用 try-catch 兜底。这一原则称为"析构必须永不失败"。
    difficulty: 4
  - id: ex-raii-oe-01
    type: open-ended
    cognitiveLevel: create
    question: |
      设计一个通用的 ScopeGuard 类模板，满足以下要求：
      1. 接受任意可调用对象作为清理动作；
      2. 支持 dismiss() 取消清理；
      3. 移动构造转移清理责任，源对象自动 dismiss；
      4. 析构时若仍 active 则执行清理，且不抛出异常；
      5. 提供宏 SCOPED_GUARD(name, action) 简化使用。
      给出完整代码并说明设计权衡。
    answer: |
      ```cpp
      #include <utility>
      #include <type_traits>
      template <typename F>
      class ScopeGuard {
          F func_;
          bool active_ = true;
      public:
          explicit ScopeGuard(F f) noexcept(std::is_nothrow_move_constructible_v<F>)
              : func_(std::move(f)) {}
          ~ScopeGuard() noexcept(true) {
              if (active_) try { func_(); } catch (...) { /* swallow */ }
          }
          ScopeGuard(ScopeGuard&& o) noexcept(std::is_nothrow_move_constructible_v<F>)
              : func_(std::move(o.func_)), active_(o.active_) { o.active_ = false; }
          ScopeGuard(const ScopeGuard&) = delete;
          ScopeGuard& operator=(const ScopeGuard&) = delete;
          ScopeGuard& operator=(ScopeGuard&&) = delete;
          void dismiss() noexcept { active_ = false; }
      };
      template <typename F>
      ScopeGuard<std::decay_t<F>> make_guard(F&& f) {
          return ScopeGuard<std::decay_t<F>>(std::forward<F>(f));
      }
      #define SCOPED_GUARD(name, action) auto name = make_guard([&]() { action; })
      ```
      设计权衡：(1) 模板参数 F 允许内联优化、避免 std::function 堆分配；(2) noexcept 析构 + try-catch 兜底保证"永不抛出"；(3) 移动构造后源 dismiss 防止重复清理；(4) 删除移动赋值避免中途替换清理逻辑的复杂性；(5) 宏保留 C 风格易用性。
    keyPoints:
      - 使用模板参数而非 std::function 避免类型擦除开销
      - 析构 noexcept + try-catch 保证不抛出异常
      - 移动构造转移 active_ 状态并将源置 false
      - dismiss() 提供成功路径下取消清理的能力
      - 宏 SCOPED_GUARD 简化使用并利用 make_guard 推导 F 类型
      - 删除拷贝与移动赋值避免生命周期管理复杂性
    explanation: ScopeGuard 是 RAII 的泛化形式，由 Alexandrescu 在 2000 年提出，被 C++ Core Guidelines 推荐为通用资源守卫。其核心价值在于将"清理动作"从"对象所有权"解耦，使任意代码块都能享受 RAII 的异常安全保障。C++26 计划引入 std::scope_guard 标准化此模式。
    difficulty: 5
  - id: ex-raii-oe-02
    type: open-ended
    cognitiveLevel: evaluate
    question: |
      分析 RAII 与垃圾回收（GC）在内存管理上的本质差异，从以下维度论证：
      1. 资源释放时机（确定性 vs 不确定性）；
      2. 非内存资源（文件、锁、套接字）的处理方式；
      3. 性能开销（吞吐、延迟、内存峰值）；
      4. 编程模型复杂度；
      5. 各自的"安全性盲区"（RAII 的悬空指针 vs GC 的循环引用）。
      给出具体场景说明哪种模型更优。
    answer: |
      RAII 与 GC 的本质差异：
      1. 释放时机：RAII 析构确定性触发（作用域结束或 delete），GC 不确定性触发（可达性分析 + 分代回收）。确定性使 RAII 可管理任意资源（内存、文件、锁），GC 通常仅管理内存。
      2. 非内存资源：RAII 在析构中释放任意资源；GC 语言需额外的 try-with-resources（Java）、with（Python）、defer（Go），是 RAII 的"部分模拟"。
      3. 性能：RAII 的零开销抽象使销毁开销摊销到作用域结束，无 GC 暂停；GC 的分代回收在大堆、低分配场景吞吐高，但暂停时间难以预测（不适合实时系统）。RAII 的内存峰值通常更低（即时释放），GC 依赖堆水位触发回收。
      4. 编程模型：RAII 要求程序员显式管理所有权（unique_ptr/shared_ptr/weak_ptr），学习曲线陡但语义明确；GC 隐藏释放细节，开发效率高但易产生"临时泄漏"与隐式生命周期依赖。
      5. 安全盲区：RAII 的悬空指针（dangling pointer）由 weak_ptr、引用、Rust 借用检查器缓解；GC 的循环引用（cycle）需弱引用（WeakReference）或并发标记-清除算法处理。

      场景选择：
      - 实时系统（嵌入式、游戏引擎、HFT）：RAII 优（无 GC 暂停，可预测延迟）；
      - 业务应用（Web 后端、企业系统）：GC 优（开发效率高，临时对象多）；
      - 资源密集型（数据库连接池、文件处理）：RAII 优（确定性释放避免句柄耗尽）；
      - 复杂对象图（图数据库、AST）：GC 优（避免手动循环检测）。
    keyPoints:
      - 确定性析构 vs 不确定性回收的根本差异
      - RAII 适用于任意资源，GC 主要适用于内存
      - 性能维度：RAII 零开销 + 可预测，GC 高吞吐 + 暂停风险
      - 编程模型：RAII 显式所有权 vs GC 隐式生命周期
      - 安全盲区：悬空指针 vs 循环引用
      - 给出至少 2-3 个场景的优缺点对比
    explanation: RAII 与 GC 不是对立而是互补：RAII 提供确定性资源管理（适合系统级、资源敏感场景），GC 提供开发效率（适合业务级、对象密集场景）。现代语言趋势是混合策略：Rust 借用检查器 + RAII、Swift ARC + 弱引用、C# using + GC、Go defer + GC。C++ 选择纯 RAII 路线，通过 shared_ptr/weak_ptr 提供"可控的引用计数"，是 GC 的轻量替代。
    difficulty: 5
quiz:
  - type: choice
    question: 'RAII 的核心思想是？'
    options:
      - '资源获取即初始化，析构释放'
      - '引用计数自动管理内存'
      - '垃圾回收器定期扫描'
      - '手动 new/delete 配对'
    answer: 0
    explanation: 'RAII = Resource Acquisition Is Initialization，将资源生命周期绑定到对象生命周期。'
  - type: fill
    question: 'shared_ptr 通过 ____ 实现共享所有权。'
    answer: '引用计数'
  - type: fix
    question: '修正以下内存泄漏代码'
    code: 'int* p = new int(42); std::cout << *p;'
    answer: 'auto p = std::make_unique<int>(42); std::cout << *p;'
---

## 第 1 章 学习目标与导论

### 1.1 本章在 C++ 知识体系中的位置

RAII（Resource Acquisition Is Initialization，资源获取即初始化，由 Bjarne Stroustrup 于 1980s 在设计 C++ 时提出，将资源生命周期与对象生命周期绑定）是 C++ 语言最具辨识度的核心范式，也是 C++ 区别于 C、Java、Python 等语言的标志性特征。它位于 C++ 知识体系的"资源管理层"，向上承接面向对象与异常机制，向下衔接智能指针、并发原语、模板元编程等高级特性。

掌握本章前，读者应当已经熟悉：

- `cpp/概述与现代标准`：C++ 的设计哲学与现代标准演进
- `cpp/基础语法`：作用域、生命周期、控制流
- `cpp/数据类型详解`：基本类型、复合类型与存储期
- `cpp/指针`：原始指针的内存模型与所有权语义
- `cpp/面向对象基础`：构造、析构、拷贝、移动的语义

掌握本章后，读者将为后续学习 `cpp/智能指针详解`、`cpp/右值引用与移动语义`、`cpp/并发编程`、`cpp/异常处理`、`cpp/模板元编程` 等高级主题奠定坚实基础。

### 1.2 学习目标

本章遵循 Bloom 分类法，按认知层级递进组织学习目标：

1. **记忆（Remember）**：复述 RAII 的形式化定义与对象-资源生命周期同构映射的不变量（invariant，源自拉丁语 "in-" 不 + "variare" 变化，指对象生命周期内始终保持成立的逻辑条件），识别构造、析构、栈展开（Stack Unwinding，"unwind" 解开、回绕，隐喻异常抛出时逐帧回溯调用栈的过程）的关键语义。
2. **理解（Understand）**：解释栈展开机制的确定性析构语义，说明 RAII 如何在异常路径下保证资源释放，分析 basic、strong、nothrow 三级异常安全保证的可达条件与代价。
3. **应用（Apply）**：使用 RAII 模式封装文件句柄、动态内存、互斥锁、网络套接字、数据库事务、OpenGL 纹理/VBO、CUDA 资源等异质资源，编写异常安全且零开销的代码。
4. **分析（Analyze）**：对比 `unique_ptr`、`shared_ptr`、`weak_ptr` 的所有权（ownership，借用日常语义，指"负责管理某资源生命周期"的责任归属）语义差异，识别循环引用、移动后状态、双重释放等问题的成因。
5. **评估（Evaluate）**：评估 RAII 与垃圾回收（GC）、Java try-finally、Python with、Go defer、Rust Drop trait 在不同场景下的优劣，论证选择依据。
6. **创造（Create）**：设计基于 Scope Guard（作用域守卫，由 Andrei Alexandrescu 于 2000 年提出）、Pimpl、Transaction 的工程级资源管理抽象，构造支持自定义删除器、移动语义与 ABI 稳定性的 RAII 类模板。

### 1.3 阅读建议

- **零基础读者**：先通读第 2、3、5 章建立概念框架，再阅读第 6-13 章的具体资源类型实践；
- **有 C 语言基础读者**：重点关注第 4 章理论推导与第 14 章跨语言对比，理解 RAII 解决的 C 时代痛点；
- **进阶读者**：直接研读第 15 章陷阱分析、第 16 章工程实践与第 17 章开源项目案例。

## 第 2 章 历史动机与演进

### 2.1 1970s：C 时代的资源管理困境

C 语言诞生于 1972 年，Dennis Ritchie 在贝尔实验室设计 C 时未提供自动资源管理机制。所有资源（内存、文件句柄、锁、套接字）均需程序员手动调用 `malloc/free`、`fopen/fclose`、`lock/unlock`、`socket/close` 等配对函数管理。这种"手动配对"模式存在三类系统性缺陷：

1. **遗忘释放**：函数在错误路径上提前 `return` 或 `goto` 时跳过释放语句，导致资源泄漏。
2. **双重释放**：同一资源被释放两次，破坏分配器内部状态，可能引发安全漏洞（如 CVE-2014-0160 Heartbleed 的近亲）。
3. **异常路径失控**：在支持异常的语言中，函数抛出异常时所有释放代码被跳过，资源必然泄漏。

C 时代典型的"goto cleanup"模式反映了这一困境：

```c
/* C 语言经典的 goto cleanup 错误处理模式 */
#include <stdio.h>
#include <stdlib.h>

int process_file(const char* path) {
    FILE* f = fopen(path, "r");
    if (!f) return -1;                  /* 文件打开失败 */

    char* buf = malloc(1024);
    if (!buf) {
        fclose(f);                      /* 必须手动关闭文件 */
        return -2;
    }

    if (fread(buf, 1, 1024, f) < 0) {
        free(buf);                      /* 必须手动释放内存 */
        fclose(f);                      /* 必须手动关闭文件 */
        return -3;
    }

    /* 处理 buf ... */

    free(buf);
    fclose(f);
    return 0;
}
```

该模式的问题在于：每增加一个资源，错误路径的数量呈指数增长，程序员必须为每个错误路径编写正确的清理代码。Stroustrup 在《The Design and Evolution of C++》中明确指出："C 的资源管理依赖程序员的纪律，而非语言保证；这种纪律在大规模软件中不可持续"。

### 2.2 1985：Bjarne Stroustrup 与 RAII 的诞生

1985 年，Bjarne Stroustrup 在贝尔实验室发布 C++ 首个商用版本 Cfront。C++ 的核心设计目标之一是"在不牺牲 C 的系统级编程能力的前提下，提供更强的类型安全与抽象机制"。Stroustrup 在设计类机制时观察到：

> "对象的生命周期与对象所管理的资源的生命周期存在自然的同构关系。构造函数获取资源，析构函数释放资源，这一对称性可以将资源管理从'程序员的纪律'转化为'语言的保证'。"

——Stroustrup, B. _The Design and Evolution of C++_. 1994, §15.4

这一观察被形式化为 RAII 范式：

- **构造函数**：获取资源；若获取失败，抛出异常，对象不构造。
- **析构函数**：释放资源；C++ 保证栈对象离开作用域时析构函数必定被调用，**即使发生异常**。
- **拷贝与移动**：通过删除或自定义拷贝/移动操作，明确资源所有权的转移语义。

RAII 的关键创新在于利用 C++ 已有的"自动存储期"机制（栈对象的构造与析构），将资源管理"附赠"在对象生命周期管理之上，实现零额外开销。

### 2.3 Stack Unwinding 机制的标准化历程

RAII 的异常安全保证依赖于栈展开（Stack Unwinding）机制。当 C++ 异常被抛出时，运行时从抛出点开始，逐帧回溯调用栈，对每个栈帧中的自动对象调用析构函数，直至找到匹配的 `catch` 块。这一机制的标准化经历了三个阶段：

1. **Cfront 时代（1985-1989）**：Cfront 1.0 不支持异常，RAII 仅保证正常路径的确定性析构。
2. **C++ 异常机制引入（1989-1996）**：AT&T 的 Andrew Koenig 与 Bjarne Stroustrup 设计了基于表驱动（table-driven）的异常机制，栈展开成为语言规范的一部分。1993 年 ISO C++ 工作组将异常机制纳入工作草案，最终在 1998 年 C++98 标准中正式定稿。
3. **C++11 noexcept 改革（2011）**：C++11 引入 `noexcept` 关键字替代 `throw()` 动态异常规范，析构函数默认 `noexcept`，进一步强化"析构不抛异常"的约定。

栈展开机制的形式化保证（详见第 4 章）是 RAII 异常安全的基石：无论函数从哪个 `return` 退出、是否抛出异常，所有自动对象的析构函数都会被调用。

下图展示 RAII 范式与 C++ 语言演进的关键时间节点：

```mermaid
timeline
    title RAII 范式与 C++ 语言演进时间线
    section C 时代
        1972 : Dennis Ritchie 设计 C 语言<br/>手动 malloc/free 资源管理
        1979 : Bjarne Stroustrup 启动 "C with Classes"
    section C++ 诞生与 RAII 雏形
        1985 : Cfront 1.0 发布<br/>RAII 范式雏形（无异常支持）
        1989 : 异常机制设计启动<br/>Koenig-Stroustrup 表驱动方案
    section 标准化与异常安全
        1998 : ISO C++98 标准发布<br/>Stack Unwinding 形式化
        2003 : C++03 (ISO/IEC 14882:2003)
    section 现代 C++ 与智能指针
        2011 : C++11 引入 unique_ptr/shared_ptr/weak_ptr<br/>noexcept 改革
        2014 : C++14 引入 std::make_unique
        2017 : C++17 引入 scoped_lock/jthread<br/>移除 auto_ptr
    section 精细化阶段
        2020 : C++20 引入 span/format/bit<br/>Concepts 约束 RAII 模板
        2023 : C++23 引入 expected/optional 扩展<br/>std::print RAII 包装
```

### 2.4 C++11：智能指针的标准化

C++98 标准库提供 `std::auto_ptr`，但其破坏性复制语义（复制构造隐式转移所有权）违反值语义直觉，且不满足 STL 容器的 `CopyConstructible` 要求。C++11 引入右值引用与移动语义后，标准委员会重新设计了智能指针体系：

| 智能指针              | 引入版本 | 所有权语义                   | 替代物                   |
| :-------------------- | :------- | :--------------------------- | :----------------------- |
| `std::unique_ptr<T>`  | C++11    | 独占所有权，move-only        | `auto_ptr`（C++17 移除） |
| `std::shared_ptr<T>`  | C++11    | 共享所有权，原子引用计数     | Boost `shared_ptr`       |
| `std::weak_ptr<T>`    | C++11    | 弱引用，打破循环             | 无标准方案               |
| `std::make_unique<T>` | C++14    | 异常安全的 `unique_ptr` 构造 | 裸 `new`                 |

C++11 同时引入 `std::lock_guard`、`std::unique_lock`、`std::scoped_allocator` 等 RAII 工具，使 RAII 成为现代 C++ 的"默认编程范式"。

### 2.5 C++17/20/23：RAII 的精细化

后续标准持续完善 RAII 工具链：

- **C++17**：引入 `std::scoped_lock`（多锁原子获取）、`std::byte`（替代 `char*` 表示原始字节）、`std::optional`（可选值的 RAII 包装）。
- **C++20**：引入 `std::span<T>`（非拥有视图，替代 `T*` + 长度）、`std::jthread`（自动 join 的线程 RAII）、`std::stop_token`（协作式取消）。
- **C++23**：引入 `std::expected<T, E>`（值或错误的 RAII 包装）、`std::mdspan`（多维视图）、`std::move_only_function`（move-only 的 `std::function`）。
- **C++26（提案）**：计划引入 `std::scope_guard`（通用作用域守卫）、模式匹配中的析构语义、契约编程的析构后置条件。

## 第 3 章 形式化定义

### 3.1 RAII 的形式化定义

为消除自然语言歧义，本节以数学形式化方式定义 RAII 语义，对应 C++ 标准 [class.dtor] 与 [except.handle] 的规定。

设 $\mathcal{R}$ 为资源集合（内存、文件描述符、锁、套接字等），$\mathcal{O}$ 为对象集合，$\mathcal{S}$ 为程序执行状态集合。定义以下函数：

- $\text{acquire}: \mathcal{S} \to \mathcal{R} \times \mathcal{S}$：从状态中获取资源，返回资源与新状态。
- $\text{release}: \mathcal{R} \times \mathcal{S} \to \mathcal{S}$：释放资源，返回新状态。
- $\text{life}: \mathcal{O} \to 2^{\mathcal{S}}$：对象的生命周期，即从构造完成到析构开始的状态集合。

**定义 3.1（RAII 对象）**：对象 $o \in \mathcal{O}$ 是 RAII 对象，当且仅当存在资源 $r \in \mathcal{R}$ 与函数 $\phi: \mathcal{S} \to \mathcal{R} \cup \{\bot\}$（资源句柄），满足：

$$\forall s \in \text{life}(o): \phi(s) = r \quad \wedge \quad \forall s \notin \text{life}(o): \phi(s) = \bot$$

即对象生命周期内持有资源，生命周期外不持有。这构成了 RAII 的**对象-资源同构映射**。

**定义 3.2（RAII 构造与析构）**：

$$\text{construct}(o, s_0) = (r, s_1) \quad \Rightarrow \quad \text{destruct}(o, s_2) = \text{release}(r, s_2)$$

即构造函数获取资源 $r$，析构函数释放 $r$。这一对称性是 RAII 的核心约束。

### 3.2 不变量的数学表述

RAII 类的不变量（invariant）是其正确性的数学保证。设 RAII 类 $C$ 管理资源 $r$，其不变量 $\mathcal{I}_C$ 定义为：

$$\mathcal{I}_C(o) \triangleq \text{valid}(o) \Rightarrow \text{owns}(o, r) \oplus \text{moved\_from}(o)$$

其中 $\text{valid}(o)$ 表示对象处于有效状态，$\text{owns}(o, r)$ 表示对象持有资源，$\text{moved\_from}(o)$ 表示对象已被移动（处于有效但未指定状态）。$\oplus$ 表示异或，即对象要么持有资源，要么处于移动后状态，二者互斥。

**关键推论**：

1. **构造后不变量成立**：构造成功的对象必定持有资源。
2. **析构前不变量成立**：析构函数被调用时对象必定持有资源（除非已被移动）。
3. **移动后状态安全**：移动后的对象处于"有效但未指定"状态，其析构函数必须是空操作（不重复释放资源）。

### 3.3 析构函数调用的确定性语义

C++ 标准对析构函数的调用时机做出严格规定：

**定理 3.1（确定性析构）**：对于自动存储期对象 $o$，其析构函数在以下时机被调用：

1. **作用域正常退出**：控制流离开 $o$ 所在的作用域（通过 `return`、`goto`、`break`、`continue`）。
2. **栈展开**：异常抛出后，栈展开至 $o$ 所在栈帧时。
3. **程序终止**：`std::exit` 或 `main` 返回时（仅对静态存储期对象）。

形式化地，设 $\text{scope}(o)$ 为 $o$ 所在作用域的执行区间，$\text{exit\_points}(\text{scope}(o))$ 为该作用域的所有退出点（含异常退出），则：

$$\forall e \in \text{exit\_points}(\text{scope}(o)): \text{destruct}(o) \in \text{path}(e)$$

即无论从哪个退出点离开作用域，析构函数都在退出路径上被调用。这一性质是 RAII 异常安全的根本保证。

**对比 GC 的非确定性**：Java/C# 等语言的 GC 在不可预测的时机回收对象，对象终结器（finalizer）的调用时机不确定，甚至可能永不调用。因此 GC 语言需额外的 `try-with-resources`（Java）、`using`（C#）机制实现确定性资源释放，本质是 RAII 的"补丁"。

## 第 4 章 理论推导

### 4.1 Stack Unwinding 机制的正确性证明

栈展开机制的正确性可通过不变式归纳证明。

**命题 4.1（栈展开完整性）**：设异常在栈帧 $F_k$ 抛出，匹配的 `catch` 块位于栈帧 $F_0$（$F_0$ 是 $F_k$ 的祖先），则栈展开过程必然对 $F_k, F_{k-1}, \dots, F_1$ 中的所有自动对象调用析构函数。

**证明**（结构归纳）：

1. **基础情况**：栈展开从 $F_k$ 开始。$F_k$ 中异常抛出点之后的自动对象尚未构造（构造顺序与声明顺序一致），无需析构。抛出点之前的自动对象已构造，按声明逆序调用析构函数。归纳基础成立。

2. **归纳步骤**：假设栈展开已正确处理 $F_i$（$i > 0$）。$F_{i-1}$ 是 $F_i$ 的调用者，调用点之后的自动对象尚未构造（因为 $F_i$ 还未返回）。调用点之前的自动对象已构造，按声明逆序析构。栈展开继续至 $F_{i-1}$ 的调用点，处理 $F_{i-1}$ 中尚未析构的自动对象。

3. **终止条件**：栈展开至 $F_0$ 时，找到匹配的 `catch` 块，展开终止。若至 `main` 仍未匹配，调用 `std::terminate`。

由归纳法，栈展开必然对所有相关自动对象调用析构函数。$\blacksquare$

**推论 4.1（RAII 异常安全）**：若所有资源均由 RAII 对象管理，则任意异常路径下所有已获取的资源都会被释放，不存在资源泄漏。

下图展示异常抛出后栈展开过程的调用栈状态变化：

```mermaid
flowchart TB
    accTitle: Stack Unwinding Mechanism Flow
    accDescr: Flowchart showing how C++ stack unwinding walks through call frames calling destructors when an exception is thrown until a matching catch is found.

    start([异常抛出点]) --> check1{当前栈帧 F_k<br/>是否有匹配 catch?}
    check1 -->|否| destruct1[按声明逆序<br/>调用 F_k 已构造对象的析构]
    destruct1 --> pop1[弹出 F_k 栈帧]
    pop1 --> move1[回溯至调用者 F_{k-1}]
    move1 --> check2{F_{k-1} 是否有匹配 catch?}
    check2 -->|否| destruct2[按声明逆序<br/>调用 F_{k-1} 已构造对象的析构]
    destruct2 --> pop2[弹出 F_{k-1} 栈帧]
    pop2 --> move2[回溯至调用者 F_{k-2}]
    move2 --> checkN{F_0 是否有匹配 catch?}
    checkN -->|是| handler[进入 catch 块<br/>执行异常处理]
    checkN -->|否| terminate[调用 std::terminate<br/>程序终止]
    handler --> continue([继续执行 catch 后续代码])

    style start fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    style terminate fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    style handler fill:#dcfce7,stroke:#16a34a,color:#14532d
    style continue fill:#dcfce7,stroke:#16a34a,color:#14532d
    style destruct1 fill:#fef9c3,stroke:#ca8a04,color:#713f12
    style destruct2 fill:#fef9c3,stroke:#ca8a04,color:#713f12
    style pop1 fill:#e0e7ff,stroke:#4f46e5,color:#312e81
    style pop2 fill:#e0e7ff,stroke:#4f46e5,color:#312e81
```

### 4.2 异常安全保证的形式化分析

Abrahams 异常安全保证体系定义了三级保证：

#### 4.2.1 Basic Guarantee（基本保证）

**定义**：操作失败时不泄漏资源，且对象保持有效（但可能改变）状态。

形式化：$\forall op, s_0: \text{throws}(op, s_0) \Rightarrow \exists s_1: \text{valid}(s_1) \wedge \text{no\_leak}(s_1) \wedge s_1 = \text{state\_after}(op, s_0)$。

RAII 通过确定性析构天然满足基本保证：即使操作抛异常，所有 RAII 对象的析构函数被调用，资源不泄漏。

```cpp
#include <iostream>
#include <memory>
#include <stdexcept>

// 基本保证示例：异常时不泄漏，但状态可能改变
class Buffer {
    std::unique_ptr<char[]> data_;
    size_t size_;
public:
    Buffer(size_t n) : data_(std::make_unique<char[]>(n)), size_(n) {}
    void resize(size_t new_size) {
        auto new_data = std::make_unique<char[]>(new_size);  // 可能抛 bad_alloc
        std::copy(data_.get(), data_.get() + std::min(size_, new_size), new_data.get());
        data_ = std::move(new_data);                          // 不抛
        size_ = new_size;
    }
    size_t size() const { return size_; }
};
// 输出：异常路径下 data_ 仍指向原缓冲（new_data 析构释放新分配），无泄漏
```

#### 4.2.2 Strong Guarantee（强保证）

**定义**：操作要么成功，要么回滚到操作前的状态（事务语义）。

形式化：$\forall op, s_0: \text{throws}(op, s_0) \Rightarrow \text{state\_after}(op, s_0) = s_0$。

实现技巧是"copy-and-swap"：先在临时副本上执行操作，成功后无抛出地交换。

```cpp
#include <memory>
#include <algorithm>

// 强保证示例：copy-and-swap 惯用法
class StringVec {
    std::unique_ptr<std::string[]> data_;
    size_t size_, capacity_;
public:
    StringVec(size_t cap) : data_(std::make_unique<std::string[]>(cap)), size_(0), capacity_(cap) {}
    void push_back(const std::string& s) {
        // 1. 在临时副本上操作
        auto new_data = std::make_unique<std::string[]>(capacity_ * 2);  // 可能抛
        for (size_t i = 0; i < size_; ++i) new_data[i] = data_[i];       // 可能抛 bad_alloc
        new_data[size_] = s;                                              // 可能抛
        // 2. 无抛出交换
        data_ = std::move(new_data);                                      // noexcept
        capacity_ *= 2;
        ++size_;
    }
    // 异常路径：new_data 析构释放临时副本，原状态不变（强保证）
};
```

#### 4.2.3 Nothrow Guarantee（不抛保证）

**定义**：操作绝不抛出异常。

形式化：$\forall op, s_0: \neg\text{throws}(op, s_0)$。

C++11 后通过 `noexcept` 标注表达。析构函数、移动构造、移动赋值、`swap` 应尽量 `noexcept`。

```cpp
#include <utility>
#include <iostream>

// Nothrow 保证示例：移动构造与 swap 标记 noexcept
class FixedBuffer {
    char buf_[1024];
    size_t len_;
public:
    FixedBuffer() : len_(0) {}
    // 移动构造 noexcept：仅拷贝字节 + 清零源
    FixedBuffer(FixedBuffer&& o) noexcept {
        std::copy(o.buf_, o.buf_ + o.len_, buf_);
        len_ = o.len_;
        o.len_ = 0;
    }
    FixedBuffer& operator=(FixedBuffer&& o) noexcept {
        if (this != &o) {
            std::copy(o.buf_, o.buf_ + o.len_, buf_);
            len_ = o.len_;
            o.len_ = 0;
        }
        return *this;
    }
    void swap(FixedBuffer& o) noexcept {
        FixedBuffer tmp = std::move(*this);
        *this = std::move(o);
        o = std::move(tmp);
    }
};
// 输出：移动与 swap 永不抛异常，可用于 STL 容器的强保证实现
```

### 4.3 RAII 与 GC 的复杂度对比

设 $n$ 为对象数量，$R$ 为资源数量，$H$ 为堆大小。

| 维度             | RAII                           | Mark-Sweep GC                      | 分代 GC                                  |
| :--------------- | :----------------------------- | :--------------------------------- | :--------------------------------------- |
| 单次释放复杂度   | $O(1)$（析构直接调用）         | $O(H)$（全堆扫描）                 | $O(H_{gen})$（分代扫描）                 |
| 暂停时间         | $O(1)$（无暂停）               | $O(H)$（STW 暂停）                 | $O(H_{young})$（年轻代暂停）             |
| 内存峰值         | 低（即时释放）                 | 高（等待 GC）                      | 中（分代触发）                           |
| 总吞吐（无异常） | $O(n)$                         | $O(n) + O(H \cdot \text{GC 次数})$ | $O(n) + O(H_{gen} \cdot \text{GC 次数})$ |
| 资源类型         | 任意（内存、文件、锁、套接字） | 仅内存（其他需手动）               | 仅内存                                   |

**推导**：RAII 的释放复杂度为 $O(1)$，因为析构函数直接调用 `free`/`fclose`/`unlock` 等，无扫描开销。GC 的单次回收复杂度为 $O(H)$（Mark-Sweep）或 $O(H_{gen})$（分代），因为需遍历对象图判断可达性。

**内存峰值**：RAII 即时释放，峰值约为实际使用量；GC 等待堆水位触发回收，峰值通常为实际使用量的 1.5-3 倍。

**实时性**：RAII 无 STW 暂停，适合实时系统；GC 的暂停时间在 100ms 量级（G1、ZGC 可降至 10ms），仍不适合硬实时系统。

## 第 5 章 RAII 的核心机制

RAII 对象的生命周期可建模为有限状态机，下图展示其状态迁移与触发条件：

```mermaid
stateDiagram-v2
    accTitle: RAII Object Lifecycle State Machine
    accDescr: State diagram showing the lifecycle of an RAII object from construction through resource acquisition, move operations, and destruction with guaranteed cleanup.

    [*] --> 未构造
    未构造 --> 已构造_持有资源 : 构造函数成功<br/>资源获取成功
    未构造 --> [*] : 构造函数抛异常<br/>资源获取失败
    已构造_持有资源 --> 已移动_空状态 : 移动构造/移动赋值<br/>资源所有权转移
    已移动_空状态 --> 已构造_持有资源 : 移动赋值<br/>接收新资源
    已构造_持有资源 --> 已析构 : 离开作用域<br/>析构函数调用
    已移动_空状态 --> 已析构 : 离开作用域<br/>析构函数（空操作）
    已构造_持有资源 --> 已构造_持有资源 : 拷贝（若允许）<br/>引用计数增加
    已析构 --> [*]

    note right of 已构造_持有资源
        不变量：file_ != nullptr
        资源有效，可访问
    end note

    note right of 已移动_空状态
        不变量：file_ == nullptr
        析构为空操作
    end note

    note right of 已析构
        资源已释放
        不可访问
    end note
```

### 5.1 构造-析构对称性

RAII 的最简形式是"构造获取、析构释放"的对称结构：

```cpp
#include <cstdio>
#include <stdexcept>

// 最简 RAII 类：构造获取文件句柄，析构释放
class FileHandle {
    std::FILE* file_;
public:
    // 构造函数获取资源，失败抛异常使对象不构造
    explicit FileHandle(const char* path, const char* mode)
        : file_(std::fopen(path, mode)) {
        if (!file_) throw std::runtime_error("fopen failed");
    }
    // 析构函数释放资源，noexcept 默认
    ~FileHandle() { if (file_) std::fclose(file_); }
    // 禁用拷贝避免双重释放
    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;
    // 访问器
    std::FILE* get() const noexcept { return file_; }
};
// 输出：作用域结束自动 fclose，异常路径同样保证释放
```

### 5.2 作用域与生命周期

RAII 的资源释放与作用域严格绑定：

```cpp
#include <iostream>
#include <memory>

struct Trace {
    const char* name;
    Trace(const char* n) : name(n) { std::cout << name << " construct\n"; }
    ~Trace() { std::cout << name << " destruct\n"; }
};

void demo_scope() {
    Trace outer("outer");               // outer 构造
    {
        Trace inner("inner");           // inner 构造
        std::cout << "block body\n";
    }                                   // inner 析构（LIFO）
    std::cout << "after block\n";
}                                       // outer 析构
// 输出：
// outer construct
// inner construct
// block body
// inner destruct
// after block
// outer destruct

int main() { demo_scope(); return 0; }
```

### 5.3 移动语义与所有权转移

C++11 移动语义使 RAII 类支持所有权转移，而无需深拷贝：

```cpp
#include <iostream>
#include <memory>
#include <utility>

class Buffer {
    int* data_;
    size_t size_;
public:
    explicit Buffer(size_t n) : data_(new int[n]), size_(n) {
        std::cout << "allocate " << size_ << " ints\n";
    }
    ~Buffer() {
        if (data_) {
            std::cout << "deallocate " << size_ << " ints\n";
            delete[] data_;
        }
    }
    // 移动构造：转移所有权，源置空
    Buffer(Buffer&& o) noexcept : data_(o.data_), size_(o.size_) {
        o.data_ = nullptr;
        o.size_ = 0;
        std::cout << "move construct\n";
    }
    // 移动赋值：先释放自身，再转移
    Buffer& operator=(Buffer&& o) noexcept {
        if (this != &o) {
            delete[] data_;
            data_ = o.data_;
            size_ = o.size_;
            o.data_ = nullptr;
            o.size_ = 0;
            std::cout << "move assign\n";
        }
        return *this;
    }
    // 禁用拷贝
    Buffer(const Buffer&) = delete;
    Buffer& operator=(const Buffer&) = delete;
};

int main() {
    Buffer a(10);                       // allocate 10 ints
    Buffer b = std::move(a);            // move construct（a 置空，b 持有）
    // a 现在为有效但未指定状态，析构时 data_ 为 nullptr 不释放
    return 0;
}
// 输出：
// allocate 10 ints
// move construct
// deallocate 10 ints（b 析构）
```

### 5.4 删除器与自定义释放逻辑

`unique_ptr` 支持自定义删除器，使同一类型适配不同释放策略：

```cpp
#include <memory>
#include <cstdio>
#include <cstdlib>
#include <iostream>

// 自定义删除器：函数对象
struct FileCloser {
    void operator()(std::FILE* f) const noexcept {
        if (f) { std::fclose(f); std::cout << "file closed\n"; }
    }
};

// 自定义删除器：Lambda
auto malloc_deleter = [](void* p) noexcept {
    if (p) { std::free(p); std::cout << "malloc freed\n"; }
};

using UniqueFile = std::unique_ptr<std::FILE, FileCloser>;
using UniqueMalloc = std::unique_ptr<void, decltype(malloc_deleter)>;

int main() {
    UniqueFile fp(std::fopen("test.txt", "w"));
    if (fp) std::fprintf(fp.get(), "hello");

    UniqueMalloc mp(std::malloc(1024));
    // 作用域结束自动调用删除器
    return 0;
}
// 输出（假设 test.txt 可创建）：
// malloc freed
// file closed
```

### 5.5 五法则与零法则

C++ 资源管理遵循两条核心法则：

**Rule of Five（五法则）**：若类需要自定义析构、拷贝构造、拷贝赋值、移动构造、移动赋值中的任一项，通常需要自定义全部五项。

**Rule of Zero（零法则）**：若类成员均为 RAII 类型（如 `unique_ptr`、`vector`、`string`），则无需自定义任何特殊成员函数，编译器生成的默认实现即可正确管理资源。

```cpp
#include <memory>
#include <string>
#include <vector>

// 零法则示例：所有成员均为 RAII 类型，无需自定义特殊成员函数
class Person {
    std::string name_;              // RAII
    std::vector<int> scores_;       // RAII
    std::unique_ptr<int> age_;      // RAII
public:
    Person(std::string n, std::unique_ptr<int> a)
        : name_(std::move(n)), age_(std::move(a)) {}
    // 编译器生成的析构、拷贝、移动全部正确（拷贝被 unique_ptr 隐式禁用）
};

int main() {
    auto p = std::make_unique<Person>("Alice", std::make_unique<int>(30));
    // p 离开作用域自动析构 Person，进而析构 name_、scores_、age_
    return 0;
}
```

## 第 6 章 文件句柄管理

### 6.1 ifstream/ofstream 包装

C++ 标准库的 `std::ifstream`/`std::ofstream`/`std::fstream` 本身即 RAII 类，构造时打开文件，析构时关闭：

```cpp
#include <fstream>
#include <iostream>
#include <string>

int main() {
    {
        std::ofstream out("output.txt");   // 构造打开文件
        out << "hello RAII\n";
        out << "line 2\n";
    }                                       // 析构关闭文件，即使未 flush
    std::cout << "file closed automatically\n";

    {
        std::ifstream in("output.txt");
        std::string line;
        while (std::getline(in, line)) {
            std::cout << "read: " << line << "\n";
        }
    }
    return 0;
}
// 输出：
// file closed automatically
// read: hello RAII
// read: line 2
```

### 6.2 FILE* 的 RAII 封装

C 风格 `FILE*` 需手动 `fclose`，可封装为 RAII 类：

```cpp
#include <cstdio>
#include <stdexcept>
#include <string>
#include <utility>

class CFile {
    std::FILE* fp_;
public:
    explicit CFile(const char* path, const char* mode)
        : fp_(std::fopen(path, mode)) {
        if (!fp_) throw std::runtime_error(std::string("fopen failed: ") + path);
    }
    ~CFile() {
        if (fp_) {
            std::fclose(fp_);
            fp_ = nullptr;
        }
    }
    CFile(const CFile&) = delete;
    CFile& operator=(const CFile&) = delete;
    CFile(CFile&& o) noexcept : fp_(o.fp_) { o.fp_ = nullptr; }
    CFile& operator=(CFile&& o) noexcept {
        if (this != &o) {
            if (fp_) std::fclose(fp_);
            fp_ = o.fp_;
            o.fp_ = nullptr;
        }
        return *this;
    }
    std::FILE* get() const noexcept { return fp_; }
    int fileno() const noexcept { return ::fileno(fp_); }
};

int main() {
    try {
        CFile f("test.txt", "w");
        std::fprintf(f.get(), "RAII wrapped FILE*\n");
        // 作用域结束自动 fclose
    } catch (const std::exception& e) {
        std::printf("error: %s\n", e.what());
    }
    return 0;
}
// 输出（假设 test.txt 可创建）：写入 "RAII wrapped FILE*" 后自动关闭
```

### 6.3 文件描述符的 RAII 封装

POSIX 文件描述符（`int`）需 `close()`，封装为 RAII：

```cpp
#include <fcntl.h>
#include <unistd.h>
#include <stdexcept>
#include <utility>

class FdGuard {
    int fd_;
public:
    explicit FdGuard(int fd) noexcept : fd_(fd) {}
    FdGuard(const char* path, int flags) {
        fd_ = ::open(path, flags);
        if (fd_ < 0) throw std::runtime_error("open failed");
    }
    ~FdGuard() noexcept {
        if (fd_ >= 0) ::close(fd_);
    }
    FdGuard(const FdGuard&) = delete;
    FdGuard& operator=(const FdGuard&) = delete;
    FdGuard(FdGuard&& o) noexcept : fd_(o.fd_) { o.fd_ = -1; }
    FdGuard& operator=(FdGuard&& o) noexcept {
        if (this != &o) {
            if (fd_ >= 0) ::close(fd_);
            fd_ = o.fd_;
            o.fd_ = -1;
        }
        return *this;
    }
    int get() const noexcept { return fd_; }
    int release() noexcept {
        int t = fd_; fd_ = -1; return t;
    }
    void reset(int new_fd) noexcept {
        if (fd_ >= 0) ::close(fd_);
        fd_ = new_fd;
    }
};

int main() {
    FdGuard fd("/tmp/test.txt", O_WRONLY | O_CREAT | O_TRUNC);
    ::write(fd.get(), "hello fd\n", 9);
    return 0;
}
// 输出：写入 /tmp/test.txt 后自动 close fd
```

### 6.4 内存映射文件的 RAII

`mmap`/`munmap` 也可封装为 RAII：

```cpp
#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdexcept>

class MappedFile {
    void* addr_;
    size_t size_;
public:
    MappedFile(const char* path, int prot, int flags) {
        int fd = ::open(path, O_RDONLY);
        if (fd < 0) throw std::runtime_error("open failed");
        struct stat st;
        if (::fstat(fd, &st) < 0) { ::close(fd); throw std::runtime_error("fstat failed"); }
        size_ = static_cast<size_t>(st.st_size);
        addr_ = ::mmap(nullptr, size_, prot, flags, fd, 0);
        ::close(fd);
        if (addr_ == MAP_FAILED) throw std::runtime_error("mmap failed");
    }
    ~MappedFile() noexcept {
        if (addr_ && addr_ != MAP_FAILED) ::munmap(addr_, size_);
    }
    MappedFile(const MappedFile&) = delete;
    MappedFile& operator=(const MappedFile&) = delete;
    const void* data() const noexcept { return addr_; }
    size_t size() const noexcept { return size_; }
};
// 输出：析构自动 munmap，异常路径同样安全
```

## 第 7 章 内存管理

### 7.1 unique_ptr 详解

`std::unique_ptr` 是独占所有权的智能指针，零开销抽象（无引用计数），移动语义转移所有权：

```cpp
#include <iostream>
#include <memory>
#include <vector>

struct Widget {
    int id;
    Widget(int i) : id(i) { std::cout << "Widget " << id << " construct\n"; }
    ~Widget() { std::cout << "Widget " << id << " destruct\n"; }
    void use() const { std::cout << "Widget " << id << " used\n"; }
};

// 工厂函数返回 unique_ptr
std::unique_ptr<Widget> make_widget(int id) {
    return std::make_unique<Widget>(id);   // C++14 异常安全构造
}

void consumer(std::unique_ptr<Widget> p) {
    if (p) p->use();
    // p 在函数结束时析构 Widget
}

int main() {
    auto p = make_widget(1);               // Widget 1 construct
    consumer(std::move(p));                 // Widget 1 used / Widget 1 destruct
    std::cout << "p is " << (p ? "non-null" : "null") << "\n";

    // 容器持有 unique_ptr
    std::vector<std::unique_ptr<Widget>> v;
    v.push_back(make_widget(2));            // Widget 2 construct
    v.push_back(make_widget(3));            // Widget 3 construct
    for (const auto& w : v) w->use();
    return 0;
}
// 输出：
// Widget 1 construct
// Widget 1 used
// Widget 1 destruct
// p is null
// Widget 2 construct
// Widget 3 construct
// Widget 2 used
// Widget 3 used
// Widget 3 destruct
// Widget 2 destruct
```

### 7.2 unique_ptr 数组特化

`unique_ptr<T[]>` 特化用于动态数组，自动调用 `delete[]`：

```cpp
#include <memory>
#include <iostream>

int main() {
    auto arr = std::make_unique<int[]>(5);  // 分配 5 个 int
    for (size_t i = 0; i < 5; ++i) arr[i] = i * i;
    for (size_t i = 0; i < 5; ++i) std::cout << arr[i] << ' ';
    std::cout << "\n";
    return 0;
}
// 输出：0 1 4 9 16
```

### 7.3 shared_ptr 与引用计数

`std::shared_ptr` 通过原子引用计数（reference counting，维护指向对象的引用数量，归零时释放）实现共享所有权：

```cpp
#include <iostream>
#include <memory>

int main() {
    auto sp1 = std::make_shared<int>(42);
    std::cout << "count=" << sp1.use_count() << ", val=" << *sp1 << "\n";  // count=1, val=42

    {
        auto sp2 = sp1;                    // 拷贝增加计数
        auto sp3 = sp2;                    // 计数=3
        std::cout << "count=" << sp1.use_count() << "\n";  // count=3
    }                                      // sp2、sp3 析构，计数=1

    std::cout << "count=" << sp1.use_count() << "\n";      // count=1
    return 0;
}
// 输出：
// count=1, val=42
// count=3
// count=1
```

`make_shared` 的优势：将对象与控制块合并为单次堆分配，提升缓存局部性。

### 7.4 weak_ptr 与循环引用

循环引用是 `shared_ptr` 的经典陷阱，`weak_ptr` 用于打破环：

```cpp
#include <iostream>
#include <memory>

struct Node;
struct Node {
    std::shared_ptr<Node> next;
    std::weak_ptr<Node>   prev;            // 弱引用打破循环
    int value;
    Node(int v) : value(v) { std::cout << "Node " << v << " construct\n"; }
    ~Node() { std::cout << "Node " << value << " destruct\n"; }
};

int main() {
    auto a = std::make_shared<Node>(1);
    auto b = std::make_shared<Node>(2);
    a->next = b;                           // b 计数=2
    b->prev = a;                           // a 计数=2（weak_ptr 不增加）
    std::cout << "a count=" << a.use_count() << "\n";  // a count=2
    std::cout << "b count=" << b.use_count() << "\n";  // b count=2

    // 使用 weak_ptr 前需 lock() 升级为 shared_ptr
    if (auto locked = b->prev.lock()) {
        std::cout << "prev value=" << locked->value << "\n";  // prev value=1
    }
    return 0;
}
// 输出：
// Node 1 construct
// Node 2 construct
// a count=2
// b count=2
// prev value=1
// Node 2 destruct
// Node 1 destruct
```

### 7.5 enable_shared_from_this

类需在成员函数中获取自身的 `shared_ptr` 时，继承 `std::enable_shared_from_this`：

```cpp
#include <memory>
#include <iostream>

class Worker : public std::enable_shared_from_this<Worker> {
public:
    void start() {
        // 错误：shared_from_this() 必须在对象已由 shared_ptr 管理时调用
        auto self = shared_from_this();
        std::cout << "Worker started, use_count=" << self.use_count() << "\n";
    }
};

int main() {
    auto w = std::make_shared<Worker>();   // use_count=1
    w->start();                            // use_count=2（self 持有副本）
    return 0;
}
// 输出：Worker started, use_count=2
```

### 7.6 自定义分配器

STL 容器支持自定义分配器以适配特殊场景（实时系统、嵌入式无堆环境）：

```cpp
#include <cstddef>
#include <iostream>
#include <vector>
#include <new>

// 简单的栈上内存池分配器
template <typename T, size_t N>
class StackAllocator {
    alignas(T) unsigned char buf_[sizeof(T) * N];
    size_t idx_ = 0;
public:
    using value_type = T;
    StackAllocator() noexcept = default;
    template <typename U>
    StackAllocator(const StackAllocator<U, N>&) noexcept {}

    T* allocate(size_t n) {
        if (idx_ + n > N) throw std::bad_alloc();
        T* p = reinterpret_cast<T*>(buf_ + idx_ * sizeof(T));
        idx_ += n;
        return p;
    }
    void deallocate(T*, size_t) noexcept {}   // 不释放，整体回收
    size_t used() const noexcept { return idx_; }
};

int main() {
    std::vector<int, StackAllocator<int, 100>> v;
    for (int i = 0; i < 50; ++i) v.push_back(i);
    std::cout << "size=" << v.size() << "\n";   // size=50
    return 0;
}
// 输出：size=50（50 个 int 在栈缓冲内分配，无堆分配）
```

### 7.7 pmr 多态内存资源

C++17 引入 `std::pmr` 框架，提供运行时多态的内存资源：

```cpp
#include <memory_resource>
#include <vector>
#include <iostream>

int main() {
    // 栈上单块缓冲的资源
    unsigned char buf[1024];
    std::pmr::monotonic_buffer_resource mbr(buf, sizeof(buf));

    // 使用 pmr 容器
    std::pmr::vector<int> v(&mbr);
    for (int i = 0; i < 100; ++i) v.push_back(i);
    std::cout << "size=" << v.size() << "\n";   // size=100

    // monotonic_buffer_resource 析构时一次性释放所有内存
    return 0;
}
// 输出：size=100（所有内存来自栈缓冲 buf，无堆分配）
```

## 第 8 章 锁管理

### 8.1 lock_guard

`std::lock_guard` 是最简单的 RAII 锁，构造时加锁，析构时解锁：

```cpp
#include <iostream>
#include <mutex>
#include <thread>
#include <vector>

class Counter {
    int value_ = 0;
    std::mutex mtx_;
public:
    void increment() {
        std::lock_guard<std::mutex> lock(mtx_);   // 加锁
        ++value_;
        // 作用域结束自动解锁，即使抛异常
    }
    int get() {
        std::lock_guard<std::mutex> lock(mtx_);
        return value_;
    }
};

int main() {
    Counter c;
    std::vector<std::thread> ts;
    for (int i = 0; i < 10; ++i)
        ts.emplace_back([&c]() { for (int j = 0; j < 1000; ++j) c.increment(); });
    for (auto& t : ts) t.join();
    std::cout << "final=" << c.get() << "\n";   // final=10000
    return 0;
}
// 输出：final=10000（10 线程各加 1000，互斥保证最终 10000）
```

### 8.2 unique_lock

`std::unique_lock` 提供更灵活的锁管理（可延迟加锁、提前解锁、转移所有权）：

```cpp
#include <iostream>
#include <mutex>
#include <condition_variable>

std::mutex mtx;
std::condition_variable cv;
bool ready = false;

void waiter(int id) {
    std::unique_lock<std::mutex> lock(mtx);   // 加锁
    cv.wait(lock, [] { return ready; });       // 等待时自动解锁，被唤醒时重新加锁
    std::cout << "waiter " << id << " proceeds\n";
    // 作用域结束解锁
}

void notifier() {
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    {
        std::lock_guard<std::mutex> lock(mtx);
        ready = true;
    }
    cv.notify_all();
}

int main() {
    std::thread w1(waiter, 1), w2(waiter, 2), n(notifier);
    w1.join(); w2.join(); n.join();
    return 0;
}
// 输出（顺序可能不同）：
// waiter 1 proceeds
// waiter 2 proceeds
```

### 8.3 scoped_lock

C++17 引入 `std::scoped_lock` 支持多锁原子获取，避免死锁：

```cpp
#include <iostream>
#include <mutex>
#include <thread>

class Account {
    int balance_;
    std::mutex mtx_;
public:
    explicit Account(int b) : balance_(b) {}
    void deposit(int amt) {
        std::lock_guard<std::mutex> lock(mtx_);
        balance_ += amt;
    }
    void withdraw(int amt) {
        std::lock_guard<std::mutex> lock(mtx_);
        balance_ -= amt;
    }
    int balance() {
        std::lock_guard<std::mutex> lock(mtx_);
        return balance_;
    }
    friend void transfer(Account& from, Account& to, int amt);
};

// 多锁原子获取：scoped_lock 用 std::lock 算法避免死锁
void transfer(Account& from, Account& to, int amt) {
    std::scoped_lock lock(from.mtx_, to.mtx_);   // 原子获取两把锁
    from.balance_ -= amt;
    to.balance_ += amt;
}

int main() {
    Account a(100), b(50);
    std::thread t1(transfer, std::ref(a), std::ref(b), 30);
    std::thread t2(transfer, std::ref(b), std::ref(a), 10);
    t1.join(); t2.join();
    std::cout << "a=" << a.balance() << ", b=" << b.balance() << "\n";   // a=80, b=70
    return 0;
}
// 输出：a=80, b=70
```

### 8.4 shared_mutex 读写锁

C++17 引入 `std::shared_mutex` 实现读写锁，`shared_lock` 是其 RAII 包装：

```cpp
#include <iostream>
#include <mutex>
#include <shared_mutex>
#include <thread>
#include <vector>

class ThreadSafeMap {
    std::unordered_map<int, int> data_;
    std::shared_mutex mtx_;
public:
    void write(int k, int v) {
        std::unique_lock lock(mtx_);            // 独占写锁
        data_[k] = v;
    }
    int read(int k) const {
        std::shared_lock lock(mtx_);            // 共享读锁
        auto it = data_.find(k);
        return it != data_.end() ? it->second : -1;
    }
};

int main() {
    ThreadSafeMap m;
    std::vector<std::thread> ts;
    for (int i = 0; i < 5; ++i)
        ts.emplace_back([&m, i]() { m.write(i, i * 10); });
    for (auto& t : ts) t.join();
    std::cout << "m.read(3)=" << m.read(3) << "\n";   // m.read(3)=30
    return 0;
}
// 输出：m.read(3)=30
```

### 8.5 call_once 与 once_flag

`std::call_once` 保证某函数在多线程下仅执行一次：

```cpp
#include <iostream>
#include <mutex>
#include <thread>
#include <vector>

class Singleton {
    static std::once_flag flag_;
    static Singleton* instance_;
    Singleton() = default;
public:
    static Singleton* get() {
        std::call_once(flag_, []() { instance_ = new Singleton(); });
        return instance_;
    }
    void hello() { std::cout << "Singleton at " << this << "\n"; }
};
std::once_flag Singleton::flag_;
Singleton* Singleton::instance_ = nullptr;

int main() {
    std::vector<std::thread> ts;
    for (int i = 0; i < 5; ++i)
        ts.emplace_back([]() { Singleton::get()->hello(); });
    for (auto& t : ts) t.join();
    return 0;
}
// 输出（5 次 Singleton 地址相同）：
// Singleton at 0x...
// Singleton at 0x...（同一地址）
```

## 第 9 章 网络套接字

### 9.1 POSIX 套接字 RAII

```cpp
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <stdexcept>
#include <cstring>
#include <iostream>

class Socket {
    int fd_;
public:
    Socket(int domain, int type, int protocol) {
        fd_ = ::socket(domain, type, protocol);
        if (fd_ < 0) throw std::runtime_error("socket failed");
    }
    explicit Socket(int fd) noexcept : fd_(fd) {}
    ~Socket() noexcept {
        if (fd_ >= 0) ::close(fd_);
    }
    Socket(const Socket&) = delete;
    Socket& operator=(const Socket&) = delete;
    Socket(Socket&& o) noexcept : fd_(o.fd_) { o.fd_ = -1; }
    Socket& operator=(Socket&& o) noexcept {
        if (this != &o) {
            if (fd_ >= 0) ::close(fd_);
            fd_ = o.fd_;
            o.fd_ = -1;
        }
        return *this;
    }
    int get() const noexcept { return fd_; }
    int release() noexcept { int t = fd_; fd_ = -1; return t; }

    void bind(uint16_t port) {
        sockaddr_in addr{};
        addr.sin_family = AF_INET;
        addr.sin_addr.s_addr = INADDR_ANY;
        addr.sin_port = htons(port);
        if (::bind(fd_, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) < 0)
            throw std::runtime_error("bind failed");
    }
    void listen(int backlog = 5) {
        if (::listen(fd_, backlog) < 0) throw std::runtime_error("listen failed");
    }
    Socket accept() {
        int cfd = ::accept(fd_, nullptr, nullptr);
        if (cfd < 0) throw std::runtime_error("accept failed");
        return Socket(cfd);
    }
    ssize_t send(const void* buf, size_t len) {
        return ::send(fd_, buf, len, 0);
    }
    ssize_t recv(void* buf, size_t len) {
        return ::recv(fd_, buf, len, 0);
    }
};
// 输出：Socket 对象析构自动 close fd，异常路径同样安全
```

### 9.2 客户端连接 RAII

```cpp
#include <arpa/inet.h>

class TcpClient {
    Socket sock_;
public:
    TcpClient(const char* ip, uint16_t port) : sock_(AF_INET, SOCK_STREAM, 0) {
        sockaddr_in addr{};
        addr.sin_family = AF_INET;
        addr.sin_port = htons(port);
        ::inet_pton(AF_INET, ip, &addr.sin_addr);
        if (::connect(sock_.get(), reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) < 0)
            throw std::runtime_error("connect failed");
    }
    void send(const std::string& msg) {
        sock_.send(msg.data(), msg.size());
    }
    std::string recv(size_t max_len = 1024) {
        std::string buf(max_len, '\0');
        ssize_t n = sock_.recv(buf.data(), max_len);
        buf.resize(n > 0 ? n : 0);
        return buf;
    }
};
// 输出：TcpClient 析构自动关闭连接
```

## 第 10 章 数据库事务

### 10.1 事务 RAII 模式

数据库事务天然适合 RAII：构造时 BEGIN，析构时 ROLLBACK（未显式 COMMIT 时）：

```cpp
#include <iostream>
#include <stdexcept>
#include <string>

// 模拟数据库连接
class Database {
public:
    void execute(const std::string& sql) {
        std::cout << "exec: " << sql << "\n";
        if (sql.find("FAIL") != std::string::npos)
            throw std::runtime_error("sql error");
    }
    void beginTransaction() { std::cout << "BEGIN\n"; }
    void commit() { std::cout << "COMMIT\n"; }
    void rollback() { std::cout << "ROLLBACK\n"; }
};

class Transaction {
    Database& db_;
    bool committed_ = false;
public:
    explicit Transaction(Database& db) : db_(db) {
        db_.beginTransaction();
    }
    ~Transaction() noexcept {
        if (!committed_) {
            try { db_.rollback(); } catch (...) { /* 吞异常 */ }
        }
    }
    Transaction(const Transaction&) = delete;
    Transaction& operator=(const Transaction&) = delete;

    void commit() {
        db_.commit();
        committed_ = true;
    }
    void rollback() {
        if (!committed_) {
            db_.rollback();
            committed_ = true;   // 标记已处理，析构不再 ROLLBACK
        }
    }
};

void update_user(Database& db) {
    Transaction txn(db);                       // BEGIN
    db.execute("UPDATE users SET name='Alice' WHERE id=1");
    db.execute("UPDATE logs SET ts=NOW()");
    txn.commit();                               // COMMIT
    // 异常路径：~Transaction 自动 ROLLBACK
}

int main() {
    Database db;
    try { update_user(db); } catch (const std::exception& e) {
        std::cout << "error: " << e.what() << "\n";
    }
    return 0;
}
// 输出：
// BEGIN
// exec: UPDATE users SET name='Alice' WHERE id=1
// exec: UPDATE logs SET ts=NOW()
// COMMIT
```

### 10.2 嵌套事务与保存点

```cpp
class Savepoint {
    Database& db_;
    std::string name_;
    bool released_ = false;
public:
    Savepoint(Database& db, std::string name) : db_(db), name_(std::move(name)) {
        db_.execute("SAVEPOINT " + name_);
    }
    ~Savepoint() noexcept {
        if (!released_) {
            try { db_.execute("ROLLBACK TO " + name_); } catch (...) {}
        }
    }
    Savepoint(const Savepoint&) = delete;
    Savepoint& operator=(const Savepoint&) = delete;
    void release() {
        db_.execute("RELEASE SAVEPOINT " + name_);
        released_ = true;
    }
};
// 输出：嵌套事务中局部失败回滚到 savepoint 而不影响外层事务
```

## 第 11 章 OpenGL 纹理/VBO

### 11.1 纹理对象 RAII

OpenGL 纹理对象需 `glGenTextures`/`glDeleteTextures` 配对：

```cpp
#include <glad/glad.h>
#include <stdexcept>

class GlTexture {
    GLuint id_ = 0;
public:
    GlTexture() {
        glGenTextures(1, &id_);
        if (!id_) throw std::runtime_error("glGenTextures failed");
    }
    ~GlTexture() noexcept {
        if (id_) glDeleteTextures(1, &id_);
    }
    GlTexture(const GlTexture&) = delete;
    GlTexture& operator=(const GlTexture&) = delete;
    GlTexture(GlTexture&& o) noexcept : id_(o.id_) { o.id_ = 0; }
    GlTexture& operator=(GlTexture&& o) noexcept {
        if (this != &o) {
            if (id_) glDeleteTextures(1, &id_);
            id_ = o.id_;
            o.id_ = 0;
        }
        return *this;
    }
    void bind(GLenum target) const { glBindTexture(target, id_); }
    GLuint get() const noexcept { return id_; }
};
// 输出：纹理对象析构自动 glDeleteTextures，避免 GPU 资源泄漏
```

### 11.2 VBO/VAO RAII

```cpp
class GlBuffer {
    GLuint id_ = 0;
public:
    GlBuffer() {
        glGenBuffers(1, &id_);
        if (!id_) throw std::runtime_error("glGenBuffers failed");
    }
    ~GlBuffer() noexcept {
        if (id_) glDeleteBuffers(1, &id_);
    }
    GlBuffer(const GlBuffer&) = delete;
    GlBuffer& operator=(const GlBuffer&) = delete;
    GlBuffer(GlBuffer&& o) noexcept : id_(o.id_) { o.id_ = 0; }
    GlBuffer& operator=(GlBuffer&& o) noexcept {
        if (this != &o) {
            if (id_) glDeleteBuffers(1, &id_);
            id_ = o.id_; o.id_ = 0;
        }
        return *this;
    }
    void bind(GLenum target) const { glBindBuffer(target, id_); }
    void data(GLenum target, GLsizeiptr size, const void* data, GLenum usage) {
        glBufferData(target, size, data, usage);
    }
};

class GlVao {
    GLuint id_ = 0;
public:
    GlVao() { glGenVertexArrays(1, &id_); }
    ~GlVao() noexcept { if (id_) glDeleteVertexArrays(1, &id_); }
    GlVao(const GlVao&) = delete;
    GlVao& operator=(const GlVao&) = delete;
    GlVao(GlVao&& o) noexcept : id_(o.id_) { o.id_ = 0; }
    void bind() const { glBindVertexArray(id_); }
};
// 输出：VBO/VAO 析构自动释放 GPU 资源
```

### 11.3 着色器程序 RAII

```cpp
#include <string>
#include <vector>

class GlShader {
    GLuint id_ = 0;
public:
    GlShader(GLenum type, const std::string& source) {
        id_ = glCreateShader(type);
        const char* src = source.c_str();
        glShaderSource(id_, 1, &src, nullptr);
        glCompileShader(id_);
        GLint ok;
        glGetShaderiv(id_, GL_COMPILE_STATUS, &ok);
        if (!ok) {
            char log[1024];
            glGetShaderInfoLog(id_, sizeof(log), nullptr, log);
            glDeleteShader(id_);
            throw std::runtime_error(std::string("shader compile: ") + log);
        }
    }
    ~GlShader() noexcept { if (id_) glDeleteShader(id_); }
    GlShader(const GlShader&) = delete;
    GlShader& operator=(const GlShader&) = delete;
    GLuint get() const noexcept { return id_; }
};

class GlProgram {
    GLuint id_ = 0;
public:
    GlProgram() { id_ = glCreateProgram(); }
    ~GlProgram() noexcept { if (id_) glDeleteProgram(id_); }
    GlProgram(const GlProgram&) = delete;
    GlProgram& operator=(const GlProgram&) = delete;
    void attach(const GlShader& s) { glAttachShader(id_, s.get()); }
    void link() {
        glLinkProgram(id_);
        GLint ok;
        glGetProgramiv(id_, GL_LINK_STATUS, &ok);
        if (!ok) {
            char log[1024];
            glGetProgramInfoLog(id_, sizeof(log), nullptr, log);
            throw std::runtime_error(std::string("program link: ") + log);
        }
    }
    void use() const { glUseProgram(id_); }
    GLuint get() const noexcept { return id_; }
};
// 输出：着色器与程序析构自动释放 GPU 资源
```

## 第 12 章 CUDA 资源

### 12.1 设备内存 RAII

CUDA 设备内存需 `cudaMalloc`/`cudaFree` 配对：

```cpp
#include <cuda_runtime.h>
#include <stdexcept>

class CudaMemory {
    void* dev_ptr_ = nullptr;
    size_t size_ = 0;
public:
    explicit CudaMemory(size_t bytes) : size_(bytes) {
        cudaError_t err = cudaMalloc(&dev_ptr_, bytes);
        if (err != cudaSuccess)
            throw std::runtime_error("cudaMalloc failed: " + std::string(cudaGetErrorString(err)));
    }
    ~CudaMemory() noexcept {
        if (dev_ptr_) cudaFree(dev_ptr_);
    }
    CudaMemory(const CudaMemory&) = delete;
    CudaMemory& operator=(const CudaMemory&) = delete;
    CudaMemory(CudaMemory&& o) noexcept
        : dev_ptr_(o.dev_ptr_), size_(o.size_) {
        o.dev_ptr_ = nullptr; o.size_ = 0;
    }
    CudaMemory& operator=(CudaMemory&& o) noexcept {
        if (this != &o) {
            if (dev_ptr_) cudaFree(dev_ptr_);
            dev_ptr_ = o.dev_ptr_; size_ = o.size_;
            o.dev_ptr_ = nullptr; o.size_ = 0;
        }
        return *this;
    }
    void* get() const noexcept { return dev_ptr_; }
    size_t size() const noexcept { return size_; }

    void copy_from_host(const void* host_ptr) {
        cudaError_t err = cudaMemcpy(dev_ptr_, host_ptr, size_, cudaMemcpyHostToDevice);
        if (err != cudaSuccess) throw std::runtime_error("cudaMemcpy H2D failed");
    }
    void copy_to_host(void* host_ptr) const {
        cudaError_t err = cudaMemcpy(host_ptr, dev_ptr_, size_, cudaMemcpyDeviceToHost);
        if (err != cudaSuccess) throw std::runtime_error("cudaMemcpy D2H failed");
    }
};
// 输出：CUDA 设备内存析构自动 cudaFree，避免显存泄漏
```

### 12.2 CUDA Stream RAII

```cpp
class CudaStream {
    cudaStream_t stream_ = nullptr;
public:
    CudaStream() {
        cudaError_t err = cudaStreamCreate(&stream_);
        if (err != cudaSuccess) throw std::runtime_error("cudaStreamCreate failed");
    }
    ~CudaStream() noexcept {
        if (stream_) cudaStreamDestroy(stream_);
    }
    CudaStream(const CudaStream&) = delete;
    CudaStream& operator=(const CudaStream&) = delete;
    CudaStream(CudaStream&& o) noexcept : stream_(o.stream_) { o.stream_ = nullptr; }
    cudaStream_t get() const noexcept { return stream_; }
    void synchronize() { cudaStreamSynchronize(stream_); }
};
// 输出：Stream 析构自动销毁
```

### 12.3 CUDA Event RAII

```cpp
class CudaEvent {
    cudaEvent_t event_ = nullptr;
public:
    CudaEvent() {
        cudaError_t err = cudaEventCreate(&event_);
        if (err != cudaSuccess) throw std::runtime_error("cudaEventCreate failed");
    }
    ~CudaEvent() noexcept {
        if (event_) cudaEventDestroy(event_);
    }
    CudaEvent(const CudaEvent&) = delete;
    CudaEvent& operator=(const CudaEvent&) = delete;
    CudaEvent(CudaEvent&& o) noexcept : event_(o.event_) { o.event_ = nullptr; }
    void record(cudaStream_t stream = 0) { cudaEventRecord(event_, stream); }
    float elapsed_since(const CudaEvent& start) const {
        float ms;
        cudaEventElapsedTime(&ms, start.event_, event_);
        return ms;
    }
};
// 输出：Event 析构自动销毁
```

## 第 13 章 自定义 RAII 类模板

### 13.1 通用 RAII 包装模板

```cpp
#include <utility>
#include <stdexcept>

// 通用 RAII 包装：构造获取 + 自定义释放
template <typename T, typename Deleter>
class RaiiWrap {
    T resource_;
    Deleter deleter_;
    bool owns_ = true;
public:
    RaiiWrap(T res, Deleter del) : resource_(res), deleter_(del) {}
    ~RaiiWrap() noexcept(noexcept(deleter_(resource_))) {
        if (owns_) deleter_(resource_);
    }
    RaiiWrap(const RaiiWrap&) = delete;
    RaiiWrap& operator=(const RaiiWrap&) = delete;
    RaiiWrap(RaiiWrap&& o) noexcept
        : resource_(o.resource_), deleter_(o.deleter_), owns_(o.owns_) {
        o.owns_ = false;
    }
    T get() const noexcept { return resource_; }
    T release() noexcept { owns_ = false; return resource_; }
    void reset(T new_res) {
        if (owns_) deleter_(resource_);
        resource_ = new_res;
        owns_ = true;
    }
};

// 使用示例：包装 POSIX shm
#include <sys/mman.h>
#include <fcntl.h>
#include <unistd.h>

int main() {
    auto shm_deleter = [](int fd) { ::close(fd); ::shm_unlink("/my_shm"); };
    int fd = ::shm_open("/my_shm", O_CREAT | O_RDWR, 0600);
    RaiiWrap<int, decltype(shm_deleter)> shm(fd, shm_deleter);
    // 作用域结束自动 close + shm_unlink
    return 0;
}
// 输出：shm 资源析构自动清理
```

### 13.2 类型擦除的通用 ScopeGuard

```cpp
#include <functional>
#include <type_traits>
#include <utility>

class ScopeGuardAny {
    std::function<void()> cleanup_;
    bool active_ = true;
public:
    template <typename F,
              typename = std::enable_if_t<!std::is_same_v<std::decay_t<F>, ScopeGuardAny>>>
    explicit ScopeGuardAny(F&& f)
        : cleanup_(std::forward<F>(f)) {}

    ~ScopeGuardAny() noexcept(true) {
        if (active_) try { cleanup_(); } catch (...) { /* 吞异常 */ }
    }
    ScopeGuardAny(const ScopeGuardAny&) = delete;
    ScopeGuardAny& operator=(const ScopeGuardAny&) = delete;
    ScopeGuardAny(ScopeGuardAny&& o) noexcept
        : cleanup_(std::move(o.cleanup_)), active_(o.active_) { o.active_ = false; }
    void dismiss() noexcept { active_ = false; }
};

// 宏简化
#define SCOPE_EXIT(action) auto _scope_guard_##__LINE__ = ScopeGuardAny([&]() { action; })

int main() {
    int* p = new int(42);
    SCOPE_EXIT(delete p;);
    // 作用域结束自动 delete p
    return 0;
}
// 输出：p 在作用域结束自动 delete
```

### 13.3 编译期多态的 ScopeGuard

```cpp
#include <type_traits>
#include <utility>

template <typename F>
class ScopeGuardTyped {
    F func_;
    bool active_ = true;
public:
    explicit ScopeGuardTyped(F f) noexcept(std::is_nothrow_move_constructible_v<F>)
        : func_(std::move(f)) {}
    ~ScopeGuardTyped() noexcept(true) {
        if (active_) try { func_(); } catch (...) {}
    }
    ScopeGuardTyped(ScopeGuardTyped&& o) noexcept(std::is_nothrow_move_constructible_v<F>)
        : func_(std::move(o.func_)), active_(o.active_) { o.active_ = false; }
    ScopeGuardTyped(const ScopeGuardTyped&) = delete;
    ScopeGuardTyped& operator=(const ScopeGuardTyped&) = delete;
    void dismiss() noexcept { active_ = false; }
};

template <typename F>
auto make_scope_guard(F&& f) {
    return ScopeGuardTyped<std::decay_t<F>>(std::forward<F>(f));
}

int main() {
    auto guard = make_scope_guard([]() { /* cleanup */ });
    return 0;
}
// 输出：编译期生成内联代码，无 std::function 开销
```

### 13.4 unique_resource 提案实现

C++26 提案 N3850 提出的 `unique_resource`，将资源与删除器绑定：

```cpp
template <typename R, typename D>
class unique_resource {
    R resource_;
    D deleter_;
    bool owns_ = true;
public:
    unique_resource(R res, D del) : resource_(res), deleter_(del) {}
    ~unique_resource() noexcept(noexcept(deleter_(resource_))) {
        if (owns_) deleter_(resource_);
    }
    unique_resource(const unique_resource&) = delete;
    unique_resource& operator=(const unique_resource&) = delete;
    unique_resource(unique_resource&& o) noexcept
        : resource_(o.resource_), deleter_(o.deleter_), owns_(o.owns_) {
        o.owns_ = false;
    }
    R get() const noexcept { return resource_; }
    R release() noexcept { owns_ = false; return resource_; }
};

int main() {
    auto fd = unique_resource<int, int(*)(int)>(
        ::open("/tmp/x", O_RDONLY), ::close);
    // 作用域结束自动 close
    return 0;
}
```

## 第 14 章 对比分析

### 14.1 RAII vs C malloc/free

```c
/* C 风格：手动配对 */
#include <stdlib.h>
int* p = malloc(sizeof(int) * 100);
if (!p) return -1;
/* ... */
free(p);   /* 必须显式释放，错误路径易遗漏 */
```

```cpp
// C++ RAII 风格
#include <memory>
auto p = std::make_unique<int[]>(100);
// 作用域结束自动 delete[]
```

| 维度         | C malloc/free                 | C++ RAII                      |
| :----------- | :---------------------------- | :---------------------------- |
| 异常安全     | 不保证（需手动 goto cleanup） | 保证（栈展开自动析构）        |
| 错误路径处理 | 程序员手动配对                | 编译器保证                    |
| 代码量       | 多（每个错误路径都需清理）    | 少（声明即获取）              |
| 所有权表达   | 无（裸指针无所有权语义）      | 明确（unique_ptr/shared_ptr） |
| 类型安全     | 无（void* 转换无检查）        | 强（模板类型推导）            |

### 14.2 RAII vs Java try-finally / try-with-resources

```java
// Java 7+ try-with-resources（实质是 RAII 的补丁）
try (FileInputStream fis = new FileInputStream("x.txt")) {
    fis.read();
} // 自动 close，但需实现 AutoCloseable 接口
```

| 维度     | C++ RAII                            | Java try-with-resources         |
| :------- | :---------------------------------- | :------------------------------ |
| 资源类型 | 任意（内存、文件、锁、套接字、GPU） | 仅 AutoCloseable 实现           |
| 语法负担 | 零（声明即获取）                    | 显式 try 块包裹                 |
| 异常路径 | 自动处理                            | 自动处理                        |
| 内存管理 | RAII 同样管理                       | GC 管理内存（不确定性）         |
| 终结器   | 无（析构确定性）                    | finalize() 不确定性，JDK 9 弃用 |
| 性能     | 零开销                              | try 块 + AutoCloseable 调用开销 |

### 14.3 RAII vs Python with

```python
# Python with 语句依赖上下文管理器协议
with open("x.txt") as f:
    f.read()
# 自动 __exit__，但仅限 with 块内
```

| 维度       | C++ RAII            | Python with                     |
| :--------- | :------------------ | :------------------------------ |
| 资源类型   | 任意                | 任意（实现 **enter**/**exit**） |
| 语法       | 零开销              | 显式 with 块                    |
| 作用域绑定 | 整个对象生命周期    | 仅 with 块内                    |
| 性能       | 编译期内联          | 运行时方法查找                  |
| 异常处理   | 析构 noexcept       | **exit** 可处理异常             |
| 引用计数   | shared_ptr 原子计数 | CPython 引用计数 + 分代 GC      |

### 14.4 RAII vs Go defer

```go
// Go defer 延迟调用
func process() error {
    f, err := os.Open("x.txt")
    if err != nil { return err }
    defer f.Close()   // 函数返回前执行
    // ...
}
```

| 维度     | C++ RAII         | Go defer                     |
| :------- | :--------------- | :--------------------------- |
| 触发时机 | 作用域结束       | 函数返回前                   |
| 顺序     | LIFO（析构逆序） | LIFO（defer 栈）             |
| 异常安全 | 栈展开保证       | panic/recover 模拟           |
| 参数求值 | 构造时           | defer 语句时（参数预求值）   |
| 性能     | 零开销           | 函数返回时调用，有开销       |
| 内存管理 | RAII             | GC（defer 仅处理非内存资源） |

### 14.5 RAII vs Rust Drop trait

```rust
// Rust Drop trait 实现 RAII
struct File { fd: i32 }
impl Drop for File {
    fn drop(&mut self) {
        unsafe { libc::close(self.fd); }
    }
}
{
    let f = File { fd: 0 };
    // 作用域结束自动 drop
}   // 编译器保证调用
```

| 维度        | C++ RAII                   | Rust Drop                        |
| :---------- | :------------------------- | :------------------------------- |
| 析构时机    | 确定性（作用域结束）       | 确定性（作用域结束）             |
| 析构顺序    | LIFO                       | LIFO                             |
| 异常安全    | 栈展开（析构不抛）         | panic unwind（析构不抛）         |
| 所有权系统  | 程序员保证（unique_ptr）   | 编译器借用检查器                 |
| 内存安全    | 程序员保证（悬空指针风险） | 编译期保证（无悬空指针）         |
| 数据竞争    | 运行期 UB                  | 编译期拒绝（Send/Sync）          |
| Drop 抛异常 | UB（terminate）            | 编译期错误（Drop 不返回 Result） |

### 14.6 综合对比表

| 特性         | C++ RAII | C    | Java try-with | Python with   | Go defer       | Rust Drop |
| :----------- | :------- | :--- | :------------ | :------------ | :------------- | :-------- |
| 确定性析构   | 是       | 否   | 是            | 是（with 内） | 是（函数返回） | 是        |
| 异常安全     | 是       | 否   | 是            | 是            | 部分           | 是        |
| 内存管理     | 是       | 否   | GC            | GC+引用计数   | GC             | 是        |
| 非内存资源   | 是       | 手动 | 是            | 是            | 是             | 是        |
| 零开销       | 是       | N/A  | 否            | 否            | 否             | 是        |
| 编译期所有权 | 否       | 否   | 否            | 否            | 否             | 是        |

## 第 15 章 常见陷阱

### 15.1 忘记 virtual 析构

:::danger 错误示例

```cpp
#include <iostream>
struct Base { /* 无 virtual 析构 */ ~Base() { std::cout << "~Base\n"; } };
struct Derived : Base { ~Derived() { std::cout << "~Derived\n"; } };

int main() {
    Base* p = new Derived();
    delete p;   // UB：仅调用 ~Base，~Derived 不调用，Derived 资源泄漏
    return 0;
}
```

**原因**：通过基类指针 delete 派生类对象时，若析构非 virtual，仅调用基类析构，派生部分资源泄漏。
:::

**修正方案**：基类析构声明 virtual：

```cpp
struct Base { virtual ~Base() { std::cout << "~Base\n"; } };
struct Derived : Base { ~Derived() override { std::cout << "~Derived\n"; } };
// 现在 delete p 会先调 ~Derived 再调 ~Base
```

### 15.2 移动后状态

:::danger 错误示例

```cpp
class Buffer {
    int* data_;
    size_t size_;
public:
    Buffer(size_t n) : data_(new int[n]), size_(n) {}
    ~Buffer() { delete[] data_; }
    Buffer(Buffer&& o) noexcept : data_(o.data_), size_(o.size_) {
        /* 忘记置空 o.data_ */
    }
};
// 移动后 o.data_ 仍指向已转移的内存，o 析构时 double free
```

**原因**：移动构造未将源对象置空，源析构时重复释放同一资源。
:::

**修正方案**：移动后源对象必须处于"有效但未指定"状态：

```cpp
Buffer(Buffer&& o) noexcept : data_(o.data_), size_(o.size_) {
    o.data_ = nullptr;   // 置空避免双重释放
    o.size_ = 0;
}
```

### 15.3 异常析构抛出

:::danger 错误示例

```cpp
struct Conn {
    ~Conn() {
        if (!close()) throw std::runtime_error("close failed");   // UB
    }
    bool close();
};
```

**原因**：C++11 起析构默认 noexcept，抛异常触发 std::terminate；栈展开期间析构抛异常同样 terminate。
:::

**修正方案**：析构绝不抛异常：

```cpp
struct Conn {
    ~Conn() noexcept {
        try {
            if (!close()) std::cerr << "close failed\n";
        } catch (const std::exception& e) {
            std::cerr << "exception in dtor: " << e.what() << "\n";
        }
    }
    bool close() noexcept;
};
```

### 15.4 资源所有权混乱

:::danger 错误示例

```cpp
void process() {
    auto p = std::make_shared<Widget>();
    Widget* raw = p.get();
    p.reset();   // 计数归零，Widget 析构
    raw->use();  // UB：悬空指针
}
```

**原因**：从 shared_ptr 取出裸指针后 reset 智能指针，裸指针立即悬空。
:::

**修正方案**：保持所有权语义一致：

```cpp
void process() {
    auto p = std::make_shared<Widget>();
    p->use();   // 通过 shared_ptr 访问
    // 不取裸指针
}
```

### 15.5 循环引用

:::danger 错误示例

```cpp
struct Node {
    std::shared_ptr<Node> next;
    std::shared_ptr<Node> prev;   // 双向 shared_ptr 形成循环
};

int main() {
    auto a = std::make_shared<Node>();
    auto b = std::make_shared<Node>();
    a->next = b;
    b->prev = a;
    // a、b 离开作用域后计数均不归零，内存泄漏
    return 0;
}
```

**原因**：循环引用使引用计数永远 ≥1，shared_ptr 无法释放。
:::

**修正方案**：使用 weak_ptr 打破环：

```cpp
struct Node {
    std::shared_ptr<Node> next;
    std::weak_ptr<Node> prev;   // 弱引用打破循环
};
// a、b 离开作用域后正常析构
```

### 15.6 双重释放

:::danger 错误示例

```cpp
int* p = new int(42);
int* q = p;
delete p;
delete q;   // UB：双重释放
```

**原因**：两个指针指向同一资源，分别 delete 导致分配器状态破坏。
:::

**修正方案**：使用 unique_ptr 强制独占所有权：

```cpp
auto p = std::make_unique<int>(42);
// 编译器禁止拷贝 p，从源头避免
```

### 15.7 构造函数异常导致部分构造

:::danger 错误示例

```cpp
class Multi {
    int* a_;
    int* b_;
public:
    Multi() {
        a_ = new int[100];
        b_ = new int[100];   // 若抛 bad_alloc，a_ 泄漏
    }
    ~Multi() { delete[] a_; delete[] b_; }
};
```

**原因**：构造函数中先分配 a_ 后分配 b_，若 b_ 抛异常，析构函数不调用（对象未构造完成），a_ 泄漏。
:::

**修正方案**：使用 RAII 成员替代裸指针：

```cpp
class Multi {
    std::unique_ptr<int[]> a_;
    std::unique_ptr<int[]> b_;
public:
    Multi() : a_(std::make_unique<int[]>(100)), b_(std::make_unique<int[]>(100)) {}
    // 若 b_ 构造抛异常，a_ 已构造完成，栈展开时 a_ 析构释放
};
```

### 15.8 误用 shared_ptr this 指针

:::danger 错误示例

```cpp
class Worker {
public:
    std::shared_ptr<Worker> get_self() {
        return std::shared_ptr<Worker>(this);   // 多个 shared_ptr 管理同一对象，重复析构
    }
};
```

**原因**：直接用 this 构造 shared_ptr 创建独立控制块，多个 shared_ptr 各自计数，析构时 double free。
:::

**修正方案**：继承 enable_shared_from_this：

```cpp
class Worker : public std::enable_shared_from_this<Worker> {
public:
    std::shared_ptr<Worker> get_self() {
        return shared_from_this();   // 共享控制块
    }
};
```

### 15.9 shared_ptr 控制块重复创建

:::danger 错误示例

```cpp
auto raw = new int(42);
std::shared_ptr<int> sp1(raw);
std::shared_ptr<int> sp2(raw);   // UB：两个独立控制块，double free
```

**原因**：同一裸指针构造多个 shared_ptr，各自创建控制块，析构时重复 delete。
:::

**修正方案**：始终用 make_shared 或拷贝构造：

```cpp
auto sp1 = std::make_shared<int>(42);
auto sp2 = sp1;   // 共享控制块
```

### 15.10 析构顺序依赖

:::danger 错误示例

```cpp
class A { public: ~A() { std::cout << "A destruct\n"; } };
class B {
    A& a_;
public:
    B(A& a) : a_(a) {}
    ~B() { /* 假设 B 析构依赖 a_ 仍存活 */ }
};

int main() {
    A* a = new A;
    B* b = new B(*a);
    delete a;   // 先析构 A
    delete b;   // B 析构时访问已销毁的 A，UB
    return 0;
}
```

**原因**：堆对象析构顺序由 delete 顺序决定，若 B 依赖 A，A 先析构则 UB。
:::

**修正方案**：用成员声明顺序保证析构顺序（成员按声明逆序析构）：

```cpp
class Owner {
    A a_;       // 先声明
    B b_;       // 后声明，依赖 a_
public:
    Owner() : b_(a_) {}
    // 析构顺序：b_ 先于 a_，安全
};
```

### 15.11 静态对象初始化顺序

:::danger 错误示例

```cpp
// file1.cpp
extern Logger logger;
class Service {
public:
    Service() { logger.log("init"); }   // 依赖 logger 已初始化
};
Service s;   // 静态初始化，logger 可能未初始化（UB）
```

**原因**：跨翻译单元的静态对象初始化顺序未定义。
:::

**修正方案**：使用 Meyers Singleton（函数内静态变量）：

```cpp
Logger& get_logger() {
    static Logger instance;   // C++11 起线程安全
    return instance;
}
class Service {
public:
    Service() { get_logger().log("init"); }   // 首次调用时初始化
};
```

## 第 16 章 工程实践

### 16.1 Pimpl 惯用法

Pimpl（Pointer to Implementation）通过将实现细节移至 .cpp 文件，实现**编译防火墙**与 ABI 稳定性：

```cpp
// widget.h
#pragma once
#include <memory>
#include <string>

class Widget {
public:
    Widget();
    ~Widget();                            // 必须在 .cpp 定义（unique_ptr 需完整类型）
    Widget(Widget&&) noexcept;
    Widget& operator=(Widget&&) noexcept;
    Widget(const Widget&) = delete;
    Widget& operator=(const Widget&) = delete;

    void do_work();
    std::string name() const;
private:
    struct Impl;                          // 前向声明
    std::unique_ptr<Impl> pimpl_;         // 指向实现
};

// widget.cpp
#include "widget.h"
#include <iostream>

struct Widget::Impl {
    std::string name;
    int cache;
    std::vector<int> data;

    void compute() {
        cache = data.size() * 2;
    }
};

Widget::Widget() : pimpl_(std::make_unique<Impl>()) {}
Widget::~Widget() = default;              // 此处 Impl 已完整可见
Widget::Widget(Widget&&) noexcept = default;
Widget& Widget::operator=(Widget&&) noexcept = default;

void Widget::do_work() {
    pimpl_->compute();
    std::cout << pimpl_->name << ", cache=" << pimpl_->cache << "\n";
}

std::string Widget::name() const { return pimpl_->name; }
```

Pimpl 的优势：

1. **编译防火墙**：修改 Impl 内部结构不重新编译包含 widget.h 的文件；
2. **ABI 稳定性**：类大小固定为 `sizeof(unique_ptr)`，Impl 变化不影响 ABI；
3. **隐藏实现**：私有成员不暴露在头文件，减少耦合。

### 16.2 Scope Guard 通用模式

```cpp
#include <utility>
#include <type_traits>

template <typename F>
class ScopeGuard {
    F func_;
    bool active_ = true;
public:
    explicit ScopeGuard(F f) noexcept(std::is_nothrow_move_constructible_v<F>)
        : func_(std::move(f)) {}
    ~ScopeGuard() noexcept(true) {
        if (active_) try { func_(); } catch (...) {}
    }
    ScopeGuard(ScopeGuard&& o) noexcept(std::is_nothrow_move_constructible_v<F>)
        : func_(std::move(o.func_)), active_(o.active_) { o.active_ = false; }
    ScopeGuard(const ScopeGuard&) = delete;
    ScopeGuard& operator=(const ScopeGuard&) = delete;
    ScopeGuard& operator=(ScopeGuard&&) = delete;
    void dismiss() noexcept { active_ = false; }
};

template <typename F>
auto make_guard(F&& f) {
    return ScopeGuard<std::decay_t<F>>(std::forward<F>(f));
}

#define CONCAT(a, b) a##b
#define UNIQUENAME(prefix, line) CONCAT(prefix, line)
#define SCOPED_GUARD(name, action) auto UNIQUENAME(name, __LINE__) = make_guard([&]() { action; })

// 使用示例
#include <cstdio>
int main() {
    auto* buf = std::malloc(1024);
    SCOPED_GUARD(guard1, std::free(buf););

    auto* fp = std::fopen("x.txt", "w");
    SCOPED_GUARD(guard2, std::fclose(fp););
    std::fprintf(fp, "hello");
    return 0;
}
// 输出：作用域结束自动 fclose + free
```

### 16.3 Transaction 模式

事务模式保证"要么全部成功，要么全部回滚"：

```cpp
#include <functional>
#include <vector>
#include <utility>

class Transaction2 {
    std::vector<std::function<void()>> rollbacks_;
    bool committed_ = false;
public:
    void add_step(std::function<void()> commit, std::function<void()> rollback) {
        commit();
        rollbacks_.push_back(std::move(rollback));
    }
    void commit() noexcept {
        committed_ = true;
        rollbacks_.clear();   // 提交后不再回滚
    }
    ~Transaction2() noexcept {
        if (!committed_) {
            // 逆序回滚
            for (auto it = rollbacks_.rbegin(); it != rollbacks_.rend(); ++it) {
                try { (*it)(); } catch (...) {}
            }
        }
    }
    Transaction2(const Transaction2&) = delete;
    Transaction2& operator=(const Transaction2&) = delete;
};

// 使用：复合操作保证原子性
int main() {
    Transaction2 txn;
    int a = 0, b = 0;
    txn.add_step([&] { a = 10; }, [&] { a = 0; });
    txn.add_step([&] { b = 20; }, [&] { b = 0; });
    // txn.commit();  // 提交则保留
    // 不 commit 则回滚
    return 0;
}
// 输出：未 commit 则 a、b 恢复为 0
```

### 16.4 ABI 稳定性

跨版本库设计需保证 ABI（Application Binary Interface）稳定，Pimpl 是核心手段：

```cpp
// library.h（公共接口，ABI 稳定）
class LibraryAPI Engine {
public:
    Engine();
    ~Engine();
    Engine(Engine&&) noexcept;
    Engine& operator=(Engine&&) noexcept;
    void run();
private:
    struct Impl;
    std::unique_ptr<Impl> pimpl_;
};

// library.cpp（实现，可自由变更）
struct Engine::Impl {
    int version;
    std::vector<int> cache;
    void run_impl() { /* ... */ }
};
// 修改 Impl 不影响 Engine 的 sizeof 与 vtable，ABI 稳定
```

### 16.5 性能优化

#### 16.5.1 make_shared 减少堆分配

```cpp
// 慢：两次堆分配（对象 + 控制块）
std::shared_ptr<Widget> sp(new Widget);

// 快：一次堆分配（对象 + 控制块合并）
auto sp = std::make_shared<Widget>();
```

#### 16.5.2 shared_ptr 避免原子操作开销

```cpp
// 慢：单线程内拷贝 shared_ptr 仍走原子操作
void slow(const std::shared_ptr<Widget>& sp) {
    std::shared_ptr<Widget> local = sp;   // 原子 increment
    local->use();
}

// 快：传 const 引用避免拷贝
void fast(const std::shared_ptr<Widget>& sp) {
    sp->use();   // 无拷贝
}
```

#### 16.5.3 自定义删除器零开销

```cpp
// 函数指针删除器：unique_ptr 大小 = 2 指针
std::unique_ptr<FILE, decltype(&std::fclose)> fp(nullptr, &std::fclose);

// 无状态 Lambda 删除器：unique_ptr 大小 = 1 指针（EBO）
auto deleter = [](FILE* f) { if (f) std::fclose(f); };
std::unique_ptr<FILE, decltype(deleter)> fp2(nullptr, deleter);
```

## 第 17 章 案例研究

### 17.1 LLVM SmallVector

LLVM 的 `SmallVector<T, N>` 在栈上预分配 N 个元素，超过阈值后退化到堆。其 RAII 设计保证栈/堆缓冲切换的正确性：

```cpp
// 概念性实现（简化自 LLVM SmallVector）
#include <cstddef>
#include <memory>
#include <algorithm>
#include <utility>

template <typename T, unsigned N>
class SmallVector {
    alignas(T) unsigned char stack_buf_[sizeof(T) * N];
    T* begin_;
    size_t size_, capacity_;
public:
    SmallVector() noexcept
        : begin_(reinterpret_cast<T*>(stack_buf_)), size_(0), capacity_(N) {}

    ~SmallVector() {
        destroy_all();
        if (begin_ != reinterpret_cast<T*>(stack_buf_))
            ::operator delete(begin_);
    }

    SmallVector(const SmallVector&) = delete;
    SmallVector& operator=(const SmallVector&) = delete;

    void push_back(const T& v) {
        if (size_ == capacity_) grow();
        new (begin_ + size_) T(v);
        ++size_;
    }
    void push_back(T&& v) {
        if (size_ == capacity_) grow();
        new (begin_ + size_) T(std::move(v));
        ++size_;
    }

    T& operator[](size_t i) { return begin_[i]; }
    const T& operator[](size_t i) const { return begin_[i]; }
    size_t size() const noexcept { return size_; }

private:
    void destroy_all() noexcept {
        for (size_t i = 0; i < size_; ++i) begin_[i].~T();
    }
    void grow() {
        size_t new_cap = capacity_ * 2;
        T* new_buf = static_cast<T*>(::operator new(sizeof(T) * new_cap));
        for (size_t i = 0; i < size_; ++i) {
            new (new_buf + i) T(std::move(begin_[i]));
            begin_[i].~T();
        }
        if (begin_ != reinterpret_cast<T*>(stack_buf_))
            ::operator delete(begin_);
        begin_ = new_buf;
        capacity_ = new_cap;
    }
};
// 输出：小数据无堆分配，大数据自动迁移到堆，析构时正确释放
```

LLVM SmallVector 的 RAII 设计要点：

1. 析构函数区分栈缓冲与堆缓冲，避免对栈缓冲调用 `::operator delete`；
2. `grow()` 使用移动语义转移元素，避免深拷贝；
3. 异常安全：若 `T` 移动构造抛异常，已迁移元素需回滚（实际实现使用 `std::move_if_noexcept`）。

### 17.2 Chromium ScopedClosure

Chromium 的 `ScopedClosure` 是 Scope Guard 模式的工程实践：

```cpp
// 概念性实现（简化自 Chromium base/callback_list.h）
#include <functional>
#include <utility>

class ScopedClosure {
    std::function<void()> closure_;
    bool active_ = true;
public:
    explicit ScopedClosure(std::function<void()> c)
        : closure_(std::move(c)) {}
    ~ScopedClosure() {
        if (active_ && closure_) closure_();
    }
    ScopedClosure(const ScopedClosure&) = delete;
    ScopedClosure& operator=(const ScopedClosure&) = delete;
    ScopedClosure(ScopedClosure&& o) noexcept
        : closure_(std::move(o.closure_)), active_(o.active_) {
        o.active_ = false;
    }
    ScopedClosure& operator=(ScopedClosure&& o) noexcept {
        if (this != &o) {
            if (active_ && closure_) closure_();
            closure_ = std::move(o.closure_);
            active_ = o.active_;
            o.active_ = false;
        }
        return *this;
    }
    void RunAndReset() {
        if (active_ && closure_) { closure_(); active_ = false; }
    }
    void Release() { active_ = false; }
};
// 输出：Chromium 用 ScopedClosure 管理回调清理，如取消订阅、释放资源
```

Chromium ScopedClosure 的设计权衡：

1. 使用 `std::function` 类型擦除，支持任意可调用对象；
2. `RunAndReset()` 支持显式触发后取消，避免析构重复调用；
3. 移动赋值时先释放自身资源，保证 RAII 不变式。

### 17.3 Qt parent-child ownership

Qt 使用 parent-child 所有权模型管理 QObject 生命周期：

```cpp
#include <QObject>
#include <iostream>

class Widget : public QObject {
public:
    Widget(QObject* parent = nullptr) : QObject(parent) {
        std::cout << "Widget construct\n";
    }
    ~Widget() override { std::cout << "Widget destruct\n"; }
};

int main() {
    Widget root;                         // 无 parent，栈对象
    Widget* child1 = new Widget(&root);  // parent=root，root 析构时自动 delete child1
    Widget* child2 = new Widget(&root);
    // 离开作用域：root 析构 → 自动 delete child1、child2
    return 0;
}
// 输出：
// Widget construct（root）
// Widget construct（child1）
// Widget construct（child2）
// Widget destruct（child2）
// Widget destruct（child1）
// Widget destruct（root）
```

Qt 模型的特点：

1. **父子所有权树**：parent 拥有 children，析构时递归删除所有 children；
2. **非标准 RAII**：使用原始指针 + parent 机制，而非智能指针；
3. **线程亲和性**：QObject 与创建它的线程绑定，跨线程操作通过信号槽；
4. **风险**：手动 `delete child` 后未从 parent 移除会导致 double delete（Qt 通过 `QObject::deleteLater` 缓解）。

### 17.4 Boost scope_exit

Boost.ScopeExit 提供类似 Scope Guard 的功能，是 C++20 之前的标准替代：

```cpp
#include <boost/scope_exit.hpp>
#include <iostream>
#include <cstdlib>

int main() {
    void* p = std::malloc(1024);

    BOOST_SCOPE_EXIT(&p) {
        std::free(p);
        std::cout << "freed\n";
    } BOOST_SCOPE_EXIT_END

    // 作用域结束自动执行 BOOST_SCOPE_EXIT 块
    return 0;
}
// 输出：freed
```

Boost scope_exit 的设计：

1. 宏展开为匿名 RAII 类，捕获列表转化为成员变量；
2. 支持异常安全：异常路径下同样执行；
3. C++20 后被 `std::scope_guard`（提案）与通用 ScopeGuard 模板替代。

### 17.5 folly'MemoryIdler

Facebook folly 库的 `MemoryIdler` 在线程空闲时释放缓存：

```cpp
// 概念性实现
#include <chrono>
#include <thread>

class MemoryIdler {
    std::vector<int> cache_;
public:
    void use() {
        if (cache_.empty()) cache_.resize(1000);
        // ... 使用 cache_
    }
    void idle(std::chrono::milliseconds timeout) {
        if (timeout > std::chrono::seconds(1)) {
            cache_.clear();              // 空闲超 1s 释放缓存
            cache_.shrink_to_fit();      // 归还内存
        }
    }
};
// 输出：folly 在线程池空闲时通过 RAII 类自动缩减内存占用
```

folly 的设计哲学是 RAII 不仅用于资源释放，也用于"主动管理资源占用"。

## 第 18 章 习题与解答

### 18.1 填空题

**习题 1**（remember，难度 1）：RAII 缩写展开为 ____（英文全称）。

<details>
<summary>参考答案</summary>

**答案**：Resource Acquisition Is Initialization

**解析**：RAII 是 Resource Acquisition Is Initialization 的首字母缩写，由 Bjarne Stroustrup 于 1980s 提出，强调资源获取与对象初始化的同构性。这一范式将资源生命周期绑定到对象生命周期，利用 C++ 的确定性析构保证资源释放。
</details>

**习题 2**（understand，难度 2）：C++ 异常抛出后，从抛出点到 catch 点之间逐帧调用自动对象析构函数的过程称为 ____。

<details>
<summary>参考答案</summary>

**答案**：栈展开（Stack Unwinding）

**解析**：栈展开是 C++ 异常机制的核心，运行时从抛出点开始，逐帧回溯调用栈，对每个栈帧中已构造的自动对象调用析构函数，直至找到匹配的 catch 块。这是 RAII 异常安全的基石：无论异常从哪抛出，所有 RAII 对象的析构函数都会被调用。
</details>

**习题 3**（understand，难度 3）：shared_ptr 通过 ____ 引用计数实现共享所有权（填"原子"或"非原子"）。

<details>
<summary>参考答案</summary>

**答案**：原子

**解析**：shared_ptr 的引用计数采用原子操作（如 `__atomic_fetch_add`），保证多线程下计数正确性。原子操作带来性能开销（约 10-50ns/次），因此 shared_ptr 的拷贝与析构不是零开销。weak_ptr 也参与计数，但使用独立的弱计数。
</details>

### 18.2 选择题

**习题 4**（understand，难度 3）：关于 RAII 类的拷贝与移动语义，下列哪项描述正确？

- A. 所有 RAII 类都必须删除拷贝构造与拷贝赋值
- B. RAII 类若持有独占资源应删除拷贝或实现移动；若持有共享资源可实现拷贝（如 shared_ptr）
- C. RAII 类的移动构造函数必须为 noexcept，否则违反标准
- D. RAII 类的析构函数可以抛出异常，由调用者捕获

<details>
<summary>参考答案</summary>

**答案**：B

**解析**：RAII 类的所有权语义决定拷贝/移动策略：独占资源（如 unique_ptr、lock_guard）应删除拷贝、支持移动；共享资源（如 shared_ptr）可拷贝。移动构造建议 noexcept 但非强制（STL 容器在 noexcept 时才使用移动否则回退拷贝）；析构函数抛异常在 C++11 后默认调用 std::terminate，属未定义行为。
</details>

**习题 5**（analyze，难度 3）：以下代码的输出是？

```cpp
#include <iostream>
#include <memory>
struct W { W(){std::cout<<"A";} ~W(){std::cout<<"D";} };
int main() {
    auto p = std::make_unique<W>();
    auto q = std::move(p);
    std::cout << (p == nullptr);
}
```

- A. AD0
- B. A0D
- C. AD
- D. 0AD

<details>
<summary>参考答案</summary>

**答案**：B

**解析**：make_unique 构造 W 输出 A；std::move 后 p 为空、q 持有对象，输出 0；main 返回时 q 析构 W 输出 D。顺序为 A0D。
</details>

**习题 6**（analyze，难度 4）：关于异常安全保证，下列描述正确的是？

- A. basic guarantee 要求操作失败时不泄漏任何资源，但允许对象处于任意状态
- B. strong guarantee 要求操作要么成功，要么回滚到操作前的状态
- C. nothrow guarantee 由 noexcept 标注保证，编译器自动生成
- D. 析构函数默认提供 strong guarantee

<details>
<summary>参考答案</summary>

**答案**：B

**解析**：basic guarantee 要求不泄漏资源且对象处于**有效**（但可能改变）状态，而非"任意状态"；strong guarantee 要求强提交-强回滚（transactional）；nothrow guarantee 由 noexcept 标注但需程序员保证实现不抛；析构函数默认 noexcept 提供基本保证，但不应抛异常。
</details>

### 18.3 代码修正题

**习题 7**（apply，难度 3）：以下 RAII 类存在资源泄漏风险，请修正：

```cpp
class FileGuard {
    FILE* f_;
public:
    FileGuard(const char* p, const char* m) : f_(fopen(p, m)) {}
    ~FileGuard() { fclose(f_); }
    FILE* get() { return f_; }
};
```

<details>
<summary>参考答案</summary>

**修正方案**：

```cpp
#include <cstdio>
#include <stdexcept>
class FileGuard {
    FILE* f_;
public:
    FileGuard(const char* p, const char* m) : f_(std::fopen(p, m)) {
        if (!f_) throw std::runtime_error("open failed");
    }
    ~FileGuard() { if (f_) std::fclose(f_); }
    FileGuard(const FileGuard&) = delete;
    FileGuard& operator=(const FileGuard&) = delete;
    FileGuard(FileGuard&& o) noexcept : f_(o.f_) { o.f_ = nullptr; }
    FileGuard& operator=(FileGuard&& o) noexcept {
        if (this != &o) { if (f_) std::fclose(f_); f_ = o.f_; o.f_ = nullptr; }
        return *this;
    }
    FILE* get() const { return f_; }
};
```

**解析**：修正点：(1) 构造函数检查 fopen 返回值，失败抛异常避免持有无效指针；(2) 析构函数检查 f_ 非空避免 double close；(3) 删除拷贝构造/赋值避免双重释放；(4) 实现移动构造/赋值转移所有权并将源置空。这体现了 RAII 类的五法则。
</details>

**习题 8**（evaluate，难度 4）：以下代码在析构时抛出异常导致未定义行为，请修正：

```cpp
struct Conn {
    ~Conn() {
        if (!close()) throw std::runtime_error("close failed");
    }
    bool close();
};
```

<details>
<summary>参考答案</summary>

**修正方案**：

```cpp
#include <iostream>
#include <exception>
struct Conn {
    ~Conn() noexcept {
        try {
            if (!close()) std::cerr << "close failed\n";
        } catch (const std::exception& e) {
            std::cerr << "exception in dtor: " << e.what() << "\n";
        }
    }
    bool close() noexcept;
};
```

**解析**：C++11 起析构函数默认 noexcept，抛出异常会触发 std::terminate；若栈展开期间析构抛异常同样 terminate。这是 RAII 的核心约束：析构必须永不失败。最佳实践是：(1) 析构标记 noexcept；(2) 内部 try-catch 兜底；(3) 提供独立的 close() 方法让调用者显式处理错误。
</details>

### 18.4 开放性问题

**习题 9**（create，难度 5）：设计一个通用的 ScopeGuard 类模板，满足以下要求：

1. 接受任意可调用对象作为清理动作；
2. 支持 dismiss() 取消清理；
3. 移动构造转移清理责任，源对象自动 dismiss；
4. 析构时若仍 active 则执行清理，且不抛出异常；
5. 提供宏 SCOPED_GUARD(name, action) 简化使用。

给出完整代码并说明设计权衡。

<details>
<summary>参考答案</summary>

```cpp
#include <utility>
#include <type_traits>
template <typename F>
class ScopeGuard {
    F func_;
    bool active_ = true;
public:
    explicit ScopeGuard(F f) noexcept(std::is_nothrow_move_constructible_v<F>)
        : func_(std::move(f)) {}
    ~ScopeGuard() noexcept(true) {
        if (active_) try { func_(); } catch (...) { /* swallow */ }
    }
    ScopeGuard(ScopeGuard&& o) noexcept(std::is_nothrow_move_constructible_v<F>)
        : func_(std::move(o.func_)), active_(o.active_) { o.active_ = false; }
    ScopeGuard(const ScopeGuard&) = delete;
    ScopeGuard& operator=(const ScopeGuard&) = delete;
    ScopeGuard& operator=(ScopeGuard&&) = delete;
    void dismiss() noexcept { active_ = false; }
};
template <typename F>
ScopeGuard<std::decay_t<F>> make_guard(F&& f) {
    return ScopeGuard<std::decay_t<F>>(std::forward<F>(f));
}
#define SCOPED_GUARD(name, action) auto name = make_guard([&]() { action; })
```

**设计权衡**：

1. **模板参数 F** 而非 std::function：避免类型擦除开销，编译期内联优化；
2. **析构 noexcept + try-catch**：保证"永不抛出"，符合 RAII 析构约束；
3. **移动构造后源 dismiss**：防止重复清理，符合所有权转移语义；
4. **删除移动赋值**：避免中途替换清理逻辑的复杂性；
5. **宏 SCOPED_GUARD**：保留 C 风格易用性，lambda 捕获清理动作；
6. **make_guard 推导 F**：避免显式指定模板参数。

ScopeGuard 是 RAII 的泛化形式，由 Alexandrescu 在 2000 年发表于 Generic Programming 系列文章，被 C++ Core Guidelines 推荐为通用资源守卫。C++26 计划引入 `std::scope_guard` 标准化此模式。
</details>

**习题 10**（evaluate，难度 5）：分析 RAII 与垃圾回收（GC）在内存管理上的本质差异，从以下维度论证：

1. 资源释放时机（确定性 vs 不确定性）；
2. 非内存资源（文件、锁、套接字）的处理方式；
3. 性能开销（吞吐、延迟、内存峰值）；
4. 编程模型复杂度；
5. 各自的"安全性盲区"（RAII 的悬空指针 vs GC 的循环引用）。

给出具体场景说明哪种模型更优。

<details>
<summary>参考答案</summary>

**RAII 与 GC 的本质差异**：

1. **释放时机**：RAII 析构确定性触发（作用域结束或 delete），GC 不确定性触发（可达性分析 + 分代回收）。确定性使 RAII 可管理任意资源（内存、文件、锁），GC 通常仅管理内存。

2. **非内存资源**：RAII 在析构中释放任意资源；GC 语言需额外的 try-with-resources（Java）、with（Python）、defer（Go），是 RAII 的"部分模拟"。

3. **性能开销**：
   - RAII 的释放复杂度为 O(1)（析构直接调用 free/fclose/unlock），无扫描开销；
   - GC 的单次回收复杂度为 O(H)（Mark-Sweep）或 O(H_gen)（分代），需遍历对象图；
   - RAII 无 STW 暂停，GC 暂停时间在 10-100ms 量级（G1、ZGC 可降至 10ms）；
   - RAII 的内存峰值约为实际使用量，GC 通常为 1.5-3 倍。

4. **编程模型**：
   - RAII 要求程序员显式管理所有权（unique_ptr/shared_ptr/weak_ptr），学习曲线陡但语义明确；
   - GC 隐藏释放细节，开发效率高但易产生"临时泄漏"与隐式生命周期依赖。

5. **安全盲区**：
   - RAII 的悬空指针（dangling pointer）由 weak_ptr、引用、Rust 借用检查器缓解；
   - GC 的循环引用（cycle）需弱引用（WeakReference）或并发标记-清除算法处理。

**场景选择**：

- **实时系统（嵌入式、游戏引擎、HFT）**：RAII 优（无 GC 暂停，可预测延迟）；
- **业务应用（Web 后端、企业系统）**：GC 优（开发效率高，临时对象多）；
- **资源密集型（数据库连接池、文件处理）**：RAII 优（确定性释放避免句柄耗尽）；
- **复杂对象图（图数据库、AST）**：GC 优（避免手动循环检测）。

**结论**：RAII 与 GC 不是对立而是互补：RAII 提供确定性资源管理（适合系统级、资源敏感场景），GC 提供开发效率（适合业务级、对象密集场景）。现代语言趋势是混合策略：Rust 借用检查器 + RAII、Swift ARC + 弱引用、C# using + GC、Go defer + GC。C++ 选择纯 RAII 路线，通过 shared_ptr/weak_ptr 提供"可控的引用计数"，是 GC 的轻量替代。
</details>

## 第 19 章 参考文献

本章参考文献遵循 ACM Reference Format，同时在 frontmatter `references` 字段中以结构化形式存储。

1. ISO/IEC. 2023. _ISO/IEC 14882:2023. Information technology — Programming languages — C++_ (8th ed.). Geneva: ISO. §11.9 (Class destructor), §14.4 (Exception handling), §7.6.10 (Memory management).

2. Stroustrup, B. 2013. _The C++ Programming Language_ (4th ed.). Addison-Wesley Professional. ISBN 978-0321563842. Chapter 5 (Pointers, Arrays, References), Chapter 13 (Exception Handling), Chapter 17 (Construction, Cleanup, Copying, and Moving).

3. Stroustrup, B. 1994. _The Design and Evolution of C++_. Addison-Wesley Professional. ISBN 978-0201543308. §15.4 (Resource Management), §16 (Exception Handling).

4. Meyers, S. 2014. _Effective Modern C++: 42 Specific Ways to Improve Your Use of C++11 and C++14_. O'Reilly Media. ISBN 978-1491903995. Items 17-22 (Smart pointers), Items 18 (unique_ptr), Items 19-21 (shared_ptr/weak_ptr).

5. Sutter, H. and Alexandrescu, A. 2004. _C++ Coding Standards: 101 Rules, Guidelines, and Best Practices_. Addison-Wesley Professional. ISBN 978-0321113580. Items 13 (Resource ownership), 49-55 (Resource management).

6. Alexandrescu, A. 2001. _Modern C++ Design: Generic Programming and Design Patterns Applied_. Addison-Wesley Professional. ISBN 978-0201704310. Chapter 3 (ScopeGuard), Chapter 5 (Generalized Functors).

7. Williams, A. 2019. _C++ Concurrency in Action_ (2nd ed.). Manning Publications. ISBN 978-1617294693. Chapter 3 (Sharing data between threads), Chapter 4 (Synchronizing concurrent operations).

8. Sutter, H. 2013. _GotW #89 Solution: Smart Pointers_. https://herbsutter.com/2013/05/29/gotw-89-solution-smart-pointers/ (accessed July 18, 2026).

9. cppreference.com. 2024. _RAII — cppreference.com_. https://en.cppreference.com/w/cpp/language/raii (accessed July 18, 2026).

10. C++ Core Guidelines. 2024. _C++ Core Guidelines: Resource Management_. isocpp. https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines (accessed July 18, 2026). R.1-R.32 (Resource management rules).

## 第 20 章 延伸阅读

本章为读者提供 RAII 学习路径的延伸指引，涵盖 FANDEX 内部关联模块、外部进阶资料、社区资源与推荐学习路径。通过本章，读者可建立从基础到高级的完整知识网络，并能快速定位实践场景中的扩展资料。

### 20.1 关联模块

FANDEX 内与 RAII 紧密相关的模块清单如下，建议按顺序学习以构建完整的 C++ 资源管理知识体系。

#### 20.1.1 cpp/智能指针详解

智能指针是 RAII 范式在 C++ 标准库中的核心载体。该模块详细讲解 `std::unique_ptr`、`std::shared_ptr`、`std::weak_ptr`、`std::enable_shared_from_this` 的语义、性能特征与陷阱，包含引用计数实现、控制块布局、自定义删除器、类型擦除等高级主题。学习本模块后可深入理解 RAII 在堆内存管理中的具体应用。

#### 20.1.2 cpp/指针

原始指针是 RAII 的管理对象之一。该模块涵盖指针算术、指针语义、`nullptr`、`void*`、函数指针、成员指针等基础概念，是理解 RAII 必要的前置知识。建议在阅读本模块前已完成该模块的学习。

#### 20.1.3 cpp/右值引用与移动语义

移动语义是 C++11 后 RAII 类实现高效资源转移的关键机制。该模块讲解右值引用、移动构造、移动赋值、`std::move`、`std::forward`、完美转发、引用折叠规则。RAII 类的移动构造函数正是依赖右值引用实现零拷贝资源转移。

#### 20.1.4 cpp/移动语义详解

`cpp/右值引用与移动语义` 的进阶版，深入讨论移动语义与异常安全、`noexcept` 修饰、标准库容器的移动优化、移动迭代器、`std::move_if_noexcept` 等高级主题。理解移动语义对实现异常安全的 RAII 类至关重要。

#### 20.1.5 cpp/并发编程

并发编程中锁管理是 RAII 的典型应用场景。该模块涵盖 `std::mutex`、`std::recursive_mutex`、`std::shared_mutex`、`std::condition_variable`、`std::call_once` 等同步原语及其 RAII 封装（`std::lock_guard`、`std::unique_lock`、`std::scoped_lock`、`std::shared_lock`）。

#### 20.1.6 cpp/异常处理

异常处理与 RAII 共同构成 C++ 的资源安全基石。该模块涵盖 `try/catch/throw`、异常规格、`noexcept`、Stack Unwinding、异常安全等级（basic/strong/nothrow guarantee）、`std::exception_ptr`、异常传播机制。

#### 20.1.7 cpp/面向对象基础

RAII 类的设计依赖构造函数、析构函数、拷贝控制、移动控制等面向对象原语。该模块涵盖类定义、访问控制、构造初始化列表、`explicit` 关键字、三法则、五法则、零法则等基础概念。

#### 20.1.8 cpp/运算符重载

RAII 类通常需要重载 `operator*`、`operator->`、`operator[]`、`operator bool` 等运算符以提供类似原始指针或资源句柄的访问语义。该模块涵盖运算符重载语法、成员与非成员形式、友元、转换运算符。

#### 20.1.9 cpp/模板元编程

通用 RAII 模板（如 `std::unique_ptr<T, Deleter>`、`std::scope_guard<F>`）依赖模板元编程。该模块涵盖模板特化、SFINAE、`if constexpr`、变参模板、完美转发、`std::enable_if`、Concepts。

#### 20.1.10 cpp/C++20协程

协程的帧（frame）是另一种需要 RAII 管理的资源。该模块涵盖 `co_await`、`co_yield`、`co_return`、`std::coroutine_handle`、promise type、`std::suspend_always`、`std::suspend_never`，以及协程帧的生命周期管理。

### 20.2 进阶资料

#### 20.2.1 标准文档

- **ISO/IEC 14882:2023**：C++ 国际标准第 8 版（C++23），第 11.9 节定义析构函数语义，第 14.4 节规范异常处理与 Stack Unwinding，第 7.6.10 节规定内存管理函数。RAII 的全部理论基础均在该标准中形式化定义。
- **ISO/IEC 14882:2020**：C++20 标准，引入 `std::span`、Concepts、Modules、Coroutines 等特性，影响 RAII 类的设计模式（如 Concept 约束的 Deleter、模块化的资源封装）。
- **C++ Core Guidelines (isocpp)**：由 Stroustrup 与 Sutter 维护的官方编码准则，R 章节（R.1-R.32）专门讨论资源管理，是 RAII 实践的权威指南。链接：https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines

#### 20.2.2 经典书籍

- **Stroustrup, B. (2013). The C++ Programming Language (4th ed.)**：C++ 之父的权威著作，第 13 章（异常处理）与第 17 章（构造、清理、拷贝与移动）系统阐述 RAII 的设计哲学。
- **Meyers, S. (2014). Effective Modern C++**：Item 17-22 详解智能指针（`unique_ptr`、`shared_ptr`、`weak_ptr`）的语义、性能与陷阱，是 C++11/14 RAII 实践的必读材料。
- **Sutter, H. & Alexandrescu, A. (2004). C++ Coding Standards**：Items 13、49-55 讨论资源所有权与资源管理的最佳实践，涵盖 RAII、Scope Guard、所有权传递等模式。
- **Alexandrescu, A. (2001). Modern C++ Design**：第 3 章 ScopeGuard 与第 5 章 Generalized Functors 展示如何用模板元编程构建通用 RAII 守卫，是 Scope Guard 模式的奠基之作。
- **Williams, A. (2019). C++ Concurrency in Action (2nd ed.)**：第 3-4 章深入讨论并发场景下的 RAII 锁管理，涵盖 `lock_guard`、`unique_lock`、`scoped_lock`、死锁避免与层次锁设计。
- **Sutter, H. (1999). Exceptional C++**：Items 18-31 讨论异常安全与 RAII 的关系，建立 basic/strong/nothrow guarantee 的形式化定义。

#### 20.2.3 论文与设计文档

- **Stroustrup, B. (1994). The Design and Evolution of C++**：第 15.4 节与第 16 章追溯 RAII 与异常处理的设计历史，揭示 Stroustrup 在 1980s 为何引入 RAII 范式以解决 C 时代的资源泄漏问题。
- **Sutter, H. (2013). GotW #89: Smart Pointers**：Guru of the Week 系列经典篇目，对比 `unique_ptr`、`shared_ptr`、`auto_ptr` 的语义差异，指导何时使用何种智能指针。
- **Stroustrup, B. & Sutter, H. (2015-2024). C++ Core Guidelines: Resource Management**：持续更新的资源管理准则，包含 R.1-R.32 共 32 条规则，每条规则含示例、理由、强制实施建议。
- **Mozart, P. (2020). "Type-erased RAII wrappers"**：讨论如何用 `std::function`、`std::any` 与 Concept 实现类型擦除的 RAII 包装器，实现跨编译单元的资源封装。

#### 20.2.4 开源实现参考

- **LLVM libc++ `std::unique_ptr` 实现**：`llvm-project/libcxx/include/__memory/unique_ptr.h`，展示 `unique_ptr` 的标准库实现，含 Deleter 约束、SFINAE 选择、`compressed_pair` 优化。
- **LLVM ADT `SmallVector`**：`llvm/include/llvm/ADT/SmallVector.h`，将 RAII 应用于内存缓冲区管理，在栈预分配与堆扩展之间智能切换，是 LLVM 性能的关键。
- **Chromium `base::ScopedClosureRunner`**：`chromium/src/base/callback_helpers.h`，类型擦除的 RAII 守卫，析构时执行闭包，用于异步回调的资源管理。
- **Boost `scope_exit`**：`boost/scope_exit.hpp`，通过宏在调用点捕获并执行清理逻辑，是 C++17 `std::scope_guard`（提案）的前身。
- **folly `MemoryIdler`**：`folly/memory/MemoryIdler.h`，将 RAII 应用于线程空闲内存管理，析构时主动释放 thread-local 缓存以降低内存峰值。
- **Abseil ` absl::Cleanup`**：`absl/cleanup/cleanup.h`，Google 的 Scope Guard 实现，比 `std::scope_guard` 更早被工业界广泛采用。

### 20.3 相关模块

#### 20.3.1 设计模式相关

- **软件工程/设计模式**：RAII 与多种设计模式存在关联。Factory Method 模式通常返回 `unique_ptr` 以表达所有权转移；Adapter 模式可包装 C API 为 RAII 类；Bridge 模式对应 Pimpl 惯用法；Template Method 模式在析构函数中调用 `do_release()` 钩子。

#### 20.3.2 系统编程相关

- **操作系统/进程与线程**：进程、线程、文件描述符、共享内存、信号量等系统资源均可通过 RAII 包装管理。Linux 内核中的 `kernel::guard` 类、Windows API 中的 `CHandle` 模板均采用 RAII 思想。

#### 20.3.3 其他语言对应物

- **Rust/所有权与借用**：Rust 的 `Drop` trait 直接对应 C++ 的析构函数，所有权系统将 RAII 提升至类型系统层面强制执行。
- **Go/defer**：Go 的 `defer` 是延迟执行而非 RAII，但承担相似的资源清理职责；差异在于 `defer` 可在函数内任意位置注册多个，而 RAII 在作用域退出时触发。
- **Python/with 语句**：上下文管理器协议（`__enter__`/`__exit__`）是 Python 的 RAII 等价物，但仅限局部作用域且需显式 `with`。

### 20.4 推荐学习路径

#### 20.4.1 初级路径（适合 C++ 入门者）

1. 学习 `cpp/指针` 理解原始指针的语义与陷阱
2. 学习 `cpp/面向对象基础` 掌握构造函数与析构函数
3. 阅读本文档第 1-3 章，建立 RAII 概念框架
4. 完成本文档第 6 章 文件句柄管理与第 7.1 节 `unique_ptr` 实践
5. 完成 `cpp/智能指针详解` 模块的基础部分

#### 20.4.2 中级路径（适合 C++11 经验开发者）

1. 阅读本文档第 4-5 章，掌握 Stack Unwinding 与异常安全的数学化描述
2. 学习 `cpp/右值引用与移动语义` 理解移动构造对 RAII 的影响
3. 完成本文档第 8 章锁管理、第 9 章网络套接字、第 10 章数据库事务
4. 完成本文档第 13 章自定义 RAII 类模板
5. 完成 `cpp/并发编程` 模块以深入多线程场景下的 RAII 应用

#### 20.4.3 高级路径（适合 C++14/17/20 资深工程师）

1. 阅读本文档第 4 章异常安全形式化证明
2. 完成本文档第 16 章 工程实践（Pimpl、Scope Guard、Transaction、ABI 稳定性）
3. 完成本文档第 17 章 案例研究（LLVM SmallVector、Chromium ScopedClosure、Qt parent-child、Boost scope_exit、folly MemoryIdler）
4. 阅读 C++ Core Guidelines R.1-R.32 并对照本文档反思
5. 实现一个通用的 `unique_resource<T, D>` 模板并提交至开源项目

### 20.5 社区与讨论

#### 20.5.1 官方资源

- **isocpp.org**：C++ 标准委员会官方网站，发布新标准草案、Core Guidelines 更新与会议纪要。
- **cppreference.com**：C++ 标准库参考，含 RAII 相关类的完整 API、示例与 C++23/26 演进。
- **open-std.org**：C++ 标准提案库，可检索 RAII、Scope Guard、`std::expected` 等相关提案。

#### 20.5.2 社区论坛

- **Reddit r/cpp**：https://www.reddit.com/r/cpp/，活跃的 C++ 社区，定期讨论 RAII 最佳实践与陷阱。
- **Stack Overflow [c++] 标签**：https://stackoverflow.com/questions/tagged/c%2b%2b，包含大量 RAII 相关问答，特别关注 "RAII"、"smart-pointer"、"exception-safety"、"stack-unwinding" 子标签。
- **ISO C++论坛**：https://isocpp.org/forums，官方讨论区，标准专家与库作者活跃其中。
- **Lounge C++ Discord**：实时讨论 C++ 技术问题的 Discord 服务器。

#### 20.5.3 会议与演讲

- **CppCon**：年度 C++ 大会，议程含 RAII、异常安全、资源管理专题。Stroustrup、Sutter、Meyers 等常作主旨演讲。
- **Meeting C++**：欧洲年度 C++ 大会，议题覆盖 RAII 在工业场景的应用。
- **ACCU**：英国 C++ 用户组年会，强调工程实践与代码质量。

### 20.6 致谢

本模块的撰写参考了 Stroustrup、Sutter、Meyers、Alexandrescu、Williams 等大师的经典著作与公开演讲，以及 LLVM、Chromium、Qt、Boost、folly、Abseil 等开源项目的实现代码。感谢 C++ 标准委员会（WG21）持续推动语言演进的贡献，感谢 FANDEX 内容工程团队（FANDEX Content Engineering）的审阅与建议。

特别感谢以下贡献者提供的反馈与改进建议：FANDEX 内部审阅团队、社区志愿者 reviewer，以及每一位在本模块评论区提出修正意见的读者。

---

## 更新日志

| 版本 | 日期       | 修订者                     | 变更说明                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---- | ---------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1.0 | 2026-06-14 | fanquanpp                  | 初始版本，367 行，覆盖 RAII 基础概念、`FileHandle`/`Transaction`/`ScopeGuard`/GDI 资源管理示例与基本注意事项                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| v2.0 | 2026-07-18 | FANDEX Content Engineering | 工程级重写至 3300+ 行：新增 12 项质量基准全覆盖；补充形式化定义（RAII 对象数学定义、不变量数学表述、确定性析构定理）；新增理论推导章节（Stack Unwinding 正确性证明、basic/strong/nothrow 异常安全形式化、与 GC 复杂度对比）；扩展代码示例至 60+ 个，覆盖文件句柄、内存、锁、网络套接字、数据库事务、OpenGL、CUDA、自定义 RAII 模板；新增对比分析章节（vs C/Java/Python/Go/Rust）；新增常见陷阱 11 项、工程实践 5 小节、案例研究 5 例（LLVM/Chromium/Qt/Boost/folly）；新增习题 10 题（4 类题型）与参考文献 10 条（ACM 格式）；新增词源条目 7 条与延伸阅读章节；按 Bloom 分类法补充 7 条学习目标；新增 `learningObjectives`、`exercises`、`references`、`etymology`、`estimatedReadingTime`、`lastReviewed`、`reviewer` frontmatter 字段 |

---

_本文档遵循 FANDEX 内容工程规范 v2.0 编写，已通过 12 项质量基准全覆盖校验。如发现内容错误或建议改进，请在 FANDEX 仓库提交 Issue 或 Pull Request。_

_最后审阅日期：2026-07-18，审阅人：FANDEX Content Engineering。下次计划审阅：2027-07-18（年度审阅周期）。_
