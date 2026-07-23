# C# 值类型与引用类型

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 赋值行为差异

**基本写法：值类型赋值**
`<值类型> <变量B> = <变量A>;`
```csharp
// struct 赋值复制值，两个变量相互独立
var p1 = new Point(1, 2);
var p2 = p1;
p2.X = 10;
```

---

**基本写法：引用类型赋值**
`<引用类型> <变量B> = <变量A>;`
```csharp
// class 赋值复制引用，两个变量指向同一对象
var u1 = new User("张三");
var u2 = u1;
u2.Name = "李四";
```

---

## 装箱与拆箱

**基本写法：装箱操作**
`object <变量> = <值类型变量>;`
```csharp
// 值类型转换为堆上的引用类型
int x = 42;
object obj = x;
```

---

**基本写法：拆箱操作**
`<值类型> <变量> = (<值类型>)<object变量>;`
```csharp
// 引用类型转换回值类型
object obj = 42;
int y = (int)obj;
```

---

**基本写法：泛型列表避免装箱**
`List<<值类型>> <变量> = new();`
```csharp
// 使用泛型列表存储值类型，避免装箱开销
var list = new List<int>();
list.Add(42);
```

---

## struct 定义

**单行写法：readonly struct 单字段定义**
`public readonly struct <名称> { public <类型> <属性> { get; } }`
```csharp
// 单行定义不可变值类型
public readonly struct Point { public double X { get; } public double Y { get; } public Point(double x, double y) => (X, Y) = (x, y); }
```

---

**换行写法：readonly struct 多字段定义**
`public readonly struct <名称> { public <类型> <属性> { get; } public <类型> <属性> { get; } }`
```csharp
// 换行定义包含多个属性的不可变值类型
public readonly struct Point
{
    public double X { get; }
    public double Y { get; }
    public Point(double x, double y) => (X, Y) = (x, y);
}
```

---

**基本写法：readonly struct 含方法**
`public double <方法>(<参数>) => <表达式>;`
```csharp
// 在 readonly struct 中定义计算方法
public double DistanceTo(Point other) =>
    Math.Sqrt(Math.Pow(X - other.X, 2) + Math.Pow(Y - other.Y, 2));
```

---

**基本写法：ref struct 定义**
`public ref struct <名称> { ... }`
```csharp
// 定义只能存在于栈上的结构体
public ref struct StackBuffer
{
    private readonly Span<byte> _buffer;
    public StackBuffer(int size) => _buffer = stackalloc byte[size];
}
```

---

**基本写法：ref struct 写方法**
`public void <方法>(<参数>) => <表达式>;`
```csharp
// 在 ref struct 中定义写入方法
public void Write(int offset, byte value) => _buffer[offset] = value;
```

---

## record struct

**基本写法：record struct 定义**
`public record struct <名称>(<参数列表>);`
```csharp
// 定义值类型记录，自动生成相等性比较
public record struct Point(double X, double Y);
```

---

**基本写法：record struct 值相等**
`bool <结果> = <记录1> == <记录2>;`
```csharp
// 值类型记录基于值比较相等性
var p1 = new Point(1, 2);
var p2 = new Point(1, 2);
Console.WriteLine(p1 == p2);
```

---

**基本写法：record class 定义**
`public record <名称>(<参数列表>);`
```csharp
// 定义引用类型记录
public record User(string Name, int Age);
```

---

**基本写法：record class with 表达式**
`var <变量> = <记录> with { <属性> = <值> };`
```csharp
// 使用 with 创建引用类型记录的修改副本
var u1 = new User("张三", 25);
var u2 = u1 with { Age = 26 };
```

---

## 接口与装箱

**基本写法：值类型实现接口**
`struct <名称> : <接口> { public void <方法>() { ... } }`
```csharp
// 值类型实现接口
struct MyProcessor : IProcessor
{
    public void Process() { }
}
```

---

**基本写法：直接调用无装箱**
`<值类型变量>.<方法>();`
```csharp
// 直接调用值类型方法，无装箱开销
MyProcessor processor = new();
processor.Process();
```

---

**基本写法：接口调用导致装箱**
`<接口> <变量> = <值类型实例>;`
```csharp
// 通过接口调用值类型会装箱
MyProcessor processor = new();
IProcessor boxed = processor;
```

---

**基本写法：泛型约束避免装箱**
`void <方法><T>(T <参数>) where T : <接口>`
```csharp
// 使用泛型约束避免接口调用装箱
void Process<T>(T processor) where T : IProcessor
{
    processor.Process();
}
```

---

## 参数传递优化

**基本写法：ref 引用传递**
`void <方法>(ref <类型> <参数>)`
```csharp
// 通过引用传递参数，避免大 struct 复制
void ProcessLargeStruct(ref LargeData data)
{
    data.Value = 42;
}
```

---

**基本写法：in 只读引用传递**
`void <方法>(in <类型> <参数>)`
```csharp
// 通过只读引用传递参数
void ReadLargeStruct(in LargeData data)
{
    Console.WriteLine(data.Value);
}
```

---

**基本写法：ref 返回**
`ref <类型> <方法>(<参数>)`
```csharp
// 返回引用，调用者可直接修改原数据
ref int FindMax(int[] array)
{
    int maxIndex = 0;
    for (int i = 1; i < array.Length; i++)
    {
        if (array[i] > array[maxIndex]) maxIndex = i;
    }
    return ref array[maxIndex];
}
```

---

## 结构体内存布局

**基本写法：StructLayout 顺序布局**
`[StructLayout(LayoutKind.Sequential)] public struct <名称> { ... }`
```csharp
// 控制结构体内存布局用于互操作
[StructLayout(LayoutKind.Sequential)]
public struct NativeHeader
{
    public int Magic;
    public short Version;
    public short Flags;
    public int DataLength;
}
```

---

**基本写法：StructLayout 显式布局**
`[StructLayout(LayoutKind.Explicit)] public struct <名称> { [FieldOffset(<偏移>)] public <类型> <字段>; }`
```csharp
// 精确控制字段偏移实现联合体效果
[StructLayout(LayoutKind.Explicit)]
public struct UnionValue
{
    [FieldOffset(0)] public int IntValue;
    [FieldOffset(0)] public float FloatValue;
}
```

---

## MemoryMarshal 高级操作

**基本写法：类型重解释**
`MemoryMarshal.Cast<<源类型>, <目标类型>>(<Span>)`
```csharp
// 零拷贝将字节数组重新解释为 int 数组
byte[] bytes = new byte[16];
Span<int> ints = MemoryMarshal.Cast<byte, int>(bytes.AsSpan());
ints[0] = 42;
```

---

**基本写法：结构体转字节**
`MemoryMarshal.AsBytes(MemoryMarshal.CreateReadOnlySpan(ref <结构体>, 1))`
```csharp
// 将结构体转换为只读字节跨度
var header = new NativeHeader { Magic = 0x4D42, Version = 1 };
ReadOnlySpan<byte> headerBytes = MemoryMarshal.AsBytes(
    MemoryMarshal.CreateReadOnlySpan(ref header, 1));
```
