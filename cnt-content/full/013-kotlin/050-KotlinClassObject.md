---
order: 50
title: Kotlin 类与对象
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: 类定义、构造函数、继承、接口、数据类、密封类、枚举与伴生对象。
author: fanquanpp
updated: '2026-11-16'
related:
  - 'kotlin/030-KotlinBasicSyntax'
  - 'kotlin/040-KotlinFunctionAndLambda'
  - 'kotlin/170-KotlinGenericTypeSystem'
  - 'kotlin/120-KotlinCollectionCoroutine'
prerequisites: []
---

## 前置知识

- [Kotlin 函数与 Lambda](/kotlin/040-KotlinFunctionAndLambda)：建议先完成前一篇的学习

## 学习目标

- 能写出带自定义 getter/setter 的属性，并说清 `field`（幕后字段）为什么能避免 setter 递归
- 能区分主构造函数与次构造函数，说出次构造函数必须 `this(...)` 委托的原因
- 能解释 Kotlin 类默认 `final` 的设计动机，以及 `open`/`abstract`/`sealed` 各自放开了什么
- 能用 `data class` 与 `sealed class`/`sealed interface` 建模「值对象 + 受限继承」，并知道 `when` 穷尽匹配的前提
- 能选择 `companion object`、`object` 声明与对象表达式，并用 `by` 做类委托

## 为什么值得单独一篇

Java 的类语法把「怎么写」和「怎么设计」混在一起：构造器样板、getter/setter 样板、equals/hashCode 样板、单例样板都要手写。Kotlin 的做法是把常见设计意图**编译成语言能力**——主构造函数直接声明属性、`data class` 自动生成值语义、`object` 一行单例、`by` 一行委托。这一篇的主线是「每个关键字替你省掉了哪一类样板」，代码只展示触发点，生成物用 [Kotlin 数据类详解](/kotlin/060-KotlinDataClassDeepDive) 的反编译视角去看。

## 1. 类定义

### 1.1 基本类

```kotlin
class Person {
    var name: String = ""
    var age: Int = 0

    fun introduce() {
        println("Hi, I'm $name, $age years old.")
    }
}

// 使用
val person = Person()
person.name = "Alice"
person.age = 25
person.introduce()
```

### 1.2 属性与字段

```kotlin
class User {
    // 可变属性
    var name: String = "Unknown"
        get() = field.uppercase()       // 自定义 getter
        set(value) { field = value.trim() }  // 自定义 setter

    // 只读属性
    val createdAt: Long = System.currentTimeMillis()

    // 编译期常量
    companion object {
        const val MAX_AGE = 150
    }
}
```

Kotlin 属性背后使用**幕后字段**（backing field），通过 `field` 关键字访问：

```kotlin
class Temperature {
    var celsius: Double = 0.0
        set(value) {
            field = value
            // field 就是幕后字段，避免递归调用 setter
        }

    val fahrenheit: Double
        get() = celsius * 9 / 5 + 32
}
```

### 1.3 延迟初始化属性

```kotlin
class Service {
    lateinit var repository: Repository

    fun init() {
        repository = Repository()
    }

    fun process() {
        if (::repository.isInitialized) {
            repository.query()
        }
    }
}
```

## 2. 构造函数

### 2.1 主构造函数

```kotlin
// 主构造函数在类头部声明
class Person(val name: String, val age: Int)

// 等价于
class Person constructor(val name: String, val age: Int)

// 使用
val person = Person("Alice", 25)
```

### 2.2 init 块

主构造函数不能包含代码，初始化逻辑放在 `init` 块中：

```kotlin
class Person(val name: String, val age: Int) {
    init {
        require(age >= 0) { "Age cannot be negative" }
        println("Person created: $name, $age")
    }

    // 属性也可以在声明时初始化
    val isAdult: Boolean = age >= 18
}
```

### 2.3 次构造函数

```kotlin
class Person(val name: String, val age: Int) {
    // 次构造函数必须委托给主构造函数
    constructor(name: String) : this(name, 0)

    constructor() : this("Unknown", 0)

    override fun toString(): String = "Person(name=$name, age=$age)"
}

Person("Alice", 25)  // 主构造
Person("Bob")        // 次构造，age=0
Person()             // 次构造，name="Unknown", age=0
```

