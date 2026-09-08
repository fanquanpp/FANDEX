---
order: 420
title: C# 文件与流操作
module: 'csharp'
category: 后端技术
difficulty: beginner
description: C# 文件与流操作 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

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
