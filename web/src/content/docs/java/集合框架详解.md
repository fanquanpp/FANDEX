---
order: 100
tags:
  - java
difficulty: intermediate
title: 集合框架详解
module: java
category: 'Java Basics'
description: 'List、Set、Map 体系及迭代器与比较器。'
author: Anonymous
related:
  - java/数组详解
  - java/JVM调优
  - java/并发编程详解
  - java/CompletableFuture异步编排
prerequisites:
  - java/概述与开发环境
---

## 1. 集合体系概览 (Hierarchy)

### 1.1 集合框架的层次结构

Java 集合框架主要由以下接口和类组成：

- **Collection** 接口体系
  - **List**（有序可重复）
    - `ArrayList` — 动态数组，随机访问快
    - `LinkedList` — 双向链表，插入删除快
    - `Vector` — 线程安全的动态数组
  - **Set**（无序不重复）
    - `HashSet` — 哈希表实现，查找快
    - `TreeSet` — 红黑树实现，自然排序
    - `LinkedHashSet` — 保持插入顺序
  - **Queue**（队列）
    - `PriorityQueue` — 优先级队列

- **Map** 接口体系
  - `HashMap` — 哈希表实现，键值对存储
  - `TreeMap` — 红黑树实现，按键排序
  - `LinkedHashMap` — 保持插入顺序
  - `ConcurrentHashMap` — 线程安全的哈希表
  - `Hashtable` — 线程安全（遗留类）
  - `Properties` — 键值对配置

### 1.2 核心接口

- **`Collection`**: 所有单列集合的根接口，定义了集合的基本操作
- **`List`**: 有序集合，允许重复元素，支持索引访问
- **`Set`**: 无序集合，不允许重复元素
- **`Queue`**: 队列接口，定义了队列的操作
- **`Map`**: 键值对集合，键唯一，值可以重复

## 2. List 接口

### 2.1 List 的特性

- **有序性**: 元素按插入顺序排列
- **可重复性**: 允许存储重复元素
- **索引访问**: 支持通过索引快速访问元素

### 2.2 ArrayList

#### 2.2.1 特点

- **基于动态数组**实现
- **查询快速**: 时间复杂度 O(1)
- **增删较慢**: 时间复杂度 O(n)，需要移动元素
- **线程不安全**
- **初始容量**: 10，扩容因子 1.5

#### 2.2.2 常用方法

```java
 ArrayList<String> list = new ArrayList<>();
 // 添加元素
 list.add("Java");
 list.add(0, "Python"); // 在指定位置添加
 // 获取元素
 String element = list.get(0);
 // 修改元素
 list.set(1, "JavaScript");
 // 删除元素
 list.remove(0);
 list.remove("Java");
 // 其他方法
 int size = list.size();
 boolean contains = list.contains("Java");
 list.clear();
 boolean isEmpty = list.isEmpty();
```

### 2.3 LinkedList

#### 2.3.1 特点

- **基于双向链表**实现
- **增删快速**: 时间复杂度 O(1)，只需修改指针
- **查询较慢**: 时间复杂度 O(n)，需要遍历
- **线程不安全**
- **实现了 List 和 Deque 接口**，可作为队列和栈使用

#### 2.3.2 常用方法

```java
 LinkedList<String> list = new LinkedList<>();
 // 添加元素
 list.add("Java");
 list.addFirst("Python");
 list.addLast("JavaScript");
 // 获取元素
 String first = list.getFirst();
 String last = list.getLast();
 // 删除元素
 list.removeFirst();
 list.removeLast();
 // 作为队列使用
 list.offer("C++"); // 入队
 String element = list.poll(); // 出队
 // 作为栈使用
 list.push("Go"); // 入栈
 String top = list.pop(); // 出栈
```

### 2.4 Vector

#### 2.4.1 特点

- **基于动态数组**实现
- **线程安全**: 方法使用 synchronized 修饰
- **性能较差**: 由于线程安全开销
- **初始容量**: 10，扩容因子 2
- **不推荐使用**，建议使用 `Collections.synchronizedList()` 或 `CopyOnWriteArrayList`

## 3. Set 接口

### 3.1 Set 的特性

- **无序性**: 元素存储顺序不保证
- **唯一性**: 不允许存储重复元素
- **基于 equals() 和 hashCode() 方法**判断元素是否重复

### 3.2 HashSet

#### 3.2.1 特点

- **基于 HashMap** 实现，使用 HashMap 的 key 存储元素
- **无序**: 元素存储顺序不保证
- **允许 null 元素**
- **线程不安全**
- **时间复杂度**: 添加、删除、查找均为 O(1)

