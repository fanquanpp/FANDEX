---
order: 80
title: 异常处理与健壮性
module: 'csharp'
category: 后端技术
difficulty: beginner
description: try/catch/finally 语义、when 异常筛选器、自定义异常设计、重新抛出与堆栈保留、AggregateException 与 Task 异常聚合、异常的性能代价。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'csharp/050-ValueTypeReferenceType'
  - 'csharp/080-CAsyncProgramming'
  - 'csharp/310-AspNetCoreMiddlewarePipeline'
prerequisites: []
---

## 知识点地图

- **知识类别**：健壮性 / 异常处理体系。
- **解决什么问题**：程序必然遭遇「预期外的世界」——文件不存在、网络超时、用户输入畸形、并发任务部分失败。异常机制回答三件事：错误如何被表达（抛什么）、如何被拦截（在哪 catch）、如何不丢失现场（堆栈与内层异常）。本文同时回答一个容易被忽略的问题：异常很贵，什么该用异常、什么该用返回值。
- **什么时候用到**：解析外部数据（文件/网络/用户输入）的边界处；异步与并行代码的任务异常聚合；Web 应用的全局兜底；任何「失败是正常输入之一」的 I/O 边界。

模块内此前无异常处理专篇（catch/throw 在多篇零散出现）。本文以三个工程场景为主线：解析外部 CSV 的重试边界、ASP.NET Core 全局异常处理（衔接 [ASP.NET Core 中间件管道](/csharp/310-AspNetCoreMiddlewarePipeline)）、挂机游戏的离线结算输入防御（真实项目 flower-card 的 `OfflineReward.cs` 案例）。

## 1. 心智模型：异常是「强制的返回通道」

方法正常返回值，异常提供第二条退出通道：`throw` 立即中止当前方法，沿调用栈向上寻找最近的匹配 `catch`，沿途执行所有 `finally`。三条设计纪律由此推出：

1. **异常用于「异常」**：`int.TryParse` 在输入可能失败时返回 `bool`（可控失败走返回值）；`int.Parse` 在「按契约这里不该失败」时抛异常（违约才炸）。选哪个的判断标准：**这个失败出现的频率与语义**——高频且正常的失败用 Try 模式，罕见的违约用异常。
2. **catch 要尽量具体**：`catch (Exception)` 是兜底，放边界处（顶层、任务调度处）；放在业务层会把别人的 bug 静默吞掉，故障排查时一片「看起来正常」。
3. **不要用异常做流程控制**：`try { ParseInt } catch { return 0 }` 在输入常错时每次都走异常（微秒级开销，见 §6），且掩盖了「空输入是合法状态」的事实。

### 1.1 try/catch/finally 的精确语义

```csharp
public static CsvData LoadCsv(string path)
{
    StreamReader? reader = null;
    try
    {
        reader = new StreamReader(path);
        return CsvParser.Parse(reader.ReadToEnd());
    }
    catch (FileNotFoundException ex)
    {
        // 只拦「文件不存在」这一种预期失败；语法错误等 bug 继续上抛
        throw new InvalidOperationException($"配置文件缺失：{path}", ex);
    }
    finally
    {
        reader?.Dispose(); // 无论 return、throw 还是正常走完，finally 都执行
    }
}
```

- `finally` 里只做清理（Dispose/解锁/还原状态），不写业务逻辑、不抛新异常（finally 里抛异常会吞掉正在传播的原异常）；
- 现代 C# 对本例有更干净的写法：`using var reader = new StreamReader(path);`——`using` 声明在作用域结束时自动 Dispose，等价于 try/finally 但少两层缩进；需要精确控制释放时机时才手写 try/finally；
- `catch` 匹配按声明顺序自上而下，**子类异常必须放在父类前面**（编译器会对不可达的 `catch` 报错）。

### 1.2 when 异常筛选器：catch 的条件表达式

