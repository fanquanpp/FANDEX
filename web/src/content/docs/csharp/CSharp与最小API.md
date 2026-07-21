---
order: 62
title: 'C#与最小API'
module: csharp
category: 'C#'
difficulty: beginner
description: '.NET Minimal API'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'csharp/CSharp与EF Core'
  - 'csharp/CSharp与依赖注入'
  - 'csharp/CSharp12与CSharp13新特性'
  - 'csharp/CSharp与反射'
prerequisites:
  - csharp/概述与环境配置
---

## 一、概述

Minimal API（最小 API）是 .NET 6 引入、并在 .NET 7-9 持续演进的轻量级 Web API 构建模式。与传统的 Controller-based（基于控制器）开发模式相比，Minimal API 允许开发者用最少的代码、最少的样板（boilerplate）、最少的依赖定义 HTTP 端点（Endpoint），把焦点放在"路由 + 处理函数"这一最本质的 Web API 元素上。它使用 C# 顶层语句（Top-level Statements）、Lambda 表达式、扩展方法等现代 C# 特性，将整个 Web API 应用压缩到几十行甚至几行代码中。

### 1.1 为什么需要 Minimal API

要理解 Minimal API 的价值，我们先回顾传统 ASP.NET Core Controller 模式的一个简单 GET 端点实现：

```csharp
// 传统 Controller 模式
[ApiController]
[Route("api/[controller]")]
public class HelloController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok("Hello, World!");
    }
}

// Startup.cs / Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
var app = builder.Build();
app.MapControllers();
app.Run();
```

可以看到，为了实现一个"返回 Hello World"的端点，我们需要：
- 创建一个继承自 `ControllerBase` 的类；
- 添加 `[ApiController]`、`[Route]`、`[HttpGet]` 等特性；
- 在 DI 容器中注册 Controllers；
- 显式映射 Controller 路由。

这些样板代码对于一个简单的 API 来说显得过于"重"。Minimal API 把同样的功能压缩为一行：

```csharp
// Minimal API 模式
var app = WebApplication.CreateBuilder(args).Build();
app.MapGet("/", () => "Hello, World!");
app.Run();
```

这种极简风格的 API 构建方式特别适合：
- **微服务（Microservices）**：每个微服务通常只暴露少量端点，不需要 Controller 的复杂结构。
- **快速原型（Prototyping）**：在验证想法时，Minimal API 让你能用最少时间搭建可用的 API。
- **学习与教学**：Minimal API 减少了初学者的认知负担，让他们专注于 HTTP 与 C# 本身。
- **轻量级后端**：移动应用、IoT 设备、单页应用（SPA）的后端通常不需要 Controller 模式的全部能力。

### 1.2 Minimal API 不是什么

理解 Minimal API 不是什么同样重要，它能避免我们对其产生错误期待：

1. **不是低性能 API**：Minimal API 与 Controller 模式基于相同的 ASP.NET Core 运行时，性能相当甚至在某些场景下略优（少了 Controller 激活的开销）。
2. **不是 Controller 的替代品**：Minimal API 与 Controller 可以共存。对于复杂业务逻辑、需要大量复用与继承的场景，Controller 仍然是合适选择。
3. **不是"玩具"框架**：Minimal API 完整支持依赖注入、认证授权、OpenAPI、过滤器、模型绑定、`ProblemDetails` 等企业级特性。

### 1.3 学习路径

本章假设你已经了解 HTTP 基本概念（GET/POST/PUT/DELETE、状态码、请求/响应体）与 C# 基础语法。学完本章后，你将能够：

1. 使用 `WebApplication` 与 `MapGet/MapPost/MapPut/MapDelete` 定义 HTTP 端点。
2. 通过参数注入与请求体绑定处理请求数据。
3. 使用路由组（Route Group）组织大型 API。
4. 使用端点过滤器（Endpoint Filter）实现横切关注点（日志、验证、缓存）。
5. 集成认证、授权、Swagger、EF Core 等企业级特性。
6. 理解 Minimal API 的内部工作原理，并在 Controller 与 Minimal API 之间做出合适选择。

## 二、历史演进

### 2.1 ASP.NET Core MVC 与 Controller 模式（2016-2020）

ASP.NET Core 1.0/2.0/3.0 时代，Web API 开发的主流模式是 Controller-based。开发者需要创建 Controller 类、添加路由特性、在 `Startup.cs` 中配置中间件管道与 DI。这一模式功能强大，但对于简单 API 显得冗余。

### 2.2 端点路由（Endpoint Routing）（.NET Core 3.0）

.NET Core 3.0 引入了端点路由（Endpoint Routing），将路由匹配与请求处理解耦。这是 Minimal API 的技术基础——端点路由允许在不依赖 Controller 的情况下定义路由到处理器的映射。

### 2.3 Minimal API 的诞生（.NET 6, 2021）

.NET 6 正式引入 Minimal API，配合顶层语句（C# 9）与 `WebApplication` 类，开发者可以用几行代码创建完整的 Web API。初版 Minimal API 已支持：

- `MapGet`/`MapPost`/`MapPut`/`MapDelete` 等路由映射方法。
- 参数注入（从 DI 容器与请求中自动绑定）。
- `IResult` 返回类型与 `Results.Ok`、`Results.NotFound` 等工厂方法。
- 路由组（`MapGroup`）。

但 .NET 6 的 Minimal API 仍有一些不足：过滤器支持有限、OpenAPI 集成较弱、端点元数据 API 较少。

### 2.4 端点过滤器与元数据增强（.NET 7, 2022）

.NET 7 大幅增强了 Minimal API：

- 引入端点过滤器（`IEndpointFilter`、`AddFilter`），实现横切关注点。
- 端点元数据 API 更丰富（`WithName`、`WithTags`、`WithDescription`、`WithGroupName`）。
- 类型化结果（TypedResults）让 OpenAPI 生成更准确。
- `IBindableFromHttpContext<T>` 接口支持自定义参数绑定。

### 2.5 源生成器与 AOT 支持（.NET 8, 2023）

.NET 8 引入了 ASP.NET Core 源生成器，使得 Minimal API 可以参与 Native AOT 编译：

- `[AsParameters]` 特性简化复杂参数绑定。
- 路由委托可以使用源生成器生成的代码替代反射，提升 AOT 兼容性。
- `Microsoft.AspNetCore.OpenApi` 包提供官方 OpenAPI 文档生成。

### 2.6 OpenAPI 与可扩展性增强（.NET 9, 2024）

.NET 9 进一步完善了 OpenAPI 支持：

- 内置 OpenAPI 文档生成（不再需要第三方包）。
- `Microsoft.AspNetCore.OpenApi` 使用源生成器替代反射，AOT 友好。
- 端点过滤器与中间件管道更好地集成。
- 与 `IHostedService`、`BackgroundService` 等长时服务的协作更顺畅。

## 三、核心概念

### 3.1 WebApplication：应用主体

`WebApplication` 是 Minimal API 应用的核心对象，它同时实现了 `IHost`（宿主）与 `IApplicationBuilder`（中间件管道构建器）。所有 Minimal API 应用都以创建 `WebApplication` 开始。

