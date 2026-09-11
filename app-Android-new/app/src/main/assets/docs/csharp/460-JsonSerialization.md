---
order: 460
title: C# JSON 序列化
module: 'csharp'
category: 后端技术
difficulty: beginner
description: System.Text.Json 的 JsonSerializer、选项控制、自定义转换器、多态与源生成的速查手册，附完整示例与易错点解析。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'csharp/450-FileAndStream'
  - 'csharp/300-CSharpAPI'
  - 'csharp/240-SourceGenerator'
prerequisites:
  - 'csharp/040-CSharpOOP'
---

## 基本序列化

**基本写法：序列化为 JSON**
`JsonSerializer.Serialize(<对象>, [<选项>]);`
```csharp
// 对象转 JSON 字符串
string json = JsonSerializer.Serialize(user);
```

---

**基本写法：泛型序列化**
`JsonSerializer.Serialize<<类型>>(<对象>);`
```csharp
// 显式指定类型序列化
string json = JsonSerializer.Serialize<User>(user);
```

---

**基本写法：反序列化**
`JsonSerializer.Deserialize<<类型>>(<json>);`
```csharp
// JSON 字符串转对象
var user = JsonSerializer.Deserialize<User>(json);
```

---

**基本写法：异步序列化到流**
`await JsonSerializer.SerializeAsync(<流>, <对象>);`
```csharp
// 异步写入流，适合大对象
using var fs = File.Create("out.json");
await JsonSerializer.SerializeAsync(fs, users);
```

---

**基本写法：异步反序列化**
`await JsonSerializer.DeserializeAsync<<类型>>(<流>);`
```csharp
// 从流异步读取并反序列化
using var fs = File.OpenRead("in.json");
var data = await JsonSerializer.DeserializeAsync<List<User>>(fs);
```

---

## 序列化选项

**基本写法：缩进格式化**
`JsonSerializerOptions <变量> = new() { WriteIndented = true };`
```csharp
// 输出带缩进的可读 JSON
var opts = new JsonSerializerOptions { WriteIndented = true };
string json = JsonSerializer.Serialize(user, opts);
```

---

**基本写法：驼峰命名**
`<选项>.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;`
```csharp
// 属性名转为 camelCase
var opts = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
```

---

**基本写法：忽略 null 值**
`<选项>.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;`
```csharp
// 值为 null 的属性不输出
var opts = new JsonSerializerOptions
{
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
};
```

---

**基本写法：允许尾随逗号与注释**
`<选项>.ReadCommentHandling = JsonCommentHandling.Skip;`
```csharp
// 容忍注释与尾随逗号
var opts = new JsonSerializerOptions
{
    ReadCommentHandling = JsonCommentHandling.Skip,
    AllowTrailingCommas = true
};
```

---

**基本写法：大小写不敏感**
`<选项>.PropertyNameCaseInsensitive = true;`
```csharp
// 反序列化时属性名大小写不敏感
var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
```

---

## 属性控制

**基本写法：自定义属性名**
`[JsonPropertyName("<名称>")]`
```csharp
// 指定 JSON 中的属性名
public class User
{
    [JsonPropertyName("user_name")]
    public string Name { get; set; }
}
```

---

**基本写法：忽略属性**
`[JsonIgnore]`
```csharp
// 序列化时忽略该属性
public class User
{
    public string Name { get; set; }
    [JsonIgnore]
    public string Password { get; set; }
}
```

---

**基本写法：条件忽略**
`[JsonIgnore(Condition = <条件>)]`
```csharp
// 仅在值为 null 时忽略
[JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
public string? Nick { get; set; }
```

---

**基本写法：属性顺序**
`[JsonPropertyOrder(<序号>)]`
```csharp
// 控制属性输出顺序
public class User
{
    [JsonPropertyOrder(0)]
    public int Id { get; set; }
    [JsonPropertyOrder(1)]
    public string Name { get; set; }
}
```

---

## 集合与字典

**基本写法：序列化集合**
`JsonSerializer.Serialize(<集合>);`
```csharp
// 列表转 JSON 数组
string json = JsonSerializer.Serialize(new List<int> { 1, 2, 3 });
```

---

