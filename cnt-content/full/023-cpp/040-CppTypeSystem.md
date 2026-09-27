---
order: 40
title: 类型不是标签，是承诺：字节、运算与转换
module: 'cpp'
category: 计算机科学
difficulty: intermediate
description: 以「排行榜平均分 296.67 打印成 296」引入，用 sizeof 实验建立「类型是承诺」心智模型，覆盖 auto 推导与 CTAD 一句、字面量后缀 1L/3.14f/u8、cstdint 固定宽度整型、隐式转换与花括号抓 narrowing，附 ambiguous conversion 真实报错调试实录。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cpp/050-NamespaceLinkage'
  - 'cpp/080-CppReferenceTypes'
  - 'cpp/120-CppPointers'
  - 'cpp/240-CppSTLContainersIterators'
prerequisites:
  - 'cpp/030-CppBasicSyntax'
---

## 前置知识

- 已完成 [第一个程序与第一颗子弹](/cpp/030-CppBasicSyntax)：能两步跑通 main.cpp，默认编译命令带 `-Wall -Wextra`；
- 没学过也行：新概念当场解释，要跳到后面才讲透的，明示「先混眼熟」。

## 学习目标

读完本文你将能够：

1. 用 `sizeof` 报出常用基础类型各占几字节，解释 long 为什么跨平台不一样；
2. 预测整数除法与混合运算的结果，说出「类型决定运算」；
3. 用 `auto` 让编译器记账，说出 `auto s = "hi"` 的真实类型（不是 std::string）；
4. 说出 `1L`、`3.14f`、`u8` 各改了什么，什么时候必须写；
5. 用 `<cstdint>` 写出跨平台稳定的代码，读懂 narrowing 与 ambiguous 报错。

预计 45 到 60 分钟，含 3 组实验、4 道练习。

## 1. 问题引入：296.67 怎么变成 296

你在给排行榜加「平均分」功能：

```cpp
#include <iostream>

int main() {
    int total = 890;   // 三局总得分
    int games = 3;
    std::cout << "平均分: " << total / games << '\n';
    return 0;
}
```

预期输出：

```text
平均分: 296
```

890 / 3 是 296.67，程序却打印 296——没有四舍五入，小数直接没了。代码没有一个字符是「错误」，编译器一个警告都没给。

这是类型的第一课：**类型不是给人看的标签，是给编译器的承诺**。`total` 和 `games` 都承诺自己是 int（整数），`/` 就按整数除法执行，商的小数部分直接丢弃；换成 double，同一个 `/` 就是浮点除法。类型到底还承诺了什么？怎么防止编译器在背后偷偷换承诺？往下读。

## 2. 第一个承诺：占几个字节（sizeof 实验）

承诺一：类型决定一个值**占几个字节**。`sizeof` 是编译器的询问工具，回答某类型占多少字节。新建 sizes.cpp：

```cpp
#include <iostream>

int main() {
    std::cout << "int:       " << sizeof(int) << " 字节\n";
    std::cout << "long:      " << sizeof(long) << " 字节\n";
    std::cout << "long long: " << sizeof(long long) << " 字节\n";
    std::cout << "double:    " << sizeof(double) << " 字节\n";
    return 0;
}
```

编译运行，x86-64 Linux 的答案：

```text
int:       4 字节
long:      8 字节
long long: 8 字节
double:    8 字节
```

换平台，表就可能变：

| 平台 | int | long | long long | double |
| --- | --- | --- | --- | --- |
| 64 位 Linux / macOS（GCC、Clang） | 4 | 8 | 8 | 8 |
| 64 位 Windows（MSVC、MinGW） | 4 | 4 | 8 | 8 |
| 32 位嵌入式（常见配置） | 4 | 4 | 8 | 8 |

int 几乎总是 4 字节；long 是会变脸的那个（Linux 64 位给 8，Windows 只给 4）；char 永远 1 字节，标准明文保证。标准只规定各类型的下限与相对关系，具体字节数由平台决定——这正是第 7 节固定宽度整型存在的理由。

