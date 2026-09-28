---
order: 400
title: C++20 协程：无栈协程与状态机变换
module: 'cpp'
category: 计算机科学
difficulty: advanced
description: "C++20 协程深水参考：三关键字与协程判定、Promise/Awaiter 三步协议、编译器状态机变换与协程帧布局、对称转移与 HALO，附 ASan/编译器真实报错与调试实录、生产级 Task/Generator 实现。"
author: fanquanpp
updated: '2026-09-27'
related:
  - 'cpp/090-RvalueReferenceMoveSemantics'
  - 'cpp/130-SmartPointerDeepDive'
  - 'cpp/390-TemplateMetaprogramming'
  - 'cpp/430-MultithreadingConcurrency'
  - 'cpp/730-Cpp23NewFeatures'
prerequisites:
  - 'cpp/090-RvalueReferenceMoveSemantics'
  - 'cpp/160-RAIIResourceManagement'
  - 'cpp/390-TemplateMetaprogramming'
---

> 定位说明：本篇为进阶参考书（参考层），面向已完成本模块主线的读者；入门请先走学习路径前序阶段。定位标准见 docs/standards/reference-layer.md（仓库）。

## 前置知识

- [右值引用与移动语义](/cpp/090-RvalueReferenceMoveSemantics)：`return_value(T)`、`await_resume()` 的移动语义与 `noexcept` 约束
- [RAII 资源管理](/cpp/160-RAIIResourceManagement)：协程帧的销毁权与 Task 析构函数是本篇所有生命周期问题的核心
- [智能指针](/cpp/130-SmartPointerDeepDive)：`coroutine_handle` 是非拥有句柄，所有权心智模型直接复用 unique_ptr
- [模板元编程](/cpp/390-TemplateMetaprogramming)：Task/Generator 是模板类型，`coroutine_traits` 特化依赖模板推导

## 学习目标

- 判定任意函数是否是协程，并说出触发协程变换的三个关键字与四条函数签名限制
- 手写满足最小接口集的 `promise_type`，并解释 `initial_suspend`/`final_suspend` 各自控制什么
- 用 `await_ready`/`await_suspend`/`await_resume` 三步协议实现自定义 Awaitable，区分 `await_suspend` 三种返回类型的语义
- 向别人讲清协程帧里有什么、编译器状态机如何按挂起点切分代码、HALO 何时能省掉堆分配
- 用对称转移把递归协程的栈开销从 O(n) 压到 O(1)
- 读懂 GCC/Clang 的协程编译报错与 ASan 的 use-after-free/泄漏报告，按实录套路修复悬挂协程、双重释放、Awaiter 生命周期三类典型 bug

## 问题引入：异步代码的两难

用回调写异步 I/O 的代码长这样：

```cpp
async_read(socket, [&](auto data) {
    parse(data, [&](auto msg) {
        query_db(msg, [&](auto rows) {
            async_write(socket, rows, [&](auto) { /* 又一层 */ });
        });
    });
});
```

控制流被打碎进嵌套回调：错误处理没有统一出口，局部变量要手动搬运到每个 lambda，提前 return 变成不可能。Promise/Future 稍好，但 `.then()` 链依然是"另一套语法"，且组合与取消都很别扭。**协程给出的解法是：用同步的写法获得异步的效率**——

```cpp
Task<std::string> handle() {
    auto data = co_await async_read(socket);
    auto msg  = co_await parse(data);
    auto rows = co_await query_db(msg);
    co_await async_write(socket, rows);
}
```

`co_await` 处函数"暂停"并让出线程，I/O 完成后从原位置"恢复"，局部变量原样还在。这条暂停-恢复链路不是魔法，而是编译器把函数重写成状态机：每个 `co_await` 是一个挂起点，局部变量被提升到堆上的协程帧里。C++20 的独特立场是**机制而非策略**：标准只提供三关键字、`promise_type` 接口与 `coroutine_handle`，不提供现成的 Task/Generator——调度策略、Executor、取消模型全部留给库作者。理解这套机制，是用好 cppcoro、Boost.Asio、folly::coro 乃至 C++26 std::execution 的前提。

## 核心概念

### 三个关键字与协程判定

按标准 [dcl.fct.def.coroutine]：**函数体内出现 `co_await`、`co_yield`、`co_return` 任一关键字，该函数就是协程**，编译器自动执行协程变换。判定与签名限制：

