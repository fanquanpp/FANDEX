---
order: 340
title: C++ 结构化绑定语法速查手册
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: C++ 结构化绑定（C++17）速查与教学：数组/pair/tuple/结构体解包、值类别与引用绑定、范围 for 解构、C++20 扩展与常见陷阱。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cpp/300-CppTuplePair'
  - 'cpp/290-Cpp20Range'
  - 'cpp/310-CppVariantOptionalAny'
  - 'cpp/080-CppReferenceTypes'
prerequisites:
  - 'cpp/030-CppBasicSyntax'
---

## 学习目标

- 会用结构化绑定解包数组、`std::pair`/`std::tuple`、结构体三种对象
- 分清拷贝绑定、`auto&`、`const auto&`、`auto&&` 四种绑定的值类别与代价
- 知道最常见的三个坑：绑定的是副本、lambda 捕获限制（C++17/C++20 差异）、绑定数量必须匹配

## 前置知识

- 变量声明与引用基础：[引用类型](/cpp/080-CppReferenceTypes)
- `std::pair`/`std::tuple` 的基本形态：[Tuple 与 Pair](/cpp/300-CppTuplePair)

## 概念引入

函数想返回「两个结果」怎么办？C++17 之前的写法要么返回 `pair` 再用 `.first/.second`（可读性差），
要么往函数里塞引用参数（破坏纯函数性）。结构化绑定（structured bindings，C++17）一句话解决：
**把一个对象「按位置拆开」，直接给每个位置起名字**。

类比：结构化绑定像「快递开箱」——包裹（对象）里有三件物品（成员），`auto [a, b, c] = 包裹;`
相当于一次拆箱并给每件物品贴标签。注意：默认情况下贴的标签对应的是**复印件**（拷贝），
想让标签直指原件需要引用语法（见下文「值类别修饰」）。

## 基本语法

### 三种可绑定对象

```cpp
#include <string>
#include <tuple>
#include <utility>

// 1. 绑定数组：按位置绑定元素
int arr[3] = {1, 2, 3};
auto [a, b, c] = arr;              // a=1, b=2, c=3（各为副本）

// 2. 绑定 pair / tuple：按元素位置绑定
std::pair<int, std::string> p{42, "Tom"};
auto [id, name] = p;               // id=42, name="Tom"

std::tuple<int, double, std::string> t{1, 2.5, "hi"};
auto [x, y, z] = t;                // x=1, y=2.5, z="hi"

// 3. 绑定结构体的公有非静态数据成员：按声明顺序绑定
struct Point { int px; int py; };
Point pt{10, 20};
auto [u, v] = pt;                  // u=10, v=20
```

绑定数量必须与成员/元素数量一致，否则编译错误；`std::tuple_size<T>` 决定 tuple 类对象
的成员数，普通结构体则取「全部公有非静态数据成员」。

### 一个最小可运行示例

```cpp
// compile: g++ -std=c++17 structured.cpp && ./a.out
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> scores{{"Alice", 95}, {"Bob", 87}};

    // 遍历 map：每个元素是 pair<const string, int>，直接拆成 key/value
    for (const auto& [name, score] : scores) {
        std::cout << name << ": " << score << '\n';
    }
    // 输出（按键排序）：
    // Alice: 95
    // Bob: 87
}
```

## 值类别修饰：拷贝、引用、转发引用

这是结构化绑定最容易踩坑的地方。绑定声明写在哪里，决定了每个名字「指向原件」还是「指向副本」。

| 声明形式 | 语义 | 代价 | 典型场景 |
| --- | --- | --- | --- |
| `auto [a, b] = expr;` | 拷贝整个对象，名字指向副本 | 拷贝开销 | 需要快照、原对象随后会变 |
| `auto& [a, b] = expr;` | 左值引用绑定，名字直指成员 | 零拷贝，可修改 | 遍历容器并修改 |
| `const auto& [a, b] = expr;` | 只读引用 | 零拷贝，只读 | 遍历大对象、只读场景 |
| `auto&& [a, b] = expr;` | 转发引用，保留值类别 | 零拷贝 | 泛型代码中同时接左/右值 |

