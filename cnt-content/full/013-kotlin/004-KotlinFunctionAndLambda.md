---
order: 40
title: Kotlin 函数与 Lambda
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: 函数定义、扩展函数、Lambda 表达式、高阶函数、内联函数与 SAM 转换。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'kotlin/002-KotlinOverviewEnvSetup'
  - 'kotlin/003-KotlinBasicSyntax'
  - 'kotlin/005-KotlinClassObject'
  - 'kotlin/007-KotlinGenericTypeSystem'
prerequisites: []
---

## 前置知识

- [Kotlin 基础语法](/kotlin/003-KotlinBasicSyntax)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 函数定义」的核心机制、典型用法与常见陷阱
- 掌握「2. 扩展函数」的核心机制、典型用法与常见陷阱
- 掌握「3. Lambda 表达式」的核心机制、典型用法与常见陷阱
- 掌握「4. 高阶函数」的核心机制、典型用法与常见陷阱
- 掌握「5. 内联函数」的核心机制、典型用法与常见陷阱


## 1. 函数定义

### 1.1 基本函数

```kotlin
// 标准函数
fun add(a: Int, b: Int): Int {
    return a + b
}

// 表达式函数体
fun add(a: Int, b: Int): Int = a + b

// 返回类型推断
fun add(a: Int, b: Int) = a + b  // 推断为 Int

// 无返回值（Unit）
fun greet(name: String): Unit {
    println("Hello, $name!")
}
// Unit 可省略
fun greet(name: String) {
    println("Hello, $name!")
}
```

### 1.2 默认参数

```kotlin
fun connect(host: String, port: Int = 8080, timeout: Int = 5000): String {
    return "$host:$port (timeout: ${timeout}ms)"
}

connect("localhost")                    // localhost:8080 (timeout: 5000ms)
connect("localhost", 3306)              // localhost:3306 (timeout: 5000ms)
connect("localhost", 3306, 10000)       // localhost:3306 (timeout: 10000ms)
```

### 1.3 命名参数

```kotlin
fun createUser(name: String, age: Int = 0, email: String = "", active: Boolean = true) {
    // ...
}

// 使用命名参数跳过中间参数
createUser("Alice", email = "alice@example.com")
createUser(name = "Bob", active = false)
```

> **最佳实践**：当函数有多个参数时，尤其是布尔类型参数，使用命名参数可大幅提升代码可读性。

### 1.4 可变参数

```kotlin
fun sum(vararg numbers: Int): Int {
    return numbers.sum()
}

sum(1, 2, 3)          // 6
sum(1, 2, 3, 4, 5)    // 15

// 展开数组
val array = intArrayOf(1, 2, 3)
sum(*array)            // 使用 * 展开运算符
```

### 1.5 尾递归函数

```kotlin
tailrec fun factorial(n: Long, acc: Long = 1): Long {
    return if (n <= 1) acc else factorial(n - 1, acc * n)
}

factorial(20)  // 2432902008176640000
```

## 2. 扩展函数

扩展函数允许为已有类添加新方法，无需继承或修改源码：

```kotlin
// 为 String 添加扩展函数
fun String.addExclamation(): String = this + "!"

println("Hello".addExclamation())  // Hello!

// 为 Int 添加扩展
fun Int.isEven(): Boolean = this % 2 == 0
println(4.isEven())  // true
println(3.isEven())  // false

// 为 List 添加扩展
fun <T> List<T>.second(): T = this[1]
val list = listOf("a", "b", "c")
println(list.second())  // b
```

### 2.1 可空接收者扩展

```kotlin
// 可空接收者 — 在函数内部处理 null
fun String?.isNullOrEmpty(): Boolean = this == null || this.isEmpty()

val s: String? = null
s.isNullOrEmpty()  // true
```

### 2.2 扩展属性

```kotlin
val String.halfLength: Int
    get() = this.length / 2

println("Kotlin".halfLength)  // 3

var StringBuilder.lastChar: Char
    get() = this[this.length - 1]
    set(value) { this.append(value) }
```

### 2.3 扩展函数的解析

扩展函数是**静态解析**的，不是虚函数：

```kotlin
open class Animal
class Dog : Animal()

fun Animal.sound() = "Generic sound"
fun Dog.sound() = "Woof"

fun makeSound(animal: Animal) {
    println(animal.sound())  // 静态解析，调用 Animal.sound()
}

val dog: Dog = Dog()
val animal: Animal = dog

makeSound(dog)     // "Generic sound"（不是 "Woof"！）
dog.sound()        // "Woof"
animal.sound()     // "Generic sound"
```

