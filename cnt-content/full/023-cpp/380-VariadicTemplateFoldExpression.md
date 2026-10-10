---
order: 400
title: 折叠表达式：把参数包递归压缩成一行
module: 'cpp'
category: 计算机科学
difficulty: advanced
description: 承接变参模板的深水区篇：四种折叠形态各配可运行实验（一元左右折叠用减法看到方向差异、二元折叠救空包）、逗号折叠遍历包与流插入折叠、make_tuple 与完美转发两类包展开模式，附空包一元折叠与移位误当输出的调试实录，预告 C++26 包下标。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cpp/370-VariadicTemplate'
  - 'cpp/110-PerfectForwardingReferenceCollapse'
  - 'cpp/350-TypeTraitsSFINAE'
  - 'cpp/330-CppTemplate'
prerequisites:
  - 'cpp/370-VariadicTemplate'
---

## 前置知识

- 已完成 [变参模板](/cpp/370-VariadicTemplate)：写过「递归版 + 终止版」两段式 log，知道参数包、包展开与 `sizeof...`。

> 分工说明：370 用两段式递归建立了参数包的心智模型，本篇只解决一个问题——C++17 折叠表达式如何把那套递归压缩成一行表达式。参数包的语法与终止函数不再重复，缺课先回 370。

## 学习目标

读完本文你将能够：

1. 写出并区分四种折叠形态，说清 `...` 的位置如何决定折叠方向；
2. 用减法实验判断一个运算符该左折叠还是右折叠，并解释流插入为什么必须左折叠；
3. 用二元折叠给空包提供初值，说出一元折叠对空包仅有的三个合法运算符；
4. 用逗号折叠遍历参数包，并在转发调用里正确展开 `std::forward<Args>(args)...`。

预计 45 到 60 分钟。

## 1. 你现在要解决什么问题

370 篇对参数包求和要写两个函数，参数每多一种类型组合就多实例化一层，报错也顺着递归链条拉长。折叠表达式（C++17）把「对整袋参数做一个二元运算」压成一行，编译器一次实例化完成。但一行有**四种写法**：方向不同、空包行为不同、选错方向会静默算错。本篇逐个实验，让你每种都亲手见过一次。

## 2. 实验一：一元折叠，用减法看方向

```cpp
#include <iostream>

template<typename... Args>
auto subRight(Args... args) { return (args - ...); }   // 一元右折叠
template<typename... Args>
auto subLeft(Args... args)  { return (... - args); }   // 一元左折叠

int main() {
    std::cout << subRight(10, 3, 2) << '\n';
    std::cout << subLeft(10, 3, 2) << '\n';
}
```

预期输出：

```text
9
5
```

右折叠从最右侧开始结合：`10 - (3 - 2) = 9`；左折叠从最左侧结合：`(10 - 3) - 2 = 5`。记忆法：**看 `...` 写在哪边**——`(args - ...)` 里省略号在包的右边，就是右折叠。对满足结合律的 `+` 与 `*`，两种方向结果相同；对 `-`、`/`、`<<` 这类不满足结合律的运算符，方向就是语义，选错即错。

## 3. 实验二：二元折叠，空包的救生圈

```cpp
#include <iostream>

template<typename... Args>
auto sum(Args... args)     { return (args + ... + 0); }  // 二元右折叠，初值 0
template<typename... Args>
auto product(Args... args) { return (1 * ... * args); }  // 二元左折叠，初值 1

int main() {
    std::cout << sum(1, 2, 3) << '\n';
    std::cout << sum() << '\n';
    std::cout << product(2, 5) << '\n';
    std::cout << product() << '\n';
}
```

预期输出：

```text
6
0
10
1
```

四种形态里另两种就是带初值的版本：`(pack op ... op init)` 与 `(init op ... op pack)`。空包时二元折叠直接返回 init——这就是它作为「救生圈」的意义。一元折叠对空包只有三个运算符有定义：`&&` 得 `true`（空集全真）、`||` 得 `false`、逗号得 `void()`；其余运算符遇空包直接编译错误，实录见第 7 节。

## 4. 逗号折叠：遍历包的主力

求和是「收拢成一个值」，更常见的需求是「对每个参数做一件事」，工具是逗号折叠：

```cpp
#include <iostream>

template<typename... Args>
void printLine(Args... args) {
    ((std::cout << args << ' '), ...);   // 逗号折叠：从左到右逐个执行
    std::cout << '\n';
}

int main() {
    printLine(1, "two", 3.5);
}
```

预期输出：

```text
1 two 3.5
```

它展开成 `(输出a1), (输出a2), (输出a3)` 这样一串逗号表达式，逗号运算符保证从左到右求值——所以副作用顺序稳定，不怕折叠方向。若输出本身就是链式（`cout << a << b` 从左往右结合），还可以写成更短的二元左折叠 `(std::cout << ... << args)`，这是专为流插入准备的惯用法。

## 5. 包展开的两个常见模式

模式一：把整袋参数原样装进容器或 tuple——`...` 直接跟在包名后面：

```cpp
#include <tuple>
#include <string>

template<typename... Args>
auto packTuple(Args... args) {
    return std::make_tuple(args...);    // 拆袋：make_tuple(1, 2.5, "three")
}
```

模式二：完美转发调用——参数包声明成 `Args&&... args`（万能引用包），转发时 `std::forward<Args>(args)...` 两个包同步展开，每个参数按原始左值/右值属性递给下一层（引用折叠的规则在 110 篇）：

