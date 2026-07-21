---
order: 108
title: 值类型与引用类型
module: csharp
category: 'dev-lang'
difficulty: advanced
description: 'C#值类型与引用类型详解：struct vs class。'
author: fanquanpp
updated: '2026-06-14'
related:
  - csharp/依赖注入生命周期
  - csharp/GC代机制
  - csharp/记录类型与不可变性
prerequisites:
  - csharp/概述与环境配置
---

## 一、学习目标

本文以 MIT 6.102 *Software Construction*、Stanford CS193、CMU 15-410 *Operating Systems* 的内存模型教学水准为参照，对 C# 值类型与引用类型进行系统性的形式化与工程化剖析。阅读完毕后，读者应能达成以下 Bloom 认知层级目标：

| 层级 | 目标描述 | 具体可观测行为 |
| ---- | -------- | -------------- |
| Remember | 复述值类型与引用类型的分类、内存布局与赋值语义 | 列出至少 5 种值类型与 5 种引用类型，画出栈/堆分配示意图 |
| Understand | 解释装箱/拆箱的运行时机制与 GC 影响 | 描述 `object o = 42;` 在堆上的对象头与字段布局 |
| Apply | 在企业级代码中正确选择 `struct` 与 `class` | 为 16 字节以下的不可变数据点设计 `readonly struct` |
| Analyze | 分析 `ref struct`、`Span<T>` 的逃逸限制与栈约束 | 解释为何 `Span<T>` 不能作为 async 方法的字段 |
| Evaluate | 评估装箱开销、`in`/`ref`/`out` 修饰符的取舍 | 在大 struct 复制与指针别名之间做出有依据的选择 |
| Create | 设计自定义 `ref struct`、`readonly record struct` 与 `MemoryMarshal` 互操作 | 实现一个零拷贝的字节缓冲解析器 |

本文假设读者已掌握 C# 基础语法、泛型、面向对象基本概念。

## 二、历史动机与发展脉络

### 2.1 问题背景：统一类型系统的两难

C# 自 2000 年设计之初就面临一个根本两难：既要像 Java 一样提供"一切皆对象"的统一类型系统，又要避免 Java 中 `int` 必须装箱为 `Integer` 才能放入容器的性能开销。Anders Hejlsberg 团队给出了一个折中方案——**分而治之**：

- **值类型**继承自 `System.ValueType`，分配在栈或字段内联，赋值时复制值，不参与 GC 标记-压缩；
- **引用类型**继承自 `System.Object`，分配在 GC 堆，赋值时复制引用，由 GC 管理生命周期；
- 通过**装箱**机制让值类型可以伪装为 `object`，在需要时统一进入引用世界。

这一设计使 C# 在保持 Java 式统一类型系统的同时，实现了接近 C++ 的数值计算性能。这是 C# 与 Java 最核心的差异之一，也是 .NET 性能优势的根基。

### 2.2 C# 1.0（2002）：奠基

C# 1.0 引入了值类型/引用类型的基础模型：

- 预定义简单类型 `int`、`double`、`bool`、`char` 等为值类型；
- `enum` 与 `struct`（含 `DateTime`、`Guid`、`Nullable<T>`）为值类型；
- `class`、`string`、`array`、`delegate`、`interface` 为引用类型；
- 装箱/拆箱机制允许值类型在 `object` 上下文中使用。

### 2.3 C# 2.0（2005）：泛型消除装箱

`List<T>`、`Dictionary<K,V>` 等泛型集合的引入，使值类型不再需要装箱即可放入容器。这是 .NET 2.0 最大的性能提升之一。同时 `Nullable<T>` 作为值类型，使数据库缺失值表示不再需要引用类型包装。

### 2.4 C# 7.2（2017）：`ref struct` 与高性能栈语义

`Span<T>`、`ReadOnlySpan<T>` 的引入需要一种新的约束：**类型实例只能存在于栈上**。C# 7.2 引入 `ref struct` 修饰符，禁止此类类型装箱、作为字段、被 lambda 捕获、在 async 方法中使用。这是 C# 类型系统的重大扩展，使零拷贝内存操作成为可能。

### 2.5 C# 8.0（2019）：可空引用类型

`string?` 与 `string` 的区分使引用类型的 null 语义在编译期可被检查。值类型与引用类型的"非空默认"差异被显式化。

### 2.6 C# 9.0（2020）：`init` 与 `record`

`init` 访问器使值类型与引用类型都能表达"构造期可变、运行期只读"语义。`record class` 引入了基于值的相等性引用类型。

### 2.7 C# 10.0（2021）：`record struct` 与无参构造器

`record struct` 让值类型也获得了自动相等性、`with` 表达式、解构等记录特性。同时 `struct` 的无参构造器与字段初始化器被允许，统一了 `struct` 与 `class` 的初始化体验。

### 2.8 C# 11.0（2022）：`ref struct` 放宽

`ref struct` 可实现接口但不能装箱，使 `Span<T>` 等类型能参与泛型约束与多态场景，同时保留栈约束。

### 2.9 C# 12 / 13 / .NET 8 / 9（2023-2024）

`inlinearray` 特性、`params ReadOnlySpan<T>`、`MemoryMarshal.AsBytes` 的完善，使值类型布局控制达到 C++ 级精度。`.NET 8` 引入 `FrozenDictionary<T>` 等基于值类型布局优化的不可变集合。

### 2.10 演进时间线

| 版本 | 年份 | 关键变化 |
| ---- | ---- | -------- |
| C# 1.0 / .NET 1.0 | 2002 | 值类型/引用类型基础模型，装箱/拆箱 |
| C# 2.0 / .NET 2.0 | 2005 | 泛型消除装箱；`Nullable<T>` |
| C# 3.0 / .NET 3.5 | 2007 | 隐式类型 `var`、匿名类型（引用） |
| C# 4.0 / .NET 4.0 | 2010 | `dynamic` 与 DLR |
| C# 7.0 / .NET Core 2.0 | 2017 | `ref return`、`in`、`out var` |
| C# 7.2 | 2017 | `ref struct`、`readonly struct`、`Span<T>` |
| C# 7.3 | 2018 | `unmanaged` 约束、`fixed` 增强 |
| C# 8.0 / .NET Core 3.0 | 2019 | 可空引用类型 |
| C# 9.0 / .NET 5 | 2020 | `init`、`record class`、`nint` |
| C# 10.0 / .NET 6 | 2021 | `record struct`、struct 无参构造器 |
| C# 11.0 / .NET 7 | 2022 | `ref struct` 接口、`required`、`file` 类型 |
| C# 12.0 / .NET 8 | 2023 | `inlinearray`、集合表达式 |
| C# 13.0 / .NET 9 | 2024 | `params ReadOnlySpan<T>`、`ref struct` 泛型 |

## 三、形式化定义

### 3.1 ECMA-334 与 CLI 规范视角

ECMA-334 第 8.2 节定义 C# 类型系统。ECMA-335（CLI）Partition I 第 8 章给出了更底层的类型语义。形式化定义如下：

$$
\begin{aligned}
\text{Type} &\to \text{ValueType} \mid \text{ReferenceType} \\
\text{ValueType} &\to \text{SimpleType} \mid \text{EnumType} \mid \text{StructType} \mid \text{NullableType} \\
\text{ReferenceType} &\to \text{ClassType} \mid \text{InterfaceType} \mid \text{ArrayType} \mid \text{DelegateType} \mid \text{StringType}
\end{aligned}
$$

所有值类型隐式继承自 `System.ValueType`（`enum` 继承自 `System.Enum`），所有引用类型隐式继承自 `System.Object`。但 `System.ValueType` 本身是**引用类型**——这是一个常被忽略的细节，它本身是 class，仅用于"标记"其子类为值语义。

### 3.2 内存模型：栈与堆的形式化

设进程虚拟地址空间分为栈区 $S$ 与堆区 $H$，函数栈帧 $F_i$ 在 $S$ 上分配。一个变量 $v$ 的存储位置由其类型决定：

