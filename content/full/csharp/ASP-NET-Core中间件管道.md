---
order: 105
title: 'ASP-NET-Core中间件管道'
module: csharp
category: 'dev-lang'
difficulty: advanced
description: 'ASP.NET Core中间件管道详解：从IApplicationBuilder到HttpContext的完整指南，涵盖管道构建、依赖注入、性能优化与生产级实践。'
author: fanquanpp
updated: '2026-06-14'
related:
  - csharp/反射与特性应用
  - 'csharp/Entity-Framework-Core迁移与优化'
  - csharp/依赖注入生命周期
  - csharp/GC代机制
prerequisites:
  - csharp/概述与环境配置
---

# ASP-NET-Core中间件管道

> "管道组合是函数式编程的核心思想在 Web 框架中的工程化体现——每个中间件都是一个变换器，将 Request 与 Response 的流编织成一条可观测、可插拔的责任链。" —— David Fowler, *ASP.NET Core Architecture Lead*

## 1. 学习目标

本章节遵循 Bloom 分类法（Bloom's Taxonomy）设定六层认知目标，学习者完成本章后应能够：

### 1.1 Remember（记忆）

- **R1**：准确陈述 ASP.NET Core 请求处理管道的三层架构（Kestrel → Middleware Pipeline → Endpoint Routing）。
- **R2**：列举 `IApplicationBuilder` 的核心方法：`Use`、`Run`、`Map`、`MapWhen`、`UseMiddleware`、`New`、`Build`。
- **R3**：回忆 `HttpContext` 的六大核心属性：`Request`、`Response`、`Connection`、`Features`、`User`、`Items`。
- **R4**：背诵 ASP.NET Core 官方推荐的中间件注册顺序（ExceptionHandler → HSTS → HttpsRedirection → StaticFiles → Routing → CORS → Authentication → Authorization → Endpoints）。

### 1.2 Understand（理解）

- **U1**：解释中间件管道的洋葱模型（Onion Model）与函数组合（function composition）的等价关系。
- **U2**：阐述 `RequestDelegate`（`Func<HttpContext, Task>`）作为管道核心抽象的语义与契约。
- **U3**：说明基于约定的中间件（Convention-based Middleware）与基于工厂的中间件（Factory-based Middleware）在依赖注入上的差异。
- **U4**：描述 Endpoint Routing 的三阶段流程：`UseRouting`（路由解析）→ Endpoint 执行 → `UseEndpoints`（端点调度）。

### 1.3 Apply（应用）

- **A1**：使用 `IMiddleware` 接口实现支持 scoped 依赖注入的中间件，并通过 `UseMiddleware<T>()` 注册。
- **A2**：编写自定义异常处理中间件，集成 ProblemDetails（RFC 7807）规范输出错误响应。
- **A3**：实现一个基于 `IAsyncEnumerable<T>` 的流式响应中间件，支持 Server-Sent Events（SSE）。
- **A4**：使用 `IStartupFilter` 在管道构建期注入全局中间件，实现可插拔的横切关注点（cross-cutting concerns）。

### 1.4 Analyze（分析）

- **An1**：解构 `IApplicationBuilder.Build()` 的内部实现，分析委托链构造的逆序组合算法。
- **An2**：分析中间件管道中的异步上下文流动（`AsyncLocal<T>`、`ExecutionContext`）与线程池调度的交互。
- **An3**：剖析 `HttpContext` 的池化策略（`HttpContextPool`）与 GC 压力的关系，对比 `IDisposable` 与 `IAsyncDisposable`。
- **An4**：对比 Endpoint Routing 与传统 MVC 路由（`UseMvc`）在性能与可扩展性上的根本差异。

### 1.5 Evaluate（评价）

- **E1**：评估中间件 vs. Filter（`IActionFilter`、`IExceptionFilter`）在横切关注点分层上的适用边界。
- **E2**：判断高并发场景下同步中间件（`void Invoke`）对线程池的饥饿风险，并设计异步优先策略。
- **E3**：审视 `UseMiddleware<T>()` 反射开销在 NativeAOT 场景下的限制，并评估 Source Generator 替代方案。
- **E4**：评价 YARP（Yet Another Reverse Proxy）基于管道架构的反向代理设计模式。

### 1.6 Create（创造）

- **C1**：设计一个支持中间件元数据（middleware metadata）的扩展框架，编译期生成 pipeline 图与依赖分析报告。
- **C2**：实现一个基于 `System.Threading.Channels` 的请求队列中间件，支持背压（backpressure）与超时取消。
- **C3**：构建一个可视化管道调试工具，运行时捕获每个中间件的耗时、状态码变更、异常路径。
- **C4**：编写一个 Roslyn 分析器，检测管道顺序错误（如 `UseAuthentication` 在 `UseRouting` 之前）并给出修复建议。

---

## 2. 历史动机与发展脉络

### 2.1 ASP.NET（2002）：HttpModule 与 HttpHandler 时代

.NET Framework 1.0 引入 ASP.NET，基于 IIS（Internet Information Services）的 ISAPI 扩展构建。请求处理通过 `HttpModule` 与 `HttpHandler` 实现：

```xml
<!-- web.config 注册 HttpModule -->
<system.webServer>
  <modules>
    <add name="AuthModule" type="MyApp.AuthModule, MyApp" />
  </modules>
  <handlers>
    <add name="MyHandler" path="*.myext" verb="*" type="MyApp.MyHandler, MyApp" />
  </handlers>
</system.webServer>
```

```csharp
// .NET Framework 1.0 风格的 HttpModule
public class AuthModule : IHttpModule
{
    public void Init(HttpApplication context)
    {
        context.BeginRequest += OnBeginRequest;
        context.EndRequest += OnEndRequest;
    }

    private void OnBeginRequest(object sender, EventArgs e)
    {
        var app = (HttpApplication)sender;
        var context = app.Context;
        // 鉴权逻辑
    }

    public void Dispose() { }
}
```

ASP.NET 经典管道的局限：

- **强耦合 IIS**：`HttpContext` 与 `System.Web` 紧密绑定，无法脱离 IIS 运行。
- **配置驱动**：模块注册依赖 `web.config` XML，缺乏代码优先（code-first）能力。
- **生命周期事件固定**：19 个固定事件（`BeginRequest`、`AuthenticateRequest`、`AuthorizeRequest` 等），无法灵活组合。
- **同步阻塞**：默认同步 IO， scalability 受限。

### 2.2 OWIN（2010）：解耦的起点

Open Web Interface for .NET（OWIN）规范提出将 Web 服务器与应用框架解耦：

```csharp
// OWIN 标准委托
using AppFunc = Func<IDictionary<string, object>, Task>;

public class OwinMiddleware
{
    private readonly AppFunc _next;
    public OwinMiddleware(AppFunc next) { _next = next; }

    public async Task Invoke(IDictionary<string, object> environment)
    {
        // 前置逻辑
        await _next(environment);
        // 后置逻辑
    }
}
```

OWIN 的贡献：

1. **标准化的 environment dictionary**：以字符串键访问请求/响应数据。
2. **`Func<IDictionary, Task>` 委托链**：函数式管道模型，奠定 ASP.NET Core 中间件设计基础。
3. **Katana 项目**：微软的 OWIN 实现，验证了脱 IIS 运行的可行性。

### 2.3 ASP.NET Core 1.0（2016）：全新重写

.NET Core 推出之际，ASP.NET 团队完全重写框架，引入 `IApplicationBuilder` 与 `RequestDelegate`：

```csharp
public class Startup
{
    public void Configure(IApplicationBuilder app)
    {
        app.Use(async (context, next) =>
        {
            // 前置逻辑
            await next();
            // 后置逻辑
        });

        app.Run(async context =>
        {
            await context.Response.WriteAsync("Hello World!");
        });
    }
}
```

ASP.NET Core 1.0 的关键设计：

- **`HttpContext` 抽象**：脱离 `System.Web`，完全托管在 `Microsoft.AspNetCore.Http` 命名空间。
- **`RequestDelegate` 委托**：`delegate Task RequestDelegate(HttpContext context)`，简洁的函数式签名。
- **`IApplicationBuilder` 接口**：构建器模式（Builder Pattern）组装中间件链。
- **跨平台 Kestrel**：基于 `libuv`（后改为 `Http.Primitives`）的高性能托管服务器。

### 2.4 ASP.NET Core 2.0（2017）：`WebHostBuilder` 与 `IStartupFilter`

引入 `IWebHostBuilder` 与 `IStartupFilter`，支持模块化注册启动逻辑：

```csharp
public class AutoRequestCultureStartupFilter : IStartupFilter
{
    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
    {
        return builder =>
        {
            builder.UseRequestLocalization("en-US");
            next(builder);
        };
    }
}

// 注册
services.AddTransient<IStartupFilter, AutoRequestCultureStartupFilter>();
```

### 2.5 ASP.NET Core 2.1（2018）：`IMiddleware` 与泛型主机

引入 `IMiddleware` 接口，支持 scoped 依赖注入到中间件：

```csharp
public class ScopedMiddleware : IMiddleware
{
    private readonly IMyScopedService _service;
    public ScopedMiddleware(IMyScopedService service) => _service = service;

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        await _service.DoWorkAsync();
        await next(context);
    }
}
```

ASP.NET Core 2.1 还引入 Generic Host（`IHostBuilder`），将 Web 主机与 Worker 主机统一为 `IHost`。

### 2.6 ASP.NET Core 3.0（2019）：Endpoint Routing

3.0 引入 Endpoint Routing，将路由匹配与端点执行解耦为两个阶段：

```csharp
app.UseRouting();           // 阶段 1：路由解析，确定 endpoint

// 其他中间件可通过 IEndpointFeature 访问选中的 endpoint
app.Use(async (context, next) =>
{
    var endpoint = context.GetEndpoint();
    if (endpoint?.Metadata.GetMetadata<AuthorizeAttribute>() is not null)
    {
        // 自定义鉴权逻辑
    }
    await next();
});

app.UseEndpoints(endpoints =>
{
    endpoints.MapControllers();
    endpoints.MapGet("/health", () => "OK");
});
```

Endpoint Routing 的核心改进：

1. **路由信息在管道中可访问**：鉴权、CORS 中间件可基于 endpoint 元数据决策。
2. **支持多种端点类型**：MVC Controller、Razor Pages、gRPC、SignalR、Health Checks 统一抽象。
3. **性能优化**：路由表预编译，匹配复杂度从 O(n) 降为 O(log n)。

### 2.7 ASP.NET Core 5.0（2020）：Web Host 弃用

5.0 弃用 `IWebHostBuilder`，全面采用 `IHostBuilder`：

```csharp
// .NET 5+ 推荐写法
var builder = Host.CreateDefaultBuilder(args)
    .ConfigureWebHostDefaults(webBuilder =>
    {
        webBuilder.UseStartup<Startup>();
    });
```

### 2.8 ASP.NET Core 6.0（2021）：Minimal API 与 Top-level Statements

6.0 引入 Minimal API，简化小型应用的启动代码：

```csharp
// Program.cs - top-level statements
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/hello", () => "Hello World!")
   .RequireAuthorization();

app.Run();
```

`WebApplication` 与 `WebApplicationBuilder` 封装了 `IHost` 与 `IApplicationBuilder`，显著降低样板代码。

### 2.9 ASP.NET Core 7.0（2022）：Output Cache 与 Rate Limiting

7.0 内置 Output Cache（取代 Response Caching Middleware）与 Rate Limiting：

```csharp
builder.Services.AddOutputCache(options =>
{
    options.AddPolicy("Expire20", b => b.Expire(TimeSpan.FromSeconds(20)));
});

builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("fixed", opt =>
    {
        opt.PermitLimit = 4;
        opt.Window = TimeSpan.FromSeconds(12);
    });
});

var app = builder.Build();
app.UseOutputCache();
app.UseRateLimiter();
```

### 2.10 ASP.NET Core 8.0（2023）：AOT 与 Keyed Services

8.0 引入 NativeAOT 支持（实验性），并支持 `Keyed DI` 在中间件中使用：

```csharp
// Keyed services 注册
builder.Services.AddKeyedTransient<ICache, RedisCache>("redis");
builder.Services.AddKeyedTransient<ICache, MemoryCache>("memory");

// 中间件中使用
public class CacheMiddleware(IMiddleware inner) : IMiddleware
{
    public async Task InvokeAsync(HttpContext ctx, RequestDelegate next)
    {
        // 通过 [FromKeyedServices] 注入指定实例
        await next(ctx);
    }
}
```

### 2.11 ASP.NET Core 9.0（2024）：性能与可观测性

9.0 引入：

- **`HttpRequest.BodyReader`/`HttpResponse.BodyWriter`**：基于 `PipeReader`/`PipeWriter` 的高性能流式 IO。
- **Built-in OpenTelemetry**：内置分布式追踪支持。
- **HybridCache**：新一代多级缓存抽象。
- **`Microsoft.AspNetCore.OpenApi`**：原生 OpenAPI 文档生成。

### 2.12 演进时间线

