# Java 快速入门：从 Hello World 到工程化实践

## 前置知识

- [Java 概述与开发环境](/java/002-JavaOverviewDevEnv)：建议先完成前一篇的学习

## 学习目标

- 掌握「0. 零基础阅读指引（先读这一节）」的核心机制、典型用法与常见陷阱
- 掌握「1. 历史动机与发展脉络」的核心机制、典型用法与常见陷阱
- 掌握「2. 形式化定义（JLS & JVMS 规范）」的核心机制、典型用法与常见陷阱
- 掌握「3. 理论推导与原理解析」的核心机制、典型用法与常见陷阱
- 掌握「4. 代码示例（企业级 production-ready）」的核心机制、典型用法与常见陷阱


> 本文档对标 MIT 6.031 (Software Construction)、Stanford CS106A (Programming Methodology) 与 CMU 15-214 (Software Engineering) 教学水准，覆盖从环境搭建、第一个程序到企业级工程化工作流的完整路径。文档采用 Bloom 教育目标分类法组织学习目标，结合 JLS (Java Language Specification) 与 JVMS (Java Virtual Machine Specification) 双规范视角，兼顾原理深度与工程可用性。

---

## 0. 零基础阅读指引（先读这一节）

本篇是"快速入门"，但为了保持体系完整，文中同时包含 JVM 字节码、JIT、GraalVM、CI 等进阶内容。**零基础第一遍只读四件事**：

**新手防火墙：本篇只看 `javac` / `java` 命令与 Hello World 的代码块；JIT 阈值公式、GraalVM、CI/CD 属于 JVM 进阶，第一遍直接跳过。**

1. 第 4 节中 Hello World 的编写、编译与运行（`javac` / `java` 两条命令）；
2. 第 4 节中"运行"之前的最小代码示例，跳过模块与自定义 JRE；
3. 第 7 节中 Maven/Gradle 的"最小可用"命令：创建项目、编译、运行；
4. 其余小节（字节码、JIT、GraalVM、Docker、CI、案例研究）一律跳过，等学完 006 运算符、007 控制流、013 面向对象之后再回读。

> 记住：本篇的目标是"看到 Hello World 运行"，不是"看懂全部内容"。看不懂的段落直接跳过，不影响后续学习。

---

## 1. 历史动机与发展脉络

Java 的演化是一部面向**写时正确性**与**运行时可移植性**双重目标的语言工程史。理解其历史脉络有助于把握现代 Java 设计决策的内在逻辑。

### 1.1 起源：Green Project 与 Oak（1991—1995）

Java 起源于 Sun Microsystems 的 Green Project，最初代号 Oak，设计目标是消费电子（机顶盒、PDA）的嵌入式语言。Oak 团队由 James Gosling、Mike Sheridan 与 Patrick Naughton 领导，其核心设计哲学源于 C++ 在嵌入式场景中的几个痛点：

- **指针运算**导致内存安全漏洞；
- **手动内存管理**引发悬垂指针与内存泄漏；
- **平台 ABI 差异**使一次编写多平台运行成本高昂。

1995 年 Oak 因商标冲突更名为 Java（取自印尼爪哇咖啡，象征"程序员之燃料"），正式发布于 SunWorld 95 大会。设计者提出了著名的"白皮书十项特征"：

1. Simple（简单）
2. Object-Oriented（面向对象）
3. Distributed（分布式）
4. Robust（健壮）
5. Secure（安全）
6. Architecture-Neutral（架构中立）
7. Portable（可移植）
8. High-Performance（高性能）
9. Multithreaded（多线程）
10. Dynamic（动态）

### 1.2 Java 1.0 → 1.4：奠基期（1996—2002）

| 版本 | 发布年份 | 里程碑特性 |
| --- | --- | --- |
| Java 1.0 | 1996 | 首个正式版本，Applet、AWT |
| Java 1.1 | 1997 | 内部类、JDBC、反射 API |
| J2SE 1.2 | 1998 | Swing、Collections Framework、JIT 引入 |
| J2SE 1.3 | 2000 | HotSpot JVM（默认 JIT） |
| J2SE 1.4 | 2002 | NIO、assert、正则表达式 |

### 1.3 Java 5：现代 Java 的起点（2004）

Java 5（J2SE 5.0，内部号 1.5）引入了 JSR 201 与 JSR 175 等多项改变语言形态的特性：

- 泛型（Generics，类型擦除式实现）；
- 注解（Annotations）；
- 枚举（Enum）；
- 增强 for 循环；
- 自动装箱 / 拆箱；
- 变长参数；
- `java.util.concurrent` 并发包。

### 1.4 Java 8：函数式革命（2014）

Java 8 是继 Java 5 之后最重要的版本，引入：

- Lambda 表达式与函数式接口；
- Stream API；
- `Optional`；
- 默认方法与静态方法在接口中；
- 新 Date/Time API（`java.time`）；
- `CompletableFuture` 异步编排；
- Nashorn JavaScript 引擎。

### 1.5 Java 9—16：模块化与现代语法糖（2017—2021）

| 版本 | 关键特性 |
| --- | --- |
| Java 9 | JPMS 模块系统、JShell、JLink、JIGSAW |
| Java 10 | `var` 局部变量类型推断、G1 并行 Full GC |
| Java 11 | HTTP Client、单文件源码程序、LTS |
| Java 14 | Switch 表达式正式、Pattern Matching 预览 |
| Java 15 | Sealed Class 预览、Text Block 正式 |
| Java 16 | Record 正式、Pattern Matching for instanceof |

### 1.6 Java 17 LTS：现代 Java 基线（2021）

Java 17 是当前企业最广泛采用的 LTS 之一，特性：

- Sealed Class 正式；
- Pattern Matching for instanceof 正式；
- 强封装 JDK 内部 API；
- 移除 RMI Activation、Security Manager 弃用。

### 1.7 Java 21 LTS：虚拟线程时代（2023）

