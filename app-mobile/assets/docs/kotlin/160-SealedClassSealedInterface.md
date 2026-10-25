---
order: 170
title: 密封类与密封接口：受限继承与穷举检查
module: 'kotlin'
category: 后端技术
difficulty: advanced
description: "Kotlin 密封类型深水参考：封闭继承的编译期约束、when 穷举检查与智能转换的编译器实现（K1/K2、@Metadata）、协变与 Nothing、密封接口多继承、多态序列化，附真实编译报错与调试实录。"
author: fanquanpp
updated: '2026-10-05'
related:
  - 'kotlin/150-SealedClassAlgebraicDataType'
  - 'kotlin/060-KotlinDataClassDeepDive'
  - 'kotlin/170-KotlinGenericTypeSystem'
  - 'kotlin/340-KotlinSerialization'
  - 'kotlin/430-KotlinJavaInterop'
prerequisites:
  - 'kotlin/050-KotlinClassObject'
  - 'kotlin/060-KotlinDataClassDeepDive'
  - 'kotlin/170-KotlinGenericTypeSystem'
---

> 定位说明：本篇为进阶参考书（参考层），面向已完成本模块主线的读者；入门请先走学习路径前序阶段。定位标准见 docs/standards/reference-layer.md（仓库）。

## 前置知识

- [类与对象](/kotlin/050-KotlinClassObject)：继承、抽象类与接口的基本语义，是理解「受限继承」的前提
- [数据类](/kotlin/060-KotlinDataClassDeepDive)：`data class` 是密封类型中「携带数据分支」的标准载体
- [泛型与型变](/kotlin/170-KotlinGenericTypeSystem)：`out T` 协变与 `Nothing` 底类型，理解 `Result<Nothing>` 可赋给任意 `Result<T>` 的基础
- [密封类与代数数据类型](/kotlin/150-SealedClassAlgebraicDataType)：前置教学篇，覆盖 ADT 的入门视角

## 学习目标

- 说出密封类/密封接口的四条编译期约束，并能解释每条约束为什么是穷举检查的前提
- 预测任意 `when` 表达式能否通过穷举检查，包括嵌套密封类、`object` 子类与可空接收者三种边界
- 读懂 K1/K2 编译器穷举报错，并用「表达式化 when + 禁用 else」的固定套路修复
- 在 MVI、状态机、多态序列化三类架构场景中正确选型：密封类、密封接口还是枚举
- 识别 Java 互操作下穷举检查失效的缺口，以及 `sealedSubclasses` 反射在混淆环境中的风险

## 问题引入：一个 else 分支掩盖的所有 bug

面向对象的传统继承是**开放的**：任何类都可以继承 `open class`（除非标 `final`）。这带来一个隐蔽的类型安全漏洞：

```kotlin
open class Shape
class Circle(val radius: Double) : Shape()
class Square(val side: Double) : Shape()

fun area(shape: Shape): Double = when (shape) {
    is Circle -> Math.PI * shape.radius * shape.radius
    is Square -> shape.side * shape.side
    else -> 0.0  // 兜底分支
}
```

这段代码今天是对的，明天就可能是错的：新增 `Triangle` 子类时，编译器不会提示 `area` 需要更新——`else` 分支默默吞掉它，所有三角形面积变成 0.0。三个连锁问题由此而来：编译器无法穷举开放集合；新增子类全靠人工检查每处 `when`；`else` 分支把「遗漏」从编译错误降级成运行时静默错误。

**密封类型（sealed types）就是解决方案**：把子类集合从「开放」收窄为「编译期封闭」，让编译器有能力证明 `when` 覆盖了所有情况。这不是新发明——ML 的 `datatype`、Haskell 的 `data`、Rust 的 `enum` 都是这个思想，Kotlin 用 `sealed` 关键字把它带进了 JVM 生态。

## 核心概念

### 密封类的定义与四条约束

```kotlin
sealed class NetworkResult<out T> {
    object Loading : NetworkResult<Nothing>()
    data class Success<T>(val data: T) : NetworkResult<T>()
    data class Error(val message: String) : NetworkResult<Nothing>()
}
```

一个密封类在编译期被固定为四条约束：

1. **封闭性**：直接子类集合有限且编译期完全已知。这是穷举检查的根基。
2. **不可实例化**：密封类默认抽象，不能 `NetworkResult()`。
3. **不可外部扩展**：集合之外的任何类不能继承它——不是约定，是编译错误。
4. **位置约束**：所有子类必须与密封类**同包**（Kotlin 1.5+；1.0-1.4 要求同文件），且在**同一 Gradle 模块**内。跨模块继承一票否决。

