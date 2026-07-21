# C# 高级特性

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## Span\<T\> 与 Memory\<T\>

**基本写法：Span 从数组创建**
`Span<<类型>> <变量> = <数组>.AsSpan();`
```csharp
// 从数组创建 Span
int[] array = { 1, 2, 3, 4, 5 };
Span<int> span = array.AsSpan();
```

---

**基本写法：Span 切片**
`Span<<类型>> <变量> = <源Span>[<开始>..<结束>];`
```csharp
// 获取 Span 的切片
Span<int> slice = span[1..4];
```

---

**基本写法：Span 索引访问**
`<类型> <变量> = <Span>[<索引>];`
```csharp
// 通过索引访问 Span 元素
int first = span[0];
```

---

**基本写法：Span 修改元素**
`<Span>[<索引>] = <值>;`
```csharp
// 修改 Span 中的元素
span[0] = 100;
```

---

**基本写法：Span 遍历**
`foreach (var <变量> in <Span>)`
```csharp
// 遍历 Span 的元素
foreach (var item in span)
{
    Console.WriteLine(item);
}
```

---

**基本写法：stackalloc 栈分配**
`Span<<类型>> <变量> = stackalloc <类型>[<大小>];`
```csharp
// 在栈上分配内存
Span<int> buffer = stackalloc int[10];
```

---

**基本写法：Memory 创建**
`Memory<<类型>> <变量> = new <<类型>>[<大小>];`
```csharp
// 创建 Memory
Memory<int> memory = new int[10];
```

---

**基本写法：Memory 转 Span**
`Span<<类型>> <变量> = <Memory>.Span;`
```csharp
// 从 Memory 获取 Span
Span<int> span = memory.Span;
```

---

**基本写法：Memory 异步访问**
`async Task <方法>(Memory<<类型>> <参数>)`
```csharp
// 异步方法中使用 Memory
async Task ProcessAsync(Memory<int> memory)
{
    await Task.Delay(100);
    var span = memory.Span;
    for (int i = 0; i < span.Length; i++)
    {
        span[i] = i;
    }
}
```

---

## 反射

**基本写法：获取 Type 对象**
`Type <变量> = typeof(<类型>);`
```csharp
// 获取类型的 Type 对象
Type type = typeof(Person);
```

---

**基本写法：GetType 实例方法**
`Type <变量> = <对象>.GetType();`
```csharp
// 获取对象运行时类型
var person = new Person("张三", 25);
Type type = person.GetType();
```

---

**基本写法：获取所有属性**
`PropertyInfo[] <变量> = <Type>.GetProperties();`
```csharp
// 获取类型的所有公共属性
PropertyInfo[] properties = type.GetProperties();
```

---

**基本写法：获取所有方法**
`MethodInfo[] <变量> = <Type>.GetMethods();`
```csharp
// 获取类型的所有公共方法
MethodInfo[] methods = type.GetMethods();
```

---

**基本写法：动态创建实例**
`object <变量> = Activator.CreateInstance<<类型>>();`
```csharp
// 动态创建类型实例
object instance = Activator.CreateInstance<Person>();
```

---

**基本写法：动态获取属性值**
`object? <变量> = <属性>.GetValue(<对象>);`
```csharp
// 通过反射获取属性值
var prop = type.GetProperty("Name");
object? value = prop?.GetValue(person);
```

---

**基本写法：动态设置属性值**
`<属性>.SetValue(<对象>, <值>);`
```csharp
// 通过反射设置属性值
var prop = type.GetProperty("Name");
prop?.SetValue(person, "李四");
```

---

**基本写法：动态调用方法**
`object? <变量> = <方法>.Invoke(<对象>, <参数>);`
```csharp
// 通过反射调用方法
var method = type.GetMethod("Greet");
object? result = method?.Invoke(person, null);
```

---

## 特性 (Attribute)

**基本写法：定义特性**
`[AttributeUsage(AttributeTargets.<目标>)] public class <名称> : Attribute { ... }`
```csharp
// 定义自定义特性
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class DescriptionAttribute : Attribute
{
    public string Text { get; }
    public DescriptionAttribute(string text) => Text = text;
}
```

---

**基本写法：应用特性**
`[<特性名>(<参数>)]`
```csharp
// 在类上应用特性
[Description("用户服务")]
public class UserService { }
```

---

**基本写法：方法应用特性**
`[<特性名>(<参数>)] public void <方法>() { ... }`
```csharp
// 在方法上应用特性
[Description("获取用户信息")]
public void GetUser() { }
```

---