Java 21 引入了**虚拟线程**（Project Loom, JEP 444），重新定义了 Java 并发模型：

- Virtual Thread 正式发布；
- Pattern Matching for switch 正式；
- Record Patterns 正式；
- Sequenced Collections；
- String Templates 预览（Java 21 预览，Java 23 移除重做）。

### 1.8 Java 25 LTS：新一代 LTS 基线（2025）

Java 25 作为 2025 年 9 月发布的 LTS 版本，引入：

- 模块导入声明（Module Import Declarations, JEP 511）；
- AOT 静态编译（Ahead-of-Time Compilation, JEP 484）正式；
- ZGC 默认分代模式（Generational ZGC by Default, JEP 490）；
- 桶形作用域值（Scoped Values, JEP 506）正式；
- 模式匹配中基本类型支持（Primitive Patterns, JEP 455 预览 → 转正）。

### 1.9 LTS 时间轴可视化

```
1996 ── 2004 ── 2014 ────────────────────────────────────►
  1.0    5      8 (LTS)
                         2018   2021   2023   2025
                          11     17     21     25
                          LTS    LTS    LTS    LTS
```

**讲解：**

1. 这是 Java 版本演进时间线：1996 JDK 1.0、2004 JDK 5、2014 Java 8。
2. Java 8 之后改为半年一版，LTS 版本（17/21/25）才是企业主线。
3. 零基础只需记住：新项目用 LTS，语法以 17+ 为基线。


### 1.10 设计哲学的演进曲线

Java 的设计哲学可概括为"**保守演化 + 兼容性优先**"，这导致：

- **优点**：JDK 8 编写的字节码在 JDK 21 上仍可运行（向后兼容承诺）；
- **代价**：泛型采用类型擦除而非 reified generics；
- **代价**：原始类型与对象类型的二元分裂（Project Valhalla 的 Value Types 旨在解决此问题，至今仍在孵化）。

---

## 2. 形式化定义（JLS & JVMS 规范）

### 2.1 Java 程序的形式化定义

依据 JLS §3.1，一个 Java 程序由**编译单元**（Compilation Unit）组成，编译单元的文法可形式化定义为：

$$
\begin{aligned}
\text{CompilationUnit} &::= \text{PackageDeclaration?}\ \text{ImportDeclaration*}\ \text{TypeDeclaration*} \\
\text{PackageDeclaration} &::= \text{package}\ \text{Identifier}(\text{.Identifier})*\ \text{;} \\
\text{TypeDeclaration} &::= \text{ClassDeclaration} \mid \text{InterfaceDeclaration} \mid \text{EnumDeclaration} \mid \text{RecordDeclaration} \mid \text{AnnotationDeclaration} \mid \text{;}
\end{aligned}
$$

### 2.2 字节码与 class 文件格式

依据 JVMS §4，class 文件以 8 位字节流形式存储，结构形式化如下：

$$
\text{ClassFile} = \{ \text{magic}, \text{minor\_version}, \text{major\_version}, \text{constant\_pool}, \text{access\_flags}, \text{this\_class}, \text{super\_class}, \text{interfaces}, \text{fields}, \text{methods}, \text{attributes} \}
$$

其中：

- $\text{magic} = \text{0xCAFEBABE}$（4 字节，用于识别 class 文件）；
- $\text{major\_version}$ 决定字节码兼容性，例如 JDK 21 对应 65（0x41），JDK 17 对应 61（0x3D）；
- $\text{constant\_pool}$ 是符号表，存储类名、方法名、字段名、字符串字面量等。

### 2.3 main 方法签名约定

JLS §12.1 规定 JVM 启动入口的规范签名：

$$
\text{main} : \text{String}[] \to \text{void}, \quad \text{signature} = (\lbrack Ljava/lang/String\rbrack)V
$$

其中：
- `public`：使其可被 JVM 跨类加载器调用；
- `static`：无需实例化即可启动；
- `void`：返回值不传递给操作系统，需用 `System.exit(int)` 设置退出码。

### 2.4 类型系统的范畴论视角

Java 类型系统可分为四层（JLS §4）：

1. **原始类型**（Primitive Types）：`byte`、`short`、`int`、`long`、`char`、`float`、`double`、`boolean`；
2. **引用类型**（Reference Types）：类、接口、数组、类型变量；
3. **空类型**（Null Type）：`null` 字面量的类型，可赋值给任何引用类型；
4. **Union Type（不可写但可推断）**：如 `catch (IOException | SQLException e)` 中的多异常捕获。

形式化地，子类型关系记为 $\sqsubseteq$， widening primitive conversion 满足：

$$
\text{byte} \sqsubseteq \text{short} \sqsubseteq \text{int} \sqsubseteq \text{long} \sqsubseteq \text{float} \sqsubseteq \text{double}
$$

注意 $\text{char}$ 与 $\text{int}$ 之间存在双向拓宽转换（JLS §5.1.2）。

---

## 3. 理论推导与原理解析

### 3.1 编译期与运行期的边界

Java 是**半编译半解释**语言。其执行流程可拆解为：

$$
\underbrace{\text{.java}}_{\text{source}} \xrightarrow{\text{javac}} \underbrace{\text{.class}}_{\text{bytecode}} \xrightarrow{\text{ClassLoader}} \underbrace{\text{Runtime Constant Pool}}_{\text{memory}} \xrightarrow{\text{Interpreter + JIT}} \underbrace{\text{native code}}_{\text{execution}}
$$

#### 3.1.1 `javac` 的语义阶段

`javac` 实质上是 JDK 自带的注解处理器宿主，编译流程大致经过：

1. **词法分析**（Lexical Analysis）：源代码 → Token 流；
2. **语法分析**（Syntax Analysis）：Token 流 → AST（com.sun.source.tree.*）；
3. **符号填充**（Enter）：将 AST 中声明的符号填入符号表；
4. **注解处理**（Annotation Processing）：调用注册的 Processor，可能生成新源码并重新触发 1—4；
5. **语义分析**（Attribution / Flow）：类型检查、流量分析（definite assignment、unreachable statement）；
6. **脱糖**（Desugaring）：Lambda → invokedynamic、泛型擦除、增强 for → Iterator；
7. **代码生成**（Code Generation）：AST → 字节码 → class 文件。

