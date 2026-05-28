---
order: 30
tags:
  - 'java'
  - 'oop'
difficulty: 'beginner'
title: '程序结构与基本语法'
module: 'java'
category: 'Java Basics'
description: 'Java 程序结构、注释、标识符与关键字。'
author: 'Anonymous'
---

## 目录

1. [Java 程序结构](#java-程序结构)
2. [注释规范](#注释规范)
3. [标识符](#标识符)
4. [关键字](#关键字)
5. [键盘录入](#键盘录入)
6. [代码风格与最佳实践](#代码风格与最佳实践)
7. [实际应用示例](#实际应用示例)

---

## 1. Java 程序结构

### 1.1 源文件结构

一个典型的 Java 源文件包含以下部分：

1. **包声明 (Package Declaration)**：指定源文件所属的包。
2. **导入语句 (Import Statements)**：导入需要使用的类。
3. **类定义 (Class Definition)**：定义一个或多个类。
4. **方法定义 (Method Definition)**：在类中定义方法，包括主方法。
5. **执行语句 (Statements)**：在方法中编写具体的代码逻辑。
   **示例**：

```java
 /*
  * 包声明
  */
 package com.example;
 /*
  * 导入语句
  */
 import java.util.Scanner;
 import java.util.Date;
 /*
  * 类定义
  */
 public class HelloWorld {
  /*
  * 主方法
  * 程序的入口点
  */
  public static void main(String[] args) {
  // 执行语句
  System.out.println("Hello, Java!");
  // 创建 Date 对象
  Date now = new Date();
  System.out.println("当前时间: " + now);
  }
 True}
```

### 1.2 类的结构

一个 Java 类通常包含以下部分：

1. **修饰符 (Modifiers)**：如 `public`, `private`, `protected` 等。
2. **类名 (Class Name)**：遵循大驼峰命名法。
3. **继承关系 (Inheritance)**：使用 `extends` 关键字继承父类。
4. **实现接口 (Interface Implementation)**：使用 `implements` 关键字实现接口。
5. **成员变量 (Member Variables)**：类的属性。
6. **构造方法 (Constructor)**：用于创建对象。
7. **成员方法 (Member Methods)**：类的行为。
   **示例**：

```java
 package com.example;
 public class Student extends Person implements Serializable {
  // 成员变量
  private String studentId;
  private String major;
  // 构造方法
  public Student() {
  }
  public Student(String name, int age, String studentId, String major) {
  super(name, age);
  this.studentId = studentId;
  this.major = major;
  }
  // 成员方法
  public String getStudentId() {
  return studentId;
  }
  public void setStudentId(String studentId) {
  this.studentId = studentId;
  }
  public String getMajor() {
  return major;
  }
  public void setMajor(String major) {
  this.major = major;
  }
  public void study() {
  System.out.println(getName() + " is studying " + major);
  }
 True}
```

### 1.3 主方法

主方法是 Java 程序的入口点，具有以下特点：

- 修饰符：`public static void`
- 方法名：`main`
- 参数：`String[] args`
  **示例**：

```java
 public static void main(String[] args) {
  // 程序从这里开始执行
  System.out.println("Hello, World!");
  // 处理命令行参数
  for (int i = 0; i < args.length; i++) {
  System.out.println("Argument " + i + ": " + args[i]);
  }
 True}
```

## 2. 注释规范

### 2.1 单行注释

**语法**：`// 注释内容`
**示例**：

```java
 // 这是一个单行注释
 int age = 18; // 定义年龄变量
```

### 2.2 多行注释

**语法**：`/* 注释内容 */`
**示例**：

```java
 /*
  * 这是一个多行注释
  * 可以跨越多行
  */
 int sum = 0;
 for (int i = 1; i <= 100; i++) {
  sum += i; // 累加
 True}
```

### 2.3 文档注释

**语法**：`/** 注释内容 */`
**示例**：

```java
 /**
  * 计算两个数的和
  * @param a 第一个加数
  * @param b 第二个加数
  * @return 两个数的和
  */
 public int add(int a, int b) {
  return a + b;
 True}
```

**常用的 Javadoc 标签**：
| 标签 | 描述 | 示例 |
|------|------|------|
| `@author` | 作者 | `@author John Doe` |
| `@param` | 参数说明 | `@param name 用户名` |
| `@return` | 返回值说明 | `@return 计算结果` |
| `@throws` | 异常说明 | `@throws IllegalArgumentException 参数错误时抛出` |
| `@version` | 版本 | `@version 1.0` |
| `@since` | 从哪个版本开始 | `@since 1.5` |
| `@see` | 参考其他类或方法 | `@see java.util.ArrayList` |

## 3. 标识符

### 3.1 标识符的规则

标识符是用于命名类、方法、变量、常量等的名称，必须遵循以下规则：

1. **组成字符**：字母 (A-Z, a-z)、数字 (0-9)、下划线 (\_)、美元符号 ($)。
2. **开头字符**：不能以数字开头。
3. **关键字**：不能使用 Java 关键字作为标识符。
4. **大小写敏感**：Java 是大小写敏感的，因此 `myVar` 和 `MyVar` 是不同的标识符。

### 3.2 命名规范

#### 3.2.1 类名和接口名

- **命名规则**：大驼峰命名法 (Upper Camel Case)
- **示例**：`HelloWorld`, `StudentInfo`, `UserService`

#### 3.2.2 方法名和变量名

- **命名规则**：小驼峰命名法 (Lower Camel Case)
- **示例**：`getUserName`, `ageCount`, `calculateTotal`

#### 3.2.3 包名

- **命名规则**：全小写，使用点 (.) 分隔
- **示例**：`com.example.util`, `org.apache.commons.io`

#### 3.2.4 常量名

- **命名规则**：全大写，使用下划线 (\_) 分隔
- **示例**：`MAX_VALUE`, `DEFAULT_TIMEOUT`, `PI`

#### 3.2.5 枚举常量

- **命名规则**：全大写，使用下划线 (\_) 分隔
- **示例**：`RED`, `GREEN`, `BLUE`

### 3.3 命名最佳实践

1. **含义明确**：标识符应该能够清晰地表达其用途。
2. **避免缩写**：除非是广为人知的缩写（如 `URL`, `HTTP`），否则应使用完整的单词。
3. **一致性**：在整个项目中保持命名风格的一致性。
4. **长度适中**：标识符应该足够长以表达其含义，但也不应过长。
   **示例**：

```java
 // 不好的命名
 int a; // 含义不明确
 int cnt; // 使用了缩写
 int user_name; // 不符合小驼峰命名法
 // 好的命名
 int age; // 含义明确
 int count; // 使用完整单词
 int userName; // 符合小驼峰命名法
```

## 4. 关键字

### 4.1 常用关键字

Java 有 50 多个关键字，以下是一些常用的关键字：
| 关键字 | 描述 |
|--------|------|
| `public` | 公共访问修饰符 |
| `private` | 私有访问修饰符 |
| `protected` | 受保护的访问修饰符 |
| `class` | 定义类 |
| `interface` | 定义接口 |
| `extends` | 继承类 |
| `implements` | 实现接口 |
| `static` | 静态修饰符 |
| `final` | 最终修饰符 |
| `void` | 无返回值 |
| `return` | 返回值 |
| `if` | 条件语句 |
| `else` | 条件语句的分支 |
| `for` | 循环语句 |
| `while` | 循环语句 |
| `do` | 循环语句 |
| `switch` | 开关语句 |
| `case` | 开关语句的分支 |
| `default` | 开关语句的默认分支 |
| `break` | 跳出循环或开关语句 |
| `continue` | 跳过当前循环迭代 |
| `try` | 异常处理的开始 |
| `catch` | 捕获异常 |
| `finally` | 异常处理的最终块 |
| `throw` | 抛出异常 |
| `throws` | 声明方法可能抛出的异常 |
| `new` | 创建对象 |
| `this` | 当前对象的引用 |
| `super` | 父类的引用 |
| `package` | 包声明 |
| `import` | 导入类 |

### 4.2 保留字和字面量

除了关键字外，Java 还有一些保留字和字面量：

- **保留字**：``, `false`, `null`
- **字面量**：
- 整数字面量：`123`, `0x1A`
- 浮点数字面量：`3.14`, `2.5e3`
- 布尔字面量：``, `false`
- 字符字面量：`'A'`, `'\n'`
- 字符串字面量：`"Hello"`
- null 字面量：`null`

## 5. 键盘录入

### 5.1 使用 Scanner 类

`java.util.Scanner` 是 Java 中用于获取控制台输入的常用类。
**基本用法**：

```java
 import java.util.Scanner;
 public class InputTest {
  public static void main(String[] args) {
  // 1. 创建 Scanner 对象
  Scanner sc = new Scanner(System.in);
  // 2. 获取不同类型的输入
  System.out.print("请输入整数: ");
  int num = sc.nextInt();
  System.out.print("请输入浮点数: ");
  double d = sc.nextDouble();
  System.out.print("请输入布尔值: ");
  boolean b = sc.nextBoolean();
  // 注意：next() 会遇到空格停止
  System.out.print("请输入字符串 (next()): ");
  String str1 = sc.next();
  // 读取换行符
  sc.nextLine();
  // nextLine() 会读取整行
  System.out.print("请输入字符串 (nextLine()): ");
  String str2 = sc.nextLine();
  // 3. 输出结果
  System.out.println("整数: " + num);
  System.out.println("浮点数: " + d);
  System.out.println("布尔值: " + b);
  System.out.println("字符串 (next()): " + str1);
  System.out.println("字符串 (nextLine()): " + str2);
  // 4. 关闭 Scanner
  sc.close();
  }
 True}
```

### 5.2 Scanner 类的常用方法

| 方法            | 描述                         |
| --------------- | ---------------------------- |
| `next()`        | 读取一个单词（遇到空格停止） |
| `nextLine()`    | 读取一整行                   |
| `nextInt()`     | 读取一个整数                 |
| `nextDouble()`  | 读取一个双精度浮点数         |
| `nextBoolean()` | 读取一个布尔值               |
| `nextByte()`    | 读取一个字节                 |
| `nextShort()`   | 读取一个短整数               |
| `nextLong()`    | 读取一个长整数               |
| `nextFloat()`   | 读取一个单精度浮点数         |
| `hasNext()`     | 检查是否还有输入             |
| `hasNextInt()`  | 检查下一个输入是否是整数     |

### 5.3 注意事项

1. **输入缓冲区问题**：当使用 `nextInt()`, `nextDouble()` 等方法后，输入缓冲区中会留下换行符，此时使用 `nextLine()` 会读取到空字符串。解决方案是在使用 `nextLine()` 前先调用一次 `nextLine()` 来消耗换行符。
2. **资源关闭**：使用完 Scanner 后，应该调用 `close()` 方法关闭资源，以避免资源泄漏。
3. **异常处理**：当输入的数据类型与期望的类型不匹配时，会抛出 `InputMismatchException`，应该使用 try-catch 进行处理。
   **示例**：

```java
 import java.util.InputMismatchException;
 import java.util.Scanner;
 public class SafeInputTest {
  public static void main(String[] args) {
  Scanner sc = new Scanner(System.in);
  int num = 0;
  boolean valid = false;
  while (!valid) {
  System.out.print("请输入整数: ");
  try {
  num = sc.nextInt();
  valid = true;
  } catch (InputMismatchException e) {
  System.out.println("输入错误，请重新输入整数!");
  sc.next(); // 消耗错误的输入
  }
  }
  System.out.println("输入的整数是: " + num);
  sc.close();
  }
 True}
```

## 6. 代码风格与最佳实践

### 6.1 缩进与空格

- **缩进**：使用 4 个空格进行缩进，不要使用制表符 (Tab)。
- **空格**：
- 在运算符两侧添加空格：`a = b + c;`
- 在逗号后添加空格：`method(a, b, c);`
- 在大括号前添加空格：`if (condition) {`
- 在小括号内侧不添加空格：`if(condition)` 应该写成 `if (condition)`

### 6.2 代码块

- **大括号**：使用 K&R 风格，即左大括号放在行尾，右大括号放在新行，与对应的控制语句对齐。
  **示例**：

```java
 // 好的风格
 if (condition) {
  // 代码块
 True} else {
  // 代码块
 True}
 // 不好的风格
 if (condition)
 {
  // 代码块
 True}
 else
 {
  // 代码块
 True}
```

### 6.3 行长度

- **行长度**：每行代码的长度不应超过 80 个字符，超过时应换行。
- **换行**：在逗号后或运算符前换行，缩进 8 个空格。
  **示例**：

```java
 // 好的风格
 int result = calculateValue(a, b, c, d)
  + calculateValue(e, f, g, h)
  - calculateValue(i, j, k, l);
 // 不好的风格
 int result = calculateValue(a, b, c, d) + calculateValue(e, f, g, h) - calculateValue(i, j, k, l);
```

### 6.4 命名约定

- **类名**：使用大驼峰命名法，每个单词的首字母大写。
- **方法名**：使用小驼峰命名法，第一个单词小写，后续单词首字母大写。
- **变量名**：使用小驼峰命名法，应具有描述性。
- **常量名**：使用全大写，单词之间用下划线分隔。
- **包名**：使用全小写，单词之间用点分隔。

### 6.5 注释

- **单行注释**：用于解释单行代码的功能。
- **多行注释**：用于解释代码块的功能。
- **文档注释**：用于生成 API 文档，应包含类、方法的功能、参数、返回值等信息。

### 6.6 其他最佳实践

1. **避免使用魔术数字**：将常量定义为具名常量。
2. **保持方法简洁**：每个方法应只做一件事，长度不应超过 50 行。
3. **使用有意义的变量名**：变量名应能够清晰地表达其用途。
4. **避免冗余代码**：不要重复编写相同的代码，应提取为方法。
5. **使用 try-with-resources**：对于需要关闭的资源，使用 try-with-resources 语句。
   **示例**：

```java
 // 不好的风格
 for (int i = 0; i < 10; i++) {
  // 代码
 True}
 // 好的风格
 private static final int MAX_ITERATIONS = 10;
 for (int i = 0; i < MAX_ITERATIONS; i++) {
  // 代码
 True}
 // 使用 try-with-resources
 try (Scanner sc = new Scanner(System.in)) {
  // 使用 sc
 True} // 自动关闭 sc
```

## 7. 实际应用示例

### 7.1 示例 1：简单的计算器

```java
 import java.util.Scanner;
 public class Calculator {
  public static void main(String[] args) {
  Scanner sc = new Scanner(System.in);
  System.out.print("请输入第一个数: ");
  double num1 = sc.nextDouble();
  System.out.print("请输入运算符 (+, -, *, /): ");
  char operator = sc.next().charAt(0);
  System.out.print("请输入第二个数: ");
  double num2 = sc.nextDouble();
  double result = 0;
  boolean valid = true;
  switch (operator) {
  case '+':
  result = num1 + num2;
  break;
  case '-':
  result = num1 - num2;
  break;
  case '*':
  result = num1 * num2;
  break;
  case '/':
  if (num2 != 0) {
  result = num1 / num2;
  } else {
  System.out.println("错误：除数不能为零!");
  valid = false;
  }
  break;
  default:
  System.out.println("错误：无效的运算符!");
  valid = false;
  }
  if (valid) {
  System.out.println(num1 + " " + operator + " " + num2 + " = " + result);
  }
  sc.close();
  }
 True}
```

### 7.2 示例 2：学生信息管理

```java
 import java.util.Scanner;
 public class StudentManager {
  public static void main(String[] args) {
  Scanner sc = new Scanner(System.in);
  // 存储学生信息
  String[] names = new String[5];
  int[] ages = new int[5];
  double[] scores = new double[5];
  // 输入学生信息
  for (int i = 0; i < names.length; i++) {
  System.out.println("请输入第 " + (i + 1) + " 个学生的信息:");
  System.out.print("姓名: ");
  names[i] = sc.next();
  System.out.print("年龄: ");
  ages[i] = sc.nextInt();
  System.out.print("成绩: ");
  scores[i] = sc.nextDouble();
  }
  // 输出学生信息
  System.out.println("\n学生信息列表:");
  System.out.println("姓名\t年龄\t成绩");
  System.out.println("------------------------");
  for (int i = 0; i < names.length; i++) {
  System.out.println(names[i] + "\t" + ages[i] + "\t" + scores[i]);
  }
  // 计算平均成绩
  double sum = 0;
  for (double score : scores) {
  sum += score;
  }
  double average = sum / scores.length;
  System.out.println("\n平均成绩: " + average);
  sc.close();
  }
 True}
```

---

### 更新日志 (Changelog)

- 2026-04-05: 拆分并细化 Java 基础语法知识点。
- 2026-04-05: 扩写内容，增加详细的程序结构、注释规范、标识符命名、关键字和键盘录入的概念、示例和最佳实践。
