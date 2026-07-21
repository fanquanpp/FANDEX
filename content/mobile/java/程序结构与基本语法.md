# Java 程序结构与基本语法

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 源文件结构

**基本写法：包声明**
`package <包名>;`
```java
// 声明源文件所属的包
package com.example;
```

---

**基本写法：导入单个类**
`import <全限定类名>;`
```java
// 导入需要使用的类
import java.util.Scanner;
```

---

**基本写法：导入整个包**
`import <包名>.*;`
```java
// 导入整个包下的所有类
import java.util.*;
```

---

**基本写法：类定义**
`<修饰符> class <类名> { }`
```java
// 定义一个公开类
public class HelloWorld {
}
```

---

**单行写法：简单类定义**
`<修饰符> class <类名> { }`
```java
// 单行定义一个空类
public class Empty { }
```

---

**换行写法：完整类定义**
`<修饰符> class <类名> extends <父类> implements <接口> { <成员变量> <构造方法> <成员方法> }`
```java
// 定义带继承与接口实现的完整类
public class Student extends Person implements Serializable {
    private String studentId;
    private String major;
}
```

---

## 主方法

**基本写法：主方法定义**
`public static void main(String[] args) { }`
```java
// 定义程序入口方法
public static void main(String[] args) {
}
```

---

**基本写法：主方法输出**
`public static void main(String[] args) { System.out.println(<内容>); }`
```java
// 在主方法中输出字符串
public static void main(String[] args) {
    System.out.println("Hello, World!");
}
```

---

**基本写法：读取命令行参数**
`<参数>[<索引>]`
```java
// 读取第一个命令行参数
public static void main(String[] args) {
    String firstArg = args[0];
}
```

---

## 注释规范

**基本写法：单行注释**
`// <注释内容>`
```java
// 这是一个单行注释
int age = 18;
```

---

**基本写法：多行注释**
`/* <注释内容> */`
```java
/* 这是一个多行注释 */
int sum = 0;
```

---

**换行写法：多行注释**
`/* <注释内容> */`
```java
/*
 * 这是一个多行注释
 * 可以跨越多行
 */
int sum = 0;
```

---

**基本写法：文档注释**
`/** <注释内容> */`
```java
/** 计算两个数的和 */
public int add(int a, int b) {
    return a + b;
}
```

---

**换行写法：文档注释带标签**
`/** <描述> @param <参数名> <说明> @return <说明> */`
```java
/**
 * 计算两个数的和
 * @param a 第一个加数
 * @param b 第二个加数
 * @return 两个数的和
 */
public int add(int a, int b) {
    return a + b;
}
```

---

## 标识符命名规范

**基本写法：类名命名**
`<UpperCamelCase>`
```java
// 类名使用大驼峰命名法
HelloWorld
```

---

**基本写法：方法名命名**
`<lowerCamelCase>`
```java
// 方法名使用小驼峰命名法
getUserName
```

---

**基本写法：变量名命名**
`<lowerCamelCase>`
```java
// 变量名使用小驼峰命名法
ageCount
```

---

**基本写法：包名命名**
`<全小写.分隔>`
```java
// 包名全小写使用点分隔
com.example.util
```

---

**基本写法：常量名命名**
`<UPPER_SNAKE_CASE>`
```java
// 常量名全大写使用下划线分隔
MAX_VALUE
```

---

## 键盘录入

**基本写法：创建 Scanner 对象**
`Scanner <变量名> = new Scanner(System.in);`
```java
// 创建用于读取控制台输入的 Scanner 对象
Scanner sc = new Scanner(System.in);
```

---

**基本写法：读取整数**
`<Scanner对象>.nextInt();`
```java
// 读取用户输入的整数
int num = sc.nextInt();
```

---

**基本写法：读取浮点数**
`<Scanner对象>.nextDouble();`
```java
// 读取用户输入的浮点数
double d = sc.nextDouble();
```

---

**基本写法：读取布尔值**
`<Scanner对象>.nextBoolean();`
```java
// 读取用户输入的布尔值
boolean b = sc.nextBoolean();
```

---

**基本写法：读取一个单词**
`<Scanner对象>.next();`
```java
// 读取一个单词遇到空格停止
String str = sc.next();
```

---

**基本写法：读取整行**
`<Scanner对象>.nextLine();`
```java
// 读取整行输入
String line = sc.nextLine();
```

---

**基本写法：关闭 Scanner**
`<Scanner对象>.close();`
```java
// 关闭 Scanner 释放资源
sc.close();
```

---

## 代码风格

**基本写法：K&R 风格左大括号**
`if (<条件>) { }`
```java
// 左大括号放在行尾
if (condition) {
}
```

---

**基本写法：try-with-resources**
`try (<资源声明>) { }`
```java
// 自动关闭资源的 try 语句
try (Scanner sc = new Scanner(System.in)) {
}
```

---

## Java 25+ 新特性

**基本写法：Java 21+ record 记录类**
`public record <名称>(<字段>) { }`
```java
// 定义不可变的数据载体记录类
public record Point(int x, int y) { }
```

---

**基本写法：Java 21+ sealed 密封类**
`public sealed class <名称> permits <子类> { }`
```java
// 限制可继承的子类范围
public sealed class Shape permits Circle, Square, Triangle { }
```

---

**基本写法：Java 21+ 模式匹配 switch**
`switch (<obj>) { case <类型> <变量> -> <语句>; }`
```java
// 使用类型模式匹配的 switch 表达式
String result = switch (obj) {
    case Integer i -> "整数: " + i;
    case String s -> "字符串: " + s;
    default -> "未知类型";
};
```

---

**基本写法：Java 21+ 文本块**
`"""<多行文本>"""`
```java
// 使用三引号定义多行字符串
String json = """
        {
            "name": "Tom",
            "age": 18
        }
        """;
```

---

**基本写法：Java 25+ 严格浮点（默认恢复 strictfp 行为）**
`<修饰符> class <类名> { }`
```java
// Java 25 起默认采用严格浮点语义，无需显式声明 strictfp
public class Calculator {
    public double compute() {
        return 0.1 + 0.2;  // 在所有平台上结果一致
    }
}
```

---

**基本写法：Java 25+ scoped values**
`ScopedValue.where(<name>, <value>).run(() -> { })`
```java
// 使用 ScopedValue 在线程作用域内共享不可变值
private static final ScopedValue<String> USER_ID = ScopedValue.newInstance();
ScopedValue.where(USER_ID, "user123").run(() -> {
    System.out.println(USER_ID.get());
});
```

---

**基本写法：Java 25+ structured concurrency**
`try (var scope = new StructuredTaskScope.ShutdownOnFailure()) { }`
```java
// 使用结构化并发管理多个子任务的生命周期
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    var task1 = scope.fork(() -> fetchUser());
    var task2 = scope.fork(() -> fetchOrders());
    scope.join().throwIfFailed();
    var user = task1.get();
    var orders = task2.get();
}
```

---

**基本写法：Java 25+ virtual threads**
`Thread.ofVirtual().start(() -> { })`
```java
// 启动虚拟线程执行轻量级并发任务
Thread vThread = Thread.ofVirtual().start(() -> {
    System.out.println("运行在虚拟线程: " + Thread.currentThread());
});
```

---

**基本写法：Java 25+ module info 模块声明**
`module <模块名> { exports <包>; requires <模块>; }`
```java
// 在 module-info.java 中声明模块依赖关系
module com.example.app {
    exports com.example.app.api;
    requires java.sql;
    requires transitive java.base;
}
```