#### 3.1.2 类加载与字节码验证

JVM 加载 class 时执行以下阶段（JVMS §5.4）：

1. **加载**（Loading）：通过类加载器读取字节流；
2. **链接**（Linking）：
   - **验证**（Verification）：检查字节码合法性（StackMapFrame 校验）；
   - **准备**（Preparation）：为静态字段分配内存并赋零值；
   - **解析**（Resolution）：将常量池符号引用转为直接引用（懒解析）；
3. **初始化**（Initialization）：执行 `<clinit>` 方法。

### 3.2 HotSpot JIT 编译原理

HotSpot JVM 包含两个 JIT 编译器：

- **C1（Client Compiler）**：快速编译，侧重方法内联与简单优化；
- **C2（Server Compiler）**：基于 Sea-of-Nodes IR，进行逃逸分析、循环展开、向量化等激进优化。

**编译触发阈值**（默认 `-XX:+TieredCompilation`，分层编译）：

$$
T_{\text{C1}} \approx 2000, \quad T_{\text{C2}} \approx 10000 \quad (\text{method invocation count})
$$

#### 3.2.1 解释 + JIT 的混合模型

混合模式（Mixed Mode，默认）的执行开销形式化为：

$$
T_{\text{exec}}(n) = \underbrace{n_{\text{interp}} \cdot t_{\text{interp}}}_{\text{interpreted}} + \underbrace{n_{\text{jit}} \cdot t_{\text{jit}}}_{\text{compiled}} + \underbrace{C_{\text{compile}}}_{\text{JIT cost}}
$$

当 $n$ 足够大时，JIT 编译成本 $C_{\text{compile}}$ 被分摊，故 $T_{\text{exec}}(n) / n \to t_{\text{jit}}$。

### 3.3 启动时间模型

Java 程序启动时间 $T_{\text{startup}}$ 可分解为：

$$
T_{\text{startup}} = T_{\text{JVM init}} + T_{\text{class load}} + T_{\text{JIT warmup}} + T_{\text{user code}}
$$

GraalVM Native Image 通过 AOT 编译消除前两项，将启动时间从 $\sim 500$ ms 降至 $\sim 50$ ms。

### 3.4 字节码指令示例分析

考虑如下 Hello World：

```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}
```

**讲解：**

1. `public class Hello` 定义类，类名必须与文件名一致（Hello.java）。
2. `public static void main(String[] args)` 是程序入口：JVM 从这里开始执行。
3. `System.out.println` 输出一行文本，分号结束每条语句。


经 `javac Hello.java` 后执行 `javap -c -v Hello` 输出（节选）：

```
public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: (0x0009) ACC_PUBLIC, ACC_STATIC
    Code:
      stack=2, locals=2, args_size=1
         0: getstatic     #2   // Field java/lang/System.out:Ljava/io/PrintStream;
         3: ldc           #3   // String Hello, Java!
         5: invokevirtual #4   // Method java/io/PrintStream.println:(Ljava/lang/String;)V
         8: return
```

**讲解：**

1. 这是 main 方法的签名说明：`public` 公开、`static` 静态、`void` 无返回值。
2. `String[] args` 接收命令行参数。
3. 参数名 args 可以改，但签名结构不能变。


指令序列解读：

| Offset | 指令 | 含义 |
| --- | --- | --- |
| 0 | `getstatic #2` | 获取静态字段 `System.out` |
| 3 | `ldc #3` | 加载字符串常量 `"Hello, Java!"` |
| 5 | `invokevirtual #4` | 调用实例方法 `PrintStream.println(String)` |
| 8 | `return` | 方法返回 |

栈深度 `stack=2`：执行 `invokevirtual` 时操作数栈顶为 `[PrintStream, String]`，正好匹配 `println(String)` 的接收者与参数。

---

## 4. 代码示例（企业级 production-ready）

### 4.1 最小可运行 Hello World

```java
// Java 21+，文件名: Hello.java
public class Hello {
    public static void main(String[] args) {
        if (args.length == 0) {
            System.out.println("Hello, World!");
        } else {
            System.out.println("Hello, " + args[0] + "!");
        }
    }
}
```

**讲解：**

1. Java 21 起支持“无 main 类”的简化启动：文件顶层直接写语句。
2. `System.out.println` 在类外也能执行，适合教学片段。
3. 正式项目仍使用标准 main 方法。


编译与运行：

```bash
javac Hello.java            # 生成 Hello.class
java Hello                  # 输出: Hello, World!
java Hello Java             # 输出: Hello, Java!
```

**讲解：**

1. `javac` 是编译器：把 .java 编译成字节码 .class。
2. `java Hello` 运行编译产物（不带 .class 后缀）。
3. 两步流程是 Java 的传统运行方式。


### 4.2 单文件源码程序（Java 11+）

Java 11 起，单文件源码程序可直接执行，跳过显式编译步骤：

```java
// 文件: QuickDemo.java（无需显式 javac）
public class QuickDemo {
    public static void main(String[] args) {
        record Point(int x, int y) {
            double distance() { return Math.hypot(x, y); }
        }
        var p = new Point(3, 4);
        System.out.printf("Point %s, distance = %.2f%n", p, p.distance());
    }
}
```

**讲解：**

1. `java QuickDemo.java` 直接运行源文件（Java 11+ 单文件启动）。
2. 省去 javac 步骤，适合学习与小工具。
3. 生产项目仍用 javac/构建工具编译。


```bash
java QuickDemo.java         # 直接运行源文件
```

**讲解：**

1. `jshell` 是交互式 REPL：输入表达式回车立即看到结果。
2. 适合试验语法、快速验证 API。
3. 输入 `/exit` 退出。


