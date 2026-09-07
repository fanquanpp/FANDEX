---
order: 140
title: Java String.format/printf/MessageFormat 语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Java String.format/printf/MessageFormat 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'java/013-JavaStringDetailed'
prerequisites:
  - 'java/013-JavaStringDetailed'
---

## 0. 本节阅读指引（先读这一节）

本篇是「String.format / printf / MessageFormat」语法速查手册，按需查阅。

零基础第一遍只读：String.format 与常用格式说明符，能写出 %s、%d、%f 即可；宽度与对齐、参数索引、printf、MessageFormat、Formatter 遇到再查。

前置：012 Java 字符串详解。


## String.format

**基本写法：格式化字符串**
`String.format(<格式>, <参数>...);`
```java
// 格式化字符串
String s = String.format("name=%s, age=%d", "Tom", 18);
```

---

**基本写法：带 Locale**
`String.format(<Locale>, <格式>, <参数>...);`
```java
// 指定地区
String s = String.format(Locale.US, "%,.2f", 1234567.89);
```

---

## 常用格式说明符

**基本写法：字符串**
`%s`
```java
// 字符串占位符
String s = String.format("hello %s", "world");
```

---

**基本写法：整数**
`%d`
```java
// 十进制整数
String s = String.format("count=%d", 42);
```

---

**基本写法：浮点**
`%.2f`
```java
// 保留两位小数
String s = String.format("%.2f", 3.14159);
```

---

**基本写法：十六进制**
`%x`
```java
// 十六进制小写
String s = String.format("%x", 255); // ff
```

---

**基本写法：八进制**
`%o`
```java
// 八进制
String s = String.format("%o", 8); // 10
```

---

**基本写法：字符**
`%c`
```java
// 字符
String s = String.format("%c", 65); // A
```

---

**基本写法：布尔**
`%b`
```java
// 布尔
String s = String.format("%b", true);
```

---

## 宽度与对齐

**基本写法：指定宽度**
`%<宽度>d`
```java
// 最小宽度 5
String s = String.format("%5d", 42); // "   42"
```

---

**基本写法：左对齐**
`%-<宽度>d`
```java
// 左对齐宽度 5
String s = String.format("%-5d|", 42); // "42   |"
```

---

**基本写法：零填充**
`%0<宽度>d`
```java
// 用 0 填充
String s = String.format("%05d", 42); // "00042"
```

---

**基本写法：千分位**
`%,d`
```java
// 千分位分隔符
String s = String.format("%,d", 1234567); // 1,234,567
```

---

**基本写法：正负号**
`%+d`
```java
// 显示正负号
String s = String.format("%+d", 42); // +42
```

---

## 参数索引

**基本写法：指定参数位置**
`%<索引>$<格式>`
```java
// 使用第 1 个参数
String s = String.format("%1$s = %1$s", "hello");
```

---

**基本写法：重复使用参数**
`%<索引>$<格式>`
```java
// 复用同一参数
String s = String.format("%1$s has %2$d items, %1$s is ok", "Tom", 5);
```

---

## System.out.printf

**基本写法：直接输出**
`System.out.printf(<格式>, <参数>...);`
```java
// 格式化打印到标准输出
System.out.printf("name=%s, age=%d%n", "Tom", 18);
```

---

## 换行符

**基本写法：平台无关换行**
`%n`
```java
// 平台无关的换行符
String s = String.format("line1%nline2");
```

---

**基本写法：System.lineSeparator**
`System.lineSeparator();`
```java
// 获取系统换行符
String nl = System.lineSeparator();
```

---

## MessageFormat

**基本写法：消息格式化**
`MessageFormat.format(<模板>, <参数>...);`
```java
// 使用 MessageFormat
String s = MessageFormat.format("At {0,time} on {0,date}, {1} sent", new Date(), "Tom");
```

---

**基本写法：占位符索引**
`{<索引>}`
```java
// 占位符格式 {索引,类型,样式}
String s = MessageFormat.format("{0} + {1} = {2}", 1, 2, 3);
```

---

**基本写法：数字格式**
`{<索引>,number,<样式>}`
```java
// 数字格式化
String s = MessageFormat.format("{0,number,#.##}", 3.14159);
```

---

**基本写法：选择格式**
`{<索引>,choice,<选项>}`
```java
// 选择性文本
String s = MessageFormat.format("{0,choice,0#no items|1#one item|1<many items}", 5);
```

---

## Formatter 类

**基本写法：使用 Formatter**
`new Formatter().format(<格式>, <参数>).toString();`
```java
// Formatter 流式格式化
String s = new Formatter().format("x=%d, y=%d", 1, 2).toString();
```

---

**基本写法：输出到 StringBuilder**
`new Formatter(<StringBuilder>).format(<格式>, <参数>);`
```java
// 把格式化结果追加到 StringBuilder
StringBuilder sb = new StringBuilder();
new Formatter(sb).format("value=%d%n", 42);
```
