---
title: 'JVM 内存模型'
module: 'java'
category: 'Java Advanced'
order: 170
tags:
  - 'java'
  - 'memory'
difficulty: 'advanced'
description: '运行时数据区、垃圾回收算法与内存调优。'
---

## 前置知识

- Java 基本语法与面向对象
- 进程与线程的基本概念

## 核心概念

### 一句话总结

JVM 内存模型定义了 Java 程序运行时的内存分区规则，以及线程间共享变量的可见性与有序性保障机制。

### 通俗理解

把 JVM 想象成一栋办公楼：堆是公共办公区（所有人共享），栈是每个人的独立工位（私有），方法区是公共资料室。而 Java 内存模型（JMM）则是这栋楼的"通信规范"——规定了不同楼层（线程）之间如何看到彼此写在白板上的信息。

## 详细内容

### 1. 运行时数据区

| 区域                      | 线程共享 | 存储内容                     | 异常               |
| ------------------------- | -------- | ---------------------------- | ------------------ |
| 堆 (Heap)                 | 是       | 对象实例、数组               | OutOfMemoryError   |
| 方法区 (Method Area)      | 是       | 类信息、常量、静态变量       | OutOfMemoryError   |
| 虚拟机栈 (VM Stack)       | 否       | 栈帧（局部变量表、操作数栈） | StackOverflowError |
| 本地方法栈 (Native Stack) | 否       | Native 方法调用              | StackOverflowError |
| 程序计数器 (PC Register)  | 否       | 当前执行的字节码行号         | 无                 |

**堆 (Heap)** 是 JVM 中最大的一块内存区域，所有对象实例和数组都在堆上分配。堆是垃圾回收器管理的主要区域，也被称为 GC 堆。堆可以处于物理上不连续的内存空间中，但逻辑上应该被视为连续的。

**方法区 (Method Area)** 用于存储已被虚拟机加载的类信息、常量、静态变量等数据。JDK 8 之前使用永久代实现，JDK 8 之后改为元空间 (Metaspace)，使用本地内存而非 JVM 堆内存。

**虚拟机栈 (VM Stack)** 描述的是 Java 方法执行的内存模型：每个方法执行时会创建一个栈帧，存储局部变量表、操作数栈、动态链接和方法出口等信息。栈深度超过限制会抛出 StackOverflowError。

**程序计数器** 是一块较小的内存空间，可以看作是当前线程所执行的字节码的行号指示器。这是唯一一个不会发生 OutOfMemoryError 的区域。

### 2. 堆内存分代

现代 JVM 采用分代收集算法，将堆分为不同区域：

**新生代 (Young Generation)** 占堆空间的 1/3，分为三个区域：

- **Eden 区**：新对象首先在 Eden 区分配，占新生代的 80%
- **Survivor 0 (From)**：存活对象的中转站，占 10%
- **Survivor 1 (To)**：与 Survivor 0 交替使用，占 10%

新对象在 Eden 区分配，当 Eden 区满时触发 Minor GC，存活对象被复制到 Survivor 区。经过多次 GC 仍然存活的对象（默认 15 次）晋升到老年代。

**老年代 (Old Generation)** 占堆空间的 2/3，存放长期存活的对象和大对象。老年代满时触发 Major GC / Full GC，回收速度比 Minor GC 慢很多。

**元空间 (Metaspace)** 是 JDK 8+ 中对方法区的替代实现，使用本地内存而非 JVM 堆内存，默认没有上限（受物理内存限制），可通过 `-XX:MaxMetaspaceSize` 设置。

### 3. Java 内存模型 (JMM)

Java 内存模型 (Java Memory Model) 是 Java 虚拟机规范中定义的一种抽象模型，用来屏蔽各种硬件和操作系统的内存访问差异，以实现让 Java 程序在各种平台下都能达到一致的内存访问效果。

**主内存与工作内存**：

- **主内存**：存储所有共享变量的值
- **工作内存**：每个线程私有，存储主内存中共享变量的副本
- 线程对变量的所有操作必须在工作内存中进行，不能直接读写主内存

