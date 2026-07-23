---
order: 64
title: 'C#与反射'
module: csharp
category: 'C#'
difficulty: advanced
description: 反射与表达式树
author: fanquanpp
updated: '2026-06-14'
related:
  - 'csharp/CSharp与最小API'
  - 'csharp/CSharp12与CSharp13新特性'
  - csharp/LINQ延迟与立即执行
  - 'csharp/async-await状态机'
prerequisites:
  - csharp/概述与环境配置
---

## 一、概述

反射（Reflection）是 C# 与 .NET 运行时（CLR，Common Language Runtime）提供给开发者的一种"元编程"能力：在程序运行时，动态地获取类型信息、访问类型成员、创建类型实例、调用方法、读写属性与字段，甚至于在运行时动态生成新的类型。表达式树（Expression Trees）则是一种将代码以数据结构形式表示的技术，它将原本不可见的"代码逻辑"转化为可在运行时遍历、分析、修改、编译的结构化对象，是 LINQ、EF Core、动态查询等高级特性的底层基石。

### 1.1 为什么需要反射

要理解反射的价值，先想象一个没有反射的世界。假设你正在写一个 JSON 序列化器，需要把任意对象转换为 JSON 字符串。在没有反射的情况下，你必须为每一种类型手写转换代码：

```csharp
// 为每种类型手写序列化逻辑
public string SerializeUser(User user)
{
    return $"{{\"Name\":\"{user.Name}\",\"Age\":{user.Age}}}";
}

public string SerializeProduct(Product product)
{
    return $"{{\"Id\":{product.Id},\"Price\":{product.Price}}}";
}

// 每增加一种类型，就要新增一个方法
```

这种做法的弊端显而易见：违反 DRY 原则、维护成本高、容易出错。更严重的是，对于框架开发者来说，他们在编写框架时根本不知道用户会创建哪些类型，因此根本不可能预先写出针对用户类型的代码。

反射解决了这个问题。通过反射，框架代码可以在运行时"发现"用户类型有哪些属性、字段、方法，然后动态地进行序列化、映射、调用。这正是 System.Text.Json、Newtonsoft.Json、EF Core、ASP.NET Core MVC、依赖注入容器等几乎所有 .NET 框架的核心机制。

### 1.2 反射与表达式树的关系

反射与表达式树经常被一起讨论，因为它们都涉及"在运行时操作代码与类型"，但二者有本质区别：

- **反射**关注的是"类型本身有什么"——获取元数据（有哪些方法、属性、特性），并执行这些元数据。
- **表达式树**关注的是"代码的逻辑结构"——把一段 Lambda 表达式表示为树形数据，可以分析、转换、编译。

二者的交集在于：表达式树的 API（`Expression.Call`、`Expression.Property` 等）大量依赖反射对象（`MethodInfo`、`PropertyInfo`）来描述要调用的目标。一个典型场景是：先用反射获取 `MethodInfo`，再用表达式树把它包装为可编译的委托，从而把"反射调用"的几十倍性能损耗降到接近"直接调用"的水平。

### 1.3 学习路径

本章适合已经掌握 C# 基本语法、面向对象、泛型的读者。学完本章后，你将能够：

1. 理解 .NET 类型系统（Type System）与元数据（Metadata）的运行时表示。
2. 熟练使用 `Type`、`Assembly`、`MethodInfo`、`PropertyInfo` 等 API 进行反射操作。
3. 掌握 `BindingFlags`、`Activator`、`Delegate.CreateDelegate` 等高级技巧。
4. 理解表达式树的构造、遍历、编译机制，能手动构建表达式树。
5. 能够评估反射的性能开销，并使用缓存、表达式树编译、源生成器等手段优化。
6. 在 AOT（Ahead-of-Time）编译场景下正确使用反射，并了解其限制。

## 二、历史演进

反射不是 .NET 独有的概念，但 .NET 从一开始就把元数据作为运行时的"一等公民"。了解反射 API 的演进，有助于理解现代 C# 中各种"反射替代方案"（如源生成器）的动机。

### 2.1 .NET Framework 1.0/1.1（2002-2003）

反射在 .NET Framework 1.0 就已经存在，核心 API 集中在 `System.Reflection` 命名空间。这一时期反射的能力已经相当完整：

- `Type` 类提供 `GetProperties`、`GetMethods`、`GetFields`、`GetConstructors` 等方法。
- `Assembly` 类可以加载程序集、获取类型。
- `Activator.CreateInstance` 用于动态创建实例。
- `Attribute` 类用于读取自定义特性。

但 .NET 1.x 时代的泛型尚未引入，反射 API 大量使用 `object` 作为通用类型，使用上比较繁琐。

### 2.2 .NET Framework 2.0（2005）：泛型与反射的结合

C# 2.0 引入泛型后，反射 API 也相应扩展以支持泛型类型：

- `Type.IsGenericType`、`Type.GetGenericTypeDefinition`、`Type.MakeGenericType` 用于操作开放泛型与封闭泛型。
- `MethodInfo.MakeGenericMethod` 用于动态构造泛型方法实例。

这一时期 LINQ 尚未出现，表达式树也还未引入。

### 2.3 .NET Framework 3.5（2007）：表达式树的诞生

C# 3.0 与 .NET 3.5 引入了 LINQ，同时引入了表达式树（`System.Linq.Expressions.Expression`）。最初表达式树只能表示相对简单的表达式（不能包含语句、赋值、控制流），主要用于 LINQ to SQL 等查询翻译场景。

这一时期的关键设计是：编译器在看到 `Expression<Func<T, bool>>` 时，会把 Lambda 编译为表达式树而非可执行委托。这是 C# 编译器第一次"把代码当作数据"。

### 2.4 .NET Framework 4.0（2010）：动态语言运行时（DLR）

.NET 4.0 引入了 DLR（Dynamic Language Runtime），`dynamic` 关键字、`ExpandoObject`、`DynamicObject` 等动态特性上线。表达式树也扩展为支持语句（`Expression.Block`、`Expression.Loop`、`Expression.TryCatch` 等），实际上变成了一种"抽象语法树（AST）"。

这一时期的表达式树 API 极为强大，但相对复杂，主要用于 IronPython、IronRuby 等动态语言的实现。

### 2.5 .NET Core 与 .NET 5+（2016-2020）：跨平台与性能优化

.NET Core 重写了运行时，反射 API 在保持兼容性的同时进行了大量性能优化：

- `Type` 与 `TypeInfo` 的分离：`Type` 变为轻量引用，`TypeInfo` 才包含完整元数据。
- `IsByRefLike`、`IsReadOnly` 等新属性支持 C# 7+ 的 `ref struct`、`readonly struct`。
- 引入 `MetadataLoadContext` 用于在不加载程序集的情况下读取元数据，是 AOT 友好的反射方案。

### 2.6 .NET 5+ 与源生成器（2020-至今）

反射最大的痛点是性能与 AOT 兼容性。.NET 5 引入了源生成器（Source Generator），允许在编译时生成代码以替代运行时反射：

- `JsonSerializerContext` 通过源生成器预生成序列化代码，避免运行时反射。
- ASP.NET Core 的路由元数据也部分迁移到源生成器。
- `LibraryImport` 替代 `DllImport`，使用源生成器生成 P/Invoke 代码。

C# 9+ 还引入了函数指针（`delegate*`）、静态匿名函数等特性，使得很多原本依赖反射的场景有了更高效的替代方案。

### 2.7 .NET 9 与 Native AOT（2024-至今）

.NET 9 进一步完善了 Native AOT 支持，反射在 AOT 场景下的限制被明确文档化：

- 完全动态的 `Assembly.Load`、`Emit` 不被支持。
- `Type.GetType(string)` 只能查找已"根化"（rooted）的类型。
- 自定义特性可以读取，但部分反射 API 会被裁剪（trimming）。

这一趋势促使开发者越来越多地使用源生成器、`Roslyn` 分析器等编译时代码生成技术，反射在框架代码中的地位逐渐从"主力"变为"补充"。

## 三、核心概念

### 3.1 Type 对象：类型的运行时表示

在 .NET 中，每一个加载到运行时的类型（类、结构、接口、枚举、委托）都有一个唯一的 `Type` 对象与之对应。`Type` 对象包含了该类型的全部元数据信息：名称、命名空间、基类、实现的接口、属性、方法、字段、构造函数、特性、泛型参数等。

获取 `Type` 对象有三种主要方式：

```csharp
// 方式一：typeof 关键字（编译时确定，最常用）
Type stringType = typeof(string);
Type listType = typeof(List<int>);

// 方式二：从实例获取（运行时确定）
string hello = "hello";
Type instanceType = hello.GetType();

// 方式三：通过完全限定名获取（最灵活，常用于插件系统）
Type? namedType = Type.GetType("System.String, System.Runtime");
Type? genericType = Type.GetType("System.Collections.Generic.List`1[[System.Int32, System.Runtime]]");
```

三种方式各有适用场景：`typeof` 用于编译时已知的类型，`GetType()` 用于运行时实例，`Type.GetType(string)` 用于配置驱动或插件驱动的动态加载。

`Type` 对象的常用属性：

```csharp
Type t = typeof(List<int>);

// 基本属性
Console.WriteLine(t.Name);              // List`1（`1 表示泛型参数个数）
Console.WriteLine(t.FullName);          // System.Collections.Generic.List`1[[System.Int32,...]]
Console.WriteLine(t.Namespace);         // System.Collections.Generic
Console.WriteLine(t.BaseType);          // System.Object

