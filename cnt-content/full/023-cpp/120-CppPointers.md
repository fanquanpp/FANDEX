---
order: 120
title: C++ 指针：直接操作内存地址的原始力量
module: 'cpp'
category: 计算机科学
difficulty: intermediate
description: 以「函数改不动调用方的变量」引入，讲透取地址与解引用、指针与引用的分工、指针算术与数组退化、空指针与 const 修饰的读法，附 nullptr 与悬垂指针调试实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'cpp/080-CppReferenceTypes'
  - 'cpp/130-SmartPointerDeepDive'
  - 'cpp/160-RAIIResourceManagement'
  - 'cpp/050-NamespaceLinkage'
prerequisites:
  - 'cpp/080-CppReferenceTypes'
---

## 前置知识

- 已完成 [引用类型](/cpp/080-CppReferenceTypes)：知道 `int&` 是别名、能改到原件。

## 学习目标

读完本文你将能够：

1. 说清指针与引用的分工，并为「要不要为空」的场景选对工具；
2. 用 `&` 与 `*` 在内存图上走通「变量-地址-指针」三层关系；
3. 解释数组名为什么会退化为指针，以及 `arr[i]` 与 `*(arr+i)` 的等价性；
4. 读写 `const int*`、`int* const` 这类声明，并用 nullptr 与初始化纪律避开悬垂指针。

预计 60 到 90 分钟。

## 1. 你现在要解决什么问题

写一个交换函数，用值传递怎么都改不到调用方的变量（080 篇引用已解过一次）。引用解决了「改到原件」，但它天生不为空、不可换绑——**当「可能暂时没有对象」或「需要中途指向不同对象」时，你需要一种更原始的工具：指针**。C++ 给你引用的舒适，也保留指针的原始力量；本文教你安全地握住它。

## 2. 最小可运行示例

```cpp
#include <iostream>

void swapByPointer(int* a, int* b) {
    int tmp = *a;   // * 解引用：顺着地址找到变量本身
    *a = *b;
    *b = tmp;
}

int main() {
    int x = 1, y = 2;
    int* p = &x;          // & 取地址：p 存的是 x 的地址
    std::cout << *p << '\n';   // 1 —— 顺着地址读写
    *p = 10;                    // 通过指针改到 x 本尊
    swapByPointer(&x, &y);
    std::cout << x << ' ' << y << '\n';   // 2 10
}
```

预期输出：

```text
1
2 10
```

内存图（三层关系）：`x` 是地址 0x7ffd...a4 上的值；`p` 是另一个变量，它的**值是一个地址**；`*p` 表示「顺着 p 里存的地址走过去，操作那块内存」。

## 3. 发生了什么：指针是「存地址的变量」

这决定了它的三个特性：指针本身可以被重新赋值（换个对象指）；指针可以为「不指向任何对象」（`nullptr`）；指针有自己独立的地址（所以存在指向指针的指针）。引用恰好相反（不为空、不可换绑、无独立实体）——**两者的分工由此而来**：引用用于「一定存在的对象」的别名（参数、范围 for），指针用于「可能缺席」与「需要改指」的场景（查找结果、可选关系、容器内存管理）。

## 4. 核心概念一：数组退化与指针算术

```cpp
int arr[] = {10, 20, 30};
int* p = arr;                    // 数组名在这里退化为首元素地址
std::cout << *(p + 1) << '\n';   // 20 —— +1 跨的是「一个 int」的宽度
std::cout << arr[1] << '\n';     // 20 —— arr[i] 就是 *(arr+i) 的语法糖
```

预期输出两行都是 `20`。指针算术的单位是「所指向类型的大小」（`sizeof(int)` 为 4 时，`p+1` 前进 4 字节）——这就是为什么 `void*` 不能做算术：它不知道步长。同一数组的两个指针可以相减得到元素个数；指向不同数组的指针做比较或减法是未定义行为。

## 5. 核心概念二：nullptr 与悬垂指针

指针的两大事故来源都和「指向失效」有关：

```cpp
int* p = nullptr;          // 显式的「不指向任何对象」
if (p != nullptr) std::cout << *p;   // 解引用前先判空——nullptr 解引用是崩溃（段错误）

int* dangling;             // 悬垂指针：指向已销毁的对象
{
    int local = 5;
    dangling = &local;     // local 出作用即亡
}
// *dangling 是未定义行为：编译能过，读到的是垃圾或直接崩溃
```

`nullptr`（C++11 起，替代旧写法 `NULL`/`0`）是唯一合法的「空」表达；悬垂没有运行时信号，唯一的解药是纪律：**指针只在被指对象存活期间使用；谁创建谁负责置空**。更现代的答案是 [智能指针](/cpp/130-SmartPointerDeepDive)——用对象生命周期自动化管理这件事，本文末尾会给出选择建议。

## 6. 核心概念三：const 修饰的读法

从右往左读声明，const 修饰「紧挨着它的东西」：

| 声明 | 读法 | 能改指向吗 | 能改内容吗 |
| --- | --- | --- | --- |
| `const int* p` | 指向常量的指针 | 能 | 不能 |
| `int* const p` | 常量指针 | 不能 | 能 |
| `const int* const p` | 指向常量的常量指针 | 不能 | 不能 |

验证实验：把 `int* const p = &x;` 重新赋值 `p = &y;`，编译器给出真实报错：