## 3. 第二个承诺：能做什么运算

承诺二：类型决定**运算的行为**。同一个 `/`，不同类型不同命运：

```cpp
std::cout << 7 / 2 << '\n';    // 3：两边都是 int，整数除法
std::cout << 7.0 / 2 << '\n';  // 3.5：有 double 参与，升格为浮点除法
```

预期输出：

```text
3
3.5
```

修好第 1 节的平均分只需一处：`total / double(games)`，让除法以浮点进行，输出变成 `平均分: 296.667`（C++ 默认打印 6 位有效数字）。

## 4. 核心概念：类型是承诺

1. **类型是承诺**：一个值占几个字节（第 2 节），能参加什么运算、按什么规则算（第 3 节）；
2. 运算前编译器把两边转成同一类型再算，小的升大的，这叫**隐式转换**，自动执行；
3. 升格（int 到 double）无损，收窄（double 到 int）有损。有损转换编译器大多默默执行，把关的责任在你——第 8 节讲怎么把关。

## 5. auto：让编译器替你记账

写类型啰嗦？`auto` 让编译器按右边的值推导类型（C++11；C++17 又推广到模板类：`std::pair p{1, 2.0};` 不必写 `std::pair<int, double>`，这叫 CTAD，先混眼熟，300 篇展开）：

```cpp
auto score = 100;      // int
auto ratio = 0.618;    // double：带小数点的字面量默认是 double
auto win = true;       // bool
auto name = "小狐";     // const char* —— 注意！不是 std::string
```

auto 的原则是照抄右边字面量的类型。带引号的文本叫**字符串字面量**，原生类型是 `const char*`（指向只读字符的指针），不是字符串对象——想用 `+` 拼接会直接编译报错 `invalid operands`，字符串要显式写 std::string。

## 6. 字面量后缀：给数字定性

代码里直接写出的值叫字面量：`100`、`3.14`、`"小狐"`。后缀贴在数字后面，**当场改变类型**：

```cpp
auto b = 1000L;       // long：L 后缀（LL 是 long long）
auto e = 3.14f;       // float：不加后缀的 3.14 永远是 double
auto tag = u8"rank";  // u8：这段字节按 UTF-8 解释
```

- `L` / `LL`：整数升舱，配合 auto 最有价值：`auto big = 1'000'000'000LL;` 直接得到 long long；
- `f`：把浮点字面量定性为 float（4 字节），不加则是 double（8 字节）；
- `u8`：源文件编码取决于编辑器，u8 把「按 UTF-8 解释」写进代码本身（C++20 起元素类型是 char8_t），多语言文本处理见 470 篇。另外 `0x1A` 是十六进制，`1'000'000` 的单引号是数字分隔符，只提升可读性。

## 7. 固定宽度整型：写可移植代码的习惯

第 2 节说过 long 会变脸。数据要跨平台稳定（存档文件、网络包），就不能赌平台，要用 `<cstdint>` 里**写死宽度**的类型：

```cpp
#include <cstdint>
#include <iostream>

int main() {
    std::int32_t hp = 100;                           // 任何平台都是 4 字节
    std::uint64_t total_damage = 123'456'789'012ULL; // 任何平台都是 8 字节
    std::cout << total_damage << '\n';
    return 0;
}
```

预期输出：

```text
123456789012
```

命名一眼即懂：`int32_t` 是 32 位有符号整数，`uint64_t` 是 64 位无符号整数，一族从 `int8_t` 到 `int64_t`。习惯：日常计数用 int/double；数值要写进文件、网络、存档格式，或会超过 21 亿（int32_t 上限 2147483647），就换固定宽度并配 LL/ULL 后缀。固定宽度只管字节不管溢出——int32_t 加过上限是 030 篇的未定义行为，第 12 节挑战题让你算到这一步。

## 8. 隐式转换：编译器的私相授受