### 4.3 JShell REPL 原型验证

```text
$ jshell
|  Welcome to JShell -- Version 21
|  For an introduction type: /help intro

jshell> var name = "Java"
name ==> "Java"

jshell> record Point(int x, int y) {}
|  created record Point

jshell> var p = new Point(3, 4)
p ==> Point[x=3, y=4]

jshell> Math.hypot(p.x(), p.y())
$3 ==> 5.0

jshell> /save PointDemo.java     # 将会话保存为源文件
jshell> /exit
```

**讲解：**

1. 这是 Maven 的 pom.xml：Java 项目的构建说明书。
2. `dependencies` 声明依赖，Maven 自动下载管理。
3. `mvn compile` 编译、`mvn test` 测试、`mvn package` 打包。


### 4.4 Maven 工程骨架

#### 4.4.1 `pom.xml` 完整配置

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.example</groupId>
    <artifactId>hello-java</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>jar</packaging>

    <properties>
        <maven.compiler.release>21</maven.compiler.release>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <junit.version>5.10.2</junit.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>${junit.version}</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.13.0</version>
                <configuration>
                    <release>${maven.compiler.release}</release>
                    <compilerArgs>
                        <arg>-Xlint:all</arg>
                        <arg>-parameters</arg>
                    </compilerArgs>
                </configuration>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.2.5</version>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-shade-plugin</artifactId>
                <version>3.5.2</version>
                <executions>
                    <execution>
                        <phase>package</phase>
                        <goals><goal>shade</goal></goals>
                        <configuration>
                            <transformers>
                                <transformer implementation="org.apache.maven.plugins.shade.resource.ManifestResourceTransformer">
                                    <mainClass>com.example.HelloApp</mainClass>
                                </transformer>
                            </transformers>
                        </configuration>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

**讲解：**

1. Maven/Gradle 的约定目录：main 放生产代码，test 放测试代码。
2. 包路径 com.example 对应目录层级。
3. 遵守目录约定，构建工具才能自动找到源码。


#### 4.4.2 主类与单元测试

```java
// src/main/java/com/example/HelloApp.java
package com.example;

public class HelloApp {
    public static void main(String[] args) {
        var message = greet(args.length > 0 ? args[0] : "World");
        System.out.println(message);
    }

    public static String greet(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name must not be null or blank");
        }
        return "Hello, " + name + "!";
    }
}
```

**讲解：**

1. 测试代码与生产代码分目录，但包名一致。
2. JUnit 5 用 @Test 标注测试方法。
3. 测试是 Java 工程的基本要求。


```java
// src/test/java/com/example/HelloAppTest.java
package com.example;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class HelloAppTest {

    @Test
    void greet_withValidName_returnsGreeting() {
        assertEquals("Hello, Java!", HelloApp.greet("Java"));
    }

    @Test
    void greet_withBlank_throwsIllegalArgument() {
        assertThrows(IllegalArgumentException.class, () -> HelloApp.greet("   "));
    }

    @Test
    void greet_withNull_throwsNPEMessage() {
        var ex = assertThrows(IllegalArgumentException.class, () -> HelloApp.greet(null));
        assertTrue(ex.getMessage().contains("must not be null"));
    }
}
```

**讲解：**

1. Gradle 是另一个主流构建工具，Kotlin DSL 是推荐写法。
2. `dependencies { testImplementation(...) }` 声明依赖。
3. Maven 与 Gradle 二选一即可，新项目 Gradle 更流行。


### 4.5 Gradle（Kotlin DSL）等价配置

```kotlin
// build.gradle.kts
plugins {
    application
    java
}

group = "com.example"
version = "1.0.0-SNAPSHOT"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

application {
    mainClass.set("com.example.HelloApp")
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation(platform("org.junit:junit-bom:5.10.2"))
    testImplementation("org.junit.jupiter:junit-jupiter")
}

tasks.test {
    useJUnitPlatform()
    testLogging {
        events("passed", "skipped", "failed")
    }
}

tasks.withType<JavaCompile> {
    options.compilerArgs.addAll(listOf("-Xlint:all", "-parameters"))
}
```

**讲解：**

1. `jdeps --list-deps` 分析字节码依赖的 JDK 模块。
2. 用于裁剪 JRE 镜像（jlink）。
3. 模块系统是 Java 9+ 的进阶主题。


### 4.6 `jlink` 制作自定义运行时镜像

```bash
# 列出可解析的模块
jdeps --list-deps target/hello-java-1.0.0-SNAPSHOT.jar

# 生成自定义 JRE
jlink \
  --module-path "$JAVA_HOME/jmods" \
  --add-modules java.base,java.logging \
  --strip-debug --no-man-pages --no-header-files \
  --compress=2 \
  --output build/myjre

# 运行
./build/myjre/bin/java -jar target/hello-java-1.0.0-SNAPSHOT.jar
```

**讲解：**

1. GraalVM 能把 Java 应用编译成原生可执行文件。
2. 启动快、内存低，适合 Serverless。
3. `native-image` 编译需要额外配置反射等元数据。


### 4.7 GraalVM Native Image（可选）

```bash
# 安装 GraalVM（C:\Atian\GraalVM）
native-image \
  --class-path target/hello-java-1.0.0-SNAPSHOT.jar \
  --no-fallback \
  --initialize-at-build-time=com.example \
  -H:Name=hello-native \
  com.example.HelloApp

./hello-native   # 启动时间约 30 ms
```

**讲解：**

1. GitHub Actions 的 CI 流水线：push 后自动执行。
2. setup-java 配置 JDK 版本，cache 缓存依赖加速。
3. `mvn verify` 完成编译+测试+打包，失败即拦截合并。


### 4.8 GitHub Actions CI 模板

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        java: [21, 25]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: ${{ matrix.java }}
          cache: maven
      - name: Build
        run: mvn -B -ntp clean verify
      - name: Upload coverage
        if: matrix.java == 21
        uses: codecov/codecov-action@v4
