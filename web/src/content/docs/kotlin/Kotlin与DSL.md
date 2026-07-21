---
order: 60
title: Kotlin与DSL
module: kotlin
category: Kotlin
difficulty: advanced
description: DSL构建
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/扩展函数
  - kotlin/Kotlin作用域函数
  - kotlin/Kotlin与Ktor
  - kotlin/Kotlin与Compose
prerequisites:
  - kotlin/概述与环境配置
---

## 概述

DSL（Domain-Specific Language，领域特定语言）是针对特定领域设计的专用语言。Kotlin 的扩展函数、带接收者的 lambda、中缀函数等特性，使得在 Kotlin 中构建类型安全的 DSL 非常方便。你已经在很多地方见过 Kotlin DSL：Gradle 构建脚本、Ktor 路由定义、Compose UI 声明等都是 DSL 的典型应用。

理解 DSL 的构建原理，不仅能让你更好地使用这些框架，还能让你为自己的业务领域创建专用的 DSL，提升代码的可读性和表达力。

## 基础概念

- **带接收者的 lambda**：`Type.() -> Unit`，lambda 内部的 `this` 指向接收者对象
- **构建器模式（Builder Pattern）**：DSL 通常基于构建器模式，通过链式调用构建复杂对象
- **作用域控制**：通过不同的接收者类型，限制 lambda 内部可以调用的方法
- **中缀函数**：`infix` 关键字修饰的函数，调用时可以省略点号和括号

## 快速上手

一个最简单的 DSL：

```kotlin
// 定义构建器
class HtmlBuilder {
    private val content = StringBuilder()

    fun body(block: BodyBuilder.() -> Unit) {
        val builder = BodyBuilder()
        builder.block()
        content.append("<body>${builder.build()}</body>")
    }

    fun build(): String = "<html>${content}</html>"
}

class BodyBuilder {
    private val content = StringBuilder()

    fun p(text: String) {
        content.append("<p>$text</p>")
    }

    fun h1(text: String) {
        content.append("<h1>$text</h1>")
    }

    fun build(): String = content.toString()
}

// 顶层函数，DSL 入口
fun html(block: HtmlBuilder.() -> Unit): String {
    val builder = HtmlBuilder()
    builder.block()
    return builder.build()
}

// 使用 DSL
fun main() {
    val result = html {
        body {
            h1("标题")
            p("段落内容")
        }
    }
    println(result)
    // <html><body><h1>标题</h1><p>段落内容</p></body></html>
}
```

## 详细用法

### 带接收者的 lambda

这是 DSL 的核心机制：

```kotlin
class TableBuilder {
    private val rows = mutableListOf<String>()

    // 带接收者的 lambda：在 lambda 内部 this 指向 RowBuilder
    fun row(block: RowBuilder.() -> Unit) {
        val builder = RowBuilder()
        builder.block()  // 执行 lambda，this 是 builder
        rows.add(builder.build())
    }

    fun build(): String = rows.joinToString("\n", "<table>\n", "\n</table>")
}

class RowBuilder {
    private val cells = mutableListOf<String>()

    fun cell(text: String) {
        cells.add("<td>$text</td>")
    }

    fun build(): String = cells.joinToString("", "<tr>", "</tr>")
}

fun table(block: TableBuilder.() -> Unit): String {
    val builder = TableBuilder()
    builder.block()
    return builder.build()
}

fun main() {
    val html = table {
        row {
            cell("姓名")
            cell("年龄")
        }
        row {
            cell("Alice")
            cell("25")
        }
    }
    println(html)
}
```

### 中缀函数增强 DSL