// 类型分类
Console.WriteLine(t.IsClass);           // True
Console.WriteLine(t.IsValueType);       // False
Console.WriteLine(t.IsInterface);       // False
Console.WriteLine(t.IsEnum);            // False
Console.WriteLine(t.IsArray);           // False
Console.WriteLine(t.IsGenericType);     // True
Console.WriteLine(t.IsGenericTypeDefinition);  // False（这是封闭泛型）

// 修饰符
Console.WriteLine(t.IsAbstract);        // False
Console.WriteLine(t.IsSealed);          // True
Console.WriteLine(t.IsPublic);          // True
```

### 3.2 Assembly：程序集

程序集（Assembly）是 .NET 的部署单元，对应一个 `.dll` 或 `.exe` 文件。一个程序集包含一个或多个模块（Module），每个模块包含若干类型。反射通过 `Assembly` 类访问程序集中的类型。

```csharp
// 获取入口程序集（启动应用的那个程序集）
Assembly entryAssembly = Assembly.GetEntryAssembly()!;

// 获取当前代码所在的程序集
Assembly executingAssembly = Assembly.GetExecutingAssembly();

// 获取调用方所在的程序集
Assembly callingAssembly = Assembly.GetCallingAssembly();

// 通过名称加载程序集
Assembly loaded = Assembly.Load(new AssemblyName("System.Text.Json"));

// 从文件加载程序集
Assembly fromFile = Assembly.LoadFrom("/path/to/MyPlugin.dll");

// 从字节数组加载（适用于插件嵌入资源场景）
byte[] dllBytes = File.ReadAllBytes("MyPlugin.dll");
Assembly fromBytes = Assembly.Load(dllBytes);
```

获取程序集中的类型：

```csharp
// 获取所有公共类型
Type[] publicTypes = assembly.GetTypes();

// 获取所有类型（包括非公共）
Type[] allTypes = assembly.GetTypes();

// 按名称获取特定类型
Type? userType = assembly.GetType("MyApp.Models.User");
```

### 3.3 BindingFlags：控制反射搜索范围

`BindingFlags` 是一个枚举，用于精确控制 `GetMembers`、`GetMethod`、`GetProperty` 等方法的搜索行为。默认情况下，反射只返回公共成员。要访问非公共成员或静态成员，必须显式指定 `BindingFlags`。

```csharp
[Flags]
public enum BindingFlags
{
    Default          = 0,
    IgnoreCase       = 1,
    DeclaredOnly     = 2,     // 只搜索当前类型声明的成员，不搜索继承的
    Instance         = 4,     // 搜索实例成员
    Static           = 8,     // 搜索静态成员
    Public           = 16,    // 搜索公共成员
    NonPublic        = 32,    // 搜索非公共成员
    FlattenHierarchy = 64,    // 搜索继承层次中的公共静态成员
    InvokeMethod     = 256,
    CreateInstance   = 512,
    GetField         = 1024,
    SetField         = 2048,
    GetProperty      = 4096,
    SetProperty      = 8192,
    // ...
}
```

常见的 `BindingFlags` 组合：

```csharp
var type = typeof(Sample);

// 默认：公共 + 实例 + 静态（注意：默认其实只返回公共实例成员）
var defaultMembers = type.GetMembers();

// 公共实例成员
var publicInstance = type.GetMembers(BindingFlags.Public | BindingFlags.Instance);

// 非公共实例成员（私有字段、保护方法等）
var nonPublicInstance = type.GetMembers(BindingFlags.NonPublic | BindingFlags.Instance);

// 公共静态成员
var publicStatic = type.GetMembers(BindingFlags.Public | BindingFlags.Static);

// 所有成员（公共 + 非公共 + 实例 + 静态）
var allMembers = type.GetMembers(
    BindingFlags.Public | BindingFlags.NonPublic |
    BindingFlags.Instance | BindingFlags.Static);

// 只搜索当前类型声明的成员（不包含继承的）
var declaredOnly = type.GetMembers(
    BindingFlags.DeclaredOnly |
    BindingFlags.Public | BindingFlags.NonPublic |
    BindingFlags.Instance | BindingFlags.Static);
```

`BindingFlags` 是反射 API 中最容易出错的细节之一。一个常见陷阱是：`GetMethod("SomeMethod")` 默认只搜索公共成员，如果你要找的是私有方法，必须写 `GetMethod("SomeMethod", BindingFlags.NonPublic | BindingFlags.Instance)`。

### 3.4 MemberInfo 家族：成员元数据

所有类型成员的基类是 `MemberInfo`，它有多个派生类：

| 类型 | 描述 | 关键方法 |
|------|------|----------|
| `Type` | 类型本身 | `GetMethods`、`GetProperties` 等 |
| `MethodInfo` | 方法 | `Invoke`、`ReturnType`、`GetParameters` |
| `ConstructorInfo` | 构造函数 | `Invoke` |
| `PropertyInfo` | 属性 | `GetValue`、`SetValue`、`CanRead`、`CanWrite` |
| `FieldInfo` | 字段 | `GetValue`、`SetValue`、`IsInitOnly` |
| `EventInfo` | 事件 | `AddEventHandler`、`RemoveEventHandler` |
| `ParameterInfo` | 参数 | `ParameterType`、`HasDefaultValue` |

下面是一个综合示例：

```csharp
public class Sample
{
    public string PublicField = "public";
    private int _privateField = 42;
    public string Name { get; set; } = "";
    public int Age { get; private set; }
    public void PublicMethod() { }
    private void PrivateMethod() { }
    public static void StaticMethod() { }
    public event EventHandler? SomethingHappened;
}

var type = typeof(Sample);

// 获取所有成员（默认只返回公共成员）
MemberInfo[] members = type.GetMembers();
foreach (var member in members)
{
    Console.WriteLine($"{member.MemberType,-10} {member.Name}");
}
// 输出（节选）：
// Method     get_Name
// Method     set_Name
// Method     get_Age
// Method     PublicMethod
// Method     StaticMethod
// Method     add_SomethingHappened
// Method     remove_SomethingHappened
// Constructor .ctor
// Property   Name
// Property   Age
// Field      PublicField
// Event      SomethingHappened
```

注意：属性的 `get_X` 和 `set_X` 方法也会作为 `MethodInfo` 单独返回，这是因为属性在底层就是一对方法。

### 3.5 CustomAttributeData：特性

特性（Attribute）是 .NET 中给代码元素附加元数据的机制。反射可以读取特性，这是框架实现"声明式编程"的基础。

```csharp
// 自定义特性
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Property)]
public class ColumnAttribute : Attribute
{
    public string Name { get; }
    public bool IsRequired { get; set; }
    public ColumnAttribute(string name) => Name = name;
}

[Column("users", IsRequired = true)]
public class UserEntity
{
    [Column("user_name", IsRequired = true)]
    public string UserName { get; set; } = "";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}

// 读取类上的特性
var tableAttr = typeof(UserEntity).GetCustomAttribute<ColumnAttribute>();
Console.WriteLine($"表名: {tableAttr?.Name}, 必填: {tableAttr?.IsRequired}");

// 读取所有属性上的特性
foreach (var prop in typeof(UserEntity).GetProperties())
{
    var colAttr = prop.GetCustomAttribute<ColumnAttribute>();
    Console.WriteLine($"属性 {prop.Name} -> 列 {colAttr?.Name}");
}

// 读取所有特性（不限定类型）
object[] allAttrs = typeof(UserEntity).GetCustomAttributes(inherit: false);
```

特性读取是 ORM、序列化器、验证框架等的核心机制。例如 EF Core 通过 `[Column]`、`[Table]` 特性映射数据库，System.Text.Json 通过 `[JsonPropertyName]` 控制字段名。

### 3.6 表达式树：代码即数据

表达式树将代码表示为树形数据结构。在 C# 中，表达式树的根类型是 `Expression`，常见的派生类有 `ParameterExpression`、`ConstantExpression`、`BinaryExpression`、`MethodCallExpression` 等。

```csharp
using System.Linq.Expressions;

// 同一个 Lambda，根据目标类型不同，编译为委托或表达式树
Func<int, bool> asDelegate = x => x > 10;
Expression<Func<int, bool>> asExpression = x => x > 10;

// 委托可以直接调用
Console.WriteLine(asDelegate(15));  // True

// 表达式树不能直接调用，需要先编译
var compiled = asExpression.Compile();
Console.WriteLine(compiled(15));  // True

// 表达式树可以分析结构
Console.WriteLine(asExpression.Body.NodeType);        // GreaterThan
Console.WriteLine(asExpression.Parameters[0].Name);   // x
```

表达式树与委托的根本区别：委托是"可执行的代码"，表达式树是"描述代码的数据"。表达式树可以被翻译为其他语言（如 SQL）、被优化、被序列化，而委托只能被执行。

## 四、工作原理

### 4.1 元数据与类型对象

.NET 程序集（DLL/EXE）文件格式是 PE（Portable Executable），其中包含一个特殊的部分叫"元数据（Metadata）"。元数据描述了程序集中所有类型、成员、特性等信息，相当于程序集的"自描述"。

当 CLR 加载一个程序集时，它会解析元数据并为每个类型创建一个 `Type` 对象。这些 `Type` 对象在内存中是单例的——同一个类型在同一个 AppDomain/AssemblyLoadContext 中只有一个 `Type` 对象。这意味着：

```csharp
Type t1 = typeof(string);
Type t2 = "hello".GetType();
Type t3 = Type.GetType("System.String, System.Runtime")!;

