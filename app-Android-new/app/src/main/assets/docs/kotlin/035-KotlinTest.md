---
order: 350
title: Kotlin 与测试
module: 'kotlin'
category: 后端技术
difficulty: intermediate
description: Kotlin测试框架
author: fanquanpp
updated: '2026-08-01'
related:
  - 'kotlin/037-KotlinGradle'
  - 'kotlin/026-KotlinAndroid'
  - 'kotlin/033-KotlinKoin'
  - 'kotlin/036-KotlinCompilerPlugin'
prerequisites:
  - 'kotlin/002-KotlinOverviewEnvSetup'
---

## 前置知识

- [Kotlin 与 ktor-client](/kotlin/034-KotlinKtorClient)：建议先完成前一篇的学习

## 学习目标

- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱
- 掌握「常见场景」的核心机制、典型用法与常见陷阱


## 概述

测试是保证代码质量的关键手段。Kotlin 项目可以使用 JUnit 5、Kotest、MockK 等测试框架，结合 Kotlin 的语言特性（如扩展函数、协程、数据类），编写简洁而强大的测试代码。本文介绍 Kotlin 中常用的测试方法和最佳实践。

## 基础概念

- **单元测试**：测试单个函数或类，不依赖外部资源（数据库、网络等）
- **集成测试**：测试多个组件协作是否正确
- **Mock（模拟）**：用模拟对象替代真实依赖，隔离被测代码
- **Assertion（断言）**：验证实际结果是否符合预期
- **Test Fixture**：测试的前置条件，如测试数据、环境配置等

## 快速上手

添加测试依赖：

```kotlin
// build.gradle.kts
dependencies {
    testImplementation(kotlin("test"))           // Kotlin 测试库
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.0")
    testImplementation("io.mockk:mockk:1.13.8")  // Mock 框架
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.0")
}

tasks.withType<Test> {
    useJUnitPlatform()  // 启用 JUnit 5
}
```

最简单的测试：

```kotlin
import kotlin.test.Test
import kotlin.test.assertEquals

// 被测类
class Calculator {
    fun add(a: Int, b: Int): Int = a + b
    fun divide(a: Int, b: Int): Double {
        require(b != 0) { "除数不能为零" }
        return a.toDouble() / b
    }
}

// 测试类
class CalculatorTest {
    private val calculator = Calculator()

    @Test
    fun `add should return sum of two numbers`() {
        val result = calculator.add(2, 3)
        assertEquals(5, result)
    }

    @Test
    fun `divide should throw exception when divisor is zero`() {
        org.junit.jupiter.api.assertThrows<IllegalArgumentException> {
            calculator.divide(10, 0)
        }
    }
}
```

## 详细用法

### JUnit 5 常用注解

```kotlin
import org.junit.jupiter.api.*
import org.junit.jupiter.api.Assertions.*

class UserServiceTest {
    private lateinit var service: UserService

    // 每个测试前执行
    @BeforeEach
    fun setUp() {
        service = UserService()
    }

    // 每个测试后执行
    @AfterEach
    fun tearDown() {
        // 清理资源
    }

    // 所有测试前执行一次
    @BeforeAll
    companion object {
        @JvmStatic
        fun initAll() {
            println("测试开始")
        }
    }

    @Test
    fun `should create user with valid data`() {
        val user = service.createUser("Alice", "alice@example.com")
        assertNotNull(user)
        assertEquals("Alice", user.name)
    }

    @Test
    fun `should throw exception for invalid email`() {
        assertThrows<IllegalArgumentException> {
            service.createUser("Alice", "invalid-email")
        }
    }

    // 参数化测试
    @ParameterizedTest
    @ValueSource(strings = ["test@example.com", "user@domain.org"])
    fun `should accept valid emails`(email: String) {
        assertDoesNotThrow {
            service.validateEmail(email)
        }
    }

    // 嵌套测试
    @Nested
    inner class ValidationTests {
        @Test
        fun `should reject empty name`() {
            assertThrows<IllegalArgumentException> {
                service.createUser("", "test@example.com")
            }
        }
    }

    // 禁用测试
    @Disabled("暂时跳过")
    @Test
    fun `todo test`() {
        // 暂时不执行
    }
}
```

### 使用 MockK 模拟依赖

