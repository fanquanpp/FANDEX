---
order: 430
title: C# LINQ 与异步语法速查手册
module: 'csharp'
category: 后端技术
difficulty: beginner
description: LINQ 常用算子、async/await、取消令牌与并发集合的速查手册，附可运行的完整示例与高频陷阱解析。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'csharp/110-CSharpLINQFunctionalProgramming'
  - 'csharp/080-CAsyncProgramming'
  - 'csharp/130-LINQDeferredImmediate'
prerequisites:
  - 'csharp/070-CGenericCollection'
---

## LINQ 查询

**基本写法：Where 过滤**
`<集合>.Where(<谓词>);`
```csharp
// 过滤出偶数
var evens = list.Where(x => x % 2 == 0);
```

---

**基本写法：Select 转换**
`<集合>.Select(<函数>);`
```csharp
// 转换为大写
var upper = list.Select(s => s.ToUpper());
```

---

**基本写法：OrderBy 排序**
`<集合>.OrderBy(<键选择器>);`
```csharp
// 按长度排序
var sorted = list.OrderBy(s => s.Length);
```

---

**基本写法：ThenBy 二级排序**
`<有序集合>.ThenBy(<键选择器>);`
```csharp
// 先按长度，再按字母
var sorted = list.OrderBy(s => s.Length).ThenBy(s => s);
```

---

**基本写法：GroupBy 分组**
`<集合>.GroupBy(<键选择器>);`
```csharp
// 按首字母分组
var groups = list.GroupBy(s => s[0]);
```

---

**基本写法：Distinct 去重**
`<集合>.Distinct();`
```csharp
// 去除重复元素
var unique = list.Distinct();
```

---

**基本写法：Take 取前 N 个**
`<集合>.Take(<数量>);`
```csharp
// 取前 5 个
var first5 = list.Take(5);
```

---

**基本写法：Skip 跳过**
`<集合>.Skip(<数量>);`
```csharp
// 跳过前 3 个
var rest = list.Skip(3);
```

---

**基本写法：First 第一个**
`<集合>.First([<谓词>]);`
```csharp
// 第一个大于 10 的
var item = list.First(x => x > 10);
```

---

**基本写法：FirstOrDefault 默认值**
`<集合>.FirstOrDefault([<谓词>]);`
```csharp
// 找不到返回默认值
var item = list.FirstOrDefault(x => x > 100) ?? 0;
```

---

**基本写法：Any 判断存在**
`<集合>.Any([<谓词>]);`
```csharp
// 是否存在匹配元素
bool has = list.Any(x => x > 10);
```

---

**基本写法：All 全部匹配**
`<集合>.All(<谓词>);`
```csharp
// 判断是否全部为正数
bool allPositive = list.All(x => x > 0);
```

---

**基本写法：Count 计数**
`<集合>.Count([<谓词>]);`
```csharp
// 统计偶数个数
int count = list.Count(x => x % 2 == 0);
```

---

**基本写法：Sum 求和**
`<集合>.Sum([<选择器>]);`
```csharp
// 求和
int total = list.Sum();
// 按字段求和
int totalAge = users.Sum(u => u.Age);
```

---

**基本写法：Aggregate 聚合**
`<集合>.Aggregate(<初始值>, <聚合函数>);`
```csharp
// 计算阶乘
int fact = Enumerable.Range(1, 5).Aggregate(1, (a, b) => a * b);
```

---

**基本写法：ToDictionary 转 Dictionary**
`<集合>.ToDictionary(<键选择器>, [<值选择器>]);`
```csharp
// 转换为字典
var dict = list.ToDictionary(x => x.Id, x => x.Name);
```

---

## async/await 异步

**基本写法：async 方法声明**
`async <Task<返回类型>> <方法名>() { ... }`
```csharp
// 异步方法
async Task<string> GetDataAsync() {
    await Task.Delay(1000);
    return "Data";
}
```

---

**基本写法：await 等待**
`await <Task>;`
```csharp
// 等待异步操作完成
string result = await GetDataAsync();
```

---

**基本写法：Task.Run 后台执行**
`Task.Run(() => <函数>);`
```csharp
// 在线程池执行
var result = await Task.Run(() => HeavyCompute());
```

---

**基本写法：Task.Delay 延迟**
`await Task.Delay(<毫秒>);`
```csharp
// 非阻塞延迟
await Task.Delay(1000);
```

---

**基本写法：Task.WhenAll 等待全部**
`await Task.WhenAll(<task1>, <task2>);`
```csharp
// 并行执行多个任务
var t1 = GetData1Async();
var t2 = GetData2Async();
await Task.WhenAll(t1, t2);
```

---

**基本写法：Task.WhenAny 任一完成**
`await Task.WhenAny(<task1>, <task2>);`
```csharp
// 任一任务完成即返回
var completed = await Task.WhenAny(t1, t2);
```

---

## CancellationToken

**基本写法：创建 Token**
`CancellationTokenSource <变量> = new CancellationTokenSource();`
```csharp
// 创建取消源
var cts = new CancellationTokenSource();
var token = cts.Token;
```

---

**基本写法：传递 Token**
`<方法>(<参数>, <token>);`
```csharp
// 传递给异步方法
await Task.Delay(5000, token);
```

---

**基本写法：取消操作**
`<cts>.Cancel();`
```csharp
// 触发取消
cts.Cancel();
```

---

**基本写法：响应取消**
`<token>.ThrowIfCancellationRequested();`
```csharp
// 检查并抛出异常
for (int i = 0; i < 100; i++) {
    token.ThrowIfCancellationRequested();
    // 工作
}
```

---

## 并行编程

