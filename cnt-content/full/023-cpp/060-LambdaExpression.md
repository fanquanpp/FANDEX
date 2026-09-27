---
order: 60
title: 排行榜按哪个字段排？Lambda：随写随用的匿名函数
module: 'cpp'
category: 计算机科学
difficulty: intermediate
description: 以「排行榜要按分数、名字、等级排序，为每个字段写一个函数？」引入，五段拆解最小 Lambda [](){}，讲透与 std::sort 的配合（附预期输出）、捕获列表 [] / [=] / [&] / [x] 的取值时机与悬垂引用陷阱（-Wshadow 真实警告与逃逸作用域的运行时事故），附 'x' is not captured、capture of non-variable、use of deleted function 三类真实报错的调试实录，mutable 与尾置返回类型各一句话。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'cpp/070-LambdaCaptureDetailed'
  - 'cpp/080-CppReferenceTypes'
  - 'cpp/270-CppSTLAlgorithms'
  - 'cpp/240-CppSTLContainersIterators'
prerequisites:
  - 'cpp/050-NamespaceLinkage'
---

## 前置知识

- 已完成 [helper 打架，链接器炸了](/cpp/050-NamespaceLinkage)：知道 `std::` 前缀是什么，能搭三文件工程，会读链接器报错；
- 已完成 [类型不是标签，是承诺](/cpp/040-CppTypeSystem)：`auto` 的推导规则要熟，本文用它承接一切 Lambda；
- 三个新面孔先混眼熟、照抄即可：`std::vector`（动态数组，240 篇讲透）、`std::sort`（排序算法，270 篇讲透）、`struct`（把几个字段捆成一类的记法，200 篇讲透）。

## 学习目标

读完本文你将能够：

1. 手写最小 Lambda，说出 `[](){}` 五段各自的职责；
2. 用 `std::sort` 加 Lambda 按任意字段排序一组数据，并预测输出；
3. 区分值捕获与引用捕获的取值时机（创建时快照 vs 调用时现读），并设计实验验证；
4. 读懂 `'x' is not captured`、`capture of non-variable`、`use of deleted function` 三类真实报错，按三步定位；
5. 解释为什么「要逃出当前作用域的 Lambda」禁止 `[&]` 捕获局部变量，并给出正确写法。

预计 45 到 60 分钟，含 4 组实验、4 道练习。

## 1. 问题引入：为每个字段写一个函数？

排行榜要服务三种用户：按分数排、按名字排、以后还要按等级排。没有 Lambda 的写法，是为每种排序定义一个独立函数：

```cpp
bool by_score(const Player& a, const Player& b) { return a.score > b.score; }
bool by_name(const Player& a, const Player& b)  { return a.name < b.name; }
bool by_level(const Player& a, const Player& b) { return a.level > b.level; }
```

三个别扭：每个函数都要费脑子起名字；定义离使用现场十万八千里，看 sort 那一行时要跳走读函数体；字段一多，函数家族无限膨胀。

这类「用一次就扔、需要现场定制」的比较逻辑，正适合**匿名函数**：不命名、就地写、用完即弃。C++ 给它的名字是 **Lambda 表达式**——写法上就是普通函数去掉名字、加上捕获列表。

## 2. 最小 Lambda：[](){} 五段拆解

从最小的开始：

```cpp
#include <iostream>

int main() {
    auto shout = []() {
        std::cout << "起航\n";
    };
    shout();   // 和调用普通函数一模一样
    return 0;
}
```

预期输出：

```text
起航
```

五段逐段对号：

| 段 | 例子 | 职责 |
| --- | --- | --- |
| 捕获列表 | `[]` | 决定 Lambda 能看见外面的哪些变量（第 4 节主角） |
| 参数列表 | `()` | 与普通函数完全一样，无参就留空 |
| 说明符（可省） | `mutable` | 微调行为，本文只讲这一个 |
| 返回类型（可省） | `-> double` | 绝大多数情况让编译器从 return 推导 |
| 函数体 | `{ ... }` | 与普通函数完全一样 |

和普通函数相比：少了名字与返回类型声明，多了捕获列表，其余逐字相同。用 `auto` 接住它，是因为每个 Lambda 的类型由编译器独享生成、无法手写。Lambda 还是**表达式**，可以定义完当场调用，适合一次性计算：`int setup = []() { return 60 * 60; }();` 得到 3600。

## 3. 与算法配合：std::sort + Lambda

把排行榜的排序需求落地。struct Player 把名字和分数捆在一起（先照抄），vector 装一组玩家，sort 负责排序：

