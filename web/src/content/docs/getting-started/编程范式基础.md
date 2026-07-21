---
order: 59
title: 编程范式基础
module: 'getting-started'
category: 入门指南
difficulty: beginner
description: 三大编程范式：面向对象、函数式、声明式的核心思想与代码实践。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'getting-started/项目初始化'
  - 'getting-started/构建工具'
  - 'getting-started/调试思想'
prerequisites:
  - 'getting-started/入门指南'
---

## 1. 编程范式概述

### 1.1 什么是编程范式

编程范式是编程的**风格和思想体系**，它决定了你如何组织代码、思考问题和解决问题。不同的范式提供不同的抽象模型：

- **面向对象**：用对象和消息传递建模
- **函数式**：用函数组合和数据变换建模
- **声明式**：描述"是什么"而非"怎么做"
- **过程式**：用步骤和流程控制建模

### 1.2 范式之间的关系

```
编程范式
├── 声明式（Declarative）
│   ├── 函数式（Functional）
│   ├── 逻辑式（Logic）
│   └── 响应式（Reactive）
└── 命令式（Imperative）
    ├── 过程式（Procedural）
    └── 面向对象（Object-Oriented）
```

现代语言通常支持**多范式**，开发者可以在同一项目中混合使用不同范式。

## 2. 面向对象编程（OOP）

### 2.1 核心概念

面向对象编程将程序组织为**对象**的集合，每个对象包含数据（属性）和行为（方法）。

**四大支柱**：

| 支柱     | 含义                       | 示例                            |
| :------- | :------------------------- | :------------------------------ |
| **封装** | 隐藏内部实现，暴露公共接口 | 私有字段 + 公共方法             |
| **继承** | 子类复用父类的属性和方法   | `class Dog extends Animal`      |
| **多态** | 同一接口不同实现           | `draw()` 在不同形状类中行为不同 |
| **抽象** | 提取共同特征，忽略无关细节 | 抽象类和接口                    |

### 2.2 类与对象

```typescript
// TypeScript 类定义
class User {
  // 封装：私有属性
  private id: number;
  private name: string;
  private email: string;

  constructor(id: number, name: string, email: string) {
    this.id = id;
    this.name = name;
    this.email = email;
  }

  // 公共方法（接口）
  public getDisplayName(): string {
    return `${this.name} <${this.email}>`;
  }

  public updateEmail(newEmail: string): void {
    this.validateEmail(newEmail);
    this.email = newEmail;
  }

  // 封装：私有方法
  private validateEmail(email: string): void {
    if (!email.includes('@')) {
      throw new Error('Invalid email');
    }
  }
}

const user = new User(1, 'Alice', 'alice@example.com');
console.log(user.getDisplayName()); // "Alice <alice@example.com>"
```

### 2.3 继承与多态

```typescript
// 基类
abstract class Shape {
  constructor(public color: string) {}

  // 抽象方法：子类必须实现
  abstract area(): number;
  abstract perimeter(): number;

  // 具体方法：子类继承
  describe(): string {
    return `${this.color} shape with area ${this.area().toFixed(2)}`;
  }
}

// 子类
class Circle extends Shape {
  constructor(
    color: string,
    private radius: number
  ) {
    super(color);
  }

  area(): number {
    return Math.PI * this.radius ** 2;
  }

  perimeter(): number {
    return 2 * Math.PI * this.radius;
  }
}

class Rectangle extends Shape {
  constructor(
    color: string,
    private width: number,
    private height: number
  ) {
    super(color);
  }

  area(): number {
    return this.width * this.height;
  }

  perimeter(): number {
    return 2 * (this.width + this.height);
  }
}

// 多态：同一接口，不同行为
const shapes: Shape[] = [new Circle('red', 5), new Rectangle('blue', 4, 6)];

shapes.forEach((shape) => {
  console.log(shape.describe());
  // "red shape with area 78.54"
  // "blue shape with area 24.00"
});
```

### 2.4 设计原则（SOLID）

| 原则  | 全称                  | 含义                   |
| :---- | :-------------------- | :--------------------- |
| **S** | Single Responsibility | 一个类只做一件事       |
| **O** | Open/Closed           | 对扩展开放，对修改封闭 |
| **L** | Liskov Substitution   | 子类可以替换父类       |
| **I** | Interface Segregation | 接口应该小而专         |
| **D** | Dependency Inversion  | 依赖抽象而非具体实现   |

## 3. 函数式编程（FP）

### 3.1 核心概念

函数式编程将计算视为**数学函数的求值**，强调：

- **纯函数**：相同输入永远产生相同输出，无副作用
- **不可变性**：数据一旦创建不可修改
- **函数组合**：将简单函数组合成复杂功能
- **声明式**：描述"做什么"而非"怎么做"

### 3.2 纯函数

```typescript
//  不纯函数：依赖外部状态，有副作用
let discount = 0.1;
function calculatePrice(price: number): number {
  return price * (1 - discount); // 依赖外部变量
}

//  纯函数：相同输入 → 相同输出，无副作用
function calculatePrice(price: number, discount: number): number {
  return price * (1 - discount);
}
```

