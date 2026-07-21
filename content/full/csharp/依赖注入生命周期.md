---
order: 106
title: 依赖注入生命周期
module: csharp
category: 'dev-lang'
difficulty: advanced
description: 'ASP.NET Core依赖注入生命周期详解：Scoped、Transient、Singleton。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'csharp/Entity-Framework-Core迁移与优化'
  - 'csharp/ASP-NET-Core中间件管道'
  - csharp/GC代机制
  - csharp/值类型与引用类型
prerequisites:
  - csharp/概述与环境配置
---

## 一、学习目标

本文以 MIT 6.170 *Software Studio*、Stanford CS193k *Distributed Systems*、CMU 17-447 *Software Engineering for Startups* 的依赖注入与服务生命周期教学水准为参照，对 ASP.NET Core 的 DI 容器与三种服务生命周期进行系统性、形式化与工程化的深度剖析。阅读完毕后，读者应能达成以下 Bloom 认知层级目标：

| 层级 | 目标描述 | 具体可观测行为 |
| ---- | -------- | -------------- |
| Remember（记忆） | 复述 Singleton、Scoped、Transient 三种生命周期的创建时机与共享范围 | 在不查文档的情况下画出请求管线中的实例创建与销毁时序图 |
| Understand（理解） | 解释 DI 容器的根容器、作用域（scope）、对象图（object graph）构造过程 | 说明 `IServiceProvider.GetService` 与 `CreateScope` 的差异 |
| Apply（应用） | 在企业级代码中正确选择生命周期、注册服务、注入依赖 | 为一个含缓存、数据库、HTTP 客户端的应用配置完整 DI |
| Analyze（分析） | 分析 Captive Dependency、并发竞态、内存泄漏的成因与解决方法 | 诊断一个因 Singleton 持有 Scoped 服务导致的请求间数据污染 bug |
| Evaluate（评价） | 评估不同注册方式（Add/TryAdd/Factory/Scrutor）的取舍 | 在手写工厂与自动扫描注册之间做出有依据的选择 |
| Create（创造） | 设计自定义 DI 扩展、Keyed Services、装饰器链、拦截器 | 实现一个基于 Castle DynamicProxy 的 AOP 日志与缓存装饰器 |

本文假设读者已掌握 C# 基础语法、`async/await`、`IDisposable`、泛型、`ILogger<T>`。

## 二、历史动机与发展脉络

### 2.1 问题背景：控制反转与依赖耦合

在 ASP.NET Core 之前，.NET 生态的依赖注入一片混乱：

- ASP.NET MVC 5 / Web API 2 依赖第三方容器（Ninject、Autofac、Unity、StructureMap）；
- 不同容器配置 API 不兼容，团队迁移成本高；
- 没有统一的生命周期抽象，每个容器自定义"瞬态/单例/每请求"语义；
- 测试困难：`new` 直接耦合具体实现，单元测试需大量 mock。

2016 年，ASP.NET Core 1.0 逆向思考：**DI 容器应该是框架的一部分**，而非可选组件。Microsoft.Extensions.DependencyInjection（简称 MS.DI）由此诞生。它提供：

- 统一的 `IServiceCollection` 注册 API；
- 统一的生命周期抽象（Singleton/Scoped/Transient）；
- 与 ASP.NET Core 管线深度集成（每请求自动创建 scope）；
- 最小依赖、零配置开箱即用。

### 2.2 MS.DI 的设计哲学

MS.DI 有意设计得**功能克制**：

- **不提供属性注入**：仅支持构造器注入，强制显式依赖；
- **不提供自动循环依赖检测**：在运行时抛 `InvalidOperationException`；
- **不提供 AOP 拦截**：通过装饰器模式或第三方库（Autofac、Scrutor）实现；
- **不提供高级解析 API**：仅 `GetService` / `GetRequiredService` / `IEnumerable<T>`。

这种克制是 Anders Hejlsberg 团队"简单优于复杂"哲学的体现。MS.DI 是"够用的最小集"，复杂场景下替换为 Autofac、Grace、Lamar。

### 2.3 演进时间线

| 版本 | 年份 | 关键变化 |
| ---- | ---- | -------- |
| .NET Framework 4.x | 2010-2015 | 依赖第三方（Ninject/Autofac） |
| ASP.NET Core 1.0 / MS.DI 1.0 | 2016 | 内置 DI 容器；三种生命周期 |
| ASP.NET Core 2.0 | 2017 | `IServiceProvider` 异步释放改进 |
| ASP.NET Core 3.0 | 2019 | `Host` 抽象统一 Web 与 Worker；`IHostedService` |
| .NET 5 / ASP.NET Core 5 | 2020 | 顶层 `Program.cs`；性能优化 |
| .NET 6 / ASP.NET Core 6 | 2021 | 隐式 `using`；编译期 DI 验证（社区工具） |
| .NET 7 / MS.DI 7 | 2022 | `KeyedService` 引入（预览） |
| .NET 8 / MS.DI 8 | 2023 | Keyed Services 正式发布；`IServiceProviderIsKeyedService` |
| .NET 9 / MS.DI 9 | 2024 | 性能优化、源生成器支持、`IServiceProviderIsService` 增强 |

### 2.4 生态系统

| 容器 | 特点 | 适用场景 |
| ---- | ---- | -------- |
| MS.DI | 内置、极简、快速 | 95% 的 ASP.NET Core 项目 |
| Autofac | 模块化、AOP、属性注入 | 大型企业项目 |
| Lamar |速度快、模块化 | 性能敏感场景 |
| Scrutor | MS.DI 扩展，自动扫描 | 减少样板代码 |
| Grace | 高性能、AOP | 极致性能 |
| Ninject | 老牌、社区大 | 历史项目维护 |
| Castle Windsor | AOP、拦截器 | 复杂拦截场景 |

## 三、形式化定义

### 3.1 DI 容器的代数语义

设服务集合 $\mathcal{S} = \{s_1, s_2, \ldots, s_n\}$，每个服务 $s_i = (T_i, I_i, L_i, F_i)$，其中：

- $T_i$：实现类型；
- $I_i$：服务接口（可为 $T_i$ 本身）；
- $L_i \in \{\text{Singleton}, \text{Scoped}, \text{Transient}\}$：生命周期；
- $F_i$：工厂函数 $F_i : \text{IServiceProvider} \to I_i$。

容器 $C$ 可视为从接口到实例的**多态函数**：

$$
C : \text{IServiceProvider} \times \text{Type} \to \text{object}
$$

解析一个服务 $I$ 在作用域 $\sigma$ 下的过程：

$$
\text{Resolve}(C, \sigma, I) = \begin{cases}
\text{cached}_\sigma(I) & \text{if } L_I \in \{\text{Singleton}, \text{Scoped}\} \land \exists \text{cached} \\
F_I(\sigma.\text{Provider}) & \text{if } L_I = \text{Transient} \\
\text{cache}_\sigma(I, F_I(\sigma.\text{Provider})) & \text{otherwise}
\end{cases}
$$

### 3.2 生命周期形式化

设应用生命周期为 $\tau_{\text{app}}$，请求生命周期为 $\tau_{\text{req}}$，单次解析为 $\tau_{\text{res}}$。

- **Singleton**：实例 $x$ 的生命周期 $L(x) = \tau_{\text{app}}$；
- **Scoped**：实例 $x$ 的生命周期 $L(x) = \tau_{\text{req}}$（每 scope）；
- **Transient**：实例 $x$ 的生命周期 $L(x) = \tau_{\text{res}}$（每次解析）。

### 3.3 对象图与依赖方向

服务间的依赖关系构成有向图 $G = (V, E)$，节点 $V$ 为服务，边 $E$ 为依赖。构造对象图时需满足**生命周期一致性约束**：

$$
\forall (s_i, s_j) \in E: L_i \leq L_j
$$

其中 $\text{Singleton} < \text{Scoped} < \text{Transient}$（短生命周期不能依赖长生命周期的"更短"者）。

实际规则：

- Singleton 可依赖 Singleton；
- Scoped 可依赖 Singleton、Scoped；
- Transient 可依赖任意。

违反此约束产生 **Captive Dependency**（囚禁依赖）。

### 3.4 作用域的形式化

作用域（scope）是一个独立的解析上下文，对应一个 `IServiceScope` 实例。形式化：

$$
\sigma = (\text{Provider}, \text{Cache}, \text{Parent})
$$

其中 `Cache` 为该作用域内的实例缓存，`Parent` 为父作用域（根容器的 scope 为根）。Singleton 缓存在根 scope；Scoped 缓存在当前 scope；Transient 不缓存。

## 四、理论推导与原理解析

### 4.1 对象图构造算法

解析服务 $I$ 时，容器递归构造对象图：

