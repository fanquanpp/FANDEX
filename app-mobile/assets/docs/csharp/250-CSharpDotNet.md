---
order: 280
title: .NET 平台架构与演化史
module: 'csharp'
category: 后端技术
difficulty: intermediate
description: .NET 平台本位：Framework 到 .NET 10 的演化史、平台架构、AOT 编译限制、跨语言生态对比、项目结构分层与部署运维。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'csharp/010-WhatIsCSharp'
  - 'csharp/255-ConfigurationAndLogging'
  - 'csharp/480-DotnetCli'
prerequisites:
  - 'csharp/010-WhatIsCSharp'
---

## 知识点地图

- **知识类别**：平台与 CLI / .NET 平台本位（演化史、架构、生态对比与部署运维）。
- **解决什么问题**：写 C# 代码之外还需要理解「代码跑在什么上面」：CLR/JIT/AOT 的关系、SDK 与运行时的分野、版本战略（LTS/STS）、与其他平台生态的定位差异。本篇是平台层的总纲。
- **什么时候用到**：选择目标框架与发布方式时；CI 里选 SDK 版本与容器镜像时；理解「为什么这个 API 在这个 TFM 下不存在」时。

## 与相邻篇章的分工（本篇原为「C# 与 .NET」，多主题节已按销账清单分流）

