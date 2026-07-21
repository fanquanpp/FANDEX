---
order: 61
title: 'C#与依赖注入'
module: csharp
category: 'C#'
difficulty: intermediate
description: .NET依赖注入容器
author: fanquanpp
updated: '2026-06-14'
related:
  - 'csharp/CSharp与MAUI'
  - 'csharp/CSharp与EF Core'
  - 'csharp/CSharp与最小API'
  - 'csharp/CSharp12与CSharp13新特性'
prerequisites:
  - csharp/概述与环境配置
---

## 一、概述

依赖注入（Dependency Injection，简称 DI）是现代软件工程中最重要的设计模式之一，它从根本上改变了对象之间协作的方式。在 .NET 生态中，依赖注入不仅是一种设计模式，更是整个应用框架的基础设施——ASP.NET Core、MAUI、Worker Service、Blazor 等所有现代 .NET 应用模型都内置了功能完善的 DI 容器。掌握依赖注入，是理解 .NET 应用如何组织、如何协作、如何测试的关键前提。

### 1.1 什么是依赖注入

依赖注入的核心思想可以用一句话概括：**对象不应该自己创建它所需要的依赖，而应该由外部容器将依赖传入**。这句话看似简单，却蕴含着深刻的软件设计哲学。

让我们通过一个具体的例子来理解这个概念。假设你正在开发一个订单处理系统，其中 `OrderService` 类需要访问数据库和发送邮件通知：

```csharp
// 不使用依赖注入的紧耦合写法
public class OrderService
{
    private readonly SqlDatabase _database;
    private readonly SmtpEmailSender _emailSender;

    public OrderService()
    {
        // 在类内部直接创建依赖，导致紧耦合
        _database = new SqlDatabase("Server=...;Database=...;");
        _emailSender = new SmtpEmailSender("smtp.example.com", 587);
    }

    public void PlaceOrder(Order order)
    {
        _database.Save(order);
        _emailSender.Send(order.CustomerEmail, "订单已确认");
    }
}
```

这段代码存在多个严重问题。首先，`OrderService` 同时承担了业务逻辑和对象创建两种职责，违反了单一职责原则。其次，`SqlDatabase` 和 `SmtpEmailSender` 是具体实现而非抽象，如果要切换到 `PostgreDatabase` 或 `SendGridEmailSender`，必须修改 `OrderService` 的源代码。最后，这种写法几乎无法进行单元测试——你无法在不连接真实数据库和邮件服务器的情况下测试 `PlaceOrder` 的逻辑。

使用依赖注入后，代码会变成这样：

```csharp
// 使用依赖注入的松耦合写法
public class OrderService
{
    private readonly IDatabase _database;
    private readonly IEmailSender _emailSender;

    // 依赖通过构造函数注入
    public OrderService(IDatabase database, IEmailSender emailSender)
    {
        _database = database;
        _emailSender = emailSender;
    }

    public void PlaceOrder(Order order)
    {
        _database.Save(order);
        _emailSender.Send(order.CustomerEmail, "订单已确认");
    }
}
```

现在 `OrderService` 只关心业务逻辑，不关心依赖如何创建。`IDatabase` 和 `IEmailSender` 是抽象接口，可以随时替换实现。进行单元测试时，可以传入 Mock 对象：

```csharp
[Fact]
public void PlaceOrder_Should_Save_And_Send_Email()
{
    // 安排（Arrange）
    var mockDatabase = new Mock<IDatabase>();
    var mockEmailSender = new Mock<IEmailSender>();
    var service = new OrderService(mockDatabase.Object, mockEmailSender.Object);
    var order = new Order { CustomerEmail = "test@example.com" };

    // 执行（Act）
    service.PlaceOrder(order);

    // 断言（Assert）
    mockDatabase.Verify(d => d.Save(order), Times.Once);
    mockEmailSender.Verify(e => e.Send("test@example.com", "订单已确认"), Times.Once);
}
```

这就是依赖注入带来的根本性改变——它让代码变得可测试、可替换、可维护。

### 1.2 控制反转：依赖注入的理论基础

依赖注入是控制反转（Inversion of Control，IoC）原则的一种具体实现。要理解依赖注入，必须先理解控制反转。

传统编程模式中，对象 A 依赖对象 B，对象 A 会主动创建和控制对象 B 的生命周期。这种"主动获取"的模式叫做"正转控制"。控制反转则颠倒了这种关系——对象 A 不再主动创建对象 B，而是被动地接收外部传入的对象 B。控制权从对象 A 转移到了外部容器，这就是"控制反转"。

Robert C. Martin（Uncle Bob）在《面向对象设计原则》中提出的依赖倒置原则（Dependency Inversion Principle，DIP）是控制反转的理论基础：

- 高层模块不应该依赖低层模块，二者都应该依赖抽象
- 抽象不应该依赖细节，细节应该依赖抽象

依赖注入正是实现依赖倒置原则的最常用手段。通过引入抽象（接口或抽象类），并将具体实现的创建责任交给外部容器，我们实现了高层模块与低层模块的解耦。

### 1.3 为什么 .NET 内置 DI 容器如此重要

在 .NET Core 之前，ASP.NET（基于 System.Web）并没有内置 DI 容器，开发者需要使用 Ninject、Autofac、Unity、StructureMap 等第三方容器。这些容器功能强大，但也带来了学习成本高、配置复杂、与框架集成困难等问题。

.NET Core 1.0 在 2016 年发布时，做出了一个重要决策：将 DI 容器作为框架的一等公民内置提供。`Microsoft.Extensions.DependencyInjection` 这个抽象包定义了 DI 容器的标准接口，而 `Microsoft.Extensions.DependencyInjection` 实现包提供了默认的轻量级容器。所有 .NET Core 应用框架（ASP.NET Core、EF Core、Logging、Configuration 等）都基于这个标准接口构建。

这个设计带来了几个深远的影响。第一，第三方容器可以通过实现 `IServiceProviderFactory` 接口无缝替换默认容器，比如 Autofac、Scrutor、Lamar 等。第二，所有 .NET 应用共享同一套 DI 抽象，开发者学一次就能在所有场景使用。第三，框架本身的代码变得可测试，因为内部依赖都是通过 DI 注入的。

## 二、历史与演进

理解依赖注入在 .NET 中的演进历程，有助于我们把握其设计哲学和最佳实践。

### 2.1 前.NET Core 时代（2002-2016）

在 ASP.NET Web Forms 和早期 ASP.NET MVC 时代，.NET 没有内置 DI 容器。开发者通常采用以下几种方式管理依赖：

**方式一：手动 new 创建**。这是最原始的方式，依赖在类内部直接创建。这种方式简单直接，但导致代码紧耦合，难以测试。

```csharp
// 典型的 Web Forms 代码
public partial class Default : System.Web.UI.Page
{
    private readonly UserService _userService = new UserService();
    
    protected void Page_Load(object sender, EventArgs e)
    {
        var users = _userService.GetAllUsers();
        // 绑定数据
    }
}
```

**方式二：单例模式**。对于全局共享的服务，开发者常用单例模式手动管理生命周期。

```csharp
public class Database
{
    private static readonly Database _instance = new Database();
    public static Database Instance => _instance;
    
    private Database() { }
}
```

**方式三：服务定位器（Service Locator）反模式**。开发者创建一个全局的容器，通过 `GetService<T>()` 方法获取依赖。这种方式虽然实现了松耦合，但隐藏了类的真实依赖，被 Martin Fowler 等人称为"反模式"。

```csharp
public class OrderService
{
    public void PlaceOrder(Order order)
    {
        // 依赖被隐藏在方法内部，从外部无法看出
        var database = ServiceLocator.Current.GetService<IDatabase>();
        database.Save(order);
    }
}
```

**方式四：第三方 DI 容器**。Ninject、Autofac、Unity、StructureMap、Castle Windsor 等容器在 .NET 社区广泛使用。每个容器都有自己的 API 风格和配置方式，开发者需要单独学习。

```csharp
// Autofac 配置示例
var builder = new ContainerBuilder();
builder.RegisterType<SqlDatabase>().As<IDatabase>();
builder.RegisterType<SmtpEmailSender>().As<IEmailSender>();
builder.RegisterType<OrderService>().AsSelf();
var container = builder.Build();
```

### 2.2 .NET Core 1.0 革命（2016）

2016 年 6 月发布的 .NET Core 1.0 是 .NET 历史上最重要的转折点之一。微软做出了几个关键决策：

**决策一：内置 DI 容器**。`Microsoft.Extensions.DependencyInjection` 成为所有 .NET Core 应用的标准基础设施。这个容器刻意保持简单——它不支持高级特性（如属性注入、自动注册、AOP），但提供了足够满足大多数应用场景的核心功能。

