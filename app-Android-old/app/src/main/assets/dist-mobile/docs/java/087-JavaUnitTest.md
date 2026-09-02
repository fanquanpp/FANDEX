## 前置知识

- [Spring Cloud 微服务开发](/java/086-SpringCloudMicroserviceDevelopment)：建议先完成前一篇的学习

## 学习目标

- 掌握「0. 本节阅读指引（先读这一节）」的核心机制、典型用法与常见陷阱
- 掌握「引言：从"测试是验证"到"测试是设计"」的核心机制、典型用法与常见陷阱
- 掌握「1. 历史动机与技术演进」的核心机制、典型用法与常见陷阱
- 掌握「2. 形式化定义」的核心机制、典型用法与常见陷阱
- 掌握「3. 理论推导」的核心机制、典型用法与常见陷阱


## 0. 本节阅读指引（先读这一节）

本篇是「单元测试」进阶文档。

第一遍只读：引言、4. 代码示例与文末速查小节（Maven 依赖、测试方法、生命周期、断言、参数化测试、嵌套测试）；会写基本单测即可。

可跳过：1-3 节（历史、形式化、理论推导）与 5-9 节第二遍细读。

前置：027 Lambda、035 反射与动态代理、068 Java 构建工具。


## 引言：从"测试是验证"到"测试是设计"

Java 是企业级软件的主力语言，而单元测试是 Java 工程质量的基石。然而，业界普遍存在两种误区：

1. **"先实现后补测"**：把测试当作事后的质量验证工具，导致被测代码为可测性付出巨大代价（private 方法暴露、静态依赖、new 硬编码）；
2. **"测试覆盖率至上"**：盲目追求 80% 行覆盖率，却忽视了测试的本质——**对设计的反馈**（design feedback）。

Kent Beck 在 2003 年的访谈中说：

> "测试不是关于找到 bug 的，测试是关于让你无畏地修改代码的。"
>
> —— Kent Beck

JUnit 5（2017 年发布）作为 JUnit 自 2000 年诞生以来最大的一次重写，将"扩展点优先于继承"作为核心设计哲学；Mockito 5（2022 年发布）将 Inline Mock Maker 设为默认，使 final 类/方法 mocking 不再需要 mockito-inline 显式配置；AssertJ 与 Testcontainers 的崛起则推动了"流式断言"与"一次性集成测试容器"成为行业标准。

本模块以 MIT 6.5810 Software Construction、Stanford CS193P 与 CMU 17-437 Software Testing 的标准，系统讲解：

1. **JUnit 5 三模块架构**：Platform（启动器）/Jupiter（编程模型）/Vintage（兼容引擎）；
2. **Mockito Test Double 体系**：mock/spy/stub/fake/dummy 五分类与 Inline Mock Maker 工作原理；
3. **AssertJ 流式断言**：相对于 JUnit 内置 assertions 的可读性与失败诊断优势；
4. **Spring Boot Test 测试切片**：@WebMvcTest/@DataJpaTest/@JsonTest 的上下文裁剪策略；
5. **Testcontainers 集成测试**：一次性真实容器替代内存数据库；
6. **JMH 微基准测试**：避免 JVM JIT 陷阱的科学测量方法；
7. **TDD 与 BDD 哲学**：Red-Green-Refactor 与 Given-When-Then 的认知差异。

## 1. 历史动机与技术演进

### 1.1 时间线

| 年份 | 事件 | 主要贡献者 |
| ---- | ---- | ---------- |
| 1989 | Smalltalk SUnit 雏形出现 | Kent Beck |
| 1997 | JUnit 在苏黎世航班上完成首版 | Kent Beck, Erich Gamma |
| 2000 | "Test Infected" 文章发表 | Beck & Gamma |
| 2002 | 《Test-Driven Development: By Example》出版 | Kent Beck |
| 2003 | JUnit 4 引入注解（@Test），合并 TestNG 部分思想 | David Saff, Kevin Cooney |
| 2004 | TestNG 发布，引入依赖测试与参数化 | Cédric Beust, Alexandru Popescu |
| 2006 | "Mocks Aren't Stubs" 区分 Mockist vs Classicist | Martin Fowler |
| 2006 | BDD 概念提出，JBehave 发布 | Dan North |
| 2007 | Mockito 发布，简化 stubbing 语法 | Szczepan Faber |
| 2013 | JMH（Java Microbenchmark Harness）发布 | Aleksey Shipilev |
| 2014 | AssertJ 1.0 稳定版发布 | Joel Costigliola |
| 2015 | JUnit Lambda（JUnit 5 前身）启动 | JUnit Team |
| 2017 | JUnit 5.0 GA（General Availability）发布 | Marc Philipp, Matthias Merdes, Stefan Bechtold |
| 2019 | Testcontainers Java 1.0 稳定版 | Richard North |
| 2020 | JUnit 5.7 引入 @TestInstance(PER_CLASS) 与 @ArgumentSource |
| 2021 | Mockito 4 弃用 mockito-core 默认实现，分离 mockito-inline |
| 2022 | Mockito 5 将 InlineByteBuddyMockMaker 设为默认 |
| 2023 | Spring Boot 3.1 引入 @ServiceConnection 简化 Testcontainers 配置 |
| 2024 | JUnit 5.11 引入 @ClassOrderer 与 @MethodOrderer 默认策略改进 |

### 1.2 设计动机

**JUnit 的诞生**：1997 年 Kent Beck 与 Erich Gamma 在飞往 SD'97 会议的航班上，用 4 小时实现了 JUnit 的第一个版本。Beck 回忆道：

> "Erich 说，'我们来写个 Smalltalk SUnit 的 Java 版本吧'。我说，'好，但用 Java 5 的注解会很麻烦'。我们用了 4 小时把它写出来，包括图形运行器。"

JUnit 的成功不在于功能，而在于 **"Test Runner 不再是父类，而是注解"** 这一设计——这降低了测试类的耦合，使测试代码与业务代码共享同一套 OOP 模型。

**JUnit 5 的重写动机**：JUnit 4 的 `@RunWith` 与 `@Rule` 机制难以组合（一个类只能有一个 Runner），且 `Statement` 抽象过于底层。JUnit Lambda 项目的核心目标是：

1. **可组合扩展**：通过 `ExtendWith` 而非 `RunWith`，允许扩展叠加；
2. **模块化**：将 API（Jupiter）、平台（Platform）、兼容（Vintage）解耦，让第三方 IDE/构建工具只需依赖 Platform；
3. **Java 8+ 原生**：使用 `Supplier<String>` 懒求值断言消息、`Stream<Arguments>` 参数源等函数式特性。

**Mockito 的设计哲学**：Szczepan Faber 在 Google 时观察到 EasyMock 的 record-replay 模式过于繁琐（需要 `replay(mock)` 切换状态），于是设计了"调用即打桩"的语法：

```java
// EasyMock：record-replay
expect(mock.find(1)).andReturn(user);
replay(mock);  // 必须切换到 replay 状态

// Mockito：直接打桩
when(mock.find(1)).thenReturn(user);  // 无需 replay
```

这种"中间打桩"（intermediate stubbing）的代价是 Mockito 内部需维护调用栈以区分"打桩阶段"与"实际调用阶段"，但极大提升了可读性。

**AssertJ 的动机**：JUnit 内置的 `assertEquals(expected, actual)` 在失败时仅输出两个值，开发者需手动比较。AssertJ 借鉴 FEST-Assert 的流式风格，提供链式断言与丰富诊断：

```java
// JUnit 内置断言：失败信息单薄
assertEquals("Alice", user.getName());

// AssertJ 流式断言：失败信息详尽，且可链式
assertThat(user)
    .isNotNull()
    .hasName("Alice")
    .extracting(User::getEmail).asString().contains("@example.com");
```

**Testcontainers 的动机**：传统集成测试依赖 H2 内存数据库，但 H2 与 PostgreSQL 的 SQL 方言差异经常导致测试通过但生产失败。Testcontainers 通过 Docker 启动一次性真实数据库，解决了"测试环境与生产环境不一致"的根本问题。

## 2. 形式化定义

### 2.1 测试用例的代数语义

一个测试用例可形式化为六元组：

$$
\text{TestCase} = (S, D, A, P, E, O)
$$

其中：

- $S$：被测系统（System Under Test，SUT）；
- $D$：依赖（Depended-On Component，DOC），可被 Test Double 替换；
- $A$：前置条件（Arrange / Given），$A: \text{State} \to \text{State}$；
- $P$：执行动作（Act / When），$P: \text{State} \to \text{State}$；
- $E$：期望结果（Assert / Then），$E \subseteq \text{State}$；
- $O$：可观测性（Observability），$O: \text{State} \to \text{Observable}$。

