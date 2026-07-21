---
order: 74
title: C++与Rust对比
module: cpp
category: C++
difficulty: intermediate
description: 语言特性与设计哲学对比
author: fanquanpp
updated: '2026-06-14'
related:
  - cpp/C++23与C++26新特性
  - cpp/C++与Python交互
  - cpp/C++序列化
  - cpp/C++网络编程
prerequisites:
  - cpp/概述与环境配置
---

## 概述

C++ 和 Rust 都是系统级编程语言，都能直接操作内存和硬件，都不需要垃圾回收器。但两者的设计哲学截然不同：C++ 追求零开销抽象和向后兼容，信任程序员的能力；Rust 通过所有权系统和借用检查器在编译期保证内存安全，不信任程序员手动管理内存。理解两者的异同，有助于在不同场景下做出合适的技术选择。

为什么需要了解两者的对比？如果你正在为项目选择技术栈，或者想从 C++ 转向 Rust（或反之），了解它们在内存管理、并发模型、生态系统等方面的差异，能帮助你做出明智的决策。两者不是替代关系，而是各有擅长的互补关系。

## 基础概念

**所有权系统**：Rust 的核心特性。每个值有且只有一个所有者，当所有者离开作用域时值被自动释放。编译器通过借用检查器确保引用的有效性。

**借用检查器**：Rust 编译器的一部分，在编译期检查所有引用是否安全。它确保不会同时存在可变引用和不可变引用，也不会有悬垂引用。

**生命周期**：Rust 中每个引用都有一个生命周期，描述引用有效的范围。编译器通过生命周期标注来验证引用的安全性。

**零开销抽象**：C++ 和 Rust 共同的设计原则。使用高级抽象不会带来运行时开销，你不需要为没有使用的功能付费。

**RAII**：资源获取即初始化。C++ 和 Rust 都使用 RAII 模式管理资源，构造时获取资源，析构时释放资源。

## 快速上手

### 变量与可变性

```cpp
// C++：变量默认可变，用 const 标记不可变
int x = 10;        // 可变
x = 20;            // 允许
const int y = 30;  // 不可变
// y = 40;         // 编译错误
```

```rust
// Rust：变量默认不可变，用 mut 标记可变
let x = 10;        // 不可变
// x = 20;         // 编译错误
let mut y = 30;    // 可变
y = 40;            // 允许
```

### 内存管理

```cpp
// C++：手动管理或使用智能指针
void cppMemoryDemo() {
    // 栈上分配，自动释放
    int value = 42;

    // 堆上分配，手动释放（危险）
    int* raw = new int(42);
    delete raw;  // 忘记 delete 会导致内存泄漏

    // 智能指针（推荐）
    auto unique = std::make_unique<int>(42);    // 独占所有权
    auto shared = std::make_shared<int>(42);    // 共享所有权（引用计数）

    // unique_ptr 离开作用域时自动释放
    // shared_ptr 当引用计数为零时自动释放
}
```

```rust
// Rust：所有权系统自动管理
fn rust_memory_demo() {
    // 栈上分配
    let value = 42;

    // 堆上分配，所有权自动管理
    let mut unique = Box::new(42);       // 独占所有权（类似 unique_ptr）
    let shared1 = Rc::new(42);           // 共享所有权（类似 shared_ptr）
    let shared2 = Rc::clone(&shared1);   // 引用计数增加

    // Box 离开作用域时自动释放
    // Rc 当引用计数为零时自动释放
}
```

### 函数与错误处理

```cpp
// C++：使用异常或返回值
// 方式一：异常
int divide_exception(int a, int b) {
    if (b == 0) throw std::runtime_error("除数不能为零");
    return a / b;
}

// 方式二：返回值（C++17 的 std::optional）
std::optional<int> divide_optional(int a, int b) {
    if (b == 0) return std::nullopt;
    return a / b;
}
```

