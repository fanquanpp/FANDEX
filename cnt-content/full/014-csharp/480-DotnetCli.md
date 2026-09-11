---
order: 480
title: C# .NET CLI 命令
module: 'csharp'
category: 后端技术
difficulty: beginner
description: dotnet CLI 全流程速查：项目创建、构建运行、NuGet 依赖、发布 AOT、测试与工具管理，附完整工作流示例与易错点。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'csharp/020-CSharpOverviewEnvSetup'
  - 'csharp/340-CSharpTestEngineering'
  - 'csharp/400-DotnetPerformanceBenchmarking'
prerequisites:
  - 'csharp/010-WhatIsCSharp'
---

## SDK 与环境

**基本写法：查看版本**
`dotnet --version`
```bash
// 查看当前 .NET SDK 版本
dotnet --version
```

---

**基本写法：列出已装 SDK**
`dotnet --list-sdks`
```bash
// 列出本机所有 .NET SDK
dotnet --list-sdks
```

---

**基本写法：列出已装运行时**
`dotnet --list-runtimes`
```bash
// 列出本机所有 .NET 运行时
dotnet --list-runtimes
```

---

**基本写法：查看信息**
`dotnet --info`
```bash
// 查看 SDK 与环境详细信息
dotnet --info
```

---

## 项目创建

**基本写法：创建控制台应用**
`dotnet new console -n <项目名>`
```bash
// 创建控制台项目
dotnet new console -n MyApp
```

---

**基本写法：创建类库**
`dotnet new classlib -n <库名>`
```bash
// 创建类库项目
dotnet new classlib -n MyLib
```

---

**基本写法：创建 Web API**
`dotnet new webapi -n <项目名>`
```bash
// 创建 ASP.NET Core Web API
dotnet new webapi -n MyApi
```

---

**基本写法：指定框架**
`dotnet new console -n <项目名> -f <框架>`
```bash
// 指定目标框架
dotnet new console -n MyApp -f net8.0
```

---

**基本写法：列出模板**
`dotnet new list`
```bash
// 列出所有可用项目模板
dotnet new list
```

---

## 构建与运行

**基本写法：构建项目**
`dotnet build [<项目>] [--configuration <配置>]`
```bash
// 编译项目
dotnet build
dotnet build -c Release
```

---

**基本写法：运行项目**
`dotnet run [--project <路径>]`
```bash
// 编译并运行
dotnet run --project src/MyApp
```

---

**基本写法：运行时传参**
`dotnet run -- <参数>`
```bash
// 双横线后的参数传给程序
dotnet run -- arg1 arg2
```

---

**基本写法：清理生成**
`dotnet clean [<项目>]`
```bash
// 清理编译输出
dotnet clean
```

---

**基本写法：构建指定目标**
`dotnet build -t:<目标>`
```bash
// 执行 MSBuild 目标
dotnet build -t:Publish
```

---

## 依赖管理

**基本写法：添加包**
`dotnet add <项目> package <包名> [--version <版本>]`
```bash
// 添加 NuGet 包
dotnet add package Newtonsoft.Json --version 13.0.1
```

---

**基本写法：移除包**
`dotnet remove <项目> package <包名>`
```bash
// 移除 NuGet 包
dotnet remove package Newtonsoft.Json
```

---

**基本写法：添加项目引用**
`dotnet add <项目> reference <引用项目>`
```bash
// 添加项目引用
dotnet add src/App reference src/Lib/Lib.csproj
```

---

**基本写法：移除项目引用**
`dotnet remove <项目> reference <引用项目>`
```bash
// 移除项目引用
dotnet remove src/App reference src/Lib/Lib.csproj
```

---

**基本写法：还原依赖**
`dotnet restore [<项目>]`
```bash
// 还原 NuGet 依赖
dotnet restore
```

---

**基本写法：列出包**
`dotnet list <项目> package [--outdated]`
```bash
// 列出依赖包及可升级版本
dotnet list package --outdated
```

