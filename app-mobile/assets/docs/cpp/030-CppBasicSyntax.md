---
order: 30
title: 第一个程序与第一颗子弹：基本语法与未定义行为
module: 'cpp'
category: 计算机科学
difficulty: beginner
description: 从空文件夹写出最小 main.cpp 并两步跑通，覆盖语句注释、cin/cout 最小交互与 int main 返回值的意义；再用越界数组实验正式引入未定义行为（UB），附 expected ';' 与 undefined reference to 'main' 两类真实报错的调试实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'cpp/040-CppTypeSystem'
  - 'cpp/050-NamespaceLinkage'
  - 'cpp/080-CppReferenceTypes'
  - 'cpp/120-CppPointers'
prerequisites:
  - 'cpp/020-CppOverviewAndModernStandard'
---

## 前置知识

- 已完成 [C++ 概述与现代标准](/cpp/020-CppOverviewAndModernStandard)：`g++ --version` 能出版本号，知道 `-std=c++23` 开关是干什么的；
- 不需要 C++ 语法基础——变量与类型的完整规则在下一篇 [类型系统](/cpp/040-CppTypeSystem)，本文用到只做最小解释。

## 学习目标

读完本文你将能够：

1. 从空文件夹写出最小可运行的 main.cpp，说出编译与运行两步各自发生了什么；
2. 说出 `int main()` 返回值去了哪里，并在终端里亲眼看到它；
3. 用 `std::cin` / `std::cout` 完成一次最小的人机交互；
4. 读懂 `expected ';'` 与 `undefined reference to 'main'` 两类真实报错，按读报错三步定位；
5. 复现一次越界数组实验，用自己的话解释未定义行为（UB）——C++ 与托管语言的根本差异。

预计 45 到 60 分钟，含 4 组实验、4 道练习。

## 1. 问题引入：第一颗子弹

C++ 之父 Bjarne Stroustrup 有句流传很广的吐槽：「用 C 打穿自己的脚很容易；用 C++ 更难，但一旦打中，整条腿都会炸掉。」今天你同时拿到两样东西：**第一个程序**，和**第一颗子弹**——一段编译通过、结果却不可预测的代码。读完本文你就明白这句吐槽在说什么。

## 2. 最小可运行的 main.cpp

新建一个空文件夹（比如 cpp-lab），在里面创建 main.cpp：

```cpp
#include <iostream>

int main() {
    std::cout << "Hello, C++!" << '\n';
    return 0;
}
```

逐行看：`#include <iostream>` 引入标准库的输入输出工具；`int main()` 是程序入口，操作系统从这里开始执行；`std::cout << ...` 把右侧文字送进标准输出，`std::` 是标准库前缀（050 篇讲透）；`return 0;` 向操作系统报告「正常结束」，第 5 节眼见为实。

语法规则只需三条：**语句以分号结尾；花括号圈代码块；注释两种**——`//` 到行尾，`/* ... */` 跨多行。变量与类型的细节下一篇展开，本文用到的 `int`（整数）与 `std::string`（文本）先会照抄。

## 3. 编译与运行：两步

在该目录打开终端。

第一步，编译（源码翻译成机器码，020 篇的心智模型）：

```bash
g++ -std=c++23 main.cpp -o main
```

预期输出：**没有任何输出**，目录里多出产物 `main`（Windows 的 MinGW 下是 `main.exe`）。没有消息就是好消息——编译器只在不满时才说话。

第二步，运行：

```bash
./main
```

预期输出：

```text
Hello, C++!
```

（Windows 的 cmd 里输入 `main`，Git Bash 里同样用 `./main`。）

两个细节：`-o main` 给产物起名，不写默认叫 `a.out` 或 `a.exe`（Windows）；`./` 表示「当前目录里的这个文件」，不加它 Linux/macOS 会去系统 PATH 里找而找不到。还有一条：改完代码必须**重新编译**再运行，跑的永远是上一次编译的产物。

## 4. 一次最小交互：cin 与 cout

让程序开口问你话。新建 main2.cpp：

```cpp
#include <iostream>
#include <string>

int main() {
    std::string name;
    int age = 0;
    std::cout << "你叫什么? ";
    std::cin >> name;
    std::cout << "几岁? ";
    std::cin >> age;
    std::cout << name << " 今年 " << age << " 岁\n";
    return 0;
}
```

编译运行（`g++ -std=c++23 main2.cpp -o main2`），交互与预期输出（你输入的内容跟在问句后）：

```text
你叫什么? 小狐
几岁? 14
小狐 今年 14 岁
```

- `std::string` 是标准库的字符串类型，先会声明，040 篇讲透；
- `std::cin >> x` 与 cout 方向相反：箭头指向变量，数据流进变量；遇空格就停、读一个词；
- 一条语句可以连读：`std::cin >> name >> age;`。