| 时间 | 版本 | 关键里程碑 |
|------|------|------------|
| 2002 | ASP.NET 1.0 | HttpModule/HttpHandler、IIS 绑定 |
| 2010 | OWIN | 解耦服务器与应用，Katana 项目 |
| 2016 | ASP.NET Core 1.0 | 全新重写，IApplicationBuilder、跨平台 |
| 2017 | ASP.NET Core 2.0 | IStartupFilter |
| 2018 | ASP.NET Core 2.1 | IMiddleware、Generic Host |
| 2019 | ASP.NET Core 3.0 | Endpoint Routing |
| 2020 | ASP.NET Core 5.0 | IWebHostBuilder 弃用 |
| 2021 | ASP.NET Core 6.0 LTS | Minimal API、WebApplication |
| 2022 | ASP.NET Core 7.0 | Output Cache、Rate Limiting |
| 2023 | ASP.NET Core 8.0 LTS | AOT、Keyed Services |
| 2024 | ASP.NET Core 9.0 | OpenTelemetry、HybridCache |

---

## 3. 形式化定义

### 3.1 中间件的形式化定义

中间件（Middleware）$M$ 是一个函数变换器，形式化地：

$$M : (\text{RequestDelegate} \to \text{RequestDelegate})$$

其中 `RequestDelegate` 定义为：

$$\text{RequestDelegate} = \text{HttpContext} \to \text{Task}$$

每个中间件接收"下一个委托"作为输入，返回一个新的委托。管道构造是中间件的逆序组合：

$$\text{Pipeline} = M_n \circ M_{n-1} \circ \cdots \circ M_2 \circ M_1 \circ M_{\text{terminal}}$$

其中 $M_{\text{terminal}}$ 是终端中间件（terminal middleware），不调用 `next`。

### 3.2 管道构造的代数结构

设 $\mathcal{M}$ 为所有中间件的集合，$\text{Compose}$ 为组合操作：

$$\text{Compose} : \mathcal{M} \times \mathcal{M} \to \mathcal{M}$$

$$\text{Compose}(M_2, M_1)(\text{next}) = M_1(M_2(\text{next}))$$

`IApplicationBuilder.Build()` 的实现等价于将中间件列表反向折叠（fold right）：

$$\text{Build}([M_1, M_2, \ldots, M_n]) = M_1(M_2(\cdots M_n(\text{terminal}) \cdots))$$

### 3.3 `HttpContext` 的形式化定义

`HttpContext` 是一个可变状态容器（mutable state container），形式化为七元组：

$$\text{HttpContext} = (\text{Request}, \text{Response}, \text{Features}, \text{User}, \text{Items}, \text{Connection}, \text{ServiceProvider})$$

其中：

- $\text{Request} \in \text{HttpRequest}$：请求对象（不可变属性，可变 body）。
- $\text{Response} \in \text{HttpResponse}$：响应对象。
- $\text{Features} \in \text{IFeatureCollection}$：特性集合（接口到实现的映射）。
- $\text{User} \in \text{ClaimsPrincipal}$：当前用户身份。
- $\text{Items} \in \text{IDictionary<object, object?>}$：请求作用域的键值存储。
- $\text{Connection} \in \text{ConnectionInfo}$：连接信息（IP、证书等）。
- $\text{ServiceProvider} \in \text{IServiceProvider}$：请求作用域的 DI 容器。

### 3.4 `IFeatureCollection` 的接口-实现映射

`HttpContext` 的不同实现（Kestrel、TestHost、IIS Express）通过 `IFeatureCollection` 提供具体功能：

```csharp
public interface IFeatureCollection : IEnumerable<KeyValuePair<Type, object>>
{
    object? this[Type key] { get; set; }
    TFeature? Get<TFeature>();
    void Set<TFeature>(TFeature? instance);
}
```

形式化地，`IFeatureCollection` 是接口到实现的偏函数：

$$\text{Features} : \text{Interface} \rightharpoonup \text{Implementation}$$

例如 Kestrel 提供 `IHttpRequestFeature`、`IHttpResponseFeature`、`IHttpConnectionFeature` 等实现，TestHost 可提供 mock 实现。

### 3.5 `IApplicationBuilder` 接口

```csharp
public interface IApplicationBuilder
{
    IServiceProvider ApplicationServices { get; }
    IFeatureCollection ServerFeatures { get; }
    IDictionary<string, object?> Properties { get; }

    IApplicationBuilder Use(Func<RequestDelegate, RequestDelegate> middleware);
    IApplicationBuilder New();
    RequestDelegate Build();
}
```

`Use` 方法接收一个变换函数 `Func<RequestDelegate, RequestDelegate>`，将"下一委托"映射为新委托。`Build` 将所有中间件组合为单一 `RequestDelegate`。

### 3.6 Endpoint Routing 的形式化模型

Endpoint Routing 将请求路由到端点（endpoint），形式化为：

$$\text{Route} : \text{HttpContext} \to \text{Endpoint?} \times \text{RouteValueDictionary}$$

端点 $E$ 定义为：

$$E = (\text{DisplayName}, \text{RequestDelegate}, \text{Metadata}, \text{RoutePattern})$$

路由匹配过程：

1. **`UseRouting`**：执行 `Route` 函数，将 `Endpoint` 存入 `HttpContext.Features.Get<IEndpointFeature>()`。
2. **中间件阶段**：其他中间件可读取 `HttpContext.GetEndpoint()` 获取路由信息。
3. **`UseEndpoints`**：调用 `Endpoint.RequestDelegate` 执行端点逻辑。

---

## 4. 理论推导与原理解析

### 4.1 管道构造的逆序算法

`IApplicationBuilder.Build()` 的核心实现（来自 `ApplicationBuilder.cs`）：

```csharp
public RequestDelegate Build()
{
    RequestDelegate app = context =>
    {
        // 默认终端：返回 404
        context.Response.StatusCode = 404;
        return Task.CompletedTask;
    };

    // 反向遍历中间件列表，逐层包装
    for (var c = _components.Count - 1; c >= 0; c--)
    {
        app = _components[c](app);
    }

    return app;
}
```

#### 4.1.1 为何逆序遍历？

考虑中间件列表 $[M_1, M_2, M_3]$，期望的执行顺序为 $M_1 \to M_2 \to M_3 \to \text{terminal}$。

若正向遍历：
```
app = terminal
app = M1(app)    // M1 包装 terminal
app = M2(app)    // M2 包装 M1 包装 terminal
app = M3(app)    // M3 包装 M2 包装 M1 包装 terminal
```

调用 `app(context)` 时执行顺序：$M_3 \to M_2 \to M_1 \to \text{terminal}$，**与注册顺序相反**。

若反向遍历：
```
app = terminal
app = M3(app)    // M3 包装 terminal
app = M2(app)    // M2 包装 M3 包装 terminal
app = M1(app)    // M1 包装 M2 包装 M3 包装 terminal
```

调用 `app(context)` 时执行顺序：$M_1 \to M_2 \to M_3 \to \text{terminal}$，**与注册顺序一致**。

#### 4.1.2 数学证明

设 `Build` 返回的委托为 $\text{Pipeline}$，注册中间件序列为 $[M_1, M_2, \ldots, M_n]$。

定义反向折叠：

$$\text{Pipeline} = M_1 \circ M_2 \circ \cdots \circ M_n \circ \text{Terminal}$$

其中 $\circ$ 表示函数组合：$(f \circ g)(x) = f(g(x))$。

调用 $\text{Pipeline}(ctx)$ 展开：

$$M_1(M_2(\cdots M_n(\text{Terminal}(ctx)) \cdots))$$

即 $M_1$ 最先执行，其 `next` 参数指向 $M_2 \circ \cdots \circ M_n \circ \text{Terminal}$。这正是期望的"洋葱模型"——外层中间件最先进入、最后离开。

### 4.2 洋葱模型的执行语义

洋葱模型（Onion Model）描述中间件的双阶段执行：

```csharp
app.Use(async (context, next) =>
{
    // 阶段 A：进入管道（请求方向）
    var sw = Stopwatch.StartNew();
    logger.LogInformation("Request start: {Path}", context.Request.Path);

    await next();  // 进入下一层

    // 阶段 B：离开管道（响应方向）
    sw.Stop();
    logger.LogInformation("Request end: {Status} in {Elapsed}ms",
        context.Response.StatusCode, sw.ElapsedMilliseconds);
});
```

形式化地，中间件 $M$ 的执行语义：

$$M.\text{Invoke}(ctx) = \text{Pre}(ctx) \oplus \text{await } M.\text{Next}(ctx) \oplus \text{Post}(ctx)$$

其中 $\oplus$ 表示顺序组合，`Pre`/`Post` 分别是前置/后置逻辑。

### 4.3 异步中间件的线程流动

ASP.NET Core 中间件默认异步，通过 `Task` 传递控制权。考虑：

```csharp
app.Use(async (context, next) =>
{
    await SomeAsyncWork();      // 在线程 A
    await next();                // 可能切换到线程 B
    await SomeOtherAsyncWork();  // 在线程 B 或 C
});
```

#### 4.3.1 `AsyncLocal<T>` 与 `ExecutionContext`

`HttpContext` 通过 `AsyncLocal<HttpContext>` 在异步流中传播：

```csharp
// 简化的 HttpContextAccessor 实现
public class HttpContextAccessor : IHttpContextAccessor
{
    private static readonly AsyncLocal<HttpContextHolder?> _httpContextCurrent = new();

    public HttpContext? HttpContext
    {
        get => _httpContextCurrent.Value?.Context;
        set
        {
            var holder = _httpContextCurrent.Value;
            if (holder != null)
            {
                holder.Context = null;  // 清除旧引用
            }
            if (value != null)
            {
                _httpContextCurrent.Value = new HttpContextHolder { Context = value };
            }
        }
    }

    private class HttpContextHolder
    {
        public HttpContext? Context;
    }
}
```

`AsyncLocal<T>` 基于 `ExecutionContext`，在 `await` 切换线程时自动复制上下文。

#### 4.3.2 同步中间件的线程池风险

若中间件使用同步阻塞调用（如 `.Result`、`.Wait()`），会占用线程池线程：

```csharp
// 反模式：同步阻塞异步方法
app.Use(context =>
{
    var result = httpClient.GetStringAsync(url).Result;  // 阻塞线程池线程
    return Task.CompletedTask;
});
```

在高并发场景下，线程池被耗尽导致"线程饥饿"（thread starvation），响应时间飙升。

形式化地，线程池可视为有限资源 $P$，同步阻塞将 $P$ 占用时间从 $O(1)$（异步切换）扩展到 $O(T_{\text{io}})$（IO 等待时间）。当并发请求数 $N$ 满足：

$$N \cdot T_{\text{io}} > |P| \cdot T_{\text{cpu}}$$

将出现线程饥饿。

### 4.4 `UseMiddleware<T>()` 的反射开销

`UseMiddleware<T>()` 通过反射解析中间件构造函数与 `Invoke`/`InvokeAsync` 方法：

```csharp
public static class UseMiddlewareExtensions
{
    public static IApplicationBuilder UseMiddleware<T>(this IApplicationBuilder app, params object[] args)
    {
        return app.UseMiddleware(typeof(T), args);
    }

    public static IApplicationBuilder UseMiddleware(this IApplicationBuilder app, Type middleware, params object[] args)
    {
        // 反射查找 InvokeAsync 方法
        var methodInfo = middleware.GetMethod("InvokeAsync", BindingFlags.Instance | BindingFlags.Public)
                      ?? middleware.GetMethod("Invoke", BindingFlags.Instance | BindingFlags.Public);

        // 编译为委托
        var factory = Compile(methodInfo);
        return app.Use(next => new MiddlewareInstance(middleware, next, factory).InvokeAsync);
    }
}
```

反射开销：

- **首次调用**：反射 + IL Emit 编译委托，约 1-5 ms。
- **后续调用**：直接调用编译后的委托，开销与直接方法调用相当。

但 NativeAOT 场景下 `Reflection.Emit` 不可用，需使用 `[DynamicallyAccessedMembers]` 标注或改用 Source Generator。

### 4.5 Endpoint Routing 的多阶段设计

Endpoint Routing 的三阶段流程：

```
1. UseRouting()
   ├── 在 routing 中间件中调用 RouteMatcher.Match(path, method)
   ├── 将匹配的 Endpoint 存入 HttpContext.Features
   └── 后续中间件可读取 endpoint 元数据

2. 中间件阶段（鉴权、CORS、限流等）
   ├── 读取 endpoint 元数据（[Authorize]、[EnableCors] 等）
   └── 基于元数据决策（是否需要鉴权）

3. UseEndpoints()
   ├── 调用 Endpoint.RequestDelegate 执行端点逻辑
   └── 端点可能是 MVC Controller、Razor Page、Minimal API delegate
```

为何拆分为 `UseRouting` 与 `UseEndpoints`？

1. **元数据驱动**：鉴权中间件需要知道"这个 endpoint 是否需要鉴权"，而 endpoint 信息只能在路由匹配后获得。
2. **统一抽象**：不同端点类型（MVC、gRPC、SignalR）共享同一套鉴权/CORS/限流机制。
3. **可扩展性**：第三方中间件可在 `UseRouting` 后插入，访问 endpoint 信息。

### 4.6 `HttpContext` 池化与 GC

`HttpContext` 实例池化以减少 GC 压力：

```csharp
// Kestrel 的 HttpContext 池化策略（简化）
internal class HttpProtocol : IHttpRequestFeature, IHttpResponseFeature
{
    private HttpContext? _context;
    public HttpContext HttpContext => _context ??= new HttpContext(this);

    public void Reset()
    {
        // 重置所有字段，复用实例
        _context?.Reset();
        // 返回池
    }
}
```