```csharp
// 创建 Builder（用于配置服务与配置源）
var builder = WebApplication.CreateBuilder(args);

// 注册服务到 DI 容器
builder.Services.AddLogging();
builder.Services.AddHttpClient();
builder.Services.AddScoped<IUserService, UserService>();

// 构建 Application
var app = builder.Build();

// 配置中间件管道
app.UseAuthentication();
app.UseAuthorization();

// 定义端点
app.MapGet("/", () => "Hello, World!");

// 启动应用
app.Run();
```

`WebApplication.CreateBuilder` 会自动配置：
- Kestrel 作为 Web 服务器；
- 日志（Console、Debug、EventSource）；
- 配置源（appsettings.json、环境变量、命令行参数）；
- DI 容器。

### 3.2 端点（Endpoint）与路由映射

端点是 Minimal API 的核心概念：一个 URL 模式 + 一个 HTTP 方法 + 一个处理函数的组合。Minimal API 通过一组扩展方法定义端点：

| 方法 | HTTP 动词 | 用途 |
|------|----------|------|
| `MapGet` | GET | 获取资源 |
| `MapPost` | POST | 创建资源 |
| `MapPut` | PUT | 全量更新资源 |
| `MapPatch` | PATCH | 部分更新资源 |
| `MapDelete` | DELETE | 删除资源 |
| `MapMethods` | 自定义 | 自定义 HTTP 方法 |
| `MapFallback` | 任意 | 兜底处理（匹配所有未匹配请求） |

```csharp
app.MapGet("/users/{id}", (int id) => $"User {id}");
app.MapPost("/users", (User user) => Results.Created($"/users/{user.Id}", user));
app.MapPut("/users/{id}", (int id, User user) => Results.NoContent());
app.MapDelete("/users/{id}", (int id) => Results.NoContent());

// 自定义 HTTP 方法
app.MapMethods("/custom", new[] { "LINK", "UNLINK" }, () => "OK");

// 兜底处理
app.MapFallback(() => "404 - Not Found");
```

### 3.3 处理函数（Handler）

处理函数是端点的核心逻辑，可以是 Lambda 表达式、局部函数、静态方法或实例方法。框架会自动从请求中提取参数并绑定到处理函数的参数，返回值会被自动序列化为响应。

```csharp
// Lambda 表达式
app.MapGet("/hello", () => "Hello");

// 带参数的 Lambda
app.MapGet("/users/{id}", (int id) => $"User {id}");

// 带多个参数（来自不同源）
app.MapGet("/search", (
    string keyword,                  // 查询字符串
    int page = 1,                    // 查询字符串，带默认值
    HttpContext context,             // 请求上下文
    ILogger<Program> logger          // DI 注入
    ) =>
{
    logger.LogInformation("搜索: {Keyword}", keyword);
    return Results.Ok(new { keyword, page });
});

// 局部函数
app.MapGet("/time", GetTime);
static string GetTime() => DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

// 静态方法
app.MapGet("/config", GetConfig);
static IResult GetConfig(IConfiguration config) => Results.Ok(config.AsEnumerable());
```

### 3.4 参数绑定（Parameter Binding）

参数绑定是 Minimal API 自动从请求中提取参数值的机制。Minimal API 根据参数类型与名称从不同源绑定：

| 参数类型 | 默认来源 | 示例 |
|---------|---------|------|
| 路由参数 | URL 路径 | `/users/{id}` 中的 `id` |
| 简单类型（int、string、bool 等） | 查询字符串 | `?keyword=hello` |
| 复杂类型（自定义类） | 请求体（JSON） | POST body |
| 特殊类型（HttpContext、HttpRequest、CancellationToken） | 框架提供 | 自动注入 |
| DI 注册的服务 | DI 容器 | 自动注入 |

```csharp
// 路由参数
app.MapGet("/users/{id:int}", (int id) => $"User {id}");

// 查询参数
app.MapGet("/search", (string q, int page = 1, int size = 10) =>
    Results.Ok(new { q, page, size }));

// 请求体绑定
app.MapPost("/users", (User user) => Results.Created($"/users/{user.Id}", user));

// 混合绑定
app.MapPut("/users/{id}", (int id, User user, IUserService service, ILogger<Program> logger) =>
{
    logger.LogInformation("更新用户 {Id}", id);
    var updated = service.Update(id, user);
    return updated is not null ? Results.Ok(updated) : Results.NotFound();
});
```

如果默认绑定不满足需求，可以使用 `[FromBody]`、`[FromQuery]`、`[FromRoute]`、`[FromHeader]`、`[FromServices]` 等特性显式指定来源。

### 3.5 IResult 与响应类型

`IResult` 是 Minimal API 的统一响应类型。`Results` 静态类与 `TypedResults` 静态类提供了创建各种响应的工厂方法：

```csharp
// 简单返回值（自动包装为 200 OK）
app.MapGet("/text", () => "Hello");
app.MapGet("/json", () => new { name = "张三", age = 25 });

// 使用 Results 工厂
app.MapGet("/users/{id}", (int id) =>
{
    return id > 0
        ? Results.Ok(new { id, name = "张三" })
        : Results.BadRequest("ID 必须大于 0");
});

// 常用 Results 方法
app.MapGet("/examples", () => new
{
    Ok = Results.Ok(new { foo = "bar" }),
    Created = Results.Created("/items/1", new { id = 1 }),
    NoContent = Results.NoContent(),
    NotFound = Results.NotFound("资源不存在"),
    BadRequest = Results.BadRequest("请求错误"),
    Unauthorized = Results.Unauthorized(),
    Conflict = Results.Conflict("资源冲突"),
    Problem = Results.Problem("服务器内部错误", statusCode: 500),
    Redirect = Results.Redirect("https://example.com"),
    File = Results.File(new byte[] { 1, 2, 3 }, "application/octet-stream"),
    Stream = Results.Stream(Stream.Null, "application/json")
});
```

`TypedResults` 是 .NET 7 引入的强类型版本，返回类型明确，便于 OpenAPI 生成与编译时检查：

```csharp
// TypedResults 提供强类型返回
app.MapGet("/users/{id}", (int id) =>
{
    return id > 0
        ? TypedResults.Ok(new User(id, "张三"))
        : TypedResults.BadRequest("ID 必须大于 0");
}).Produces<User>(StatusCodes.Status200OK)
  .Produces<string>(StatusCodes.Status400BadRequest);
```

### 3.6 路由组（Route Group）

当端点数量增加时，可以使用路由组将相关端点组织在一起，避免重复前缀：

```csharp
var app = WebApplication.CreateBuilder(args).Build();

// 创建路由组（统一前缀与元数据）
var users = app.MapGroup("/users")
    .WithTags("用户管理");

users.MapGet("/", () => "获取所有用户");
users.MapGet("/{id}", (int id) => $"获取用户 {id}");
users.MapPost("/", (User user) => Results.Created($"/users/{user.Id}", user));
users.MapPut("/{id}", (int id, User user) => Results.NoContent());
users.MapDelete("/{id}", (int id) => Results.NoContent());

// 另一个路由组
var products = app.MapGroup("/products")
    .WithTags("产品管理");

products.MapGet("/", () => "获取所有产品");
products.MapGet("/{id}", (int id) => $"获取产品 {id}");

app.Run();
```

路由组可以嵌套，并且可以添加共享元数据（如认证要求、过滤器）：

