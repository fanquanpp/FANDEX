---
order: 380
title: Kotlin 与 IO
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: kotlinx-io与文件操作
author: fanquanpp
updated: '2026-10-11'
related:
  - 'kotlin/280-KotlinAtomicOperation'
  - 'kotlin/400-KotlinBenchmark'
  - 'kotlin/360-KotlinRegex'
  - 'kotlin/370-KotlinTime'
prerequisites:
  - 'kotlin/020-KotlinOverviewEnvSetup'
---

## 前置知识

- [Kotlin 与 Benchmark](/kotlin/400-KotlinBenchmark)：建议先完成前一篇的学习

## 学习目标

- 能按「字节 vs 字符」选对流：二进制用 InputStream/OutputStream，文本用 Reader/Writer 并显式给字符集
- 能用 `use` 解释资源关闭的语义：异常路径也保证 close，等价于 Java try-with-resources
- 能读写文件、遍历目录树（walk）、按 Path API（kotlin.io.path）操作元数据
- 能说出跨平台 IO 的现状：JVM 直接用 java.io，多平台用 kotlinx-io 的 Source/Sink 抽象


## 概述

IO（Input/Output）操作是程序与外部世界交互的方式，包括读写文件、网络通信、控制台输入输出等。Kotlin 运行在 JVM 上，可以直接使用 Java 的 IO 类，同时 Kotlin 也提供了一些扩展函数让 IO 操作更简洁。此外，kotlinx-io 是 Kotlin 官方的多平台 IO 库，提供了现代化的字节和字符处理 API。

本文主要介绍 Kotlin 中常用的文件操作和 IO 处理方式，涵盖从简单到复杂的场景。

## 基础概念

- **File**：Java 的 `java.io.File` 类，表示文件系统中的文件或目录
- **InputStream/OutputStream**：字节流，用于读写二进制数据
- **Reader/Writer**：字符流，用于读写文本数据
- **kotlinx-io**：Kotlin 多平台 IO 库，提供 Buffer、Source、Sink 等抽象
- **use 函数**：Kotlin 的扩展函数，自动关闭资源（类似 Java 的 try-with-resources）

## 快速上手

最简单的文件读写：

```kotlin
import java.io.File

fun main() {
    // 写入文本到文件
    File("output.txt").writeText("Hello, World!")

    // 读取文件全部内容
    val text = File("output.txt").readText()
    println(text)  // Hello, World!

    // 追加内容
    File("output.txt").appendText("\n第二行内容")

    // 按行读取
    val lines = File("output.txt").readLines()
    lines.forEach { println(it) }
}
```

## 详细用法

### 文件读取的多种方式

```kotlin
import java.io.File

fun fileReadDemo() {
    val file = File("data.txt")

    // 方式一：读取全部文本（适合小文件）
    val text = file.readText()
    println(text)

    // 方式二：读取全部字节（适合二进制文件）
    val bytes = file.readBytes()
    println("文件大小: ${bytes.size} 字节")

    // 方式三：按行读取（适合文本文件）
    val lines = file.readLines()
    lines.forEachIndexed { index, line ->
        println("第${index + 1}行: $line")
    }

    // 方式四：逐行处理（适合大文件，不会一次性加载到内存）
    file.forEachLine { line ->
        // 每次只加载一行到内存
        println(line)
    }

    // 方式五：使用 bufferedReader（需要更多控制时）
    file.bufferedReader().use { reader ->
        var line: String?
        while (reader.readLine().also { line = it } != null) {
            println(line)
        }
    }
}
```

### 文件写入的多种方式

```kotlin
import java.io.File

fun fileWriteDemo() {
    val file = File("output.txt")

    // 方式一：写入全部文本（覆盖已有内容）
    file.writeText("第一行\n")

    // 方式二：追加文本
    file.appendText("第二行\n")

    // 方式三：写入字节数组
    file.writeBytes(byteArrayOf(72, 101, 108, 108, 111))  // "Hello"

    // 方式四：使用 bufferedWriter（需要更多控制时）
    file.bufferedWriter().use { writer ->
        writer.write("第一行")
        writer.newLine()
        writer.write("第二行")
    }

    // 方式五：写入多行
    file.writeLines(listOf("行1", "行2", "行3"))
}

// 扩展函数：写入多行
fun File.writeLines(lines: List<String>) {
    bufferedWriter().use { writer ->
        lines.forEach { line ->
            writer.write(line)
            writer.newLine()
        }
    }
}
```

### 文件和目录操作

