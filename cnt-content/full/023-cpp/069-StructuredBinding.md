---
order: 690
title: C++ 结构化绑定语法速查手册
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: C++ 结构化绑定（C++17）速查与教学：数组/pair/tuple/结构体解包、值类别与引用绑定、范围 for 解构、C++20 扩展与常见陷阱。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'cpp/071-CppTuplePair'
  - 'cpp/011-Cpp20Range'
  - 'cpp/072-CppVariantOptionalAny'
  - 'cpp/005-CppReferenceTypes'
prerequisites:
  - 'cpp/003-CppBasicSyntax'
---

## 学习目标

- 会用结构化绑定解包数组、`std::pair`/`std::tuple`、结构体三种对象
- 分清拷贝绑定、`auto&`、`const auto&`、`auto&&` 四种绑定的值类别与代价
- 知道最常见的三个坑：绑定的是副本、lambda 捕获限制（C++17/C++20 差异）、绑定数量必须匹配

## 前置知识

- 变量声明与引用基础：[引用类型](/cpp/005-CppReferenceTypes)
- `std::pair`/`std::tuple` 的基本形态：[Tuple 与 Pair](/cpp/071-CppTuplePair)

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

## 小结

**初学者记住这三点：**

1. `auto [a, b] = obj;` 把对象按位置拆开命名，支持数组、pair/tuple、公有成员结构体；
2. 遍历容器时写 `const auto& [k, v]`——零拷贝又只读；
3. 绑定数量必须和成员数量一致，编译器会替你把关。

**进阶者还需注意：**

- 名字并非真正的独立变量，语言规则（取地址、lambda 捕获、ODR）有特殊之处；
- 泛型代码中用 `auto&&` 绑定可同时接住左值与右值，并延长临时对象生命周期；
- C++26 草案进一步允许结构化绑定引入参数包（P2686），解包不定长场景会更灵活。
