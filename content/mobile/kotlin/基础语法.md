# Kotlin 基础语法速查

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 变量声明

**基本写法：val 声明显式类型只读变量**
`val <name>: <Type> = <value>`
```kotlin
// 声明显式类型的只读变量
val name: String = "Kotlin";
```

**基本写法：val 类型推断只读变量**
`val <name> = <value>`
```kotlin
// 类型推断为 Double
val version = 2.2;
// 类型推断为 Int
val year = 2011;
```

**基本写法：var 声明显式类型可变变量**
`var <name>: <Type> = <value>`
```kotlin
// 声明可变变量并修改
var count: Int = 0;
count = 1;
count += 10;
```

**基本写法：var 类型推断可变变量**
`var <name> = <value>`
```kotlin
// 声明可变字符串变量
var message = "Hello";
message = "World";
```

**基本写法：lateinit 延迟初始化可变变量**
`lateinit var <name>: <Type>`
```kotlin
// 用于 var，延迟初始化引用类型
lateinit var service: UserService;
fun setup() {
    service = UserService();
}
```

**基本写法：by lazy 首次访问时初始化只读变量**
`val <name>: <Type> by lazy { <init> }`
```kotlin
// 用于 val，首次访问时初始化
val heavyObject: ExpensiveClass by lazy {
    println("Initializing...");
    ExpensiveClass();
}
```

**基本写法：const val 编译期常量**
`const val <name> = <value>`
```kotlin
// 编译期常量（顶层或伴生对象中）
const val MAX_SIZE = 100;
```

**单行写法：const val 多常量声明**
`const val <name1> = <value1>; const val <name2> = <value2>`
```kotlin
// 单行声明多个编译期常量
const val APP_NAME = "FANDEX"; const val VERSION = "1.0";
```

---

## 基本类型

**基本写法：Int 整数字面量**
`val <name> = <int>`
```kotlin
// Int 类型字面量
val intVal = 42;
```

**基本写法：Long 长整数字面量**
`val <name> = <int>L`
```kotlin
// Long 类型字面量（后缀 L）
val longVal = 42L;
```

**基本写法：Double 双精度浮点字面量**
`val <name> = <float>`
```kotlin
// Double 类型字面量
val doubleVal = 3.14;
```

**基本写法：Float 单精度浮点字面量**
`val <name> = <float>f`
```kotlin
// Float 类型字面量（后缀 f）
val floatVal = 3.14f;
```

**基本写法：十六进制字面量**
`val <name> = 0x<hex>`
```kotlin
// 十六进制 Int 字面量
val hexVal = 0xFF;
```

**基本写法：二进制字面量**
`val <name> = 0b<binary>`
```kotlin
// 二进制 Int 字面量
val binaryVal = 0b1010;
```

**基本写法：下划线分隔字面量**
`val <name> = <int_with_underscores>`
```kotlin
// 下划线提升可读性
val underscored = 1_000_000;
```

**基本写法：数值显式转换**
`<value>.to<Type>()`
```kotlin
// Kotlin 不支持隐式转换，必须显式调用转换函数
val intVal: Int = 100;
val longVal: Long = intVal.toLong();
```

**基本写法：Boolean 布尔类型**
`val <name>: Boolean = <bool>`
```kotlin
// 声明布尔变量
val isActive: Boolean = true;
```

**基本写法：短路求值**
`val <name> = <bool> && <expr>`
```kotlin
// 短路求值，expensiveCheck 在 isActive 为 false 时不执行
val result = isActive && expensiveCheck();
```

**基本写法：Char 字符类型**
`val <name>: Char = '<char>'`
```kotlin
// Char 用单引号
val letter: Char = 'A';
```

**基本写法：Char Unicode 字符**
`val <name>: Char = '\u<hex>'`
```kotlin
// Unicode 字符
val unicode: Char = '\u0041';
```

**基本写法：String 字符串类型**
`val <name>: String = "<text>"`
```kotlin
// String 用双引号
val text: String = "Hello, Kotlin";
```

**单行写法：trimMargin 原始字符串**
`"""<content>""".trimMargin()`
```kotlin
// trimMargin 去除 | 前缀
val rawText = """
    |Hello,
    |Kotlin!
""".trimMargin();
```

