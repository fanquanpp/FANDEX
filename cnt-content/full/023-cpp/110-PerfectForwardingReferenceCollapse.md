---
order: 140
title: 完美转发与引用折叠：包装函数如何原样递参数
module: 'cpp'
category: 计算机科学
difficulty: advanced
description: 承接移动语义的收官篇：万能引用 T&& 的两种形态、引用折叠规则表与 static_assert 验证实验、std::forward 与裸 std::move 的事故对照、emplace_back 与 push_back 的真实差异实验，附 forward 漏写的拷贝退化调试实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'cpp/100-MoveSemanticsDetailed'
  - 'cpp/090-RvalueReferenceMoveSemantics'
  - 'cpp/370-VariadicTemplate'
  - 'cpp/330-CppTemplate'
  - 'cpp/350-TypeTraitsSFINAE'
  - 'cpp/240-CppSTLContainersIterators'
prerequisites:
  - 'cpp/100-MoveSemanticsDetailed'
---

## 前置知识

- 已完成 [移动语义深水区](/cpp/100-MoveSemanticsDetailed)：知道移动构造/移动赋值怎么写、std::move 是零开销的标签；
- 会写最简单的函数模板 `template<typename T> T f(T x)`。没系统学过模板也行，本文用到的地方都会现讲，全貌见 [C++ 模板](/cpp/330-CppTemplate)。

> 分工说明：090 建立了移动语义的心智模型，100 拆开了移动构造与移动赋值的机制；本篇是收官的承接专题，只解决一个问题——包装函数如何把参数「原样」递给下一层：万能引用、引用折叠、std::forward，最后用 emplace_back 的对比实验落回日常代码。移动语义本体不再重复，缺课先回前两篇。

## 学习目标

读完本文你将能够：

1. 判断一段代码里的 `T&&` 是万能引用还是右值引用，并预测它能不能接住左值；
2. 背出引用折叠四行规则，并用 static_assert 把它写成编译期测试；
3. 解释 std::forward 与裸 std::move 在包装函数里的行为差异，以及用错时调用方会遭遇什么；
4. 说清 emplace_back 省掉的到底是哪一步，什么时候与 push_back(std::move(...)) 等价；
5. 识别「漏写 forward」导致的拷贝退化（静默）与「漏写 T」的编译错误（报错）。

预计 60 到 75 分钟，包含 3 组修改实验与 2 道练习。

## 1. 问题引入：给函数套一层「壳」，参数变了味

给存储模块加一个日志壳，每次写入前后打日志：

```cpp
#include <iostream>
#include <string>
#include <utility>

std::string saved;   // 模拟存储目的地

void store(std::string& data)  { saved = data; std::cout << "拷贝一份存起来\n"; }
void store(std::string&& data) { saved = std::move(data); std::cout << "直接接管，不拷贝\n"; }

// 日志包装器第一版：按值接收
template<typename T>
void with_log(T data) {
    std::cout << "[log] 即将存储\n";
    store(data);
}

int main() {
    std::string save(1000, 'x');
    with_log(std::move(save));   // 明确宣布「可以搬走」
}
```

预期输出：

```text
[log] 即将存储
拷贝一份存起来
```

意外：你在调用处明确给了 `std::move`，store 却走了拷贝。原因 090 篇就埋下了——**有名字的形参永远是左值**。`data` 在 with_log 里有名字，递给 store 时是左值，`store(std::string&&)` 根本没机会被选中。

改成 `const T&` 接收？1000 字节是不拷了，但右值性同样保不住，而且「只收右值」的函数这层壳全都接不住。包装函数真正需要的是：**不拷贝，还把「实参原来是左值还是右值」原样递下去**。这就是完美转发，靠三样东西实现：万能引用、引用折叠、std::forward——接下来逐个拆。

## 2. 万能引用 T&&：同一个符号，两种身份

`T&&` 你在 100 篇见过——移动构造的参数就是它。但同样的两个字符，身份完全取决于 T 是不是「正在被推导的模板参数」：

| 写法 | 身份 | 能接住什么 |
| --- | --- | --- |
| `template<typename T> void f(T&& x)` | 万能引用（转发引用） | 左值、右值、const，全都接 |
| `void f(std::string&& x)` | 右值引用 | 只有右值 |
| 类成员函数里的 `T&&`（T 是类模板参数，已固定） | 右值引用 | 只有右值 |
| `const T&&` | 右值引用（带 const） | 只有右值 |

