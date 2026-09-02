---
order: 20
title: Java 概述与开发环境
module: 'java'
category: 后端技术
difficulty: beginner
description: Java 发展历史、平台体系与开发环境搭建。
author: fanquanpp
updated: '2026-08-05'
related:
  - 'java/003-QuickStart'
  - 'java/004-ProgramStructureBasicSyntax'
prerequisites: []
---

## 前置知识

- [Java 是什么：一次编写、到处运行的企业级语言](/java/001-WhatIsJava)：建议先完成前一篇的学习

## 学习目标

- 掌握「0.1 Java 入门核心 API 与工程动作」的核心机制、典型用法与常见陷阱
- 掌握「1. Java 概述 (Overview)」的核心机制、典型用法与常见陷阱
- 掌握「2. Java 开发工具 (The "Three Big" Concepts)」的核心机制、典型用法与常见陷阱
- 掌握「3. 环境搭建 (Environment Setup)」的核心机制、典型用法与常见陷阱
- 掌握「4. 开发工具 IDE」的核心机制、典型用法与常见陷阱


## 0.1 Java 入门核心 API 与工程动作

### 第一阶段必须掌握的类与方法

| 类 / 接口 | 常用成员 | 解决的问题 | 常见误区 |
| --- | --- | --- | --- |
| `String` | `length()`、`substring()`、`contains()`、`equals()` | 文本处理 | 用 `==` 比较字符串内容 |
| `StringBuilder` | `append()`、`toString()` | 高频拼接字符串 | 在循环中反复使用 `+` 拼接大量文本 |
| `List` | `add()`、`get()`、`size()`、`remove()` | 有序集合 | 删除元素时忽略索引变化 |
| `Map` | `put()`、`get()`、`containsKey()` | 键值映射 | 直接对可能为 `null` 的返回值调用方法 |
| `Optional` | `ofNullable()`、`map()`、`orElse()` | 表达可能为空 | 滥用 `get()` 重新制造空指针风险 |
| `Files` | `readString()`、`writeString()`、`exists()` | 文件读写 | 不处理字符集和异常 |

### 从源文件到运行的命令链

```bash
javac Hello.java
java Hello
jshell
jar --create --file app.jar -C out .
```

### 最小程序结构

```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, Java");
    }
}
```

学习时要同时理解：类名必须与文件名对应、`main` 是程序入口、`String[] args` 接收命令行参数、`System.out.println` 负责输出。

## 1. Java 概述 (Overview)

Java 是一种由 **Sun Microsystems** (后被 Oracle 收购) 于 1995 年发布的面向对象编程语言。其核心理念是 **"Write Once, Run Anywhere" (WORA)**，即一次编写，到处运行。Java 不仅是一种编程语言，更是一个完整的平台，包括运行环境、开发工具和丰富的类库。

### 1.1 发展历程

| 时间 | 事件                                        | 版本      |
| ---- | ------------------------------------------- | --------- |
| 1991 | Green 项目启动，旨在开发嵌入式设备编程语言  | -         |
| 1995 | Java 1.0 正式发布                           | 1.0       |
| 1998 | Java 2 发布，引入 J2SE、J2EE、J2ME          | 1.2       |
| 2004 | Java 5 发布，引入泛型、枚举、注解等特性     | 5.0       |
| 2006 | Java 开源，创建 OpenJDK                     | 6.0       |
| 2011 | Oracle 收购 Sun Microsystems                | 7.0       |
| 2014 | Java 8 发布，引入 Lambda 表达式、Stream API | 8.0 (LTS) |
| 2018 | Java 11 发布                                | 11 (LTS)  |
| 2021 | Java 17 发布                                | 17 (LTS)  |
| 2023 | Java 21 发布                                | 21 (LTS)  |
| 2025 | Java 25 发布                                | 25        |

### 1.2 核心特点 (Key Features)

| 特点             | 描述                                                                                              | 优势                                       |
| ---------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **跨平台性**     | 通过 JVM (Java Virtual Machine) 实现，Java 源代码编译成字节码 (`.class`)，由各平台的 JVM 解释执行 | 一次编写，到处运行，无需为不同平台重新编译 |
| **面向对象**     | 支持封装、继承、多态等特性，是纯粹的面向对象语言                                                  | 代码结构清晰，易于维护和扩展               |
| **强类型语言**   | 严格的编译时类型检查，所有变量必须先声明后使用                                                    | 提高代码可靠性，减少运行时错误             |
| **自动内存管理** | GC (Garbage Collection) 机制自动回收不再使用的对象内存                                            | 减少内存泄漏，简化内存管理                 |
| **安全性**       | 内置安全模型，如沙箱机制、字节码校验、访问控制                                                    | 提高应用安全性，防止恶意代码执行           |
| **多线程支持**   | 内置对多线程编程的支持，提供 Thread 类和相关 API                                                  | 充分利用多核处理器，提高应用性能           |
| **丰富的类库**   | 提供大量内置类库，覆盖网络、IO、集合、并发等多个领域                                              | 提高开发效率，减少重复代码                 |
| **分布式计算**   | 内置网络编程能力，支持分布式应用开发                                                              | 便于构建分布式系统和微服务                 |

