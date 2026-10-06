---
order: 490
title: System.Text.Json：从对接一个第三方 API 学起
module: 'csharp'
category: 后端技术
difficulty: beginner
description: 以"对接一个 snake_case 的第三方 API"为主线学 System.Text.Json：往返序列化、选项配置、属性标注、自定义转换器、多态、DOM 与源生成，附高频陷阱、自检清单与练习。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'csharp/450-FileAndStream'
  - 'csharp/300-CSharpAPI'
  - 'csharp/240-SourceGenerator'
prerequisites:
  - 'csharp/040-CSharpOOP'
---

## 真实场景：对接一个不迁就你的第三方 API

需求来了：接入某物流平台的开放接口。它返回的 JSON 长这样：

```json
{
  "order_id": "SF20260928",
  "receiver_name": "张三",
  "created_at": "2026-09-28 10:30:00",
  "remark": null,
  "packages": [
    { "pkg_no": 1, "weight_kg": 2.5 }
  ]
}
```

三件不顺手的事：字段是 `snake_case` 而你的 C# 属性是 `PascalCase`；`remark` 可能为 `null`；`created_at` 不是标准 ISO 8601 格式。本篇就沿着"把这个响应变成 C# 对象、再把请求对象发回去"这条线，把 `System.Text.Json` 的核心能力全部过一遍。

（.NET 8+ 自带 `System.Text.Json`，.NET 9/10 继续增强；下文示例在 .NET 9 上可直接运行。）

## 动手：五分钟跑通第一次往返

新建控制台项目，写下最小往返程序：

```csharp
using System.Text.Json;

var order = new ShipmentOrder
{
    OrderId = "SF20260928",
    ReceiverName = "张三",
    CreatedAt = DateTime.Now,
};

// 对象 -> JSON 字符串
string json = JsonSerializer.Serialize(order);
Console.WriteLine(json);

// JSON 字符串 -> 对象（泛型版本显式标类型，非泛型版本省略）
ShipmentOrder? copy = JsonSerializer.Deserialize<ShipmentOrder>(json);
Console.WriteLine(copy!.ReceiverName);

record ShipmentOrder
{
    public string OrderId { get; set; } = "";
    public string ReceiverName { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}
```

能跑了，但输出是 `"OrderId":"SF20260928"`——PascalCase，第三方不认。接下来逐条对症下药。

## 对症下药：把选项配对

### 一组选项解决命名、缩进与 null

```csharp
var options = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower, // .NET 8+ 内置 snake_case；.CamelCase 亦常用
    WriteIndented = true,                                   // 带缩进，人可读（日志/调试用）
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull, // null 属性不输出
    PropertyNameCaseInsensitive = true,                     // 反序列化时大小写不敏感
};
string json = JsonSerializer.Serialize(order, options);
```

.NET 8 之前想要 snake_case 只能逐属性标 `[JsonPropertyName("order_id")]`；如今命名策略直接覆盖全属性，个别特殊字段仍可用特性覆盖。容忍"脏 JSON"（带注释、带尾随逗号的配置文件）再加两个开关：

```csharp
var lenient = new JsonSerializerOptions
{
    ReadCommentHandling = JsonCommentHandling.Skip, // 跳过注释
    AllowTrailingCommas = true,
};
```

### 属性级精细控制

```csharp
public class User
{
    [JsonPropertyName("user_name")]   // 单个属性改名，优先级高于命名策略
    public string Name { get; set; }

    [JsonIgnore]                      // 永不序列化（密码、内部字段）
    public string Password { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Nick { get; set; } // 仅在为 null 时不输出

    [JsonPropertyOrder(0)]            // 控制输出顺序（默认按属性声明顺序）
    public int Id { get; set; }
}
```

### 大响应走流式异步

几 MB 以上的响应别先整个读成 string，直接从流反序列化，省一半内存峰值：

```csharp
using var fs = File.OpenRead("response.json");
var data = await JsonSerializer.DeserializeAsync<List<ShipmentOrder>>(fs);

using var outFs = File.Create("out.json");
await JsonSerializer.SerializeAsync(outFs, data);
```

### `created_at` 这种非常规格式：自定义转换器

```csharp
public class CnDateTimeConverter : JsonConverter<DateTime>
{
    private const string Format = "yyyy-MM-dd HH:mm:ss";

    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => DateTime.ParseExact(reader.GetString()!, Format, null);

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        => writer.WriteStringValue(value.ToString(Format));
}
```

两种挂载方式：全局挂 `options.Converters.Add(new CnDateTimeConverter())`，或单属性挂 `[JsonConverter(typeof(CnDateTimeConverter))]`。后者影响面小，优先用。

## 讲为什么：三个设计决定

**为什么默认大小写敏感？** 匹配是逐字符比较，宽松匹配要做额外的归一化和查找，热路径上不划算。安全上，严格匹配能避免 `user` 与 `USER` 意外命中同一属性。所以对接 JavaScript 生态（天然 camelCase）时，标准做法是"序列化配命名策略 + 反序列化开不敏感"或干脆 `[JsonPropertyName]` 点名。

