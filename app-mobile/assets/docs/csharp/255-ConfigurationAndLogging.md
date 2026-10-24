---
order: 290
title: 配置系统与日志
module: 'csharp'
category: 后端技术
difficulty: beginner
description: IConfiguration 配置源与优先级、Options 模式三件套（IOptions/IOptionsSnapshot/IOptionsMonitor）、ILogger 生态、结构化日志与 LoggerMessage 源生成器。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'csharp/250-CSharpDotNet'
  - 'csharp/260-CSharpDependencyInjection'
  - 'csharp/310-AspNetCoreMiddlewarePipeline'
prerequisites: []
---

## 知识点地图

- **知识类别**：平台基建（.NET 配置系统与日志体系）。
- **解决什么问题**：连接串、密钥、功能开关不能写死在代码里，且要随环境（开发/测试/生产）切换甚至热更新；日志要在排障时回答「谁、何时、发生了什么、上下文是什么」。.NET 的答案是两套统一抽象：IConfiguration（多源聚合 + 强类型绑定）与 ILogger（门面 + 结构化事件 + 生态 Sink）。
- **什么时候用到**：任何 ASP.NET Core / Worker / 桌面项目的初始化阶段；排查「为什么生产环境读到开发配置」「配置改了服务没感知」「日志里搜不到关键字」时。