**基本写法：Parallel.For 并行循环**
`Parallel.For(<起始>, <结束>, <循环体>);`
```csharp
// 并行执行循环
Parallel.For(0, 100, i => {
    Process(i);
});
```

---

**基本写法：Parallel.ForEach 并行遍历**
`Parallel.ForEach(<集合>, <循环体>);`
```csharp
// 并行处理每个元素
Parallel.ForEach(list, item => {
    Process(item);
});
```

---

**基本写法：Parallel.Invoke 并行调用**
`Parallel.Invoke(<action1>, <action2>);`
```csharp
// 并行执行多个操作
Parallel.Invoke(
    () => DoTask1(),
    () => DoTask2()
);
```

---

## ConcurrentBag 并发集合

**基本写法：ConcurrentBag 创建**
`ConcurrentBag<<类型>> <变量> = new ConcurrentBag<<类型>>();`
```csharp
// 线程安全集合
var bag = new ConcurrentBag<int>();
bag.Add(1);
```

---

**基本写法：ConcurrentDictionary 并发字典**
`ConcurrentDictionary<<键类型>, <值类型>> <变量>;`
```csharp
// 线程安全字典
var dict = new ConcurrentDictionary<string, int>();
dict.TryAdd("a", 1);
```

---

## 完整示例：一次订单统计与并发抓取

以下程序可直接放入控制台项目运行，覆盖上面最常用的算子：

```csharp
record Order(string Customer, string Product, decimal Amount, bool Paid);

var orders = new List<Order>
{
    new("张三", "键盘", 399m,  true),
    new("李四", "鼠标", 129m,  false),
    new("张三", "显示器", 1599m, true),
    new("王五", "键盘", 359m,  true),
};

// 1) 过滤 + 分组 + 聚合：每个客户已支付的总金额
var paidByCustomer = orders
    .Where(o => o.Paid)
    .GroupBy(o => o.Customer)
    .Select(g => new { Customer = g.Key, Total = g.Sum(o => o.Amount) })
    .OrderByDescending(x => x.Total);

foreach (var x in paidByCustomer)
{
    Console.WriteLine($"{x.Customer}: {x.Total}");
}

// 2) 取消令牌 + 并发任务：模拟并发查询，超时即放弃
using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(500));

async Task<string> FetchAsync(string name, int delayMs, CancellationToken token)
{
    await Task.Delay(delayMs, token);   // 支持取消的等待
    return $"{name} 完成";
}

var t1 = FetchAsync("数据库", 100, cts.Token);
var t2 = FetchAsync("缓存", 900, cts.Token);   // 会因取消而抛异常

try
{
    string[] results = await Task.WhenAll(t1, t2);
    Console.WriteLine(string.Join("; ", results));
}
catch (OperationCanceledException)
{
    Console.WriteLine("至少一个任务被取消");
}

// 输出：
// 张三: 1998
// 王五: 359
// 至少一个任务被取消
// （WhenAll 抛出异常时，已完成任务的返回值不会通过 results 拿到；
//   若需要"部分结果"，应逐个 await 或捕获后读取各任务的 status）
```

注意两点：LINQ 链条直到 `foreach` 才真正执行（延迟执行）；`Task.WhenAll` 中任何一个任务取消或抛异常，`await` 处都会抛出，需要按需捕获。

## 常见陷阱

**多次枚举同一查询**。LINQ 查询是"配方"而不是"结果"，每次 `foreach` 都重新执行一遍（包括重新查数据库）。需要复用时先 `ToList()` 固化：

```csharp
var query = orders.Where(o => o.Paid);   // 未执行
Console.WriteLine(query.Count());        // 执行第 1 次
foreach (var o in query) { }             // 又执行第 1 次
var cached = orders.Where(o => o.Paid).ToList();  // 只执行一次
```

**`async void` 代替 `async Task`**。`async void` 方法的异常会直接击穿调用栈（通常导致进程崩溃），且调用方无法等待它。事件处理器是唯一合理的 `async void` 场景，其余一律返回 `Task`。

**同步等待异步（sync-over-async）**。`Task.Result` 或 `.Wait()` 会阻塞线程，在 ASP.NET Core 或有同步上下文的环境中容易死锁，并白白浪费一个线程池线程。全链路 `async/await` 才是正解。

**循环内忽略捕获变量语义**。lambda 捕获的是变量本身而非值；在 `for` 循环里用循环变量构造查询时，枚举发生在循环结束之后，读到的往往是"最后一个值"。把变量复制到循环体内再捕获即可规避。

**忘记传递 `CancellationToken`**。`Task.Delay(5000)` 与 `token` 无关，取消不会生效；应写成 `Task.Delay(5000, token)`，并在长循环里周期性调用 `token.ThrowIfCancellationRequested()`。

**并行与异步混用**。`Parallel.For` 适合 CPU 密集计算，`async/await` 适合 I/O 等待；用 `Parallel` 包裹 `async` 委托不会"并行等待"，反而可能死锁。I/O 并发用 `Task.WhenAll`。

## 分层小结

- **记住**：`Where/Select/OrderBy/GroupBy` 四个算子；`await` 一个 `Task`；用 `CancellationTokenSource` 触发取消。
- **理解**：LINQ 延迟执行与 `ToList` 固化；`Task.WhenAll` 并发等待与异常聚合；`ValueTask` 只能消费一次。
- **应用**：把"查询 + 聚合 + 排序"写成一条 LINQ 链；把"N 个独立 I/O 调用"改成 `WhenAll` 并发并全程携带取消令牌。深入原理见 [LINQ 延迟与立即执行](/csharp/130-LINQDeferredImmediate) 与 [async/await 状态机](/csharp/100-AsyncAwaitStateMachine)。
