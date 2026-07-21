---
order: 63
title: 'C#12与C#13新特性'
module: csharp
category: 'C#'
difficulty: intermediate
description: '最新C#语言特性'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'csharp/CSharp与依赖注入'
  - 'csharp/CSharp与最小API'
  - 'csharp/CSharp与反射'
  - csharp/LINQ延迟与立即执行
prerequisites:
  - csharp/概述与环境配置
---

## 一、概述

C# 12 与 C# 13 是 Microsoft 在 .NET 8（2023 年 11 月）与 .NET 9（2024 年 11 月）发布周期中推出的两个语言版本。它们延续了 C# 自诞生以来的"持续演进、低破坏性、面向生产力"的设计哲学，引入了一系列让代码更简洁、更安全、更高效的语法特性。C# 12 的代表特性包括主构造函数（Primary Constructors）、集合表达式（Collection Expressions）、内联数组（Inline Arrays）、别名任意类型（Alias Any Type）等；C# 13 则带来了 `params` 集合（Params Collections）、新的 `Lock` 类型、部分属性（Partial Properties）、`field` 上下文关键字（预览）、扩展类型（Extension Types，预览）等。

### 1.1 为什么需要关注新特性

每一项新特性都不是凭空设计的，它们都是对现有语法痛点的回应：

- **主构造函数**回应了依赖注入场景下大量样板代码的问题。在 ASP.NET Core、Worker Service 等现代 .NET 应用中，几乎每个服务类都需要在构造函数中注入若干依赖，传统写法需要"声明字段 → 编写构造函数 → 在构造函数中赋值"三步，主构造函数将这三步压缩为类声明的一部分。
- **集合表达式**回应了 C# 历史上集合初始化语法碎片化的问题。在 C# 12 之前，初始化数组、`List<T>`、`Span<T>`、`ImmutableArray<T>` 各有不同的语法，集合表达式用统一的方括号语法 `[...]` 统一了它们。
- **`params` 集合**回应了可变参数方法只能使用数组的问题。在性能敏感场景中，每次调用 `params object[]` 都会产生数组分配，`params ReadOnlySpan<T>` 让可变参数方法实现零分配。
- **新的 `Lock` 类型**回应了 `lock` 语句基于 `object` 类型导致的类型安全问题。`System.Threading.Lock` 是专用类型，编译器可以在未来版本中针对它生成更高效的同步代码。
- **扩展类型（预览）**回应了扩展方法只能扩展"方法"而不能扩展属性、静态成员的问题。这是 C# 自 C# 3.0 引入扩展方法以来最大的一次扩展性改进。

掌握这些特性不仅能提升编码效率，更能让代码符合现代 C# 风格，便于与社区代码、开源项目接轨。

### 1.2 C# 与 .NET 的版本关系

许多初学者会混淆 C# 版本与 .NET 版本。简单来说：

- **C# 语言版本**由编译器（Roslyn）决定，每个 C# 版本对应一组语法特性。
- **.NET 运行时版本**由 CLR 决定，每个 .NET 版本提供一组运行时库与 API。

C# 12 随 .NET 8 发布，C# 13 随 .NET 9 发布。但 C# 与 .NET 的版本并非完全绑定——你可以通过 `<LangVersion>` 项目属性在较新的 .NET 上使用较旧的 C# 版本，或在较旧的 .NET 上使用部分较新的 C# 特性（前提是该特性不依赖新运行时）。

| C# 版本 | 发布时间 | 对应 .NET 版本 | 代表特性 |
|---------|---------|---------------|---------|
| C# 11 | 2022.11 | .NET 7 | 列表模式、原始字符串字面量、`required` 成员 |
| C# 12 | 2023.11 | .NET 8 | 主构造函数、集合表达式、内联数组 |
| C# 13 | 2024.11 | .NET 9 | `params` 集合、`Lock` 类型、部分属性、扩展类型（预览） |
| C# 14 | 2025.11 | .NET 10 | 扩展类型（正式）、`field` 关键字、无条件插值字符串 |

### 1.3 学习路径

本章假设你已经熟悉 C# 基础语法、面向对象、泛型、`async/await`。学完本章后，你将能够：

1. 理解 C# 12 与 C# 13 每个新特性的设计动机与适用场景。
2. 在项目中正确使用主构造函数、集合表达式等高频特性。
3. 评估每个新特性的性能影响，特别是 `params` 集合、内联数组等性能导向特性。
4. 在 Native AOT 场景下选择合适的特性（如源生成器替代反射）。
5. 识别新特性的陷阱与限制，避免在生产代码中误用预览特性。

## 二、历史演进

理解 C# 12/13 的特性设计，需要回顾 C# 语言演进的整体脉络。C# 自 2000 年发布以来，经历了"引入特性 → 完善特性 → 简化语法"的循环。

### 2.1 C# 1.0 - 5.0：奠基阶段（2002-2012）

C# 1.0 奠定了语言基础（类、接口、委托、事件）。C# 2.0 引入泛型、可空类型、迭代器。C# 3.0 引入 LINQ、Lambda 表达式、扩展方法、匿名类型，这是 C# 历史上最重要的一次演进。C# 4.0 引入动态语言运行时（`dynamic`）、命名参数、协变逆变。C# 5.0 引入 `async/await`，彻底改变了异步编程。

这一阶段的特性主要解决"功能缺失"问题——把其他语言已有的特性补齐。

### 2.2 C# 6.0 - 9.0：生产力阶段（2015-2020）

C# 6.0 引入字符串插值、`nameof` 表达式、null 条件运算符、自动属性初始化器、表达式体成员。C# 7.0 引入模式匹配、元组、本地函数、`out var` 声明。C# 8.0 引入可空引用类型、异步流、`switch` 表达式、`using` 声明。C# 9.0 引入记录类型（`record`）、顶层语句、`init` 访问器、目标类型 `new`。

这一阶段的特性主要解决"样板代码过多"问题——通过语法糖让常见代码更简洁。

### 2.3 C# 10.0 - 11.0：现代化阶段（2021-2022）

C# 10.0 引入全局 `using`、文件作用域命名空间、`record struct`、常量插值字符串。C# 11.0 引入列表模式、原始字符串字面量、`required` 成员、`abstract static` 接口成员、`scoped` 关键字、UTF-8 字符串字面量。

这一阶段的特性开始关注性能（`scoped`、UTF-8 字面量、`abstract static`）与代码契约（`required`），同时继续推进语法简化。

### 2.4 C# 12：极简与性能并重（2023）

C# 12 在"简化语法"与"提升性能"两个方向同时发力：

- **极简方向**：主构造函数、集合表达式、别名任意类型让常见代码更简洁。
- **性能方向**：内联数组（Inline Arrays）、`ref readonly` 参数、`ref struct` 在 `async`/迭代器中的有限支持，让高性能场景有了更多语言级工具。

C# 12 还引入了实验性的拦截器（Interceptors）特性，允许在编译时重写方法调用，这是未来源生成器、AOT 优化的重要基础。

### 2.5 C# 13：类型安全与扩展性（2024）

C# 13 的特性更分散，但都有共同主题——**类型安全与扩展性**：

- **类型安全**：`Lock` 类型替代 `object` 作为锁对象，避免误用；部分属性让源生成器生成的代码更安全；`field` 上下文关键字（预览）让属性可以引用后台字段而不显式声明。
- **扩展性**：扩展类型（预览）是自 C# 3.0 扩展方法以来最大的一次扩展性改进，允许为现有类型添加属性、静态成员、甚至运算符。
- **性能**：`params` 集合让可变参数方法可以零分配；`ref struct` 在泛型中的有限支持（`allows ref struct`）让 `Span<T>` 等类型可以更广泛地使用。

### 2.6 C# 演进的总体趋势

从 C# 1.0 到 C# 13，可以观察到几个明显趋势：

1. **从命令式到声明式**：模式匹配、`record`、`required` 等特性让代码越来越像"声明意图"而非"描述步骤"。
2. **从运行时到编译时**：源生成器、拦截器、`LibraryImport` 等特性把越来越多工作前移到编译时，既提升性能又支持 AOT。
3. **从堆分配到栈分配**：`Span<T>`、`ref struct`、`stackalloc`、集合表达式等特性让 C# 可以在栈上完成更多工作，减少 GC 压力。
4. **从动态到静态**：可空引用类型、`Lock` 类型、`field` 关键字等特性增强类型安全，让编译器在编译时捕获更多错误。

## 三、核心概念

### 3.1 主构造函数（Primary Constructors）

主构造函数是 C# 12 引入的最直观的新特性。它允许将构造函数参数直接声明在类或结构体的类型声明中，参数在整个类体内可访问。

```csharp
// C# 12 之前：传统构造函数
public class UserService
{
    private readonly IUserRepository _repository;
    private readonly ILogger<UserService> _logger;

    public UserService(IUserRepository repository, ILogger<UserService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public User? GetUser(int id)
    {
        _logger.LogInformation("获取用户 {Id}", id);
        return _repository.GetById(id);
    }
}

// C# 12：主构造函数，参数直接放在类名后
public class UserService(IUserRepository repository, ILogger<UserService> logger)
{
    public User? GetUser(int id)
    {
        logger.LogInformation("获取用户 {Id}", id);
        return repository.GetById(id);
    }
}
```

主构造函数参数的关键特征：

1. **参数不是字段**：主构造函数参数在底层被编译为私有字段，但在 C# 代码层面它们不是字段，而是"参数"。这意味着你不能在类外部访问它们，也不能用 `this._repository` 这样的方式引用。
2. **参数在整个类体内可访问**：所有实例方法、属性、其他构造函数都可以访问这些参数。
3. **参数是只读的**：除非显式捕获到可变字段，否则主构造函数参数在方法内是只读的。
4. **不会自动生成属性**：与 `record` 类型不同，普通类的主构造函数参数不会自动生成公共属性。如果需要公共访问，必须显式声明属性。

