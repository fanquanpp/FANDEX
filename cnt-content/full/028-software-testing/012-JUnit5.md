---
order: 120
title: JUnit5
module: 'software-testing'
category: 云与基础设施
difficulty: intermediate
description: JUnit 5测试框架：注解、断言、参数化测试、扩展模型与最佳实践详解。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'software-testing/013-APIAutomationTest'
prerequisites:
  - 'software-testing/001-TestBasicsMethod'
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
## @Test 注解

**基本写法：标记测试方法**
`@Test`
`void <方法名>() { <断言> }`

```java
# 使用 @Test 标记测试方法
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CalculatorTest {
    @Test
    void testAdd() {
        assertEquals(5, 2 + 3);
    }
}
```

---

## @DisplayName 显示名

**基本写法：设置测试显示名称**
`@DisplayName("<名称>")`

```java
# 为测试类或方法设置友好显示名
@DisplayName("计算器测试")
class CalculatorTest {
    @Test
    @DisplayName("加法应返回正确结果")
    void testAdd() {
        assertEquals(5, 2 + 3);
    }
}
```

---

## @BeforeEach / @AfterEach

**基本写法：每个测试方法前后执行**
`@BeforeEach`
`void <方法>() { <setup> }`
`@AfterEach`
`void <方法>() { <teardown> }`

```java
# 每个测试方法前后执行
import org.junit.jupiter.api.*;

class DatabaseTest {
    @BeforeEach
    void setUp() {
        db = createConnection();
    }

    @AfterEach
    void tearDown() {
        db.close();
    }
}
```

---

## @BeforeAll / @AfterAll

**基本写法：所有测试方法前后执行一次**
`@BeforeAll`
`static void <方法>() { <setup> }`
`@AfterAll`
`static void <方法>() { <teardown> }`

```java
# 所有测试前后执行一次，方法必须为 static
class ServerTest {
    @BeforeAll
    static void startServer() {
        server.start();
    }

    @AfterAll
    static void stopServer() {
        server.stop();
    }
}
```

---

## 生命周期执行顺序

**基本写法：JUnit5 生命周期顺序**
`@BeforeAll → @BeforeEach → @Test → @AfterEach → @AfterAll`

```java
# 生命周期钩子执行顺序示例
class LifecycleTest {
    @BeforeAll  static void initAll() {}
    @BeforeEach void init() {}
    @Test       void test() {}
    @AfterEach  void cleanup() {}
    @AfterAll   static void cleanupAll() {}
}
```

---

## @Disabled 禁用测试

**基本写法：禁用测试方法或类**
`@Disabled(["<原因>"])`

```java
# 禁用测试方法或整个测试类
@Disabled("未实现")
@Test
void testFuture() {
}

@Disabled("维护中")
class MaintenanceTest {
}
```

---

## @Tag 标签过滤

**基本写法：为测试打标签**
`@Tag("<标签名>")`

```java
# 使用标签筛选运行的测试
@Tag("slow")
class LargeDataTest {
    @Test
    @Tag("integration")
    void testLargeQuery() {
    }
}

# 运行: mvn test -Dgroups="slow"
```

---

## @Nested 嵌套测试

**基本写法：嵌套组织测试类**
`@Nested`
`class <内部类> { <测试方法> }`

```java
# 嵌套测试类表达层级关系
class ListTest {
    @Nested
    class WhenEmpty {
        @Test
        void isEmpty() {
            assertTrue(new ArrayList<>().isEmpty());
        }
    }
}
```

---

## @RepeatedTest 重复测试

**基本写法：重复运行测试**
`@RepeatedTest(<次数>[, name="<名称>"])`

```java
# 重复运行同一测试多次
@RepeatedTest(value = 5, name = "重复 {currentRepetition}/{totalRepetitions}")
void testFlaky() {
    assertEquals(4, 2 + 2);
}
```

---

## @ParameterizedTest 参数化

**换行写法：参数化测试**
`@ParameterizedTest`
`@<来源注解>`
`void test_<名称>(<参数>) { <断言> }`

```java
# 参数化测试配合数据来源
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

@ParameterizedTest
@ValueSource(strings = {"", "  "})
void testBlank(String input) {
    assertTrue(input.isBlank());
}
```

---

## @ValueSource 值来源

**基本写法：提供简单值数组**
`@ValueSource(strings = {<值>})`
`@ValueSource(ints = {<值>})`

```java
# 提供基本类型值数组
@ParameterizedTest
@ValueSource(ints = {1, 2, 3})
void testPositive(int n) {
    assertTrue(n > 0);
}
```

---

## @CsvSource CSV 来源

**换行写法：CSV 格式多参数**
`@CsvSource({`
`    "<值1>,<值2>,<期望>",`
`    "<值1>,<值2>,<期望>"`
`})`

```java
# CSV 格式提供多参数
@ParameterizedTest
@CsvSource({
    "1, 2, 3",
    "0, 0, 0",
    "-1, 1, 0"
})
void testAdd(int a, int b, int expected) {
    assertEquals(expected, a + b);
}
```

---

## @MethodSource 方法来源

**换行写法：从工厂方法获取参数**
`@MethodSource("<方法名>")`
`static Stream<Arguments> <方法名>() { return Stream.of(<参数>); }`

```java
# 从静态工厂方法获取复杂参数
@ParameterizedTest
@MethodSource("provideData")
void testAdd(int a, int b, int expected) {
    assertEquals(expected, a + b);
}

static Stream<Arguments> provideData() {
    return Stream.of(
        Arguments.of(1, 2, 3),
        Arguments.of(0, 0, 0)
    );
}
```

---

## AssertAll 分组断言

**基本写法：分组断言一次性报告**
`assertAll(<Executable>...)`

```java
# 分组断言，即使部分失败也全部执行
import static org.junit.jupiter.api.Assertions.*;

@Test
void testUser() {
    User user = new User("Alice", 30);
    assertAll("用户属性",
        () -> assertEquals("Alice", user.getName()),
        () -> assertEquals(30, user.getAge()),
        () -> assertNotNull(user.getEmail())
    );
}
```
