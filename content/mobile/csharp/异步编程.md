# C# 异步编程

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## async 与 await 基础

**基本写法：async 方法声明**
`public async Task <方法名>() { ... }`
```csharp
// 声明异步方法返回 Task
public async Task DoWorkAsync()
{
    await Task.Delay(1000);
    Console.WriteLine("工作完成");
}
```

---

**基本写法：async Task\<T\> 方法**
`public async Task<<返回类型>> <方法名>() { ... }`
```csharp
// 声明异步方法返回带值 Task
public async Task<int> GetCountAsync()
{
    await Task.Delay(500);
    return 42;
}
```

---

**基本写法：async ValueTask 方法**
`public async ValueTask<<返回类型>> <方法名>() { ... }`
```csharp
// 声明返回 ValueTask 的异步方法
public async ValueTask<int> GetCachedCountAsync()
{
    await Task.Delay(100);
    return 100;
}
```

---

**基本写法：await Task.Delay**
`await Task.Delay(<毫秒>);`
```csharp
// 异步等待指定毫秒
await Task.Delay(1000);
```

---

**基本写法：await 调用异步方法**
`await <异步方法>();`
```csharp
// 等待异步方法完成
await DoWorkAsync();
```

---

**基本写法：await 获取结果**
`<类型> <变量> = await <异步方法>();`
```csharp
// 等待异步方法并获取返回值
int count = await GetCountAsync();
```

---

## Task 创建与组合

**基本写法：Task.Run 委托**
`Task <变量> = Task.Run(() => <表达式>);`
```csharp
// 在线程池上运行委托
Task task = Task.Run(() =>
{
    Console.WriteLine("在线程池执行");
});
```

---

**基本写法：Task.Run 带返回值**
`Task<<类型>> <变量> = Task.Run(() => <表达式>);`
```csharp
// 在线程池上运行带返回值的委托
Task<int> task = Task.Run(() => 42 + 100);
```

---

**基本写法：Task.FromResult 同步结果**
`Task<<类型>> <变量> = Task.FromResult(<值>);`
```csharp
// 创建已完成的 Task
Task<int> completed = Task.FromResult(42);
```

---

**基本写法：Task.CompletedTask**
`Task <变量> = Task.CompletedTask;`
```csharp
// 获取已完成的 Task
return Task.CompletedTask;
```

---

**基本写法：Task.WhenAll 等待全部**
`await Task.WhenAll(<任务1>, <任务2>);`
```csharp
// 等待多个任务全部完成
var task1 = Task.Delay(1000);
var task2 = Task.Delay(2000);
await Task.WhenAll(task1, task2);
```

---

**基本写法：Task.WhenAll 带返回值**
`<类型>[] <变量> = await Task.WhenAll(<任务1>, <任务2>);`
```csharp
// 等待多个带返回值的任务并获取结果
var t1 = Task.FromResult(1);
var t2 = Task.FromResult(2);
int[] results = await Task.WhenAll(t1, t2);
```

---

**基本写法：Task.WhenAny 等待任一**
`Task <变量> = await Task.WhenAny(<任务1>, <任务2>);`
```csharp
// 等待任一任务完成
var t1 = Task.Delay(1000);
var t2 = Task.Delay(2000);
Task first = await Task.WhenAny(t1, t2);
```

---

**基本写法：Task.WhenAny 带超时**
`Task <变量> = await Task.WhenAny(<任务>, Task.Delay(<超时>));`
```csharp
// 等待任务完成或超时
var task = DoWorkAsync();
var timeout = Task.Delay(5000);
if (await Task.WhenAny(task, timeout) == timeout)
{
    Console.WriteLine("超时");
}
```

---

## CancellationToken

**基本写法：CancellationTokenSource 创建**
`using var <变量> = new CancellationTokenSource();`
```csharp
// 创建取消令牌源
using var cts = new CancellationTokenSource();
```

---

**基本写法：传递 CancellationToken**
`public async Task <方法>(CancellationToken <参数>) { ... }`
```csharp
// 异步方法接受取消令牌
public async Task DoWorkAsync(CancellationToken cancellationToken)
{
    await Task.Delay(1000, cancellationToken);
}
```

---

**基本写法：Task.Delay 带取消**
`await Task.Delay(<毫秒>, <取消令牌>);`
```csharp
// 可取消的延迟
using var cts = new CancellationTokenSource();
await Task.Delay(1000, cts.Token);
```

---

