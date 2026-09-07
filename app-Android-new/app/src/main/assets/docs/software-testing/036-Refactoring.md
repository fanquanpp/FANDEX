---
order: 360
title: 代码重构
module: 'software-testing'
category: 云与基础设施
difficulty: intermediate
description: 代码重构原则、常用重构手法与代码坏味道识别。
author: fanquanpp
updated: '2026-08-02'
related:
  - 'software-testing/034-UMLGraphDetailed'
  - 'software-testing/035-DesignPatternDetailed'
  - 'software-testing/037-SoftwareMetrics'
prerequisites:
  - 'software-testing/031-SoftwareEngineeringOverview'
---


## 1. 从"整理房间"说起

### 1.1 为什么代码需要"整理"

想象你的房间：一开始很整洁，但随着时间推移，东西越堆越多——衣服乱放、书散各处、杂物堆积。房间还能用（你还能找到东西），但找东西越来越慢，你越来越不想待在里面。

**代码也一样**。刚写完时结构清晰，但随着功能迭代、需求变更、多人协作，代码会逐渐"变乱"——重复的片段、过长的函数、混乱的命名。代码还能跑（功能正常），但**改起来越来越难、越来越容易出错**。

**重构（Refactoring）就是"整理房间"**：在不改变代码功能的前提下，调整代码内部结构，让它更清晰、更易维护。**就像整理房间不改变"你有哪些东西"，只改变"东西怎么摆放"。**

### 1.2 重构的定义

> **重构是在不改变代码外在行为的前提下，对代码内部结构进行调整，使其更易理解和修改。（Martin Fowler）**

**两个关键约束**：

1. **不改变外在行为**：功能不变，测试应该全部通过
2. **改善内部结构**：更易读、更易改、更易扩展

**重构 ≠ 重写**：重构是小步调整（一次改一处），重写是推倒重来。重构是"低成本持续改善"，重写是"高成本冒险"。

## 2. 重构的时机：什么时候该重构

### 2.1 四个经典时机

| 时机 | 说明 |
| :--- | :--- |
| 三次法则 | 第三次做类似的事时重构（第一次就做，第二次复制，第三次提取） |
| 添加功能时 | 先重构使添加更容易（"先打扫房间再放新家具"） |
| 修复 Bug 时 | 让代码更易理解，从而找到 bug 根源 |
| Code Review 时 | 团队共同改进（见 039-engineering-practices《代码审查清单》） |

### 2.2 重构与测试

**重构的安全保障是测试**。没有测试的重构 = 蒙眼开车：

```
重构循环:
1. 确保有测试覆盖（先建安全网）
2. 小步重构（一次只做一种手法）
3. 每步后运行测试
4. 测试通过则继续，失败则回退
```

**铁律**：重构前必须确认测试存在且通过。如果代码没有测试，先补测试，再重构。

## 3. 代码坏味道：怎么发现"该重构了"

"坏味道（Code Smell）"是代码需要重构的信号——它不一定是 bug，但预示着"将来会出问题"。以下是 13 种最常见坏味道（源自 Martin Fowler《重构》一书）：

| 坏味道 | 症状 | 重构手法 |
| :--- | :--- | :--- |
| 重复代码 | 相同/相似代码多处出现 | 提取方法、上移方法 |
| 过长方法 | 方法超过 20 行 | 提取方法、以查询替代临时变量 |
| 过大类 | 类承担过多职责 | 提取类、提取子类 |
| 过长参数列表 | 参数超过 4 个 | 引入参数对象、保持对象完整 |
| 发散式变化 | 一个类因多种原因变化 | 提取类 |
| 霰弹式修改 | 一个变化需改多个类 | 移动方法/字段、内联类 |
| 依恋情结 | 方法过度使用其他类数据 | 移动方法、提取方法 |
| 数据泥团 | 多个字段总是一起出现 | 提取类 |
| 基本类型偏执 | 用基本类型代替小对象 | 引入参数对象、以对象替代数据值 |
| switch 语句 | 重复的 switch/case | 以多态替代条件表达式 |
| 临时字段 | 某些字段只在特定情况下使用 | 提取类 |
| 消息链 | a.b().c().d() | 隐藏委托、提取方法 |
| 中间人 | 类只是委托给其他类 | 移除中间人、内联方法 |

**最常见的三种**（新手最先要掌握的）：

1. **重复代码**：同一个逻辑写了多遍 → 改一处漏一处
2. **过长方法**：一个方法几百行 → 读不懂、难测试
3. **过长参数列表**：参数一大串 → 容易传错、难扩展

## 4. 常用重构手法

### 4.1 提取方法（Extract Method）——最常用的手法

把一段代码提取成独立方法，让方法名表达意图：