```cpp
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

struct Player {
    std::string name;
    int score;
};

int main() {
    std::vector<Player> players = {{"Ache", 945}, {"Xiaohu", 890}, {"Buding", 772}};

    std::sort(players.begin(), players.end(),
              [](const Player& a, const Player& b) { return a.score > b.score; });

    for (const Player& p : players) {
        std::cout << p.name << " " << p.score << '\n';
    }
    return 0;
}
```

预期输出（分数从高到低）：

```text
Ache 945
Xiaohu 890
Buding 772
```

照抄处说明：`std::sort(begin, end, 规则)` 按「规则」重排序列；`for (const Player& p : players)` 是逐个取元素的循环写法（中段展开）；参数里的 `&` 表示不复制整个玩家数据（引用，080 篇讲透，现在只需知道「大对象传它更快」）。换个字段只是换函数体一行：`return a.name < b.name;` 就是按名字字典序升序——比较逻辑与调用现场同屏，这就是 Lambda 的核心价值。一个诚实的注脚：分数相同时 std::sort 不保证谁在前（它不稳定，270 篇讲 stable_sort）。

## 4. 捕获列表：Lambda 怎么记住外面的世界

函数体想用外面的变量，默认**看不见**：

```cpp
int threshold = 60;
auto is_pass = []() { return threshold; };   // 想用外面的 threshold
```

```text
capture.cpp: In lambda function:
capture.cpp:5:33: error: 'threshold' is not captured
    5 |     auto is_pass = []() { return threshold; };
      |                                 ^~~~~~~~~
capture.cpp:4:9: note: 'threshold' declared here
    4 |     int threshold = 60;
      |         ^~~~~~~~~
```

`'threshold' is not captured` 是 Lambda 最常见的入门报错——空捕获 `[]` 把 Lambda 关成了自给自足的盒子。开锁方式如下。

`[threshold]` 值捕获：**创建时拍快照**；`[&threshold]` 引用捕获：存地址，**调用时现读**：

```cpp
#include <iostream>

int main() {
    int threshold = 60;

    auto by_value = [threshold]() { return threshold; };   // 此刻复制一份快照
    auto by_ref   = [&threshold]() { return threshold; };  // 存下地址，调用时现读

    threshold = 95;   // 快照之后才改的

    std::cout << by_value() << '\n';
    std::cout << by_ref()   << '\n';
    return 0;
}
```

预期输出：

```text
60
95
```

值捕获发生在 Lambda **创建那一刻**，之后原变量再怎么变，快照不动；引用捕获始终跟着原变量走，还能反过来改它：`auto add_bonus = [&threshold]() { threshold += 10; };` 执行后 threshold 真的变成 105（值捕获改的只是自己的副本）。`[=]` 与 `[&]` 是全捕：用到的变量全按值 / 全按引用；混合写法 `[=, &threshold]` 表示其余按值、threshold 按引用。方便，但读代码的人要猜捕了谁，团队规范普遍建议**显式列出**。

悬垂引用的预告：`[&]` 借的是地址，地址指向的变量一旦死亡，Lambda 手里就是一张过期地址条——这是第 8 节事故现场的主角，先把这句话钉在墙上。

## 5. mutable 与尾置返回类型（各一句话）

**mutable**：值捕获的副本默认只读，`mutable` 给副本解锁，且副本状态在多次调用间保留：

```cpp
int calls = 0;
auto tick = [calls]() mutable { return ++calls; };   // 改的是副本
std::cout << tick() << '\n';   // 1
std::cout << tick() << '\n';   // 2：上次调用改过的副本还活着
std::cout << calls << '\n';    // 0：原变量纹丝不动
```

**尾置返回类型**：单 return 时编译器自动推导；两个分支类型不一致等推导失败的场景，用 `-> 类型` 显式声明：`auto ratio = [](int a, int b) -> double { return a / double(b); };`

## 6. 核心概念：三句话钉住 Lambda

1. **Lambda 是表达式**：写在哪、定义在哪，求值结果是一个匿名函数对象（编译器生成的、能像函数一样调用的对象），用 auto 接住；
2. **捕获列表是唯一的新概念**：它决定函数体外的变量以「值快照」还是「引用」进入函数体——值捕获创建时复制，引用捕获调用时现读。这一句是全部捕获陷阱的总开关；
3. **跨函数传递 Lambda 才需要新工具**（std::function，先混眼熟，070 篇拆机制），同作用域内 auto 永远够用。

## 7. 修改实验

实验一（5 分钟）：给第 3 节排行榜加按名字升序的排序，先写预期输出再运行核对（答案：Ache、Buding、Xiaohu）。

