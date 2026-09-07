---
order: 230
title: Java Iterator/Iterable/Spliterator 语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Java Iterator/Iterable/Spliterator 语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'java/021-CollectionFrameworkDetailed'
  - 'java/030-StreamAPI'
prerequisites:
  - 'java/021-CollectionFrameworkDetailed'
---

## 0. 本节阅读指引（先读这一节）

本篇是「Iterator / Iterable / Spliterator」语法速查手册，按需查阅。

零基础第一遍只读：Iterator 接口与 Iterable 接口，理解 for-each 的底层原理；Spliterator、StreamSupport、自定义 Iterator、ListIterator 遇到再查。

前置：020 集合框架详解。


## Iterator 接口

**基本写法：获取迭代器**
`<collection>.iterator();`
```java
// 从集合获取迭代器
Iterator<String> it = list.iterator();
```

---

**基本写法：遍历**
```java
while (<it>.hasNext()) { <类型> <变量> = <it>.next(); }
```
```java
// 经典迭代器遍历
while (it.hasNext()) {
    String s = it.next();
    System.out.println(s);
}
```

---

**基本写法：移除元素**
`<it>.remove();`
```java
// 移除最近 next() 返回的元素
it.remove();
```

---

**基本写法：forEachRemaining**
`<it>.forEachRemaining(<消费者>);`
```java
// 用 lambda 处理剩余元素
it.forEachRemaining(System.out::println);
```

---

## Iterable 接口

**基本写法：实现 Iterable**
```java
public class <类> implements Iterable<<类型>> {
  public Iterator<<类型>> iterator() { ... }
}
```
```java
// 自定义可迭代集合
public class MyList implements Iterable<String> {
    public Iterator<String> iterator() { return list.iterator(); }
}
```

---

**基本写法：增强 for 循环**
```java
for (<类型> <变量> : <iterable>) { }
```
```java
// 任何 Iterable 都可用增强 for
for (String s : myList) {
    System.out.println(s);
}
```

---

**基本写法：默认 forEach**
`<iterable>.forEach(<消费者>);`
```java
// Iterable 接口的默认方法
list.forEach(System.out::println);
```

---

**基本写法：spliterator**
`<iterable>.spliterator();`
```java
// 获取可分割迭代器
Spliterator<String> sp = list.spliterator();
```

---

## Spliterator 可分割迭代器

**基本写法：tryAdvance 单个处理**
`<sp>.tryAdvance(<消费者>);`
```java
// 处理一个元素返回是否还有
boolean has = sp.tryAdvance(System.out::println);
```

---

**基本写法：forEachRemaining**
`<sp>.forEachRemaining(<消费者>);`
```java
// 处理所有剩余元素
sp.forEachRemaining(System.out::println);
```

---

**基本写法：尝试分割**
`<sp>.trySplit();`
```java
// 把迭代器一分为二用于并行
Spliterator<String> other = sp.trySplit();
```

---

**基本写法：估算大小**
`<sp>.estimateSize();`
```java
// 估算剩余元素数量
long n = sp.estimateSize();
```

---

**基本写法：特征**
`<sp>.characteristics();`
```java
// 返回特征位
int chars = sp.characteristics();
boolean sorted = sp.hasCharacteristics(Spliterator.SORTED);
```

---

## StreamSupport 转 Stream

**基本写法：Spliterator 转 Stream**
`StreamSupport.stream(<spliterator>, <并行>);`
```java
// 把 Spliterator 转为 Stream
Stream<String> s = StreamSupport.stream(sp, false);
```

---

**基本写法：从迭代器创建流**
`StreamSupport.stream(Spliterators.spliteratorUnknownSize(<it>, 0), false);`
```java
// Iterator 转 Stream
Stream<String> s = StreamSupport.stream(
    Spliterators.spliteratorUnknownSize(it, 0), false);
```

---

## 自定义 Iterator

**基本写法：实现 Iterator**
```java
public class <类> implements Iterator<<类型>> {
  public boolean hasNext() { ... }
  public <类型> next() { ... }
}
```
```java
// 自定义迭代器
public class RangeIt implements Iterator<Integer> {
    private int cur, end;
    public RangeIt(int s, int e) { cur = s; end = e; }
    public boolean hasNext() { return cur < end; }
    public Integer next() { return cur++; }
}
```

---

## ListIterator 双向迭代

**基本写法：获取 ListIterator**
`<list>.listIterator();`
```java
// 获取双向迭代器
ListIterator<String> li = list.listIterator();
```

---

**基本写法：向前遍历**
`<li>.hasPrevious(); <li>.previous();`
```java
// 反向遍历
while (li.hasPrevious()) {
    String s = li.previous();
}
```

---

**基本写法：set 修改**
`<li>.set(<值>);`
```java
// 修改最近 next/previous 返回的元素
li.set("new");
```

---

**基本写法：add 插入**
`<li>.add(<值>);`
```java
// 在当前位置插入元素
li.add("inserted");
```

---

**基本写法：nextIndex/previousIndex**
`<li>.nextIndex();`
```java
// 返回下一个元素索引
int i = li.nextIndex();
```