```java
// 重构前：printOwing 做了三件事
void printOwing() {
    // 打印横幅
    System.out.println("***********");
    System.out.println("** Owing **");
    System.out.println("***********");
    // 计算并打印金额
    double outstanding = 0.0;
    for (Order o : orders) {
        outstanding += o.getAmount();
    }
    System.out.println("name: " + name);
    System.out.println("amount: " + outstanding);
}

// 重构后：每个方法只做一件事
void printOwing() {
    printBanner();
    double outstanding = getOutstanding();
    printDetails(outstanding);
}
```

**核心标准**：一个方法应该"只做一件事"。如果一段代码能用一个名字概括（"打印横幅"），它就应该是一个独立方法。

### 4.2 以查询替代临时变量（Replace Temp with Query）

把临时变量变成方法，避免重复计算、提高可读性：

```java
// 重构前
double getPrice() {
    double basePrice = quantity * itemPrice;
    if (basePrice > 1000) {
        return basePrice * 0.95;
    }
    return basePrice * 0.98;
}

// 重构后
double getPrice() {
    if (basePrice() > 1000) {
        return basePrice() * 0.95;
    }
    return basePrice() * 0.98;
}
double basePrice() { return quantity * itemPrice; }
```

### 4.3 以多态替代条件表达式（Replace Conditional with Polymorphism）

用"多态"替代复杂的 switch/case 或 if/else：

```java
// 重构前：switch 处理不同类型
double getSpeed() {
    switch (type) {
        case EUROPEAN: return getBaseSpeed();
        case AFRICAN: return getBaseSpeed() - getLoadFactor() * numberOfCoconuts;
        case NORWEGIAN_BLUE: return isNailed ? 0 : getBaseSpeed(voltage);
    }
}

// 重构后：每种鸟是一个子类，自己实现 getSpeed
abstract class Bird {
    abstract double getSpeed();
}
class EuropeanBird extends Bird {
    double getSpeed() { return getBaseSpeed(); }
}
class AfricanBird extends Bird {
    double getSpeed() { return getBaseSpeed() - getLoadFactor() * numberOfCoconuts; }
}
```

**为什么这样更好**：新增一种鸟时，只需新增一个子类，不需要修改现有代码（符合"开闭原则"）。

### 4.4 其他常用手法

| 手法 | 说明 |
| :--- | :--- |
| 重命名方法/变量 | 使名称表达意图（最便宜的重构） |
| 内联方法 | 方法体比方法名更清晰时 |
| 移动方法 | 将方法移到更合适的类 |
| 提取接口 | 从类中提取公共接口 |
| 以工厂方法替代构造函数 | 更灵活的对象创建 |
| 封装字段 | 将 public 字段改为 private + getter/setter |
| 分解条件表达式 | 提取条件判断为独立方法 |

## 5. 重构安全策略

### 5.1 小步重构

```
每次只做一种重构 → 运行测试 → 确认通过 → 下一步
```

**为什么必须小步**：一次只改一处，如果测试失败，能立刻知道是"哪一步"引入的问题。大步重构（一次改 10 处）失败时，无法定位错误来源。

### 5.2 重构检查清单

| 检查项 | 说明 |
| :--- | :--- |
| 测试覆盖 | 重构前确保有测试 |
| 行为不变 | 重构不改变外部行为 |
| 版本控制 | 每步重构单独提交 |
| 持续集成 | 每步后 CI 通过 |
| 代码审查 | 重构后进行 Review |

### 5.3 借助工具

现代 IDE（VS Code、IntelliJ）内置了大量重构工具：

- **自动重命名**：改一个变量名，所有引用同步更新
- **提取方法**：选中代码 → 自动提取为方法
- **提取变量**：把魔法数字/表达式提取为命名常量

**用工具的重构，比手改安全得多**——工具保证"所有引用都更新"，手改容易漏。

## 6. 常见误区

**误区一：重构 = 重写。** → 重构是小步调整、行为不变；重写是推倒重来。重构风险低、可持续；重写风险高、要谨慎。

**误区二：没有测试也能重构。** → 重构没有测试保护就像"蒙眼开车"。先补测试，再重构。

**误区三：重构是"代码不干净"的人才需要的。** → 任何代码都会随着迭代"变臭"。重构是日常活动（如同扫地），不是"惩罚"。

**误区四：重构会浪费时间、拖慢进度。** → 恰恰相反：代码越乱，后面改功能越慢。**重构是"投资"，短期的"慢"换长期的"快"。** 马丁·福勒的名言：如果领导说"没时间重构"，那是在说"没时间把代码保持干净"。

**误区五：重构一定要用设计模式。** → 重构的核心是"让代码清晰"，不是"套模式"。为重构而引入设计模式（过度设计）违背了 YAGNI 原则。
