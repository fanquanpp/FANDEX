---
order: 175
tags:
  - java
  - stream
difficulty: intermediate
title: 'Stream API'
module: java
category: 'Java Basics'
description: 'Java 8 Stream API流式操作、中间操作与终端操作、并行流与收集器详解。'
author: fanquanpp
updated: '2026-06-13'
related:
  - java/JVM内存模型
  - java/Lambda与函数式编程
  - java/SpringBoot学习笔记
  - java/网络编程
prerequisites:
  - java/概述与开发环境
---

## 1. Stream API 概述

### 1.1 什么是 Stream

Stream是Java 8引入的用于处理集合数据的抽象，支持声明式、链式、并行操作。

```java
import java.util.*;
import java.util.stream.*;

public class StreamIntro {
    public static void main(String[] args) {
        List<String> names = Arrays.asList("Alice", "Bob", "Charlie", "David", "Anna");

        // 命令式：筛选以A开头的名字并转大写
        List<String> result1 = new ArrayList<>();
        for (String name : names) {
            if (name.startsWith("A")) {
                result1.add(name.toUpperCase());
            }
        }

        // 函数式：使用Stream
        List<String> result2 = names.stream()
            .filter(name -> name.startsWith("A"))
            .map(String::toUpperCase)
            .collect(Collectors.toList());

        System.out.println(result2);  // [ALICE, ANNA]
    }
}
```

### 1.2 Stream 的特点

| 特点         | 说明                               |
| :----------- | :--------------------------------- |
| 不存储数据   | Stream不是数据结构，不保存元素     |
| 不修改源数据 | 操作产生新的Stream，原集合不变     |
| 惰性求值     | 中间操作在终端操作触发时才执行     |
| 只能消费一次 | 终端操作后Stream关闭，不能重复使用 |

### 1.3 创建 Stream

```java
import java.util.*;
import java.util.stream.*;

public class StreamCreation {
    public static void main(String[] args) {
        // 1. 集合创建Stream
        List<String> list = Arrays.asList("a", "b", "c");
        Stream<String> s1 = list.stream();
        Stream<String> s1p = list.parallelStream();  // 并行流

        // 2. 数组创建Stream
        String[] arr = {"x", "y", "z"};
        Stream<String> s2 = Arrays.stream(arr);

        // 3. Stream.of
        Stream<String> s3 = Stream.of("a", "b", "c");

        // 4. 无限流
        Stream<Integer> naturals = Stream.iterate(0, n -> n + 1);
        Stream<Double> randoms = Stream.generate(Math::random);

        // 5. 基本类型流（避免装箱开销）
        IntStream intStream = IntStream.range(1, 10);       // 1-9
        IntStream intStream2 = IntStream.rangeClosed(1, 10); // 1-10
        LongStream longStream = LongStream.of(1L, 2L, 3L);
        DoubleStream doubleStream = DoubleStream.of(1.0, 2.0);

        // 6. 文件行流
        // Files.lines(Paths.get("data.txt"))

        // 7. 空流
        Stream<String> empty = Stream.empty();
    }
}
```

## 2. 中间操作

### 2.1 filter 与 map

```java
import java.util.*;
import java.util.stream.*;

public class IntermediateOps {
    public static void main(String[] args) {
        List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

        // filter: 过滤元素
        List<Integer> evens = numbers.stream()
            .filter(n -> n % 2 == 0)
            .collect(Collectors.toList());
        System.out.println(evens);  // [2, 4, 6, 8, 10]

        // map: 转换元素
        List<Integer> squares = numbers.stream()
            .map(n -> n * n)
            .collect(Collectors.toList());
        System.out.println(squares);  // [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]

        // flatMap: 一对多转换并展平
        List<List<Integer>> nested = Arrays.asList(
            Arrays.asList(1, 2), Arrays.asList(3, 4), Arrays.asList(5, 6)
        );
        List<Integer> flat = nested.stream()
            .flatMap(Collection::stream)
            .collect(Collectors.toList());
        System.out.println(flat);  // [1, 2, 3, 4, 5, 6]

        // 字符串拆分
        List<String> words = Arrays.asList("Hello World", "Java Stream");
        List<String> allWords = words.stream()
            .flatMap(s -> Arrays.stream(s.split(" ")))
            .collect(Collectors.toList());
        System.out.println(allWords);  // [Hello, World, Java, Stream]
    }
}
```

### 2.2 排序与去重

