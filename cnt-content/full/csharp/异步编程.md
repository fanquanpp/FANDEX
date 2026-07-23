---
order: 5
title: 'C# 异步编程'
module: csharp
category: 'C#'
difficulty: intermediate
description: 'APM/EAP/TAP 演化、async/await 状态机、Task/ValueTask、SynchronizationContext、ConfigureAwait、并行编程(TPL)、Channel、IAsyncEnumerable、异步流、常见陷阱与最佳实践'
author: fanquanpp
updated: '2026-07-21'
related:
  - csharp/概述与环境配置
  - csharp/基础语法
  - csharp/面向对象编程
  - csharp/泛型与集合
  - csharp/高级特性
  - csharp/NET平台与生态
prerequisites:
  - csharp/概述与环境配置
  - csharp/基础语法
---

# C# 异步编程

> 本篇是 FANDEX C# 系列的第五篇。我们将系统讲解 C# 异步编程：从 APM/EAP/TAP 模型演化到 async/await，深入剖析状态机转换、SynchronizationContext、ConfigureAwait、ValueTask、Channel、IAsyncEnumerable 等。内容对标 MIT 6.005（Software Construction）、Stanford CS110（Principles of Computer Systems）、CMU 15-440（Distributed Systems）课程教学严谨度，支持 0 基础自学，同时覆盖企业级实战要点。

---

## 目录

