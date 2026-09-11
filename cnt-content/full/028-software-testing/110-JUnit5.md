---
order: 110
title: JUnit5
module: 'software-testing'
category: 云与基础设施
difficulty: intermediate
description: JUnit 5测试框架：注解、断言、参数化测试、扩展模型与最佳实践详解。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'software-testing/120-APIAutomationTest'
prerequisites:
  - 'software-testing/010-TestBasicsMethod'
---

## 1. JUnit 5 概述

JUnit 是 Java 生态使用最广的单元测试框架。当前主线是 JUnit 5（Jupiter 编程
模型），2025-09-30 团队又发布了 JUnit 6.0：Platform/Jupiter/Vintage 统一为
单一版本号、基线提升到 Java 17（Kotlin 2.2），注解与编程模型和 5.x 基本兼容，
存量代码升级成本很低；仍在 Java 8 上运行的老项目可继续使用 5.x 系列。本文
内容对 5.x 与 6.x 均适用。

前置知识：Java 基础语法、Maven 或 Gradle 的基本使用、面向对象常识。

### 1.1 架构

| 模块           | 描述                 |
| -------------- | -------------------- |
| JUnit Platform | 测试框架基础平台：在 JVM 上启动测试框架的 API，IDE 与构建工具都通过它发现和执行测试 |
| JUnit Jupiter  | 新编程模型和扩展模型：`@Test` 等注解与扩展机制的所在 |
| JUnit Vintage  | JUnit 3/4 兼容：让老测试能在新平台上继续运行 |

### 1.2 Maven 依赖

```xml
<!-- JUnit 6：三模块统一版本号，要求 Java 17+ -->
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>6.0.0</version>
    <scope>test</scope>
</dependency>

<!-- Java 8 项目请沿用 5.x 系列（如 5.10.2），API 与本文一致 -->
```

## 2. 常用注解

| 注解           | 描述               |
| -------------- | ------------------ |
| `@Test`        | 标记测试方法       |
| `@BeforeEach`  | 每个测试前执行     |
| `@AfterEach`   | 每个测试后执行     |
| `@BeforeAll`   | 所有测试前执行一次 |
| `@AfterAll`    | 所有测试后执行一次 |
| `@DisplayName` | 测试显示名称       |
| `@Disabled`    | 禁用测试           |
| `@Nested`      | 嵌套测试类         |
| `@Tag`         | 标签过滤           |
| `@Timeout`     | 超时设置           |

## 3. 断言

### 3.1 标准断言

```java
import static org.junit.jupiter.api.Assertions.*;

@Test
void testAssertions() {
    assertEquals(4, 2 + 2);
    assertNotEquals(5, 2 + 2);
    assertTrue(4 > 3);
    assertFalse(4 < 3);
    assertNull(null);
    assertNotNull(new Object());
    assertThrows(ArithmeticException.class, () -> {
        int result = 1 / 0;
    });
}
```

### 3.2 分组断言

```java
@Test
void testGroupedAssertions() {
    assertAll("person",
        () -> assertEquals("Alice", person.getName()),
        () -> assertEquals(25, person.getAge()),
        () -> assertEquals("alice@example.com", person.getEmail())
    );
}
```

### 3.3 超时断言

```java
@Test
void testTimeout() {
    assertTimeout(Duration.ofMillis(500), () -> {
        Thread.sleep(200);
    });
}
```

## 4. 生命周期

```java
class LifecycleTest {

    @BeforeAll
    static void setupAll() {
        System.out.println("Before all tests");
    }

    @BeforeEach
    void setup() {
        System.out.println("Before each test");
    }

    @Test
    void test1() {
        System.out.println("Test 1");
    }

    @Test
    void test2() {
        System.out.println("Test 2");
    }

    @AfterEach
    void teardown() {
        System.out.println("After each test");
    }

    @AfterAll
    static void teardownAll() {
        System.out.println("After all tests");
    }
}
```

## 5. 参数化测试

### 5.1 基本参数化

```java
@ParameterizedTest
@ValueSource(ints = {1, 2, 3, 4, 5})
void testPositive(int number) {
    assertTrue(number > 0);
}

@ParameterizedTest
@ValueSource(strings = {"hello", "world", "junit"})
void testNonEmpty(String str) {
    assertFalse(str.isEmpty());
}
```

### 5.2 参数来源

