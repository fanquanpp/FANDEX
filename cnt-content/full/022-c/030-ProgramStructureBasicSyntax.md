---
order: 30
title: "程序结构与基本语法：main、printf 与分号"
module: 'c'
category: 计算机科学
difficulty: beginner
description: "把 hello.c 的骨架摊开：main 的完整结构、printf 格式化占位符逐个实测、变量与类型初见、三类编译错误原文定位，附修改实验与四型练习。"
author: fanquanpp
updated: '2026-09-12'
related:
  - 'c/020-CLanguageOverview'
  - 'c/040-DataTypeDetailed'
  - 'c/050-VariableConstant'
  - 'c/140-PointerDeep'
prerequisites:
  - 'c/020-CLanguageOverview'
---

## 前置知识

- 已完成 [C 零基础起步](/c/010-CZeroBasisStart) 与 [C 语言概述](/c/020-CLanguageOverview)：gcc 可用、两步走熟练。

## 学习目标

读完本文你将能够：

1. 默写一个最小可编译的 C 程序，并说出每一行的职责；
2. 用 printf 的四个最常用占位符（%d/%s/%f/%c）输出格式化内容，与预期输出逐字核对；
3. 声明 int/float/char 变量并理解「先声明后使用」的纪律；
4. 对三类最常见的编译错误（缺分号、未声明、缺声明）按读报错三步定位修复。

预计 45 到 75 分钟。

## 1. 你现在要解决什么问题

两篇铺垫之后，你已经能「运行」C 程序，但还没「编写」过超过五行的。本文把 hello.c 的骨架摊开，补上变量与格式化输出两块板砖——**学完本篇，你就能写出接收输入、做计算、按格式汇报的完整小程序**，这是 040 篇类型系统与后续一切的前置。

## 2. 最小可运行示例：带输入与计算的成绩单

```c
#include <stdio.h>

int main(void) {
    char name = 'A';           // 一个字符：单引号
    int chinese = 92;          // 整数
    float math = 88.5f;        // 浮点数，f 后缀表示 float 字面量

    float average = (chinese + math) / 2;

    printf("学生：%c\n", name);
    printf("语文：%d  数学：%.1f\n", chinese, math);
    printf("平均分：%.2f\n", average);
    return 0;
}
```

预期输出：

```text
学生：A
语文：92  数学：88.5
平均分：90.25
```

三个新面孔：`%c/%d/%f` 是 printf 的占位符，按顺序替换引号后的变量；`%.1f` 表示保留一位小数；`(chinese + math) / 2` 里的 int 与 float 相加，编译器自动把整数提升为浮点再除——精确规则是 040 篇的主角，此处先记现象。

## 3. 发生了什么：程序的骨架

```text
#include <stdio.h>     ← 预处理指令：引入标准库声明（不是语句，不加分号）
int main(void)         ← 入口函数：程序从这里开始
{                      ← 函数体开始
    ...声明与语句...    ← 每条语句以分号结束
    return 0;          ← 向操作系统报告成功
}                      ← 函数体结束
```

两条纪律从第一天就立好：**标识符（变量名/函数名）只能用字母、数字、下划线且不能以数字开头**；**main 返回 int 是标准写法**。保留关键字（`int`、`return`、`if` 等 32 个 C89 关键字）不能当名字用——`int score;` 合法，`int int;` 必报错。

## 4. 核心概念：printf 的占位符小抄

| 占位符 | 用途 | 示例 | 输出 |
| --- | --- | --- | --- |
| `%d` | 有符号整数 | `printf("%d\n", -3);` | -3 |
| `%f` | 浮点（默认 6 位小数） | `printf("%f\n", 1.5f);` | 1.500000 |
| `%.2f` | 浮点保留 2 位 | `printf("%.2f\n", 1.5);` | 1.50 |
| `%c` | 单个字符 | `printf("%c\n", 'A');` | A |
| `%s` | 字符串 | `printf("%s\n", "hi");` | hi |
| `%%` | 输出百分号本身 | `printf("85%%\n");` | 85% |

占位符与实参**数量、类型都要对齐**——对不齐的后果从编译警告到运行时乱码不等，是 C 的小陷阱之一（040 篇展开）。

