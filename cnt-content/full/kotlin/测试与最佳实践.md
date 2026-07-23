---
order: 19
title: 'Kotlin 测试与最佳实践'
module: kotlin
category: Kotlin
difficulty: advanced
description: '测试框架集成、协程测试、代码规范、性能优化与 Effective Kotlin 要点。'
author: fanquanpp
updated: '2026-06-14'
related:
  - kotlin/Kotlin多平台
  - kotlin/DSL与领域特定语言
  - kotlin/空安全详解
  - kotlin/扩展函数
prerequisites: []
---

## 1. JUnit 5 集成

JUnit 5 是 Kotlin 测试的主流框架：

### 1.1 基本配置

```kotlin
// build.gradle.kts
dependencies {
    testImplementation(kotlin("test"))
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.0")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
}
```

### 1.2 基本测试

```kotlin
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested

class CalculatorTest {
    private lateinit var calculator: Calculator

    @BeforeEach
    fun setup() {
        calculator = Calculator()
    }

    @Test
    @DisplayName("1 + 1 should equal 2")
    fun addition() {
        assertEquals(2, calculator.add(1, 1))
    }

    @Test
    fun `division by zero should throw`() {
        val exception = assertThrows(ArithmeticException::class.java) {
            calculator.divide(1, 0)
        }
        assertEquals("Division by zero", exception.message)
    }

    @Nested
    @DisplayName("When calculating")
    inner class WhenCalculating {
        @Test
        fun `should handle negative numbers`() {
            assertEquals(-3, calculator.add(-1, -2))
        }

        @Test
        fun `should handle zero`() {
            assertEquals(5, calculator.add(5, 0))
        }
    }
}
```

### 1.3 参数化测试

```kotlin
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.CsvSource
import org.junit.jupiter.params.provider.ValueSource

class ParameterizedTestExample {

    @ParameterizedTest
    @ValueSource(strings = ["hello", "world", "kotlin"])
    fun `should not be blank`(input: String) {
        assertTrue(input.isNotBlank())
    }

    @ParameterizedTest
    @CsvSource(
        "1, 1, 2",
        "2, 3, 5",
        "10, 20, 30"
    )
    fun `addition should work`(a: Int, b: Int, expected: Int) {
        assertEquals(expected, a + b)
    }
}
```

## 2. Kotest

Kotest 是 Kotlin 原生测试框架，提供更丰富的 DSL 风格：

### 2.1 配置

```kotlin
dependencies {
    testImplementation("io.kotest:kotest-runner-junit5:5.9.0")
    testImplementation("io.kotest:kotest-assertions-core:5.9.0")
    testImplementation("io.kotest:kotest-property:5.9.0")
}
```

### 2.2 测试风格

```kotlin
import io.kotest.core.spec.style.StringSpec
import io.kotest.core.spec.style.FunSpec
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.nulls.shouldNotBeNull

// StringSpec — 最简洁
class CalculatorStringSpec : StringSpec({
    "addition should work" {
        1 + 1 shouldBe 2
    }
    "subtraction should work" {
        5 - 3 shouldBe 2
    }
})

// FunSpec — 类似 Mocha
class CalculatorFunSpec : FunSpec({
    test("addition should work") {
        1 + 1 shouldBe 2
    }
    context("with negative numbers") {
        test("should handle correctly") {
            (-1) + (-2) shouldBe -3
        }
    }
})

// DescribeSpec — 类似 RSpec
class CalculatorDescribeSpec : DescribeSpec({
    describe("addition") {
        it("should add two positive numbers") {
            1 + 1 shouldBe 2
        }
        it("should handle zero") {
            5 + 0 shouldBe 5
        }
    }
})
```

### 2.3 属性测试

```kotlin
import io.kotest.property.Arb
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.string
import io.kotest.property.checkAll

class PropertyTest : StringSpec({
    "String length should be non-negative" {
        checkAll(Arb.string()) { str ->
            str.length shouldBeGreaterThanOrEqualTo 0
        }
    }

    "Addition should be commutative" {
        checkAll<Int, Int> { a, b ->
            a + b shouldBe b + a
        }
    }
})
```

