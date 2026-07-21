---
order: 150
tags:
  - java
difficulty: intermediate
title: 'I/O 流与文件操作'
module: java
category: 'Java Basics'
description: '字节流、字符流、NIO 与文件操作。'
author: Anonymous
related:
  - java/异常处理机制
  - java/泛型详解
  - java/多线程基础
  - java/JVM内存模型
prerequisites:
  - java/概述与开发环境
---

## 1. I/O 流分类 (Classification)

### 1.1 按流向分类

- **输入流 (Input Stream)**: 从外部设备读取数据到程序
- **输出流 (Output Stream)**: 从程序写入数据到外部设备

### 1.2 按数据单位分类

- **字节流 (Byte Stream)**: 以字节为单位处理数据，可处理所有类型的文件
- 顶级类: `InputStream` (输入), `OutputStream` (输出)
- **字符流 (Character Stream)**: 以字符为单位处理数据，专门用于处理文本文件
- 顶级类: `Reader` (输入), `Writer` (输出)

### 1.3 按功能分类

- **节点流**: 直接与数据源相连，如 `FileInputStream`
- **处理流**: 对节点流进行包装，提供额外功能，如 `BufferedInputStream`

### 1.4 IO 流的层次结构

```
 ┌
 │ 字节流 │
 ├───────────────────────────────┬───────────────────────┤
 │ InputStream │ OutputStream │
 ├──────────┬──────────┬────────┼──────────┬──────────┬─────┤
 │FileInput │ByteArray│Buffered│FileOutput│ByteArray│Buffered│
 │Stream │InputStream│InputStream│Stream │OutputStream│OutputStream│
 └──────────┴──────────┴────────┴──────────┴──────────┴─────┘
 ┌
 │ 字符流 │
 ├───────────────────────────────┬───────────────────────┤
 │ Reader │ Writer │
 ├──────────┬──────────┬────────┼──────────┬──────────┬─────┤
 │FileReader│CharArray│Buffered│FileWriter│CharArray│Buffered│
 │ │Reader │Reader │ │Writer │Writer │
 └──────────┴──────────┴────────┴──────────┴──────────┴─────┘
 ┌
 │ 转换流 │
 ├───────────────────────────────┬───────────────────────┤
 │ InputStreamReader │ OutputStreamWriter│
 └───────────────────────────────┴───────────────────────┘
 ┌
 │ 对象流 │
 ├───────────────────────────────┬───────────────────────┤
 │ ObjectInputStream │ ObjectOutputStream│
 └───────────────────────────────┴───────────────────────┘
```

## 2. 字节流 (Byte Stream)

### 2.1 基本字节流

#### 2.1.1 FileInputStream

用于从文件读取字节数据。

```java
 // 读取文件
 try (FileInputStream fis = new FileInputStream("input.txt")) {
  int data;
  while ((data = fis.read()) != -1) {
  System.out.print((char) data);
  }
 }
  e.printStackTrace();
 }
```

#### 2.1.2 FileOutputStream

用于向文件写入字节数据。

```java
 // 写入文件
 try (FileOutputStream fos = new FileOutputStream("output.txt")) {
  String content = "Hello, FileOutputStream!";
  fos.write(content.getBytes());
 }
  e.printStackTrace();
 }
```

### 2.2 缓冲字节流

#### 2.2.1 BufferedInputStream

带缓冲区的输入流，提高读取性能。

```java
 // 使用缓冲流读取
 try (BufferedInputStream bis = new BufferedInputStream(new FileInputStream("input.txt"))) {
  byte[] buffer = new byte[1024];
  int bytesRead;
  while ((bytesRead = bis.read(buffer)) != -1) {
  System.out.print(new String(buffer, 0, bytesRead));
  }
 }
  e.printStackTrace();
 }
```

#### 2.2.2 BufferedOutputStream

带缓冲区的输出流，提高写入性能。

```java
 // 使用缓冲流写入
 try (BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream("output.txt"))) {
  String content = "Hello, BufferedOutputStream!";
  bos.write(content.getBytes());
  bos.flush(); // 刷新缓冲区
 }
  e.printStackTrace();
 }
```

## 3. 字符流 (Character Stream)

### 3.1 基本字符流

#### 3.1.1 FileReader

用于从文件读取字符数据。

```java
 // 读取文本文件
 try (FileReader fr = new FileReader("input.txt")) {
  int data;
  while ((data = fr.read()) != -1) {
  System.out.print((char) data);
  }
 }
  e.printStackTrace();
 }
```

#### 3.1.2 FileWriter

用于向文件写入字符数据。