## 3. Lambda 表达式

### 3.1 基本语法

```kotlin
// 完整语法
val sum: (Int, Int) -> Int = { a: Int, b: Int -> a + b }

// 类型推断
val sum = { a: Int, b: Int -> a + b }

// 指定类型省略参数类型
val sum: (Int, Int) -> Int = { a, b -> a + b }
```

### 3.2 it 隐式参数

当 Lambda 只有一个参数时，可用 `it` 代替：

```kotlin
val square: (Int) -> Int = { it * it }
val isEven: (Int) -> Boolean = { it % 2 == 0 }

val numbers = listOf(1, 2, 3, 4, 5)
numbers.filter { it > 3 }      // [4, 5]
numbers.map { it * 2 }          // [2, 4, 6, 8, 10]
```

### 3.3 Lambda 与集合操作

```kotlin
val numbers = listOf(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

// filter — 过滤
val evens = numbers.filter { it % 2 == 0 }

// map — 映射
val squares = numbers.map { it * it }

// forEach — 遍历
numbers.forEach { println(it) }

// fold — 累积
val sum = numbers.fold(0) { acc, num -> acc + num }

// groupBy — 分组
val grouped = numbers.groupBy { if (it % 2 == 0) "even" else "odd" }

// sortedBy — 排序
val sorted = numbers.sortedByDescending { it }
```

## 4. 高阶函数

高阶函数是以函数作为参数或返回值的函数：

```kotlin
// 函数作为参数
fun <T> List<T>.customFilter(predicate: (T) -> Boolean): List<T> {
    val result = mutableListOf<T>()
    for (item in this) {
        if (predicate(item)) result.add(item)
    }
    return result
}

numbers.customFilter { it > 5 }

// 函数作为返回值
fun multiplier(factor: Int): (Int) -> Int = { number -> number * factor }

val double = multiplier(2)
val triple = multiplier(3)
double(5)   // 10
triple(5)   // 15
```

### 4.1 函数类型

```kotlin
// 函数类型语法
val f1: () -> Unit = { println("No params") }
val f2: (Int) -> String = { "Number: $it" }
val f3: (Int, String) -> Boolean = { num, str -> num == str.length }

// 带接收者的函数类型
val f4: String.(Int) -> String = { this.repeat(it) }
"Ha".f4(3)        // "HaHaHa"
"Ha".let { f4(it, 3) }  // 等价写法

// 函数类型实例化
val f5 = fun(a: Int, b: Int): Int = a + b  // 匿名函数
```

### 4.2 常见高阶函数模式

```kotlin
// also — 执行附加操作，返回原对象
val user = User("Alice", 25).also {
    println("Created: $it")
}

// apply — 配置对象，返回原对象
val builder = StringBuilder().apply {
    append("Hello")
    append(", ")
    append("Kotlin")
}

// let — 转换对象，返回 Lambda 结果
val length = "Kotlin".let {
    println("Processing: $it")
    it.length
}

// run — 执行代码块，返回结果
val result = "Kotlin".run {
    println("Processing: $this")
    length
}

// with — 非扩展版本的 run
val greeting = with(StringBuilder()) {
    append("Hello")
    append(", Kotlin")
    toString()
}
```

## 5. 内联函数

### 5.1 inline 关键字

高阶函数会为 Lambda 创建匿名内部类对象，产生运行时开销。`inline` 将函数体直接内联到调用处：

```kotlin
inline fun <T> measureTime(block: () -> T): T {
    val start = System.currentTimeMillis()
    val result = block()
    val end = System.currentTimeMillis()
    println("Execution time: ${end - start}ms")
    return result
}

// 调用处展开后等价于：
// val start = System.currentTimeMillis()
// val result = /* block 内容 */
// val end = System.currentTimeMillis()
```

### 5.2 noinline 与 crossinline

```kotlin
// noinline — 禁止内联特定参数
inline fun process(
    inlineBlock: () -> Unit,      // 被内联
    noinline notInlined: () -> Unit  // 不被内联
) {
    inlineBlock()
    notInlined()
}

// crossinline — 允许内联但禁止非局部返回
inline fun runInThread(crossinline action: () -> Unit) {
    Thread { action() }.start()
    // action 中不能使用 return 退出外层函数
}
```

### 5.3 非局部返回

```kotlin
fun processElements(elements: List<Int>) {
    elements.forEach {
        if (it == 0) return  // 非局部返回，退出 processElements
        println(it)
    }
    println("Done")  // 如果遇到 0，这行不会执行
}
```

## 6. SAM 转换

