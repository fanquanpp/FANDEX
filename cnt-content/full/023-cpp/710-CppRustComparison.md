---
order: 690
title: "C++ 与 Rust 对比：同一件事的两种写法"
module: 'cpp'
category: 计算机科学
difficulty: intermediate
description: "以给一个计数服务选语言的真实决策为线索，把 C++ 与 Rust 在可变性默认值、内存管理、错误处理、字符串、并发、泛型、枚举匹配上逐项对照，附 FFI 互通实测与 2026 年的选型建议。"
author: fanquanpp
updated: '2026-10-05'
related:
  - 'cpp/740-Cpp23Cpp26NewFeatures'
  - 'cpp/130-SmartPointerDeepDive'
  - 'cpp/430-MultithreadingConcurrency'
prerequisites:
  - 'cpp/130-SmartPointerDeepDive'
---

## 前置知识

- [智能指针](/cpp/130-SmartPointerDeepDive)：`unique_ptr`/`shared_ptr` 的所有权语义——它是本文大量对照的原点；
- [多线程并发](/cpp/430-MultithreadingConcurrency)：知道数据竞争是什么即可；
- 不需要会写 Rust：本文所有 Rust 代码都逐行解释，读完你能看懂大部分对照示例。

## 学习目标

读完本文你将能够：

1. 说清两门语言对「谁负责释放内存」这一根本问题的不同回答；
2. 对照着读懂双方的核心代码：可变性、错误处理、并发、模式匹配；
3. 用 FFI 让 C++ 调 Rust、Rust 调 C++，知道这条路适合什么、不适合什么；
4. 面对「新项目选哪门」的问题，给出一个有依据的、分场景的答案，而不是站队式的口号。

预计 60 分钟。

## 1. 问题引入：同一个计数服务，两种实现路线

设想一个真实决策：团队要写一个高频计数的网络服务（比如统计每个频道的实时在线人数），长期运行、不容崩溃，候选方案 C++ 与 Rust 各一。选型的人要回答的不是「哪个语言更先进」，而是一连串具体问题：

- 忘了释放内存的代码，是运行时才暴露，还是根本编译不过？
- 一个变量默认能不能改？团队里谁能保证它没被并发改坏？
- 函数失败了怎么表达？调用方能不能「忘了处理」？
- 现有的 C++ 代码（比如一个用了十年的解析库）能不能复用？

两门语言的全部差异，几乎都源自对第一个问题的不同回答。C++ 的答案是**信任程序员**：给你 `new`/`delete` 和智能指针，规范告诉你该怎么做，但编译器不强制；Rust 的答案是**编译器当审查员**：所有权与借用规则写进语言，不合规则的代码直接拒绝编译。本文把两门语言逐项摆在一起对照——它们不是替代关系，而是对「安全由谁担保」的两种投资策略。

顺带说明本文代码的语境：C++ 侧以 C++20/23 为准（`std::format`、concepts 已可用），Rust 侧为 2024 edition（2025 年 2 月随 1.85 稳定，当前所有主流项目的默认选择）。

## 2. 变量与可变性：默认方向的相反选择

```cpp
// C++：默认可变，const 是「额外承诺」
int x = 10;         // 可变
x = 20;             // 允许
const int y = 30;   // 不可变
// y = 40;         // 编译错误
```

```rust
// Rust：默认不可变，mut 是「额外授权」
let x = 10;         // 不可变
// x = 20;         // 编译错误：cannot assign twice to immutable variable
let mut y = 30;     // 可变
y = 40;             // 允许
```

方向完全相反：C++ 假设你**要**改，不改才声明；Rust 假设你**不**改，要改才声明。这不只是审美差异——代码评审时，一个没有 `mut` 的 Rust 变量等于自带「本函数不会动它」的合同，而 C++ 里判断一个 `int&` 会不会被改，要顺着整个调用链读下去。

## 3. 内存管理： manual、智能指针与编译器审查