```java
 // 写入文本文件
 try (FileWriter fw = new FileWriter("output.txt")) {
  String content = "Hello, FileWriter!";
  fw.write(content);
 }
  e.printStackTrace();
 }
```

### 3.2 缓冲字符流

#### 3.2.1 BufferedReader

带缓冲区的字符输入流，提供按行读取功能。

```java
 // 使用缓冲流按行读取
 try (BufferedReader br = new BufferedReader(new FileReader("input.txt"))) {
  String line;
  while ((line = br.readLine()) != null) {
  System.out.println(line);
  }
 }
  e.printStackTrace();
 }
```

#### 3.2.2 BufferedWriter

带缓冲区的字符输出流，提供写入换行功能。

```java
 // 使用缓冲流写入
 try (BufferedWriter bw = new BufferedWriter(new FileWriter("output.txt"))) {
  bw.write("Hello, BufferedWriter!");
  bw.newLine(); // 写入换行
  bw.write("This is a new line.");
  bw.flush(); // 刷新缓冲区
 }
  e.printStackTrace();
 }
```

## 4. 转换流

### 4.1 InputStreamReader

将字节流转换为字符流，指定字符编码。

```java
 // 使用转换流读取，指定编码
 try (InputStreamReader isr = new InputStreamReader(new FileInputStream("input.txt"), "UTF-8")) {
  int data;
  while ((data = isr.read()) != -1) {
  System.out.print((char) data);
  }
 }
  e.printStackTrace();
 }
```

### 4.2 OutputStreamWriter

将字符流转换为字节流，指定字符编码。

```java
 // 使用转换流写入，指定编码
 try (OutputStreamWriter osw = new OutputStreamWriter(new FileOutputStream("output.txt"), "UTF-8")) {
  String content = "Hello, OutputStreamWriter!";
  osw.write(content);
  osw.flush();
 }
  e.printStackTrace();
 }
```

## 5. 对象序列化 (Serialization)

### 5.1 序列化的概念

将对象的状态转换为字节序列，以便存储或传输。

### 5.2 序列化的条件

- 类必须实现 `Serializable` 接口
- 类的所有非瞬态字段必须可序列化

### 5.3 序列化示例

#### 5.3.1 可序列化的类

```java
 import java.io.Serializable;
 public class Person implements Serializable {
  private static final long serialVersionUID = 1L;
  private String name;
  private int age;
  private transient String password; // 不参与序列化
  // 构造器、getter、setter 方法
 }
```

#### 5.3.2 对象序列化

```java
 // 序列化对象到文件
 try (ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream("person.dat"))) {
  Person person = new Person("Alice", 25, "123456");
  oos.writeObject(person);
  System.out.println("对象序列化成功");
 }
  e.printStackTrace();
 }
```

#### 5.3.3 对象反序列化

```java
 // 从文件反序列化对象
 try (ObjectInputStream ois = new ObjectInputStream(new FileInputStream("person.dat"))) {
  Person person = (Person) ois.readObject();
  System.out.println("姓名: " + person.getName());
  System.out.println("年龄: " + person.getAge());
  System.out.println("密码: " + person.getPassword()); // 输出 null，因为 password 是 transient
  System.out.println("对象反序列化成功");
 }
  e.printStackTrace();
 }
```

### 5.4 序列化的注意事项

- **serialVersionUID**: 建议显式声明，确保版本兼容性
- **transient**: 标记不需要序列化的字段
- **静态字段**: 静态字段不会被序列化
- **循环引用**: 序列化会自动处理循环引用
- **安全性**: 序列化可能导致安全问题，需要注意

## 6. 文件操作 (java.io.File)

### 6.1 File 类的常用方法

#### 6.1.1 文件检查方法

- **exists()**: 检查文件或目录是否存在
- **isFile()**: 检查是否为文件
- **isDirectory()**: 检查是否为目录
- **canRead()**: 检查是否可读
- **canWrite()**: 检查是否可写
- **isHidden()**: 检查是否隐藏

#### 6.1.2 文件操作方法

- **createNewFile()**: 创建新文件
- **delete()**: 删除文件或目录
- **renameTo(File dest)**: 重命名文件或目录
- **mkdir()**: 创建目录
- **mkdirs()**: 创建多级目录
- **deleteOnExit()**: JVM 退出时删除文件

#### 6.1.3 文件信息方法

- **getName()**: 获取文件名
- **getPath()**: 获取文件路径
- **getAbsolutePath()**: 获取绝对路径
- **getCanonicalPath()**: 获取规范路径
- **length()**: 获取文件长度
- **lastModified()**: 获取最后修改时间

#### 6.1.4 目录操作方法

