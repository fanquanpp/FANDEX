---
order: 650
title: 复制消除与 RVO：按值返回为什么是免费的
description: C++17 强制复制消除的完整心智模型：prvalue 延迟具现、RVO 与 NRVO 的分界、return std::move 的反效果、按值传参与工厂函数设计，附计数实验与面试题思路。
module: 'cpp'
category: 计算机科学
difficulty: advanced
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cpp/090-RvalueReferenceMoveSemantics'
  - 'cpp/100-MoveSemanticsDetailed'
  - 'cpp/610-CppPerformance'
prerequisites:
  - 'cpp/100-MoveSemanticsDetailed'
---

## 前置知识

- 已完成 [移动语义](/cpp/090-RvalueReferenceMoveSemantics) 与 [移动语义深水区](/cpp/100-MoveSemanticsDetailed)：
  知道左值/右值之分、拷贝构造与移动构造的分工；
- 知道 RAII 对象「按值返回」的常见写法（[RAII](/cpp/160-RAIIResourceManagement)）。

## 学习目标

读完本文你将能够：

1. 用「prvalue 延迟具现」模型解释 C++17 起哪些拷贝被**强制**省略，哪些只是**允许**省略；
2. 分清 RVO 与 NRVO 的边界，并说出 NRVO 失效的三种写法；
3. 解释为什么 `return std::move(local)` 是反模式，以及它到底「坏」在哪一步；
4. 在「按值传参 + 移动」与「左右值重载」之间为 API 设计做选型。

预计 60 到 90 分钟。

## 1. 你现在要解决什么问题

一个 RAII 类型的对象动辄持有堆内存，按值返回看起来注定要「构造临时、再拷贝进调用方、
再析构临时」——三次开销。直觉告诉你该返回指针或出参引用来逃避拷贝，于是代码里长满了
`std::unique_ptr<T>` 与出参。事实上现代 C++ 对这条路径的承诺是：**按值返回大对象，通常
零拷贝、零移动，构造直接发生在调用方的存储里**。本文讲清这个承诺的适用边界，让你敢于
按值设计 API。

## 2. 最小可运行示例

```cpp
// compile: g++ -std=c++17 -O2 elision_demo.cpp && ./a.out
#include <iostream>
#include <string>

struct Widget {
    Widget() { std::cout << "ctor\n"; }
    Widget(const Widget&) { std::cout << "copy\n"; }
    Widget(Widget&&) noexcept { std::cout << "move\n"; }
    ~Widget() { std::cout << "dtor\n"; }
};

Widget make() {                 // 返回 prvalue
    return Widget{};            // C++17：直接在调用方存储里构造，不打印 copy/move
}

Widget relay(Widget w) {        // 按值收参：实参是 prvalue 时同样零拷贝
    return w;                   // 具名局部对象：NRVO（允许省略）或隐式移动
}

int main() {
    Widget a = make();          // 预期只打印一次 ctor
    Widget b = relay(std::move(a));
}
```

典型输出（GCC/Clang，-O0 与 -O2 一致——这不是优化开关的恩惠，是语言规则）：

```text
ctor        // a：make 里的 Widget{} 直接构造进 a（强制省略，无 copy/move）
move        // relay 的形参 w：std::move(a) 移入
move        // return w：形参不适用 NRVO，走隐式移动
dtor        // relay 返回后 w 析构
dtor        // main 结束，b 析构
dtor        // main 结束，a 析构（已 moved-from）
```

第一行只出现一次 `ctor`：`make()` 返回的临时对象**从未被构造出来**，`Widget{}`
这个 prvalue 直接在 `a` 的存储里落了地。这就是复制消除（copy elision）。

（细节标注：`return w;` 里 `w` 是**函数形参**——标准把形参与 catch 形参明确排除
在 NRVO 之外，所以这条路径永远是移动而非省略；「具名局部对象才能 NRVO」这条
边界在实验 2 里能亲手验证。）

## 3. 发生了什么：prvalue 延迟具现模型

理解强制省略只需一个心智模型：**C++17 起，prvalue（纯右值）不再是「一个已经存在的
临时对象」，而是「一份构造说明书」**。说明书本身不占内存、不调用构造函数，直到有一
个存储真正需要它时才就地具现（materialize）。

由此可以推出全部规则：