```cpp
// C++：三种流派并存，写哪种取决于纪律
void cpp_memory() {
    int stack_val = 42;                        // 栈：自动释放

    int* raw = new int(42);                    // 裸 new：合法但危险
    delete raw;                                // 忘了这行 = 泄漏；删两次 = 崩溃

    auto unique = std::make_unique<int>(42);   // 独占所有权（推荐）
    auto shared = std::make_shared<int>(42);   // 共享所有权 + 引用计数
}   // 智能指针离开作用域自动释放
```

```rust
// Rust：只有一种答案，且是默认行为
fn rust_memory() {
    let stack_val = 42;               // 栈：作用域结束自动释放

    let owned = Box::new(42);         // 堆分配，独占所有权（对应 unique_ptr）
    let r1 = std::rc::Rc::new(42);    // 共享所有权（对应 shared_ptr，非线程安全）
    let r2 = std::rc::Rc::clone(&r1); // 引用计数 +1

    // 不存在裸 new/delete，也没有「忘了释放」这个错误类别
}
```

对照表：

| 概念 | C++ | Rust |
| --- | --- | --- |
| 独占堆所有权 | `std::unique_ptr<T>` | `Box<T>` |
| 共享所有权（引用计数） | `std::shared_ptr<T>` | `Rc<T>`（单线程）/ `Arc<T>`（多线程） |
| 弱引用（打破循环） | `std::weak_ptr<T>` | `Weak<T>` |
| 忘记释放 | 可能（裸 new 时） | 不可能，编译器保证 drop 恰好一次 |
| 释放两次 | 可能 | 不可能，move 后旧变量失效 |

关键的体验差异在**默认路径**：C++ 的智能指针是「最佳实践」，你可以不遵守，编译器照样放行 `new`/`delete`；Rust 的所有权是「唯一路径」，安全不是美德而是语法。代价是学习期：C++ 第一天就能写能跑的程序，Rust 第一周会被借用检查器反复打回。这笔账怎么算，见第 9 节。

## 4. 错误处理：异常、optional 与 Result

```cpp
// C++：两条路并存，团队规范决定用哪条
int divide_throw(int a, int b) {
    if (b == 0) throw std::runtime_error("divide by zero");  // 路 A：异常
    return a / b;
}

std::optional<int> divide_opt(int a, int b) {
    if (b == 0) return std::nullopt;                          // 路 B：值编码失败
    return a / b;
}
```

```rust
// Rust：只有一条路，且函数签名即文档
fn divide(a: i32, b: i32) -> Result<i32, String> {
    if b == 0 {
        return Err(String::from("divide by zero"));
    }
    Ok(a / b)
}

fn main() -> Result<(), String> {
    let r = divide(10, 2)?;   // ? 运算符：出错就向上传播，成功则解包
    println!("{r}");
    Ok(())
}
```

三点值得注意的差异：

1. **可见性**。Rust 的 `Result` 出现在签名里，调用方想假装没看见都难（不处理会有 unused_must_use 警告）；C++ 的异常在签名里完全不可见——不读文档就不知道 `divide_throw` 会抛什么。
2. **错误信息的有无**。`std::optional` 只能表达「失败了」，带不出原因；`Result<T, E>` 的 `E` 就是原因。Rust 生态里 `anyhow`/`thiserror` 把错误链做得相当顺手。
3. **开销模型**。C++ 异常的常规路径零开销、抛出路径昂贵（且嵌入式与游戏领域常整体禁用异常）；`Result`/`optional` 的失败路径与返回值同级。所以性能敏感的 C++ 代码库（包括引擎）反而越来越倾向「值编码错误」——在这一点上，Rust 的语言设计与现代 C++ 的最佳实践正在合流。

## 5. 字符串：都有两套表示，坑位不同

```cpp
// C++：std::string（拥有）+ std::string_view（借用）
std::string name = "zhang";
name += " san";
std::cout << name.size();            // 字节数（UTF-8 中文一个字 3 字节）

std::string_view view = name;        // 不拥有数据，零拷贝
std::string msg = std::format("hi, {}!", name);   // C++20 格式化
```

```rust
// Rust：String（拥有）+ &str（借用切片）
let mut name = String::from("zhang");
name.push_str(" san");
println!("{}", name.len());          // 同样是字节数

let view: &str = &name;              // 不拥有数据，零拷贝
let msg = format!("hi, {name}!");    // 内插格式化
```