## 2. Java 开发工具 (The "Three Big" Concepts)

### 2.1 JVM (Java Virtual Machine)

JVM 是运行 Java 字节码的虚拟机，是 Java 跨平台的核心。它将 Java 字节码翻译成特定平台的机器码并执行。
**JVM 的主要组成部分**：

- **类加载器 (ClassLoader)**: 负责加载类文件
- **运行时数据区 (Runtime Data Area)**: 包括方法区、堆、栈、程序计数器等
- **执行引擎 (Execution Engine)**: 执行字节码，包括解释器和 JIT 编译器
- **本地方法接口 (Native Interface)**: 与本地方法交互

### 2.2 JRE (Java Runtime Environment)

JRE 包含 JVM 和核心类库，是运行 Java 程序所需的最小环境。普通用户只需要安装 JRE 即可运行 Java 应用。

### 2.3 JDK (Java Development Kit)

JDK 包含 JRE 和开发工具，如编译器 (`javac`)、调试器 (`jdb`)、文档生成器 (`javadoc`) 等。开发人员必须安装 JDK 来编译和开发 Java 应用。
**JDK 主要工具**：

- `javac`: Java 编译器，将 `.java` 文件编译成 `.class` 文件
- `java`: Java 运行时，执行 `.class` 文件
- `javadoc`: 生成 API 文档
- `jar`: 打包工具，创建 JAR 文件
- `jdb`: Java 调试器
- `jps`: 查看 Java 进程
- `jstat`: 监控 JVM 统计信息
- `jmap`: 生成堆转储快照
- `jstack`: 生成线程转储

## 3. 环境搭建 (Environment Setup)

### 3.1 下载 JDK

推荐使用 OpenJDK 或 Oracle JDK，选择 LTS (Long Term Support) 版本以获得长期支持：

