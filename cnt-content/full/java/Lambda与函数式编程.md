---
order: 170
tags:
  - java
  - lambda
  - functional
difficulty: intermediate
title: Lambda与函数式编程
module: java
category: 'Java Basics'
description: 'Java 8 Lambda表达式、函数式接口、方法引用与函数式编程范式详解。'
author: fanquanpp
updated: '2026-06-13'
related:
  - java/多线程基础
  - java/JVM内存模型
  - java/流式API
  - java/SpringBoot学习笔记
prerequisites:
  - java/概述与开发环境
---

## 1. Lambda 表达式基础

### 1.1 Lambda 语法

Lambda表达式是Java 8引入的匿名函数写法，使代码更简洁。

```java
// Lambda语法：(参数列表) -> { 方法体 }

// 无参数
Runnable r = () -> System.out.println("Hello Lambda");

// 单参数（可省略括号）
java.util.function.Consumer<String> print = s -> System.out.println(s);

// 多参数
java.util.function.BinaryOperator<Integer> add = (a, b) -> a + b;

// 多行方法体
java.util.function.Function<String, String> processor = s -> {
    String trimmed = s.trim();
    return trimmed.toUpperCase();
};

// 参数类型声明（通常可省略，编译器推断）
java.util.function.BinaryOperator<Integer> multiply = (Integer a, Integer b) -> a * b;
```

### 1.2 从匿名类到 Lambda

```java
import java.util.*;

public class LambdaEvolution {
    public static void main(String[] args) {
        List<String> names = Arrays.asList("Charlie", "Alice", "Bob");

        // 方式1：匿名内部类
        Collections.sort(names, new Comparator<String>() {
            @Override
            public int compare(String a, String b) {
                return a.compareTo(b);
            }
        });

        // 方式2：Lambda表达式
        Collections.sort(names, (a, b) -> a.compareTo(b));

        // 方式3：方法引用
        Collections.sort(names, String::compareTo);

        // 方式4：List.sort + Lambda
        names.sort((a, b) -> a.compareTo(b));

        // 方式5：Comparator工具方法
        names.sort(Comparator.naturalOrder());
    }
}
```

### 1.3 变量捕获

```java
import java.util.function.*;

public class VariableCapture {
    public static void main(String[] args) {
        // 捕获局部变量（必须是effectively final）
        String prefix = "Hello, ";
        Function<String, String> greeter = name -> prefix + name;
        System.out.println(greeter.apply("World"));  // Hello, World

        // prefix = "Hi, ";  // 编译错误：修改后不再是effectively final

        // 捕获实例变量（可修改）
        class Counter {
            int count = 0;
            Runnable incrementer = () -> count++;  // 允许修改实例变量
        }

        // 捕获this引用
        class ThisCapture {
            private String name = "Java";
            void demonstrate() {
                Runnable r = () -> System.out.println(this.name);  // 捕获this
                r.run();  // "Java"
            }
        }
    }
}
```

## 2. 函数式接口

### 2.1 函数式接口定义

函数式接口是**只包含一个抽象方法**的接口，可用 `@FunctionalInterface` 注解标记。

```java
// 自定义函数式接口
@FunctionalInterface
interface StringProcessor {
    String process(String input);

    // 可以有默认方法和静态方法
    default String processAndLog(String input) {
        String result = process(input);
        System.out.println("Processed: " + result);
        return result;
    }

    static StringProcessor toUpperCase() {
        return s -> s.toUpperCase();
    }
}

// 使用
StringProcessor trimmer = s -> s.trim();
String result = trimmer.process("  hello  ");  // "hello"
StringProcessor upper = StringProcessor.toUpperCase();
upper.process("hello");  // "HELLO"
```

### 2.2 Java 标准函数式接口

| 接口                | 参数 | 返回    | 用途       | 示例                     |
| :------------------ | :--- | :------ | :--------- | :----------------------- |
| `Supplier<T>`       | 无   | T       | 提供值     | `() -> new Object()`     |
| `Consumer<T>`       | T    | void    | 消费值     | `s -> print(s)`          |
| `BiConsumer<T,U>`   | T, U | void    | 消费两个值 | `(k, v) -> map.put(k,v)` |
| `Function<T,R>`     | T    | R       | 转换       | `s -> s.length()`        |
| `BiFunction<T,U,R>` | T, U | R       | 双参数转换 | `(a, b) -> a + b`        |
| `Predicate<T>`      | T    | boolean | 判断       | `s -> s.isEmpty()`       |
| `BiPredicate<T,U>`  | T, U | boolean | 双参数判断 | `(a, b) -> a.equals(b)`  |
| `UnaryOperator<T>`  | T    | T       | 一元操作   | `x -> -x`                |
| `BinaryOperator<T>` | T, T | T       | 二元操作   | `(a, b) -> a + b`        |

