---
order: 380
title: Java 枚举进阶 EnumSet/EnumMap/枚举单例语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Java 枚举进阶 EnumSet/EnumMap/枚举单例语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'java/037-JavaAnnotationsTutorial'
  - 'java/045-JavaRecordClass'
prerequisites:
  - 'java/037-JavaAnnotationsTutorial'
---

## 0. 本节阅读指引（先读这一节）

本篇是「枚举进阶」语法速查手册，按需查阅。

零基础第一遍只读：枚举定义、枚举方法、EnumSet、EnumMap；枚举实现接口、枚举单例遇到再查（单例模式见 071 设计模式）。

前置：034 枚举与注解。


## 枚举定义

**基本写法：简单枚举**
```java
public enum <名称> { <常量1>, <常量2> }
```
```java
// 定义枚举类型
public enum Color { RED, GREEN, BLUE }
```

---

**基本写法：带字段枚举**
```java
public enum <名称> {
  <常量>(<参数>);
  private final <类型> <字段>;
  <名称>(<类型> <参数>) { this.<字段> = <参数>; }
}
```
```java
// 枚举带属性与方法
public enum Planet {
    EARTH(6371), MARS(3390);
    private final int radius;
    Planet(int r) { this.radius = r; }
    public int getRadius() { return radius; }
}
```

---

**基本写法：带抽象方法**
```java
public enum <名称> {
  <常量> { @Override public <返回> <方法>() { } };
  public abstract <返回> <方法>();
}
```
```java
// 每个常量实现自己的行为
public enum Op {
    PLUS { public int apply(int a, int b) { return a + b; } },
    MINUS { public int apply(int a, int b) { return a - b; } };
    public abstract int apply(int a, int b);
}
```

---

## 枚举方法

**基本写法：获取所有常量**
`<枚举>.values();`
```java
// 返回所有枚举常量数组
Color[] all = Color.values();
```

---

**基本写法：按名获取**
`<枚举>.valueOf(<名称>);`
```java
// 按字符串名获取常量
Color c = Color.valueOf("RED");
```

---

**基本写法：序号**
`<常量>.ordinal();`
```java
// 返回常量声明序号（从 0 开始）
int idx = Color.RED.ordinal();
```

---

**基本写法：比较**
`<常量>.compareTo(<其他>);`
```java
// 按 ordinal 比较
int r = Color.RED.compareTo(Color.BLUE);
```

---

**基本写法：名称**
`<常量>.name();`
```java
// 返回常量名字符串
String n = Color.RED.name();
```

---

## EnumSet 枚举集合

**基本写法：所有常量集合**
`EnumSet.allOf(<枚举类>.class);`
```java
// 创建包含全部常量的集合
EnumSet<Color> all = EnumSet.allOf(Color.class);
```

---

**基本写法：指定常量集合**
`EnumSet.of(<常量>...);`
```java
// 创建包含部分常量的集合
EnumSet<Color> warm = EnumSet.of(Color.RED);
```

---

**基本写法：补集**
`EnumSet.complementOf(<EnumSet>);`
```java
// 返回传入集合的补集
EnumSet<Color> rest = EnumSet.complementOf(warm);
```

---

**基本写法：范围**
`EnumSet.range(<起>, <止>);`
```java
// 创建常量区间集合
EnumSet<Color> r = EnumSet.range(Color.RED, Color.BLUE);
```

---

## EnumMap 枚举映射

**基本写法：创建 EnumMap**
`new EnumMap<<枚举>, <值>>(<枚举类>.class);`
```java
// 键为枚举的高效 Map
EnumMap<Color, String> names = new EnumMap<>(Color.class);
names.put(Color.RED, "红色");
```

---

## 枚举实现接口

**基本写法：枚举实现接口**
```java
public interface <接口> { <方法签名>; }
public enum <名称> implements <接口> { ... }
```
```java
// 枚举实现接口统一行为
public interface Operation { int apply(int a, int b); }
public enum BasicOp implements Operation {
    PLUS { public int apply(int a, int b) { return a + b; } }
}
```

---

## 枚举单例

**基本写法：枚举单例模式**
```java
public enum <名称> {
  INSTANCE;
  public void <方法>() { }
}
```
```java
// 线程安全的单例实现
public enum AppConfig {
    INSTANCE;
    private final Map<String, String> cfg = new HashMap<>();
    public String get(String k) { return cfg.get(k); }
}
// 使用：AppConfig.INSTANCE.get("key")
```
