---
order: 3
title: 'C# 面向对象编程'
module: csharp
category: 'C#'
difficulty: beginner
description: '类与对象、构造函数、继承、多态、抽象类与接口、属性与索引器、运算符重载、记录类型(record)、SOLID 原则与设计模式'
author: fanquanpp
updated: '2026-07-21'
related:
  - csharp/概述与环境配置
  - csharp/基础语法
  - csharp/泛型与集合
  - csharp/异步编程
  - csharp/LINQ与函数式编程
prerequisites: []
---

## 学习目标

完成本章学习后，读者应当能够达到以下认知层级（参照 Bloom 分类法）：

- **记忆（Remembering）**：复述面向对象四大核心特性（封装、继承、多态、抽象）的定义，列举 C# 中类、对象、字段、属性、方法、构造函数等基本概念。
- **理解（Understanding）**：解释 C# 中 `class` 与 `record`、`abstract class` 与 `interface`、`override` 与 `new`、`virtual` 与 `sealed` 等关键字的语义差异；阐述值类型与引用类型在对象模型中的不同表现。
- **应用（Applying）**：运用继承、接口实现、运算符重载、索引器、属性等特性，独立设计中等规模的领域模型；通过 `with` 表达式、`init` 访问器、`required` 修饰符实现不可变对象。
- **分析（Analyzing）**：解构复杂系统的对象关系（IS-A、HAS-A、CAN-DO），对比不同设计选择（抽象类 vs 接口、class vs record vs struct）在性能、可维护性、版本控制维度上的权衡。
- **评价（Evaluating）**：评估给定代码是否符合 SOLID 原则，识别违反单一职责、开闭原则、里氏替换的反模式，并提出重构方案。
- **创造（Creating）**：基于领域驱动设计思想，设计高内聚低耦合的对象模型；运用设计模式（工厂、策略、规约、装饰器）构建可扩展架构；为开源库或企业应用设计对外稳定、对内可演进的类型层次结构。

## 历史动机与背景

面向对象编程（Object-Oriented Programming, OOP）的根源可追溯至 1967 年 Simula 67 语言，由 Ole-Johan Dahl 与 Kristen Nygaard 在挪威计算中心设计，最初用于模拟离散事件系统。Simula 引入了类、对象、子类、协程等奠基性概念，但其影响力直到 Smalltalk（1970 年代，Xerox PARC，Alan Kay 设计）才真正爆发。Smalltalk 确立了"一切皆对象"与"消息传递"哲学，并首次完整实现了继承、多态、封装三大特性。

C++（Bjarne Stroustrup, 1979）将 Simula 的对象模型嫁接到 C 语言，引入多继承、虚函数表、运算符重载、模板等机制，但保留了手动内存管理。Java（James Gosling, 1995）摒弃了多继承与指针，引入垃圾回收、接口、单一根类层次（`Object`），成为企业级 OOP 的事实标准。

C# 由 Anders Hejlsberg 主导设计，2000 年发布 1.0 版本。设计哲学融合了 Java 的简洁性、C++ 的表达力、Delphi 的组件模型，并逐步演化出独特特性：

- **C# 2.0（2005）**：泛型、迭代器、分部类、可空类型，解决了 Java 泛型类型擦除的痛点。
- **C# 3.0（2007）**：自动属性、扩展方法、LINQ、Lambda 表达式、表达式树，推动函数式与面向对象融合。
- **C# 4.0（2010）**：动态类型、命名参数、协变逆变，增强 COM 互操作。
- **C# 5.0（2012）**：`async/await`，重新定义异步编程。
- **C# 6.0（2015）**：表达式主体成员、字符串插值、空条件运算符。
- **C# 7.0（2017）**：模式匹配、元组、本地函数、`ref return`。
- **C# 8.0（2019）**：可空引用类型、接口默认方法、异步流。
- **C# 9.0（2020）**：`record`、`init` 访问器、目标类型 `new`、顶级语句。
- **C# 10.0（2021）**：`record struct`、全局 using、文件范围命名空间。
- **C# 11.0（2022）**：`required` 修饰符、列表模式、静态抽象接口成员。
- **C# 12.0（2023）**：主构造函数、集合表达式、`ref readonly` 参数。
- **C# 13.0（2024）**：扩展类型（预览）、`params` 集合、`field` 上下文关键字。

C# 的对象模型演进反映了软件工程范式的迁移：从"重型继承层次"（2000 年代的 J2EE 风格）到"组合优于继承"（2010 年代）再到"数据优先与函数式融合"（2020 年代的 record + 模式匹配）。理解这一背景，有助于在 C# 中做出符合现代工程实践的设计选择。

## 形式化定义

### 类型系统的形式化模型

在类型理论中，一个对象系统可形式化为三元组 $\mathcal{O} = (\mathcal{T}, \preceq, \mathcal{M})$，其中：

- $\mathcal{T}$ 是类型的集合
- $\preceq$ 是子类型关系（subtyping），满足自反性、反对称性、传递性，构成偏序集 $(\mathcal{T}, \preceq)$
- $\mathcal{M} : \mathcal{T} \to 2^{\mathcal{S}}$ 是将每个类型映射到其方法集合的函数，$\mathcal{S}$ 为签名空间

**子类型关系**：$S \preceq T$ 表示 $S$ 是 $T$ 的子类型，对任意期望 $T$ 的上下文，$S$ 的实例均可安全替换（里氏替换原则 LSP）。

**继承的数学语义**：若类 $B$ 继承类 $A$（`class B : A`），则 $B \preceq A$，且 $\mathcal{M}(A) \subseteq \mathcal{M}(B)$（方法集扩展）或经过重写后 $\mathcal{M}(A)$ 中的方法在 $B$ 中有新实现（同签名，行为子类型）。

**接口的多重实现**：类 $C$ 实现接口 $I_1, I_2, \ldots, I_n$ 时，$C \preceq I_k$ 对所有 $k$ 成立，且 $\bigcup_{k=1}^{n} \mathcal{M}(I_k) \subseteq \mathcal{M}(C)$。

### 多态的指称语义

**静态分派**：方法调用 $e.m(\vec{a})$ 在编译期绑定到声明类型的实现，复杂度 $O(1)$。

**动态分派**：虚方法调用基于运行时类型在虚方法表（vtable）中查找实现。设类型 $T$ 的 vtable 为 $V_T : \text{Signature} \to \text{Address}$，则调用 $e.m(\vec{a})$ 的运行时开销为：

$$
\text{Cost}_{\text{dispatch}} = c_{\text{vtable lookup}} + c_{\text{cache miss}} \cdot P_{\text{miss}}
$$

其中 $P_{\text{miss}}$ 是内联缓存未命中概率。现代 JIT 通过内联缓存（inline cache）与去虚化（devirtualization）将单态调用点开销降至与静态分派相当。

### 封装的信息论视角

封装可形式化为：对外可见的状态集 $\Sigma_{\text{pub}}$ 是内部状态集 $\Sigma_{\text{priv}}$ 的投影：

$$
\Sigma_{\text{pub}} = \pi(\Sigma_{\text{priv}}), \quad \pi : \Sigma_{\text{priv}} \to \Sigma_{\text{pub}}
$$

不变量 $I : \Sigma_{\text{priv}} \to \text{Bool}$ 在每次方法调用前后保持，即：

$$
\forall s \in \Sigma_{\text{priv}}, \forall m \in \mathcal{M}(T) : I(s) \Rightarrow I(m(s))
$$

破坏封装（如公开字段）等价于放宽 $\pi$ 使 $\Sigma_{\text{pub}} \approx \Sigma_{\text{priv}}$，从而失去不变量保护。

### Record 的值语义

`record` 类型重写 `Equals` 与 `GetHashCode` 为结构化相等：

$$
\text{Equals}(r_1, r_2) \iff \bigwedge_{i=1}^{n} \text{Equals}(r_1.f_i, r_2.f_i)
$$

其中 $f_1, \ldots, f_n$ 是 record 的所有字段。`with` 表达式的语义为：

$$
r_2 = r_1 \triangleleft \{ f_i \mapsto v_i \} \iff \forall j \neq i : r_2.f_j = r_1.f_j \land r_2.f_i = v_i
$$

## 理论推导

### 虚方法调用的性能模型

假设类层次深度为 $d$，每层平均虚方法数为 $m$。虚方法调用的最坏情况时间复杂度为：

$$
T_{\text{virtual}}(d, m) = O(d \cdot \log m)
$$

（基于平衡二叉搜索的 vtable 查找）。实际 JIT 通过以下技术优化：

1. **类层次分析（CHA）**：若某虚方法在程序中只有一个实现，则可静态绑定。
2. **内联缓存（IC）**：记录上次调用点的接收者类型，若类型相同则直接调用。
3. **多态内联缓存（PIC）**：维护少数几个常见类型的缓存链。
4. **推测性去虚化**：基于 profile-guided optimization 假设最常见类型并内联，保留去优化守护。

实测显示，现代 .NET 8 中虚方法调用的平均开销约为直接调用的 1.5-3 倍，但在内联后可消除全部开销。

### 继承深度的复杂度代价

设继承层次深度为 $h$，每层平均构造函数执行工作量为 $w$，则对象构造的总工作量为：

$$
W_{\text{ctor}}(h) = \sum_{i=1}^{h} w_i = O(h \cdot \bar{w})
$$

深层继承层次（$h > 5$）通常意味着：

- 构造链冗长，初始化成本高
- 状态来源分散，调试困难
- 修改基类影响面巨大，违反开闭原则

**经验法则**：优先组合（composition）而非继承，保持继承层次深度 $h \leq 3$。

### 多态集合的内存布局

`List<Animal>` 存储 `Animal` 引用，每个元素为 8 字节（64 位）指针。当实际元素为 `Dog`、`Cat` 等子类时：

- **优点**：统一容器，多态调用自然
- **代价**：每次访问多一次指针解引用，缓存局部性差；对象散落在堆上，GC 压力大

对比值类型集合 `List<Dog>`（若 `Dog` 为 struct）：

- 元素连续存储，缓存命中率高
- 无 GC 压力，但失去多态能力

这就是"值类型 vs 引用类型"的核心权衡：**多态需要引用语义，性能需要值语义**。C# 通过 `record struct` 与接口默认方法尝试调和这一矛盾。

## 代码示例

### 示例 1：完整的类定义与封装