```csharp
// 需要认证的路由组
var admin = app.MapGroup("/admin")
    .RequireAuthorization("AdminPolicy")
    .WithTags("管理");

admin.MapGet("/users", () => "管理用户列表");
admin.MapPost("/users/{id}/ban", (int id) => $"封禁用户 {id}");

// 嵌套路由组
var api = app.MapGroup("/api/v1");
var v1Users = api.MapGroup("/users").WithTags("V1 用户");
var v1Products = api.MapGroup("/products").WithTags("V1 产品");
```

## 四、工作原理

### 4.1 中间件管道（Middleware Pipeline）

ASP.NET Core 的请求处理基于中间件管道。每个请求按顺序经过一系列中间件，每个中间件可以在处理前、处理后或短路（short-circuit）请求。

```
请求 → [Authentication] → [Authorization] → [Routing] → [Endpoint] → [Response]
                                                                    ↓
响应 ← [Authentication] ← [Authorization] ← [Routing] ← [Endpoint] ←┘
```

Minimal API 也是基于中间件管道，端点本身就是一个特殊的"终端中间件"（terminal middleware）。

```csharp
var app = WebApplication.CreateBuilder(args).Build();

// 中间件按添加顺序执行
app.UseExceptionHandler();        // 异常处理
app.UseHttpsRedirection();        // HTTPS 重定向
app.UseStaticFiles();             // 静态文件
app.UseAuthentication();          // 认证
app.UseAuthorization();           // 授权
app.UseRouting();                 // 路由（Minimal API 隐式调用）

// 端点定义
app.MapGet("/", () => "Hello");

app.Run();
```

### 4.2 端点路由的内部机制

Minimal API 底层使用 ASP.NET Core 的端点路由（Endpoint Routing）。`MapGet` 等方法的本质是向路由表注册一个 `Endpoint` 对象，包含：
- 路由模式（Pattern）：如 `/users/{id}`
- HTTP 方法约束（Method Constraint）：如 GET
- 处理委托（RequestDelegate）：包装了用户提供的处理函数
- 元数据（Metadata）：认证要求、OpenAPI 描述、 CORS 策略等

当请求到达时：
1. 路由中间件（`UseRouting`）匹配请求 URL 与方法，找到对应的 `Endpoint`。
2. 后续中间件可以读取 `HttpContext.GetEndpoint()` 获取端点信息。
3. 端点执行中间件（`UseEndpoints` 或隐式调用）调用处理委托。

### 4.3 参数绑定的内部机制

Minimal API 的参数绑定由 `RequestDelegateFactory` 完成。在应用启动时，框架会分析每个处理函数的参数，为每个参数生成绑定逻辑：

```csharp
// 处理函数
app.MapGet("/users/{id}", (int id, IUserService service) => ...);

// 框架生成的绑定逻辑（简化）
async Task Handler(HttpContext context)
{
    // 路由参数绑定
    var id = int.Parse(context.GetRouteValue("id")!.ToString()!);

    // DI 服务绑定
    var service = context.RequestServices.GetRequiredService<IUserService>();

    // 调用处理函数
    var result = handler(id, service);

    // 写入响应
    await WriteResultAsync(context, result);
}
```

这种"启动时分析 + 运行时执行"的设计让 Minimal API 的运行时性能接近手写代码。

### 4.4 IResult 与响应序列化

处理函数的返回值会被序列化为 HTTP 响应。Minimal API 根据返回类型选择序列化策略：

- **`IResult`**：直接调用 `ExecuteAsync` 写入响应。
- **`string`**：作为纯文本写入（`text/plain`）。
- **其他类型**：使用 `System.Text.Json` 序列化为 JSON（`application/json`）。

```csharp
// 字符串返回 text/plain
app.MapGet("/text", () => "Hello");

// 对象返回 application/json
app.MapGet("/json", () => new { name = "张三" });

// IResult 自定义响应
app.MapGet("/custom", () =>
{
    return Results.Json(new { name = "张三" },
        statusCode: 200,
        contentType: "application/json; charset=utf-8");
});
```

## 五、快速上手

### 5.1 创建第一个 Minimal API 项目

使用 .NET CLI 创建项目：

```bash
# 创建 Minimal API 项目（使用 web 模板，最简洁）
dotnet new web -n MyMinimalApi

# 进入项目目录
cd MyMinimalApi

# 运行项目
dotnet run
```

默认生成的 `Program.cs`：

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.Run();
```

运行后访问 `http://localhost:5000`，浏览器会显示 "Hello World!"。

### 5.2 定义各种 HTTP 方法的端点

```csharp
var app = WebApplication.CreateBuilder(args).Build();

// GET - 获取数据
app.MapGet("/hello", () => "你好，世界！");

// GET - 带路由参数
app.MapGet("/users/{id:int}", (int id) =>
{
    return $"用户 ID: {id}";
});

// GET - 带查询参数
app.MapGet("/search", (string keyword, int page = 1) =>
{
    return $"搜索: {keyword}, 第 {page} 页";
});

// POST - 创建数据
app.MapPost("/users", (User user) =>
{
    return Results.Created($"/users/{user.Id}", user);
});

// PUT - 更新数据
app.MapPut("/users/{id}", (int id, User user) =>
{
    return Results.Ok($"用户 {id} 已更新");
});

// DELETE - 删除数据
app.MapDelete("/users/{id}", (int id) =>
{
    return Results.Ok($"用户 {id} 已删除");
});

app.Run();

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
}
```

### 5.3 集成依赖注入

```csharp
var builder = WebApplication.CreateBuilder(args);

// 注册服务
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddSingleton<ICacheService, MemoryCacheService>();
builder.Services.AddDbContext<AppDbContext>();

var app = builder.Build();

// 通过参数注入服务（无需构造函数）
app.MapGet("/users/{id}", (int id, IUserService userService) =>
{
    var user = userService.GetById(id);
    return user is not null
        ? Results.Ok(user)
        : Results.NotFound($"用户 {id} 不存在");
});

// 注入多个服务
app.MapPost("/users", (User user, IUserService userService, ICacheService cache) =>
{
    var created = userService.Create(user);
    cache.Set($"user_{created.Id}", created);
    return Results.Created($"/users/{created.Id}", created);
});

app.Run();
```

### 5.4 添加 Swagger 文档

```csharp
var builder = WebApplication.CreateBuilder(args);

// 添加 Swagger 服务（.NET 9 内置 OpenAPI，不再需要单独包）
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();  // .NET 9+
// 或使用旧版：
// builder.Services.AddSwaggerGen();

var app = builder.Build();

// 启用 OpenAPI/Swagger
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();  // .NET 9+
    // app.UseSwagger();
    // app.UseSwaggerUI();
}

// 端点描述（用于 OpenAPI 文档）
app.MapGet("/users", () => "所有用户")
    .WithSummary("获取所有用户")
    .WithDescription("返回系统中所有用户的列表。")
    .WithTags("用户")
    .WithName("GetUsers");

app.Run();
```

## 六、实战示例

### 6.1 完整的 CRUD API

下面是一个完整的待办事项（Todo）CRUD API 实现：

