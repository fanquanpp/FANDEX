---
order: 410
title: Kotlin 测试框架集成
module: 'kotlin'
category: 后端技术
difficulty: advanced
description: JUnit 5、Kotest、MockK 与 Android 测试的集成与工程用法。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'kotlin/395-KotlinCoroutineTesting'
  - 'kotlin/390-KotlinTest'
  - 'kotlin/130-NullSafetyDetailed'
  - 'kotlin/090-ExtensionFunction'
prerequisites: []
---

## 知识点地图

- **知识类别**：Kotlin 测试框架集成——JUnit 5、Kotest、MockK 三大件与 Android 本地/插桩测试的配置与用法。本文只讲「用什么框架、怎么配、怎么写」。
- **解决什么问题**：Kotlin 项目测试技术选型分散（JUnit 参数化、Kotest DSL 与属性测试、MockK 的 Kotlin 专属能力、Android 双测试源集），需要一篇统一入口。
- **什么时候用到**：给新模块搭测试脚手架时选框架；写 Mock 打桩时查 MockK 语法；Android 工程区分 `src/test/` 与 `src/androidTest/` 时。

协程与 Flow 的专门测法（runTest 虚拟时间、Turbine、MainDispatcherRule 详解）已拆分到[Kotlin 协程测试](/kotlin/395-KotlinCoroutineTesting)；代码规范与性能惯用法在[Kotlin 惯用法与代码规范](/kotlin/575-KotlinIdiomsAndConventions)；kotlin.test 标准断言库见[Kotlin 与测试](/kotlin/390-KotlinTest)。

## 前置知识

- [Kotlin DSL 与领域特定语言](/kotlin/550-KotlinDSLDomainSpecificLanguage)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. JUnit 5 集成」的核心机制、典型用法与常见陷阱
- 掌握「2. Kotest」的核心机制、典型用法与常见陷阱
- 掌握「3. MockK」的核心机制、典型用法与常见陷阱
- 掌握「4. Android 测试」的核心机制、典型用法与常见陷阱

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

易错点：只加 JUnit 依赖不写 `useJUnitPlatform()`，Gradle 仍用 JUnit 4 runner，测试显示「0 tests run」却不报错——这是新手最常踩的静默失败。

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

逐段解释与易错点：

- `@BeforeEach` 每个测试方法前重建 `calculator`——JUnit 5 默认**每个测试新实例化测试类**，`lateinit` + `@BeforeEach` 是双保险写法；去掉 `@BeforeEach` 直接初始化字段也行，但 `lateinit` 语义让「忘了初始化」在运行时显式报错而不是 NPE。
- `@Nested inner class`：Kotlin 侧**必须**写 `inner`，否则 JUnit 找不到非静态内部类的实例化路径，嵌套测试静默不执行。
- 易错点：`assertThrows` 是「执行 + 捕获」，lambda 里写多行时异常可能抛在第二行而第一行的状态变更已发生——需要验证「抛异常前无副作用」时要拆开断言。

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

工程场景：校验服务处理手机号规则（`@ValueSource` 喂非法号段）、汇率换算表驱动（`@CsvSource` 直接抄产品给的换算表）。参数化测试失败时 JUnit 报告会标出具体第几组参数——比循环内 assert 的失败定位快得多。

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

风格选择：团队从 JS/RSpec 转来的用 DescribeSpec 降低阅读成本；纯 Kotlin 团队常用 FunSpec（结构清晰、IDE 折叠友好）。易错点：Kotest 的 `shouldBe` 是中缀函数，链上再写 `shouldBe` 时括号层级容易错——`a shouldBe b shouldBe c` 不是「都等于」而是 `(a shouldBe b) shouldBe c`，永远拆开写。

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

属性测试断言的是「对任意输入成立的性质」而不是具体用例：Kotest 默认生成 1000 组随机数据（含边界值收缩 shrinking，失败后自动给最小反例）。工程场景：金额换算函数用 `checkAll(Arb.double())` 断言 `convert(convert(x)) ≈ x` 往返一致，随机生成器抓到了手写用例永远想不到的负数与 NaN 分支。

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
// Mock 协程函数：coEvery/coVerify 对应挂起函数
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

// 链式调用：第一次返回 "token"，之后返回 "new-token"
every { request.header("Auth") } returns "token" andThen "new-token"

