# Kotlin 扩展函数速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 扩展函数基础

**基本写法：为 String 添加扩展函数**
`fun String.<name>(): <ReturnType>`
```kotlin
// 为 String 添加扩展函数
fun String.addExclamation(): String = this + "!";
```

**基本写法：为 Int 添加扩展函数**
`fun Int.<name>(): <ReturnType>`
```kotlin
// 为 Int 添加扩展函数
fun Int.isEven(): Boolean = this % 2 == 0;
```

**换行写法：带逻辑的扩展函数**
`fun <ReceiverType>.<name>(<params>): <ReturnType> { <body> }`
```kotlin
// 为 List 添加带逻辑的扩展函数
fun <T> List<T>.second(): T {
    if (this.size < 2) throw NoSuchElementException("列表没有第二个元素");
    return this[1];
}
```

**基本写法：为可空类型添加扩展函数**
`fun <ReceiverType>?.<name>(<params>): <ReturnType>`
```kotlin
// 为可空类型添加扩展函数
fun String?.isNullOrBlank(): Boolean = this == null || this.isBlank();
```

---

## 扩展属性

**基本写法：只读扩展属性**
`val <ReceiverType>.<name>: <Type> get() = <expr>`
```kotlin
// 为 String 添加只读扩展属性
val String.firstChar: Char
    get() = this.first();
```

**基本写法：Boolean 扩展属性**
`val <ReceiverType>.<name>: Boolean get() = <expr>`
```kotlin
// 为 String 添加 Boolean 扩展属性
val String.hasContent: Boolean
    get() = this.isNotBlank();
```

**换行写法：可变扩展属性**
`var <ReceiverType>.<name>: <Type> [get() = <expr>] [set(value) { <body> }]`
```kotlin
// 为 StringBuilder 添加可变扩展属性
var StringBuilder.lastChar: Char
    get() = this[this.length - 1]
    set(value) { this.append(value); }
```

---

## 扩展函数与可空类型

**基本写法：为非空类型添加扩展**
`fun <ReceiverType>.<name>(<params>): <ReturnType>`
```kotlin
// 为非空 String 添加扩展
fun String.trimToLength(maxLength: Int): String {
    return if (this.length <= maxLength) this
    else this.substring(0, maxLength) + "...";
}
```

**基本写法：为可空类型添加扩展**
`fun <ReceiverType>?.<name>(<params>): <ReturnType>`
```kotlin
// 为可空 String 添加扩展
fun String?.safeLength(): Int = this?.length ?: 0;
```

**基本写法：可空类型提供默认值**
`fun <ReceiverType>?.<name>(<default>): <ReturnType>`
```kotlin
// 可空类型提供默认值
fun String?.orElse(default: String): String = this ?: default;
```

---

## 扩展函数中的 this

**基本写法：this 引用接收者对象**
`fun <ReceiverType>.<name>(): <ReturnType>`
```kotlin
// this 指向接收者对象
fun String.describe(): String {
    return "字符串 '$this' 的长度是 ${this.length}";
}
```

**基本写法：省略 this**
`fun <ReceiverType>.<name>(): <ReturnType>`
```kotlin
// 省略 this 调用方法
fun String.shout(): String = uppercase() + "!!!";
```

---

## 泛型扩展函数

**基本写法：为任意类型添加扩展**
`fun <T> T.<name>(): <ReturnType>`
```kotlin
// 为任意类型添加扩展
fun <T> T.printSelf(): T {
    println(this);
    return this;
}
```

**基本写法：带约束的泛型扩展**
`fun <T : <Bound>> T.<name>(<params>): <ReturnType>`
```kotlin
// 带约束的泛型扩展
fun <T : Comparable<T>> T.isBetween(min: T, max: T): Boolean {
    return this >= min && this <= max;
}
```

**换行写法：为集合添加泛型扩展**
`fun <T> List<T>.<name>(<param>: List<T>): <ReturnType>`
```kotlin
// 为 List 添加泛型扩展
fun <T> List<T>.interleave(other: List<T>): List<T> {
    val result = mutableListOf<T>();
    val maxSize = maxOf(this.size, other.size);
    for (i in 0 until maxSize) {
        if (i < this.size) result.add(this[i]);
        if (i < other.size) result.add(other[i]);
    }
    return result;
}
```

---

## 扩展函数的解析规则

**基本写法：静态解析**
`fun <BaseType>.<name>() = <expr>`
```kotlin
// 扩展函数静态解析，由声明类型决定
open class Animal;
class Dog : Animal();
fun Animal.sound() = "动物叫声";
fun Dog.sound() = "汪汪汪";
val animal: Animal = Dog();
animal.sound();  // 动物叫声（调用 Animal 的扩展）
```