```csharp
try
{
    await httpClient.GetAsync(url);
}
catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
{
    await Task.Delay(TimeSpan.FromSeconds(5)); // 只对 429 退避重试
}
catch (HttpRequestException ex) when (IsTransient(ex))
{
    await RetryAsync(url); // 其他瞬时网络错误走另一条恢复路径
}
```

- `when` 后的表达式为 false 时，异常**继续向上传播**，就像这个 catch 不存在——不会消耗堆栈，日志里保留完整现场；
- 与「catch 里面再 if 判断后 rethrow」相比，`when` 的语义更诚实：不匹配就不是你该处理的异常。老写法 `catch (Exception ex) { if (!(ex is IOException)) throw; ... }` 堆栈会被 rethrow 弄脏（见 §3）；
- `when` 里可以记日志（有副作用的表达式技术上可行但强烈不推荐——筛选器可能被运行时多次求值）。

## 2. 自定义异常设计

```csharp
/// <summary>领域校验失败：调用方可据此向用户展示友好信息。</summary>
public class DomainValidationException : Exception
{
    public string FieldName { get; }

    public DomainValidationException(string fieldName, string message)
        : base(message) => FieldName = fieldName;

    // 反序列化支持：所有可序列化字段都要有这个构造器
    protected DomainValidationException(
        System.Runtime.Serialization.SerializationInfo info,
        System.Runtime.Serialization.StreamingContext context)
        : base(info, context)
        => FieldName = info.GetString(nameof(FieldName)) ?? string.Empty;
}
```

设计要点逐条解释：

- **继承 `Exception` 而不是 `ApplicationException`**：后者是历史遗留，官方指南早已不推荐；
- **类名以 `Exception` 结尾**，且名字描述「发生了什么」（`DomainValidationException`、`PaymentDeclinedException`），不是「谁抛的」；
- **携带机器可读的上下文字段**（如 `FieldName`）：上层 catch 后能据此定位 UI 控件，而不是去解析 `Message` 字符串——解析字符串是脆弱契约；
- **提供 `(SerializationInfo, StreamingContext)` 构造器**用于跨 AppDomain 场景的反序列化；纯现代应用可以省略，但公共类库建议保留；
- 什么时候**不该**自定义：`ArgumentException`/`InvalidOperationException`/`TimeoutException` 等内置异常已能精确表达时，用内置的——调用方可能已经在 catch 内置异常。

## 3. 重新抛出与堆栈保留

这是异常处理里最隐蔽的坑：**两种 rethrow，堆栈结局完全不同**。

```csharp
try
{
    ProcessOrder();
}
catch (Exception ex)
{
    // 错误写法：throw ex; —— 堆栈从这里重置，ProcessOrder 的现场全部丢失
    // 正确写法一：裸 throw —— 原堆栈原样保留
    throw;

    // 正确写法二：包一层新异常，原异常作为 innerException
    // throw new OrderProcessingException("订单处理失败", ex);
}
```

逐条说明：

- `throw;` 把当前正在传播的异常原样继续抛，堆栈完好；`throw ex;` 是一次全新的抛出，`ex.StackTrace` 被改写为当前行——线上排查时你会看到「错误发生在 catch 那一行」，真相永远丢失；
- 包新异常（`throw new ...Exception(msg, ex)`）适用于「想补充当前层上下文」的场景；注意别层层包装成 `InnerException` 套娃五层；
- **异常筛选器 + 裸 throw 的组合**是「想记日志又不想改变异常」的最佳写法：

```csharp
catch (Exception ex) when (Log(ex)) // Log 返回 false：记录后异常继续传播，堆栈无损
{
    throw; // 不可达，但满足编译器
}

static bool Log(Exception ex)
{
    logger.LogError(ex, "处理订单时出错");
    return false; // false = 不由本 catch 处理，异常继续上抛
}
```

## 4. 异步与并行：AggregateException 与 Task 的异常模型