场景一，**无声截断**：`int hp = 89.9;` 得到 89——截断而非四舍五入，默认零警告。数值敏感路径可开 `-Wconversion`，GCC 会给出 `warning: conversion from 'double' to 'int' may change value`。

场景二，**花括号当场拦下收窄**。初始化的花括号对有损转换零容忍：

```cpp
int hp{89.9};
```

```text
narrow.cpp: In function 'int main()':
narrow.cpp:4:13: error: narrowing conversion of '8.9900000000000002e+01' from 'double' to 'int' [-Wnarrowing]
    4 |     int hp{89.9};
      |             ^~~~
```

同样的赋值用等号静默通过，用花括号当场报错。习惯：能花括号就花括号，让编译器替你把关。

场景三，**有符号与无符号混比**：

```cpp
#include <iostream>

int main() {
    int hp = -1;               // 有符号：可以为负
    unsigned int armor = 1;    // 无符号：永远 >= 0
    if (hp < armor) {
        std::cout << "破防\n";
    } else {
        std::cout << "挡住了\n";
    }
    return 0;
}
```

预期输出：

```text
挡住了
```

比较时 int 侧被隐式转成 unsigned，-1 变成 4294967295，当然比不过 1。`-Wall -Wextra` 会提示：

```text
sign.cpp: In function 'int main()':
sign.cpp:7:11: warning: comparison of integer expressions of different signedness: 'int' and 'unsigned int' [-Wsign-compare]
    7 |     if (hp < armor) {
      |         ~~^~~~~~~~
```

规则：比较两边同符号。unsigned 留给位运算与接口对齐，别拿它当「非负数」的防御。

## 9. 修改实验

实验一（5 分钟）：给 sizes.cpp 增加 float 与 char 两行输出，运行核对是否与第 2 节的表一致。

实验二（5 分钟）：把 `int hp{89.9};` 的花括号换成等号，观察报错变成无声通过；补上 `-Wconversion` 重新编译，看警告出现。

实验三（10 分钟）：把第 8 节场景三的 `armor` 与 `hp` 都改成 0，先预测再运行；再把两边统一成 int，验证警告消失。

## 10. 常见错误与调试实录

报错：**ambiguous conversion（转换有歧义）**。按充值档位发奖励，写了两个同名函数（一个名字多个版本、编译器按实参类型挑一个的机制叫重载，先混眼熟，200 篇讲）：

```cpp
#include <iostream>

void award(int score)      { std::cout << "整数档: " << score << '\n'; }
void award(unsigned score) { std::cout << "无符号档: " << score << '\n'; }

int main() {
    award(2.5f);   // float：转 int 和转 unsigned 两条路看起来一样好
    return 0;
}
```

```text
ambiguous.cpp: In function 'int main()':
ambiguous.cpp:8:5: error: call of overloaded 'award(float)' is ambiguous
    8 |     award(2.5f);
      |     ^~~~~~~~~~
ambiguous.cpp:4:6: note: candidate: 'void award(int)'
ambiguous.cpp:5:6: note: candidate: 'void award(unsigned int)'
```

读报错三步：行号 → error 原文 `call of overloaded 'award(float)' is ambiguous` → note 列出两位候选人。float 到 int 与 float 到 unsigned 是平级的标准转换，编译器拒绝替你拍板。修法二选一：显式转换 `award(static_cast<int>(2.5f));`，或补一个 `void award(float)` 让路线唯一。

## 11. 实际项目中的使用场景

- **存档与网络字段一律固定宽度**：int32_t/int64_t 保证同一份存档在 Windows 与 Linux 上解析一致——第 2 节的平台表就是事故来源；
- **累计值用 int64_t**：总伤害、总时长、日志计数，看似到不了 21 亿的数字在生产环境天天越线；
- **团队门禁**：`-Wall -Wextra -Wconversion` 零警告是很多 C++ 团队的上游要求。

## 12. 小练习

预测题（5 分钟）：不运行，写出输出：

```cpp
int total = 890;
int games = 3;
double avg = total / games;
std::cout << avg << '\n';
```

