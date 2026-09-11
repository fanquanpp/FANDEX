---
order: 260
title: Jest 异步测试
module: 'software-testing'
category: 云与基础设施
difficulty: beginner
description: Jest 异步测试完整教学：async/await 与 resolves/rejects 断言、回调模式 done、Mock fetch/axios、假定时器处理延时与 test.concurrent。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'software-testing/240-JestBasics'
  - 'software-testing/250-JestMock'
prerequisites:
  - 'software-testing/240-JestBasics'
---

## 1. 为什么异步测试会「假绿」

Jest 测试函数执行完**同步代码**就认为它结束了。如果断言藏在 Promise 的
回调里，而测试没有把 Promise 交回给 Jest，就会出现最阴险的失败模式：
断言根本没执行，测试显示绿色。所有异步测试技巧，本质都是在回答同一个
问题——**怎么把「还没完」这个信息告诉 Jest**。

前置知识：Promise、async/await 语法、「Jest 入门」的匹配器。

```javascript
// 反例：断言在测试结束后才运行，且永远不会让测试变红
test('错误示范', () => {
  fetchUser(1).then((user) => {
    expect(user.name).toBe('Alice');   // Jest 不知道要等它
  });
});
// 输出：PASS —— 假绿
```

## 2. 三种正确写法

### 2.1 async/await（默认选择）

```javascript
test('async/await 等待异步完成', async () => {
  const user = await fetchUser(1);      // 函数标记 async，await 等结果
  expect(user.name).toBe('Alice');      // 断言在结果之后执行
});
```

### 2.2 返回 Promise

```javascript
test('把 Promise 返回给 Jest', () => {
  return fetchUser(1).then((user) => {
    expect(user.id).toBe(1);            // 没有 await，直接 return
  });
});
```

### 2.3 resolves / rejects 匹配器

```javascript
test('resolves：断言成功结果', () => {
  return expect(fetchUser(1)).resolves.toMatchObject({ id: 1 });
});

test('rejects：断言失败原因', async () => {
  // await + rejects 是断言异常路径的推荐组合
  await expect(fetchUser(-1)).rejects.toThrow('用户不存在');
  await expect(fetchUser(-1)).rejects.toThrow(/不存在/);   // 支持正则
});
```

三种写法等价，团队统一用一种（多数选 async/await）可读性最好。注意
`resolves`/`rejects` 必须配合 return 或 await，否则又回到假绿。

## 3. 回调风格：done 参数

老代码（Node.js 风格回调 API）用 `done` 显式通知结束：

```javascript
test('回调 API 用 done 收尾', (done) => {
  fetchWithCallback(1, (err, user) => {
    try {
      expect(err).toBeNull();
      expect(user.name).toBe('Alice');
      done();                            // 全部断言通过后才调用
    } catch (e) {
      done(e);                           // 断言失败要把错误交给 Jest
    }
  });
});
```

`try/catch + done(e)` 不是仪式：如果断言直接抛错，Jest 只会看到「超时
未调用 done」，报错信息完全指向错误的地方。新代码一律 Promise 化，
`done` 只用于维护遗留接口的测试。

## 4. 超时控制

慢异步的默认上限是 5 秒，按需局部放宽：

```javascript
test('慢操作放宽超时', async () => {
  await heavyTask();
}, 10_000);                    // 第三参数：本用例超时 10 秒

// 整个文件放宽（避免逐条传参）
jest.setTimeout(15_000);
```

注意：超时调大是最后手段。测试动辄超时，说明该把慢依赖 Mock 掉，而不是
让流水线陪它等。

## 5. Mock 网络：fetch 与 axios

单元测试绝不发真实请求，两个标准姿势：

### 5.1 Mock 全局 fetch

```javascript
test('服务层调用 fetch 并解析响应', async () => {
  const fakeUser = { id: 1, name: 'Alice' };

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(fakeUser),   // 模拟 Response.json()
  });

  const user = await getUser(1);

  expect(user).toEqual(fakeUser);
  expect(global.fetch).toHaveBeenCalledWith('/api/users/1');
});
```

### 5.2 Mock axios 模块

```javascript
import axios from 'axios';
jest.mock('axios');                            // 整个模块替身化

test('axios.get 打桩', async () => {
  axios.get.mockResolvedValue({ data: { id: 1, name: 'Alice' } });

  const user = await getUser(1);

  expect(axios.get).toHaveBeenCalledWith('/api/users/1');
  expect(user.name).toBe('Alice');
});
```