**单行写法：trimIndent 原始字符串**
`"""<content>""".trimIndent()`
```kotlin
// trimIndent 去除公共缩进
val rawText2 = """
    Hello,
    Kotlin!
""".trimIndent();
```

**单行写法：arrayOf 创建对象数组**
`arrayOf(<elements>)`
```kotlin
// 对象数组
val numbers = arrayOf(1, 2, 3, 4, 5);
```

**单行写法：intArrayOf 创建原始类型数组**
`<type>ArrayOf(<elements>)`
```kotlin
// 原始类型数组（无装箱开销）
val intArray = intArrayOf(1, 2, 3);
```

**换行写法：Array 构造函数创建数组**
`Array(<size>) { <index> -> <expr> }`
```kotlin
// 构造函数创建数组，按索引计算元素
val squares = Array(5) { i -> i * i };
```

**换行写法：IntArray 构造函数创建数组**
`<Type>Array(<size>) { <init> }`
```kotlin
// 构造函数创建原始类型数组并初始化
val ones = IntArray(5) { 1 };
```

---

## 字符串模板

**基本写法：简单变量模板**
`"...$<name>..."`
```kotlin
// 简单模板：直接插入变量
val name = "Kotlin";
println("Language: $name");
```

**基本写法：表达式模板**
`"...${<expression>}..."`
```kotlin
// 表达式模板：插入计算结果
val version = 2.2;
println("Version: ${version + 0.1}");
```

**基本写法：嵌套表达式模板**
`"...${<obj>.<prop>}..."`
```kotlin
// 嵌套表达式：访问属性
val list = listOf("a", "b", "c");
println("Size: ${list.size}, First: ${list[0]}");
```

**单行写法：原始字符串中使用模板**
`"""...$<name>..."""`
```kotlin
// 原始字符串中使用模板
val name = "Kotlin";
val json = """
    {
        "name": "$name"
    }
""".trimIndent();
```

---

## 包与导入

**基本写法：包声明**
`package <package.name>`
```kotlin
// 声明包名
package com.example.kotlinbasics;
```

**基本写法：显式导入**
`import <package>.<name>`
```kotlin
// 显式导入单个类或函数
import com.example.utils.Logger;
```

**基本写法：导入并重命名**
`import <package>.<name> as <alias>`
```kotlin
// 导入并重命名解决冲突
import com.example.utils.formatDate as formatDateUtil;
```

**基本写法：导入整个包**
`import <package>.*`
```kotlin
// 导入整个包的所有内容
import com.example.utils.*;
```

**基本写法：导入伴生对象成员**
`import <package>.<Class>.<member>`
```kotlin
// 导入伴生对象成员
import com.example.Config.DEFAULT_TIMEOUT;
```

---

## 控制流

**基本写法：if 表达式**
`val <name> = if (<cond>) <exprA> else <exprB>`
```kotlin
// if 作为表达式赋值
val max = if (a > b) a else b;
```

**换行写法：多分支 if 表达式**
`val <name> = if (<cond>) { <body> } else if (<cond>) { <body> } else { <body> }`
```kotlin
// 多行 if 表达式
val result = if (score >= 90) {
    println("Excellent");
    "A";
} else if (score >= 80) {
    println("Good");
    "B";
} else {
    println("Keep going");
    "C";
}
```

**基本写法：when 表达式**
`when (<subject>) { <branches> }`
```kotlin
// 基本 when 分支匹配
when (x) {
    1 -> println("One");
    2, 3 -> println("Two or Three");
    else -> println("Unknown");
}
```

**基本写法：when 区间匹配**
`when (<subject>) { in <range> -> <expr> }`
```kotlin
// 区间匹配
when (x) {
    in 4..10 -> println("Four to Ten");
    !in 11..20 -> println("Not in 11-20");
}
```

**基本写法：when 类型匹配**
`when (<subject>) { is <Type> -> <expr> }`
```kotlin
// 类型匹配
when (x) {
    is String -> println("It's a String");
}
```

**基本写法：when 作为表达式赋值**
`val <name> = when (<subject>) { <branches> }`
```kotlin
// when 表达式返回值
val description = when (x) {
    0 -> "Zero";
    1, 2, 3 -> "Small";
    in 4..100 -> "Medium";
    else -> "Large";
}
```

