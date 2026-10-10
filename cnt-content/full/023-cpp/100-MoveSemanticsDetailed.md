---
order: 130
title: 移动语义深水区：noexcept、moved-from 与容器的真实行为
module: 'cpp'
category: 计算机科学
difficulty: advanced
description: 拆开 090 建立的黑盒：移动构造与移动赋值的完整实现规范、noexcept 如何决定 vector 扩容走移动还是拷贝、moved-from 状态的团队纪律与 std::exchange、STL 容器的移动行为与 SSO，附内存泄漏调试实录。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cpp/090-RvalueReferenceMoveSemantics'
  - 'cpp/110-PerfectForwardingReferenceCollapse'
  - 'cpp/160-RAIIResourceManagement'
  - 'cpp/130-SmartPointerDeepDive'
  - 'cpp/240-CppSTLContainersIterators'
  - 'cpp/610-CppPerformance'
prerequisites:
  - 'cpp/090-RvalueReferenceMoveSemantics'
---

## 前置知识

- 已完成 [移动语义：把资源搬走](/cpp/090-RvalueReferenceMoveSemantics)：亲手写过 Buffer 的移动构造，知道 std::move 是零开销的标签、moved-from 对象可析构可重新赋值；
- 会用 std::vector 与 std::string 的日常操作（push_back、size）。

> 分工说明：090 负责建立移动语义的心智模型；本篇是深水区专题，拆开机制——移动构造与移动赋值怎么写才完整正确、noexcept 为什么是容器扩容的性能开关、moved-from 状态在工程里如何管理。包装函数如何原样递参数是另一个问题，由承接篇 [完美转发与引用折叠](/cpp/110-PerfectForwardingReferenceCollapse) 负责，本篇不越界。

## 学习目标

读完本文你将能够：

1. 按规范写出移动构造与移动赋值：noexcept、抢资源、置空源、自赋值安全、先释放旧资源五条全占，并说出每条违反时的后果；
2. 解释 vector 扩容在移动构造不带 noexcept 时为什么退化为拷贝，并测出量级差异；
3. 为团队定下 moved-from 三条纪律，会用 std::exchange 一行完成「取走并置空」；
4. 说清 std::vector 与 std::string 移动的真实成本，包括 SSO 对短字符串的影响；
5. 用 AddressSanitizer 从泄漏报告定位移动赋值漏释放的事故。

预计 60 到 75 分钟，包含 3 组修改实验与 4 道练习。

## 1. 问题引入：移动语义悄悄失效了

090 篇的 Buffer 移动是 O(1)，很美。把它换成思路相同的 Grid（一块 double 网格）放进 std::vector，故事变了：

```cpp
std::vector<Grid> frames;
frames.reserve(2);
frames.push_back(Grid(1024));
frames.push_back(Grid(1024));
frames.push_back(Grid(1024));   // 容量不足：旧元素要搬进新内存
```

第三行触发扩容，前两个元素必须搬家，搬家用的是哪个构造函数？给 Grid 的拷贝、移动构造各加一行打印再运行（扩容时两行的先后顺序个别标准库实现可能不同，重点看出现了什么）：

预期输出：

```text
移动构造
移动构造
移动构造
拷贝构造
拷贝构造
```

前三行是三次 push_back 把临时对象搬进容器；后两行是扩容搬运——**竟然是拷贝**。090 篇明明说过移动便宜几百倍，编译器为什么在这里挑了贵的？答案不在编译器，在 Grid 自己：它的移动构造少了一个词。这个词就是 `noexcept`。

## 2. 移动构造与移动赋值的完整实现规范

先把 Grid 写完整。持有裸资源（`new[]` 出来的数组）的类，五个特殊成员函数必须成套考虑，这是五法则的领地：