构造器可见性是容易被忽视的第五点：密封类主构造器默认 `protected`，只能声明为 `protected` 或 `private`。写成 public 直接报错（见「常见错误」一节）。

**版本演化速览**（细节按需查阅，不影响理解主干）：

| 版本 | 变化 |
| --- | --- |
| 1.0 (2016) | 密封类子类必须嵌套在密封类内部 |
| 1.1 (2017) | 子类可放在同文件任意位置 |
| 1.5 (2021) | 子类放宽到同包跨文件；`sealed interface` 发布 |
| 1.7 (2022) | 非穷举 `when` 语句从警告升级为错误；密封接口可嵌套 |
| 2.0 (2024) | K2 编译器：FIR 一次分析子类列表，穷举报错精确列出缺失分支，KMP 各平台行为一致 |

### 和类型与积类型：为什么这个设计够用

密封类型对应函数式编程中的**和类型**（Sum Type）：`NetworkResult` 的一个值，是 `Loading`、`Success`、`Error` 三者之一。各分支自身的字段组合是**积类型**（Product Type）：`Success` 是 `data` 与类型参数 `T` 的组合。`object` 分支则是只有一个值的单位类型。

Kotlin 的取舍是不做模式解构（Rust/Scala 的绑定模式），而是用 **`is` 类型检查 + 智能转换**达成同样目标：分支内直接访问子类成员，嵌套结构用嵌套 `when`。表达力稍弱，语法更平；配合 `data class` 自动生成的 `equals/hashCode/copy`，ADT 的工程价值一分不少。

递归和类型（表达式树、JSON 树）也一样成立——`Expr` 的子类字段类型又是 `Expr`，构成递归定义；对它的 `when` 求值本质上就是一次折叠（catamorphism），见下面代码示例 2。

### when 穷举检查的规则

穷举检查只在 `when` 作为**表达式**（有值被使用）时强制。编译器把各分支匹配的类型集合与密封类的子类全集比对，缺一个即报错：

```kotlin
fun handle(r: NetworkResult<Int>): String = when (r) {
    NetworkResult.Loading -> "Loading"     // object 子类：直接引用（等价 ===）
    is NetworkResult.Success -> "ok ${r.data}"  // 普通子类：is + 智能转换
    is NetworkResult.Error -> "err ${r.message}"
    // 没有 else：编译器证明三分支覆盖全集
}
```

三条关键规则：

- **`object` 子类用直接引用**（`NetworkResult.Loading`），不用 `is`——单例比较比类型检查更精确，也触发穷举。
- **嵌套密封类**允许两种写法：外层匹配到 `Content` 后用嵌套 `when` 继续穷举其子类；或直接扁平化，把 `Content.UserList` 等孙类写成顶层分支，编译器同样认可。扁平化更简洁。
- **可空接收者**：`when (r: NetworkResult<Int>?)` 需要额外覆盖 `null` 分支（或 `else`）。K2 能识别 `null ->` 分支与 `is` 分支的组合。

`when` 作为**语句**（丢弃返回值）不强制穷举——这是历史陷阱。Kotlin 1.7 起对密封类型接收者的非穷举 `when` 语句直接报错，但建议不要依赖版本兜底：**永远把 `when` 写成表达式**，不需要返回值时用 `val ignored = when (state) { ... }` 强制编译器检查。

实现机制上，K1 扫描密封类所在包收集子类，把列表序列化进 `@Metadata` 注解，`when` 检查时比对；K2 通过 FIR 一次分析完成收集，跨模块时直接读取依赖模块元数据，报错能精确列出缺失的子类名。

### 密封类、密封接口与枚举的选型

| 维度 | sealed class | sealed interface | enum class |
| --- | --- | --- | --- |
| 多继承（一个类进入多个族） | 否（单继承） | 是 | 否 |
| 分支携带异构数据 | 是 | 是 | 否（所有值同结构） |
| 泛型 | 是 | 是 | 否 |
| 枚举作为子类型 | 否 | 是 | - |
| 引入版本 | 1.0 | 1.5 | 1.0 |

选型口诀：分支需要共享状态或方法实现 → 密封类；仅为分类、子类已继承别的类、或需要枚举参与 → 密封接口；所有值同构且都是单例 → 枚举。类型集合编译期不可知（插件式扩展）则都不选——密封类型建模的是封闭集合，强套它就违反开闭原则。

