---
order: 350
title: 变参模板：一个函数吃下任意个数、任意类型的参数
module: 'cpp'
category: 计算机科学
difficulty: advanced
description: 以「printf 类型不安全、想要一个能收任意个任意类型参数的日志函数」引入，讲透模板参数包与函数参数包的声明、递归展开加终止函数的两段式写法、sizeof... 的编译期计数，回收完美转发解释 emplace_back 为什么离不开参数包，附「缺终止函数」的真实编译报错调试实录。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'cpp/380-VariadicTemplateFoldExpression'
  - 'cpp/110-PerfectForwardingReferenceCollapse'
  - 'cpp/330-CppTemplate'
  - 'cpp/300-CppTuplePair'
prerequisites:
  - 'cpp/110-PerfectForwardingReferenceCollapse'
---

## 前置知识

- 已完成 [完美转发与引用折叠](/cpp/110-PerfectForwardingReferenceCollapse)：知道 `T&&` 万能引用能同时接左值右值、`std::forward` 负责原样递参数——本文第 5 节会回收这条线；
- 会写最基本的函数模板 `template<typename T> T f(T x)` 就够了。没系统学过模板也能读：用到的推导规则本文会当场一句话讲清，全貌在 [C++ 模板](/cpp/330-CppTemplate)，不强制先学。

## 学习目标

读完本文你将能够：

1. 用「模板参数包 + 函数参数包 + 递归终止函数」写出接受任意个数、任意类型参数的函数；
2. 用 `sizeof...(args)` 在编译期数清参数个数，并说出它为什么不能当运行时变量用；
3. 解释 `emplace_back`、`std::make_unique` 的签名里为什么必须有参数包和完美转发；
4. 看到 `no matching function for call to 'log()'` 这类报错时，能定位到「终止函数缺失」而不是去查参数类型。

预计 45 到 60 分钟。

## 1. 你现在要解决什么问题

写日志函数，第一反应是 printf：

```cpp
printf("%s 登录，等级 %d\n", name, level);
```

问题在 `%d` 与实参类型之间没有任何编译期检查：把 `level` 写成 `double`，`-Wformat` 多半给条警告，但那只是提示——传错类型后运行读到的是垃圾值，属于未定义行为（UB 概念见 [030 篇](/cpp/030-CppBasicSyntax)）。你想要的是这样的调用：

```cpp
log("user ", name, " login at level ", level);
```

不写格式串、个数随意、类型自动匹配。重载一百个版本？参数是任意类型的任意组合，重载枚举不完。C++11 给出的答案叫**变参模板**：声明一个「参数包」，让编译器替你生成能装下任意个数参数的函数。

## 2. 最小可运行示例：两段式 log

```cpp
#include <iostream>

void log() {                          // 第一段：递归终止函数（普通函数）
    std::cout << '\n';                // 参数耗尽时走到这里，收尾换行
}

template<typename T, typename... Rest> // typename... 声明「模板参数包」
void log(T first, Rest... rest) {      // Rest... 是「函数参数包」
    std::cout << first << ' ';
    log(rest...);                     // 展开：把剩下的参数原样递给下一层
}

int main() {
    log(1, 2.5, "three", '4');
    log("only");
    log(0.1, 0.2);
}
```

预期输出：

```text
1 2.5 three 4
only
0.1 0.2
```

以 `log(1, 2.5, "three", '4')` 为例，编译器做的事是「剥洋葱」：先实例化 `log(int, double, const char*, char)`，输出 `1` 后调用 `log(2.5, "three", '4')`；再实例化少一个参数的版本；一路剥到零参数时，普通函数 `log()` 接住，递归终止。**这套「递归版 + 终止版」就是 C++11 时代处理参数包的标准两段式**。

## 3. 发生了什么：参数包是编译期的一袋参数

