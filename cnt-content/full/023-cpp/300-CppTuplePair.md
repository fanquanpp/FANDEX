---
order: 300
title: C++ tuple 与 pair
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: C++ tuple 与 pair 完整教学：构造与访问、字典序比较、tie/apply/tuple_cat、多返回值实践、C++23 tuple-like 增强。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cpp/320-StructuredBinding'
  - 'cpp/310-CppVariantOptionalAny'
  - 'cpp/270-CppSTLAlgorithms'
  - 'cpp/280-CppSTLAlgorithmAndFunctionObject'
prerequisites:
  - 'cpp/030-CppBasicSyntax'
---

## 学习目标

- 会用 `std::pair` 存「成对的两个值」、用 `std::tuple` 存「任意多个值」
- 掌握 `std::get`、`std::tie`、`std::make_tuple`、`std::apply`、`std::tuple_cat` 五件套
- 理解 pair/tuple 与 map、多返回值函数、结构化绑定之间的配合
- 知道 pair/tuple 的典型误用：语义不明、按类型取值不唯一

## 前置知识

- 基础语法与函数返回值：[C++ 基础语法](/cpp/030-CppBasicSyntax)
- 结构化绑定是解包 pair/tuple 的最佳拍档：[结构化绑定速查](/cpp/320-StructuredBinding)

## 概念引入

pair 与 tuple 回答的问题是：**如何把几个「本该一起出现」的值当作一个整体传递**。

- `std::pair<A, B>`：恰好两个元素，且有固定名字 `first`/`second`。类比：一双鞋，
  左右各一只，位置固定。
- `std::tuple<A, B, C...>`：任意数量、任意类型的元素序列。类比：一串钥匙盘，
  每个位置挂不同的钥匙，要按位置取。

它们都是**编译期固定大小、固定类型**的聚合体：不涉及运行时类型擦除（这是与
`std::any` 的本质区别，见 [variant/optional/any](/cpp/310-CppVariantOptionalAny)）。
需要语义明确的「两个值」时优先自定义结构体；pair/tuple 适合「局部、位置即语义」的场景。

## pair 基本用法

```cpp
// compile: g++ -std=c++17 pair_demo.cpp && ./a.out
#include <iostream>
#include <string>
#include <utility>

int main() {
    // 构造：显式类型 or make_pair 自动推导
    std::pair<int, std::string> p1(1, "hello");
    auto p2 = std::make_pair(42, 3.14);   // pair<int, double>

    // 访问：first / second（这是 pair 独有的具名访问）
    std::cout << p1.first << " " << p1.second << '\n';   // 1 hello

    // 比较：字典序——先比 first，相等再比 second
    // bool before = std::make_pair(1, 2) < std::make_pair(1, 3);  // true

    // 解包：C++17 结构化绑定
    auto [id, name] = p1;
    std::cout << id << " " << name << '\n';              // 1 hello
}
```

pair 最常见的三个出处：

1. 关联容器的元素：`std::map<K, V>` 的每个元素就是 `std::pair<const K, V>`；
2. `map::insert` 的返回值：`std::pair<iterator, bool>`（位置 + 是否插入成功）；
3. 自定义「双返回值」函数。

```cpp
#include <map>
#include <string>

std::map<std::string, int> ages;
auto [it, inserted] = ages.emplace("Alice", 30);   // 结构化绑定接收
// inserted 为 true 表示新插入；为 false 表示 key 已存在，it 指向旧元素
```

## tuple 基本用法

```cpp
// compile: g++ -std=c++17 tuple_demo.cpp && ./a.out
#include <iostream>
#include <string>
#include <tuple>

int main() {
    std::tuple<int, double, std::string> t(1, 2.0, "x");
    auto u = std::make_tuple(1, 2.0, "x");        // 自动推导

    // 按索引取值：索引必须是编译期常量
    std::cout << std::get<0>(t) << '\n';          // 1

    // 按类型取值：该类型必须恰好出现一次，否则编译错误
    std::cout << std::get<std::string>(t) << '\n';// x

    // 编译期查询元素个数与元素类型
    constexpr std::size_t n = std::tuple_size<decltype(t)>::value;   // 3
    using First = std::tuple_element<0, decltype(t)>::type;          // int
    std::cout << n << '\n';

    // 解包
    auto [i, d, s] = t;
    std::cout << i << " " << d << " " << s << '\n';  // 1 2 x
}
```

## 常用操作五件套

### tie：把 tuple「写入」已有变量

```cpp
#include <tuple>

int a, b;
std::tie(a, b) = std::make_pair(1, 2);            // a=1, b=2

// 不关心某个位置时用 std::ignore 占位
int id;
std::tie(id, std::ignore) = some_pair_func();
```

注意 `tie` 绑定的是**引用**，所以目标变量必须已经存在；这与结构化绑定「随用随建名字」
形成互补：需要提前声明的循环变量用 `tie`，就地新名字用结构化绑定。

