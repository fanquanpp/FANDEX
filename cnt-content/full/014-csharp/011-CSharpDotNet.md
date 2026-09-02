---
order: 110
title: C# .NET 平台与生态
module: 'csharp'
category: 后端技术
difficulty: intermediate
description: .NET Runtime、BCL、NuGet 包管理、依赖注入、配置系统、日志、中间件管道、ASP.NET Core、EF Core、MAUI、性能诊断、AOT 编译
author: fanquanpp
updated: '2026-07-21'
related:
  - 'csharp/002-CSharpOverviewEnvSetup'
  - 'csharp/003-CSharpBasicSyntax'
  - 'csharp/007-CAsyncProgramming'
  - 'csharp/008-CSharpLINQFunctionalProgramming'
  - 'csharp/009-CSharpAdvancedFeature'
  - 'csharp/012-CSharpTestEngineering'
prerequisites:
  - 'csharp/002-CSharpOverviewEnvSetup'
  - 'csharp/003-CSharpBasicSyntax'
  - 'csharp/007-CAsyncProgramming'
---


# C# .NET 平台与生态

## 前置知识

- [yield 迭代器状态机](/csharp/010-CSharpYieldIteratorStateMachine)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 历史动机与演化」的核心机制、典型用法与常见陷阱
- 掌握「2. 形式化定义」的核心机制、典型用法与常见陷阱
- 掌握「3. 理论推导与证明」的核心机制、典型用法与常见陷阱
- 掌握「4. 代码示例」的核心机制、典型用法与常见陷阱
- 掌握「5. 对比分析」的核心机制、典型用法与常见陷阱


> 本篇是 FANDEX C# 系列的第八篇。我们将系统讲解 .NET 平台架构与生态：从 CLR/CoreCLR 运行时、BCL 基础类库、NuGet 包管理、依赖注入、配置系统、日志、中间件管道、ASP.NET Core、EF Core 到 .NET MAUI 跨平台 UI。内容对标 MIT 6.172（Performance Engineering）、Stanford CS142（Web Applications）、CMU 15-440（Distributed Systems）课程教学严谨度，支持 0 基础自学，同时覆盖企业级实战要点。

---

## 1. 历史动机与演化

### 1.1 .NET Framework 时代（2002-2014）

2002 年微软发布 .NET Framework 1.0，核心目标：与 Java 竞争企业级开发市场。

核心特性：

- **统一语言**：C#、VB.NET、F# 共享 CLR，多语言互操作。
- **平台绑定**：仅支持 Windows。
- **闭源**：参考代码不可修改，社区贡献受限。
- **庞大安装包**：Framework 本身约 200MB+，部署成本高。
- **版本碎片**：每个版本独立安装，应用绑定特定版本。

痛点：

1. **跨平台缺失**：无法在 Linux/macOS 运行。
2. **闭源生态**：社区难以贡献，演进缓慢。
3. **部署复杂**：依赖系统级安装，容器化困难。
4. **Windows-only**：无法满足云原生跨平台需求。

### 1.2 Mono 与 Xamarin（2004-2016）

Miguel de Icaza 创建 Mono 项目，将 .NET 移植到 Linux。后被 Xamarin 收购，专注移动端跨平台。

- **Mono Runtime**：开源 CLR 实现。
- **Xamarin.iOS / Xamarin.Android**：C# 编写原生移动应用。
- **Xamarin.Forms**：跨平台 UI 框架（MAUI 前身）。

2016 年微软收购 Xamarin，开源 Mono。

### 1.3 .NET Core 时代（2016-2020）

2016 年微软发布 .NET Core 1.0，全面重构：

- **跨平台**：Windows、Linux、macOS。
- **开源**：MIT 许可证，GitHub 开发。
- **模块化**：NuGet 包分发，按需引用。
- **高性能**：重写 Kestrel 服务器、重构 GC。
- **容器友好**：小镜像（alpine + 50MB），适合 Kubernetes。

版本演化：

- **.NET Core 1.0**（2016）：基础框架，ASP.NET Core 1.0。
- **.NET Core 2.0**（2017）：性能优化，与 .NET Framework API 兼容性提升。
- **.NET Core 2.1**（2018）：LTS 版本，`Span<T>`、`Memory<T>` 引入。
- **.NET Core 2.2**（2018）：HTTP/2、性能改进。
- **.NET Core 3.0**（2019）：WPF/WinForms 支持（仅 Windows）、`System.Text.Json`。
- **.NET Core 3.1**（2019）：LTS 版本，企业级稳定。

### 1.4 .NET 5+ 统一时代（2020-至今）

2020 年微软发布 .NET 5.0，统一 .NET Core 与 .NET Framework（部分）与 Mono（Xamarin），不再分叉：

- **.NET 5.0**（2020）：统一平台，C# 9.0，Single File Application。
- **.NET 6.0**（2021）：LTS，C# 10.0，MAUI 预览、`Parallel.ForEachAsync`、`Date/TimeOnly`。
- **.NET 7.0**（2022）：性能飞跃，C# 11.0，`RateLimiter`、Native AOT 改进。
- **.NET 8.0**（2023）：LTS，C# 12.0，`PrimaryConstructor`、`CollectionExpression`、`KeyedServices`。
- **.NET 9.0**（2024）：C# 13.0，`params ReadOnlySpan`、新 `lock`、`field` 关键字、AOT 增强。

### 1.5 关键技术演化

#### 1.5.1 JIT 编译演化

- **JIT 1.0**（.NET Framework 1.0）：基础 JIT。
- **R2R (ReadyToRun)**（.NET Core 3+）：预编译 IL 到本机码，加快启动。
- **Tiered Compilation**（.NET Core 3+）：分层编译，先快速编译，后优化重编译。
- **Dynamic PGO**（.NET 6+，默认 .NET 8）：动态配置文件引导优化，性能提升 10-30%。

#### 1.5.2 GC 演化

- **Server GC**：多核优化，每 CPU 一个堆。
- **Background GC**（.NET 4.0+）：后台并发回收，减少暂停。
- **LOH 压缩**（.NET 8+）：大对象堆可压缩。
- **DATAS**（Dynamic Adaptation To Application Sizes，.NET 9）：动态调整堆大小适配容器。

#### 1.5.3 AOT 演化

- **NGen**（.NET Framework）：预编译，但依赖 Framework。
- **Crossgen**（.NET Core）：跨平台预编译。
- **ReadyToRun**（.NET Core 3+）：标准化 R2R 格式。
- **Native AOT**（.NET 7+，GA .NET 8）：完全预编译为本机码，无运行时 JIT，启动毫秒级。

#### 1.5.4 ASP.NET 演化

- **ASP.NET Web Forms**（.NET Framework 1.0）：拖拽式 UI，事件驱动。
- **ASP.NET MVC**（.NET Framework 3.5+）：MVC 架构。
- **ASP.NET Web API**（.NET Framework 4.5）：REST API。
- **ASP.NET Core 1.0**（2016）：完全重写，跨平台，Kestrel。
- **ASP.NET Core MVC**（.NET Core 1.0+）：MVC + Razor。
- **ASP.NET Core Razor Pages**（.NET Core 2.0+）：页面式开发。
- **ASP.NET Core Minimal API**（.NET 6+）：函数式 API，`MapGet`/`MapPost`。
- **ASP.NET Core gRPC**（.NET 5+）：Protobuf RPC。

---

## 2. 形式化定义

### 2.1 .NET 平台架构

.NET 平台可形式化为分层架构：

$$
\text{.NET} = (\text{AppCode}, \text{CLR}, \text{BCL}, \text{OS Abstraction})
$$

$$
\text{CLR} = (\text{TypeSystem}, \text{JIT}, \text{GC}, \text{ExceptionHandling}, \text{ThreadPool}, \text{Sync})
$$

- **AppCode**：用户编写的 C#/F#/VB 代码。
- **CLR**：公共语言运行时，提供执行环境。
- **BCL**：基础类库，提供集合、IO、网络、LINQ 等 API。
- **OS Abstraction**：PAL（Platform Adaptation Layer），抽象操作系统差异。

