---
order: 470
title: C# 文件与流操作
module: 'csharp'
category: 后端技术
difficulty: beginner
description: File/Path/Directory、FileStream、StreamReader/Writer、BinaryReader/Writer 与 using 资源管理的速查手册，附完整示例与易错点解析。
author: fanquanpp
updated: '2026-11-16'
related:
  - 'csharp/460-JsonSerialization'
  - 'csharp/230-SpanMemory'
  - 'csharp/080-CAsyncProgramming'
prerequisites:
  - 'csharp/030-CSharpBasicSyntax'
---

## 先分清三个层次再查表

文件 I/O 的 API 名字很多，但层次只有三层，查表时先定位自己在哪一层：

1. **路径层（Path/Directory/File 的静态便捷方法）**："一次性读写整个小文件"用它，一行搞定、内部帮你开流关流——代价是全量载入内存，不适合大文件；
2. **流层（FileStream/StreamReader/Writer）**："大文件逐行流式处理"或"控制缓冲与异步"用它，用完必须释放（`using`）；
3. **字节层（BinaryReader/Writer、MemoryStream）**："精确控制字节序与二进制格式"才用它。

一条贯穿全篇的纪律：**谁打开谁关闭**——`using` 声明是默认写法，忘了它文件句柄会一直占着，Windows 上连删除文件都会失败。

## 文件路径

**基本写法：路径拼接**
`Path.Combine(<路径1>, <路径2>);`
```csharp
// 跨平台拼接路径
string path = Path.Combine("dir", "sub", "file.txt");
```

---

**基本写法：获取文件名**
`Path.GetFileName(<路径>);`
```csharp
// 获取含扩展名的文件名
string name = Path.GetFileName("/a/b/c.txt");
```

---

**基本写法：获取扩展名**
`Path.GetExtension(<路径>);`
```csharp
// 获取扩展名（含点）
string ext = Path.GetExtension("file.txt");
```

---

**基本写法：获取目录**
`Path.GetDirectoryName(<路径>);`
```csharp
// 获取所在目录路径
string dir = Path.GetDirectoryName("/a/b/c.txt");
```

---

**基本写法：临时文件路径**
`Path.GetTempFileName();`
```csharp
// 创建并返回临时文件路径
string tmp = Path.GetTempFileName();
```

---

**基本写法：获取特殊目录**
`Environment.GetFolderPath(<枚举>);`
```csharp
// 获取系统特殊目录
string desktop = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
```

---

## 文件读写

**基本写法：读取全部文本**
`File.ReadAllText(<路径>);`
```csharp
// 一次性读取整个文件
string content = File.ReadAllText("data.txt");
```

---

**基本写法：写入全部文本**
`File.WriteAllText(<路径>, <内容>);`
```csharp
// 覆盖写入文本
File.WriteAllText("out.txt", "Hello");
```

---

**基本写法：追加文本**
`File.AppendAllText(<路径>, <内容>);`
```csharp
// 在文件末尾追加
File.AppendAllText("log.txt", "new line\n");
```

---

**基本写法：读取所有行**
`File.ReadAllLines(<路径>);`
```csharp
// 按行读取为数组
string[] lines = File.ReadAllLines("data.txt");
```

---

**基本写法：异步读取全部文本**
`await File.ReadAllTextAsync(<路径>);`
```csharp
// 异步读取大文件
string content = await File.ReadAllTextAsync("big.txt");
```

---

**基本写法：异步写入**
`await File.WriteAllTextAsync(<路径>, <内容>);`
```csharp
// 异步写入
await File.WriteAllTextAsync("out.txt", content);
```

---

**基本写法：读取字节**
`File.ReadAllBytes(<路径>);`
```csharp
// 读取二进制内容
byte[] bytes = File.ReadAllBytes("img.png");
```

---

## 按行流式读取

**基本写法：逐行读取**
`File.ReadLines(<路径>);`
```csharp
// 惰性枚举，适合大文件
foreach (string line in File.ReadLines("big.log"))
{
}
```

---

**基本写法：异步逐行读取**
`using var <流> = File.OpenText(<路径>);`
```csharp
// 使用 StreamReader 流式读取
using var reader = new StreamReader("big.txt");
string? line;
while ((line = await reader.ReadLineAsync()) != null) { }
```

---

## FileStream 文件流

