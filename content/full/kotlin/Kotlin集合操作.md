---
order: 56
title: Kotlin集合操作
module: kotlin
category: Kotlin
difficulty: beginner
description: 集合函数式操作
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/Kotlin序列化
  - kotlin/Kotlin契约
  - kotlin/扩展函数
  - kotlin/Kotlin作用域函数
prerequisites:
  - kotlin/概述与环境配置
---

## 概述

Kotlin 的集合操作是其最强大的特性之一。通过丰富的扩展函数，你可以用简洁的函数式风格对集合进行过滤、映射、排序、分组、聚合等操作，而不需要写繁琐的 for 循环。这些操作大多以 lambda 表达式作为参数，让代码既简洁又易读。

如果你有 Python 或 JavaScript 的背景，Kotlin 的集合操作会让你感到熟悉。但 Kotlin 的类型系统让这些操作更加安全。

## 基础概念

- **List**：有序集合，可以重复，分为 MutableList（可变）和 List（不可变）
- **Set**：无序集合，不可以重复，分为 MutableSet 和 Set
- **Map**：键值对集合，分为 MutableMap 和 Map
- **Iterable**：所有集合的父接口，支持迭代
- **Sequence**：懒序列，类似 Java 的 Stream，中间操作不会立即执行
- **高阶函数**：接受函数作为参数的函数，如 map、filter、forEach 等

## 快速上手

```kotlin
fun main() {
    val numbers = listOf(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

    // 过滤：只保留偶数
    val evens = numbers.filter { it % 2 == 0 }
    println("偶数: $evens")  // [2, 4, 6, 8, 10]

    // 映射：每个元素乘以2
    val doubled = numbers.map { it * 2 }
    println("翻倍: $doubled")  // [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]

    // 链式调用：先过滤再映射
    val result = numbers.filter { it % 2 == 0 }.map { it * it }
    println("偶数的平方: $result")  // [4, 16, 36, 64, 100]

    // 排序
    val sorted = numbers.sortedDescending()
    println("降序: $sorted")  // [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]

    // 求和
    val sum = numbers.sum()
    println("总和: $sum")  // 55
}
```

## 详细用法

### 过滤操作

```kotlin
fun filterDemo() {
    val numbers = listOf(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

    // filter：保留满足条件的元素
    val greaterThan5 = numbers.filter { it > 5 }
    println(greaterThan5)  // [6, 7, 8, 9, 10]

    // filterNot：保留不满足条件的元素
    val notGreaterThan5 = numbers.filterNot { it > 5 }
    println(notGreaterThan5)  // [1, 2, 3, 4, 5]

    // filterNotNull：过滤掉 null
    val mixed = listOf("a", null, "b", null, "c")
    val nonNull = mixed.filterNotNull()
    println(nonNull)  // [a, b, c]

    // takeWhile：从开头取元素，直到不满足条件
    val takeResult = numbers.takeWhile { it < 5 }
    println(takeResult)  // [1, 2, 3, 4]

    // dropWhile：从开头跳过元素，直到不满足条件
    val dropResult = numbers.dropWhile { it < 5 }
    println(dropResult)  // [5, 6, 7, 8, 9, 10]

    // partition：将集合分为满足条件和不满足条件的两部分
    val (even, odd) = numbers.partition { it % 2 == 0 }
    println("偶数: $even, 奇数: $odd")
}
```

### 映射操作

```kotlin
fun mapDemo() {
    val names = listOf("alice", "bob", "charlie")

    // map：转换每个元素
    val upper = names.map { it.uppercase() }
    println(upper)  // [ALICE, BOB, CHARLIE]

    // mapIndexed：带索引的映射
    val indexed = names.mapIndexed { index, name -> "$index: $name" }
    println(indexed)  // [0: alice, 1: bob, 2: charlie]

    // mapNotNull：映射并过滤 null
    val parsed = listOf("1", "abc", "3", "def").mapNotNull { it.toIntOrNull() }
    println(parsed)  // [1, 3]

    // flatMap：先映射再展平
    val words = listOf("Hello World", "Kotlin is great")
    val allWords = words.flatMap { it.split(" ") }
    println(allWords)  // [Hello, World, Kotlin, is, great]

    // flatten：展平嵌套集合
    val nested = listOf(listOf(1, 2), listOf(3, 4), listOf(5))
    val flat = nested.flatten()
    println(flat)  // [1, 2, 3, 4, 5]
}
```

### 排序操作

