# P/Invoke 与原生互操作

虚拟歌手音乐平台并不总是纯托管世界：实时混音引擎、音频解码器、票务加密狗这类性能敏感或依赖既有生态的组件，往往以 C/C++ 动态库的形式存在。P/Invoke（Platform Invoke）是 .NET 提供的桥：声明一个 `extern` 方法，运行时把托管调用翻译为对原生函数的调用，并在托管类型与原生类型之间完成封送（marshaling）。本文以一套虚构的"vsaudio"原生音频库为线索，讲清声明的写法、数据的过桥方式与安全的边界。

## 前置知识

- [值类型与引用类型](/csharp/037-ValueTypeReferenceType)：封送的实质是内存布局的翻译，必须先理解托管对象的布局规则。
- [C# 高级特性](/csharp/009-CSharpAdvancedFeature)：委托与函数指针是原生回调的基础。
- [Span 与 Memory](/csharp/019-SpanMemory)：零拷贝访问非托管内存时离不开 span 与不安全代码。

## 学习目标

1. 能用 `DllImport` 正确声明原生函数，理解调用约定、字符集等关键参数。
2. 掌握结构体封送：`StructLayout`、`Pack` 与 blittable 类型的含义，能让托管布局对齐 C 侧定义。
3. 掌握字符串与数组的编组方式，知道 CharSet、`[Out]` 与定长数组各自的用途。
4. 能实现原生回调：理解委托封送的生存期陷阱与函数指针的适用场景。
5. 会用 `LibraryImport` 源生成器替代运行时封送，并遵循原生互操作的安全清单。

## 一、DllImport 与调用约定

P/Invoke 的入口是 `extern` 方法：方法体为空，由运行时按 `DllImportAttribute` 的描述去定位并调用原生函数。关键参数有四个：`EntryPoint`（原生函数名，缺省取方法名）、`CallingConvention`（调用约定，C 侧默认 cdecl，Win32 API 多为 stdcall）、`CharSet`（字符串编组使用的字符集）、`SetLastError`（是否在调用后保留 Win32 错误码）。

```csharp
// 声明原生混音器库 vsaudio.dll / libvsaudio.so 中的两个入口
[DllImport("vsaudio", CallingConvention = CallingConvention.Cdecl)]
private static extern IntPtr VsOpenMixer(int sampleRate, int channels);

[DllImport("vsaudio", CallingConvention = CallingConvention.Cdecl)]
private static extern int VsCloseMixer(IntPtr mixer); // 返回 0 表示成功

// 使用：句柄类型用 IntPtr 表达，非零为有效混音器
IntPtr mixer = VsOpenMixer(48000, 2);
if (mixer == IntPtr.Zero)
{
    Console.WriteLine("混音器创建失败");
    return;
}
VsCloseMixer(mixer); // 原生资源必须显式归还
```

调用约定错了，栈由谁清理的规则就错了，轻则返回值异常，重则崩溃，而且只在特定平台出现，排查成本极高。经验法则是：Linux/macOS 上的 C 库一律 cdecl；Windows 上除非文档明确标注 stdcall，也应先按库的头文件或示例确认。原生返回的句柄在托管侧统一用 `IntPtr` 承载，并且要像上面这样配对释放，或改用后文的 `SafeHandle`。

声明前的功课是找到正确的入口名：C++ 编译器会对函数名做名称修饰（name mangling），只有被 `extern "C"` 导出的函数才保持原名；`dumpbin /exports`（Windows）或 `nm -D`（Linux/macOS）可以列出库的真实导出符号，写 `EntryPoint` 时以它为准。库名不带扩展名，运行时按平台补全并按系统搜索路径解析；跨平台发布时应把各平台的动态库随应用一起分发，必要时用解析器接管（见第三节）。

另一个容易忽略的维度是错误报告：原生库没有异常，错误通常以返回码、输出参数或全局错误码表达。托管封装应当在适配层把这些信号统一翻译成托管异常或 Result 风格的返回值，绝不能把 `int` 返回码一路泄漏给业务层——调用约定、错误翻译、资源归还，三者共同构成互操作封装的基本礼仪。如果库同时提供返回码与回调式错误通知，优先选返回码风格，它与托管异常模型的映射最直接；回调式错误通常需要额外的状态机来对齐通知顺序。

## 二、结构体封送与内存布局

托管 `struct` 传给原生函数时，运行时要把它翻译成 C 侧期望的二进制布局。`StructLayout(LayoutKind.Sequential)` 声明"按字段声明顺序排列"，`Pack` 指定对齐粒度；字段类型必须是 blittable（托管与原生布局一致，如整型、浮点、`IntPtr`）或用 `MarshalAs` 显式声明编组方式。布局差一个字节，数据就会整体错位。

```csharp
// C 侧定义：struct VsMixerConfig { int rate; short ch; short bits; char title[32]; };
[StructLayout(LayoutKind.Sequential, Pack = 1)]
public struct VsMixerConfig
{
    public int SampleRate;      // 采样率，4 字节
    public short Channels;      // 声道数，2 字节
    public short BitsPerSample; // 位深，2 字节
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
    public string SongTitle;    // 模拟 C 侧定长字符数组 char[32]
}

[DllImport("vsaudio", CallingConvention = CallingConvention.Cdecl)]
private static extern int VsApplyConfig(IntPtr mixer, ref VsMixerConfig config);
```

`ref` 表示按指针传递可修改的结构体，`in`/`out` 分别对应只读与只写场景；按值传递结构体则要格外小心，多数 C ABI 对"太大"的结构体会改用隐藏指针，语义与托管假设未必一致。`decimal`、`bool`、含引用类型字段的结构体都不是 blittable：C 的 `BOOL` 是 4 字节而 C# 的 `bool` 封送默认 1 字节，这类差异要用 `MarshalAs(UnmanagedType.Bool)` 或直接换成 `int` 消除歧义。

常用类型对照可以整理成速查表：

| C 侧类型 | 托管侧写法 | 说明 |
| --- | --- | --- |
| int（32 位） | int | C 的 long 宽度随平台变化，必须先确认再映射 |
| char*（ANSI） | string，CharSet.Ansi | 只读传入 |
| wchar_t* | string，CharSet.Unicode | 宽字符接口 |
| void* 缓冲区 | byte[]、IntPtr 或 Span 加 fixed | 需要零拷贝时选后者 |
| BOOL（4 字节） | [MarshalAs(UnmanagedType.Bool)] | 避免与 C# bool 的默认封送混淆 |
| 函数指针 | 委托或 delegate* unmanaged | 见第四节回调部分 |

表中没有列出的类型（`decimal`、`DateTime`、托管对象字段等）属于"非 blittable"，封送时涉及转换与分配，能换成 blittable 等价物就换；结构体嵌套引用类型字段则必须避免——托管引用在原生世界没有任何意义，传入的只会是句柄而不是数据。

## 三、字符串与数组编组

字符串的编组由 `CharSet` 驱动：`Ansi` 映射为多字节 `char*`，`Unicode` 映射为宽字符 `wchar_t*`，`Auto` 随平台。传入用 `string`，让原生代码写回内容则用 `StringBuilder`。数组默认按指针封送并复制，`[Out]` 告诉运行时"只需把结果拷回来"，配合可写数组可以避免反向复制。

`StringBuilder` 适合"原生写入、托管读取"的场景，但要注意容量：声明时预留的长度就是原生侧能安全写入的上限，写超会破坏内存。C 侧字符串通常以终止符结尾，封送层会自动处理截断，但多字节编码与 UTF-16 之间的转换也可能带来长度差异，给 `StringBuilder` 留足余量是惯例。

```csharp
// 设置音轨标题：string 自动按 CharSet 编组为原生字符串
[DllImport("vsaudio", CharSet = CharSet.Unicode)]
private static extern int VsSetTrackTitle(IntPtr mixer, string title);

// 读取频谱：[Out] float[] 表示原生侧填充、托管侧回拷
[DllImport("vsaudio")]
private static extern int VsReadSpectrum(IntPtr mixer, [Out] float[] bands, int count);

void UpdateVisualizer(IntPtr mixer)
{
    var bands = new float[64];
    VsReadSpectrum(mixer, bands, bands.Length);
    Console.WriteLine($"低音强度：{bands[0]:P0}"); // 用第一段频带驱动可视化
}
```

需要注意三次拷贝的代价：托管到非托管、原生处理、非托管回托管。对高频调用的场景（每帧读取频谱），应升级为非安全路径——用 `Marshal.AllocHGlobal` 分配非托管缓冲，再以 `MemoryMarshal.Cast` 或 span 视图零拷贝读取，或让原生侧直接写入托管数组的固定句柄（`fixed`）。`Span<T>` 只能配合 `fixed` 或 `GCHandle.Pinned` 进入原生世界，因为垃圾回收随时可能移动托管对象。

跨平台部署时，同一份声明要面对不同命名与位置的动态库。.NET 提供 `NativeLibrary.SetDllImportResolver` 让应用接管解析过程，例如把库文件统一放在随应用分发的 runtimes 目录里：

```csharp
// 库解析器：按运行平台把 "vsaudio" 映射到实际的动态库文件
NativeLibrary.SetDllImportResolver(typeof(VsAudio).Assembly,
    (name, assembly, searchPath) =>
    {
        string file = OperatingSystem.IsWindows() ? $"{name}.dll"
            : OperatingSystem.IsMacOS() ? $"lib{name}.dylib"
            : $"lib{name}.so";
        return NativeLibrary.Load(Path.Combine(AppContext.BaseDirectory, "runtimes", file));
    });
```

## 四、函数指针与回调

原生库常要求"处理到某一进度时通知我"，这就是反向互操作：托管侧把委托（或函数指针）交给原生代码，原生代码像调用普通函数指针一样调用它。委托封送时运行时会生成一个原生可见的桩（thunk），但委托对象本身仍是托管对象——只要原生侧还持有它，托管侧就必须持有强引用，否则被 GC 回收后回调变成悬空指针。

```csharp
// C 侧：typedef void (*progress_cb)(int percent);
[UnmanagedFunctionPointer(CallingConvention.Cdecl)]
public delegate void ProgressCallback(int percent);

[DllImport("vsaudio", CallingConvention = CallingConvention.Cdecl)]
private static extern int VsRender(IntPtr mixer, ProgressCallback onProgress);

// 关键：把委托保存在静态字段，防止渲染期间被 GC 回收
private static readonly ProgressCallback OnProgress =
    percent => Console.WriteLine($"混音《告别安可》进度：{percent}%");
```

如果回调只在调用期间同步使用（原生函数返回前调完），GC 不会中途插手，直接传局部委托即可；如果原生侧长期保存函数指针（注册监听器），则必须像上面那样持有引用，并在卸载前取消注册。C# 9 起的 `unmanaged` 函数指针（`delegate* unmanaged<int, void>`）没有托管对象，适合 AOT 与高频回调，但要求被调方是原生约定且不能捕获上下文。

回调还牵出"线程从哪里来"的问题：原生线程不是托管线程，首次回调时运行时会把它挂接到托管世界，这一步有成本；高频回调应尽量让原生侧在同一线程串行通知，或改用轮询式的进度查询接口。与此相对，用 `UnmanagedCallersOnly` 标注的静态方法可以直接以函数指针形式交给原生代码，跳过委托封送桩，是 AOT 与插件场景的现代方案。

## 五、LibraryImport 源生成与安全建议

`DllImport` 的封送逻辑在运行时决定并生成，JIT 依赖重、AOT 场景受限。.NET 7 引入的 `LibraryImportAttribute` 改由源生成器在编译期生成封送代码：宿主类型必须是 `partial`，方法也必须 `partial`，字符串编组用 `StringMarshalling` 显式声明。

```csharp
// 源生成版本：编译期生成封送代码，AOT 友好且无运行时封送开销
internal static partial class VsAudio
{
    [LibraryImport("vsaudio", StringMarshalling = StringMarshalling.Utf8)]
    internal static partial IntPtr VsOpenMixer(int sampleRate, int channels);

    [LibraryImport("vsaudio", StringMarshalling = StringMarshalling.Utf8)]
    internal static partial int VsSetTrackTitle(IntPtr mixer, string title);
}
```

除换用源生成外，安全清单还包括：原生资源一律用 `SafeHandle` 派生类托管，由 `ReleaseHandle` 保证释放语义并防句柄回收漏洞；对返回值做错误检查，必要时开 `SetLastError` 后用 `Marshal.GetLastWin32Error` 取错误码；封送期间不要让原生代码长期持有托管内存指针；`SuppressGCTransition` 只适用于极短且无阻塞的原生调用；DllImport 默认从应用目录与系统搜索路径解析库名，跨平台部署用 `NativeLibrary.SetDllImportResolver` 显式接管。最后，互操作层应当被封装在独立的适配器程序集内，向业务代码暴露纯托管 API。

从团队协作的角度看，原生互操作的正确性依赖 C 头文件与托管声明的人工同步，这种同步最可靠的载体是测试。为每个封送结构体写"总大小与关键字段偏移"的断言测试，为每个入口函数写一次往返冒烟测试，库更新时这些测试会第一时间暴露 ABI 变化。把互操作层当作一个独立的小产品来维护——版本记录、变更日志、兼容性测试齐备——是大型项目长期稳定的经验。做到这一步，原生库就从"危险的依赖"变成了"可靠的引擎"。

## 易错点与最佳实践

1. **结构体布局与 C 侧不一致。** 错误：忘记 `Pack = 1` 或漏掉定长数组声明，原生侧读到错位数据。修正：以 C 头文件为唯一事实来源，逐字段核对并用 `Marshal.SizeOf` 断言大小。

   ```csharp
   // 修正：构建期或测试中锁定布局
   Debug.Assert(Marshal.SizeOf<VsMixerConfig>() == 40); // 4+2+2+32
   ```

2. **回调委托未保存被 GC 回收。** 错误：`VsRender(mixer, p => Log(p));` 临时委托可能在渲染中途被回收。修正：如上一节所示，用字段持有引用，或在注册表对象的生命周期内保存。

3. **原生句柄泄漏。** 错误：`VsOpenMixer` 的返回值只存局部变量，异常路径上从不调用 `VsCloseMixer`。修正：封装 `SafeHandle`，用 `using` 语义自动归还。

   ```csharp
   // 修正：SafeHandle 统一管理原生句柄
   public sealed class MixerHandle : SafeHandle
   {
       public MixerHandle() : base(IntPtr.Zero, true) { }
       public override bool IsInvalid => handle == IntPtr.Zero;
       protected override bool ReleaseHandle() => VsCloseMixer(handle) == 0;
   }
   ```

4. **CharSet 用错导致中文乱码或崩溃。** 错误：C 侧是 `wchar_t*` 却按默认 `Ansi` 编组，"应援色的风"变成乱码，长度不足时甚至越界。修正：读写双侧同时确认字符集，`CharSet.Unicode` 配 `wchar_t*`、`CharSet.Ansi` 配 `char*`，UTF-8 场景走 `LibraryImport` 的 `StringMarshalling.Utf8`。排查技巧：先把可疑字符串按字节打印，逐字节对照编码码位，能一眼区分"编码选错"与"长度截断"两类问题。

5. **互操作细节泄漏到业务层。** 错误：业务代码里到处出现 `IntPtr` 与 `Marshal`。修正：像第五节那样把 P/Invoke 收敛进内部适配类，对外只暴露 `Mixer`、`Track` 等托管对象，异常也翻译成托管异常类型。

## 本篇小结

1. P/Invoke 通过 `extern` 方法与 `DllImport` 声明原生入口，调用约定与字符集是最容易出错也最先要确认的两个参数。
2. 结构体封送的本质是布局翻译：`StructLayout`、`Pack` 与 blittable 类型共同保证托管与 C 侧内存一一对应。
3. 字符串与数组编组默认涉及复制，`CharSet`、`StringBuilder` 与 `[Out]` 各司其职；高频路径应改用非托管缓冲与 span 视图。
4. 回调即反向互操作：委托必须被托管侧持有，长期回调建议用静态引用或非托管函数指针。
5. 新代码优先使用 `LibraryImport` 源生成，配合 `SafeHandle`、错误码检查与适配器封装，把非安全的边界压缩到最小。

## 动手实践

1. 为 vsaudio 库补一个 `VsGetPeakLevel(IntPtr mixer)` 声明并封装为 `Mixer.GetPeakLevel()`：要求返回 double、内部处理错误码，并写一个单元测试用 `NativeLibrary` 加载桩库验证调用链。
2. 定义 C 侧结构体 `struct TicketCipher { char serial[16]; int kind; double price; }` 的托管对应版本，编写测试断言 `Marshal.SizeOf` 等于 C 侧 `sizeof`，再故意去掉 `Pack` 观察差异。
3. 把第四节 `DllImport` 版本的渲染函数改写为 `LibraryImport` 源生成版本，对比编译产物中生成的封送代码（`*.g.cs`），记录两版在字符串与委托处理上的差别。