```csharp
/// <summary>
/// 银行账户类，演示封装、不变量保护与线程安全。
/// </summary>
public sealed class BankAccount
{
    // 私有字段：保护内部状态
    private decimal _balance;
    private readonly List<Transaction> _transactions = new();
    private readonly object _lock = new();

    // 只读属性：暴露不可变标识
    public string AccountNumber { get; }
    public string Owner { get; }
    public DateTime CreatedAt { get; }

    // 计算属性：派生状态
    public decimal Balance
    {
        get { lock (_lock) return _balance; }
    }

    // 不可变量校验的构造函数
    public BankAccount(string accountNumber, string owner, decimal initialDeposit = 0)
    {
        if (string.IsNullOrWhiteSpace(accountNumber))
            throw new ArgumentException("账号不能为空", nameof(accountNumber));
        if (string.IsNullOrWhiteSpace(owner))
            throw new ArgumentException("户主不能为空", nameof(owner));
        if (initialDeposit < 0)
            throw new ArgumentOutOfRangeException(nameof(initialDeposit), "初始存款不能为负");

        AccountNumber = accountNumber;
        Owner = owner;
        CreatedAt = DateTime.UtcNow;
        _balance = initialDeposit;

        if (initialDeposit > 0)
            _transactions.Add(new Transaction("开户", initialDeposit, CreatedAt));
    }

    // 公共方法：保证不变量 balance >= 0
    public void Deposit(decimal amount, string description = "存款")
    {
        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "存款金额必须为正");

        lock (_lock)
        {
            _balance += amount;
            _transactions.Add(new Transaction(description, amount, DateTime.UtcNow));
        }
    }

    public bool Withdraw(decimal amount, string description = "取款")
    {
        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "取款金额必须为正");

        lock (_lock)
        {
            if (_balance < amount)
                return false; // 余额不足

            _balance -= amount;
            _transactions.Add(new Transaction(description, -amount, DateTime.UtcNow));
            return true;
        }
    }

    // 返回不可变视图，防止外部修改
    public IReadOnlyList<Transaction> GetHistory()
    {
        lock (_lock)
            return _transactions.AsReadOnly();
    }

    public override string ToString() =>
        $"{AccountNumber} ({Owner}): {Balance:C}";
}

/// <summary>交易记录，不可变值对象。</summary>
public sealed record Transaction(string Description, decimal Amount, DateTime Timestamp);
```

### 示例 2：继承与多态（图形系统）

```csharp
/// <summary>抽象基类：定义图形的契约与共享实现。</summary>
public abstract class Shape
{
    public string Color { get; init; } = "Black";
    public string Name => GetType().Name;

    // 抽象方法：子类必须实现
    public abstract double Area();
    public abstract double Perimeter();

    // 虚方法：子类可选择重写
    public virtual string Describe() =>
        $"{Name} (Color={Color}, Area={Area():F2}, Perimeter={Perimeter():F2})";

    // 静态工厂方法：封装构造逻辑
    public static Shape CreateCircle(double radius, string color) =>
        new Circle(radius, color);

    public static Shape CreateRectangle(double w, double h, string color) =>
        new Rectangle(w, h, color);
}

public sealed class Circle : Shape
{
    public double Radius { get; }

    public Circle(double radius, string color = "Black")
    {
        if (radius <= 0) throw new ArgumentOutOfRangeException(nameof(radius));
        Color = color;
        Radius = radius;
    }

    public override double Area() => Math.PI * Radius * Radius;
    public override double Perimeter() => 2 * Math.PI * Radius;
}

public sealed class Rectangle : Shape
{
    public double Width { get; }
    public double Height { get; }

    public Rectangle(double width, double height, string color = "Black")
    {
        if (width <= 0 || height <= 0)
            throw new ArgumentOutOfRangeException("尺寸必须为正");
        Color = color;
        Width = width;
        Height = height;
    }

    public override double Area() => Width * Height;
    public override double Perimeter() => 2 * (Width + Height);

    // 判断是否为正方形：派生属性
    public bool IsSquare => Width.Equals(Height);
}

public sealed class Triangle : Shape
{
    public double SideA { get; }
    public double SideB { get; }
    public double SideC { get; }

    public Triangle(double a, double b, double c, string color = "Black")
    {
        if (a <= 0 || b <= 0 || c <= 0)
            throw new ArgumentOutOfRangeException("边长必须为正");
        if (a + b <= c || a + c <= b || b + c <= a)
            throw new ArgumentException("不构成有效三角形");
        Color = color;
        SideA = a; SideB = b; SideC = c;
    }

    public override double Area()
    {
        // 海伦公式
        double s = (SideA + SideB + SideC) / 2;
        return Math.Sqrt(s * (s - SideA) * (s - SideB) * (s - SideC));
    }

    public override double Perimeter() => SideA + SideB + SideC;
}

// 多态使用
public class ShapeProcessor
{
    public static void PrintAll(IEnumerable<Shape> shapes)
    {
        foreach (var s in shapes)
            Console.WriteLine(s.Describe()); // 动态分派
    }

    public static double TotalArea(IEnumerable<Shape> shapes) =>
        shapes.Sum(s => s.Area());

    // 模式匹配进行类型特定处理
    public static string Classify(Shape shape) => shape switch
    {
        Circle { Radius: > 10 } => "大圆",
        Circle => "小圆",
        Rectangle { IsSquare: true } => "正方形",
        Rectangle => "矩形",
        Triangle t when t.SideA == t.SideB && t.SideB == t.SideC => "等边三角形",
        Triangle => "普通三角形",
        _ => "未知图形"
    };
}
```

### 示例 3：接口与默认实现

```csharp
/// <summary>日志接口：演示接口默认方法与多实现组合。</summary>
public interface ILogger
{
    void Log(LogLevel level, string message, Exception? exception = null);

    // C# 8+ 默认实现：提供便利方法
    void LogDebug(string message) => Log(LogLevel.Debug, message);
    void LogInfo(string message) => Log(LogLevel.Information, message);
    void LogWarning(string message) => Log(LogLevel.Warning, message);
    void LogError(string message, Exception? ex = null) =>
        Log(LogLevel.Error, message, ex);
    void LogCritical(string message, Exception? ex = null) =>
        Log(LogLevel.Critical, message, ex);
}

public enum LogLevel { Debug, Information, Warning, Error, Critical }

public sealed class ConsoleLogger : ILogger
{
    public void Log(LogLevel level, string message, Exception? exception = null)
    {
        var prefix = level switch
        {
            LogLevel.Debug => "[DBG]",
            LogLevel.Information => "[INF]",
            LogLevel.Warning => "[WRN]",
            LogLevel.Error => "[ERR]",
            LogLevel.Critical => "[CRT]",
            _ => "[???]"
        };
        Console.WriteLine($"{prefix} {DateTime.Now:HH:mm:ss} {message}");
        if (exception is not null)
            Console.WriteLine($"  Exception: {exception.Message}");
    }
}

public sealed class FileLogger : ILogger
{
    private readonly string _path;
    public FileLogger(string path) => _path = path;

    public void Log(LogLevel level, string message, Exception? exception = null)
    {
        var line = $"[{level}] {DateTime.UtcNow:O} {message}";
        if (exception is not null)
            line += $" | Exception: {exception.Message}";
        File.AppendAllText(_path, line + Environment.NewLine);
    }
}

/// <summary>组合多个日志器的复合日志器。</summary>
public sealed class CompositeLogger : ILogger
{
    private readonly IReadOnlyList<ILogger> _loggers;
    public CompositeLogger(params ILogger[] loggers) => _loggers = loggers;

    public void Log(LogLevel level, string message, Exception? exception = null)
    {
        foreach (var logger in _loggers)
        {
            try { logger.Log(level, message, exception); }
            catch { /* 单个日志器失败不应影响其他 */ }
        }
    }
}

// 使用：接口默认方法
ILogger logger = new ConsoleLogger();
logger.LogInfo("应用启动"); // 调用默认实现
logger.LogWarning("内存使用率高");
logger.LogError("数据库连接失败", new InvalidOperationException("timeout"));
```

### 示例 4：抽象类与接口的协作（模板方法 + 策略）

```csharp
/// <summary>
/// 数据导出器：抽象基类定义算法骨架（模板方法），
/// 接口提供可替换的格式化策略。
/// </summary>
public interface IDataFormatter<T>
{
    string Format(T item);
    string FileExtension { get; }
}

public sealed class JsonFormatter<T> : IDataFormatter<T>
{
    public string FileExtension => ".json";
    public string Format(T item) => System.Text.Json.JsonSerializer.Serialize(item);
}

public sealed class CsvFormatter<T> : IDataFormatter<T>
{
    public string FileExtension => ".csv";
    public string Format(T item)
    {
        var props = typeof(T).GetProperties();
        return string.Join(",", props.Select(p => p.GetValue(item)?.ToString() ?? ""));
    }
}

public abstract class DataExporter<T>
{
    protected readonly IDataFormatter<T> Formatter;

    protected DataExporter(IDataFormatter<T> formatter) => Formatter = formatter;

    // 模板方法：定义导出流程骨架
    public async Task ExportAsync(IEnumerable<T> data, string outputPath)
    {
        var validated = Validate(data);
        var transformed = Transform(validated);
        var content = Serialize(transformed);
        await WriteAsync(content, outputPath + Formatter.FileExtension);
        OnExportCompleted(outputPath);
    }

    // 钩子：子类可重写
    protected virtual IEnumerable<T> Validate(IEnumerable<T> data) => data;
    protected virtual IEnumerable<T> Transform(IEnumerable<T> data) => data;

    // 抽象步骤：子类必须实现
    protected abstract string Serialize(IEnumerable<T> data);
    protected abstract Task WriteAsync(string content, string path);

    // 钩子：可选重写
    protected virtual void OnExportCompleted(string path)
    {
        Console.WriteLine($"导出完成: {path}");
    }
}

public sealed class GenericDataExporter<T> : DataExporter<T>
{
    public GenericDataExporter(IDataFormatter<T> formatter) : base(formatter) { }

    protected override string Serialize(IEnumerable<T> data) =>
        string.Join(Environment.NewLine, data.Select(Formatter.Format));

    protected override async Task WriteAsync(string content, string path) =>
        await File.WriteAllTextAsync(path, content);
}
```

### 示例 5：运算符重载与类型转换

