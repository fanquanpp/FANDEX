# C# 基础语法

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 变量声明

**基本写法：整数变量声明**
`int <变量名> = <整数值>;`
```csharp
// 声明整数类型变量
int age = 25;
```

---

**基本写法：字符串变量声明**
`string <变量名> = "<文本>";`
```csharp
// 声明字符串类型变量
string name = "张三";
```

---

**基本写法：浮点变量声明**
`double <变量名> = <浮点值>;`
```csharp
// 声明双精度浮点变量
double price = 99.99;
```

---

**基本写法：布尔变量声明**
`bool <变量名> = <true | false>;`
```csharp
// 声明布尔类型变量
bool isActive = true;
```

---

**基本写法：var 整数推断**
`var <变量名> = <整数值>;`
```csharp
// 编译期推断为 int
var count = 42;
```

---

**基本写法：var 字符串推断**
`var <变量名> = "<文本>";`
```csharp
// 编译期推断为 string
var message = "Hello";
```

---

**基本写法：var 数组推断**
`var <变量名> = new[] { <元素>, ... };`
```csharp
// 编译期推断为 int[]
var numbers = new[] { 1, 2, 3 };
```

---

**基本写法：var 泛型推断**
`var <变量名> = new Dictionary<<键类型>, <值类型>>();`
```csharp
// 编译期推断为 Dictionary<string, int>
var dict = new Dictionary<string, int>();
```

---

**基本写法：常量声明**
`const <类型> <常量名> = <值>;`
```csharp
// 声明编译期常量
const double Pi = 3.14159265358979;
```

---

**基本写法：字符串常量声明**
`const string <常量名> = "<文本>";`
```csharp
// 声明字符串常量
const string AppName = "FANDEX";
```

---

**基本写法：required 属性声明**
`public required <类型> <属性名> { get; init; }`
```csharp
// 声明必填的初始化属性
public required string Name { get; init; }
```

---

**单行写法：required 多属性类定义**
`public class <类名> { public required <类型1> <属性1> { get; init; } public required <类型2> <属性2> { get; init; } }`
```csharp
// 单行定义包含多个 required 属性的类
public class Person { public required string Name { get; init; } public required int Age { get; init; } }
```

---

**换行写法：required 多属性类定义**
`public class <类名> { public required <类型1> <属性1> { get; init; } public required <类型2> <属性2> { get; init; } }`
```csharp
// 换行定义包含多个 required 属性的类
public class Person
{
    public required string Name { get; init; }
    public required int Age { get; init; }
}
```

---

**基本写法：required 对象初始化**
`var <变量> = new <类名> { <属性1> = <值1>, <属性2> = <值2> };`
```csharp
// 初始化时必须为 required 属性赋值
var person = new Person { Name = "李四", Age = 30 };
```

---

## 类型转换

**基本写法：隐式转换 int 到 long**
`long <变量> = <int变量>;`
```csharp
// int 自动转换为 long
int num = 100;
long bigNum = num;
```

---

**基本写法：隐式转换 int 到 double**
`double <变量> = <int变量>;`
```csharp
// int 自动转换为 double
int num = 100;
double d = num;
```

---

**基本写法：显式转换 double 到 int**
`int <变量> = (int)<double变量>;`
```csharp
// 强制转换并截断小数部分
double pi = 3.14159;
int intPi = (int)pi;
```

---

**基本写法：Convert 字符串转整数**
`int <变量> = Convert.ToInt32(<字符串>);`
```csharp
// 使用 Convert 类将字符串转换为整数
string str = "123";
int parsed = Convert.ToInt32(str);
```

---

**基本写法：Convert 字符串转浮点**
`double <变量> = Convert.ToDouble(<字符串>);`
```csharp
// 使用 Convert 类将字符串转换为双精度浮点
double dbl = Convert.ToDouble("3.14");
```

---

**基本写法：Parse 字符串解析**
`int <变量> = int.Parse(<字符串>);`
```csharp
// 解析失败时抛出异常
int number = int.Parse("456");
```

---

**基本写法：TryParse 安全解析**
`bool <结果> = int.TryParse(<字符串>, out <输出变量>);`
```csharp
// 安全解析，返回是否成功
if (int.TryParse("789", out int result))
{
    Console.WriteLine($"解析成功: {result}");
}
```

---