**为什么每次 `new JsonSerializerOptions` 是性能坑？** 序列化器首次见到"某组选项 + 某个类型"的组合时，要为它构建并缓存元数据（属性怎么读、怎么写），这一步开销可观。缓存键就是选项实例本身——每次 new 一个新实例，缓存全部失效。Web 应用里 ASP.NET Core 已经把全局选项做成单例；自己用时也应建一个 `static readonly JsonSerializerOptions` 复用。

**为什么 record 反序列化"开箱即用"？** `record` 的主构造函数参数名与属性名一致，序列化器能按参数名匹配构造函数直接构造对象（多个构造函数时用 `[JsonConstructor]` 指定）。这正是"模型层用 record"在序列化上的红利：不可变 + 不用手写映射。

## 进阶三件套：多态、DOM、源生成

### 多态：默认关着，要显式开

声明类型是基类时，派生类的新增属性默认不输出，反序列化也不知道该 new 谁。必须在基类上声明派生类型：

```csharp
[JsonDerivedType(typeof(Circle), "circle")]
[JsonDerivedType(typeof(Square), "square")]
public abstract class Shape { }

// JSON 里自动带类型鉴别符，反序列化能还原出正确子类
Shape shape = JsonSerializer.Deserialize<Shape>(json)!;
```

这是与 Newtonsoft.Json 行为差异最大的一点：Newtonsoft 默认输出 `$type`，System.Text.Json 默认什么都不做——前者有反序列化漏洞史，后者是刻意的安全选择。

### 不想建模型时：DOM 两兄弟

临时读一个字段、或者要改 JSON 中的某个值再存回，不必定义完整类型：

```csharp
// JsonDocument：只读，用完要 Dispose
using var doc = JsonDocument.Parse(json);
string name = doc.RootElement.GetProperty("receiver_name").GetString()!;

// JsonNode：可读写
JsonNode node = JsonNode.Parse(json)!;
node["weight_total"] = 5.5;
string updated = node.ToJsonString();

// 也可以从零构造
var obj = new JsonObject { ["name"] = "Alice", ["age"] = 30 };
```

### 源生成：AOT 的硬要求，热路径的加速器

`PublishAot` 或 `PublishTrimmed` 的应用不能依赖运行时反射，序列化必须编译期生成。三步：

```csharp
// 1. 声明上下文，登记参与的类型
[JsonSourceGenerationOptions(WriteIndented = true)]
[JsonSerializable(typeof(ShipmentOrder))]
public partial class AppJsonContext : JsonSerializerContext { }

// 2/3. 调用时把上下文的类型信息传进去
string json = JsonSerializer.Serialize(order, AppJsonContext.Default.ShipmentOrder);
var copy = JsonSerializer.Deserialize(json, AppJsonContext.Default.ShipmentOrder);
```

普通应用也建议在热路径使用：省反射、省内存。源生成的原理与更多玩法见 [Source Generator](/csharp/240-SourceGenerator)。

## 坑点与自检

**坑 1：循环引用直接抛 `JsonException`。** `Order.Customer.Address` 又指回 `Order` 这类对象图，默认配置不死循环、直接报错。`ReferenceHandler.Preserve`（输出 `$id`/`$ref`）能救，但更常见的正解是用 DTO 只序列化单向需要的数据。

**坑 2：`DictionaryKeyPolicy` 只管序列化。** 输出时键转 camelCase，读回来不做反向转换；`Dictionary<int, T>` 这类非字符串键会被转成字符串，读回需要自定义转换器。API 设计上尽量用字符串键。

**坑 3：跨项目传选项。** 两个服务对同一类型用了不同选项，缓存里就是两套元数据——选项应按"用途"收敛成少数几个静态实例（对外 API 一套、内部日志一套）。

自检——能不看文档回答这些吗：

1. 为什么 `PropertyNameCaseInsensitive = true` 不该无脑全局开？
2. 选项实例为什么必须复用？ASP.NET Core 帮你做了什么？
3. 基类引用序列化派生对象，默认丢什么？怎么开？
4. AOT 发布后序列化抛异常，第一反应查什么？

## 练习

1. 把物流 API 的响应定义成 record 模型，配一组全局选项完成反序列化；故意把 `PropertyNameCaseInsensitive` 去掉并改成 PascalCase 输入，观察哪些字段静默变成默认值。
2. 给 `decimal` 写一个"输出为字符串"的转换器（金额字段避免浮点精度问题的常见做法），单属性挂载并验证往返。
3. 用 `JsonNode` 读一个不重建模型的配置文件，把其中 `retry.count` 从 3 改成 5 后保存，再用 `JsonDocument` 验证修改生效。

## 下一步

- 对象与文件、流的关系，`using` 资源管理：[文件与流操作](/csharp/450-FileAndStream)；
- Web API 里框架如何统一接管 JSON 选项：[C# Web API](/csharp/300-CSharpAPI)；
- 源生成的完整机制与自写生成器：[Source Generator](/csharp/240-SourceGenerator)；
- AOT 发布本身的取舍：[dotnet CLI](/csharp/480-DotnetCli)。
