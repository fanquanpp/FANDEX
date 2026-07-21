---
order: 54
title: 泛型与协变逆变
module: csharp
category: 'C#'
difficulty: advanced
description: 泛型约束与型变
author: fanquanpp
updated: '2026-06-14'
related:
  - csharp/模式匹配
  - csharp/记录类型
  - csharp/Span与Memory
  - csharp/源生成器
prerequisites:
  - csharp/概述与环境配置
---

## 一、概述

泛型（Generics）是 C# 2.0 在 2005 年引入的核心特性，它允许开发者编写"类型参数化"的代码——即代码中的某些类型在编写时不指定，而在使用时才确定。这一特性从根本上改变了 .NET 生态系统的代码复用方式，让类型安全与代码复用得以兼得。协变（Covariance）与逆变（Contravariance）则进一步定义了泛型类型参数之间的子类型关系如何传递，是写出灵活、可组合泛型代码的关键。

### 1.1 为什么需要泛型

要理解泛型的价值，我们需要先回到没有泛型的世界。在 C# 1.0/1.1 时代，如果要实现一个可以存储任意类型的集合，通常有两种选择：为每种类型写一套重复代码，或者使用 `object` 作为通用类型。

```csharp
// 方式一：为每种类型写一套重复代码（违反 DRY 原则）
public class IntList
{
    private int[] _items = new int[4];
    private int _count;
    
    public void Add(int item) { _items[_count++] = item; }
    public int Get(int index) => _items[index];
}

public class StringList
{
    private string[] _items = new string[4];
    private int _count;
    
    public void Add(string item) { _items[_count++] = item; }
    public string Get(int index) => _items[index];
}

// 方式二：使用 object 作为通用类型
public class ArrayList
{
    private object[] _items = new object[4];
    private int _count;
    
    public void Add(object item) { _items[_count++] = item; }
    public object Get(int index) => _items[index];
}
```

方式一违反了 DRY（Don't Repeat Yourself）原则，每增加一种类型都要复制一套代码。方式二看似优雅，但带来三个严重问题：

**第一，类型安全丧失**。`ArrayList` 接受任何 `object`，意味着你可以把整数、字符串、自定义类型混在一起，编译器不会报错，但运行时会出现类型转换异常：

```csharp
var list = new ArrayList();
list.Add(1);
list.Add("hello");  // 编译通过，运行时也通过
int value = (int)list.Get(1);  // 运行时抛出 InvalidCastException
```

**第二，性能开销**。值类型（int、double、struct 等）存入 `object` 时会发生"装箱"（boxing），取出时会发生"拆箱"（unboxing）。这两个操作都涉及内存分配和数据复制，性能开销巨大：

```csharp
var list = new ArrayList();
for (int i = 0; i < 1000; i++)
{
    list.Add(i);  // 每次都装箱，分配一个新对象
}
// 1000 次装箱，产生 1000 个堆对象，增加 GC 压力
```

**第三，代码可读性差**。频繁的类型转换让代码冗长且容易出错。

泛型完美解决了这三个问题：

```csharp
public class List<T>
{
    private T[] _items = new T[4];
    private int _count;
    
    public void Add(T item) { _items[_count++] = item; }
    public T Get(int index) => _items[index];
}

// 使用：T 被替换为具体类型
var intList = new List<int>();
intList.Add(1);
intList.Add(2);
int value = intList.Get(0);  // 无需类型转换

var stringList = new List<string>();
stringList.Add("hello");
string text = stringList.Get(0);  // 无需类型转换
```

泛型代码只写一套，但编译器会为每种具体类型生成专门的代码（在 .NET 中是泛型实例化），既保证了类型安全，又避免了装箱开销。

### 1.2 协变与逆变的必要性

泛型解决了类型参数化的问题，但带来了一个新的问题：泛型类型之间的子类型关系如何传递？考虑以下场景：

```csharp
// 假设有继承关系：Derived : Base
public class Base { }
public class Derived : Base { }

// 由于继承关系，Derived 可以赋值给 Base
Base b = new Derived();  // 合法

// 那么 IEnumerable<Derived> 能否赋值给 IEnumerable<Base>？
IEnumerable<Derived> derivedEnumerable = new List<Derived>();
IEnumerable<Base> baseEnumerable = derivedEnumerable;  // 能否合法？
```

直觉上，既然 `Derived` 是 `Base` 的子类，那么 `IEnumerable<Derived>` 也应该是 `IEnumerable<Base>` 的子类。这种"子类型关系沿泛型参数传递"的特性，就是协变。

但事情没那么简单。考虑另一个例子：

```csharp
// List<T> 是可变的（可以添加、删除元素）
List<Derived> derivedList = new List<Derived>();
List<Base> baseList = derivedList;  // 如果这合法...

baseList.Add(new Base());  // 我们往里塞了一个 Base 实例
Derived d = derivedList[0];  // 但 derivedList 期望里面都是 Derived！
```

如果 `List<Derived>` 可以赋值给 `List<Base>`，那么通过 `baseList.Add(new Base())` 就能往一个原本只应包含 `Derived` 的列表里添加 `Base` 实例，破坏了类型安全。所以 `List<T>` 必须是不变（Invariant）的——`List<Derived>` 不能赋值给 `List<Base>`，反之亦然。

C# 通过 `out` 和 `in` 关键字让开发者显式声明泛型参数的型变性质：
- `out`（协变）：类型参数只能作为输出（返回值），不能作为输入（参数）
- `in`（逆变）：类型参数只能作为输入（参数），不能作为输出（返回值）

这种"位置约束"的设计，让编译器能够在编译时验证型变的安全性，既保留了类型安全，又提供了灵活性。

### 1.3 本篇的学习路径

本篇将按照以下顺序深入探讨泛型与协变逆变：

1. **历史与演进**：从 C# 1.0 的非泛型世界，到 C# 2.0 的泛型引入，再到 C# 4.0 的协变逆变支持
2. **核心概念**：类型参数、约束、型变的精确定义
3. **工作原理**：泛型在运行时的实例化机制、型变的编译期检查
4. **基础示例**：从简单泛型类到约束、型变的应用
5. **进阶用法**：高阶泛型、委托型变、表达式树中的泛型
6. **性能分析**：泛型与其他方案的对比
7. **最佳实践与陷阱**：写出健壮的泛型代码

## 二、历史与演进

### 2.1 C# 1.0：无泛型时代（2002）

C# 1.0 发布于 2002 年，没有泛型支持。要实现类型参数化，开发者只能依赖 `object` 或为每种类型写一套代码。.NET Framework 1.0 提供的集合类（`ArrayList`、`Hashtable`、`Queue`、`Stack`）都基于 `object`，存在前述的类型安全和性能问题。

```csharp
// .NET 1.0 的集合类
ArrayList list = new ArrayList();
list.Add(1);          // 装箱
list.Add("string");   // 异构集合
int value = (int)list[0];  // 拆箱

Hashtable table = new Hashtable();
table.Add("key", 1);
object value = table["key"];  // 返回 object
```

### 2.2 C# 2.0：泛型诞生（2005）