```
function Resolve(provider, I):
    descriptor = LookupDescriptor(I)
    if descriptor.Lifetime == Singleton and I in root_cache:
        return root_cache[I]
    if descriptor.Lifetime == Scoped and I in scope_cache:
        return scope_cache[I]

    # 构造对象图
    instance = descriptor.Factory(provider)

    # 缓存
    if descriptor.Lifetime == Singleton:
        root_cache[I] = instance
    elif descriptor.Lifetime == Scoped:
        scope_cache[I] = instance

    return instance
```

构造时间复杂度 $O(|V| + |E|)$（每个服务构造一次，每条依赖遍历一次）。

### 4.2 Captive Dependency 的形式化分析

设 $s_{\text{singleton}}$ 为 Singleton 服务，依赖 $s_{\text{scoped}}$：

- $s_{\text{singleton}}$ 在应用启动时构造一次；
- 构造时解析 $s_{\text{scoped}}$，此时所在 scope 为根 scope；
- 根 scope 的 Scoped 服务等价于 Singleton（不会被释放）；
- 后续所有请求共用此 Scoped 服务实例。

形式化：$\text{scope}(s_{\text{scoped}}) = \text{root} \implies L(s_{\text{scoped}}) \approx \tau_{\text{app}}$。

这是 Captive Dependency 的本质：**Scoped 服务的生命周期被 Singleton "囚禁"为 Singleton**。

### 4.3 并发安全分析

Singleton 实例被多个请求共享，需考虑线程安全：

- **无状态 Singleton**：天然线程安全；
- **可变状态 Singleton**：需加锁或使用并发原语；
- **Scoped 实例**：通常每请求一个实例，单线程内访问，无需锁；
- **Transient 实例**：每次解析都新建，但若被 Singleton 捕获则同样需考虑并发。

并发安全的形式化条件：设服务 $s$ 的可变状态为 $M_s$，访问操作集为 $O_s$：

$$
\text{ThreadSafe}(s) \iff \forall o \in O_s: \text{atomic}(o, M_s) \lor \text{locked}(o, M_s)
$$

### 4.4 性能模型

设单次对象图构造开销为 $c$，请求中解析 $k$ 次：

- **Singleton**：仅首次构造，后续命中缓存，$T \approx c$；
- **Scoped**：每请求构造一次，$T \approx c$；
- **Transient**：每次解析都构造，$T = k \cdot c$。

对于复杂对象图（深度 $d$），构造开销近似 $O(d)$。深度过大表明设计有问题（应重构为更扁平的依赖）。

### 4.5 释放策略

DI 容器对 `IDisposable` 服务的释放时机：

| 生命周期 | 释放时机 | 由谁释放 |
| ---- | ---- | ---- |
| Singleton | 应用关闭 | 根 `ServiceProvider` |
| Scoped | scope 释放（请求结束） | `IServiceScope` |
| Transient（从 scope 解析） | scope 释放 | `IServiceScope` |
| Transient（从根解析） | 应用关闭 | 根 `ServiceProvider` |

**关键陷阱**：从根容器解析 Transient + IDisposable 会造成内存泄漏，因为根容器跟踪所有它创建的 disposable 实例，直到应用关闭。

### 4.6 Keyed Services 形式化

.NET 8 引入 Keyed Services，使同一接口可注册多个命名实现：

```csharp
services.AddKeyedSingleton<ICache, RedisCache>("redis");
services.AddKeyedSingleton<ICache, MemoryCache>("memory");
```

形式化：

$$
\text{Resolve}(C, \sigma, I, k) = F_{(I, k)}(\sigma.\text{Provider})
$$

其中 $k$ 为 key。这使得解析从"按类型"扩展为"按类型 + key"。

## 五、代码示例（企业级 production-ready）

### 5.1 项目结构

```
FandexDILifetimeDemo/
├── FandexDILifetimeDemo.csproj
├── Program.cs
├── Services/
│   ├── ICacheService.cs
│   ├── RedisCacheService.cs
│   ├── MemoryCacheService.cs
│   ├── IUserService.cs
│   ├── UserService.cs
│   ├── IEmailSender.cs
│   ├── SmtpEmailSender.cs
│   ├── IOrderRepository.cs
│   └── OrderRepository.cs
├── Middleware/
│   ├── RequestContextMiddleware.cs
│   └── ExceptionHandlingMiddleware.cs
├── Decorators/
│   ├── LoggingDecorator.cs
│   └── CachingDecorator.cs
└── Extensions/
    └── ServiceCollectionExtensions.cs
```

### 5.2 csproj 配置（.NET 8 / C# 12）

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <LangVersion>12</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Scrutor" Version="4.2.2" />
    <PackageReference Include="BenchmarkDotNet" Version="0.13.12" />
    <PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="8.0.0" />
  </ItemGroup>

</Project>
```

### 5.3 服务接口与实现

```csharp
// Services/ICacheService.cs
namespace FandexDILifetimeDemo.Services;

/// <summary>
/// 缓存服务抽象。所有实现必须是线程安全的（Singleton 生命周期）。
/// </summary>
public interface ICacheService {
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default);
    Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default);
    Task RemoveAsync(string key, CancellationToken ct = default);
}

/// <summary>
/// 用户服务抽象。Scoped 生命周期，每请求新建。
/// </summary>
public interface IUserService {
    Task<User?> GetUserAsync(string userId, CancellationToken ct = default);
    Task<User> CreateUserAsync(string name, string email, CancellationToken ct = default);
}

/// <summary>
/// 邮件发送抽象。Transient 生命周期，无状态。
/// </summary>
public interface IEmailSender {
    Task SendAsync(string to, string subject, string body, CancellationToken ct = default);
}

/// <summary>
/// 订单仓储抽象。Scoped，依赖 DbContext。
/// </summary>
public interface IOrderRepository {
    Task<Order?> GetByIdAsync(string orderId, CancellationToken ct = default);
    Task SaveAsync(Order order, CancellationToken ct = default);
}

public record User(string Id, string Name, string Email, DateTime CreatedAt);
public record Order(string OrderId, string UserId, decimal Amount, DateTime CreatedAt);
```

```csharp
// Services/RedisCacheService.cs
namespace FandexDILifetimeDemo.Services;

/// <summary>
/// Redis 缓存实现。Singleton 生命周期。
/// 必须线程安全：使用 ConcurrentDictionary 与原子操作。
/// </summary>
public sealed class RedisCacheService : ICacheService {
    private readonly ConcurrentDictionary<string, (object Value, DateTime ExpireAt)> _cache = new();
    private readonly ILogger<RedisCacheService> _logger;

    public RedisCacheService(ILogger<RedisCacheService> logger) => _logger = logger;

    public Task<T?> GetAsync<T>(string key, CancellationToken ct = default) {
        if (_cache.TryGetValue(key, out var entry)) {
            if (entry.ExpireAt > DateTime.UtcNow) {
                _logger.LogDebug("缓存命中: {Key}", key);
                return Task.FromResult((T?)entry.Value);
            }
            _cache.TryRemove(key, out _);
        }
        return Task.FromResult<T?>(default);
    }

    public Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default) {
        var expireAt = expiry.HasValue
            ? DateTime.UtcNow.Add(expiry.Value)
            : DateTime.MaxValue;
        _cache[key] = (value!, expireAt);
        _logger.LogDebug("缓存写入: {Key} TTL={Expiry}", key, expiry);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key, CancellationToken ct = default) {
        _cache.TryRemove(key, out _);
        return Task.CompletedTask;
    }
}
```

```csharp
// Services/UserService.cs
namespace FandexDILifetimeDemo.Services;

/// <summary>
/// 用户服务实现。Scoped 生命周期。
/// 可安全持有 DbContext、ICacheService 引用。
/// </summary>
public sealed class UserService : IUserService {
    private readonly ICacheService _cache;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<UserService> _logger;

    public UserService(
        ICacheService cache,
        IEmailSender emailSender,
        ILogger<UserService> logger) {
        _cache = cache;
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task<User?> GetUserAsync(string userId, CancellationToken ct = default) {
        // 先查缓存
        var cached = await _cache.GetAsync<User>($"user:{userId}", ct);
        if (cached is not null) {
            _logger.LogDebug("用户 {UserId} 从缓存返回", userId);
            return cached;
        }

        // 模拟数据库查询
        var user = await LoadFromDatabaseAsync(userId, ct);
        if (user is not null) {
            await _cache.SetAsync($"user:{userId}", user, TimeSpan.FromMinutes(30), ct);
        }
        return user;
    }

    public async Task<User> CreateUserAsync(string name, string email, CancellationToken ct = default) {
        var user = new User(Guid.NewGuid().ToString(), name, email, DateTime.UtcNow);
        // 模拟保存到数据库
        await Task.Delay(50, ct);
        await _cache.SetAsync($"user:{user.Id}", user, TimeSpan.FromMinutes(30), ct);

        // 发送欢迎邮件
        await _emailSender.SendAsync(email, "欢迎", $"你好 {name}", ct);

        return user;
    }

    private async Task<User?> LoadFromDatabaseAsync(string userId, CancellationToken ct) {
        await Task.Delay(20, ct);
        return new User(userId, "示例用户", "user@example.com", DateTime.UtcNow);
    }
}
```

```csharp
// Services/SmtpEmailSender.cs
namespace FandexDILifetimeDemo.Services;

/// <summary>
/// SMTP 邮件发送。Transient 生命周期：无状态，每次注入都新建。
/// </summary>
public sealed class SmtpEmailSender : IEmailSender {
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(ILogger<SmtpEmailSender> logger) => _logger = logger;