// 三个引用指向同一个对象
Console.WriteLine(ReferenceEquals(t1, t2));  // True
Console.WriteLine(ReferenceEquals(t1, t3));  // True
```

这种设计使得 `Type` 对象的比较可以用 `ReferenceEquals`，非常高效。

### 4.2 反射调用的内部机制

当我们通过 `MethodInfo.Invoke` 调用方法时，CLR 内部要完成多个步骤：

1. **参数检查**：验证参数数量、类型是否匹配。
2. **访问权限检查**：验证调用方是否有权限调用该方法（取决于 `BindingFlags` 与 `ReflectionPermission`）。
3. **JIT 编译**：如果目标方法尚未被 JIT 编译，触发 JIT。
4. **参数装箱**：如果方法参数是值类型，而 `Invoke` 接收的是 `object[]`，则需要进行装箱。
5. **调用**：通过函数指针调用方法。
6. **返回值装箱**：如果返回值是值类型，装箱为 `object`。

整个过程的开销远大于直接调用。直接调用一个方法只需要几条 CPU 指令，而 `MethodInfo.Invoke` 涉及数百条指令。这就是反射调用比直接调用慢几十倍的根本原因。

### 4.3 表达式树的编译过程

表达式树的 `Compile()` 方法会将表达式树编译为 IL（Intermediate Language），并通过 JIT 生成可执行的机器码。编译后的委托在调用时几乎与直接写的代码一样快。

```csharp
// 反射调用：每次都经过完整的参数检查与装箱
MethodInfo method = typeof(string).GetMethod("Substring", new[] { typeof(int) })!;
string result = (string)method.Invoke("Hello World", new object[] { 6 })!;

// 表达式树编译：只编译一次，之后调用接近直接调用
ParameterExpression strParam = Expression.Parameter(typeof(string), "s");
ParameterExpression intParam = Expression.Parameter(typeof(int), "i");
MethodCallExpression call = Expression.Call(
    strParam,
    typeof(string).GetMethod("Substring", new[] { typeof(int) })!,
    intParam);
Func<string, int, string> compiled = Expression
    .Lambda<Func<string, int, string>>(call, strParam, intParam)
    .Compile();

// 编译后的委托调用，性能接近直接调用
string fastResult = compiled("Hello World", 6);
```

表达式树编译是反射性能优化的关键技术，后续章节会详细展开。

### 4.4 AssemblyLoadContext 与程序集隔离

在 .NET Core 之前，程序集加载使用 `AppDomain` 进行隔离。.NET Core 之后，`AppDomain` 被简化（不再支持多 AppDomain），取而代之的是 `AssemblyLoadContext`（ALC）。

ALC 提供了程序集的加载上下文，可以用于插件隔离、热重载等场景：

```csharp
// 自定义 AssemblyLoadContext 实现插件隔离
public class PluginLoadContext : AssemblyLoadContext
{
    private readonly AssemblyDependencyResolver _resolver;

    public PluginLoadContext(string pluginPath) : base(isCollectible: true)
    {
        _resolver = new AssemblyDependencyResolver(pluginPath);
    }

    protected override Assembly? Load(AssemblyName assemblyName)
    {
        string? assemblyPath = _resolver.ResolveAssemblyToPath(assemblyName);
        return assemblyPath != null ? LoadFromAssemblyPath(assemblyPath) : null;
    }

    protected override IntPtr LoadUnmanagedDll(string unmanagedDllName)
    {
        string? libraryPath = _resolver.ResolveUnmanagedDllToPath(unmanagedDllName);
        return libraryPath != null ? LoadUnmanagedDllFromPath(libraryPath) : IntPtr.Zero;
    }
}

// 加载插件
var pluginContext = new PluginLoadContext("/path/to/MyPlugin.dll");
Assembly pluginAssembly = pluginContext.LoadFromAssemblyPath("/path/to/MyPlugin.dll");

// 使用插件...

// 卸载插件（释放所有相关资源）
pluginContext.Unload();
```

`isCollectible: true` 参数使得 ALC 可被卸载，这是实现插件热重载的关键。

## 五、快速上手

### 5.1 第一个反射程序

让我们从一个最简单的反射示例开始。假设我们有一个 `User` 类，想通过反射读取它的属性信息：

```csharp
using System.Reflection;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int Age { get; set; }
    private string _secret = "hidden";
}

class Program
{
    static void Main()
    {
        Type userType = typeof(User);

        // 获取所有公共属性
        PropertyInfo[] props = userType.GetProperties();
        Console.WriteLine("公共属性：");
        foreach (var prop in props)
        {
            Console.WriteLine($"  {prop.Name} ({prop.PropertyType.Name})");
        }

        // 获取私有字段
        FieldInfo[] privateFields = userType.GetFields(
            BindingFlags.NonPublic | BindingFlags.Instance);
        Console.WriteLine("\n私有字段：");
        foreach (var field in privateFields)
        {
            Console.WriteLine($"  {field.Name} ({field.FieldType.Name})");
        }

        // 创建实例并设置属性
        var user = new User();
        PropertyInfo nameProp = userType.GetProperty("Name")!;
        nameProp.SetValue(user, "张三");
        Console.WriteLine($"\n设置后 Name = {user.Name}");
    }
}
```

输出：

```
公共属性：
  Id (Int32)
  Name (String)
  Age (Int32)

私有字段：
  _secret (String)

设置后 Name = 张三
```

### 5.2 动态调用方法

```csharp
public class Calculator
{
    public int Add(int a, int b) => a + b;
    public double Power(double x, double y) => Math.Pow(x, y);
}

var calc = new Calculator();
Type calcType = typeof(Calculator);

// 动态调用实例方法
MethodInfo addMethod = calcType.GetMethod("Add")!;
int sum = (int)addMethod.Invoke(calc, new object[] { 3, 5 })!;
Console.WriteLine($"3 + 5 = {sum}");

// 动态调用带参数的方法
MethodInfo powerMethod = calcType.GetMethod("Power")!;
double result = (double)powerMethod.Invoke(calc, new object[] { 2.0, 10.0 })!;
Console.WriteLine($"2^10 = {result}");
```

### 5.3 读取特性构建 ORM 映射

下面是一个简化版的 ORM 映射读取示例，展示特性 + 反射的典型用法：

```csharp
[AttributeUsage(AttributeTargets.Class)]
public class TableAttribute : Attribute
{
    public string Name { get; }
    public TableAttribute(string name) => Name = name;
}

[AttributeUsage(AttributeTargets.Property)]
public class ColumnAttribute : Attribute
{
    public string Name { get; set; }
    public bool IsPrimaryKey { get; set; }
    public bool IsNullable { get; set; }
    public int? MaxLength { get; set; }

    public ColumnAttribute(string name) => Name = name;
}

[Table("users")]
public class User
{
    [Column("id", IsPrimaryKey = true)]
    public int Id { get; set; }

    [Column("username", MaxLength = 50)]
    public string Username { get; set; } = "";

    [Column("email", MaxLength = 100, IsNullable = true)]
    public string? Email { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}

// 通过反射读取映射信息
public class TableMapping
{
    public string TableName { get; set; } = "";
    public List<ColumnMapping> Columns { get; set; } = new();

    public static TableMapping BuildFrom<T>()
    {
        var mapping = new TableMapping();
        Type type = typeof(T);

        // 读取表名
        var tableAttr = type.GetCustomAttribute<TableAttribute>();
        mapping.TableName = tableAttr?.Name ?? type.Name;

        // 读取列映射
        foreach (var prop in type.GetProperties())
        {
            var colAttr = prop.GetCustomAttribute<ColumnAttribute>();
            if (colAttr != null)
            {
                mapping.Columns.Add(new ColumnMapping
                {
                    PropertyName = prop.Name,
                    ColumnName = colAttr.Name,
                    PropertyType = prop.PropertyType,
                    IsPrimaryKey = colAttr.IsPrimaryKey,
                    IsNullable = colAttr.IsNullable,
                    MaxLength = colAttr.MaxLength
                });
            }
        }

        return mapping;
    }
}

public class ColumnMapping
{
    public string PropertyName { get; set; } = "";
    public string ColumnName { get; set; } = "";
    public Type PropertyType { get; set; } = null!;
    public bool IsPrimaryKey { get; set; }
    public bool IsNullable { get; set; }
    public int? MaxLength { get; set; }
}

// 使用
var mapping = TableMapping.BuildFrom<User>();
Console.WriteLine($"表名: {mapping.TableName}");
foreach (var col in mapping.Columns)
{
    Console.WriteLine($"  {col.PropertyName} -> {col.ColumnName} " +
                      $"(类型: {col.PropertyType.Name}, 主键: {col.IsPrimaryKey})");
}
```

### 5.4 第一个表达式树

```csharp
using System.Linq.Expressions;

// 手动构建表达式树：(int x) => x * 2 + 1
ParameterExpression xParam = Expression.Parameter(typeof(int), "x");

// 构建 x * 2
ConstantExpression two = Expression.Constant(2, typeof(int));
BinaryExpression multiply = Expression.Multiply(xParam, two);

// 构建 (x * 2) + 1
ConstantExpression one = Expression.Constant(1, typeof(int));
BinaryExpression body = Expression.Add(multiply, one);

// 组装成 Lambda
Expression<Func<int, int>> lambda =
    Expression.Lambda<Func<int, int>>(body, xParam);

// 编译为委托
Func<int, int> func = lambda.Compile();

// 调用
Console.WriteLine(func(5));   // 11
Console.WriteLine(func(10));  // 21
```

这个示例展示了表达式树的本质：把"代码"拆解为一棵由 `Expression` 节点组成的树，再通过 `Compile()` 转回可执行代码。

## 六、实战示例

### 6.1 通用对象映射器

对象映射器（Object Mapper）是把一个对象的属性值复制到另一个对象对应属性的常见工具，AutoMapper 库的核心原理就是反射 + 表达式树缓存。

```csharp
public class ObjectMapper
{
    // 缓存编译后的映射函数，避免重复反射
    private static readonly Dictionary<(Type, Type), Delegate> _cache = new();