C# 2.0 随 .NET Framework 2.0 在 2005 年发布，引入了泛型。这是 C# 历史上最重要的特性之一，直接催生了 `System.Collections.Generic` 命名空间下的 `List<T>`、`Dictionary<TKey, TValue>`、`Queue<T>`、`Stack<T>` 等现代集合类。

```csharp
// C# 2.0 的泛型集合
List<int> list = new List<int>();
list.Add(1);          // 无装箱
list.Add("string");   // 编译错误，类型安全
int value = list[0];  // 无拆箱

Dictionary<string, int> table = new Dictionary<string, int>();
table.Add("key", 1);
int value = table["key"];  // 直接返回 int
```

C# 2.0 的泛型引入了几个关键概念：
- **类型参数**（`<T>`）：占位符类型
- **泛型约束**（`where`）：限制类型参数
- **泛型方法**：方法级类型参数化
- **泛型委托**：`Action<T>`、`Func<T, TResult>` 等

```csharp
// C# 2.0 的泛型方法
public T Max<T>(T a, T b) where T : IComparable<T>
{
    return a.CompareTo(b) > 0 ? a : b;
}

// 泛型委托
public delegate void Action<T>(T obj);
public delegate TResult Func<T, TResult>(T arg);
```

### 2.3 C# 4.0：协变与逆变（2010）

C# 4.0 随 .NET Framework 4.0 在 2010 年发布，引入了协变和逆变。在此之前，`IEnumerable<Derived>` 不能赋值给 `IEnumerable<Base>`，给代码复用带来不便。C# 4.0 通过 `out` 和 `in` 关键字解决了这个问题。

```csharp
// C# 4.0 之前：IEnumerable<T> 是不变的
IEnumerable<Derived> d = new List<Derived>();
IEnumerable<Base> b = d;  // 编译错误

// C# 4.0：IEnumerable<out T> 协变
IEnumerable<Derived> d = new List<Derived>();
IEnumerable<Base> b = d;  // 合法

// IComparer<in T> 逆变
IComparer<Base> baseComparer = ...;
IComparer<Derived> derivedComparer = baseComparer;  // 合法
```

C# 4.0 同时支持委托的协变和逆变：

```csharp
// 委托型变
Func<Derived> derivedFunc = () => new Derived();
Func<Base> baseFunc = derivedFunc;  // 协变

Action<Base> baseAction = b => { };
Action<Derived> derivedAction = baseAction;  // 逆变
```

### 2.4 C# 7+ 的泛型增强

C# 7.0（2017）引入了 `delegate` 约束和 `unmanaged` 约束：

```csharp
// C# 7.0 的 unmanaged 约束
public T Read<T>(IntPtr address) where T : unmanaged
{
    return Unsafe.Read<T>(address);
}
```

C# 8.0（2019）支持了可空引用类型与泛型的交互：

```csharp
// C# 8.0 的可空泛型
public class Repository<T> where T : class?
{
    public T? Find(int id) { ... }  // T 可以是可空引用类型
}
```

### 2.5 C# 9+ 的进一步演进

C# 9.0（2020）引入了协变返回类型，允许派生类重写方法时返回更具体的类型：

```csharp
public class Base
{
    public virtual Base Clone() => new Base();
}

public class Derived : Base
{
    public override Derived Clone() => new Derived();  // 协变返回
}
```

C# 11（2022）引入了 `static abstract` 接口成员，让泛型可以约束接口的静态成员，开启了"接口代数"的可能性：

```csharp
public interface IAddable<T> where T : IAddable<T>
{
    static abstract T operator +(T left, T right);
}

public struct Int32 : IAddable<Int32>
{
    public static int operator +(int left, int right) => left + right;
}

public T Sum<T>(params T[] values) where T : IAddable<T>
{
    T result = default!;
    foreach (var v in values) result = result + v;
    return result;
}
```

C# 12（2023）引入了别名指令支持泛型，让复杂泛型类型更易读：

```csharp
using Point = (int X, int Y);
using StringDict = System.Collections.Generic.Dictionary<string, string>;
```

## 三、核心概念

### 3.1 类型参数

类型参数（Type Parameter）是泛型定义中的占位符类型。在 C# 中，类型参数用尖括号 `<T>` 包围，可以出现在类、接口、结构、委托、方法的声明中。

```csharp
// 泛型类
public class Stack<T>
{
    private T[] _items = new T[0];
    public void Push(T item) { ... }
    public T Pop() { ... }
}

// 泛型接口
public interface IComparer<T>
{
    int Compare(T x, T y);
}

// 泛型方法
public T Find<T>(IEnumerable<T> source, Func<T, bool> predicate)
{
    foreach (var item in source)
    {
        if (predicate(item)) return item;
    }
    throw new InvalidOperationException();
}

// 泛型委托
public delegate void EventHandler<TEventArgs>(object sender, TEventArgs e);
```

#### 3.1.1 命名约定

类型参数的命名遵循一些约定：

- **单字母命名**：`T`、`K`、`V`、`TResult` 等，常用于简单场景
- **描述性命名**：`TEntity`、`TKey`、`TValue`、`TResult`，用于复杂泛型
- **前缀 T**：所有类型参数都以 `T` 开头，便于识别

```csharp
// 单字母
public class Dictionary<TKey, TValue> { }

// 描述性
public class Repository<TEntity> where TEntity : class { }
public delegate TResult Func<in T, out TResult>(T arg);
```

#### 3.1.2 多类型参数

一个泛型可以定义多个类型参数：

```csharp
public class Dictionary<TKey, TValue>
{
    public void Add(TKey key, TValue value) { }
    public TValue this[TKey key] { get; set; }
}

public delegate void Action<in T1, in T2>(T1 arg1, T2 arg2);
public delegate TResult Func<in T1, in T2, out TResult>(T1 arg1, T2 arg2);
```

#### 3.1.3 类型参数 vs 类型实参

定义泛型时使用"类型参数"（占位符），使用泛型时传入"类型实参"（具体类型）：

```csharp
// 定义：T 是类型参数
public class List<T> { }

// 使用：int 是类型实参
List<int> numbers = new List<int>();
List<string> texts = new List<string>();
```

### 3.2 泛型约束

泛型约束（Generic Constraints）通过 `where` 关键字限制类型参数必须满足的条件。没有约束的类型参数只能调用 `object` 的方法，约束让类型参数获得更多能力。

#### 3.2.1 约束类型

C# 支持以下几种约束：

**1. 引用类型约束（`class`）**：类型参数必须是引用类型。

```csharp
public class Repository<T> where T : class
{
    // T 可以是 string、自定义类、接口等引用类型
    // 不能是 int、double、struct 等值类型
}

// 使用
Repository<string> r1 = new Repository<string>();  // 合法
Repository<int> r2 = new Repository<int>();         // 编译错误
```

**2. 值类型约束（`struct`）**：类型参数必须是值类型（不包括 `Nullable<T>`）。

```csharp
public class NumericProcessor<T> where T : struct
{
    // T 可以是 int、double、struct 等
    // 不能是 string、object 等引用类型
}

NumericProcessor<int> p1 = new NumericProcessor<int>();    // 合法
NumericProcessor<double> p2 = new NumericProcessor<double>();  // 合法
NumericProcessor<string> p3 = new NumericProcessor<string>();  // 编译错误
```

