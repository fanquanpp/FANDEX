# Kotlin 泛型与类型系统速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

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
