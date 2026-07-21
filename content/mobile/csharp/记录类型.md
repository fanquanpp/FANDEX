# C# 记录类型

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## record 定义

**基本写法：引用类型记录**
`public record <名称>(<参数列表>);`
```csharp
// 定义引用类型记录
public record Person(string Name, int Age);
```

---

**基本写法：值类型记录**
`public record struct <名称>(<参数列表>);`
```csharp
// 定义值类型记录
public record struct Point(double X, double Y);
```

---

**基本写法：不可变值类型记录**
`public readonly record struct <名称>(<参数列表>);`
```csharp
// 定义不可变值类型记录
public readonly record struct Money(decimal Amount, string Currency);
```

---

**单行写法：多参数记录定义**
`public record <名称>(<类型1> <参数1>, <类型2> <参数2>, <类型3> <参数3>);`
```csharp
// 单行定义包含多个参数的记录
public record User(string Name, int Age, string Email, string Phone);
```

---

**换行写法：多参数记录定义**
`public record <名称>(<类型1> <参数1>, <类型2> <参数2>, <类型3> <参数3>);`
```csharp
// 换行定义包含多个参数的记录
public record User(
    string Name,
    int Age,
    string Email,
    string Phone);
```

---

**基本写法：带主体的记录**
`public record <名称>(<参数列表>) { <成员> }`
```csharp
// 在记录中添加额外成员
public record Person(string Name, int Age)
{
    public bool IsAdult => Age >= 18;
}
```

---

## 值相等性

**基本写法：引用类型记录相等**
`bool <结果> = <记录1> == <记录2>;`
```csharp
// 引用类型记录基于值比较
var p1 = new Person("张三", 25);
var p2 = new Person("张三", 25);
Console.WriteLine(p1 == p2);
```

---

**基本写法：值类型记录相等**
`bool <结果> = <记录1> == <记录2>;`
```csharp
// 值类型记录基于值比较
var p1 = new Point(1.0, 2.0);
var p2 = new Point(1.0, 2.0);
Console.WriteLine(p1 == p2);
```

---

**基本写法：记录不等比较**
`bool <结果> = <记录1> != <记录2>;`
```csharp
// 记录不等比较
var p1 = new Person("张三", 25);
var p2 = new Person("李四", 30);
Console.WriteLine(p1 != p2);
```

---

**基本写法：Equals 方法**
`bool <结果> = <记录>.Equals(<其他记录>);`
```csharp
// 使用 Equals 方法比较
var p1 = new Person("张三", 25);
var p2 = new Person("张三", 25);
Console.WriteLine(p1.Equals(p2));
```

---

## with 表达式

**基本写法：with 修改单属性**
`var <变量> = <记录> with { <属性> = <值> };`
```csharp
// 非破坏性修改单个属性
var p1 = new Person("张三", 25);
var p2 = p1 with { Age = 26 };
```

---

**基本写法：with 修改多属性**
`var <变量> = <记录> with { <属性1> = <值1>, <属性2> = <值2> };`
```csharp
// 非破坏性修改多个属性
var p1 = new Person("张三", 25);
var p2 = p1 with { Name = "李四", Age = 26 };
```

---

**基本写法：with 嵌套修改**
`var <变量> = <记录> with { <属性> = <子记录> with { <子属性> = <值> } };`
```csharp
// 非破坏性修改嵌套记录
var order = new Order(new Customer("张三"), 100m);
var newOrder = order with { Customer = order.Customer with { Name = "李四" } };
```

---

## 记录继承

**基本写法：记录继承**
`public record <派生>(<参数>) : <基类>(<参数>);`
```csharp
// 记录类型支持继承
public record Student(string Name, int Age, string School) : Person(Name, Age);
```

---

**基本写法：多级记录继承**
`public record <派生>(<参数>) : <基类>(<参数>);`
```csharp
// 多级记录继承
public record GraduateStudent(string Name, int Age, string School, string Degree)
    : Student(Name, Age, School);
```

---

**基本写法：继承记录 with 表达式**
`var <变量> = <派生记录> with { <属性> = <值> };`
```csharp
// 派生记录使用 with 表达式
var student = new Student("张三", 20, "清华大学");
var olderStudent = student with { Age = 21 };
```

---

## 解构

**基本写法：记录解构**
`var (<变量1>, <变量2>) = <记录>;`
```csharp
// 解构记录的所有位置参数
var person = new Person("张三", 25);
var (name, age) = person;
```

---

**基本写法：部分解构**
`var (<变量1>, _) = <记录>;`
```csharp
// 仅解构需要的部分参数
var person = new Person("张三", 25);
var (name, _) = person;
```

---

**基本写法：解构带类型**
`(<类型1> <变量1>, <类型2> <变量2>) = <记录>;`
```csharp
// 解构时指定变量类型
var person = new Person("张三", 25);
(string name, int age) = person;
```