```cpp
#include <iostream>
#include <utility>

template<typename F, typename... Args>
auto invokeLogged(F&& f, Args&&... args) {
    std::cout << "call with " << sizeof...(args) << " args: ";
    return std::forward<F>(f)(std::forward<Args>(args)...);
}

int main() {
    auto t = packTuple(1, 2.5, std::string("three"));
    std::cout << std::get<0>(t) << ' ' << std::get<2>(t) << '\n';
    std::cout << invokeLogged([](int a, int b) { return a * b; }, 6, 7) << '\n';
}
```

预期输出：

```text
1 three
call with 2 args: 42
```

漏写 `std::forward` 参数不会报错，但全部退化成左值——右值参数白白多一次拷贝，这类静默劣化是转发包最常见的坑。

## 6. C++26 一句话预告

包下标（pack indexing，P2662）已进入 C++26 草案：`args...[0]` 可以直接取包中第 0 个元素，不必再靠「递归剥第一层」来拿头部。写法与编译器支持仍在演进，细节以 cppreference 为准，这里先混个眼熟。

## 7. 常见错误与调试实录

实录一：空包撞上一元折叠。把 `sum` 写成 `(args + ...)` 后调用 `sum()`，编译失败，GCC 报错（节选）：

```text
error: fold of empty expansion over unary operator '+'
```

读报错三步：报错指向 `return` 那一行的折叠表达式；运算符是 `+`；结论——`+` 不在空包白名单里，改二元折叠 `(args + ... + 0)`。顺带记住白名单：`&&`、`||`、逗号。

实录二：方向选错，编译通过但静默算错。想「把参数依次移进输出流」，结果把折叠方向写反：

```cpp
template<typename... Args>
auto brokenPrint(Args... args) { return (args << ...); }  // 编译通过！

// brokenPrint(1, 2, 3) 返回 1 << (2 << 3)，即 1 << 16 = 65536
```

没有任何报错——因为 `int << int` 是合法的移位运算，编译器只会老老实实替你移位，输出 `65536` 而不是打印参数。这类「合法但错误」比编译失败危险得多：修正方式是让流对象站左边、用左折叠 `(std::cout << ... << args)`，并且养成习惯——写完折叠先跑一个三参数的最小调用核对数值。

## 8. 修改实验

1. 把 `printLine` 改成带编号输出（`1: 10`、`2: 20`……），需要在展开里同时用到包和下标——提示：配合 `std::index_sequence`（先混个眼熟，元编程专题展开）；
2. 写 `allOf(...)` 与 `anyOf(...)`：分别用 `(... && args)` 与 `(... || args)`，先预测空包返回值（回忆白名单）再运行验证；
3. 故意给 `sum(1, "two")` 编译一次，对比 370 递归版与折叠版的报错行数——折叠版的报错只有一处，不再沿递归链条铺开。

## 9. 实际场景

- **约束检查**：`static_assert((std::is_arithmetic_v<Args> && ...), "...")` 一行断言所有参数都是算术类型（SFINAE 与 concepts 是它的进阶形态）；
- **日志与打印**：逗号折叠遍历包输出；
- **事件分发**：把一串校验谓词 `&&` 起来，一票否决；
- **资源合并**：位标志合并 `(flags | ...)`、哈希种子合并。

何时不该用：运算逻辑塞不进单个二元运算符时（比如既要比较又要更新状态），别硬折——老老实实递归或写普通循环。

## 10. 小练习

预测题（预计 5 分钟，先写答案再运行）：

```cpp
template<typename... Args>
auto weird(Args... args) { return (args - ... + 0); }   // 二元右折叠

// weird(10, 3, 2) 的返回值是多少？
```

挑战题（预计半小时，脱离示例实现）：写 `template<typename... Preds> bool allPass(Preds&&... preds)`，接收任意个可调用对象，全部返回真才返回真，要求空参调用返回 `true`，且某个谓词返回 `false` 后不再调用后续谓词。验收：`allPass([]{return true;}, []{return false;}, []{return std::abort(), true;})` 不崩溃且结果为 `false`。
提示（一级）：`&&` 折叠自带短路求值。展开（二级）：`(std::forward<Preds>(preds)() && ...)`。

## 11. 与之前和之后的知识的关系

- 往前：370 的参数包是折叠表达式的操作对象，两篇合成变参模板的完整闭环；
- 往后：类型萃取（350）用 `&&`/`||` 折叠做编译期约束，concepts（410）把它包装成可读的概念名；
- 更远：模板元编程（390）里，折叠表达式正在逐步取代 `index_sequence` 套路的很大一部分样板。

## 12. 官方文档

- cppreference 折叠表达式：https://en.cppreference.com/w/cpp/language/fold
- cppreference 参数包展开：https://en.cppreference.com/w/cpp/language/parameter_pack
- C++26 包下标提案（进度以 cppreference 编译器支持页为准）：https://wg21.link/p2662

## 13. 自我检查

- 能默写四种折叠形态，并用「省略号在包的哪边」判断折叠方向；
- 能说出空包在 `&&`、`||`、逗号下的一元折叠结果，以及其他运算符为什么必须用二元折叠；
- 能解释 `(args << ...)` 为什么能编译却算错，以及流插入的惯用写法；
- 能在转发调用里写出 `std::forward<Args>(args)...` 并说漏写 forward 的后果。

## 本章总结

折叠表达式是参数包的一元与二元运算压缩器：`...` 的位置定方向，初值定空包行为。减法实验记住方向差异，空包白名单（`&&`、`||`、逗号）记住何时必须给初值；逗号折叠负责「逐个做事」，`std::forward<Args>(args)...` 负责原样转发。它把 370 的两段式递归压成一行，报错也从递归链条缩短为单点。至此变参模板主线的三件套——参数包、递归展开、折叠表达式——你已全部上手。

## 下一步

进入 [模板元编程](/cpp/390-TemplateMetaprogramming)：把参数包与折叠表达式当编译期语言，写出在构建阶段就完成的计算。