**决策二：标准化抽象**。`IServiceCollection`、`IServiceProvider`、`IServiceScope` 等接口成为 DI 容器的标准契约。任何第三方容器都可以通过实现这些接口与框架集成。

**决策三：约定优于配置**。ASP.NET Core 应用通过 `Startup.ConfigureServices` 方法配置 DI，框架本身已经在容器中注册了大量服务（日志、配置、HTTP、路由等），开发者只需要注册自己的业务服务。

```csharp
// .NET Core 1.0 的 Startup 类
public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        // 注册 MVC 服务（框架已注册大量基础设施服务）
        services.AddMvc();
        
        // 注册业务服务
        services.AddSingleton<IDatabase, SqlDatabase>();
        services.AddScoped<IEmailSender, SmtpEmailSender>();
        services.AddTransient<OrderService>();
    }
    
    public void Configure(IApplicationBuilder app)
    {
        app.UseMvc();
    }
}
```

### 2.3 .NET Core 2.x-3.x 的完善（2017-2019）

.NET Core 2.x 引入了 `IServiceProviderFactory<TContainerBuilder>` 接口，让第三方容器能够更优雅地集成。Autofac、Scrutor 等容器迅速跟进，提供了与内置容器无缝集成的能力。

```csharp
// 使用 Autofac 替换内置容器
public class Startup
{
    public void ConfigureServices(IServiceCollection services)
    {
        services.AddMvc();
        // 其他服务注册
    }
    
    // 配置 Autofac 容器
    public void ConfigureContainer(ContainerBuilder builder)
    {
        builder.RegisterType<SqlDatabase>().As<IDatabase>();
        // Autofac 特有的高级注册
    }
}
```

.NET Core 3.0 引入了 `Host` 和 `HostBuilder` 抽象，将 DI 容器、配置、日志等基础设施统一管理。Worker Service 等非 Web 应用也能享受与 ASP.NET Core 相同的 DI 体验。

### 2.4 .NET 5+ 的统一（2020-至今）

.NET 5 开始，所有 .NET 应用（Web、桌面、移动、云）都基于统一的 `IHost` 抽象构建。`Program.cs` 中的顶层语句让应用启动代码更加简洁：

```csharp
// .NET 6+ 的 Minimal API 风格
var builder = WebApplication.CreateBuilder(args);

// 注册服务
builder.Services.AddSingleton<IDatabase, SqlDatabase>();
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();

var app = builder.Build();

// 配置中间件
app.MapGet("/orders", (OrderService service) => 
{
    return service.GetAllOrders();
});

app.Run();
```

.NET 8 进一步增强了 DI 容器，引入了键控服务（Keyed Services），允许同一个接口注册多个实现并通过键来解析。这是自 .NET Core 1.0 以来 DI 容器最重要的功能增强。

```csharp
// .NET 8 键控服务
builder.Services.AddKeyedSingleton<ICache, MemoryCache>("memory");
builder.Services.AddKeyedSingleton<ICache, RedisCache>("redis");

// 通过键解析
app.MapGet("/data", ([FromKeyedServices("redis")] ICache cache) => 
{
    return cache.Get("key");
});
```

### 2.5 .NET 9 与未来方向

.NET 9 在 DI 容器方面没有重大功能新增，但持续优化了性能和稳定性。未来的 .NET 10+ 可能会引入更多编译时 DI（Source Generator 驱动）以减少运行时反射开销，这与 Native AOT 的趋势一致。

## 三、核心概念

要深入理解依赖注入，必须掌握以下几个核心概念。这些概念相互关联，共同构成了 DI 的完整体系。

### 3.1 服务（Service）

在依赖注入语境中，"服务"指的是注册到容器中、可以被注入到其他对象的任何对象。一个服务可以是：

- **数据访问层**：如 `IUserRepository`、`IOrderRepository`
- **业务逻辑层**：如 `IOrderService`、`IPaymentService`
- **基础设施**：如 `ILogger<T>`、`IConfiguration`、`IHttpClientFactory`
- **领域对象**：通常是 transient 或持有状态的 scoped 服务
- **第三方库封装**：如 `SendGridEmailSender`、`StripePaymentGateway`

服务通过接口（推荐）或具体类暴露给消费者。接口暴露的好处是消费者只依赖契约，不依赖实现细节，便于替换和测试。

```csharp
// 服务接口定义
public interface IUserRepository
{
    Task<User?> GetByIdAsync(int id);
    Task<IEnumerable<User>> GetAllAsync();
    Task<int> AddAsync(User user);
    Task<bool> UpdateAsync(User user);
    Task<bool> DeleteAsync(int id);
}

// 服务实现
public class SqlUserRepository : IUserRepository
{
    private readonly DbContext _context;
    private readonly ILogger<SqlUserRepository> _logger;

    public SqlUserRepository(DbContext context, ILogger<SqlUserRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<User?> GetByIdAsync(int id)
    {
        _logger.LogInformation("查询用户: {UserId}", id);
        return await _context.Users.FindAsync(id);
    }
    
    // 其他方法实现...
}
```

### 3.2 注册（Registration）

注册是将服务接口与实现类关联起来、并指定其生命周期的过程。注册通常在应用启动时完成，是 DI 容器配置的核心。

.NET 提供了三种注册方法，对应三种生命周期：

```csharp
// Transient：每次请求都创建新实例
services.AddTransient<IEmailSender, SmtpEmailSender>();

// Scoped：每个作用域创建一个实例（如每次 HTTP 请求）
services.AddScoped<IUnitOfWork, EfUnitOfWork>();

// Singleton：整个应用生命周期内只有一个实例
services.AddSingleton<IClock, SystemClock>();
```

除了指定接口和实现类，还可以注册具体类型（自注册）：

```csharp
// 自注册：OrderService 既是服务类型也是实现类型
services.AddTransient<OrderService>();
```

或者使用工厂方法注册：

```csharp
// 工厂方法注册：可以自定义实例创建逻辑
services.AddSingleton<ICache>(provider =>
{
    var config = provider.GetRequiredService<IConfiguration>();
    var connectionString = config.GetConnectionString("Redis");
    return new RedisCache(connectionString);
});
```

还可以注册已有实例（仅适用于 Singleton）：

```csharp
// 注册已有实例
services.AddSingleton<ILogger>(new ConsoleLogger());
```

### 3.3 注入（Injection）

注入是容器将服务传递给消费者的过程。.NET DI 容器支持三种注入方式：

**构造函数注入（推荐）**。这是最常用、最推荐的注入方式。容器在创建对象时，通过反射读取构造函数参数，递归解析每个依赖并传入。

```csharp
public class OrderService
{
    private readonly IUserRepository _userRepository;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<OrderService> _logger;

    // 构造函数注入：所有依赖通过构造函数传入
    public OrderService(
        IUserRepository userRepository,
        IEmailSender emailSender,
        ILogger<OrderService> logger)
    {
        _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        _emailSender = emailSender ?? throw new ArgumentNullException(nameof(emailSender));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }
}
```

构造函数注入有几个优点：依赖关系明确（从构造函数签名就能看出对象需要什么）、依赖不可变（可以声明为 readonly）、便于测试（直接 new 实例传入 Mock）、容器友好（不需要额外 API）。

**属性注入（不推荐，第三方容器支持）**。.NET 内置 DI 容器不支持属性注入，Autofac、Scrutor 等第三方容器支持。属性注入的问题在于依赖关系被隐藏、依赖可能为 null、对象可能处于不完整状态。

```csharp
// Autofac 的属性注入
public class OrderService
{
    public IUserRepository UserRepository { get; set; }  // 可能为 null
    public IEmailSender EmailSender { get; set; }        // 可能为 null
}
```

**方法注入（参数注入）**。在 Minimal API 中，框架通过方法参数注入服务：

```csharp
// Minimal API 的方法注入
app.MapGet("/users/{id}", async (
    int id,
    IUserRepository userRepository,  // 方法参数注入
    ILogger<Program> logger) =>
{
    logger.LogInformation("查询用户: {UserId}", id);
    var user = await userRepository.GetByIdAsync(id);
    return user is null ? Results.NotFound() : Results.Ok(user);
});
```

方法注入适用于轻量级场景（如 Minimal API），但对于复杂的业务对象，应该使用构造函数注入。

### 3.4 生命周期（Lifetime）

生命周期是 DI 容器管理的服务实例的存活时间。.NET 内置 DI 容器支持三种生命周期，每种都有其适用场景。

#### 3.4.1 Transient（瞬态）

每次请求都创建一个新实例，永不复用。这是最"安全"的生命周期，不会引发并发问题，但也可能造成内存压力。

```csharp
services.AddTransient<IEmailSender, SmtpEmailSender>();

// 两次解析得到不同实例
var sender1 = provider.GetService<IEmailSender>();
var sender2 = provider.GetService<IEmailSender>();
// ReferenceEquals(sender1, sender2) == false
```