    public static TTarget Map<TSource, TTarget>(TSource source)
        where TTarget : new()
    {
        var key = (typeof(TSource), typeof(TTarget));

        // 检查缓存
        if (!_cache.TryGetValue(key, out var del))
        {
            // 第一次调用时构建映射函数并缓存
            var mapper = BuildMapper<TSource, TTarget>();
            _cache[key] = mapper;
            del = mapper;
        }

        return ((Func<TSource, TTarget>)del)(source);
    }

    // 使用表达式树构建高效的映射函数
    private static Func<TSource, TTarget> BuildMapper<TSource, TTarget>()
        where TTarget : new()
    {
        ParameterExpression sourceParam = Expression.Parameter(typeof(TSource), "src");

        // new TTarget()
        NewExpression newTarget = Expression.New(typeof(TTarget));

        // 为每个属性生成赋值
        var bindings = new List<MemberBinding>();
        var sourceProps = typeof(TSource).GetProperties();
        var targetProps = typeof(TTarget).GetProperties();

        foreach (var targetProp in targetProps)
        {
            var sourceProp = Array.Find(sourceProps,
                p => p.Name == targetProp.Name && p.PropertyType == targetProp.PropertyType);

            if (sourceProp != null && targetProp.CanWrite)
            {
                // src.属性名
                MemberExpression value = Expression.Property(sourceParam, sourceProp);
                bindings.Add(Expression.Bind(targetProp, value));
            }
        }

        // new TTarget { Prop1 = src.Prop1, Prop2 = src.Prop2, ... }
        MemberInitExpression body = Expression.MemberInit(newTarget, bindings);

        // 编译为委托
        return Expression.Lambda<Func<TSource, TTarget>>(body, sourceParam).Compile();
    }
}

// 使用
public class UserDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int Age { get; set; }
}

public class UserViewModel
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public int Age { get; set; }
    public string Extra { get; set; } = "";  // 目标多出的属性
}

var dto = new UserDto { Id = 1, Name = "张三", Age = 25 };
var vm = ObjectMapper.Map<UserDto, UserViewModel>(dto);
Console.WriteLine($"Id={vm.Id}, Name={vm.Name}, Age={vm.Age}, Extra={vm.Extra}");
// Id=1, Name=张三, Age=25, Extra=
```

这个映射器的核心优化是：**反射只在第一次调用时执行**，之后通过缓存的表达式树编译委托，性能接近手写代码。

### 6.2 插件系统

插件系统是反射的另一个经典应用场景。主程序在编译时不知道插件类型，运行时通过反射加载插件程序集、发现实现了插件接口的类型并实例化。

```csharp
// 插件契约（在共享库中定义）
public interface IPlugin
{
    string Name { get; }
    string Version { get; }
    void Initialize();
    void Execute(string input);
    void Shutdown();
}

// 插件元数据特性
[AttributeUsage(AttributeTargets.Class)]
public class PluginInfoAttribute : Attribute
{
    public string DisplayName { get; set; }
    public string Author { get; set; }
    public PluginInfoAttribute(string displayName) => DisplayName = displayName;
}

// 插件加载器
public class PluginLoader
{
    private readonly List<AssemblyLoadContext> _contexts = new();

    public List<IPlugin> LoadPlugins(string pluginsDirectory)
    {
        var plugins = new List<IPlugin>();

        if (!Directory.Exists(pluginsDirectory))
            return plugins;

        foreach (var dllPath in Directory.GetFiles(pluginsDirectory, "*.dll"))
        {
            try
            {
                // 使用独立的 AssemblyLoadContext 加载插件，便于卸载
                var context = new PluginLoadContext(dllPath);
                _contexts.Add(context);

                var assembly = context.LoadFromAssemblyPath(dllPath);
                var pluginTypes = assembly.GetTypes()
                    .Where(t => typeof(IPlugin).IsAssignableFrom(t)
                             && !t.IsAbstract
                             && !t.IsInterface
                             && t.GetConstructor(Type.EmptyTypes) != null);

                foreach (var type in pluginTypes)
                {
                    var plugin = (IPlugin)Activator.CreateInstance(type)!;
                    plugin.Initialize();
                    plugins.Add(plugin);

                    // 读取插件元数据
                    var infoAttr = type.GetCustomAttribute<PluginInfoAttribute>();
                    Console.WriteLine($"加载插件: {plugin.Name} v{plugin.Version} " +
                                      $"(显示名: {infoAttr?.DisplayName}, 作者: {infoAttr?.Author})");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"加载插件失败 {dllPath}: {ex.Message}");
            }
        }

        return plugins;
    }

    public void UnloadAll()
    {
        foreach (var context in _contexts)
        {
            context.Unload();
        }
        _contexts.Clear();
    }
}

// 一个具体的插件实现
[PluginInfo("Hello World 插件", Author = "fanquanpp")]
public class HelloWorldPlugin : IPlugin
{
    public string Name => "HelloWorld";
    public string Version => "1.0.0";

    public void Initialize() => Console.WriteLine($"{Name} 初始化完成");
    public void Execute(string input) => Console.WriteLine($"Hello, {input}!");
    public void Shutdown() => Console.WriteLine($"{Name} 已关闭");
}

// 使用
var loader = new PluginLoader();
var plugins = loader.LoadPlugins("./plugins");
foreach (var plugin in plugins)
{
    plugin.Execute("World");
}
loader.UnloadAll();
```

### 6.3 动态 LINQ 查询

表达式树最常见的应用之一是动态构建 LINQ 查询。EF Core 在解析 LINQ 查询时，实际上就是在遍历表达式树并翻译为 SQL。

```csharp
public static class DynamicQuery
{
    // 动态构建 Where 条件
    public static IQueryable<T> WhereEquals<T>(this IQueryable<T> source,
        string propertyName, object? value)
    {
        var parameter = Expression.Parameter(typeof(T), "x");
        var property = Expression.Property(parameter, propertyName);
        var constant = Expression.Constant(value, property.Type);
        var equality = Expression.Equal(property, constant);

        var lambda = Expression.Lambda<Func<T, bool>>(equality, parameter);
        return source.Where(lambda);
    }

    // 动态构建多条件 AND 查询
    public static IQueryable<T> WhereAll<T>(this IQueryable<T> source,
        IDictionary<string, object?> conditions)
    {
        if (conditions.Count == 0)
            return source;

        var parameter = Expression.Parameter(typeof(T), "x");
        Expression? body = null;

        foreach (var kvp in conditions)
        {
            var property = Expression.Property(parameter, kvp.Key);
            var constant = Expression.Constant(kvp.Value, property.Type);
            var equality = Expression.Equal(property, constant);

            body = body == null ? equality : Expression.AndAlso(body, equality);
        }

        var lambda = Expression.Lambda<Func<T, bool>>(body!, parameter);
        return source.Where(lambda);
    }

    // 动态排序
    public static IOrderedQueryable<T> OrderByDynamic<T>(
        this IQueryable<T> source, string propertyName, bool descending = false)
    {
        var parameter = Expression.Parameter(typeof(T), "x");
        var property = Expression.Property(parameter, propertyName);

        var lambda = Expression.Lambda(property, parameter);
        var methodName = descending ? "OrderByDescending" : "OrderBy";

        // 反射获取 Queryable.OrderBy/OrderByDescending 方法
        var method = typeof(Queryable).GetMethods()
            .Where(m => m.Name == methodName && m.GetParameters().Length == 2)
            .First()
            .MakeGenericMethod(typeof(T), property.Type);

        return (IOrderedQueryable<T>)method.Invoke(null, new object[] { source, lambda })!;
    }
}

// 使用
public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public string Category { get; set; } = "";
}

var products = new List<Product>
{
    new() { Id = 1, Name = "手机", Price = 2999, Category = "电子" },
    new() { Id = 2, Name = "电脑", Price = 6999, Category = "电子" },
    new() { Id = 3, Name = "耳机", Price = 199, Category = "电子" },
    new() { Id = 4, Name = "T恤", Price = 99, Category = "服装" },
    new() { Id = 5, Name = "裤子", Price = 199, Category = "服装" }
}.AsQueryable();

// 动态按类别过滤
var electronics = products.WhereEquals("Category", "电子").ToList();
Console.WriteLine($"电子产品: {electronics.Count} 个");

// 动态多条件过滤
var filtered = products.WhereAll(new Dictionary<string, object?>
{
    ["Category"] = "电子",
    ["Price"] = 199m
}).ToList();
Console.WriteLine($"电子 + 199 元: {filtered.Count} 个");

// 动态排序
var sorted = products.OrderByDynamic("Price", descending: true).ToList();
Console.WriteLine("按价格降序:");
foreach (var p in sorted)
{
    Console.WriteLine($"  {p.Name}: {p.Price}");
}
```

### 6.4 JSON 序列化器

下面是一个简化版的 JSON 序列化器，展示反射在序列化中的核心应用：

```csharp
public class SimpleJsonSerializer
{
    private readonly Dictionary<Type, Func<object, string>> _serializers = new();