```java
import java.util.function.*;

public class StandardFunctionalInterfaces {
    public static void main(String[] args) {
        // Supplier: 提供值
        Supplier<Double> randomSupplier = Math::random;
        System.out.println(randomSupplier.get());

        // Consumer: 消费值
        Consumer<String> printer = System.out::println;
        printer.accept("Hello");

        // Function: 转换
        Function<String, Integer> lengthFunc = String::length;
        System.out.println(lengthFunc.apply("Hello"));  // 5

        // Predicate: 判断
        Predicate<String> isEmpty = String::isEmpty;
        System.out.println(isEmpty.test(""));  // true

        // 组合Predicate
        Predicate<String> isLong = s -> s.length() > 5;
        Predicate<String> isLongAndNotEmpty = isLong.and(isEmpty.negate());
        System.out.println(isLongAndNotEmpty.test("Hello World"));  // true

        // Function组合
        Function<String, String> trim = String::trim;
        Function<String, String> upper = String::toUpperCase;
        Function<String, String> trimThenUpper = trim.andThen(upper);
        System.out.println(trimThenUpper.apply("  hello  "));  // "HELLO"
    }
}
```

## 3. 方法引用

### 3.1 四种方法引用

```java
import java.util.*;
import java.util.function.*;

public class MethodReferences {
    public static void main(String[] args) {
        // 1. 静态方法引用: ClassName::staticMethod
        Function<String, Integer> parser = Integer::parseInt;
        System.out.println(parser.apply("42"));  // 42

        // 2. 实例方法引用（对象）: instance::instanceMethod
        String prefix = "Hello, ";
        Function<String, String> greeter = prefix::concat;
        System.out.println(greeter.apply("World"));  // Hello, World

        // 3. 实例方法引用（类）: ClassName::instanceMethod
        // 第一个参数作为方法的调用者
        Function<String, Integer> lengthFunc = String::length;
        System.out.println(lengthFunc.apply("Hello"));  // 5

        BiPredicate<String, String> equals = String::equals;
        System.out.println(equals.test("abc", "abc"));  // true

        // 4. 构造方法引用: ClassName::new
        Supplier<List<String>> listSupplier = ArrayList::new;
        List<String> list = listSupplier.get();

        Function<Integer, int[]> arrayCreator = int[]::new;
        int[] arr = arrayCreator.apply(10);
    }
}
```

### 3.2 方法引用与Lambda的选择

```java
// Lambda更清晰的场景：需要参数变换
list.stream()
    .map(item -> item.toString().toUpperCase())
    .collect(Collectors.toList());

// 方法引用更清晰的场景：直接调用
list.stream()
    .map(String::toUpperCase)
    .collect(Collectors.toList());

// 构造方法引用
list.stream()
    .map(Person::new)  // 比用 s -> new Person(s) 更简洁
    .collect(Collectors.toList());
```

## 4. 函数式编程实践

### 4.1 不可变数据处理

```java
import java.util.*;
import java.util.stream.*;

public class FunctionalDataProcessing {
    public static void main(String[] args) {
        List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

        // 命令式编程
        List<Integer> evenSquaresImperative = new ArrayList<>();
        for (Integer n : numbers) {
            if (n % 2 == 0) {
                evenSquaresImperative.add(n * n);
            }
        }

        // 函数式编程
        List<Integer> evenSquaresFunctional = numbers.stream()
            .filter(n -> n % 2 == 0)
            .map(n -> n * n)
            .collect(Collectors.toList());

        System.out.println(evenSquaresFunctional);  // [4, 16, 36, 64, 100]
    }
}
```

### 4.2 高阶函数

```java
import java.util.function.*;

public class HigherOrderFunctions {
    // 返回函数的函数
    public static Function<Integer, Integer> multiplier(int factor) {
        return x -> x * factor;
    }

    // 接收函数的函数
    public static <T, R> R applyFunction(T value, Function<T, R> func) {
        return func.apply(value);
    }

    // 函数组合
    public static void main(String[] args) {
        Function<Integer, Integer> doubleIt = multiplier(2);
        Function<Integer, Integer> tripleIt = multiplier(3);

        System.out.println(doubleIt.apply(5));  // 10
        System.out.println(tripleIt.apply(5));  // 15

        // 组合函数
        Function<Integer, Integer> doubleThenTriple = doubleIt.andThen(tripleIt);
        System.out.println(doubleThenTriple.apply(5));  // 30 (5*2=10, 10*3=30)

        // compose: 先执行参数函数，再执行当前函数
        Function<Integer, Integer> tripleThenDouble = doubleIt.compose(tripleIt);
        System.out.println(tripleThenDouble.apply(5));  // 30 (5*3=15, 15*2=30)
    }
}
```