#### 3.2.2 常用方法

```java
 HashSet<String> set = new HashSet<>();
 // 添加元素
 set.add("Java");
 set.add("Python");
 // 删除元素
 set.remove("Python");
 // 其他方法
 int size = set.size();
 boolean contains = set.contains("Java");
 set.clear();
 boolean isEmpty = set.isEmpty();
```

### 3.3 TreeSet

#### 3.3.1 特点

- **基于红黑树**实现
- **有序**: 元素按自然顺序或自定义比较器排序
- **不允许 null 元素**
- **线程不安全**
- **时间复杂度**: 添加、删除、查找均为 O(log n)

#### 3.3.2 常用方法

```java
 // 自然排序
 TreeSet<Integer> set = new TreeSet<>();
 // 自定义比较器
 TreeSet<String> set = new TreeSet<>((s1, s2) -> s2.compareTo(s1)); // 降序
 // 添加元素
 set.add(10);
 set.add(5);
 set.add(15);
 // 特殊方法
 integer first = set.first(); // 获取第一个元素
 integer last = set.last(); // 获取最后一个元素
 integer higher = set.higher(10); // 获取大于10的最小元素
 integer lower = set.lower(10); // 获取小于10的最大元素
 integer ceiling = set.ceiling(10); // 获取大于等于10的最小元素
 integer floor = set.floor(10); // 获取小于等于10的最大元素
```

### 3.4 LinkedHashSet

#### 3.4.1 特点

- **基于 LinkedHashMap** 实现
- **有序**: 维护元素的插入顺序
- **性能略低于 HashSet**，但提供了顺序保证
- **线程不安全**

## 4. Map 接口

### 4.1 Map 的特性

- **键值对存储**: 每个元素包含键和值
- **键唯一性**: 键不允许重复，值可以重复
- **无序性**: 大多数实现不保证键值对的顺序

### 4.2 HashMap

#### 4.2.1 特点

- **基于哈希表**实现
- **允许 null 键和 null 值**
- **无序**: 键值对存储顺序不保证
- **线程不安全**
- **时间复杂度**: 添加、删除、查找均为 O(1)
- **初始容量**: 16，负载因子 0.75

#### 4.2.2 常用方法

```java
 HashMap<String, Integer> map = new HashMap<>();
 // 添加键值对
 map.put("Java", 100);
 map.put("Python", 90);
 // 获取值
 integer value = map.get("Java");
 // 修改值
 map.put("Java", 110); // 覆盖旧值
 // 删除键值对
 map.remove("Python");
 // 其他方法
 int size = map.size();
 boolean containsKey = map.containsKey("Java");
 boolean containsValue = map.containsValue(100);
 Set<String> keys = map.keySet(); // 获取所有键
 Collection<Integer> values = map.values(); // 获取所有值
 Set<Map.Entry<String, Integer>> entries = map.entrySet(); // 获取所有键值对
 map.clear();
 boolean isEmpty = map.isEmpty();
```

### 4.3 TreeMap

#### 4.3.1 特点

- **基于红黑树**实现
- **有序**: 键按自然顺序或自定义比较器排序
- **不允许 null 键**，但允许 null 值
- **线程不安全**
- **时间复杂度**: 添加、删除、查找均为 O(log n)

#### 4.3.2 常用方法

```java
 // 自然排序
 TreeMap<String, Integer> map = new TreeMap<>();
 // 自定义比较器
 TreeMap<String, Integer> map = new TreeMap<>((s1, s2) -> s2.compareTo(s1)); // 降序
 // 添加键值对
 map.put("Java", 100);
 map.put("Python", 90);
 map.put("JavaScript", 80);
 // 特殊方法
 String firstKey = map.firstKey(); // 获取第一个键
 String lastKey = map.lastKey(); // 获取最后一个键
 Map.Entry<String, Integer> firstEntry = map.firstEntry(); // 获取第一个键值对
 Map.Entry<String, Integer> lastEntry = map.lastEntry(); // 获取最后一个键值对
 Map.Entry<String, Integer> higherEntry = map.higherEntry("Java"); // 获取大于Java的最小键值对
 Map.Entry<String, Integer> lowerEntry = map.lowerEntry("Java"); // 获取小于Java的最大键值对
```

### 4.4 LinkedHashMap

#### 4.4.1 特点

- **基于哈希表和双向链表**实现
- **有序**: 维护键值对的插入顺序或访问顺序
- **性能略低于 HashMap**，但提供了顺序保证
- **线程不安全**