$$
\text{Location}(v) = \begin{cases}
F_i.\text{offset}(v) & \text{if } \text{type}(v) \in \text{ValueType} \land \text{not captured} \\
H.\text{alloc}(\text{size}(\text{type}(v))) & \text{if } \text{type}(v) \in \text{ReferenceType} \\
F_i.\text{offset}(v) \text{ (inline)} & \text{if } v \text{ is a field of a value type container}
\end{cases}
$$

**关键观察**：值类型并非"总是在栈上"。当值类型作为引用类型的字段、被装箱、被 lambda 捕获时，它会内联到堆中。准确的说法是"值类型变量直接存储数据，引用类型变量存储指向堆对象的引用"。

### 3.3 赋值语义：复制 vs 别名

赋值操作的形式化定义：

$$
\text{Assign}(a, b) : \begin{cases}
a.\text{data} \leftarrow b.\text{data} & \text{if } \text{type}(a) \in \text{ValueType} \\
a.\text{ref} \leftarrow b.\text{ref} & \text{if } \text{type}(a) \in \text{ReferenceType}
\end{cases}
$$

对值类型，赋值复制**所有字段的位**（浅拷贝）。对引用类型，赋值复制**引用**（指针），两个变量成为同一堆对象的别名。这是两种类型在语义上最深刻的差异。

### 3.4 相等性语义

C# 区分两种相等性：

- **引用相等性**（`ReferenceEquals`）：两个引用是否指向同一堆对象。
- **值相等性**（`Equals`）：两个对象的逻辑内容是否相同。

| 类型 | 默认 `Equals` | 默认 `==` |
| ---- | ------------- | --------- |
| 值类型 | 反射比较所有字段（除非重写） | 默认不可用（需重载） |
| 引用类型 | 引用相等 | 引用相等 |
| `string` | 值相等（重写） | 值相等（重载） |
| `record` | 值相等（编译器生成） | 值相等（编译器生成） |
| `tuple` / `ValueTuple` | 值相等 | 值相等 |

### 3.5 装箱的形式化模型

装箱操作可形式化为：

$$
\text{Box} : V \to (O, R), \quad \text{其中 } O = \text{heap\_alloc}(\text{header}_V + \text{size}(V)), R = \text{ref}(O)
$$

拆箱操作：

$$
\text{Unbox} : R \to V, \quad \text{若 } \text{type}(\text{obj}(R)) = V
$$

装箱会创建一个新的堆对象，包含方法表指针（method table pointer）与值类型字段的副本。拆箱仅返回堆对象中的值字段，**不创建新堆对象**，但仍需类型检查。

## 四、理论推导与原理解析

### 4.1 内存布局剖析

#### 4.1.1 值类型布局

一个 `struct Point { public int X; public int Y; }` 在栈上的布局（默认 `LayoutKind.Sequential`）：

```
偏移   字段
0..3   X (int, 4 bytes)
4..7   Y (int, 4 bytes)
```

总大小 8 字节，无对象头，无方法表指针。但**值类型实例的方法表指针隐含在类型本身**，编译器在调用 `point.ToString()` 时静态绑定到 `System.ValueType.ToString()` 或重写版本。

#### 4.1.2 引用类型布局

一个 `class Point { public int X; public int Y; }` 在堆上的布局：

```
偏移      字段
-8..-5    同步块索引 (sync block index, 4 bytes)
-4..-1    方法表指针 (method table pointer, 4/8 bytes)
0..3      X (int, 4 bytes)
4..7      Y (int, 4 bytes)
8..15     填充 (padding, 8 bytes on 64-bit)
```

64 位系统上最小堆对象 24 字节（16 头 + 8 数据）。**引用类型比等价值类型多 16-24 字节开销**，并参与 GC 跟踪。

#### 4.1.3 数组的布局差异

`int[1000]` 与 `object[1000]` 的内存差异：

- `int[1000]`：24 字节头 + 4000 字节数据 = 4024 字节
- `object[1000]`（每个元素为装箱 int）：24 字节头 + 8000 字节引用 + 1000 × 24 字节堆对象 = 32024 字节

即装箱的 int 数组比原始 int 数组占用 **8 倍**内存。这是泛型集合的核心性能优势所在。

### 4.2 装箱的开销建模

每次装箱操作的开销包括：

1. **堆分配**：$\approx 30-100$ ns（取决于 GC 代与碎片化）
2. **拷贝**：值类型字段复制到堆对象
3. **GC 压力**：堆对象进入 Gen 0，增加后续 GC 频率

设每次装箱开销 $c_b$，循环中装箱 $n$ 次：

$$
T_{\text{boxing}}(n) = n \cdot c_b + T_{\text{GC}}(\text{increased frequency})
$$

对 100 万次装箱，典型 $T_{\text{boxing}} \approx 50\text{ms}$，而无装箱版本 $\approx 1\text{ms}$。差异 50 倍。

### 4.3 复制开销建模

值类型赋值复制所有字段的位。对 $k$ 字节的 struct：

$$
T_{\text{copy}}(k) = \lceil k / w \rceil \cdot t_{\text{word\_copy}}
$$

其中 $w$ 为机器字长（8 字节 on x64），$t_{\text{word\_copy}} \approx 1$ ns。16 字节 struct 单次复制 $\approx 2$ ns，可忽略；512 字节 struct 复制 $\approx 64$ ns，频繁复制会累积。

**经验法则**：struct 大小超过 16 字节时，考虑用 `in`/`ref` 传递避免复制；超过 128 字节时，几乎必然应改为 `class`。

### 4.4 GC 影响：根集与扫描

GC 通过根集（roots）追踪可达对象。引用类型变量是根，值类型变量不是（其字段若是引用则单独追踪）。

设堆中有 $N$ 个引用类型对象，$M$ 个值类型字段内联其中。GC 标记阶段复杂度：

$$
T_{\text{mark}} = O(N + E), \quad E = \text{引用边数}
$$

值类型字段内联不增加 $N$，但增加 $E$（若字段为引用类型）。`struct { string name; }` 的 name 字段是引用，仍需 GC 跟踪。**纯值类型 struct（如 `Vector3`）对 GC 零压力**。

### 4.5 `ref struct` 的逃逸分析

`ref struct` 通过**编译期逃逸分析**保证不逃逸到堆。规则：

1. 不能作为 `class` 字段（除 `ref` 字段）；
2. 不能装箱为 `object`/`ValueType`/接口（C# 11 前）；
3. 不能被 lambda 闭包捕获；
4. 不能在 `async` 方法中跨越 `await`；
5. 不能实现 `IDisposable` 后用 `using` 装箱。

编译器在语义分析阶段对每个 `ref struct` 变量跟踪其"逃逸范围"（escape scope），违规时报告 CS8352 等错误。这是 C# 类型系统中最复杂的静态分析之一。

## 五、代码示例（企业级 production-ready）

### 5.1 项目结构

```
FandexValueTypeDemo/
├── FandexValueTypeDemo.csproj
├── Program.cs
├── Primitives/
│   ├── Point.cs
│   ├── Money.cs
│   └── Color.cs
├── Buffers/
│   ├── StackBuffer.cs
│   └── ByteParser.cs
└── Interop/
    └── NativeHeader.cs
```

### 5.2 csproj 配置（.NET 8 / C# 12）

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <LangVersion>12</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <AllowUnsafeBlocks>true</AllowUnsafeBlocks>
    <ServerGarbageCollection>true</ServerGarbageCollection>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="BenchmarkDotNet" Version="0.13.12" />
  </ItemGroup>

</Project>
```

### 5.3 不可变值类型：`readonly struct`

```csharp
// Primitives/Point.cs —— C# 10 / .NET 6
namespace FandexValueTypeDemo.Primitives;