// 抛出异常
every { repository.save(any()) } throws DatabaseException("Connection lost")
```

易错点：

- 挂起函数必须用 `coEvery`/`coVerify`——用 `every` 打桩挂起函数会在运行时报类型不匹配，报错信息晦涩，看到 `is not a suspend function` 反过查即可。
- `mockkObject` 有全局状态，用完必须 `unmockkObject(Config)` 或类上 `@MockKAndroid`/`@ExtendWith(MockKExtension)` 自动清理，否则污染同进程后续测试。

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

权衡：`relaxed = true` 减少样板，但「忘了打桩」的调用静默返回默认值（空列表、0、null），掩盖真实调用路径错误。团队约定：被测主路径的依赖用严格 mock，**只读的边缘依赖**（日志、审计）才用 relaxed。

## 4. Android 测试

### 4.1 本地单元测试

`src/test/` 跑在开发机 JVM 上，不涉及真机：

```kotlin
// src/test/
class ViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()  // 定义见协程测试篇

    @Test
    fun `should update ui state`() = runTest {
        val viewModel = MyViewModel(FakeRepository())
        viewModel.loadData()
        assertEquals(UiState.Success(fakeData), viewModel.state.value)
    }
}
```

`MainDispatcherRule` 的定义、逐行解释与常见翻车点（`@get:Rule` 的 Kotlin 注解目标、`resetMain` 泄漏）统一收录在[Kotlin 协程测试](/kotlin/395-KotlinCoroutineTesting)第 4 节——Android 本地测试凡是碰到 `viewModelScope` 都绕不开它。

### 4.2 插桩测试

`src/androidTest/` 跑在真机/模拟器上，验证 Room、SharedPreferences 这类依赖 Android 框架真实实现的组件：

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

逐段解释与易错点：

- `inMemoryDatabaseBuilder`：用内存数据库替代磁盘 SQLite，每个测试的 `setup`/`teardown` 保证干净状态。**易错点：忘写 `teardown` 里的 `close()`**，插桩测试跑满一个类后会因连接泄漏报警。
- `allowMainThreadQueries()`：仅为测试便利放开主线程查询，生产代码禁止——它掩盖了「DAO 挂起函数没写对」的问题，评审时见到要追问。
- `@RunWith(AndroidJUnit4::class)` 提供应用上下文；缺了它 `ApplicationProvider` 会抛 IllegalStateException。

**工程场景**：迁移 Room schema（加列、加索引）后跑一轮 DAO 插桩回归，比手工装机点一遍快一个量级；配合 CI 的 Android 模拟器任务能在合入前拦截 schema 迁移错误。

## 动手实践

**任务**：为一个 `ReceiptParser`（解析收据文本，返回 `data class Receipt(val merchant: String, val total: BigDecimal)`）搭建测试：

1. 用 JUnit 5 参数化测试喂 3 组不同格式收据文本断言解析结果；
2. 日期源 `Clock` 注入构造函数，用 MockK 固定为固定时刻（避免午夜跑测试翻车）；
3. 补一个「金额无小数点」的非法输入用例，断言抛 `IllegalArgumentException`。

提示：`@CsvSource` 直接抄收据模板；MockK 打桩 `every { clock.instant() } returns Instant.parse(...)`。

<details>
<summary>参考实现（先自己写，再展开对照）</summary>

```kotlin
class ReceiptParserTest(private val parser: ReceiptParser = ReceiptParser(fixedClock())) {

    @ParameterizedTest
    @CsvSource(
        "STARBUCKS|TOTAL 45.50|STARBUCKS|45.50",
        "FamilyMart|合计 12.00|FamilyMart|12.00",
        "Acme|Amount due 199.99|Acme|199.99"
    )
    fun `parses merchant and total`(text: String, merchant: String, total: String) {
        val receipt = parser.parse(text)
        assertEquals(merchant, receipt.merchant)
        assertEquals(0, receipt.total.compareTo(BigDecimal(total)))
    }

    @Test
    fun `rejects receipt without decimal amount`() {
        assertThrows<IllegalArgumentException> { parser.parse("NO AMOUNT") }
    }
}
```

`compareTo` 而非 `assertEquals` 比较 BigDecimal：`45.50` 与 `45.5` 的 equals 不相等但数值相等——金额断言的经典易错点。

</details>

## 相关阅读

- 协程与 Flow 的测试：[Kotlin 协程测试](/kotlin/395-KotlinCoroutineTesting)
- kotlin.test 标准库与 JUnit 注解速查：[Kotlin 与测试](/kotlin/390-KotlinTest)
- Gradle 测试任务与依赖配置：[Kotlin Gradle 构建](/kotlin/410-KotlinGradle)
- 基准测试（验证性能惯用法）：[Kotlin 基准测试](/kotlin/400-KotlinBenchmark)

## 参考与致谢

- JUnit 5 User Guide（EPL-2.0）：https://junit.org/junit5/docs/current/user-guide/
- Kotest 官方文档（Apache-2.0）：https://kotest.io/
- MockK 官方文档（Apache-2.0）：https://mockk.io/