测试通过当且仅当 $O(P(A(s_0))) \in E$，其中 $s_0$ 为初始状态。

### 2.2 Test Double 五分类（Meszaros 2003）

Gerard Meszaros 在《xUnit Test Patterns》中定义了五种 Test Double，其代数关系为：

$$
\text{TestDouble} = \text{Dummy} \cup \text{Stub} \cup \text{Spy} \cup \text{Mock} \cup \text{Fake}
$$

| 类型 | 定义 | 是否记录调用 | 是否有逻辑 | Mockito 实现 |
| ---- | ---- | ------------ | ---------- | ------------ |
| Dummy | 仅填充参数列表，从不被调用 | 否 | 无 | `null` 或 `any()` |
| Stub | 返回预设硬编码响应 | 否 | 无 | `when(mock.x()).thenReturn(y)` |
| Spy | 包装真实对象，记录所有调用 | 是 | 委托真实对象 | `Mockito.spy(real)` |
| Mock | 预设期望并验证调用 | 是 | 无 | `verify(mock).x()` |
| Fake | 简化但可工作的实现（如内存数据库） | 否 | 有 | `InMemoryUserRepository` |

### 2.3 测试金字塔的经济学模型

Mike Cohn 在《Succeeding with Agile》中提出的测试金字塔可量化为成本-反馈矩阵：

$$
\text{TotalCost}(T) = \sum_{i \in \text{Unit}} c_u \cdot n_u + \sum_{j \in \text{Integration}} c_i \cdot n_i + \sum_{k \in \text{E2E}} c_e \cdot n_e
$$

其中 $c_u \ll c_i \ll c_e$（典型值：$c_u \approx 10\text{ms}$, $c_i \approx 1\text{s}$, $c_e \approx 30\text{s}$），且反馈延迟随层级递增。最优策略是在反馈成本与真实性之间权衡：

$$
\min \text{TotalCost} \quad \text{s.t.} \quad \text{Coverage}(\text{Unit}) \geq 0.8, \text{Coverage}(\text{Critical Path E2E}) \geq 1.0
$$

### 2.4 JUnit 5 扩展点 EBNF

JUnit 5 的扩展模型通过实现 `Extension` 标记接口下的子接口接入生命周期：

```ebnf
ExtensionInterface ::= 
    "BeforeAllCallback" | "BeforeEachCallback" |
    "AfterAllCallback" | "AfterEachCallback" |
    "TestExecutionExceptionHandler" |
    "ParameterResolver" | "TestInstancePostProcessor" |
    "InvocationInterceptor" | "LifecycleMethodExecutionExceptionHandler"

ExtendWith ::= "@ExtendWith(" ClassName {"," ClassName} ")"

ExtensionContext ::= "Store" | "ExecutionException" | "TestInstance"
```

扩展点是单一职责的：一个扩展可实现多个接口，但不能修改测试方法签名（除非通过 `ParameterResolver` 注入参数）。

## 3. 理论推导

### 3.1 参数化测试的笛卡尔积爆炸

参数化测试本质是对输入空间的采样。若测试方法 $f$ 有 $n$ 个参数，每个参数取 $k_i$ 个值，则总测试数：

$$
|T| = \prod_{i=1}^{n} k_i
$$

对于 `@CsvSource({"1,one", "2,two", "3,three"})` 这种二元参数，$|T| = 3$。但若使用 `@MethodSource` 返回 $n$ 个独立 `Stream` 的笛卡尔积，组合数会爆炸增长。JUnit 5 通过 `@ArgumentsSource` 显式提供，避免隐式笛卡尔积。

**理论意义**：参数化测试的有效性取决于输入空间的覆盖。等价类划分（Equivalence Partitioning）与边界值分析（Boundary Value Analysis）可将 $k_i$ 降至最小：

$$
k_i^{\text{optimal}} = |\text{EquivalenceClasses}| + |\text{BoundaryValues}|
$$

### 3.2 Mockito Inline Mock Maker 的字节码原理

Mockito 5 默认使用 `InlineByteBuddyMockMaker`，其工作原理基于 Java Instrumentation API：

1. **Agent 注册**：Mockito 在 JVM 启动时通过 `ByteBuddyAgent.install()` 注册 `ClassFileTransformer`；
2. **类加载拦截**：当目标类（含 final 类）被加载时，ByteBuddy 重写字节码，在方法入口插入 mock 拦截器；
3. **方法分派**：运行时若处于打桩状态，返回预设值；否则调用真实方法（spy）或返回类型零值（mock）。

形式化地，对于方法 $m$：

$$
m_{\text{mocked}}(args) = \begin{cases}
\text{stubbedValue} & \text{if } (m, args) \in \text{Stubs} \\
\text{realMethod}(args) & \text{if } \text{spy} \land (m, args) \notin \text{Stubs} \\
\text{default}(\text{ReturnType}) & \text{otherwise}
\end{cases}
$$

这一机制使 Mockito 5 能 mock final 类、static 方法（通过 `Mockito.mockStatic`）与构造器（`Mockito.mockConstruction`），但代价是需要 Java Agent 权限（在原生镜像 GraalVM 中需额外配置）。

### 3.3 Spring Boot Test 切片的上下文裁剪证明

`@WebMvcTest` 的核心价值是减少 Spring ApplicationContext 启动开销。设完整上下文启动时间为 $T_{full}$，切片启动时间为 $T_{slice}$，则：

$$
T_{slice} = T_{full} - \sum_{i \in \text{ExcludedBeans}} t_i
$$

其中 $t_i$ 为第 $i$ 个被排除 Bean 的初始化时间。`@WebMvcTest` 排除 `@Service`、`@Repository`、`@Component`、`@Configuration`（仅保留 `@Controller`/`@ControllerAdvice`），典型地：

$$
T_{slice}^{\text{WebMvc}} \approx 0.1 \times T_{full}
$$

证明思路：`@WebMvcTest` 通过 `@TypeExcludeFilters(WebMvcTypeExcludeFilter.class)` 在 `BeanFactory` 阶段过滤候选 Bean，避免实例化。这与 `@MockBean` 替换 Bean 不同——前者完全跳过创建，后者创建后替换。

### 3.4 JMH 微基准的 JIT 陷阱

JVM 的即时编译（JIT）会优化热路径代码，导致微基准测试结果失真。常见陷阱：

1. **死代码消除（Dead Code Elimination, DCE）**：未使用的计算结果被 JIT 删除；
2. **常量折叠（Constant Folding）**：编译期已知结果的表达式被预计算；
3. **循环展开（Loop Unrolling）**：减少循环开销但改变测量语义；
4. **分支预测（Branch Prediction）**： warmed-up 后预测准确率提升。

JMH 通过 `@Benchmark` 注解 + `@State` 状态管理 + Blackhole 消费结果来对抗这些陷阱：

```java
@Benchmark
public void measure(Blackhole bh) {
    bh.consume(computation(x));  // Blackhole 防止 DCE
}
```

形式化地，JMH 测量的不是"代码执行时间"，而是"在 JIT 稳态下的代码执行时间分布"，需通过 warmup 阶段进入稳态：

$$
\text{StableTime} = \lim_{n \to \infty} \mathbb{E}[\text{Time}_n]
$$

JMH 默认 `warmup = 5 × 10⁻¹ s`，`measurement = 5 × 10⁻¹ s`，`forks = 5`，以确保进入稳态。

## 4. 代码示例

### 4.1 JUnit 5 基础注解