## 3. MockK

MockK 是 Kotlin 原生的 Mock 框架，支持协程、伴生对象等 Kotlin 特性：

### 3.1 基本使用

```kotlin
import io.mockk.*
import org.junit.jupiter.api.Test

class UserServiceTest {
    private val repository = mockk<UserRepository>()
    private val service = UserService(repository)

    @Test
    fun `should find user by id`() {
        // Arrange
        val user = User("1", "Alice")
        every { repository.findById("1") } returns user

        // Act
        val result = service.getUser("1")

        // Assert
        result shouldBe user
        verify(exactly = 1) { repository.findById("1") }
    }

    @Test
    fun `should throw when user not found`() {
        every { repository.findById("999") } returns null

        shouldThrow<NotFoundException> {
            service.getUser("999")
        }
    }
}
```

### 3.2 高级 Mock

```kotlin
// Mock 协程函数
private val api = mockk<ApiService>()

coEvery { api.fetchData() } returns listOf(Data("test"))
coVerify { api.fetchData() }

// Mock 伴生对象
mockkObject(Config)
every { Config.getVersion() } returns "2.0"

// 验证调用顺序
verifyOrder {
    repository.beginTransaction()
    repository.save(any())
    repository.commit()
}

// 参数匹配
every { repository.findByAge(any()) } returns emptyList()
every { repository.findByName(match { it.startsWith("A") }) } returns listOf(User("1", "Alice"))

// 链式调用
every { request.header("Auth") } returns "token" andThen "new-token"

// 抛出异常
every { repository.save(any()) } throws DatabaseException("Connection lost")
```

### 3.3 松散 Mock 与严格 Mock

```kotlin
// 松散 Mock — 未配置的方法返回默认值
val mock = mockk<Repository>(relaxed = true)

// 严格 Mock — 未配置的方法抛出异常
val strictMock = mockk<Repository>()

// 验证未发生调用
verify { repository wasNot called }
verify(exactly = 0) { repository.delete(any()) }
```

## 4. 协程测试

### 4.1 基本协程测试

```kotlin
import kotlinx.coroutines.test.*
import org.junit.jupiter.api.Test

class CoroutineTest {

    @Test
    fun `should fetch data asynchronously`() = runTest {
        // runTest 替代 runBlocking，自动跳过 delay
        val result = fetchData()
        assertEquals("data", result)
    }

    @Test
    fun `should handle timeout`() = runTest {
        assertThrows<TimeoutCancellationException> {
            withTimeout(100) {
                delay(1000)
            }
        }
    }
}
```

### 4.2 虚拟时间控制

```kotlin
@Test
fun `should advance time`() = runTest {
    var result = ""
    backgroundScope.launch {
        delay(1000)
        result = "done"
    }

    assertEquals("", result)
    advanceTimeBy(1000)  // 推进虚拟时间
    assertEquals("done", result)
}

@Test
fun `should run pending tasks`() = runTest {
    var executed = false
    launch {
        executed = true
    }
    assertFalse(executed)
    runCurrent()  // 执行所有待处理的任务
    assertTrue(executed)
}
```

### 4.3 测试 ViewModel

```kotlin
class MyViewModelTest {
    @Test
    fun `should emit loading then success`() = runTest {
        val repository = mockk<Repository>()
        coEvery { repository.fetchData() } returns Data("test")

        val viewModel = MyViewModel(repository)

        // 收集 StateFlow 的值
        val states = mutableListOf<UiState>()
        val job = launch(StandardTestDispatcher()) {
            viewModel.state.toList(states)
        }

        viewModel.loadData()

        // 验证状态序列
        assertEquals(UiState.Loading, states[0])
        assertEquals(UiState.Success(Data("test")), states[1])

        job.cancel()
    }
}
```