- 返回类型必须内嵌 `promise_type`（或特化 `std::coroutine_traits<R, Args...>::promise_type`）；
- 不能是 `constexpr`/`consteval`，不能用普通 `return`（必须 `co_return`）；
- 不能是变参函数（`va_start`）；
- `co_await` 不能出现在 catch 块的 handler 中（C++20 限制）。

无栈（stackless）是它的根本形态：协程不拥有独立栈，跨挂点存活的局部变量被提升到协程帧，恢复时按挂起点索引跳转，无需切换栈。

### promise_type：协程的策略对象

每个协程的行为由其返回类型的 `promise_type` 控制，最小接口集五件套：

```cpp
struct promise_type {
    Task get_return_object();                       // 创建返回给调用者的对象（协程体执行前调用）
    std::suspend_always initial_suspend() noexcept; // 惰性启动（suspend_never = 立即执行到首个挂点）
    std::suspend_always final_suspend() noexcept;   // 结束后挂起，等待 destroy（必须 noexcept）
    void return_value(int v);                       // 接收 co_return expr（与 return_void 二选一）
    void unhandled_exception();                     // 协程体逃逸的异常在此处理
    // 可选：std::suspend_always yield_value(int v);  支持 co_yield 时必需
};
```

三条最常被问到的设计约束：

- **`return_value` 与 `return_void` 只能二选一**：都写或返回类型不匹配都会在实例化时编译失败；
- **`final_suspend` 必须 `noexcept` 且推荐返回 `suspend_always`**：返回 `suspend_never` 时协程帧在结束瞬间自动销毁，此后 `done()`/`resume()`/`destroy()` 全是悬空访问；返回 `suspend_always` 则把销毁权交给外层 RAII 包装（"RAII 协程"准则）；
- **`initial_suspend` 选择惰性还是急切**：惰性（`suspend_always`）让 Task 构造与启动分离，是可组合类型的主流选择；急切启动（`suspend_never`）的 fire-and-forget 场景要小心生命周期（见实录 7）。

### Awaiter 三步协议：co_await 的编译器展开

`co_await expr` 的展开规则（[expr.await]）：先经 `operator co_await`（成员/自由函数）或直接取得 **awaiter**，然后：

```cpp
auto&& a = get_awaiter(expr);
if (!a.await_ready()) {                       // 1. 就绪检查：true 则跳过挂起
    // 2. 挂起：保存状态到协程帧后调用
    a.await_suspend(current_handle);          //    返回 void  ：挂起，控制权给恢复者
    //                                        //    返回 bool ：false 表示立即恢复
    //                                        //    返回 handle<>：对称转移到目标协程
    // ——挂起期间控制权在协程外——
}
auto result = a.await_resume();               // 3. 恢复后取结果，作为 co_await 的值
```

`std::suspend_always`/`std::suspend_never` 就是这个协议的两个平凡实现；`std::noop_coroutine()` 返回一个永远 done、恢复无副作用的句柄，常用作"什么都不转移"的对称转移目标。自定义等待逻辑（定时器、线程池切换、channel 接收）全部是围绕三步协议写状态机。

### co_yield 与 co_return 的派发

两个关键字都是语法糖：

- `co_yield e` 完全等价于 `co_await promise.yield_value(e)`——promise 把值存起来并返回一个（通常 `suspend_always` 的）awaiter，于是"产出值并挂起"；
- `co_return e` 等价于 `promise.return_value(e); goto final_suspend;`；函数体走到末尾等价于插入 `co_return;`；逃逸异常进入 `promise.unhandled_exception()`。

协程实例的生命周期终点只有一个：`final_suspend`。它之前的任何路径（return、异常）都会汇到这里——这就是把资源清理与帧销毁统一在一个挂点上的设计。

### 协程帧与状态机变换

编译器为每个协程实例生成一个协程帧，并配合一个 switch 恢复函数：

```cpp
// 编译器生成的结构（示意伪代码）
struct __coro_frame {
    void (*resume_fn)(__coro_frame*);   // 恢复入口：switch(suspend_index)
    void (*destroy_fn)(__coro_frame*);  // 销毁入口：析构成员 + 释放帧
    promise_type __promise;             // promise 对象
    int  __suspend_index;               // 当前挂起点
    int  __arg_n;                       // 按值参数的副本
    int  __local_x;                     // 跨挂点存活的局部变量提升至此
};
```