要测「请求失败重试」「网络错误提示」这类逻辑，用
`mockRejectedValue(new Error('network down'))` 构造失败，比断网真实、
比等超时快一万倍。

## 6. 延时逻辑：假定时器而非真睡

```javascript
test('轮询三次后返回结果', async () => {
  jest.useFakeTimers();
  jest.spyOn(global, 'setInterval');   // 如需监视注册行为

  const p = pollUntilReady();          // 内部每 500ms 轮询一次

  jest.advanceTimersByTime(1500);      // 快进 1.5 秒，触发三次轮询
  await Promise.resolve();             // 放行微任务队列
  jest.useRealTimers();

  await expect(p).resolves.toBe('ready');
});
```

`await Promise.resolve()` 这类「冲刷微任务」的辅助在假定时器场景常见：
时间被快进了，但已排队的 Promise 回调仍需一次微任务机会才能执行。

## 7. 并发用例：test.concurrent

```javascript
// 多个相互独立的异步用例可以并发执行，缩短总时长
test.concurrent('接口 A 可用', async () => {
  const res = await fetch('/api/a');
  expect(res.ok).toBe(true);
});

test.concurrent('接口 B 可用', async () => {
  const res = await fetch('/api/b');
  expect(res.ok).toBe(true);
});
```

并发用例**不能共享可变状态**（执行交错不可控），对同一 mock 的调用记录
断言也会互相干扰；共享状态场景退回普通串行 `test`。

## 8. 综合实战：测试带重试的 API 客户端

把本文技巧组合起来：被测对象是一个「失败自动重试 2 次」的客户端，
需要 Mock 网络 + 假定时器（重试间隔）+ resolves 断言三者配合。

```javascript
// retry-client.js（被测代码）
async function getWithRetry(url, retries = 2, backoffMs = 100) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (e) {
      if (i >= retries) throw e;
      await new Promise((r) => setTimeout(r, backoffMs * (i + 1)));
    }
  }
}

// retry-client.test.js
test('前两次失败、第三次成功时返回数据', async () => {
  jest.useFakeTimers();
  const mockFetch = jest
    .fn()
    .mockRejectedValueOnce(new Error('network down'))     // 第 1 次失败
    .mockRejectedValueOnce(new Error('HTTP 503'))         // 第 2 次失败
    .mockResolvedValueOnce({                              // 第 3 次成功
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
  global.fetch = mockFetch;

  const pending = getWithRetry('/api/data');

  // 快进退避间隔，让重试真正发生
  await jest.advanceTimersByTimeAsync(100);   // 第 1 次退避
  await jest.advanceTimersByTimeAsync(200);   // 第 2 次退避

  await expect(pending).resolves.toEqual({ ok: true });
  expect(mockFetch).toHaveBeenCalledTimes(3);
  jest.useRealTimers();
});
```

两个值得注意的点：`advanceTimersByTimeAsync` 会同时推进宏任务与微任务
（普通 `advanceTimersByTime` 不等待 Promise 链），是测「setTimeout + 
async」组合的现代标准写法；`mockRejectedValueOnce` 的队列顺序即调用
顺序，重试逻辑的每一步都被显式编排。

## 9. 常见陷阱

- **假绿三件套**：忘了 `await`/`return`、断言在 then 回调深处、`done`
  忘调。用 `expect.assertions(n)` 兜底可让「断言没执行」显式失败。
- **rejects 后断言不生效**：`expect(p).rejects` 不加 `await`/`return`
  等于没测。记口诀：**凡是 Promise，要么 await，要么 return**。
- **真实网络进单测**：偶发的 CI 网络抖动制造大量 flaky。单测 Mock 网络，
  真实联调交给集成测试与 E2E。
- **真睡等待**：`await new Promise(r => setTimeout(r, 3000))` 把测试变慢
  且不稳。延时逻辑用假定时器快进。
- **并发用例共享 mock 记录**：`test.concurrent` + `toHaveBeenCalledTimes`
  的组合几乎必然偶发失败，并发用例只断言「自己的结果」。

## 小结

- 初学者要点：异步测试的三种合法形态——async/await、return Promise、
  `resolves`/`rejects`；失败路径用 `rejects.toThrow`；网络一律 Mock。
- 进阶注意：`expect.assertions` 是防假绿的保险丝；回调遗留代码的 `done`
  要配 try/catch；假定时器把「等」变成「跳」，是防抖、轮询、超时逻辑的
  标准测试工具；`test.concurrent` 只用于完全独立的用例。