几乎一一对应，连「`.size()`/`.len()` 返回字节数而非字符数」这个经典坑都一样。真正的差异在体系外：C++ 要同时面对 `std::string`、`const char*`、`QString` 等多种字符串并处理互转；Rust 生态里 `String`/`&str` 二分法高度统一，函数参数一律收 `&str`。另外 Rust 拒绝按字节索引直接取「第 i 个字符」（`s[0]` 编译不过）——因为 UTF-8 变长，这种写法天然有 bug 嫌疑，强迫你走 `chars()` 迭代或字节切片。

## 6. 并发：数据竞争，一个是未定义行为，一个是编译错误

这是两门语言差异最大、也最能体现设计哲学的一节。

```cpp
// C++：能保护，但不强制
std::mutex mtx;
int counter = 0;

std::vector<std::thread> threads;
for (int i = 0; i < 10; i++) {
    threads.emplace_back([&]() {
        std::lock_guard<std::mutex> lock(mtx);
        counter++;
    });
}
for (auto& t : threads) t.join();

// 下面的代码同样编译通过——但它是数据竞争，未定义行为：
// int unsafe_counter = 0;
// std::thread t1([&]{ unsafe_counter++; });
// std::thread t2([&]{ unsafe_counter++; });
```

```rust
// Rust：编译器替你锁门
use std::sync::{Arc, Mutex};
use std::thread;

let counter = Arc::new(Mutex::new(0));
let mut handles = vec![];
for _ in 0..10 {
    let counter = Arc::clone(&counter);
    handles.push(thread::spawn(move || {
        let mut num = counter.lock().unwrap();
        *num += 1;
    }));
}
for h in handles { h.join().unwrap(); }

// 下面的代码编译不过：
// let mut unsafe_counter = 0;
// thread::spawn(|| { unsafe_counter += 1; });
// 错误：closure may outlive... `i32` cannot be shared between threads safely
```

C++ 侧：`lock_guard` 是好实践，但忘记加锁的代码照样编译、照样偶发崩溃——数据竞争在 C++ 里是未定义行为，靠 race detector 与 code review 事后追捕。Rust 侧：跨线程共享必须经过 `Send`/`Sync` 两个标记 trait 的检查，绕不开「`Arc` 共享所有权 + `Mutex` 加锁」的组合；裸共享变量跨线程直接编译失败。**「能编译的多线程代码就没有数据竞争」**是 Rust 最硬的卖点。

代价也真实存在：Rust 里写「我知道这没竞争」要显式 `unsafe` 并自己担保；C++ 里没有这道门，好与坏代码长得一样。

## 7. 泛型与枚举：抽象能力的正面对照

### 7.1 泛型：concepts 对 trait

```cpp
// C++20：concepts 约束模板参数
#include <concepts>

template <typename T>
requires std::integral<T>
T sum(const std::vector<T>& v) {
    T total = 0;
    for (const auto& x : v) total += x;
    return total;
}
```

```rust
// Rust：trait 约束泛型
fn sum<T: std::ops::Add<Output = T> + Default + Copy>(values: &[T]) -> T {
    let mut total = T::default();
    for v in values { total = total + *v; }
    total
}
```

机制不同：C++ 模板在实例化时才检查（concepts 把报错提前且变短了，但约束仍是「准入条件」）；Rust 泛型在定义处就按 trait 检查函数体，且默认通过单态化生成专用代码——两者都零运行时开销。工程体感上，Rust 的 trait 报错信息更精准（直接指出缺哪个 trait 的哪个方法），C++20 concepts 已比裸模板时代好很多，但深层模板错误仍可能一屏放不下。

### 7.2 枚举与模式匹配：Rust 的主场

```cpp
// C++17：std::variant + std::visit 模拟「带数据的枚举」
using Value = std::variant<int, double, std::string>;

void process(const Value& v) {
    std::visit([](auto&& arg) {
        using T = std::decay_t<decltype(arg)>;
        if constexpr (std::is_same_v<T, int>)        std::cout << "int: " << arg;
        else if constexpr (std::is_same_v<T, double>) std::cout << "double: " << arg;
        else                                          std::cout << "string: " << arg;
    }, v);
}
```

