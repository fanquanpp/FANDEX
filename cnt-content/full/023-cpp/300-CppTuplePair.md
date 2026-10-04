---
order: 280
title: C++ tuple 与 pair
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: C++ tuple 与 pair 完整教学：构造与访问、字典序比较、tie/apply/tuple_cat、多返回值实践、C++23 tuple-like 增强。
author: fanquanpp
updated: '2026-10-05'
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

## 面试题思路：三个高频考法

1. 「`map::insert` 与 `operator[]` 都能写入，为什么库要设计成返回 pair？」——考点是
   **一次调用带回两个结果**：`operator[]` 无法区分「新建」与「覆盖」，`insert` 返回
   `pair<iterator, bool>` 把「位置」与「是否真的插入了」一起交还，配合结构化绑定
   `auto [it, ok] = m.insert(...)` 一行分流。追问 C++17 的 `try_emplace` 与
   `insert_or_assign` 如何进一步消除「先查再插」的重复查找，能体现对接口演化史的
   了解。
2. 「tuple 按索引取值为什么必须是编译期常量？」——答：tuple 的元素类型序列在编译期
   固定，`std::get<i>` 是模板，实参 `i` 必须是编译期常量表达式才能实例化；运行期
   下标需要的是「值不同的类型」，只能靠模板递归（按索引递归展开）或 `std::apply`
   折叠表达式在编译期把所有分支展开后按 index 跳转。
3. 「什么时候 tuple 是错的抽象？」——答「位置语义跨过接口边界」的场景：函数签名
   `std::tuple<int, int, int> get_box()` 对调用方是谜语。判断准绳：**函数内部与泛型
   库内部用 tuple 顺手，跨 API 边界用结构体**；结构体换来的是具名成员、指定初始化器
   与不依赖注释的可读性。

## 动手实验

1. **字典序排序实验**：把 `{2,"b"}, {1,"a"}, {1,"c"}` 的 vector 分别按默认比较与
   自定义比较器（second 优先）排序，打印两组结果，验证「默认字典序把 first 当主键」。
2. **tie 与结构化绑定互换实验**：同一段「解析两个返回值」的代码分别用
   `std::tie(a, b)` 与 `auto [x, y]` 实现，故意在 `tie` 版里用未初始化变量、在绑定版
   里少写一个名字，比较两种编译期/运行期失败的形态（tie 版是 UB 风险，绑定版是
   编译错误——后者更安全）。
3. **apply 展开实验**：写一个接受 3 个参数的函数，把参数存进 tuple，分别用
   `std::apply` 与 `std::get<0>` 手动展开调用，确认两者等价；再把函数改成 4 参，
   数一数两种写法各要改几处（体会 apply 对「参数包整体传递」的价值）。
4. **运行期下标受挫实验**：对 `tuple` 写 `for (std::size_t i = 0; i < n; ++i)
   std::get<i>(t)`，亲眼看编译错误；然后用 `std::apply` + 折叠表达式
   （`((std::cout << args << ' '), ...)`）实现同样的遍历，体会「运行期循环变
   编译期展开」的思维转换。

## 小练习（先自己做，再展开参考实现）

**练习 1：minmax 一次遍历**。实现 `std::pair<int, int> minmax(const std::vector<int>& v)`
（返回 `{min, max}`），要求单次遍历、空 vector 抛 `std::invalid_argument`；
调用点用结构化绑定接收并打印。

提示：初值取第一个元素，从第二个开始比较。

参考实现：

```cpp
#include <stdexcept>
#include <utility>
#include <vector>

std::pair<int, int> minmax(const std::vector<int>& v) {
    if (v.empty()) throw std::invalid_argument("empty input");
    int lo = v[0], hi = v[0];
    for (std::size_t i = 1; i < v.size(); ++i) {
        if (v[i] < lo) lo = v[i];
        else if (v[i] > hi) hi = v[i];
    }
    return {lo, hi};
}

// 调用点
auto [lo, hi] = minmax(data);
std::cout << lo << " ~ " << hi << '\n';
```

自检问题：为什么不返回 `std::tuple<int, int>`？（答：两个值时 pair 与 tuple 等价，
但 pair 有 `.first/.second` 具名访问且更轻；返回 3 个以上值再升级 tuple 或结构体。）

**练习 2：把 pair 换成结构体的重构**。给定签名 `std::pair<bool, std::string>
parse_config(const std::string& line)`，把返回类型改写为语义明确的结构体
（`success` + `message` 字段），同步改造调用点，并对比两版调用点的可读性。
要求结构体使用指定初始化器（C++20）。

参考实现：

```cpp
#include <string>

struct ParseResult {
    bool success;
    std::string message;
};

ParseResult parse_config(const std::string& line);

// 调用点：指定初始化器 + 结构化绑定
ParseResult r{.success = false, .message = "not parsed yet"};
if (auto [ok, msg] = parse_config("timeout=30"); ok) {
    apply(msg);
} else {
    log(msg);
}
```

自检问题：结构体版多写了哪些字，换来了什么？（答：类型定义与初始化的样板；换来
的是「这个 bool 是什么意思」不再需要注释，且后续加字段不必改所有调用点的位置语义。）

**挑战题（不给参考实现）**：用 `std::apply` + 折叠表达式写 `print_all(const
std::tuple<Ts...>&)`，把任意 tuple 的元素逐个打印；再给每个元素之间加序号（提示：
需要编译期索引，可用 `std::index_sequence`）。写完自查：你的实现里有没有出现
运行期 `for` 循环？为什么不应该有？

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
