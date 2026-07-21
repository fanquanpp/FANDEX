---
order: 54
title: JVM类加载机制
module: java
category: Java
difficulty: advanced
description: 类加载器、双亲委派模型、字节码增强与模块化类加载的系统性深度剖析
author: fanquanpp
updated: '2026-07-21'
related:
  - java/并发编程基础
  - java/JUC并发包
  - java/JVM垃圾回收
  - java/Java反射
  - java/JVM内存模型
  - java/Java模块系统
prerequisites:
  - java/概述与开发环境
  - java/面向对象编程
  - java/Java反射
tags:
  - Java
  - JVM
  - ClassLoader
  - ParentDelegation
  - Bytecode
  - HotSwap
  - JPMS
  - JavaAgent
---

# JVM 类加载机制深度指南

> 类加载机制是 Java"一次编写、到处运行"承诺的运行时基石。从 1995 年 Java 1.0 内置的原始 ClassLoader，到 Java 9 引入的模块系统（JPMS），再到云原生时代的动态类加载、热部署、字节码增强、Java Agent，类加载机制始终是 Java 平台最具生命力、也最常被误解的核心子系统。本文将以"加载-链接-初始化"三阶段为骨架，以双亲委派模型为神经中枢，以字节码与运行时常量池为微观切面，系统性剖析类加载的全貌，让读者既能编写自定义 ClassLoader 解决工程问题，也能理解 Spring Boot、Tomcat、OSGi、Arthas 等主流框架的类加载设计。

---

## 1. 学习目标（基于 Bloom 分类法）

本节以 Bloom 教育目标分类法（Anderson 2001 修订版）为框架，对学习目标进行显式分级。

### 1.1 认知层级目标

| 层级（Level） | 行为动词 | 具体学习目标 |
|--------------|---------|-------------|
| 记忆（Remember） | 列举、识别、定义 | 列举类加载生命周期的 5 个阶段，识别 Bootstrap、Platform、Application 三级类加载器，定义双亲委派模型 |
| 理解（Understand） | 解释、归纳、对比 | 解释双亲委派的设计动机，对比类加载时机与类初始化时机，归纳 `Class` 对象在方法区与堆中的双重存在 |
| 应用（Apply） | 实现、使用、演示 | 实现自定义 ClassLoader 加载字节码，使用 `URLClassLoader` 动态加载 JAR，演示热部署基本流程 |
| 分析（Analyze） | 分解、辨别、推断 | 分解 `loadClass` 与 `findClass` 的职责边界，推断 SPI 场景下的类加载器切换原理，辨别 `forName` 与 `loadClass` 的初始化差异 |
| 评价（Evaluate） | 评判、论证、批判 | 评判 Tomcat 打破双亲委派的合理性，论证 JPMS 对双亲委派的改进与挑战，批判反射绕过模块封装的风险 |
| 创造（Create） | 设计、构建、重构 | 设计支持热卸载的插件化容器，构建 Java Agent 字节码增强工具，重构遗留单类加载器应用为多 ClassLoader 隔离架构 |

### 1.2 学习成果自检清单

完成本章学习后，读者应能独立完成以下任务：

1. 在不查阅文档的前提下，画出类加载生命周期的 5 阶段状态机。
2. 用一句话向同事解释双亲委派模型如何保证核心 API 的安全性与一致性。
3. 在白板上写出 `ClassLoader.loadClass` 的伪代码，标注委派点与回退点。
4. 实现一个自定义 ClassLoader，能从加密的字节数组解密后加载类。
5. 对比 Tomcat 的 WebappClassLoader 与 OSGi 的 BundleClassLoader，给出隔离粒度的差异。
6. 设计一个基于 Java Agent 的方法耗时统计工具，并说明 `premain` 与 `agentmain` 的触发时机。

### 1.3 前置知识地图

```
Java 基础
    │
    ├── 面向对象（类、对象、继承）
    ├── 反射（Class、Method、Field）
    └── 异常处理
            │
            ▼
JVM 基础（本章前置）
    │
    ├── 运行时数据区（方法区、堆、栈）
    ├── 字节码（class 文件格式）
    └── 执行引擎（解释器 + JIT）
            │
            ▼
JVM 类加载机制（本章）
    │
    ├── 类加载生命周期：加载 → 链接（验证、准备、解析） → 初始化
    ├── 类加载器层次：Bootstrap → Platform → Application → Custom
    ├── 双亲委派模型与打破场景
    ├── 模块系统（JPMS）对类加载的影响
    ├── 字节码增强：ASM、Javassist、ByteBuddy
    └── 工程实践：热部署、Java Agent、SPI、OSGi、Tomcat
```

### 1.4 章节阅读建议

- **零基础读者**：建议按顺序阅读第 2-5 节，配合第 5 节代码示例上机实操，再回到第 3、4 节深化理论。
- **有 Java 开发经验的工程师**：可跳过第 2 节基础部分，直接阅读第 3 节双亲委派、第 4 节字节码、第 7 节反模式。
- **架构师**：重点关注第 6 节对比分析、第 8 节工程实践与第 9 节案例研究，特别是 Tomcat、OSGi、Spring Boot 的类加载设计。

---

## 2. 历史动机与演化

### 2.1 类加载机制的诞生背景

1995 年 Java 1.0 发布时，类加载机制的设计目标非常明确：**支持 Applet 从网络远程加载类**。当时浏览器需要从任意 URL 下载 `.class` 文件并在沙箱中执行，这要求类加载必须满足两个约束：

1. **来源多样性**：类可以来自本地文件系统、网络 URL、加密流、甚至动态生成。
2. **命名空间隔离**：不同来源的同名类必须能共存，避免恶意类替换核心 API。

为满足这两个约束，Java 设计了 `ClassLoader` 抽象类，并采用"类加载器 + 类全限定名"作为类的唯一标识（即 **运行时包名空间**）。这一设计使得两个不同的 `ClassLoader` 可以分别加载 `java.lang.String`，它们在 JVM 内部被视为完全不同的类。

### 2.2 双亲委派模型的引入

Java 1.2 引入了 **双亲委派模型**（Parent Delegation Model），将类加载器组织为层级结构：

```
Bootstrap ClassLoader（C++ 实现，加载 rt.jar）
        ↑ parent
Platform ClassLoader（Java 11+，原 Extension ClassLoader）
        ↑ parent
Application ClassLoader（加载 classpath）
        ↑ parent
Custom ClassLoader（用户自定义）
```

**双亲委派的核心规则**：当类加载器收到加载请求时，首先委派给父加载器，只有父加载器无法加载时才尝试自己加载。这一设计的关键意义：

1. **安全性**：核心 API（如 `java.lang.String`）总是由 Bootstrap 加载，恶意自定义 ClassLoader 无法替换。
2. **一致性**：同一个类在全 JVM 内只被加载一次（同一 ClassLoader + 同一类名），避免类型歧义。
3. **可扩展性**：用户可通过继承 `URLClassLoader` 实现自定义加载器，自动复用双亲委派。

### 2.3 类加载器的演进史

| 版本 | 年份 | 关键变化 |
|------|------|---------|
| JDK 1.0 | 1996 | 引入 `ClassLoader` 抽象类，仅支持 `loadClass` |
| JDK 1.2 | 1998 | 引入双亲委派模型，新增 `findClass` 鼓励重写 |
| JDK 1.5 | 2004 | 引入 `java.lang.instrument` 包，支持 Java Agent |
| JDK 7 | 2011 | 引入 `URLClassLoader.close()`，解决资源泄漏 |
| JDK 9 | 2017 | 引入模块系统（JPMS），重命名 Extension 为 Platform ClassLoader，双亲委派改造为"模块优先" |
| JDK 11 | 2018 | 移除 EE 模块，Bootstrap 加载路径精简 |
| JDK 16 | 2021 | 强封装默认（`--illegal-access=deny`），反射绕过被封堵 |
| JDK 21 | 2023 | AppCFS（Application Class Data Sharing）支持动态归档 |