- **list()**: 获取目录下的文件和目录名
- **listFiles()**: 获取目录下的文件和目录对象
- **listFiles(FileFilter filter)**: 获取符合过滤条件的文件和目录

### 6.2 File 操作示例

#### 6.2.1 创建文件

```java
 File file = new File("test.txt");
 try {
  if (file.createNewFile()) {
  System.out.println("文件创建成功");
  } else {
  System.out.println("文件已存在");
  }
 }
  e.printStackTrace();
 }
```

#### 6.2.2 创建目录

```java
 // 创建单个目录
 File dir = new File("mydir");
 if (dir.mkdir()) {
  System.out.println("目录创建成功");
 }
  System.out.println("目录创建失败");
 }
 // 创建多级目录
 File multiDir = new File("dir1/dir2/dir3");
 if (multiDir.mkdirs()) {
  System.out.println("多级目录创建成功");
 }
  System.out.println("多级目录创建失败");
 }
```

#### 6.2.3 列出目录内容

```java
 File dir = new File(".");
 String[] files = dir.list();
 System.out.println("目录内容:");
 for (String file : files) {
  System.out.println(file);
 }
 // 使用 FileFilter
 File[] javaFiles = dir.listFiles((f) -> f.getName().endsWith(".java"));
 System.out.println("Java 文件:");
 for (File file : javaFiles) {
  System.out.println(file.getName());
 }
```

## 7. NIO (Non-blocking I/O)

### 7.1 NIO 的核心组件

- **Buffer**: 缓冲区，用于存储数据
- **Channel**: 通道，用于数据传输
- **Selector**: 选择器，用于监控多个通道的事件

### 7.2 Buffer

#### 7.2.1 Buffer 的类型

- **ByteBuffer**
- **CharBuffer**
- **ShortBuffer**
- **IntBuffer**
- **LongBuffer**
- **FloatBuffer**
- **DoubleBuffer**

#### 7.2.2 Buffer 的使用

```java
 // 创建缓冲区
 ByteBuffer buffer = ByteBuffer.allocate(1024);
 // 写入数据
 buffer.put("Hello, NIO!".getBytes());
 // 切换到读模式
 buffer.flip();
 // 读取数据
 byte[] data = new byte[buffer.limit()];
 buffer.get(data);
 System.out.println(new String(data));
 // 清空缓冲区
 buffer.clear();
```

### 7.3 Channel

#### 7.3.1 Channel 的类型

- **FileChannel**: 文件通道
- **SocketChannel**: 套接字通道
- **ServerSocketChannel**: 服务器套接字通道
- **DatagramChannel**: 数据报通道

#### 7.3.2 FileChannel 的使用

```java
 // 读取文件
 try (FileChannel channel = new FileInputStream("input.txt").getChannel()) {
  ByteBuffer buffer = ByteBuffer.allocate(1024);
  while (channel.read(buffer) != -1) {
  buffer.flip();
  byte[] data = new byte[buffer.limit()];
  buffer.get(data);
  System.out.print(new String(data));
  buffer.clear();
  }
 }
  e.printStackTrace();
 }
 // 写入文件
 try (FileChannel channel = new FileOutputStream("output.txt").getChannel()) {
  ByteBuffer buffer = ByteBuffer.wrap("Hello, FileChannel!".getBytes());
  channel.write(buffer);
 }
  e.printStackTrace();
 }
```

### 7.4 NIO 2.0 (Java 7+)

#### 7.4.1 Path 接口

```java
 // 创建 Path
 Path path = Paths.get("test.txt");
 // 获取路径信息
 System.out.println("文件名: " + path.getFileName());
 System.out.println("父路径: " + path.getParent());
 System.out.println("绝对路径: " + path.toAbsolutePath());
```

#### 7.4.2 Files 类

```java
 // 读取文件
 List<String> lines = Files.readAllLines(Paths.get("input.txt"), StandardCharsets.UTF_8);
 for (String line : lines) {
  System.out.println(line);
 }
 // 写入文件
 List<String> content = Arrays.asList("Hello, Files!", "This is a test.");
 Files.write(Paths.get("output.txt"), content, StandardCharsets.UTF_8);
 // 复制文件
 Files.copy(Paths.get("input.txt"), Paths.get("copy.txt"), StandardCopyOption.REPLACE_EXISTING);
 // 删除文件
 Files.deleteIfExists(Paths.get("temp.txt"));
```

## 8. 实际应用案例

### 8.1 文件复制

#### 8.1.1 使用字节流复制

```java
 public static void copyFileUsingStream(File source, File dest) throws IOException {
  try (InputStream is = new FileInputStream(source);
  OutputStream os = new FileOutputStream(dest)) {
  byte[] buffer = new byte[1024];
  int length;
  while ((length = is.read(buffer)) > 0) {
  os.write(buffer, 0, length);
  }
  }
 }
```