```java
public class SortAndDistinct {
    public static void main(String[] args) {
        // sorted: 排序
        List<Integer> unsorted = Arrays.asList(3, 1, 4, 1, 5, 9, 2, 6);
        List<Integer> sorted = unsorted.stream()
            .sorted()
            .collect(Collectors.toList());
        System.out.println(sorted);  // [1, 1, 2, 3, 4, 5, 6, 9]

        // 自定义排序
        List<String> names = Arrays.asList("Charlie", "Alice", "Bob");
        List<String> byLength = names.stream()
            .sorted(Comparator.comparingInt(String::length))
            .collect(Collectors.toList());
        System.out.println(byLength);  // [Bob, Alice, Charlie]

        // distinct: 去重
        List<Integer> distinct = unsorted.stream()
            .distinct()
            .collect(Collectors.toList());
        System.out.println(distinct);  // [3, 1, 4, 5, 9, 2, 6]

        // peek: 调试用（不修改元素）
        List<Integer> peeked = unsorted.stream()
            .peek(n -> System.out.println("Processing: " + n))
            .filter(n -> n > 3)
            .collect(Collectors.toList());

        // limit & skip: 截取
        List<Integer> limited = unsorted.stream()
            .skip(2)    // 跳过前2个
            .limit(3)   // 取3个
            .collect(Collectors.toList());
    }
}
```

## 3. 终端操作

### 3.1 收集与聚合

```java
import java.util.*;
import java.util.stream.*;

public class TerminalOps {
    public static void main(String[] args) {
        List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);

        // collect: 收集到集合
        List<Integer> list = numbers.stream().collect(Collectors.toList());
        Set<Integer> set = numbers.stream().collect(Collectors.toSet());

        // 收集到特定集合
        LinkedList<Integer> linkedList = numbers.stream()
            .collect(Collectors.toCollection(LinkedList::new));

        // toArray
        Integer[] array = numbers.stream().toArray(Integer[]::new);

        // 统计
        IntSummaryStatistics stats = numbers.stream()
            .mapToInt(Integer::intValue)
            .summaryStatistics();
        System.out.println("Count: " + stats.getCount());    // 5
        System.out.println("Sum: " + stats.getSum());        // 15
        System.out.println("Min: " + stats.getMin());        // 1
        System.out.println("Max: " + stats.getMax());        // 5
        System.out.println("Average: " + stats.getAverage()); // 3.0

        // reduce: 归约
        int sum = numbers.stream().reduce(0, Integer::sum);
        Optional<Integer> product = numbers.stream().reduce((a, b) -> a * b);
        System.out.println("Sum: " + sum);          // 15
        System.out.println("Product: " + product);   // Optional[120]

        // min/max
        Optional<Integer> min = numbers.stream().min(Integer::compare);
        Optional<Integer> max = numbers.stream().max(Integer::compare);

        // count
        long count = numbers.stream().filter(n -> n > 3).count();

        // findFirst / findAny
        Optional<Integer> first = numbers.stream().findFirst();
        Optional<Integer> any = numbers.stream().findAny();

        // anyMatch / allMatch / noneMatch
        boolean anyEven = numbers.stream().anyMatch(n -> n % 2 == 0);
        boolean allPositive = numbers.stream().allMatch(n -> n > 0);
        boolean noneNegative = numbers.stream().noneMatch(n -> n < 0);

        // forEach
        numbers.stream().forEach(System.out::println);
    }
}
```

### 3.2 Collectors 高级用法

```java
import java.util.*;
import java.util.stream.*;

class Employee {
    String name;
    String department;
    double salary;

    Employee(String name, String dept, double salary) {
        this.name = name;
        this.department = dept;
        this.salary = salary;
    }

    String getDepartment() { return department; }
    double getSalary() { return salary; }
    String getName() { return name; }
}

public class AdvancedCollectors {
    public static void main(String[] args) {
        List<Employee> employees = Arrays.asList(
            new Employee("Alice", "Engineering", 90000),
            new Employee("Bob", "Engineering", 85000),
            new Employee("Charlie", "Marketing", 75000),
            new Employee("David", "Marketing", 80000),
            new Employee("Eve", "HR", 70000)
        );

        // groupingBy: 分组
        Map<String, List<Employee>> byDept = employees.stream()
            .collect(Collectors.groupingBy(Employee::getDepartment));
        // {Engineering=[Alice, Bob], Marketing=[Charlie, David], HR=[Eve]}

        // groupingBy + 下游收集器
        Map<String, Long> countByDept = employees.stream()
            .collect(Collectors.groupingBy(Employee::getDepartment, Collectors.counting()));
        // {Engineering=2, Marketing=2, HR=1}

        // 分组 + 平均值
        Map<String, Double> avgSalaryByDept = employees.stream()
            .collect(Collectors.groupingBy(
                Employee::getDepartment,
                Collectors.averagingDouble(Employee::getSalary)
            ));

        // partitioningBy: 分区（按条件分为true/false两组）
        Map<Boolean, List<Employee>> partitioned = employees.stream()
            .collect(Collectors.partitioningBy(e -> e.getSalary() > 80000));

        // joining: 字符串拼接
        String names = employees.stream()
            .map(Employee::getName)
            .collect(Collectors.joining(", ", "[", "]"));
        System.out.println(names);  // [Alice, Bob, Charlie, David, Eve]

        // toMap: 收集到Map
        Map<String, Double> nameToSalary = employees.stream()
            .collect(Collectors.toMap(
                Employee::getName,
                Employee::getSalary
            ));

        // 处理键冲突
        Map<String, String> deptToNames = employees.stream()
            .collect(Collectors.toMap(
                Employee::getDepartment,
                Employee::getName,
                (existing, replacement) -> existing + ", " + replacement
            ));
        // {Engineering=Alice, Bob, Marketing=Charlie, David, HR=Eve}

        // collectingAndThen: 收集后转换
        Map<String, Employee> highestPaidByDept = employees.stream()
            .collect(Collectors.groupingBy(
                Employee::getDepartment,
                Collectors.collectingAndThen(
                    Collectors.maxBy(Comparator.comparingDouble(Employee::getSalary)),
                    Optional::get
                )
            ));
    }
}
```

