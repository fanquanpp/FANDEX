---
order: 280
title: Mockito 模拟
module: 'software-testing'
category: 云与基础设施
difficulty: beginner
description: Mockito 实战：mock/when/verify 三件套、注解与扩展、参数匹配器与 ArgumentCaptor、spy 与 doReturn 家族、静态方法模拟的边界。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'software-testing/190-TestDouble'
  - 'software-testing/110-JUnit5'
prerequisites:
  - 'software-testing/190-TestDouble'
---

## 1. Mockito 在 Java 测试栈中的位置

Mockito 是 Java 生态使用最广的 Mock 框架，与 JUnit 配合完成「隔离依赖的
单元测试」：被测类依赖数据库、消息队列、第三方客户端时，用 Mockito 造出
可控替身注入进去。它与「测试替身」一文的概念对应关系：

| Mockito 能力                  | 替身角色 | 回答的问题               |
| ----------------------------- | -------- | ------------------------ |
| `mock()` + `when().thenReturn()` | Stub   | 依赖返回什么，才能让被测代码进入目标状态 |
| `verify()`                    | Mock    | 被测代码有没有按预期与依赖交互 |
| `spy()`                       | Spy     | 真实对象上的调用过程是什么 |
| `@InjectMocks`                | —       | 把上面这些替身装进被测对象 |

前置知识：JUnit 5 基本用法、面向对象接口与依赖注入概念。

```xml
<dependency>
    <groupId>org.mockito</groupId>
    <artifactId>mockito-junit-jupiter</artifactId>
    <version>5.14.2</version>
    <scope>test</scope>
</dependency>
```

版本只需把握主线：Mockito 5 起（2023）默认使用内联 mockmaker、要求
Java 11+，对 final 类/方法的 mock 开箱即用；如果团队还在 Mockito 4，
遇到「Cannot mock final class」需要额外配置 mockito-inline。

## 2. 基本三件套：mock / when / verify

```java
// 依赖接口：支付网关
interface PaymentGateway {
    ChargeResult charge(long userId, int amount);
}

@Test
void 拒付时应标记订单失败() {
    // Arrange：造替身并打桩（Stub 角色）
    PaymentGateway gateway = mock(PaymentGateway.class);
    when(gateway.charge(42L, 100)).thenReturn(ChargeResult.declined());

    OrderService service = new OrderService(gateway);

    // Act
    Order order = service.checkout(42L, 100);

    // Assert：验证被测对象的状态
    assertEquals("PAYMENT_FAILED", order.status());
}
```

```java
@Test
void 下单成功后应恰好通知一次() {
    MailSender mail = mock(MailSender.class);
    when(gateway.charge(anyLong(), anyInt())).thenReturn(ChargeResult.ok());

    service.checkout(42L, 100);

    // 行为验证（Mock 角色）：交互本身
    verify(mail, times(1)).send(eq("alice@example.com"), anyString());
    verify(mail, never()).send(eq("billing@example.com"), anyString());
}
```

`when(...).thenReturn(...)` 只对**匹配的参数**生效：打了
`charge(42L, 100)` 的桩，实际调用 `charge(43L, 100)` 时返回默认值
（对象为 null、数值为 0、boolean 为 false）——「莫名其妙的 null」多半
是桩参数没对上。

## 3. 注解风格：@Mock 与 @InjectMocks

```java
@ExtendWith(MockitoExtension.class)      // JUnit 5 扩展：启用注解处理
class OrderServiceTest {

    @Mock PaymentGateway gateway;         // 替身字段
    @Mock MailSender mail;

    @InjectMocks OrderService service;    // Mockito 按构造器/Setter/字段注入上面的替身

    @Test
    void 拒付时应标记订单失败() {
        when(gateway.charge(42L, 100)).thenReturn(ChargeResult.declined());

        Order order = service.checkout(42L, 100);

        assertEquals("PAYMENT_FAILED", order.status());
        verifyNoInteractions(mail);       // 拒付路径不应发任何邮件
    }
}
```

`MockitoExtension` 在 Mockito 5 下的桩是**严格模式**：打了没用到的桩、
或参数完全不匹配的桩会在测试里报 `UnnecessaryStubbingException`。
这不是麻烦，是帮你在测试里发现死代码。

## 4. 参数匹配器与 ArgumentCaptor