请求处理完成后，`HttpContext` 被重置并返回池，避免 `gen2` GC。但若中间件持有 `HttpContext` 引用（如后台任务），可能导致引用泄漏。

最佳实践：禁止在请求结束后捕获 `HttpContext`，使用 `IHttpContextAccessor` 的 `HttpContext` 属性在异步流中访问。

---

## 5. 代码示例

### 5.1 基础中间件：内联 vs. 类封装

#### 5.1.1 内联中间件（Inline Middleware）

```csharp
// C# 12 / .NET 8
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.Use(async (context, next) =>
{
    // 前置：记录请求开始
    var stopwatch = Stopwatch.StartNew();
    var requestId = Guid.NewGuid().ToString("N");
    context.Items["RequestId"] = requestId;
    context.Response.Headers["X-Request-Id"] = requestId;

    try
    {
        await next();  // 调用下一中间件
    }
    finally
    {
        // 后置：记录请求耗时
        stopwatch.Stop();
        app.Logger.LogInformation(
            "Request {Method} {Path} completed {StatusCode} in {Elapsed}ms",
            context.Request.Method,
            context.Request.Path,
            context.Response.StatusCode,
            stopwatch.ElapsedMilliseconds);
    }
});

app.MapGet("/", () => "Hello, Middleware!");

app.Run();
```

#### 5.1.2 基于约定的中间件（Convention-based Middleware）

```csharp
// C# 12 / .NET 8
/// <summary>
/// 基于约定的请求耗时中间件。
/// 约定：构造函数第一个参数为 RequestDelegate，后续参数由 DI 解析；
///      定义 InvokeAsync(HttpContext, RequestDelegate) 或 Invoke 方法。
/// </summary>
public sealed class RequestTimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestTimingMiddleware> _logger;

    public RequestTimingMiddleware(
        RequestDelegate next,
        ILogger<RequestTimingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    /// <summary>
    /// 中间件核心逻辑：记录请求耗时与状态码。
    /// 注：约定要求方法名为 InvokeAsync 或 Invoke，且第一个参数为 HttpContext。
    /// </summary>
    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();
            _logger.LogInformation(
                "{Method} {Path} -> {StatusCode} ({Elapsed}ms)",
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                stopwatch.ElapsedMilliseconds);
        }
    }
}

// 扩展方法封装注册
public static class RequestTimingMiddlewareExtensions
{
    public static IApplicationBuilder UseRequestTiming(this IApplicationBuilder app)
    {
        return app.UseMiddleware<RequestTimingMiddleware>();
    }
}

// 使用
app.UseRequestTiming();
```

#### 5.1.3 基于 `IMiddleware` 接口的中间件（支持 Scoped DI）

```csharp
// C# 12 / .NET 8
public sealed class TenantResolutionMiddleware : IMiddleware
{
    private readonly ITenantService _tenantService;
    private readonly ILogger<TenantResolutionMiddleware> _logger;

    public TenantResolutionMiddleware(
        ITenantService tenantService,
        ILogger<TenantResolutionMiddleware> logger)
    {
        _tenantService = tenantService;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        var tenantId = ExtractTenantId(context);
        var tenant = await _tenantService.GetTenantAsync(tenantId);

        if (tenant is null)
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            await context.Response.WriteAsync($"Tenant '{tenantId}' not found");
            return;
        }

        context.Items["Tenant"] = tenant;
        await next(context);
    }

    private static string ExtractTenantId(HttpContext context)
    {
        // 从子域名或 header 提取
        if (context.Request.Headers.TryGetValue("X-Tenant-Id", out var id))
            return id.ToString();

        var host = context.Request.Host.Host;
        var parts = host.Split('.');
        return parts.Length > 0 ? parts[0] : "default";
    }
}

// 注册 IMiddleware 需先在 DI 容器注册
builder.Services.AddTransient<TenantResolutionMiddleware>();

// 使用
app.UseMiddleware<TenantResolutionMiddleware>();
```

**约定式 vs. `IMiddleware` 接口式**的关键区别：

| 维度 | 约定式 | `IMiddleware` |
|------|--------|--------------|
| DI 生命周期 | Singleton（构造函数注入仅支持 Singleton） | 任意（按 DI 注册的生命周期解析） |
| 实例复用 | 单例，所有请求共享 | 每次请求新建（若注册为 Scoped/Transient） |
| 反射开销 | 仅启动时一次 | 每次请求解析（DI 容器开销） |
| 推荐场景 | 无状态中间件 | 需要 Scoped 服务的中间件 |

### 5.2 异常处理中间件（ProblemDetails 规范）

```csharp
// C# 12 / .NET 8 - 遵循 RFC 7807 ProblemDetails 规范
public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/problem+json";

        var (status, title, detail) = exception switch
        {
            ValidationException ve => (
                StatusCodes.Status400BadRequest,
                "Validation Failed",
                string.Join("; ", ve.Errors.Select(e => e.ErrorMessage))),

            NotFoundException => (
                StatusCodes.Status404NotFound,
                "Resource Not Found",
                exception.Message),

            UnauthorizedAccessException => (
                StatusCodes.Status401Unauthorized,
                "Unauthorized",
                "Authentication required"),

            ConflictException => (
                StatusCodes.Status409Conflict,
                "Conflict",
                exception.Message),

            _ => (
                StatusCodes.Status500InternalServerError,
                "Internal Server Error",
                _env.IsDevelopment() ? exception.ToString() : "An unexpected error occurred")
        };

        if (status >= 500)
        {
            _logger.LogError(exception, "Unhandled exception on {Method} {Path}",
                context.Request.Method, context.Request.Path);
        }
        else
        {
            _logger.LogWarning(exception, "Handled exception on {Method} {Path}",
                context.Request.Method, context.Request.Path);
        }

        context.Response.StatusCode = status;

        var problem = new ProblemDetails
        {
            Type = $"https://httpstatuses.io/{status}",
            Title = title,
            Status = status,
            Detail = detail,
            Instance = context.Request.Path
        };

        // 开发环境附加堆栈
        if (_env.IsDevelopment() && status >= 500)
        {
            problem.Extensions["stackTrace"] = exception.StackTrace;
        }

        problem.Extensions["traceId"] = Activity.Current?.Id ?? context.TraceIdentifier;

        await context.Response.WriteAsJsonAsync(problem);
    }
}

// 注册（必须在管道最前面）
app.UseMiddleware<ExceptionHandlingMiddleware>();
```

### 5.3 自定义响应缓存中间件

```csharp
// C# 12 / .NET 8 - 简化的内存缓存中间件
public sealed class ResponseCacheMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;
    private readonly ILogger<ResponseCacheMiddleware> _logger;

    public ResponseCacheMiddleware(
        RequestDelegate next,
        IMemoryCache cache,
        ILogger<ResponseCacheMiddleware> logger)
    {
        _next = next;
        _cache = cache;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // 仅缓存 GET 请求
        if (!HttpMethods.IsGet(context.Request.Method))
        {
            await _next(context);
            return;
        }

        var cacheKey = GenerateCacheKey(context.Request);

        if (_cache.TryGetValue(cacheKey, out CachedResponse? cached) && cached is not null)
        {
            _logger.LogDebug("Cache HIT: {Key}", cacheKey);
            await WriteCachedResponseAsync(context, cached);
            return;
        }

        // 捕获响应
        var originalBodyStream = context.Response.Body;
        await using var memoryStream = new MemoryStream();
        context.Response.Body = memoryStream;

        await _next(context);

        context.Response.Body = originalBodyStream;

        // 仅缓存成功响应
        if (context.Response.StatusCode == 200)
        {
            var responseToCache = new CachedResponse
            {
                Body = memoryStream.ToArray(),
                ContentType = context.Response.ContentType,
                StatusCode = context.Response.StatusCode
            };

            var cacheOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5),
                Size = responseToCache.Body.Length
            };

            _cache.Set(cacheKey, responseToCache, cacheOptions);
            _logger.LogDebug("Cache SET: {Key}", cacheKey);
        }

        // 写回原始流
        memoryStream.Seek(0, SeekOrigin.Begin);
        await memoryStream.CopyToAsync(originalBodyStream);
    }

    private static string GenerateCacheKey(HttpRequest request)
    {
        var keyBuilder = new StringBuilder();
        keyBuilder.Append(request.Path).Append('?');

        foreach (var (key, value) in request.Query.OrderBy(q => q.Key))
        {
            keyBuilder.Append(key).Append('=').Append(value).Append('&');
        }

        return keyBuilder.ToString();
    }

    private static async Task WriteCachedResponseAsync(HttpContext context, CachedResponse cached)
    {
        context.Response.ContentType = cached.ContentType;
        context.Response.StatusCode = cached.StatusCode;
        context.Response.Headers["X-Cache"] = "HIT";
        await context.Response.BodyWriter.WriteAsync(cached.Body);
    }

    private sealed class CachedResponse
    {
        public byte[] Body { get; init; } = Array.Empty<byte>();
        public string ContentType { get; init; } = "text/plain";
        public int StatusCode { get; init; } = 200;
    }
}
```

### 5.4 限流中间件（Token Bucket 算法）

```csharp
// C# 12 / .NET 8 - 基于 Token Bucket 的限流
public sealed class TokenBucketRateLimiterMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ConcurrentDictionary<string, TokenBucket> _buckets = new();
    private readonly RateLimiterOptions _options;

    public TokenBucketRateLimiterMiddleware(
        RequestDelegate next,
        IOptions<RateLimiterOptions> options)
    {
        _next = next;
        _options = options.Value;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var clientId = GetClientId(context);
        var bucket = _buckets.GetOrAdd(clientId, _ => new TokenBucket(
            capacity: _options.Capacity,
            refillRate: _options.RefillRatePerSecond));

        if (!bucket.TryConsume())
        {
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.Headers["Retry-After"] = bucket.SecondsUntilRefill.ToString();
            context.Response.Headers["X-RateLimit-Limit"] = _options.Capacity.ToString();
            context.Response.Headers["X-RateLimit-Remaining"] = bucket.AvailableTokens.ToString();

            await context.Response.WriteAsJsonAsync(new
            {
                error = "Rate limit exceeded",
                message = $"Try again in {bucket.SecondsUntilRefill} seconds"
            });
            return;
        }

        context.Response.Headers["X-RateLimit-Limit"] = _options.Capacity.ToString();
        context.Response.Headers["X-RateLimit-Remaining"] = bucket.AvailableTokens.ToString();

        await _next(context);
    }

    private static string GetClientId(HttpContext context)
    {
        // 优先使用认证用户 ID，其次 IP
        return context.User?.Identity?.Name
            ?? context.Connection.RemoteIpAddress?.ToString()
            ?? "anonymous";
    }

    private sealed class TokenBucket
    {
        private readonly int _capacity;
        private readonly double _refillRatePerSecond;
        private double _tokens;
        private DateTime _lastRefill;
        private readonly object _lock = new();

        public TokenBucket(int capacity, double refillRatePerSecond)
        {
            _capacity = capacity;
            _refillRatePerSecond = refillRatePerSecond;
            _tokens = capacity;
            _lastRefill = DateTime.UtcNow;
        }

        public int AvailableTokens => (int)Math.Floor(_tokens);

        public int SecondsUntilRefill
        {
            get
            {
                var needed = 1 - _tokens;
                return (int)Math.Ceiling(needed / _refillRatePerSecond);
            }
        }

        public bool TryConsume()
        {
            lock (_lock)
            {
                Refill();
                if (_tokens >= 1)
                {
                    _tokens -= 1;
                    return true;
                }
                return false;
            }
        }

        private void Refill()
        {
            var now = DateTime.UtcNow;
            var elapsed = (now - _lastRefill).TotalSeconds;
            _tokens = Math.Min(_capacity, _tokens + elapsed * _refillRatePerSecond);
            _lastRefill = now;
        }
    }
}

public sealed class RateLimiterOptions
{
    public int Capacity { get; set; } = 10;
    public double RefillRatePerSecond { get; set; } = 1.0;
}
```

### 5.5 请求日志中间件（结构化日志）