**基本写法：获取特性**
`var <变量> = Attribute.GetCustomAttribute(<成员>, typeof(<特性>));`
```csharp
// 通过反射获取特性
var attr = Attribute.GetCustomAttribute(
    typeof(UserService),
    typeof(DescriptionAttribute));
```

---

**基本写法：特性带命名参数**
`[<特性名>(<位置参数>, <命名参数> = <值>)]`
```csharp
// 特性使用命名参数
[Description("用户服务", Priority = 1)]
public class UserService { }
```

---

## 表达式树

**基本写法：Lambda 表达式树**
`Expression<Func<<类型>, <返回类型>>> <变量> = <参数> => <表达式>;`
```csharp
// 创建表达式树
Expression<Func<int, int>> expr = x => x * 2;
```

---

**基本写法：编译并执行**
`Func<<类型>, <返回类型>> <变量> = <表达式>.Compile();`
```csharp
// 编译表达式树为委托
Func<int, int> func = expr.Compile();
int result = func(21);
```

---

**基本写法：参数表达式**
`ParameterExpression <变量> = Expression.Parameter(typeof(<类型>), "<名称>");`
```csharp
// 创建参数表达式
ParameterExpression param = Expression.Parameter(typeof(int), "x");
```

---

**基本写法：常量表达式**
`ConstantExpression <变量> = Expression.Constant(<值>);`
```csharp
// 创建常量表达式
ConstantExpression constant = Expression.Constant(2);
```

---

**基本写法：二元运算表达式**
`BinaryExpression <变量> = Expression.Multiply(<左>, <右>);`
```csharp
// 创建乘法表达式
BinaryExpression multiply = Expression.Multiply(param, constant);
```

---

**基本写法：构建 Lambda**
`Expression<Func<<类型>, <返回类型>>> <变量> = Expression.Lambda<<委托>>>(<主体>, <参数>);`
```csharp
// 组合表达式构建 Lambda
Expression<Func<int, int>> expr =
    Expression.Lambda<Func<int, int>>(multiply, param);
```

---

## 不安全代码与指针

**基本写法：unsafe 上下文**
`unsafe { ... }`
```csharp
// 启用不安全代码块
unsafe
{
    int x = 10;
    int* p = &x;
}
```

---

**基本写法：unsafe 方法**
`unsafe void <方法>() { ... }`
```csharp
// 声明不安全方法
unsafe void ProcessPointer(int* ptr)
{
    *ptr = 42;
}
```

---

**基本写法：指针声明**
`<类型>* <变量> = <对象>;`
```csharp
// 声明并初始化指针
int x = 10;
int* ptr = &x;
```

---

**基本写法：指针解引用**
`<类型> <变量> = *<指针>;`
```csharp
// 解引用指针获取值
int value = *ptr;
```

---

**基本写法：fixed 语句**
`fixed (<类型>* <变量> = &<字段>) { ... }`
```csharp
// 固定托管对象防止 GC 移动
int[] array = { 1, 2, 3, 4, 5 };
fixed (int* p = array)
{
    Console.WriteLine(*p);
}
```

---

**基本写法：sizeof 运算符**
`int <变量> = sizeof(<类型>);`
```csharp
// 获取类型大小
int size = sizeof(int);
```

---

## 委托与事件

**基本写法：自定义委托**
`public delegate <返回类型> <委托名>(<参数>);`
```csharp
// 定义自定义委托类型
public delegate void NotifyHandler(string message);
```

---

**基本写法：Action 委托**
`Action <变量> = () => <表达式>;`
```csharp
// 使用 Action 委托
Action action = () => Console.WriteLine("执行");
```

---

**基本写法：Action 带参数**
`Action<<类型>> <变量> = <参数> => <表达式>;`
```csharp
// 使用带参数的 Action
Action<string> log = msg => Console.WriteLine(msg);
```

---

**基本写法：Func 委托**
`Func<<类型>, <返回类型>> <变量> = <参数> => <表达式>;`
```csharp
// 使用 Func 委托
Func<int, int> square = x => x * x;
```

---

**基本写法：Predicate 委托**
`Predicate<<类型>> <变量> = <参数> => <布尔表达式>;`
```csharp
// 使用 Predicate 委托
Predicate<int> isPositive = x => x > 0;
```

---

**基本写法：事件声明**
`public event <委托类型>? <事件名>;`
```csharp
// 声明事件
public event NotifyHandler? OnNotify;
```

---

**基本写法：事件触发**
`<事件名>?.Invoke(<参数>);`
```csharp
// 触发事件
OnNotify?.Invoke("通知消息");
```

---

