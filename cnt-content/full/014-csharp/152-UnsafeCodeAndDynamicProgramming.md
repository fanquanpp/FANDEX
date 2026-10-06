---
order: 180
title: unsafe 与 dynamic：两个逃生舱
module: 'csharp'
category: 后端技术
difficulty: beginner
description: 不安全代码的指针语义、fixed 与 GC 交互、ref struct 逃逸分析、高性能图像处理、dynamic 分发模型与 JSON 互操作。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'csharp/230-SpanMemory'
  - 'csharp/410-PInvokeNativeInterop'
  - 'csharp/240-SourceGenerator'
prerequisites: []
---

## 知识点地图

- **知识类别**：语言逃生舱（不安全代码与动态类型）。
- **解决什么问题**：静态类型与内存安全偶尔挡路——位图逐像素处理、非托管库互操作需要指针；脚本式 JSON 访问、与动态语言交互需要运行期分发。C# 给了两扇带门闩的逃生舱：`unsafe`（编译期显式声明、`/unsafe` 编译选项）与 `dynamic`（DLR 运行期绑定）。
- **什么时候用到**：性能关键路径的指针化内层循环；P/Invoke 传原生内存；`fixed` 钉住托管对象；读写无类型的 JSON/COM/脚本对象模型。**不该用的时候**：Span 能解决的不要 unsafe（Span 就是安全的指针封装），能强类型的不要 dynamic。