    public string Serialize<T>(T obj)
    {
        if (obj == null) return "null";

        Type type = typeof(T);

        // 基本类型直接输出
        if (type == typeof(string))
            return $"\"{Escape(obj.ToString()!)}\"";
        if (type == typeof(int) || type == typeof(long) || type == typeof(double))
            return obj.ToString()!;
        if (type == typeof(bool))
            return (bool)(object)obj ? "true" : "false";
        if (type.IsEnum)
            return $"\"{obj}\"";

        // 复杂对象：遍历属性
        return SerializeObject(obj);
    }

    private string SerializeObject(object obj)
    {
        Type type = obj.GetType();
        var parts = new List<string>();

        foreach (var prop in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            // 跳过只写属性
            if (!prop.CanRead) continue;

            // 读取特性以确定 JSON 字段名
            var jsonAttr = prop.GetCustomAttribute<JsonPropertyNameAttribute>();
            string jsonName = jsonAttr?.Name ?? prop.Name;

            object? value = prop.GetValue(obj);
            string jsonValue = SerializeValue(value, prop.PropertyType);

            parts.Add($"\"{jsonName}\":{jsonValue}");
        }

        return $"{{{string.Join(",", parts)}}}";
    }

    private string SerializeValue(object? value, Type type)
    {
        if (value == null) return "null";
        if (type == typeof(string)) return $"\"{Escape(value.ToString()!)}\"";
        if (type == typeof(int) || type == typeof(long) || type == typeof(decimal) || type == typeof(double))
            return value.ToString()!;
        if (type == typeof(bool)) return (bool)value ? "true" : "false";
        if (type.IsEnum) return $"\"{value}\"";
        if (typeof(IEnumerable).IsAssignableFrom(type) && type != typeof(string))
            return SerializeArray((IEnumerable)value);
        return SerializeObject(value);
    }

    private string SerializeArray(IEnumerable enumerable)
    {
        var items = new List<string>();
        foreach (var item in enumerable)
        {
            if (item == null)
            {
                items.Add("null");
            }
            else
            {
                items.Add(SerializeValue(item, item.GetType()));
            }
        }
        return $"[{string.Join(",", items)}]";
    }

    private string Escape(string s) => s
        .Replace("\\", "\\\\")
        .Replace("\"", "\\\"")
        .Replace("\n", "\\n")
        .Replace("\r", "\\r")
        .Replace("\t", "\\t");
}

// 用于标记 JSON 字段名的特性
[AttributeUsage(AttributeTargets.Property)]
public class JsonPropertyNameAttribute : Attribute
{
    public string Name { get; }
    public JsonPropertyNameAttribute(string name) => Name = name;
}

// 使用
public class Order
{
    [JsonPropertyName("order_id")]
    public int Id { get; set; }

    [JsonPropertyName("customer_name")]
    public string CustomerName { get; set; } = "";

    [JsonPropertyName("total")]
    public decimal Total { get; set; }

    [JsonPropertyName("items")]
    public List<string> Items { get; set; } = new();

    [JsonPropertyName("is_paid")]
    public bool IsPaid { get; set; }
}

var order = new Order
{
    Id = 1024,
    CustomerName = "张三",
    Total = 129.99m,
    Items = new() { "手机", "耳机" },
    IsPaid = true
};

var serializer = new SimpleJsonSerializer();
string json = serializer.Serialize(order);
Console.WriteLine(json);
// {"order_id":1024,"customer_name":"张三","total":129.99,"items":["手机","耳机"],"is_paid":true}
```

### 6.5 依赖注入容器的核心实现

依赖注入（DI）容器的核心功能——类型扫描、构造函数选择、实例创建——都依赖反射。下面是一个极简版 DI 容器：

```csharp
public class MiniContainer
{
    private readonly Dictionary<Type, Func<object>> _factories = new();

    // 注册接口到实现
    public void Register<TInterface, TImplementation>()
        where TImplementation : TInterface
    {
        _factories[typeof(TInterface)] = () => Resolve(typeof(TImplementation));
    }

    // 注册单例
    public void RegisterSingleton<TInterface, TImplementation>()
        where TImplementation : TInterface
    {
        var lazy = new Lazy<object>(() => Resolve(typeof(TImplementation)));
        _factories[typeof(TInterface)] = () => lazy.Value;
    }

    // 解析类型：通过反射找到构造函数并创建实例
    public object Resolve(Type type)
    {
        if (_factories.TryGetValue(type, out var factory))
            return factory();

        // 选择参数最多的公共构造函数
        var ctor = type.GetConstructors(BindingFlags.Public | BindingFlags.Instance)
            .OrderByDescending(c => c.GetParameters().Length)
            .FirstOrDefault();

        if (ctor == null)
            throw new InvalidOperationException($"找不到 {type.Name} 的公共构造函数");

        // 递归解析每个构造函数参数
        var parameters = ctor.GetParameters();
        var args = new object?[parameters.Length];
        for (int i = 0; i < parameters.Length; i++)
        {
            args[i] = Resolve(parameters[i].ParameterType);
        }

        return Activator.CreateInstance(type, args)!;
    }

    public T Resolve<T>() => (T)Resolve(typeof(T));
}

// 使用
public interface ILogger { void Log(string msg); }
public class ConsoleLogger : ILogger
{
    public void Log(string msg) => Console.WriteLine($"[LOG] {msg}");
}

public interface IRepository<T> { T? Get(int id); }
public class UserRepository : IRepository<User>
{
    private readonly ILogger _logger;
    public UserRepository(ILogger logger) => _logger = logger;

    public User? Get(int id)
    {
        _logger.Log($"获取用户 {id}");
        return new User { Id = id, Name = "张三" };
    }
}

public class UserService
{
    private readonly IRepository<User> _repo;
    private readonly ILogger _logger;

    public UserService(IRepository<User> repo, ILogger logger)
    {
        _repo = repo;
        _logger = logger;
    }

    public User? GetUser(int id)
    {
        _logger.Log($"调用 GetUser({id})");
        return _repo.Get(id);
    }
}

var container = new MiniContainer();
container.RegisterSingleton<ILogger, ConsoleLogger>();
container.Register<IRepository<User>, UserRepository>();

var userService = container.Resolve<UserService>();
var user = userService.GetUser(1);
Console.WriteLine($"用户: {user?.Name}");
```

这个简化的容器展示了 DI 容器如何通过反射实现自动依赖解析：扫描类型的构造函数、递归解析每个参数、最终调用构造函数创建实例。

## 七、进阶用法

### 7.1 反射 Emit：运行时生成类型

反射不仅能"读取"类型信息，还能"生成"新类型。`System.Reflection.Emit` 命名空间提供了一组 API 用于在运行时动态生成 IL 代码。这是 DLR（动态语言运行时）、动态代理、ORM 懒加载等场景的底层技术。

下面示例演示如何动态生成一个包含属性的类：

```csharp
using System.Reflection;
using System.Reflection.Emit;

public class DynamicTypeBuilder
{
    public static Type BuildSimpleType(string typeName, Dictionary<string, Type> properties)
    {
        // 创建动态程序集
        var assemblyName = new AssemblyName("DynamicAssembly");
        var assemblyBuilder = AssemblyBuilder.DefineDynamicAssembly(
            assemblyName, AssemblyBuilderAccess.Run);

        // 创建模块
        var moduleBuilder = assemblyBuilder.DefineDynamicModule("MainModule");

        // 创建类型
        var typeBuilder = moduleBuilder.DefineType(typeName,
            TypeAttributes.Public | TypeAttributes.Class | TypeAttributes.AutoClass |
            TypeAttributes.AnsiClass | TypeAttributes.BeforeFieldInit);

        // 为每个属性生成字段 + 属性
        foreach (var kvp in properties)
        {
            string propName = kvp.Key;
            Type propType = kvp.Value;

            // 生成私有字段
            FieldBuilder fieldBuilder = typeBuilder.DefineField(
                $"_{char.ToLower(propName[0])}{propName[1..]}",
                propType, FieldAttributes.Private);

            // 生成属性
            PropertyBuilder propBuilder = typeBuilder.DefineProperty(
                propName, PropertyAttributes.None, propType, null);

            // 生成 get 方法
            MethodBuilder getMethod = typeBuilder.DefineMethod(
                $"get_{propName}",
                MethodAttributes.Public | MethodAttributes.SpecialName |
                MethodAttributes.HideBySig,
                propType, Type.EmptyTypes);

            ILGenerator getIl = getMethod.GetILGenerator();
            getIl.Emit(OpCodes.Ldarg_0);       // 加载 this
            getIl.Emit(OpCodes.Ldfld, fieldBuilder);  // 加载字段
            getIl.Emit(OpCodes.Ret);           // 返回
            propBuilder.SetGetMethod(getMethod);

            // 生成 set 方法
            MethodBuilder setMethod = typeBuilder.DefineMethod(
                $"set_{propName}",
                MethodAttributes.Public | MethodAttributes.SpecialName |
                MethodAttributes.HideBySig,
                null, new[] { propType });

            ILGenerator setIl = setMethod.GetILGenerator();
            setIl.Emit(OpCodes.Ldarg_0);       // 加载 this
            setIl.Emit(OpCodes.Ldarg_1);       // 加载 value
            setIl.Emit(OpCodes.Stfld, fieldBuilder);  // 存储字段
            setIl.Emit(OpCodes.Ret);
            propBuilder.SetSetMethod(setMethod);
        }

        return typeBuilder.CreateType()!;
    }
}