| 场景 | C++17 起 | 模型解释 |
| --- | --- | --- |
| `T x = T(...);` / `return T(...);` | **强制**省略，零拷贝零移动 | 说明书直接在 `x` 的存储里施工 |
| prvalue 按值传参 `f(T(...))` | **强制**省略 | 形参的存储就是施工点 |
| `throw T(...)` / catch 按值接 | **强制**省略 | 异常对象直接构造在 catch 的存储里 |
| `return local;`（具名局部对象，NRVO） | **允许**省略，普遍发生但不保证 | 说明书已施工过一次（local 已存在），编译器试图把两次施工合并成一次 |
| `return cond ? a : b;`（两个具名对象选一） | 不能省略，走移动 | 两个「已施工」对象只能选一个地址，无法合并 |

强制与允许的分界线，就是「源对象是否已经存在」：

- prvalue 从未存在——推迟它的诞生没有任何风险，所以标准强制；
- 具名对象已经存在——「把它当作返回值就地构造」意味着它的地址必须恰为返回槽，
  这与内联程度、调用约定等实现细节纠缠，标准只允许不强制（NRVO）。

**NRVO 失效的典型写法**（此时退化为隐式移动，仍然不差，但不再是零成本）：

```cpp
Widget f() {
    Widget a, b;
    // return cond ? a : b;    // 失效点 1：两个对象二选一
    // return std::move(a);    // 失效点 2：std::move(a) 不是「对象的名字」本身
    // return a_member;        // 失效点 3：返回成员而非局部对象
    return a;                  // 正确姿势：直接返回名字，把 NRVO 的机会留给编译器
}
```

其中失效点 2 是最常见的「好心办坏事」：写的人担心「不 move 会拷贝」，实际上
`return a;` 编译器先试 NRVO（零成本），NRVO 不可行时自动按移动处理（C++11 起的
隐式移动规则，C++23 P2266 进一步放宽）。GCC/Clang 会用
`-Wpessimizing-move` 明确警告 `return std::move(local)`。

## 4. 底层原理：为什么标准敢「强制」

复制消除在 C++17 之前就一直存在，但属于「允许的优化」：标准说「这里本该有一次拷贝，
编译器可以不做」。麻烦在于，拷贝构造函数可能有副作用（打印、计数），省略与不省略
是**可观察行为差异**——所以旧规则要求「类型必须可拷贝/可移动，即使最终被省略」，
`std::atomic` 这类只可构造、不可拷贝的类型永远无法按值返回。

C++17 的做法更彻底：**直接修改语言语义**。prvalue 在需要存储之前只是初始化器，
「构造说明书 → 存储落地」是一次构造，中间根本没有可以观察到的那次拷贝。于是：

- `struct NoCopy { NoCopy() = default; NoCopy(const NoCopy&) = delete; };`
  的工厂函数 `NoCopy make() { return NoCopy{}; }` 在 C++17 合法，C++14 非法；
- `std::make_unique`、`std::optional` 的工厂接口不再被迫返回指针；
- 链式 API（`a | b | c`，见 [Range](/cpp/290-Cpp20Range)）敢按值返回视图对象。

## 5. API 设计应用：按值传参 + 移动 vs 左右值重载

复制消除改变了两类经典接口的成本账：

**工厂函数**：一律按值返回。`Image load(std::string_view path)` 返回的 Image 直接
构造在调用方，不需要 `unique_ptr<Image>` 逃避拷贝，也不需要出参。

**sink 参数**（函数要把实参存下来的场景）两种写法：

```cpp
// 写法 A：按值 + 移动（一个函数通吃左右值）
void set_name(std::string name) { name_ = std::move(name); }
// 调用方传 prvalue（"Tom"）：构造直接落在形参，零拷贝（强制省略）
// 调用方传左值 l：一次拷贝进形参 + 一次移动赋值

// 写法 B：const 左值 + 右值双重载
void set_name(const std::string& s) { name_ = s; }        // 左值：拷贝
void set_name(std::string&& s) { name_ = std::move(s); }  // 右值：移动
```

选型口径：写法 A 代码少、对右值零成本，代价是左值路径多一次移动（相对拷贝通常
便宜）；写法 B 对每个路径都最优，代价是每个 sink 参数写两份。接口参数少、追求
简洁选 A；热点路径上大对象选 B。两者都**优于**只提供 `const T&` + 内部拷贝的
老写法——那条路把右值的移动机会白白扔掉。

## 6. 常见坑