实验验证（保存为 `forward_test.cpp`）：

```cpp
#include <iostream>
#include <string>
#include <utility>

template<typename T>
void wrap(T&& x) {                 // 万能引用：什么都接
    std::cout << "wrap 接住了参数\n";
}

void take(std::string&& x) {       // 右值引用：只接右值
    std::cout << "take 接住了右值\n";
}

int main() {
    std::string name = "Anna";
    wrap(name);                    // 左值，OK
    wrap(std::move(name));         // 右值，OK
    wrap("temp");                  // 字面量，OK
    take(std::move(name));         // 右值，OK
    take(name);                    // 左值——编译错误
}
```

编译到最后一行，GCC 给出真实报错：

```text
error: cannot bind rvalue reference of type 'std::string&&' to lvalue of type 'std::string'
```

wrap 三种全接，take 拒绝左值——两个符号长得一模一样，行为天差地别。万能引用「什么都接」的原理，是下一节的类型游戏。

## 3. 引用折叠：编译器怎么把「引用的引用」摁平

`wrap(name)` 时发生了什么？C++ 规定：传左值给万能引用，T 就被推导成一个引用类型，比如 `T = std::string&`。于是形参类型 `T&&` 展开成 `std::string& &&`——引用的引用。C++ 不允许这种东西直接写出来，编译器按四行规则把它「摁平」：

| 组合 | 折叠结果 |
| --- | --- |
| `& &` | `&` |
| `& &&` | `&` |
| `&& &` | `&` |
| `&& &&` | `&&` |

口诀：只要出现过一个左值引用（`&`），结果就是左值引用；两个都是右值引用（`&&`），才保持右值引用。所以传左值时 `T = string&`，形参类型折叠成 `string&`，左值接得住；传右值时 `T = string`，形参就是 `string&&`，右值性完好保留。

这套规则可以直接写成编译期测试：

```cpp
#include <iostream>
#include <type_traits>

using L = int&;
using R = int&&;

static_assert(std::is_same_v<L&,  int&>);    // & &   -> &
static_assert(std::is_same_v<L&&, int&>);    // & &&  -> &
static_assert(std::is_same_v<R&,  int&>);    // && &  -> &
static_assert(std::is_same_v<R&&, int&&>);   // && && -> &&

int main() {
    std::cout << "四条折叠规则全部验证通过\n";
}
```

预期输出：

```text
四条折叠规则全部验证通过
```

这是「把规则钉进代码」的写法：将来谁改了别名定义导致折叠行为变化，编译期就炸，不用等运行。

## 4. std::forward：把值类别原样递下去

现在补上最后一块。包装函数体内，形参 x 永远是左值（它有名字）。想按「实参原来的身份」递下去，用 `std::forward<T>(x)`：T 里记录着实参原来的值类别，forward 据此决定保持左值还是转成右值。它的本质也是一次 `static_cast<T&&>`，靠上一节的折叠工作——所以 forward 后面的 `<T>` 必须写，不是装饰。

先看用裸 std::move 的错误版本会闯什么祸，再对照正确版本（store 沿用第 1 节的定义）：

```cpp
template<typename T>
void relay_move(T&& x) { store(std::move(x)); }        // 错版：无脑转右值

template<typename T>
void relay_fwd(T&& x)  { store(std::forward<T>(x)); }  // 对版：按原样转

int main() {
    std::string doc = "report.pdf";

    relay_fwd(doc);                  // 调用方还要用 doc：期望拷贝
    relay_fwd(std::string("tmp"));   // 临时对象：期望接管
    std::cout << "doc 还在：" << doc << "\n";

    relay_move(doc);                 // 事故：只是路过，却被搬空
    std::cout << "doc 变成：[" << doc << "]\n";
}
```

预期输出：

```text
拷贝一份存起来
直接接管，不拷贝
doc 还在：report.pdf
直接接管，不拷贝
doc 变成：[]
```

对照很清楚：`std::forward<T>(x)` 是上一层说了算——实参是左值就保持左值，是右值才转右值，这叫转发；`std::move(x)` 是无脑转右值——调用方只是正常传个参数，资源却被库函数悄悄搬走了，而且不报任何错。

使用规则一句话：**万能引用参数往下递，一律 std::forward\<T\>；只有「我明确要搬走它」才 std::move**。100 篇的移动构造里用 move 是对的——那里不是转发场景，就是要搬。

## 5. emplace_back vs push_back：转发到真实战场

