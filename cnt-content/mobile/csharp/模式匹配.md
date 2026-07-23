# C# 模式匹配

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 类型模式

**基本写法：is 类型检查**
`if (<变量> is <类型>)`
```csharp
// 检查对象是否为指定类型
object obj = "Hello";
if (obj is string)
{
    Console.WriteLine("是字符串");
}
```

---

**基本写法：is 类型声明**
`if (<变量> is <类型> <变量名>)`
```csharp
// 类型检查并赋值给新变量
object obj = "Hello";
if (obj is string s)
{
    Console.WriteLine($"长度: {s.Length}");
}
```

---

**基本写法：switch 类型分支**
`switch (<变量>) { case <类型> <变量名>: <语句>; break; }`
```csharp
// switch 语句中的类型模式
object obj = 42;
switch (obj)
{
    case int i:
        Console.WriteLine($"整数: {i}");
        break;
    case string s:
        Console.WriteLine($"字符串: {s}");
        break;
}
```

---

**基本写法：switch 表达式类型分支**
`<变量> switch { <类型> <变量名> => <结果>, _ => <默认> }`
```csharp
// switch 表达式中的类型模式
object obj = 42;
string label = obj switch
{
    int i => $"整数 {i}",
    string s => $"字符串 {s}",
    _ => "未知类型"
};
```

---

## 常量模式

**基本写法：null 检查**
`if (<变量> is null)`
```csharp
// 检查变量是否为 null
string? name = null;
if (name is null)
{
    Console.WriteLine("未设置");
}
```

---

**基本写法：not null 检查**
`if (<变量> is not null)`
```csharp
// 检查变量是否非 null
string? name = "张三";
if (name is not null)
{
    Console.WriteLine(name);
}
```

---

**基本写法：常量值匹配**
`<变量> switch { <常量> => <结果>, _ => <默认> }`
```csharp
// 匹配常量值
int statusCode = 404;
string label = statusCode switch
{
    200 => "OK",
    404 => "Not Found",
    500 => "Server Error",
    _ => "Unknown"
};
```

---

## 关系模式

**基本写法：大于关系**
`<变量> switch { > <值> => <结果> }`
```csharp
// 匹配大于指定值
int score = 85;
string grade = score switch
{
    > 90 => "A",
    > 80 => "B",
    > 70 => "C",
    _ => "F"
};
```

---

**基本写法：小于关系**
`<变量> switch { < <值> => <结果> }`
```csharp
// 匹配小于指定值
int temperature = -5;
string label = temperature switch
{
    < 0 => "冰冻",
    < 20 => "寒冷",
    _ => "温暖"
};
```

---

**基本写法：范围匹配**
`<变量> switch { >= <最小> and <= <最大> => <结果> }`
```csharp
// 匹配指定范围
int age = 25;
string category = age switch
{
    >= 0 and < 18 => "未成年",
    >= 18 and < 60 => "成年",
    >= 60 => "老年",
    _ => "无效"
};
```

---

## 逻辑模式

**基本写法：and 组合模式**
`<模式1> and <模式2>`
```csharp
// 同时满足两个模式
object value = 42;
if (value is int and > 0)
{
    Console.WriteLine("正整数");
}
```

---

**基本写法：or 选择模式**
`<模式1> or <模式2>`
```csharp
// 满足任一模式
DayOfWeek day = DayOfWeek.Saturday;
if (day is DayOfWeek.Saturday or DayOfWeek.Sunday)
{
    Console.WriteLine("周末");
}
```

---

**基本写法：not 否定模式**
`not <模式>`
```csharp
// 不满足指定模式
object value = "Hello";
if (value is not null)
{
    Console.WriteLine("非 null");
}
```

---

**基本写法：复杂逻辑组合**
`<模式1> and (<模式2> or <模式3>)`
```csharp
// 复杂逻辑组合
int score = 85;
if (score is > 60 and (< 80 or > 90))
{
    Console.WriteLine("特殊分数段");
}
```

---

## 属性模式

**基本写法：单属性匹配**
`<变量> switch { { <属性>: <值> } => <结果> }`
```csharp
// 匹配对象单个属性值
var user = new User("张三", 25);
string label = user switch
{
    { Age: 25 } => "25岁用户",
    _ => "其他"
};
```

---

**基本写法：多属性匹配**
`<变量> switch { { <属性1>: <值1>, <属性2>: <值2> } => <结果> }`
```csharp
// 匹配对象多个属性值
var user = new User("张三", 25);
string label = user switch
{
    { Name: "张三", Age: 25 } => "匹配张三",
    _ => "不匹配"
};
```

---

**基本写法：嵌套属性匹配**
`<变量> switch { { <属性>.<子属性>: <值> } => <结果> }`
```csharp
// 匹配嵌套对象的属性
var order = new Order(new Customer("VIP"), 1500m);
string discount = order switch
{
    { Customer.Level: "VIP" } => "8折",
    _ => "无折扣"
};
```

---

**基本写法：属性带关系匹配**
`<变量> switch { { <属性>: > <值> } => <结果> }`
```csharp
// 属性值与关系运算符组合
var order = new Order(1500m);
string label = order switch
{
    { Amount: > 1000m } => "大额订单",
    { Amount: > 100m } => "中额订单",
    _ => "小额订单"
};
```

---

## 位置模式

**基本写法：元组位置匹配**
`(<变量1>, <变量2>) switch { (<值1>, <值2>) => <结果> }`
```csharp
// 匹配元组的值
var point = (10, 20);
string quadrant = point switch
{
    (0, 0) => "原点",
    (> 0, > 0) => "第一象限",
    (< 0, > 0) => "第二象限",
    _ => "其他象限"
};
```