适用场景：无状态服务、轻量级服务、需要全新状态的服务。

#### 3.4.2 Scoped（范围）

每个"作用域"内复用同一个实例，不同作用域之间互不影响。在 ASP.NET Core 中，每次 HTTP 请求会创建一个作用域，请求结束时作用域被释放，作用域内的所有 scoped 服务也被释放。

```csharp
services.AddScoped<IUnitOfWork, EfUnitOfWork>();

// 在同一作用域内多次解析得到同一实例
using (var scope = provider.CreateScope())
{
    var uow1 = scope.ServiceProvider.GetService<IUnitOfWork>();
    var uow2 = scope.ServiceProvider.GetService<IUnitOfWork>();
    // ReferenceEquals(uow1, uow2) == true
}
```

适用场景：数据库上下文（DbContext）、工作单元、用户会话相关服务、缓存作用域服务。

#### 3.4.3 Singleton（单例）

整个应用生命周期内只有一个实例。所有请求、所有作用域共享同一个实例。Singleton 服务必须是线程安全的，因为可能被多个线程并发访问。

```csharp
services.AddSingleton<IClock, SystemClock>();
services.AddSingleton<ILoggerFactory, LoggerFactory>();

// 不同时间、不同作用域解析都得到同一实例
var clock1 = provider.GetService<IClock>();
var clock2 = provider.GetService<IClock>();
// ReferenceEquals(clock1, clock2) == true
```

适用场景：全局配置、缓存、线程池、无状态服务、昂贵创建成本的服务。

#### 3.4.4 生命周期约束规则

服务之间的依赖关系必须遵循以下规则，否则容器在解析时会抛出异常：

- **Singleton 可以依赖 Singleton**：可以
- **Singleton 可以依赖 Scoped**：禁止（会导致 Scoped 服务被提升为 Singleton，引发并发问题）
- **Singleton 可以依赖 Transient**：可以，但 Transient 服务实际上变成了 Singleton
- **Scoped 可以依赖 Singleton**：可以
- **Scoped 可以依赖 Scoped**：可以
- **Scoped 可以依赖 Transient**：可以
- **Transient 可以依赖任何生命周期**：可以

可以用矩阵表示：

| 消费者 \ 依赖 | Singleton | Scoped | Transient |
|---------------|-----------|--------|-----------|
| Singleton     | 可以      | 禁止   | 可以*     |
| Scoped        | 可以      | 可以   | 可以      |
| Transient     | 可以      | 可以   | 可以      |

*Singleton 依赖 Transient 时，Transient 实际上被提升为 Singleton。

这条规则的内在逻辑是：**服务的生命周期不能短于其依赖的生命周期**。如果一个 Singleton 依赖一个 Scoped，那么 Scoped 服务会被 Singleton 长期持有，相当于变成了 Singleton，这就破坏了 Scoped 的语义，可能导致多请求间的状态污染。

### 3.5 容器（Container）

容器是 DI 的核心组件，负责管理服务的注册、解析和释放。.NET 的容器由两个核心接口表示：

**IServiceCollection**：服务集合，用于在应用启动时注册服务。这是一个可变的列表，`AddTransient`、`AddScoped`、`AddSingleton` 方法都会向这个列表添加服务描述符。

```csharp
public interface IServiceCollection : IList<ServiceDescriptor> { }

public class ServiceDescriptor
{
    public Type ServiceType { get; }          // 服务类型
    public Type? ImplementationType { get; }   // 实现类型
    public object? ImplementationInstance { get; }  // 实现实例
    public Func<IServiceProvider, object>? ImplementationFactory { get; }  // 工厂
    public ServiceLifetime Lifetime { get; }   // 生命周期
}
```

**IServiceProvider**：服务提供者，用于在运行时解析服务。这个接口非常简洁，只有一个 `GetService` 方法。

```csharp
public interface IServiceProvider
{
    object? GetService(Type serviceType);
}
```

**IServiceScope**：服务作用域，用于创建 Scoped 服务的隔离作用域。

```csharp
public interface IServiceScope : IDisposable
{
    IServiceProvider ServiceProvider { get; }
}
```

容器内部维护着一个服务描述符列表（`List<ServiceDescriptor>`），当请求服务时，容器会查找对应的描述符，根据生命周期和实现类型创建或复用实例。

### 3.6 服务描述符（ServiceDescriptor）

`ServiceDescriptor` 是 .NET DI 容器中描述服务注册的核心数据结构。每个 `Add*` 调用都会创建一个 `ServiceDescriptor` 并添加到 `IServiceCollection` 中。

```csharp
public abstract class ServiceDescriptor
{
    // 通过类型注册
    public static ServiceDescriptor Describe(
        Type serviceType,
        Type implementationType,
        ServiceLifetime lifetime);
    
    // 通过工厂注册
    public static ServiceDescriptor Describe(
        Type serviceType,
        Func<IServiceProvider, object> implementationFactory,
        ServiceLifetime lifetime);
    
    // 通过实例注册
    public static ServiceDescriptor Describe(
        Type serviceType,
        object implementationInstance);
}
```

理解 `ServiceDescriptor` 有助于调试 DI 问题。你可以遍历 `IServiceCollection` 查看所有已注册的服务：

```csharp
foreach (var descriptor in services)
{
    Console.WriteLine(
        $"{descriptor.ServiceType.Name} -> {descriptor.ImplementationType?.Name ?? "Factory/Instance"} ({descriptor.Lifetime})");
}
```

## 四、工作原理

理解 DI 容器的工作原理，对于写出正确的 DI 代码、调试 DI 相关问题至关重要。本节深入剖析 .NET DI 容器的内部机制。

### 4.1 注册阶段

应用启动时，所有服务注册都会被追加到 `IServiceCollection` 中。`IServiceCollection` 的默认实现是 `ServiceCollection`，它本质上是一个 `List<ServiceDescriptor>`。

```csharp
public class ServiceCollection : IServiceCollection
{
    private readonly List<ServiceDescriptor> _descriptors = new();
    
    public ServiceCollection()
    {
        // 构造函数
    }
    
    // 实现 IList<ServiceDescriptor> 接口
    public int Count => _descriptors.Count;
    public ServiceDescriptor this[int index]
    {
        get => _descriptors[index];
        set => _descriptors[index] = value;
    }
    
    // Add、Remove 等方法委托给 _descriptors
}
```

`AddTransient`、`AddScoped`、`AddSingleton` 这些扩展方法本质上都是创建 `ServiceDescriptor` 并添加到集合中：

```csharp
public static class ServiceCollectionServiceExtensions
{
    public static IServiceCollection AddTransient<TService, TImplementation>(
        this IServiceCollection services)
        where TImplementation : class, TService
    {
        return services.Add(
            ServiceDescriptor.Transient<TService, TImplementation>());
    }
    
    public static IServiceCollection Add(
        this IServiceCollection services,
        ServiceDescriptor descriptor)
    {
        services.Add(descriptor);
        return services;
    }
}
```

注意：同一个接口可以注册多次（多注册）。这种情况下，`GetService<T>` 返回最后注册的实现，`GetServices<T>` 返回所有实现。

```csharp
// 多注册示例
services.AddTransient<IValidator, UserValidator>();
services.AddTransient<IValidator, OrderValidator>();
services.AddTransient<IValidator, ProductValidator>();

// GetService 返回最后一个（ProductValidator）
var lastValidator = provider.GetService<IValidator>();

// GetServices 返回所有
var allValidators = provider.GetServices<IValidator>();  // 三个实例

// 注入 IEnumerable<IValidator> 也返回所有
public class ValidationService
{
    public ValidationService(IEnumerable<IValidator> validators)
    {
        // validators 包含三个实例
    }
}
```

### 4.2 构建 ServiceProvider

当所有服务注册完成后，调用 `BuildServiceProvider()` 创建 `IServiceProvider` 实例。这个方法会创建一个 `ServiceProvider` 对象，它内部维护着服务描述符的索引、单例缓存、作用域管理器等。

```csharp
public static class ServiceProviderServiceExtensions
{
    public static ServiceProvider BuildServiceProvider(
        this IServiceCollection services,
        ServiceProviderOptions options)
    {
        return new ServiceProvider(services, options);
    }
}
```

`ServiceProvider` 的核心字段包括：

```csharp
internal sealed class ServiceProvider : IServiceProvider, IDisposable
{
    private readonly ServiceCollection _collection;          // 服务描述符集合
    private readonly ConcurrentDictionary<Type, Func<IServiceProvider, object>> _realizedServices;  // 已编译的服务工厂
    private readonly Dictionary<ServiceIdentifier, ServiceDescriptor> _descriptorLookup;  // 服务查找表
    private ServiceProviderEngine _engine;                  // 服务引擎
    private readonly ServiceProviderEngineScope _root;      // 根作用域
    private readonly object _lock = new();
}
```