协程体被按挂起点切分为若干代码段，`resume_fn` 开头的 `switch (__suspend_index)` 负责跳回上次暂停的位置。这解释了三件事：为什么恢复是 O(1)；为什么局部变量跨挂点存活（它们在堆上的帧里，不在栈上）；为什么帧默认堆分配——生命周期跨越了函数调用的栈帧。

### 对称转移：O(1) 栈的递归协程

`await_suspend` 返回 `void`/`bool` 时，恢复链会叠在调用栈上；返回 `std::coroutine_handle<>` 时，编译器执行**对称转移**——当前协程挂起后以尾调用方式直接恢复目标协程，栈深度不变。链式 await 一万个协程，非对称实现是 O(n) 栈，对称转移是 O(1)。这是"协程版尾调用"，Lewis Baker 在 P0187 与 CppCon 2019 演讲中的核心论证，GCC 10+/Clang 12+/MSVC 19.28+ 均已实现：

```cpp
struct SymmetricTask {
    struct promise_type {
        /* ... 同 Task，略 ... */
        // 拦截对另一个 SymmetricTask 的 co_await，改为对称转移
        auto await_transform(SymmetricTask inner) {
            struct Awaiter {
                std::coroutine_handle<> next;
                bool await_ready() noexcept { return false; }
                std::coroutine_handle<> await_suspend(std::coroutine_handle<>) noexcept {
                    return next;          // 直接转移，不占栈
                }
                void await_resume() noexcept {}
            };
            return Awaiter{inner.handle};
        }
    };
    std::coroutine_handle<promise_type> handle;
};

SymmetricTask chain(int n) {
    if (n > 0) co_await chain(n - 1);   // 递归 10 万层也只用 O(1) 栈
    co_return;
}
```

### HALO：堆分配省略优化

协程帧默认堆分配，但编译器可执行 HALO（Heap Allocation eLision Optimization）：当协程生命周期严格嵌套于调用者（返回对象直接持有 handle、handle 不逃逸、promise 未自定义 `operator new`）时，把帧直接放进调用者栈帧，一次堆分配变成零。推论：写 HALO 友好的类型（Task 即是）让 `co_await task()` 的开销接近普通函数调用；而把 handle 存进全局容器、跨线程传递的写法会稳定阻断该优化。高频创建短协程的场景若仍受分配困扰，出路是给 promise 自定义 `operator new` 接内存池（见实录 4）。

### 标准库给了什么、还缺什么

C++20 标准库只有基础设施：`<coroutine>` 中的 `coroutine_handle`、`suspend_always`/`suspend_never`、`noop_coroutine`。没有 Task、没有 Generator、没有调度器。C++23 补上了 `std::generator`（P2502）；统一的异步框架 Senders/Receivers（P2300 std::execution）定档 C++26，其与协程通过 `await_transform`/`as_awaitable` 双向互操作。工程上当前主流仍是自研或第三方 Task/Generator（本篇示例 2、cppcoro、folly::coro、Boost.Asio 的 awaitable）。

## 完整代码示例

### 示例 1：自包含的最小 Generator

语言：C++20。支持 range-for 的惰性序列，编译命令 `g++ -std=c++20 gen.cpp`（GCC 10 需追加 `-fcoroutines`）。

```cpp
#include <coroutine>
#include <iostream>

template<typename T>
struct Generator {
    struct promise_type {
        T current{};
        Generator get_return_object() {
            return Generator{std::coroutine_handle<promise_type>::from_promise(*this)};
        }
        std::suspend_always initial_suspend() noexcept { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }
        std::suspend_always yield_value(T v) noexcept { current = v; return {}; }
        void return_void() noexcept {}
        void unhandled_exception() { std::terminate(); }
    };

    std::coroutine_handle<promise_type> h{};

    explicit Generator(std::coroutine_handle<promise_type> h) : h(h) {}
    Generator(Generator&& o) noexcept : h(std::exchange(o.h, {})) {}
    Generator(const Generator&) = delete;
    ~Generator() { if (h) h.destroy(); }          // RAII：帧的销毁权在这里

    struct iterator {
        std::coroutine_handle<promise_type> h;
        bool done = false;
        iterator& operator++() { h.resume(); done = h.done(); return *this; }
        const T& operator*() const { return h.promise().current; }
        bool operator!=(std::default_sentinel_t) const { return !done; }
    };
    iterator begin() {
        if (h) h.resume();
        return iterator{h, !h || h.done()};
    }
    std::default_sentinel_t end() { return {}; }
};

Generator<int> range(int start, int end) {
    for (int i = start; i < end; ++i) co_yield i;
}

int main() {
    for (int x : range(0, 5)) std::cout << x << ' ';
    std::cout << '\n';
}
```