**3. 无参构造约束（`new()`）**：类型参数必须有无参公共构造函数。

```csharp
public class Factory<T> where T : new()
{
    public T Create() => new T();
}

// 使用
Factory<MyClass> factory = new Factory<MyClass>();
MyClass instance = factory.Create();
```

**4. 基类约束**：类型参数必须是指定基类或其派生类。

```csharp
public class AnimalProcessor<T> where T : Animal
{
    public void Process(T animal)
    {
        animal.Eat();  // 可以调用 Animal 的方法
    }
}

// 使用
AnimalProcessor<Dog> p = new AnimalProcessor<Dog>();
AnimalProcessor<Cat> p2 = new AnimalProcessor<Cat>();
AnimalProcessor<int> p3 = new AnimalProcessor<int>();  // 编译错误
```

**5. 接口约束**：类型参数必须实现指定接口。

```csharp
public class SortedList<T> where T : IComparable<T>
{
    public void Sort()
    {
        // 可以调用 T 的 CompareTo 方法
    }
}

// 使用
SortedList<int> list = new SortedList<int>();
```

**6. unmanaged 约束（C# 7.3+）**：类型参数必须是非托管值类型。

```csharp
public unsafe void Copy<T>(T* source, T* dest, int count) where T : unmanaged
{
    // T 是非托管值类型（int、float、struct 等，不包含引用类型字段）
}
```

**7. notnull 约束（C# 8.0+）**：类型参数必须是不可空类型。

```csharp
public class Service<T> where T : notnull
{
    // T 不能是 Nullable<T>，也不能是可空引用类型
}
```

**8. 委托约束（C# 7.3+）**：类型参数必须是特定委托类型。

```csharp
public static TResult Invoke<TDelegate, TResult>(TDelegate d)
    where TDelegate : Delegate
{
    // 可以使用 Delegate 的方法
}
```

**9. Enum 约束（C# 7.3+）**：类型参数必须是枚举。

```csharp
public static string GetName<T>(T value) where T : Enum
{
    return Enum.GetName(typeof(T), value);
}
```

#### 3.2.2 组合约束

多个约束可以组合使用：

```csharp
public class Repository<T> : where T : class, IEntity, new()
{
    // T 必须是引用类型，实现 IEntity 接口，且有无参构造函数
    public T Create() => new T();
    public void Save(T entity)
    {
        entity.Id = Guid.NewGuid();  // 可以调用 IEntity 的成员
    }
}
```

#### 3.2.3 多类型参数约束

每个类型参数可以有独立的约束：

```csharp
public class Dictionary<TKey, TValue>
    where TKey : notnull
    where TValue : class, new()
{
    // TKey 必须非空
    // TValue 必须是引用类型且有无参构造
}
```

### 3.3 协变（Covariance）

协变用 `out` 关键字标记，表示类型参数只能作为输出（返回值位置）。协变允许"更具体"的泛型类型赋值给"更一般"的泛型类型。

```csharp
// 协变接口定义
public interface IEnumerable<out T>  // 注意 out 关键字
{
    IEnumerator<T> GetEnumerator();
}

// 协变演示
public class Animal { }
public class Dog : Animal { }

IEnumerable<Dog> dogs = new List<Dog> { new Dog(), new Dog() };
IEnumerable<Animal> animals = dogs;  // 合法：协变

foreach (Animal animal in animals)
{
    Console.WriteLine(animal.GetType().Name);
}
```

协变的安全性来自于"只能输出"的约束：`IEnumerable<out T>` 的 `T` 只出现在返回值位置，不会被"塞入"任何 `T` 类型的实例。因此，即使我们把 `IEnumerable<Dog>` 当作 `IEnumerable<Animal>` 使用，也不会破坏类型安全——我们只能从中"读取" `Animal`，不能往里"写入"。

#### 3.3.1 协变的形式化定义

设 `TSub` 是 `TSuper` 的子类型（`TSub <: TSuper`）。如果泛型接口 `I<out T>` 满足：

$$
\text{TSub} <: \text{TSuper} \implies I<\text{TSub}> <: I<\text{TSuper}>
$$

则称 `I<T>` 在 `T` 上是协变的。

也就是说，子类型关系沿 `out` 类型参数正向传递。

#### 3.3.2 协变的实际应用

`IEnumerable<T>` 是最常见的协变接口。任何返回 `IEnumerable<Derived>` 的方法，其返回值都可以赋值给 `IEnumerable<Base>` 变量：

```csharp
public IEnumerable<Dog> GetDogs() { ... }

IEnumerable<Animal> animals = GetDogs();  // 协变
```

`Func<in T, out TResult>` 的 `TResult` 是协变的：

```csharp
Func<Dog> dogFactory = () => new Dog();
Func<Animal> animalFactory = dogFactory;  // 协变
```

`IReadOnlyList<out T>`、`IReadOnlyCollection<out T>` 都是协变的。

### 3.4 逆变（Contravariance）

逆变用 `in` 关键字标记，表示类型参数只能作为输入（参数位置）。逆变允许"更一般"的泛型类型赋值给"更具体"的泛型类型——这是"反向"的子类型传递。

```csharp
// 逆变接口定义
public interface IComparer<in T>  // 注意 in 关键字
{
    int Compare(T x, T y);
}

// 逆变演示
public class Animal { public string Name; }
public class Dog : Animal { }

IComparer<Animal> animalComparer = Comparer<Animal>.Create(
    (a, b) => string.Compare(a.Name, b.Name));

IComparer<Dog> dogComparer = animalComparer;  // 合法：逆变

var dogs = new List<Dog> { new Dog { Name = "Buddy" }, new Dog { Name = "Rex" } };
dogs.Sort(dogComparer);  // 用 animalComparer 排序 Dog 列表
```

逆变看似反直觉，但仔细想想是合理的：`IComparer<Animal>` 知道如何比较任意两个 `Animal`，而 `Dog` 是 `Animal` 的子类，所以它当然能比较两个 `Dog`。

逆变的安全性来自于"只能输入"的约束：`IComparer<in T>` 的 `T` 只出现在参数位置，不会被"读取"出来。因此，即使我们把 `IComparer<Animal>` 当作 `IComparer<Dog>` 使用，也不会破坏类型安全——我们只能"传入" `Dog`，它会作为 `Animal` 被处理。

#### 3.4.1 逆变的形式化定义

设 `TSub` 是 `TSuper` 的子类型。如果泛型接口 `I<in T>` 满足：

$$
\text{TSub} <: \text{TSuper} \implies I<\text{TSuper}> <: I<\text{TSub}>
$$

则称 `I<T>` 在 `T` 上是逆变的。

注意子类型关系是"反向"传递的，这就是"逆变"名字的由来。

#### 3.4.2 逆变的实际应用

`Action<in T>` 是最常见的逆变委托：

```csharp
Action<Animal> animalAction = a => Console.WriteLine(a.Name);
Action<Dog> dogAction = animalAction;  // 逆变

dogAction(new Dog { Name = "Buddy" });  // 输出: Buddy
```

`IComparer<in T>`、`IEqualityComparer<in T>` 都是逆变的。

`Func<in T, out TResult>` 的 `T` 是逆变的。