    public async Task SendAsync(string to, string subject, string body, CancellationToken ct = default) {
        _logger.LogInformation("发送邮件到 {To} 主题: {Subject}", to, subject);
        await Task.Delay(100, ct); // 模拟 SMTP 发送
    }
}
```

### 5.4 DI 注册与配置

```csharp
// Program.cs —— .NET 8 Minimal API
using FandexDILifetimeDemo.Services;
using FandexDILifetimeDemo.Middleware;
using FandexDILifetimeDemo.Extensions;

var builder = WebApplication.CreateBuilder(args);

// === 服务注册 ===

// Singleton: 全应用共享
builder.Services.AddSingleton<ICacheService, RedisCacheService>();
builder.Services.AddSingleton(new AppConfig {
    MaxRetries = 3,
    CacheTtl = TimeSpan.FromMinutes(30)
});

// Scoped: 每请求共享
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
// EF Core DbContext 默认 Scoped
// builder.Services.AddDbContext<AppDbContext>(opt => opt.UseSqlServer(...));

// Transient: 每次注入新建
builder.Services.AddTransient<IEmailSender, SmtpEmailSender>();

// Keyed Services (.NET 8+)
builder.Services.AddKeyedSingleton<ICacheService, RedisCacheService>("redis");
builder.Services.AddKeyedSingleton<ICacheService, MemoryCacheService>("memory");

// 工厂注册
builder.Services.AddSingleton<ISmsProvider>(sp => {
    var config = sp.GetRequiredService<IConfiguration>();
    var provider = config["Sms:Provider"] ?? "aliyun";
    return provider switch {
        "aliyun" => new AliyunSmsProvider(config["Sms:AccessKey"]!),
        "tencent" => new TencentSmsProvider(config["Sms:SecretId"]!),
        _ => throw new InvalidOperationException($"未知 SMS 提供商: {provider}")
    };
});

// 装饰器：用 Scrutor 注册带缓存的 UserService
builder.Services.Decorate<IUserService, CachedUserServiceDecorator>();

// 自动扫描注册（Scrutor）
builder.Services.Scan(scan => scan
    .FromAssemblyOf<Program>()
    .AddClasses(c => c.Where(t => t.Name.EndsWith("Repository")))
    .AsMatchingInterface()
    .WithScopedLifetime());

// === 中间件 ===
builder.Services.AddTransient<RequestContextMiddleware>();
builder.Services.AddTransient<ExceptionHandlingMiddleware>();

var app = builder.Build();

// === 中间件管线 ===
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<RequestContextMiddleware>();

app.MapGet("/users/{id}", async (string id, IUserService userService) =>
    Results.Ok(await userService.GetUserAsync(id)));

app.MapPost("/users", async (CreateUserRequest req, IUserService userService) => {
    var user = await userService.CreateUserAsync(req.Name, req.Email);
    return Results.Created($"/users/{user.Id}", user);
});

app.Run();

public record CreateUserRequest(string Name, string Email);

public class AppConfig {
    public int MaxRetries { get; init; }
    public TimeSpan CacheTtl { get; init; }
}

public interface ISmsProvider { Task SendAsync(string to, string message); }
public class AliyunSmsProvider(string accessKey) : ISmsProvider {
    public Task SendAsync(string to, string message) => Task.CompletedTask;
}
public class TencentSmsProvider(string secretId) : ISmsProvider {
    public Task SendAsync(string to, string message) => Task.CompletedTask;
}
public class MemoryCacheService(ILogger<MemoryCacheService> logger) : ICacheService {
    public Task<T?> GetAsync<T>(string key, CancellationToken ct = default) => Task.FromResult<T?>(default);
    public Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default) => Task.CompletedTask;
    public Task RemoveAsync(string key, CancellationToken ct = default) => Task.CompletedTask;
}

public class OrderRepository : IOrderRepository {
    public Task<Order?> GetByIdAsync(string orderId, CancellationToken ct = default) => Task.FromResult<Order?>(null);
    public Task SaveAsync(Order order, CancellationToken ct = default) => Task.CompletedTask;
}

/// <summary>
/// 装饰器：为 UserService 添加缓存层。
/// </summary>
public sealed class CachedUserServiceDecorator : IUserService {
    private readonly IUserService _inner;
    private readonly ICacheService _cache;
    private readonly ILogger<CachedUserServiceDecorator> _logger;

    public CachedUserServiceDecorator(
        IUserService inner,
        ICacheService cache,
        ILogger<CachedUserServiceDecorator> logger) {
        _inner = inner;
        _cache = cache;
        _logger = logger;
    }

    public async Task<User?> GetUserAsync(string userId, CancellationToken ct = default) {
        var cacheKey = $"user:{userId}";
        var cached = await _cache.GetAsync<User>(cacheKey, ct);
        if (cached is not null) {
            _logger.LogDebug("装饰器缓存命中: {UserId}", userId);
            return cached;
        }
        var user = await _inner.GetUserAsync(userId, ct);
        if (user is not null) {
            await _cache.SetAsync(cacheKey, user, TimeSpan.FromMinutes(30), ct);
        }
        return user;
    }

    public Task<User> CreateUserAsync(string name, string email, CancellationToken ct = default) =>
        _inner.CreateUserAsync(name, email, ct);
}
```

### 5.5 中间件：请求上下文

```csharp
// Middleware/RequestContextMiddleware.cs
namespace FandexDILifetimeDemo.Middleware;

/// <summary>
/// 请求上下文中间件。Scoped 服务，每请求独立。
/// </summary>
public sealed class RequestContextMiddleware(RequestDelegate next) {
    public async Task InvokeAsync(HttpContext context, RequestContext requestContext) {
        requestContext.UserId = context.User.FindFirst("sub")?.Value;
        requestContext.TraceId = context.TraceIdentifier;
        requestContext.ClientIp = context.Connection.RemoteIpAddress?.ToString();
        requestContext.StartedAt = DateTimeOffset.UtcNow;

        try {
            await next(context);
        } finally {
            var elapsed = DateTimeOffset.UtcNow - requestContext.StartedAt;
            context.Items["Elapsed"] = elapsed;
        }
    }
}

/// <summary>
/// 请求上下文。Scoped，必须注册为 Scoped。
/// </summary>
public sealed class RequestContext {
    public string? UserId { get; set; }
    public string? TraceId { get; set; }
    public string? ClientIp { get; set; }
    public DateTimeOffset StartedAt { get; set; }
}
```

### 5.6 Captive Dependency 的正确处理

```csharp
// Extensions/ServiceCollectionExtensions.cs
namespace FandexDILifetimeDemo.Extensions;

using FandexDILifetimeDemo.Services;

public static class ServiceCollectionExtensions {
    /// <summary>
    /// 正确处理 Singleton 依赖 Scoped 的场景。
    /// 使用 IServiceScopeFactory 在需要时创建新 scope。
    /// </summary>
    public static IServiceCollection AddSingletonWithScopedDependency(
        this IServiceCollection services) {
        services.AddSingleton<IBackgroundJobScheduler, BackgroundJobScheduler>();
        services.AddScoped<IUserRepository, UserRepository>();
        return services;
    }
}

/// <summary>
/// 后台任务调度器。Singleton，但需要访问 Scoped 的 UserRepository。
/// 通过 IServiceScopeFactory 每次创建新 scope。
/// </summary>
public sealed class BackgroundJobScheduler : IBackgroundJobScheduler {
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BackgroundJobScheduler> _logger;

