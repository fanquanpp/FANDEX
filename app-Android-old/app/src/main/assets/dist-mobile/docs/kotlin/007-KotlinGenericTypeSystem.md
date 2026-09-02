## 前置知识

- [data class 详解](/kotlin/006-KotlinDataClassDeepDive)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 泛型基础」的核心机制、典型用法与常见陷阱
- 掌握「2. 型变（Variance）」的核心机制、典型用法与常见陷阱
- 掌握「3. 星投影」的核心机制、典型用法与常见陷阱
- 掌握「4. 泛型约束」的核心机制、典型用法与常见陷阱
- 掌握「5. reified 类型参数」的核心机制、典型用法与常见陷阱


## 1. 泛型基础

### 1.1 泛型类与接口

```kotlin
// 泛型类
class Box<T>(val value: T) {
    fun unwrap(): T = value
}

val intBox = Box(42)         // Box<Int>，类型推断
val strBox = Box<String>("Hello")  // 显式指定

// 泛型接口
interface Repository<T> {
    fun findById(id: String): T?
    fun save(entity: T): T
    fun delete(id: String)
}

class UserRepository : Repository<User> {
    override fun findById(id: String): User? = /* ... */
    override fun save(entity: User): User = /* ... */
    override fun delete(id: String) { /* ... */ }
}
```

### 1.2 泛型函数

```kotlin
fun <T> List<T>.secondOrNull(): T? =
    if (this.size >= 2) this[1] else null

fun <T : Comparable<T>> maxOf(a: T, b: T): T = if (a > b) a else b

val result = maxOf(3, 7)        // Int
val result2 = maxOf("a", "b")   // String
```

### 1.3 多类型参数

```kotlin
class Pair<A, B>(val first: A, val second: B)

fun <K, V> buildMap(builder: MutableMap<K, V>.() -> Unit): Map<K, V> {
    val map = mutableMapOf<K, V>()
    map.builder()
    return map
}

val map = buildMap<String, Int> {
    put("one", 1)
    put("two", 2)
}
```

## 2. 型变（Variance）

型变是泛型中最核心也最复杂的概念，描述泛型实例的子类型关系。

### 2.1 不可变性（Invariant）

默认情况下，Kotlin 泛型是不可变的：`List<String>` 不是 `List<Any>` 的子类型。

```kotlin
// 编译错误
val strings: List<String> = listOf("a", "b")
// val anys: List<Any> = strings  // Type mismatch
```

### 2.2 协变（Covariance — out）

`out` 修饰符表示泛型参数只能出现在输出位置（返回值），使泛型成为协变的：

```kotlin
// Producer 只"产出" T，不"消费" T
interface Producer<out T> {
    fun produce(): T
}

class StringProducer : Producer<String> {
    override fun produce(): String = "Hello"
}

// 协变允许子类型关系
val producer: Producer<Any> = StringProducer()  // OK!
```

**规则**：`out T` 意味着 T 只能作为函数返回类型，不能作为函数参数类型。

```kotlin
interface Source<out T> {
    fun next(): T           // OK — T 在输出位置
    // fun consume(item: T) // 编译错误 — T 在输入位置
}
```

### 2.3 逆变（Contravariance — in）

`in` 修饰符表示泛型参数只能出现在输入位置（参数），使泛型成为逆变的：

```kotlin
// Consumer 只"消费" T，不"产出" T
interface Consumer<in T> {
    fun consume(item: T)
}

class AnyConsumer : Consumer<Any> {
    override fun consume(item: Any) = println(item)
}

// 逆变允许反向子类型关系
val consumer: Consumer<String> = AnyConsumer()  // OK!
```

### 2.4 型变总结

| 声明               | 含义   | 子类型关系                         | T 的位置 |
| ------------------ | ------ | ---------------------------------- | -------- |
| `class Box<T>`     | 不可变 | 无子类型关系                       | 任意     |
| `class Box<out T>` | 协变   | `Box<String>` 是 `Box<Any>` 子类型 | 仅输出   |
| `class Box<in T>`  | 逆变   | `Box<Any>` 是 `Box<String>` 子类型 | 仅输入   |