### 2.2 类型系统形式化

.NET CTS（Common Type System）定义：

$$
\mathcal{T} = \mathcal{T}_{\text{val}} \cup \mathcal{T}_{\text{ref}} \cup \mathcal{T}_{\text{ptr}}
$$

- $\mathcal{T}_{\text{val}}$：值类型（`struct`、`enum`），分配在栈或字段内联。
- $\mathcal{T}_{\text{ref}}$：引用类型（`class`、`string`、`array`、`delegate`、`interface`），分配在堆。
- $\mathcal{T}_{\text{ptr}}$：指针类型（`unsafe`），原始内存地址。

类型层次：

$$
\text{Object} \supset \{\text{ValueType} \supset \{\text{Enum}, \text{struct}\}, \text{String}, \text{Array}\langle T \rangle, \text{Delegate}, \text{Interface}\}
$$

### 2.3 GC 形式化

设堆为 $H = \bigcup_{i=0}^{2} G_i \cup \text{LOH} \cup \text{POH}$，其中：

- $G_0$：第 0 代，最短命对象。
- $G_1$：第 1 代，存活过一次 GC。
- $G_2$：第 2 代，长期存活。
- $\text{LOH}$：大对象堆，$\geq 85000$ 字节。
- $\text{POH}$：固定对象堆（.NET 5+），`GCHandle.Alloc(obj, Pinned)`。

GC 触发条件：

$$
\text{GC.Trigger} = \begin{cases}
\text{Gen0 full} & \text{if } |G_0| > \text{Threshold}_0 \\
\text{Gen2 full} & \text{if } |G_2| > \text{Threshold}_2 \\
\text{LOH compact} & \text{if LOH fragmentation} > \text{Limit}
\end{cases}
$$

### 2.4 DI 容器形式化

DI 容器是服务注册表 + 生命周期管理器：

$$
\text{DI} = (\text{Registry} : \text{Service} \to \text{Implementation}, \text{Lifetime} : \text{Service} \to \{\text{Transient}, \text{Scoped}, \text{Singleton}\})
$$

解析操作：

$$
\text{Resolve} : \text{Service} \to \text{Instance}
$$

生命周期语义：

- **Transient**：每次 `Resolve` 创建新实例。
- **Scoped**：每个 scope 创建一个实例，scope 内复用。
- **Singleton**：应用生命周期内单一实例。

### 2.5 配置系统形式化

配置源是键值映射：

$$
\text{ConfigSource} : \text{Path} \to \text{Value}
$$

`IConfigurationRoot` 聚合多个源，按优先级覆盖：

$$
\text{Root}[p] = \text{Source}_n[p] \text{ if defined, else } \text{Source}_{n-1}[p] \text{ if defined, else } \ldots
$$

绑定到强类型对象：

$$
\text{Bind} : \text{IConfiguration} \times \text{Type } T \to T
$$

通过反射或源生成器实现属性赋值。

### 2.6 中间件管道形式化

中间件管道是函数组合：

$$
\text{Pipeline} = M_n \circ M_{n-1} \circ \ldots \circ M_1
$$

每个中间件 $M_i : (HttpContext, \text{Next}) \to \text{Task}$：

```csharp
async Task Middleware(HttpContext ctx, RequestDelegate next)
{
    // 前置处理
    await next(ctx);
    // 后置处理
}
```

请求处理：

$$
\text{Handle}(req) = \text{Pipeline}(\text{ctx})
$$

其中 `ctx` 包含请求与响应对象。

### 2.7 EF Core 形式化

EF Core 是对象关系映射（ORM）：

$$
\text{ORM} = (\text{Mapping} : \text{Entity} \to \text{Table}, \text{Translation} : \text{LINQ} \to \text{SQL})
$$

变更追踪：

$$
\text{ChangeTracker} = (\text{Added}, \text{Modified}, \text{Deleted}, \text{Unchanged})
$$

`SaveChanges`：

$$
\text{SaveChanges} = \text{GenerateSQL}(\text{ChangeTracker}) \to \text{ExecuteSQL} \to \text{UpdateTracker}
$$

---

## 3. 理论推导与证明

### 3.1 GC 暂停时间复杂度

**命题 4.1**：分代 GC 的平均暂停时间远小于全堆标记-压缩。

**证明**：

设堆总大小为 $H$，Gen0 大小为 $g_0 \ll H$。Gen0 GC 仅扫描 $g_0$：

- **标记**：从根集合可达性分析，复杂度 $O(|\text{roots}| + g_0)$。
- **压缩**：移动存活对象，复杂度 $O(g_0)$。

总暂停 $T_0 = O(g_0)$，与 $H$ 无关。

Gen2 GC（Full GC）扫描整个堆：

$$
T_2 = O(H)
$$

由于 Gen0 频率高（每秒数次），Gen2 频率低（每小时数次），平均暂停：

$$
\bar{T} = \frac{n_0 \cdot T_0 + n_2 \cdot T_2}{n_0 + n_2} \approx T_0 \text{ if } n_0 \gg n_2
$$

**推论**：短命对象（局部变量）保持在 Gen0，频繁分配不会引发 Full GC。

### 3.2 DI 容器解析复杂度

**命题 4.2**：构造函数注入的解析复杂度为 $O(V + E)$，其中 $V$ 为服务数，$E$ 为依赖边数。

**证明**：

DI 容器维护依赖图 $G = (V, E)$，每个服务 $v \in V$ 依赖其构造函数参数对应的服务。

解析服务 $s$：

1. 拓扑排序：$O(V + E)$。
2. 按拓扑顺序创建实例：$O(V)$。

总复杂度 $O(V + E)$。

若存在循环依赖，拓扑排序检测出环，抛 `InvalidOperationException`。

### 3.3 中间件管道执行顺序

**命题 4.3**：中间件按注册顺序执行，前置处理在 `next` 之前，后置处理在 `next` 之后。

**证明**：

设中间件序列 $M_1, M_2, \ldots, M_n$，每个：

```csharp
async Task M_i(HttpContext ctx, RequestDelegate next)
{
    Pre_i(ctx);              // 前置
    await next(ctx);         // 调用下一中间件
    Post_i(ctx);             // 后置
}
```

执行展开：

$$
\text{Pre}_1 \to \text{Pre}_2 \to \ldots \to \text{Pre}_n \to \text{Terminal} \to \text{Post}_n \to \ldots \to \text{Post}_2 \to \text{Post}_1
$$

因此：

- 异常处理（`UseExceptionHandler`）必须最先注册，捕获后续异常。
- 路由（`UseRouting`）必须在端点映射（`MapControllers`）之前。
- 静态文件（`UseStaticFiles`）应在路由之前短路静态请求。

### 3.4 EF Core N+1 问题

**命题 4.4**：若在循环中访问导航属性且未 `Include`，则产生 $N+1$ 次查询。

**证明**：

设查询订单列表：

```csharp
var orders = await _db.Orders.ToListAsync();   // 1 次查询
foreach (var order in orders)
{
    var user = order.User;   // 延迟加载，每次访问触发查询
}
```

- 查询订单：1 次。
- 访问 $N$ 个订单的 `User`：$N$ 次查询。

总查询数 $N + 1$。

**解决**：使用 `Include` 预先 JOIN：

```csharp
var orders = await _db.Orders
    .Include(o => o.User)
    .ToListAsync();   // 1 次查询（JOIN）
```

### 3.5 AOT 编译限制

**命题 4.5**：Native AOT 编译应用无法运行时反射生成代码。

**证明**：

Native AOT 在发布时将 IL 编译为本机码，并裁剪未引用的代码。运行时无 JIT，故：

1. `Assembly.Load` 无法加载新程序集。
2. `Emit.DynamicMethod` 无法生成方法。
3. 反射创建实例需 AOT 时已包含该类型。
4. JSON 序列化需源生成器（`JsonSerializerContext`）而非反射。

`Trimming` 移除未引用代码，但反射引用可能不被识别，需 `[DynamicDependency]` 标注或 `TrimmerRootDescriptor`。

---

## 4. 代码示例

### 4.1 dotnet CLI 命令

