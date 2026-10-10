---
order: 120
title: 移动语义：把资源搬走，而不是复印一份
module: 'cpp'
category: 计算机科学
difficulty: intermediate
description: 用「传递 1 GB 玩家存档」的场景建立移动语义心智模型：左值右值判别、拷贝与移动的耗时对照实验、std::move 的真实含义与 moved-from 约定，附 use after move 调试实录。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cpp/080-CppReferenceTypes'
  - 'cpp/100-MoveSemanticsDetailed'
  - 'cpp/110-PerfectForwardingReferenceCollapse'
  - 'cpp/200-CppOOPBasics'
  - 'cpp/240-CppSTLContainersIterators'
  - 'cpp/130-SmartPointerDeepDive'
prerequisites:
  - 'cpp/080-CppReferenceTypes'
---

## 前置知识

- 已完成 [C++ 引用](/cpp/080-CppReferenceTypes)：知道 `T&` 是别名、`const T&` 能绑定临时对象，本文的 `T&&` 是它的续集；
- 会用到构造与析构：没系统学过也能跟，只用到「对象诞生时构造、离开作用域时析构」这层意思，全貌见 [C++ 面向对象基础](/cpp/200-CppOOPBasics)。

> 分工说明：090、100、110 三篇合讲移动语义与转发。本篇是主教学，建立心智模型：左值右值、拷贝与移动的差距、`std::move` 到底做了什么；[移动语义深水区](/cpp/100-MoveSemanticsDetailed) 拆机制（移动构造/赋值完整规范、noexcept 与容器扩容、moved-from 纪律）；[完美转发与引用折叠](/cpp/110-PerfectForwardingReferenceCollapse) 解决包装函数如何原样递参数。三篇示例互不重复，本篇是后两篇的地基。

## 学习目标

读完本文你将能够：

1. 预测一个表达式是左值还是右值，并用重载实验验证；
2. 说清拷贝构造与移动构造的成本差异，并亲手测出量级差距；
3. 解释 `std::move` 为什么运行时零开销，以及真正「搬家」的是谁；
4. 遵守 moved-from 约定：析构、重新赋值合法，依赖内容禁止；
5. 识别并修复 use after move 的静默事故。

预计 45 到 60 分钟，含 3 组实验与 3 道练习。

## 1. 你现在要解决什么问题

游戏服务器的存档模块：100 万个玩家，每人一段名字加 100 条战绩，整体约 1 GB。归档函数按值接收：

```cpp
struct PlayerData {
    std::string name;
    std::vector<int> scores;              // 每人 100 条
};

std::vector<PlayerData> load_players();             // 读出全部玩家，约 1 GB
void archive_all(std::vector<PlayerData> players);  // 按值接收：写进冷存储

auto players = load_players();
archive_all(players);   // 接近一秒：1 GB 被逐字节复印了一份，此后 players 再没用过
```

副本的命运从诞生起就已注定：写进冷存储后整个丢弃。用 `std::chrono` 实测，这次拷贝在我机器上花了约 900 毫秒——纯粹为了满足「按值接收」而复印 1 GB。

`archive_all` 反正要独占这份数据，能不能不复印，把「里面的东西」直接搬走？这就是移动语义要解决的问题。C++11 之后，答案由三样东西组成：右值引用 `T&&`、移动构造/移动赋值、`std::move`。

## 2. 先试试看：谁是「有名字的」，谁是「过路的」

移动语义的第一步不是语法，是分类。C++ 把表达式分成两大家族（形式化的值类别见 080 篇）：

- 左值：有名字、有地址，这句话说完它还在——变量名、`v[i]`、解引用结果；
- 右值：过路的临时值，说完就没了——字面量 `42`、临时对象、`std::move(x)` 的结果。

一分钟判别法：能取地址（`&x` 编译得过）就是左值。三种引用形式能接住谁：

| 引用形式 | 能接住的 | 典型用途 |
| --- | --- | --- |
| `T&` | 只有左值 | 修改实参 |
| `const T&` | 都接，但只读 | 大对象只读传参 |
| `T&&`（本篇主角） | 只有右值 | 移动语义 |