记忆口诀：**"Producer out, Consumer in"**（PECS 原则的 Kotlin 版本）。

### 2.5 使用处型变（Type Projection）

当无法在声明处指定型变时，可以在使用处投影：

```kotlin
// 使用处协变投影
fun copy(from: Array<out Any>, to: Array<Any>) {
    for (i in from.indices) {
        to[i] = from[i]
    }
}

// 使用处逆变投影
fun fill(array: Array<in String>, value: String) {
    for (i in array.indices) {
        array[i] = value
    }
}
```

## 3. 星投影

当泛型参数的具体类型不重要或未知时，使用星投影：

```kotlin
// Array<*> 等价于 Array<out Any?>
fun printArray(array: Array<*>) {
    for (item in array) {
        println(item)  // OK — 可以读取
        // array[0] = "new"  // 编译错误 — 不能写入
    }
}

// Map<*, *> — 两个类型参数都未知
fun printMap(map: Map<*, *>) {
    for ((key, value) in map) {
        println("$key: $value")
    }
}
```

## 4. 泛型约束

### 4.1 上界约束

```kotlin
// T 必须实现 Comparable<T>
fun <T : Comparable<T>> sort(list: List<T>): List<T> {
    return list.sorted()
}

// 多重约束（where 子句）
fun <T> process(value: T): String where T : CharSequence, T : Comparable<T> {
    return if (value > "threshold") value.toString() else "default"
}
```

### 4.2 约束默认值

```kotlin
// 默认上界是 Any?
fun <T> defaultExample(value: T) {
    // T 的上界是 Any?，所以 value 可以为 null
}

// 显式非空上界
fun <T : Any> nonNullExample(value: T) {
    // T 的上界是 Any，value 不为 null
}
```

## 5. reified 类型参数

由于 JVM 的类型擦除，运行时无法获取泛型的具体类型。`reified` 配合 `inline` 函数解决此问题：

```kotlin
// 普通 — 运行时无法检查类型
// fun <T> isType(value: Any): Boolean = value is T  // 编译错误

// reified — 保留类型信息
inline fun <reified T> isType(value: Any): Boolean = value is T

isType<String>("Hello")  // true
isType<Int>("Hello")     // false

// 实际应用：类型安全的 JSON 解析
inline fun <reified T> HttpClient.parseResponse(): T {
    val response = execute()
    return Json.decodeFromString<T>(response.body)
}

// 实际应用：按类型过滤
inline fun <reified T> List<Any>.filterIsInstance(): List<T> {
    return this.filterIsInstanceTo(mutableListOf())
}
```

### 5.1 reified 的限制

- 只能用于 `inline` 函数
- 不能用于类属性（非内联函数参数）
- 不能用于非内联函数的参数类型

## 6. 空安全

空安全是 Kotlin 类型系统最重要的特性，从编译期消除空指针异常。

### 6.1 可空与非空类型

```kotlin
var name: String = "Kotlin"   // 非空类型，不能赋 null
// name = null                // 编译错误

var nickname: String? = "Kt"  // 可空类型
nickname = null               // OK
```

### 6.2 安全调用操作符 ?.

```kotlin
val length: Int? = nickname?.length  // 如果 nickname 为 null，返回 null
val upper: String? = nickname?.uppercase()
```

### 6.3 非空断言 !!

```kotlin
val length: Int = nickname!!.length  // 如果 nickname 为 null，抛出 NullPointerException

// 慎用 !! — 只在确定不为 null 时使用
// 优先使用 ?. 或 ?: 替代
```

### 6.4 Elvis 操作符 ?:

```kotlin
val length: Int = nickname?.length ?: 0  // 如果为 null，使用默认值 0
val name: String = nickname ?: "Unknown"

// Elvis 与 throw 结合
val value = nullableValue ?: throw IllegalArgumentException("Required value is null")

// Elvis 与 return 结合
fun process(input: String?) {
    val text = input ?: return
    println(text.length)  // text 在此处智能转换为非空
}
```

