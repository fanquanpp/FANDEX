---
order: 400
title: C# LINQ 与异步语法速查手册
module: 'csharp'
category: 后端技术
difficulty: beginner
description: C# LINQ 与异步速查 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
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