---

## 发布与打包

**基本写法：发布应用**
`dotnet publish -c Release -o <输出目录>`
```bash
// 发布到指定目录
dotnet publish -c Release -o ./publish
```

---

**基本写法：独立部署**
`dotnet publish -c Release --self-contained true -r <RID>`
```bash
// 包含运行时，目标机器无需装 .NET
dotnet publish -c Release --self-contained true -r win-x64
```

---

**基本写法：单文件发布**
`dotnet publish -c Release -p:PublishSingleFile=true`
```bash
// 打包为单可执行文件
dotnet publish -c Release -r linux-x64 -p:PublishSingleFile=true
```

---

**基本写法：AOT 原生编译**
`dotnet publish -p:PublishAot=true -r <RID>`
```bash
// .NET 8+ 原生 AOT 编译
dotnet publish -p:PublishAot=true -r win-x64
```

---

**基本写法：修剪未用代码**
`dotnet publish -p:PublishTrimmed=true`
```bash
// 裁剪未使用程序集以减小体积
dotnet publish -c Release -p:PublishTrimmed=true
```

---

## 测试

**基本写法：运行测试**
`dotnet test [<项目>]`
```bash
// 运行所有单元测试
dotnet test
```

---

**基本写法：过滤测试**
`dotnet test --filter <表达式>`
```bash
// 按名称过滤运行
dotnet test --filter "FullyQualifiedName~UserService"
```

---

**基本写法：生成覆盖率**
`dotnet test --collect:"XPlat Code Coverage"`
```bash
// 收集代码覆盖率（coverlet）
dotnet test --collect:"XPlat Code Coverage"
```

---

**基本写法：详细日志**
`dotnet test --logger <日志器>`
```bash
// 输出测试结果到 trx 文件
dotnet test --logger "trx;LogFileName=test.trx"
```

---

## 解决方案管理

**基本写法：创建解决方案**
`dotnet new sln -n <方案名>`
```bash
// 创建 sln 解决方案
dotnet new sln -n MySolution
```

---

**基本写法：添加项目到方案**
`dotnet sln <方案> add <项目>`
```bash
// 把项目加入解决方案
dotnet sln MySolution.sln add src/App/App.csproj
```

---

**基本写法：列出方案项目**
`dotnet sln <方案> list`
```bash
// 列出解决方案中所有项目
dotnet sln list
```

---

## 工具与缓存

**基本写法：安装全局工具**
`dotnet tool install -g <工具>`
```bash
// 全局安装 dotnet 工具
dotnet tool install -g dotnet-ef
```

---

**基本写法：更新工具**
`dotnet tool update -g <工具>`
```bash
// 更新全局工具
dotnet tool update -g dotnet-ef
```

---

**基本写法：列出工具**
`dotnet tool list -g`
```bash
// 列出已安装的全局工具
dotnet tool list -g
```

---

**基本写法：清理 NuGet 缓存**
`dotnet nuget locals all --clear`
```bash
// 清空本地 NuGet 缓存
dotnet nuget locals all --clear
```

---

## EF Core 工具

**基本写法：生成迁移**
`dotnet ef migrations add <迁移名>`
```bash
// 添加 EF Core 迁移
dotnet ef migrations add InitCreate
```

---

**基本写法：更新数据库**
`dotnet ef database update`
```bash
// 应用迁移到数据库
dotnet ef database update
```

---

**基本写法：根据数据库反向生成**
`dotnet ef dbcontext scaffold "<连接串>" <提供程序>`
```bash
// 数据库优先生成模型
dotnet ef dbcontext scaffold "Server=.;Db=App" Microsoft.EntityFrameworkCore.SqlServer
```

---

## 其他常用

**基本写法：查看帮助**
`dotnet <命令> --help`
```bash
// 查看命令帮助
dotnet run --help
```

---

