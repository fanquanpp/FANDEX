---
order: 140
tags:
  - java
difficulty: intermediate
title: 泛型详解
module: java
category: 'Java Basics'
description: 泛型类、泛型方法、通配符与类型擦除。
author: Anonymous
related:
  - java/抽象类与接口
  - java/异常处理机制
  - java/IO流与文件操作
  - java/多线程基础
prerequisites:
  - java/概述与开发环境
---

## 1. 泛型概述 (Overview)

### 1.1 什么是泛型

泛型是 Java 5 引入的特性，允许在定义类、接口和方法时使用类型参数，使得代码可以更具通用性和类型安全性。

### 1.2 泛型的优势

- **编译时类型安全检查**: 避免运行时类型转换异常
- **消除强制类型转换**: 代码更简洁、可读性更高
- **代码复用**: 可以编写适用于多种类型的通用代码
- **类型参数化**: 提高代码的灵活性和可维护性

### 1.3 泛型的应用场景

- **集合类**: `List<T>`, `Map<K, V>` 等
- **通用工具类**: 如排序、搜索等算法
- **自定义数据结构**: 如链表、栈、队列等
- **框架和库**: 如 Spring、Hibernate 等

## 2. 泛型类 (Generic Classes)

### 2.1 泛型类的定义

泛型类是指在类定义时使用类型参数的类。

```java
 // 简单泛型类
 public class Box<T> {
  private T data;
  public Box(T data) {
  this.data = data;
  }
  public T getData() {
  return data;
  }
  public void setData(T data) {
  this.data = data;
  }
 }
```

### 2.2 泛型类的使用

```java
 // 使用泛型类
 Box<String> stringBox = new Box<>();
 stringBox.setData("Hello, Generics!");
 String value = stringBox.getData(); // 无需类型转换
 Box<Integer> integerBox = new Box<>();
 integerBox.setData(42);
 int number = integerBox.getData(); // 无需类型转换
```

### 2.3 多类型参数

泛型类可以有多个类型参数。

```java
 // 多类型参数的泛型类
 public class Pair<K, V> {
  private K key;
  private V value;
  public Pair(K key, V value) {
  this.key = key;
  this.value = value;
  }
  public K getKey() {
  return key;
  }
  public V getValue() {
  return value;
  }
 }
```

### 2.4 类型参数的命名约定

- **E**: 元素 (Element)，用于集合
- **K**: 键 (Key)
- **V**: 值 (Value)
- **T**: 类型 (Type)
- **U, S**: 辅助类型

## 3. 泛型方法 (Generic Methods)

### 3.1 泛型方法的定义

泛型方法是指在方法声明时使用类型参数的方法。

```java
 // 泛型方法
 public <T> void printArray(T[] array) {
  for (T element : array) {
  System.out.println(element);
  }
 }
```

### 3.2 泛型方法的使用

```java
 // 使用泛型方法
 integer[] intArray = {1, 2, 3, 4, 5};
 String[] stringArray = {"Hello", "World", "Generics"};
 printArray(intArray); // 自动推断类型为 Integer
 printArray(stringArray); // 自动推断类型为 String
```

### 3.3 泛型方法与泛型类的区别

- **泛型方法**: 类型参数在方法声明时定义，适用于单个方法
- **泛型类**: 类型参数在类声明时定义，适用于整个类

### 3.4 静态泛型方法

静态方法可以是泛型方法，但静态方法不能使用类的泛型类型参数。

```java
 // 静态泛型方法
 public static <T> void staticGenericMethod(T value) {
  System.out.println("Value: " + value);
 }
```

### 3.5 泛型方法的类型推断

Java 编译器可以根据方法参数自动推断泛型类型。

```java
 // 类型推断
 public <T> T getFirstElement(List<T> list) {
  return list.isEmpty() ? null : list.get(0);
 }
 // 使用
 List<String> strings = Arrays.asList("a", "b", "c");
 String first = getFirstElement(strings); // 自动推断 T 为 String
```

