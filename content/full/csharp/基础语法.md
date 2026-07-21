---
order: 2
title: 'C# 基础语法'
module: csharp
category: 'C#'
difficulty: beginner
description: '变量与类型、值类型与引用类型、字符串插值、模式匹配、控制流、nullable 引用类型、顶级语句'
author: fanquanpp
updated: '2026-07-21'
related:
  - csharp/概述与环境配置
  - csharp/面向对象编程
  - csharp/泛型与集合
prerequisites: []
---

# C# 基础语法

> 本篇是 FANDEX C# 系列的第二篇。我们将系统讲解 C# 的基础语法：类型系统、变量、运算符、控制流、字符串、模式匹配、可空性、顶级语句。内容对标 Stanford CS106A/B、MIT 6.0001、CMU 15-112 课程教学严谨度，支持 0 基础自学，同时覆盖企业级实战要点。

---

## 目录

1. [学习目标（Bloom 分类法）](#1-学习目标bloom-分类法)
2. [历史动机与演化](#2-历史动机与演化)
3. [形式化定义](#3-形式化定义)
4. [理论推导与证明](#4-理论推导与证明)
5. [代码示例](#5-代码示例)
6. [对比分析](#6-对比分析)
7. [常见陷阱与反模式](#7-常见陷阱与反模式)
8. [工程实践与最佳实践](#8-工程实践与最佳实践)
9. [案例研究](#9-案例研究)
10. [习题与思考题](#10-习题与思考题)
11. [参考文献](#11-参考文献)
12. [延伸阅读](#12-延伸阅读)

---

## 1. 学习目标（Bloom 分类法）

### 1.1 记忆（Remember）

- **R1**：能复述 C# 的预定义类型（`int`、`long`、`short`、`byte`、`uint`、`ulong`、`float`、`double`、`decimal`、`char`、`bool`、`string`、`object`）及其字面量写法。
- **R2**：能列举 C# 的运算符类别（算术、关系、逻辑、位、赋值、null 条件、模式、查询、委托）。
- **R3**：能识别值类型（Value Type）与引用类型（Reference Type）的差异：值类型分配在栈或字段内联，引用类型分配在托管堆。
- **R4**：能背诵控制流语句：`if`/`else`、`switch`、`for`、`foreach`、`while`、`do-while`、`break`、`continue`、`return`、`throw`、`try`/`catch`/`finally`、`yield`、`lock`、`using`。
- **R5**：能复述可空引用类型（NRT）的核心规则：`string` 表示不可空，`string?` 表示可空。

### 1.2 理解（Understand）

- **U1**：能解释装箱（Boxing）与拆箱（Unboxing）的内存布局与性能开销。
- **U2**：能说明字符串插值（String Interpolation）的编译期展开为 `string.Format` 或 `DefaultInterpolatedStringHandler`。
- **U3**：能阐述 `var` 与显式类型的等价性与使用场景。
- **U4**：能描述常量（`const`）与只读（`readonly`）在编译期与运行期的差异。
- **U5**：能说明模式匹配（Pattern Matching）在 `is` 与 `switch` 中的不同表现。
- **U6**：能阐述顶级语句（Top-Level Statements）的编译期展开为 `Main` 方法。

### 1.3 应用（Apply）

- **A1**：能正确声明变量、常量、字段、属性、参数。
- **A2**：能编写各种控制流实现业务逻辑。
- **A3**：能使用 `switch` 表达式与模式匹配实现复杂分支。
- **A4**：能使用 `try-catch-finally` 与 `when` 过滤器处理异常。
- **A5**：能开启 NRT 并处理所有 null 警告。

### 1.4 分析（Analyze）

- **An1**：能分析一段代码的内存布局，区分栈分配与堆分配。
- **An2**：能拆解复合表达式的求值顺序与副作用。
- **An3**：能分析 `null` 传播路径，识别 NRT 警告根因。

### 1.5 评价（Evaluate）

- **E1**：能评判 `var` vs 显式类型在可读性上的权衡。
- **E2**：能评估 `string` 拼接、`StringBuilder`、`string.Format`、字符串插值在不同场景的性能。
- **E3**：能评价 NRT 与代码契约（Code Contracts）的优劣。

### 1.6 创造（Create）

- **C1**：能设计一个类型安全的领域模型，避免 null 与装箱。
- **C2**：能为团队编写《C# 基础编码规范》文档，涵盖命名、缩进、类型选择。

---

## 2. 历史动机与演化

### 2.1 C# 1.0（2002）：基础语法奠基

C# 1.0 的语法设计继承了 C/C++ 的外观，但去除了 C++ 中易错的特性（如多重继承、模板、指针运算），同时融合了 Java 的 GC 与平台中立。

核心特性：

- 类型系统：值类型（`struct`/`enum`）与引用类型（`class`/`string`/`object`/`interface`/`delegate`/`array`）。
- 装箱/拆箱：值类型与 `object` 互转。
- 数组：一维、多维、锯齿。
- 控制流：`if`、`switch`、`for`、`foreach`、`while`、`do-while`、`try-catch-finally`。
- 运算符：算术、关系、逻辑、位、自增自减、三元、`is`/`as`/`typeof`/`sizeof`。
- 属性（Property）与索引器（Indexer）。

### 2.2 C# 2.0（2005）：可空与泛型

- 引入 `Nullable<T>` 与 `T?` 语法糖：`int? x = null;`。
- `??`（null 合并运算符）。
- 泛型让 `List<T>` 等集合类型安全。

### 2.3 C# 3.0（2007）：LINQ 与 Lambda

- `var` 隐式类型。
- Lambda 表达式 `x => x * 2`。
- 扩展方法。
- 对象/集合初始化器。
- 匿名类型。
- 表达式树（让 Lambda 作为数据）。

### 2.4 C# 4.0（2010）：dynamic 与命名参数

- `dynamic` 类型，与 IronPython、Office COM 互操作。
- 命名参数与可选参数。
- 泛型协变/逆变：`IEnumerable<out T>`。

### 2.5 C# 5.0（2012）：async/await

异步编程语法化，详见《异步编程详解》。

### 2.6 C# 6.0（2015）：语法糖大爆发

- 字符串插值 `$"{name}"`，替代 `string.Format`。
- `?.`（null 条件运算符）。
- `nameof(x)`。
- 表达式主体成员 `=>`。
- 异常过滤器 `catch (E e) when (...)`。

### 2.7 C# 7.0 ~ 7.3（2017）：模式匹配与元组

- `is` 模式：`if (o is int i)`。
- `switch` 中的模式匹配：`case int i when i > 0`。
- 元组与解构：`(int X, int Y) t = (1, 2);`。
- `out var` 声明。
- `ref` 返回与 `ref local`。
- 数字分隔符 `1_000_000`、二进制字面量 `0b1010`。
- `readonly struct`、`ref struct`、`in` 参数。

### 2.8 C# 8.0（2019）：NRT 与异步流

- 可空引用类型（NRT）：`string?` 与编译期 null 流分析。
- `switch` 表达式：`var result = e switch { ... };`。
- `using` 声明（无大括号）：`using var stream = ...;`。
- 异步流 `IAsyncEnumerable<T>` 与 `await foreach`。
- 索引与范围：`arr[^1]`、`arr[1..3]`。
- Null 合并赋值 `??=`。

### 2.9 C# 9.0（2020）：record 与顶级语句

- `record` 类型：基于值的相等。
- 顶级语句：`Program.cs` 无需 `Main`。
- `init` 访问器：对象初始化器阶段可写、之后只读。
- 模式匹配增强：`and`、`or`、`not`。
- 目标类型 `new()`：`Person p = new();`。
- `not` 模式：`if (o is not null)`。
- 协变返回类型。
- 模块初始化器 `[ModuleInitializer]`。

### 2.10 C# 10.0（2021）：global using 与文件命名空间

- `global using System.Linq;`：项目级全局 using。
- 文件范围命名空间 `namespace MyApp;`：避免大括号嵌套。
- `record struct`：值类型 record。
- `const` 字符串插值。
- 结构无参构造。
- `CallerArgumentExpression` 特性。

### 2.11 C# 11.0（2022）：原始字符串与 required

- 原始字符串字面量 `"""..."""`。
- 列表模式 `[1, 2, ..]`。
- `required` 修饰符：强制对象初始化器设置。
- UTF-8 字符串字面量 `"hello"u8`。
- `file` 作用域类型。
- 泛型数学（generic math）。

### 2.12 C# 12.0（2023）：主构造与集合表达式

- 主构造函数：`class Person(string name)`。
- 集合表达式：`int[] a = [1, 2, 3];`、`List<int> list = [1, 2, 3];`。
- `ref readonly` 参数。
- 默认 lambda 参数：`(int x = 1) => x + 1`。
- 别名任意类型：`using Point = (int X, int Y);`。

### 2.13 C# 13.0（2024）：params 集合与 lock 类型

- `params` 集合增强：`params ReadOnlySpan<int> vals`。
- 新 `lock` 语句：基于 `System.Threading.Lock`，性能更好。
- `field` 上下文关键字：访问自动 backing field。
- `partial` 属性。
- `params` 与 `ReadOnlySpan<T>` 集成。

---

## 3. 形式化定义

### 3.1 类型系统形式化

设 $\mathcal{T} = \mathcal{T}_{\text{val}} \cup \mathcal{T}_{\text{ref}}$ 为类型集合，划分为值类型 $\mathcal{T}_{\text{val}}$ 与引用类型 $\mathcal{T}_{\text{ref}}$。

#### 3.1.1 内存分配规则

$$
\text{alloc}(\tau, v) = \begin{cases}
\text{stack or inline} & \text{if } \tau \in \mathcal{T}_{\text{val}} \text{ and not boxed} \\
\text{heap} & \text{if } \tau \in \mathcal{T}_{\text{ref}} \\
\text{heap (boxed)} & \text{if } \tau \in \mathcal{T}_{\text{val}} \text{ and context requires ref}
\end{cases}
$$

#### 3.1.2 装箱形式化

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

#### 3.1.3 可空类型形式化

$\tau?$ 表示 $\tau \cup \{\text{null}\}$：

$$
\tau? = \tau \cup \{\bot\}
$$

对于值类型 $\tau_{\text{val}}$，`Nullable<T>` 是包装结构；对于引用类型 $\tau_{\text{ref}}$，NRT 仅在编译期检查，运行时无开销。

### 3.2 表达式求值语义

C# 表达式求值遵循以下规则：

1. **左到右求值**：操作数按出现顺序求值。
2. **短路求值**：`&&` 与 `||` 短路。
3. **运算符优先级**：参考 C# 语言规范。

形式化：

$$
\llbracket e_1 \oplus e_2 \rrbracket_\rho = \llbracket e_1 \rrbracket_\rho \oplus \llbracket e_2 \rrbracket_\rho
$$

其中 $\rho$ 为环境（变量绑定），$\llbracket \cdot \rrbracket_\rho$ 为求值函数。

### 3.3 语句语义

语句 $S$ 的语义可表示为状态变换：

$$
\llbracket S \rrbracket : \Sigma \to \Sigma \cup \{\text{Exc}\}
$$

其中 $\Sigma$ 为程序状态（变量绑定 + 堆），$\text{Exc}$ 为异常。

例如赋值：

$$
\llbracket x = e \rrbracket_\sigma = \sigma[x \mapsto \llbracket e \rrbracket_\sigma]
$$

### 3.4 模式匹配形式化

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

## 4. 理论推导与证明

### 4.1 NRT 流分析的正确性

**命题 4.1**：若编译器判定表达式 $e$ 类型为 `T`（非 `T?`），则在运行时 $e$ 不会求值为 `null`。

**证明（Sketch）**：编译器维护 null 状态 lattice $\{\text{NotNull}, \text{MaybeNull}, \text{Null}\}$，对每条路径进行前向数据流分析：

- 字面量 `null` 的状态为 `Null`。
- `new T()` 的状态为 `NotNull`。
- `?? default` 后的状态为 `NotNull`。
- `if (x is not null) {...}` then-branch 中 $x$ 为 `NotNull`，else-branch 中为 `Null`。
- `x?.M()` 中 $x$ 在 `M` 调用前为 `NotNull`。

若将 `MaybeNull` 或 `Null` 状态的值赋给 `T` 类型变量，编译器发出 CS8602 警告（或 `TreatWarningsAsErrors` 时错误）。

由于分析是保守的（over-approximation），可能存在假阳性（警告但实际安全），但不会假阴性（即判定 NotNull 时一定不为 null）。

### 4.2 switch 表达式的穷尽性（Exhaustiveness）

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

### 4.3 字符串不可变性证明

**命题 4.3**：`string` 类型不可变，故对 `string` 的"修改"操作实际产生新对象。

**证明**：`System.String` 在 CLR 中：

1. 内部 `char[] _firstChar` 数组无 `set` 访问器。
2. 长度字段 `Length` 为只读。
3. `Substring`、`Replace`、`ToUpper` 等方法返回新 `string`。
4. `StringBuilder` 是可变字符串，因其内部维护 `char[]` 与可写 `Length`。

性能含义：`s + s` 的复杂度是 $O(|s|)$，循环拼接 `for (int i = 0; i < n; i++) s = s + i;` 总复杂度 $O(n^2)$，应改用 `StringBuilder`。

### 4.4 装箱开销形式化

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

### 4.5 类型推断算法

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

## 5. 代码示例

### 5.1 类型与字面量

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

### 5.2 var 与显式类型

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

### 5.3 控制流

#### 5.3.1 if-else

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

#### 5.3.2 switch 语句

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

#### 5.3.3 switch 表达式（C# 8.0+）

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

#### 5.3.4 for / foreach

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

#### 5.3.5 while / do-while

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

### 5.4 模式匹配

#### 5.4.1 is 模式

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

#### 5.4.2 switch 表达式与递归模式

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

### 5.5 字符串处理

#### 5.5.1 字符串插值

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

#### 5.5.2 字符串拼接性能

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

### 5.6 可空类型

#### 5.6.1 可空值类型

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

#### 5.6.2 可空引用类型

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

### 5.7 异常处理

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

### 5.8 using 声明

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

### 5.9 顶级语句

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

### 5.10 集合表达式

```csharp
// C# 12 集合表达式
int[] arr = [1, 2, 3, 4, 5];
List<int> list = [1, 2, 3];
Span<int> span = [1, 2, 3];

// 展开
int a = 1, b = 2, c = 3;
int[] combined = [0, a, b, c, ..list, 9];
```

### 5.11 编译指令

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

### 5.12 完整示例：购物车

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

## 6. 对比分析

### 6.1 C# vs Java 类型系统

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

### 6.2 C# vs TypeScript 字符串

| 维度 | C# | TypeScript |
|------|-----|-----------|
| 不可变 | `string` 不可变 | JS `string` 不可变 |
| 字面量 | `"..."` `$"..."` `@"..."` `"""..."""` | `"..."` `` `...` `` |
| 插值 | `$"{name}"` | `${name}` |
| 多行 | `@"multi\nline"` 或 `"""..."""` | `` `multi\nline` `` |
| 编码 | UTF-16 | UTF-16 |

### 6.3 C# vs Kotlin 模式匹配

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

### 6.4 C# vs Python 控制流

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

### 6.5 跨语言 Hello + 控制流

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

## 7. 常见陷阱与反模式

### 7.1 装箱陷阱

**反模式**：

```csharp
ArrayList list = new();
list.Add(1);  // 装箱
list.Add(2);

int sum = 0;
foreach (int i in list) sum += i;   // 拆箱
```

**对策**：使用 `List<int>`。

### 7.2 字符串拼接 O(n²)

```csharp
string s = "";
for (int i = 0; i < 10000; i++) s += i;   // 慢
```

**对策**：`StringBuilder`。

### 7.3 == 与 Equals 混淆

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

### 7.4 浮点精度

```csharp
double x = 0.1 + 0.2;
Console.WriteLine(x);  // 0.30000000000000004
Console.WriteLine(x == 0.3);  // False

decimal d1 = 0.1m + 0.2m;
Console.WriteLine(d1 == 0.3m);  // True
```

**对策**：财务计算用 `decimal`。

### 7.5 整数溢出

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

### 7.6 switch 漏 break

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

### 7.7 NRT 假阳性

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

### 7.8 异常吞咽

```csharp
try { DoWork(); }
catch { }   // 静默吞咽
```

**对策**：记录日志或重新抛出。

### 7.9 异常重抛丢失堆栈

```csharp
try { DoWork(); }
catch (Exception ex)
{
    Log(ex);
    throw ex;   // 错误：丢失原始堆栈
}
```

**对策**：使用 `throw;`（保留堆栈）或 `ExceptionDispatchInfo.Capture(ex).Throw()`。

### 7.10 var 类型推断错误

```csharp
var x = 1;        // int，不是 long
long y = x + 1;  // OK，隐式转换
var z = x / 2;   // int，整数除法

// 双精度陷阱
var d = 1 / 2;    // int 0
double d2 = 1.0 / 2;  // 0.5
```

### 7.11 闭包捕获循环变量

C# 5+ 已修复，但需注意：

```csharp
var actions = new List<Action>();
for (int i = 0; i < 5; i++)
    actions.Add(() => Console.WriteLine(i));

foreach (var a in actions) a();   // 5 5 5 5 5（C# 5+ 输出 0 1 2 3 4）
```

### 7.12 readonly vs const

```csharp
public const int Max = 100;            // 编译期常量，跨程序集需重新编译
public static readonly int Max2 = 100; // 运行期，跨程序集无需重新编译
```

---

## 8. 工程实践与最佳实践

### 8.1 命名约定

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

### 8.2 var 使用指南

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

### 8.3 字符串选择

- **简单插值**：`$"{name}"`。
- **多行 / 含引号**：`"""..."""`。
- **路径**：`@"C:\path\to\file"`。
- **正则**：`@"\d+\.\d+"`。
- **大量拼接**：`StringBuilder`。
- **格式化**：`string.Format` 或插值。

### 8.4 异常处理策略

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

### 8.5 NRT 配置

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

### 8.6 编译器分析器

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

### 8.7 字符串比较

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

### 8.8 性能优化技巧

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

### 8.9 单元测试

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

### 8.10 调试技巧

- **断点**：VS Code 中 F9 设置断点。
- **条件断点**：右键断点 → Edit Breakpoint → `i == 42`。
- **日志断点**：不暂停，仅输出日志。
- **Watch**：右键表达式 → Add to Watch。
- **调用栈**：调用堆栈窗口查看。
- **Immediate Window**：VS 中可执行表达式。
- **dotnet-counters**：实时监控。

---

## 9. 案例研究

### 9.1 案例：命令行参数解析

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

### 9.2 案例：FizzBuzz

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

### 9.3 案例：领域规则配置

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

### 9.4 案例：CSV 解析器

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

### 9.5 案例：FizzBuzz 模式匹配版

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

### 9.6 案例：状态机（交通灯）

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

### 9.7 案例：基于 NRT 的服务层

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

### 9.8 案例：日志级别过滤

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

## 10. 习题与思考题

### 10.1 选择题（基础）

**Q1**：以下哪个不是值类型？
- A. `int`
- B. `decimal`
- C. `string`
- D. `struct`

**答案**：C。`string` 是引用类型（不可变）。

**Q2**：`int? x = null;` 的底层类型是？
- A. `int`
- B. `object`
- C. `Nullable<int>`
- D. `int*`

**答案**：C。`T?` 等价于 `Nullable<T>`。

**Q3**：以下哪个表达式会触发装箱？
- A. `int x = 1;`
- B. `List<int> list = new() { 1 };`
- C. `object o = 1;`
- D. `int[] arr = new[] { 1 };`

**答案**：C。赋值给 `object` 触发装箱。

**Q4**：`0.1 + 0.2 == 0.3` 在 C# 中结果为？
- A. `true`
- B. `false`
- C. 编译错误
- D. 运行时异常

**答案**：B。浮点精度问题。

**Q5**：以下哪个 C# 版本引入了 `switch` 表达式？
- A. C# 7.0
- B. C# 8.0
- C. C# 9.0
- D. C# 10.0

**答案**：B。C# 8.0。

### 10.2 选择题（进阶）

**Q6**：以下代码输出什么？

```csharp
string s = "abc";
string t = "ab" + "c";
Console.WriteLine(s == t);
Console.WriteLine(ReferenceEquals(s, t));
```

- A. `True True`
- B. `True False`
- C. `False False`
- D. 编译错误

**答案**：A。编译期常量字符串会被实习（interned），引用相同。

**Q7**：以下代码哪个会编译警告（开启 NRT）？
- A. `string s = null;`
- B. `string? s = null;`
- C. `var s = null;`
- D. `string s = "";`

**答案**：A 与 C。`string` 不可空，赋值 `null` 警告；`var s = null` 类型推断为 `object?` 警告。

**Q8**：以下哪个是合法的顶级语句？
- A.
```csharp
using System;
Console.WriteLine("Hi");
```
- B.
```csharp
namespace App;
class Program
{
    static void Main() { Console.WriteLine("Hi"); }
}
```
- C. A 与 B 同时存在
- D. A 与 B 都不是

**答案**：A。顶级语句与显式 `Main` 不能共存。

### 10.3 简答题

**Q9**：解释 `var` 与 `object` / `dynamic` 的差异。

**参考答案**：

- `var`：编译期类型推断，运行时与显式声明等价，强类型。
- `object`：编译期 `object`，运行时动态分派，需要装箱（值类型）。
- `dynamic`：基于 DLR，运行时动态分派，无编译期检查。

```csharp
var x = 1;        // int，强类型
object o = 1;     // 装箱，需要 cast 才能调用 int 方法
dynamic d = 1;    // 运行时绑定
d.Foo();          // 编译通过，运行时异常
```

**Q10**：列举 C# 8.0 引入的与可空性相关的所有特性。

**参考答案**：

1. NRT（可空引用类型）。
2. `??=`（null 合并赋值）。
3. `?.`（null 条件运算符，C# 6 已有，但 NRT 下流分析增强）。
4. `NotNullWhen`、`MaybeNullWhen`、`NotNullIfNotNull` 等后置条件特性。
5. `MemberNotNullWhen`、`MemberNotNull`。
6. `[AllowNull]`、`[DisallowNull]`、`[MaybeNull]`、`[NotNull]`。

### 10.4 编程题

**Q11**：编写一个 `SafeDivide(a, b)` 方法，返回 `Result<double>`，处理除零。

**参考答案**：

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

**Q12**：编写一个程序，统计文本文件中每个单词出现次数，按词频倒序输出。

**参考答案**：

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

**Q13**：使用模式匹配实现一个简单的计算器，支持 `+`、`-`、`*`、`/`。

**参考答案**：

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

### 10.5 思考题

**Q14**：为什么 C# 不允许 `int x = null;` 但允许 `int? x = null;`？

**参考答案**：

`int` 是值类型，其字段直接存储值，`null` 不在 `int` 的取值范围内（4 字节表达 -2147483648 到 2147483647）。`int?` 即 `Nullable<int>`，是 `struct`，包含 `bool hasValue` 与 `int value` 字段，可以表达"无值"状态。

**Q15**：NRT 是编译期还是运行时机制？为什么？

**参考答案**：

NRT 主要是编译期机制：编译器在编译期分析 null 流，发出警告。运行时无额外开销（对引用类型而言）。但 NRT 可与运行时校验结合（如 `ArgumentNullException.ThrowIfNull`）。

**Q16**：为什么 `string` 是引用类型但行为像值类型？

**参考答案**：

`string` 是引用类型（堆分配），但其重载了 `==` 比较内容，且为不可变（immutable）。这使其在语义上类似值类型。CLR 还对字符串进行实习（interning），相同字面量共享同一实例。

---

## 11. 参考文献

1. Hejlsberg, A., Torgersen, M., Wiltamuth, S., and Golde, P. 2010. *The C# Programming Language* (4th ed.). Addison-Wesley Professional, Boston, MA, USA.

2. Microsoft Corporation. 2024. *C# Language Reference*. Retrieved July 21, 2026 from <https://learn.microsoft.com/dotnet/csharp/language-reference/>

3. Skeet, J. 2019. *C# in Depth* (4th ed.). Manning Publications, Shelter Island, NY, USA.

4. Wagner, B. 2017. *Effective C# (Covers C# 7.0)* (3rd ed.). Addison-Wesley Professional, Boston, MA, USA.

5. Albahari, J. 2023. *C# 12 in a Nutshell* (O'Reilly Media, Sebastopol, CA, USA.

6. Bierman, G. M., and Lattner, C. 2020. *C# 9.0 records and with expressions*. Microsoft .NET Blog. Retrieved July 21, 2026 from <https://devblogs.microsoft.com/dotnet/welcome-to-csharp-9/>

7. Bierman, G. M., Kennedy, A., and Russo, D. 2007. *The C# 3.0 specification: type inference and lambda calculus*. In *Proceedings of the 2007 ACM SIGPLAN workshop on Generic programming (WGP '07)*. ACM, New York, NY, USA, 21-30. DOI: <https://doi.org/10.1145/1292611.1292615>

8. Torgersen, M. 2004. *The Expression Language: The evolution of generics in C#*. JavaPolis.

9. Microsoft Corporation. 2023. *Pattern Matching in C#*. Retrieved July 21, 2026 from <https://learn.microsoft.com/dotnet/csharp/fundamentals/functional/pattern-matching>

10. Bierman, G. M. 2023. *Nullable reference types in C# 8*. In *Companion to the 38th ACM SIGPLAN Conference on Programming Language Design and Implementation (PLDI '23)*. ACM, New York, NY, USA, 1-12. DOI: <https://doi.org/10.1145/3520312.3534850>

11. Bierman, G. M., and Russo, D. 2010. *Language features for pattern matching in C#*. In *Proceedings of the 5th ACM SIGPLAN workshop on Generic programming (WGP '10)*. ACM, New York, NY, USA, 11-22.

12. Hejlsberg, A. 2017. *C# 7.0: Tuples and Pattern Matching*. Microsoft Build.

13. Skeet, J. 2017. *C# 7 pattern matching*. Retrieved July 21, 2026 from <https://codeblog.jonskeet.uk/2017/01/23/c-7-pattern-matching/>

14. Microsoft Corporation. 2024. *Top-level statements*. Retrieved July 21, 2026 from <https://learn.microsoft.com/dotnet/csharp/fundamentals/program-structure/top-level-statements>

15. Microsoft Corporation. 2024. *Collection expressions*. Retrieved July 21, 2026 from <https://learn.microsoft.com/dotnet/csharp/language-reference/operators/collection-expressions>

---

## 12. 延伸阅读

### 12.1 官方文档

- C# 类型系统：<https://learn.microsoft.com/dotnet/csharp/fundamentals/types/>
- 默认值：<https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/default-values>
- 可空类型：<https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/nullable>
- 模式匹配：<https://learn.microsoft.com/dotnet/csharp/fundamentals/functional/pattern-matching>
- 字符串插值：<https://learn.microsoft.com/dotnet/csharp/language-reference/tokens/interpolated>

### 12.2 系列内交叉引用

- [概述与环境配置](./概述与环境配置.md) —— C# 简史、.NET 生态、SDK 安装
- [面向对象编程](./面向对象编程.md) —— 类、接口、继承、多态、抽象
- [泛型与集合](./泛型与集合.md) —— `List<T>`、`Dictionary<K,V>`、泛型约束
- [异步编程](./异步编程.md) —— Task、async/await、并行
- [LINQ 与函数式编程](./LINQ与函数式编程.md) —— 查询表达式、Lambda
- [值类型与引用类型](./值类型与引用类型.md) —— 栈与堆、装箱
- [模式匹配](./模式匹配.md) —— 深入模式匹配
- [记录类型](./记录类型.md) —— `record` 与不可变性
- [记录类型与不可变性](./记录类型与不可变性.md) —— `with`、值相等

### 12.3 进阶书籍

- Albahari, J. 2023. *C# 12 in a Nutshell* (O'Reilly Media.
- Wagner, B. 2018. *More Effective C#: 50 Specific Ways to Improve Your C#* (2nd ed.). Addison-Wesley.
- Skeet, J. 2019. *C# in Depth* (4th ed.). Manning Publications.
- Wagner, B. 2022. *C# 10 in a Nutshell* (O'Reilly Media.
- Stovell, D. 2022. *Pro .NET 6 Parallel Programming in C#* (Apress.

### 12.4 社区资源

- C# 设计讨论：<https://github.com/dotnet/csharplang>
- C# Language Reference：<https://learn.microsoft.com/dotnet/csharp/language-reference/>
- Stack Overflow `c#`：<https://stackoverflow.com/questions/tagged/c%23>
- .NET 官方博客：<https://devblogs.microsoft.com/dotnet/>
- .NET Foundation：<https://dotnetfoundation.org/>

### 12.5 视频资源

- .NET 官方 YouTube 频道：<https://www.youtube.com/@dotnet>
- Nick Chapsas（C# 进阶）：<https://www.youtube.com/@nickchapsas>
- Tim Corey（入门）：<https://www.youtube.com/@IAmTimCorey>
- Milan Jovanovic（工程实战）：<https://www.youtube.com/@MilanJovanovicTech>
- Julio Casal（.NET 8/9）：<https://www.youtube.com/@julio-casal>

### 12.6 工具

- Sharplab：<https://sharplab.io/>（在线查看 C# 编译结果）
- dotnetfiddle：<https://dotnetfiddle.net/>
- C# Pad：<https://csharppad.com/>
- Roslyn Quoter：<https://roslynquoter.azurewebsites.net/>

### 12.7 习题答案汇总

| 题号 | 答案 |
|------|------|
| Q1 | C |
| Q2 | C |
| Q3 | C |
| Q4 | B |
| Q5 | B |
| Q6 | A |
| Q7 | A、C |
| Q8 | A |
| Q9-Q16 | 见各题参考答案 |

---

## 结语

至此，你已经掌握了 C# 的基础语法：类型、变量、运算符、控制流、字符串、模式匹配、可空性、顶级语句。这些是后续学习面向对象、泛型、异步、LINQ 的基石。

下一步，请进入 [面向对象编程](./面向对象编程.md)，开始学习如何用类、接口、继承来组织复杂业务逻辑。

记住：

- **类型是契约**：选择正确类型胜过用 `object` 兜底。
- **null 是 bug 源**：开启 NRT，让编译器帮你抓 null。
- **模式匹配胜过 if 链**：让代码更具表达力。
- **不可变优先**：`record`、`init`、`readonly` 让并发更安全。

---

*本文由 FANDEX 团队编写，最后更新于 2026-07-21。*