- **OpenJDK**: 开源版本，可从 [Adoptium](https://adoptium.net/) 或 [OpenJDK 官网](https://openjdk.org/) 下载
- **Oracle JDK**: 商业版本，可从 [Oracle 官网](https://www.oracle.com/java/technologies/downloads/) 下载

### 3.2 安装 JDK

#### 3.2.1 Windows 安装

1. 下载 JDK 安装包（.exe 文件）
2. 双击安装包，按照向导完成安装
3. 记住安装路径，用于配置环境变量

#### 3.2.2 macOS 安装

1. 下载 JDK 安装包（.dmg 文件）
2. 双击安装包，按照向导完成安装
3. 或使用 Homebrew 安装：`brew install openjdk@21`

#### 3.2.3 Linux 安装

1. 使用包管理器安装：

- Ubuntu/Debian: `sudo apt install openjdk-21-jdk`
- CentOS/RHEL: `sudo yum install java-11-openjdk-devel`
- Fedora: `sudo dnf install java-21-openjdk-devel`

2. 或下载 tar.gz 文件手动安装：

- 解压到指定目录：`tar -zxvf jdk-21_linux-x64_bin.tar.gz -C /usr/local/`
- 配置环境变量

### 3.3 配置环境变量

#### 3.3.1 Windows 配置

1. 右键点击「此电脑」→「属性」→「高级系统设置」→「环境变量」
2. 在「系统变量」中点击「新建」，设置 `JAVA_HOME`：

- 变量名：`JAVA_HOME`
- 变量值：JDK 安装目录，如 `C:\Program Files\Java\jdk-21`

3. 编辑 `Path` 变量，添加 `%JAVA_HOME%\bin`
4. 点击「确定」保存配置

#### 3.3.2 macOS/Linux 配置

编辑 `~/.bashrc` 或 `~/.zshrc` 文件，添加以下内容：

```bash
 # 设置 JAVA_HOME
 export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
 # 添加到 PATH
 export PATH=$JAVA_HOME/bin:$PATH
```

然后执行 `source ~/.bashrc` 或 `source ~/.zshrc` 使配置生效。

### 3.4 验证安装

打开命令行终端，执行以下命令验证 JDK 安装是否成功：

```bash
 # 查看 Java 版本
 java -version
 # 查看 javac 版本
 javac -version
```

**预期输出**：

```
 java version "21" 2023-09-19 LTS
 Java(TM) SE Runtime Environment (build 21+35-LTS-2513)
 Java HotSpot(TM) 64-Bit Server VM (build 21+35-LTS-2513, mixed mode, sharing)
 javac 21
```

## 4. 开发工具 IDE

### 4.1 主流 IDE

| IDE                    | 描述                         | 特点                                           |
| ---------------------- | ---------------------------- | ---------------------------------------------- |
| **IntelliJ IDEA**      | JetBrains 开发的 Java IDE    | 功能强大，智能代码提示，插件丰富，适合大型项目 |
| **Eclipse**            | 开源 Java IDE                | 插件生态丰富，适合企业级开发                   |
| **NetBeans**           | Oracle 开发的开源 IDE        | 轻量级，适合初学者，集成 Maven 和 Gradle       |
| **Visual Studio Code** | Microsoft 开发的轻量级编辑器 | 插件丰富，启动快速，适合小型项目               |

### 4.2 IDE 配置

#### 4.2.1 IntelliJ IDEA 配置

1. 下载并安装 [IntelliJ IDEA](https://www.jetbrains.com/idea/download/)
2. 打开 IDEA，选择「New Project」
3. 选择「Java」，配置 JDK 路径
4. 选择项目模板，点击「Create」

#### 4.2.2 Eclipse 配置

1. 下载并安装 [Eclipse](https://www.eclipse.org/downloads/)
2. 打开 Eclipse，选择「File」→「New」→「Java Project」
3. 输入项目名称，配置 JDK 路径
4. 点击「Finish」创建项目

## 5. 第一个 Java 程序

### 5.1 编写 HelloWorld.java

```java
 public class HelloWorld {
  public static void main(String[] args) {
  System.out.println("Hello, Java!");
  }
 }
```

### 5.2 编译和运行

```bash
 # 编译 Java 文件
 javac HelloWorld.java
 # 运行编译后的类
 java HelloWorld
```

**预期输出**：

```
 Hello, Java!
```

### 5.3 项目结构

对于大型项目，推荐使用 Maven 或 Gradle 管理项目依赖和构建：
**Maven 项目结构**：

```mermaid
flowchart TD
    T0["project/"]
    T1["pom.xml # Maven 配置文件"]
    T2["src/"]
    T3["main/"]
    T4["java/ # Java 源代码"]
    T5["resources/ # 资源文件"]
    T6["test/"]
    T7["java/ # 测试代码"]
    T8["resources/ # 测试资源"]
    T0 --> T1
    T0 --> T2
    T2 --> T3
    T0 --> T4
    T0 --> T5
    T5 --> T6
    T5 --> T7
    T5 --> T8
```

**Gradle 项目结构**：

```mermaid
flowchart TD
    T0["project/"]
    T1["build.gradle # Gradle 配置文件"]
    T2["src/"]
    T3["main/"]
    T4["java/ # Java 源代码"]
    T5["resources/ # 资源文件"]
    T6["test/"]
    T7["java/ # 测试代码"]
    T8["resources/ # 测试资源"]
    T0 --> T1
    T0 --> T2
    T2 --> T3
    T0 --> T4
    T0 --> T5
    T5 --> T6
    T5 --> T7
    T5 --> T8
```

## 6. 应用领域 (Applications)

### 6.1 企业级应用

- **Spring Boot**: 快速构建企业级应用的框架，简化配置，内嵌服务器
- **Spring Cloud**: 微服务架构的分布式系统框架
- **Java EE (Jakarta EE)**: 企业级应用规范，包括 Servlet、JSP、EJB 等
- **Quarkus**: 云原生 Java 框架，启动快，内存占用低

### 6.2 移动应用

- **Android 开发**: Java 是 Android 原生开发的主要语言
- **Kotlin**: 基于 JVM 的语言，与 Java 互操作，被 Google 推荐为 Android 开发首选语言

### 6.3 大数据

- **Hadoop**: 分布式存储和计算框架，核心组件用 Java 开发
- **Spark**: 快速的大数据处理引擎，支持 Java API
- **Flink**: 流处理框架，适合实时数据处理
- **Kafka**: 分布式消息队列，用 Java 开发

### 6.4 云计算

- **微服务架构**: 使用 Spring Cloud、Micronaut 等框架构建
- **容器化**: 与 Docker、Kubernetes 集成
- **Serverless**: 支持 AWS Lambda、Google Cloud Functions 等

### 6.5 其他领域

- **科学计算**: 用于数值计算、模拟等
- **金融系统**: 对精度和可靠性要求高的交易系统
- **游戏开发**: 后端服务器、游戏逻辑
- **嵌入式系统**: 物联网设备、智能设备

## 7. Java 版本选择

### 7.1 LTS 版本

LTS (Long Term Support) 版本提供长期支持，适合生产环境：

- **Java 8**: 2014 年发布，支持至 2030 年
- **Java 11**: 2018 年发布，支持至 2026 年
- **Java 17**: 2021 年发布，支持至 2029 年
- **Java 21**: 2023 年发布，支持至 2031 年

### 7.2 非 LTS 版本

非 LTS 版本每 6 个月发布一次，包含最新特性，适合测试和尝鲜：

- **Java 12-16**: 已停止支持
- **Java 18-20**: 已停止支持
- **Java 22-24**: 最新特性版本
- **Java 25**: 最新发布版本

## 8. 最佳实践

### 8.1 编码规范

- **命名规范**:
- 类名: PascalCase (如 `HelloWorld`)
- 方法名: camelCase (如 `getUser`)
- 变量名: camelCase (如 `userName`)
- 常量名: UPPER_SNAKE_CASE (如 `MAX_SIZE`)
- **代码风格**:
- 使用 4 个空格缩进
- 每行不超过 120 个字符
- 合理使用空行分隔代码块
- 添加适当的注释

### 8.2 性能优化

- **使用 StringBuilder 拼接字符串**
- **避免在循环中创建对象**
- **使用集合框架时选择合适的实现**
- **合理使用多线程**
- **优化内存使用，避免内存泄漏**

### 8.3 安全性

- **避免使用过时的 API**
- **使用参数化查询防止 SQL 注入**
- **加密敏感数据**
- **实现适当的访问控制**
- **定期更新依赖库**

### 8.4 工具使用

- **构建工具**: Maven 或 Gradle
- **版本控制**: Git
- **持续集成**: Jenkins、GitHub Actions
- **代码质量**: SonarQube、Checkstyle
- **测试框架**: JUnit、TestNG、Mockito

## 9. 常见问题与解决方案

### 9.1 环境变量配置错误

**问题**: 执行 `java -version` 时提示 "java 不是内部或外部命令"
**解决方案**:

- 检查 JAVA_HOME 是否正确设置
- 检查 Path 变量是否包含 %JAVA_HOME%\bin
- 重启命令行终端

### 9.2 版本冲突

**问题**: 系统中安装了多个 Java 版本，导致使用错误的版本
**解决方案**:

- 检查 JAVA_HOME 指向正确的版本
- 调整 Path 变量中 Java 路径的顺序
- 使用 `update-alternatives` (Linux) 管理多个 Java 版本

### 9.3 内存不足

**问题**: 运行 Java 程序时出现 "OutOfMemoryError"
**解决方案**:

- 增加 JVM 内存分配：`java -Xms512m -Xmx1024m MainClass`
- 检查代码中是否有内存泄漏
- 使用内存分析工具如 VisualVM 分析内存使用情况

### 9.4 依赖冲突

**问题**: Maven 或 Gradle 项目中出现依赖冲突
**解决方案**:

- 使用 `mvn dependency:tree` 或 `gradle dependencies` 查看依赖树
- 排除冲突的依赖
- 使用统一的依赖版本管理

### 10.2 书籍

- 《Java 核心技术》(Core Java)
- 《Effective Java》
- 《Java 并发编程实战》
- 《Spring Boot 实战》

### 10.3 在线教程

- [Oracle Java 教程](https://docs.oracle.com/javase/tutorial/)
- [Spring 官方教程](https://spring.io/guides)
- [Baeldung](https://www.baeldung.com/)
- [JavaPoint](https://www.javatpoint.com/)

## 11. 总结

Java 是一种功能强大、跨平台的面向对象编程语言，拥有丰富的生态系统和广泛的应用领域。从企业级应用到移动开发，从大数据到云计算，Java 都发挥着重要作用。
搭建 Java 开发环境是学习 Java 的第一步，选择合适的 JDK 版本和 IDE 可以提高开发效率。遵循编码规范和最佳实践，使用现代化的工具和框架，可以编写出高质量、可维护的 Java 代码。
随着 Java 的不断发展，新特性和新框架不断涌现，作为 Java 开发者，需要持续学习和适应变化，以保持竞争力。
