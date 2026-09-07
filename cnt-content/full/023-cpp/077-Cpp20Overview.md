---
order: 770
title: C++20 新特性汇总
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: C++20 新特性汇总 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## 四大核心特性

**基本写法：Concepts 概念**
`template <<概念> T>`
```cpp
#include <concepts>
// 约束模板参数
template<std::integral T>
T add(T a, T b) { return a + b; }

// 自定义概念
template<typename T>
concept Addable = requires(T a, T b) {
    { a + b } -> std::convertible_to<T>;
};
template<Addable T> T sum(T a, T b) { return a + b; }
```

---

**基本写法：Ranges 范围**
`std::views::<适配器>`
```cpp
#include <ranges>
#include <vector>
std::vector<int> v = {1, 2, 3, 4, 5};
// 链式管道
auto result = v
    | std::views::filter([](int x){ return x % 2 == 0; })
    | std::views::transform([](int x){ return x * 10; });
// result = {20, 40}
```

---

**基本写法：Modules 模块**
`export module <名>;`
```cpp
// 模块定义（.cppm 文件）
export module mathlib;
export int add(int a, int b) { return a + b; }
// 使用
import mathlib;
int main() { return add(1, 2); }
```

---

**基本写法：Coroutines 协程**
`co_await / co_yield / co_return`
```cpp
#include <coroutine>
// 生成器
struct Generator {
    struct promise_type {
        int value;
        Generator get_return_object() {
            return {std::coroutine_handle<promise_type>::from_promise(*this)};
        }
        std::suspend_always initial_suspend() { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }
        std::suspend_always yield_value(int v) { value = v; return {}; }
        void return_void() {}
    };
    std::coroutine_handle<promise_type> h;
};
Generator counter() {
    for (int i = 0; i < 3; ++i) co_yield i;
}
```

---

## 语言特性

**基本写法：三向比较**
`operator<=>`
```cpp
// 一行定义所有比较运算符
struct Point {
    int x, y;
    auto operator<=>(const Point&) const = default;
    // 自动生成 <, <=, ==, !=, >=, >
};
```

---

**基本写法：指定初始化**
`{.<成员> = <值>}`
```cpp
// C 风格指定成员初始化
struct Config {
    int width = 800;
    int height = 600;
    bool fullscreen = false;
};
Config c{.width = 1920, .fullscreen = true};
```

---

**基本写法：consteval**
`consteval <返回> <函数>()`
```cpp
// 必须编译期执行
consteval int square(int x) { return x * x; }
constexpr int a = square(5); // 25，编译期
// int b = square(5); // 错误：必须编译期
```

---

**基本写法：constinit**
`constinit <类型> <变量> = <常量表达式>;`
```cpp
// 编译期初始化，但可运行时修改
constinit int g_count = 100;
int main() { g_count = 200; } // 允许修改
```

---

**基本写法：char8_t**
`char8_t` 类型
```cpp
// UTF-8 字符类型
char8_t c = u8'A';
std::u8string s = u8"hello";
```

---

## 库特性

**基本写法：std::format**
`std::format("<格式串>", <参数>...)`
```cpp
#include <format>
std::string s = std::format("x={}, y={:.2f}", 42, 3.14159);
// "x=42, y=3.14"
// 占位符 {}
// 格式说明 :.2f :>10 :x 等
```

---

**基本写法：std::span**
`std::span<<类型>>`
```cpp
#include <span>
// 非拥有视图
void process(std::span<int> data) {
    for (auto& x : data) x *= 2;
}
int arr[] = {1, 2, 3, 4};
process(arr);
std::vector<int> v = {5, 6, 7};
process(v);
```

---

**基本写法：std::jthread**
`std::jthread`
```cpp
#include <thread>
// 自动 join 的线程
std::jthread t([]{ /* work */ });
// 离开作用域自动 join，无需显式调用
// 支持停止令牌
std::jthread worker([](std::stop_token st){
    while (!st.stop_requested()) {
        // 工作循环
    }
});
worker.request_stop(); // 请求停止
```

---

**基本写法：std::source_location**
`std::source_location::current()`
```cpp
#include <source_location>
// 获取源码位置
void log(const std::string& msg,
         const std::source_location& loc = std::source_location::current()) {
    std::cout << loc.file_name() << ":" << loc.line() << " " << msg;
}
log("hello"); // 自动捕获调用位置
```

---

**基本写法：std::bit_cast**
`std::bit_cast<<目标>>(<源>)`
```cpp
#include <bit>
// 类型双关（位级重新解释）
float f = 1.0f;
uint32_t bits = std::bit_cast<uint32_t>(f);
// 要求：源和目标大小相同、可平凡拷贝
```

---

## 容器与算法

**基本写法：contains**
`<容器>.contains(<键>)`
```cpp
// C++20 容器包含检查
std::map<int, std::string> m = {{1, "a"}, {2, "b"}};
if (m.contains(2)) { /* 找到 */ }
std::set<int> s = {1, 2, 3};
if (s.contains(3)) { /* 找到 */ }
```

---

**基本写法：ranges 算法**
`std::ranges::<算法>(<范围>, ...)`
```cpp
#include <algorithm>
#include <ranges>
std::vector<int> v = {3, 1, 4, 1, 5};
std::ranges::sort(v);
bool has = std::ranges::contains(v, 4); // C++23
auto it = std::ranges::find(v, 4);
```

---

**基本写法：views 工厂**
`std::views::iota / repeat`
```cpp
#include <ranges>
// 无限序列
for (int i : std::views::iota(1) | std::views::take(5)) {
    std::cout << i; // 12345
}
// 重复
for (auto x : std::views::repeat(42) | std::views::take(3)) {
    std::cout << x; // 424242
}
```
