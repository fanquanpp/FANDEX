# Kotlin 函数与 Lambda 速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

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
