---
order: 20
tags:
  - 'java'
difficulty: 'beginner'
title: '快速入门'
module: 'java'
category: 'Java Basics'
description: '第一个 Java 程序、编译运行与基本概念。'
author: 'fanquanpp'
updated: 2026-05-03
---

## 目录

1. [引言](#引言)
2. [环境搭建](#环境搭建)
3. [Hello World 示例](#hello-world-示例)
4. [核心工作流](#核心工作流)
5. [延伸阅读](#延伸阅读)
6. [更新日志](#更新日志)

---

## 1. 引言

Java 是一种面向对象的编程语言，具有跨平台、分布式、多线程等特点。它是企业级应用开发的首选语言，广泛用于后端开发、安卓应用和大数据处理。

## 2. 环境搭建

### 2.1 JDK 安装

- 下载并安装 [OpenJDK](https://openjdk.org/) (推荐 JDK 17 或 21)。
- 配置环境变量: `JAVA_HOME`, `PATH`。
- 验证安装: `java -version`, `javac -version`。

### 2.2 IDE 配置

- **IntelliJ IDEA**: 最流行的 Java IDE。
- **Eclipse**: 经典的开源 IDE。
- **VS Code**: 安装 Java Extension Pack。

## 3. Hello World 示例

创建一个名为 `Hello.java` 的文件：

```java
 public class Hello {
  public static void main(String[] args) {
  System.out.println("Hello, Java!");
  }
 True}
```

**编译与运行**:

```bash
 javac Hello.java
 java Hello
```

## 4. 核心工作流

1. **编写**: 使用 `.java` 后缀。
2. **构建**: 使用 `Maven` 或 `Gradle` 管理项目。
3. **测试**: 使用 `JUnit` 编写单元测试。

## 5. 延伸阅读

- [toBeBetterJavaer (二哥的 Java 进阶之路)](https://github.com/itwanger/toBeBetterJavaer)
- [CS-Books (Java 部分)](https://github.com/forthespada/CS-Books)

## 6. 更新日志

- **2026-04-05**: 初始创建，涵盖环境搭建与 Hello World 示例。
