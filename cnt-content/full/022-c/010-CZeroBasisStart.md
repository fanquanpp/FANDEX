---
order: 10
title: "C 语言零基础起步：从安装编译器到第一次运行"
module: 'c'
category: 计算机科学
difficulty: beginner
description: "手把手完成 C 的第一次编译与运行：装编译器、逐行拆解 hello.c、gcc 两步走、第一个编译错误的定位，并埋下内存与地址的第一颗种子。"
author: fanquanpp
updated: '2026-09-28'
related:
  - 'c/020-CLanguageOverview'
  - 'c/030-ProgramStructureBasicSyntax'
  - 'cpp/010-WhatIsCpp'
prerequisites: []
---

## 前置知识

- 会打开终端并执行命令（[终端与 Shell 基础](/start/040-TerminalAndShellBasics)）。完全零基础也可以跟：本文每个动作都给预期结果。

## 学习目标

读完本文你将能够：

1. 装好 C 编译器并用 `gcc --version` 验证；
2. 写出第一个 hello.c，用「编译、运行」两步看到输出；
3. 说出「编译型语言」与 Python 这类解释型语言在运行方式上的差别；
4. 独立修复第一个编译错误。

预计 45 到 60 分钟。

## 1. 你现在要解决什么问题

你已经会用 Python 写脚本（或正打算学）。为什么还要学 C？因为**今天跑在你手机、路由器、汽车里的底层代码，一半以上是 C**——Linux 内核、Python 解释器本身、你手机里的基带固件，都是 C 写的。学 C 不是为了天天用它，而是为了看清「程序与硬件之间到底发生了什么」：C 里没有魔法，每个字节你都看得见。

而 C 与 Python 的第一处不同在你按下回车之前就出现了：**C 代码必须先「编译」成机器指令才能运行**。装的第一件工具因此不是解释器，而是**编译器**——gcc（GNU Compiler Collection）是事实标准。

## 2. 最小可运行示例：装好工具并验证

Windows 用 winget，macOS 用 brew（命令行开发者工具自带 clang，行为与 gcc 兼容），Linux 用 apt：

```bash
# Windows
winget install -e --id BrechtSanders.WinLibs.POSIX.UCRT
# macOS（装 Xcode 命令行工具，内含 clang）
xcode-select --install
# Linux (Ubuntu/Debian)
sudo apt install build-essential
```

新开终端验证（**必须新开**——已开的终端感知不到新装的程序，原因在 PATH 机制）：

```bash
gcc --version
```

预期输出（版本号因机器而异）：

```text
gcc (WinLibs ...) 14.2.0
Copyright (C) 2024 Free Software Foundation, Inc.
```

## 3. 发生了什么：第一个程序与编译两步走

新建目录 `c-lab`，写入 `hello.c`：

```c
#include <stdio.h>

int main(void) {
    printf("Hello, C!\n");
    return 0;
}
```

在终端里执行两步：

```bash
gcc hello.c -o hello
./hello
```

预期输出：

```text
Hello, C!
```

对照 Python 的一步直跑，C 多出的第一步就是**编译**：gcc 把人类可读的 `hello.c` 翻译成 CPU 能直接执行的机器指令，`-o hello` 给产物起名。这条产物是真正的可执行文件——把它拷到别的电脑（同系统）不需要源码也能跑。这也是 [C 与 C++ 概览](/c/020-CLanguageOverview) 里「无虚拟机」含义的现场版：没有中间人，性能的上限和责任的下限都归你。

## 4. 逐行拆解 hello.c

- `#include <stdio.h>`：声明「我要用标准输入输出库里的 printf」——尖括号表示它随编译器自带；
- `int main(void)`：每个 C 程序的入口。`int` 表示程序结束后向操作系统报告一个整数（`return 0` 即「成功」，回收你可能在 shell 里见过的「退出码」）；
- `printf("Hello, C!\n");`：向标准输出打印，`\n` 是换行符——没有它，下一段输出会接在同一行；
- `return 0;`：main 的返回，程序到此结束。