### 2.4 私有主构造函数

```kotlin
class Singleton private constructor() {
    companion object {
        val instance: Singleton by lazy { Singleton() }
    }
}
```

## 3. 继承

Kotlin 中类默认是 `final` 的，必须使用 `open` 修饰才可被继承：

```kotlin
open class Animal(val name: String) {
    open fun sound() = "Some sound"

    fun description() = "Animal: $name"  // 不可重写（默认 final）
}

class Dog(name: String) : Animal(name) {
    override fun sound() = "Woof"
}

class Cat(name: String) : Animal(name) {
    override fun sound() = "Meow"
}
```

### 3.1 属性重写

```kotlin
open class Base {
    open val value: Int = 0
}

class Derived : Base() {
    override val value: Int = 42  // 重写属性
}

// 主构造函数中的属性也可以重写
class Derived2(override val value: Int) : Base()
```

### 3.2 调用父类实现

```kotlin
open class View {
    open fun draw() {
        println("Drawing view")
    }
}

class Button : View() {
    override fun draw() {
        super.draw()  // 调用父类实现
        println("Drawing button")
    }
}
```

## 4. 抽象类

```kotlin
abstract class Shape {
    abstract val area: Double          // 抽象属性
    abstract fun perimeter(): Double   // 抽象方法

    fun describe() = "Area: $area, Perimeter: ${perimeter()}"
}

class Circle(val radius: Double) : Shape() {
    override val area: Double = Math.PI * radius * radius
    override fun perimeter(): Double = 2 * Math.PI * radius
}

class Rectangle(val width: Double, val height: Double) : Shape() {
    override val area: Double = width * height
    override fun perimeter(): Double = 2 * (width + height)
}
```

## 5. 接口

Kotlin 接口可以包含抽象方法、具体方法和属性：

```kotlin
interface Clickable {
    fun click()                    // 抽象方法
    fun showOff() = "Clickable!"   // 带默认实现的方法
}

interface Focusable {
    fun setFocus(focused: Boolean)
    fun showOff() = "Focusable!"   // 同名默认实现
}

// 实现多个接口，解决冲突
class Button : Clickable, Focusable {
    override fun click() = println("Button clicked")
    override fun setFocus(focused: Boolean) = println("Focus: $focused")

    // 必须显式覆盖冲突的默认实现
    override fun showOff(): String {
        return super<Clickable>.showOff() + " & " + super<Focusable>.showOff()
    }
}
```

### 5.1 接口中的属性

```kotlin
interface Config {
    val host: String           // 抽象属性
    val port: Int              // 抽象属性
    val url: String            // 抽象属性
        get() = "$host:$port"  // 可提供默认 getter

    // val timeout: Int = 5000  // 编译错误：接口中不能有幕后字段
}

class ServerConfig(override val host: String, override val port: Int) : Config
```

## 6. 数据类

`data class` 自动生成 `equals()`、`hashCode()`、`toString()`、`copy()` 和 `componentN()` 函数：

```kotlin
data class User(val name: String, val age: Int, val email: String)

val user1 = User("Alice", 25, "alice@example.com")
val user2 = User("Alice", 25, "alice@example.com")

user1 == user2           // true（基于属性值比较）
user1.hashCode() == user2.hashCode()  // true
println(user1)           // User(name=Alice, age=25, email=alice@example.com)

// copy — 创建副本并修改部分属性
val user3 = user1.copy(age = 26, email = "new@example.com")

// 解构声明
val (name, age, email) = user1
```

### 6.1 数据类要求

- 主构造函数必须至少有一个参数
- 主构造函数参数必须标记为 `val` 或 `var`
- 不能是 `abstract`、`open`、`sealed` 或 `inner`

## 7. 密封类

密封类限制类的继承层次：所有直接子类必须与密封类在**同一个模块、同一个包**中声明（Kotlin 1.5 起放宽为同包同模块，不再要求同一文件）：

```kotlin
sealed class Result<out T> {
    data class Success<T>(val value: T) : Result<T>()
    data class Error(val message: String, val code: Int) : Result<Nothing>()
    object Loading : Result<Nothing>()
}

fun handleResult(result: Result<Int>) = when (result) {
    is Result.Success -> println("Success: ${result.value}")
    is Result.Error -> println("Error: ${result.message}")
    Result.Loading -> println("Loading...")
    // 不需要 else 分支 — 编译器确保覆盖所有子类
}
```