```csharp
var builder = WebApplication.CreateBuilder(args);

// 注册服务
builder.Services.AddSingleton<TodoService>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// 路由组：所有待办相关端点
var todos = app.MapGroup("/todos")
    .WithTags("待办事项");

// 获取所有待办
todos.MapGet("/", (TodoService service) =>
{
    return Results.Ok(service.GetAll());
})
.WithName("GetAllTodos")
.WithSummary("获取所有待办事项");

// 获取单个待办
todos.MapGet("/{id:int}", (int id, TodoService service) =>
{
    var todo = service.GetById(id);
    return todo is not null
        ? Results.Ok(todo)
        : Results.NotFound($"待办事项 {id} 不存在");
})
.WithName("GetTodoById")
.WithSummary("获取指定 ID 的待办事项");

// 创建待办
todos.MapPost("/", (TodoItem item, TodoService service) =>
{
    if (string.IsNullOrEmpty(item.Title))
        return Results.BadRequest("标题不能为空");

    var created = service.Create(item);
    return Results.Created($"/todos/{created.Id}", created);
})
.WithName("CreateTodo")
.WithSummary("创建新的待办事项");

// 更新待办
todos.MapPut("/{id:int}", (int id, TodoItem item, TodoService service) =>
{
    var updated = service.Update(id, item);
    return updated is not null
        ? Results.Ok(updated)
        : Results.NotFound($"待办事项 {id} 不存在");
})
.WithName("UpdateTodo")
.WithSummary("更新指定 ID 的待办事项");

// 删除待办
todos.MapDelete("/{id:int}", (int id, TodoService service) =>
{
    var deleted = service.Delete(id);
    return deleted
        ? Results.NoContent()
        : Results.NotFound($"待办事项 {id} 不存在");
})
.WithName("DeleteTodo")
.WithSummary("删除指定 ID 的待办事项");

// 完成待办
todos.MapPost("/{id:int}/complete", (int id, TodoService service) =>
{
    var completed = service.MarkComplete(id);
    return completed is not null
        ? Results.Ok(completed)
        : Results.NotFound($"待办事项 {id} 不存在");
})
.WithName("CompleteTodo")
.WithSummary("将待办事项标记为已完成");

app.Run();

// 数据模型
public class TodoItem
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public bool IsDone { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}

// 简单的服务实现（生产环境应使用 EF Core + 数据库）
public class TodoService
{
    private readonly List<TodoItem> _items = new();
    private int _nextId = 1;

    public List<TodoItem> GetAll() => _items;

    public TodoItem? GetById(int id) => _items.FirstOrDefault(x => x.Id == id);

    public TodoItem Create(TodoItem item)
    {
        item.Id = _nextId++;
        item.CreatedAt = DateTime.UtcNow;
        _items.Add(item);
        return item;
    }

    public TodoItem? Update(int id, TodoItem updated)
    {
        var item = GetById(id);
        if (item is null) return null;
        item.Title = updated.Title;
        item.Description = updated.Description;
        item.IsDone = updated.IsDone;
        return item;
    }

    public TodoItem? MarkComplete(int id)
    {
        var item = GetById(id);
        if (item is null) return null;
        item.IsDone = true;
        item.CompletedAt = DateTime.UtcNow;
        return item;
    }

    public bool Delete(int id) => _items.RemoveAll(x => x.Id == id) > 0;
}
```

### 6.2 集成 EF Core 数据库访问

```csharp
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// 注册 EF Core
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=app.db"));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

var app = builder.Build();

// 自动迁移数据库（生产环境应使用迁移脚本）
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// 用户 CRUD 端点
var users = app.MapGroup("/users").WithTags("用户");

users.MapGet("/", async (AppDbContext db) =>
{
    return await db.Users.ToListAsync();
});

users.MapGet("/{id}", async (int id, AppDbContext db) =>
{
    var user = await db.Users.FindAsync(id);
    return user is not null ? Results.Ok(user) : Results.NotFound();
});

users.MapPost("/", async (User user, AppDbContext db) =>
{
    db.Users.Add(user);
    await db.SaveChangesAsync();
    return Results.Created($"/users/{user.Id}", user);
});

users.MapPut("/{id}", async (int id, User input, AppDbContext db) =>
{
    var user = await db.Users.FindAsync(id);
    if (user is null) return Results.NotFound();

    user.Name = input.Name;
    user.Email = input.Email;
    user.UpdatedAt = DateTime.UtcNow;

    await db.SaveChangesAsync();
    return Results.Ok(user);
});

users.MapDelete("/{id}", async (int id, AppDbContext db) =>
{
    var user = await db.Users.FindAsync(id);
    if (user is null) return Results.NotFound();

    db.Users.Remove(user);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.Run();

// EF Core 上下文
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.Email).IsUnique();
        });
    }
}

// 实体
public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
```

### 6.3 端点过滤器实现横切关注点

端点过滤器（Endpoint Filter）是 .NET 7 引入的关键特性，用于实现日志、验证、缓存、异常处理等横切关注点。

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();
builder.Services.AddSingleton<UserService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// 全局过滤器：日志
app.Use(async (context, next) =>
{
    var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
    var sw = System.Diagnostics.Stopwatch.StartNew();

    logger.LogInformation("→ {Method} {Path}",
        context.Request.Method, context.Request.Path);

    await next(context);

    sw.Stop();
    logger.LogInformation("← {Status} in {ElapsedMs}ms",
        context.Response.StatusCode, sw.ElapsedMilliseconds);
});

// 验证过滤器
users.MapPost("/", (User user, UserService service) =>
{
    var created = service.Create(user);
    return Results.Created($"/users/{created.Id}", created);
})
.AddFilter(async (context, next) =>
{
    var user = context.GetArgument<User>(0);

    // 验证逻辑
    if (string.IsNullOrEmpty(user.Name))
        return Results.BadRequest("用户名不能为空");

    if (string.IsNullOrEmpty(user.Email) || !user.Email.Contains('@'))
        return Results.BadRequest("邮箱格式无效");

    // 调用下一个处理器
    return await next(context);
});

// 缓存过滤器
app.MapGet("/cached-data", () => new { timestamp = DateTime.UtcNow, data = "缓存的数据" })
.AddFilter(async (context, next) =>
{
    var cacheKey = $"cache:{context.HttpContext.Request.Path}";
    var cache = context.HttpContext.RequestServices.GetRequiredService<IMemoryCache>();

    if (cache.TryGetValue(cacheKey, out IResult? cached) && cached is not null)
    {
        return cached;
    }

    var result = await next(context);

    if (result is IValueHttpResult { Value: not null })
    {
        cache.Set(cacheKey, result, TimeSpan.FromMinutes(5));
    }

    return result;
});

// 异常处理过滤器
app.MapGet("/error-test/{n}", (int n) =>
{
    if (n < 0)
        throw new ArgumentException("n 不能为负数");

    return Results.Ok(new { value = 100 / n });
})
.AddFilter(async (context, next) =>
{
    try
    {
        return await next(context);
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "服务器内部错误",
            detail: ex.Message,
            statusCode: 500);
    }
});

app.Run();

