---
order: 50
title: Kotlin 类与对象
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: 类定义、构造函数、继承、接口、数据类、密封类、枚举与伴生对象。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'kotlin/003-KotlinBasicSyntax'
  - 'kotlin/004-KotlinFunctionAndLambda'
  - 'kotlin/007-KotlinGenericTypeSystem'
  - 'kotlin/008-KotlinCollectionCoroutine'
prerequisites: []
---

## 前置知识

- [Kotlin 函数与 Lambda](/kotlin/004-KotlinFunctionAndLambda)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 类定义」的核心机制、典型用法与常见陷阱
- 掌握「2. 构造函数」的核心机制、典型用法与常见陷阱
- 掌握「3. 继承」的核心机制、典型用法与常见陷阱
- 掌握「4. 抽象类」的核心机制、典型用法与常见陷阱
- 掌握「5. 接口」的核心机制、典型用法与常见陷阱


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

密封类限制类的继承层次，所有子类必须在同一文件中声明：

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
## 类定义

**基本写法：基本类定义**
`class <Name> { <body> }`
```kotlin
// 基本类定义
class Person {
    var name: String = "";
    var age: Int = 0;
}
```

**基本写法：可变属性与自定义 getter**
`var <name>: <Type> = <init> get() = <expr>`
```kotlin
// 可变属性自定义 getter
class User {
    var name: String = "Unknown"
        get() = field.uppercase();
}
```

**基本写法：可变属性与自定义 setter**
`var <name>: <Type> = <init> set(value) { field = <expr> }`
```kotlin
// 可变属性自定义 setter
class User {
    var name: String = "Unknown"
        set(value) { field = value.trim(); }
}
```

**基本写法：只读属性**
`val <name>: <Type> = <init>`
```kotlin
// 只读属性
class User {
    val createdAt: Long = System.currentTimeMillis();
}
```

**基本写法：幕后字段**
`set(value) { field = <expr> }`
```kotlin
// field 引用幕后字段，避免递归调用 setter
class Temperature {
    var celsius: Double = 0.0
        set(value) {
            field = value;
        }
}
```

**基本写法：lateinit 延迟初始化属性**
`lateinit var <name>: <Type>`
```kotlin
// lateinit 延迟初始化
class Service {
    lateinit var repository: Repository;
    fun init() {
        repository = Repository();
    }
}
```

**基本写法：检查 lateinit 是否初始化**
`::<name>.isInitialized`
```kotlin
// 检查 lateinit 属性是否已初始化
if (::repository.isInitialized) {
    repository.query();
}
```

---

## 构造函数

**单行写法：主构造函数**
`class <Name>(val <prop>: <Type>, val <prop2>: <Type>)`
```kotlin
// 单行主构造函数声明属性
class Person(val name: String, val age: Int);
```

**单行写法：constructor 关键字主构造函数**
`class <Name> constructor(val <prop>: <Type>)`
```kotlin
// 显式 constructor 关键字
class Person constructor(val name: String, val age: Int);
```

**换行写法：多参数主构造函数**
`class <Name>(val <prop1>: <Type>, val <prop2>: <Type>, val <prop3>: <Type>)`
```kotlin
// 换行声明多参数主构造函数
class Person(
    val name: String,
    val age: Int,
    val email: String
);
```

**基本写法：init 块**
`init { <body> }`
```kotlin
// init 块执行初始化逻辑
class Person(val name: String, val age: Int) {
    init {
        require(age >= 0) { "Age cannot be negative" };
    }
}
```

**基本写法：次构造函数**
`constructor(<params>) : this(<args>)`
```kotlin
// 次构造函数委托给主构造函数
class Person(val name: String, val age: Int) {
    constructor(name: String) : this(name, 0);
}
```

**基本写法：私有主构造函数**
`class <Name> private constructor() { <body> }`
```kotlin
// 私有主构造函数实现单例
class Singleton private constructor() {
    companion object {
        val instance: Singleton by lazy { Singleton(); }
    }
}
```

---

## 继承

**基本写法：open 类继承**
`open class <Name>(<params>) { open fun <name>(): <ReturnType> }`
```kotlin
// open 修饰类允许继承
open class Animal(val name: String) {
    open fun sound() = "Some sound";
}
```

**基本写法：子类继承**
`class <SubName>(<params>) : <BaseName>(<args>) { override fun <name>(): <ReturnType> }`
```kotlin
// 子类重写方法
class Dog(name: String) : Animal(name) {
    override fun sound() = "Woof";
}
```

**基本写法：属性重写**
`override val <name>: <Type> = <value>`
```kotlin
// 重写父类属性
open class Base {
    open val value: Int = 0;
}
class Derived : Base() {
    override val value: Int = 42;
}
```

