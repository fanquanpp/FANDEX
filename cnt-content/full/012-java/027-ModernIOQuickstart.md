---
order: 270
title: 现代文件读写救急锦囊： Files.readString / writeString
module: 'java'
category: 后端技术
difficulty: beginner
description: Java 11+ 读写小文件一把梭：不用 FileReader/FileWriter 那套老写法。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'java/028-IOStreamFileOperation'
  - 'java/069-JavaPathFiles'
prerequisites:
  - 'java/018-ExceptionHandlingMechanism'
---

## 一句话定调

**读写小配置文件，用 `Files.readString()` / `Files.writeString()` 一把梭**，默认 UTF-8，自动关闭资源。

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

        // 追加一行：需要显式声明 APPEND
        Files.writeString(path, "追加行\n", StandardOpenOption.APPEND);

        // 按行读：小文件直接用 readAllLines
        for (String line : Files.readAllLines(path)) {
            System.out.println("行: " + line);
        }
    }
}
```

注意：方法签名带 `throws IOException`，要么在方法上声明，要么用 `try-catch`（结合 017 try-with-resources 与 016 异常处理）。

## 如果报这个错，看这里

**报错：`java.nio.file.NoSuchFileException: a.txt`**

原因：路径不存在或相对路径的工作目录和你以为的不一样。

对策：先用 `Files.exists(path)` 判断；相对路径是相对程序启动目录，不确定时用绝对路径或 `Paths.get("src", "main", "resources", "a.txt")`。

**报错：`FileSystemException: 另一个程序正在使用此文件，进程无法访问`（Windows）**

原因：文件被编辑器/Excel 占用。

对策：关闭占用程序；写入用 `StandardOpenOption.TRUNCATE_EXISTING` 配合重试，或先写临时文件再 `Files.move` 原子替换。

## 记住

> 小文件读写：`Files.writeString` 写、`Files.readString` 读、`Files.readAllLines` 按行读；异常先 `throws IOException` 再逐步细化。
