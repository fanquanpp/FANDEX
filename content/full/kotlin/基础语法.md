---
order: 11
title: 'Kotlin 基础语法'
module: kotlin
category: Kotlin
difficulty: beginner
description: 变量声明、基本类型、字符串模板、包与导入、控制流与区间。
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/概述与环境配置
  - kotlin/函数与Lambda
  - kotlin/类与对象
prerequisites: []
---

## 1. 变量声明

Kotlin 提供两种变量声明方式：`val`（只读）和 `var`（可变）。

### 1.1 val（只读变量）

```kotlin
val name: String = "Kotlin"  // 显式类型
val version = 2.2            // 类型推断为 Double
val year = 2011              // 类型推断为 Int

// name = "Java"  // 编译错误：Val cannot be reassigned
```

> **最佳实践**：优先使用 `val`，仅在确实需要修改变量时才使用 `var`。这使代码更安全、更易推理。

### 1.2 var（可变变量）

```kotlin
var count: Int = 0
count = 1           // OK
count += 10         // OK

var message = "Hello"
message = "World"   // OK，类型必须一致
// message = 42     // 编译错误：Type mismatch
```

### 1.3 延迟初始化

```kotlin
// lateinit — 用于 var，延迟初始化引用类型
lateinit var service: UserService

fun setup() {
    service = UserService()  // 在使用前初始化
}

// by lazy — 用于 val，首次访问时初始化
val heavyObject: ExpensiveClass by lazy {
    println("Initializing...")
    ExpensiveClass()
}
```

### 1.4 常量

```kotlin
// 编译期常量（顶层或伴生对象中）
const val MAX_SIZE = 100
const val APP_NAME = "FANDEX"

// 运行时常量
val runtimeConstant = computeValue()
```

## 2. 基本类型

与 Java 不同，Kotlin 中一切皆对象，基本类型在可能时编译为 Java 原始类型。

### 2.1 数值类型

| 类型     | 位数 | 最小值   | 最大值   |
| -------- | ---- | -------- | -------- |
| `Byte`   | 8    | -128     | 127      |
| `Short`  | 16   | -32768   | 32767    |
| `Int`    | 32   | -2³¹     | 2³¹-1    |
| `Long`   | 64   | -2⁶³     | 2⁶³-1    |
| `Float`  | 32   | IEEE 754 | IEEE 754 |
| `Double` | 64   | IEEE 754 | IEEE 754 |

```kotlin
val intVal = 42              // Int
val longVal = 42L            // Long
val doubleVal = 3.14         // Double
val floatVal = 3.14f         // Float
val hexVal = 0xFF            // Int (十六进制)
val binaryVal = 0b1010       // Int (二进制)
val underscored = 1_000_000  // Int (下划线分隔，提高可读性)

// 数值转换 — Kotlin 不支持隐式转换
val intVal2: Int = 100
val longVal2: Long = intVal2.toLong()   // 显式转换
val doubleVal2: Double = intVal2.toDouble()
```

### 2.2 布尔类型

```kotlin
val isActive: Boolean = true
val isComplete = false

// 惰性逻辑运算
val result = isActive && expensiveCheck()  // 短路求值
```

### 2.3 字符与字符串

```kotlin
// Char — 用单引号
val letter: Char = 'A'
val unicode: Char = '\u0041'  // 'A'

// String — 用双引号
val text: String = "Hello, Kotlin"

// 原始字符串（三引号）— 保留格式
val rawText = """
    |Hello,
    |Kotlin!
""".trimMargin()  // trimMargin 去除 | 前缀

val rawText2 = """
    Hello,
    Kotlin!
""".trimIndent()  // 去除公共缩进
```

### 2.4 数组

```kotlin
// 创建数组
val numbers = arrayOf(1, 2, 3, 4, 5)           // Array<Int>
val strings = arrayOf("a", "b", "c")            // Array<String>
val mixed = arrayOf(1, "two", 3.0)              // Array<Any>

// 原始类型数组（无装箱开销）
val intArray = intArrayOf(1, 2, 3)              // IntArray
val byteArray = byteArrayOf(1, 2, 3)            // ByteArray
val longArray = longArrayOf(1L, 2L, 3L)         // LongArray

// 构造函数创建
val squares = Array(5) { i -> i * i }           // [0, 1, 4, 9, 16]
val zeros = IntArray(5)                          // [0, 0, 0, 0, 0]
val ones = IntArray(5) { 1 }                    // [1, 1, 1, 1, 1]
```

## 3. 字符串模板

Kotlin 支持字符串模板，比 Java 的字符串拼接更简洁高效：

```kotlin
val name = "Kotlin"
val version = 2.2

// 简单模板
println("Language: $name")                    // Language: Kotlin

// 表达式模板
println("Version: ${version + 0.1}")          // Version: 2.3

// 嵌套表达式
val list = listOf("a", "b", "c")
println("Size: ${list.size}, First: ${list[0]}")  // Size: 3, First: a

// 在原始字符串中使用
val json = """
    {
        "name": "$name",
        "version": $version
    }
""".trimIndent()
```

> **注意**：如果需要在字符串中使用 `$` 字面量，需要转义：`${'$'}` 或 `\$`。

## 4. 包与导入

### 4.1 包声明

```kotlin
package com.example.kotlinbasics

// 文件中的所有声明都属于此包
class MyClass
fun topLevelFunction() = "Hello"
```