// 使用：动态创建一个 Person 类
var dynamicType = DynamicTypeBuilder.BuildSimpleType("DynamicPerson", new()
{
    ["Name"] = typeof(string),
    ["Age"] = typeof(int),
    ["Email"] = typeof(string)
});

// 创建实例并设置属性
object instance = Activator.CreateInstance(dynamicType)!;
dynamicType.GetProperty("Name")!.SetValue(instance, "张三");
dynamicType.GetProperty("Age")!.SetValue(instance, 25);

Console.WriteLine(dynamicType.GetProperty("Name")!.GetValue(instance));  // 张三
Console.WriteLine(dynamicType.GetProperty("Age")!.GetValue(instance));    // 25
```

反射 Emit 是一个相对底层的主题，理解它需要先学习 IL 指令。但对于框架开发者来说，它是实现动态代理（如 EF Core 的变更跟踪）、AOP（面向切面编程）等高级特性的关键。

### 7.2 Delegate.CreateDelegate：高效的方法绑定

`Delegate.CreateDelegate` 是比 `MethodInfo.Invoke` 更高效的方法调用方式。它直接将 `MethodInfo` 绑定为强类型的委托，避免了 `Invoke` 的参数检查与装箱开销。

```csharp
public class Calculator
{
    public int Add(int a, int b) => a + b;
}

var calc = new Calculator();
MethodInfo addMethod = typeof(Calculator).GetMethod("Add")!;

// 方式一：MethodInfo.Invoke（每次调用都开销大）
var sum1 = (int)addMethod.Invoke(calc, new object[] { 3, 5 })!;

// 方式二：Delegate.CreateDelegate（一次绑定，多次高效调用）
var addDelegate = (Func<Calculator, int, int, int>)
    Delegate.CreateDelegate(typeof(Func<Calculator, int, int, int>), addMethod);

var sum2 = addDelegate(calc, 3, 5);  // 接近直接调用
```

`Delegate.CreateDelegate` 与表达式树编译是反射性能优化的两大手段，性能相当，但 `Delegate.CreateDelegate` 的 API 更简单。

### 7.3 表达式树遍历与修改

表达式树是不可变的，要修改需要使用 `ExpressionVisitor` 类。这是 EF Core 翻译 LINQ 查询的核心技术。

```csharp
// 自定义表达式访问器：把所有字符串字面量改为大写
public class StringToUpperVisitor : ExpressionVisitor
{
    protected override Expression VisitConstant(ConstantExpression node)
    {
        if (node.Value is string s)
        {
            return Expression.Constant(s.ToUpper(), typeof(string));
        }
        return base.VisitConstant(node);
    }
}

// 测试
Expression<Func<string, bool>> predicate = name => name == "hello";

var visitor = new StringToUpperVisitor();
var newBody = visitor.Visit(predicate.Body);
var newPredicate = Expression.Lambda<Func<string, bool>>(newBody, predicate.Parameters);

var compiled = newPredicate.Compile();
Console.WriteLine(compiled("HELLO"));  // True（因为字面量被改成了大写）
Console.WriteLine(compiled("hello"));  // False
```

`ExpressionVisitor` 是一个递归遍历器，访问每个节点时调用对应的 `Visit*` 方法。重写这些方法可以修改表达式树。

### 7.4 MetadataLoadContext：AOT 友好的元数据读取

`MetadataLoadContext` 是 .NET Core 3.0+ 引入的 API，用于在不加载程序集的情况下读取其元数据。这对于 AOT 编译、代码分析器等场景非常重要。

```csharp
using System.Reflection.Metadata;
using System.Reflection.PortableExecutable;

public class MetadataReader
{
    public List<TypeInfo> ReadAllTypes(string assemblyPath)
    {
        var resolver = new PathAssemblyResolver(
            Directory.GetFiles(RuntimeEnvironment.GetRuntimeDirectory(), "*.dll")
                .Concat(new[] { assemblyPath })
                .ToList());

        using var mlc = new MetadataLoadContext(resolver);
        Assembly assembly = mlc.LoadFromAssemblyPath(assemblyPath);

        return assembly.GetTypes().ToList();
    }
}

// 使用：读取一个 DLL 的所有类型而不真正加载它
var reader = new MetadataReader();
var types = reader.ReadAllTypes("/path/to/SomeLibrary.dll");
foreach (var t in types)
{
    Console.WriteLine($"{t.Namespace}.{t.Name}");
}
```

`MetadataLoadContext` 的关键优势：它只读取元数据，不执行任何代码，因此可以读取用其他 .NET 版本编译的程序集，也不会触发类型初始化器（静态构造函数）。

### 7.5 开放泛型与封闭泛型

反射操作泛型类型时，需要区分"开放泛型"（open generic，如 `List<>`）与"封闭泛型"（closed generic，如 `List<int>`）。

```csharp
// 开放泛型：List<T> 的定义
Type openList = typeof(List<>);
Console.WriteLine(openList.IsGenericTypeDefinition);  // True
Console.WriteLine(openList.ContainsGenericParameters);  // True

// 封闭泛型：List<int>
Type closedList = typeof(List<int>);
Console.WriteLine(closedList.IsGenericTypeDefinition);  // False
Console.WriteLine(closedList.ContainsGenericParameters);  // False

// 从开放泛型构造封闭泛型
Type listOfString = openList.MakeGenericType(typeof(string));
Console.WriteLine(listOfString == typeof(List<string>));  // True

// 从封闭泛型获取开放泛型
Type openAgain = closedList.GetGenericTypeDefinition();
Console.WriteLine(openAgain == openList);  // True

// 泛型方法同理
MethodInfo openMethod = typeof(Enumerable).GetMethod("Where")!
    .MakeGenericMethod(typeof(int));

// 检查泛型参数约束
foreach (var arg in openList.GetGenericArguments())
{
    Console.WriteLine($"参数: {arg.Name}");
    Console.WriteLine($"  IsValueType: {arg.GenericParameterAttributes}");
    foreach (var constraint in arg.GetGenericParameterConstraints())
    {
        Console.WriteLine($"  约束: {constraint.Name}");
    }
}
```

### 7.6 动态类型与 dynamic

C# 4.0 引入的 `dynamic` 关键字在底层使用了反射（实际上是 DLR，但 DLR 内部大量使用反射）。`dynamic` 类型在编译时不进行类型检查，所有操作都在运行时通过反射查找。

```csharp
dynamic obj = "hello";

// 编译时不检查，运行时通过反射查找 Substring 方法
dynamic sub = obj.Substring(2);
Console.WriteLine(sub);  // llo

// dynamic 与反射的等价关系
// 上面这行代码大致等价于：
// var sub = typeof(string).GetMethod("Substring", new[] { typeof(int) })
//     .Invoke("hello", new object[] { 2 });

// dynamic 的优势：代码简洁
// 反射的优势：可控、可缓存、可优化
dynamic calc = new Calculator();
dynamic result = calc.Add(3, 5);  // 编译时不检查，运行时查找
Console.WriteLine(result);
```

`dynamic` 适合脚本场景、与动态语言互操作、COM 互操作等。但对于性能敏感的场景，显式反射 + 缓存通常更可控。

## 八、性能分析

反射的性能开销是开发者最关心的问题之一。本节通过 BenchmarkDotNet 风格的对比，量化反射的开销，并介绍优化方案。

### 8.1 反射调用的性能对比

以下是不同调用方式调用一个简单方法 `int Add(int, int)` 的相对性能（数值为相对耗时，直接调用为基准 1）：

| 调用方式 | 相对耗时 | 备注 |
|---------|---------|------|
| 直接调用 | 1x | 编译时已知，JIT 内联 |
| 委托调用 | 1.1x | 编译时已知签名 |
| `Delegate.CreateDelegate` | 1.2x | 一次绑定，多次调用 |
| 表达式树编译 | 1.3x | 一次编译，多次调用 |
| `MethodInfo.Invoke` | 50-200x | 每次调用都检查参数 |
| `dynamic` | 5-20x | DLR 缓存机制 |

可以看到，直接使用 `MethodInfo.Invoke` 比直接调用慢 50-200 倍，这是反射"慢"的根源。但通过 `Delegate.CreateDelegate` 或表达式树编译，性能可以接近直接调用。

### 8.2 缓存反射结果

反射获取元数据本身（`GetMethod`、`GetProperty` 等）也有开销。频繁调用 `GetMethod` 会重复扫描类型成员，应该缓存结果：

```csharp
// 错误：每次调用都重新获取 MethodInfo
public string GetName(User user)
{
    var prop = typeof(User).GetProperty("Name")!;
    return (string)prop.GetValue(user)!;
}

// 正确：缓存 MethodInfo
private static readonly PropertyInfo _nameProp = typeof(User).GetProperty("Name")!;
public string GetNameFast(User user)
{
    return (string)_nameProp.GetValue(user)!;
}
```

### 8.3 表达式树编译优化

对于高频调用的反射操作，使用表达式树编译为委托是最有效的优化：

```csharp
public class PropertyAccessor<T>
{
    private static readonly Func<T, string> _getName;
    private static readonly Action<T, string> _setName;

    // 静态构造函数：一次性编译属性访问器
    static PropertyAccessor()
    {
        var param = Expression.Parameter(typeof(T), "obj");

        // 编译 getter
        var prop = Expression.Property(param, "Name");
        _getName = Expression.Lambda<Func<T, string>>(prop, param).Compile();

        // 编译 setter
        var valueParam = Expression.Parameter(typeof(string), "value");
        var assign = Expression.Assign(prop, valueParam);
        _setName = Expression.Lambda<Action<T, string>>(assign, param, valueParam).Compile();
    }

