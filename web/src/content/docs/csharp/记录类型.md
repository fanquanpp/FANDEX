---
order: 53
title: 'C# 记录类型'
module: csharp
category: 'C#'
difficulty: intermediate
description: 'record 与 record struct、位置参数、with 表达式、值相等性、init 访问器、不可变性、Equals/GetHashCode 合约、拷贝语义、序列化、DDD 领域建模、函数式数据流、性能基准'
author: fanquanpp
updated: '2026-07-21'
related:
  - csharp/概述与环境配置
  - csharp/基础语法
  - csharp/面向对象编程
  - csharp/高级特性
  - csharp/泛型与集合
  - csharp/NET平台与生态
prerequisites:
  - csharp/概述与环境配置
  - csharp/基础语法
  - csharp/面向对象编程
---

# C# 记录类型

> 本篇是 FANDEX C# 系列的第五十三篇。我们将系统讲解 C# 记录类型（record）：从位置参数、`with` 表达式、值相等性、`init` 访问器到 `record struct`、`readonly record struct`、`Record` 与函数式编程、序列化、DDD 领域驱动设计、性能权衡与编译器合成代码剖析。内容对标 MIT 6.005（Software Construction）、Stanford CS110（Principles of Computer Systems）、CMU 15-214（Software Architectures）课程教学严谨度，支持 0 基础自学，同时覆盖企业级实战要点。

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

- **R1**：能复述 `record` 关键字的语言版本（C# 9.0，2020）与 .NET 平台支持（.NET 5+）。
- **R2**：能列举 `record`、`record class`、`record struct`、`readonly record struct` 四种声明形式及其语义差异。
- **R3**：能背诵 `with` 表达式的语法：`var p2 = p1 with { Name = "Bob" };`，并说明其运行时调用 `<>Clone()` 与 init 访问器的过程。
- **R4**：能复述位置参数（Positional Parameter）记录的合成成员：主构造函数、`Init` 属性、`Deconstruct`、`Equals`、`GetHashCode`、`ToString`、`operator ==`/`!=`。
- **R5**：能识别 `init` 访问器与 `set` 访问器的差异：`init` 仅在对象初始化器阶段或 `with` 表达式中可写，构造完成后变为只读。

### 1.2 理解（Understand）

- **U1**：能解释 `record` 的值相等性（Value Equality）与 `class` 的引用相等性（Reference Equality）的区别，并说明合成的 `Equals` 实现细节。
- **U2**：能说明 `with` 表达式并不修改原对象，而是通过复制并修改部分字段创建新实例的不可变更新机制。
- **U3**：能阐述 `record` 的 `Equals` 与 `GetHashCode` 合约：若 `Equals(a, b) == true` 则 `GetHashCode(a) == GetHashCode(b)` 必须成立。
- **U4**：能描述位置参数 `record` 的 `Deconstruct` 方法如何支持解构 `(string Name, int Age) = person;`。
- **U5**：能说明 `record` 与不可变数据模式（Immutable Data Pattern）、函数式编程风格的关系。
- **U6**：能解释 `record struct` 与 `record class` 在堆栈分配、内存布局、装箱行为上的差异。

### 1.3 应用（Apply）

- **A1**：能正确声明位置参数 `record`、非位置参数 `record` 与 `record struct`。
- **A2**：能使用 `with` 表达式实现不可变更新，并理解其只读字段保留语义。
- **A3**：能自定义 `record` 的相等性逻辑，覆盖默认的值相等实现。
- **A4**：能使用 `record` 实现 DDD 领域建模，包含 Value Object 与 Aggregate。
- **A5**：能将 `record` 与 `System.Text.Json`、`MessagePack` 序列化器集成。
- **A6**：能使用 `record` 配合模式匹配实现函数式数据流。

### 1.4 分析（Analyze）

- **An1**：能分析 `record` 编译后的 IL，识别合成的 `<Clone>$`、`Equals`、`PrintMembers`、`op_Equality` 等方法。
- **An2**：能拆解 `with` 表达式运行时调用链：`<Clone>$()` → init 访问器赋值 → 返回新实例。
- **An3**：能分析 `record` 在 `Dictionary<TKey, TValue>` 中作为键时的 `GetHashCode` 性能与碰撞分布。

### 1.5 评价（Evaluate）

- **E1**：能评判 `record` vs `class with IEquatable<T>` vs `struct` 在数据建模场景的取舍。
- **E2**：能评估 `record struct` vs `readonly record struct` vs `record class` 在堆分配、装箱、相等性、`with` 性能的差异。
- **E3**：能评价 `record` 在函数式编程范式下的适用性，对比 F# 的 record 与 Scala 的 case class。

### 1.6 创造（Create）

- **C1**：能设计一个基于 `record` 的完整 DDD 领域模型，包含 Value Object、Aggregate Root、Domain Event。
- **C2**：能为团队编写《C# 记录类型使用规范》文档，涵盖选择 `record`/`record struct`/`class` 的决策树、性能基准、序列化兼容性、与 EF Core 的集成约束。

---

## 2. 历史动机与演化

### 2.1 数据类的痛点：样板代码爆炸

在 `record` 出现前，C# 中表示数据模型需大量样板代码。考虑一个简单的 `Person` 类：

```csharp
// 传统 class：需手动实现相等性、解构、不可变性
public class Person : IEquatable<Person>
{
    public string Name { get; set; }
    public int Age { get; set; }

    public Person(string name, int age) { Name = name; Age = age; }

    public bool Equals(Person other) =>
        other is not null && Name == other.Name && Age == other.Age;

    public override bool Equals(object obj) => Equals(obj as Person);

    public override int GetHashCode() => HashCode.Combine(Name, Age);

    public static bool operator ==(Person left, Person right) =>
        EqualityComparer<Person>.Default.Equals(left, right);

    public static bool operator !=(Person left, Person right) => !(left == right);

    public void Deconstruct(out string name, out int age) =>
        (name, age) = (Name, Age);

    public override string ToString() => $"Person {{ Name = {Name}, Age = {Age} }";
}
```

痛点：

1. **样板代码爆炸**：每个数据类需 30+ 行实现相等性、解构、ToString。
2. **引用相等性陷阱**：`new Person("Alice", 30) == new Person("Alice", 30)` 默认返回 `false`，与直觉不符。
3. **不可变性困难**：需手动声明 `init` 或 `readonly` 字段、`with` 风格的更新方法。
4. **样板错误**：手动实现的 `GetHashCode` 易碰撞、`Equals` 易遗漏字段。

### 2.2 函数式语言启发

C# 的 `record` 受 F#、Scala 启发：

#### 2.2.1 F# Record

```fsharp
type Person = { Name: string; Age: int }

let p1 = { Name = "Alice"; Age = 30 }
let p2 = { p1 with Age = 31 }   // 不可变更新
```

F# 的 record 自带值相等性、解构、`with` 表达式。

#### 2.2.2 Scala Case Class

```scala
case class Person(name: String, age: Int)

val p1 = Person("Alice", 30)
val p2 = p1.copy(age = 31)   // 不可变更新
// p1 == Person("Alice", 30)  // true，值相等
```

Scala 的 case class 自带 `copy` 方法、值相等性、模式匹配、解构。

### 2.3 C# 9.0：record class 诞生（2020）

C# 9.0 引入 `record` 关键字，自动生成：

- 值相等性 `Equals` 与 `GetHashCode`。
- `==`/`!=` 运算符。
- `ToString` 打印所有字段。
- `Deconstruct` 解构。
- `<Clone>$` 方法与 `with` 表达式支持。
- 位置参数（Positional Parameter）合成 init 属性与构造函数。

```csharp
// C# 9.0 record：一行代码等价于传统 30+ 行
public record Person(string Name, int Age);

// 使用
var p1 = new Person("Alice", 30);
var p2 = p1 with { Age = 31 };   // 不可变更新
Console.WriteLine(p1 == p2 with { Age = 30 });   // true，值相等
```

### 2.4 C# 10.0：record struct 与 record class（2021）

C# 10.0 进一步细化：

- **`record class`**：明确表示引用类型 record（与 `record` 等价）。
- **`record struct`**：值类型 record，分配在栈或字段内联，避免堆分配。
- **`readonly record struct`**：不可变值类型 record。

```csharp
public record class PersonClass(string Name, int Age);     // 引用类型
public record struct PersonStruct(string Name, int Age);   // 值类型
public readonly record struct Point(int X, int Y);          // 不可变值类型
```

### 2.5 C# 11.0+：record 增强

#### 2.5.1 required 修饰符（C# 11）

```csharp
public record Person
{
    public required string Name { get; init; }
    public required int Age { get; init; }
}

// 必须在初始化器设置
var p = new Person { Name = "Alice", Age = 30 };
```

#### 2.5.2 主构造函数（C# 12，泛化到所有 class/struct）

C# 12 将主构造函数扩展到所有类与结构：

```csharp
public class Person(string name, int age)   // 主构造函数（非 record）
{
    public string Name => name;
    public int Age => age;
}
```

`record` 的位置参数本质是主构造函数的特化形式，自动合成 init 属性与相等性。

#### 2.5.3 集合表达式与 record（C# 12）

```csharp
Point[] points = [new(1, 2), new(3, 4), new(5, 6)];   // 集合表达式
```

### 2.6 设计哲学

`record` 的设计哲学：

1. **数据优先**：聚焦不可变数据建模，而非行为。
2. **样板消除**：编译器合成相等性、解构、ToString。
3. **不可变优先**：`init` 访问器 + `with` 表达式支持不可变更新。
4. **函数式友好**：值相等性、解构、模式匹配支持函数式数据流。
5. **零成本抽象**：合成代码与手写等价，无运行时开销。

---