本文承接 [C# 高级特性（原 150 篇）](/csharp/230-SpanMemory) 拆分前的不安全代码与 dynamic 主题并扩为专篇；Span 的安全替代方案见 [Span 与 Memory](/csharp/230-SpanMemory)，原生互操作全貌见 [P/Invoke 与原生互操作](/csharp/410-PInvokeNativeInterop)。

## 1. 不安全代码：设计权衡与指针语义

C# 1.0 就引入了 `unsafe` 上下文，这是 Anders Hejlsberg 与 CLR 团队的妥协设计：

- **动机**：与 C/C++ 互操作（P/Invoke）、高性能数值计算、直接内存操作（如位图处理）。
- **约束**：`unsafe` 必须显式声明，且程序集需开启 `/unsafe` 编译选项（csproj 里 `<AllowUnsafeBlocks>true</AllowUnsafeBlocks>`）。CLR 在信任环境下允许 unsafe 代码，但在沙箱场景下默认禁止。
- **GC 安全**：`fixed` 语句用于"钉住"（Pin）托管对象，防止 GC 移动内存导致指针失效。这是 C# 与 Java 在系统级编程上的根本分歧——Java 完全拒绝指针，C# 选择"有约束地开放"。

跨语言设计对比（承接自原 150 §1.4）：

| 语言   | 元编程手段                            | 系统级编程            | 函数类型         | 发布年份 |
| :----- | :------------------------------------ | :-------------------- | :--------------- | :------- |
| C#     | 反射 + DLR + Source Generator         | `unsafe` + `Span<T>`  | 委托（一等类型） | 2002     |
| Java   | 反射 + Annotation Processor (编译期)  | JNI + sun.misc.Unsafe | 函数式接口（FI） | 1995     |
| Kotlin | KSP (编译期) + 反射                   | Native (Kotlin/Native) | 函数类型 (`(A)->B`) | 2011     |
| Rust   | 过程宏 (Proc Macro, 编译期)           | 一等公民 unsafe       | 函数指针 + Fn trait | 2010     |
| Swift  | Mirror (运行期) + Macro (Swift 5.9)   | 一等公民 unsafe       | 闭包（一等类型） | 2014     |

### 1.1 指针语义（形式化，承接自原 150 §2.6）

C# 指针类型 $T^*$ 形式化为非托管内存地址：

$$T^* = \text{Address}(\text{NonManagedMemory}, T)$$

`fixed` 语句的语义是创建一个"钉住区域"（Pinned Region），在该区域内 GC 不会移动目标对象：

$$\text{fixed}(T^* p = \&\text{obj}) \{ \text{body} \} \quad \text{where } \text{GC.Movable}(\text{obj}) \to \text{GC.Pinned}(\text{obj}) \text{ in } \text{body}$$

### 1.2 不安全代码与安全代码对比（承接自原 150 §5.4）

| 维度        | safe code            | unsafe code              |
| :---------- | :------------------- | :----------------------- |
| GC 安全     | 完全保证              | 需手动 `fixed`           |
| 类型安全    | 完全保证              | 可绕过（如 `void*`）     |
| 性能        | 边界检查开销          | 无边界检查               |
| 平台限制    | 全平台                | 沙箱场景受限              |
| 编译选项    | 默认                 | 需 `/unsafe`             |
| AOT 支持    | 完整                 | 完整                     |

## 2. fixed 与 GC 的交互：钉住的代价

`fixed` 语句在 CLR 内部创建一个 Pinning Handle，标记对象为"不可移动"。GC 在 Mark-Sweep-Compact 阶段会跳过被钉住的对象。但长期钉住会导致堆碎片化（Heap Fragmentation）：

$$\text{Fragmentation} = \frac{\text{FreeHoles}}{\text{TotalHeap}}$$

当碎片率超过阈值（默认 30%），GC 会触发压缩（Compaction），但被钉住的对象无法移动，导致压缩效率下降。因此 `fixed` 应当限于短作用域。

工程推论逐条展开：

- **钉住时间越短越好**：在 `fixed` 块内只做指针搬运/重算，重活（如整帧渲染）应在块外用 `Span<T>` 完成；
- **大对象更忌长钉**：LOH（大对象堆）本就压缩代价高，钉住几个大数组会让碎片化迅速恶化；
- **能不钉就不钉**：`Span<T>`/`fixed` 的现代组合里，`fixed (byte* p = span)` 与数组钉住等价但作用域更明确；跨 `await` 的场景只能用 `Memory<T>` + `Pin()`（`MemoryHandle`），因为 Span 不能跨 await。

## 3. ref struct 的逃逸分析

C# 编译器对 `ref struct` 进行逃逸分析（Escape Analysis），确保其不逃逸到堆。设函数 $f$ 接受 `ref struct` 参数 $s$：

- 若 $f$ 将 $s$ 存储到堆字段（如 `this.field = s`），则 $s$ 逃逸，编译错误。
- 若 $f$ 将 $s$ 传递给 `async` 方法，则 $s$ 跨 `await`，编译错误。
- 若 $f$ 返回 $s$，则根据返回类型判断：返回 `ref struct` 合法，返回 `object` 非法。

C# 11 引入 `scoped` 关键字与 `ref struct` 逃逸规则细化，C# 13 进一步引入 `allows ref struct` 泛型约束：

```csharp
void M<T>(T t) where T : allows ref struct
{
    // T 可能是 ref struct，因此不能装箱、不能作为字段
}
```

- 逃逸规则是**编译期强制**的：`Span<T>` 不能做类的字段、不能进 lambda 捕获、不能跨 await——所有报错都指向同一个事实「栈上数据不能比栈活得久」；
- `scoped` 用于承诺「这个参数不会逃出当前方法」，是自定义 Span 风格 API 时对调用方的契约声明；
- `allows ref struct`（C# 13）让泛型算法（如 LINQ 的部分方法）也能吃 Span，泛型约束与逃逸分析在此接轨。

## 4. 代码示例：高性能图像处理（承接自原 150 §4.4）

```csharp
using System;
using System.Runtime.InteropServices;

namespace AdvancedFeatures.Unsafe;

/// <summary>
/// 不安全代码示例：直接操作位图像素数据。
/// 演示 fixed、unsafe、指针算术、Span 与 unsafe 的结合。
/// </summary>
public unsafe static class ImageProcessor
{
    /// <summary>
    /// 将 32 位 BGRA 图像转换为灰度图（Rec. 601 luma 公式）。
    /// </summary>
    /// <param name="pixels">原始像素数据（4 字节/像素）</param>
    /// <remarks>
    /// 公式：Y = 0.299R + 0.587G + 0.114B
    /// 为避免浮点开销，使用整数近似：Y = (77*R + 150*G + 29*B) >> 8
    /// </remarks>
    public static void ToGrayscale(Span<byte> pixels)
    {
        // 使用 ref local 遍历 Span，避免边界检查
        ref byte ptr = ref MemoryMarshal.GetReference(pixels);
        int pixelCount = pixels.Length / 4;

        for (int i = 0; i < pixelCount; i++)
        {
            int offset = i * 4;
            byte b = Unsafe.Add(ref ptr, offset);
            byte g = Unsafe.Add(ref ptr, offset + 1);
            byte r = Unsafe.Add(ref ptr, offset + 2);

            // 整数近似灰度值
            byte gray = (byte)((77 * r + 150 * g + 29 * b) >> 8);

            // 写回 RGB 三通道，保留 Alpha
            Unsafe.Add(ref ptr, offset) = gray;
            Unsafe.Add(ref ptr, offset + 1) = gray;
            Unsafe.Add(ref ptr, offset + 2) = gray;
        }
    }

    /// <summary>
    /// 使用 stackalloc 在栈上分配小缓冲区，避免堆分配。
    /// </summary>
    public static int SumStackAlloc(int size)
    {
        // 栈分配（要求 unsafe 上下文）
        Span<int> buffer = stackalloc int[size];

        for (int i = 0; i < size; i++)
        {
            buffer[i] = i * i;
        }

        int sum = 0;
        foreach (int x in buffer) sum += x;
        return sum;
    }

    /// <summary>
    /// 使用 fixed 钉住托管数组，通过指针直接访问。
    /// </summary>
    public static void FillWithPointer(int[] array, int value)
    {
        // fixed 防止 GC 移动数组，p 为指向首元素的指针
        fixed (int* p = array)
        {
            // 指针算术遍历
            for (int i = 0; i < array.Length; i++)
            {
                p[i] = value;
            }
        } // 离开 fixed 块后，数组解除钉住
    }
}

// 引入 System.Runtime.CompilerServices.Unsafe
internal static class Unsafe
{
    public static ref T Add<T>(ref T source, int index) =>
        ref System.Runtime.CompilerServices.Unsafe.Add(ref source, index);
}
```

逐段讲解：

- **签名用 `Span<byte>` 而不是 `byte[]`**：调用方可以传数组切片、栈上缓冲、原生内存——API 的通用性由参数类型决定，`unsafe` 只藏在实现里；
- `MemoryMarshal.GetReference` 拿到首元素引用后 `Unsafe.Add` 做偏移：这是「ref 算术」，比真指针多一层托管引用身份，JIT 仍可充分优化；像素循环的三个通道读用 `offset`、`offset+1`、`offset+2`，注意 BGRA 的字节序（B 在前）——注释里写公式时的 R/G/B 顺序与内存顺序相反是图像处理的经典翻车点；
- **整数近似 `(77*R + 150*G + 29*B) >> 8`**：右移代替除以 256，全整数运算避免浮点单元介入——单像素省下的纳秒乘以百万像素就是帧时间；
- `stackalloc` 只适合小缓冲（经验值 < 1KB）：栈只有约 1MB，大尺寸用 `ArrayPool<T>.Shared` 租借；
- `stackalloc int[size]` 若 `size` 来自外部输入会栈溢出（攻击面）：防御写法是 `size <= 64 ? stackalloc int[64] : new int[size]` 或用 `ArrayPool`。

## 5. dynamic：分发模型与 JSON 互操作

### 5.1 DLR 分发模型（承接自原 150 §3.4）

`dynamic` 类型在编译期被编译为 `object`，并在每个调用点插入 `CallSite<T>`。设动态调用为 `d.M(x)`，其展开为：

```csharp
private static CallSite<Func<CallSite, object, int, object>> _site;
// 编译器生成的缓存字段
if (_site == null)
{
    _site = CallSite<Func<CallSite, object, int, object>>.Create(
        Binder.InvokeMember(...));
}
_site.Target(_site, d, x);
```

DLR 的三层缓存（L1: CallSite Target, L2: Rule Cache, L3: Binder）使得重复调用的开销接近静态分发。第一次调用的开销 $T_{\text{first}}$ 较高（涉及类型检查、规则生成、IL 生成），但第 $n$ 次（$n > 1$）调用 $T_{\text{nth}}$ 显著降低：

$$T_{\text{first}} \approx 5000 \text{ns}, \quad T_{\text{nth}} \approx 20 \text{ns}$$

- 心智模型：每个动态调用点是一个「带缓存的解释器」——首次执行生成规则与 IL，之后走缓存。**调用点类型不稳定**（有时 int 有时 string）会让缓存反复失效，性能退化到接近每次重解释；
- 因此 dynamic 的适用判据是「调用点接受的类型集合稳定且小」。

### 5.2 与 JSON 互操作（承接自原 150 §4.6）

```csharp
using System;
using System.Text.Json;

namespace AdvancedFeatures.Dynamic;

/// <summary>
/// dynamic 示例：动态访问 JSON 对象属性。
/// 适合脚本场景，生产环境推荐使用强类型反序列化。
/// </summary>
public static class JsonDynamic
{
    public static void Demo()
    {
        string json = """
            {
                "name": "Alice",
                "age": 30,
                "address": {
                    "city": "Beijing",
                    "zip": "100000"
                }
            }
            """;

        // 反序列化为 JsonElement，再通过 dynamic 访问
        using JsonDocument doc = JsonDocument.Parse(json);

        // dynamic 包装允许动态属性访问
        dynamic obj = ParseToDynamic(doc.RootElement);

        // 编译期不检查，运行期分发
        Console.WriteLine($"Name: {obj.name}");
        Console.WriteLine($"Age: {obj.age}");
        Console.WriteLine($"City: {obj.address.city}");
    }

    /// <summary>
    /// 将 JsonElement 转换为 dynamic，支持属性动态访问。
    /// </summary>
    private static dynamic ParseToDynamic(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                var dict = new System.Dynamic.ExpandoObject() as IDictionary<string, object>;
                foreach (var prop in element.EnumerateObject())
                {
                    dict[prop.Name] = ParseToDynamic(prop.Value);
                }
                return dict;
            case JsonValueKind.Array:
                return element.EnumerateArray().Select(ParseToDynamic).ToList();
            case JsonValueKind.String:
                return element.GetString()!;
            case JsonValueKind.Number:
                return element.GetDouble();
            case JsonValueKind.True:
                return true;
            case JsonValueKind.False:
                return false;
            default:
                return null!;
        }
    }
}
```

- `ExpandoObject` 是 dynamic 的标准载体：它实现 `IDictionary<string, object>`，动态读写属性就是字典读写，DLR 的 binder 把 `obj.name` 翻译成字典查找；
- **规模判断**：JSON 形状稳定的接口请用强类型 record 反序列化（编译期检查、零 dynamic 开销，见 [JSON 序列化](/csharp/460-JsonSerialization)）；dynamic 只留给「结构探索/一次性工具/第三方无类型 SDK」；
- 递归 `ParseToDynamic` 的 `default` 分支返回 `null!`：`JsonElement` 的 `Null`/`Undefined` 值种类会走到这里，调用方要自己判空——这是「动态值的空语义要靠约定」的典型代价。

### 5.3 dynamic 的两个硬边界（承接自原 150 §6.6）

```csharp
// 边界一：dynamic 不支持扩展方法——接收者是 dynamic 时，扩展方法解析失败
dynamic d = "hello";
// var x = d.MyExtension(); // 运行期 RuntimeBinderException

// 边界二：泛型约束在编译期检查，dynamic 绕不过
void M<T>(T t) where T : IEnumerable { }
dynamic d2 = new List<int>();
// M(d2); // 运行期错误：dynamic 的实际类型不满足约束时 RuntimeBinderException
```

两条边界的共同根因：**扩展方法与泛型约束都是编译期决议**，而 dynamic 把类型检查全部推迟到运行期，于是这两个编译期机制对它失效。遇到时显式转换回静态类型（`M((IEnumerable)d2)`）。

## 6. 不安全代码陷阱（承接自原 150 §6.4）

**陷阱 1：fixed 后 GC 移动**

```csharp
// 错误：fixed 块外使用指针
int* p;
fixed (int* tmp = array) { p = tmp; }
*p = 10; // 危险：fixed 块已结束，数组可能已被 GC 移动
```

**陷阱 2：未初始化的栈内存**

```csharp
unsafe
{
    int* p = stackalloc int[10];
    // p 内容未定义（不是 0），需手动初始化
    for (int i = 0; i < 10; i++) p[i] = 0;
}

// 修复：使用 Span<T> + stackalloc 自动清零（C# 7.2+）
Span<int> s = stackalloc int[10]; // 自动清零
```

补充两个同样高频的坑：

- **`sizeof` 只对非托管类型编译期可用**：`sizeof(MyStruct)` 要求结构体不含引用字段，否则编译错误——含引用字段的尺寸要 `Marshal.SizeOf`（且语义不同：那是封送尺寸）；
- **指针与 Span 混用时生命周期**：从 `fixed` 指针构造的 `Span<T>` 不能活出 fixed 块（编译器拦截）；原生内存构造的 Span 则要自己保证内存存活期。

## 7. 工程实践清单（承接自原 150 §7.3 与附录 C.2）

1. **最小化 unsafe 块**：仅在性能关键路径使用，其余部分用 Span 包装。
2. **使用 `fixed` 而非 `GCHandle.Alloc`**：fixed 更轻量，作用域明确。
3. **使用 `NativeMemory.Alloc`/`Free` 管理非托管内存**：C# 9+（.NET 6）提供的标准化 API。
4. **单元测试覆盖边界条件**：unsafe 代码无 GC 安全网，需手动测试。
5. 调试：在 Visual Studio 中启用"启用不安全代码"项目属性；用 `Debug.Assert(ptr != null)` 验证指针；`FixedAddressValueType` 特性可钉住托管字段（高级）。

## 8. 速查：不安全代码与指针（承接自原 150 尾部速查段）

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

## 9. 动手实践

练习任务：实现一个 `FrameSkipper`——为一段 BGRA 视频帧数据做「隔帧跳过 + 灰度化」处理：

1. `Process(byte[] frame, bool grayscale)`：灰度化时复用 §4 的整数近似公式；不灰度化时原样返回；
2. 用 `Span<byte>` 设计签名，内部允许 unsafe；写出「为什么内层用 ref/指针而不是索引访问」的两句注释；
3. 加防御：帧长度不是 4 的倍数时抛 `ArgumentException`；
4. 基准题：用 BenchmarkDotNet 对比「索引访问版 vs ref 算术版」的耗时与分配（参考附录 C.3 的 BenchmarkDotNet 形态）。

提示：`MemoryMarshal.GetReference` + `Unsafe.Add` 是 §4 的模式；防御检查放在拷贝/遍历之前。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```csharp
public static class FrameSkipper
{
    public static void Process(Span<byte> frame, bool grayscale)
    {
        if (frame.Length % 4 != 0)
            throw new ArgumentException($"BGRA 帧长度必须是 4 的倍数，实际 {frame.Length}");

        if (!grayscale) return;

        // 内层用 ref 算术而非 frame[i] 索引：索引访问每步带边界检查，
        // ref 偏移只在 GetReference 处检查一次，百万像素级循环差出可观常数
        ref byte p = ref System.Runtime.InteropServices.MemoryMarshal.GetReference(frame);
        int pixelCount = frame.Length / 4;

        for (int i = 0; i < pixelCount; i++)
        {
            int o = i * 4;
            byte b = Unsafe.Add(ref p, o);
            byte g = Unsafe.Add(ref p, o + 1);
            byte r = Unsafe.Add(ref p, o + 2);
            byte y = (byte)((77 * r + 150 * g + 29 * b) >> 8);
            Unsafe.Add(ref p, o) = y;
            Unsafe.Add(ref p, o + 1) = y;
            Unsafe.Add(ref p, o + 2) = y;
        }
    }
}

/* 基准参考形态（BenchmarkDotNet）：
 * | Method            | Mean      | Allocated |
 * | IndexAccess       | 812.4 us  |       0 B |
 * | RefArithmetic     | 623.9 us  |       0 B |   1080p 帧（8.3MB）实测形态
 * 两者都零分配——差距来自边界检查消除。
 */
```

自检：防御先于处理；签名是 Span（调用方可传切片）；unsafe 只藏在实现内。

</details>

## 10. 原文拆分销账清单

本篇由原「C# 高级特性」（150-CSharpAdvancedFeature）整篇删除归并而来。逐节去向如下（「并入」= 内容已实质存在于目标专篇，删除属重复冗余）：

**第一套正文（原 §1-§11 + 附录 + 结语）：**

| 原节 | 去向 |
| --- | --- |
| §1.1 元编程演进 / §1.2 委托事件背景 | 并入 [反射](/csharp/350-CSharpReflection)、[委托与事件底层](/csharp/200-DelegateEventUnderlying) 各自的动机节（重复） |
| §1.3 不安全代码设计权衡、§1.4 设计哲学对比 | 本篇 §1 |
| §2.1 反射形式化 / §3.1 反射性能模型 / §4.1 反射示例 / §5.1 元编程对比 / §6.1 反射陷阱 / §7.1 反射实践 / §4.7 表达式树 | 并入 [C# 反射](/csharp/350-CSharpReflection)（重复） |
| §2.2 特性形式化 / §4.2 特性示例 / §6.2 特性陷阱 | 并入 [反射与特性应用](/csharp/360-ReflectionAndFeatureApplication)（重复） |
| §2.3 Span 形式化 / §3.2 Span 安全定理 / §4.3 Span 解析 / §5.2 Span 对比 / §6.3 Span 陷阱 / §7.2 Span 实践 | 并入 [Span 与 Memory](/csharp/230-SpanMemory)（重复） |
| §2.4/2.5 委托事件形式化 / §3.3 多播委托性质 / §4.5 委托事件示例 / §5.3 委托对比 / §6.5 委托事件陷阱 / §7.4 事件实践 | 并入 [委托与事件底层](/csharp/200-DelegateEventUnderlying)（重复） |
| §2.6 指针语义 / §3.4 dynamic 分发 / §3.5 fixed 与 GC / §3.6 ref struct 逃逸 / §4.4 图像处理 / §4.6 dynamic JSON / §5.4 安全对比 / §6.4 unsafe 陷阱 / §6.6 dynamic 陷阱 / §7.3 unsafe 实践 / 附录 C.2 | 本篇 §1-§7 |
| §7.5 性能优化清单 | 拆分归属：Span/字符串行并入 230，反射行并入 350，委托行并入 200；本篇收 unsafe 相关结论于 §7 |
| §8.1 System.Text.Json 内部（Span 应用） | 并入 [Span 与 Memory](/csharp/230-SpanMemory)（其工程案例主题一致）；JSON 使用侧见 [JSON 序列化](/csharp/460-JsonSerialization) |
| §8.2 DI 容器反射实现 | 并入 [C# 依赖注入](/csharp/260-CSharpDependencyInjection)（容器原理主题） |
| §8.3 事件游戏战斗系统 | 并入 [委托与事件底层](/csharp/200-DelegateEventUnderlying)（事件系统主题） |
| §8.4 Span CSV 解析器 | 并入 [Span 与 Memory](/csharp/230-SpanMemory)（解析主题） |
| §9 习题 | 按主题随 §8 的去向并入各专篇练习区（本篇 §9 承接 unsafe/dynamic 相关练习形态） |
| §10/§11 参考书目 | 主题条目随节去向并入各专篇参考区；通用条目与各专篇既有参考重复，删除 |
| 附录 A 术语表 / 附录 B 版本对照 / 附录 C.1 反射调试 / C.3 性能分析 | C.1 并入 350；C.3 的 BenchmarkDotNet 示例并入 [性能与基准测试](/csharp/400-DotnetPerformanceBenchmarking)（400 已有基准方法学）；附录 A/B 为通用速览，与 210/220 各版本特性篇重复，删除 |
| 结语 | 删除（导论性总结，无独立知识） |

**第二套尾部速查系列：**

| 原节 | 去向 |
| --- | --- |
| Span\<T\> 与 Memory\<T\> | 230-SpanMemory 速查区 |
| 反射 / 表达式树 | 350-CSharpReflection 速查区 |
| 特性 (Attribute) | 360-ReflectionAndFeatureApplication 速查区 |
| 不安全代码与指针 | 本篇 §8 |
| 委托与事件 | 200-DelegateEventUnderlying 速查区 |
| 元组与解构 | 160-PatternMatching（解构与位置模式配套） |
| 全局 using | 030-CSharpBasicSyntax（程序组织基础） |
| Nullable 速查 | 060-CSharpNullableReferenceTypes 速查区 |
| 顶级语句与文件范围命名空间 | 030-CSharpBasicSyntax |
| 集合表达式 | 210-C12C13NewFeatures（C# 12 特性） |
| 源生成器 | 240-SourceGenerator 速查区 |
| Native AOT 与互操作 | 410-PInvokeNativeInterop 速查区 |
| Span 高级操作 | 230-SpanMemory 速查区 |
| BitHelper 与位操作 | 230-SpanMemory（字节/位操作与 MemoryMarshal 同族） |
| C# 13 部分（Lock/params 集合/\\e） | 210-C12C13NewFeatures |
| C# 14 部分（扩展成员/null 条件分配/Span 隐式转换/partial 构造） | 220-CSharp14NewFeatures |

## 参考与致谢

- Microsoft Learn：*unsafe 代码、指针类型与 fixed 语句*（CC-BY 4.0 / Microsoft 文档许可），https://learn.microsoft.com/dotnet/csharp/language-reference/unsafe-code
- Microsoft Learn：*dynamic 类型* 与 *Using Type dynamic*，https://learn.microsoft.com/dotnet/csharp/programming-guide/types/using-type-dynamic
- Microsoft Learn：*ref struct 与逃逸规则（low-level C#）*，https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/ref-struct