```csharp
public class Person(string name, int age)
{
    // 显式声明属性以暴露参数
    public string Name { get; } = name;
    public int Age { get; set; } = age;

    // 可以在方法中直接使用参数
    public void Greet() => Console.WriteLine($"我是 {name}，{age} 岁");

    // 可以在其他构造函数中调用主构造函数
    public Person() : this("未知", 0) { }
    public Person(string name) : this(name, 18) { }
}
```

### 3.2 集合表达式（Collection Expressions）

集合表达式是 C# 12 引入的统一集合初始化语法。在 C# 12 之前，初始化不同类型的集合需要不同语法：

```csharp
// C# 12 之前的多种初始化语法
int[] arr1 = new[] { 1, 2, 3 };
int[] arr2 = new int[] { 1, 2, 3 };
List<int> list1 = new List<int> { 1, 2, 3 };
List<int> list2 = new() { 1, 2, 3 };
Span<int> span1 = stackalloc int[] { 1, 2, 3 };
ImmutableArray<int> imm1 = ImmutableArray.Create(1, 2, 3);
HashSet<int> set1 = new HashSet<int> { 1, 2, 3 };

// C# 12：统一的方括号语法
int[] arr = [1, 2, 3];
List<int> list = [1, 2, 3];
Span<int> span = [1, 2, 3];
ImmutableArray<int> imm = [1, 2, 3];
HashSet<int> set = [1, 2, 3];
ReadOnlySpan<int> ros = [1, 2, 3];
```

集合表达式的核心是**目标类型推断**：编译器根据赋值目标（左侧的类型）决定如何构造集合。这意味着 `[]` 本身没有类型，必须由上下文确定。

集合表达式还支持**展开运算符**（Spread Operator）`..`，用于将一个可枚举集合展开到当前集合中：

```csharp
int[] a = [1, 2, 3];
int[] b = [4, 5, 6];

// 展开运算符
int[] combined = [..a, ..b, 7, 8];
// 结果: [1, 2, 3, 4, 5, 6, 7, 8]

// 混合展开与字面量
List<int> result = [0, ..a, 100, ..b, 200];
// 结果: [0, 1, 2, 3, 100, 4, 5, 6, 200]

// 空集合
List<int> empty = [];

// 实际应用：合并配置
string[] defaults = ["config.json", "appsettings.json"];
string[] overrides = ["local.json"];
string[] allConfigs = [..defaults, ..overrides];
```

集合表达式支持的类型：

| 类型 | C# 12 支持 | 说明 |
|------|-----------|------|
| 一维数组 `T[]` | 是 | 编译为 `new T[]{...}` |
| `Span<T>`、`ReadOnlySpan<T>` | 是 | 优先使用 `stackalloc` |
| `List<T>` | 是 | 编译为 `new List<T>{...}.AddRange(...)` |
| `IEnumerable<T>` | 是 | 回退到 `List<T>` |
| `HashSet<T>`、`SortedSet<T>` | 是 | 调用 `Add` 方法 |
| `ImmutableArray<T>` 等不可变集合 | 是 | 调用 `Create` |
| 自定义集合（实现 `Add` 方法） | 是 | 通过集合构建器模式 |
| 二维数组 `T[,]` | 否 | 不支持 |
| `Dictionary<TKey, TValue>` | 否 | C# 12 不支持，需用旧语法 |

### 3.3 内联数组（Inline Arrays）

内联数组是 C# 12 引入的高性能数组类型。它是一个固定大小的结构体数组，元素直接存储在结构体内部，不会产生堆分配。内联数组主要用于性能敏感场景，如网络缓冲区、图形渲染、与原生 API 互操作。

```csharp
// 声明内联数组：固定 4 个元素
[System.Runtime.CompilerServices.InlineArray(4)]
public struct Buffer4<T>
{
    // 只需声明第一个元素，编译器自动生成其余 3 个的存储空间
    private T _element0;
}

// 使用内联数组
var buffer = new Buffer4<int>();
buffer[0] = 10;
buffer[1] = 20;
buffer[2] = 30;
buffer[3] = 40;

// 支持索引访问（通过编译器生成的索引器）
Console.WriteLine(buffer[0]);  // 10

// 支持遍历
foreach (var item in buffer)
{
    Console.WriteLine(item);
}
```

内联数组在底层是一个结构体，所有元素在结构体内联存储。一个 `Buffer4<int>` 的大小是 16 字节（4 个 `int`），与 `int[4]` 数组的内容部分相同，但没有任何对象头、长度字段的开销。

### 3.4 ref readonly 参数

C# 12 引入了 `ref readonly` 参数修饰符，它是 `in` 参数的"明确版"。`in` 参数表示"按引用传递但不允许修改"，但 `in` 关键字在调用端可以省略，导致语义不明确。`ref readonly` 在调用端必须显式写 `ref` 或 `in`，让意图更清晰。

```csharp
public readonly struct BigMatrix
{
    public double M00, M01, M10, M11;
}

// ref readonly 参数：传入引用但不允许修改
public double Determinant(ref readonly BigMatrix m)
{
    return m.M00 * m.M11 - m.M01 * m.M10;
}

// 调用时必须显式写 ref 或 in
var matrix = new BigMatrix { M00 = 1, M01 = 2, M10 = 3, M11 = 4 };

// 方式一：使用 ref
var det1 = Determinant(ref matrix);

// 方式二：使用 in（也合法）
var det2 = Determinant(in matrix);

// 错误：必须显式写 ref 或 in
// var det3 = Determinant(matrix);  // 编译错误
```

`ref readonly` 主要用于大型结构体（如矩阵、向量、复杂配置结构），避免按值传递产生的拷贝开销，同时保证不可变性。

### 3.5 别名任意类型（Alias Any Type）

C# 12 之前，`using` 别名只能用于命名类型（类、结构、接口、委托、枚举）。C# 12 放宽了这一限制，允许为元组、数组、指针、函数指针等任何类型创建别名。

```csharp
// C# 12 之前：只能为命名类型创建别名
using StringList = System.Collections.Generic.List<string>;
using UserDict = System.Collections.Generic.Dictionary<string, User>;

// C# 12：可以为任意类型创建别名
using Point = (int X, int Y);                    // 元组别名
using Matrix = double[,];                        // 二维数组别名
using IntArray = int[];                          // 一维数组别名
using Callback = delegate*<int, void>;           // 函数指针别名
using StringSpan = System.ReadOnlySpan<string>;  // 已有类型也可以

// 使用别名
Point p = (10, 20);
Console.WriteLine($"X: {p.X}, Y: {p.Y}");

Matrix m = new double[3, 3];
IntArray arr = [1, 2, 3];
```

别名任意类型主要提升代码可读性，特别是当类型签名复杂时（如元组、多维数组、函数指针）。

### 3.6 params 集合（C# 13）

C# 13 之前，`params` 关键字只能用于数组。C# 13 放宽了这一限制，允许 `params` 用于任何可识别的集合类型，包括 `ReadOnlySpan<T>`、`Span<T>`、`List<T>`、`IEnumerable<T>` 等。

```csharp
// C# 13 之前：params 只支持数组
public void Print(params string[] items) { }

// C# 13：params 支持任何集合类型
public void Print(params ReadOnlySpan<string> items)
{
    foreach (var item in items)
    {
        Console.WriteLine(item);
    }
}

// 调用方式不变
Print("hello", "world", "!");

// 也可以使用 List<T>
public void Process(params List<int> numbers)
{
    numbers.Add(999);
}

// 使用 ReadOnlySpan<T> 的 params 避免了数组分配
// 在性能敏感场景中非常有用
public double Average(params ReadOnlySpan<double> values)
{
    if (values.IsEmpty) return 0;
    double sum = 0;
    foreach (var v in values) sum += v;
    return sum / values.Length;
}

// 调用时编译器会在栈上分配 span，零堆分配
double avg = Average(1.0, 2.0, 3.0, 4.0, 5.0);
```

`params ReadOnlySpan<T>` 的关键价值是**零堆分配**：编译器在调用栈上分配空间存储参数，避免了传统 `params T[]` 的数组分配。在热路径中，这可以显著降低 GC 压力。

### 3.7 新的 Lock 类型（C# 13）

C# 13 引入了 `System.Threading.Lock` 类型，作为 `lock` 语句的专用锁对象。传统上 C# 的 `lock` 语句基于 `object` 类型：

```csharp
// 传统写法：lock 基于 object
private readonly object _lockObj = new();
lock (_lockObj)
{
    // 临界区代码
}
```

这种写法的问题在于 `object` 类型过于宽泛，任何对象都可以作为锁，容易导致误用（如锁字符串、锁 `this`、锁类型对象）。`System.Threading.Lock` 是专用类型，意图明确：

```csharp
// C# 13 新写法：专用 Lock 类型
private readonly Lock _lock = new();

// 方式一：使用 lock 语句（C# 13 编译器会针对 Lock 类型生成更优代码）
lock (_lock)
{
    // 临界区代码
}

// 方式二：使用 EnterScope 显式管理
using (_lock.EnterScope())
{
    // 临界区代码
    // 离开 using 块时自动释放锁
}

// 方式三：手动 Enter/Exit
_lock.Enter();
try
{
    // 临界区代码
}
finally
{
    _lock.Exit();
}
```

`Lock` 类型的优势：

1. **类型安全**：专用类型，避免误用其他对象作为锁。
2. **性能优化空间**：未来 .NET 版本可以针对 `Lock` 类型生成更高效的同步代码（如基于轻量级用户态锁）。
3. **API 更明确**：`EnterScope` 返回 `Ref` 结构体，`using` 模式让锁的范围更清晰。

### 3.8 部分属性（Partial Properties）

C# 13 引入了部分属性，允许属性的声明与实现分离在不同文件中。这与部分方法（Partial Methods）类似，主要用于源生成器场景。

```csharp
// 文件 1：ViewModel.cs（手写）
public partial class ViewModel
{
    // 声明部分：只有签名，没有实现
    public partial string Name { get; set; }
}

// 文件 2：ViewModel.generated.cs（源生成器生成）
public partial class ViewModel
{
    private string _name = "";
    public partial string Name
    {
        get => _name;
        set => _name = value;
    }
}
```

