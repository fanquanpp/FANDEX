---
order: 400
title: Java 类型擦除与桥接方法语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Java 类型擦除与桥接方法语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'java/039-GenericDetailed'
  - 'java/041-JavaGenericsTutorial'
prerequisites:
  - 'java/039-GenericDetailed'
---

## 0. 本节阅读指引（先读这一节）

本篇是「类型擦除与桥接方法」语法速查手册，按需查阅。

零基础第一遍只读：类型擦除规则与桥接方法；反射获取泛型、泛型数组、可重写类型参数遇到再查。

前置：036 泛型详解。


## 类型擦除规则

**基本写法：擦除为上界**
```java
// 源码：List<T>  字节码：List<Object>
// 源码：List<T extends Number>  字节码：List<Number>
```
```java
// 编译后泛型类型参数被擦除
public class Box<T> {
    private T value;
    // 字节码中 value 类型为 Object
}
```

---

**基本写法：擦除影响**
```java
// 运行时无法获取泛型类型参数
if (list instanceof List<String>) { } // 编译错误
```
```java
// 不能 new 泛型类型
T t = new T(); // 编译错误
```

---

## 反射获取泛型

**基本写法：获取字段泛型**
`<field>.getGenericType();`
```java
// 通过反射获取字段的参数化类型
Field f = Box.class.getDeclaredField("value");
Type t = f.getGenericType();
if (t instanceof ParameterizedType pt) {
    Type[] args = pt.getActualTypeArguments();
}
```

---

**基本写法：获取方法返回泛型**
`<method>.getGenericReturnType();`
```java
// 获取方法的泛型返回类型
Method m = clazz.getMethod("getList");
Type rt = m.getGenericReturnType();
```

---

**基本写法：TypeToken 模式**
```java
// 通过子类保留泛型信息
Type type = new TypeToken<List<String>>() {}.getType();
```
```java
// Gson 等库常用此模式
Type type = new TypeToken<Map<String, List<Integer>>>() {}.getType();
```

---

## 桥接方法

**基本写法：桥接方法生成**
```java
// 子类覆盖泛型方法时编译器生成桥接方法
class StringBox extends Box<String> {
    @Override public void set(String v) { super.set(v); }
    // 编译器生成：public void set(Object v) { set((String) v); }
}
```
```java
// 桥接方法保证多态正确
Box<String> b = new StringBox();
b.set("hi"); // 实际调用桥接方法
```

---

**基本写法：识别桥接方法**
`<method>.isBridge();`
```java
// 反射判断是否桥接方法
for (Method m : StringBox.class.getMethods()) {
    if (m.isBridge()) System.out.println(m);
}
```

---

## 泛型数组

**基本写法：泛型数组限制**
```java
// 不能直接创建泛型数组
List<String>[] arr = new List<String>[10]; // 编译错误
```
```java
// 通过原始类型或 Array.newInstance 创建
List<?>[] arr = new List<?>[10];
```

---

**基本写法：Array.newInstance**
`Array.newInstance(<类型>, <长度>);`
```java
// 反射创建泛型数组
T[] arr = (T[]) Array.newInstance(componentType, 10);
```

---

## 可重写类型参数

**基本写法：保留泛型信息的类**
```java
// 通过 Class 对象保留类型
public class TypedBox<T> {
    private final Class<T> type;
    public TypedBox(Class<T> type) { this.type = type; }
    public T cast(Object o) { return type.cast(o); }
}
```
```java
// 运行时仍可使用类型
TypedBox<String> b = new TypedBox<>(String.class);
String s = b.cast("hello");
```