`BuildServiceProvider()` 时，容器会进行以下操作：
1. 校验服务描述符，确保没有循环依赖（在解析时才会真正检测）
2. 构建服务查找表（`Dictionary<ServiceIdentifier, ServiceDescriptor>`），加快解析速度
3. 创建根作用域（`_root`），Singleton 服务实例将存放在这里

### 4.3 解析阶段

当调用 `GetService<T>()` 时，容器需要根据服务描述符创建或返回服务实例。这个过程是 DI 容器最复杂的部分，涉及依赖图遍历、生命周期管理、循环依赖检测等。

#### 4.3.1 简单解析

对于直接注册了实现类型的服务，解析过程相对简单：

```csharp
// 注册
services.AddTransient<IUserRepository, SqlUserRepository>();

// 解析
var repository = provider.GetService<IUserRepository>();
```

容器执行步骤：
1. 在 `_descriptorLookup` 中查找 `IUserRepository`，找到描述符
2. 描述符的实现类型是 `SqlUserRepository`，生命周期是 Transient
3. 由于是 Transient，每次都创建新实例
4. 通过反射读取 `SqlUserRepository` 的构造函数，发现需要 `DbContext` 和 `ILogger<SqlUserRepository>`
5. 递归解析 `DbContext` 和 `ILogger<SqlUserRepository>`
6. 使用编译好的表达式或反射创建 `SqlUserRepository` 实例
7. 返回实例

#### 4.3.2 依赖图遍历

当服务有依赖时，容器会递归遍历依赖图。假设有以下注册：

```csharp
services.AddSingleton<ILoggerFactory, LoggerFactory>();
services.AddDbContext<DbContext>();  // Scoped
services.AddScoped<IUserRepository, SqlUserRepository>();
services.AddScoped<IUserService, UserService>();
```

`UserService` 类定义：

```csharp
public class UserService
{
    public UserService(IUserRepository repository, ILogger<UserService> logger) { }
}

public class SqlUserRepository : IUserRepository
{
    public SqlUserRepository(DbContext context, ILogger<SqlUserRepository> logger) { }
}
```

解析 `IUserService` 时，依赖图如下：

```
IUserService
└── UserService
    ├── IUserRepository
    │   └── SqlUserRepository
    │       ├── DbContext (Scoped)
    │       └── ILogger<SqlUserRepository>
    │           └── LoggerFactory (Singleton)
    └── ILogger<UserService>
        └── LoggerFactory (Singleton)
```

容器递归遍历这个图，从叶子节点开始创建实例，最终创建出 `UserService`。

#### 4.3.3 循环依赖检测

如果 A 依赖 B，B 依赖 A，就会形成循环依赖。.NET DI 容器会在解析时检测循环依赖并抛出异常：

```csharp
// 循环依赖示例
public class A
{
    public A(B b) { }  // A 依赖 B
}

public class B
{
    public B(A a) { }  // B 依赖 A
}

services.AddTransient<A>();
services.AddTransient<B>();

// 解析 A 时抛出异常
// InvalidOperationException: A circular dependency was detected
var a = provider.GetService<A>();
```

容器通过"解析中的调用栈"检测循环：解析 A 时，记录 A 正在被解析；解析 A 的依赖 B 时，记录 B 正在被解析；解析 B 的依赖 A 时，发现 A 已经在解析栈中，判定为循环依赖。

#### 4.3.4 生命周期管理

不同生命周期的服务，解析时机和存储位置不同：

**Singleton**：第一次解析时创建，存放在根作用域（`_root`）的缓存中。后续所有解析都返回同一个实例。Singleton 的创建需要加锁，防止多线程并发创建多个实例。

```csharp
// 简化的 Singleton 解析逻辑
private object GetSingleton(Type serviceType)
{
    if (_singletons.TryGetValue(serviceType, out var instance))
    {
        return instance;  // 缓存命中
    }
    
    lock (_lock)
    {
        if (_singletons.TryGetValue(serviceType, out instance))
        {
            return instance;  // 双重检查锁定
        }
        
        instance = CreateInstance(serviceType);  // 创建实例
        _singletons[serviceType] = instance;     // 缓存
        return instance;
    }
}
```

**Scoped**：每个作用域维护自己的 Scoped 实例缓存。第一次在作用域内解析时创建，存放在当前作用域的缓存中。同一作用域内后续解析返回同一实例。

```csharp
// 简化的 Scoped 解析逻辑
private object GetScoped(Type serviceType, IServiceScope scope)
{
    var cache = (Dictionary<Type, object>)scope.Cache;
    
    if (cache.TryGetValue(serviceType, out var instance))
    {
        return instance;
    }
    
    instance = CreateInstance(serviceType);
    cache[serviceType] = instance;
    return instance;
}
```

**Transient**：每次解析都创建新实例，不缓存。

#### 4.3.5 实例创建优化

容器创建实例有两种方式：反射和编译表达式。

首次解析某个服务时，容器使用反射读取构造函数并创建实例。同时，容器会构建一个 `Func<IServiceProvider, object>` 委托，该委托封装了"如何创建这个实例"的逻辑。这个委托会被缓存，后续解析直接调用委托，避免反射开销。

```csharp
// 简化的表达式构建
private Func<IServiceProvider, object> BuildFactory(Type implementationType)
{
    var constructor = SelectConstructor(implementationType);
    var parameters = constructor.GetParameters();
    
    // 构建表达式：provider => new SqlUserRepository(
    //     (DbContext)provider.GetService(typeof(DbContext)),
    //     (ILogger<SqlUserRepository>)provider.GetService(typeof(ILogger<SqlUserRepository>)))
    var providerParam = Expression.Parameter(typeof(IServiceProvider), "provider");
    var parameterExpressions = parameters.Select(p =>
    {
        var getServiceCall = Expression.Call(
            providerParam,
            nameof(IServiceProvider.GetService),
            Type.EmptyTypes,
            Expression.Constant(p.ParameterType));
        return Expression.Convert(getServiceCall, p.ParameterType);
    });
    
    var newExpression = Expression.New(constructor, parameterExpressions);
    var lambda = Expression.Lambda<Func<IServiceProvider, object>>(
        Expression.Convert(newExpression, typeof(object)), 
        providerParam);
    
    return lambda.Compile();
}
```

这种"反射一次、编译表达式、后续直接调用"的策略，使得 .NET DI 容器在解析性能上接近手写代码。

### 4.4 释放阶段

容器实现了 `IDisposable` 接口，释放时会调用所有实现了 `IDisposable` 或 `IAsyncDisposable` 的服务实例的 `Dispose` 或 `DisposeAsync` 方法。

释放顺序与创建顺序相反：后创建的先释放。这保证了依赖关系不会被破坏——如果 A 依赖 B，A 会先被释放，然后才是 B。

```csharp
public sealed class ServiceProviderEngineScope : IServiceScope, IServiceProvider, IDisposable, IAsyncDisposable
{
    private readonly List<object> _disposables = new();
    
    public void Dispose()
    {
    // 按创建的逆序释放
        for (int i = _disposables.Count - 1; i >= 0; i--)
        {
            var disposable = _disposables[i];
            if (disposable is IAsyncDisposable asyncDisposable)
            {
                asyncDisposable.DisposeAsync().AsTask().GetAwaiter().GetResult();
            }
            else if (disposable is IDisposable syncDisposable)
            {
                syncDisposable.Dispose();
            }
        }
        _disposables.Clear();
    }
    
    public async ValueTask DisposeAsync()
    {
        // 异步释放，避免阻塞
        for (int i = _disposables.Count - 1; i >= 0; i--)
        {
            var disposable = _disposables[i];
            if (disposable is IAsyncDisposable asyncDisposable)
            {
                await asyncDisposable.DisposeAsync();
            }
            else if (disposable is IDisposable syncDisposable)
            {
                syncDisposable.Dispose();
            }
        }
        _disposables.Clear();
    }
}
```

在 ASP.NET Core 中，每次 HTTP 请求结束时，请求作用域会被释放，作用域内所有 Scoped 服务（如 DbContext）都会被释放。这是为什么 DbContext 不应该被注册为 Singleton——Singleton 服务永远不会被容器释放（直到应用关闭）。

## 五、快速上手

本节通过一个完整的例子，演示如何在 .NET 应用中使用依赖注入。

### 5.1 创建项目

首先创建一个控制台应用：

```bash
dotnet new console -n DiDemo
cd DiDemo
```

添加 DI 包：

```bash
dotnet add package Microsoft.Extensions.DependencyInjection
dotnet add package Microsoft.Extensions.Hosting
dotnet add package Microsoft.Extensions.Logging
```

### 5.2 定义服务接口与实现