```

**讲解：**

1. 反例：类名与文件名不一致会编译失败。
2. 反例：方法名/变量名拼写不一致是新手高频错误。
3. 反例：main 方法签名写错（如漏 static）无法运行。


---

## 5. 对比分析

### 5.1 与 Kotlin / Scala / C# / Go 对比

| 维度 | Java 21 | Kotlin 2.0 | Scala 3 | C# 12 | Go 1.22 |
| --- | --- | --- | --- | --- | --- |
| 主范式 | OOP + 函数式 | OOP + 函数式 | OOP + 函数式 | OOP + 函数式 | 过程式 + 接口 |
| 平台 | JVM | JVM | JVM | .NET CLR | 自带 runtime |
| 类型推断 | `var`（局部） | 完整推断 | 完整推断 | 完整推断 | 完整推断 |
| Null 安全 | `Optional` + 注解 | 内置 nullable 类型 | 内置 Option | nullable 引用类型 | 无 null（指针） |
| 模式匹配 | switch（21 正式） | 完整 | 完整 | 完整 | 无 |
| 协程 / 轻量线程 | Virtual Thread（21） | 协程 | 协程 | async/await | goroutine |
| Value Type | Project Valhalla 孵化 | 内联类 | 已有 | struct | struct |
| 部署大小 | 50MB+（JRE） | 50MB+ | 50MB+ | 50MB+ | 5-15MB |

### 5.2 JVM 与其他运行时对比

| 运行时 | 启动时间 | 峰值吞吐 | 内存占用 | AOT 支持 |
| --- | --- | --- | --- | --- |
| HotSpot JVM（C2） | ~500ms | 高 | 中-高 | 否（GraalVM 补足） |
| OpenJ9 | ~200ms | 中-高 | 低 | 部分 |
| GraalVM Native Image | ~30ms | 中 | 极低 | 是 |
| .NET CoreCLR | ~100ms | 高 | 中 | 部分（AOT） |
| Go runtime | ~5ms | 高 | 低 | 是 |

### 5.3 构建工具对比

| 工具 | 配置文件 | 优势 | 劣势 |
| --- | --- | --- | --- |
| Maven | `pom.xml` | 强约束、依赖管理稳 | XML 冗长、自定义逻辑困难 |
| Gradle (Kotlin) | `build.gradle.kts` | 灵活、增量构建快 | 学习曲线陡、版本迁移易出错 |
| Bazel | `BUILD` | 多语言、可重现 | 配置复杂、生态小 |
| Ant + Ivy | `build.xml` | 灵活 | 已被时代淘汰 |

---

## 6. 常见陷阱与最佳实践

### 6.1 NPE 与 Null 处理

#### 6.1.1 陷阱：返回 null 而非 Optional

```java
// 反例
public User findUser(String id) {
    return repository.get(id);  // 可能返回 null，调用方易踩坑
}

// 正例（Java 8+）
public Optional<User> findUser(String id) {
    return Optional.ofNullable(repository.get(id));
}
```

**讲解：**

1. JSpecify 提供 @NonNull/@Nullable 注解，表达空值契约。
2. 配合静态检查工具在编译期发现空指针风险。
3. 空指针是 Java 第一事故源，注解化是官方方向。


#### 6.1.2 使用 `@NonNull` 注解

```java
import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;

public @NonNull User createUser(@NonNull String name, @Nullable String email) {
    Objects.requireNonNull(name, "name must not be null");
    return new User(name, email);
}
```

**讲解：**

1. 反例：依赖系统默认字符集读写文件，换平台就乱码。
2. 正解：显式指定 `StandardCharsets.UTF_8`。
3. 编码问题要在一开始就固定。


### 6.2 字符串编码陷阱

```java
// 反例：跨平台默认字符集不同
byte[] bytes = "Java".getBytes();   // 在 Windows 上使用 MS936，Linux 上使用 UTF-8

// 正例：显式指定字符集
byte[] bytes = "Java".getBytes(StandardCharsets.UTF_8);
```

**讲解：**

1. 反例：直接捕获 Exception 吞掉错误，问题被隐藏。
2. 正解：精确捕获具体异常并记录日志或抛出。
3. 空 catch 是代码评审重点打击对象。


Java 18 起（JEP 400），默认字符集统一为 UTF-8，但显式声明仍是推荐做法。

### 6.3 资源未关闭导致内存泄漏

```java
// 反例
BufferedReader reader = new BufferedReader(new FileReader("data.txt"));
String line = reader.readLine();   // 若此处抛异常，reader 不会关闭

// 正例（Java 7+ try-with-resources）
try (BufferedReader reader = new BufferedReader(
        new FileReader("data.txt", StandardCharsets.UTF_8))) {
    String line = reader.readLine();
} catch (IOException e) {
    log.error("读取失败", e);
}
```

**讲解：**

1. 反例：用魔法数字或裸字符串表达业务含义。
2. 正解：枚举（enum）或常量类表达。
3. 类型不明显让代码难以维护。


### 6.4 误用 `var` 导致可读性下降

```java
// 反例：类型不明显
var result = process(data);   // result 是什么类型？

// 正例：显式声明或加注释
Map<String, List<User>> grouped = groupByCity(users);
```

**讲解：**

1. 反例：用 == 比较字符串内容——== 比较引用。
2. 正解：`str.equals(other)` 或 Objects.equals。
3. 这是 Java 新手错误 Top 1。


### 6.5 阻塞主线程的 I/O

```java
// 反例
public static void main(String[] args) throws Exception {
    var future = CompletableFuture.supplyAsync(() -> fetch());
    var data = future.get();   // 阻塞主线程
}

