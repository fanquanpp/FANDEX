---
order: 310
title: Java Optional 类
module: 'java'
category: 后端技术
difficulty: beginner
description: Java Optional 类 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'java/290-LambdaFunctionalProgramming'
  - 'java/300-StreamAPI'
prerequisites:
  - 'java/290-LambdaFunctionalProgramming'
---

## 0. 本节阅读指引（先读这一节）

本篇是「Optional 类」语法速查手册，按需查阅。

零基础第一遍只读：创建 Optional、判断与获取、默认值、链式操作；其余（备选 Optional、流式消费、与 Stream 结合、原始类型、实用模式）遇到再查。

前置：027 Lambda 与函数式编程。


## 创建 Optional

**基本写法：创建非空 Optional**
`Optional.of(<值>);`
```java
// 包装非空值，为 null 抛 NPE
Optional<String> o = Optional.of("hello");
```

---

**基本写法：创建可空 Optional**
`Optional.ofNullable(<值>);`
```java
// 包装可能为 null 的值
Optional<String> o = Optional.ofNullable(getName());
```

---

**基本写法：创建空 Optional**
`Optional.empty();`
```java
// 创建空 Optional
Optional<String> empty = Optional.empty();
```

---

## 判断与获取

**基本写法：判断是否存在**
`<optional>.isPresent();`
```java
// 判断是否有值
boolean has = o.isPresent();
```

---

**基本写法：判断为空**
`<optional>.isEmpty();`
```java
// Java 11+ 判断是否为空
boolean empty = o.isEmpty();
```

---

**基本写法：获取值**
`<optional>.get();`
```java
// 获取值（为空抛 NoSuchElementException）
String v = o.get();
```

---

**基本写法：存在则执行**
`<optional>.ifPresent(<消费者>);`
```java
// 值存在时执行消费
o.ifPresent(System.out::println);
```

---

## 默认值

**基本写法：默认值**
`<optional>.orElse(<默认值>);`
```java
// 为空返回默认值
String v = o.orElse("default");
```

---

**基本写法：默认值惰性求值**
`<optional>.orElseGet(() -> <计算>);`
```java
// 为空时惰性计算默认值
String v = o.orElseGet(() -> fetchDefault());
```

---

**基本写法：为空抛异常**
`<optional>.orElseThrow();`
```java
// 为空抛 NoSuchElementException
String v = o.orElseThrow();
```

---

**基本写法：抛自定义异常**
`<optional>.orElseThrow(() -> new <异常>());`
```java
// 为空抛自定义异常
String v = o.orElseThrow(() -> new RuntimeException("no value"));
```

---

## 链式操作

**基本写法：map 转换**
`<optional>.map(<函数>);`
```java
// 值存在则转换
Optional<Integer> len = o.map(String::length);
```

---

**基本写法：flatMap 嵌套扁平化**
`<optional>.flatMap(<函数>);`
```java
// 处理返回 Optional 的函数
Optional<String> r = o.flatMap(this::findEmail);
```

---

**基本写法：filter 过滤**
`<optional>.filter(<条件>);`
```java
// 不满足条件则返回空
Optional<String> r = o.filter(s -> s.length() > 3);
```

---

## 提供备选 Optional

**基本写法：备选 Optional**
`<optional>.or(() -> <其他 Optional>);`
```java
// 为空则返回另一个 Optional
Optional<String> r = o.or(() -> Optional.of("backup"));
```

---

## 流式消费

**基本写法：存在则执行 else 执行**
`<optional>.ifPresentOrElse(<消费者>, <运行>);`
```java
// 存在执行 A 否则执行 B
o.ifPresentOrElse(
    v -> System.out.println(v),
    () -> System.out.println("empty")
);
```

---

## Optional 与 Stream

**基本写法：转 Stream**
`<optional>.stream();`
```java
// 转 Stream 便于链式处理
Stream<String> s = o.stream();
```

---

**基本写法：过滤空 Optional**
`<list>.stream().flatMap(Optional::stream)`
```java
// 过滤掉集合中的空 Optional
List<String> r = list.stream()
    .map(this::find)
    .flatMap(Optional::stream)
    .toList();
```

---

## 原始类型 Optional

**基本写法：OptionalInt**
`OptionalInt.of(<值>);`
```java
// int 专用 Optional
OptionalInt oi = OptionalInt.of(42);
```

---

**基本写法：OptionalDouble**
`OptionalDouble.of(<值>);`
```java
// double 专用 Optional
OptionalDouble od = OptionalDouble.of(3.14);
```

---

**基本写法：OptionalLong**
`OptionalLong.of(<值>);`
```java
// long 专用 Optional
OptionalLong ol = OptionalLong.of(100L);
```

---

## 实用模式

**基本写法：方法返回 Optional**
`public Optional<<类型>> <方法>() { return Optional.ofNullable(<值>); }`
```java
// 方法返回 Optional 表达可能为空
public Optional<User> findById(long id) {
    return Optional.ofNullable(map.get(id));
}
```

---

**基本写法：链式调用避免 null**
`opt.map(<取值>).map(<再取>).orElse(<默认>);`
```java
// 链式调用避免 NPE
String city = optUser.map(User::getAddr).map(Addr::getCity).orElse("unknown");
```

---

## equals 比较

**基本写法：安全比较**
`<optional>.equals(<其他 Optional>);`
```java
// 比较两个 Optional 的值
boolean same = o1.equals(o2);
```
