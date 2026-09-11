---
order: 270
title: 现代文件读写救急锦囊： Files.readString / writeString
module: 'java'
category: 后端技术
difficulty: beginner
description: Java 11+ 读写小文件一把梭：不用 FileReader/FileWriter 那套老写法。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'java/280-IOStreamFileOperation'
  - 'java/670-JavaPathFiles'
  - 'java/300-StreamAPI'
prerequisites:
  - 'java/180-ExceptionHandlingMechanism'
---

## 一句话定调

**读写小配置文件，用 `Files.readString()` / `Files.writeString()` 一把梭**，默认 UTF-8，自动关闭资源。

## 为什么老写法该退休

`new FileReader("a.txt")` 这套 IO 流写法有三宗罪：要手写 try-finally 关闭、默认平台编码（Windows 上 GBK，Linux 上 UTF-8，同一个文件跨平台读出两种结果）、五六行样板才能读出一个字符串。`java.nio.file.Files` 的静态方法一次解决：内部自己开关资源、`readString` 默认 UTF-8、一行读全文件。记住一个心智模型——**老 API 是"自来水管"（一边流一边用），新 API 是"矿泉水瓶"（整瓶搬运）**：小文件直接拿瓶，大文件（百 MB 以上）老老实实用流。

## 极简代码（看懂这 20 行就够了）

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

public class FileQuickstart {
    public static void main(String[] args) throws IOException {
        Path path = Path.of("note.txt");

        // 写入：不存在则创建，已存在则覆盖
        Files.writeString(path, "第一行内容\n第二行内容");

        // 读取：一次性读回整个文件
        String text = Files.readString(path);
        System.out.println(text);
        // 预期输出：
        // 第一行内容
        // 第二行内容

        // 追加一行：需要显式声明 APPEND
        Files.writeString(path, "追加行\n", StandardOpenOption.APPEND);

        // 按行读：小文件直接用 readAllLines
        for (String line : Files.readAllLines(path)) {
            System.out.println("行: " + line);
        }
        // 预期输出：
        // 行: 第一行内容
        // 行: 第二行内容
        // 行: 追加行
    }
}
```

注意：方法签名带 `throws IOException`，要么在方法上声明，要么用 `try-catch`（结合 017 try-with-resources 与 016 异常处理）。

## 完整示例：一行不用流读完 + 常用文件操作全家福

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class FilesKitchen {
    public static void main(String[] args) throws IOException {
        Path src = Path.of("demo.txt");

        // 按行处理大一点的文件（惰性读取，不一次性装进内存）
        Files.writeString(src, "alpha\nbeta\ngamma");
        long count = Files.lines(src).filter(l -> !l.isEmpty()).count();
        System.out.println("非空行数: " + count); // 预期输出：非空行数: 3

        // 判断 / 元信息
        System.out.println(Files.exists(src));  // true
        System.out.println(Files.size(src));    // 16（UTF-8 下每个英文字母 1 字节，3 个换行符）

        // 复制 / 移动 / 删除
        Files.copy(src, Path.of("demo-copy.txt"));
        Files.move(Path.of("demo-copy.txt"), Path.of("demo-renamed.txt"));
        Files.delete(Path.of("demo-renamed.txt"));

        // 临时文件：自动起名，用完即删
        Path tmp = Files.createTempFile("log-", ".txt");
        System.out.println("临时文件: " + tmp.getFileName()); // 类似 log-8371492.txt
        Files.delete(tmp);

        Files.delete(src);
    }
}
```

`Files.lines` 返回 `Stream<String>`，记得用 try-with-resources 包住（流持有文件句柄），或像上例一样当场消费干净。

## 指定编码：跨平台别赌默认值

`readString`/`writeString` 默认 UTF-8（JDK 18 起整个 JVM 默认编码也是 UTF-8）。读写历史遗留的 GBK 文件时显式指定，避免乱码：

```java
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

// 读 GBK 编码的老文件
String gbkText = java.nio.file.Files.readString(
    java.nio.file.Path.of("old.txt"), Charset.forName("GBK"));

// 写 UTF-8（显式写出意图）
java.nio.file.Files.writeString(
    java.nio.file.Path.of("new.txt"), "内容", StandardCharsets.UTF_8);
```

## 如果报这个错，看这里

**报错：`java.nio.file.NoSuchFileException: a.txt`**

原因：路径不存在或相对路径的工作目录和你以为的不一样。

对策：先用 `Files.exists(path)` 判断；相对路径是相对程序启动目录，不确定时用绝对路径或 `Paths.get("src", "main", "resources", "a.txt")`。

**报错：`FileSystemException: 另一个程序正在使用此文件，进程无法访问`（Windows）**

原因：文件被编辑器/Excel 占用。

对策：关闭占用程序；写入用 `StandardOpenOption.TRUNCATE_EXISTING` 配合重试，或先写临时文件再 `Files.move` 原子替换。

**报错：`java.nio.file.FileAlreadyExistsException`**

原因：`Files.copy`/`move`/`createFile` 遇到同名目标，默认不覆盖。

对策：加 `StandardOpenOption.REPLACE_EXISTING`（copy/move 均支持），或先判断再决定覆盖策略。

**现象：读回来全是乱码**

原因：文件实际编码与解码编码不一致（最常见是 GBK 文件被按 UTF-8 解）。

对策：显式传 `Charset` 参数；无法确定编码时，先看文件头几个字节（BOM）或与文件生产方确认，Java 无法"自动识别编码"。

**现象：大文件用 `readString` 后内存暴涨或 OOM**

原因：`readString`/`readAllLines` 把整个文件装进内存。

对策：超过几十 MB 改用 `Files.lines`（按行流式）或 028 的 `BufferedReader` 流式处理。

## 进阶配方：目录遍历与流式统计

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public class DirWalkDemo {
    public static void main(String[] args) throws IOException {
        Path dir = Path.of("src");

        // 递归列出目录下所有 .java 文件（惰性遍历，目录大也稳）
        try (Stream<Path> entries = Files.walk(dir)) {
            Map<String, Long> byExt = entries
                .filter(Files::isRegularFile)
                .collect(Collectors.groupingBy(
                    p -> extension(p.getFileName().toString()),
                    Collectors.counting()));
            System.out.println(byExt);
            // 预期输出（按实际目录内容）：{java=12, md=3}
        }
    }

    static String extension(String name) {
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "无扩展名" : name.substring(dot + 1);
    }
}
```

`Files.walk` 返回的流持有目录句柄，务必 try-with-resources；只要文件名列表不需要递归，用 `Files.list`（仅当前目录）即可。这类"walk + 过滤 + 收集"的写法比手写 `File` 递归少一半代码，也少一半出错机会。

## 记住

初学者记住三点：

> 1. 小文件：`Files.writeString` 写、`Files.readString` 读、`Files.readAllLines` 按行读。
> 2. 默认 UTF-8；非 UTF-8 文件显式传 `Charset`，别赌平台默认编码。
> 3. 方法都抛受检异常 `IOException`，先 `throws` 跑通再细化处理。

进阶者还需注意：

- `Files.lines` 是惰性流且持有文件句柄，务必 try-with-resources 或当场消费。
- 原子写模式：写临时文件 + `Files.move(..., ATOMIC_MOVE, REPLACE_EXISTING)`，避免读方读到写了一半的内容。
- 目录树遍历用 `Files.walk` / `Files.walkFileTree`；删除整个目录要自己递归，`Files.delete` 不删非空目录。