**基本写法：无参 when**
`when { <branches> }`
```kotlin
// 无参 when 替代 if-else 链
when {
    x > 0 -> println("Positive");
    x < 0 -> println("Negative");
    else -> println("Zero");
}
```

**基本写法：when 捕获变量智能转换**
`fun <name>(<param>: Any) = when (<param>) { is <Type> -> <expr> }`
```kotlin
// when 中 is 检查后智能转换
fun process(input: Any) = when (input) {
    is Int -> "Integer: ${input * 2}";
    is String -> "String of length ${input.length}";
    else -> "Unknown type";
}
```

**基本写法：for 遍历闭区间**
`for (<item> in <start>..<end>) { <body> }`
```kotlin
// 遍历闭区间
for (i in 1..5) print("$i ");
```

**基本写法：for 遍历半开区间**
`for (<item> in <start> until <end>) { <body> }`
```kotlin
// 遍历半开区间（排除末尾）
for (i in 1 until 5) print("$i ");
```

**基本写法：for 递减遍历**
`for (<item> in <start> downTo <end>) { <body> }`
```kotlin
// 递减遍历
for (i in 5 downTo 1) print("$i ");
```

**基本写法：for 带步长遍历**
`for (<item> in <range> step <n>) { <body> }`
```kotlin
// 带步长遍历
for (i in 1..10 step 2) print("$i ");
```

**基本写法：for 遍历集合**
`for (<item> in <iterable>) { <body> }`
```kotlin
// 遍历集合元素
val items = listOf("apple", "banana", "cherry");
for (item in items) println(item);
```

**基本写法：带索引遍历**
`for ((<index>, <value>) in <collection>.withIndex()) { <body> }`
```kotlin
// 带索引遍历集合
for ((index, value) in items.withIndex()) {
    println("$index: $value");
}
```

**基本写法：遍历 Map**
`for ((<key>, <value>) in <map>) { <body> }`
```kotlin
// 遍历 Map 键值对
val map = mapOf("a" to 1, "b" to 2);
for ((key, value) in map) {
    println("$key = $value");
}
```

**基本写法：while 循环**
`while (<cond>) { <body> }`
```kotlin
// while 循环
var i = 0;
while (i < 5) {
    println(i);
    i++;
}
```

**基本写法：do-while 循环**
`do { <body> } while (<cond>)`
```kotlin
// do-while 循环（至少执行一次）
var input: String;
do {
    input = readLine() ?: "";
} while (input.isEmpty());
```

**基本写法：break 跳出循环**
`break`
```kotlin
// break 跳出循环
for (i in 1..10) {
    if (i == 7) break;
    println(i);
}
```

**基本写法：continue 跳过本次**
`continue`
```kotlin
// continue 跳过当前迭代
for (i in 1..10) {
    if (i == 3) continue;
    println(i);
}
```

**基本写法：标签 break**
`break@<label>`
```kotlin
// 标签 break 跳出外层循环
loop@ for (i in 1..5) {
    for (j in 1..5) {
        if (i * j == 6) break@loop;
        println("$i * $j = ${i * j}");
    }
}
```

---

## 区间与数列

**基本写法：闭区间**
`<start>..<end>`
```kotlin
// 闭区间：包含 end
val range1 = 1..10;
```

**基本写法：字符区间**
`'<char>'..'<char>'`
```kotlin
// 字符区间
val range2 = 'a'..'z';
```

**基本写法：半开区间**
`<start> until <end>`
```kotlin
// 半开区间：不包含 end
val range3 = 1 until 10;
```

**基本写法：递减区间**
`<start> downTo <end>`
```kotlin
// 递减区间
val range4 = 10 downTo 1;
```

**基本写法：带步长区间**
`<range> step <n>`
```kotlin
// 带步长的区间
val range5 = 1..10 step 2;
```

**基本写法：递减带步长区间**
`<start> downTo <end> step <n>`
```kotlin
// 递减且带步长
val range6 = 10 downTo 1 step 3;
```

**基本写法：in 包含检查**
`<value> in <range>`
```kotlin
// 检查值是否在区间内
val range = 1..100;
3 in range;
```

**基本写法：!in 不包含检查**
`<value> !in <range>`
```kotlin
// 检查值是否不在区间内
50 !in range;
```

