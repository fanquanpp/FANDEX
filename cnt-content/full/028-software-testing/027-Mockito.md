---
order: 270
title: Mockito 模拟
module: 'software-testing'
category: 云与基础设施
difficulty: beginner
description: Mockito 模拟 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## mock 创建模拟对象

**基本写法：创建 Mock 对象**
`mock(<类>.class)`
`@Mock <类型> <字段>;`

```java
# 创建 Mock 对象
import static org.mockito.Mockito.*;

List<String> mockList = mock(List.class);
mockList.add("item");
verify(mockList).add("item");
```

---

## @Mock 注解

**换行写法：使用注解创建 Mock**
`@ExtendWith(MockitoExtension.class)`
`class <测试类> {`
`    @Mock <类型> <字段>;`
`}`

```java
# 使用 @Mock 注解
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.Mock;

@ExtendWith(MockitoExtension.class)
class ServiceTest {
    @Mock
    private Database db;
}
```

---

## when 打桩返回值

**换行写法：设置方法返回值**
`when(<mock>.<方法>(<参数>)).thenReturn(<值>)`
`when(<mock>.<方法>(<参数>)).thenThrow(<异常>)`

```java
# 设置 Mock 方法返回值或抛异常
when(mockList.size()).thenReturn(10);
when(mockList.get(0)).thenReturn("first");
when(mockList.get(1)).thenThrow(new RuntimeException("不存在"));
```

---

## thenReturn 多次返回

**换行写法：连续调用返回不同值**
`when(<mock>.<方法>()).thenReturn(<值1>, <值2>, <值3>)`

```java
# 同一方法多次调用返回不同值
when(mockIterator.next()).thenReturn("A", "B", "C");
```

---

## thenAnswer 自定义实现

**基本写法：自定义方法实现**
`when(<mock>.<方法>()).thenAnswer(<Answer>)`
`when(<mock>.<方法>()).then(invocation -> <实现>)`

```java
# 使用 lambda 自定义方法行为
when(mockList.get(anyInt())).thenAnswer(invocation -> {
    int index = invocation.getArgument(0);
    return "item-" + index;
});
```

---

## verify 调用验证

**基本写法：验证方法调用**
`verify(<mock>).<方法>(<参数>)`
`verify(<mock>, <times>).<方法>(<参数>)`

```java
# 验证 Mock 方法调用次数与参数
verify(mockList).add("item");
verify(mockList, times(2)).add(anyString());
verify(mockList, never()).clear();
verify(mockList, atLeast(1)).size();
```

---

## 参数匹配器

**基本写法：使用参数匹配器**
`any()` | `anyInt()` | `anyString()` | `eq(<值>)` | `argThat(<断言>)`

```java
# 使用匹配器匹配参数
when(mockList.get(anyInt())).thenReturn("ok");
when(mockMap.get(eq("key"))).thenReturn("value");

verify(mockList).add(argThat(s -> s.length() > 3));
```

---

## ArgumentCaptor 参数捕获

**换行写法：捕获参数进行断言**
`ArgumentCaptor<<类型>> captor = ArgumentCaptor.forClass(<类>.class);`
`verify(<mock>).<方法>(captor.capture());`
`captor.getValue()`

```java
# 捕获方法调用参数
import org.mockito.ArgumentCaptor;

ArgumentCaptor<String> captor = ArgumentCaptor.forClass(String.class);
verify(mockList).add(captor.capture());
assertEquals("item", captor.getValue());

# 多次调用的所有参数
List<String> all = captor.getAllValues();
```

---

## spy 间谍对象

**基本写法：创建间谍保留真实实现**
`spy(<对象>)`
`@Spy <类型> <字段> = new <类>();`

```java
# spy 保留真实方法实现，可部分打桩
List<String> realList = new ArrayList<>();
List<String> spyList = spy(realList);

spyList.add("real");
when(spyList.size()).thenReturn(100);
assertEquals(100, spyList.size());
```

---

## doReturn / doThrow

**基本写法：对 spy 使用 doReturn**
`doReturn(<值>).when(<spy>).<方法>()`
`doThrow(<异常>).when(<spy>).<方法>()`

```java
# 对 spy 对象应使用 doReturn 而非 when
List<String> spyList = spy(new ArrayList<>());
doReturn(100).when(spyList).size();
doThrow(new RuntimeException()).when(spyList).clear();
```

---

## verifyNoInteractions

**基本写法：验证无交互**
`verifyNoInteractions(<mock>)`
`verifyNoMoreInteractions(<mock>)`

```java
# 验证 Mock 没有发生交互
verifyNoInteractions(mockList);
verify(mockList).add("a");
verifyNoMoreInteractions(mockList);
```

---

## @InjectMocks 注入

**换行写法：自动注入 Mock 到被测对象**
`@InjectMocks`
`<类型> <字段>;`

```java
# 自动将 @Mock 字段注入到 @InjectMocks 对象
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {
    @Mock
    private PaymentGateway gateway;
    @InjectMocks
    private OrderService service;

    @Test
    void testPay() {
        when(gateway.charge(any())).thenReturn(true);
        assertTrue(service.placeOrder());
    }
}
```

---

## timeout 超时验证

**基本写法：验证在超时内调用**
`verify(<mock>, timeout(<毫秒>)).<方法>()`

```java
# 验证方法在指定时间内被调用
verify(mockService, timeout(1000)).process(any());
verify(mockService, timeout(1000).times(2)).process(any());
```

---

## Mockito 静态方法模拟

**换行写法：模拟静态方法**
`try (MockedStatic<<类>> mocked = mockStatic(<类>.class)) {`
`    mocked.when(() -> <类>.<方法>()).thenReturn(<值>);`
`}`

```java
# 模拟静态方法（Mockito 3.4+）
try (MockedStatic<Utility> mocked = mockStatic(Utility.class)) {
    mocked.when(() -> Utility.now()).thenReturn(0L);
    assertEquals(0L, Service.getTime());
}
```
