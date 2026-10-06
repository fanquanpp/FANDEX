---
order: 30
title: 快速上手：人生第一个类 HelloWorld
module: 'java'
category: 后端技术
difficulty: beginner
description: 写下最小可运行的 HelloWorld 并逐行解释；javac 编译与 java 运行两步走、main 方法签名逐词拆解、第一个编译错误与第一个运行时异常的真实报错实录，附修 Bug 练习与包结构预告。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'java/020-JavaOverviewDevEnv'
  - 'java/040-ProgramStructureBasicSyntax'
  - 'java/110-ArrayDetailed'
prerequisites:
  - 'java/020-JavaOverviewDevEnv'
---

## 前置知识

- 已完成 [Java 概述与开发环境](/java/020-JavaOverviewDevEnv)：javac -version 与 java -version 双命令都能出版本号。

## 学习目标

读完本文你将能够：

1. 从零写出最小可运行的 HelloWorld，并逐行说出每个词的作用；
2. 用 javac 与 java 两步跑通程序，并说出每一步的产物；
3. 逐词拆解 main 方法签名 `public static void main(String[] args)`；
4. 区分编译错误与运行时异常，并读懂各自的真实报错；
5. 说出真实项目为什么不用单文件（包结构预告）。

预计 40 到 60 分钟，含 3 组动手实验与 4 道练习。

## 1. 问题引入：为什么必须写在类里

在 Python 里，Hello World 是一行：

```python
print("Hello, World!")
```

到了 Java，同样的愿望要写五行：

```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}
```

多出来的三层「房子」是什么？为什么不像 Python 那样直接写语句？

答案：**Java 的所有代码都必须住在类（class）里**——类是 Java 组织代码的最小单位，把数据和操作装进同一个房子；JVM 以类为单位加载和查找代码，所以程序入口也必须是「某个类里的 main 方法」，可精确定位、全局结构统一，代价只是多敲四行。

还有一条规则现在记下：**类名必须与文件名一致**（上一篇的调试实录里已经撞过一次）。类是什么，[程序结构与基本语法](/java/040-ProgramStructureBasicSyntax) 会讲透；今天先让这五行跑起来。

## 2. 最小可运行示例：逐行拆解

新建一个文件夹（比如 java-lab），在里面创建 Hello.java：

```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}
```

| 行 | 作用 |
| --- | --- |
| 1 `public class Hello {` | 声明一个公开的类，名字叫 Hello，`{` 开始类体 |
| 2 `public static void main(String[] args) {` | 程序入口方法，第 4 节逐词拆解 |
| 3 `System.out.println("Hello, Java!");` | 打印一行并换行，每条语句以分号结尾 |
| 4-5 `}` `}` | 先闭合 main 方法，再闭合 Hello 类 |

两个易碎点：缺分号、类名与文件名不一致，都会编译失败，完整报错在第 5 节。

## 3. 编译与运行：两步走

在该目录打开终端：

```bash
javac Hello.java
```

第一步预期：**没有任何输出**，目录里多出一个 Hello.class（用 dir 或 ls 可见）——这就是上一篇流程图里的字节码。

```bash
java Hello
```

第二步预期：

```text
Hello, Java!
```

三个细节：

1. `java Hello` 后面跟的是**类名**，不带 .class 后缀——JVM 找的是类，不是文件；
2. Java 11 起有单文件捷径 `java Hello.java`（内部临时编译再运行）；学习期建议走两步，看清产物再抄近路；
3. IDEA 里点 main 左侧的绿色三角，效果完全相同——IDE 只是把两步打包成一个按钮，底部运行窗口能看到执行痕迹。

## 4. main 方法签名逐词拆解

`public static void main(String[] args)` 这一行一个词都不能少：

- **public**：公开的——JVM 要从类外调用这个入口（访问控制在 [程序结构与基本语法](/java/040-ProgramStructureBasicSyntax) 细讲，先记住入口要 public）；
- **static**：静态——不需要先创建对象就能调用；JVM 启动瞬间还没有任何对象（对象是什么，[面向对象](/java/150-OOP) 揭晓）；
- **void**：无返回值；要给操作系统设置退出码用 `System.exit(int)`，知道有这回事即可；
- **main**：方法名，JVM 与所有工具约定的入口名字，写成 Main 就找不到；
- **String[] args**：字符串数组参数（String[] 读作「字符串数组」，[数组详解](/java/110-ArrayDetailed) 拆透），装着命令行传给程序的参数。