// ... 用户相关端点
var users = app.MapGroup("/users").WithTags("用户");
users.MapGet("/", () => "所有用户");
```

### 6.4 自定义参数绑定

对于复杂参数绑定需求，可以实现 `IBindableFromHttpContext<T>` 接口（.NET 7+）：

```csharp
// 自定义绑定类型：分页参数
public class PaginationParams : IBindableFromHttpContext<PaginationParams>
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string SortBy { get; set; } = "Id";
    public bool Descending { get; set; } = false;

    public static ValueTask<PaginationParams?> BindAsync(HttpContext context, ParameterInfo parameter)
    {
        var page = int.TryParse(context.Request.Query["page"], out var p) ? p : 1;
        var pageSize = int.TryParse(context.Request.Query["size"], out var s) ? s : 10;
        var sortBy = context.Request.Query["sort"].ToString();
        if (string.IsNullOrEmpty(sortBy)) sortBy = "Id";
        var desc = bool.TryParse(context.Request.Query["desc"], out var d) && d;

        return ValueTask.FromResult<PaginationParams?>(new PaginationParams
        {
            Page = Math.Max(1, page),
            PageSize = Math.Clamp(pageSize, 1, 100),
            SortBy = sortBy,
            Descending = desc
        });
    }
}

// 使用
app.MapGet("/users", (PaginationParams pagination, UserService service) =>
{
    var allUsers = service.GetAll();
    var sorted = pagination.Descending
        ? allUsers.OrderByDescending(u => u.GetType().GetProperty(pagination.SortBy)?.GetValue(u))
        : allUsers.OrderBy(u => u.GetType().GetProperty(pagination.SortBy)?.GetValue(u));

    var paged = sorted
        .Skip((pagination.Page - 1) * pagination.PageSize)
        .Take(pagination.PageSize);

    return Results.Ok(new
    {
        data = paged,
        page = pagination.Page,
        size = pagination.PageSize,
        total = allUsers.Count
    });
});

// 调用示例：/users?page=2&size=20&sort=Name&desc=true
```

### 6.5 集成认证授权

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 配置 JWT 认证
var key = Encoding.UTF8.GetBytes("YourSuperSecretKey-At-Least-32-Characters-Long!");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "MyApp",
            ValidAudience = "MyAppUsers",
            IssuerSigningKey = new SymmetricSecurityKey(key)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
    options.AddPolicy("UserOrAdmin", policy => policy.RequireRole("User", "Admin"));
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();
builder.Services.AddSingleton<IUserService, UserService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseAuthentication();
app.UseAuthorization();

// 登录端点：生成 JWT
app.MapPost("/login", (LoginRequest request, IUserService userService) =>
{
    var user = userService.Authenticate(request.Username, request.Password);
    if (user is null)
        return Results.Unauthorized();

    var claims = new[]
    {
        new Claim(ClaimTypes.Name, user.Username),
        new Claim(ClaimTypes.Role, user.Role),
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())
    };

    var token = new JwtSecurityToken(
        issuer: "MyApp",
        audience: "MyAppUsers",
        claims: claims,
        expires: DateTime.UtcNow.AddHours(1),
        signingCredentials: new SigningCredentials(
            new SymmetricSecurityKey(key),
            SecurityAlgorithms.HmacSha256)
    );

    return Results.Ok(new
    {
        token = new JwtSecurityTokenHandler().WriteToken(token),
        expires = token.ValidTo
    });
})
.WithTags("认证")
.AllowAnonymous();

// 受保护的端点：需要登录
app.MapGet("/profile", (HttpContext context) =>
{
    var username = context.User.Identity?.Name;
    return Results.Ok(new { username, claims = context.User.Claims.Select(c => new { c.Type, c.Value }) });
})
.RequireAuthorization()
.WithTags("用户");

// 需要管理员权限的端点
app.MapGet("/admin/dashboard", () => "管理员面板")
.RequireAuthorization("AdminOnly")
.WithTags("管理");

app.Run();

public record LoginRequest(string Username, string Password);
```

### 6.6 全局异常处理

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// 全局异常处理中间件
app.UseExceptionHandler(exceptionBuilder =>
{
    exceptionBuilder.Run(async context =>
    {
        var exceptionHandler = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        var exception = exceptionHandler?.Error;

        context.Response.StatusCode = exception switch
        {
            ArgumentException => StatusCodes.Status400BadRequest,
            UnauthorizedAccessException => StatusCodes.Status401Unauthorized,
            KeyNotFoundException => StatusCodes.Status404NotFound,
            InvalidOperationException => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status500InternalServerError
        };

        var problem = new ProblemDetails
        {
            Title = exception?.GetType().Name,
            Detail = exception?.Message,
            Status = context.Response.StatusCode,
            Instance = context.Request.Path
        };

        await context.Response.WriteAsJsonAsync(problem);
    });
});

// 测试异常的端点
app.MapGet("/test/{type}", (string type) =>
{
    return type switch
    {
        "argument" => throw new ArgumentException("参数错误示例"),
        "unauthorized" => throw new UnauthorizedAccessException("未授权示例"),
        "notfound" => throw new KeyNotFoundException("资源不存在示例"),
        "conflict" => throw new InvalidOperationException("冲突示例"),
        "server" => throw new Exception("服务器错误示例"),
        _ => Results.Ok("没有异常")
    };
})
.WithTags("测试");

app.Run();

public class ProblemDetails
{
    public string Title { get; set; } = "";
    public string? Detail { get; set; }
    public int Status { get; set; }
    public string Instance { get; set; } = "";
}
```

## 七、进阶用法

### 7.1 文件上传与下载

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// 文件上传（单文件）
app.MapPost("/upload", async (IFormFile file) =>
{
    if (file.Length == 0)
        return Results.BadRequest("文件为空");

    var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
    Directory.CreateDirectory(uploadsDir);

    var filePath = Path.Combine(uploadsDir, file.FileName);
    using var stream = File.Create(filePath);
    await file.CopyToAsync(stream);

    return Results.Ok(new
    {
        fileName = file.FileName,
        size = file.Length,
        contentType = file.ContentType
    });
})
.WithTags("文件")
.DisableAntiforgery();

// 文件上传（多文件）
app.MapPost("/uploads", async (IFormFileCollection files) =>
{
    var results = new List<object>();
    var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
    Directory.CreateDirectory(uploadsDir);

    foreach (var file in files)
    {
        if (file.Length > 0)
        {
            var filePath = Path.Combine(uploadsDir, file.FileName);
            using var stream = File.Create(filePath);
            await file.CopyToAsync(stream);

            results.Add(new { fileName = file.FileName, size = file.Length });
        }
    }

    return Results.Ok(new { count = results.Count, files = results });
})
.WithTags("文件")
.DisableAntiforgery();

// 文件下载
app.MapGet("/download/{fileName}", (string fileName) =>
{
    var filePath = Path.Combine(Directory.GetCurrentDirectory(), "uploads", fileName);

    if (!File.Exists(filePath))
        return Results.NotFound($"文件 {fileName} 不存在");

    var bytes = File.ReadAllBytes(filePath);
    var contentType = "application/octet-stream";
    return Results.File(bytes, contentType, fileName);
})
.WithTags("文件");

app.Run();
```

### 7.2 SSE（Server-Sent Events）流式响应