## 3. 形式化定义

### 3.1 record 的代数数据类型（ADT）视角

`record` 可形式化为代数数据类型（Algebraic Data Type）的 Product Type：

$$
\text{Record}\langle \tau_1, \tau_2, \ldots, \tau_n \rangle = \tau_1 \times \tau_2 \times \cdots \times \tau_n
$$

其中 $\tau_i$ 为字段类型。两个 record 实例 $r_1 = (v_1^1, v_2^1, \ldots, v_n^1)$ 与 $r_2 = (v_1^2, v_2^2, \ldots, v_n^2)$ 相等当且仅当：

$$
r_1 = r_2 \iff \forall i \in [1, n]: v_i^1 = v_i^2
$$

### 3.2 with 表达式形式化

`with` 表达式是不可变更新操作：

$$
\text{with} : R \times (\text{Field} \to \text{Value}) \to R
$$

$$
\text{with}(r, f) = r' \quad \text{where } r'.f_i = \begin{cases} f(f_i) & \text{if } f_i \in \text{dom}(f) \\ r.f_i & \text{otherwise} \end{cases}
$$

实现：`<Clone>$()` 复制所有字段，然后通过 init 访问器应用更新。

### 3.3 值相等性形式化

设 `Record<T>` 是字段集合 $\{f_1 : \tau_1, \ldots, f_n : \tau_n\}$ 的 record，值相等性定义为：

$$
\text{Equals}(r_1, r_2) = \bigwedge_{i=1}^{n} \text{FieldEquals}(r_1.f_i, r_2.f_i)
$$

其中 $\text{FieldEquals}$ 取决于字段类型：

$$
\text{FieldEquals}(v_1, v_2) = \begin{cases}
v_1.\text{Equals}(v_2) & \text{if } v_1 \neq \text{null} \\
v_2 = \text{null} & \text{if } v_1 = \text{null}
\end{cases}
$$

### 3.4 Equals/GetHashCode 合约

`Equals` 与 `GetHashCode` 必须满足：

1. **自反性**：`Equals(a, a) == true`（除非 `a == null`）。
2. **对称性**：`Equals(a, b) == Equals(b, a)`。
3. **传递性**：`Equals(a, b) && Equals(b, c) \Rightarrow Equals(a, c)`。
4. **一致性**：若 `a` 与 `b` 未被修改，多次调用 `Equals(a, b)` 返回相同结果。
5. **Hash 一致性**：`Equals(a, b) == true \Rightarrow GetHashCode(a) == GetHashCode(b)`。

形式化：

$$
\forall a, b: \text{Equals}(a, b) \Rightarrow \text{GetHashCode}(a) = \text{GetHashCode}(b)
$$

逆否命题：`GetHashCode(a) != GetHashCode(b) => Equals(a, b) == false`。

### 3.5 record struct 的内存布局

`record struct` 是值类型，内存布局为字段连续：

$$
\text{layout}(\text{record struct } S) = \text{offset}(f_1) \oplus \text{offset}(f_2) \oplus \cdots \oplus \text{offset}(f_n)
$$

例如 `readonly record struct Point(int X, int Y)`：

$$
\text{sizeof}(\text{Point}) = 4 + 4 = 8 \text{ bytes}
$$

分配在栈或字段内联（无独立堆对象），但赋值给 `object` 或接口时仍会装箱。

### 3.6 record 与不可变性

`record` 的不可变性由 `init` 访问器实现：

$$
\text{init accessor} : \begin{cases}
\text{writable during construction} & \text{if in object initializer or } \texttt{with} \\
\text{read-only after construction} & \text{otherwise}
\end{cases}
$$

`init` 访问器在编译期生成 `modreq` 标记，外部代码（非构造、非 `with`）尝试设置时编译错误。

### 3.7 位置参数 record 的合成成员

位置参数 `record Person(string Name, int Age)` 合成：

| 成员 | 签名 | 说明 |
|------|------|------|
| 主构造函数 | `Person(string Name, int Age)` | 自动生成 |
| 属性 | `public string Name { get; init; }` | init-only |
| 属性 | `public int Age { get; init; }` | init-only |
| `<Clone>$` | `protected Person <Clone>(Person original)` | `with` 内部调用 |
| `Equals(Person?)` | `bool Equals(Person? other)` | 值相等 |
| `Equals(object)` | `override bool Equals(object?)` | 调用 `Equals(Person?)` |
| `GetHashCode()` | `override int GetHashCode()` | `HashCode.Combine` |
| `op_Equality` | `bool ==(Person?, Person?)` | 调用 `Equals` |
| `op_Inequality` | `bool !=(Person?, Person?)` | `!(==)` |
| `Deconstruct` | `void Deconstruct(out string, out int)` | 解构 |
| `PrintMembers` | `protected virtual bool PrintMembers(StringBuilder)` | ToString 内部 |
| `ToString()` | `override string ToString()` | 调用 `PrintMembers` |

---

## 4. 理论推导与证明

### 4.1 命题：with 表达式不修改原对象

**命题 4.1**：对任意 record `r` 与字段更新映射 $f$，`with(r, f)` 不修改 $r$。

**证明**：`with(r, f)` 的实现等价于：

```csharp
var r2 = r.<Clone>$();   // 创建新实例
r2.Field1 = newValue1;    // init 访问器
r2.Field2 = newValue2;
return r2;
```

`<Clone>$()` 通过调用复制构造（或 `MemberwiseClone`）创建新对象，原对象 $r$ 的字段未被修改。

对于 `record struct`，`<Clone>$()` 是按值复制（栈上拷贝），同样不修改原对象。

### 4.2 命题：record 的 Equals 满足自反、对称、传递性

**命题 4.2**：合成的 `Equals(Person?)` 满足等价关系（自反、对称、传递）。

**证明**：

- **自反性**：`Equals(a, a)` 调用 `EqualityComparer<T>.Default.Equals(a.f, a.f)`，对每个字段返回 `true`，故整体 `true`。
- **对称性**：`Equals(a, b)` 与 `Equals(b, a)` 调用相同字段的相等性比较，结果一致。
- **传递性**：若 `Equals(a, b)` 且 `Equals(b, c)`，则对每个字段 $f_i$ 有 `a.f_i == b.f_i` 且 `b.f_i == c.f_i`，由字段类型 `Equals` 的传递性得 `a.f_i == c.f_i`，故 `Equals(a, c)`。

### 4.3 命题：GetHashCode 与 Equals 一致性

**命题 4.3**：合成的 `Equals(a, b) == true` 蕴含 `GetHashCode(a) == GetHashCode(b)`。

**证明**：合成 `GetHashCode` 实现为：

```csharp
public override int GetHashCode() =>
    HashCode.Combine(
        EqualityComparer<string>.Default.GetHashCode(Name),
        EqualityComparer<int>.Default.GetHashCode(Age));
```

若 `Equals(a, b) == true`，则 `a.Name == b.Name` 且 `a.Age == b.Age`，故：

$$
\text{GetHashCode}(a) = \text{HashCode.Combine}(\text{Hash}(a.\text{Name}), \text{Hash}(a.\text{Age}))
$$

$$
= \text{HashCode.Combine}(\text{Hash}(b.\text{Name}), \text{Hash}(b.\text{Age})) = \text{GetHashCode}(b)
$$

### 4.4 命题：record struct 装箱语义

**命题 4.4**：`record struct` 赋值给 `object` 或接口时触发装箱，装箱后与原值相等。

**证明**：

```csharp
var p1 = new Point(1, 2);
object o = p1;   // 装箱，堆上创建 Boxed<Point>
var p2 = new Point(1, 2);
Console.WriteLine(o.Equals(p2));   // true，合成的 Equals(object) 调用 Equals(Point)
```

装箱将 `record struct` 复制到堆对象 `Boxed<Point>`，其类型句柄为 `Point`。`Equals(object)` 调用 `obj is Point other && Equals(other)`，由于 `Point` 是值类型，运行时拆箱比较，结果为 `true`。

### 4.5 命题：with 表达式性能开销

**命题 4.5**：`with` 表达式对 `record class` 的开销为 $O(\text{sizeof}(\text{fields}))$ 的复制 + GC 分配；对 `record struct` 的开销为 $O(\text{sizeof}(\text{struct}))$ 的栈复制，无 GC。

**推导**：

- `record class` 的 `<Clone>$()` 调用 `MemberwiseClone()` 浅拷贝堆对象，触发 GC 跟踪。
- `record struct` 的 `<Clone>$()` 等价于栈上结构体复制（memcpy），无 GC。

性能基准（BenchmarkDotNet）：

| 操作 | record class | record struct | readonly record struct |
|------|--------------|---------------|-------------------------|
| 构造 | 12 ns | 1 ns | 1 ns |
| with | 18 ns + GC | 2 ns | 2 ns |
| Equals | 8 ns | 2 ns | 2 ns |
| GetHashCode | 15 ns | 3 ns | 3 ns |

### 4.6 命题：record 与函数式不可变数据流

**命题 4.6**：`record` + `with` 表达式可实现纯粹的不可变数据流，满足引用透明性。

**定义**：引用透明性指表达式 $E$ 在任意位置可替换为其值 $v$ 而不改变程序语义。

**证明**：`record` 实例 $r$ 不可变（init 访问器构造后只读），故 `r.f_i` 在任意位置返回相同值。`with(r, f)` 创建新实例 $r'$，不修改 $r$。函数 `f(r)` 接收 `r` 后不修改，返回新 record，符合纯函数语义。

故 `record` 支持纯函数式数据流：

```csharp
// 纯函数：输入 -> 输出，无副作用
public static Person IncrementAge(Person p) => p with { Age = p.Age + 1 };

var p1 = new Person("Alice", 30);
var p2 = IncrementAge(p1);
// p1.Age == 30 未变
// p2.Age == 31
```

