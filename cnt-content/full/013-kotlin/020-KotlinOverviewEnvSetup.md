---
order: 20
title: Kotlin 概述与环境搭建：三种玩法
module: 'kotlin'
category: 后端技术
difficulty: beginner
description: 用 Playground、IntelliJ IDEA、命令行 kotlinc 三条路径分别跑通 Kotlin：编译出 jar 并用 java -classpath 运行、弄懂 HelloKt 类名规则、修掉 command not found 与缺 stdlib 的真实报错，附 Gradle 最小结构一句话。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'kotlin/010-WhatIsKotlin'
  - 'kotlin/030-KotlinBasicSyntax'
  - 'kotlin/410-KotlinGradle'
  - 'java/020-JavaOverviewDevEnv'
prerequisites:
  - 'kotlin/010-WhatIsKotlin'
---

## 前置知识

- 已完成 [Kotlin 是什么](/kotlin/010-WhatIsKotlin)：知道 Kotlin 与 Java 同字节码、可互操作，在 Playground 跑过第一个程序。

准备走命令行路线的读者还需要一个能用的 JDK（`java -version` 有输出即可）——安装方法见 [Java 概述与开发环境](/java/020-JavaOverviewDevEnv)。没有 JDK 也没关系，玩法一和玩法二完全不需要它。

## 学习目标

读完本文你将能够：

1. 用三种方式各跑通一次 Kotlin 程序，并说出每种方式适合的场景；
2. 用 kotlinc 把 .kt 编译成 jar，再用 java -classpath 运行它，说清每一步的产物；
3. 解释为什么类名是 HelloKt 而不是 hello，以及这个规则在 Gradle 项目里的呼应；
4. 读懂 `command not found` 与 `NoClassDefFoundError` 两类真实报错，三步内定位修复；
5. 说清 Gradle 的 Kotlin/JVM 最小项目结构，知道正文阶段可以完全不碰它。

预计 40 到 60 分钟，含 3 组动手实验与 4 道练习。

## 1. 问题引入：三种玩法，怎么选

学 Python 时，`python hello.py` 一条命令就能跑，环境问题几乎不存在。Kotlin 的世界要丰富一点：它是编译型语言，又有 JetBrains 自家 IDE 加持，于是形成了三种主流玩法：

| 玩法 | 需要安装 | 适合 | 不适合 |
| --- | --- | --- | --- |
| 在线 Playground | 浏览器 | 试语法、做预测题 | 装第三方库、读文件 |
| IntelliJ IDEA Community | 安装包 | 日常写项目 | 只有手机、想验证一行代码 |
| 命令行 kotlinc | JDK + 编译器 | 理解编译过程、脚本化 | 长期开发（没有补全） |

正确的用法是三种都要会，按场景切换：验证语法用 Playground，正经开发用 IDEA，想看清「Kotlin 到底编译出了什么」时用 kotlinc。下面按上手成本从低到高逐个跑通。

## 2. 玩法一：Playground，零安装先跑起来

打开 https://play.kotlinlang.org ，清空示例，输入并运行：

```kotlin
fun main() {
    val games = listOf("星际矿工", "方块坠落", "长跑小狐")
    for ((rank, name) in games.withIndex()) {
        println("${rank + 1}. $name")
    }
}
```

预期输出：

```text
1. 星际矿工
2. 方块坠落
3. 长跑小狐
```

这段代码里出现了 `listOf`、`for`、解构、字符串模板——先全部当作「混个眼熟」，[基本语法](/kotlin/030-KotlinBasicSyntax) 会逐个讲透。今天它证明的事情只有一件：**你已经有了一个随手可用的 Kotlin 环境**。之后每篇的预测题，都可以先在 Playground 里占个位。

## 3. 玩法二：IntelliJ IDEA，日常主力

IDEA Community（免费版）自带 Kotlin 插件，无需单独安装语言：

1. 从 https://www.jetbrains.com/idea/download 下载 Community Edition 并安装；
2. 新建项目：New Project -> 左侧选 Kotlin -> 填项目名 -> 构建系统先选 IntelliJ（避开 Gradle，下一节再说）-> JDK 一栏选已装的 JDK 或让 IDEA 下载；
3. 在 src 目录新建 Kotlin File/Class，命名为 Main，输入：

```kotlin
fun main() {
    println("Hello, Kotlin!")
}
```

4. 点 main 左侧的绿色三角运行。

预期输出（IDEA 底部 Run 窗口）：

```text
Hello, Kotlin!
```

注意两件事：**没有类**——Kotlin 的 main 是顶层函数，直接住在文件里（为什么可以这样，下一篇展开）；IDEA 同时把 Kotlin 插件、编译器、运行配置全部管理好了，你唯一要做的是写代码和点按钮。日常学习与开发，这个玩法占你 90% 的时间。