/// <summary>
/// 二维点。不可变值类型，4 字节对齐，总大小 16 字节。
/// 适合：频繁传递、不会逃逸到堆的几何运算。
/// </summary>
public readonly struct Point : IEquatable<Point> {
    public double X { get; }
    public double Y { get; }

    public Point(double x, double y) => (X, Y) = (x, y);

    public static readonly Point Origin = new(0, 0);

    public double DistanceTo(in Point other) {
        double dx = X - other.X;
        double dy = Y - other.Y;
        return Math.Sqrt(dx * dx + dy * dy);
    }

    public bool Equals(Point other) => X == other.X && Y == other.Y;
    public override bool Equals([NotNullWhen(true)] object? obj) => obj is Point p && Equals(p);
    public override int GetHashCode() => HashCode.Combine(X, Y);
    public static bool operator ==(Point left, Point right) => left.Equals(right);
    public static bool operator !=(Point left, Point right) => !left.Equals(right);

    public override string ToString() => $"({X}, {Y})";
}
```

### 5.4 带单位的值类型：`Money`

```csharp
// Primitives/Money.cs
namespace FandexValueTypeDemo.Primitives;

/// <summary>
/// 货币值。使用 decimal 保证财务精度，自带币种。
/// 显式实现以避免误用 double 累加。
/// </summary>
public readonly struct Money : IEquatable<Money>, IComparable<Money> {
    public decimal Amount { get; }
    public CurrencyCode Currency { get; }

    public Money(decimal amount, CurrencyCode currency) {
        if (amount < 0 && currency == CurrencyCode.BTC)
            throw new ArgumentOutOfRangeException(nameof(amount), "BTC 不允许负数");
        Amount = amount;
        Currency = currency;
    }

    public static Money operator +(Money a, Money b) {
        if (a.Currency != b.Currency)
            throw new InvalidOperationException("币种不匹配，请先兑换");
        return new Money(a.Amount + b.Amount, a.Currency);
    }

    public static Money operator -(Money a, Money b) {
        if (a.Currency != b.Currency)
            throw new InvalidOperationException("币种不匹配，请先兑换");
        return new Money(a.Amount - b.Amount, a.Currency);
    }

    public bool Equals(Money other) => Amount == other.Amount && Currency == other.Currency;
    public int CompareTo(Money other) {
        if (Currency != other.Currency)
            throw new InvalidOperationException("币种不匹配，无法比较");
        return Amount.CompareTo(other.Amount);
    }

    public override bool Equals([NotNullWhen(true)] object? obj) =>
        obj is Money m && Equals(m);
    public override int GetHashCode() => HashCode.Combine(Amount, Currency);
    public override string ToString() => $"{Amount:N2} {Currency}";
}

public enum CurrencyCode { CNY, USD, EUR, JPY, BTC }
```

### 5.5 `ref struct`：栈缓冲区

```csharp
// Buffers/StackBuffer.cs —— C# 11 / .NET 7
namespace FandexValueTypeDemo.Buffers;

/// <summary>
/// 栈分配的字节缓冲区。ref struct 保证不逃逸到堆。
/// 适合：高频解析、临时缓冲、零拷贝操作。
/// </summary>
public ref struct StackBuffer {
    private readonly Span<byte> _buffer;
    private int _position;

    public StackBuffer(Span<byte> buffer) {
        _buffer = buffer;
        _position = 0;
    }

    public int Capacity => _buffer.Length;
    public int Position => _position;
    public int Remaining => _buffer.Length - _position;
    public ReadOnlySpan<byte> Written => _buffer[.._position];

    public void WriteByte(byte value) {
        if (_position >= _buffer.Length)
            throw new InvalidOperationException("缓冲区已满");
        _buffer[_position++] = value;
    }

    public void WriteInt32BigEndian(int value) {
        if (Remaining < 4)
            throw new InvalidOperationException("剩余空间不足");
        BinaryPrimitives.WriteInt32BigEndian(_buffer[_position..], value);
        _position += 4;
    }

    public void WriteUtf8String(ReadOnlySpan<char> value) {
        int written = Encoding.UTF8.GetBytes(value, _buffer[_position..]);
        _position += written;
    }

    public byte ReadByte() {
        if (_position >= _buffer.Length)
            throw new InvalidOperationException("无可读数据");
        return _buffer[_position++];
    }

    public int ReadInt32BigEndian() {
        if (Remaining < 4)
            throw new InvalidOperationException("剩余数据不足");
        int value = BinaryPrimitives.ReadInt32BigEndian(_buffer[_position..]);
        _position += 4;
        return value;
    }
}
```

### 5.6 `record struct`：自动值相等

```csharp
// Primitives/Color.cs —— C# 10 / .NET 6
namespace FandexValueTypeDemo.Primitives;

/// <summary>
/// RGBA 颜色。record struct 自动生成 ==、!=、GetHashCode、ToString、With。
/// </summary>
public readonly record struct Color(byte R, byte G, byte B, byte A = 255) {
    public static readonly Color Black = new(0, 0, 0);
    public static readonly Color White = new(255, 255, 255);
    public static readonly Color Transparent = new(0, 0, 0, 0);
    public static readonly Color Red = new(255, 0, 0);

    public string ToHex() => $"#{R:X2}{G:X2}{B:X2}{A:X2}";

    public Color WithAlpha(byte alpha) => this with { A = alpha };

    public Color Blend(Color other, double ratio) {
        double r = R * (1 - ratio) + other.R * ratio;
        double g = G * (1 - ratio) + other.G * ratio;
        double b = B * (1 - ratio) + other.B * ratio;
        return new((byte)r, (byte)g, (byte)b, A);
    }
}
```

### 5.7 零拷贝解析器：`MemoryMarshal` 实战

```csharp
// Buffers/ByteParser.cs —— C# 12 / .NET 8
using System.Runtime.InteropServices;

namespace FandexValueTypeDemo.Buffers;

/// <summary>
/// 高性能二进制解析器。利用 ref struct 与 MemoryMarshal 实现零拷贝。
/// </summary>
public ref struct ByteParser {
    private readonly ReadOnlySpan<byte> _data;
    private int _position;

    public ByteParser(ReadOnlySpan<byte> data) {
        _data = data;
        _position = 0;
    }

    public int Position => _position;
    public int Remaining => _data.Length - _position;
    public bool EndOfData => _position >= _data.Length;

    /// <summary>
    /// 读取一个 struct（要求 unmanaged 约束，即所有字段为值类型）。
    /// 零拷贝：直接 reinterpret cast Span&lt;byte&gt; 为 T。
    /// </summary>
    public T Read<T>() where T : unmanaged {
        int size = Unsafe.SizeOf<T>();
        if (Remaining < size)
            throw new InvalidOperationException("数据不足");
        T value = MemoryMarshal.Read<T>(_data[_position..]);
        _position += size;
        return value;
    }

    /// <summary>
    /// 读取 struct 数组，零拷贝。
    /// </summary>
    public ReadOnlySpan<T> ReadArray<T>(int count) where T : unmanaged {
        int size = Unsafe.SizeOf<T>() * count;
        if (Remaining < size)
            throw new InvalidOperationException("数据不足");
        var slice = _data.Slice(_position, size);
        _position += size;
        return MemoryMarshal.Cast<byte, T>(slice);
    }

    /// <summary>
    /// 读取长度前缀的 UTF-8 字符串。
    /// </summary>
    public string ReadString() {
        int length = Read<int>();
        if (Remaining < length)
            throw new InvalidOperationException("数据不足");
        string value = Encoding.UTF8.GetString(_data.Slice(_position, length));
        _position += length;
        return value;
    }
}
```

### 5.8 互操作：精确内存布局

```csharp
// Interop/NativeHeader.cs —— C# 12 / .NET 8
using System.Runtime.InteropServices;

namespace FandexValueTypeDemo.Interop;

/// <summary>
/// BMP 文件头。LayoutKind.Sequential 保证字段顺序与 C 结构一致。
/// </summary>
[StructLayout(LayoutKind.Sequential, Pack = 1)]
public readonly struct BmpFileHeader {
    public readonly ushort Signature;     // "BM" = 0x4D42
    public readonly uint FileSize;
    public readonly ushort Reserved1;
    public readonly ushort Reserved2;
    public readonly uint PixelArrayOffset;
}