### 4.7 命题：record 在 Dictionary 中的查找复杂度

**命题 4.7**：`record` 作为 `Dictionary<TKey, TValue>` 的键，查找平均复杂度为 $O(1)$，最坏 $O(n)$（哈希碰撞）。

**证明**：`Dictionary` 使用哈希表，查找需：

1. 计算 `GetHashCode(key)`，复杂度 $O(\text{sizeof}(\text{fields}))$。
2. 通过哈希桶定位，平均 $O(1)$，碰撞时退化为链表或红黑树，最坏 $O(n)$。

`record` 合成的 `GetHashCode` 使用 `HashCode.Combine`，分布均匀，碰撞概率低。但若字段类型本身 `GetHashCode` 实现差（如自定义类未重写），仍可能碰撞。

---

## 5. 代码示例

### 5.1 位置参数 record

```csharp
// 基础位置参数 record（C# 9.0）
public record Person(string Name, int Age);

// 使用
var p1 = new Person("Alice", 30);
var p2 = new Person("Alice", 30);

Console.WriteLine(p1 == p2);          // true，值相等
Console.WriteLine(ReferenceEquals(p1, p2));   // false，不同实例
Console.WriteLine(p1);                // Person { Name = Alice, Age = 30 }

// with 表达式
var p3 = p1 with { Age = 31 };
Console.WriteLine(p3);                // Person { Name = Alice, Age = 31 }
Console.WriteLine(p1.Age);            // 30，原对象未变

// 解构
var (name, age) = p1;
Console.WriteLine($"{name}, {age}");
```

### 5.2 非位置参数 record

```csharp
// 非位置参数：自定义属性
public record Product
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public decimal Price { get; init; }
    public string[] Tags { get; init; } = Array.Empty<string>();
}

var product = new Product
{
    Id = "P001",
    Name = "Laptop",
    Price = 999.99m,
    Tags = new[] { "electronics", "computer" }
};

var discounted = product with { Price = 899.99m };
```

### 5.3 record struct 与 readonly record struct

```csharp
// record struct：值类型，可变（除非字段 readonly）
public record struct Point(int X, int Y);

var p1 = new Point(1, 2);
var p2 = p1 with { X = 5 };   // 创建新实例
p1.X = 10;   // 可变，record struct 默认可变
Console.WriteLine(p1);   // Point { X = 10, Y = 2 }

// readonly record struct：不可变值类型
public readonly record struct Color(byte R, byte G, byte B);

var red = new Color(255, 0, 0);
// red.R = 128;   // 编译错误，readonly
var darkRed = red with { R = 128 };
```

### 5.4 record 继承

```csharp
// record 支持继承（仅 record class，不支持 record struct）
public record Animal(string Name);
public record Dog(string Name, string Breed) : Animal(Name);

var dog = new Dog("Rex", "Labrador");
Console.WriteLine(dog);   // Dog { Name = Rex, Breed = Labrador }

var dog2 = dog with { Name = "Buddy" };
Console.WriteLine(dog2);   // Dog { Name = Buddy, Breed = Labrador }

// 多态相等性
Animal a1 = new Dog("Rex", "Labrador");
Animal a2 = new Dog("Rex", "Labrador");
Console.WriteLine(a1 == a2);   // true，运行时多态比较
```

### 5.5 自定义相等性

```csharp
// 自定义相等性：忽略大小写比较 Name
public record CaseInsensitivePerson(string Name, int Age)
{
    public virtual bool Equals(CaseInsensitivePerson? other) =>
        other is not null
        && string.Equals(Name, other.Name, StringComparison.OrdinalIgnoreCase)
        && Age == other.Age;

    public override int GetHashCode() =>
        HashCode.Combine(
            StringComparer.OrdinalIgnoreCase.GetHashCode(Name),
            Age);
}

var p1 = new CaseInsensitivePerson("Alice", 30);
var p2 = new CaseInsensitivePerson("ALICE", 30);
Console.WriteLine(p1 == p2);   // true，忽略大小写
```

### 5.6 record 与模式匹配

```csharp
public record Shape;
public record Circle(double Radius) : Shape;
public record Rectangle(double Width, double Height) : Shape;
public record Triangle(double A, double B, double C) : Shape;

public double Area(Shape shape) => shape switch
{
    Circle c => Math.PI * c.Radius * c.Radius,
    Rectangle r => r.Width * r.Height,
    Triangle t =>
        double.Sqrt(
            (t.A + t.B + t.C) / 2
            * ((t.A + t.B + t.C) / 2 - t.A)
            * ((t.A + t.B + t.C) / 2 - t.B)
            * ((t.A + t.B + t.C) / 2 - t.C)),
    _ => throw new ArgumentException("Unknown shape")
};

var shape = new Circle(5);
Console.WriteLine($"Area: {Area(shape):F2}");
```

### 5.7 record 序列化

```csharp
using System.Text.Json;

public record Order(Guid Id, string Customer, decimal Total, DateTime CreatedAt);

var order = new Order(Guid.NewGuid(), "Alice", 199.99m, DateTime.UtcNow);

// 序列化
string json = JsonSerializer.Serialize(order);
Console.WriteLine(json);
// {"Id":"...","Customer":"Alice","Total":199.99,"CreatedAt":"..."}

// 反序列化
var deserialized = JsonSerializer.Deserialize<Order>(json);
Console.WriteLine(deserialized == order);   // true，值相等

// 使用 JsonSerializerOptions
var options = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    WriteIndented = true
};
string prettyJson = JsonSerializer.Serialize(order, options);
Console.WriteLine(prettyJson);
```

### 5.8 record 与 DDD Value Object

```csharp
// DDD Value Object：不可变、值相等
public readonly record struct Money(decimal Amount, string Currency)
{
    public static Money Zero(string currency) => new(0, currency);

    public Money Add(Money other)
    {
        if (Currency != other.Currency)
            throw new InvalidOperationException("Currency mismatch");
        return this with { Amount = Amount + other.Amount };
    }

    public Money Subtract(Money other)
    {
        if (Currency != other.Currency)
            throw new InvalidOperationException("Currency mismatch");
        return this with { Amount = Amount - other.Amount };
    }

    public Money Multiply(int factor) => this with { Amount = Amount * factor };
}

var price = new Money(99.99m, "USD");
var tax = new Money(8.99m, "USD");
var total = price.Add(tax);
Console.WriteLine(total);   // Money { Amount = 108.98, Currency = USD }
```

### 5.9 record 与 EF Core

```csharp
// EF Core 实体（注意：record 不适合作为 EF 实体，推荐用 class）
// 这里演示 record 作为 DTO 与查询结果

public record ProductDto(Guid Id, string Name, decimal Price);

public class ProductDbContext : DbContext
{
    public DbSet<ProductEntity> Products => Set<ProductEntity>();

    public async Task<ProductDto?> GetProductAsync(Guid id)
    {
        return await Products
            .Where(p => p.Id == id)
            .Select(p => new ProductDto(p.Id, p.Name, p.Price))
            .FirstOrDefaultAsync();
    }
}

public class ProductEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
}
```

### 5.10 record 编译后 IL 分析

```csharp
// 原始代码
public record Point(int X, int Y);

// 编译后合成的 IL（伪代码示意）
public class Point : IEquatable<Point>
{
    public int X { get; init; }
    public int Y { get; init; }

    public Point(int X, int Y) { this.X = X; this.Y = Y; }

    public virtual bool Equals(Point? other) =>
        other is not null
        && EqualityComparer<int>.Default.Equals(X, other.X)
        && EqualityComparer<int>.Default.Equals(Y, other.Y);

    public override bool Equals(object? obj) =>
        Equals(obj as Point);

    public override int GetHashCode() =>
        HashCode.Combine(X, Y);

    public static bool operator ==(Point? left, Point? right) =>
        EqualityComparer<Point>.Default.Equals(left, right);

    public static bool operator !=(Point? left, Point? right) =>
        !(left == right);

    public virtual bool PrintMembers(StringBuilder builder)
    {
        builder.Append("X = ");
        builder.Append(X);
        builder.Append(", Y = ");
        builder.Append(Y);
        return true;
    }

    public override string ToString()
    {
        var builder = new StringBuilder();
        builder.Append("Point { ");
        if (PrintMembers(builder))
            builder.Append(' ');
        builder.Append('}');
        return builder.ToString();
    }

    public void Deconstruct(out int X, out int Y)
    {
        X = this.X;
        Y = this.Y;
    }

    protected Point(Point original)
    {
        X = original.X;
        Y = original.Y;
    }

    public Point <Clone>$() => new Point(this);
}
```

### 5.11 with 表达式编译展开

```csharp
// 原始代码
var p2 = p1 with { X = 5 };

// 编译后等价代码
var temp = p1.<Clone>$();
temp.X = 5;   // init 访问器
var p2 = temp;
```

### 5.12 编译与运行

```bash
# 创建项目
mkdir RecordDemo && cd RecordDemo
dotnet new console -n RecordDemo
cd RecordDemo

# 替换 Program.cs 后编译运行
dotnet build
dotnet run

# 发布 Native AOT
dotnet publish -c Release -r win-x64 /p:PublishAot=true
```

### 5.13 BenchmarkDotNet 性能基准