1. [学习目标（Bloom 分类法）](#1-学习目标bloom-分类法)
2. [历史动机与演化](#2-历史动机与演化)
3. [形式化定义](#3-形式化定义)
4. [理论推导与证明](#4-理论推导与证明)
5. [代码示例](#5-代码示例)
6. [对比分析](#6-对比分析)
7. [常见陷阱与反模式](#7-常见陷阱与反模式)
8. [工程实践与最佳实践](#8-工程实践与最佳实践)
9. [案例研究](#9-案例研究)
10. [习题与思考题](#10-习题与思考题)
11. [参考文献](#11-参考文献)
12. [延伸阅读](#12-延伸阅读)

---

## 1. 学习目标（Bloom 分类法）

### 1.1 记忆（Remember）

- **R1**：能复述异步编程三阶段演化：APM（`Begin/End`）、EAP（`Event-based`）、TAP（`Task-based`）。
- **R2**：能列举 `async`/`await` 关键字的语言版本（C# 5.0，2012）与 .NET 平台支持（.NET Framework 4.5+）。
- **R3**：能识别 `Task`、`Task<T>`、`ValueTask`、`ValueTask<T>` 四种异步返回类型的差异。
- **R4**：能背诵 `Task` 的核心 API：`Run`、`WhenAll`、`WhenAny`、`Delay`、`FromResult`、`FromCanceled`、`FromException`、`CompletedTask`、`WaitAsync`（.NET 6+）。
- **R5**：能复述 `SynchronizationContext` 在 WinForms/WPF/ASP.NET（旧版）中的角色与 `ConfigureAwait(false)` 的作用。

### 1.2 理解（Understand）

- **U1**：能解释 `async` 方法被编译器转换为状态机的过程：每个 `await` 成为状态切换点。
- **U2**：能说明 `Task` 与 `ValueTask` 在分配语义上的差异：`Task` 是引用类型（堆分配），`ValueTask` 是结构（可能无堆分配）。
- **U3**：能阐述 `SynchronizationContext.Current` 在 `await` 后续执行（continuation）调度中的作用。
- **U4**：能描述 `CancellationToken` 的传播机制：协作式取消、`ThrowIfCancellationRequested`、`Register` 回调。
- **U5**：能解释 `IAsyncEnumerable<T>` 与 `IEnumerable<T>` 的差异：异步迭代、`await foreach`、`EnumeratorCancellation`。
- **U6**：能说明 `Channel<T>` 作为生产者-消费者原语的优势：高性能、背压、多读者多写者支持。

### 1.3 应用（Apply）

- **A1**：能正确编写 `async Task<T>` 方法，处理异常与取消。
- **A2**：能使用 `Task.WhenAll` 并行执行多个异步操作。
- **A3**：能使用 `CancellationTokenSource` 实现超时与取消链。
- **A4**：能使用 `IAsyncEnumerable<T>` 实现异步流式数据产出。
- **A5**：能使用 `Channel<T>` 实现生产者-消费者模式。
- **A6**：能使用 `Parallel.ForEachAsync` 实现限流并发。

### 1.4 分析（Analyze）

- **An1**：能分析 `async void` 与 `async Task` 在异常传播上的差异。
- **An2**：能拆解 `.Result` / `.Wait()` 在 UI 应用中导致死锁的根因（同步上下文阻塞）。
- **An3**：能分析 `ValueTask` 重复 `await` 的不安全性（状态机被消耗）。

### 1.5 评价（Evaluate）

- **E1**：能评判 `Task` vs `ValueTask` 在特定场景（同步结果概率高）的取舍。
- **E2**：能评估 `async/await` vs 显式回调（`ContinueWith`）在可读性、性能、调试上的差异。
- **E3**：能评价 `Channel<T>` vs `BlockingCollection<T>` 在异步场景的优劣。

### 1.6 创造（Create）

- **C1**：能设计一个完整的异步服务层，包含取消、进度、超时、重试策略。
- **C2**：能为团队编写《C# 异步编程规范》文档，涵盖库代码、UI 代码、ASP.NET Core 代码的最佳实践。

---

## 2. 历史动机与演化

### 2.1 同步阻塞的痛点

在异步模型出现前，I/O 密集型操作（网络、文件、数据库）只能通过阻塞线程等待：

```csharp
// 同步阻塞：占用线程，资源浪费严重
public string DownloadString(string url)
{
    var request = WebRequest.Create(url);
    using var response = request.GetResponse();   // 阻塞调用线程数百毫秒至数秒
    using var reader = new StreamReader(response.GetResponseStream());
    return reader.ReadToEnd();
}
```

阻塞的代价：

- **线程资源浪费**：每个线程默认占用 1MB 栈空间，1000 个并发请求需要 1GB 栈。
- **吞吐瓶颈**：线程池线程有限（默认 CPU 逻辑核心数），阻塞即降低吞吐。
- **响应性丧失**：UI 线程被阻塞时界面卡顿，用户操作无响应。
- **扩展性差**：每客户端一线程的模型无法支撑 C10K（万级并发连接）。

### 2.2 APM 模型（.NET Framework 1.0，2002）

APM（Asynchronous Programming Model）基于 `Begin/End` 模式：

```csharp
// APM 模式：BeginGetResponse + EndGetResponse + AsyncCallback
public IAsyncResult BeginDownload(string url, AsyncCallback callback, object state)
{
    var request = WebRequest.Create(url);
    return request.BeginGetResponse(callback, new Tuple<WebRequest, string>(request, url));
}

public string EndDownload(IAsyncResult ar)
{
    var (request, _) = (Tuple<WebRequest, string>)ar.AsyncState;
    using var response = request.EndGetResponse(ar);
    using var reader = new StreamReader(response.GetResponseStream());
    return reader.ReadToEnd();
}

// 使用：回调嵌套（callback hell）
BeginDownload(url, ar =>
{
    var result = EndDownload(ar);
    Console.WriteLine(result);
}, null);
```

APM 的痛点：

1. **回调地狱**：多个异步操作嵌套，代码可读性极差。
2. **错误处理分散**：异常需在 `End` 方法中检查，无法用 `try-catch` 统一处理。
3. **状态管理复杂**：`AsyncState` 弱类型，常需自定义状态对象。
4. **API 复杂**：每个异步操作需要 4 个方法（`Begin`、`End`、`IAsyncResult`、`AsyncCallback`）。

### 2.3 EAP 模型（.NET Framework 2.0，2005）

EAP（Event-based Asynchronous Pattern）基于事件：

```csharp
// EAP 模式：*Async 方法 + *Completed 事件
var client = new WebClient();
client.DownloadStringCompleted += (sender, e) =>
{
    if (e.Error != null)
        Console.WriteLine($"Error: {e.Error.Message}");
    else if (e.Cancelled)
        Console.WriteLine("Cancelled");
    else
        Console.WriteLine(e.Result);
};
client.DownloadStringAsync(new Uri(url));
```

EAP 的痛点：

1. **事件注册/注销繁琐**：需显式 `+=` 与 `-=`。
2. **无法组合**：无法轻松实现"等待全部完成"或"等待任一完成"。
3. **仍是回调风格**：只是包装为事件，本质未变。
4. **取消与进度支持不统一**：每个类自行设计 `CancelAsync`、`ReportProgress`。

### 2.4 TAP 模型（.NET Framework 4.0，2010）

TAP（Task-based Asynchronous Pattern）基于 `Task`/`Task<T>`：

```csharp
// TAP 模式：返回 Task<T>，调用方决定如何等待
public Task<string> DownloadStringAsync(string url)
{
    var client = new WebClient();
    return client.DownloadStringTaskAsync(url);
}

// 调用方使用 ContinueWith（仍是回调风格）
DownloadStringAsync(url).ContinueWith(t =>
{
    if (t.IsFaulted) { /* 处理异常 */ }
    else { Console.WriteLine(t.Result); }
});
```

TAP 的优势：

1. **统一抽象**：所有异步操作返回 `Task`，API 一致。
2. **可组合**：`Task.WhenAll`、`Task.WhenAny` 提供组合原语。
3. **取消统一**：`CancellationToken` 作为参数标准。
4. **仍需回调**：`ContinueWith` 比回调好，但代码不如同步直观。

### 2.5 async/await（C# 5.0，2012）

`async`/`await` 是语言级异步支持，让异步代码像同步代码一样直观：

```csharp
// async/await：异步代码、同步外观
public async Task<string> DownloadStringAsync(string url)
{
    using var client = new HttpClient();
    return await client.GetStringAsync(url);
}

// 调用方
try
{
    var result = await DownloadStringAsync(url);
    Console.WriteLine(result);
}
catch (HttpRequestException ex)
{
    Console.WriteLine($"Error: {ex.Message}");
}
```

`async/await` 的核心创新：

- **状态机转换**：编译器将 `async` 方法转换为状态机，`await` 成为状态切换点。
- **零线程开销等待**：`await` 不阻塞线程，而是注册 continuation，让线程返回线程池。
- **同步式异常处理**：`try-catch` 可直接捕获异步异常。
- **可组合性**：`Task.WhenAll`、`Task.WhenAny` 提供组合原语，配合 `await` 表达自然。

### 2.6 后续演进

#### 2.6.1 ValueTask（C# 7.0，2017）

`ValueTask<T>` 是值类型的异步结果包装，避免在结果常同步可用时的堆分配：

```csharp
public ValueTask<int> GetCachedValueAsync(string key)
{
    if (_cache.TryGetValue(key, out int value))
        return new ValueTask<int>(value);   // 同步可用，零分配
    return new ValueTask<int>(LoadFromDiskAsync(key));
}
```

#### 2.6.2 IAsyncEnumerable（C# 8.0，2019）

异步流式数据产出，逐项异步枚举：

```csharp
public async IAsyncEnumerable<string> StreamLinesAsync(string path,
    [EnumeratorCancellation] CancellationToken ct = default)
{
    await using var reader = new StreamReader(path);
    while (await reader.ReadLineAsync(ct) is { } line)
    {
        ct.ThrowIfCancellationRequested();
        yield return line;
    }
}

await foreach (var line in StreamLinesAsync("data.txt"))
    Console.WriteLine(line);
```

#### 2.6.3 Parallel.ForEachAsync（.NET 6，2021）

异步并行迭代，支持限流与取消：

```csharp
await Parallel.ForEachAsync(urls, new ParallelOptions
{
    MaxDegreeOfParallelism = 10,
    CancellationToken = ct
}, async (url, token) =>
{
    await DownloadAsync(url, token);
});
```

#### 2.6.4 Task.WaitAsync（.NET 6，2021）

为已有 `Task` 添加超时或取消：

```csharp
// 等待 task，超时则抛 TimeoutException
var result = await task.WaitAsync(TimeSpan.FromSeconds(5));

// 等待 task，ct 取消则抛 OperationCanceledException
var result = await task.WaitAsync(ct);

// 同时支持超时与取消
var result = await task.WaitAsync(TimeSpan.FromSeconds(5), ct);
```

#### 2.6.5 Async Streams 增强（C# 9-13）

- **`EnumeratorCancellation`**：让 `await foreach` 的 `CancellationToken` 自动传递。
- **`ConfigureAwait` on `IAsyncEnumerable`**：`await foreach (var x in source.ConfigureAwait(false))`。
- **`AsyncIteratorMethodBuilder`**：自定义异步迭代器底层。

---

## 3. 形式化定义

### 3.1 Task 作为 Monad

`Task<T>` 是异步计算的单子（Monad），满足 monad 三律：

设 `M<T> = Task<T>`，`return` 与 `bind` 定义为：

$$
\text{return} : T \to \text{Task}\langle T \rangle, \quad \text{return}(v) = \text{Task.FromResult}(v)
$$

$$
\text{bind} : \text{Task}\langle T \rangle \times (T \to \text{Task}\langle U \rangle) \to \text{Task}\langle U \rangle
$$

$$
\text{bind}(t, f) = t.\text{ContinueWith}(x \Rightarrow f(x.\text{Result})).\text{Unwrap}()
$$

`async`/`await` 即 `bind` 的语法糖：

$$
\llbracket \texttt{await } e \texttt{ in } E \rrbracket = \text{bind}(\llbracket e \rrbracket, v \Rightarrow \llbracket E[v] \rrbracket)
$$

### 3.2 状态机转换（CPS Transform）

`async` 方法的语义等价于 Continuation-Passing Style（CPS）转换。设原方法：

```csharp
async Task<int> MAsync()
{
    int x = await A();
    int y = await B();
    return x + y;
}
```

形式化为状态机 $S = (PC, \text{locals}, \text{awaiter})$：

$$
\text{MoveNext}() = \begin{cases}
\text{state } 0: & \text{call } A, \text{set awaiter}, \text{if not done, return} \\
\text{state } 1: & x = \text{awaiter.GetResult()}; \text{call } B, \text{set awaiter}, \text{if not done, return} \\
\text{state } 2: & y = \text{awaiter.GetResult()}; \text{return } x + y
\end{cases}
$$

每个 `await` 编号为状态 $0, 1, 2, \ldots$，编译器生成：

- **状态字段 `<>1__state`**：当前执行到哪个 `await`。
- **局部字段**：原方法的局部变量提升为状态机字段。
- **awaiter 字段**：`TaskAwaiter<T>` 等待器。
- **builder 字段**：`AsyncTaskMethodBuilder<T>` 构建 `Task`。

### 3.3 SynchronizationContext 形式化

设 $SC$ 为 `SynchronizationContext`，`Post(callback, state)` 将回调调度到上下文：

$$
\text{Post} : SC \times (\text{state} \to \text{unit}) \times \text{state} \to \text{unit}
$$

`await` 的 continuation 调度规则：

$$
\text{schedule}(SC, cb) = \begin{cases}
SC.\text{Post}(cb, \text{null}) & \text{if } SC \neq \text{null and not ConfigureAwait(false)} \\
\text{TaskScheduler.Default.\text{Post}}(cb) & \text{otherwise}
\end{cases}
$$

各上下文实现：

- **WinForms**：`WindowsFormsSynchronizationContext`，`Post` 通过 `Control.BeginInvoke` 在 UI 线程执行。
- **WPF**：`DispatcherSynchronizationContext`，`Post` 通过 `Dispatcher.BeginInvoke`。
- **ASP.NET（旧版）**：`AspNetSynchronizationContext`，`Post` 在请求上下文执行。
- **ASP.NET Core**：`SynchronizationContext.Current == null`，continuation 在线程池执行。
- **控制台/默认**：`SynchronizationContext.Current == null`，continuation 在线程池执行。

### 3.4 CancellationToken 形式化

`CancellationToken` 是协作式取消原语：

$$
CT = (\text{IsCancellationRequested} : \text{bool}, \text{Register} : (unit \to unit) \to \text{Registration})
$$

取消传播规则：

1. **源**：`CancellationTokenSource` 维护取消状态与回调链。
2. **令牌**：`CancellationToken` 是源的只读视图。
3. **检查**：`ThrowIfCancellationRequested()` 在取消时抛 `OperationCanceledException`。
4. **注册**：`Register(cb)` 注册取消时的回调。
5. **链接**：`CancellationTokenSource.CreateLinkedTokenSource(t1, t2)` 在任一源取消时取消。

### 3.5 ValueTask 语义

`ValueTask<T>` 是 `Task<T>` 与 `T` 的二选一并集：

$$
\text{ValueTask}\langle T \rangle = \text{Task}\langle T \rangle \cup T \cup (\text{IValueTaskSource}\langle T \rangle, \text{token})
$$

三态语义：

1. **同步结果**：直接持有 `T`，无堆分配。
2. **异步等待**：持有 `Task<T>`，等价于 `await task`。
3. **池化源**：持有 `IValueTaskSource<T>`（如 `AsyncValueTaskMethodBuilder` 池化实例），零分配。

### 3.6 IAsyncEnumerable 形式化

`IAsyncEnumerable<T>` 是异步流：

$$
\text{IAsyncEnumerable}\langle T \rangle = \text{GetAsyncEnumerator} : CT \to \text{IAsyncEnumerator}\langle T \rangle
$$

$$
\text{IAsyncEnumerator}\langle T \rangle = (\text{MoveNextAsync} : \text{unit} \to \text{ValueTask}\langle bool \rangle, \text{Current} : T)
$$

`await foreach` 的展开：

```csharp
await foreach (var item in source.WithCancellation(ct))
{
    // body
}
```

等价于：

```csharp
var enumerator = source.GetAsyncEnumerator(ct);
try
{
    while (await enumerator.MoveNextAsync())
    {
        var item = enumerator.Current;
        // body
    }
}
finally
{
    await enumerator.DisposeAsync();
}
```

### 3.7 Channel 形式化

`Channel<T>` 是有界或无界的异步队列：

$$
\text{Channel}\langle T \rangle = (\text{Writer} : \text{ChannelWriter}\langle T \rangle, \text{Reader} : \text{ChannelReader}\langle T \rangle)
$$

- **`Writer.WriteAsync(item, ct)`**：若满则异步等待，否则入队。
- **`Writer.TryWrite(item)`**：立即尝试入队，满则返回 false。
- **`Reader.ReadAsync(ct)`**：若空则异步等待，否则出队。
- **`Writer.Complete()`**：标记不再写入，`Reader` 读完后 `ReadAllAsync` 结束。

有界 Channel 选项：

$$
\text{BoundedChannelOptions} = (\text{Capacity} : \text{int}, \text{FullMode} : \{\text{Wait}, \text{DropOldest}, \text{DropWrite}, \text{DropNewest}\}, \text{SingleReader} : \text{bool}, \text{SingleWriter} : \text{bool})
$$

---

## 4. 理论推导与证明

### 4.1 async/await 等价于 CPS 转换

**命题 4.1**：对于任意 `async Task<T>` 方法 `M`，存在等价的 CPS 风格方法 `M_CPS(k : T -> Task)`，使得 `await M()` 与 `M_CPS(v => ...)` 行为一致。

**证明（Sketch）**：编译器将 `M` 编译为状态机 `SM`，状态字段 `state` 标记 `await` 位置，`MoveNext` 根据状态执行对应代码段：

```
state 0: t1 = expr1; awaiter1 = t1.GetAwaiter();
         if (!awaiter1.IsCompleted) { state = 1; builder.AwaitUnsafeOnCompleted(...); return; }
         goto state 1;
state 1: v1 = awaiter1.GetResult();
         t2 = expr2(v1); awaiter2 = t2.GetAwaiter();
         ...
```

CPS 转换：

```
M_CPS(k) = expr1().ContinueWith(t1 =>
           {
               var v1 = t1.Result;
               expr2(v1).ContinueWith(t2 =>
               {
                   var v2 = t2.Result;
                   k(v2);
               });
           });
```

两者行为等价：均按 `await` 顺序执行，结果相同，异常传播一致。差异仅在性能（状态机避免闭包分配）与可读性。

### 4.2 同步上下文死锁定理

**命题 4.2**：在 WinForms/WPF 中，若 `FetchDataAsync()` 内部使用默认 `ConfigureAwait(true)`（即捕获同步上下文），且调用方在 UI 线程上同步等待 `FetchDataAsync().Result`，则发生死锁。

**证明**：

设 UI 线程为 $T_{\text{UI}}$，`FetchDataAsync` 在 $T_{\text{UI}}$ 上启动，捕获 `SC = SynchronizationContext.Current`（即 UI 上下文）。

1. `await client.GetStringAsync(url)` 在 $T_{\text{UI}}$ 启动 HTTP 请求，返回未完成 `Task`。
2. `await` 挂起 `FetchDataAsync`，控制返回调用方。
3. 调用方调用 `.Result` 阻塞 $T_{\text{UI}}$，等待 `Task` 完成。
4. HTTP 请求在 IO 线程完成，触发 `Task` 完成，continuation 通过 `SC.Post(cb)` 调度到 $T_{\text{UI}}$。
5. `SC.Post` 将 `cb` 加入 UI 消息队列，等待 $T_{\text{UI}}$ 处理消息。
6. 但 $T_{\text{UI}}$ 阻塞在 `.Result` 上，无法处理消息。
7. 形成循环等待：$T_{\text{UI}}$ 等待 `Task` 完成，`Task` 等待 $T_{\text{UI}}$ 执行 continuation。

死锁条件：

- 同步上下文存在（WinForms/WPF/旧 ASP.NET）。
- 调用方在同步上下文线程上同步等待。
- 异步方法捕获同步上下文。

**推论 4.2.1**：在 ASP.NET Core（无 `SynchronizationContext`）或控制台应用中，`.Result` 不会死锁，但仍阻塞线程，不推荐。

**推论 4.2.2**：库代码使用 `ConfigureAwait(false)` 可避免死锁，因为 continuation 不依赖原同步上下文。

### 4.3 ValueTask 重复 await 不安全性

**命题 4.3**：对同一 `ValueTask<T>` 实例多次 `await` 是未定义行为。

**证明**：

`ValueTask<T>` 内部可能持有 `IValueTaskSource<T>` 池化实例（`async ValueTask<T>` 方法默认使用 `AsyncValueTaskMethodBuilder` 池化）。`await` 后实例返回池：

1. 第一次 `await vt`：调用 `vt.GetAwaiter()`，得到 `ValueTaskAwaiter<T>`，后者持有 `IValueTaskSource` 引用与 `token`。
2. `awaiter.GetResult()` 调用 `source.GetResult(token)`，源标记结果已消费。
3. `await` 完成后，源可能被归还池，被下一个 `async ValueTask<T>` 复用。
4. 第二次 `await vt`：`vt` 仍引用旧源，但 `token` 已失效，可能返回错误结果或抛 `InvalidOperationException`。

**推论 4.3.1**：若 `ValueTask<T>` 内部是 `Task<T>`（非池化源），则多次 `await` 安全，等价于多次 `await task`。

**结论**：由于 `ValueTask<T>` 内部表示不透明，调用方应将其视为一次性消费。

### 4.4 Task.WhenAll 异常聚合

**命题 4.4**：`await Task.WhenAll(tasks)` 抛出第一个异常，但所有 `tasks` 仍会执行完成。

**证明**：

`Task.WhenAll` 创建新 `Task`，在所有输入 `Task` 完成后完成。若有任一输入 faulted，则 `WhenAll` 的 `Task` 也 faulted，其 `Exception` 是 `AggregateException`，包含所有输入的异常。

但 `await` 仅抛出 `Task.Exception.InnerExceptions[0]`（第一个），其余异常被吞没。

**实践**：需访问所有异常时使用 `try { await Task.WhenAll(...) } catch (Exception ex) when (ex is not AggregateException)` 后检查 `Task.Exception`，或显式 `Task.WhenAll(...).ContinueWith(t => ...)`。

### 4.5 异步 Liveness 性质

**命题 4.5**：若 `async` 方法不阻塞（无 `.Result`、`.Wait()`、`Thread.Sleep`），且所有 `await` 的任务最终完成，则方法最终完成。

**证明（Sketch）**：

状态机的 `MoveNext` 仅在以下情况返回：

1. 任务同步完成：继续执行下一段。
2. 任务异步完成：注册 continuation，返回；任务完成时再次调用 `MoveNext`。
3. 抛出异常：`SetException`，`Task` 完成。

若所有 `await` 的任务最终完成，则状态机最终达到最终状态，`SetResult` 被调用。若无未捕获异常，方法正常返回；否则 faulted。

**反例**：若 `await` 永不完成的 `Task`（如 `new TaskCompletionSource<int>().Task` 无 `SetResult`），则方法永远挂起，需 `CancellationToken` 或超时打破。

---

## 5. 代码示例

### 5.1 项目创建与编译

```bash
# 创建控制台项目（.NET 9）
dotnet new console -n AsyncDemo --framework net9.0
cd AsyncDemo

# 添加 HTTP 客户端
dotnet add package Microsoft.Extensions.Http.Polly --version 9.0.0

# 编译并运行
dotnet run

# 发布为单文件（含 Native AOT 可选）
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true
```

### 5.2 APM 模式示例

```csharp
// APM：BeginRead/EndRead + AsyncCallback
using System.Text;

byte[] buffer = new byte[1024];
using var stream = new FileStream("data.txt", FileMode.Open,
    FileAccess.Read, FileShare.Read, 4096, FileOptions.Asynchronous);

IAsyncResult ar = stream.BeginRead(buffer, 0, buffer.Length,
    asyncResult =>
    {
        var fs = (FileStream)asyncResult.AsyncState!;
        int bytesRead = fs.EndRead(asyncResult);
        Console.WriteLine($"Read {bytesRead} bytes: {Encoding.UTF8.GetString(buffer, 0, bytesRead)}");
    }, stream);

// 主线程做其他工作
ar.AsyncWaitHandle.WaitOne();
```

### 5.3 EAP 模式示例

```csharp
// EAP：*Async + *Completed 事件
var client = new System.Net.WebClient();
client.DownloadStringCompleted += (sender, e) =>
{
    if (e.Error != null)
        Console.WriteLine($"Error: {e.Error.Message}");
    else if (e.Cancelled)
        Console.WriteLine("Cancelled");
    else
        Console.WriteLine($"Downloaded: {e.Result.Length} chars");
};
client.DownloadStringAsync(new Uri("https://example.com"));
```

### 5.4 TAP 与 async/await

```csharp
using System.Net.Http;

HttpClient client = new();

// TAP：直接返回 Task<string>
Task<string> task = client.GetStringAsync("https://example.com");

// async/await：异步等待
async Task<string> DownloadAsync(string url)
{
    return await client.GetStringAsync(url).ConfigureAwait(false);
}

string content = await DownloadAsync("https://example.com");
Console.WriteLine(content.Length);
```

### 5.5 Task 创建与组合

```csharp
// Task.Run：在线程池执行
Task<int> t1 = Task.Run(() =>
{
    Thread.Sleep(100);
    return 42;
});

// Task.Factory.StartNew：更多控制
Task<int> t2 = Task.Factory.StartNew(() => 100,
    CancellationToken.None,
    TaskCreationOptions.LongRunning,
    TaskScheduler.Default);

// Task.FromResult：同步结果包装
Task<int> t3 = Task.FromResult(7);

// Task.CompletedTask：已完成的空 Task
Task t4 = Task.CompletedTask;

// Task.Delay：异步延迟
Task t5 = Task.Delay(TimeSpan.FromSeconds(1));

// WhenAll：等待全部完成
int[] results = await Task.WhenAll(t1, t2, t3);

// WhenAny：等待任一完成
Task<int> first = await Task.WhenAny(t1, t2, t3);
Console.WriteLine($"First result: {first.Result}");
```

### 5.6 CancellationToken 取消链

```csharp
// 基本取消
using var cts = new CancellationTokenSource();

// 超时自动取消
cts.CancelAfter(TimeSpan.FromSeconds(5));

// 手动取消
_ = Task.Run(async () =>
{
    await Task.Delay(3000);
    cts.Cancel();
});

try
{
    await LongOperationAsync(cts.Token);
}
catch (OperationCanceledException)
{
    Console.WriteLine("Operation cancelled");
}

// 链接多个取消源
using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
    cts.Token,
    userCancelCts.Token);
```

### 5.7 IAsyncEnumerable 异步流

```csharp
using System.Runtime.CompilerServices;

public async IAsyncEnumerable<int> GenerateAsync(
    int count,
    [EnumeratorCancellation] CancellationToken ct = default)
{
    for (int i = 0; i < count; i++)
    {
        ct.ThrowIfCancellationRequested();
        await Task.Delay(100, ct);
        yield return i;
    }
}

// 消费
await foreach (var item in GenerateAsync(10).WithCancellation(ct))
{
    Console.WriteLine(item);
}

// 不捕获上下文（库代码）
await foreach (var item in GenerateAsync(10).ConfigureAwait(false))
{
    Console.WriteLine(item);
}
```

### 5.8 Channel 生产者消费者

```csharp
using System.Threading.Channels;

var channel = Channel.CreateBounded<string>(100);

async Task ProducerAsync(ChannelWriter<string> writer, CancellationToken ct)
{
    for (int i = 0; i < 1000; i++)
    {
        ct.ThrowIfCancellationRequested();
        await writer.WriteAsync($"item-{i}", ct);
    }
    writer.Complete();
}

async Task ConsumerAsync(ChannelReader<string> reader, CancellationToken ct)
{
    await foreach (var item in reader.ReadAllAsync(ct))
    {
        Console.WriteLine($"Consumed: {item}");
    }
}

using var cts = new CancellationTokenSource();
var producer = ProducerAsync(channel.Writer, cts.Token);
var consumer = ConsumerAsync(channel.Reader, cts.Token);
await Task.WhenAll(producer, consumer);
```

### 5.9 Parallel.ForEachAsync 限流并发

```csharp
// .NET 6+：限流并发执行
var urls = new[] { "https://a.com", "https://b.com", "https://c.com" };

await Parallel.ForEachAsync(urls, new ParallelOptions
{
    MaxDegreeOfParallelism = 4,
    CancellationToken = ct
}, async (url, token) =>
{
    using var resp = await httpClient.GetAsync(url, token);
    var content = await resp.Content.ReadAsStringAsync(token);
    Console.WriteLine($"{url}: {content.Length}");
});
```

### 5.10 ValueTask 优化热路径

```csharp
public class Cache<T>
{
    private readonly ConcurrentDictionary<string, T> _cache = new();
    private readonly Func<string, Task<T>> _loader;

    public Cache(Func<string, Task<T>> loader) => _loader = loader;

    // 热路径：命中缓存时同步返回，零分配
    public async ValueTask<T> GetAsync(string key)
    {
        if (_cache.TryGetValue(key, out var value))
            return value;

        value = await _loader(key).ConfigureAwait(false);
        _cache[key] = value;
        return value;
    }
}

// 使用
var cache = new Cache<string>(LoadFromDbAsync);
string result = await cache.GetAsync("user:1");
```

### 5.11 IProgress 进度报告

```csharp
public async Task DownloadWithProgressAsync(
    string url,
    IProgress<double>? progress = null,
    CancellationToken ct = default)
{
    using var response = await httpClient.GetAsync(url,
        HttpCompletionOption.ResponseHeadersRead, ct);

    var totalBytes = response.Content.Headers.ContentLength ?? -1;
    long bytesRead = 0;
    var buffer = new byte[8192];

    await using var stream = await response.Content.ReadAsStreamAsync(ct);
    int read;
    while ((read = await stream.ReadAsync(buffer, ct)) > 0)
    {
        bytesRead += read;
        if (totalBytes > 0)
            progress?.Report((double)bytesRead / totalBytes);
    }
}

// 使用
var progress = new Progress<double>(p => Console.WriteLine($"Progress: {p:P}"));
await DownloadWithProgressAsync(url, progress, ct);
```

### 5.12 异步释放（IAsyncDisposable）

```csharp
public class AsyncDatabase : IAsyncDisposable
{
    private readonly SqlConnection _connection;

    public AsyncDatabase(string connectionString)
    {
        _connection = new SqlConnection(connectionString);
    }

    public async Task OpenAsync(CancellationToken ct = default)
    {
        await _connection.OpenAsync(ct);
    }

    public async ValueTask DisposeAsync()
    {
        await _connection.DisposeAsync();
        GC.SuppressFinalize(this);
    }
}

// 使用
await using var db = new AsyncDatabase(connectionString);
await db.OpenAsync(ct);
// 操作...
```

### 5.13 SemaphoreSlim 异步锁

```csharp
// Mutex 阻塞，SemaphoreSlim 支持异步等待
public class AsyncLock
{
    private readonly SemaphoreSlim _sem = new(1, 1);

    public async Task<IDisposable> LockAsync(CancellationToken ct = default)
    {
        await _sem.WaitAsync(ct);
        return new Releaser(_sem);
    }

    private sealed class Releaser : IDisposable
    {
        private readonly SemaphoreSlim _sem;
        public Releaser(SemaphoreSlim sem) => _sem = sem;
        public void Dispose() => _sem.Release();
    }
}

// 使用
var asyncLock = new AsyncLock();
using (await asyncLock.LockAsync(ct))
{
    // 临界区
}
```

### 5.14 编译命令与运行

```bash
# 创建控制台应用
dotnet new console -n AsyncDemo
cd AsyncDemo

# 编译
dotnet build

# 运行
dotnet run

# 发布为单文件
dotnet publish -c Release -r win-x64 --self-contained -p:PublishSingleFile=true

# 启用 Native AOT（.NET 8+）
dotnet publish -c Release -r win-x64 -p:PublishAot=true

# 启用 ReadyToRun（预编译加速启动）
dotnet publish -c Release -r win-x64 -p:PublishReadyToRun=true
```

### 5.15 性能基准

```csharp
// 使用 BenchmarkDotNet 测量异步开销
// dotnet add package BenchmarkDotNet
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;

[MemoryDiagnoser]
public class AsyncBenchmarks
{
    [Benchmark]
    public async Task<int> TaskPath()
    {
        await Task.Delay(1);
        return 42;
    }

    [Benchmark]
    public async ValueTask<int> ValueTaskPath()
    {
        await Task.Delay(1);
        return 42;
    }

    [Benchmark]
    public async ValueTask<int> ValueTaskSync()
    {
        return 42;   // 同步可用，零分配
    }
}

BenchmarkRunner.Run<AsyncBenchmarks>();
```

运行：

```bash
dotnet run -c Release -- --filter '*'
```

---

## 6. 对比分析

### 6.1 C# vs JavaScript（Promise vs Task）

| 维度 | C#（Task） | JavaScript（Promise） |
| :--- | :--- | :--- |
| **类型** | 强类型（`Task<T>`） | 弱类型（`Promise<T>`） |
| **取消** | `CancellationToken` 原生支持 | 无原生支持，需 `AbortController` |
| **同步上下文** | `SynchronizationContext` 控制 continuation 调度 | 微任务队列，单线程 |
| **单线程** | 多线程（线程池） | 单线程（事件循环） |
| **错误处理** | `try-catch` 异步异常 | `.catch()` 或 `try-catch`（async/await） |
| **流式数据** | `IAsyncEnumerable<T>` | AsyncIterator（ES2018） |
| **状态机** | 编译器生成显式状态机 | V8 内部优化 |
| **零分配** | `ValueTask<T>` 优化 | 无 |

JavaScript 的 async/await 灵感来源于 C#，但 JavaScript 单线程模型简化了同步上下文问题，无需 `ConfigureAwait`。

### 6.2 C# vs Python（asyncio）

| 维度 | C# | Python |
| :--- | :--- | :--- |
| **语法** | `async Task` | `async def` |
| **运行时** | CLR 线程池 | asyncio 事件循环 |
| **取消** | `CancellationToken` | `asyncio.CancelledError` |
| **流式** | `IAsyncEnumerable` | `async for` + `AsyncIterable` |
| **多线程** | 原生支持 | GIL 限制，需 `run_in_executor` |
| **性能** | 高（编译为机器码） | 中（解释执行） |
| **类型** | 强类型 | 类型注解可选 |

Python 的 asyncio 是单线程事件循环模型，适合 IO 密集；C# 的 `Task` 在线程池上执行，支持真正的并行。

### 6.3 C# vs Java（CompletableFuture / Virtual Threads）

| 维度 | C# | Java |
| :--- | :--- | :--- |
| **语法** | `async`/`await`（语言级） | `CompletableFuture`（API 级） |
| **虚拟线程** | 无（线程池足够） | Virtual Threads（JDK 21） |
| **取消** | `CancellationToken` | `Future.cancel(true)`（中断） |
| **流式** | `IAsyncEnumerable` | `Flow.Publisher` / `Subscriber` |
| **组合** | `Task.WhenAll` / `WhenAny` | `allOf` / `anyOf` |
| **状态机** | 编译器生成 | 无（API 链式） |
| **Loom** | — | Virtual Threads（JDK 21 GA） |

Java 21 的 Virtual Threads 让"同步代码 + 阻塞 IO"达到异步性能，但仍非语言级 `async/await`。

### 6.4 C# vs Go（goroutines）

| 维度 | C# | Go |
| :--- | :--- | :--- |
| **并发单元** | `Task`（线程池） | goroutine（用户态线程） |
| **语法** | `async`/`await` | `go func() { ... }()` |
| **通信** | `Channel<T>` | `chan T` |
| **取消** | `CancellationToken` | `context.Context` |
| **调度** | 线程池抢占式 | M:N 调度器协作式 |
| **类型安全** | 强类型 | 弱类型（`interface{}`） |
| **GC 压力** | `Task` 分配 | goroutine 栈 2KB 起步 |

C# 的 `Channel<T>` 灵感来源于 Go 的 `chan`，但 C# 是类型安全的，且与 `async/await` 集成。

### 6.5 C# vs Rust（async/await with Pin）

| 维度 | C# | Rust |
| :--- | :--- | :--- |
| **运行时** | BCL（CLR 线程池） | tokio / async-std（外部库） |
| **语法** | `async Task` | `async fn` 返回 `impl Future` |
| **零成本** | `ValueTask` 优化 | `Future` 是零成本抽象 |
| **Pin** | 不需要（GC 管理） | `Pin<Box<...>>`（自引用安全） |
| **取消** | `CancellationToken` | `Future` drop |
| **流式** | `IAsyncEnumerable` | `Stream`（tokio） |
| **内存安全** | GC | 所有权 + 借用检查 |

Rust 的 async/await 比 C# 更严格（零成本、无 GC），但学习曲线陡峭。

### 6.6 异步返回类型对比

| 类型 | 分配 | 多次 await | 推荐场景 |
| :--- | :--- | :--- | :--- |
| `Task` | 堆分配 | 安全 | 一般异步方法 |
| `Task<T>` | 堆分配 | 安全 | 一般异步方法 |
| `ValueTask` | 可能零分配 | 不安全 | 热路径，可能同步完成 |
| `ValueTask<T>` | 可能零分配 | 不安全 | 热路径，可能同步完成 |
| `async void` | — | — | 仅事件处理器 |

---

## 7. 常见陷阱与反模式

### 7.1 async void

```csharp
// 反模式：async void 异常无法捕获
public async void DoWork()
{
    await Task.Delay(100);
    throw new Exception("崩溃");   // 进程崩溃
}

// 正确：返回 Task
public async Task DoWorkAsync()
{
    await Task.Delay(100);
    throw new Exception("可控异常");
}
```

**根因**：`async void` 的异常直接抛到 `SynchronizationContext`（默认为未观察异常，导致进程崩溃）。

**例外**：事件处理器必须 `async void`，因为委托签名要求 `void`。

### 7.2 .Result / .Wait() 死锁

```csharp
// 反模式：UI 线程同步等待 → 死锁
public string GetData()
{
    var result = FetchAsync().Result;   // 死锁！
    return result;
}

// 正确：一路 async 到底
public async Task<string> GetDataAsync()
{
    return await FetchAsync();
}
```

**根因**：参见命题 4.2，同步上下文阻塞 + continuation 等待同步上下文。

**应急方案**（仅库代码无法改签名时）：

```csharp
// 强制不捕获上下文：在后台线程执行
var result = Task.Run(async () => await FetchAsync()).Result;
```

### 7.3 不必要的 async/await

```csharp
// 反模式：多余的 async/await 状态机
public async Task<int> GetAsync()
{
    return await Task.FromResult(42);   // 多余
}

// 正确：直接返回 Task
public Task<int> GetAsync()
{
    return Task.FromResult(42);
}
```

**根因**：`async` 方法即使没有实际异步操作，编译器仍生成状态机，带来额外开销。

### 7.4 忘记 await

```csharp
// 反模式：忘记 await，异常丢失
public async Task ProcessAsync()
{
    DoWorkAsync();   // 忘记 await
    Console.WriteLine("Done");
}

// 正确：始终 await
public async Task ProcessAsync()
{
    await DoWorkAsync();
    Console.WriteLine("Done");
}
```

**根因**：未 `await` 的 `Task` 异常在 GC 时才抛出 `UnobservedTaskException`，难以诊断。

### 7.5 循环中顺序 await

```csharp
// 反模式：循环顺序 await，性能差
foreach (var url in urls)
{
    await DownloadAsync(url);   // 串行
}

// 正确：并行 await
await Task.WhenAll(urls.Select(url => DownloadAsync(url)));

// 更好：限流并行（避免一次性创建过多任务）
await Parallel.ForEachAsync(urls, new ParallelOptions
{
    MaxDegreeOfParallelism = 10
}, async (url, ct) => await DownloadAsync(url, ct));
```

### 7.6 库代码未 ConfigureAwait(false)

```csharp
// 反模式：库方法捕获同步上下文，可能死锁
public async Task<string> LibraryMethodAsync()
{
    var data = await httpClient.GetStringAsync(url);   // 默认 ConfigureAwait(true)
    return ProcessData(data);
}

// 正确：库方法使用 ConfigureAwait(false)
public async Task<string> LibraryMethodAsync()
{
    var data = await httpClient.GetStringAsync(url).ConfigureAwait(false);
    return ProcessData(data);
}
```

**根因**：库可能被 WinForms/WPF/旧 ASP.NET 调用，捕获上下文导致死锁或性能损失。

### 7.7 async void 事件处理器异常吞噬

```csharp
// 反模式：async void 事件处理器异常无法捕获
button.Click += async (s, e) =>
{
    await LoadDataAsync();
    throw new Exception("UI 异常");   // 进程崩溃
};

// 正确：包 try-catch
button.Click += async (s, e) =>
{
    try
    {
        await LoadDataAsync();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Load failed");
        MessageBox.Show(ex.Message);
    }
};
```

### 7.8 未传播 CancellationToken

```csharp
// 反模式：忽略 CancellationToken
public async Task ProcessAsync(CancellationToken ct)
{
    await Task.Delay(1000);   // 未传 ct，无法取消
    await NextOpAsync();      // 未传 ct
}

// 正确：传递 ct
public async Task ProcessAsync(CancellationToken ct)
{
    await Task.Delay(1000, ct);
    await NextOpAsync(ct);
}
```

### 7.9 ValueTask 重复 await

```csharp
// 反模式：ValueTask 重复 await
var vt = cache.GetAsync("key");
var r1 = await vt;
var r2 = await vt;   // 可能抛异常或返回错误结果

// 正确：ValueTask 仅 await 一次
var result = await cache.GetAsync("key");

// 若需多次等待，转换为 Task
var task = cache.GetAsync("key").AsTask();
var r1 = await task;
var r2 = await task;   // 安全
```

### 7.10 fire-and-forget 任务

```csharp
// 反模式：未观察的 fire-and-forget
_ = Task.Run(() => ThrowException());

// 正确：显式处理异常
_ = Task.Run(async () =>
{
    try
    {
        await DoWorkAsync();
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Background task failed");
    }
});
```

### 7.11 阻塞异步方法

```csharp
// 反模式：在异步方法中使用 Thread.Sleep
public async Task DelayAsync()
{
    Thread.Sleep(1000);   // 阻塞线程池线程
}

// 正确：使用 Task.Delay
public async Task DelayAsync()
{
    await Task.Delay(1000);
}
```

### 7.12 异步锁使用 lock

```csharp
// 反模式：lock 块内 await（编译错误）
public async Task UpdateAsync()
{
    lock (_lockObj)
    {
        await DoWorkAsync();   // 编译错误：cannot await in lock
    }
}

// 正确：使用 SemaphoreSlim
private readonly SemaphoreSlim _sem = new(1, 1);

public async Task UpdateAsync()
{
    await _sem.WaitAsync();
    try
    {
        await DoWorkAsync();
    }
    finally
    {
        _sem.Release();
    }
}
```

**根因**：`lock` 是同步原语，无法在异步上下文中安全使用。

---

## 8. 工程实践与最佳实践

### 8.1 一路 async 到底

异步方法返回 `Task`/`ValueTask`，调用方必须 `await`。一旦在调用链某处同步阻塞，整个链路退化。

```csharp
// 控制器（异步）→ 服务（异步）→ 仓储（异步）→ 数据库（异步）
public class UserController
{
    [HttpGet("{id}")]
    public async Task<User> Get(int id)
        => await _userService.GetByIdAsync(id);
}

public class UserService
{
    public async Task<User> GetByIdAsync(int id)
        => await _repo.FindAsync(id);
}
```

### 8.2 库代码 ConfigureAwait(false)

所有库方法内的 `await` 都应使用 `ConfigureAwait(false)`，避免在调用方上下文执行：

```csharp
public async Task<string> LibraryMethodAsync()
{
    var data = await _httpClient.GetStringAsync(_url).ConfigureAwait(false);
    var parsed = ParseData(data);   // 在线程池执行
    return parsed;
}
```

### 8.3 CancellationToken 默认参数

异步方法默认包含 `CancellationToken ct = default`，让调用方可选传取消令牌：

```csharp
public async Task<T> GetAsync(string key, CancellationToken ct = default)
{
    ct.ThrowIfCancellationRequested();
    var value = await _cache.GetAsync(key, ct).ConfigureAwait(false);
    return value;
}
```

### 8.4 ValueTask 用于热路径

当异步方法可能同步返回结果（如缓存命中），使用 `ValueTask<T>` 避免堆分配：

```csharp
public ValueTask<T> GetAsync(string key)
{
    if (_cache.TryGetValue(key, out var value))
        return new ValueTask<T>(value);   // 零分配

    return new ValueTask<T>(LoadAsync(key));
}
```

注意：`ValueTask` 不可多次 `await`，不可直接暴露给不可信调用方。

### 8.5 IAsyncEnumerable 流式数据

逐项异步产出，避免一次性加载全部数据：

```csharp
public async IAsyncEnumerable<LogEntry> ReadLogsAsync(
    string path,
    [EnumeratorCancellation] CancellationToken ct = default)
{
    await using var reader = new StreamReader(path);
    while (await reader.ReadLineAsync(ct) is { } line)
    {
        ct.ThrowIfCancellationRequested();
        if (TryParse(line, out var entry))
            yield return entry;
    }
}
```

### 8.6 Channel 生产者消费者

```csharp
var channel = Channel.CreateBounded<Job>(new BoundedChannelOptions(100)
{
    FullMode = BoundedChannelFullMode.Wait,
    SingleReader = false,
    SingleWriter = false
});

// 多生产者
var producers = Enumerable.Range(0, 3)
    .Select(i => ProduceAsync(channel.Writer, i, ct));

// 多消费者
var consumers = Enumerable.Range(0, 2)
    .Select(i => ConsumeAsync(channel.Reader, i, ct));

await Task.WhenAll(
    Task.WhenAll(producers).ContinueWith(_ => channel.Writer.CompleteAsync()),
    Task.WhenAll(consumers));
```

### 8.7 异步释放（IAsyncDisposable）

资源涉及异步释放时（数据库连接、网络流），实现 `IAsyncDisposable`：

```csharp
public class AsyncRepository : IAsyncDisposable
{
    private readonly DbConnection _connection;

    public AsyncRepository(string connectionString)
        => _connection = new SqlConnection(connectionString);

    public async Task OpenAsync(CancellationToken ct = default)
        => await _connection.OpenAsync(ct);

    public async ValueTask DisposeAsync()
    {
        await _connection.DisposeAsync().ConfigureAwait(false);
        GC.SuppressFinalize(this);
    }
}
```

### 8.8 异步锁（SemaphoreSlim）

```csharp
public class AsyncLock
{
    private readonly SemaphoreSlim _sem = new(1, 1);

    public async Task<IDisposable> LockAsync(CancellationToken ct = default)
    {
        await _sem.WaitAsync(ct).ConfigureAwait(false);
        return new Releaser(_sem);
    }

    private sealed class Releaser : IDisposable
    {
        private readonly SemaphoreSlim _sem;
        public Releaser(SemaphoreSlim sem) => _sem = sem;
        public void Dispose() => _sem.Release();
    }
}
```

### 8.9 限流并发

```csharp
// 使用 Parallel.ForEachAsync 限流
await Parallel.ForEachAsync(items, new ParallelOptions
{
    MaxDegreeOfParallelism = Environment.ProcessorCount * 2,
    CancellationToken = ct
}, async (item, token) =>
{
    await ProcessAsync(item, token);
});

// 或使用 SemaphoreSlim
using var sem = new SemaphoreSlim(10);
var tasks = items.Select(async item =>
{
    await sem.WaitAsync();
    try
    {
        await ProcessAsync(item);
    }
    finally
    {
        sem.Release();
    }
});
await Task.WhenAll(tasks);
```

### 8.10 超时与取消组合

```csharp
// 超时
using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
try
{
    var result = await LongOperationAsync(timeoutCts.Token);
}
catch (OperationCanceledException) when (timeoutCts.IsCancellationRequested)
{
    Console.WriteLine("Timeout");
}

// 链接超时与用户取消
using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
    userCancelCts.Token,
    timeoutCts.Token);

// Task.WaitAsync（.NET 6+）
var result = await LongOperationAsync(ct).WaitAsync(TimeSpan.FromSeconds(5));
```

### 8.11 进度报告（IProgress<T>）

```csharp
public async Task ProcessAsync(IProgress<int>? progress = null,
    CancellationToken ct = default)
{
    for (int i = 0; i < 100; i++)
    {
        ct.ThrowIfCancellationRequested();
        await Task.Delay(50, ct);
        progress?.Report(i + 1);
    }
}

// 使用：Progress<T> 在捕获的同步上下文回调
var progress = new Progress<int>(p => Console.WriteLine($"Progress: {p}%"));
await ProcessAsync(progress, ct);
```

### 8.12 异步缓存

```csharp
public class AsyncCache<TKey, TValue> where TKey : notnull
{
    private readonly ConcurrentDictionary<TKey, Lazy<Task<TValue>>> _cache = new();
    private readonly Func<TKey, CancellationToken, Task<TValue>> _loader;

    public AsyncCache(Func<TKey, CancellationToken, Task<TValue>> loader)
        => _loader = loader;

    public Task<TValue> GetAsync(TKey key, CancellationToken ct = default)
    {
        // 使用 Lazy<Task<T>> 避免重复加载
        return _cache.GetOrAdd(key,
            k => new Lazy<Task<TValue>>(() => _loader(k, ct))).Value;
    }
}
```

---

## 9. 案例研究

### 9.1 HTTP 并发请求

```csharp
public class ConcurrentHttpDownloader
{
    private readonly HttpClient _client;

    public ConcurrentHttpDownloader(HttpClient client) => _client = client;

    // 并发请求多个 URL
    public async Task<Dictionary<string, int>> DownloadAllAsync(
        IEnumerable<string> urls, CancellationToken ct = default)
    {
        var tasks = urls.Select(async url =>
        {
            var content = await _client.GetStringAsync(url, ct).ConfigureAwait(false);
            return (url, length: content.Length);
        });

        var results = await Task.WhenAll(tasks).ConfigureAwait(false);
        return results.ToDictionary(r => r.url, r => r.length);
    }

    // 限流并发
    public async Task<Dictionary<string, int>> DownloadWithThrottleAsync(
        IEnumerable<string> urls, int maxConcurrency = 10,
        CancellationToken ct = default)
    {
        using var sem = new SemaphoreSlim(maxConcurrency);
        var tasks = urls.Select(async url =>
        {
            await sem.WaitAsync(ct).ConfigureAwait(false);
            try
            {
                var content = await _client.GetStringAsync(url, ct).ConfigureAwait(false);
                return (url, length: content.Length);
            }
            finally
            {
                sem.Release();
            }
        });

        var results = await Task.WhenAll(tasks).ConfigureAwait(false);
        return results.ToDictionary(r => r.url, r => r.length);
    }
}
```

### 9.2 文件流式处理

```csharp
public class AsyncFileProcessor
{
    // 异步逐行读取大文件
    public async IAsyncEnumerable<string> ReadLinesAsync(
        string path,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        await using var stream = new FileStream(path, FileMode.Open,
            FileAccess.Read, FileShare.Read, 4096, FileOptions.Asynchronous);
        using var reader = new StreamReader(stream);
        while (await reader.ReadLineAsync(ct) is { } line)
        {
            ct.ThrowIfCancellationRequested();
            yield return line;
        }
    }

    // 流式处理：边读边处理边写
    public async Task ProcessStreamAsync(
        string inputPath, string outputPath,
        Func<string, string> transform,
        CancellationToken ct = default)
    {
        await using var input = new FileStream(inputPath, FileMode.Open,
            FileAccess.Read, FileShare.Read, 4096, FileOptions.Asynchronous);
        await using var output = new FileStream(outputPath, FileMode.Create,
            FileAccess.Write, FileShare.None, 4096, FileOptions.Asynchronous);
        using var reader = new StreamReader(input);
        await using var writer = new StreamWriter(output);

        await foreach (var line in ReadLinesAsync(inputPath, ct).ConfigureAwait(false))
        {
            var transformed = transform(line);
            await writer.WriteLineAsync(transformed, ct);
        }

        await writer.FlushAsync(ct);
    }
}
```

### 9.3 生产者消费者日志系统

```csharp
public class AsyncLogger : IAsyncDisposable
{
    private readonly Channel<LogEntry> _channel;
    private readonly Task _processor;
    private readonly CancellationTokenSource _cts = new();

    public AsyncLogger(string filePath, int bufferSize = 1000)
    {
        _channel = Channel.CreateBounded<LogEntry>(bufferSize);
        _processor = ProcessAsync(filePath, _cts.Token);
    }

    public async ValueTask LogAsync(LogEntry entry)
        => await _channel.Writer.WriteAsync(entry);

    private async Task ProcessAsync(string filePath, CancellationToken ct)
    {
        await using var writer = new StreamWriter(filePath)
        {
            AutoFlush = false
        };

        await foreach (var entry in _channel.Reader.ReadAllAsync(ct))
        {
            await writer.WriteLineAsync($"[{entry.Timestamp:O}] {entry.Level}: {entry.Message}");
        }

        await writer.FlushAsync(ct);
    }

    public async ValueTask DisposeAsync()
    {
        _channel.Writer.Complete();
        await _processor;
        _cts.Cancel();
        _cts.Dispose();
    }
}

public record LogEntry(DateTime Timestamp, LogLevel Level, string Message);
```

### 9.4 限流 API 客户端

```csharp
public class RateLimitedApiClient
{
    private readonly HttpClient _client;
    private readonly TimeSpan _interval;

    public RateLimitedApiClient(HttpClient client, TimeSpan interval)
    {
        _client = client;
        _interval = interval;
    }

    // 令牌桶限流：每 interval 才允许一次请求
    public async Task<string> GetStringAsync(string url, CancellationToken ct = default)
    {
        using var rateLimiter = new SemaphoreSlim(1, 1);
        await rateLimiter.WaitAsync(ct).ConfigureAwait(false);

        try
        {
            var content = await _client.GetStringAsync(url, ct).ConfigureAwait(false);
            await Task.Delay(_interval, ct).ConfigureAwait(false);
            return content;
        }
        finally
        {
            rateLimiter.Release();
        }
    }
}

// 使用 System.Threading.RateLimiting（.NET 7+）
public class TokenBucketClient
{
    private readonly HttpClient _client;
    private readonly TokenBucketRateLimiter _limiter;

    public TokenBucketClient(HttpClient client)
    {
        _client = client;
        _limiter = new TokenBucketRateLimiter(new TokenBucketRateLimiterOptions
        {
            TokenLimit = 10,
            TokensPerPeriod = 10,
            ReplenishmentPeriod = TimeSpan.FromSeconds(1),
            QueueLimit = 100,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            AutoReplenishment = true
        });
    }

    public async Task<string> GetStringAsync(string url, CancellationToken ct = default)
    {
        using var lease = await _limiter.AcquireAsync(1, ct).ConfigureAwait(false);
        if (!lease.IsAcquired)
            throw new HttpRequestException("Rate limit exceeded");

        return await _client.GetStringAsync(url, ct).ConfigureAwait(false);
    }
}
```

### 9.5 异步取消链

```csharp
public class CancellationChainExample
{
    private readonly CancellationTokenSource _master = new();

    public async Task RunAsync()
    {
        // 用户取消（5 秒后）
        using var userCancel = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        // 超时（10 秒）
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));

        // 链接：任一取消则整体取消
        using var linked = CancellationTokenSource.CreateLinkedTokenSource(
            userCancel.Token, timeout.Token, _master.Token);

        try
        {
            await LongRunningAsync(linked.Token);
        }
        catch (OperationCanceledException) when (userCancel.IsCancellationRequested)
        {
            Console.WriteLine("User cancelled");
        }
        catch (OperationCanceledException) when (timeout.IsCancellationRequested)
        {
            Console.WriteLine("Timeout");
        }
    }

    private async Task LongRunningAsync(CancellationToken ct)
    {
        for (int i = 0; i < 100; i++)
        {
            ct.ThrowIfCancellationRequested();
            await Task.Delay(200, ct);
            Console.WriteLine($"Step {i}");
        }
    }
}
```

### 9.6 进度报告与取消

```csharp
public class FileDownloader
{
    public async Task<long> DownloadAsync(
        string url,
        string destinationPath,
        IProgress<double>? progress = null,
        CancellationToken ct = default)
    {
        using var response = await _client.GetAsync(url,
            HttpCompletionOption.ResponseHeadersRead, ct).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();

        var totalBytes = response.Content.Headers.ContentLength ?? -1;
        long bytesRead = 0;
        var buffer = new byte[8192];

        await using var contentStream = await response.Content
            .ReadAsStreamAsync(ct).ConfigureAwait(false);
        await using var fileStream = new FileStream(destinationPath,
            FileMode.Create, FileAccess.Write, FileShare.None,
            4096, FileOptions.Asynchronous);

        int read;
        while ((read = await contentStream.ReadAsync(buffer, ct)
            .ConfigureAwait(false)) > 0)
        {
            await fileStream.WriteAsync(buffer, 0, read, ct).ConfigureAwait(false);
            bytesRead += read;
            if (totalBytes > 0)
                progress?.Report((double)bytesRead / totalBytes);
        }

        return bytesRead;
    }
}
```

### 9.7 异步重试策略

```csharp
public class ResilientHttpClient
{
    private readonly HttpClient _client;

    public ResilientHttpClient(HttpClient client) => _client = client;

    public async Task<string> GetStringWithRetryAsync(
        string url, int maxRetries = 3,
        CancellationToken ct = default)
    {
        var retryDelay = TimeSpan.FromMilliseconds(100);

        for (int attempt = 0; attempt < maxRetries; attempt++)
        {
            try
            {
                ct.ThrowIfCancellationRequested();
                return await _client.GetStringAsync(url, ct)
                    .ConfigureAwait(false);
            }
            catch (HttpRequestException ex) when (attempt < maxRetries - 1)
            {
                Console.WriteLine($"Attempt {attempt + 1} failed: {ex.Message}");
                await Task.Delay(retryDelay, ct).ConfigureAwait(false);
                retryDelay = TimeSpan.FromMilliseconds(retryDelay.TotalMilliseconds * 2);
            }
        }

        throw new HttpRequestException($"Failed after {maxRetries} attempts");
    }
}

// 使用 Polly（推荐）
// dotnet add package Microsoft.Extensions.Http.Polly
public static IServiceCollection AddResilientHttp(this IServiceCollection services)
{
    services.AddHttpClient<ResilientHttpClient>((sp, client) =>
    {
        client.BaseAddress = new Uri("https://api.example.com");
    })
    .AddTransientHttpErrorPolicy(p => p.WaitAndRetryAsync(3,
        attempt => TimeSpan.FromSeconds(Math.Pow(2, attempt))))
    .AddTransientHttpErrorPolicy(p => p.CircuitBreakerAsync(5, TimeSpan.FromSeconds(30)));

    return services;
}
```

### 9.8 异步缓存与懒加载

```csharp
public class AsyncLazyCache<TKey, TValue> where TKey : notnull
{
    private readonly ConcurrentDictionary<TKey, AsyncLazy<TValue>> _cache = new();
    private readonly Func<TKey, CancellationToken, Task<TValue>> _factory;

    public AsyncLazyCache(Func<TKey, CancellationToken, Task<TValue>> factory)
        => _factory = factory;

    public Task<TValue> GetAsync(TKey key, CancellationToken ct = default)
    {
        return _cache.GetOrAdd(key,
            k => new AsyncLazy<TValue>(() => _factory(k, ct))).Task;
    }

    public bool TryRemove(TKey key, out TValue? value)
    {
        if (_cache.TryRemove(key, out var lazy))
        {
            value = lazy.IsValueCreated ? lazy.Value : default;
            return true;
        }
        value = default;
        return false;
    }
}

public sealed class AsyncLazy<T>
{
    private readonly Lazy<Task<T>> _lazy;

    public AsyncLazy(Func<Task<T>> factory)
        => _lazy = new Lazy<Task<T>>(() => Task.Run(factory), LazyThreadSafetyMode.ExecutionAndPublication);

    public Task<T> Task => _lazy.Value;
    public bool IsValueCreated => _lazy.IsValueCreated;
    public T Value => _lazy.Value.Result;
}
```

---

## 10. 习题与思考题

### 10.1 选择题

**Q1**：以下哪个 `async` 方法的实现最优化？

A. `public async Task<int> GetAsync() => await Task.FromResult(42);`
B. `public Task<int> GetAsync() => Task.FromResult(42);`
C. `public async Task<int> GetAsync() { return 42; }`
D. `public async Task<int> GetAsync() { return await Task.Run(() => 42); }`

**答案**：B。直接返回 `Task.FromResult(42)`，避免生成多余的状态机。

**Q2**：在 WinForms 应用中，以下代码会发生什么？

```csharp
private void button_Click(object sender, EventArgs e)
{
    var data = FetchAsync().Result;
    label.Text = data;
}
```

A. 正常工作
B. 死锁
C. 编译错误
D. 抛 `InvalidOperationException`

**答案**：B。`FetchAsync` 捕获 UI 同步上下文，`.Result` 阻塞 UI 线程，导致死锁。

**Q3**：关于 `ValueTask<T>`，以下哪个说法正确？

A. 可以多次 `await` 同一个实例
B. 总是零分配
C. 适合热路径，可能同步返回时避免堆分配
D. 不能用于 `async` 方法返回类型

**答案**：C。`ValueTask<T>` 是 `Task<T>` 与 `T` 的并集，同步可用时零分配，但不可多次 `await`。

### 10.2 简答题

**Q4**：解释 `ConfigureAwait(false)` 的作用，为何库代码推荐使用？

**参考答案**：`ConfigureAwait(false)` 告诉 `await` 后续不捕获原同步上下文，continuation 在线程池执行。库代码不知道调用方上下文，若捕获上下文，在 WinForms/WPF/旧 ASP.NET 中可能死锁；且捕获上下文会增加调度开销。库代码使用 `ConfigureAwait(false)` 既避免死锁又提升性能。

**Q5**：`async void` 与 `async Task` 的核心差异是什么？

**参考答案**：
- 返回类型：`void` 无法被 `await`，`Task` 可被 `await`。
- 异常传播：`async void` 异常直接抛到 `SynchronizationContext`，导致进程崩溃；`async Task` 异常封装在 `Task` 中，可被 `await` 捕获。
- 使用场景：`async void` 仅用于事件处理器（委托签名要求 `void`），`async Task` 用于一般异步方法。

### 10.3 编程题

**Q6**：实现一个异步限流下载器，支持最大并发数与取消。

**参考答案**：

```csharp
public class ThrottledDownloader
{
    private readonly HttpClient _client;
    private readonly SemaphoreSlim _sem;

    public ThrottledDownloader(HttpClient client, int maxConcurrency)
    {
        _client = client;
        _sem = new SemaphoreSlim(maxConcurrency);
    }

    public async Task<Dictionary<string, string>> DownloadAllAsync(
        IEnumerable<string> urls, CancellationToken ct = default)
    {
        var tasks = urls.Select(async url =>
        {
            await _sem.WaitAsync(ct).ConfigureAwait(false);
            try
            {
                var content = await _client.GetStringAsync(url, ct).ConfigureAwait(false);
                return (url, content);
            }
            finally
            {
                _sem.Release();
            }
        });

        var results = await Task.WhenAll(tasks).ConfigureAwait(false);
        return results.ToDictionary(r => r.url, r => r.content);
    }
}
```

**Q7**：使用 `Channel<T>` 实现一个简单的消息队列，多生产者多消费者。

**参考答案**：

```csharp
var channel = Channel.CreateBounded<string>(new BoundedChannelOptions(100)
{
    FullMode = BoundedChannelFullMode.Wait,
    SingleReader = false,
    SingleWriter = false
});

async Task ProducerAsync(int id, int count, CancellationToken ct)
{
    for (int i = 0; i < count; i++)
    {
        await channel.Writer.WriteAsync($"P{id}-M{i}", ct);
        await Task.Delay(50, ct);
    }
}

async Task ConsumerAsync(int id, CancellationToken ct)
{
    await foreach (var msg in channel.Reader.ReadAllAsync(ct))
        Console.WriteLine($"C{id} got: {msg}");
}

using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
var producers = Enumerable.Range(0, 3).Select(i => ProducerAsync(i, 5, cts.Token));
var consumers = Enumerable.Range(0, 2).Select(i => ConsumerAsync(i, cts.Token));

await Task.WhenAll(producers);
channel.Writer.Complete();
await Task.WhenAll(consumers);
```

### 10.4 思考题

**Q8**：在 ASP.NET Core 中，为何 `ConfigureAwait(false)` 不再是必需？

**参考答案**：ASP.NET Core 默认不设置 `SynchronizationContext`，`await` 后续在线程池执行，无需捕获上下文。因此不会死锁，`ConfigureAwait(false)` 仅是性能微优化。但库代码仍推荐使用，因为库可能被其他上下文（WinForms/WPF）调用。

**Q9**：`ValueTask<T>` 何时优于 `Task<T>`？何时相反？

**参考答案**：
- 优于：异步方法可能同步返回结果（缓存命中、参数校验失败），热路径上避免堆分配。
- 不优于：异步方法总是异步完成（IO 操作），`ValueTask` 反而比 `Task` 占用更多内存（结构体更大）。此外，`ValueTask` 不可多次 `await`，不可直接暴露给不可信调用方。

**Q10**：分析 `Task.WhenAll` 与 `Parallel.ForEachAsync` 的差异。

**参考答案**：
- `Task.WhenAll`：并行启动所有任务，无并发限制，可能瞬时创建大量任务耗尽资源。
- `Parallel.ForEachAsync`：限流并发，按 `MaxDegreeOfParallelism` 控制同时执行数，资源友好。
- 适用场景：少量任务用 `WhenAll`，大量任务（如 1000+ URL）用 `ForEachAsync`。

---

## 11. 参考文献

> 采用 ACM Reference Format。

[1] Stephen Toub. 2012. Async/Await FAQ. .NET Parallel Programming blog. https://devblogs.microsoft.com/dotnet/async-await-faq/.

[2] Stephen Toub. 2012. Async in C# 5.0. Microsoft Developer Network. https://docs.microsoft.com/en-us/archive/msdn-magazine/2012/march/async-in-csharp-5-awaiting-task-s-and-synchronizationcontext.

[3] Eric Lippert. 2011. What is Asynchronous Programming?. Fabulous Adventures In Coding. https://ericlippert.com/2011/11/17/what-is-asynchronous-programming/.

[4] Microsoft. 2024. Asynchronous Programming Patterns. .NET Documentation. https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/.

[5] Microsoft. 2024. Task-based Asynchronous Pattern (TAP). .NET Documentation. https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap.

[6] Microsoft. 2024. Asynchronous Programming with async and await. C# Programming Guide. https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/concepts/async/.

[7] Microsoft. 2024. CancellationToken. .NET API Browser. https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtoken.

[8] Microsoft. 2024. IAsyncEnumerable<T> Interface. .NET API Browser. https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.iasync enumerable-1.

[9] Microsoft. 2024. System.Threading.Channels. .NET Documentation. https://learn.microsoft.com/en-us/dotnet/api/system.threading.channels.

[10] Microsoft. 2024. Parallel.ForEachAsync. .NET API Browser. https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.parallel.foreachasync.

[11] Microsoft. 2024. ValueTask<TResult>. .NET API Browser. https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.valuetask-1.

[12] Stephen Toub. 2017. Understanding the Whys, Whats, and Whens of ValueTask. .NET Parallel Programming blog. https://devblogs.microsoft.com/dotnet/understanding-the-whys-whats-and-whens-of-valuetask/.

[13] Stephen Toub. 2020. Consuming IAsyncEnumerable<T>. .NET Blog. https://devblogs.microsoft.com/dotnet/consuming-iasyncenumerable-c-8/.

[14] Stephen Cleary. 2013. Don't Block on Async Code. Stephen Cleary's Blog. https://blog.stephencleary.com/2012/07/dont-block-on-async-code.html.

[15] Stephen Cleary. 2015. Async/Await - Best Practices in Asynchronous Programming. MSDN Magazine. https://learn.microsoft.com/en-us/archive/msdn-magazine/2013/march/async-await-best-practices-in-asynchronous-programming.

---

## 12. 延伸阅读

### 12.1 官方文档

- **C# 异步编程**：https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/concepts/async/
- **Task-based Asynchronous Pattern**：https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap
- **异步编程模式**：https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/
- **Channel 类**：https://learn.microsoft.com/en-us/dotnet/api/system.threading.channels
- **ValueTask**：https://learn.microsoft.com/en-us/dotnet/api/system.threading.tasks.valuetask-1

### 12.2 系列交叉引用

- FANDEX C# 系列：[概述与环境配置](./概述与环境配置.md)
- FANDEX C# 系列：[基础语法](./基础语法.md)
- FANDEX C# 系列：[面向对象编程](./面向对象编程.md)
- FANDEX C# 系列：[泛型与集合](./泛型与集合.md)
- FANDEX C# 系列：[LINQ 与函数式编程](./LINQ与函数式编程.md)
- FANDEX C# 系列：[高级特性](./高级特性.md)
- FANDEX C# 系列：[.NET 平台与生态](./NET平台与生态.md)
- FANDEX C# 系列：[测试与工程化](./测试与工程化.md)

### 12.3 进阶书籍

- Stephen Cleary. 2021. *Concurrency in C# Cookbook*. O'Reilly Media, 2nd Edition.
- Stephen Cleary. 2015. *Async in C# 5.0*. O'Reilly Media.
- Joseph Albahari. 2023. *C# 12 in a Nutshell*. O'Reilly Media.
- Mark Michaelis. 2022. *Essential C# 11.0*. Addison-Wesley Professional.
- Andrew Troelsen, Phil Japikse. 2022. *Pro C# 10 with .NET 6*. Apress.
- Jon Skeet. 2019. *C# in Depth*. Manning Publications, 4th Edition.

### 12.4 社区资源

- **Stephen Cleary's Blog**：https://blog.stephencleary.com/（async/await 权威博客）
- **Stephen Toub's GitHub**：https://github.com/stephentoub
- **dotnet/runtime 仓库**：https://github.com/dotnet/runtime
- **Async/Await FAQ**：https://devblogs.microsoft.com/dotnet/async-await-faq/

### 12.5 视频资源

- **Channel 9: Async/Await in C#**：https://channel9.msdn.com/
- **NDC Conference: Async Deep Dive**：https://www.ndcconferences.com/
- **.NET Conf**：https://www.dotnetconf.net/
- **Microsoft Learn: Asynchronous Programming in C#**：https://learn.microsoft.com/training/paths/csharp-async/

### 12.6 工具

- **BenchmarkDotNet**：https://benchmarkdotnet.org/（性能基准）
- **Polly**：https://github.com/App-vNext/Polly（弹性策略库）
- **System.Threading.Channels**：内置 NuGet 包
- **System.Threading.RateLimiting**（.NET 7+）：限流原语
- **dotnet-counters**：实时性能监控
- **dotnet-trace**：性能追踪
- **PerfView**：深度性能分析

### 12.7 实战案例参考

- **eShopOnContainers**：https://github.com/dotnet-architecture/eShopOnContainers
- **Clean Architecture Template**：https://github.com/jasontaylordev/CleanArchitecture
- **FastEndpoints**：https://github.com/FastEndpoints/FastEndpoints（基于 ASP.NET Core 最小 API）

---

> **结语**：C# 的 `async/await` 是过去十年最重要的语言特性之一，它让异步编程变得直观而高效。掌握状态机转换、同步上下文、`ValueTask` 优化、`Channel`、`IAsyncEnumerable` 等，将帮助你构建高吞吐、低延迟、易维护的现代 .NET 应用。下一篇我们将讲解 .NET 平台与生态：Runtime、BCL、NuGet、DI、配置、日志、ASP.NET Core、EF Core、MAUI 等。