Kotlin 支持对 Java 单抽象方法（SAM）接口的自动转换：

```kotlin
// Java 接口
// public interface OnClickListener {
//     void onClick(View v);
// }

// Kotlin 中使用 SAM 转换
button.setOnClickListener { view ->
    println("Clicked: $view")
}

// 显式 SAM 转换（Kotlin 1.4+ 也支持 Kotlin 函数式接口）
fun interface Producer<T> {
    fun produce(): T
}

val producer = Producer { "Hello" }
producer.produce()  // "Hello"
```

### 6.1 Kotlin 函数式接口

```kotlin
// fun interface — Kotlin 1.4+ 支持
fun interface Transformer<T, R> {
    fun transform(input: T): R
}

// SAM 转换
val toLength: Transformer<String, Int> = Transformer { it.length }
toLength.transform("Kotlin")  // 6

// 多个 Lambda 参数时指定哪个进行 SAM 转换
fun interface ClickHandler {
    fun onClick()
}

fun setup(handler: ClickHandler, delay: Long = 0) {
    // ...
}

setup(ClickHandler { println("Clicked!") })
```

## 7. 作用域函数对比

| 函数    | 对象引用 | 返回值      | 是否扩展函数 | 典型场景             |
| ------- | -------- | ----------- | ------------ | -------------------- |
| `let`   | `it`     | Lambda 结果 | 是           | 空安全操作、链式转换 |
| `run`   | `this`   | Lambda 结果 | 是           | 对象初始化并计算结果 |
| `with`  | `this`   | Lambda 结果 | 否（参数）   | 对已存在对象进行操作 |
| `apply` | `this`   | 对象本身    | 是           | 对象初始化/配置      |
| `also`  | `it`     | 对象本身    | 是           | 附加操作、日志、验证 |

```kotlin
// 典型使用场景
val person = Person().apply {
    name = "Alice"
    age = 25
}.also {
    println("Created person: $it")
}

val nameLength = person.let {
    it.name.length
}
```

> **选择建议**：需要返回对象本身用 `apply`/`also`，需要返回计算结果用 `let`/`run`/`with`；引用用 `this` 还是 `it` 取决于是否需要频繁访问对象成员。
## 函数定义

**基本写法：标准函数**
`fun <name>(<params>): <ReturnType> { <body> }`
```kotlin
// 标准函数定义
fun add(a: Int, b: Int): Int {
    return a + b;
}
```

**基本写法：表达式函数体**
`fun <name>(<params>): <ReturnType> = <expr>`
```kotlin
// 表达式函数体
fun add(a: Int, b: Int): Int = a + b;
```

**基本写法：表达式函数体类型推断**
`fun <name>(<params>) = <expr>`
```kotlin
// 返回类型推断为 Int
fun add(a: Int, b: Int) = a + b;
```

**基本写法：Unit 无返回值函数**
`fun <name>(<params>): Unit { <body> }`
```kotlin
// 无返回值（Unit）
fun greet(name: String): Unit {
    println("Hello, $name!");
}
```

**基本写法：省略 Unit 的无返回值函数**
`fun <name>(<params>) { <body> }`
```kotlin
// Unit 可省略
fun greet(name: String) {
    println("Hello, $name!");
}
```

**单行写法：默认参数函数**
`fun <name>(<param1>: <Type>, <param2>: <Type> = <default>): <ReturnType>`
```kotlin
// 单行声明带默认参数的函数
fun connect(host: String, port: Int = 8080): String = "$host:$port";
```

**换行写法：多默认参数函数**
`fun <name>(<param1>: <Type>, <param2>: <Type> = <default>, <param3>: <Type> = <default>): <ReturnType>`
```kotlin
// 换行声明多个默认参数
fun connect(
    host: String,
    port: Int = 8080,
    timeout: Int = 5000
): String {
    return "$host:$port (timeout: ${timeout}ms)";
}
```

**基本写法：命名参数调用**
`<name>(<arg> = <value>)`
```kotlin
// 使用命名参数跳过中间参数
createUser("Alice", email = "alice@example.com");
```

**基本写法：可变参数函数**
`fun <name>(vararg <params>: <Type>): <ReturnType>`
```kotlin
// 可变参数函数
fun sum(vararg numbers: Int): Int {
    return numbers.sum();
}
```

**基本写法：展开数组调用可变参数**
`<name>(*<array>)`
```kotlin
// 使用 * 展开运算符
val array = intArrayOf(1, 2, 3);
sum(*array);
```