```kotlin
class SqlBuilder {
    private val parts = mutableListOf<String>()

    fun select(vararg columns: String) {
        parts.add("SELECT ${columns.joinToString(", ")}")
    }

    // 中缀函数让语法更自然
    infix fun from(table: String) {
        parts.add("FROM $table")
    }

    infix fun where(condition: String) {
        parts.add("WHERE $condition")
    }

    infix fun orderBy(column: String) {
        parts.add("ORDER BY $column")
    }

    fun build(): String = parts.joinToString(" ")
}

fun sql(block: SqlBuilder.() -> Unit): String {
    val builder = SqlBuilder()
    builder.block()
    return builder.build()
}

fun main() {
    val query = sql {
        select("name", "age", "email")
        from "users"
        where "age > 18"
        orderBy "name"
    }
    println(query)
    // SELECT name, age, email FROM users WHERE age > 18 ORDER BY name
}
```

### 作用域控制

通过不同的接收者类型，限制 lambda 内部可用的方法：

```kotlin
// 只在配置阶段可用的方法
@DslMarker
annotation class ConfigDsl

@ConfigDsl
class ServerConfig {
    var host: String = "localhost"
    var port: Int = 8080

    fun database(block: DatabaseConfig.() -> Unit) {
        val config = DatabaseConfig()
        config.block()
    }
}

@ConfigDsl
class DatabaseConfig {
    var url: String = ""
    var username: String = ""
    var password: String = ""
}

// 使用 @DslMarker 防止在嵌套 lambda 中意外调用外层方法
fun serverConfig(block: ServerConfig.() -> Unit): ServerConfig {
    val config = ServerConfig()
    config.block()
    return config
}

fun main() {
    val config = serverConfig {
        host = "0.0.0.0"
        port = 9090
        database {
            url = "jdbc:postgresql://localhost:5432/mydb"
            username = "admin"
            // 这里不能直接调用 host 或 port
            // 因为 @DslMarker 限制了作用域
        }
    }
}
```

### 泛型 DSL

```kotlin
class TreeNode<T>(val value: T) {
    private val children = mutableListOf<TreeNode<T>>()

    fun child(value: T, block: TreeNode<T>.() -> Unit = {}) {
        val node = TreeNode(value)
        node.block()
        children.add(node)
    }

    fun print(indent: Int = 0) {
        println("  ".repeat(indent) + value.toString())
        children.forEach { it.print(indent + 1) }
    }
}

fun <T> tree(root: T, block: TreeNode<T>.() -> Unit = {}): TreeNode<T> {
    val node = TreeNode(root)
    node.block()
    return node
}

fun main() {
    val org = tree("CEO") {
        child("CTO") {
            child("开发经理")
            child("测试经理")
        }
        child("CFO") {
            child("财务经理")
        }
    }
    org.print()
    // CEO
    //   CTO
    //     开发经理
    //     测试经理
    //   CFO
    //     财务经理
}
```

## 常见场景

### 配置 DSL

```kotlin
class HttpClientConfig {
    var baseUrl: String = ""
    var timeout: Int = 30000
    var retryCount: Int = 0
    private val headers = mutableMapOf<String, String>()

    fun header(name: String, value: String) {
        headers[name] = value
    }

    fun headers(): Map<String, String> = headers.toMap()
}

fun httpClient(block: HttpClientConfig.() -> Unit): HttpClientConfig {
    val config = HttpClientConfig()
    config.block()
    return config
}

fun main() {
    val config = httpClient {
        baseUrl = "https://api.example.com"
        timeout = 10000
        retryCount = 3
        header("Authorization", "Bearer token123")
        header("Accept", "application/json")
    }
    println("连接 ${config.baseUrl}，超时 ${config.timeout}ms")
}
```

### 测试 DSL

