---
order: 67
title: Kotlin与Arrow
module: kotlin
category: Kotlin
difficulty: advanced
description: 函数式编程库Arrow
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/Kotlin与Compose
  - kotlin/Kotlin与Gradle
  - kotlin/Kotlin与Ktor
  - kotlin/Kotlin与Exposed
prerequisites:
  - kotlin/概述与环境配置
---

## 概述

Arrow 是 Kotlin 的函数式编程库，提供了一系列函数式编程的核心抽象和工具。它让你可以用更安全、更声明式的方式处理错误、异步操作和副作用。如果你来自 Haskell 或 Scala 的函数式编程背景，Arrow 会让你感到熟悉；如果你是初学者，Arrow 提供的类型安全错误处理也能显著提升代码质量。

Arrow 的核心价值在于：用类型系统来表达可能失败的计算，避免运行时异常；用不可变数据结构来避免共享可变状态；用高阶抽象来减少重复代码。

## 基础概念

- **Either**：表示两种可能的结果，Left 通常表示错误，Right 表示成功
- **Option**：表示可能存在的值，类似 Kotlin 的可空类型但更安全
- **Validated**：表示验证结果，可以累积多个错误
- **Raise**：Arrow 的新式错误处理方式，用上下文接收者实现
- **NonEmptyList**：至少包含一个元素的列表，保证非空

## 快速上手

添加依赖：

```kotlin
// build.gradle.kts
dependencies {
    implementation("io.arrow-kt:arrow-core:1.2.4")
    implementation("io.arrow-kt:arrow-fx-coroutines:1.2.4")
}
```

最简单的 Either 用法：

```kotlin
import arrow.core.Either
import arrow.core.getOrElse

// 用 Either 表示可能失败的计算
fun divide(a: Int, b: Int): Either<String, Int> =
    if (b == 0) Either.Left("除数不能为零")
    else Either.Right(a / b)

fun main() {
    val result = divide(10, 0)
    // 处理结果
    result.fold(
        { error -> println("错误: $error") },       // Left 分支
        { value -> println("结果: $value") }         // Right 分支
    )

    // 或者用 getOrElse 提供默认值
    val value = result.getOrElse { 0 }
    println("值: $value")  // 0
}
```

## 详细用法

### Either 链式操作

Either 支持函数式链式操作，避免嵌套的 if-else：

```kotlin
import arrow.core.Either
import arrow.core.flatMap
import arrow.core.left
import arrow.core.right

// 定义错误类型
sealed class UserError {
    data class NotFound(val id: String) : UserError()
    data class Unauthorized(val reason: String) : UserError()
    data class ValidationError(val message: String) : UserError()
}

data class User(val id: String, val name: String, val role: String)

// 模拟数据库查询
fun findUser(id: String): Either<UserError, User> =
    if (id == "1") User("1", "Alice", "admin").right()
    else UserError.NotFound(id).left()

// 检查权限
fun checkPermission(user: User, action: String): Either<UserError, User> =
    if (user.role == "admin" || action == "read") user.right()
    else UserError.Unauthorized("需要 admin 权限").left()

// 执行操作
fun performAction(user: User, action: String): Either<UserError, String> =
    "$user.name 执行了 $action".right()

// 用 flatMap 链式调用，避免嵌套
fun executeAction(userId: String, action: String): Either<UserError, String> =
    findUser(userId)
        .flatMap { checkPermission(it, action) }
        .flatMap { performAction(it, action) }

fun main() {
    // 成功路径
    println(executeAction("1", "delete"))  // Right(Alice 执行了 delete)

    // 失败路径：用户不存在
    println(executeAction("999", "read"))  // Left(NotFound(id=999))
}
```

### Option 替代可空类型

```kotlin
import arrow.core.Option
import arrow.core.Some
import arrow.core.None
import arrow.core.getOrElse

// Option 比 Kotlin 的可空类型更安全，因为它强制你处理空的情况
fun findCity(name: String): Option<String> =
    when (name) {
        "Beijing" -> Some("北京")
        "Shanghai" -> Some("上海")
        else -> None
    }

fun main() {
    val city = findCity("Beijing")
    // 获取值，提供默认值
    println(city.getOrElse { "未知城市" })  // 北京

    val unknown = findCity("Guangzhou")
    println(unknown.getOrElse { "未知城市" })  // 未知城市

    // map 转换
    val upperCity = city.map { it.uppercase() }
    println(upperCity.getOrElse { "" })  // 北京（中文 uppercase 不变）
}
```