密封接口的核心价值是**多维度能力正交**：`Button` 可同时属于 `Drawable`、`Clickable`、`Focusable` 三个密封接口，每个接口的 `when` 独立穷举，新增不实现 `Clickable` 的 `Image` 不会影响点击处理的穷举。

### 泛型、协变与 Nothing

密封类与密封接口都支持类型参数。典型模式是协变 + `Nothing`：

```kotlin
sealed class Result<out T> {
    data class Success<T>(val value: T) : Result<T>()
    data class Error(val message: String) : Result<Nothing>()
    object Loading : Result<Nothing>()
}

val r: Result<Int> = Result.Loading  // OK：Result<Nothing> 是任意 Result<T> 的子类型
```

`out T` 协变保证 `Result<Nothing> <: Result<Int>`，于是不携带数据的分支（`Error`、`Loading`）可以统一赋给任意参数化的 `Result<T>`，`when` 分支处理时无需强转。

### 智能转换及其边界

`is` 分支内的智能转换由编译器的类型细化（type narrowing）保证，但有边界：类级别 **`var` 属性**可能被其他线程改写，智能转换直接失效。安全写法是先取快照：

```kotlin
class ViewModel {
    var state: Result<Int> = Result.Loading

    fun render() {
        val snapshot = state  // 快照为局部 val
        if (snapshot is Result.Success) {
            println(snapshot.value)  // 安全：快照不可变，智能转换成立
        }
    }
}
```

类级别的 `val` 属性智能转换成立；局部变量（无论 var/val）在无并发捕获时也成立。

### 字节码表示与 Java 互操作

JVM 字节码层面，密封类就是一个普通抽象类 + `@Metadata` 注解（子类列表存在其中供跨模块穷举检查）。这带来两个工程事实：

1. **Java 侧可以继承 Kotlin 密封类**——JVM 不强制，Kotlin 编译器也检测不到这个 Java 子类。一旦发生，`when` 穷举检查在 Kotlin 侧悄悄失效（编译器被迫要求 `else`）。规则：密封类型的继承体系必须封闭在 Kotlin 代码内，接口文档应明示禁止 Java 继承。
2. Java 17 引入了带 `permits` 子句的 `sealed`，子类必须显式列出且修饰符限 `final`/`sealed`/`non-sealed`；Kotlin 靠同包自动收集，子类修饰符不限。二者在字节码层目前并不互通，Kotlin 侧视 Java `sealed` 为普通类。

顺带一提：`KClass.sealedSubclasses` 可以在运行时列出子类（配合 `objectInstance` 枚举单例分支），但它是反射，在 R8/ProGuard 混淆或 Kotlin/Native 冻结优化下可能失效，核心逻辑不要依赖它。

## 完整代码示例

### 示例 1：网络请求结果的三态建模

语言：Kotlin。预期输出见代码后。

```kotlin
sealed class NetworkResult<out T> {
    object Loading : NetworkResult<Nothing>()
    data class Success<T>(val data: T) : NetworkResult<T>()
    data class Error(val message: String, val cause: Throwable? = null) : NetworkResult<Nothing>()
}

fun <T> handleResult(result: NetworkResult<T>): String = when (result) {
    NetworkResult.Loading -> "Loading..."
    is NetworkResult.Success -> "Success: ${result.data}"
    is NetworkResult.Error -> "Error: ${result.message}"
}

fun main() {
    println(handleResult(NetworkResult.Loading))
    println(handleResult(NetworkResult.Success(42)))
    println(handleResult(NetworkResult.Error("Network error")))
}
```

输出：

```text
Loading...
Success: 42
Error: Network error
```

### 示例 2：递归表达式树的求值与化简

语言：Kotlin。递归和类型 + 递归 `when`，树形结构的标准写法。

