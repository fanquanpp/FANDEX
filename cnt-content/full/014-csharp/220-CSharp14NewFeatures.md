---
order: 220
title: C# 14 新特性：扩展成员、field 关键字与 .NET 10
module: 'csharp'
category: 后端技术
difficulty: intermediate
description: 系统讲解 C# 14（随 .NET 10 LTS，2025.11 发布）的扩展成员、field 关键字、null 条件赋值等八项新特性，附迁移前后对照、可运行示例与采用建议。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'csharp/210-C12C13NewFeatures'
  - 'csharp/150-CSharpAdvancedFeature'
  - 'csharp/240-SourceGenerator'
  - 'csharp/230-SpanMemory'
prerequisites:
  - 'csharp/040-CSharpOOP'
  - 'csharp/150-CSharpAdvancedFeature'
---

## 前置知识

- 熟悉属性（自动属性、表达式体属性）与扩展方法的现有写法；
- 了解泛型、`partial` 类型与源生成器的基本概念；
- 若尚未系统学习 C# 12/13，建议先读 [C# 12/13 新特性](/csharp/210-C12C13NewFeatures)。

## 学习目标

1. 说出 C# 14 八项语言特性的名字与各自解决的痛点；
2. 用扩展成员（extension block）为既有类型添加扩展属性与静态扩展成员；
3. 用 `field` 关键字替换"手动声明后备字段"的样板代码；
4. 评估哪些特性适合立即在生产采用，哪些只服务于特定场景（源生成、AOT）。

## 一、概述：版本线与发布节奏

C# 14 是随 **.NET 10**（2025 年 11 月发布，LTS，支持至 2028 年 11 月）一起发布的默认语言版本。版本线回顾：

| C# 版本 | 随附 .NET | 发布时间 | 关键词 |
|---------|-----------|---------|--------|
| C# 12 | .NET 8（LTS） | 2023.11 | 主构造函数、集合表达式 |
| C# 13 | .NET 9（STS） | 2024.11 | `params` 集合、`System.Threading.Lock` |
| C# 14 | .NET 10（LTS） | 2025.11 | 扩展成员、`field`、null 条件赋值 |

C# 14 的整体主题可以概括为两句话：**把"扩展"做完整**（扩展成员统一了扩展方法的旁支语法），**把"属性"做彻底**（`field` 关键字补上了自动属性与完整属性之间的缝隙）。其余特性多是服务库作者与源生成器作者的"缝纫针脚"。

## 二、扩展成员（Extension Members）

### 2.1 痛点

C# 3 的扩展方法只能"给类型加方法"。想加一个**扩展属性**（如 `string.WordCount`）、或给**静态成员**打扩展（如 `int.MaxValueOf<T>()` 风格），都做不到，只能退化为静态工具类调用。社区等了十几年，C# 14 用 `extension` 块一次性补齐。

### 2.2 语法与示例

```csharp
public static class IntExtensions
{
    // extension 块：括号里是"接收者参数"，块内所有成员都挂在它身上
    extension(IEnumerable<int> source)
    {
        // 扩展属性：调用方写 list.IsEmpty
        public bool IsEmpty => !source.Any();

        // 扩展方法：与旧扩展方法能力一致
        public IEnumerable<int> TakeEvery(int step)
        {
            int i = 0;
            foreach (var item in source)
            {
                if (i++ % step == 0) yield return item;
            }
        }
    }

    // 静态扩展成员：可扩展形式（receivable 形式）
    extension(int)
    {
        // 静态扩展属性
        public static int Zero => 0;
    }
}

// 使用
int[] nums = [3, 1, 4, 1, 5, 9, 2, 6];

Console.WriteLine(nums.IsEmpty);            // False
Console.WriteLine(string.Join(",", nums.TakeEvery(2)));  // 3,4,5,2
Console.WriteLine(int.Zero);                // 0
```

要点：

- `extension(接收者参数)` 的参数名（如 `source`）在块内可见，等价于旧扩展方法的第一个 `this` 参数；
- 块内可混排扩展属性、扩展方法、运算符；
- 旧写法 `public static bool IsEmpty(this IEnumerable<int> source)` 依然合法，新语法是**纯增强**，不需要迁移。