部分属性的主要应用场景：

1. **源生成器**：源生成器可以为属性生成 `INotifyPropertyChanged` 通知逻辑、验证逻辑、序列化逻辑。
2. **MVVM 框架**：如 `CommunityToolkit.Mvvm` 的 `[ObservableProperty]` 特性可以基于部分属性生成更干净的代码。
3. **DTO 生成**：从接口或 schema 自动生成属性实现。

### 3.9 field 上下文关键字（C# 13 预览）

C# 13 引入了 `field` 上下文关键字（预览特性），允许在属性访问器中引用自动生成的后台字段，而不需要显式声明字段。

```csharp
// C# 13 之前：需要显式声明后台字段
public class Person
{
    private string _name = "";

    public string Name
    {
        get => _name;
        set
        {
            if (string.IsNullOrEmpty(value))
                throw new ArgumentNullException(nameof(value));
            _name = value;
        }
    }
}

// C# 13（预览）：使用 field 关键字
public class Person
{
    public string Name
    {
        get;
        set
        {
            if (string.IsNullOrEmpty(value))
                throw new ArgumentNullException(nameof(value));
            field = value;
        }
    } = "";  // 仍然可以使用初始化器
}
```

`field` 关键字让属性可以在不显式声明字段的情况下，仍然在访问器中引用后台字段。这避免了样板代码，同时保留了自定义访问器逻辑的能力。

### 3.10 扩展类型（C# 13 预览）

扩展类型是 C# 13 引入的预览特性，是自 C# 3.0 扩展方法以来最大的一次扩展性改进。它允许为现有类型添加属性、静态成员、甚至运算符，而不仅限于方法。

```csharp
// C# 3.0 之前的扩展方法（静态类 + this 参数）
public static class StringExtensions
{
    public static bool IsNullOrEmpty(this string s) => string.IsNullOrEmpty(s);
    public static string Reversed(this string s) => new string(s.Reverse().ToArray());
}

// C# 13 预览：扩展类型
extension StringExtensions for string
{
    // 为 string 添加实例方法
    public bool IsNullOrEmpty() => string.IsNullOrEmpty(this);

    // 为 string 添加属性
    public string Reversed => new string(this.Reverse().ToArray());

    // 为 string 添加静态成员
    public static string Empty => "";
}

// 使用扩展
string name = "hello";
if (name.IsNullOrEmpty())
{
    Console.WriteLine("空字符串");
}
Console.WriteLine(name.Reversed);  // "olleh"
```

扩展类型的优势：

1. **支持属性**：扩展方法只能扩展方法，扩展类型可以扩展属性、索引器、运算符。
2. **支持静态成员**：可以为类型添加静态属性、静态方法。
3. **更清晰的语法**：扩展类型把所有扩展集中在一个块中，比分散的扩展方法更易维护。

需要注意，扩展类型在 C# 13 中是预览特性，需要启用 `<Features>preview</Features>` 才能使用，正式发布在 C# 14。

### 3.11 其他 C# 13 改进

C# 13 还引入了一些较小的改进：

**转义字符 `\e`**：替代 `\x1B` 表示 ESC 字符，用于终端控制序列。

```csharp
// C# 13 之前
string ansiColor = "\x1B[31m红色文本\x1B[0m";

// C# 13
string ansiColor = "\e[31m红色文本\e[0m";
```

**方法组自然类型改进**：方法组的类型推断更智能，可以推断出更精确的委托类型。

```csharp
// C# 13 之前：方法组需要显式类型参数
Func<string, bool> predicate = string.IsNullOrEmpty;

// C# 13：方法组自然类型改进
var predicate = string.IsNullOrEmpty;  // 推断为 Func<string?, bool>
```

**隐式索引器访问**：在对象初始化器中可以使用索引。

```csharp
// C# 13：对象初始化器中的隐式索引器
var dict = new Dictionary<string, int>
{
    ["one"] = 1,
    ["two"] = 2
};

// 也可以在 with 表达式中使用
var point = new Point { X = 1, Y = 2 };
var moved = point with { [0] = 10 };  // 假设 Point 支持索引器
```

**`ref struct` 在泛型中的有限支持**：通过 `allows ref struct` 约束，允许 `ref struct` 类型作为泛型参数。

```csharp
// C# 13：允许 ref struct 作为泛型参数
public class SpanWrapper<T> where T : allows ref struct
{
    public T Value { get; init; }
}

// 使用
var wrapper = new SpanWrapper<Span<int>> { Value = [1, 2, 3] };
```

**重载解析优先级**：通过 `[OverloadResolutionPriority]` 特性控制重载解析优先级，主要用于库作者平滑过渡 API。

```csharp
[OverloadResolutionPriority(1)]
public void Process(ReadOnlySpan<int> data) { /* 优先选择 */ }

[OverloadResolutionPriority(0)]
public void Process(int[] data) { /* 次优选择 */ }
```

## 四、工作原理

### 4.1 主构造函数的底层实现

主构造函数在底层如何工作？让我们看一段简单的代码与编译器生成的等价代码：

```csharp
// 源代码
public class UserService(IUserRepository repository, ILogger<UserService> logger)
{
    public User? GetUser(int id)
    {
        logger.LogInformation("获取用户 {Id}", id);
        return repository.GetById(id);
    }
}

// 编译器生成的等价代码（简化）
public class UserService
{
    private readonly IUserRepository _repository;
    private readonly ILogger<UserService> _logger;

    public UserService(IUserRepository repository, ILogger<UserService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public User? GetUser(int id)
    {
        _logger.LogInformation("获取用户 {Id}", id);
        return _repository.GetById(id);
    }
}
```

关键点：

1. 主构造函数参数被编译为**私有只读字段**。
2. 编译器生成一个构造函数，将参数赋值给字段。
3. 类体内对参数的引用被替换为对字段的引用。

但是，如果你显式声明了一个与参数同名的属性，编译器不会生成字段，而是直接引用属性：

```csharp
public class Person(string name, int age)
{
    public string Name { get; } = name;  // 这里的 name 是参数
    public int Age { get; set; } = age;
}

// 编译器生成的代码
public class Person
{
    private readonly string _name;  // 为 name 参数生成字段
    public string Name { get; }
    public int Age { get; set; }

    public Person(string name, int age)
    {
        _name = name;
        Name = name;  // 属性初始化器引用参数
        Age = age;
    }
}
```

这里有一个微妙之处：编译器只为"被类体内方法引用的参数"生成字段。如果参数只在属性初始化器中使用一次，编译器可能不会生成字段，而是直接传递给属性。

### 4.2 集合表达式的构建器模式

集合表达式底层使用"集合构建器"（Collection Builder）模式。编译器根据目标类型选择不同的构建策略：

```csharp
// 源代码
List<int> list = [1, 2, 3];
int[] arr = [1, 2, 3];
Span<int> span = [1, 2, 3];
ImmutableArray<int> imm = [1, 2, 3];

// 编译器生成的代码（简化）
List<int> list = new List<int>(3);
list.Add(1);
list.Add(2);
list.Add(3);

int[] arr = new int[] { 1, 2, 3 };

Span<int> span = stackalloc int[3] { 1, 2, 3 };  // 栈分配

ImmutableArray<int> imm = ImmutableArray.Create(1, 2, 3);
```

对于展开运算符 `..`，编译器生成的代码会调用 `AddRange` 或遍历添加：

```csharp
// 源代码
int[] a = [1, 2, 3];
List<int> result = [0, ..a, 100];

// 编译器生成的代码（简化）
int[] a = new int[] { 1, 2, 3 };
List<int> result = new List<int>(4);
result.Add(0);
foreach (var item in a)
{
    result.Add(item);
}
result.Add(100);
```

集合表达式的工作机制可以通过自定义集合构建器扩展到用户自定义类型：

```csharp
// 自定义集合
public class MyCollection<T> : IEnumerable<T>
{
    private readonly List<T> _items = new();

    // 集合构建器方法：必须命名为 Create，且为静态
    public static MyCollection<T> Create(ReadOnlySpan<T> items)
    {
        var col = new MyCollection<T>();
        foreach (var item in items)
        {
            col._items.Add(item);
        }
        return col;
    }

    public IEnumerator<T> GetEnumerator() => _items.GetEnumerator();
    IEnumerator IEnumerable.GetEnumerator() => _items.GetEnumerator();
}

// 应用 CollectionBuilder 特性
[CollectionBuilder(typeof(MyCollection<int>), nameof(Create))]
public class MyCollection<T> : IEnumerable<T>
{
    // ...
}

// 使用集合表达式
MyCollection<int> col = [1, 2, 3];
```

### 4.3 内联数组的内存布局

内联数组的内存布局是其高性能的关键。让我们对比内联数组与普通数组：

```
普通数组 int[4]（堆分配）：
+--------+--------+--------+--------+--------+--------+--------+
| 对象头 | 方法表 | 长度 4 | 元素 0 | 元素 1 | 元素 2 | 元素 3 |
+--------+--------+--------+--------+--------+--------+--------+
                  ^                            ^
                  |                            |
                  长度字段                      元素数据
共 28 字节（64 位系统，含 8 字节对象头 + 8 字节方法表指针 + 4 字节长度 + 16 字节数据）

内联数组 Buffer4<int>（栈或内联分配）：
+--------+--------+--------+--------+
| 元素 0 | 元素 1 | 元素 2 | 元素 3 |
+--------+--------+--------+--------+
共 16 字节（无对象头、无方法表、无长度字段）
```

内联数组的内存布局与 C 语言的数组完全相同，这使得它与原生 API 互操作时无需任何转换。

编译器为内联数组生成索引访问代码：

```csharp
// 源代码
[InlineArray(4)]
public struct Buffer4<T>
{
    private T _element0;
}

// 编译器生成的索引访问（简化）
public struct Buffer4<T>
{
    private T _element0;
    private T _element1;  // 编译器自动生成
    private T _element2;
    private T _element3;

    public T this[int index]
    {
        get
        {
            // 通过 Unsafe.Add 计算偏移量
            return Unsafe.Add(ref _element0, index);
        }
        set
        {
            Unsafe.Add(ref _element0, index) = value;
        }
    }
}
```