```java
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * JUnit 5 基础注解示例
 *
 * 演示 @Test、@BeforeEach、@AfterEach、@BeforeAll、@AfterAll、
 * @DisplayName、@Disabled、@Tag 与条件执行注解
 */
@DisplayName("用户服务测试")
class UserServiceTest {

    private UserService service;

    @BeforeAll
    static void initAll() {
        // 整个测试类只执行一次，必须 static
        // 用于初始化数据库连接、Mock 静态资源等
        System.out.println("=== 初始化测试套件 ===");
    }

    @BeforeEach
    void init() {
        // 每个测试方法前执行
        // JUnit 5 默认每个测试方法新建实例（PER_METHOD 生命周期）
        service = new UserService(new InMemoryUserRepository());
    }

    @Test
    @DisplayName("创建用户：合法邮箱应成功")
    void createUserWithValidEmail() {
        User user = service.create("alice@example.com");
        assertNotNull(user.getId());
        assertEquals("alice@example.com", user.getEmail());
    }

    @Test
    @DisplayName("创建用户：空邮箱应抛 IllegalArgumentException")
    void createUserWithEmptyEmail() {
        // JUnit 5 推荐 assertThrows 而非 @Test(expected=...)
        IllegalArgumentException ex = assertThrows(
            IllegalArgumentException.class,
            () -> service.create("")
        );
        assertTrue(ex.getMessage().contains("email"));
    }

    @Test
    @Disabled("待修复：issue #123")
    @DisplayName("TODO: 创建用户：重复邮箱应抛 UserExistsException")
    void createUserWithDuplicateEmail() {
        // @Disabled 标记的测试不会执行，但会在报告中显示
    }

    @Test
    @Tag("slow")
    @EnabledOnOs(OS.LINUX)
    @DisplayName("批量导入：Linux 环境下慢速测试")
    void batchImportOnLinux() {
        // @Tag 用于过滤测试集（如 CI 中只跑 fast 标签）
        // @EnabledOnOs 条件执行，避免平台特定测试失败
        service.batchImport("/tmp/users.csv");
    }

    @AfterEach
    void tearDown() {
        // 每个测试方法后执行，清理资源
        service = null;
    }

    @AfterAll
    static void tearDownAll() {
        // 整个测试类只执行一次
        System.out.println("=== 清理测试套件 ===");
    }
}
```

### 4.2 参数化测试

```java
import org.junit.jupiter.params.*;
import org.junit.jupiter.params.provider.*;
import static org.junit.jupiter.api.Assertions.*;

import java.util.stream.Stream;

/**
 * 参数化测试示例
 *
 * 演示 @ValueSource、@CsvSource、@MethodSource、@EnumSource、@NullAndEmptySource
 */
@DisplayName("邮箱校验器参数化测试")
class EmailValidatorTest {

    private final EmailValidator validator = new EmailValidator();

    /**
     * @ValueSource：单参数简单值
     * 适用于只有一个参数且类型为 String/int/long/boolean 等
     */
    @ParameterizedTest(name = "邮箱 {0} 应合法")
    @ValueSource(strings = {
        "alice@example.com",
        "bob.smith@sub.domain.org",
        "user+tag@gmail.com"
    })
    void validEmails(String email) {
        assertTrue(validator.isValid(email));
    }

    /**
     * @NullAndEmptySource：补充 null 与空字符串
     * 与 @ValueSource 组合可覆盖边界
     */
    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "no-at-sign", "a@b", "@b.com"})
    void invalidEmails(String email) {
        assertFalse(validator.isValid(email));
    }

    /**
     * @CsvSource：多参数 CSV 格式
     * 适用于多参数场景，每个字符串代表一行
     */
    @ParameterizedTest(name = "[{index}] {0} -> {1}")
    @CsvSource({
        "alice@example.com, true",
        "invalid,        false",
        "'',              false",
        "NULL,            false"
    })
    void validateWithCsv(String email, boolean expected) {
        assertEquals(expected, validator.isValid(email));
    }

    /**
     * @CsvFileSource：从 CSV 文件加载
     * 适用于大量数据驱动的测试
     */
    @ParameterizedTest
    @CsvFileSource(resources = "/emails.csv", numLinesToSkip = 1)
    void validateFromCsvFile(String email, boolean expected) {
        assertEquals(expected, validator.isValid(email));
    }

    /**
     * @MethodSource：引用工厂方法
     * 工厂方法必须 static（除非使用 @TestInstance(PER_CLASS)）
     * 返回 Stream<Arguments> / Iterable / 数组
     */
    @ParameterizedTest
    @MethodSource("emailProvider")
    void validateWithMethodSource(String email, boolean expected, String description) {
        assertEquals(expected, validator.isValid(email), description);
    }

    static Stream<Arguments> emailProvider() {
        return Stream.of(
            Arguments.of("alice@example.com", true, "标准邮箱"),
            Arguments.of("a@b", false, "过短"),
            Arguments.of(null, false, "null 应返回 false")
        );
    }

    /**
     * @EnumSource：枚举值参数化
     * 适用于测试枚举的所有值
     */
    @ParameterizedTest
    @EnumSource(value = HttpStatus.class, names = {"4..", "5.."}, mode = EnumSource.Mode.MATCH_ALL)
    void errorStatusCodes(HttpStatus status) {
        assertTrue(status.getStatusCode() >= 400);
    }

    /**
     * @ArgumentsSource：自定义 ArgumentProvider
     * 适用于复杂参数构造逻辑
     */
    @ParameterizedTest
    @ArgumentsSource(RandomEmailProvider.class)
    void validateRandomEmails(String email) {
        // RandomEmailProvider 实现 ArgumentsProvider 接口
        assertNotNull(validator.normalize(email));
    }
}
```

### 4.3 动态测试

```java
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.DynamicTest.*;

import java.util.*;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.DynamicTest.*;

/**
 * 动态测试示例
 *
 * @TestFactory 返回 Stream/Collection/Iterable of DynamicTest
 * 适用于运行时生成的测试用例（如从配置文件、数据库加载）
 */
@DisplayName("计算器动态测试")
class CalculatorDynamicTest {

    private final Calculator calc = new Calculator();

    /**
     * 从 CSV 数据生成动态测试
     */
    @TestFactory
    @DisplayName("加法运算测试集")
    Stream<DynamicTest> additionTests() {
        List<TestCase> cases = List.of(
            new TestCase(1, 2, 3, "1+2=3"),
            new TestCase(10, -5, 5, "10+(-5)=5"),
            new TestCase(0, 0, 0, "0+0=0")
        );

        return cases.stream()
            .map(tc -> dynamicTest(
                tc.description(),
                () -> assertEquals(tc.expected(), calc.add(tc.a(), tc.b()))
            ));
    }

    /**
     * 从文件加载测试数据
     */
    @TestFactory
    @DisplayName("从 JSON 加载测试用例")
    Collection<DynamicTest> loadFromJson() {
        List<JsonCase> cases = JsonLoader.load("calculator-cases.json");
        List<DynamicTest> tests = new ArrayList<>();
        for (JsonCase c : cases) {
            tests.add(dynamicTest(c.getName(), () -> {
                int actual = calc.compute(c.getExpression());
                assertEquals(c.getExpected(), actual, c.getReason());
            }));
        }
        return tests;
    }

    record TestCase(int a, int b, int expected, String description) {}
    record JsonCase(String name, String expression, int expected, String reason) {}
}
```

### 4.4 JUnit 5 扩展模型

```java
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.*;
import java.util.logging.Logger;

/**
 * 自定义扩展示例
 *
 * 实现 BeforeAllCallback、AfterAllCallback、ParameterResolver 三个接口
 * 提供日志注入与计时功能
 */
public class LoggingExtension implements
        BeforeAllCallback, AfterAllCallback, ParameterResolver {

    private static final Logger LOGGER = Logger.getLogger(LoggingExtension.class.getName());
    private long startTime;

    @Override
    public void beforeAll(ExtensionContext context) {
        startTime = System.nanoTime();
        LOGGER.info(() -> "开始测试: " + context.getDisplayName());
    }

    @Override
    public void afterAll(ExtensionContext context) {
        long duration = (System.nanoTime() - startTime) / 1_000_000;
        LOGGER.info(() -> "测试完成: " + context.getDisplayName() + " 耗时 " + duration + "ms");
    }

    /**
     * ParameterResolver：注入 Logger 参数
     */
    @Override
    public boolean supportsParameter(ParameterContext pc, ExtensionContext ec) {
        return pc.getParameter().getType() == Logger.class;
    }

    @Override
    public Object resolveParameter(ParameterContext pc, ExtensionContext ec) {
        return Logger.getLogger(ec.getTestClass().orElse(Object.class).getName());
    }
}

/**
 * 使用扩展
 */
@ExtendWith(LoggingExtension.class)
@ExtendWith(MockitoExtension.class)
@DisplayName("订单服务测试")
class OrderServiceTest {

    @Test
    void createOrder(Logger logger) {
        // Logger 由 LoggingExtension 自动注入
        logger.info("测试创建订单");
        // 测试逻辑...
    }
}

/**
 * 通过 @RegisterExtension 编程式注册（运行时动态配置）
 */
class DatabaseTest {

    @RegisterExtension
    static final DatabaseExtension DB = DatabaseExtension.builder()
        .withUrl("jdbc:postgresql://localhost/test")
        .withMigration("db/migration")
        .build();

    @Test
    void query() {
        // DB 已在 BeforeAllCallback 阶段启动并迁移
    }
}
```

### 4.5 Mockito 桩件与验证