```bash
# 创建控制台应用
dotnet new console -n MyApp --framework net9.0

# 创建 ASP.NET Core API
dotnet new webapi -n MyApi --use-minimal-apis

# 创建 MAUI 跨平台应用
dotnet new maui -n MyMauiApp

# 创建 xUnit 测试项目
dotnet new xunit -n MyTests

# 添加项目引用
dotnet add reference ../MyLib/MyLib.csproj

# 添加 NuGet 包
dotnet add package Serilog.AspNetCore --version 8.0.0

# 还原包
dotnet restore

# 构建
dotnet build -c Release

# 运行
dotnet run -c Release

# 发布为单文件（自包含）
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true

# Native AOT 发布
dotnet publish -c Release -r linux-x64 -p:PublishAot=true

# 创建解决方案
dotnet new sln -n MySolution
dotnet sln add src/MyApp/MyApp.csproj
dotnet sln add tests/MyTests/MyTests.csproj

# 列出已安装 SDK
dotnet --list-sdks

# 列出已安装 Runtime
dotnet --list-runtimes
```

### 4.2 Runtime 架构示例

```csharp
// 查看 Runtime 信息
Console.WriteLine($"Runtime: {RuntimeInformation.FrameworkDescription}");
Console.WriteLine($"OS: {RuntimeInformation.OSDescription}");
Console.WriteLine($"OS Arch: {RuntimeInformation.OSArchitecture}");
Console.WriteLine($"Process Arch: {RuntimeInformation.ProcessArchitecture}");

// GC 信息
Console.WriteLine($"GC Memory: {GC.GetTotalMemory(false) / 1024 / 1024} MB");
Console.WriteLine($"Max Generation: {GC.MaxGeneration}");
Console.WriteLine($"Server GC: {System.Runtime.GCSettings.IsServerGC}");
Console.WriteLine($"Latency Mode: {System.Runtime.GCSettings.LatencyMode}");

// 触发 GC（生产环境不推荐）
GC.Collect();
GC.WaitForPendingFinalizers();
GC.Collect();

// JIT 信息
Console.WriteLine($"Tiered Compilation: {System.Runtime.CompilerServices.RuntimeFeature.IsSupported("TieredCompilation")}");
```

### 4.3 GC 与对象池

```csharp
using System.Buffers;

// ArrayPool 避免重复分配大数组
byte[] buffer = ArrayPool<byte>.Shared.Rent(1024);
try
{
    // 使用 buffer
    for (int i = 0; i < 1024; i++)
        buffer[i] = (byte)i;
}
finally
{
    ArrayPool<byte>.Shared.Return(buffer);
}

// ObjectPool 自定义对象池
using Microsoft.Extensions.ObjectModel;
var pool = new DefaultObjectPool<StringBuilder>(
    new DefaultPooledObjectPolicy<StringBuilder>(), 100);

var sb = pool.Get();
try
{
    sb.Append("Hello").Append(" ").Append("World");
    Console.WriteLine(sb.ToString());
}
finally
{
    sb.Clear();
    pool.Return(sb);
}

// stackalloc 避免堆分配
unsafe
{
    int* arr = stackalloc int[100];
    for (int i = 0; i < 100; i++)
        arr[i] = i;
}
```

### 4.4 NuGet 包管理

```bash
# 搜索包
dotnet package search serilog
dotnet package search "json serializer" --take 10

# 添加包
dotnet add package Serilog
dotnet add package Serilog --version 4.2.0
dotnet add package Serilog -v 4.*
dotnet add package Serilog --prerelease

# 移除包
dotnet remove package Serilog

# 列出包
dotnet list package
dotnet list package --outdated
dotnet list package --vulnerable
dotnet list package --deprecated

# 还原包
dotnet restore

# 清除缓存
dotnet nuget locals all --clear

# 推送包到 NuGet.org
dotnet pack -c Release
dotnet nuget push bin/Release/MyPackage.1.0.0.nupkg --api-key YOUR_KEY --source https://api.nuget.org/v3/index.json
```

### 4.5 依赖注入

```csharp
// 注册：Program.cs
var builder = WebApplication.CreateBuilder(args);

// Transient：每次解析创建新实例
builder.Services.AddTransient<IEmailService, SmtpEmailService>();

// Scoped：每个请求范围创建一个
builder.Services.AddScoped<IUserService, UserService>();

// Singleton：应用生命周期内单一
builder.Services.AddSingleton<ICacheService, RedisCacheService>();

// 工厂注册
builder.Services.AddSingleton(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    return new RedisCacheService(config["Redis:ConnectionString"]!);
});

// 键控服务（.NET 8+）
builder.Services.AddKeyedSingleton<ICache, MemoryCache>("memory");
builder.Services.AddKeyedSingleton<ICache, RedisCache>("redis");

// HttpClient 工厂
builder.Services.AddHttpClient<IApiClient, ApiClient>(c =>
{
    c.BaseAddress = new Uri("https://api.example.com");
    c.Timeout = TimeSpan.FromSeconds(30);
}).AddPolicyHandler(GetRetryPolicy());

var app = builder.Build();
```

```csharp
// 构造函数注入
public class OrderService
{
    private readonly IOrderRepository _repo;
    private readonly IEmailService _email;
    private readonly ILogger<OrderService> _logger;

    public OrderService(
        IOrderRepository repo,
        IEmailService email,
        ILogger<OrderService> logger)
    {
        _repo = repo;
        _email = email;
        _logger = logger;
    }
}

// 键控服务注入（.NET 8+）
public class OrderService(
    IOrderRepository repo,
    [FromKeyedServices("redis")] ICache cache)
{
    public async Task<Order?> GetAsync(int id)
    {
        var key = $"order:{id}";
        var cached = await cache.GetAsync<Order>(key);
        if (cached is not null) return cached;

        var order = await repo.FindAsync(id);
        if (order is not null)
            await cache.SetAsync(key, order, TimeSpan.FromMinutes(10));
        return order;
    }
}
```

### 4.6 配置系统

```csharp
// appsettings.json
// {
//   "ConnectionStrings": { "Default": "Server=...;Database=..." },
//   "Logging": { "LogLevel": { "Default": "Information" } },
//   "Jwt": { "Secret": "...", "ExpireMinutes": 60 },
//   "FeatureFlags": { "NewUI": true }
// }

// 强类型配置
public class JwtOptions
{
    public required string Secret { get; init; }
    public int ExpireMinutes { get; init; } = 60;
    public string Issuer { get; init; } = "Fandex";
    public string Audience { get; init; } = "Fandex.Api";
}

// 注册配置
builder.Services.Configure<JwtOptions>(
    builder.Configuration.GetSection("Jwt"));

// 使用 IOptions
public class AuthService
{
    private readonly JwtOptions _options;

    public AuthService(IOptions<JwtOptions> options)
    {
        _options = options.Value;
    }
}

// IOptionsMonitor - 支持配置热更新
public class AuthService(IOptionsMonitor<JwtOptions> monitor)
{
    private readonly JwtOptions _options = monitor.CurrentValue;

    public AuthService()
    {
        monitor.OnChange(newOptions =>
        {
            // 配置变更回调
            Console.WriteLine("Jwt config changed");
        });
    }
}

// IOptionsSnapshot - 每次请求获取最新值（Scoped）
public class TokenService(IOptionsSnapshot<JwtOptions> snapshot)
{
    public string GenerateToken()
    {
        var options = snapshot.Value;
        // ...
    }
}

// 自定义配置源
public class EnvConfigSource : IConfigurationSource
{
    public IConfigurationProvider Build(IConfigurationBuilder builder)
        => new EnvConfigProvider();
}

public class EnvConfigProvider : ConfigurationProvider
{
    public override void Load()
    {
        Data["Jwt:Secret"] = Environment.GetEnvironmentVariable("JWT_SECRET")!;
    }
}

// 使用
builder.Configuration.Add(new EnvConfigSource());
```

### 4.7 日志