实验验证（`g++ -std=c++17 inspect.cpp -o inspect` 后运行）：

```cpp
#include <iostream>
#include <string>
#include <utility>

void inspect(std::string& s)  { std::cout << "有名字的（左值）: " << s << "\n"; }
void inspect(std::string&& s) { std::cout << "过路的（右值）: " << s << "\n"; }

int main() {
    std::string name = "Alice";
    inspect(name);                // 有名字
    inspect(std::string("Bob"));  // 临时对象
    inspect(std::move(name));     // 疑点：name 分明还有名字？
}
```

预期输出：

```text
有名字的（左值）: Alice
过路的（右值）: Bob
过路的（右值）: Alice
```

第三行是全篇的钥匙：`std::move(name)` 没改名也没销毁 name，只是给它贴上「可以搬走」的标签，让编译器把它当右值对待。`std::move(name)` 是你主动宣布「我不要了」——这正是 `T&&` 能接住、`T&` 接不住的东西。

## 3. 对比实验：亲眼看见「复印」和「搬家」

造一个持有资源的类——游戏渲染里的「帧缓冲」，1 MB 数据靠指针指着：

```cpp
// buffer.cpp 第一步：只有拷贝语义
#include <cstring>

class Buffer {
public:
    explicit Buffer(size_t n) : size_(n), data_(new char[n]) {}
    ~Buffer() { delete[] data_; }                      // 析构负责还内存

    Buffer(const Buffer& other)                        // 拷贝构造：复印
        : size_(other.size_), data_(new char[other.size_]) {
        std::memcpy(data_, other.data_, size_);
    }

private:
    size_t size_;
    char*  data_;
};
```

拷贝构造干了两件昂贵的事：`new` 一块新内存，再逐字节复印。1 MB 是几十到几百微秒，1 GB 就是接近一秒——第 1 节的 900 毫秒花在这里。补上移动构造，只加一个函数（`noexcept` 先照抄，为什么必须写，100 篇整节在讲）：

```cpp
    Buffer(Buffer&& other) noexcept                    // 移动构造：搬家
        : size_(other.size_), data_(other.data_) {
        other.data_ = nullptr;                         // 源对象放手，见第 5 节
        other.size_ = 0;
    }
```

把 `other` 的指针直接拿过来再置空：没有分配，没有复印。对比真实耗时：

```cpp
// buffer.cpp 的 main
#include <chrono>
#include <iostream>
#include <utility>

int main() {
    Buffer a(1024 * 1024);            // 1 MB 一帧
    auto t1 = std::chrono::steady_clock::now();
    Buffer b = a;                     // 拷贝
    auto t2 = std::chrono::steady_clock::now();
    Buffer c = std::move(a);          // 移动
    auto t3 = std::chrono::steady_clock::now();
    std::cout << "拷贝 1 MB: "
              << std::chrono::duration_cast<std::chrono::microseconds>(t2 - t1).count()
              << " 微秒\n"
              << "移动 1 MB: "
              << std::chrono::duration_cast<std::chrono::microseconds>(t3 - t2).count()
              << " 微秒\n";
}
```

预期输出（数字随机器浮动，量级差才是结论）：

```text
拷贝 1 MB: 214 微秒
移动 1 MB: 0 微秒
```

搬家能这么便宜，是因为 Buffer 的「本体」不在对象里，而在指针指着的那块堆内存上：对象本身只有 16 个字节（一个 size、一个指针），搬家搬的只是归属权，复印才需要动那一 MB。

- `std::move(a)`：运行时什么都不做，实现就是一次类型转换（`static_cast<Buffer&&>(a)`，标准库实现剥掉外壳只剩这一行，示意），零开销，不改 a 的任何字节；
- `Buffer c = std::move(a)` 里真正干活的：移动构造函数，接住右值，执行「抢指针、置空源」。

口诀：**std::move 只是换个说法，搬家的是移动构造/移动赋值**。只写 `std::move(a);` 没人接住，a 什么都不会变——第 2 节实验第三行就是这个道理。