```kotlin
sealed class Expr {
    data class Const(val value: Double) : Expr()
    data class Var(val name: String) : Expr()
    data class Sum(val left: Expr, val right: Expr) : Expr()
    data class Mul(val left: Expr, val right: Expr) : Expr()
}

fun eval(expr: Expr, env: Map<String, Double> = emptyMap()): Double = when (expr) {
    is Expr.Const -> expr.value
    is Expr.Var -> env[expr.name] ?: error("Undefined variable: ${expr.name}")
    is Expr.Sum -> eval(expr.left, env) + eval(expr.right, env)
    is Expr.Mul -> eval(expr.left, env) * eval(expr.right, env)
}

fun simplify(expr: Expr): Expr = when (expr) {
    is Expr.Sum -> {
        val l = simplify(expr.left)
        val r = simplify(expr.right)
        when {
            l is Expr.Const && l.value == 0.0 -> r        // 0 + x = x
            r is Expr.Const && r.value == 0.0 -> l        // x + 0 = x
            l is Expr.Const && r is Expr.Const -> Expr.Const(l.value + r.value)
            else -> Expr.Sum(l, r)
        }
    }
    is Expr.Mul -> {
        val l = simplify(expr.left)
        val r = simplify(expr.right)
        when {
            l is Expr.Const && l.value == 1.0 -> r        // 1 * x = x
            r is Expr.Const && r.value == 1.0 -> l        // x * 1 = x
            l is Expr.Const && r is Expr.Const -> Expr.Const(l.value * r.value)
            else -> Expr.Mul(l, r)
        }
    }
    else -> expr  // Const 与 Var 已是化简终点
}

fun main() {
    // (1 + 2) * (3 + 4) = 21
    val expr = Expr.Mul(
        Expr.Sum(Expr.Const(1.0), Expr.Const(2.0)),
        Expr.Sum(Expr.Const(3.0), Expr.Const(4.0))
    )
    println(eval(expr))

    val simplified = simplify(Expr.Sum(Expr.Const(0.0), Expr.Var("x")))
    println(simplified)
}
```

输出：

```text
21.0
Var(name=x)
```

### 示例 3：密封接口的多能力正交穷举

语言：Kotlin。`Image` 与 `Divider` 不实现 `Clickable`，点击侧的 `when` 天然不含它们。

```kotlin
sealed interface Drawable { fun draw(): String }
sealed interface Clickable { fun onClick(): String }

data class Button(val label: String) : Drawable, Clickable {
    override fun draw() = "Button($label) drawn"
    override fun onClick() = "Button($label) clicked"
}
data class TextField(val text: String) : Drawable, Clickable {
    override fun draw() = "TextField drawn"
    override fun onClick() = "TextField clicked"
}
data class Image(val url: String) : Drawable {
    override fun draw() = "Image($url) drawn"
}
object Divider : Drawable {
    override fun draw() = "Divider drawn"
}

fun render(d: Drawable): String = when (d) {
    is Button -> "Rendering: ${d.draw()}"
    is TextField -> "Rendering: ${d.draw()}"
    is Image -> "Rendering: ${d.draw()}"
    Divider -> "Rendering: ${d.draw()}"
}

fun handleClick(c: Clickable): String = when (c) {
    is Button -> c.onClick()
    is TextField -> c.onClick()
}

fun main() {
    println(render(Button("Submit")))
    println(render(Image("logo.png")))
    println(handleClick(Button("OK")))
}
```

输出：

```text
Rendering: Button(Submit) drawn
Rendering: Image(logo.png) drawn
Button(OK) clicked
```

### 示例 4：多态序列化（kotlinx.serialization）

语言：Kotlin。`@SerialName` 指定鉴别器值，`type` 字段（默认 `classDiscriminator`）决定反序列化为哪个子类。

```kotlin
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import kotlinx.serialization.json.Json
import kotlinx.serialization.encodeToString

@Serializable
sealed class Message {
    @Serializable @SerialName("text")
    data class Text(val content: String, val author: String) : Message()

    @Serializable @SerialName("image")
    data class Image(val url: String, val author: String) : Message()

    @Serializable @SerialName("system")
    data class SystemNotice(val action: String) : Message()
}

fun main() {
    val json = Json { ignoreUnknownKeys = true }

    val messages: List<Message> = listOf(
        Message.Text("Hello", "Alice"),
        Message.Image("https://example.com/1.png", "Bob")
    )
    val encoded = json.encodeToString(messages)
    println(encoded)

    val decoded: List<Message> = json.decodeFromString(encoded)
    decoded.forEach { msg ->
        val desc = when (msg) {
            is Message.Text -> "[Text] ${msg.author}: ${msg.content}"
            is Message.Image -> "[Image] ${msg.author}: ${msg.url}"
            is Message.SystemNotice -> "[System] ${msg.action}"
        }
        println(desc)
    }
}
```

输出（JSON 字段顺序与声明一致）：