### 4.4 Turbine — Flow 测试

```kotlin
import app.cash.turbine.test

class FlowTest {
    @Test
    fun `should emit values in order`() = runTest {
        val flow = flow {
            emit(1)
            emit(2)
            emit(3)
        }

        flow.test {
            assertEquals(1, awaitItem())
            assertEquals(2, awaitItem())
            assertEquals(3, awaitItem())
            awaitComplete()
        }
    }

    @Test
    fun `should handle errors`() = runTest {
        val flow = flow<Int> {
            emit(1)
            throw RuntimeException("Error")
        }

        flow.test {
            assertEquals(1, awaitItem())
            val error = awaitError()
            assertEquals("Error", error.message)
        }
    }
}
```

## 5. Android 测试

### 5.1 本地单元测试

```kotlin
// src/test/
class ViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `should update ui state`() = runTest {
        val viewModel = MyViewModel(FakeRepository())
        viewModel.loadData()
        assertEquals(UiState.Success(fakeData), viewModel.state.value)
    }
}

// MainDispatcherRule — 替换 Main 调度器
class MainDispatcherRule : TestWatcher() {
    val testDispatcher = StandardTestDispatcher()

    override fun starting(description: Description) {
        Dispatchers.setMain(testDispatcher)
    }

    override fun finished(description: Description) {
        Dispatchers.resetMain()
    }
}
```

### 5.2 插桩测试

```kotlin
// src/androidTest/
@RunWith(AndroidJUnit4::class)
class DaoTest {
    private lateinit var database: AppDatabase
    private lateinit var userDao: UserDao

    @Before
    fun setup() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java
        ).allowMainThreadQueries().build()
        userDao = database.userDao()
    }

    @After
    fun teardown() {
        database.close()
    }

    @Test
    fun insertAndRead() = runTest {
        val user = User(id = 1, name = "Alice")
        userDao.insert(user)
        val loaded = userDao.findById(1)
        assertEquals(user, loaded)
    }
}
```

## 6. 代码规范

### 6.1 命名规范

| 元素      | 规范                    | 示例                                     |
| --------- | ----------------------- | ---------------------------------------- |
| 包名      | 全小写，点分隔          | `com.example.project`                    |
| 类/接口   | PascalCase              | `UserService`, `Clickable`               |
| 函数/变量 | camelCase               | `calculateTotal`, `userCount`            |
| 常量      | SCREAMING_SNAKE_CASE    | `MAX_RETRY_COUNT`                        |
| 类型参数  | 大写单字母或 PascalCase | `T`, `R`, `Key`, `Value`                 |
| 测试方法  | 反引号描述              | `` `should return 404 when not found` `` |

### 6.2 格式规范

```kotlin
// 链式调用换行
val result = items
    .filter { it.isActive }
    .map { it.name }
    .sorted()
    .toList()

// 长参数列表换行
fun createRequest(
    method: HttpMethod,
    url: String,
    headers: Map<String, String> = emptyMap(),
    body: String? = null
): Request

// when 分支格式
when (value) {
    is Int -> processInt(value)
    is String -> processString(value)
    else -> handleUnknown(value)
}
```

## 7. 性能优化

### 7.1 避免不必要的对象创建

```kotlin
// Bad — 每次调用创建新对象
fun process(items: List<String>): List<String> {
    val result = mutableListOf<String>()  // 每次创建
    items.forEach { result.add(it.uppercase()) }
    return result
}

// Good — 使用 map
fun process(items: List<String>): List<String> = items.map { it.uppercase() }
```

### 7.2 使用 Sequence 处理大数据集

```kotlin
// Bad — 多次中间集合
val result = (1..1_000_000)
    .map { it * 2 }
    .filter { it > 100 }
    .take(10)
    .toList()

// Good — 惰性求值
val result = (1..1_000_000).asSequence()
    .map { it * 2 }
    .filter { it > 100 }
    .take(10)
    .toList()
```