#### 8.1.2 使用缓冲流复制

```java
 public static void copyFileUsingBufferedStream(File source, File dest) throws IOException {
  try (BufferedInputStream bis = new BufferedInputStream(new FileInputStream(source));
  BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(dest))) {
  byte[] buffer = new byte[1024];
  int length;
  while ((length = bis.read(buffer)) > 0) {
  bos.write(buffer, 0, length);
  }
  }
 }
```

#### 8.1.3 使用 NIO 复制

```java
 public static void copyFileUsingNIO(File source, File dest) throws IOException {
  try (FileChannel sourceChannel = new FileInputStream(source).getChannel();
  FileChannel destChannel = new FileOutputStream(dest).getChannel()) {
  destChannel.transferFrom(sourceChannel, 0, sourceChannel.size());
  }
 }
```

### 8.2 文本文件读写

#### 8.2.1 读取文本文件

```java
 public static List<String> readTextFile(String filePath) throws IOException {
  List<String> lines = new ArrayList<>();
  try (BufferedReader br = new BufferedReader(new FileReader(filePath))) {
  String line;
  while ((line = br.readLine()) != null) {
  lines.add(line);
  }
  }
  return lines;
 }
```

#### 8.2.2 写入文本文件

```java
 public static void writeTextFile(String filePath, List<String> lines) throws IOException {
  try (BufferedWriter bw = new BufferedWriter(new FileWriter(filePath))) {
  for (String line : lines) {
  bw.write(line);
  bw.newLine();
  }
  }
 }
```

### 8.3 目录遍历

```java
 public static void listFilesRecursively(File directory) {
  if (!directory.isDirectory()) {
  return;
  }
  File[] files = directory.listFiles();
  if (files != null) {
  for (File file : files) {
  if (file.isDirectory()) {
  System.out.println("目录: " + file.getAbsolutePath());
  listFilesRecursively(file);
  } else {
  System.out.println("文件: " + file.getAbsolutePath());
  }
  }
  }
 }
```

## 9. 最佳实践

### 9.1 资源管理

- **使用 try-with-resources**: 自动关闭资源，避免资源泄漏
- **显式关闭资源**: 在 try-with-resources 不可用的情况下，使用 finally 块关闭资源

### 9.2 性能优化

- **使用缓冲流**: 提高读写性能
- **合理设置缓冲区大小**: 根据实际情况调整缓冲区大小
- **使用 NIO**: 对于大文件操作，考虑使用 NIO 提高性能
- **批量操作**: 减少 I/O 操作次数

### 9.3 编码处理

- **指定字符编码**: 避免默认编码导致的问题
- **使用 UTF-8**: 推荐使用 UTF-8 编码
- **使用转换流**: 在字节流和字符流之间转换时指定编码

### 9.4 文件操作

- **检查文件存在性**: 在操作文件前检查文件是否存在
- **处理异常**: 妥善处理 I/O 异常
- **使用 Files 类**: Java 7+ 推荐使用 Files 类进行文件操作
- **路径处理**: 使用 Path 接口处理路径

### 9.5 序列化

- **显式声明 serialVersionUID**: 确保版本兼容性
- **谨慎使用 transient**: 只对不需要序列化的字段使用
- **注意序列化的安全性**: 避免序列化敏感信息

## 10. 常见陷阱

### 10.1 资源泄漏

- **忘记关闭资源**: 导致文件句柄泄漏
- **在 finally 块中关闭资源时发生异常**: 掩盖原始异常

### 10.2 编码问题

- **使用默认编码**: 可能导致跨平台问题
- **字节与字符转换错误**: 导致乱码

### 10.3 文件操作陷阱

- **路径分隔符**: 不同操作系统的路径分隔符不同
- **文件权限**: 没有足够的权限操作文件
- **文件名长度**: 超过系统限制

### 10.4 序列化陷阱

- **serialVersionUID 不匹配**: 导致反序列化失败
- **序列化循环引用**: 可能导致栈溢出
- **序列化大对象**: 可能导致内存问题

### 10.5 性能陷阱

- **频繁的小 I/O 操作**: 降低性能
- **不使用缓冲流**: 导致频繁的磁盘操作
- **大文件一次性读入内存**: 可能导致内存溢出

---

### 更新日志 (Changelog)

- 2026-04-05: 补充序列化与缓冲流细节。
- 2026-05-03: 扩展内容，添加IO流的详细分类、各种流的具体使用方法、缓冲流的性能优势、序列化的详细实现、文件操作的详细方法、NIO的详细介绍、实际应用案例和最佳实践。