## 4. 玩法三：命令行 kotlinc，看清编译产物

IDEA 把编译过程藏进了按钮里。想亲眼看到「.kt 变成了什么」，用官方编译器 kotlinc。安装任选其一：

- Windows：`scoop install kotlin`，或从 https://github.com/JetBrains/kotlin/releases 下载 zip 解压后把 bin 目录加入 PATH；
- macOS / Linux：`sdk install kotlin`（SDKMAN）。

验证安装：

```bash
kotlinc -version
```

预期输出（版本号随你安装的版本不同）：

```text
info: kotlinc-jvm 2.4.20 (JETBRAINS) JRE: 17.0.x
```

新建 hello.kt：

```kotlin
fun main() {
    println("Hello, Kotlin!")
}
```

第一步，编译：

```bash
kotlinc hello.kt -d hello.jar
```

预期：**没有任何输出**，目录里多出一个 hello.jar——`-d` 指定输出文件，kotlinc 默认把代码编译进一个 jar 包。用 `ls` 或 `dir` 确认它存在。

第二步，运行：

```bash
java -classpath "hello.jar:$HOME/.sdkman/candidates/kotlin/current/lib/kotlin-stdlib.jar" HelloKt
```

预期输出：

```text
Hello, Kotlin!
```

三处细节都值得琢磨：

1. **类名是 HelloKt**：文件叫 hello.kt，运行时却要写 HelloKt。规则是——文件里的顶层函数会被编进「文件名首字母大写 + Kt 后缀」的类里，所以 main 的完整身份是 `hello.kt 文件生成的 HelloKt 类的 main 方法`；
2. **classpath 为什么要带 kotlin-stdlib.jar**：`println` 是 Kotlin 标准库的函数，JVM 不认识它，必须把标准库一起交上去（Windows 下分隔符用分号 `;` 而非冒号）；
3. **懒人捷径**：编译时加 `-include-runtime`，标准库会打进 jar，之后 `java -jar hello.jar` 一步运行。发布程序常用它，但学习期建议先用 classpath 版本——多一行命令，换来对产物的清晰认知。

嫌 stdlib 路径太长？这就是构建工具存在的理由：真实项目用 Gradle 管理一切，见下一节。

## 5. Gradle 一句话

真实 Kotlin/JVM 项目的最小骨架只有三个文件：`build.gradle.kts`（声明 `kotlin("jvm")` 插件与依赖）、`src/main/kotlin/`（放你的 .kt）、`src/test/kotlin/`（放测试）。IDEA 新建项目时选 Gradle 就会生成全套，依赖与运行入口全部自动处理，HelloKt 那样的 classpath 拼接再也不用手写。入门阶段了解即可，[Kotlin 与 Gradle 构建](/kotlin/410-KotlinGradle) 有完整教程。

## 6. 修改实验

实验一（Playground）：把第 2 节的排行榜改成五款游戏，用你真实玩过的名字，先写预期输出再运行核对。

实验二（IDEA）：把 main 改成接收参数的版本 `fun main(args: Array<String>)`，方法体输出 `"收到 ${args.size} 个参数"`，然后在 Run Configuration 的 Program arguments 里填两个词再运行，观察输出与参数的对应关系。

实验三（kotlinc）：把 hello.kt 改名保存为 hello_world.kt，重新编译后预测：运行时类名是什么？答案藏在 HelloKt 规则里——Hello_worldKt。跑一遍验证。

## 7. 常见错误与调试实录

错误一：kotlinc 没进 PATH。装完编译器直接敲命令：

```text
bash: kotlinc: command not found
```

Windows 的 cmd 则是：

```text
'kotlinc' 不是内部或外部命令，也不是可运行的程序或批处理文件。
```

读报错三步：`command not found` 意思是「终端在 PATH 列出的所有目录里都没找到 kotlinc 这个可执行文件」；排查：先确认真的装了（Windows 查解压目录、Mac/Linux 查 SDKMAN 是否执行过 install）；再确认 bin 目录加入了 PATH（`echo $PATH` 或 Windows 的环境变量界面）；最后**重开一个终端**让 PATH 生效——改完环境变量不重开终端，是最常见的翻车点。不想折腾就先用玩法一、二，kotlinc 随时可以后补。

错误二：classpath 漏了标准库。只带自己的 jar 运行：

```bash
java -classpath hello.jar HelloKt
```

```text
Exception in thread "main" java.lang.NoClassDefFoundError: kotlin/jvm/internal/Intrinsics
```

`NoClassDefFoundError` 的意思是「运行时要用到某个类，但 classpath 上找不到」——这里缺的是 kotlin/jvm/internal/Intrinsics，它住在 kotlin-stdlib.jar 里。修法：把 stdlib 加进 classpath（第 4 节），或者改用 `-include-runtime` 编译。这个报错模式会陪你一辈子：JVM 报 NoClassDefFoundError，第一反应就是「哪个 jar 没上 classpath」。