```cpp
// grid.cpp 第一部分：构造、析构、拷贝构造
#include <algorithm>
#include <cstddef>
#include <iostream>
#include <utility>

class Grid {
public:
    explicit Grid(size_t n) : cells_(new double[n] {}), n_(n) {}
    ~Grid() { delete[] cells_; }

    Grid(const Grid& other)                    // 拷贝构造：分配 + 逐元素复制
        : cells_(new double[other.n_]), n_(other.n_) {
        std::copy(other.cells_, other.cells_ + n_, cells_);
        std::cout << "拷贝构造\n";
    }

    size_t size() const { return n_; }

private:
    double* cells_;
    size_t  n_;
};
```

接着补上移动一侧，每行注释是一条规范：

```cpp
    // 移动构造之后接在类里
    Grid(Grid&& other) noexcept                          // 规范 1：标 noexcept
        : cells_(std::exchange(other.cells_, nullptr)),  // 规范 2：抢资源
          n_(std::exchange(other.n_, 0)) {                // 规范 3：源置空
        std::cout << "移动构造\n";
    }

    Grid& operator=(Grid&& other) noexcept {
        if (this != &other) {                 // 规范 4：自赋值安全
            delete[] cells_;                  // 规范 5：先释放自己的旧资源
            cells_ = std::exchange(other.cells_, nullptr);
            n_ = std::exchange(other.n_, 0);
        }
        return *this;
    }

    Grid& operator=(const Grid& other) {      // 拷贝赋值同型：释放旧的、分配、复制
        if (this != &other) {
            delete[] cells_;
            cells_ = new double[other.n_];
            n_ = other.n_;
            std::copy(other.cells_, other.cells_ + n_, cells_);
        }
        return *this;
    }
```

五条规范各自的「违反后果」值得背下来：缺 noexcept，容器扩容静默退化成拷贝（下一节的主角）；没抢资源或没置空源，两个对象析构时对同一块内存 `delete[]` 两次，double-free（090 篇实验二崩过一次）；没防自赋值，`x = std::move(x)` 虽怪但合法，先释放自己再从自己抢就拿不到东西了；移动赋值没先释放旧资源，内存泄漏（第 7 节实录）。

还有一条贯穿性纪律：**自定义移动构造必须逐成员移动**，漏一个成员，那个成员就静默走拷贝——实验二会让你亲眼看到。

两个标配工具。`<utility>` 里的 `std::exchange(a, b)` 一行完成「返回 a 的旧值，同时把 a 改成 b」——移动构造里「取走指针、留个空」的机械写法，比手写两行少一个出错机会。另外，若类带模板构造函数（`template<typename T> Grid(T&& v)`），它可能比拷贝构造更匹配而截胡调用，需要用 std::enable_if（或 C++20 concepts）约束住——机制在 [完美转发与引用折叠](/cpp/110-PerfectForwardingReferenceCollapse) 与 [SFINAE](/cpp/350-TypeTraitsSFINAE) 展开。

## 3. noexcept：vector 扩容的性能开关

第 1 节的谜底：vector 扩容时标准库走的是 `std::move_if_noexcept` 逻辑——只有元素的移动构造**保证不抛异常**，才敢用移动搬运旧元素。为什么这么谨慎？设想扩容搬到一半，第 37 个元素的移动构造抛了异常：已经搬过去 36 个，旧的 36 个还没析构，容器里一半新一半旧，vector「要么成功、要么回到原状」的强异常保证被撕开了。拷贝没这个风险：拷贝构造就算中途抛异常，旧内存原封不动。

所以 noexcept 不是性能提示，是安全承诺：移动不会失败，容器才敢用它优化。验证一下代价——同一份 main，只差 Grid 移动构造上有没有 noexcept：

