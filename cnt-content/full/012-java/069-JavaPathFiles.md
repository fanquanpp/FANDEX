---
order: 690
title: Java Path 与 Files 语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Java Path 与 Files 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'java/028-IOStreamFileOperation'
  - 'java/068-JavaNIOChannelBuffer'
prerequisites:
  - 'java/028-IOStreamFileOperation'
---

## 0. 本节阅读指引（先读这一节）

本篇是「Path 与 Files」语法速查手册，按需查阅。

零基础第一遍只读：Path 创建、Path 操作、Files 文件操作、文件读写；流式读写、文件属性、PathMatcher、FileVisitor 遇到再查。

前置：026 I/O 流与文件操作。


## Path 创建

**基本写法：从字符串创建**
`Path.of(<路径字符串>);`
```java
// Java 11+，等价于 Paths.get
Path p = Path.of("C:\\data\\file.txt");
```

---

**基本写法：从多段创建**
`Path.of(<根>, <段1>, <段2>);`
```java
// 拼接路径段
Path p = Path.of("C:", "data", "sub", "file.txt");
```

---

**基本写法：Paths.get**
`Paths.get(<路径字符串>);`
```java
// NIO.2 传统方式
Path p = Paths.get("/var/log/app.log");
```

---

**基本写法：从 URI 创建**
`Paths.get(<URI>);`
```java
// 通过 URI 创建
Path p = Paths.get(URI.create("file:///C:/data/file.txt"));
```

---

## Path 操作

**基本写法：拼接路径**
`<Path>.resolve(<子路径>);`
```java
// 拼接子路径
Path dir = Path.of("C:\\data");
Path file = dir.resolve("file.txt");
```

---

**基本写法：相对化**
`<Path>.relativize(<目标>);`
```java
// 求相对路径
Path a = Path.of("C:\\data\\sub");
Path b = Path.of("C:\\data\\other\\f.txt");
Path r = a.relativize(b);
```

---

**基本写法：规范化**
`<Path>.normalize();`
```java
// 消除 . 和 ..
Path p = Path.of("C:\\data\\..\\file.txt").normalize();
```

---

**基本写法：转绝对路径**
`<Path>.toAbsolutePath();`
```java
// 转换为绝对路径
Path p = Path.of("file.txt").toAbsolutePath();
```

---

**基本写法：访问路径组件**
`<Path>.getFileName();`
```java
// 获取文件名、父路径、根
Path p = Path.of("C:\\data\\file.txt");
p.getFileName();   // file.txt
p.getParent();     // C:\data
p.getRoot();       // C:\
```

---

## Files 文件操作

**基本写法：判断存在**
`Files.exists(<Path>);`
```java
// 判断文件是否存在
boolean ok = Files.exists(Path.of("a.txt"));
```

---

**基本写法：创建文件**
`Files.createFile(<Path>);`
```java
// 创建空文件
Files.createFile(Path.of("new.txt"));
```

---

**基本写法：创建目录**
`Files.createDirectory(<Path>);`
```java
// 创建单层目录
Files.createDirectory(Path.of("C:\\newdir"));
```

---

**基本写法：递归创建目录**
`Files.createDirectories(<Path>);`
```java
// 创建多层目录
Files.createDirectories(Path.of("C:\\a\\b\\c"));
```

---

**基本写法：删除文件**
`Files.delete(<Path>);`
```java
// 删除，不存在则抛异常
Files.delete(Path.of("old.txt"));
```

---

**基本写法：删除不存在不报错**
`Files.deleteIfExists(<Path>);`
```java
// 不存在时返回 false
boolean deleted = Files.deleteIfExists(Path.of("old.txt"));
```

---

**基本写法：复制文件**
`Files.copy(<源>, <目标>);`
```java
// 复制文件
Files.copy(Path.of("a.txt"), Path.of("b.txt"));
```

---

**基本写法：覆盖复制**
`Files.copy(<源>, <目标>, StandardCopyOption.REPLACE_EXISTING);`
```java
// 覆盖已存在目标
Files.copy(Path.of("a.txt"), Path.of("b.txt"),
    StandardCopyOption.REPLACE_EXISTING);
```

---

**基本写法：移动/重命名**
`Files.move(<源>, <目标>);`
```java
// 移动或重命名
Files.move(Path.of("a.txt"), Path.of("dir/a.txt"));
```

---

## 文件读写

**基本写法：读全部字节**
`Files.readAllBytes(<Path>);`
```java
// 读取整个文件为字节数组
byte[] data = Files.readAllBytes(Path.of("a.dat"));
```

