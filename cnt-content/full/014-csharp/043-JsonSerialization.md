---
order: 430
title: C# JSON 序列化
module: 'csharp'
category: 后端技术
difficulty: beginner
description: C# JSON 序列化 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
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