```java
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

import java.util.*;

/**
 * Mockito 桩件与验证示例
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("用户服务测试 - Mockito")
class UserServiceMockitoTest {

    @Mock
    private UserRepository repository;

    @Mock
    private EmailSender emailSender;

    @InjectMocks
    private UserService service;

    @Captor
    private ArgumentCaptor<Email> emailCaptor;

    @Test
    @DisplayName("查询用户：存在时应返回 Optional<User>")
    void findExistingUser() {
        // Arrange：打桩
        User alice = new User(1L, "alice@example.com");
        when(repository.findById(1L)).thenReturn(Optional.of(alice));

        // Act
        Optional<User> result = service.findUser(1L);

        // Assert
        assertTrue(result.isPresent());
        assertEquals("alice@example.com", result.get().getEmail());

        // Verify：验证方法被调用 1 次
        verify(repository, times(1)).findById(1L);
        verify(repository, never()).findById(2L);
    }

    @Test
    @DisplayName("查询用户：不存在时应返回 Optional.empty()")
    void findNonExistingUser() {
        // 使用 lenient 避免严格打桩报错
        lenient().when(repository.findById(anyLong()))
            .thenReturn(Optional.empty());

        Optional<User> result = service.findUser(999L);

        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("创建用户：应发送欢迎邮件")
    void createUserSendsEmail() {
        when(repository.save(any(User.class)))
            .thenAnswer(invocation -> {
                User u = invocation.getArgument(0);
                u.setId(1L);
                return u;
            });

        User created = service.create("bob@example.com");

        // ArgumentCaptor 捕获邮件参数
        verify(emailSender).send(emailCaptor.capture());
        Email sent = emailCaptor.getValue();
        assertEquals("bob@example.com", sent.getTo());
        assertEquals("Welcome", sent.getSubject());
    }

    @Test
    @DisplayName("创建用户：邮件发送失败应不影响用户创建")
    void createUserWithEmailFailure() {
        when(repository.save(any(User.class)))
            .thenReturn(new User(1L, "bob@example.com"));
        // doThrow 用于 void 方法或需要抛异常的场景
        doThrow(new EmailSendException("SMTP down"))
            .when(emailSender).send(any(Email.class));

        // 邮件失败应被 service 内部捕获，不向外抛
        User created = service.create("bob@example.com");
        assertNotNull(created.getId());
    }

    @Test
    @DisplayName("Mock final 类（Mockito 5 默认支持）")
    void mockFinalClass() {
        // Mockito 5 默认使用 InlineByteBuddyMockMaker，可直接 mock final 类
        FinalConfig config = mock(FinalConfig.class);
        when(config.getTimeout()).thenReturn(5000);

        assertEquals(5000, config.getTimeout());
    }

    @Test
    @DisplayName("Mock 静态方法")
    void mockStaticMethod() {
        // try-with-resources 限制 mock 范围
        try (MockedStatic<UUID> mocked = mockStatic(UUID.class)) {
            UUID fixed = UUID.fromString("00000000-0000-0000-0000-000000000001");
            mocked.when(UUID::randomUUID).thenReturn(fixed);

            assertEquals(fixed, UUID.randomUUID());
        }
        // 离开 try 块后，UUID.randomUUID() 恢复真实行为
    }

    @Test
    @DisplayName("Mock 构造器")
    void mockConstructor() {
        try (MockedConstruction<User> mocked = mockConstruction(User.class,
                (mock, context) -> {
                    // 对每个 new User(...) 调用进行打桩
                    when(mock.getId()).thenReturn(42L);
                })) {

            User u = new User("test@example.com");
            assertEquals(42L, u.getId());
            assertEquals(1, mocked.constructed().size());
        }
    }

    @Test
    @DisplayName("Spy：部分打桩真实对象")
    void spyPartialStubbing() {
        List<String> realList = new ArrayList<>(List.of("a", "b", "c"));
        List<String> spy = spy(realList);

        // doReturn 而非 when（避免触发真实方法）
        doReturn(100).when(spy).size();

        // 未打桩的方法走真实逻辑
        assertEquals("a", spy.get(0));
        // 已打桩的方法返回桩值
        assertEquals(100, spy.size());
    }

    @Test
    @DisplayName("verify 验证调用顺序：InOrder")
    void verifyOrder() {
        service.createUserSequence(List.of("a@x.com", "b@x.com"));

        InOrder inOrder = inOrder(repository, emailSender);
        inOrder.verify(repository).save(argThat(u -> "a@x.com".equals(u.getEmail())));
        inOrder.verify(emailSender).send(any());
        inOrder.verify(repository).save(argThat(u -> "b@x.com".equals(u.getEmail())));
        inOrder.verify(emailSender).send(any());
    }

    static final class FinalConfig {
        final int getTimeout() { return 1000; }
    }
}
```

### 4.6 AssertJ 流式断言

```java
import org.assertj.core.api.*;
import org.junit.jupiter.api.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

/**
 * AssertJ 流式断言示例
 */
@DisplayName("AssertJ 流式断言")
class AssertJSampleTest {

    @Test
    @DisplayName("对象断言：链式 + 提取")
    void objectAssertions() {
        User user = new User(1L, "Alice", "alice@example.com", 30);

        assertThat(user)
            .isNotNull()
            .hasFieldOrPropertyWithValue("id", 1L)
            .extracting(User::getName, User::getEmail)
            .containsExactly("Alice", "alice@example.com");

        // as() 为断言附加描述，失败时显示
        assertThat(user.getAge())
            .as("用户年龄应在 18-65 之间")
            .isBetween(18, 65);
    }

    @Test
    @DisplayName("集合断言：丰富 DSL")
    void collectionAssertions() {
        List<User> users = List.of(
            new User(1L, "Alice", "a@x.com", 25),
            new User(2L, "Bob", "b@x.com", 30),
            new User(3L, "Charlie", "c@x.com", 35)
        );

        assertThat(users)
            .hasSize(3)
            .extracting(User::getName)
            .containsExactly("Alice", "Bob", "Charlie")
            .doesNotContainNull();

        // filteredOn 链式过滤
        assertThat(users)
            .filteredOn(u -> u.getAge() > 30)
            .extracting(User::getName)
            .containsExactly("Charlie");
    }

    @Test
    @DisplayName("异常断言：丰富诊断")
    void exceptionAssertions() {
        UserService service = new UserService();

        // assertThatThrownBy 返回 AbstractThrowableAssert
        assertThatThrownBy(() -> service.create(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("email")
            .hasNoCause();

        // catchThrowable 显式捕获
        Throwable t = catchThrowable(() -> service.create(""));
        assertThat(t)
            .as("空邮箱应抛异常")
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Soft Assertions：一次性收集所有失败")
    void softAssertions() {
        User user = new User(1L, "Alice", "alice@example.com", 25);

        SoftAssertions.assertSoftly(soft -> {
            soft.assertThat(user.getId()).isNotNull();
            soft.assertThat(user.getName()).isEqualTo("Alice");
            soft.assertThat(user.getEmail()).contains("@");
            soft.assertThat(user.getAge()).isPositive();
        });
        // 任一断言失败不会中断其他断言，最终聚合失败
    }

    @Test
    @DisplayName("自定义断言")
    void customAssertions() {
        // 通过继承 AbstractAssert 实现领域专属断言
        User user = new User(1L, "Alice", "alice@example.com", 25);
        assertThat(user).isValidUser().isAdult();
    }

    @Test
    @DisplayName("Comparable 断言")
    void comparableAssertions() {
        assertThat(1).isLessThan(2);
        assertThat("b").isGreaterThan("a");
        assertThat(LocalDate.of(2026, 7, 20))
            .isAfter(LocalDate.of(2026, 1, 1))
            .isBeforeOrEqualTo(LocalDate.now());
    }
}
```

### 4.7 Spring Boot Test 测试切片

```java
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * @WebMvcTest：仅装配 Web 层
 *
 * 不加载 @Service/@Repository/@Component，启动开销约为 @SpringBootTest 的 10%
 */
@WebMvcTest(UserController.class)
@Import(GlobalExceptionHandler.class)  // 显式导入所需的 @ControllerAdvice
@DisplayName("用户 Controller 切片测试")
class UserControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean  // 替换 ApplicationContext 中的 Bean 为 Mockito mock
    private UserService userService;

    @Test
    @DisplayName("GET /users/{id} 存在时应返回 200 + JSON")
    void getUserReturns200() throws Exception {
        when(userService.findUser(1L))
            .thenReturn(Optional.of(new User(1L, "Alice", "a@x.com", 25)));

        mockMvc.perform(get("/users/{id}", 1L)
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.name").value("Alice"))
            .andExpect(jsonPath("$.email").value("a@x.com"));
    }

    @Test
    @DisplayName("GET /users/{id} 不存在时应返回 404")
    void getUserReturns404() throws Exception {
        when(userService.findUser(999L)).thenReturn(Optional.empty());

        mockMvc.perform(get("/users/{id}", 999L))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /users 校验失败应返回 400 + 错误详情")
    void postUserValidationFailure() throws Exception {
        String invalidJson = """
            {"name": "", "email": "invalid", "age": -1}
            """;

        mockMvc.perform(post("/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidJson))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors[0].field").exists());
    }
}
```