每个语句以分号结束、代码块用大括号包裹——与 Java/C++ 同款风格，与 Python 的缩进哲学对照着记。

## 5. 调试实录：你的第一个编译错误

把 `printf` 手滑写成小写分号缺失的版本再编译：

```c
printf("Hello, C!")
```

预期报错（gcc 真实文本节选）：

```text
hello.c: In function 'main':
hello.c:5:20: error: expected ';' before '}' token
    5 |     printf("Hello, C!")
      |                      ^
      |                      ;
```

读法与所有编译报错一致：`hello.c:5:20` 是「文件：行：列」坐标，`^` 指出事发现场，`expected ';'` 是诊断——**它甚至会替你把分号的位置标出来**。补上分号重编译即可。编译错误不可怕：它发生在程序运行之前，是所有报错里最温和的一种。

## 6. 修改实验

1. 把 `\n` 删掉，编译运行，观察输出与终端提示符挤在同一行；
2. 再加一行 `printf("I am learning C.\n");`，重新两步走——体会「改代码必须重新编译」这个编译型语言的基本节奏；
3. 把 `int main` 改成 `int main(void)` 与 `int main()` 两种写法各编译一次（都能过；差异在 030 篇之后值得回来想）。

## 7. 小练习

预测题：下面的程序编译能过吗？运行输出什么？

```c
#include <stdio.h>
int main(void) {
    printf("A");
    printf("B\n");
    printf("C");
}
```

修改题：让程序输出三行你的名字、今天日期、一句目标（如 `2027-06: ship my first CLI`），并编译运行验证。

修 Bug 题：下面代码编译报 `expected ';'` 与 `undeclared identifier` 两条错，找出全部三处问题（两处拼写、一处结构）：

```c
#include <stdio.h>
int main(void) {
    printg("start\n")
    pritnf("end\n");
    return 0
}
```

挑战题（不看提示）：把 `hello.c` 用 `-o` 输出成 `hello-v2` 再运行；然后把源文件改名为 `hello2.c`，重新编译——回答：可执行文件的名字由什么决定？源文件名影响它吗？

## 8. 什么时候应该 / 不应该直接学 C

应该：目标方向是嵌入式、操作系统、性能工程，或想真正理解内存与编译；已会一门语言、想补「底层视角」。

不应该：把 C 当第一门语言却只想快速做出网页与脚本（Python/JS 反馈更快，见 [选主线](/start/070-FirstProgramPython)）；期待 C 里有丰富的内置容器与包管理（它的标准库极小，这是特性也是门槛）。

## 9. 与之前和之后的知识的关系

- 往前：start 模块的终端与 PATH 知识在装编译器时立刻兑现；「退出码」概念在 `return 0` 处回收；
- 往后：[C 语言概述](/c/020-CLanguageOverview) 回答「这门语言信奉什么」，[程序结构](/c/030-ProgramStructureBasicSyntax) 开始正式语法；040 起的类型与 200 篇的动态内存是 C 的两大主角；
- 更远：本仓库 cpp 模块的第一篇就是「C++ 与 C 的关系」——学完 C 入门链再读它，会事半功倍。

## 10. 官方文档

- GCC 官方手册：https://gcc.gnu.org/onlinedocs/
- C 语言参考（cppreference C 版）：https://en.cppreference.com/w/c

## 11. 自我检查

- 能不看教程完成「装 gcc、写 hello.c、两步运行」全流程；
- 能说出编译型与解释型在运行方式上的一句话差别；
- 能读懂一条 `文件:行:列 + 诊断` 格式的编译报错并修复；
- 已完成三个修改实验。

## 本章总结

C 的第一课不是语法而是节奏：写代码 → 编译 → 运行，改一下就重来一遍。gcc 是翻译官，编译错误是最早也最便宜的反馈，`main` 的返回值在与操作系统的对话里意义重大。工具已就位，下一页我们回答「C 为什么长这样」。

## 下一步

进入 [C 语言概述](/c/020-CLanguageOverview)：这门语言的设计哲学、标准演进与它的疆域。
