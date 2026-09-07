---
order: 250
title: Jest 异步测试
module: 'software-testing'
category: 云与基础设施
difficulty: beginner
description: Jest 异步测试 的完整教学讲解。
author: fanquanpp
updated: '2026-08-01'
---

## async / await 测试

**换行写法：使用 async/await 测试异步**
`test(<名称>, async () => { await <异步调用>; expect(...); })`

```javascript
# 使用 async/await 测试异步函数
test("异步获取用户", async () => {
  const user = await fetchUser(1);
  expect(user).toHaveProperty("name");
});
```

---

## Promise return 测试

**基本写法：返回 Promise 进行断言**
`test(<名称>, () => { return <Promise>.then(<回调>); })`

```javascript
# 返回 Promise 让 Jest 等待
test("Promise 解析", () => {
  return fetchUser(1).then((user) => {
    expect(user.id).toBe(1);
  });
});
```

---

## resolves 匹配器

**基本写法：断言 Promise 成功解析**
`expect(<Promise>).resolves.<匹配器>(<期望>)`

```javascript
# 使用 resolves 断言 Promise 结果
test("resolves 断言", () => {
  return expect(Promise.resolve(42)).resolves.toBe(42);
});
```

---

## rejects 匹配器

**基本写法：断言 Promise 被拒绝**
`expect(<Promise>).rejects.<匹配器>(<期望>)`

```javascript
# 使用 rejects 断言 Promise 抛错
test("rejects 断言", () => {
  return expect(Promise.reject(new Error("失败"))).rejects.toThrow("失败");
});
```

---

## async resolves

**换行写法：async 配合 resolves**
`test(<名称>, async () => { await expect(<Promise>).resolves.<匹配器>(<期望>); })`

```javascript
# async/await 配合 resolves
test("async resolves", async () => {
  await expect(Promise.resolve("ok")).resolves.toBe("ok");
});
```

---

## async rejects

**换行写法：async 配合 rejects**
`test(<名称>, async () => { await expect(<Promise>).rejects.<匹配器>(<期望>); })`

```javascript
# async/await 配合 rejects
test("async rejects", async () => {
  await expect(Promise.reject(new Error("err"))).rejects.toThrow("err");
});
```

---

## 回调函数测试

**换行写法：测试回调函数**
`test(<名称>, (<done>) => { <异步操作>; <done>; })`

```javascript
# 使用 done 回调测试异步
test("回调完成", (done) => {
  fetchData((data) => {
    expect(data).toBe("result");
    done();
  });
});
```

---

## 测试超时设置

**基本写法：设置测试超时时间**
`test(<名称>, <回调>, <超时毫秒>)`
`jest.setTimeout(<毫秒>)`

```javascript
# 设置单个测试与全局超时
test("长时间操作", async () => {
  await longTask();
}, 10000);

jest.setTimeout(15000);
```

---

## fetch 模拟

**换行写法：Mock fetch 请求**
`global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve(<数据>) }))`

```javascript
# Mock 全局 fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ id: 1, name: "Alice" }),
  })
);
```

---

## axios 模拟

**换行写法：Mock axios 模块**
`jest.mock('axios');`
`axios.get.mockResolvedValue({ data: <数据> });`

```javascript
# Mock axios 请求
import axios from "axios";
jest.mock("axios");
axios.get.mockResolvedValue({ data: { id: 1 } });
```

---

## 并发测试 test.concurrent

**换行写法：并发执行测试**
`test.concurrent(<名称>, <回调>, [<超时>])`

```javascript
# 并发执行多个测试用例
test.concurrent("并发测试1", async () => {
  expect(await fetchData()).toBeDefined();
});
```

---

## 异步错误捕获

**换行写法：断言异步函数抛错**
`await expect(<异步函数>()).rejects.toThrow(<错误>)`

```javascript
# 断言异步函数抛出指定错误
await expect(asyncFail()).rejects.toThrow("失败原因");
```