```csharp
using Serilog;
using Serilog.Events;

// Serilog 配置
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .WriteTo.File("logs/app.log", rollingInterval: RollingInterval.Day)
    .WriteTo.Seq("http://localhost:5341")
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "Fandex.Api")
    .CreateLogger();

try
{
    Log.Information("Starting web host");
    builder.Host.UseSerilog();
    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Host terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

// 使用 ILogger<T>
public class UserService(ILogger<UserService> logger)
{
    public void Register(string username)
    {
        logger.LogInformation("User registered: {Username}", username);
        logger.LogWarning("Username exists: {Username}", username);
        logger.LogError(new InvalidOperationException("DB down"), "Register failed: {Username}", username);
    }
}

// 高性能日志源生成器（.NET 6+）
public partial class UserService
{
    [LoggerMessage(Level = LogLevel.Information, Message = "User {UserId} logged in")]
    public partial void LogLogin(int userId);

    [LoggerMessage(Level = LogLevel.Error, Message = "Order {OrderId} failed")]
    public partial void LogOrderFailed(int orderId, Exception ex);
}
```

### 4.8 ASP.NET Core 最小 API

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddScoped<IUserService, UserService>();
var app = builder.Build();

// 路由
app.MapGet("/", () => "Hello World!");
app.MapGet("/users/{id:int}", (int id, IUserService svc) => svc.GetById(id));
app.MapPost("/users", (CreateUserRequest req, IUserService svc) => svc.Create(req));
app.MapPut("/users/{id}", (int id, UpdateUserRequest req, IUserService svc) => svc.Update(id, req));
app.MapDelete("/users/{id}", (int id, IUserService svc) => svc.Delete(id));

// 分组与路由前缀
var group = app.MapGroup("/api/v1/users")
    .RequireAuthorization()
    .WithTags("User Management");

group.MapGet("/", GetAllUsers);
group.MapGet("/{id}", GetUser);

// 中间件
app.Use(async (context, next) =>
{
    var sw = Stopwatch.StartNew();
    await next(context);
    sw.Stop();
    Console.WriteLine($"{context.Request.Method} {context.Request.Path} - {sw.ElapsedMilliseconds}ms");
});

app.Run();

// 模型绑定
public record CreateUserRequest(string Username, string Email, string Password);
public record UpdateUserRequest(string? Username, string? Email);

// 端点过滤器（.NET 7+）
app.MapGet("/users/{id}", async (int id, IUserService svc) =>
{
    return await svc.GetById(id);
}).AddEndpointFilter(async (context, next) =>
{
    // 前置验证
    var id = (int)context.Arguments[0]!;
    if (id <= 0)
        return Results.BadRequest("Invalid id");

    var result = await next(context);

    // 后置处理
    return result;
});
```

### 4.9 中间件管道

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// 推荐顺序
app.UseExceptionHandler();      // 异常处理（最先）
app.UseHsts();                  // HSTS（生产）
app.UseHttpsRedirection();      // HTTPS 重定向
app.UseStaticFiles();            // 静态文件
app.UseRouting();                // 路由
app.UseCors();                   // CORS
app.UseAuthentication();         // 认证
app.UseAuthorization();          // 授权
app.UseRateLimiter();            // 限流
app.MapControllers();            // 端点映射（最后）

// 自定义中间件
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            await _next(context);
        }
        finally
        {
            sw.Stop();
            _logger.LogInformation("{Method} {Path} - {StatusCode} in {ElapsedMs}ms",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                sw.ElapsedMilliseconds);
        }
    }
}

// 注册
app.UseMiddleware<RequestLoggingMiddleware>();

// 或使用扩展方法
public static class RequestLoggingExtensions
{
    public static IApplicationBuilder UseRequestLogging(this IApplicationBuilder app)
        => app.UseMiddleware<RequestLoggingMiddleware>();
}

// 使用
app.UseRequestLogging();
```

### 4.10 EF Core 数据访问

```csharp
// 定义实体
public class User
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<Order> Orders { get; set; } = new();
}

public class Order
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// DbContext
public class AppDbContext : DbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Order> Orders => Set<Order>();

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Email).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(o => o.User)
                  .WithMany(u => u.Orders)
                  .HasForeignKey(o => o.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.TotalAmount).HasColumnType("decimal(18,2)");
        });
    }
}

// 注册
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));
```

```csharp
// 仓储模式
public class UserRepository(AppDbContext db)
{
    public async Task<User?> GetByIdAsync(int id) =>
        await db.Users.FindAsync(id);

    public async Task<User?> GetByIdWithOrdersAsync(int id) =>
        await db.Users
            .Include(u => u.Orders)
            .FirstOrDefaultAsync(u => u.Id == id);

    public async Task<List<User>> SearchAsync(string keyword) =>
        await db.Users
            .Where(u => u.Name.Contains(keyword))
            .OrderBy(u => u.Name)
            .ToListAsync();

    public async Task<User> CreateAsync(User user)
    {
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public async Task UpdateAsync(User user)
    {
        db.Users.Update(user);
        await db.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        await db.Users.Where(u => u.Id == id).ExecuteDeleteAsync();
    }

    // 批量更新
    public async Task<int> DeactivateOldUsersAsync(DateTime cutoff)
    {
        return await db.Users
            .Where(u => u.CreatedAt < cutoff)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.Name, "Deactivated"));
    }
}
```

### 4.11 EF Core 迁移

```bash
# 安装工具
dotnet tool install --global dotnet-ef

# 创建迁移
dotnet ef migrations add InitialCreate

# 更新数据库
dotnet ef database update

# 移除最近迁移
dotnet ef migrations remove

# 生成 SQL 脚本
dotnet ef migrations script

# 生成 idempotent 脚本
dotnet ef migrations script --idempotent --output migrate.sql
```

```csharp
// 程序内迁移
using var scope = app.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
await db.Database.MigrateAsync();
```

### 4.12 .NET MAUI 跨平台

```csharp
// MauiProgram.cs
public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
            });

        builder.Services.AddTransient<MainPage>();
        builder.Services.AddSingleton<IWeatherService, WeatherService>();

        return builder.Build();
    }
}

// MainPage.xaml
// <ContentPage xmlns="http://schemas.microsoft.com/dotnet/2021/maui"
//              xmlns:x="http://schemas.microsoft.com/winfx/2009/xaml"
//              x:Class="MyApp.MainPage">
//     <VerticalStackLayout Padding="20" Spacing="10">
//         <Label Text="Hello MAUI!" FontSize="32" HorizontalOptions="Center" />
//         <Button Text="Click Me" Clicked="OnButtonClicked" />
//     </VerticalStackLayout>
// </ContentPage>

// MVVM with CommunityToolkit.Mvvm
public partial class MainViewModel : ObservableObject
{
    private readonly IWeatherService _weather;

    [ObservableProperty]
    private string _message = "Hello, MAUI!";

    [ObservableProperty]
    private bool _isLoading;

    public MainViewModel(IWeatherService weather) => _weather = weather;

    [RelayCommand]
    private async Task GreetAsync()
    {
        IsLoading = true;
        try
        {
            var weather = await _weather.GetWeatherAsync();
            Message = $"Weather: {weather}";
        }
        finally
        {
            IsLoading = false;
        }
    }
}
```

### 4.13 性能诊断工具

```bash
# dotnet-counters 实时监控
dotnet tool install --global dotnet-counters
dotnet-counters monitor --process-id <PID> --counters System.Runtime

# dotnet-trace 性能追踪
dotnet tool install --global dotnet-trace
dotnet-trace collect --process-id <PID> --format Speedscope --duration 00:00:30

# dotnet-dump 内存转储
dotnet tool install --global dotnet-dump
dotnet-dump collect --process-id <PID>
dotnet-dump analyze dump.dmp

# dotnet-gcdump 堆转储（小）
dotnet tool install --global dotnet-gcdump
dotnet-gcdump collect --process-id <PID>

# PerfView 深度分析
# https://github.com/microsoft/perfview
```

### 4.14 BenchmarkDotNet 性能基准