```text
error: assignment of read-only variable 'p'
```

函数签名里最常见的是第一种：`void print(const int* data, size_t n)` 承诺「只读不改」，调用方才敢把重要数据交给你。

## 7. 常见错误与调试实录

错误一：解引用空指针，程序以段错误退出（Linux 下典型输出）：

```text
Segmentation fault (core dumped)
```

定位：gdb 里 `bt` 看栈帧，或 AddressSanitizer 直接报 `SEGV on unknown address 0x000000000000`——地址为 0 即空指针解引用，回溯赋值链找到漏判空的分支。

错误二：返回局部变量的地址（悬垂的经典制造机）：

```cpp
int* bad() { int local = 5; return &local; }
// 警告：address of local variable 'local' returned [-Wreturn-local-addr]
```

`-Wall` 编译时就有警告——**警告不是装饰，C++ 的警告九成是未来的崩溃**。修法：返回值、传出引用参数，或（确需堆生命周期时）智能指针。

错误三：`if (p == nullptr)` 写成 `if (p = nullptr)`——赋值当判断，指针永远为空、分支永远不走。与 JS/Java 同款事故，C++ 的额外伤害是它可能只是「静默不工作」而非报错。

## 8. 修改实验

1. 把 `swapByPointer` 改成引用版 `swapByRef(int& a, int& b)`，对比两种调用处写法（`swap(&x,&y)` vs `swap(x,y)`）——体会「指针把选择权显式交给调用点，引用把义务藏进签名」；
2. 写一个「在数组中找第一个偶数」的函数，找到返回其指针、找不到返回 `nullptr`；调用处必须判空——把「可能缺席」走一遍；
3. 故意制造悬垂：照第 5 节写 `dangling` 并解引用，分别用默认编译与 `-fsanitize=address` 编译运行，对比两者给出的信息量。

## 9. 小练习

预测题（先写答案再运行）：

```cpp
int a = 5;
int* p = &a;
int* q = p;
*q = 7;
std::cout << a << ' ' << *p << ' ' << *q << '\n';
```

修改题：写 `int* maxOf(int* arr, size_t n)` 返回指向最大元素的指针（空数组返回 nullptr），并用循环内 `*result` 与 `arr[i]` 两种写法各实现一遍，确认行为一致。

修 Bug 题：下面的函数偶发崩溃，指出两处问题并修复（提示：一处是空指针，一处是悬垂）：

```cpp
int* firstPositive(int* arr, size_t n) {
    for (size_t i = 0; i < n; i++)
        if (arr[i] > 0) return &arr[i];
}
```

挑战题（不看提示）：实现 `void copyRange(int* dst, const int* src, size_t n)`，要求 `src` 用 const 保护、dst 与 src 区间重叠时行为明确（先想清楚重叠时逐元素正拷会发生什么，再决定文档里如何声明限制）。用 `{1,2,3,4,5}` 拷到自身偏移 1 的位置验证你的声明。

## 10. 什么时候应该 / 不应该用裸指针

应该：只观察不拥有的场景（函数参数、视图）；需要「可能为空」语义时（查找结果）；与 C 库或旧代码交互。

不应该：用裸 `new`/`delete` 管理所有权（那是 [智能指针](/cpp/130-SmartPointerDeepDive) 与 [RAII](/cpp/160-RAIIResourceManagement) 的领地——现代 C++ 里裸指针只「看」不「管」）；用指针替代引用做必存在的出参。

## 11. 与之前和之后的知识的关系

- 往前：080 的引用是本文的「安全模式」；060 的 Lambda 捕获、050 的链接符号底层都是地址在流动；
- 往后：[智能指针](/cpp/130-SmartPointerDeepDive) 把本文的所有权焦虑交给类型系统；[RAII](/cpp/160-RAIIResourceManagement) 是 C++ 管理一切资源的总纲；移动语义（090-110）处理的是「地址所辖资源的转手」；
- 更远：容器与算法（240 篇起）的迭代器就是「被驯服的指针」——本文的概念全部适用，危险部分已被封装。

## 12. 官方文档

- cppreference 指针声明：https://en.cppreference.com/w/cpp/language/pointer
- cppreference nullptr：https://en.cppreference.com/w/cpp/language/nullptr
- C++ Core Guidelines 对指针的纪律（只看不拥有）：https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#Rf-raw

## 13. 自我检查

- 能画出「变量-地址-指针」三层图并解释 `&` 与 `*` 互逆；
- 能给出指针与引用的三点分工并为两个场景各选对工具；
- 能从右往左读出三种 const 指针声明的能力矩阵；
- 能复述悬垂指针的成因与三条纪律，并说出 sanitizers 的价值。

## 本章总结

指针是存地址的变量：它为空、可换指、可做算术——力量与事故同源。数组退化让 `arr[i]` 等价于 `*(arr+i)`；const 从右往左读出保护范围；nullptr 与初始化纪律挡住空解引用与悬垂。现代 C++ 的分工已经清晰：裸指针只看不拥有，所有权交给智能指针与 RAII——下一篇开始，你将亲手把这份焦虑交给类型系统。

## 下一步

进入 [智能指针深水区](/cpp/130-SmartPointerDeepDive)：unique_ptr 与 shared_ptr 如何用对象的生命周期替你 delete。
