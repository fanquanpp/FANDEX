---
order: 240
title: Java Comparator/Comparable 语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Java Comparator/Comparable 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'java/021-CollectionFrameworkDetailed'
  - 'java/025-JavaObjectsUtility'
prerequisites:
  - 'java/021-CollectionFrameworkDetailed'
---

## 0. 本节阅读指引（先读这一节）

本篇是「Comparable / Comparator」语法速查手册，按需查阅。

零基础第一遍只读：Comparable 自然排序、Comparator 比较器、排序使用三节，掌握两种排序方式的选择；基本类型比较、自定义比较器遇到再查。

前置：020 集合框架详解。


## Comparable 自然排序

**基本写法：实现 Comparable**
```java
public class <类> implements Comparable<<类>> {
  public int compareTo(<类> other) { ... }
}
```
```java
// 定义自然排序
public class Person implements Comparable<Person> {
    private int age;
    public int compareTo(Person other) {
        return Integer.compare(this.age, other.age);
    }
}
```

---

## Comparator 比较器

**基本写法：创建比较器**
`Comparator.<comparing方法>(<keyExtractor>);`
```java
// 按属性创建比较器
Comparator<Person> byAge = Comparator.comparingInt(Person::getAge);
```

---

**基本写法：链式比较**
`<comparator>.thenComparing(<keyExtractor>);`
```java
// 主排序字段相等时用次排序字段
Comparator<Person> c = Comparator
    .comparing(Person::getDept)
    .thenComparingInt(Person::getAge);
```

---

**基本写法：反向**
`<comparator>.reversed();`
```java
// 反转排序
Comparator<Person> desc = byAge.reversed();
```

---

**基本写法：nulls 优先**
`Comparator.nullsFirst(<比较器>);`
```java
// null 排在最前
Comparator<String> c = Comparator.nullsFirst(Comparator.naturalOrder());
```

---

**基本写法：nulls 最后**
`Comparator.nullsLast(<比较器>);`
```java
// null 排在最后
Comparator<String> c = Comparator.nullsLast(Comparator.naturalOrder());
```

---

**基本写法：自然顺序**
`Comparator.naturalOrder();`
```java
// 使用元素自然顺序
Comparator<String> c = Comparator.naturalOrder();
```

---

**基本写法：反向自然顺序**
`Comparator.reverseOrder();`
```java
// 反向自然顺序
Comparator<String> c = Comparator.reverseOrder();
```

---

## 排序使用

**基本写法：集合排序**
`<list>.sort(<比较器>);`
```java
// 用比较器排序
list.sort(Comparator.comparing(Person::getName));
```

---

**基本写法：Stream 排序**
`<stream>.sorted(<比较器>);`
```java
// 流排序
list.stream().sorted(Comparator.comparingInt(Person::getAge).reversed());
```

---

**基本写法：求最大最小**
`<stream>.max(<比较器>);`
```java
// 用比较器求最大值
Optional<Person> oldest = list.stream().max(Comparator.comparingInt(Person::getAge));
```

---

## 基本类型比较

**基本写法：Integer 比较**
`Integer.compare(<a>, <b>);`
```java
// 比较两个 int 返回 -1/0/1
int r = Integer.compare(1, 2);
```

---

**基本写法：比较静态方法**
`<包装类>.compare(<a>, <b>);`
```java
// Long/Double 等都有 compare
int r = Double.compare(1.0, 2.0);
```

---

**基本写法：Objects.compare**
`Objects.compare(<a>, <b>, <比较器>);`
```java
// 工具方法
int r = Objects.compare("a", "b", Comparator.naturalOrder());
```

---

## 自定义比较器

**基本写法：lambda 比较**
`Comparator<<类型>> <变量> = (a, b) -> <表达式>;`
```java
// 用 lambda 自定义比较逻辑
Comparator<String> byLen = (a, b) -> Integer.compare(a.length(), b.length());
```

---

**基本写法：comparingDouble**
`Comparator.comparingDouble(<keyExtractor>);`
```java
// 按 double 属性比较
Comparator<Product> byPrice = Comparator.comparingDouble(Product::getPrice);
```

---

**基本写法：comparingLong**
`Comparator.comparingLong(<keyExtractor>);`
```java
// 按 long 属性比较
Comparator<Event> byTime = Comparator.comparingLong(Event::getTimestamp);
```