[StructLayout(LayoutKind.Sequential, Pack = 1)]
public readonly struct BmpInfoHeader {
    public readonly uint HeaderSize;
    public readonly int Width;
    public readonly int Height;
    public readonly ushort Planes;
    public readonly ushort BitsPerPixel;
    public readonly uint Compression;
    public readonly uint ImageSize;
    public readonly int XPixelsPerMeter;
    public readonly int YPixelsPerMeter;
    public readonly uint ColorsUsed;
    public readonly uint ImportantColors;
}

/// <summary>
/// 联合体：用显式布局实现 C union 语义。
/// 不同字段共享同一段内存，用于二进制协议解析。
/// </summary>
[StructLayout(LayoutKind.Explicit)]
public struct UnionValue {
    [FieldOffset(0)] public byte ByteValue;
    [FieldOffset(0)] public sbyte SByteValue;
    [FieldOffset(0)] public short Int16Value;
    [FieldOffset(0)] public ushort UInt16Value;
    [FieldOffset(0)] public int Int32Value;
    [FieldOffset(0)] public uint UInt32Value;
    [FieldOffset(0)] public float SingleValue;
    [FieldOffset(4)] public int High32;  // 仅对 64 位类型有意义
}

/// <summary>
/// InlineArray：固定大小数组内联（C# 12）。
/// 用于高性能缓冲，无需堆分配。
/// </summary>
[InlineArray(8)]
public struct Int8Buffer {
    private int _element0;  // 仅声明首元素，编译器扩展为 8 个
}

public static class InteropExample {
    public static unsafe void ParseBmpHeader(ReadOnlySpan<byte> data) {
        if (data.Length < 14) throw new ArgumentException("数据不足");

        // 零拷贝读取文件头
        var header = MemoryMarshal.Read<BmpFileHeader>(data);
        Console.WriteLine($"签名: 0x{header.Signature:X4}");
        Console.WriteLine($"文件大小: {header.FileSize}");
        Console.WriteLine($"像素偏移: {header.PixelArrayOffset}");

        if (header.Signature != 0x4D42)
            throw new InvalidDataException("非 BMP 文件");
    }

    public static void DemonstrateUnion() {
        var u = new UnionValue { Int32Value = 0x40490FDB };
        Console.WriteLine($"作为 float: {u.SingleValue}");  // 3.14159...
        Console.WriteLine($"作为 byte: {u.ByteValue}");    // 0xDB
        Console.WriteLine($"作为 int16: {u.Int16Value}");  // 0x0FDB
    }
}
```

### 5.9 主程序

```csharp
// Program.cs
using FandexValueTypeDemo.Primitives;
using FandexValueTypeDemo.Buffers;
using FandexValueTypeDemo.Interop;

Console.WriteLine("== 值类型赋值：复制 ==");
var p1 = new Point(1, 2);
var p2 = p1;  // 复制
Console.WriteLine($"p1 == p2: {p1 == p2}");  // True
unsafe {
    Console.WriteLine($"p1 地址: {(long)&p1:X}, p2 地址: {(long)&p2:X}");
}

Console.WriteLine("\n== 引用类型赋值：别名 ==");
var c1 = new Money(100m, CurrencyCode.CNY);
var c2 = new Money(100m, CurrencyCode.CNY);
Console.WriteLine($"c1 == c2 (值相等): {c1 == c2}");  // True
Console.WriteLine($"ReferenceEquals: {ReferenceEquals(c1, c2)}");  // False

Console.WriteLine("\n== Money 运算 ==");
var total = new Money(100m, CurrencyCode.CNY) + new Money(50m, CurrencyCode.CNY);
Console.WriteLine($"总计: {total}");

try {
    var invalid = new Money(100m, CurrencyCode.CNY) + new Money(50m, CurrencyCode.USD);
} catch (InvalidOperationException ex) {
    Console.WriteLine($"捕获: {ex.Message}");
}

Console.WriteLine("\n== Color record struct ==");
var red = Color.Red;
var halfRed = red with { A = 128 };
Console.WriteLine($"red: {red.ToHex()}, halfRed: {halfRed.ToHex()}");

Console.WriteLine("\n== StackBuffer ==");
Span<byte> buffer = stackalloc byte[64];
var writer = new StackBuffer(buffer);
writer.WriteInt32BigEndian(0x12345678);
writer.WriteUtf8String("hello");
writer.WriteByte(0xFF);

var reader = new StackBuffer(buffer);
Console.WriteLine($"int: 0x{reader.ReadInt32BigEndian():X8}");
Console.WriteLine($"剩余: {reader.Remaining} 字节");

Console.WriteLine("\n== ByteParser 零拷贝 ==");
Span<byte> packet = stackalloc byte[20];
BinaryPrimitives.WriteInt32LittleEndian(packet[..4], 42);
Encoding.UTF8.GetBytes("hi", packet.Slice(4, 2));
var parser = new ByteParser(packet);
Console.WriteLine($"int: {parser.Read<int>()}");
// 接下来读取字符串需自定义协议

Console.WriteLine("\n== Union 与 InlineArray ==");
InteropExample.DemonstrateUnion();

var intBuf = new Int8Buffer();
unsafe {
    fixed (int* p = &intBuf) {
        for (int i = 0; i < 8; i++) p[i] = i * 10;
        for (int i = 0; i < 8; i++) Console.Write($"{p[i]} ");
    }
}
Console.WriteLine();
```

## 六、对比分析

### 6.1 与 Java 的对比

| 维度 | C# | Java |
| ---- | -- | ---- |
| 值类型支持 | `struct`、`enum`、`Nullable<T>` | 仅原始类型与 `enum` |
| 自定义值类型 | 支持 `struct` | 不支持（仅 8 个原始类型） |
| 装箱机制 | 有 | 有 |
| 装箱消除 | 泛型（编译期特化） | 泛型（类型擦除，仍装箱） |
| 引用类型默认 | 非 null（编译期检查） | 可 null |
| 栈分配对象 | `stackalloc`、`ref struct` | 不支持 |
| 内存布局控制 | `StructLayout` | 不支持 |
| 零拷贝 | `MemoryMarshal` | 不支持 |

Java 的泛型使用类型擦除，`List<int>` 不存在，必须用 `List<Integer>` 装箱。这是 Java 性能不如 .NET 的核心原因之一。

### 6.2 与 Kotlin 的对比

| 维度 | C# | Kotlin |
| ---- | -- | ------ |
| 值类型 | 完整支持 `struct` | 仅 JVM 原始类型 |
| 装箱 | 显式 | 隐式（`Int?` 装箱） |
| `data class` | 类似 `record` | 引用类型 |
| 内存布局 | 可控制 | 不可 |

Kotlin 在 JVM 上无法突破 Java 类型系统限制，`data class` 仍是引用类型。

### 6.3 与 Swift 的对比

| 维度 | C# | Swift |
| ---- | -- | ----- |
| 值类型 | `struct` | `struct`（更激进，默认） |
| 写时复制 | 手动 | 标准库内置 COW |
| 栈分配 | `stackalloc` | 编译器决定 |
| 引用类型 | `class` | `class`（仅引用类型参与 ARC） |
| 内存安全 | 显式 `unsafe` | 默认安全 |

Swift 把 `struct` 作为首选数据载体，标准库的 `Array`、`Dictionary`、`String` 都是值类型 + COW，避免共享可变状态。C# 更保守，仍以 `class` 为主。

### 6.4 与 Rust 的对比

| 维度 | C# | Rust |
| ---- | -- | ---- |
| 值类型 | `struct` | `struct`（默认栈分配） |
| 引用类型 | `class` | `Box<T>`、`Rc<T>` |
| 所有权 | GC | 所有权系统 |
| 借用 | `ref`/`in`/`out` | `&T`/`&mut T` |
| 生命周期 | GC | `'a` 显式标注 |
| 零成本抽象 | 部分 | 完整 |