## 5. 移动之后：moved-from 对象的合法状态

标准库给所有类型定了统一契约：「有效但未指定」（valid but unspecified）——析构一定安全、赋新值一定合法；读内容并依赖结果，不承诺。

```cpp
#include <iostream>
#include <utility>
#include <vector>

int main() {
    std::vector<int> v = {1, 2, 3};
    std::vector<int> w = std::move(v);

    std::cout << w.size() << "\n";   // 3：数据搬到了 w
    std::cout << v.size() << "\n";   // 常见为 0，但标准不承诺具体值
    v = {7, 8};                      // 合法：重新赋值后照常使用
    std::cout << v.size() << "\n";   // 2
}
```

预期输出：

```text
3
0
2
```

第二行几乎一定是 0，但「几乎一定」不是「承诺」。为什么移动构造必须置空源指针？下一节实验二让你亲眼看：不置空的话，两个对象析构时对同一块内存 `delete[]` 两次，程序直接崩。

## 6. 修改实验

实验一（5 分钟）：把第 3 节 main 里的 `std::move(a)` 改回 `a`。还能编译吗？耗时变成什么样？（提示：`Buffer c = a` 走哪个构造函数。）

实验二（15 分钟）：给 Buffer 析构加一行打印 `data_`，再删掉移动构造里的两行置空（`other.data_ = nullptr; other.size_ = 0;`）运行。用 `g++ -std=c++17 -g -fsanitize=address buffer.cpp -o buffer` 编译，你会看到（地址每次不同）：

```text
==21876==ERROR: AddressSanitizer: attempting double-free on 0x602000000010 in thread T0
```

这就是「析构必须安全」的机制：置空源指针，让旧对象的析构变成无害的 `delete[] nullptr`。

实验三（5 分钟）：在第 5 节的 `std::move(v)` 之后调用 `v.clear()`、`v.empty()`——都合法吗？再试 `v.at(0)`：常见实现抛 `std::out_of_range`，这就是「不要读 moved-from 内容」的样子。

## 7. 常见错误与调试实录：use after move 的静默事故

事故代码（发布录像功能，`bug.cpp`）：

```cpp
#include <iostream>
#include <string>
#include <utility>

void upload(std::string data)     { std::cout << "上传 " << data.size() << " 字节\n"; }
void save_local(std::string data) { std::cout << "本地保存 " << data.size() << " 字节\n"; }

int main() {
    std::string recording(1000, 'x');
    upload(std::move(recording));   // 搬给 upload
    save_local(recording);          // 症状在这里
}
```

预期输出：

```text
上传 1000 字节
本地保存 0 字节
```

没有崩溃、没有警告，本地备份悄悄变成 0 字节——moved-from 是合法状态，编译器没有理由报错。定位三步：

1. 锁定症状：`save_local` 收到 0 字节，沿 `recording` 往上捋数据流；
2. 找最后一次「拥有数据」的位置：`upload(std::move(recording))` 之后 recording 进入 moved-from；
3. 修复数据流：先保存再搬走——`save_local(recording); upload(std::move(recording));`。

预防：约定「move 一完就别再碰原名」，让变量尽快离开作用域。clang-tidy 能机械检查：`clang-tidy bug.cpp --checks=bugprone-use-after-move --`，会报两条 warning，一条指向 move 语句、一条指向之后的使用。

## 8. 实际场景

- sink 参数：函数想「接手」数据就按值接收，内部 `name_ = std::move(name)` 移动进成员——调用方传左值付拷贝、传右值零拷贝，一个接口通吃；
- 整容器转移：`auto next = std::move(buffer);` 对 vector 是 O(1)。重排、扩容大容器前，先想能不能整体搬；
- move-only 类型：`std::unique_ptr` 连拷贝都禁止，只能移动——所有权转移的极致形态，见 [智能指针进阶](/cpp/130-SmartPointerDeepDive)；
- 两件不要做的事：move 之后还要用的对象；对 `const` 对象 move——标签贴不上去（`const T&&` 接不住），静默退化成拷贝；
- 高频规则：返回局部变量直接 `return v;`，不要 `return std::move(v);`——返回会自动按移动处理（C++17 起），多余的 move 反而挡住编译器更优的直接构造。