1. **`return std::move(local)`**：不是错误（仍会移动），但阻止 NRVO，`-Wpessimizing-move`
   会点名。唯一合理场景：局部对象在返回后被继续使用、且只该被移动一次的复杂表达式。
2. **用「拷贝构造函数有没有副作用」判断程序行为**：强制省略后，构造次数本身就随
   标准版本与写法变化——计数器断言不能建立在「应该构造几次」的想象上。
3. **NRVO 不是性能契约**：依赖 NRVO 写出「每次都零移动」的断言，换个编译器/内联
   情形就可能多一次移动。保证零成本的只有 prvalue 路径。
4. **返回成员、返回 `*this`、返回条件表达式**都不享受强制省略；给这类路径提速的
   正解是移动语义与接口重设计，不是 `std::move` 满天飞。
5. **异常路径同样省略**：`throw MyError{...}` 构造的异常对象直接落在 catch 端——
   「抛异常一定先构造临时再拷贝」的旧直觉可以退休了（见
   [异常与性能](/cpp/190-ExceptionSecurity)）。

## 7. 面试题思路

1. 「C++17 的 copy elision 和以前的有什么本质区别？」——答：以前是**允许的优化**
   （该有的一次拷贝被跳过，类型仍须可拷贝），C++17 起 prvalue 的拷贝是**语义上不存在**
   （说明书延迟具现，类型可以完全不可拷贝）。能否按值返回 `atomic` 是两版标准最直观
   的分水岭。
2. 「`return std::move(local)` 会怎样？」——按三层答：不错误，隐式移动本来就会发生；
   但它让 NRVO 失效，从「零成本」退到「一次移动」；现代编译器给出
   `-Wpessimizing-move`，工程规范应禁止。
3. 「写一个验证 RVO 发生与否的实验」——顺着本文第 8 节的计数器思路答：拷贝/移动
   构造里 `++counter`，跑工厂函数看计数。能主动给出「强制省略与 NRVO 断言不同」
   的区分，是这道题的满分线。

## 8. 动手实验

1. **计数器实验**：给第 2 节的 `Widget` 加 `static inline int copy_cnt = 0;` 与
   `move_cnt`，在两个构造函数里递增并打印。分别跑：
   - `Widget a = make();`（预期 0 拷贝 0 移动——强制省略）
   - `Widget a = relay(a);` 之类具名对象路径（观察 NRVO 是否发生）；
   - `return std::move(w);` 版 relay（对比移动计数变化）。
2. **不可拷贝类型实验**：写 `NoCopy`（删除拷贝与移动构造），验证 `NoCopy make()
   { return NoCopy{}; }` 在 `-std=c++17` 下编译通过、`-std=c++14` 下报错；
   再写 `NoCopy named() { NoCopy n; return n; }`，确认 NRVO 路径在 C++17 也要求
   可移动——两个实验对照出「强制」与「允许」的分界。
3. **三元表达式实验**：写 `Widget pick(bool c) { Widget a, b; return c ? a : b; }`，
   数一数移动次数；再改成两个工厂函数按条件分别 `return Widget{};`，数一数——
   体会「重构掉具名对象」比「加 std::move」更有效。
4. **sink 参数实验**：实现写法 A 与写法 B 两个 `set_name`，分别用右值字面量、
   左值 string、`std::move` 过的左值三种实参调用，用计数器记录各路径的拷贝/移动
   次数，把结果填成一张表。

## 9. 小练习（先自己做，再展开参考实现）

**练习 1：修掉悲观移动**。下面的代码编译有 `-Wpessimizing-move` 警告，改写让
路径 1 达到零构造拷贝、路径 2 至少是移动：

```cpp
Buffer build(bool use_fast) {
    Buffer tmp;
    if (use_fast) {
        Buffer fast;
        // ... 填充 fast ...
        return std::move(fast);   // 警告在这里
    }
    return std::move(tmp);        // 警告在这里
}
```

提示：直接返回名字；对三元二选一的场景想想怎么重构。

参考实现：

```cpp
Buffer build(bool use_fast) {
    if (use_fast) {
        Buffer fast;
        // ... 填充 fast ...
        return fast;              // 具名对象：NRVO 或隐式移动，二选一自动发生
    }
    Buffer tmp;
    return tmp;                   // 同上；提前 return 让每个名字只属于一条路径
}
```