## 4. 类型擦除 (Type Erasure)

### 4.1 类型擦除的概念

Java 泛型是通过类型擦除实现的，即在编译时检查类型，在运行时擦除泛型信息。

### 4.2 类型擦除的过程

1. **编译时**: 检查泛型类型的正确性
2. **擦除时**: 将泛型类型替换为边界类型（无边界时替换为 Object）
3. **运行时**: 无法获取泛型类型信息

### 4.3 类型擦除的示例

```java
 // 泛型类
 public class Box<T> {
  private T data;
  // ...
 }
 // 擦除后
 public class Box {
  private Object data;
  // ...
 }
 // 有边界的泛型
 public class NumberBox<T extends Number> {
  private T data;
  // ...
 }
 // 擦除后
 public class NumberBox {
  private Number data;
  // ...
 }
```

### 4.4 类型擦除的影响

- **运行时类型信息丢失**: 无法使用 `instanceof` 检查泛型类型
- **泛型数组创建受限**: 不能直接创建泛型数组
- **类型转换**: 编译时会自动插入必要的类型转换

### 4.5 类型擦除的局限性

```java
 // 以下代码无法编译
 if (list instanceof List<String>) { // 错误: 泛型类型不能用于 instanceof
  // ...
 }
 // 以下代码可以编译，但运行时会有警告
 List<String> list = new ArrayList<>();
 List rawList = list;
 rawList.add(123); // 运行时不会报错
 String s = list.get(0); // 运行时会抛出 ClassCastException
```

## 5. 通配符与边界 (Wildcards and Bounds)

### 5.1 无界通配符

无界通配符 `<?>` 表示任意类型。

```java
 // 无界通配符
 public void printList(List<?> list) {
  for (Object item : list) {
  System.out.println(item);
  }
 }
```

### 5.2 上界通配符

上界通配符 `<? extends T>` 表示 T 或 T 的子类。

```java
 // 上界通配符
 public double sumOfList(List<? extends Number> list) {
  double sum = 0.0;
  for (Number number : list) {
  sum += number.doubleValue();
  }
  return sum;
 }
```

### 5.3 下界通配符

下界通配符 `<? super T>` 表示 T 或 T 的父类。

```java
 // 下界通配符
 public void addNumbers(List<? super Integer> list) {
  for (int i = 1; i <= 10; i++) {
  list.add(i);
  }
 }
```

### 5.4 PECS 原则

- **PECS**: Producer Extends, Consumer Super
- **Producer (生产者)**: 如果你需要从集合中读取元素，使用 `<? extends T>`
- **Consumer (消费者)**: 如果你需要向集合中写入元素，使用 `<? super T>`

### 5.5 通配符的使用场景

- **读取场景**: 使用 `<? extends T>`，如获取集合元素
- **写入场景**: 使用 `<? super T>`，如添加元素到集合
- **读写场景**: 使用具体类型，不使用通配符

## 6. 泛型的高级特性

### 6.1 泛型与继承

- **泛型类的继承**: 泛型类可以被继承
- **类型参数的继承**: 泛型类型参数不具有继承关系

```java
 // 泛型类的继承
 public class Box<T> {
  // ...
 }
 public class StringBox extends Box<String> {
  // ...
 }
 // 类型参数的继承
 List<String> strings = new ArrayList<>();
 List<Object> objects = strings; // 错误: 类型不兼容
```

### 6.2 泛型与接口

泛型接口的定义和使用。

```java
 // 泛型接口
 public interface Generator<T> {
  T generate();
 }
 // 实现泛型接口
 public class StringGenerator implements Generator<String> {
  @Override
  public String generate() {
  return "Generated string";
  }
 }
```

### 6.3 泛型与反射

通过反射获取泛型类型信息。