### 3.5 不变（Invariance）

如果一个泛型类型参数既没有 `out` 也没有 `in`，那么它是"不变"的——子类型关系不会沿这个参数传递。

```csharp
// IList<T> 是不变的（没有 in/out）
public interface IList<T>
{
    T this[int index] { get; set; }
    void Add(T item);  // T 作为输入
    // ...
}

IList<Dog> dogs = new List<Dog>();
IList<Animal> animals = dogs;  // 编译错误：IList<T> 是不变的
```

不变性的原因在于 `IList<T>` 既读取（`get`）又写入（`set`、`Add`）`T`。如果允许协变，写入会破坏类型安全；如果允许逆变，读取会破坏类型安全。所以必须不变。

### 3.6 型变的位置规则

C# 编译器通过"位置规则"验证型变的安全性：

- **输出位置**（返回值、只读属性 getter）：只能用 `out` 类型参数
- **输入位置**（方法参数、set 属性 setter、委托的"调用"）：只能用 `in` 类型参数
- **双向位置**（既输入又输出）：只能用不变类型参数

```csharp
// 合法：out T 只出现在输出位置
public interface IProducer<out T>
{
    T Get();                    // 输出：合法
    IEnumerable<T> GetAll();    // 输出：合法（嵌套也协变）
}

// 合法：in T 只出现在输入位置
public interface IConsumer<in T>
{
    void Process(T item);       // 输入：合法
    void ProcessAll(IEnumerable<T> items);  // 输入：合法（嵌套也逆变）
}

// 编译错误：out T 出现在输入位置
public interface IInvalid<out T>
{
    void Set(T item);  // 错误：out T 不能作为输入
}

// 编译错误：in T 出现在输出位置
public interface IInvalid2<in T>
{
    T Get();  // 错误：in T 不能作为输出
}
```

## 四、工作原理

### 4.1 泛型在 CLR 中的实现

.NET 的泛型是由 CLR（Common Language Runtime）直接支持的，不是单纯的编译时特性。这与 Java 的"类型擦除"实现方式截然不同。

#### 4.1.1 泛型类型与实例化

每个泛型类型定义在元数据中有一个 `GenericTypeDefinition`。当使用具体类型参数时，CLR 会创建一个"构造类型"（constructed type）：

```csharp
// 泛型类型定义
public class List<T> { }

// 构造类型
List<int> intList;
List<string> stringList;
```

CLR 为每个构造类型创建独立的 Type 对象：

```csharp
Console.WriteLine(typeof(List<int>) == typeof(List<string>));  // False
Console.WriteLine(typeof(List<int>).GetGenericTypeDefinition() == typeof(List<string>).GetGenericTypeDefinition());  // True
```

#### 4.1.2 值类型 vs 引用类型的实例化

CLR 对值类型和引用类型的泛型实例化处理不同：

**值类型实例化**：CLR 为每个值类型参数生成专门的本地代码。`List<int>` 和 `List<double>` 有完全不同的机器码。这避免了装箱开销，但增加了代码体积。

**引用类型实例化**：CLR 为所有引用类型参数共享同一份代码。`List<string>`、`List<object>`、`List<MyClass>` 都使用同一份代码，因为所有引用都是指针大小。

```csharp
// 这两个共享同一份代码
List<string> stringList = new List<string>();
List<object> objectList = new List<object>();

// 这两个有不同的代码
List<int> intList = new List<int>();
List<double> doubleList = new List<double>();
```

这种设计兼顾了性能（值类型无装箱）和代码体积（引用类型共享代码）。

#### 4.1.3 泛型方法的实例化

泛型方法在 JIT 编译时根据调用处的类型参数实例化：

```csharp
public T Max<T>(T a, T b) where T : IComparable<T>
{
    return a.CompareTo(b) > 0 ? a : b;
}

// JIT 会为 int 和 string 生成不同的机器码
int maxInt = Max(1, 2);
string maxString = Max("apple", "banana");
```

### 4.2 型变的编译期检查

协变和逆变完全在编译期处理，运行时不感知型变。编译器通过"位置规则"检查型变安全性。

#### 4.2.1 位置规则详解

考虑以下接口：

```csharp
public interface IExample<T>
{
    T Method1();           // 输出位置
    void Method2(T arg);   // 输入位置
    T Property { get; set; }  // get 是输出，set 是输入
}
```

如果 `T` 是协变的（`out T`），那么：
- `Method1` 合法（输出位置）
- `Method2` 非法（输入位置）
- `Property` 非法（因为有 set，是输入位置）

如果 `T` 是逆变的（`in T`），那么：
- `Method1` 非法（输出位置）
- `Method2` 合法（输入位置）
- `Property` 非法（因为有 get，是输出位置）

#### 4.2.2 嵌套型变

型变可以嵌套。考虑 `IEnumerable<IEnumerable<T>>`：

```csharp
// IEnumerable<out T> 是协变的
// 内层 IEnumerable<T> 的 T 是协变的
// 外层 IEnumerable<> 也是协变的
// 所以 IEnumerable<IEnumerable<Derived>> 可以赋值给 IEnumerable<IEnumerable<Base>>

IEnumerable<IEnumerable<Dog>> dogs = ...;
IEnumerable<IEnumerable<Animal>> animals = dogs;  // 合法
```

但 `IEnumerable<Action<T>>` 的型变就复杂了：

```csharp
// Action<in T> 是逆变的
// IEnumerable<out T> 是协变的
// 所以 IEnumerable<Action<Animal>> 与 IEnumerable<Action<Dog>> 的关系？

IEnumerable<Action<Animal>> animalActions = ...;
IEnumerable<Action<Dog>> dogActions = animalActions;  // 合法（逆变 + 协变）
```

这种"协变包逆变"的规则称为"位置逆变性"（position variance）。

#### 4.2.3 数组的协变陷阱

C# 从 1.0 开始就支持数组的协变，但这实际上是一个"语言缺陷"，因为数组是可变的：

```csharp
object[] array = new string[10];  // 合法：数组协变
array[0] = 1;  // 运行时抛出 ArrayTypeMismatchException
```

这是一个历史遗留问题。数组的协变不安全，因为数组既可读又可写。编译器允许赋值，但运行时会检查类型，导致 `ArrayTypeMismatchException`。这是 C# 唯一的不安全的型变特性，泛型的型变都是安全的。

### 4.3 泛型方法的类型推断

调用泛型方法时，编译器可以自动推断类型参数：

```csharp
public T Max<T>(T a, T b) where T : IComparable<T>
{
    return a.CompareTo(b) > 0 ? a : b;
}

// 类型推断：T 推断为 int
int max = Max(1, 2);

// 显式指定：也合法
int max2 = Max<int>(1, 2);
```

类型推断遵循复杂规则：

```csharp
// 推断成功：所有参数指向同一类型 T
Max(1, 2);              // T = int
Max("a", "b");          // T = string

// 推断失败：参数类型不一致
Max(1, "b");            // 错误：无法推断 T

// 推断成功：存在隐式转换
Max(1, 1L);             // T = long（int 隐式转 long）
```

类型推断对 lambda 表达式特别重要：