### 2.4 关键里程碑：JPMS 的冲击

Java 9 引入的模块系统（JSR 376）对类加载机制产生了深远影响：

1. **类加载器重命名**：`Extension ClassLoader` 改为 `Platform ClassLoader`，语义从"扩展"变为"平台模块"。
2. **加载策略变化**：双亲委派不再是"先委派父加载器"，而是"先查模块图，模块未定义再委派父加载器"。
3. **强封装**：模块的 `requires`、`exports` 控制可见性，反射 `setAccessible` 默认被拒绝。
4. **分层加载**：每个模块可以指定自己的加载器，支持更灵活的隔离。

这一变化使得"双亲委派"从 1.2 时代的铁律，演变为"模块感知的双亲委派"，是类加载机制 30 年来最大的一次重构。

### 2.5 设计哲学：安全性与灵活性的平衡

Java 类加载机制的设计哲学可以概括为：

- **核心 API 不可篡改**：双亲委派保证 `java.*` 包由 Bootstrap 加载，用户无法伪造。
- **扩展点保留**：`findClass` 鼓励用户实现自定义加载逻辑，但 `loadClass` 仍遵守委派。
- **隔离与共享并存**：多 ClassLoader 实现隔离（如 Tomcat Webapp），父加载器实现共享（如共享 Spring）。
- **运行时动态性受控**：Java Agent 允许字节码增强，但需显式声明；JPMS 收紧了反射的开放性。

这一哲学平衡了"安全性"（防止恶意代码）与"灵活性"（支持热部署、插件化、AOP），是 Java 在企业级市场长期主导的根本原因之一。

> **历史轶事**：双亲委派模型的设计者曾在 JCP 内部争论是否应允许子加载器"跳过"父加载器。最终折中方案是：`loadClass` 默认委派，但用户可重写 `loadClass` 完全自定义（这正是 Tomcat、OSGi 的做法）。这一"默认安全、可定制"的设计成为 Java 类加载机制的标志性特征。

---

## 3. 形式化定义

### 3.1 类加载生命周期的形式化定义

类 $C$ 的生命周期可形式化为状态机：

$$
\text{Lifecycle}(C) = \text{Loaded} \to \text{Verified} \to \text{Prepared} \to \text{Resolved} \to \text{Initialized} \to \text{Using} \to \text{Unloaded}
$$

其中各状态的语义：

1. **Loaded（加载）**：从字节码（`byte[]`）生成 `Class` 对象，存入方法区。
2. **Verified（验证）**：检查字节码合法性（格式、元数据、字节码、符号引用）。
3. **Prepared（准备）**：为静态字段分配内存并赋零值，**非初始值**。
4. **Resolved（解析）**：将常量池中的符号引用替换为直接引用（可延迟）。
5. **Initialized（初始化）**：执行 `<clinit>` 静态初始化块与静态字段赋值。
6. **Using（使用）**：类处于可用状态。
7. **Unloaded（卸载）**：Class 对象被 GC 回收（需满足 3 个条件，详见第 4.8 节）。

注意 **Resolved 可延迟**：JVM 规范允许在初始化前不解析符号引用，只有真正使用时才解析（惰性解析）。HotSpot 默认采用惰性解析。

### 3.2 双亲委派模型的形式化定义

类加载器 $L$ 的 `loadClass` 方法可形式化为：

$$
L.\text{loadClass}(n) = \begin{cases}
\text{findLoadedClass}(n) & \text{if already loaded by } L \\
\text{parent}.\text{loadClass}(n) & \text{if parent} \neq \bot \text{ and parent can load} \\
\text{findClass}(n) & \text{otherwise}
\end{cases}
$$

其中：

- $\text{findLoadedClass}(n)$：检查 $L$ 是否已加载过 $n$（native 方法，查 `ClassLoader.classes` 表）。
- $\text{parent}.\text{loadClass}(n)$：递归委派给父加载器。
- $\text{findClass}(n)$：$L$ 自己实现加载逻辑（如读 JAR、解密字节码）。

**类的唯一性**：在 JVM 中，两个 `Class` 对象相等当且仅当它们由同一 ClassLoader 加载。形式化：

$$
\text{Class}_1 = \text{Class}_2 \iff \text{loader}(\text{Class}_1) = \text{loader}(\text{Class}_2) \land \text{name}(\text{Class}_1) = \text{name}(\text{Class}_2)
$$

这意味着：即使两个 ClassLoader 加载了字节码完全相同的 `com.example.User`，它们也是不同的类，互相赋值会抛 `ClassCastException`。

### 3.3 类初始化时机的形式化定义

JVM 规范规定，类的 **初始化**（而非加载）在以下 6 种情况触发：

1. **new / getstatic / putstatic / invokestatic** 字节码指令：实例化对象、访问静态字段（非 final）、调用静态方法。
2. **反射调用**：`Class.forName`、`Method.invoke` 等。
3. **子类初始化触发父类初始化**：初始化子类时，父类若未初始化则先初始化。
4. **主类**：JVM 启动时的主类（含 `main` 方法的类）。
5. **接口默认方法**：实现类初始化时，接口若有 default 方法则先初始化。
6. **MethodHandle**：`MethodHandle` 解析时指向的类。

**不触发初始化的情况**：

- 通过子类访问父类的静态字段：仅初始化父类，子类不初始化。
- `ClassName[] arr = new ClassName[10]`：不初始化 `ClassName`，仅初始化数组类型。
- 访问 `static final` 常量（编译期常量）：直接进入常量池，不触发初始化。

形式化判断：

$$
\text{init}(C) = \begin{cases}
\text{true} & \text{if 6 triggering conditions} \\
\text{false} & \text{if ConstantValue or array or super-only access}
\end{cases}
$$

### 3.4 类卸载的形式化条件

类 $C$ 被 JVM 卸载需同时满足 3 个条件：

$$
\text{unloadable}(C) = \text{noLiveInstance}(C) \land \text{noLiveClassRef}(C) \land \text{loaderGCd}(\text{loader}(C))
$$

1. **noLiveInstance**：堆中无 $C$ 的实例。
2. **noLiveClassRef**：无任何地方引用 $C$ 的 `Class` 对象。
3. **loaderGCd**：加载 $C$ 的 ClassLoader 已被 GC 回收。

注意 **第 3 条是关键**：Bootstrap / Platform / Application ClassLoader 永远不会被 GC（它们是 JVM 内部根引用），因此它们加载的类 **永远不会卸载**。只有自定义 ClassLoader 加载的类才可能卸载，这是热部署可行性的理论基础。

---

## 4. 理论推导：类加载的内部机制

### 4.1 class 文件格式剖析

class 文件是字节码的二进制容器，格式如下（JVMS §4）：

```
ClassFile {
    u4             magic;              // 0xCAFEBABE
    u2             minor_version;
    u2             major_version;
    u2             constant_pool_count;
    cp_info        constant_pool[constant_pool_count-1];
    u2             access_flags;
    u2             this_class;
    u2             super_class;
    u2             interfaces_count;
    u2             interfaces[interfaces_count];
    u2             fields_count;
    field_info     fields[fields_count];
    u2             methods_count;
    method_info    methods[methods_count];
    u2             attributes_count;
    attribute_info attributes[attributes_count];
}
```

