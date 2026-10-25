---
order: 30
title: Kotlin 基本语法：从三行 main 到 when 与区间
module: 'kotlin'
category: 后端技术
difficulty: beginner
description: 以三行 HelloWorld 起步，用游戏战绩程序讲透 Kotlin 基础语法：val/var 与不可变优先、类型推断、字符串模板、if/when 表达式、for 与区间，附 unresolved reference 真实报错实录与四道练习。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'kotlin/020-KotlinOverviewEnvSetup'
  - 'kotlin/040-KotlinFunctionAndLambda'
  - 'kotlin/050-KotlinClassObject'
  - 'java/070-VariableConstant'
prerequisites:
  - 'kotlin/020-KotlinOverviewEnvSetup'
---

## 前置知识

- 已完成 [Kotlin 概述与环境搭建](/kotlin/020-KotlinOverviewEnvSetup)：三种玩法里至少一种能在你手上跑出 Hello, Kotlin!;
- 读过 [Java 的变量与常量](/java/070-VariableConstant) 更好：本文会对照 `final` 讲 `val`，没读过也不影响。

## 学习目标

读完本文你将能够：

1. 写出并运行 `fun main`，解释 Kotlin 为什么不需要外层类；
2. 在 `val` 与 `var` 之间做出正确选择，说出「不可变优先」的工程理由；
3. 用字符串模板把变量与表达式嵌进文本，替代字符串拼接；
4. 用 if 与 when 表达式改写 Java 的三元运算符和 switch，用 for 加区间写出正序、倒序、带步长的循环；
5. 读懂 `unresolved reference` 报错并三步定位拼写或导入问题。

预计 45 到 60 分钟，含 3 组动手实验与 4 道练习。

## 1. 问题引入：Hello World 只剩三行

[Java 快速上手](/java/030-QuickStart) 里，Hello World 是五行：类是 JVM 加载代码的单位，main 必须是「某个类里的 static 方法」，所以要多敲四行「房子」。

Kotlin 编译器替你干了这件事：**顶层函数**（不写在任何类里的函数）会被自动装进一个编译器生成的类——这正是上一篇运行时必须写 `HelloKt` 的原因。于是房子还在，只是你不用亲手搭：

```kotlin
fun main() {
    println("Hello, Kotlin!")
}
```

预期输出：

```text
Hello, Kotlin!
```

三个词拆开：`fun` 声明函数；`main` 是入口约定名，与 Java 一致；圆括号里连参数都可省——需要读命令行参数时写 `fun main(args: Array<String>)`。每条语句结尾**不加分号**，换行即是结束。

## 2. val 与 var：不可变优先

变量只有两种声明方式：

```kotlin
val playerName = "小狐"        // val：只读，赋值后不能再换
var score = 0                  // var：可变，可以重新赋值

score = 5050                   // 合法
// playerName = "阿狸"         // 编译错误：val cannot be reassigned
```

选择规则一句话：**默认写 val，只有确认这个值在程序运行中会被重新赋值时才用 var**。这不是洁癖，是把「什么会变」显式写在代码里——读代码时看到 val 就知道这行以下不用再追踪它的变化，排查 bug 的搜索空间直接减半。

对照 Java：`val` 大致等于 `final` 局部变量，但 Kotlin 把默认倒了过来——不可变是常态，可变是例外。注意 `val` 冻结的是**引用**而非对象：`val list = mutableListOf(1)` 之后仍可 `list.add(2)`，这条边界在 [Kotlin 类与对象](/kotlin/050-KotlinClassObject) 展开。

## 3. 类型推断：写类型是例外

上面两行代码没有任何类型标注，但 `playerName` 是 `String`、`score` 是 `Int`——编译器从初始值**推断**类型，推断发生在编译期，Kotlin 依然是强静态类型语言。

什么时候仍然手写类型？两种情况：

```kotlin
val ratio: Double = 2            // 初始值看不出目标类型时（否则推断为 Int）
val nickname: String? = null     // 值为 null 时必须写类型（String? 见空安全篇）
```

推断不是类型消失，而是省略——IDEA 把鼠标悬停在变量上，推断结果立刻显示。

## 4. 字符串模板：告别加号拼接

Java 里拼一句带变量的输出要写 `"玩家 " + name + " 得分 " + score`。Kotlin 用字符串模板：

```kotlin
fun main() {
    val playerName = "小狐"
    val score = 5050
    val winRate = 0.68

    println("玩家 $playerName 本季得分 $score")
    println("胜率 ${winRate * 100}%")
    println("名字长度 ${playerName.length}，评级 ${if (score > 4000) "S" else "A"}")
}
```

预期输出：

