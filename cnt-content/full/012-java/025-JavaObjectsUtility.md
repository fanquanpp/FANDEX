---
order: 250
title: Java Objects 工具类语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Java Objects 工具类语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'java/018-ExceptionHandlingMechanism'
  - 'java/024-JavaComparatorComparable'
prerequisites:
  - 'java/015-OOP'
---

## 0. 本节阅读指引（先读这一节）

本篇是「Objects 工具类」语法速查手册，按需查阅。

零基础第一遍只读：非空检查（requireNonNull 是防御性编程核心）、相等与哈希、比较操作；其余小节遇到再查。

前置：014 面向对象编程。


## 非空检查

**基本写法：要求非空**
`Objects.requireNonNull(<对象>);`
```java
// 为 null 抛 NullPointerException
Objects.requireNonNull(name);
```

---

**基本写法：带消息的非空检查**
`Objects.requireNonNull(<对象>, <消息>);`
```java
// 抛出带消息的 NPE
Objects.requireNonNull(name, "name 不能为空");
```

---

**基本写法：带 Supplier 消息**
`Objects.requireNonNull(<对象>, <Supplier>);`
```java
// 延迟构造消息
Objects.requireNonNull(name, () -> "字段 " + fieldName + " 不能为空");
```

---

**基本写法：requireNonNullElse**
`Objects.requireNonNullElse(<对象>, <默认值>);`
```java
// Java 9+ 为 null 返回默认值
String v = Objects.requireNonNullElse(name, "default");
```

---

**基本写法：requireNonNullElseGet**
`Objects.requireNonNullElseGet(<对象>, <Supplier>);`
```java
// 为 null 时用 Supplier 生成默认值
String v = Objects.requireNonNullElseGet(name, () -> fetchDefault());
```

---

## 相等与哈希

**基本写法：判等**
`Objects.equals(<a>, <b>);`
```java
// 安全的 equals，避免 NPE
boolean ok = Objects.equals(a, b);
```

---

**基本写法：深度判等**
`Objects.deepEquals(<a>, <b>);`
```java
// 数组深度比较
boolean ok = Objects.deepEquals(arr1, arr2);
```

---

**基本写法：哈希码**
`Objects.hash(<字段>...);`
```java
// 多字段组合哈希码
@Override public int hashCode() {
    return Objects.hash(name, age);
}
```

---

**基本写法：单值哈希**
`Objects.hashCode(<对象>);`
```java
// 单个对象的哈希码
int h = Objects.hashCode(name);
```

---

## 字符串表示

**基本写法：toString**
`Objects.toString(<对象>);`
```java
// 调用 toString，null 返回 "null"
String s = Objects.toString(obj);
```

---

**基本写法：带默认值 toString**
`Objects.toString(<对象>, <默认值>);`
```java
// 为 null 返回默认值
String s = Objects.toString(obj, "N/A");
```

---

**基本写法：toIdentityString**
`Objects.toIdentityString(<对象>);`
```java
// 返回类名@哈希码形式
String s = Objects.toIdentityString(obj);
```

---

## 比较操作

**基本写法：比较**
`Objects.compare(<a>, <b>, <比较器>);`
```java
// 用比较器比较两个对象
int r = Objects.compare("a", "b", Comparator.naturalOrder());
```

---

## 索引检查

**基本写法：检查索引**
`Objects.checkIndex(<索引>, <长度>);`
```java
// 检查索引在 [0, length) 范围
int i = Objects.checkIndex(5, 10);
```

---

**基本写法：检查范围**
`Objects.checkFromToIndex(<起>, <止>, <长度>);`
```java
// 检查 [from, to) 在 [0, length) 范围
Objects.checkFromToIndex(2, 5, 10);
```

---

**基本写法：检查起始长度**
`Objects.checkFromIndexSize(<起>, <大小>, <长度>);`
```java
// 检查 [from, from+size) 在 [0, length) 范围
Objects.checkFromIndexSize(2, 3, 10);
```

---

## 数组相关

**基本写法：数组相等**
`Objects.equals(<数组1>, <数组2>);`
```java
// 用 Objects.equals 比较数组引用
boolean same = Objects.equals(arr1, arr2);
```

---

## 验证工具

**基本写法：校验后返回值**
`<表达式> == null ? <默认> : <对象>`
```java
// 配合 requireNonNullElse 使用
String v = Objects.requireNonNullElseElseGet(name, () -> "");
```

---

## 防御性拷贝

**基本写法：复制不可变**
```java
// 通过不可变工厂方法
List<String> imm = List.copyOf(mutableList);
```
```java
// Java 10+ 拷贝为不可变集合
List<String> safe = List.copyOf(original);
Set<String> safeSet = Set.copyOf(original);
Map<String, Integer> safeMap = Map.copyOf(original);
```

---

## 通用工具

**基本写法：获取类名**
`<对象>.getClass().getName();`
```java
// 获取运行时类名
String name = obj.getClass().getName();
```

---

**基本写法：instanceof 模式匹配**
`<对象> instanceof <类型> <变量>`
```java
// Java 16+ 模式匹配
if (obj instanceof String s) {
    System.out.println(s.length());
}
```

---

## 防御性编程

**基本写法：参数校验组合**
```java
public void set(String name, int age) {
    this.name = Objects.requireNonNull(name);
    if (Objects.checkIndex(age, 151) != age) throw new IllegalArgumentException();
}
```
```java
// 综合使用 Objects 进行参数校验
public User(String name, int age) {
    this.name = Objects.requireNonNull(name, "name");
    this.age = age >= 0 && age <= 150 ? age : -1;
}
```