```csharp
/// <summary>三维向量：演示运算符重载、比较与转换。</summary>
public readonly struct Vector3D : IEquatable<Vector3D>, IComparable<Vector3D>
{
    public double X { get; }
    public double Y { get; }
    public double Z { get; }

    public Vector3D(double x, double y, double z) => (X, Y, Z) = (x, y, z);

    public static readonly Vector3D Zero = new(0, 0, 0);
    public static readonly Vector3D UnitX = new(1, 0, 0);
    public static readonly Vector3D UnitY = new(0, 1, 0);
    public static readonly Vector3D UnitZ = new(0, 0, 1);

    public double Magnitude => Math.Sqrt(X * X + Y * Y + Z * Z);
    public Vector3D Normalized => this / Magnitude;

    // 二元算术运算符
    public static Vector3D operator +(Vector3D a, Vector3D b) =>
        new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);

    public static Vector3D operator -(Vector3D a, Vector3D b) =>
        new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);

    public static Vector3D operator *(Vector3D v, double scalar) =>
        new(v.X * scalar, v.Y * scalar, v.Z * scalar);

    public static Vector3D operator *(double scalar, Vector3D v) => v * scalar;

    public static Vector3D operator /(Vector3D v, double scalar)
    {
        if (scalar == 0) throw new DivideByZeroException();
        return new(v.X / scalar, v.Y / scalar, v.Z / scalar);
    }

    // 一元运算符
    public static Vector3D operator -(Vector3D v) => new(-v.X, -v.Y, -v.Z);

    // 点积与叉积（自定义命名方法）
    public static double Dot(Vector3D a, Vector3D b) =>
        a.X * b.X + a.Y * b.Y + a.Z * b.Z;

    public static Vector3D Cross(Vector3D a, Vector3D b) =>
        new(a.Y * b.Z - a.Z * b.Y,
            a.Z * b.X - a.X * b.Z,
            a.X * b.Y - a.Y * b.X);

    // 比较运算符（成对重载 == 与 !=）
    public static bool operator ==(Vector3D a, Vector3D b) => a.Equals(b);
    public static bool operator !=(Vector3D a, Vector3D b) => !a.Equals(b);

    public bool Equals(Vector3D other) =>
        X.Equals(other.X) && Y.Equals(other.Y) && Z.Equals(other.Z);

    public override bool Equals(object? obj) => obj is Vector3D v && Equals(v);

    public override int GetHashCode() => HashCode.Combine(X, Y, Z);

    public int CompareTo(Vector3D other) => Magnitude.CompareTo(other.Magnitude);

    // 隐式转换：从元组
    public static implicit operator Vector3D((double x, double y, double z) t) =>
        new(t.x, t.y, t.z);

    // 显式转换：到二维向量（丢失信息）
    public static explicit operator (double x, double y)(Vector3D v) => (v.X, v.Y);

    public override string ToString() => $"({X:F2}, {Y:F2}, {Z:F2})";
}

// 使用示例
var v1 = new Vector3D(1, 2, 3);
var v2 = new Vector3D(4, 5, 6);
var sum = v1 + v2;                  // (5, 7, 9)
var dot = Vector3D.Dot(v1, v2);     // 32
var cross = Vector3D.Cross(v1, v2); // (-3, 6, -3)
Vector3D v3 = (1.0, 2.0, 3.0);      // 隐式转换
var (x, y) = ((double, double))v1;  // 显式转换
```

### 示例 6：Record 类型与不可变设计

```csharp
using System.Collections.Immutable;

// 位置 record：简洁定义不可变值对象
public record Money(decimal Amount, string Currency)
{
    // 校验在静态构造点进行
    public Money
    {
        if (Amount < 0) throw new ArgumentOutOfRangeException(nameof(Amount));
        if (string.IsNullOrWhiteSpace(Currency))
            throw new ArgumentException("货币代码不能为空", nameof(Currency));
        Currency = Currency.ToUpperInvariant();
    }

    // 派生属性
    public bool IsPositive => Amount > 0;
    public bool IsZero => Amount == 0;

    // 运算符重载
    public static Money operator +(Money a, Money b)
    {
        if (a.Currency != b.Currency)
            throw new InvalidOperationException("不能相加不同货币");
        return a with { Amount = a.Amount + b.Amount };
    }

    public static Money operator -(Money a, Money b)
    {
        if (a.Currency != b.Currency)
            throw new InvalidOperationException("不能相减不同货币");
        return a with { Amount = a.Amount - b.Amount };
    }
}

// record struct：值类型 record，避免堆分配
public readonly record struct Point(double X, double Y)
{
    public double DistanceToOrigin => Math.Sqrt(X * X + Y * Y);
    public double DistanceTo(Point other) =>
        Math.Sqrt(Math.Pow(X - other.X, 2) + Math.Pow(Y - other.Y, 2));
}

// 复杂 record：领域实体
public record Order(
    Guid Id,
    Customer Customer,
    IReadOnlyList<OrderLine> Lines,
    DateTime CreatedAt,
    OrderStatus Status)
{
    public decimal TotalAmount => Lines.Sum(l => l.Subtotal);

    // 业务方法：返回新实例（不可变更新）
    public Order WithStatus(OrderStatus newStatus) => this with { Status = newStatus };

    public Order AddLine(OrderLine line) => this with
    {
        Lines = Lines.Append(line).ToImmutableList()
    };

    public Order RemoveLine(Guid lineId) => this with
    {
        Lines = Lines.Where(l => l.Id != lineId).ToImmutableList()
    };
}

public record Customer(string Name, string Email, Address ShippingAddress);
public record OrderLine(Guid Id, string ProductName, int Quantity, decimal UnitPrice)
{
    public decimal Subtotal => Quantity * UnitPrice;
}
public record Address(string Country, string City, string Street, string ZipCode);

public enum OrderStatus { Pending, Paid, Shipped, Delivered, Cancelled }

// 使用
var customer = new Customer("张三", "zhang@example.com",
    new Address("中国", "北京", "长安街 1 号", "100000"));

var order = new Order(
    Guid.NewGuid(),
    customer,
    ImmutableList.Create<OrderLine>(),
    DateTime.UtcNow,
    OrderStatus.Pending);

var line1 = new OrderLine(Guid.NewGuid(), "笔记本", 2, 5999m);
var line2 = new OrderLine(Guid.NewGuid(), "鼠标", 1, 99m);

order = order.AddLine(line1).AddLine(line2);
Console.WriteLine($"订单总额: {order.TotalAmount:C}");

order = order.WithStatus(OrderStatus.Paid);
Console.WriteLine($"订单状态: {order.Status}");

// 值相等性
var p1 = new Point(1, 2);
var p2 = new Point(1, 2);
Console.WriteLine(p1 == p2);  // True
```

### 示例 7：索引器与自定义集合

```csharp
/// <summary>稀疏矩阵：使用字典存储非零元素，演示索引器设计。</summary>
public sealed class SparseMatrix
{
    private readonly Dictionary<(int, int), double> _data = new();
    public int Rows { get; }
    public int Cols { get; }

    public SparseMatrix(int rows, int cols)
    {
        if (rows <= 0 || cols <= 0) throw new ArgumentOutOfRangeException();
        Rows = rows;
        Cols = cols;
    }

    // 多维索引器
    public double this[int row, int col]
    {
        get
        {
            ValidateIndex(row, col);
            return _data.TryGetValue((row, col), out var value) ? value : 0;
        }
        set
        {
            ValidateIndex(row, col);
            if (value == 0)
                _data.Remove((row, col));
            else
                _data[(row, col)] = value;
        }
    }

    // 带默认值的索引器
    public double this[int row, int col, double defaultValue]
    {
        get
        {
            ValidateIndex(row, col);
            return _data.TryGetValue((row, col), out var value) ? value : defaultValue;
        }
    }

    private void ValidateIndex(int row, int col)
    {
        if (row < 0 || row >= Rows || col < 0 || col >= Cols)
            throw new IndexOutOfRangeException($"索引 ({row}, {col}) 超出范围");
    }

    public int NonZeroCount => _data.Count;
    public double FillRatio => (double)_data.Count / (Rows * Cols);

    public IEnumerable<(int Row, int Col, double Value)> NonZeroEntries =>
        _data.Select(kv => (kv.Key.Item1, kv.Key.Item2, kv.Value));
}

// 字符串键的索引器示例：配置容器
public sealed class Configuration
{
    private readonly Dictionary<string, object?> _values = new(StringComparer.OrdinalIgnoreCase);

    public object? this[string key]
    {
        get => _values.TryGetValue(key, out var value) ? value : null;
        set => _values[key] = value;
    }

    // 类型安全的访问方法
    public T? Get<T>(string key) => _values.TryGetValue(key, out var v) && v is T t ? t : default;
    public T GetOrThrow<T>(string key) =>
        _values.TryGetValue(key, out var v) && v is T t
            ? t
            : throw new KeyNotFoundException($"配置项 '{key}' 不存在或类型不匹配");
}
```

### 示例 8：扩展方法与接口组合

```csharp
/// <summary>扩展方法：在不修改原类型的前提下添加功能。</summary>
public static class EnumerableExtensions
{
    // 链式扩展方法
    public static IEnumerable<T> ForEach<T>(this IEnumerable<T> source, Action<T> action)
    {
        foreach (var item in source) action(item);
        return source;
    }

    public static IEnumerable<T> DistinctBy<T, TKey>(
        this IEnumerable<T> source, Func<T, TKey> keySelector) =>
        source.GroupBy(keySelector).Select(g => g.First());

    public static string Join<T>(this IEnumerable<T> source, string separator) =>
        string.Join(separator, source);

    // 分块：将大集合切分为指定大小的块
    public static IEnumerable<IEnumerable<T>> ChunkBy<T>(this IEnumerable<T> source, int size)
    {
        var chunk = new List<T>(size);
        foreach (var item in source)
        {
            chunk.Add(item);
            if (chunk.Count == size)
            {
                yield return chunk;
                chunk = new List<T>(size);
            }
        }
        if (chunk.Count > 0) yield return chunk;
    }
}

// 接口与扩展方法配合：流式 API
public interface IQueryBuilder<T>
{
    IQueryBuilder<T> Where(Func<T, bool> predicate);
    IQueryBuilder<T> OrderBy<TKey>(Func<T, TKey> keySelector);
    IQueryBuilder<T> Take(int count);
    IEnumerable<T> Build();
}

internal sealed class QueryBuilder<T> : IQueryBuilder<T>
{
    private readonly IEnumerable<T> _source;
    private Func<IEnumerable<T>, IEnumerable<T>>? _filter;
    private Func<IEnumerable<T>, IEnumerable<T>>? _order;
    private int? _take;

    public QueryBuilder(IEnumerable<T> source) => _source = source;

    public IQueryBuilder<T> Where(Func<T, bool> predicate)
    {
        var prev = _filter;
        _filter = prev is null
            ? src => src.Where(predicate)
            : src => prev(src).Where(predicate);
        return this;
    }

    public IQueryBuilder<T> OrderBy<TKey>(Func<T, TKey> keySelector)
    {
        _order = src => src.OrderBy(keySelector);
        return this;
    }

    public IQueryBuilder<T> Take(int count)
    {
        _take = count;
        return this;
    }

    public IEnumerable<T> Build()
    {
        var result = _source;
        if (_filter is not null) result = _filter(result);
        if (_order is not null) result = _order(result);
        if (_take is not null) result = result.Take(_take.Value);
        return result;
    }
}

public static class QueryBuilderExtensions
{
    public static IQueryBuilder<T> Query<T>(this IEnumerable<T> source) =>
        new QueryBuilder<T>(source);
}

// 使用
var numbers = Enumerable.Range(1, 100);
var top10Even = numbers
    .Query()
    .Where(n => n % 2 == 0)
    .OrderBy(n => n)
    .Take(10)
    .Build()
    .ToList();
```