```kotlin
import java.io.File

fun fileOperationsDemo() {
    // 创建目录
    val dir = File("mydir")
    dir.mkdirs()  // 创建多级目录
    println("目录是否存在: ${dir.exists()}")

    // 创建文件
    val file = File("mydir/test.txt")
    file.createNewFile()

    // 检查文件属性
    println("是否存在: ${file.exists()}")
    println("是否是文件: ${file.isFile}")
    println("是否是目录: ${file.isDirectory}")
    println("文件大小: ${file.length()} 字节")
    println("绝对路径: ${file.absolutePath}")
    println("文件名: ${file.name}")
    println("扩展名: ${file.extension}")
    println("不含扩展名的名称: ${file.nameWithoutExtension}")

    // 重命名
    val renamed = File("mydir/renamed.txt")
    file.renameTo(renamed)

    // 删除文件
    renamed.delete()

    // 删除目录（必须为空）
    dir.delete()
}
```

### 目录遍历

```kotlin
import java.io.File

fun dirTraversalDemo() {
    val dir = File(".")

    // 方式一：列出直接子文件
    val files = dir.listFiles()
    files?.forEach { println(it.name) }

    // 方式二：按扩展名过滤
    val ktFiles = dir.listFiles { _, name -> name.endsWith(".kt") }
    ktFiles?.forEach { println(it.name) }

    // 方式三：深度遍历（递归所有子目录）
    dir.walkTopDown()
        .filter { it.isFile }
        .filter { it.extension == "kt" }
        .forEach { println(it.absolutePath) }

    // 方式四：自底向上遍历（删除目录时有用）
    dir.walkBottomUp()
        .filter { it.isDirectory }
        .forEach { println("目录: ${it.path}") }

    // 方式五：使用 walk 的序列版本（懒加载）
    val sequence = dir.walkTopDown()
    val largeFiles = sequence
        .filter { it.isFile }
        .filter { it.length() > 1024 * 1024 }  // 大于 1MB
        .toList()
    println("大文件数量: ${largeFiles.size}")
}
```

### 复制文件

```kotlin
import java.io.File

// 复制文件
fun copyFile(source: File, target: File) {
    source.inputStream().use { input ->
        target.outputStream().use { output ->
            input.copyTo(output)
        }
    }
}

// 复制文件（带缓冲区大小）
fun copyFileWithBuffer(source: File, target: File) {
    source.inputStream().buffered().use { input ->
        target.outputStream().buffered().use { output ->
            input.copyTo(output, bufferSize = 8192)
        }
    }
}

fun main() {
    val source = File("source.txt")
    val target = File("target.txt")
    copyFile(source, target)
    println("复制完成")
}
```

## 常见场景

### 读写 CSV 文件

```kotlin
import java.io.File

data class Person(val name: String, val age: Int, val city: String)

// 读取 CSV
fun readCsv(filePath: String): List<Person> {
    return File(filePath).readLines()
        .drop(1)  // 跳过标题行
        .map { line ->
            val parts = line.split(",")
            Person(parts[0], parts[1].toInt(), parts[2])
        }
}

// 写入 CSV
fun writeCsv(filePath: String, people: List<Person>) {
    File(filePath).bufferedWriter().use { writer ->
        writer.write("name,age,city")  // 标题行
        writer.newLine()
        people.forEach { person ->
            writer.write("${person.name},${person.age},${person.city}")
            writer.newLine()
        }
    }
}
```

### 读写 JSON 配置文件

```kotlin
import java.io.File
import kotlinx.serialization.*
import kotlinx.serialization.json.*

@Serializable
data class AppConfig(
    val host: String = "localhost",
    val port: Int = 8080,
    val debug: Boolean = false
)

// 读取配置
fun loadConfig(filePath: String): AppConfig {
    val file = File(filePath)
    return if (file.exists()) {
        val text = file.readText()
        Json.decodeFromString(text)
    } else {
        // 文件不存在时使用默认配置
        val default = AppConfig()
        saveConfig(filePath, default)
        default
    }
}

// 保存配置
fun saveConfig(filePath: String, config: AppConfig) {
    val json = Json { prettyPrint = true }
    File(filePath).writeText(json.encodeToString(config))
}
```

### 临时文件

```kotlin
import java.io.File

fun tempFileDemo() {
    // 创建临时文件
    val tempFile = File.createTempFile("prefix", ".tmp")
    tempFile.writeText("临时内容")
    println("临时文件路径: ${tempFile.absolutePath}")

    // 使用后删除
    tempFile.deleteOnExit()

    // 在指定目录下创建临时文件
    val tempDir = File(System.getProperty("java.io.tmpdir"))
    val customTemp = File.createTempFile("myapp", ".log", tempDir)
}
```

## 注意事项