### 7.1 密封接口（Kotlin 1.5+）

```kotlin
sealed interface Action
sealed interface Readable : Action { val content: String }
sealed interface Writable : Action { fun write(text: String) }

data class ReadAction(override val content: String) : Readable
data class WriteAction(val buffer: StringBuilder) : Writable {
    override fun write(text: String) { buffer.append(text) }
}
```

## 8. 枚举类

```kotlin
enum class Direction {
    NORTH, SOUTH, EAST, WEST
}

// 带属性的枚举
enum class Planet(val mass: Double, val radius: Double) {
    EARTH(5.97e24, 6371.0),
    MARS(6.42e23, 3390.0),
    JUPITER(1.90e27, 69911.0);

    val surfaceGravity: Double
        get() = 6.67e-11 * mass / (radius * radius * 1e6)

    fun surfaceWeight(mass: Double): Double = mass * surfaceGravity
}

// 枚举实现接口
enum class Format : Runnable {
    JSON {
        override fun run() = println("Formatting as JSON")
    },
    XML {
        override fun run() = println("Formatting as XML")
    }
}
```

### 8.1 枚举常用操作

```kotlin
Direction.values()             // [NORTH, SOUTH, EAST, WEST]
Direction.valueOf("NORTH")     // NORTH
Direction.NORTH.name          // "NORTH"
Direction.NORTH.ordinal       // 0
Direction.entries              // Kotlin 1.9+，替代 values()
```

## 9. 伴生对象

Kotlin 没有 `static` 关键字，使用 `companion object` 替代：

```kotlin
class MyClass {
    companion object {
        const val CONSTANT = "Hello"
        private var instanceCount = 0

        fun create(): MyClass {
            instanceCount++
            return MyClass()
        }
    }
}

MyClass.CONSTANT     // 通过类名访问
MyClass.create()     // 调用伴生对象方法
```

### 9.1 伴生对象实现接口

```kotlin
interface Factory<T> {
    fun create(): T
}

class Product(val name: String) {
    companion object : Factory<Product> {
        override fun create(): Product = Product("Default")
    }
}

val product = Product.create()
```

### 9.2 伴生对象扩展

```kotlin
class Product(val name: String) {
    companion object
}

// 为伴生对象添加扩展函数
fun Product.Companion.fromJson(json: String): Product {
    return Product(json)
}

val product = Product.fromJson("{\"name\":\"Widget\"}")
```

## 10. 对象表达式与声明

### 10.1 对象表达式（匿名内部类）

```kotlin
// 替代 Java 匿名内部类
window.addMouseListener(object : MouseAdapter() {
    override fun mouseClicked(e: MouseEvent) {
        println("Clicked at ${e.point}")
    }
})

// 实现多个接口
val obj = object : Clickable, Focusable {
    override fun click() = println("Clicked")
    override fun setFocus(focused: Boolean) = println("Focus: $focused")
}

// 简单对象表达式（无继承）
val config = object {
    val host = "localhost"
    val port = 8080
}
```

### 10.2 对象声明（单例）

```kotlin
object Database {
    private val tables = mutableMapOf<String, String>()

    fun addTable(name: String, schema: String) {
        tables[name] = schema
    }

    fun getSchema(name: String): String? = tables[name]
}

Database.addTable("users", "id INT, name VARCHAR")
Database.getSchema("users")
```

### 10.3 嵌套对象

```kotlin
class Outer {
    object Nested {
        fun greet() = "Hello from Nested"
    }

    inner class Inner {
        // 可以访问 Outer 的成员
        fun greet() = "Hello from Inner"
    }
}

Outer.Nested.greet()   // 直接通过类名访问
Outer().Inner().greet()  // 需要外部类实例
```

## 11. 委托

### 11.1 类委托

```kotlin
interface Repository {
    fun findAll(): List<String>
}

class DefaultRepository : Repository {
    override fun findAll() = listOf("item1", "item2")
}

// 通过委托实现装饰器模式
class LoggingRepository(private val repo: Repository) : Repository by repo {
    override fun findAll(): List<String> {
        println("Finding all items...")
        return repo.findAll().also { println("Found ${it.size} items") }
    }
}
```