**基本写法：is 类型检查并转换**
`if (<变量> is <类型> <变量名>)`
```csharp
// is 模式匹配进行类型转换
object obj = "Hello";
if (obj is string s)
{
    Console.WriteLine(s.Length);
}
```

---

**基本写法：as 引用类型转换**
`<接口>? <变量> = <对象> as <接口>;`
```csharp
// as 转换失败时返回 null
IAnimal? animal = dog as IAnimal;
```

---

## 字符串操作

**基本写法：字符串插值**
`$"文本 {<表达式>}"`
```csharp
// 基本字符串插值
var name = "世界";
Console.WriteLine($"你好, {name}!");
```

---

**基本写法：表达式插值**
`$"文本 {<表达式>}"`
```csharp
// 在插值中使用表达式
Console.WriteLine($"2 + 3 = {2 + 3}");
```

---

**基本写法：方法调用插值**
`$"文本 {<方法调用>}"`
```csharp
// 在插值中调用方法
var name = "world";
Console.WriteLine($"大写: {name.ToUpper()}");
```

---

**基本写法：格式化插值**
`$"文本 {<表达式>:<格式>}"`
```csharp
// 在插值中使用格式化
Console.WriteLine($"时间: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
```

---

**基本写法：原始字符串字面量**
`"""<内容>"""`
```csharp
// 三引号保留原始格式
var json = """
    {
        "name": "张三",
        "age": 25
    }
    """;
```

---

**基本写法：插值原始字符串**
`$"""<内容 {<表达式>}>"""`
```csharp
// 在原始字符串中嵌入表达式
var id = 1001;
var query = $"""
    SELECT * FROM Users
    WHERE Id = {id}
    """;
```

---

**基本写法：Contains 子串检查**
`bool <结果> = <字符串>.Contains(<子串>);`
```csharp
// 检查字符串是否包含子串
string str = "Hello, C# World!";
bool contains = str.Contains("C#");
```

---

**基本写法：IndexOf 子串定位**
`int <结果> = <字符串>.IndexOf(<子串>);`
```csharp
// 获取子串首次出现的位置
string str = "Hello, C# World!";
int index = str.IndexOf("World");
```

---

**基本写法：StartsWith 前缀检查**
`bool <结果> = <字符串>.StartsWith(<前缀>);`
```csharp
// 检查字符串是否以指定前缀开头
string str = "Hello, C# World!";
bool startsWith = str.StartsWith("Hello");
```

---

**基本写法：Substring 截取子串**
`string <结果> = <字符串>.Substring(<起始>, <长度>);`
```csharp
// 从指定位置截取指定长度的子串
string str = "Hello, C# World!";
string sub = str.Substring(7, 2);
```

---

**基本写法：Split 分割字符串**
`string[] <结果> = <字符串>.Split(<分隔符>);`
```csharp
// 按分隔符拆分字符串为数组
string str = "Hello, C# World!";
string[] parts = str.Split(' ');
```

---

**基本写法：ToUpper 转大写**
`string <结果> = <字符串>.ToUpper();`
```csharp
// 将字符串转换为大写
string str = "Hello, C# World!";
string upper = str.ToUpper();
```

---

**基本写法：Trim 去空白**
`string <结果> = <字符串>.Trim();`
```csharp
// 去除字符串首尾空白
string trimmed = "  hello  ".Trim();
```

---

**基本写法：Replace 替换子串**
`string <结果> = <字符串>.Replace(<旧值>, <新值>);`
```csharp
// 替换字符串中的指定子串
string str = "Hello, C# World!";
string replaced = str.Replace("C#", "F#");
```

---

**单行写法：StringBuilder 链式构建**
`var <变量> = new StringBuilder().AppendLine(<内容>).AppendFormat(<格式>, <参数>);`
```csharp
// 单行链式调用构建字符串
var sb = new StringBuilder().AppendLine("第一行").AppendFormat("数字: {0:N2}", 1234.5678);
string result = sb.ToString();
```

---

**换行写法：StringBuilder 链式构建**
`var <变量> = new StringBuilder(); <变量>.AppendLine(<内容>); <变量>.AppendFormat(<格式>, <参数>);`
```csharp
// 换行链式调用构建字符串
var sb = new StringBuilder();
sb.AppendLine("第一行");
sb.AppendLine("第二行");
sb.AppendFormat("数字: {0:N2}", 1234.5678);
string result = sb.ToString();
```

