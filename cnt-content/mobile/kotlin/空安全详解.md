# Kotlin 空安全详解速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 可空类型声明

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

**基本写法：可空集合元素**
`List<<Type>?>`
```kotlin
// 集合元素可为 null
val list: List<String?> = listOf("a", null, "b");
```

**基本写法：可空集合**
`List<<Type>>?`
```kotlin
// 集合本身可为 null
val nullableList: List<String>? = null;
```

**基本写法：可空泛型参数**
`class <Name><T : Any?> { val <prop>: T? }`
```kotlin
// 泛型参数默认可空
class Container<T>(val value: T?);
```

---

## 安全调用操作符

**基本写法：安全调用 ?.**
`<obj>?.<prop>`
```kotlin
// 安全调用，为 null 时返回 null
val length: Int? = nickname?.length;
```

**基本写法：链式安全调用**
`<obj>?.<prop1>?.<prop2>`
```kotlin
// 链式安全调用
val city: String? = user?.address?.city;
```

**基本写法：安全调用方法**
`<obj>?.<method>()`
```kotlin
// 安全调用方法
nickname?.let { println(it); }
```

**基本写法：安全调用集合操作**
`<list>?.<method>()`
```kotlin
// 安全调用集合方法
val size: Int? = list?.size;
```

---

## Elvis 操作符

**基本写法：Elvis 提供默认值**
`<expr> ?: <default>`
```kotlin
// Elvis 运算符提供默认值
val length: Int = nickname?.length ?: 0;
```

**基本写法：Elvis 与 throw**
`<expr> ?: throw <Exception>`
```kotlin
// 为 null 时抛出异常
val value = nullableValue ?: throw IllegalArgumentException("Required value is null");
```

**基本写法：Elvis 与 return**
`<expr> ?: return`
```kotlin
// 为 null 时提前返回
fun process(input: String?) {
    val text = input ?: return;
    println(text);
}
```

**基本写法：Elvis 嵌套**
`<expr1> ?: <expr2> ?: <default>`
```kotlin
// 嵌套 Elvis
val name = primaryName ?: secondaryName ?: "Unknown";
```

---

## 非空断言

**基本写法：非空断言 !!**
`<obj>!!`
```kotlin
// 非空断言，为 null 时抛出 NPE
val length: Int = nickname!!.length;
```

**基本写法：链式非空断言**
`<obj>!!.<prop>!!`
```kotlin
// 链式非空断言（不推荐）
val city: String = user!!.address!!.city!!;
```

---

## 安全类型转换

**基本写法：as? 安全转换**
`<obj> as? <Type>`
```kotlin
// 安全转换，失败返回 null
val number: Int? = value as? Int;
```

**基本写法：as? 与 Elvis 结合**
`(<obj> as? <Type>) ?: <default>`
```kotlin
// 安全转换并提供默认值
val length: Int = (value as? String)?.length ?: 0;
```

---

## let 安全调用

**基本写法：let 安全调用**
`<obj>?.let { <body with it> }`
```kotlin
// let 安全调用非空值
nickname?.let {
    println("Length: ${it.length}");
}
```

**基本写法：let 转换可空值**
`val <name> = <obj>?.let { <transform> }`
```kotlin
// let 转换可空值
val upperName: String? = nickname?.let { it.uppercase() };
```

**基本写法：let 与 Elvis 结合**
`<obj>?.let { <transform> } ?: <default>`
```kotlin
// let 与 Elvis 结合
val length: Int = nickname?.let { it.length } ?: 0;
```

---

## 集合空安全操作

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

**基本写法：firstOrNull 获取第一个非空元素**
`<list>.firstOrNull { <predicate> }`
```kotlin
// 获取第一个满足条件的元素，没有则返回 null
val first = list.firstOrNull { it != null };
```

**基本写法：firstOrNull 获取第一个元素**
`<list>.firstOrNull()`
```kotlin
// 获取第一个元素，空列表返回 null
val first: String? = list.firstOrNull();
```

**基本写法：orEmpty 提供空集合**
`<list>?.orEmpty()`
```kotlin
// 为 null 时返回空集合
val safeList: List<String> = nullableList.orEmpty();
```

**基本写法：orEmpty 提供空字符串**
`<string>?.orEmpty()`
```kotlin
// 为 null 时返回空字符串
val safeString: String = nullableString.orEmpty();
```

---

## 智能转换

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

## 平台类型

**基本写法：Java 互操作返回类型**
`val <name> = <JavaObject>.<method>()`
```kotlin
// Java 方法返回类型在 Kotlin 中为平台类型
val name = javaObject.getName();
name.length;  // 可能 NPE
```

**基本写法：显式声明可空类型**
`val <name>: <Type>? = <JavaObject>.<method>()`
```kotlin
// 显式声明为可空类型
val name: String? = javaObject.getName();
name?.length;
```

**基本写法：显式声明非空类型**
`val <name>: <Type> = <JavaObject>.<method>()`
```kotlin
// 显式声明为非空类型（需确保不为 null）
val name: String = javaObject.getName();
```

---

## lateinit 与可空类型

**基本写法：lateinit 延迟初始化**
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

**基本写法：lateinit 与可空类型对比**
`lateinit var <name>: <Type> // vs var <name>: <Type>? = null`
```kotlin
// lateinit 用于非空类型延迟初始化
lateinit var service: Service;  // 不能为 null
// 可空类型用于可能为 null 的场景
var service2: Service? = null;
```

---

## 可空类型扩展函数

**基本写法：为可空类型添加扩展**
`fun <ReceiverType>?.<name>(<params>): <ReturnType>`
```kotlin
// 为可空 String 添加扩展
fun String?.isNullOrBlank(): Boolean = this == null || this.isBlank();
```

**基本写法：可空类型提供默认值**
`fun <ReceiverType>?.<name>(<default>): <ReturnType>`
```kotlin
// 可空类型提供默认值
fun String?.orElse(default: String): String = this ?: default;
```

**基本写法：可空类型安全操作**
`fun <ReceiverType>?.<name>(): <ReturnType>`
```kotlin
// 可空类型安全操作
fun String?.safeLength(): Int = this?.length ?: 0;
```

---

## Contracts（契约）

**基本写法：contract 契约**
`fun <name>(<param>: <Type>?) { contract { returns() implies (<param> != null) } }`
```kotlin
// contract 契约帮助编译器进行智能转换
fun requireNotNull(value: String?) {
    contract { returns() implies (value != null) }
    if (value == null) throw IllegalArgumentException();
}
```

**基本写法：自定义契约函数**
`fun <name>(<param>: <Type>?): Boolean { contract { returns(true) implies (<param> != null) } }`
```kotlin
// 自定义契约函数
fun isValid(value: String?): Boolean {
    contract { returns(true) implies (value != null) }
    return value != null && value.length > 0;
}
```

---

## 空安全最佳实践

**基本写法：优先使用安全调用**
`<obj>?.<method>()`
```kotlin
// 优先使用安全调用而非非空断言
val length = nickname?.length;
```

**基本写法：使用 Elvis 提供默认值**
`<expr> ?: <default>`
```kotlin
// 使用 Elvis 提供默认值
val name = nickname ?: "Unknown";
```

**基本写法：使用 require 检查非空**
`require(<obj> != null) { <message> }`
```kotlin
// 使用 require 检查非空
fun process(input: String?) {
    require(input != null) { "Input cannot be null" };
    println(input.length);
}
```

**基本写法：使用 check 检查状态**
`check(<obj> != null) { <message> }`
```kotlin
// 使用 check 检查状态
fun process() {
    check(state != null) { "State must be initialized" };
    state.execute();
}
```