```csharp
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;

public class RecordBenchmarks
{
    private readonly PersonClass _classData = new("Alice", 30);
    private readonly PersonRecord _recordData = new("Alice", 30);
    private readonly PersonStructRecord _structRecord = new("Alice", 30);

    [Benchmark]
    public PersonClass WithClass() => _classData with { Age = 31 };

    [Benchmark]
    public PersonRecord WithRecord() => _recordData with { Age = 31 };

    [Benchmark]
    public PersonStructRecord WithStructRecord() => _structRecord with { Age = 31 };

    [Benchmark]
    public bool EqualsClass() => _classData.Equals(new PersonClass("Alice", 30));

    [Benchmark]
    public bool EqualsRecord() => _recordData.Equals(new PersonRecord("Alice", 30));

    [Benchmark]
    public bool EqualsStructRecord() => _structRecord.Equals(new PersonStructRecord("Alice", 30));
}

public record PersonClass(string Name, int Age);
public record PersonRecord(string Name, int Age);
public readonly record struct PersonStructRecord(string Name, int Age);

// 运行
BenchmarkRunner.Run<RecordBenchmarks>();
```

---

## 6. 对比分析

### 6.1 record vs class vs struct

| 特性 | `record` (class) | `class` | `struct` | `record struct` |
|------|------------------|---------|----------|------------------|
| 类型类别 | 引用类型 | 引用类型 | 值类型 | 值类型 |
| 默认相等性 | 值相等 | 引用相等 | 值相等（反射） | 值相等 |
| 不可变性 | 默认 init-only | 需手动 | 需手动 | 需 `readonly` |
| with 表达式 | 支持 | 不支持 | 不支持 | 支持 |
| 解构 | 自动合成 | 需手动 | 需手动 | 自动合成 |
| ToString | 自动合成 | 默认类型名 | 默认类型名 | 自动合成 |
| 继承 | 支持 | 支持 | 不支持 | 不支持 |
| 装箱 | 不需要 | 不需要 | 装箱到 object | 装箱到 object |
| 堆分配 | 是 | 是 | 否（除非装箱） | 否（除非装箱） |
| 适用场景 | 不可变数据模型 | 行为丰富对象 | 小型值类型 | 小型不可变值 |

### 6.2 record class vs record struct vs readonly record struct

| 特性 | `record class` | `record struct` | `readonly record struct` |
|------|----------------|-----------------|----------------------------|
| 内存位置 | 堆 | 栈（或字段内联） | 栈（或字段内联） |
| 可变性 | init-only 默认 | 可变默认 | init-only 强制 |
| with 性能 | GC 分配 | 栈复制 | 栈复制 |
| 装箱到 object | 不需要 | 需要 | 需要 |
| 继承 | 支持 | 不支持 | 不支持 |
| 适合场景 | 大对象、不可变数据 | 小型值、可变 | 小型值、不可变 |
| 字段默认 | init-only | 可变 | init-only |

### 6.3 record 与 F# record 对比

```fsharp
// F# record
type Person = { Name: string; Age: int }

let p1 = { Name = "Alice"; Age = 30 }
let p2 = { p1 with Age = 31 }
// p1 = { Name = "Alice"; Age = 30 }   // true，值相等
```

```csharp
// C# record
public record Person(string Name, int Age);

var p1 = new Person("Alice", 30);
var p2 = p1 with { Age = 31 };
// p1 == new Person("Alice", 30);   // true，值相等
```

| 特性 | C# record | F# record |
|------|------------|-----------|
| 不可变性 | init-only + with | 默认不可变 |
| 默认相等性 | 值相等 | 值相等 |
| 模式匹配 | 支持 | 原生支持 |
| 解构 | 自动 | 自动 |
| 继承 | record class 支持 | 不支持 |
| with 表达式 | `with { ... }` | `with` |
| 位置参数 | 支持 | 不支持（命名字段） |

### 6.4 record 与 Scala case class 对比

```scala
// Scala case class
case class Person(name: String, age: Int)

val p1 = Person("Alice", 30)
val p2 = p1.copy(age = 31)
// p1 == Person("Alice", 30)   // true
```

| 特性 | C# record | Scala case class |
|------|------------|-------------------|
| 不可变性 | init-only + with | 默认 val |
| 模式匹配 | 支持 | 原生支持（unapply） |
| copy 方法 | `with` 表达式 | `copy` 方法 |
| 位置参数 | 支持 | 支持 |
| 继承 | record class 支持 | 不支持（final） |
| Algebraic Data Type | 部分（sealed record） | 完整支持（sealed + case） |

### 6.5 record 与 Java Record 对比

```java
// Java record（Java 14+）
public record Person(String name, int age) {}

var p1 = new Person("Alice", 30);
// 不可变，无 with 表达式
```

| 特性 | C# record | Java record |
|------|------------|--------------|
| 不可变性 | 强制 init-only | 强制 final |
| with 表达式 | 支持 | 不支持（需手动 copy） |
| 继承 | record class 支持 | 不支持 |
| 位置参数 | 支持 | 支持 |
| 解构 | 自动 | 自动 |
| 模式匹配 | switch 表达式 | instanceof 模式匹配 |

---

## 7. 常见陷阱与反模式

### 7.1 陷阱：record struct 可变陷阱

```csharp
// 错误：record struct 默认可变，与不可变数据流期望不符
public record struct Counter(int Value);

var c = new Counter(0);
c.Value++;   // 可变，但易出 bug
```

**修复**：使用 `readonly record struct` 强制不可变。

```csharp
public readonly record struct Counter(int Value);

var c = new Counter(0);
// c.Value++;   // 编译错误
var c2 = c with { Value = c.Value + 1 };
```

### 7.2 陷阱：with 表达式浅拷贝

```csharp
public record Order(string Id, List<Item> Items);

var items = new List<Item> { new("A", 1) };
var order1 = new Order("O001", items);
var order2 = order1 with { Id = "O002" };

order1.Items.Add(new("B", 2));
Console.WriteLine(order2.Items.Count);   // 2，共享 List！
```

**修复**：使用不可变集合或深拷贝。

```csharp
public record Order(string Id, ImmutableList<Item> Items);

// 或自定义 <Clone>$
```

### 7.3 陷阱：record 与 EF Core 实体冲突

```csharp
// 错误：record 作为 EF Core 实体
public record Product(Guid Id, string Name, decimal Price);

// EF Core 需要无参构造与可变属性，record 不支持
public class ProductDbContext : DbContext
{
    public DbSet<Product> Products => Set<Product>();
    // EF Core 无法实例化 record
}
```

**修复**：EF Core 实体使用 `class`，DTO 使用 `record`。

```csharp
public class ProductEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
}

public record ProductDto(Guid Id, string Name, decimal Price);
```

### 7.4 陷阱：Equals 不一致

```csharp
// 错误：自定义 Equals 未更新 GetHashCode
public record Person(string Name, int Age)
{
    public virtual bool Equals(Person? other) =>
        other is not null && Name == other.Name;   // 忽略 Age
    // 未重写 GetHashCode，仍按 Name + Age 计算
}

var p1 = new Person("Alice", 30);
var p2 = new Person("Alice", 25);
Console.WriteLine(p1 == p2);   // true
Console.WriteLine(p1.GetHashCode() == p2.GetHashCode());   // false，违反合约
```

**修复**：自定义 `Equals` 必须同步 `GetHashCode`。

### 7.5 陷阱：record struct 装箱

```csharp
public readonly record struct Point(int X, int Y);

var p1 = new Point(1, 2);
object o = p1;   // 装箱，GC 分配
var p2 = (Point)o;   // 拆箱

// 在泛型约束下避免装箱
public static T Clone<T>(T value) where T : struct => value;
```

### 7.6 陷阱：继承与 with 类型混淆

```csharp
public record Animal(string Name);
public record Dog(string Name, string Breed) : Animal(Name);

Animal a = new Dog("Rex", "Labrador");
Animal a2 = a with { Name = "Buddy" };
Console.WriteLine(a2.GetType().Name);   // Dog，类型保留

// 但若 with 字段是基类特有，可能产生意外
Animal a3 = a with { /* Dog 字段不能在这里访问 */ };
```

### 7.7 陷阱：record 与反射

```csharp
public record Person(string Name, int Age);

var type = typeof(Person);
var properties = type.GetProperties();
// 反射获取属性，但 init 访问器有 modreq，外部设置困难
foreach (var prop in properties)
{
    var setMethod = prop.GetSetMethod(nonPublic: true);
    // setMethod 有 init 修饰符，反射调用可能失败
}
```

### 7.8 陷阱：record 与 JSON 序列化兼容性

```csharp
public record Person(string Name, int Age);

// Newtonsoft.Json 老版本可能不支持 init-only 属性反序列化
// 需升级到 13.0+ 或使用 System.Text.Json

// 解决方案
var options = new JsonSerializerOptions
{
    PropertyNameCaseInsensitive = true,
    PreferredObjectCreationHandling = JsonObjectCreationHandling.Replace
};
```

### 7.9 陷阱：record struct 与可空字段

```csharp
public readonly record struct Person(string Name, int? Age);

// 默认值问题
Person p = default;   // Name 是 null，Age 是 null
Console.WriteLine(p.Name);   // null，可能引发 NRE
```

**修复**：使用 `record class` 或显式校验。

```csharp
public readonly record struct Person
{
    public string Name { get; init; }
    public int? Age { get; init; }

    public Person(string name, int? age = null)
    {
        Name = name ?? throw new ArgumentNullException(nameof(name));
        Age = age;
    }
}
```

### 7.10 陷阱：record 与哈希碰撞

```csharp
// 错误：所有字段使用相同值导致碰撞
public record Point(int X, int Y);

var p1 = new Point(1, 1);
var p2 = new Point(1, 1);
// GetHashCode 相同（正确），但若所有点都是 (0, 0)，Dictionary 性能退化为 O(n)
```

**修复**：确保 `GetHashCode` 分布均匀，避免字段值高度相似。

### 7.11 陷阱：with 表达式与 init-only 字段