```csharp
// dotnet add package BenchmarkDotNet
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;

[MemoryDiagnoser]
public class AllocationBenchmarks
{
    [Benchmark]
    public int[] AllocateArray()
    {
        var arr = new int[1000];
        for (int i = 0; i < 1000; i++)
            arr[i] = i;
        return arr;
    }

    [Benchmark]
    public List<int> AllocateList()
    {
        var list = new List<int>(1000);
        for (int i = 0; i < 1000; i++)
            list.Add(i);
        return list;
    }
}

// 运行
BenchmarkRunner.Run<AllocationBenchmarks>();
```

---

## 5. 对比分析

### 5.1 .NET vs Java (Spring)

| 维度 | .NET 9 / ASP.NET Core | Java 21 / Spring Boot |
| :--- | :--- | :--- |
| **运行时** | CoreCLR（跨平台） | JVM（HotSpot/OpenJ9） |
| **AOT** | Native AOT（实验成熟） | GraalVM Native Image |
| **GC** | Server GC、Background GC | G1/ZGC/Shenandoah |
| **Web 框架** | ASP.NET Core（最小 API） | Spring Boot（MVC/WebFlux） |
| **DI** | 内置 Microsoft.Extensions.DI | Spring IoC |
| **配置** | IOptions<T> 强类型 | @ConfigurationProperties |
| **ORM** | EF Core | Hibernate / JPA |
| **API 文档** | Swashbuckle / NSwag | Springdoc OpenAPI |
| **构建** | dotnet CLI、MSBuild | Maven、Gradle |
| **包管理** | NuGet | Maven Central |
| **协程** | async/await | Virtual Threads（Loom） |
| **启动速度** | 毫秒级（AOT） | 秒级（Native Image 毫秒） |

### 5.2 .NET vs Node.js (Express/NestJS)

| 维度 | .NET 9 | Node.js |
| :--- | :--- | :--- |
| **运行时** | CoreCLR | V8 |
| **并发模型** | 线程池（多线程） | 单线程事件循环 |
| **类型** | 静态强类型 | TypeScript 静态 |
| **性能** | 高（编译为机器码） | 中（JIT） |
| **内存** | Server GC | V8 GC |
| **包管理** | NuGet | npm |
| **生态** | 企业级（微软） | 庞大社区 |
| **异步** | async/await + Task | async/await + Promise |
| **ORM** | EF Core | Prisma / TypeORM |
| **Web 框架** | ASP.NET Core | Express / NestJS / Fastify |
| **启动速度** | 毫秒级 | 秒级 |

### 5.3 .NET vs Python (Django/FastAPI)

| 维度 | .NET 9 | Python |
| :--- | :--- | :--- |
| **运行时** | CoreCLR（编译） | CPython（解释） |
| **性能** | 高 | 低 |
| **类型** | 静态强类型 | 动态（PEP 484 注解） |
| **异步** | async/await + Task | async/await + asyncio |
| **Web 框架** | ASP.NET Core | Django / FastAPI |
| **ORM** | EF Core | SQLAlchemy / Django ORM |
| **ML/AI** | ML.NET | PyTorch / TensorFlow |
| **数据科学** | 较弱 | NumPy / Pandas |
| **包管理** | NuGet | pip / poetry |
| **部署** | 单文件 / 容器 | 容器（需 Python 环境） |

### 5.4 .NET vs Go

| 维度 | .NET 9 | Go |
| :--- | :--- | :--- |
| **运行时** | CoreCLR | Go Runtime |
| **并发** | Task + async/await | goroutine + channel |
| **类型** | 强类型 + 泛型 | 简单类型 + 泛型（1.18+） |
| **GC** | Server GC（分代） | 并发标记-清除（无分代） |
| **AOT** | Native AOT（成熟） | 原生 AOT |
| **二进制大小** | 50-100MB（自包含） | 10-20MB |
| **启动速度** | 毫秒级 | 毫秒级 |
| **包管理** | NuGet | Go Modules |
| **Web 框架** | ASP.NET Core | net/http / Gin / Echo |
| **学习曲线** | 较陡（丰富特性） | 平缓（极简） |

### 5.5 发布模式对比

| 模式 | 二进制大小 | 启动速度 | 内存占用 | 部署依赖 |
| :--- | :--- | :--- | :--- | :--- |
| **FDD**（框架依赖） | < 1MB | 中 | 中 | 需 .NET Runtime |
| **SCD**（自包含） | 60-100MB | 中 | 中 | 无 |
| **Single File** | 60-100MB | 中 | 中 | 无 |
| **Trimmed** | 10-30MB | 中 | 低 | 无 |
| **ReadyToRun** | +20% | 快 | 中 | 无 |
| **Native AOT** | 5-15MB | 极快 | 极低 | 无 |

---

## 6. 常见陷阱与反模式

### 6.1 Singleton 注入 Scoped（俘虏依赖）

```csharp
// 反模式：Singleton 注入 Scoped
public class MySingletonService
{
    private readonly IUserService _userService;   // Scoped！

    public MySingletonService(IUserService userService)
    {
        _userService = userService;
    }
}

// 注册
builder.Services.AddSingleton<MySingletonService>();   // 俘虏依赖
builder.Services.AddScoped<IUserService, UserService>();   // 变成 Singleton 行为
```

**根因**：Singleton 在应用启动时创建，持有的 Scoped 服务实例也被冻结，跨请求共享，导致：

- 数据库上下文（Scoped）跨请求共享，并发冲突。
- 缓存（Scoped）跨请求共享，数据混乱。

**正确做法**：用 `IServiceScopeFactory` 在 Singleton 内创建 scope：

```csharp
public class MySingletonService(IServiceScopeFactory scopeFactory)
{
    public async Task DoWorkAsync()
    {
        using var scope = scopeFactory.CreateScope();
        var userService = scope.ServiceProvider.GetRequiredService<IUserService>();
        await userService.DoAsync();
    }
}
```

### 6.2 DbContext 线程安全问题

```csharp
// 反模式：DbContext 在多线程并发使用
public class MyService(AppDbContext db)
{
    public async Task ProcessMultipleAsync()
    {
        var tasks = Enumerable.Range(0, 10).Select(async i =>
        {
            // 多线程同时使用 db
            var user = await db.Users.FirstAsync();
            return user;
        });
        await Task.WhenAll(tasks);   // 抛 InvalidOperationException
    }
}

// 正确：每个并发任务使用独立 scope
public class MyService(IServiceScopeFactory scopeFactory)
{
    public async Task ProcessMultipleAsync()
    {
        var tasks = Enumerable.Range(0, 10).Select(async i =>
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            return await db.Users.FirstAsync();
        });
        await Task.WhenAll(tasks);
    }
}
```

### 6.3 中间件注册顺序错误

```csharp
// 反模式：路由在异常处理之前
var app = builder.Build();

app.UseRouting();   // 异常未捕获会终止进程
app.UseExceptionHandler();

// 正确：异常处理最先
app.UseExceptionHandler();
app.UseRouting();
app.UseAuthorization();
app.MapControllers();
```

### 6.4 EF Core N+1 查询

```csharp
// 反模式：循环中访问导航属性
var orders = await db.Orders.ToListAsync();   // 1 次查询
foreach (var order in orders)
{
    Console.WriteLine(order.User.Name);   // 每次触发延迟加载，N 次查询
}

// 正确：使用 Include
var orders = await db.Orders
    .Include(o => o.User)
    .ToListAsync();   // 1 次查询（JOIN）

// 或显式 JOIN
var query = from o in db.Orders
            join u in db.Users on o.UserId equals u.Id
            select new { o, u };
var results = await query.ToListAsync();
```

### 6.5 未释放 DbContext

```csharp
// 反模式：手动 new DbContext 但不 Dispose
public void DoWork()
{
    var db = new AppDbContext(/* options */);
    var users = db.Users.ToList();
    // db 未 Dispose，连接未释放
}

// 正确：使用 using
using (var db = new AppDbContext(/* options */))
{
    var users = db.Users.ToList();
}

// DI 注入时由 DI 容器管理生命周期（Scoped 自动 Dispose）
```

### 6.6 异常处理吞噬

```csharp
// 反模式：捕获异常不处理
public async Task DoWorkAsync()
{
    try
    {
        await SaveAsync();
    }
    catch { }   // 吞噬异常
}

// 正确：记录并重新抛或返回错误
public async Task DoWorkAsync()
{
    try
    {
        await SaveAsync();
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Save failed");
        throw;   // 让上层处理
    }
}
```