## 5. 调试实录：三类高频编译错误

错误一，缺分号：

```text
error: expected ';' before 'return'
```

定位：`^` 指向的位置通常在出错语句的**下一行行首**——回看上一行末尾。

错误二，用了未声明的名字：

```text
error: 'scroe' undeclared (first use in this function)
```

注意 symbol 是 `scroe`——拼写错误占这类报错的九成，对照声明处改名即可。

错误三，在语句之后再声明（C89 规则的残留，现代编译器已放宽但值得知道）：

```text
error: a label can only be part of a statement
```

新手真正的对应场景是「把声明写在 if 块外却以为它在块内可见」——作用域规则在 050 篇展开，本篇记住：**变量只在它所在的大括号内有效**。

## 6. 修改实验

1. 把 `%.2f` 改成 `%.0f`，预测平均分输出（四舍五入还是截断？），运行验证；
2. 增加 `int english = 78;` 并把平均分改为三科，重新编译——体会「改一处、编一次、验一次」的节奏；
3. 故意把 `%d` 对着 `math`（float）用，观察输出异常，再用编译警告 `-Wall` 重编译读警告文本（`format '%d' expects argument of type 'int'`）。

## 7. 小练习

预测题（先写答案再运行）：

```c
printf("%d%%\n", 50);
printf("%c%c\n", 'O', 'K');
printf("A\tB\n");
```

修改题：把成绩单程序改为输出四列对齐的表格（学号、姓名首字母、两科成绩），用 `\t` 对齐，贴出你的预期输出与实际输出对比。

修 Bug 题：下面的程序有三处错（一处语法、一处占位符、一处变量名），编译修到输出 `Sum=30`：

```c
#include <stdio.h>
int main(void) {
    int a = 10
    int b = 20
    int sum = a + b;
    printf("Sum=%d\n", summs);
    return 0;
}
```

挑战题（不看提示）：不查资料写一个程序，用 printf 画出 5 行直角三角形（每行 `*` 递增一颗），只用 `%s` 与 `\n` 完成；再用循环版重写一遍（循环语法 090 篇才教，先照抄 `for` 的模板即可，标注「100 篇内讲透」的是 java 模块——C 的循环在本模块 090 篇）。

## 8. 什么时候应该 / 不应该这样写

应该：每个小程序都带 `return 0;`；占位符与实参逐一对位；格式化宽度（`%5d`、`%.2f`）用在表格输出里。

不应该：用 printf 输出用户可控的字符串当格式串（`printf(userInput)` 是经典安全漏洞——要写 `printf("%s", userInput)`）；在一行里塞多条语句（调试器与断点的死敌）。

## 9. 与之前和之后的知识的关系

- 往前：010 的两步走与 020 的四阶段是本文的运行底座；「退出码」在 `return 0` 处再次现身；
- 往后：[数据类型](/c/040-DataTypeDetailed) 把 int/float/char 的尺寸、范围与转换规则讲透；050 作用域、090 控制流逐步补齐语法骨架；[指针](/cpp/120-CppPointers) 的 cpp 版与 140 的 C 版将解释 `%p` 这个本篇没讲的占位符；
- 更远：printf 的格式串思想在所有语言的日志与格式化里通用（Python 的 f-string 是它的现代化身）。

## 10. 官方文档

- printf 家族权威页（cppreference）：https://en.cppreference.com/w/c/io/printf
- C 关键字总表：https://en.cppreference.com/w/c/keyword

## 11. 自我检查

- 能默写最小程序并通过编译；
- 能用 %d/%s/%f/%c/%.2f 完成一份对齐的成绩单输出；
- 三类编译报错各自知道第一步看哪里；
- 已完成三个修改实验并保留代码在 c-lab 目录。

## 本章总结

main 的骨架、printf 的占位符对位、先声明后使用的纪律，是 C 语法的第一批承重墙。占位符与实参必须数量类型双对齐，编译警告是免费的安全检查（本篇起 `-Wall` 常开）。变量与类型的深水区——尺寸、范围、转换——在下一篇等你。

## 下一步

进入 [数据类型详解](/c/040-DataTypeDetailed)：为什么 int 是 4 字节、char 到底存的是什么，以及整型提升的第一现场。
