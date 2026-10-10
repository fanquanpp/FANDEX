---
order: 30
title: "基本语法：顶级语句、var 与插值，第一个像样的程序"
module: 'csharp'
category: 后端技术
difficulty: beginner
description: "用游戏排行榜主线讲透 C# 基础语法：顶级语句与经典 Main 的隐式生成关系、var 编译期类型推断、字符串插值、if/for/foreach、文件范围命名空间与隐式 using，附 CS0103 真实编译报错实录与四道阶梯练习。"
author: fanquanpp
updated: '2026-10-07'
related:
  - 'csharp/040-CSharpOOP'
  - 'csharp/050-ValueTypeReferenceType'
  - 'csharp/060-CSharpNullableReferenceTypes'
  - 'csharp/070-CGenericCollection'
prerequisites:
  - 'csharp/020-CSharpOverviewEnvSetup'
---

## 前置知识

- 已完成 [C# 概述与环境搭建](/csharp/020-CSharpOverviewEnvSetup)：`dotnet new console -o FirstApp` 与 `dotnet run` 两步能跑通，终端里出现过 Hello, World!。
- 学过 Java 的同学全程对照即可（java 模块的 [快速上手](/java/030-QuickStart) 是镜像教材）；完全零基础也行，本文从第一行语句讲起，每个新词当场解释。

## 学习目标

读完本文你将能够：

1. 并排写出顶级语句版与经典 Main 版的同一程序，说出编译器隐式生成了什么；
2. 用 `var` 声明变量，并说出类型推断发生在编译期、运行时与显式写法零差别；
3. 用字符串插值 `$"..."` 把变量与表达式嵌进文本；
4. 用 if、for、foreach 写出一个完整的排行榜程序并预测其输出；
5. 按读报错三步，独立定位并修复 CS0103 编译错误。

预计 45 到 60 分钟，含 3 组动手实验与 4 道练习。

## 1. 问题引入：把仪式感做成可选

你可能在 Java 那边见过完整的仪式感——打印一行字要包三层「房子」：类、方法、语句。C# 的做法是：**仪式感做成可选**。

```csharp
Console.WriteLine("Hello, C#");
```

整个 `Program.cs` 就这一行，`dotnet run` 直接跑。上一篇留了悬念：类和 Main 方法去哪了？本文回答它，并顺手把写程序的最小工具箱——变量、插值、分支、循环——一次备齐。

## 2. 核心概念一：顶级语句与经典 Main

同一个程序的两版写法。版本一，顶级语句（整个 Program.cs）：

```csharp
Console.WriteLine("顶级语句版");
```

版本二，经典写法（与版本一完全等价）：

```csharp
namespace FirstApp;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("经典版");
    }
}
```

运行机制完全一致：编译器看到顶级语句，就**隐式生成**版本二里的 Program 类与 Main 方法，把你的语句原样搬进 Main 方法体——这就是上一篇说的「隐式 Main」。参数 args 同样存在，顶级语句里也能直接用，第 10 节的挑战题就会用到它。

与旧版本的一句话对比：顶级语句是 C# 9（2020 年）引入的，.NET 6 起成为模板默认，老教程里满屏的 class Program 属于经典写法。

什么时候还写经典版？代码要拆成多个类、或需要精确控制入口时。从下一篇写第一个类起你会频繁见到它。入门期的规则：顶级语句随便用，见到经典版能认出即可。

## 3. 核心概念二：var 与类型推断

C# 是静态强类型语言——每个变量都有确定类型，且编译期就定死。但不一定要每次手写类型：

```csharp
var score = 9700;        // 编译期推断为 int
var player = "星尘游侠";  // 推断为 string
var cleared = true;      // 推断为 bool
```

`var` 不是「没有类型」，而是「让编译器从右边的值推断类型」。这三行编译后与手写 `int score = 9700;` 完全等价——推断发生在编译期，运行时零差别。想验证可以打个断点，编辑器里把鼠标悬停在 score 上，类型一览无余。

社区惯例：右边类型一眼可见时用 var；类型不明显时写全（如方法返回值类型看不出时）。本文所有示例统一用 var。

## 4. 核心概念三：字符串插值

```csharp
var player = "星尘游侠";
var score = 9700;
Console.WriteLine($"玩家 {player} 当前得分 {score}");
```

预期输出：

```text
玩家 星尘游侠 当前得分 9700
```

`$` 前缀开启插值模式，花括号里的内容会被求值后嵌入文本。少写 `$` 会怎样？

```csharp
Console.WriteLine("玩家 {player} 当前得分 {score}");
```

```text
玩家 {player} 当前得分 {score}
```

花括号原样出现。输出里出现变量名本身，十有八九就是漏了 `$`。对照 Java 的拼法（见 [Java 快速上手](/java/030-QuickStart)）：`"玩家 " + player + " 当前得分 " + score`，插值把加号全省了。

## 5. 核心概念四：分支与循环，排行榜成型

给程序装上判断与重复。下面是完整程序，可整个替换 `FirstApp/Program.cs` 后 `dotnet run`：

```csharp
var scores = new[] { 9700, 8450, 7100 };

for (var i = 0; i < scores.Length; i++)
{
    var tag = "挑战组";
    if (scores[i] >= 9000)
    {
        tag = "王者组";
    }
    Console.WriteLine($"{i + 1}. {scores[i]} {tag}");
}
```

预期输出：

```text
1. 9700 王者组
2. 8450 挑战组
3. 7100 挑战组
```

逐块拆解：

- `new[] { 9700, 8450, 7100 }`——数组，一排同类型的格子，`scores.Length` 是它的长度；集合的完整形态在 [泛型与集合](/csharp/070-CGenericCollection) 展开；
- `for (var i = 0; i < scores.Length; i++)`——三段式：初始化（i 从 0 开始）；继续条件；步进。i 依次取 0、1、2；
- `if (scores[i] >= 9000) { ... }`——条件为 true 才执行花括号内的语句；`>=` 是比较运算，结果是 bool；
- `{i + 1}. {scores[i]} {tag}`——插值里可以放表达式，不只放变量。

只遍历、不需要下标时，foreach 更顺手：

```csharp
foreach (var score in scores)
{
    Console.WriteLine($"得分 {score}");
}
```

```text
得分 9700
得分 8450
得分 7100
```

for 拿得到下标 i，foreach 直接拿元素。选择标准一句话：**先问需不需要「第几个」，再选循环**。

## 6. 核心概念五：命名空间与 using 的现代写法

项目变大后，不同来源的类可能重名，**命名空间**（namespace）负责给类分家。现代 C# 用文件范围写法，一行声明整个文件归属：

```csharp
namespace Leaderboard;
```

它等价于把整个文件的类型包进 `namespace Leaderboard { ... }` 的大括号——省掉一层缩进和一对大括号。从下一篇写第一个类起，你会在每个文件开头见到它。

**using** 则是「借名字」：`Console` 这类常用类型位于 System 命名空间，但你没写过 `using System;` 也能直接用——因为 csproj 里 `ImplicitUsings` 被设为 enable，常用命名空间自动引入。将来编译器报「找不到某类型」时，第一反应就是补一行对应的 using。

（两句压缩的版本事实：文件范围命名空间与隐式 using 均为 2021 年 C# 10 引入，如今已是默认风格。）

## 7. 常见错误与调试实录

错误：CS0103，用了一个不存在的名字。把第 4 节代码里的 score 手滑打成 scoer：

```csharp
var score = 9700;
Console.WriteLine($"得分 {scoer}");
```

`dotnet run` 编译时报：

```text
Program.cs(2,31): error CS0103: The name 'scoer' does not exist
```

读报错三步：

1. 冒号前 `Program.cs(2,31)` 是**文件（行，列）**——直接跳到案发现场，列号是字符位置，不必背；
2. `error CS0103` 后面是人话：名字 scoer 不存在；
3. 回到声明处对照：你声明的是 score。二选一修法——改引用（scoer 改回 score），或改声明（本例显然是手滑，改引用）。

两个同源变体：

- **大小写敏感**：声明 score 却写 Score，同样报 CS0103。C# 里 `Score` 与 `score` 是两个名字，这是从 Java 一脉继承的规矩；
- **先使用后声明**：

```csharp
Console.WriteLine(score);   // 编译器还没认识 score
var score = 9700;
```

同样 CS0103——C# 从上到下逐行认识名字，声明必须在使用之前。

编译错误与运行错误的第一分界线：**CS 编号开头的错误发生在编译期，`dotnet run` 根本不会执行你的程序**；程序跑起来才炸的问题（如除以零）是另一族，后续篇章见。

## 8. 修改实验

实验一：给排行榜加第四名 8200 分。先写出完整的预期五行输出，再运行核对。

实验二：把分组阈值 9000 改成 8000。先预测哪些玩家进王者组，运行验证。

实验三：把 for 改成 foreach，输出同样的三行。你会发现插值里没法再写 `i + 1`——想想为什么（foreach 手里只有元素，没有下标），序号要么舍弃，要么换回 for。

## 9. 实际场景中的使用

- **CLI 小工具**：顶级语句加插值，足够写出日报生成器、批量文件改名器这类脚本级程序；
- **原型验证**：一行入口加 var，让「想法到能跑的代码」距离最短；验证完再重构进类（[面向对象](/csharp/040-CSharpOOP) 的活）；
- **日志与调试输出**：插值是真实项目日志的日常写法，今天的练习就是以后的生产代码。

## 10. 小练习

预测题（5 分钟）：下面代码输出什么？先写答案再运行验证。

```csharp
var a = 7;
var b = 2;
Console.WriteLine($"{a} / {b} = {a / b}");
```

（验证提示：结果不带小数——两个 int 相除仍是 int；原因见 [值类型与引用类型](/csharp/050-ValueTypeReferenceType)。）

修改题（10 分钟）：给排行榜加上名字数组，输出「名次. 名字 分数」格式：

```csharp
var names = new[] { "星尘游侠", "方块狐狸", "长跑小狐" };
```

验收：输出三行，第一行形如 `1. 星尘游侠 9700`，名次、名字、分数一一对应（用 `names[i]` 与 `scores[i]`）。

修 Bug 题（10 分钟）：下面程序想打印本周 MVP，编译报 CS0103。按读报错三步定位并修复；顺带回答：报错里的 `(3,44)` 各指什么？

```csharp
var bestPlayer = "星尘游侠";
var bestScore = 9700;
Console.WriteLine($"MVP: {bestPlayer}, 得分 {bestsore}");
```

```text
Program.cs(3,44): error CS0103: The name 'bestsore' does not exist
```

挑战题（20 分钟）：用顶级语句写一个「报名器」：从命令行参数读玩家名，无参数时用默认名，输出报名结果。

验收：`dotnet run -- 星尘游侠` 输出 `玩家 星尘游侠 报名成功`；`dotnet run` 输出 `玩家 无名氏 报名成功`。

提示（思路）：`args.Length == 0` 表示没传参数。展开（关键写法）：args 数组在顶级语句里直接可用，用 if 分支决定取 `args[0]` 还是默认值；`--` 是把参数传给你程序（而不是 dotnet 命令本身）的分隔符，先照抄即可。

## 11. 与之前和之后的知识的关系

- 往前：[环境搭建](/csharp/020-CSharpOverviewEnvSetup) 建好的 FirstApp 是本文实验场，第 2 节揭晓「隐式 Main」悬念；Java 对照见第 4 节；
- 往后：[面向对象](/csharp/040-CSharpOOP) 解释 Program 类到底是什么，namespace 与类从此成为日常；[值类型与引用类型](/csharp/050-ValueTypeReferenceType) 解释 int 与 string 在内存里的不同待遇；[可空引用类型](/csharp/060-CSharpNullableReferenceTypes) 给 null 装上编译期防线；
- 更远：[泛型与集合](/csharp/070-CGenericCollection) 把 new[] 数组升级成 List 与 Dictionary，排行榜数据也就有了真正的容器。

## 12. 官方文档

- C# 官方导览（含浏览器内交互示例）：https://learn.microsoft.com/dotnet/csharp/tour-of-csharp/
- 顶级语句教程：https://learn.microsoft.com/dotnet/csharp/whats-new/tutorials/top-level-statements
- 字符串插值参考：https://learn.microsoft.com/dotnet/csharp/language-reference/tokens/interpolated
- CS0103 编译器错误：https://learn.microsoft.com/dotnet/csharp/misc/cs0103

## 13. 自我检查

- 能并排写出顶级语句版与经典 Main 版，并说出编译器隐式生成了哪两个东西；
- 能说出 var 推断发生在编译期，运行时与显式类型声明零差别；
- 拿到一段插值代码，能在脑内执行并写出正确输出；
- 看到 CS0103，能按「文件行列、名字、对照声明」三步定位修复；
- 能说出 for 与 foreach 的选择依据。

## 本章总结

顶级语句把程序入口的仪式感变成可选：编译器隐式生成类与 Main，你的语句原样搬进方法体。var 是编译期类型推断，不是动态类型。`$"..."` 插值是现代 C# 的输出默认姿势，花括号原样出现就是漏了 `$`。if、for、foreach 加数组，已经够写出完整的排行榜小工具。CS0103 的读法是三步：文件行列定位、读懂名字、对照声明。编译期错误被 dotnet run 拦在运行之前——编译器是你的第一个代码审查员。

## 下一步

进入 [C# 面向对象编程](/csharp/040-CSharpOOP)：顶级语句里隐式生成的类，下一篇由你亲手写——类、对象、属性与方法，把排行榜从脚本升级成真正的程序。

## 速查补充：全局 using（承接自原 150 篇速查段）

## 全局 using 与 Nullable

**基本写法：全局 using**
`global using <命名空间>;`
```csharp
// 全项目共享的命名空间引用
global using System;
```

---

**单行写法：全局 using 多命名空间**
`global using <命名空间1>; global using <命名空间2>;`
```csharp
// 单行声明多个全局 using
global using System; global using System.Linq;
```

---

**换行写法：全局 using 多命名空间**
`global using <命名空间1>; global using <命名空间2>;`
```csharp
// 换行声明多个全局 using
global using System;
global using System.Collections.Generic;
global using System.Linq;
global using System.Threading.Tasks;
```

---

## 速查补充：顶级语句与文件范围命名空间（承接自原 150 篇速查段）

## 顶级语句与文件范围命名空间

**基本写法：顶级语句**
`<语句>;`
```csharp
// 无需 Main 方法的程序入口
var data = await FetchDataAsync();
Console.WriteLine($"获取到 {data.Length} 条记录");
```

---

**基本写法：文件范围命名空间**
`namespace <命名空间>;`
```csharp
// 单文件命名空间声明
namespace MyApp.Services;

public class UserService
{
    // 整个文件都在该命名空间下
}
```

---