// 正例：使用 join + timeout
var data = future.orTimeout(2, TimeUnit.SECONDS).join();
```

**讲解：**

1. 标准 main 方法再次复习：public static void main(String[] args)。
2. `args.length` 获得参数个数。
3. 用增强 for 遍历 args。


### 6.6 误用 System.exit

`System.exit(int)` 会跳过 shutdown hook，应仅在异常退出时使用：

```java
public static void main(String[] args) {
    Runtime.getRuntime().addShutdownHook(new Thread(() -> {
        System.out.println("Cleaning up resources...");
    }));

    if (args.length == 0) {
        System.err.println("Usage: app <name>");
        System.exit(1);   // 触发 shutdown hook
    }
}
```

**讲解：**

1. 反例：用裸 `new Thread` 管理并发，难以控制生命周期。
2. 正解：线程池 ExecutorService。
3. 并发入门从线程池开始。


### 6.7 误用 `printStackTrace`

```java
// 反例
} catch (Exception e) {
    e.printStackTrace();   // 输出到 stderr，不进入日志系统
}

// 正例
} catch (Exception e) {
    log.error("处理失败", e);
}
```

**讲解：**

1. `mvn package` 打包，产物在 target/。
2. `java -jar` 运行可执行 jar。
3. 需要 Spring Boot 插件配置 mainClass 才能直接 -jar 运行。


### 6.8 工具选择决策表

| 场景 | 推荐工具 |
| --- | --- |
| 原型验证 | `jshell` |
| 一次性脚本 | 单文件源码程序（Java 11+） |
| 小项目 | Maven |
| 大型多模块项目 | Gradle |
| 容器化部署 | `jlink` 自定义镜像 |
| Serverless / 冷启动敏感 | GraalVM Native Image |
| 性能基准测试 | JMH |

---

## 7. 工程实践（构建、JVM 调优、性能、调试）

### 7.1 构建命令速查

```bash
# Maven
mvn clean compile                # 编译
mvn test                         # 测试
mvn package                      # 打包
mvn install                      # 安装到本地仓库
mvn deploy                       # 部署到远程仓库
mvn dependency:tree              # 依赖树
mvn versions:display-dependency-updates   # 检查依赖更新

# Gradle
./gradlew build                  # 编译 + 测试 + 打包
./gradlew test                    # 仅测试
./gradlew bootRun                 # 运行 Spring Boot 应用
./gradlew dependencies            # 依赖树
```

**讲解：**

1. `-Xmx512m` 设置最大堆内存，`-Xms256m` 初始堆。
2. `-jar` 运行打包产物。
3. 反斜杠是 shell 换行符，Windows 下可用 ^。


### 7.2 JVM 启动参数（生产推荐）

```bash
java \
  -server \
  -Xms2g -Xmx2g \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -XX:+HeapDumpOnOutOfMemoryError \
  -XX:HeapDumpPath=/var/log/app/heapdump.hprof \
  -XX:ErrorFile=/var/log/app/hs_err_pid%p.log \
  -Xlog:gc*:file=/var/log/app/gc.log:time,uptime,level,tags:filecount=10,filesize=10m \
  -XX:+UnlockDiagnosticVMOptions \
  -XX:+AlwaysPreTouch \
  -jar app.jar
```

**讲解：**

1. `-agentlib:jdwp` 开启 JDWP 远程调试端口。
2. IDE 连接该端口即可断点调试远程 JVM。
3. 生产环境不要常开调试端口。


参数说明：

- `-Xms = -Xmx`：避免堆动态扩展的开销；
- `AlwaysPreTouch`：启动时预触碰堆内存，减少首次访问缺页；
- `HeapDumpOnOutOfMemoryError`：OOM 时自动 dump，便于事后分析。

### 7.3 JDK 工具链速查

| 工具 | 用途 |
| --- | --- |
| `jps` | 列出 Java 进程 |
| `jstat` | 监控 GC 与类加载统计 |
| `jstack` | 打印线程栈 |
| `jmap` | 堆内存直方图与 dump |
| `jcmd` | 通用命令（推荐） |
| `jhsdb` | HotSpot 调试器（Java 9+） |
| `jfr` | Java Flight Recorder |
| `jlink` | 自定义运行时镜像 |
| `jpackage` | 原生安装包（Java 14+） |
| `jwebserver` | 内置 HTTP 服务器（Java 18+） |

### 7.4 调试：远程调试

```bash
# 启动时开启远程调试
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005 -jar app.jar
```

**讲解：**

1. `jwebserver` 一条命令启动静态文件服务器。
2. 适合本地预览 HTML/静态资源。
3. 生产 Web 服务仍用 Spring Boot 等框架。


在 IntelliJ IDEA 中：`Run → Edit Configurations → Remote JVM Debug → Host: localhost, Port: 5005`。

### 7.5 调试：本地内建 HTTP 服务器

```java
// Java 18+ 内建 Simple Web Server（jwebserver）
$ jwebserver
// 默认端口 8000，目录为当前目录
```

**讲解：**

1. JMH 是官方基准测试框架：@Benchmark 标注被测方法。
2. @BenchmarkMode 指定统计平均耗时。
3. 微基准测试容易写错，JMH 负责消除 JIT 等干扰。


### 7.6 性能：JMH 微基准

```java
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@Warmup(iterations = 3, time = 1)
@Measurement(iterations = 5, time = 1)
@Fork(2)
@State(Scope.Benchmark)
public class HelloBenchmark {

    @Benchmark
    public String baseline() {
        return "Hello";
    }

    @Benchmark
    public String withStringFormat() {
        return String.format("Hello, %s!", "World");
    }
}
```

**讲解：**

1. 多阶段构建：第一段编译，第二段只拷贝产物运行。
2. `FROM eclipse-temurin:21-jre` 只带运行时，镜像更小。
3. `docker build -t` 构建镜像，`docker run` 运行容器。


### 7.7 容器化部署清单

```dockerfile
# Dockerfile
FROM eclipse-temurin:21-jre-jammy AS runtime

WORKDIR /app
COPY target/hello-java-1.0.0-SNAPSHOT.jar app.jar

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