#### 4.4.2 访问顺序模式

```java
 // 构造函数第三个参数为  时，使用访问顺序
 LinkedHashMap<String, Integer> map = new LinkedHashMap<>(16, 0.75f, true);
 map.put("Java", 100);
 map.put("Python", 90);
 map.put("JavaScript", 80);
 // 访问元素，会将其移到链表尾部
 map.get("Java");
 // 遍历顺序：Python, JavaScript, Java（最近访问的在最后）
 for (Map.Entry<String, Integer> entry : map.entrySet()) {
  System.out.println(entry.getKey() + ": " + entry.getValue());
 }
```

### 4.5 ConcurrentHashMap

#### 4.5.1 特点

- **线程安全**: 支持并发操作
- **分段锁**技术，性能优于 Hashtable
- **不允许 null 键和 null 值**
- **JUC 包中的类**，不属于 java.util

## 5. 集合工具类

### 5.1 java.util.Collections

#### 5.1.1 常用方法

- **排序方法**
- `sort(List<T>)`: 对列表进行自然排序
- `sort(List<T>, Comparator<? super T>)`: 使用自定义比较器排序
- `reverse(List<?> list)`: 反转列表
- `shuffle(List<?> list)`: 打乱列表顺序
- **查找方法**
- `binarySearch(List<? extends Comparable<? super T>> list, T key)`: 二分查找
- `max(Collection<? extends T>)`: 获取最大值
- `min(Collection<? extends T>)`: 获取最小值
- **线程安全方法**
- `synchronizedCollection(Collection<T>)`: 返回线程安全的集合
- `synchronizedList(List<T>)`: 返回线程安全的列表
- `synchronizedSet(Set<T>)`: 返回线程安全的集合
- `synchronizedMap(Map<K,V>)`: 返回线程安全的映射
- **不可变集合**
- `emptyList()`, `emptySet()`, `emptyMap()`: 返回空的不可变集合
- `singletonList(T)`, `singletonSet(T)`, `singletonMap(K,V)`: 返回只包含一个元素的不可变集合
- `unmodifiableList(List<? extends T>)`: 返回不可变的列表视图
- `unmodifiableSet(Set<? extends T>)`: 返回不可变的集合视图
- `unmodifiableMap(Map<? extends K, ? extends V>)`: 返回不可变的映射视图

### 5.2 java.util.Arrays

- **asList(T... a)**: 将数组转换为列表
- **sort(Object[] a)**: 对数组排序
- **binarySearch(Object[] a, Object key)**: 对数组进行二分查找
- **toString(Object[] a)**: 将数组转换为字符串
- **equals(Object[] a, Object[] a2)**: 比较两个数组是否相等

## 6. 遍历方式

### 6.1 Iterator 迭代器

```java
 List<String> list = new ArrayList<>();
 list.add("Java");
 list.add("Python");
 list.add("JavaScript");
 // 使用 Iterator 遍历
 Iterator<String> iterator = list.iterator();
 while (iterator.hasNext()) {
  String element = iterator.next();
  System.out.println(element);
  // 可以安全删除元素
  if (element.equals("Python")) {
  iterator.remove();
  }
 }
```

### 6.2 增强型 for 循环 (for-each)

```java
 // 遍历 List
 for (String element : list) {
  System.out.println(element);
 }
 // 遍历 Set
 for (String element : set) {
  System.out.println(element);
 }
 // 遍历 Map 的键
 for (String key : map.keySet()) {
  System.out.println(key + ": " + map.get(key));
 }
 // 遍历 Map 的键值对
 for (Map.Entry<String, Integer> entry : map.entrySet()) {
  System.out.println(entry.getKey() + ": " + entry.getValue());
 }
```

### 6.3 Java 8+ forEach (Lambda 表达式)

```java
 // 遍历 List
 list.forEach(element -> System.out.println(element));
 // 遍历 Set
 set.forEach(element -> System.out.println(element));
 // 遍历 Map
 map.forEach((key, value) -> System.out.println(key + ": " + value));
```

### 6.4 Java 8+ Stream API

```java
 // 使用 Stream 遍历并处理
 list.stream()
  .filter(element -> element.startsWith("J"))
  .map(String::toUpperCase)
  .forEach(System.out::println);
```

## 7. 线程安全集合

### 7.1 同步集合 (Synchronized Collections)

- **通过 Collections.synchronizedXXX() 创建**
- **方法级同步**，性能较低
- **示例**:

```java
 List<String> synchronizedList = Collections.synchronizedList(new ArrayList<>());
 Set<String> synchronizedSet = Collections.synchronizedSet(new HashSet<>());
 Map<String, Integer> synchronizedMap = Collections.synchronizedMap(new HashMap<>());
```

### 7.2 并发集合 (Concurrent Collections)

- **JUC 包中的类**
- **更细粒度的锁**，性能更高
- **主要类**:
- `ConcurrentHashMap`: 线程安全的 HashMap
- `CopyOnWriteArrayList`: 适用于读多写少的场景
- `CopyOnWriteArraySet`: 基于 CopyOnWriteArrayList 实现
- `ConcurrentLinkedQueue`: 无界线程安全队列
- `BlockingQueue`: 阻塞队列接口，如 ArrayBlockingQueue, LinkedBlockingQueue

## 8. Java 8+ 集合新特性

### 8.1 Stream API

- **功能**: 提供函数式操作集合的能力
- **操作类型**:
- **中间操作**: filter, map, sorted, distinct, limit, skip
- **终端操作**: forEach, collect, reduce, count, anyMatch, allMatch, noneMatch

```java
 // Stream 示例
 List<String> result = list.stream()
  .filter(s -> s.length() > 5)
  .map(String::toUpperCase)
  .sorted()
  .collect(Collectors.toList());
```

### 8.2 forEach 方法

- **所有集合接口**都添加了 forEach 方法
- **接受 Consumer 函数式接口**

### 8.3 Map 新方法

- `forEach(BiConsumer<? super K, ? super V>)`: 遍历键值对
- `computeIfAbsent(K, Function<? super K, ? extends V>)`: 计算不存在的键的值
- `computeIfPresent(K, BiFunction<? super K, ? super V, ? extends V>)`: 计算存在的键的值
- `merge(K, V, BiFunction<? super V, ? super V, ? extends V>)`: 合并键的值
- `getOrDefault(Object, V)`: 获取键的值，不存在则返回默认值

## 9. 实际应用案例

### 9.1 列表去重

```java
 // 方法1：使用 HashSet
 List<String> list = Arrays.asList("Java", "Python", "Java", "JavaScript");
 Set<String> set = new HashSet<>(list);
 List<String> uniqueList = new ArrayList<>(set);
 // 方法2：使用 Stream
 List<String> uniqueList = list.stream()
  .distinct()
  .collect(Collectors.toList());
```

### 9.2 列表排序

```java
 // 自然排序
 List<Integer> numbers = Arrays.asList(3, 1, 4, 1, 5, 9, 2, 6);
 Collections.sort(numbers);
 // 自定义排序
 List<String> names = Arrays.asList("Alice", "Bob", "Charlie", "David");
 Collections.sort(names, (s1, s2) -> s2.compareTo(s1)); // 降序
 // 使用 Stream 排序
 List<String> sortedNames = names.stream()
  .sorted(Comparator.reverseOrder())
  .collect(Collectors.toList());
```

### 9.3 映射操作

```java
 // 统计单词出现次数
 List<String> words = Arrays.asList("Java", "Python", "Java", "JavaScript", "Python", "Java");
 Map<String, Integer> wordCount = new HashMap<>();
 for (String word : words) {
  wordCount.put(word, wordCount.getOrDefault(word, 0) + 1);
 }
 // 使用 Stream
 Map<String, Long> wordCount = words.stream()
  .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));
```

### 9.4 集合转换

```java
 // 数组转集合
 String[] array = {"Java", "Python", "JavaScript"};
 List<String> list = Arrays.asList(array);
 Set<String> set = new HashSet<>(Arrays.asList(array));
 // 集合转数组
 List<String> list = Arrays.asList("Java", "Python", "JavaScript");
 String[] array = list.toArray(new String[0]);
 // List 转 Set
 Set<String> set = new HashSet<>(list);
 // Set 转 List
 List<String> list = new ArrayList<>(set);
```

## 10. 性能分析

### 10.1 List 实现类性能对比

| 操作     | ArrayList      | LinkedList | Vector         |
| -------- | -------------- | ---------- | -------------- |
| 随机访问 | O(1)           | O(n)       | O(1)           |
| 头部插入 | O(n)           | O(1)       | O(n)           |
| 中间插入 | O(n)           | O(n)       | O(n)           |
| 尾部插入 | O(1) amortized | O(1)       | O(1) amortized |
| 删除元素 | O(n)           | O(n)       | O(n)           |
| 线程安全 | 否             | 否         | 是             |