### 6.5 let 安全调用

```kotlin
nickname?.let {
    // it 在此 Lambda 中是非空的 String
    println("Length: ${it.length}")
    println("Upper: ${it.uppercase()}")
}
```

### 6.6 安全类型转换 as?

```kotlin
val value: Any = "Hello"
val number: Int? = value as? Int  // null（转换失败返回 null）
val text: String? = value as? String  // "Hello"
```

### 6.7 空安全与集合

```kotlin
val list: List<String?> = listOf("a", null, "b", null, "c")

// 过滤非空元素
val nonNull: List<String> = list.filterNotNull()  // ["a", "b", "c"]

// Map 的空安全操作
val map = mapOf("key" to "value")
val value: String = map["key"] ?: "default"  // map[] 返回可空类型
```

## 7. 智能转换

Kotlin 编译器在条件分支中自动进行类型转换：

```kotlin
fun process(input: Any) {
    if (input is String) {
        // input 自动智能转换为 String
        println(input.length)  // 无需手动强转
    }

    when (input) {
        is Int -> println(input + 1)        // input: Int
        is String -> println(input.length)  // input: String
        is List<*> -> println(input.size)   // input: List<*>
    }
}

// 与空安全结合
fun greet(name: String?) {
    if (name != null) {
        // name 智能转换为 String（非空）
        println(name.length)
    }
}

// when 中的智能转换
fun describe(x: Any) = when (x) {
    is Int -> "Int: ${x + 1}"          // x: Int
    is String -> "String: ${x.length}" // x: String
    else -> "Unknown"
}
```

### 7.1 智能转换的限制

```kotlin
class MyClass {
    var value: String? = null

    fun process() {
        if (value != null) {
            // 编译错误！value 是 var，可能在检查后被修改
            // println(value.length)

            // 解决方案 1：使用局部变量
            val v = value
            if (v != null) {
                println(v.length)  // OK
            }

            // 解决方案 2：使用 let
            value?.let { println(it.length) }
        }
    }
}
```

## 8. 类型系统特殊类型

### 8.1 Nothing

`Nothing` 是 Kotlin 类型体系的底部类型，没有实例：

```kotlin
// Nothing 表示永远不会正常返回
fun fail(message: String): Nothing {
    throw IllegalArgumentException(message)
}

// 用于类型推断
val result: String = if (condition) "success" else fail("error")

// Nothing? 是可空底部类型
val nullValue: Nothing? = null
val maybeString: String? = nullValue  // Nothing? 是 String? 的子类型
```

### 8.2 Unit

`Unit` 类似 Java 的 `void`，但有实例：

```kotlin
fun printHello(): Unit {  // Unit 可省略
    println("Hello")
}

// Unit 作为泛型参数
val actions: List<() -> Unit> = listOf(
    { println("Action 1") },
    { println("Action 2") }
)
```

### 8.3 Any 与 Any?

```kotlin
// Any 是所有非空类型的根（类似 Java Object）
val value: Any = "Hello"

// Any? 是所有类型的根（包括可空类型）
val nullable: Any? = null
```
## 泛型基础

**基本写法：泛型类**
`class <Name><T>(val <prop>: T) { <body> }`
```kotlin
// 泛型类定义
class Box<T>(val value: T) {
    fun unwrap(): T = value;
}
```

**基本写法：泛型接口**
`interface <Name><T> { fun <method>(<param>): T }`
```kotlin
// 泛型接口定义
interface Repository<T> {
    fun findById(id: String): T?;
    fun save(entity: T): T;
}
```

**基本写法：泛型函数**
`fun <T> <name>(<params>): <ReturnType>`
```kotlin
// 泛型函数定义
fun <T> List<T>.secondOrNull(): T? =
    if (this.size >= 2) this[1] else null;
```

