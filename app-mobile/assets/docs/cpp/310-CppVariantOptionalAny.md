---
order: 330
title: C++ variant / optional / any
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: C++ 三大词表类型完整教学：optional 表示可能没有值、variant 表示若干类型之一、any 表示运行期任意类型，含选型对比与常见陷阱。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'cpp/300-CppTuplePair'
  - 'cpp/730-Cpp23NewFeatures'
  - 'cpp/190-ExceptionSecurity'
  - 'cpp/040-CppTypeSystem'
prerequisites:
  - 'cpp/030-CppBasicSyntax'
---

## 学习目标

- 分清三个「词表类型」的定位：`optional`（可能有值）、`variant`（类型集合选一）、`any`（运行期任意类型）
- 会用 `optional` 的判空/取值/`value_or`，以及 C++23 的 monadic 链式接口
- 会用 `variant` + `std::visit` 替代传统的 tagged union
- 建立选型直觉：什么时候用它们，什么时候该写结构体或继承

## 前置知识

- 基础语法、函数返回值：[C++ 基础语法](/cpp/030-CppBasicSyntax)
- 异常语义（理解 `value()` 抛异常的行为）：[异常与安全](/cpp/190-ExceptionSecurity)

## 概念引入

C++17 给标准库加了三个「先想清楚再开口」的容器，业内常称 vocabulary types（词表类型）：

| 类型 | 回答的问题 | 类比 |
| --- | --- | --- |
| `std::optional<T>` | 「有一个 T 吗？」 | 一张**可能为空**的座位票 |
| `std::variant<A, B, C>` | 「是 A、B、C 中的哪一个？」 | 一枚**面值未定**的多面硬币，同一时刻只有一面向上 |
| `std::any` | 「随便放了个什么，运行时才知道」 | 一个**不封底**的百宝箱 |

共同点：三者都**值语义**（可拷贝、可移动、栈上存储为主），不涉及裸指针所有权。
关键差别在类型知识放编译期还是运行期：`variant` 的候选类型集合在**编译期固定**，
取错类型会抛异常或返回空指针；`any` 的类型到**运行期**才确定，取值一律要尝试转换。

## std::optional：可能没有值

**为什么需要它**：函数「找不到结果」的传统做法有三种——返回魔法值（-1）、设置错误码出参、
返回空指针。三种都把「没有值」和「值本身」混在一起。`optional<T>` 把「有没有」变成
类型系统的一部分：**没有值就是 `std::nullopt`，有值就是 T**。

```cpp
// compile: g++ -std=c++17 optional_demo.cpp && ./a.out
#include <iostream>
#include <optional>
#include <string>
#include <unordered_map>

std::optional<int> find_age(const std::unordered_map<std::string, int>& m,
                            const std::string& name) {
    if (auto it = m.find(name); it != m.end()) {
        return it->second;          // 有值
    }
    return std::nullopt;            // 无值（可省略，返回 {} 同义）
}

int main() {
    std::unordered_map<std::string, int> ages{{"Alice", 30}};

    if (auto age = find_age(ages, "Alice")) {      // 直接当 bool 用
        std::cout << "Alice: " << *age << '\n';    // 30
    }

    auto bob = find_age(ages, "Bob");
    std::cout << bob.value_or(-1) << '\n';         // -1：无值时给默认值

    // bob.value();  // 无值时抛 std::bad_optional_access
    // *bob;         // 无值时是未定义行为！比 value() 更危险
}
```

判空与取值速查：

| 写法 | 无值时行为 |
| --- | --- |
| `if (o)` / `o.has_value()` | 检查，安全 |
| `*o` | UB，必须先判空 |
| `o.value()` | 抛 `std::bad_optional_access` |
| `o.value_or(default)` | 返回默认值 |

C++23 补齐了与 `std::expected` 一致的 monadic 链式接口（`and_then`/`transform`/
`or_else`），把「有值才继续」的判断串成管道：

```cpp
// C++23：值存在则应用函数返回新 optional，否则整条链短路为空
auto name = find_age(ages, "Alice")
    .and_then([](int i) { return std::optional{std::to_string(i)}; })
    .transform([](const std::string& s) { return "age=" + s; });
// name 此刻持有 "age=30"
```

**陷阱**：`optional<T&>`（引用的 optional）不存在；`optional<bool>` 与 `optional<int>`
隐式转换容易造成「双重否定」bug——`if (maybe_bool_opt.value_or(false))` 比裸转换清晰。