**基本写法：事件订阅**
`<对象>.<事件> += <处理方法>;`
```csharp
// 订阅事件
publisher.OnNotify += HandleNotify;
```

---

**基本写法：事件取消订阅**
`<对象>.<事件> -= <处理方法>;`
```csharp
// 取消订阅事件
publisher.OnNotify -= HandleNotify;
```

---

## 元组与解构

**基本写法：元组声明**
`(<类型1>, <类型2>) <变量> = (<值1>, <值2>);`
```csharp
// 创建元组
(int x, int y) point = (10, 20);
```

---

**基本写法：命名元组**
`var <变量> = (<名称1>: <值1>, <名称2>: <值2>);`
```csharp
// 创建带命名的元组
var person = (Name: "张三", Age: 25);
```

---

**基本写法：元组成员访问**
`<类型> <变量> = <元组>.<名称>;`
```csharp
// 访问元组成员
string name = person.Name;
```

---

**基本写法：元组解构**
`var (<变量1>, <变量2>) = <元组>;`
```csharp
// 解构元组
var (name, age) = person;
```

---

## 全局 using 与 Nullable

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
```

---

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

## 顶级语句与文件范围命名空间

**基本写法：顶级语句**
`<语句>;`
```csharp
// 无需 Main 方法的程序入口
var data = await FetchDataAsync();
Console.WriteLine($"获取到 {data.Length} 条记录");
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

## 集合表达式

**基本写法：数组集合表达式**
`<类型>[] <变量> = [<元素>, ...];`
```csharp
// 使用集合表达式初始化数组
int[] array = [1, 2, 3];
```

---

**基本写法：List 集合表达式**
`List<<类型>> <变量> = [<元素>, ...];`
```csharp
// 使用集合表达式初始化列表
List<string> list = ["a", "b", "c"];
```

---

**基本写法：展开运算符合并**
`<类型>[] <变量> = [..<集合1>, ..<集合2>, <元素>];`
```csharp
// 使用展开运算符合并多个集合
int[] a = [1, 2, 3];
int[] b = [4, 5, 6];
int[] combined = [..a, ..b, 7, 8];
```

---

## 源生成器

**基本写法：IIncrementalGenerator 接口**
`[Generator] public class <生成器名> : IIncrementalGenerator { ... }`
```csharp
// 定义增量源生成器
[Generator]
public class MyGenerator : IIncrementalGenerator
{
    public void Initialize(IncrementalGeneratorInitializationContext context)
    {
        // 生成器初始化
    }
}
```

---

**基本写法：ISourceGenerator 接口**
`[Generator] public class <生成器名> : ISourceGenerator { ... }`
```csharp
// 定义源生成器
[Generator]
public class MySourceGenerator : ISourceGenerator
{
    public void Execute(GeneratorExecutionContext context)
    {
        // 生成代码
    }
    public void Initialize(GeneratorInitializationContext context) { }
}
```

---

**基本写法：添加源代码**
`context.AddSource("<名称>", <代码>);`
```csharp
// 添加生成的源代码
context.AddSource("Generated.g.cs", """
    namespace Generated;
    public class Helper { }
    """);
```

---

## Native AOT 与互操作

**基本写法：LibraryImport 特性**
`[LibraryImport("<库>", EntryPoint = "<入口>")] public static partial <类型> <方法>(<参数>);`
```csharp
// 使用 LibraryImport 声明 P/Invoke
[LibraryImport("user32.dll", EntryPoint = "MessageBoxW")]
public static partial int MessageBox(IntPtr hWnd, string text, string caption, int options);
```

---

**基本写法：DllImport 特性**
`[DllImport("<库>")] public static extern <类型> <方法>(<参数>);`
```csharp
// 使用 DllImport 声明 P/Invoke
[DllImport("user32.dll")]
public static extern int MessageBox(IntPtr hWnd, string text, string caption, int options);
```

---

**基本写法：Marshal 字符串**
`[MarshalAs(UnmanagedType.<类型>)]`
```csharp
// 指定字符串封送方式
[DllImport("user32.dll", CharSet = CharSet.Unicode)]
public static extern int MessageBox(IntPtr hWnd, [MarshalAs(UnmanagedType.LPWStr)] string text, [MarshalAs(UnmanagedType.LPWStr)] string caption, int options);
```

---

## Span 高级操作

**基本写法：Span 转数组**
`<类型>[] <变量> = <Span>.ToArray();`
```csharp
// 将 Span 转换为数组
int[] array = span.ToArray();
```

---