```csharp
// C# 12 / .NET 8 - 使用 Serilog 风格的结构化日志
public sealed class StructuredLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<StructuredLoggingMiddleware> _logger;
    private readonly bool _logRequestBody;
    private readonly bool _logResponseBody;

    public StructuredLoggingMiddleware(
        RequestDelegate next,
        ILogger<StructuredLoggingMiddleware> logger,
        IConfiguration config)
    {
        _next = next;
        _logger = logger;
        _logRequestBody = config.GetValue("Logging:RequestBody", false);
        _logResponseBody = config.GetValue("Logging:ResponseBody", false);
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = GetOrGenerateCorrelationId(context);
        var startTime = Stopwatch.GetTimestamp();

        // 将 correlationId 注入日志上下文
        using (_logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId,
            ["RequestMethod"] = context.Request.Method,
            ["RequestPath"] = context.Request.Path,
            ["UserAgent"] = context.Request.Headers.UserAgent.ToString(),
            ["RemoteIp"] = context.Connection.RemoteIpAddress?.ToString() ?? "unknown"
        }))
        {
            _logger.LogInformation("Request started");

            // 可选：捕获请求体
            string? requestBody = null;
            if (_logRequestBody && context.Request.ContentLength > 0)
            {
                context.Request.EnableBuffering();
                requestBody = await ReadStreamAsync(context.Request.Body);
                context.Request.Body.Position = 0;
            }

            // 捕获响应体
            Stream? originalBodyStream = null;
            MemoryStream? responseBodyStream = null;
            if (_logResponseBody)
            {
                originalBodyStream = context.Response.Body;
                responseBodyStream = new MemoryStream();
                context.Response.Body = responseBodyStream;
            }

            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Request failed");
                throw;
            }
            finally
            {
                var elapsed = Stopwatch.GetElapsedTime(startTime);

                if (_logResponseBody && responseBodyStream is not null && originalBodyStream is not null)
                {
                    responseBodyStream.Seek(0, SeekOrigin.Begin);
                    var responseBody = await ReadStreamAsync(responseBodyStream);
                    responseBodyStream.Seek(0, SeekOrigin.Begin);
                    await responseBodyStream.CopyToAsync(originalBodyStream);

                    _logger.LogInformation(
                        "Request completed {StatusCode} in {Elapsed}ms. Response: {ResponseBody}",
                        context.Response.StatusCode,
                        elapsed.TotalMilliseconds,
                        responseBody);
                }
                else
                {
                    _logger.LogInformation(
                        "Request completed {StatusCode} in {Elapsed}ms",
                        context.Response.StatusCode,
                        elapsed.TotalMilliseconds);
                }

                if (requestBody is not null)
                {
                    _logger.LogDebug("Request body: {RequestBody}", requestBody);
                }
            }
        }
    }

    private static string GetOrGenerateCorrelationId(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue("X-Correlation-Id", out var id))
            return id.ToString();

        var newId = Guid.NewGuid().ToString("N");
        context.Request.Headers["X-Correlation-Id"] = newId;
        context.Response.Headers["X-Correlation-Id"] = newId;
        return newId;
    }

    private static async Task<string> ReadStreamAsync(Stream stream)
    {
        using var reader = new StreamReader(stream, leaveOpen: true);
        return await reader.ReadToEndAsync();
    }
}
```

### 5.6 CORS 中间件自定义策略

```csharp
// C# 12 / .NET 8 - 动态 CORS 策略
public sealed class DynamicCorsMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ICorsService _corsService;
    private readonly ICorsPolicyProvider _policyProvider;
    private readonly ILogger<DynamicCorsMiddleware> _logger;

    public DynamicCorsMiddleware(
        RequestDelegate next,
        ICorsService corsService,
        ICorsPolicyProvider policyProvider,
        ILogger<DynamicCorsMiddleware> logger)
    {
        _next = next;
        _corsService = corsService;
        _policyProvider = policyProvider;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue("Origin", out var origin))
        {
            var originStr = origin.ToString();

            // 根据域名动态选择策略
            var policyName = DeterminePolicy(originStr);
            var policy = await _policyProvider.GetPolicyAsync(context, policyName);

            if (policy is not null)
            {
                var corsResult = _corsService.EvaluatePolicy(context, policy);
                _corsService.ApplyResult(corsResult, context.Response);

                // 处理预检请求
                if (context.Request.Method == "OPTIONS")
                {
                    context.Response.StatusCode = StatusCodes.Status204NoContent;
                    return;
                }
            }
        }

        await _next(context);
    }

    private static string DeterminePolicy(string origin)
    {
        var uri = new Uri(origin);
        return uri.Host switch
        {
            "app.example.com" => "ProductionPolicy",
            "staging.example.com" => "StagingPolicy",
            "localhost" => "DevelopmentPolicy",
            _ => "DefaultPolicy"
        };
    }
}
```

### 5.7 背压中间件（基于 `System.Threading.Channels`）

```csharp
// C# 12 / .NET 8 - 请求队列与背压
public sealed class BackpressureMiddleware
{
    private readonly RequestDelegate _next;
    private readonly Channel<HttpContext> _channel;
    private readonly ILogger<BackpressureMiddleware> _logger;
    private readonly int _maxConcurrentRequests;
    private int _currentConcurrent;

    public BackpressureMiddleware(
        RequestDelegate next,
        IOptions<BackpressureOptions> options,
        ILogger<BackpressureMiddleware> logger)
    {
        _next = next;
        _logger = logger;
        _maxConcurrentRequests = options.Value.MaxConcurrentRequests;

        _channel = Channel.CreateBounded<HttpContext>(
            new BoundedChannelOptions(options.Value.QueueCapacity)
            {
                FullMode = BoundedChannelFullMode.DropOldest,
                SingleReader = false,
                SingleWriter = false
            });

        // 启动后台消费者
        for (int i = 0; i < options.Value.WorkerCount; i++)
        {
            _ = Task.Run(ConsumeAsync);
        }
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (Interlocked.Increment(ref _currentConcurrent) <= _maxConcurrentRequests)
        {
            try
            {
                await _next(context);
            }
            finally
            {
                Interlocked.Decrement(ref _currentConcurrent);
            }
            return;
        }

        // 超过并发上限，尝试入队
        Interlocked.Decrement(ref _currentConcurrent);

        if (_channel.Writer.TryWrite(context))
        {
            // 等待处理完成
            var tcs = new TaskCompletionSource();
            context.Items["BackpressureTcs"] = tcs;
            await tcs.Task;
        }
        else
        {
            // 队列满，返回 503
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            context.Response.Headers["Retry-After"] = "30";
            await context.Response.WriteAsync("Server busy, please retry later");
        }
    }

    private async Task ConsumeAsync()
    {
        await foreach (var context in _channel.Reader.ReadAllAsync())
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background processing failed");
            }
            finally
            {
                if (context.Items["BackpressureTcs"] is TaskCompletionSource tcs)
                {
                    tcs.TrySetResult();
                }
            }
        }
    }
}

public sealed class BackpressureOptions
{
    public int MaxConcurrentRequests { get; set; } = 100;
    public int QueueCapacity { get; set; } = 1000;
    public int WorkerCount { get; set; } = 4;
}
```

### 5.8 多租户中间件（基于 Host 头）

```csharp
// C# 12 / .NET 8 - 多租户解析与上下文注入
public sealed class MultiTenantMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ITenantStore _tenantStore;
    private readonly ITenantContextAccessor _tenantContextAccessor;

    public MultiTenantMiddleware(
        RequestDelegate next,
        ITenantStore tenantStore,
        ITenantContextAccessor tenantContextAccessor)
    {
        _next = next;
        _tenantStore = tenantStore;
        _tenantContextAccessor = tenantContextAccessor;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var tenant = await ResolveTenantAsync(context);

        if (tenant is null)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "InvalidTenant",
                message = "Unable to determine tenant from request"
            });
            return;
        }

        // 设置租户上下文
        using (_tenantContextAccessor.SetTenant(tenant))
        {
            context.Items["Tenant"] = tenant;
            context.Response.Headers["X-Tenant"] = tenant.Id;

            await _next(context);
        }
    }

    private async Task<Tenant?> ResolveTenantAsync(HttpContext context)
    {
        // 策略 1：子域名
        var host = context.Request.Host.Host;
        var subdomain = host.Split('.')[0];
        if (!string.IsNullOrEmpty(subdomain) && subdomain != "www")
        {
            var tenant = await _tenantStore.FindBySubdomainAsync(subdomain);
            if (tenant is not null) return tenant;
        }

        // 策略 2：Header
        if (context.Request.Headers.TryGetValue("X-Tenant-Id", out var headerTenantId))
        {
            return await _tenantStore.FindByIdAsync(headerTenantId.ToString());
        }

        // 策略 3：路径前缀
        var pathSegments = context.Request.Path.Value?.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (pathSegments is { Length: > 0 })
        {
            var tenant = await _tenantStore.FindByPathPrefixAsync(pathSegments[0]);
            if (tenant is not null)
            {
                // 重写路径，移除租户前缀
                context.Request.Path = "/" + string.Join('/', pathSegments.Skip(1));
                return tenant;
            }
        }

        // 策略 4：认证用户的租户绑定
        var userTenantId = context.User?.FindFirst("tenant_id")?.Value;
        if (!string.IsNullOrEmpty(userTenantId))
        {
            return await _tenantStore.FindByIdAsync(userTenantId);
        }

        return null;
    }
}

public sealed class Tenant
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string ConnectionString { get; init; } = string.Empty;
    public Dictionary<string, string> Settings { get; init; } = new();
}
```

---

## 6. 对比分析

### 6.1 ASP.NET Core 中间件 vs. Express.js 中间件

| 维度 | ASP.NET Core | Express.js |
|------|--------------|------------|
| 核心签名 | `Func<HttpContext, RequestDelegate, Task>` | `(req, res, next) => void` |
| 异步模型 | `Task` + `async/await` | 回调 / Promise |
| 管道构造 | `IApplicationBuilder.Build()` 反向折叠 | `app.stack` 数组正向执行 |
| 路由集成 | Endpoint Routing（`UseRouting`/`UseEndpoints`） | `express.Router()` |
| 依赖注入 | 原生 DI 容器 | 需第三方（如 `inversify`） |
| 错误处理 | `UseExceptionHandler` 中间件 | `(err, req, res, next) => {}` |
| 性能 | Kestrel + NativeAOT，~7M RPS | Node.js V8，~100K RPS |
| 类型安全 | C# 强类型 `HttpContext` | JavaScript 弱类型 |

Express.js 风格：

```javascript
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
});
```

ASP.NET Core 等价：

```csharp
app.Use(async (context, next) =>
{
    var start = Stopwatch.GetTimestamp();
    try
    {
        await next();
    }
    finally
    {
        var elapsed = Stopwatch.GetElapsedTime(start);
        logger.LogInformation("{Method} {Path} {StatusCode} {Elapsed}ms",
            context.Request.Method, context.Request.Path,
            context.Response.StatusCode, elapsed.TotalMilliseconds);
    }
});
```

### 6.2 ASP.NET Core 中间件 vs. Spring Boot Filter

| 维度 | ASP.NET Core Middleware | Spring Boot Filter |
|------|------------------------|-------------------|
| 抽象层次 | 框架核心，处理所有请求 | Servlet 容器层，位于 DispatcherServlet 之前 |
| 调用模型 | 责任链，显式 `await next()` | 责任链，`chain.doFilter(req, res)` |
| 路由感知 | Endpoint Routing 提供路由元数据 | 不感知 Spring MVC 路由 |
| 依赖注入 | 原生支持（`IMiddleware` 模式） | `@Autowired` 注入 |
| 异步支持 | 原生 `Task` | `AsyncContext` 或 Servlet 3.1 |
| 执行顺序 | 注册顺序 | `@Order` 注解或 `FilterRegistrationBean` |

Spring Boot Filter 示例：

```java
@Component
@Order(1)
public class LoggingFilter implements Filter {

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        var httpReq = (HttpServletRequest) req;
        var start = System.nanoTime();
        try {
            chain.doFilter(req, res);
        } finally {
            var elapsed = (System.nanoTime() - start) / 1_000_000;
            System.out.printf("%s %s -> %d (%dms)%n",
                httpReq.getMethod(), httpReq.getRequestURI(),
                ((HttpServletResponse) res).getStatus(), elapsed);
        }
    }
}
```

### 6.3 ASP.NET Core 中间件 vs. Django Middleware

| 维度 | ASP.NET Core | Django |
|------|--------------|--------|
| 调用模型 | 单一 `InvokeAsync` + `next` | 多钩子：`process_request`/`process_view`/`process_response`/`process_exception` |
| 异步支持 | 原生 `async/await` | Django 3.1+ `async def __call__` |
| 配置 | 代码注册 `app.UseXxx()` | `MIDDLEWARE = [...]` 列表 |
| 顺序语义 | 注册顺序 = 执行顺序 | 列表顺序，request 正向，response 反向 |
| 类型安全 | C# 强类型 | Python 鸭子类型 |

Django Middleware 示例：

```python
class TimingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.time()
        response = self.get_response(request)
        elapsed = (time.time() - start) * 1000
        response['X-Elapsed-Ms'] = str(int(elapsed))
        return response
```

### 6.4 中间件 vs. Filter（MVC Filter）

ASP.NET Core 内部有两套"横切机制"：中间件与 MVC Filter。

| 维度 | Middleware | MVC Filter |
|------|-----------|-----------|
| 作用范围 | 所有请求 | 仅路由到 MVC/Razor Pages 的请求 |
| 执行位置 | 管道早期，Endpoint Routing 之前/之后 | Endpoint 内部，Controller Action 前后 |
| 类型 | `IApplicationBuilder.Use` | `IActionFilter`、`IExceptionFilter`、`IResultFilter`、`IAuthorizationFilter` |
| 路由感知 | 可通过 `context.GetEndpoint()` 获取 | 天然感知（Filter 位于 Action 上下文） |
| 推荐场景 | 通用横切（日志、限流、CORS、鉴权） | MVC 专属（模型验证、Action 日志、ViewBag） |

### 6.5 `IMiddleware` vs. 约定式中间件性能对比

BenchmarkDotNet 基准测试（.NET 8，10万次调用）：

| 方法 | Mean | Error | Gen0 | Allocated |
|------|-----|------|------|-----------|
| 直接调用 | 12.3 ns | 0.2 ns | - | - |
| 约定式中间件 | 18.7 ns | 0.3 ns | - | - |
| `IMiddleware` 接口式 | 45.2 ns | 0.8 ns | 0.0095 | 80 B |

`IMiddleware` 每次请求需通过 DI 容器解析中间件实例，导致额外分配。对于高性能场景，优先使用约定式中间件。

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱 1：错误的中间件顺序

