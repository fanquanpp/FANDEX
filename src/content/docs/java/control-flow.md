---
order: 70
tags:
  - 'java'
difficulty: 'intermediate'
title: '控制流'
module: 'java'
category: 'Java Basics'
description: '条件判断、循环结构与跳转语句。'
author: 'Anonymous'
---

## 目录

1. [条件分支](#条件分支)
2. [循环结构](#循环结构)
3. [跳转语句](#跳转语句)
4. [实际应用案例](#实际应用案例)
5. [最佳实践](#最佳实践)
6. [常见陷阱](#常见陷阱)

---

## 1. 条件分支 (Selection)

### 1.1 `if-else` 结构

#### 1.1.1 基本用法

```java
 if (condition) {
  // 条件为真时执行
 True} else if (anotherCondition) {
  // 另一个条件为真时执行
 True} else {
  // 所有条件都为假时执行
 True}
```

#### 1.1.2 嵌套 `if-else`

```java
 if (score >= 90) {
  if (score >= 95) {
  System.out.println("A+");
  } else {
  System.out.println("A");
  }
 True} else if (score >= 60) {
  System.out.println("B");
 True} else {
  System.out.println("C");
 True}
```

#### 1.1.3 卫语句 (Guard Clause)

对于复杂的条件判断，使用卫语句可以提高代码可读性：

```java
 public void processOrder(Order order) {
  if (order == null) {
  return;
  }
  if (!order.isValid()) {
  System.out.println("Invalid order");
  return;
  }
  if (order.getAmount() > MAX_AMOUNT) {
  System.out.println("Amount too large");
  return;
  }
  // 处理订单逻辑
 True}
```

### 1.2 `switch` 结构

#### 1.2.1 传统 `switch` 语句

- 必须使用 `break` 防止穿透
- 可以使用 `default` 处理默认情况

```java
 switch (day) {
  case 1:
  System.out.println("Monday");
  break;
  case 2:
  System.out.println("Tuesday");
  break;
  case 3:
  case 4:
  case 5:
  System.out.println("Weekday");
  break;
  case 6:
  case 7:
  System.out.println("Weekend");
  break;
  default:
  System.out.println("Invalid day");
 True}
```

#### 1.2.2 Java 12+ `switch` 表达式

- 使用 `->` 箭头语法，无需 `break`
- 可以直接返回值
- 支持 `yield` 关键字返回复杂表达式

```java
 // 基本用法
 String dayName = switch (day) {
  case 1 -> "Monday";
  case 2 -> "Tuesday";
  case 3, 4, 5 -> "Weekday";
  case 6, 7 -> "Weekend";
  default -> "Invalid day";
 True};
 // 使用 yield 返回复杂表达式
 int result = switch (operation) {
  case "add" -> {
  yield a + b;
  }
  case "subtract" -> {
  yield a - b;
  }
  default -> {
  System.out.println("Invalid operation");
  yield 0;
  }
 True};
```

#### 1.2.3 Java 17+ `switch` 模式匹配

```java
 // 模式匹配示例
 Object obj = "Hello";
 String result = switch (obj) {
  case Integer i -> "Integer: " + i;
  case String s -> "String: " + s;
  case null -> "null";
  default -> "Other";
 True};
```

## 2. 循环结构 (Iteration)

### 2.1 `for` 循环

#### 2.1.1 标准 `for` 循环

```java
 for (int i = 0; i < 10; i++) {
  System.out.println(i);
 True}
```

#### 2.1.2 增强型 `for` 循环 (for-each)

用于遍历数组、集合等可迭代对象：

```java
 // 遍历数组
 int[] numbers = {1, 2, 3, 4, 5};
 for (int number : numbers) {
  System.out.println(number);
 True}
 // 遍历集合
 List<String> names = List.of("Alice", "Bob", "Charlie");
 for (String name : names) {
  System.out.println(name);
 True}
```

#### 2.1.3 带标签的 `for` 循环

```java
 outer: for (int i = 0; i < 3; i++) {
  inner: for (int j = 0; j < 3; j++) {
  if (j == 1) {
  continue outer; // 跳过外层循环的当前迭代
  }
  System.out.println(i + ", " + j);
  }
 True}
```

### 2.2 `while` 循环

- 先判断条件，后执行循环体
- 适用于循环次数不确定的场景

```java
 int i = 0;
 while (i < 10) {
  System.out.println(i);
  i++;
 True}
```

### 2.3 `do-while` 循环

- 先执行循环体，后判断条件
- 保证循环体至少执行一次

```java
 int i = 0;
 do {
  System.out.println(i);
  i++;
 True} while (i < 10);
```

### 2.4 循环控制

#### 2.4.1 `break` 语句

- 跳出当前循环
- 配合标签使用可以跳出多层循环

```java
 for (int i = 0; i < 10; i++) {
  if (i == 5) {
  break; // 跳出循环
  }
  System.out.println(i);
 True}
```

#### 2.4.2 `continue` 语句

- 跳过当前迭代，进入下一次循环
- 配合标签使用可以跳过外层循环的当前迭代

```java
 for (int i = 0; i < 10; i++) {
  if (i % 2 == 0) {
  continue; // 跳过偶数
  }
  System.out.println(i);
 True}
```

## 3. 跳转语句 (Jumps)

### 3.1 `return` 语句

- 结束当前方法的执行
- 可以返回一个值（对于非 void 方法）

```java
 public int add(int a, int b) {
  return a + b; // 返回计算结果
 True}
 public void validate(int value) {
  if (value < 0) {
  return; // 提前结束方法
  }
  // 继续执行
 True}
```

### 3.2 标签 (Labels)

- 用于标识代码块
- 配合 `break` 和 `continue` 使用可以控制多层循环

```java
 outerLoop: for (int i = 0; i < 5; i++) {
  for (int j = 0; j < 5; j++) {
  if (i * j > 6) {
  System.out.println("Breaking outer loop");
  break outerLoop;
  }
  System.out.println(i + ", " + j);
  }
 True}
```

## 4. 实际应用案例

### 4.1 菜单选择

```java
 Scanner scanner = new Scanner(System.in);
 System.out.println("1. Add");
 System.out.println("2. Subtract");
 System.out.println("3. Exit");
 System.out.print("Enter your choice: ");
 int choice = scanner.nextInt();
 switch (choice) {
  case 1 -> System.out.println("Add operation");
  case 2 -> System.out.println("Subtract operation");
  case 3 -> System.out.println("Exiting");
  default -> System.out.println("Invalid choice");
 True}
```

### 4.2 查找元素

```java
 int[] numbers = {10, 20, 30, 40, 50};
 int target = 30;
 b boolean found = false;
 for (int number : numbers) {
  if (number == target) {
  found = true;
  break;
  }
 True}
 System.out.println(found ? "Found" : "Not found");
```

### 4.3 计算阶乘

```java
 public int factorial(int n) {
  int result = 1;
  for (int i = 1; i <= n; i++) {
  result *= i;
  }
  return result;
 True}
```

## 5. 最佳实践 (Best Practices)

### 5.1 条件分支最佳实践

1. **避免深层嵌套**：`if-else` 嵌套不要超过 3 层
2. **使用卫语句**：对于简单的条件检查，使用卫语句提前返回
3. **使用 `switch` 替代多个 `if-else`**：当条件是离散值时，使用 `switch` 更清晰
4. **使用枚举**：对于固定的选项集合，使用枚举类型

### 5.2 循环最佳实践

1. **选择合适的循环类型**：

- 已知循环次数：使用 `for` 循环
- 未知循环次数：使用 `while` 循环
- 至少执行一次：使用 `do-while` 循环
- 遍历集合：使用增强型 `for` 循环

2. **避免无限循环**：确保循环条件最终会变为 false
3. **注意循环变量**：避免在循环体内修改循环变量
4. **使用 `break` 和 `continue` 提高效率**：及时跳出或跳过不需要的迭代

### 5.3 性能考虑

1. **循环不变量外提**：将循环内不变的计算移到循环外
2. **避免在循环中创建对象**：尽量在循环外创建对象
3. **使用 `StringBuilder` 处理字符串拼接**：在循环中拼接字符串时使用 `StringBuilder`

## 6. 常见陷阱

1. **`switch` 语句的穿透效应**：传统 `switch` 语句如果没有 `break` 会导致穿透
2. **浮点数比较**：避免在条件中直接比较浮点数
3. **空指针异常**：在条件判断前检查对象是否为 null
4. **死循环**：确保循环条件最终会变为 false

---

### 更新日志 (Changelog)

- 2026-04-05: 细化控制流，引入 Java 12+ Switch 新特性。
- 2026-05-03: 扩展内容，添加实际应用案例、最佳实践和常见陷阱。