### 2.3 与旧扩展方法的解析规则差异

扩展成员仍需 `using` 对应命名空间；当存在同签名实例成员时，实例成员永远优先。历史上扩展成员提案一度在 C# 13 预览版中以 `<Features>preview</Features>` 开放尝鲜，**C# 14 已正式定稿**，生产项目可以放心使用。

## 三、`field` 关键字（属性后备字段）

### 3.1 痛点

自动属性 `{ get; set; }` 无法插入逻辑；一旦要"赋值时去空格"，就得退回手动声明后备字段的三件套：

```csharp
// C# 13 及以前的写法：样板三件套
private string _name = "";
public string Name
{
    get => _name;
    set => _name = value?.Trim() ?? "";
}
```

### 3.2 C# 14 写法

`field` 关键字直接引用编译器合成的后备字段，属性保持"半自动"：

```csharp
public string Name
{
    get => field;
    set => field = value?.Trim() ?? "";
}

// 只在一侧写逻辑也很自然：
public int Age { get; set; }                 // 完全自动，不受影响
public string Email
{
    get => field;
    set;                                     // set 侧不写 field 也能用自动实现
}
```

运行验证：

```csharp
var p = new Person { Name = "  张三  " };
Console.WriteLine($"[{p.Name}]");   // 输出：[张三]
```

### 3.3 注意事项

- `field` 只在属性访问器内可用，编译器据此合成一个后备字段；若类里已有一个名为 `field` 的成员，`field` 会被解析为那个成员——此时编译器给出诊断提示，写 `this.field` 可显式消歧；
- 不要把"带 `field` 的属性"与接口默认实现属性混为一谈：它仍是普通实例属性；
- 结构体中给所有访问器都使用 `field` 且无初始化器时，与自动属性一样受 `default` 初始化为零值的语义约束。

## 四、null 条件赋值（Null-Conditional Assignment）

### 4.1 语法

`?.` 过去只能"安全地读"，C# 14 让它也能"安全地写"：

```csharp
customer?.Order = newOrder;          // customer 为 null 时不执行赋值
counter?.Total += 1;                 // 复合赋值同样支持
cache?.Entries[key] = value;         // 赋值目标可以是元素访问
```

等价于：

```csharp
if (customer is not null) customer.Order = newOrder;
```

### 4.2 价值

链式守卫从三行压成一行，且**语义精确**：只省略赋值动作本身，不会引入临时变量或重复求值。事件订阅场景尤其干净：

```csharp
widget?.Changed += OnChanged;   // widget 为 null 则不订阅
```

注意：**`?.=` 永远是语句而不是表达式**，`var x = a?.b = c;` 不合法，避免"赋值是否有发生"产生歧义。

## 五、`nameof` 支持非绑定泛型

```csharp
// C# 14
Console.WriteLine(nameof(List<>));            // 输出：List
Console.WriteLine(nameof(Dictionary<,>));     // 输出：Dictionary
```

过去 `nameof` 要求泛型类型提供全部类型实参。泛型属性（C# 11 引入 `[MyAttribute<T>]`）与日志/异常消息里"想写类型名但不想闭合并实例化"的场景从此顺滑：

```csharp
public class RepositoryException<T> : Exception
{
    // C# 13 时代只能写死字符串或用 typeof(T).Name
    public override string Message => $"{nameof(Repository<>)} 操作失败";
}
```

## 六、更多隐式 Span 转换

C# 14 把 `T[]`、`Span<T>`、`ReadOnlySpan<T>`、`string` 之间的隐式转换提升为"一等公民"，减少 `.AsSpan()` 显式调用与三元表达式里的类型冲突：

```csharp
// C# 13：三元两侧类型不一致会编译失败，需要绕写
ReadOnlySpan<char> label = verbose ? "详细信息".AsSpan() : "概要";

// C# 14：字符串字面量在目标类型驱动下自然参与转换
ReadOnlySpan<char> label14 = verbose ? "详细信息" : "概要";

// 数组到 Span 的隐式转换在更多位置生效
int[] data = [1, 2, 3];
PrintAll(data);                 // 方法签名要求 ReadOnlySpan<int>，直接传数组
static void PrintAll(ReadOnlySpan<int> span) => Console.WriteLine(string.Join(",", span.ToArray()));
```