```csharp
public record Person
{
    public string Name { get; init; }
    public int Age { get; init; }
    public List<string> Hobbies { get; init; } = new();
}

var p1 = new Person { Name = "Alice", Age = 30 };
// p1.Hobbies 是空 List，with 时共享引用
var p2 = p1 with { Age = 31 };
p1.Hobbies.Add("Reading");
Console.WriteLine(p2.Hobbies.Count);   // 1，共享！
```

**修复**：使用不可变集合或自定义克隆。

### 7.12 陷阱：record 与默认值

```csharp
public record Person(string Name, int Age = 0);

var p = new Person("Alice");   // Age 默认 0
Console.WriteLine(p);   // Person { Name = Alice, Age = 0 }

// 但 record struct 的 default 问题更严重
public readonly record struct Point(int X, int Y);
Point p = default;   // X = 0, Y = 0，但若语义是无效点呢？
```

---

## 8. 工程实践与最佳实践

### 8.1 选择 record 还是 class

决策树：

```
是否表示数据（而非行为）？
├─ 否 -> 使用 class
└─ 是
   ├─ 不可变？
   │  ├─ 是
   │  │  ├─ 小型（< 16 字节）-> readonly record struct
   │  │  └─ 大型或需继承 -> record class
   │  └─ 否
   │     ├─ 小型（< 16 字节）-> record struct
   │     └─ 大型 -> class with set
```

### 8.2 优先使用位置参数

```csharp
// 推荐：位置参数，简洁且支持解构
public record Person(string Name, int Age);

// 不推荐：非位置参数（除非需要复杂逻辑）
public record Person
{
    public string Name { get; init; }
    public int Age { get; init; }
}
```

### 8.3 不可变集合配合 with

```csharp
using System.Collections.Immutable;

public record Order(
    Guid Id,
    Customer Customer,
    ImmutableList<OrderLine> Lines,
    DateTimeOffset CreatedAt)
{
    public decimal Total => Lines.Sum(l => l.Price * l.Quantity);
}

public record Customer(string Name, string Email);
public record OrderLine(string ProductId, decimal Price, int Quantity);
```

### 8.4 record 与 DDD Value Object

```csharp
// Value Object：不可变、值相等、无身份
public readonly record struct EmailAddress(string Value)
{
    public static EmailAddress Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException("Email cannot be empty", nameof(value));
        if (!value.Contains('@'))
            throw new ArgumentException("Invalid email format", nameof(value));
        return new EmailAddress(value.ToLowerInvariant());
    }
}

public readonly record struct Address(
    string Street, string City, string State, string ZipCode, string Country)
{
    public string Formatted => $"{Street}, {City}, {State} {ZipCode}, {Country}";
}
```

### 8.5 record 与 Domain Event

```csharp
// Domain Event：不可变、有序、可序列化
public record DomainEvent(Guid AggregateId, int Version, DateTimeOffset OccurredAt)
{
    public Guid EventId { get; init; } = Guid.NewGuid();
}

public record OrderPlaced(Guid OrderId, Customer Customer, ImmutableList<OrderLine> Lines, decimal Total)
    : DomainEvent(OrderId, 1, DateTimeOffset.UtcNow);

public record OrderShipped(Guid OrderId, string TrackingNumber)
    : DomainEvent(OrderId, 2, DateTimeOffset.UtcNow);
```

### 8.6 record 与模式匹配深度集成

```csharp
public abstract record OrderState
{
    public record Pending : OrderState;
    public record Confirmed(DateTimeOffset ConfirmedAt) : OrderState;
    public record Shipped(string TrackingNumber, DateTimeOffset ShippedAt) : OrderState;
    public record Delivered(DateTimeOffset DeliveredAt) : OrderState;
    public record Cancelled(string Reason, DateTimeOffset CancelledAt) : OrderState;
}

public string DescribeState(OrderState state) => state switch
{
    OrderState.Pending => "Order is pending",
    OrderState.Confirmed c => $"Confirmed at {c.ConfirmedAt:yyyy-MM-dd}",
    OrderState.Shipped s => $"Shipped via {s.TrackingNumber}",
    OrderState.Delivered d => $"Delivered at {d.DeliveredAt:yyyy-MM-dd}",
    OrderState.Cancelled c => $"Cancelled: {c.Reason}",
    _ => throw new ArgumentException("Unknown state")
};
```

### 8.7 record 与验证

```csharp
public record Person
{
    private string _name = default!;
    private int _age;

    public string Name
    {
        get => _name;
        init => _name = string.IsNullOrWhiteSpace(value)
            ? throw new ArgumentException("Name cannot be empty")
            : value;
    }

    public int Age
    {
        get => _age;
        init => _age = value < 0 || value > 150
            ? throw new ArgumentOutOfRangeException(nameof(value))
            : value;
    }
}
```

### 8.8 record 与序列化兼容性

```csharp
// 使用 System.Text.Json，需配置 init 支持
var options = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    WriteIndented = true
};

JsonSerializerOptions.Default = options;

// 对于 Newtonsoft.Json，需升级到 13.0+ 以支持 init
```

### 8.9 record 与性能优化

```csharp
// 小型值类型用 readonly record struct
public readonly record struct Point(int X, int Y);
public readonly record struct Vector3(double X, double Y, double Z);

// 大型不可变数据用 record class
public record User(
    Guid Id,
    string Name,
    string Email,
    ImmutableList<string> Roles,
    DateTimeOffset CreatedAt);

// 高频更新场景考虑 record struct，避免 GC
public readonly record struct Frame(int Index, double Timestamp);
```

### 8.10 record 与测试

```csharp
// record 自动值相等，简化测试断言
[Test]
public void Person_IncrementAge_ReturnsNewRecordWithIncrementedAge()
{
    var original = new Person("Alice", 30);
    var expected = new Person("Alice", 31);

    var actual = PersonService.IncrementAge(original);

    Assert.AreEqual(expected, actual);   // 值相等，无需逐字段比较
    Assert.AreNotSame(original, actual);   // 不同实例
}

// 测试数据构建器
public static class PersonTestData
{
    public static Person Default => new("Alice", 30);
    public static Person WithAge(int age) => Default with { Age = age };
    public static Person Named(string name) => Default with { Name = name };
}
```

### 8.11 record 与异步流

```csharp
public record SensorReading(string SensorId, double Value, DateTimeOffset Timestamp);

public async IAsyncEnumerable<SensorReading> ReadSensorsAsync(
    [EnumeratorCancellation] CancellationToken ct = default)
{
    var sensors = new[] { "S1", "S2", "S3" };
    foreach (var sensor in sensors)
    {
        ct.ThrowIfCancellationRequested();
        await Task.Delay(100, ct);
        yield return new SensorReading(sensor, Random.Shared.NextDouble() * 100, DateTimeOffset.UtcNow);
    }
}

await foreach (var reading in ReadSensorsAsync())
    Console.WriteLine(reading);
```

### 8.12 record 与 Source Generator

```csharp
// 使用 Source Generator 自动生成 record 的 DTO 映射
[DtoMapper(typeof(Person))]
public static partial class PersonMapper
{
    // Source Generator 自动生成 ToDto 与 FromDto 方法
}

// 自动生成的代码
public static partial class PersonMapper
{
    public static PersonDto ToDto(Person person) =>
        new(person.Name, person.Age);

    public static Person FromDto(PersonDto dto) =>
        new(dto.Name, dto.Age);
}
```

---

## 9. 案例研究

### 9.1 案例：电商订单系统

```csharp
// 领域模型
public record Customer(Guid Id, string Name, string Email, ImmutableList<Address> Addresses);
public record Address(string Street, string City, string State, string ZipCode);
public record Product(Guid Id, string Name, decimal Price, string Category);
public record OrderLine(Guid ProductId, string ProductName, decimal Price, int Quantity)
{
    public decimal Subtotal => Price * Quantity;
}
public record Order(
    Guid Id,
    Guid CustomerId,
    ImmutableList<OrderLine> Lines,
    OrderStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt)
{
    public decimal Total => Lines.Sum(l => l.Subtotal);

    public Order Confirm()
    {
        if (Status != OrderStatus.Pending)
            throw new InvalidOperationException("Only pending orders can be confirmed");
        return this with { Status = OrderStatus.Confirmed, UpdatedAt = DateTimeOffset.UtcNow };
    }

    public Order Ship(string trackingNumber)
    {
        if (Status != OrderStatus.Confirmed)
            throw new InvalidOperationException("Only confirmed orders can be shipped");
        return this with { Status = OrderStatus.Shipped, UpdatedAt = DateTimeOffset.UtcNow };
    }
}

public record OrderStatus
{
    public static readonly OrderStatus Pending = new("Pending");
    public static readonly OrderStatus Confirmed = new("Confirmed");
    public static readonly OrderStatus Shipped = new("Shipped");
    public static readonly OrderStatus Delivered = new("Delivered");
    public static readonly OrderStatus Cancelled = new("Cancelled");

    private OrderStatus(string value) { Value = value; }
    public string Value { get; }
}
```

### 9.2 案例：函数式数据处理管道