纯函数的优势：

- **可预测**：输出只取决于输入
- **可测试**：无需 mock 外部依赖
- **可缓存**：相同输入可缓存结果（Memoization）
- **可并行**：无共享状态，线程安全

### 3.3 不可变数据

```typescript
//  可变操作
const arr = [1, 2, 3];
arr.push(4); // 修改原数组

//  不可变操作
const arr = [1, 2, 3];
const newArr = [...arr, 4]; // 创建新数组

//  可变操作
const user = { name: 'Alice', age: 30 };
user.age = 31; // 修改原对象

//  不可变操作
const user = { name: 'Alice', age: 30 };
const updatedUser = { ...user, age: 31 }; // 创建新对象
```

### 3.4 高阶函数与函数组合

```typescript
// 高阶函数：接收函数作为参数或返回函数
const double = (x: number) => x * 2;
const addOne = (x: number) => x + 1;

// 函数组合
const compose =
  <T>(...fns: Function[]) =>
  (x: T) =>
    fns.reduceRight((acc, fn) => fn(acc), x);

const pipe =
  <T>(...fns: Function[]) =>
  (x: T) =>
    fns.reduce((acc, fn) => fn(acc), x);

// compose: 从右到左执行
const transform = compose(double, addOne);
transform(3); // double(addOne(3)) = double(4) = 8

// pipe: 从左到右执行（更直观）
const transform2 = pipe(addOne, double);
transform2(3); // double(addOne(3)) = 8
```

### 3.5 常用函数式操作

```typescript
const users = [
  { name: 'Alice', age: 30, role: 'admin' },
  { name: 'Bob', age: 25, role: 'user' },
  { name: 'Charlie', age: 35, role: 'admin' },
  { name: 'Diana', age: 28, role: 'user' },
];

// map: 变换每个元素
const names = users.map((u) => u.name);
// ['Alice', 'Bob', 'Charlie', 'Diana']

// filter: 过滤元素
const admins = users.filter((u) => u.role === 'admin');
// [{ name: 'Alice', ... }, { name: 'Charlie', ... }]

// reduce: 聚合为单个值
const totalAge = users.reduce((sum, u) => sum + u.age, 0);
// 118

// 链式组合
const adminNames = users.filter((u) => u.role === 'admin').map((u) => u.name);
// ['Alice', 'Charlie']
```

## 4. 声明式编程

### 4.1 核心思想

声明式编程描述**"是什么"**而非**"怎么做"**，让框架/引擎负责实现细节。

```typescript
//  命令式：描述"怎么做"
const result = [];
for (let i = 0; i < users.length; i++) {
  if (users[i].age > 25) {
    result.push(users[i].name);
  }
}

//  声明式：描述"做什么"
const result = users.filter((u) => u.age > 25).map((u) => u.name);
```

### 4.2 声明式 UI

```vue
<!-- Vue 3 声明式 UI -->
<template>
  <ul>
    <li v-for="user in activeUsers" :key="user.id">{{ user.name }} - {{ user.role }}</li>
  </ul>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps<{ users: User[] }>();
const activeUsers = computed(() =>
  props.users.filter(u => u.active)
);
</script>
```

### 4.3 SQL：典型的声明式语言

```sql
-- 声明式：只描述要什么，不描述怎么获取
SELECT name, age
FROM users
WHERE role = 'admin' AND age > 25
ORDER BY age DESC;
```

## 5. 范式对比与选择

### 5.1 范式特征对比

| 特征         | 面向对象  | 函数式   | 声明式      |
| :----------- | :-------- | :------- | :---------- |
| **核心单元** | 对象/类   | 函数     | 表达式/查询 |
| **状态管理** | 对象内部  | 避免状态 | 隐式管理    |
| **代码复用** | 继承/组合 | 函数组合 | 模板/组件   |
| **副作用**   | 允许      | 尽量避免 | 隔离        |
| **并发友好** | 需加锁    | 天然支持 | 框架处理    |
| **学习曲线** | 中等      | 较陡     | 较平        |

### 5.2 实际项目中的范式混合

现代前端开发通常**混合使用多种范式**：

```typescript
// 面向对象：定义领域模型
class ShoppingCart {
  private items: CartItem[] = [];

  addItem(item: CartItem): void {
    this.items = [...this.items, item]; // 不可变更新
  }

  getTotal(): number {
    return this.items.reduce((sum, item) => sum + item.price, 0); // 函数式
  }
}

// 函数式：工具函数
const formatPrice = (price: number): string =>
  new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(price);

// 声明式：UI 组件
// <template v-for="item in cart.items">{{ formatPrice(item.price) }}</template>
```

### 5.3 选择建议

| 场景              | 推荐范式 | 理由         |
| :---------------- | :------- | :----------- |
| **业务逻辑建模**  | 面向对象 | 实体关系清晰 |
| **数据处理/转换** | 函数式   | 链式操作简洁 |
| **UI 渲染**       | 声明式   | 关注点分离   |
| **并发/异步**     | 函数式   | 无共享状态   |
| **状态机**        | 面向对象 | 状态封装     |
| **配置/规则**     | 声明式   | 直观易读     |