**讲解：**

1. `-t` 给镜像命名打标签（名字:版本）。
2. 构建完成后 `docker run hello-java:1.0.0` 运行。
3. 容器化是 Java 服务部署的标准方式。


```bash
docker build -t hello-java:1.0.0 .
docker run --rm -p 8080:8080 --memory=512m hello-java:1.0.0
```

**讲解：**

1. @SpringBootApplication 是 Spring Boot 启动类注解。
2. 它组合了配置、组件扫描与自动配置三个能力。
3. `SpringApplication.run` 启动内嵌服务器。


---

## 8. 案例研究（Spring/Hibernate/Netty）

### 8.1 Spring Boot 入口剖析

Spring Boot 应用的 `main` 方法是 Java 工程化"Hello World"的最佳现代示例：

```java
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

**讲解：**

1. 这是用 Java 21 虚拟线程实现的简易 Echo 服务器。
2. `Thread.ofVirtual()` 创建虚拟线程，轻松支撑高并发。
3. 虚拟线程让“每连接一线程”重新可行。


`SpringApplication.run` 实际执行：

1. 创建 `SpringApplication` 实例（推断 Web 类型）；
2. 读取 `META-INF/spring.factories`；
3. 创建 `ApplicationContext`；
4. 加载 BeanDefinition；
5. 刷新上下文（启动内嵌 Tomcat）；
6. 触发 `ApplicationRunner` / `CommandLineRunner`。

### 8.2 Netty 的 `main` 入口

```java
public final class EchoServer {
    static final int PORT = Integer.parseInt(System.getProperty("port", "8007"));

    public static void main(String[] args) throws Exception {
        EventLoopGroup bossGroup = new NioEventLoopGroup(1);
        EventLoopGroup workerGroup = new NioEventLoopGroup();
        try {
            ServerBootstrap b = new ServerBootstrap();
            b.group(bossGroup, workerGroup)
             .channel(NioServerSocketChannel.class)
             .option(ChannelOption.SO_BACKLOG, 100)
             .handler(new LoggingHandler(LogLevel.INFO))
             .childHandler(new ChannelInitializer<SocketChannel>() {
                 @Override
                 public void initChannel(SocketChannel ch) {
                     ch.pipeline().addLast(new EchoServerHandler());
                 }
             });
            ChannelFuture f = b.bind(PORT).sync();
            f.channel().closeFuture().sync();
        } finally {
            workerGroup.shutdownGracefully();
            bossGroup.shutdownGracefully();
        }
    }
}
```

**讲解：**

1. Hibernate 是 JPA 实现：用注解把类映射到数据库表。
2. `session.persist` 插入、`session.get` 查询。
3. ORM 让 Java 对象与关系表互相转换。


注意 Netty 使用 Reactor 模型而非 Java 21 虚拟线程，因其需要细粒度事件分发控制。

### 8.3 Hibernate 的 `main` 入口

```java
public class HibernateDemo {
    public static void main(String[] args) {
        try (StandardServiceRegistry registry = new StandardServiceRegistryBuilder()
                .configure().build();
             SessionFactory factory = new MetadataSources(registry)
                 .buildMetadata().buildSessionFactory()) {

            Session session = factory.openSession();
            Transaction tx = session.beginTransaction();
            try {
                session.persist(new User("Alice"));
                tx.commit();
            } catch (Exception e) {
                if (tx.isActive()) tx.rollback();
                throw e;
            } finally {
                session.close();
            }
        }
    }
}
```

**讲解：**

1. Picocli 是命令行应用框架：@Command 声明命令。
2. @Option 声明参数选项，框架自动解析。
3. 写 CLI 工具优先用 Picocli 而非手写解析。


注意 `try-with-resources` 自动关闭 `SessionFactory` 与 `StandardServiceRegistry`，避免资源泄漏。

### 8.4 Apache Commons CLI 命令行应用

```java
public class CliApp {
    public static void main(String[] args) {
        Options options = new Options();
        options.addOption("n", "name", true, "User name");
        options.addOption("v", "verbose", false, "Verbose output");

        CommandLineParser parser = new DefaultParser();
        try {
            CommandLine cmd = parser.parse(options, args);
            String name = cmd.getOptionValue("n", "World");
            boolean verbose = cmd.hasOption("v");
            if (verbose) System.out.println("Starting...");
            System.out.println("Hello, " + name + "!");
        } catch (ParseException e) {
            System.err.println(e.getMessage());
            new HelpFormatter().printHelp("hello", options);
            System.exit(1);
        }
    }
}
```

**讲解：**

1. `sealed interface` 密封接口：只允许指定的类实现。
2. permits 列出实现者，编译器保证不超出。
3. 配合 switch 模式匹配可穷举所有分支。


---

### 填空题知识点讲解

**Q1.** JDK 21 的 class 文件 major version 是 ________。

65（即 `0x41`）。Java 17 是 61，Java 21 是 65（每升一版加 1，21 - 17 = 4，61 + 4 = 65）。

**Q2.** `javac` 的语义阶段中，将 Lambda 表达式转为 `invokedynamic` 调用的阶段称为 ________。

Desugaring（脱糖）。

**Q3.** Maven 的生命周期顺序为：`validate` → `compile` → `test` → ________ → `verify` → `install` → `deploy`。

`package`。

**Q4.** HotSpot JIT 的两个编译器分别是 C1（Client Compiler）与 ________（Server Compiler）。

C2。

**Q5.** Java 18 起（JEP 400），`Charset.defaultCharset()` 默认返回 ________。

UTF-8。

### 编程题知识点讲解

**Q1.** 编写一个 Java 21 程序，使用 record 与 sealed interface 表示几何图形（圆形、矩形、三角形），并提供 `area()` 方法。使用 Pattern Matching for switch。

```java
public sealed interface Shape permits Circle, Rectangle, Triangle {
    double area();
}