### Validated 累积错误

当你需要验证多个字段并收集所有错误时，用 Validated：

```kotlin
import arrow.core.Validated
import arrow.core.Valid
import arrow.core.Invalid
import arrow.core.zip

data class RegistrationForm(
    val username: String,
    val email: String,
    val password: String
)

// 验证单个字段
fun validateUsername(name: String): Validated<String, String> =
    if (name.length < 3) Invalid("用户名至少3个字符")
    else Valid(name)

fun validateEmail(email: String): Validated<String, String> =
    if (!email.contains("@")) Invalid("邮箱格式不正确")
    else Valid(email)

fun validatePassword(password: String): Validated<String, String> =
    if (password.length < 8) Invalid("密码至少8个字符")
    else Valid(password)

// 累积所有验证错误
fun validateForm(form: RegistrationForm): Validated<List<String>, RegistrationForm> {
    // 分别验证每个字段
    val username = validateUsername(form.username).mapLeft { listOf(it) }
    val email = validateEmail(form.email).mapLeft { listOf(it) }
    val password = validatePassword(form.password).mapLeft { listOf(it) }

    // zip 会累积所有错误
    return username.zip(email, password) { u, e, p ->
        RegistrationForm(u, e, p)
    }.mapLeft { errors -> errors.flatten() }
}

fun main() {
    val badForm = RegistrationForm("ab", "invalid", "123")
    val result = validateForm(badForm)
    when (result) {
        is Valid -> println("验证通过: ${result.value}")
        is Invalid -> println("验证失败: ${result.value}")
        // 输出: 验证失败: [用户名至少3个字符, 邮箱格式不正确, 密码至少8个字符]
    }
}
```

### Raise 上下文式错误处理

Arrow 2.0 引入了基于上下文接收者的 Raise 机制，让错误处理更简洁：

```kotlin
import arrow.core.raise.Raise
import arrow.core.raise.either
import arrow.core.raise.ensure

sealed class DomainError {
    data class NotFound(val id: String) : DomainError()
    data class InvalidInput(val message: String) : DomainError()
}

// 使用 Raise 上下文，可以直接 raise 错误，不需要手动包装
context(Raise<DomainError>)
fun findUserOrRaise(id: String): User {
    val user = findUser(id)
    // 如果是 Left，直接 raise 错误
    ensure(user.isRight()) { DomainError.NotFound(id) }
    return user.getOrNull()!!
}

// 在 either 块中使用
fun main() {
    val result = either {
        val user = findUserOrRaise("999")
        user.name
    }
    println(result)  // Left(NotFound(id=999))
}
```

### 不可变数据操作

Arrow 提供了不可变数据结构，避免共享可变状态：

```kotlin
import arrow.core.NonEmptyList
import arrow.core.nel
import arrow.core.first
import arrow.core.last

// NonEmptyList：保证至少有一个元素
fun processItems(items: NonEmptyList<String>): String {
    // 不需要检查空列表，因为 NonEmptyList 保证非空
    val first = items.first()
    val last = items.last()
    return "首: $first, 尾: $last"
}

fun main() {
    // 创建 NonEmptyList
    val items = "Apple".nel() + "Banana" + "Cherry"
    println(processItems(items))  // 首: Apple, 尾: Cherry

    // 编译器保证非空，不需要空检查
    // 空列表无法创建 NonEmptyList
}
```

## 常见场景

### 安全的 API 调用链

