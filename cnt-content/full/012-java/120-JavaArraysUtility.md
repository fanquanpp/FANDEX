---
order: 120
title: Java Arrays 工具类语法速查手册
module: 'java'
category: 后端技术
difficulty: beginner
description: Java Arrays 工具类语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'java/110-ArrayDetailed'
  - 'java/210-CollectionFrameworkDetailed'
prerequisites:
  - 'java/110-ArrayDetailed'
---

## 0. 本节阅读指引（先读这一节）

本篇是「Arrays 工具类」语法速查手册，按需查阅，不必从头精读。

零基础第一遍只读：数组排序、数组转字符串、数组转列表三个最常用操作；其余（搜索、拷贝、填充、比较与哈希、转流）遇到再查。

前置：010 数组详解。


## 数组排序

**基本写法：排序**
`Arrays.sort(<数组>);`
```java
// 对数组进行自然排序
int[] a = {3, 1, 2};
Arrays.sort(a);
```

---

**基本写法：范围排序**
`Arrays.sort(<数组>, <起>, <止>);`
```java
// 只排序 [1, 3) 范围
Arrays.sort(a, 1, 3);
```

---

**基本写法：并行排序**
`Arrays.parallelSort(<数组>);`
```java
// 并行排序大数组
Arrays.parallelSort(a);
```

---

**基本写法：自定义比较器排序**
`Arrays.sort(<数组>, <比较器>);`
```java
// 对象数组自定义排序
String[] s = {"b", "a"};
Arrays.sort(s, Comparator.reverseOrder());
```

---

## 数组搜索

**基本写法：二分查找**
`Arrays.binarySearch(<数组>, <key>);`
```java
// 在已排序数组中查找
int idx = Arrays.binarySearch(a, 2);
```

---

**基本写法：范围查找**
`Arrays.binarySearch(<数组>, <起>, <止>, <key>);`
```java
// 在 [1, 3) 范围查找
int idx = Arrays.binarySearch(a, 1, 3, 2);
```

---

## 数组拷贝

**基本写法：拷贝**
`Arrays.copyOf(<数组>, <新长度>);`
```java
// 拷贝并指定新长度
int[] b = Arrays.copyOf(a, 5);
```

---

**基本写法：范围拷贝**
`Arrays.copyOfRange(<数组>, <起>, <止>);`
```java
// 拷贝 [1, 3) 范围
int[] c = Arrays.copyOfRange(a, 1, 3);
```

---

## 数组填充

**基本写法：填充**
`Arrays.fill(<数组>, <值>);`
```java
// 用值填充整个数组
Arrays.fill(a, 0);
```

---

**基本写法：范围填充**
`Arrays.fill(<数组>, <起>, <止>, <值>);`
```java
// 填充 [1, 3) 范围
Arrays.fill(a, 1, 3, 99);
```

---

## 数组比较与哈希

**基本写法：数组相等**
`Arrays.equals(<数组1>, <数组2>);`
```java
// 比较两个数组内容
boolean ok = Arrays.equals(a, b);
```

---

**基本写法：深度比较**
`Arrays.deepEquals(<数组1>, <数组2>);`
```java
// 多维数组深度比较
boolean ok = Arrays.deepEquals(m1, m2);
```

---

**基本写法：哈希码**
`Arrays.hashCode(<数组>);`
```java
// 计算数组哈希码
int h = Arrays.hashCode(a);
```

---

**基本写法：深度哈希**
`Arrays.deepHashCode(<数组>);`
```java
// 多维数组哈希码
int h = Arrays.deepHashCode(m);
```

---

## 数组转字符串

**基本写法：转字符串**
`Arrays.toString(<数组>);`
```java
// 一维数组转字符串
String s = Arrays.toString(a); // [1, 2, 3]
```

---

**基本写法：深度转字符串**
`Arrays.deepToString(<数组>);`
```java
// 多维数组转字符串
String s = Arrays.deepToString(matrix);
```

---

## 数组转流

**基本写法：转 Stream**
`Arrays.stream(<数组>);`
```java
// 数组转 Stream
IntStream s = Arrays.stream(new int[]{1, 2, 3});
```

---

**基本写法：范围流**
`Arrays.stream(<数组>, <起>, <止>);`
```java
// 取数组部分转 Stream
IntStream s = Arrays.stream(a, 1, 3);
```

---

## 数组转列表

**基本写法：转固定大小列表**
`Arrays.asList(<元素>...);`
```java
// 数组转 List（固定大小，不可增删）
List<String> list = Arrays.asList("a", "b");
```

---

**基本写法：转可变列表**
`new ArrayList<>(Arrays.asList(<元素>...));`
```java
// 包装为可变 List
List<String> list = new ArrayList<>(Arrays.asList("a", "b"));
```

---

## 数组创建

**基本写法：setAll 创建**
`Arrays.setAll(<数组>, <生成器>);`
```java
// 用函数初始化数组
int[] a = new int[5];
Arrays.setAll(a, i -> i * 2);
```

---

**基本写法：parallelSetAll**
`Arrays.parallelSetAll(<数组>, <生成器>);`
```java
// 并行初始化数组
Arrays.parallelSetAll(a, i -> i * i);
```

---

**基本写法：parallelPrefix**
`Arrays.parallelPrefix(<数组>, <BinaryOperator>);`
```java
// 并行前缀计算（累加）
Arrays.parallelPrefix(a, Integer::sum);
```

---

## 数组工具

**基本写法：获取数组长度**
`<数组>.length`
```java
// 数组长度属性
int n = a.length;
```

---

**基本写法：Array.newInstance**
`Array.newInstance(<类型>, <长度>);`
```java
// 反射创建数组
Object arr = Array.newInstance(int.class, 5);
```

---

**基本写法：获取元素**
`Array.get(<数组>, <索引>);`
```java
// 反射获取数组元素
Object e = Array.get(arr, 0);
```
