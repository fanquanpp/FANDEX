---
order: 130
tags:
  - 'java'
  - 'oop'
  - 'memory'
  - 'data-structure'
difficulty: 'intermediate'
title: '异常处理机制'
module: 'java'
category: 'Java Basics'
description: '异常体系、try-catch-finally、自定义异常与最佳实践。'
author: 'Anonymous'
---

## 目录

1. [异常体系](#异常体系)
2. [异常处理](#异常处理)
3. [抛出异常](#抛出异常)
4. [自定义异常](#自定义异常)
5. [Try-with-resources](#try-with-resources)
6. [异常处理的实际应用](#异常处理的实际应用)
7. [异常处理的最佳实践](#异常处理的最佳实践)
8. [常见陷阱](#常见陷阱)
9. [异常处理的性能考虑](#异常处理的性能考虑)

---

## 1. 异常体系 (Exception Hierarchy)

### 1.1 异常的层次结构

Java 中的异常体系以 `Throwable` 为顶级父类，分为两大类：

```
 throwable
 ├── Error
 │ ├── VirtualMachineError
 │ │ ├── StackOverflowError
 │ │ └── OutOfMemoryError
 │ └── ...
 └── Exception
  ├── Checked Exception
  │ ├── IOException
  │ ├── SQLException
  │ └── ...
  └── Unchecked Exception (RuntimeException)
  ├── NullPointerException
  ├── ArithmeticException
  ├── ArrayIndexOutOfBoundsException
  └── ...
```

### 1.2 异常的分类

- **Error**: 严重错误，如 `StackOverflowError`、`OutOfMemoryError`，程序无法恢复
- **Exception**: 应用程序可捕获并处理的异常
- **检查型异常 (Checked Exception)**: 编译时强制要求处理，如 `IOException`、`SQLException`
- **运行时异常 (Runtime / Unchecked Exception)**: 逻辑错误，不强制要求捕获，如 `NullPointerException`、`ArithmeticException`

### 1.3 常见异常类型

#### 1.3.1 运行时异常

- **NullPointerException**: 空指针异常
- **ArithmeticException**: 算术异常（如除零）
- **ArrayIndexOutOfBoundsException**: 数组下标越界异常
- **ClassCastException**: 类型转换异常
- **IllegalArgumentException**: 非法参数异常
- **IllegalStateException**: 非法状态异常

#### 1.3.2 检查型异常

- **IOException**: IO 操作异常
- **SQLException**: 数据库操作异常
- **ClassNotFoundException**: 类未找到异常
- **InterruptedException**: 线程中断异常

## 2. 异常处理 (Try-Catch-Finally)

### 2.1 基本语法

```java
 try {
  // 可能抛出异常的代码
 True} catch (SpecificException e) {
  // 处理特定异常
 True} catch (AnotherException e) {
  // 处理另一种异常
 True} catch (Exception e) {
  // 捕获所有其他异常
 True} finally {
  // 无论是否发生异常，都会执行的代码
 True}
```

### 2.2 异常处理的执行流程

1. 执行 try 块中的代码
2. 如果发生异常，寻找匹配的 catch 块
3. 执行匹配的 catch 块
4. 执行 finally 块
5. 继续执行后续代码

### 2.3 异常对象的常用方法

- **getMessage()**: 获取异常信息
- **printStackTrace()**: 打印异常堆栈信息
- **getCause()**: 获取导致当前异常的原因
- **getStackTrace()**: 获取异常堆栈跟踪信息

### 2.4 异常捕获的顺序

- 先捕获具体的异常，再捕获通用的异常
- 如果先捕获通用异常，后面的具体异常捕获块永远不会执行

```java
 // 正确的顺序
 try {
  // 可能抛出异常的代码
 True} catch (ArithmeticException e) {
  // 处理算术异常
 True} catch (Exception e) {
  // 处理其他异常
 True}
 // 错误的顺序（ArithmeticException 捕获块永远不会执行）
 try {
  // 可能抛出异常的代码
 True} catch (Exception e) {
  // 处理所有异常
 True} catch (ArithmeticException e) {
  // 永远不会执行
 True}
```

## 3. 抛出异常 (Throw & Throws)

### 3.1 throw 关键字

用于在方法体内抛出一个具体的异常对象。

```java
 public void validateAge(int age) {
  if (age < 0) {
  throw new IllegalArgumentException("Age cannot be negative");
  }
  if (age > 150) {
  throw new IllegalArgumentException("Age cannot be greater than 150");
  }
 True}
```

### 3.2 throws 关键字

用于在方法签名处声明该方法可能抛出的异常类型。

```java
 public void readFile(String path) throws IOException, FileNotFoundException {
  if (path == null) {
  throw new NullPointerException("Path cannot be null");
  }
  // 可能抛出 IOException 的代码
 True}
```

### 3.3 throw 与 throws 的区别

| 特性     | throw                  | throws                        |
| -------- | ---------------------- | ----------------------------- |
| **位置** | 方法体内               | 方法签名处                    |
| **作用** | 抛出具体异常对象       | 声明方法可能抛出的异常类型    |
| **数量** | 一次只能抛出一个异常   | 可以声明多个异常              |
| **语法** | throw new Exception(); | throws Exception1, Exception2 |

## 4. 自定义异常 (Custom Exception)

### 4.1 自定义异常的创建

继承 `Exception` (检查型) 或 `RuntimeException` (非检查型)。

#### 4.1.1 自定义检查型异常

```java
 public class BusinessException extends Exception {
  private int errorCode;
  public BusinessException() {
  super();
  }
  public BusinessException(String message) {
  super(message);
  }
  public BusinessException(String message, int errorCode) {
  super(message);
  this.errorCode = errorCode;
  }
  public BusinessException(String message, Throwable cause) {
  super(message, cause);
  }
  public int getErrorCode() {
  return errorCode;
  }
 True}
```

#### 4.1.2 自定义运行时异常

```java
 public class ValidationException extends RuntimeException {
  private String fieldName;
  public ValidationException(String message) {
  super(message);
  }
  public ValidationException(String message, String fieldName) {
  super(message);
  this.fieldName = fieldName;
  }
  public String getFieldName() {
  return fieldName;
  }
 True}
```

### 4.2 自定义异常的使用

```java
 public void registerUser(String username, String password) throws BusinessException {
  if (username == null || username.isEmpty()) {
  throw new BusinessException("Username cannot be empty", 400);
  }
  if (password == null || password.length() < 6) {
  throw new BusinessException("Password must be at least 6 characters", 400);
  }
  // 注册用户的逻辑
 True}
 // 使用自定义异常
 try {
  registerUser("", "123");
 True} catch (BusinessException e) {
  System.out.println("Error code: " + e.getErrorCode());
  System.out.println("Error message: " + e.getMessage());
 True}
```

## 5. Try-with-resources (Java 7+)

### 5.1 基本语法

自动管理实现了 `AutoCloseable` 接口的资源，无需手动关闭。

```java
 try (BufferedReader br = new BufferedReader(new FileReader("file.txt"));
  BufferedWriter bw = new BufferedWriter(new FileWriter("output.txt"))) {
  // 使用资源
  String line;
  while ((line = br.readLine()) != null) {
  bw.write(line);
  bw.newLine();
  }
 True} catch (IOException e) {
  // 处理异常
  e.printStackTrace();
 True} // 自动关闭资源
```

### 5.2 实现 AutoCloseable 接口

```java
 public class CustomResource implements AutoCloseable {
  public CustomResource() {
  System.out.println("Resource created");
  }
  public void use() {
  System.out.println("Resource used");
  }
  @Override
  public void close() throws Exception {
  System.out.println("Resource closed");
  }
 True}
 // 使用自定义资源
 try (CustomResource resource = new CustomResource()) {
  resource.use();
 True} catch (Exception e) {
  e.printStackTrace();
 True}
```

### 5.3 Try-with-resources 的优势

- **自动关闭资源**: 无需在 finally 块中手动关闭资源
- **异常抑制**: 如果关闭资源时发生异常，会被抑制，不会影响原始异常
- **代码简洁**: 减少样板代码，提高可读性

## 6. 异常处理的实际应用

### 6.1 分层异常处理

#### 6.1.1 数据访问层

```java
 public class UserDao {
  public User findById(int id) throws SQLException {
  try (Connection conn = getConnection();
  PreparedStatement stmt = conn.prepareStatement("SELECT * FROM users WHERE id = ?")) {
  stmt.setInt(1, id);
  try (ResultSet rs = stmt.executeQuery()) {
  if (rs.next()) {
  return new User(rs.getInt("id"), rs.getString("name"));
  }
  return null;
  }
  }
  }
 True}
```

#### 6.1.2 业务逻辑层

```java
 public class UserService {
  private UserDao userDao = new UserDao();
  public User getUser(int id) throws BusinessException {
  try {
  User user = userDao.findById(id);
  if (user == null) {
  throw new BusinessException("User not found", 404);
  }
  return user;
  } catch (SQLException e) {
  throw new BusinessException("Database error", 500, e);
  }
  }
 True}
```

#### 6.1.3 表现层

```java
 public class UserController {
  private UserService userService = new UserService();
  public void handleGetUser(int id) {
  try {
  User user = userService.getUser(id);
  System.out.println("User found: " + user);
  } catch (BusinessException e) {
  System.out.println("Error: " + e.getMessage());
  // 可以根据错误码进行不同的处理
  }
  }
 True}
```

### 6.2 异常链

将底层异常包装为上层异常，保留原始异常信息。

```java
 try {
  // 可能抛出 SQLException 的代码
 True} catch (SQLException e) {
  // 包装为业务异常，保留原始异常
  throw new BusinessException("Database operation failed", e);
 True}
```

## 7. 异常处理的最佳实践

### 7.1 基本原则

- **不要捕获所有异常**: 应该捕获具体的异常类型
- **不要忽略异常**: 至少应该记录异常信息
- **不要在 finally 中抛出异常**: 会覆盖原始异常
- **使用 try-with-resources 管理资源**: 避免资源泄漏
- **合理使用自定义异常**: 提供更具体的错误信息

### 7.2 异常处理的最佳实践

1. **只捕获可以处理的异常**
2. **对不同的异常进行不同的处理**
3. **记录异常信息**
4. **向上层传递不能处理的异常**
5. **使用 finally 块释放资源**
6. **使用 try-with-resources 管理资源**
7. **合理设计异常层次结构**
8. **在合适的层次处理异常**

### 7.3 异常处理的反模式

- **空 catch 块**: 捕获异常但不做任何处理
- **过度使用异常**: 用异常控制流程
- **捕获并重新抛出相同的异常**: 没有添加任何信息
- **抛出异常过于宽泛**: 如直接抛出 Exception
- **在 finally 块中修改返回值**: 会覆盖 try 或 catch 中的返回值

## 8. 常见陷阱

### 8.1 异常捕获顺序错误

```java
 // 错误的顺序
 try {
  // 代码
 True} catch (Exception e) {
  // 处理所有异常
 True} catch (ArithmeticException e) {
  // 永远不会执行
 True}
```

### 8.2 资源泄漏

```java
 // 错误：没有关闭资源
 BufferedReader br = null;
 try {
  br = new BufferedReader(new FileReader("file.txt"));
  // 使用 br
 True} catch (IOException e) {
  e.printStackTrace();
 True} // 没有关闭 br
 // 正确：使用 try-with-resources
 try (BufferedReader br = new BufferedReader(new FileReader("file.txt"))) {
  // 使用 br
 True} catch (IOException e) {
  e.printStackTrace();
 True}
```

### 8.3 异常信息不完整

```java
 // 错误：没有传递原始异常
 catch (SQLException e) {
  throw new BusinessException("Database error");
 True}
 // 正确：传递原始异常
 catch (SQLException e) {
  throw new BusinessException("Database error", e);
 True}
```

### 8.4 过度使用异常

```java
 // 错误：用异常控制流程
 public int divide(int a, int b) {
  try {
  return a / b;
  } catch (ArithmeticException e) {
  return 0;
  }
 True}
 // 正确：先检查
 public int divide(int a, int b) {
  if (b == 0) {
  return 0;
  }
  return a / b;
 True}
```

## 9. 异常处理的性能考虑

### 9.1 异常的性能开销

- **创建异常对象**: 会捕获当前堆栈信息，开销较大
- **抛出异常**: 会中断正常的执行流程
- **异常处理**: 会影响代码的执行效率

### 9.2 性能优化建议

- **只在真正异常的情况下使用异常**
- **避免在循环中抛出异常**
- **使用检查型异常处理可恢复的错误**
- **使用运行时异常处理编程错误**
- **合理设计异常层次结构**

---

### 更新日志 (Changelog)

- 2026-04-05: 补充 Try-with-resources 与异常处理最佳实践。
- 2026-05-03: 扩展内容，添加异常体系的深入介绍、异常处理的具体实现、自定义异常的详细使用、try-with-resources的深入应用、实际案例和最佳实践。