```kotlin
import arrow.core.Either
import arrow.core.left
import arrow.core.right
import arrow.core.flatMap

sealed class ApiError {
    data class NetworkError(val message: String) : ApiError()
    data class ParseError(val message: String) : ApiError()
    data class BusinessError(val code: Int, val message: String) : ApiError()
}

// 模拟 API 调用
fun fetchUserData(userId: String): Either<ApiError, String> =
    if (userId.isNotEmpty()) """{"name":"Alice","age":25}""".right()
    else ApiError.NetworkError("用户ID为空").left()

// 模拟解析
fun parseUserData(json: String): Either<ApiError, User> =
    try {
        // 简化的解析逻辑
        User("1", "Alice", 25).right()
    } catch (e: Exception) {
        ApiError.ParseError(e.message ?: "解析失败").left()
    }

// 模拟业务验证
fun validateUser(user: User): Either<ApiError, User> =
    if (user.age >= 18) user.right()
    else ApiError.BusinessError(400, "用户未成年").left()

// 完整的调用链
fun processUser(userId: String): Either<ApiError, User> =
    fetchUserData(userId)
        .flatMap { parseUserData(it) }
        .flatMap { validateUser(it) }

fun main() {
    when (val result = processUser("1")) {
        is Either.Right -> println("成功: ${result.value}")
        is Either.Left -> println("失败: ${result.value}")
    }
}
```

### 并行执行多个任务

```kotlin
import arrow.fx.coroutines.parZip
import kotlinx.coroutines.delay

// 并行获取多个数据源
suspend fun fetchProfile(): Profile {
    delay(100)  // 模拟网络延迟
    return Profile("Alice", 25)
}

suspend fun fetchOrders(): List<Order> {
    delay(150)
    return listOf(Order("O1", 100.0), Order("O2", 200.0))
}

suspend fun fetchRecommendations(): List<String> {
    delay(80)
    return listOf("商品A", "商品B")
}

// parZip 并行执行三个任务
suspend fun loadDashboard(): Dashboard {
    return parZip(
        { fetchProfile() },
        { fetchOrders() },
        { fetchRecommendations() }
    ) { profile, orders, recommendations ->
        Dashboard(profile, orders, recommendations)
    }
}
```

## 注意事项

- **学习曲线较陡**：Arrow 引入了很多函数式编程概念，初学者可能需要时间适应
- **不要过度使用**：简单的场景用 Kotlin 原生的可空类型和 try-catch 就够了，Arrow 适合复杂的错误处理场景
- **Either vs 异常**：Either 适合可预期的业务错误，不可预期的系统错误（如内存不足）仍应使用异常
- **包体积**：Arrow 会增加一定的包体积，对于移动端需要权衡
- **与协程配合**：Arrow Fx 模块提供了与协程深度集成的函数式并发工具

## 进阶用法

### 自定义 Either 扩展

```kotlin
import arrow.core.Either
import arrow.core.left
import arrow.core.right

// 为 Either 添加实用扩展
fun <L, R> Either<L, R>.onSuccess(action: (R) -> Unit): Either<L, R> {
    if (this is Either.Right) action(value)
    return this
}

fun <L, R> Either<L, R>.onFailure(action: (L) -> Unit): Either<L, R> {
    if (this is Either.Left) action.value)
    return this
}

// 使用示例
fun main() {
    val result = divide(10, 2)
        .onSuccess { println("计算成功: $it") }
        .onFailure { println("计算失败: $it") }
}
```

### Optics（透镜）

Arrow 的 Optics 模块提供了优雅的深层数据修改方式：

```kotlin
import arrow.optics.Lens
import arrow.optics.compose
import arrow.optics.modify

data class Address(val city: String, val street: String)
data class Company(val name: String, val address: Address)
data class Employee(val name: String, val company: Company)

// 定义透镜，用于安全地修改嵌套数据
val companyAddressLens = Lens<Company, Address>(
    get = { it.address },
    set = { company, address -> company.copy(address = address) }
)

val addressCityLens = Lens<Address, String>(
    get = { it.city },
    set = { address, city -> address.copy(city = city) }
)

// 组合透镜，直接修改深层字段
val companyCityLens = companyAddressLens compose addressCityLens

fun main() {
    val employee = Employee(
        "Alice",
        Company("Acme", Address("Beijing", "Main St"))
    )

    // 用透镜修改深层嵌套的城市字段
    val updated = companyCityLens.modify(employee.company) { it.uppercase() }
    println(updated.address.city)  // BEIJING
}
```