## std::variant：类型集合中选一

`variant<A, B, C>` 是**类型安全**的联合体：同一时刻恰好持有一种候选类型，并且记住了
是哪一种。传统的 C 风格 tagged union 需要手写 tag 字段并保证读写一致，漏写就是 UB；
variant 把 tag 交给编译器管理。

```cpp
// compile: g++ -std=c++17 variant_demo.cpp && ./a.out
#include <iostream>
#include <string>
#include <variant>

using Value = std::variant<int, double, std::string>;

void print(const Value& v) {
    // 首选：std::visit + 重载访问者，编译器强制覆盖所有分支
    std::visit([](auto&& x) { std::cout << x << '\n'; }, v);
}

int main() {
    Value v = 42;                       // 当前持有 int
    std::cout << v.index() << '\n';     // 0：int 的位置索引

    v = std::string("hi");              // 切换到 string（旧值被正确销毁）

    // 检查当前类型
    if (std::holds_alternative<std::string>(v)) {
        std::cout << "持有 string\n";
    }

    // 取值：get 抛异常，get_if 返回指针不抛
    std::string& s = std::get<std::string>(v);      // 类型不符抛 bad_variant_access
    if (auto* p = std::get_if<std::string>(&v)) {   // 推荐：先试探
        std::cout << *p << '\n';                    // hi
    }

    print(v);
}
```

结构化访问者的惯用法（重载多个 lambda）：

```cpp
template <class... Ts> struct overloaded : Ts... { using Ts::operator()...; };
template <class... Ts> overloaded(Ts...) -> overloaded<Ts...>;   // C++17 CTAD

std::visit(overloaded{
    [](int i)        { std::cout << "int: " << i << '\n'; },
    [](double d)     { std::cout << "double: " << d << '\n'; },
    [](const std::string& s) { std::cout << "str: " << s << '\n'; }
}, v);
```

**默认构造与 monostate**：variant 默认构造出**第一个候选类型**；若第一个类型不可默认
构造，整个 variant 就不可默认构造。此时把 `std::variant<std::monostate, A, B>` 的
`monostate`（空状态占位类型）放在首位即可恢复默认构造能力，`holds_alternative<std::monostate>(v)`
即可判断「空」。

**陷阱**：

1. `std::get<T>` 的 T 在候选列表中必须唯一，否则编译错误；
2. variant 切换类型时若新类型构造抛异常，旧值可能先被销毁（价值由实现保证，
   强异常安全需用 `std::variant` 的 `emplace` 谨慎处理）；
3. `std::visit` 的访问者必须对**所有**候选类型可调用，漏一个就是编译错误——
   这正是它的安全性来源。

## std::any：运行期任意类型

`any` 可以装下任何**可拷贝构造**的值，并在运行期记录类型。取值必须用 `std::any_cast`
做「猜类型」转换——猜错抛 `std::bad_any_cast`（指针形式返回 nullptr）。

```cpp
// compile: g++ -std=c++17 any_demo.cpp && ./a.out
#include <any>
#include <iostream>
#include <string>

int main() {
    std::any a;                          // 空的
    std::cout << a.has_value() << '\n';  // 0

    a = 42;
    a = std::string("hi");               // 后赋值覆盖前值（旧值销毁）
    a.reset();                           // 清空；也可以 a = {}（不要写 = std::nullopt，那是 optional 的）

    a = 3.14;
    if (a.type() == typeid(double)) {    // 运行期类型查询
        std::cout << std::any_cast<double>(a) << '\n';   // 3.14
    }

    if (auto* p = std::any_cast<double>(&a)) {           // 指针形式：不匹配得 nullptr
        std::cout << *p << '\n';
    }
}
```

**什么时候用 any**：真正需要「运行期才知道类型」的边界——脚本绑定、插件系统、
属性表（property bag）。能预见候选类型集合时永远优先 `variant`（编译期检查 +
无堆分配 + 更快），能在调用点消除「未知」时用模板泛型——`any` 是最后的选择。

## 选型对比

