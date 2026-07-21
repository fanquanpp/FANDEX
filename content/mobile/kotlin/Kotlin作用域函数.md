# Kotlin 作用域函数速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## let 函数

**基本写法：let 转换对象**
`<obj>.let { <body with it> }`
```kotlin
// let 返回 Lambda 结果
val length = "Kotlin".let { it.length };
```

**基本写法：let 处理可空值**
`<obj>?.let { <body with it> }`
```kotlin
// let 安全调用非空值
nickname?.let {
    println("Length: ${it.length}");
}
```

**基本写法：let 链式调用**
`<obj>.let { <transform> }.let { <transform> }`
```kotlin
// let 链式转换
val result = "Hello".let { it.uppercase() }.let { it + "!" };
```

**基本写法：let 与 Elvis 结合**
`<obj>?.let { <transform> } ?: <default>`
```kotlin
// let 与 Elvis 结合提供默认值
val length: Int = nickname?.let { it.length } ?: 0;
```

---

## run 函数

**基本写法：run 执行代码块**
`<obj>.run { <body with this> }`
```kotlin
// run 返回 Lambda 结果，this 指向对象
val length = "Kotlin".run { length };
```

**基本写法：run 配置对象**
`<obj>.run { <body with this> }`
```kotlin
// run 配置对象并返回结果
val result = StringBuilder().run {
    append("Hello");
    append(", Kotlin");
    toString();
}
```

**基本写法：run 作为顶层函数**
`run { <body> }`
```kotlin
// run 作为顶层函数执行代码块
val value = run {
    val a = 10;
    val b = 20;
    a + b;
}
```

---

## with 函数

**基本写法：with 执行多个操作**
`with(<obj>) { <body with this> }`
```kotlin
// with 非扩展版本，对同一对象执行多个操作
val greeting = with(StringBuilder()) {
    append("Hello");
    append(", Kotlin");
    toString();
}
```

**基本写法：with 配置对象**
`with(<obj>) { <body with this> }`
```kotlin
// with 配置对象
val person = Person();
with(person) {
    name = "Alice";
    age = 25;
}
```

**基本写法：with 返回结果**
`val <name> = with(<obj>) { <body with this> }`
```kotlin
// with 返回结果
val description = with(person) {
    "$name, $age years old";
}
```

---

## apply 函数

**基本写法：apply 配置对象**
`<obj>.apply { <body with this> }`
```kotlin
// apply 返回原对象，this 指向对象
val person = Person().apply {
    name = "Alice";
    age = 25;
}
```

**基本写法：apply 配置 Builder**
`<obj>.apply { <body with this> }`
```kotlin
// apply 配置 Builder 对象
val builder = AlertDialog.Builder(context).apply {
    setTitle("Title");
    setMessage("Message");
    setPositiveButton("OK") { _, _ -> };
}
```

**基本写法：apply 链式调用**
`<obj>.apply { <body> }.apply { <body> }`
```kotlin
// apply 链式配置
val list = mutableListOf<String>().apply {
    add("a");
    add("b");
}.apply {
    add("c");
}
```

---

## also 函数

**基本写法：also 执行附加操作**
`<obj>.also { <body with it> }`
```kotlin
// also 返回原对象，it 指向对象
val person = Person("Alice", 25).also {
    println("Created: $it");
}
```

**基本写法：also 日志记录**
`<obj>.also { <body with it> }`
```kotlin
// also 用于日志记录
val result = compute().also {
    println("Computed: $it");
}
```

**基本写法：also 链式调用**
`<obj>.also { <body> }.also { <body> }`
```kotlin
// also 链式附加操作
val list = mutableListOf(1, 2, 3).also {
    println("Initial: $it");
}.also {
    it.add(4);
    println("After add: $it");
}
```

---

## 作用域函数对比

**基本写法：let 与 also 对比**
`<obj>.let { <transform> } // vs <obj>.also { <body> }`
```kotlin
// let 返回 Lambda 结果，also 返回原对象
val length = "Kotlin".let { it.length };  // 返回 Int
val str = "Kotlin".also { println(it); };  // 返回 String
```

**基本写法：apply 与 run 对比**
`<obj>.apply { <body> } // vs <obj>.run { <body> }`
```kotlin
// apply 返回原对象，run 返回 Lambda 结果
val builder = StringBuilder().apply { append("a"); };  // 返回 StringBuilder
val text = StringBuilder().run { append("a"); toString(); };  // 返回 String
```

