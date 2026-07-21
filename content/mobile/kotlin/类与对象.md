# Kotlin 类与对象速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

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
