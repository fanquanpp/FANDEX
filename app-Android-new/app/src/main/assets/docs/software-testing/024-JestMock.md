---
order: 240
title: Jest Mock 模拟
module: 'software-testing'
category: 云与基础设施
difficulty: beginner
description: Jest Mock 模拟 的完整教学讲解。
author: fanquanpp
updated: '2026-08-01'
---

## jest.fn 创建 Mock 函数

**基本写法：创建模拟函数**
`jest.fn([<实现>])`

```javascript
# 创建 Mock 函数
const mockFn = jest.fn();
mockFn("a");
expect(mockFn).toHaveBeenCalledWith("a");
```

---

## Mock 函数返回值

**基本写法：设置 Mock 返回值**
`<mock>.mockReturnValue(<值>)`
`<mock>.mockReturnValueOnce(<值>)`
`<mock>.mockResolvedValue(<Promise值>)`
`<mock>.mockRejectedValue(<错误>)`

```javascript
# 设置 Mock 函数返回值
const fn = jest.fn();
fn.mockReturnValue(42);
fn.mockReturnValueOnce(1).mockReturnValueOnce(2);
fn.mockResolvedValue("async value");
fn.mockRejectedValue(new Error("失败"));
```

---

## Mock 函数实现

**基本写法：自定义 Mock 实现**
`<mock>.mockImplementation(<函数>)`
`<mock>.mockImplementationOnce(<函数>)`

```javascript
# 自定义 Mock 实现
const fn = jest.fn();
fn.mockImplementation((x) => x * 2);
fn.mockImplementationOnce((x) => x + 1);
```

---

## jest.mock 模块模拟

**基本写法：自动 Mock 整个模块**
`jest.mock(<模块路径>)`

```javascript
# 自动 Mock 整个模块
jest.mock("./utils");
const { add } = require("./utils");
add.mockReturnValue(10);
```

---

## jest.mock 工厂函数

**换行写法：使用工厂函数自定义 Mock**
`jest.mock(<模块路径>, () => { <工厂实现> })`

```javascript
# 使用工厂函数自定义 Mock
jest.mock("./api", () => ({
  fetchData: jest.fn(() => Promise.resolve({ data: "mocked" })),
}));
```

---

## jest.requireActual 真实模块

**基本写法：获取真实模块**
`jest.requireActual(<模块路径>)`

```javascript
# 部分模拟时保留真实模块
jest.mock("./utils", () => ({
  ...jest.requireActual("./utils"),
  onlyMocked: jest.fn(),
}));
```

---

## jest.spyOn 监视方法

**基本写法：监听对象方法**
`jest.spyOn(<对象>, <方法名>)`

```javascript
# 监视对象方法调用
const obj = { method: (x) => x + 1 };
const spy = jest.spyOn(obj, "method");
obj.method(5);
expect(spy).toHaveBeenCalledWith(5);
```

---

## spyOn 模拟实现

**基本写法：监听并替换实现**
`jest.spyOn(<对象>, <方法>).mockImplementation(<函数>)`

```javascript
# 监听并替换方法实现
const spy = jest.spyOn(console, "log").mockImplementation(() => {});
console.log("不会输出");
expect(spy).toHaveBeenCalled();
```

---

## jest.mocked 类型安全 Mock

**基本写法：将导入转为 Mock 类型**
`jest.mocked(<导入函数>)`

```javascript
# 类型安全地访问 Mock 属性
import { fetchData } from "./api";
jest.mock("./api");
jest.mocked(fetchData).mockResolvedValue({ data: "ok" });
```

---

## Mock 调用记录

**基本写法：访问 Mock 调用信息**
`<mock>.mock.calls`
`<mock>.mock.results`
`<mock>.mock.instances`

```javascript
# 访问 Mock 调用记录
const fn = jest.fn();
fn("a", "b");
expect(fn.mock.calls[0]).toEqual(["a", "b"]);
expect(fn.mock.results[0].value).toBeUndefined();
```

---

## mockReset 重置 Mock

**基本写法：重置 Mock 状态**
`<mock>.mockReset()`
`<mock>.mockClear()`
`<mock>.mockRestore()`

```javascript
# 重置 Mock 不同级别
fn.mockClear();   # 清除调用记录
fn.mockReset();   # 清除记录并移除实现
fn.mockRestore(); # 恢复 spyOn 的原始实现
```

---

## jest.useFakeTimers 模拟定时器

**基本写法：使用假定时器**
`jest.useFakeTimers()`
`jest.useRealTimers()`
`jest.runAllTimers()`
`jest.advanceTimersByTime(<毫秒>)`

```javascript
# 模拟定时器执行
jest.useFakeTimers();
const fn = jest.fn();
setTimeout(fn, 1000);
jest.advanceTimersByTime(1000);
expect(fn).toHaveBeenCalled();
```

---

## jest.fn 链式调用

**换行写法：Mock 链式调用**
`jest.fn().mockReturnThis().mockReturnValue(<值>)`

```javascript
# Mock 链式 API 调用
const chainable = jest.fn().mockReturnThis();
chainable().method().value();
```

---

## mockImplementation async

**换行写法：Mock 异步函数**
`jest.fn().mockImplementation(async (<参数>) => { <异步逻辑> })`

```javascript
# Mock 异步函数实现
const asyncFn = jest.fn().mockImplementation(async (id) => {
  return { id, name: "mocked" };
});
await asyncFn(1);
```
