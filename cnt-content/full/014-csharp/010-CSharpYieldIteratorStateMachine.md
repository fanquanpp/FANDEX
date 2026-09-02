---
order: 100
title: yield 迭代器状态机
module: 'csharp'
category: 后端技术
difficulty: advanced
description: 延迟执行的编译器魔法：yield return 与 try/finally 的限制。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'csharp/008-CSharpLINQFunctionalProgramming'
  - 'csharp/029-LINQDeferredImmediate'
  - 'csharp/030-AsyncAwaitStateMachine'
prerequisites:
  - 'csharp/003-CSharpBasicSyntax'
  - 'csharp/008-CSharpLINQFunctionalProgramming'
---

# yield 迭代器状态机

一场演唱会的歌单不必一次性打印成册：观众唱到哪首，提词器就翻到哪页。C# 的 `yield return` 提供的正是这种"按需供给"的能力——方法声明返回 `IEnumerable<T>`，却可以像写普通循环一样逐个"吐出"元素。编译器会在背后把方法体改写成一台状态机，本文围绕虚拟歌手音乐平台的歌单、购票与灯牌场景，拆解这台机器的运转方式。

## 前置知识

- [C# 基础语法](/csharp/003-CSharpBasicSyntax)：方法、循环与集合遍历的基本写法。
- [C# LINQ 与函数式编程](/csharp/008-CSharpLINQFunctionalProgramming)：LINQ 运算符大量基于迭代器实现，是本篇的应用背景。
- [LINQ 延迟执行与立即执行](/csharp/029-LINQDeferredImmediate)：延迟执行在本篇被追溯到语言层的实现机制。

## 学习目标

1. 掌握 `yield return` 与 `yield break` 的语义，能正确声明和使用迭代器方法。
2. 理解编译器如何把迭代器方法改写为状态机，知道状态、Current 与 Dispose 各自的角色。
3. 说清延迟执行、重复枚举的后果，能判断何时必须物化序列。
4. 记住 `yield` 在异常处理结构中的限制规则，会用 `try/finally` 保证资源释放。
5. 能手写与 LINQ 运算符同构的自定义迭代器，并理解二者衔接的原理。

## 一、yield return 与 yield break：从语法到语义

迭代器方法是形参为普通参数、返回 `IEnumerable<T>`、`IEnumerator<T>`、`IAsyncEnumerable<T>` 之一，且方法体中出现 `yield return` 或 `yield break` 的方法。`yield return` 表示"产出一个值并暂停在这里"；`yield break` 表示"序列到此结束"；方法体自然走完也等价于结束。两者与普通 return 的区别在于"暂停"：return 结束的是整个方法，`yield return` 结束的只是"本次索取"，方法体连同全部局部变量都被完整保存，等待下一次唤醒。

```csharp
// 演唱会歌单：按顺序产出曲目，调用方每前进一次才唱下一首
static IEnumerable<string> Setlist()
{
    yield return "星海序曲";
    yield return "应援色的风";
    yield return "告别安可";
    yield break; // 显式结束；此处与自然结束等价，常用于条件分支中提前终止
}
```

调用方拿到的是"歌单本身"而不是歌单内容：`foreach` 每轮向迭代器要一首歌，迭代器从上次暂停的位置继续执行到下一个 `yield return`。`yield return` 不能出现在带 `catch` 的 `try` 块、带标签的语句或方法体之外（迭代器属性 getter 除外），也不能出现在 `finally` 块中。

迭代器方法的返回类型只能在 `IEnumerable<T>`、`IEnumerator<T>`（或对应非泛型版本）与 `IAsyncEnumerable<T>` 之间选择，且不能声明 ref、out 参数，方法体内不允许出现 `await`（需要异步产出时改用 `IAsyncEnumerable<T>` 的异步迭代器，见第五节）。返回哪种接口决定调用方拿到的是"可枚举的序列"还是"可手动推进的枚举器"，绝大多数业务代码选择 `IEnumerable<T>`。

`foreach` 与迭代器的协作规则也值得复习：编译器把 `foreach` 翻译成"获取枚举器、循环调用 `MoveNext`、读取 `Current`、最后释放枚举器"的调用序列；循环体中的 `break`、`continue` 与异常都会触发枚举器释放。理解了这条翻译规则，下一节的状态机视角就会顺理成章。

## 二、编译器生成状态机剖析

编译器会把上面的 `Setlist` 改写成一个嵌套类：它同时实现 `IEnumerable<string>` 与 `IEnumerator<string>`，用整型字段记录执行到哪个 `yield`，用 `Current` 字段保存最近一次产出的值。概念上等价于下面的手写还原：

```csharp
// 概念演示：编译器为 Setlist() 生成的状态机（大幅简化）
class SetlistStateMachine : IEnumerable<string>, IEnumerator<string>
{
    private int _state = -2;          // -2 表示尚未开始，-1 表示已结束，其余为挂起点
    private string _current = "";

    public bool MoveNext()
    {
        switch (_state)
        {
            case -2: _current = "星海序曲";   _state = 0; return true; // 挂起于第 1 个 yield
            case 0:  _current = "应援色的风"; _state = 1; return true;
            case 1:  _current = "告别安可";   _state = -1; return true;
            default: return false; // 已结束，继续 MoveNext 恒为 false
        }
    }

    public string Current => _current;
    // GetEnumerator 第一次调用返回自身；Dispose 根据挂起位置执行对应 finally
}
```

几个关键细节值得记住：状态机把方法体"切片"到各个 `case` 分支，`yield return` 的落点就是状态标签；局部变量被提升为状态机的字段，因此在多次 `MoveNext` 之间保持存活；对迭代器方法的结果连续调用 `GetEnumerator` 会创建新的状态机实例（各自独立枚举），但若对状态机自身反复枚举则只有第一次有效，这是某些库返回 `IEnumerable` 被误用后"第二次枚举为空"的根源。

其中最值得展开的是 Dispose 与 finally 的联动：状态机在挂起时记得自己停在哪一个 `yield`，`Dispose` 会据此执行从挂起点到方法尾之间所有尚未走完的 `finally` 块，然后把自己标记为已结束。这意味着"文件读一半被 break"的场景下，清理逻辑依然严格执行——迭代器的资源安全正是建立在这套联动之上，也是第四节 try/finally 规则的底层依据。

## 三、延迟执行与多次枚举

调用迭代器方法时，方法体一行都不会执行——真正执行被推迟到第一次 `MoveNext`（通常由 `foreach` 触发）。这既是性能优势（按需计算、可以表达无限序列），也是事故来源（副作用在预料之外的时刻发生、多次枚举重复计算）。一句话概括本节主角：调用迭代器方法拿到的是"订单"而不是"货物"，何时生产、生产多少，全由消费方的节奏决定。

延迟执行还塑造了 LINQ 的组合方式：`Where`、`Select`、`Take` 每一层都只是包了一台新的状态机，真正拉数据的是最终消费方，整个管道在枚举时一次性穿透执行。因此副作用（写日志、改状态、抛异常）的执行时机不由代码书写位置决定，而由枚举位置决定——把"什么时候枚举"当作设计决策来对待，是使用迭代器的第一课。

```csharp
// 购票请求按需产出：创建即打印，枚举才执行
static IEnumerable<int> TicketWaves()
{
    Console.WriteLine("开始生成购票请求");
    for (int wave = 1; wave <= 3; wave++)
    {
        Console.WriteLine($"产出第 {wave} 波购票请求");
        yield return wave;
    }
}

var waves = TicketWaves();              // 此处不打印任何内容
Console.WriteLine("迭代器已创建，尚未执行");
foreach (var wave in waves) { /* 每轮循环推进一次状态机 */ }
```

`foreach` 一次只消耗一个元素，如果循环中途 `break`，状态机收到 `Dispose` 调用，后续元素永远不会产出。反过来说，若把同一个 `IEnumerable` 枚举两次（例如先 `Count()` 再 `foreach`），方法体会完整重跑一遍：读两遍文件、查两遍数据库都是典型事故。确认要多次使用时，用 `ToList()` 物化成快照。

延迟执行与异步的组合还有个隐蔽坑：在异步方法中创建迭代器后不立即消费，等 `await` 完成后再枚举，闭包捕获的局部变量可能已经变化。原则始终一致：迭代器捕获的是变量而不是值，消费时机越晚，"创建时"与"执行时"的世界差异越大。把物化时机与消费时机写进注释，是迭代器代码最便宜的保险。

## 四、try/catch 限制与 try/finally

语言规范规定：`yield return` 不允许出现在含 `catch` 子句的 `try` 块中；`try/finally` 则完全合法。原因在于迭代器被外部驱动，异常抛出点与捕获点分离会让"捕获之后从哪里继续"变得无法定义——迭代器一旦抛出异常即视为结束，没有恢复产出的语义。

```csharp
// 从曲目文件懒加载歌单：try/finally 保证资源随枚举释放
static IEnumerable<string> LoadSetlist(string path)
{
    StreamReader reader = new(path);
    try
    {
        while (reader.ReadLine() is { } line)
        {
            yield return line; // try-finally 中允许 yield return
        }
    }
    finally
    {
        Console.WriteLine("关闭曲目文件"); // 枚举完、提前 break、甚至异常退出都会执行
        reader.Dispose();
    }
}
```

`finally` 的执行由 `Dispose` 驱动：`foreach` 在正常结束、提前 `break` 或循环内抛异常时都会释放枚举器，从而触发 `finally`。但绕开 `foreach` 手动操作 `IEnumerator` 时必须自己 `Dispose`，否则"关闭文件"这类清理会一直悬着。需要"边产出边捕获异常"的效果时，惯用做法是把易抛的逻辑拆进非迭代器的私有方法，让调用层（或外层循环）负责 catch。

两条限制规则的准确表述是：`yield return` 不得出现在含 `catch` 子句的 try 块中（CS1626），`yield break` 同样不得出现在含 `catch` 子句的 try 块中（CS1625）；而纯 `try/finally` 中两者都合法。帮助记忆的模型是：catch 回答"出了异常之后从哪里继续"，而迭代器被异常击中后即告终结、无处可继续，规范干脆禁止这种无法兑现的承诺；finally 则是纯粹的单向清理，与"继续执行"无关，所以不受限制。

## 五、自定义迭代器与 LINQ 衔接

LINQ 的绝大多数标准查询运算符本身就是迭代器方法：`Where` 把"过滤后逐个产出"写成 `yield return`，`SelectMany` 把"展开后逐个产出"同样如此。理解了状态机，就能写出与运算符同构的自定义逻辑，并在两者之间自由组合。

```csharp
// 手写 Where：与 LINQ 的 Where 同样基于迭代器逐个产出
static IEnumerable<Song> FilterByTheme(this IEnumerable<Song> source, string color)
{
    foreach (var song in source)
    {
        if (song.ThemeColor == color)
        {
            yield return song; // 不缓存中间结果，过滤发生在消费端
        }
    }
}

public record Song(string Title, string? ThemeColor);
```

迭代器还能表达"无限序列"——只要消费端配合截断，产出端可以永远供应。这是普通返回集合的方法做不到的。

```csharp
// 应援灯牌无限滚动四种应援色，配合 Take 消费前 6 帧
static IEnumerable<string> ThemeColorStream()
{
    string[] colors = { "蓝", "粉", "金", "紫" };
    for (int i = 0; ; i++)
    {
        yield return colors[i % colors.Length]; // 无出口的循环，靠消费端截断
    }
}

// 消费端：foreach (var color in ThemeColorStream().Take(6)) { ... }
```

无限序列是迭代器表达力的试金石：生产端不关心消费多少，消费端决定何时停止，两端职责彻底解耦——这也是响应式与流式思维在同步世界的雏形。

这两个例子合起来说明了迭代器的定位：它不是语法玩具，而是"生产端如何把数据交给消费端"的通用协议。自定义运算符只要遵守逐个产出、不缓存的约定，就能与 BCL 的运算符无缝组合，这也是 LINQ 生态可扩展性的来源。另有一条隐性契约：序列枚举期间集合不可变，在 `foreach` 遍历 `List` 的同时增删元素会抛出 `InvalidOperationException`，迭代器并不能豁免这条规则。

在异步侧，`await foreach` 配合 `IAsyncEnumerable<T>` 把这套状态机推广到异步产出场景，适合逐段拉取弹幕、分页拉取曲库这类需要等待 I/O 的流式数据；`yield return` 在异步迭代器中语义不变，只是每次产出之间可以 `await`。

```csharp
// 异步流：逐页拉取曲库歌曲，await foreach 消费
static async IAsyncEnumerable<Song> LoadSongsAsync(
    HttpClient http, [EnumeratorCancellation] CancellationToken ct = default)
{
    for (int page = 1; ; page++)
    {
        var batch = await FetchPageAsync(http, page, ct);
        if (batch.Count == 0)
        {
            yield break; // 拉完最后一页，结束序列
        }
        foreach (var song in batch)
        {
            yield return song; // 异步迭代器中同样逐个产出
        }
    }
}
```

## 易错点与最佳实践

1. **多次枚举引发重复副作用。** 错误：`if (setlist.Count() > 0) { foreach (var s in setlist) ... }`，文件被读两遍。修正：确认复用时先物化。

   ```csharp
   // 修正：一次读盘，多次使用
   List<string> setlist = LoadSetlist("setlist.txt").ToList();
   ```

2. **在迭代器中依赖可变外部状态。** 错误：方法体引用一个会被别处修改的字段，枚举时机不同结果不同。修正：在进入迭代器方法前（非迭代器包装方法中）把所需值拷贝为参数或局部量，让序列内容只由创建时的快照决定。典型的例子是"当前登录粉丝"这类会话状态：迭代器体里直接读静态字段，枚举发生在请求处理之后，读到谁全看运气。

3. **试图在 try-catch 中 `yield return`。** 编译器直接报 CS1626。修正：把可能抛异常的计算抽到普通方法里，在迭代器外捕获；迭代器内部只保留 `try/finally` 做清理。

   ```csharp
   // 修正：捕获放在消费端，迭代器只负责产出
   foreach (var song in QuerySongs())
   {
       try { Render(song); }
       catch (Exception ex) { Console.WriteLine($"渲染失败：{ex.Message}"); }
   }
   ```

4. **手动枚举忘记 Dispose。** 错误：`var it = LoadSetlist(path).GetEnumerator();` 之后只调用 `MoveNext`，finally 永不执行。修正：用 `using` 包住枚举器，或干脆改回 `foreach`。

5. **混淆 `return` 与 `yield break`。** 迭代器方法中 `return` 不允许携带值，直接返回等价于结束序列；想表达"返回空序列"应直接结束方法体或 `yield break`，而不是返回 `null`——返回 `null` 会把 `NullReferenceException` 留给调用方。

## 本篇小结

1. 迭代器方法把"逐个产出"写成顺序代码，`yield return` 暂停、`yield break` 终止，控制权始终在调用方手里。
2. 编译器把方法体改写为同时实现 `IEnumerable<T>` 与 `IEnumerator<T>` 的状态机：状态字段记录挂起点，局部变量提升为字段存活于多次推进之间。
3. 延迟执行意味着"创建不执行、枚举才执行"，多次枚举会完整重跑，需要复用时用 `ToList()` 物化。
4. `yield return` 禁止出现在含 catch 的 try 块中；`try/finally` 合法且由 Dispose 驱动，是迭代器中释放资源的唯一正道。
5. LINQ 运算符与迭代器同构，掌握状态机后可以手写运算符、表达无限序列，并平滑过渡到 `IAsyncEnumerable<T>` 异步流。

## 动手实践

1. 实现 `IEnumerable<(int No, string Title)> CountdownSetlist(IEnumerable<string> songs)`：倒序产出歌单并附带倒数编号，用 `foreach` 提前 `break` 验证 finally 日志的输出位置，再手动用 `GetEnumerator` 复现"忘记 Dispose"的泄漏。
2. 为灯牌写一个无限序列 `BeatStream()`：按 120 BPM 交替产出"亮灯"与"熄灯"两种帧，配合 `Take(240)` 模拟两分钟演出；随后给它加一个可选的 `cancellationToken` 版本，体会同步迭代器与异步流在取消能力上的差异。
3. 阅读 BCL 中 `Enumerable.Where` 的源码（learn.microsoft.com 可查），对照本篇状态机还原其挂起与恢复过程，写一篇不超过十行的对照笔记。