```kotlin
fun sortDemo() {
    data class Person(val name: String, val age: Int)

    val people = listOf(
        Person("Alice", 25),
        Person("Bob", 30),
        Person("Charlie", 20)
    )

    // sortedBy：按属性排序（升序）
    val byAge = people.sortedBy { it.age }
    println(byAge)  // [Charlie(20), Alice(25), Bob(30)]

    // sortedByDescending：按属性排序（降序）
    val byAgeDesc = people.sortedByDescending { it.age }
    println(byAgeDesc)  // [Bob(30), Alice(25), Charlie(20)]

    // sortedWith：自定义排序
    val custom = people.sortedWith(compareBy({ it.age }, { it.name }))
    println(custom)

    // reversed：反转顺序
    val reversed = people.reversed()

    // shuffled：随机打乱
    val shuffled = people.shuffled()
}
```

### 分组和聚合

```kotlin
fun groupDemo() {
    data class Student(val name: String, val grade: String, val score: Int)

    val students = listOf(
        Student("Alice", "A", 90),
        Student("Bob", "B", 80),
        Student("Charlie", "A", 95),
        Student("David", "B", 75),
        Student("Eve", "A", 88)
    )

    // groupBy：按属性分组
    val byGrade = students.groupBy { it.grade }
    println("A组: ${byGrade["A"]?.map { it.name }}")  // [Alice, Charlie, Eve]
    println("B组: ${byGrade["B"]?.map { it.name }}")  // [Bob, David]

    // groupingBy + aggregate：更灵活的分组聚合
    val avgScoreByGrade = students.groupingBy { it.grade }.average()
    println("A组平均分: ${avgScoreByGrade["A"]}")

    // count：计数
    val countByGrade = students.groupingBy { it.grade }.eachCount()
    println(countByGrade)  // {A=3, B=2}

    // 聚合函数
    val scores = students.map { it.score }
    println("最高分: ${scores.max()}")
    println("最低分: ${scores.min()}")
    println("平均分: ${scores.average()}")
    println("总分: ${scores.sum()}")
}
```

### 查找操作

```kotlin
fun findDemo() {
    val numbers = listOf(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

    // find：找到第一个满足条件的元素
    val firstEven = numbers.find { it % 2 == 0 }
    println(firstEven)  // 2

    // findLast：找到最后一个满足条件的元素
    val lastEven = numbers.findLast { it % 2 == 0 }
    println(lastEven)  // 10

    // first / last：获取第一个/最后一个元素
    println(numbers.first())   // 1
    println(numbers.last())    // 10

    // firstOrNull / lastOrNull：安全版本
    val empty = emptyList<Int>()
    println(empty.firstOrNull())  // null（不会抛异常）

    // binarySearch：二分查找（集合必须已排序）
    val sorted = numbers.sorted()
    val index = sorted.binarySearch(5)
    println("5的索引: $index")

    // contains / in：检查是否包含
    println(5 in numbers)           // true
    println(numbers.contains(100))  // false
}
```

### Map 操作

```kotlin
fun mapOpsDemo() {
    val scores = mapOf("Alice" to 90, "Bob" to 80, "Charlie" to 95)

    // 遍历
    scores.forEach { (name, score) ->
        println("$name: $score")
    }

    // mapKeys / mapValues：转换键或值
    val upperKeys = scores.mapKeys { it.key.uppercase() }
    println(upperKeys)  // {ALICE=90, BOB=80, CHARLIE=95}

    val graded = scores.mapValues { if (it.value >= 90) "A" else "B" }
    println(graded)  // {Alice=A, Bob=B, Charlie=A}

    // filterKeys / filterValues：过滤
    val highScores = scores.filterValues { it >= 90 }
    println(highScores)  // {Alice=90, Charlie=95}

    // getOrDefault / getOrElse
    println(scores.getOrDefault("David", 0))   // 0
    println(scores.getOrElse("David") { 0 })    // 0

    // toList：转为键值对列表
    val pairs = scores.toList()
    println(pairs)  // [(Alice, 90), (Bob, 80), (Charlie, 95)]
}
```

### Sequence 懒序列

```kotlin
fun sequenceDemo() {
    val numbers = (1..100).toList()

    // 普通集合操作：每一步都创建新集合
    val listResult = numbers
        .filter { it % 2 == 0 }   // 创建中间集合
        .map { it * it }           // 又创建中间集合
        .take(5)                   // 再创建中间集合

    // Sequence：懒执行，不创建中间集合
    val seqResult = numbers.asSequence()
        .filter { it % 2 == 0 }   // 不执行
        .map { it * it }           // 不执行
        .take(5)                   // 不执行
        .toList()                  // 到这里才执行，且每个元素走完整个管道

    println(listResult)  // [4, 16, 36, 64, 100]
    println(seqResult)   // [4, 16, 36, 64, 100]

    // Sequence 在数据量大时性能更好
    // 因为不需要创建中间集合
}
```