```java
 // 获取泛型类型信息
 public class GenericType<T> {
  private Class<T> type;
  @SuppressWarnings("unchecked")
  public GenericType() {
  // 通过反射获取泛型类型
  Type genericSuperclass = getClass().getGenericSuperclass();
  if (genericSuperclass instanceof ParameterizedType) {
  ParameterizedType paramType = (ParameterizedType) genericSuperclass;
  type = (Class<T>) paramType.getActualTypeArguments()[0];
  }
  }
  public Class<T> getType() {
  return type;
  }
 }
 // 使用
 public class StringType extends GenericType<String> {
 }
 StringType stringType = new StringType();
 class<String> type = stringType.getType();
 System.out.println(type.getName()); // 输出: java.lang.String
```

### 6.4 类型参数的限制

- **不能使用基本类型**: 必须使用包装类，如 `Integer` 而非 `int`
- **不能创建泛型数组**: 不能直接创建 `new T[10]`
- **静态成员不能使用泛型类型**: 静态成员属于类，而泛型类型属于实例
- **不能在异常中使用泛型**: 不能抛出或捕获泛型类型的异常

## 7. 泛型在集合中的应用

### 7.1 集合类的泛型

```java
 // 泛型集合
 List<String> stringList = new ArrayList<>();
 stringList.add("Hello");
 stringList.add("World");
 String s = stringList.get(0); // 无需类型转换
 Map<String, Integer> map = new HashMap<>();
 map.put("one", 1);
 map.put("two", 2);
 integer value = map.get("one"); // 无需类型转换
```

### 7.2 集合的通配符使用

```java
 // 读取集合元素
 public void processList(List<? extends Number> list) {
  for (Number number : list) {
  System.out.println(number);
  }
 }
 // 写入集合元素
 public void addIntegers(List<? super Integer> list) {
  list.add(1);
  list.add(2);
  list.add(3);
 }
```

### 7.3 集合的类型安全

```java
 // 类型安全的集合操作
 List<String> strings = new ArrayList<>();
 strings.add("Hello");
 // strings.add(123); // 编译错误: 类型不兼容
 // 原始类型的集合（不安全）
 List rawList = new ArrayList();
 rawList.add("Hello");
 rawList.add(123); // 编译通过，但运行时可能出错
```

## 8. 实际应用案例

### 8.1 通用工具类

```java
 // 通用工具类
 public class GenericUtils {
  // 泛型方法：获取列表中的最大值
  public static <T extends Comparable<T>> T max(List<T> list) {
  if (list == null || list.isEmpty()) {
  return null;
  }
  T max = list.get(0);
  for (T item : list) {
  if (item.compareTo(max) > 0) {
  max = item;
  }
  }
  return max;
  }
  // 泛型方法：交换数组中的两个元素
  public static <T> void swap(T[] array, int i, int j) {
  if (array == null || i < 0 || j < 0 || i >= array.length || j >= array.length) {
  return;
  }
  T temp = array[i];
  array[i] = array[j];
  array[j] = temp;
  }
 }
```

### 8.2 自定义泛型集合

```java
 // 自定义泛型链表
 public class LinkedList<T> {
  private Node<T> head;
  private int size;
  private static class Node<T> {
  T data;
  Node<T> next;
  Node(T data) {
  this.data = data;
  this.next = null;
  }
  }
  public void add(T data) {
  Node<T> newNode = new Node<>(data);
  if (head == null) {
  head = newNode;
  } else {
  Node<T> current = head;
  while (current.next != null) {
  current = current.next;
  }
  current.next = newNode;
  }
  size++;
  }
  public T get(int index) {
  if (index < 0 || index >= size) {
  throw new IndexOutOfBoundsException();
  }
  Node<T> current = head;
  for (int i = 0; i < index; i++) {
  current = current.next;
  }
  return current.data;
  }
  public int size() {
  return size;
  }
 }
```

### 8.3 泛型与工厂模式