模块内此前无配置/日志专篇，两主题集中在 [C# 与 .NET 平台](/csharp/250-CSharpDotNet) 的 §2.5、§4.6、§4.7、§6.10、§7.3、§7.4，本文承接后扩为专篇。DI 容器机制本身见 [C# 依赖注入](/csharp/260-CSharpDependencyInjection)，日志在请求管道中的位置见 [ASP.NET Core 中间件管道](/csharp/310-AspNetCoreMiddlewarePipeline)。

## 1. 配置系统：多源聚合与优先级

### 1.1 心智模型（承接自原 250 §2.5）

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

翻译成人话：**后注册的源覆盖先注册的**。默认 ASP.NET Core 模板的注册顺序决定了经典优先级（低 -> 高）：

1. `appsettings.json`（基准）
2. `appsettings.{Environment}.json`（环境覆盖）
3. 用户机密（User Secrets，仅开发）
4. 环境变量（容器/CI 的主战场）
5. 命令行参数（临时覆盖最高）

```csharp
// 排查「为什么生产读到了开发值」的第一步：打印实际生效值
var jwtSecret = builder.Configuration["Jwt:Secret"];
Console.WriteLine($"Secret 前 4 位: {jwtSecret?[..4]}...");
```

- 配置键不区分大小写，冒号分层（环境变量里用双下划线 `Jwt__Secret` 映射冒号——容器部署的必备知识）；
- 「读到了意外值」几乎总是优先级问题：环境变量里躺着一个忘记删除的旧值。逐源排查而不是猜。

### 1.2 Options 模式：强类型绑定三件套（承接自原 250 §4.6 与 §7.3）

```csharp
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

// 使用 IOptions —— 单例语义：启动时绑定一次，之后不变
public class AuthService
{
    private readonly JwtOptions _options;

    public AuthService(IOptions<JwtOptions> options)
    {
        _options = options.Value;
    }
}

// IOptionsMonitor —— 单例 + 热更新：CurrentValue 始终最新，可订阅变更
public class TokenIssuer(IOptionsMonitor<JwtOptions> monitor)
{
    public string Issue() =>
        CreateToken(monitor.CurrentValue); // 每次调用读最新值

    public TokenIssuer()
    {
        monitor.OnChange(newOptions =>
        {
            // 配置变更回调：刷新内存中的签名密钥缓存等
            Console.WriteLine("Jwt config changed");
        });
    }
}

// IOptionsSnapshot —— Scoped 语义：同一请求内一致，不同请求可不同
public class TokenService(IOptionsSnapshot<JwtOptions> snapshot)
{
    public string GenerateToken()
    {
        var options = snapshot.Value;
        // ...
    }
}
```

三件套的选择判据（背下来）：

| 类型 | 生命周期 | 热更新 | 什么时候用 |
| --- | --- | --- | --- |
| `IOptions<T>` | Singleton | 不支持 | 配置天然不变（如算法开关） |
| `IOptionsSnapshot<T>` | Scoped | 请求间生效 | Web 请求内要求一致快照 |
| `IOptionsMonitor<T>` | Singleton | 即时生效 + OnChange | 后台服务/单例中的热更新 |

- `init` 属性 + `required` 修饰让 Options 对象在绑定后不可变——比 public setter 的旧式 Options 类安全；
- 校验在注册时做：`builder.Services.AddOptions<JwtOptions>().Bind(...).Validate(o => o.ExpireMinutes > 0).ValidateOnStart();`——坏配置在启动时炸而不是第一次请求时炸；
- **为什么不直接注入 `IConfiguration`**：`config["Jwt:Secret"]` 的字符串键没有编译期检查，改配置结构不会报错；Options 绑定把结构固化进类型，拼错在启动时暴露（原 250 §6.10 的反模式正是这个）：

```csharp
// 反模式（原 250 §6.10）：硬编码连接字符串
public class MyService
{
    private readonly string _connectionString = "Server=...;Database=...";
    // 换环境要改代码重编译；密钥进了源码库
}

// 正确：经配置注入
public class MyService(IConfiguration config)
{
    private readonly string _connectionString = config.GetConnectionString("Default");
}
```

### 1.3 自定义配置源（承接自原 250 §4.6 尾段）

```csharp
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

- `ConfigurationProvider.Data` 就是那个键值字典——自定义源的本质是「往字典里灌键值」；
- 实际工程更常见的两条捷径：环境变量源已内建（`AddEnvironmentVariables()`）；数据库/远端配置（Consul、Azure App Configuration）有现成 Provider 包，先找包再自己写。

## 2. 日志：ILogger 门面与结构化事件

### 2.1 ILogger&lt;T&gt; 门面（承接自原 250 §4.7）

```csharp
using Serilog;
using Serilog.Events;

// Serilog 配置（作为 ILogger 生态的一个 Sink 实现）
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
```

架构分层解释：

- **业务代码只认识 `ILogger<T>`**（Microsoft.Extensions.Logging.Abstractions 的门面），不认识 Serilog——换日志后端（Serilog -> NLog -> 云厂商 SDK）业务代码零修改，这是门面模式的教科书应用；
- **Sink/Provider 是可替换的输出端**：Console、File（按天滚动）、Seq（结构化日志服务器）各收一份；`Enrich.FromLogContext` 让请求级上下文（TraceId、用户名）自动附着到每条日志；
- `Log.CloseAndFlush()` 在 finally 里：异步缓冲的日志进程退出前必须冲刷，漏了这行会静默丢失最后一段日志。

### 2.2 结构化日志：占位符不是插值（承接自原 250 §7.4）

```csharp
// 使用结构化日志（参数化）
logger.LogInformation("User {UserId} logged in from {IP}", userId, ip);

// 避免：字符串拼接（无结构）
logger.LogInformation($"User {userId} logged in from {ip}");
```

- `$"..."` 版本在**调用前**就拼成最终字符串，日志系统只存一句话；占位符版本把 `{UserId}` 与参数作为**名值对**交给 Sink，Seq/ELK 里能按 `UserId = 42` 过滤聚合；
- 命名占位符与参数**按位置对应**（不是按名字）——`"Order {OrderId} for {UserId}"` 传参顺序颠倒会把值张冠李戴且不报错；
- 同一约定已在 [字符串处理与格式化](/csharp/066-StringHandlingAndFormatting) §5.1 从性能角度论证过：占位符版本在级别关闭时连参数求值都省掉。

### 2.3 LoggerMessage：源生成器的高性能日志（承接自原 250 §4.7 尾段）

```csharp
// 高性能日志源生成器（.NET 6+）
public partial class UserService
{
    [LoggerMessage(Level = LogLevel.Information, Message = "User {UserId} logged in")]
    public partial void LogLogin(int userId);

    [LoggerMessage(Level = LogLevel.Error, Message = "Order {OrderId} failed")]
    public partial void LogOrderFailed(int orderId, Exception ex);
}

// 调用
userService.LogLogin(42);
```

- 源生成器在编译期生成强类型日志方法：没有 params 装箱、没有模板解析（普通 `LogInformation("...{UserId}...", userId)` 每次要装箱 userId 并在首次解析模板）；
- 热路径日志（每请求多条）用它收益明显；常规业务日志用扩展方法即可——先量再换，别全文替换；
- 这是 [源生成器](/csharp/240-SourceGenerator) 机制的标准应用案例之一：编译期生成替代运行期反射。

### 2.4 日志级别与过滤

```csharp
// appsettings.json 里的级别过滤（Logging 段是约定键名）
// "Logging": {
//   "LogLevel": {
//     "Default": "Information",
//     "Microsoft.AspNetCore": "Warning",   // 框架日志降噪
//     "MyApp.Services.OrderService": "Debug" // 指定类放开
//   }
// }
```

- 级别语义：Trace > Debug > Information > Warning > Error > Critical（严重度递增，默认输出 Information 及以上）；
- 排障套路：全局保持 Information，怀疑哪个类临时放开它的 Debug——按命名空间过滤是 ILogger 内建能力，不需要改代码重编译。

## 3. 三个真实场景

### 3.1 Worker 服务读取定时任务配置并热更新

```csharp
public sealed class SyncWorker(IOptionsMonitor<SyncOptions> monitor, ILogger<SyncWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            var options = monitor.CurrentValue;      // 每轮读最新：改配置不用重启
            logger.LogInformation("同步间隔 {IntervalMin} 分钟", options.IntervalMinutes);
            await Task.Delay(TimeSpan.FromMinutes(options.IntervalMinutes), ct);
        }
    }
}
```

单例后台服务里**必须**用 `IOptionsMonitor`：注入 `IOptionsSnapshot` 会因 Scoped 依赖进 Singleton 而直接抛异常（DI 生命周期规则见 [C# 依赖注入](/csharp/260-CSharpDependencyInjection)）。

### 3.2 请求日志与 TraceId 贯穿

```csharp
// 中间件把请求标识压入日志上下文，本请求内所有日志自动携带
app.Use(async (context, next) =>
{
    LogContext.PushProperty("TraceId", context.TraceIdentifier);
    var sw = Stopwatch.StartNew();
    await next(context);
    Log.LogInformation("{Method} {Path} -> {Status} in {ElapsedMs}ms",
        context.Request.Method, context.Request.Path,
        context.Response.StatusCode, sw.ElapsedMilliseconds);
});
```

- 每条日志带 TraceId 后，「跨服务找一次请求的全部日志」从人工拼接变成一次过滤；
- 耗时日志放中间件（管道位置决定覆盖范围）而不是每个服务里手打——管道编排见 [ASP.NET Core 中间件管道](/csharp/310-AspNetCoreMiddlewarePipeline)。

### 3.3 敏感信息与配置的边界

```csharp
// 反例：把密钥打进日志
logger.LogDebug("使用密钥 {Secret} 调用支付接口", options.Secret);