输出：

```text
0 1 2 3 4
```

### 示例 2：支持值返回与异常传播的 Task

语言：C++20。教学级完整实现：RAII 管理帧、`std::optional` 存值、`exception_ptr` 跨挂点传播异常、`operator co_await` 支持协程间等待。为保持自包含，Awaiter 采用"立即推进内层协程"的简化策略（生产实现会把外层句柄交给内层的 final_suspend 恢复，避免嵌套时栈增长——见对称转移一节）。

```cpp
#include <coroutine>
#include <exception>
#include <iostream>
#include <optional>
#include <utility>

template<typename T>
class Task {
public:
    struct promise_type {
        std::optional<T> value_;
        std::exception_ptr exc_;

        Task get_return_object() {
            return Task{std::coroutine_handle<promise_type>::from_promise(*this)};
        }
        std::suspend_always initial_suspend() noexcept { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }
        void return_value(T v) { value_.emplace(std::move(v)); }
        void unhandled_exception() { exc_ = std::current_exception(); }
    };

    using handle_type = std::coroutine_handle<promise_type>;

    explicit Task(handle_type h) : h_(h) {}
    Task(Task&& o) noexcept : h_(std::exchange(o.h_, {})) {}
    Task(const Task&) = delete;
    Task& operator=(const Task&) = delete;
    ~Task() { if (h_) h_.destroy(); }             // final_suspend 挂起保证此刻销毁安全

    struct Awaiter {
        handle_type h;
        bool await_ready() const noexcept { return false; }
        void await_suspend(std::coroutine_handle<>) const { h.resume(); }
        T await_resume() {
            if (h.promise().exc_) std::rethrow_exception(h.promise().exc_);
            return std::move(*h.promise().value_);
        }
    };
    Awaiter operator co_await() && { return Awaiter{h_}; }

    void resume() { h_.resume(); }
    bool done() const { return h_.done(); }
    T get() {
        if (h_.promise().exc_) std::rethrow_exception(h_.promise().exc_);
        return std::move(*h_.promise().value_);
    }

private:
    handle_type h_;
};

Task<int> compute() { co_return 42; }

Task<int> chain() {
    int x = co_await compute();
    co_return x * 2;
}

int main() {
    auto t = chain();
    t.resume();
    while (!t.done()) t.resume();
    std::cout << t.get() << '\n';
}
```

输出：

```text
84
```

### 示例 3：C++23 std::generator——标准库版生成器

语言：C++23。手写 Generator 的时代开始结束；支持引用产出，零拷贝。

```cpp
#include <generator>
#include <iostream>
#include <string>
#include <vector>

std::generator<int> range23(int start, int end) {
    for (int i = start; i < end; ++i) co_yield i;
}

std::generator<const std::string&> names(const std::vector<std::string>& v) {
    for (const auto& n : v) co_yield n;
}

int main() {
    for (auto x : range23(0, 5)) std::cout << x << ' ';
    std::cout << '\n';
    for (const auto& n : names({"alice", "bob"})) std::cout << n << ' ';
    std::cout << '\n';
}
```

输出：

```text
0 1 2 3 4
alice bob
```

## 常见错误与调试实录

### 1. 没开 C++20：关键字根本不被识别

GCC 11 以下未指定标准时，`co_await` 被当作普通标识符，报错形如：

```text
error: 'co_await' was not declared in this scope
error: 'std::coroutine_handle' has not been declared
```

修复：`-std=c++20`（MSVC：`/std:c++20`）；GCC 10 额外需要 `-fcoroutines`；Clang 14 之前的版本走的是 Coroutines TS（`<experimental/coroutine>`），直接升级编译器。

### 2. promise 缺 yield_value：co_yield 编译失败

在示例 1 的 promise 里删掉 `yield_value` 后使用 `co_yield`：

```text
error: 'struct Generator::promise_type' has no member named 'yield_value'
```

根因是 `co_yield e` 展开为 `co_await promise.yield_value(e)`，成员缺失在实例化时暴露。同名错误也适用于漏写 `return_value`/`return_void`。

### 3. return_value 与 return_void 同时声明

```cpp
void return_value(int v) { value_ = v; }
void return_void() {}
```