这是 C# "无痛走向零分配 API"路线的延续（前作：C# 13 的 `params` 集合）。配合 [Span/Memory](/csharp/230-SpanMemory) 的知识体系，热路径代码可以更少出现显式 `.AsSpan()`。

## 七、简单 lambda 参数可带修饰符

目标委托已声明 `out`/`ref`/`in` 时，lambda 参数过去必须**完整重复类型**；C# 14 允许只写修饰符：

```csharp
delegate bool TryParse<T>(string text, out T result);

// C# 13：必须写全 (string s, out int result)
TryParse<int> p13 = (string s, out int result) => int.TryParse(s, out result);

// C# 14：类型由目标委托推断，只保留修饰符
TryParse<int> p14 = (s, out result) => int.TryParse(s, out result);
```

小型改进，但让"委托 -> lambda"的转写更接近直觉。注意：仅当参数类型可从目标推断时才允许省略；无目标类型的 lambda 仍需显式类型。

## 八、partial 事件与构造函数

`partial` 家族再添两员，主要受益者是源生成器与 AOT 场景：

```csharp
public partial class ViewModel
{
    // 声明侧：只写签名
    public partial event EventHandler? Saved;
    public partial ViewModel(string name);
}

public partial class ViewModel
{
    // 实现侧：生成器或手写补全
    private EventHandler? _saved;
    public partial event EventHandler? Saved
    {
        add => _saved += value;
        remove => _saved -= value;
    }
    public partial ViewModel(string name) => Name = name;
    public string Name { get; }
}
```

此前 `partial` 已覆盖方法（C# 3/9）、属性与索引器（C# 13）；事件与构造函数补齐后，"声明与实现分离"的生成式编程模型不再有语法死角。相关工程实践见[源生成器](/csharp/240-SourceGenerator)。

## 九、用户定义复合赋值运算符

过去 `+=` 由 `+` 自动合成，对**引用类型**没问题，对**大型结构体**意味着"加一次，拷三份"（左值副本、右值、返回值再拷回）。C# 14 允许直接定义 `+=`，在运算符内部就地修改：

```csharp
public struct Matrix2x2
{
    public double M11, M12, M21, M22;

    // C# 14：直接定义 +=，在接收者上就地修改，避免 + 合成路径的多余拷贝
    public void operator +=(Matrix2x2 other)
    {
        M11 += other.M11; M12 += other.M12;
        M21 += other.M21; M22 += other.M22;
    }

    public static Matrix2x2 operator +(Matrix2x2 a, Matrix2x2 b)
        => new()
        {
            M11 = a.M11 + b.M11, M12 = a.M12 + b.M12,
            M21 = a.M21 + b.M21, M22 = a.M22 + b.M22,
        };
}
```

库作者（图形、数值计算、物理引擎）是主要受众；业务代码很少需要自定义 `+=`，**看得懂即可**。

## 十、完整示例：一次用到四个特性

以下为单个 `Program.cs` 的完整内容（顶层语句在前，类型声明在后，可直接 `dotnet run`）：