| 注解             | 描述         |
| ---------------- | ------------ |
| `@ValueSource`   | 单类型值数组 |
| `@NullSource`    | null 值      |
| `@EmptySource`   | 空值         |
| `@EnumSource`    | 枚举值       |
| `@MethodSource`  | 工厂方法     |
| `@CsvSource`     | CSV 格式     |
| `@CsvFileSource` | CSV 文件     |

### 5.3 CSV 参数化

```java
@ParameterizedTest
@CsvSource({
    "1, 1, 2",
    "2, 3, 5",
    "-1, 1, 0",
    "0, 0, 0"
})
void testAdd(int a, int b, int expected) {
    assertEquals(expected, Calculator.add(a, b));
}
```

### 5.4 MethodSource

```java
@ParameterizedTest
@MethodSource("provideTestData")
void testWithMethodSource(String input, int expected) {
    assertEquals(expected, input.length());
}

static Stream<Arguments> provideTestData() {
    return Stream.of(
        Arguments.of("hello", 5),
        Arguments.of("world", 5),
        Arguments.of("", 0)
    );
}
```

## 6. 嵌套测试

```java
@DisplayName("Stack tests")
class StackTest {

    Stack<String> stack;

    @BeforeEach
    void createStack() {
        stack = new Stack<>();
    }

    @Nested
    @DisplayName("when new")
    class WhenNew {

        @Test
        @DisplayName("is empty")
        void isEmpty() {
            assertTrue(stack.isEmpty());
        }

        @Nested
        @DisplayName("after pushing")
        class AfterPushing {

            @BeforeEach
            void pushElement() {
                stack.push("element");
            }

            @Test
            @DisplayName("is not empty")
            void isNotEmpty() {
                assertFalse(stack.isEmpty());
            }
        }
    }
}
```

## 7. 扩展模型

### 7.1 自定义扩展

```java
public class LoggingExtension implements BeforeEachCallback, AfterEachCallback {
    @Override
    public void beforeEach(ExtensionContext context) {
        System.out.println("Before: " + context.getDisplayName());
    }

    @Override
    public void afterEach(ExtensionContext context) {
        System.out.println("After: " + context.getDisplayName());
    }
}

@ExtendWith(LoggingExtension.class)
class MyTest {
    @Test
    void test() { }
}
```

### 7.2 常用扩展

| 扩展             | 功能         |
| ---------------- | ------------ |
| MockitoExtension | Mockito 集成 |
| SpringExtension  | Spring 集成  |
| TempDirectory    | 临时目录     |

## 8. 常见陷阱

| 陷阱                     | 说明与规避                                                     |
| ------------------------ | -------------------------------------------------------------- |
| `@BeforeAll` 非静态报错  | 默认生命周期是「每方法一个实例」，`@BeforeAll/@AfterAll` 必须静态；加 `@TestInstance(Lifecycle.PER_CLASS)` 可用实例方法 |
| 断言失败后提前中断       | 需要一次看到全部失败项时用 `assertAll`，而不是多个独立 `assertEquals` |
| 测试间共享可变状态       | 默认每个测试方法新建实例，不要把状态放到静态字段里共享          |
| 吞断言                   | 只 `assertDoesNotThrow` 不验证返回值，测试通过但什么都没证明    |
| 依赖执行顺序             | Jupiter 默认顺序是确定的但非声明顺序；依赖顺序的测试应合并或用 `@TestMethodOrder` 显式声明 |

## 9. 最佳实践

| 实践        | 描述               |
| ----------- | ------------------ |
| 命名规范    | `*Test.java`       |
| DisplayName | 使用有意义的名称   |
| 单一断言    | 每个测试一个关注点 |
| 嵌套组织    | 按场景分组         |
| 参数化      | 减少重复代码       |
| 标签过滤    | `@Tag("slow")`     |
| 超时保护    | `@Timeout`         |

## 小结

- 初学者要点：先掌握 `@Test` 与生命周期五件套、`Assertions` 常用断言、
  `@ParameterizedTest` 三种常用来源（`@ValueSource`、`@CsvSource`、
  `@MethodSource`），就能覆盖绝大多数单元测试场景。
- 进阶注意：`assertAll` 用于聚合断言、扩展模型（`@ExtendWith`）是与
  Spring/Mockito 集成的统一入口；新项目在 Java 17+ 上直接选 JUnit 6，
  存量 Java 8 项目留在 5.x，二者编程模型一致。