### 4.8 Testcontainers 集成测试

```java
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Testcontainers 集成测试
 *
 * Spring Boot 3.1+ 的 @ServiceConnection 自动注入容器连接信息
 */
@SpringBootTest
@Testcontainers
@DisplayName("用户仓库集成测试")
class UserRepositoryIntegrationTest {

    @Container
    @ServiceConnection  // Spring Boot 3.1+ 自动配置 DataSource 指向容器
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("testdb")
        .withUsername("test")
        .withPassword("test")
        .withReuse(true);  // 复用容器，加快本地测试速度

    @Autowired
    private UserRepository repository;

    @BeforeEach
    void cleanUp() {
        repository.deleteAll();
    }

    @Test
    @DisplayName("保存用户后应能查询到")
    void saveAndFind() {
        User user = new User(null, "Alice", "a@x.com", 25);
        User saved = repository.save(user);

        assertThat(saved.getId()).isNotNull();
        assertThat(repository.findById(saved.getId()))
            .isPresent()
            .get()
            .extracting(User::getName)
            .isEqualTo("Alice");
    }

    @Test
    @DisplayName("唯一约束：重复邮箱应抛 DataIntegrityViolationException")
    void duplicateEmail() {
        repository.save(new User(null, "Alice", "a@x.com", 25));

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
            repository.save(new User(null, "Bob", "a@x.com", 30))
        ).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }
}
```

### 4.9 JMH 微基准测试

```java
import org.openjdk.jmh.annotations.*;
import org.openjdk.jmh.infra.Blackhole;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * JMH 微基准测试：ArrayList vs LinkedList 随机访问
 *
 * 注意：JMH 测试需要单独的 Maven/Gradle 模块，不应与单元测试混跑
 */
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.Microseconds)
@Warmup(iterations = 5, time = 1, timeUnit = TimeUnit.SECONDS)
@Measurement(iterations = 5, time = 1, timeUnit = TimeUnit.SECONDS)
@Fork(2)
@State(Scope.Benchmark)
public class ListAccessBenchmark {

    @Param({"100", "1000", "10000"})
    private int size;

    private List<Integer> arrayList;
    private List<Integer> linkedList;

    @Setup
    public void setup() {
        arrayList = new ArrayList<>();
        linkedList = new LinkedList<>();
        for (int i = 0; i < size; i++) {
            arrayList.add(i);
            linkedList.add(i);
        }
    }

    @Benchmark
    public void arrayListRandomAccess(Blackhole bh) {
        // Blackhole 防止死代码消除
        bh.consume(arrayList.get(size / 2));
    }

    @Benchmark
    public void linkedListRandomAccess(Blackhole bh) {
        bh.consume(linkedList.get(size / 2));
    }

    @Benchmark
    public void arrayListIteration(Blackhole bh) {
        for (Integer i : arrayList) {
            bh.consume(i);
        }
    }

    @Benchmark
    public void linkedListIteration(Blackhole bh) {
        for (Integer i : linkedList) {
            bh.consume(i);
        }
    }
}
```

### 4.10 TDD 经典示例：FizzBuzz

```java
// Red: 先写失败测试
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("FizzBuzz TDD")
class FizzBuzzTest {

    @Test
    @DisplayName("输入 1 应返回 \"1\"")
    void oneReturnsOne() {
        assertEquals("1", FizzBuzz.of(1));
    }

    @Test
    @DisplayName("输入 3 应返回 \"Fizz\"")
    void threeReturnsFizz() {
        assertEquals("Fizz", FizzBuzz.of(3));
    }

    @Test
    @DisplayName("输入 5 应返回 \"Buzz\"")
    void fiveReturnsBuzz() {
        assertEquals("Buzz", FizzBuzz.of(5));
    }

    @Test
    @DisplayName("输入 15 应返回 \"FizzBuzz\"")
    void fifteenReturnsFizzBuzz() {
        assertEquals("FizzBuzz", FizzBuzz.of(15));
    }
}

// Green: 实现最小化代码使测试通过
class FizzBuzz {
    public static String of(int n) {
        if (n % 15 == 0) return "FizzBuzz";
        if (n % 3 == 0) return "Fizz";
        if (n % 5 == 0) return "Buzz";
        return String.valueOf(n);
    }
}

// Refactor: 提取常量、优化可读性（测试应保持通过）
class FizzBuzzRefactored {
    private static final String FIZZ = "Fizz";
    private static final String BUZZ = "Buzz";

    public static String of(int n) {
        StringBuilder sb = new StringBuilder();
        if (n % 3 == 0) sb.append(FIZZ);
        if (n % 5 == 0) sb.append(BUZZ);
        return sb.length() == 0 ? String.valueOf(n) : sb.toString();
    }
}
```

## 5. 对比分析

### 5.1 JUnit 4 vs JUnit 5

| 特性 | JUnit 4 | JUnit 5 |
| ---- | ------- | ------- |
| 包名 | `org.junit.*` | `org.junit.jupiter.api.*` |
| 测试注解 | `@Test`（无运行时检查） | `@Test`（声明于 Jupiter） |
| 期望异常 | `@Test(expected=...)` | `assertThrows(...)` |
| 超时 | `@Test(timeout=100)` | `assertTimeout(...)` |
| 参数化 | `@RunWith(Parameterized.class)` | `@ParameterizedTest` 原生支持 |
| 扩展模型 | `@RunWith` + `@Rule`（不可组合） | `@ExtendWith`（可组合） |
| 测试生命周期 | `@BeforeClass/@Before` | `@BeforeAll/@BeforeEach` |
| 动态测试 | 不支持 | `@TestFactory` |
| 条件执行 | `Assume.assumeTrue` | `@EnabledOnOs/@EnabledIfSystemProperty` |
| 模块化 | 单 jar | Platform/Jupiter/Vintage 三模块 |
| Java 版本 | Java 5+ | Java 8+（5.10+ 需 Java 11+） |
| 嵌套测试 | 不支持 | `@Nested`（非 static 内部类） |

### 5.2 JUnit 5 vs TestNG

| 特性 | JUnit 5 | TestNG |
| ---- | ------- | ------ |
| 依赖测试 | 不原生支持（需 `@Order` 模拟） | `@Test(dependsOnMethods=...)` |
| 并行执行 | `@Execution(CONCURRENT)` | `parallel` in testng.xml |
| 参数化 | `@ParameterizedTest` + 多 Source | `@DataProvider` |
| 分组 | `@Tag` | `@Test(groups=...)` |
| 失败重试 | 通过扩展实现 | `IRetryAnalyzer` |
| 套件 | `@Suite` | `<suite>` XML |
| 生态 | 主流（Spring Boot 默认） | 企业级测试（Selenium/QA） |
| 设计哲学 | 可组合扩展 | 功能完整内置 |

### 5.3 Java 测试 vs Python pytest vs JS Jest vs Go testing

| 特性 | JUnit 5 + Mockito | pytest | Jest | Go testing |
| ---- | ------------------ | ------ | ---- | ---------- |
| 注解风格 | `@Test` | `@pytest.mark` | `test()` 函数 | `func TestXxx(t)` |
| 参数化 | `@ParameterizedTest` | `@pytest.mark.parametrize` | `test.each` | `t.Run` 子测试 |
| Mock | Mockito（独立库） | `unittest.mock.patch` | 内置 `jest.fn()` | `gomock`/`testify/mock` |
| 断言 | AssertJ/JUnit 内置 | 原生 `assert` | `expect().toBe()` | `if got != want { t.Errorf }` |
| 覆盖率 | JaCoCo | `pytest-cov` | 内置 | `go test -cover` |
| 测试发现 | 反射 + 类名 | `test_*.py` | `*.test.js` | `*_test.go` |
| 设计哲学 | 严格 OOP | 函数式简洁 | 零配置 | 极简内置 |

### 5.4 Mockito vs EasyMock vs PowerMock

