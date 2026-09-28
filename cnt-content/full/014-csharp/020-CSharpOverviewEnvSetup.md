---
order: 20
title: "环境搭建：dotnet 一个命令从创建到运行"
module: 'csharp'
category: 后端技术
difficulty: beginner
description: "装好 .NET SDK 并用 dotnet new 与 dotnet run 两步跑通第一个程序：三大平台安装命令、dotnet --version 验证、csproj 与隐式 Main 预告、VS Code 与 Visual Studio 选型、dotnet 不是内部或外部命令等真实报错实录。"
author: fanquanpp
updated: '2026-09-28'
related:
  - 'csharp/030-CSharpBasicSyntax'
  - 'csharp/040-CSharpOOP'
  - 'csharp/480-DotnetCli'
  - 'start/040-TerminalAndShellBasics'
prerequisites:
  - 'csharp/010-WhatIsCSharp'
---

## 前置知识

- 已完成 [C# 是什么](/csharp/010-WhatIsCSharp)：知道 .NET 10 / C# 14 是当前 LTS、dotnet 是 .NET 的统一命令行入口。
- 会打开终端（Windows 用 PowerShell，macOS/Linux 用 Terminal）并输入命令即可。完全没碰过终端的同学，[终端与 Shell 基础](/start/040-TerminalAndShellBasics) 十分钟补齐；本文每条命令都可以原样复制。

## 学习目标

读完本文你将能够：

1. 在 Windows、macOS 或 Linux 上装好 .NET SDK，并用 `dotnet --version` 验证成功；
2. 用 `dotnet new` 与 `dotnet run` 两条命令从空文件夹跑到程序出结果，说出每一步生成了什么；
3. 打开 `Program.cs`，解释为什么 .NET 10 模板里只有一行代码；
4. 读懂「dotnet 不是内部或外部命令」和「缺框架版本」两类真实报错，并按三步自行修复；
5. 在 VS Code + C# Dev Kit 与 Visual Studio Community 之间做出适合自己的选择。

预计 30 到 45 分钟，含 3 组动手实验与 4 道练习。

## 1. 问题引入：把散落三处的事收进一个命令

上一篇说过：C# 代码要先编译成中间码，再由 .NET Runtime 执行。那「编译」和「运行」这两个动作由谁执行？很多语言的做法是散装流程——装编译器是一处、配环境变量是一处、写构建脚本又是一处，初学者常常还没写代码就先卡死在环境上。

.NET 的答案是把这一切收进**一个命令行工具：dotnet**。装好 SDK（Software Development Kit，开发工具包）之后，从创建项目到跑出结果只差两条命令。本文目标：十分钟内跑起第一个 C# 程序，并且知道每条命令背后发生了什么。

## 2. 安装 .NET SDK

SDK 里装着三样东西：Roslyn 编译器、.NET 运行时、dotnet 命令本身。只运行不开发的机器可以只装更小的 Runtime，学习期一律装 SDK。

每个平台一行命令（版本号以官方下载页为准，写作时最新 LTS 为 .NET 10）：

Windows（PowerShell）：

```bash
winget install Microsoft.DotNet.SDK.10
```

macOS（Homebrew）：

```bash
brew install --cask dotnet-sdk
```

Ubuntu / Debian：

```bash
sudo apt-get update && sudo apt-get install -y dotnet-sdk-10.0
```

一行备注：winget 包名找不到、或 Ubuntu 软件源尚未收录 10.0 时，直接去 https://dotnet.microsoft.com/zh-cn/download/dotnet 下载安装包，双击安装，效果完全相同。

## 3. 验证安装

**先新开一个终端窗口**（重要：安装器刚修改了 PATH 环境变量，旧窗口可能不认识新命令），然后：

```bash
dotnet --version
```

预期输出（小版本号随更新滚动变化，有 10.x 开头的数字即成功）：

```text
10.0.100
```

再看一眼机器上装了哪些 SDK：

```bash
dotnet --list-sdks
```

预期输出（路径随平台不同）：

```text
10.0.100 [C:\Program Files\dotnet\sdk]
```

## 4. 核心概念：两条命令跑通第一个程序

进入你打算放代码的目录，依次执行：

```bash
dotnet new console -o FirstApp
cd FirstApp
dotnet run
```

第一条命令的预期输出（中文措辞随 SDK 语言版本略有差异，关键是「成功创建」与「已还原」两行）：

```text
已成功创建模板“控制台应用”。
正在处理创建后操作...
正在还原 C:\code\FirstApp\FirstApp.csproj:
  已还原 C:\code\FirstApp\FirstApp.csproj。
```

`dotnet run` 的预期输出：

```text
Hello, World!
```

这就是完整流程。拆开看每条命令：

| 命令 | 做了什么 |
| --- | --- |
| `dotnet new console -o FirstApp` | 用「控制台应用」模板生成新项目到 FirstApp 文件夹（-o = output 指定输出目录） |
| `cd FirstApp` | 进入项目目录 |
| `dotnet run` | 编译并运行**当前目录**的项目 |

### 生成的文件夹里有什么

两个文件值得打开看，其余（obj、bin 目录）是编译产物，不用管。

`FirstApp.csproj`——项目说明书，XML 格式，先混个眼熟：

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

</Project>
```

`TargetFramework` 的 `net10.0` 就是上一篇讲的版本线落在项目里的样子；后面两行设置先不管，第三篇会用到 `Nullable` 的知识。

`Program.cs`——程序入口，.NET 10 模板下全文只有一行（模板可能额外带一行指向 aka.ms 的英文注释，删掉即可）：

```csharp
Console.WriteLine("Hello, World!");
```

对照 Java 的五行 HelloWorld（见 [Java 快速上手](/java/030-QuickStart)），C# 把 `class` 声明和 `Main` 方法全省了。这就是**顶级语句**写法：类与 Main 方法由编译器隐式生成——上一篇埋的「隐式 Main」悬念，下一篇正式揭晓。语法上是 C# 9（2020 年）引入的，.NET 6 起成为模板默认。

## 5. 编辑器选择：VS Code 还是 Visual Studio

| | VS Code + C# Dev Kit | Visual Studio Community |
| --- | --- | --- |
| 平台 | Windows / macOS / Linux | 仅 Windows |
| 体积 | 轻量，装扩展即可 | 重量级全家桶，安装动辄数 GB |
| 安装方式 | VS Code 扩展市场搜索 C# Dev Kit | 官网下载 Community 版（对个人免费） |
| 适合 | 轻快、跨平台、命令行思维 | 开箱即用的调试器与界面设计器 |

学习期两者都绰绰有余，本文后续只用终端命令，不依赖任何编辑器——编辑器只是把 dotnet 命令打包成按钮。第三选择是 JetBrains Rider（2024 年底起非商业用途免费），感兴趣可自行了解。

## 6. 常见错误与调试实录

错误一：终端不认识 dotnet 命令。Windows 上报：

```text
'dotnet' 不是内部或外部命令，也不是可运行的程序或批处理文件。
```

macOS/Linux 上报：

```text
zsh: command not found: dotnet
```

读报错三步：第一，报错的意思是「终端在 PATH 环境变量里找不到名为 dotnet 的程序」；第二，按概率排原因——装完没有开新终端窗口（PATH 未刷新）、安装中途失败（SDK 根本没装上）、PATH 被手动改坏；第三，对症处理：开一个全新终端重试，仍不行就重跑第 2 节安装命令并盯住是否报错，最后用 `dotnet --version` 收尾验证。口诀：**装完先开新终端**，能省掉九成这类报错。

错误二：机器上有旧版运行时，跑新项目报缺框架：

```text
You must install or update .NET to run this application.
Framework: 'Microsoft.NETCore.App', version '10.0.0' (x64)
```

读法：报错明说了缺哪个版本。三步：`dotnet --list-sdks` 对照自己装了什么；确认项目要的是 net10.0 而你只有旧版；要么补装对应 SDK（第 2 节），要么把 csproj 里的 `TargetFramework` 改成已装版本（如 `net8.0`）。这条报错在「公司电脑只装过旧版 .NET」时最常见。

## 7. 修改实验

实验一：把 `Program.cs` 的输出改成你的名字，`dotnet run` 核对。**改一点、跑一次**，这个节奏贯穿整个模块。

实验二：改成输出两行（写两条 `Console.WriteLine`）。先写预期输出，再运行验证。

实验三：回到上层目录（`cd ..`）再执行 `dotnet run`，观察报错：

```text
MSBUILD : error MSB1003: Specify a project or solution file.
The current working directory does not contain a project or solution file.
```

读法照旧：它说「当前目录里没有项目文件」。回到 FirstApp 目录才正常——`dotnet run` 永远作用于**当前目录**的项目，这与第 6 节错误一构成一对：一个是找不到命令，一个是找错目录。

## 8. 实际场景中的使用

- **入职第一天**：拉下公司 .NET 仓库，装对应版本 SDK，`dotnet build` 与 `dotnet test` 就是日常三件套的骨架；
- **CI/CD**：GitHub Actions 的 setup-dotnet 动作装的也是这个 SDK，服务器上执行的命令与你本地完全相同，环境一致性由此而来；
- **多版本共存**：一台机器可以同时装 8、9、10 多个 SDK，`dotnet --list-sdks` 全部列出，每个项目按 csproj 各用各的版本互不打架。

## 9. 小练习

预测题（5 分钟）：把 `Program.cs` 换成下面内容，先写预期输出再运行：

```csharp
Console.WriteLine("第一行");
// Console.WriteLine("第二行");
Console.WriteLine("第三行");
```

（提示：以 `//` 开头是注释，注释行不执行。）

修改题（10 分钟）：新建第二个项目 `dotnet new console -o SecondApp`，让它分三行输出任意游戏排行榜的前三名。验收：`dotnet run` 输出恰好三行。

修 Bug 题（10 分钟）：同学小张运行完第 2 节的安装命令后，**立刻**在同一个终端输入 `dotnet --version`，得到第 6 节错误一的报错。按读报错三步帮他定位最可能的原因与修法；再进一步：如果新开终端仍然报错，下一步该查什么？（提示：回到安装命令的输出里找线索。）

挑战题（15 分钟）：不回看本文，从空目录开始完成「验证 SDK、创建项目、运行输出自己的名字」全流程并计时。验收清单：`dotnet --version` 有输出；项目文件夹里同时存在 .csproj 与 Program.cs；`dotnet run` 打印出你的名字。超过 10 分钟再回看第 4 节不丢人。

## 10. 与之前和之后的知识的关系

- 往前：[C# 是什么](/csharp/010-WhatIsCSharp) 的版本线（LTS/STS）决定了你刚装的版本号；大逆转的故事解释了为什么 brew 和 apt 的软件源里也有 dotnet；
- 往后：[基本语法](/csharp/030-CSharpBasicSyntax) 用刚建好的 FirstApp 当实验场，讲透顶级语句、var、插值与控制流；[面向对象](/csharp/040-CSharpOOP) 会解释「隐式 Main」背后的类到底是什么；
- 更远：需要 `dotnet ef`、`dotnet format` 这类进阶命令时，去 [dotnet CLI](/csharp/480-DotnetCli) 翻完整速查表。

## 11. 官方文档

- .NET 安装指南（各平台完整步骤）：https://learn.microsoft.com/dotnet/core/install/
- dotnet CLI 官方文档：https://learn.microsoft.com/dotnet/core/tools/
- 官方下载页：https://dotnet.microsoft.com/zh-cn/download/dotnet

## 12. 自我检查

- 不看本文能说出安装、验证、创建、运行四步各用什么命令；
- 能说出 `dotnet new console -o FirstApp` 各部分含义，以及 csproj 里 `TargetFramework` 是什么；
- 能解释 .NET 10 模板的 Program.cs 为什么只有一行，「隐式」隐掉了什么；
- 看到「dotnet 不是内部或外部命令」，能按三步定位并修复；
- 能说出 VS Code + C# Dev Kit 与 Visual Studio Community 的取舍标准。

## 本章总结

装好 .NET SDK 就有了编译器、运行时与 dotnet 命令三件套；`dotnet --version` 验证安装，`dotnet new console -o FirstApp` 一条命令生成项目，`dotnet run` 一条命令编译并运行。模板里的 Program.cs 只有一行——类与 Main 由编译器隐式生成（顶级语句写法），悬念留给下一篇。装完先开新终端，报错先读三步，这两条习惯比任何命令都值钱。

## 下一步

进入 [基本语法](/csharp/030-CSharpBasicSyntax)：在刚建好的 FirstApp 里，把顶级语句、var、字符串插值与 if/for/foreach 一口气备齐，写出第一个像样的排行榜程序。