### 7.3 协程性能

```kotlin
// 限制并发数
suspend fun fetchAll(urls: List<String>): List<String> = coroutineScope {
    urls.map { url ->
        async(Dispatchers.IO) { fetchUrl(url) }
    }.awaitAll()
}

// 使用 Semaphore 限制并发
suspend fun fetchWithConcurrencyLimit(
    urls: List<String>,
    maxConcurrency: Int = 10
): List<String> = coroutineScope {
    val semaphore = Semaphore(maxConcurrency)
    urls.map { url ->
        async(Dispatchers.IO) {
            semaphore.withPermit { fetchUrl(url) }
        }
    }.awaitAll()
}
```

### 7.4 原始类型数组

```kotlin
// Bad — 装箱开销
val numbers: List<Int> = (1..1000).toList()

// Good — 无装箱
val numbers: IntArray = IntArray(1000) { it + 1 }
```

## 8. Effective Kotlin 要点

### 8.1 限制可变性

```kotlin
// 优先使用 val
val items = listOf(1, 2, 3)  // 不可变引用 + 不可变集合

// 使用不可变集合接口
fun process(items: List<String>) {  // 而非 MutableList
    // ...
}

// 数据类使用 val
data class User(val name: String, val age: Int)  // 而非 var
```

### 8.2 消除 !! 操作符

```kotlin
// Bad
val name: String = user.name!!

// Good — 使用 ?:
val name: String = user.name ?: "Unknown"

// Good — 使用 let
user.name?.let { processName(it) }

// Good — 使用 require/check
fun process(user: User) {
    requireNotNull(user.name) { "Name is required" }
    // 此后 user.name 智能转换为非空
}
```

### 8.3 使用表达式体

```kotlin
// Bad
fun max(a: Int, b: Int): Int {
    return if (a > b) a else b
}

// Good
fun max(a: Int, b: Int): Int = if (a > b) a else b
```

### 8.4 避免在构造函数中做重操作

```kotlin
// Bad — 构造函数中做 IO
class Service(config: Config) {
    private val data = loadData(config.path)  // 阻塞操作
}

// Good — 延迟加载
class Service(config: Config) {
    private val data by lazy { loadData(config.path) }
}
```

### 8.5 使用密封类代替枚举 + when

```kotlin
// 密封类 + when 实现穷举检查
sealed class UiState {
    object Loading : UiState()
    data class Success(val data: String) : UiState()
    data class Error(val message: String) : UiState()
}

fun render(state: UiState) = when (state) {
    is UiState.Loading -> showLoading()
    is UiState.Success -> showData(state.data)
    is UiState.Error -> showError(state.message)
    // 编译器确保覆盖所有分支
}
```

### 8.6 使用扩展函数提升可读性

```kotlin
// Bad — 工具类
class StringUtils {
    companion object {
        fun isEmail(str: String): Boolean = str.contains("@")
    }
}
StringUtils.isEmail("test@example.com")

// Good — 扩展函数
fun String.isEmail(): Boolean = this.contains("@") && this.contains(".")
"test@example.com".isEmail()
```

### 8.7 合理使用作用域函数

```kotlin
// apply — 配置对象
val request = Request().apply {
    method = HttpMethod.POST
    url = "/api/users"
    headers["Content-Type"] = "application/json"
}

// let — 空安全链式调用
val domain = email?.substringAfter("@")?.let { it.lowercase() }

// also — 附加操作（不影响链式调用）
val user = createUser()
    .also { logger.info("Created user: ${it.id}") }
    .also { eventBus.publish(UserCreatedEvent(it.id)) }
```

### 8.8 避免在伴生对象中存储可变状态

```kotlin
// Bad — 全局可变状态
class Config {
    companion object {
        var debugMode = false  // 全局可变，难以追踪
    }
}

// Good — 依赖注入
class Service(private val config: Config) {
    fun process() {
        if (config.debugMode) { /* ... */ }
    }
}
```