- **使用 use 自动关闭资源**：所有 IO 资源（流、读写器等）都应该用 `use` 包裹，确保异常时也能关闭
- **大文件不要用 readText**：`readText()` 会将整个文件加载到内存，大文件应使用 `forEachLine` 或 `bufferedReader`
- **文件编码**：`readText()` 和 `writeText()` 默认使用 UTF-8，如需其他编码请使用 `readText(Charsets.GBK)` 等
- **路径分隔符**：不要硬编码路径分隔符，使用 `File.separator` 或直接用 `/`（Kotlin/Java 会自动处理）
- **文件操作不是原子性的**：重命名、删除等操作可能失败，需要检查返回值或处理异常

## 进阶用法

### kotlinx-io 多平台 IO

```kotlin
// build.gradle.kts
dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-io-core:0.4.0")
}

import kotlinx.io.*

fun kotlinxIoDemo() {
    // 创建 Buffer
    val buffer = Buffer()

    // 写入数据
    buffer.writeString("Hello")
    buffer.writeInt(42)
    buffer.writeDouble(3.14)

    // 读取数据（按写入顺序）
    val text = buffer.readString(5)  // "Hello"
    val number = buffer.readInt()    // 42
    val pi = buffer.readDouble()     // 3.14
}
```

### 监控文件变化

```kotlin
import java.nio.file.*
import java.nio.file.StandardWatchEventKinds.*

fun watchDirectory(dirPath: String) {
    val watchService = FileSystems.getDefault().newWatchService()
    val path = Paths.get(dirPath)

    // 注册监控事件
    path.register(watchService, ENTRY_CREATE, ENTRY_DELETE, ENTRY_MODIFY)

    println("开始监控目录: $dirPath")
    while (true) {
        val key = watchService.take()
        for (event in key.pollEvents()) {
            val fileName = event.context()
            when (event.kind()) {
                ENTRY_CREATE -> println("新建文件: $fileName")
                ENTRY_DELETE -> println("删除文件: $fileName")
                ENTRY_MODIFY -> println("修改文件: $fileName")
            }
        }
        if (!key.reset()) break
    }
}
```

### 对文件内容进行流式处理

```kotlin
import java.io.File

// 处理大日志文件，提取错误信息
fun extractErrors(logFilePath: String, outputPath: String) {
    val inputFile = File(logFilePath)
    val outputFile = File(outputPath)

    inputFile.bufferedReader().use { reader ->
        outputFile.bufferedWriter().use { writer ->
            reader.lineSequence()  // 懒加载，不会一次性读入内存
                .filter { it.contains("ERROR") }
                .forEach { writer.write(it + "\n") }
        }
    }
}
```
## 小练习（先自己做，再展开参考实现）

**练习 1：字符集的两个默认值**。同样读一个 UTF-8 文本文件，Java 的 `FileReader("a.txt")`（不显式传 Charset 时）与 Kotlin 的 `File("a.txt").readText()` 在默认字符集为 GBK 的 Windows 机器上行为有何不同？写出「需要非 UTF-8 编码时」的 Kotlin 读法。

参考答案：Java FileReader 不显式给字符集时用平台默认（Windows 常见 GBK），UTF-8 中文变乱码——这是 Java 的经典陷阱；Kotlin 的 `readText`/`writeText` 签名是 `charset: Charset = Charsets.UTF_8`，默认就是 UTF-8，恰恰规避了它。推论：走 Java 流式 API（InputStreamReader/OutputStreamWriter）必须显式传 `Charsets.UTF_8`；Kotlin 的 File 扩展只有在处理非 UTF-8 文件（如旧系统导出的 GBK）时才需要显式写 `readText(Charset.forName("GBK"))`。

**练习 2：use 的语义**。写出等价于下面代码的 Java try-with-resources 版本，并回答：use 闭包里 return 时资源还会关吗？

```kotlin
File("a.txt").inputStream().use { ins ->
    ins.readBytes()
}
```

参考答案：Java 版本为 `try (InputStream ins = new FileInputStream("a.txt")) { return ins.readAllBytes(); }`。闭包里正常 return、抛异常、最后表达式返回三种路径 use 都会在块结束后调用 `close()`（use 是 inline 函数，finally 语义编译期展开）。追问：`use` 关闭的是哪个对象？（答：接收者本身——它对 `Closeable` 定义，所以 Closeable.use{} 的接收者就是资源。）

**练习 3：目录树统计**。统计目录下所有 .kt 文件的总行数。要求不把文件内容全部读入内存，并说明大目录时按行流式读取的写法。

参考实现：

```kotlin
import java.io.File

fun totalLines(dir: File): Long =
    dir.walkTopDown()
        .filter { it.isFile && it.extension == "kt" }
        .sumOf { file -> file.useLines { it.count().toLong() } }
```

自检问题：`useLines` 与 `readLines()` 的内存差异在哪？（答：`readLines` 一次性物化整个文件成 List，大文件可能 OOM；`useLines` 返回 Sequence 逐行惰性读，读完自动关闭——行级流式是大文件处理的标准姿势。）