```cpp
#include <utility>

std::pair<int, int> make() { return {1, 2}; }

void demo() {
    // 拷贝绑定：修改 a 不影响任何「原件」（make() 的返回值本来就是临时对象）
    auto [a, b] = make();
    a = 100;

    // 引用绑定：直接修改原对象
    std::pair<int, int> p{1, 2};
    auto& [first, second] = p;
    first = 100;                    // p.first 变为 100

    // 只读引用：大对象避免拷贝
    // const auto& [k, v] = some_big_pair;

    // 转发引用：右值来时延长其生命周期，左值来时等价 auto&
    auto&& [m, n] = make();         // 绑定到临时对象，生命周期被延长到本作用域
}
```

**陷阱 1：默认是拷贝**。`for (auto [k, v] : big_vector)` 每轮迭代都拷贝一个完整元素，
性能敏感代码应当写 `const auto&` 或 `auto&`。

**陷阱 2：绑定不是变量**。标准规定结构化绑定引入的**名字不是普通变量**，你不能对它取
`&a` 后期望语义与普通变量完全一致（取到的是成员的地址），也不能单独对 `a` 做
`++a` 之外的重声明。需要真正的独立变量时，老老实实 `auto a = expr.first;`。
（类比仅供参考：可以把它理解成「成员的别名组」，实际机制以标准文本为准。）

## 底层原理：一个隐藏变量加一组别名

所有「怪异」行为都可以从一个两步翻译模型推出来。编译器看到

```cpp
auto [a, b] = expr;
```

时，实际做了两件事：

1. **先造一个隐藏变量 `e`**：按声明里的限定符从 `expr` 初始化（拷贝写法相当于
   `auto e = expr;`，`auto&` 写法则 `e` 是对原对象的引用）；
2. **再把 `a`、`b` 定义为隐藏变量 `e` 各成员的名字**——它们是「指进 `e` 内部的别名」，
   不是独立的存储。

由此可以推出前面所有结论，不需要逐条背：

| 现象 | 从模型推出 |
| --- | --- |
| 拷贝写法下改 `a` 不影响原对象 | `a` 指的是副本 `e` 的成员，原对象根本没被碰 |
| `auto&` 写法下改 `a` 影响原对象 | `e` 本身是原对象的引用，别名指进去就是指原件 |
| `&a` 取到的是成员地址 | 名字是 `e` 的成员，取地址取的就是成员的地址 |
| C++17 不能单独捕获 `a` | 闭包捕获以「变量」为单位，绑定名不是变量；要捕获只能捕获整个对象（C++20 起放开） |
| 数量必须匹配 | `e` 的成员数在编译期确定，别名少了多了都对不上 |

一个能亲眼验证模型的实验：分别用 `auto` 与 `auto&` 绑定同一结构体，打印
`&a` 与 `&obj.px`：

```cpp
struct Point { int px; int py; };

Point pt{10, 20};
auto [a1, b1]   = pt;   // 拷贝：&a1 指向隐藏副本的成员
auto& [a2, b2]  = pt;   // 引用：&a2 == &pt.px
```

运行后对比三组地址：`&a2` 与 `&pt.px` 相同（别名直指原件），`&a1` 与 `&pt.px`
不同（副本另有一份存储）。**地址不会说谎**——这比背规则更能建立直觉。

## 面试题思路：三个高频考法

1. 「`auto [a, b] = pair;` 之后修改 `a`，原 pair 变吗？」——考拷贝绑定的默认语义。
   用隐藏变量模型回答：绑定的是隐藏副本的成员，原对象不变；想改原件写 `auto&`。