```csharp
// LINQ 大量依赖类型推断
var result = numbers.Where(n => n > 0).Select(n => n.ToString()).ToList();
// Where<int>、Select<int, string> 都被自动推断
```

## 五、快速上手

### 5.1 创建第一个泛型类

```csharp
public class Stack<T>
{
    private T[] _items = new T[0];
    private int _size;

    public int Count => _size;

    public void Push(T item)
    {
        if (_size == _items.Length)
        {
            Array.Resize(ref _items, Math.Max(_items.Length * 2, 4));
        }
        _items[_size++] = item;
    }

    public T Pop()
    {
        if (_size == 0)
            throw new InvalidOperationException("Stack is empty");
        
        T item = _items[--_size];
        _items[_size] = default!;  // 释放引用
        return item;
    }

    public T Peek()
    {
        if (_size == 0)
            throw new InvalidOperationException("Stack is empty");
        return _items[_size - 1];
    }
}

// 使用
var stack = new Stack<int>();
stack.Push(1);
stack.Push(2);
stack.Push(3);
Console.WriteLine(stack.Pop());  // 3
Console.WriteLine(stack.Pop());  // 2

var stringStack = new Stack<string>();
stringStack.Push("hello");
Console.WriteLine(stringStack.Pop());  // hello
```

### 5.2 添加约束

```csharp
// 约束 T 必须实现 IComparable<T>
public class SortedList<T> where T : IComparable<T>
{
    private List<T> _items = new();

    public void Add(T item)
    {
        int i = 0;
        while (i < _items.Count && _items[i].CompareTo(item) < 0)
            i++;
        _items.Insert(i, item);
    }

    public T this[int index] => _items[index];
    public int Count => _items.Count;
}

// 使用
var list = new SortedList<int>();
list.Add(3);
list.Add(1);
list.Add(2);
Console.WriteLine(list[0]);  // 1
Console.WriteLine(list[1]);  // 2
Console.WriteLine(list[2]);  // 3
```

### 5.3 体验协变

```csharp
// 定义协变接口
public interface IProducer<out T>
{
    T Produce();
}

public class DogProducer : IProducer<Dog>
{
    public Dog Produce() => new Dog();
}

// 使用
IProducer<Dog> dogProducer = new DogProducer();
IProducer<Animal> animalProducer = dogProducer;  // 协变

Animal animal = animalProducer.Produce();
Console.WriteLine(animal.GetType().Name);  // Dog
```

### 5.4 体验逆变

```csharp
// 定义逆变接口
public interface IHandler<in T>
{
    void Handle(T item);
}

public class AnimalHandler : IHandler<Animal>
{
    public void Handle(Animal item)
    {
        Console.WriteLine($"Handling animal: {item.GetType().Name}");
    }
}

// 使用
IHandler<Animal> animalHandler = new AnimalHandler();
IHandler<Dog> dogHandler = animalHandler;  // 逆变

dogHandler.Handle(new Dog());  // 输出: Handling animal: Dog
```

## 六、基础示例

### 6.1 泛型缓存

利用泛型类型静态字段的特性，可以实现高效的类型级缓存：

```csharp
public class TypeCache<T>
{
    // 每个不同的 T 都有独立的静态字段
    public static readonly Type Type = typeof(T);
    public static readonly int Size = Unsafe.SizeOf<T>();
}

Console.WriteLine(TypeCache<int>.Type);    // System.Int32
Console.WriteLine(TypeCache<int>.Size);    // 4
Console.WriteLine(TypeCache<double>.Size); // 8
```

这种模式在性能敏感场景中很有用，例如序列化、ORM 中避免重复反射。

### 6.2 泛型单例

```csharp
public abstract class Singleton<T> where T : new()
{
    private static readonly Lazy<T> _instance = new(() => new T());
    public static T Instance => _instance.Value;
}

public class Logger : Singleton<Logger>
{
    public void Log(string message) => Console.WriteLine(message);
}

// 使用
Logger.Instance.Log("Hello");
```

### 6.3 泛型仓储模式

```csharp
public interface IEntity
{
    int Id { get; set; }
}

public class Repository<T> where T : class, IEntity, new()
{
    private readonly List<T> _items = new();

    public T GetById(int id) => _items.FirstOrDefault(x => x.Id == id);
    
    public IEnumerable<T> GetAll() => _items;
    
    public void Add(T entity) => _items.Add(entity);
    
    public void Update(T entity)
    {
        var existing = GetById(entity.Id);
        if (existing != null)
        {
            _items.Remove(existing);
            _items.Add(entity);
        }
    }
    
    public void Delete(int id)
    {
        var item = GetById(id);
        if (item != null) _items.Remove(item);
    }
}

public class User : IEntity
{
    public int Id { get; set; }
    public string Name { get; set; }
}

// 使用
var userRepo = new Repository<User>();
userRepo.Add(new User { Id = 1, Name = "Alice" });
var user = userRepo.GetById(1);
```

### 6.4 协变与委托

```csharp
public class Animal { public string Name; }
public class Dog : Animal { public string Breed; }

// Func<T, TResult> 的 TResult 是协变的
Func<Dog> dogFactory = () => new Dog { Name = "Buddy", Breed = "Lab" };
Func<Animal> animalFactory = dogFactory;  // 协变

Animal a = animalFactory();
Console.WriteLine(a.Name);  // Buddy

// Action<T> 的 T 是逆变的
Action<Animal> animalLogger = a => Console.WriteLine($"Animal: {a.Name}");
Action<Dog> dogLogger = animalLogger;  // 逆变

dogLogger(new Dog { Name = "Rex", Breed = "GS" });  // 输出: Animal: Rex
```

### 6.5 多类型参数

```csharp
public class Converter<TInput, TOutput>
    where TInput : class
    where TOutput : class, new()
{
    private readonly Func<TInput, TOutput> _convert;

    public Converter(Func<TInput, TOutput> convert)
    {
        _convert = convert;
    }

    public TOutput Convert(TInput input) => _convert(input);
    
    public IEnumerable<TOutput> ConvertAll(IEnumerable<TInput> inputs)
        => inputs.Select(_convert);
}

// 使用
public class UserDto { public string FullName { get; set; } }
public class UserEntity { public string FirstName { get; set; } public string LastName { get; set; } }

var converter = new Converter<UserEntity, UserDto>(
    u => new UserDto { FullName = $"{u.FirstName} {u.LastName}" });

var dto = converter.Convert(new UserEntity { FirstName = "Alice", LastName = "Smith" });
Console.WriteLine(dto.FullName);  // Alice Smith
```

## 七、进阶用法

### 7.1 高阶泛型

C# 不直接支持"高阶类型"（Higher-Kinded Types，HKT），但可以通过一些技巧模拟：

```csharp
// 模拟高阶类型的"Functor"概念
public interface IFunctor<TFunctor<T>> where TFunctor<T> : IFunctor<TFunctor<T>>
{
    // 这种写法在 C# 中不合法，C# 不支持 HKT
}
```

实际中，C# 通过特定的接口设计模拟类似功能：