- 配置系统与日志 -> [配置系统与日志](/csharp/255-ConfigurationAndLogging)
- 依赖注入 -> [C# 依赖注入](/csharp/260-CSharpDependencyInjection)；EF Core -> [C# EF Core](/csharp/280-CSharpEFCore)
- 中间件与最小 API -> [ASP.NET Core 中间件管道](/csharp/310-AspNetCoreMiddlewarePipeline)
- GC 与对象池 -> [GC 分代与调优](/csharp/390-GCGeneration)；性能诊断与基准 -> [性能与基准测试](/csharp/400-DotnetPerformanceBenchmarking)
- CLI 命令与 NuGet -> [.NET CLI](/csharp/480-DotnetCli)；MAUI -> [C# MAUI](/csharp/330-CSharpMAUI)

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
- **.NET 9.0**（2024）：STS（标准期限支持，支持期 18 个月，已于 2026-05 到期），C# 13.0，`params` 集合、新 `System.Threading.Lock` 类型、AOT 增强。
- **.NET 10.0**（2025）：LTS（支持至 2028-11），C# 14.0，扩展成员（extension members）、`field` 关键字、null 条件赋值；BCL 侧 LINQ 新增 `LeftJoin`/`RightJoin` 运算符。

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

## 2. 形式化定义：平台架构

### 2.1 分层视图

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

## 3. 理论推导：AOT 编译限制

### 3.1 AOT 的裁剪与限制

**命题 4.5**：Native AOT 编译应用无法运行时反射生成代码。

**证明**：

Native AOT 在发布时将 IL 编译为本机码，并裁剪未引用的代码。运行时无 JIT，故：

1. `Assembly.Load` 无法加载新程序集。
2. `Emit.DynamicMethod` 无法生成方法。
3. 反射创建实例需 AOT 时已包含该类型。
4. JSON 序列化需源生成器（`JsonSerializerContext`）而非反射。

`Trimming` 移除未引用代码，但反射引用可能不被识别，需 `[DynamicDependency]` 标注或 `TrimmerRootDescriptor`。

---

## 4. 代码示例：Runtime 架构

### 4.1 Runtime 架构示例

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

## 5. 对比分析：平台生态定位

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

## 6. 工程实践：项目结构与部署运维

### 6.1 项目结构分层

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

### 6.2 部署与容器化

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

### 6.3 CI/CD GitHub Actions

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

## 7. 案例研究（综合案例收官）

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

> **结语**：.NET 平台历经 20 余年演化，从闭源 Windows-only 的 .NET Framework 到开源跨平台的 .NET 10（当前 LTS），已成为企业级应用开发的主流平台之一。掌握 Runtime、BCL、DI、配置、日志、中间件、ASP.NET Core、EF Core、MAUI 等核心组件，将帮助你构建高性能、可维护、跨平台的现代应用。下一篇我们将讲解测试与工程化：单元测试、集成测试、CI/CD、代码质量工具等。

---

## 8. 拆分销账清单

本篇原为「C# 与 .NET」大杂烩。按「一类一文件」原则，各节去向如下（「并入」= 目标专篇已有同主题内容，删除属重复冗余）：

| 原节 | 去向 |
| --- | --- |
| §2.2 类型系统形式化 | 并入 [值类型与引用类型](/csharp/050-ValueTypeReferenceType) |
| §2.3 GC 形式化 / §3.1 GC 暂停复杂度 / §4.3 GC 与对象池 / 陷阱 §6.7 GC.Collect 滥用 / §6.8 大对象堆碎片 | 并入 [GC 分代与调优](/csharp/390-GCGeneration) |
| §2.4 DI 容器形式化 / §3.2 DI 解析复杂度 / §4.5 依赖注入 / 陷阱 §6.1 Singleton 俘虏 Scoped / 实践 §7.2 DI 注册 | 并入 [C# 依赖注入](/csharp/260-CSharpDependencyInjection) |
| §2.5 配置系统形式化 / §4.6 配置系统 / 陷阱 §6.10 配置硬编码 / 实践 §7.3 配置强类型化 | 承接扩写为 [配置系统与日志](/csharp/255-ConfigurationAndLogging) |
| §4.7 日志 / 实践 §7.4 日志结构化 | 承接扩写为 [配置系统与日志](/csharp/255-ConfigurationAndLogging) |
| §2.6 中间件管道形式化 / §3.3 中间件执行顺序 / §4.8 最小 API / §4.9 中间件管道 / 陷阱 §6.3 注册顺序 / 实践 §7.7 中间件异常处理 / §7.8 健康检查 / §7.9 限流熔断 | 并入 [ASP.NET Core 中间件管道](/csharp/310-AspNetCoreMiddlewarePipeline)（最小 API 作为管道端点随行） |
| §2.7 EF Core 形式化 / §3.4 N+1 问题 / §4.10 EF Core 数据访问 / §4.11 EF Core 迁移 / 陷阱 §6.2 DbContext 线程安全 / §6.4 N+1 / §6.5 未释放 / 实践 §7.6 EF 性能 | 并入 [C# EF Core](/csharp/280-CSharpEFCore) |
| §4.1 dotnet CLI 命令 / §4.4 NuGet 包管理 / §5.5 发布模式对比 | 并入 [.NET CLI](/csharp/480-DotnetCli) |
| §4.12 .NET MAUI | 并入 [C# MAUI](/csharp/330-CSharpMAUI) |
| §4.13 性能诊断工具 / §4.14 BenchmarkDotNet / 实践 §7.10 性能优化技巧 | 并入 [性能与基准测试](/csharp/400-DotnetPerformanceBenchmarking) |
| 陷阱 §6.6 异常处理吞噬 | 并入 [异常处理与健壮性](/csharp/062-ExceptionHandling) |
| 陷阱 §6.9 反射性能 | 并入 [C# 反射](/csharp/350-CSharpReflection) |
| 陷阱 §6.11 同步 IO / §6.12 未用 CancellationToken / 实践 §7.5 异步端到端 | 并入 [异步编程详解](/csharp/090-AsyncProgrammingDetailed) |

**保留本篇的主题**：§1 演化史、§2.1 平台架构、§3.1 AOT 限制、§4.1 Runtime 架构、§5 平台生态对比、§7.1 项目结构分层、§7.2/7.3 部署与 CI/CD、§8 综合案例研究（跨主题收官案例，各专篇在相关节互链）、习题与参考。