```cpp
// noexcept_bench.cpp：每帧 8 MB，反复触发扩容
#include <chrono>
#include <iostream>
#include <vector>

// Grid 定义放这里：移动构造带 / 不带 noexcept，各编译一次

int main() {
    std::vector<Grid> frames;
    auto start = std::chrono::steady_clock::now();
    for (int i = 0; i < 64; ++i) {
        frames.push_back(Grid(1024 * 1024));
    }
    auto end = std::chrono::steady_clock::now();
    std::cout << "耗时 "
              << std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count()
              << " 毫秒\n";
}
```

预期输出（数字因机器与标准库而异，量级差是结论）：

```text
移动构造带 noexcept：    耗时 96 毫秒
移动构造不带 noexcept：  耗时 1980 毫秒
```

不带 noexcept 的版本慢 20 倍：64 个 8 MB 的元素在一串扩容里被反复深拷贝，总搬运量接近 1 GB；带 noexcept 的版本只搬指针，几乎归零。把「这个类型能不能安全移动」钉进测试：

```cpp
#include <type_traits>
static_assert(std::is_nothrow_move_constructible_v<Grid>);
```

谁哪天不小心删了 noexcept，编译立刻红——这是移动语义里少有的「能被工具兜住」的错误。

## 4. moved-from 纪律：有效但未指定

090 篇立了约定，这里落到工程。moved-from 对象处于「有效但未指定」（valid but unspecified）状态：析构一定安全、赋新值一定合法，内容不看、不猜、不依赖。团队纪律三条：

1. **move 完尽快收尾**：让变量立即离开作用域，或马上重新赋值。`auto next = std::move(frames); frames.clear();` 里那行 clear 不是修 bug，是把「空了」写成显式意图，读代码的人不用猜；
2. **类作者对 moved-from 全权负责**：你的移动构造必须保证源对象可析构（指针置空）、可重新赋值。漏置空不是「未指定」，是未定义行为；
3. **需要空值语义就显式要**：判断「有没有数据」只对没被 move 过的对象做。标准库类型的 moved-from 常见为空，但那是实现巧合，不是合同。

第 2 节的 std::exchange 正是纪律 2 的机械化：取走旧值与写回新值在同一行，想忘都忘不掉。

## 5. STL 容器的移动行为：vector、string 与 SSO

标准库容器的移动行为值得亲手看一遍：

```cpp
#include <iostream>
#include <string>
#include <utility>
#include <vector>

int main() {
    std::vector<int> v(1000);
    std::vector<int> w = std::move(v);   // 抢几个指针字段，O(1)
    std::cout << w.size() << "\n";       // 1000
    std::cout << v.size() << "\n";       // 常见为 0，标准不承诺

    std::string long_s(100000, 'x');     // 长字符串：数据在堆上
    std::string long_t = std::move(long_s);
    std::cout << long_t.size() << "\n";  // 100000

    std::string short_s = "hi";          // 短字符串：SSO，数据住在对象内部
    std::string short_t = std::move(short_s);
    std::cout << short_t.size() << "\n"; // 2
}
```

预期输出：

```text
1000
0
100000
2
```

vector 移动是教科书式的 O(1)：对象里只有几个指针字段，全抢走就完事。string 多一层常识叫 SSO（短字符串优化）：标准库把很短的字符串直接存在 string 对象内部的缓冲区里，没有堆指针可抢，移动时老老实实复制那一小块——好在那一小块本来就只有几十字节，无所谓；长字符串才走「抢指针」路线。两处 moved-from 的 `size()` 输出（常见为 0）再次印证第 4 节：不是合同，是巧合。

## 6. 修改实验

实验一（10 分钟）：把第 3 节 Grid 移动构造的 noexcept 去掉，运行计时；再加回去重跑。记录两版耗时倍数——这就是这一个关键词的全部成本（一个词）与全部回报（一个量级）。

实验二（15 分钟）：给 Grid 加成员 `std::string tag_;`（构造时传入），把移动构造改成只搬 cells_ 和 n_：

```cpp
    Grid(Grid&& other) noexcept
        : cells_(std::exchange(other.cells_, nullptr)),
          n_(std::exchange(other.n_, 0)) {
        // tag_ 忘了移动
        std::cout << "移动构造\n";
    }
```