```csharp
app.MapGet("/stream", async (HttpContext context) =>
{
    context.Response.ContentType = "text/event-stream";
    context.Response.Headers["Cache-Control"] = "no-cache";
    context.Response.Headers["Connection"] = "keep-alive";

    for (int i = 0; i < 10; i++)
    {
        var message = $"data: {{\"count\":{i},\"time\":\"{DateTime.UtcNow}\"}}\n\n";
        await context.Response.WriteAsync(message);
        await context.Response.Body.FlushAsync();
        await Task.Delay(1000);
    }
})
.WithTags("流式");
```

### 7.3 WebSocket 支持

```csharp
app.MapGet("/ws", async (HttpContext context) =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = 400;
        return;
    }

    using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
    var buffer = new byte[1024];

    while (webSocket.State == WebSocketState.Open)
    {
        var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);

        if (result.MessageType == WebSocketMessageType.Close)
        {
            await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "关闭", CancellationToken.None);
            break;
        }

        var message = System.Text.Encoding.UTF8.GetString(buffer, 0, result.Count);
        var response = System.Text.Encoding.UTF8.GetBytes($"Echo: {message}");
        await webSocket.SendAsync(new ArraySegment<byte>(response),
            WebSocketMessageType.Text, true, CancellationToken.None);
    }
})
.WithTags("WebSocket");
```

### 7.4 使用 `[AsParameters]` 简化复杂参数（.NET 8+）

```csharp
// 不使用 AsParameters：参数列表很长
app.MapGet("/search", (
    string keyword,
    int page,
    int size,
    string sortBy,
    bool descending,
    string? category,
    decimal? minPrice,
    decimal? maxPrice,
    IUserService service,
    ILogger<Program> logger) =>
{
    // ...
    return Results.Ok();
});

// 使用 AsParameters：将参数封装到结构体
public struct SearchRequest
{
    public required string Keyword { get; set; }
    public int Page { get; set; } = 1;
    public int Size { get; set; } = 10;
    public string SortBy { get; set; } = "Id";
    public bool Descending { get; set; } = false;
    public string? Category { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
}

app.MapGet("/search", ([AsParameters] SearchRequest request, IUserService service) =>
{
    return Results.Ok(request);
});
```

`[AsParameters]` 是 .NET 8 引入的特性，可以将多个简单参数封装为一个结构体，同时保持从查询字符串绑定。这使得复杂查询参数的处理更整洁，也更适合 AOT 场景（源生成器可以生成更高效的绑定代码）。

### 7.5 端点元数据与策略

```csharp
// 端点元数据 API
app.MapGet("/users", () => "所有用户")
    .WithTags("用户管理")                  // OpenAPI 分组
    .WithName("GetAllUsers")               // 端点名（用于链接生成）
    .WithSummary("获取所有用户")             // OpenAPI 摘要
    .WithDescription("返回系统中所有用户的列表") // OpenAPI 描述
    .WithGroupName("v1")                   // API 版本组
    .WithOpenApi(op =>
    {
        op.Summary = "获取所有用户";
        op.Description = "返回系统中所有用户的列表，支持分页";
        return op;
    })
    .RequireAuthorization("UserOrAdmin")   // 认证策略
    .Produces<List<User>>(StatusCodes.Status200OK)
    .Produces(StatusCodes.Status401Unauthorized)
    .Produces(StatusCodes.Status403Forbidden)
    .WithMetadata(new CacheAttribute { Duration = 60 });  // 自定义元数据

// 自定义元数据
public class CacheAttribute : Attribute
{
    public int Duration { get; set; }
}

// 读取元数据（在过滤器或中间件中）
app.Use(async (context, next) =>
{
    var endpoint = context.GetEndpoint();
    var cacheAttr = endpoint?.Metadata.GetMetadata<CacheAttribute>();

    if (cacheAttr is not null)
    {
        context.Response.Headers["Cache-Control"] = $"public, max-age={cacheAttr.Duration}";
    }

    await next(context);
});
```

### 7.6 API 版本控制

```csharp
// 简单的 URL 版本控制
var v1 = app.MapGroup("/api/v1").WithTags("V1");
var v2 = app.MapGroup("/api/v2").WithTags("V2");

v1.MapGet("/users", () => "V1 用户列表");
v2.MapGet("/users", () => new { version = "v2", users = new[] { new { id = 1, name = "张三" } } });

// 版本化路由策略
v1.MapGet("/users/{id}", (int id) => $"V1 用户 {id}");
v2.MapGet("/users/{id}", (int id) => new { version = "v2", user = new { id, name = $"用户{id}" } });

// 弃用标记
v1.MapGet("/legacy", () => "旧接口")
    .WithOpenApi(op =>
    {
        op.Deprecated = true;
        op.Summary = "已弃用，请使用 V2 接口";
        return op;
    });
```

## 八、性能分析

### 8.1 Minimal API vs Controller 性能对比

Minimal API 与 Controller 模式基于相同的 ASP.NET Core 运行时，理论性能相当。但在实际场景中，Minimal API 由于少了 Controller 激活（Controller Activation）、过滤器管道（Filter Pipeline）等开销，在简单端点上略快。

| 场景 | Minimal API | Controller | 备注 |
|------|-------------|------------|------|
| 简单字符串返回 | ~0.05ms | ~0.08ms | Minimal API 略快 |
| JSON 序列化 | ~0.10ms | ~0.12ms | 差异很小 |
| 复杂业务逻辑 | ~5ms | ~5ms | 业务逻辑占主导 |
| 大量 DI 注入 | ~0.15ms | ~0.18ms | 差异可忽略 |

注意：以上数值为典型场景的估算，实际性能取决于具体实现。在大多数业务场景中，业务逻辑（数据库查询、外部 API 调用）的开销远大于框架本身。

### 8.2 性能优化技巧

**1. 使用静态 Lambda**

```csharp
// 不推荐：捕获 this，无法静态化
app.MapGet("/data", () => GetData());

// 推荐：标记为 static，避免闭包
app.MapGet("/data", static () => "Hello");

// 推荐：捕获服务时使用服务参数
app.MapGet("/users", static (IUserService service) => service.GetAll());
```

**2. 使用 `TypedResults` 替代 `Results`**

```csharp
// TypedResults 在编译时已知类型，避免运行时类型检查
app.MapGet("/users/{id}", (int id) =>
{
    return id > 0
        ? TypedResults.Ok(new User(id, "张三"))
        : TypedResults.BadRequest("ID 无效");
});
```

**3. 避免同步阻塞**

```csharp
// 不推荐：同步阻塞
app.MapGet("/users", (IUserService service) => service.GetAll());

// 推荐：异步处理
app.MapGet("/users", async (IUserService service) =>
{
    return await service.GetAllAsync();
});
```

**4. 使用 `CancellationToken`**

```csharp
// 接收 CancellationToken 以支持请求取消
app.MapGet("/long-running", async (CancellationToken ct) =>
{
    await Task.Delay(TimeSpan.FromSeconds(30), ct);
    return Results.Ok("完成");
});
```

### 8.3 性能基准测试

使用 BenchmarkDotNet 进行基准测试：

```csharp
// 简单的端点性能测试
[MemoryDiagnoser]
public class EndpointBenchmarks
{
    private readonly HttpClient _client;

    public EndpointBenchmarks()
    {
        var factory = new WebApplicationFactory<Program>();
        _client = factory.CreateClient();
    }

    [Benchmark]
    public async Task<string> GetHelloWorld()
    {
        var response = await _client.GetAsync("/");
        return await response.Content.ReadAsStringAsync();
    }

    [Benchmark]
    public async Task<string> GetJson()
    {
        var response = await _client.GetAsync("/json");
        return await response.Content.ReadAsStringAsync();
    }
}
```

