---
order: 510
title: dotnet CLI：从克隆到发布的一条命令链
module: 'csharp'
category: 后端技术
difficulty: beginner
description: 以"新机器上把一个 .NET 项目从零跑到发布"为主线串起 dotnet CLI：环境自检、建骨架、日常开发循环、依赖管理、三种发布形态、测试与工具管理，附坑点、自检清单与练习。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'csharp/020-CSharpOverviewEnvSetup'
  - 'csharp/340-CSharpTestEngineering'
  - 'csharp/400-DotnetPerformanceBenchmarking'
prerequisites:
  - 'csharp/010-WhatIsCSharp'
---

## 真实场景：新电脑，新同事，一条命令链

想象你刚入职，领到一台全新电脑。导师只丢给你一句话："把 `Shop` 这个服务拉下来，跑起来，再发布一个能拷给别人用的版本。" 本篇不背命令表，而是把这条链一步步走通——走完之后，`dotnet` 的十几个子命令自然就记住了，因为每一个都出现在它该出现的位置上。

（时间设定在 2026 年：.NET 10 已于 2025 年 11 月发布且是 LTS；下文的命令在 .NET 8/9/10 上行为一致。）

## 第一步：先问机器三个问题

任何排查都从"机器上到底装了什么"开始：

```bash
dotnet --version          # 当前默认使用的 SDK 版本，如 10.0.100
dotnet --list-sdks        # 本机装了哪些 SDK（可能同时有多个）
dotnet --list-runtimes    # 本机装了哪些运行时
```

想看完整环境（SDK、运行时、系统信息、环境变量），一条 `dotnet --info` 全出来，报 issue 时贴它比贴截图有用。

**为什么先做这步**：`dotnet --version` 报出来的可能不是你以为的版本。机器上装了多个 SDK 时，默认用最新的一个；"我这里能编译、CI 上报错"的环境漂移多半源于此。团队的解法是把版本钉进仓库根目录的 `global.json`：

```bash
dotnet new globaljson --sdk-version 10.0.100 --roll-forward latestFeature
```

这和 FANDEX 仓库用 `package.json` 的 `packageManager` 字段钉住 pnpm 版本是同一个思路：**环境约定写进仓库，而不是写进口口相传的文档**。

## 第二步：从零搭一个解决方案骨架

不动现有仓库，先在临时目录练一遍。一个像样的 .NET 后端项目通常是"一个解决方案 + 多个项目"：

```bash
mkdir Shop && cd Shop
dotnet new sln -n Shop                 # 解决方案：项目的花名册
dotnet new classlib -n Shop.Core       # 类库：领域逻辑
dotnet new console   -n Shop.App      # 控制台：入口程序

dotnet sln Shop.sln add Shop.Core Shop.App   # 把项目登记进解决方案
dotnet add Shop.App reference Shop.Core      # App 引用 Core
```

`dotnet new list` 可以列出所有模板（console、classlib、webapi、xunit……），`dotnet new console -n MyApp -f net10.0` 可以指定目标框架。

**为什么要有 sln 这一层**：`.csproj` 描述单个项目，`.sln` 描述"这个仓库里有哪些项目、它们怎么分组"。Visual Studio、Rider、`dotnet build` 在仓库根目录看到 `.sln`，就知道要一起构建谁。没有它，每个项目各自为政。

顺手记两个目录：`bin/` 放编译输出，`obj/` 放编译中间产物。两者都是生成物，`.gitignore` 里必须排除；出了奇怪的编译错误时，`dotnet clean` 清掉它们重试是标准操作。

## 第三步：日常开发循环

写代码时的循环就是三个命令：

```bash
dotnet run --project src/Shop.App    # 编译并运行
dotnet watch run                     # 文件一保存就自动重启，改一行看一次
dotnet test                          # 跑所有测试项目
```

`dotnet run` 的两个细节现在记下，能省掉半小时排查：

**双横线是分界线**。`dotnet run arg1` 会报错——run 把 `arg1` 当成自己的选项了。要传给你的程序，写成：

```bash
dotnet run --project src/Shop.App -- --name production --verbose
```

双横线之后的内容才原样交给 `Main` 的 `args`。

**测试也有自己的日常**：

```bash
dotnet test --filter "FullyQualifiedName~UserService"      # 只跑名字含 UserService 的测试
dotnet test --collect:"XPlat Code Coverage"                 # 收集覆盖率（coverlet）
dotnet test --logger "trx;LogFileName=test.trx"             # 结果写 trx，供 CI 解析
```