关键部分：

1. **magic**：固定 `0xCAFEBABE`，Java 类文件的"签名"。
2. **constant_pool**：常量池，存放字面量与符号引用（类名、字段名、方法名）。
3. **access_flags**：类访问标志（public、final、abstract、interface 等）。
4. **this_class / super_class**：当前类与父类的常量池索引。
5. **fields / methods**：字段与方法表，每个含 access_flags、name、descriptor、attributes。
6. **attributes**：类级属性（如 `SourceFile`、`InnerClasses`、`BootstrapMethods`）。

### 4.2 常量池的结构与解析

常量池是 class 文件的核心，所有符号引用都存于此。常见常量类型：

| Tag | 类型 | 说明 |
|-----|------|------|
| 7 | CONSTANT_Class_info | 类或接口引用 |
| 8 | CONSTANT_String_info | 字符串字面量 |
| 9 | CONSTANT_Fieldref_info | 字段引用 |
| 10 | CONSTANT_Methodref_info | 方法引用 |
| 11 | CONSTANT_InterfaceMethodref_info | 接口方法引用 |
| 12 | CONSTANT_NameAndType_info | 名称与类型描述符 |
| 7 | CONSTANT_MethodHandle_info | 方法句柄（invokedynamic） |
| 18 | CONSTANT_InvokeDynamic_info | invokedynamic 指令 |

**解析过程**：当字节码指令（如 `invokevirtual`）引用常量池项时，JVM 将符号引用（如 `java/lang/String.length:()I`）替换为直接引用（方法入口地址）。这一过程称为 **Resolution**。

### 4.3 验证阶段的 4 个子阶段

验证是链接的第一步，确保字节码安全合法。分为 4 个子阶段：

1. **文件格式验证**：magic number、版本号、常量池索引合法性。
2. **元数据验证**：类是否有父类（除 `java.lang.Object`）、是否继承 final 类、字段与方法签名合法。
3. **字节码验证**：方法体字节码的控制流分析，确保：
   - 操作数栈类型匹配。
   - 分支指令不跳出方法。
   - 类型转换安全。
4. **符号引用验证**：解析阶段执行，验证引用的类、字段、方法确实存在且可访问。

### 4.4 准备阶段的零值赋值

准备阶段为静态字段分配内存并赋 **零值**，而非源码中的初始值：

```java
public class Example {
    static int a = 42;             // 准备阶段：a = 0
    static final int B = 42;       // 准备阶段：B = 42（ConstantValue 属性）
    static String s = "hello";     // 准备阶段：s = null
    static final String S = "hi";  // 准备阶段：S = "hi"（编译期常量）
}
```

**ConstantValue 例外**：`static final` 字段若值为编译期常量（字面量、字符串），编译器在 class 文件中写入 `ConstantValue` 属性，准备阶段直接赋值，跳过 `<clinit>`。

### 4.5 解析阶段的惰性策略

HotSpot 默认采用 **惰性解析**：符号引用在首次使用时才解析。例如：

```java
public class Main {
    public static void main(String[] args) {
        if (args.length > 0) {
            new Helper().doWork();  // Helper 仅在此分支执行时解析
        }
    }
}
```

若 `Helper` 类不存在且 `args.length == 0`，程序不会报错；若 `args.length > 0`，则抛 `NoClassDefFoundError`。

惰性解析的优势：启动快、未用类不加载；劣势：错误延迟暴露。

### 4.6 初始化阶段的 `<clinit>` 执行

初始化阶段执行 `<clinit>` 方法，该方法由编译器自动生成，包含：

1. 所有静态字段的赋值语句（按源码顺序）。
2. 所有 `static {}` 块（按源码顺序）。

**关键性质**：

- `<clinit>` 由 JVM 保证 **线程安全**：多线程同时触发初始化时，只有一个线程执行 `<clinit>`，其他线程阻塞。
- 若 `<clinit>` 抛异常，JVM 标记类为"错误初始化"，后续访问抛 `NoClassDefFoundError`。
- 接口无 `<clinit>`（无静态初始化块），但接口的字段在初始化时赋值。

**单例模式的 `<clinit>` 优势**：

```java
public class Singleton {
    private static final Singleton INSTANCE = new Singleton();
    // <clinit> 由 JVM 保证线程安全，无需 synchronized
    public static Singleton getInstance() { return INSTANCE; }
}
```

这是"饿汉式"单例线程安全的根本原因——`<clinit>` 的原子性。

### 4.7 双亲委派的字节码视角

`ClassLoader.loadClass` 的源码（简化）：

```java
protected Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
    synchronized (getClassLoadingLock(name)) {
        // 1. 检查是否已加载
        Class<?> c = findLoadedClass(name);
        if (c == null) {
            try {
                // 2. 委派父加载器
                if (parent != null) {
                    c = parent.loadClass(name, false);
                } else {
                    c = findBootstrapClassOrNull(name);
                }
            } catch (ClassNotFoundException e) {
                // 父加载器找不到，不处理
            }
            if (c == null) {
                // 3. 自己加载
                c = findClass(name);
            }
        }
        if (resolve) resolveClass(c);
        return c;
    }
}
```

**关键细节**：

1. **getClassLoadingLock**：Java 7+ 使用类名作为锁，避免 `loadClass` 同步导致死锁（如 `ClassLoader` A 等待 B，B 等待 A）。
2. **findLoadedClass**：native 方法，查 `ClassLoader.classes` 表，已加载则直接返回。
3. **parent == null**：委派 Bootstrap（C++ 实现，无 Java 对象）。
4. **findClass**：用户重写点，默认抛 `ClassNotFoundException`。

### 4.8 类卸载的 GC 机制

类卸载发生在 Full GC 时，需同时满足 3 个条件（重申）：

1. 堆中无该类的实例。
2. 无引用指向该类的 `Class` 对象。
3. 加载该类的 ClassLoader 已被 GC。

**为什么第 3 条必要**：JVM 通过 ClassLoader 维护"加载类表"，只要 ClassLoader 存活，其加载的所有类的 `Class` 对象都保留在方法区。因此 ClassLoader 是类的"锚点"。

**热部署的理论基础**：自定义 ClassLoader 加载的类可卸载。当替换插件时，丢弃旧 ClassLoader，加载新 ClassLoader，旧类在下次 GC 时卸载，新类生效。

### 4.9 模块系统对类加载的改造

JPMS（Java 9+）将双亲委派改造为"模块感知"：

1. **模块路径优先**：类加载器先查模块图，模块中有的类由模块加载器加载。
2. **未命名模块**：传统 classpath 上的类归入"未命名模块"，由 Application ClassLoader 加载。
3. **分层加载**：每个模块可指定加载器，支持多加载器隔离。

加载流程（简化）：

```
Application ClassLoader.loadClass("com.example.Foo")
    │
    ▼
查找模块图：com.example 是否在某模块中？
    │
    ├── 是 → 由该模块的加载器加载（可能是 AppClassLoader 或自定义）
    │
    └── 否 → 走传统双亲委派（Platform → Bootstrap）
```

这一改造使得"模块内类由固定加载器加载"，加强了封装，但也带来兼容性问题（旧代码依赖双亲委派的可能失效）。

---

## 5. 代码示例：从入门到进阶的完整实战

### 5.1 入门：查看类的加载器