GCC 报错原文：

```text
error: the coroutine promise type 'Task::promise_type' declares both 'return_value' and 'return_void' members
```

标准规定二者互斥：协程要么产生值（`co_return expr`），要么不产生值（`co_return;` 或自然结束）。两者都想要的场景用 `std::optional<T>` 装值 + 仅 `return_value` 表达。

### 4. final_suspend 返回 suspend_never：双重释放

```cpp
std::suspend_never final_suspend() noexcept { return {}; }   // 陷阱
```

协程结束时帧立即自动销毁，而外层 Task 的析构函数又调 `h.destroy()`：

```text
==12345==ERROR: AddressSanitizer: attempting double-free on 0x602000000010 in thread T0
```

或非 ASan 环境（glibc）：

```text
free(): double free detected in tcache 2
```

修复：`final_suspend` 返回 `suspend_always`，把销毁权交给 RAII 包装；同时它必须声明 `noexcept`（否则编译报 "'final_suspend' shall not throw" 一类错误，各编译器措辞不同）。

### 5. Task 析构未 destroy：协程帧泄漏

`initial_suspend` 惰性的 Task 如果析构函数是空的，帧永远堆在堆上：

```text
==12345==ERROR: LeakSanitizer: detected memory leaks

Direct leak of 64 byte(s) in 1 object(s) allocated from:
    #0 operator new
    #1 __builtin_coro_frame_alloc / compiler-generated coroutine frame
```

泄漏大小就是协程帧大小（promise + 参数副本 + 提升的局部变量）。修复见示例 2：析构中 `if (h_) h_.destroy();`，且移动构造用 `std::exchange` 转移句柄，防止双重销毁。

### 6. 恢复已销毁的协程：heap-use-after-free

后台线程持有 handle，宿主对象先析构：

```cpp
Task bad() {
    co_await Timer{100};   // 100ms 后线程 h.resume()
}
{ auto t = bad(); }        // t 立即析构销毁帧
std::this_thread::sleep_for(200ms);   // 线程随后 resume → 崩溃
```

```text
==12345==ERROR: AddressSanitizer: heap-use-after-free on address 0x60200000eff1 at pc 0x40117a
READ of size 8 at 0x60200000eff1 thread T1
    #0 std::coroutine_handle<>::resume()
```

预防手段是结构化生命周期：Task 的析构必须等协程到达 final_suspend（配合事件/stop_token 的 sync_wait），或约定 handle 只在明确的所有权范围内恢复。`done()`/`resume()`/`destroy()` 在帧销毁后全是 UB，没有任何运行时检查兜底。

### 7. Awaiter 在 await_suspend 里捕获 this

```cpp
struct BadTimer {
    int ms;
    bool await_ready() const noexcept { return false; }
    void await_suspend(std::coroutine_handle<> h) const {
        std::thread([this, h]() {          // 陷阱：lambda 持有 this
            std::this_thread::sleep_for(std::chrono::milliseconds(this->ms));
            h.resume();
        }).detach();
    }
    void await_resume() const noexcept {}
};
```

awaiter 通常是临时对象，`co_await` 表达式结束后即析构；后台线程再访问 `this->ms` 是悬空读。修复：按值捕获状态——`std::thread([h, ms = ms]() { ... })`。规则：**await_suspend 内提交给外部的回调只允许按值捕获**，this 与引用一律复制。

### 8. fire-and-forget 协程按引用收参

```cpp
FireAndForget log_it(const std::string& s) {   // 陷阱：引用参数
    co_await std::suspend_always{};
    std::cout << s << '\n';                    // 恢复时 s 已悬挂
}
```

挂起点之后还使用的参数必须按值传递——按值参数是协程帧的一部分（帧内存布局中的"参数副本"），按引用参数只是一根悬在帧外的指针。这条规则对 lambda 协程同样成立：引用捕获列表中的变量在恢复后同样可能已出栈。

### 9. co_await 出现在 catch 块

```cpp
try { risky(); }
catch (const std::exception&) {
    co_await notify();   // 编译错误
}
```

GCC 报错（Clang 措辞相近）：

```text
error: 'co_await' is not allowed in the handler of a try block
```

标准禁止在异常处理块内挂起（异常传播与协程帧的交互在此处未定义）。修复：catch 里只记录状态，把 `co_await` 放回 try 外：