    public BackgroundJobScheduler(
        IServiceScopeFactory scopeFactory,
        ILogger<BackgroundJobScheduler> logger) {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task ExecuteJobAsync(string userId, CancellationToken ct = default) {
        // 每次执行创建独立 scope，确保 Scoped 服务正确释放
        using var scope = _scopeFactory.CreateScope();
        var userRepo = scope.ServiceProvider.GetRequiredService<IUserRepository>();

        var user = await userRepo.GetByIdAsync(userId, ct);
        if (user is null) {
            _logger.LogWarning("用户 {UserId} 不存在", userId);
            return;
        }

        _logger.LogInformation("执行后台任务: {UserId}", userId);
    }
}

public interface IBackgroundJobScheduler {
    Task ExecuteJobAsync(string userId, CancellationToken ct = default);
}

public interface IUserRepository {
    Task<User?> GetByIdAsync(string userId, CancellationToken ct = default);
}

public class UserRepository : IUserRepository {
    public Task<User?> GetByIdAsync(string userId, CancellationToken ct = default) =>
        Task.FromResult<User?>(new User(userId, "示例", "user@example.com", DateTime.UtcNow));
}
```

### 5.7 异常处理中间件

```csharp
// Middleware/ExceptionHandlingMiddleware.cs
namespace FandexDILifetimeDemo.Middleware;

/// <summary>
/// 异常处理中间件。Singleton 生命周期（无状态）。
/// </summary>
public sealed class ExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionHandlingMiddleware> logger) {
    public async Task InvokeAsync(HttpContext context) {
        try {
            await next(context);
        } catch (Exception ex) {
            var (status, message) = ex switch {
                ArgumentException => (StatusCodes.Status400BadRequest, "参数错误"),
                UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "未授权"),
                KeyNotFoundException => (StatusCodes.Status404NotFound, "资源不存在"),
                _ when ex is InvalidOperationException or TimeoutException =>
                    (StatusCodes.Status503ServiceUnavailable, "服务暂时不可用"),
                _ => (StatusCodes.Status500InternalServerError, "内部错误")
            };

            logger.LogError(ex, "异常 {Status}: {Message}", status, message);
            context.Response.StatusCode = status;
            await context.Response.WriteAsJsonAsync(new { error = message, traceId = context.TraceIdentifier });
        }
    }
}
```

### 5.8 Keyed Services 使用

```csharp
// Program.cs 摘录
// 注册多个命名实现
builder.Services.AddKeyedSingleton<ICacheService, RedisCacheService>("redis");
builder.Services.AddKeyedSingleton<ICacheService, MemoryCacheService>("memory");

// 使用 1：构造器注入带 [FromKeyedServices]
public sealed class CacheManager(
    [FromKeyedServices("redis")] ICacheService redisCache,
    [FromKeyedServices("memory")] ICacheService memoryCache) {
    public async Task<T?> GetWithFallbackAsync<T>(string key) {
        // 先查内存缓存，再查 Redis
        var memory = await memoryCache.GetAsync<T>(key);
        if (memory is not null) return memory;

        var redis = await redisCache.GetAsync<T>(key);
        if (redis is not null) {
            await memoryCache.SetAsync(key, redis, TimeSpan.FromMinutes(5));
        }
        return redis;
    }
}

// 使用 2：运行时通过 IServiceProvider 查询
public sealed class DynamicCacheResolver(IServiceProvider sp) {
    public ICacheService Resolve(string provider) =>
        sp.GetRequiredKeyedService<ICacheService>(provider);
}
```

### 5.9 多实现注册与分发

```csharp
// 注册多个 IEventHandler 实现
builder.Services.AddSingleton<IEventHandler, EmailHandler>();
builder.Services.AddSingleton<IEventHandler, SmsHandler>();
builder.Services.AddSingleton<IEventHandler, PushHandler>();

// 注入 IEnumerable<T> 获取所有实现
public sealed class EventDispatcher(IEnumerable<IEventHandler> handlers) {
    public async Task DispatchAsync(Event evt) {
        foreach (var handler in handlers) {
            await handler.HandleAsync(evt);
        }
    }
}

public interface IEventHandler {
    Task HandleAsync(Event evt);
}

public class EmailHandler : IEventHandler {
    public Task HandleAsync(Event evt) => Task.CompletedTask;
}

public class SmsHandler : IEventHandler {
    public Task HandleAsync(Event evt) => Task.CompletedTask;
}

public class PushHandler : IEventHandler {
    public Task HandleAsync(Event evt) => Task.CompletedTask;
}

public record Event(string Type, string Payload);
```

## 六、跨语言对比

### 6.1 与 Spring (Java) 对比

| 维度 | ASP.NET Core MS.DI | Spring IoC |
| ---- | ------------------ | ---------- |
| 默认生命周期 | Transient | Singleton |
| Singleton | `AddSingleton` | `@Component` / `@Singleton` |
| Scoped | `AddScoped`（每请求） | `@RequestScope` / `@SessionScope` |
| Transient | `AddTransient` | `@Prototype` |
| 属性注入 | 不支持（仅构造器） | `@Autowired` 支持 |
| 循环依赖 | 报错 | 默认允许（.setter） |
| Keyed Services | .NET 8+ | `@Qualifier` |

Spring 默认 Singleton 的设计降低了性能开销但增加了状态管理复杂度；MS.DI 默认 Transient 的设计鼓励无状态服务但增加了构造开销。

### 6.2 与 Go Wire 对比

Go 生态的 `google/wire` 采用**编译期生成**，无运行时容器：

```go
//go:build wireinject
func InitializeApp() *App {
    wire.Build(
        NewConfig,
        NewCache,
        NewUserService,
        wire.Bind(new(IUserService), new(*UserService)),
    )
    return nil
}
```

| 维度 | MS.DI | Wire |
| ---- | ----- | ---- |
| 解析时机 | 运行时 | 编译期 |
| 生命周期 | 三种 | 仅 Singleton |
| 性能 | 反射开销 | 零开销 |
| 灵活性 | 高 | 低 |
| 调试 | 运行时 | 编译期 |

### 6.3 与 NestJS (TypeScript) 对比

NestJS 的 DI 设计借鉴 Angular，与 ASP.NET Core 类似：

```typescript
@Injectable({ scope: Scope.REQUEST })
export class UserService {}

@Injectable() // 默认 Singleton
export class CacheService {}
```

| 维度 | MS.DI | NestJS |
| ---- | ----- | ------ |
| 默认生命周期 | Transient | Singleton |
| 请求作用域 | Scoped | `Scope.REQUEST` |
| 属性注入 | 不支持 | 支持 |
| 模块化 | Scrutor | `@Module` |

### 6.4 与 Django (Python) 对比

Django 不提供内置 DI 容器，依赖手工注入或第三方库（如 `injector`、`dependency-injector`）。

```python
class UserService:
    def __init__(self, cache: CacheService):
        self.cache = cache
```

| 维度 | MS.DI | Django |
| ---- | ----- | ------ |
| 内置 DI | 是 | 否 |
| 生命周期 | 三种 | 手工管理 |
| 测试支持 | `WebApplicationFactory` | `TestCase` |

## 七、常见陷阱与最佳实践

### 7.1 陷阱：Captive Dependency

```csharp
// 错误：Singleton 依赖 Scoped
services.AddSingleton<ISingletonService, SingletonService>();
services.AddScoped<IScopedService, ScopedService>();

public class SingletonService(IScopedService scoped) : ISingletonService {
    // scoped 在 Singleton 构造时解析，被"囚禁"为 Singleton
    private readonly IScopedService _scoped = scoped;
}
```

**修复**：使用 `IServiceScopeFactory` 延迟解析：

```csharp
public class SingletonService(IServiceScopeFactory scopeFactory) : ISingletonService {
    public void DoWork() {
        using var scope = scopeFactory.CreateScope();
        var scoped = scope.ServiceProvider.GetRequiredService<IScopedService>();
        scoped.Process();
    }
}
```

### 7.2 陷阱：从根容器解析 Transient + IDisposable

```csharp
// 错误：内存泄漏
public class Program {
    public static void Main(string[] args) {
        var host = CreateHostBuilder(args).Build();
        var emailSender = host.Services.GetRequiredService<IEmailSender>();
        // emailSender 实现了 IDisposable，被根容器跟踪
        // 应用关闭前不会释放，造成内存泄漏
    }
}
```

**修复**：从 scope 解析：

```csharp
public static void Main(string[] args) {
    var host = CreateHostBuilder(args).Build();
    using var scope = host.Services.CreateScope();
    var emailSender = scope.ServiceProvider.GetRequiredService<IEmailSender>();
    // scope 释放时自动调用 Dispose
}
```

### 7.3 陷阱：Singleton 并发不安全

```csharp
// 错误：可变状态 Singleton 无锁
public class CounterService : ICounterService {
    private int _count = 0;
    public int Increment() => ++_count; // 非原子，并发不安全
}
```

**修复 1**：使用 `Interlocked`：

```csharp
public int Increment() => Interlocked.Increment(ref _count);
```

**修复 2**：使用 `ConcurrentDictionary`：

```csharp
private readonly ConcurrentDictionary<string, int> _counts = new();
public int Increment(string key) => _counts.AddOrUpdate(key, 1, (_, v) => v + 1);
```

**修复 3**：使用 `lock`：

```csharp
private readonly object _lock = new();
private int _count = 0;
public int Increment() {
    lock (_lock) { return ++_count; }
}
```

### 7.4 陷阱：作用域服务在后台任务中失效

```csharp
// 错误：在 IHostedService 中直接注入 Scoped 服务
public class MyHostedService : IHostedService {
    private readonly IUserService _userService; // Scoped！
    public MyHostedService(IUserService userService) => _userService = userService;
}
```

**修复**：注入 `IServiceScopeFactory`：

```csharp
public class MyHostedService(IServiceScopeFactory scopeFactory) : IHostedService {
    public async Task StartAsync(CancellationToken ct) {
        using var scope = scopeFactory.CreateScope();
        var userService = scope.ServiceProvider.GetRequiredService<IUserService>();
        await userService.GetUserAsync("123", ct);
    }
    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}
