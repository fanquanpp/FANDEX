---
title: 'JVM 内存模型'
module: 'java'
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

> 本篇内容待完善，以下为框架概要。

### 1. 运行时数据区

| 区域                      | 线程共享 | 存储内容                     | 异常               |
| ------------------------- | -------- | ---------------------------- | ------------------ |
| 堆 (Heap)                 | 是       | 对象实例、数组               | OutOfMemoryError   |
| 方法区 (Method Area)      | 是       | 类信息、常量、静态变量       | OutOfMemoryError   |
| 虚拟机栈 (VM Stack)       | 否       | 栈帧（局部变量表、操作数栈） | StackOverflowError |
| 本地方法栈 (Native Stack) | 否       | Native 方法调用              | StackOverflowError |
| 程序计数器 (PC Register)  | 否       | 当前执行的字节码行号         | 无                 |

### 2. 堆内存分代

- 新生代 (Young Generation): Eden + Survivor 0 + Survivor 1
- 老年代 (Old Generation): 长期存活对象
- 元空间 (Metaspace): JDK 8+ 替代永久代

### 3. Java 内存模型 (JMM)

- 主内存 (Main Memory): 共享变量存储
- 工作内存 (Working Memory): 线程私有副本
- 三大特性: 可见性 (volatile)、有序性 (happens-before)、原子性 (synchronized/Atomic)

### 4. 垃圾回收基础

- 判断存活: 引用计数法 / 可达性分析
- GC 算法: 标记-清除、标记-复制、标记-整理
- 常见收集器: Serial, Parallel, CMS, G1, ZGC

## 知识延伸

- [Java 多线程与并发](/MyNotebook/java/multithreading)
- [JVM 调优实战](/MyNotebook/java/overview)
