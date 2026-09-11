---
order: 190
title: Java try-with-resources 与异常链语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Java try-with-resources 与异常链语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'java/180-ExceptionHandlingMechanism'
  - 'java/280-IOStreamFileOperation'
prerequisites:
  - 'java/180-ExceptionHandlingMechanism'
---

## 0. 本节阅读指引（先读这一节）

本篇是「try-with-resources 与异常链」语法速查手册，按需查阅。

零基础第一遍只读：try-with-resources 与异常捕获两个小节，掌握自动关闭资源的写法；异常链、finally 块、StackWalker 遇到再查。

前置：017 异常处理机制。


## try-with-resources

**基本写法：自动关闭资源**
```java
try (<资源声明>) { <语句> }
```
```java
// 自动关闭实现了 AutoCloseable 的资源
try (FileInputStream in = new FileInputStream("a.txt")) {
    int b = in.read();
}
```

---

**基本写法：多个资源**
```java
try (<资源1>; <资源2>) { <语句> }
```
```java
// 多个资源用分号分隔，关闭顺序与声明相反
try (FileInputStream in = new FileInputStream("in.txt");
     FileOutputStream out = new FileOutputStream("out.txt")) {
    out.write(in.readAllBytes());
}
```

---

**基本写法：引用外部变量**
```java
<AutoCloseable 变量> = ...;
try (<变量>) { <语句> }
```
```java
// Java 9+ 支持使用 effectively final 的外部资源
BufferedReader r = Files.newBufferedReader(Path.of("a.txt"));
try (r) {
    System.out.println(r.readLine());
}
```

---

## 异常捕获

**基本写法：多异常捕获**
```java
try { <语句> } catch (<类型1> | <类型2> <变量>) { <处理> }
```
```java
// 一个 catch 块处理多种异常
try {
    Files.readAllBytes(Path.of("a.txt"));
} catch (IOException | SecurityException e) {
    log.error(e);
}
```

---

**基本写法：异常重新抛出**
```java
catch (<类型> <变量>) { throw <变量>; }
```
```java
// 处理后再抛出
try { risky(); }
catch (IOException e) { log.error(e); throw e; }
```

---

## 异常链

**基本写法：包装异常**
`throw new <异常>(<消息>, <原因>);`
```java
// 把底层异常包装成业务异常
try {
    Files.readString(Path.of("a.txt"));
} catch (IOException e) {
    throw new BusinessException("读取配置失败", e);
}
```

---

**基本写法：获取根因**
`<throwable>.getCause();`
```java
// 获取异常的根本原因
Throwable root = e.getCause();
```

---

**基本写法：添加受抑制异常**
`<throwable>.addSuppressed(<异常>);`
```java
// 主异常抛出后关闭资源时的异常被抑制
try (Resource r = new Resource()) {
    throw new IOException("main");
} catch (IOException e) {
    for (Throwable s : e.getSuppressed()) {
        System.out.println(s);
    }
}
```

---

## finally 块

**基本写法：finally 执行清理**
```java
try { <语句> } catch (<类型> <变量>) { <处理> } finally { <清理> }
```
```java
// finally 块无论是否抛异常都会执行
try {
    return risky();
} finally {
    cleanup();
}
```

---

## StackWalker 栈遍历

**基本写法：遍历调用栈**
`StackWalker.getInstance().forEach(<消费者>);`
```java
// 打印调用栈
StackWalker.getInstance().forEach(f -> System.out.println(f.getClassName() + "#" + f.getMethodName()));
```

---

**基本写法：获取调用者**
`StackWalker.getInstance().walk(<函数>);`
```java
// 获取直接调用者的栈帧
StackTraceElement caller = StackWalker.getInstance()
    .walk(s -> s.skip(1).findFirst())
    .map(StackWalker.StackFrame::toStackTraceElement)
    .orElse(null);
```