**反模式**：鉴权在路由之前，无法获取 endpoint 元数据。

```csharp
// 错误顺序
app.UseAuthentication();   // 此时还不知道要访问哪个 endpoint
app.UseRouting();           // 路由解析
app.UseAuthorization();    // 但鉴权已过
app.MapControllers();
```

**正确顺序**：

```csharp
// 推荐顺序（.NET 6+）
app.UseExceptionHandler();    // 1. 异常处理（最外层）
app.UseHsts();                // 2. HSTS
app.UseHttpsRedirection();    // 3. HTTPS 重定向
app.UseStaticFiles();         // 4. 静态文件
app.UseRouting();             // 5. 路由解析
app.UseCors();                // 6. CORS（路由后，鉴权前）
app.UseAuthentication();      // 7. 身份认证
app.UseAuthorization();       // 8. 授权（基于 endpoint 元数据）
app.UseRateLimiter();         // 9. 限流
app.MapControllers();         // 10. 端点映射
```

### 7.2 陷阱 2：未调用 `next()` 或调用多次

```csharp
// 反模式 1：未调用 next（短路但未明确说明）
app.Use(async (context, next) =>
{
    if (context.Request.Path == "/health")
    {
        await context.Response.WriteAsync("OK");
        // 缺少 return，继续执行 next()
    }
    await next();  // 即便已写入响应，仍调用 next
});

// 正确做法：明确短路
app.Use(async (context, next) =>
{
    if (context.Request.Path == "/health")
    {
        await context.Response.WriteAsync("OK");
        return;  // 短路，不调用 next
    }
    await next();
});

// 反模式 2：调用 next 两次
app.Use(async (context, next) =>
{
    await next();
    await next();  // 异常：响应已开始，无法再调用
});
```

### 7.3 陷阱 3：响应已开始后修改响应

```csharp
// 反模式：响应已开始后修改 header
app.Use(async (context, next) =>
{
    await next();

    // 此时响应可能已 flush 到客户端
    context.Response.Headers.Add("X-Custom", "value");  // 抛 InvalidOperationException
});

// 正确做法：在 next 之前设置 header
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Custom"] = "value";
    await next();
});

// 或检查响应是否已开始
app.Use(async (context, next) =>
{
    await next();
    if (!context.Response.HasStarted)
    {
        context.Response.Headers["X-Custom"] = "value";
    }
});
```

### 7.4 陷阱 4：捕获 `HttpContext` 到后台任务

```csharp
// 反模式：在后台任务中使用 HttpContext
app.Use(async (context, next) =>
{
    _ = Task.Run(async () =>
    {
        await Task.Delay(1000);
        // 危险：context 可能已被重置/复用
        await context.Response.WriteAsync("Delayed");  // 可能抛 ObjectDisposedException
    });

    await next();
});

// 正确做法：捕获所需数据，使用 IHostedService 或 Channel
app.Use(async (context, next) =>
{
    var path = context.Request.Path;
    var sessionId = context.Session.Id;

    _ = Task.Run(async () =>
    {
        await Task.Delay(1000);
        logger.LogInformation("Delayed log for {Path}, session {Session}", path, sessionId);
    });

    await next();
});
```

### 7.5 陷阱 5：同步阻塞导致线程池饥饿

```csharp
// 反模式：在异步中间件中使用 .Result
app.Use(async (context, next) =>
{
    // 危险：阻塞线程池线程
    var cache = _cacheService.GetAsync(key).Result;
    await next();
});

// 正确做法：全程异步
app.Use(async (context, next) =>
{
    var cache = await _cacheService.GetAsync(key);
    await next();
});
```

### 7.6 陷阱 6：未正确配置 `IHttpContextAccessor`

```csharp
// 反模式：未注册 IHttpContextAccessor，导致 HttpContext.Current 为 null
// 缺失：builder.Services.AddHttpContextAccessor();

public class MyService
{
    private readonly IHttpContextAccessor _accessor;

    public MyService(IHttpContextAccessor accessor) => _accessor = accessor;

    public string GetTenantId()
    {
        // 若未注册 AddHttpContextAccessor，_accessor.HttpContext 为 null
        return _accessor.HttpContext?.User?.FindFirst("tenant_id")?.Value
            ?? throw new InvalidOperationException("No HttpContext");
    }
}

// 正确做法：在启动时注册
builder.Services.AddHttpContextAccessor();
```

### 7.7 陷阱 7：`UseMiddleware<T>()` 与 Scoped 服务

```csharp
// 反模式：约定式中间件注入 Scoped 服务
public class BadMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IScopedService _service;  // 错误：约定式中间件是 Singleton

    public BadMiddleware(RequestDelegate next, IScopedService service)
    {
        _next = next;
        _service = service;  // 捕获的是 Singleton 实例，导致状态污染
    }
}

// 正确做法 1：使用 IMiddleware 接口
public class GoodMiddleware : IMiddleware
{
    private readonly IScopedService _service;

    public GoodMiddleware(IScopedService service) => _service = service;

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        await _service.DoWorkAsync();
        await next(context);
    }
}
builder.Services.AddScoped<GoodMiddleware>();

// 正确做法 2：约定式中间件从 HttpContext 解析
public class GoodMiddleware2
{
    private readonly RequestDelegate _next;

    public GoodMiddleware2(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, IScopedService service)
    {
        await service.DoWorkAsync();
        await _next(context);
    }
}
```

### 7.8 陷阱 8：异常处理中间件位置错误

```csharp
// 反模式：异常处理在路由之后，无法捕获 Controller 异常
app.UseRouting();
app.UseExceptionHandler();  // 错误：部分异常已无法捕获
app.MapControllers();

// 正确做法：异常处理在管道最外层
app.UseExceptionHandler();  // 或 UseDeveloperExceptionPage
app.UseRouting();
app.MapControllers();
```

### 7.9 最佳实践总结

1. **异步优先**：所有中间件使用 `async/await`，避免同步阻塞。
2. **顺序敏感**：遵循官方推荐顺序，异常处理在最外层。
3. **明确短路**：不调用 `next` 时使用 `return`，避免歧义。
4. **类封装**：复杂中间件用类封装，提供扩展方法注册。
5. **避免捕获 HttpContext**：后台任务捕获所需数据，不捕获 `HttpContext` 本身。
6. **使用 `IHttpContextAccessor`**：跨层访问 `HttpContext` 时通过访问器，不直接传递。
7. **结构化日志**：使用 `BeginScope` 添加上下文信息，便于追踪。
8. **健康检查分离**：健康检查端点应跳过鉴权/限流，避免依赖外部服务。

---

## 8. 工程实践

### 8.1 中间件项目结构

```
MyApp.Middleware/
├── Extensions/
│   ├── ExceptionHandlingMiddlewareExtensions.cs
│   ├── RequestLoggingMiddlewareExtensions.cs
│   └── TenantMiddlewareExtensions.cs
├── Middlewares/
│   ├── ExceptionHandlingMiddleware.cs
│   ├── RequestLoggingMiddleware.cs
│   ├── TenantResolutionMiddleware.cs
│   └── ResponseCachingMiddleware.cs
├── Options/
│   ├── ExceptionHandlingOptions.cs
│   ├── RequestLoggingOptions.cs
│   └── TenantOptions.cs
├── Services/
│   ├── ITenantStore.cs
│   ├── InMemoryTenantStore.cs
│   └── RedisTenantStore.cs
└── MyApp.Middleware.csproj
```

### 8.2 中间件单元测试

```csharp
// C# 12 / xUnit 2.6 / .NET 8
public class RequestTimingMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_ShouldCallNext_AndMeasureTime()
    {
        // Arrange
        var logger = NullLogger<RequestTimingMiddleware>.Instance;
        var nextCalled = false;
        RequestDelegate next = _ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        };

        var middleware = new RequestTimingMiddleware(next, logger);
        var context = new DefaultHttpContext();

        // Act
        await middleware.InvokeAsync(context);

        // Assert
        Assert.True(nextCalled);
    }

    [Fact]
    public async Task InvokeAsync_WhenNextThrows_ShouldPropagateException()
    {
        // Arrange
        var logger = NullLogger<RequestTimingMiddleware>.Instance;
        RequestDelegate next = _ => throw new InvalidOperationException("Test");

        var middleware = new RequestTimingMiddleware(next, logger);
        var context = new DefaultHttpContext();

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => middleware.InvokeAsync(context));
    }
}

// 使用 WebApplicationFactory 进行集成测试
public class PipelineIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public PipelineIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_Health_ShouldReturn200_WithRequestIdHeader()
    {
        // Act
        var response = await _client.GetAsync("/health");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.Contains("X-Request-Id"));
    }

    [Fact]
    public async Task Get_UnknownPath_ShouldReturn404_WithProblemDetails()
    {
        // Act
        var response = await _client.GetAsync("/nonexistent");
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Contains("application/problem+json",
            response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("Resource Not Found", content);
    }
}
```

### 8.3 中间件配置与选项模式

```csharp
// C# 12 / .NET 8 - 强类型选项
public sealed class TenantMiddlewareOptions
{
    public const string SectionName = "TenantMiddleware";

    public bool Enabled { get; init; } = true;
    public string DefaultTenant { get; init; } = "default";
    public TenantResolutionStrategy Strategy { get; init; } = TenantResolutionStrategy.Subdomain;
    public bool RequireTenant { get; init; } = true;
    public List<string> AllowedTenants { get; init; } = new();
}

public enum TenantResolutionStrategy
{
    Subdomain,
    Header,
    PathPrefix,
    Claim
}

public static class TenantMiddlewareExtensions
{
    public static IApplicationBuilder UseMultiTenant(
        this IApplicationBuilder app,
        Action<TenantMiddlewareOptions>? configure = null)
    {
        if (configure is not null)
        {
            var options = new TenantMiddlewareOptions();
            configure(options);

            if (!options.Enabled)
            {
                return app;  // 禁用时不注册
            }
        }

        return app.UseMiddleware<TenantResolutionMiddleware>();
    }
}

// 使用
builder.Services.Configure<TenantMiddlewareOptions>(
    builder.Configuration.GetSection(TenantMiddlewareOptions.SectionName));

app.UseMultiTenant(opt =>
{
    opt.Strategy = TenantResolutionStrategy.Header;
    opt.RequireTenant = true;
    opt.AllowedTenants.AddRange(new[] { "tenant1", "tenant2" });
});
```

### 8.4 中间件与 OpenTelemetry 集成

```csharp
// C# 12 / .NET 8 - OpenTelemetry 自定义跨度
public sealed class TracingMiddleware
{
    private readonly RequestDelegate _next;
    private static readonly ActivitySource ActivitySource = new("MyApp.Middleware");

    public TracingMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        // 创建根 span
        using var activity = ActivitySource.StartActivity(
            "ProcessRequest",
            ActivityKind.Server,
            context.Request.Headers.TryGetValue("traceparent", out var tp) ? tp.ToString() : null);

        if (activity is not null)
        {
            activity.SetTag("http.method", context.Request.Method);
            activity.SetTag("http.url", context.Request.GetDisplayUrl());
            activity.SetTag("http.scheme", context.Request.Scheme);
            activity.SetTag("http.host", context.Request.Host.Value);
            activity.SetTag("net.peer.ip", context.Connection.RemoteIpAddress?.ToString());

            // 注入 trace context 到响应
            context.Response.Headers["trace-id"] = activity.TraceId.ToString();
            context.Response.Headers["span-id"] = activity.SpanId.ToString();
        }

        try
        {
            await _next(context);

            if (activity is not null)
            {
                activity.SetTag("http.status_code", context.Response.StatusCode);
                if (context.Response.StatusCode >= 400)
                {
                    activity.SetStatus(ActivityStatusCode.Error);
                }
                else
                {
                    activity.SetStatus(ActivityStatusCode.Ok);
                }
            }
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.RecordException(ex);
            throw;
        }
    }
}

// 注册 OpenTelemetry
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing.AddAspNetCoreInstrumentation();
        tracing.AddHttpClientInstrumentation();
        tracing.AddSource("MyApp.Middleware");
        tracing.AddOtlpExporter();
    });
```

### 8.5 条件性中间件注册

```csharp
// C# 12 / .NET 8 - 基于环境的条件注册
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// 仅开发环境注册详细异常页
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

// 仅生产环境注册 HSTS
if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

// 配置驱动的开关
if (builder.Configuration.GetValue("Features:EnableRateLimiting", false))
{
    app.UseRateLimiter();
}

if (builder.Configuration.GetValue("Features:EnableResponseCaching", false))
{
    app.UseResponseCaching();
}

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
```

### 8.6 中间件性能分析

使用 `dotnet-counters` 监控 ASP.NET Core 运行时指标：

```bash
# 启动监控
dotnet-counters monitor -n MyApp --counters Microsoft.AspNetCore.Hosting

# 输出
System.Runtime
    CPU Usage (%)                                 : 45.2
    Working Set (MB)                              : 256
    GC Heap Size (MB)                             : 128
    Gen 0 GC / sec                                : 2.3
    Gen 1 GC / sec                                : 0.5
    Gen 2 GC / sec                                : 0.1

Microsoft.AspNetCore.Hosting
    requests-per-second                           : 1,245
    total-requests                                : 145,890
    current-requests                              : 23
    failed-requests                               : 12
```

使用 `dotnet-trace` 采集火焰图：