### 4.3 柯里化

```java
import java.util.function.*;

public class Currying {
    public static void main(String[] args) {
        // 普通双参数函数
        BiFunction<Integer, Integer, Integer> add = (a, b) -> a + b;

        // 柯里化：将双参数函数转换为返回单参数函数的函数
        Function<Integer, Function<Integer, Integer>> curriedAdd =
            a -> b -> a + b;

        // 部分应用
        Function<Integer, Integer> add5 = curriedAdd.apply(5);
        System.out.println(add5.apply(3));  // 8
        System.out.println(add5.apply(10)); // 15

        // 通用柯里化工具
        Function<Integer, Function<Integer, Function<Integer, Integer>>> curried3 =
            a -> b -> c -> a + b + c;

        System.out.println(curried3.apply(1).apply(2).apply(3));  // 6
    }
}
```

## 5. Optional 与函数式错误处理

```java
import java.util.*;

public class OptionalFunctional {
    public static void main(String[] args) {
        // 创建Optional
        Optional<String> present = Optional.of("Hello");
        Optional<String> empty = Optional.empty();
        Optional<String> nullable = Optional.ofNullable(null);

        // 函数式操作
        present.map(String::toUpperCase)
               .filter(s -> s.length() > 3)
               .ifPresent(System.out::println);  // HELLO

        // 提供默认值
        String result = empty.orElse("Default");
        String computed = empty.orElseGet(() -> "Computed Default");

        // 链式操作
        Optional<String> name = Optional.of("  John  ");
        String processed = name
            .map(String::trim)
            .filter(s -> !s.isEmpty())
            .map(String::toUpperCase)
            .orElse("UNKNOWN");
        System.out.println(processed);  // JOHN

        // flatMap避免嵌套Optional
        Optional<String> email = Optional.of("user@example.com");
        Optional<String> domain = email.flatMap(e -> {
            int idx = e.indexOf('@');
            return idx >= 0 ? Optional.of(e.substring(idx + 1)) : Optional.empty();
        });
        System.out.println(domain.orElse("No domain"));  // example.com
    }
}
```

## 6. 常见问题与解决方案

### 6.1 Lambda中的异常处理

```java
// 问题：Lambda中不能直接抛出受检异常
// list.forEach(s -> throw new IOException());  // 编译错误

// 解决方案1：包装为RuntimeException
list.forEach(s -> {
    try {
        process(s);
    } catch (IOException e) {
        throw new RuntimeException(e);
    }
});

// 解决方案2：工具方法
@FunctionalInterface
interface ThrowingConsumer<T> {
    void accept(T t) throws Exception;

    static <T> Consumer<T> wrap(ThrowingConsumer<T> consumer) {
        return t -> {
            try {
                consumer.accept(t);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        };
    }
}

list.forEach(ThrowingConsumer.wrap(s -> process(s)));
```

### 6.2 Lambda与this引用

```java
// Lambda中的this指向外部类的this
// 匿名内部类中的this指向匿名类实例
class ThisDemo {
    private String name = "Outer";

    void test() {
        // Lambda: this指向ThisDemo
        Runnable lambda = () -> System.out.println(this.name);  // "Outer"

        // 匿名类: this指向匿名类
        Runnable anonymous = new Runnable() {
            private String name = "Inner";
            @Override
            public void run() {
                System.out.println(this.name);  // "Inner"
            }
        };

        lambda.run();
        anonymous.run();
    }
}
```

## 7. 总结与最佳实践

### 7.1 Lambda使用原则

1. **保持简短**：Lambda体不超过3-5行，过长应提取方法
2. **优先方法引用**：比Lambda更简洁
3. **类型推断**：省略参数类型，让编译器推断
4. **避免副作用**：Lambda不应修改外部状态

### 7.2 函数式编程原则

1. **使用不可变数据**：避免修改集合，创建新集合
2. **组合优于继承**：用函数组合实现功能复用
3. **惰性求值**：Stream的中间操作是惰性的
4. **声明式编程**：描述"做什么"而非"怎么做"