Rust 通过所有权系统在编译期保证内存安全，无需 GC。C# 通过 GC + `ref struct` 提供近似的安全保证，但仍依赖运行时。

### 6.5 与 Go 的对比

| 维度 | C# | Go |
| ---- | -- | -- |
| 值类型 | `struct` | `struct`（默认值传递） |
| 引用类型 | `class` | `*T` 指针、`slice`、`map` |
| 装箱 | 有 | 无（无统一对象模型） |
| GC 压力 | 较高 | 较低（无装箱） |
| 栈分配 | 编译器决定 + `stackalloc` | 编译器逃逸分析 |

Go 的 `struct` 与 C# 的 `struct` 行为相似，但 Go 没有"引用类型基类"概念，无装箱开销。代价是缺少泛型容器（1.18 前）与统一对象模型。

## 七、常见陷阱与最佳实践

### 7.1 陷阱：可变 struct 的副作用

```csharp
// 反例：可变 struct 导致意外行为
public struct MutablePoint {
    public int X, Y;
    public void Translate(int dx, int dy) { X += dx; Y += dy; }
}

var p = new MutablePoint { X = 1, Y = 2 };
var list = new List<MutablePoint> { p };
list[0].Translate(10, 10);
// 期望 p 也变化？实际：list[0] 是副本，p 不变
Console.WriteLine($"p: ({p.X}, {p.Y})");  // (1, 2)
Console.WriteLine($"list[0]: ({list[0].X}, {list[0].Y})");  // (11, 12)

// 接口调用时也易出错
interface ITranslatable { void Translate(int dx, int dy); }
struct Movable : ITranslatable {
    public int X;
    public void Translate(int dx, int _) => X += dx;
}

ITranslatable m = new Movable { X = 1 };  // 装箱
m.Translate(10, 0);  // 修改的是装箱副本
m.Translate(10, 0);  // 又是另一个装箱副本，每次都从原值开始
```

**最佳实践**：struct 应为 `readonly struct`，需要修改时返回新实例。

### 7.2 陷阱：struct 作为字典键被修改

```csharp
// 错误：可变 struct 作字典键
struct MutableKey { public int Id; public string Name; }
var dict = new Dictionary<MutableKey, string>();
var key = new MutableKey { Id = 1, Name = "a" };
dict[key] = "value";
key.Name = "b";  // 修改键
// dict[key] 现在找不到，因为哈希值变了
_ = dict.TryGetValue(key, out _);  // False
// 但旧键仍在字典中，造成内存泄漏
```

**最佳实践**：字典键必须不可变。用 `readonly struct` 或 `record struct`。

### 7.3 陷阱：默认无参构造器（C# 10 前）

```csharp
// C# 10 前：struct 无参构造器不会运行
struct Counter {
    public int Count;
    public Counter() { Count = 42; }  // C# 10 前不允许
}

// C# 10+：允许但要注意 default 不会调用
var c1 = new Counter();  // 调用构造器，Count = 42
var c2 = default(Counter);  // 不调用，Count = 0
Counter c3 = default;  // 不调用，Count = 0
var c4 = new Counter[10];  // 数组元素不调用，Count = 0
```

**最佳实践**：不要依赖 struct 构造器初始化字段为零值以外的值，因为 `default` 不调用构造器。

### 7.4 陷阱：struct 中引用类型字段的共享

```csharp
struct Container {
    public List<int> Items;
}

var c1 = new Container { Items = new List<int> { 1, 2, 3 } };
var c2 = c1;  // 复制 struct，但 Items 引用相同
c2.Items.Add(4);
Console.WriteLine(string.Join(",", c1.Items));  // 1,2,3,4！
```

struct 复制是浅拷贝，引用字段共享同一对象。**最佳实践**：struct 中的引用字段应为不可变（`IReadOnlyList<T>`）或独立副本。

### 7.5 陷阱：`ref struct` 在 async 中

```csharp
// 错误：ref struct 不能在 async 方法中跨 await 使用
async Task ProcessAsync() {
    Span<byte> buffer = stackalloc byte[1024];  // ref struct
    await SomeAsyncOperation();
    // CS4007: 'buffer' may not be used in this context
    // 因 await 后状态机恢复时 buffer 可能已失效
    UseBuffer(buffer);
}

// 正确：在 await 前完成栈操作
async Task ProcessAsync() {
    byte[] buffer = new byte[1024];  // 用堆分配
    await SomeAsyncOperation();
    UseBuffer(buffer);
}
```

### 7.6 陷阱：装箱的 Equals 性能

```csharp
// 错误：调用 object.Equals 装箱
struct Point { public int X, Y; }
Point p = new(1, 2);
object box = p;  // 装箱
bool eq = box.Equals(p);  // 又装箱 p 一次

// 正确：用 IEquatable<T>
public readonly struct Point : IEquatable<Point> {
    public int X, Y;
    public bool Equals(Point other) => X == other.X && Y == other.Y;
}
Point p1 = new(1, 2), p2 = new(1, 2);
bool eq = p1.Equals(p2);  // 无装箱
```

实现 `IEquatable<T>` 可避免装箱，性能提升 10-100 倍。

### 7.7 陷阱：`in` 参数的隐式防御拷贝

```csharp
// 反例：mutable struct + in 导致防御拷贝
struct BigMutable { public long A, B, C, D; public void Mutate() => A++; }

void Process(in BigMutable data) {
    data.Mutate();  // 编译器为防止 data 被修改，先复制一份
    // 实际复制了 32 字节
}

// 正确：用 readonly struct 或 readonly 修饰方法
readonly struct BigImmutable { public readonly long A, B, C, D; }
void Process(in BigImmutable data) {
    // 无防御拷贝
    _ = data.A;
}
```

`in` 参数对非 `readonly struct` 会触发**防御拷贝**，因为编译器无法确认方法是否修改 `this`。

### 7.8 最佳实践清单

1. **优先 `readonly struct`**：保证不可变，避免陷阱 7.1/7.2/7.7。
2. **实现 `IEquatable<T>`**：避免 `Equals` 装箱。
3. **小而专**：struct 应小于 16 字节（GC 局部性），不超过 128 字节（避免复制开销）。
4. **避免可变 struct**：返回新实例而非修改 `this`。
5. **`ref struct` 用于栈临时数据**：避免 `Span<T>` 误用逃逸。
6. **`in` 传大 struct**：但确保 struct 是 `readonly`。
7. **`record struct` 优先**：获得自动相等性、`with`、解构。
8. **泛型约束 `where T : struct`/`unmanaged`**：避免类型擦除装箱。
9. **`stackalloc` 小缓冲**：避免高频堆分配。
10. **`MemoryMarshal` 零拷贝**：互操作与高性能解析。

## 八、工程实践

### 8.1 构建与 NuGet

值类型核心在 BCL，无需额外包。但以下场景需要：

| 场景 | 包名 | 说明 |
| ---- | ---- | ---- |
| 高性能集合 | `System.Collections.Immutable` | 不可变值类型集合 |
| 内存 API | `System.Memory` (.NET Core 3+ 内置) | `Span<T>`/`Memory<T>` |
| 互操作 | `System.Runtime.CompilerServices` | `Unsafe`、`MemoryMarshal` |
| 单元测试 | `xunit` / `NUnit` | 测试 struct 相等性 |

### 8.2 性能调优

#### 8.2.1 装箱检测

使用 IL 反编译工具（如 ILSpy）或 `dotPeek` 检查 IL 中的 `box` 指令：

```csharp
// 编译后的 IL（简化）
// int x = 42;
// object o = x;
IL_0001: ldc.i4.s 42
IL_0003: stloc.0
IL_0004: ldloc.0
IL_0005: box [mscorlib]System.Int32  // 装箱！
IL_000a: stloc.1
```

可启用 `dotnet build -p:EnableAggressiveBoxingAnalysis=true`（实验性）或在 IDE 中开启装箱分析器。