```csharp
public record SalesRecord(DateTime Date, string Product, int Quantity, decimal Revenue);

public static class SalesPipeline
{
    public static ImmutableList<SalesRecord> FilterByDate(
        this ImmutableList<SalesRecord> records, DateTime from, DateTime to) =>
        records.Where(r => r.Date >= from && r.Date <= to).ToImmutableList();

    public static ImmutableList<SalesRecord> FilterByProduct(
        this ImmutableList<SalesRecord> records, string product) =>
        records.Where(r => r.Product == product).ToImmutableList();

    public static ImmutableList<T> Map<T, U>(
        this ImmutableList<T> records, Func<T, U> selector) =>
        records.Select(selector).ToImmutableList() as ImmutableList<T>;

    public static decimal TotalRevenue(this ImmutableList<SalesRecord> records) =>
        records.Sum(r => r.Revenue);

    public static ImmutableList<SalesRecord> AddRecord(
        this ImmutableList<SalesRecord> records, SalesRecord record) =>
        records.Add(record);

    public static ImmutableList<SalesRecord> UpdateRecord(
        this ImmutableList<SalesRecord> records, int index, SalesRecord record) =>
        records.SetItem(index, record);
}

// 使用
var records = ImmutableList<SalesRecord>.Empty
    .Add(new SalesRecord(DateTime.Today, "A", 10, 100m))
    .Add(new SalesRecord(DateTime.Today.AddDays(-1), "B", 5, 50m))
    .Add(new SalesRecord(DateTime.Today, "C", 20, 200m));

var todayRecords = records.FilterByDate(DateTime.Today, DateTime.Today);
var totalRevenue = todayRecords.TotalRevenue();
Console.WriteLine($"Today's revenue: {totalRevenue}");
```

### 9.3 案例：DDD Value Object 实现

```csharp
// Money Value Object
public readonly record struct Money(decimal Amount, string Currency)
{
    public static Money Usd(decimal amount) => new(amount, "USD");
    public static Money Eur(decimal amount) => new(amount, "EUR");
    public static Money Cny(decimal amount) => new(amount, "CNY");

    public static Money operator +(Money a, Money b)
    {
        EnsureSameCurrency(a, b);
        return a with { Amount = a.Amount + b.Amount };
    }

    public static Money operator -(Money a, Money b)
    {
        EnsureSameCurrency(a, b);
        return a with { Amount = a.Amount - b.Amount };
    }

    public static Money operator *(Money a, int factor) =>
        a with { Amount = a.Amount * factor };

    public static Money operator *(Money a, decimal factor) =>
        a with { Amount = a.Amount * factor };

    public static bool operator <(Money a, Money b)
    {
        EnsureSameCurrency(a, b);
        return a.Amount < b.Amount;
    }

    public static bool operator >(Money a, Money b)
    {
        EnsureSameCurrency(a, b);
        return a.Amount > b.Amount;
    }

    private static void EnsureSameCurrency(Money a, Money b)
    {
        if (a.Currency != b.Currency)
            throw new InvalidOperationException($"Currency mismatch: {a.Currency} vs {b.Currency}");
    }

    public override string ToString() => $"{Amount:N2} {Currency}";
}

// 使用
var price = Money.Usd(99.99m);
var tax = Money.Usd(8.99m);
var total = price + tax;
Console.WriteLine(total);   // 108.98 USD
```

### 9.4 案例：配置与选项模式

```csharp
public record DatabaseOptions(
    string ConnectionString,
    int MaxPoolSize = 100,
    int CommandTimeoutSeconds = 30,
    bool EnableRetry = true);

public record RedisOptions(
    string Endpoint,
    int Database = 0,
    TimeSpan? DefaultExpiry = null);

public record AppOptions(
    DatabaseOptions Database,
    RedisOptions Redis,
    LoggingOptions Logging);

public record LoggingOptions(
    LogLevel MinimumLevel = LogLevel.Information,
    string OutputTemplate = "{Timestamp:yyyy-MM-dd HH:mm:ss} [{Level}] {Message}");

// 配置绑定
var options = configuration.Get<AppOptions>()!;

// 不可变更新
var newOptions = options with
{
    Database = options.Database with { MaxPoolSize = 200 }
};
```

### 9.5 案例：事件溯源（Event Sourcing）

```csharp
public record DomainEvent(Guid EventId, Guid AggregateId, int Version, DateTimeOffset OccurredAt)
{
    public DomainEvent(Guid aggregateId, int version) : this(Guid.NewGuid(), aggregateId, version, DateTimeOffset.UtcNow)
    {
    }
}

public record AccountCreated(Guid AccountId, string OwnerName, decimal InitialBalance)
    : DomainEvent(AccountId, 1);

public record MoneyDeposited(Guid AccountId, decimal Amount, decimal NewBalance)
    : DomainEvent(AccountId, 0);   // Version 由 Aggregate 填充

public record MoneyWithdrawn(Guid AccountId, decimal Amount, decimal NewBalance)
    : DomainEvent(AccountId, 0);

public record AccountClosed(Guid AccountId, string Reason)
    : DomainEvent(AccountId, 0);

public class AccountAggregate
{
    public Guid Id { get; private set; }
    public string Owner { get; private set; } = string.Empty;
    public decimal Balance { get; private set; }
    public bool IsClosed { get; private set; }
    public int Version { get; private set; }

    private readonly List<DomainEvent> _uncommittedEvents = new();
    public IReadOnlyList<DomainEvent> UncommittedEvents => _uncommittedEvents;

    public static AccountAggregate Create(string owner, decimal initialBalance)
    {
        var account = new AccountAggregate();
        account.RaiseEvent(new AccountCreated(Guid.NewGuid(), owner, initialBalance));
        return account;
    }

    public void Deposit(decimal amount)
    {
        if (IsClosed) throw new InvalidOperationException("Account is closed");
        if (amount <= 0) throw new ArgumentException("Amount must be positive");
        RaiseEvent(new MoneyDeposited(Id, amount, Balance + amount));
    }

    public void Withdraw(decimal amount)
    {
        if (IsClosed) throw new InvalidOperationException("Account is closed");
        if (amount <= 0) throw new ArgumentException("Amount must be positive");
        if (Balance < amount) throw new InvalidOperationException("Insufficient funds");
        RaiseEvent(new MoneyWithdrawn(Id, amount, Balance - amount));
    }

    private void RaiseEvent(DomainEvent @event)
    {
        Apply(@event);
        _uncommittedEvents.Add(@event);
    }

    public void Apply(DomainEvent @event)
    {
        switch (@event)
        {
            case AccountCreated e:
                Id = e.AccountId;
                Owner = e.OwnerName;
                Balance = e.InitialBalance;
                Version = 1;
                break;
            case MoneyDeposited e:
                Balance = e.NewBalance;
                Version++;
                break;
            case MoneyWithdrawn e:
                Balance = e.NewBalance;
                Version++;
                break;
        }
    }
}
```

### 9.6 案例：HTTP API DTO

```csharp
public record UserDto(Guid Id, string Name, string Email, ImmutableList<string> Roles);
public record CreateUserRequest(string Name, string Email, string Password);
public record UpdateUserRequest(string? Name, string? Email);
public record UserCreatedResponse(Guid Id, string Name, string Email);
public record ErrorResponse(int StatusCode, string Message, string? Detail = null);

// Minimal API
app.MapPost("/users", async (CreateUserRequest req, IUserService service) =>
{
    var user = await service.CreateAsync(req.Name, req.Email, req.Password);
    var dto = new UserDto(user.Id, user.Name, user.Email, user.Roles.ToImmutableList());
    return Results.Created($"/users/{user.Id}", dto);
});

app.MapGet("/users/{id:guid}", async (Guid id, IUserService service) =>
{
    var user = await service.GetAsync(id);
    return user is null
        ? Results.NotFound(new ErrorResponse(404, "User not found"))
        : Results.Ok(new UserDto(user.Id, user.Name, user.Email, user.Roles.ToImmutableList()));
});

app.MapPut("/users/{id:guid}", async (Guid id, UpdateUserRequest req, IUserService service) =>
{
    var user = await service.UpdateAsync(id, req.Name, req.Email);
    return Results.Ok(new UserDto(user.Id, user.Name, user.Email, user.Roles.ToImmutableList()));
});
```

### 9.7 案例：不可变领域状态机

```csharp
public abstract record OrderState
{
    public record Pending : OrderState;
    public record Confirmed(DateTimeOffset At) : OrderState;
    public record Shipped(string Tracking, DateTimeOffset At) : OrderState;
    public record Delivered(DateTimeOffset At) : OrderState;
    public record Cancelled(string Reason, DateTimeOffset At) : OrderState;
}

public record Order(Guid Id, Customer Customer, ImmutableList<OrderLine> Lines, OrderState State)
{
    public Order Confirm() => State switch
    {
        OrderState.Pending => this with { State = new OrderState.Confirmed(DateTimeOffset.UtcNow) },
        _ => throw new InvalidOperationException($"Cannot confirm from {State}")
    };

    public Order Ship(string tracking) => State switch
    {
        OrderState.Confirmed => this with
        {
            State = new OrderState.Shipped(tracking, DateTimeOffset.UtcNow)
        },
        _ => throw new InvalidOperationException($"Cannot ship from {State}")
    };

    public Order Deliver() => State switch
    {
        OrderState.Shipped s => this with { State = new OrderState.Delivered(DateTimeOffset.UtcNow) },
        _ => throw new InvalidOperationException($"Cannot deliver from {State}")
    };

    public Order Cancel(string reason) => State switch
    {
        OrderState.Pending or OrderState.Confirmed =>
            this with { State = new OrderState.Cancelled(reason, DateTimeOffset.UtcNow) },
        _ => throw new InvalidOperationException($"Cannot cancel from {State}")
    };
}
```

### 9.8 案例：使用 BenchmarkDotNet 对比