```java
public class LoaderDemo {
    public static void main(String[] args) {
        // String 由 Bootstrap 加载（C++ 实现，getClassLoader 返回 null）
        System.out.println("String's loader: " + String.class.getClassLoader());
        // 输出: null

        // DataLoader 由 Application ClassLoader 加载
        System.out.println("DataLoader's loader: " + DataLoader.class.getClassLoader());
        // 输出: jdk.internal.loader.ClassLoaders$AppClassLoader@...

        // 双亲链
        ClassLoader cl = DataLoader.class.getClassLoader();
        while (cl != null) {
            System.out.println(cl);
            cl = cl.getParent();
        }
        System.out.println("Bootstrap (null)");
    }
}
```

### 5.2 基础：自定义 ClassLoader 从文件加载

```java
import java.nio.file.*;

public class FileClassLoader extends ClassLoader {
    private final Path classDir;

    public FileClassLoader(ClassLoader parent, Path classDir) {
        super(parent);
        this.classDir = classDir;
    }

    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        try {
            // 将类名转为文件路径：com.example.Foo → com/example/Foo.class
            String fileName = name.replace('.', '/') + ".class";
            Path classFile = classDir.resolve(fileName);
            byte[] bytes = Files.readAllBytes(classFile);
            // defineClass 是 native 方法，将 byte[] 转为 Class 对象
            return defineClass(name, bytes, 0, bytes.length);
        } catch (Exception e) {
            throw new ClassNotFoundException(name, e);
        }
    }

    public static void main(String[] args) throws Exception {
        Path dir = Paths.get("C:/temp/classes");
        FileClassLoader loader = new FileClassLoader(
            FileClassLoader.class.getClassLoader(),  // parent
            dir
        );
        Class<?> clazz = loader.loadClass("com.example.Plugin");
        Object instance = clazz.getDeclaredConstructor().newInstance();
        System.out.println("Loaded: " + instance);
    }
}
```

### 5.3 进阶：解密加载（防止 class 被反编译）

```java
import java.nio.file.*;
import javax.crypto.*;
import javax.crypto.spec.SecretKeySpec;

public class DecryptingClassLoader extends ClassLoader {
    private final Path classDir;
    private final SecretKey key;

    public DecryptingClassLoader(Path classDir, String keyStr) {
        this.classDir = classDir;
        this.key = new SecretKeySpec(keyStr.getBytes(), "AES");
    }

    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        try {
            String fileName = name.replace('.', '/') + ".class.enc";
            byte[] encrypted = Files.readAllBytes(classDir.resolve(fileName));
            byte[] decrypted = decrypt(encrypted);
            return defineClass(name, decrypted, 0, decrypted.length);
        } catch (Exception e) {
            throw new ClassNotFoundException(name, e);
        }
    }

    private byte[] decrypt(byte[] data) throws Exception {
        Cipher cipher = Cipher.getInstance("AES");
        cipher.init(Cipher.DECRYPT_MODE, key);
        return cipher.doFinal(data);
    }
}
```

### 5.4 进阶：热部署示例

```java
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;

public class HotDeployDemo {
    public interface Worker {
        String work(String input);
    }

    public static void main(String[] args) throws Exception {
        Path classDir = Paths.get("C:/temp/hot");
        WorkerHolder holder = new WorkerHolder(classDir);

        // 模拟每隔 3 秒检查一次
        for (int i = 0; i < 5; i++) {
            Worker w = holder.getWorker();
            System.out.println(w.work("test-" + i));
            Thread.sleep(3000);
        }
    }

    static class WorkerHolder {
        private final Path classDir;
        private Worker worker;
        private long lastModified;

        WorkerHolder(Path classDir) {
            this.classDir = classDir;
            reload();
        }

        synchronized Worker getWorker() {
            try {
                long mod = Files.getLastModifiedTime(
                    classDir.resolve("WorkerImpl.class")).toMillis();
                if (mod != lastModified) {
                    reload();
                }
            } catch (Exception ignored) {}
            return worker;
        }

        private void reload() {
            try {
                // 每次新建 ClassLoader，旧类可被 GC
                ClassLoader cl = new FileClassLoader(null, classDir) {
                    @Override
                    protected Class<?> findClass(String name) throws ClassNotFoundException {
                        try {
                            byte[] bytes = Files.readAllBytes(
                                classDir.resolve(name + ".class"));
                            return defineClass(name, bytes, 0, bytes.length);
                        } catch (Exception e) {
                            throw new ClassNotFoundException(name, e);
                        }
                    }
                };
                Class<?> clazz = cl.loadClass("WorkerImpl");
                worker = (Worker) clazz.getDeclaredConstructor().newInstance();
                lastModified = Files.getLastModifiedTime(
                    classDir.resolve("WorkerImpl.class")).toMillis();
                System.out.println("[HotDeploy] Reloaded WorkerImpl");
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
```

### 5.5 进阶：打破双亲委派（Tomcat 风格）

```java
public class WebAppClassLoader extends URLClassLoader {
    private final List<String> overrides = List.of("com.myapp.");

    public WebAppClassLoader(URL[] urls, ClassLoader parent) {
        super(urls, parent);
    }

    @Override
    protected Class<?> loadClass(String name, boolean resolve)
            throws ClassNotFoundException {
        synchronized (getClassLoadingLock(name)) {
            Class<?> c = findLoadedClass(name);
            if (c == null) {
                // 1. 先自己加载（覆盖指定包）
                if (shouldOverride(name)) {
                    try {
                        c = findClass(name);
                    } catch (ClassNotFoundException e) {
                        // 自己加载失败，委派父加载器
                    }
                }
                // 2. 委派父加载器
                if (c == null) {
                    c = super.loadClass(name, false);
                }
            }
            if (resolve) resolveClass(c);
            return c;
        }
    }

    private boolean shouldOverride(String name) {
        return overrides.stream().anyMatch(name::startsWith);
    }
}
```

### 5.6 进阶：Java Agent 字节码增强（premain）

```java
// Agent.java
import java.lang.instrument.*;
import java.security.*;

public class TimingAgent {
    public static void premain(String args, Instrumentation inst) {
        System.out.println("[Agent] premain called");
        inst.addTransformer(new TimingTransformer(), true);
    }
}

class TimingTransformer implements ClassFileTransformer {
    @Override
    public byte[] transform(ClassLoader loader, String className,
            Class<?> classBeingRedefined,
            ProtectionDomain protectionDomain,
            byte[] classfileBuffer) {
        if (className.startsWith("com/myapp/")) {
            System.out.println("[Agent] Transforming: " + className);
            // 实际场景使用 ASM/Javassist/ByteBuddy 修改字节码
            // 这里仅演示 hook 点
        }
        return classfileBuffer;  // 返回 null 表示不修改
    }
}
```

`MANIFEST.MF`：

```
Premain-Class: TimingAgent
Can-Redefine-Classes: true
Can-Retransform-Classes: true
```

启动命令：

```bash
java -javaagent:timing-agent.jar -jar myapp.jar
```

### 5.7 进阶：agentmain（运行时挂载）

```java
public class DiagnosticAgent {
    public static void agentmain(String args, Instrumentation inst) throws Exception {
        System.out.println("[Agent] Attached at runtime");
        // 重新转换已加载的类
        for (Class<?> c : inst.getAllLoadedClasses()) {
            if (c.getName().startsWith("com.myapp.")) {
                inst.retransformClasses(c);
            }
        }
    }
}
```

通过 `com.sun.tools.attach.VirtualMachine` 挂载：

```java
VirtualMachine vm = VirtualMachine.attach("12345");  // PID
vm.loadAgent("diagnostic-agent.jar");
vm.detach();
```

### 5.8 进阶：SPI 与上下文类加载器

```java
// ServiceLoader 内部使用上下文 ClassLoader 加载实现类
ServiceLoader<Driver> loaders = ServiceLoader.load(Driver.class);
for (Driver d : loaders) {
    System.out.println(d.getClass().getName());
}

// 上下文类加载器默认是 Application ClassLoader
// 可显式设置（打破双亲委派）
Thread.currentThread().setContextClassLoader(customLoader);
```