```kotlin
class TestCase(val name: String) {
    private val steps = mutableListOf<String>()
    private var setup: (() -> Unit)? = null
    private var teardown: (() -> Unit)? = null

    fun setup(block: () -> Unit) { setup = block }
    fun teardown(block: () -> Unit) { teardown = block }
    fun step(description: String, block: () -> Unit) {
        steps.add(description)
        block()
    }

    fun run() {
        println("测试: $name")
        setup?.invoke()
        steps.forEach { println("  - $it") }
        teardown?.invoke()
        println("通过")
    }
}

fun test(name: String, block: TestCase.() -> Unit) {
    val testCase = TestCase(name)
    testCase.block()
    testCase.run()
}

fun main() {
    test("用户登录") {
        setup { println("  准备测试数据") }
        step("打开登录页面") { /* ... */ }
        step("输入用户名和密码") { /* ... */ }
        step("点击登录按钮") { /* ... */ }
        step("验证跳转到首页") { /* ... */ }
        teardown { println("  清理测试数据") }
    }
}
```

### 报告生成 DSL

````kotlin
class ReportBuilder {
    private val sections = mutableListOf<String>()
    var title: String = ""

    fun section(name: String, block: SectionBuilder.() -> Unit) {
        val builder = SectionBuilder(name)
        builder.block()
        sections.add(builder.build())
    }

    fun build(): String = "# $title\n\n${sections.joinToString("\n\n")}"
}

class SectionBuilder(val name: String) {
    private val items = mutableListOf<String>()

    fun item(text: String) { items.add("- $text") }
    fun code(text: String) { items.add("```\n$text\n```") }

    fun build(): String = "## $name\n${items.joinToString("\n")}"
}

fun report(block: ReportBuilder.() -> Unit): String {
    val builder = ReportBuilder()
    builder.block()
    return builder.build()
}

fun main() {
    val text = report {
        title = "项目周报"
        section("本周进展") {
            item("完成用户模块开发")
            item("修复3个线上Bug")
        }
        section("下周计划") {
            item("开始订单模块开发")
            item("性能优化")
        }
    }
    println(text)
}
````

## 注意事项

- **使用 @DslMarker 防止作用域泄漏**：没有 @DslMarker，嵌套 lambda 中可以意外调用外层的方法
- **DSL 函数应该简洁**：每个 DSL 函数只做一件事，保持单一职责
- **避免在 DSL 中使用 return**：lambda 中的 return 会从外层函数返回，使用 return@label 或避免
- **DSL 不适合复杂逻辑**：DSL 用于声明式配置，复杂控制流应该用普通代码
- **保持不可变性**：构建完成后，结果应该是不可变的

## 进阶用法

### 动态属性

```kotlin
class AttributeBuilder {
    private val attrs = mutableMapOf<String, String>()

    // 支持动态属性名
    operator fun set(key: String, value: String) {
        attrs[key] = value
    }

    fun build(): String = attrs.entries
        .joinToString(" ") { """${it.key}="${it.value}"""" }
}

fun main() {
    val attrs = AttributeBuilder().apply {
        this["class"] = "container"
        this["id"] = "main"
        this["data-role"] = "content"
    }
    println(attrs.build())
    // class="container" id="main" data-role="content"
}
```

### 类型安全构建器

```kotlin
// 用泛型和密封类确保类型安全
sealed class Node {
    data class Element(val tag: String, val children: List<Node>, val attrs: Map<String, String>) : Node()
    data class Text(val content: String) : Node()
}

class ElementBuilder(val tag: String) {
    private val children = mutableListOf<Node>()
    private val attrs = mutableMapOf<String, String>()

    operator fun String.unaryPlus() {
        children.add(Node.Text(this))
    }

    fun attr(name: String, value: String) {
        attrs[name] = value
    }

    fun element(tag: String, block: ElementBuilder.() -> Unit = {}) {
        val builder = ElementBuilder(tag)
        builder.block()
        children.add(Node.Element(tag, builder.children, builder.attrs))
    }

    fun build(): Node.Element = Node.Element(tag, children, attrs)
}

fun element(tag: String, block: ElementBuilder.() -> Unit = {}): Node.Element {
    val builder = ElementBuilder(tag)
    builder.block()
    return builder.build()
}

fun main() {
    val doc = element("div") {
        attr("class", "container")
        element("h1") { +"标题" }
        element("p") { +"段落内容" }
    }
    println(doc)
}
```