**基本写法：创建文件流**
`new FileStream(<路径>, <模式>, [<访问>]);`
```csharp
// 创建可读写文件流
using var fs = new FileStream("data.bin", FileMode.Create, FileAccess.ReadWrite);
```

---

**基本写法：Open 简便打开**
`File.Open(<路径>, <模式>);`
```csharp
// 简便方式打开文件
using var fs = File.Open("data.txt", FileMode.OpenOrCreate);
```

---

**基本写法：写入字节**
`<流>.Write(<字节数组>, <偏移>, <长度>);`
```csharp
// 写入字节数据
fs.Write(buffer, 0, buffer.Length);
```

---

**基本写法：读取字节**
`<流>.Read(<字节数组>, <偏移>, <长度>);`
```csharp
// 读取到缓冲区
int read = fs.Read(buffer, 0, buffer.Length);
```

---

**基本写法：定位 Seek**
`<流>.Seek(<偏移>, <起点>);`
```csharp
// 移动读写位置
fs.Seek(0, SeekOrigin.Begin);
```

---

## StreamWriter / StreamReader

**基本写法：StreamWriter 写文本**
`using var <写流> = new StreamWriter(<路径>);`
```csharp
// 文本写入流
using var writer = new StreamWriter("out.txt");
writer.WriteLine("第一行");
writer.Write("不换行");
```

---

**基本写法：StreamReader 读文本**
`using var <读流> = new StreamReader(<路径>);`
```csharp
// 文本读取流
using var reader = new StreamReader("in.txt");
string content = reader.ReadToEnd();
```

---

**基本写法：自动刷新**
`new StreamWriter(<路径>, <append>, <编码>, <缓冲>);`
```csharp
// 指定编码与缓冲大小
using var writer = new StreamWriter("out.txt", append: true, Encoding.UTF8, 1024);
```

---

## BinaryReader / BinaryWriter

**基本写法：BinaryWriter 写二进制**
`using var <写流> = new BinaryWriter(<流>);`
```csharp
// 写入基础类型二进制
using var writer = new BinaryWriter(File.Open("d.bin", FileMode.Create));
writer.Write(42);
writer.Write("hello");
```

---

**基本写法：BinaryReader 读二进制**
`using var <读流> = new BinaryReader(<流>);`
```csharp
// 按写入顺序读取基础类型
using var reader = new BinaryReader(File.Open("d.bin", FileMode.Open));
int n = reader.ReadInt32();
string s = reader.ReadString();
```

---

## MemoryStream 内存流

**基本写法：创建内存流**
`using var <流> = new MemoryStream();`
```csharp
// 内存中操作字节
using var ms = new MemoryStream();
ms.Write(buffer, 0, buffer.Length);
```

---

**基本写法：转字节数组**
`<流>.ToArray();`
```csharp
// 获取流中所有字节
byte[] bytes = ms.ToArray();
```

---

## 文件与目录管理

**基本写法：判断文件存在**
`File.Exists(<路径>);`
```csharp
// 判断文件是否存在
bool exists = File.Exists("data.txt");
```

---

**基本写法：复制文件**
`File.Copy(<源>, <目标>, [<覆盖>]);`
```csharp
// 复制文件，true 表示覆盖
File.Copy("a.txt", "b.txt", overwrite: true);
```

---

**基本写法：移动文件**
`File.Move(<源>, <目标>);`
```csharp
// 移动或重命名文件
File.Move("a.txt", "dir/a.txt");
```

---

**基本写法：删除文件**
`File.Delete(<路径>);`
```csharp
// 删除文件（不存在不抛异常）
File.Delete("a.txt");
```

---

**基本写法：获取文件信息**
`new FileInfo(<路径>);`
```csharp
// 获取文件大小与时间
var fi = new FileInfo("data.txt");
long size = fi.Length;
DateTime time = fi.LastWriteTime;
```

---

## 目录操作

**基本写法：创建目录**
`Directory.CreateDirectory(<路径>);`
```csharp
// 递归创建目录
Directory.CreateDirectory("a/b/c");
```

---

**基本写法：列出文件**
`Directory.GetFiles(<路径>, [<模式>]);`
```csharp
// 列出目录下所有 txt 文件
string[] files = Directory.GetFiles("dir", "*.txt");
```

---