    public static string GetName(T obj) => _getName(obj);
    public static void SetName(T obj, string value) => _setName(obj, value);
}

// 使用
var user = new User { Name = "张三" };
Console.WriteLine(PropertyAccessor<User>.GetName(user));  // 张三
PropertyAccessor<User>.SetName(user, "李四");
Console.WriteLine(user.Name);  // 李四
```

这种模式在 ASP.NET Core、EF Core、System.Text.Json 等框架中广泛使用，是反射性能优化的标准做法。

### 8.4 AssemblyLoadContext 与程序集加载性能

加载程序集是反射中开销最大的操作之一。频繁 `Assembly.LoadFrom` 会重复加载、占用内存。最佳实践：

```csharp
// 缓存已加载的程序集
private static readonly ConcurrentDictionary<string, Assembly> _assemblyCache = new();

public Assembly LoadAssembly(string path)
{
    return _assemblyCache.GetOrAdd(path, p => Assembly.LoadFrom(p));
}

// 使用 MetadataLoadContext 只读取元数据（不加载到运行时）
public TypeInfo[] ReadTypesOnly(string path)
{
    var resolver = new PathAssemblyResolver(new[] { path });
    using var mlc = new MetadataLoadContext(resolver);
    return mlc.LoadFromAssemblyPath(path).GetTypes();
}
```

### 8.5 性能优化的数学视角

反射调用的性能开销可以用以下模型估算：

$$
T_{\text{reflect}} = T_{\text{lookup}} + T_{\text{check}} + T_{\text{box}} + T_{\text{call}} + T_{\text{unbox}}
$$

其中：
- $T_{\text{lookup}}$ 是查找方法元数据的开销（可通过缓存消除）
- $T_{\text{check}}$ 是参数类型与数量检查的开销
- $T_{\text{box}}$ 是值类型参数装箱的开销
- $T_{\text{call}}$ 是实际方法调用开销
- $T_{\text{unbox}}$ 是返回值拆箱的开销

直接调用的开销只有 $T_{\text{call}}$。表达式树编译消除了 $T_{\text{check}}$、$T_{\text{box}}$、$T_{\text{unbox}}$，因此性能接近直接调用。

$$
T_{\text{compiled}} \approx T_{\text{call}} + \epsilon
$$

其中 $\epsilon$ 是委托调用的额外开销，通常小于 10%。

## 九、最佳实践

### 9.1 缓存反射结果

所有反射获取的元数据（`Type`、`MethodInfo`、`PropertyInfo` 等）都应该缓存，避免重复扫描。最简单的方式是使用 `static readonly` 字段或 `ConcurrentDictionary`。

```csharp
// 方式一：static readonly（适用于已知类型）
private static readonly MethodInfo _toStringMethod = typeof(object).GetMethod("ToString")!;

// 方式二：ConcurrentDictionary 缓存（适用于动态类型）
private static readonly ConcurrentDictionary<(Type, string), MethodInfo> _methodCache = new();

public MethodInfo GetMethod(Type type, string name)
{
    return _methodCache.GetOrAdd((type, name), k => k.Item1.GetMethod(k.Item2)!);
}
```

### 9.2 优先使用表达式树编译

对于需要多次执行的反射调用，使用表达式树编译为委托，或使用 `Delegate.CreateDelegate`。只执行一次的反射调用可以直接 `Invoke`。

```csharp
// 一次性调用：直接 Invoke
public void OneOffCall()
{
    var method = typeof(SomeType).GetMethod("SomeMethod")!;
    method.Invoke(target, new object[] { arg });
}

// 多次调用：编译为委托
private static readonly Func<SomeType, ArgType, ReturnType> _method =
    BuildMethodCaller();

private static Func<SomeType, ArgType, ReturnType> BuildMethodCaller()
{
    var method = typeof(SomeType).GetMethod("SomeMethod")!;
    var targetParam = Expression.Parameter(typeof(SomeType), "t");
    var argParam = Expression.Parameter(typeof(ArgType), "a");
    var call = Expression.Call(targetParam, method, argParam);
    return Expression.Lambda<Func<SomeType, ArgType, ReturnType>>(
        call, targetParam, argParam).Compile();
}
```

### 9.3 使用 BindingFlags 精确控制搜索

避免使用默认的 `GetMembers()`（返回所有公共成员），明确指定 `BindingFlags`：

```csharp
// 不推荐：返回所有公共成员，包括继承的
var members = type.GetMembers();

// 推荐：精确指定搜索范围
var instanceProps = type.GetProperties(
    BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly);
```

### 9.4 处理可空类型与泛型

反射操作可空类型 `Nullable<T>` 时，需要注意 `Type` 对象表示的是底层类型还是可空类型：

```csharp
Type intType = typeof(int);
Type nullableIntType = typeof(int?);

Console.WriteLine(intType == nullableIntType);  // False
Console.WriteLine(Nullable.GetUnderlyingType(nullableIntType));  // System.Int32

// 检查是否为可空类型
public static bool IsNullable(Type type) =>
    Nullable.GetUnderlyingType(type) != null;

// 获取可空类型的底层类型
public static Type UnwrapNullable(Type type) =>
    Nullable.GetUnderlyingType(type) ?? type;
```

### 9.5 异常处理

反射调用可能抛出多种异常，需要正确处理：

```csharp
try
{
    var result = method.Invoke(target, args);
}
catch (TargetInvocationException ex)
{
    // 目标方法抛出的异常会被包装在 TargetInvocationException 中
    Console.WriteLine($"方法内部异常: {ex.InnerException?.Message}");
    throw ex.InnerException!;
}
catch (TargetParameterCountException ex)
{
    Console.WriteLine($"参数数量不匹配: {ex.Message}");
}
catch (ArgumentException ex)
{
    Console.WriteLine($"参数类型不匹配: {ex.Message}");
}
```

注意：通过反射调用的方法抛出的异常会被包装在 `TargetInvocationException` 中，要获取原始异常需要访问 `InnerException`。

### 9.6 谨慎访问私有成员

反射可以访问私有成员，但这破坏了封装性，应该谨慎使用：

```csharp
// 通常不推荐：访问私有字段
var field = typeof(SomeClass).GetField("_privateField",
    BindingFlags.NonPublic | BindingFlags.Instance);
var value = field!.GetValue(instance);

// 合理使用场景：
// 1. 单元测试：测试私有方法
// 2. 框架开发：序列化器需要访问所有字段
// 3. 调试工具：诊断内部状态
// 4. 兼容性：访问第三方库无法修改的内部状态
```

### 9.7 AOT 兼容性考虑

如果项目目标是 Native AOT，反射的使用需要特别注意：

```csharp
// AOT 不支持：
// 1. Assembly.LoadFrom 动态加载程序集
// 2. Reflection.Emit 动态生成类型
// 3. Type.GetType(string) 查找未根化的类型

// AOT 友好的做法：
// 1. 使用 typeof() 编译时获取 Type
// 2. 使用源生成器替代运行时反射
// 3. 使用 DynamicDependency 特性显式声明依赖

[DynamicDependency("HelperMethod", typeof(HelperClass))]
public void CallHelperDynamically()
{
    var method = typeof(HelperClass).GetMethod("HelperMethod");
    method?.Invoke(null, null);
}
```

## 十、常见陷阱

### 10.1 性能陷阱：循环内反射

最常见的反射性能问题是循环内重复反射：

```csharp
// 陷阱：循环内每次都反射
foreach (var item in items)
{
    var prop = item.GetType().GetProperty("Name")!;
    var name = prop.GetValue(item);
    Console.WriteLine(name);
}

// 正确：将反射移出循环
var prop = items.First().GetType().GetProperty("Name")!;
foreach (var item in items)
{
    var name = prop.GetValue(item);
    Console.WriteLine(name);
}

// 更优：编译为委托
var getter = BuildPropertyGetter(items.First().GetType(), "Name");
foreach (var item in items)
{
    var name = getter(item);
    Console.WriteLine(name);
}
```

### 10.2 BindingFlags 陷阱

默认的 `GetMembers()` 只返回公共成员，这是一个常见的混淆点：

```csharp
public class MyClass
{
    public int PublicProp { get; set; }
    private int _privateField;
    protected void ProtectedMethod() { }
}

var type = typeof(MyClass);

// 陷阱：默认不返回私有成员
var allMembers = type.GetMembers();
Console.WriteLine(allMembers.Length);  // 只有公共成员

// 正确：明确指定 BindingFlags
var trulyAll = type.GetMembers(
    BindingFlags.Public | BindingFlags.NonPublic |
    BindingFlags.Instance | BindingFlags.Static);
```

另一个陷阱是 `BindingFlags.FlattenHierarchy` 只对公共静态成员生效，非公共静态成员不会被返回：

```csharp
public class Base
{
    public static int PublicStatic = 1;
    private static int PrivateStatic = 2;
    protected static int ProtectedStatic = 3;
}

public class Derived : Base { }

// 只返回 PublicStatic，不返回 ProtectedStatic 和 PrivateStatic
var statics = typeof(Derived).GetFields(
    BindingFlags.Static | BindingFlags.FlattenHierarchy);
```

### 10.3 Nullable<T> 陷阱

反射操作可空类型时，`PropertyInfo.PropertyType` 返回的是 `Nullable<int>` 而不是 `int`，这可能导致类型不匹配：

```csharp
public class Model
{
    public int? Age { get; set; }
}

var prop = typeof(Model).GetProperty("Age")!;
Console.WriteLine(prop.PropertyType);  // System.Nullable`1[System.Int32]
Console.WriteLine(prop.PropertyType == typeof(int));  // False
Console.WriteLine(prop.PropertyType == typeof(int?));  // True

