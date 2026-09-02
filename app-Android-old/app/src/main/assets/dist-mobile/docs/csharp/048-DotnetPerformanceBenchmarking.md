# .NET 性能测量与优化

虚拟歌手音乐平台的曲库检索、歌词高亮、粉丝团年度报告生成，都属于"感觉慢"与"真的慢"经常打架的功能。凭直觉优化是性能工程的第一大坑：改完之后更慢、或者快了却不知道为什么，都是常见结局。本篇的方法论只有一句话：先建立可信的测量，再谈优化；本篇的工具链核心是 BenchmarkDotNet 与 .NET 的诊断套件。

## 前置知识

- [Span 与 Memory](/csharp/019-SpanMemory)：零分配字符串与缓冲区操作是本篇优化清单的主角。
- [GC 分代](/csharp/036-GCGeneration)：解读分配数据与 Gen0/1/2 回收次数需要分代回收的背景知识。
- [C# 测试工程化](/csharp/012-CSharpTestEngineering)：基准项目与测试项目同构，都要求可重复、可自动化。

## 学习目标

1. 说清手写计时的三类系统性偏差，理解"为什么需要基准框架"。
2. 会搭建 BenchmarkDotNet 基准项目，读懂 Mean、Error、Allocated 等统计指标。
3. 掌握 Span 切片、对象池化、异步消阻塞三类常见优化手法及其适用条件。
4. 会用 dotnet-counters、dotnet-gcdump 等工具定位内存与 GC 热点。
5. 能识别伪优化结论，建立"基线、改动、复测"的优化闭环。

## 一、为什么需要基准框架

手写 `Stopwatch` 计时看起来简单直接，但它至少有三类系统性偏差。其一，JIT 预热：前几次执行的是解释或未优化的代码，冷启动耗时会污染平均数；其二，死代码消除：计算结果没人消费时，编译器（含 JIT）可能把整个循环优化掉，你测到的是"什么都不做"的速度；其三，环境噪声：GC 恰好触发、CPU 降频、后台进程抢占，都会让单次测量失真。

```csharp
// 朴素计时的典型问题：预热不足 + 结果未消费
var sw = Stopwatch.StartNew();
int sum = 0;
for (int i = 0; i < 1_000_000; i++)
{
    sum += i; // sum 从未使用，可能被整体优化掉
}
sw.Stop();
Console.WriteLine($"耗时 {sw.ElapsedMilliseconds} ms（可信度存疑）");
```

基准框架的职责就是系统性消除这些偏差：预热与分层编译收敛后再采样、强制消费结果防止死代码消除、多轮迭代取统计量并报告置信区间、隔离进程避免环境污染。这也是"用 BenchmarkDotNet 而不是 Stopwatch"的根本理由。

反过来理解也成立：基准框架做的一切，都是为了让"改动前"与"改动后"两个版本在完全相同的条件下被测量——预热统一、输入统一、消费方式统一、统计方法统一，变量只剩你的改动本身。没有这种控制，任何"快了 10%"的说法都只是噪音的另一种写法。

## 二、BenchmarkDotNet 基础与统计指标

基准方法挂 `[Benchmark]` 特性，入口处用 `BenchmarkRunner.Run<T>()` 启动；`[MemoryDiagnoser]` 附加内存诊断，报告每次调用的分配量与 GC 回收次数；`[Benchmark(Baseline = true)]` 指定基线，其余方法输出相对比值 Ratio。注意基准必须以 Release 模式运行，Debug 下的优化关闭会让所有结论失效。

```csharp
// 曲库检索方式对比：数组线性查找 vs 哈希集合查找
[MemoryDiagnoser]
public class SongSearchBenchmarks
{
    private readonly string[] _titles =
        Enumerable.Range(0, 1000).Select(i => $"应援曲 {i:0000}").ToArray();
    private readonly HashSet<string> _titleSet;

    public SongSearchBenchmarks() => _titleSet = new HashSet<string>(_titles);

    [Benchmark(Baseline = true)]
    public bool ArraySearch() => Array.IndexOf(_titles, "应援曲 0999") >= 0;

    [Benchmark]
    public bool HashSetSearch() => _titleSet.Contains("应援曲 0999");
}
```

结果表的核心列含义如下：Mean 是算术平均耗时，Error 是均值的置信区间半宽，StdDev 反映波动；Allocated 是每次操作的托管分配字节数；Gen0/Gen1/Gen2 是每千次操作触发的对应分代回收次数；Ratio 与 RatioSD 给出相对基线的倍数及其误差。读表时先看 Error 与 Mean 的相对大小（误差占比过大说明场景不稳定），再看 Allocated——高频路径上，分配往往比纳秒级耗时更值得先优化。

搭建基准项目的步骤也很固定：新建一个引用被测代码的控制台项目，添加 BenchmarkDotNet 包，写入基准类与 `BenchmarkRunner.Run` 入口；用 `dotnet run -c Release --filter *SongSearch*` 运行，框架会为每个基准方法生成独立进程、执行预热与多轮采样，最后在 `BenchmarkDotNet.Artifacts` 目录输出概览表与详细报告。把基准项目放进解决方案、与测试一起纳入日常开发，是"性能问题当测试问题管"的第一步。

结果的可信度还可以进一步加固：`[SimpleJob]` 控制运行环境与迭代次数，GC 模式相关配置用于对齐目标部署环境的服务器 GC 与并发回收设置；对并发场景应编写多消费者版本的基准，或直接用压测工具在集成环境测吞吐与 P95 延迟。微基准回答"这个操作本身多贵"，宏基准回答"系统整体扛不扛得住"，两者不能互相替代。写作顺序上，先用宏基准确认问题存在，再拆微基准定位原因，最后回到宏基准确认收益，方向感才不会丢。

## 三、常见优化清单：Span、池化与异步

第一类是字符串与缓冲区的零分配改写。`Substring` 每次切分都分配新字符串，而 `Span<char>` 切片只创建视图；对歌词高亮这种逐段扫描的场景，差异会被循环次数放大。

```csharp
// 高亮统计：同样是找"应援"二字，Span 版零分配
[Benchmark(Baseline = true)]
public int CountHitsSubString()
{
    int hits = 0;
    for (int i = 0; i + 2 <= _lyric.Length; i += 2)
        if (_lyric.Substring(i, 2) == "应援") hits++; // 每次切片分配一个字符串
    return hits;
}

[Benchmark]
public int CountHitsSpan()
{
    int hits = 0;
    ReadOnlySpan<char> span = _lyric.AsSpan();
    for (int i = 0; i + 2 <= span.Length; i += 2)
        if (span.Slice(i, 2).SequenceEqual("应援")) hits++; // 只比较，不分配
    return hits;
}
```

第二类是池化复用。演唱会开售瞬间每秒数万次请求，每个请求都 `new` 一个缓冲区或序列化器，Gen0 回收会飞速上涨。`ArrayPool<T>.Shared` 用于字节数组，`ObjectPool<T>`（Microsoft.Extensions.ObjectPool）用于可重置对象；原则是"借了必还、还了别再用"。池化的收益必须用测量确认：对象池本身有获取与归还的开销，如果单次借用只干几百纳秒的活儿，池化管理成本可能反超收益；分配焦虑要在 Allocated 列与 Gen0 数据面前收敛，而不是凭感觉。第三类是异步消阻塞：高频路径上避免 `Task.Result`、`GetAwaiter().GetResult()` 这类同步等待，它们会占住线程池线程，在请求高峰演变成线程池饥饿式的全局假死；用 `await` 全链路贯通才能让少量线程服务大量并发。对"成功路径极快、失败路径才需要真正异步"的成员（例如本地缓存命中直接返回），可以返回 `ValueTask`，省下一次任务对象分配。

```csharp
// 缓存命中走同步快路径，未命中才进入异步 IO
public ValueTask<Song?> GetSongAsync(string id)
{
    if (_cache.TryGetValue(id, out var song))
    {
        return new ValueTask<Song?>(song); // 命中：零分配直接返回
    }
    return new ValueTask<Song?>(LoadFromDbAsync(id)); // 未命中：委托异步路径
}
```

## 四、GC 与内存诊断工具

BenchmarkDotNet 的 Allocated 列回答"平均每次分配多少"，而生产环境的内存问题还需要专门的诊断工具。dotnet-counters 实时观察 GC 堆大小、各代回收次数与线程池队列，适合先看"有没有问题"；dotnet-gcdump 抓取堆快照，回答"谁占着内存"；dotnet-trace 采集 CPU 与分配事件；这些数据也可以通过 OpenTelemetry 或 EventCounters 接入平台自己的监控大盘。

观察指标建议按"先全局后局部"的顺序读：先看 GC 堆总量与各代回收速率，判断压力落在哪个分代；再看线程池队列长度与吞吐，判断是否存在饥饿；最后才深入到具体对象。指标之间要交叉验证，例如 Gen0 回收频繁但堆总量稳定，通常只是正常的短命对象流量，不必紧张。工具都要求诊断通道可用：容器内运行时注意 PID 1 与诊断套接字权限，Kubernetes 部署可以把采集做成 sidecar 或定时任务，避免临时登录生产机器。

```csharp
// 精确测量一次调用的托管分配量（需 Release 模式并先预热）
long before = GC.GetAllocatedBytesForCurrentThread();
GenerateFanClubReport(_songs); // 生成粉丝团年度报告
long allocated = GC.GetAllocatedBytesForCurrentThread() - before;
Console.WriteLine($"生成报告分配了 {allocated} 字节");
```

解读时把"分配大"与"回收频繁"分开：分配大但都是长生命周期对象（Gen2 上涨、Gen0 不动），问题在对象生命周期管理；短命对象洪水（Gen0 飙升）则要找每请求 `new` 的热点。若 gcdump 显示 `byte[]`、字符串占据大头，通常对应缓冲区未池化或字符串拼接未用 `StringBuilder`，此时再回到第三节的清单对症下药。

工具的典型用法遵循"先监控、后取证"的顺序：

```bash
# 实时观察票务服务的 GC 与线程池指标
dotnet-counters monitor -n TicketService --counters System.Runtime

# 抓取堆快照，离线分析"谁占着内存"
dotnet-gcdump collect -p 12345

# 采集 CPU 采样，定位热点方法
dotnet-trace collect -p 12345 --profile cpu-sampling
```

## 五、解读结果与避免伪优化

基准结果最大的风险不是数字不准，而是"问题问错了"。第一类伪优化是把一次性成本计入对比：在一个基准方法里现构造 `HashSet` 再查询，而基线只查询，得到"哈希查找更慢"的假结论——构造成本应放进构造函数或 `[IterationSetup]`（后者也有自身的测量干扰，构造函数更优）。第二类是用微基准外推宏性能：单次 20 纳秒的优化，若该路径每天只执行千次，对用户毫无感知，先确认它在真实负载的热点里。第三类是忽略波动与误差：只跑一遍、只看最好成绩，都会产出不可复现的结论。

正确的闭环是：用 dotnet-trace 或生产剖析器确认热点，建立带 `Baseline` 的基准锁定现状，做单一变量的改动，在同一环境复测并核对 Ratio 与 Allocated，最后用性能预算（例如"P95 检索延迟低于 50 ms、每请求分配低于 4 KB"）决定是否合入。没有基线与预算的"优化"，本质上只是重构。

还有一类值得专门强调的伪优化是"优化了没人走的路径"。微基准的差异要换算成用户可感知的量：一条路径每天执行一千次，单次快 100 纳秒，一年累计不足 40 毫秒；同样的改动放在每秒十万次的检索路径上，一年就是小时级收益。把执行频率乘进收益估算，再决定要不要为它牺牲可读性，是性能工程里最便宜的一笔账。把这笔账写进优化提案（收益估算、改动成本、回滚方案）还有个额外好处：它强迫优化者在动手前回答"这次改动到底服务谁"，许多伪优化在这一步就自动出局了。

## 易错点与最佳实践

1. **在 Debug 模式下跑基准。** 错误：IDE 默认配置直接 F5 运行基准项目。修正：统一用 `dotnet run -c Release`，或在项目文件里直接禁用 Debug 启动基准。

   ```csharp
   // 修正：入口处再加一道保险，提示必须 Release
   #if DEBUG
   Console.Error.WriteLine("基准必须在 Release 下运行");
   return;
   #endif
   BenchmarkRunner.Run<SongSearchBenchmarks>();
   ```

2. **一次性初始化计入基准方法。** 错误：`HashSetSearch` 里 `new HashSet<string>(_titles)` 后再查询，测的是"建集合 + 查一次"。修正：初始化移到构造函数，基准方法只保留被测操作。

3. **死代码消除让基准空转。** 错误：计算结果不返回、不消费。修正：基准方法返回结果，或用 BenchmarkDotNet 提供的 `Consumer` 消费输出，让 JIT 无法裁剪。

   ```csharp
   // 修正：返回结果，迫使 JIT 保留计算
   [Benchmark]
   public int Sum() { int s = 0; foreach (var v in _data) s += v; return s; }
   ```

4. **只测一遍就下结论。** 错误：某次微基准快了 3%，立刻提交"性能优化"。修正：接受 BenchmarkDotNet 默认多轮统计，关注 Error 与 StdDev；差异小于误差范围的改动应视为无效。跨机器比较基准结果同样无效——CPU 频率、缓存与内存通道都会改变绝对值，基准结论只在同一台机器、同一配置下成立。

5. **为优化而优化。** 错误：把所有 `Substring` 换成 Span，代码可读性骤降。修正：只对热点清单上的路径做零分配改写，并保留一个朴素版本作对照测试，确保行为一致。毕竟，可读性也是性能——是后续维护者的性能。

## 本篇小结

1. 手写计时受 JIT 预热、死代码消除与环境噪声三类偏差影响，可信结论必须来自基准框架的受控采样。
2. BenchmarkDotNet 的读表顺序：先看误差与均值的比例判断稳定性，再看 Allocated 与 Gen 回收判断分配压力，最后比较 Ratio。
3. 三类高频优化：Span 切片消灭字符串分配、池化复用重对象与缓冲区、异步贯通消灭同步等待与线程池饥饿。
4. 内存诊断的分工：counters 看趋势、gcdump 找占用者、trace 定位事件时序，基准框架负责量化改动收益。
5. 优化必须走"基线、单一改动、复测、预算"的闭环，问题问错时数字再漂亮也是伪优化。

## 动手实践

1. 为"歌词关键词替换"写一组基准：`string.Replace` 链式调用对比 `StringBuilder.Replace`，分别用 100 字与 10 万字歌词各测一次，解释两次结果相反（或相同）的原因。
2. 用 `ArrayPool<byte>.Shared` 改写一个每请求分配 8 KB 缓冲的模拟导出函数，基准对比 Allocated 与 Gen0 列的变化，并检查"借还配对"是否覆盖异常路径。
3. 在本地运行一个会周期性分配大对象的控制台程序，用 dotnet-counters 观察 Gen2 与堆大小的关系，再用 dotnet-gcdump 找出占用最大的三个类型，把过程截图整理进学习笔记。
