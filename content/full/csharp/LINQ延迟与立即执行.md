---
order: 100
title: LINQ延迟与立即执行
module: csharp
category: 'dev-lang'
difficulty: advanced
description: 'C# LINQ 延迟执行与立即执行深度解析：IEnumerable<T>、IQueryable<T>、表达式树、yield return、迭代器状态机、ToList/ToArray 强制求值的全链路原理。'
author: fanquanpp
updated: '2026-07-20'
related:
  - 'csharp/CSharp12与CSharp13新特性'
  - 'csharp/CSharp与反射'
  - 'csharp/async-await状态机'
  - csharp/委托与事件底层原理
prerequisites:
  - csharp/概述与环境配置
---

# LINQ 延迟与立即执行：从迭代器到表达式树的全景解析

> 本章对标 MIT 6.1020（Software Construction）与 Stanford CS107（Programming Paradigms）的延迟求值教学深度，结合 ECMA-335（CLI 规范）与 Roslyn 编译器源码，深入剖析 LINQ 中延迟执行（lazy evaluation）与立即执行（eager evaluation）的本质区别、`IEnumerable<T>` 与 `IQueryable<T>` 的双轨模型、`yield return` 状态机、表达式树（expression tree）的编译与翻译、`ToList`/`ToArray` 的强制求值语义，以及在 EF Core、ASP.NET Core 中的工程实践。

## 目录

