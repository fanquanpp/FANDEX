---
order: 20
title: 现代 C++ 与三次大版本：C++11、C++20、C++23 各带来了什么
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: 以「同样自称 C++ 的两份代码隔着二十五年」引入，按每版三个用户可感知特性讲清三次大版本，覆盖编译器三件套与 -std=c++23 开关、包管理现实与本模块学习主线，附新旧写法对比实验与真实编译报错。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'cpp/010-WhatIsCpp'
  - 'cpp/030-CppBasicSyntax'
  - 'cpp/640-CppToolchain'
  - 'cpp/730-Cpp23NewFeatures'
  - 'cpp/750-CppModernStandardEvolution'
  - 'c/020-CLanguageOverview'
prerequisites:
  - 'cpp/010-WhatIsCpp'
---

## 前置知识

- 已完成 [C++ 是什么](/cpp/010-WhatIsCpp)：知道 C++ 直接编译到机器码、教学基准是 C++23。

与 [C 语言模块](/c/020-CLanguageOverview) 的关系一句话：C++ 兼容 C，C 模块的内存与指针知识在本模块 040 之后反复借用，但**不需要先学完 C 再来**，两线并行即可。工具链也共用：复用 [C 语言零基础起步](/c/010-CZeroBasisStart) 的环境章节，装完用第 3 节一行命令验证。

## 学习目标

读完本文你将能够：

1. 说出 C++11、C++20、C++23 各 3 个用户可感知的特性，并用一个词概括每次大版本解决的核心矛盾；
2. 在 GCC、Clang、MSVC 三件套里认出自己机器上的编译器，并解释 `-std=c++23` 开关的作用；
3. 用一行命令验证本机工具链可用，并对「教程代码跑不过」执行三问排查；
4. 说出 C++ 没有官方包管理器的现状，以及 vcpkg 与 Conan 两个事实标准；
5. 按本模块主线排出学习顺序，知道下一站是什么。

预计 40 到 55 分钟，含 1 组新旧对比实验与 4 道练习。

## 1. 问题引入：都叫 C++，隔着二十五年

你搜「C++ 教程」，找到两份代码，都自称 C++。教材 A 满是 1998 年定稿的老写法：原生数组、手写下标、`i < 3` 这样的循环边界：

```cpp
// 教材 A
#include <iostream>

int main() {
    int scores[3] = {90, 85, 77};
    int total = 0;
    for (int i = 0; i < 3; ++i) {
        total += scores[i];
    }
    std::cout << "总分: " << total << std::endl;
    return 0;
}
```

2023 年的现代风格核心只有三行：`std::vector scores = {90, 85, 77};`、范围 for 循环、`std::cout << "总分: " << total << '\n';`——**两份都对，隔着二十五年**。你抄的老教材没有骗你，只是老了。本文回答：「现代」指哪些版本、每版带来了什么、怎么让编译器按新版规则编译你的代码。

## 2. 三次大版本，各解决了什么矛盾

标准每三年一版，小版本（C++14、C++17）负责打磨，大版本（C++11、C++20、C++23）上主菜，每个大版本都在解决一个当时的核心矛盾。

**C++11（2011）：让 C++ 配得上「现代」二字。**1998 年第一版标准后语言十多年没大更新，C++11 一次性补齐，社区公认「现代 C++ 从这里开始」。挑 3 个每天都用得到的：

- `auto`：让编译器替你写类型。`auto total = 0;` 编译器知道它是 int——类型名一长就是几十个字符，这是救命稻草；
- 范围 for：`for (int score : scores)` 遍历容器不用再手写下标与边界，少一个出 bug 的位置；
- 智能指针 `std::unique_ptr` / `std::shared_ptr`：对象用完自动释放，「手动 delete」从日常代码退场（本模块 130 到 150 篇的主角）。

（lambda、移动语义、nullptr 同样重要，用到时再学。）

**C++20（2020）：让代码「说出意图」。**标准库终于有了属于这个时代的表达方式：

- `std::format`：告别 `%s`、`%d` 格式符，`std::format("玩家 {} 得了 {} 分", name, score)` 按顺序填占位符；
- Ranges：`scores | std::views::filter(...)` 管道式数据处理，代码读起来像在描述「要什么」而不是「怎么循环」；
- `std::span`：把「一段数组」传给函数不再退化成裸指针——带着长度走，越界风险减半。

**C++23（定稿为 ISO/IEC 14882:2024）：把日常琐事变一行。**