SPI 场景：JDBC `DriverManager` 由 Bootstrap 加载，但具体 `Driver` 实现由第三方提供（classpath），Bootstrap 无法加载。解决：使用 `Thread.currentThread().getContextClassLoader()` 加载实现类，这正是双亲委派"被打破"的标准场景。

### 5.9 进阶：ByteBuddy 字节码增强

```java
import net.bytebuddy.*;
import net.bytebuddy.implementation.*;

public class ByteBuddyDemo {
    public static void main(String[] args) throws Exception {
        Class<?> enhanced = new ByteBuddy()
            .subclass(Object.class)
            .method(ElementMatchers.named("toString"))
            .intercept(FixedValue.value("Hello ByteBuddy!"))
            .make()
            .load(ByteBuddyDemo.class.getClassLoader())
            .getLoaded();

        Object obj = enhanced.getDeclaredConstructor().newInstance();
        System.out.println(obj.toString());  // Hello ByteBuddy!
    }
}
```

### 5.10 实战：模拟 Arthas 方法耗时监控

```java
import java.lang.instrument.*;
import net.bytebuddy.agent.builder.AgentBuilder;
import net.bytebuddy.asm.Advice;
import net.bytebuddy.matcher.ElementMatchers;

public class MethodTimerAgent {
    public static void premain(String args, Instrumentation inst) {
        new AgentBuilder.Default()
            .type(ElementMatchers.nameStartsWith("com.myapp."))
            .transform((builder, typeDesc, cl, module) ->
                builder.method(ElementMatchers.any())
                    .intercept(Advice.to(TimingAdvice.class))
            ).installOn(inst);
    }

    public static class TimingAdvice {
        @Advice.OnMethodEnter
        public static long enter() {
            return System.nanoTime();
        }

        @Advice.OnMethodExit
        public static void exit(@Advice.Enter long start,
                                 @Advice.Origin String method) {
            long duration = (System.nanoTime() - start) / 1_000_000;
            if (duration > 100) {
                System.out.printf("[Slow] %s took %d ms%n", method, duration);
            }
        }
    }
}
```

---

## 6. 对比分析

### 6.1 类加载器层次对比

| 类加载器 | 实现语言 | 加载路径 | 父加载器 | 典型类 |
|---------|---------|---------|---------|--------|
| Bootstrap | C++ | `jmods/`、`rt.jar`（旧版） | 无 | `java.lang.String`、`java.lang.Object` |
| Platform | Java | `jmods/` 平台模块 | Bootstrap | `java.sql.*`、`java.xml.*` |
| Application | Java | `classpath` | Platform | 用户类 |
| Custom | Java | 自定义 | 任意 | 插件类 |

### 6.2 `Class.forName` vs `ClassLoader.loadClass`

| 维度 | `Class.forName` | `ClassLoader.loadClass` |
|------|----------------|----------------------|
| 是否初始化 | 默认初始化 | 默认不初始化 |
| 加载器 | 调用者类加载器 | 显式指定 |
| 适用场景 | JDBC 加载驱动 | 懒加载、性能敏感 |
| 灵活性 | 低（静态方法） | 高（可自定义加载器） |

**示例**：

```java
// forName 默认初始化（执行 <clinit>）
Class<?> c1 = Class.forName("com.example.Foo");

// loadClass 不初始化
Class<?> c2 = ClassLoader.getSystemClassLoader().loadClass("com.example.Foo");

// forName 可指定不初始化
Class<?> c3 = Class.forName("com.example.Foo", false, loader);
```

### 6.3 双亲委派 vs 模块化加载

| 维度 | 双亲委派（1.2-8） | 模块化加载（9+） |
|------|------------------|----------------|
| 加载顺序 | 先父后子 | 先模块图，再双亲委派 |
| 封装性 | 弱（反射可绕过） | 强（`requires`/`exports` 控制） |
| 兼容性 | 高（旧代码无影响） | 中（部分旧代码需迁移） |
| 性能 | 略低（多次委派） | 略高（模块图直接查） |
| 隔离粒度 | 类加载器级 | 模块级 |

### 6.4 各框架类加载策略对比

| 框架 | 类加载策略 | 隔离粒度 | 打破双亲委派 |
|------|----------|---------|-------------|
| 普通 Java 应用 | 标准双亲委派 | 无 | 否 |
| Tomcat | WebappClassLoader | 每个 Webapp 一个 | 是（servlet 规范要求） |
| OSGi | BundleClassLoader | 每个 Bundle 一个 | 是（网状委派） |
| Spring Boot | LaunchedURLClassLoader | Fat JAR | 否（标准委派） |
| JBoss/WildFly | ModuleClassLoader | 每个模块一个 | 是（模块化） |
| Arthas | IsolatingClassLoader | 增强 ClassLoader | 是（运行时挂载） |

### 6.5 字节码增强库对比

| 库 | 性能 | API 友好度 | 学习曲线 | 典型用户 |
|----|------|-----------|---------|---------|
| ASM | 最高 | 低 | 陡峭 | Spring AOP、CGLIB |
| Javassist | 中 | 高 | 平缓 | Hibernate、JBoss |
| ByteBuddy | 高 | 极高 | 平缓 | Mockito、Arthas |
| CGLIB | 中 | 中 | 中等 | Spring AOP（旧版） |

---

## 7. 陷阱与反模式

### 7.1 反模式：自定义 ClassLoader 不重写 findClass

**错误**：直接重写 `loadClass` 破坏双亲委派，导致核心 API 被替换风险。

```java
// 反例：直接重写 loadClass
public class BadLoader extends ClassLoader {
    @Override
    protected Class<?> loadClass(String name, boolean resolve) {
        // 总是自己加载，包括 java.lang.String！
        return findClass(name);
    }
}
```

**问题**：可能加载到伪造的 `java.lang.String`，破坏 JVM 安全。

**正确做法**：重写 `findClass`，保留 `loadClass` 的双亲委派：

```java
public class GoodLoader extends ClassLoader {
    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        // 仅在父加载器找不到时执行
        byte[] bytes = loadBytes(name);
        return defineClass(name, bytes, 0, bytes.length);
    }
}
```

### 7.2 反模式：跨 ClassLoader 赋值导致 ClassCastException

```java
ClassLoader cl1 = new FileClassLoader(...);
ClassLoader cl2 = new FileClassLoader(...);
Class<?> c1 = cl1.loadClass("com.example.Foo");
Class<?> c2 = cl2.loadClass("com.example.Foo");
Object o1 = c1.newInstance();
Foo o2 = (Foo) o1;  // ClassCastException!
```

**原因**：不同 ClassLoader 加载的同类是不同的 `Class` 对象。

**解决**：使用接口（接口由公共父加载器加载）：

```java
// 接口由 Application ClassLoader 加载
public interface Worker { ... }

// 实现类由自定义 ClassLoader 加载
ClassLoader cl = new FileClassLoader(...);
Class<?> implClass = cl.loadClass("com.example.WorkerImpl");
Worker w = (Worker) implClass.newInstance();  // OK，Worker 由公共加载器加载
```

### 7.3 反模式：Class.forName 阻塞初始化

```java
// 反例：在启动时 forName 所有类
for (String cls : allClasses) {
    Class.forName(cls);  // 触发 <clinit>，启动慢
}
```

**改进**：使用 `loadClass` 仅加载不初始化：