```java
 // 泛型工厂
 public interface Product {
  void use();
 }
 public class ConcreteProductA implements Product {
  @Override
  public void use() {
  System.out.println("Using Product A");
  }
 }
 public class ConcreteProductB implements Product {
  @Override
  public void use() {
  System.out.println("Using Product B");
  }
 }
 public class ProductFactory {
  public static <T extends Product> T createProduct(Class<T> productClass) {
  try {
  return productClass.newInstance();
  } catch (Exception e) {
  throw new RuntimeException("Failed to create product", e);
  }
  }
 }
 // 使用
 Product productA = ProductFactory.createProduct(ConcreteProductA.class);
 productA.use(); // 输出: Using Product A
 Product productB = ProductFactory.createProduct(ConcreteProductB.class);
 productB.use(); // 输出: Using Product B
```

## 9. 最佳实践

### 9.1 泛型使用最佳实践

- **明确类型参数**: 尽量使用具体的类型参数，避免使用原始类型
- **合理使用通配符**: 根据 PECS 原则选择合适的通配符
- **类型参数命名**: 遵循命名约定，使用有意义的类型参数名
- **避免过度泛型**: 不要过度使用泛型，保持代码简洁

### 9.2 性能考虑

- **类型擦除**: 泛型不会影响运行时性能
- **自动装箱/拆箱**: 注意基本类型的包装类带来的性能开销
- **集合操作**: 合理选择集合类型，避免不必要的类型转换

### 9.3 代码可读性

- **类型参数说明**: 对于复杂的泛型代码，添加注释说明类型参数的含义
- **方法签名**: 保持方法签名简洁，避免过多的类型参数
- **泛型层级**: 避免过深的泛型层级，保持代码结构清晰

## 10. 常见陷阱

### 10.1 类型擦除相关陷阱

- **运行时类型信息丢失**: 无法在运行时获取泛型类型
- **泛型数组创建**: 不能直接创建泛型数组，需要使用类型转换
- **类型转换异常**: 原始类型与泛型类型混用可能导致运行时异常

### 10.2 通配符使用陷阱

- **上界通配符的写入限制**: 使用 `<? extends T>` 不能向集合中添加元素
- **下界通配符的读取限制**: 使用 `<? super T>` 读取元素时只能得到 Object 类型
- **通配符的过度使用**: 过度使用通配符会使代码难以理解

### 10.3 其他常见陷阱

- **基本类型的使用**: 泛型不能使用基本类型，必须使用包装类
- **静态成员的泛型使用**: 静态成员不能使用类的泛型类型参数
- **异常的泛型使用**: 不能抛出或捕获泛型类型的异常
- **类型参数的继承**: 泛型类型参数不具有继承关系

## 11. 泛型的未来发展

### 11.1 Java 7 的改进

- **菱形操作符**: 简化泛型类的实例化

```java
 // Java 7 之前
 List<String> list = new ArrayList<String>();
 // Java 7 及以后
 List<String> list = new ArrayList<>(); // 菱形操作符
```

### 11.2 Java 8 的改进

- **类型推断增强**: 增强了泛型方法的类型推断

```java
 // Java 8 之前
 List<String> list = Arrays.<String>asList("a", "b", "c");
 // Java 8 及以后
 List<String> list = Arrays.asList("a", "b", "c"); // 自动推断类型
```

### 11.3 Java 9+ 的改进

- **不可变集合工厂方法**: 提供了创建不可变集合的泛型方法

```java
 // Java 9+
 List<String> immutableList = List.of("a", "b", "c");
 Map<String, Integer> immutableMap = Map.of("one", 1, "two", 2);
```

---

### 更新日志 (Changelog)

- 2026-04-05: 深入细化泛型擦除机制与通配符边界。
- 2026-05-03: 扩展内容，添加泛型的详细介绍和优势、泛型类的详细实现和使用、泛型方法的详细实现和使用、类型擦除的详细机制和影响、通配符的详细使用和PECS原则的详细解释、泛型的高级特性、泛型在集合中的应用、实际应用案例、最佳实践和常见陷阱。