record Circle(double radius) implements Shape {
    @Override
    public double area() {
        return Math.PI * radius * radius;
    }
}

record Rectangle(double width, double height) implements Shape {
    @Override
    public double area() {
        return width * height;
    }
}

record Triangle(double base, double height) implements Shape {
    @Override
    public double area() {
        return 0.5 * base * height;
    }
}

public class ShapeDemo {
    public static String describe(Shape s) {
        return switch (s) {
            case Circle c -> String.format("Circle with radius %.2f, area=%.2f", c.radius(), c.area());
            case Rectangle r -> String.format("Rectangle %.2fx%.2f, area=%.2f", r.width(), r.height(), r.area());
            case Triangle t -> String.format("Triangle base=%.2f height=%.2f, area=%.2f", t.base(), t.height(), t.area());
        };
    }

    public static void main(String[] args) {
        Shape[] shapes = {
            new Circle(3),
            new Rectangle(4, 5),
            new Triangle(6, 8)
        };
        for (Shape s : shapes) {
            System.out.println(describe(s));
        }
    }
}
```

**讲解：**

1. CompletableFuture 是 Java 8 的异步编排工具。
2. `thenApply` 转换结果，`thenCompose` 串联异步任务。
3. 与虚拟线程相比，它适合回调式异步。


**Q2.** 使用 `CompletableFuture` 并行查询三个数据源（模拟 `fetchA`、`fetchB`、`fetchC`），合并结果并设置 500ms 超时。

```java
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

public class ParallelDemo {
    static String fetchA() { sleep(200); return "A"; }
    static String fetchB() { sleep(300); return "B"; }
    static String fetchC() { sleep(400); return "C"; }

    public static void main(String[] args) {
        CompletableFuture<String> fa = CompletableFuture.supplyAsync(ParallelDemo::fetchA);
        CompletableFuture<String> fb = CompletableFuture.supplyAsync(ParallelDemo::fetchB);
        CompletableFuture<String> fc = CompletableFuture.supplyAsync(ParallelDemo::fetchC);

        String result = fa.thenCombine(fb, (a, b) -> a + b)
                .thenCombine(fc, (ab, c) -> ab + c)
                .orTimeout(500, TimeUnit.MILLISECONDS)
                .exceptionally(ex -> "Timeout: " + ex.getMessage())
                .join();

        System.out.println(result);
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

**讲解：**

1. CompletableFuture 是 Java 8 的异步编排工具。
2. thenApply 转换结果，thenCompose 串联异步任务。
3. 与虚拟线程相比，它适合回调式异步。


**Q3.** 使用虚拟线程（Java 21）并发请求 100 个 URL 并打印响应长度。

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.stream.IntStream;

public class VirtualThreadDemo {
    public static void main(String[] args) throws Exception {
        try (HttpClient client = HttpClient.newHttpClient()) {
            List<String> urls = IntStream.rangeClosed(1, 100)
                    .mapToObj(i -> "https://httpbin.org/anything?n=" + i)
                    .toList();

            try (var executor = java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
                var futures = urls.stream()
                        .map(url -> executor.submit(() -> fetch(client, url)))
                        .toList();
                for (var f : futures) {
                    System.out.println(f.get());
                }
            }
        }
    }

    static String fetch(HttpClient client, String url) {
        try {
            HttpResponse<String> resp = client.send(
                    HttpRequest.newBuilder(URI.create(url)).GET().build(),
                    HttpResponse.BodyHandlers.ofString());
            return url + " -> " + resp.body().length() + " bytes";
        } catch (Exception e) {
            return url + " -> error: " + e.getMessage();
        }
    }
}
```

**讲解：**

1. `java.net.http.HttpClient` 是 Java 11+ 内置 HTTP 客户端。
2. `sendAsync` 异步发送，返回 CompletableFuture。
3. 无需第三方库即可调 REST API。


### 11.1 书籍

- Bloch, J. *Effective Java* (3rd ed., 2018). Addison-Wesley.
- Urma, R.-G., Fusco, M., Myatt, A. *Modern Java in Action* (Java 21 Updated).
- Evans, B., Verburg, M. *The Well-Grounded Java Developer* (3rd ed., 2024).
- Naughton, P., Schildt, H. *Java: The Complete Reference* (13th ed., 2024).

### 11.2 论文与技术报告

- Würthinger, T., Wimmer, C., Wöss, A., et al. 2013. *Self-Attribution: A Self-Profiling Approach to JIT Compilation*. ACM SIGPLAN Notices, 48(10), 75-84. https://doi.org/10.1145/2544173.2509521
- Wimmer, C. and Mössenböck, H. 2015. *Automatic Truffle-Assisted Debugging of Compiler Optimizations*. ACM OOPSLA, 1-15. https://doi.org/10.1145/2858965

### 11.4 开源学习项目

- **toBeBetterJavaer (二哥的 Java 进阶之路)**: https://github.com/itwanger/toBeBetterJavaer
- **CS-Books (Java 部分)**: https://github.com/forthespada/CS-Books
- **advanced-java (互联网 Java 工程师进阶知识)**: https://github.com/doocs/advanced-java
- **JavaGuide**: https://github.com/Snailclimb/JavaGuide
- **Spring Boot 示例**: https://github.com/spring-projects/spring-boot
- **MIT 6.031 Reading**: https://web.mit.edu/6.031/www/sp21/classes/

### 11.5 推荐学习路径

1. **入门阶段（1-2 周）**：本文档 + Oracle Java Tutorial + 在 LeetCode 上做简单题；
2. **进阶阶段（4-6 周）**：Effective Java + Modern Java in Action + 完成一个 Spring Boot 项目；
3. **深化阶段（8-12 周）**：JVM 规范精读 + Spring Framework 源码 + 参与一个开源项目 PR；
4. **专家阶段（持续）**：阅读 JEP 与 JSR 提案、跟踪 OpenJDK 邮件列表、研究 Valhalla / Loom / Panama / Skila 孵化项目。

---