### tuple_cat：拼接

```cpp
auto t1 = std::make_tuple(1);
auto t2 = std::make_tuple(2.0, "x");
auto big = std::tuple_cat(t1, t2);   // tuple<int, double, const char*>
```

### apply：把 tuple 当参数包调用函数

```cpp
#include <tuple>

int add(int a, int b) { return a + b; }
auto args = std::make_tuple(3, 4);
int r = std::apply(add, args);       // r == 7，等价于 add(std::get<0>(args), std::get<1>(args))
```

`std::apply` 是泛型代码中的常用粘合剂：当你把「一包参数」存进 tuple，传递后用
`apply` 还原成函数调用。

### make_from_tuple：用 tuple 构造对象

```cpp
#include <tuple>

struct Point { int x, y; };
auto args = std::make_tuple(1, 2);
Point p = std::make_from_tuple<Point>(args);   // Point{1, 2}
```

### 一次返回多个值（最常用场景）

```cpp
#include <tuple>
#include <iostream>

// 返回「是否成功 + 结果」，比出参引用更直观
std::tuple<bool, int> safe_divide(int a, int b) {
    if (b == 0) return {false, 0};
    return {true, a / b};
}

int main() {
    auto [ok, val] = safe_divide(10, 3);
    if (ok) std::cout << "10/3 = " << val << '\n';   // 10/3 = 3
}
```

工程提醒：跨函数边界的返回值若超过 3 个元素，或元素含义不靠位置就能看懂（如
`tuple<int, int, int>` 谁是宽谁是高），应改用自定义结构体——编译器对结构体还有
指定初始化器 `{.width = 3}` 这样的可读性支持。

## pair/tuple 与容器、算法

```cpp
#include <algorithm>
#include <vector>

std::vector<std::pair<int, std::string>> v{{2, "b"}, {1, "a"}, {1, "c"}};

// pair 的字典序比较可以直接用于排序：先按 first 升序，first 相同按 second
std::sort(v.begin(), v.end());
// 结果：{1,"a"}, {1,"c"}, {2,"b"}
```

利用「pair 比较 = 字典序」可以零成本实现多键排序：把「主键」放进 `first`。
`std::map`/`std::set` 对 pair 的排序同理。

## C++23 增强：tuple-like 协议

C++23 把「tuple 协议」（`std::tuple_size` + `std::tuple_element` + `std::get<i>`）
正式化为 **tuple-like** 概念，并打通了它与 ranges 的关系：

- `std::array`、`std::pair`、`std::tuple` 都满足 tuple-like，`std::get<0>` 对三者
  统一可用（pair 的 `std::get` 事实上自 C++11 就有，C++23 是协议层面的统一）；
- tuple 与 pair 之间可以按元素转换（P2165）；
- `views::enumerate`、`views::zip` 等新视图产出的都是 tuple-like 对象，配合结构化
  绑定遍历非常顺手。

```cpp
#include <ranges>
#include <vector>

std::vector<std::string> names{"a", "b", "c"};
for (auto const& [idx, name] : names | std::views::enumerate) {
    // idx 是元素下标，name 是元素本身——enumerate 产出 pair-like
}
```

## 常见陷阱

1. **按类型取值不唯一即编译错误**：`std::get<int>(tuple<int, int>)` 无法编译；
   同类型元素多时只能按索引取。
2. **`std::get<i>` 的索引必须是编译期常量**：想用运行期下标遍历 tuple 需要
   模板递归或折叠表达式，普通循环做不到。
3. **tuple 的语义黑洞**：`std::tuple<int, int>` 表示「坐标」还是「宽高」？
   函数签名完全看不出来。跨接口边界请用结构体命名成员。
4. **`std::tie` 绑定悬垂引用**：`std::tie(a, b) = f();` 中的 `a`、`b` 必须存活，
   绑定到已销毁的局部变量是 UB。
5. **比较陷阱**：pair/tuple 总是字典序比较。若 `first` 不是主键，排序结果会与
   直觉不符——需要自定义比较器时不要依赖默认比较。

## 小结

**初学者记住这三点：**

1. 两个值用 `pair`（`first`/`second`），多个值用 `tuple`（`std::get<i>`）；
2. 接收多返回值首选结构化绑定 `auto [a, b] = f();`，已有变量则用 `std::tie`；
3. `map` 的元素就是 pair，`insert`/`emplace` 的返回值解构一下就能同时拿到位置与成败。

**进阶者还需注意：**

- `std::apply` / `std::make_from_tuple` 是参数包与函数调用之间的标准桥接；
- C++23 的 tuple-like 协议统一了 pair/tuple/array 与新 ranges 视图的互操作；
- 接口边界上的「位置语义」应让位于结构体成员名——tuple 的最佳活动范围是函数内部
  与泛型库内部。