再跑扩容实验：没有任何报错，但 tag_ 被静默拷贝了。修复：初始化列表加 `tag_(std::move(other.tag_))`。这条实验是「逐成员移动」纪律的实物教材。

实验三（5 分钟）：写 `Grid x(4); Grid y = std::move(x); x = Grid(9); std::cout << x.size();`，确认重新赋值后完全可用——这是第 4 节纪律 1 的合法出路，不是侥幸。

## 7. 常见错误与调试实录：移动赋值漏了释放，内存悄悄上涨

事故代码：Grid 移动赋值的错误版本——

```cpp
    Grid& operator=(Grid&& other) noexcept {   // 有 bug：旧资源没释放
        cells_ = other.cells_;
        n_ = other.n_;
        other.cells_ = nullptr;
        other.n_ = 0;
        return *this;
    }
```

```cpp
int main() {
    Grid world(1024 * 1024);     // 8 MB
    world = Grid(1024 * 1024);   // 覆盖旧指针：原来那 8 MB 无人认领
}
```

程序跑得对、算得对，但每次赋值漏 8 MB。放进游戏主循环，内存曲线一路爬升直到被系统杀掉。用 LeakSanitizer 抓（AddressSanitizer 自带泄漏检测）：

```bash
g++ -std=c++17 -g -fsanitize=address grid.cpp -o grid && ./grid
```

```text
==24316==ERROR: LeakSanitizer: detected memory leaks

Direct leak of 8388608 byte(s) in 1 object(s) allocated from:
    #0 0x7f3a1c2b1d67 in operator new[](unsigned long)
    #1 0x4011a2 in Grid::Grid(unsigned long)
    #2 0x4012f1 in main
SUMMARY: AddressSanitizer: 8388608 byte(s) leaked in 1 allocation(s).
```

（进程号与地址每次不同。）读报错三步：

1. 读 SUMMARY：8388608 字节 = 1024 × 1024 × 8，正是 Grid 的 double 数组，泄漏物锁定；
2. 读栈帧：分配发生在 `Grid::Grid(size_t)`——构造时 new 出来的内存没有对应的 delete[]。在代码里搜所有给 cells_ 赋值的位置；
3. 定位与修复：移动赋值在覆盖 cells_ 前没有 `delete[] cells_`，补上第 2 节的规范 5；换成 std::exchange 版本则从结构上杜绝。

## 8. 实际场景

- 自写资源类的验收清单：析构、拷贝构造、拷贝赋值、移动构造 noexcept、移动赋值 noexcept 五件套齐全；或者更好——「零法则」：成员全用 std::string、std::vector、std::unique_ptr 这类 RAII 类型，编译器默认生成的移动就足够好（见 [RAII 资源管理](/cpp/160-RAIIResourceManagement)）。自写移动构造的场合，应该是「资源类」本身；
- 扩容敏感路径：游戏每帧数组、音频环形缓冲、网络收包队列——放进 vector 的元素类型，用 `static_assert(std::is_nothrow_move_constructible_v<T>)` 钉死 noexcept；
- 批量转移：移动迭代器 `std::move(src.begin(), src.end(), std::back_inserter(dst))` 逐元素搬走而非拷贝；
- 持有独占资源优先 unique_ptr：移动语义已被它封装好（见 [智能指针进阶](/cpp/130-SmartPointerDeepDive)），别重复造轮子。

## 9. 小练习

预测题（10 分钟）：Grid 是第 2 节的完整版（noexcept 移动）。先写答案再运行：

```cpp
Grid a(2);
Grid b = a;                  // 第一行
Grid c = std::move(a);       // 第二行
Grid d(2);
d = std::move(b);            // 第三行
```