```csharp
using System.Text.RegularExpressions;

// ---- 可执行部分（顶层语句）----
ViewModel vm = new("main");
ViewModel? unloaded = null;

vm.Saved += (_, _) => Console.WriteLine("已保存");
unloaded?.Saved += (_, _) => Console.WriteLine("不会执行");  // null 条件订阅：null 时静默跳过

Article a = new("csharp-14") { Title = "  C# 14 新特性  " };
Console.WriteLine($"[{a.Title}]");
Console.WriteLine("dotnet".LooksLikeTag);
vm.Save();

// ---- 类型声明部分 ----

// 扩展成员 + GeneratedRegex（.NET 7+ 已有，此处对照）
public static partial class TagExtensions
{
    extension(string? text)
    {
        public bool LooksLikeTag => TagPattern().IsMatch(text ?? "");
    }

    [GeneratedRegex(@"^[a-z][a-z0-9-]{1,31}$")]
    private static partial Regex TagPattern();
}

// field 关键字
public record Article(string Slug)
{
    public string Title
    {
        get => field;
        set => field = value?.Trim() ?? "";
    }
}

// partial 事件与构造函数：声明部分（源生成器可据此补全实现）
public partial class ViewModel
{
    public partial event EventHandler? Saved;
    public partial ViewModel(string name);
    public string Name { get; }
}

// partial 事件与构造函数：实现部分
public partial class ViewModel
{
    private EventHandler? _saved;

    public partial event EventHandler? Saved
    {
        add => _saved += value;
        remove => _saved -= value;
    }

    public partial ViewModel(string name) => Name = name;
    public void Save() => Saved?.Invoke(this, EventArgs.Empty);
}

// 输出：
// [C# 14 新特性]
// True
// 已保存
```

`unloaded?.Saved += ...` 一行同时演示了 null 条件赋值的事件形态；`extension` 块必须放在 `static` 类中。

## 十一、常见陷阱

**把扩展成员当"猴子补丁"滥用**。扩展成员与扩展方法一样是静态调用的语法糖：不能访问实例私有状态、不能被多态派发。给类型加"侵入性行为"请回到继承或组合。

**`field` 与现有成员撞名**。类中已有 `field` 字段时，属性访问器里裸写 `field` 指向的是旧字段；迁移到 C# 14 后若发现行为突变，先检查命名冲突，必要时用 `this.field` 显式区分。

**null 条件赋值不等于"空安全"**。`a?.b.c = v` 只保护 `a`；`b` 为 `null` 时依旧抛 `NullReferenceException`。它守卫的是第一个 `?.` 之后的直接目标，不是整条链。

**隐式 Span 转换延长数组生命周期假设**。`ReadOnlySpan<char> s = str;` 之后对 `str` 做修改会同步反映到 `s`——Span 是视图不是快照，需要隔离时先 `.ToArray()`。

**复合赋值运算符定义后，`+` 与 `+=` 不再自动一致**。自定义 `+=` 后，`x = x + y` 走的仍是 `+`，两者语义可能悄悄分叉；同时定义两个运算符的库要写清契约并补测试。

**语言版本与目标框架要配套**。`.NET 10` 项目默认 `LangVersion` 即 14；在 .NET 8 项目里强行 `<LangVersion>14</LangVersion>` 编译，凡依赖新运行时 API/库的特性（如 `LeftJoin`）会失败。升级语言版本的推荐路径是升级目标框架，而不是单升 `LangVersion`。

## 十二、采用建议：哪些现在就用

| 特性 | 采用建议 |
|------|---------|
| 扩展成员 | 放心用；新代码统一 `extension` 块风格 |
| `field` 关键字 | 放心用；消灭后备字段样板的最优解 |
| null 条件赋值 | 放心用；语义清晰无副作用 |
| `nameof` 非绑定泛型 | 放心用；零风险改进 |
| 隐式 Span 转换 | 放心用；性能代码更简洁 |
| lambda 参数修饰符 | 用到再学；生成代码场景受益 |
| partial 事件/构造函数 | 源生成器作者重点关注 |
| 用户定义复合赋值 | 结构体重度场景专用，业务代码先旁观 |

## 十三、总结

C# 14 没有引入颠覆性范式，而是把多年来使用频率最高的三处"语法缝隙"——扩展的完整性、属性的半自动化、null 条件链的写场景——一次焊平。对业务开发者的即时收益是更少的样板代码；对库作者与源生成器作者，`partial` 家族的补全和复合赋值运算符则打开了新的生成与优化空间。语言层面之外，.NET 10 的 BCL 也同步新增了 `LeftJoin`/`RightJoin` 等 LINQ 运算符，语言与库协同演进的节奏在 [C# 12/13 新特性](/csharp/210-C12C13NewFeatures)与 [.NET 平台](/csharp/250-CSharpDotNet)两章中可以找到完整脉络。

下一篇推荐：[源生成器](/csharp/240-SourceGenerator)——C# 14 的 partial 特性矩阵正是它的主战场。