## 九、最佳实践

### 9.1 使用路由组组织大型 API

对于超过 10 个端点的应用，应该使用路由组组织：

```csharp
// 推荐：按业务模块分组
var users = app.MapGroup("/users").WithTags("用户");
var products = app.MapGroup("/products").WithTags("产品");
var orders = app.MapGroup("/orders").WithTags("订单");

// 将每个模块的端点定义提取到扩展方法
app.MapUserEndpoints();
app.MapProductEndpoints();
app.MapOrderEndpoints();

// 扩展方法定义
public static class UserEndpoints
{
    public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var users = app.MapGroup("/users").WithTags("用户");

        users.MapGet("/", GetAllUsers);
        users.MapGet("/{id}", GetUserById);
        users.MapPost("/", CreateUser);
        users.MapPut("/{id}", UpdateUser);
        users.MapDelete("/{id}", DeleteUser);

        return app;
    }

    private static IResult GetAllUsers(IUserService service) => Results.Ok(service.GetAll());
    private static IResult GetUserById(int id, IUserService service) =>
        service.GetById(id) is { } user ? Results.Ok(user) : Results.NotFound();
    // ...
}
```

### 9.2 统一响应格式

```csharp
// 统一响应包装
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Error { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public static class ApiResponseExtensions
{
    public static IResult Ok<T>(T data) =>
        Results.Ok(new ApiResponse<T> { Success = true, Data = data });

    public static IResult Fail(string error) =>
        Results.Ok(new ApiResponse<object> { Success = false, Error = error });
}

// 使用
app.MapGet("/users/{id}", (int id, IUserService service) =>
{
    var user = service.GetById(id);
    return user is not null
        ? ApiResponseExtensions.Ok(user)
        : ApiResponseExtensions.Fail("用户不存在");
});
```

### 9.3 使用验证库（如 FluentValidation）

```csharp
using FluentValidation;

// 验证器
public class UserValidator : AbstractValidator<User>
{
    public UserValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(100);
        RuleFor(x => x.Age).InclusiveBetween(0, 150);
    }
}

// 注册验证器
builder.Services.AddScoped<UserValidator>();

// 验证过滤器
public static class ValidationExtensions
{
    public static RouteHandlerBuilder WithValidation<T>(this RouteHandlerBuilder builder)
        where T : class
    {
        return builder.AddFilter(async (context, next) =>
        {
            var arg = context.GetArgument<T>(0);
            if (arg is null)
                return Results.BadRequest("请求体为空");

            var validator = context.HttpContext.RequestServices.GetRequiredService<IValidator<T>>();
            var result = await validator.ValidateAsync(arg);

            if (!result.IsValid)
            {
                return Results.BadRequest(new
                {
                    errors = result.Errors.Select(e => new { e.PropertyName, e.ErrorMessage })
                });
            }

            return await next(context);
        });
    }
}

// 使用
app.MapPost("/users", (User user, IUserService service) =>
{
    var created = service.Create(user);
    return Results.Created($"/users/{created.Id}", created);
}).WithValidation<User>();
```

### 9.4 使用 `ProblemDetails` 标准化错误响应

```csharp
// 注册 ProblemDetails 服务
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = ctx =>
    {
        ctx.ProblemDetails.Extensions["traceId"] = ctx.HttpContext.TraceIdentifier;
        ctx.ProblemDetails.Extensions["timestamp"] = DateTime.UtcNow;
    };
});

// 使用
app.MapGet("/users/{id}", (int id) =>
{
    if (id <= 0)
        return Results.Problem(
            title: "无效的 ID",
            detail: "ID 必须是正整数",
            statusCode: 400);

    return Results.Ok(new { id, name = "张三" });
});
```

### 9.5 配置 JSON 序列化选项

```csharp
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.WriteIndented = false;
    options.SerializerOptions.DefaultIgnoreCondition =
        System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    options.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});
```

### 9.6 健康检查与可观测性

```csharp
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>()
    .AddUrlGroup(new Uri("https://api.external.com/health"), "外部 API");

builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing.AddAspNetCoreInstrumentation());

var app = builder.Build();

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false  // 只检查应用是否存活
});
```

## 十、常见陷阱

### 10.1 参数绑定顺序陷阱

Minimal API 的参数绑定优先级顺序：路由参数 → 查询字符串 → 请求体 → DI 服务。如果同名参数同时出现在多个源，可能产生意外行为：

```csharp
// 陷阱：id 同时是路由参数与查询参数
app.MapGet("/users/{id}", (int id) => $"User {id}");

// 调用 /users/1?id=2 时，id 是 1（路由优先）

// 陷阱：复杂类型默认从请求体绑定，但 GET 请求通常没有请求体
app.MapGet("/users", (UserFilter filter) => ...);
// 这里 filter 会尝试从请求体绑定，GET 请求可能失败

// 正确：显式指定来源
app.MapGet("/users", ([FromQuery] UserFilter filter) => ...);
```

### 10.2 异步返回类型陷阱

```csharp
// 陷阱：返回 Task<IResult> 时，IResult 不会被自动处理
app.MapGet("/async", async () =>
{
    await Task.Delay(100);
    return Results.Ok("done");  // 这个 IResult 会被正确处理
});

// 陷阱：直接返回对象但忘记异步包装
app.MapGet("/data", async () =>
{
    await Task.Delay(100);
    return new { foo = "bar" };  // 这会被 JSON 序列化
});

// 推荐：明确使用 Task<IResult> 或 Task<T>
app.MapGet("/data", async () =>
{
    await Task.Delay(100);
    return Results.Ok(new { foo = "bar" });
});
```

### 10.3 DI 作用域陷阱

```csharp
// 陷阱：在 Singleton 服务中注入 Scoped 服务
builder.Services.AddSingleton<IMyService, MyService>();  // MyService 依赖 AppDbContext（Scoped）
// 启动时抛出异常：Cannot consume scoped service from singleton

// 正确：作用域匹配
builder.Services.AddScoped<IMyService, MyService>();

// 或使用 IServiceScopeFactory
public class MySingletonService
{
    private readonly IServiceScopeFactory _scopeFactory;

    public MySingletonService(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public void DoWork()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        // 使用 db
    }
}
```

### 10.4 防伪标记（Antiforgery）陷阱

ASP.NET Core 默认要求 POST/PUT/DELETE 请求携带防伪标记（Antiforgery Token）。Minimal API 在处理表单提交时会触发此检查：

```csharp
// 陷阱：表单提交触发防伪检查失败
app.MapPost("/form", (FormModel model) => ...);

// 解决方案一：禁用防伪（不推荐用于生产）
app.MapPost("/form", (FormModel model) => ...).DisableAntiforgery();

// 解决方案二：在表单中包含防伪标记
// <form asp-antiforgery="true">...</form>

// 解决方案三：使用 JSON 请求体（不触发防伪检查）
app.MapPost("/api", (JsonModel model) => ...);
```

### 10.5 中间件顺序陷阱

中间件的添加顺序至关重要，错误的顺序可能导致认证、授权、CORS 等功能失效：