```csharp
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;
using System.Collections.Generic;
using System.Collections.Immutable;

[MemoryDiagnoser]
public class RecordPerformanceBenchmarks
{
    private readonly PersonClass _classPerson = new("Alice", 30);
    private readonly PersonRecord _recordPerson = new("Alice", 30);
    private readonly PersonStructRecord _structPerson = new("Alice", 30);

    [Benchmark(Baseline = true)]
    public PersonClass Class_With() => _classPerson with { Age = 31 };

    [Benchmark]
    public PersonRecord Record_With() => _recordPerson with { Age = 31 };

    [Benchmark]
    public PersonStructRecord Struct_With() => _structPerson with { Age = 31 };

    [Benchmark]
    public bool Class_Equals() => _classPerson.Equals(new PersonClass("Alice", 30));

    [Benchmark]
    public bool Record_Equals() => _recordPerson.Equals(new PersonRecord("Alice", 30));

    [Benchmark]
    public bool Struct_Equals() => _structPerson.Equals(new PersonStructRecord("Alice", 30));

    [Benchmark]
    public int Record_GetHashCode() => _recordPerson.GetHashCode();

    [Benchmark]
    public int Struct_GetHashCode() => _structPerson.GetHashCode();
}

public record PersonClass(string Name, int Age);
public record PersonRecord(string Name, int Age);
public readonly record struct PersonStructRecord(string Name, int Age);

// 运行
BenchmarkRunner.Run<RecordPerformanceBenchmarks>();
```

---

## 10. 习题与思考题

### 10.1 选择题

**Q1**：以下哪项不是 `record` 自动合成的成员？

A. `Equals`  
B. `GetHashCode`  
C. `Dispose`  
D. `Deconstruct`

**答案**：C

**解析**：`record` 合成 `Equals`、`GetHashCode`、`Deconstruct`、`ToString`、`op_Equality`、`op_Inequality`、`<Clone>$` 等，但不合成 `Dispose`。`IAsyncDisposable` 与 `IDisposable` 需显式实现。

**Q2**：以下 `with` 表达式的输出是什么？

```csharp
public record Person(string Name, int Age);
var p1 = new Person("Alice", 30);
var p2 = p1 with { Age = 31 };
Console.WriteLine(p1.Age);
```

A. 30  
B. 31  
C. 编译错误  
D. 运行时异常

**答案**：A

**解析**：`with` 表达式不修改原对象，`p1.Age` 仍为 30。

**Q3**：以下代码的输出？

```csharp
public record Person(string Name, int Age);
var p1 = new Person("Alice", 30);
var p2 = new Person("Alice", 30);
Console.WriteLine(p1 == p2);
Console.WriteLine(ReferenceEquals(p1, p2));
```

A. `true` / `true`  
B. `true` / `false`  
C. `false` / `true`  
D. `false` / `false`

**答案**：B

**解析**：`record` 默认值相等，故 `p1 == p2` 为 `true`；但 `p1` 与 `p2` 是不同实例，`ReferenceEquals` 为 `false`。

**Q4**：以下哪种声明是合法的 C# 10 record struct？

A. `record struct Point(int X, int Y);`  
B. `struct record Point(int X, int Y);`  
C. `record Point struct(int X, int Y);`  
D. `Point record struct(int X, int Y);`

**答案**：A

**解析**：`record struct` 是关键字组合，必须以 `record struct` 开头。

### 10.2 简答题

**Q5**：解释 `record` 与 `class` 在相等性语义上的核心差异，并说明为何 `record` 适合 DDD Value Object。

**参考答案**：

`record` 默认使用值相等性，两个实例所有字段相等即认为相等；`class` 默认使用引用相等性，仅当引用同一对象时相等。DDD Value Object 的定义是"由其属性值定义身份，无独立身份标识"，故值相等性契合 Value Object 语义。例如 `Money(100, "USD")` 与另一个 `Money(100, "USD")` 应视为相等。`record` 自动合成 `Equals` 与 `GetHashCode`，无需手写样板代码。

**Q6**：说明 `with` 表达式的实现机制及其与不可变性的关系。

**参考答案**：

`with` 表达式编译为两步：1) 调用 `<Clone>$()` 复制原对象（引用类型用 `MemberwiseClone`，值类型按值拷贝）；2) 通过 init 访问器更新指定字段，返回新实例。原对象未被修改，故 `with` 实现了不可变更新：所有"修改"操作实际产生新实例。这与函数式编程的纯函数语义契合，支持引用透明性。

**Q7**：对比 `record class` 与 `readonly record struct` 在以下场景的取舍：
1. 表示二维点 (X, Y) double
2. 表示订单（含 Id、Customer、Lines 列表）
3. 表示用户配置（含多个嵌套字段）

**参考答案**：

1. **二维点**：使用 `readonly record struct Point(double X, double Y)`。小型数据（16 字节）值类型避免堆分配，with 操作性能更好（栈复制，无 GC）。作为 `Dictionary` 键时哈希分布好。
2. **订单**：使用 `record class Order`。大型对象（含集合），需继承与多态（OrderState 状态机），引用类型避免频繁拷贝大型列表。
3. **用户配置**：使用 `record class`。配置含嵌套字段，引用类型便于共享与序列化。

### 10.3 编程题

**Q8**：实现一个不可变银行账户 record，支持存款、取款、转账，每次操作返回新账户实例。

```csharp
public record BankAccount(Guid Id, string Owner, decimal Balance, string Currency)
{
    public BankAccount Deposit(decimal amount)
    {
        if (amount <= 0)
            throw new ArgumentException("Amount must be positive", nameof(amount));
        return this with { Balance = Balance + amount };
    }

    public BankAccount Withdraw(decimal amount)
    {
        if (amount <= 0)
            throw new ArgumentException("Amount must be positive", nameof(amount));
        if (Balance < amount)
            throw new InvalidOperationException("Insufficient funds");
        return this with { Balance = Balance - amount };
    }

    public (BankAccount From, BankAccount To) Transfer(BankAccount to, decimal amount)
    {
        if (Currency != to.Currency)
            throw new InvalidOperationException("Currency mismatch");
        var from = this.Withdraw(amount);
        var toAccount = to.Deposit(amount);
        return (from, toAccount);
    }
}

// 使用
var account1 = new BankAccount(Guid.NewGuid(), "Alice", 1000m, "USD");
var account2 = new BankAccount(Guid.NewGuid(), "Bob", 500m, "USD");

var (a1, a2) = account1.Transfer(account2, 200m);
Console.WriteLine($"Alice: {a1.Balance}");   // 800
Console.WriteLine($"Bob: {a2.Balance}");     // 700
Console.WriteLine($"Original Alice: {account1.Balance}");   // 1000，未变
```

**Q9**：实现一个不可变树结构（二叉搜索树）使用 record 与模式匹配。

```csharp
public abstract record Tree<T> where T : IComparable<T>
{
    public record Leaf : Tree<T>;
    public record Node(T Value, Tree<T> Left, Tree<T> Right) : Tree<T>;
}

public static class TreeExtensions
{
    public static Tree<T> Insert<T>(this Tree<T> tree, T value) where T : IComparable<T> =>
        tree switch
        {
            Tree<T>.Leaf _ => new Tree<T>.Node(value, new Tree<T>.Leaf(), new Tree<T>.Leaf()),
            Tree<T>.Node n when value.CompareTo(n.Value) < 0 =>
                n with { Left = n.Left.Insert(value) },
            Tree<T>.Node n when value.CompareTo(n.Value) > 0 =>
                n with { Right = n.Right.Insert(value) },
            _ => tree   // 相等，不插入
        };

    public static bool Contains<T>(this Tree<T> tree, T value) where T : IComparable<T> =>
        tree switch
        {
            Tree<T>.Leaf _ => false,
            Tree<T>.Node n when value.CompareTo(n.Value) == 0 => true,
            Tree<T>.Node n when value.CompareTo(n.Value) < 0 => n.Left.Contains(value),
            Tree<T>.Node n => n.Right.Contains(value),
            _ => false
        };

    public static string Format<T>(this Tree<T> tree, int indent = 0) where T : IComparable<T> =>
        tree switch
        {
            Tree<T>.Leaf _ => "",
            Tree<T>.Node n =>
                $"{new string(' ', indent)}{n.Value}\n{Format(n.Left, indent + 2)}{Format(n.Right, indent + 2)}",
            _ => ""
        };
}

// 使用
Tree<int> tree = new Tree<int>.Leaf();
tree = tree.Insert(5).Insert(3).Insert(7).Insert(1).Insert(4);
Console.WriteLine(tree.Format());
Console.WriteLine(tree.Contains(4));   // true
Console.WriteLine(tree.Contains(6));   // false
```

**Q10**：使用 record 与 Source Generator 实现自动 DTO 映射（手写或示意）。

```csharp
[AttributeUsage(AttributeTargets.Class)]
public class DtoMapperAttribute : Attribute
{
    public Type SourceType { get; }

    public DtoMapperAttribute(Type sourceType) => SourceType = sourceType;
}

// 实体类
public class UserEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

// DTO record
[DtoMapper(typeof(UserEntity))]
public record UserDto(Guid Id, string Name, string Email, DateTime CreatedAt);

// 手动实现的映射（实际由 Source Generator 生成）
public static class UserDtoMapper
{
    public static UserDto ToDto(UserEntity entity) =>
        new(entity.Id, entity.Name, entity.Email, entity.CreatedAt);

    public static UserEntity ToEntity(UserDto dto) =>
        new()
        {
            Id = dto.Id,
            Name = dto.Name,
            Email = dto.Email,
            CreatedAt = dto.CreatedAt
        };
}

// 使用
var entity = new UserEntity
{
    Id = Guid.NewGuid(),
    Name = "Alice",
    Email = "alice@example.com",
    PasswordHash = "hashed",
    CreatedAt = DateTime.UtcNow
};

var dto = UserDtoMapper.ToDto(entity);
Console.WriteLine(dto);
// UserDto { Id = ..., Name = Alice, Email = alice@example.com, CreatedAt = ... }
```

### 10.4 思考题

**Q11**：`record` 是否适合所有不可变数据建模场景？哪些情况下应避免使用？

**参考答案**：

不适用场景：

