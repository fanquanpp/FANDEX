---
order: 290
title: 断言库
module: 'software-testing'
category: 云与基础设施
difficulty: beginner
description: 断言风格全景：Jest/Vitest 匹配器、Chai 三种风格、Python assert 与 Hamcrest/AssertJ，断言可读性与失败信息质量的写作要点。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'software-testing/240-JestBasics'
  - 'software-testing/100-Pytest'
  - 'software-testing/110-JUnit5'
prerequisites:
  - 'software-testing/240-JestBasics'
---

## 1. 断言库解决什么问题

测试框架自带的最简断言只有「相等」一级（比如 Python 的 `assert a == b`）。
真实测试需要表达更丰富的判断：深度相等、集合包含、数值区间、异常抛出、
类型判断……**断言库**就是这些判断的表达词汇表。它还负责另一半容易被
忽视的工作：**失败时生成人话报告**——`expected 0.30000000000000004 to
be close to 0.3` 远比 `AssertionError` 十秒内可定位。

前置知识：任一语言的测试框架基本用法（「Jest 入门」「pytest」「JUnit 5」
任选其一）。

选型先讲结论：**语言测试框架自带的断言已足够（Jest/Vitest 的 expect、
pytest 的原生 assert、JUnit 的 Assertions）；独立断言库（Chai、Hamcrest、
AssertJ）价值在于链式可读性与更强的失败报告**，多见于既有生态。

## 2. JavaScript：Jest/Vitest 匹配器与 Chai

### 2.1 Jest/Vitest 内置 expect

```javascript
expect(user).toEqual({ id: 1, name: 'Alice' });   // 深度相等
expect(list).toHaveLength(3);
expect(price).toBeCloseTo(0.3, 5);                // 浮点专用
expect(() => parse('')).toThrow('不能为空');
expect(res).toMatchObject({ status: 'ok' });      // 部分匹配
```

完整匹配器清单见「Jest 入门」。Vitest 的 `expect` 与 Jest 同构，还扩展了
软断言（`expect.soft`，失败不中断、最后汇总）。

### 2.2 Chai：一个库三种口味

Chai 历史上提供三种风格，表达同一件事：

```javascript
import { expect, should, assert } from 'chai';

// BDD expect 风格（最常用）：链式修饰词只提高可读性，不产生行为
expect(pie).to.be.an('number').that.is.closeTo(3.14, 0.01);
expect(users).to.have.lengthOf(3);
expect(body).to.have.property('token').that.is.a('string');

// BDD should 风格：把断言读成一句话（注意：需要先调用一次 should() 安装原型）
someStr.should.be.a('string');

// TDD assert 风格：传统函数式，与 Node 内置 assert 相近
assert.equal(actual, expected);
assert.deepEqual(obj, { a: 1 });
```

要点与陷阱：

- `equal` 是严格相等（===），对象比较必须 `deep.equal`——写错时失败
  信息会把两个引用值打印出来，看似「明明相等却失败」；
- `should` 通过修改 `Object.prototype` 生效，对 `null`/`undefined` 直接
  调用会抛 TypeError，工程上普遍统一用 `expect`；
- 链式词（`to`、`be`、`that`、`a`）只是语法糖，随便组合不影响语义；
  真正改变语义的是 `not`、`deep`、`ordered` 这类实词。

## 3. Python：原生 assert 为什么够用

pytest 对原生 `assert` 做了**重写（assertion rewriting）**：失败时自动
展开表达式两侧的实际值，效果接近专门的断言库：

```python
def test_transfer():
    src_before = balance(1)
    transfer(1, 2, amount=100)

    assert balance(1) == src_before - 100
    # 失败信息自动带上下文：
    # assert 900 == 800  +  where 900 = balance(1)
```

需要更丰富词汇时的补充：

```python
import pytest
import math

assert math.isclose(0.1 + 0.2, 0.3)          # 浮点：用 math.isclose，不用 ==
assert 'alice' in users                       # 包含
assert isinstance(result, User)               # 类型

with pytest.raises(ValueError, match='余额不足'):   # 异常断言
    transfer(1, 2, amount=10**9)
```

注意 Python 的坑：`assert` 语句在 `python -O`（优化模式）下会被整体
剥离，因此**测试之外的运行时代码不能用 assert 做业务校验**。

## 4. Java：Hamcrest 与 AssertJ

### 4.1 Hamcrest：matcher 概念的来源

```java
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

@Test
void 账单明细应正确() {
    assertThat(bill.items(), hasSize(3));
    assertThat(bill.items(), hasItem(hasProperty("name", is("咖啡"))));
    assertThat(bill.total(), closeTo(100.0, 0.01));
}
```

