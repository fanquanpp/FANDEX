---
order: 50
title: 可空引用类型 NRT
module: 'csharp'
category: 后端技术
difficulty: intermediate
description: 把 NullReferenceException 消灭在编译期：可空注解与流分析。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'csharp/003-CSharpBasicSyntax'
  - 'csharp/037-ValueTypeReferenceType'
  - 'csharp/006-CGenericCollection'
prerequisites:
  - 'csharp/003-CSharpBasicSyntax'
---

# 可空引用类型 NRT

在虚拟歌手音乐平台的代码里，一首新歌可能暂时没有分配演唱它的歌姬，一场演唱会也可能尚未公布主题应援色。在传统 C# 中，"可能为空"与"绝不能为空"这两种语义完全混在一起：所有引用类型都可以被赋值为 `null`，出了问题只能依赖运行时的 `NullReferenceException` 事后揭示。可空引用类型（Nullable Reference Types，NRT）把"这个变量可能为 null"写进类型系统，让编译器在编译期就把隐患找出来。

## 前置知识

- [C# 基础语法](/csharp/003-CSharpBasicSyntax)：变量、方法与类的基本写法，是理解注解语法的前提。
- [值类型与引用类型](/csharp/037-ValueTypeReferenceType)：`null` 只会出现在引用类型上，理解这一点才能把握 NRT 的作用边界。
- [C# 泛型与集合](/csharp/006-CGenericCollection)：本篇会涉及泛型约束 `where T : notnull` 与 `T?` 在泛型中的特殊含义。

## 学习目标

1. 说清可空引用类型的开启方式与核心语义：引用类型默认不可为 `null`，`?` 标注"可以为 null"。
2. 正确使用 `?` 注解与 `null!` 空容忍操作符，理解二者各自的用途与代价。
3. 理解编译器流分析的基本规则，能根据 CS8602、CS8618 等警告定位真实缺陷。
4. 在泛型 API 中区分 `T?` 的多种展开形态，正确使用 `where T : notnull` 约束。
5. 为存量项目制定渐进启用策略，按目录、按文件稳步推进并保持构建绿色。

## 一、开启方式与核心语义

NRT 自 C# 8.0 引入，通过项目文件中的 `<Nullable>` 属性控制，取值有 `disable`、`enable`、`warnings`、`annotations` 四档；也可以用 `#nullable enable`、`#nullable restore` 指令在单个文件甚至代码块粒度上开关。

四档的含义值得记牢：`disable` 完全关闭，回到传统语义；`annotations` 只检查 `?` 注解本身的合法性，不运行流分析，适合迁移的第一步；`warnings` 只产生流分析警告，适合注解已补齐的过渡期；`enable` 同时开启两者，是长期目标档位。NRT 是纯编译期特性，同一份代码在不同档位下生成的运行时行为完全一致，差异只在警告的有无——这正是"分档推进"能够成立的前提。

```xml
<!-- csproj：按项目统一开启可空引用类型 -->
<PropertyGroup>
  <TargetFramework>net8.0</TargetFramework>
  <Nullable>enable</Nullable>
</PropertyGroup>
```

开启后，语义向两个方向收紧：引用类型变量默认被视作"不应为 null"，把 `null` 赋给它、或者未经初始化就发布出去，都会产生警告；而显式标注 `?` 的变量进入"可能为 null"的跟踪通道，编译器会要求你在每次解引用前先排除 null 的可能。`null` 的判断从口头约定与运行时崩溃，变成了编译期契约。

```csharp
// 虚拟歌手音乐平台的歌曲实体（csproj 已配置 <Nullable>enable</Nullable>）
public class Song
{
    public string Title { get; init; } = "";   // 引用类型默认不可为 null，必须初始化
    public string? ThemeColor { get; set; }    // 应援色可暂未公布，用 ? 明确标注可空
    public VirtualSinger? Singer { get; set; } // 新曲可能尚未分配歌姬
}

public class VirtualSinger
{
    public required string Name { get; init; } // required 强制构造方完成初始化
}
```

`ThemeColor` 用 `string?` 声明，表达"应援色可以暂时没有"这一真实业务状态；`Title` 则声明为不可空并给出默认值，表达"歌名永远存在"。类型签名本身就成了第一层文档。一个简单的自检方法：每写完一个字段就问"业务上它会不会没有"，答案是就加 `?`，不是就保证初始化；让每个 `?` 都有业务事实背书，类型声明才不会退化成摆设。

## 二、? 与 null! 的含义

`?` 出现在引用类型之后，表示"这个位置的值可能为 null"，它是注解而非运行时包装：编译后并没有额外的类型，只是在元数据里记录了可空性信息。与之配套的是空容忍操作符 `!`（null-forgiving operator）：写在表达式后面，告诉编译器"我断言它此刻不是 null，请闭嘴"。它只消除警告，不会生成任何运行时检查，用错了一样抛 `NullReferenceException`。

```csharp
// 从曲库缓存查找歌曲：找不到返回 null 是合法契约
Song? FindSong(string id) =>
    _cache.TryGetValue(id, out var song) ? song : null;

void Play(string songId)
{
    Song? song = FindSong(songId);

    // song 处于"可能为 null"状态，直接访问会触发 CS8602 警告
    Console.WriteLine(song?.Title ?? "未找到歌曲");

    Song asserted = song!;              // 空容忍操作符：压制警告
    Console.WriteLine(asserted.Title);  // 若运行时仍为 null，照样抛异常
}
```

因此两者的分工非常清晰：`?` 用来诚实地声明事实，`null!` 用来向编译器提交一个"你负责证明"的断言。`null!` 合理的出现位置极少，例如初始化字段以满足"先赋值后使用"的框架要求（`public Song Song = null!;` 由 DI 在构造时填充）。凡是能用 `?.`、`??`、`is null` 分支表达的地方，都不应该用 `!` 糊弄过去。

还可以从历史视角理解这次变化：`?.` 与 `??` 这些操作符早在 C# 6 就已就位，NRT 做的事情只是让编译器读懂这些表达式背后的意图，并在整个代码库范围内一致地执行它。因此开启 NRT 通常不需要改算法，改的是"把 null 的可能性写在类型上、在正确的位置处理它"的编码习惯；这也是它迁移成本低、收益却很高的原因。

## 三、编译器流分析：警告从哪里来

NRT 的核心不是注解，而是编译器的流分析（flow analysis）。编译器为每个引用变量维护一个"空状态"（not-null / maybe-null），并沿控制流传播：赋非空值后进入 not-null 状态；经过 `is null`、`is not null`、`?.` 判空后收窄；调用未标注可空性契约的方法、或者把变量传进可能修改它的非空参数后，状态又会被"污染"回 maybe-null。

```csharp
// 流分析：判断一次，后续代码自动进入"已排除 null"分支
void PrintLabel(Song? song)
{
    if (song is null)
    {
        return; // 提前返回后，后续的 song 处于 not-null 状态
    }
    Console.WriteLine($"《{song.Title}》应援色：{song.ThemeColor ?? "未公布"}");
}
```

流分析只能看到单个方法体，字段、属性与方法边界上的状态会"失忆"。为此 .NET 提供了一组可空特性注解，把跨方法的契约告诉编译器：`[NotNullWhen(bool)]`、`[NotNullIfNotNull]`、`[MemberNotNull]`、`[DoesNotReturn]` 等。最常见的 Try 模式就是靠 `[NotNullWhen(true)]` 实现"返回 true 即非空"的收窄。流分析的精度边界也很明确：它跟踪的是局部变量与参数，跨字段的状态只能靠契约注解补齐；"这个字段构造后永不为 null"这类静态知识不参与推理，这正是字段可空性警告总在构造函数与初始化附近出现的原因。

```csharp
// 用特性描述"校验即收窄"的契约，调用方无需再强制转换
static bool TryGetTopSong([NotNullWhen(true)] out Song? song)
{
    song = FindSong("top1"); // 可能为 null
    return song is not null; // 返回 true 时，编译器认为 song 非空
}

static void PlayTopSong()
{
    if (TryGetTopSong(out var top))
    {
        Console.WriteLine($"正在播放：{top.Title}"); // true 分支内零警告
    }
}
```

常见警告可以按含义归组成一张速查表：

| 警告号 | 触发场景 | 典型处置 |
| --- | --- | --- |
| CS8618 | 不可空字段或属性未初始化 | 构造时赋值、required 或改为可空 |
| CS8625 | 把字面量 null 赋给不可空引用 | 改为可空类型或重新设计契约 |
| CS8602 | 可能解引用 null | 先判空或用 `?.` 短路 |
| CS8604 | 可能的 null 传入不可空参数 | 在调用前校验或收窄 |
| CS8601、8603、8605 | 可空与不可空的赋值、返回互转 | 统一签名的可空性 |
| CS8714 | 类型参数可能为 null，不满足 notnull | 调用方收窄或放宽约束 |

在持续集成里把这些警告提升为错误（`TreatWarningsAsErrors`，或仅对可空警告组单独设错），是守护质量的有效手段。

## 四、泛型约束 where T : notnull

`T?` 在泛型中的含义取决于约束：`where T : struct` 时它是 `Nullable<T>`；`where T : class` 时它只是"可空引用"注解；而约束为 `notnull` 或未约束时，`T?` 表示"可能为 `default(T)`"。`where T : notnull` 的意义在于向编译器和使用者声明：这个泛型参数不允许把 `null`（对值类型则是 default）当作合法值传入，调用方传可空类型会触发 CS8714 警告。

```csharp
// 曲库仓库：T 不接受 null，键不存在时用 bool 表达失败
public class SongRepository<T> where T : notnull
{
    private readonly Dictionary<string, T> _items = new();

    public void Add(string key, T item) => _items[key] = item;

    // value! 用于压制 TryGetValue 对 out 参数的 maybe-null 提示，
    // 真实的"是否取到"契约由返回值表达
    public bool TryGet(string key, out T value) => _items.TryGetValue(key, out value!);
}
```

注意 `notnull` 约束是编译期约定，运行时并不阻止反射或值类型的 `default` 混进来，所以在实现内部仍要用 Try 模式而非抛异常的方式表达失败。设计公共泛型 API 时，先想清楚"null 是不是合法输入"，再决定加不加 `notnull`，比事后修补签名容易得多。

与之相关的是 `default!` 惯用法：泛型代码里 `default(T)` 对引用类型就是 null，但签名声明返回 `T` 时编译器会提示 maybe-null。此时用 `default!` 表示"失败路径已被返回值表达，取到的值不会是 default"（如上面 `TryGet` 的 `value!`），比把签名改成 `T?` 再迫使所有调用方收窄更贴近真实契约。判断标准依然是：注解必须表达事实，`!` 只能出现在确实能证明的地方。

## 五、存量项目渐进启用策略

给运行多年的项目一次性打开 `<Nullable>enable</Nullable>`，通常意味着数千条警告扑面而来。正确的做法是分阶段推进：先 `annotations`，允许团队逐步补写 `?` 注解而不产生流分析警告；再 `warnings`，开始暴露问题但允许压制；最后 `enable` 并在 CI 中将可空警告视为错误。

```xml
<!-- 第一步：只允许并检查 ? 注解，先让类型签名诚实起来 -->
<PropertyGroup>
  <Nullable>annotations</Nullable>
</PropertyGroup>
```

```csharp
// 尚未改造的旧文件可以在顶部临时关闭，改完移除该行
#nullable disable
```

配套的推进手段包括：用 EditorConfig 按目录设置不同严格度，先迁移领域模型等核心目录；优先修复"取值即用"类高频警告（CS8602、CS8604），它们对应真实崩溃路径；对暂未处理的历史代码用 `#nullable disable` 圈起来，而不是到处写 `!`；每完成一批就用测试与构建验证，保证主干始终可发布。整个过程中，新代码从一开始就按 enable 标准编写，避免欠债继续增长。

框架生态的可空性也在持续跟进：EF Core 的导航属性、ASP.NET Core 的模型绑定、System.Text.Json 的序列化契约都已按 NRT 标注。但要注意方向——框架注解描述的是"理想世界"的契约，运行时输入仍可能违背它：外部请求把 `"themeColor": null` 反序列化进声明为 `string` 的属性，编译器与库都不会拦你。因此信任边界上的显式校验永远是 NRT 的补充，而不是替代。

## 易错点与最佳实践

1. **用 `null!` 关闭警告掩盖缺陷。** 错误：`string name = FindSong(id)!.Title;`，查不到就崩溃。修正：诚实面对可空契约，用分支处理失败路径。

   ```csharp
   // 修正：先收窄，再使用
   Song? song = FindSong(id);
   if (song is null)
   {
       Console.WriteLine("歌曲不存在");
       return;
   }
   Console.WriteLine(song.Title);
   ```

2. **忽略 CS8618，让不可空字段带着 null 流出构造函数。** 错误：开启 NRT 后仍写 `public string Title { get; set; }`。修正：字段要么在声明或构造时赋值，要么用 `required` 强制，要么承认现实改成 `string?`。三者按优先级排序：构造方必给且无默认的用 `required`，有合理默认的给默认值，真正可选的才改成 `?`，顺序颠倒了会人为放大可空范围。

   ```csharp
   // 修正：构造路径上保证初始化
   public class Song
   {
       public required string Title { get; init; } // 构造时必须提供
       public string? ThemeColor { get; set; }
   }
   ```

3. **把 NRT 当成运行时检查。** NRT 注解编译后即被擦除，反序列化、EF Core 导航属性填充、反射赋值都可能绕过它把 null 塞进"不可空"字段。错误：依赖 `string Title` 的注解就不再判空。修正：在信任边界（反序列化入口、外部接口）保留显式校验。务实的折中是：进程内部流转信任注解，跨进程边界（HTTP 请求体、消息队列载荷、配置文件）一律重新校验，两层各司其职。

4. **集合元素的可空性被遗漏。** `List<Song>` 与 `List<Song?>`、`string[]` 与 `string?[]` 是不同契约。错误：向 `List<Song>` 塞入 `FindSong` 返回的 `Song?`，只会在更深处爆炸。修正：过滤后再入列。

   ```csharp
   // 修正：先剔除 null，再进入不可空集合
   List<Song> playlist = songIds
       .Select(FindSong)
       .Where(s => s is not null)
       .Select(s => s!) // 过滤后安全；或用 OfType<Song>()
       .ToList();
   ```

5. **接口契约与实现的可空性不一致。** 接口声明返回 `string?`、实现却返回 `string`（或反过来），会让调用方与实现方都产生误判。修正：以"调用方视角最不利"的原则统一签名，实现可以更严格，但不能更宽松。

## 本篇小结

1. NRT 把"可能为 null"升级为类型系统的一部分：引用类型默认不可空，`?` 显式标注可空，警告发生在编译期而非运行期。
2. `?` 声明事实，`null!` 提交断言；前者应当大量出现，后者应当被代码评审重点盘查。
3. 流分析沿控制流传播空状态，跨方法边界靠 `[NotNullWhen]` 等特性注解补充契约。
4. 泛型中 `T?` 的含义随约束变化，`where T : notnull` 用类型参数层面拒绝 null 输入。
5. 存量项目按 annotations、warnings、enable 三档渐进启用，配合 EditorConfig 与 CI 把可空性纳入持续守护。

## 动手实践

1. 给"演唱会排片"建模：`Concert` 含 `string Title`、`VirtualSinger? Headliner`（头牌歌姬可暂缺）、`string ThemeColor`。在 enable 环境下编写售票入口方法，体会哪些成员必须 `?`、哪些必须强制初始化，并解释每个选择对应的业务事实。
2. 实现 `bool TryGetCheapestTicket([NotNullWhen(true)] out Ticket? ticket)`，在返回 true 的分支里直接读取 `ticket.Price` 而不产生任何警告；随后故意移除特性注解，观察警告位置的变化并解释原因。
3. 取一个自己维护的类库，按"annotations、warnings、enable"三档各执行一轮构建，记录每档的警告数量与修复策略，整理成一页迁移笔记。