```csharp
// 服务接口
public interface IGreetingService
{
    string Greet(string name);
}

public interface IDateTimeService
{
    DateTime Now { get; }
}

// 服务实现
public class GreetingService : IGreetingService
{
    private readonly IDateTimeService _dateTimeService;
    private readonly ILogger<GreetingService> _logger;

    // 构造函数注入
    public GreetingService(IDateTimeService dateTimeService, ILogger<GreetingService> logger)
    {
        _dateTimeService = dateTimeService;
        _logger = logger;
    }

    public string Greet(string name)
    {
        _logger.LogInformation("问候用户: {Name}", name);
        var timeOfDay = _dateTimeService.Now.Hour switch
        {
            < 12 => "上午好",
            < 18 => "下午好",
            _ => "晚上好"
        };
        return $"{name}，{timeOfDay}！";
    }
}

public class SystemDateTimeService : IDateTimeService
{
    public DateTime Now => DateTime.Now;
}

// 用于测试的固定时间服务
public class FixedDateTimeService : IDateTimeService
{
    public DateTime Now { get; set; } = new DateTime(2024, 1, 1, 10, 0, 0);
}
```

### 5.3 配置 DI 容器

```csharp
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

var host = Host.CreateDefaultBuilder(args)
    .ConfigureServices((context, services) =>
    {
        // 注册服务
        services.AddSingleton<IDateTimeService, SystemDateTimeService>();
        services.AddTransient<IGreetingService, GreetingService>();
    })
    .Build();

// 解析服务并使用
var greetingService = host.Services.GetRequiredService<IGreetingService>();
Console.WriteLine(greetingService.Greet("张三"));

await host.RunAsync();
```

运行结果：

```
info: GreetingService[0] 问候用户: 张三
张三，下午好！
```

### 5.4 理解解析方法

`IServiceProvider` 提供了几个扩展方法用于解析服务：

```csharp
// GetService：找不到时返回 null
var service = provider.GetService<IGreetingService>();

// GetRequiredService：找不到时抛出异常
var required = provider.GetRequiredService<IGreetingService>();

// GetServices：返回所有注册的实现
var all = provider.GetServices<IGreetingService>();

// GetKeyedService（.NET 8+）：根据键解析
var keyed = provider.GetKeyedService<ICache>("redis");

// CreateScope：创建新的作用域
using var scope = provider.CreateScope();
var scopedService = scope.ServiceProvider.GetRequiredService<IScopedService>();
```

## 六、基础示例

本节通过更多示例演示 DI 的常见用法。

### 6.1 不同生命周期的对比

```csharp
using Microsoft.Extensions.DependencyInjection;

var services = new ServiceCollection();

// 注册三种生命周期
services.AddSingleton<IGuidService, SingletonGuidService>();
services.AddScoped<IGuidService, ScopedGuidService>();
services.AddTransient<IGuidService, TransientGuidService>();

// 但这里有问题：同一接口多次注册会覆盖
// 应该分开注册
services.AddSingleton<ISingletonGuid, SingletonGuidService>();
services.AddScoped<IScopedGuid, ScopedGuidService>();
services.AddTransient<ITransientGuid, TransientGuidService>();

var provider = services.BuildServiceProvider();

Console.WriteLine("=== 根作用域 ===");
var s1 = provider.GetRequiredService<ISingletonGuid>();
var s2 = provider.GetRequiredService<ISingletonGuid>();
Console.WriteLine($"Singleton 1: {s1.Value}");
Console.WriteLine($"Singleton 2: {s2.Value}");
Console.WriteLine($"Singleton 相等: {ReferenceEquals(s1, s2)}");

var t1 = provider.GetRequiredService<ITransientGuid>();
var t2 = provider.GetRequiredService<ITransientGuid>();
Console.WriteLine($"Transient 1: {t1.Value}");
Console.WriteLine($"Transient 2: {t2.Value}");
Console.WriteLine($"Transient 相等: {ReferenceEquals(t1, t2)}");

Console.WriteLine("\n=== 子作用域 ===");
using (var scope1 = provider.CreateScope())
using (var scope2 = provider.CreateScope())
{
    var sc1_a = scope1.ServiceProvider.GetRequiredService<IScopedGuid>();
    var sc1_b = scope1.ServiceProvider.GetRequiredService<IScopedGuid>();
    Console.WriteLine($"Scope1 Scoped a: {sc1_a.Value}");
    Console.WriteLine($"Scope1 Scoped b: {sc1_b.Value}");
    Console.WriteLine($"Scope1 内相等: {ReferenceEquals(sc1_a, sc1_b)}");

    var sc2 = scope2.ServiceProvider.GetRequiredService<IScopedGuid>();
    Console.WriteLine($"Scope2 Scoped: {sc2.Value}");
    Console.WriteLine($"Scope1 vs Scope2 相等: {ReferenceEquals(sc1_a, sc2)}");
}
```

运行结果示例：

```
=== 根作用域 ===
Singleton 1: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Singleton 2: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Singleton 相等: True

Transient 1: 11111111-2222-3333-4444-555555555555
Transient 2: 66666666-7777-8888-9999-aaaaaaaaaaaa
Transient 相等: False

=== 子作用域 ===
Scope1 Scoped a: bbbbbbbb-cccc-dddd-eeee-ffffffffffff
Scope1 Scoped b: bbbbbbbb-cccc-dddd-eeee-ffffffffffff
Scope1 内相等: True
Scope2 Scoped: 00000000-1111-2222-3333-444444444444
Scope1 vs Scope2 相等: False
```

### 6.2 多注册与解析

```csharp
// 多注册
services.AddSingleton<INotificationService, EmailNotificationService>();
services.AddSingleton<INotificationService, SmsNotificationService>();
services.AddSingleton<INotificationService, PushNotificationService>();

// 注入单个：返回最后注册的（PushNotificationService）
public class SingleConsumer
{
    public SingleConsumer(INotificationService notification)
    {
        // notification 是 PushNotificationService
    }
}

// 注入 IEnumerable<INotificationService>：返回所有
public class MultiConsumer
{
    private readonly IEnumerable<INotificationService> _notifications;

    public MultiConsumer(IEnumerable<INotificationService> notifications)
    {
        _notifications = notifications;
        // 包含三个实例
    }

    public void NotifyAll(string message)
    {
        foreach (var notification in _notifications)
        {
            notification.Send(message);
        }
    }
}
```

### 6.3 工厂注册

工厂注册适用于需要根据条件创建不同实现的场景：

```csharp
// 根据配置选择实现
services.AddSingleton<ICache>(provider =>
{
    var config = provider.GetRequiredService<IConfiguration>();
    var cacheType = config["Cache:Type"];
    
    return cacheType switch
    {
        "Redis" => new RedisCache(config.GetConnectionString("Redis")!),
        "Memory" => new MemoryCache(),
        _ => throw new InvalidOperationException($"未知的缓存类型: {cacheType}")
    };
});
```

### 6.4 解耦与测试

DI 的最大价值之一是让代码可测试。考虑以下业务逻辑：

```csharp
public interface IUserRepository
{
    Task<User?> GetByIdAsync(int id);
}

public interface IEmailSender
{
    Task SendAsync(string to, string subject, string body);
}

public class UserService
{
    private readonly IUserRepository _repository;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<UserService> _logger;

    public UserService(
        IUserRepository repository,
        IEmailSender emailSender,
        ILogger<UserService> logger)
    {
        _repository = repository;
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task<bool> NotifyUserAsync(int userId, string message)
    {
        var user = await _repository.GetByIdAsync(userId);
        if (user is null)
        {
            _logger.LogWarning("用户不存在: {UserId}", userId);
            return false;
        }

        await _emailSender.SendAsync(user.Email, "通知", message);
        return true;
    }
}
```

单元测试：

```csharp
using Moq;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

public class UserServiceTests
{
    [Fact]
    public async Task NotifyUserAsync_UserExists_SendsEmail()
    {
        // 安排
        var mockRepo = new Mock<IUserRepository>();
        mockRepo.Setup(r => r.GetByIdAsync(1))
                .ReturnsAsync(new User { Id = 1, Email = "test@test.com" });

        var mockEmail = new Mock<IEmailSender>();
        var logger = NullLogger<UserService>.Instance;
        var service = new UserService(mockRepo.Object, mockEmail.Object, logger);

        // 执行
        var result = await service.NotifyUserAsync(1, "Hello");

        // 断言
        Assert.True(result);
        mockEmail.Verify(
            e => e.SendAsync("test@test.com", "通知", "Hello"),
            Times.Once);
    }

    [Fact]
    public async Task NotifyUserAsync_UserNotExists_ReturnsFalse()
    {
        // 安排
        var mockRepo = new Mock<IUserRepository>();
        mockRepo.Setup(r => r.GetByIdAsync(999))
                .ReturnsAsync((User?)null);

        var mockEmail = new Mock<IEmailSender>();
        var logger = NullLogger<UserService>.Instance;
        var service = new UserService(mockRepo.Object, mockEmail.Object, logger);

        // 执行
        var result = await service.NotifyUserAsync(999, "Hello");

        // 断言
        Assert.False(result);
        mockEmail.Verify(
            e => e.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }
}
```