**基本写法：带约束的泛型函数**
`fun <T : <Bound>> <name>(<params>): <ReturnType>`
```kotlin
// T 必须实现 Comparable<T>
fun <T : Comparable<T>> maxOf(a: T, b: T): T = if (a > b) a else b;
```

**单行写法：多类型参数泛型类**
`class <Name><A, B>(val <prop1>: A, val <prop2>: B)`
```kotlin
// 单行多类型参数泛型类
class Pair<A, B>(val first: A, val second: B);
```

**换行写法：多类型参数泛型函数**
`fun <K, V> <name>(<param>): <ReturnType> { <body> }`
```kotlin
// 换行声明多类型参数泛型函数
fun <K, V> buildMap(builder: MutableMap<K, V>.() -> Unit): Map<K, V> {
    val map = mutableMapOf<K, V>();
    map.builder();
    return map;
}
```

---

## 型变

**基本写法：协变（out）**
`interface <Name><out T> { fun <method>(): T }`
```kotlin
// 协变：T 只能作为返回类型
interface Producer<out T> {
    fun produce(): T;
}
```

**基本写法：逆变（in）**
`interface <Name><in T> { fun <method>(<param>: T) }`
```kotlin
// 逆变：T 只能作为参数类型
interface Consumer<in T> {
    fun consume(item: T);
}
```

**基本写法：使用处协变投影**
`fun <name>(<param>: Array<out <Type>>)`
```kotlin
// 使用处协变投影
fun copy(from: Array<out Any>, to: Array<Any>) {
    for (i in from.indices) {
        to[i] = from[i];
    }
}
```

**基本写法：使用处逆变投影**
`fun <name>(<param>: Array<in <Type>>)`
```kotlin
// 使用处逆变投影
fun fill(array: Array<in String>, value: String) {
    for (i in array.indices) {
        array[i] = value;
    }
}
```

---

## 星投影

**基本写法：Array 星投影**
`fun <name>(<param>: Array<*>)`
```kotlin
// Array<*> 等价于 Array<out Any?>
fun printArray(array: Array<*>) {
    for (item in array) {
        println(item);
    }
}
```

**基本写法：Map 星投影**
`fun <name>(<param>: Map<*, *>)`
```kotlin
// Map<*, *> 两个类型参数都未知
fun printMap(map: Map<*, *>) {
    for ((key, value) in map) {
        println("$key: $value");
    }
}
```

---

## 泛型约束

**基本写法：上界约束**
`fun <T : <Bound>> <name>(<params>): <ReturnType>`
```kotlin
// T 必须实现 Comparable<T>
fun <T : Comparable<T>> sort(list: List<T>): List<T> {
    return list.sorted();
}
```

**换行写法：多重约束（where 子句）**
`fun <T> <name>(<params>): <ReturnType> where T : <Bound1>, T : <Bound2>`
```kotlin
// 多重约束
fun <T> process(value: T): String where T : CharSequence, T : Comparable<T> {
    return if (value > "threshold") value.toString() else "default";
}
```

**基本写法：非空上界约束**
`fun <T : Any> <name>(<param>: T)`
```kotlin
// 显式非空上界
fun <T : Any> nonNullExample(value: T) {
    // T 的上界是 Any，value 不为 null
}
```

---

## reified 类型参数

**基本写法：reified 类型参数**
`inline fun <reified T> <name>(<param>): <ReturnType>`
```kotlin
// reified 保留类型信息
inline fun <reified T> isType(value: Any): Boolean = value is T;
```

**基本写法：reified 类型安全 JSON 解析**
`inline fun <reified T> <name>(): T`
```kotlin
// 类型安全的 JSON 解析
inline fun <reified T> HttpClient.parseResponse(): T {
    val response = execute();
    return Json.decodeFromString<T>(response.body);
}
```

---

## 空安全

**基本写法：非空类型**
`var <name>: <Type> = <value>`
```kotlin
// 非空类型，不能赋 null
var name: String = "Kotlin";
```

**基本写法：可空类型**
`var <name>: <Type>? = <value>`
```kotlin
// 可空类型，允许 null
var nickname: String? = "Kt";
nickname = null;
```

