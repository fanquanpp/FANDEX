---
order: 80
tags:
  - 'java'
difficulty: 'intermediate'
title: '方法详解'
module: 'java'
category: 'Java Basics'
description: '方法定义、参数传递、方法重载与递归。'
author: 'Anonymous'
---

## 目录

1. [方法基本语法](#方法基本语法)
2. [参数传递](#参数传递)
3. [方法重载](#方法重载)
4. [递归](#递归)
5. [可变参数](#可变参数)
6. [方法的最佳实践](#方法的最佳实践)
7. [实际应用案例](#实际应用案例)
8. [常见陷阱](#常见陷阱)

---

## 1. 方法基本语法 (Basic Syntax)

方法是执行特定任务的命名代码块，是Java中代码组织和复用的基本单位。

### 1.1 方法定义

```java
 /*
  * 修饰符 返回值类型 方法名(参数列表) {
  * // 方法体
  * return 返回值;
  * }
  */
 public int add(int a, int b) {
  return a + b;
 True}
```

### 1.2 方法修饰符

| 修饰符         | 说明                               | 适用范围       |
| -------------- | ---------------------------------- | -------------- |
| `public`       | 公共访问，任何类都可以访问         | 类、方法、变量 |
| `protected`    | 受保护访问，同一包内或子类可以访问 | 方法、变量     |
| `private`      | 私有访问，只有本类可以访问         | 方法、变量     |
| `default`      | 默认访问，同一包内可以访问         | 类、方法、变量 |
| `static`       | 静态方法，属于类而不是实例         | 方法、变量     |
| `final`        | 最终方法，不能被重写               | 方法           |
| `abstract`     | 抽象方法，没有实现体               | 方法           |
| `synchronized` | 同步方法，线程安全                 | 方法           |

### 1.3 方法调用

- **非静态方法**: 必须通过对象实例调用

```java
 MyClass obj = new MyClass();
 int result = obj.add(1, 2);
```

- **静态方法**: 通过类名直接调用

```java
 int result = Math.abs(-10);
```

### 1.4 方法返回值

- **有返回值**: 必须使用 `return` 语句返回对应类型的值
- **无返回值**: 使用 `void` 作为返回类型，可选使用 `return;` 提前结束方法

## 2. 参数传递 (Parameter Passing)

Java 中**只有值传递 (Pass by Value)**，但对于不同类型的参数，表现有所不同。

### 2.1 基本类型参数

- 传递值的副本
- 修改形参不影响实参

```java
 public void modify(int x) {
  x = 10; // 只修改局部变量
 True}
 int a = 5;
 modify(a);
 System.out.println(a); // 输出 5，实参不变
```

### 2.2 引用类型参数

- 传递引用地址的副本
- 修改形参指向的对象属性**会影响**原对象
- 修改形参本身指向新对象**不会影响**原引用

```java
 public void modifyArray(int[] arr) {
  arr[0] = 100; // 修改数组元素，会影响原数组
  arr = new int[5]; // 重新赋值，不会影响原引用
 True}
 int[] array = {1, 2, 3};
 modifyArray(array);
 System.out.println(array[0]); // 输出 100
```

### 2.3 方法参数类型

- **基本类型**: `byte`, `short`, `int`, `long`, `float`, `double`, `char`, `boolean`
- **引用类型**: 类、接口、数组
- **包装类型**: `Integer`, `Double` 等
- **枚举类型**: `enum`
- **注解类型**: `@interface`

## 3. 方法重载 (Overloading)

在同一个类中，方法名相同，但**参数列表不同**的方法。

### 3.1 重载规则

1. **参数列表必须不同**: 个数、类型或顺序不同
2. **返回值类型可以不同**: 但不能作为重载的唯一依据
3. **修饰符可以不同**: 但不能作为重载的唯一依据
4. **异常类型可以不同**: 但不能作为重载的唯一依据

### 3.2 重载示例

```java
 // 基本类型重载
 public int add(int a, int b) { return a + b; }
 public double add(double a, double b) { return a + b; }
 public int add(int a, int b, int c) { return a + b + c; }
 // 引用类型重载
 public void print(String s) { System.out.println(s); }
 public void print(int[] arr) {
  for (int i : arr) System.out.print(i + " ");
  System.out.println();
 True}
 // 参数顺序不同
 public void method(int a, String b) {}
 public void method(String a, int b) {}
```

### 3.3 重载的解析

Java 编译器会根据实参的类型和数量选择最匹配的方法：

1. 精确匹配
2. 基本类型自动转换
3. 向上转型
4. 可变参数

## 4. 递归 (Recursion)

方法调用自身的过程，是一种解决问题的有效方法。

### 4.1 递归的基本结构

```java
 public returnType recursiveMethod(parameters) {
  // 基准情况 (Base Case)
  if (baseCondition) {
  return baseValue;
  }
  // 递归步 (Recursive Step)
  return recursiveMethod(modifiedParameters);
 True}
```

### 4.2 递归示例

#### 4.2.1 阶乘计算

```java
 public int factorial(int n) {
  if (n <= 1) return 1; // 基准情况
  return n * factorial(n - 1); // 递归步
 True}
```

#### 4.2.2 斐波那契数列

```java
 public int fibonacci(int n) {
  if (n <= 1) return n; // 基准情况
  return fibonacci(n - 1) + fibonacci(n - 2); // 递归步
 True}
```

#### 4.2.3 二分查找

```java
 public int binarySearch(int[] arr, int target, int low, int high) {
  if (low > high) return -1; // 基准情况：未找到
  int mid = (low + high) / 2;
  if (arr[mid] == target) return mid; // 基准情况：找到
  if (arr[mid] > target) {
  return binarySearch(arr, target, low, mid - 1); // 递归步：左半部分
  } else {
  return binarySearch(arr, target, mid + 1, high); // 递归步：右半部分
  }
 True}
```

### 4.3 递归的优缺点

#### 优点

- **代码简洁**: 递归代码通常比迭代代码更简洁易读
- **问题分解**: 将复杂问题分解为相同的子问题
- **适用于树形结构**: 如文件系统、DOM 树等

#### 缺点

- **栈溢出风险**: 递归深度过大可能导致 StackOverflowError
- **性能开销**: 每次递归调用都会创建新的栈帧
- **内存消耗**: 递归调用会占用更多内存

### 4.4 递归的优化

- **尾递归**: 递归调用是方法的最后一个操作，某些语言会优化为迭代
- **记忆化**: 缓存中间结果，避免重复计算
- **递归转迭代**: 对于深度较大的问题，考虑使用迭代

## 5. 可变参数 (Variadic Arguments)

Java 5 引入的特性，允许方法接受任意数量的参数。

### 5.1 基本语法

```java
 public returnType methodName(ParameterType... parameterName) {
  // 方法体
 True}
```

### 5.2 可变参数规则

- **必须是最后一个参数**
- **每个方法只能有一个可变参数**
- **本质是数组**: 在方法内部，可变参数被当作数组处理

### 5.3 可变参数示例

```java
 // 计算任意数量整数的和
 public int sum(int... numbers) {
  int total = 0;
  for (int num : numbers) {
  total += num;
  }
  return total;
 True}
 // 打印任意数量的字符串
 public void printAll(String... messages) {
  for (String msg : messages) {
  System.out.println(msg);
  }
 True}
```

### 5.4 可变参数与数组

- 可以直接传递数组给可变参数
- 可变参数方法可以与数组参数方法重载

```java
 public void process(int[] arr) {}
 public void process(int... nums) {}
 // 调用
 int[] array = {1, 2, 3};
 process(array); // 调用数组参数方法
 process(1, 2, 3); // 调用可变参数方法
```

## 6. 方法的最佳实践

### 6.1 命名规范

- 方法名使用动词或动词短语
- 驼峰命名法（首字母小写，后续单词首字母大写）
- 方法名应清晰描述方法的功能

### 6.2 代码风格

- 方法体不宜过长，通常不超过 30-50 行
- 一个方法只做一件事
- 使用有意义的参数名和局部变量名

### 6.3 异常处理

- 对于可能的异常，要么捕获处理，要么在方法签名中声明
- 避免在方法中捕获所有异常而不做处理

### 6.4 性能考虑

- 避免在热点方法中创建不必要的对象
- 对于频繁调用的方法，考虑使用静态方法
- 对于大计算量的方法，考虑缓存结果

## 7. 实际应用案例

### 7.1 工具方法

```java
 public class StringUtils {
  // 检查字符串是否为空
  public static boolean isEmpty(String str) {
  return str == null || str.trim().isEmpty();
  }
  // 反转字符串
  public static String reverse(String str) {
  if (isEmpty(str)) return str;
  StringBuilder sb = new StringBuilder(str);
  return sb.reverse().toString();
  }
 True}
```

### 7.2 数学计算

```java
 public class MathUtils {
  // 计算最大公约数
  public static int gcd(int a, int b) {
  if (b == 0) return a;
  return gcd(b, a % b);
  }
  // 计算最小公倍数
  public static int lcm(int a, int b) {
  return a * b / gcd(a, b);
  }
 True}
```

### 7.3 集合操作

```java
 public class CollectionUtils {
  // 检查集合是否为空
  public static <T> boolean isEmpty(Collection<T> collection) {
  return collection == null || collection.isEmpty();
  }
  // 安全地获取列表元素
  public static <T> T getSafe(List<T> list, int index, T defaultValue) {
  if (isEmpty(list) || index < 0 || index >= list.size()) {
  return defaultValue;
  }
  return list.get(index);
  }
 True}
```

## 8. 常见陷阱

### 8.1 递归陷阱

- **栈溢出**: 递归深度过大导致 StackOverflowError
- **无限递归**: 缺少基准情况或基准情况无法到达
- **重复计算**: 未使用记忆化导致性能问题

### 8.2 方法重载陷阱

- **模糊调用**: 多个重载方法都可能匹配，导致编译错误
- **自动装箱/拆箱**: 可能导致意外的重载选择

### 8.3 参数传递陷阱

- **引用类型修改**: 误以为修改形参引用会影响实参
- **不可变对象**: 对不可变对象的修改不会生效

---

### 更新日志 (Changelog)

- 2026-04-05: 深入细化方法重载与递归细节。
- 2026-05-03: 扩展内容，添加方法修饰符、参数类型、递归优化和实际应用案例。