```bash
# 采集 30 秒跟踪
dotnet-trace collect -n MyApp --duration 00:00:30 --format speedscope

# 输出 speedscope 文件，可在 https://speedscope.app 打开
```

### 8.7 中间件版本化与兼容性

```csharp
// C# 12 / .NET 8 - API 版本化中间件
public sealed class ApiVersioningMiddleware
{
    private readonly RequestDelegate _next;

    public ApiVersioningMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var version = ExtractVersion(context);
        context.Items["ApiVersion"] = version;

        // 在响应头暴露版本
        context.Response.Headers["X-Api-Version"] = version.ToString();

        // 检查版本是否支持
        if (version.Major < 1)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "UnsupportedVersion",
                message = $"API version {version} is not supported. Minimum: 1.0"
            });
            return;
        }

        // 重写路径以包含版本
        // 例如：/api/users -> /api/v2/users
        var pathSegments = context.Request.Path.Value?.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (pathSegments is { Length: > 1 } && pathSegments[0] == "api")
        {
            var newPath = $"/api/v{version.Major}/{string.Join('/', pathSegments.Skip(1))}";
            context.Request.Path = newPath;
        }

        await _next(context);
    }

    private static Version ExtractVersion(HttpContext context)
    {
        // 优先级：URL > Header > Query
        // 1. URL: /v2/users
        var path = context.Request.Path.Value ?? "";
        var match = Regex.Match(path, @"/v(\d+(\.\d+)*)/");
        if (match.Success)
        {
            return new Version(match.Groups[1].Value);
        }

        // 2. Header: X-Api-Version: 2.0
        if (context.Request.Headers.TryGetValue("X-Api-Version", out var headerVersion))
        {
            return Version.TryParse(headerVersion, out var v) ? v : new Version(1, 0);
        }

        // 3. Query: ?api-version=2.0
        if (context.Request.Query.TryGetValue("api-version", out var queryVersion))
        {
            return Version.TryParse(queryVersion, out var v) ? v : new Version(1, 0);
        }

        return new Version(1, 0);  // 默认版本
    }
}
```

---

## 9. 案例研究

### 9.1 案例研究 1：电商系统的横切关注点分层

某电商平台使用 ASP.NET Core 8 构建微服务，需要在所有服务统一实现：

- 请求追踪（OpenTelemetry）
- 多租户隔离（基于子域名）
- 鉴权（JWT Bearer）
- 限流（按租户配额）
- 审计日志（写入 Kafka）

**解决方案**：将通用中间件打包为 NuGet 包，所有服务引用。

```csharp
// MyApp.Platform.Middleware 包
public static class PlatformMiddlewareExtensions
{
    public static IApplicationBuilder UsePlatformDefaults(this IApplicationBuilder app)
    {
        return app
            .UseExceptionHandler(new ExceptionHandlerOptions
            {
                ExceptionHandlingPath = "/error"
            })
            .UseTracing()                  // OpenTelemetry
            .UseMultiTenant()              // 租户解析
            .UseJwtAuthentication()        // JWT 鉴权
            .UseTenantRateLimiting()       // 租户限流
            .UseAuditLogging();            // 审计日志
    }
}

// 各微服务只需一行
var app = builder.Build();
app.UsePlatformDefaults();
app.UseRouting();
app.MapControllers();
app.Run();
```

**审计日志中间件**：

```csharp
public sealed class AuditLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IKafkaProducer _kafkaProducer;
    private readonly ILogger<AuditLoggingMiddleware> _logger;

    public AuditLoggingMiddleware(
        RequestDelegate next,
        IKafkaProducer kafkaProducer,
        ILogger<AuditLoggingMiddleware> logger)
    {
        _next = next;
        _kafkaProducer = kafkaProducer;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!ShouldAudit(context.Request))
        {
            await _next(context);
            return;
        }

        var auditEntry = new AuditEntry
        {
            Timestamp = DateTimeOffset.UtcNow,
            Method = context.Request.Method,
            Path = context.Request.Path,
            QueryString = context.Request.QueryString.Value,
            UserId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value,
            TenantId = context.Items["Tenant"]?.ToString(),
            IpAddress = context.Connection.RemoteIpAddress?.ToString(),
            UserAgent = context.Request.Headers.UserAgent.ToString(),
            CorrelationId = context.TraceIdentifier
        };

        var sw = Stopwatch.StartNew();
        try
        {
            await _next(context);
            auditEntry.StatusCode = context.Response.StatusCode;
            auditEntry.Success = context.Response.StatusCode < 400;
        }
        catch (Exception ex)
        {
            auditEntry.Success = false;
            auditEntry.Exception = ex.Message;
            throw;
        }
        finally
        {
            auditEntry.DurationMs = sw.ElapsedMilliseconds;

            // 异步发送到 Kafka，不阻塞响应
            _ = Task.Run(async () =>
            {
                try
                {
                    await _kafkaProducer.ProduceAsync("audit-log", auditEntry);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send audit log to Kafka");
                }
            });
        }
    }

    private static bool ShouldAudit(HttpRequest request)
    {
        // 仅审计写操作
        return request.Method is "POST" or "PUT" or "PATCH" or "DELETE";
    }
}
```

**效果**：12 个微服务统一审计格式，单日处理 5 亿次审计日志写入，Kafka 端到端延迟 < 50ms。

### 9.2 案例研究 2：API 网关的请求聚合

某 SaaS 平台使用 YARP（Yet Another Reverse Proxy）作为 API 网关，需要在路由前执行：

- 请求验证（schema 校验）
- 请求改写（添加内部 header）
- 缓存（热门端点）
- 熔断（基于 Polly）

```csharp
// C# 12 / .NET 8 - YARP + 自定义中间件
public sealed class GatewayRequestValidatorMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IJsonSchemaValidator _validator;
    private readonly Dictionary<string, string> _schemas;

    public GatewayRequestValidatorMiddleware(
        RequestDelegate next,
        IJsonSchemaValidator validator,
        IOptions<GatewayOptions> options)
    {
        _next = next;
        _validator = validator;
        _schemas = options.Value.Schemas;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var routeConfig = context.GetReverseProxyFeature()?.RouteConfig;
        if (routeConfig is null)
        {
            await _next(context);
            return;
        }

        var routeId = routeConfig.RouteId;
        if (!_schemas.TryGetValue(routeId, out var schema))
        {
            await _next(context);
            return;
        }

        context.Request.EnableBuffering();
        var body = await new StreamReader(context.Request.Body).ReadToEndAsync();
        context.Request.Body.Position = 0;

        var validationResult = _validator.Validate(body, schema);
        if (!validationResult.IsValid)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "ValidationFailed",
                details = validationResult.Errors
            });
            return;
        }

        await _next(context);
    }
}

// 熔断中间件
public sealed class CircuitBreakerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ConcurrentDictionary<string, CircuitState> _circuits = new();
    private readonly CircuitBreakerOptions _options;

    public CircuitBreakerMiddleware(
        RequestDelegate next,
        IOptions<CircuitBreakerOptions> options)
    {
        _next = next;
        _options = options.Value;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var downstream = ExtractDownstream(context);
        var circuit = _circuits.GetOrAdd(downstream, _ => new CircuitState(_options));

        if (circuit.State == CircuitState.Open)
        {
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            context.Response.Headers["Retry-After"] = "30";
            await context.Response.WriteAsync("Circuit breaker open");
            return;
        }

        try
        {
            await _next(context);
            if (context.Response.StatusCode < 500)
            {
                circuit.RecordSuccess();
            }
            else
            {
                circuit.RecordFailure();
            }
        }
        catch
        {
            circuit.RecordFailure();
            throw;
        }
    }

    private static string ExtractDownstream(HttpContext context)
    {
        var feature = context.GetReverseProxyFeature();
        return feature?.Cluster?.ClusterId ?? "default";
    }
}

// Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient();

var app = builder.Build();
app.UseMiddleware<GatewayRequestValidatorMiddleware>();
app.UseMiddleware<CircuitBreakerMiddleware>();
app.MapReverseProxy();
app.Run();
```

**效果**：网关单实例处理 8K RPS，平均延迟 < 5ms，熔断器在下游故障时保护系统稳定。

### 9.3 案例研究 3：实时通信的 SSE 流式响应

某股票行情推送系统使用 Server-Sent Events（SSE）向客户端推送实时股价，需要：

- 长连接管理
- 心跳保活
- 背压控制（避免慢消费者堆积）
- 优雅关闭

```csharp
// C# 12 / .NET 8 - SSE 流式中间件
public sealed class StockStreamMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IStockPriceService _stockService;
    private readonly ILogger<StockStreamMiddleware> _logger;
    private readonly CancellationTokenSource _shutdownToken = new();

    public StockStreamMiddleware(
        RequestDelegate next,
        IStockPriceService stockService,
        ILogger<StockStreamMiddleware> logger,
        IHostApplicationLifetime lifetime)
    {
        _next = next;
        _stockService = stockService;
        _logger = logger;
        lifetime.ApplicationStopping.Register(() => _shutdownToken.Cancel());
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Path.StartsWithSegments("/stream/stocks"))
        {
            await _next(context);
            return;
        }

        var symbol = context.Request.Path.Value?.Split('/').LastOrDefault();
        if (string.IsNullOrEmpty(symbol))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        // 设置 SSE headers
        context.Response.ContentType = "text/event-stream";
        context.Response.Headers["Cache-Control"] = "no-cache";
        context.Response.Headers["Connection"] = "keep-alive";
        context.Response.Headers["X-Accel-Buffering"] = "no";  // 禁用 Nginx 缓冲

        // 合并取消令牌
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(
            context.RequestAborted,
            _shutdownToken.Token);

        var channel = Channel.CreateBounded<StockPrice>(
            new BoundedChannelOptions(100)
            {
                FullMode = BoundedChannelFullMode.DropOldest,
                SingleReader = true,
                SingleWriter = true
            });

        // 后台任务订阅股价
        _ = Task.Run(async () =>
        {
            try
            {
                await foreach (var price in _stockService.SubscribeAsync(symbol, cts.Token))
                {
                    if (!channel.Writer.TryWrite(price))
                    {
                        _logger.LogWarning("Dropped price update for {Symbol}", symbol);
                    }
                }
            }
            catch (OperationCanceledException) { }
            finally
            {
                channel.Writer.TryComplete();
            }
        }, cts.Token);

        // 心跳定时器
        using var heartbeat = new Timer(_ =>
        {
            // 写入 SSE 心跳事件
        }, null, TimeSpan.FromSeconds(15), TimeSpan.FromSeconds(15));

        // 流式写入响应
        try
        {
            await foreach (var price in channel.Reader.ReadAllAsync(cts.Token))
            {
                var sseEvent = FormatSseEvent("price", new
                {
                    symbol = price.Symbol,
                    price = price.Value,
                    timestamp = price.Timestamp.ToString("O")
                });

                await context.Response.WriteAsync(sseEvent, cts.Token);
                await context.Response.BodyWriter.FlushAsync(cts.Token);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Client disconnected from {Symbol} stream", symbol);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error streaming {Symbol}", symbol);
        }
    }

    private static string FormatSseEvent(string eventType, object data)
    {
        var json = JsonSerializer.Serialize(data);
        return $"event: {eventType}\ndata: {json}\n\n";
    }
}
```

**效果**：单实例支持 2 万长连接，每秒推送 10 万条股价更新，内存占用 < 500MB。

### 9.4 案例研究 4：基于元数据的动态鉴权

某 SaaS 平台的权限模型为 RBAC + ABAC 混合模式，需要根据 endpoint 元数据动态决策：

```csharp
// C# 12 / .NET 8 - 基于 endpoint 元数据的动态鉴权
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public sealed class RequirePermissionAttribute : Attribute
{
    public string Permission { get; }
    public RequirePermissionAttribute(string permission) => Permission = permission;
}

public sealed class DynamicAuthorizationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IPermissionService _permissionService;
    private readonly ILogger<DynamicAuthorizationMiddleware> _logger;

    public DynamicAuthorizationMiddleware(
        RequestDelegate next,
        IPermissionService permissionService,
        ILogger<DynamicAuthorizationMiddleware> logger)
    {
        _next = next;
        _permissionService = permissionService;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var endpoint = context.GetEndpoint();
        if (endpoint is null)
        {
            await _next(context);
            return;
        }

        // 检查是否标记 [AllowAnonymous]
        if (endpoint.Metadata.GetMetadata<AllowAnonymousAttribute>() is not null)
        {
            await _next(context);
            return;
        }

        // 检查是否需要权限
        var permissionAttr = endpoint.Metadata.GetMetadata<RequirePermissionAttribute>();
        if (permissionAttr is null)
        {
            // 无权限要求，仅要求认证
            if (context.User?.Identity?.IsAuthenticated != true)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }
            await _next(context);
            return;
        }

        // 验证用户已认证
        if (context.User?.Identity?.IsAuthenticated != true)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Unauthorized" });
            return;
        }

        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var tenantId = context.Items["Tenant"]?.ToString();

        // 检查权限
        var hasPermission = await _permissionService.HasPermissionAsync(
            userId!,
            tenantId!,
            permissionAttr.Permission);

        if (!hasPermission)
        {
            _logger.LogWarning(
                "Permission denied: user {UserId} lacks {Permission} on {Path}",
                userId, permissionAttr.Permission, context.Request.Path);

            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "Forbidden",
                requiredPermission = permissionAttr.Permission
            });
            return;
        }

        await _next(context);
    }
}

// Controller 使用
[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    [HttpGet]
    [RequirePermission("products:read")]
    public IActionResult List() => Ok();

    [HttpPost]
    [RequirePermission("products:write")]
    public IActionResult Create() => Ok();

    [HttpDelete("{id}")]
    [RequirePermission("products:delete")]
    public IActionResult Delete(int id) => Ok();
}

// Program.cs
app.UseRouting();
app.UseAuthentication();
app.UseMiddleware<DynamicAuthorizationMiddleware>();  // 在路由后，端点前
app.MapControllers();
```

