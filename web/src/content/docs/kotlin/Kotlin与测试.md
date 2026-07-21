---
order: 73
title: Kotlin与测试
module: kotlin
category: Kotlin
difficulty: intermediate
description: Kotlin测试框架
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/Kotlin与Gradle
  - kotlin/Kotlin与Android
  - kotlin/Kotlin与Koin
  - kotlin/Kotlin与编译器插件
prerequisites:
  - kotlin/概述与环境配置
---

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