#### 8.2.2 BenchmarkDotNet 实测

```csharp
using BenchmarkDotNet.Attributes;

[MemoryDiagnoser]
public class StructVsClassBenchmarks {
    [Benchmark]
    public int SumStructArray() {
        var arr = new PointS[1000];
        for (int i = 0; i < 1000; i++) arr[i] = new PointS(i, i);
        int sum = 0;
        for (int i = 0; i < 1000; i++) sum += arr[i].X + arr[i].Y;
        return sum;
    }

    [Benchmark]
    public int SumClassArray() {
        var arr = new PointC[1000];
        for (int i = 0; i < 1000; i++) arr[i] = new PointC(i, i);
        int sum = 0;
        for (int i = 0; i < 1000; i++) sum += arr[i].X + arr[i].Y;
        return sum;
    }

    [Benchmark]
    public int SumBoxedArrayList() {
        var list = new System.Collections.ArrayList(1000);
        for (int i = 0; i < 1000; i++) list.Add(i);
        int sum = 0;
        foreach (object o in list) sum += (int)o;
        return sum;
    }

    readonly struct PointS { public readonly int X, Y; public PointS(int x, int y) => (X, Y) = (x, y); }
    sealed class PointC { public readonly int X, Y; public PointC(int x, int y) => (X, Y) = (x, y); }
}
```

典型结果（.NET 8）：

| 方法 | Mean | Allocated |
| ---- | ---: | --------: |
| SumStructArray | 1.2 μs | 8 KB |
| SumClassArray | 4.8 μs | 32 KB |
| SumBoxedArrayList | 12.5 μs | 32 KB |

### 8.3 调试技巧

#### 8.3.1 查看内存布局

在 Visual Studio 中：

1. 断点处打开"局部变量"窗口；
2. 右键变量 → "在内存中查看"；
3. 查看连续字节。

或用 WinDbg + SOS：

```
!DumpStackObjects
!DumpVC /d <mt_ptr> <addr>  // 查看值类型字段
!DumpObj /d <addr>          // 查看引用类型对象
```

#### 8.3.2 检测装箱

```csharp
// 在 Debug 配置中启用装箱检测（实验性）
#if DEBUG
[Conditional("DEBUG_BOXING")]
public static void WarnBoxing(object? _) =>
    Debug.WriteLine($"[Boxing] {Environment.StackTrace}");
#endif

// 包装容易装箱的 API
public static void AddItem<T>(IList<T> list, T item) {
#if DEBUG
    if (default(T) is null && typeof(T).IsValueType)
        WarnBoxing(item);  // 仅对值类型且装箱为 object 时触发
#endif
    list.Add(item);
}
```

### 8.4 单元测试

```csharp
using Xunit;

public class PointTests {
    [Fact]
    public void Equals_ShouldCompareByValue() {
        var p1 = new Point(1, 2);
        var p2 = new Point(1, 2);
        Assert.True(p1 == p2);
        Assert.True(p1.Equals(p2));
        Assert.True(Equals(p1, p2));
    }

    [Fact]
    public void Assignment_CreatesCopy() {
        var p1 = new Point(1, 2);
        var p2 = p1;
        p2 = new Point(10, 20);
        Assert.Equal(1, p1.X);
        Assert.Equal(10, p2.X);
    }

    [Fact]
    public void GetHashCode_Stable() {
        var p = new Point(1, 2);
        Assert.Equal(p.GetHashCode(), p.GetHashCode());
    }

    [Fact]
    public void Default_HasZeroFields() {
        Point p = default;
        Assert.Equal(0, p.X);
        Assert.Equal(0, p.Y);
    }
}

public class MoneyTests {
    [Fact]
    public void Addition_SameCurrency_Works() {
        var a = new Money(100m, CurrencyCode.CNY);
        var b = new Money(50m, CurrencyCode.CNY);
        Assert.Equal(new Money(150m, CurrencyCode.CNY), a + b);
    }

    [Fact]
    public void Addition_DifferentCurrency_Throws() {
        var a = new Money(100m, CurrencyCode.CNY);
        var b = new Money(50m, CurrencyCode.USD);
        Assert.Throws<InvalidOperationException>(() => a + b);
    }
}
```

## 九、案例研究

### 9.1 .NET Runtime：`System.DateTime`

`DateTime` 是 .NET 中最经典的值类型设计：

```csharp
public readonly struct DateTime : IComparable, IFormattable, ISerializable, IComparable<DateTime>, IEquatable<DateTime> {
    private readonly ulong _dateData;  // 单字段，64 位

    // 2 位 Kind + 62 位 ticks
    private const ulong KindMask = 0xC000000000000000;
    private const ulong TicksMask = 0x3FFFFFFFFFFFFFFF;

    public DateTime(long ticks, DateTimeKind kind) {
        _dateData = ((ulong)ticks | ((ulong)kind << 62));
    }

    public long Ticks => (long)(_dateData & TicksMask);
    public DateTimeKind Kind => (DateTimeKind)(_dateData >> 62);
}
```

设计要点：
- **单字段存储**：64 位编码时间戳与 Kind，仅 8 字节；
- **`readonly struct`**：保证不可变；
- **位运算**：避免字段对齐开销；
- **显式接口实现**：保持公共 API 简洁。

### 9.2 .NET Runtime：`System.Guid`

```csharp
public readonly struct Guid : IEquatable<Guid>, IComparable<Guid> {
    private readonly int _a;
    private readonly short _b;
    private readonly short _c;
    private readonly byte _d;
    private readonly byte _e;
    private readonly byte _f;
    private readonly byte _g;
    private readonly byte _h;
    private readonly byte _i;
    private readonly byte _j;
    private readonly byte _k;
    // 共 16 字节
}
```

使用 11 个独立字段而非 `byte[16]`，避免数组堆分配，同时保持布局可预测。

### 9.3 .NET Runtime：`Span<T>` 与 `ref struct`

```csharp
public readonly ref struct Span<T> {
    private readonly ref T _reference;
    private readonly int _length;

    public Span(T[] array) {
        if (array == null) {
            this = default;
            return;
        }
        _reference = ref MemoryMarshal.GetArrayDataReference<T>(array);
        _length = array.Length;
    }

    public ref T this[int index] {
        get {
            if ((uint)index >= (uint)_length)
                ThrowHelper.ThrowIndexOutOfRangeException();
            return ref Unsafe.Add(ref _reference, index);
        }
    }
}
```

要点：
- **`ref T` 字段**：C# 7.2 引入，仅在 `ref struct` 中允许；
- **零拷贝切片**：`Slice` 返回新 `Span<T>` 共享原缓冲；
- **bounds check 消除**：JIT 在安全场景下移除检查；
- **不允许装箱**：保证栈约束，避免 GC 跟踪。

### 9.4 ASP.NET Core：`DefaultHttpContext` 的 struct 复用

ASP.NET Core 内部使用 struct 字段缓存请求元数据，避免每个请求分配对象池对象。`HttpContext` 本身是 class（共享），但 `FeatureReferences<T>` 是 struct，内联在 class 中：

```csharp
public struct FeatureReferences<TCache> {
    private int _initialized;
    private object?[]? _features;
    public TCache Cache;
    // ...
}
```

这使每个请求的 feature 查找无需堆分配。

### 9.5 EF Core：`ValueComparer` 与可变 struct

EF Core 的 `ValueComparer<T>` 处理值类型在变更跟踪中的语义：

```csharp
public class ValueComparer<T> {
    public virtual bool Equals(T a, T b) { ... }
    public virtual int GetHashCode(T obj) { ... }
    public virtual T Snapshot(T source) { ... }
}
```

可变 struct 在 EF Core 中需要自定义 `ValueComparer` 提供"深拷贝快照"，否则变更跟踪失效。这展示了 struct 在框架中的复杂性。

## 十、习题

### 10.1 选择题

**题 1**：下列代码输出是什么？