| 维度 | `optional<T>` | `variant<A,B,...>` | `any` |
| --- | --- | --- | --- |
| 候选类型数 | 0 或 1 个（T） | 编译期固定的 N 个 | 运行期任意 |
| 类型检查时机 | 编译期 | 编译期为主（visit 全覆盖） | 运行期 |
| 存储方式 | 内联 + 可能的 T 内部分配 | 内联（大小 = 最大候选） | 常有小对象优化，超限堆分配 |
| 取错代价 | UB / 抛异常 | 抛异常 / nullptr | 抛异常 / nullptr |
| 典型场景 | 查找、解析失败 | 状态机、AST 节点、消息类型 | 插件、脚本、反射式存储 |

一句话决策：**「可能没有」用 optional，「有限选择」用 variant，「完全未知」用 any；
语义重要就自定义结构体。**

## 底层原理：三个类型各自的内存账本

选型的依据最终落在「存储与分派怎么实现」。三者的布局差异可以画成一张账本：

```text
std::optional<T>          std::variant<A, B>         std::any
+-----------------+       +-----------------+        +-----------------+
| T storage       |       | union { A a;    |        | SBO 内联存储     |
| bool has_value  |       |         B b; }  |        |   或堆指针       |
+-----------------+       | index 判别式     |        | type_info 指针   |
                          +-----------------+        +-----------------+
```

- **optional**：一块 `T` 大小的存储加一个「有没有」标记。注意即使无值，`sizeof(optional<T>)`
  也 ≥ `sizeof(T) + 对齐余量`——它不为「空」省内存，省的是「表达空」的心智负担。
- **variant**：候选类型的 union 加一个判别式（index）。`sizeof(variant<A,B,C>)`
  约等于最大候选的大小加判别式——**把一个巨型类型放进候选列表，会让所有 variant 对象
  都那么大**，这是「候选类型要体量相近」的工程理由。
- **any**：类型擦除的通用容器，多数实现带小对象优化（SBO）：小对象直接内联，大对象
  堆分配加指针；同时存一份运行期类型信息用于 `any_cast` 校验。这就是三者中它最慢、
  最不可预测的原因。

`std::visit` 的分派本质也能从布局推出：访问者要对每个候选类型都能调用，编译器生成的
代码等价于「按 index 做 switch（或函数指针表），每个分支把 union 对应成员交给访问者」。
候选一多、再叠加多个 variant 参数，分派组合数按笛卡尔积增长——编译变慢、代码膨胀、
间接跳转难预测，都是同一根源。

## 面试题思路：三个高频考法

1. 「`optional` 比「返回 -1 表示找不到」好在哪？」——考点是**把状态装进类型**：
   魔法值要求 T 的值域里恰好有个「不可能值」（对 string 就不存在），且调用方可能忘记
   检查；optional 让编译器强制你面对「可能没有」这个分支，`value()` 与 `*` 的取值
   代价差异（抛异常 vs UB）也是常问细节。
2. 「variant 与传统 tagged union 的区别？」——答三层：tag 由编译器管理不会失配；
   切换类型时旧对象被正确析构（手写 union 做不到）；`std::visit` 强制穷尽所有候选，
   新增候选类型时所有访问点编译报错——把「维护时容易漏改」变成「编译不过」。
3. 「什么时候必须用 `any` 而不是 variant？」——答「候选集合在编译期不可枚举」的场景：
   插件从动态库加载、脚本引擎传值、序列化框架的属性袋。追问「any 的性能特征」时，
   顺着 SBO 账本讲：小对象内联、大对象堆分配、取值有类型校验开销。

## 动手实验

1. **账本验证**：对 `optional<int>`、`variant<char, double, std::string>`、`any`
   分别打印 `sizeof`，与上节账本对照（不同标准库实现数值不同，趋势一致：variant
   ≈ 最大候选，any 常见为 16 或 32 字节上限）。
2. **visit 穷尽性实验**：给三候选 variant 新增第四个候选类型，重编译，观察所有
   `std::visit` 调用点的报错清单——这就是「编译期强制维护」的直观体验；再给访问者
   补上泛型分支 `[](auto&&) {}` 观察报错消失，并思考泛型分支对穷尽性检查的影响
   （它吞掉所有类型，安全性靠自己约定）。
3. **monostate 实验**：定义一个无默认构造的类型 `NoDefault{ NoDefault(int); }`，
   放进 `std::variant<NoDefault, int>` 看默认构造报错；换成
   `std::variant<std::monostate, NoDefault, int>` 恢复，并用 `holds_alternative`
   判断空态。