```text
玩家 小狐 本季得分 5050
胜率 68.0%
名字长度 2，评级 S
```

规则：`$变量名` 插入变量；`$` 后跟表达式时用花括号包住 `${...}`，花括号里可以放方法调用甚至 if 表达式。要输出美元符号本身时写 `\$` 转义。

## 5. if 与 when：表达式化的条件

### 5.1 if 是表达式，有返回值

Java 的三元 `a > b ? a : b` 在 Kotlin 里就是 if 本身——**每个 if 都是表达式，最后一个表达式的值就是它的值**：

```kotlin
val a = 12
val b = 30
val max = if (a > b) a else b
println("较大值 $max")          // 较大值 30
```

多分支版本把每个分支最后一句写成值即可。

### 5.2 when 比 switch 强在哪

Java 的 switch 只能匹配少数常量，还要记得写 break。Kotlin 的 when 分支可以匹配常量、区间、类型，甚至不带判断对象；分支之间天然互斥，没有 fall-through：

```kotlin
fun main() {
    val score = 85

    val grade = when (score) {
        in 90..100 -> "S"
        in 80..89 -> "A"
        in 60..79 -> "B"
        else -> "C"
    }
    println("得分 $score，评级 $grade")     // 得分 85，评级 A

    // 分支还能并列匹配多个值：写成 "SAVE", "S" -> println("存档")
}
```

预期输出：

```text
得分 85，评级 A
```

两条纪律：作为表达式使用时必须穷尽所有情况，漏分支在编译期就被抓住，而不是靠测试发现；`in 90..100` 的区间下一节讲。when 与密封类组合的穷尽匹配是 Kotlin 的招牌能力，先在 [密封类与密封接口](/kotlin/160-SealedClassSealedInterface) 混个眼熟。

## 6. for 与区间

Kotlin 没有 Java 的三段式 `for (int i = 0; i < n; i++)`，取而代之的是 for 加区间：

```kotlin
fun main() {
    val games = listOf("星际矿工", "方块坠落", "长跑小狐")

    for (name in games) {                 // 遍历集合
        println("打卡：$name")
    }

    for (i in 1..3) println("第 $i 名")   // 闭区间，含 3
    for (i in 0 until 3) print("$i ")     // 半开区间，不含 3
    println()
    for (i in 3 downTo 1 step 2) print("$i ")   // 倒序带步长
    println()
    println(50 in 1..100)                 // 区间还能当判断用
}
```

预期输出：

```text
打卡：星际矿工
打卡：方块坠落
打卡：长跑小狐
第 1 名
第 2 名
第 3 名
0 1 2 
3 1 
true
```

记住四个构件：`a..b` 闭区间、`until` 不含末端、`downTo` 倒序、`step` 步长；`in` 还能做成员判断（5.2 节的 when 分支就是这么写的）。`while` 与 Java 语义一致，不再展开。

## 7. 修改实验

实验一：把第 4 节程序加上一行 `var gamesPlayed = 0`，在输出前自增三次，最后用模板打印「已打 $gamesPlayed 局」。先写预期输出再运行。

实验二：把第 5.2 节的评级表改四级：90 以上 SS、80 到 89 S、70 到 79 A、其余 B，并用 90、89、70 三个分数各跑一遍验证边界。

实验三：把第 6 节的排行榜改成倒序打印（第 3 名在前），只允许改区间写法。提示：`games.size` 与 `downTo` 配合时要处理好索引 0 的边界。

## 8. 常见错误与调试实录

错误一：unresolved reference。在 main 里手滑打成 printline：

```kotlin
fun main() {
    printline("Hello, Kotlin!")
}
```

kotlinc 的真实报错：

```text
Main.kt:2:5: error: unresolved reference: printline
```

IDEA 中则是红色波浪线加提示 `Unresolved reference 'printline'`，文字略有差异、语义完全一致。读报错三步：`Main.kt:2:5` 是文件、行、列，直接跳到现场；`unresolved reference` 意思是「这个名字在当前可见范围内不存在」；定位后分三种情况处理——九成是拼写（printline 对 println，新手错误榜常年前三），少数是需要 import 的类或函数，最后一种才是真的没定义。这条报错与 Java 的 cannot find symbol 是同一件事的两种说法。

错误二：val 重新赋值：

```text
error: val cannot be reassigned
```

先问自己「这个值真的会变吗」：会变，改 var；不会变，删掉那行赋值。编译器在替你执行不可变优先。

错误三：when 表达式缺分支。删掉 5.2 节 `val grade = when ...` 的 `else` 分支：

```text
error: 'when' expression must be exhaustive, add necessary 'else' branch
```