```text
[{"type":"text","content":"Hello","author":"Alice"},{"type":"image","url":"https://example.com/1.png","author":"Bob"}]
[Text] Alice: Hello
[Image] Bob: https://example.com/1.png
```

## 常见错误与调试实录

### 1. 缺分支：when 表达式不穷举

新增 `Error` 子类后，旧的 `when` 缺分支。K1 报错原文：

```text
error: when expression must be exhaustive, add necessary 'is Result.Error' branch or an 'else' expression instead
```

K2 措辞不同，但会精确列出缺失的子类名。修复永远选「补分支」而不是「加 else」——加 else 等于关掉这道保险，下次新增子类时错误回归为静默的运行时逻辑错误。

### 2. when 语句漏写穷举（1.7 前后的行为差异）

```kotlin
fun handle(r: Result<Int>) {
    when (r) {                       // 语句形态
        is Result.Success -> println(r.value)
        Result.Loading -> println("Loading")
    }
}
```

Kotlin 1.6 给出的迁移警告：

```text
warning: non exhaustive when statements on sealed class/interface will be prohibited in 1.7,
add necessary 'is Result.Error' branch or an 'else' expression instead
```

Kotlin 1.7 起该警告升级为编译错误。老工程升级 Kotlin 版本时，这类报错集中出现属正常现象，逐个补分支即可。

### 3. 密封类构造器声明为 public

```kotlin
sealed class Result public constructor()  // 编译错误
```

报错原文：

```text
error: modifier 'public' is incompatible with 'sealed'
```

密封类构造器只允许默认的 `protected` 或显式 `private`（后者可用于强制经伴生对象工厂创建）。

### 4. 子类跨包/跨模块

```kotlin
// module-a
sealed class ApiEvent

// module-b（依赖 module-a）
class ClickEvent : ApiEvent()  // 编译错误
```

不同 Kotlin 版本报错措辞有差异，核心一致：密封类型的继承者必须与密封类同包且同模块。修复思路：要么把子类搬回密封类所在模块，要么把 `ApiEvent` 改成普通接口并用其他手段（如注册表）管理实现集合。注意 1.5 的「同包跨文件」放宽不包括跨 Gradle 模块。

### 5. 智能转换失效

```kotlin
class VM {
    var state: State = State.Idle
    fun check() {
        if (state is State.Loading) {
            println(state.progress)  // 编译错误
        }
    }
}
```

报错原文：

```text
error: smart cast to 'State.Loading' is impossible, because 'state' is a mutable property
that could have been changed by this time
```

修复：`val snapshot = state` 取局部快照后再检查。这是处理可变 UI 状态的标准防御写法。

### 6. @SerialName 重复导致序列化器构建失败

两个子类写了相同的 `@SerialName("text")`，反序列化时无法区分。`kotlinx.serialization` 在构建多态序列化器时抛出 `SerializationException`（内部类型 `DuplicateSerialNameException`），消息会指出冲突的 serial name 与两个类名。修复：保证密封族内每个 `@SerialName` 唯一；该值会进入线上协议 JSON，改动前先确认兼容性。

### 7. Java 侧继承破坏穷举（无编译报错，最危险）

```java
// Java 代码：JVM 不拦截，编译通过
public class JavaState extends KotlinState { }
```

此后 Kotlin 侧对该密封类的 `when` 将不再被视为封闭集合，编译器会（在 K2 下）要求补 `else`——很多团队把这个 `else` 当成「随手修复」加上了，实际上是穷举防线整体失效的信号。正确响应是排查谁在 Java 里继承了密封类型，而不是补 else。

### 8. == 比较 data class 分支的逻辑误用

```kotlin
if (s == State.Loading(50)) { ... }  // 仅当 progress 恰为 50 时成立
```

意图是「是否处于 Loading 态」，写成了值比较。分支判断用 `s is State.Loading`；值比较只在确需判断具体负载时使用。这类 bug 不报错、只在特定数据下触发，Review 时重点盯 `==` 的右侧是不是构造了一个新分支对象。

## 实际场景

### MVI 单向数据流

MVI（Model-View-Intent）用三个密封类型分别建模状态、意图与副作用，reducer 穷举全部 `state x wish` 组合。穷举检查在这里的价值是结构性的：新增一个 `Wish` 分支，所有未处理它的 reducer 立即编译失败。