```

### 7.5 陷阱：DI 容器作为 Service Locator 反模式

```csharp
// 错误：把 IServiceProvider 注入到处用
public class BadService(IServiceProvider sp) {
    public void DoWork() {
        var cache = sp.GetRequiredService<ICacheService>(); // Service Locator 反模式
        var email = sp.GetRequiredService<IEmailSender>();
        // 依赖关系隐藏在方法内部，难以测试与维护
    }
}
```

**修复**：显式构造器注入：

```csharp
public class GoodService(ICacheService cache, IEmailSender email) {
    public void DoWork() {
        // 依赖清晰可见
    }
}
```

### 7.6 陷阱：循环依赖

```csharp
// 错误：A 依赖 B，B 依赖 A
public class A(B b) { }
public class B(A a) { }
// 运行时抛 InvalidOperationException: A circular dependency was detected
```

**修复**：重构为单向依赖，或使用事件/消息解耦：

```csharp
// 用事件解耦
public class A(IEventBus bus) {
    public void DoSomething() => bus.Publish(new SomethingDoneEvent());
}

public class B(IEventBus bus) {
    public B() => bus.Subscribe<SomethingDoneEvent>(Handle);
    private void Handle(SomethingDoneEvent e) { /* ... */ }
}
```

### 7.7 陷阱：构造器耗时操作阻塞启动

```csharp
// 错误：构造器中执行耗时操作
public class SlowService : ISlowService {
    public SlowService() {
        // 阻塞启动！
        Thread.Sleep(5000); // 模拟初始化
    }
}
```

**修复**：使用 `IHostedService` 异步初始化：

```csharp
public class SlowService : ISlowService, IHostedService {
    private readonly TaskCompletionSource _initTcs = new();
    public Task StartAsync(CancellationToken ct) {
        Task.Run(async () => {
            await Task.Delay(5000, ct);
            _initTcs.SetResult();
        }, ct);
        return Task.CompletedTask;
    }
    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;

    public async Task DoWorkAsync() {
        await _initTcs.Task; // 等待初始化完成
        // ...
    }
}
```

### 7.8 最佳实践清单

| 实践 | 说明 |
| ---- | ---- |
| 默认 Scoped | 数据库、缓存等有状态服务用 Scoped |
| 无状态用 Transient | 轻量无状态服务用 Transient |
| 共享用 Singleton | 配置、连接池、缓存用 Singleton |
| Singleton 必须线程安全 | 使用并发原语保护可变状态 |
| 构造器注入优先 | 避免属性注入与 Service Locator |
| 避免 Captive Dependency | Singleton 持有 Scoped 用 IServiceScopeFactory |
| 后台任务用 IServiceScopeFactory | IHostedService 不能直接注入 Scoped |
| 启用 ValidateScopes | 开发环境检测 Captive Dependency |
| 使用 Scrutor 自动扫描 | 减少手工注册样板代码 |
| Keyed Services 区分实现 | .NET 8+ 替代工厂模式 |
| 装饰器模式实现 AOP | 用 Scrutor.Decorate 添加横切关注点 |

## 八、工程实践

### 8.1 启用验证

```csharp
// 开发环境启用 ValidateScopes 与 ValidateOnBuild
var host = Host.CreateDefaultBuilder(args)
    .UseDefaultServiceProvider((ctx, options) => {
        options.ValidateScopes = ctx.HostingEnvironment.IsDevelopment();
        options.ValidateOnBuild = ctx.HostingEnvironment.IsDevelopment();
    })
    .Build();
```

`ValidateScopes` 检测 Captive Dependency；`ValidateOnBuild` 检测所有服务可被解析。

### 8.2 单元测试

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

public class UserServiceTests {
    private IServiceProvider BuildProvider(Action<IServiceCollection>? configure = null) {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<ICacheService, RedisCacheService>();
        services.AddScoped<IUserService, UserService>();
        services.AddTransient<IEmailSender, SmtpEmailSender>();
        configure?.Invoke(services);
        return services.BuildServiceProvider();
    }

    [Fact]
    public async Task GetUserAsync_CacheMiss_FetchesFromDbAndCaches() {
        using var provider = BuildProvider();
        using var scope = provider.CreateScope();
        var userService = scope.ServiceProvider.GetRequiredService<IUserService>();

        var user1 = await userService.GetUserAsync("123");
        var user2 = await userService.GetUserAsync("123");

        Assert.NotNull(user1);
        Assert.Same(user1, user2); // 第二次从缓存返回相同实例
    }

    [Fact]
    public void UserService_Is_Scoped_PerRequest() {
        using var provider = BuildProvider();
        User? u1, u2;
        using (var scope1 = provider.CreateScope()) {
            u1 = scope1.ServiceProvider.GetRequiredService<IUserService>().GetUserAsync("1").Result;
        }
        using (var scope2 = provider.CreateScope()) {
            u2 = scope2.ServiceProvider.GetRequiredService<IUserService>().GetUserAsync("1").Result;
        }
        Assert.NotSame(u1, u2); // 不同 scope 不同实例
    }

    [Fact]
    public void CacheService_Is_Singleton_SharedAcrossScopes() {
        using var provider = BuildProvider();
        ICacheService c1, c2;
        using (var scope1 = provider.CreateScope()) {
            c1 = scope1.ServiceProvider.GetRequiredService<ICacheService>();
        }
        using (var scope2 = provider.CreateScope()) {
            c2 = scope2.ServiceProvider.GetRequiredService<ICacheService>();
        }
        Assert.Same(c1, c2); // Singleton 跨 scope 共享
    }
}
```

### 8.3 集成测试

```csharp
using Microsoft.AspNetCore.Mvc.Testing;

public class ApiIntegrationTests : IClassFixture<WebApplicationFactory<Program>> {
    private readonly HttpClient _client;

    public ApiIntegrationTests(WebApplicationFactory<Program> factory) {
        _client = factory
            .WithWebHostBuilder(builder => {
                builder.ConfigureServices(services => {
                    // 替换为测试用 IEmailSender
                    services.RemoveAll<IEmailSender>();
                    services.AddTransient<IEmailSender, TestEmailSender>();
                });
            })
            .CreateClient();
    }

    [Fact]
    public async Task CreateUser_ReturnsCreated() {
        var response = await _client.PostAsJsonAsync("/users", new { Name = "张三", Email = "zhangsan@example.com" });
        response.EnsureSuccessStatusCode();
        var user = await response.Content.ReadFromJsonAsync<User>();
        Assert.Equal("张三", user!.Name);
    }
}

public class TestEmailSender : IEmailSender {
    public List<string> SentTo { get; } = new();
    public Task SendAsync(string to, string subject, string body, CancellationToken ct = default) {
        SentTo.Add(to);
        return Task.CompletedTask;
    }
}
```

### 8.4 性能基准（BenchmarkDotNet）

```csharp
using BenchmarkDotNet.Attributes;
using Microsoft.Extensions.DependencyInjection;

[MemoryDiagnoser]
public class DILifetimeBenchmarks {
    private IServiceProvider _provider = null!;
    private IServiceScope _scope = null!;

    [GlobalSetup]
    public void Setup() {
        var services = new ServiceCollection();
        services.AddSingleton<ISingletonService, SingletonService>();
        services.AddScoped<IScopedService, ScopedService>();
        services.AddTransient<ITransientService, TransientService>();
        _provider = services.BuildServiceProvider();
        _scope = _provider.CreateScope();
    }

    [Benchmark(Baseline = true)]
    public ISingletonService ResolveSingleton() =>
        _scope.ServiceProvider.GetRequiredService<ISingletonService>();

    [Benchmark]
    public IScopedService ResolveScoped() =>
        _scope.ServiceProvider.GetRequiredService<IScopedService>();

    [Benchmark]
    public ITransientService ResolveTransient() =>
        _scope.ServiceProvider.GetRequiredService<ITransientService>();
}

public interface ISingletonService { }
public class SingletonService : ISingletonService { }
public interface IScopedService { }
public class ScopedService : IScopedService { }
public interface ITransientService { }
public class TransientService : ITransientService { }
```

典型结果（.NET 8）：

| 方法 | 平均时间 | 分配 |
| ---- | -------- | ---- |
| ResolveSingleton | 28 ns | 0 B |
| ResolveScoped | 32 ns | 0 B |
| ResolveTransient | 35 ns | 0 B |

差异微小，因为无状态服务构造开销可忽略。若构造涉及 IO（如打开数据库连接），Transient 的开销会显著放大。

### 8.5 用 Scrutor 装饰器实现 AOP