### 4.4 params 集合的零分配实现

`params ReadOnlySpan<T>` 的零分配实现是 C# 13 性能特性的核心。让我们看编译器如何生成代码：

```csharp
// 源代码
public double Average(params ReadOnlySpan<double> values)
{
    double sum = 0;
    foreach (var v in values) sum += v;
    return values.IsEmpty ? 0 : sum / values.Length;
}

// 调用
double avg = Average(1.0, 2.0, 3.0, 4.0, 5.0);

// 编译器生成的调用代码（简化）
double[] tempArray = new double[] { 1.0, 2.0, 3.0, 4.0, 5.0 };  // 仍然分配数组？
ReadOnlySpan<double> span = new ReadOnlySpan<double>(tempArray);
double avg = Average(span);
```

实际上，C# 13 编译器会尽可能使用 `InlineArray` 在栈上分配参数，实现真正的零堆分配：

```csharp
// 编译器优化的调用代码
internal struct ParamsBuffer5  // 编译器生成的内联数组
{
    private double _element0;
    // ... 4 个更多元素
}

ParamsBuffer5 buffer = new ParamsBuffer5
{
    [0] = 1.0,
    [1] = 2.0,
    [2] = 3.0,
    [3] = 4.0,
    [4] = 5.0
};

// 通过 ref 创建 span，零堆分配
ReadOnlySpan<double> span = MemoryMarshal.CreateReadOnlySpan(
    in Unsafe.As<ParamsBuffer5, double>(ref buffer), 5);

double avg = Average(span);
```

这种实现让 `params ReadOnlySpan<T>` 在性能上接近"直接传 5 个参数"。

### 4.5 Lock 类型的实现

`System.Threading.Lock` 在 .NET 9 中的实现基于 `Monitor` 类，但提供了更清晰的 API：

```csharp
// 简化的 Lock 实现
public sealed class Lock
{
    private readonly object _sync = new();

    public void Enter() => Monitor.Enter(_sync);
    public void Exit() => Monitor.Exit(_sync);

    public Scope EnterScope()
    {
        Enter();
        return new Scope(this);
    }

    public ref struct Scope(Lock @lock)
    {
        public void Dispose() => @lock.Exit();
    }
}
```

`EnterScope` 返回的 `Scope` 是 `ref struct`，确保它不能被装箱、不能逃逸到堆上，`using` 模式让锁的范围与代码块严格对应。

未来 .NET 版本可能针对 `Lock` 类型实现更高效的同步原语（如基于 `SpinLock` + `Monitor` 的混合锁）。

## 五、快速上手

### 5.1 配置项目使用 C# 12/13

C# 12 随 .NET 8 发布，C# 13 随 .NET 9 发布。在项目中启用新特性需要正确配置 `TargetFramework` 与 `LangVersion`：

```xml
<!-- 使用 C# 12（.NET 8） -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <LangVersion>12</LangVersion>
  </PropertyGroup>
</Project>

<!-- 使用 C# 13（.NET 9） -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <LangVersion>13</LangVersion>
  </PropertyGroup>
</Project>

<!-- 使用最新 C# 版本（自动跟随 SDK） -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <LangVersion>latest</LangVersion>
  </PropertyGroup>
</Project>

<!-- 启用预览特性（如扩展类型、field 关键字） -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <LangVersion>preview</LangVersion>
    <Features>preview</Features>
  </PropertyGroup>
</Project>
```

### 5.2 第一个主构造函数示例

让我们从一个简单的依赖注入场景开始：

```csharp
// 文件：Services/OrderService.cs
public class OrderService(
    IOrderRepository repository,
    ILogger<OrderService> logger,
    IOptions<OrderSettings> options)
{
    private readonly OrderSettings _settings = options.Value;

    public async Task<Order?> GetOrderAsync(int id)
    {
        logger.LogInformation("获取订单 {OrderId}", id);
        return await repository.GetByIdAsync(id);
    }

    public async Task<Order> CreateOrderAsync(CreateOrderRequest request)
    {
        if (request.Items.Count > _settings.MaxItems)
        {
            throw new InvalidOperationException($"订单项不能超过 {_settings.MaxItems} 个");
        }

        var order = new Order
        {
            Items = request.Items,
            CreatedAt = DateTime.UtcNow
        };

        await repository.AddAsync(order);
        logger.LogInformation("创建订单 {OrderId}", order.Id);
        return order;
    }
}
```

注意几个细节：
1. 主构造函数参数 `options` 被用于初始化 `_settings` 字段，这是因为我们只需要 `OrderSettings`，不需要保留 `IOptions<OrderSettings>`。
2. 主构造函数参数 `repository` 和 `logger` 直接在方法中使用，没有显式声明字段。
3. 类体内有一个字段 `_settings`，它不是主构造函数参数。

### 5.3 集合表达式实战

集合表达式在日常代码中极其常用：

```csharp
// 配置默认值
public class AppDefaults
{
    // 集合表达式初始化
    public string[] SupportedCultures { get; init; } = ["zh-CN", "en-US", "ja-JP"];
    public HashSet<string> AdminEmails { get; init; } = ["admin@example.com"];
    public List<int> DefaultPageSizes { get; init; } = [10, 20, 50, 100];
}

// 合并配置
public class ConfigMerger
{
    public string[] MergeConfigs(string[] defaults, string[] overrides, string[] userSpecific)
    {
        // 使用展开运算符合并
        return [..defaults, ..overrides, ..userSpecific, "app.config"];
    }
}

// 在 ASP.NET Core Minimal API 中
var builder = WebApplication.CreateBuilder(args);

// 集合表达式用于 CORS 配置
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(["https://example.com", "https://api.example.com"])
              .WithMethods(["GET", "POST", "PUT", "DELETE"])
              .WithHeaders(["Content-Type", "Authorization"]));
});

var app = builder.Build();
app.Run();
```

### 5.4 params 集合性能对比

让我们用一个简单的基准测试对比 `params T[]` 与 `params ReadOnlySpan<T>`：

```csharp
using BenchmarkDotNet.Attributes;

[MemoryDiagnoser]
public class ParamsBenchmark
{
    // 传统 params 数组
    [Benchmark(Baseline = true)]
    public int SumArray()
    {
        return SumArray(1, 2, 3, 4, 5);
    }

    public int SumArray(params int[] values)
    {
        int sum = 0;
        foreach (var v in values) sum += v;
        return sum;
    }

    // C# 13 params ReadOnlySpan
    [Benchmark]
    public int SumSpan()
    {
        return SumSpan(1, 2, 3, 4, 5);
    }

    public int SumSpan(params ReadOnlySpan<int> values)
    {
        int sum = 0;
        foreach (var v in values) sum += v;
        return sum;
    }
}

// 基准测试结果（典型值）：
// | Method    | Mean     | Ratio | Allocated |
// |---------- |---------:|------:|----------:|
// | SumArray  | 25.6 ns  |  1.00 |     32 B  |
// | SumSpan   | 12.3 ns  |  0.48 |      0 B  |
```

`params ReadOnlySpan<int>` 比传统 `params int[]` 快 2 倍以上，且零堆分配。在热路径中，这种改进非常显著。

## 六、完整示例

### 6.1 示例一：使用主构造函数重构 ASP.NET Core Controller

让我们用 C# 12 主构造函数重构一个典型的 ASP.NET Core Controller：

```csharp
// 重构前：传统 Controller
[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;
    private readonly ILogger<ProductsController> _logger;
    private readonly IOptions<ApiSettings> _settings;

    public ProductsController(
        IProductService productService,
        ILogger<ProductsController> logger,
        IOptions<ApiSettings> settings)
    {
        _productService = productService;
        _logger = logger;
        _settings = settings;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int size = 10)
    {
        _logger.LogInformation("获取产品列表：page={Page}, size={Size}", page, size);

        if (size > _settings.Value.MaxPageSize)
        {
            return BadRequest($"每页大小不能超过 {_settings.Value.MaxPageSize}");
        }

        var products = await _productService.GetAllAsync(page, size);
        return Ok(products);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Product>> GetById(int id)
    {
        _logger.LogInformation("获取产品 {ProductId}", id);
        var product = await _productService.GetByIdAsync(id);
        return product is not null ? Ok(product) : NotFound();
    }

    [HttpPost]
    public async Task<ActionResult<Product>> Create([FromBody] CreateProductRequest request)
    {
        _logger.LogInformation("创建产品：{ProductName}", request.Name);
        var product = await _productService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProductRequest request)
    {
        _logger.LogInformation("更新产品 {ProductId}", id);
        var success = await _productService.UpdateAsync(id, request);
        return success ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        _logger.LogInformation("删除产品 {ProductId}", id);
        var success = await _productService.DeleteAsync(id);
        return success ? NoContent() : NotFound();
    }
}

// 重构后：使用主构造函数
[ApiController]
[Route("api/[controller]")]
public class ProductsController(
    IProductService productService,
    ILogger<ProductsController> logger,
    IOptions<ApiSettings> settings) : ControllerBase
{
    // 只保留需要的字段
    private readonly ApiSettings _apiSettings = settings.Value;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int size = 10)
    {
        logger.LogInformation("获取产品列表：page={Page}, size={Size}", page, size);

        if (size > _apiSettings.MaxPageSize)
        {
            return BadRequest($"每页大小不能超过 {_apiSettings.MaxPageSize}");
        }

        var products = await productService.GetAllAsync(page, size);
        return Ok(products);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Product>> GetById(int id)
    {
        logger.LogInformation("获取产品 {ProductId}", id);
        var product = await productService.GetByIdAsync(id);
        return product is not null ? Ok(product) : NotFound();
    }

    [HttpPost]
    public async Task<ActionResult<Product>> Create([FromBody] CreateProductRequest request)
    {
        logger.LogInformation("创建产品：{ProductName}", request.Name);
        var product = await productService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProductRequest request)
    {
        logger.LogInformation("更新产品 {ProductId}", id);
        var success = await productService.UpdateAsync(id, request);
        return success ? NoContent() : NotFound();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        logger.LogInformation("删除产品 {ProductId}", id);
        var success = await productService.DeleteAsync(id);
        return success ? NoContent() : NotFound();
    }
}
```