### 示例 9：SOLID 原则实践

```csharp
// ===== 单一职责原则（SRP）=====
// 反例：一个类承担多种职责
public class BadUserService
{
    public void CreateUser(string name, string email) { /* ... */ }
    public void SendWelcomeEmail(string email) { /* SMTP 逻辑 */ }
    public void LogToDatabase(string message) { /* 日志逻辑 */ }
    public void ExportToCsv(User user) { /* 导出逻辑 */ }
}

// 正例：职责分离
public interface IUserRepository { Task<User> CreateAsync(string name, string email); }
public interface IEmailService { Task SendWelcomeAsync(string email); }
public interface ILogger { void Log(string message); }
public interface IUserExporter { string Export(User user); }

public sealed class UserService
{
    private readonly IUserRepository _repo;
    private readonly IEmailService _email;
    private readonly ILogger _logger;

    public UserService(IUserRepository repo, IEmailService email, ILogger logger)
    {
        _repo = repo; _email = email; _logger = logger;
    }

    public async Task<User> RegisterAsync(string name, string email)
    {
        _logger.Log($"注册用户: {name}");
        var user = await _repo.CreateAsync(name, email);
        await _email.SendWelcomeAsync(email);
        return user;
    }
}

// ===== 开闭原则（OCP）=====
// 通过扩展（新类）而非修改（改老类）增加功能
public interface IDiscountStrategy
{
    decimal Apply(decimal originalPrice);
}

public sealed class NoDiscount : IDiscountStrategy
{
    public decimal Apply(decimal originalPrice) => originalPrice;
}

public sealed class PercentageDiscount : IDiscountStrategy
{
    private readonly decimal _percentage;
    public PercentageDiscount(decimal percentage) => _percentage = percentage;
    public decimal Apply(decimal originalPrice) => originalPrice * (1 - _percentage);
}

public sealed class FixedAmountDiscount : IDiscountStrategy
{
    private readonly decimal _amount;
    public FixedAmountDiscount(decimal amount) => _amount = amount;
    public decimal Apply(decimal originalPrice) =>
        Math.Max(0, originalPrice - _amount);
}

// 新增折扣策略无需修改现有代码
public sealed class TieredDiscount : IDiscountStrategy
{
    public decimal Apply(decimal originalPrice) => originalPrice switch
    {
        < 100 => originalPrice,
        < 500 => originalPrice * 0.95m,
        < 1000 => originalPrice * 0.90m,
        _ => originalPrice * 0.85m
    };
}

// ===== 里氏替换原则（LSP）=====
// 子类必须能替换基类而不破坏程序正确性
public abstract class Bird
{
    public abstract string Describe();
}

public sealed class Sparrow : Bird
{
    public override string Describe() => "麻雀会飞";
}

public sealed class Penguin : Bird
{
    public override string Describe() => "企鹅不会飞，但会游泳";
}

// 反例：在基类 Bird 中定义 Fly() 会违反 LSP（企鹅不能飞）
// 正解：将飞行能力抽象为独立接口

public interface IFlyable { void Fly(); }
public interface ISwimmable { void Swim(); }

public sealed class Sparrow2 : Bird, IFlyable
{
    public override string Describe() => "麻雀";
    public void Fly() => Console.WriteLine("飞翔");
}

public sealed class Penguin2 : Bird, ISwimmable
{
    public override string Describe() => "企鹅";
    public void Swim() => Console.WriteLine("游泳");
}

// ===== 接口隔离原则（ISP）=====
// 反例：胖接口
public interface IWorker
{
    void Work();
    void Eat();
    void Sleep();
}

// 正例：细粒度接口
public interface IWorkable { void Work(); }
public interface IEatable { void Eat(); }
public interface ISleepable { void Sleep(); }

public sealed class HumanWorker : IWorkable, IEatable, ISleepable
{
    public void Work() => Console.WriteLine("工作");
    public void Eat() => Console.WriteLine("吃饭");
    public void Sleep() => Console.WriteLine("睡觉");
}

public sealed class RobotWorker : IWorkable
{
    public void Work() => Console.WriteLine("24 小时工作");
    // 机器人不需要 Eat/Sleep，不强制实现
}

// ===== 依赖倒置原则（DIP）=====
// 高层模块不依赖低层模块，二者都依赖抽象
public sealed class OrderProcessor
{
    private readonly IPaymentGateway _payment;
    private readonly INotificationService _notification;

    // 依赖注入：依赖抽象而非具体实现
    public OrderProcessor(IPaymentGateway payment, INotificationService notification)
    {
        _payment = payment;
        _notification = notification;
    }

    public async Task ProcessAsync(Order order)
    {
        await _payment.ChargeAsync(order.TotalAmount);
        await _notification.NotifyAsync(order.Customer.Email, "订单已支付");
    }
}

public interface IPaymentGateway { Task ChargeAsync(decimal amount); }
public interface INotificationService { Task NotifyAsync(string to, string message); }
```

### 示例 10：模式匹配与对象建模

```csharp
/// <summary>表达式树：演示模式匹配与 OOP 结合。</summary>
public abstract class Expr
{
    public abstract double Evaluate();
}

public sealed class Const(double value) : Expr
{
    public double Value => value;
    public override double Evaluate() => value;
}

public sealed class Add(Expr left, Expr right) : Expr
{
    public Expr Left => left;
    public Expr Right => right;
    public override double Evaluate() => left.Evaluate() + right.Evaluate();
}

public sealed class Mul(Expr left, Expr right) : Expr
{
    public Expr Left => left;
    public Expr Right => right;
    public override double Evaluate() => left.Evaluate() * right.Evaluate();
}

public sealed class Neg(Expr operand) : Expr
{
    public Expr Operand => operand;
    public override double Evaluate() => -operand.Evaluate();
}

public static class ExprSimplifier
{
    // 模式匹配：递归简化表达式
    public static Expr Simplify(Expr expr) => expr switch
    {
        // 加法恒等：x + 0 = x
        Add(var l, Const(0)) => Simplify(l),
        Add(Const(0), var r) => Simplify(r),

        // 乘法零元：x * 0 = 0
        Mul(_, Const(0)) => new Const(0),
        Mul(Const(0), _) => new Const(0),

        // 乘法恒等：x * 1 = x
        Mul(var l, Const(1)) => Simplify(l),
        Mul(Const(1), var r) => Simplify(r),

        // 双重否定：-(-x) = x
        Neg(Neg(var inner)) => Simplify(inner),

        // 常量折叠
        Add(Const(var a), Const(var b)) => new Const(a + b),
        Mul(Const(var a), Const(var b)) => new Const(a * b),
        Neg(Const(var a)) => new Const(-a),

        // 递归简化子表达式
        Add(var l, var r) => new Add(Simplify(l), Simplify(r)),
        Mul(var l, var r) => new Mul(Simplify(l), Simplify(r)),
        Neg(var o) => new Neg(Simplify(o)),

        _ => expr
    };
}

// 构造表达式： (3 + 0) * (x * 1) => 假设 x = 5
Expr expr = new Mul(
    new Add(new Const(3), new Const(0)),
    new Mul(new Const(5), new Const(1)));

var simplified = ExprSimplifier.Simplify(expr);
Console.WriteLine($"原始: {expr.Evaluate()}");  // 15
Console.WriteLine($"简化: {simplified.Evaluate()}"); // 15
```

## 对比分析

### 抽象类 vs 接口

| 维度 | 抽象类（`abstract class`） | 接口（`interface`） |
| :--- | :--- | :--- |
| **继承数量** | 单继承（一个类只能继承一个抽象类） | 多实现（一个类可实现多个接口） |
| **构造函数** | 有，子类通过 `base()` 调用 | 无 |
| **字段** | 可有实例字段、静态字段 | 仅常量（`const`）与静态字段（C# 11+） |
| **方法实现** | 可有抽象方法、虚方法、具体方法 | C# 8 前全抽象；C# 8+ 可有默认实现 |
| **访问修饰符** | 任意（`public`/`protected`/`internal`/`private`） | 默认 `public`，C# 8+ 可显式修饰 |
| **版本控制** | 添加新方法（含实现）不破坏子类 | 添加抽象方法破坏实现类；添加默认方法相对安全 |
| **语义** | IS-A 关系（强耦合） | CAN-DO 能力（弱耦合） |
| **适用场景** | 共享状态与实现的家族层次 | 跨家族的能力契约、策略注入点 |
| **性能** | 虚方法调用，JIT 可去虚化 | 接口分派略慢于类虚方法，但差距小 |

**决策建议**：

- 优先使用接口定义能力契约，特别是在多个不相关类共享行为时
- 当多个类有共享状态与实现逻辑时，使用抽象类减少重复
- 现代实践倾向"接口 + 默认实现 + 扩展方法"组合，减少对抽象类的依赖
- .NET 8+ 引入静态抽象接口成员后，数值类型也可通过接口抽象，进一步压缩抽象类使用场景

### class vs record vs record struct vs struct

| 特性 | `class` | `record` | `record struct` | `struct` |
| :--- | :--- | :--- | :--- | :--- |
| **类型类别** | 引用类型 | 引用类型 | 值类型 | 值类型 |
| **相等性语义** | 引用相等（默认） | 值相等（重写） | 值相等（重写） | 值相等（默认） |
| **可变性** | 可变（默认） | 不可变（推荐） | 可变或不可变 | 可变（默认） |
| **`with` 表达式** | 不支持 | 支持 | 支持 | 不支持 |
| **拷贝语义** | 引用拷贝 | 浅拷贝（`with`） | 值拷贝（赋值即拷贝） | 值拷贝 |
| **GC 压力** | 有（堆分配） | 有（堆分配） | 无（栈分配） | 无（栈分配） |
| **`null` 允许** | 是 | 是 | 否（除非可空） | 否（除非可空） |
| **继承** | 支持 | 支持同类型 | 不支持 | 不支持 |
| **典型用途** | 领域实体、服务 | DTO、值对象、消息 | 小型值对象 | 性能敏感数据 |

**选择策略**：

1. **领域实体**（如 `Order`、`User`）：`class`，需要标识、可变状态、引用相等
2. **值对象**（如 `Money`、`Address`）：`record` 或 `readonly record struct`
3. **DTO**（如 API 请求/响应）：`record`，便于序列化与不可变传递
4. **消息与事件**（如 `OrderCreated`）：`record`，支持 `with` 与解构
5. **性能关键小型数据**（如 `Point`、`Color`）：`readonly record struct`

### 继承 vs 组合