- `typename... Rest` 声明**模板参数包**：一袋类型，袋子可以为空；
- `Rest... rest` 声明**函数参数包**：一袋值；
- 调用 `log(1, 2.5, "three")` 时推导出 `T = int`、`Rest = {double, const char*, char}`；
- `rest...` 里的 `...` 是**展开**：把袋子拆成逗号分隔的列表，填回 `...` 所在的位置。

`...` 前面的写法叫「模式」——`f(rest)...` 会对袋中每个元素做一次 `f`，`std::pair<Ts, Ts>...` 会按元素两两配对。模式展开的花样是下一篇 [折叠表达式](/cpp/380-VariadicTemplateFoldExpression) 的主场，本篇先把「递归剥洋葱」这一种用熟。

一条硬规则：**函数参数包必须是参数列表的最后一个**。编译器要能明确切出「第一个参数」和「剩下的全部」，包后面再跟一个无法从位置推断的参数，推导就不唯一，直接编译失败。

## 4. sizeof...：编译期数数

```cpp
#include <cstddef>

template<typename... Args>
constexpr std::size_t count(Args... args) {
    return sizeof...(args);           // 注意是 sizeof...，不是 sizeof
}

static_assert(count() == 0);
static_assert(count(1, "a", 3.0) == 3);
```

`sizeof...(args)` 返回包中元素的个数，类型 `std::size_t`，**编译期常量**：参数包一旦确定，个数就写死在这一份实例里。因此你不能拿它在运行时当变量递减、放进 `while` 条件——它在运行时根本不是变量。想在编译期按个数分派，用 `if constexpr (sizeof...(args) > 0)`。

## 5. 为什么标准库到处是它：emplace_back

回收 110 篇的完美转发。往容器里放元素时，`push_back` 只收一个现成对象；而 `emplace_back` 想把构造参数直接递给元素的构造函数——构造函数长什么样、收几个参数，容器作者写容器时根本不知道，只能靠参数包：

```cpp
std::vector<std::string> v;
v.emplace_back(5, 'x');   // 参数包 (5, 'x') 原样转发给 string(5, 'x')，原地构造
```

它的签名形如 `template<typename... Args> reference emplace_back(Args&&... args)`，内部用 `std::forward<Args>(args)...` 把每个参数按原始的左值/右值属性递下去——正是 110 篇讲的 `Args&&` 万能引用加 `std::forward` 的组合。`std::make_unique<T>(args...)`、`std::thread t(f, a, b, c)` 全是同一套配方。没有参数包，这些接口就只能给每种构造方式写死一个重载，重载枚举不完的那部分功能直接不存在。

## 6. 修改实验

1. 给 log 加间隔逻辑：只在参数之间输出 `", "`、行尾不带分隔符（提示：递归函数里 `if constexpr (sizeof...(rest) > 0)` 时才补分隔符）。验收：`log(1, 2, 3)` 输出 `1, 2, 3`；
2. 把 `log()` 的空终止函数删掉再编译，先预测报错内容，再对照第 7 节的实录；
3. 喂一个自定义类型（只要支持 `operator<<`）进 log，验证「任意类型」不是口号；再故意传一个不支持 `<<` 的结构体，看报错从「参数个数」变成「没有匹配的 operator<<」。

## 7. 常见错误与调试实录

实录一：删掉终止函数（或根本不知道要写它）。编译失败，GCC 关键报错行（节选，文件名行号依项目而异）：

```text
error: no matching function for call to 'log()'
note: candidate: 'template<class T, class ... Rest> void log(T, Rest ...)'
note:   template argument deduction/substitution failed:
note:   couldn't deduce template parameter 'T'
```

按读报错三步走：第一，看最上面——`log()` 是**零参数**调用；第二，看候选——编译器手里唯一候选要求至少一个 `T`，空袋子没人接；第三，下结论——缺零参数重载，补上 `void log() {}` 即可。注意这是**编译期**错误：变参模板把「个数对不对、类型接得住吗」的检查全部前移到编译期，这正是它比 printf 安全的根本原因。

实录二：把包名当普通变量用：