答案（先别偷看）：拷贝构造 / 移动构造 / 第三行无打印（赋值版没加打印）。第二行后 a 进入 moved-from；第三行把 b 的资源塞给 d 之前，先释放了 d 自己原来的数组——规范 5 在暗中工作。

预测题（5 分钟）：接着第 1 节的 trace 做对照：

```cpp
std::vector<Grid> v;
v.reserve(3);
v.push_back(Grid(1));
v.push_back(Grid(1));
v.push_back(Grid(1));
```

答案：三次「移动构造」，零次拷贝。reserve 预留了容量，全程没扩容。对照第 1 节没 reserve 的输出：「noexcept」与「reserve」是扩容性能的两个独立开关。

修改题（15 分钟）：给第 3 节 benchmark 加第二组对照——`frames.reserve(64);` 后再 push 64 次。预测：带与不带 noexcept 还差得动吗？运行验证，把结论写进你的团队备忘：两个正解，别只背一个。

挑战题（半小时，不看答案自己实现）：给 Grid 加成员函数 `void swap(Grid& other) noexcept`，并用它把移动赋值重写成更短的版本。验收断言：

```cpp
Grid a(4), b(9);
a.swap(b);
assert(a.size() == 9 && b.size() == 4);
static_assert(std::is_nothrow_move_assignable_v<Grid>);
```

提示：移动赋值的核心是一行 `swap(other)`。展开：旧资源去哪了？跟着 other 一起被析构——这正是它自赋值安全的理由。写完用 `g = std::move(g)` 实测一遍。

## 10. 与之前和之后的知识的关系

- 往前：本篇全部建立在 [移动语义](/cpp/090-RvalueReferenceMoveSemantics) 的模型上——左值右值、std::move 标签、moved-from 约定在那篇立起，这里只把「写对」的细节补全；
- 往后：[完美转发与引用折叠](/cpp/110-PerfectForwardingReferenceCollapse) 解决泛型包装器怎么把参数原样递下去（emplace_back 的底层正是它）；[RAII 资源管理](/cpp/160-RAIIResourceManagement) 讲为什么零法则通常胜过手写五件套；系统性的性能方法论见 [C++ 性能优化](/cpp/610-CppPerformance)。

## 11. 官方文档

- std::move（cppreference）：https://en.cppreference.com/w/cpp/utility/move
- std::move_if_noexcept（扩容选择移动的条件）：https://en.cppreference.com/w/cpp/utility/move_if_noexcept
- std::exchange：https://en.cppreference.com/w/cpp/utility/exchange

## 12. 自我检查

- 能默写移动构造/移动赋值五条规范，并说出每条违反时的后果（退化拷贝、double-free、自赋值事故、泄漏、成员静默拷贝）；
- 能解释 move_if_noexcept 背后的强异常保证，说清 noexcept 缺失时 benchmark 差多少倍；
- 能对新人讲清 moved-from 三条纪律与 std::exchange 的作用；
- 能说出 vector 与 string 移动成本的差异、SSO 是什么；
- 能从 LeakSanitizer 的 SUMMARY 行开始定位一次泄漏。

## 本章总结

移动构造与移动赋值的五条规范：noexcept、抢资源、置空源、自赋值安全、先释放旧资源，逐成员移动贯穿始终。noexcept 是 vector 扩容的调度开关——std::move_if_noexcept 只在移动「保证不抛」时选移动，缺一个词，性能差一个量级。moved-from 纪律：可析构可赋值、内容不依赖、空值语义显式表达。vector 移动 O(1)；string 因 SSO 短串移动也只是复制内部小块——但本来就便宜。工具链上，static_assert 钉住 noexcept，AddressSanitizer 抓住漏释放。

## 下一步

机制拆完了，还剩最后一块拼图：写包装函数（计时器、日志、工厂）时，怎么把参数「原样」递给下一层？进入 [完美转发与引用折叠](/cpp/110-PerfectForwardingReferenceCollapse)。