emplace_back 就是完美转发的亲儿子：把参数原样转发给元素的构造函数，直接在容器内存里造对象。省掉的到底是哪一步？造一个会报账的类看清：

```cpp
#include <iostream>
#include <string>
#include <vector>

class Traced {
public:
    Traced(const char* p) : s_(p) { std::cout << "构造\n"; }
    Traced(const Traced& o) : s_(o.s_) { std::cout << "拷贝\n"; }
    Traced(Traced&& o) noexcept : s_(std::move(o.s_)) { std::cout << "移动\n"; }
    Traced& operator=(const Traced&) = default;
    Traced& operator=(Traced&&) noexcept = default;

private:
    std::string s_;
};

int main() {
    std::vector<Traced> v;
    v.reserve(4);                     // 预留容量，排除扩容干扰（100 篇的开关）
    Traced source("save.dat");

    v.push_back(Traced("tmp.dat"));   // 先在别处造临时对象，再搬进容器
    v.emplace_back("tmp2.dat");       // 参数直接转发给构造函数
    v.push_back(source);              // 已有对象还要用：拷贝
    v.push_back(std::move(source));   // 已有对象不要了：移动
}
```

预期输出：

```text
构造            <- source
构造            <- push_back 的临时对象
移动            <- 临时对象搬进容器
构造            <- emplace_back 原地构造
拷贝            <- push_back(source)
移动            <- push_back(std::move(source))
```

差在哪一目了然：`push_back(Traced(...))` 是「先在别处造好，再搬家」；`emplace_back("...")` 是「直接在工地上造」，省掉一次移动。后两行也别读错：对已有对象，`emplace_back(std::move(source))` 与 `push_back(std::move(source))` 等价——真正的区别只在「参数还不是对象」的时候。另外，std::string 短串这类便宜类型受 SSO 影响，差异常被掩盖（见 100 篇第 5 节）；资源越贵，转发省下的越真金白银。

## 6. 修改实验

实验一（5 分钟）：把第 4 节 relay_fwd 里的 `std::forward<T>(x)` 改成裸的 `x`，重跑。第二行会从「直接接管」变成「拷贝一份」——右值性在包装器里丢了，而且没有任何警告。这就是下一节事故一的手感。

实验二（10 分钟）：把第 3 节最后一条断言改成 `static_assert(std::is_same_v<R&&, int&>);` 再编译，你会看到：

```text
error: static assertion failed
```

把四条规则的验证改成你背错的样子，确认编译器真的在守门，再改回来。

实验三（15 分钟）：给第 5 节 main 做对照——注释掉 `push_back(std::move(source))` 那行，换成 `v.emplace_back(std::move(source));`，确认两次运行的打印完全一致。用实验巩固「对已有对象两者等价」。

## 7. 常见错误与调试实录

事故一：漏写 forward，拷贝悄悄回来（静默，最危险）。

```cpp
template<typename T>
void relay(T&& x) {
    store(x);               // 漏了 std::forward<T>
}
```

症状：「直接接管」分支永远走不到；大对象全部走拷贝，性能莫名差一截；没有任何报错。定位三步：

1. 复现：在 store 的两个重载里各加一行打印，确认右值实参也走了左值分支；
2. 检查包装器：形参 x 有名字，在函数体内就是左值——直接递 x 等于永远传左值；
3. 修复：`store(std::forward<T>(x));`。

养成一个条件反射：写了 `T&&` 参数，函数体里第一次用参数前先问自己「我要转发还是搬运」——转发用 forward，搬运用 move。

事故二：漏写模板实参 T（编译错误，反而容易发现）。

```cpp
    store(std::forward(x));   // 漏了 <T>
```

```text
error: no matching function for call to 'forward(std::string&)'
```

原因：forward 靠 T 才知道「原来的值类别」，而 T 无法从实参反推（标准术语叫 non-deduced context）。libstdc++ 的完整报错在主错误下面还跟着 `template argument deduction/substitution failed` 与 `couldn't deduce template parameter '_Tp'` 两行 note；不同编译器措辞不同，共同点是把定位引到 forward 这一行。修复：补上 `<T>`。

## 8. 实际场景

- 工厂函数：std::make_unique 与 std::make_shared 的本体就是「把参数包完美转发给构造函数」，练习二会让你手写一个；
- 容器的 emplace 家族：emplace_back、emplace、try_emplace——全靠万能引用加 forward 实现原地构造；
- 任务包装：把可调用对象和参数一起交给线程池、定时器、协程——参数在好几层函数之间旅行，每一层都得 forward，丢一层就退化一次；
- lambda 边界：把大对象搬进 lambda 用初始化捕获 `[data = std::move(data)]`；lambda 内部 data 又是左值，往外调时同样适用 forward 与 move 的判断。