**基本写法：尾递归函数**
`tailrec fun <name>(<params>): <ReturnType>`
```kotlin
// 尾递归函数，避免栈溢出
tailrec fun factorial(n: Long, acc: Long = 1): Long {
    return if (n <= 1) acc else factorial(n - 1, acc * n);
}
```

---

## 扩展函数

**基本写法：为类添加扩展函数**
`fun <ReceiverType>.<name>(<params>): <ReturnType>`
```kotlin
// 为 String 添加扩展函数
fun String.addExclamation(): String = this + "!";
```

**基本写法：为 Int 添加扩展函数**
`fun Int.<name>(): <ReturnType>`
```kotlin
// 为 Int 添加扩展
fun Int.isEven(): Boolean = this % 2 == 0;
```

**基本写法：可空接收者扩展**
`fun <ReceiverType>?.<name>(<params>): <ReturnType>`
```kotlin
// 可空接收者，在函数内部处理 null
fun String?.isNullOrEmpty(): Boolean = this == null || this.isEmpty();
```

**基本写法：只读扩展属性**
`val <ReceiverType>.<name>: <Type> get() = <expr>`
```kotlin
// 为 String 添加只读扩展属性
val String.halfLength: Int
    get() = this.length / 2;
```

**换行写法：可变扩展属性**
`var <ReceiverType>.<name>: <Type> [get() = <expr>] [set(value) { <body> }]`
```kotlin
// 为 StringBuilder 添加可变扩展属性
var StringBuilder.lastChar: Char
    get() = this[this.length - 1]
    set(value) { this.append(value); }
```

**基本写法：扩展函数静态解析**
`fun <BaseType>.<name>() = <expr>`
```kotlin
// 扩展函数静态解析，由声明类型决定
open class Animal;
class Dog : Animal();
fun Animal.sound() = "Generic sound";
fun Dog.sound() = "Woof";
val animal: Animal = Dog();
animal.sound();  // "Generic sound"
```

---

## Lambda 表达式

**基本写法：完整语法 Lambda**
`val <name>: (<ParamTypes>) -> <ReturnType> = { <params> -> <body> }`
```kotlin
// 完整语法
val sum: (Int, Int) -> Int = { a: Int, b: Int -> a + b };
```

**基本写法：类型推断 Lambda**
`val <name> = { <params> -> <body> }`
```kotlin
// 类型推断
val sum = { a: Int, b: Int -> a + b };
```

**基本写法：指定类型省略参数类型**
`val <name>: (<ParamTypes>) -> <ReturnType> = { <params> -> <body> }`
```kotlin
// 指定函数类型，省略参数类型
val sum: (Int, Int) -> Int = { a, b -> a + b };
```

**基本写法：it 隐式参数**
`{ <body using it> }`
```kotlin
// 单参数 Lambda 用 it 代替
val square: (Int) -> Int = { it * it };
```

**基本写法：filter 过滤**
`<collection>.filter { <predicate> }`
```kotlin
// filter 过滤集合
val numbers = listOf(1, 2, 3, 4, 5);
numbers.filter { it > 3 };
```

**基本写法：map 映射**
`<collection>.map { <transform> }`
```kotlin
// map 映射集合元素
numbers.map { it * 2 };
```

**基本写法：forEach 遍历**
`<collection>.forEach { <body> }`
```kotlin
// forEach 遍历集合
numbers.forEach { println(it); }
```

**基本写法：fold 累积**
`<collection>.fold(<init>) { <acc>, <item> -> <body> }`
```kotlin
// fold 带初始值累积
val sum = numbers.fold(0) { acc, num -> acc + num };
```

**基本写法：groupBy 分组**
`<collection>.groupBy { <keySelector> }`
```kotlin
// groupBy 按条件分组
val grouped = numbers.groupBy { if (it % 2 == 0) "even" else "odd" };
```

---

## 高阶函数

**基本写法：函数作为参数**
`fun <name>(<param>: (<Type>) -> <ReturnType>): <ReturnType>`
```kotlin
// 接受函数作为参数
fun <T> List<T>.customFilter(predicate: (T) -> Boolean): List<T> {
    val result = mutableListOf<T>();
    for (item in this) {
        if (predicate(item)) result.add(item);
    }
    return result;
}
```

**基本写法：函数作为返回值**
`fun <name>(<params>): (<Type>) -> <ReturnType>`
```kotlin
// 返回函数
fun multiplier(factor: Int): (Int) -> Int = { number -> number * factor };
```

**基本写法：无参函数类型**
`val <name>: () -> <ReturnType> = { <body> }`
```kotlin
// 无参函数类型
val f1: () -> Unit = { println("No params"); };
```