```cpp
std::optional<std::exception_ptr> err;
try { risky(); }
catch (...) { err = std::current_exception(); }
if (err) co_await notify(*err);
```

## 实际场景

### 线程池集成与执行器切换

协程本身不调度；"切到哪个线程执行"由 awaiter 实现。典型原语是 `SwitchTo{pool}`：`await_suspend` 把"resume 当前协程"作为任务提交给线程池，协程即在线程池线程上恢复。工程规则：I/O 事件循环线程不做 CPU 密集计算（阻塞它等于阻塞全部协程），CPU 密集段显式 `co_await SwitchTo{cpu_pool}`。生产 Task（cppcoro/folly::coro）都内置了 Executor 概念，把"在哪恢复"写进类型。

### 异步 I/O 与现成库

Boost.Asio 从 1.70 起原生支持 `co_await`（`asio::awaitable<T>` + `co_spawn`），是生产环境用得最广的协程网络层；cppcoro（Lewis Baker）提供 Task/AsyncGenerator/when_all_ready 的参考实现，读源码学协程设计首选；folly::coro 是 Meta 生产级的协程工具集，Executor 与取消语义最完整。自己造 Task 适合学习与嵌入式等受限环境，业务项目优先库。

### 取消与结构化并发

协程没有内建取消，标准做法是 `std::stop_token`：Task 关联一个 `stop_source`，awaiter 在挂起/恢复点检查 `stop_requested()`，把取消表现为"协作式的提前 co_return"或抛 `operation_cancelled` 异常；内层 Task 等待时把外层的 token 传播进去，形成树状取消（结构化并发）。P2300 std::execution（C++26）把这套语义标准化为 stop_token 贯穿 sender 链。

### 状态机与惰性序列

协程把"多阶段流程中记住上一步"这类代码从手写 enum + switch 变成线性书写：游戏 NPC 行为树节点、协议解析器、测试步骤序列，都可以写成"每个 co_await 等待下一步事件"的协程，帧里的挂起点索引就是状态机的当前状态。生成器方向（示例 1/3）覆盖惰性序列、分页拉取、树遍历；C++23 起优先 `std::generator`。

## 与相关篇目关系

- [右值引用与移动语义](/cpp/090-RvalueReferenceMoveSemantics)：`return_value`/`await_resume` 的移动语义与 noexcept 边界。
- [智能指针](/cpp/130-SmartPointerDeepDive)：handle 的非拥有语义与 RAII 包装的所有权设计。
- [RAII 资源管理](/cpp/160-RAIIResourceManagement)：Task 析构与帧销毁权，实录 4/5 的理论基础。
- [模板元编程](/cpp/390-TemplateMetaprogramming)：`coroutine_traits` 特化与 Task/Generator 的模板设计。
- [C++23 新特性](/cpp/730-Cpp23NewFeatures)：`std::generator`、`std::expected` 与协程的组合。
- [多线程并发](/cpp/430-MultithreadingConcurrency)：线程池/Executor 集成的并发基础。

## 官方文档

- cppreference 协程页（语法、语义、库组件）: https://en.cppreference.com/w/cpp/language/coroutines
- C++ Core Guidelines CP.50-61（协程准则）: https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines
- P2502R2 std::generator: https://wg21.link/p2502
- P2300R7 std::execution（Senders/Receivers）: https://wg21.link/p2300
- N3762 Resumable Functions V2（语法前身提案）: https://wg21.link/n3762
- Lewis Baker：C++ Coroutines: Under the Hood（编译器变换与对称转移权威讲解）: https://lewissbaker.github.io/
- cppcoro 参考实现: https://github.com/lewissbaker/cppcoro

## 总结

C++20 协程是一台编译器级的状态机生成器：三关键字标记挂起点，promise_type 定制行为，awaiter 三步协议定义等待语义，协程帧承载跨挂点状态。它的学习曲线几乎全部来自两件事：生命周期（帧的销毁权在谁手里——final_suspend、RAII Task、handle 的每一次 resume 都要 answer 这个问题）与"机制而非策略"留下的空白（Task/Executor/取消都要自己选库或实现）。掌握本篇后应能：徒手写出 Generator 与 Task；用对称转移与 HALO 把性能做到接近普通调用；用 ASan 报告反推协程生命周期 bug；在 Boost.Asio/folly::coro/cppcoro 之间为项目选型。下一步自然是 C++23 std::generator 与 C++26 std::execution——机制已经学完，新特性只是把策略标准化。