---

**基本写法：记录位置匹配**
`<变量> switch { <类型>(<值1>, <值2>) => <结果> }`
```csharp
// 匹配记录的位置参数
public record Point(int X, int Y);
Point p = new(10, 20);
string label = p switch
{
    Point(0, 0) => "原点",
    Point(_, 0) => "X 轴",
    Point(0, _) => "Y 轴",
    _ => "其他"
};
```

---

**基本写法：位置模式带类型**
`<变量> switch { <类型>(<模式1>, <模式2>) => <结果> }`
```csharp
// 位置模式与类型组合
public record Point(int X, int Y);
Point p = new(10, 20);
string label = p switch
{
    Point(> 0, > 0) => "第一象限",
    Point(< 0, > 0) => "第二象限",
    _ => "其他"
};
```

---

## 列表模式

**基本写法：空列表匹配**
`<数组> switch { [] => <结果> }`
```csharp
// 匹配空列表
int[] numbers = [];
string label = numbers switch
{
    [] => "空列表",
    _ => "非空列表"
};
```

---

**基本写法：单元素列表匹配**
`<数组> switch { [<元素>] => <结果> }`
```csharp
// 匹配仅含单个元素的列表
int[] numbers = [42];
string label = numbers switch
{
    [single] => $"单元素: {single}",
    _ => "其他"
};
```

---

**基本写法：双元素列表匹配**
`<数组> switch { [<元素1>, <元素2>] => <结果> }`
```csharp
// 匹配包含两个元素的列表
int[] numbers = [1, 2];
string label = numbers switch
{
    [first, second] => $"两元素: {first}, {second}",
    _ => "其他"
};
```

---

**基本写法：首尾元素匹配**
`<数组> switch { [first, .., last] => <结果> }`
```csharp
// 匹配列表的首尾元素
int[] numbers = [1, 2, 3, 4, 5];
string label = numbers switch
{
    [first, .., last] => $"首: {first}, 尾: {last}",
    _ => "其他"
};
```

---

**基本写法：特定值列表匹配**
`<数组> switch { [1, 2, ..] => <结果> }`
```csharp
// 匹配以特定值开头的列表
int[] numbers = [1, 2, 3, 4];
string label = numbers switch
{
    [1, 2, ..] => "以 1, 2 开头",
    _ => "其他"
};
```

---

**基本写法：列表模式带条件**
`<数组> switch { [var x, ..] when <条件> => <结果> }`
```csharp
// 列表模式与 when 守卫组合
int[] numbers = [10, 20, 30];
string label = numbers switch
{
    [var first, ..] when first > 5 => "首元素大于 5",
    _ => "其他"
};
```

---

## when 守卫

**基本写法：when 条件守卫**
`case <模式> when <条件>:`
```csharp
// switch 语句中的 when 守卫
int score = 85;
switch (score)
{
    case int s when s >= 90:
        Console.WriteLine("优秀");
        break;
    case int s when s >= 80:
        Console.WriteLine("良好");
        break;
}
```

---

**基本写法：switch 表达式 when 守卫**
`<模式> when <条件> => <结果>`
```csharp
// switch 表达式中的 when 守卫
var user = new User("张三", 25);
string label = user switch
{
    { Age: var age } when age < 18 => "未成年",
    { Age: var age } when age >= 18 => "成年",
    _ => "未知"
};
```

---

## 模式组合

**基本写法：类型与属性组合**
`<类型> { <属性>: <值> }`
```csharp
// 类型模式与属性模式组合
object obj = new User("张三", 25);
string label = obj switch
{
    User { Age: > 18 } u => $"成年用户: {u.Name}",
    User u => $"未成年用户: {u.Name}",
    _ => "非用户"
};
```

---

**基本写法：类型与位置组合**
`<类型>(<模式1>, <模式2>)`
```csharp
// 类型模式与位置模式组合
public record Point(int X, int Y);
object obj = new Point(10, 20);
string label = obj switch
{
    Point(0, 0) => "原点",
    Point(_, _) => "非原点",
    _ => "非点"
};
```

---

**基本写法：复杂模式组合**
`<类型> { <属性>: <模式> } when <条件>`
```csharp
// 多种模式组合使用
public record Order(decimal Amount, string Status);
var order = new Order(1500m, "VIP");
string label = order switch
{
    Order { Amount: > 1000m, Status: "VIP" } when order.Amount < 2000m => "中额 VIP",
    _ => "其他"
};
```

---

## 解构模式

**基本写法：Deconstruct 解构**
`var (<变量1>, <变量2>) = <对象>;`
```csharp
// 使用 Deconstruct 方法解构对象
public record Point(int X, int Y);
Point p = new(10, 20);
var (x, y) = p;
Console.WriteLine($"X: {x}, Y: {y}");
```

---

**基本写法：自定义 Deconstruct**
`public void Deconstruct(out <类型1> <变量1>, out <类型2> <变量2>)`
```csharp
// 为类型添加解构方法
public class Rectangle
{
    public double Width { get; init; }
    public double Height { get; init; }
    public void Deconstruct(out double width, out double height)
    {
        width = Width;
        height = Height;
    }
}
```

---

**基本写法：解构与模式匹配**
`if (<对象> is (<模式1>, <模式2>))`
```csharp
// 解构后进行模式匹配
var rect = new Rectangle { Width = 10, Height = 20 };
if (rect is ( > 5, > 5))
{
    Console.WriteLine("宽高都大于 5");
}
```