**基本写法：区间随机数**
`<range>.random()`
```kotlin
// 从区间获取随机数
(1..10).random();
```

**基本写法：区间首尾属性**
`<range>.[first|last]`
```kotlin
// 获取区间首尾元素
(1..10).first;
(1..10).last;
```

**基本写法：数列自定义步长**
`IntProgression.fromClosedRange(<start>, <end>, <step>)`
```kotlin
// 自定义步长的数列
val progression = IntProgression.fromClosedRange(1, 10, 3);
```

**基本写法：区间转列表**
`<range>.toList()`
```kotlin
// 区间转换为列表
val list = (1..10 step 2).toList();
```

---

## 类型检查与转换

**基本写法：is 类型检查**
`if (<obj> is <Type>) { <body> }`
```kotlin
// is 检查后智能转换
if (obj is String) {
    println(obj.length);
}
```

**基本写法：!is 类型检查**
`if (<obj> !is <Type>) { <body> }`
```kotlin
// !is 检查类型不匹配
if (obj !is String) {
    println("Not a String");
}
```

**基本写法：as 不安全类型转换**
`<obj> as <Type>`
```kotlin
// 不安全转换，可能抛出 ClassCastException
val x: Any = "Hello";
val s1: String = x as String;
```

**基本写法：as? 安全类型转换**
`<obj> as? <Type>`
```kotlin
// 安全转换，失败返回 null
val s2: String? = x as? String;
```

---

## Kotlin 2.x 新特性

**基本写法：Kotlin 2.0 K2 编译器前端**
`// 默认启用 K2 编译器`
```kotlin
// Kotlin 2.0 起默认启用 K2 编译器前端
// 无需额外配置，编译速度与稳定性显著提升
// 旧版本手动启用：在 gradle.properties 中设置 kotlin.language.version=2.0
fun main() {
    // K2 编译器对类型推断、内联函数处理更精确
    val list = listOf(1, 2, 3).map { it * 2 }
    println(list)
}
```

**基本写法：Kotlin 2.1 guard 条件 in when**
`when (<x>) { <条件> && guard -> <语句> }`
```kotlin
// when 分支支持 guard 条件，使用 if 关键字附加布尔守卫
fun classify(x: Any): String = when (x) {
    is Int if x > 0 -> "正整数"
    is Int if x < 0 -> "负整数"
    is Int -> "零"
    is String if x.isNotEmpty() -> "非空字符串"
    else -> "其他"
}
// 调用示例
println(classify(42))       // 正整数
println(classify("hello")) // 非空字符串
```

**基本写法：Kotlin 2.1 多重赋值**
`val (<a>, <b>) = <pair>`
```kotlin
// 多重赋值：解构 Pair/Triple 到多个变量
val pair = "Alice" to 30
val (name, age) = pair
println("$name $age") // Alice 30
// 用于函数返回多值场景
fun userInfo(): Pair<String, Int> = "Bob" to 25
val (n, a) = userInfo()
// 也支持 List 解构
val (first, second) = listOf(10, 20)
```

**基本写法：Kotlin 2.2 context receivers**
`context(<receiver>) fun <name>() { }`
```kotlin
// 上下文接收者：声明函数依赖的接收者上下文
class Logger { fun log(msg: String) { println(msg) } }
class Config { val env = "prod" }
// 函数同时依赖 Logger 和 Config 两个上下文
context(Logger, Config)
fun printEnv() {
    log("当前环境: $env")
}
// 调用时需在对应接收者作用域内
with(Logger()) {
    with(Config()) {
        printEnv()
    }
}
```

**基本写法：Kotlin 2.3 Java 25 互操作增强**
`// Kotlin 2.3 增强 Java 25 互操作`
```kotlin
// Kotlin 2.3 改进与 Java 25 新特性的互操作
// 支持 Java 25 模式匹配、记录类、密封类等特性的更优调用
// Java 25 密封类可在 Kotlin 中直接 when 穷尽匹配
sealed interface JShape permits JCircle, JSquare {}
// Kotlin 中无 else 分支也能穷尽匹配
fun area(s: JShape): Double = when (s) {
    is JCircle -> Math.PI * s.r * s.r
    is JSquare -> s.side * s.side
}
```