**基本写法：字典序列化**
`JsonSerializer.Serialize<<字典类型>>(<字典>);`
```csharp
// 字典转 JSON 对象
var dict = new Dictionary<string, int> { ["a"] = 1 };
string json = JsonSerializer.Serialize(dict);
```

---

**基本写法：非字符串键字典**
`JsonSerializerOptions <变量> = new() { DictionaryKeyPolicy = <策略> };`
```csharp
// 非字符串键需要键策略或自定义转换器
var opts = new JsonSerializerOptions { DictionaryKeyPolicy = JsonNamingPolicy.CamelCase };
```

---

## 自定义转换器

**基本写法：实现 JsonConverter**
`public class <类名> : JsonConverter<<类型>> { }`
```csharp
// 自定义类型转换器
public class DateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type t, JsonSerializerOptions o)
        => DateTime.Parse(reader.GetString()!);
    public override void Write(Utf8JsonWriter writer, DateTime v, JsonSerializerOptions o)
        => writer.WriteStringValue(v.ToString("yyyy-MM-dd"));
}
```

---

**基本写法：应用转换器**
`<选项>.Converters.Add(new <转换器>());`
```csharp
// 全局注册转换器
var opts = new JsonSerializerOptions();
opts.Converters.Add(new DateTimeConverter());
```

---

**基本写法：特性应用转换器**
`[JsonConverter(typeof(<转换器>))]`
```csharp
// 单属性应用转换器
public class Order
{
    [JsonConverter(typeof(DateTimeConverter))]
    public DateTime CreatedAt { get; set; }
}
```

---

## 多态序列化

**基本写法：声明派生类**
`[JsonDerivedType(typeof(<派生类>), "<鉴别名>")]`
```csharp
// 基类声明所有派生类型
[JsonDerivedType(typeof(Circle), "circle")]
[JsonDerivedType(typeof(Square), "square")]
public abstract class Shape { }
```

---

**基本写法：多态反序列化**
`JsonSerializer.Deserialize<<基类>>(<json>);`
```csharp
// JSON 含 $type 字段自动识别类型
Shape shape = JsonSerializer.Deserialize<Shape>(json);
```

---

## 流式读写 Utf8JsonReader/Writer

**基本写法：Utf8JsonWriter 写入**
`using var <写流> = new Utf8JsonWriter(<输出>);`
```csharp
// 手动生成 JSON，性能最高
using var writer = new Utf8JsonWriter(File.Create("out.json"));
writer.WriteStartObject();
writer.WriteString("name", "Alice");
writer.WriteNumber("age", 30);
writer.WriteEndObject();
```

---

**基本写法：Utf8JsonReader 读取**
`ref Utf8JsonReader <变量> = ...;`
```csharp
// 手动解析 JSON 字节，零分配
var reader = new Utf8JsonReader(jsonBytes);
while (reader.Read())
{
    if (reader.TokenType == JsonTokenType.PropertyName) { }
}
```

---

## 节点模型 JsonDocument/JsonNode

**基本写法：JsonDocument 只读解析**
`using var <文档> = JsonDocument.Parse(<json>);`
```csharp
// DOM 风格只读访问
using var doc = JsonDocument.Parse(json);
string name = doc.RootElement.GetProperty("name").GetString()!;
```

---

**基本写法：JsonNode 可读写 DOM**
`JsonNode <变量> = JsonNode.Parse(<json>);`
```csharp
// 可读写的 DOM
JsonNode node = JsonNode.Parse(json)!;
node["age"] = 31;
string json2 = node.ToJsonString();
```

---

**基本写法：创建 JsonObject**
`JsonObject <变量> = new() { ["<键>"] = <值> };`
```csharp
// 直接构造 JSON 对象
var obj = new JsonObject { ["name"] = "Alice", ["age"] = 30 };
string json = obj.ToJsonString();
```

---

## 源生成器

**基本写法：JsonSerializerContext 源生成**
`[JsonSerializable(typeof(<类型>))]`
```csharp
// 编译时生成序列化代码，AOT 友好
[JsonSourceGenerationOptions(WriteIndented = true)]
[JsonSerializable(typeof(User))]
public partial class MyContext : JsonSerializerContext { }
```