```csharp
struct Point { public int X, Y; }
var p1 = new Point { X = 1, Y = 2 };
var p2 = p1;
p2.X = 10;
Console.WriteLine($"{p1.X}, {p2.X}");
```

- A. `10, 10`
- B. `1, 10`
- C. `1, 1`
- D. `10, 1`

<details>
<summary>答案与解析</summary>

**答案：B**

`p1` 和 `p2` 是独立的值类型实例。`p2 = p1` 复制所有字段。修改 `p2.X` 不影响 `p1`。输出 `1, 10`。

</details>

**题 2**：下列哪种情况下值类型会分配在堆上？

- A. `int x = 42;`
- B. `List<int> list = new() { 1, 2, 3 };`
- C. `struct Point { public int X, Y; } Point p = new();`
- D. `int[] arr = new int[10];` 中 `arr` 变量本身

<details>
<summary>答案与解析</summary>

**答案：B**

`List<int>` 内部维护 `int[]`，数组是引用类型，分配在堆上。但数组内联存储 `int` 值（值类型字段内联），不装箱。

A 中 `x` 是局部值类型，在栈上；C 中 `p` 同理；D 中 `arr` 变量是引用（在栈上），但指向堆上的数组对象。

注意：`List<int>` 中的 `int` 不装箱，因为 `List<T>` 对值类型有编译期特化（CLR 泛型不为每个 T 生成新代码，但为值类型 T 生成专用布局）。

</details>

**题 3**：下列哪个修饰符能让 struct 字段不可被外部修改？

- A. `private`
- B. `readonly`
- C. `const`
- D. `static`

<details>
<summary>答案与解析</summary>

**答案：B**

`readonly` 修饰字段后，仅构造器能赋值，其他方法不能修改。`private` 仅限制访问，不限制修改；`const` 用于编译期常量；`static` 是类级别字段。

最佳实践是用 `readonly struct` 修饰整个 struct，使所有字段隐式 readonly。

</details>

### 10.2 填空题

**题 4**：`int` 装箱为 `object` 时，会在堆上创建一个大小为 ________ 字节的对象（64 位系统）。

<details>
<summary>答案</summary>

**24` 字节（64 位系统）`

布局：4 字节同步块 + 8 字节方法表指针 + 4 字节 int 数据 + 8 字节对齐填充 = 24 字节。

</details>

**题 5**：`ref struct` 不能被 ________ 操作，否则会违反栈约束。

<details>
<summary>答案</summary>

**装箱**（box）

`ref struct` 不能装箱为 `object`/`ValueType`/接口（C# 11 前完全不允许，C# 11+ 允许装箱为接口但有运行时限制）。装箱会让 ref struct 逃逸到堆，破坏其设计契约。

</details>

### 10.3 编程题

**题 6**：实现一个 `Vector3` 值类型，要求：

1. 三个 double 字段 X、Y、Z
2. 不可变
3. 实现值相等
4. 提供 `Length` 属性与 `Normalize` 方法
5. 支持 `+`/`-` 运算符

<details>
<summary>参考答案</summary>

```csharp
public readonly struct Vector3 : IEquatable<Vector3> {
    public double X { get; }
    public double Y { get; }
    public double Z { get; }

    public Vector3(double x, double y, double z) => (X, Y, Z) = (x, y, z);

    public static readonly Vector3 Zero = new(0, 0, 0);
    public static readonly Vector3 UnitX = new(1, 0, 0);
    public static readonly Vector3 UnitY = new(0, 1, 0);
    public static readonly Vector3 UnitZ = new(0, 0, 1);

    public double Length => Math.Sqrt(X * X + Y * Y + Z * Z);
    public double LengthSquared => X * X + Y * Y + Z * Z;

    public Vector3 Normalize() {
        double len = Length;
        return len > 0 ? new Vector3(X / len, Y / len, Z / len) : Zero;
    }

    public double Dot(Vector3 other) => X * other.X + Y * other.Y + Z * other.Z;

    public Vector3 Cross(Vector3 other) => new(
        Y * other.Z - Z * other.Y,
        Z * other.X - X * other.Z,
        X * other.Y - Y * other.X);

    public static Vector3 operator +(Vector3 a, Vector3 b) =>
        new(a.X + b.X, a.Y + b.Y, a.Z + b.Z);
    public static Vector3 operator -(Vector3 a, Vector3 b) =>
        new(a.X - b.X, a.Y - b.Y, a.Z - b.Z);
    public static Vector3 operator -(Vector3 v) => new(-v.X, -v.Y, -v.Z);
    public static Vector3 operator *(Vector3 v, double s) =>
        new(v.X * s, v.Y * s, v.Z * s);
    public static Vector3 operator *(double s, Vector3 v) => v * s;

    public bool Equals(Vector3 other) =>
        X == other.X && Y == other.Y && Z == other.Z;
    public override bool Equals([NotNullWhen(true)] object? obj) =>
        obj is Vector3 v && Equals(v);
    public override int GetHashCode() => HashCode.Combine(X, Y, Z);
    public static bool operator ==(Vector3 a, Vector3 b) => a.Equals(b);
    public static bool operator !=(Vector3 a, Vector3 b) => !a.Equals(b);

    public override string ToString() => $"({X}, {Y}, {Z})";

    public void Deconstruct(out double x, out double y, out double z) =>
        (x, y, z) = (X, Y, Z);
}
```

</details>

**题 7**：实现一个 `ref struct SpanReader`，从 `ReadOnlySpan<byte>` 读取基本类型，要求零拷贝。

<details>
<summary>参考答案</summary>

```csharp
using System.Runtime.InteropServices;

public ref struct SpanReader {
    private readonly ReadOnlySpan<byte> _span;
    private int _position;

    public SpanReader(ReadOnlySpan<byte> span) {
        _span = span;
        _position = 0;
    }

    public int Position => _position;
    public int Remaining => _span.Length - _position;
    public bool EndOfSpan => _position >= _span.Length;

    public byte ReadByte() {
        if (EndOfSpan) ThrowEndOfSpan();
        return _span[_position++];
    }

    public short ReadInt16LittleEndian() {
        if (Remaining < 2) ThrowEndOfSpan();
        short v = BinaryPrimitives.ReadInt16LittleEndian(_span[_position..]);
        _position += 2;
        return v;
    }

    public int ReadInt32LittleEndian() {
        if (Remaining < 4) ThrowEndOfSpan();
        int v = BinaryPrimitives.ReadInt32LittleEndian(_span[_position..]);
        _position += 4;
        return v;
    }

    public long ReadInt64LittleEndian() {
        if (Remaining < 8) ThrowEndOfSpan();
        long v = BinaryPrimitives.ReadInt64LittleEndian(_span[_position..]);
        _position += 8;
        return v;
    }

    public ReadOnlySpan<byte> ReadBytes(int count) {
        if (Remaining < count) ThrowEndOfSpan();
        var slice = _span.Slice(_position, count);
        _position += count;
        return slice;
    }

    public string ReadUtf8String(int length) {
        return Encoding.UTF8.GetString(ReadBytes(length));
    }

    public T ReadUnmanaged<T>() where T : unmanaged {
        int size = Unsafe.SizeOf<T>();
        if (Remaining < size) ThrowEndOfSpan();
        T value = MemoryMarshal.Read<T>(_span[_position..]);
        _position += size;
        return value;
    }

    private static void ThrowEndOfSpan() =>
        throw new InvalidOperationException("Span 已读完");
}
```

</details>

**题 8**：分析以下代码，找出 3 个性能问题并修正：

```csharp
public struct BigData {
    public long A, B, C, D, E, F, G, H;  // 64 字节
    public List<int> Items;
}

public class Processor {
    public long SumItems(BigData data) {
        long sum = 0;
        foreach (var i in data.Items) sum += i;
        return sum;
    }

    public BigData Update(BigData data) {
        data.A += 1;
        return data;
    }

    public Dictionary<BigData, int> BuildDict(BigData[] arr) {
        var dict = new Dictionary<BigData, int>();
        for (int i = 0; i < arr.Length; i++) dict[arr[i]] = i;
        return dict;
    }
}
```