args 不是摆设，把 main 方法体换成：

```java
System.out.println("收到 " + args.length + " 个参数");
System.out.println("第一个参数是 " + args[0]);
```

运行：

```bash
java Hello Alice
```

预期输出：

```text
收到 1 个参数
第一个参数是 Alice
```

（`+` 此时是把文字连起来，它的完整规则在 [运算符与表达式](/java/080-OperatorExpression) 讲透。）

## 5. 第一个编译错误与第一个运行时异常

### 编译错误：javac 把你拦在门外

故意去掉行尾分号，重新编译 `javac Hello.java`：

```text
Hello.java:3: error: ';' expected
        System.out.println("Hello, Java!")
                                          ^
1 error
```

读报错三步：冒号前是文件与行号；`error:` 后是原因；`^` 指向现场。关键事实：**报错时 Hello.class 根本没有生成**——编译错误被拦在运行之前。

再来一个：把第一行改成 `public class Demo` 但文件仍叫 Hello.java：

```text
Hello.java:1: error: class Demo is public, should be declared in a file named Demo.java
```

### 运行时异常：编译器放行，跑起来才炸

把 main 方法体换成：

```java
int score = Integer.parseInt("九十九");   // 想把文字转成数字
System.out.println(score);
```

`javac Hello.java` **静默通过**——语法完全正确。`java Hello` 运行：

```text
Exception in thread "main" java.lang.NumberFormatException: For input string: "九十九"
        at java.base/java.lang.Integer.parseInt(Integer.java:671)
        at Hello.main(Hello.java:3)
```

（`at` 后的行号随 JDK 版本略有不同，重点是异常类型与你自己的文件行。）

这就是**运行时异常**：编译器管不着语义，「九十九」转不成数字只有运行到那行才暴露。读异常：第一行 = 异常类型 + 原因；每个 `at` 是一层调用记录，**从下往上读**，你自己文件的那行（Hello.java:3）就是案发现场。`Exception in thread "main"` 是运行时异常的标志前缀。

编译错误与运行时异常的分界线，一句话：**javac 拦得住语法的错，拦不住语义的错**。（int 与 Integer.parseInt 只是道具，下一篇起都是主线内容。）

## 6. 修改实验

实验一：把输出改成两行：你的名字、今天的日期。先写预期输出再运行核对。

实验二：运行 `java Hello`（不带参数）。预测会发生什么再运行——你将亲手制造第二个运行时异常：

```text
Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 0 out of bounds for length 0
        at Hello.main(Hello.java:5)
```

读法照旧：数组越界——要第 0 个元素但长度是 0。再用 `java Hello Alice` 带参跑一次对照。

实验三：把输出换成中文「你好，Java」。若在 Windows 老式 cmd 窗口显示乱码，代码没错，是终端编码与 Java 输出编码不一致，见第 7 节错误三。

## 7. 常见错误与调试实录

错误一：println 打成了 printIn（小写 L 写成大写 i，字体里几乎无法分辨）：

```text
Hello.java:3: error: cannot find symbol
        System.out.printIn("Hello, Java!");
                   ^
  symbol:   method printIn(String)
  location: variable out of type PrintStream
1 error
```

`cannot find symbol` = 编译器不认识这个名字。三步：查拼写（printIn 对 println，新手错误榜常年前三）、确认大小写、确认方法存在。九成是拼写，一成是缺少引入（import，后续篇章的主题）。

错误二：`java Hello.class`：

```text
Error: Could not find or load main class Hello.class
```

上一篇已经预告过的规则：javac 跟文件名，java 跟类名——这条报错就是两者的分界线本身。

错误三：中文乱码（Windows）。现象：输出变成 `浣犲ソ` 之类的天书。原因：终端按 GBK 解码，Java 按 UTF-8 输出（Java 18 起源码与输出默认 UTF-8）。快速修：终端切到 UTF-8（`chcp 65001`）或用 IDEA 内置终端运行。记住一条：**乱码先怀疑编码，不要先怀疑自己的逻辑**。

## 8. 从单文件到包结构：预告

