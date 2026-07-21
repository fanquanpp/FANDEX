---
order: 57
title: JUnit5
module: 'software-testing'
category: 'eng-infra'
difficulty: intermediate
description: 'JUnit 5测试框架：注解、断言、参数化测试、扩展模型与最佳实践详解。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'software-testing/Web自动化测试'
  - 'software-testing/Python测试框架'
  - 'software-testing/API自动化测试'
  - 'software-testing/性能测试工具'
prerequisites:
  - 'software-testing/测试基础与方法'
---

## 1. JUnit 5 概述

### 1.1 架构

| 模块           | 描述                 |
| -------------- | -------------------- |
| JUnit Platform | 测试框架基础平台     |
| JUnit Jupiter  | 新编程模型和扩展模型 |
| JUnit Vintage  | JUnit 3/4 兼容       |

### 1.2 Maven 依赖

```xml
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>5.10.2</version>
    <scope>test</scope>
</dependency>
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

## 8. 最佳实践

| 实践        | 描述               |
| ----------- | ------------------ |
| 命名规范    | `*Test.java`       |
| DisplayName | 使用有意义的名称   |
| 单一断言    | 每个测试一个关注点 |
| 嵌套组织    | 按场景分组         |
| 参数化      | 减少重复代码       |
| 标签过滤    | `@Tag("slow")`     |
| 超时保护    | `@Timeout`         |