代码行数从 60 行减少到 50 行，更重要的是消除了"声明字段 → 构造函数赋值"的样板代码。

### 6.2 示例二：集合表达式构建数据管道

```csharp
// 使用集合表达式构建数据处理管道
public class DataPipeline
{
    private readonly int[] _defaults = [1, 2, 3];
    private readonly List<int> _overrides = [];
    private readonly HashSet<int> _exclusions = [10, 20];

    public void AddOverride(int value) => _overrides.Add(value);

    public int[] BuildPipeline()
    {
        // 合并默认值、覆盖值、计算值
        var computed = CalculateValues();
        var all = [.._defaults, .._overrides, ..computed];

        // 过滤排除项
        return all.Where(x => !_exclusions.Contains(x)).ToArray();
    }

    private int[] CalculateValues() => [10, 20, 30, 40, 50];
}

// 在配置场景中
public class ConfigBuilder
{
    public string[] BuildConfigFiles(string environment)
    {
        // 通用配置
        var common = new[] { "appsettings.json" };

        // 环境配置
        var env = environment switch
        {
            "Development" => new[] { "appsettings.Development.json", "appsettings.Local.json" },
            "Staging" => new[] { "appsettings.Staging.json" },
            "Production" => new[] { "appsettings.Production.json" },
            _ => Array.Empty<string>()
        };

        // 环境变量覆盖
        var envVars = Environment.GetEnvironmentVariables()
            .Keys
            .Cast<string>()
            .Where(k => k.StartsWith("APP_"))
            .Select(k => $"{k}.override.json")
            .ToArray();

        // 使用集合表达式合并
        return [..common, ..env, ..envVars];
    }
}
```

### 6.3 示例三：内联数组实现高性能缓冲区

```csharp
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

// 定义不同大小的内联数组缓冲区
[InlineArray(8)]
public struct Buffer8<T>
{
    private T _element0;
}

[InlineArray(16)]
public struct Buffer16<T>
{
    private T _element0;
}

[InlineArray(64)]
public struct Buffer64<T>
{
    private T _element0;
}

// 高性能网络缓冲区
public class NetworkBuffer
{
    private Buffer64<byte> _buffer;

    public ref byte this[int index] => ref _buffer[index];

    public Span<byte> AsSpan() => MemoryMarshal.CreateSpan(ref _buffer[0], 64);

    public void Clear()
    {
        var span = AsSpan();
        span.Clear();
    }

    public int ReadFrom(Stream stream)
    {
        var span = AsSpan();
        return stream.Read(span);
    }

    public void WriteTo(Stream stream)
    {
        var span = AsSpan();
        stream.Write(span);
    }
}

// 使用内联数组的网络读取器
public class NetworkReader
{
    private readonly NetworkBuffer _buffer = new();

    public async Task<int> ReadAsync(Stream stream)
    {
        _buffer.Clear();
        var bytesRead = await stream.ReadAsync(_buffer.AsSpan());
        return bytesRead;
    }

    public byte this[int index] => _buffer[index];
}
```

### 6.4 示例四：params 集合实现高效日志方法

```csharp
// 高性能日志方法：使用 params ReadOnlySpan 避免数组分配
public static class LoggerExtensions
{
    // 传统写法：每次调用分配数组
    public static void LogInfo(this ILogger logger, string message, params object[] args)
    {
        if (logger.IsEnabled(LogLevel.Information))
        {
            logger.LogInformation(message, args);
        }
    }

    // C# 13：使用 params ReadOnlySpan，零分配
    public static void LogInfoFast(this ILogger logger, string message, params ReadOnlySpan<object?> args)
    {
        if (logger.IsEnabled(LogLevel.Information))
        {
            // 需要转换为数组传给 ILogger（ILogger 接口限制）
            // 但只在 IsEnabled 为 true 时才分配
            var array = args.ToArray();
            logger.LogInformation(message, array);
        }
    }
}

// 自定义结构化日志器：可以完全避免分配
public struct StructuredLogger
{
    private readonly ILogger _logger;

    public StructuredLogger(ILogger logger) => _logger = logger;

    // 直接接受 ReadOnlySpan，不转换为数组
    public void Log(LogLevel level, string message, params ReadOnlySpan<object?> args)
    {
        if (!_logger.IsEnabled(level)) return;

        // 假设我们有一个自定义的日志实现，可以直接处理 ReadOnlySpan
        // 这里简化为演示
        var levelStr = level switch
        {
            LogLevel.Information => "INFO",
            LogLevel.Warning => "WARN",
            LogLevel.Error => "ERROR",
            _ => "OTHER"
        };

        // 使用 string.Format 不需要数组
        // 实际实现会更复杂，这里仅示意
        Console.WriteLine($"[{levelStr}] {message}");
        for (int i = 0; i < args.Length; i++)
        {
            Console.WriteLine($"  arg[{i}] = {args[i]}");
        }
    }
}
```

### 6.5 示例五：Lock 类型实现线程安全集合

```csharp
// 使用 C# 13 的 Lock 类型实现线程安全集合
public class ThreadSafeList<T>
{
    private readonly List<T> _items = new();
    private readonly Lock _lock = new();

    public void Add(T item)
    {
        using (_lock.EnterScope())
        {
            _items.Add(item);
        }
    }

    public bool Remove(T item)
    {
        using (_lock.EnterScope())
        {
            return _items.Remove(item);
        }
    }

    public T[] ToArray()
    {
        using (_lock.EnterScope())
        {
            return _items.ToArray();
        }
    }

    public int Count
    {
        get
        {
            using (_lock.EnterScope())
            {
                return _items.Count;
            }
        }
    }

    // 遍历时需要持有锁
    public void ForEach(Action<T> action)
    {
        using (_lock.EnterScope())
        {
            foreach (var item in _items)
            {
                action(item);
            }
        }
    }
}

// 使用
var list = new ThreadSafeList<int>();

// 多线程添加
Parallel.For(0, 1000, i => list.Add(i));

Console.WriteLine($"Count: {list.Count}");  // 1000

// 遍历
list.ForEach(x => Console.WriteLine(x));
```

## 七、进阶用法

### 7.1 主构造函数与继承

主构造函数可以与继承结合使用，派生类的主构造函数必须调用基类的主构造函数：

```csharp
// 基类使用主构造函数
public class Entity(long id)
{
    public long Id { get; } = id;

    public virtual void Print() => Console.WriteLine($"Entity {id}");
}

// 派生类也使用主构造函数
public class User(long id, string name, string email) : Entity(id)
{
    public string Name { get; } = name;
    public string Email { get; } = email;

    public override void Print() => Console.WriteLine($"User {Name} <{Email}> (ID: {Id})");
}

// 多层继承
public class AdminUser(long id, string name, string email, string[] permissions)
    : User(id, name, email)
{
    public string[] Permissions { get; } = permissions;

    public bool HasPermission(string perm) => permissions.Contains(perm);

    public override void Print()
    {
        Console.WriteLine($"Admin {Name} <{Email}> (ID: {Id})");
        Console.WriteLine($"  Permissions: {string.Join(", ", Permissions)}");
    }
}
```

注意：派生类主构造函数的参数与基类主构造函数的参数之间没有自动关联。`AdminUser` 的 `id` 参数需要显式传递给 `User(id, ...)`。

### 7.2 主构造函数与 record 类型

主构造函数与 `record` 类型结合时有一个重要差异：`record` 会自动为主构造函数参数生成公共属性，而普通类不会：

```csharp
// record：自动生成公共属性
public record PersonRecord(string Name, int Age);

var person1 = new PersonRecord("Alice", 30);
Console.WriteLine(person1.Name);  // Alice - 可以访问
Console.WriteLine(person1.Age);   // 30

// 普通类：不自动生成属性
public class PersonClass(string name, int age)
{
    // 必须显式声明属性才能外部访问
    public string Name { get; } = name;
    public int Age { get; } = age;
}

var person2 = new PersonClass("Bob", 25);
Console.WriteLine(person2.Name);  // Bob
Console.WriteLine(person2.Age);   // 25
```

### 7.3 集合表达式与 LINQ 结合

集合表达式与 LINQ 模式匹配结合非常强大：

```csharp
public class CollectionPatterns
{
    // 使用列表模式匹配
    public string Classify(int[] arr) => arr switch
    {
        [] => "空集合",
        [var single] => $"只有一个元素: {single}",
        [var first, var second] => $"两个元素: {first}, {second}",
        [var first, .., var last] => $"多个元素，首: {first}, 尾: {last}",
        [1, .., 9] => "以1开头以9结尾",
        _ => "其他"
    };

    // 集合表达式作为方法返回值
    public int[] GetRange(int start, int count)
    {
        if (count <= 0) return [];

        // 使用 LINQ 生成序列，再用集合表达式包装
        var range = Enumerable.Range(start, count);
        return [..range];
    }

    // 集合表达式构建复杂结果
    public List<string> BuildReport(IEnumerable<int> data)
    {
        var list = data.ToList();
        if (list.Count == 0) return [];

        var header = [$"报告：共 {list.Count} 项"];
        var body = list.Select(x => $"  - {x}").ToList();
        var footer = [$"总和: {list.Sum()}"];

        return [..header, ..body, ..footer];
    }
}
```

### 7.4 集合表达式与不可变集合