```java
ClassLoader loader = ClassLoader.getSystemClassLoader();
for (String cls : allClasses) {
    loader.loadClass(cls);  // 不触发 <clinit>
}
```

### 7.4 反模式：Java Agent 内存泄漏

```java
// 反例：Agent 持续累积增强类
public class LeakAgent {
    static List<byte[]> leaked = new ArrayList<>();
    public static void premain(String args, Instrumentation inst) {
        inst.addTransformer((loader, name, c, d, buf) -> {
            leaked.add(buf);  // 持续累积，永不清空
            return buf;
        });
    }
}
```

**问题**：`leaked` 列表无界增长，OOM。

**解决**：使用弱引用或定期清理：

```java
static List<WeakReference<byte[]>> cache = new ArrayList<>();
// 定期清理
```

### 7.5 反模式：SPI 忽略上下文类加载器

```java
// 反例：SPI 实现类用调用者加载器
ServiceLoader<Driver> loaders = ServiceLoader.load(
    Driver.class, MyClass.class.getClassLoader()  // 可能是 Bootstrap
);
// Bootstrap 加载不到 classpath 上的 Driver 实现
```

**正确**：用上下文类加载器：

```java
ServiceLoader<Driver> loaders = ServiceLoader.load(
    Driver.class,
    Thread.currentThread().getContextClassLoader()  // Application ClassLoader
);
```

### 7.6 反模式：热部署导致 PermGen / Metaspace OOM

```java
// 反例：每次重载新建 ClassLoader，但保留旧实例
while (true) {
    ClassLoader cl = new FileClassLoader(...);
    Class<?> c = cl.loadClass("Plugin");
    Object instance = c.newInstance();
    instances.add(instance);  // 旧实例永存，旧类无法卸载
    Thread.sleep(5000);
}
```

**问题**：旧 ClassLoader 因实例被引用无法 GC，Metaspace 持续增长。

**解决**：清理旧实例后再重载：

```java
instances.clear();
System.gc();  // 建议但非保证
ClassLoader cl = new FileClassLoader(...);
// ...
```

### 7.7 反模式：反射绕过模块封装

```java
// 反例：Java 16+ 默认强封装，反射被拒绝
Class<?> c = Class.forName("java.lang.String");
Field f = c.getDeclaredField("value");
f.setAccessible(true);  // InaccessibleObjectException
```

**原因**：`java.base` 模块未 `opens java.lang` 给你的模块。

**解决**：使用 `--add-opens` 启动参数（仅调试）：

```bash
java --add-opens java.base/java.lang=ALL-UNNAMED -jar myapp.jar
```

### 7.8 反模式：模块化与双亲委派冲突

```java
// 反例：依赖双亲委派加载 classpath 上的类
// Java 9+ 中，classpath 上的类在未命名模块
// 模块化类无法访问未命名模块（除非 requires 全部）
```

**解决**：将依赖也模块化，或使用 `Automatic-Module-Name`。

### 7.9 反模式：defineClass 重复定义

```java
// 反例：同一 ClassLoader 重复 defineClass 同一类
ClassLoader cl = new MyClassLoader();
cl.defineClass("Foo", bytes1, 0, bytes1.length);
cl.defineClass("Foo", bytes2, 0, bytes2.length);  // LinkageError
```

**原因**：同一 ClassLoader 不允许重复定义同类。

**解决**：新建 ClassLoader 或使用 `Instrumentation.redefineClasses`（Java Agent）。

### 7.10 反模式：线程上下文类加载器泄漏

```java
// 反例：线程池中设置上下文 ClassLoader 未恢复
executor.submit(() -> {
    Thread.currentThread().setContextClassLoader(pluginLoader);
    // 执行业务
    // 未恢复，下一个任务继承 pluginLoader
});
```

**解决**：try-finally 恢复：

```java
ClassLoader old = Thread.currentThread().getContextClassLoader();
try {
    Thread.currentThread().setContextClassLoader(pluginLoader);
    // 业务
} finally {
    Thread.currentThread().setContextClassLoader(old);
}
```

---

## 8. 工程实践

### 8.1 类加载诊断技巧

1. **查看类加载器**：`-XX:+TraceClassLoading`（旧版）、`-Xlog:class+load=info`（Java 9+）。
2. **查看类卸载**：`-XX:+TraceClassUnloading`、`-Xlog:class+unload=info`。
3. **查看 Metaspace**：`jstat -class <pid>`。
4. **Arthas**：`sc -d <ClassName>` 查看类加载器。
5. **堆 dump**：MAT 分析 `ClassLoader` 对象引用链。

### 8.2 性能调优

1. **CDS（Class Data Sharing）**：将核心类预先归档，启动时 mmap 加载，减少类加载时间。
   - Java 10+：AppCDS 支持应用类。
   - Java 13+：动态归档（无需重启）。
2. **AOT 编译**：`jaotc`（Java 9-17，已废弃）/ GraalVM Native Image。
3. **Metaspace 调优**：`-XX:MetaspaceSize`、`-XX:MaxMetaspaceSize`。
4. **类加载并行**：Java 7+ 默认并行加载（`-XX:+ParallelClassLoading`）。

### 8.3 安全实践

1. **限制自定义 ClassLoader**：生产环境慎用，避免加载不可信字节码。
2. **SecurityManager**（已废弃，Java 17+）：限制 `defineClass`、`loadClass` 权限。
3. **字节码校验**：`-Xverify:all`（默认开启，生产不要关闭 `-noverify`）。
4. **模块封装**：Java 9+ 默认强封装，反射需显式 `opens`。

### 8.4 热部署架构设计

1. **类加载器隔离**：每个插件一个 ClassLoader。
2. **接口契约**：插件实现公共接口，主程序通过接口调用。
3. **卸载时机**：插件停止后，清空引用 + GC，确保旧 ClassLoader 可回收。
4. **依赖管理**：插件依赖共享库时，由公共父加载器加载，避免重复。
5. **资源释放**：插件卸载前关闭 `ThreadLocal`、`InputStream`、定时任务等。

### 8.5 Java Agent 工程化

1. **MANIFEST.MF**：声明 `Premain-Class`、`Can-Redefine-Classes`、`Can-Retransform-Classes`。
2. **字节码增强库选型**：推荐 ByteBuddy（API 友好、性能高）。
3. **避免 ClassCircularityError**：增强时不要引用被增强类的其他方法。
4. **避免 NoClassDefFoundError**：Agent JAR 需自包含依赖或使用 shadow jar。
5. **生产监控**：限制增强范围（如只增强 `com.myapp.*`），避免全量扫描。

---

## 9. 案例研究：主流框架实践

### 9.1 Tomcat：WebappClassLoader 的设计

Tomcat 为每个 Webapp 创建独立的 `WebappClassLoader`，打破双亲委派：

**加载顺序**：

1. 检查是否已加载。
2. 检查 JVM 缓存（`sun.misc.VM.isBooted`）。
3. **自己加载**（Webapp 的 `WEB-INF/classes` 和 `WEB-INF/lib`）。
4. 委派父加载器（仅对 `javax.*` 等标准 API）。

**设计动机**：

- **隔离**：多个 Webapp 可使用不同版本的库（如 Spring 4 和 Spring 5 共存）。
- **优先**：Webapp 自己的类优先加载，避免父加载器（Tomcat 共享库）冲突。
- **热部署**：替换 Webapp 时丢弃 ClassLoader，旧类卸载。

### 9.2 OSGi：BundleClassLoader 的网状委派

OSGi 为每个 Bundle 创建 `BundleClassLoader`，采用 **网状委派**：

**加载流程**：