```csharp
// 装饰器：日志
public sealed class LoggingDecorator<TService, TImpl> : DispatchProxy
    where TService : class
    where TImpl : class, TService {
    private TService _inner = null!;
    private ILogger<TImpl> _logger = null!;

    protected override object? Invoke(MethodInfo? method, object?[]? args) {
        var methodName = method!.Name;
        _logger.LogInformation("调用 {Method}", methodName);
        try {
            var result = method.Invoke(_inner, args);
            _logger.LogInformation("{Method} 完成", methodName);
            return result;
        } catch (Exception ex) {
            _logger.LogError(ex, "{Method} 失败", methodName);
            throw;
        }
    }
}

// 用 Scrutor 注册装饰器
services.AddScoped<IOrderRepository, OrderRepository>();
services.Decorate<IOrderRepository, CachingOrderRepository>();
```

## 九、典型场景与案例研究

### 9.1 案例一：ASP.NET Core 请求管线

每个 HTTP 请求自动创建一个 `IServiceScope`：

```csharp
// 简化的 HttpContextFactory
public class RequestContextMiddleware(RequestDelegate next) {
    public async Task InvokeAsync(HttpContext context, IServiceScopeFactory scopeFactory) {
        // ASP.NET Core 自动创建 scope，注入的 Scoped 服务共享此 scope
        await next(context);
    }
}
```

请求内所有 Scoped 服务共享同一 scope，请求结束自动释放。这是 EF Core DbContext 默认 Scoped 的原因：每请求独立上下文，避免并发冲突。

### 9.2 案例二：EF Core DbContext 生命周期

```csharp
// 默认注册为 Scoped
services.AddDbContext<AppDbContext>(opt => opt.UseSqlServer(connStr));

// 在 Scoped 服务中使用
public class UserService(AppDbContext db) : IUserService {
    public async Task<User?> GetUserAsync(string id) =>
        await db.Users.FindAsync(id);
    // 请求结束自动 Dispose DbContext
}
```

**关键**：DbContext 不是线程安全的，绝不能注册为 Singleton。

### 9.3 案例三：HttpClient 与 IHttpClientFactory

```csharp
// 注册 IHttpClientFactory
services.AddHttpClient<IApiClient, ApiClient>(client => {
    client.BaseAddress = new Uri("https://api.example.com");
    client.Timeout = TimeSpan.FromSeconds(30);
});

// 使用：每次注入新的 HttpClient，但底层 HttpMessageHandler 复用
public class ApiClient(HttpClient client) : IApiClient {
    public async Task<string> GetAsync(string path) =>
        await client.GetStringAsync(path);
}
```

`IHttpClientFactory` 通过 `HttpMessageHandlerBuilder` 复用 handler 池，避免 socket 耗尽。

### 9.4 案例四：BackgroundService 与 Scoped 服务

```csharp
public class OrderProcessorService(IServiceScopeFactory scopeFactory, ILogger<OrderProcessorService> logger)
    : BackgroundService {
    protected override async Task ExecuteAsync(CancellationToken stoppingToken) {
        while (!stoppingToken.IsCancellationRequested) {
            try {
                using var scope = scopeFactory.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<IOrderRepository>();
                var pending = await repo.GetPendingOrdersAsync(stoppingToken);

                foreach (var order in pending) {
                    await ProcessOrderAsync(order, scope.ServiceProvider, stoppingToken);
                }
            } catch (Exception ex) {
                logger.LogError(ex, "订单处理失败");
            }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }

    private async Task ProcessOrderAsync(Order order, IServiceProvider sp, CancellationToken ct) {
        var emailSender = sp.GetRequiredService<IEmailSender>();
        await emailSender.SendAsync(order.UserEmail, "订单已处理", $"订单 {order.OrderId}", ct);
    }
}
```

### 9.5 案例五：多租户场景

```csharp
// 租户上下文（Scoped）
public class TenantContext {
    public string TenantId { get; set; } = "";
    public string ConnectionString { get; set; } = "";
}

// 多租户 DbContext 工厂
services.AddDbContext<TenantDbContext>((sp, options) => {
    var tenant = sp.GetRequiredService<TenantContext>();
    options.UseSqlServer(tenant.ConnectionString);
});

// 中间件设置租户上下文
public class TenantMiddleware(RequestDelegate next) {
    public async Task InvokeAsync(HttpContext context, TenantContext tenant) {
        tenant.TenantId = context.Request.Headers["X-Tenant-Id"].ToString();
        tenant.ConnectionString = GetConnectionString(tenant.TenantId);
        await next(context);
    }
}
```

## 十、练习题与参考答案

### 10.1 基础题

**题目 1**：说出三种生命周期的创建时机与共享范围。

**参考答案**：

| 生命周期 | 创建时机 | 同请求内 | 不同请求间 |
| -------- | -------- | -------- | ---------- |
| Singleton | 首次请求时 | 同一实例 | 同一实例 |
| Scoped | 每请求创建一次 | 同一实例 | 不同实例 |
| Transient | 每次注入 | 不同实例 | 不同实例 |

### 10.2 进阶题

**题目 2**：以下代码有什么问题？如何修复？

```csharp
services.AddSingleton<IReportGenerator, ReportGenerator>();
services.AddScoped<IDataSource, SqlDataSource>();

public class ReportGenerator(IDataSource dataSource) : IReportGenerator {
    public Report Generate() => dataSource.Load();
}
```

**参考答案**：

**问题**：Captive Dependency。Singleton 的 `ReportGenerator` 在构造时解析 `IDataSource`，将其"囚禁"为 Singleton。所有请求共用同一个 `SqlDataSource` 实例，可能导致：
1. 数据库连接泄漏；
2. 多请求并发访问同一 DbContext 引发异常；
3. 请求间数据污染。

**修复**：用 `IServiceScopeFactory` 延迟解析：

```csharp
public class ReportGenerator(IServiceScopeFactory scopeFactory) : IReportGenerator {
    public Report Generate() {
        using var scope = scopeFactory.CreateScope();
        var dataSource = scope.ServiceProvider.GetRequiredService<IDataSource>();
        return dataSource.Load();
    }
}
```

### 10.3 应用题

**题目 3**：为一个电商系统设计 DI 注册方案，包含：缓存（Redis）、数据库（EF Core）、邮件（SMTP）、HTTP 客户端、日志、配置。

**参考答案**：

```csharp
var builder = WebApplication.CreateBuilder(args);

// 配置（Singleton）
builder.Services.AddSingleton(builder.Configuration);

// 日志（框架自动注册）

// 缓存（Singleton，Redis 客户端线程安全）
builder.Services.AddSingleton<ICacheService, RedisCacheService>();

// 数据库（Scoped，每请求独立）
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// 邮件（Transient，无状态）
builder.Services.AddTransient<IEmailSender, SmtpEmailSender>();

// HTTP 客户端（IHttpClientFactory 内部管理生命周期）
builder.Services.AddHttpClient<IPaymentGateway, PaymentGateway>(client => {
    client.BaseAddress = new Uri(builder.Configuration["Payment:BaseUrl"]!);
});

// 业务服务（Scoped，依赖 Scoped 的 DbContext）
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IProductService, ProductService>();

// 后台任务（Singleton，使用 IServiceScopeFactory 访问 Scoped）
builder.Services.AddHostedService<OrderCleanupService>();
```

### 10.4 高阶题

**题目 4**：实现一个用 Keyed Services 区分多种支付方式的支付处理器。

**参考答案**：

```csharp
// 注册
services.AddKeyedTransient<IPaymentGateway, AlipayGateway>("alipay");
services.AddKeyedTransient<IPaymentGateway, WechatPayGateway>("wechat");
services.AddKeyedTransient<IPaymentGateway, CreditCardGateway>("credit_card");

public sealed class PaymentProcessor(IServiceProvider sp) {
    public async Task<PaymentResult> ProcessAsync(string method, PaymentRequest request) {
        var gateway = sp.GetRequiredKeyedService<IPaymentGateway>(method);
        return await gateway.ChargeAsync(request);
    }
}

public interface IPaymentGateway {
    Task<PaymentResult> ChargeAsync(PaymentRequest request);
}

public class AlipayGateway : IPaymentGateway {
    public Task<PaymentResult> ChargeAsync(PaymentRequest request) =>
        Task.FromResult(new PaymentResult(true, "ALIPAY-" + Guid.NewGuid()));
}

public class WechatPayGateway : IPaymentGateway {
    public Task<PaymentResult> ChargeAsync(PaymentRequest request) =>
        Task.FromResult(new PaymentResult(true, "WECHAT-" + Guid.NewGuid()));
}

public class CreditCardGateway : IPaymentGateway {
    public Task<PaymentResult> ChargeAsync(PaymentRequest request) =>
        Task.FromResult(new PaymentResult(true, "CC-" + Guid.NewGuid()));
}

public record PaymentRequest(decimal Amount, string Currency);
public record PaymentResult(bool Success, string TransactionId);
```

### 10.5 思考题

**题目 5**：为什么 MS.DI 不支持属性注入？这种设计的优缺点是什么？

**参考答案**：

**优点**：
1. **显式依赖**：构造器参数清晰列出所有依赖，便于阅读；
2. **不可变**：构造完成后依赖不可变，避免运行时被修改；
3. **测试友好**：单元测试直接 `new` 注入 mock；
4. **强制完整性**：构造时所有依赖必须就位，避免 NPE。