4. **optional 双重否定实验**：写 `std::optional<bool>`，构造「有值但值为 false」的
   对象，分别用 `if (o)` 与 `if (o.value_or(false))` 判断，输出两者结果并解释差异。

## 小练习（先自己做，再展开参考实现）

**练习 1：用 variant 重构形状系统**。给定传统写法：

```cpp
enum class ShapeKind { Circle, Rect };
struct Shape { ShapeKind kind; double r; double w; double h; };
double area(const Shape& s);   // 内部 switch 判断 kind
```

用 `std::variant` + `std::visit`（含 `overloaded` 惯用法）重写，要求：新增三角形时
编译器能指出所有必须修改的分支。

提示：每种形状一个小结构体；`area` 里一个 `std::visit`。

参考实现：

```cpp
#include <cmath>
#include <variant>

struct Circle { double r; };
struct Rect   { double w, h; };
struct Tri    { double a, b, c; };

using Shape = std::variant<Circle, Rect, Tri>;

double area(const Shape& s) {
    return std::visit([](auto&& sh) -> double {
        using T = std::decay_t<decltype(sh)>;
        if constexpr (std::is_same_v<T, Circle>) {
            return 3.14159265358979 * sh.r * sh.r;
        } else if constexpr (std::is_same_v<T, Rect>) {
            return sh.w * sh.h;
        } else {                       // Tri：海伦公式
            double p = (sh.a + sh.b + sh.c) / 2;
            return std::sqrt(p * (p - sh.a) * (p - sh.b) * (p - sh.c));
        }
    }, s);
}
// 给 Shape 增加新候选后：所有「非泛型」的 visit 访问者都会编译报错，
// 逐一补分支即可——维护漏改被编译器接管。
```

自检问题：如果把访问者里最后的 `else` 改成 `else if constexpr` 且不覆盖全部类型，
编译会发生什么？（答：某个分支对访问者不可调用，`std::visit` 直接编译失败——
这正是穷尽性检查在工作。）

**练习 2：查找缓存**。实现 `class Cache`：`get(key)` 返回 `optional<Value>`；
再提供 `get_or_compute(key, func)`，无值时计算并写入。要求不使用出参引用，
并用两条断言验证「命中不重复计算、未命中恰好计算一次」。

参考实现：

```cpp
#include <functional>
#include <optional>
#include <unordered_map>

template <class K, class V>
class Cache {
    std::unordered_map<K, V> data_;
public:
    std::optional<V> get(const K& key) const {
        auto it = data_.find(key);
        return it == data_.end() ? std::nullopt : std::optional<V>{it->second};
    }
    const V& get_or_compute(const K& key, std::function<V(const K&)> f) {
        if (auto hit = get(key)) {
            // 注意：不能返回 optional 内部成员的引用（悬垂），
            // 命中路径需要在 map 里再查一次拿到稳定引用
            return data_.find(key)->second;
        }
        return data_.emplace(key, f(key)).first->second;
    }
};
```

自检问题：上面注释里提到的坑是什么？（答：`*hit` 得到的是 optional 内部存储的拷贝，
函数返回引用时它已随临时 optional 析构——这就是 080 篇悬空引用的成因二在容器场景的
翻版，命中路径必须回到 map 里取稳定引用。）

**挑战题（不给参考实现）**：设计一个「解析配置行」的小函数：输入 `"name=Alice"`
或 `"timeout=30"`，输出一个能同时承载字符串与整数的类型（选 variant 还是 any？
写两句话理由），并用 `std::visit` 打印所有行。写完自查：你的候选类型集合在编译期
是封闭的吗？

## 小结

**初学者记住这三点：**

1. 函数可能「没有结果」时返回 `optional<T>`，用 `if (o)` 判空、`value_or` 兜底；
2. 「多选一」用 `variant`，配套 `std::visit`（或 `get_if` 试探），不要手写 tagged union；
3. `any` 是运行期百宝箱，取值必须 `any_cast`，能不用就不用。

**进阶者还需注意：**

- C++23 的 monadic 接口让 `optional`/`expected` 的错误传播链式化，与
  [C++23 新特性](/cpp/730-Cpp23NewFeatures) 里的 `std::expected` 对照学习效果最佳；
- `variant` 的大小是其最大候选类型的大小 + 判别式，把巨型类型放进候选会放大所有
  对象的内存占用；
- `std::visit` 的多 variant 形式会做 N 维分派，候选组合爆炸时注意编译期与代码体积成本。