**基本写法：触发取消**
`<取消源>.Cancel();`
```csharp
// 触发取消请求
using var cts = new CancellationTokenSource();
cts.Cancel();
```

---

**基本写法：超时自动取消**
`<取消源>.CancelAfter(<毫秒>);`
```csharp
// 指定时间后自动取消
using var cts = new CancellationTokenSource();
cts.CancelAfter(5000);
```

---

**基本写法：检查取消请求**
`<取消令牌>.ThrowIfCancellationRequested();`
```csharp
// 主动检查并抛出取消异常
cancellationToken.ThrowIfCancellationRequested();
```

---

**基本写法：循环中检查取消**
`for (...) { <取消令牌>.ThrowIfCancellationRequested(); ... }`
```csharp
// 在循环中检查取消请求
for (int i = 0; i < 1000; i++)
{
    cancellationToken.ThrowIfCancellationRequested();
    await Task.Delay(10, cancellationToken);
}
```

---

## IAsyncEnumerable

**基本写法：异步迭代器声明**
`public async IAsyncEnumerable<<类型>> <方法>() { ... }`
```csharp
// 声明异步流方法
public async IAsyncEnumerable<int> GenerateAsync()
{
    for (int i = 0; i < 5; i++)
    {
        await Task.Delay(100);
        yield return i;
    }
}
```

---

**基本写法：异步迭代器带取消**
`public async IAsyncEnumerable<<类型>> <方法>(CancellationToken <参数>) { ... }`
```csharp
// 带取消令牌的异步流
public async IAsyncEnumerable<int> GenerateAsync(
    [EnumeratorCancellation] CancellationToken cancellationToken)
{
    for (int i = 0; i < 5; i++)
    {
        await Task.Delay(100, cancellationToken);
        yield return i;
    }
}
```

---

**基本写法：await foreach 消费**
`await foreach (var <变量> in <异步流>)`
```csharp
// 异步遍历异步流
await foreach (var item in GenerateAsync())
{
    Console.WriteLine(item);
}
```

---

**基本写法：await foreach 带取消**
`await foreach (var <变量> in <异步流>.WithCancellation(<令牌>))`
```csharp
// 带取消令牌的异步遍历
using var cts = new CancellationTokenSource();
await foreach (var item in GenerateAsync().WithCancellation(cts.Token))
{
    Console.WriteLine(item);
}
```

---

## ConfigureAwait

**基本写法：ConfigureAwait(false)**
`await <任务>.ConfigureAwait(false);`
```csharp
// 库代码中避免捕获同步上下文
await Task.Delay(1000).ConfigureAwait(false);
```

---

**基本写法：ConfigureAwait(true)**
`await <任务>.ConfigureAwait(true);`
```csharp
// 捕获同步上下文（UI 应用默认行为）
await Task.Delay(1000).ConfigureAwait(true);
```

---

## 异步流操作

**基本写法：异步流 LINQ**
`await foreach (var <变量> in <异步流>.Where(<谓词>))`
```csharp
// 对异步流应用 LINQ 操作
await foreach (var item in GenerateAsync().Where(x => x > 2))
{
    Console.WriteLine(item);
}
```

---

**基本写法：ToListAsync 异步收集**
`List<<类型>> <变量> = await <异步流>.ToListAsync();`
```csharp
// 将异步流收集为列表
List<int> list = await GenerateAsync().ToListAsync();
```

---

## Channel 异步通信

**基本写法：Channel 创建**
`var <变量> = Channel.CreateUnbounded<<类型>>();`
```csharp
// 创建无界通道
var channel = Channel.CreateUnbounded<int>();
```

---

**基本写法：Channel 有界创建**
`var <变量> = Channel.CreateBounded<<类型>>(<容量>);`
```csharp
// 创建有界通道
var channel = Channel.CreateBounded<int>(100);
```

---

**基本写法：写入 Channel**
`await <通道>.Writer.WriteAsync(<值>);`
```csharp
// 异步写入通道
await channel.Writer.WriteAsync(42);
```

---

**基本写法：读取 Channel**
`<类型> <变量> = await <通道>.Reader.ReadAsync();`
```csharp
// 异步读取通道
int value = await channel.Reader.ReadAsync();
```

---

**基本写法：完成写入**
`<通道>.Writer.Complete();`
```csharp
// 标记通道写入完成
channel.Writer.Complete();
```

---