### 10.2 Set 实现类性能对比

| 操作     | HashSet | TreeSet  | LinkedHashSet  |
| -------- | ------- | -------- | -------------- |
| 添加元素 | O(1)    | O(log n) | O(1)           |
| 删除元素 | O(1)    | O(log n) | O(1)           |
| 查找元素 | O(1)    | O(log n) | O(1)           |
| 有序性   | 否      | 是       | 是（插入顺序） |
| 线程安全 | 否      | 否       | 否             |

### 10.3 Map 实现类性能对比

| 操作     | HashMap | TreeMap  | LinkedHashMap            | ConcurrentHashMap |
| -------- | ------- | -------- | ------------------------ | ----------------- |
| 添加元素 | O(1)    | O(log n) | O(1)                     | O(1)              |
| 删除元素 | O(1)    | O(log n) | O(1)                     | O(1)              |
| 查找元素 | O(1)    | O(log n) | O(1)                     | O(1)              |
| 有序性   | 否      | 是       | 是（插入顺序或访问顺序） | 否                |
| 线程安全 | 否      | 否       | 否                       | 是                |

## 11. 最佳实践

### 11.1 集合选择

- **需要索引访问**：使用 ArrayList
- **需要频繁增删**：使用 LinkedList
- **需要去重**：使用 Set
- **需要有序集合**：使用 TreeSet 或 LinkedHashSet
- **需要键值对存储**：使用 HashMap
- **需要有序的键值对**：使用 TreeMap 或 LinkedHashMap
- **多线程环境**：使用 ConcurrentHashMap 或 CopyOnWriteArrayList

### 11.2 性能优化

- **初始化容量**：根据预期大小设置初始容量，减少扩容开销
- **选择合适的集合**：根据操作特点选择合适的集合实现
- **避免频繁修改**：对于读多写少的场景，使用 CopyOnWriteArrayList
- **使用 Stream API**：简洁高效地处理集合数据
- **避免自动装箱**：使用基本类型集合（如 IntArrayList）减少装箱开销

### 11.3 注意事项

- **null 值处理**：不同集合对 null 值的处理不同
- **线程安全性**：多线程环境下注意集合的线程安全性
- **equals 和 hashCode**：使用自定义对象作为 Set 的元素或 Map 的键时，需要重写 equals 和 hashCode 方法
- **集合遍历**：遍历过程中修改集合需要使用 Iterator 的 remove 方法
- **资源释放**：对于大型集合，不再使用时应及时清空，避免内存泄漏

## 12. 常见陷阱

### 12.1 Arrays.asList() 的陷阱

- **返回的是固定大小的列表**，不支持 add 和 remove 操作
- **修改原数组会影响列表**，因为列表直接引用数组

```java
 String[] array = {"Java", "Python"};
 List<String> list = Arrays.asList(array);
 // 会抛出 UnsupportedOperationException
 // list.add("JavaScript");
 // 修改数组会影响列表
 array[0] = "C++";
 System.out.println(list.get(0)); // 输出: C++
```

### 12.2 集合遍历中的修改

- **使用 for-each 遍历过程中修改集合会抛出 ConcurrentModificationException**
- **应该使用 Iterator 的 remove 方法**

```java
 // 错误：会抛出 ConcurrentModificationException
 for (String element : list) {
  if (element.equals("Python")) {
  list.remove(element);
  }
 }
 // 正确：使用 Iterator
 Iterator<String> iterator = list.iterator();
 while (iterator.hasNext()) {
  String element = iterator.next();
  if (element.equals("Python")) {
  iterator.remove();
  }
 }
```

### 12.3 哈希集合的 equals 和 hashCode

- **使用自定义对象作为 HashSet 的元素或 HashMap 的键时，必须重写 equals 和 hashCode 方法**
- **否则会导致重复元素无法被检测**

```java
 class Person {
  private String name;
  private int age;
  // 必须重写 equals 和 hashCode
  @Override
  public boolean equals(Object o) {
  if (this == o) return true;
  if (o == null || getClass() != o.getClass()) return false;
  Person person = (Person) o;
  return age == person.age && Objects.equals(name, person.name);
  }
  @Override
  public int hashCode() {
  return Objects.hash(name, age);
  }
 }
```

---

### 更新日志 (Changelog)

- 2026-04-05: 细化集合体系及常用实现类性能对比。
- 2026-05-03: 扩展内容，添加集合体系的详细结构、各实现类的具体特性、性能分析、常用方法、线程安全性、Java 8+新特性、实际应用案例和最佳实践。