---

## 扩展函数的作用域

**基本写法：顶层扩展函数**
`package <pkg>; fun <ReceiverType>.<name>(): <ReturnType>`
```kotlin
// 顶层扩展函数，使用时需要 import
package com.example.utils;
fun String.isEmail(): Boolean = this.contains("@") && this.contains(".");
```

**基本写法：成员扩展函数**
`class <Name> { fun <ReceiverType>.<name>(): <ReturnType> }`
```kotlin
// 成员扩展函数，只在类内部可用
class Parser {
    private fun String.parseToInt(): Int? = this.toIntOrNull();
    fun parse(input: String): Int? {
        return input.parseToInt();
    }
}
```

---

## 工具函数扩展

**基本写法：日期格式化扩展**
`fun <Type>.<name>(): <ReturnType>`
```kotlin
// 为 LocalDateTime 添加格式化扩展
fun java.time.LocalDateTime.formatChinese(): String {
    return "${this.year}年${this.monthValue}月${this.dayOfMonth}日";
}
```

**基本写法：集合随机元素扩展**
`fun <T> List<T>.<name>(): <ReturnType>`
```kotlin
// 为 List 添加随机元素扩展
fun <T> List<T>.randomItemOrNull(): T? = if (this.isEmpty()) null else this.random();
```

**基本写法：数值四舍五入扩展**
`fun <Number>.<name>(<params>): <ReturnType>`
```kotlin
// 为 Double 添加四舍五入扩展
fun Double.roundTo(decimals: Int): Double {
    var multiplier = 1.0;
    repeat(decimals) { multiplier *= 10 };
    return kotlin.math.round(this * multiplier) / multiplier;
}
```

---

## 防御性编程扩展

**基本写法：安全的类型转换扩展**
`inline fun <reified T> Any.safeCast(): T?`
```kotlin
// 安全的类型转换扩展
inline fun <reified T> Any.safeCast(): T? = this as? T;
```

**基本写法：安全的列表访问扩展**
`fun <T> List<T>.safeGet(<index>: Int): T?`
```kotlin
// 安全的列表访问扩展
fun <T> List<T>.safeGet(index: Int): T? {
    return if (index in indices) this[index] else null;
}
```

**基本写法：非空检查扩展**
`fun <T : Any> T?.requireNonNull(<lazyMessage>): T`
```kotlin
// 非空检查扩展
fun <T : Any> T?.requireNonNull(lazyMessage: () -> String = { "值不能为空" }): T {
    return this ?: throw IllegalArgumentException(lazyMessage());
}
```

---

## 流式 API 扩展

**基本写法：applyIf 条件执行扩展**
`fun <T> T.<name>(<condition>, <block>): T`
```kotlin
// 条件执行扩展
fun <T> T.applyIf(condition: Boolean, block: T.() -> Unit): T {
    if (condition) block();
    return this;
}
```

**基本写法：alsoIf 条件执行扩展**
`fun <T> T.<name>(<condition>, <block>): T`
```kotlin
// 条件执行扩展
fun <T> T.alsoIf(condition: Boolean, block: (T) -> Unit): T {
    if (condition) block(this);
    return this;
}
```

---

## 中缀扩展函数

**基本写法：infix 扩展函数**
`infix fun <ReceiverType>.<name>(<param>): <ReturnType>`
```kotlin
// 中缀扩展函数
infix fun String.times(n: Int): String {
    return this.repeat(n);
}
```

**基本写法：infix 集合扩展函数**
`infix fun <T> List<T>.<name>(<param>): <ReturnType>`
```kotlin
// 中缀集合扩展函数
infix fun <T> List<T>.intersect(other: List<T>): List<T> {
    return this.filter { it in other };
}
```

---

## 扩展函数与运算符重载

**基本写法：operator 扩展函数**
`operator fun <ReceiverType>.<name>(<params>): <ReturnType>`
```kotlin
// operator 重载 step 运算符
operator fun ClosedRange<Int>.step(step: Int): Iterable<Int> {
    return object : Iterable<Int> {
        override fun iterator(): Iterator<Int> {
            var current = start;
            return object : Iterator<Int> {
                override fun hasNext() = current <= endInclusive;
                override fun next(): Int {
                    val result = current;
                    current += step;
                    return result;
                }
            };
        }
    };
}
```

---

## 带接收者的函数类型

**基本写法：带接收者的函数类型**
`fun <name>(<param>: <ReceiverType>.() -> <ReturnType>): <ReturnType>`
```kotlin
// 带接收者的函数类型
fun buildString(builderAction: StringBuilder.() -> Unit): String {
    val builder = StringBuilder();
    builder.builderAction();
    return builder.toString();
}
```
