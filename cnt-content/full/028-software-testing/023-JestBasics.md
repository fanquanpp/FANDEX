---
order: 230
title: Jest 基础 API
module: 'software-testing'
category: 云与基础设施
difficulty: beginner
description: Jest 基础 API 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## describe 测试分组

**基本写法：将相关测试用例分组**
`describe(<名称>, <回调函数>)`

```javascript
// 使用 describe 对测试用例分组
describe("Math 工具", () => {
  it("应正确执行加法", () => {
    expect(1 + 1).toBe(2);
  });
});
```

---

## it / test 测试用例

**基本写法：定义单个测试用例**
`test(<名称>, <回调函数>, [<超时>])`
`it(<名称>, <回调函数>, [<超时>])`

```javascript
// test 与 it 等价，it 是 test 的别名
test("两数相加", () => {
  expect(2 + 3).toBe(5);
});

it("字符串拼接", () => {
  expect("a" + "b").toBe("ab");
});
```

---

## expect 断言入口

**基本写法：断言值满足条件**
`expect(<实际值>).<匹配器>(<期望值>)`

```javascript
// expect 配合匹配器进行断言
expect(sum(2, 3)).toBe(5);
```

---

## toBe 精确相等

**基本写法：使用 Object.is 精确比较**
`expect(<值>).toBe(<期望值>)`

```javascript
// toBe 比较基本类型值
expect(2 + 2).toBe(4);
expect("hello").toBe("hello");
```

---

## toEqual 深度相等

**基本写法：递归比较对象所有属性**
`expect(<值>).toEqual(<期望对象>)`

```javascript
// toEqual 深度对比对象内容
const user = { name: "Alice", age: 30 };
expect(user).toEqual({ name: "Alice", age: 30 });
```

---

## toStrictEqual 严格深度相等

**基本写法：严格比较对象结构与类型**
`expect(<值>).toStrictEqual(<期望对象>)`

```javascript
// toStrictEqual 区分 undefined 与缺失属性
expect({ a: 1 }).not.toStrictEqual({ a: 1, b: undefined });
```

---

## 真值性匹配器

**基本写法：判断真假值**
`expect(<值>).toBeNull()`
`expect(<值>).toBeUndefined()`
`expect(<值>).toBeDefined()`
`expect(<值>).toBeTruthy()`
`expect(<值>).toBeFalsy()`

```javascript
// 真值性断言
expect(null).toBeNull();
expect(undefined).toBeUndefined();
expect(0).toBeFalsy();
expect("non-empty").toBeTruthy();
```

---

## 数字匹配器

**基本写法：数值大小比较**
`expect(<值>).toBeGreaterThan(<n>)`
`expect(<值>).toBeGreaterThanOrEqual(<n>)`
`expect(<值>).toBeLessThan(<n>)`
`expect(<值>).toBeLessThanOrEqual(<n>)`

```javascript
# 数字大小断言
expect(5).toBeGreaterThan(3);
expect(5).toBeGreaterThanOrEqual(5);
expect(2).toBeLessThan(3);
```

---

## toBeCloseTo 浮点近似

**基本写法：解决浮点精度问题**
`expect(<值>).toBeCloseTo(<期望值>, [<小数位数>])`

```javascript
// 浮点数近似比较，默认精度 2 位小数
expect(0.1 + 0.2).toBeCloseTo(0.3);
expect(0.1 + 0.2).toBeCloseTo(0.3, 5);
```

---

## 字符串匹配

**基本写法：正则或子串匹配**
`expect(<字符串>).toMatch(<正则|字符串>)`

```javascript
# 字符串正则匹配
expect("Christoph").toMatch(/stop/);
expect("team").not.toMatch(/I/);
```

---

## 数组包含

**基本写法：检查数组是否包含元素**
`expect(<数组>).toContain(<元素>)`
`expect(<数组>).toContainEqual(<对象>)`