报错即保护：表达式必须有值，编译器不允许「分数 45 时 grade 没有值」的洞存在，补上 else 即可。

## 9. 实际项目中的使用场景

- 命令行工具的输出格式化靠字符串模板，指令分发靠 when 的多分支匹配；
- 服务端日志拼装：`"订单 ${order.id} 状态异常：${order.status}"` 比加号拼接少一半引号错误；
- 报表里「按区间分级」的逻辑，when 加区间两行搞定，漏分支被编译器拦下。

## 10. 小练习

预测题（5 分钟）：先写预期输出，再到 Playground 验证。

```kotlin
fun main() {
    val hp = 30
    val tag = if (hp > 50) "安全" else if (hp > 20) "警戒" else "危险"
    println("状态：$tag")
    for (i in 4 downTo 1 step 2) print("$i ")
}
```

修改题（10 分钟）：写两名玩家的分数：`val score1 = 92` 与 `val score2 = 73`，用 for 遍历 `listOf(score1, score2)` 输出两行「得分 x，评级 y」，评级用 when 表达式（90 以上 S、其余 A）。验收：两行输出、评级与区间边界正确。

修 Bug 题（10 分钟）：下面的代码想输出倒计时三二一，编译报错原文如下。先按读报错三步修掉报错；再回答：`for (i in 3..1)` 的循环体会执行几次？区间方向反了编译器不报错，只会得到一个空区间——这类静默 bug 要靠预测抓住。修复后运行验证。

```kotlin
fun main() {
    for (i in 3..1) {
        println("倒计时 $i")
    }
    prntln("发射")
}
```

```text
Main.kt:4:5: error: unresolved reference: prntln
```

挑战题（20 分钟）：写一个 FizzBuzz 变体程序：`fun main()` 里 for 遍历 1..15，用 when 输出每个数字，规则是能被 3 整除输出 Fizz、能被 5 整除输出 Buzz、同时整除输出 FizzBuzz、否则输出数字本身。验收：第 15 行输出 FizzBuzz、第 9 行输出 Fizz、第 10 行输出 Buzz。提示：when 可以不带判断对象，分支条件写成布尔表达式；展开（关键写法）：`when { i % 15 == 0 -> ...; i % 3 == 0 -> ...; ... else -> ... }`，注意分支从上到下匹配，最特殊的条件放最前。

## 11. 与之前和之后的知识的关系

- 往前：[Kotlin 概述与环境搭建](/kotlin/020-KotlinOverviewEnvSetup) 备好的三种环境今天全部用上；HelloKt 的谜底（编译器生成的类）在本章第 1 节揭晓；
- 往后：[函数与 Lambda](/kotlin/040-KotlinFunctionAndLambda) 把本章的 when 逻辑抽成函数、把 for 的遍历升级为集合操作；[类与对象](/kotlin/050-KotlinClassObject) 解释 val 背后「属性」的完整语义；when 的穷尽匹配与 [密封类与密封接口](/kotlin/160-SealedClassSealedInterface) 组合后威力全开；
- 更远：字符串模板与 when 会贯穿协程、序列化、测试各章，是出现频率最高的 Kotlin 构件。

## 12. 官方文档

- 基础语法总览（本文各构件的权威出处）：https://kotlinlang.org/docs/basic-syntax.html
- 控制流专题（if/when/for/while）：https://kotlinlang.org/docs/control-flow.html
- 编码约定（val 优先等官方风格）：https://kotlinlang.org/docs/coding-conventions.html

## 13. 自我检查

- 能解释 Kotlin 的 main 为什么不用写在类里，以及 HelloKt 类名是怎么来的；
- 给一段声明变量的代码，能逐个判断 val 与 var 的选择是否合理并说明理由；
- 能把一段 Java 的 switch 与三段式 for 循环改写成 when 加区间的 Kotlin；
- 拿到 unresolved reference 报错，能按三步法在 30 秒内定位拼写问题。

## 本章总结

顶层 fun main 让 Hello World 只剩三行——编译器自动生成 HelloKt 类。val/var 把「会不会变」写成代码，默认 val；类型推断省略标注但类型依旧严格；字符串模板用 $name 与 ${表达式} 取代加号拼接；if 与 when 都是表达式，when 匹配区间与类型且表达式形态必须穷尽；for 靠 `..`、until、downTo、step 四个区间构件覆盖所有循环。unresolved reference 九成是拼写，when 缺 else 会被编译器当场抓住。

## 下一步

进入 [函数与 Lambda](/kotlin/040-KotlinFunctionAndLambda)：今天写的一切都挤在 main 里，下一篇学会把它们拆成函数，并见识 Kotlin 把函数当值传递的能力。
