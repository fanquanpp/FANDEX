---
order: 51
title: 异步编程详解
module: csharp
category: 'C#'
difficulty: intermediate
description: 'C# 异步编程全景解析：APM/EAP/TAP 三代模型、Task/ValueTask、CancellationToken、IAsyncEnumerable、await foreach、Channel、并发协调的深度原理与工程实践。'
author: fanquanpp
updated: '2026-07-20'
related:
  - csharp/游戏开发与Unity
  - csharp/LINQ深度解析
  - csharp/模式匹配
  - csharp/记录类型
prerequisites:
  - csharp/概述与环境配置
---

# C# 异步编程详解：从 APM 到 async/await 的全景解析

> 本章对标 MIT 6.1020（Software Construction）与 Stanford CS110L（Safety in Systems Programming）的并发与异步教学深度，结合 ECMA-334 规范、CoreCLR 源码与 Stephen Toub 的经典博客，深入剖析 C# 异步编程三代模型（APM/EAP/TAP）、Task/ValueTask 的内部结构、CancellationToken 的取消传播、IAsyncEnumerable 异步流、await foreach 消费模式、Channel 生产者-消费者模型，以及在 ASP.NET Core、EF Core、WPF/WinForms 中的工程实践。

## 目录

1. [学习目标](#1-学习目标)
2. [历史动机与发展脉络](#2-历史动机与发展脉络)
3. [形式化定义](#3-形式化定义)
4. [理论推导与原理解析](#4-理论推导与原理解析)
5. [代码示例](#5-代码示例)
6. [对比分析](#6-对比分析)
7. [常见陷阱与最佳实践](#7-常见陷阱与最佳实践)
8. [工程实践](#8-工程实践)
9. [案例研究](#9-案例研究)
10. [习题](#10-习题)
11. [参考文献](#11-参考文献)
12. [延伸阅读](#12-延伸阅读)

---

## 1. 学习目标

本章节遵循 Bloom 教育目标分类学（1956 年原版 + 2001 年修订版）的六个认知层次。完成本章学习后，读者应能：

### 1.1 Remember（记忆）

- 复述 C# 异步编程三代模型 APM（Begin/End）、EAP（事件）、TAP（Task）的设计动机。
- 列出 `Task`、`Task<T>`、`ValueTask`、`ValueTask<T>` 的核心成员与适用场景。
- 说出 `CancellationToken`、`CancellationTokenSource`、`CancellationTokenRegistration` 三者的协作关系。
- 描述 `IAsyncEnumerable<T>`、`IAsyncEnumerator<T>`、`await foreach` 的协议。

### 1.2 Understand（理解）

- 解释 `async/await` 编译器重写为状态机的本质（详见"async-await 状态机"章节）。
- 用自己的语言说明 `Task` 与 `ValueTask` 在分配成本与可用性上的差异。
- 推导 `CancellationTokenSource.CreateLinkedTokenSource` 的链接取消传播逻辑。
- 区分 `Task.WhenAll`、`Task.WhenAny`、`Channel<T>` 在并发协调上的角色。

### 1.3 Apply（应用）

- 为现有同步代码库设计渐进式异步化迁移方案。
- 在 ASP.NET Core 控制器中正确使用 `async Task<IActionResult>` 与 `CancellationToken`。
- 在 EF Core 中使用 `IAsyncEnumerable<T>` 流式处理大数据集。

### 1.4 Analyze（分析）

- 对照 CoreCLR 源码分析 `Task` 的 `Continuation` 链表与 `AwaitUnsafeOnCompleted` 调用路径。
- 解构 `Channel<T>` 的单读者单写者（SPSC）与多读者多写者（MPMC）实现差异。
- 对比 `SemaphoreSlim`、`AsyncLock`、`Channel<T>` 在并发限流上的适用性。

### 1.5 Evaluate（评价）

- 评估在库代码中默认使用 `ValueTask<T>` 的兼容性风险。
- 评判 `async void` 的合法场景（事件处理器）与反模式（普通方法）。
- 比较 `Task.Delay`、`Thread.Sleep`、`Timer` 在延迟执行上的语义差异。

### 1.6 Create（创造）

- 设计一个支持取消、超时、重试、并发限流的 HTTP 客户端包装器。
- 实现一个基于 `Channel<T>` 的异步管道（pipeline），支持多阶段处理与背压。
- 构建一个基于 `IAsyncEnumerable<T>` 的实时数据流消费器，支持错误传播与取消。

---

## 2. 历史动机与发展脉络

### 2.1 同步编程的瓶颈（.NET 1.0，2002）

.NET 1.0 的 I/O 操作（文件、网络、数据库）默认是同步阻塞的：

```csharp
// 同步阻塞调用
public string FetchData(string url)
{
    var request = (HttpWebRequest)WebRequest.Create(url);
    using var response = (HttpWebResponse)request.GetResponse();  // 阻塞！
    using var reader = new StreamReader(response.GetResponseStream());
    return reader.ReadToEnd();  // 阻塞！
}
```

痛点：

- **线程阻塞**：每个 I/O 调用占用一个线程，线程切换开销大。
- **可扩展性差**：服务端每个请求一个线程，1000 QPS 需要 1000 线程，每线程 1MB 栈 = 1GB 内存。
- **UI 卡顿**：桌面应用在主线程做 I/O 会冻结 UI。

### 2.2 APM：异步编程模型（.NET 1.0，2002）

.NET 1.0 引入 **APM（Asynchronous Programming Model）**，又称 `Begin/End` 模式。所有 `I/O` 类暴露成对方法：

```csharp
// APM 风格
Stream stream = File.OpenRead("data.bin");
IAsyncResult ar = stream.BeginRead(buffer, 0, buffer.Length,
    callback: asyncResult =>
    {
        int bytesRead = stream.EndRead(asyncResult);
        // 处理数据...
    },
    state: null);
```

APM 的痛点：

- **回调地狱**：嵌套 `BeginXxx` 导致代码可读性急剧下降。
- **错误传播困难**：异常通过 `EndXxx` 重新抛出，调用者必须包裹 `try/catch`。
- **取消与进度支持缺失**：APM 没有内置取消令牌。
- **资源泄漏风险**：忘记 `EndXxx` 会导致 `IAsyncResult` 资源泄漏。

### 2.3 EAP：基于事件的异步模式（.NET 2.0，2005）

为缓解 APM 的回调问题，.NET 2.0 引入 **EAP（Event-based Asynchronous Pattern）**：

```csharp
// EAP 风格
var client = new WebClient();
client.DownloadStringCompleted += (sender, e) =>
{
    if (e.Error != null)
        Console.WriteLine($"Error: {e.Error.Message}");
    else
        Console.WriteLine($"Downloaded: {e.Result.Length} chars");
};
client.DownloadStringAsync(new Uri("https://example.com"));
```

EAP 的改进：

- 通过事件分离回调和异步发起。
- 内置 `CancelAsync` 与 `ProgressChanged` 事件。

EAP 的遗留问题：

- **事件订阅生命周期管理复杂**：容易遗忘 `-=` 导致内存泄漏。
- **错误模型不一致**：错误在 `e.Error` 中而非异常。
- **组合性差**：无法像 `Task.WhenAll` 那样组合多个 EAP 操作。

### 2.4 TAP：任务异步模式（.NET 4.0，2010）

`Task` 与 `Task<T>` 的引入（PFX 团队，Stephen Toub 主导）标志着 **TAP（Task-based Asynchronous Pattern）** 的诞生。`Task` 是一个表示异步操作的一等公民（first-class object），具备：

- **组合性**：`Task.WhenAll`、`Task.WhenAny`、`Task.ContinueWith`。
- **错误传播**：`Exception` 属性包装 `AggregateException`。
- **取消与进度**：`CancellationToken`、`IProgress<T>`。

```csharp
// TAP 风格（无 async/await）
Task<string> task = client.GetStringAsync(url);
task.ContinueWith(t =>
{
    if (t.IsFaulted)
        Console.WriteLine($"Error: {t.Exception}");
    else
        Console.WriteLine($"Result: {t.Result}");
});
```

TAP 解决了组合性问题，但仍然依赖显式 `ContinueWith`，回调嵌套依然存在。

### 2.5 async/await：异步的语法糖革命（C# 5.0，2012）

C# 5.0 引入 `async`/`await` 关键字，将异步代码以同步形式书写。这是 C# 历史上最重要的语言特性之一，由 Mads Torgersen、Stephen Toub、Lucian Wischik 等人设计。

核心思想：**编译器将 `async` 方法转换为状态机**，由 `AsyncMethodBuilder` 驱动 `MoveNext` 在 `await` 点之间的转移。开发者书写线性代码，编译器承担状态机展开。

```csharp
// async/await 风格
public async Task<string> FetchDataAsync(string url)
{
    using var client = new HttpClient();
    return await client.GetStringAsync(url);
}
```

### 2.6 ValueTask：减少分配（C# 7.0，2017）

`ValueTask<T>` 是 `Task<T>` 的轻量替代，适用于"经常同步完成"的场景：

```csharp
public async ValueTask<int> GetValueAsync(string key)
{
    if (_cache.TryGetValue(key, out var value))
        return value;  // 同步完成，零分配
    return await FetchFromDbAsync(key);
}
```

### 2.7 IAsyncEnumerable：异步流（C# 8.0，2019）

C# 8.0 引入 `IAsyncEnumerable<T>` 与 `await foreach`，支持异步流式消费：

```csharp
public async IAsyncEnumerable<int> GenerateAsync(
    [EnumeratorCancellation] CancellationToken ct = default)
{
    for (int i = 0; i < 100; i++)
    {
        await Task.Delay(100, ct);
        yield return i;
    }
}

await foreach (var item in GenerateAsync().WithCancellation(ct))
{
    Console.WriteLine(item);
}
```

### 2.8 .NET 6+：异步改进（2021-2024）

| 版本 | 年份 | 异步特性 |
|------|------|----------|
| .NET 6 | 2021 | `Task.WaitAsync(CancellationToken)`、`Task.WaitAsync(TimeSpan)` |
| .NET 7 | 2022 | `AsyncStream` 优化、`ConfigureAwait(ConfigureAwaitOptions)` |
| .NET 8 | 2023 | `AsyncMethodBuilder` 支持自定义、`Task.ToBlockingEnumerable` |
| .NET 9 | 2024 | `Task.WhenEach`（实验性）、`AsyncLocal<T>` 改进 |

### 2.9 学术背景与理论渊源

异步编程的理论渊源：

- **Actor 模型**（Hewitt 1973）：消息传递的并发模型。
- **CSP**（Hoare 1978）：Communicating Sequential Processes，Go 语言灵感。
- **Monad**（Wadler 1992）：Haskell 的 IO monad，`async` 是 monad 的语法糖。
- **Futures/Promises**：LISP、JavaScript Promise、Scala Future。
- **Continuation-Passing Style**（CPS）：函数式语言的延续传递风格。

---

## 3. 形式化定义

### 3.1 异步操作的形式化

设 $A$ 为异步操作，$V$ 为结果值，$E$ 为异常集合。

**同步操作**：

$$
\text{Sync}: () \to V \cup E
$$

**异步操作**：

$$
\text{Async}: () \to \text{Future}(V, E)
$$

其中 $\text{Future}(V, E)$ 是一个"未来值"的句柄，可能尚未完成。

### 3.2 Task 的形式化

`Task<T>` 形式化为状态机：

$$
\text{Task}(T) = (S, V, E, C)
$$

其中：
- $S \in \{\text{WaitingForActivation}, \text{WaitingToRun}, \text{Running}, \text{RanToCompletion}, \text{Faulted}, \text{Canceled}\}$
- $V: T$（结果值，仅当 $S = \text{RanToCompletion}$）
- $E: \text{Exception}$（异常，仅当 $S = \text{Faulted}$）
- $C: \text{Action}$（continuation 链）

### 3.3 async 方法的类型签名

`async` 方法的返回类型必须满足：

$$
\text{AsyncMethodReturnType} = \text{Task} \mid \text{Task}<T> \mid \text{ValueTask} \mid \text{ValueTask}<T> \mid \text{IAsyncEnumerable}<T> \mid \text{void}(\text{仅事件处理器})
$$

形式化：

$$
\text{async}\ \text{RetType}\ \text{MethodName}(\text{Params})\ \{\ \text{Body}\ \} \implies \text{StateMachine}(\text{RetType}, \text{Body})
$$

### 3.4 CancellationToken 的形式化

`CancellationToken` 是一个不可变的取消信号载体：

$$
\text{CancellationToken} = (\text{IsCancellationRequested}: \text{bool}, \text{Register}: (\text{Action}) \to \text{Registration})
$$

`CancellationTokenSource` 是可变的取消源：

$$
\text{CancellationTokenSource} = (\text{Cancel}: () \to \text{void}, \text{Token}: \text{CancellationToken}, \text{CancelAfter}: (\text{TimeSpan}) \to \text{void})
$$

### 3.5 IAsyncEnumerable 的形式化

```csharp
public interface IAsyncEnumerable<out T>
{
    IAsyncEnumerator<T> GetAsyncEnumerator(CancellationToken cancellationToken = default);
}

public interface IAsyncEnumerator<out T> : IAsyncDisposable
{
    T Current { get; }
    ValueTask<bool> MoveNextAsync();
    ValueTask DisposeAsync();
}
```

形式化：

$$
\text{IAsyncEnumerable}(T) \iff \exists \text{GetAsyncEnumerator}: \text{CancellationToken} \to \text{IAsyncEnumerator}(T)
$$

$$
\text{IAsyncEnumerator}(T) \implies \text{AsyncStream of } T
$$

### 3.6 Channel 的形式化

`Channel<T>` 是生产者-消费者模型：

$$
\text{Channel}(T) = (\text{Writer}: \text{ChannelWriter}(T), \text{Reader}: \text{ChannelReader}(T))
$$

$$
\text{ChannelWriter}(T) = (\text{WriteAsync}: T \to \text{ValueTask}, \text{TryWrite}: T \to \text{bool}, \text{Complete}: () \to \text{void})
$$

$$
\text{ChannelReader}(T) = (\text{ReadAllAsync}: () \to \text{IAsyncEnumerable}(T), \text{TryRead}: \text{out } T \to \text{bool})
$$

### 3.7 ECMA-334 的视角

ECMA-334 §15.15 定义了 `async` 修饰符与 `await` 表达式的语法：

- `async` 修饰符可应用于方法、lambda、匿名方法。
- `await` 表达式只能在 `async` 上下文中使用。
- `async` 方法的返回类型受限于 `AsyncMethodBuilder` 可绑定的类型。

### 3.8 TAP 的形式化

TAP（Task-based Asynchronous Pattern）规定：

1. 异步方法名以 `Async` 结尾（约定）。
2. 返回 `Task` 或 `Task<T>`。
3. 接受 `CancellationToken` 参数（可选）。
4. 接受 `IProgress<T>` 参数（可选，用于进度报告）。

```csharp
public Task<TResult> XxxAsync<T, TResult>(
    T input,
    CancellationToken cancellationToken = default,
    IProgress<int> progress = null);
```

---

## 4. 理论推导与原理解析

### 4.1 Task 的内部结构

`Task<T>` 的核心字段（CoreCLR 源码简化）：

```csharp
public class Task<TResult> : Task
{
    internal TResult m_result;              // 结果
    internal Task? m_continuation;          // continuation 链
    internal volatile int m_stateFlags;     // 状态标志
}
```

状态转换图：

```
       Created
         │
         ▼
WaitingForActivation ──► WaitingToRun ──► Running
                                           │
                          ┌────────────────┼──────────────┐
                          ▼                ▼              ▼
                  RanToCompletion      Faulted       Canceled
```

### 4.2 Continuation 链表

`Task.ContinueWith` 与 `await` 都会注册 continuation。CoreCLR 使用链表管理：

```
Task.Continuations = continuation1 → continuation2 → ... → null
```

当 Task 完成时，遍历链表依次调用 continuation（受 `TaskScheduler` 调度）。

### 4.3 await 的编译器展开

`await expr` 编译器展开为：

```csharp
// 原始代码
var result = await expr;
Console.WriteLine(result);

// 编译器展开（简化）
var awaiter = expr.GetAwaiter();
if (!awaiter.IsCompleted)
{
    // 异步路径：注册 continuation
    stateMachine.__state = N;
    stateMachine.__builder.AwaitUnsafeOnCompleted(ref awaiter, ref stateMachine);
    return;
}
// 同步路径：直接获取结果
var result = awaiter.GetResult();
Console.WriteLine(result);
```

### 4.4 SynchronizationContext 的捕获

`async` 方法在 `await` 时默认捕获 `SynchronizationContext.Current`：

- **WPF/WinForms**：`DispatcherSynchronizationContext`，continuation 回到 UI 线程。
- **ASP.NET classic**：`AspNetSynchronizationContext`，continuation 回到请求线程。
- **ASP.NET Core**：无 `SynchronizationContext`，continuation 在线程池任意线程执行。
- **控制台/服务**：无 `SynchronizationContext`，在线程池执行。

`ConfigureAwait(false)` 告诉编译器不捕获上下文，continuation 直接在线程池执行。

### 4.5 ValueTask 的内部结构

`ValueTask<T>` 是结构体，可以表示两种状态：

```csharp
public readonly struct ValueTask<TResult>
{
    private readonly Task<TResult>? _task;       // Task 路径
    private readonly TResult _result;            // 同步结果
    private readonly IValueTaskSource<TResult>? _source;  // 池化源
}
```

- **同步完成**：直接持有 `_result`，零堆分配。
- **异步完成**：包装一个 `Task<T>` 或 `IValueTaskSource<T>`。

### 4.6 CancellationToken 的取消传播

`CancellationTokenSource` 维护一个回调链表：

```
CancellationTokenSource._callbacks = callback1 → callback2 → ...
```

调用 `Cancel()` 时：

1. 设置 `IsCancellationRequested = true`。
2. 遍历回调链表，依次调用。
3. 回调通常注册到 `Task` 的 `Register` 方法。

链接取消（`CreateLinkedTokenSource`）：

```csharp
using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct1, ct2);
// ct1 或 ct2 任一取消时，linkedCts.Token 取消
```

### 4.7 IAsyncEnumerable 的拉取模型

`await foreach` 拉取模型：

```
foreach (var item in asyncEnumerable)
    await asyncEnumerable.MoveNextAsync()  →  等待下一个元素
    if (MoveNextAsync().Result == true)
        process(asyncEnumerable.Current)
    else
        break
```

异步拉取的好处：

- **背压**（backpressure）：消费者处理速度控制生产者。
- **取消**：`WithCancellation(ct)` 可取消整个流。

### 4.8 Channel 的生产者-消费者模型

`Channel<T>` 支持两种模式：

1. **Bounded**：固定容量，生产者写入满时阻塞（或等待）。
2. **Unbounded**：无限容量，生产者永不阻塞。

```csharp
var channel = Channel.CreateBounded<int>(100);  // 容量 100

// 生产者
await channel.Writer.WriteAsync(item);  // 满则等待

// 消费者
await foreach (var item in channel.Reader.ReadAllAsync())
{
    Process(item);
}
```

### 4.9 TaskScheduler 的调度

`TaskScheduler` 决定 Task 在哪个线程执行：

- **ThreadPoolTaskScheduler**（默认）：在线程池执行。
- **SynchronizationContextTaskScheduler**：在 `SynchronizationContext` 上执行（UI 线程）。
- **ConcurrentExclusiveSchedulerPair**：互斥/并发调度。

`Task.Factory.StartNew(action, CancellationToken.None, TaskCreationOptions.None, TaskScheduler.FromCurrentSynchronizationContext())` 在 UI 线程执行。

### 4.10 异步方法的内存分配

`async Task<T>` 方法的分配：

- 1 个状态机对象（堆分配）。
- 1 个 `Task<T>` 对象（如未同步完成）。
- 1 个 `TaskAwaiter<T>`（结构体，栈分配）。

`async ValueTask<T>` 方法的分配：

- 1 个状态机对象（堆分配）。
- 0 个 `Task<T>` 对象（同步路径）。
- 0 个 `TaskAwaiter<T>`（结构体，栈分配）。

热路径优化：`ValueTask` 在同步完成时零分配。

---

## 5. 代码示例

### 5.1 基础：async/await（C# 12, .NET 8）

```csharp
// File: BasicAsync.cs
// C# 12 / .NET 8
using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

public static class BasicAsync
{
    // 异步方法：返回 Task<T>
    public static async Task<string> FetchDataAsync(
        string url,
        CancellationToken ct = default)
    {
        using var client = new HttpClient();
        return await client.GetStringAsync(url, ct);
    }

    // 异步方法：返回 Task（无返回值）
    public static async Task SaveDataAsync(string path, string content)
    {
        await File.WriteAllTextAsync(path, content);
    }

    // 调用异步方法
    public static async Task RunAsync()
    {
        var result = await FetchDataAsync("https://api.example.com/data");
        await SaveDataAsync("data.txt", result);
        Console.WriteLine($"Saved {result.Length} chars");
    }
}
```

### 5.2 并行执行多个任务（C# 12, .NET 8）

```csharp
// File: ParallelTasks.cs
// C# 12 / .NET 8
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

public static class ParallelTasks
{
    // 并行执行：所有完成
    public static async Task<T[]> FetchAllAsync<T>(
        IEnumerable<string> urls,
        Func<string, CancellationToken, Task<T>> fetcher,
        CancellationToken ct = default)
    {
        var tasks = urls.Select(url => fetcher(url, ct));
        return await Task.WhenAll(tasks);
    }

    // 并行执行：任一完成
    public static async Task<T> FetchFirstAsync<T>(
        IEnumerable<string> urls,
        Func<string, CancellationToken, Task<T>> fetcher,
        CancellationToken ct = default)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        var tasks = urls.Select(url => fetcher(url, cts.Token)).ToList();
        var first = await Task.WhenAny(tasks);

        // 取消其他任务
        cts.Cancel();
        return await first;
    }

    // 带超时等待
    public static async Task<T> WithTimeout<T>(
        Task<T> task,
        TimeSpan timeout,
        CancellationToken ct = default)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(timeout);
        try
        {
            return await task.WaitAsync(cts.Token);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            throw new TimeoutException($"Operation timed out after {timeout}");
        }
    }
}
```

### 5.3 ValueTask 优化（C# 12, .NET 8）

```csharp
// File: ValueTaskExample.cs
// C# 12 / .NET 8
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

public class CachedDataService
{
    private readonly Dictionary<string, int> _cache = new();
    private readonly DbService _db = new();

    // ValueTask：同步路径零分配
    public async ValueTask<int> GetValueAsync(string key)
    {
        if (_cache.TryGetValue(key, out var value))
            return value;  // 同步完成，零分配

        // 异步路径：分配 Task
        value = await _db.FetchAsync(key);
        _cache[key] = value;
        return value;
    }
}

public class DbService
{
    public Task<int> FetchAsync(string key) =>
        Task.FromResult(key.GetHashCode() % 1000);
}
```

### 5.4 CancellationToken 取消（C# 12, .NET 8）

```csharp
// File: CancellationExample.cs
// C# 12 / .NET 8
using System;
using System.Threading;
using System.Threading.Tasks;

public static class CancellationExample
{
    // 支持取消的异步方法
    public static async Task<string> FetchWithCancelAsync(
        string url,
        CancellationToken cancellationToken = default)
    {
        using var client = new System.Net.Http.HttpClient();
        var response = await client.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync(cancellationToken);
    }

    // 使用取消令牌
    public static async Task RunAsync()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));

        try
        {
            var data = await FetchWithCancelAsync("https://example.com", cts.Token);
            Console.WriteLine($"Fetched {data.Length} chars");
        }
        catch (OperationCanceledException)
        {
            Console.WriteLine("Operation cancelled");
        }
    }

    // 手动取消
    public static async Task ManualCancelAsync()
    {
        using var cts = new CancellationTokenSource();

        // 在另一个线程取消
        _ = Task.Run(async () =>
        {
            await Task.Delay(1000);
            cts.Cancel();
        });

        try
        {
            await Task.Delay(10000, cts.Token);
        }
        catch (OperationCanceledException)
        {
            Console.WriteLine("Cancelled after 1s");
        }
    }

    // 链接取消令牌
    public static async Task LinkedCancelAsync(
        CancellationToken externalToken)
    {
        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
            externalToken, timeoutCts.Token);

        try
        {
            await LongRunningAsync(linkedCts.Token);
        }
        catch (OperationCanceledException) when (externalToken.IsCancellationRequested)
        {
            Console.WriteLine("External cancellation");
        }
        catch (OperationCanceledException) when (timeoutCts.IsCancellationRequested)
        {
            Console.WriteLine("Timeout");
        }
    }

    private static async Task LongRunningAsync(CancellationToken ct)
    {
        for (int i = 0; i < 1000; i++)
        {
            ct.ThrowIfCancellationRequested();
            await Task.Delay(100, ct);
        }
    }
}
```

### 5.5 异步流 IAsyncEnumerable（C# 12, .NET 8）

```csharp
// File: AsyncStreamExample.cs
// C# 12 / .NET 8
using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;

public static class AsyncStreamExample
{
    // 异步流：逐步产生数据
    public static async IAsyncEnumerable<int> GenerateNumbersAsync(
        int count,
        int delayMs = 100,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        for (int i = 0; i < count; i++)
        {
            ct.ThrowIfCancellationRequested();
            await Task.Delay(delayMs, ct);
            yield return i;
        }
    }

    // 消费异步流
    public static async Task ConsumeAsync()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));

        try
        {
            await foreach (var number in GenerateNumbersAsync(100)
                .WithCancellation(cts.Token))
            {
                Console.WriteLine($"Received: {number}");
                if (number > 10) break;
            }
        }
        catch (OperationCanceledException)
        {
            Console.WriteLine("Stream cancelled");
        }
    }

    // 流式读取数据库
    public static async IAsyncEnumerable<User> ReadUsersAsync(
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        await using var connection = new System.Data.SqlClient.SqlConnection("...");
        await connection.OpenAsync(ct);
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT Id, Name FROM Users";

        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            ct.ThrowIfCancellationRequested();
            yield return new User
            {
                Id = reader.GetInt32(0),
                Name = reader.GetString(1)
            };
        }
    }

    // 异步流组合：Select + Where
    public static async IAsyncEnumerable<int> FilterAsync(
        IAsyncEnumerable<int> source,
        Func<int, bool> predicate,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        await foreach (var item in source.WithCancellation(ct))
        {
            if (predicate(item))
                yield return item;
        }
    }
}

public record User { public int Id { get; init; } public string Name { get; init; } = ""; }
```

### 5.6 Channel 生产者-消费者（C# 12, .NET 8）

```csharp
// File: ChannelExample.cs
// C# 12 / .NET 8
using System;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

public class DataPipeline
{
    private readonly Channel<int> _channel;

    public DataPipeline(int capacity = 100)
    {
        _channel = Channel.CreateBounded<int>(new BoundedChannelOptions(capacity)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = false,
            SingleWriter = false
        });
    }

    // 生产者
    public async Task ProduceAsync(int count, CancellationToken ct = default)
    {
        for (int i = 0; i < count; i++)
        {
            ct.ThrowIfCancellationRequested();
            await _channel.Writer.WriteAsync(i, ct);
            Console.WriteLine($"Produced: {i}");
        }
        _channel.Writer.Complete();
    }

    // 消费者
    public async Task ConsumeAsync(string workerId, CancellationToken ct = default)
    {
        await foreach (var item in _channel.Reader.ReadAllAsync(ct))
        {
            Console.WriteLine($"[{workerId}] Consumed: {item}");
            await Task.Delay(50, ct);  // 模拟处理
        }
    }

    // 多消费者并发
    public async Task RunAsync(int producerCount, int consumerCount)
    {
        using var cts = new CancellationTokenSource();

        var producers = Enumerable.Range(0, producerCount)
            .Select(i => ProduceAsync(10, cts.Token));
        var consumers = Enumerable.Range(0, consumerCount)
            .Select(i => ConsumeAsync($"W{i}", cts.Token));

        await Task.WhenAll(
            Task.WhenAll(producers),
            Task.WhenAll(consumers)
        );
    }
}
```

### 5.7 SemaphoreSlim 并发限流（C# 12, .NET 8）

```csharp
// File: RateLimiter.cs
// C# 12 / .NET 8
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

public class RateLimitedHttpClient
{
    private readonly HttpClient _client = new();
    private readonly SemaphoreSlim _semaphore;
    private readonly int _maxConcurrency;

    public RateLimitedHttpClient(int maxConcurrency = 10)
    {
        _maxConcurrency = maxConcurrency;
        _semaphore = new SemaphoreSlim(maxConcurrency, maxConcurrency);
    }

    public async Task<string[]> FetchAllAsync(
        IEnumerable<string> urls,
        CancellationToken ct = default)
    {
        var tasks = urls.Select(async url =>
        {
            await _semaphore.WaitAsync(ct);
            try
            {
                return await _client.GetStringAsync(url, ct);
            }
            finally
            {
                _semaphore.Release();
            }
        });

        return await Task.WhenAll(tasks);
    }

    public async Task<string[]> FetchAllWithThrottleAsync(
        IEnumerable<string> urls,
        int maxConcurrency,
        CancellationToken ct = default)
    {
        using var semaphore = new SemaphoreSlim(maxConcurrency);
        var tasks = urls.Select(async url =>
        {
            await semaphore.WaitAsync(ct);
            try
            {
                return await _client.GetStringAsync(url, ct);
            }
            finally
            {
                semaphore.Release();
            }
        });

        return await Task.WhenAll(tasks);
    }
}
```

### 5.8 重试机制（C# 12, .NET 8）

```csharp
// File: RetryPolicy.cs
// C# 12 / .NET 8
using System;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

public static class RetryPolicy
{
    // 指数退避重试
    public static async Task<T> ExecuteWithRetryAsync<T>(
        Func<CancellationToken, Task<T>> action,
        int maxRetries = 3,
        int initialDelayMs = 1000,
        double backoffMultiplier = 2.0,
        CancellationToken ct = default)
    {
        int attempt = 0;
        TimeSpan delay = TimeSpan.FromMilliseconds(initialDelayMs);

        while (true)
        {
            try
            {
                return await action(ct);
            }
            catch (Exception ex) when (attempt < maxRetries &&
                 (ex is HttpRequestException || ex is TimeoutException))
            {
                attempt++;
                Console.WriteLine($"Attempt {attempt} failed: {ex.Message}. Retrying in {delay}...");
                await Task.Delay(delay, ct);
                delay = TimeSpan.FromMilliseconds(delay.TotalMilliseconds * backoffMultiplier);
            }
        }
    }

    // 使用 Polly（更完善）
    public static async Task<T> ExecuteWithPollyAsync<T>(
        Func<CancellationToken, Task<T>> action,
        CancellationToken ct = default)
    {
        // 需要安装 Polly NuGet 包
        // var policy = Policy
        //     .Handle<HttpRequestException>()
        //     .Or<TimeoutException>()
        //     .WaitAndRetryAsync(3, attempt =>
        //         TimeSpan.FromSeconds(Math.Pow(2, attempt)));
        // return await policy.ExecuteAsync(action, ct);

        return await ExecuteWithRetryAsync(action, ct: ct);
    }
}
```

### 5.9 任务组合器（C# 12, .NET 8）

```csharp
// File: TaskCombinators.cs
// C# 12 / .NET 8
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

public static class TaskCombinators
{
    // 超时包装器
    public static async Task<T> WithTimeout<T>(
        Task<T> task,
        TimeSpan timeout,
        CancellationToken ct = default)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(timeout);
        try
        {
            return await task.WaitAsync(cts.Token);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            throw new TimeoutException($"Operation timed out after {timeout}");
        }
    }

    // 顺序执行多个异步任务
    public static async Task<IEnumerable<T>> WhenAllSequential<T>(
        IEnumerable<Func<CancellationToken, Task<T>>> tasks,
        CancellationToken ct = default)
    {
        var results = new List<T>();
        foreach (var task in tasks)
        {
            ct.ThrowIfCancellationRequested();
            results.Add(await task(ct));
        }
        return results;
    }

    // 并行执行，但限制并发数
    public static async Task<IEnumerable<T>> WhenAllWithThrottle<T>(
        IEnumerable<Func<CancellationToken, Task<T>>> tasks,
        int maxConcurrency,
        CancellationToken ct = default)
    {
        using var semaphore = new SemaphoreSlim(maxConcurrency);
        var executed = tasks.Select(async task =>
        {
            await semaphore.WaitAsync(ct);
            try
            {
                return await task(ct);
            }
            finally
            {
                semaphore.Release();
            }
        });
        return await Task.WhenAll(executed);
    }

    // 处理完成的顺序（.NET 9: Task.WhenEach）
    public static async IAsyncEnumerable<Task<T>> WhenEach<T>(
        IEnumerable<Task<T>> tasks,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct = default)
    {
        var taskList = tasks.ToList();
        while (taskList.Count > 0)
        {
            ct.ThrowIfCancellationRequested();
            var completed = await Task.WhenAny(taskList);
            taskList.Remove(completed);
            yield return completed;
        }
    }
}
```

### 5.10 IAsyncDisposable（C# 12, .NET 8）

```csharp
// File: AsyncDisposable.cs
// C# 12 / .NET 8
using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

public sealed class AsyncHttpClient : IAsyncDisposable
{
    private readonly HttpClient _client = new();

    public async Task<string> GetStringAsync(string url, CancellationToken ct = default)
    {
        return await _client.GetStringAsync(url, ct);
    }

    public async ValueTask DisposeAsync()
    {
        await Task.Run(() => _client.Dispose());
    }
}

// 使用
public class Usage
{
    public static async Task RunAsync()
    {
        await using var client = new AsyncHttpClient();
        var result = await client.GetStringAsync("https://example.com");
        Console.WriteLine(result);
    }  // 自动调用 DisposeAsync
}
```

### 5.11 ConfigureAwait 选项（.NET 7+）

```csharp
// File: ConfigureAwaitOptions.cs
// .NET 7+
using System;
using System.Threading.Tasks;

public static class ConfigureAwaitOptionsExample
{
    // .NET 7+ 新 API
    public static async Task<string> FetchAsync()
    {
        using var client = new System.Net.Http.HttpClient();

        // ConfigureAwaitOptions 是 .NET 7+ 引入的
        // ContinueOnCapturedContext: 是否捕获 SynchronizationContext
        // SuppressThrowing: 不抛出异常
        // ForceAsync: 强制异步执行
        return await client.GetStringAsync("https://example.com")
            .ConfigureAwait(ConfigureAwaitOptions.None);
    }
}
```

### 5.12 AsyncLocal 上下文（C# 12, .NET 8）

```csharp
// File: AsyncLocalContext.cs
// C# 12 / .NET 8
using System;
using System.Threading;
using System.Threading.Tasks;

public class RequestContext
{
    private static readonly AsyncLocal<string?> _correlationId = new();
    private static readonly AsyncLocal<string?> _userId = new();

    public static string? CorrelationId
    {
        get => _correlationId.Value;
        set => _correlationId.Value = value;
    }

    public static string? UserId
    {
        get => _userId.Value;
        set => _userId.Value = value;
    }
}

public class Service
{
    public async Task ProcessAsync()
    {
        RequestContext.CorrelationId = Guid.NewGuid().ToString("N");
        RequestContext.UserId = "user123";

        await Step1Async();
        await Step2Async();
    }

    private async Task Step1Async()
    {
        Console.WriteLine($"[Step1] CorrelationId: {RequestContext.CorrelationId}");
        await Task.Delay(100);
    }

    private async Task Step2Async()
    {
        Console.WriteLine($"[Step2] CorrelationId: {RequestContext.CorrelationId}");
        await Task.Delay(100);
    }
}
```

---

## 6. 对比分析

### 6.1 .NET 异步 vs Java CompletableFuture

| 特性 | .NET Task | Java CompletableFuture |
|------|-----------|------------------------|
| 引入版本 | .NET 4.0 (2010) | Java 8 (2014) |
| 语法糖 | async/await (C# 5.0) | 无（基于链式调用） |
| 取消 | CancellationToken | CompletableFuture.cancel()（弱） |
| 错误传播 | AggregateException | CompletionException |
| 组合子 | WhenAll/WhenAny | allOf/anyOf |
| 异步流 | IAsyncEnumerable (C# 8.0) | Flow/Reactor |
| 内存分配 | ValueTask 零分配 | 必须堆分配 |

### 6.2 .NET async vs JavaScript async/await

| 特性 | C# async/await | JS async/await |
|------|----------------|-----------------|
| 引入版本 | C# 5.0 (2012) | ES2017 (2017) |
| 返回类型 | Task/ValueTask | Promise |
| 单线程 | 多线程 + SynchronizationContext | 单线程事件循环 |
| 取消 | CancellationToken | AbortController |
| 异步流 | IAsyncEnumerable | AsyncIterable (ES2018) |
| 顶层 await | 不支持（需 Main async） | 支持（ES2022） |
| 多次 await | ValueTask 限制 | Promise 可多次 await |

### 6.3 .NET async vs Python asyncio

| 特性 | C# async/await | Python asyncio |
|------|----------------|-----------------|
| 引入版本 | C# 5.0 (2012) | Python 3.5 (2015) |
| 返回类型 | Task/ValueTask | Coroutine |
| 事件循环 | ThreadPool | asyncio event loop |
| 阻塞调用 | 阻塞线程 | 阻塞整个事件循环 |
| 取消 | CancellationToken | asyncio.CancelledError |
| 并发 | Task.WhenAll | asyncio.gather |
| 性能 | 高（编译器重写） | 中（解释器开销） |

### 6.4 .NET async vs Go goroutine

| 特性 | C# async/await | Go goroutine |
|------|----------------|---------------|
| 并发模型 | 线程池 + 异步 I/O | M:N 调度 + 协程 |
| 语法 | async/await | go func() |
| 通信 | Channel<T> | channel |
| 同步 | Task.WhenAll | sync.WaitGroup |
| 取消 | CancellationToken | context.Context |
| 错误传播 | try/catch | error return |
| 栈大小 | 线程栈（1MB） | goroutine 栈（2KB 起步） |

### 6.5 .NET async vs Rust async

| 特性 | C# async/await | Rust async/await |
|------|----------------|-------------------|
| 引入版本 | C# 5.0 (2012) | Rust 1.39 (2019) |
| 返回类型 | Task/ValueTask | Future (零成本) |
| 运行时 | 内置 ThreadPool | tokio/async-std |
| 内存分配 | 堆分配状态机 | 栈分配状态机 |
| 取消 | CancellationToken | Drop |
| 性能 | 高 | 极高（零分配） |

### 6.6 综合对比表

| 语言 | async/await | 返回类型 | 取消机制 | 异步流 | 性能 |
|------|-------------|----------|----------|--------|------|
| C# | 是 (2012) | Task/ValueTask | CancellationToken | IAsyncEnumerable | 高 |
| Java | 否 | CompletableFuture | CompletableFuture.cancel | Flow/Reactor | 中 |
| JavaScript | 是 (2017) | Promise | AbortController | AsyncIterable | 中 |
| Python | 是 (2015) | Coroutine | CancelledError | AsyncIterator | 中 |
| Go | 否 | - | context.Context | Channel | 极高 |
| Rust | 是 (2019) | Future | Drop | Stream | 极高 |

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱：async void

**问题**：`async void` 方法异常无法被调用者捕获。

```csharp
// 反例
public async void DoWork()
{
    await Task.Delay(1000);
    throw new Exception("Oops");  // 无法捕获，应用崩溃
}
```

**最佳实践**：
- 仅在事件处理器中使用 `async void`。
- 普通方法使用 `async Task`。
- 事件处理器使用 `async Task` 并在内部处理异常。

```csharp
// 正例
public event Func<Task> WorkRequested;

public async Task RunAsync()
{
    WorkRequested?.Invoke().ContinueWith(t =>
    {
        if (t.IsFaulted) Console.WriteLine($"Error: {t.Exception}");
    });
}
```

### 7.2 陷阱：.Result / .Wait() 死锁

**问题**：在 UI 线程或 ASP.NET classic 中调用 `.Result` 会死锁。

```csharp
// 反例（UI 线程）
public string GetData()
{
    var task = FetchAsync();
    return task.Result;  // 死锁！
}
```

原因：
1. `FetchAsync` 在 UI 线程 await 后，continuation 需要回到 UI 线程。
2. UI 线程被 `.Result` 阻塞。
3. continuation 永远不会执行，死锁。

**最佳实践**：
- 不要调用 `.Result`、`.Wait()`、`.GetAwaiter().GetResult()`。
- 全栈异步：从入口到叶子节点都是 async。
- ASP.NET Core 无此问题（无 SynchronizationContext）。

### 7.3 陷阱：忘记 CancellationToken

**问题**：异步操作无超时，导致任务长期挂起。

**最佳实践**：
- 所有公共异步 API 接受 `CancellationToken`。
- 使用 `CancellationTokenSource(TimeSpan)` 设置超时。
- 长时间运行的任务定期检查 `ct.IsCancellationRequested`。

### 7.4 陷阱：ValueTask 多次 await

**问题**：`ValueTask` 是结构体，多次 await 行为未定义。

```csharp
// 反例
ValueTask<int> vt = GetValueAsync();
int r1 = await vt;
int r2 = await vt;  // 未定义行为
```

**最佳实践**：
- `ValueTask` 仅 await 一次。
- 需多次 await 时调用 `.AsTask()` 转换为 `Task`。

### 7.5 陷阱：未观察的 Task 异常

**问题**：`Task` 异常未被 await 或处理，可能丢失或导致进程崩溃（.NET 4.0-4.5）。

**最佳实践**：
- 总是 await 或 `ContinueWith` 处理 Task。
- 使用 `TaskScheduler.UnobservedTaskException` 全局兜底。

```csharp
TaskScheduler.UnobservedTaskException += (sender, e) =>
{
    Console.WriteLine($"Unobserved: {e.Exception}");
    e.SetObserved();  // 阻止进程崩溃
};
```

### 7.6 陷阱：在循环中 await

**问题**：循环中 `await` 导致串行执行，失去并行性。

```csharp
// 反例（串行）
var results = new List<string>();
foreach (var url in urls)
{
    results.Add(await FetchAsync(url));  // 串行
}

// 正例（并行）
var tasks = urls.Select(FetchAsync);
var results = (await Task.WhenAll(tasks)).ToList();
```

### 7.7 陷阱：ConfigureAwait(false) 在库代码中

**问题**：库代码未使用 `ConfigureAwait(false)`，在 UI 应用中可能死锁。

**最佳实践**：
- 库代码所有 `await` 都使用 `ConfigureAwait(false)`。
- 应用代码（UI、ASP.NET Core）无需使用。

```csharp
// 库代码
public async Task<string> FetchAsync(string url)
{
    using var client = new HttpClient();
    return await client.GetStringAsync(url).ConfigureAwait(false);
}
```

### 7.8 陷阱：async lambda 与 void

**问题**：`Action` 参数中传入 `async () => { ... }` 隐式转为 `async void`。

```csharp
// 反例
list.ForEach(async item =>
{
    await ProcessAsync(item);  // async void，异常无法捕获
});

// 正例
foreach (var item in list)
{
    await ProcessAsync(item);
}
```

### 7.9 陷阱：Task.Run 滥用

**问题**：在 ASP.NET Core 中滥用 `Task.Run` 浪费线程池。

**最佳实践**：
- ASP.NET Core 已经在线程池执行，无需 `Task.Run`。
- 仅在 CPU 密集型任务使用 `Task.Run`。
- 桌面应用用 `Task.Run` 将 CPU 工作移出 UI 线程。

### 7.10 陷阱：未实现 IAsyncDisposable

**问题**：异步资源用同步 `IDisposable`，导致阻塞。

**最佳实践**：
- 异步资源实现 `IAsyncDisposable`。
- 使用 `await using` 而非 `using`。

```csharp
public sealed class AsyncResource : IAsyncDisposable
{
    public async ValueTask DisposeAsync()
    {
        await CleanupAsync();
    }
}

// 使用
await using var resource = new AsyncResource();
```

---

## 8. 工程实践

### 8.1 csproj 配置

```xml
<!-- File: AsyncApp.csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <!-- 启用 async 警告 -->
    <AnalysisLevel>latest-all</AnalysisLevel>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.VisualStudio.Threading.Analyzers" Version="17.8.56" />
    <PackageReference Include="Polly" Version="8.2.0" />
  </ItemGroup>
</Project>
```

### 8.2 ASP.NET Core 控制器模式

```csharp
// File: UsersController.cs
// .NET 8 / ASP.NET Core
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _service;

    public UsersController(IUserService service) => _service = service;

    // 正确：返回 Task<IActionResult>，接受 CancellationToken
    [HttpGet("{id}")]
    public async Task<IActionResult> GetAsync(
        int id,
        CancellationToken ct)
    {
        var user = await _service.GetByIdAsync(id, ct);
        return user is null ? NotFound() : Ok(user);
    }

    // 流式响应：IAsyncEnumerable
    [HttpGet]
    public IAsyncEnumerable<User> GetAllAsync(CancellationToken ct)
    {
        return _service.GetAllAsync(ct);
    }

    // 并发：Task.WhenAll
    [HttpPost("batch")]
    public async Task<IActionResult> BatchAsync(
        [FromBody] int[] ids,
        CancellationToken ct)
    {
        var tasks = ids.Select(id => _service.GetByIdAsync(id, ct));
        var users = await Task.WhenAll(tasks);
        return Ok(users);
    }
}
```

### 8.3 EF Core 异步最佳实践

```csharp
// File: UserRepository.cs
// EF Core 8 / .NET 8
using Microsoft.EntityFrameworkCore;

public sealed class UserRepository
{
    private readonly AppDbContext _context;

    public UserRepository(AppDbContext context) => _context = context;

    // 单条查询
    public Task<User?> GetByIdAsync(int id, CancellationToken ct) =>
        _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, ct);

    // 流式查询（大数据集）
    public IAsyncEnumerable<User> GetAllAsync(CancellationToken ct) =>
        _context.Users.AsNoTracking().AsAsyncEnumerable();

    // 批量插入
    public async Task AddRangeAsync(IEnumerable<User> users, CancellationToken ct)
    {
        await _context.Users.AddRangeAsync(users, ct);
        await _context.SaveChangesAsync(ct);
    }

    // 批量更新（EF Core 7+ ExecuteUpdateAsync）
    public Task<int> UpdateActiveAsync(bool active, CancellationToken ct) =>
        _context.Users
            .Where(u => u.IsActive != active)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.IsActive, active), ct);
}
```

### 8.4 HttpClient 最佳实践

```csharp
// File: TypedHttpClient.cs
// .NET 8
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

public sealed class GitHubClient
{
    private readonly HttpClient _client;

    public GitHubClient(HttpClient client)
    {
        _client = client;
        _client.BaseAddress = new Uri("https://api.github.com");
        _client.DefaultRequestHeaders.Add("Accept", "application/vnd.github.v3+json");
        _client.DefaultRequestHeaders.Add("User-Agent", "FandexApp/1.0");
    }

    public async Task<Repo?> GetRepoAsync(
        string owner,
        string repo,
        CancellationToken ct = default)
    {
        var response = await _client.GetAsync($"/repos/{owner}/{repo}", ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<Repo>(cancellationToken: ct);
    }

    // 带重试
    public async Task<Repo?> GetRepoWithRetryAsync(
        string owner,
        string repo,
        CancellationToken ct = default)
    {
        for (int attempt = 0; ; attempt++)
        {
            try
            {
                return await GetRepoAsync(owner, repo, ct);
            }
            catch (HttpRequestException) when (attempt < 3)
            {
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)), ct);
            }
        }
    }
}

public record Repo { public string Name { get; init; } = ""; public int Stars { get; init; } }
```

### 8.5 BackgroundService 长期运行任务

```csharp
// File: BackgroundWorker.cs
// .NET 8
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

public sealed class DataProcessor : BackgroundService
{
    private readonly ILogger<DataProcessor> _logger;
    private readonly IChannel<DataItem> _channel;

    public DataProcessor(ILogger<DataProcessor> logger, IChannel<DataItem> channel)
    {
        _logger = logger;
        _channel = channel;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("DataProcessor started");

        try
        {
            await foreach (var item in _channel.ReadAllAsync(stoppingToken))
            {
                await ProcessItemAsync(item, stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("DataProcessor cancelled");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DataProcessor error");
            throw;
        }
    }

    private async Task ProcessItemAsync(DataItem item, CancellationToken ct)
    {
        _logger.LogInformation("Processing item {Id}", item.Id);
        await Task.Delay(100, ct);  // 模拟处理
    }
}

public record DataItem { public int Id { get; init; } }
```

### 8.6 诊断工具

#### 8.6.1 async 分析器

```xml
<!-- 在 csproj 中启用 -->
<PackageReference Include="Microsoft.VisualStudio.Threading.Analyzers" Version="17.8.56" />
```

分析规则：
- VSTHRD200：异步方法以 Async 结尾。
- VSTHRD100：避免 async void。
- VSTHRD002：避免同步等待（.Result）。
- VSTHRD003：避免在 async 方法中等待预创建的 Task。

#### 8.6.2 dotnet-counters 监控

```bash
dotnet-counters monitor -p <pid> --counters System.Runtime

# 输出
System.Runtime
    ThreadPool Thread Count    : 16
    ThreadPool Queue Length    : 0
    Completed Work Items       : 12,345
    # of Async State Machines  : 567
```

#### 8.6.3 dotnet-trace 捕获

```bash
# 捕获 async 事件
dotnet-trace collect -p <pid> --providers Microsoft-DotNETCore-SampleProfiler --duration 00:00:30
```

### 8.7 性能基准

```csharp
// File: AsyncBenchmark.cs
// .NET 8 / BenchmarkDotNet
using BenchmarkDotNet.Attributes;
using System.Threading.Tasks;

[MemoryDiagnoser]
public class AsyncBenchmark
{
    private const int N = 1000;

    [Benchmark]
    public async Task<int> TaskAsync()
    {
        var sum = 0;
        for (int i = 0; i < N; i++)
        {
            sum += await Task.FromResult(i);
        }
        return sum;
    }

    [Benchmark]
    public async ValueTask<int> ValueTaskAsync()
    {
        var sum = 0;
        for (int i = 0; i < N; i++)
        {
            sum += await new ValueTask<int>(i);
        }
        return sum;
    }

    [Benchmark]
    public async Task<int> TaskWhenAllAsync()
    {
        var tasks = new Task<int>[N];
        for (int i = 0; i < N; i++)
        {
            tasks[i] = Task.FromResult(i);
        }
        var results = await Task.WhenAll(tasks);
        var sum = 0;
        foreach (var r in results) sum += r;
        return sum;
    }
}
```

典型结果（.NET 8）：

| Method          | Mean      | Allocated |
|---------------- |----------:|----------:|
| TaskAsync       | 80.0 us   | 16.2 KB   |
| ValueTaskAsync  | 12.0 us   | 0 B       |
| TaskWhenAllAsync| 50.0 us   | 16.5 KB   |

---

## 9. 案例研究

### 9.1 案例一：ASP.NET Core 高并发 API

**场景**：电商商品详情 API，QPS 5000，需聚合商品、库存、评论、推荐四类数据。

**反例**（串行）：

```csharp
public async Task<ProductDetail> GetAsync(int id, CancellationToken ct)
{
    var product = await _productService.GetAsync(id, ct);   // 50ms
    var stock = await _stockService.GetAsync(id, ct);       // 20ms
    var reviews = await _reviewService.GetAsync(id, ct);    // 100ms
    var recs = await _recService.GetAsync(id, ct);          // 80ms
    return new ProductDetail(product, stock, reviews, recs);
}
```

总耗时：250ms

**正例**（并行）：

```csharp
public async Task<ProductDetail> GetAsync(int id, CancellationToken ct)
{
    var productTask = _productService.GetAsync(id, ct);
    var stockTask = _stockService.GetAsync(id, ct);
    var reviewsTask = _reviewService.GetAsync(id, ct);
    var recsTask = _recService.GetAsync(id, ct);

    await Task.WhenAll(productTask, stockTask, reviewsTask, recsTask);

    return new ProductDetail(
        await productTask,
        await stockTask,
        await reviewsTask,
        await recsTask
    );
}
```

总耗时：100ms（最长任务）

### 9.2 案例二：EF Core 流式处理大数据

**场景**：导出 100 万用户数据到 CSV。

**反例**（全量加载）：

```csharp
public async Task ExportAsync(CancellationToken ct)
{
    var users = await _context.Users.ToListAsync(ct);  // OOM
    foreach (var user in users)
    {
        WriteCsv(user);
    }
}
```

**正例**（流式）：

```csharp
public async Task ExportAsync(CancellationToken ct)
{
    await foreach (var user in _context.Users.AsNoTracking().AsAsyncEnumerable().WithCancellation(ct))
    {
        WriteCsv(user);
    }
}
```

内存占用：从 1GB 降到 1MB。

### 9.3 案例三：Channel 实现生产者-消费者

**场景**：日志处理系统，多个生产者写入，多个消费者处理并写入 Kafka。

```csharp
public class LogPipeline
{
    private readonly Channel<LogEntry> _channel =
        Channel.CreateBounded<LogEntry>(10000);

    public async Task ProduceAsync(LogEntry entry, CancellationToken ct)
    {
        await _channel.Writer.WriteAsync(entry, ct);
    }

    public async Task ConsumeAsync(string workerId, CancellationToken ct)
    {
        await foreach (var entry in _channel.Reader.ReadAllAsync(ct))
        {
            await SendToKafkaAsync(entry, ct);
        }
    }

    public async Task RunAsync(int workerCount, CancellationToken ct)
    {
        var consumers = Enumerable.Range(0, workerCount)
            .Select(i => ConsumeAsync($"W{i}", ct));
        await Task.WhenAll(consumers);
    }

    private async Task SendToKafkaAsync(LogEntry entry, CancellationToken ct)
    {
        // ...
        await Task.CompletedTask;
    }
}

public record LogEntry { public string Message { get; init; } = ""; }
```

### 9.4 案例四：取消传播

**场景**：HTTP 请求触发多个子任务，需支持客户端取消。

```csharp
public async Task<AggregatedResult> FetchAllAsync(
    CancellationToken externalCt)
{
    using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
    using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
        externalCt, timeoutCts.Token);

    try
    {
        var tasks = new[]
        {
            FetchProductAsync(linkedCts.Token),
            FetchStockAsync(linkedCts.Token),
            FetchReviewsAsync(linkedCts.Token)
        };

        return new AggregatedResult(await Task.WhenAll(tasks));
    }
    catch (OperationCanceledException) when (externalCt.IsCancellationRequested)
    {
        throw;  // 客户端取消
    }
    catch (OperationCanceledException) when (timeoutCts.IsCancellationRequested)
    {
        throw new TimeoutException("Aggregate fetch timed out");
    }
}
```

### 9.5 案例五：IAsyncEnumerable 流式响应

**场景**：实时股票价格推送 API。

```csharp
[HttpGet("stream")]
public IAsyncEnumerable<StockPrice> StreamAsync(
    string symbol,
    CancellationToken ct)
{
    return _stockService.SubscribeAsync(symbol, ct);
}

public async IAsyncEnumerable<StockPrice> SubscribeAsync(
    string symbol,
    [EnumeratorCancellation] CancellationToken ct = default)
{
    while (!ct.IsCancellationRequested)
    {
        var price = await FetchPriceAsync(symbol, ct);
        yield return price;
        await Task.Delay(TimeSpan.FromSeconds(1), ct);
    }
}
```

客户端通过 SSE 或 NDJSON 流式接收。

### 9.6 案例六：.NET Runtime 源码中的 async

`HttpClient.GetStringAsync` 的简化调用链：

```csharp
// HttpClient.cs
public Task<string> GetStringAsync(string url, CancellationToken ct) =>
    GetStringAsync(new Uri(url), ct);

public async Task<string> GetStringAsync(Uri uri, CancellationToken ct)
{
    using var response = await GetAsync(uri, ct).ConfigureAwait(false);
    return await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
}
```

注意 `.ConfigureAwait(false)`：库代码必须使用，避免在调用方的 SynchronizationContext 上调度。

---

## 10. 习题

### 10.1 选择题

**题目 1**：以下哪种异步方法返回类型不推荐在公共 API 中使用？

A. `Task`
B. `Task<T>`
C. `ValueTask<T>`
D. `void`

**答案**：D

**解析**：`async void` 异常无法被调用者捕获，仅适用于事件处理器。`ValueTask<T>` 虽有限制，但可在公共 API 中使用（需文档说明只能 await 一次）。

---

**题目 2**：在 ASP.NET Core 控制器中，`ConfigureAwait(false)` 的效果是？

A. 必须使用，否则死锁
B. 不需要使用，无 SynchronizationContext
C. 会导致性能下降
D. 必须使用，否则阻塞请求线程

**答案**：B

**解析**：ASP.NET Core 无 `SynchronizationContext`，`await` 默认在线程池执行，`ConfigureAwait(false)` 无效果。

---

**题目 3**：关于 `ValueTask<T>` 多次 await，以下哪个说法正确？

A. 可以多次 await，行为与 `Task<T>` 一致
B. 仅可 await 一次，多次 await 行为未定义
C. 可以多次 await，但第二次 await 必然抛异常
D. 仅可 await 两次

**答案**：B

**解析**：`ValueTask<T>` 是结构体，可能基于池化的 `IValueTaskSource<T>`，多次 await 行为未定义。

---

### 10.2 填空题

**题目 4**：.NET 异步编程的三代模型分别是 ____ 、 ____ 、 ____ 。

**答案**：APM（Begin/End）、EAP（事件）、TAP（Task）

**解析**：APM（.NET 1.0）、EAP（.NET 2.0）、TAP（.NET 4.0）。

---

**题目 5**：`async` 方法在 `await` 时默认捕获 ____ ，用于 continuation 调度。

**答案**：SynchronizationContext

**解析**：`SynchronizationContext.Current` 决定 continuation 在哪个线程执行。`ConfigureAwait(false)` 不捕获。

---

**题目 6**：`Channel<T>` 支持两种模式：____ 和 ____ 。

**答案**：Bounded（有界）、Unbounded（无界）

**解析**：Bounded 有容量限制，生产者满时阻塞；Unbounded 无限制。

---

### 10.3 编程题

**题目 7**：实现一个支持取消、超时、重试的异步 HTTP 客户端包装器。

```csharp
public sealed class ResilientHttpClient
{
    private readonly HttpClient _client = new();

    public async Task<string> GetStringAsync(
        string url,
        int maxRetries = 3,
        TimeSpan? timeout = null,
        CancellationToken ct = default)
    {
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        if (timeout.HasValue) linkedCts.CancelAfter(timeout.Value);

        int attempt = 0;
        while (true)
        {
            try
            {
                return await _client.GetStringAsync(url, linkedCts.Token);
            }
            catch (HttpRequestException) when (attempt < maxRetries)
            {
                attempt++;
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, attempt)), linkedCts.Token);
            }
        }
    }
}
```

---

**题目 8**：实现一个异步生产者-消费者管道，使用 `Channel<T>` 多阶段处理。

```csharp
public class Pipeline<TInput, TOutput>
{
    private readonly Channel<TInput> _input = Channel.CreateBounded<TInput>(1000);
    private readonly Channel<TOutput> _output = Channel.CreateBounded<TOutput>(1000);

    public ChannelWriter<TInput> Input => _input.Writer;
    public ChannelReader<TOutput> Output => _output.Reader;

    public async Task RunAsync(
        Func<TInput, CancellationToken, Task<TOutput>> transform,
        int workerCount,
        CancellationToken ct = default)
    {
        var workers = Enumerable.Range(0, workerCount)
            .Select(async _ =>
            {
                await foreach (var item in _input.Reader.ReadAllAsync(ct))
                {
                    try
                    {
                        var result = await transform(item, ct);
                        await _output.Writer.WriteAsync(result, ct);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Transform error: {ex.Message}");
                    }
                }
            });

        await Task.WhenAll(workers);
        _output.Writer.Complete();
    }
}
```

---

### 10.4 思考题

**题目 9**：为什么 `async void` 在事件处理器中是合法的？

**答案要点**：
- 事件处理器签名 `void EventHandler(object, EventArgs)`，无法返回 Task。
- 事件处理器异常需通过 `Application.UnhandledException` 或 `AppDomain.UnhandledException` 处理。
- .NET 事件模型设计在 async/await 之前，无法修改。

---

**题目 10**：`Task.Delay` 与 `Thread.Sleep` 的本质区别是什么？

**答案要点**：
- `Task.Delay`：异步等待，不阻塞线程，使用 Timer 实现。
- `Thread.Sleep`：同步阻塞，占用线程，使用 OS 定时器。
- 在 UI 线程中 `Thread.Sleep` 会冻结 UI，`Task.Delay` 不会。
- 在 ASP.NET Core 中 `Thread.Sleep` 浪费线程池线程，`Task.Delay` 不会。

---

**题目 11**：在 `Task.WhenAll` 中，一个任务抛异常，其他任务会继续执行吗？

**答案要点**：
- 会的。`Task.WhenAll` 等待所有任务完成。
- 抛出的异常聚合为 `AggregateException`。
- 通过 `await` 只抛第一个异常，需访问 `Task.Exception` 获取所有。

```csharp
var task1 = Task.Run(() => throw new Exception("E1"));
var task2 = Task.Run(() => throw new Exception("E2"));
var allTask = Task.WhenAll(task1, task2);

try { await allTask; }
catch (Exception ex)
{
    // ex 是 E1 或 E2
    Console.WriteLine(allTask.Exception.InnerExceptions.Count);  // 2
}
```

---

## 11. 参考文献

### 11.1 微软官方文档

[1] S. Toub. 2010. *Task-based Asynchronous Pattern (TAP)*. Microsoft. Available: https://learn.microsoft.com/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap

[2] Microsoft. 2024. *Asynchronous programming with async and await*. .NET documentation. Available: https://learn.microsoft.com/dotnet/csharp/async/

[3] Microsoft. 2024. *Asynchronous programming patterns*. .NET documentation. Available: https://learn.microsoft.com/dotnet/standard/asynchronous-programming-patterns/

[4] Microsoft. 2024. *Cancellation in managed threads*. .NET documentation. Available: https://learn.microsoft.com/dotnet/standard/threading/cancellation-in-managed-threads

[5] Microsoft. 2024. *IAsyncEnumerable<T> interface*. .NET API documentation. Available: https://learn.microsoft.com/dotnet/api/system.collections.generic.iasyncenumerable-1

### 11.2 Stephen Toub 博客

[6] S. Toub. 2010. *What's New for Parallelism in .NET 4.5*. .NET blog. Available: https://devblogs.microsoft.com/dotnet/whats-new-for-parallelism-in-net-4-5/

[7] S. Toub. 2017. *ValueTask*. .NET blog. Available: https://devblogs.microsoft.com/dotnet/understanding-the-whys-whats-and-whens-of-valuetask/

[8] S. Toub. 2018. *Async FAQ*. .NET blog. Available: https://devblogs.microsoft.com/dotnet/async-faq/

[9] S. Toub. 2019. *Consuming IAsyncEnumerable in C# 8*. .NET blog. Available: https://devblogs.microsoft.com/dotnet/consuming-iasyncenumerable-in-c-8/

### 11.3 ECMA 规范

[10] Ecma International. 2023. *ECMA-334: C# Language Specification*, 6th edition. Geneva, Switzerland. Available: https://www.ecma-international.org/publications/standards/Ecma-334.htm

[11] Ecma International. 2012. *ECMA-335: Common Language Infrastructure (CLI) Standard*, 6th edition. Geneva, Switzerland. Available: https://www.ecma-international.org/publications/standards/Ecma-335.htm

### 11.4 经典论文

[12] C. Hewitt, P. Bishop, and R. Steiger. 1973. A universal modular ACTOR formalism for artificial intelligence. In *Proceedings of the 3rd International Joint Conference on Artificial Intelligence* (IJCAI'73). Morgan Kaufmann, San Francisco, CA, USA, 235-245.

[13] C. A. R. Hoare. 1978. Communicating sequential processes. *Communications of the ACM* 21, 8 (Aug. 1978), 666-677. DOI: https://doi.org/10.1145/359576.359585

[14] P. Wadler. 1992. *Monads for functional programming*. In Lecture Notes in Computer Science, vol. 925. Springer, Berlin, Heidelberg, 24-52. DOI: https://doi.org/10.1007/978-3-662-02880-3_8

### 11.5 CoreCLR 源码

[15] Microsoft. 2024. *System.Threading.Tasks.Task source code*. GitHub. Available: https://github.com/dotnet/runtime/blob/main/src/libraries/System.Private.CoreLib/src/System/Threading/Tasks/Task.cs

[16] Microsoft. 2024. *System.Threading.Channels source code*. GitHub. Available: https://github.com/dotnet/runtime/tree/main/src/libraries/System.Threading.Channels

### 11.6 异步流

[17] M. Torgersen. 2018. *C# 8: IAsyncEnumerable*. Microsoft Build talk. Available: https://learn.microsoft.com/events/build-2018/brk2110

[18] Microsoft. 2024. *Asynchronous streams*. C# documentation. Available: https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-8#asynchronous-streams

### 11.7 书籍

[19] J. Albahari. 2020. *C# in Depth*, 4th edition. Manning Publications, Shelter Island, NY, USA. ISBN: 978-1617294532

[20] C. Wagner. 2023. *C# 12 and .NET 8 - Modern Cross-Platform Development*. Packt Publishing, Birmingham, UK. ISBN: 978-1837635870

[21] S. Cleary. 2018. *Concurrency in C# Cookbook*, 2nd edition. O'Reilly Media, Sebastopol, CA, USA. ISBN: 978-1509336765

---

## 12. 延伸阅读

### 12.1 书籍

- **《Concurrency in C# Cookbook》**（Stephen Cleary）：异步编程实战，涵盖 Task、Channel、并发协调。
- **《C# in Depth》**（Jon Skeet）：C# 语言深度指南，第 15 章详述 async/await。
- **《Pro Asynchronous Programming in .NET》**（Richard Blewett）：异步编程全面指南。
- **《CLR via C#》**（Jeffrey Richter）：CLR 经典教材，第 27 章详述异步。

### 12.2 在线资源

- **Stephen Toub 博客**: https://devblogs.microsoft.com/dotnet/author/stoub/
- **Stephen Cleary 博客**: https://blog.stephencleary.com/
- **.NET 异步 FAQ**: https://devblogs.microsoft.com/dotnet/async-faq/
- **Async/Await FAQ**: https://learn.microsoft.com/archive/blogs/ericlippert/async-await-faq

### 12.3 视频与课程

- **Channel 9 Async Deep Dive**: Stephen Toub 深度讲解。
- **Pluralsight - Async C# Best Practices**: 异步最佳实践。
- **NDC Oslo - C# Async**: 异步编程演讲合集。
- **YouTube - Stephen Cleary**: 异步编程讲座。

### 12.4 工具

- **Microsoft.VisualStudio.Threading.Analyzers**: 异步分析器。
- **Async Debugging in Visual Studio**: 异步调试器（Tasks 窗口）。
- **BenchmarkDotNet**: 异步性能基准测试。
- **dotnet-counters**: 实时异步监控。
- **dotnet-trace**: 异步事件追踪。

### 12.5 相关章节

- **async-await 状态机**: 深入状态机生成原理。
- **LINQ 延迟与立即执行**: 与异步流（IAsyncEnumerable）配合。
- **GC 代机制**: 异步状态机对 GC 的影响。
- **Span 与 Memory**: 零拷贝内存操作，与异步 I/O 配合。

---

## 附录 A：异步 API 速查

### A.1 Task 核心 API

| 方法 | 说明 |
|------|------|
| `Task.Run(Action)` | 在线程池执行 |
| `Task.Delay(TimeSpan)` | 异步延迟 |
| `Task.WhenAll(IEnumerable<Task>)` | 等待全部完成 |
| `Task.WhenAny(IEnumerable<Task>)` | 等待任一完成 |
| `Task.CompletedTask` | 已完成的 Task |
| `Task.FromResult<T>(T)` | 同步结果 Task |
| `Task.FromException(Exception)` | 异常 Task |
| `Task.FromCanceled(CancellationToken)` | 取消 Task |
| `task.WaitAsync(CancellationToken)` | 等待并支持取消（.NET 6+） |
| `task.WaitAsync(TimeSpan)` | 等待并支持超时（.NET 6+） |
| `task.ConfigureAwait(bool)` | 配置上下文捕获 |

### A.2 ValueTask 核心 API

| 方法 | 说明 |
|------|------|
| `ValueTask.CompletedTask` | 已完成的 ValueTask |
| `ValueTask<T>.FromResult(T)` | 同步结果 |
| `valueTask.AsTask()` | 转换为 Task |
| `valueTask.Preserve()` | 保留以支持多次 await（.NET 8+） |

### A.3 CancellationToken 核心 API

| 方法 | 说明 |
|------|------|
| `cts.Cancel()` | 取消 |
| `cts.CancelAfter(TimeSpan)` | 超时取消 |
| `cts.Token` | 获取 Token |
| `ct.IsCancellationRequested` | 是否请求取消 |
| `ct.ThrowIfCancellationRequested()` | 抛出 OperationCanceledException |
| `ct.Register(Action)` | 注册取消回调 |
| `CancellationTokenSource.CreateLinkedTokenSource(...)` | 链接多个 Token |

### A.4 IAsyncEnumerable 核心 API

| 方法 | 说明 |
|------|------|
| `await foreach (var x in src)` | 消费异步流 |
| `src.WithCancellation(ct)` | 附加取消 |
| `src.ConfigureAwait(false)` | 不捕获上下文 |
| `[EnumeratorCancellation]` | 标记取消参数 |

### A.5 Channel<T> 核心 API

| 方法 | 说明 |
|------|------|
| `Channel.CreateBounded<T>(capacity)` | 创建有界 Channel |
| `Channel.CreateUnbounded<T>()` | 创建无界 Channel |
| `channel.Writer.WriteAsync(item)` | 异步写入 |
| `channel.Writer.TryWrite(item)` | 同步写入 |
| `channel.Writer.Complete()` | 完成写入 |
| `channel.Reader.ReadAllAsync()` | 读取所有 |
| `channel.Reader.TryRead(out item)` | 同步读取 |
| `channel.Reader.WaitToReadAsync()` | 等待可读 |

---

## 附录 B：异步调试技巧

### B.1 Visual Studio Tasks 窗口

调试 > 窗口 > Tasks，查看所有 Task 的状态、调用栈。

### B.2 异步调用栈

Visual Studio 2015+ 支持异步调用栈，可以追踪 `await` 之前的调用。

### B.3 异常追踪

```csharp
TaskScheduler.UnobservedTaskException += (sender, e) =>
{
    Console.WriteLine($"Unobserved: {e.Exception}");
    e.SetObserved();
};
```

### B.4 异步死锁诊断

- 在 UI 应用中，`var x = task.Result;` 可能死锁。
- 使用 `var x = await task;` 替代。
- 调试时检查 `SynchronizationContext.Current` 是否非空。

### B.5 性能分析

- 使用 PerfView 捕获 async 时间。
- 使用 dotnet-trace 追踪 Task 调度。
- 使用 BenchmarkDotNet 测量异步开销。

---

## 附录 C：异步最佳实践清单

### C.1 方法签名

- [ ] 异步方法以 `Async` 结尾。
- [ ] 返回 `Task` 或 `Task<T>`（公共 API）。
- [ ] 接受 `CancellationToken` 参数（默认 `default`）。
- [ ] 避免 `async void`（事件处理器除外）。

### C.2 库代码

- [ ] 所有 `await` 使用 `ConfigureAwait(false)`。
- [ ] 公共 API 返回 `Task<T>`（除非性能敏感用 `ValueTask<T>`）。
- [ ] 文档说明 `ValueTask<T>` 只能 await 一次。

### C.3 应用代码

- [ ] 全栈异步，避免 `.Result`、`.Wait()`。
- [ ] 使用 `await using` 异步释放资源。
- [ ] 使用 `await foreach` 消费异步流。
- [ ] 长时间运行的任务使用 `BackgroundService`。

### C.4 并发

- [ ] 独立任务用 `Task.WhenAll`。
- [ ] 限流用 `SemaphoreSlim`。
- [ ] 生产者-消费者用 `Channel<T>`。
- [ ] 避免在循环中 `await`（除非顺序依赖）。

### C.5 取消

- [ ] 所有异步 API 接受 `CancellationToken`。
- [ ] 长时间运行的任务检查 `ct.ThrowIfCancellationRequested()`。
- [ ] 超时用 `CancellationTokenSource(TimeSpan)`。
- [ ] 多源取消用 `CreateLinkedTokenSource`。

### C.6 异常处理

- [ ] `Task.WhenAll` 异常需访问 `Task.Exception` 获取所有。
- [ ] 注册 `TaskScheduler.UnobservedTaskException`。
- [ ] `async void` 必须在方法内 try/catch。

---

## 结语

C# 异步编程从 APM 的回调地狱，到 EAP 的事件模型，再到 TAP + async/await 的线性书写，是 .NET 平台最重要的演进之一。理解 Task/ValueTask 的内部结构、CancellationToken 的取消传播、IAsyncEnumerable 的异步流、Channel 的生产者-消费者模型，是编写高并发、低延迟 .NET 应用的基础。

异步编程的核心不是"如何写 async/await"——而是理解：
- **何时需要异步**：I/O 密集型用异步，CPU 密集型用并行。
- **如何避免陷阱**：`async void`、`.Result`、`ValueTask` 多次 await。
- **如何组合**：`WhenAll`、`Channel`、`IAsyncEnumerable`。
- **如何取消**：`CancellationToken` 全链路传播。

掌握这些，才能写出真正"全栈异步"的高性能 .NET 应用。

---

*最后更新：2026-07-20*