```csharp
public interface IFunctor<T>
{
    IFunctor<TResult> Map<TResult>(Func<T, TResult> mapper);
}

public class ListFunctor<T> : IFunctor<T>
{
    private readonly List<T> _items;
    
    public ListFunctor(IEnumerable<T> items) => _items = items.ToList();
    
    public IFunctor<TResult> Map<TResult>(Func<T, TResult> mapper)
        => new ListFunctor<TResult>(_items.Select(mapper));
}

// 使用
var numbers = new ListFunctor<int>(new[] { 1, 2, 3 });
var doubled = numbers.Map(x => x * 2);
var strings = doubled.Map(x => x.ToString());
```

### 7.2 静态抽象接口成员（C# 11+）

C# 11 引入了 `static abstract` 接口成员，让泛型可以约束接口的静态成员，开启了类似 Rust trait 的能力：

```csharp
public interface INumber<T> where T : INumber<T>
{
    static abstract T Zero { get; }
    static abstract T One { get; }
    static abstract T operator +(T left, T right);
    static abstract T operator -(T left, T right);
    static abstract T operator *(T left, T right);
}

public struct Int32 : INumber<Int32>
{
    public static int Zero => 0;
    public static int One => 1;
    public static int operator +(int left, int right) => left + right;
    public static int operator -(int left, int right) => left - right;
    public static int operator *(int left, int right) => left * right;
}

// 泛型方法可以执行算术运算
public T Sum<T>(params T[] values) where T : INumber<T>
{
    T result = T.Zero;
    foreach (var v in values) result = result + v;
    return result;
}

// 使用
int sum = Sum(1, 2, 3, 4, 5);  // 15
```

这是 C# 长期以来"无法对泛型参数做算术运算"痛点的解决方案。

### 7.3 逆变委托的实际应用

逆变的常见应用是"事件处理器"和"比较器"：

```csharp
// 事件处理器：基类事件处理器可以处理子类事件
public class EventArgs { }
public class MouseEventArgs : EventArgs { public int X; public int Y; }
public class KeyEventArgs : EventArgs { public ConsoleKey Key; }

// 一个通用的"任何事件"处理器
Action<object, EventArgs> genericHandler = (sender, e) =>
{
    Console.WriteLine($"Event from {sender}: {e.GetType().Name}");
};

// 可以赋值给更具体的事件处理器（逆变）
EventHandler<MouseEventArgs> mouseHandler = (sender, e) =>
{
    Console.WriteLine($"Mouse at ({e.X}, {e.Y})");
};

// 实际上，.NET 的 EventHandler<TEventArgs> 是逆变的
public delegate void EventHandler<in TEventArgs>(object sender, TEventArgs e);
```

### 7.4 型变与 IEnumerable 的威力

协变让 `IEnumerable<T>` 极其灵活：

```csharp
public IEnumerable<Animal> GetAllAnimals()
{
    var dogs = GetDogs();
    var cats = GetCats();
    var birds = GetBirds();
    
    // 因为协变，所有都可以作为 IEnumerable<Animal>
    foreach (var animal in dogs.Concat<Animal>(cats).Concat(birds))
    {
        yield return animal;
    }
}

public IEnumerable<Dog> GetDogs() => new[] { new Dog() };
public IEnumerable<Cat> GetCats() => new[] { new Cat() };
public IEnumerable<Bird> GetBirds() => new[] { new Bird() };
```

如果没有协变，必须手动转换每个集合。

### 7.5 泛型与反射

```csharp
// 通过反射创建泛型实例
var listType = typeof(List<>);
var intListType = listType.MakeGenericType(typeof(int));
var intList = (IList<int>)Activator.CreateInstance(intListType);
intList.Add(42);

// 检查泛型类型定义
Console.WriteLine(typeof(List<int>).IsGenericType);                  // True
Console.WriteLine(typeof(List<int>).GetGenericTypeDefinition());     // List<>
Console.WriteLine(typeof(List<>).IsGenericTypeDefinition);           // True

// 获取类型参数
var typeArgs = typeof(Dictionary<string, int>).GetGenericArguments();
Console.WriteLine(string.Join(", ", typeArgs.Select(t => t.Name)));  // String, Int32
```

### 7.6 自定义协变/逆变接口

设计 API 时，应该主动考虑型变：

```csharp
// 只读集合：协变
public interface IReadOnlyRepository<out T>
{
    T GetById(int id);
    IEnumerable<T> GetAll();
    // 不能有 void Add(T item);  // 这会让 T 出现在输入位置，破坏协变
}

// 只写集合：逆变
public interface IWriteOnlyRepository<in T>
{
    void Add(T item);
    void Update(T item);
    void Delete(T item);
    // 不能有 T GetById(int id);  // 这会让 T 出现在输出位置，破坏逆变
}

// 读写集合：不变
public interface IRepository<T>
{
    T GetById(int id);
    void Add(T item);
    void Update(T item);
    void Delete(T item);
    IEnumerable<T> GetAll();
}
```

## 八、性能考量

### 8.1 泛型 vs 非泛型的性能

泛型相比非泛型（基于 `object`）有显著性能优势，尤其是对值类型：

```csharp
// 非泛型：ArrayList
var arrayList = new ArrayList();
var sw = Stopwatch.StartNew();
for (int i = 0; i < 1_000_000; i++)
{
    arrayList.Add(i);  // 装箱
}
sw.Stop();
Console.WriteLine($"ArrayList: {sw.ElapsedMilliseconds} ms");

// 泛型：List<int>
var list = new List<int>();
sw.Restart();
for (int i = 0; i < 1_000_000; i++)
{
    list.Add(i);  // 无装箱
}
sw.Stop();
Console.WriteLine($"List<int>: {sw.ElapsedMilliseconds} ms");
```

典型结果（Debug 模式）：
- `ArrayList`：约 50 ms（含 100 万次装箱）
- `List<int>`：约 5 ms（无装箱）

泛型对值类型有 5-10 倍性能提升，主要来自避免装箱和类型转换。

### 8.2 泛型代码体积

每个值类型参数化会产生独立的本地代码，可能增加代码体积：

```csharp
List<int>     // 生成一份代码
List<long>    // 生成一份代码
List<float>   // 生成一份代码
List<double>  // 生成一份代码
List<object>  // 与 List<string> 等共享代码
List<string>  // 与 List<object> 等共享代码
```

对于引用类型参数，所有共享同一份代码，所以 `List<string>` 和 `List<MyClass>` 没有额外的代码体积开销。

### 8.3 约束对性能的影响

约束本身不影响运行时性能（约束在编译期处理），但选择不同的约束会影响可用操作：

```csharp
// 约束 IComparable<T>：可以调用 CompareTo
public T Max<T>(T a, T b) where T : IComparable<T>
    => a.CompareTo(b) > 0 ? a : b;

// 无约束：只能用 Comparer<T>.Default，可能有反射开销
public T Max<T>(T a, T b)
    => Comparer<T>.Default.Compare(a, b) > 0 ? a : b;
```

### 8.4 泛型委托 vs 具体委托

```csharp
// 旧式：为每种签名定义委托
public delegate void StringAction(string s);
public delegate void IntAction(int i);

// 新式：用泛型委托 Action<T>
Action<string> stringAction = s => { };
Action<int> intAction = i => { };
```

泛型委托减少了类型数量，且支持协变/逆变，更灵活。

## 九、最佳实践

### 9.1 命名与设计