`Task` 把异常「存起来」，等你 await 时再抛——这决定了异步代码的错误处理形态：

```csharp
// await 会解包：直接抛出第一个异常（不是 AggregateException）
try
{
    await DownloadAllAsync(urls);
}
catch (HttpRequestException ex)
{
    // 这里拿到的就是原始异常
    Console.WriteLine($"下载失败：{ex.Message}");
}

// 不 await 而用 .Wait()/.Result：异常被包进 AggregateException
try
{
    DownloadAllAsync(urls).Wait();
}
catch (AggregateException agg)
{
    foreach (var ex in agg.Flatten().InnerExceptions)
        Console.WriteLine($"失败：{ex.Message}");
}
```

- **await 路径**：`Task` 内的第一个异常被重新抛出，堆栈含异步现场；其余异常存在 `Task.Exception` 里但 await 时只抛第一个；
- **`.Wait()`/`.Result` 路径**：异常被 `AggregateException` 包裹——这是「为什么不混用阻塞与异步」的理由之一，处理形态完全不同且可能死锁（见 [C# 异步编程](/csharp/080-CAsyncProgramming)）；
- **并行多任务**（`Task.WhenAll`）是真·多异常场景：

```csharp
var tasks = urls.Select(u => httpClient.GetStringAsync(u));
try
{
    var results = await Task.WhenAll(tasks);
}
catch (Exception)
{
    // WhenAll 的任务里第一个异常上抛；要看全部失败，回到 task 集合上逐个检查
    // （task 变量需保留引用：var tasks = ...; await Task.WhenAll(tasks); catch 里检查 tasks）
    foreach (var t in tasks.Where(t => t.IsFaulted))
        Console.WriteLine($"失败：{t.Exception?.InnerException?.Message}");
}
```

- `Unwrap`/`async void` 是异常模型的两个黑洞：`async void` 方法的异常无法被调用方捕获（直接砸到线程池，通常进程崩溃），事件处理器以外禁止写 `async void`。

## 5. 三个真实工程例子

### 5.1 解析外部 CSV 的重试边界

外部数据（第三方导出的 CSV）的失败是常态，边界策略分三层：

```csharp
public sealed record ImportResult(int Imported, IReadOnlyList<string> Errors);

public async Task<ImportResult> ImportCsvAsync(Stream csvStream)
{
    var errors = new List<string>();
    int imported = 0;
    int lineNumber = 0;

    foreach (var line in ReadLines(csvStream))
    {
        lineNumber++;
        try
        {
            var row = CsvRow.Parse(line);        // 行级失败：坏一行跳一行
            await SaveRowAsync(row);
            imported++;
        }
        catch (CsvFormatException ex) when (IsDataError(ex))
        {
            errors.Add($"第 {lineNumber} 行：{ex.Message}"); // 数据质量问题：记录后继续
        }
        // 数据库连接失败等系统级异常：不 catch，让整个导入失败重试
    }

    return new ImportResult(imported, errors);
}
```

- **分层原则**：数据错误（可预期、局部）收集为结果的一部分；系统错误（不可预期、全局）让异常传播到重试层；
- 「重试」只对系统错误有意义：数据坏了重试一万次还是坏，所以要区分 `IsDataError` 与基础设施异常；
- 顶层再用 Polly 之类的弹性库做指数退避重试（瞬态故障），业务代码里不手写 retry 循环。

### 5.2 ASP.NET Core 全局异常处理

Web 应用的异常兜底放在管道末端，业务层只抛不接：

```csharp
// Program.cs
builder.Services.AddProblemDetails();

var app = builder.Build();

app.UseExceptionHandler(new ExceptionHandlerOptions
{
    ExceptionHandler = async context =>
    {
        var feature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        var ex = feature?.Error;

        var (status, title) = ex switch
        {
            DomainValidationException v => (StatusCodes.Status400BadRequest, v.Message),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "无权限"),
            _ => (StatusCodes.Status500InternalServerError, "服务器内部错误")
        };

        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(new { title });
    }
});
```

- 业务代码一律 `throw new DomainValidationException(...)`，**不在每个控制器里 try/catch**——否则五百个接口五百份样板，且漏一处就把堆栈泄给用户；
- switch 表达式把「异常类型 -> HTTP 状态码」的映射集中成一张决策表，新增领域异常时只改这一处；
- 生产环境绝不把 `ex.ToString()` 写进响应（信息泄露），完整堆栈进日志（衔接 [ASP.NET Core 中间件管道](/csharp/310-AspNetCoreMiddlewarePipeline) 的异常中间件位置语义）。

### 5.3 离线结算的输入防御（真实项目案例）

flower-card 的 `Scripts/Core/OfflineReward.cs` 是防御式编程的教科书样本：挂机游戏读档计算离线收益时，`LastSaveUnix` 来自玩家手里的存档文件——**可能是被改过的**。核心一行：

```csharp
// 真实项目 flower-card/Scripts/Core/OfflineReward.cs（行 9-57）的防御逻辑
int offlineSeconds = (int)Math.Clamp(
    DateTimeOffset.UtcNow.ToUnixTimeSeconds() - LastSaveUnix,
    0,
    MaxOfflineSeconds); // 上限 8 小时：防「改系统时间/改存档时间戳」刷收益

decimal gold = offlineSeconds * goldRate * 0.6m; // 分资源系数（金 0.6/露 0.8/粉 0.7/碎片 0.5）
```

- `Math.Clamp` 把「负值（存档来自未来）」与「超上限」两种异常输入压回合法区间——**对不可信输入，先钳制再使用**，而不是假设它合法再到处判空；
- 收益按「离线瞬间各资源速率快照 x 时长 x 分资源系数」在纯函数内计算：不依赖运行中的可变状态，坏输入最多产出「较小的合法数字」，永远不会抛出或污染存档；
- 开花等里程碑「只写 MemoryLog 不入账」：收益可以防刷重算，进度事件不可重放——两种数据用不同的信任策略；
- 与 §1 的口诀呼应：这不是异常场景（坏输入高频出现，玩家会主动尝试），所以用钳制与快照这类「返回值式」防御，而不是 try/catch。

## 6. 异常的性能代价

异常的构造（填充堆栈）与传播（展开调用栈）都是微秒级操作，比返回一个 bool 慢几个数量级：

```csharp
// 反模式：用异常控制解析流程——输入常错时性能悬崖
public static int ParseLevel(string input)
{
    try { return int.Parse(input); }        // 失败一次 = 抛一次异常
    catch (FormatException) { return 0; }
}

// 正确：Try 模式——失败只是返回 false，零异常成本
public static int ParseLevelSafe(string? input) =>
    int.TryParse(input, out var v) ? v : 0;
```

- 判断标准写进代码评审：「这个失败路径在正常使用中多久发生一次？」——每次请求都发生的（用户输错）用 Try 模式；数周一次的（磁盘故障）用异常；
- 抛出后的异常对象会捕获完整堆栈（含行号），构造本身不便宜；`ExceptionDispatchInfo.Capture(ex).Throw()` 可在跨 await 后保留原堆栈（高级场景）；
- 热路径（每帧调用、每请求多次）里不要有「正常会失败」的异常。

## 7. 动手实践

练习任务：为 flower-card 风格的存档系统实现 `SaveLoadService`，要求：

1. `LoadAsync(path)` 打开存档 JSON；文件不存在返回 `null`（首次启动是正常路径），JSON 损坏抛 `SaveCorruptedException`（携带行号信息）；
2. `SaveAsync` 失败（磁盘满）要保证「旧存档不被破坏」：先写临时文件再原子替换；
3. 在调用方写一段顶层处理：`SaveCorruptedException` 弹「存档损坏，已备份并新建存档」，其他异常照常上抛；
4. 思考题：`LastSaveUnix` 若为负数，你的结算函数会发生什么？参考 §5.3 补上防御。

提示：原子替换用 `File.Move(tmp, final, overwrite: true)`；JSON 损坏时 catch `JsonException` 并从 `ex` 中提取位置信息。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```csharp
public sealed class SaveCorruptedException : Exception
{
    public int LineNumber { get; }
    public SaveCorruptedException(int lineNumber, string message, Exception inner)
        : base(message, inner) => LineNumber = lineNumber;
}

public sealed class SaveLoadService
{
    public async Task<SaveData?> LoadAsync(string path)
    {
        if (!File.Exists(path)) return null; // 首次启动是正常路径，不是异常

        try
        {
            var json = await File.ReadAllTextAsync(path);
            return JsonSerializer.Deserialize<SaveData>(json);
        }
        catch (JsonException ex)
        {
            // 包一层领域异常，携带行号；原异常作 InnerException 保留现场
            throw new SaveCorruptedException(ex.LineNumber, $"存档损坏：{path}", ex);
        }
    }

    public async Task SaveAsync(string path, SaveData data)
    {
        var tmp = path + ".tmp";
        await using (var fs = File.Create(tmp))
        {
            await JsonSerializer.SerializeAsync(fs, data);
        }
        File.Move(tmp, path, overwrite: true); // 原子替换：写到一半断电也只丢 tmp
    }
}

// 调用方顶层
var save = await svc.LoadAsync(path);
if (save is null) save = SaveData.NewGame();
try
{
    ApplyOfflineReward(save); // 内部对 LastSaveUnix 做 Math.Clamp 防御
}
catch (SaveCorruptedException ex)
{
    File.Move(path, path + $".corrupt-{DateTime.Now:yyyyMMddHHmmss}"); // 先备份再重建
    save = SaveData.NewGame();
    ui.ShowMessage($"存档损坏（第 {ex.LineNumber} 行），已备份并新建存档");
}
```

自检：文件不存在走返回值、JSON 损坏走异常、系统错误（磁盘满）无人拦截直接上抛——三种失败三种出口，各得其所。

</details>

## 8. 常见陷阱速查

- **`throw ex` 丢了堆栈**：永远裸 `throw;` 或包新异常带 inner。
- **catch (Exception) 吞 bug**：业务层只 catch 具体异常；`Exception` 只出现在顶层边界与任务调度处。
- **finally 里抛异常**：吞掉正在传播的原异常；清理代码自己也要防御。
- **async void 吞异常**：异常直接崩进程；事件处理器以外一律 `async Task`。
- **混用 .Result 与 await**：异常形态分裂（AggregateException vs 原始异常）且有死锁风险。
- **用异常做参数校验的常规路径**：热路径改 Try 模式；「外部输入」先钳制（Math.Clamp/范围检查）再使用。
- **异常消息里拼敏感数据**：Message 会进日志与 API 响应，连接串、令牌别拼进去。

## 9. 小结

初学者要点：异常是第二条返回通道，用于「异常」而非高频失败；catch 具体异常、顶层兜底；裸 throw 保留堆栈；Task 异常 await 解包、WhenAll 多失败。进阶注意：when 筛选器实现「记录但传播」；领域异常携带机器可读上下文；不可信输入先 Clamp 防御；Try 模式救热路径。

## 参考与致谢

- Microsoft Learn：*Exceptions and Exception Handling (C# Guide)*（CC-BY 4.0 / Microsoft 文档许可），https://learn.microsoft.com/dotnet/csharp/fundamentals/exceptions/
- Microsoft Learn：*Exception-handling statements*（try/catch/finally、when 筛选器），https://learn.microsoft.com/dotnet/csharp/language-reference/statements/exception-handling-statements
- 框架设计指南：*Design Guidelines for Exceptions*，https://learn.microsoft.com/dotnet/standard/design-guidelines/exceptions