**基本写法：递归列出**
`Directory.GetFiles(<路径>, <模式>, SearchOption.AllDirectories);`
```csharp
// 递归列出所有子目录文件
var files = Directory.GetFiles("dir", "*.*", SearchOption.AllDirectories);
```

---

**基本写法：枚举文件（惰性）**
`Directory.EnumerateFiles(<路径>);`
```csharp
// 惰性枚举，适合大目录
foreach (var f in Directory.EnumerateFiles("dir")) { }
```

---

**基本写法：删除目录**
`Directory.Delete(<路径>, [<递归>]);`
```csharp
// 递归删除目录
Directory.Delete("dir", recursive: true);
```

---

## using 与资源释放

**基本写法：using 声明**
`using var <流> = new FileStream(...);`
```csharp
// 作用域结束自动 Dispose
using var fs = new FileStream("a.txt", FileMode.Open);
```

---

**基本写法：using 语句**
`using (<流>) { }`
```csharp
// 显式作用域
using (var fs = new FileStream("a.txt", FileMode.Open))
{
}
```

---

**基本写法：await using 异步释放**
`await using var <流> = <异步流>;`
```csharp
// 异步释放 IAsyncDisposable
await using var fs = new FileStream("a.txt", FileMode.Open);
```

---

## 完整示例：写日志、逐行统计、复制备份

以下程序可直接运行（先确保程序工作目录可写），覆盖最常见的读写路径：

```csharp
// 1) 写入文本（覆盖 + 追加）
File.WriteAllText("demo.txt", "第一行\n");
File.AppendAllText("demo.txt", "第二行\n");

// 2) 逐行流式读取并统计（不会把整个文件读进内存）
int lineCount = 0;
foreach (string line in File.ReadLines("demo.txt"))
{
    Console.WriteLine($"[{++lineCount}] {line}");
}

// 3) 复制为备份并确认
File.Copy("demo.txt", "demo.bak.txt", overwrite: true);
Console.WriteLine($"备份大小: {new FileInfo("demo.bak.txt").Length} 字节");

// 4) 用 FileStream 精确控制二进制读写
using (var fs = new FileStream("data.bin", FileMode.Create))
using (var writer = new BinaryWriter(fs))
{
    writer.Write(42);
    writer.Write("C#");
}
using (var fs = new FileStream("data.bin", FileMode.Open))
using (var reader = new BinaryReader(fs))
{
    Console.WriteLine(reader.ReadInt32());   // 42
    Console.WriteLine(reader.ReadString());  // C#
}

// 输出：
// [1] 第一行
// [2] 第二行
// 备份大小: 20 字节
// 42
// C#
// （20 = UTF-8 下"第一行\n第二行\n"：6 个汉字各 3 字节 + 2 个换行符）
```

## 常见陷阱

**忘记释放流导致文件被占用**。`FileStream`/`StreamReader` 持有操作系统句柄，未 `Dispose` 前其他代码打开同一文件会抛 `IOException`（"being used by another process"）。永远用 `using` 声明或 `using` 语句托管流的生命周期。

**`File.ReadAllText` 与 `File.ReadLines` 的内存差异**。前者一次性把整个文件载入内存，适合小文件；后者惰性逐行枚举，适合大文件或"找到即停"的场景。同理 `WriteAllText` 一次写完，而 `StreamWriter` 适合持续追加写入。

**写入后立即读取需要先定位**。对同一个 `FileStream` 先写后读，必须 `fs.Seek(0, SeekOrigin.Begin)` 回到起点；写文本时还要注意 `StreamWriter` 有缓冲区，务必 `Flush()` 或 `Dispose` 后数据才真正落盘（`using` 结束时会自动 Flush）。

**编码默认值与 BOM**。.NET Core/.NET 5+ 的文本读写默认 UTF-8（无 BOM）；`StreamWriter` 默认写入 UTF-8 无 BOM，若要与带 BOM 的旧系统交互，显式传入 `new UTF8Encoding(true)`。读取时 `StreamReader` 会自动探测 BOM，没有 BOM 的文件按 UTF-8 处理。

**`Path.Combine` 遇到绝对路径参数会"丢弃"前面的部分**。`Path.Combine("C:\\a", "D:\\b")` 返回 `D:\\b`——当后续参数是带盘符或以 `/` 开头的绝对路径时，之前的片段全部作废。拼接来自用户输入的路径前应先校验。