**缺点**：
1. **构造器参数过多**：依赖多时构造器臃肿（但这是设计味道，应重构）；
2. **循环依赖更难解**：构造器注入无法解循环，属性注入可以（但循环依赖本身是设计问题）；
3. **框架集成不便**：某些场景（如 ASP.NET Core `[FromServices]`）需要属性注入。

### 10.6 设计题

**题目 6**：设计一个用装饰器链实现缓存 + 日志 + 重试的服务。

**参考答案**：

```csharp
// 用 Scrutor 注册多个装饰器
services.AddScoped<IUserService, UserService>();
services.Decorate<IUserService, LoggingUserServiceDecorator>();
services.Decorate<IUserService, CachingUserServiceDecorator>();
services.Decorate<IUserService, RetryingUserServiceDecorator>();

// 解析时得到：Retrying -> Caching -> Logging -> UserService

public sealed class LoggingUserServiceDecorator(
    IUserService inner, ILogger<LoggingUserServiceDecorator> logger) : IUserService {
    public async Task<User?> GetUserAsync(string id, CancellationToken ct = default) {
        logger.LogInformation(" GetUserAsync {Id}", id);
        try {
            var result = await inner.GetUserAsync(id, ct);
            logger.LogInformation(" GetUserAsync {Id} 完成", id);
            return result;
        } catch (Exception ex) {
            logger.LogError(ex, " GetUserAsync {Id} 失败", id);
            throw;
        }
    }

    public Task<User> CreateUserAsync(string name, string email, CancellationToken ct = default) =>
        inner.CreateUserAsync(name, email, ct);
}

public sealed class CachingUserServiceDecorator(
    IUserService inner, ICacheService cache) : IUserService {
    public async Task<User?> GetUserAsync(string id, CancellationToken ct = default) {
        var key = $"user:{id}";
        var cached = await cache.GetAsync<User>(key, ct);
        if (cached is not null) return cached;
        var user = await inner.GetUserAsync(id, ct);
        if (user is not null) await cache.SetAsync(key, user, TimeSpan.FromMinutes(30), ct);
        return user;
    }

    public Task<User> CreateUserAsync(string name, string email, CancellationToken ct = default) =>
        inner.CreateUserAsync(name, email, ct);
}

public sealed class RetryingUserServiceDecorator(
    IUserService inner, ILogger<RetryingUserServiceDecorator> logger) : IUserService {
    public async Task<User?> GetUserAsync(string id, CancellationToken ct = default) {
        const int maxRetries = 3;
        for (int i = 0; i < maxRetries; i++) {
            try {
                return await inner.GetUserAsync(id, ct);
            } catch (Exception ex) when (i < maxRetries - 1) {
                logger.LogWarning(ex, " GetUserAsync 第 {Attempt} 次失败", i + 1);
                await Task.Delay(TimeSpan.FromMilliseconds(100 * (i + 1)), ct);
            }
        }
        throw new InvalidOperationException("超过最大重试次数");
    }

    public Task<User> CreateUserAsync(string name, string email, CancellationToken ct = default) =>
        inner.CreateUserAsync(name, email, ct);
}
```

### 10.7 综合题

**题目 7**：实现一个用 `IServiceScopeFactory` 处理并发后台任务的调度器，确保每个任务独立 scope、独立 DbContext。

**参考答案**：

```csharp
public sealed class BackgroundJobScheduler(
    IServiceScopeFactory scopeFactory,
    ILogger<BackgroundJobScheduler> logger) : IHostedService, IDisposable {
    private readonly SemaphoreSlim _semaphore = new(10); // 限制并发数
    private readonly CancellationTokenSource _cts = new();
    private Task? _workerTask;

    public Task StartAsync(CancellationToken ct) {
        _workerTask = ProcessQueueAsync(_cts.Token);
        return Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken ct) {
        _cts.Cancel();
        if (_workerTask is not null) {
            await Task.WhenAny(_workerTask, Task.Delay(Timeout.Infinite, ct));
        }
    }

    private async Task ProcessQueueAsync(CancellationToken ct) {
        while (!ct.IsCancellationRequested) {
            try {
                await ProcessBatchAsync(ct);
                await Task.Delay(TimeSpan.FromSeconds(10), ct);
            } catch (OperationCanceledException) {
                break;
            } catch (Exception ex) {
                logger.LogError(ex, "批处理失败");
            }
        }
    }

    private async Task ProcessBatchAsync(CancellationToken ct) {
        var tasks = Enumerable.Range(0, 5).Select(i => ProcessSingleAsync(i, ct));
        await Task.WhenAll(tasks);
    }

    private async Task ProcessSingleAsync(int jobId, CancellationToken ct) {
        await _semaphore.WaitAsync(ct);
        try {
            // 每个任务独立 scope，确保 Scoped 服务隔离
            using var scope = scopeFactory.CreateScope();
            var sp = scope.ServiceProvider;
            var userRepo = sp.GetRequiredService<IUserRepository>();
            var emailSender = sp.GetRequiredService<IEmailSender>();

            var user = await userRepo.GetByIdAsync($"user-{jobId}", ct);
            if (user is not null) {
                await emailSender.SendAsync(user.Email, "通知", $"任务 {jobId} 完成", ct);
            }
        } finally {
            _semaphore.Release();
        }
    }

    public void Dispose() {
        _cts.Dispose();
        _semaphore.Dispose();
    }
}
```

### 10.8 调试题

**题目 8**：用户报告系统在运行一段时间后内存持续增长，重启后恢复。如何排查？

**参考答案**：

**排查步骤**：

1. **检查是否有 Transient + IDisposable 从根解析**：
   ```csharp
   var disposable = app.Services.GetRequiredService<IDisposableService>();
   // 这种代码会造成内存泄漏
   ```

2. **检查 Singleton 是否持有 Scoped 服务引用**：
   ```csharp
   // Singleton 的字段持有 Scoped 实例，导致 Scoped 实例永不释放
   ```

3. **检查 Singleton 是否有缓存无界增长**：
   ```csharp
   public class BadCache {
       private readonly Dictionary<string, object> _cache = new(); // 无界增长
   }
   ```

4. **用 dotnet-counters 监控 GC**：
   ```
   dotnet-counters monitor --process-id <pid> System.Runtime
   ```

5. **用 dotnet-dump 抓取堆快照分析**：
   ```
   dotnet-dump collect --process-id <pid>
   dotnet-dump analyze dump.dmp
   > dumpheap -stat
   ```

6. **启用 `ValidateScopes`** 在开发环境检测 Captive Dependency。

### 10.9 性能题

**题目 9**：一个服务每秒被解析 10000 次，目前是 Transient。是否应该改为 Singleton？性能差异多大？

**参考答案**：

**分析**：
- Transient 每次解析约 35 ns，10000 次/秒 = 350 μs/秒，开销可忽略；
- 若服务无状态，改为 Singleton 可节省构造开销，但需保证线程安全；
- 若服务有状态（如缓存），Singleton 需用并发原语，可能引入锁竞争。

**建议**：
1. 用 BenchmarkDotNet 实测构造开销；
2. 若构造开销 < 1 μs，保持 Transient；
3. 若构造涉及 IO（如打开文件/连接），改为 Singleton 或 Scoped；
4. Singleton 必须严格审查线程安全。

### 10.10 实战题

**题目 10**：为一个 SaaS 平台设计多租户 DI 架构，要求：每租户独立数据库连接、独立缓存策略、独立配置。

**参考答案**：

```csharp
// 租户上下文（Scoped）
public sealed class TenantContext {
    public string TenantId { get; set; } = "";
    public string ConnectionString { get; set; } = "";
    public TimeSpan CacheTtl { get; set; } = TimeSpan.FromMinutes(30);
}

// 租户识别中间件
public sealed class TenantMiddleware(RequestDelegate next) {
    public async Task InvokeAsync(HttpContext context, TenantContext tenant, ITenantStore store) {
        var tenantId = context.Request.Headers["X-Tenant-Id"].ToString();
        var config = await store.GetConfigAsync(tenantId);
        tenant.TenantId = tenantId;
        tenant.ConnectionString = config.ConnectionString;
        tenant.CacheTtl = config.CacheTtl;
        await next(context);
    }
}

// 多租户 DbContext
public sealed class TenantDbContextFactory(IServiceProvider sp) : IDbContextFactory<TenantDbContext> {
    public TenantDbContext CreateDbContext() {
        var tenant = sp.GetRequiredService<TenantContext>();
        var options = new DbContextOptionsBuilder<TenantDbContext>()
            .UseSqlServer(tenant.ConnectionString)
            .Options;
        return new TenantDbContext(options);
    }
}

// 多租户缓存（基于 TenantContext 调整 TTL）
public sealed class TenantAwareCache(
    ICacheService inner,
    TenantContext tenant) : ICacheService {
    public Task<T?> GetAsync<T>(string key, CancellationToken ct = default) =>
        inner.GetAsync<T>($"tenant:{tenant.TenantId}:{key}", ct);

    public Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default) =>
        inner.SetAsync($"tenant:{tenant.TenantId}:{key}", value, expiry ?? tenant.CacheTtl, ct);

    public Task RemoveAsync(string key, CancellationToken ct = default) =>
        inner.RemoveAsync($"tenant:{tenant.TenantId}:{key}", ct);
}

// 注册
services.AddScoped<TenantContext>();
services.AddScoped<ICacheService, TenantAwareCache>();
services.AddSingleton<IDbContextFactory<TenantDbContext>, TenantDbContextFactory>();
```