<details>
<summary>参考答案</summary>

问题与修正：

1. **struct 过大且包含引用字段**：64+8=72 字节，每次传递都复制大量数据。**修正**：改为 `class` 或拆分为 `readonly struct`（仅数据）+ `class`（行为）。

2. **可变 struct + 修改 `this`**：`Update` 修改传入的 struct（虽然是副本），违反不可变原则。**修正**：用 `readonly struct`，返回新实例：
```csharp
public readonly struct BigData {
    public long A { get; init; }
    // ...
    public BigData WithA(long newA) => this with { A = newA };
}
```

3. **可变 struct 作字典键**：`BigData` 可变，作键会导致哈希变化、查找失败。**修正**：改为 `readonly struct` 并实现 `IEquatable<BigData>`，或改用 `record struct` 自动获得相等性。

4. **额外问题**：`SumItems` 的参数应改为 `in BigData` 避免复制 72 字节。但若 struct 非 readonly 会触发防御拷贝，所以必须先改为 readonly。

修正后：
```csharp
public readonly record struct BigData(long A, long B, long C, long D,
    long E, long F, long G, long H, IReadOnlyList<int> Items);

public class Processor {
    public long SumItems(in BigData data) {
        long sum = 0;
        foreach (var i in data.Items) sum += i;
        return sum;
    }

    public BigData IncrementA(in BigData data) => data with { A = data.A + 1 };
}
```

</details>

### 10.4 思考题

**题 9**：为何 .NET 设计 `System.ValueType` 本身是引用类型？这一设计有何优劣？

<details>
<summary>参考答案</summary>

**优势**：
1. **统一类型系统**：所有类型最终都可视为 `object`，便于反射、API 设计（如 `object.Equals(object)`）。
2. **装箱的优雅**：值类型通过继承 `ValueType` 自动获得装箱为 `object` 的能力，无需语言特殊机制。
3. **运行时统一**：CLR 的方法表、GC 等基础设施只需处理 `object` 子类，简化实现。

**劣势**：
1. **概念混淆**：初学者容易以为 `ValueType` 是值类型。
2. **装箱不可避免**：调用 `ValueType` 上的方法（如 `ToString()`）会装箱，需要 `IEquatable<T>` 等接口规避。
3. **多态开销**：值类型通过接口多态时仍需装箱。

替代设计如 Swift 直接区分 value/reference，无统一基类，避免装箱但失去一些统一性。

</details>

**题 10**：在微服务架构中，跨服务传递值类型（如 `Money`、`Point`）应如何处理？请列出 3 种策略并权衡。

<details>
<summary>参考答案</summary>

1. **DTO 折叠为引用类型**：跨服务边界用 `record class` 表示相同数据，避免序列化器处理 struct 的复杂性。
   - 优点：序列化器（System.Text.Json、Protobuf）对 class 支持更好。
   - 缺点：服务内部仍需在 struct 与 DTO 间映射。

2. **struct 直接序列化**：用 `System.Text.Json` 的 source generator 支持 struct。
   - 优点：零映射开销，类型一致。
   - 缺点：部分序列化器对 struct 支持不全（如默认构造器、`init` 属性）。

3. **二进制协议 + MemoryMarshal**：对性能敏感场景，定义二进制协议，直接 `MemoryMarshal.Read<T>`。
   - 优点：极快，零分配。
   - 缺点：版本兼容性差，需固定布局。

**推荐**：默认用策略 1（DTO 折叠），热点路径用策略 3（如游戏服务器、金融行情）。

</details>

## 十一、参考文献

[1] Hejlsberg, A., Torgersen, M., Wiltamuth, S., and Golde, P. 2022. *The C# Programming Language* (4th ed.). Addison-Wesley Professional. ISBN: 978-0-321-74176-9.

[2] ECMA International. 2023. *ECMA-334: The C# Language Specification* (6th ed.). ECMA, Geneva. https://www.ecma-international.org/wp-content/uploads/ECMA-334_6th_edition_december_2022.pdf

[3] ECMA International. 2023. *ECMA-335: Common Language Infrastructure (CLI)* (6th ed.). ECMA, Geneva. https://www.ecma-international.org/wp-content/uploads/ECMA-335_6th_edition_december_2022.pdf

[4] Kennedy, A. and Syme, D. 2001. Design and implementation of generics for the .NET Common Language Runtime. In *Proceedings of the 2001 ACM SIGPLAN Conference on Programming Language Design and Implementation* (PLDI '01). ACM, New York, NY, 1–12. DOI: https://doi.org/10.1145/378795.378797

[5] Torgersen, M., Wiltamuth, S., and Hejlsberg, A. 2004. C# generics vs. C++ templates, Java generics. Microsoft Developer Network.

[6] Botta, A. and Russo, D. 2018. The Span<T> and Memory<T> papers. Microsoft .NET Blog.

[7] Skeet, J. 2019. *C# in Depth* (4th ed.). Manning Publications. ISBN: 978-1-61729-453-2.

[8] Albahari, J. and Albahari, B. 2022. *C# 10 in a Nutshell: The Definitive Reference*. O'Reilly Media. ISBN: 978-1-0981-2195-2.

[9] Wagner, B. 2024. *Effective C#* (3rd ed.). Addison-Wesley Professional.

[10] Microsoft. 2024. *Memory and Span-related types*. .NET documentation. https://learn.microsoft.com/dotnet/standard/memory-and-spans/

[11] Microsoft. 2024. *ref struct types*. C# language reference. https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/ref-struct

[12] Lippert, E. 2011. *What's the difference between struct and class?* Fabulous Adventures in Coding blog.

[13] Abadi, M. and Cardelli, L. 1996. *A Theory of Objects*. Springer-Verlag, New York. ISBN: 978-0-387-94775-4. (类型系统理论基础)

[14] Smith, C. 2015. *Swift's value types*. Apple WWDC session 414.

[15] Gafter, N. and Bloch, J. 2006. *Making the Most of Java 5: Generics and Annotations*. JavaOne. (对比 C# 与 Java 泛型实现)

## 十二、延伸阅读

### 12.1 书籍

- Jon Skeet, *C# in Depth* 第 4 版：第 2 章深入类型系统。
- Joseph Albahari, *C# 10 in a Nutshell*：第 3-4 章。
- Mark Michaelis, *Essential C# 8.0*：值类型章节。
- Adam Freeman, *Pro C# 10 with .NET 6*：内存模型章节。

### 12.2 论文

- Kennedy & Syme, "Design and implementation of generics for the .NET CLR"（PLDI 2001）：CLR 泛型设计奠基论文。
- Torgersen et al., "The Expression Tree v2 Specification"：表达式树与值类型的交互。

### 12.3 在线资源

- .NET 官方文档：<https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/value-types>
- Span<T> 指南：<https://learn.microsoft.com/dotnet/standard/memory-and-spans/>
- Eric Lippert 博客系列："What is the difference between struct and class?"
- Stephen Toub 性能博客：.NET 8/9 中值类型的 SIMD 优化。
- Joe Duffy 博客："High-performance C# struct design"。

### 12.4 相关课程

- MIT 6.102 *Software Construction*：抽象数据类型。
- Stanford CS193 *C# and .NET*：值类型与引用类型。
- CMU 15-410 *Operating Systems*：内存模型与栈/堆。
- Berkeley CS164 *Programming Languages and Compilers*：类型系统。

### 12.5 进阶主题

- **`ref` 字段（C# 11）**：`ref struct` 内部的 `ref T` 字段。
- **`InterpolatedStringHandler`**：值类型实现的字符串插值优化。
- **`Span<T>` vs `Memory<T>`**：同步与异步场景的选择。
- **`FrozenDictionary<T>`**：基于值类型布局优化的只读字典。
- **Native AOT 与值类型**：AOT 编译时值类型的特殊化优化。
- **`DefaultInterpolatedStringHandler`**：.NET 6+ 的零分配字符串插值。
