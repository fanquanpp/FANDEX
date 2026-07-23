---
order: 14
title: 设计模式详解
module: 'software-engineering'
category: 'eng-infra'
difficulty: advanced
description: 23种GoF设计模式分类、原理与应用场景。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'software-engineering/需求分析方法'
  - 'software-engineering/UML图详解'
  - 'software-engineering/代码重构'
  - 'software-engineering/软件测试方法'
prerequisites: []
---

## 1. 设计模式概述

### 1.1 三大分类

| 类型   | 数量 | 关注点       |
| :----- | :--- | :----------- |
| 创建型 | 5    | 对象创建机制 |
| 结构型 | 7    | 对象组合方式 |
| 行为型 | 11   | 对象间通信   |

### 1.2 设计原则

| 原则            | 说明                   |
| :-------------- | :--------------------- |
| 单一职责（SRP） | 一个类只有一个变化原因 |
| 开闭原则（OCP） | 对扩展开放，对修改关闭 |
| 里氏替换（LSP） | 子类可以替换父类       |
| 接口隔离（ISP） | 接口应该小而专         |
| 依赖倒置（DIP） | 依赖抽象而非具体       |
| 迪米特法则      | 最少知识原则           |

## 2. 创建型模式

### 2.1 单例模式（Singleton）

确保一个类只有一个实例：

```java
// 双重检查锁
public class Singleton {
    private static volatile Singleton instance;
    private Singleton() {}
    public static Singleton getInstance() {
        if (instance == null) {
            synchronized (Singleton.class) {
                if (instance == null) {
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

### 2.2 工厂方法模式（Factory Method）

定义创建对象的接口，让子类决定实例化哪个类：

```
Product ←── ConcreteProduct
   ▲
   │
Creator ──→ FactoryMethod()
   ▲
   │
ConcreteCreator ──→ FactoryMethod() → ConcreteProduct
```

### 2.3 抽象工厂模式（Abstract Factory）

创建一组相关对象的接口：

```
AbstractFactory
├── createProductA()
└── createProductB()
     ▲
     │
ConcreteFactory1 → ProductA1, ProductB1
ConcreteFactory2 → ProductA2, ProductB2
```

### 2.4 建造者模式（Builder）

分步骤构建复杂对象：

```java
User user = User.builder()
    .name("张三")
    .age(25)
    .email("zhangsan@example.com")
    .build();
```

### 2.5 原型模式（Prototype）

通过克隆创建对象：

```java
public class Prototype implements Cloneable {
    public Prototype clone() {
        return (Prototype) super.clone();
    }
}
```

## 3. 结构型模式

### 3.1 适配器模式（Adapter）

将一个类的接口转换为客户期望的接口：

```
Client → [Target接口] ← [Adapter] → [Adaptee]
```

### 3.2 装饰器模式（Decorator）

动态地给对象添加职责：

```
Component ←── Decorator
   ▲            ▲
   │            │
ConcreteComponent  ConcreteDecorator
```

```java
InputStream in = new FileInputStream("file.txt");
in = new BufferedInputStream(in);    // 装饰：缓冲
in = new GZIPInputStream(in);         // 装饰：解压
```

### 3.3 代理模式（Proxy）

控制对对象的访问：

| 代理类型 | 说明                     |
| :------- | :----------------------- |
| 虚拟代理 | 延迟创建开销大的对象     |
| 远程代理 | 为远程对象提供本地代表   |
| 保护代理 | 控制访问权限             |
| 智能引用 | 添加额外操作（引用计数） |

### 3.4 其他结构型模式

| 模式              | 意图                 |
| :---------------- | :------------------- |
| 外观（Facade）    | 为子系统提供统一接口 |
| 桥接（Bridge）    | 分离抽象与实现       |
| 组合（Composite） | 树形结构统一处理     |
| 享元（Flyweight） | 共享对象减少内存     |

## 4. 行为型模式

### 4.1 观察者模式（Observer）

定义对象间一对多的依赖关系：

```
Subject
├── attach(observer)
├── detach(observer)
└── notify() ──→ Observer.update()
                    ▲
        ┌───────────┼───────────┐
   ConcreteObserver1  ConcreteObserver2
```

### 4.2 策略模式（Strategy）

定义算法族，封装后使它们可以互换：

```java
interface SortStrategy {
    void sort(int[] array);
}

class QuickSort implements SortStrategy { ... }
class MergeSort implements SortStrategy { ... }

class Sorter {
    private SortStrategy strategy;
    public void setStrategy(SortStrategy s) { this.strategy = s; }
    public void sort(int[] arr) { strategy.sort(arr); }
}
```

### 4.3 模板方法模式（Template Method）

定义算法骨架，子类实现具体步骤：

```java
abstract class DataProcessor {
    public final void process() {  // 模板方法
        readData();
        transformData();
        writeData();
    }
    protected abstract void readData();
    protected abstract void transformData();
    protected void writeData() { /* 默认实现 */ }
}
```

### 4.4 其他行为型模式

| 模式                              | 意图                         |
| :-------------------------------- | :--------------------------- |
| 命令（Command）                   | 将请求封装为对象             |
| 迭代器（Iterator）                | 顺序访问集合元素             |
| 中介者（Mediator）                | 集中管理对象间交互           |
| 备忘录（Memento）                 | 保存和恢复对象状态           |
| 状态（State）                     | 允许对象在状态改变时改变行为 |
| 职责链（Chain of Responsibility） | 沿链传递请求                 |
| 访问者（Visitor）                 | 在不改变类的前提下添加操作   |
| 解释器（Interpreter）             | 定义语言的文法及解释器       |

## 5. 模式选择指南

| 问题              | 推荐模式          |
| :---------------- | :---------------- |
| 需要唯一实例      | 单例              |
| 创建对象逻辑复杂  | 工厂方法/抽象工厂 |
| 分步构建复杂对象  | 建造者            |
| 接口不兼容        | 适配器            |
| 动态添加功能      | 装饰器            |
| 一对多依赖        | 观察者            |
| 算法可替换        | 策略              |
| 算法骨架固定      | 模板方法          |
| 请求需要排队/撤销 | 命令              |
| 状态驱动的行为    | 状态              |