2. 「为什么 C++17 的 lambda 不能捕获结构化绑定的名字？」——考「名字不是变量」。
   捕获机制按变量（有自己存储的实体）设计，绑定名是别名组；C++20（P1091）放开
   为可按普通名字捕获，其行为等价于捕获隐藏变量的对应成员。
3. 「结构化绑定和 `std::tie` 的区别？」——考接收方式的选型：绑定**就地创建新名字**
   且必须一次性绑定全部成员；`tie` **复用已有变量**、可用 `std::ignore` 跳过位置，
   但要求变量先存在且绑定的是引用（见 [Tuple 与 Pair](/cpp/300-CppTuplePair) 的
   `tie` 一节）。

## 函数返回值解构

多返回值函数是结构化绑定最经典的用途：

```cpp
#include <tuple>
#include <iostream>

// 商与余数一次返回，避免出参引用
auto divide(int a, int b) -> std::tuple<int, int> {
    return {a / b, a % b};
}

int main() {
    auto [quot, rem] = divide(17, 5);
    std::cout << "17 / 5 = " << quot << " ... " << rem << '\n';
    // 输出：17 / 5 = 3 ... 2
}
```

配对场景：`map::insert` 返回 `pair<iterator, bool>`、`set::emplace` 等都可以立刻解构：

```cpp
auto [it, inserted] = scores.insert({"Carol", 92});
if (inserted) { /* 插入成功，it 指向新元素 */ }
```

## C++20 扩展

### 位域绑定

```cpp
// C++20 允许绑定位域成员（绑定为对应整型的副本/引用语义较特殊，取值为位域值）
struct Flags { unsigned a : 3; unsigned b : 5; };
Flags f{1, 2};
auto [x, y] = f;   // x=1, y=2；x、y 的类型是 unsigned 的位域拷贝
```

### lambda 捕获结构化绑定

```cpp
#include <utility>

std::pair p{1, 2};
auto [a, b] = p;

// C++17：不允许按值/按引用捕获结构化绑定的单个名字（只能整体捕获整个对象，做不到）
// C++20：允许像普通变量一样捕获
auto sum = [=] { return a + b; };   // C++20 起合法，返回 3
```

## 限定符组合速查

```cpp
const auto [a, b] = std::make_pair(1, 2);   // a、b 均为 const 副本
auto&& [c, d] = std::make_pair(1, 2);       // 转发引用绑定临时对象，延长其生命周期
decltype(auto) [e, f] = p;                  // 保留表达式精确值类别（进阶，少用）
```

## 常见陷阱清单

1. **数量不匹配即编译错误**：`std::tuple t{1, 2, 3}; auto [a, b] = t;` 无法编译。
2. **默认拷贝**：循环遍历大对象务必 `const auto&`。
3. **C++17 的 lambda 捕获限制**：需要捕获结构化绑定名字时，确认编译器已按 C++20 编译。
4. **绑定私有成员的结构体不可绑定**：只有全部公有非静态数据成员的结构体才能绑定。
5. **匿名结构体/联合体成员**：绑定联合体时所有名字指向同一存储，写一个就改全部，
   谨慎使用。

## 动手实验

1. **地址对照实验**：照「底层原理」一节的代码建 `Point`，分别用 `auto`、`auto&`、
   `const auto&` 绑定后打印 `&名字` 与 `&pt.px`，验证「别名指副本还是指原件」。
   预期：只有 `auto&` 的地址与原件一致。
2. **循环拷贝测量**：构造 10 万个 `std::pair<std::string, int>` 的 vector，分别用
   `for (auto [k, v] : vec)` 与 `for (const auto& [k, v] : vec)` 遍历求和，`time`
   或 `std::chrono` 计时，观察拷贝绑定的额外开销（string 越长差距越明显）。
3. **lambda 捕获实验**：分别用 C++17 与 C++20 标准编译「捕获结构化绑定名字」的
   lambda，亲眼看一次 C++17 的编译错误；再用「捕获整个对象」的 C++17 兼容写法
   `[p = p]`（p 为原对象）改写并验证可编译。