---

## Nullable 引用类型

**基本写法：启用可空引用类型**
`#nullable enable`
```csharp
// 启用可空引用类型警告
#nullable enable
string name = "张三";
```

---

**基本写法：可空引用类型变量**
`<类型>? <变量名>`
```csharp
// 标记引用类型允许为 null
string? nickname = null;
```

---

**基本写法：空条件运算符访问属性**
`<变量>?.<属性>`
```csharp
// 当变量为 null 时返回 null
string? nickname = null;
int? length = nickname?.Length;
```

---

**基本写法：空条件运算符调用方法**
`<变量>?.<方法>()`
```csharp
// 当变量为 null 时返回 null
string? nickname = null;
string? upper = nickname?.ToUpper();
```

---

**基本写法：空合并运算符**
`<变量> ?? <默认值>`
```csharp
// 当变量为 null 时提供默认值
string? nickname = null;
string display = nickname ?? "匿名";
```

---

**基本写法：空合并赋值运算符**
`<变量> ??= <默认值>`
```csharp
// 当变量为 null 时赋值并返回
string? nickname = null;
string display2 = nickname ??= "匿名";
```

---

**基本写法：强制非空运算符**
`<变量>!`
```csharp
// 抑制 null 警告，慎用
string? nickname = null;
string forced = nickname!;
```

---

**基本写法：值类型可空声明**
`<值类型>? <变量名>`
```csharp
// 使值类型可以接受 null
int? age = null;
```

---

**基本写法：HasValue 检查**
`bool <结果> = <可空变量>.HasValue;`
```csharp
// 检查可空值类型是否有值
int? age = null;
bool hasValue = age.HasValue;
```

---

**基本写法：GetValueOrDefault 带默认值**
`int <结果> = <可空变量>.GetValueOrDefault(<默认值>);`
```csharp
// 获取值或指定默认值
int? age = null;
int value2 = age.GetValueOrDefault(18);
```

---

## 控制流

**基本写法：if-else 多分支**
`if (<条件>) <语句> else if (<条件>) <语句> else <语句>`
```csharp
// 多分支条件判断
int score = 85;
if (score >= 90)
    Console.WriteLine("优秀");
else if (score >= 80)
    Console.WriteLine("良好");
else
    Console.WriteLine("及格");
```

---

**基本写法：switch 语句**
`switch (<变量>) { case <值>: <语句>; break; default: <语句>; break; }`
```csharp
// 枚举多分支选择
var day = DayOfWeek.Monday;
switch (day)
{
    case DayOfWeek.Saturday:
    case DayOfWeek.Sunday:
        Console.WriteLine("周末");
        break;
    default:
        Console.WriteLine("工作日");
        break;
}
```

---

**基本写法：switch 表达式**
`<变量> switch { <模式> => <结果>, _ => <默认> }`
```csharp
// 基于值的表达式分支
var day = DayOfWeek.Monday;
string label = day switch
{
    DayOfWeek.Saturday or DayOfWeek.Sunday => "周末",
    _ => "工作日"
};
```

---

**基本写法：switch 类型模式**
`<变量> switch { <类型> => <结果>, _ => <默认> }`
```csharp
// 基于类型的表达式分支
object obj = 42;
string typeName = obj switch
{
    int => "整数",
    string => "字符串",
    _ => "其他"
};
```

---

**基本写法：for 循环**
`for (<初始化>; <条件>; <更新>) <循环体>`
```csharp
// 计数迭代循环
for (int i = 0; i < 10; i++)
{
    Console.WriteLine(i);
}
```

---

**基本写法：foreach 循环**
`foreach (<类型> <变量> in <集合>) <循环体>`
```csharp
// 遍历可枚举集合
var fruits = new[] { "苹果", "香蕉", "橙子" };
foreach (var fruit in fruits)
{
    Console.WriteLine(fruit);
}
```

---

**基本写法：while 循环**
`while (<条件>) <循环体>`
```csharp
// 前置条件循环
int n = 10;
while (n > 0)
{
    Console.WriteLine(n--);
}
```

---

**基本写法：do-while 循环**
`do <循环体> while (<条件>);`
```csharp
// 至少执行一次的后置条件循环
string? input;
do
{
    Console.Write("请输入 (q 退出): ");
    input = Console.ReadLine();
} while (input != "q");
```

---