| 维度 | 继承（IS-A） | 组合（HAS-A） |
| :--- | :--- | :--- |
| **耦合度** | 强耦合（编译期固定） | 弱耦合（运行时可替换） |
| **灵活性** | 低（单继承限制） | 高（可组合多对象） |
| **复用粒度** | 整个类（含状态与行为） | 单个职责对象 |
| **运行时切换** | 不支持 | 支持（依赖注入） |
| **测试隔离** | 难（基类副作用传导） | 易（mock 依赖） |
| **典型模式** | 模板方法、策略基类 | 策略、装饰器、适配器 |

**"组合优于继承"原则的边界**：

- **适合继承**：家族层次清晰、共享大量状态与实现、子类是基类的真正特化（如 `Circle` 是 `Shape`）
- **适合组合**：行为可插拔、运行时需切换、跨不相关类型共享能力（如日志能力、缓存能力）

### 静态方法 vs 实例方法 vs 扩展方法

| 方面 | 静态方法 | 实例方法 | 扩展方法 |
| :--- | :--- | :--- | :--- |
| **调用形式** | `Class.Method()` | `obj.Method()` | `obj.Method()`（语法糖） |
| **多态** | 不支持 | 支持（虚方法） | 不支持（实质是静态调用） |
| **访问实例状态** | 不能 | 能 | 能（通过参数） |
| **可测试性** | 难（无法 mock） | 易（接口可 mock） | 中（依赖静态类） |
| **API 发现性** | 低（需知道类名） | 高（IDE 智能提示） | 高（链式调用） |
| **版本兼容** | 添加新静态方法安全 | 添加抽象实例方法破坏子类 | 添加新扩展方法安全 |

## 常见陷阱与反模式

### 陷阱 1：滥用继承导致脆弱基类

**问题描述**：基类实现细节被依赖，修改基类破坏子类。

```csharp
// 反例
public class BaseList<T>
{
    public virtual void Add(T item) { /* 添加逻辑 */ }
    public virtual void AddRange(IEnumerable<T> items)
    {
        foreach (var item in items) Add(item); // 依赖 Add 的实现
    }
}

public class LoggingList<T> : BaseList<T>
{
    public override void Add(T item)
    {
        Console.WriteLine($"添加: {item}");
        base.Add(item);
    }

    public override void AddRange(IEnumerable<T> items)
    {
        Console.WriteLine($"批量添加");
        base.AddRange(items); // 会重复日志：每个 Add 都打日志
    }
}

// 正解：使用组合 + 接口
public sealed class LoggingList<T> : IList<T>
{
    private readonly IList<T> _inner;
    public LoggingList(IList<T> inner) => _inner = inner;

    public void Add(T item)
    {
        Console.WriteLine($"添加: {item}");
        _inner.Add(item);
    }
    // 委托给内部实现，避免基类耦合
}
```

### 陷阱 2：违反里氏替换

```csharp
// 反例：经典 Rectangle/Square 问题
public class Rectangle
{
    public virtual int Width { get; set; }
    public virtual int Height { get; set; }
    public int Area => Width * Height;
}

public class Square : Rectangle
{
    public override int Width
    {
        set { base.Width = base.Height = value; } // 副作用！
    }
    public override int Height
    {
        set { base.Width = base.Height = value; }
    }
}

// 调用者基于 Rectangle 契约的假设被破坏
void Resize(Rectangle r)
{
    r.Width = 5;
    r.Height = 10;
    // 期望 r.Area == 50，但若 r 是 Square 则为 100
}

// 正解：分离抽象，Square 不应继承 Rectangle
public abstract class Shape { public abstract int Area { get; } }
public sealed class Rectangle2(int width, int height) : Shape
{
    public int Width => width;
    public int Height => height;
    public override int Area => width * height;
}
public sealed class Square2(int side) : Shape
{
    public int Side => side;
    public override int Area => side * side;
}
```

### 陷阱 3：上帝对象（God Object）

```csharp
// 反例：单一类承担所有职责
public class GodObject
{
    public void CreateUser() { }
    public void SendEmail() { }
    public void GenerateReport() { }
    public void ConnectDatabase() { }
    public void FormatCsv() { }
    public void EncryptData() { }
    // ... 上千行
}

// 正解：按职责拆分，使用依赖注入组装
public sealed class UserService(IUserRepository repo, IEmailService email) { /* ... */ }
public sealed class ReportService(IReportRepository repo, IExporter exporter) { /* ... */ }
```

### 陷阱 4：暴露可变内部状态

```csharp
// 反例：返回内部 List 引用，外部可修改
public class BadOrder
{
    private readonly List<OrderLine> _lines = new();
    public List<OrderLine> Lines => _lines; // 外部可直接 _lines.Add()！
}

// 正解：返回只读视图或不可变集合
public class GoodOrder
{
    private readonly List<OrderLine> _lines = new();
    public IReadOnlyList<OrderLine> Lines => _lines.AsReadOnly();

    // 修改通过受控方法
    public void AddLine(OrderLine line) { /* 校验后添加 */ }
}
```

### 陷阱 5：在构造函数中调用虚方法

```csharp
// 反例：构造顺序陷阱
public class Base
{
    public Base() { Initialize(); }
    protected virtual void Initialize() { /* 基类初始化 */ }
}

public class Derived : Base
{
    private readonly string _name;
    public Derived(string name)
    {
        _name = name; // 在 Initialize 之后执行！
    }
    protected override void Initialize()
    {
        Console.WriteLine(_name.ToUpper()); // NullReferenceException！
    }
}

// 正解：使用工厂方法或两阶段初始化
public class DerivedSafe
{
    private string _name = "";
    private DerivedSafe() { }
    public static DerivedSafe Create(string name)
    {
        var obj = new DerivedSafe();
        obj._name = name;
        obj.Initialize();
        return obj;
    }
    protected virtual void Initialize() { /* 安全 */ }
}
```

### 陷阱 6：用 `new` 隐藏方法导致语义混乱

```csharp
public class Animal
{
    public string Describe() => "动物";
}

public class Dog : Animal
{
    public new string Describe() => "狗"; // 隐藏基类方法
}

Animal a = new Dog();
Console.WriteLine(a.Describe()); // "动物" - 令人困惑！

// 正解：使用 virtual + override，或重命名方法
public class Animal2 { public virtual string Describe() => "动物"; }
public class Dog2 : Animal2 { public override string Describe() => "狗"; }
Animal2 a2 = new Dog2();
Console.WriteLine(a2.Describe()); // "狗" - 符合预期
```

### 陷阱 7：结构体可变性的意外拷贝

```csharp
// 反例：可变 struct 导致意外行为
public struct MutablePoint
{
    public int X, Y;
    public void MoveBy(int dx, int dy) { X += dx; Y += dy; }
}

MutablePoint p = new MutablePoint();
List<MutablePoint> points = new() { p };
points[0].MoveBy(10, 20); // 不修改 list 中的元素！因为是值拷贝
Console.WriteLine(points[0].X); // 0

// 正解：struct 应为不可变，通过返回新实例修改
public readonly struct ImmutablePoint
{
    public int X { get; }
    public int Y { get; }
    public ImmutablePoint(int x, int y) => (X, Y) = (x, y);
    public ImmutablePoint MoveBy(int dx, int dy) => new(X + dx, Y + dy);
}

var ip = new ImmutablePoint(0, 0);
var moved = ip.MoveBy(10, 20); // 明确返回新实例
```

### 陷阱 8：接口默认实现的的方法分派陷阱

```csharp
public interface IFoo
{
    void DoWork() => Console.WriteLine("默认实现");
}

public class FooImpl : IFoo
{
    public void DoWork() => Console.WriteLine("具体实现");
}

IFoo foo = new FooImpl();
foo.DoWork(); // "具体实现" - 调用具体类实现

FooImpl concrete = new FooImpl();
concrete.DoWork(); // "具体实现" - 但若 FooImpl 未实现则编译错误！

// 反例：FooImpl 不实现 DoWork
public class FooImpl2 : IFoo { /* 不实现 DoWork */ }
FooImpl2 c = new FooImpl2();
// c.DoWork(); // 编译错误！实例类型无法调用接口默认方法
((IFoo)c).DoWork(); // "默认实现" - 必须通过接口类型调用
```

## 工程实践

### 实践 1：不可变领域模型

```csharp
/// <summary>
/// 不可变领域模型基类，提供值相等、校验与转换基础设施。
/// </summary>
public abstract record DomainEntity(Guid Id)
{
    protected DomainEntity
    {
        if (Id == Guid.Empty)
            throw new ArgumentException("Id 不能为空", nameof(Id));
    }

    // 领域事件挂载点
    private readonly List<DomainEvent> _events = new();
    public IReadOnlyList<DomainEvent> Events => _events.AsReadOnly();

    protected void Raise(DomainEvent @event) => _events.Add(@event);

    public void ClearEvents() => _events.Clear();
}

public abstract record DomainEvent(DateTimeOffset OccurredAt)
{
    protected DomainEvent() : this(DateTimeOffset.UtcNow) { }
}

// 具体领域实体
public sealed record Order(
    Guid Id,
    Guid CustomerId,
    IReadOnlyList<OrderLine> Lines,
    OrderStatus Status,
    DateTimeOffset CreatedAt) : DomainEntity(Id)
{
    public decimal TotalAmount => Lines.Sum(l => l.Subtotal);

    // 工厂方法：封装不变量
    public static Order Create(Guid customerId, IEnumerable<OrderLine> lines)
    {
        if (customerId == Guid.Empty)
            throw new ArgumentException("客户 ID 不能为空");
        var lineList = lines.ToList();
        if (lineList.Count == 0)
            throw new ArgumentException("订单至少包含一行");

        var order = new Order(
            Guid.NewGuid(),
            customerId,
            lineList.ToImmutableList(),
            OrderStatus.Pending,
            DateTimeOffset.UtcNow);

        order.Raise(new OrderCreated(order.Id, customerId, order.TotalAmount));
        return order;
    }

    // 业务方法：返回新实例 + 事件
    public Order Pay()
    {
        if (Status != OrderStatus.Pending)
            throw new InvalidOperationException("仅待支付订单可支付");

        var paid = this with { Status = OrderStatus.Paid };
        paid.Raise(new OrderPaid(Id, TotalAmount));
        return paid;
    }

    public Order Ship(string trackingNumber)
    {
        if (Status != OrderStatus.Paid)
            throw new InvalidOperationException("仅已支付订单可发货");

        var shipped = this with { Status = OrderStatus.Shipped };
        shipped.Raise(new OrderShipped(Id, trackingNumber));
        return shipped;
    }
}

public sealed record OrderCreated(Guid OrderId, Guid CustomerId, decimal Amount) : DomainEvent;
public sealed record OrderPaid(Guid OrderId, decimal Amount) : DomainEvent;
public sealed record OrderShipped(Guid OrderId, string TrackingNumber) : DomainEvent;
```