### 11.2 属性委托

```kotlin
import kotlin.properties.Delegates

class Config {
    // observable — 属性变化时回调
    var name: String by Delegates.observable("initial") { _, old, new ->
        println("Name changed from $old to $new")
    }

    // vetoable — 可否决属性变化
    var age: Int by Delegates.vetoable(0) { _, _, new ->
        new >= 0  // 只允许非负值
    }

    // lazy — 延迟初始化
    val heavyData: List<String> by lazy {
        println("Computing...")
        (1..1000).map { "Item $it" }
    }
}
```

### 11.3 自定义属性委托

```kotlin
import kotlin.reflect.KProperty

class Preference<T>(private val key: String, private val default: T) {
    private val prefs: Map<String, Any> = mutableMapOf()  // 简化示例

    operator fun getValue(thisRef: Any?, property: KProperty<*>): T {
        @Suppress("UNCHECKED_CAST")
        return prefs[key] as? T ?: default
    }

    operator fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        (prefs as MutableMap)[key] = value as Any
    }
}

class Settings {
    var theme: String by Preference("theme", "dark")
    var fontSize: Int by Preference("fontSize", 14)
}
```
## 小练习（先自己做，再展开参考实现）

**练习 1：属性与幕后字段**。写一个 `class Grade`，属性 `score: Int`（0 到 100，setter 里做范围钳制），只读属性 `passed: Boolean`（score >= 60 时为真）。要求 setter 用 `field` 完成，不用 `score = ...` 自赋值。

参考实现：

```kotlin
class Grade {
    var score: Int = 0
        set(value) { field = value.coerceIn(0, 100) }

    val passed: Boolean
        get() = score >= 60
}
```

自检问题：setter 里若写成 `score = value.coerceIn(0, 100)` 会发生什么？（答：`score = ...` 会再次调用 setter 自己，形成无限递归直到栈溢出；`field` 指向编译器生成的幕后字段，绕过自定义 setter——这就是它的存在理由。）

**练习 2：默认 final 的设计**。不运行，判断下面三处分别能不能编译：

```kotlin
class A
class B : A()                    // (1)
open class C { fun f() {} }
class D : C() { override fun f() {} }   // (2)
open class E { open fun f() {} }
class F : E() { override fun f() {} }   // (3)
```

参考答案：(1) 编译失败——`A` 默认 `final`，不可继承；(2) 编译失败——`C` 可以继承，但 `f()` 没标 `open`，不可重写；(3) 通过。设计动机：默认 `final` 让「哪些行为允许被改」成为作者显式的决定，这是 Effective Java「要么为继承设计并文档化，要么禁止继承」的语法化。

**练习 3：when 穷尽匹配的前提**。把上一节 `Result<Int>` 的 `handleResult` 里 `Result.Loading` 分支删掉，编译器报什么错？如果 `Result` 从 `sealed class` 改成普通 `open class`，`when` 又会怎样？

参考答案：报「when 表达式必须穷尽所有分支」（`'when' expression must be exhaustive`）。改成普通 `open class` 后，编译器无法静态枚举所有子类，`when` 必须补 `else` 分支——穷尽匹配是密封继承层次换来的编译期保证，子类一旦加了新分支，所有漏掉的 `when` 会立刻编译报错而不是静默漏判。

**练习 4：委托的一行样板**。给 `interface Log { fun info(msg: String) }` 与已有实现 `FileLog : Log`，写一个 `AuditedLog`：调用 `info` 前先打一条审计日志，其余行为不变。

参考实现：

```kotlin
interface Log { fun info(msg: String) }

class FileLog : Log {
    override fun info(msg: String) = println("[file] $msg")
}

class AuditedLog(private val inner: Log) : Log by inner {
    override fun info(msg: String) {
        println("[audit] info called")
        inner.info(msg)
    }
}
```

自检问题：`Log by inner` 生成的转发方法覆盖了哪些成员？（答：接口的全部成员——编译器替你写完手写装饰器里那些「只调用 inner 同名方法」的样板，你只需要 override 真正要改的 `info`。）