---

## 自定义成员

**基本写法：添加计算属性**
`public <类型> <属性名> => <表达式>;`
```csharp
// 在记录中添加计算属性
public record Circle(double Radius)
{
    public double Area => Math.PI * Radius * Radius;
}
```

---

**基本写法：添加方法**
`public <返回类型> <方法名>(<参数>) => <表达式>;`
```csharp
// 在记录中添加方法
public record Money(decimal Amount, string Currency)
{
    public Money ConvertTo(string newCurrency, decimal rate) =>
        new(Amount * rate, newCurrency);
}
```

---

**基本写法：添加验证**
`public <类型> <属性名> { get; init; }`
```csharp
// 在 init 访问器中添加验证
public record Person
{
    private string _name = string.Empty;
    public string Name
    {
        get => _name;
        init => _name = string.IsNullOrEmpty(value)
            ? throw new ArgumentException("Name 不能为空")
            : value;
    }
}
```

---

## ToString 与 PrintMembers

**基本写法：默认 ToString**
`string <结果> = <记录>.ToString();`
```csharp
// 记录默认生成可读的 ToString
var person = new Person("张三", 25);
Console.WriteLine(person.ToString());
```

---

**基本写法：重写 PrintMembers**
`protected virtual bool PrintMembers(StringBuilder builder)`
```csharp
// 自定义 ToString 输出的成员
public record Person(string Name, int Age)
{
    protected virtual bool PrintMembers(StringBuilder builder)
    {
        builder.Append($"姓名 = {Name}, 年龄 = {Age}");
        return true;
    }
}
```

---

## 记录与模式匹配

**基本写法：位置模式匹配**
`<变量> switch { <类型>(<模式1>, <模式2>) => <结果> }`
```csharp
// 记录位置模式匹配
public record Point(int X, int Y);
Point p = new(10, 20);
string label = p switch
{
    Point(0, 0) => "原点",
    Point(> 0, > 0) => "第一象限",
    _ => "其他"
};
```

---

**基本写法：属性模式匹配**
`<变量> switch { <类型> { <属性>: <值> } => <结果> }`
```csharp
// 记录属性模式匹配
var person = new Person("张三", 25);
string label = person switch
{
    { Age: > 18 } => "成年",
    { Age: <= 18 } => "未成年",
    _ => "未知"
};
```

---

## 记录与集合

**基本写法：记录列表**
`List<<记录类型>> <变量> = [ <记录>, ... ];`
```csharp
// 使用集合表达式初始化记录列表
List<Person> people = [
    new("张三", 25),
    new("李四", 30)
];
```

---

**基本写法：LINQ 查询记录**
`var <结果> = <记录集合>.Where(<谓词>);`
```csharp
// 使用 LINQ 查询记录集合
var adults = people.Where(p => p.Age >= 18);
```

---

**基本写法：记录分组**
`var <结果> = <记录集合>.GroupBy(<键选择器>);`
```csharp
// 按属性分组记录
var grouped = people.GroupBy(p => p.Age >= 18 ? "成年" : "未成年");
```

---

## 记录与 JSON 序列化

**基本写法：JsonSerializer 序列化**
`string <结果> = JsonSerializer.Serialize(<记录>);`
```csharp
// 序列化记录为 JSON 字符串
var person = new Person("张三", 25);
string json = JsonSerializer.Serialize(person);
```

---

**基本写法：JsonSerializer 反序列化**
`<记录类型> <变量> = JsonSerializer.Deserialize<<记录类型>>(<字符串>);`
```csharp
// 从 JSON 字符串反序列化为记录
string json = """{"Name":"张三","Age":25}""";
var person = JsonSerializer.Deserialize<Person>(json);
```

---

**基本写法：JsonSerializerOptions 配置**
`var <变量> = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };`
```csharp
// 配置 JSON 序列化选项
var options = new JsonSerializerOptions
{
    PropertyNameCaseInsensitive = true
};
var person = JsonSerializer.Deserialize<Person>(json, options);
```

---

## Primary Constructor 与记录

**基本写法：主构造函数捕获**
`public record <名称>(<参数>) { public <类型> <属性> => <参数>; }`
```csharp
// 主构造函数参数在记录主体中使用
public record Service(string ConnectionString)
{
    public bool IsValid => !string.IsNullOrEmpty(ConnectionString);
}
```

---

**基本写法：主构造函数与成员**
`public record <名称>(<参数>) { public void <方法>() { ... } }`
```csharp
// 主构造函数参数在方法中使用
public record DatabaseService(string ConnectionString)
{
    public void Connect()
    {
        Console.WriteLine($"连接到: {ConnectionString}");
    }
}
```