## 5. int main() 的返回值：给谁看的 0

`return 0` 不是仪式。main 的返回值是程序的**退出码（exit code）**：0 约定为成功，非零约定为出错。Shell 脚本、CI 流水线、构建工具都靠它判断成败。

眼见为实。把 main.cpp 的 `return 0;` 改成 `return 3;`，重新编译运行，再让 shell 报出上一条命令的退出码：

```bash
./main
echo $?
```

预期输出：

```text
3
```

（Windows 的 cmd 用 `echo %ERRORLEVEL%`。）

真实场景：CI 流水线判定「构建失败」，看的就是编译器的退出码——你写下的 return，是整条流水线的信号灯。

## 6. 第一颗子弹：越界数组与未定义行为

新建 bullet.cpp：

```cpp
#include <iostream>

int main() {
    int scores[3] = {90, 85, 77};   // 合法下标只有 0、1、2
    std::cout << "第四个元素: " << scores[3] << '\n';
    return 0;
}
```

先预测再动手：会发生什么？报错？输出 0？崩溃？

编译（`g++ -std=c++23 bullet.cpp -o bullet`）：**静默通过**，一个字都不说（开警告与优化的某些组合会提示下标越界，默认多半沉默）。运行：**结果不可预测**——我这次运行输出了一串与分数无关的随机值，每次还可能不同；换台机器，可能正常打印、可能崩溃、也可能看起来一切正常。

这个现象有正式名字：**未定义行为（Undefined Behavior，UB）**——标准把这类代码的运行结果交给「未定义」，编译器生成什么机器码都合法，操作系统怎么处置都合法。它不是「随机报错」，是彻底放弃承诺。

对照托管语言：Java 越界时 JVM 当场拦下程序，报出 `ArrayIndexOutOfBoundsException` 与行号；Python 抛 `IndexError`。它们为安全付了「每次访问都查边界」的运行时税；C++ 不收这笔税，数组访问没有边界检查——这正是 010 篇零开销抽象的代价面：性能全给你，安全责任也全给你。

三句话钉住概念：

1. UB 的代码编译往往通过——编译器拦得住语法错，拦不住所有作死；
2. UB 的表现不可预测——同一文件，换编译器、换优化级别、换机器，都可能「换一种错法」，最难查；
3. 对策不是背清单，而是换工具——[类型系统](/cpp/040-CppTypeSystem) 讲清规则，240 篇的 `std::vector` 替裸数组（它的 `at()` 会检查越界），130 篇起的智能指针接管内存。

## 7. 常见错误与调试实录

报错一：`expected ';'`。删掉 main.cpp 第 4 行行尾的分号，重新编译：

```text
main.cpp: In function 'int main()':
main.cpp:5:5: error: expected ';' before 'return'
    5 |     return 0;
      |     ^~~~~~
      |     ;
```

读报错三步：文件与行号（main.cpp:5）→ `error:` 后的原因（return 前少了个分号）→ `^` 指向现场。规律：**编译器指的行号是它发现不对劲的地方，真凶常在上一行行尾**。报错时也没有产物生成——编译错误拦在运行之前，与第 6 节的 UB 构成两个极端。

报错二：`undefined reference to 'main'`。写一个没有 main 的文件 lib.cpp，直接编译成可执行文件（`g++ -std=c++23 lib.cpp -o lib`）。典型报错如下（省略随发行版不同的路径前缀；Windows MinGW 下出自 ld.exe，关键词不变）：

```text
/usr/bin/ld: Scrt1.o: in function `_start':
(.text+0x1b): undefined reference to `main'
collect2: error: ld returned 1 exit status
```

读报错三步：报错来自 `ld`（链接器）而非语法检查 → 关键词说「找不到入口 main」→ 两种常见起因：① 文件里真没有 main（拼成 `Main`、`mian` 都算）；② 编译时漏掉了含 main 的源文件（多文件工程在 050 篇展开）。退出码同样非零。

报错三（无声版）：编译失败了，`./main` 却「还能跑」——跑的是上一次编译的旧产物，你以为新改的代码有 bug。习惯：看到 error 先数几条，**从第一条修起**（后面常是连锁反应），零报错后再运行。

## 8. 修改实验

实验一（5 分钟）：把问候改成两行——第一行程序名，第二行你的名字。先写预期输出再运行核对。

实验二（5 分钟）：把 `return 0` 改成 `return 42`，重新编译后用 `echo $?` 验证，再改回 0。

实验三（5 分钟）：把 bullet.cpp 的 `scores[3]` 改成 `scores[2]`，先预测再运行。预期输出 `第四个元素: 77`——合法下标之内，C++ 给你完全确定的世界；边界之外才是未定义。