### 6.7 GC.Collect 滥用

```csharp
// 反模式：手动触发 GC
public void ProcessLargeData()
{
    var data = LoadLargeData();
    Process(data);
    GC.Collect();   // 不推荐
    GC.WaitForPendingFinalizers();
    GC.Collect();
}

// 正确：让 GC 自行管理
// 或使用 using / Dispose 释放非托管资源
```

### 6.8 大对象堆碎片

```csharp
// 反模式：频繁分配大对象
public byte[] Process(byte[] input)
{
    var temp1 = new byte[100_000];   // LOH
    var temp2 = new byte[100_000];   // LOH
    // 临时大对象频繁分配导致 LOH 碎片
    return result;
}

// 正确：使用 ArrayPool
public byte[] Process(byte[] input)
{
    var temp1 = ArrayPool<byte>.Shared.Rent(100_000);
    var temp2 = ArrayPool<byte>.Shared.Rent(100_000);
    try
    {
        // 使用 temp1, temp2
        return result;
    }
    finally
    {
        ArrayPool<byte>.Shared.Return(temp1);
        ArrayPool<byte>.Shared.Return(temp2);
    }
}
```

### 6.9 反射性能问题

```csharp
// 反模式：频繁反射
public object CreateInstance(string typeName)
{
    var type = Type.GetType(typeName);
    return Activator.CreateInstance(type);   // 慢
}

// 正确：使用表达式树缓存
private static readonly ConcurrentDictionary<string, Func<object>> _cache = new();

public object CreateInstance(string typeName)
{
    return _cache.GetOrAdd(typeName, name =>
    {
        var type = Type.GetType(name);
        var ctor = type.GetConstructor(Type.EmptyTypes);
        var newExpr = Expression.New(ctor);
        var lambda = Expression.Lambda<Func<object>>(newExpr);
        return lambda.Compile();
    })();
}
```

### 6.10 配置硬编码

```csharp
// 反模式：硬编码连接字符串
public class MyService
{
    private readonly string _connectionString = "Server=...;Database=...";

    public async Task DoAsync()
    {
        using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync();
    }
}

// 正确：使用 IConfiguration 注入
public class MyService(IConfiguration config)
{
    private readonly string _connectionString = config.GetConnectionString("Default");
}
```

### 6.11 同步 IO 在异步方法中

```csharp
// 反模式：异步方法中使用同步 IO
public async Task ProcessAsync()
{
    var content = File.ReadAllText("data.txt");   // 同步阻塞
    await Task.Delay(100);
}

// 正确：使用异步 IO
public async Task ProcessAsync()
{
    var content = await File.ReadAllTextAsync("data.txt");
    await Task.Delay(100);
}
```

### 6.12 未使用 CancellationToken

```csharp
// 反模式：未传 CancellationToken
public async Task ProcessAsync()
{
    await Task.Delay(1000);   // 无法取消
    await NextOpAsync();      // 无法取消
}

// 正确：传递 CancellationToken
public async Task ProcessAsync(CancellationToken ct = default)
{
    await Task.Delay(1000, ct);
    await NextOpAsync(ct);
}
```

---

## 7. 工程实践与最佳实践

### 7.1 项目结构分层

```
src/
  MyApp.Api/            # API 层
    Controllers/
    Program.cs
  MyApp.Application/   # 应用层
    Services/
    DTOs/
  MyApp.Domain/         # 领域层
    Entities/
    ValueObjects/
  MyApp.Infrastructure/ # 基础设施层
    Persistence/
    Repositories/
    External/
tests/
  MyApp.UnitTests/
  MyApp.IntegrationTests/
```

### 7.2 DI 注册最佳实践

```csharp
// 服务接口与实现分离
public interface IUserService { ... }
public class UserService : IUserService { ... }

// 注册
builder.Services.AddScoped<IUserService, UserService>();

// 避免：直接注册具体类
builder.Services.AddScoped<UserService>();   // 难以测试与替换
```

### 7.3 配置强类型化

```csharp
// 使用 IOptions<T> 绑定强类型
public class JwtOptions
{
    public required string Secret { get; init; }
    public int ExpireMinutes { get; init; } = 60;
}

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));

// 使用 IOptionsMonitor 支持热更新
// 使用 IOptionsSnapshot 在请求范围获取最新
```

### 7.4 日志结构化

```csharp
// 使用结构化日志（参数化）
logger.LogInformation("User {UserId} logged in from {IP}", userId, ip);

// 避免：字符串拼接（无结构）
logger.LogInformation($"User {userId} logged in from {ip}");
```

### 7.5 异步端到端

```csharp
// 控制器异步
public async Task<User> GetUserAsync(int id)
{
    return await _userService.GetByIdAsync(id);
}

// 服务异步
public async Task<User> GetByIdAsync(int id)
{
    return await _repo.FindAsync(id);
}

// 仓储异步
public async Task<User> FindAsync(int id)
{
    return await _db.Users.FindAsync(id);
}
```

### 7.6 EF Core 性能优化

```csharp
// 使用 AsNoTracking 提升只读查询
var users = await db.Users
    .AsNoTracking()
    .Where(u => u.Age > 18)
    .ToListAsync();

// 使用投影避免加载整行
var dtos = await db.Users
    .Where(u => u.Age > 18)
    .Select(u => new UserDto { Id = u.Id, Name = u.Name })
    .ToListAsync();

// 批量操作用 ExecuteUpdate/ExecuteDelete
await db.Users
    .Where(u => u.LastLogin < DateTime.UtcNow.AddYears(-1))
    .ExecuteDeleteAsync();

// 分页
var page = await db.Users
    .OrderBy(u => u.Id)
    .Skip((pageNumber - 1) * pageSize)
    .Take(pageSize)
    .ToListAsync();
```

### 7.7 中间件异常处理

```csharp
// 全局异常处理中间件
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await _next(ctx);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            ctx.Response.StatusCode = 500;
            ctx.Response.ContentType = "application/json";
            await ctx.Response.WriteAsync("""{"error":"Internal Server Error"}""");
        }
    }
}

// 或使用内置 UseExceptionHandler + ProblemDetails
builder.Services.AddProblemDetails();
app.UseExceptionHandler();
```

### 7.8 健康检查

```csharp
builder.Services.AddHealthChecks()
    .AddSqlServer(connectionString)
    .AddRedis(redisConnection)
    .AddUrlGroup(new Uri("https://api.external.com"), "External API");

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
```

### 7.9 限流与熔断

```csharp
// .NET 7+ 内置限流
builder.Services.AddRateLimiter(opts =>
{
    opts.AddFixedWindowLimiter("fixed", opt =>
    {
        opt.Window = TimeSpan.FromSeconds(10);
        opt.PermitLimit = 100;
    });

    opts.AddTokenBucketLimiter("token", opt =>
    {
        opt.TokenLimit = 50;
        opt.TokensPerPeriod = 10;
        opt.ReplenishmentPeriod = TimeSpan.FromSeconds(1);
    });
});

app.UseRateLimiter();

// 端点应用限流策略
app.MapGet("/api/data", () => "data").RequireRateLimiting("fixed");

// 使用 Polly 熔断
// dotnet add package Microsoft.Extensions.Http.Polly
builder.Services.AddHttpClient<IApiClient, ApiClient>()
    .AddTransientHttpErrorPolicy(p =>
        p.CircuitBreakerAsync(5, TimeSpan.FromSeconds(30)));
```

### 7.10 性能优化技巧

```csharp
// 使用 Span<T> 与 stackalloc 减少分配
public int Sum(ReadOnlySpan<int> arr)
{
    int sum = 0;
    foreach (var x in arr) sum += x;
    return sum;
}

// 调用
Span<int> arr = stackalloc int[100];
for (int i = 0; i < 100; i++) arr[i] = i;
Console.WriteLine(Sum(arr));

// 使用 ArrayPool
byte[] buffer = ArrayPool<byte>.Shared.Rent(1024);
try { /* ... */ }
finally { ArrayPool<byte>.Shared.Return(buffer); }

// 使用 string.Create 减少分配
string result = string.Create(10, 0, (span, state) =>
{
    for (int i = 0; i < 10; i++)
        span[i] = (char)('a' + i);
});

// 使用 StringBuilder 拼接循环
var sb = new StringBuilder();
for (int i = 0; i < 1000; i++)
    sb.Append(i);
var result = sb.ToString();
```