// 陷阱：直接设置非可空值会抛异常
prop.SetValue(new Model(), "not an int");  // 抛 ArgumentException

// 正确：处理可空类型
Type underlying = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;
object? converted = Convert.ChangeType("25", underlying);
prop.SetValue(new Model(), converted);
```

### 10.4 静态构造函数触发

通过反射访问类型的成员可能触发静态构造函数（类型初始化器），这是一个容易忽略的副作用：

```csharp
public class HeavyInit
{
    static HeavyInit()
    {
        Console.WriteLine("静态构造函数执行");
        // 模拟昂贵的初始化
        Thread.Sleep(1000);
    }
}

// 访问类型信息可能触发静态构造
var type = typeof(HeavyInit);  // 不触发
var props = type.GetProperties();  // 不触发
var instance = Activator.CreateInstance<HeavyInit>();  // 触发！
```

### 10.5 AssemblyLoadContext 卸载陷阱

使用可收集的 `AssemblyLoadContext` 时，必须确保所有引用都被释放，否则卸载会失败：

```csharp
var alc = new PluginLoadContext("plugin.dll");
var assembly = alc.LoadFromAssemblyPath("plugin.dll");
var plugin = (IPlugin)Activator.CreateInstance(assembly.GetTypes()[0])!;

// 使用插件...

// 陷阱：plugin 变量持有对 ALC 中类型的引用，无法卸载
plugin = null!;  // 释放引用
GC.Collect();
GC.WaitForPendingFinalizers();
alc.Unload();  // 现在可以卸载
```

### 10.6 表达式树限制

并非所有 C# 语法都能用表达式树表示。以下语法在表达式树中不被支持（或仅在 .NET 4.0+ 的扩展 API 中支持）：

```csharp
// 这些在标准 Lambda 中无法转为表达式树：
Expression<Func<int, int>> expr;

// 1. 语句块（需要 Expression.Block）
// expr = x => { var y = x * 2; return y + 1; };  // 编译错误

// 2. try-catch（需要 Expression.TryCatch）
// expr = x => { try { return x; } catch { return 0; } };  // 编译错误

// 3. 循环（需要 Expression.Loop）
// expr = x => { while (x > 0) x--; return x; };  // 编译错误

// 4. yield return / await
// 这些完全不支持
```

如果需要构建复杂的逻辑，需要使用 `Expression.Block`、`Expression.TryCatch`、`Expression.Loop` 等底层 API 手动构建。

### 10.7 反射与继承层次的陷阱

`GetMembers` 默认返回继承层次中的公共成员，但 `GetMethod` 默认只搜索当前类型，不搜索基类。这是一个容易混淆的不一致：

```csharp
public class Base { public void BaseMethod() { } }
public class Derived : Base { public void DerivedMethod() { } }

var type = typeof(Derived);

// GetMembers 返回继承的公共成员
var members = type.GetMembers();
Console.WriteLine(members.Any(m => m.Name == "BaseMethod"));  // True

// GetMethod 也搜索继承的
var method = type.GetMethod("BaseMethod");
Console.WriteLine(method != null);  // True

// 但 BindingFlags.DeclaredOnly 会排除继承的
var declaredOnly = type.GetMethod("BaseMethod",
    BindingFlags.DeclaredOnly | BindingFlags.Instance | BindingFlags.Public);
Console.WriteLine(declaredOnly == null);  // True
```

## 十一、对比分析

### 11.1 反射 vs 表达式树

| 维度 | 反射 | 表达式树 |
|------|------|----------|
| 目的 | 操作类型元数据 | 表示代码逻辑 |
| API | `MethodInfo.Invoke` 等 | `Expression.Call` 等 |
| 性能 | 慢（每次检查参数） | 快（编译后接近直接调用） |
| 灵活性 | 高（运行时任意操作） | 中（需要构建表达式） |
| AOT 兼容 | 部分支持 | 支持（编译时构建） |
| 学习曲线 | 平缓 | 陡峭 |
| 典型场景 | 框架开发、插件系统 | LINQ、EF Core、动态查询 |

### 11.2 反射 vs 源生成器

| 维度 | 反射 | 源生成器 |
|------|------|----------|
| 执行时机 | 运行时 | 编译时 |
| 性能开销 | 大（运行时扫描） | 无（编译时生成） |
| AOT 兼容 | 部分支持 | 完全支持 |
| 灵活性 | 高（任意类型） | 中（编译时已知） |
| 调试 | 容易 | 困难（生成的代码） |
| 典型场景 | 插件系统、动态加载 | 序列化器、ORM、配置 |

源生成器是 .NET 5+ 推荐的反射替代方案，特别适合 AOT 场景。但对于真正需要运行时动态性的场景（如插件系统），反射仍然是不可替代的。

### 11.3 反射 vs dynamic

| 维度 | 反射 | dynamic |
|------|------|---------|
| 类型检查 | 显式（开发者控制） | 隐式（运行时） |
| 性能 | 慢（无缓存）/ 快（缓存后） | 中等（DLR 缓存） |
| 代码可读性 | 差（冗长） | 好（简洁） |
| 编译时检查 | 无 | 无 |
| IDE 支持 | 有（强类型 API） | 无 |
| 典型场景 | 框架开发 | COM 互操作、动态语言互操作 |

### 11.4 MethodInfo.Invoke vs Delegate.CreateDelegate vs 表达式树

| 方式 | 一次绑定开销 | 调用开销 | 灵活性 |
|------|------------|---------|--------|
| `MethodInfo.Invoke` | 无 | 极高 | 最高 |
| `Delegate.CreateDelegate` | 中 | 低 | 中 |
| 表达式树编译 | 高 | 低 | 中 |

选择建议：
- 一次性调用：`MethodInfo.Invoke`
- 多次调用、签名已知：`Delegate.CreateDelegate`
- 多次调用、需要动态构建：表达式树编译

## 十二、总结

反射与表达式树是 C# 元编程能力的两大支柱。反射让我们能够在运行时检查和操作类型信息，是依赖注入、序列化、ORM、插件系统等框架的核心机制；表达式树则将代码表示为数据结构，使得 LINQ 查询翻译、动态查询构建、EF Core 的 SQL 生成等成为可能。

### 12.1 核心要点回顾

1. **Type 对象是反射的入口**：每个类型在运行时都有唯一的 `Type` 对象，通过 `typeof`、`GetType()`、`Type.GetType()` 获取。

2. **BindingFlags 控制搜索范围**：默认只返回公共成员，访问非公共或静态成员需要显式指定 `BindingFlags`。

3. **MemberInfo 家族**：`MethodInfo`、`PropertyInfo`、`FieldInfo`、`ConstructorInfo` 等描述类型的各个成员。

4. **特性读取**：`GetCustomAttribute<T>` 是读取特性的标准方式，是声明式编程的基础。

5. **表达式树 = 代码即数据**：`Expression<Func<T, bool>>` 将 Lambda 表示为树形结构，可以分析、修改、编译。

6. **性能优化是关键**：反射调用比直接调用慢几十倍，但通过缓存反射结果、使用表达式树编译或 `Delegate.CreateDelegate`，可以接近直接调用的性能。

7. **AOT 兼容性**：Native AOT 对反射有严格限制，应优先使用源生成器替代运行时反射。

### 12.2 技术演进趋势

反射在 .NET 生态中的地位正在从"主力"变为"补充"。这一趋势体现在：

- **源生成器崛起**：`System.Text.Json`、`LibraryImport`、ASP.NET Core 路由等越来越多地使用源生成器替代反射，以获得更好的性能与 AOT 兼容性。
- **Native AOT 推动**：.NET 9+ 对 Native AOT 的支持促使开发者重新审视反射的使用，避免动态加载与 `Reflection.Emit`。
- **表达式树与源生成器结合**：未来的元编程可能更多地在编译时完成，表达式树的角色也会相应变化。

### 12.3 学习建议

1. **从基础 API 开始**：先掌握 `Type`、`MethodInfo`、`PropertyInfo` 的基本用法，再学习表达式树。
2. **理解性能模型**：通过 BenchmarkDotNet 实测不同调用方式的开销，建立性能直觉。
3. **阅读框架源码**：ASP.NET Core、EF Core、System.Text.Json 的源码是反射与表达式树的最佳实践宝库。
4. **关注 AOT**：尽早尝试 Native AOT 发布，了解反射的限制与替代方案。
5. **实践项目**：实现一个简化版的 DI 容器、JSON 序列化器或 ORM，是掌握反射的最佳方式。

### 12.4 扩展阅读

- ECMA-335 标准：.NET 运行时与元数据的权威规范。
- 《CLR via C#》(Jeffrey Richter)：深入理解 CLR 与反射的经典书籍。
- 《C# in Depth》(Jon Skeet)：C# 语言特性的演进历史。
- .NET 官方文档：[Reflection in .NET](https://learn.microsoft.com/dotnet/framework/reflection-and-codedom/reflection)
- 表达式树文档：[Expression Trees (C#)](https://learn.microsoft.com/dotnet/csharp/advanced-topics/expression-trees/)
- 源生成器文档：[C# Source Generators](https://learn.microsoft.com/dotnet/csharp/roslyn-sdk/source-generators-overview)

反射与表达式树是 .NET 高级开发的必修课。掌握它们不仅能让你写出更强大的框架与库，更能让你深入理解 .NET 运行时的工作原理，从"会用 C#"进阶到"精通 .NET"。