**三大特性**：

1. **可见性 (Visibility)**：当一个线程修改了共享变量，其他线程能够立即得知这个修改。`volatile` 关键字保证可见性，它强制将修改的值立即写回主内存，并使其他线程的工作内存中的缓存失效。

2. **有序性 (Ordering)**：程序执行的顺序按照代码的先后顺序。`happens-before` 原则定义了操作之间的偏序关系：
   - 程序次序规则：同一线程中，前面的操作 happens-before 后面的操作
   - 锁定规则：unlock 操作 happens-before 对同一锁的 lock 操作
   - volatile 规则：volatile 写 happens-before 对同一变量的读
   - 传递性：A happens-before B，B happens-before C，则 A happens-before C

3. **原子性 (Atomicity)**：基本数据类型的访问读写是原子性的，更大范围的原子性需要 `synchronized` 或 `java.util.concurrent.atomic` 包来保证。

### 4. 垃圾回收基础

**判断对象存活**：

- **引用计数法**：给对象添加引用计数器，引用加 1，失效减 1。无法解决循环引用问题
- **可达性分析**：从 GC Roots 出发，沿引用链搜索，不可达的对象即为可回收对象。GC Roots 包括：虚拟机栈中引用的对象、方法区中类静态属性引用的对象、方法区中常量引用的对象、本地方法栈中 JNI 引用的对象

**GC 算法**：

| 算法      | 原理                       | 优点           | 缺点           |
| --------- | -------------------------- | -------------- | -------------- |
| 标记-清除 | 标记存活对象，清除未标记的 | 实现简单       | 内存碎片多     |
| 标记-复制 | 将存活对象复制到另一半空间 | 无碎片，效率高 | 可用内存减半   |
| 标记-整理 | 标记后将存活对象向一端移动 | 无碎片         | 移动对象开销大 |

**常见垃圾收集器**：

| 收集器            | 作用区域 | 算法      | 特点                     |
| ----------------- | -------- | --------- | ------------------------ |
| Serial            | 新生代   | 标记-复制 | 单线程，适合客户端模式   |
| ParNew            | 新生代   | 标记-复制 | Serial 的多线程版本      |
| Parallel Scavenge | 新生代   | 标记-复制 | 吞吐量优先               |
| CMS               | 老年代   | 标记-清除 | 低延迟，但有碎片问题     |
| G1                | 全堆     | 标记-整理 | 分区收集，可预测停顿时间 |
| ZGC               | 全堆     | 着色指针  | 超低延迟，JDK 11+        |

### 5. 常见 JVM 参数

```bash
-Xms512m                          # 初始堆大小
-Xmx2g                            # 最大堆大小
-Xmn256m                          # 新生代大小
-XX:MetaspaceSize=256m            # 元空间初始大小
-XX:MaxMetaspaceSize=512m         # 元空间最大大小
-XX:+UseG1GC                      # 使用 G1 收集器
-XX:MaxGCPauseMillis=200          # G1 目标最大停顿时间
-XX:+PrintGCDetails               # 打印 GC 详细信息
-XX:+HeapDumpOnOutOfMemoryError   # OOM 时生成堆转储
```

### 6. 内存调优实践

**常见问题与排查**：

1. **OutOfMemoryError: Java heap space**：堆内存不足，检查是否存在内存泄漏或增大 `-Xmx`
2. **OutOfMemoryError: Metaspace**：元空间不足，检查是否有大量动态类生成
3. **StackOverflowError**：栈深度超限，检查是否存在递归调用过深

**调优步骤**：

1. 使用 `jstat` 观察 GC 统计信息
2. 使用 `jmap` 生成堆转储文件
3. 使用 `jvisualvm` 或 MAT 分析堆转储
4. 根据分析结果调整 JVM 参数

## 知识延伸

- [Java 多线程与并发](/FANDEX/java/multithreading/)
- [Java 概述](/FANDEX/java/overview/)