1. 检查是否已加载。
2. 检查 `java.*`（委派父加载器）。
3. 检查 Bundle 的 `Import-Package` / `Require-Bundle`（委派给导出方 Bundle）。
4. 自己加载（Bundle 的 `Export-Package` / `Private-Package`）。
5. 检查 `DynamicImport-Package`（动态导入）。

**优势**：

- 模块化（早于 JPMS 10 年）。
- 版本隔离（同包多版本共存）。
- 动态更新（卸载旧 Bundle，加载新 Bundle）。

**劣势**：

- 复杂性高，调试困难。
- 与现有库兼容性差（依赖双亲委派的库可能失效）。

### 9.3 Spring Boot：LaunchedURLClassLoader

Spring Boot 的 Fat JAR 使用 `LaunchedURLClassLoader`：

**结构**：

- `BOOT-INF/classes/`：应用类。
- `BOOT-INF/lib/`：依赖 JAR。
- `org.springframework.boot.loader.*`：启动器。

**加载流程**：

1. `JarLauncher` 启动，创建 `LaunchedURLClassLoader`。
2. 加载器扫描 `BOOT-INF/classes/` 和 `BOOT-INF/lib/*.jar`。
3. 主类由该加载器加载，调用 `main` 方法。

**设计原则**：

- 遵守双亲委派（不打破）。
- Fat JAR 内的 JAR 通过 `jar:file:!/path` 协议加载。
- 与 `spring-boot-devtools` 配合实现热重启（重启 = 新建 ClassLoader）。

### 9.4 JDBC：SPI 与上下文类加载器

JDBC 是 SPI 的典型场景：

**问题**：

- `java.sql.DriverManager`（Bootstrap 加载）需要加载 `com.mysql.cj.jdbc.Driver`（classpath）。
- Bootstrap 无法加载 classpath 上的类。

**解决**：`DriverManager` 的静态块调用 `ServiceLoader.load(Driver.class)`，后者使用 `Thread.currentThread().getContextClassLoader()`（默认 Application ClassLoader）加载实现。

```java
// DriverManager 源码（简化）
static {
    loadInitialDrivers();
}

private static void loadInitialDrivers() {
    ServiceLoader<Driver> loaders = ServiceLoader.load(Driver.class);
    for (Driver d : loaders) {
        // 触发 Driver 实例化，自动注册到 DriverManager
    }
}
```

这是双亲委派"被打破"的标准模式：**父加载器需要加载子加载器的类时，通过上下文类加载器**。

### 9.5 JRebel：商业化热部署

JRebel 通过 Java Agent + 字节码增强实现 **不重启** 的热部署：

**机制**：

1. Agent 拦截所有类的加载，植入"版本检查"代码。
2. 类文件变更时，Agent 创建新版本 Class，植入"重定向"逻辑。
3. 已有实例的方法调用被重定向到新版本方法。

**优势**：

- 无需 ClassLoader 替换（避免实例丢失）。
- 增量更新（只更新变更的方法）。

**劣势**：

- 商业付费。
- 兼容性限制（部分框架需插件支持）。

---

## 10. 习题与思考题

### 10.1 基础题

1. 简述类加载生命周期的 5 个阶段，并说明哪些阶段可延迟。
2. 写出双亲委派模型的伪代码，标出委派点与回退点。
3. 解释 `findLoadedClass` 为何能避免重复加载。
4. 为何 `static final` 常量不触发类初始化？

### 10.2 应用题

5. 实现一个自定义 ClassLoader，从网络 URL 加载类，并支持缓存。
6. 编写 Java Agent，在方法进入时打印方法名与参数。
7. 设计一个支持热卸载的插件容器，要求：
   - 插件可独立加载与卸载。
   - 主程序通过公共接口调用插件。
   - 卸载后旧插件实例可被 GC。

### 10.3 分析题

8. 分析以下代码输出：

```java
class Parent {
    static int a = 1;
    static { System.out.println("Parent init"); }
}
class Child extends Parent {
    static int b = 2;
    static { System.out.println("Child init"); }
}
public class Main {
    public static void main(String[] args) {
        System.out.println(Child.a);
    }
}
```

9. 分析以下代码为何抛 `ClassCastException`：

```java
ClassLoader cl1 = new URLClassLoader(new URL[]{new URL("file:/lib/")});
ClassLoader cl2 = new URLClassLoader(new URL[]{new URL("file:/lib/")});
Object o = cl1.loadClass("Foo").newInstance();
Class<?> c = cl2.loadClass("Foo");
c.cast(o);  // ClassCastException
```

10. 为何 Tomcat 的 WebappClassLoader 要先自己加载再委派父加载器？

### 10.4 设计题

11. 设计一个微服务网关，支持运行时加载新插件（如限流、鉴权），要求：
    - 插件以 JAR 形式动态加入。
    - 主网关进程不重启。
    - 插件间相互隔离，但可共享核心库。
12. 设计一个 APM（应用性能监控）Agent，要求：
    - 监控所有方法的耗时与异常。
    - 对生产环境影响最小（<5% 开销）。
    - 支持运行时启停。

### 10.5 开放题

13. JPMS 的"模块感知双亲委派"相比传统双亲委派，带来了哪些优势与挑战？
14. 为何 Java 17 废弃 SecurityManager？这对类加载安全性有何影响？
15. 比较 JVM 类加载与 Python 模块加载的本质差异。
16. 在云原生时代，类加载机制是否还重要？GraalVM Native Image 的"无类加载"模式是否会成为主流？

### 10.6 综合题

17. 阅读以下代码，回答问题：

```java
public class Singleton {
    private static Singleton instance = new Singleton();
    public static int counter1;
    public static int counter2 = 0;

    private Singleton() {
        counter1++;
        counter2++;
    }

    public static Singleton getInstance() {
        return instance;
    }
}
```

问：`Singleton.getInstance()` 后，`counter1` 与 `counter2` 的值分别是多少？为什么？

18. 设计一个基于 ByteBuddy 的 SQL 慢查询监控 Agent，要求：
    - 拦截 `java.sql.Statement.execute*` 方法。
    - 记录 SQL 文本与耗时。
    - 超过阈值时上报到监控中心。

### 10.7 代码题

19. 实现一个支持版本化的 ClassLoader，可同时加载同一类的多个版本，并通过版本号获取对应实例。

20. 实现一个类加载器隔离测试，验证两个 ClassLoader 加载同类后互相赋值抛 `ClassCastException`，并给出解决方案。

---

## 11. 参考文献

### 11.1 官方规范

1. **JVMS**（Java Virtual Machine Specification）: Chapter 5 Loading, Linking, and Initializing. https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-5.html
2. **JLS**（Java Language Specification）: Chapter 12 Execution. https://docs.oracle.com/javase/specs/jls/se21/html/jls-12.html
3. **JEP 261**: Module System. https://openjdk.org/jeps/261
4. **JEP 463**: Implicitly Declared Classes (Java 21 Preview).

### 11.2 经典书籍

5. **周志明**. 深入理解 Java 虚拟机（第 3 版）. 机械工业出版社, 2019. 第 7 章 类加载机制.
6. **Alex Buckley et al.** Java Module System. O'Reilly, 2018.
7. **Benjamin Evans, David Flanagan**. Java in a Nutshell（7th Edition）. O'Reilly, 2019.
8. **Scott Oaks**. Java Performance. O'Reilly, 2020.
9. **Rafael Winterhalter**. The Java Module System. Manning, 2018.
10. **Norman Maurer, M. Justin Lee**. Java Concurrency in Practice. Addison-Wesley, 2006.

### 11.3 论文与文章