**基本写法：带参函数类型**
`val <name>: (<Type>) -> <ReturnType> = { <body> }`
```kotlin
// 带参函数类型
val f2: (Int) -> String = { "Number: $it" };
```

**基本写法：带接收者的函数类型**
`val <name>: <ReceiverType>.(<Type>) -> <ReturnType> = { <body> }`
```kotlin
// 带接收者的函数类型
val f4: String.(Int) -> String = { this.repeat(it) };
```

**基本写法：匿名函数**
`val <name> = fun(<params>): <ReturnType> = <expr>`
```kotlin
// 匿名函数
val f5 = fun(a: Int, b: Int): Int = a + b;
```

**基本写法：also 执行附加操作**
`<obj>.also { <body with it> }`
```kotlin
// also 返回原对象
val user = User("Alice", 25).also {
    println("Created: $it");
};
```

**基本写法：apply 配置对象**
`<obj>.apply { <body with this> }`
```kotlin
// apply 返回原对象
val builder = StringBuilder().apply {
    append("Hello");
    append(", Kotlin");
};
```

**基本写法：let 转换对象**
`<obj>.let { <body with it> }`
```kotlin
// let 返回 Lambda 结果
val length = "Kotlin".let { it.length };
```

**基本写法：run 执行代码块**
`<obj>.run { <body with this> }`
```kotlin
// run 返回 Lambda 结果
val result = "Kotlin".run { length };
```

**基本写法：with 执行多个操作**
`with(<obj>) { <body with this> }`
```kotlin
// with 非扩展版本
val greeting = with(StringBuilder()) {
    append("Hello");
    append(", Kotlin");
    toString();
};
```

---

## 内联函数

**基本写法：inline 内联函数**
`inline fun <name>(<params>): <ReturnType>`
```kotlin
// inline 关键字内联函数
inline fun <T> measureTime(block: () -> T): T {
    val start = System.currentTimeMillis();
    val result = block();
    val end = System.currentTimeMillis();
    println("Execution time: ${end - start}ms");
    return result;
}
```

**换行写法：noinline 与 crossinline**
`inline fun <name>(<param1>: () -> Unit, noinline <param2>: () -> Unit)`
```kotlin
// noinline 禁止内联，crossinline 禁止非局部返回
inline fun process(
    inlineBlock: () -> Unit,
    noinline notInlined: () -> Unit
) {
    inlineBlock();
    notInlined();
}
```

**基本写法：crossinline 禁止非局部返回**
`inline fun <name>(crossinline <param>: () -> Unit)`
```kotlin
// crossinline 允许内联但禁止非局部返回
inline fun runInThread(crossinline action: () -> Unit) {
    Thread { action(); }.start();
}
```

**基本写法：非局部返回**
`<collection>.forEach { if (<cond>) return; <body> }`
```kotlin
// 非局部返回，退出外层函数
fun processElements(elements: List<Int>) {
    elements.forEach {
        if (it == 0) return;
        println(it);
    }
}
```

---

## SAM 转换

**基本写法：Java SAM 接口转换**
`<obj>.setListener { <param> -> <body> }`
```kotlin
// SAM 转换简化 Java 接口实现
button.setOnClickListener { view ->
    println("Clicked: $view");
}
```

**基本写法：Kotlin 函数式接口**
`fun interface <Name> { fun <method>(<params>): <ReturnType> }`
```kotlin
// fun interface 声明
fun interface Producer<T> {
    fun produce(): T;
}
```

**基本写法：函数式接口实例化**
`val <name> = <Interface> { <body> }`
```kotlin
// 函数式接口实例化
val producer = Producer { "Hello" };
```

**单行写法：多类型参数函数式接口**
`fun interface <Name><<T1>, <T2>> { fun <method>(<param>: <T1>): <T2> }`
```kotlin
// 多类型参数函数式接口
fun interface Transformer<T, R> {
    fun transform(input: T): R;
}
```

---

## 作用域函数对比

**基本写法：apply 配置并返回对象**
`<obj>.apply { <body with this> }`
```kotlin
// apply 典型场景：配置对象
val person = Person().apply {
    name = "Alice";
    age = 25;
};
```

**基本写法：also 附加操作并返回对象**
`<obj>.also { <body with it> }`
```kotlin
// also 典型场景：日志记录
val logged = person.also {
    println("Created person: $it");
};
```

**基本写法：let 转换并返回结果**
`<obj>.let { <body with it> }`
```kotlin
// let 典型场景：转换
val nameLength = person.let { it.name.length };
```