**基本写法：格式化代码**
`dotnet format [<项目>]`
```bash
// 按.editorconfig 格式化代码
dotnet format
```

---

**基本写法：生成强名称密钥**
`sn -k <文件>`
```bash
// sn 是 .NET SDK 自带的强名称工具（非 dotnet 子命令），
// 在开发者命令行或 SDK 安装目录中使用
sn -k key.snk
```

---

## 完整示例：从零到发布的标准工作流

一个典型 .NET 项目的命令行全流程：

```bash
# 1. 创建解决方案与两个项目
dotnet new sln -n Shop
dotnet new classlib -n Shop.Core        # 领域逻辑
dotnet new console   -n Shop.App        # 入口程序

# 2. 组织进解决方案并建立引用
dotnet sln Shop.sln add Shop.Core Shop.App
dotnet add Shop.App reference Shop.Core

# 3. 添加 NuGet 依赖并锁定版本
dotnet add Shop.App package Newtonsoft.Json --version 13.0.3

# 4. 日常开发：边写边跑（保存自动重启用 watch）
cd Shop.App && dotnet run
dotnet watch run                         # 文件变更自动重启

# 5. 质量门禁：测试 + Release 构建
dotnet test
dotnet build -c Release

# 6. 发布：自包含单文件（目标机器无需安装 .NET）
dotnet publish Shop.App -c Release -r win-x64 \
    --self-contained true -p:PublishSingleFile=true -o ./publish
```

`dotnet run` 后即可看到程序输出；`publish` 目录中的 `.exe` 可直接拷贝到任何 Windows x64 机器运行。把 `-r` 换成 `linux-x64`/`osx-arm64` 即可交叉发布到其他平台（RID 列表见微软文档）。

## 常见陷阱

**`dotnet run` 传参要加双横线**。`dotnet run arg1` 会把 `arg1` 当成 run 命令自己的选项而报错；`dotnet run -- arg1 arg2` 之后的内容才会传给你的程序。

**SDK 版本不匹配的隐性失败**。机器上装了多个 SDK 时，默认用最新的；团队协作应提交 `global.json`（`dotnet new globaljson` 生成）把 SDK 版本钉住，避免"我这里能编译、CI 上报错"的环境漂移。

**`-f net8.0` 只指定目标框架**。它决定编译目标与可用 API，不决定 C# 语言版本——语言版本默认跟随目标框架，也可用 `<LangVersion>` 显式覆盖（如让 .NET 8 项目使用 `latest`）。两者要分开理解。

**`dotnet restore` 现在通常无需手动执行**。`build`/`run`/`test` 内部都会先还原依赖；需要离线构建或排查包冲突时才显式调用，配合 `--no-restore` 跳过重复还原以加速 CI。

**自包含发布体积大是正常的**。`--self-contained` 会把整个运行时打进去（几十 MB 起步）；想要小体积用框架依赖部署（默认）或叠加 `PublishTrimmed=true` 裁剪、`PublishAot=true` 原生 AOT——但裁剪和 AOT 对反射依赖敏感（序列化要配源生成，见 [JSON 序列化](/csharp/460-JsonSerialization)）。

**工具安装的作用域**。`dotnet tool install -g` 装到用户目录（如 dotnet-ef），任何人可用；团队工具应装到项目内（加 `--local` 并提交 `.config/dotnet-tools.json`），让 `dotnet tool restore` 一键复现。

## 分层小结

- **记住**：`new`/`run`/`build`/`test`/`publish` 五个主干命令；`sln add` 组织项目；`add package` 装依赖。
- **理解**：RID 与自包含/框架依赖两种发布模式；SDK 版本钉扎；`watch` 热重启。
- **应用**：新项目先建 sln 再建项目；CI 中固定 SDK + `--no-restore` 提速；分发给非开发者用自包含单文件。测试命令的深入用法见 [C# 测试工程化](/csharp/340-CSharpTestEngineering)。