## 9. 小练习

预测题（10 分钟）：store 的两个重载同第 1 节。先写答案再运行：

```cpp
template<typename T>
void relay(T&& x) { store(std::forward<T>(x)); }

std::string a = "hello";
relay(a);                    // 第一行
relay(std::move(a));         // 第二行：a 之后还能用吗？
relay("temp");               // 第三行：字符串字面量会怎么走？
```

答案（先别偷看）：拷贝一份存起来 / 直接接管，不拷贝——a 进入 moved-from，别再依赖它的内容 / 字面量 `"temp"` 先隐式转换成临时 std::string（右值），走接管分支。第三行是转发路上最常见的隐身转换，下面的挑战题就靠它。

挑战题（半小时，不看答案自己实现）：手写 my_make_unique，复刻 std::make_unique（C++14 起标准库自带，此处为教学重写）：

```cpp
template<typename T, typename... Args>
std::unique_ptr<T> my_make_unique(Args&&... args);
```

验收断言：

```cpp
auto p = my_make_unique<std::string>(10, 'a');
assert(p && *p == "aaaaaaaaaa");

auto q = my_make_unique<std::string>(*p);             // 走拷贝构造
assert(q && *q == "aaaaaaaaaa");

auto r = my_make_unique<std::string>(std::move(*q));  // 走移动构造
assert(r && *r == "aaaaaaaaaa");
```

提示：函数体只有一行——`std::unique_ptr<T>(new T(...))`，括号里是参数包展开加转发。展开：`std::forward<Args>(args)...`，省略号把每个参数都按原样递给 T 的构造函数。参数包的完整玩法见 [可变参数模板](/cpp/370-VariadicTemplate)。

## 10. 与之前和之后的知识的关系

- 往前：万能引用接住右值的能力来自 [移动语义](/cpp/090-RvalueReferenceMoveSemantics)；「包装器里形参是左值」的根源、move 与 forward 的分工，都建立在那篇的模型与 [深水区](/cpp/100-MoveSemanticsDetailed) 的机制上；
- 往后：挑战题里的 `Args&&...` 是参数包，完整展开规则在 [可变参数模板](/cpp/370-VariadicTemplate)；万能引用太贪婪、需要约束（比如别抢走拷贝构造）时，工具在 [SFINAE 与类型萃取](/cpp/350-TypeTraitsSFINAE)；emplace 家族所在的容器世界见 [STL 容器与迭代器](/cpp/240-CppSTLContainersIterators)。

## 11. 官方文档

- std::forward（cppreference）：https://en.cppreference.com/w/cpp/utility/forward （中文：https://zh.cppreference.com/w/cpp/utility/forward ）
- std::move：https://en.cppreference.com/w/cpp/utility/move
- 转发引用的判定规则：https://en.cppreference.com/w/cpp/language/reference

## 12. 自我检查

- 能一眼区分万能引用与右值引用的四种情形（模板推导、具体类型、类成员、const T&&）；
- 能默写折叠四行规则并用 static_assert 落成编译期测试；
- 能解释 forward 为什么必须显式写 T、漏写 T 时报什么错；
- 能描述裸 std::move 在包装器里对调用方的伤害场景，并给出修复；
- 能说清 emplace_back 省掉的是哪一次构造、何时与 push_back(std::move(...)) 等价。

## 本章总结

完美转发 = 万能引用接参数 + 引用折叠保形态 + std::forward 递下去。`T&&` 是不是万能引用，只看 T 是否正在被推导；折叠口诀「见 & 即 &，全 && 才 &&」。包装函数体内的形参永远是左值，所以转发必须显式写 `std::forward<T>`——漏了它，右值静默退化成拷贝；错用裸 std::move，调用方的对象会被悄悄搬空。emplace_back 用同一套机制省掉一次临时对象搬家，且与 push_back(std::move(已有对象)) 等价。至此移动语义三部曲完结：090 的模型、100 的机制、本篇的转发，合起来是现代 C++ 泛型代码的地基。

## 下一步

进入 [可变参数模板](/cpp/370-VariadicTemplate)：本篇挑战题里 `Args&&... args` 的省略号还只是一句提示，下一篇把它讲透——参数包是完美转发在工程里的完整形态。