Hamcrest 定义了「匹配器（Matcher）」抽象，REST Assured、Mockito 的
`argThat` 都兼容它的思想；但失败信息与链式流畅度已被 AssertJ 超越。

### 4.2 AssertJ：当前 Java 流式断言首选

```java
import static org.assertj.core.api.Assertions.*;

@Test
void 用户列表校验() {
    assertThat(users)
        .hasSize(2)
        .extracting(User::getName)
        .containsExactlyInAnyOrder("Alice", "Bob");   // 无序精确匹配

    assertThatThrownBy(() -> transfer(1, 2, 1_000_000_000))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("余额不足");

    assertThatCode(() -> transfer(1, 2, 100)).doesNotThrowAnyException();
}
```

JUnit 5 自带 `Assertions` 覆盖基本场景；新项目建议直接用 AssertJ 表达
复杂断言，失败信息按预期/实际分块展示，定位成本低。

## 5. 断言写作的通用原则

工具会变，四条原则不变：

1. **失败信息要能独立定位问题**：断言消息讲「期望什么、实际什么」；
   需要时附加上下文（输入、id）。如果一个断言失败后必须开调试器才能
   明白，它的表达就是不合格的。
2. **一条用例一个关注点**：多个相关断言可以共存（同一行为的多面），
   但不要把「测试登录」和「测试注销」塞进同一条用例。
3. **先断言结构，再断言数值**：`expect(body).toMatchObject({id})` 之外，
   至少一条用例校验完整结构（Schema/深度相等），防止字段悄悄消失。
4. **让失败可复现**：断言里带上用例自建数据的标识（id、时间戳），
   避免在共享环境中「撞车式失败」。

## 6. 弱断言 vs 强断言：对照改造

同样一条用例，断言质量决定保护力。看一组改造前后对比：

```javascript
// 弱：只证明「没崩溃」
test('下单流程正常', async () => {
  const res = await checkout(cart);
  expect(res).toBeDefined();                    // 任何对象都能过
});

// 强：证明「订单创建、金额正确、库存扣减」三个业务事实
test('下单流程正常', async () => {
  const res = await checkout(cart);
  expect(res.order.id).toBeGreaterThan(0);      // 订单真实生成
  expect(res.order.total).toBe(19900);          // 金额精确
  expect(await stockOf('SKU-1')).toBe(4);       // 副作用发生
});
```

```java
// 弱：断言不抛异常
assertDoesNotThrow(() -> parser.parse(raw));

// 强：断言解析结果本身
Parsed p = parser.parse(raw);
assertThat(p.items()).hasSize(2);
assertThat(p.total()).isEqualByComparingTo("59.90");
```

弱断言的三个典型来源：怕麻烦（写断言比写调用费脑子）、怕脆（改断言
要跟着需求动）、凑覆盖率。对应解法：断言模板化（正常路径 + 边界 +
异常三段）、把关键业务量提取成常量、用变异测试/评审抽查断言质量。

## 7. 常见陷阱

- **空断言与假绿**：只调用不断言，或断言写在永不执行的分支里。
  用 `expect.assertions(n)`（Jest）或确保每个分支可到达。
- **浮点用严格相等**：`expect(0.1 + 0.2).toBe(0.3)`、`assert 0.1 + 0.2 == 0.3`
  必挂，一律用 closeTo/isclose。
- **`assert True` 式自我安慰**：`assert result != None` 换成精确的
  `assertEqual(result.id, 42)`，断言越具体，保护力越强。
- **深度相等误用浅比较**：JS 中 `expect({a:1}).toBe({a:1})`（引用比较）
  与 Chai `equal`（严格相等）对对象永远失败，要用 toEqual/deep.equal。
- **吞异常断言**：`try { risky(); } catch (e) { }` 后断言正常执行，
  异常路径根本没被验证——用 throws/rejects/throwedBy 家族。

## 小结

- 初学者要点：优先用测试框架自带断言；记住各自的高频词汇——JS 的
  toEqual/toThrow、Python 的 assert + pytest.raises、Java 的 AssertJ
  链式；浮点永远用专用比较。
- 进阶注意：断言库的价值一半在失败报告质量，选型与写作都围绕「失败时
  能不能一眼定位」；Chai 的 should 有原型污染与 null 崩溃问题，统一
  expect；Java 生态 Hamcrest 思想长存（REST Assured/Mockito）、断言
  表达选 AssertJ。