// 正例：只记录指纹（前 4 位）
logger.LogDebug("使用密钥 {SecretFingerprint}... 调用支付接口", options.Secret[..4]);
```

- 日志会进聚合系统与备份，**按密钥就是泄露**；同样原则适用于连接串、Token、用户手机号（脱敏后再记）；
- 密钥本身走环境变量或机密管理器（User Secrets / Key Vault），不进 appsettings.json 与源码库——配置系统给「放哪里」的答案，日志纪律守住「不外泄」的底线。

## 4. 动手实践

练习任务：给一个天气查询 Worker 补齐配置与日志，要求：

1. `WeatherOptions`（ApiBaseUrl、RefreshMinutes、CityCount）从 `Weather` 节绑定，启动时校验 RefreshMinutes 在 1-1440 之间；
2. Worker 用热更新友好的方式读配置（说明为什么选这个接口）；
3. 每轮同步记一条结构化日志：城市数、耗时、失败数三个字段；失败明细用 Error 级别；
4. 思考题：`WeatherOptions.CityCount` 若在运行中被改小，正在进行的同步轮会发生什么？你的实现如何保证一轮内取值一致？

提示：校验用 `AddOptions<T>().Validate(...).ValidateOnStart()`；一轮内一致要么开头取一次 `CurrentValue`，要么用 Snapshot。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```csharp
public sealed class WeatherOptions
{
    public required string ApiBaseUrl { get; init; }
    public int RefreshMinutes { get; init; } = 30;
    public int CityCount { get; init; } = 10;
}