```kotlin
import io.mockk.*
import org.junit.jupiter.api.*

class OrderServiceTest {
    // 模拟依赖
    private val repository = mockk<OrderRepository>()
    private val emailService = mockk<EmailService>()
    private val service = OrderService(repository, emailService)

    @BeforeEach
    fun setUp() {
        // 每个测试前清除 mock 状态
        clearMocks(repository, emailService)
    }

    @Test
    fun `should create order and send email`() {
        // 准备测试数据
        val order = Order(id = "1", userId = "u1", amount = 100.0)

        // 设置 mock 行为
        every { repository.save(any()) } returns order
        every { emailService.sendOrderConfirmation(any()) } just Runs

        // 执行被测方法
        val result = service.createOrder("u1", 100.0)

        // 验证结果
        assertEquals("1", result.id)

        // 验证 mock 被正确调用
        verify(exactly = 1) { repository.save(any()) }
        verify(exactly = 1) { emailService.sendOrderConfirmation(order) }
    }

    @Test
    fun `should throw when repository fails`() {
        // 模拟异常
        every { repository.save(any()) } throws RuntimeException("数据库错误")

        assertThrows<RuntimeException> {
            service.createOrder("u1", 100.0)
        }

        // 验证邮件没有发送
        verify(exactly = 0) { emailService.sendOrderConfirmation(any()) }
    }

    @Test
    fun `should return order by id`() {
        val order = Order(id = "1", userId = "u1", amount = 100.0)
        every { repository.findById("1") } returns order
        every { repository.findById("999") } returns null

        val found = service.getOrder("1")
        assertEquals(order, found)

        val notFound = service.getOrder("999")
        assertNull(notFound)
    }
}
```

### 测试协程

```kotlin
import kotlinx.coroutines.test.*
import org.junit.jupiter.api.*

class CoroutineServiceTest {
    private val repository = mockk<UserRepository>()
    private val service = UserService(repository)

    @Test
    fun `should load user asynchronously`() = runTest {
        // runTest 是协程测试的入口，自动跳过 delay
        val user = User(id = "1", name = "Alice")
        coEvery { repository.getUserAsync("1") } returns user

        val result = service.loadUserAsync("1")

        assertEquals(user, result)
        coVerify { repository.getUserAsync("1") }
    }

    @Test
    fun `should handle timeout`() = runTest {
        coEvery { repository.getUserAsync("1") } coAnswers {
            delay(5000)  // 模拟超时
            User("1", "Alice")
        }

        assertThrows<TimeoutCancellationException> {
            withTimeout(1000) {
                service.loadUserAsync("1")
            }
        }
    }
}
```

### 测试数据类

```kotlin
data class User(val id: String, val name: String, val email: String, val age: Int)

class UserTest {
    @Test
    fun `data class equality is based on properties`() {
        val user1 = User("1", "Alice", "alice@test.com", 25)
        val user2 = User("1", "Alice", "alice@test.com", 25)
        // 数据类的 equals 基于属性值
        assertEquals(user1, user2)
    }

    @Test
    fun `copy creates new instance with modified properties`() {
        val user = User("1", "Alice", "alice@test.com", 25)
        val older = user.copy(age = 26)
        assertEquals(26, older.age)
        assertEquals(25, user.age)  // 原对象不变
    }

    @Test
    fun `destructuring works correctly`() {
        val user = User("1", "Alice", "alice@test.com", 25)
        val (id, name, email, age) = user
        assertEquals("1", id)
        assertEquals("Alice", name)
    }
}
```

## 常见场景

### 测试 ViewModel

```kotlin
import kotlinx.coroutines.test.*
import org.junit.jupiter.api.*

class UserViewModelTest {
    private val repository = mockk<UserRepository>()
    private lateinit var viewModel: UserViewModel

    @BeforeEach
    fun setUp() {
        viewModel = UserViewModel(repository)
    }

    @Test
    fun `loadUser should update uiState`() = runTest {
        val user = User("1", "Alice")
        coEvery { repository.getUser("1") } returns user

        viewModel.loadUser("1")

        // 验证状态更新
        val state = viewModel.uiState.value
        assertEquals(user, state.user)
        assertFalse(state.isLoading)
    }
}
```

### 测试异常场景