**1. 类型参数命名**

- 单参数用 `T`：`List<T>`
- 多参数用描述性名字：`Dictionary<TKey, TValue>`
- 返回类型用 `TResult`：`Func<T, TResult>`

**2. 约束放在类还是方法**

如果约束对整个类有意义，放类级别；如果只对某个方法有意义，放方法级别：

```csharp
// 类级别约束
public class Repository<T> where T : class, IEntity
{
    public T Get(int id) { ... }
    public void Save(T entity) { ... }
}

// 方法级别约束
public class MathUtils
{
    public T Max<T>(T a, T b) where T : IComparable<T>
        => a.CompareTo(b) > 0 ? a : b;
}
```

### 9.2 型变设计

**1. 默认考虑型变**

设计泛型接口时，主动考虑是否能标记为协变或逆变。这会让接口更灵活：

```csharp
// 好：标记为协变，让接口更灵活
public interface IReadOnlyList<out T>
{
    T this[int index] { get; }
    int Count { get; }
}

// 不好：没有标记，限制了使用场景
public interface ICustomList<T>
{
    T this[int index] { get; }
    int Count { get; }
}
```

**2. 读写分离**

如果一个接口既需要读又需要写，考虑拆分为协变和逆变两个接口：

```csharp
// 不变接口：读写一体
public interface ICache<T>
{
    T Get(string key);
    void Set(string key, T value);
}

// 拆分后：协变 + 逆变
public interface ICacheReader<out T>  // 协变
{
    T Get(string key);
}

public interface ICacheWriter<in T>  // 逆变
{
    void Set(string key, T value);
}

// 组合接口：不变，但消费者可以选择只依赖读或写
public interface ICache<T> : ICacheReader<T>, ICacheWriter<T> { }
```

### 9.3 避免过度泛化

```csharp
// 不好：过度泛化，把简单问题复杂化
public class Processor<TInput, TOutput, TConfig, TContext, TLogger>
    where TInput : class
    where TOutput : class, new()
    where TConfig : IConfig
    where TContext : IContext
    where TLogger : ILogger<TInput>
{
    // ...
}

// 好：合理的设计
public class OrderProcessor
{
    public OrderProcessor(IRepository<Order> orders, ILogger<OrderProcessor> logger) { }
}
```

### 9.4 谨慎使用 `new()` 约束

`new()` 约束要求有无参公共构造函数，这限制了使用：

```csharp
// 不好：强制要求无参构造
public class Factory<T> where T : new()
{
    public T Create() => new T();
}

// 好：通过工厂委托，更灵活
public class Factory<T>
{
    private readonly Func<T> _creator;
    
    public Factory(Func<T> creator) => _creator = creator;
    
    public T Create() => _creator();
}
```

### 9.5 优先使用泛型集合

```csharp
// 不好：使用 ArrayList、Hashtable
var list = new ArrayList();
var table = new Hashtable();

// 好：使用 List<T>、Dictionary<TKey, TValue>
var list = new List<int>();
var table = new Dictionary<string, int>();
```

## 十、常见陷阱与反模式

### 10.1 误用协变导致写入不安全

```csharp
// 错误想法：让 List<T> 协变，从而 List<Derived> 可以赋值给 List<Base>
// 这是不可能的，因为 List<T> 有 Add(T) 方法，T 是输入位置

// 如果你尝试自己定义一个"协变 + 写入"的接口：
public interface IBad<out T>
{
    void Add(T item);  // 编译错误！out T 不能作为输入
}
```

### 10.2 类型参数隐藏

```csharp
public class Container<T>
{
    public void Process<T>(T item)  // 警告：内层 T 隐藏了外层 T
    {
        // 这里的 T 是方法的，不是类的
    }
}

// 正确：用不同的名字
public class Container<T>
{
    public void Process<TItem>(TItem item) { }
}
```

### 10.3 重载歧义

```csharp
public class Example
{
    public void Process<T>(T item) { }
    public void Process(string item) { }
    
    public void Test()
    {
        Process("hello");  // 调用 Process(string)，因为非泛型优先
        Process("hello");  // 如果想调用泛型版，需要显式指定：Process<string>("hello")
    }
}
```

### 10.4 静态字段共享陷阱

```csharp
public class Counter<T>
{
    public static int Count = 0;  // 每个不同的 T 有独立的 Count
    public static void Increment() => Count++;
}

Counter<int>.Increment();
Counter<int>.Increment();
Counter<string>.Increment();

Console.WriteLine(Counter<int>.Count);     // 2
Console.WriteLine(Counter<string>.Count);  // 1
```

这有时是期望的行为（类型级缓存），有时是陷阱（意外地不共享状态）。

### 10.5 协变委托的滥用

```csharp
// 看似合理的协变委托
Func<Animal> animalFactory = () => new Animal();
Func<Dog> dogFactory = () => new Dog();
Func<Animal> factory = dogFactory;  // 协变：合法

// 但反过来不行
Func<Dog> dogFactory2 = animalFactory;  // 编译错误：Animal 不是 Dog
```

协变方向必须正确：从具体到一般。

### 10.6 逆变方向错误

```csharp
// 错误的逆变方向
Action<Dog> dogAction = d => Console.WriteLine(d.Breed);
Action<Animal> animalAction = dogAction;  // 编译错误

// 正确的逆变方向
Action<Animal> animalAction = a => Console.WriteLine(a.GetType().Name);
Action<Dog> dogAction = animalAction;  // 合法：逆变
```

逆变方向：从一般到具体。

### 10.7 误以为所有泛型都协变

```csharp
// IList<T> 是不变的
IList<Dog> dogs = new List<Dog>();
IList<Animal> animals = dogs;  // 编译错误

// 但 IEnumerable<T> 是协变的
IEnumerable<Dog> dogs2 = new List<Dog>();
IEnumerable<Animal> animals2 = dogs2;  // 合法
```

记住：只有标记了 `out`/`in` 的接口和委托才有型变。

## 十一、对比与生态

### 11.1 与 Java 泛型对比

| 特性 | C# | Java |
|------|-----|------|
| 实现 | CLR 运行时支持 | 类型擦除（编译时） |
| 值类型泛型 | 支持（无装箱） | 不支持（自动装箱） |
| 协变/逆变 | 显式（in/out） | 使用处（? extends/super） |
| 类型信息保留 | 运行时可用 | 运行时擦除 |
| 性能 | 值类型高性能 | 装箱开销 |

```csharp
// C#：运行时类型可用
Console.WriteLine(list.GetType());  // System.Collections.Generic.List`1[System.Int32]