自检问题：如果两条路径必须共用同一个 `Buffer` 变量、最后统一返回呢？（答：
`return use_fast ? std::move(a) : std::move(b);` 这类「失效点 1」无法 NRVO，
此时显式 `std::move` 是**正确**的——悲观移动规则针对的是「直接返回名字」的场景，
不是让你无脑删 move。）

**练习 2：计数分配器工厂**。写 `struct Stats { static inline int copy, move; };` 与一个
持有 1MB 内存的 `BigBuffer`，实现 `BigBuffer make_big()` 并在 main 里验证：
`auto b = make_big();` 之后 `Stats::copy == 0 && Stats::move == 0`。再写一层转发函数
`BigBuffer wrap() { return make_big(); }`，验证「返回另一个函数的 prvalue 返回值」
同样零成本（说明书一路传递）。

参考实现：

```cpp
#include <algorithm>
#include <iostream>
#include <memory>

struct BigBuffer {
    static inline int copy = 0, move = 0;
    std::unique_ptr<char[]> data;
    explicit BigBuffer() : data(std::make_unique<char[]>(1 << 20)) {
        std::cout << "ctor\n";
    }
    BigBuffer(const BigBuffer& o) : data(std::make_unique<char[]>(1 << 20)) {
        std::copy_n(o.data.get(), 1 << 20, data.get());
        ++copy;                      // 真拷贝 1MB + 计数
    }
    BigBuffer(BigBuffer&& o) noexcept : data(std::move(o.data)) { ++move; }
};

BigBuffer make_big() { return BigBuffer{}; }
BigBuffer wrap()      { return make_big(); }   // prvalue 一路传递，仍不落地

int main() {
    auto b = wrap();
    std::cout << "copy=" << BigBuffer::copy << " move=" << BigBuffer::move << '\n';
    // 预期：ctor 打印 1 次，copy=0 move=0
}
```

**挑战题（不给参考实现）**：为第 5 节的 sink 参数写法 A 与写法 B 各写一组基准
（string 长度 16 与 4096 两组），在 -O2 下各跑百万次赋值，得出「左值路径移动与拷贝
的实测差距」，并写三句话结论：你的项目里该选哪种写法、为什么。写完自查：基准里
有没有不小心让编译器把整条调用链消除掉（用 `volatile` 或打印阻止死代码消除）？

## 10. 与之前和之后的知识的关系

- 往前：[右值引用与移动语义](/cpp/090-RvalueReferenceMoveSemantics) 定义了「移动」
  这个动作，本文回答「什么时候连移动都不需要」；[Lambda 捕获深水区](/cpp/070-LambdaCaptureDetailed)
  的初始化捕获 `std::move` 进闭包，是同一套「少拷贝」思想的语法面；
- 往后：[性能优化](/cpp/610-CppPerformance) 的「先测量后优化」纪律适用于本文所有
  实验；[C++23 新特性](/cpp/730-Cpp23NewFeatures) 的 `std::expected`、
  `std::generator` 等按值返回的库类型，都以强制省略为前提才敢这样设计；
- 更远：函数式风格的「返回新对象而不是原地改」在 C++ 里之所以可行，靠的正是
  按值返回近乎免费。

## 11. 官方文档

- cppreference copy elision：https://en.cppreference.com/w/cpp/language/copy_elision
- `return` 语句与隐式移动：https://en.cppreference.com/w/cpp/language/return

## 12. 自我检查

- 能用「prvalue 是构造说明书」模型推出强制省略的三类场景；
- 能分清 RVO/NRVO 并列出 NRVO 的三个失效点；
- 能解释 `return std::move(local)` 的问题层次（不错误、但次优、且有警告）；
- 能为 sink 参数在「按值 + 移动」与「双重载」之间给出选型理由。

## 本章总结

C++17 把「按值返回临时对象」从优化升级为语义：prvalue 延迟具现，构造直接发生在
调用方的存储里——工厂函数从此不必逃进指针。具名对象的 NRVO 仍是允许而非保证，
「直接返回名字」是把机会留给编译器的唯一姿势；`return std::move(local)` 挡住的
不是拷贝，而是省略。写 API 时先想「这个值能不能按值出去」，再想「这个参数要不要
按值进来」。

## 下一步

进入 [未定义行为全景](/cpp/635-CppUndefinedBehavior)：性能优化的另一半前提是
「程序没有未定义行为」——编译器所有激进变换都建立在这张契约之上。