```kotlin
class ErrorHandlingTest {
    @Test
    fun `should return failure for network error`() = runTest {
        val repository = mockk<UserRepository>()
        coEvery { repository.getUser("1") } throws IOException("网络错误")

        val service = UserService(repository)
        val result = service.safeGetUser("1")

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IOException)
    }

    @Test
    fun `should return default value on error`() = runTest {
        val repository = mockk<UserRepository>()
        coEvery { repository.getUser("1") } throws IOException("网络错误")

        val service = UserService(repository)
        val result = service.getUserOrDefault("1", User("0", "默认用户"))

        assertEquals(User("0", "默认用户"), result)
    }
}
```

## 注意事项

- **测试命名**：用反引号描述测试意图，如 `` `should return user by id` ``
- **每个测试独立**：测试之间不应有依赖，每个测试都应该能独立运行
- **不要测试私有方法**：通过公共接口测试行为，而不是实现细节
- **Mock 要适度**：过多的 Mock 说明代码耦合度高，考虑重构
- **协程测试用 runTest**：不要用 runBlocking，runTest 会自动处理虚拟时间

## 进阶用法

### Kotest 框架

```kotlin
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.collections.shouldContain

class CalculatorTest : StringSpec({
    val calculator = Calculator()

    "add should return sum" {
        calculator.add(2, 3) shouldBe 5
    }

    "add should not return wrong result" {
        calculator.add(2, 3) shouldNotBe 6
    }

    "list should contain element" {
        listOf(1, 2, 3) shouldContain 2
    }
})
```

### 测试覆盖率

```kotlin
// build.gradle.kts
plugins {
    jacoco
}

tasks.jacocoTestCoverageVerification {
    violationRules {
        rule {
            limit {
                minimum = "0.8".toBigDecimal()  // 80% 覆盖率要求
            }
        }
    }
}

tasks.jacocoTestReport {
    reports {
        xml.required = true
        html.required = true
    }
}
```
## kotlin.test 基础

**基本写法：简单测试**
`@Test fun <方法名>() { }`
```kotlin
// 使用 @Test 注解标记测试
class MyTest {
    @Test fun sumWorks() = assertEquals(4, 2 + 2)
}
```

---

**基本写法：断言相等**
`assertEquals(<期望>, <实际>)`
```kotlin
// 断言两值相等
assertEquals(10, calc())
```

---

**基本写法：断言不相等**
`assertNotEquals(<值1>, <值2>)`
```kotlin
// 断言两值不等
assertNotEquals(0, count)
```

---

**基本写法：断言为真**
`assertTrue(<条件>)`
```kotlin
// 断言条件为真
assertTrue(list.isEmpty())
```

---

**基本写法：断言为假**
`assertFalse(<条件>)`
```kotlin
// 断言条件为假
assertFalse(list.isNotEmpty())
```

---

**基本写法：断言为 null**
`assertNull(<值>)`
```kotlin
// 断言值为 null
assertNull(findUser(-1))
```

---

**基本写法：断言非 null**
`assertNotNull(<值>)`
```kotlin
// 断言值非 null
assertNotNull(findUser(1))
```

---

**基本写法：断言抛异常**
`assertFailsWith<<异常类型>> { }`
```kotlin
// 断言代码块抛指定异常
assertFailsWith<IllegalArgumentException> { parse("") }
```

---

## kotlin.test 框架适配

**基本写法：Test 注解导入**
`import kotlin.test.Test`
```kotlin
// 跨平台测试注解
import kotlin.test.Test
import kotlin.test.assertEquals
```

---

## JUnit 5 注解

**基本写法：BeforeEach 初始化**
`@BeforeEach fun <方法>() { }`
```kotlin
// 每个测试前执行
class DbTest {
    @BeforeEach fun setup() { db = open() }
}
```

---

**基本写法：AfterEach 清理**
`@AfterEach fun <方法>() { }`
```kotlin
// 每个测试后执行
@AfterEach fun teardown() { db.close() }
```

---

**基本写法：BeforeAll 一次性初始化**
`@BeforeAll fun <方法>() { }`
```kotlin
// 所有测试前执行一次
companion object {
    @BeforeAll @JvmStatic fun init() { }
}
```

---

**基本写法：Disabled 禁用**
`@Disabled("<原因>") @Test fun <方法>() { }`
```kotlin
// 禁用测试用例
@Disabled("待实现")
@Test fun todo() { }
```