```cpp
std::cout << rest;    // 想一次输出整袋参数
```

GCC 报错（节选）：

```text
error: parameter pack 'rest' not expanded with '...'
```

袋子不能整袋倒出来，任何使用都必须带 `...` 展开。这条报错几乎总是意味着你漏写了 `...`。

## 8. 实际场景

- **工厂与智能指针**：`std::make_unique<T>(args...)` 把构造参数转发给 T；
- **容器原地构造**：`emplace_back` / `emplace` / `emplace_hint` 全家；
- **事件系统**：信号槽的 `connect` 收任意签名的回调；
- **线程启动**：`std::thread t(f, a, b, c)` 内部就是参数包加转发（430 篇你会亲手用它）。

何时不该用：参数类型和个数其实固定时，普通重载或 `std::vector` 更直白；变参模板的代价是编译时间与模板报错的可读性，不为炫技上它。

## 9. 小练习

预测题（预计 5 分钟，先写答案再运行）：

```cpp
template<typename T, typename... Rest>
void f(T first, Rest... rest) {
    std::cout << sizeof...(rest) << ' ';
    f(rest...);
}
void f() { std::cout << 0 << '\n'; }

// 调用：f(10, 20, 30);
```

修改题（预计 15 分钟）：给 log 的递归函数加一个 `std::ostream& out` 首参数，让 `log(std::cout, ...)` 与 `log(file, ...)` 都能用——体会「包前面还可以再挂普通参数」。

修 Bug 题（预计 15 分钟）：下面的代码编译失败，按读报错三步定位并修复：

```cpp
template<typename T, typename... Rest>
void println(T first, Rest... rest) {
    std::cout << first << '\n';
    println(rest...);
}

int main() { println("a", "b"); }
```

报错原文（GCC 节选）：`error: no matching function for call to 'println()'`、`couldn't deduce template parameter 'T'`——`println("b")` 输出 `b` 后递归到 `println()`，没人接住空袋子。

## 10. 与之前和之后的知识的关系

- 往前：110 的完美转发是本篇的传动轴，第 5 节直接回收；330 的模板推导规则在这里原样适用；
- 往后：[折叠表达式](/cpp/380-VariadicTemplateFoldExpression)（C++17）把本篇的两段式递归压缩成一行——比如对参数包求和不必再写终止函数；
- 更远：tuple/pair（300 篇）、`std::thread`（430 篇）、`std::format` 的内部全是参数包的用户，读标准库签名时你会反复遇到 `Args&&...`。

## 11. 官方文档

- cppreference 参数包：https://en.cppreference.com/w/cpp/language/parameter_pack
- cppreference sizeof...：https://en.cppreference.com/w/cpp/language/sizeof...
- cppreference emplace_back：https://en.cppreference.com/w/cpp/container/vector/emplace_back

## 12. 自我检查

- 能不看书写出「递归版 + 终止版」两段式 log，并说清每层递归剥掉了什么；
- 能区分模板参数包、函数参数包、包展开三个名字各指什么；
- 能说出 `sizeof...(args)` 与 `sizeof(args)` 的区别（前者数个数且是编译期常量，后者对包本身无意义）；
- 看到 `no matching function for call to 'f()'` 时能条件反射想到终止函数。

## 本章总结

参数包让一个模板接受任意个数、任意类型的参数：`typename...` 声明袋子，`...` 展开袋子，递归加终止函数是 C++11 时代的标准消费方式，`sizeof...` 在编译期数个数。它最大的价值是把 printf 式的运行时未定义行为前移成编译期错误；标准库的 `emplace_back`、`make_unique`、`std::thread` 全靠「参数包 + 完美转发」这对搭档工作。递归两段式能干活但啰嗦——下一篇的折叠表达式一行顶两段。

## 下一步

进入 [折叠表达式](/cpp/380-VariadicTemplateFoldExpression)：四种折叠形态、空包的救生圈、以及把递归展开压缩成一行表达式的全部写法。