```javascript
// toContain 检查基本类型，toContainEqual 检查对象
expect([1, 2, 3]).toContain(2);
expect([{ a: 1 }]).toContainEqual({ a: 1 });
```

---

## 异常断言

**基本写法：断言函数抛出异常**
`expect(() => <调用>).toThrow([<错误信息>])`
`expect(() => <调用>).toThrowError(<正则|字符串|Error>)`

```javascript
// 断言函数抛出指定异常
function risky() {
  throw new Error("参数无效");
}
expect(risky).toThrow("参数无效");
expect(risky).toThrow(Error);
```

---

## .not 修饰符

**基本写法：反向断言**
`expect(<值>).not.<匹配器>(<期望>)`

```javascript
# 使用 not 进行反向断言
expect(2 + 2).not.toBe(5);
expect([1, 2, 3]).not.toContain(4);
```

---

## 异步 resolves / rejects

**基本写法：断言 Promise 解析或拒绝**
`expect(<Promise>).resolves.<匹配器>(<期望>)`
`expect(<Promise>).rejects.<匹配器>(<期望>)`

```javascript
# 断言 Promise 的解析结果
expect(Promise.resolve(42)).resolves.toBe(42);
expect(Promise.reject(new Error("失败"))).rejects.toThrow("失败");
```

---

## toHaveBeenCalled 调用断言

**基本写法：断言 Mock 函数被调用**
`expect(<mock>).toHaveBeenCalled()`
`expect(<mock>).toHaveBeenCalledTimes(<次数>)`
`expect(<mock>).toHaveBeenCalledWith(<参数>)`

```javascript
// 断言 Mock 函数的调用情况
const fn = jest.fn();
fn("a", "b");
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledTimes(1);
expect(fn).toHaveBeenCalledWith("a", "b");
```

---

## toHaveProperty 属性断言

**基本写法：断言对象具有指定属性**
`expect(<对象>).toHaveProperty(<属性路径>, [<值>])`

```javascript
# 断言对象属性存在且匹配
const user = { profile: { name: "Alice" } };
expect(user).toHaveProperty("profile.name", "Alice");
```

---

## 非对称匹配器

**基本写法：使用非对称匹配器**
`expect.any(<构造函数>)`
`expect.anything()`
`expect.stringMatching(<正则>)`
`expect.objectContaining(<对象>)`
`expect.arrayContaining(<数组>)`

```javascript
// 非对称匹配器用于部分匹配
expect({ id: 1, name: "x" }).toEqual({
  id: expect.any(Number),
  name: expect.any(String),
});
expect([1, 2, 3]).toEqual(expect.arrayContaining([1, 2]));
```

---

## 测试跳过与独占

**基本写法：跳过或仅运行测试**
`test.skip(<名称>, <回调>)`
`test.only(<名称>, <回调>)`
`test.todo(<名称>)`

```javascript
# 跳过、独占与待办测试
test.skip("暂时跳过的用例", () => {});
test.only("仅运行此用例", () => {});
test.todo("待补充的用例");
```

---

## 参数化测试 test.each

**换行写法：数据驱动测试**
`test.each(<数据表>)(<名称模板>, <回调>)`

```javascript
# 使用 test.each 实现数据驱动测试
test.each([
  [1, 1, 2],
  [2, 3, 5],
  [-1, 1, 0],
])("%i + %i = %i", (a, b, expected) => {
  expect(a + b).toBe(expected);
});
```

---

## 生命周期钩子

**基本写法：测试前后置处理**
`beforeAll(<回调>, [<超时>])`
`beforeEach(<回调>, [<超时>])`
`afterEach(<回调>, [<超时>])`
`afterAll(<回调>, [<超时>])`

```javascript
# 生命周期钩子
beforeAll(() => { /* 所有测试前执行一次 */ });
beforeEach(() => { /* 每个测试前执行 */ });
afterEach(() => { /* 每个测试后执行 */ });
afterAll(() => { /* 所有测试后执行一次 */ });
```