// Program.cs
builder.Services.AddOptions<WeatherOptions>()
    .Bind(builder.Configuration.GetSection("Weather"))
    .Validate(o => o.RefreshMinutes is >= 1 and <= 1440, "RefreshMinutes 必须在 1-1440 之间")
    .ValidateOnStart(); // 坏配置启动即炸

public sealed class WeatherWorker(
    IOptionsMonitor<WeatherOptions> monitor,   // 单例 Worker 要热更新 -> Monitor 而非 Snapshot
    ILogger<WeatherWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            var options = monitor.CurrentValue;  // 一轮开头取一次：本轮内取值一致
            var sw = Stopwatch.StartNew();
            int failed = 0;
            for (int i = 0; i < options.CityCount; i++)
            {
                try { await SyncCityAsync(i, options.ApiBaseUrl, ct); }
                catch (Exception ex) { failed++; logger.LogError(ex, "城市 {Index} 同步失败", i); }
            }
            logger.LogInformation("本轮完成 {Cities} 城市, {Failed} 失败, 耗时 {ElapsedMs}ms",
                options.CityCount, failed, sw.ElapsedMilliseconds);

            await Task.Delay(TimeSpan.FromMinutes(options.RefreshMinutes), ct);
        }
    }
}

/* 思考题答案：一轮开头已把 CurrentValue 存进局部变量 options，本轮循环用的都是这个快照——
 * 配置中途改小 CityCount 只影响下一轮，本轮长度不变。若直接在循环条件里写 monitor.CurrentValue.CityCount，
 * 轮内行为会随配置漂移（可能多查/少查城市），这就是「开头取一次」的意义。
 */
```

自检：ValidateOnStart 让坏配置在启动时失败；Monitor 满足单例 + 热更新；失败明细 Error 级、汇总 Information 级且全部结构化。

</details>

## 5. 常见陷阱速查

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 硬编码连接串/密钥 | 换环境改代码；密钥进源码库 | IConfiguration/Options + 环境变量与机密管理器 |
| 注入 IConfiguration 到处字符串取键 | 改结构无编译期检查 | Options 强类型绑定 + ValidateOnStart |
| 单例服务注入 IOptionsSnapshot | Scoped 进 Singleton 抛异常 | 单例热更新用 IOptionsMonitor |
| 日志用 `$"..."` 拼接 | 无结构、级别关闭也拼 | 占位符参数化，热路径用 LoggerMessage |
| 占位符与参数顺序错位 | 值张冠李戴且不报错 | 占位符名字与传参顺序对齐 + code review |
| 忘记 Log.CloseAndFlush | 退出丢最后一段日志 | 宿主 finally 中冲刷（UseSerilog 已封装） |
| 密钥/手机号进日志 | 聚合系统即泄露源 | 只记指纹与脱敏字段 |
| 框架日志刷屏 | Microsoft.* 全 Info 淹没业务日志 | Logging 段按命名空间降级 |

## 6. 小结

初学者要点：配置多源按注册顺序覆盖、环境变量双下划线映射冒号；Options 三件套按生命周期选（Options/Snapshot/Monitor）；业务只依赖 ILogger 门面，Sink 可换；日志一律占位符结构化。进阶注意：ValidateOnStart 启动期暴露坏配置；LoggerMessage 源生成器救热路径；密钥只走环境变量与机密管理器且永不进日志。

## 参考与致谢

- Microsoft Learn：*Configuration in .NET*（options 与配置源，CC-BY 4.0 / Microsoft 文档许可），https://learn.microsoft.com/dotnet/core/extensions/configuration
- Microsoft Learn：*Logging in C# and .NET* 与 *LoggerMessage source generator*，https://learn.microsoft.com/dotnet/core/extensions/logging
- Microsoft Learn：*Options pattern in .NET*，https://learn.microsoft.com/dotnet/core/extensions/options