测试工程本身的展开见 [C# 测试工程化](/csharp/340-CSharpTestEngineering)。

## 第四步：管理依赖（NuGet）

用到第三方库时：

```bash
dotnet add package Newtonsoft.Json --version 13.0.3   # 装包并钉版本
dotnet list package --outdated                        # 列出可升级的依赖
dotnet remove package Newtonsoft.Json                 # 移除
```

包的元数据直接写进 `.csproj` 的 `<PackageReference>`，提交它就是提交依赖清单，别人 `git clone` 后第一次 `build` 时会自动还原。

**关于 `dotnet restore`**：`build`、`run`、`test` 内部都会先自动还原依赖，日常根本不用手动敲。它显式出场只有两个时机：CI 里想分离"还原失败"和"编译失败"两种错误时（先 `restore` 再 `--no-restore` build），以及离线排查包冲突时。清空本地 NuGet 缓存（包损坏、怀疑缓存脏了时用）：`dotnet nuget locals all --clear`。

团队共享的命令行工具也走 NuGet：

```bash
dotnet tool install -g dotnet-ef          # 全局安装，本机所有项目可用
dotnet tool list -g                       # 看装了什么
dotnet tool update -g dotnet-ef           # 升级
```

但 `-g` 装的东西只在你机器上有。团队工具应该装在项目内：

```bash
dotnet tool install --local dotnet-ef
git add .config/dotnet-tools.json          # 清单提交进仓库
dotnet tool restore                        # 新同事一键复现
```

## 第五步：发布——三种形态选一种

代码写完，`dotnet publish` 把它变成可部署的产物。三种形态对应三种交付对象：

```bash
# 形态一：框架依赖（默认）。产物小，但目标机器必须装有对应运行时
dotnet publish -c Release -o ./publish

# 形态二：自包含单文件。运行时打进去，拷给没装 .NET 的机器直接跑
dotnet publish -c Release -r win-x64 \
    --self-contained true -p:PublishSingleFile=true -o ./publish

# 形态三：原生 AOT。编译成原生代码，启动快、体积可控，但反射受限
dotnet publish -c Release -r win-x64 -p:PublishAot=true -o ./publish
```

`-r` 是 RID（运行时标识），决定为哪个平台编译：`win-x64`、`linux-x64`、`osx-arm64` 等，交叉发布就是换这个参数。`-c Release` 切换到优化构建；`-p:PublishTrimmed=true` 可以再裁掉没用到的框架代码减小自包含体积。

三选一的判断标准：

- 发给**公司内部服务器**（装好了运行时）：形态一，最省事；
- 发给**没装 .NET 的普通用户**：形态二，几十 MB 起步是正常的代价；
- 追求**极速启动或最小内存**的 CLI/云函数：形态三，代价是反射和动态加载受限（JSON 序列化必须配源生成，见 [JSON 序列化](/csharp/460-JsonSerialization)）。

想手动触发某个 MSBuild 目标时，`dotnet build -t:Publish` 等价于 publish；查看某条命令的全部选项，`dotnet publish --help`。按 `.editorconfig` 统一团队格式：`dotnet format`。

## 坑点与自检

**坑 1：`-f` 与语言版本是两码事。** `dotnet new console -f net10.0` 里的 `-f` 指定目标框架（决定可用 API），C# 语言版本默认跟随框架，但可在 `.csproj` 里用 `<LangVersion>` 覆盖（比如老项目想用新语法）。排查"这个语法为什么用不了"时，两个都要看。

**坑 2：SDK 漂移。** 升级机器 SDK 后 CI 突然红了，第一反应查 `global.json` 是否存在且版本合理。

**坑 3：自包含发布后体积吓人。** 不是 bug，运行时就在里面。要小：框架依赖 + 裁剪 + AOT，逐级换。

**坑 4：`sn -k` 不是 dotnet 子命令。** 偶尔在老文档里见到给程序集签强名称的 `sn -k key.snk`，它是 SDK 自带的独立工具，在开发者命令行里直接可用；新项目基本不需要它，知道有这回事即可。

自检——能不看文档回答这些吗：

1. `dotnet run -- --port 8080` 里的双横线删掉会发生什么？
2. 新同事克隆仓库后，用什么文件 + 哪条命令还原团队工具？
3. 三种发布形态各自交付给谁？哪个对反射最不友好？
4. `dotnet clean` 清的是什么？为什么 `bin/`、`obj/` 不进版本库？

## 完整命令链回放

把五步连起来，就是新机器上的标准动作：

```bash
dotnet --list-sdks && dotnet --version                  # 1. 问机器
dotnet new globaljson --sdk-version 10.0.100            # 2. 钉版本
dotnet new sln -n Shop
dotnet new classlib -n Shop.Core
dotnet new console -n Shop.App
dotnet sln Shop.sln add Shop.Core Shop.App              # 3. 搭骨架
dotnet add Shop.App reference Shop.Core
dotnet add Shop.App package Newtonsoft.Json --version 13.0.3
dotnet watch run                                        # 4. 开发循环
dotnet test
dotnet publish Shop.App -c Release -r win-x64 \
    --self-contained true -p:PublishSingleFile=true -o ./publish   # 5. 发布
```

## 练习

1. 在临时目录里按第二节的命令搭出 Shop 骨架，然后故意先删掉 `dotnet sln add` 那一步直接 `dotnet build`，观察输出差异，解释 sln 在其中的作用。
2. 写一个读取 `args` 的控制台程序，分别用 `dotnet run --name x` 和 `dotnet run -- --name x` 运行，把两种报错/成功的结果记录下来。
3. 同一个 console 项目分别用形态一和形态二发布，记录 `publish` 目录大小与目标机器（另一台没装 .NET 的机器或虚拟机）上的运行结果。

## 下一步

- 想系统了解 SDK、运行时、CLR 的关系：[C# 与 .NET](/csharp/250-CSharpDotNet)；
- 测试命令的工程化用法（覆盖率门禁、CI 集成）：[C# 测试工程化](/csharp/340-CSharpTestEngineering)；
- AOT 场景下 JSON 序列化为什么必须换源生成：[JSON 序列化](/csharp/460-JsonSerialization)；
- 性能敏感路径的基准测试：[性能与基准测试](/csharp/400-DotnetPerformanceBenchmarking)。