## 七、进阶用法

### 7.1 Scrutor 自动注册

当服务数量增多时，手动注册变得繁琐。Scrutor 库提供了基于程序集扫描的自动注册功能：

```bash
dotnet add package Scrutor
```

```csharp
using Scrutor;

// 扫描当前程序集，自动注册所有继承 IServiceMarker 的类
services.Scan(scan => scan
    .FromAssemblyOf<Program>()
        .AddClasses(classes => classes.AssignableTo<IServiceMarker>())
            .AsMatchingInterface()  // 自动匹配接口（UserRepository -> IUserRepository）
            .WithScopedLifetime()
        .AddClasses(classes => classes.Where(c => c.Name.EndsWith("Repository")))
            .AsImplementedInterfaces()
            .WithScopedLifetime()
        .AddClasses(classes => classes.Where(c => c.Name.EndsWith("Service")))
            .AsImplementedInterfaces()
            .WithTransientLifetime());

// 装饰器模式
services.Decorate<IOrderProcessor, LoggingOrderProcessor>();
services.Decorate<IOrderProcessor, CachingOrderProcessor>();
```

### 7.2 键控服务（.NET 8+）

.NET 8 引入了键控服务，允许同一接口注册多个实现并通过键解析：

```csharp
// 注册键控服务
builder.Services.AddKeyedSingleton<ICache, MemoryCache>("memory");
builder.Services.AddKeyedSingleton<ICache, RedisCache>("redis");
builder.Services.AddKeyedSingleton<ICache, FileCache>("file");

// 通过键解析
public class CacheService
{
    private readonly ICache _cache;

    public CacheService([FromKeyedServices("redis")] ICache cache)
    {
        _cache = cache;
    }
}

// 或在工厂方法中解析
builder.Services.AddSingleton<ICacheManager>(provider =>
{
    return new CacheManager(provider.GetKeyedService<ICache>("redis")!);
});
```

键控服务解决了长期以来"同一接口多实现如何选择"的痛点。在 .NET 8 之前，通常需要通过工厂方法或自定义工厂接口实现，代码较为繁琐。

### 7.3 第三方容器集成

当内置容器无法满足需求时，可以替换为 Autofac、Lamar 等功能更强的第三方容器：

```csharp
// 安装 Autofac
// dotnet add package Autofac.Extensions.DependencyInjection

var builder = Host.CreateDefaultBuilder(args);

builder.UseServiceProviderFactory(new AutofacServiceProviderFactory())
    .ConfigureContainer<ContainerBuilder>(containerBuilder =>
    {
        // Autofac 特有的注册方式
        containerBuilder.RegisterType<SqlUserRepository>()
                        .As<IUserRepository>()
                        .InstancePerLifetimeScope();

        // 模块化注册
        containerBuilder.RegisterModule<DataAccessModule>();
        containerBuilder.RegisterModule<BusinessModule>();
    });

builder.ConfigureServices(services =>
{
    services.AddControllers();
});

var app = builder.Build();
```

Autofac 等第三方容器提供了内置容器不具备的功能：属性注入、AOP、模块化、命名服务、动态代理等。

### 7.4 选项模式与 DI

选项模式（Options Pattern）是 .NET 中管理配置的标准方式，它与 DI 紧密集成：

```csharp
// 配置类
public class RedisOptions
{
    public string ConnectionString { get; set; } = string.Empty;
    public int Database { get; set; } = 0;
    public TimeSpan DefaultExpiry { get; set; } = TimeSpan.FromMinutes(30);
}

// appsettings.json
/*
{
  "Redis": {
    "ConnectionString": "localhost:6379",
    "Database": 1,
    "DefaultExpiry": "00:15:00"
  }
}
*/

// 注册配置
builder.Services.Configure<RedisOptions>(
    builder.Configuration.GetSection("Redis"));

// 使用配置
public class RedisCache : ICache
{
    private readonly RedisOptions _options;

    // IOptions<T> 是单例，值在启动时绑定
    // IOptionsSnapshot<T> 是 scoped，每次请求重新绑定
    // IOptionsMonitor<T> 是单例，支持配置变更通知
    public RedisCache(IOptions<RedisOptions> options)
    {
        _options = options.Value;
    }
}
```

### 7.5 HttpClientFactory 与 DI

`HttpClientFactory` 是 .NET 中管理 HTTP 客户端的标准方式，它通过 DI 解决了 `HttpClient` 的 socket 耗尽和 DNS 更新问题：

```csharp
// 注册命名客户端
builder.Services.AddHttpClient("github", client =>
{
    client.BaseAddress = new Uri("https://api.github.com/");
    client.DefaultRequestHeaders.Add("Accept", "application/vnd.github.v3+json");
    client.DefaultRequestHeaders.Add("User-Agent", "MyApp/1.0");
});

// 注册类型化客户端
builder.Services.AddHttpClient<IGitHubService, GitHubService>(client =>
{
    client.BaseAddress = new Uri("https://api.github.com/");
});

// 使用
public class GitHubService : IGitHubService
{
    private readonly HttpClient _client;

    public GitHubService(HttpClient client)
    {
        _client = client;
    }

    public async Task<User?> GetUserAsync(string username)
    {
        return await _client.GetFromJsonAsync<User>($"users/{username}");
    }
}

// 解析命名客户端
public class GitHubConsumer
{
    private readonly IHttpClientFactory _factory;

    public GitHubConsumer(IHttpClientFactory factory)
    {
        _factory = factory;
    }

    public async Task FetchAsync()
    {
        var client = _factory.CreateClient("github");
        // 使用客户端
    }
}
```

## 八、性能考量

依赖注入虽然带来了架构上的好处，但也有性能开销。本节分析 DI 的性能特点及优化策略。

### 8.1 解析开销

DI 解析的开销主要来自三个方面：

**反射开销**：首次解析服务时，容器需要通过反射读取构造函数、分析参数类型。这部分开销在容器启动后逐渐降低，因为容器会编译表达式树并缓存。

**委托调用开销**：每次解析服务都要调用编译好的委托，这比直接 `new` 慢约 10-50 倍。

**线程同步开销**：Singleton 服务的创建需要加锁，在多线程环境下可能成为瓶颈。

下面是一个简单的性能对比：

```csharp
public class Benchmark
{
    [Benchmark(Baseline = true)]
    public void DirectNew()
    {
        var service = new SimpleService();
    }

    [Benchmark]
    public void DIResolve()
    {
        var service = _provider.GetRequiredService<SimpleService>();
    }
}
```

基准测试结果（示例）：

| 方法 | 平均时间 | 比率 |
|------|----------|------|
| DirectNew | 5 ns | 1.00x |
| DIResolve | 120 ns | 24x |

虽然 DI 解析比直接 `new` 慢 20+ 倍，但绝对值仍在纳秒级别，对于大多数应用（请求处理时间在毫秒级）几乎无影响。但在性能敏感的循环中，应避免频繁解析。

### 8.2 内存开销

DI 容器本身会占用一定内存：
- 服务描述符列表：每个注册占用约 50-100 字节
- 编译的委托缓存：每个解析过的服务占用约 200-500 字节
- Singleton 实例缓存：取决于实际服务大小

对于大型应用，可能有数百到数千个服务注册，总内存占用在 MB 级别，可以忽略。

### 8.3 优化策略

**1. 合理选择生命周期**

Singleton 的解析最快（直接从缓存读取），Transient 最慢（每次都创建）。对于无状态服务，优先 Singleton。

**2. 避免热路径解析**

```csharp
// 不推荐：在循环中解析
public async Task ProcessAllAsync(IEnumerable<int> ids)
{
    foreach (var id in ids)
    {
        var processor = _provider.GetRequiredService<IProcessor>();  // 每次循环都解析
        await processor.ProcessAsync(id);
    }
}

// 推荐：在循环外解析
public async Task ProcessAllAsync(IEnumerable<int> ids)
{
    var processor = _provider.GetRequiredService<IProcessor>();  // 只解析一次
    foreach (var id in ids)
    {
        await processor.ProcessAsync(id);
    }
}
```

**3. 使用 IServiceProviderIsService 进行条件检查**

```csharp
// 检查服务是否注册，避免抛出异常
if (_provider.GetService<IOptionalService>() is { } optional)
{
    // 使用 optional
}
```

**4. 编译时 DI**

.NET 9+ 引入了 Source Generator 支持的编译时 DI，可以消除运行时反射开销。目前还需要手动配置，未来可能成为默认。

## 九、最佳实践

### 9.1 服务设计原则

**1. 依赖抽象，不依赖实现**