| 特性 | Mockito 5 | EasyMock | PowerMock |
| ---- | --------- | -------- | --------- |
| 打桩语法 | `when().thenReturn()` | `expect().andReturn()` + `replay()` | 同 Mockito |
| Mock final | 默认支持 | 不支持 | 支持（需 Java Agent） |
| Mock static | `mockStatic()` | 不支持 | `mockStatic()` |
| Mock 构造器 | `mockConstruction()` | 不支持 | `whenNew()` |
| 状态模型 | 调用即打桩 | record-replay | 继承 Mockito |
| 维护状态 | 活跃（5.x） | 维护中 | 基本停更 |
| 推荐场景 | 通用 | 历史 EasyMock 项目 | 遗留系统（建议迁移） |

## 6. 常见陷阱

### 6.1 陷阱：在 `@BeforeAll` 中访问实例字段

:::danger
**错误代码**：

```java
class BadTest {
    private UserService service;  // 实例字段

    @BeforeAll
    static void init() {
        service = new UserService();  // 编译错误：static 上下文不能访问实例字段
    }
}
```

**错误原因**：`@BeforeAll` 在整个测试类只执行一次，此时实例尚未创建，因此必须 static。

**修正方案**：

```java
class GoodTest {
    private static UserService service;  // static 字段

    @BeforeAll
    static void init() {
        service = new UserService();
    }

    // 或使用 @TestInstance(Lifecycle.PER_CLASS) 让 JUnit 复用实例
    @TestInstance(Lifecycle.PER_CLASS)
    class PerClassTest {
        private UserService service;  // 非 static 也可以

        @BeforeAll
        void init() {  // 非 static
            service = new UserService();
        }
    }
}
```
:::

### 6.2 陷阱：Spy 使用 `when().thenReturn()` 触发真实方法

:::danger
**错误代码**：

```java
List<String> spy = spy(new ArrayList<>());
when(spy.size()).thenReturn(100);  // 调用 spy.size() 触发真实方法
```

**错误原因**：`when(spy.size())` 先求值 `spy.size()`（真实调用），再设定返回值。若真实方法有副作用或抛异常，会污染测试。

**修正方案**：

```java
doReturn(100).when(spy).size();  // 不触发真实方法
doThrow(new RuntimeException()).when(spy).clear();
```
:::

### 6.3 陷阱：`@MockBean` 在 `@WebMvcTest` 中替换错 Bean

:::danger
**错误代码**：

```java
@WebMvcTest(UserController.class)
class BadControllerTest {
    @MockBean
    private UserRepository repository;  // 错误：@WebMvcTest 不加载 Repository
}
```

**错误原因**：`@WebMvcTest` 排除了 `@Repository` Bean，因此 `@MockBean UserRepository` 实际上是**新增**一个 Mock Bean，而非替换。这导致 Controller 找不到 UserService（也未加载），测试无法启动。

**修正方案**：

```java
@WebMvcTest(UserController.class)
class GoodControllerTest {
    @MockBean
    private UserService userService;  // Mock 直接依赖，而非跨层依赖
}
```
:::

### 6.4 陷阱：参数化测试工厂方法非 static

:::danger
**错误代码**：

```java
class BadParamTest {
    @ParameterizedTest
    @MethodSource("provider")
    void test(int n) {}

    private Stream<Arguments> provider() {  // 非 static
        return Stream.of(Arguments.of(1));
    }
}
```

**错误原因**：JUnit 5 默认 PER_METHOD 生命周期，每测试方法新建实例，工厂方法必须在类加载时可用。

**修正方案**：

```java
class GoodParamTest {
    @ParameterizedTest
    @MethodSource("provider")
    void test(int n) {}

    static Stream<Arguments> provider() {  // static
        return Stream.of(Arguments.of(1));
    }
}

// 或使用 @TestInstance(PER_CLASS) 允许非 static
@TestInstance(Lifecycle.PER_CLASS)
class PerClassParamTest {
    @ParameterizedTest
    @MethodSource("provider")
    void test(int n) {}

    Stream<Arguments> provider() {  // 非 static 也可以
        return Stream.of(Arguments.of(1));
    }
}
```
:::

### 6.5 陷阱：Mock 静态方法未限制作用域

:::danger
**错误代码**：

```java
@Test
void badStaticMock() {
    mockStatic(UUID.class);
    when(UUID.randomUUID()).thenReturn(UUID.fromString("00000000-0000-0000-0000-000000000001"));
    // 测试逻辑...
    // 没有 close！UUID.randomUUID 永远被 mock，影响后续测试
}
```

**错误原因**：`MockedStatic` 是 AutoCloseable，必须关闭。未关闭会泄漏到其他测试。

**修正方案**：

```java
@Test
void goodStaticMock() {
    try (MockedStatic<UUID> mocked = mockStatic(UUID.class)) {
        mocked.when(UUID::randomUUID)
            .thenReturn(UUID.fromString("00000000-0000-0000-0000-000000000001"));
        // 测试逻辑...
    }  // 自动 close
}
```
:::

### 6.6 陷阱：JaCoCo 覆盖率与 Lombok @Builder 冲突

:::danger
**错误代码**：

```java
@Builder
public class User {
    private String name;
    // Lombok 生成的 builder() 方法在 JaCoCo 中显示为未覆盖
}
```

**错误原因**：Lombok 在编译期生成字节码，JaCoCo 在字节码层面插桩，将生成的 `builder()`、`toString()` 等方法计入覆盖率分母。

**修正方案**：

1. 在 `lombok.config` 中排除生成方法：

```
config.stopBubbling = true
lombok.addLombokGeneratedAnnotation = true
```

2. JaCoCo 配置 `excludeClassnamesFromFile` 或使用 `@Generated` 注解（JSR 269）过滤；
3. 升级 JaCoCo 至 0.8.8+，自动识别 `lombok.Generated`。
:::

## 7. 工程实践

### 7.1 测试金字塔分层

| 层级 | 工具 | 执行频率 | 反馈时间 | 覆盖目标 |
| ---- | ---- | -------- | -------- | -------- |
| 单元测试 | JUnit 5 + Mockito + AssertJ | 每次 commit | < 10s | 行覆盖 ≥ 80% |
| 切片测试 | @WebMvcTest/@DataJpaTest | 每次 PR | < 60s | 关键路径 100% |
| 集成测试 | @SpringBootTest + Testcontainers | 每次 PR 合并 | < 5min | 关键场景 100% |
| 端到端测试 | Selenium/Playwright | 每日 nightly | < 30min | 用户旅程 100% |
| 微基准 | JMH | 每周/版本前 | < 10min | 性能回归监控 |

### 7.2 命名约定

- 测试类：`<ClassName>Test`（单元）/ `<ClassName>IntegrationTest`（集成）/ `<ClassName>IT`（Maven Failsafe 约定）
- 测试方法：`<method>_<condition>_<expected>` 或 `@DisplayName("作为X，我希望Y")` BDD 风格
- 测试包：与被测类同包（package-private 可见性）

### 7.3 CI/CD 集成

```yaml
# .github/workflows/test.yml
name: Test Pipeline
on: [push, pull_request]
jobs:
  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      - name: Cache Maven
        uses: actions/cache@v4
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}
      - name: Run Unit Tests
        run: mvn test -DexcludedGroups=integration
      - name: Upload JaCoCo Report
        uses: actions/upload-artifact@v4
        with:
          name: jacoco-report
          path: target/site/jacoco/

  integration-test:
    needs: unit-test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '21', distribution: 'temurin' }
      - name: Run Integration Tests
        run: mvn verify -Dgroups=integration

  coverage-check:
    needs: unit-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: JaCoCo Coverage Check
        run: |
          mvn jacoco:check -Djacoco.minimum.line=0.80 -Djacoco.minimum.branch=0.70
```

### 7.4 测试可读性原则

1. **Arrange-Act-Assert 三段式**：用空行分隔，必要时加注释；
2. **单一断言原则**：每个测试方法只验证一个行为（非一个 `assert` 调用）；
3. **避免测试间依赖**：每个测试独立可运行；
4. **测试数据自包含**：避免依赖外部文件或共享状态；
5. **断言消息描述意图**：`assertEquals(2, list.size(), "用户列表应含 2 个用户")` 而非 `assertEquals(2, list.size())`。

## 8. 案例研究

### 8.1 案例一：Spring Boot Test 测试切片优化

**背景**：某电商平台订单服务有 200+ 测试类，使用 `@SpringBootTest` 全量启动，CI 耗时 25 分钟。

**分析**：

- 单元测试占 60%（120 个），但用了 `@SpringBootTest` 启动完整上下文；
- Web 切片测试 30%（60 个）用了 `@SpringBootTest` + `MockMvc`；
- 集成测试 10%（20 个）。