```csharp
// 错误顺序：UseAuthentication 在 UseRouting 之后，无法识别端点所需的认证策略
app.UseRouting();
app.UseAuthentication();  // 太晚
app.UseAuthorization();
app.MapGet("/protected", () => "需要认证").RequireAuthorization();

// 正确顺序
app.UseExceptionHandler();
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();           // 路由匹配
app.UseCors();              // CORS（在路由后、端点前）
app.UseAuthentication();    // 认证
app.UseAuthorization();     // 授权
// 端点定义
app.MapGet("/protected", () => "需要认证").RequireAuthorization();
```

### 10.6 大文件上传陷阱

```csharp
// 陷阱：默认请求体大小限制为 28MB
app.MapPost("/upload", (IFormFile file) => ...);

// 解决方案：在 Program.cs 中配置 Kestrel
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 100_000_000;  // 100MB
});

// 或针对单个端点配置
app.MapPost("/upload", (IFormFile file) => ...)
    .WithMetadata(new RequestSizeLimitAttribute(100_000_000));
```

### 10.7 JSON 序列化陷阱

```csharp
// 陷阱：循环引用导致序列化失败
public class User
{
    public int Id { get; set; }
    public List<Order> Orders { get; set; } = new();
}

public class Order
{
    public int Id { get; set; }
    public User User { get; set; } = null!;  // 循环引用
}

// 解决方案一：使用 [JsonIgnore]
public class Order
{
    public int Id { get; set; }
    [JsonIgnore]
    public User User { get; set; } = null!;
}

// 解决方案二：配置 ReferenceHandler
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
});
```

## 十一、对比分析

### 11.1 Minimal API vs Controller 模式

| 维度 | Minimal API | Controller 模式 |
|------|-------------|----------------|
| 代码量 | 少（几行起） | 多（类 + 特性 + 方法） |
| 学习曲线 | 平缓 | 陡峭 |
| 适合场景 | 微服务、简单 API、原型 | 复杂业务、大型应用 |
| 模型绑定 | 自动 | 特性驱动 |
| 过滤器 | 端点过滤器 | Action 过滤器 |
| 继承与复用 | 弱 | 强（继承 ControllerBase） |
| OpenAPI | 自动生成 | 需要配置 |
| AOT 兼容 | 优秀（.NET 8+） | 较差 |
| 单元测试 | 容易（函数） | 容易（类） |
| 团队协作 | 适合小型团队 | 适合大型团队 |

**选择建议**：

- **选择 Minimal API**：
  - 微服务、单页应用后端
  - 快速原型开发
  - API 端点数量少（< 20）
  - 需要 Native AOT 部署
  - 个人项目或小团队

- **选择 Controller**：
  - 大型企业应用
  - 复杂的业务逻辑与大量复用
  - 需要继承与多态
  - 团队熟悉 MVC 模式
  - 需要复杂的过滤器管道

### 11.2 Minimal API vs FastAPI（Python）

| 维度 | Minimal API | FastAPI |
|------|-------------|---------|
| 语言 | C#（强类型） | Python（动态类型） |
| 性能 | 高（编译型） | 中等（解释型） |
| 异步支持 | 原生 async/await | 原生 async/await |
| 自动文档 | 内置 OpenAPI | 内置 Swagger |
| 类型注解 | 编译时检查 | 运行时验证 |
| 部署 | 跨平台（Kestrel） | 需要 ASGI 服务器 |
| 生态 | .NET 生态 | Python 生态 |

### 11.3 Minimal API vs Express（Node.js）

| 维度 | Minimal API | Express |
|------|-------------|---------|
| 语言 | C# | JavaScript/TypeScript |
| 性能 | 高 | 中等 |
| 类型安全 | 强 | 弱（TS 可改善） |
| 异步模型 | Task/async | Promise/async |
| 中间件 | 内置管道 | 内置管道 |
| 包生态 | NuGet | npm |
| 部署 | 跨平台 | Node.js 运行时 |

## 十二、总结

Minimal API 是 .NET 6+ 时代的轻量级 Web API 构建模式，它通过顶层语句、Lambda 表达式、扩展方法等现代 C# 特性，将 Web API 开发压缩到最本质的"路由 + 处理函数"模型。它不是 Controller 模式的替代品，而是为不同场景提供了合适的选择：简单 API 用 Minimal API，复杂业务用 Controller。

### 12.1 核心要点回顾

1. **WebApplication 是核心**：创建 Builder、注册服务、构建 Application、配置中间件、定义端点、启动应用。

2. **端点是基本单元**：`MapGet/MapPost/MapPut/MapDelete` 定义 HTTP 方法与路由模式的组合。

3. **参数绑定自动化**：路由参数、查询字符串、请求体、DI 服务自动绑定，可用特性显式指定来源。

4. **路由组组织大型 API**：`MapGroup` 添加统一前缀与元数据，避免重复。

5. **端点过滤器实现横切关注点**：日志、验证、缓存、异常处理等。

6. **IResult 与 TypedResults**：`TypedResults` 提供强类型返回，便于 OpenAPI 生成。

7. **AOT 兼容性**：Minimal API + 源生成器是 Native AOT 部署的最佳选择。

### 12.2 技术演进趋势

Minimal API 反映了 .NET 平台的几个趋势：

- **极简化**：减少样板代码，聚焦业务逻辑。
- **AOT 友好**：源生成器替代反射，提升启动速度与内存占用。
- **统一编程模型**：Minimal API 与 Controller 共享相同的运行时与中间件。
- **OpenAPI 一等公民**：.NET 9 内置 OpenAPI 文档生成，不再依赖第三方包。

### 12.3 学习建议

1. **从简单端点开始**：先用 `MapGet`、`MapPost` 实现简单 CRUD，再逐步添加认证、过滤器等高级特性。

2. **理解中间件管道**：Minimal API 不是"无中间件"，而是基于 ASP.NET Core 完整的中间件管道。

3. **掌握 DI 与配置**：`WebApplicationBuilder` 提供的 `Services` 与 `Configuration` 是企业级应用的基础。

4. **关注性能与 AOT**：尝试使用 Native AOT 发布 Minimal API 应用，了解其优势与限制。

5. **实践项目**：实现一个完整的 RESTful API（如博客系统、待办事项、电商后台），是掌握 Minimal API 的最佳方式。

### 12.4 扩展阅读

- 官方文档：[Minimal APIs in ASP.NET Core](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis)
- 教程：[Tutorial: Create a minimal API with ASP.NET Core](https://learn.microsoft.com/aspnet/core/tutorials/min-web-api)
- 性能：[ASP.NET Core performance best practices](https://learn.microsoft.com/aspnet/core/performance/performance-best-practices)
- 源码：[aspnetcore GitHub repository](https://github.com/dotnet/aspnetcore)
- 示例：[Minimal API samples](https://github.com/dotnet/aspnetcore/tree/main/src/DefaultBuilder/samples)

Minimal API 是现代 .NET Web 开发的入门首选。掌握它，你不仅能快速构建生产级 API，更能深入理解 ASP.NET Core 的中间件管道、端点路由、DI 系统等核心机制。无论你是初学者还是有经验的 .NET 开发者，Minimal API 都值得纳入你的工具箱。
