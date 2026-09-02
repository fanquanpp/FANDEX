---
order: 30
title: C# 基础语法
module: 'csharp'
category: 后端技术
difficulty: beginner
description: 变量与类型、值类型与引用类型、字符串插值、模式匹配、控制流、nullable 引用类型、顶级语句
author: fanquanpp
updated: '2026-07-21'
related:
  - 'csharp/002-CSharpOverviewEnvSetup'
  - 'csharp/004-CSharpOOP'
  - 'csharp/006-CGenericCollection'
prerequisites: []
---


# C# 基础语法

## 前置知识

- [C# 概述与环境配置](/csharp/002-CSharpOverviewEnvSetup)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 历史动机与演化」的核心机制、典型用法与常见陷阱
- 掌握「2. 形式化定义」的核心机制、典型用法与常见陷阱
- 掌握「3. 理论推导与证明」的核心机制、典型用法与常见陷阱
- 掌握「4. 代码示例」的核心机制、典型用法与常见陷阱
- 掌握「5. 对比分析」的核心机制、典型用法与常见陷阱


> 本篇是 FANDEX C# 系列的第二篇。我们将系统讲解 C# 的基础语法：类型系统、变量、运算符、控制流、字符串、模式匹配、可空性、顶级语句。内容对标 Stanford CS106A/B、MIT 6.0001、CMU 15-112 课程教学严谨度，支持 0 基础自学，同时覆盖企业级实战要点。

---

## 1. 历史动机与演化

### 1.1 C# 1.0（2002）：基础语法奠基

C# 1.0 的语法设计继承了 C/C++ 的外观，但去除了 C++ 中易错的特性（如多重继承、模板、指针运算），同时融合了 Java 的 GC 与平台中立。

核心特性：

- 类型系统：值类型（`struct`/`enum`）与引用类型（`class`/`string`/`object`/`interface`/`delegate`/`array`）。
- 装箱/拆箱：值类型与 `object` 互转。
- 数组：一维、多维、锯齿。
- 控制流：`if`、`switch`、`for`、`foreach`、`while`、`do-while`、`try-catch-finally`。
- 运算符：算术、关系、逻辑、位、自增自减、三元、`is`/`as`/`typeof`/`sizeof`。
- 属性（Property）与索引器（Indexer）。

### 1.2 C# 2.0（2005）：可空与泛型

- 引入 `Nullable<T>` 与 `T?` 语法糖：`int? x = null;`。
- `??`（null 合并运算符）。
- 泛型让 `List<T>` 等集合类型安全。

### 1.3 C# 3.0（2007）：LINQ 与 Lambda

- `var` 隐式类型。
- Lambda 表达式 `x => x * 2`。
- 扩展方法。
- 对象/集合初始化器。
- 匿名类型。
- 表达式树（让 Lambda 作为数据）。

### 1.4 C# 4.0（2010）：dynamic 与命名参数

- `dynamic` 类型，与 IronPython、Office COM 互操作。
- 命名参数与可选参数。
- 泛型协变/逆变：`IEnumerable<out T>`。

### 1.5 C# 5.0（2012）：async/await

异步编程语法化，详见《异步编程详解》。

### 1.6 C# 6.0（2015）：语法糖大爆发

- 字符串插值 `$"{name}"`，替代 `string.Format`。
- `?.`（null 条件运算符）。
- `nameof(x)`。
- 表达式主体成员 `=>`。
- 异常过滤器 `catch (E e) when (...)`。

### 1.7 C# 7.0 ~ 7.3（2017）：模式匹配与元组

- `is` 模式：`if (o is int i)`。
- `switch` 中的模式匹配：`case int i when i > 0`。
- 元组与解构：`(int X, int Y) t = (1, 2);`。
- `out var` 声明。
- `ref` 返回与 `ref local`。
- 数字分隔符 `1_000_000`、二进制字面量 `0b1010`。
- `readonly struct`、`ref struct`、`in` 参数。

### 1.8 C# 8.0（2019）：NRT 与异步流

- 可空引用类型（NRT）：`string?` 与编译期 null 流分析。
- `switch` 表达式：`var result = e switch { ... };`。
- `using` 声明（无大括号）：`using var stream = ...;`。
- 异步流 `IAsyncEnumerable<T>` 与 `await foreach`。
- 索引与范围：`arr[^1]`、`arr[1..3]`。
- Null 合并赋值 `??=`。

### 1.9 C# 9.0（2020）：record 与顶级语句

- `record` 类型：基于值的相等。
- 顶级语句：`Program.cs` 无需 `Main`。
- `init` 访问器：对象初始化器阶段可写、之后只读。
- 模式匹配增强：`and`、`or`、`not`。
- 目标类型 `new()`：`Person p = new();`。
- `not` 模式：`if (o is not null)`。
- 协变返回类型。
- 模块初始化器 `[ModuleInitializer]`。

### 1.10 C# 10.0（2021）：global using 与文件命名空间

- `global using System.Linq;`：项目级全局 using。
- 文件范围命名空间 `namespace MyApp;`：避免大括号嵌套。
- `record struct`：值类型 record。
- `const` 字符串插值。
- 结构无参构造。
- `CallerArgumentExpression` 特性。

### 1.11 C# 11.0（2022）：原始字符串与 required

- 原始字符串字面量 `"""..."""`。
- 列表模式 `[1, 2, ..]`。
- `required` 修饰符：强制对象初始化器设置。
- UTF-8 字符串字面量 `"hello"u8`。
- `file` 作用域类型。
- 泛型数学（generic math）。

### 1.12 C# 12.0（2023）：主构造与集合表达式

- 主构造函数：`class Person(string name)`。
- 集合表达式：`int[] a = [1, 2, 3];`、`List<int> list = [1, 2, 3];`。
- `ref readonly` 参数。
- 默认 lambda 参数：`(int x = 1) => x + 1`。
- 别名任意类型：`using Point = (int X, int Y);`。

### 1.13 C# 13.0（2024）：params 集合与 lock 类型

- `params` 集合增强：`params ReadOnlySpan<int> vals`。
- 新 `lock` 语句：基于 `System.Threading.Lock`，性能更好。
- `field` 上下文关键字：访问自动 backing field。
- `partial` 属性。
- `params` 与 `ReadOnlySpan<T>` 集成。

---

## 2. 形式化定义

### 2.1 类型系统形式化

设 $\mathcal{T} = \mathcal{T}_{\text{val}} \cup \mathcal{T}_{\text{ref}}$ 为类型集合，划分为值类型 $\mathcal{T}_{\text{val}}$ 与引用类型 $\mathcal{T}_{\text{ref}}$。

#### 2.1.1 内存分配规则

$$
\text{alloc}(\tau, v) = \begin{cases}
\text{stack or inline} & \text{if } \tau \in \mathcal{T}_{\text{val}} \text{ and not boxed} \\
\text{heap} & \text{if } \tau \in \mathcal{T}_{\text{ref}} \\
\text{heap (boxed)} & \text{if } \tau \in \mathcal{T}_{\text{val}} \text{ and context requires ref}
\end{cases}
$$

#### 2.1.2 装箱形式化

设 $v : \tau_{\text{val}}$ 为值类型实例，装箱操作 $\text{box}$：

$$
\text{box}(v) = (h, \tau_{\text{val}}) \quad \text{where } h \in \text{HeapAddr}
$$

拆箱操作：

$$
\text{unbox}(o, \tau_{\text{val}}) = \begin{cases}
v & \text{if } o = \text{box}(v) \text{ and } \tau(o) = \tau_{\text{val}} \\
\text{InvalidCastException} & \text{otherwise}
\end{cases}
$$

#### 2.1.3 可空类型形式化

$\tau?$ 表示 $\tau \cup \{\text{null}\}$：

$$
\tau? = \tau \cup \{\bot\}
$$

对于值类型 $\tau_{\text{val}}$，`Nullable<T>` 是包装结构；对于引用类型 $\tau_{\text{ref}}$，NRT 仅在编译期检查，运行时无开销。

### 2.2 表达式求值语义

C# 表达式求值遵循以下规则：

1. **左到右求值**：操作数按出现顺序求值。
2. **短路求值**：`&&` 与 `||` 短路。
3. **运算符优先级**：参考 C# 语言规范。

形式化：

$$
\llbracket e_1 \oplus e_2 \rrbracket_\rho = \llbracket e_1 \rrbracket_\rho \oplus \llbracket e_2 \rrbracket_\rho
$$

其中 $\rho$ 为环境（变量绑定），$\llbracket \cdot \rrbracket_\rho$ 为求值函数。

### 2.3 语句语义

语句 $S$ 的语义可表示为状态变换：

$$
\llbracket S \rrbracket : \Sigma \to \Sigma \cup \{\text{Exc}\}
$$

其中 $\Sigma$ 为程序状态（变量绑定 + 堆），$\text{Exc}$ 为异常。

例如赋值：

$$
\llbracket x = e \rrbracket_\sigma = \sigma[x \mapsto \llbracket e \rrbracket_\sigma]
$$

### 2.4 模式匹配形式化

模式 $P$ 对值 $v$ 的匹配可形式化为：

$$
\text{match}(P, v) = \begin{cases}
\text{Some}(\sigma) & \text{if pattern matches, binding variables to } \sigma \\
\text{None} & \text{otherwise}
\end{cases}
$$

模式递归定义：

- 常量模式 `c`：`match(c, v) = if v == c then Some({}) else None`
- 类型模式 `T x`：`match(T x, v) = if v is T then Some({x → v}) else None`
- `and` 模式：`match(P1 and P2, v) = match(P1, v) ⊕ match(P2, v)`（合并绑定）
- `or` 模式：`match(P1 or P2, v) = match(P1, v) ∪ match(P2, v)`
- `not` 模式：`match(not P, v) = if match(P, v) = None then Some({}) else None`

---

## 3. 理论推导与证明

### 3.1 NRT 流分析的正确性

**命题 4.1**：若编译器判定表达式 $e$ 类型为 `T`（非 `T?`），则在运行时 $e$ 不会求值为 `null`。

**证明（Sketch）**：编译器维护 null 状态 lattice $\{\text{NotNull}, \text{MaybeNull}, \text{Null}\}$，对每条路径进行前向数据流分析：

- 字面量 `null` 的状态为 `Null`。
- `new T()` 的状态为 `NotNull`。
- `?? default` 后的状态为 `NotNull`。
- `if (x is not null) {...}` then-branch 中 $x$ 为 `NotNull`，else-branch 中为 `Null`。
- `x?.M()` 中 $x$ 在 `M` 调用前为 `NotNull`。

若将 `MaybeNull` 或 `Null` 状态的值赋给 `T` 类型变量，编译器发出 CS8602 警告（或 `TreatWarningsAsErrors` 时错误）。

由于分析是保守的（over-approximation），可能存在假阳性（警告但实际安全），但不会假阴性（即判定 NotNull 时一定不为 null）。

### 3.2 switch 表达式的穷尽性（Exhaustiveness）

**命题 4.2**：若 `enum E { A, B, C }` 与 `switch` 表达式：

```csharp
var r = e switch { E.A => 1, E.B => 2, E.C => 3, _ => 0 };
```

则移除 `_` 通配后，编译器仍可证明穷尽。

**证明**：编译器对每个 union type（enum、record 等）维护构造子集合 $C(\tau)$。穷尽性要求：

$$
\bigcup_{i} C(P_i) \supseteq C(\tau)
$$

其中 $P_i$ 是 switch 分支的模式。若加入 `_` 通配，则一定穷尽。

### 3.3 字符串不可变性证明

**命题 4.3**：`string` 类型不可变，故对 `string` 的"修改"操作实际产生新对象。

**证明**：`System.String` 在 CLR 中：

1. 内部 `char[] _firstChar` 数组无 `set` 访问器。
2. 长度字段 `Length` 为只读。
3. `Substring`、`Replace`、`ToUpper` 等方法返回新 `string`。
4. `StringBuilder` 是可变字符串，因其内部维护 `char[]` 与可写 `Length`。

性能含义：`s + s` 的复杂度是 $O(|s|)$，循环拼接 `for (int i = 0; i < n; i++) s = s + i;` 总复杂度 $O(n^2)$，应改用 `StringBuilder`。

### 3.4 装箱开销形式化

**命题 4.4**：装箱操作的开销 $C_{\text{box}}$ 包括分配堆对象 + 复制值 + GC 跟踪，约 $O(s)$，其中 $s$ 为类型大小。

**推导**：装箱在堆上分配 `Boxed<T>` 对象，包含：

- 对象头（约 16 字节，含类型句柄与同步块）。
- 值类型字段（$s$ 字节）。

总分配 $16 + s$ 字节，触发 GC 跟踪。在循环中：

```csharp
ArrayList list = new();
for (int i = 0; i < 1_000_000; i++) list.Add(i);   // 每次装箱
```

总开销 $10^6 \times (16 + 4) = 20\text{MB}$ 堆分配 + GC 压力。

改为 `List<int>`：仅 `int[]` 扩容，无装箱，分配约 4MB。

### 3.5 类型推断算法

`var` 的类型推断算法：

1. 解析右侧表达式 $e$ 的类型 $\tau$。
2. 若 $\tau$ 为开放泛型类型，进行类型推断（与 Java 类似）。
3. 绑定变量类型为 $\tau$。

例如：

```csharp
var x = 1;           // int
var y = 1L;           // long
var z = 1.0;          // double
var s = "hello";      // string
var arr = new[] { 1, 2, 3 };  // int[]
var dict = new Dictionary<string, int>();  // Dictionary<string, int>
```

类型推断在编译期完成，运行时与显式声明完全等价。

---

## 4. 代码示例

### 4.1 类型与字面量

```csharp
// 整数类型
byte b = 255;
sbyte sb = -128;
short s = 32767;
ushort us = 65535;
int i = 2_000_000_000;
uint ui = 4_000_000_000U;
long l = 9_000_000_000_000_000_000L;
ulong ul = 18_000_000_000_000_000_000UL;

// 浮点类型
float f = 3.14f;
double d = 3.14159265358979;
decimal money = 1234.56m;   // 财务计算推荐

// 字符与字符串
char c = 'A';
string s1 = "Hello";
string raw = """Raw "string" with \no escape""";

// 布尔
bool flag = true;

// 二进制与十六进制
int bin = 0b1010_1010;
int hex = 0xFF;

Console.WriteLine($"{b}, {i}, {d}, {s1}, {bin}, {hex}");
```

### 4.2 var 与显式类型

```csharp
// var 编译期推断，运行时与显式类型等价
var name = "Alice";        // string
var age = 30;              // int
var scores = new[] { 90, 85, 88 };  // int[]

// 推荐场景
Dictionary<string, List<int>> dict1 = new();   // C# 9.0 目标类型 new
var dict2 = new Dictionary<string, List<int>>();   // 显式 var

// 不推荐：类型不明显
var result = GetData();   // 类型是什么？
// 推荐
Person person = GetData();
```

### 4.3 控制流

#### 4.3.1 if-else

```csharp
int score = 85;
if (score >= 90)
    Console.WriteLine("A");
else if (score >= 80)
    Console.WriteLine("B");
else if (score >= 60)
    Console.WriteLine("C");
else
    Console.WriteLine("F");
```

#### 4.3.2 switch 语句

```csharp
int day = 3;
switch (day)
{
    case 1: Console.WriteLine("Monday"); break;
    case 2: Console.WriteLine("Tuesday"); break;
    case 3: Console.WriteLine("Wednesday"); break;
    case 4: Console.WriteLine("Thursday"); break;
    case 5: Console.WriteLine("Friday"); break;
    case 6:
    case 7: Console.WriteLine("Weekend"); break;
    default: Console.WriteLine("Invalid"); break;
}
```

#### 4.3.3 switch 表达式（C# 8.0+）

```csharp
int day = 3;
string name = day switch
{
    1 => "Monday",
    2 => "Tuesday",
    3 => "Wednesday",
    4 => "Thursday",
    5 => "Friday",
    >= 6 and <= 7 => "Weekend",
    _ => "Invalid"
};
Console.WriteLine(name);
```

#### 4.3.4 for / foreach

```csharp
// for 循环
for (int i = 0; i < 5; i++)
    Console.WriteLine(i);

// foreach
var numbers = new List<int> { 1, 2, 3, 4, 5 };
foreach (var n in numbers)
    Console.WriteLine(n);

// foreach with index (C# 8+)
foreach (var (item, index) in numbers.Select((x, i) => (x, i)))
    Console.WriteLine($"[{index}] = {item}");
```

#### 4.3.5 while / do-while

```csharp
int n = 10;
while (n > 0)
{
    Console.WriteLine(n);
    n--;
}

int m = 5;
do
{
    Console.WriteLine(m);
    m--;
} while (m > 0);
```

### 4.4 模式匹配

#### 4.4.1 is 模式

```csharp
object o = "hello";
if (o is string s && s.Length > 3)
    Console.WriteLine($"Long string: {s}");

// not 模式（C# 9+）
if (o is not null)
    Console.WriteLine("Not null");

// 类型模式 + 属性模式（C# 8+）
if (o is Person { Age: >= 18 } adult)
    Console.WriteLine($"Adult: {adult.Name}");
```

#### 4.4.2 switch 表达式与递归模式

```csharp
public record Person(string Name, int Age, string[] Hobbies);

public string Describe(Person p) => p switch
{
    { Age: < 13 } => $"{p.Name} is a child",
    { Age: >= 13 and < 20 } => $"{p.Name} is a teenager",
    { Age: >= 65 } => $"{p.Name} is a senior",
    { Hobbies.Length: > 3 } => $"{p.Name} has many hobbies",
    { } => $"{p.Name} is an adult"
};

// 列表模式（C# 11）
public int SumHead(int[] arr) => arr switch
{
    [] => 0,
    [var first, ..] => first,
    [.., var last] => last
};
```

### 4.5 字符串处理

#### 4.5.1 字符串插值

```csharp
string name = "Alice";
int age = 30;
decimal balance = 1234.56m;

// 字符串插值
Console.WriteLine($"Name: {name}, Age: {age}");

// 格式化
Console.WriteLine($"Balance: {balance:C}");
Console.WriteLine($"Date: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");

// 对齐
Console.WriteLine($"{"Name",-10}|{"Age",5}");
Console.WriteLine($"{name,-10}|{age,5}");

// 多行插值
string json = $$"""
{
    "name": "{{name}}",
    "age": {{age}}
}
""";
```

#### 4.5.2 字符串拼接性能

```csharp
// 反模式：O(n²)
string s = "";
for (int i = 0; i < 1000; i++)
    s += i;

// 正确：StringBuilder
var sb = new StringBuilder();
for (int i = 0; i < 1000; i++)
    sb.Append(i);
string result = sb.ToString();

// C# 10+：插值处理高性能
var handler = new DefaultInterpolatedStringHandler();
handler.AppendLiteral("Hello ");
handler.AppendFormatted(name);
handler.AppendLiteral(", age ");
handler.AppendFormatted(age);
string msg = handler.ToStringAndClear();
```

### 4.6 可空类型

#### 4.6.1 可空值类型

```csharp
int? x = null;
if (x.HasValue)
    Console.WriteLine(x.Value);
else
    Console.WriteLine("null");

// ?? 默认值
int v = x ?? -1;

// ??= 赋值（C# 8+）
int? y = null;
y ??= 42;   // y = 42
```

#### 4.6.2 可空引用类型

```csharp
#nullable enable

string nonNull = "hello";   // 不可为 null
string? nullable = null;     // 可为 null

// 警告：CS8602
// Console.WriteLine(nonNull.Length);   // 若未赋值

// 安全访问
if (nullable is not null)
    Console.WriteLine(nullable.Length);

// 短路
int? len = nullable?.Length;   // len 为 int?
int len2 = nullable?.Length ?? 0;  // len2 为 int
```

### 4.7 异常处理

```csharp
try
{
    int x = int.Parse("abc");
}
catch (FormatException ex)
{
    Console.WriteLine($"Format error: {ex.Message}");
}
catch (Exception ex) when (ex.Message.Contains("abc"))
{
    Console.WriteLine("Filtered catch");
}
finally
{
    Console.WriteLine("Cleanup");
}

// C# 6+ 异常过滤器
try
{
    File.ReadAllText("missing.txt");
}
catch (FileNotFoundException ex) when (ex.FileName.Contains("config"))
{
    Console.WriteLine("Config file missing, using defaults");
}
```

### 4.8 using 声明

```csharp
// using 语句（旧风格）
using (var stream = new FileStream("data.bin", FileMode.Open))
{
    // 使用 stream
}   // 自动 Dispose

// using 声明（C# 8+）
using var stream2 = new FileStream("data.bin", FileMode.Open);
// 使用 stream2，方法结束时自动 Dispose
```

### 4.9 顶级语句

```csharp
// C# 9+ 顶级语句（Program.cs 全文）
using System;

var name = args.Length > 0 ? args[0] : "World";
Console.WriteLine($"Hello, {name}!");

// 编译器生成等价于：
// internal class Program
// {
//     private static void Main(string[] args)
//     {
//         var name = args.Length > 0 ? args[0] : "World";
//         Console.WriteLine($"Hello, {name}!");
//     }
// }
```

### 4.10 集合表达式

```csharp
// C# 12 集合表达式
int[] arr = [1, 2, 3, 4, 5];
List<int> list = [1, 2, 3];
Span<int> span = [1, 2, 3];

// 展开
int a = 1, b = 2, c = 3;
int[] combined = [0, a, b, c, ..list, 9];
```

### 4.11 编译指令

```bash
# 创建项目
dotnet new console -n BasicDemo
cd BasicDemo

# 运行
dotnet run

# 发布 Release
dotnet publish -c Release -o ./publish
./publish/BasicDemo
```

### 4.12 完整示例：购物车

```csharp
using System.Globalization;

namespace BasicDemo;

public record Product(string Name, decimal Price, int Quantity);

public static class Program
{
    public static void Main(string[] args)
    {
        var cart = new List<Product>
        {
            new("Apple", 5.50m, 3),
            new("Bread", 12.80m, 1),
            new("Milk", 8.20m, 2)
        };

        PrintReceipt(cart);
    }

    private static void PrintReceipt(List<Product> cart)
    {
        Console.WriteLine("=== Receipt ===");
        decimal total = 0;
        foreach (var p in cart)
        {
            decimal sub = p.Price * p.Quantity;
            total += sub;
            Console.WriteLine($"{p.Name,-10} {p.Price,8:C} x {p.Quantity} = {sub,8:C}");
        }
        Console.WriteLine($"Total: {total,28:C}");
    }
}
```

输出：

```
=== Receipt ===
Apple       ¥5.50 x 3 =    ¥16.50
Bread      ¥12.80 x 1 =    ¥12.80
Milk        ¥8.20 x 2 =    ¥16.40
Total:                         ¥45.70
```

---

## 5. 对比分析

### 5.1 C# vs Java 类型系统

| 维度 | C# | Java |
|------|-----|------|
| 值类型 | `struct`、`enum` 自定义 | `enum` 仅 int；无 `struct` |
| 装箱 | 显式与隐式 | 自动 |
| 无符号整数 | `uint`、`ulong`、`byte` | 仅 `char` 无符号 |
| Decimal | `decimal` 内置 | `BigDecimal` 类库 |
| 可空类型 | `T?` 语法糖 + NRT | `Optional<T>` 类库 |
| 隐式类型 | `var` | `var`（Java 10+） |
| 元组 | `(int, string)` 元组类型 | 无（用 record 或 List） |
| 模式匹配 | `is` + `switch` 表达式 | `switch` 表达式（Java 21+） |

### 5.2 C# vs TypeScript 字符串

| 维度 | C# | TypeScript |
|------|-----|-----------|
| 不可变 | `string` 不可变 | JS `string` 不可变 |
| 字面量 | `"..."` `$"..."` `@"..."` `"""..."""` | `"..."` `` `...` `` |
| 插值 | `$"{name}"` | `${name}` |
| 多行 | `@"multi\nline"` 或 `"""..."""` | `` `multi\nline` `` |
| 编码 | UTF-16 | UTF-16 |

### 5.3 C# vs Kotlin 模式匹配

C#：

```csharp
string desc = person switch
{
    { Age: < 13 } => "Child",
    { Age: >= 65 } => "Senior",
    _ => "Adult"
};
```

Kotlin：

```kotlin
val desc = when {
    person.age < 13 -> "Child"
    person.age >= 65 -> "Senior"
    else -> "Adult"
}
```

### 5.4 C# vs Python 控制流

C#：

```csharp
if (x > 0) { Console.WriteLine("Positive"); }
for (int i = 0; i < 10; i++) { /* ... */ }
foreach (var item in list) { /* ... */ }
```

Python：

```python
if x > 0: print("Positive")
for i in range(10): pass
for item in list: pass
```

### 5.5 跨语言 Hello + 控制流

| 语言 | Hello | 条件 |
|------|-------|------|
| C# | `Console.WriteLine("Hi");` | `if (x > 0) {}` |
| Java | `System.out.println("Hi");` | `if (x > 0) {}` |
| Kotlin | `println("Hi")` | `if (x > 0) {}` |
| Go | `fmt.Println("Hi")` | `if x > 0 {}` |
| Python | `print("Hi")` | `if x > 0:` |
| Rust | `println!("Hi");` | `if x > 0 {}` |
| TypeScript | `console.log("Hi");` | `if (x > 0) {}` |

---

## 6. 常见陷阱与反模式

### 6.1 装箱陷阱

**反模式**：

```csharp
ArrayList list = new();
list.Add(1);  // 装箱
list.Add(2);

int sum = 0;
foreach (int i in list) sum += i;   // 拆箱
```

**对策**：使用 `List<int>`。

### 6.2 字符串拼接 O(n²)

```csharp
string s = "";
for (int i = 0; i < 10000; i++) s += i;   // 慢
```

**对策**：`StringBuilder`。

### 6.3 == 与 Equals 混淆

```csharp
string a = "hello";
string b = "hel" + "lo";
Console.WriteLine(a == b);          // True（重载 == 比较内容）
Console.WriteLine(ReferenceEquals(a, b));  // 不一定（实习字符串优化）

object oa = a, ob = b;
Console.WriteLine(oa == ob);        // 不一定（ReferenceEquals）
```

**对策**：

- 字符串比较内容用 `==`。
- 比较引用用 `ReferenceEquals`。

### 6.4 浮点精度

```csharp
double x = 0.1 + 0.2;
Console.WriteLine(x);  // 0.30000000000000004
Console.WriteLine(x == 0.3);  // False

decimal d1 = 0.1m + 0.2m;
Console.WriteLine(d1 == 0.3m);  // True
```

**对策**：财务计算用 `decimal`。

### 6.5 整数溢出

```csharp
int max = int.MaxValue;
int overflow = max + 1;   // 默认 wrap-around，结果为 int.MinValue
Console.WriteLine(overflow);  // -2147483648

// 检查溢出
checked
{
    int x = int.MaxValue + 1;  // 抛 OverflowException
}
```

**对策**：开启 `checked` 或在 csproj 配置 `<CheckForOverflowUnderflow>true</CheckForOverflowUnderflow>`。

### 6.6 switch 漏 break

C# 不允许隐式 fallthrough（除空 case），编译错误。但需注意显式 fallthrough：

```csharp
switch (x)
{
    case 1:
        DoA();
        // 错误：不能隐式 fallthrough
    case 2:
        DoB();
        break;
}

// 正确：用 goto
switch (x)
{
    case 1:
        DoA();
        goto case 2;
    case 2:
        DoB();
        break;
}
```

### 6.7 NRT 假阳性

```csharp
#nullable enable
string GetName()
{
    if (DateTime.Now.Millisecond > 500)
        return null;   // CS8603 警告
    return "Alice";
}
```

**对策**：返回类型改为 `string?` 或修改逻辑。

### 6.8 异常吞咽

```csharp
try { DoWork(); }
catch { }   // 静默吞咽
```

**对策**：记录日志或重新抛出。

### 6.9 异常重抛丢失堆栈

```csharp
try { DoWork(); }
catch (Exception ex)
{
    Log(ex);
    throw ex;   // 错误：丢失原始堆栈
}
```

**对策**：使用 `throw;`（保留堆栈）或 `ExceptionDispatchInfo.Capture(ex).Throw()`。

### 6.10 var 类型推断错误

```csharp
var x = 1;        // int，不是 long
long y = x + 1;  // OK，隐式转换
var z = x / 2;   // int，整数除法

// 双精度陷阱
var d = 1 / 2;    // int 0
double d2 = 1.0 / 2;  // 0.5
```

### 6.11 闭包捕获循环变量

C# 5+ 已修复，但需注意：

```csharp
var actions = new List<Action>();
for (int i = 0; i < 5; i++)
    actions.Add(() => Console.WriteLine(i));

foreach (var a in actions) a();   // 5 5 5 5 5（C# 5+ 输出 0 1 2 3 4）
```

### 6.12 readonly vs const

```csharp
public const int Max = 100;            // 编译期常量，跨程序集需重新编译
public static readonly int Max2 = 100; // 运行期，跨程序集无需重新编译
```

---

## 7. 工程实践与最佳实践

### 7.1 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 类、记录、结构 | PascalCase | `Person`、`OrderItem` |
| 接口 | I 前缀 + PascalCase | `IRepository`、`IService` |
| 方法 | PascalCase | `GetUser`、`Calculate` |
| 公共字段 | PascalCase | `Name`、`Age` |
| 私有字段 | _camelCase | `_name`、`_age` |
| 局部变量 | camelCase | `firstName`、`count` |
| 参数 | camelCase | `userId`、`order` |
| 常量 | PascalCase | `MaxRetryCount` |
| 命名空间 | PascalCase | `MyApp.Services` |

### 7.2 var 使用指南

```csharp
// 推荐：类型明显
var person = new Person();
var list = new List<int>();
var dict = new Dictionary<string, int>();

// 不推荐：类型不明显
var result = DoSomething();
// 推荐
Person person = GetPerson();
```

### 7.3 字符串选择

- **简单插值**：`$"{name}"`。
- **多行 / 含引号**：`"""..."""`。
- **路径**：`@"C:\path\to\file"`。
- **正则**：`@"\d+\.\d+"`。
- **大量拼接**：`StringBuilder`。
- **格式化**：`string.Format` 或插值。

### 7.4 异常处理策略

```csharp
// 1. 业务异常：自定义异常类型
public class DomainException : Exception
{
    public string Code { get; }
    public DomainException(string code, string message) : base(message)
    {
        Code = code;
    }
}

// 2. 全局异常中间件（ASP.NET Core）
public class ExceptionMiddleware
{
    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        try { await next(context); }
        catch (DomainException ex)
        {
            context.Response.StatusCode = 400;
            await context.Response.WriteAsJsonAsync(new { ex.Code, ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            context.Response.StatusCode = 500;
            await context.Response.WriteAsJsonAsync(new { Error = "Internal" });
        }
    }
}

// 3. Result 模式（函数式）
public class Result<T>
{
    public bool IsSuccess { get; }
    public T Value { get; }
    public string? Error { get; }

    public static Result<T> Success(T v) => new(true, v, null);
    public static Result<T> Failure(string err) => new(false, default, err);

    private Result(bool ok, T value, string? err)
    {
        IsSuccess = ok; Value = value; Error = err;
    }
}
```

### 7.5 NRT 配置

`csproj`：

```xml
<PropertyGroup>
  <Nullable>enable</Nullable>
  <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  <NoWarn>$(NoWarn);CS1591</NoWarn>
</PropertyGroup>
```

文件级控制：

```csharp
#nullable enable
// 启用 NRT

#nullable disable
// 禁用 NRT

#nullable restore
// 恢复项目设置

#nullable enable annotations
// 仅启用注解，不警告

#nullable enable warnings
// 仅启用警告
```

### 7.6 编译器分析器

`csproj`：

```xml
<ItemGroup>
  <PackageReference Include="StyleCop.Analyzers" Version="1.2.0-beta.556" />
  <PackageReference Include="Roslynator.Analyzers" Version="4.12.4" />
  <PackageReference Include="SonarAnalyzer.CSharp" Version="9.32.0.97167" />
  <PackageReference Include="Microsoft.CodeAnalysis.NetAnalyzers" Version="9.0.0" />
</ItemGroup>
```

`.editorconfig` 配置规则严重级别：

```ini
dotnet_diagnostic.CA1303.severity = error
dotnet_diagnostic.SA1101.severity = none
```

### 7.7 字符串比较

```csharp
// 文化敏感比较（默认）
string.Compare("abc", "ABC");   // -1（不同）

// 序数比较
string.Equals("abc", "ABC", StringComparison.Ordinal);  // False
string.Equals("abc", "ABC", StringComparison.OrdinalIgnoreCase);  // True

// 推荐
if (name.Equals("Alice", StringComparison.OrdinalIgnoreCase))
    /* ... */;

// 文件路径比较
StringComparer.OrdinalIgnoreCase.Equals(path1, path2);
```

### 7.8 性能优化技巧

```csharp
// 1. 字符串拼接已知长度
var sb = new StringBuilder(1024);  // 预分配容量

// 2. 列表预分配
var list = new List<int>(capacity: 1000);

// 3. 集合查找
var set = new HashSet<int>([1, 2, 3]);  // O(1)
var dict = new Dictionary<string, int>();  // O(1)

// 4. Span 避免分配
ReadOnlySpan<char> span = "Hello".AsSpan();
foreach (var c in span) Console.Write(c);

// 5. stackalloc
Span<int> buffer = stackalloc int[100];  // 栈分配
```

### 7.9 单元测试

```csharp
using Xunit;

public class CalculatorTests
{
    [Theory]
    [InlineData(1, 2, 3)]
    [InlineData(-1, 1, 0)]
    [InlineData(100, 200, 300)]
    public void Add_Returns_Sum(int a, int b, int expected)
    {
        Assert.Equal(expected, Calculator.Add(a, b));
    }

    [Fact]
    public void Divide_By_Zero_Throws()
    {
        Assert.Throws<DivideByZeroException>(() => Calculator.Divide(1, 0));
    }
}
```

### 7.10 调试技巧

- **断点**：VS Code 中 F9 设置断点。
- **条件断点**：右键断点 → Edit Breakpoint → `i == 42`。
- **日志断点**：不暂停，仅输出日志。
- **Watch**：右键表达式 → Add to Watch。
- **调用栈**：调用堆栈窗口查看。
- **Immediate Window**：VS 中可执行表达式。
- **dotnet-counters**：实时监控。

---

## 8. 案例研究

### 8.1 案例：命令行参数解析

```csharp
// 简单实现
var config = new Dictionary<string, string>();
foreach (var arg in args)
{
    if (arg.StartsWith("--"))
    {
        var parts = arg[2..].Split('=', 2);
        config[parts[0]] = parts.Length == 2 ? parts[1] : "true";
    }
}

foreach (var kv in config)
    Console.WriteLine($"{kv.Key} = {kv.Value}");
```

推荐使用 `System.CommandLine` 库：

```csharp
using System.CommandLine;

var rootCommand = new RootCommand("Sample app");
var nameOption = new Option<string>("--name", "User name") { IsRequired = true };
var verboseOption = new Option<bool>("--verbose", "Verbose output");

rootCommand.AddOption(nameOption);
rootCommand.AddOption(verboseOption);

rootCommand.SetHandler((name, verbose) =>
{
    if (verbose) Console.WriteLine($"Verbose: processing {name}");
    Console.WriteLine($"Hello, {name}!");
}, nameOption, verboseOption);

await rootCommand.InvokeAsync(args);
```

### 8.2 案例：FizzBuzz

```csharp
for (int i = 1; i <= 100; i++)
{
    string output = (i % 3, i % 5) switch
    {
        (0, 0) => "FizzBuzz",
        (0, _) => "Fizz",
        (_, 0) => "Buzz",
        _ => i.ToString()
    };
    Console.WriteLine(output);
}
```

### 8.3 案例：领域规则配置

```csharp
public record OrderRule(string Name, decimal MinAmount, decimal MaxAmount, int Priority);

public class OrderProcessor
{
    private readonly List<OrderRule> _rules;

    public OrderProcessor(IEnumerable<OrderRule> rules)
    {
        _rules = rules.OrderByDescending(r => r.Priority).ToList();
    }

    public string Evaluate(decimal amount) =>
        _rules.FirstOrDefault(r => amount >= r.MinAmount && amount <= r.MaxAmount)?.Name ?? "Unknown";
}

// 使用
var processor = new OrderProcessor([
    new("Small", 0, 100, 1),
    new("Medium", 100, 1000, 2),
    new("Large", 1000, decimal.MaxValue, 3)
]);
Console.WriteLine(processor.Evaluate(500));   // Medium
```

### 8.4 案例：CSV 解析器

```csharp
public static IEnumerable<string[]> ParseCsv(string path)
{
    foreach (var line in File.ReadLines(path))
    {
        if (string.IsNullOrWhiteSpace(line)) continue;
        yield return line.Split(',');
    }
}

// 使用
foreach (var row in ParseCsv("data.csv"))
{
    foreach (var field in row)
        Console.Write($"{field,-15}");
    Console.WriteLine();
}
```

### 8.5 案例：FizzBuzz 模式匹配版

```csharp
string FizzBuzz(int n) => (n % 3, n % 5) switch
{
    (0, 0) => "FizzBuzz",
    (0, _) => "Fizz",
    (_, 0) => "Buzz",
    _ => n.ToString()
};

foreach (var i in Enumerable.Range(1, 100))
    Console.WriteLine(FizzBuzz(i));
```

### 8.6 案例：状态机（交通灯）

```csharp
public enum LightState { Red, Green, Yellow }

public class TrafficLight
{
    public LightState State { get; private set; } = LightState.Red;

    public void Transition() => State = State switch
    {
        LightState.Red => LightState.Green,
        LightState.Green => LightState.Yellow,
        LightState.Yellow => LightState.Red,
        _ => throw new InvalidOperationException()
    };
}

var light = new TrafficLight();
for (int i = 0; i < 6; i++)
{
    Console.WriteLine(light.State);
    light.Transition();
}
```

### 8.7 案例：基于 NRT 的服务层

```csharp
#nullable enable

public class UserService
{
    private readonly IUserRepository _repo;

    public UserService(IUserRepository repo)
    {
        _repo = repo ?? throw new ArgumentNullException(nameof(repo));
    }

    public User? FindById(int id)
    {
        if (id <= 0) return null;
        return _repo.Get(id);
    }

    public User GetById(int id)
    {
        var user = FindById(id)
            ?? throw new KeyNotFoundException($"User {id} not found");
        return user;
    }
}

public interface IUserRepository
{
    User? Get(int id);
}

public record User(int Id, string Name, string Email);
```

### 8.8 案例：日志级别过滤

```csharp
public enum LogLevel { Debug, Info, Warning, Error, Fatal }

public static class Logger
{
    public static LogLevel MinLevel { get; set; } = LogLevel.Info;

    public static void Log(LogLevel level, string message)
    {
        if (level < MinLevel) return;
        Console.WriteLine($"[{level}] {DateTime.Now:HH:mm:ss} {message}");
    }

    public static void Info(string msg) => Log(LogLevel.Info, msg);
    public static void Warning(string msg) => Log(LogLevel.Warning, msg);
    public static void Error(string msg) => Log(LogLevel.Error, msg);
}

Logger.Info("App started");
Logger.Warning("Memory high");
Logger.Error("Disk full");
```

---

### 简答题知识点讲解

**常见疑问 9**：解释 `var` 与 `object` / `dynamic` 的差异。

**解析讲解**：

- `var`：编译期类型推断，运行时与显式声明等价，强类型。
- `object`：编译期 `object`，运行时动态分派，需要装箱（值类型）。
- `dynamic`：基于 DLR，运行时动态分派，无编译期检查。

```csharp
var x = 1;        // int，强类型
object o = 1;     // 装箱，需要 cast 才能调用 int 方法
dynamic d = 1;    // 运行时绑定
d.Foo();          // 编译通过，运行时异常
```

**常见疑问 10**：列举 C# 8.0 引入的与可空性相关的所有特性。

**解析讲解**：

1. NRT（可空引用类型）。
2. `??=`（null 合并赋值）。
3. `?.`（null 条件运算符，C# 6 已有，但 NRT 下流分析增强）。
4. `NotNullWhen`、`MaybeNullWhen`、`NotNullIfNotNull` 等后置条件特性。
5. `MemberNotNullWhen`、`MemberNotNull`。
6. `[AllowNull]`、`[DisallowNull]`、`[MaybeNull]`、`[NotNull]`。

### 编程题知识点讲解

**常见疑问 11**：编写一个 `SafeDivide(a, b)` 方法，返回 `Result<double>`，处理除零。

**解析讲解**：

```csharp
public class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }

    public static Result<T> Success(T value) => new(true, value, null);
    public static Result<T> Failure(string err) => new(false, default, err);

    private Result(bool ok, T? value, string? err)
    {
        IsSuccess = ok; Value = value; Error = err;
    }
}

public static Result<double> SafeDivide(double a, double b)
{
    if (b == 0)
        return Result<double>.Failure("Division by zero");
    return Result<double>.Success(a / b);
}

// 使用
var r = SafeDivide(10, 2);
if (r.IsSuccess)
    Console.WriteLine(r.Value);
else
    Console.WriteLine(r.Error);
```

**常见疑问 12**：编写一个程序，统计文本文件中每个单词出现次数，按词频倒序输出。

**解析讲解**：

```csharp
using System.IO;

if (args.Length == 0)
{
    Console.Error.WriteLine("Usage: WordCount <file>");
    return 1;
}

var freq = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
foreach (var line in File.ReadLines(args[0]))
{
    foreach (var word in line.Split(' ', StringSplitOptions.RemoveEmptyEntries))
    {
        ref int count = ref CollectionsMarshal.GetValueRefOrAddDefault(freq, word, out _);
        count++;
    }
}

foreach (var (word, count) in freq.OrderByDescending(kv => kv.Value))
    Console.WriteLine($"{count,5} {word}");

return 0;
```

**常见疑问 13**：使用模式匹配实现一个简单的计算器，支持 `+`、`-`、`*`、`/`。

**解析讲解**：

```csharp
public abstract record Expr;
public record Num(double Value) : Expr;
public record Add(Expr Left, Expr Right) : Expr;
public record Sub(Expr Left, Expr Right) : Expr;
public record Mul(Expr Left, Expr Right) : Expr;
public record Div(Expr Left, Expr Right) : Expr;

public static double Eval(Expr e) => e switch
{
    Num n => n.Value,
    Add(var l, var r) => Eval(l) + Eval(r),
    Sub(var l, var r) => Eval(l) - Eval(r),
    Mul(var l, var r) => Eval(l) * Eval(r),
    Div(var l, var r) => Eval(r) == 0
        ? throw new DivideByZeroException()
        : Eval(l) / Eval(r),
    _ => throw new ArgumentException("Unknown expr")
};

// 使用
Expr expr = new Div(new Num(10), new Add(new Num(2), new Num(3)));
Console.WriteLine(Eval(expr));   // 2
```

### 11.1 官方文档

- C# 类型系统：<https://learn.microsoft.com/dotnet/csharp/fundamentals/types/>
- 默认值：<https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/default-values>
- 可空类型：<https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/nullable>
- 模式匹配：<https://learn.microsoft.com/dotnet/csharp/fundamentals/functional/pattern-matching>
- 字符串插值：<https://learn.microsoft.com/dotnet/csharp/language-reference/tokens/interpolated>

### 11.2 系列内交叉引用

- 概述与环境配置 —— C# 简史、.NET 生态、SDK 安装
- 面向对象编程 —— 类、接口、继承、多态、抽象
- 泛型与集合 —— `List<T>`、`Dictionary<K,V>`、泛型约束
- 异步编程 —— Task、async/await、并行
- LINQ 与函数式编程 —— 查询表达式、Lambda
- 值类型与引用类型 —— 栈与堆、装箱
- 模式匹配 —— 深入模式匹配
- 记录类型 —— `record` 与不可变性
- 记录类型与不可变性 —— `with`、值相等

### 11.3 进阶书籍

- Albahari, J. 2023. *C# 12 in a Nutshell* (O'Reilly Media.
- Wagner, B. 2018. *More Effective C#: 50 Specific Ways to Improve Your C#* (2nd ed.). Addison-Wesley.
- Skeet, J. 2019. *C# in Depth* (4th ed.). Manning Publications.
- Wagner, B. 2022. *C# 10 in a Nutshell* (O'Reilly Media.
- Stovell, D. 2022. *Pro .NET 6 Parallel Programming in C#* (Apress.

### 11.6 工具

- Sharplab：<https://sharplab.io/>（在线查看 C# 编译结果）
- dotnetfiddle：<https://dotnetfiddle.net/>
- C# Pad：<https://csharppad.com/>
- Roslyn Quoter：<https://roslynquoter.azurewebsites.net/>

## 结语

至此，你已经掌握了 C# 的基础语法：类型、变量、运算符、控制流、字符串、模式匹配、可空性、顶级语句。这些是后续学习面向对象、泛型、异步、LINQ 的基石。

下一步，请进入 面向对象编程，开始学习如何用类、接口、继承来组织复杂业务逻辑。

记住：

- **类型是契约**：选择正确类型胜过用 `object` 兜底。
- **null 是 bug 源**：开启 NRT，让编译器帮你抓 null。
- **模式匹配胜过 if 链**：让代码更具表达力。
- **不可变优先**：`record`、`init`、`readonly` 让并发更安全。

---

*本文由 FANDEX 团队编写，最后更新于 2026-07-21。*
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