**基本写法：末尾索引**
`<数组>[^<索引>]`
```csharp
// 从末尾访问数组元素
var numbers = new[] { 10, 20, 30, 40, 50 };
int last = numbers[^1];
```

---

**基本写法：范围切片**
`<数组>[<开始>..<结束>]`
```csharp
// 获取数组的指定范围切片
var numbers = new[] { 10, 20, 30, 40, 50 };
var slice = numbers[1..4];
```

---

**基本写法：起始范围切片**
`<数组>[..<结束>]`
```csharp
// 从开头到指定位置的切片
var numbers = new[] { 10, 20, 30, 40, 50 };
var firstThree = numbers[..3];
```

---

## 模式匹配

**基本写法：is 类型与条件组合**
`if (<变量> is <类型> <变量名> and <条件>)`
```csharp
// 组合条件匹配
object value = 42;
if (value is int num and > 0 and < 100)
{
    Console.WriteLine($"0-100 之间的整数: {num}");
}
```

---

**基本写法：属性模式**
`<变量> switch { { <属性>: <值> } => <结果> }`
```csharp
// 基于对象属性值分支
public record Order(decimal Amount, string Status);
string GetDiscount(Order order) => order switch
{
    { Status: "VIP", Amount: > 1000m } => "8折",
    { Status: "VIP" } => "9折",
    _ => "无折扣"
};
```

---

**基本写法：列表模式空列表**
`<数组> switch { [] => <结果> }`
```csharp
// 匹配空列表
int[] numbers = [1, 2, 3];
string label = numbers switch
{
    [] => "空列表",
    _ => "非空列表"
};
```

---

**基本写法：列表模式单元素**
`<数组> switch { [single] => <结果> }`
```csharp
// 匹配仅含单个元素的列表
int[] numbers = [1];
string label = numbers switch
{
    [single] => $"单个元素: {single}",
    _ => "其他"
};
```

---

**基本写法：列表模式首尾匹配**
`<数组> switch { [first, .., last] => <结果> }`
```csharp
// 匹配列表的首尾元素
int[] numbers = [1, 2, 3];
string label = numbers switch
{
    [first, .., last] => $"首: {first}, 尾: {last}",
    _ => "其他"
};
```

---

**基本写法：when 守卫**
`<模式> when <条件>`
```csharp
// 为模式添加额外条件
string Classify(int[] arr) => arr switch
{
    [var a, .., var b] when a == b => "首尾相同",
    _ => "其他"
};
```

---

## 顶级语句与全局 Using

**基本写法：全局 using**
`global using <命名空间>;`
```csharp
// 全项目共享的命名空间引用
global using System;
```

---

**单行写法：全局 using 多命名空间**
`global using <命名空间1>; global using <命名空间2>;`
```csharp
// 单行声明多个全局 using
global using System; global using System.Linq;
```

---

**换行写法：全局 using 多命名空间**
`global using <命名空间1>; global using <命名空间2>;`
```csharp
// 换行声明多个全局 using
global using System;
global using System.Collections.Generic;
global using System.Linq;
global using System.Threading.Tasks;
global using System.IO;
```

---

**基本写法：文件范围命名空间**
`namespace <命名空间>;`
```csharp
// 单文件命名空间声明
namespace MyApp.Services;

public class UserService
{
    // 整个文件都在该命名空间下
}
```

---

**基本写法：顶级语句**
`<语句>;`
```csharp
// 无需 Main 方法的程序入口
var data = await FetchDataAsync();
Console.WriteLine($"获取到 {data.Length} 条记录");
```

---

## 运算符速查

**基本写法：空合并赋值**
`<变量> ??= <值>`
```csharp
// 当变量为 null 时赋值
string? name = null;
name ??= "赋值";
```

---

**基本写法：with 表达式**
`<记录> with { <属性> = <值> }`
```csharp
// 修改 record 创建副本
var original = new Point(1, 2);
var modified = original with { X = 10 };
```

---

**基本写法：集合表达式声明**
`List<<类型>> <变量> = [<元素>, ...];`
```csharp
// 使用集合表达式初始化列表
List<int> list = [1, 2, 3];
```

---

**基本写法：集合表达式展开合并**
`<类型>[] <变量> = [..<集合>, <元素>, ...];`
```csharp
// 使用展开运算符合并集合
List<int> list = [1, 2, 3];
int[] arr = [..list, 4, 5];
```