**基本写法：安全调用操作符 ?.**
`<obj>?.<prop>`
```kotlin
// 安全调用，为 null 时返回 null
val length: Int? = nickname?.length;
```

**基本写法：非空断言 !!**
`<obj>!!.<prop>`
```kotlin
// 非空断言，为 null 时抛出 NPE
val length: Int = nickname!!.length;
```

**基本写法：Elvis 操作符 ?:**
`<expr> ?: <default>`
```kotlin
// Elvis 运算符提供默认值
val length: Int = nickname?.length ?: 0;
```

**基本写法：Elvis 与 throw 结合**
`<expr> ?: throw <Exception>`
```kotlin
// 为 null 时抛出异常
val value = nullableValue ?: throw IllegalArgumentException("Required value is null");
```

**基本写法：let 安全调用**
`<obj>?.let { <body with it> }`
```kotlin
// let 安全调用非空值
nickname?.let {
    println("Length: ${it.length}");
}
```

**基本写法：安全类型转换 as?**
`<obj> as? <Type>`
```kotlin
// 安全转换，失败返回 null
val number: Int? = value as? Int;
```

**基本写法：filterNotNull 过滤 null**
`<list>.filterNotNull()`
```kotlin
// 过滤集合中的 null 值
val list: List<String?> = listOf("a", null, "b");
val nonNull: List<String> = list.filterNotNull();
```

**基本写法：mapNotNull 映射并过滤 null**
`<list>.mapNotNull { <transform> }`
```kotlin
// 映射并过滤 null
val lengths: List<Int> = list.mapNotNull { it?.length };
```

---

## 智能转换

**基本写法：is 检查后智能转换**
`if (<obj> is <Type>) { <body with obj as Type> }`
```kotlin
// is 检查后自动智能转换
if (input is String) {
    println(input.length);
}
```

**基本写法：when 中的智能转换**
`fun <name>(<param>: Any) = when (<param>) { is <Type> -> <expr> }`
```kotlin
// when 中 is 检查后智能转换
fun describe(x: Any) = when (x) {
    is Int -> "Int: ${x + 1}";
    is String -> "String: ${x.length}";
    else -> "Unknown";
}
```

**基本写法：null 检查后智能转换**
`if (<obj> != null) { <body with obj as non-null> }`
```kotlin
// null 检查后智能转换为非空
fun greet(name: String?) {
    if (name != null) {
        println(name.length);
    }
}
```

**基本写法：智能转换的限制**
`val <local> = <prop>; if (<local> != null) { <body> }`
```kotlin
// var 属性需使用局部变量避免智能转换限制
val v = value;
if (v != null) {
    println(v.length);
}
```

---

## 类型系统特殊类型

**基本写法：Nothing 类型**
`fun <name>(<params>): Nothing`
```kotlin
// Nothing 表示永远不会正常返回
fun fail(message: String): Nothing {
    throw IllegalArgumentException(message);
}
```

**基本写法：Nothing 用于类型推断**
`val <name>: <Type> = if (<cond>) <expr> else fail(<msg>)`
```kotlin
// Nothing 是所有类型的子类型
val result: String = if (condition) "success" else fail("error");
```

**基本写法：Unit 类型**
`fun <name>(<params>): Unit { <body> }`
```kotlin
// Unit 表示无返回值
fun printHello(): Unit {
    println("Hello");
}
```

**基本写法：Unit 作为泛型参数**
`val <name>: List<() -> Unit> = listOf(<lambdas>)`
```kotlin
// Unit 作为泛型参数
val actions: List<() -> Unit> = listOf(
    { println("Action 1"); },
    { println("Action 2"); }
);
```

**基本写法：Any 类型**
`val <name>: Any = <value>`
```kotlin
// Any 是所有非空类型的根
val value: Any = "Hello";
```

**基本写法：Any? 类型**
`val <name>: Any? = null`
```kotlin
// Any? 是所有类型的根（包括可空类型）
val nullable: Any? = null;
```