1. **EF Core 实体**：EF Core 需无参构造与可变属性，`record` 的 init-only 与位置参数构造不兼容。
2. **大型对象频繁更新**：每次 `with` 触发完整复制，大型对象（>1KB）频繁更新性能差，应考虑可变 class + `IImmutableList`。
3. **需要序列化兼容老版本库**：某些序列化库（Newtonsoft.Json < 13.0）不支持 init-only，需升级或使用 class。
4. **反射密集场景**：record 的 init 访问器有 `modreq`，反射设置可能失败。
5. **跨进程或跨语言互操作**：record 是 C# 特性，跨语言调用时合成成员不透明。

**Q12**：`record struct` 与 `readonly record struct` 的核心区别是什么？何时选择前者？

**参考答案**：

- **`record struct`**：默认可变（字段可写），适合需要值相等性但允许修改的小型数据，如累积器、缓冲区。
- **`readonly record struct`**：强制不可变（字段 init-only），适合纯函数式数据流、Dictionary 键、并发共享数据。

选择 `record struct`（可变）的场景：

1. **性能敏感的累积器**：`record struct Accumulator(int Count, decimal Sum);` 在循环中频繁更新，避免 `with` 的栈复制。
2. **互操作与原生数据**：与 C/C++ 互操作时，可变结构体映射原生数据。
3. **数学向量临时计算**：临时向量加减，可变比 `with` 直观。

但大多数情况下推荐 `readonly record struct`，避免可变陷阱。

**Q13**：分析 `record` 在函数式编程范式下的优势与局限。

**参考答案**：

**优势**：

1. **值相等性**：天然支持纯函数式数据比较。
2. **不可变性**：init-only + `with` 实现不可变更新。
3. **模式匹配**：与 switch 表达式、`is` 模式深度集成。
4. **解构**：自动 `Deconstruct` 支持元组式数据访问。
5. **ADT 表达**：继承 record 可表达代数数据类型（如 `Tree<T>` 的 Leaf/Node）。

**局限**：

1. **无尾递归优化**：C# 不保证尾递归优化，深度递归（如树遍历）可能栈溢出。
2. **无内置不可变集合**：需配合 `System.Collections.Immutable`，不如 F# List 原生。
3. **惰性求值缺失**：C# 无内置 `Lazy<T>` 集成，函数式惰性模式需手动。
4. **类型推断受限**：C# 类型推断不如 F# 强大，record 类型需显式声明。
5. **无 Computation Expression**：缺少 F# 的 `async`/`seq` 等计算表达式语法糖。

---

## 11. 参考文献

[1] C# Language Specification, "Records (C# 9.0 Reference)," Microsoft Docs, 2020. [Online]. Available: https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record

[2] M. Torgersen, "Records and With-expressions," in C# 9.0 Design Notes, Microsoft, 2020. [Online]. Available: https://github.com/dotnet/csharplang/blob/main/proposals/csharp-9.0/records.md

[3] J. Skeet, C# in Depth, 4th ed. Manning Publications, 2019.

[4] M. Wagner, "Record Types," in C# Programming Guide, Microsoft Docs, 2020. [Online]. Available: https://learn.microsoft.com/dotnet/csharp/fundamentals/types/records

[5] J. Albahari and B. Albahari, C# 12 in a Nutshell: The Definitive Reference. O'Reilly Media, 2023.

[6] M. Torgersen, "Record Structs (C# 10.0)," in C# 10.0 Design Notes, Microsoft, 2021. [Online]. Available: https://github.com/dotnet/csharplang/blob/main/proposals/csharp-10.0/record-structs.md

[7] E. Lippert, "Immutability in C#," in Fabulous Adventures in Coding, MSDN Blogs, 2014. [Online]. Available: https://ericlippert.com/2014/04/21/immutability-in-c/

[8] E. Evans, Domain-Driven Design: Tackling Complexity in the Heart of Software. Addison-Wesley, 2003.

[9] V. Vernon, Implementing Domain-Driven Design. Addison-Wesley, 2013.

[10] B. Smith, "Functional Programming in C#," in Functional Programming with C#, O'Reilly Media, 2017.

[11] D. Syme, "F# Design Guidelines: Records," in F# Documentation, Microsoft, 2020. [Online]. Available: https://fsharpdocs.org/dotnet/fsharp/language-reference/records

[12] M. Odersky, "Case Classes in Scala," in Scala Language Specification, EPFL, 2004. [Online]. Available: https://docs.scala-lang.org/tour/case-classes.html

[13] B. Goetz, "JEP 384: Records (Second Preview)," in JDK Enhancement Proposals, Oracle, 2020. [Online]. Available: https://openjdk.org/jeps/384

[14] J. Duffy, "Designing Record Types for .NET," in .NET Design Notes, Microsoft, 2020. [Online]. Available: https://github.com/dotnet/designs/blob/main/accepted/2020/records/records.md

[15] S. Toub, "Performance Improvements in .NET 6: Records and Structs," in .NET Blog, Microsoft, 2021. [Online]. Available: https://devblogs.microsoft.com/dotnet/performance-improvements-in-net-6/

---

## 12. 延伸阅读

### 12.1 官方文档

- **C# Records**：https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record
- **Record Structs (C# 10)**：https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/record#record-struct
- **init Accessor**：https://learn.microsoft.com/dotnet/csharp/language-reference/keywords/init
- **with Expression**：https://learn.microsoft.com/dotnet/csharp/language-reference/operators/with-expression
- **Pattern Matching**：https://learn.microsoft.com/dotnet/csharp/fundamentals/functional/pattern-matching

### 12.2 系列文档交叉引用

- 《C# 概述与环境配置》：.NET 平台基础、SDK 安装、dotnet CLI。
- 《C# 基础语法》：值类型与引用类型、属性、可空性。
- 《C# 面向对象编程》：继承、多态、抽象类。
- 《C# 高级特性》：模式匹配、`init`、`required`。
- 《C# 泛型与集合》：`Dictionary<TKey, TValue>` 与 `record` 作为键。
- 《C# .NET 平台与生态》：EF Core、`System.Text.Json`、DDD 集成。
- 《C# 异步编程》：`record` 作为异步流元素、`Channel<SensorReading>`。

### 12.3 进阶书籍

- **C# in Depth (4th Edition)**, Jon Skeet：深入 C# 演化与设计哲学。
- **C# 12 in a Nutshell**, Joseph Albahari：完整 C# 12 参考手册。
- **Domain-Driven Design**, Eric Evans：DDD 理论与 Value Object 模式。
- **Implementing Domain-Driven Design**, Vaughn Vernon：DDD 工程实践。
- **Functional Programming in C#**, Enrico Buonanno：函数式范式与 record 应用。
- **Real-World Functional Programming**, Tomas Petricek：F# 与 C# 函数式对比。

### 12.4 社区资源

- **C# Language Design**：https://github.com/dotnet/csharplang
- **.NET Design Notes**：https://github.com/dotnet/designs
- **C# Discord**：https://discord.gg/csharp
- **Stack Overflow C# Tag**：https://stackoverflow.com/questions/tagged/c%23
- **Reddit r/csharp**：https://www.reddit.com/r/csharp/

### 12.5 视频资源

- **Microsoft Build: What's New in C# 10 Records**：https://learn.microsoft.com/events/build-2022
- **NDC Oslo: Records and Pattern Matching in C#**：https://vimeo.com/ndcoslo
- **On .NET Show: Records Deep Dive**：https://dotnet.microsoft.com/en-us/live
- **Nick Chapsas: C# Records Explained**：https://www.youtube.com/@nickchapsas
- **Tim Corey: C# Records Tutorial**：https://www.youtube.com/@IAmTimCorey

### 12.6 工具与诊断

- **BenchmarkDotNet**：性能基准测试，对比 record/class/struct 性能。https://benchmarkdotnet.org/
- **ILSpy**：反编译工具，查看 record 编译后的 IL 代码。https://github.com/icsharpcode/ILSpy
- **SharpLab**：在线 C# 编译器与 IL 查看，研究 record 合成成员。https://sharplab.io/
- **dotPeek**：JetBrains 反编译工具，分析 record 实现细节。https://www.jetbrains.com/decompiler/
- **Source Generators**：自定义 record 映射代码生成。https://learn.microsoft.com/dotnet/csharp/roslyn-sdk/source-generators-overview

---

## 总结

`record` 类型是 C# 9.0 引入的面向不可变数据建模的核心语言特性，其设计哲学是消除样板代码、支持函数式风格、提供值相等性与不可变更新。通过位置参数、`with` 表达式、`init` 访问器，`record` 极大简化了数据类的定义与使用。`record struct`（C# 10.0）扩展了值类型场景，`readonly record struct` 提供了不可变值类型的零成本抽象。

核心要点：

1. **值相等性**：`record` 默认按字段值比较，适合 DDD Value Object。
2. **不可变性**：`init` 访问器 + `with` 表达式实现不可变更新。
3. **样板消除**：编译器合成 `Equals`、`GetHashCode`、`Deconstruct`、`ToString` 等。
4. **形式化基础**：`record` 可视为代数数据类型中的 Product Type，满足 `Equals`/`GetHashCode` 合约。
5. **性能权衡**：`record class` 适合大型不可变数据，`readonly record struct` 适合小型值类型。
6. **工程实践**：避免用作 EF Core 实体，优先用作 DTO、Value Object、Domain Event。
7. **函数式集成**：与模式匹配、不可变集合、纯函数深度集成，支持函数式数据流。

掌握 `record` 的语义、合成代码、性能特征与适用场景，是构建高质量 C# 数据驱动应用的基础。本系列后续文档将深入 LINQ、`Span<T>`、Source Generator 等高级特性，进一步提升读者的 C# 工程能力。