// Java：运行时类型擦除
// list.getClass() 返回 java.util.ArrayList，无法知道元素类型
```

Java 的"使用处型变"（use-site variance）通过通配符实现：

```java
// Java 的使用处型变
List<? extends Animal> animals = new ArrayList<Dog>();  // 协变
List<? super Dog> dogs = new ArrayList<Animal>();       // 逆变
```

C# 的"定义处型变"（declaration-site variance）在接口定义时就决定型变性质，使用时无需指定。两种方式各有优劣：Java 更灵活，C# 更简洁。

### 11.2 与 C++ 模板对比

| 特性 | C# 泛型 | C++ 模板 |
|------|---------|----------|
| 时机 | 运行时实例化 | 编译时实例化 |
| 约束 | 显式（where） | 隐式（鸭子类型） |
| 代码体积 | 共享（引用类型） | 每个实例独立 |
| 错误信息 | 清晰 | 著名的"模板错误墙" |
| 元编程 | 不支持 | 支持（模板元编程） |

C++ 模板更强大（支持元编程），但更难使用。C# 泛型更安全、更易用，但能力较弱。

### 11.3 与 Rust 泛型对比

| 特性 | C# 泛型 | Rust 泛型 |
|------|---------|-----------|
| 单态化 | 部分（值类型） | 完全单态化 |
| 约束 | where 子句 | trait bound |
| 性能 | 值类型零成本 | 完全零成本 |
| 型变 | 显式 in/out | 生命周期型变 |

Rust 的泛型完全单态化（每个具体类型生成独立代码），性能最优但代码体积可能较大。Rust 还支持关联类型（associated types），C# 11 之前需要用 `TResult` 等额外参数模拟。

## 十二、总结与展望

### 12.1 核心要点回顾

**泛型**是 C# 类型系统的基石，它让代码在保持类型安全的同时实现复用。泛型通过类型参数化，避免了 `object` 带来的类型不安全和装箱开销。

**约束**让类型参数获得更多能力（调用特定方法、创建实例等），是写出有用泛型代码的关键。C# 提供了多种约束：`class`、`struct`、`new()`、基类、接口、`unmanaged`、`notnull`、`Enum`、`Delegate`。

**协变和逆变**定义了泛型类型参数的子类型关系如何传递。协变（`out`）让"具体类型"可以赋值给"一般类型"，逆变（`in`）让"一般类型"可以赋值给"具体类型"。型变通过"位置规则"在编译期验证安全性。

**.NET 的泛型实现**在 CLR 层面支持，对值类型生成专门代码（无装箱），对引用类型共享代码（节省体积）。这与 Java 的类型擦除有本质区别。

### 12.2 实践建议

1. **优先使用泛型集合**：`List<T>` 而非 `ArrayList`，`Dictionary<TKey, TValue>` 而非 `Hashtable`。

2. **主动设计型变接口**：只读接口标记为协变，只写接口标记为逆变，读写接口保持不变。

3. **谨慎使用 `new()` 约束**：它会限制使用场景，考虑用 `Func<T>` 工厂委托替代。

4. **避免过度泛化**：5 个类型参数的泛型类通常意味着设计问题。

5. **理解 CLR 泛型机制**：值类型独立代码，引用类型共享代码，这影响性能和内存。

6. **善用 C# 11+ 的静态抽象**：让泛型支持算术运算，开启新的设计可能。

### 12.3 进阶学习路径

- **C# 11 静态抽象接口成员**：理解如何用接口约束静态成员，实现类似 Rust trait 的能力
- **源生成器与泛型**：用 Source Generator 在编译时生成泛型代码，减少反射
- **表达式树与泛型**：将泛型 lambda 转换为表达式树，用于 LINQ、EF Core 等
- **泛型与 AOT**：了解 Native AOT 对泛型的处理，避免动态泛型实例化
- **型变与 LINQ**：理解 LINQ 大量依赖协变（`IEnumerable<out T>`）

### 12.4 未来趋势

**更强大的类型系统**：C# 团队正在探索关联类型（associated types）、高阶类型等高级特性，这将极大提升泛型表达能力。

**编译时泛型**：Source Generator 让更多泛型逻辑在编译时完成，减少运行时开销。

**AOT 友好的泛型**：Native AOT 要求泛型在编译时已知，可能推动"显式泛型实例化"特性。

**模式匹配与泛型**：未来的模式匹配可能更深度地与泛型交互，例如基于类型参数的模式。

### 12.5 结语

泛型与协变逆变是 C# 类型系统中最精妙的部分。它们让代码既安全又灵活，既高效又可复用。理解泛型不仅是掌握一门语言特性，更是理解现代类型理论在工程中的应用。

本篇从历史演进到核心概念，从工作原理到最佳实践，全面覆盖了泛型与协变逆变的知识体系。希望你通过本篇的学习，能够自信地设计和使用泛型 API，写出类型安全、高性能、可维护的 C# 代码。

记住，泛型的最终目的是"用一套代码处理多种类型"。当你发现自己为不同类型写重复代码时，就该考虑泛型了。当你设计 API 时，主动考虑型变，让你的 API 更灵活、更易组合。

## 附录 A：泛型约束速查

```csharp
where T : class              // 引用类型
where T : class?             // 引用类型（可空）
where T : struct             // 值类型
where T : unmanaged          // 非托管值类型
where T : notnull            // 非空类型
where T : new()              // 无参构造
where T : BaseClass          // 基类约束
where T : IInterface         // 接口约束
where T : Enum               // 枚举约束
where T : Delegate           // 委托约束
where T : U                  // T 必须可隐式转换为 U
```

## 附录 B：型变速查

```csharp
// 协变（out）
interface IEnumerable<out T> { }
interface IEnumerator<out T> { }
interface IReadOnlyList<out T> { }
interface IReadOnlyCollection<out T> { }
delegate TResult Func<out TResult>();  // 简化版
delegate T Func<in T, out TResult>(T arg);

// 逆变（in）
interface IComparer<in T> { }
interface IEqualityComparer<in T> { }
interface IAction<in T> { }
delegate void Action<in T>(T obj);

// 不变
interface IList<T> { }
interface ICollection<T> { }
interface IDictionary<TKey, TValue> { }
```

## 附录 C：常见问题

**Q: 为什么 `IList<T>` 是不变的？**
A: 因为 `IList<T>` 既可读（`this[int]` get）又可写（`this[int]` set、Add），T 同时出现在输入和输出位置，无法安全型变。

**Q: 为什么数组是协变的？**
A: 历史原因。C# 1.0 没有泛型，数组协变是为了让 `object[]` 能接受任意数组。这是不安全的（运行时检查），但向后兼容。

**Q: 泛型方法可以协变吗？**
A: 方法本身的返回类型可以协变（C# 9+ 的协变返回类型），但方法不是协变的容器。委托的型变才适用于方法。

**Q: 为什么 `struct` 不能协变？**
A: struct 是值类型，赋值会发生复制，型变的"引用兼容"语义不适用。只有引用类型才能型变。

**Q: 泛型和 `object` 性能差距多大？**
A: 对值类型，泛型避免装箱，性能提升 5-10 倍。对引用类型，泛型避免类型转换，提升约 2 倍。

## 附录 D：参考资源

- [官方文档：C# 中的泛型](https://learn.microsoft.com/dotnet/csharp/fundamentals/types/generics)
- [官方文档：协变和逆变](https://learn.microsoft.com/dotnet/csharp/programming-guide/concepts/covariance-contravariance/)
- [ECMA-335 标准：CLI 规范](https://www.ecma-international.org/publications-and-standards/standards/ecma-335/)
- [Jon Skeet：C# in Depth](https://csharpindepth.com/)
- [Eric Lippert 的博客：协变和逆变系列](https://ericlippert.com/2007/10/16/covariance-and-contravariance-in-c-part-one/)