```csharp
using System.Collections.Immutable;

public class ImmutableCollections
{
    public ImmutableArray<int> GetNumbers() => [1, 2, 3, 4, 5];

    public ImmutableList<string> GetNames() => ["Alice", "Bob", "Charlie"];

    public ImmutableHashSet<string> GetTags() => ["dotnet", "csharp", "programming"];

    public ImmutableDictionary<string, int> GetCounts()
    {
        // 集合表达式不支持字典，需要使用传统语法
        return ImmutableDictionary.CreateRange(new[]
        {
            KeyValuePair.Create("apple", 5),
            KeyValuePair.Create("banana", 3),
        });
    }

    // 不可变集合的"更新"
    public ImmutableArray<int> AddToImmutable(ImmutableArray<int> original, int value)
    {
        // 集合表达式可以用于构建新的不可变集合
        return [..original, value];
    }
}
```

### 7.5 内联数组与 Span 互操作

```csharp
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

[InlineArray(32)]
public struct Buffer32<T>
{
    private T _element0;
}

public class BufferOperations
{
    private Buffer32<int> _buffer;

    // 获取 Span
    public Span<int> AsSpan() => MemoryMarshal.CreateSpan(ref _buffer[0], 32);

    // 获取 ReadOnlySpan
    public ReadOnlySpan<int> AsReadOnlySpan() =>
        MemoryMarshal.CreateReadOnlySpan(ref _buffer[0], 32);

    // 切片
    public Span<int> Slice(int start, int length)
    {
        return AsSpan().Slice(start, length);
    }

    // 与 Stream 互操作
    public void ReadFromStream(Stream stream)
    {
        var span = AsSpan();
        int bytesRead = stream.Read(span);
        // 处理读取结果...
    }

    // 与 P/Invoke 互操作
    public unsafe void PassToNative()
    {
        // 内联数组可以直接作为指针传递给原生代码
        fixed (int* ptr = &_buffer[0])
        {
            NativeMethod(ptr, 32);
        }
    }

    [DllImport("native.dll")]
    private static extern void NativeMethod(int* data, int length);
}
```

### 7.6 扩展类型（预览）实战

```csharp
// 启用预览特性：<Features>preview</Features>

// 传统扩展方法（C# 3.0+）
public static class EnumerableExtensions
{
    public static IEnumerable<T> WhereNotNull<T>(this IEnumerable<T?> source)
        where T : class
        => source.Where(x => x is not null).Cast<T>();
}

// C# 13 预览：扩展类型
extension EnumerableExtensionsForIEnumerable
{
    // 为 IEnumerable<T> 添加方法
    public static IEnumerable<T> WhereNotNull<T>(this IEnumerable<T?> source)
        where T : class
        => source.Where(x => x is not null).Cast<T>();
}

extension StringExtensions for string
{
    // 实例方法
    public bool IsNullOrBlank() => string.IsNullOrWhiteSpace(this);

    // 实例属性
    public string Reversed => new string(this.Reverse().ToArray());

    // 静态属性
    public static string DefaultSeparator => ", ";
}

extension IntExtensions for int
{
    // 运算符扩展（预览特性支持有限）
    public bool IsPositive => this > 0;
    public bool IsNegative => this < 0;
    public bool IsZero => this == 0;

    public int Squared => this * this;
    public int Cubed => this * this * this;
}

// 使用扩展
string name = "hello";
Console.WriteLine(name.Reversed);  // "olleh"
Console.WriteLine(name.IsNullOrBlank());  // False

int num = 5;
Console.WriteLine(num.IsPositive);  // True
Console.WriteLine(num.Squared);  // 25
```

### 7.7 拦截器（Interceptors，实验性）

拦截器是 C# 12 引入的实验性特性，允许在编译时拦截特定方法调用，替换为其他实现。这是源生成器的高级应用，主要用于框架优化。

```xml
<!-- 启用拦截器需要 -->
<PropertyGroup>
  <Features>InterceptorsPreview</Features>
</PropertyGroup>
```

```csharp
// 原始代码
public class Calculator
{
    public int Add(int a, int b) => a + b;
}

public class Program
{
    public static void Main()
    {
        var calc = new Calculator();
        int result = calc.Add(1, 2);  // 这个调用可能被拦截
        Console.WriteLine(result);
    }
}

// 源生成器生成的拦截器（简化）
// 拦截 calc.Add(1, 2) 调用，替换为内联实现
[InterceptsLocation("Program.cs", line: 7, character: 25)]
public static int AddIntercept(Calculator self, int a, int b)
{
    // 直接内联计算，避免方法调用开销
    return a + b;
}
```

拦截器目前仍是实验特性，API 不稳定，不建议在生产代码中使用。但它的设计意图是为未来 AOT 编译、源生成器优化提供基础。

## 八、性能分析

### 8.1 主构造函数的性能

主构造函数的性能与传统构造函数基本相同。编译器生成的 IL 代码几乎一致：

```csharp
// 主构造函数
public class Foo(string name) { public string Name { get; } = name; }

// 等价的传统构造函数
public class Foo
{
    private readonly string _name;
    public string Name { get; }
    public Foo(string name) { _name = name; Name = name; }
}
```

两种写法的内存布局相同：一个私有字段 + 一个公共属性。运行时性能完全一致。

但是，主构造函数有一个潜在的内存陷阱：如果主构造函数参数被多个方法引用，但只在少数方法中使用，编译器仍然会为所有参数生成字段，导致对象体积增大。

```csharp
// 潜在内存问题：所有参数都被生成为字段
public class BigService(
    IServiceA a,
    IServiceB b,
    IServiceC c,
    IServiceD d,
    IServiceE e)
{
    // 实际只使用了 a 和 b
    public void Method1() => a.DoSomething();
    public void Method2() => b.DoSomething();
    // c, d, e 从未被使用，但仍占用对象空间
}

// 优化：只保留需要的依赖
public class BigService(IServiceA a, IServiceB b)
{
    private readonly IServiceC _c = ServiceLocator.GetService<IServiceC>();  // 不推荐
    // 或者只注入需要的
}
```

### 8.2 集合表达式的性能

集合表达式的性能取决于目标类型：

| 目标类型 | 性能 | 分配 | 备注 |
|---------|------|------|------|
| `T[]` | 基准 | 1 次堆分配 | 直接 `new T[]` |
| `Span<T>` | 最优 | 0 次堆分配（`stackalloc`） | 栈分配 |
| `List<T>` | 略低于直接初始化 | 1 次堆分配（+ 内部数组） | 自动调整容量 |
| `ImmutableArray<T>` | 取决于 `Create` 实现 | 1 次堆分配 | 调用 `ImmutableArray.Create` |
| 自定义集合 | 取决于构建器 | 取决于实现 | 通过 `CollectionBuilder` |

基准测试对比：

```csharp
[MemoryDiagnoser]
public class CollectionExpressionBenchmark
{
    [Benchmark(Baseline = true)]
    public int[] ArrayOldSyntax()
    {
        return new int[] { 1, 2, 3, 4, 5 };
    }

    [Benchmark]
    public int[] ArrayNewSyntax()
    {
        return [1, 2, 3, 4, 5];
    }

    [Benchmark]
    public Span<int> SpanNewSyntax()
    {
        return (Span<int>)[1, 2, 3, 4, 5];
    }

    [Benchmark]
    public List<int> ListOldSyntax()
    {
        return new List<int> { 1, 2, 3, 4, 5 };
    }

    [Benchmark]
    public List<int> ListNewSyntax()
    {
        return [1, 2, 3, 4, 5];
    }
}

// 典型结果：
// | Method           | Mean     | Ratio | Allocated |
// |----------------- |---------:|------:|----------:|
// | ArrayOldSyntax   | 15.2 ns  |  1.00 |     32 B  |
// | ArrayNewSyntax   | 15.1 ns  |  1.00 |     32 B  |
// | SpanNewSyntax    |  0.8 ns  |  0.05 |      0 B  |
// | ListOldSyntax    | 45.6 ns  |  3.00 |    128 B  |
// | ListNewSyntax    | 42.3 ns  |  2.78 |    128 B  |
```

集合表达式本身没有性能损耗，与最优手写代码相当。`Span<T>` 的栈分配让它在性能敏感场景中表现出色。

### 8.3 内联数组的性能

内联数组的最大优势是零堆分配和缓存友好性：

```csharp
[MemoryDiagnoser]
public class InlineArrayBenchmark
{
    private readonly int[] _array = new int[16];
    private Buffer16<int> _inlineArray;

    [Benchmark(Baseline = true)]
    public int SumArray()
    {
        int sum = 0;
        for (int i = 0; i < 16; i++)
        {
            sum += _array[i];
        }
        return sum;
    }

    [Benchmark]
    public int SumInlineArray()
    {
        int sum = 0;
        for (int i = 0; i < 16; i++)
        {
            sum += _inlineArray[i];
        }
        return sum;
    }

    [Benchmark]
    public int SumSpan()
    {
        int sum = 0;
        foreach (var item in _inlineArray.AsSpan())
        {
            sum += item;
        }
        return sum;
    }
}

// 典型结果：
// | Method         | Mean     | Ratio | Allocated |
// |--------------- |---------:|------:|----------:|
// | SumArray       | 12.5 ns  |  1.00 |      0 B  |
// | SumInlineArray |  8.3 ns  |  0.66 |      0 B  |
// | SumSpan        |  6.1 ns  |  0.49 |      0 B  |
```

内联数组比普通数组快 30-50%，主要原因是：
1. 内联数组与对象在内存中连续，缓存命中率高。
2. 内联数组没有数组长度检查（编译器知道固定大小）。
3. 通过 `Span` 遍历可以利用 SIMD 优化。

### 8.4 params 集合的性能数学模型

`params` 集合的性能优势可以用数学模型表示。设 $n$ 为参数数量，$T_{\text{alloc}}$ 为单次堆分配时间，$T_{\text{copy}}$ 为单元素拷贝时间，$T_{\text{gc}}$ 为 GC 暂停时间分摊。

传统 `params T[]` 的总成本：

$$
T_{\text{array}} = T_{\text{alloc}} + n \cdot T_{\text{copy}} + T_{\text{gc}}
$$

C# 13 `params ReadOnlySpan<T>` 的总成本：

$$
T_{\text{span}} = n \cdot T_{\text{copy}}
$$