实验二（5 分钟）：把第 4 节的 `[threshold]` 与 `[&threshold]` 互换，重新预测两行输出再运行（答案：95 与 60）。

实验三（10 分钟）：写统计器——`[&]` 捕获 passed 与 total 两个局部变量，Lambda 收一个分数，total 自增、达到 60 分时 passed 自增；循环喂入 {95, 40, 77} 后打印 `3 局中 2 局及格`。

## 8. 常见错误与调试实录

报错一：**capture of non-variable（捕获列表装错了东西）**。想捕获全局变量：

```cpp
int total_games = 3;   // 全局变量

auto avg = [total_games]() { return total_games; };
```

```text
nonvar.cpp: In lambda function:
nonvar.cpp:6:26: error: capture of non-variable 'total_games'
    6 |     auto avg = [total_games]() { return total_games; };
      |                          ^
nonvar.cpp:3:5: note: 'total_games' declared here
    3 | int total_games = 3;   // 全局变量
      |     ^
```

读报错三步：行号与 `capture of non-variable`（捕获了非变量）→ 关键认知：捕获列表只装**会随作用域消失的局部变量**；全局与静态变量全程活着，Lambda 直接写名字就能用，不需要也不允许捕获 → 修法：从捕获列表删掉，函数体直接用 `total_games`。

报错二：**use of deleted function（调用了被明令禁止的操作）**。智能指针 unique_ptr 是独占资源的句柄，禁止复制（先混眼熟，130 篇讲透）：

```cpp
auto data = std::make_unique<int>(42);
auto read = [data]() { return *data; };   // 值捕获的本质是复制一份
```

```text
deleted.cpp: In lambda function:
deleted.cpp:6:16: error: use of deleted function 'std::unique_ptr<_Tp, _Dp>::unique_ptr(const std::unique_ptr<_Tp, _Dp>&) [with _Tp = int; _Dp = std::default_delete<int>]'
    6 |     auto read = [data]() { return *data; };
      |                ^
```

读报错三步：`use of deleted function` 的意思是语法没错，但你调用了一个被标准「删掉」的操作 → 被删的是 unique_ptr 的复制构造：独占资源复制出两个主人，规矩就坏了 → 修法：移动捕获 `[data = std::move(data)]`（所有权移交进 Lambda，C++14 起，070 篇展开），或引用捕获（但要盯着生命周期）。

报错三（编译警告）：**同名遮蔽**。捕获了 score，函数体里又手滑新建同名局部变量。`-Wall -Wextra` 对此沉默，需要显式加 `-Wshadow`：

```text
shadow.cpp: In lambda function:
shadow.cpp:6:9: warning: declaration of 'score' shadows a captured variable [-Wshadow]
    6 |     int score = 0;
      |         ^~~~~
shadow.cpp:4:15: note: shadowed declaration is here
    4 |     auto f = [&score]() {
      |               ^
```

新变量把捕获进来的同名变量挡住了，函数体里读到的其实是新建的那个。排查「Lambda 读到的值不对劲」时先查这个。

事故（运行时）：**悬垂引用**。把 `[&]` 的 Lambda 装进 std::function 带出函数：

```cpp
#include <functional>

std::function<int()> make_counter() {
    int count = 0;
    return [&count]() { return ++count; };   // 借的是局部变量 count 的地址
}

int main() {
    auto tick = make_counter();
    // count 已随 make_counter 返回而销毁，tick 手里是过期地址条
    std::cout << tick() << '\n';   // 未定义行为
    return 0;
}
```

编译通过、`-Wall -Wextra` 零警告——编译器与链接器都不欠你一个解释。运行结果不可预测：我这次运行拿到一个与 1 无关的随机值，换机器或换优化级别可能「看起来正常」也可能崩溃，与 030 篇越界数组是同一类未定义行为，只是换了件衣服。修法：要逃出作用域，一律值捕获——`[count]() mutable { return ++count; }`，副本跟着 Lambda 活，原变量的死活与它无关（第 5 节的 mutable 在这里正经上岗）。用 `-fsanitize=address` 重编译可让这类事故当场现形（工具链见 630 篇）。

## 9. 实际项目中的使用场景

- **排序与过滤**：任何「按现场条件定制规则」的场合，配合 270 篇的算法全家桶是 Lambda 的主场；
- **回调注册**：GUI 按钮、游戏引擎事件、网络库完成通知——回调逻辑只用一次，就地定义胜过满屏的一次性命名函数；
- **线程任务**：新线程要执行的代码块用 Lambda 表达，值捕获天然适合「带数据上路」（430 篇展开）；
- **何时不用**：逻辑超过几行、需要复用、需要单独测试——请回命名函数。逃逸 Lambda 禁 `[&]`，写进团队规范。