1. [学习目标](#1-学习目标)
2. [历史动机与发展脉络](#2-历史动机与发展脉络)
3. [形式化定义](#3-形式式定义)
4. [理论推导与原理解析](#4-理论推导与原理解析)
5. [代码示例](#5-代码示例)
6. [对比分析](#6-对比分析)
7. [常见陷阱与最佳实践](#7-常见陷阱与最佳实践)
8. [工程实践](#8-工程实践)
9. [案例研究](#9-案例研究)
10. [习题](#10-习题)
11. [参考文献](#11-参考文献)
12. [延伸阅读](#12-延伸阅读)

---

## 1. 学习目标

本章节遵循 Bloom 教育目标分类学（1956 年原版 + 2001 年修订版）的六个认知层次。完成本章学习后，读者应能：

### 1.1 Remember（记忆）

- 复述 LINQ 在 C# 3.0（2007）引入时的设计动机与"语言集成查询"（Language Integrated Query）口号。
- 列出 `IEnumerable<T>`、`IEnumerable`、`IQueryable<T>`、`IQueryable` 四个核心接口的成员。
- 说出 `Where`、`Select`、`OrderBy`、`GroupBy`、`Join` 等延迟操作符与 `ToList`、`ToArray`、`ToDictionary`、`First`、`Count` 等立即操作符的分类。
- 描述 `yield return` 编译为状态机的字段命名约定（`<>1__state`、`<>2__current`、`<>4__this` 等）。

### 1.2 Understand（理解）

- 解释延迟执行的本质是"构建查询描述而非执行查询"。
- 用自己的语言说明 `IEnumerable<T>` 与 `IQueryable<T>` 在执行位置（client vs server）上的差异。
- 推导 `yield return` 状态机在 `MoveNext` 与 `Current` 之间的状态转移逻辑。
- 区分表达式树（`Expression<TDelegate>`）与委托（`Func<T,TResult>`）在 LINQ 中的角色差异。

### 1.3 Apply（应用）

- 为大型数据集设计流式处理管道，避免一次性加载到内存。
- 在自定义集合类型上实现 `IEnumerable<T>` 与 `IQueryable<T>`。
- 使用 `Expression<TDelegate>` 构建动态查询过滤器（filter builder）。

### 1.4 Analyze（分析）

- 对照 Roslyn 源码分析 `yield return` 重写（`IteratorRewriter`）与 `async` 重写（`AsyncRewriter`）的相似与差异。
- 解构 `System.Linq.Enumerable.Where` 与 `System.Linq.Queryable.Where` 的实现差异。
- 对比 `GroupBy` 延迟返回 `IEnumerable<IGrouping<K,T>>` 但内部 `Lookup` 已构造的两面性。

### 1.5 Evaluate（评价）

- 评估在 EF Core 中过早调用 `AsEnumerable()` 的性能代价。
- 评判 LINQ 表达式树作为"代码即数据"（code as data）的元编程能力与限制。
- 比较 PLINQ（`AsParallel`）与 `IAsyncEnumerable<T>` 在并行/异步场景下的适用性。

### 1.6 Create（创造）

- 设计一个自定义 LINQ Provider（如 Elasticsearch LINQ Provider），将 `IQueryable<T>` 翻译为 DSL 查询。
- 实现一个表达式树可视化工具，将 `Expression` 转换为 SQL/JSON/可视化 AST。
- 构建一个静态分析器（基于 Roslyn），检测代码库中潜在的多次枚举陷阱。

---

## 2. 历史动机与发展脉络

### 2.1 LINQ 之前：命令式查询的时代（C# 1.x-2.0，2002-2005）

在 LINQ 之前，C# 开发者处理集合数据需要：

- **循环 + 条件**：`foreach` + `if` + `List<T>.Add`。
- **SQL 字符串**：数据库查询是字符串拼接，无类型安全。
- **XPath/XSLT**：XML 处理是另一套查询语言。

```csharp
// C# 1.x 风格：命令式过滤
List<Customer> result = new List<Customer>();
foreach (Customer c in customers)
{
    if (c.Age > 18 && c.City == "Shanghai")
        result.Add(c);
}
// 字符串 SQL
string sql = "SELECT * FROM Customers WHERE Age > 18 AND City = 'Shanghai'";
```

痛点：

- **查询逻辑散落**：业务规则与控制流混合。
- **类型不安全**：SQL 字符串编译期无法检查。
- **不同数据源不同语言**：SQL、XML、对象各有查询方式。

### 2.2 C# 3.0 与 LINQ 的诞生（2007）

C# 3.0 引入 LINQ（Language Integrated Query），设计目标：

1. **统一查询语法**：对象、数据库、XML 共用一套语法。
2. **类型安全**：编译期检查字段类型与查询签名。
3. **可组合**：查询可链式组合，避免重复。
4. **延迟执行**：查询定义与执行分离。

支撑 LINQ 的语言特性：

- **扩展方法**（extension methods）：使 `Where`、`Select` 等成为"操作符"。
- **Lambda 表达式**：`x => x.Age > 18` 简洁的谓词。
- **表达式树**：`Expression<Func<T,bool>>` 将 Lambda 编译为数据。
- **匿名类型**：`new { Name = c.Name, Age = c.Age }`。
- **隐式类型**：`var` 让编译器推断查询结果类型。
- **对象初始化器**：`new Customer { Name = "x" }`。

### 2.3 .NET Framework 3.5 的 LINQ 实现

LINQ 在 .NET Framework 3.5 中首次发布，包含三个核心实现：

1. **LINQ to Objects**：基于 `IEnumerable<T>`，操作内存集合。
2. **LINQ to SQL**：基于 `IQueryable<T>`，翻译为 SQL（SQL Server 专用）。
3. **LINQ to XML**：基于 `XElement`，操作 XML 文档。

后续还出现了：

- **LINQ to Entities**（EF / EF Core）：跨数据库 ORM。
- **LINQ to DataSet**：针对 `DataTable` 的扩展。
- **Parallel LINQ（PLINQ）**：基于 `ParallelQuery<T>`，并行执行。
- **Entity Framework Core**：跨平台 ORM，支持 `IQueryable<T>` 翻译。

### 2.4 后续演进：从 C# 3.0 到 C# 12

| 版本 | 年份 | 关键特性 | 对 LINQ 的影响 |
|------|------|----------|----------------|
| C# 3.0 | 2007 | LINQ、扩展方法、Lambda、表达式树 | 延迟执行基础 |
| C# 4.0 | 2010 | 协变/逆变、`dynamic` | `IEnumerable<out T>` 协变 |
| C# 5.0 | 2012 | `async/await` | 异步 LINQ 探索 |
| C# 6.0 | 2015 | `using static`、字符串插值 | 简化查询书写 |
| C# 7.0 | 2017 | 元组、模式匹配 | `Select` 返回元组 |
| C# 8.0 | 2019 | `IAsyncEnumerable<T>`、`await foreach` | 异步 LINQ（System.Linq.Async） |
| C# 9.0 | 2020 | 记录类型、`init` | 不可变查询结果 |
| C# 10.0 | 2021 | 全局 `using`、文件范围命名空间 | 简化项目结构 |
| C# 11.0 | 2022 | `required`、列表模式 | 查询结果验证 |
| C# 12.0 | 2023 | 集合表达式、主构造函数 | `int[] x = [1,2,3]` 简化源数据 |
| C# 13.0 | 2024 | `params ReadOnlySpan<T>` | LINQ 操作符可接受 `ReadOnlySpan` |

### 2.5 .NET Runtime 中 LINQ 的演进

- **.NET Framework 3.5（2007）**：`System.Core.dll` 引入 `Enumerable`、`Queryable` 静态类。
- **.NET Framework 4.0（2010）**：PLINQ（`AsParallel`）。
- **.NET Framework 4.5（2012）**：`IReadOnlyList<T>`、`IReadOnlyCollection<T>` 接口。
- **.NET Core 1.0（2016）**：LINQ 重写为更精简的实现，性能优化。
- **.NET Core 2.0（2017）**：`Enumerable.Append`、`Prepend` 操作符。
- **.NET Core 3.0（2019）**：`Enumerable.Take`、`Skip` 性能优化，引入 `TryGetNonEnumeratedCount`。
- **.NET 5（2020）**：`Enumerable.Chunk`、`MaxBy`、`MinBy`、`DistinctBy`、`ExceptBy`、`UnionBy`、`IntersectBy`。
- **.NET 6（2021）**：`Enumerable.TryGetNonEnumeratedCount`、`Chunk` 优化。
- **.NET 7（2022）**：`Enumerable.Order`、`OrderDescending`（无需谓词）。
- **.NET 8（2023）**：`Enumerable.AggregateBy`、`CountBy`、`Index` 操作符。
- **.NET 9（2024）**：`Enumerable.AsSpan` 扩展、`Where<T>(IEnumerable<T>, Index)` 重载。

### 2.6 学术背景与理论渊源

LINQ 的设计灵感来自多门学科：

- **函数式编程**：Haskell 的惰性求值（lazy evaluation）、列表推导（list comprehension）。
- **数据库理论**：关系代数（selection、projection、join、group）。
- **范畴论**：Monad（`IEnumerable<T>` 是 monad，`SelectMany` 是 bind 操作）。
- **查询优化**：SQL 查询计划与执行计划分离。

Erik Meijer（LINQ 主设计师）在多个场合提到，LINQ 的本质是"对 monad 的查询"。

---

## 3. 形式化定义

### 3.1 延迟执行与立即执行的数学定义

设 $Q$ 为一个查询表达式，$D$ 为数据源，$R$ 为结果。

**延迟执行**（lazy evaluation）：

$$
\text{Lazy}(Q, D) = \lambda.\ \text{Eval}(Q, D)
$$

即 $Q$ 本身是一个 thunk（未求值的表达式），仅在需要时调用 $\text{Eval}$。

**立即执行**（eager evaluation）：

$$
\text{Eager}(Q, D) = \text{Eval}(Q, D)
$$

即调用时立即求值并返回结果。

### 3.2 IEnumerable<T> 的形式化定义

`IEnumerable<T>` 接口在 ECMA-335（CLI 规范）Partition IV 中定义：

```csharp
public interface IEnumerable<out T> : IEnumerable
{
    IEnumerator<T> GetEnumerator();
}

public interface IEnumerator<out T> : IEnumerator, IDisposable
{
    T Current { get; }
    bool MoveNext();
    void Reset();
}
```

形式化语义：

$$
\text{IEnumerable}(T) \iff \exists \text{GetEnumerator}: () \to \text{IEnumerator}(T)
$$

$$
\text{IEnumerator}(T) \implies \text{StatefulStream of } T
$$

其中 `IEnumerator<T>` 是一个**有状态的流**（stateful stream），每次 `MoveNext` 推进一个元素，`Current` 返回当前元素。

### 3.3 迭代器模式的形式化

迭代器（iterator）遵循如下协议：

$$
\text{Iterator} = (S, \text{next}, \text{current}, \text{hasNext})
$$

其中 $S$ 是状态空间，`next: S → S` 推进状态，`current: S → T` 返回当前值，`hasNext: S → bool` 判断是否到达末尾。

`yield return` 编译器生成的状态机正是实现了这个协议。

### 3.4 IQueryable<T> 与表达式树

`IQueryable<T>` 接口定义：

```csharp
public interface IQueryable<out T> : IEnumerable<T>, IQueryable
{
    // 继承自 IQueryable
    Type ElementType { get; }
    Expression Expression { get; }
    IQueryProvider Provider { get; }
}

public interface IQueryProvider
{
    IQueryable CreateQuery(Expression expression);
    IQueryable<TElement> CreateQuery<TElement>(Expression expression);
    object? Execute(Expression expression);
    TResult Execute<TResult>(Expression expression);
}
```

形式化：

$$
\text{IQueryable}(T) = (\text{Expression}, \text{Provider})
$$

其中 `Expression` 是描述查询的表达式树，`Provider` 是将表达式翻译为目标语言（如 SQL）并执行的对象。

### 3.5 表达式树的形式化

`Expression<TDelegate>` 是 C# 编译器对 Lambda 表达式的"数据化"表示。形式上：

$$
\text{Expression}(\lambda x.\ E) = \text{AST}(\lambda x.\ E)
$$

即表达式树是 Lambda 的抽象语法树（AST）。可以遍历、修改、翻译为其他语言。

C# 编译器根据上下文决定 Lambda 编译为委托还是表达式树：

```csharp
Func<int, bool> f = x => x > 0;                  // 委托（IL 代码）
Expression<Func<int, bool>> e = x => x > 0;      // 表达式树（AST 数据）
```

### 3.6 操作符分类

LINQ 操作符按求值时机分类：

| 类型 | 求值时机 | 返回类型 | 典型操作符 |
|------|----------|----------|------------|
| 延迟流式（streaming） | 枚举时 | `IEnumerable<T>` | `Where`、`Select`、`Take`、`Skip` |
| 延迟缓冲（buffered） | 枚举时（缓冲一次） | `IEnumerable<T>` | `OrderBy`、`GroupBy`、`Reverse`、`Distinct` |
| 立即（immediate） | 调用时 | 任意 | `ToList`、`ToArray`、`Count`、`First`、`Any`、`Aggregate` |

形式化分类：

$$
\text{Op}(f) = \begin{cases}
\text{Lazy Streaming} & \text{if } f: \text{IEnumerable}(T) \to \text{IEnumerable}(U) \land \text{one-element-at-a-time} \\
\text{Lazy Buffered} & \text{if } f: \text{IEnumerable}(T) \to \text{IEnumerable}(U) \land \text{buffers full source} \\
\text{Immediate} & \text{if } f: \text{IEnumerable}(T) \to V \ (V \neq \text{IEnumerable})
\end{cases}
$$

### 3.7 ECMA-334 与 ECMA-335 的视角

- **ECMA-334（C# 语言规范）**：第 8.2 节定义查询表达式（query expression）的语法。
- **ECMA-335（CLI 规范）**：Partition IV 定义 `System.Collections.Generic.IEnumerable<T>`、`IEnumerator<T>` 的 IL 签名。

查询表达式的语法形式：

$$
\textit{QueryExpression} ::= \textit{FromClause}\ \textit{QueryBody}
$$

$$
\textit{FromClause} ::= \texttt{from}\ \textit{Type}\ \textit{Identifier}\ \texttt{in}\ \textit{Expression}
$$

$$
\textit{QueryBody} ::= (\textit{QueryBodyClause})*\ (\textit{SelectClause}\ |\ \textit{GroupClause})?
$$

C# 编译器将查询表达式转换为方法调用（method call）形式：

```csharp
// 查询表达式
var q = from c in customers
        where c.Age > 18
        select c.Name;

// 等价的方法调用（编译器转换后）
var q = customers.Where(c => c.Age > 18).Select(c => c.Name);
```

---

## 4. 理论推导与原理解析

### 4.1 yield return 状态机重写

考虑以下迭代器方法：

```csharp
public static IEnumerable<int> Generate(int n)
{
    for (int i = 0; i < n; i++)
    {
        yield return i * i;
    }
}
```

编译器将其重写为状态机（伪代码）：

```csharp
[CompilerGenerated]
private sealed class GenerateIterator : IEnumerable<int>,
    IEnumerator<int>, IEnumerable, IEnumerator, IDisposable
{
    private int <>1__state;          // 状态值
    private int <>2__current;        // 当前值
    private int <>l__initialThreadId; // 初始线程 ID
    private int n;                   // 参数
    private int i;                   // 局部变量提升

    private GenerateIterator(int state)
    {
        this.<>1__state = state;
        this.<>l__initialThreadId = Environment.CurrentManagedThreadId;
    }

    public IEnumerator<int> GetEnumerator()
    {
        if (this.<>1__state == 0 && this.<>l__initialThreadId == Environment.CurrentManagedThreadId)
        {
            this.<>1__state = 1;
            return this;
        }
        return new GenerateIterator(1) { n = this.n };
    }

    public bool MoveNext()
    {
        switch (this.<>1__state)
        {
            default:
                return false;
            case 1:
                this.<>1__state = -1;
                this.i = 0;
                while (this.i < this.n)
                {
                    this.<>2__current = this.i * this.i;
                    this.<>1__state = 2;
                    return true;
                case 2:
                    this.<>1__state = -1;
                    this.i++;
                }
                break;
        }
        return false;
    }

    public int Current => this.<>2__current;
    object IEnumerator.Current => this.<>2__current;
    public void Dispose() { }
    public void Reset() => throw new NotSupportedException();
}
```

### 4.2 yield 状态机的状态转移图

设 `Generate(3)` 的执行过程：

$$
\begin{aligned}
& s_{\text{init}} \xrightarrow{\text{GetEnumerator}} s_1 \\
& s_1 \xrightarrow{\text{MoveNext}, i=0} s_2\ (\text{return } 0) \\
& s_2 \xrightarrow{\text{MoveNext}, i=1} s_2\ (\text{return } 1) \\
& s_2 \xrightarrow{\text{MoveNext}, i=2} s_2\ (\text{return } 4) \\
& s_2 \xrightarrow{\text{MoveNext}, i=3, exit loop} s_{\text{final}}
\end{aligned}
$$

每次 `MoveNext` 返回 `true` 时，`Current` 被设置为下一个 `yield return` 的值。

### 4.3 延迟执行的"洋葱"模型

LINQ 查询是嵌套的迭代器：

```csharp
var q = src.Where(x => x > 0).Select(x => x * 2);
```

等价于：

```csharp
IEnumerable<int> q = new SelectIterator<int, int>(
    new WhereIterator<int>(src, x => x > 0),
    x => x * 2);
```

枚举 `q` 时：

1. `SelectIterator.MoveNext()` 调用 `WhereIterator.MoveNext()`。
2. `WhereIterator.MoveNext()` 枚举 `src`，找到第一个满足 `x > 0` 的元素。
3. `SelectIterator` 对该元素应用 `x => x * 2`，作为 `Current` 返回。

这是**拉取模型**（pull-based），消费者拉一个元素，源头流式过滤一个元素。

### 4.4 OrderBy 的缓冲特性

`OrderBy` 是延迟但缓冲的操作符：

```csharp
var q = src.OrderBy(x => x);
// 此时 q 是 IOrderedEnumerable<int>，未排序
foreach (var x in q) { /* 此时才排序 */ }
```

`OrderBy` 内部使用缓冲：

1. 首次 `MoveNext` 时，整个 `src` 被加载到内部数组。
2. 数组排序（`Array.Sort`，O(n log n)）。
3. 后续 `MoveNext` 返回排序后的元素。

形式化：

$$
\text{OrderBy}(src, key) = \text{Buffer}(src) \to \text{Sort} \to \text{Stream}
$$

即"先全量缓冲，再排序，最后流式输出"。

### 4.5 GroupBy 的两面性

`GroupBy` 返回 `IEnumerable<IGrouping<K,T>>`，看起来是延迟的，但实际上：

- `GroupBy` 返回一个延迟的 `IEnumerable`。
- 首次枚举时，整个 `src` 被加载并构造 `Lookup<K, T>`（哈希表）。
- 后续枚举从 `Lookup` 中读取分组。

形式化：

$$
\text{GroupBy}(src, key) = \text{Lazy}(\text{Build}(\text{Lookup}, src, key))
$$

### 4.6 IEnumerable vs IQueryable 的执行模型

#### 4.6.1 IEnumerable<T> 模型

```csharp
// 客户端执行
var q = dbContext.Users.AsEnumerable()
    .Where(u => u.Age > 18);  // 在内存中过滤
```

执行过程：

1. `AsEnumerable()` 触发数据库查询 `SELECT * FROM Users`，全量加载。
2. `Where` 在内存中逐个过滤。

#### 4.6.2 IQueryable<T> 模型

```csharp
// 服务端执行
var q = dbContext.Users
    .Where(u => u.Age > 18);  // 翻译为 SQL WHERE
```

执行过程：

1. `Where` 接受 `Expression<Func<User, bool>>`，将谓词添加到表达式树。
2. 枚举时（`foreach` 或 `ToListAsync`），EF Core 将表达式树翻译为 SQL。
3. 数据库执行 `SELECT * FROM Users WHERE Age > 18`，仅返回匹配行。

#### 4.6.3 形式化对比

$$
\text{IEnumerable}(T): \text{Client-side}, \text{streaming}, \text{in-memory}
$$

$$
\text{IQueryable}(T): \text{Server-side}, \text{translated}, \text{query language}
$$

### 4.7 表达式树的遍历与翻译

表达式树是 C# 的"代码即数据"实现。EF Core 通过 `ExpressionVisitor` 遍历树并翻译为 SQL。

考虑：

```csharp
var q = dbContext.Users
    .Where(u => u.Age > 18 && u.City == "Shanghai")
    .OrderBy(u => u.Name)
    .Select(u => new { u.Name, u.Age });
```

表达式树（简化）：

```
MethodCallExpression (Select)
├── Method: Queryable.Select
├── Arguments:
│   ├── MethodCallExpression (OrderBy)
│   │   ├── Method: Queryable.OrderBy
│   │   ├── Arguments:
│   │   │   ├── MethodCallExpression (Where)
│   │   │   │   ├── Method: Queryable.Where
│   │   │   │   ├── Arguments:
│   │   │   │   │   ├── ConstantExpression (Users DbSet)
│   │   │   │   │   └── UnaryExpression (Quote)
│   │   │   │   │       └── Expression<Func<User, bool>> (u => u.Age > 18 && u.City == "Shanghai")
│   │   │   └── UnaryExpression (Quote)
│   │   │       └── Expression<Func<User, string>> (u => u.Name)
│   └── UnaryExpression (Quote)
│       └── Expression<Func<User, {Name, Age}>> (u => new { u.Name, u.Age })
```

EF Core 的 `QueryTranslator` 遍历此树，生成：

```sql
SELECT u.Name, u.Age
FROM Users AS u
WHERE u.Age > 18 AND u.City = 'Shanghai'
ORDER BY u.Name
```

### 4.8 表达式树的不可变性与重建

`Expression` 是不可变的。修改表达式树需要创建新的节点。`ExpressionVisitor` 提供了遍历与重建的便捷模式：

```csharp
public class ExpressionReplacer : ExpressionVisitor
{
    private readonly Expression _old;
    private readonly Expression _new;

    public ExpressionReplacer(Expression old, Expression newExpr)
    {
        _old = old;
        _new = newExpr;
    }

    protected override Expression VisitParameter(ParameterExpression node)
    {
        return node == _old ? _new : base.VisitParameter(node);
    }
}

// 使用：将表达式树中的参数替换为新参数
var expr = (Expression<Func<User, bool>>)(u => u.Age > 18);
var newParam = Expression.Parameter(typeof(User), "x");
var visitor = new ExpressionReplacer(expr.Parameters[0], newParam);
var newBody = visitor.Visit(expr.Body);
var newExpr = Expression.Lambda<Func<User, bool>>(newBody, newParam);
```

### 4.9 多次枚举的代价

延迟执行的副作用：每次枚举都重新执行查询。

```csharp
var q = dbContext.Users.Where(u => u.Age > 18);

foreach (var u in q) { /* 查询数据库 1 */ }
foreach (var u in q) { /* 查询数据库 2 */ }
var count = q.Count(); /* 查询数据库 3 */
```

形式化：

$$
\text{Cost}(q, n) = n \cdot \text{Cost}(\text{Eval}(q))
$$

其中 $n$ 是枚举次数。修复方法：用 `ToList()` 缓存。

$$
\text{Cost}(\text{ToList}(q)) = \text{Cost}(\text{Eval}(q)) + O(1) \cdot \text{access}
$$

### 4.10 闭包与变量捕获

Lambda 捕获外部变量时，编译器生成闭包类：

```csharp
int threshold = 18;
var q = users.Where(u => u.Age > threshold);
```

编译器生成：

```csharp
private sealed class Closure
{
    public int threshold;
    public bool Lambda(User u) => u.Age > this.threshold;
}

var c = new Closure { threshold = 18 };
var q = users.Where(new Func<User, bool>(c.Lambda));
```

闭包延迟执行时，`threshold` 的值是**当前**值，而非定义时的值：

```csharp
int threshold = 18;
var q = users.Where(u => u.Age > threshold);
threshold = 21;  // 修改
foreach (var u in q) { /* 使用 threshold=21 */ }
```

### 4.11 性能模型

设 $n$ 为源大小，$m$ 为操作符数量，$c$ 为单元素处理成本。

延迟流式（如 `Where`+`Select`）：

$$
T(n, m) = O(n \cdot m \cdot c)
$$

延迟缓冲（如 `OrderBy`）：

$$
T(n, m) = O(n \log n + n \cdot m \cdot c)
$$

立即执行（如 `ToList`）：

$$
T(n, m) = O(n \cdot m \cdot c)
$$

但内存占用差异：

- 流式：$O(1)$（常数缓冲）
- 缓冲：$O(n)$
- 立即：$O(n)$

---

## 5. 代码示例

### 5.1 基础示例：延迟 vs 立即

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

public class Program
{
    public static void Main()
    {
        var numbers = new List<int> { 1, 2, 3, 4, 5 };

        // 延迟执行：定义时不执行
        Console.WriteLine("Defining query...");
        var query = numbers
            .Where(n => { Console.WriteLine($"  Where {n}"); return n > 2; })
            .Select(n => { Console.WriteLine($"  Select {n}"); return n * 10; });
        Console.WriteLine("Query defined, not executed yet.");

        // 枚举时执行
        Console.WriteLine("Enumerating...");
        foreach (var x in query)
        {
            Console.WriteLine($"Got: {x}");
        }

        // 再次枚举：重新执行
        Console.WriteLine("Enumerating again...");
        foreach (var x in query)
        {
            Console.WriteLine($"Got: {x}");
        }

        // 立即执行：ToList 缓存结果
        Console.WriteLine("Calling ToList...");
        var cached = query.ToList();
        Console.WriteLine($"Cached: {string.Join(", ", cached)}");

        // 修改源数据
        numbers.Add(6);
        Console.WriteLine($"Cached after add 6: {string.Join(", ", cached)}");  // 不变
        Console.WriteLine($"Query after add 6:");
        foreach (var x in query) Console.WriteLine($"  {x}");  // 包含 60
    }
}
```

### 5.2 yield return 自定义操作符

```csharp
using System;
using System.Collections.Generic;

public static class MyLinqExtensions
{
    /// <summary>
    /// 自定义延迟操作符：返回每隔 step 的元素。
    /// </summary>
    public static IEnumerable<T> Every<T>(this IEnumerable<T> source, int step)
    {
        if (source == null) throw new ArgumentNullException(nameof(source));
        if (step < 1) throw new ArgumentOutOfRangeException(nameof(step));

        return EveryIterator(source, step);
    }

    private static IEnumerable<T> EveryIterator<T>(IEnumerable<T> source, int step)
    {
        int index = 0;
        foreach (var item in source)
        {
            if (index % step == 0)
                yield return item;
            index++;
        }
    }

    /// <summary>
    /// 自定义立即操作符：返回中位数。
    /// </summary>
    public static double Median(this IEnumerable<int> source)
    {
        if (source == null) throw new ArgumentNullException(nameof(source));

        var sorted = source.OrderBy(x => x).ToList();
        int count = sorted.Count;
        if (count == 0) throw new InvalidOperationException("Sequence is empty");

        if (count % 2 == 0)
        {
            return (sorted[count / 2 - 1] + sorted[count / 2]) / 2.0;
        }
        else
        {
            return sorted[count / 2];
        }
    }

    /// <summary>
    /// 自定义延迟操作符：滑动窗口。
    /// </summary>
    public static IEnumerable<IEnumerable<T>> Window<T>(
        this IEnumerable<T> source, int size)
    {
        if (source == null) throw new ArgumentNullException(nameof(source));
        if (size < 1) throw new ArgumentOutOfRangeException(nameof(size));

        return WindowIterator(source, size);
    }

    private static IEnumerable<IEnumerable<T>> WindowIterator<T>(
        IEnumerable<T> source, int size)
    {
        var window = new Queue<T>(size);
        foreach (var item in source)
        {
            if (window.Count == size)
                window.Dequeue();
            window.Enqueue(item);
            if (window.Count == size)
                yield return window.ToList();  // 复制避免外部修改
        }
    }
}

public class Program
{
    public static void Main()
    {
        var nums = Enumerable.Range(1, 10);

        Console.WriteLine("Every(3): " + string.Join(", ", nums.Every(3)));
        Console.WriteLine("Median: " + nums.Median());
        Console.WriteLine("Windows:");
        foreach (var w in nums.Window(3))
        {
            Console.WriteLine("  [" + string.Join(", ", w) + "]");
        }
    }
}
```

### 5.3 EF Core 中的 IQueryable 翻译

```csharp
// 项目结构
// LinqEfDemo/
// ├── LinqEfDemo.csproj
// ├── Program.cs
// ├── Models/
// │   ├── User.cs
// │   └── AppDbContext.cs

// LinqEfDemo.csproj
// <Project Sdk="Microsoft.NET.Sdk">
//   <PropertyGroup>
//     <OutputType>Exe</OutputType>
//     <TargetFramework>net9.0</TargetFramework>
//     <Nullable>enable</Nullable>
//     <ImplicitUsings>enable</ImplicitUsings>
//   </PropertyGroup>
//   <ItemGroup>
//     <PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="9.0.0" />
//     <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="9.0.0" />
//   </ItemGroup>
// </Project>

// Models/User.cs
using System.ComponentModel.DataAnnotations;

public class User
{
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    public int Age { get; set; }

    public string City { get; set; } = string.Empty;
}

// Models/AppDbContext.cs
using Microsoft.EntityFrameworkCore;

public class AppDbContext : DbContext
{
    public DbSet<User> Users => Set<User>();

    protected override void OnConfiguring(DbContextOptionsBuilder options)
    {
        options.UseSqlite("Data Source=app.db")
               .LogTo(Console.WriteLine, Microsoft.Extensions.Logging.LogLevel.Information);
    }
}

// Program.cs
using Microsoft.EntityFrameworkCore;

public class Program
{
    public static async Task Main()
    {
        using var db = new AppDbContext();
        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();

        // 初始化数据
        db.Users.AddRange(
            new User { Name = "Alice", Age = 25, City = "Shanghai" },
            new User { Name = "Bob", Age = 17, City = "Beijing" },
            new User { Name = "Charlie", Age = 30, City = "Shanghai" },
            new User { Name = "Diana", Age = 19, City = "Shenzhen" }
        );
        await db.SaveChangesAsync();

        // IQueryable：服务端过滤
        Console.WriteLine("=== IQueryable (Server-side) ===");
        var adults = db.Users.Where(u => u.Age >= 18);
        foreach (var u in adults)
        {
            Console.WriteLine($"  {u.Name}, {u.Age}");
        }
        // 生成的 SQL：SELECT * FROM Users WHERE Age >= 18

        // IEnumerable：客户端过滤
        Console.WriteLine("\n=== IEnumerable (Client-side) ===");
        var allUsers = db.Users.AsEnumerable();
        var shanghai = allUsers.Where(u => u.City == "Shanghai");
        foreach (var u in shanghai)
        {
            Console.WriteLine($"  {u.Name}, {u.City}");
        }
        // 生成的 SQL：SELECT * FROM Users（全部加载，然后内存过滤）

        // 错误：过早 AsEnumerable
        Console.WriteLine("\n=== Wrong: AsEnumerable too early ===");
        var wrong = db.Users
            .AsEnumerable()  // 这里就执行了 SELECT * FROM Users
            .Where(u => u.Age >= 18)
            .OrderBy(u => u.Name);
        foreach (var u in wrong)
        {
            Console.WriteLine($"  {u.Name}");
        }

        // 正确：保持 IQueryable 链
        Console.WriteLine("\n=== Correct: Keep IQueryable ===");
        var right = db.Users
            .Where(u => u.Age >= 18)
            .OrderBy(u => u.Name);
        foreach (var u in right)
        {
            Console.WriteLine($"  {u.Name}");
        }
        // 生成的 SQL：SELECT * FROM Users WHERE Age >= 18 ORDER BY Name

        // 动态查询：表达式树拼接
        Console.WriteLine("\n=== Dynamic query ===");
        var filter = BuildFilter("Shanghai", 20);
        var dyn = db.Users.Where(filter);
        foreach (var u in dyn)
        {
            Console.WriteLine($"  {u.Name}, {u.City}, {u.Age}");
        }
    }

    /// <summary>
    /// 动态构建表达式树过滤器。
    /// </summary>
    static System.Linq.Expressions.Expression<Func<User, bool>> BuildFilter(
        string? city, int? minAge)
    {
        var param = System.Linq.Expressions.Expression.Parameter(typeof(User), "u");
        System.Linq.Expressions.Expression? body = null;

        if (city != null)
        {
            var cityProp = System.Linq.Expressions.Expression.Property(param, nameof(User.City));
            var cityVal = System.Linq.Expressions.Expression.Constant(city);
            var eq = System.Linq.Expressions.Expression.Equal(cityProp, cityVal);
            body = eq;
        }

        if (minAge.HasValue)
        {
            var ageProp = System.Linq.Expressions.Expression.Property(param, nameof(User.Age));
            var ageVal = System.Linq.Expressions.Expression.Constant(minAge.Value);
            var gt = System.Linq.Expressions.Expression.GreaterThanOrEqual(ageProp, ageVal);
            body = body == null ? gt : System.Linq.Expressions.Expression.AndAlso(body, gt);
        }

        body ??= System.Linq.Expressions.Expression.Constant(true);
        return System.Linq.Expressions.Expression.Lambda<Func<User, bool>>(body, param);
    }
}
```

### 5.4 流式处理大文件

```csharp
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

public class Program
{
    public static void Main()
    {
        var filePath = "large_data.csv";

        // 生成测试数据
        File.WriteAllLines(filePath, Enumerable.Range(0, 1_000_000)
            .Select(i => $"user{i},{18 + (i % 50)},city{i % 10}"));

        // 流式处理：每行处理，内存占用低
        var stats = File.ReadLines(filePath)  // 延迟读取
            .Select(line => line.Split(','))
            .Where(parts => parts.Length == 3)
            .Select(parts => new
            {
                Name = parts[0],
                Age = int.Parse(parts[1]),
                City = parts[2]
            })
            .GroupBy(u => u.City)
            .Select(g => new { City = g.Key, Count = g.Count(), AvgAge = g.Average(u => u.Age) })
            .OrderByDescending(s => s.Count);

        // 此时 stats 是延迟的，未执行

        foreach (var stat in stats)
        {
            Console.WriteLine($"City {stat.City}: {stat.Count} users, avg age {stat.AvgAge:F1}");
        }

        // 注意：GroupBy 会缓冲！如果数据量极大，考虑分块处理
    }
}
```

### 5.5 表达式树可视化

```csharp
using System;
using System.Linq.Expressions;
using System.Text;

public class ExpressionVisualizer
{
    /// <summary>
    /// 将表达式树转换为可读的字符串表示。
    /// </summary>
    public static string Visualize(Expression expr)
    {
        var sb = new StringBuilder();
        VisualizeImpl(expr, sb, 0);
        return sb.ToString();
    }

    private static void VisualizeImpl(Expression expr, StringBuilder sb, int indent)
    {
        var prefix = new string(' ', indent * 2);
        sb.AppendLine($"{prefix}{expr.GetType().Name}: {expr.NodeType}");

        switch (expr)
        {
            case LambdaExpression lambda:
                sb.AppendLine($"{prefix}  Parameters:");
                foreach (var p in lambda.Parameters)
                    sb.AppendLine($"{prefix}    {p.Name}: {p.Type.Name}");
                sb.AppendLine($"{prefix}  Body:");
                VisualizeImpl(lambda.Body, sb, indent + 2);
                break;

            case BinaryExpression binary:
                sb.AppendLine($"{prefix}  Left:");
                VisualizeImpl(binary.Left, sb, indent + 2);
                sb.AppendLine($"{prefix}  Right:");
                VisualizeImpl(binary.Right, sb, indent + 2);
                break;

            case MethodCallExpression call:
                sb.AppendLine($"{prefix}  Method: {call.Method.Name}");
                sb.AppendLine($"{prefix}  Arguments:");
                foreach (var arg in call.Arguments)
                    VisualizeImpl(arg, sb, indent + 2);
                break;

            case MemberExpression member:
                sb.AppendLine($"{prefix}  Member: {member.Member.Name}");
                if (member.Expression != null)
                {
                    sb.AppendLine($"{prefix}  Target:");
                    VisualizeImpl(member.Expression, sb, indent + 2);
                }
                break;

            case ConstantExpression constant:
                sb.AppendLine($"{prefix}  Value: {constant.Value}");
                break;

            case ParameterExpression parameter:
                sb.AppendLine($"{prefix}  Name: {parameter.Name}, Type: {parameter.Type.Name}");
                break;

            case UnaryExpression unary:
                sb.AppendLine($"{prefix}  Operand:");
                VisualizeImpl(unary.Operand, sb, indent + 2);
                break;
        }
    }
}

public class Program
{
    public static void Main()
    {
        Expression<Func<User, bool>> expr = u => u.Age > 18 && u.City == "Shanghai";
        Console.WriteLine(ExpressionVisualizer.Visualize(expr));
    }
}

public class User
{
    public string Name { get; set; } = "";
    public int Age { get; set; }
    public string City { get; set; } = "";
}
```

### 5.6 企业级：自定义 LINQ Provider

下面演示一个简化的自定义 LINQ Provider，将 `IQueryable<T>` 翻译为简单的 DSL。

```csharp
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;

/// <summary>
/// 自定义 LINQ Provider：将查询翻译为伪 SQL 字符串。
/// </summary>
public class SimpleQueryProvider : IQueryProvider
{
    public IQueryable CreateQuery(Expression expression)
    {
        var elementType = expression.Type.GetGenericArguments()[0];
        var queryType = typeof(SimpleQueryable<>).MakeGenericType(elementType);
        return (IQueryable)Activator.CreateInstance(queryType, new object[] { this, expression })!;
    }

    public IQueryable<TElement> CreateQuery<TElement>(Expression expression)
    {
        return new SimpleQueryable<TElement>(this, expression);
    }

    public object? Execute(Expression expression)
    {
        throw new NotImplementedException("Execute is not implemented.");
    }

    public TResult Execute<TResult>(Expression expression)
    {
        // 这里应该实际执行查询，简化版只翻译并返回默认值
        var sql = Translate(expression);
        Console.WriteLine($"[SQL] {sql}");
        return default!;
    }

    /// <summary>
    /// 将表达式树翻译为伪 SQL。
    /// </summary>
    public string Translate(Expression expression)
    {
        var visitor = new SqlTranslatorVisitor();
        visitor.Visit(expression);
        return visitor.GetSql();
    }
}

public class SimpleQueryable<T> : IQueryable<T>
{
    public SimpleQueryable(SimpleQueryProvider provider)
    {
        Provider = provider;
        Expression = Expression.Constant(this);
    }

    public SimpleQueryable(SimpleQueryProvider provider, Expression expression)
    {
        Provider = provider;
        Expression = expression;
    }

    public Type ElementType => typeof(T);
    public Expression Expression { get; }
    public IQueryProvider Provider { get; }

    public IEnumerator<T> GetEnumerator()
    {
        // 简化：实际应从数据库枚举
        return Enumerable.Empty<T>().GetEnumerator();
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}

public class SqlTranslatorVisitor : ExpressionVisitor
{
    private readonly StringBuilder _sql = new();
    private bool _inWhere = false;

    public string GetSql() => _sql.ToString();

    protected override Expression VisitMethodCall(MethodCallExpression node)
    {
        if (node.Method.Name == "Where")
        {
            _sql.Append("SELECT * FROM (");
            Visit(node.Arguments[0]);
            _sql.Append(") WHERE ");

            // 提取 Lambda
            var lambda = (LambdaExpression)((UnaryExpression)node.Arguments[1]).Operand;
            _inWhere = true;
            Visit(lambda.Body);
            _inWhere = false;
        }
        else if (node.Method.Name == "Select")
        {
            _sql.Append("SELECT ");
            var lambda = (LambdaExpression)((UnaryExpression)node.Arguments[1]).Operand;
            Visit(lambda.Body);
            _sql.Append(" FROM (");
            Visit(node.Arguments[0]);
            _sql.Append(")");
        }
        return node;
    }

    protected override Expression VisitBinary(BinaryExpression node)
    {
        _sql.Append("(");
        Visit(node.Left);
        _sql.Append($" {GetOperator(node.NodeType)} ");
        Visit(node.Right);
        _sql.Append(")");
        return node;
    }

    protected override Expression VisitMember(MemberExpression node)
    {
        _sql.Append(node.Member.Name);
        return node;
    }

    protected override Expression VisitConstant(ConstantExpression node)
    {
        if (node.Value is string s)
            _sql.Append($"'{s}'");
        else if (node.Value != null)
            _sql.Append(node.Value.ToString());
        return node;
    }

    private string GetOperator(ExpressionType type) => type switch
    {
        ExpressionType.AndAlso => "AND",
        ExpressionType.OrElse => "OR",
        ExpressionType.Equal => "=",
        ExpressionType.NotEqual => "!=",
        ExpressionType.GreaterThan => ">",
        ExpressionType.GreaterThanOrEqual => ">=",
        ExpressionType.LessThan => "<",
        ExpressionType.LessThanOrEqual => "<=",
        _ => type.ToString()
    };
}

public class User
{
    public string Name { get; set; } = "";
    public int Age { get; set; }
    public string City { get; set; } = "";
}

public class Program
{
    public static void Main()
    {
        var provider = new SimpleQueryProvider();
        IQueryable<User> users = new SimpleQueryable<User>(provider);

        var q = users.Where(u => u.Age > 18 && u.City == "Shanghai");

        // 触发翻译
        var result = provider.Execute<List<User>>(q.Expression);
    }
}
```

---

## 6. 对比分析

### 6.1 与 Java Stream API 的对比

| 维度 | C# LINQ | Java Stream |
|------|---------|-------------|
| 语法 | 查询表达式 + 方法链 | 仅方法链 |
| 数据源 | `Iterable<T>`、`IQueryable<T>` | `Collection<T>`、`Stream<T>` |
| 求值 | 延迟 + 立即 | 仅延迟（终端操作） |
| 重用 | `IEnumerable<T>` 可多次枚举 | `Stream<T>` 单次使用 |
| 表达式树 | 一等公民（`Expression<T>`） | 无 |
| 数据库集成 | EF Core 原生支持 | JPA Criteria（受限） |
| 并行 | PLINQ（`AsParallel`） | `parallelStream()` |

#### 6.1.1 Java 示例

```java
// Java Stream
List<String> result = users.stream()
    .filter(u -> u.getAge() > 18)
    .map(User::getName)
    .collect(Collectors.toList());

// 流只能使用一次
Stream<User> s = users.stream();
s.filter(u -> u.getAge() > 18);  // OK
s.filter(u -> u.getAge() > 18);  // IllegalStateException: stream has already been operated upon
```

#### 6.1.2 C# 等价

```csharp
// C# LINQ
var result = users
    .Where(u => u.Age > 18)
    .Select(u => u.Name)
    .ToList();

// IEnumerable 可多次枚举
IEnumerable<User> e = users;
var r1 = e.Where(u => u.Age > 18);
var r2 = e.Where(u => u.Age > 18);  // OK，重新执行
```

### 6.2 与 Kotlin Sequences 的对比

| 维度 | C# LINQ | Kotlin Sequences |
|------|---------|-------------------|
| 求值 | 延迟（默认） | 延迟（`Sequence`） |
| 立即求值 | `List<T>` 集合 | `List<T>` 集合 |
| 操作符 | `Where`、`Select`、`OrderBy` | `filter`、`map`、`sortedBy` |
| 表达式树 | 有 | 无 |
| 数据库 | EF Core | Exposed（受限） |

#### 6.2.1 Kotlin 示例

```kotlin
// Kotlin Sequence
val result = users.asSequence()
    .filter { it.age > 18 }
    .map { it.name }
    .toList()

// List 是立即求值
val listResult = users
    .filter { it.age > 18 }
    .map { it.name }
```

### 6.3 与 JavaScript Array 方法的对比

| 维度 | C# LINQ | JavaScript Array |
|------|---------|------------------|
| 求值 | 默认延迟 | 立即（每次操作） |
| 链式 | 流式优化 | 每次创建新数组 |
| 数据源 | `IEnumerable<T>` | `Array`、`Iterable` |
| 惰性 | `yield` | Generator（`function*`） |

#### 6.3.1 JavaScript 示例

```javascript
// JavaScript：立即求值
const result = users
    .filter(u => u.age > 18)   // 创建新数组
    .map(u => u.name);          // 再次创建新数组

// Generator：延迟求值
function* filter(iterable, pred) {
    for (const x of iterable) {
        if (pred(x)) yield x;
    }
}
```

### 6.4 与 Haskell List Comprehension 的对比

| 维度 | C# LINQ | Haskell |
|------|---------|---------|
| 求值 | 延迟 | 惰性（默认） |
| 语法 | `from x in xs where ... select ...` | `[f x | x <- xs, pred x]` |
| 类型 | `IEnumerable<T>` | `[a]` |
| Monad | `SelectMany` 是 bind | `>>=` 是 bind |
| 无限列表 | 需 `yield` | 原生支持 |

#### 6.4.1 Haskell 示例

```haskell
-- Haskell list comprehension
result = [name x | x <- users, age x > 18]

-- 等价 C#
-- var result = from u in users where u.Age > 18 select u.Name;

-- 无限列表
primes = sieve [2..]
  where sieve (p:xs) = p : sieve [x | x <- xs, x `mod` p /= 0]
```

### 6.5 与 Python 生成器的对比

| 维度 | C# LINQ | Python |
|------|---------|--------|
| 惰性 | `yield return` | `yield` |
| 生成器 | `IEnumerable<T>` | `Generator` |
| 表达式树 | 有 | 无（有 `ast` 模块） |
| 数据库 | EF Core | SQLAlchemy |

#### 6.5.1 Python 示例

```python
# Python generator
def squares(n):
    for i in range(n):
        yield i * i

# 等价 C#
# IEnumerable<int> Squares(int n) {
#     for (int i = 0; i < n; i++)
#         yield return i * i;
# }
```

### 6.6 综合对比表

| 特性 | C# 12 LINQ | Java 21 Stream | Kotlin 1.9 | JS ES2024 | Haskell | Python 3.12 |
|------|-----------|----------------|------------|-----------|---------|-------------|
| 延迟执行 | 默认 | 终端操作 | Sequence | Generator | 默认 | Generator |
| 表达式树 | 有 | 无 | 无 | 无 | 无 | ast 模块 |
| 数据库集成 | EF Core | JPA Criteria | Exposed | Prisma | 持久层框架 | SQLAlchemy |
| 多次枚举 | 支持 | 不支持 | 支持 | 不支持 | 支持 | 不支持 |
| 并行 | PLINQ | parallelStream | Flow（协程） | Worker | Strategies | multiprocessing |
| 查询表达式 | 有（from...select） | 无 | 无 | 无 | List comprehension | List comprehension |

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱一：多次枚举

```csharp
// 错误：多次枚举，每次重新执行
var q = expensiveDataSource.Where(Filter);

foreach (var x in q) { /* 全量执行 */ }
var count = q.Count();  /* 再次全量执行 */

// 修复：ToList 缓存
var cached = q.ToList();
foreach (var x in cached) { /* 已缓存 */ }
var count = cached.Count;
```

### 7.2 陷阱二：修改源数据

```csharp
var list = new List<int> { 1, 2, 3 };
var q = list.Where(x => x > 1);
list.Add(4);  // 修改源
foreach (var x in q) { /* 包含 4 */ }

// 修复：调用 ToList 冻结
var frozen = list.Where(x => x > 1).ToList();
list.Add(5);
foreach (var x in frozen) { /* 不包含 5 */ }
```

### 7.3 陷阱三：闭包捕获循环变量

```csharp
// C# 5.0+ 修复了 foreach 循环变量捕获，但 for 循环仍有问题
var filters = new List<Func<int, bool>>();
for (int i = 0; i < 3; i++)
{
    filters.Add(n => n > i);  // 所有 Lambda 捕获同一个 i
}
// 循环结束后 i = 3，所有过滤器都是 n > 3

// 修复：循环内复制
for (int i = 0; i < 3; i++)
{
    int local = i;
    filters.Add(n => n > local);
}
```

### 7.4 陷阱四：过早 AsEnumerable

```csharp
// 错误：过早 AsEnumerable，后续在内存中执行
var q = dbContext.Users
    .AsEnumerable()
    .Where(u => u.Age > 18);  // 全部加载，再过滤

// 修复：保持 IQueryable
var q = dbContext.Users
    .Where(u => u.Age > 18);  // 服务端过滤
```

### 7.5 陷阱五：在表达式中调用 C# 方法

```csharp
// 错误：EF Core 无法翻译自定义方法
var q = dbContext.Users.Where(u => IsValidUser(u));

// 修复：内联条件或使用 EF.Functions
var q = dbContext.Users.Where(u => u.Age >= 18 && u.IsActive);
```

### 7.6 陷阱六：First on empty

```csharp
// 错误：空序列抛异常
var first = numbers.First();  // 空序列抛 InvalidOperationException

// 修复：使用 FirstOrDefault
var first = numbers.FirstOrDefault();  // 返回 default(T)
if (first != null) { /* ... */ }
```

### 7.7 陷阱七：Count > 0 vs Any

```csharp
// 不推荐：Count 需要枚举整个序列（对 IEnumerable）
if (numbers.Count() > 0) { }

// 推荐：Any 找到第一个就返回
if (numbers.Any()) { }
```

### 7.8 陷阱八：SelectMany 嵌套

```csharp
// 复杂的 SelectMany
var q = orders
    .SelectMany(o => o.Items, (o, i) => new { Order = o, Item = i })
    .Where(x => x.Item.Price > 100)
    .Select(x => new { x.Order.Id, x.Item.Name });

// 查询表达式等价
var q = from o in orders
        from i in o.Items
        where i.Price > 100
        select new { OrderId = o.Id, ItemName = i.Name };
```

### 7.9 陷阱九：OrderBy 与 ThenBy

```csharp
// 错误：第二个 OrderBy 覆盖第一个
var q = users.OrderBy(u => u.Age).OrderBy(u => u.Name);  // 仅按 Name 排序

// 修复：使用 ThenBy
var q = users.OrderBy(u => u.Age).ThenBy(u => u.Name);  // 先按 Age，再按 Name
```

### 7.10 陷阱十：Distinct 自定义比较

```csharp
// 默认 Distinct 使用 EqualityComparer<T>.Default
var distinct = users.Distinct();  // 引用类型按引用比较

// 自定义比较器
public class UserByNameComparer : IEqualityComparer<User>
{
    public bool Equals(User? x, User? y) => x?.Name == y?.Name;
    public int GetHashCode(User obj) => obj.Name?.GetHashCode() ?? 0;
}

var distinctByName = users.Distinct(new UserByNameComparer());

// .NET 6+ 简化
var distinctByName2 = users.DistinctBy(u => u.Name);
```

### 7.11 最佳实践总结

1. **流式处理大数据**：使用 `File.ReadLines` + LINQ 链。
2. **缓存多次枚举**：用 `ToList` / `ToArray` 冻结结果。
3. **`IQueryable` 保持链式**：避免过早 `AsEnumerable`。
4. **`Any` 替代 `Count() > 0`**：性能更优。
5. **`FirstOrDefault` 替代 `First`**：避免异常。
6. **`OrderBy` + `ThenBy`**：多级排序。
7. **`DistinctBy` / `MinBy` / `MaxBy`**（.NET 6+）：简化自定义。
8. **PLINQ 谨慎使用**：仅在 CPU 密集型 + 大数据量时使用。
9. **`Chunk`**（.NET 6+）：分块处理大数据。
10. **`TryGetNonEnumeratedCount`**（.NET 6+）：避免不必要的枚举。

---

## 8. 工程实践

### 8.1 项目配置

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <LangVersion>12</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <!-- 启用 Tiered PGO 优化 LINQ 性能 -->
    <TieredPGO>true</TieredPGO>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="9.0.0" />
    <PackageReference Include="System.Linq.Async" Version="6.0.1" />
    <PackageReference Include="BenchmarkDotNet" Version="0.13.12" />
  </ItemGroup>

</Project>
```

### 8.2 性能基准

```csharp
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;
using System.Linq;

[MemoryDiagnoser]
public class LinqBenchmark
{
    private static readonly int[] Data = Enumerable.Range(0, 10000).ToArray();

    [Benchmark(Baseline = true)]
    public int CountLinq() => Data.Count(x => x > 5000);

    [Benchmark]
    public int CountFor()
    {
        int count = 0;
        for (int i = 0; i < Data.Length; i++)
            if (Data[i] > 5000) count++;
        return count;
    }

    [Benchmark]
    public List<int> WhereToList() => Data.Where(x => x > 5000).ToList();

    [Benchmark]
    public int SumSelect() => Data.Where(x => x > 5000).Sum();

    [Benchmark]
    public bool Any() => Data.Any(x => x > 9999);

    [Benchmark]
    public bool CountGtZero() => Data.Count(x => x > 9999) > 0;
}

public class Program
{
    public static void Main() => BenchmarkRunner.Run<LinqBenchmark>();
}
```

### 8.3 调试技巧

#### 8.3.1 查看生成的 SQL

```csharp
// EF Core 日志
services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=app.db")
           .LogTo(Console.WriteLine, LogLevel.Information)
           .EnableSensitiveDataLogging());
```

#### 8.3.2 查看 ToQueryString

```csharp
using Microsoft.EntityFrameworkCore;

var q = db.Users.Where(u => u.Age > 18);
Console.WriteLine(q.ToQueryString());
// 输出：SELECT * FROM Users WHERE Age > 18
```

#### 8.3.3 表达式树可视化

Visual Studio 2022 调试时，表达式树有内置可视化器（`Expression Tree Visualizer`）。

### 8.4 异步 LINQ

```csharp
using System.Linq.Async;  // System.Linq.Async NuGet 包

// IAsyncEnumerable 延迟执行
async IAsyncEnumerable<int> GenerateAsync()
{
    for (int i = 0; i < 100; i++)
    {
        await Task.Delay(10);
        yield return i;
    }
}

// 异步 LINQ 操作符
var result = await GenerateAsync()
    .WhereAwait(async x => await FilterAsync(x))
    .SelectAwait(async x => await TransformAsync(x))
    .ToListAsync();

// EF Core 异步查询
var users = await db.Users
    .Where(u => u.Age > 18)
    .OrderBy(u => u.Name)
    .ToListAsync();
```

### 8.5 PLINQ 并行

```csharp
using System.Linq;

// PLINQ：并行执行
var result = Enumerable.Range(0, 1_000_000)
    .AsParallel()
    .WithDegreeOfParallelism(Environment.ProcessorCount)
    .Where(x => x % 2 == 0)
    .Select(x => x * x)
    .OrderBy(x => x)
    .ToArray();

// 注意：PLINQ 不保证顺序，除非使用 AsOrdered
var ordered = Enumerable.Range(0, 1_000_000)
    .AsParallel()
    .AsOrdered()
    .Select(x => x * 2)
    .ToList();
```

### 8.6 NuGet 包

```xml
<ItemGroup>
  <!-- 异步 LINQ -->
  <PackageReference Include="System.Linq.Async" Version="6.0.1" />
  <!-- EF Core -->
  <PackageReference Include="Microsoft.EntityFrameworkCore.Sqlite" Version="9.0.0" />
  <!-- 响应式扩展（IObservable） -->
  <PackageReference Include="System.Reactive" Version="6.0.1" />
  <!-- 性能基准 -->
  <PackageReference Include="BenchmarkDotNet" Version="0.13.12" />
</ItemGroup>
```

---

## 9. 案例研究

### 9.1 .NET Runtime 中的 Enumerable 实现

源码：[dotnet/runtime/libraries/System.Linq/src/System/Linq/Enumerable.cs](https://github.com/dotnet/runtime)

`Where` 的实现（简化）：

```csharp
public static IEnumerable<TSource> Where<TSource>(
    this IEnumerable<TSource> source, Func<TSource, bool> predicate)
{
    if (source == null) throw new ArgumentNullException(nameof(source));
    if (predicate == null) throw new ArgumentNullException(nameof(predicate));

    return source is Iterator<TSource> iterator
        ? iterator.Where(predicate)  // 链式优化
        : new WhereIterator<TSource>(source, predicate);
}

private sealed class WhereIterator<TSource> : Iterator<TSource>
{
    private readonly IEnumerable<TSource> _source;
    private readonly Func<TSource, bool> _predicate;
    private IEnumerator<TSource>? _enumerator;

    public WhereIterator(IEnumerable<TSource> source, Func<TSource, bool> predicate)
    {
        _source = source;
        _predicate = predicate;
    }

    public override bool MoveNext()
    {
        switch (_state)
        {
            case 1:
                _enumerator = _source.GetEnumerator();
                _state = 2;
                goto case 2;
            case 2:
                while (_enumerator!.MoveNext())
                {
                    TSource item = _enumerator.Current;
                    if (_predicate(item))
                    {
                        _current = item;
                        return true;
                    }
                }
                Dispose();
                break;
        }
        return false;
    }
}
```

### 9.2 EF Core 中的表达式树翻译

源码：[dotnet/efcore/src/EFCore/Query/](https://github.com/dotnet/efcore)

EF Core 翻译流程：

1. 应用代码：`db.Users.Where(u => u.Age > 18)`
2. `Queryable.Where` 创建 `MethodCallExpression`。
3. EF Core 的 `QueryCompiler` 接收表达式树。
4. `QueryTranslationPreprocessor` 预处理（如求值常量）。
5. `RelationalSqlTranslatingExpressionVisitor` 翻译为 SQL AST。
6. `QuerySqlGenerator` 生成 SQL 字符串。
7. `RelationalCommand` 执行 SQL，返回 `DbDataReader`。
8. `Shaper` 将行转换为实体。

```csharp
// EF Core 内部翻译代码（简化）
public class SqlTranslatingExpressionVisitor : ExpressionVisitor
{
    protected override Expression VisitMethodCall(MethodCallExpression node)
    {
        if (node.Method.Name == "Where")
        {
            // 提取 Lambda 主体，翻译为 SQL WHERE 子句
            var lambda = (LambdaExpression)((UnaryExpression)node.Arguments[1]).Operand;
            var sqlFragment = TranslatePredicate(lambda.Body);
            _sqlBuilder.Append("WHERE ");
            _sqlBuilder.Append(sqlFragment);
        }
        return node;
    }
}
```

### 9.3 ASP.NET Core 中的 LINQ

```csharp
// API 端点动态过滤
app.MapGet("/users", async (AppDbContext db, string? city, int? minAge) =>
{
    IQueryable<User> q = db.Users;

    if (city != null)
        q = q.Where(u => u.City == city);

    if (minAge.HasValue)
        q = q.Where(u => u.Age >= minAge.Value);

    return await q.OrderBy(u => u.Name).ToListAsync();
});
```

### 9.4 PLINQ 内部实现

PLINQ 使用 `Parallel.For` 与 `Partitioner` 将工作分块并行：

```csharp
// PLINQ 简化实现
public static ParallelQuery<T> AsParallel<T>(this IEnumerable<T> source)
{
    return new ParallelQuery<T>(source);
}

internal sealed class ParallelWhereIterator<T> : ParallelQuery<T>
{
    protected override IEnumerator<T> GetEnumerator()
    {
        // 1. 将 source 分块
        var partitions = Partitioner.Create(_source).GetPartitions(_degreeOfParallelism);
        // 2. 并行处理每个分块
        var results = new ConcurrentQueue<T>();
        Parallel.For(0, partitions.Length, i =>
        {
            var partition = partitions[i];
            while (partition.MoveNext())
            {
                if (_predicate(partition.Current))
                    results.Enqueue(partition.Current);
            }
        });
        // 3. 返回合并结果
        return results.GetEnumerator();
    }
}
```

### 9.5 System.Linq.Async 的异步 LINQ

```csharp
// 异步 LINQ 操作符实现（简化）
public static async ValueTask<List<T>> ToListAsync<T>(
    this IAsyncEnumerable<T> source, CancellationToken ct = default)
{
    var list = new List<T>();
    await foreach (var item in source.WithCancellation(ct))
    {
        list.Add(item);
    }
    return list;
}

public static IAsyncEnumerable<T> WhereAwait<T>(
    this IAsyncEnumerable<T> source,
    Func<T, ValueTask<bool>> predicate)
{
    return WhereAwaitCore(source, predicate);
}

private static async IAsyncEnumerable<T> WhereAwaitCore<T>(
    IAsyncEnumerable<T> source,
    Func<T, ValueTask<bool>> predicate,
    [EnumeratorCancellation] CancellationToken ct = default)
{
    await foreach (var item in source.WithCancellation(ct))
    {
        if (await predicate(item))
            yield return item;
    }
}
```

---

## 10. 习题

### 10.1 选择题

**题目 1**：以下哪个操作符是**立即执行**的？

A. `Select`  
B. `Where`  
C. `OrderBy`  
D. `Count`

<details>
<summary>答案与解析</summary>

**答案：D**

`Select`、`Where` 是延迟流式操作符。`OrderBy` 是延迟但缓冲的操作符。`Count` 是立即执行操作符，调用时立即枚举源并返回计数。

</details>

**题目 2**：以下代码会触发几次数据库查询？

```csharp
var q = dbContext.Users.Where(u => u.Age > 18);
var list1 = q.ToList();
var list2 = q.ToList();
var count = q.Count();
```

A. 1 次  
B. 2 次  
C. 3 次  
D. 0 次

<details>
<summary>答案与解析</summary>

**答案：C**

每次 `ToList` 和 `Count` 都触发一次数据库查询（因为 `q` 是 `IQueryable`，延迟执行）。共 3 次：两次 `SELECT * FROM Users WHERE Age > 18` 和一次 `SELECT COUNT(*) FROM Users WHERE Age > 18`。修复：将 `q` 缓存为 `List`。

</details>

**题目 3**：以下哪个表达式是**表达式树**？

A. `Func<int, bool> f = x => x > 0;`  
B. `Expression<Func<int, bool>> e = x => x > 0;`  
C. `var f = (int x) => x > 0;`  
D. `delegate(int x) { return x > 0; };`

<details>
<summary>答案与解析</summary>

**答案：B**

当 Lambda 被赋值给 `Expression<Func<T, T2>>` 类型时，编译器将其编译为表达式树（AST 数据），而非委托（IL 代码）。其他选项都是委托。

</details>

### 10.2 填空题

**题目 4**：`yield return` 编译器生成的状态机实现了 _________ 接口。

<details>
<summary>答案</summary>

`IEnumerable<T>`、`IEnumerator<T>`（以及非泛型版本）。状态机类同时实现这两个接口，作为迭代器。

</details>

**题目 5**：`IQueryable<T>` 与 `IEnumerable<T>` 的关键区别在于 `IQueryable<T>` 持有 _________ 和 _________。

<details>
<summary>答案</summary>

`Expression`（表达式树）和 `IQueryProvider`（查询提供者）。`Expression` 描述查询，`Provider` 负责将表达式翻译并执行。

</details>

**题目 6**：`OrderBy` 是延迟但 _________ 的操作符，因为首次枚举时需要 _________ 整个源。

<details>
<summary>答案</summary>

缓冲（buffered）；加载（或缓冲、排序）。`OrderBy` 首次枚举时将整个源加载到内部数组并排序，后续枚举从排序后的数组返回。

</details>

### 10.3 编程题

**题目 7**：实现一个 `Batch` 操作符，将序列按 `size` 分组。

<details>
<summary>参考答案</summary>

```csharp
using System;
using System.Collections.Generic;

public static class LinqExtensions
{
    /// <summary>
    /// 将序列按 size 分组，每组最多 size 个元素。
    /// </summary>
    public static IEnumerable<IEnumerable<T>> Batch<T>(
        this IEnumerable<T> source, int size)
    {
        if (source == null) throw new ArgumentNullException(nameof(source));
        if (size < 1) throw new ArgumentOutOfRangeException(nameof(size));

        return BatchIterator(source, size);
    }

    private static IEnumerable<IEnumerable<T>> BatchIterator<T>(
        IEnumerable<T> source, int size)
    {
        var batch = new List<T>(size);
        foreach (var item in source)
        {
            batch.Add(item);
            if (batch.Count == size)
            {
                yield return batch;
                batch = new List<T>(size);
            }
        }

        if (batch.Count > 0)
            yield return batch;
    }

    /// <summary>
    /// 使用 ArrayPool 优化的 Batch 版本（.NET 6+）。
    /// </summary>
    public static IEnumerable<T[]> BatchPooled<T>(
        this IEnumerable<T> source, int size)
    {
        if (source == null) throw new ArgumentNullException(nameof(source));
        if (size < 1) throw new ArgumentOutOfRangeException(nameof(size));

        return BatchPooledIterator(source, size);
    }

    private static IEnumerable<T[]> BatchPooledIterator<T>(
        IEnumerable<T> source, int size)
    {
        var buffer = System.Buffers.ArrayPool<T>.Shared.Rent(size);
        try
        {
            int count = 0;
            foreach (var item in source)
            {
                buffer[count++] = item;
                if (count == size)
                {
                    var result = new T[size];
                    Array.Copy(buffer, result, size);
                    yield return result;
                    count = 0;
                }
            }

            if (count > 0)
            {
                var result = new T[count];
                Array.Copy(buffer, result, count);
                yield return result;
            }
        }
        finally
        {
            System.Buffers.ArrayPool<T>.Shared.Return(buffer);
        }
    }
}

public class Program
{
    public static void Main()
    {
        var nums = Enumerable.Range(1, 10);

        Console.WriteLine("Batch(3):");
        foreach (var batch in nums.Batch(3))
        {
            Console.WriteLine($"  [{string.Join(", ", batch)}]");
        }

        Console.WriteLine("\nBatchPooled(4):");
        foreach (var batch in nums.BatchPooled(4))
        {
            Console.WriteLine($"  [{string.Join(", ", batch)}]");
        }
    }
}
```

</details>

**题目 8**：实现一个动态查询过滤器，根据多个条件构建 `Expression<Func<User, bool>>`。

<details>
<summary>参考答案</summary>

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;

public class User
{
    public string Name { get; set; } = "";
    public int Age { get; set; }
    public string City { get; set; } = "";
    public bool IsActive { get; set; }
}

public class UserFilter
{
    public string? NameContains { get; set; }
    public int? MinAge { get; set; }
    public int? MaxAge { get; set; }
    public string? City { get; set; }
    public bool? IsActive { get; set; }

    /// <summary>
    /// 构建 LINQ 表达式树过滤器。
    /// </summary>
    public Expression<Func<User, bool>> BuildExpression()
    {
        var param = Expression.Parameter(typeof(User), "u");
        Expression? body = null;

        if (NameContains != null)
        {
            var nameProp = Expression.Property(param, nameof(User.Name));
            var containsMethod = typeof(string).GetMethod("Contains", new[] { typeof(string) })!;
            var nameVal = Expression.Constant(NameContains);
            var contains = Expression.Call(nameProp, containsMethod, nameVal);
            body = body == null ? contains : Expression.AndAlso(body, contains);
        }

        if (MinAge.HasValue)
        {
            var ageProp = Expression.Property(param, nameof(User.Age));
            var ageVal = Expression.Constant(MinAge.Value);
            var ge = Expression.GreaterThanOrEqual(ageProp, ageVal);
            body = body == null ? ge : Expression.AndAlso(body, ge);
        }

        if (MaxAge.HasValue)
        {
            var ageProp = Expression.Property(param, nameof(User.Age));
            var ageVal = Expression.Constant(MaxAge.Value);
            var le = Expression.LessThanOrEqual(ageProp, ageVal);
            body = body == null ? le : Expression.AndAlso(body, le);
        }

        if (City != null)
        {
            var cityProp = Expression.Property(param, nameof(User.City));
            var cityVal = Expression.Constant(City);
            var eq = Expression.Equal(cityProp, cityVal);
            body = body == null ? eq : Expression.AndAlso(body, eq);
        }

        if (IsActive.HasValue)
        {
            var activeProp = Expression.Property(param, nameof(User.IsActive));
            var activeVal = Expression.Constant(IsActive.Value);
            var eq = Expression.Equal(activeProp, activeVal);
            body = body == null ? eq : Expression.AndAlso(body, eq);
        }

        body ??= Expression.Constant(true);
        return Expression.Lambda<Func<User, bool>>(body, param);
    }
}

public class Program
{
    public static void Main()
    {
        // 模拟 EF Core 查询
        var filter = new UserFilter
        {
            MinAge = 18,
            MaxAge = 60,
            City = "Shanghai",
            IsActive = true
        };

        var expr = filter.BuildExpression();
        Console.WriteLine($"Expression: {expr}");

        // 在内存集合上测试
        var users = new List<User>
        {
            new() { Name = "Alice", Age = 25, City = "Shanghai", IsActive = true },
            new() { Name = "Bob", Age = 17, City = "Shanghai", IsActive = true },
            new() { Name = "Charlie", Age = 30, City = "Beijing", IsActive = true },
            new() { Name = "Diana", Age = 19, City = "Shanghai", IsActive = false }
        };

        var compiled = expr.Compile();
        var filtered = users.Where(compiled);
        foreach (var u in filtered)
        {
            Console.WriteLine($"  {u.Name}, {u.Age}, {u.City}, Active={u.IsActive}");
        }

        // 在 EF Core 中使用
        // var result = await dbContext.Users.Where(filter.BuildExpression()).ToListAsync();
    }
}
```

</details>

### 10.4 思考题

**题目 9**：为什么 `IEnumerable<T>` 支持多次枚举，而 `IObservable<T>` 与 Java `Stream<T>` 不支持？

<details>
<summary>分析与参考答案</summary>

`IEnumerable<T>` 是**拉取模型**（pull-based），消费者主动调用 `MoveNext`，每次枚举都是新的状态机实例（除非源本身是单次流如 `FileStream`）。

`IObservable<T>` 是**推送模型**（push-based），订阅时数据开始推送，取消订阅后无法重启。

Java `Stream<T>` 设计上明确禁止多次使用，因为：

1. 可能持有外部资源（如文件句柄），多次使用会泄漏。
2. 强制单次使用鼓励开发者显式管理数据流。
3. 避免意外的多次枚举开销。

C# `IEnumerable<T>` 的多次枚举既有便利性（`foreach` + `Count` + `ToList`），也有陷阱（多次执行）。.NET 6+ 的 `TryGetNonEnumeratedCount` 缓解了 `Count` 的开销。

</details>

**题目 10**：在 EF Core 中，`IQueryable<T>` 翻译为 SQL 时有哪些限制？

<details>
<summary>分析与参考答案</summary>

EF Core 翻译限制：

1. **C# 方法不可调用**：自定义方法无法翻译，除非使用 `EF.Functions`。
2. **`DateTime.Now` 客户端求值**：在 `Where` 中使用会在客户端求值（EF Core 3.0+ 抛异常）。
3. **`List<T>.Contains` 需翻译为 `IN`**：支持但需注意性能。
4. **复杂的 `GroupBy` 限制**：某些数据库不支持 `GroupBy` + 字段选择。
5. **`Join` 与导航属性**：导航属性优于显式 `Join`。
6. **聚合函数**：`Average`、`Sum` 等需在 `Select` 中调用，不能在 `Where` 中。
7. **自定义比较器**：无法翻译 `IEqualityComparer<T>`。
8. **LINQ 操作符限制**：`Last`、`ElementAt` 在 SQL 中无直接对应（使用 `OrderByDescending + First`）。

EF Core 7+ 显著扩展了翻译能力，但仍有限制。开发者应使用 `ToQueryString()` 检查生成的 SQL。

</details>

**题目 11**：表达式树如何用于动态编译与元编程？

<details>
<summary>分析与参考答案</summary>

表达式树是 C# 的"代码即数据"机制。通过 `Expression.Lambda<T>(body).Compile()` 可将表达式树编译为委托，实现动态代码生成。

应用场景：

1. **动态查询构建**：根据用户输入构建 `Where` 谓词（见题目 8）。
2. **ORM 翻译**：EF Core 将表达式树翻译为 SQL。
3. **规则引擎**：将业务规则表示为表达式树，运行时编译执行。
4. **序列化优化**：使用表达式树生成属性访问器，比反射快 100 倍。
5. **DSL 解析**：将 DSL 翻译为表达式树，再编译为可执行代码。

```csharp
// 表达式树编译为委托
Expression<Func<int, int>> expr = x => x * x + 1;
var compiled = expr.Compile();
Console.WriteLine(compiled(5));  // 26
```

.NET 9 引入 `Expression.TryGetRefGCData` 等扩展，进一步增强元编程能力。

</details>

---

## 11. 参考文献

### 11.1 规范与官方文档

[1] Ecma International. 2023. *ECMA-334: The C# Language Specification (6th edition)*. Geneva, Switzerland: Ecma International. https://www.ecma-international.org/wp-content/uploads/ECMA-334_6th_edition_december_2022.pdf

[2] Ecma International. 2012. *ECMA-335: Common Language Infrastructure (CLI) (6th edition)*. Geneva, Switzerland: Ecma International. https://www.ecma-international.org/publications-and-standards/standards/ecma-335/

[3] Microsoft. 2024. *LINQ (Language Integrated Query) documentation*. .NET documentation. https://learn.microsoft.com/dotnet/csharp/linq/

[4] Microsoft. 2024. *Expression trees documentation*. .NET documentation. https://learn.microsoft.com/dotnet/csharp/expression-trees

### 11.2 设计论文与博客

[5] Meijer, E., Beckman, B., Bierman, G. 2007. *LINQ: Reconciling Object, Relations and XML in the .NET Framework*. In Proceedings of the 2007 ACM SIGMOD International Conference on Management of Data (SIGMOD '07). Association for Computing Machinery, New York, NY, USA, 703–704. https://doi.org/10.1145/1247480.1247569

[6] Meijer, E. 2007. *Confessions of a Used Programming Language Salesman: Getting the Masses Hooked on Lazy Functional Programming*. In Proceedings of the 12th ACM SIGPLAN International Conference on Functional Programming (ICFP '07). https://doi.org/10.1145/1291224.1291199

[7] Bierman, G., Meijer, E., Torgersen, M. 2007. *Lost in translation: formalizing proposed extensions to C#. In Proceedings of the 22nd Annual ACM SIGPLAN Conference on Object-Oriented Programming Systems and Applications (OOPSLA '07)*. https://doi.org/10.1145/1297027.1297036

[8] Microsoft. 2007. *The LINQ Project*. MSDN. https://learn.microsoft.com/archive/blogs/dotnet/the-linq-project

### 11.3 学术论文

[9] Chafe, P., Black, A. P. 2010. *LINQ as a Domain-Specific Language*. In Proceedings of the 48th Annual Southeast Regional Conference (ACMSE '10). Association for Computing Machinery, New York, NY, USA. https://doi.org/10.1145/1900008.1900053

[10] Fischer, B., Lämmel, R. 2011. *Evaluating LINQ as a Domain-Specific Language*. In Proceedings of the 2011 ACM Symposium on Applied Computing (SAC '11). Association for Computing Machinery, New York, NY, USA, 1345–1350. https://doi.org/10.1145/1982185.1982478

[11] Okur, S., Hartveld, D. L., Dig, D., et al. 2014. *A study and toolkit for asynchronous programming in C#. In Proceedings of the 36th International Conference on Software Engineering (ICSE 2014)*. https://doi.org/10.1145/2568225.2568267

### 11.4 书籍

[12] Albahari, J. 2020. *C# in a Nutshell: The Definitive Reference*. O'Reilly Media, Sebastopol, CA, USA. ISBN: 978-1492051017.

[13] Skeet, J. 2019. *C# in Depth (4th ed.)*. Manning Publications, Shelter Island, NY, USA. ISBN: 978-1617294532.

[14] Marguerie, F., Eichert, S., Wooley, J. 2008. *LINQ in Action*. Manning Publications, Shelter Island, NY, USA. ISBN: 978-1933988160.

[15] Calvert, C., Kulkarni, D. 2007. *Essential LINQ*. Addison-Wesley Professional, Boston, MA, USA. ISBN: 978-0321564160.

### 11.5 源码

[16] Microsoft. 2024. *dotnet/runtime LINQ source*. GitHub. https://github.com/dotnet/runtime/tree/main/src/libraries/System.Linq

[17] Microsoft. 2024. *dotnet/efcore source*. GitHub. https://github.com/dotnet/efcore

[18] Microsoft. 2024. *Roslyn compiler expression tree source*. https://github.com/dotnet/roslyn/blob/main/src/Compilers/CSharp/Portable/Lowering/LocalRewriter/LocalRewriter_ExpressionTree.cs

---

## 12. 延伸阅读

### 12.1 进阶书籍

- **Jon Skeet**. *C# in Depth (4th ed.)* — 第 9-12 章深入讲解 LINQ。
- **Joseph Albahari**. *C# in a Nutshell* — 第 8 章"LINQ Operators"是权威参考。
- **Bart De Smet**. *Programming Reactive Extensions and LINQ* — Rx 与 LINQ 的关系。

### 12.2 学术资源

- **MIT 6.1020 Software Construction** — https://ocw.mit.edu/ — 抽象数据类型与迭代器。
- **Stanford CS107 Programming Paradigms** — https://web.stanford.edu/class/cs107/ — 函数式编程基础。
- **CMU 15-411 Compiler Design** — http://www.cs.cmu.edu/~fp/courses/15411-f08/ — 表达式树与 AST。

### 12.3 在线资源

- **101 LINQ Samples** — https://learn.microsoft.com/dotnet/csharp/linq/standard-query-operators/ — 官方示例集。
- **LINQ Pad** — https://www.linqpad.net/ — Joe Albahari 的交互式 LINQ 工具，必备。
- **EF Core documentation** — https://learn.microsoft.com/ef/core/ — 官方 EF Core 文档。
- **Stephen Toub's Performance Blog** — https://devblogs.microsoft.com/dotnet/ — LINQ 性能优化。

### 12.4 相关源码

- **dotnet/runtime/src/libraries/System.Linq/** — LINQ to Objects 实现。
- **dotnet/efcore/src/EFCore/Query/** — EF Core 查询翻译。
- **dotnet/roslyn/src/Compilers/CSharp/Portable/Lowering/IteratorRewriter/** — `yield return` 状态机重写。
- **dotnet/reactive/** — System.Reactive（IObservable）实现。

### 12.5 视频资源

- **Channel 9: LINQ Series** — https://channel9.msdn.com/ — Bart De Smet 系列。
- **Erik Meijer's Talks** — LINQ 设计师的多次演讲。
- **Jon Skeet's Pluralsight Courses** — C# 与 LINQ 深度课程。

---

## 附录 A：LINQ 操作符速查表

### A.1 延迟流式（Streaming）

| 操作符 | 签名 | 用途 |
|--------|------|------|
| `Where` | `Where<T>(Func<T,bool>)` | 过滤 |
| `Select` | `Select<T,U>(Func<T,U>)` | 投影 |
| `SelectMany` | `SelectMany<T,U>(Func<T,IEnumerable<U>>)` | 展平嵌套 |
| `Take` | `Take<T>(int)` | 取前 N 个 |
| `Skip` | `Skip<T>(int)` | 跳过前 N 个 |
| `TakeWhile` | `TakeWhile<T>(Func<T,bool>)` | 取到条件不满足 |
| `SkipWhile` | `SkipWhile<T>(Func<T,bool>)` | 跳到条件不满足 |
| `Distinct` | `Distinct<T>()` | 去重 |
| `Concat` | `Concat<T>(IEnumerable<T>)` | 拼接 |
| `Zip` | `Zip<T,U,V>(IEnumerable<U>,Func<T,U,V>)` | 配对 |
| `DefaultIfEmpty` | `DefaultIfEmpty<T>(T)` | 空序列提供默认值 |

### A.2 延迟缓冲（Buffered）

| 操作符 | 签名 | 用途 |
|--------|------|------|
| `OrderBy` | `OrderBy<T,K>(Func<T,K>)` | 排序 |
| `OrderByDescending` | `OrderByDescending<T,K>(Func<T,K>)` | 降序排序 |
| `Reverse` | `Reverse<T>()` | 反转 |
| `GroupBy` | `GroupBy<T,K>(Func<T,K>)` | 分组 |
| `Distinct`（部分实现） | `Distinct<T>(IEqualityComparer<T>)` | 去重 |
| `Join` | `Join<T,U,K,V>(...)` | 内连接 |
| `GroupJoin` | `GroupJoin<T,U,K,V>(...)` | 分组连接 |
| `SetUnion` | `Union<T>(IEnumerable<T>)` | 并集 |
| `Intersect` | `Intersect<T>(IEnumerable<T>)` | 交集 |
| `Except` | `Except<T>(IEnumerable<T>)` | 差集 |

### A.3 立即执行（Immediate）

| 操作符 | 签名 | 返回类型 | 用途 |
|--------|------|----------|------|
| `ToList` | `ToList<T>()` | `List<T>` | 转 List |
| `ToArray` | `ToArray<T>()` | `T[]` | 转数组 |
| `ToDictionary` | `ToDictionary<T,K>(Func<T,K>)` | `Dictionary<K,T>` | 转字典 |
| `ToLookup` | `ToLookup<T,K>(Func<T,K>)` | `ILookup<K,T>` | 多值字典 |
| `ToHashSet` | `ToHashSet<T>()` | `HashSet<T>` | 转集合 |
| `First` | `First<T>()` | `T` | 第一个 |
| `FirstOrDefault` | `FirstOrDefault<T>()` | `T?` | 第一个或默认 |
| `Last` | `Last<T>()` | `T` | 最后一个 |
| `Single` | `Single<T>()` | `T` | 唯一元素 |
| `ElementAt` | `ElementAt<T>(int)` | `T` | 指定位置 |
| `Count` | `Count<T>()` | `int` | 计数 |
| `LongCount` | `LongCount<T>()` | `long` | 长计数 |
| `Any` | `Any<T>(Func<T,bool>)` | `bool` | 存在判断 |
| `All` | `All<T>(Func<T,bool>)` | `bool` | 全部判断 |
| `Contains` | `Contains<T>(T)` | `bool` | 包含判断 |
| `Sum` | `Sum<T>(Func<T,int>)` | `int` | 求和 |
| `Min` | `Min<T>()` | `T` | 最小 |
| `Max` | `Max<T>()` | `T` | 最大 |
| `Average` | `Average<T>(Func<T,double>)` | `double` | 平均 |
| `Aggregate` | `Aggregate<T>(Func<T,T,T>)` | `T` | 自定义聚合 |
| `SequenceEqual` | `SequenceEqual<T>(IEnumerable<T>)` | `bool` | 序列相等 |

### A.4 .NET 6+ 新增

| 操作符 | 用途 |
|--------|------|
| `Chunk<T>(int)` | 分块 |
| `MaxBy<T,K>(Func<T,K>)` | 按键取最大 |
| `MinBy<T,K>(Func<T,K>)` | 按键取最小 |
| `DistinctBy<T,K>(Func<T,K>)` | 按键去重 |
| `UnionBy<T,K>(Func<T,K>)` | 按键并集 |
| `ExceptBy<T,K>(Func<T,K>)` | 按键差集 |
| `IntersectBy<T,K>(Func<T,K>)` | 按键交集 |
| `TryGetNonEnumeratedCount<T>(out int)` | 不枚举计数 |

### A.5 .NET 8+ 新增

| 操作符 | 用途 |
|--------|------|
| `AggregateBy<T,K>` | 按键聚合 |
| `CountBy<T,K>` | 按键计数 |
| `Index<T>()` | 带 Index 的枚举 |

---

## 附录 B：表达式树节点类型速查

| 节点类型 | 说明 | 示例 |
|----------|------|------|
| `Constant` | 常量值 | `42`、`"hello"` |
| `Parameter` | 参数 | `u` in `u => u.Age` |
| `MemberAccess` | 字段/属性访问 | `u.Age` |
| `MethodCall` | 方法调用 | `u.Name.StartsWith("A")` |
| `Lambda` | Lambda 表达式 | `u => u.Age > 18` |
| `Binary` | 二元运算 | `u.Age > 18`、`a + b` |
| `Unary` | 一元运算 | `!flag`、`-x` |
| `Conditional` | 条件 | `a ? b : c` |
| `New` | 对象创建 | `new User()` |
| `MemberInit` | 对象初始化 | `new User { Name = "x" }` |
| `Invoke` | 委托调用 | `func(arg)` |
| `Quote` | 表达式包装 | `Expression<Func<T>>` 嵌套 |
| `Convert` | 类型转换 | `(int)x` |

---

## 附录 C：调试 LINQ 的技巧

### C.1 显示生成的 SQL

```csharp
// EF Core 日志
options.LogTo(Console.WriteLine, LogLevel.Information);

// 单个查询的 SQL
Console.WriteLine(query.ToQueryString());
```

### C.2 检查表达式树

```csharp
Expression<Func<User, bool>> expr = u => u.Age > 18 && u.City == "Shanghai";

// 调试器可视化
// 在 Visual Studio 中悬停 expr，点击放大镜图标

// 文本输出
Console.WriteLine(expr.ToString());
// u => ((u.Age > 18) AndAlso (u.City == "Shanghai"))
```

### C.3 性能分析

```csharp
// 使用 BenchmarkDotNet
[Benchmark]
public List<int> LinqVersion() => data.Where(x => x > 5000).ToList();

[Benchmark]
public List<int> ForVersion()
{
    var list = new List<int>();
    for (int i = 0; i < data.Length; i++)
        if (data[i] > 5000) list.Add(data[i]);
    return list;
}
```

### C.4 多次枚举检测

```csharp
// Roslyn 分析器：检测可能的多次枚举
// 安装 ReSharper 或 Roslynator，会警告 "Possible multiple enumeration"

// 运行时检测：包装 IEnumerable
public class LoggingEnumerable<T> : IEnumerable<T>
{
    private readonly IEnumerable<T> _inner;
    private int _enumerateCount = 0;

    public LoggingEnumerable(IEnumerable<T> inner) => _inner = inner;

    public IEnumerator<T> GetEnumerator()
    {
        Interlocked.Increment(ref _enumerateCount);
        Console.WriteLine($"Enumerated {_enumerateCount} times");
        return _inner.GetEnumerator();
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}

// 使用
var wrapped = new LoggingEnumerable<int>(source);
var q = wrapped.Where(x => x > 0);
q.ToList();
q.Count();  // 会输出 "Enumerated 2 times"
```

---

## 附录 D：常见性能陷阱与优化

### D.1 Count() vs Length vs Count

```csharp
// 不推荐：Count() 需要枚举
int count = array.Count();

// 推荐：使用 ICollection<T>.Count 或 Array.Length
int count = array.Length;        // 数组
int count = list.Count;          // List<T>
int count = collection.Count;    // ICollection<T>

// .NET 6+：TryGetNonEnumeratedCount
if (source.TryGetNonEnumeratedCount(out int count))
    Console.WriteLine(count);
```

### D.2 First vs Take(1).ToList()

```csharp
// 推荐：First() 只取第一个
var first = source.First();

// 不推荐：分配 List
var firstList = source.Take(1).ToList();
var first = firstList[0];
```

### D.3 Where + Select vs Select + Where

```csharp
// 通常 Where 在前更高效
var q = source.Where(x => x.IsValid).Select(x => x.Name);

// 比 Select 在前更优（避免对无效元素做投影）
var q = source.Select(x => x.Name).Where(n => n != null);
```

### D.4 Any vs Count

```csharp
// 推荐：Any() 短路
if (source.Any()) { }

// 不推荐：Count() 全枚举
if (source.Count() > 0) { }
```

### D.5 ToDictionary 重复键

```csharp
// 错误：重复键抛异常
var dict = users.ToDictionary(u => u.City);  // 如果 City 重复

// 修复：ToLookup 允许多值
var lookup = users.ToLookup(u => u.City);
var shanghaiUsers = lookup["Shanghai"];
```

---

> **本章小结**：LINQ 的延迟执行是函数式编程的"惰性求值"在 C# 中的实现。理解 `IEnumerable<T>` 的拉取模型、`yield return` 状态机、`IQueryable<T>` 的表达式树翻译，是从"会用 LINQ"到"精通 LINQ"的关键。在 .NET 9 时代，`Chunk`、`DistinctBy`、`Index` 等新操作符极大扩展了 LINQ 的能力。结合 EF Core、PLINQ、`IAsyncEnumerable<T>`，可以构建从内存到数据库、从单线程到并行、从同步到异步的统一查询体验。