性能提升比例：

$$
\text{Speedup} = \frac{T_{\text{array}}}{T_{\text{span}}} = 1 + \frac{T_{\text{alloc}} + T_{\text{gc}}}{n \cdot T_{\text{copy}}}
$$

当 $n$ 较小（如 3-5 个参数）时，$T_{\text{alloc}}$ 与 $T_{\text{gc}}$ 占主导，性能提升可达 2-3 倍。当 $n$ 较大时，$T_{\text{copy}}$ 占主导，性能提升逐渐减小。

### 8.5 Lock 类型的性能

`Lock` 类型在 .NET 9 中基于 `Monitor` 实现，性能与传统 `lock` 语句相同。但未来版本可能针对 `Lock` 类型优化：

```csharp
// 当前实现（.NET 9）
public sealed class Lock
{
    private readonly object _sync = new();
    public void Enter() => Monitor.Enter(_sync);
    public void Exit() => Monitor.Exit(_sync);
}

// 未来可能优化（假设）
public sealed class Lock
{
    private int _state;  // 用户态自旋
    public void Enter()
    {
        if (Interlocked.CompareExchange(ref _state, 1, 0) != 0)
        {
            // 竞争失败，回退到内核态
            Monitor.Enter(_sync);
        }
    }
}
```

`Lock` 类型的真正价值在于类型安全和未来优化空间，当前性能与传统 `lock` 相同。

## 九、最佳实践

### 9.1 主构造函数使用准则

**推荐使用主构造函数的场景**：

1. **依赖注入的服务类**：参数需要长期保存，且主要用于方法调用。
2. **简单数据封装类**：参数被属性或方法使用。
3. **ASP.NET Core Controller、Minimal API 处理器**：典型的 DI 场景。

```csharp
// 推荐：依赖注入服务
public class UserService(IUserRepository repository, ILogger<UserService> logger)
{
    public async Task<User?> GetUserAsync(int id)
    {
        logger.LogInformation("获取用户 {Id}", id);
        return await repository.GetByIdAsync(id);
    }
}
```

**避免使用主构造函数的场景**：

1. **参数需要复杂初始化逻辑**：构造函数需要执行复杂逻辑（如参数校验、资源初始化）。
2. **参数需要可变性**：主构造函数参数在方法内是只读的，如果需要修改，使用传统构造函数。
3. **大量参数但很少使用**：所有参数都会生成字段，占用对象空间。

```csharp
// 避免：复杂初始化逻辑
public class ComplexService(IConfiguration config)
{
    private readonly string _connectionString = config.GetConnectionString("Default")
        ?? throw new InvalidOperationException("缺少连接字符串");

    private readonly TimeSpan _timeout = TimeSpan.FromSeconds(config.GetValue<int>("Timeout"));

    // 主构造函数让初始化代码不够清晰
}

// 推荐：传统构造函数
public class ComplexService
{
    private readonly string _connectionString;
    private readonly TimeSpan _timeout;

    public ComplexService(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("Default")
            ?? throw new InvalidOperationException("缺少连接字符串");
        _timeout = TimeSpan.FromSeconds(config.GetValue<int>("Timeout"));
    }
}
```

### 9.2 集合表达式使用准则

**推荐**：

1. **优先使用集合表达式初始化任何集合**。
2. **使用展开运算符 `..` 合并集合**，比 `Concat`、`AddRange` 更简洁。
3. **性能敏感场景使用 `Span<T>` 或 `ReadOnlySpan<T>`**。

```csharp
// 推荐：日常初始化
List<int> numbers = [1, 2, 3, 4, 5];
string[] names = ["Alice", "Bob", "Charlie"];
HashSet<int> set = [1, 2, 3, 4, 5];

// 推荐：合并集合
int[] merged = [..list1, ..list2, 100, 200];

// 推荐：性能敏感场景
Span<int> span = [1, 2, 3];  // 栈分配，零堆分配
```

**避免**：

1. **`var` 与集合表达式混用**：`var list = [1, 2, 3];` 无法推断类型，必须显式指定。
2. **字典初始化**：集合表达式不支持字典，需用传统语法。
3. **多维数组**：集合表达式不支持多维数组。

```csharp
// 避免：var 无法推断
// var list = [1, 2, 3];  // 编译错误

// 避免：字典仍需传统语法
var dict = new Dictionary<string, int>
{
    ["one"] = 1,
    ["two"] = 2
};

// 避免：多维数组
// int[,] matrix = [[1, 2], [3, 4]];  // C# 12 不支持
```

### 9.3 params 集合使用准则

**推荐**：

1. **公共 API 优先使用 `params T[]`**：兼容性更好。
2. **内部性能敏感方法使用 `params ReadOnlySpan<T>`**：零分配。
3. **避免在 `params` 上做重载**：可能导致调用歧义。

```csharp
// 推荐：公共 API
public class PublicApi
{
    public void Process(params string[] items) { /* 兼容旧代码 */ }
}

// 推荐：内部性能方法
internal class InternalProcessor
{
    public int Sum(params ReadOnlySpan<int> values)
    {
        int sum = 0;
        foreach (var v in values) sum += v;
        return sum;
    }
}

// 避免：params 重载
public class Ambiguous
{
    public void Process(params int[] values) { }
    public void Process(params ReadOnlySpan<int> values) { }  // 调用 Process(1, 2, 3) 时歧义
}
```

### 9.4 Lock 类型使用准则

**推荐**：

1. **新代码使用 `Lock` 类型**：类型更明确。
2. **`using` 模式管理锁范围**：避免忘记释放。

```csharp
// 推荐：新代码
private readonly Lock _lock = new();

public void DoWork()
{
    using (_lock.EnterScope())
    {
        // 临界区
    }
}
```

**避免**：

1. **混合使用 `Lock` 与 `object` 作为锁**：保持一致性。
2. **嵌套锁**：容易导致死锁。

### 9.5 新特性采用策略

对于企业项目，建议采用渐进式策略：

1. **C# 12 特性**（主构造函数、集合表达式）：稳定可用，新代码全面采用，旧代码逐步迁移。
2. **C# 13 稳定特性**（params 集合、Lock 类型、部分属性）：稳定可用，按需采用。
3. **C# 13 预览特性**（扩展类型、field 关键字）：仅在实验项目或内部工具中使用，生产代码避免。

```xml
<!-- 推荐：生产项目配置 -->
<PropertyGroup>
  <TargetFramework>net9.0</TargetFramework>
  <LangVersion>13</LangVersion>
  <!-- 不启用 preview，避免误用预览特性 -->
</PropertyGroup>

<!-- 推荐：实验项目配置 -->
<PropertyGroup>
  <TargetFramework>net9.0</TargetFramework>
  <LangVersion>preview</LangVersion>
  <Features>preview</Features>
</PropertyGroup>
```

## 十、常见陷阱

### 10.1 主构造函数参数不是属性

最常见的误解是把主构造函数参数当作公共属性：

```csharp
// 错误理解：认为 name 是公共属性
public class Person(string name, int age)
{
}

var p = new Person("Alice", 30);
// Console.WriteLine(p.name);  // 编译错误：name 不是属性
// p.name = "Bob";  // 编译错误

// 正确：显式声明属性
public class Person(string name, int age)
{
    public string Name { get; } = name;
    public int Age { get; set; } = age;
}

var p = new Person("Alice", 30);
Console.WriteLine(p.Name);  // Alice
```

### 10.2 主构造函数参数的可变性陷阱

主构造函数参数在方法内是只读的，尝试修改会导致编译错误：

```csharp
public class Counter(int count)
{
    public void Increment()
    {
        // count++;  // 编译错误：count 是只读的
    }

    // 正确：赋值给可变字段
    private int _count = count;
    public void IncrementCorrect() => _count++;
}
```

### 10.3 集合表达式的类型推断陷阱

集合表达式依赖目标类型推断，`var` 无法使用：

```csharp
// 错误：var 无法推断集合表达式类型
// var list = [1, 2, 3];  // 编译错误

// 正确：显式指定类型
List<int> list = [1, 2, 3];
int[] arr = [1, 2, 3];
Span<int> span = [1, 2, 3];
```

另一个陷阱是隐式类型转换：

```csharp
// 陷阱：long 与 int 混合
// long[] arr = [1, 2, 3];  // 编译错误，集合元素类型必须匹配

// 正确
long[] arr = [1L, 2L, 3L];
// 或显式转换
long[] arr2 = [(long)1, (long)2, (long)3];
```

### 10.4 params 集合的重载歧义

`params` 集合可能导致重载歧义：

```csharp
public class Ambiguous
{
    public void Process(params int[] values) { }
    public void Process(params ReadOnlySpan<int> values) { }

    // 调用 Process(1, 2, 3) 时，编译器无法确定调用哪个重载
}

// 解决：移除一个重载，或使用命名参数
public class Clear
{
    public void Process(params ReadOnlySpan<int> values) { }
    public void ProcessArray(params int[] values) { }
}
```

### 10.5 Lock 类型的兼容性陷阱

`Lock` 类型是 .NET 9 新增的，在 .NET 8 及更早版本不可用：

```csharp
// .NET 9 项目
private readonly Lock _lock = new();  // 正常

// .NET 8 项目
// private readonly Lock _lock = new();  // 编译错误：找不到 Lock 类型

// 跨版本兼容方案
#if NET9_0_OR_GREATER
private readonly Lock _lock = new();
#else
private readonly object _lock = new();
#endif
```

### 10.6 内联数组的限制

内联数组有一些限制：

1. **必须是结构体**：内联数组只能声明为 `struct`，不能是 `class`。
2. **大小固定**：大小在编译时确定，无法动态调整。
3. **元素类型必须一致**：所有元素必须是同一类型。
4. **不能作为 `var` 推断**：需要显式类型。

```csharp
// 错误：内联数组不能是 class
// [InlineArray(4)]
// public class BufferClass<T> { private T _e0; }  // 编译错误

// 错误：大小必须是编译时常量
// int size = 4;
// [InlineArray(size)]  // 编译错误
// public struct Buffer<T> { private T _e0; }

// 正确
[InlineArray(4)]
public struct Buffer4<T>
{
    private T _e0;
}
```