## 9. 小练习

预测题（10 分钟）：先写答案再运行。

```cpp
void show(std::string s) { std::cout << s << "\n"; }

std::string name = "FANDEX";
show(name);                 // 第一行
show(std::move(name));      // 第二行
show(name);                 // 第三行：合法吗？打印什么？
```

答案（先别偷看）：`FANDEX`、`FANDEX`；第三行合法不崩溃，但常见实现打印空行——moved-from 可析构可赋值，内容不承诺，把「碰巧为空」写进依赖就是下一场事故。

修 Bug 题（15 分钟）：下面的循环想逐个发送任务后清点，运行后下游炸了。按定位三步找原因并修复：

```cpp
std::vector<std::string> pending = fetch_tasks();
for (auto& task : pending) {
    send(std::move(task));      // 逐个搬走
}
std::cout << pending.size();    // 数量没错，但每个元素都被搬空了
```

提示：问题不在 `pending.size()`，在「搬走之后还把容器当完整数据用」。需要的信息搬运前记录，或 `pending.clear()` 把「空了」变成显式约定。

挑战题（半小时，不看答案自己实现）：写 `Telemetry` 类：构造函数按值接收 `std::string payload` 并移动进成员；`payload()` 返回拷贝；`take_payload()` 把成员移出并让对象进入 moved-from。验收断言：

```cpp
Telemetry t("sensor-001");
assert(t.payload() == "sensor-001");
std::string taken = t.take_payload();
assert(taken == "sensor-001");
```

提示：`take_payload` 返回 `std::string`，函数体 `return std::move(payload_);`；成员函数不能是 const——const 成员里 std::move 贴不上标签（第 8 节的 const 陷阱）。

## 10. 与之前和之后的知识的关系

- 往前：[C++ 引用](/cpp/080-CppReferenceTypes) 的绑定规则是地基——`T&` 接左值、`const T&` 都接但只读，`T&&` 补上「专门接右值」的最后一块；
- 往后：[移动语义深水区](/cpp/100-MoveSemanticsDetailed) 回答本篇刻意跳过的问题：移动构造怎么写才算完整、noexcept 为什么决定 vector 扩容走移动还是拷贝、moved-from 怎么管理；[完美转发与引用折叠](/cpp/110-PerfectForwardingReferenceCollapse) 处理「包装函数如何把参数原样递下去」；
- 更远：[RAII 资源管理](/cpp/160-RAIIResourceManagement) 与智能指针会把「移动即所有权转移」变成日常工具。

## 11. 官方文档

- std::move（cppreference）：https://en.cppreference.com/w/cpp/utility/move （中文：https://zh.cppreference.com/w/cpp/utility/move ）
- 移动构造函数：https://en.cppreference.com/w/cpp/language/move_constructor

## 12. 自我检查

- 能写出左值/右值的直观判别法，并用重载实验现场验证；
- 能说清拷贝构造与移动构造各自做了什么、为什么量级差几百倍；
- 能解释 std::move 运行时零开销、搬家者是移动构造/赋值；
- 能复述 moved-from 三条约定并解释置空指针的必要性；
- 拿到一段代码能指出 use after move 的位置并给出两种修复。

## 本章总结

右值是「过路的值」，`T&&` 专门接住它；移动构造与移动赋值用「抢指针、置空源」替代「分配加复印」，把资源转移从 O(n) 压到 O(1)。`std::move` 只是给左值贴「可以搬走」的标签，零运行时开销，搬家的是接住右值的构造/赋值。moved-from 对象可析构、可重新赋值，但内容不可依赖——这是 use after move 静默的根源，也是下一篇团队纪律的起点。

## 下一步

进入 [移动语义深水区](/cpp/100-MoveSemanticsDetailed)：你已经在第 3 节亲手写过移动构造，下一篇回答「怎么写才算写对」。