```java
// 匹配器：anyXxx 系列做模糊匹配（注意：某个参数用了匹配器，其余也必须用）
verify(mail).send(anyString(), argThat(subject -> subject.contains("收据")));

// ArgumentCaptor：捕获「实际传进来的参数」做细粒度断言
@Captor ArgumentCaptor<Mail> mailCaptor;

@Test
void 邮件正文应包含订单号() {
    service.checkout(42L, 100);

    verify(mail).sendMail(mailCaptor.capture());
    Mail sent = mailCaptor.getValue();
    assertTrue(sent.body().contains("订单号 ORD-42"));   // 校验参数内容本身
}
```

`argThat` 适合「约束判断」（传进来的参数满足某条件），ArgumentCaptor 适合
「取出内容细看」（拿到真实参数对象做多条断言）。二者都比
`verify(mail).sendMail(预构造的完整对象)` 健壮——后者对参数对象的任意
字段变动都脆弱。

## 5. spy 与 doReturn 家族

`spy` 包住**真实对象**：默认调用真实方法，可选择性接管个别方法。适合
「大部分逻辑是真的，只有一小块要隔离」的场景。

```java
List<String> realList = new ArrayList<>();
List<String> spyList = spy(realList);

spyList.add("one");                       // 真实方法执行
assertEquals(1, spyList.size());

when(spyList.size()).thenReturn(100);     // 接管单个方法
assertEquals(100, spyList.size());
```

**陷阱**：对 spy 使用 `when(spy.method())` 时，真实方法会被执行一次
（这正是 `when()` 的求值过程），真实方法有副作用就会出事。`doReturn`
家族把「打桩」延迟到调用时，绕开这个问题：

```java
// doReturn / doThrow / doAnswer：先说「做什么」，再指定「对哪个调用」
doReturn(100).when(spyList).size();       // size() 不会真的执行
doThrow(new IllegalStateException()).when(mail).send(anyString(), anyString());
doAnswer(inv -> {
    String to = inv.getArgument(0);
    return to.startsWith("admin@");       // 基于入参动态决定返回值
}).when(gateway).verifyUser(anyString());
```

经验法则：**mock 用 `when().thenReturn()`，spy 用 `doReturn().when()`**，
可以规避绝大多数意外执行。

## 6. 静态方法与构造器的边界

Mockito 5 的 `mockStatic`（mockito-inline 能力内置后开箱可用）可以临时
替身静态方法：

```java
try (MockedStatic<Instant> instant = mockStatic(Instant.class)) {
    instant.when(Instant::now).thenReturn(FIXED_TIME);   // 固定「现在」
    assertEquals(FIXED_TIME, clock.now());
}   // try 块结束自动还原——不还原会污染整个测试类
```

静态 mock 应当是**改造遗留代码的权宜之计**：`Instant.now()`、`UUID
.randomUUID()` 这类适合临时固定；而业务代码里到处 `StaticUtil.doXxx()`
时，正确方向是重构为可注入的依赖，而不是把静态 mock 当日常。

## 7. 常见陷阱

- **桩参数不匹配**：`when(charge(42L, 100))` 与实际调用 `charge(42L, 200)`
  不匹配，静默返回默认 null。拿不准就 `any()` 全放行，再逐步收紧。
- **混用匹配器与字面量**：`verify(mail).send(anyString(), "收据")` 直接
  抛 `InvalidUseOfMatchersException`。要么全字面量，要么全匹配器。
- **verify 过度**：验证了 `gateway.charge` 的调用顺序、`audit.log` 的
  每一次记录——测试焊死在实现上，重构必红。行为验证只留给关键副作用
  （通知、支付），其余验证状态。
- **mock 具体类而非接口**：能 mock 说明耦合已发生；优先面向接口设计，
  替身也更便宜。
- **忘记 verifyNoMoreInteractions 的滥用**：全量断言「没有其他任何交互」
  让每次新增正常调用都要改老测试，慎用。

## 小结

- 初学者要点：`mock + when/thenReturn` 造状态、`verify` 查交互、
  `@Mock + @InjectMocks` 管注入；参数对不上桩就不生效，出现意外 null
  先查桩参数；spy 场景用 `doReturn().when()` 防真实方法误执行。
- 进阶注意：Mockito 5 的严格桩模式会主动报告无用打桩；ArgumentCaptor
  比「构造完整期望对象」健壮；`mockStatic` 用 try-with-resources 管理
  生命周期；Mock 边界留在自己定义的接口上（理论见「测试替身」）。