---

**基本写法：使用源生成上下文**
`JsonSerializer.Serialize(<对象>, <Context>.Default.<类型>);`
```csharp
// 使用生成的元数据序列化
string json = JsonSerializer.Serialize(user, MyContext.Default.User);
```

---

## 完整示例：对象与 JSON 的往返

以下程序可直接运行，演示序列化、选项控制与反序列化：

```csharp
using System.Text.Json;
using System.Text.Json.Serialization;

record User(int Id, string Name, string? Nick, string Password);

var user = new User(1, "张三", null, "secret");

var opts = new JsonSerializerOptions
{
    WriteIndented = true,
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
};

string json = JsonSerializer.Serialize(user, opts);
Console.WriteLine(json);

// 反序列化：属性名大小写默认敏感，来自前端时建议开启不敏感
var copy = JsonSerializer.Deserialize<User>(json,
    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
Console.WriteLine(copy!.Name);

// 输出：
// {
//   "id": 1,
//   "name": "张三",
//   "password": "secret"
// }
// 张三
// （nick 为 null 被忽略；record 支持构造函数反序列化）
```

## 常见陷阱

**属性名默认完全区分大小写**。`System.Text.Json` 默认严格匹配 `Name` 与 `name`（这点与 Newtonsoft.Json 不同）。对接 JavaScript 前端或第三方 API 时，要么配 `PropertyNamingPolicy = CamelCase` 序列化 + `PropertyNameCaseInsensitive = true` 反序列化，要么在属性上标注 `[JsonPropertyName("...")]`。

**复用同一个 `JsonSerializerOptions` 实例**。首次使用某组选项时，序列化器要为相关类型构建并缓存元数据，这一步开销不小。Web 应用中应把选项缓存为单例（ASP.NET Core 会自动缓存 `JsonOptions`）；每次 `new JsonSerializerOptions` 会让缓存失效，造成隐性性能损耗。

**循环引用会直接抛异常**。`Order.Customer.Address` 又指回 `Order` 这类对象图，默认配置下抛 `JsonException`（.NET 5+）而非死循环。双向导航属性序列化需要 `ReferenceHandler.Preserve`（输出 `$id`/`$ref`），更常见的解法是用 DTO 只序列化需要的单向数据。

**不可变类型与 record**。`record` 与只有 `get`、带构造函数的类型都能反序列化——序列化器按参数名匹配构造函数参数（可用 `[JsonConstructor]` 指定）。但带 `init` 且无构造函数匹配路径的极端自定义类型需要注意：`record` 是"开箱即用"的最安全选择。

**`DictionaryKeyPolicy` 只影响序列化**。它控制字典键的命名策略（输出时转 camelCase），反序列化时并不做反向转换；非字符串键（如 `Dictionary<int, T>`）会被转成字符串键，读回来需要自定义转换器。API 设计上应尽量使用字符串键字典。

**默认不支持多态序列化**。声明类型是基类时，派生类的额外属性不会输出；必须用 `[JsonDerivedType]` 在基类上显式声明派生类型（配合类型鉴别符 `$type` 或自定义鉴别符字段），反序列化才能还原出正确子类。这是与 Newtonsoft.Json 行为差异最大的点之一。

**源生成是 AOT/trimming 的硬要求**。`PublishAot` 或 `PublishTrimmed` 的应用不能依赖运行时反射，必须改用 `JsonSerializerContext` 源生成（见上文）并把上下文类型传给 `Serialize/Deserialize`。普通应用也建议在热路径使用源生成：更快、更省内存。

## 分层小结

- **记住**：`JsonSerializer.Serialize/Deserialize`；`WriteIndented` 与 `CamelCase` 两个高频选项；`[JsonPropertyName]` 改名、`[JsonIgnore]` 忽略。
- **理解**：选项实例应复用；大小写默认敏感；循环引用与多态需要显式声明；源生成与 AOT 的关系。
- **应用**：对外 API 统一封装一份全局 `JsonSerializerOptions`；模型层全面使用 `record` + 特性标注；高并发/AOT 场景切换到 `JsonSerializerContext`。Web 场景的整体接入见 [C# Web API](/csharp/300-CSharpAPI)。