**重构**：

1. 60% 的纯 Service 测试改为 `@ExtendWith(MockitoExtension.class)`，移除 Spring 上下文；
2. 30% 的 Controller 测试改为 `@WebMvcTest`，启动时间从 8s 降至 0.8s/类；
3. 10% 的集成测试保留 `@SpringBootTest` + Testcontainers。

**结果**：CI 耗时从 25 分钟降至 4 分钟（6x 加速）。关键代码：

```java
// 重构前：每个测试启动完整 Spring 上下文
@SpringBootTest
class OrderServiceTest {
    @Autowired
    private OrderService service;
    
    @Test
    void createOrder() { ... }
}

// 重构后：纯 Mockito 单元测试
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    @InjectMocks
    private OrderService service;
    
    @Mock
    private OrderRepository repository;
    
    @Test
    void createOrder() { ... }
}
```

### 8.2 案例二：Testcontainers 替代 H2 解决方言差异

**背景**：某团队使用 H2 内存数据库测试 JPA 查询，生产环境是 PostgreSQL。`ARRAY_AGG`、`JSONB` 等 PostgreSQL 特有函数在 H2 不可用，导致测试通过但生产报错。

**方案**：

```java
// 重构前：H2 方言不匹配
@DataJpaTest
@AutoConfigureTestDatabase  // 默认替换为 H2
class OrderRepositoryTest {
    @Test
    void aggregateOrders() {
        // 此 SQL 在 H2 中语法错误，但生产 PostgreSQL 正确
        List<OrderAggregate> result = repository.aggregateByUser();
        assertThat(result).isNotEmpty();
    }
}

// 重构后：Testcontainers + 真实 PostgreSQL
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderRepositoryTest {
    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Test
    void aggregateOrders() {
        List<OrderAggregate> result = repository.aggregateByUser();
        assertThat(result).isNotEmpty();
    }
}
```

**结果**：消除 12 个 "生产 only" 缺陷，测试耗时从 0.5s（H2）增至 5s（PostgreSQL 容器），通过 `withReuse(true)` 复用容器降至 1.5s。

### 8.3 案例三：JUnit 5 扩展实现 Mockito @InjectMocks 自动化

**背景**：某大型项目有 500+ 测试类，每个类都需手动 `@Mock` + `@InjectMocks`，构造器变更时需同步修改测试。

**方案**：自定义 `@AutoInject` 扩展，通过反射自动注入依赖：

```java
/**
 * 自动注入扩展：扫描被测类构造器，自动 mock 依赖并注入
 */
public class AutoInjectExtension implements ParameterResolver, TestInstancePostProcessor {

    @Override
    public boolean supportsParameter(ParameterContext pc, ExtensionContext ec) {
        return !pc.getParameter().isAnnotationPresent(ManualMock.class);
    }

    @Override
    public Object resolveParameter(ParameterContext pc, ExtensionContext ec) {
        Class<?> type = pc.getParameter().getType();
        return Mockito.mock(type);
    }

    @Override
    public void postProcessTestInstance(Object instance, ExtensionContext ec) {
        // 通过反射扫描构造器，注入已 mock 的依赖
        ReflectionUtils.injectMocks(instance);
    }
}

// 使用
@ExtendWith(AutoInjectExtension.class)
class OrderServiceTest {
    @InjectMocks
    private OrderService service;
    // 无需声明 @Mock，由扩展自动创建
}
```

### 8.4 案例四：JMH 监控 HashMap 性能回归

**背景**：某中间件从 JDK 8 升级到 JDK 17 后，HashMap 高频操作性能下降 15%。

**方案**：建立 JMH 基准作为版本升级的回归测试：

```java
@BenchmarkMode(Mode.Throughput)
@State(Scope.Benchmark)
public class HashMapBenchmark {
    @Param({"8", "17", "21"})
    private String jdkVersion;

    private Map<String, Integer> map;

    @Setup
    public void setup() {
        map = new HashMap<>();
        for (int i = 0; i < 1000; i++) {
            map.put("key" + i, i);
        }
    }

    @Benchmark
    public Integer get(Blackhole bh) {
        bh.consume(map.get("key500"));
    }
}
```

**结果**：通过 JMH 报告定位到 JDK 9 引入的 `String.hashCode` 优化使 HashMap 桶分布改变，通过调整 `initialCapacity` 与 `loadFactor` 恢复性能。

## 9. 未来演进

### 9.1 JUnit 6 计划

JUnit 团队 2024 年讨论的 6.0 路线包括：

1. **Java 17+ 最低要求**：移除对 Java 8 的支持，全面采用 record、sealed、pattern matching；
2. **原生 GraalVM 兼容**：减少反射使用，支持原生镜像测试；
3. **模块化增强**：完整支持 JPMS（Java Platform Module System）；
4. **并行执行默认化**：`@Execution(CONCURRENT)` 成为默认策略。

### 9.2 Mockito 与 Project Valhalla

JEP 401（Value Classes）一旦落地，将影响 Mockito：

- **Value Class 无法 mock**：因为 value class 没有 identity，不能被字节码增强；
- **解决思路**：通过接口抽象 + Mockito mock 接口（类似 `List` vs `ArrayList`）。

### 9.3 Testcontainers 与 Kubernetes

Testcontainers 团队 2024 年推出的 `Kubes Containers` 实验性支持在 K8s 集群中运行测试容器，避免本地 Docker 依赖：

```java
@Container
KubesContainer<?> postgres = new KubesContainer<>("postgres:16")
    .withNamespace("test-" + UUID.randomUUID());
```

### 9.4 AI 辅助测试生成

GitHub Copilot、JetBrains AI 等 IDE 工具已能根据被测代码生成测试骨架。未来方向：

1. **基于规约的测试生成**：从 JML/OpenJML 规约自动生成边界测试；
2. **Property-Based Testing**：jqwik 库推广 QuickCheck 风格的属性测试；
3. **Mutation Testing**：PIT 工具通过变异测试评估测试质量，而非仅覆盖率。

### 13.1 关联模块

- Java Lambda 与函数式编程（`/java/lambda/`）— JUnit 5 大量使用函数式接口（`Supplier<String>`、`Executable`、`ThrowingSupplier`）
- Java 反射与动态代理（`/java/reflection/`）— Mockito 字节码增强、`@InjectMocks` 注入原理
- Java 并发编程详解（`/java/concurrency/`）— `@Execution(CONCURRENT)` 并行测试、Testcontainers 容器共享
- Java 构建工具（`/java/build-tools/`）— Maven Surefire/Failsafe、Gradle test 任务配置

### 13.2 进阶书籍

- *Growing Object-Oriented Software, Guided by Tests* — Steve Freeman, Nat Pryce (2009)
- *xUnit Test Patterns* — Gerard Meszaros (2007)
- *Working Effectively with Legacy Code* — Michael Feathers (2004)
- *Java Testing with Spock* — Konstantinos Kapelonis (2016)

### 13.3 权威论文与文章

- Beck, K. and Gamma, E. "Test Infected: Programmers Love Writing Tests" (1998)
- North, D. "Introducing BDD" (2006)
- Fowler, M. "Mocks Aren't Stubs" (2006)
- Feathers, M. "The Seam Model for Legacy Code" (2004)

### 13.4 社区与生态

- JUnit 官方仓库：https://github.com/junit-team/junit5
- Mockito 官方仓库：https://github.com/mockito/mockito
- AssertJ 官方仓库：https://github.com/assertj/assertj-core
- Testcontainers 官方仓库：https://github.com/testcontainers/testcontainers-java
- OpenJDK JMH：https://github.com/openjdk/jmh
- Spring Boot Test 文档：https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.testing

### 13.5 在线课程

- MIT 6.5810 Software Construction：https://csail.mit.edu/
- Stanford CS193P iOS Development（含测试章节）
- Coursera "Software Testing" by University of Minnesota
- Udemy "JUnit 5 Mastery" by Adrian Wieprzytowski

### 13.6 工具速查

| 工具 | 用途 | 入门成本 | 推荐场景 |
| ---- | ---- | -------- | -------- |
| JUnit 5 | 测试框架 | 低 | 所有 Java 项目 |
| Mockito | 桩件框架 | 中 | 单元测试依赖隔离 |
| AssertJ | 流式断言 | 低 | 替代 JUnit 内置断言 |
| Testcontainers | 集成测试容器 | 中 | 真实数据库/中间件测试 |
| JMH | 微基准 | 高 | 性能敏感代码测量 |
| JaCoCo | 覆盖率 | 低 | CI 覆盖率门槛 |
| PIT | 变异测试 | 高 | 评估测试质量 |
| jqwik | 属性测试 | 中 | 算法/数据驱动场景 |
| ArchUnit | 架构测试 | 中 | 守护架构边界 |
## Maven 依赖