### 实践 2：规约模式（Specification Pattern）

```csharp
/// <summary>规约模式：将业务规则封装为可组合的对象。</summary>
public interface ISpecification<T>
{
    bool IsSatisfiedBy(T entity);
    ISpecification<T> And(ISpecification<T> other) => new AndSpec<T>(this, other);
    ISpecification<T> Or(ISpecification<T> other) => new OrSpec<T>(this, other);
    ISpecification<T> Not() => new NotSpec<T>(this);
}

public sealed class AndSpec<T>(ISpecification<T> left, ISpecification<T> right) : ISpecification<T>
{
    public bool IsSatisfiedBy(T entity) => left.IsSatisfiedBy(entity) && right.IsSatisfiedBy(entity);
}

public sealed class OrSpec<T>(ISpecification<T> left, ISpecification<T> right) : ISpecification<T>
{
    public bool IsSatisfiedBy(T entity) => left.IsSatisfiedBy(entity) || right.IsSatisfiedBy(entity);
}

public sealed class NotSpec<T>(ISpecification<T> inner) : ISpecification<T>
{
    public bool IsSatisfiedBy(T entity) => !inner.IsSatisfiedBy(entity);
}

// 具体规约
public sealed class PremiumCustomerSpec : ISpecification<Customer>
{
    public bool IsSatisfiedBy(Customer c) => c.TotalSpent > 10000 && c.OrderCount >= 10;
}

public sealed class ActiveCustomerSpec : ISpecification<Customer>
{
    public bool IsSatisfiedBy(Customer c) => c.LastOrderAt > DateTime.UtcNow.AddDays(-90);
}

// 复合规约
var targetCustomers = new PremiumCustomerSpec()
    .And(new ActiveCustomerSpec())
    .And(new NotSpec<Customer>(new BlacklistedCustomerSpec()));
```

### 实践 3：依赖注入与生命周期管理

```csharp
// 服务注册与生命周期
public static class ServiceConfiguration
{
    public static IServiceCollection AddDomainServices(this IServiceCollection services)
    {
        // 单例：无状态或线程安全的全局服务
        services.AddSingleton<IClock, SystemClock>();
        services.AddSingleton<IIdGenerator, GuidIdGenerator>();

        // 作用域：每个请求一个实例（如 DbContext）
        services.AddScoped<IUserRepository, EfUserRepository>();
        services.AddScoped<IOrderRepository, EfOrderRepository>();

        // 瞬时：轻量无状态服务
        services.AddTransient<IEmailSender, SmtpEmailSender>();
        services.AddTransient<INotificationFormatter, NotificationFormatter>();

        // 工厂注册：基于运行时条件
        services.AddTransient<IPaymentGateway>(sp =>
        {
            var config = sp.GetRequiredService<IConfiguration>();
            return config["Payment:Provider"] switch
            {
                "Stripe" => new StripeGateway(config["Payment:ApiKey"]!),
                "PayPal" => new PayPalGateway(config["Payment:ClientId"]!),
                _ => throw new InvalidOperationException("未知支付提供商")
            };
        });

        // 装饰器：日志与重试包装
        services.Decorate<IUserRepository, LoggingUserRepository>();
        services.Decorate<IUserRepository, CachingUserRepository>();

        return services;
    }
}
```

### 实践 4：单元测试友好的对象设计

```csharp
// 通过依赖注入与接口抽象实现可测试性
public sealed class OrderService
{
    private readonly IOrderRepository _repo;
    private readonly IPaymentGateway _payment;
    private readonly IClock _clock;
    private readonly ILogger<OrderService> _logger;

    public OrderService(
        IOrderRepository repo,
        IPaymentGateway payment,
        IClock clock,
        ILogger<OrderService> logger)
    {
        _repo = repo; _payment = payment; _clock = clock; _logger = logger;
    }

    public async Task<OrderResult> PlaceOrderAsync(PlaceOrderCommand cmd)
    {
        var now = _clock.UtcNow; // 通过 IClock 抽象时间
        var order = Order.Create(cmd.CustomerId, cmd.Lines);

        try
        {
            await _payment.ChargeAsync(order.TotalAmount);
            await _repo.SaveAsync(order);
            _logger.LogInformation("订单 {OrderId} 已创建", order.Id);
            return OrderResult.Success(order.Id);
        }
        catch (PaymentFailedException ex)
        {
            _logger.LogWarning(ex, "订单 {OrderId} 支付失败", order.Id);
            return OrderResult.Failure("支付失败: " + ex.Message);
        }
    }
}

// 单元测试：依赖全部 mock
[Test]
public async Task PlaceOrder_Should_Success_When_Payment_Approved()
{
    // Arrange
    var repo = Substitute.For<IOrderRepository>();
    var payment = Substitute.For<IPaymentGateway>();
    var clock = Substitute.For<IClock>();
    clock.UtcNow.Returns(new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero));
    var logger = NullLogger<OrderService>.Instance;

    var service = new OrderService(repo, payment, clock, logger);
    var cmd = new PlaceOrderCommand(Guid.NewGuid(), new[] { /* ... */ });

    // Act
    var result = await service.PlaceOrderAsync(cmd);

    // Assert
    Assert.IsTrue(result.IsSuccess);
    await repo.Received(1).SaveAsync(Arg.Any<Order>());
    await payment.Received(1).ChargeAsync(Arg.Any<decimal>());
}
```

### 实践 5：版本控制与 API 兼容性

```csharp
// 设计可演进的公共 API
public interface IProductService
{
    // 原始方法
    Task<Product> GetAsync(int id);

    // 版本 2：添加可选参数（不破坏调用方）
    Task<Product> GetAsync(int id, bool includeInactive = false);

    // 版本 3：使用新方法名而非重载
    Task<ProductDetailed> GetDetailedAsync(int id);
}

// 使用接口默认方法添加新功能而不破坏实现类
public interface IProductServiceV2 : IProductService
{
    // 新方法有默认实现，老实现类无需修改
    Task<IEnumerable<Product>> SearchAsync(string keyword)
    {
        // 默认实现：调用现有方法
        return Task.FromResult(Enumerable.Empty<Product>());
    }
}

// 不可变类型的版本演进：通过新 record 继承
public record ProductV1(int Id, string Name, decimal Price);
public record ProductV2(int Id, string Name, decimal Price, string Description) : ProductV1(Id, Name, Price);
```

## 案例研究

### 案例 1：电商订单领域模型重构

**背景**：某电商平台最初使用贫血模型，业务逻辑散落在服务层，导致多个团队修改同一服务引发冲突。

**重构前**：

```csharp
// 贫血模型：仅数据，无行为
public class Order
{
    public int Id { get; set; }
    public decimal Total { get; set; }
    public string Status { get; set; }
    public List<OrderItem> Items { get; set; }
}

// 业务逻辑在服务层
public class OrderService
{
    public void CancelOrder(Order order)
    {
        if (order.Status == "Shipped")
            throw new Exception("已发货订单不可取消");
        order.Status = "Cancelled";
        // 库存归还逻辑...
        // 退款逻辑...
        // 通知逻辑...
    }
}
```

**重构后**（采用 DDD 战术模式）：

```csharp
// 聚合根：封装状态变更
public sealed class Order
{
    public OrderId Id { get; }
    public CustomerId CustomerId { get; }
    private readonly List<OrderLine> _lines;
    public IReadOnlyList<OrderLine> Lines => _lines.AsReadOnly();
    public OrderStatus Status { get; private set; }
    public Money TotalAmount => Money.Sum(_lines.Select(l => l.SubTotal));

    private Order(OrderId id, CustomerId customerId, List<OrderLine> lines, OrderStatus status)
    {
        Id = id; CustomerId = customerId; _lines = lines; Status = status;
    }

    // 工厂方法：保证创建时不变量
    public static Order Place(CustomerId customerId, IEnumerable<OrderLine> lines)
    {
        var lineList = lines.ToList();
        if (lineList.Count == 0)
            throw new DomainException("订单至少包含一行");

        var order = new Order(OrderId.New(), customerId, lineList, OrderStatus.Pending);
        order.Raise(new OrderPlaced(order.Id, customerId, order.TotalAmount));
        return order;
    }

    // 业务方法：状态机转换
    public void Pay()
    {
        EnsureCanTransition(OrderStatus.Pending, OrderStatus.Paid);
        Status = OrderStatus.Paid;
        Raise(new OrderPaid(Id, TotalAmount));
    }

    public void Ship(TrackingNumber tracking)
    {
        EnsureCanTransition(OrderStatus.Paid, OrderStatus.Shipped);
        Tracking = tracking;
        Status = OrderStatus.Shipped;
        Raise(new OrderShipped(Id, tracking));
    }

    public void Cancel(string reason)
    {
        if (Status is OrderStatus.Shipped or OrderStatus.Delivered)
            throw new DomainException($"{Status} 订单不可取消");
        Status = OrderStatus.Cancelled;
        Raise(new OrderCancelled(Id, reason));
    }

    private void EnsureCanTransition(OrderStatus from, OrderStatus to)
    {
        if (Status != from)
            throw new DomainException($"状态转换非法: {Status} -> {to}");
    }

    public TrackingNumber? Tracking { get; private set; }
    private readonly List<object> _events = new();
    public IReadOnlyList<object> Events => _events.AsReadOnly();
    private void Raise(object @event) => _events.Add(@event);
}

// 值对象：强类型 ID 防止参数混淆
public readonly record struct OrderId(Guid Value)
{
    public static OrderId New() => new(Guid.NewGuid());
    public override string ToString() => Value.ToString();
}

public readonly record struct CustomerId(Guid Value);
public readonly record struct TrackingNumber(string Value)
{
    public TrackingNumber
    {
        if (string.IsNullOrWhiteSpace(Value))
            throw new ArgumentException("追踪号不能为空", nameof(Value));
    }
}
```

**收益**：

- 业务规则集中到聚合根，团队并行开发不冲突
- 状态转换合法性由领域模型保证，服务层简化为编排
- 强类型 ID 消除参数顺序错误
- 不可变值对象减少并发问题

### 案例 2：插件化架构的接口设计

**背景**：某 SaaS 平台需要支持第三方扩展，但又不希望核心代码依赖具体插件。

**解决方案**：基于接口与依赖注入的插件架构