```kotlin
sealed class Wish {
    data class LoadUser(val id: String) : Wish()
    object Refresh : Wish()
    object Logout : Wish()
}

sealed class ScreenState<out T> {
    object Idle : ScreenState<Nothing>()
    object Loading : ScreenState<Nothing>()
    data class Content<T>(val data: T) : ScreenState<T>()
    data class Error(val message: String, val retry: () -> Unit) : ScreenState<Nothing>()
}

val reducer: (ScreenState<User>, Wish) -> ScreenState<User> = { state, wish ->
    when (state) {
        ScreenState.Idle -> when (wish) {
            is Wish.LoadUser -> ScreenState.Loading
            Wish.Refresh, Wish.Logout -> state
        }
        ScreenState.Loading -> state                                  // 加载中忽略一切
        is ScreenState.Content -> when (wish) {
            is Wish.LoadUser, Wish.Refresh -> ScreenState.Loading
            Wish.Logout -> ScreenState.Idle
        }
        is ScreenState.Error -> when (wish) {
            is Wish.LoadUser, Wish.Refresh -> ScreenState.Loading
            Wish.Logout -> ScreenState.Idle
        }
    }
}
```

一次性副作用（Toast、导航）用 `Channel` 承载的独立密封类型 `Effect`，避免塞进状态里被重复消费。

### 状态机与事件溯源

订单流、审批流这类「状态 x 事件 → 下一状态」的模型是穷举检查的主场：外层穷举状态，内层穷举事件，非法组合显式 `error(...)`，把非法状态转移从「运行时偶发」变成「编译期可见」。（完整订单状态机实现见本模块[密封类与代数数据类型](/kotlin/150-SealedClassAlgebraicDataType)。）事件溯源中，领域事件建模为密封类后，`fold` 回放天然穷举所有事件类型。

### KMP 跨平台共享模型

`NetworkResult`、领域实体状态这类模型放在 `commonMain`，`when` 穷举逻辑共享；各平台（Android/iOS）只消费状态渲染 UI。K2 保证 JVM/JS/Native 三个编译后端的穷举检查行为一致，同一份密封模型不会因平台不同产生检查差异。

### 与相关技术的边界

- 需要反射式类型发现（如按注解扫描处理器）：密封类型的 `sealedSubclasses` 是受限工具，混淆环境不可靠，大规模插件场景用服务发现而非密封类型。
- 序列化协议版本演进：给密封族新增 `@SerialName` 是**破坏性变更**的反向（老客户端读到未知 type 会抛异常），跨端协议新增分支需灰度。

## 与相关篇目关系

- [密封类与代数数据类型](/kotlin/150-SealedClassAlgebraicDataType)：同一主题的教学篇，从 ADT 概念切入；本篇是其深水参考。
- [数据类](/kotlin/060-KotlinDataClassDeepDive)：密封族的「携带数据分支」几乎总是 data class。
- [泛型与型变](/kotlin/170-KotlinGenericTypeSystem)：`out T` 与 `Nothing` 的系统讲解。
- [Kotlin 序列化](/kotlin/340-KotlinSerialization)：多态序列化（@SerialName/classDiscriminator）的完整规则。
- [Kotlin 与 Java 互操作](/kotlin/430-KotlinJavaInterop)：本篇「Java 继承缺口」的互操作全局视角。

## 官方文档

- Kotlin Sealed classes/interfaces: https://kotlinlang.org/docs/sealed-classes.html
- Kotlin when 表达式与穷举规则: https://kotlinlang.org/docs/control-flow.html#when-expression
- 智能转换与类型细化: https://kotlinlang.org/docs/typecasts.html#smart-casts
- kotlinx.serialization 多态序列化: https://github.com/Kotlin/kotlinx.serialization/blob/master/docs/polymorphism.md
- Kotlin 2.0（K2）发布说明: https://kotlinlang.org/docs/whatsnew20.html
- JEP 409（Java 17 sealed classes，用于对比）: https://openjdk.org/jeps/409

## 总结

密封类型把「子类集合」从运行时的开放问题变成编译期的封闭事实，`when` 穷举检查、智能转换、多态序列化全部建立在这个事实上。掌握本篇后应能：写出通过穷举检查且不需要 `else` 的 `when`；在密封类、密封接口、枚举之间按「是否需要共享实现/多能力/同构单例」选型；读懂穷举失败、构造器可见性、子类位置、智能转换失效四类高频编译报错并按固定套路修复；警惕 Java 互操作与混淆环境两个让防线失效的缺口。进阶主题（模式匹配增强、KEEP 演进动向）关注 kotlinlang.org 路线图即可，本篇不展开。