真实项目有几百个类，全堆一个文件夹会是灾难。Java 的答案是**包（package）**：用目录给类分家，比如 src/main/java/com/example/score/ScoreBoard.java 里写着 `package com.example.score;`——包声明与目录层级必须一致。标准目录来自 Maven / Gradle，本文只需混个眼熟，[程序结构与基本语法](/java/040-ProgramStructureBasicSyntax) 正式展开。

## 9. 实际项目中的使用场景

- 找 Java 项目的入口 = 找 main 方法。Spring Boot 再庞大，起点也是某个类里的 main（见 [Spring 基础](/java/820-SpringIoCContainerBeansAndDI)）；
- 服务器排障：日志出现 Exception in thread "main" 时，用第 5 节的 at 链读法定位；
- 命令行工具接参数的最原始方式就是 args——实验二就是所有 CLI 工具的雏形。

## 10. 小练习

预测题（5 分钟）：下面程序保存为 Hello.java，运行 `java Hello` 之前写出预期输出；再回答：若保存为 hello.java（小写 h），javac 会输出什么？

```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("A");
        System.out.println("B");
        System.out.println("C");
    }
}
```

（验证：实际跑两次核对。）

修改题（15 分钟）：把程序改成输出三行游戏排行榜，格式如下；完成后要求 javac 零报错、java 输出逐行一致：

```text
1. 星际矿工
2. 方块坠落
3. 长跑小狐
```

修 Bug 题（15 分钟）：下面代码保存为 Save.java，javac 报错如下。按读报错三步定位并修复；再想：当初若保存成 save.java（小写），会多出哪个报错？两种都要修到能跑。

```java
public class Save {
    public static void main(String[] args) {
        System.out.println("存档加载完成")
    }
}
```

```text
Save.java:3: error: ';' expected
        System.out.println("存档加载完成")
                                        ^
1 error
```

挑战题（半小时）：写一个 ScoreBoard 类：main 里用三条 println 输出排行榜前三名，第一名通过命令行参数传入（`java ScoreBoard 星际矿工` 时显示为 星际矿工），第二、三名固定。验收：类名与文件名一致；javac 零报错；带参运行输出三行且第一名是传入的名字。提示（思路）：第一行用 "1. " + args[0] 拼出；展开（关键写法）：字符串拼接用 +，其余照第 2 节模板。分支判断下一篇才讲，本题不需要。

## 11. 与之前和之后的知识的关系

- 往前：[Java 是什么](/java/010-WhatIsJava) 的两步流程今天跑通；[Java 概述与开发环境](/java/020-JavaOverviewDevEnv) 装好的 javac 与 java 第一次真正干活；
- 往后：[程序结构与基本语法](/java/040-ProgramStructureBasicSyntax) 讲透今天所有「混个眼熟」的词（类、public、static、语句、包）；[数组详解](/java/110-ArrayDetailed) 拆透 String[] args；[面向对象](/java/150-OOP) 揭晓 static 为什么是入口的要求；
- 更远：[Spring 基础](/java/820-SpringIoCContainerBeansAndDI) 的启动类就是今天这个 main 的放大版。

## 12. 官方文档

- 官方入门（Getting Started，含 HelloWorld 完整流程）：https://dev.java/learn/getting-started/
- JDK 下载与版本信息：https://jdk.java.net/

## 13. 自我检查

- 能合上文档写出最小 HelloWorld 并一次编译通过；
- 能说出 javac 这一步产生什么、java 这一步吃什么；
- 能逐词解释 main 签名的五个部分，并说出 args 是什么、怎么用；
- 给出一段报错，能判断它是编译错误还是运行时异常（依据：有没有 error: 与行号，有没有 Exception in thread）；
- 能说出真实项目的类为什么用包与目录组织。

## 本章总结

HelloWorld 的五行是 Java 的骨架：所有代码住在类里，入口是类里签名为 public static void main(String[] args) 的方法。javac 编译产出 .class，java 按类名运行；编译错误被 javac 拦在运行前，运行时异常要跑起来才炸，读法是异常类型加从下往上的 at 链。单文件只是起点，包结构在下一篇展开。

## 下一步

进入 [程序结构与基本语法](/java/040-ProgramStructureBasicSyntax)：今天所有「先混个眼熟」的词，下一篇全部讲透。