**基本写法：Span Fill 填充**
`<Span>.Fill(<值>);`
```csharp
// 用指定值填充 Span
span.Fill(0);
```

---

**基本写法：Span CopyTo 复制**
`<Span>.CopyTo(<目标Span>);`
```csharp
// 将 Span 复制到目标 Span
var source = new int[] { 1, 2, 3 }.AsSpan();
var target = new int[3];
source.CopyTo(target);
```

---

**基本写法：MemoryMarshal 类型重解释**
`Span<<目标类型>> <变量> = MemoryMarshal.Cast<<源类型>, <目标类型>>(<源Span>);`
```csharp
// 零拷贝将字节数组重新解释为 int 数组
byte[] bytes = new byte[16];
Span<int> ints = MemoryMarshal.Cast<byte, int>(bytes.AsSpan());
ints[0] = 42;
```

---

## BitHelper 与位操作

**基本写法：BitConverter 转换**
`int <变量> = BitConverter.ToInt32(<字节数组>, <偏移>);`
```csharp
// 字节数组转整数
byte[] bytes = { 1, 0, 0, 0 };
int value = BitConverter.ToInt32(bytes, 0);
```

---

**基本写法：整数转字节**
`byte[] <变量> = BitConverter.GetBytes(<整数>);`
```csharp
// 整数转字节数组
byte[] bytes = BitConverter.GetBytes(42);
```

---

**基本写法：位运算**
`int <变量> = <值1> | <值2>;`
```csharp
// 位或运算
int flags = 0x01 | 0x02;
```

---

**基本写法：位与运算**
`int <变量> = <值1> & <值2>;`
```csharp
// 位与运算
int mask = flags & 0x01;
```

---

**基本写法：位移运算**
`int <变量> = <值> << <位数>;`
```csharp
// 左移运算
int shifted = 1 << 4;
```

---

## C# 13/14 新特性

**基本写法：C# 13 lock 类型**
`System.Threading.Lock`
```csharp
// C# 13 新增专用锁类型，性能优于传统 object 锁
System.Threading.Lock myLock = new();
// 使用 EnterScope 自动管理锁的进入与退出
using (myLock.EnterScope())
{
    // 临界区代码
    Console.WriteLine("已获取锁");
}
```

**基本写法：C# 13 params 集合**
`params <Collection> <参数>`
```csharp
// params 关键字支持 ReadOnlySpan、IEnumerable 等集合类型
void Process(params ReadOnlySpan<int> nums)
{
    foreach (var n in nums) Console.WriteLine(n);
}
// 也支持自定义集合类型
void Build(params List<string> items)
{
    items.ForEach(Console.WriteLine);
}
// 调用
Process(1, 2, 3);
Build(new List<string> { "a", "b" });
```

**基本写法：C# 13 escape 字符 \e**
`string <变量> = "\e";`
```csharp
// 新增 \e 转义字符表示 ESC (Unicode U+001B)
string escape = "\e";
// 用于终端控制序列
Console.WriteLine("\e[31m红色文本\e[0m");
```

**基本写法：C# 14 扩展成员**
`extension members for <类型> { }`
```csharp
// C# 14 引入扩展成员语法，统一扩展方法、属性等
extension members for string
{
    public static bool IsBlank(string s) => string.IsNullOrWhiteSpace(s);
    public string Reversed() => new string(this.Reverse().ToArray());
}
// 使用
string str = "hello";
bool blank = string.IsBlank(str);
string rev = str.Reversed();
```

**基本写法：C# 14 null 条件分配**
`<obj>?.<字段> = <值>;`
```csharp
// 仅当 obj 非空时才赋值字段
class User { public string? Name { get; set; } }
User? user = GetUser();
user?.Name = "Alice";
// 等价于 if (user != null) user.Name = "Alice";
```

**基本写法：C# 14 implicit span conversion**
`Span<<T>> <变量> = <数组>;`
```csharp
// 隐式转换：数组与 Span<T> 之间自动转换
int[] arr = { 1, 2, 3, 4, 5 };
// 数组隐式转换为 Span<T>，无需显式 AsSpan 调用
Span<int> span = arr;
ReadOnlySpan<int> ros = arr;
foreach (var v in span) Console.WriteLine(v);
```

**基本写法：C# 14 partial constructors**
`partial <类型>()`
```csharp
// partial 构造函数：将构造逻辑拆分到多个 partial 文件
partial class Service
{
    // 主文件声明 partial 构造函数
    public partial Service();
}
// 另一个文件实现
partial class Service
{
    public partial Service()
    {
        Console.WriteLine("partial 构造逻辑执行");
    }
}
```