```csharp
// 不好：依赖具体类
public class OrderService
{
    public OrderService(SqlUserRepository repository) { }
}

// 好：依赖接口
public class OrderService
{
    public OrderService(IUserRepository repository) { }
}
```

**2. 构造函数注入优先**

构造函数注入让依赖关系显式可见，且保证对象创建后即可使用。

**3. 单一构造函数**

如果一个类有多个构造函数，容器会选择参数最多的那个能解析的构造函数。这可能导致意外行为。建议只保留一个构造函数。

**4. 避免服务定位器**

```csharp
// 不好：服务定位器模式
public class OrderService
{
    private readonly IServiceProvider _provider;

    public OrderService(IServiceProvider provider)
    {
        _provider = provider;
    }

    public void Process(Order order)
    {
        var repo = _provider.GetRequiredService<IUserRepository>();  // 隐藏依赖
    }
}

// 好：显式依赖
public class OrderService
{
    private readonly IUserRepository _repository;

    public OrderService(IUserRepository repository)
    {
        _repository = repository;
    }
}
```

### 9.2 注册组织

**1. 按模块组织注册**

```csharp
// 在每个模块中提供扩展方法
public static class DataAccessServiceCollectionExtensions
{
    public static IServiceCollection AddDataAccess(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(configuration.GetConnectionString("Default")));
        
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        
        return services;
    }
}

// 在 Program.cs 中组合
builder.Services.AddDataAccess(builder.Configuration);
builder.Services.AddBusinessServices();
builder.Services.AddInfrastructure(builder.Configuration);
```

**2. 避免在启动时解析 Singleton**

```csharp
// 不好：在配置阶段就解析服务
builder.Services.AddSingleton<IMyService>(sp =>
{
    var other = sp.GetRequiredService<IOtherService>();  // 此时容器还没完全构建
    return new MyService(other);
});
```

### 9.3 生命周期选择

| 场景 | 推荐生命周期 | 理由 |
|------|--------------|------|
| 无状态工具类 | Singleton | 共享实例，节省内存 |
| 数据库上下文 | Scoped | 每请求独立，避免并发问题 |
| HTTP 客户端 | Transient（通过 HttpClientFactory） | 由 factory 管理底层 socket |
| 配置对象 | Singleton | 启动时绑定，全局共享 |
| 缓存 | Singleton | 全局共享缓存数据 |
| 请求上下文 | Scoped | 每请求独立 |
| 临时计算服务 | Transient | 每次创建新实例，无状态污染 |

### 9.4 测试友好

**1. 接口优先**

所有可注入的服务都应通过接口暴露，便于 Mock。

**2. 避免静态成员**

静态成员无法被 DI 替换，破坏可测试性。

```csharp
// 不好：静态时间访问
public class UserService
{
    public void Register(User user)
    {
        user.CreatedAt = DateTime.Now;  // 静态调用，无法 Mock
    }
}

// 好：通过 DI 注入
public class UserService
{
    private readonly IDateTimeProvider _dateTime;

    public UserService(IDateTimeProvider dateTime)
    {
        _dateTime = dateTime;
    }

    public void Register(User user)
    {
        user.CreatedAt = _dateTime.Now;
    }
}
```

**3. 使用 ILogger<T> 而非具体日志器**

```csharp
// 好：使用泛型日志器
public class UserService
{
    private readonly ILogger<UserService> _logger;

    public UserService(ILogger<UserService> logger)
    {
        _logger = logger;
    }
}

// 测试时使用 NullLogger<UserService>.Instance
```

## 十、常见陷阱与反模式

### 10.1 Captive Dependency（囚禁依赖）

**问题**：Singleton 服务依赖 Scoped 服务，导致 Scoped 服务被"囚禁"为 Singleton。

```csharp
// 错误：Singleton 依赖 Scoped
public class MySingletonService
{
    private readonly DbContext _context;  // Scoped 服务！

    public MySingletonService(DbContext context)
    {
        _context = context;
    }
}

services.AddDbContext<DbContext>();  // 默认 Scoped
services.AddSingleton<MySingletonService>();  // Singleton
```

**后果**：`DbContext` 被长期持有，多个请求共享同一个 `DbContext`，导致并发冲突、连接泄漏。

**解决**：让 Singleton 不直接依赖 Scoped，改用 `IServiceScopeFactory` 在需要时创建作用域：

```csharp
public class MySingletonService : IDisposable
{
    private readonly IServiceScopeFactory _scopeFactory;

    public MySingletonService(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public async Task DoWorkAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<DbContext>();
        // 使用 context
    }

    public void Dispose() { }
}
```

### 10.2 服务定位器反模式

**问题**：通过 `IServiceProvider` 在方法内部解析依赖，隐藏真实依赖。

```csharp
// 反模式
public class OrderService
{
    private readonly IServiceProvider _provider;

    public OrderService(IServiceProvider provider)
    {
        _provider = provider;
    }

    public void Process(Order order)
    {
        // 隐藏依赖，难以测试
        var repo = _provider.GetRequiredService<IUserRepository>();
        var user = repo.GetById(order.UserId);
        // ...
    }
}
```

**解决**：显式声明依赖。

### 10.3 在 Singleton 中直接使用 Scoped

这个问题与 Captive Dependency 类似，但更隐蔽：

```csharp
// 在 Singleton 服务中使用 IOptionsSnapshot（Scoped）
public class MyService
{
    public MyService(IOptionsSnapshot<MyOptions> options)
    {
        // IOptionsSnapshot 是 Scoped，会抛出异常
    }
}

// 应该用 IOptions 或 IOptionsMonitor
public class MyService
{
    public MyService(IOptions<MyOptions> options)  // Singleton，OK
    {
    }
}
```

### 10.4 循环依赖

```csharp
// A 依赖 B，B 依赖 A
public class A
{
    public A(B b) { }
}

public class B
{
    public B(A a) { }
}

// 解析时抛出异常
// 解决：重构设计，打破循环
// 例如，引入事件或接口分离
```

### 10.5 忘记释放作用域

```csharp
// 错误：忘记释放作用域
public void Process()
{
    var scope = _provider.CreateScope();
    var service = scope.ServiceProvider.GetRequiredService<IScopedService>();
    service.DoWork();
    // 没有释放 scope，导致 Scoped 服务的 Dispose 不被调用
}

// 正确：使用 using
public void Process()
{
    using var scope = _provider.CreateScope();
    var service = scope.ServiceProvider.GetRequiredService<IScopedService>();
    service.DoWork();
}
```

### 10.6 在 Program.cs 中过度解析

```csharp
// 不推荐：在启动阶段就解析大量服务
var app = builder.Build();
var service1 = app.Services.GetRequiredService<IService1>();
var service2 = app.Services.GetRequiredService<IService2>();
// ... 大量解析
app.Run();
```

这种写法会让启动变慢，且可能引发 Captive Dependency 问题。应该在需要时再解析。

### 10.7 同一接口多注册的歧义

```csharp
services.AddSingleton<ICache, MemoryCache>();
services.AddSingleton<ICache, RedisCache>();

// 注入 ICache：返回 RedisCache（最后注册的）
public class Consumer
{
    public Consumer(ICache cache) { }  // 哪个实现？
}

// 应该使用键控服务或 IEnumerable
services.AddKeyedSingleton<ICache, MemoryCache>("memory");
services.AddKeyedSingleton<ICache, RedisCache>("redis");

// 或
public class Consumer
{
    public Consumer(IEnumerable<ICache> caches) { }
}
```

## 十一、对比与生态

### 11.1 与其他 DI 容器的对比

| 特性 | .NET 内置 | Autofac | Lamar | Scrutor |
|------|-----------|---------|-------|---------|
| 构造函数注入 | 是 | 是 | 是 | 是 |
| 属性注入 | 否 | 是 | 是 | 否 |
| 方法注入 | 是（Minimal API） | 是 | 是 | 否 |
| 自动注册 | 否 | 是 | 是 | 是 |
| 模块化 | 否 | 是 | 是 | 否 |
| AOP | 否 | 是（拦截器） | 是 | 否 |
| 键控服务 | 是（.NET 8+） | 是（命名服务） | 是 | 否 |
| 装饰器 | 否 | 是 | 是 | 是 |
| 性能 | 中等 | 中等 | 高 | 中等 |
| 学习成本 | 低 | 中 | 中 | 低 |

**何时使用第三方容器**：
- 需要属性注入：Autofac、Lamar
- 需要 AOP（如自动日志、事务）：Autofac + Castle DynamicProxy
- 需要模块化组织：Autofac Modules
- 需要更高性能：Lamar（.NET 6+ 优化）

**何时使用内置容器**：
- 大多数 ASP.NET Core 应用
- 不需要高级特性的项目
- 团队对 DI 不熟悉，希望降低学习成本

### 11.2 与 Java Spring 的对比

.NET DI 与 Java Spring 的 DI 在理念上相似，但实现和约定有差异：