## 10. 小练习

预测题（5 分钟）：不运行，写出输出：

```cpp
int n = 5;
auto f = [n]() { return n * 2; };
n = 100;
std::cout << f() << '\n';
```

（验证：输出 `10`。快照在创建时拍下，之后的 `n = 100` 与 Lambda 无关。）

修改题（10 分钟）：给第 3 节排行榜追加按名字升序的排序并打印。验收：输出 Ache 945、Buding 772、Xiaohu 890（名字序与分数序不同）。

修 Bug 题（15 分钟）：下面代码想把「加成后分数高的排前面」，编译报错附后。按读报错三步定位修复，修好后思考：为什么输出与不加加成时完全相同？

```cpp
std::vector<Player> players = {{"Ache", 945}, {"Xiaohu", 890}, {"Buding", 772}};
int bonus = 50;

std::sort(players.begin(), players.end(),
          [](const Player& a, const Player& b) {
              return a.score + bonus > b.score + bonus;
          });
```

```text
bug.cpp: In lambda function:
bug.cpp:12:35: error: 'bonus' is not captured
   12 |               return a.score + bonus > b.score + bonus;
      |                                   ^~~~~
bug.cpp:9:9: note: 'bonus' declared here
    9 |     int bonus = 50;
      |         ^~~~~
```

挑战题（半小时）：双键排序——分数相同时按名字字典序升序。数据：`{"Xiaohu", 890}, {"Ache", 945}, {"Buding", 890}, {"Coco", 772}`。不给代码，验收输出如下，逐字一致才算过：

```text
Ache 945
Buding 890
Xiaohu 890
Coco 772
```

提示（一级）：比较函数里先比分数，分数相同时再比名字。展开（二级）：字符串用 `<` 直接比较就是字典序；骨架是「分数不同返回分数比较，分数相同返回名字比较」。

## 11. 与之前和之后的知识的关系

- 往前：050 篇的 `std::` 前缀与尖括号 include 在 sort 调用里天天见面；040 篇的 auto 是承接 Lambda 的标准姿势；三文件工程继续服役；
- 往后：主线 C 到 070 再到 080——[Lambda 捕获详解](/cpp/070-LambdaCaptureDetailed) 是本文的深水篇，分工明确：**本文立模型**（五段结构、捕获列表怎么写、值与引用的行为差异），**070 拆捕获机制**（闭包对象长什么样、sizeof 多大、std::function 与初始化捕获、悬垂的全部细节）；[C++ 引用](/cpp/080-CppReferenceTypes) 讲透 `[&x]` 背后的左值引用机制；
- 更远：[C++ STL 算法详解](/cpp/270-CppSTLAlgorithms) 是 sort 的家；[智能指针详解](/cpp/130-SmartPointerDeepDive) 解释 deleted function 的来龙去脉；[多线程与并发](/cpp/430-MultithreadingConcurrency) 里 Lambda 是线程任务的标准写法。

## 12. 官方文档

- Lambda 表达式：https://en.cppreference.com/w/cpp/language/lambda
- std::sort：https://en.cppreference.com/w/cpp/algorithm/sort
- std::function：https://en.cppreference.com/w/cpp/utility/functional/function

## 13. 自我检查

- 能不看笔记写出五段结构表，并手写一个带捕获的排序 Lambda；
- 能说出值捕获与引用捕获分别在哪一刻取值，并当场设计 60/95 实验验证；
- 拿到 `'x' is not captured`、`capture of non-variable`、`use of deleted function` 三个报错，能按三步定位并修复；
- 能解释为什么逃出作用域的 Lambda 不能 `[&]` 捕获局部变量，并写出正确替代；
- 能说出团队规范为什么建议显式列出捕获，而不是 `[=]` / `[&]` 全捕。

## 本章总结

Lambda 是随写随用的匿名函数：`[](){} ` 五段里只有捕获列表是新东西，其余与普通函数逐字相同。与 std::sort 配合，按任意字段排序只需现场一行。捕获列表的本质是取值时机的选择：值捕获创建时拍快照、引用捕获调用时现读——记住这一句，not captured（没装）、capture of non-variable（装错）、deleted function（装了禁复制的东西）、悬垂引用（装了地址但东西死了）四类问题全部有解。本文立起的模型，下一篇拆开看内部。

## 下一步

进入 [Lambda 捕获详解](/cpp/070-LambdaCaptureDetailed)：闭包对象到底长什么样、捕获列表背后发生了什么拷贝与引用、std::function 的成本与初始化捕获的正确姿势——本文立模型，那里拆机制。