```csharp
// 核心契约：插件必须实现
public interface IPlugin
{
    PluginDescriptor Descriptor { get; }
    Task InitializeAsync(IPluginContext context);
    Task<PluginResult> ExecuteAsync(PluginInput input, CancellationToken ct = default);
    Task ShutdownAsync();
}

public sealed record PluginDescriptor(
    string Name, Version Version, string Author, string Description);

public interface IPluginContext
{
    IServiceProvider Services { get; }
    ILogger Logger { get; }
    IConfiguration Configuration { get; }
}

public sealed record PluginInput(IDictionary<string, object> Parameters);
public sealed record PluginResult(bool Success, string? Message, object? Data);

// 插件宿主
public sealed class PluginHost
{
    private readonly Dictionary<string, IPlugin> _plugins = new();
    private readonly IServiceProvider _services;

    public PluginHost(IServiceProvider services) => _services = services;

    public async Task LoadPluginAsync<T>(string name) where T : IPlugin, new()
    {
        var plugin = new T();
        var context = new PluginContext(_services);
        await plugin.InitializeAsync(context);
        _plugins[name] = plugin;
    }

    public async Task<PluginResult> ExecuteAsync(string pluginName, PluginInput input)
    {
        if (!_plugins.TryGetValue(pluginName, out var plugin))
            return PluginResult.Fail($"插件 '{pluginName}' 未加载");
        return await plugin.ExecuteAsync(input);
    }

    public async Task ShutdownAllAsync()
    {
        foreach (var plugin in _plugins.Values)
            await plugin.ShutdownAsync();
        _plugins.Clear();
    }
}

// 第三方插件示例：不在核心代码库
public sealed class EmailNotificationPlugin : IPlugin
{
    public PluginDescriptor Descriptor => new(
        "EmailNotifier", new Version(1, 0, 0), "FANDEX", "邮件通知插件");

    private IEmailService? _email;

    public Task InitializeAsync(IPluginContext context)
    {
        _email = context.Services.GetRequiredService<IEmailService>();
        return Task.CompletedTask;
    }

    public async Task<PluginResult> ExecuteAsync(PluginInput input, CancellationToken ct = default)
    {
        var to = input.Parameters["to"].ToString()!;
        var subject = input.Parameters["subject"].ToString()!;
        var body = input.Parameters["body"].ToString()!;
        await _email!.SendAsync(to, subject, body, ct);
        return PluginResult.Ok($"邮件已发送至 {to}");
    }

    public Task ShutdownAsync() => Task.CompletedTask;
}
```

### 案例 3：可观测的对象设计

**背景**：分布式系统中需要追踪对象生命周期与状态变更。

```csharp
/// <summary>可观测的领域实体基类。</summary>
public abstract class ObservableEntity
{
    private readonly List<StateChange> _changes = new();
    public IReadOnlyList<StateChange> Changes => _changes.AsReadOnly();

    protected void SetProperty<T>(ref T field, T value, [CallerMemberName] string? name = null)
    {
        if (EqualityComparer<T>.Default.Equals(field, value)) return;
        var old = field;
        field = value;
        _changes.Add(new StateChange(name!, old, value, DateTimeOffset.UtcNow));
    }
}

public sealed record StateChange(string Property, object? OldValue, object? NewValue, DateTimeOffset At);

// 应用：可观测的账户
public sealed class ObservableAccount : ObservableEntity
{
    private string _email = "";
    private decimal _balance;
    private AccountStatus _status = AccountStatus.Active;

    public string Email
    {
        get => _email;
        set => SetProperty(ref _email, value);
    }

    public decimal Balance
    {
        get => _balance;
        set => SetProperty(ref _balance, value);
    }

    public AccountStatus Status
    {
        get => _status;
        set => SetProperty(ref _status, value);
    }

    public void Deposit(decimal amount)
    {
        if (amount <= 0) throw new ArgumentOutOfRangeException(nameof(amount));
        Balance += amount;
    }
}

// 审计场景：导出变更历史
var account = new ObservableAccount { Email = "a@b.com", Balance = 100 };
account.Deposit(50);
account.Email = "new@b.com";
account.Status = AccountStatus.Suspended;

foreach (var change in account.Changes)
{
    Console.WriteLine($"{change.At:HH:mm:ss} {change.Property}: {change.OldValue} -> {change.NewValue}");
}
// 输出：
// 14:30:00 Email:  -> a@b.com
// 14:30:00 Balance: 0 -> 100
// 14:30:01 Balance: 100 -> 150
// 14:30:01 Email: a@b.com -> new@b.com
// 14:30:01 Status: Active -> Suspended
```

## 习题

### 基础题

**习题 1**：设计一个 `Temperature` 类，支持摄氏度与华氏度相互转换，要求：

- 通过属性 `Celsius` 与 `Fahrenheit` 都可读写，且相互联动
- 实现运算符重载，支持 `t1 + t2`（结果单位与左操作数一致）
- 重写 `Equals` 与 `GetHashCode`，实现值相等
- 提供隐式转换 `double celsius -> Temperature`

**参考答案要点**：使用私有字段存储摄氏度，两个属性访问器进行换算；运算符重载基于摄氏度计算后构造新实例；隐式转换 `public static implicit operator Temperature(double celsius) => new(celsius)`。

**习题 2**：实现一个 `Stack<T>` 简化版（不使用 `System.Collections.Generic.Stack<T>`），要求：

- 使用链表节点存储数据
- 实现 `Push`、`Pop`、`Peek`、`Count`、`IsEmpty`、`Clear`
- 实现 `IEnumerable<T>` 支持遍历
- 使用 `yield return` 实现惰性遍历

**参考答案要点**：定义私有 `Node<T>` 嵌套类；`Push` 创建新节点并调整头指针；`IEnumerable<T>` 使用 `yield return` 从栈顶到栈底遍历；处理空栈时 `Pop` 抛出 `InvalidOperationException`。

**习题 3**：解释下列代码的输出，并说明原因：

```csharp
public class A { public virtual void M() => Console.WriteLine("A.M"); }
public class B : A { public override void M() => Console.WriteLine("B.M"); }
public class C : B { public new void M() => Console.WriteLine("C.M"); }

A a = new C();
a.M(); // 输出？
B b = new C();
b.M(); // 输出？
C c = new C();
c.M(); // 输出？
```

**参考答案要点**：
- `a.M()` 输出 `B.M`：因为 `A.M` 是 virtual，运行时根据实际类型 C 查找，C 没有重写（C.M 是 new 隐藏），找到 B.M。
- `b.M()` 输出 `B.M`：B.M 是 override，运行时查找最新 override，C 没有 override，调用 B.M。
- `c.M()` 输出 `C.M`：编译期类型为 C，C.M 隐藏了继承的 B.M，调用 C.M。

### 进阶题

**习题 4**：设计一个不可变的 `ImmutableList<T>`，要求：

- 提供 `Add`、`Remove`、`Insert`、`Contains`、`IndexOf`、`Count`、索引器
- 所有"修改"操作返回新列表
- 基于 AVL 树或单链表实现
- 实现迭代器

**参考答案要点**：单链表实现简单但 `IndexOf` 为 O(n)；AVL 树实现索引访问 O(log n) 但复杂。推荐单链表：`Add` 在头部插入 O(1)，构造新节点链；`Remove` 复制到目标节点前，剩余复用；索引访问 O(n)。注意实现 `IEnumerable<T>` 与索引器。

**习题 5**：实现一个 `Result<T, TError>` 类型（类似 Rust 的 Result），要求：

- 隐式转换 `T -> Result<T, TError>` 与 `TError -> Result<T, TError>`
- 实现 `Match` 方法进行模式匹配
- 实现 `Bind`（SelectMany）支持链式组合
- 提供 `Ensure` 扩展进行校验

**参考答案要点**：使用抽象类 + 两个 sealed 子类 `Ok<T, TError>` 与 `Err<T, TError>`；`Match` 接受两个委托返回统一类型；`Bind` 在 Ok 时调用下一个函数，Err 时短路；`Ensure` 接受谓词与错误，失败返回 Err。

```csharp
public abstract class Result<T, TError>
{
    public abstract TResult Match<TResult>(
        Func<T, TResult> ok, Func<TError, TResult> err);

    public Result<TNew, TError> Bind<TNew>(Func<T, Result<TNew, TError>> next) =>
        Match(v => next(v), e => Result<TNew, TError>.Err(e));

    public static Result<T, TError> Ok(T value) => new OkResult(value);
    public static Result<T, TError> Err(TError error) => new ErrResult(error);

    public static implicit operator Result<T, TError>(T value) => Ok(value);
    public static implicit operator Result<T, TError>(TError error) => Err(error);

    private sealed class OkResult(T value) : Result<T, TError>
    {
        private readonly T _value = value;
        public override TResult Match<TResult>(Func<T, TResult> ok, Func<TError, TResult> err) => ok(_value);
    }
    private sealed class ErrResult(TError error) : Result<T, TError>
    {
        private readonly TError _error = error;
        public override TResult Match<TResult>(Func<T, TResult> ok, Func<TError, TResult> err) => err(_error);
    }
}
```

**习题 6**：分析以下代码存在的设计问题，并给出重构建议：

```csharp
public class GodService
{
    public void ProcessOrder(Order order, string userEmail, bool isVip)
    {
        // 校验
        if (order.Items.Count == 0) throw new Exception("空订单");
        if (userEmail.Contains("@") == false) throw new Exception("邮箱非法");
        // 计算 VIP 折扣
        decimal discount = isVip ? 0.1m : 0m;
        if (order.TotalAmount > 1000) discount += 0.05m;
        order.TotalAmount = order.TotalAmount * (1 - discount);
        // 发邮件
        var smtp = new SmtpClient("smtp.example.com");
        smtp.Send("noreply@example.com", userEmail, "订单确认", "您的订单已处理");
        // 写日志
        File.AppendAllText("log.txt", $"{DateTime.Now}: 订单 {order.Id} 已处理");
    }
}
```

**参考答案要点**：
- 违反 SRP：一个方法承担校验、折扣计算、邮件、日志四种职责
- 违反 DIP：直接 `new SmtpClient` 与 `File.AppendAllText`，难以测试
- 违反 OCP：新增折扣规则需修改此方法
- 异常类型粗放：使用 `Exception` 而非领域异常
- 重构：拆分为 `OrderValidator`、`DiscountCalculator`、`IEmailSender`、`ILogger`；通过 DI 注入；折扣规则抽象为策略

### 挑战题

**习题 7**：设计一个表达式树求值与简化系统，要求：

- 支持 `Const`、`Add`、`Sub`、`Mul`、`Div`、`Neg`、`Var`（变量）
- 实现 `Evaluate(Dictionary<string, double> variables)`
- 实现 `Simplify` 进行常量折叠与代数简化（如 `x + 0 = x`、`x * 1 = x`、`2 * (3 + x) = 6 + 2x`）
- 实现 `Derive(string variable)` 求导

**参考答案要点**：使用抽象类 `Expr` 与各子类；`Derive` 在 `Mul` 时应用乘积法则 `d(uv) = u'v + uv'`，`Div` 时应用商法则；`Simplify` 使用模式匹配递归处理子表达式后尝试合并。