---

**基本写法：读全部行**
`Files.readAllLines(<Path>);`
```java
// 读取所有行
List<String> lines = Files.readAllLines(Path.of("a.txt"));
```

---

**基本写法：读字符串**
`Files.readString(<Path>);`
```java
// Java 11+，读取为字符串
String text = Files.readString(Path.of("a.txt"));
```

---

**基本写法：写字符串**
`Files.writeString(<Path>, <内容>);`
```java
// Java 11+，写入字符串
Files.writeString(Path.of("a.txt"), "hello");
```

---

**基本写法：写行集合**
`Files.write(<Path>, <Iterable>);`
```java
// 写入多行
Files.write(Path.of("a.txt"), List.of("a", "b", "c"));
```

---

**基本写法：追加写入**
`Files.writeString(<Path>, <内容>, StandardOpenOption.APPEND);`
```java
// 追加到文件末尾
Files.writeString(Path.of("a.txt"), "more",
    StandardOpenOption.APPEND);
```

---

## 流式读写

**基本写法：行流**
`Files.lines(<Path>);`
```java
// 按行流式读取，需 try-with-resources
try (Stream<String> s = Files.lines(Path.of("big.log"))) {
    s.filter(l -> l.contains("ERROR")).forEach(System.out::println);
}
```

---

**基本写法：列出目录**
`Files.list(<Path>);`
```java
// 列出直接子项
try (Stream<Path> s = Files.list(Path.of("C:\\data"))) {
    s.forEach(System.out::println);
}
```

---

**基本写法：遍历目录树**
`Files.walk(<Path>, <深度>);`
```java
// 深度遍历
try (Stream<Path> s = Files.walk(Path.of("C:\\data"), 3)) {
    s.filter(Files::isRegularFile).forEach(System.out::println);
}
```

---

**基本写法：按 glob 查找**
`Files.find(<Path>, <深度>, <匹配器>);`
```java
// 按条件查找
try (Stream<Path> s = Files.find(Path.of("C:\\data"), 5,
        (p, a) -> p.toString().endsWith(".log"))) {
    s.forEach(System.out::println);
}
```

---

## 文件属性

**基本写法：基本属性**
`Files.size(<Path>);`
```java
// 文件大小（字节）
long size = Files.size(Path.of("a.txt"));
```

---

**基本写法：判断类型**
`Files.isDirectory(<Path>);`
```java
// 判断目录/文件/符号链接
boolean dir = Files.isDirectory(Path.of("C:\\data"));
boolean reg = Files.isRegularFile(Path.of("a.txt"));
boolean lnk = Files.isSymbolicLink(Path.of("link"));
```

---

**基本写法：读取属性对象**
`Files.readAttributes(<Path>, <属性类>);`
```java
// 一次性读取基本属性
BasicFileAttributes attrs = Files.readAttributes(
    Path.of("a.txt"), BasicFileAttributes.class);
attrs.size();
attrs.lastModifiedTime();
```

---

**基本写法：创建符号链接**
`Files.createSymbolicLink(<链接>, <目标>);`
```java
// 创建符号链接
Files.createSymbolicLink(Path.of("link.txt"), Path.of("a.txt"));
```

---

## PathMatcher 路径匹配

**基本写法：创建匹配器**
`FileSystems.getDefault().getPathMatcher("<语法>:<模式>");`
```java
// 创建 glob 路径匹配器
PathMatcher m = FileSystems.getDefault().getPathMatcher("glob:**/*.java");
// 也可使用 regex 语法
PathMatcher r = FileSystems.getDefault().getPathMatcher("regex:.*\\.java$");
```

---

**基本写法：匹配路径**
`<matcher>.matches(<Path>);`
```java
// 判断路径是否匹配
boolean ok = m.matches(Path.of("src/Main.java"));
```

---

**基本写法：glob 语法要点**
```java
// **   匹配任意层级目录
// *    匹配任意字符（不含目录分隔符）
// ?    匹配单个字符
// {}   逗号分隔的多个选项
PathMatcher m = FileSystems.getDefault().getPathMatcher("glob:*.{java,txt}");
```

---

## FileVisitor 递归

**基本写法：递归遍历回调**
`Files.walkFileTree(<Path>, <Visitor>);`
```java
// 自定义递归访问
Files.walkFileTree(Path.of("C:\\data"), new SimpleFileVisitor<>() {
    @Override public FileVisitResult visitFile(Path f, BasicFileAttributes a) {
        System.out.println(f);
        return FileVisitResult.CONTINUE;
    }
});
```