## 常见场景

### 数据转换管道

```kotlin
data class RawUser(val name: String, val age: String, val email: String?)
data class ValidUser(val name: String, val age: Int, val email: String)

fun processUsers(rawUsers: List<RawUser>): List<ValidUser> {
    return rawUsers
        .filter { it.email != null }           // 过滤掉没有邮箱的
        .map {                                  // 转换数据
            ValidUser(
                name = it.name.trim(),
                age = it.age.toIntOrNull() ?: 0,
                email = it.email!!
            )
        }
        .filter { it.age >= 18 }               // 过滤掉未成年
        .sortedBy { it.name }                   // 按名字排序
        .distinctBy { it.email }                // 按邮箱去重
}
```

### 频率统计

```kotlin
fun frequencyDemo() {
    val text = "hello world kotlin programming"
    // 统计每个字符出现的次数
    val charFreq = text.groupingBy { it }.eachCount()
    println(charFreq)

    // 统计每个单词出现的次数
    val wordFreq = text.split(" ").groupingBy { it }.eachCount()
    println(wordFreq)

    // 找出出现次数最多的元素
    val words = listOf("a", "b", "a", "c", "a", "b")
    val mostCommon = words.groupingBy { it }.eachCount()
        .maxByOrNull { it.value }
    println("最常见的: $mostCommon")  // a=3
}
```

### 集合的交并差

```kotlin
fun setOperations() {
    val a = setOf(1, 2, 3, 4, 5)
    val b = setOf(4, 5, 6, 7, 8)

    // 交集
    val intersect = a intersect b
    println("交集: $intersect")  // {4, 5}

    // 并集
    val union = a union b
    println("并集: $union")  // {1, 2, 3, 4, 5, 6, 7, 8}

    // 差集
    val subtract = a subtract b
    println("差集: $subtract")  // {1, 2, 3}
}
```

## 注意事项

- **优先使用不可变集合**：`listOf`、`mapOf`、`setOf` 创建不可变集合，减少意外修改的风险
- **Sequence 适合大数据量**：当集合元素很多且链式操作很长时，用 `asSequence()` 避免创建中间集合
- **避免在 map 中做过滤**：用 `filter` + `map` 代替在 `map` 中返回 null，更清晰
- **注意空集合的聚合**：对空集合调用 `max()`、`average()` 等会抛异常，使用 `maxOrNull()` 等安全版本
- **distinctBy 会保留第一个**：当有重复键时，`distinctBy` 保留第一个遇到的元素

## 进阶用法

### 自定义聚合

```kotlin
// fold：带初始值的累积
val numbers = listOf(1, 2, 3, 4, 5)
val sum = numbers.fold(0) { acc, num -> acc + num }
println(sum)  // 15

// 用 fold 构建字符串
val result = numbers.fold("Numbers:") { acc, num -> "$acc $num" }
println(result)  // Numbers: 1 2 3 4 5

// reduce：不带初始值的累积（集合不能为空）
val product = numbers.reduce { acc, num -> acc * num }
println(product)  // 120
```

### 窗口和分块

```kotlin
val numbers = (1..10).toList()

// chunked：按大小分块
val chunks = numbers.chunked(3)
println(chunks)  // [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]

// windowed：滑动窗口
val windows = numbers.windowed(3, step = 2)
println(windows)  // [[1, 2, 3], [3, 4, 5], [5, 6, 7], [7, 8, 9], [9, 10]]

// zip：合并两个集合
val names = listOf("Alice", "Bob", "Charlie")
val ages = listOf(25, 30, 20)
val pairs = names.zip(ages)
println(pairs)  // [(Alice, 25), (Bob, 30), (Charlie, 20)]

// unzip：拆分
val (names2, ages2) = pairs.unzip()
```

### 关联操作

```kotlin
data class Product(val id: Int, val name: String, val price: Double)

val products = listOf(
    Product(1, "手机", 2999.0),
    Product(2, "电脑", 5999.0),
    Product(3, "耳机", 299.0)
)

// associateBy：按某个属性建立 Map
val byId = products.associateBy { it.id }
println(byId[2])  // Product(id=2, name=电脑, price=5999.0)

// associateWith：用元素本身作为键
val priceMap = products.associateWith { it.price }
println(priceMap)  // {Product(1,手机,2999.0)=2999.0, ...}

// associate：自定义键值
val namePriceMap = products.associate { it.name to it.price }
println(namePriceMap)  // {手机=2999.0, 电脑=5999.0, 耳机=299.0}
```