**基本写法：await foreach 消费 Channel**
`await foreach (var <变量> in <通道>.Reader.ReadAllAsync())`
```csharp
// 异步遍历通道所有数据
await foreach (var item in channel.Reader.ReadAllAsync())
{
    Console.WriteLine(item);
}
```

---

## Parallel 并行

**基本写法：Parallel.ForEach**
`Parallel.ForEach(<集合>, <动作>);`
```csharp
// 并行遍历集合
var items = Enumerable.Range(0, 100);
Parallel.ForEach(items, item =>
{
    Console.WriteLine($"处理: {item}");
});
```

---

**基本写法：Parallel.For**
`Parallel.For(<起始>, <结束>, <动作>);`
```csharp
// 并行执行循环
Parallel.For(0, 100, i =>
{
    Console.WriteLine($"索引: {i}");
});
```

---

**基本写法：ParallelOptions 带取消**
`Parallel.ForEach(<集合>, new ParallelOptions { CancellationToken = <令牌> }, <动作>);`
```csharp
// 并行遍历带取消支持
using var cts = new CancellationTokenSource();
Parallel.ForEach(items, new ParallelOptions
{
    CancellationToken = cts.Token,
    MaxDegreeOfParallelism = 4
}, item => Process(item));
```

---

## TaskCompletionSource

**基本写法：TaskCompletionSource 创建**
`var <变量> = new TaskCompletionSource<<类型>>();`
```csharp
// 创建可手动控制的 Task 源
var tcs = new TaskCompletionSource<int>();
```

---

**基本写法：SetResult 完成任务**
`<源>.SetResult(<值>);`
```csharp
// 手动完成 Task
var tcs = new TaskCompletionSource<int>();
tcs.SetResult(42);
```

---

**基本写法：SetException 异常完成**
`<源>.SetException(<异常>);`
```csharp
// 手动让 Task 失败
var tcs = new TaskCompletionSource<int>();
tcs.SetException(new InvalidOperationException("失败"));
```

---

**基本写法：await TaskCompletionSource**
`<类型> <变量> = await <源>.Task;`
```csharp
// 等待手动控制的 Task
var tcs = new TaskCompletionSource<int>();
int result = await tcs.Task;
```

---

## 异步锁与并发

**基本写法：SemaphoreSlim 异步锁**
`await <信号量>.WaitAsync();`
```csharp
// 异步等待信号量
var semaphore = new SemaphoreSlim(1, 1);
await semaphore.WaitAsync();
try
{
    // 临界区
}
finally
{
    semaphore.Release();
}
```

---

**基本写法：SemaphoreSlim 释放**
`<信号量>.Release();`
```csharp
// 释放信号量
semaphore.Release();
```

---

**基本写法：AsyncLock 模式**
`public class <类名> { public async Task<<锁句柄>> LockAsync() { ... } }`
```csharp
// 自定义异步锁模式
public class AsyncLock
{
    private readonly SemaphoreSlim _semaphore = new(1, 1);
    public async Task<IDisposable> LockAsync()
    {
        await _semaphore.WaitAsync();
        return new Releaser(_semaphore);
    }
    private class Releaser : IDisposable
    {
        private readonly SemaphoreSlim _sem;
        public Releaser(SemaphoreSlim sem) => _sem = sem;
        public void Dispose() => _sem.Release();
    }
}
```

---

## 异步异常处理

**基本写法：try-catch 异步异常**
`try { await <任务>; } catch (<异常类型> <变量>) { ... }`
```csharp
// 捕获异步方法抛出的异常
try
{
    await DoWorkAsync();
}
catch (OperationCanceledException ex)
{
    Console.WriteLine($"已取消: {ex.Message}");
}
```

---

**基本写法：AggregateException 多任务异常**
`catch (AggregateException <变量>)`
```csharp
// 捕获多个任务的聚合异常
try
{
    var tasks = new[] { Task.Run(() => throw new Exception("错误1")) };
    Task.WaitAll(tasks);
}
catch (AggregateException ex)
{
    foreach (var inner in ex.InnerExceptions)
    {
        Console.WriteLine(inner.Message);
    }
}
```

---

**基本写法：WhenAll 异常处理**
`try { await Task.WhenAll(<任务1>, <任务2>); } catch (<异常>) { ... }`
```csharp
// WhenAll 抛出第一个异常
try
{
    await Task.WhenAll(FailAsync(), FailAsync());
}
catch (Exception ex)
{
    Console.WriteLine($"捕获: {ex.Message}");
}
```