**基本写法：主构造函数属性重写**
`class <SubName>(override val <prop>: <Type>) : <BaseName>()`
```kotlin
// 主构造函数中重写属性
class Derived2(override val value: Int) : Base();
```

**基本写法：调用父类实现**
`super.<method>()`
```kotlin
// 调用父类方法
class Button : View() {
    override fun draw() {
        super.draw();
        println("Drawing button");
    }
}
```

---

## 抽象类

**基本写法：抽象类定义**
`abstract class <Name> { abstract fun <name>(): <ReturnType> }`
```kotlin
// 抽象类定义抽象方法
abstract class Shape {
    abstract fun perimeter(): Double;
}
```

**基本写法：抽象属性**
`abstract class <Name> { abstract val <prop>: <Type> }`
```kotlin
// 抽象类定义抽象属性
abstract class Shape {
    abstract val area: Double;
}
```

**基本写法：抽象类实现**
`class <SubName>(<params>) : <BaseName>() { override val <prop>: <Type> = <value> }`
```kotlin
// 实现抽象类
class Circle(val radius: Double) : Shape() {
    override val area: Double = Math.PI * radius * radius;
    override fun perimeter(): Double = 2 * Math.PI * radius;
}
```

---

## 接口

**基本写法：接口定义**
`interface <Name> { fun <method>(<params>): <ReturnType> }`
```kotlin
// 接口定义抽象方法
interface Clickable {
    fun click();
}
```

**基本写法：接口默认实现**
`interface <Name> { fun <method>(): <ReturnType> = <expr> }`
```kotlin
// 接口方法默认实现
interface Clickable {
    fun showOff() = "Clickable!";
}
```

**换行写法：实现多个接口**
`class <Name> : <Interface1>, <Interface2> { override fun <method> }`
```kotlin
// 实现多个接口并解决冲突
class Button : Clickable, Focusable {
    override fun click() = println("Button clicked");
    override fun showOff(): String {
        return super<Clickable>.showOff() + " & " + super<Focusable>.showOff();
    }
}
```

**基本写法：接口中的属性**
`interface <Name> { val <prop>: <Type> }`
```kotlin
// 接口定义抽象属性
interface Config {
    val host: String;
    val port: Int;
}
```

**基本写法：接口属性默认 getter**
`interface <Name> { val <prop>: <Type> get() = <expr> }`
```kotlin
// 接口属性提供默认 getter
interface Config {
    val url: String
        get() = "$host:$port";
}
```

---

## 数据类

**单行写法：data class**
`data class <Name>(val <prop>: <Type>, val <prop2>: <Type>)`
```kotlin
// 单行数据类
data class User(val name: String, val age: Int);
```

**换行写法：多参数 data class**
`data class <Name>(val <prop1>: <Type>, val <prop2>: <Type>, val <prop3>: <Type>)`
```kotlin
// 换行声明多参数数据类
data class User(
    val name: String,
    val age: Int,
    val email: String
);
```

**基本写法：copy 复制并修改**
`<obj>.copy(<prop> = <value>)`
```kotlin
// copy 创建副本并修改部分属性
val user3 = user1.copy(age = 26);
```

**基本写法：解构声明**
`val (<a>, <b>, <c>) = <obj>`
```kotlin
// 解构声明提取属性
val (name, age, email) = user1;
```

---

## 密封类

**基本写法：密封类定义**
`sealed class <Name> { <subclasses> }`
```kotlin
// 密封类定义子类
sealed class Result<out T> {
    data class Success<T>(val value: T) : Result<T>();
    object Loading : Result<Nothing>();
}
```

**基本写法：when 穷举密封类**
`fun <name>(<param>: <SealedClass>) = when (<param>) { is <Type> -> <expr> }`
```kotlin
// when 穷举所有子类，无需 else
fun handle(result: Result<Int>) = when (result) {
    is Result.Success -> println("Success: ${result.value}");
    Result.Loading -> println("Loading...");
}
```

**基本写法：密封接口定义**
`sealed interface <Name>`
```kotlin
// 密封接口定义
sealed interface Action {
    data class Click(val x: Int, val y: Int) : Action;
    object Idle : Action;
}
```

**基本写法：密封接口组合**
`sealed interface <Name> : <Other>`
```kotlin
// 密封接口继承其他密封接口
sealed interface Drawable {
    fun draw();
}
```

---

## 枚举类

**单行写法：枚举定义**
`enum class <Name> { <VALUES> }`
```kotlin
// 单行枚举定义
enum class Direction {
    NORTH, SOUTH, EAST, WEST
}
```

**换行写法：带属性的枚举**
`enum class <Name>(val <prop>: <Type>) { <VALUE>(<args>), ... }`
```kotlin
// 换行声明带属性的枚举
enum class Planet(val mass: Double, val radius: Double) {
    EARTH(5.97e24, 6371.0),
    MARS(6.42e23, 3390.0),
    JUPITER(1.90e27, 69911.0)
}
```