**基本写法：引入 JUnit 5**
`<artifactId>junit-jupiter</artifactId>`
```java
// pom.xml 引入 JUnit 5（Jupiter 聚合包）
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>5.12.1</version>
    <scope>test</scope>
</dependency>
```

---

## 测试方法

**基本写法：标记测试方法**
`@Test`
```java
// 标记一个测试方法（无返回值）
@Test
void shouldAddTwoNumbers() {
    assertEquals(4, 2 + 2);
}
```

---

**基本写法：显示名称**
`@DisplayName("<名称>")`
```java
// 自定义测试报告显示名
@Test
@DisplayName("当输入 1 和 2 时应返回 3")
void shouldReturnThree() {
    assertEquals(3, 1 + 2);
}
```

---

**基本写法：禁用测试**
`@Disabled("<原因>")`
```java
// 临时禁用测试
@Test
@Disabled("待实现的功能")
void notReadyYet() { }
```

---

## 生命周期

**基本写法：所有测试前执行一次**
`@BeforeAll`
```java
// 必须为 static，常用于全局初始化
@BeforeAll
static void initAll() {
    System.out.println("全部测试开始前执行");
}
```

---

**基本写法：所有测试后执行一次**
`@AfterAll`
```java
// 必须为 static，常用于全局清理
@AfterAll
static void cleanupAll() {
    System.out.println("全部测试结束后执行");
}
```

---

**基本写法：每个测试前执行**
`@BeforeEach`
```java
// 每个测试方法执行前都会调用
@BeforeEach
void init() {
    list = new ArrayList<>();
}
```

---

**基本写法：每个测试后执行**
`@AfterEach`
```java
// 每个测试方法执行后都会调用
@AfterEach
void tearDown() {
    list.clear();
}
```

---

## 断言 Assertions

**基本写法：相等断言**
`assertEquals(<期望>, <实际>)`
```java
// 验证两值相等
assertEquals(4, calculator.add(2, 2));
```

---

**基本写法：不相等断言**
`assertNotEquals(<期望>, <实际>)`
```java
// 验证两值不相等
assertNotEquals(5, calculator.add(2, 2));
```

---

**基本写法：为真断言**
`assertTrue(<条件>)`
```java
// 验证条件为 true
assertTrue(list.isEmpty());
```

---

**基本写法：为假断言**
`assertFalse(<条件>)`
```java
// 验证条件为 false
assertFalse(list.contains("x"));
```

---

**基本写法：空对象断言**
`assertNull(<对象>)`
```java
// 验证对象为 null
assertNull(service.find(-1));
```

---

**基本写法：非空断言**
`assertNotNull(<对象>)`
```java
// 验证对象不为 null
assertNotNull(service.find(1));
```

---

**基本写法：抛出异常断言**
`assertThrows(<异常类>.class, <Executable>)`
```java
// 验证代码块抛出指定异常
assertThrows(ArithmeticException.class, () -> {
    int x = 1 / 0;
});
```

---

**基本写法：带消息断言**
`assertEquals(<期望>, <实际>, <消息>)`
```java
// 断言失败时显示自定义消息（Supplier 延迟构造）
assertEquals(4, result, () -> "计算结果应为 4，实际为 " + result);
```

---

**基本写法：批量断言**
`assertAll(<Executable>...)`
```java
// 多个断言一起执行，互不影响
assertAll(
    () -> assertEquals("Alice", user.getName()),
    () -> assertEquals(30, user.getAge()),
    () -> assertNotNull(user.getEmail())
);
```

---

**基本写法：超时断言**
`assertTimeout(<Duration>, <Executable>)`
```java
// 验证代码块在指定时间内完成
assertTimeout(Duration.ofMillis(100), () -> {
    Thread.sleep(50);
});
```

---

## 参数化测试

**基本写法：标记参数化测试**
`@ParameterizedTest`
```java
// 需配合参数源注解使用
@ParameterizedTest
@ValueSource(strings = {"a", "b", "c"})
void shouldNotBeNull(String input) {
    assertNotNull(input);
}
```

---

**基本写法：值源参数**
`@ValueSource(strings = {...})`
```java
// 提供简单类型参数数组
@ParameterizedTest
@ValueSource(ints = {1, 2, 3, 4})
void shouldbePositive(int n) {
    assertTrue(n > 0);
}
```

---

**基本写法：CSV 源参数**
`@CsvSource({ "<值1>,<值2>" })`
```java
// 多参数 CSV 形式
@ParameterizedTest
@CsvSource({ "1, 2, 3", "4, 5, 9" })
void shouldAdd(int a, int b, int expected) {
    assertEquals(expected, a + b);
}
```

---

**基本写法：方法源参数**
`@MethodSource("<方法名>")`
```java
// 静态方法返回参数流
@ParameterizedTest
@MethodSource("provideArgs")
void shouldTest(String input, int expected) {
    assertEquals(expected, input.length());
}
static Stream<Arguments> provideArgs() {
    return Stream.of(Arguments.of("abc", 3), Arguments.of("hello", 5));
}
```

---

**基本写法：空与 null 源**
`@NullSource` / `@EmptySource`
```java
// 提供单 null 或空值
@ParameterizedTest
@NullSource
@EmptySource
void shouldHandleNullOrEmpty(String input) {
    assertTrue(input == null || input.isEmpty());
}
```

---

## 嵌套测试

**基本写法：嵌套测试类**
`@Nested`
```java
// 非静态内部类，按组组织测试
@Nested
class WhenListIsEmpty {
    @Test
    void shouldReturnTrue() {
        assertTrue(list.isEmpty());
    }
}
```

---

## 假设 Assumptions

**基本写法：满足假设才执行**
`assumeTrue(<条件>)`
```java
// 条件不成立则跳过测试
@Test
void shouldRunOnlyOnLinux() {
    assumeTrue(System.getProperty("os.name").contains("Linux"));
    // 仅在 Linux 下执行后续断言
}
```

---

**基本写法：满足假设才执行（带 lambda）**
`assumingThat(<条件>, <Executable>)`
```java
// 条件成立才执行代码块，否则跳过但不失败
@Test
void shouldTestConditionally() {
    assumingThat("dev".equals(env), () -> {
        assertEquals("debug", config.getMode());
    });
}
```

---

## 测试执行顺序

**基本写法：方法排序**
`@TestMethodOrder(MethodOrderer.OrderAnnotation.class)`
```java
// 按 @Order 注解顺序执行
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class OrderedTest {
    @Test @Order(1) void first() { }
    @Test @Order(2) void second() { }
}
```

---

**基本写法：随机顺序**
`@TestMethodOrder(MethodOrderer.Random.class)`
```java
// 随机执行顺序（避免依赖隐式顺序）
@TestMethodOrder(MethodOrderer.Random.class)
class RandomTest { }
```

---

## 标签与过滤

**基本写法：标记标签**
`@Tag("<标签名>")`
```java
// 给测试打标签便于过滤执行
@Test
@Tag("slow")
void shouldRunSlowTest() { }
```

---

## 临时目录

**基本写法：临时目录**
`@TempDir`
```java
// 自动创建并清理临时目录
@Test
void shouldWriteFile(@TempDir Path dir) throws IOException {
    Path file = dir.resolve("test.txt");
    Files.writeString(file, "hello");
    assertTrue(Files.exists(file));
}
```

---

## 重复测试

**基本写法：重复执行**
`@RepeatedTest(<次数>)`
```java
// 重复执行同一测试 N 次
@RepeatedTest(value = 5, name = "第 {currentRepetition} 次")
void shouldRepeat() {
    assertTrue(true);
}
```

---

## Mock 框架（Mockito）

**基本写法：创建 Mock**
`Mockito.mock(<类>.class)`
```java
// 创建模拟对象
List<String> mockList = Mockito.mock(List.class);
when(mockList.size()).thenReturn(10);
assertEquals(10, mockList.size());
```

---

**基本写法：验证调用**
`verify(<mock>).<方法>(<参数>)`
```java
// 验证方法是否被调用
verify(mockList).add("hello");
verify(mockList, times(2)).size();
```

---

**基本写法：注解方式 Mock**
`@Mock`
```java
// 配合 @ExtendWith(MockitoExtension.class) 使用
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock
    private UserRepository repo;
    @InjectMocks
    private UserService service;
}
```