### 7.11 部署与容器化

```dockerfile
# Dockerfile
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["MyApp.csproj", "./"]
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 80
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

```bash
# 构建
docker build -t myapp:latest .

# 运行
docker run -d -p 8080:80 myapp:latest

# 多阶段构建（alpine 小镜像）
docker build -t myapp:alpine -f Dockerfile.alpine .
```

### 7.12 CI/CD GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '9.0.x'
      - run: dotnet restore
      - run: dotnet build -c Release --no-restore
      - run: dotnet test -c Release --no-build
      - run: dotnet publish -c Release -o ./publish
      - uses: actions/upload-artifact@v4
        with:
          name: app
          path: ./publish
```

---

## 8. 案例研究

### 8.1 电商订单系统

```csharp
// 领域实体
public class Order
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public List<OrderItem> Items { get; set; } = new();
    public decimal TotalAmount => Items.Sum(i => i.Price * i.Quantity);
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum OrderStatus { Pending, Paid, Shipped, Delivered, Cancelled }

// 应用服务
public class OrderService(
    AppDbContext db,
    IEmailService email,
    ILogger<OrderService> logger)
{
    public async Task<Order> CreateAsync(int userId, List<OrderItem> items, CancellationToken ct = default)
    {
        var order = new Order { UserId = userId, Items = items };
        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);

        logger.LogInformation("Order {OrderId} created for user {UserId}", order.Id, userId);
        await email.SendAsync(userId, $"Order {order.Id} created", ct);

        return order;
    }

    public async Task PayAsync(int orderId, CancellationToken ct = default)
    {
        var order = await db.Orders.FindAsync([orderId], ct)
            ?? throw new InvalidOperationException("Order not found");

        if (order.Status != OrderStatus.Pending)
            throw new InvalidOperationException("Order is not pending");

        order.Status = OrderStatus.Paid;
        await db.SaveChangesAsync(ct);
    }
}
```

### 8.2 限流 API 网关

```csharp
// Program.cs
builder.Services.AddRateLimiter(opts =>
{
    opts.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return RateLimitPartition.GetFixedWindowLimiter(ip, _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromMinutes(1),
            PermitLimit = 100
        });
    });

    opts.AddPolicy("user", httpContext =>
    {
        var userId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return RateLimitPartition.GetTokenBucketLimiter(userId, _ => new TokenBucketRateLimiterOptions
        {
            TokenLimit = 1000,
            TokensPerPeriod = 100,
            ReplenishmentPeriod = TimeSpan.FromSeconds(10),
            AutoReplenishment = true
        });
    });
});

app.UseRateLimiter();

// 应用到端点
app.MapGet("/api/data", () => "data").RequireRateLimiting("user");
```

### 8.3 健康检查仪表板

```csharp
// 自定义健康检查
public class DiskSpaceHealthCheck : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken ct = default)
    {
        var drive = new DriveInfo("C");
        var freePercent = (double)drive.AvailableFreeSpace / drive.TotalSize * 100;

        return Task.FromResult(freePercent switch
        {
            > 20 => HealthCheckResult.Healthy($"Disk {freePercent:F1}% free"),
            > 10 => HealthCheckResult.Degraded($"Disk {freePercent:F1}% free"),
            _ => HealthCheckResult.Unhealthy($"Disk {freePercent:F1}% free")
        });
    }
}

// 注册
builder.Services.AddHealthChecks()
    .AddCheck<DiskSpaceHealthCheck>("disk", tags: ["ready"])
    .AddSqlServer(connectionString, tags: ["ready"])
    .AddRedis(redisConnection, tags: ["ready"]);

// 端点
app.MapHealthChecks("/health/live");   // liveness
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
```

### 8.4 异步消息总线

```csharp
// 使用 MassTransit（RabbitMQ / Azure Service Bus / Kafka）
// dotnet add package MassTransit.RabbitMQ
builder.Services.AddMassTransit(x =>
{
    x.AddConsumer<OrderCreatedConsumer>();

    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("localhost", "/", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });

        cfg.ReceiveEndpoint("order-created", e =>
        {
            e.ConfigureConsumer<OrderCreatedConsumer>(context);
        });
    });
});

// 消费者
public class OrderCreatedConsumer : IConsumer<OrderCreatedEvent>
{
    public async Task Consume(ConsumeContext<OrderCreatedEvent> context)
    {
        var msg = context.Message;
        Console.WriteLine($"Order {msg.OrderId} created for user {msg.UserId}");
        await Task.CompletedTask;
    }
}

// 发布
public class OrderService(IPublishEndpoint publish)
{
    public async Task CreateAsync(int userId)
    {
        // 创建订单...
        await publish.Publish(new OrderCreatedEvent(orderId, userId));
    }
}

public record OrderCreatedEvent(int OrderId, int UserId);
```

### 8.5 跨平台 MAUI 待办应用

```csharp
// Todo.cs
public class Todo
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public bool IsCompleted { get; set; }
}

// TodoDatabase.cs (SQLite)
public class TodoDatabase
{
    private readonly SQLiteAsyncConnection _connection;

    public TodoDatabase(string path)
    {
        _connection = new SQLiteAsyncConnection(path);
        _connection.CreateTableAsync<Todo>().Wait();
    }

    public Task<List<Todo>> GetAllAsync() => _connection.Table<Todo>().ToListAsync();
    public Task<int> SaveAsync(Todo todo) => _connection.InsertOrReplaceAsync(todo);
    public Task<int> DeleteAsync(Todo todo) => _connection.DeleteAsync(todo);
}

// TodoViewModel.cs
public partial class TodoViewModel : ObservableObject
{
    private readonly TodoDatabase _db;

    [ObservableProperty]
    private ObservableCollection<Todo> _todos = new();

    [ObservableProperty]
    private string _newTodoTitle = "";

    public TodoViewModel(TodoDatabase db) => _db = db;

    [RelayCommand]
    private async Task LoadAsync()
    {
        var todos = await _db.GetAllAsync();
        Todos = new ObservableCollection<Todo>(todos);
    }

    [RelayCommand]
    private async Task AddAsync()
    {
        if (string.IsNullOrWhiteSpace(NewTodoTitle)) return;

        var todo = new Todo { Title = NewTodoTitle };
        await _db.SaveAsync(todo);
        Todos.Add(todo);
        NewTodoTitle = "";
    }

    [RelayCommand]
    private async Task ToggleAsync(Todo todo)
    {
        todo.IsCompleted = !todo.IsCompleted;
        await _db.SaveAsync(todo);
    }
}
```

### 8.6 高性能 Web API

```csharp
// 使用 Span 与 ArrayPool
app.MapGet("/process/{size:int}", (int size) =>
{
    var buffer = ArrayPool<byte>.Shared.Rent(size);
    try
    {
        // 处理
        return Results.Ok(buffer.AsSpan(0, size).ToArray());
    }
    finally
    {
        ArrayPool<byte>.Shared.Return(buffer);
    }
});

// 使用 Native AOT
// dotnet publish -c Release -r linux-x64 -p:PublishAot=true
// 启动 < 100ms，内存 < 50MB
```

### 8.7 gRPC 服务

```csharp
// dotnet add package Grpc.AspNetCore
// Protos/greet.proto
// syntax = "proto3";
// service Greeter { rpc SayHello (HelloRequest) returns (HelloReply); }
// message HelloRequest { string name = 1; }
// message HelloReply { string message = 1; }

// Services/GreeterService.cs
public class GreeterService : Greeter.GreeterBase
{
    public override Task<HelloReply> SayHello(HelloRequest request, ServerCallContext context)
    {
        return Task.FromResult(new HelloReply { Message = $"Hello {request.Name}" });
    }
}

// Program.cs
builder.Services.AddGrpc();
app.MapGrpcService<GreeterService>();
```