- `std::println`：一行打印加换行，连 `<<` 都省了（需要较新编译器，见第 7 节报错一）；
- `std::expected`：函数「成功返回值、失败返回原因」有了标准表达，错误处理不再靠返回码约定；
- `std::ranges::to`：过滤、转换后的结果一行收进容器，`views | ... | std::ranges::to<std::vector>()` 一气呵成。

完整清单不背年表，专题在 [C++23 新特性](/cpp/730-Cpp23NewFeatures) 与 [现代标准演进](/cpp/750-CppModernStandardEvolution)；下一版 C++26 仍在流程中，状态以 [isocpp.org](https://isocpp.org/) 为准。

## 3. 编译器三件套与 -std=c++23 开关

代码不直接运行，先由编译器翻译成机器码（010 篇的心智模型）。主流编译器三家：

| 编译器 | 常见出没地 | 命令长什么样 |
| --- | --- | --- |
| GCC（g++） | Linux 默认、Windows 的 MinGW-w64、本仓库教学用 | `g++ -std=c++23 main.cpp -o main` |
| Clang（clang++） | macOS 默认，错误信息最友好 | `clang++ -std=c++23 main.cpp -o main` |
| MSVC（cl） | Windows + Visual Studio | `cl /std:c++latest main.cpp` |

`-std=c++23` 是「请按 2023 版的语言规则来编译」的开关。**不加它，g++ 用偏保守的默认标准**，本文不少特性会报「不存在」——不是代码错，是编译器还在用旧规则读你的新代码。

验证一行（环境装好后执行）：

```bash
g++ --version
```

预期输出（文字因平台而异，重点是能出版本号）：

```text
g++ (Rev3, Built by MSYS2 project) 14.2.0
```

注意版本数字：GCC 13 及以下对 C++23 支持不全（`std::println` 要 GCC 14 起才有）。版本不够就先用兼容子集学，或升级编译器——见第 7 节三问排查。

## 4. 包管理的现实

一句话：**C++ 没有像 pip、npm 那样的官方包管理器**，事实标准是微软的 vcpkg 与老牌社区方案 Conan。第三方库的安装与构建（CMake）在 [C++ 工具链](/cpp/640-CppToolchain) 与项目实践篇展开——本模块前半程零第三方依赖，全用标准库，先练语言本身。

## 5. 学习路径：本模块主线怎么走

本模块 70 余篇不需要按编号全读，主线这样走（顺序不跳）：

```text
010 定位 → 本文 → 030 第一个程序与 UB → 040 类型系统 → 050 命名空间与链接
→ 080 引用 → 120 指针 → 130/140/150/160 智能指针与 RAII → 200/220 面向对象
→ 240 STL 容器与迭代器 → 330 模板
```

可以第二遍再读的：090 到 110 的移动语义三连（读完 080/120 回头更顺）、350 起的模板元编程、430 起的并发、730 起的新特性专题。

## 6. 修改实验：同一件事的 1998 与 2023 写法

把第 1 节的教材 A 保存为 `score_old.cpp`，现代版保存为 `score_new.cpp`：

```cpp
// score_new.cpp —— 2023 年风格
#include <iostream>
#include <vector>

int main() {
    std::vector scores = {90, 85, 77};
    int total = 0;
    for (int score : scores) {
        total += score;
    }
    std::cout << "总分: " << total << '\n';
}
```

两段都能直接编译运行（新版需要 GCC 9 起的类模板参数推导支持），预期输出相同：

```text
总分: 252
```

机器码层面两段几乎一样快——零开销抽象意味着高级写法不为可读性交性能税。区别在出错面：新写法少了两个能出 bug 的位置——手写的循环边界 `i < 3`，和硬编码的魔法数字 `3`（容器自己知道自己多长）。

实验一：给 `score_new.cpp` 的 `scores` 再加两个分数，重编译运行，现代版一处不用改；给 `score_old.cpp` 做同样的事，你必须同步把 `i < 3` 改成 `i < 5`——忘改就是下一篇的「越界」。

实验二：把 `score_old.cpp` 的循环上界改成 `i < 5`（数组还是 3 个元素），编译并运行。编译大概率通过，输出却不可预测——这个现象有正式名字「未定义行为」，[基本语法与第一个程序](/cpp/030-CppBasicSyntax) 把它当头号主题，这里先撞见一次。

## 7. 常见错误与调试实录

错误一：编译器太旧，新特性不存在。在 GCC 13 的机器上编译含 `#include <print>` 的程序：

```text
fatal error: print: No such file or directory
    1 | #include <print>
      |          ^~~~~~~
compilation terminated.
```

读报错三步：`fatal error` 指出哪个头文件找不到 → 查该头文件需要哪个编译器版本（cppreference 的 Compiler Support 页面）→ 升级编译器，或先用旧等价写法（`std::cout`）。本文示例都标注了版本要求。

错误二：忘了 `-std` 开关。用旧标准编译含新特性的代码：

```text
error: 'std::format' is not a member of 'std'
```

（不同编译器与版本的附带提示略有差异，有的会注明该特性从哪个标准起可用。）编译器意思很直白：特性属于更新的标准，加 `-std=c++20` 或更高重新编译。

错误三（方法论）：「教程代码跑不过」的环境问题，固化成三问排查，九成卡不出去：① 我的编译器什么版本（`g++ --version`）；② 编译命令带 `-std` 了吗；③ 这段示例要求的最低版本是多少。三问都过了还报错，才轮到怀疑代码。

## 8. 小练习

预测题（5 分钟）：不运行，写出下面程序的输出：

```cpp
#include <iostream>
#include <vector>

int main() {
    std::vector scores = {4, 8, 15, 16, 23};
    int total = 0;
    for (int n : scores) {
        total += n;
    }
    std::cout << total << '\n';
}
```

（验证：跑通后核对，输出 `66`。）

修改题（15 分钟）：把上面程序改成输出「平均分: 13」一行。提示：整数除法会截断小数（规则在 [类型系统](/cpp/040-CppTypeSystem) 展开，此处行为先记住）。验收：输出与预期逐字一致。

修 Bug 题（15 分钟）：小张的代码在同事机器编译通过，在他机器上（GCC 13，命令没带 `-std`）报错如下。按三问排查法定位，给出两个可行修复：

```text
error: 'std::println' has not been declared
```

挑战题（半小时，不查资料）：制作你自己的「现代 C++ 速查卡」：左栏写 auto、范围 for、智能指针、std::format、std::span、std::println 六个名字，右栏各用一句话写「它替我省掉了什么手工劳动」。验收：每句不超过 20 字，写完再回看第 2 节核对。提示：每个特性都在消灭一种重复劳动；展开：智能指针消灭手写 delete，format 消灭格式符对齐。

## 9. 实际项目中的使用场景

- **判断项目的「年代」**：看构建脚本里的 `-std=` 参数——C++11/14 多半是老项目，C++20/23 是近年新建项目的主流；
- **读代码识风格**：满屏 `char*`、`printf`、手写 `new/delete` 多半是 C 遗产或老教材；`auto`、范围 for、智能指针密集出现才是现代代码；
- **团队选型**：个人学习 GCC 足够；Windows 商业项目常用 MSVC；跨平台大项目用 CMake 统一构建，三编译器都测。

## 10. 与之前和之后的知识的关系

- 往前：[C++ 是什么](/cpp/010-WhatIsCpp) 给了定位与版本基准，本文把它落成三次大版本、工具链与学习路线；
- 往后：[基本语法与第一个程序](/cpp/030-CppBasicSyntax) 亲手跑通两步编译并正面遭遇未定义行为；[类型系统](/cpp/040-CppTypeSystem) 补全 `auto` 背后的推导规则与整数除法；
- 更远：[C++ 工具链](/cpp/640-CppToolchain) 展开本文一句带过的 CMake 与包管理，730 与 750 篇把本文的版本速览挖成专题。

## 11. 官方文档

- isocpp 各标准状态页：https://isocpp.org/std/status
- cppreference 编译器支持表（查「我的编译器支持这个特性吗」）：https://en.cppreference.com/w/cpp/compiler_support
- GCC 在线手册：https://gcc.gnu.org/onlinedocs/

## 12. 自我检查

- 能说出三个大版本各自的关键词（现代起点 / 说出意图 / 琐事变一行）与每版 3 个特性；
- 能解释 `-std=c++23` 不加会怎样，并现场演示验证命令；
- 遇到「教程代码跑不过」能执行三问排查；
- 能说出 vcpkg 与 Conan 是什么、本模块前半程为什么不用它们；
- 能说出下一站是 030，以及哪几章可以第二遍再读。

## 本章总结

「现代 C++」由三次大版本定义：C++11 补齐现代语言的基本盘（auto、范围 for、智能指针），C++20 让代码说出意图（format、Ranges、span），C++23 把琐事变一行（println、expected、ranges::to）。编译器三件套 GCC/Clang/MSVC 都靠 `-std=` 开关切换语言规则；包管理没有官方方案，vcpkg 与 Conan 是事实标准。工具链版本与开关，是「教程代码跑不过」的头两问。

## 下一步

进入 [基本语法与第一个程序](/cpp/030-CppBasicSyntax)：从空文件夹写出 main.cpp，两步跑通，再用一次越界实验理解「未定义行为」——C++ 与托管语言的根本分界线。