**基本写法：with 与 run 对比**
`with(<obj>) { <body> } // vs <obj>.run { <body> }`
```kotlin
// with 是非扩展函数，run 是扩展函数
val result1 = with(StringBuilder()) { toString(); };
val result2 = StringBuilder().run { toString(); };
```

---

## 作用域函数选择

**基本写法：let 用于转换**
`<obj>?.let { <transform> }`
```kotlin
// let 典型场景：转换可空值
val length: Int? = nickname?.let { it.length };
```

**基本写法：run 用于计算**
`<obj>.run { <body with this> }`
```kotlin
// run 典型场景：对象上执行计算
val isValid = userInput.run {
    trim().isNotEmpty() && length >= 3;
}
```

**基本写法：with 用于多操作**
`with(<obj>) { <body with this> }`
```kotlin
// with 典型场景：对同一对象执行多个操作
with(person) {
    name = "Alice";
    age = 25;
    email = "alice@example.com";
}
```

**基本写法：apply 用于配置**
`<obj>.apply { <body with this> }`
```kotlin
// apply 典型场景：配置对象
val intent = Intent().apply {
    action = "ACTION_VIEW";
    data = Uri.parse("https://example.com");
}
```

**基本写法：also 用于附加操作**
`<obj>.also { <body with it> }`
```kotlin
// also 典型场景：附加操作（日志、调试）
val list = mutableListOf(1, 2, 3).also {
    println("List created: $it");
}
```

---

## 作用域函数实战

**基本写法：let 处理可空值**
`<obj>?.let { <body with it> } ?: <default>`
```kotlin
// let 处理可空值并提供默认值
val name = nullableName?.let { it.trim() } ?: "Unknown";
```

**基本写法：apply 配置并返回**
`<obj>.apply { <body with this> }`
```kotlin
// apply 配置对象并返回
val person = Person().apply {
    name = "Alice";
    age = 25;
    email = "alice@example.com";
}
```

**基本写法：also 链式调试**
`<obj>.also { <body> }.<method>()`
```kotlin
// also 链式调试
val result = listOf(1, 2, 3)
    .also { println("Original: $it"); }
    .map { it * 2 }
    .also { println("Mapped: $it"); }
    .filter { it > 2 };
```

**基本写法：run 计算并返回**
`<obj>.run { <body with this> }`
```kotlin
// run 计算并返回结果
val summary = data.run {
    val total = sum();
    val avg = average();
    "Total: $total, Avg: $avg";
}
```

**基本写法：with 多操作返回**
`val <name> = with(<obj>) { <body with this> }`
```kotlin
// with 多操作并返回结果
val report = with(database) {
    val count = queryCount();
    val max = queryMax();
    "Count: $count, Max: $max";
}
```

---

## 作用域函数与可空类型

**基本写法：let 处理可空值**
`<obj>?.let { <body with it> }`
```kotlin
// let 安全调用非空值
nullableValue?.let {
    println(it);
}
```

**基本写法：apply 配置可空对象**
`<obj>?.apply { <body with this> }`
```kotlin
// apply 安全配置可空对象
nullableBuilder?.apply {
    append("Hello");
    append(", Kotlin");
}
```

**基本写法：run 处理可空对象**
`<obj>?.run { <body with this> }`
```kotlin
// run 安全执行可空对象
nullableString?.run {
    println(length);
}
```

**基本写法：also 处理可空对象**
`<obj>?.also { <body with it> }`
```kotlin
// also 安全附加操作
nullableValue?.also {
    println("Value: $it");
}
```

---

## 作用域函数与集合

**基本写法：let 转换集合**
`<list>.let { <transform> }`
```kotlin
// let 转换集合
val size = list.let { it.size };
```

**基本写法：apply 配置集合**
`<list>.apply { <body with this> }`
```kotlin
// apply 配置可变集合
val list = mutableListOf<Int>().apply {
    add(1);
    add(2);
    add(3);
}
```

**基本写法：also 调试集合**
`<list>.also { <body with it> }`
```kotlin
// also 调试集合
val filtered = list
    .filter { it > 0 }
    .also { println("Filtered: $it"); }
```

**基本写法：run 计算集合**
`<list>.run { <body with this> }`
```kotlin
// run 计算集合
val result = list.run {
    filter { it > 0 }.sum();
}
```

**基本写法：with 多操作集合**
`with(<list>) { <body with this> }`
```kotlin
// with 对集合执行多个操作
val info = with(list) {
    "Size: $size, First: ${firstOrNull()}, Last: ${lastOrNull()}";
}
```