```rust
// Rust：使用 Result 类型（必须处理错误）
fn divide(a: i32, b: i32) -> Result<i32, String> {
    if b == 0 {
        return Err("除数不能为零".to_string());
    }
    Ok(a / b)
}

// 调用时必须处理错误
fn main() {
    match divide(10, 2) {
        Ok(result) => println!("结果: {}", result),
        Err(e) => println!("错误: {}", e),
    }

    // 或者用 ? 操作符传播错误
    let result = divide(10, 2)?;  // 如果出错，提前返回
}
```

## 详细用法

### 字符串处理

```cpp
// C++：std::string 和 std::string_view
#include <string>
#include <string_view>

void cppStringDemo() {
    // 可变字符串
    std::string name = "张三";
    name += "你好";                    // 拼接
    std::cout << name.size() << std::endl;  // 长度（字节数，不是字符数）

    // 字符串视图（不拥有数据，零拷贝）
    std::string_view view = name;
    std::string_view sub = view.substr(0, 6);  // 子串

    // 格式化（C++20）
    std::string msg = std::format("你好, {}!", name);
}
```

```rust
// Rust：String 和 &str
fn rust_string_demo() {
    // 可变字符串（堆分配）
    let mut name = String::from("张三");
    name.push_str("你好");             // 拼接
    println!("{}", name.len());        // 长度（字节数，UTF-8）

    // 字符串切片（不拥有数据，零拷贝）
    let view: &str = &name;
    let sub: &str = &view[0..6];       // 子串（按字节索引，需注意 UTF-8 边界）

    // 格式化
    let msg = format!("你好, {}!", name);
}
```

### 并发编程

```cpp
// C++：使用 std::thread 和互斥量
#include <thread>
#include <mutex>
#include <vector>

void cppConcurrencyDemo() {
    std::mutex mtx;
    int counter = 0;

    // 创建多个线程
    std::vector<std::thread> threads;
    for (int i = 0; i < 10; i++) {
        threads.emplace_back([&]() {
            std::lock_guard<std::mutex> lock(mtx);  // 自动加锁解锁
            counter++;
        });
    }

    // 等待所有线程完成
    for (auto& t : threads) {
        t.join();
    }
    // counter == 10

    // 数据竞争是未定义行为，编译器不会检查
    // 以下代码有数据竞争但能编译通过
    // int unsafe_counter = 0;
    // std::thread t1([&]() { unsafe_counter++; });  // 危险！
    // std::thread t2([&]() { unsafe_counter++; });  // 危险！
}
```

```rust
// Rust：使用 std::thread，编译器保证线程安全
use std::sync::{Arc, Mutex};
use std::thread;

fn rust_concurrency_demo() {
    // Arc（原子引用计数）+ Mutex（互斥量）
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }
    // *counter.lock().unwrap() == 10

    // 以下代码编译不通过！Rust 阻止了数据竞争
    // let mut unsafe_counter = 0;
    // let t1 = thread::spawn(|| { unsafe_counter += 1; });  // 编译错误！
    // let t2 = thread::spawn(|| { unsafe_counter += 1; });  // 编译错误！
}
```

### 泛型与 trait

```cpp
// C++：模板和概念
#include <concepts>
#include <vector>
#include <algorithm>

// C++20 概念约束
template<typename T>
requires std::integral<T>
T sum(const std::vector<T>& values) {
    T result = 0;
    for (const auto& v : values) {
        result += v;
    }
    return result;
}

// 编译期错误信息可能很长
```

```rust
// Rust：泛型和 trait
fn sum<T: std::ops::Add<Output = T> + Default + Copy>(values: &[T]) -> T {
    let mut result = T::default();
    for v in values {
        result = result + *v;
    }
    result
}

// trait 比 C++ 概念更成熟，错误信息更友好
// 编译错误会明确指出哪个 trait 没有实现
```

### 枚举与模式匹配