### 10.7 预览特性的稳定性陷阱

预览特性（如扩展类型、`field` 关键字）在后续版本可能变更：

```csharp
// C# 13 预览：扩展类型
extension StringExtensions for string
{
    public string Reversed => new string(this.Reverse().ToArray());
}

// 注意：C# 14 正式发布时，语法可能调整
// 例如可能改为：
// public extension StringExtensions for string { ... }
```

建议：
1. 生产代码不使用预览特性。
2. 实验代码明确标注"使用预览特性，可能不兼容未来版本"。
3. 关注 Microsoft 官方文档的版本变更说明。

## 十一、对比分析

### 11.1 C# 与其他语言的新特性对比

| 特性 | C# 12/13 | Java 21 | Kotlin 2.0 | TypeScript 5.x |
|------|----------|---------|------------|----------------|
| 主构造函数 | C# 12 引入 | 无 | 一直支持 | 通过构造函数参数属性简写 |
| 集合表达式 | C# 12 引入 | 无 | 无 | 数组字面量 `[1, 2, 3]` |
| 内联数组 | C# 12 引入 | 无 | 无 | 无 |
| params 集合 | C# 13 引入 | 可变参数（数组） | 可变参数（数组） | rest 参数（数组） |
| 扩展类型 | C# 13 预览 | 无 | 扩展函数 | 扩展方法（声明合并） |
| Lock 类型 | C# 13 引入 | synchronized | 无 | 无（单线程） |
| 部分属性 | C# 13 引入 | 无 | 无 | 无 |
| 模式匹配 | C# 7-12 持续增强 | 21 引入（switch 模式） | 强大 | 无 |

C# 在新特性方面处于主流语言前列，特别是在性能导向特性（内联数组、`params` 集合、`Span<T>`）方面领先。

### 11.2 主构造函数对比：C# vs Kotlin vs Scala

```kotlin
// Kotlin：主构造函数是语言的核心特性
class Person(val name: String, var age: Int) {
    fun greet() = println("我是 $name，$age 岁")
}

// 自动生成 name（只读属性）和 age（可变属性）
```

```scala
// Scala：主构造函数也是核心特性
class Person(val name: String, var age: Int) {
  def greet(): Unit = println(s"我是 $name，$age 岁")
}
```

```csharp
// C# 12：主构造函数参数不是属性
public class Person(string name, int age)
{
    public string Name { get; } = name;  // 需要显式声明属性
    public int Age { get; set; } = age;

    public void Greet() => Console.WriteLine($"我是 {name}，{age} 岁");
}
```

对比分析：
- **Kotlin/Scala**：主构造函数参数加 `val`/`var` 自动生成属性，简洁。
- **C# 12**：主构造函数参数不自动生成属性，需要显式声明，更明确但稍显啰嗦。
- **设计哲学**：C# 倾向于显式优于隐式，避免"魔法"行为。

### 11.3 集合表达式对比：C# vs Python vs JavaScript

```python
# Python：列表字面量
list1 = [1, 2, 3]
list2 = [*list1, 4, 5]  # 展开运算符

# 元组
tuple1 = (1, 2, 3)

# 集合
set1 = {1, 2, 3}

# 字典
dict1 = {"one": 1, "two": 2}
```

```javascript
// JavaScript：数组字面量
const arr = [1, 2, 3];
const combined = [...arr, 4, 5];  // 展开运算符

// 对象
const obj = { one: 1, two: 2 };
const merged = { ...obj, three: 3 };
```

```csharp
// C# 12：集合表达式
int[] arr = [1, 2, 3];
List<int> list = [1, 2, 3];
HashSet<int> set = [1, 2, 3];
int[] combined = [..arr, 4, 5];

// 字典仍需传统语法
var dict = new Dictionary<string, int> { ["one"] = 1, ["two"] = 2 };
```

对比分析：
- **Python/JavaScript**：列表/数组字面量历史悠久，展开运算符通用。
- **C# 12**：集合表达式统一了多种集合类型，但字典暂不支持。
- **优势**：C# 集合表达式支持 `Span<T>` 的栈分配，性能更好。

### 11.4 params 集合对比：C# vs Java vs Python

```java
// Java：可变参数只能是数组
public void process(String... items) {
    for (String item : items) {
        System.out.println(item);
    }
}
```

```python
# Python：*args 是元组，**kwargs 是字典
def process(*args):
    for item in args:
        print(item)
```

```csharp
// C# 13：params 支持任何集合
public void Process(params ReadOnlySpan<string> items)
{
    foreach (var item in items)
    {
        Console.WriteLine(item);
    }
}
```

对比分析：
- **Java**：`...` 语法简洁，但只能用数组。
- **Python**：`*args` 是元组，不可变。
- **C# 13**：`params` 支持任何集合，`ReadOnlySpan<T>` 实现零分配，性能最优。

## 十二、总结

### 12.1 核心要点回顾

本章详细介绍了 C# 12 与 C# 13 的主要新特性，核心要点如下：

**C# 12 特性**：
1. **主构造函数**：将构造函数参数放在类声明中，简化依赖注入场景的样板代码。
2. **集合表达式**：用统一的 `[...]` 语法初始化各种集合，支持展开运算符 `..`。
3. **内联数组**：固定大小的结构体数组，零堆分配，用于高性能场景。
4. **`ref readonly` 参数**：明确表达"按引用传递但不修改"的意图。
5. **别名任意类型**：为元组、数组、指针等任何类型创建 `using` 别名。
6. **拦截器（实验性）**：编译时拦截方法调用，为源生成器优化提供基础。

**C# 13 特性**：
1. **`params` 集合**：`params` 支持任何集合类型，`ReadOnlySpan<T>` 实现零分配。
2. **`Lock` 类型**：专用锁类型，替代 `object` 作为锁对象，类型更安全。
3. **部分属性**：允许属性声明与实现分离，用于源生成器场景。
4. **`field` 上下文关键字（预览）**：在属性访问器中引用后台字段。
5. **扩展类型（预览）**：为现有类型添加属性、静态成员、运算符。
6. **`\e` 转义字符**：表示 ESC 字符，用于终端控制序列。
7. **方法组自然类型改进**：更智能的委托类型推断。
8. **`ref struct` 在泛型中的有限支持**：通过 `allows ref struct` 约束。

### 12.2 设计哲学

C# 12 与 C# 13 体现了 C# 语言演进的几个核心哲学：

1. **简化而不削弱**：主构造函数、集合表达式等特性简化了样板代码，但没有削弱语言的表达能力。
2. **性能作为一等公民**：内联数组、`params` 集合、`Span<T>` 等特性让 C# 在性能敏感场景中可以与 C++ 竞争。
3. **类型安全优先**：`Lock` 类型、`field` 关键字、部分属性等特性增强了编译时类型检查。
4. **渐进式演进**：新特性与旧代码兼容，开发者可以逐步采用，不需要重写代码。
5. **编译时优于运行时**：源生成器、拦截器等特性把工作前移到编译时，提升性能并支持 AOT。

### 12.3 适用场景指南

| 场景 | 推荐特性 | 备注 |
|------|---------|------|
| 依赖注入服务 | 主构造函数 | 大幅减少样板代码 |
| 集合初始化 | 集合表达式 | 统一语法，支持展开 |
| 高性能缓冲区 | 内联数组 | 零堆分配，缓存友好 |
| 可变参数方法 | `params ReadOnlySpan<T>` | 零分配，性能最优 |
| 线程同步 | `Lock` 类型 | 类型安全，未来可优化 |
| 源生成器 | 部分属性 | 与源生成器配合 |
| 终端控制 | `\e` 转义字符 | 替代 `\x1B` |
| 大型结构体传递 | `ref readonly` 参数 | 避免拷贝，保证不可变 |
| 复杂类型别名 | 别名任意类型 | 提升可读性 |

### 12.4 学习建议

1. **从主构造函数与集合表达式开始**：这是日常开发最高频的特性，立即能提升生产力。
2. **理解 `Span<T>` 与栈分配**：这是 C# 性能特性的基础，理解后才能用好内联数组、`params` 集合。
3. **关注源生成器**：源生成器是 C# 未来的重要方向，与部分属性、拦截器等特性紧密相关。
4. **谨慎使用预览特性**：扩展类型、`field` 关键字等预览特性在生产代码中避免使用，但在实验项目中可以尝试。
5. **阅读官方文档与 RFC**：C# 语言设计是开放的，所有特性讨论在 [csharplang](https://github.com/dotnet/csharplang) 仓库公开，阅读设计讨论能深入理解特性动机。

### 12.5 未来展望

C# 14（.NET 10，2025 年）预计将：
1. **正式发布扩展类型**：C# 13 的预览特性将正式可用。
2. **`field` 关键字正式发布**：简化属性访问器编写。
3. **无条件插值字符串**：`$"{x}"` 在 `x` 为 `null` 时不再警告。
4. **更多源生成器集成**：减少运行时反射，提升 AOT 兼容性。
5. **性能持续优化**：`Span<T>`、`ref struct` 等特性的更广泛支持。

C# 语言持续演进，每个版本都让代码更简洁、更安全、更高效。掌握新特性是保持竞争力的关键，但更重要的是理解每个特性背后的设计动机与适用场景，避免"为新而新"。

### 12.6 进一步阅读

- [C# 12 官方文档](https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-12)
- [C# 13 官方文档](https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-13)
- [C# 语言设计仓库](https://github.com/dotnet/csharplang)
- [Roslyn 编译器源码](https://github.com/dotnet/roslyn)
- [.NET 性能博客](https://devblogs.microsoft.com/dotnet/)
- [Stephen Toub 的性能分析文章](https://steven-giesel.com/blog)

通过持续学习与实践，你将能够熟练运用 C# 12/13 的新特性，编写出简洁、高效、安全的现代 C# 代码。