## 4. 并行流

### 4.1 并行流基础

```java
import java.util.*;
import java.util.stream.*;

public class ParallelStream {
    public static void main(String[] args) {
        List<Integer> numbers = IntStream.rangeClosed(1, 10_000_000)
            .boxed()
            .collect(Collectors.toList());

        // 顺序流
        long sequentialSum = numbers.stream()
            .mapToLong(Integer::longValue)
            .sum();

        // 并行流
        long parallelSum = numbers.parallelStream()
            .mapToLong(Integer::longValue)
            .sum();

        // 或将顺序流转为并行流
        long parallelSum2 = numbers.stream()
            .parallel()
            .mapToLong(Integer::longValue)
            .sum();

        // 性能对比
        long start = System.nanoTime();
        numbers.stream().mapToLong(Integer::longValue).sum();
        long sequentialTime = System.nanoTime() - start;

        start = System.nanoTime();
        numbers.parallelStream().mapToLong(Integer::longValue).sum();
        long parallelTime = System.nanoTime() - start;

        System.out.printf("Sequential: %d ms%n", sequentialTime / 1_000_000);
        System.out.printf("Parallel: %d ms%n", parallelTime / 1_000_000);
    }
}
```

### 4.2 并行流注意事项

```java
// 1. 避免共享可变状态
// 错误：并行流中使用共享变量
List<Integer> sharedList = new ArrayList<>();  // 非线程安全
IntStream.range(0, 1000).parallel()
    .forEach(sharedList::add);  // 数据竞争！

// 正确：使用线程安全收集器
List<Integer> safeList = IntStream.range(0, 1000).parallel()
    .boxed()
    .collect(Collectors.toList());

// 2. 适合并行流的场景
// - 大数据量（>10000元素）
// - 计算密集型操作
// - 无状态操作（filter, map）
// - 无顺序要求

// 3. 不适合并行流的场景
// - 小数据量（并行开销大于收益）
// - IO密集型操作
// - 有状态操作（sorted, distinct）
// - 需要顺序保证
```

## 5. 常见问题与解决方案

### 5.1 Stream 只能消费一次

```java
Stream<String> stream = Stream.of("a", "b", "c");
stream.forEach(System.out::println);  // OK
// stream.count();  // 异常！Stream已被消费

// 解决方案：重新创建Stream
Supplier<Stream<String>> streamSupplier = () -> Stream.of("a", "b", "c");
streamSupplier.get().forEach(System.out::println);
streamSupplier.get().count();  // OK
```

### 5.2 NullPointerException

```java
// 问题：flatMap中返回null
List<String> result = list.stream()
    .flatMap(s -> {
        String[] parts = s.split(",");
        return parts.length > 1 ? Arrays.stream(parts) : null;  // NPE!
    })
    .collect(Collectors.toList());

// 解决方案：返回空Stream
List<String> result2 = list.stream()
    .flatMap(s -> {
        String[] parts = s.split(",");
        return parts.length > 1 ? Arrays.stream(parts) : Stream.empty();
    })
    .collect(Collectors.toList());
```

## 6. 总结与最佳实践

### 6.1 Stream 操作选择指南

| 需求 | 操作       | 示例                                 |
| :--- | :--------- | :----------------------------------- |
| 过滤 | filter     | `.filter(n -> n > 0)`                |
| 转换 | map        | `.map(String::toUpperCase)`          |
| 展平 | flatMap    | `.flatMap(Collection::stream)`       |
| 去重 | distinct   | `.distinct()`                        |
| 排序 | sorted     | `.sorted(Comparator.naturalOrder())` |
| 截取 | limit/skip | `.limit(10).skip(5)`                 |
| 聚合 | reduce     | `.reduce(0, Integer::sum)`           |
| 分组 | groupingBy | `.collect(groupingBy(...))`          |

### 6.2 最佳实践

1. **优先使用方法引用**：`String::toUpperCase` 比 `s -> s.toUpperCase()` 更简洁
2. **选择合适的Collector**：利用下游收集器组合操作
3. **大数据量考虑并行流**：但要注意线程安全和开销
4. **避免在Stream中修改状态**：保持无副作用
5. **注意装箱开销**：基本类型使用 `IntStream`、`LongStream` 等
6. **短路操作提升性能**：`findFirst`、`anyMatch` 等可提前终止