| 特性 | .NET DI | Spring |
|------|---------|--------|
| 容器数量 | 通常 1 个 | 可有多个 ApplicationContext |
| 配置方式 | 代码配置为主 | 注解 + XML |
| 默认生命周期 | Transient | Singleton |
| 属性注入 | 不支持 | 支持（@Autowired） |
| AOP | 第三方 | 内置 |
| 条件注册 | 代码逻辑 | @Conditional |

Spring 默认 Singleton，.NET 默认 Transient（在 ASP.NET Core 中通常用 Scoped）。这反映了两个生态的哲学差异：Java/Spring 偏好全局共享、配置驱动；.NET 偏好显式控制、代码驱动。

### 11.3 与 Go Wire 的对比

Go 生态中的 Wire 是编译时 DI 工具，与 .NET 的运行时 DI 形成对比：

| 特性 | .NET DI | Go Wire |
|------|---------|---------|
| 时机 | 运行时 | 编译时 |
| 性能 | 有运行时开销 | 零开销（生成代码） |
| 灵活性 | 高（可动态注册） | 低（编译时固定） |
| 错误检测 | 运行时 | 编译时 |
| 配置 | 代码 | 代码 + 生成器 |

Wire 的优势是零运行时开销和编译时错误检测，劣势是缺乏灵活性。.NET 9+ 正在通过 Source Generator 引入类似的编译时 DI 能力。

## 十二、总结与展望

### 12.1 核心要点回顾

依赖注入是现代 .NET 应用的基石。通过本篇的学习，我们掌握了以下核心知识：

**理论层面**：依赖注入是控制反转原则的具体实现，依赖倒置原则是其理论基础。三者（IoC、DI、DIP）的关系是：DIP 是设计原则，IoC 是设计模式，DI 是 IoC 的具体技术实现。

**实践层面**：.NET 内置 DI 容器提供了三种生命周期（Transient、Scoped、Singleton）、三种注入方式（构造函数、属性、方法）、多种注册方式（类型、工厂、实例）。理解生命周期约束规则（不短于依赖）是避免 Captive Dependency 的关键。

**架构层面**：依赖注入让代码松耦合、可测试、可替换。通过接口抽象和构造函数注入，可以实现业务逻辑与基础设施的完全解耦。

**性能层面**：DI 解析有开销但通常可忽略。优化策略包括合理选择生命周期、避免热路径解析、使用编译时 DI。

### 12.2 实践建议

1. **从接口开始设计**：先定义服务接口，再考虑实现。这天然符合依赖倒置原则。

2. **构造函数注入优先**：显式声明依赖，避免隐藏的复杂性。

3. **按模块组织注册**：使用扩展方法将相关服务的注册封装在一起，让 Program.cs 保持简洁。

4. **重视单元测试**：DI 的最大价值之一是可测试性，应该充分利用。

5. **理解生命周期约束**：避免 Captive Dependency，遇到 Singleton 需要 Scoped 服务时使用 `IServiceScopeFactory`。

6. **使用选项模式管理配置**：通过 `IOptions<T>`、`IOptionsSnapshot<T>`、`IOptionsMonitor<T>` 管理强类型配置。

7. **善用 HttpClientFactory**：不要直接 `new HttpClient()`，通过 `AddHttpClient` 注册类型化客户端。

8. **考虑键控服务**：.NET 8+ 的键控服务让"同一接口多实现"问题有了优雅解法。

### 12.3 进阶学习路径

掌握基础后，可以进一步学习：

- **AOP 与装饰器**：使用 Autofac + Castle DynamicProxy 或 Scrutor 实现横切关注点（日志、事务、缓存）。
- **MediatR**：基于 DI 的中介者模式实现，用于解耦请求/响应处理。
- **EF Core 的 DI 集成**：理解 DbContext 的 Scoped 生命周期、DbContextFactory 的应用场景。
- **源生成器与编译时 DI**：了解 .NET 9+ 的 Source Generator 如何减少 DI 反射开销。
- **多容器隔离**：在插件化架构中，使用多个独立的 DI 容器实现插件隔离。

### 12.4 未来趋势

**编译时 DI**：随着 Native AOT 的推进，运行时反射的开销逐渐不可接受。Source Generator 驱动的编译时 DI 将成为趋势，容器在编译时生成所有解析代码，运行时零反射。

```csharp
// 未来可能的编译时 DI（概念）
[GenerateService]
public partial class ServiceProvider
{
    [ResolveMethod]
    public IUserRepository ResolveUserRepository() => new SqlUserRepository(ResolveDbContext());
}
```

**更智能的自动注册**：基于约定的自动注册会越来越普及，开发者只需定义接口和实现，容器自动扫描并注册。

**与函数式编程的融合**：C# 12+ 引入的主构造函数、记录类型等特性，让 DI 与函数式风格更协调。未来可能看到"轻量级 DI"模式，减少 ceremony。

**云原生优化**：容器、Serverless 场景下，应用启动速度至关重要。DI 容器的启动优化（懒加载、并行初始化）会成为重点。

### 12.5 结语

依赖注入不是银弹，但它是现代 .NET 应用架构的核心基础设施。理解 DI 的原理和最佳实践，是成为 .NET 高级开发者的必经之路。本篇涵盖了从理论到实践、从基础到进阶的完整知识体系，希望能够帮助你写出更松耦合、更可测试、更可维护的 .NET 代码。

记住，DI 的最终目的是让代码更清晰、更灵活。不要为了 DI 而 DI——简单的脚本、原型项目可以不使用 DI。但在任何需要长期维护、需要测试、需要团队协作的项目中，依赖注入都是值得的投资。

## 附录 A：常用扩展方法速查

```csharp
// 注册
services.AddTransient<TService, TImplementation>();
services.AddScoped<TService, TImplementation>();
services.AddSingleton<TService, TImplementation>();
services.AddSingleton<TService>(instance);
services.AddTransient<TService>(factory);

// 多注册
services.AddTransient<TService, TImpl1>();
services.AddTransient<TService, TImpl2>();

// 键控服务（.NET 8+）
services.AddKeyedSingleton<TService, TImpl>("key");
services.AddKeyedScoped<TService, TImpl>("key");
services.AddKeyedTransient<TService, TImpl>("key");

// 装饰器（Scrutor）
services.Decorate<TService, TDecorator>();

// 选项
services.Configure<TOptions>(configurationSection);
services.Configure<TOptions>(options => options.Property = value);

// HttpClient
services.AddHttpClient<TService>();
services.AddHttpClient("name", client => { });

// 解析（IServiceProvider 扩展）
provider.GetService<TService>();              // 返回 null 如果未注册
provider.GetRequiredService<TService>();      // 抛异常如果未注册
provider.GetServices<TService>();             // 返回所有实现
provider.GetKeyedService<TService>("key");    // 键控解析
provider.CreateScope();                        // 创建作用域
```

## 附录 B：调试 DI 问题

### B.1 查看所有注册

```csharp
foreach (var descriptor in services)
{
    Console.WriteLine(
        $"  {descriptor.ServiceType.Name} -> " +
        $"{descriptor.ImplementationType?.Name ?? descriptor.ImplementationInstance?.GetType().Name ?? "Factory"} " +
        $"({descriptor.Lifetime})");
}
```

### B.2 启用 DI 验证

```csharp
var host = Host.CreateDefaultBuilder(args)
    .UseDefaultServiceProvider((context, options) =>
    {
        options.ValidateScopes = true;   // 验证 Scoped 不能被 Singleton 捕获
        options.ValidateOnBuild = true;  // 构建时验证所有 Singleton 可解析
    })
    .Build();
```

### B.3 常见异常及原因

| 异常 | 原因 | 解决方案 |
|------|------|----------|
| `InvalidOperationException: Unable to resolve service` | 服务未注册 | 检查注册代码 |
| `InvalidOperationException: A circular dependency was detected` | 循环依赖 | 重构设计，打破循环 |
| `InvalidOperationException: Cannot consume scoped service from singleton` | Captive Dependency | 改用 IServiceScopeFactory |
| `InvalidOperationException: No service for type` | 类型不匹配 | 检查注册的接口与实现 |

## 附录 C：参考资源

- [官方文档：.NET 中的依赖注入](https://learn.microsoft.com/dotnet/core/extensions/dependency-injection)
- [官方文档：ASP.NET Core 中的依赖注入](https://learn.microsoft.com/aspnet/core/fundamentals/dependency-injection)
- [Martin Fowler：Inversion of Control Containers and the Dependency Injection pattern](https://martinfowler.com/articles/injection.html)
- [Microsoft.Extensions.DependencyInjection 源码](https://github.com/dotnet/runtime/tree/main/src/libraries/Microsoft.Extensions.DependencyInjection)
- [Scrutor 项目](https://github.com/khellang/Scrutor)
- [Autofac 文档](https://autofac.org/)