---

**基本写法：DisplayName**
`@DisplayName("<名称>") @Test fun <方法>() { }`
```kotlin
// 自定义测试显示名
@DisplayName("用户登录成功")
@Test fun login() { }
```

---

## 参数化测试

**基本写法：ValueSource**
`@ParameterizedTest @ValueSource(strings = ["a", "b"])`
```kotlin
// 多组参数运行测试
@ParameterizedTest
@ValueSource(strings = ["a", "b"])
fun test(s: String) { }
```

---

**基本写法：CsvSource**
`@ParameterizedTest @CsvSource(["1,2,3"])`
```kotlin
// CSV 多参数
@ParameterizedTest
@CsvSource(["1,2,3", "4,5,9"])
fun sum(a: Int, b: Int, expected: Int) { assertEquals(expected, a + b) }
```

---

**基本写法：MethodSource**
`@ParameterizedTest @MethodSource("<方法>")`
```kotlin
// 从静态方法获取参数
@ParameterizedTest
@MethodSource("cases")
fun test(c: Case) { }
companion object {
    @JvmStatic fun cases() = listOf(Case(1, 2))
}
```

---

## 协程测试

**基本写法：runTest 测试协程**
`runTest { }`
```kotlin
// 协程测试运行器
@Test fun test() = runTest {
    val r = fetch()
    assertEquals("ok", r)
}
```

---

**基本写法：测试延迟跳过**
`runTest { delay(1000) }`
```kotlin
// 虚拟时间跳过延迟
runTest {
    delay(1000) // 不实际等待
    launch { }
}
```

---

**基本写法：Turbine 测试 Flow**
`<flow>.test { }`
```kotlin
// 使用 Turbine 测试 Flow
nums().test {
    assertEquals(1, awaitItem())
    awaitComplete()
}
```

---

## MockK 模拟

**基本写法：mockk 模拟对象**
`mockk<<类型>>()`
```kotlin
// 创建 mock 对象
val repo = mockk<UserRepository>()
```

---

**基本写法：mockk relax**
`mockk<<类型>>(relaxed = true)`
```kotlin
// 宽松 mock 自动返回默认值
val repo = mockk<UserRepository>(relaxed = true)
```

---

**基本写法：every 打桩**
`every { <调用> } returns <值>`
```kotlin
// 配置 mock 返回值
every { repo.find(1) } returns User("Alice")
```

---

**基本写法：verify 验证**
`verify { <调用> }`
```kotlin
// 验证方法被调用
verify { repo.find(1) }
```

---

**基本写法：验证调用次数**
`verify(exactly = <次数>) { }`
```kotlin
// 验证调用次数
verify(exactly = 2) { repo.find(any()) }
```

---

**基本写法：coEvery 协程打桩**
`coEvery { <挂起调用> } returns <值>`
```kotlin
// 协程方法打桩
coEvery { repo.fetch() } returns "ok"
```

---

**基本写法：coVerify 协程验证**
`coVerify { <挂起调用> }`
```kotlin
// 验证协程方法调用
coVerify { repo.fetch() }
```

---

## kotest 风格

**基本写法：StringSpec**
`class <类> : StringSpec({ })`
```kotlin
// kotest 字符串风格
class MyTest : StringSpec({
    "sum should work" { 2 + 2 shouldBe 4 }
})
```

---

**基本写法：shouldBe 断言**
`<值> shouldBe <期望>`
```kotlin
// kotest 断言
result shouldBe "hello"
```

---

**基本写法：shouldThrow**
`shouldThrow<<异常>> { }`
```kotlin
// 断言抛异常
shouldThrow<IllegalArgumentException> { parse("") }
```

---

## Gradle 配置

**基本写法：测试依赖**
`testImplementation("<坐标>")`
```kotlin
// build.gradle.kts 测试依赖
dependencies {
    testImplementation(kotlin("test"))
    testImplementation("io.mockk:mockk:1.13.12")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
}
```

---

**基本写法：运行测试**
`./gradlew test`
```bash
# 运行所有测试
./gradlew test
```

---

**基本写法：运行特定测试**
`./gradlew test --tests "<类>.<方法>"`
```bash
# 运行指定测试方法
./gradlew test --tests "com.example.MyTest.sumWorks"
```