错误三：类名大小写或拼写不符。`java -classpath hello.jar hellokt`：

```text
Error: Could not find or load main class hellokt
```

JVM 按精确名字找类，HelloKt 不等于 hellokt。对照第 4 节的命名规则重写即可。这条与 [Java 快速上手](/java/030-QuickStart) 的 `Could not find or load main class Hello` 同根同源——javac/java 的分界规则在 Kotlin 世界依然成立。

## 8. 实际项目中的使用场景

- **团队项目**：IDEA + Gradle 是标准组合，构建与依赖全部由 Gradle 管，成员之间只共享代码与构建脚本；
- **CI 流水线**：服务器上没有 IDEA，靠 `./gradlew build` 或命令行 kotlinc 完成编译，本文第 4 节的每一步就是它的雏形；
- **答疑与评审**：讨论一段语法行为时，双方各自开 Playground 跑一遍，用同一份输出对齐认知，比口头争论快得多。

## 9. 小练习

预测题（5 分钟）：文件 greet.kt 的内容如下，用 kotlinc 编译后，`java -classpath ... ` 运行时类名是什么？写出完整运行命令再实际验证。

```kotlin
fun main() {
    println("环境就绪")
}
```

修改题（10 分钟）：把第 4 节的 hello.kt 改成输出三行你的个人信息（姓名、城市、目标），重新走「编译 -> 运行」两步。验收：kotlinc 零报错，java 输出与预期逐字一致。

修 Bug 题（10 分钟）：同学在装有 JDK 的电脑上执行了 `kotlinc main.kt -d main.jar`，接着运行 `java -classpath main.jar MainKt`，得到如下报错。按读报错三步说出缺了什么，给出两种修法。

```text
Exception in thread "main" java.lang.NoClassDefFoundError: kotlin/jvm/internal/Intrinsics
```

挑战题（20 分钟）：只用命令行环境（不许用 IDEA），写一个 echo.kt：`fun main(args: Array<String>)` 把收到的所有参数用空格连成一行输出（提示：`args.joinToString(" ")`）。验收：`java -classpath ... EchoKt 你好 Kotlin` 输出 `你好 Kotlin`；不带参数运行时输出空行而不是报错。展开（关键写法）：joinToString 是标准库函数，空数组时返回空字符串，天然满足验收。

## 10. 与之前和之后的知识的关系

- 往前：[Kotlin 是什么](/kotlin/010-WhatIsKotlin) 的 Playground 体验在玩法一转正；本文反复出现「字节码、类、classpath」，全部来自 [Java 概述与开发环境](/java/020-JavaOverviewDevEnv) 与 [Java 快速上手](/java/030-QuickStart) 打下的地基；
- 往后：三种环境从此成为你的实验场——[基本语法](/kotlin/030-KotlinBasicSyntax) 的每个知识点都要求先预测再运行，Playground 是最快的验证场；
- 更远：HelloKt 的类名规则会在 [Kotlin 与 Gradle 构建](/kotlin/410-KotlinGradle) 的 mainClass 配置里再次出现（`MainKt`）。

## 11. 官方文档

- 官方入门指南（含 IDEA 与编译器两种起步路线）：https://kotlinlang.org/docs/getting-started.html
- 命令行编译器使用说明（本文 kotlinc 参数的权威出处）：https://kotlinlang.org/docs/command-line.html
- Kotlin Playground：https://play.kotlinlang.org

## 12. 自我检查

- 能不看文档用三种方式各跑通一次程序，并说出各自的适用边界；
- 能解释 `kotlinc hello.kt -d hello.jar` 之后发生了什么：产物是什么、运行时为什么需要 kotlin-stdlib.jar；
- 能说出顶层 main 函数对应的 JVM 类名规则，并在 Gradle 配置里认出 MainKt 的来历；
- 遇到 command not found 与 NoClassDefFoundError，能按三步法定位而不是重新安装碰运气。

## 本章总结

Kotlin 有三种玩法：Playground 零安装试语法，IDEA Community 是日常主力，命令行 kotlinc 让你亲手看到 .kt 编译成 jar、再用 java -classpath（带上 kotlin-stdlib.jar）运行的全过程，类名遵循「文件名大写 + Kt」规则。真实项目收敛到 IDEA + Gradle。command not found 查 PATH 与重开终端，NoClassDefFoundError 查 classpath 缺哪个 jar——这两条读报错经验比环境本身更值钱。

## 下一步

进入 [基本语法](/kotlin/030-KotlinBasicSyntax)：环境已备齐，现在用 fun main、val/var、when 与区间，把 [Java 快速上手](/java/030-QuickStart) 里那五行 HelloWorld 改写成三行。