**效果**：单点鉴权逻辑覆盖 200+ endpoint，权限检查响应时间 < 5ms（Redis 缓存）。

### 9.5 案例研究 5：A/B 测试与灰度发布

某产品需要基于用户特征进行 A/B 测试，将请求路由到不同版本的后端：

```csharp
// C# 12 / .NET 8 - A/B 测试中间件
public sealed class AbTestingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IExperimentService _experimentService;
    private readonly IFeatureFlagService _featureFlagService;

    public AbTestingMiddleware(
        RequestDelegate next,
        IExperimentService experimentService,
        IFeatureFlagService featureFlagService)
    {
        _next = next;
        _experimentService = experimentService;
        _featureFlagService = featureFlagService;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var experimentId = context.Request.Headers["X-Experiment-Id"].ToString();

        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(experimentId))
        {
            await _next(context);
            return;
        }

        var variant = await _experimentService.AssignVariantAsync(experimentId, userId);
        context.Items["ExperimentVariant"] = variant;

        // 注入 variant 到请求头，传递给下游
        context.Request.Headers["X-Experiment-Variant"] = variant;

        // 根据 variant 改写路由
        if (variant == "v2")
        {
            // 重写到 v2 控制器
            var originalPath = context.Request.Path.Value ?? "";
            if (originalPath.StartsWith("/api/"))
            {
                context.Request.Path = originalPath.Replace("/api/", "/api/v2/");
                context.Items["RoutingOverride"] = "v2";
            }
        }

        // 记录曝光事件
        context.Response.OnStarting(() =>
        {
            _ = Task.Run(async () =>
            {
                await _experimentService.RecordExposureAsync(experimentId, userId, variant);
            });
            return Task.CompletedTask;
        });

        await _next(context);
    }
}

// 灰度发布中间件
public sealed class CanaryReleaseMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IFeatureFlagService _featureFlag;
    private static readonly Random _random = new();

    public CanaryReleaseMiddleware(RequestDelegate next, IFeatureFlagService featureFlag)
    {
        _next = next;
        _featureFlag = featureFlag;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var featureName = context.GetEndpoint()?.Metadata
            .GetMetadata<CanaryAttribute>()?.FeatureName;

        if (string.IsNullOrEmpty(featureName))
        {
            await _next(context);
            return;
        }

        var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var isEnabled = await _featureFlag.IsEnabledAsync(featureName, userId);

        if (!isEnabled)
        {
            // 灰度未命中，返回 404 或重定向到稳定版本
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        context.Response.Headers["X-Canary"] = "true";
        await _next(context);
    }
}

[AttributeUsage(AttributeTargets.Method)]
public sealed class CanaryAttribute : Attribute
{
    public string FeatureName { get; }
    public CanaryAttribute(string featureName) => FeatureName = featureName;
}

// 使用
[HttpGet("new-feature")]
[Canary("new-feature-2024")]
public IActionResult NewFeature() => Ok();
```

### 9.6 案例研究 6：GraphQL 中间件集成

某项目需要在 REST API 之外提供 GraphQL 端点，复用同一套鉴权/审计/限流中间件：

```csharp
// C# 12 / .NET 8 - GraphQL 集成
public sealed class GraphQlMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IGraphQLExecutor _executor;
    private readonly ILogger<GraphQlMiddleware> _logger;

    public GraphQlMiddleware(
        RequestDelegate next,
        IGraphQLExecutor executor,
        ILogger<GraphQlMiddleware> logger)
    {
        _next = next;
        _executor = executor;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Path.StartsWithSegments("/graphql"))
        {
            await _next(context);
            return;
        }

        // 仅支持 POST
        if (context.Request.Method != "POST")
        {
            context.Response.StatusCode = StatusCodes.Status405MethodNotAllowed;
            return;
        }

        // 读取查询
        GraphQLRequest request;
        try
        {
            request = await context.Request.ReadFromJsonAsync<GraphQLRequest>();
            if (request is null || string.IsNullOrEmpty(request.Query))
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                return;
            }
        }
        catch (JsonException)
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            return;
        }

        // 执行查询
        var stopwatch = Stopwatch.StartNew();
        try
        {
            var result = await _executor.ExecuteAsync(request, context.RequestAborted);
            stopwatch.Stop();

            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(result);

            _logger.LogInformation(
                "GraphQL query executed in {Elapsed}ms. Complexity: {Complexity}",
                stopwatch.ElapsedMilliseconds,
                result.Complexity);
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "GraphQL execution failed");
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(new
            {
                errors = new[] { new { message = ex.Message } }
            });
        }
    }
}

// Program.cs - 共享中间件管道
var app = builder.Build();

// 通用中间件（REST 与 GraphQL 共享）
app.UseExceptionHandler();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

// GraphQL 端点
app.UseMiddleware<GraphQlMiddleware>();

// REST 端点
app.MapControllers();

app.Run();
```

### 9.7 案例研究 7：性能优化 1.2K RPS → 18K RPS

某 API 服务上线后性能瓶颈分析：

**优化前**：

```
吞吐量：1,200 RPS
平均延迟：85ms
P99 延迟：450ms
CPU 使用率：85%
内存：2.4 GB
```

**瓶颈分析**：

1. 同步 JSON 序列化（阻塞线程池）。
2. 每个请求反射查询 endpoint 元数据。
3. 日志中间件捕获请求/响应体，导致额外内存分配。
4. 鉴权中间件重复查询数据库。

**优化措施**：

```csharp
// 优化 1：使用 System.Text.Json 异步流式序列化
app.Use(async (context, next) =>
{
    context.Response.ContentType = "application/json";
    await context.Response.StartAsync();

    var data = GetDataStream();  // IAsyncEnumerable<T>
    await JsonSerializer.SerializeAsync(context.Response.Body, data);
});

// 优化 2：缓存 endpoint 元数据查询
public sealed class CachedAuthorizationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;
    private readonly IPermissionService _service;

    public async Task InvokeAsync(HttpContext context)
    {
        var endpoint = context.GetEndpoint();
        if (endpoint is null)
        {
            await _next(context);
            return;
        }

        var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var cacheKey = $"perm:{userId}:{endpoint.DisplayName}";

        if (_cache.TryGetValue(cacheKey, out bool hasPermission))
        {
            if (!hasPermission)
            {
                context.Response.StatusCode = 403;
                return;
            }
            await _next(context);
            return;
        }

        var requiredPermission = endpoint.Metadata.GetMetadata<RequirePermissionAttribute>()?.Permission;
        hasPermission = await _service.HasPermissionAsync(userId!, requiredPermission!);

        _cache.Set(cacheKey, hasPermission, TimeSpan.FromMinutes(5));
        if (!hasPermission)
        {
            context.Response.StatusCode = 403;
            return;
        }

        await _next(context);
    }
}

// 优化 3：移除不必要的请求/响应体日志
// 仅在 Debug 级别启用
if (app.Environment.IsDevelopment())
{
    app.UseRequestBodyLogging();
    app.UseResponseBodyLogging();
}

// 优化 4：使用 ObjectPool 复用 MemoryStream
public sealed class PoolingMiddleware
{
    private static readonly ObjectPool<MemoryStream> _streamPool =
        ObjectPool.Create(new MemoryStreamPooledObjectPolicy());

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        var stream = _streamPool.Get();
        try
        {
            // 使用 stream
            await next(context);
        }
        finally
        {
            stream.SetLength(0);
            _streamPool.Return(stream);
        }
    }
}

// 优化 5：使用 HttpContext.Items 替代 AsyncLocal
// 在中间件间共享数据时，优先使用 Items
context.Items["Tenant"] = tenant;  // 比 AsyncLocal 快
```

**优化后**：

```
吞吐量：18,000 RPS（+1400%）
平均延迟：12ms
P99 延迟：85ms
CPU 使用率：60%
内存：1.1 GB
```

**关键教训**：

1. **同步阻塞是头号杀手**：异步优先，避免 `.Result`/`.Wait()`。
2. **缓存是廉价的性能**：元数据、权限、配置都可缓存。
3. **分配是隐形开销**：使用 `ObjectPool`、`ArrayPool`、`MemoryPool`。
4. **日志要克制**：开发期详细，生产期精简，避免捕获 body。

---

## 10. 习题

### 10.1 基础题

**习题 10.1.1**（记忆）：列出 ASP.NET Core 官方推荐的中间件注册顺序，并解释为何 `UseAuthentication` 必须在 `UseRouting` 之后。

**参考答案**：

推荐顺序：
1. `UseExceptionHandler` / `UseDeveloperExceptionPage`
2. `UseHsts`
3. `UseHttpsRedirection`
4. `UseStaticFiles`
5. `UseRouting`
6. `UseCors`
7. `UseAuthentication`
8. `UseAuthorization`
9. `UseRateLimiter`（可选）
10. `MapControllers` / `MapGet` 等

`UseAuthentication` 必须在 `UseRouting` 之后，因为鉴权中间件需要访问路由匹配后的 endpoint 元数据（如 `[Authorize]` 特性）来决定是否执行鉴权逻辑。若在 `UseRouting` 之前，endpoint 信息尚未确定，鉴权无法基于 endpoint 元数据决策。

---

**习题 10.1.2**（理解）：解释洋葱模型的工作原理，并画出三层中间件的执行流程。

**参考答案**：

洋葱模型描述中间件的双阶段执行：每个中间件在 `await next()` 之前的代码（前置阶段）按注册顺序执行，`await next()` 之后的代码（后置阶段）按注册顺序的逆序执行。

三层中间件 $M_1, M_2, M_3$ 的执行流程：

```
请求进入
    ↓
M1 前置阶段
    ↓
M2 前置阶段
    ↓
M3 前置阶段
    ↓
终端处理（如 Controller Action）
    ↓
M3 后置阶段
    ↓
M2 后置阶段
    ↓
M1 后置阶段
    ↓
响应离开
```

形式化地，每个中间件 $M$ 可表示为：

$$M.\text{Invoke}(ctx) = \text{Pre}_M(ctx) \oplus \text{await next}(ctx) \oplus \text{Post}_M(ctx)$$

其中 $\oplus$ 表示顺序执行，`next` 指向下一层中间件。

---

**习题 10.1.3**（应用）：编写一个中间件，记录每个请求的 traceId、方法、路径、状态码和耗时，输出为结构化 JSON 日志。

**参考答案**：

```csharp
public sealed class RequestLoggingMiddleware
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
        var traceId = Activity.Current?.TraceId.ToString() ?? context.TraceIdentifier;
        var sw = Stopwatch.GetTimestamp();

        try
        {
            await _next(context);
        }
        finally
        {
            var elapsed = Stopwatch.GetElapsedTime(sw);

            _logger.LogInformation(
                "Request {TraceId} {Method} {Path} -> {StatusCode} in {Elapsed}ms",
                traceId,
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode,
                elapsed.TotalMilliseconds);
        }
    }
}
```

### 10.2 进阶题

**习题 10.2.1**（分析）：分析以下代码的潜在问题，并给出改进建议。

```csharp
public class CachingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IDatabase _redis;

    public CachingMiddleware(RequestDelegate next, IDatabase redis)
    {
        _next = next;
        _redis = redis;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var cacheKey = context.Request.Path.Value!;

        var cached = _redis.StringGet(cacheKey);
        if (cached.HasValue)
        {
            await context.Response.WriteAsync(cached);
            return;
        }

        var originalBody = context.Response.Body;
        using var ms = new MemoryStream();
        context.Response.Body = ms;

        await _next(context);

        ms.Seek(0, SeekOrigin.Begin);
        var responseBody = await new StreamReader(ms).ReadToEndAsync();
        _redis.StringSet(cacheKey, responseBody, TimeSpan.FromMinutes(10));

        ms.Seek(0, SeekOrigin.Begin);
        await ms.CopyToAsync(originalBody);
    }
}
```

**参考答案**：

问题：

1. **同步 Redis 调用**：`StringGet`/`StringSet` 是同步方法，阻塞线程池线程。应使用 `StringGetAsync`/`StringSetAsync`。
2. **`using var ms`**：在 `finally` 外释放，若 `next` 抛异常，`originalBody` 不会被恢复。应使用 try-finally。
3. **`context.Response.Body = ms`** 后未恢复：若 `next` 抛异常，后续异常处理中间件无法写入响应。
4. **缓存所有请求**：未过滤 POST/PUT 等不应缓存的请求。
5. **未设置 ContentType**：从缓存恢复时丢失原始 ContentType。
6. **内存分配**：`StreamReader.ReadToEndAsync` 分配大字符串，大响应体导致 LOH 压力。

改进：