### 4.2 导入

```kotlin
// 默认导入（无需显式声明）
// kotlin.*、kotlin.annotation.*、kotlin.collections.* 等

// 显式导入
import com.example.utils.Logger
import com.example.utils.formatDate

// 导入并重命名（解决冲突）
import com.example.utils.formatDate as formatDateUtil
import com.other.utils.formatDate as formatDateOther

// 导入整个包
import com.example.utils.*

// 导入伴生对象成员
import com.example.Config.DEFAULT_TIMEOUT
```

## 5. 控制流

### 5.1 if 表达式

Kotlin 中 `if` 是表达式，有返回值：

```kotlin
// 作为表达式
val max = if (a > b) a else b

// 多行 if 表达式
val result = if (score >= 90) {
    println("Excellent")
    "A"
} else if (score >= 80) {
    println("Good")
    "B"
} else {
    println("Keep going")
    "C"
}
```

### 5.2 when 表达式

`when` 是 Kotlin 中强大的模式匹配工具，替代 Java 的 `switch`：

```kotlin
// 基本 when
when (x) {
    1 -> println("One")
    2, 3 -> println("Two or Three")
    in 4..10 -> println("Four to Ten")
    !in 11..20 -> println("Not in 11-20")
    is String -> println("It's a String")
    else -> println("Unknown")
}

// when 作为表达式
val description = when (x) {
    0 -> "Zero"
    1, 2, 3 -> "Small"
    in 4..100 -> "Medium"
    else -> "Large"
}

// 无参 when（替代 if-else 链）
when {
    x > 0 -> println("Positive")
    x < 0 -> println("Negative")
    else -> println("Zero")
}

// 捕获 when 主体中的变量
fun process(input: Any) = when (input) {
    is Int -> "Integer: ${input * 2}"    // input smart-cast to Int
    is String -> "String of length ${input.length}"
    is List<*> -> "List with ${input.size} elements"
    else -> "Unknown type"
}
```

### 5.3 for 循环

```kotlin
// 遍历区间
for (i in 1..5) print("$i ")          // 1 2 3 4 5

// 遍历区间（排除末尾）
for (i in 1 until 5) print("$i ")     // 1 2 3 4

// 递减遍历
for (i in 5 downTo 1) print("$i ")    // 5 4 3 2 1

// 带步长
for (i in 1..10 step 2) print("$i ")  // 1 3 5 7 9

// 遍历集合
val items = listOf("apple", "banana", "cherry")
for (item in items) println(item)

// 带索引遍历
for ((index, value) in items.withIndex()) {
    println("$index: $value")
}

// 遍历 Map
val map = mapOf("a" to 1, "b" to 2, "c" to 3)
for ((key, value) in map) {
    println("$key = $value")
}
```

### 5.4 while 与 do-while

```kotlin
var i = 0
while (i < 5) {
    println(i)
    i++
}

var input: String
do {
    input = readLine() ?: ""
} while (input.isEmpty())
```

### 5.5 循环控制

```kotlin
// break 和 continue
for (i in 1..10) {
    if (i == 3) continue  // 跳过 3
    if (i == 7) break     // 到 7 停止
    println(i)
}

// 标签循环
loop@ for (i in 1..5) {
    for (j in 1..5) {
        if (i * j == 6) break@loop  // 跳出外层循环
        println("$i * $j = ${i * j}")
    }
}
```

## 6. 区间与数列

### 6.1 区间（Range）

```kotlin
// 闭区间
val range1 = 1..10        // IntRange: 1, 2, ..., 10
val range2 = 'a'..'z'     // CharRange: a, b, ..., z

// 半开区间
val range3 = 1 until 10   // IntRange: 1, 2, ..., 9

// 递减区间
val range4 = 10 downTo 1  // IntRange: 10, 9, ..., 1

// 带步长
val range5 = 1..10 step 2  // 1, 3, 5, 7, 9
val range6 = 10 downTo 1 step 3  // 10, 7, 4, 1
```

### 6.2 区间操作

```kotlin
val range = 1..100

// 包含检查
3 in range          // true
200 in range        // false
50 !in range        // false

// 区间判断
val ch = 'k'
ch in 'a'..'z'      // true
ch in 'A'..'Z'      // false

// 实用函数
(1..10).random()    // 随机数
(1..10).first       // 1
(1..10).last        // 10
(1..10).step(3)     // 1, 4, 7, 10
```

### 6.3 数列（Progression）

区间本质上是数列的实现，数列定义了 `first`、`last` 和 `step`：

```kotlin
// 自定义步长的数列
val progression = IntProgression.fromClosedRange(1, 10, 3)
// 1, 4, 7, 10

// 数列转列表
val list = (1..10 step 2).toList()  // [1, 3, 5, 7, 9]
```

## 7. 类型检查与转换

```kotlin
// is 和 !is 操作符
if (obj is String) {
    // obj 在此分支自动智能转换为 String
    println(obj.length)
}

// as 和 as? 类型转换
val x: Any = "Hello"
val s1: String = x as String       // 不安全转换，可能抛出 ClassCastException
val s2: String? = x as? String     // 安全转换，失败返回 null
val s3: Int? = x as? Int           // null（转换失败）
```

> **智能转换**是 Kotlin 的核心特性之一。编译器在条件分支中自动进行类型转换，无需手动强转，既安全又简洁。