（验证：输出 `296`。除法先按 int 规则算完截断，之后才轮到 double 接收——转换发生在运算之后。）

修改题（10 分钟）：只改一处，让平均分打印 `296.667`。验收：输出精确为 `平均分: 296.667`，零警告。

修 Bug 题（15 分钟）：下面程序想存一个大数，编译报错附后。按读报错三步定位，用第 7 节的知识修复：

```cpp
#include <cstdint>
#include <iostream>

int main() {
    std::int32_t total{2'500'000'000};
    std::cout << total << '\n';
    return 0;
}
```

```text
narrow2.cpp: In function 'int main()':
narrow2.cpp:5:22: error: narrowing conversion of '2500000000' from 'long long int' to 'int32_t' {aka 'int'} [-Wnarrowing]
    5 |     std::int32_t total{2'500'000'000};
      |                        ^~~~~~~~~~~~~
```

挑战题（半小时）：写 damage.cpp，用 `std::int64_t total` 从 0 起累计单局伤害 2'000'000'000，累加 4 次，每次打印当前累计。先笔算：换成 `std::int32_t` 时第几次累加越过 2147483647？把答案写进注释（越界后是未定义行为，不是确定的负数）。验收：int64_t 版输出 4 行，最后一行 `8000000000`，零警告。

## 13. 与之前和之后的知识的关系

- 往前：030 篇埋的两个坑今天填上——「整数除法截断」（第 1 节兑现）与「换台机器表现可能不同」（第 2 节平台表解释了一半，另一半在链接与内存）；
- 往后：主线 A 到 B 到 C 再到 080——[命名空间与链接](/cpp/050-NamespaceLinkage) 解决「类型承诺如何跨文件兑现」；[Lambda 表达式](/cpp/060-LambdaExpression) 用 `auto` 承接一切；[C++ 引用](/cpp/080-CppReferenceTypes) 把「不复制就借到对象」变成一等公民；
- 更远：[C++ 指针](/cpp/120-CppPointers) 是字节承诺的地址面；[RAII 与资源管理](/cpp/160-RAIIResourceManagement) 让资源类型也遵守承诺；[C++ STL 容器与迭代器](/cpp/240-CppSTLContainersIterators) 的 vector 是裸数组的现代替身。

## 14. 官方文档

- 基础类型与字节数：https://en.cppreference.com/w/cpp/language/types
- 整数字面量与后缀：https://en.cppreference.com/w/cpp/language/integer_literal
- 固定宽度整型（cstdint）：https://en.cppreference.com/w/cpp/types/integer
- 隐式转换规则总表：https://en.cppreference.com/w/cpp/language/implicit_conversion
- auto 类型推导：https://en.cppreference.com/w/cpp/language/auto

## 15. 自我检查

- 能不看笔记写出 sizeof 实验程序，并解释 long 跨平台为什么不同；
- 能预测 `7 / 2` 与 `890 / 3` 的输出，说出「类型决定运算」；
- 能说出 `1L`、`3.14f`、`u8` 各改变什么，以及 `auto s = "hi"` 的真实类型；
- 拿到 narrowing conversion 或 ambiguous 报错，能按三步定位并给出两种修法；
- 能说出什么时候必须换 `<cstdint>` 固定宽度整型。

## 本章总结

类型不是标签，是承诺：占几个字节（sizeof 实验与平台差异表），能做什么运算（整数除法截断、隐式升格）。auto 让编译器记账但会照抄字面量的真面目；后缀 1L/3.14f/u8 当场给数字定性；跨平台数据用 cstdint 固定宽度。花括号初始化与 `-Wall -Wextra -Wconversion` 是你请来的把关人。下一个问题：这些承诺如何跨过文件边界？

## 下一步

进入 [命名空间与链接](/cpp/050-NamespaceLinkage)：两个 .cpp 都定义了叫 helper 的函数，链接器当场炸给你看——同时解开 `std::` 前缀与 `undefined reference` 的身世之谜。