4. **联合体绑定实验**：对 `union { int i; float f; }` 做结构化绑定，先绑 `i` 赋值
   再读 `f`，结合「所有名字指向同一存储」的规则预测行为后再运行（注意这是位模式
   重解释，仅作机制观察）。

## 小练习（先自己做，再展开参考实现）

**练习 1：多返回值函数改造**。把下面的「出参引用」函数改成返回结构化绑定友好的
形式（返回 pair），调用点用 `auto [ok, maxv]` 接收，并处理「空数组」分支：

```cpp
// 原始版本：出参引用，调用前必须先准备变量
bool find_max(const std::vector<int>& v, int& out);
```

提示：返回 `std::pair<bool, int>`；空数组返回 `{false, 0}`。

参考实现：

```cpp
#include <utility>
#include <vector>

std::pair<bool, int> find_max(const std::vector<int>& v) {
    if (v.empty()) return {false, 0};
    int best = v[0];
    for (int x : v) best = (x > best) ? x : best;
    return {true, best};
}

// 调用点：if-init 与结构化绑定配合，名字只在需要的作用域存在
if (auto&& [ok, value] = find_max(data); ok) {   // C++17 if-init
    use(value);
}
```

两个自检问题：

- 为什么用 `auto&&` 而不是 `auto`？（答：绑定的是 `find_max` 返回的临时对象，
  `auto&&` 延长其生命周期；用 `auto` 会把整个 pair 再拷贝一次。）
- 为什么不返回 `std::optional<int>`？（答：`optional` 表示「0 或 1 个值」，是语义
  更准的答案，但它**不是可结构化绑定类型**——标准只允许数组、tuple-like 对象与
  全公有成员结构体。要用 `optional` 就得回到 `if (auto r = f())` + `*r` 的写法，
  两种方案各有取舍，面试里能说出这条边界就是加分项。）

**练习 2：map 遍历计数器**。用结构化绑定统计 `std::multimap<std::string, int>`
中每个 key 出现的次数，全程不出现 `.first` / `.second`。

提示：`multimap` 遍历时元素类型是 `pair<const Key, T>`；key 相同的元素相邻。

参考实现：

```cpp
#include <map>
#include <string>
#include <iostream>

int main() {
    std::multimap<std::string, int> m{{"a", 1}, {"a", 2}, {"b", 3}};
    std::string prev;
    int count = 0;
    for (const auto& [key, val] : m) {
        if (key != prev) {
            if (count) std::cout << prev << ": " << count << '\n';
            prev = key;
            count = 1;
        } else {
            ++count;
        }
    }
    if (count) std::cout << prev << ": " << count << '\n';
}
```

**挑战题（不给参考实现）**：写一个函数 `stats(const std::vector<double>&)`，一次
遍历同时返回「最小值、最大值、平均值」，要求：返回类型自选（pair/tuple/结构体/optional），
并写两句话说明你的选型理由。写完对照「工程提醒」一节自查：你的返回值超过三个语义
字段了吗？调用点不看文档能看懂每个位置的含义吗？

## 小结

**初学者记住这三点：**

1. `auto [a, b] = obj;` 把对象按位置拆开命名，支持数组、pair/tuple、公有成员结构体；
2. 遍历容器时写 `const auto& [k, v]`——零拷贝又只读；
3. 绑定数量必须和成员数量一致，编译器会替你把关。

**进阶者还需注意：**

- 名字并非真正的独立变量，语言规则（取地址、lambda 捕获、ODR）有特殊之处；
- 泛型代码中用 `auto&&` 绑定可同时接住左值与右值，并延长临时对象生命周期；
- C++26 进一步允许结构化绑定引入参数包（P1061，`auto... [xs] = expr;`），解包不定长
  场景会更灵活。