**习题 8**：实现一个基于 `record` 的不可变事件溯源（Event Sourcing）模型，要求：

- 定义 `Account` 聚合根，支持 `Deposit`、`Withdraw`、`Transfer`
- 所有状态变更产生领域事件
- 提供 `FromHistory(IEnumerable<DomainEvent>)` 重建状态
- 处理并发冲突（乐观锁）

**参考答案要点**：`Account` 为 `record`，业务方法返回 `(Account newState, DomainEvent @event)` 元组；`FromHistory` 使用 `Aggregate` 折叠事件流；并发冲突通过 `Version` 字段检测，事件存储层在写入时校验版本号。

```csharp
public sealed record Account(
    Guid Id,
    decimal Balance,
    int Version)
{
    public static Account Create(Guid id) => new(id, 0, 0);

    public (Account, DomainEvent) Deposit(decimal amount) =>
        (this with { Balance = Balance + amount, Version = Version + 1 },
         new AmountDeposited(Id, amount, Version + 1));

    public (Account, DomainEvent)? Withdraw(decimal amount) =>
        amount > Balance ? null :
        (this with { Balance = Balance - amount, Version = Version + 1 },
         new AmountWithdrawn(Id, amount, Version + 1));

    public static Account FromHistory(IEnumerable<DomainEvent> events) =>
        events.Aggregate(Create(Guid.Empty), Apply);

    private static Account Apply(Account account, DomainEvent e) => e switch
    {
        AmountDeposited d => account with { Balance = account.Balance + d.Amount, Version = d.Version },
        AmountWithdrawn w => account with { Balance = account.Balance - w.Amount, Version = w.Version },
        _ => account
    };
}
```

**习题 9**：研究 .NET 运行时中虚方法调用的实现机制，回答：

- vtable 在对象内存布局中的位置
- 接口分派与虚方法分派的区别
- JIT 如何通过 CHA 与内联缓存优化虚方法调用
- 在什么情况下虚方法调用会被去虚化为直接调用

**参考答案要点**：

- 每个对象头包含类型句柄指针（MethodTable 指针），MethodTable 中包含 vtable 槽位数组
- 接口分派更复杂：CLR 使用接口映射表（InterfaceMap），从类型 MethodTable 查找接口实现槽；.NET 8+ 引入接口分派优化（Virtual Method Table caching）
- CHA（Class Hierarchy Analysis）：JIT 分析整个程序集，若某虚方法只有一个实现则直接调用；内联缓存：调用点记录上次接收者类型，若类型相同则直接调用；多态内联缓存（PIC）维护少数常见类型
- 去虚化场景：sealed 类的方法、`sealed override` 方法、CHA 显示单一实现、profile 显示调用点接收者类型单一（推测性去虚化）

**习题 10**：比较下列三种实现"策略模式"的方式，从可维护性、性能、可测试性三个维度分析：

```csharp
// 方式 A：接口 + 具体类
public interface IDiscount { decimal Apply(decimal price); }
public sealed class TenPercentOff : IDiscount { public decimal Apply(decimal p) => p * 0.9m; }

// 方式 B：委托
public decimal TenPercentOff(decimal price) => price * 0.9m;
public decimal ApplyDiscount(decimal price, Func<decimal, decimal> discount) => discount(price);

// 方式 C：record + 模式匹配
public abstract record Discount;
public sealed record TenPercentOff() : Discount;
public sealed record FixedOff(decimal Amount) : Discount;
public decimal Apply(decimal price, Discount d) => d switch
{
    TenPercentOff => price * 0.9m,
    FixedOff(var a) => Math.Max(0, price - a),
    _ => price
};
```

**参考答案要点**：

- **可维护性**：方式 C 在折扣类型稳定时最佳（编译期穷尽匹配）；方式 A 易扩展但需修改调用方注册；方式 B 最灵活但缺乏结构
- **性能**：方式 B 最快（委托直接调用，JIT 可内联）；方式 A 虚方法调用有少量开销；方式 C 模式匹配在 .NET 8+ 优化后接近虚调用
- **可测试性**：三者均可 mock（方式 A 通过接口、方式 B 通过委托、方式 C 通过传入 record）
- **推荐**：折扣类型少且稳定选 C；折扣类型多且常扩展选 A；简单算法或函数式风格选 B

## 参考文献

1. Hejlsberg, A., Torgersen, M., Wiltamuth, S., and Golde, P. 2010. *The C# Programming Language* (4th ed.). Addison-Wesley Professional. DOI: 10.5555/1861686

2. C# Language Specification. 2024. *C# 13.0 Specification*. Microsoft Learn. Available at: https://learn.microsoft.com/dotnet/csharp/language-reference/language-specification

3. Gamma, E., Helm, R., Johnson, R., and Vlissides, J. 1994. *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley Professional. DOI: 10.5555/186897

4. Martin, R. C. 2002. *Agile Software Development, Principles, Patterns, and Practices*. Pearson. DOI: 10.5555/573476

5. Martin, R. C. 2017. *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall. DOI: 10.5555/3203224

6. Evans, E. 2003. *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley Professional. DOI: 10.5555/861504

7. Liskov, B. H. and Wing, J. M. 1994. A behavioral notion of subtyping. *ACM Transactions on Programming Languages and Systems (TOPLAS)* 16, 6 (Nov. 1994), 1811-1841. DOI: 10.1145/197320.197383

8. Bracha, G. and Cook, W. 1990. Mixin-based inheritance. In *Proceedings of the European Conference on Object-Oriented Programming on Object-Oriented Programming Systems, Languages, and Applications (OOPSLA/ECOOP '90)*. ACM, New York, NY, 303-311. DOI: 10.1145/97945.97982

9. Meyer, B. 1997. *Object-Oriented Software Construction* (2nd ed.). Prentice Hall. DOI: 10.5555/285365

10. Albahari, J. and Albahari, B. 2022. *C# 10 in a Nutshell: The Definitive Reference*. O'Reilly Media. DOI: 10.5555/3582475

11. Skeet, J. 2019. *C# in Depth* (4th ed.). Manning Publications. DOI: 10.5555/3282196

12. Wagner, B. 2022. *Effective C# (Covers C# 6)* (3rd ed.). Addison-Wesley Professional. DOI: 10.5555/2853663

13. Nygaard, K. and Dahl, O.-J. 1981. The development of the SIMULA languages. In *History of Programming Languages*, R. L. Wexelblat (Ed.). Academic Press, New York, NY, 439-493. DOI: 10.1145/800025.1198364

14. Kay, A. C. 1993. The early history of Smalltalk. In *The Second ACM SIGPLAN Conference on History of Programming Languages (HOPL-II)*. ACM, New York, NY, 69-95. DOI: 10.1145/154766.155364

15. Stroustrup, B. 2013. *The C++ Programming Language* (4th ed.). Addison-Wesley Professional. DOI: 10.5555/2544140

## 延伸阅读

### 官方文档

- **C# 语言参考**：https://learn.microsoft.com/dotnet/csharp/language-reference/ - 涵盖所有关键字与语法
- **C# 编程指南**：https://learn.microsoft.com/dotnet/csharp/programming-guide/ - 面向对象、类、接口、记录等主题详解
- **.NET 设计指南**：https://learn.microsoft.com/dotnet/standard/design-guidelines/ - 类型设计、成员设计的官方规范
- **C# 13.0 新特性**：https://learn.microsoft.com/dotnet/csharp/whats-new/csharp-13 - 最新版本特性概览

### 经典教材

- **《C# in Depth》(Jon Skeet)**：深入剖析 C# 演进历史与每个版本的设计动机，适合进阶开发者
- **《Effective C#》(Bill Wagner)**：50 条最佳实践，覆盖对象设计、泛型、LINQ 等主题
- **《Clean Architecture》(Robert C. Martin)**：SOLID 原则与边界设计，适合架构师
- **《Domain-Driven Design》(Eric Evans)**：领域模型、聚合、值对象、规约模式等战术设计

### 前沿论文与博客

- **Hejlsberg, A. (2017)**: *The Future of C#* - Build 大会主题演讲，介绍 record、模式匹配等设计哲学
- **Kennedy, A. and Syme, D. (2001)**: *Design and Implementation of Generics for the .NET Common Language Runtime* - .NET 泛型实现的经典论文
- **ECMA-334 标准**：C# 语言的正式规范，权威参考
- **dotnet/roslyn GitHub 仓库**：https://github.com/dotnet/roslyn - 编译器源码与设计讨论

### 相关模式与架构

- **设计模式**：工厂、抽象工厂、建造者、原型、单例、适配器、桥接、组合、装饰器、外观、享元、代理、责任链、命令、解释器、迭代器、中介者、备忘录、观察者、状态、策略、模板方法、访问者
- **DDD 战术模式**：实体、值对象、聚合、领域事件、仓储、规约、工厂
- **SOLID 原则**：SRP、OCP、LSP、ISP、DIP
- **函数式 OOP 融合**：record、模式匹配、不可变设计、函数组合、Monad（Result、Maybe、Either）

### 实战项目

- **eShopOnContainers**：https://github.com/dotnet-architecture/eShopOnContainers - 微软官方微服务参考架构，含 DDD 实践
- **CleanArchitecture**：https://github.com/jasontaylordev/CleanArchitecture - 模板项目，演示分层架构与 SOLID 实践
- **Ardalis.Specification**：https://github.com/ardalis/Specification - 规约模式的开源实现
- **MediatR**：https://github.com/jbogard/MediatR - 中介者模式实现，用于 CQRS 场景

## 小结

C# 的面向对象编程融合了经典 OOP 范式与现代函数式思想，提供了从重型继承层次到轻量不可变值对象的完整工具链。本章从历史演进、形式化定义、理论推导、代码实践到工程模式，系统呈现了 C# OOP 的全貌：

1. **历史维度**：从 Simula 到 C# 13，对象模型不断演化，融合函数式、不可变、模式匹配等现代特性
2. **理论基础**：子类型关系、多态分派、封装不变量等数学语义指导设计决策
3. **实践维度**：通过 10 个完整代码示例覆盖类、继承、多态、接口、record、运算符重载、扩展方法、SOLID 原则
4. **陷阱识别**：脆弱基类、违反 LSP、上帝对象、暴露可变状态、构造函数副作用、`new` 隐藏等典型反模式
5. **工程落地**：不可变领域模型、规约模式、依赖注入、可测试设计、版本控制
6. **真实案例**：电商订单重构、插件架构、可观测对象设计三个完整场景剖析

掌握 C# OOP 的关键不在于背诵语法，而在于理解每种特性的设计动机、权衡取舍与适用场景。现代 C# 开发者应当在保留 OOP 优势（封装、多态、模块化）的同时，拥抱不可变设计、函数式组合与模式匹配，构建既灵活又稳健的软件系统。