```rust
// Rust：枚举天生携带数据，match 强制穷举
enum Value {
    Integer(i32),
    Float(f64),
    Text(String),
}

fn process(v: &Value) {
    match v {
        Value::Integer(n) => println!("int: {n}"),
        Value::Float(f)   => println!("double: {f}"),
        Value::Text(s)    => println!("string: {s}"),
        // 漏写任何一个变体，编译错误
    }
}
```

表达同一件事，Rust 是语言原生的（枚举变体携带数据 + match 穷举检查），C++ 需要.variant、visit、if constexpr 三件套拼装——能写，但样板明显更重。这正是很多 C++ 工程师试用 Rust 后最常提到的「回不去」的点。错误建模上差异更明显：Rust 用 `Result<T, E>`（本身就是个枚举）表达成败，而 C++ 的对应物 `std::expected`（C++23 才进入标准）社区采纳仍在推进中。

## 8. FFI：两门语言如何互相调用

真实世界很少「二选一」：给存量 C++ 项目逐步引入 Rust，或让 Rust 项目复用成熟 C++ 库，都走 FFI（外部函数接口），中介语言是 C ABI。

### 8.1 C++ 调 Rust：导出 C 兼容接口

```rust
// Rust 侧：src/lib.rs
#[no_mangle]                      // 不做名字修饰，保持 C 可见
pub extern "C" fn rust_add(a: i32, b: i32) -> i32 {
    a + b
}
```

```toml
# Cargo.toml：产出静态库
[lib]
crate-type = ["cdylib", "staticlib"]
```

```cpp
// C++ 侧：声明并链接
extern "C" {
    int rust_add(int a, int b);
}

int main() {
    std::cout << rust_add(3, 5);   // 8
}
```

流程：`cargo build --release` 得到 `libxxx.a`（Windows 上是 `.lib`），C++ 链接它即可。注意边界纪律：跨过 C ABI 只能传 POD 类型与裸指针，Rust 侧的复杂类型要在边界处转换；边界内的 Rust 代码依旧享受全部安全检查——**用 Rust 重写热点模块、以 FFI 挂回 C++ 工程**，是业界最成熟的渐进路线（Firefox、Windows 内核组件都这么干）。

### 8.2 Rust 调 C++：bindgen 生成绑定

```rust
// build.rs：编译 C++ 源并生成绑定
fn main() {
    let bindings = bindgen::Builder::default()
        .header("src/cpp_api.h")
        .clang_arg("-xc++")
        .generate()
        .expect("generate bindings");

    bindings
        .write_to_file(std::path::PathBuf::from("src/bindings.rs"))
        .expect("write bindings");
}
```

方向反过来要小心：C++ 的类、异常、模板都无法直接穿过 C ABI，通常要为 C++ 库写一层 `extern "C"` 包装函数。所以互通成本并不对称——**C++ 调 Rust 顺，Rust 调 C++ 需要包装层**。

## 9. 选型建议：2026 年的务实答案

把常见说法过一遍筛子，剩下的才是可用结论：

| 维度 | C++ | Rust |
| --- | --- | --- |
| 学习曲线 | 起步快，精通极难（历史包袱深） | 前期陡（所有权），中期平缓 |
| 生态与既有代码 | 极其深厚，几乎所有领域都有成熟库 | 服务端/CLI/基础设施成熟，GUI 与游戏仍在追赶 |
| 编译速度 | 慢（增量编译可用） | 同量级慢，借用检查略增开销 |
| 工具链 | CMake/vcpkg 拼装，跨项目不一致 | Cargo 一体，体验统一 |
| 内存/并发安全 | 靠纪律与工具（sanitizer、review） | 编译期强制 |
| 招聘与团队 | 人才池大 | 人才池小但供给在增长 |

几条可执行的判断：

