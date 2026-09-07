---
order: 680
title: Java NIO 通道与缓冲区
module: 'java'
category: 后端技术
difficulty: beginner
description: Java NIO 通道与缓冲区 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'java/067-JavaIONIO'
  - 'java/069-JavaPathFiles'
prerequisites:
  - 'java/028-IOStreamFileOperation'
  - 'java/067-JavaIONIO'
---

## 0. 本节阅读指引（先读这一节）

本篇是「NIO 通道与缓冲区」语法速查手册，按需查阅。

零基础第一遍只读：Buffer 创建、Buffer 读写操作、Buffer 状态属性、FileChannel；Selector、Scatter/Gather、Charset、Path、异步文件通道遇到再查。

前置：026 I/O 流与文件操作、059 Java IO 与 NIO。


## Buffer 创建

**基本写法：创建字节缓冲区**
`ByteBuffer.allocate(<容量>);`
```java
// 分配堆内字节缓冲区
ByteBuffer buf = ByteBuffer.allocate(1024);
```

---

**基本写法：创建直接缓冲区**
`ByteBuffer.allocateDirect(<容量>);`
```java
// 分配堆外直接缓冲区（减少拷贝）
ByteBuffer direct = ByteBuffer.allocateDirect(1024);
```

---

**基本写法：包装数组**
`ByteBuffer.wrap(<字节数组>);`
```java
// 包装现有数组为 Buffer
ByteBuffer buf = ByteBuffer.wrap(new byte[]{1, 2, 3});
```

---

## Buffer 读写操作

**基本写法：写入数据**
`<buffer>.put(<值>);`
```java
// 向缓冲区写入字节
buf.put((byte) 65);
```

---

**基本写法：读取数据**
`<buffer>.get();`
```java
// 从缓冲区读取字节
byte b = buf.get();
```

---

**基本写法：切换为读模式**
`<buffer>.flip();`
```java
// 写完后翻转为读模式
buf.flip();
```

---

**基本写法：重置位置**
`<buffer>.rewind();`
```java
// 重置 position 以便重新读
buf.rewind();
```

---

**基本写法：清空缓冲区**
`<buffer>.clear();`
```java
// 清空缓冲区准备再次写入
buf.clear();
```

---

**基本写法：压缩缓冲区**
`<buffer>.compact();`
```java
// 压缩未读数据到头部
buf.compact();
```

---

## Buffer 状态属性

**基本写法：获取容量**
`<buffer>.capacity();`
```java
// 获取缓冲区容量
int cap = buf.capacity();
```

---

**基本写法：获取位置**
`<buffer>.position();`
```java
// 获取当前位置
int pos = buf.position();
```

---

**基本写法：获取限制**
`<buffer>.limit();`
```java
// 获取限制位置
int limit = buf.limit();
```

---

**基本写法：获取剩余量**
`<buffer>.remaining();`
```java
// 获取剩余可读元素数量
int rem = buf.remaining();
```

---

## FileChannel 文件通道

**基本写法：从文件获取通道**
`FileChannel.open(<路径>, <打开选项>...);`
```java
// 打开文件通道
FileChannel ch = FileChannel.open(Path.of("a.txt"), StandardOpenOption.READ);
```

---

**基本写法：通道读入缓冲区**
`<channel>.read(<buffer>);`
```java
// 从通道读取到 Buffer
int n = ch.read(buf);
```

---

**基本写法：缓冲区写入通道**
`<channel>.write(<buffer>);`
```java
// 将 Buffer 数据写入通道
ch.write(buf);
```

---

**基本写法：传输文件**
`<channel>.transferTo(<位置>, <数量>, <目标通道>);`
```java
// 零拷贝传输文件内容
src.transferTo(0, src.size(), dst);
```

---

## Scatter / Gather

**基本写法：分散读**
`<channel>.read(<buffer数组>);`
```java
// 一次读入多个 Buffer
ByteBuffer[] bufs = {header, body};
channel.read(bufs);
```

---

**基本写法：聚集写**
`<channel>.write(<buffer数组>);`
```java
// 多个 Buffer 一次写出
ByteBuffer[] bufs = {header, body};
channel.write(bufs);
```

---

## Selector 选择器

**基本写法：创建选择器**
`Selector.open();`
```java
// 打开选择器
Selector selector = Selector.open();
```

---

**基本写法：注册通道到选择器**
`<channel>.register(<selector>, <就绪事件>);`
```java
// 注册通道为可读事件
channel.configureBlocking(false);
channel.register(selector, SelectionKey.OP_READ);
```

---

**基本写法：选择就绪通道**
`<selector>.select();`
```java
// 阻塞直到有就绪通道
int ready = selector.select();
```

---

**基本写法：获取就绪键**
`<selector>.selectedKeys();`
```java
// 获取就绪的 SelectionKey 集合
Set<SelectionKey> keys = selector.selectedKeys();
```

---

## Charset 字符编码

**基本写法：编码字符串到字节**
`<charset>.encode(<字符串>);`
```java
// 使用 UTF-8 编码
ByteBuffer b = StandardCharsets.UTF_8.encode("hello");
```

---

**基本写法：解码字节到字符串**
`<charset>.decode(<buffer>);`
```java
// 使用 UTF-8 解码
String s = StandardCharsets.UTF_8.decode(buf).toString();
```

---

## Path 路径操作

**基本写法：创建路径**
`Path.of("<路径>");`
```java
// 创建 Path 对象
Path p = Path.of("a", "b", "c.txt");
```

---

**基本写法：读取文件所有字节**
`Files.readAllBytes(<路径>);`
```java
// 一次性读取小文件全部字节
byte[] all = Files.readAllBytes(Path.of("a.txt"));
```

---

**基本写法：写入文件**
`Files.write(<路径>, <字节数组>);`
```java
// 写入字节数组到文件
Files.write(Path.of("out.txt"), bytes);
```

---

**基本写法：按行读取**
`Files.readAllLines(<路径>);`
```java
// 按行读取文件
List<String> lines = Files.readAllLines(Path.of("a.txt"));
```

---

## 异步文件通道

**基本写法：打开异步文件通道**
`AsynchronousFileChannel.open(<路径>, <选项>...);`
```java
// 打开异步文件通道
AsynchronousFileChannel ch = AsynchronousFileChannel.open(
    Path.of("a.txt"), StandardOpenOption.READ);
```

---

**基本写法：异步读取**
`<channel>.read(<buffer>, <位置>, <附件>, <完成处理器>);`
```java
// 异步读取并回调
ch.read(buf, 0, null, new CompletionHandler<Integer, Object>() {
    public void completed(Integer n, Object att) { }
    public void failed(Throwable e, Object att) { }
});
```