```csharp
public async Task InvokeAsync(HttpContext context)
{
    // 仅缓存 GET 请求
    if (!HttpMethods.IsGet(context.Request.Method))
    {
        await _next(context);
        return;
    }

    var cacheKey = context.Request.Path.Value!;

    // 异步读取缓存
    var cached = await _redis.StringGetAsync(cacheKey);
    if (cached.HasValue)
    {
        context.Response.ContentType = "application/json; charset=utf-8";
        context.Response.Headers["X-Cache"] = "HIT";
        await context.Response.WriteAsync(cached);
        return;
    }

    // 捕获响应
    var originalBody = context.Response.Body;
    await using var ms = new MemoryStream();
    context.Response.Body = ms;

    try
    {
        await _next(context);

        if (context.Response.StatusCode == 200 && ms.Length > 0)
        {
            ms.Seek(0, SeekOrigin.Begin);
            var bytes = ms.ToArray();
            await _redis.StringSetAsync(cacheKey, bytes, TimeSpan.FromMinutes(10));
        }
    }
    finally
    {
        context.Response.Body = originalBody;
    }

    ms.Seek(0, SeekOrigin.Begin);
    await ms.CopyToAsync(originalBody);
}
```

---

**习题 10.2.2**（评价）：评估在中间件中使用 `AsyncLocal<T>` 存储"请求作用域"数据 vs. 使用 `HttpContext.Items` 的优劣，并给出推荐方案。

**参考答案**：

| 维度 | `AsyncLocal<T>` | `HttpContext.Items` |
|------|----------------|--------------------|
| 访问方式 | 任意代码可访问 | 需 `HttpContext` 引用 |
| 异步流传播 | 自动跨 `await` | 需 `IHttpContextAccessor` |
| 性能 | 约 30ns/访问 | 约 5ns/访问 |
| 内存 | 每个异步流复制上下文 | 单一字典 |
| 测试友好 | 易于 mock | 需 mock `HttpContext` |
| 隐式依赖 | 隐式，难追踪 | 显式，清晰 |

推荐方案：

1. **请求作用域数据**：优先使用 `HttpContext.Items`，显式且性能更好。
2. **跨层访问**：使用 `IHttpContextAccessor` 暴露 `HttpContext.Items`。
3. **框架级上下文**：如日志的 `CorrelationId`，可用 `AsyncLocal<T>` + `ILoggerScope`。
4. **避免滥用 `AsyncLocal<T>`**：隐式依赖导致测试困难、代码难以理解。

---

**习题 10.2.3**（创造）：设计一个支持"中间件元数据"的扩展框架，允许在编译期声明中间件依赖关系，运行时验证管道完整性。

**参考答案**（设计草案）：

```csharp
// 中间件元数据特性
[AttributeUsage(AttributeTargets.Class)]
public sealed class MiddlewareMetadataAttribute : Attribute
{
    public Type[] Requires { get; }      // 必须在哪些中间件之前
    public Type[] RequiredBy { get; }    // 必须在哪些中间件之后
    public int Order { get; set; }       // 推荐顺序
    public string Category { get; set; } // 分类（Security/Logging/Performance 等）
}

// 使用示例
[MiddlewareMetadata(Requires = new[] { typeof(ExceptionHandlingMiddleware) }, Order = 100, Category = "Logging")]
public class RequestLoggingMiddleware { /* ... */ }

[MiddlewareMetadata(Requires = new[] { typeof(RequestLoggingMiddleware) }, Order = 200, Category = "Security")]
public class AuthenticationMiddleware { /* ... */ }

[MiddlewareMetadata(RequiredBy = new[] { typeof(AuthorizationMiddleware) }, Order = 300, Category = "Security")]
public class AuthorizationMiddleware { /* ... */ }

// 验证器
public sealed class PipelineValidator
{
    public void Validate(IApplicationBuilder app)
    {
        var registeredMiddlewares = ExtractRegisteredMiddlewares(app);
        var errors = new List<string>();

        foreach (var middleware in registeredMiddlewares)
        {
            var metadata = middleware.GetType().GetCustomAttribute<MiddlewareMetadataAttribute>();
            if (metadata is null) continue;

            // 检查 Requires
            foreach (var required in metadata.Requires)
            {
                if (!registeredMiddlewares.Any(m => m.GetType() == required))
                {
                    errors.Add($"{middleware.GetType().Name} requires {required.Name} but it's not registered");
                }
                else if (GetRegistrationIndex(app, required) > GetRegistrationIndex(app, middleware.GetType()))
                {
                    errors.Add($"{required.Name} must be registered before {middleware.GetType().Name}");
                }
            }
        }

        if (errors.Any())
        {
            throw new InvalidOperationException(
                "Pipeline validation failed:\n" + string.Join("\n", errors));
        }
    }
}

// 使用
app.UseRequestLogging();
app.UseAuthentication();
app.UseAuthorization();

// 启动时验证
var validator = new PipelineValidator();
validator.Validate(app);  // 若顺序错误，抛异常
```

未来可结合 Source Generator 在编译期生成验证代码，避免运行时反射。

### 10.3 综合题

**习题 10.3.1**（综合）：实现一个支持"请求优先级"的中间件，允许通过请求头指定优先级（`X-Priority: high|normal|low`），高优先级请求优先处理，低优先级请求在系统繁忙时被拒绝。

**参考答案**：

```csharp
public sealed class PriorityQueueMiddleware
{
    private readonly RequestDelegate _next;
    private readonly PriorityQueue<HttpContext, int> _queue = new();
    private readonly SemaphoreSlim _concurrencyLimiter;
    private readonly int _maxQueueSize;
    private readonly ILogger<PriorityQueueMiddleware> _logger;
    private int _currentConcurrency;

    public PriorityQueueMiddleware(
        RequestDelegate next,
        IOptions<PriorityOptions> options,
        ILogger<PriorityQueueMiddleware> logger)
    {
        _next = next;
        _concurrencyLimiter = new SemaphoreSlim(options.Value.MaxConcurrency);
        _maxQueueSize = options.Value.MaxQueueSize;
        _logger = logger;

        // 启动消费者
        for (int i = 0; i < options.Value.WorkerCount; i++)
        {
            _ = Task.Run(ConsumeAsync);
        }
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var priority = ParsePriority(context.Request.Headers["X-Priority"]);

        // 高优先级直接处理
        if (priority == int.MaxValue && _currentConcurrency < Environment.ProcessorCount * 2)
        {
            await ProcessDirectlyAsync(context);
            return;
        }

        // 入队
        if (_queue.Count >= _maxQueueSize)
        {
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            context.Response.Headers["Retry-After"] = "5";
            await context.Response.WriteAsync("Server busy");
            return;
        }

        var tcs = new TaskCompletionSource();
        context.Items["PriorityTcs"] = tcs;

        lock (_queue)
        {
            _queue.Enqueue(context, priority);
        }

        await tcs.Task;
    }

    private async Task ConsumeAsync()
    {
        while (true)
        {
            HttpContext? context = null;
            lock (_queue)
            {
                if (_queue.Count > 0)
                {
                    context = _queue.Dequeue();
                }
            }

            if (context is null)
            {
                await Task.Delay(10);
                continue;
            }

            await _concurrencyLimiter.WaitAsync();
            try
            {
                Interlocked.Increment(ref _currentConcurrency);
                await _next(context);

                if (context.Items["PriorityTcs"] is TaskCompletionSource tcs)
                {
                    tcs.TrySetResult();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing request");
                if (context.Items["PriorityTcs"] is TaskCompletionSource tcs)
                {
                    tcs.TrySetException(ex);
                }
            }
            finally
            {
                Interlocked.Decrement(ref _currentConcurrency);
                _concurrencyLimiter.Release();
            }
        }
    }

    private async Task ProcessDirectlyAsync(HttpContext context)
    {
        Interlocked.Increment(ref _currentConcurrency);
        try
        {
            await _next(context);
        }
        finally
        {
            Interlocked.Decrement(ref _currentConcurrency);
        }
    }

    private static int ParsePriority(string? value) => value?.ToLowerInvariant() switch
    {
        "high" => int.MaxValue,
        "low" => int.MinValue,
        _ => 0  // normal
    };
}
```

---

## 11. 参考文献

[1] Microsoft. 2024. *ASP.NET Core Middleware*. Microsoft Docs. https://learn.microsoft.com/aspnet/core/fundamentals/middleware/

[2] Microsoft. 2024. *Write custom ASP.NET Core middleware*. Microsoft Docs. https://learn.microsoft.com/aspnet/core/fundamentals/middleware/write

[3] Microsoft. 2024. *ASP.NET Core Middleware ordering*. Microsoft Docs. https://learn.microsoft.com/aspnet/core/fundamentals/middleware/

[4] Fowler, D. 2023. *ASP.NET Core Architecture*. GitHub Repository. https://github.com/dotnet/aspnetcore

[5] Edwards, C. 2022. *ASP.NET Core in Action, Third Edition*. Manning Publications. ISBN: 978-1617298800.

[6] Paoli, A., Calvert, J., and Hounsell, N. 2023. *Pro ASP.NET Core 7*. Apress. DOI: 10.1007/978-1-4842-8956-2.

[7] Microsoft. 2024. *Router Middleware and Endpoint Routing in ASP.NET Core*. https://learn.microsoft.com/aspnet/core/fundamentals/routing

[8] Microsoft. 2024. *Keyed Services in ASP.NET Core 8*. https://learn.microsoft.com/dotnet/core/extensions/dependency-injection#keyed-services

[9] Microsoft. 2024. *Rate Limiting Middleware in ASP.NET Core*. https://learn.microsoft.com/aspnet/core/performance/rate-limit

[10] Microsoft. 2024. *Output Caching Middleware in ASP.NET Core*. https://learn.microsoft.com/aspnet/core/performance/caching/output

[11] OpenTelemetry Authors. 2024. *OpenTelemetry .NET Instrumentation*. https://opentelemetry.io/docs/instrumentation/net/

[12] ECMA International. 2023. *ECMA-334: C# Language Specification, 6th Edition*. https://www.ecma-international.org/publications-and-standards/standards/ecma-334/

[13] Kleijn, W. 2023. *YARP: Yet Another Reverse Proxy*. Microsoft Docs. https://microsoft.github.io/reverse-proxy/

[14] Papa, C. 2022. *Implementing Circuit Breaker Pattern in ASP.NET Core*. MSDN Magazine. https://learn.microsoft.com/dotnet/architecture/microservices/implement-resilient-applications/

[15] Torjusen, A. 2023. *Async Local Storage in .NET*. .NET Blog. https://devblogs.microsoft.com/dotnet/

---

## 12. 延伸阅读

### 12.1 官方文档与规范

- **ASP.NET Core 官方文档**：https://learn.microsoft.com/aspnet/core/
- **EF Core 文档**：https://learn.microsoft.com/ef/core/
- **.NET 性能文档**：https://learn.microsoft.com/dotnet/core/performance/
- **OpenTelemetry .NET**：https://opentelemetry.io/docs/instrumentation/net/

### 12.2 经典书籍

- **Andrew Lock - *ASP.NET Core in Action, Third Edition*** (2023)：Manning 出版，覆盖 ASP.NET Core 8 的中间件、路由、鉴权等核心主题。
- **Mark J. Price - *C# 12 and .NET 8 - Modern Cross-Platform Development*** (2023)：Packt 出版，第八章深入讲解 ASP.NET Core 中间件。
- **Adam Freeman - *Pro ASP.NET Core 7*** (2023)：Apress 出版，第二部分专门讨论中间件管道与路由。

### 12.3 开源项目与源码

- **dotnet/aspnetcore**：https://github.com/dotnet/aspnetcore - ASP.NET Core 源码，重点关注 `src/Http/Http.Abstractions` 与 `src/Http/Hosting`。
- **dotnet/yarp**：https://github.com/microsoft/reverse-proxy - YARP 反向代理，基于 ASP.NET Core 管道构建。
- **dotnet/aspnet-api-versioning**：https://github.com/dotnet/aspnet-api-versioning - 官方 API 版本化方案。
- **App-vNext/Polly**：https://github.com/App-vNext/Polly - 弹性框架（熔断、重试、超时）。

### 12.4 进阶主题

- **NativeAOT 与中间件**：https://learn.microsoft.com/dotnet/core/native-aot/ - ASP.NET Core 8 的 AOT 限制与最佳实践。
- **Source Generator**：https://learn.microsoft.com/dotnet/csharp/roslyn-source-generators - 编译期代码生成替代反射。
- **Minimal API**：https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis - .NET 6+ 的轻量 API 风格。
- **Blazor Server**：https://learn.microsoft.com/aspnet/core/blazor/ - Blazor Server 的 SignalR 管道深入。

### 12.5 社区资源

- **ASP.NET Core 官方博客**：https://devblogs.microsoft.com/dotnet/category/aspnet/
- **.NET Foundation**：https://dotnetfoundation.org/ - .NET 生态治理组织。
- **Stack Overflow - ASP.NET Core**：https://stackoverflow.com/questions/tagged/asp.net-core
- **Reddit - r/dotnet**：https://www.reddit.com/r/dotnet/

### 12.6 相关标准与 RFC

- **RFC 7807 - Problem Details for HTTP APIs**：https://www.rfc-editor.org/rfc/rfc7807 - 错误响应规范。
- **RFC 7231 - HTTP/1.1 Semantics**：https://www.rfc-editor.org/rfc/rfc7231 - HTTP 状态码与语义。
- **W3C Trace Context**：https://www.w3.org/TR/trace-context/ - 分布式追踪标准。
- **OpenAPI Specification**：https://spec.openapis.org/oas/v3.1.0 - API 文档规范。