实验四（10 分钟）：开警告重编译 `g++ -std=c++23 -Wall -Wextra bullet.cpp -o bullet`，看编译器说了什么（部分组合会给出下标越界警告；警告不是报错，但值得逐条读完——`-Wall -Wextra` 从今天起作为默认编译命令）。

## 9. 实际项目中的使用场景

- **退出码是自动化世界的接头暗号**：脚本调用你的 C++ 工具时靠 `$?` 分支；Linux 惯例 0 成功、非 0 各有含义；
- **真实项目里最凶的 bug 往往不报错**：游戏「昨天还好好的，换了优化就崩」，排查心法就是第 6 节——先怀疑越界、未初始化这类 UB，再怀疑逻辑；
- **团队门禁**：`-Wall -Wextra` 零警告是很多团队的上游要求，从第一个程序就养成习惯。

## 10. 小练习

预测题（5 分钟）：不运行，写出下面程序的输出：

```cpp
#include <iostream>

int main() {
    std::cout << "A";
    std::cout << "B" << '\n';
    std::cout << "C" << '\n';
    return 0;
}
```

（验证：跑通后核对——第一行没带换行，A 和 B 挤在一行，输出两行：`AB` 与 `C`。）

修改题（15 分钟）：把第 4 节的交互程序改成问两个问题（最爱的游戏、每周游戏小时数），输出一行自我介绍。验收：交互两轮，输出与预期逐字一致。

修 Bug 题（15 分钟）：下面程序编译报错附后。按读报错三步定位修复，修好后 `-Wall -Wextra` 零警告通过：

```cpp
#include <iostream>

int main() {
    std::cout << "存档加载完成"
    return 0;
}
```

```text
main.cpp: In function 'int main()':
main.cpp:4:5: error: expected ';' before 'return'
    4 |     return 0;
      |     ^~~~~~
```

挑战题（半小时）：写一个 score.cpp：定义长度为 4 的 int 数组存四局分数，用循环求总分与最高分，分别打印。验收：正常版本输出两行，`-Wall -Wextra` 零警告；再故意把循环上界写成 `<= 4` 复现一次 UB，把实际表现写进注释，最后改回 `< 4`。提示：循环骨架 `for (int i = 0; i < 4; ++i) { ... }`，循环体用 `scores[i]` 取元素；for 的逐词拆解本模块中段展开，先照抄骨架。

## 11. 与之前和之后的知识的关系

- 往前：[C++ 是什么](/cpp/010-WhatIsCpp) 的「编译到机器码」模型今天跑通；[C++ 概述与现代标准](/cpp/020-CppOverviewAndModernStandard) 的 `-std=c++23` 开关今天用上；
- 往后：[类型系统](/cpp/040-CppTypeSystem) 讲透今天混眼熟的 int、std::string 与整数除法截断；[命名空间与链接](/cpp/050-NamespaceLinkage) 解开 `std::` 前缀与 `undefined reference` 背后的链接机制；
- 更远：080 与 120 篇的引用、指针把 UB 深水区（悬垂、越界）系统化；160 篇 RAII 之后你会明白，为什么现代 C++ 能把 UB 的高发区基本清零。

## 12. 官方文档

- cppreference 的 main 函数页：https://en.cppreference.com/w/cpp/language/main_function
- isocpp FAQ（含 undefined behavior 条目）：https://isocpp.org/faq
- GCC 警告选项手册：https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html

## 13. 自我检查

- 能从空文件夹在 5 分钟内重建 main.cpp 并两步跑通；
- 能说出退出码 0 与非 0 的约定，并在终端里查到它；
- 能复述 UB 三句话，并举出托管语言在同样场景下的行为；
- 给出 `expected ';'` 或 `undefined reference to 'main'` 的报错，能按三步定位；
- 知道从今天起默认编译命令要带 `-Wall -Wextra`。

## 本章总结

一个 main.cpp、两步命令，你跑通了第一个 C++ 程序：语句以分号结尾，花括号圈代码块，`cin`/`cout` 管交互，main 的返回值是给操作系统与脚本的退出码。第一颗子弹 `scores[3]` 教了最重要的一课：编译器拦得住语法的错（`expected ';'`），拦不住合法但作死的代码（未定义行为）——这是 C++ 与托管语言的根本分界，也是本模块后面所有安全工具（类型系统、vector、智能指针）存在的理由。

## 下一步

进入 [C++ 类型系统](/cpp/040-CppTypeSystem)：int、double、char、bool、std::string 逐一讲透——类型是 C++ 一切规则的起点，也是你读懂除 UB 之外所有报错的地基。