1. **存量 C++ 工程**（游戏引擎、历史业务系统）：继续用 C++，用现代标准（见 [C++23/26 新特性](/cpp/740-Cpp23Cpp26NewFeatures)）与静态工具降险；确有内存安全痛点的独立模块（解析器、网络协议栈）值得用 Rust 重写后 FFI 挂回。
2. **全新基础设施**（代理、数据库、CLI 工具、WASM 模块）：默认 Rust——安全由编译器担保、工具链统一、单二进制部署，长期维护成本可预期。
3. **团队现状优先**：一支资深 C++ 团队做时间紧的项目，换语言的培训成本可能吃掉安全收益；反之年轻团队从零起步，Rust 的「编译器即评审」反而降低了指导成本。
4. **别用语言论战代替工程判断**：两门语言的性能同一梯队，差距通常远小于算法与架构的差距。选型依据应是错误类别、生态与团队，而非 benchmark 上的百分之几。

## 10. 小练习

1. 把第 6 节 C++ 代码里的 `lock_guard` 删掉再运行多次，观察计数结果是否稳定小于 10（仅在有 sanitizer 或多核环境做，理解这是未定义行为）；
2. 把第 4 节的 Rust `divide` 改成返回 `Result<i32, DivideError>`，其中 `DivideError` 是你自定义的枚举（如 `DivideByZero`）；
3. 完成 8.1 节的 C++ 调 Rust 全流程：建 Rust 库、导出 `rust_add`、CMake 链接静态库并运行成功；
4. 用 `std::variant` + `std::visit` 实现第 7.2 节 Rust 枚举的等价物，数一数两边代码行数差；
5. 找一个你写过的小型 C++ 函数，逐行「翻译」成 Rust，记录每一处编译器拦下你的地方——这份清单就是你的 Rust 学习路线图。

## 11. 与之前和之后的知识的关系

- 之前：本文大量对照建立在[智能指针](/cpp/130-SmartPointerDeepDive)（`unique_ptr`/`shared_ptr` 的所有权语义）与[多线程并发](/cpp/430-MultithreadingConcurrency)（数据竞争与锁）之上，这两篇不熟请先回读；
- 之后：想系统学 Rust，从 [Rust 是什么](/rust/010-WhatIsRust)进入 Rust 模块主线，本仓库 Rust 篇章与此文一一呼应；
- 旁支：C++ 侧更细的工具链对比（CMake vs Cargo）见[构建工具链](/cpp/640-CppToolchain)；`std::expected` 与 C++23 错误处理演进见 [C++23/26 新特性](/cpp/740-Cpp23Cpp26NewFeatures)。

## 官方文档

- C++ Core Guidelines（资源管理章节）：<https://isocpp.github.io/CppCoreGuidelines/>
- The Rust Book：<https://doc.rust-lang.org/book/>
- bindgen 用户手册：<https://rust-lang.github.io/rust-bindgen/>

## 自我检查

1. `Box<T>` 与 `std::unique_ptr<T>`、`Arc<T>` 与 `std::shared_ptr<T>` 分别对应哪两个语义差异点？
2. 为什么说「C++ 的数据竞争是未定义行为，Rust 的是编译错误」？`Send`/`Sync` 在其中起什么作用？
3. `std::optional` 与 `Result<T, E>` 在错误信息表达能力上差在哪？
4. C++ 调 Rust 时为什么函数要标 `#[no_mangle]` 和 `extern "C"`？哪些类型不能直接穿过这条边界？
5. 给「十年历史的 C++ 游戏项目」和「新起的网络代理项目」分别给出语言建议，并说出两条依据。

## 本章总结

C++ 与 Rust 的分野源于一个决策：安全靠纪律还是靠编译器。C++ 用智能指针、concepts、`expected` 一步步把最佳实践补成语言能力，胜在生态存量与人才池；Rust 把所有权、借用、`Send`/`Sync` 直接写进语法，胜在错误类别从运行期前移到编译期。两者经 C ABI 的 FFI 互通成熟，渐进混用是主流路线。选型看四件事：错误类别是否致命、生态是否覆盖、团队储备、以及存量代码的迁移成本——而不是语言论战。

## 下一步

想继续深入 C++ 现代化，读 [C++23/26 新特性](/cpp/740-Cpp23Cpp26NewFeatures)；决定学 Rust，从 [Rust 是什么](/rust/010-WhatIsRust)进入完整主线。