## 十一、参考文献

本节按 ACM Reference Format 列出本文主要参考资料。

[1] Microsoft. 2024. *Dependency injection in .NET*. Microsoft Learn. Retrieved July 21, 2026 from https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection

[2] Microsoft. 2024. *Dependency injection guidelines*. Microsoft Learn. Retrieved July 21, 2026 from https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection-guidelines

[3] Microsoft. 2024. *Dependency injection in ASP.NET Core*. Microsoft Learn. Retrieved July 21, 2026 from https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection

[4] Martin Fowler. 2004. *Inversion of Control Containers and the Dependency Injection Pattern*. martinfowler.com. Retrieved July 21, 2026 from https://martinfowler.com/articles/injection.html

[5] Robert C. Martin. 2003. *Agile Software Development, Principles, Patterns, and Practices*. Pearson, Boston, MA. DOI: https://doi.org/10.5555/1200306

[6] Mark Seemann. 2019. *Dependency Injection Principles, Practices, and Patterns* (2nd ed.). Manning Publications, Shelter Island, NY. Retrieved July 21, 2026 from https://www.manning.com/books/dependency-injection-principles-practices-patterns-second-edition

[7] Steven van Deursen and Mark Seemann. 2019. *Dependency Injection Principles, Practices, and Patterns* (2nd ed.). Manning Publications, Shelter Island, NY.

[8] Microsoft. 2024. *Keyed services in .NET*. Microsoft Learn. Retrieved July 21, 2026 from https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection#keyed-services

[9] Andrew Lock. 2023. *ASP.NET Core in Action* (3rd ed.). Manning Publications, Shelter Island, NY.

[10] Khalid Abuhakmeh. 2022. *Captive Dependencies in .NET*. Khalid's Blog. Retrieved July 21, 2026 from https://khalidabuhakmeh.com/captive-dependencies-in-dotnet

[11] Jimmy Bogard. 2017. *Avoiding Captive Dependencies in ASP.NET Core*. Los Techies. Retrieved July 21, 2026 from https://www.lostechies.com/jimmybogard/2017/05/05/avoiding-captive-dependencies/

[12] Khellang. 2024. *Scrutor: Assembly scanning and decorating extensions for Microsoft.Extensions.DependencyInjection*. GitHub. Retrieved July 21, 2026 from https://github.com/khellang/Scrutor

[13] Autofac. 2024. *Autofac Documentation*. autofac.org. Retrieved July 21, 2026 from https://autofac.org/

[14] Microsoft. 2024. *IHostedService and BackgroundService in .NET*. Microsoft Learn. Retrieved July 21, 2026 from https://learn.microsoft.com/en-us/dotnet/core/extensions/workers

[15] Microsoft. 2024. *Make HTTP requests using IHttpClientFactory in ASP.NET Core*. Microsoft Learn. Retrieved July 21, 2026 from https://learn.microsoft.com/en-us/aspnet/core/fundamentals/http-requests

[16] Microsoft. 2024. *Entity Framework Core - DbContext Lifetime, Configuration, and Initialization*. Microsoft Learn. Retrieved July 21, 2026 from https://learn.microsoft.com/en-us/ef/core/dbcontext-configuration/

[17] Juval Lowy. 2019. *Righting Software: A Method for System and Project Design*. Addison-Wesley Professional, Boston, MA. DOI: https://doi.org/10.5555/3530655

[18] Microsoft. 2024. *.NET 8 Performance Improvements in Dependency Injection*. .NET Blog. Retrieved July 21, 2026 from https://devblogs.microsoft.com/dotnet/performance-improvements-in-net-8/

## 十二、延伸阅读

### 12.1 官方文档

- [Dependency injection in .NET | Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection)
- [Dependency injection in ASP.NET Core | Microsoft Learn](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection)
- [Dependency injection guidelines | Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection-guidelines)
- [Keyed services in .NET | Microsoft Learn](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection#keyed-services)

### 12.2 经典书籍

- Mark Seemann, *Dependency Injection Principles, Practices, and Patterns* (2nd Edition)
- Andrew Lock, *ASP.NET Core in Action* (3rd Edition)
- Jimmy Bogard, *Architecting with ASP.NET Core*
- Khalid Abuhakmeh, *ASP.NET Core 8 Best Practices*

### 12.3 设计原则

- Martin Fowler, *Inversion of Control Containers and the Dependency Injection Pattern*
- Robert C. Martin (Uncle Bob), *Clean Architecture* - DI 是依赖反转原则的工程实现
- SOLID 原则中的 D（Dependency Inversion Principle）

### 12.4 第三方容器

- [Autofac Documentation](https://autofac.org/) - 模块化、AOP、属性注入
- [Scrutor GitHub](https://github.com/khellang/Scrutor) - MS.DI 扩展
- [Lamar GitHub](https://github.com/JeremySkinner/lamar) - 高性能替代
- [Grace GitHub](https://github.com/ipjohnson/Grace) - 高性能、AOP

### 12.5 装饰器与 AOP

- [Scrutor Decorate](https://github.com/khellang/Scrutor#decoraters)
- [Castle DynamicProxy](http://www.castleproject.org/projects/dynamicproxy/)
- [PostSharp](https://www.postsharp.net/) - 编译期 AOP

### 12.6 测试

- [WebApplicationFactory](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests)
- [Moq](https://github.com/moq/moq) - mock 框架
- [NSubstitute](https://nsubstitute.github.io/) - 替代 Moq

### 12.7 性能

- [.NET 8 Performance Improvements in DI | .NET Blog](https://devblogs.microsoft.com/dotnet/performance-improvements-in-net-8/)
- [MS.DI Source Code | GitHub](https://github.com/dotnet/runtime/tree/main/src/libraries/Microsoft.Extensions.DependencyInjection)
- [BenchmarkDotNet DI Benchmarks](https://github.com/danielpalme/IocPerformance)

### 12.8 进阶主题

- **源生成器 DI**：编译期生成 DI 代码，消除反射开销（.NET 9 实验）
- **AOT 友好 DI**：Native AOT 场景下的 DI 优化
- **DI 容器替换**：从 MS.DI 迁移到 Autofac/Lamar
- **多租户 DI**：每租户独立服务实例
- **DI 与微服务**：跨服务边界的依赖管理
- **DI 与函数式编程**：函数式 DI 与面向对象 DI 的对比

### 12.9 相关项目

- [dotnet/runtime | GitHub](https://github.com/dotnet/runtime) - MS.DI 源码
- [dotnet/aspnetcore | GitHub](https://github.com/dotnet/aspnetcore) - ASP.NET Core DI 集成
- [dotnet/extensions | GitHub](https://github.com/dotnet/extensions) - 扩展库
- [aspnet/DependencyInjection.Samples | GitHub](https://github.com/dotnet/AspNetCore.Docs/tree/main/aspnetcore/fundamentals/dependency-injection/samples)

### 12.10 教学视频

- *Dependency Injection in .NET 8* - Microsoft Learn TV
- *ASP.NET Core DI Deep Dive* - NDC Conference 2023
- *Captive Dependencies Explained* - Nick Chapsas YouTube
- *SOLID Principles in C#* - Tim Corey YouTube

---

**总结**：依赖注入是现代 .NET 应用的核心基础设施，正确选择生命周期是构建可维护、可扩展、高性能应用的关键。三种生命周期各有适用场景：

- **Singleton**：无状态、共享昂贵资源（数据库连接池、缓存、配置）；
- **Scoped**：请求级有状态（DbContext、请求上下文、用户会话）；
- **Transient**：轻量无状态、需要每次新实例（邮件发送器、临时计算器）。

阅读建议：

1. **初学者**：先掌握三种生命周期的基本区别与构造器注入；
2. **中级开发者**：学习 Captive Dependency、并发安全、装饰器模式；
3. **高级开发者**：研究 Keyed Services、AOP、多租户 DI；
4. **架构师**：设计 DI 容器策略、性能优化、AOT 友好方案。

后续推荐阅读：

- 《ASP.NET Core 中间件管道》：理解请求管线与 scope 创建
- 《Entity Framework Core 迁移与优化》：DbContext 生命周期深入
- 《GC 代机制》：DI 与 GC 的交互
- 《值类型与引用类型》：DI 容器与对象图构造的内存影响