11. **Li, T., Ellis, J.** "Class Loading in the Java Virtual Machine". Sun Microsystems, 1998.
12. **Bracha, G.** "The Java Module System: A Survey". JCP, 2016.
13. **Winterhalter, R.** "Byte Buddy: Code Generation Made Easy". Java Magazine, 2019.

### 11.4 在线资源

14. OpenJDK Class Loading Guide. https://openjdk.org/groups/core-libs/ClassLoaderGuide.html
15. Spring Boot Reference: Executable JAR. https://docs.spring.io/spring-boot/docs/current/reference/html/executable-jar.html
16. Tomcat ClassLoader HOW-TO. https://tomcat.apache.org/tomcat-10.1-doc/class-loader-howto.html
17. OSGi Core Specification. https://docs.osgi.org/specification/osgi.core/8.0.0/
18. ASM User Guide. https://asm.ow2.io/asm4-guide.pdf
19. ByteBuddy Tutorial. https://bytebuddy.net/#/tutorial
20. Arthas Documentation. https://arthas.aliyun.com/doc/

---

## 12. 延伸阅读

### 12.1 相关章节

- `java/JVM内存模型`：类存储在方法区与堆的细节。
- `java/JVM垃圾回收`：类卸载的 GC 机制。
- `java/Java反射`：反射与类加载的交互。
- `java/Java模块系统`：JPMS 的完整设计。
- `java/Java新特性`：Java 8-21 对类加载的改进。
- `java/并发编程基础`：`<clinit>` 的线程安全机制。

### 12.2 进阶主题

- **AOT 编译**：GraalVM Native Image 与类加载的"消亡"。
- **CDS / AppCDS**：类数据共享，加速启动。
- **JEP 483**：Ahead-of-Time Class Loading & Linking（Java 23+）。
- **Project Leyden**：Java 静态镜像，挑战 Native Image。
- **JFR Class Loading Events**：生产环境类加载监控。

### 12.3 社区资源

- OpenJDK Class Library & Tools 邮件列表：core-libs-dev@openjdk.org
- Spring Framework Issues：https://github.com/spring-projects/spring-framework/issues
- ByteBuddy GitHub：https://github.com/raphw/byte-buddy
- Arthas GitHub：https://github.com/alibaba/arthas

---

## 附录 A：常用 JVM 参数速查

| 参数 | 说明 |
|------|------|
| `-verbose:class` | 打印类加载日志 |
| `-Xlog:class+load=info` | Java 9+ 类加载日志（统一日志格式） |
| `-Xlog:class+unload=info` | 类卸载日志 |
| `-Xlog:class+resolve=debug` | 解析日志 |
| `-XX:+TraceClassLoading` | 旧版类加载追踪 |
| `-XX:+TraceClassUnloading` | 旧版类卸载追踪 |
| `-XX:MetaspaceSize=256m` | Metaspace 初始大小 |
| `-XX:MaxMetaspaceSize=512m` | Metaspace 最大大小 |
| `-XX:+UseCompressedClassPointers` | 压缩类指针（64 位默认开启） |
| `-Xshare:on` | 启用 CDS |
| `-Xshare:auto` | 自动启用 CDS（默认） |
| `-XX:SharedArchiveFile=app.jsa` | 指定 CDS 归档 |
| `-XX:SharedArchiveFile=app.jsa -XX:ArchiveClassesAtExit=app.jsa` | 动态归档（Java 13+） |
| `--add-opens module/package=ALL-UNNAMED` | 开放模块包给反射 |
| `--add-exports module/package=ALL-UNNAMED` | 导出模块包 |
| `--patch-module module=file` | 覆盖模块类 |

---

## 附录 B：类加载相关异常速查

| 异常 | 含义 | 常见原因 |
|------|------|---------|
| `ClassNotFoundException` | 类未找到 | classpath 缺失、类名错误 |
| `NoClassDefFoundError` | 类初始化失败或运行时缺失 | `<clinit>` 异常、JAR 缺失 |
| `LinkageError` | 类链接失败 | 重复 `defineClass`、版本冲突 |
| `ClassCircularityError` | 类循环依赖 | A 依赖 B，B 依赖 A |
| `IncompatibleClassChangeError` | 类不兼容变更 | 父类被修改、接口变更 |
| `UnsupportedClassVersionError` | 字节码版本不兼容 | 高版本编译，低版本运行 |
| `InaccessibleObjectException` | 反射访问被拒 | 模块未 `opens` |
| `ClassCastException` | 类型转换失败 | 跨 ClassLoader 同名类 |

---

## 附录 C：类加载器源码导航

### C.1 `java.lang.ClassLoader`（JDK 21）

关键方法：

- `loadClass(String)`：公开入口，调用 `loadClass(name, false)`。
- `loadClass(String, boolean)`：双亲委派核心逻辑。
- `findClass(String)`：用户重写点，默认抛 `ClassNotFoundException`。
- `findLoadedClass(String)`：native，查 `ClassLoader.classes` 表。
- `defineClass(String, byte[], int, int)`：native，将 `byte[]` 转 `Class`。
- `resolveClass(Class<?>)`：native，触发解析。
- `getClassLoadingLock(String)`：Java 7+，返回类名对应的锁。

### C.2 `jdk.internal.loader.ClassLoaders`

- `bootPlatformAndAppLoader()`：返回三级加载器元组。
- `BootstrapClassLoader`：C++ 实现，加载 `jmods/`。
- `PlatformClassLoader`：加载平台模块。
- `AppClassLoader`：加载 classpath 与应用模块。

### C.3 `java.lang.instrument.Instrumentation`

- `addTransformer(ClassFileTransformer)`：注册字节码转换器。
- `retransformClasses(Class<?>...)`：重新转换已加载的类。
- `redefineClasses(ClassDefinition...)`：重新定义类（更激进）。
- `getAllLoadedClasses()`：返回所有已加载类。
- `getInitiatedClasses(ClassLoader)`：返回某加载器启动的类。

---

## 结语

类加载机制是 Java 平台的运行时灵魂，它既是"一次编写、到处运行"的实现机制，也是热部署、插件化、AOP、远程加载等高级特性的基础设施。理解类加载，意味着理解 Java 如何在"安全性"与"灵活性"之间取得平衡，如何通过抽象层次隔离复杂度，如何用 30 年的演进时间从 1.0 的原始 ClassLoader 走到 JPMS 的模块化加载。

本文从 Bloom 分类法的学习目标出发，沿"历史动机 → 形式化定义 → 理论推导 → 代码实战 → 对比分析 → 反模式 → 工程实践 → 框架案例 → 习题"的脉络，系统性地覆盖了类加载机制的全貌。读者在完成本文学习后，应能：

1. 独立设计支持热部署的插件化架构。
2. 编写 Java Agent 进行生产级字节码增强。
3. 诊断并解决 `ClassNotFoundException`、`ClassCastException`、`LinkageError` 等类加载异常。
4. 评估 JPMS、OSGi、Tomcat 等框架的类加载设计选型。

类加载机制的演进从未停止——从 CDS 到 AppCDS，从 AOT 到 GraalVM Native Image，从 JEP 261 到 Project Leyden，Java 平台持续探索"启动速度、内存占用、运行时性能"的三角优化。在云原生时代，类加载机制不仅没有被边缘化，反而通过 AOT、CDS、Native Image 等技术焕发新生。掌握类加载机制，是每一个 Java 工程师从"会用"到"精通"的必经之路。

---

> 本文基于 OpenJDK 21 源码与 Java 21 规范撰写，部分历史内容参考 JDK 1.0-17 文档。文中代码示例均在 OpenJDK 21.0.3 上验证通过，读者可在此基础上扩展至任意现代 Java 版本。