**`File.Copy`/`Move` 默认不覆盖**。目标已存在时 `Copy` 抛 `IOException`，`Move` 在覆盖语义上也应显式传 `overwrite: true` / 使用 `File.Move(src, dst, true)`（.NET Core 3.0+），避免运行到一半才失败。

**异步 I/O 并非总是更快**。`ReadAllTextAsync` 的价值在于不阻塞线程池线程，适合服务端并发场景；对本地 SSD 上的一次性小文件读取，同步版本反而少一层开销。选择标准是"是否在异步上下文中"而不是"异步一定优"。

## 分层小结

- **记住**：`File.ReadAllText/WriteAllText/AppendAllText` 三板斧；`using` 托管一切流；`Path.Combine` 拼路径。
- **理解**：`ReadLines` 惰性与 `ReadAllLines` 一次性的取舍；流的位置（Position/Seek）与缓冲区语义；UTF-8 默认编码。
- **应用**：日志追加、配置读取、CSV 逐行解析、二进制格式读写分别选用本篇对应工具；高性能内存切片场景进阶到 [Span/Memory](/csharp/230-SpanMemory)。

## 自我检查（遮码自检）

遮码自检：先遮住每题的「参考答案」，自己写代码，再对照。本篇自检核心是"按数据规模选对 API"与"资源释放零失误"。

**题 1（选型题）**：三个需求各选一个 API：读 2KB 的配置文件全文；逐行处理 2GB 的日志；往日志追加一行。

参考答案：配置文件用 `File.ReadAllText(path)`（小文件全量读最简单）；2GB 日志用 `File.ReadLines(path)`（惰性逐行，不整载内存；要异步用 `StreamReader.ReadLineAsync` 循环）；追加一行用 `File.AppendAllText(path, line)`（打开-写-关一步到位）。共同判据：数据规模 × 是否需要流式处理。

**题 2（路径题）**：`"C:\logs" + "/" + "app.txt"` 手工拼路径有两个坑，是什么？写出正确写法。

参考答案：坑一：分隔符平台化——Linux 用 `/`，Windows 用 `\`，手工拼在跨平台部署上直接出错；坑二：`+` 不处理"前段末尾有没有分隔符"与"空段"。正确写法：`Path.Combine("C:", "logs", "app.txt")` 或基于已有路径 `Path.Combine(baseDir, "logs", "app.txt")`；取文件名/扩展名同理用 `Path.GetFileName`/`GetExtension`，不手写字符串切割。

**题 3（流与缓冲）**：`FileStream` 直接按字节读 vs `StreamReader` 逐行读，各自适合什么？写出"带默认 UTF-8 的逐行异步读取"骨架。

参考答案：`FileStream` 只认字节，适合二进制或自己管解码的场景；`StreamReader` 在流上包一层解码与按行缓冲，适合文本。骨架：

```csharp
using var reader = new StreamReader(path);   // UTF-8 默认
while (await reader.ReadLineAsync() is { } line)
    Process(line);
```

要点：`is { } line` 同时完成非空判断与绑定；`using` 保证文件句柄在块尾释放。

**题 4（二进制）**：写"用 BinaryWriter 写一个 int + 一个 string，再用 BinaryReader 顺序读回"的对称代码，并说出"顺序"为什么是铁律。

参考答案：

```csharp
using (var w = new BinaryWriter(File.Create("data.bin")))
{
    w.Write(42);
    w.Write("hello");
}
using (var r = new BinaryReader(File.OpenRead("data.bin")))
{
    int n = r.ReadInt32();
    string s = r.ReadString();   // 长度前缀编码
}
```

二进制格式没有自描述边界——`ReadInt32` 就是固定取 4 字节，读写的顺序与编码（长度前缀字符串、7 位变长整数）必须严格对称，错一个字段后面全部错位且不报错。

**题 5（释放事故）**：`var content = new StreamReader(path).ReadToEnd();` 这行哪里错了？两种修法？

参考答案：`StreamReader` 没有 Dispose——对象脱离引用后等 GC 兜底回收才关句柄，期间 Windows 上该文件被锁（删除/覆盖失败），高频调用还会句柄耗尽。修法一：`using var reader = new StreamReader(path); var content = reader.ReadToEnd();`；修法二：小文件直接 `File.ReadAllText(path)`，让便捷方法内部用完即关。原则：实现了 IDisposable 的流一律 `using`，或者干脆用 File 静态方法省掉流。