### 8.8 SignalR 实时通信

```csharp
// Hubs/ChatHub.cs
public class ChatHub : Hub
{
    public async Task SendMessage(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }
}

// Program.cs
builder.Services.AddSignalR();
app.MapHub<ChatHub>("/chat");

// 客户端
var connection = new HubConnectionBuilder()
    .WithUrl("https://localhost:5001/chat")
    .Build();

connection.On<string, string>("ReceiveMessage", (user, message) =>
{
    Console.WriteLine($"{user}: {message}");
});

await connection.StartAsync();
await connection.InvokeAsync("SendMessage", "Alice", "Hello");
```

---

### 简答题知识点讲解

**常见疑问 4**：解释 .NET 中 GC 的分代机制，为何能提升性能？

**解析讲解**：

.NET GC 分为三代（Gen0/Gen1/Gen2）+ LOH/POH：

- **Gen0**：最短命对象（局部变量），频繁回收，暂停短。
- **Gen1**：缓冲区，存活过 Gen0 的对象。
- **Gen2**：长期存活对象，不频繁回收。
- **LOH**：大对象（≥85000 字节），直接 Gen2。
- **POH**：固定对象，避免 GC 移动。

性能提升原理：

1. **局部性原理**：新对象集中在 Gen0，缓存友好。
2. **分代假设**：新对象死亡率高，Gen0 GC 仅扫描 Gen0，速度快。
3. **暂停优化**：Gen0 GC 暂停时间 < 1ms，Gen2 GC 较少触发。

**常见疑问 5**：说明 `IOptions<T>`、`IOptionsSnapshot<T>`、`IOptionsMonitor<T>` 的差异。

**解析讲解**：

- **`IOptions<T>`**：单例，启动时绑定一次，值不变。
- **`IOptionsSnapshot<T>`**：Scoped，每次请求重新绑定，支持配置热更新（仅 Scoped）。
- **`IOptionsMonitor<T>`**：Singleton，监听配置变更，触发 `OnChange` 回调，支持热更新。

### 编程题知识点讲解

**常见疑问 6**：实现一个 ASP.NET Core 最小 API，包含 GET/POST/PUT/DELETE 操作，使用 EF Core 与 SQLite。

**解析讲解**：

```csharp
// Program.cs
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlite("Data Source=todos.db"));

var app = builder.Build();

// 自动迁移
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

app.MapGet("/todos", async (AppDbContext db) =>
    Results.Ok(await db.Todos.ToListAsync()));

app.MapGet("/todos/{id}", async (int id, AppDbContext db) =>
    await db.Todos.FindAsync(id) is { } todo
        ? Results.Ok(todo)
        : Results.NotFound());

app.MapPost("/todos", async (Todo todo, AppDbContext db) =>
{
    db.Todos.Add(todo);
    await db.SaveChangesAsync();
    return Results.Created($"/todos/{todo.Id}", todo);
});

app.MapPut("/todos/{id}", async (int id, Todo input, AppDbContext db) =>
{
    var todo = await db.Todos.FindAsync(id);
    if (todo is null) return Results.NotFound();

    todo.Title = input.Title;
    todo.IsCompleted = input.IsCompleted;
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapDelete("/todos/{id}", async (int id, AppDbContext db) =>
{
    var todo = await db.Todos.FindAsync(id);
    if (todo is null) return Results.NotFound();

    db.Todos.Remove(todo);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.Run();

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> opts) : base(opts) { }
    public DbSet<Todo> Todos => Set<Todo>();
}

public class Todo
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public bool IsCompleted { get; set; }
}
```

**常见疑问 7**：使用 `Channel<T>` 实现一个简单的后台任务队列。

**解析讲解**：

```csharp
public class BackgroundTaskQueue
{
    private readonly Channel<Func<CancellationToken, Task>> _channel;

    public BackgroundTaskQueue(int capacity = 100)
    {
        _channel = Channel.CreateBounded<Func<CancellationToken, Task>>(capacity);
    }

    public async ValueTask EnqueueAsync(Func<CancellationToken, Task> task, CancellationToken ct = default)
        => await _channel.Writer.WriteAsync(task, ct);

    public IAsyncEnumerable<Func<CancellationToken, Task>> DequeueAllAsync(CancellationToken ct = default)
        => _channel.Reader.ReadAllAsync(ct);

    public void Complete() => _channel.Writer.Complete();
}

// Hosted Service
public class BackgroundTaskWorker : BackgroundService
{
    private readonly BackgroundTaskQueue _queue;

    public BackgroundTaskWorker(BackgroundTaskQueue queue) => _queue = queue;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var task in _queue.DequeueAllAsync(stoppingToken))
        {
            try
            {
                await task(stoppingToken);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Task failed: {ex.Message}");
            }
        }
    }
}

// 注册
builder.Services.AddSingleton<BackgroundTaskQueue>();
builder.Services.AddHostedService<BackgroundTaskWorker>();
```

### 11.1 官方文档

- **.NET 文档**：https://learn.microsoft.com/en-us/dotnet/
- **ASP.NET Core 文档**：https://learn.microsoft.com/en-us/aspnet/core/
- **EF Core 文档**：https://learn.microsoft.com/en-us/ef/core/
- **.NET MAUI 文档**：https://learn.microsoft.com/en-us/dotnet/maui/
- **NuGet 文档**：https://learn.microsoft.com/en-us/nuget/
- **性能文档**：https://learn.microsoft.com/en-us/dotnet/core/performance/

### 11.2 系列交叉引用

- FANDEX C# 系列：概述与环境配置
- FANDEX C# 系列：基础语法
- FANDEX C# 系列：面向对象编程
- FANDEX C# 系列：泛型与集合
- FANDEX C# 系列：LINQ 与函数式编程
- FANDEX C# 系列：异步编程
- FANDEX C# 系列：高级特性
- FANDEX C# 系列：测试与工程化
- FANDEX C# 系列：游戏开发与 Unity

### 11.3 进阶书籍

- Mark Michaelis. 2022. *Essential C# 11.0*. Addison-Wesley Professional.
- Joseph Albahari. 2023. *C# 12 in a Nutshell*. O'Reilly Media.
- Andrew Lock, 2024. *ASP.NET Core in Action*. Manning Publications, 3rd Edition.
- Jon Smith. 2022. *Entity Framework Core in Action*. Manning Publications, 2nd Edition.
- Paul DeCarlo. 2023. *Practical .NET MAUI*. Apress.
- Matthew Groves. 2022. *Microservices in .NET Core*. Manning Publications.

### 11.6 工具

- **BenchmarkDotNet**：https://benchmarkdotnet.org/（性能基准）
- **dotnet-counters**：实时性能监控
- **dotnet-trace**：性能追踪
- **dotnet-dump**：内存转储分析
- **PerfView**：深度性能分析
- **JetBrains dotPeak / dnSpy**：反编译工具
- **Visual Studio / Rider**：IDE
- **Postman / Bruno**：API 测试
- **kubectl / Docker**：容器化部署
- **Seq / Grafana / Kibana**：日志聚合

### 11.7 实战案例参考

- **eShopOnContainers**：https://github.com/dotnet-architecture/eShopOnContainers
- **Clean Architecture Template**：https://github.com/jasontaylordev/CleanArchitecture
- **FastEndpoints**：https://github.com/FastEndpoints/FastEndpoints
- **ASP.NET Core Samples**：https://github.com/dotnet/AspNetCore.Docs
- **.NET MAUI Samples**：https://github.com/dotnet/maui-samples

---

> **结语**：.NET 平台历经 20 余年演化，从闭源 Windows-only 的 .NET Framework 到开源跨平台的 .NET 9，已成为企业级应用开发的主流平台之一。掌握 Runtime、BCL、DI、配置、日志、中间件、ASP.NET Core、EF Core、MAUI 等核心组件，将帮助你构建高性能、可维护、跨平台的现代应用。下一篇我们将讲解测试与工程化：单元测试、集成测试、CI/CD、代码质量工具等。