```cpp
// C++：枚举和 variant
#include <variant>
#include <string>

// 传统枚举
enum class Color { Red, Green, Blue };

// C++17 的 variant（类似 Rust 的枚举）
using Value = std::variant<int, double, std::string>;

void processValue(const Value& v) {
    std::visit([](auto&& arg) {
        using T = std::decay_t<decltype(arg)>;
        if constexpr (std::is_same_v<T, int>) {
            std::cout << "整数: " << arg << std::endl;
        } else if constexpr (std::is_same_v<T, double>) {
            std::cout << "浮点: " << arg << std::endl;
        } else if constexpr (std::is_same_v<T, std::string>) {
            std::cout << "字符串: " << arg << std::endl;
        }
    }, v);
}
```

```rust
// Rust：枚举和模式匹配（更优雅）
enum Color {
    Red,
    Green,
    Blue,
}

// 枚举可以携带数据
enum Value {
    Integer(i32),
    Float(f64),
    Text(String),
}

fn process_value(v: &Value) {
    match v {
        Value::Integer(n) => println!("整数: {}", n),
        Value::Float(f) => println!("浮点: {}", f),
        Value::Text(s) => println!("字符串: {}", s),
    }
    // match 必须穷举所有变体，否则编译错误
}
```

## 常见场景

### 构建系统对比

```cmake
# C++：CMake
cmake_minimum_required(VERSION 3.20)
project(MyApp)

find_package(fmt REQUIRED)
add_executable(myapp main.cpp)
target_link_libraries(myapp fmt::fmt)
```

```toml
# Rust：Cargo
[package]
name = "myapp"
version = "0.1.0"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
```

### 项目结构对比

```
# C++ 项目
MyProject/
├── CMakeLists.txt
├── include/
│   └── myproject/
│       └── utils.h
├── src/
│   ├── main.cpp
│   └── utils.cpp
└── tests/
    └── test_utils.cpp

# Rust 项目
myproject/
├── Cargo.toml
├── src/
│   ├── main.rs
│   └── utils.rs
└── tests/
    └── test_utils.rs
```

## 注意事项

**学习曲线**：Rust 的学习曲线比 C++ 更陡峭，特别是所有权和生命周期概念。但一旦掌握，编译器能帮你避免大量运行时错误。

**生态系统**：C++ 的生态更成熟，有大量历史积累的库。Rust 的 Cargo 生态更现代，包管理和构建体验更好。

**编译速度**：C++ 的编译速度通常比 Rust 快（特别是增量编译）。Rust 的借用检查器增加了编译时间。

**互操作**：C++ 和 Rust 可以通过 FFI（外部函数接口）互相调用。Rust 提供了 C ABI 兼容的接口，可以从 C++ 中调用 Rust 代码。

**适用场景**：C++ 适合已有大型代码库、游戏开发、嵌入式系统；Rust 适合新项目、系统工具、WebAssembly、安全敏感场景。

## 进阶用法

### C++ 调用 Rust

```rust
// Rust 侧：导出 C 兼容函数
#[no_mangle]
pub extern "C" fn rust_add(a: i32, b: i32) -> i32 {
    a + b
}

// 编译为静态库
// cargo build --release
// 生成 libmyrustlib.a（Linux）或 myrustlib.lib（Windows）
```

```cpp
// C++ 侧：声明并调用 Rust 函数
extern "C" {
    int rust_add(int a, int b);
}

int main() {
    int result = rust_add(3, 5);
    std::cout << "结果: " << result << std::endl;  // 8
    return 0;
}
```

### Rust 调用 C++

```rust
// Rust 侧：使用 bindgen 自动生成绑定
// build.rs
fn main() {
    cc::Build::new()
        .cpp(true)
        .file("src/cpp_code.cpp")
        .compile("cpp_code");

    // 生成 C++ 头文件的 Rust 绑定
    let bindings = bindgen::Builder::default()
        .header("src/cpp_code.h")
        .clang_arg("-xc++")
        .generate()
        .expect("无法生成绑定");

    bindings
        .write_to_file(std::path::PathBuf::from("src/bindings.rs"))
        .expect("无法写入绑定");
}
```