**基本写法：枚举实现接口**
`enum class <Name> : <Interface> { <VALUE> { override fun <method>() } }`
```kotlin
// 枚举实现接口
enum class Format : Runnable {
    JSON {
        override fun run() = println("Formatting as JSON");
    }
}
```

**基本写法：枚举 values 获取所有值**
`<EnumClass>.values()`
```kotlin
// 获取所有枚举值
Direction.values();
```

**基本写法：枚举 valueOf 根据名称获取**
`<EnumClass>.valueOf("<name>")`
```kotlin
// 根据名称获取枚举值
Direction.valueOf("NORTH");
```

**基本写法：枚举 name 属性**
`<EnumValue>.name`
```kotlin
// 获取枚举值名称
Direction.NORTH.name;
```

**基本写法：枚举 ordinal 属性**
`<EnumValue>.ordinal`
```kotlin
// 获取枚举值序号
Direction.NORTH.ordinal;
```

---

## 伴生对象

**基本写法：companion object**
`class <Name> { companion object { <members> } }`
```kotlin
// 伴生对象定义静态成员
class MyClass {
    companion object {
        const val CONSTANT = "Hello";
        fun create(): MyClass = MyClass();
    }
}
```

**基本写法：伴生对象实现接口**
`companion object : <Interface> { override fun <method>(): <ReturnType> }`
```kotlin
// 伴生对象实现工厂接口
class Product(val name: String) {
    companion object : Factory<Product> {
        override fun create(): Product = Product("Default");
    }
}
```

**基本写法：伴生对象扩展**
`fun <Class>.Companion.<name>(<params>): <ReturnType>`
```kotlin
// 为伴生对象添加扩展函数
fun Product.Companion.fromJson(json: String): Product {
    return Product(json);
}
```

---

## 对象表达式与声明

**基本写法：对象表达式**
`object : <Class>(), <Interface> { <overrides> }`
```kotlin
// 对象表达式替代匿名内部类
window.addMouseListener(object : MouseAdapter() {
    override fun mouseClicked(e: MouseEvent) {
        println("Clicked at ${e.point}");
    }
})
```

**基本写法：简单对象表达式**
`val <name> = object { <members> }`
```kotlin
// 无继承的简单对象表达式
val config = object {
    val host = "localhost";
    val port = 8080;
}
```

**基本写法：对象声明（单例）**
`object <Name> { <body> }`
```kotlin
// 对象声明实现单例
object Database {
    fun getSchema(name: String): String? = tables[name];
}
```

**基本写法：嵌套对象**
`class <Outer> { object <Nested> { <body> } }`
```kotlin
// 嵌套对象（静态内部类）
class Outer {
    object Nested {
        fun greet() = "Hello from Nested";
    }
}
```

**基本写法：内部类**
`class <Outer> { inner class <Inner> { <body> } }`
```kotlin
// inner class 内部类（持有外部类引用）
class Outer {
    inner class Inner {
        fun greet() = "Hello from Inner";
    }
}
```

---

## 委托

**基本写法：类委托**
`class <Name>(<val delegate>: <Interface>) : <Interface> by <delegate>`
```kotlin
// 类委托实现装饰器模式
class LoggingRepository(private val repo: Repository) : Repository by repo {
    override fun findAll(): List<String> {
        println("Finding all items...");
        return repo.findAll();
    }
}
```

**基本写法：observable 属性委托**
`var <name>: <Type> by Delegates.observable(<init>) { _, old, new -> <body> }`
```kotlin
// observable 属性变化时回调
class Config {
    var name: String by Delegates.observable("initial") { _, old, new ->
        println("Name changed from $old to $new");
    }
}
```

**基本写法：vetoable 属性委托**
`var <name>: <Type> by Delegates.vetoable(<init>) { _, _, new -> <cond> }`
```kotlin
// vetoable 可否决属性变化
class Config {
    var age: Int by Delegates.vetoable(0) { _, _, new ->
        new >= 0;
    }
}
```

**基本写法：lazy 属性委托**
`val <name>: <Type> by lazy { <init> }`
```kotlin
// lazy 延迟初始化
class Config {
    val heavyData: List<String> by lazy {
        (1..1000).map { "Item $it" };
    }
}
```

**换行写法：自定义属性委托**
`class <Delegate><T> { operator fun getValue(...) / setValue(...) }`
```kotlin
// 自定义属性委托实现
class Preference<T>(private val key: String, private val default: T) {
    operator fun getValue(thisRef: Any?, property: KProperty<*>): T {
        return prefs[key] as? T ?: default;
    }
    operator fun setValue(thisRef: Any?, property: KProperty<*>, value: T) {
        prefs[key] = value;
    }
}
```
